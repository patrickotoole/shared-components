import accessor from './helpers'
import email from './step/email'
import domain from './step/domain'


export function Signup(target) {
  this._target = target;
  this._wrapper = this._target;
}

export default function signup(target) {
  return new Signup(target)
}

Signup.prototype = {
    draw: function() {
      this._target

      var shared_data = this._data;

      var e = domain(this._target)
        .data(shared_data)
        .draw()

      return this
    }
  , data: function(val) { return accessor.bind(this)("data",val) }
}
