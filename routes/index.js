var express = require('express');
var router = express.Router();

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
serviceEvent.on("ping", function(msg) {
	if (!msg.res && msg.cmd && msg.type == "hb-res") {
		++aliveHosts;
		aliveHostArr.push(msg);
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

module.exports = router;
