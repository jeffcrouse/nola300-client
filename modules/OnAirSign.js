const SerialPort = require('serialport');
const util = require('util');
//process.env['DEBUG']="onair";
var debug = require('debug')('onair');

// SerialPort.list(function (err, ports) {
// 	ports.forEach(function(_info) { console.log(util.inspect(_info)); });
// });

var OnAirSign = function(serial) {

	var self = this;
	var port = null;
	var options = { baudRate: 9600 };
	var closeRequested = false;
	var re =  new RegExp(serial);
	var key = "serialNumber";
	var on = false;
	var heartbeat = Date.now();
	var isOpened = false;
	var no_callback = function(err) {
		if(err) debug(err);
	}

	/**
	* Do we currently have an open connection to the pedal?
	*/
	this.getIsOpened = function() {
		return isOpened;
	}

	// ---------------------------
	this.toggle = function(callback) {
		if(on) this.off(callback);
		else this.on(callback);
	}

	// ---------------------------
	this.on = function(callback) {
		callback = callback || no_callback;
		if(!port) return callback("no port");
		on = true;
		debug("on")
		port.write("1", "utf8", callback);
	}

	// ---------------------------
	this.off = function(callback) {
		callback = callback || no_callback;
		if(!port) return callback("no port");
		on = false;
		debug("off")
		port.write("0", "utf8", callback);
	}

	// ---------------------------
	this.close = function(callback) {
		callback = callback || no_callback;
		closeRequested = true;
		debug("closing");
		if(port) port.close();
		callback();
	}

	var on_open = function() {
		isOpened = true;
		debug("opened");
	}

	var on_error = function(err) {
		debug('error opening port: ', err.message);
		port = null;
	}

	var on_data = function(buf) {
		var data = buf.toString('utf8');
		//debug("data", data);
		if(data==".") heartbeat = Date.now();
	}

	var on_close = function(data) {
		debug("on_close");
		isOpened = false;
		port = null;
	}

	var stay_connected = function() {
		if(closeRequested) return;

		if(port==null)  {
			debug("port closed. attemping to open")

			SerialPort.list().then((ports) => {
				var comName = null;
				ports.forEach(function(_info) {
					if(_info[key] && _info[key].match(re)) 
						comName = _info.comName
				});
				if(comName==null) 
					return debug("no port found");
				
				debug("opening", comName);

				port = new SerialPort(comName, options);
				port.on('open', on_open);
				port.on('error', on_error);
				port.on('data', on_data);
				port.on('close', on_close);
			})
		} else {
			var elapsed = Date.now() - heartbeat;
			if(elapsed > 5000) {
				debug("lost heartbeat signal. resetting")
				port = null;
			}
		}

		if(!closeRequested) setTimeout( stay_connected, 1000 );
	};

	stay_connected();
}


module.exports = new OnAirSign("85438333935351A02251");
