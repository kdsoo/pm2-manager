var express = require('express');
var router = express.Router();
var zk = require('../services/zookeeper');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/hosts', function(req, res, next) {
  res.render('ping', { title: 'Service deployment status' });
});

// HB protocol pipeline
// router:Event:ping, type:hb-req => hb:Event:mqtt, type:hb-req => mqtt publish
// => mqtt listener:Event:pm2, type:hb-res => hb:Event:ping, type:hb-res
// => app:websocket:ping
router.post('/status', function(req, res, next) {
	emitServiceEvent("ping", {cmd: "ping", type: "hb-req"}, false, function(ret) {
		console.log("status post request");
	});
	res.send("ok");
});

var aliveHosts = 0;
var aliveHostArr = [];
var aliveTimer = null;

function refreshAliveHosts(msg) {
	clearTimeout(aliveTimer);
	++aliveHosts;
	aliveHostArr.push(msg);
	aliveTimer = setTimeout(function() {
		aliveHosts = 0;
		aliveHostArr = [];
		aliveTimer = null;
		console.log("alive host cache flushed");
	}, 5 * 1000);
}

serviceEvent.on("ping", function(msg) {
	if (!msg.res && msg.cmd && msg.type == "hb-res") {
		refreshAliveHosts(msg);
	}
});

router.get('/status', function(req, res, next) {
	aliveHosts = 0;
	aliveHostArr = [];
	var result = {};
	emitServiceEvent("ping", {cmd: "ping", type: "hb-req"}, false, function(ret) {
		console.log("status post request");
		setTimeout(function() {
			//res.json({alive: aliveHosts});
			result.total = aliveHosts;
			result.hosts = aliveHostArr;
			res.json(result);
		}, 3000);
	});
});

router.get('/cluster/list', function(req, res, next) {
	var node = req.query.node;
	zk.getPaths(node, function(e, r) {
		if (e) {
		} else {
			res.json(r);
		}
	});
});

router.get('/cluster/node', function(req, res, next) {
	var node = req.query.node;
	var data = zk.getNode(node);
	if (!data) {
		res.status(404);
		res.send(node + " not found");
	} else {
		res.json(zk.getNode(node));
	}
});

module.exports = router;
