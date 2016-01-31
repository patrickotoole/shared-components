import dimensions from './dimensions'
import base from './line/base'

export function Line(target) {
  this._target = target
  this._base = this.base(target)

  this._dataFunc = function(x) { return x }
  this._keyFunc = function(x) { return x }
}

function line(target){
  return new Line(target)
}

function hover(cb) {
  this._hover = (cb !== undefined && cb) ? cb : this._drawDesc
}

function data(cb, key) {
  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
  this._keyFunc = key ? key : function(x) {return x}
}

Line.prototype = {
  dimensions: dimensions,
  base: base,
  hover: hover,
  data: data,
  margin: function(x) { return accessor("margin",x) }
}

export default line
