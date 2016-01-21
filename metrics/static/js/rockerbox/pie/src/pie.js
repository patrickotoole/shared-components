import base from './base'
import dimensions from './dimensions'
import desc from './desc'
import draw from './draw'

export function Pie(target) {
  this._target = target
  this._base = this.base(target)
  this._drawDesc = this.desc(target)

  this._hover = this._drawDesc
  this._colors = function() {return "grey" }
  this._dataFunc = function(x) { return x }
  this._keyFunc = function(x) { return x }

}

function pie(target){
  return new Pie(target)
}

function hover(cb) {
  this._hover = (cb !== undefined && cb) ? cb : this._drawDesc
}

function colors(cb) {
  this._colors = cb
}

function data(cb, key) {
  this._dataFunc = cb
  this._keyFunc = key ? key : function(x) {return x}
}

Pie.prototype = {
  dimensions: dimensions,
  base: base,
  desc: desc,
  draw: draw,
  hover: hover,
  colors: colors,
  data: data
}

export default pie
