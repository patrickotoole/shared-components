import render_description from './envelope/render_description'
import render_rows from './envelope/render_rows'
import render_title from './envelope/render_title'
import render_wrapper from './envelope/render_wrapper'
import render_button from './button/render_button'



function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function Envelope(target) {
  this._target = target;
  this._wrapper = this._target;
  return 1
}

export default function envelope(target) {
  return new Envelope(target)
}

Envelope.prototype = {
    draw: function() {
      this._target

      this.render_wrapper()
      this.render_title()
      this.render_description()
      this.render_rows()
      this.render_button()

      return this
    }

  , render_wrapper: render_wrapper
  , render_title: render_title
  , render_description: render_description
  , render_rows: render_rows
  , render_button: render_button

  , data: function(val) { return accessor.bind(this)("data",val) }
  , click: function(val) { return accessor.bind(this)("click",val) }
  , title: function(val) { return accessor.bind(this)("title",val) }
  , button: function(val) { return accessor.bind(this)("button",val) }
  , description: function(val) { return accessor.bind(this)("description",val) }

}
