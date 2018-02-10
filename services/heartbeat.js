var config = require('config');
var os = require('os');
var ip = require('ip');
var uuid = require('uuid-1345');
var platform = require('../helper/platform');

var netif = os.networkInterfaces();
var netifNames = Object.keys(netif);

function getMacAddr(addr) {
	var ret = false;
	for (var i = 0; i < netifNames.length; i++) {
		var addrs = netif[netifNames[i]];
		for (var l = 0; l < addrs.length; l++) {
			if (addrs[l].address == addr) {
				ret = addrs[l].mac;
			}
		}
	}
	console.log("MAC: " + ret);
	return ret;
}

function getHostUUID(hostname, mac) {
	var v3 = uuid.v3({
		namespace: uuid.namespace.oid,
			name: "seahaven:host"
	});
	var data = { namespace: v3, name: hostname + mac };
	var result = uuid.v5(data);
	console.log("HOST UUID: " + result);
	return result;
}

serviceEvent.on('ping', function(msg) {
	// Service ping
	if (!msg.res && msg.cmd) {
		var res = msg;
		switch (msg.cmd) {
			case "ping":
				if (msg.type == "hb-req") {
					msg.uuid = getHostUUID(os.hostname(), getMacAddr(ip.address()));
					msg.host = os.hostname();
					msg.addr = ip.address();
					msg.mac = getMacAddr(ip.address());
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
					platform.getVersion(function(ver) {
						var message = {};
						message.cmd = "send";
						var payload = {};
						payload.cmd = "ping";
						payload.uuid = getHostUUID(os.hostname(), getMacAddr(ip.address()));
						payload.host = os.hostname();
						payload.addr = ip.address();
						payload.mac = getMacAddr(ip.address());
						payload.uptime = platform.serviceUptimeSync();
						payload.type = "hb-res";
						payload.requestID = msg.requestID;
						payload.version = ver;
						message.payload = payload;
						emitServiceEvent("mqtt", message, false, function(ret) {
						});
					});
				}
				break;
			default:
				break;
		}
	}
});

