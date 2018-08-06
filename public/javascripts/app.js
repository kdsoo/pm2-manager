var urlParams = new URLSearchParams(window.location.search);

$(document).ready(function () {
	$.ajax({ url: "status", method: 'POST'})
	.done(function(ret) {
		console.log(ret);
		var holder = document.getElementById("header");
		var header = document.createElement("div");
		header.className = "row row-list";
		holder.appendChild(header);
		var alive = document.createElement("div");
		var name = document.createElement("div");
		var addr = document.createElement("div");
		var ver = document.createElement("div");
		var timestamp = document.createElement("div");
		var uptime = document.createElement("div");
		var notification = document.createElement("div");
		var services = document.createElement("div");
		alive.className = "col-xs-1 col-sm-1 col-lg-1";
		alive.innerHTML = "alive";
		name.className = "col-xs-2 col-sm-2 col-lg-2";
		name.innerHTML = "hostname";
		addr.className = "col-xs-2 col-sm-2 col-lg-2";
		addr.innerHTML = "adderss";
		ver.className = "col-xs-1 col-sm-1 col-lg-1";
		ver.innerHTML = "version";
		timestamp.className = "col-xs-3 col-sm-3 col-lg-3";
		timestamp.innerHTML = "released";
		uptime.className = "col-xs-1 col-sm-1 col-lg-1";
		uptime.innerHTML = "uptime";
		notification.className = "col-xs-1 col-sm-1 col-lg-1";
		notification.innerHTML = "noti";
		services.className = "col-xs-1 col-sm-1 col-lg-1";
		services.innerHTML = "services";
		header.appendChild(alive);
		header.appendChild(name);
		header.appendChild(addr);
		header.appendChild(ver);
		header.appendChild(timestamp);
		header.appendChild(uptime);
		header.appendChild(notification);
		header.appendChild(services);
	});
});

setInterval(function() {
	$.ajax({ url: "status", method: 'POST'})
		.done(function(ret) {
			console.log("ping");
		});
}, 1 * 60 * 1000);

var interval = 1 * 70 * 1000;	// 1min 10sec
var pingTimer = {};
function initTimer(id) {
	if (pingTimer[id]) {
		console.log("Timer " + id + " already exists");
	}
	pingTimer[id] = setTimeout(function() {
		setHostDead(id);
		rmTimer(id);
	}, interval);
}

function refreshTimer(id) {
	setHostAlive(id);
	if (pingTimer[id]) {
		rmTimer(id);
	}
	pingTimer[id] = setTimeout(function() {
		setHostDead(id);
	}, interval);
}

function rmTimer(id) {
	if (pingTimer[id]) {
		clearTimeout(pingTimer[id]);
		delete pingTimer[id];
	} else {
		console.error("timer " + id + " doesn't exist");
	}
}

function setHostDead(id) {
	id = "indicator-" + id;
	var indicator = document.getElementById(id);
	indicator.innerHTML = "X";
	indicator.style.backgroundColor = "red";
	console.log("host " + id + " set dead");
}
function setHostAlive(id) {
	id = "indicator-" + id;
	var indicator = document.getElementById(id);
	indicator.innerHTML = "O";
	indicator.style.backgroundColor = "lightgreen";
}
function setHostUptime(id, uptime) {
	id = "uptime-" + id;
	var ut = document.getElementById(id);
	if (ut) ut.innerHTML = uptime;
}

function showHost(uuid, host, address, version, timestamp, noti, num) {
	var id = uuid;
	var holder = document.getElementById("health");

	var hostdiv = document.createElement("div");
	hostdiv.id = "holder-" + id;
	hostdiv.className = "row";
	var alive = document.createElement("div");
	var name = document.createElement("div");
	var addr = document.createElement("div");
	var ver = document.createElement("div");
	var time = document.createElement("div");
	var uptime = document.createElement("div");
	var notification = document.createElement("div");
	var services = document.createElement("div");
	alive.id = "indicator-" + id;
	alive.className = "col-xs-1 col-sm-1 col-lg-1";
	name.className = "col-xs-2 col-sm-2 col-lg-2";
	addr.className = "col-xs-2 col-sm-2 col-lg-2";
	ver.className = "col-xs-1 col-sm-1 col-lg-1";
	time.className = "col-xs-3 col-sm-3 col-lg-3";
	uptime.id = "uptime-" + id;
	uptime.className = "col-xs-1 col-sm-1 col-lg-1";
	notification.id = "notification-" + id;
	notification.className = "col-xs-1 col-sm-1 col-lg-1";
	services.className = "col-xs-1 col-sm-1 col-lg-1";

	hostdiv.appendChild(alive);
	hostdiv.appendChild(name);
	hostdiv.appendChild(addr);
	hostdiv.appendChild(ver);
	hostdiv.appendChild(time);;
	hostdiv.appendChild(uptime);
	hostdiv.appendChild(notification);
	hostdiv.appendChild(services);

	var nametext = document.createTextNode(host);
	var addrtext = document.createTextNode(address);
	var vertext = document.createTextNode(version);
	var timetext = document.createTextNode(timestamp);
	var notitext = document.createTextNode(noti);
	var servicestext = document.createTextNode(num);
	name.appendChild(nametext);
	addr.appendChild(addrtext);
	ver.appendChild(vertext);
	time.appendChild(timetext);
	notification.appendChild(notitext);
	services.appendChild(servicestext);
	holder.appendChild(hostdiv);
}

function updateCounter() {
	var counter = document.getElementById("counter");
	var totalNum = document.getElementById("health").childElementCount;
	counter.innerHTML = totalNum;
}

function updateNotiIndicator(uuid, status) {
	var id = "notification-" + uuid;
	var noti = document.getElementById(id);
	if (noti) noti.innerHTML = status;
}
