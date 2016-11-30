if (!token)
    alert("you need an xServer internet token to run this sample!");

var hour = moment('2016-12-24T16:30:00+02:00');
var enableSpeedPatterns = false;
var enableRestrictionZones = false;
var enableTrafficIncidents = false;
var enableTruckAttributes = false;
var dynamicTimeOnStaticRoute = false;
var staticTimeOnStaticRoute = false;
var itineraryLanguage = 'EN';
var routingProfile = 'carfast';
var replaySpeed = 250;
var responses = null;
var doLoop = null;
var scenario = 'xmas';

var map = L.map('map', {
    zoomControl: false,
    contextmenu: true,
    contextmenuWidth: 200,
    maxZoom: 18,
    contextmenuItems: [{
        text: 'Add Waypoint At Start',
        callback: function (ev) {
            if (routingControl._plan._waypoints[0].latLng)
                routingControl.spliceWaypoints(0, 0, ev.latlng);
            else
                routingControl.spliceWaypoints(0, 1, ev.latlng);
        }
    }, {
        text: 'Add Waypoint At End',
        callback: function (ev) {
            if (routingControl._plan._waypoints[routingControl._plan._waypoints.length - 1].latLng)
                routingControl.spliceWaypoints(routingControl._plan._waypoints.length, 0, ev.latlng);
            else
                routingControl.spliceWaypoints(routingControl._plan._waypoints.length - 1, 1, ev.latlng);
        }
    }]
});


var attribution = '<a href="http://www.ptvgroup.com" target="_blank">PTV</a>, TOMTOM';

map.setView([0, 0], 0);

var replay = function () {
    if($('#replaySpeed option:selected').val())
        replaySpeed = $('#replaySpeed option:selected').val();
    doLoop = $('#doLoop').is(':checked');
    buildD3Animations(responses, replaySpeed, doLoop);
}

var getLayer = function (profile) {
    return L.tileLayer('http://s0{s}-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/'
                        + profile + '?xtok=' + token, {
        attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
        maxZoom: 18,
        subdomains: '1234',
        unloadInvisibleTiles: true
    });
}

         vectormaps.renderPTV.PARSE_COORDS_WORKER = "lib/vectormaps-worker.min.js";

         // add PTV tile and label (overlay) layers
         var overlayLayer = vectormaps.overlayLayer();
         var layer = vectormaps.vectorTileLayer(
			'http://xvector.westeurope.cloudapp.azure.com/vectormaps/vectormaps/', 
			{stylesUrl: 'styles/styles-winter.json'}, overlayLayer);
         var vectorWinter = L.layerGroup([layer, overlayLayer]).addTo(map);

         overlayLayer = vectormaps.overlayLayer();
         layer = vectormaps.vectorTileLayer(
			'http://xvector.westeurope.cloudapp.azure.com/vectormaps/vectormaps/', 
			{stylesUrl: 'styles/styles-default.json'}, overlayLayer);
         var vectorDefault = L.layerGroup([layer, overlayLayer]);
		 
var rasterLayer = getLayer("silkysand");

new L.Control.Zoom({ position: 'bottomleft' }).addTo(map);

// update ui
$('#range').attr("value", hour.format());
$('#enableSpeedPatterns').attr("checked", enableSpeedPatterns);
$('#enableRestrictionZones').attr("checked", enableRestrictionZones);
$('#enableTrafficIncidents').attr("checked", enableTrafficIncidents);
$('#enableTruckAttributes').attr("checked", enableTruckAttributes);
$('#dynamicTimeOnStaticRoute').attr("checked", dynamicTimeOnStaticRoute);
$('#staticTimeOnStaticRoute').attr("checked", staticTimeOnStaticRoute);
$('#languageSelect').val(itineraryLanguage);
$('#routingProfile').val(routingProfile);
$('#replaySpeed').val(replaySpeed);
$('#doLoop').attr("checked", doLoop);
$('#scenarioSelect').val(scenario);

var sidebar = L.control.sidebar('sidebar').addTo(map);
//sidebar.open("home");

fixClickPropagationForIE(sidebar._sidebar);

var buildProfile = function () {
    var template = '<Profile xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"><FeatureLayer majorVersion=\"1\" minorVersion=\"0\"><GlobalSettings enableTimeDependency=\"true\"/><Themes><Theme id=\"PTV_RestrictionZones\" enabled=\"{enableRestrictionZones}\" priorityLevel=\"0\"></Theme><Theme id=\"PTV_SpeedPatterns\" enabled=\"{enableSpeedPatterns}\" priorityLevel=\"0\"/><Theme id=\"PTV_TrafficIncidents\" enabled=\"{enableTrafficIncidents}\" priorityLevel=\"0\"/><Theme id=\"PTV_TruckAttributes\" enabled=\"{enableTruckAttributes}\" priorityLevel=\"0\"/><Theme id=\"PTV_TimeZones\" enabled=\"true\" priorityLevel=\"0\"/></Themes></FeatureLayer><Routing majorVersion=\"2\" minorVersion=\"0\"><Course><AdditionalDataRules enabled=\"true\"/></Course></Routing></Profile>'

    template = template.replace("{enableRestrictionZones}", enableRestrictionZones);
    template = template.replace("{enableSpeedPatterns}", enableSpeedPatterns);
    template = template.replace("{enableTruckAttributes}", enableTruckAttributes);
    template = template.replace("{enableTrafficIncidents}", enableTrafficIncidents);

    return template;
}

var setNow = function () {
    $('#range').val(moment().format());
    updateParams(true);
}

var updateScenario = function() {
    scenario = $('#scenarioSelect option:selected').val();


  if(scenario === 'xmas')
    routingControl.setWaypoints([
            L.latLng(48.01269, 7.72334),
            L.latLng(49.01328, 8.42806)]);
    else if(scenario === 'New York')
        routingControl.setWaypoints([
            L.latLng(40.78263, -74.03331),
            L.latLng(40.71307, -74.00724)]);
    else if(scenario === 'Paris')
        routingControl.setWaypoints([
            L.latLng(y=48.92233, 2.32382),
            L.latLng(y=48.80220, 2.44454)]);
    else if(scenario === 'Karlsruhe')
        routingControl.setWaypoints([
            L.latLng(49.01502, 8.37922),
            L.latLng(49.01328, 8.42806)]);
        
    routingControl.route();
}

var updateParams = function (refreshFeatureLayer, setTimeNow) {
    if (setTimeNow)
        $('#range').val(moment().format());

    hour = moment($('#range').val());

    enableSpeedPatterns = $('#enableSpeedPatterns').is(':checked');
    enableRestrictionZones = $('#enableRestrictionZones').is(':checked');
    enableTruckAttributes = $('#enableTruckAttributes').is(':checked');
    enableTrafficIncidents = $('#enableTrafficIncidents').is(':checked');
    dynamicTimeOnStaticRoute = $('#dynamicTimeOnStaticRoute').is(':checked');
    staticTimeOnStaticRoute = $('#staticTimeOnStaticRoute').is(':checked');
    itineraryLanguage = $('#languageSelect option:selected').val();
    routingProfile = $('#routingProfile option:selected').val();

    //if (refreshFeatureLayer || setTimeNow) {
    //    speedPatterns.redraw();
    //    //        incidents.redraw();
    //}

    routingControl._router.options.numberOfAlternatives = ((dynamicTimeOnStaticRoute)? 1:0) + ((staticTimeOnStaticRoute)? 1:0);
    routingControl.route();
}

var routingControl = L.Routing.control({
     plan: L.Routing.plan([], {
        createMarker: function (i, wp) {
            return L.marker(wp.latLng, {
                draggable: true,
                icon: new L.Icon.Label.Default({ labelText: String.fromCharCode(65 + i) })
            });
        },
        geocoder: L.Control.Geocoder.ptv({
        serviceUrl: 'https://api-eu-test.cloud.ptvgroup.com/xlocate/rs/XLocate/',
        token: token }),
        reverseWaypoints: true
    }),
    altLineOptions: {
        styles: [
            {color: 'black', opacity: 0.15, weight: 9},
            {color: 'white', opacity: 0.8, weight: 6},
            {color: 'blue', opacity: 0.5, weight: 2}
        ],
    },
    showAlternatives: true,     
    router: L.Routing.ptv({
        serviceUrl: 'https://api-eu-test.cloud.ptvgroup.com/xroute/rs/XRoute/',
        token: token,
        numberOfAlternatives: ((dynamicTimeOnStaticRoute)? 1:0) + ((staticTimeOnStaticRoute)? 1:0),
        beforeSend: function (request, currentResponses, idx) {
            if (hour)
                request.options.push({
                    parameter: "START_TIME",
                    value: hour.format() // moment.utc().add(hour, 'hours').format()
                });

            if (idx == 1 && dynamicTimeOnStaticRoute) // alt is static route with dynamic time
                request.options.push({
                    parameter: "DYNAMIC_TIME_ON_STATICROUTE",
                    value: true
                });

            request.options.push({
                parameter: "ROUTE_LANGUAGE",
                value: itineraryLanguage
            });
    
            if(idx == 0 || (idx == 1 && dynamicTimeOnStaticRoute)) 
            request.callerContext.properties.push({
                key: "ProfileXMLSnippet",
                value: buildProfile()
            });

            request.callerContext.properties.push({ key: "Profile", value: routingProfile });

            return request;
        },
        routesCalculated: function (alts, r) {
            responses = r;
            alts[0].name = '<i style="background:yellow"></i>Dynamic Route';
            if (!dynamicTimeOnStaticRoute)
            {
                if (staticTimeOnStaticRoute)
                    alts[1].name = '<i style="background:black"></i>Static Route';

                responses[2] = responses[1];
                responses[1] = null;
            }
            else {
                alts[1].name = '<i style="background:#a00"></i>Static Route /w dynamic Time';
                if (staticTimeOnStaticRoute)
                    alts[2].name = '<i style="background:black"></i>Static Route';
            }
            replaySpeed = responses[0].info.time / 10;
            $('#replaySpeed').val(replaySpeed);
            replay();
        }
    }),
    formatter: new L.Routing.Formatter({roundingSensitivity: 1000}),
    routeWhileDragging: false,
    routeDragInterval: 1000,
	collapsible: true
}).addTo(map);

routingControl.hide();

routingControl.on('routingerror', function (e) {
    alert(e.error.responseJSON.errorMessage);
});

var BigPointLayer = L.CanvasLayer.extend({
    particles: [],
    mp: 100, //max particles
    start: 0,
	onAdd: function (map) {
        L.CanvasLayer.prototype.onAdd.call(this, map);

        var canvas = this.getCanvas();
        var W = canvas.width;
        var H = canvas.height;

        //snowflake particles
        for (var i = 0; i < this.mp; i++) {
            this.particles.push({
                x: Math.random() * W, //x-coordinate
                y: Math.random() * H, //y-coordinate
                r: Math.random() * 8 + 1, //radius
                d: Math.random() * this.mp //density
            });
        }
    },
	
	lProgress : 0,
	
    render: function (timestamp) {
		if(this.start == 0) this.start = timestamp;
		var progress = timestamp - this.start;
		var dProgress = progress - this.lProgress;
		this.lProgress = progress;

        this.xupdate(progress, dProgress);

        var canvas = this.getCanvas();
        var ctx = canvas.getContext('2d');

        // clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "rgba(64, 64, 64, 255)";
        ctx.beginPath();
        for (var i = 0; i < this.mp; i++) {
            var p = this.particles[i];
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, p.r+1, 0, Math.PI * 2, true);
            //            ctx.stroke();
        }
        ctx.fill();

		        ctx.fillStyle = "rgba(255, 255, 255, 255)";
        ctx.beginPath();
        for (var i = 0; i < this.mp; i++) {
            var p = this.particles[i];
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
//            ctx.stroke();
        }
        ctx.fill();
		

		this._render();
    },

    //Function to move the snowflakes
    //angle will be an ongoing incremental flag. Sin and Cos functions will be applied to it to create vertical and horizontal movements of the flakes
	
    xupdate: function (progress, dProgress) {

		var angle = progress / 1000;
		var d = dProgress / 20;
        var particles = this.particles;
        var canvas = this.getCanvas();
        var W = canvas.width;
        var H = canvas.height;

		// console.log(d);

        for (var i = 0; i < this.mp; i++) {
            var p = particles[i];
            //Updating X and Y coordinates
            //We will add 1 to the cos function to prevent negative values which will lead flakes to move upwards
            //Every particle has its own density which can be used to make the downward movement different for each flake
            //Lets make it more random by adding in the radius
            p.y += d * (Math.cos(angle + p.d) + 1 + p.r / 2);
            p.x += d * Math.sin(angle) * 2;

            //Sending flakes back from the top when it exits
            //Lets make it a bit more organic and let flakes enter from the left and right also.
            if (p.x > W + 5 || p.x < -5 || p.y > H) {
                if (i % 3 > 0) //66.67% of the flakes
                {
                    particles[i] = { x: Math.random() * W, y: -10, r: p.r, d: p.d };
                }
                else {
                    //If the flake is exitting from the right
                    if (Math.sin(angle) > 0) {
                        //Enter from the left
                        particles[i] = { x: -5, y: Math.random() * H, r: p.r, d: p.d };
                    }
                    else {
                        //Enter from the right
                        particles[i] = { x: W + 5, y: Math.random() * H, r: p.r, d: p.d };
                    }					
                }
            }
        }
    }

});

var IceLayer = L.Class.extend({

    initialize: function () {
    },
	
	  addTo: function (map) {
            map.addLayer(this);
            return this;
        },

    onAdd: function (map) {
        this._map = map;

		return;
		rasterLayer.setOpacity(0.4);
		layer.setOpacity(0.4);
    },

    onRemove: function (map) {
		rasterLayer.setOpacity(1);
		layer.setOpacity(1);
    }
});



var snowLayer = new BigPointLayer();
snowLayer.addTo(map);

var iceLayer = new IceLayer();
//iceLayer.addTo(map);

var baseLayers = {
    "Raster": rasterLayer,
    "Vector (Winter)": vectorWinter,
    "Vector (Default)": vectorDefault
};
var overlays = {
	"Snow": snowLayer
//	"Ice": iceLayer
};
L.control.layers(baseLayers, overlays, { position: 'topleft' }).addTo(map);


updateScenario();