
function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function Slideshow(target) {
  this._target = target;
  this._wrapper = this._target;

  this._viscount = 0

  return 1
}

export default function slideshow(target) {
  return new Slideshow(target)
}

Slideshow.prototype = {
    draw: function() {
      this._target

      this._wrapper = d3_updateable(this._target,".slideshow","div")
        .classed("slideshow",true)

      var self = this;
      var data = this._data.slice(0,self._viscount + 1);
      self._viscount -= 1;
      self._viscount = d3.max([0,self._viscount]);

      this._slides = d3_splat(this._wrapper,".slide","div",data,function(x,i){ return i })
        .attr("class",function(x,i) {
          return (i == self._viscount) ? undefined : "hidden"
        })
        .classed("slide",true)

      this._slides
        .each(function(x,i){
          return x.bind(this)(x,i)
        })

      return this
    }
  , next: function() {

      var self = this;
      self._viscount += 1;
      this.draw()
      


      var current = this._slides.filter(function(x){return !d3.select(this).classed("hidden")})
      var h = -current.node().clientHeight

      var t0 = current.transition()
        .duration(500)

      t0.style("margin-top",(h-15) + "px")
        .transition()
        .duration(500)

        .each("end",function(){
          current.style("margin-top",undefined)
          d3.select(this).classed("hidden",true)
        })

      self._viscount += 1
      this._slides
        .attr("class",function(x,i) { 
          return (i == self._viscount) || ((i+1) == self._viscount) ? "slide" : "hidden slide" 
        })
        .classed("slide",true)
      
    }
  , previous: function() {

      var self = this;
      self._viscount -= 1;

      var previous = this._slides.filter(function(x,i){return i == self._viscount})
        .style("position","absolute")
        .style("top","-10000px")
        .classed("hidden",false)

      var h = -previous.node().clientHeight

      previous
        .style("position",undefined)
        .style("top",undefined)
        .classed("hidden",true)

      previous.style("margin-top",(h) + "px")
        .classed("hidden",false)

      var t0 = previous.transition()
        .duration(500)

      t0.style("margin-top",0 + "px")
        .each("end",function(){
          previous.style("margin-top",undefined)
          self._slides.filter(function(x,i){return (i-1) == self._viscount}).classed("hidden",true)
        })

      
    }
  , data: function(val) { return accessor.bind(this)("data",val) }
  , title: function(val) { return accessor.bind(this)("title",val) }
  , slides: function(val) { return accessor.bind(this)("slides",val) }

}
