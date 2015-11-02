"use strict";
var https = require('https'), 
	// promis library
	Q = require('q'),
	// array of locations
	places = require('./locations.js'),
	// location to calculate all distances from
	origin = escape(places.origin),
	// parse addresses from destinations
	addresses = places.destinations.split("|").map(escape),
	earthRadiusKilo = 6371,
	earthRadiusMiles = 3959,
	// radius is a constant used for determining distance. can be either kilometers or miles
	radius = {selected: "imperial", metric: {"label": "KM", "distance": earthRadiusKilo}, imperial: {"label": "miles", "distance": earthRadiusMiles}},
	promises = [];

// first fetch the location data on the origin address
fetchExternalData(origin).then(init);

function init(origin){
	// fetch alll the location data on the places array
	promises = addresses.map(fetchExternalData);

	// when all locations have resulved
	Q.all(promises).then(function(data){

		// calculate distance from origin location for each place
		data.forEach(function(v,i,a){
			a[i].distanceFromOrigin = getDistances(origin, v);
		});

		// sort in ascending order
		data.sort(function(a,b){
			return a.distanceFromOrigin - b.distanceFromOrigin;
		});

		// make it pretty
		format(origin, data);
	});
}

function format(origin, output){
	process.stdout.write("All distances away from " + origin.formatted_address + " are in " + radius[radius.selected].label + ".\n" );
	output.forEach(function(v,i,a){
		process.stdout.write(v.formatted_address + " : " + v.distanceFromOrigin + "\n");
	});
}

// hardcoded config variables
// I would not do this for a production system. Its just a quick hack for this exercise.
function returnOptionsObj(address){
	var options = {
		hostname: 'maps.googleapis.com',
		path: '/maps/api/geocode/json?address='+ address +'&key=AIzaSyBy3Nw5AtljyKxGFc36iXjksBq98MpIPv8',
		method: 'GET'
	};

	return options;
}

function fetchExternalData(address){
	var deferred = Q.defer(),
		options = returnOptionsObj(address),
		req = https.request(options, function(res) {
			var data = "";

			res.on('data', function(chunk) {
				data += chunk;
			});

			res.on('end', function(){
				deferred.resolve(parse(data));
			})
		});

	req.end();

	req.on('error', function(e) {
		deferred.reject(new Error("There was an error in the http request or response"));
	});

	return deferred.promise;
}

// parse string into JSON
function parse(data){
	try {
	 var place = JSON.parse(data);
	 return place.results[0];
	} catch(e){
		new Error("The data did not parse as JSON");
	}

	return false;
}

// calculated the distance between to options on the earth (sphere)
// I did not write this. It was found.
function getDistances(location1Obj, location2Obj){
	var RADIUS = radius[radius.selected],
		location1 = location1Obj.geometry.location,
		location2 = location2Obj.geometry.location,
		dLat = toRad(location2.lat - location1.lat),
		dLon = toRad(location2.lng - location1.lng),
		dLat1 = toRad(location1.lat),
		dLat2 = toRad(location2.lat),
		a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(dLat1) * Math.cos(dLat1) * Math.sin(dLon/2) * Math.sin(dLon/2),
		c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)),
		distance = RADIUS.distance * c;

	return distance.toFixed(0);
}

// degrees to radians
function toRad(deg) {
	return deg * Math.PI/180;
}