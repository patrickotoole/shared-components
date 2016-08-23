
export function Share(target) {
  this._target = target
  this._inner = function() {}
}

export default function share(target) {
  return new Share(target)
}

Share.prototype = {
    draw: function() {
      var self = this;

      var overlay = d3_updateable(this._target,".overlay","div")
        .classed("overlay",true)
        .style("width","100%")
        .style("height","100%")
        .style("position","fixed")
        .style("top","0px")
        .style("background","rgba(0,0,0,.5)")
        .on("click",function() {
          overlay.remove()
        })

      this._overlay = overlay;

      var center = d3_updateable(overlay,".popup","div")
        .classed("popup col-md-5 col-sm-8",true)
        .style("margin-left","auto")
        .style("margin-right","auto")
        .style("min-height","300px")
        .style("margin-top","150px")
        .style("background-color","white")
        .style("float","none")
        .on("click",function() {
          d3.event.stopPropagation()
        })
        .each(function(x) {
          self._inner(d3.select(this))
        })

      return this
    }
  , inner: function(fn) {
      this._inner = fn.bind(this)
      this.draw()
      return this
    }
  , hide: function() {
      this._overlay.remove()
      return this 
    }
}
