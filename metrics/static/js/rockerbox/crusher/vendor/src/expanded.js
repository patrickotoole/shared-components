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

import render_bar from './expanded/render/bar'
import render_table from './expanded/render/table'
import render_hist from './expanded/render/hist'



export function Expanded(target) {
  this._target = target
  this._wrapper = this.render_wrapper(target)
  this._data = []
  this._categories = {}
  this._on = {}
  this._render_items = ["visits","pie","onsite"] //["bar","table"]
  this._table_filter = function(e){return true}
  this._table_filter_dict = {}
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
  items: function(x) {
    if (x === undefined) return this._render_items;
    if (x) this._render_items = x;
    return this
  },
  click: function(x) {
    if (x === undefined) return this._click;
    if (x) this._click = x;
    return this
  },



  render_button: render_button,
  render_wrapper: render_wrapper,
  render_list: render_list,
  render_row: render_row,
  render_nav: render_nav,
  render_pie: render_pie,
  render_visits: render_visits,
  render_onsite: render_onsite,
  render_bar: render_bar,
  render_hist: render_hist,
  render_table: render_table,
  render_user_activity: function(target) {
    var wrap = d3_updateable(target,".activity","div")
      .classed("activity col-md-3", true)

    var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
      .classed("vendor-domains-bar-desc",true)
      .style("display","inherit")

    d3_updateable(desc, "h3","h3")
      .text("User Vistis")

    var onsite = d3_updateable(desc,".onsite","div")
      .classed("onsite",true)

    d3_updateable(onsite,"div","div")
      .text("On-site")

    var offsite = d3_updateable(desc,".offsite","div")
      .classed("offsite",true)

    d3_updateable(offsite,"div","div")
      .text("Off-site")


      

  },
  render_offsite_hourly: function(target) {


    var x = d3_updateable(target,".offsite-hourly","div",false,function(x,i) {return i})
      .classed("offsite-hourly col-md-6",true)
      .style("min-height","200px")

    if (this._data[0].current_hour) {
      x.datum(function(x){ return x.current_hour })
      this.render_hist(x,"Off-site User Activity",function(x){return x.count},function(x){return x.hour}) 

    }
    
  },
  render_three: function(target) {
    var x = d3_updateable(target,".yo2","div").classed("yo2 col-md-3 pull-right",true)
      .style("min-height","300px")

    x.text(function(y){
      return "timeofday: " + x.hour

    })
    
  }

}

export default vendor_expanded
