var os = require('os');
var config = require('config');
var pm2 = require('pm2');
var PushBullet = require('pushbullet');
var apiKey = config.get("messaging.pushbullet.apikey");
var pusher = new PushBullet(apiKey);
var allDevices = '';

pm2.connect(function() {
	pm2.launchBus(function(err, bus) {
		console.log('[PM2] Log streaming started');

		bus.on("process:event", function(packet) {
			//console.log("error on: " + packet.process.name);
			//console.log("pm2 packet data: " + packet.data);
			//console.log("pm2 packet: " + JSON.stringify(packet));
			console.log(packet);
			console.log(packet.process.pm_id + ": " + packet.process.name + ": " + packet.event);
		});

		/*
		//bus.on("log:err", function(packet) {
		bus.on("log:out", function(packet) {
			//console.log("error on: " + packet.process.name);
			//console.log("pm2 packet data: " + packet.data);
			//console.log("pm2 packet: " + JSON.stringify(packet));
			//console.log("app id: " + packet.process.pm_id);
			console.log(packet);
		});
		*/
	});

	pm2.list(function(err, list) {
		list.forEach(function(app, i) {
			//console.log(app.pid + ", " + app.name);
			pm2.describe(app.name, function(err, desc) {
				//console.log(desc);
			});
		});
	});
});

function getPushDevices() {
	pusher.devices(function(error, response) {
		// response is the JSON response from the API
		console.log(response);
		allDevices = response.devices;

	});
}

function pushMsg(packet) {
	var host = os.hostname();
	var appid = packet.process.pm_id;
	var appname = packet.process.name;
	var event = packet.event;

	var title = "service on " + host + " " + event;
	var message = appname + "(" + appid + "): " + event;
	pusher.note(allDevices, title, message, function(error, response) {
		if (error) console.error('error: ' + error);
		console.log('res: ' + JSON.stringify(response));
	});
}

pusher.devices(function(error, response) {
	// response is the JSON response from the API
	//console.log(response);
});
pusher.me(function(err, response) {console.log(response);});
