(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('helpers')) :
	typeof define === 'function' && define.amd ? define('chart', ['exports', 'helpers'], factory) :
	factory((global.media_plan = {}),global.helpers);
}(this, function (exports,helpers) { 'use strict';

	var version = "0.0.1";

	exports.version = version;

}));