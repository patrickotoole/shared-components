import accessor from './helpers'

export function Takeover(target) {
  this._target = target;
}

export default function takeover(target) {
  return new Takeover(target)
}

Takeover.prototype = {
    draw: function() {
      this._target = d3.select("body")
      var self = this;

      this._wrapper = d3_updateable(this._target,".takeover-grey","div")
        .classed("takeover-grey",true)
        .style("top","0px")
        .style("z-index","1000")
        .style("width","100%")
        .style("height","100%")
        .style("background-color","rgba(0,0,0,.5)")
        .style("position","fixed")
        .style("display", "block")
        .on("click",function() {
          d3.event.preventDefault()
          self._wrapper.remove()
        })

      this._takeover = d3_updateable(this._wrapper,".takeover","div")
        .classed("takeover",true)
        .style("width","40%")
        .style("min-width","300px")
        .style("min-height","300px")
        .style("margin-right","auto")
        .style("margin-left","auto")
        .style("display","block")
        .style("background-color","white")
        .style("margin-top","12.5%")
        .on("click",function() {
          d3.event.stopPropagation()
          d3.event.preventDefault()
        })

      return this
    }
  , text: function(val) { return accessor.bind(this)("text",val) }
  , update: function(val) {
      this.text(val)
      this.draw()
    }
  , remove: function() {
      this._wrapper.remove()
    }
}
