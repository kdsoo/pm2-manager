var config = require('config');
var os = require('os');
var ip = require('ip');
var uuid = require('uuid-1345');
var platform = require('../helper/platform');
var messaging = require('./messaging');

var netif = os.networkInterfaces();
var netifNames = Object.keys(netif);

var HBserviceTimer = null;
var HBhostTimer = {};
var HBinterval = 1 * 60 * 1000;	// 60 sec
var HBhostInterval = HBinterval + 10 * 1000;	// 70sec

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

function startHBservice() {
	if (!HBserviceTimer) {
		HBserviceTimer = setInterval(function() {
			emitServiceEvent("ping", {cmd: "ping", type: "hb-req"}, false, function(ret) {});
			console.log("ping");
			console.log(HBhostTimer);
		}, HBinterval);
		console.log("#########################");
		console.log("HeartBeat service started");
		console.log("#########################");
	}
}

function stopHBservice() {
	if (HBserviceTimer) {
		clearInterval(HBserviceTimer);
		HBserviceTimer = null;
		console.log("#########################");
		console.log("HeartBeat service stoped");
		console.log("#########################");
	}
}

function refreshTimer(msg) {
	var id = msg.uuid;
	var hostname = msg.host;
	var report = "host " + hostname + " is down";
	if (HBhostTimer[id]) {
		rmTimer(msg);;
	}
	HBhostTimer[id] = setTimeout(function() {
		// alert dead host
		messaging.pushToAll(report, report);
		delete HBhostTimer[id];
	}, HBhostInterval);
}

function rmTimer(msg) {
	var id = msg.uuid;
	if (HBhostTimer[id]) {
		clearTimeout(HBhostTimer[id]);
		delete HBhostTimer[id];
	} else {
		console.error("timer " + id + " doesn't exists");
	}
}

serviceEvent.on('ping', function(msg) {
	// Service ping
	if (!msg.res && msg.cmd) {
		var res = msg;
		switch (msg.cmd) {
			case "start":
				startHBservice();
				break;
			case "stop":
				stopHBservice();
				break;
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
					emitServiceEvent("ping", msg, false, function(ret) {});
					refreshTimer(msg);
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
						emitServiceEvent("mqtt", message, false, function(ret) {});
					});
				}
				break;
			default:
				break;
		}
	}
});

