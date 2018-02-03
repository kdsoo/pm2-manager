var urlParams = new URLSearchParams(window.location.search);

$(document).ready(function () {
	$.ajax({ url: "status", method: 'POST'})
	.done(function(ret) {
		console.log(ret);
	});
});

function showHost(host) {
	var holder = document.getElementById("health");
	var hostdiv = document.createElement("div");
	var hosttext = document.createTextNode(host);
	hostdiv.appendChild(hosttext);
	holder.appendChild(hostdiv);
}

function updateCounter() {
	var counter = document.getElementById("counter");
	var totalNum = document.getElementById("health").childElementCount;
	counter.innerHTML = totalNum;
}
