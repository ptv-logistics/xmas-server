(function (win) {
  'use strict';

  // namespace

  win.vectormaps = {
    TILE_SIZE: 256,
    TILE_SCALING: 1 // draw tiles in x times better quality
  };

  vectormaps.scaleMap = function (map, scale) {
    map.getContainer().style.transform += 'scale(' + scale + ')';
  };

  // feature detection

  var Browser = vectormaps.Browser = {

    canvas: !! win.CanvasRenderingContext2D,
    mobile: !! navigator.userAgent.match(/Mobile/i),
    worker: !! win.Worker,
    xhr:    !! win.XMLHttpRequest

  };

  // polyfills

  if (! win.devicePixelRatio) {
    win.devicePixelRatio = (Math.round((win.screen.availWidth / document.documentElement.clientWidth) * 10) / 10) || 1;
  }

  var proto;

  if (Browser.canvas) {
    proto = win.CanvasRenderingContext2D.prototype;

    if (!! proto.setLineDash || ('mozDash' in proto) || ('webkitLineDash' in proto)) {
      Browser.canvas = { linedash: true };

      if (! proto.setLineDash) {
        proto.setLineDash = function (dash) {
          var me = this;
          me.mozDash = dash;
          me.webkitLineDash = dash;
        };
      }
    }
  }

})(window);
(function (vectormaps) {
  'use strict';

  vectormaps.Util = {

    get: get,
    scaleCanvasForHighres: scaleCanvasForHighres,

    extend: extend,
    object: object

  };

  // -- SNAP --

  function get(url, type, done) {
    var xhr = new XMLHttpRequest();

    if (! done) {
      done =  type;
      type = 'json';
    }

    if ('withCredentials' in xhr) {
      xhr.onreadystatechange = onStateChange;
    } else if (window.XDomainRequest) {
      xhr = new window.XDomainRequest();
      xhr.onload = onSuccess;
      xhr.onerror = xhr.ontimeout = onerror;
      xhr.onprogress = function() {}; // http://social.msdn.microsoft.com/Forums/ie/en-US/30ef3add-767c-4436-b8a9-f1ca19b4812e/ie9-rtm-xdomainrequest-issued-requests-may-abort-if-all-event-handlers-not-specified
    }

    xhr.open('GET', url);
    xhr.send();

    function onStateChange() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          onSuccess();
        } else {
          onError();
        }
      }
    }

    function onSuccess() {
      var res = xhr.responseText;
      done(null, (type === 'json' && res) ? JSON.parse(res) : res);
    }
    function onError() {
      done(xhr);
    }
  }

  function scaleCanvasForHighres(canvas) {
    if (canvas._ptvVectorMapScaled) return;
    canvas._ptvVectorMapScaled = true;

    var ctx = canvas.getContext('2d'),
        devicePixelRatio = window.devicePixelRatio || 1,
        backingStoreRatio = getBackingStorePixelRatio(ctx),
        factor = (devicePixelRatio / backingStoreRatio) * vectormaps.TILE_SCALING;

    if (factor !== 1) {
      var width = canvas.width,
          height = canvas.height;

      canvas.width = width * factor;
      canvas.height = height * factor;

      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.scale(factor, factor);
    }
  }

  function getBackingStorePixelRatio(ctx) {
    return ctx.backingStorePixelRatio
        || ctx.webkitBackingStorePixelRatio
        || ctx.mozBackingStorePixelRatio
        || ctx.msBackingStorePixelRatio
        || ctx.oBackingStorePixelRatio
        || 1;
  }

  function extend(dest, src) {
    for (var x in src) {
      dest[x] = src[x];
    }

    return dest;
  }

  function object(keys, vals) {
    return keys.reduce(function (obj, key, i) {
      return (obj[key] = vals[i], obj);
    }, {});
  }

})(vectormaps);
(function (vectormaps) {
    'use strict';

    // jshint indent: 4

    var _A = code('A'),
        _J = code('J'),
        _S = code('S'),
        _0 = code('0'),
        _9 = code('9');

    vectormaps.DeltaIterator = DeltaIterator;

    /**
     * Static convenience method, which returns the delta-decoding result as array.
     *
     * Consumes the same arguments as the DeltaIterator constructor.
     * Use it if you need random access to the result or for small delta strings (array gets large fast).
     *
     * @static
     * @return {Array}
     */
    DeltaIterator.deltaDecode = function () {
        var iter = construct(DeltaIterator, arguments), res = [], x;
        while ((x = iter.next()) !== null) { res.push(x); }
        return res;
    };

    /**
     * Creates a new DeltaIterator.
     *
     * @param {string} str - The delta string to iterate
     * @param {number} [dimensions=1] - The number of value dimensions which are encoded in the delta string.
     *                                  E.g. for x/y coordinates, this would be 2.
     * @param {boolean} [useDeltaNegative=false] - Whether to decode deltas between value signs.
     * @param {number} [defaultValue=0] - The default value with which the last value history is pre-filled.
     * @constructor
     */
    function DeltaIterator(str, dimensions, useDeltaNegative, defaultValue) {
        var me = this;

        me.str = str;
        me.dimensions = (dimensions || 1);
        me.useDeltaNegative = !! useDeltaNegative;
        me.defaultValue = (defaultValue || 0);

        me.pos = 0;
        me.reset();
    }

    var proto = DeltaIterator.prototype;

    /**
     * Returns next command or delta-decoded value or null if the end of the delta string was reached.
     *
     * @param {number} [defaultValue] - This value is returned if next is not a value as expected, e.g. if a trailing y value was left out.
     * @return {string|number}
     */
    proto.next = function (defaultValue) {
        var me = this,
            next = me._next(),
            dim = me.currentDimension,
            updateDimension = false;

        if (isValue(next)) {
            var prevDeltaNegative = me.prevDeltaNegative[dim];

            if (me.useDeltaNegative) {
                if (next < 0) {
                    prevDeltaNegative = me.prevDeltaNegative[dim] = ! prevDeltaNegative;
                    next = -next; // make positive
                }

                if (prevDeltaNegative) {
                    next = -next;
                }
            }

            next = next + me.prev[dim];
            updateDimension = true;
        } else if (isValue(defaultValue)) {
            if (next !== null) {
                me.pos--;
            }

            next = defaultValue;
            updateDimension = true;
        }

        if (updateDimension) {
            me.prev[dim] = next;
            me.currentDimension = (dim + 1) % me.dimensions;
        }

        return next;
    };

    /**
     * Returns next command or raw value or null if the end of the delta string was reached.
     *
     * @protected
     * @return {string|number}
     */
    proto._next = function () {
        var me = this,
            str = me.str,
            next = null;

        if (str && me.pos < str.length) {
            var chr = str[me.pos++],
                c = code(chr);

            if (isSigned(c)) {
                var isNegative = (_J < c), n = c - (isNegative ? _J : _A);
                while (me.pos < str.length && isUnsigned(c = code(str[me.pos]))) { n = (n * 10) + (c - _0); me.pos++; }
                next = isNegative ? -n : n;
            } else {
                next = chr;
            }
        }

        return next;
    };

    /**
     * Returns the current iterator position. Pass it to {@link #seek|seek()} to go back to this position.
     *
     * @returns {number}
     */
    proto.getPosition = function () {
        return this.pos;
    };

    /**
     * Sets the current position of the iterator to the given one and {@link #reset|resets} the iterator.
     *
     * @param {number} pos
     */
    proto.seek = function (pos) {
        var me = this;

        me.pos = pos;
        me.reset();
    };

    /** Sets the current dimension to 0 (zero) and clears the last value and delta history. */
    proto.reset = function () {
        var me = this;

        me.currentDimension = 0;
        me.prev = fill(me.dimensions, me.defaultValue);
        me.prevDeltaNegative = fill(me.dimensions, false);
    };

    /**
     * Convenience method to check whether the given argument is a value.
     *
     * @param v - A possible value
     * @return {boolean} <code>true</code> for a value, <code>false</code> otherwise (i.e. for a command or <code>null</code>).
     */
    proto.isValue = isValue;

    function isSigned(c) { return (_A <= c && c <= _S); }
    function isUnsigned(c) { return (_0 <= c && c <= _9); }
    function isValue(v) { return (typeof v === 'number'); }

    function code(chr) {
        return chr.charCodeAt(0);
    }

    function fill(n, v) {
        return Array.apply(0, new Array(n)).map(function () { return v; });
    }

    function construct(Constructor, args) {
        function Temp() { return Constructor.apply(this, args); }
        Temp.prototype = Constructor.prototype;
        return new Temp();
    }

})(vectormaps);
/**
 * The loadFace function used by typeface fonts.
 * Extracted from typeface.js, version 0.15.
 */
// jshint camelcase: false, unused: false, strict: false
var _typeface_js = {

  faces: {},

  loadFace: function(typefaceData) {
    var familyName = typefaceData.familyName.toLowerCase();

    if (!this.faces[familyName]) {
      this.faces[familyName] = {};
    }
    if (!this.faces[familyName][typefaceData.cssFontWeight]) {
      this.faces[familyName][typefaceData.cssFontWeight] = {};
    }

    var face = this.faces[familyName][typefaceData.cssFontWeight][typefaceData.cssFontStyle] = typefaceData;
    face.loaded = true;
  }

};
(function (vectormaps) {
  'use strict';

  var Util = vectormaps.Util;

  var useTypefaceTextRendering = true,
      typefaceStyle, typefaceFace;

  if (useTypefaceTextRendering) {
      typefaceStyle = {
          fontSize: 10,
          fallbackCharacter: '.',
          fontStretchPercent: 1
      };
  }

  var tileSize = vectormaps.TILE_SIZE;

  var lastBreak;

  vectormaps.renderOverlays = function(overlays, canvas, done) {  // TODO: Unify with renderPTV?
    var overlayCount = (overlays == null ? 0 : overlays.length);

    var now = Date.now();

    if (! lastBreak || now - lastBreak > 500) {
      lastBreak = now;
    }

    var timeSlot = (vectormaps.Browser.mobile ? 10 : 100),
        timeSlotGap = 5,
        checkTimeFreq = 100, // Date.now() is expensive, so don't check each time
        cancel = false;

    var ctx;
    function initCanvas() {
      var widthBefore = canvas.width;
      Util.scaleCanvasForHighres(canvas);
      canvas.setAttribute("data-scaling", canvas.width/widthBefore);

      ctx = canvas.getContext('2d');

      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    initCanvas();

    var state = { overlayIndex: 0 };

    drawOverlays(state);

    function drawOverlays(state) {
      if (cancel) return;

      var overlayIndex = state.overlayIndex;

      while (overlayIndex < overlayCount) {
        drawOverlay();
        ++overlayIndex;

        if (Date.now() - lastBreak > timeSlot) {
          state = { overlayIndex: overlayIndex };

          setTimeout(function () {
            lastBreak = Date.now();

            drawOverlays(state);
          }, timeSlotGap);

          break;
        }
      }

      if (overlayIndex == overlayCount) done();

      function drawOverlay() {
        overlays[overlayIndex].draw(ctx);
      }
    }

    return { cancel: function() { cancel = true; done(true); }, canvas: canvas };
  };

  vectormaps.overlay = function(left, top, right, bottom) {
    var overlay = { left:left, top:top, right:right, bottom:bottom,
                    looseIntersectionWidthFactor:1, looseIntersectionHeightFactor:1 };
    overlay.intersects = overlayIntersects;
    overlay.intersectsLoosely = overlayIntersectsLoosely;
    overlay.getWrappedOverlay = returnThis;
    return overlay;
  };

  function overlayIntersects(left, top, right, bottom) {
    return this.left < right && left < this.right && this.top < bottom && top < this.bottom;
  }

  function overlayIntersectsLoosely(left, top, right, bottom) {
    var xPaddingHalf = (this.right - this.left)*(this.looseIntersectionWidthFactor - 1)/2;
    var yPaddingHalf = (this.bottom - this.top)*(this.looseIntersectionHeightFactor - 1)/2;
    return overlayIntersects.call(this, left - xPaddingHalf, top - yPaddingHalf,
                                        right + xPaddingHalf, bottom + yPaddingHalf);
  }

  function returnThis() { return this; }

  vectormaps.overlayWrapper = function(overlay, offsetX, offsetY) {
    var wrappedOverlay = overlay.getWrappedOverlay();
    if (wrappedOverlay !== overlay) {
      offsetX += overlay.offsetX;
      offsetY += overlay.offsetY;
      overlay = wrappedOverlay;
    }
    var wrapper = { left:overlay.left + offsetX, top:overlay.top + offsetY,
                    right:overlay.right + offsetX, bottom:overlay.bottom + offsetY,
                    looseIntersectionWidthFactor:overlay.looseIntersectionWidthFactor,
                    looseIntersectionHeightFactor:overlay.looseIntersectionHeightFactor,
                    offsetX:offsetX, offsetY:offsetY, wrappedOverlay:overlay };
    wrapper.intersects = overlayIntersects;
    wrapper.intersectsLoosely = overlayIntersectsLoosely;
    wrapper.getWrappedOverlay = returnWrappedOverlay;
    wrapper.draw = drawWrappedOverlay;
    return wrapper;
  };

  function returnWrappedOverlay() { return this.wrappedOverlay; }

  function drawWrappedOverlay(ctx) {
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    this.wrappedOverlay.draw(ctx);
    ctx.restore();
  }

  vectormaps.textOverlay = function(left, top, right, bottom,
                                    text, typeface, size, fillColor, haloColor, haloWidth) {
    var overlay = vectormaps.overlay(left, top, right, bottom);
    overlay.text = text;
    overlay.typeface = typeface;
    overlay.size = size;
    overlay.fillColor = fillColor;
    overlay.haloColor = haloColor;
    overlay.haloWidth = haloWidth;
    return overlay;
  };

  vectormaps.simpleTextOverlay = function(left, top, right, bottom,
                                          text, typeface, size, fillColor, haloColor, haloWidth,
                                          x, y) {
    var textOverlay = vectormaps.textOverlay(left, top, right, bottom,
                                             text, typeface, size, fillColor, haloColor, haloWidth);
    textOverlay.x = x;
    textOverlay.y = y;
    //textOverlay.draw = function(ctx) {
    //  drawSimpleText.call(textOverlay, ctx);
    //  ctx.strokeStyle = '#FF0000';
    //  ctx.lineWidth = 0.5;
    //  ctx.strokeRect(left, top, right - left, bottom - top);
    //};
    textOverlay.draw = drawSimpleText;
    return textOverlay;
  };

  function drawSimpleText(ctx) {
    ctx.fillStyle = this.fillColor;
    ctx.strokeStyle = this.haloColor;
    ctx.lineWidth = this.haloWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (useTypefaceTextRendering) {
      typefaceFace = this.typeface;
      typefaceStyle.fontSize = this.size;
      ctx.save();
      ctx.translate(this.x, this.y + typefaceGetCapHeight(typefaceStyle) / 2);
      typefaceRenderText(this.text, ctx, typefaceStyle, this.haloWidth, true);
      ctx.restore();
    } else {
      ctx.font = this.size + 'px Helvetica';
      ctx.textBaseline = 'middle';
      if (haloWidth > 0) {
        ctx.strokeText(this.text, this.x, this.y);
      }
      ctx.fillText(this.text, this.x, this.y);
    }
  };

  vectormaps.rotatedTextOverlay = function(left, top, right, bottom,
                                           text, typeface, size, fillColor, haloColor, haloWidth,
                                           x, y, rotation) {
    var textOverlay = vectormaps.simpleTextOverlay(left, top, right, bottom,
                                                   text, typeface, size, fillColor, haloColor, haloWidth,
                                                   x, y);
    textOverlay.rotation = rotation;
    //textOverlay.draw = function(ctx) {
    //  drawRotatedText.call(textOverlay, ctx);
    //  ctx.strokeStyle = '#FF0000';
    //  ctx.lineWidth = 0.5;
    //  ctx.strokeRect(left, top, right - left, bottom - top);
    //};
    textOverlay.draw = drawRotatedText;
    return textOverlay;
  };

  function drawRotatedText(ctx) {
    ctx.fillStyle = this.fillColor;
    ctx.strokeStyle = this.haloColor;
    ctx.lineWidth = this.haloWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    var text = this.text, x = this.x, y = this.y, rotation = this.rotation, haloWidth = this.haloWidth;
    if (useTypefaceTextRendering) {
      typefaceFace = this.typeface;
      typefaceStyle.fontSize = this.size;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      typefaceRenderText(text, ctx, typefaceStyle, haloWidth, true);
      ctx.restore();
    } else {
      ctx.font = this.size + 'px Helvetica';
      ctx.textBaseline = 'alphabetic';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.translate(-x, -y);
      if (haloWidth > 0) {
        ctx.strokeText(text, x, y);
      }
      ctx.fillText(text, x, y);
      ctx.restore();
    }
  };

  vectormaps.pathTextOverlay = function(left, top, right, bottom,
                                        text, typeface, size, fillColor, haloColor, haloWidth,
                                        x, y, rotation) {
    var textOverlay = vectormaps.textOverlay(left, top, right, bottom,
                                             text, typeface, size, fillColor, haloColor, haloWidth);
    textOverlay.x = x;
    textOverlay.y = y;
    textOverlay.rotation = rotation;
    //textOverlay.draw = function(ctx) {
    //  drawPathText.call(textOverlay, ctx);
    //  ctx.strokeStyle = '#FF0000';
    //  ctx.lineWidth = 0.5;
    //  ctx.strokeRect(left, top, right - left, bottom - top);
    //};
    textOverlay.draw = drawPathText;
    return textOverlay;
  };

  function drawPathText(ctx) {
    ctx.fillStyle = this.fillColor;
    ctx.strokeStyle = this.haloColor;
    ctx.lineWidth = this.haloWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (useTypefaceTextRendering) {
      typefaceFace = this.typeface;
      typefaceStyle.fontSize = this.size;
    } else {
      ctx.font = this.size + 'px Helvetica';
      ctx.textBaseline = 'alphabetic';
    }
    var text = this.text, x = this.x, y = this.y, rotation = this.rotation, haloWidth = this.haloWidth;
    var textLength = text.length;
    for (var iteration = 0; iteration < 2; ++iteration) {
      for (var i = 0; i < textLength; ++i) {
        ctx.save();
        ctx.translate(x[i], y[i]);
        ctx.rotate(rotation[i]);
        var singleChar = text.charAt(i);
        if (useTypefaceTextRendering) {
          typefaceRenderText(singleChar, ctx, typefaceStyle, (iteration === 0) ? haloWidth : 0, iteration === 1);
        } else {
          ctx.translate(-x[i], -y[i]);
          if (iteration == 1) {
            ctx.fillText(singleChar, x, y);
          } else if (haloWidth > 0) {
            ctx.strokeText(singleChar, x, y);
          }
        }
        ctx.restore();
      }
    }
  };

  vectormaps.imageAndTextOverlay = function(left, top, right, bottom,
                                            text, typeface, size, fillColor, haloColor, haloWidth,
                                            x, y,
                                            image) {
    var textOverlay = vectormaps.simpleTextOverlay(left, top, right, bottom,
                                                   text, typeface, size, fillColor, haloColor, haloWidth,
                                                   x, y);
    textOverlay.image = image;
    //textOverlay.draw = function(ctx) {
    //  drawImageAndText.call(textOverlay, ctx);
    //  ctx.strokeStyle = '#FF0000';
    //  ctx.lineWidth = 0.5;
    //  ctx.strokeRect(left, top, right - left, bottom - top);
    //};
    textOverlay.draw = drawImageAndText;
    return textOverlay;
  };

  function drawImageAndText(ctx) {
    try {
      ctx.drawImage(this.image, this.left, this.top, this.right - this.left, this.bottom - this.top);
    } catch (e) {
      // continue anyway
    }
    drawSimpleText.call(this, ctx);
  };

  function typefaceGetCapHeight(typefaceStyle) {
    return typefaceStyle.fontSize * typefaceFace.resolution / typefaceFace.ascender;
  }

  // Copied from typeface.js, version 0.15
  function typefaceRenderText(text, ctx, typefaceStyle, haloWidth, doFill) {
    ctx.save();

    var pointScale = typefacePixelsFromPoints(typefaceFace, typefaceStyle, 1);

    ctx.scale(pointScale * typefaceStyle.fontStretchPercent, -1 * pointScale);
    ctx.beginPath();

    for (var i = 0, il = text.length; i < il; i++) {
      typefaceRenderGlyph(ctx, typefaceFace, text.charAt(i), typefaceStyle);
    }

    if (haloWidth > 0) {
      ctx.lineWidth = haloWidth / pointScale;
      ctx.stroke();
    }

    if (doFill) {
      ctx.fill();
    }

    ctx.restore();
  }

  // Copied from typeface.js, version 0.15
  function typefaceRenderGlyph (ctx, face, chr, style) {
    var glyph = face.glyphs[chr];

    if (glyph) {
      if (glyph.o) {
        var outline;

        if (glyph.cached_outline) {
          outline = glyph.cached_outline;
        } else {
          outline = glyph.o.split(' ');
          glyph.cached_outline = outline;
        }

        var outlineLength = outline.length;

        for (var i = 0; i < outlineLength; ) {
          var action = outline[i++];

          switch(action) {
          case 'm':
            ctx.moveTo(outline[i++], outline[i++]);
            break;
          case 'l':
            ctx.lineTo(outline[i++], outline[i++]);
            break;
          case 'q':
            var cpx = outline[i++];
            var cpy = outline[i++];
            ctx.quadraticCurveTo(outline[i++], outline[i++], cpx, cpy);
            break;
          case 'b':
            var x = outline[i++];
            var y = outline[i++];
            ctx.bezierCurveTo(outline[i++], outline[i++], outline[i++], outline[i++], x, y);
            break;
          }
        }
      }

      if (glyph.ha) {
        ctx.translate(glyph.ha, 0);
      }
    } else {
      typefaceRenderGlyph(ctx, face, style.fallbackCharacter, style);
    }
  }

  // Copied (and simplified) from typeface.js, version 0.15
  function typefacePixelsFromPoints (face, style, points) {
    return points * style.fontSize * 72 / (face.resolution * 100);
  }

})(vectormaps);
(function (vectormaps) {
    'use strict';

    // jshint indent: 4, camelcase: false, evil: true

    var _A = code('A'),
        _J = code('J'),
        _S = code('S'),
        _0 = code('0'),
        _9 = code('9');

    vectormaps.DeltaIterator = DeltaIterator;

    /**
     * Static convenience method, which returns the delta-decoding result as array.
     *
     * Consumes the same arguments as the DeltaIterator constructor.
     * Use it if you need random access to the result or for small delta strings (array gets large fast).
     *
     * @static
     * @return {Array}
     */
    DeltaIterator.deltaDecode = function () {
        var iter = construct(DeltaIterator, arguments), res = [], x;
        while ((x = iter.next()) !== null) { res.push(x); }
        return res;
    };

    /**
     * Creates a new DeltaIterator.
     *
     * @param {string} str - The delta string to iterate
     * @param {number} [dimensions=1] - The number of value dimensions which are encoded in the delta string.
     *                                  E.g. for x/y coordinates, this would be 2.
     * @param {boolean} [useDeltaNegative=false] - Whether to decode deltas between value signs.
     * @param {number} [defaultValue=0] - The default value with which the last value history is pre-filled.
     * @constructor
     */
    function DeltaIterator(str, dimensions, useDeltaNegative, defaultValue) {
        var me = this;

        me.str = str;
        me.dimensions = (dimensions || 1);
        me.useDeltaNegative = !! useDeltaNegative;
        me.defaultValue = (defaultValue || 0);

        me.pos = 0;
        me.reset();
    }

    var proto = DeltaIterator.prototype;

    /**
     * Returns next command or delta-decoded value or null if the end of the delta string was reached.
     *
     * @param {number} [defaultValue] - This value is returned if next is not a value as expected, e.g. if a trailing y value was left out.
     * @return {string|number}
     */
    proto.next = function (defaultValue) {
        var me = this,
            next = me._next(),
            dim = me.currentDimension,
            updateDimension = false;

        if (isValue(next)) {
            var prevDeltaNegative = me.prevDeltaNegative[dim];

            if (me.useDeltaNegative) {
                if (next < 0) {
                    prevDeltaNegative = me.prevDeltaNegative[dim] = ! prevDeltaNegative;
                    next = -next; // make positive
                }

                if (prevDeltaNegative) {
                    next = -next;
                }
            }

            next = next + me.prev[dim];
            updateDimension = true;
        } else if (isValue(defaultValue)) {
            if (next !== null) {
                me.pos--;
            }

            next = defaultValue;
            updateDimension = true;
        }

        if (updateDimension) {
            me.prev[dim] = next;
            me.currentDimension = (dim + 1) % me.dimensions;
        }

        return next;
    };

    /**
     * Returns next command or raw value or null if the end of the delta string was reached.
     *
     * @protected
     * @return {string|number}
     */
    proto._next = function () {
        var me = this,
            str = me.str,
            next = null;

        if (str && me.pos < str.length) {
            var chr = str[me.pos++],
                c = code(chr);

            if (isSigned(c)) {
                var isNegative = (_J < c), n = c - (isNegative ? _J : _A);
                while (me.pos < str.length && isUnsigned(c = code(str[me.pos]))) { n = (n * 10) + (c - _0); me.pos++; }
                next = isNegative ? -n : n;
            } else {
                next = chr;
            }
        }

        return next;
    };

    /**
     * Returns the current iterator position. Pass it to {@link #seek|seek()} to go back to this position.
     *
     * @returns {number}
     */
    proto.getPosition = function () {
        return this.pos;
    };

    /**
     * Sets the current position of the iterator to the given one and {@link #reset|resets} the iterator.
     *
     * @param {number} pos
     */
    proto.seek = function (pos) {
        var me = this;

        me.pos = pos;
        me.reset();
    };

    /** Sets the current dimension to 0 (zero) and clears the last value and delta history. */
    proto.reset = function () {
        var me = this;

        me.currentDimension = 0;
        me.prev = fill(me.dimensions, me.defaultValue);
        me.prevDeltaNegative = fill(me.dimensions, false);
    };

    /**
     * Convenience method to check whether the given argument is a value.
     *
     * @param v - A possible value
     * @return {boolean} <code>true</code> for a value, <code>false</code> otherwise (i.e. for a command or <code>null</code>).
     */
    proto.isValue = isValue;

    function isSigned(c) { return (_A <= c && c <= _S); }
    function isUnsigned(c) { return (_0 <= c && c <= _9); }
    function isValue(v) { return (typeof v === 'number'); }

    function code(chr) {
        return chr.charCodeAt(0);
    }

    function fill(n, v) {
        return Array.apply(0, new Array(n)).map(function () { return v; });
    }

    function construct(Constructor, args) {
        function Temp() { return Constructor.apply(this, args); }
        Temp.prototype = Constructor.prototype;
        return new Temp();
    }

    var COMMAND_MOVETO = 0,
        COMMAND_LINETO = 1,
        COMMAND_ARC_CW = 2,
        COMMAND_ARC_ACW = 3,
        COMMAND_INTERNAL_MOVETO = 4;

    function parseCoords(coordString) {
        var coordsIter = new vectormaps.DeltaIterator(coordString, 2, true),
            coords = [],
            coordItem = createItem(),
            lastY = 0,
            command = COMMAND_MOVETO,
            internalMoveTo = false,
            v;

        while ((v = coordsIter.next()) !== null) {
            if (coordsIter.isValue(v)) {
                coordItem.x.push(v);
                coordItem.y.push(lastY = coordsIter.next(lastY));
                coordItem.cm.push(command);
                coordItem.length++;
                command = COMMAND_LINETO;
            } else if (v === 'a') {
                command = COMMAND_ARC_CW;
            } else if (v === 'b') {
                command = COMMAND_ARC_ACW;
            } else if (v === 'c') {
                internalMoveTo = true;
            } else if (v === ':') {
                coords.push(coordItem);
                coordItem = createItem();
                coordsIter.reset();
                lastY = 0;
                command = COMMAND_MOVETO;
                internalMoveTo = false;
            } else {
                if (internalMoveTo) {
                    command = COMMAND_INTERNAL_MOVETO;
                    internalMoveTo = false;
                } else {
                    command = COMMAND_MOVETO;
                }
            }
        }

        coords.push(coordItem);

        function createItem() {
            return { x: [], y: [], cm: [], length: 0 };
        }

        return coords;
    }

    var Util = vectormaps.Util,
        DeltaIterator = vectormaps.DeltaIterator;

    var white       = 'rgb(255,255,255)',
        black       = 'rgb(0,0,0)',
        transparent = 'rgba(0,0,0,0)';

    var useTypefaceTextRendering = true,
        typefaceStyle, typefaceFace;

    if (useTypefaceTextRendering) {
        typefaceStyle = {
            fontSize: 10,
            fallbackCharacter: '.',
            fontStretchPercent: 1
        };
    }

    var tileSize = vectormaps.TILE_SIZE;

    var lastBreak,
        worker,
        workerId = 0;

    var DEBUG = false;

    renderPTV.PARSE_COORDS_WORKER = 'js/parseCoordsWorker.js';

    vectormaps.renderPTV = renderPTV;

    function renderPTV(tile, theme, canvas, done, ignoreDashes, sizeCanvasToFit, allowedElements, separateOverlays) {
        var overlays = (separateOverlays ? [] : undefined);

        var now = Date.now();

        if (done && (! lastBreak || now - lastBreak > 500)) {
            lastBreak = now;
        }

        var timeSlot = (vectormaps.Browser.mobile ? 10 : 100),
            timeSlotGap = 5,
            checkTimeFreq = 100, // Date.now() is expensive, so don't check each time
            cancel = false,
            tic = {},
            toc = {},
            doTic, doToc;

        if (DEBUG) {
            doTic = function (id) { tic[id] = Date.now(); };

            doToc = function (id) {
                var t = Date.now() - tic[id];

                if (toc[id]) {
                    toc[id] += t;
                    toc[id + '_num'] = (toc[id + '_num'] || 1) + 1;
                } else {
                    toc[id] = t;
                }
            };
        } else {
            doTic = doToc = function noop() {};
        }

        doTic('total');

        var ctx;
        function initCanvas() {
            var widthBefore = canvas.width;
            Util.scaleCanvasForHighres(canvas);
            canvas.setAttribute("data-scaling", canvas.width/widthBefore);

            ctx = canvas.getContext('2d');

            var background = tile.b;
            if (theme) background = background || theme.b;
            ctx.fillStyle = background || transparent;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (sizeCanvasToFit) {
                ctx.scale(1/sizeCanvasToFit, 1/sizeCanvasToFit);
            }
        }
        if (done || !sizeCanvasToFit) {
            initCanvas();
        }

        if (tile.e == null || tile.c == null || tile.s == null) {
            return wrappedDone(true);
        }

        var doneCalled = false;

        function wrappedDone(err) {
            if (doneCalled) {
                return;
            }

            doToc('draw');
            doToc('total');

            if (err) {
                canvas.width = canvas.width;
            }

            if (done && worker) {
              worker.removeEventListener('message', parseDone);
            }
            if (done) done.apply(null, arguments);
            doneCalled = true;
        }

        if (typeof tile.s === 'string') {
            tile.s = DeltaIterator.deltaDecode(tile.s).map(function (i) { return theme.s[i]; });
        }

        var styles = tile.s.map(function (style) {
            if (typeof style === 'string') {
                style = { c: style };
            }

            if (style.s == null) {
                style.s = 1;
            }

            return style;
        });

        var elementsIter = new DeltaIterator(tile.e, 2, false, -1),
            texts = tile.t,
            symbols = theme && theme.symbols,
            element = { x: 0, y: 0, cm: null };

        var state = {
            styleIndex: -1,
            coordIndex: -1,
            textIndex:   0
        };

        var overzoom = tile.overzoom;

        if (overzoom) {
            ctx.translate(-(overzoom.dx * tileSize), -(overzoom.dy * tileSize));
            ctx.scale(overzoom.s, overzoom.s);
        }

        if (useTypefaceTextRendering && ! typefaceFace) {
            typefaceFace = theme && theme.typefaceFace;
        }

        doTic('parse');

        var coords, id;

        if (done) {
            id = workerId++;
            if (!worker) {
                worker = new Worker(renderPTV.PARSE_COORDS_WORKER);
            }
            worker.addEventListener('message', parseDone);
            worker.postMessage({ id: id, coordString: tile.c });
        } else {
            id = 1;
            parseDone({data:{id:id, coords:parseCoords(tile.c)}});
        }

        function parseDone(evt) {
            var data = evt.data;

            if (data.id === id) {
                coords = data.coords;

                doToc('parse');
                doTic('draw');

                if (sizeCanvasToFit || !done) {
                    var transX, transY;
                    if (sizeCanvasToFit) {
                        var first = true;
                        var minX = 0, minY = 0, maxX = 0, maxY = 0;
                        var coordCount = coords.length;
                        for (var i = 0; i < coordCount; ++i) {
                            var coordItem = coords[i];
                            var entryCount = coordItem.x.length;
                            for (var j = 0; j < entryCount; ++j) {
                                var x = coordItem.x[j];
                                var y = coordItem.y[j];
                                if (coordItem.cm[j] != COMMAND_ARC_CW && coordItem.cm[j] != COMMAND_ARC_ACW) {
                                    if (first || x < minX) minX = x;
                                    if (first || x > maxX) maxX = x;
                                    if (first || y < minY) minY = y;
                                    if (first || y > maxY) maxY = y;
                                    first = false;
                                }
                            }
                        }
                        var maxS = 1;
                        var styleCount = styles.length;
                        for (var i = 0; i < styleCount; ++i) {
                            var s = styles[i].s;
                            if (s > maxS) maxS = s;
                        }
                        var buffer = Math.ceil(maxS/2) + 1;
                        transX = Math.round((-minX + buffer)/sizeCanvasToFit);
                        transY = Math.round((-minY + buffer)/sizeCanvasToFit);
                        var width = Math.ceil((maxX - minX + buffer*2)/sizeCanvasToFit);
                        var height = Math.ceil((maxY - minY + buffer*2)/sizeCanvasToFit);
                        canvas.width = width;
                        canvas.height = height;
                        canvas.style.width = width + "px";
                        canvas.style.height = height + "px";
                        canvas._ptvVectorMapScaled = false;
                    }
                    initCanvas();
                    if (transX || transY) {
                        canvas.getContext("2d").translate(transX*sizeCanvasToFit, transY*sizeCanvasToFit);
                    }
                }

                try {
                    drawElements(state);
                } catch (err) {
                    wrappedDone(err);
                    throw err;
                }
            }
        }

        function drawElements(state, innerState) {
            if (cancel) { return; }

            var styleIndex = state.styleIndex,
                coordIndex = state.coordIndex,
                textIndex  = state.textIndex,
                type       = state.type;

            if (innerState) { // resume inner loop
                drawElements(state, drawElement()); // recursion
            } else {

                while ((type = elementsIter.next()) !== null) {
                    styleIndex = elementsIter.next(styleIndex + 1);
                    coordIndex = elementsIter.next(coordIndex + 1);

                    drawElement();

                    if (innerState || (done && (Date.now() - lastBreak > timeSlot))) {
                        state = {
                            styleIndex: styleIndex,
                            coordIndex: coordIndex,
                            textIndex:  textIndex,
                            type:       type
                        };

                        // jshint loopfunc:true

                        setTimeout(function () {
                            lastBreak = Date.now();

                            try {
                                drawElements(state, innerState); // recursion
                            } catch (err) {
                                wrappedDone(err);
                                throw err;
                            }
                        }, timeSlotGap);

                        break;
                    }
                }

            }

            if (type === null) {
                wrappedDone();
            }

            function drawElement() {
                var style = styles[styleIndex],
                    coordItem = coords[coordIndex];

                // jshint indent: false

                if (type == 'p') {
                    if (allowedElements != null && allowedElements.indexOf('p') == -1) return innerState;
                    if (!style.disabled) {
                        innerState = renderPolygon(coordItem, style, innerState);
                    }
                } else if (type == 'l') {
                    if (allowedElements != null && allowedElements.indexOf('l') == -1) return innerState;
                    if (!style.disabled && style.s > 0) {
                        innerState = renderLine(coordItem, style, innerState);
                    }
                } else if (type == 't') {
                    if (allowedElements != null && allowedElements.indexOf('t') == -1) return innerState;
                    if (!style.disabled) {
                        innerState = renderText(texts[textIndex], coordItem, style);
                    }
                    ++textIndex;
                }

                return innerState;
            }
        }

        function renderPolygon(coordItem, style, state) {
            var count = coordItem.length,
                start = 0,
                needToClose, needLine, moveX, moveY, needArc;

            if (state) {
                start = state.start;
                needToClose = state.needToClose;
                needLine = state.needLine;
                moveX = state.moveX;
                moveY = state.moveY;
                needArc = state.needArc;
            } else {
                ctx.fillStyle = style.c;
            }

            var broke = false;

            for (var i = start; i < count; ++i) {
                if ((i % checkTimeFreq === 0) && i !== start && done && (Date.now() - lastBreak > timeSlot)) {
                    broke = true;
                    break;
                }

                var element = getElement(coordItem, i);

                if (element.cm == COMMAND_MOVETO) {
                    if (needToClose) {
                        if (needLine) {
                            ctx.lineTo(moveX, moveY);
                        }

                        ctx.fill();
                        ctx.beginPath();
                    } else {
                        ctx.beginPath();
                    }

                    moveX = element.x;
                    moveY = element.y;
                    ctx.moveTo(moveX, moveY);
                    needToClose = true;
                    needLine = true;
                    needArc = false;
                } else if (element.cm == COMMAND_INTERNAL_MOVETO) {
                    if (needLine) ctx.lineTo(moveX, moveY);
                    moveX = element.x;
                    moveY = element.y;
                    ctx.moveTo(moveX, moveY);
                    needLine = true;
                    needArc = false;
                } else if (element.cm == COMMAND_ARC_CW || element.cm == COMMAND_ARC_ACW) {
                    needArc = true;
                } else if (element.cm == COMMAND_LINETO) {
                    if (needArc) {
                        needArc = false;
                        var destX = element.x, destY = element.y;
                        element = getElement(coordItem, i - 2);
                        var startX = element.x, startY = element.y;
                        element = getElement(coordItem, i - 1);
                        var radius = Math.hypot(startX - element.x, startY - element.y);
                        var startAngle = Math.atan2(startY - element.y, startX - element.x);
                        var endAngle = Math.atan2(destY - element.y, destX - element.x);
                        ctx.arc(element.x, element.y, radius, startAngle, endAngle, (element.cm == COMMAND_ARC_ACW));
                    } else {
                        ctx.lineTo(element.x, element.y);
                    }
                    needLine = false;
                }
            }

            if (! broke && needToClose) {
                if (needLine) {
                    ctx.lineTo(moveX, moveY);
                }

                ctx.fill();
            }

            return broke && { start: i, needToClose: needToClose, needLine: needLine, moveX: moveX, moveY: moveY, needArc: needArc };
        }

        function renderLine(coordItem, style, state) {
            var count = coordItem.length,
                start = 0,
                needLine, moveX, moveY, needArc;

            if (state) {
                start = state.start;
                needLine = state.needLine;
                moveX = state.moveX;
                moveY = state.moveY;
                needArc = state.needArc;
            } else {
                ctx.strokeStyle = style.c;
                ctx.lineWidth = style.s;
                ctx.lineJoin = style.linejoin || 'miter';
                ctx.lineCap = style.linecap || 'butt';

                ctx.beginPath();
            }

            var broke = false;

            for (var i = start; i < count; ++i) {
                if ((i % checkTimeFreq === 0) && i !== start && done && (Date.now() - lastBreak > timeSlot)) {
                    broke = true;
                    break;
                }

                var element = getElement(coordItem, i);

                if (element.cm == COMMAND_MOVETO || element.cm == COMMAND_INTERNAL_MOVETO) {
                    if (needLine) {
                        ctx.lineTo(moveX, moveY);
                    }

                    moveX = element.x;
                    moveY = element.y;
                    ctx.moveTo(moveX, moveY);
                    needLine = true;
                    needArc = false;
                } else if (element.cm == COMMAND_ARC_CW || element.cm == COMMAND_ARC_ACW) {
                    needArc = true;
                } else if (element.cm == COMMAND_LINETO) {
                    if (needArc) {
                        needArc = false;
                        var destX = element.x, destY = element.y;
                        element = getElement(coordItem, i - 2);
                        var startX = element.x, startY = element.y;
                        element = getElement(coordItem, i - 1);
                        var radius = Math.hypot(startX - element.x, startY - element.y);
                        var startAngle = Math.atan2(startY - element.y, startX - element.x);
                        var endAngle = Math.atan2(destY - element.y, destX - element.x);
                        ctx.arc(element.x, element.y, radius, startAngle, endAngle, (element.cm == COMMAND_ARC_ACW));
                    } else {
                        ctx.lineTo(element.x, element.y);
                    }
                    needLine = false;
                }
            }

            if (! broke) {
                if (needLine) {
                    ctx.lineTo(moveX, moveY);
                }

                if (!ignoreDashes && style.d) {
                    ctx.save();
                    ctx.setLineDash(style.d);
                    ctx.stroke();
                    ctx.restore();
                } else {
                   ctx.stroke();
                }
            }

            return broke && { start: i, needLine: needLine, moveX: moveX, moveY: moveY };
        }

        function renderText(text, coordItem, style) {
            var textLength = text.length,
                coordLength = coordItem.length,
                isLinePath = (coordLength == textLength*2),
                isStraight = (coordLength == 2 && textLength > 1),
                size = style.s,
                x, y, angle;

            if (useTypefaceTextRendering) {
                typefaceStyle.fontSize = size;
            } else {
                ctx.font = size + 'px Helvetica';
            }

            var haloWidth = (style.haloradius || 0) * 2;

            if (overzoom && separateOverlays) {
                size *= overzoom.s;
                haloWidth *= overzoom.s;
            }

            var fillStyle = style.c || black;
            var strokeStyle = style.halofill || white;
            var overlay;

            if (isLinePath) {
                if (textLength > 0) {
                    var xArray = new Array(textLength), yArray = new Array(textLength),
                        angleArray = new Array(textLength),
                        minX, minY, maxX, maxY;

                    for (var i = 0; i < textLength; ++i) {
                        var element = getElement(coordItem, i);

                        x = element.x/2;
                        y = element.y/2;
                        if (overzoom && separateOverlays) {
                            x = x*overzoom.s - overzoom.dx*tileSize;
                            y = y*overzoom.s - overzoom.dy*tileSize;
                        }
                        if (i == 0 || x < minX) minX = x;
                        if (i == 0 || y < minY) minY = y;
                        if (i == 0 || x > maxX) maxX = x;
                        if (i == 0 || y > maxY) maxY = y;
                        xArray[i] = x;
                        yArray[i] = y;

                        var refElement = getElement(coordItem, i + textLength);

                        angleArray[i] = -Math.atan2(refElement.x, refElement.y);
                    }

                    overlay = vectormaps.pathTextOverlay(
                        minX - size, minY - size, maxX + size, maxY + size,
                        text, typefaceFace, size, fillStyle, strokeStyle, haloWidth,
                        xArray, yArray, angleArray);
                }
            } else {
                var firstElement = getElement(coordItem, 0);

                if (isStraight) {
                    x = firstElement.x/2;
                    y = firstElement.y/2;

                    var lastElement = getElement(coordItem, coordLength - 1),
                        x2 = lastElement.x/2,
                        y2 = lastElement.y/2;

                    angle = Math.PI/2 - Math.atan2(x2 - x, y2 - y);

                    if (overzoom && separateOverlays) {
                        x = x*overzoom.s - overzoom.dx*tileSize;
                        y = y*overzoom.s - overzoom.dy*tileSize;
                        x2 = x2*overzoom.s - overzoom.dx*tileSize;
                        y2 = y2*overzoom.s - overzoom.dy*tileSize;
                    }

                    overlay = vectormaps.rotatedTextOverlay(
                        Math.min(x, x2) - size, Math.min(y, y2) - size, Math.max(x, x2) + size, Math.max(y, y2) + size,
                        text, typefaceFace, size, fillStyle, strokeStyle, haloWidth,
                        x, y, angle);
                } else {
                    x = firstElement.x / 2;
                    y = firstElement.y / 2;

                    var textWidth = useTypefaceTextRendering ? typefaceGetTextWidth(text, typefaceStyle) : ctx.measureText(text).width,
                        textX = x - textWidth / 2,
                        textY = y,
                        shieldImg = symbols[style.u];

                    if (overzoom && separateOverlays) {
                        textX = textX*overzoom.s - overzoom.dx*tileSize;
                        textY = textY*overzoom.s - overzoom.dy*tileSize;
                        textWidth *= overzoom.s;
                    }

                    if (!shieldImg && style.u && style.u.charAt(0) == "{") {
                        shieldImg = document.createElement("canvas");
                        renderPTV(JSON.parse(style.u), null, shieldImg, null, false, 2);
                        symbols[style.u] = shieldImg;
                    }

                    if (shieldImg) {
                        var scaling = +shieldImg.getAttribute('data-scaling'),
                            scaledWidthHalf = shieldImg.width / scaling / 2,
                            scaledHeightHalf = shieldImg.height / scaling / 2;

                        if (overzoom && separateOverlays) {
                            x = x*overzoom.s - overzoom.dx*tileSize;
                            y = y*overzoom.s - overzoom.dy*tileSize;
                            scaledWidthHalf *= overzoom.s;
                            scaledHeightHalf *= overzoom.s;
                        }

                        overlay = vectormaps.imageAndTextOverlay(
                            x - scaledWidthHalf, y - scaledHeightHalf, x + scaledWidthHalf, y + scaledHeightHalf,
                            text, typefaceFace, size, fillStyle, strokeStyle, haloWidth,
                            textX, textY,
                            shieldImg);
                    } else {
                        var offset = 1;
                        if (overzoom && separateOverlays) offset *= overzoom.s;

                        overlay = vectormaps.simpleTextOverlay(
                            textX + offset, textY - size*0.4, textX + textWidth - offset, textY + size*0.4,
                            text, typefaceFace, size, fillStyle, strokeStyle, haloWidth,
                            textX, textY);
                        overlay.looseIntersectionHeightFactor = 1.5;
                    }
                }
            }

            if (overlay !== undefined) {
                if (separateOverlays) overlays.push(overlay); else overlay.draw(ctx);
            }
        }

        function getElement(coordItem, idx) {
            element.x  = coordItem.x[idx];
            element.y  = coordItem.y[idx];
            element.cm = coordItem.cm[idx];

            return element;
        }

        return { cancel: function () {
            cancel = true;
            wrappedDone(true);
        }, performance: toc, overlays: overlays };

    }

    function typefaceGetTextWidth(text, typefaceStyle) {
        var textWidth = 0,
            textLength = text.length;

        for (var i = 0; i < textLength; i++) {
            var glyph = typefaceFace.glyphs[text.charAt(i)];

            if (! glyph) {
                glyph = typefaceFace.glyphs[typefaceStyle.fallbackCharacter];
            }

            // if we're on the last character, go with the glyph extent if that's more than the horizontal advance
            textWidth += (i + 1 == textLength) ? Math.max(glyph.x_max, glyph.ha) : glyph.ha;
        }

        return typefacePixelsFromPoints(typefaceFace, typefaceStyle, textWidth);
    }

    // Copied (and simplified) from typeface.js, version 0.15
    function typefacePixelsFromPoints (face, style, points) {
        return points * style.fontSize * 72 / (face.resolution * 100);
    }

})(vectormaps);
