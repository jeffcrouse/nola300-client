require('dotenv').config({ silent: true }); 
var debug = require('debug')('stt');
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1');
const util = require('util');
var EventEmitter = require('events').EventEmitter;
const spawn = require('child_process').spawn;

const stt = new SpeechToTextV1();
var nlu = new NaturalLanguageUnderstandingV1({
	version_date: NaturalLanguageUnderstandingV1.VERSION_DATE_2017_02_27
});

// features to fetch from Watson NLU
// https://github.com/watson-developer-cloud/node-sdk/blob/master/natural-language-understanding/v1.js
var features = { concepts: {}, emotion: {}, entities: {}, keywords: {}, sentiment: {} };


var SpeechToText = function() {
	EventEmitter.call(this);

	var self = this;

	var recognizeStream = null;
	var running = false;
	var startTime = null;
	var recProc = null;


	// --------------------------------------------------------------------
	this.start = function(callback) {
		callback = callback || function(){}
		if(running) return callback("already running");

		recognizeStream = stt.createRecognizeStream({content_type: 'audio/wav'});
		recognizeStream.setEncoding('utf8');
		recognizeStream.on('listening', on_listening);
		recognizeStream.on('data', on_data);
		recognizeStream.on('results', on_results);
		recognizeStream.on('close', on_close);

		debug("spawning rec");
		recProc = spawn('rec', ['-b', 16, '--endian', 'little', '-c', 1, '-r', 16000, '-e', 'signed-integer', '-t', 'wav', '-']);
		recProc.on('exit', (code, sig) => {
			debug(`recProc has exited with code = ${code}`);
		});

		recProc.stderr.on('data', (data) => { 
			debug(data.toString());
		});
		recProc.stdout.pipe(recognizeStream);

		recProc.on('close', (code) => {
			debug(`recProc exited with code ${code}`);
		});

		startTime = Date.now();
		running = true;

		debug("started");
		callback();
	}

	// --------------------------------------------------------------------
	this.stop = function(callback) {	
		callback = callback || function(){}

		if(!running) {
			debug("[warning] SpeechToText not running");
			return callback();
		}

		debug("closing");

		recProc.kill('SIGTERM');
		recProc = null;
		recognizeStream.stop();
		recognizeStream = null;

		startTime = null;
		running = false;

		callback();
	}


	// --------------------------------------------------------------------
	var on_listening = function(data) {
		debug("listening")
	}
	

	// --------------------------------------------------------------------
	var on_data = function(data) {
		var now = Date.now();
		var elapsed = now - startTime;
		var sentence = {
			text: data, 
			elapsed: elapsed,
			time: now,
			nlu: null
		};

		var options = { text: data, features: features };
		nlu.analyze(options, function(err, res) {
			if(err) {
				debug(err);
			} else {
				sentence.nlu = res;
			}
			self.emit("sentence", sentence);
		});
	}

	
	// --------------------------------------------------------------------
	var on_results = function(data) {
		//console.log("[SpeechToText] results ", util.inspect(data));
	}

	// --------------------------------------------------------------------
	var on_close = function() {
		debug("on_close");
	}
}


util.inherits(SpeechToText, EventEmitter);
module.exports = new SpeechToText();