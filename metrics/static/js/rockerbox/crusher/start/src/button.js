import render_button from './button/render_button'

function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function Button(target) {
  this._pane = target;
  return 1
}

export default function button(target) {
  return new Button(target)
}

Button.prototype = {
    draw: function() {
      debugger
      this.render_button()

      return this
    }
  , render_button: render_button
  , button: function(val) { return accessor.bind(this)("button",val) }
  , click: function(val) { return accessor.bind(this)("click",val) }

}
