import accessor from '../helpers'
import header from '../generic/header'
import button_radio from '../generic/button_radio'
import * as table from 'table'

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
      //  .text("Choose View")
      //  .draw()

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

