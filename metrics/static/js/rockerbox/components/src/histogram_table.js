import base from './histogram_table/base'
import draw from './histogram_table/draw'

export function HistogramTable(target) {
  this._target = target
  this._base = this.base(target)

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

function headers(headers) {
  if (headers == undefined) return this._headers
  this._headers = headers
  return this;
}

function data(data) {
  if (data == undefined) return this._data
  this._data = data
  return this;
}


HistogramTable.prototype = {
  base: base,
  draw: draw,
  headers: headers,
  data: data
}

export default histogram_table
