import accessor from '../helpers'
import header from './header'

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }

export function ConditionalShow(target) {
  this._on = {}
  this._classes = {}
  this._objects = {}
  this.target = target
}

export default function conditional_show(target) {
  return new ConditionalShow(target)
}

ConditionalShow.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , classed: function(k, v) {
      if (k === undefined) return this._classes
      if (v === undefined) return this._classes[k] 
      this._classes[k] = v;
      return this
    }  
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
  , draw: function () {

      var classes = this.classed()

      var wrap = d3_updateable(this.target,".conditional-wrap","div",this.data())
        .classed("conditional-wrap",true)

      var objects = d3_splat(wrap,".conditional","div",identity, function(x,i) { return i })
        .attr("class", function(x) { return x.value })
        .classed("conditional",true)
        .classed("hidden", function(x) { return !x.selected })


      Object.keys(classes).map(function(k) { 
        objects.classed(k,classes[k])
      })

      this._objects = objects


      return this
  
    }
  , each: function(fn) {
      this.draw()
      this._objects.each(fn)
      
    }
}
