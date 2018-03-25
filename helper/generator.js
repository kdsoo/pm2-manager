var os = require('os');
var crypto = require('crypto');
var ip = require('ip');
var uuid = require('uuid-1345');

function randB64 (len) {
	return crypto.randomBytes(Math.ceil(len * 3 / 4))
		.toString('base64')
		.slice(0, len)
		.replace(/\+/g, '0')
		.replace(/\//g, '0');
}
module.exports.randB64 = randB64;

function getRequestID() {
	return "request-" + new Date().getTime();
}
module.exports.getRequestID = getRequestID;

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
module.exports.getMacAddr = getMacAddr;

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
module.exports.getHostUUID = getHostUUID;

function hostUUID() {
	return os.hostname() + ":" + getHostUUID(os.hostname(), getMacAddr(ip.address()));
}
module.exports.hostUUID = hostUUID;

function hostDATA() {
	return {hostname: os.hostname(), ip: ip.address()};
}
module.exports.hostDATA = hostDATA;
// getHostUUID(os.hostname(), getMacAddr(ip.address()))
