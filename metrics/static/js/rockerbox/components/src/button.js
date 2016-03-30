import d3 from 'd3'
import base from './button/base'
import draw from './button/draw'

export function Button(target) {
  this._target = target;
  this._base = this.base(target);
  this._dataFunc = function(x) { return x };
  this._keyFunc = function(x) { return x };
  this._on = {};
}

function data(cb, key) {
  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
  this._keyFunc = key ? key : function(x) {return x}

  return this;
}

function text(value) {
  this._base.text(value);
  return this;
}

function color(value) {
  this._base.style('background-color', value);
  return this;
}

Button.prototype = {
  base: base,
  data: data,
  draw: draw,
  text: text,
  color: color,
  on: function(x,y) { this._on[x] = y; return this }
}

function button(target) {
  return new Button(target);
}

export default button
