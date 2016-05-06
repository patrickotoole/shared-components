import base from './table/base'
import draw from './table/draw'
import draw_pagination from './table/pagination'

export function Table(target) {
  this._target = target
  this._base = this.base(target)

  this._dataFunc = function(x) { return x }
  this._keyFunc = function(x) { return x }
  this._pagination;
  this._pagination_current = 1;
  this._ascending = false
}

function table(target){
  return new Table(target)
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

Table.prototype = {
  base: base,
  draw: draw,
  data: data,
  pagination: pagination,
  draw_pagination: draw_pagination,
  changePage: changePage
}

export default table
