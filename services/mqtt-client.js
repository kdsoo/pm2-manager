var config = require('config');
var mqtt = require('mqtt');
if (process.env.CREDENTIAL) var credential = process.env.CREDENTIAL + '@'; else var credential = "";
var client  = mqtt.connect('mqtt://'+ credential + config.get("mqtt.server"));

var pm2Channel = config.get("mqtt.channel");

client.on('connect', function () {
	client.subscribe(pm2Channel, { qos: 1 }, function() {
		console.log('Subscription on ' + pm2Channel + ' done');
	});
});

client.on('disconnect', function() {
	console.error("Disconnected from mqtt server");
});

client.on('message', function (topic, message) {
	// message is Buffer
	switch (topic) {
		case pm2Channel:
			emitServiceEvent("pm2", message, false, function(ret) {});
			break;
		default:
			console.log(topic + ' case is not supported');
			break;
	}
});

// if no msg.res then its command, if msg.res resides its response
// msg = {cmd: String, arg: String}
// Supported cmd:
// - scan: scan services
// - gethosts: get hosts by service
serviceEvent.on('mqtt', function(msg) {
	// Service scan command
	if (!msg.res && msg.cmd) {
		switch (msg.cmd) {
			case "send":
				client.publish(pm2Channel, JSON.stringify(msg.payload));
				break;
			default:
				//console.error("mdns serviceEvent: " + msg.cmd + " is not supported event command");
				break;
		}
	}
});

