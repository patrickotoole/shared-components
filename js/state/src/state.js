export function State(_current, _static) {

  this._noop = function() {}
  this._events = {}

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
    state: function() {
      return Object.assign({},this._state)
    }
  , publish: function(name,cb) {

       var push_cb = function(error,value) {
         if (error) return subscriber(error,null)
         
         this.update(name, value)
         this.trigger(name, this.state()[name], this.state())

       }.bind(this)

       if (typeof cb === "function") cb(push_cb)
       else push_cb(false,cb)

       return this
    }
  , publishBatch: function(obj) {
      Object.keys(obj).map(function(x) {
        this.update(x,obj[x])
      }.bind(this))

      this.triggerBatch(obj,this.state())
    }
  , push: function(state) {
      this.publish(false,state)
      return this
    }
  , subscribe: function() {

      // three options for the arguments:
      // (fn) 
      // (id,fn)
      // (id.target,fn)


      if (typeof arguments[0] === "function") return this._global_subscribe(arguments[0])
      if (arguments[0].indexOf(".") == -1) return this._named_subscribe(arguments[0], arguments[1])
      if (arguments[0].indexOf(".") > -1) return this._targetted_subscribe(arguments[0].split(".")[0], arguments[0].split(".")[1], arguments[1])

    }
  , unsubscribe: function(id) {
      this.subscribe(id,undefined)
      return this
    }

  , _global_subscribe: function(fn) {
      var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
        })
      , to = "*";
     
      this._targetted_subscribe(id,to,fn)

      return this
    }
  , _named_subscribe: function(id,fn) {
      var to = "*"
      this._targetted_subscribe(id,to,fn)

      return this
    }
  , _targetted_subscribe: function(id,to,fn) {

      var subscriptions = this.get_subscribers_obj(to)
        , to_state = this._state[to]
        , state = this._state;

      if (arguments.length < 2 && fn === undefined) return subscriptions[id] || function() {};
      if (fn === undefined) {
        delete subscriptions[id]
        return this
      }
      subscriptions[id] = fn;

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
  , triggerBatch: function(obj, _state) {

      var all = this.get_subscribers_fn("*") || function() {}
        , fns = Object.keys(obj).map(function(k) { 
            var fn = this.get_subscribers_fn || function() {}
            return fn.bind(this)(k)(false,obj[k],_state)  
          }.bind(this))
      
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
  , publishStatic: function(name,cb) {

      var push_cb = function(error,value) {
        if (error) return subscriber(error,null)
        
        this._static[name] = value
        this._buildState()
        this.trigger(name, this.state()[name], this.state())

      }.bind(this)

      if (typeof cb === "function") cb(push_cb)
      else push_cb(false,cb)

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
  , registerEvent: function(name,fn) {
      if (fn === undefined) return this._events[name] || this._noop;
      this._events[name] = fn;
      return this
    }
  , prepareEvent: function(name) {
      var fn = this._events[name] 
      return fn.bind(this)
    }
  , dispatchEvent: function(name,data) {
      var fn = this.prepareEvent(name)
      fn(data)
      return this
    }

}

function state(_current, _static) {
  return new State(_current, _static)
}

state.prototype = State.prototype

export default state;
