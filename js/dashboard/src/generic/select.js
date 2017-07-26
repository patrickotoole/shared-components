import {d3_updateable, d3_splat} from '@rockerbox/helpers'
import accessor from '../helpers'

export function Select(target) {
  this._on = {}
  this.target = target
}

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }


export default function select(target) {
  return new Select(target)
}

Select.prototype = {
    options: function(val) {
      return accessor.bind(this)("options",val) 
    }
  , draw: function() {

      this._select = d3_updateable(this.target,"select","select",this._options)

      var bound = this.on("select").bind(this)

      this._select
        .on("change",function(x) { bound(this.selectedOptions[0].__data__) })

      this._options = d3_splat(this._select,"option","option",identity,key)
        .text(key)
        .property("selected", (x) => {

          console.log(this._selected,x.value)
          return (x.value && x.value == this._selected) ? 
            "selected" : x.selected == 1 ? 
            "selected" : null
         
        })

      return this
    }
  , selected: function(val) {
      return accessor.bind(this)("selected",val)
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}
