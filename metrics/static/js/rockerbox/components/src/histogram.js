import d3 from 'd3'
import base from './histogram/base'
import draw from './histogram/draw'

export function Histogram(target) {
  this._target = target;
  this._base = this.base(target);
  this._dataFunc = function(x) { return x };
  this._keyFunc = function(x) { return x };
}

function data(cb, key) {
  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
  this._keyFunc = key ? key : function(x) {return x}

  return this;
}

Histogram.prototype = {
  base: base,
  data: data,
  draw: draw
}

function histogram(target) {
  return new Histogram(target);
}

export default histogram
