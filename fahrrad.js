"use strict";
const gpio = require("rpi-gpio");
const net = require('net');
var util = require('util');

const gpios = [[7, gpio.DIR_IN]];

const readLine = require("readline");
const rl = readLine.createInterface({
	input: process.stdin,
	output: process.stdout
});

setupGPIOS(gpios).then(logic);

function setupGPIOS(gpios) {
  let promise = new Promise(function (resolve, reject) {
    let pinsReady = 0;
    
    for (let pin of gpios) {
      if (pin[1] === gpio.DIR_IN) {
        gpio.setup(pin[0], pin[1], gpio.EDGE_BOTH);
        gpioReady();
      } else {
        gpio.setup(pin[0], pin[1], gpioReady);
      }
    }
    
    function gpioReady() {
      pinsReady++;
      if (pinsReady === gpios.length) {
        resolve();
      }
    }
  });
  
  return promise;
}

var clients = {};
var clientId = 0;
var ticks = 0;

function createServer() {
	const server = net.createServer((c) => {
		// 'connection' listener
		console.log('client connected');
		c.on('end', () => {
			console.log('client disconnected');
			delete clients[c.clientId];
		});
		c.on('error', (err) => {
			console.log('client error: ' + err);
			delete clients[c.clientId];
		});
		c.clientId = clientId++;
		clients[c.clientId] = c;
	});
	
	server.on('error', (err) => {
		console.log(err);
	});
	
	server.listen({port: 8080, host: "192.168.178.62"}, () => {
		console.log('server bound');
	});
}

function logic() {
	let startDate = (new Date()).getTime();
	let showOutput = true;
	let lastTicksPerSecond = 0;
	let secondaryTicks = 0;
	
	
	let meters = 0;
	let lastMeters = 0;
	let lastChecked = (new Date()).getTime();
	let currentSpeed = 0;
	let acceleration = 0;
	let lastAcceleration = 0;
	
	let lastMeterTimes = [(new Date()).getTime(), (new Date()).getTime()];
	
	createServer();
	
	gpio.on('change', function(channel, value) {
		//console.log('Channel ' + channel + ' value is now ' + value);
		if (value) {
			++meters;
			lastMeterTimes.push((new Date()).getTime());
		}
	});
	
	setInterval(updateSpeed, 500);
	setInterval(updateClients, 500);
	
	function updateSpeed() {
		// once per second
		let now = (new Date()).getTime();
		let lastMeter = lastMeterTimes[lastMeterTimes.length - 1];

		if (now - lastMeter >= 1500) {
			currentSpeed = 0;
		} else {
			currentSpeed = parseInt((1 / (lastMeter - lastMeterTimes[lastMeterTimes.length - 2])) * 100000, 10) / 100;
		}

		util.print("\u001b[2J\u001b[0;0H");
		console.log("lastMeter: " + lastMeter);
		console.log("currentSpeed: " + currentSpeed);
		console.log("meters: " + meters);
		meters = 0;
		lastChecked = now;
	}
	
	function updateClients() {
		
			for (var i in clients) {
				clients[i].write("|currentSpeed:" + currentSpeed);
			}
		
	}
	
	console.log("Ready....");
}

