import base from './table/base'
// import dimensions from './dimensions'
// import desc from './pie/desc'
import draw from './table/draw'

export function Table(target) {
  this._target = target
  this._base = this.base(target)

  this._dataFunc = function(x) { return x }
  this._keyFunc = function(x) { return x }
}

function table(target){
  return new Table(target)
}

function data(cb, key) {
  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
  this._keyFunc = key ? key : function(x) {return x}

  return this;
}

Table.prototype = {
  base: base,
  draw: draw,
  data: data
}

export default table
