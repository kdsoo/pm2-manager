var config = require('config');
var zookeeper = require('node-zookeeper-client');
var crypto = require('crypto');
//var clientOptions = { spinDelay : 3000, retries : 10 };
var zkAddr = config.get("zookeeper.server.addr");
var zkPort = config.get("zookeeper.server.port");
var clientOptions = {};
var client = zookeeper.createClient(zkAddr +":"+ zkPort, clientOptions);

function initClient() {
	client = zookeeper.createClient(zkAddr +":"+ zkPort, clientOptions);

	client.on('connected', function () {
		handleClientState(getClientState(client));
		broadcastServiceStatus();
		console.log('Connected to ZooKeeper.');
		console.log('Current state is: ', getClientState(client).name);

		zk_paths = [];
		zk_nodes = [];
		zk_node_data = {};

		addAuthAllClaim(client);

		watchNodeTree(client, config.get("zookeeper.namespace.zkroot"));
		watchNodeData(client, config.get("zookeeper.namespace.zkroot"));

		reclaiming = false;
	});

	client.on('disconnected', function () {
		broadcastServiceStatus();
		console.log('Disconnected from ZooKeeper.');
		console.log('Current state is: ', getClientState(client).name);
		handleClientState(getClientState(client));
	});

}

var clientLock = false;
function connectClient() {
	initClient();
	client.connect();
	clientLock = false;
}

function disconnectClient() {
	client.close();
}

connectClient();

function getClientState(client) {
	return client.getState();
}

function getParent(path, node) {
	var ret = null;
	var items = path.split("/").filter(function(item){return item;});
	if (items.length == 0) {
		return ret;
	} else {
		var index = items.indexOf(node);
		var item = items[index - 1];
		if (!item) item = "/";
		return item;
	}
}

function handleClientState(state) {
	var code = parseInt(state.code);
	switch(code) {
		case 0:
			console.log("DISCONNECTED");
			setServiceReady(false);
			if (clientLock == false) {
				clientLock = true;
				setTimeout(function() {
					console.log("Trying to reconnect (DISCONNECTED)");
					connectClient();
				}, 10 * 1000);
			}
			break;
		case 3:
			console.log("SYNC_CONNECTED");
			setServiceReady(true);
			break;
		case 4:
			console.log("AUTH_FAILED");
			break;
		case 5:
			console.log("CONNECTED_READ_ONLY");
			break;
		case 6:
			console.log("SASL_AUTHENTICATED");
			break;
		case -122:
			console.log("EXPIRED");
			reclaiming = true;
			disconnectClient();
			if (clientLock == false) {
				clientLock = true;
				setTimeout(function() {
					console.log("Trying to reconnect (EXPIRED)");
					connectClient();
				}, 10 * 1000);
			}
			break;
		default:
			console.log("Unknown client state");
			break;
	}
}

function eventWatchHandler(client, path, event) {
	switch (event) {
		case "NODE_CREATED":
			break;
		case "NODE_DELETED":
			break;
		case "NODE_DATA_CHANGED":
			break;
		case "NODE_CHILDREN_CHANGED":
			break;
		default:
			break;
	}
}

function nodeTYPE(type) {
	var ret = false;
	switch (type) {
		case "EPHEMERAL":
			ret = zookeeper.CreateMode.EPHEMERAL;
			break;
		case "EPHEMERAL_SEQUENTIAL":
			ret = zookeeper.CreateMode.EPHEMERAL_SEQUENTIAL;
			break;
		case "PERSISTENT":
			ret = zookeeper.CreateMode.PERSISTENT;
			break;
		case "PERSISTENT_SEQUENTIAL":
			ret = zookeeper.CreateMode.PERSISTENT_SEQUENTIAL;
			break;
		default:
			console.error(type, " is not supported node type");
			break;
	}
	return ret;
}

function notifyZKevent(event, caller) {
	var notimsg = {event: event.name, path: event.path}
	emitServiceEvent("zookeeper", {cmd:"NOTI", caller: caller, payload: notimsg}, false, function(ret) {});
}

// return path on success, false on failure
function createZNODE(client, parent, node, type, data, auth, cb) {
	client.exists(parent, function(e, stat) {
		if (e) {
			console.error(e);
			cb(e, null);
		} else if (stat) {
			type = nodeTYPE(type);
			var path = parent + "/" + node;
			client.create(path, new Buffer(data),type, function (err, path) {
				if (err) {
					if (err.getCode() == zookeeper.Exception.NODE_EXISTS) {
						console.log(parent + "/" + node, 'Node exists. Removing and try to recreate');
						// remove and recreate
						refreshZNODE(client, parent, node, type, data, function(e, r) {
							if (e) {
								console.error(e);
								cb(e, null);
							} else {
								cb(null, r);
							}
						});
					} else {
						console.log(err.stack);
						cb(err, null);
					}
				} else {
					console.log('Node: %s is created.', path);
					cb(null, path);
				}
			});
		} else {
			// parent node doesn't exist
			console.error("FAIL: createZNODE ", node, " doesn't have parent node ", parent);
			client.mkdirp(parent, nodeTYPE("PERSISTENT"), function (err, path) {
				if (err) {
					console.log(err.stack);
					cb(err, null);
				} else {
					if (auth) {
						console.log('Node: %s is created.', path, ' try to set auth');
						setAuth(client, parent, auth.method, auth.id, auth.passwd, function(e, r) {
							if (e) {
								console.error("createZNODE create parent error: ", e);
								cb(e, null);
							} else {
								console.log("setAuth on ", path, " done");
								createZNODE(client, parent, node, type, data, auth, function(e, p) {
									if (e) {
										cb(e, null);
									} else {
										addAuthAllClaim(client);
										cb(null, p);
									}
								});
							}
						});
					} else {
						console.log('Node: %s is created.', path);
						createZNODE(client, parent, node, type, data, auth, function(e, p) {
							if (e) {
								cb(e, null);
							} else {
								cb(null, p);
							}
						});
					}
				}
			});
			cb(null, false);
		}
	});
}

function createEPHEMERAL(client, parent, node, data, auth, cb) {
	createZNODE(client, parent, node, EPHEMERAL, auth, function(err, ret) {
		if (err) {
			cb(err, null);
		} else {
			cb(null, ret);
		}
	});
}

function removeZNODE(client, path, cb) {
	client.remove(path, -1, function(err) {
		if (err) {
			console.error(err);
			cb(err, null);
		} else {
			console.log(path, " removed");
			cb(null, true);
		}
	});
}

function updateZNODE(client, path, data, cb) {
	client.setData(path, new Buffer(data), -1, function(err, stat) {
		if (err) {
			console.error(err);
			cb(err, null);
		} else {
			console.log(path, data, " set successfully");
			cb(null, stat);
		}
	});
}

function refreshZNODE(client, parent, node, type, data, cb) {
	var path = parent + "/" + node;
	removeZNODE(client, path, function(e, r) {
		if (e) {
			cb(e, null);
		} else {
			client.create(path, new Buffer(data), type, function(err, path) {
				console.log("Recreating ", path, " successfully");
				cb(null, path);
			});
		}
	});
}

function setAuth(client, path, method, id, passwd, cb) {
	var key = crypto.createHash('sha1').update(id + ":" + passwd).digest().toString('base64');
	var cred = id + ":" + key;
	var acls = [new zookeeper.ACL(zookeeper.Permission.ALL, new zookeeper.Id(method, cred))];
	client.setACL(path, acls, -1, function (error, stat) {
		if (error) {
			console.log('Failed to set ACL: %s.', error);
			cb(error, null);
		} else {
			console.log('ACL is set to: %j', acls);
			cb(null, stat);
		}
	});
}

function addAuth(client, method, id, passwd) {
	var cred = id + ":" + passwd;
	client.addAuthInfo(method, new Buffer(cred));
}

function addAuthAllClaim(client) {
	var auth = config.get("zookeeper.auth");
	var authkeys = Object.keys(config.get("zookeeper.auth"));
	for (var i = 0; i < authkeys.length; i++) {
		var method = auth[authkeys[i]].method;
		var id = auth[authkeys[i]].id;
		var passwd = auth[authkeys[i]].passwd;
		addAuth(client, method, id, passwd);
	}
}

// returns true or auth method on auth success and null on fail
function addAuthOnPath(client, path, cb) {
	if (path === "/") {
		//console.log("Auth request on root ignored");
		cb(null, true);
	} else {
		console.log("addAuthOnPath try to getACL on : ", path);
		client.getACL(path, function(err, acls, stat) {
			if (err) {
				console.error("getACL error: ", err);
				cb(err, null);
			} else {
				var ret = null;
				for (var i = 0; i < acls.length; i++) {
					var items = Object.keys(acls[i]);
					if (items.indexOf("id") > -1) {
						var attrItems = Object.keys(acls[i]["id"]);
						var attr = acls[i]["id"];
						//console.log("addAuthOnPath: ", attrItems);
						if (attrItems.indexOf("scheme") > -1) {
							if (attr["scheme"] == "digest" && config.has("zookeeper.auth.digest.id")) {
								var id = attr["id"].split(":")[0];
								var auth = config.get("zookeeper.auth.digest");
								if (id == auth.id) {
									//console.log("digest credential: ", id);
									client.addAuthInfo("digest", new Buffer(auth));
									ret = "digest";
								}
							} else if (attr["scheme"] == "world") {
								var id = attr["id"].split(":")[0];
								//console.log("world credential: ", id);
								ret = "world";
							} else {
								console.log("Not supported auth");
							}
						}
					}
				}
				cb(null, ret);
			}
		});
	}
}

function listChildren(client, path, cb) {
	client.getChildren(path, function (event) {
		client.exists(path, function(err, stat) {
			if (err) {
				cb(err, null);
			} else if (stat) {
				console.log('Got listchildren watcher event: %s', event, " on ", path);
				listChildren(client, path, function(e, r) {
					if (e) cb(e, null);
					else cb(null, r);
				});
			} else cb(null, []);
		});
	}, function (error, children, stat) {
		if (error) {
			console.error('Failed to list children of %s due to: %s.', path, error);
			cb(error, null);
		} else {
			cb(null, children);
		}
	});
}

function listChildrenNowatch(client, path, cb) {
	client.getChildren(path, function (error, children, stat) {
		if (error) {
			console.error('Failed to list children of %s due to: %s.', path, error);
			cb(error, null);
		} else {
			cb(null, children);
		}
	});
}

function exists(client, path, cb) {
	client.exists(path, function (event) {
		console.log('Got exists event: %s.', event, " on ", path);
		exists(client, path, function(e, r) {
			if (e) cb(e, null);
			else cb(null, r);
		});
	}, function (error, stat) {
		if (error) {
			console.log('Failed to check existence of node: %s due to: %s.', path, error);
			cb(error, null);
		} else {
			if (stat) {
				console.log('Node: %s exists and its version is: %j', path, stat.version);
				cb(null, true);
			} else {
				console.log('Node %s does not exist.', path);
				cb(null, false);
			}
		}
	});
}

function getData(client, path) {
	if (!path) return;
	client.getData(path, function (event) {
		console.log('Got getdata event: %s', event, " on ", path);

		switch(event.name) {
			case "NODE_DELETED":
				if (zk_nodes.indexOf(event.path) > 0) {
					zk_nodes.splice(zk_nodes.indexOf(event.path), 1);
					rmNode(event.path);
					// console.log("managed nodes: ", zk_nodes);
				}
				var items = path.split("/").filter(function(item){return item;});
				var parent = "";
				for (var i = 0; i < items.length - 1; i++) {
					parent += "/" + items[i];
				}
				// console.log("parent of ", path, parent);
				getData(client, parent);

				// check if node deleted for refresh.
				setTimeout(function() {
					client.exists(path, function(e, stat) {
						if (e) {
							console.error(e);
							handleClientState(getClientState(client));
						} else if (stat) {
							// node refreshed. do not notify
						} else {
							// broadcast event
							if (reclaiming == false) {
								notifyZKevent(event, "getData");
							}
						}
					});
				}, 3000);
				break;
			case "NODE_DATA_CHANGED":
				getData(client, event.path);
				break;
			default:
				break;
		}
	}, function (error, data, stat) {
		if (error) {
			console.error('Error occurred when getting data: %s.', error);
			handleClientState(getClientState(client));
			return;
		}
		console.log('Node: %s has data: %s, version: %d', path, data ? data.toString() : undefined, stat.version);
		saveNode(path, data ? data.toString() : undefined, stat.version);

		client.getChildren(path, function(err, children, stat) {
			if (err) {
				console.error('Failed to list children of %s due to: %s.', path, error);
				handleClientState(getClientState(client));
			} else {
				console.log("Children nodes of ", path, children.length , children);
				for (var i = 0; i < children.length; i++) {
					if (path == "/") path = "";	// strip root
					var fullpath  = path + "/" + children[i];
					if (zk_nodes.indexOf(fullpath) < 0) {
						zk_nodes.push(fullpath);
						getData(client, fullpath);
						console.log("NODE: ", path), " added";
					}
				}
				if (children.length == 0) {
					//console.log("NODE: ", path);
				}
				//console.log("managed nodes: ", zk_nodes);
			}
		});
	});
}

var reclaiming = false;	// on expire
var zk_paths = [];
var zk_nodes = [];
var zk_node_data = {};
function getAllPaths(client) {
	return zk_paths;
}
module.exports.getAllPaths = getAllPaths;


var temp_paths = [];
function scanAllChildren(client, path) {
	client.getChildren(path, function (error, children, stat) {
		if (error) {
			console.error('Failed to list children of %s due to: %s.', path, error);
			handleClientState(getClientState(client));
		} else {
			console.log(path, children);
			for (var i = 0; i < children.length; i++) {
				if (path == "/") path = "";	// strip root
				var fullpath  = path + "/" + children[i];
				scanAllChildren(client, fullpath);
				temp_paths.push(fullpath);
			}
		}
	});
}

function getPaths(node, cb) {
	temp_paths = [];
	client.exists(node, function(err, stat) {
		if (err) {
			console.error(err);
			handleClientState(getClientState(client));
		} else if (stat) {
			temp_paths.push(node);
			scanAllChildren(client, node);
			setTimeout(function() {
				cb(null, temp_paths);
			}, 1000);
		} else cb(null, temp_paths);
	});
}
module.exports.getPaths = getPaths;

function saveNode(node, data, version) {
	try {
		data = JSON.parse(data);
	} catch(e) {
		// console.error(e);
	}
	zk_node_data[node] = {node: node, data: data, version: version};
}

function getNode(node) {
	return zk_node_data[node];
}
module.exports.getNode = getNode;

function rmNode(node) {
	delete zk_node_data[node];
}

function watchNodeTree(client, path) {
	client.getChildren(path, function (event) {
		console.log(event);
		switch (event.name) {
			case "NODE_CHILDREN_CHANGED":
				watchNodeTree(client, event.path);
				watchNodeData(client, event.path);
				break;
			case "NODE_DELETED":
				if (zk_paths.indexOf(event.path) > 0) {
					zk_paths.splice(zk_paths.indexOf(event.path), 1);
					// console.log("managed paths: ", zk_paths);
				}
				/*
				 * getData also notifies. comment out redundant noti
				// check if node deleted for refresh.
				setTimeout(function() {
				client.exists(path, function(e, stat) {
				if (e) {
				console.error(e);
				} else if (stat) {
				// node refreshed. do not notify
				} else {
				notifyZKevent(event, "watchNodeTree");
				}
				});
				}, 3000);
				*/
				break;
			default:
				break;
		}
	}, function (error, children, stat) {
		if (error) {
			console.error('Failed to list children of %s due to: %s.', path, error);
			handleClientState(getClientState(client));
		} else {
			console.log("watch path: ", path);
			for (var i = 0; i < children.length; i++) {
				if (path == "/") path = "";	// strip root
				var fullpath  = path + "/" + children[i];
				if (zk_paths.indexOf(fullpath) < 0) {
					zk_paths.push(fullpath);
					watchNodeTree(client, fullpath);
				}
			}
			if (children.length == 0) {
				console.log("PATH: ", path);
			}
			// console.log("managed paths: ", zk_paths);
		}
	});
}

function watchNodeData(client, path) {
	console.log("watchNodeData watch ", path);
	getData(client, path);
}

var ServiceReady = false;
function setServiceReady(param) {
	ServiceReady = param;
}

function isServiceReady() {
	return ServiceReady;
}

var StatusNotiTimer = false;
function broadcastServiceStatus() {
	if (!StatusNotiTimer || isServiceReady()) {
		var msg = {cmd: "STATUS", payload: {cmd: "notify", status: isServiceReady()}};
		emitServiceEvent("zookeeper", msg, false, function(ret) {});
		StatusNotiTimer = setTimeout(function() {
			StatusNotiTimer = false;
		}, 5 * 60 * 1000); // 5 min buffer time
	}
}

// msg: {cmd:"", payload: {parent: parent, node: node, type: type, data: data}, }
serviceEvent.on('zookeeper', function(msg) {
	try {
		if (typeof(msg) == "string") msg = JSON.parse(msg);

		if (!msg.res && msg.cmd) {
			var res = msg;
			switch (msg.cmd) {
				case "STATUS":
					if (msg.payload.cmd == "query") {
						var isReady = isServiceReady();
						res.res = {status: isReady};
						emitServiceEvent("zookeeper-" + msg.requestID, res, false, function(ret) {});
					}
					break;
				case "CREATE":
					var parent = msg.payload.parent;
					var node = msg.payload.node;
					var type = msg.payload.type;
					var data = JSON.stringify(msg.payload.data);
					var auth = msg.payload.auth;
					createZNODE(client, parent, node, type, data, auth, function(e, r) {
						if (e) {
							console.error(e);
							handleClientState(getClientState(client));
						} else {
							console.log(r);
						}
					});
					break;
				case "GET":
					break;
				case "SET":
					break;
				case "REMOVE":
					break;
				case "NOTI":
					break;
				default:
					break;
			}
		}
	} catch(e) {
		console.error(e);
		handleClientState(getClientState(client));
	}
});
