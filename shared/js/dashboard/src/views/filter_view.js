import accessor from '../helpers'
import header from '../generic/header'
import table from 'table'

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }


export function FilterView(target) {
  this._on = {
    select: noop
  }
  this.target = target
}



export default function filter_view(target) {
  return new FilterView(target)
}

FilterView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , options: function(val) {
      return accessor.bind(this)("options",val) 
    }
  , draw: function() {
      
      header(this.target)
        .text("Filter")
        .draw()

      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}

