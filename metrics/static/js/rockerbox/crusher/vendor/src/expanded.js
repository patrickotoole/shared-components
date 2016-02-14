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


export function Expanded(target) {
  this._target = target
  this._wrapper = this.render_wrapper(target)
  this._data = []
}

function datum(d) {
  if (!!d) {
    this._data = d
    this._wrapper.datum(d)
    return this
  }
  return this._wrapper.datum()

}



function draw(_d1, _d2, skip) {

  if ( (this._wrapper.datum().length ) && 
       (this._data !== this._wrapper.datum()) ) return this

  var items = this.render_list(this._wrapper)

  this.render_row(items)
  if (!skip) this.run_missing(items.data())

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

  render_button: render_button,
  render_wrapper: render_wrapper,
  render_list: render_list,
  render_row: render_row,
  render_nav: render_nav,
  render_pie: render_pie,
  render_visits: render_visits
  
}

export default vendor_expanded
