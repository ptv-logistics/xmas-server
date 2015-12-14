if (!token)
    alert("you need an xServer internet token to run this sample!");

var hour = moment('2015-08-17T18:30:00+02:00');
var enableSpeedPatterns = true;
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


var attribution = '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM';

// create a separate pane for the xmap labels, so they are displayed on top of the route line
// http://bl.ocks.org/rsudekum/5431771
map._panes.labelPane = map._createPane('leaflet-top-pane', map.getPanes().shadowPane);

map.setView([0, 0], 0);

var replay = function () {
    if($('#replaySpeed option:selected').val())
        replaySpeed = $('#replaySpeed option:selected').val();
    doLoop = $('#doLoop').is(':checked');
    buildD3Animations(responses, replaySpeed, doLoop);
}

var getLayers = function (profile) {
    //add tile layer
    var bgLayer = new L.PtvLayer.FeatureLayerBg("https://api-eu-test.cloud.ptvgroup.com", {
        token: token,
        attribution: attribution,
        profile: profile + "-bg",
        beforeSend2: function (request) {
            request.mapParams.referenceTime = hour.format();
            request.callerContext.properties.push({ "key": "ProfileXMLSnippet", "value": '<Profile xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><FeatureLayer majorVersion="1" minorVersion="0"><GlobalSettings enableTimeDependency="true"/></FeatureLayer></Profile>' });
        }
    });

    //add fg layer
    var fgLayer = new L.PtvLayer.FeatureLayerFg("https://api-eu-test.cloud.ptvgroup.com", {
        token: token,
        attribution: attribution,
        profile: profile + "-fg",
        pane: map._panes.labelPane,
        beforeSend2: function (request) {
            request.mapParams.referenceTime = hour.format();

			// include time domain for incidents
            if (incidents.visible)
                request.callerContext.properties.push({ "key": "ProfileXMLSnippet", "value": '<Profile xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><FeatureLayer majorVersion="1" minorVersion="0"><GlobalSettings enableTimeDependency="true"/><Themes><Theme id="PTV_TrafficIncidents" enabled="true"><FeatureDescription includeTimeDomain="true" /></Theme></Themes></FeatureLayer></Profile>' });

        }
    });

    return L.layerGroup([bgLayer, fgLayer]);
}

var getLayer = function (profile) {
    return L.tileLayer('http://api{s}-xstwo.cloud.ptvgroup.com/services/rs/XMap/2.0/map/{z}/{x}/{y}/' + profile, {
        attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
        maxZoom: 19,
        subdomains: '1234'
    });
}

getLayer("silkysand").addTo(map),


//var incidents = new L.PtvLayer.FeatureLayer({ name: 'PTV_TrafficIncidents' }).addTo(map);
//var speedPatterns = new L.PtvLayer.FeatureLayer({ name: 'PTV_SpeedPatterns' }).addTo(map);
//var restrictionZones = new L.PtvLayer.FeatureLayer({ name: 'PTV_RestrictionZones' }).addTo(map);
//var truckAttributes = new L.PtvLayer.FeatureLayer({ name: 'PTV_TruckAttributes' }); //.addTo(map);
//var preferredRoutes = new L.PtvLayer.FeatureLayer({ name: 'PTV_PreferredRoutes' }).addTo(map);

//var baseLayers = {
//    "PTV classic": getLayers("ajax"),
//    "PTV sandbox": getLayers("sandbox"),
//    "PTV silkysand": getLayers("silkysand"),
//    "PTV gravelpit": getLayers("gravelpit").addTo(map)
//};

//L.control.layers(baseLayers, {
//    "Incidents": incidents,
//    "Truck Attributes": truckAttributes,
//    "Restriction Zones": restrictionZones,
//    "Speed Patterns": speedPatterns
//}, { position: 'topleft' }).addTo(map);

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
sidebar.open("home");

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

    if (refreshFeatureLayer || setTimeNow) {
        speedPatterns.redraw();
        //        incidents.redraw();
    }

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
            replaySpeed = responses[0].info.time / 25;
            $('#replaySpeed').val(replaySpeed);
            replay();
        }
    }),
    formatter: new L.Routing.Formatter({roundingSensitivity: 1000}),
    routeWhileDragging: false,
    routeDragInterval: 1000
}).addTo(map);

routingControl.on('routingerror', function (e) {
    alert(e.error.responseJSON.errorMessage);
});

var BigPointLayer = L.CanvasLayer.extend({
    particles: [],
    mp: 100, //max particles
    onAdd: function (map) {
        L.CanvasLayer.prototype.onAdd.call(this, map);

        var canvas = this.getCanvas();
        var W = canvas.width;
        var H = canvas.height;

        //animation loop
        setInterval(this.render, 33);

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

    render: function () {
        var canvas = this.getCanvas();
        var ctx = canvas.getContext('2d');

        // clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "rgba(0,0,255, 0.90)";
        ctx.beginPath();
        for (var i = 0; i < this.mp; i++) {
            var p = this.particles[i];
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, p.r+1, 0, Math.PI * 2, true);
//            ctx.stroke();
        }
        ctx.fill();
        ctx.fillStyle = "rgba(200, 200, 255, 1)";
        ctx.beginPath();
        for (var i = 0; i < this.mp; i++) {
            var p = this.particles[i];
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
            //            ctx.stroke();
        }
        ctx.fill();

        this.update();
        this.redraw();

    },

    //Function to move the snowflakes
    //angle will be an ongoing incremental flag. Sin and Cos functions will be applied to it to create vertical and horizontal movements of the flakes
    angle: 0,

    update: function () {
        var particles = this.particles;
        var canvas = this.getCanvas();
        var W = canvas.width;
        var H = canvas.height;

        this.angle += 0.01;
        for (var i = 0; i < this.mp; i++) {
            var p = particles[i];
            //Updating X and Y coordinates
            //We will add 1 to the cos function to prevent negative values which will lead flakes to move upwards
            //Every particle has its own density which can be used to make the downward movement different for each flake
            //Lets make it more random by adding in the radius
            p.y += Math.cos(this.angle + p.d) + 1 + p.r / 2;
            p.x += Math.sin(this.angle) * 2;

            //Sending flakes back from the top when it exits
            //Lets make it a bit more organic and let flakes enter from the left and right also.
            if (p.x > W + 5 || p.x < -5 || p.y > H) {
                if (i % 3 > 0) //66.67% of the flakes
                {
                    particles[i] = { x: Math.random() * W, y: -10, r: p.r, d: p.d };
                }
                else {
                    //If the flake is exitting from the right
                    if (Math.sin(this.angle) > 0) {
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


var layer = new BigPointLayer();
layer.addTo(map);

var filter = "brightness(120%)";
map.getPanes().tilePane.style.webkitFilter = filter;
map.getPanes().tilePane.style.filter = filter;

updateScenario();