var urlParams = new URLSearchParams(window.location.search);

$(document).ready(function () {
	var holder = document.getElementById("header");
	var header = document.createElement("div");
	header.className = "row row-list";
	holder.appendChild(header);
	var name = document.createElement("div");
	var addr = document.createElement("div");
	var ver = document.createElement("div");
	var timestamp = document.createElement("div");
	var uptime = document.createElement("div");
	var services = document.createElement("div");
	name.className = "col-xs-3 col-sm-3 col-lg-3";
	name.innerHTML = "hostname";
	addr.className = "col-xs-2 col-sm-2 col-lg-2";
	addr.innerHTML = "adderss";
	ver.className = "col-xs-1 col-sm-1 col-lg-1";
	ver.innerHTML = "version";
	timestamp.className = "col-xs-3 col-sm-3 col-lg-3";
	timestamp.innerHTML = "released";
	uptime.className = "col-xs-2 col-sm-2 col-lg-2";
	uptime.innerHTML = "uptime";
	services.className = "col-xs-1 col-sm-1 col-lg-1";
	services.innerHTML = "services";
	header.appendChild(name);
	header.appendChild(addr);
	header.appendChild(ver);
	header.appendChild(timestamp);
	header.appendChild(uptime);
	header.appendChild(services);

	getCluster(function(cluster) {
		for (var i = 0; i < cluster.length; i++) {
			getNode(cluster[i], function(host) {
				showNode(host);
			});
		}
	});
});

function getCluster(cb) {
	$.ajax({ url: "cluster/list?node=/seahaven-pm2/hosts", method: 'GET'})
		.done(function(ret) {
			cb(ret);
		});
}

function getNode(node, cb) {
	$.ajax({ url: "cluster/node?node=" + node, method: 'GET'})
		.done(function(ret) {
			cb(ret);
		});
}

function showNode(node) {
	if (node.data.version) {
		var holder = document.getElementById("health");
		var clusterNode = document.createElement("div");
		clusterNode.className = "row row-list";
		holder.appendChild(clusterNode);

		var name = document.createElement("div");
		var addr = document.createElement("div");
		var ver = document.createElement("div");
		var timestamp = document.createElement("div");
		var uptime = document.createElement("div");
		var services = document.createElement("div");
		name.className = "col-xs-3 col-sm-3 col-lg-3";
		name.innerHTML = node.data.hostname;
		addr.className = "col-xs-2 col-sm-2 col-lg-2";
		addr.innerHTML = node.data.ip;
		ver.className = "col-xs-1 col-sm-1 col-lg-1";
		ver.innerHTML = node.data.version.service;
		timestamp.className = "col-xs-3 col-sm-3 col-lg-3";
		timestamp.innerHTML = new Date(node.data.version.timestamp).toLocaleString({hour12:false});
		uptime.className = "col-xs-2 col-sm-2 col-lg-2";
		uptime.innerHTML = getUptime(node.data.registered);
		services.className = "col-xs-1 col-sm-1 col-lg-1";
		services.innerHTML = node.data.numservices;

		clusterNode.appendChild(name);
		clusterNode.appendChild(addr);
		clusterNode.appendChild(ver);
		clusterNode.appendChild(timestamp);
		clusterNode.appendChild(uptime);
		clusterNode.appendChild(services);

		updateCounter();
	}
}

function updateCounter() {
	var counter = document.getElementById("counter");
	var totalNum = document.getElementById("health").childElementCount;
	counter.innerHTML = totalNum;
}

function getUptime(datetime) {
	var datetime = typeof datetime !== 'undefined' ? datetime : "2014-01-01 01:02:03.123456";
	var datetime = new Date( datetime ).getTime();
	var now = new Date().getTime();
	if (isNaN(datetime)) {
		return "";
	}

	if (datetime < now) {
		var milisec_diff = now - datetime;
	} else {
		var milisec_diff = datetime - now;
	}

	var days = Math.floor(milisec_diff / 1000 / 60 / (60 * 24));
	var date_diff = new Date( milisec_diff );
	return days + "D:"+ date_diff.getHours() + "H:" + date_diff.getMinutes() + "M:" + date_diff.getSeconds() + "S";
}

