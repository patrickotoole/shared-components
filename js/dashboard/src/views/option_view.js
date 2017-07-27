import {d3_updateable, d3_splat} from '@rockerbox/helpers'
import accessor from '../helpers'
import header from '../generic/header'
import button_radio from '../generic/button_radio'
import select from '../generic/select'

import * as table from '@rockerbox/table'

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }


export function OptionView(target) {
  this._on = {
    select: noop
  }
  this.target = target
}



export default function option_view(target) {
  return new OptionView(target)
}

OptionView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , options: function(val) {
      return accessor.bind(this)("options",val) 
    }
  , draw: function() {


      var wrap = d3_updateable(this.target,".option-wrap","div")
        .classed("option-wrap",true)

      //header(wrap)
      //  .text("Display")
      //  .draw()

      var subtitle = d3_updateable(wrap, ".subtitle-filter","div")
        .classed("subtitle-filter",true)
        .style("padding-left","10px")
        .style("text-transform"," uppercase")
        .style("font-weight"," bold")
        .style("line-height"," 33px")
        .style("background","rgb(240, 244, 247)")
        .style("margin-bottom","10px")
    
      d3_updateable(subtitle,"span.first","span")
        .classed("first",true)
        .text("Choose dataset")


      select(wrap)
        .on("select", this.on("select") )
        .options(this.data())
        .draw()

      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}

