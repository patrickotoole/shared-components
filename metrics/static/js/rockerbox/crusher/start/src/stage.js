import render_wrapper from './stage/render_wrapper'
import render_header from './stage/render_header'
import render_main from './stage/render_main'



function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function Stage(target) {
  this._target = target;
  this._wrapper = this._target;
  this._title = "Welcome to Rockerbox"
  this._subtitle = "Getting started is easy. Copy and paste the pixel below to the <head> section of your website."

  return 1
}

export default function stage(target) {
  return new Stage(target)
}

Stage.prototype = {
    draw: function() {
      this._target

      this.render_wrapper()
      this.render_header()
      this.render_main()


      return this
    }
  , render_wrapper: render_wrapper
  , render_header: render_header

  , render_main: render_main

  , data: function(val) { return accessor.bind(this)("data",val) }
  , title: function(val) { return accessor.bind(this)("title",val) }
  , subtitle: function(val) { return accessor.bind(this)("subtitle",val) }

}
