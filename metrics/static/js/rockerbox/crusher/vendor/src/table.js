import initialize from './subscribe/initialize'
import subscribe from './subscribe/subscribe'
import unsubscribe from './subscribe/unsubscribe'
import run_missing from './subscribe/run_missing'

import render_wrapper from './table/render/wrapper'
import render_rows from './table/render/rows'
import render_row from './table/render/row'
import render_header from './table/render/header'

import render_title from './table/render/title'
import render_views_metrics from './table/render/views_metrics'
import render_categories from './table/render/categories'

export function Table(target) {
  this._target = target;
  this._wrapper = this.render_wrapper(target);
  this._data = [];
  this._on = {};
}

function datum(d) {
  if (d !== undefined) {
    this._data = d
    this._wrapper.datum(d)
    return this
  }
  return this._wrapper.datum()

}

var buildCategories = function(vendor) {
  var vendor_categories = {};
  vendor.domains.forEach(function(domain) {
    if (typeof vendor_categories[domain.parent_category_name] === typeof undefined) {
      vendor_categories[domain.parent_category_name] = 0;
    }
    vendor_categories[domain.parent_category_name] += domain.count;
  });

  return d3.entries(vendor_categories).sort(function(x, y) {
    return y.value - x.value;
  }).slice(0, 13);
}

var check_missing_header = function(tableWrapper) {
  var has_header = tableWrapper.selectAll('.vendors-header-row')[0].length > 0

  var unhandled_vendor = tableWrapper.datum()[0]
  try {
    var table_categories = buildCategories(unhandled_vendor)
    if (!has_header) {
      render_header(tableWrapper, JSON.parse(JSON.stringify(table_categories)))
    }
  } catch (e) {
    console.log('ERROR', e);
  }

  return table_categories
}

function draw(_d1, _d2, skip_missing) {

  if ((this._wrapper.datum().length) &&
    (this._data !== this._wrapper.datum())) return this;

  var table_categories = check_missing_header(this._wrapper)


  var row = this.render_rows(table_categories, this._wrapper)
    // this.render_row(items)
  // this.render_categories(row, table_categories)

  if (!skip_missing) this.run_missing(this._data)

  return this

}

function vendor_table(target) {
  return new Table(target)
}

Table.prototype = {
  initialize: initialize,
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  run_missing: run_missing,

  datum: datum,
  draw: draw,
  on: function(x, y) {
    this._on[x] = y;
    return this
  },

  render_wrapper: render_wrapper,
  render_row: render_row,
  render_rows: render_rows,
  render_header: render_header,
  render_title: render_title,
  render_views_metrics: render_views_metrics,
  render_categories: render_categories
}

export default vendor_table;
