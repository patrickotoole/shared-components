import initialize from './subscribe/initialize'
import subscribe from './subscribe/subscribe'
import unsubscribe from './subscribe/unsubscribe'
import run_missing from './subscribe/run_missing'

import render_row from './expanded/render/row'
import render_list from './expanded/render/list'
import render_wrapper from './expanded/render/wrapper'
import render_button from './expanded/render/button'

import render_nav from './expanded/render/nav'
import render_pie from './expanded/render/pie'
import render_visits from './expanded/render/visits'
import render_onsite from './expanded/render/onsite'

export function Expanded(target) {
  this._target = target
  this._wrapper = this.render_wrapper(target)
  this._data = []
  this._on = {}
}

function datum(d) {
  if (d !== undefined) {

    if (this._filter) d = d.filter(this._filter)
    this._data = d

    this._wrapper.datum(d)
    return this
  }
  var d = this._wrapper.datum()
  if (this._filter) d = d.filter(this._filter)

  this._wrapper.datum(d)

  return d

}

function draw(_d1, _d2, _d3, skip_missing) {

  var data = this.datum() // bind the new, filtered data...

  console.log("DRAWING", skip_missing, data)
  //debugger

  //if ( (this._wrapper.datum().length ) && (this._data !== this._wrapper.datum()) ) return this


  var items = this.render_list(this._wrapper)
  this.render_row(items)


  if (!skip_missing) this.run_missing(data);

  


  return this
}


function vendor_expanded(target){
  return new Expanded(target)
}

Expanded.prototype = {
  initialize: initialize,
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  run_missing: run_missing,

  draw: draw,
  datum: datum,
  on: function(x,y) { this._on[x] = y; return this },
  filter: function(x) {
    this._filter = x
    return this
  },

  render_button: render_button,
  render_wrapper: render_wrapper,
  render_list: render_list,
  render_row: render_row,
  render_nav: render_nav,
  render_pie: render_pie,
  render_visits: render_visits,
  render_onsite: render_onsite
}

export default vendor_expanded
