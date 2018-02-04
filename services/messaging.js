var config = require('config');
var os = require('os');
var request = require('request');
var PushBullet = require('pushbullet');
var apiKey = config.get("messaging.pushbullet.apikey");
var pusher = new PushBullet(apiKey);
var telegram_endpoint = "https://api.telegram.org/bot";
var telegram_apikey = config.get("messaging.telegram.apikey");
var telegram_admin = config.get("messaging.telegram.admin");
var allDevices = '';

function getPushDevices(cb) {
	pusher.devices(function(error, response) {
		if (error) {
			cb(error, null);
		} else {
			response.devices.forEach(function(d, i) {
				console.log("pushbullet registered devices: " + d.nickname);
			});
			allDevices = response.devices;
			cb(null, response);
		}
	});
}
module.exports.getPushDevices = getPushDevices;

function sendPushbullet(dev, title, message, cb) {
	pusher.note(allDevices, title, message, function(error, response) {
		cb(error, response);
	});
}
module.exports.sendPushbullet = sendPushbullet;

function sendTelegram(msg, cb) {
	var telegram_push = telegram_endpoint + telegram_apikey + "/sendMessage?chat_id=" + telegram_admin + "&text=";
	request({url: telegram_push + msg, rejectUnauthorized: false}, function(err, res, body) {	});
}
module.exports.sendTelegram = sendTelegram;

pusher.devices(function(error, response) {
	// response is the JSON response from the API
	//console.log(response);
});
pusher.me(function(err, response) {console.log(response);});

function pushToAll(title, msg) {
	// pushbullet
	sendPushbullet(allDevices, title, msg, function(error, response) {
		if (error) {
			console.error('error: ' + error);
		} else {
			console.log('res: ' + JSON.stringify(response));
		}
	});
	// Telegram
	sendTelegram(title, function(err, res, body) {
	});
}
module.exports.pushToAll = pushToAll;
