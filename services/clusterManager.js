var config = require('config');
var os = require('os');
var ip = require('ip');
var gen = require('../helper/generator');
var platform = require('../helper/platform');

function getHostname(path) {
	var ret = "";
	var paths = path.split("/").filter(function(item) {return item});
	if (paths.length > 0) {
		ret = paths[paths.length -1];
		ret = ret.split(":")[0];
	} else {
		ret = "/";
	}
	return ret;
}

// { cmd: 'NOTI',
//   caller: 'getData',
//     payload: { event: 'NODE_DELETED', path: '/seahaven-pm2/hosts/kdsoo-pc2' },
//       requestID: 'request-1521874807793' }
serviceEvent.on('zookeeper', function(msg) {
	try {
		if (typeof(msg) == "string") msg = JSON.parse(msg);

		if (!msg.res && msg.cmd) {
			switch (msg.cmd) {
				case "STATUS":
					if (msg.payload.cmd == "notify") {
						if (msg.payload.status == true) {
							console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
							console.log("CONNECTED to zookeeper");
							console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
						} else if (msg.payload.status == false) {
							console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
							console.log("DISCONNECTED from zookeeper");
							console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
							if (config.has("zookeeper.notify")) {
								var title = " Cluster coordinator is down (" + os.hostname() + " reporting)";
								var Msg = {cmd:"PUSH", payload: {target: "ALL", title: title, msg: title}};
								emitServiceEvent("messaging",  Msg, false, function(ret) {});
							}
						}
					}
					break;
				case "CREATE":
					break;
				case "GET":
					break;
				case "SET":
					break;
				case "REMOVE":
					break;
				case "NOTI":
					if (msg.payload.event == "NODE_DELETED") {
						if (config.has("zookeeper.notify")) {
							var title = getHostname(msg.payload.path) + " host is down(" + os.hostname() + " reporting)";
							var Msg = {cmd:"PUSH", payload: {target: "ALL", title: title, msg: title}};
							emitServiceEvent("messaging",  Msg, false, function(ret) {});
						}
					}
					break;
				default:
					break;
			}
		}
	} catch(e) {
		console.error(e);
	}
});

var waitZK = setInterval(function() {
	var serviceMsg = {cmd: "STATUS", payload: {cmd: "query"}};
	emitServiceEvent("zookeeper", serviceMsg, true, function(ret) {
		if (ret.res.status == true) {
			console.log("Zookeeper ready");
			clearInterval(waitZK);
			prepareClusterNamespace();
			setTimeout(function() {
				joinCluster();
			}, 1000);
		}
	});
}, 1000);

function prepareClusterNamespace() {
	var serviceMsg = {cmd: "CREATE"
		, payload: {
			parent: config.get("zookeeper.namespace.cluster")
			, node: "hosts"
			, type: "PERSISTENT"
			, data: "Cluster hosts registry namespace"
			, auth: {
				method: config.get("zookeeper.auth.cluster.method")
				, id: config.get("zookeeper.auth.cluster.id")
				, passwd: config.get("zookeeper.auth.cluster.passwd")
			}
		}
	};
	emitServiceEvent("zookeeper", serviceMsg, false, function(ret) {});
}

function joinCluster() {
	emitServiceEvent("pm2", {cmd: "list"}, true, function(ret) {
		var numServices = ret.res.length;
		platform.getVersion(function(ver) {
			var data = gen.hostDATA();
			data.mac = gen.getMacAddr(ip.address());
			data.uuid = gen.getHostUUID(os.hostname(), gen.getMacAddr(ip.address()));
			data.registered = new Date();
			data.version = ver;
			data.numservices = numServices;

			var serviceMsg = {cmd: "CREATE"
				, payload: {
					parent: config.get("zookeeper.namespace.cluster_hosts")
			, node: gen.hostUUID()
			, type: "EPHEMERAL"
			, data: data
				}
			};
			setTimeout(function() {
				emitServiceEvent("zookeeper", serviceMsg, false, function(ret) {});
			}, 3000);
		});
	});
}
