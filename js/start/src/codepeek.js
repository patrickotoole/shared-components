import render_bar from './codepeek/render_bar'
import render_code from './codepeek/render_code'
import render_wrapper from './codepeek/render_wrapper'
import render_button from './button/render_button'

function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function Codepeek(target) {
  this._target = target;
  this._wrapper = this._target;
  return 1
}

export default function codepeek(target) {
  return new Codepeek(target)
}

Codepeek.prototype = {
    draw: function() {
      this._target

      this.render_wrapper()
      this.render_bar()
      this.render_code()
      this.render_button()
      this.render_left()
      this.render_right()

      return this
    }
  , render_bar: render_bar
  , render_code: render_code
  , render_wrapper: render_wrapper
  , render_button: render_button
  , render_left: function(){}
  , render_right: function() {}

  , data: function(val) { return accessor.bind(this)("data",val) }
  , code: function(val) { return accessor.bind(this)("code",val) }
  , button: function(val) { return accessor.bind(this)("button",val) }
  , click: function(val) { return accessor.bind(this)("click",val) }


}
