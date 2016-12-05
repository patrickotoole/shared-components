export function State(_current, _static) {

  this._noop = function() {}

  this._on = {
      "change": this._noop
    , "build": this._noop
    , "forward": this._noop
    , "back": this._noop
  }

  this._static = _static || {}

  this._current = _current || {}
  this._past = []
  this._future = []

  this._subscription = {}
  this._state = this._buildState()


}

State.prototype = {
    publish: function(name,v) {

       var push = function(error,value) {
         if (error) return subscriber(error,null)
         
         this.update(name, value)
         this.trigger(name, this._state[name], this._state)

       }.bind(this)

       if (typeof v === "function") v(push)
       else push(false,v)

       return this
    }
  , push: function(state) {
      this.publish(false,state)
      return this
    }
  , unsubscribe: function(id) {
      this.subscribe(id,undefined)
      return this
    }
  , subscribe: function(id,fn) {
      var split = id.split(".")
        , id = split[0]
        , to = (split.length > 1) ? split[1]: "*"
        , fn = fn;

      var subscriptions = this.get_subscribers_obj(to)
        , to_state = this._state[to]
        , state = this._state;

      if (arguments.length < 2 && fn === undefined) return subscriptions[id] || function() {};
      if (fn === undefined) {
        delete subscriptions[id]
        return this
      }
      subscriptions[id] = fn;

      //if (to == "*") fn(false,state)
      //else if (to_state) fn(false,to_state,state)

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
  , trigger: function(name, _value, _state) {
      var subscriber = this.get_subscribers_fn(name) || function() {}
        , all = this.get_subscribers_fn("*") || function() {};

      this.on("change")(name,_value,_state)

      subscriber(false,_value,_state)
      all(false,_state)
    }

  , _buildState: function() {
      this._state = Object.assign({},this._current)

      Object.keys(this._static).map(function(k) { 
        this._state[k] = this._static[k]
      }.bind(this))

      this.on("build")(this._state, this._current, this._static)

      return this._state
    }
  , update: function(name, value) {
      this._pastPush(this._current)
      if (name) {
        var obj = {}
        obj[name] = value;
      }
      this._current = (name) ? 
        Object.assign({}, this._current, obj) :
        Object.assign({}, this._current, value )

      this._buildState()

      return this
    }
  , setStatic: function(k,v) {
      if (k != undefined && v != undefined) this._static[k] = v
      this._buildState()

      return this
    }

  , _pastPush: function(v) {
      this._past.push(v)
    }
  , _futurePush: function(v) {
      this._future.push(v)
    }
  , forward: function() {
      this._pastPush(this._current)
      this._current = this._future.pop()

      this.on("forward")(this._current,this._past, this._future)

      this._state = this._buildState()
      this.trigger(false, this._state, this._state)
    }
  , back: function() {
      this._futurePush(this._current)
      this._current = this._past.pop()

      this.on("back")(this._current,this._future, this._past)

      this._state = this._buildState()
      this.trigger(false, this._state, this._state)
    }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || this._noop;
      this._on[action] = fn;
      return this
    } 
  
}

function state(_current, _static) {
  return new State(_current, _static)
}

state.prototype = State.prototype

export default state;
