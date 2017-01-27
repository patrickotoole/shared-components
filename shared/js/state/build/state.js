(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('state', ['exports'], factory) :
  factory((global.state = {}));
}(this, function (exports) { 'use strict';

  function State(_current, _static) {

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
      publish: function(name,cb) {

         var push_cb = function(error,value) {
           if (error) return subscriber(error,null)
           
           this.update(name, value)
           this.trigger(name, this._state[name], this._state)

         }.bind(this)

         if (typeof cb === "function") cb(push_cb)
         else push_cb(false,cb)

         return this
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
          this.trigger(name, this._state[name], this._state)

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
    
  }

  function state(_current, _static) {
    return new State(_current, _static)
  }

  state.prototype = State.prototype

  function QS(state) {
    //this.state = state
    var self = this;

    this._encodeObject = function(o) {
      return JSON.stringify(o)
    }

    this._encodeArray = function(o) {
      return JSON.stringify(o)
    }
  }

  // LZW-compress a string
  function lzw_encode(s) {
      var dict = {};
      var data = (s + "").split("");
      var out = [];
      var currChar;
      var phrase = data[0];
      var code = 256;
      for (var i=1; i<data.length; i++) {
          currChar=data[i];
          if (dict[phrase + currChar] != null) {
              phrase += currChar;
          }
          else {
              out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
              dict[phrase + currChar] = code;
              code++;
              phrase=currChar;
          }
      }
      out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
      for (var i=0; i<out.length; i++) {
          out[i] = String.fromCharCode(out[i]);
      }
      return out.join("");
  }

  // Decompress an LZW-encoded string
  function lzw_decode(s) {
      var dict = {};
      var data = (s + "").split("");
      var currChar = data[0];
      var oldPhrase = currChar;
      var out = [currChar];
      var code = 256;
      var phrase;
      for (var i=1; i<data.length; i++) {
          var currCode = data[i].charCodeAt(0);
          if (currCode < 256) {
              phrase = data[i];
          }
          else {
             phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
          }
          out.push(phrase);
          currChar = phrase.charAt(0);
          dict[code] = oldPhrase + currChar;
          code++;
          oldPhrase = phrase;
      }
      return out.join("");
  }

  QS.prototype = {
      to: function(state) {
        var self = this

        var params = Object.keys(state).map(function(k) {

          var value = state[k]
            , o = value;

          if (value && (typeof(value) == "object") && (value.length > 0)) {
            o = self._encodeArray(value)
          } else if (typeof(value) == "object") {
            o = self._encodeObject(value)
          } 

          return k + "=" + encodeURIComponent(o) 

        })

        return "?" + "encoded=" + btoa(escape(lzw_encode(params.join("&"))));
        
      }
    , from: function(qs) {
        var query = {};
        if (qs.indexOf("?encoded=") == 0) qs = lzw_decode(unescape(atob(qs.split("?encoded=")[1])))
        var a = qs.substr(1).split('&');
        for (var i = 0; i < a.length; i++) {
            var b = a[i].split('=');
            
            query[decodeURIComponent(b[0])] = (decodeURIComponent(b[1] || ''));
            var _char = query[decodeURIComponent(b[0])][0] 
            if ((_char == "{") || (_char == "[")) query[decodeURIComponent(b[0])] = JSON.parse(query[decodeURIComponent(b[0])])
        }
        return query;
      }
  }

  function qs(state) {
    return new QS(state)
  }

  qs.prototype = QS.prototype

  var version = "0.0.1";

  exports.version = version;
  exports.state = state;
  exports.qs = qs;

}));