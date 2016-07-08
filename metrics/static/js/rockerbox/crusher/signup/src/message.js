import accessor from './helpers'

export function Message(target) {
  this._target = target;
}

export default function message(target) {
  return new Message(target)
}

Message.prototype = {
    draw: function() {
      this._target

      this._message = d3_updateable(this._target,".message","div")
        .classed("message",true)
        .text(this._text)

      return this
    }
  , text: function(val) { return accessor.bind(this)("text",val) }
  , update: function(val) {
      this.text(val)
      this.draw()
    }
}
