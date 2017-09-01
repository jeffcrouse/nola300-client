require('dotenv').config({ silent: true }); 
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1');
const LineIn = require('line-in');  // https://github.com/linusu/node-line-in
const wav = require('wav');			// https://github.com/tootallnate/node-wav
const util = require('util');
var EventEmitter = require('events').EventEmitter;
// TODO: change console.logs to deug calls


const speechToText = new SpeechToTextV1();
var nlu = new NaturalLanguageUnderstandingV1({
	version_date: NaturalLanguageUnderstandingV1.VERSION_DATE_2017_02_27
});

// features to fetch from Watson NLU
// https://github.com/watson-developer-cloud/node-sdk/blob/master/natural-language-understanding/v1.js
var features = { categories: {}, concepts: {}, emotion: {}, entities: {}, keywords: {}, sentiment: {} };


var SpeechToText = function() {
	EventEmitter.call(this);

	var self = this;

	var lineIn = null; // 2-channel 16-bit little-endian signed integer pcm encoded audio @ 44100 Hz
	var wavStream = null;
	var recognizeStream = null;
	var rsOptions = {
		content_type: 'audio/wav',
		timestamps: true,
		"interim_results": true,
		"readableObjectMode": true };
	var running = false;



	// --------------------------------------------------------------------
	this.start = function() {
		return new Promise((resolve, reject) => {
			if(running) return reject("[SpeechToText] already running");

			recognizeStream = speechToText.createRecognizeStream(rsOptions);
			
			lineIn = new LineIn();
			wavStream = new wav.Writer({ sampleRate: 44100, channels: 2 });

			lineIn.pipe(wavStream);
			wavStream.pipe(recognizeStream);

			recognizeStream.on('listening', on_listening);
			recognizeStream.on('data', on_data);
			recognizeStream.on('results', on_results);
			recognizeStream.on('close', on_close);

			running = true;
			resolve();
		})
	}

	// --------------------------------------------------------------------
	this.stop = function() {
		return new Promise((resolve, reject) => {
			if(!running) return reject("SpeechToText not running");

			console.log("[SpeechToText] closing");

			recognizeStream.stop();
			recognizeStream = null;
			lineIn = null;
			wavStream = null;

			running = false;
			resolve();
		});
	}

	// --------------------------------------------------------------------
	this.close = function() {
		if(running) return this.stop();
	}

	// --------------------------------------------------------------------
	var on_listening = function(data) {
		console.log("[SpeechToText] listening")
	}
	
	// --------------------------------------------------------------------
	var on_data = function(data) {
		var options = { text: data, features: features };
		nlu.analyze(options, function(err, res) {
			var sentence = {text: data, nlu: res};
			self.emit("sentence", sentence);
		});
	}
	
	// --------------------------------------------------------------------
	var on_results = function(data) {
		//console.log("[SpeechToText] results ", util.inspect(data));
	}

	// --------------------------------------------------------------------
	var on_close = function() {
		console.log("[SpeechToText] closing");
	}
}


util.inherits(SpeechToText, EventEmitter);
module.exports = new SpeechToText();