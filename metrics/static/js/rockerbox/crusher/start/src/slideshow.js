
function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function Slideshow(target) {
  this._target = target;
  this._wrapper = this._target;

  return 1
}

export default function slideshow(target) {
  return new Slideshow(target)
}

Slideshow.prototype = {
    draw: function() {
      this._target

      d3_updateable(this._target,".slideshow","div")
        .classed("slideshow",true)

      this._slides = d3_splat(this._target,".slide","div",this._data,function(x,i){ return i })
        .classed("slide",true)

      return this
    }

  , data: function(val) { return accessor.bind(this)("data",val) }
  , title: function(val) { return accessor.bind(this)("title",val) }
  , slides: function(val) { return accessor.bind(this)("slides",val) }

}
