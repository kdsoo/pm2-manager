var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/status', function(req, res, next) {
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

module.exports = router;
