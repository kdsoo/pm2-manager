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
			var title = "pm2 manager upgrade error on " + os.hostname();
			var Msg = {cmd:"PUSH", payload: {target: "ALL", title: title, msg: err}};
			emitServiceEvent("messaging",  Msg, false, function(ret) {});

			res.status(503);
			res.send(err);
		} else {
			if (ret == true) {
				// code update exists. restart pm2 monitoring service
				console.log("Service upgrade done");
				platform.npmInstall(function(err, ret) {
					if (err) {
						console.error("pm2 manager npm install error " + err);
						var title = "pm2 manager npm install error on " + os.hostname();
						var Msg = {cmd:"PUSH", payload: {target: "ALL", title: title, msg: err}};
						emitServiceEvent("messaging",  Msg, false, function(ret) {});
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

router.get('/restart', function(req, res, next) {
	process.exit();
});

router.get('/restart/all', function(req, res, next) {
	var msg = {cmd: "send", payload: {cmd: "restart", target: "all", claim: os.hostname()}};
	emitServiceEvent("mqtt", msg, false, function(ret) {
		res.send("SeaHaven pm2 manager service restart triggered");
	});
});

router.get('/notify', function(req, res, next) {
	var noti = {notification: globalNotify};
	res.json(noti);
});

router.post('/notify/:toggle', function(req, res, next) {
	var toggle = req.params.toggle;
	var status = 503;
	var ret = {ok: false};
	if (toggle === "true" || toggle === "false") {
		globalNotify = toggle;
		ret.ok = true;
	}
	console.log("/notify toggle", toggle);
	res.status(status);
	res.json(ret);
});

router.get('/notify/:toggle/all', function(req, res, next) {
	var toggle = req.params.toggle;
	var msg = {cmd: "send", payload: {cmd: "notify", target: "all", toggle: toggle, claim: os.hostname()}};
	emitServiceEvent("mqtt", msg, false, function(ret) {
		res.send("SeaHaven pm2 manager notify toggle triggered");
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
