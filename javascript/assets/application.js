global.$ = $;

const remote = require("@electron/remote");
const { Menu, BrowserWindow, MenuItem, shell, dialog } = remote;

const os = require("os");
const fs = require("fs");
const net = require("net");

var HISTORY_FILENAME = os.tmpdir() + "/NMEAMapServerHistory.json";
var SettingsObject = null;
var SettingsFileData = null;
var DefaultSettingsJSON = '{"Altitude":0, "Heading": 0, "Port": 9999, "Latitude": 0, "Longitude": 0}';

var GlobalLatitude = 0;
var GlobalLongitude = 0;
var GlobalMarker = null;

process.on("uncaughtException", function (err) {
	DisplayWarning(err);
});

/* Function to click on elements */
function clickInput(id) {
	var event = document.createEvent("MouseEvents");
	event.initMouseEvent("click");
	document.getElementById(id).dispatchEvent(event);
}

function ReadSettings() {
	fs.readFile(HISTORY_FILENAME, "utf-8", function (error, contents) {
		SettingsFileData = contents;

		if (null != SettingsFileData && "" != SettingsFileData) {
			try {
				SettingsObject = JSON.parse(SettingsFileData);
			} catch (e) {
				SettingsObject = JSON.parse(DefaultSettingsJSON);
			}
		} else {
			SettingsObject = JSON.parse(DefaultSettingsJSON);
		}

		if (undefined == SettingsObject.Altitude) {
			SettingsObject.Altitude = 0;
		}

		if (undefined == SettingsObject.Heading) {
			SettingsObject.Heading = 0;
		}

		if (undefined == SettingsObject.Port) {
			SettingsObject.Port = 9999;
		}

		$("#Altitude").val(SettingsObject.Altitude);
		$("#Heading").val(SettingsObject.Heading);
		$("#Port").val(SettingsObject.Port);

		if (undefined != SettingsObject.Latitude) {
			GlobalLatitude = SettingsObject.Latitude;
		}

		if (undefined != SettingsObject.Longitude) {
			GlobalLongitude = SettingsObject.Longitude;
		}

		GlobalMarker.setLatLng(new L.LatLng(GlobalLatitude, GlobalLongitude), { draggable: "true" });

		var heading = parseInt(SettingsObject.Heading) || 0;
		GlobalMarker.setIconAngle(heading);
		map.panTo(new L.LatLng(GlobalLatitude, GlobalLongitude));
	});
}

function WriteSettings() {
	var Port = parseInt($("#Port").val()) || 9999;

	if (Port <= 1 || Port >= 65535) {
		Port = 9999;
	}

	$("#Port").val(Port);

	var Altitude = parseFloat($("#Altitude").val()) || 0;
	$("#Altitude").val(Altitude);

	var Heading = parseFloat($("#Heading").val()) || 0;

	while (Heading > 180) {
		Heading = Heading - 360;
	}

	while (Heading < -180) {
		Heading = Heading + 360;
	}

	GlobalMarker.setIconAngle(parseInt(Heading));
	$("#Heading").val(Heading);

	if (
		SettingsObject.Altitude != Altitude ||
		SettingsObject.Heading != Heading ||
		SettingsObject.Port != Port ||
		SettingsObject.Latitude != GlobalLatitude ||
		SettingsObject.Longitude != GlobalLongitude
	) {
		SettingsObject.Altitude = Altitude;
		SettingsObject.Heading = Heading;
		SettingsObject.Port = Port;
		SettingsObject.Latitude = GlobalLatitude;
		SettingsObject.Longitude = GlobalLongitude;

		try {
			SettingsFileData = JSON.stringify(SettingsObject);
		} catch (e) {
			SettingsObject = JSON.parse(DefaultSettingsJSON);
		}

		fs.writeFileSync(HISTORY_FILENAME, SettingsFileData);
	}
}

function InitMenu() {
	var template = [
		/*
		{
			label: 'Edit',
			submenu: [
				{role: 'undo'},
				{role: 'redo'},
				{type: 'separator'},
				{role: 'cut'},
				{role: 'copy'},
				{role: 'paste'},
				{role: 'delete'},
				{role: 'selectall'}
			]
		},
*/
		///*
		{
			label: "View",
			submenu: [{ role: "reload" }, { role: "forcereload" }, { role: "toggledevtools" }]
		},
		//*/
		{
			role: "window",
			submenu: [{ role: "minimize" }, { role: "close" }]
		}
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

$(function () {
	/*-----------------------------------------------------------------------------------*/
	/*	Anchor Link
	/*-----------------------------------------------------------------------------------*/
	$("a[href*=#]:not([href=#])").click(function () {
		if (location.pathname.replace(/^\//, "") == this.pathname.replace(/^\//, "") || location.hostname == this.hostname) {
			var target = $(this.hash);
			target = target.length ? target : $("[name=" + this.hash.slice(1) + "]");
			if (target.length) {
				$("html,body").animate(
					{
						scrollTop: target.offset().top
					},
					1000
				);
				return false;
			}
		}
	});

	/*-----------------------------------------------------------------------------------*/
	/*  Tooltips
	/*-----------------------------------------------------------------------------------*/
	$(".tooltip-side-nav").tooltip();

	InitMenu();
});

var map;
var GlobalMarker;

window.onload = function () {
	var osmUrl = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
	var osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors';
	var osm = L.tileLayer(osmUrl, { maxZoom: 18, attribution: osmAttrib });
	map = new L.Map("map", { center: new L.LatLng(0, 0), zoom: 2 });
	drawnItems = L.featureGroup().addTo(map);

	L.control
		.layers(
			{
				"Open Street Maps": osm.addTo(map),
				"Google Satellite": L.tileLayer("http://www.google.com/maps/vt?lyrs=s@189&gl=en&x={x}&y={y}&z={z}", {
					attribution: "google"
				}),
				"Google Hybrid": L.tileLayer("http://www.google.com/maps/vt?lyrs=y@189&gl=en&x={x}&y={y}&z={z}", {
					attribution: "google"
				}),
				"Google Road": L.tileLayer("http://www.google.com/maps/vt?lyrs=r@189&gl=en&x={x}&y={y}&z={z}", {
					attribution: "google"
				})
			},
			{},
			{ position: "topright", collapsed: true }
		)
		.addTo(map);

	var HeadingIcon = L.icon({
		iconUrl: "images/location.home.png",
		iconSize: [25, 41], // size of the icon
		iconAnchor: [12.5, 20.5] // point of the icon which will correspond to marker's location
	});

	GlobalMarker = new L.marker([GlobalLatitude, GlobalLongitude], { draggable: "true", icon: HeadingIcon });
	GlobalMarker.on("dragend", function (event) {
		var marker = event.target;
		var position = marker.getLatLng();
		marker.setLatLng(new L.LatLng(position.lat, position.lng), { draggable: "true" });
		map.panTo(new L.LatLng(position.lat, position.lng));

		GlobalLatitude = position.lat;
		GlobalLongitude = position.lng;
		WriteSettings();
	});

	GlobalMarker.on("drag", function (event) {
		var marker = event.target;
		var heading = parseInt(SettingsObject.Heading) || 0;
		marker.setIconAngle(heading);
	});
	map.addLayer(GlobalMarker);

	ReadSettings();
};

var GlobalServer = undefined;
var GlobalServerClients = [];
var GlobalServerUpdateTimeout = undefined;

function StopServer() {
	if (GlobalServerUpdateTimeout != undefined) {
		clearTimeout(GlobalServerUpdateTimeout);
		GlobalServerUpdateTimeout = undefined;
	}

	for (var i = 0; i < GlobalServerClients.length; i++) {
		GlobalServerClients[i].end();
	}

	GlobalServerClients = [];

	if (GlobalServer != undefined) {
		GlobalServer.close();
		GlobalServer = undefined;
	}

	$("#start_server").attr("onclick", "StartServer();");
	$("#start_server").text("Start Server");

	$("#result").html("");
}

function StartServer() {
	StopServer();
	RunServer();

	$("#start_server").attr("onclick", "StopServer();");
	$("#start_server").text("Stop Server");
}

function RunServer(port, delay, trigger, cog) {
	if (GlobalServerUpdateTimeout != undefined) {
		clearTimeout(GlobalServerUpdateTimeout);
		GlobalServerUpdateTimeout = undefined;
	}

	GlobalServerUpdateTimeout = setTimeout(SendNMEAData, SettingsObject.Delay);

	// Start a TCP Server
	GlobalServer = net
		.createServer(function (socket) {
			// Identify this client
			socket.name = socket.remoteAddress + ":" + socket.remotePort;

			// Put this new client in the list
			GlobalServerClients.push(socket);

			// Handle incoming messages from GlobalServerClients.
			socket.on("data", function (data) {});

			// Remove the client from the list when it leaves
			socket.on("end", function () {
				GlobalServerClients.splice(GlobalServerClients.indexOf(socket), 1);
			});

			socket.on("error", function (error) {
				console.error(error);
				GlobalServerClients.splice(GlobalServerClients.indexOf(socket), 1);
				socket.destroy();
			});
		})
		.listen(SettingsObject.Port);
}

function CalculateNMEAChecksum(text) {
	// Compute the checksum by XORing all the character values in the string.
	var checksum = 0;
	for (var i = 0; i < text.length; i++) {
		checksum = checksum ^ text.charCodeAt(i);
	}

	// Convert it to hexadecimal (base-16, upper case, most significant nybble first).
	var hexsum = Number(checksum).toString(16).toUpperCase();

	if (hexsum.length < 2) {
		hexsum = ("00" + hexsum).slice(-2);
	}

	return hexsum;
}

Number.prototype.pad = function (size) {
	var s = String(this);
	while (s.length < (size || 2)) {
		s = "0" + s;
	}
	return s;
};

function ConvertDecimalDegreesToNMEAGPS(lat, lon) {
	var lat_dir = "N";

	if (lat < 0) {
		lat_dir = "S";
	}

	var lon_dir = "E";

	if (lon < 0) {
		lon_dir = "W";
	}

	var lat_abs = Math.abs(lat);
	var lat_int = Math.floor(lat_abs);
	var lat_dec = lat_abs - lat_int;
	var latitude = lat_int * 100 + lat_dec * 60;

	var lon_abs = Math.abs(lon);
	var lon_int = Math.floor(lon_abs);
	var lon_dec = lon_abs - lon_int;
	var longitude = lon_int * 100 + lon_dec * 60;

	return latitude.toFixed(6) + "," + lat_dir + "," + longitude.toFixed(6) + "," + lon_dir;
}

function SendNMEAData() {
	var nmea = "";

	//$GPGGA,155536.654,5103.778445140092,N,141.13269964437896,E,5,00,0.0,0,M,0.0,M,,*73
	//$HEHDT,121.20,T*1F

	var d = new Date();
	var timestamp =
		d.getUTCHours().pad(2) + d.getUTCMinutes().pad(2) + d.getUTCSeconds().pad(2) + "." + d.getUTCMilliseconds().pad(3);

	var altitude = parseFloat(SettingsObject.Altitude);
	var line = "GPGGA," + timestamp + "," + ConvertDecimalDegreesToNMEAGPS(GlobalLatitude, GlobalLongitude);
	line += ",5,00,0.0," + altitude.toFixed(2) + ",M,0.0,M,,";

	var checksum = CalculateNMEAChecksum(line);

	nmea += "$" + line + "*" + checksum + "\n";

	var heading = parseFloat(SettingsObject.Heading);
	var heading_line = "HEHDT," + heading.toFixed(2) + ",T";
	var checksum = CalculateNMEAChecksum(heading_line);

	nmea += "$" + heading_line + "*" + checksum + "\n";

	$("#result").html(nmea.replace(/(?:\r\n|\r|\n)/g, "<br />"));

	for (var i = 0; i < GlobalServerClients.length; i++) {
		GlobalServerClients[i].write(nmea);
	}

	if (GlobalServerUpdateTimeout != undefined) {
		clearTimeout(GlobalServerUpdateTimeout);
		GlobalServerUpdateTimeout = undefined;
	}

	GlobalServerUpdateTimeout = setTimeout(SendNMEAData, 1000);
}
