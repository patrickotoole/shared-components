export function State(target) {

  this._target = target
  this._state = {}
  this._subscription = {}
  this._step = 0

}

State.prototype = {
    publish: function(name,v) {

       var subscriber = this.get_subscribers_fn(name) || function() {}
         , all = this.get_subscribers_fn("*") || function() {};

       var push = function(error,value) {
         if (error) return subscriber(error,null)
         
         this.set(name, value)
         subscriber(false,this._state[name],state)
         all(false,this._state)

       }.bind(this)

       if (typeof v === "function") v(push)
       else push(false,v)

       return this
    }
  , subscribe: function(id,fn) {
      var id = id, to = "*", fn = fn;

      if (arguments.length == 3) {
        id = arguments[0]
        to = arguments[1]
        fn = arguments[2]
      }

      if (fn === undefined) return subscriptions[id] || function() {};


      var subscriptions = this.get_subscribers_obj(to)
        , to_state = this._state[to]
        , state = this._state;

      subscriptions[id] = fn;

      if (to == "*") fn(false,state)
      else if (to_state) fn(false,to_state,state)

      return this
     
    }
  , set: function(k,v) {
      if (k != undefined && v != undefined) this._state[k] = v
      return this
    }
  , get_subscribers_obj: function(k) {
      this._subscription[k] = this._subscription[k] || {}
      return this._subscription[k]
    }
  , get_subscribers_fn: function(k) {
      var fns = this.get_subscribers_obj(k)
        , funcs = Object.keys(fns).map(function(x) { return fns[x] })
        , fn = function(error,value,state) {
            return funcs.map(function(g) { return g(error,value,state) })
          }

      return fn
    }
}

function state(target) {
  return new State(target)
}

state.prototype = State.prototype

export default state;
