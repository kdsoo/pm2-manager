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
		var uptime = document.createElement("div");
		alive.className = "col-xs-1 col-sm-1 col-lg-1";
		alive.innerHTML = "alive";
		name.className = "col-xs-5 col-sm-5 col-lg-5";
		name.innerHTML = "hostname";
		addr.className = "col-xs-2 col-sm-2 col-lg-2";
		addr.innerHTML = "adderss";
		ver.className = "col-xs-2 col-sm-2 col-lg-2";
		ver.innerHTML = "version";
		uptime.className = "col-xs-2 col-sm-2 col-lg-2";
		uptime.innerHTML = "uptime";
		header.appendChild(alive);
		header.appendChild(name);
		header.appendChild(addr);
		header.appendChild(ver);
		header.appendChild(uptime);
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
		clearTimeout(pingTimer[id]);
		delete pingTimer[id];
	}, interval);
}

function refreshTimer(id) {
	setHostAlive(id);
	if (pingTimer[id]) {
		clearTimeout(pingTimer[id]);
		delete pingTimer[id];
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

function showHost(host, address, version) {
	var id = host + "-" + address;
	var holder = document.getElementById("health");

	var hostdiv = document.createElement("div");
	hostdiv.id = "holder-" + id;
	hostdiv.className = "row";
	var alive = document.createElement("div");
	var name = document.createElement("div");
	var addr = document.createElement("div");
	var ver = document.createElement("div");
	var uptime = document.createElement("div");
	alive.id = "indicator-" + id;
	alive.className = "col-xs-1 col-sm-1 col-lg-1";
	name.className = "col-xs-5 col-sm-5 col-lg-5";
	addr.className = "col-xs-2 col-sm-2 col-lg-2";
	ver.className = "col-xs-2 col-sm-2 col-lg-2";
	uptime.id = "uptime-" + id;
	uptime.className = "col-xs-2 col-sm-2 col-lg-2";

	hostdiv.appendChild(alive);
	hostdiv.appendChild(name);
	hostdiv.appendChild(addr);
	hostdiv.appendChild(ver);
	hostdiv.appendChild(uptime);

	var nametext = document.createTextNode(host);
	var addrtext = document.createTextNode(address);
	var vertext = document.createTextNode(version);
	name.appendChild(nametext);
	addr.appendChild(addrtext);
	ver.appendChild(vertext);
	holder.appendChild(hostdiv);
}

function updateCounter() {
	var counter = document.getElementById("counter");
	var totalNum = document.getElementById("health").childElementCount;
	counter.innerHTML = totalNum;
}
