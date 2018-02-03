var config = require('config');
var os = require('os');

serviceEvent.on('ping', function(msg) {
	// Service ping
	if (!msg.res && msg.cmd) {
		var res = msg;
		switch (msg.cmd) {
			case "ping":
				if (msg.type == "hb-req") {
					msg.host = os.hostname();
					var message = {};
					message.cmd = "send";
					message.payload = msg;
					emitServiceEvent("mqtt", message, false, function(ret) {
					});
				}
				break;
			default:
				break;
		}
	}
});

serviceEvent.on('pm2', function(msg) {
	msg = JSON.parse(msg);
	// Service ping
	if (!msg.res && msg.cmd) {
		switch (msg.cmd) {
			case "ping":
				if (msg.type == "hb-res") {
					emitServiceEvent("ping", msg, false, function(ret) {
					});
				} else if (msg.type == "hb-req") {
					var message = {};
					message.cmd = "send";
					var payload = {};
					payload.cmd = "ping";
					payload.host = os.hostname();
					payload.type = "hb-res";
					payload.requestID = msg.requestID;
					message.payload = payload;
					emitServiceEvent("mqtt", message, false, function(ret) {
					});
				}
				break;
			default:
				break;
		}
	}
});

