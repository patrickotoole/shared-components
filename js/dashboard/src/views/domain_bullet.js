import {d3_updateable, d3_splat} from 'helpers'
import accessor from '../helpers'

export function DomainBullet(target) {
  this._on = {}
  this.target = target
}

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }


export default function domain_bullet(target) {
  return new DomainBullet(target)
}

DomainBullet.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , max: function(val) {
      return accessor.bind(this)("max",val) 
    }
  , draw: function() {

      var width = (this.target.style("width").replace("px","") || this.offsetWidth) - 50
        , height = 28;

      var x = d3.scale.linear()
        .range([0, width])
        .domain([0, this.max()])

      if (this.target.text()) this.target.text("")

      var bullet = d3_updateable(this.target,".bullet","div",this.data(),function(x) { return 1 })
        .classed("bullet",true)
        .style("margin-top","3px")

      var svg = d3_updateable(bullet,"svg","svg",false,function(x) { return 1})
        .attr("width",width)
        .attr("height",height)
  
   
      d3_updateable(svg,".bar-1","rect",false,function(x) { return 1})
        .classed("bar-1",true)
        .attr("x",0)
        .attr("width", function(d) {return x(d.pop_percent) })
        .attr("height", height)
        .attr("fill","#888")
  
      d3_updateable(svg,".bar-2","rect",false,function(x) { return 1})
        .classed("bar-2",true)
        .attr("x",0)
        .attr("y",height/4)
        .attr("width", function(d) {return x(d.sample_percent_norm) })
        .attr("height", height/2)
        .attr("fill","rgb(8, 29, 88)")

      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}
