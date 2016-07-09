import accessor from './helpers'

export function Progress(target) {
  this._target = target;
}

export default function progress(target) {
  return new Progress(target)
}

Progress.prototype = {
    draw: function() {
      this._target

      this._progress = d3_updateable(this._target,".progress","div")
        .classed("progress",true)

      return this
    }
  , slideshow: function(val) { return accessor.bind(this)("slideshow",val) }
  , text: function(val) { return accessor.bind(this)("text",val) }
  , update: function(val) {
      this.text(val)
      this.draw()
    }
}
