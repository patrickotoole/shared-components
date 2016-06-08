import base from './histogram_table/base'
import draw from './histogram_table/draw'

export function HistogramTable(target) {
  this._target = target
  this._base = this.base(target)

  this._dataFunc = function(x) { return x }
  this._keyFunc = function(x) { return x }
  this._pagination;
  this._pagination_current = 1;
  this._ascending = false
}

function histogram_table(target){
  return new HistogramTable(target)
}

function sort(value) {
  if (value == undefined) return this._sort
  if (value) this._sort = value
  return this

}

function data(cb, key) {
  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
  this._keyFunc = key ? key : function(x) {return x}

  return this;
}

function changePage(value) {
  this._pagination_current = value;
}

function pagination(value) {
  this._pagination = value;

  return this;
}

HistogramTable.prototype = {
  base: base,
  draw: draw,
  data: data
}

export default histogram_table
