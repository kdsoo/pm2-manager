var os = require('os');
var config = require('config');
var request = require('request');
var pm2 = require('pm2');
var rl = require('read-last-lines');

var appLogHash = {};	// { pm_id: {id: pm_id, name: name, err_log: pm2_env.pm_err_log_path, out_log: pm_out_log_path}}

pm2.connect(function() {
	pm2.launchBus(function(err, bus) {
		console.log('[PM2] Log streaming started');
		pm2InitNotify();

		bus.on("process:event", function(packet) {
			console.log(packet.process.pm_id + ": " + packet.process.name + ": " + packet.event);
			if (packet.event == "online") {
				pushMsg(packet);
			}
		});

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

	// backup pm2 process list to ~/.pm2/dump.pm2 periodically
	setInterval(function() {
		pm2.dump(function(err, ret) {
			if (err) {
				console.error("pm2 dump error");
				console.error(err);
			} else {
				console.log("pm2 dump succeed");
				console.log(ret);
			}
		});
	}, 1 * 60 * 60 * 1000);	// 1 hour for default

	serviceEvent.on('pm2', function(msg) {
		try {
			if (typeof(msg) == "string") msg = JSON.parse(msg);
			if (!msg.res && msg.cmd) {
				var res = msg;
				switch (msg.cmd) {
					case "list":
						pm2.list(function(err, list) {
							if (err) {
								consnole.error(err);
								res.res = err;
							} else {
								res.res = list;
							}
							serviceEvent.emit("pm2-" + msg.requestID, msg);
						});
						break;
					default:
						break;
				}
			}
		} catch(e) {
			console.error(e);
		}
	});
});

function pushMsg(packet) {
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
		var pushbulletMsg = {cmd:"PUSH", payload: {target: "PUSHBULLET", title: title, msg: message}};
		emitServiceEvent("messaging",  pushbulletMsg, false, function(ret) {});
		// Telegram
		var telegramMsg = {cmd:"PUSH", payload: {target: "TELEGRAM", title: title, msg: message}};
		emitServiceEvent("messaging",  telegramMsg, false, function(ret) {});
	});
}

function pm2InitNotify() {
	var host = os.hostname();
	var title = "PM2 on " + host + " intialized";
	var message = title;
	console.log("push message: " + message);

	// pushbullet
	var pushbulletMsg = {cmd:"PUSH", payload: {target: "PUSHBULLET", title: title, msg: message}};
	emitServiceEvent("messaging",  pushbulletMsg, false, function(ret) {});
	// Telegram
	var telegramMsg = {cmd:"PUSH", payload: {target: "TELEGRAM", title: title, msg: message}};
	emitServiceEvent("messaging",  telegramMsg, false, function(ret) {});
}

