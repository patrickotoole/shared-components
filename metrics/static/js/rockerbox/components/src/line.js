import dimensions from './dimensions'
import base from './line/base'
import accessor from './accessor'
import scales from './line/scales'
import axis from './line/axis'
import draw from './line/draw'



export function Line(target) {
  this._target = target
  this._class = "timeseries"

  this._dataFunc = function(x) { return x }
  this._keyFunc = function(x) { return x }
  this._margin = {top: 10, right: 50, bottom: 30, left: 50}

  this._base = this.base(target)
  scales(target)
}

function line(target){
  return new Line(target)
}

function hover(cb) {
  if ((cb == undefined) || (typeof(cb) == "function")) {
    return accessor.bind(this)("hover",cb)
  }
}

function data(cb, key) {
  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
  this._keyFunc = key ? key : function(x) {return x}
}

Line.prototype = {
  draw: function() {
    axis.bind(this)(this._target)
    return draw.bind(this)(this._target)
  },
  dimensions: dimensions,
  base: base,
  hover: hover,
  data: data,
  margins: function(x) { 

    var current = accessor.bind(this)("margin")
    if (x === undefined) return current;
    if ( (typeof(x) !== "object") && (x !== undefined) ) throw "wrong type";

    Object.keys(current).map(function(k){
      current[k] = x[k] || current[k]
    })

    return accessor.bind(this)("margin",current) 
  }
}

export default line
