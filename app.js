var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var io = require('socket.io');

var platform = require('./helper/platform');
var localevents = require('./services/localEvent');
var messaging = require('./services/messaging');
var mqtt = require('./services/mqtt-client');
var hb = require('./services/heartbeat');

var routes = require('./routes/index');
var users = require('./routes/users');
var sys = require('./routes/platform');

var pm2service = require('./services/pm2');

var app = express();
app.io = io();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
app.use('/system', sys);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

emitServiceEvent("ping", {cmd: "start"}, false, function(ret) {});

app.io.on('connection', function(socket) {
	/*
	 * 	var address = socket.handshake.address;
	 * 		var idx = address.lastIndexOf(':');
	 * 			if (~idx && ~address.indexOf('.'))
	 * 					  address = address.slice(idx + 1);
	 * 					  */
	var socketId = socket.id;
	var clientIp = socket.request.connection.remoteAddress;
	console.log(socket.handshake.address + " connected");
	console.log(socket.id + "," + clientIp + " connected");

	socket.on('disconnecting', function() {
		console.log("disconnecting");
	});
	socket.on('disconnect', function() {
		console.log("disconnected");
	});
});

serviceEvent.on("ping", function(msg) {
	if (!msg.res && msg.cmd) {
		app.io.sockets.emit("heartbeat", JSON.stringify(msg));
	}
});

serviceEvent.on('pm2', function(msg) {
	try {
		if (typeof(msg) == "string") msg = JSON.parse(msg);
		if (!msg.res && msg.cmd) {
			switch (msg.cmd) {
				case "upgrade":
					platform.gitPull(function(err, ret) {
						if (err) {
							// Error occured upgrading service. notify user
							console.error("pm2 manager upgrade error " + err);
							var title = "pm2 manager upgrade error on " + os.hostname();
							var Msg = {cmd:"PUSH", payload: {target: "ALL", title: title, msg: err}};
							emitServiceEvent("messaging",  Msg, false, function(ret) {});
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
						}
					});
					break;
				default:
					break;
			}
		}
	} catch(e) {
		console.error(e);
	}
});


module.exports = app;
