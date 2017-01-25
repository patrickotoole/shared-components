export function Transform(target) {
  this._target = target
  this._on = {}
}

Transform.prototype = {
    draw: function() {}
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
}

function transform(target) {
  return new Transform(target)
}

transform.prototype = Transform.prototype

export default transform;
