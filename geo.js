"use strict";
var https = require('https'),
	Q = require('q'),
	places = require('./locations.js'),
	origin = escape(places.origin),
	addresses = places.destinations.split("|").map(escape),
	earthRadiusKilo = 6371,
	earthRadiusMiles = 3959,
	radius = {selected: "imperial", metric: {"label": "KM", "distance": earthRadiusKilo}, imperial: {"label": "miles", "distance": earthRadiusMiles}},
	promises = [];

fetchExternalData(origin).then(init);

function init(origin){
	promises = addresses.map(fetchExternalData);

	Q.all(promises).then(function(data){
		data.forEach(function(v,i,a){
			a[i].distanceFromOrigin = getDistances(origin, v);
		});

		data.sort(function(a,b){
			return a.distanceFromOrigin - b.distanceFromOrigin;
		});

		format(origin, data);
	});
}

function format(origin, output){
	process.stdout.write("All distances away from " + origin.formatted_address + " are in " + radius[radius.selected].label + ".\n" );
	output.forEach(function(v,i,a){
		process.stdout.write(v.formatted_address + " : " + v.distanceFromOrigin + "\n");
	});
}

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
		options = returnOptionsObj(address);

	var req = https.request(options, function(res) {
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
		deferred.reject(new Error("There was an error in the http request or responce"));
	});

	return deferred.promise;
}

function parse(data){
	var place = JSON.parse(data);

	return place.results[0];
}

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
	//return "The absolute distance between " + location1Obj.formatted_address + " and " + location2Obj.formatted_address + " is " + d.toFixed(0) + " " + RADIUS.label;
}

function toRad(deg) {
		return deg * Math.PI/180;
	}