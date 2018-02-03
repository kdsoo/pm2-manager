var urlParams = new URLSearchParams(window.location.search);

$(document).ready(function () {
	$.ajax({ url: "status", method: 'POST'})
	.done(function(ret) {
		console.log(ret);
	});
});

function showHost(host) {
	var holder = document.getElementById("health");
	holder.innerHTML += "<p>" + host + "</p>";
}
