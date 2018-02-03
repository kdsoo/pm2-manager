var os = require('os');
var config = require('config');
var request = require('request');
var rl = require('read-last-lines');
var pm2 = require('pm2');
var PushBullet = require('pushbullet');
var apiKey = config.get("messaging.pushbullet.apikey");
var pusher = new PushBullet(apiKey);
var telegram_endpoint = "https://api.telegram.org/bot";
var telegram_apikey = config.get("messaging.telegram.apikey");
var telegram_admin = config.get("messaging.telegram.admin");
var allDevices = '';
var appLogHash = {};	// { pm_id: {id: pm_id, name: name, err_log: pm2_env.pm_err_log_path, out_log: pm_out_log_path}}

pm2.connect(function() {
	pm2.launchBus(function(err, bus) {
		console.log('[PM2] Log streaming started');
		getPushDevices(function(err, ret) {
			console.log("Get clients to be notified done");
			//pm2InitNotify(); // FIXME
		});

		bus.on("process:event", function(packet) {
			//console.log("error on: " + packet.process.name);
			//console.log("pm2 packet data: " + packet.data);
			//console.log("pm2 packet: " + JSON.stringify(packet));
			console.log(packet.process.pm_id + ": " + packet.process.name + ": " + packet.event);
			if (packet.event == "online") {
				pushMsg(packet, function(err, ret) {
					console.log(ret);
				});
			}
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
			appLogHash[app.pm_id] = {id: app.pm_id, name: app.name, out_log: app.pm2_env.pm_out_log_path, err_log: app.pm2_env.pm_err_log_path};
			/*
			pm2.describe(app.pm_id, function(err, desc) {
				console.log(desc);
			});
			*/
		});
	});
});

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

function pushMsg(packet, cb) {
	var host = os.hostname();
	var appid = packet.process.pm_id;
	var appname = packet.process.name;
	var event = packet.event;

	rl.read(appLogHash[appid].err_log, 10).then(function(log) {
		console.log(appLogHash[appid].err_log);
		var title = "service " + appname + " on " + host + " " + event;
		var message = appname + "(" + appid + "): " + event + " \n" + log;
		console.log("push message: " + message);
		// pushbullet
		pusher.note(allDevices, title, message, function(error, response) {
			if (error) {
				console.error('error: ' + error);
				cb(error, null);
			} else {
				console.log('res: ' + JSON.stringify(response));
				cb(null, response);
			}
		});
		// Telegram
		var telegram_push = telegram_endpoint + telegram_apikey + "/sendMessage?chat_id=" + telegram_admin + "&text=";
		request({url: telegram_push + title, rejectUnauthorized: false}, function(err, res, body) {
		});
	});
}

function pm2InitNotify() {
	var host = os.hostname();
	var title = "PM2 on " + host + " intialized";
	var message = title;
	console.log("push message: " + message);

	pusher.note(allDevices, title, message, function(error, response) {
		if (error) {
			console.error('error: ' + error);
		} else {
			console.log('res: ' + JSON.stringify(response));
		}
	});
	// Telegram
	var telegram_push = telegram_endpoint + telegram_apikey + "/sendMessage?chat_id=" + telegram_admin + "&text=";
	request({url: telegram_push + title, rejectUnauthorized: false}, function(err, res, body) {
	});

}
pusher.devices(function(error, response) {
	// response is the JSON response from the API
	//console.log(response);
});
pusher.me(function(err, response) {console.log(response);});

serviceEvent.on('pm2', function(msg) {
	if (!msg.res && msg.cmd) {
		var res = msg;
		switch (msg.cmd) {
			default:
				break;
		}
	}
});

