import accessor from '../helpers'
import header from '../generic/header'
import button_radio from '../generic/button_radio'
import table from 'table'

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }


export function SummaryView(target) {
  this._on = {
    select: noop
  }
  this.target = target
}



export default function summary_view(target) {
  return new SummaryView(target)
}

SummaryView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , summarys: function(val) {
      return accessor.bind(this)("summarys",val) 
    }
  , draw: function() {


      var wrap = d3_updateable(this.target,".summary-wrap","div")
        .classed("summary-wrap",true)

      header(wrap)
        .text("Summary")
        .draw()

      button_radio(wrap)
        .on("click", this.on("select") )
        .data(this.data())
        .draw()

      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}

