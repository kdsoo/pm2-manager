var express = require('express');
var router = express.Router();
var os = require('os');
var platform = require('../helper/platform');
var messaging = require('../services/messaging');

/* GET home page. */
router.get('/', function(req, res, next) {
	res.json({endpoint: "system control"});
});

router.get('/version', function(req, res, next) {
	platform.getVersion(function(ver) {
		res.json(ver);
	});
});

router.get('/upgrade', function(req, res, next) {
	platform.gitPull(function(err, ret) {
		if (err) {
			// Error occured upgrading service. notify user
			console.error("pm2 manager upgrade error " + err);
			messaging.pushToAll("pm2 manager upgrade error on " + os.hostname(), err);
			res.status(503);
			res.send(err);
		} else {
			if (ret == true) {
				// code update exists. restart pm2 monitoring service
				console.log("Service upgrade done");
				platform.npmInstall(function(err, ret) {
					if (err) {
						console.error("pm2 manager npm install error " + err);
						messaging.pushToAll("pm2 manager npm install error on " + os.hostname(), err);
					}
					console.log("pm2 manager upgrade & npm install done");
					process.exit();
				});
			}
			res.send(ret);
		}
	});
});

router.get('/upgrade/all', function(req, res, next) {
	var msg = {cmd: "send", payload: {cmd: "upgrade", target: "all", claim: os.hostname()}};
	emitServiceEvent("mqtt", msg, false, function(ret) {
		res.send("SeaHaven pm2 manager service upgrade triggered");
	});
});

router.get('/service/list', function(req, res, next) {
	var command = {cmd: "list"};
	emitServiceEvent("pm2", command, true, function(ret) {
		var arr = ret.res;
		var list = {total: arr.length, services: []};
		for (var i = 0; i < arr.length; i++) {
			list.services.push({pm_id: arr[i].pm_id, name: arr[i].name});
		}
		res.json(list);
	});
});

module.exports = router;
