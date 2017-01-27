import accessor from '../helpers'
import header from '../generic/header'
import button_radio from '../generic/button_radio'
import table from 'table'

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

      button_radio(this.target)
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

