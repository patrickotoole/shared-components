(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('state', ['exports'], factory) :
	(factory((global.state = global.state || {})));
}(this, (function (exports) { 'use strict';

function State(_current, _static) {

  this._noop = function () {};
  this._events = {};

  this._on = {
    "change": this._noop,
    "build": this._noop,
    "forward": this._noop,
    "back": this._noop
  };

  this._static = _static || {};

  this._current = _current || {};
  this._past = [];
  this._future = [];

  this._subscription = {};
  this._state = this._buildState();
}

State.prototype = {
  state: function state() {
    return Object.assign({}, this._state);
  },
  publish: function publish(name, cb) {

    var push_cb = function (error, value) {
      if (error) return subscriber(error, null);

      this.update(name, value);
      this.trigger(name, this.state()[name], this.state());
    }.bind(this);

    if (typeof cb === "function") cb(push_cb);else push_cb(false, cb);

    return this;
  },
  publishBatch: function publishBatch(obj) {
    Object.keys(obj).map(function (x) {
      this.update(x, obj[x]);
    }.bind(this));

    this.triggerBatch(obj, this.state());
  },
  push: function push(state) {
    this.publish(false, state);
    return this;
  },
  subscribe: function subscribe() {

    // three options for the arguments:
    // (fn) 
    // (id,fn)
    // (id.target,fn)


    if (typeof arguments[0] === "function") return this._global_subscribe(arguments[0]);
    if (arguments[0].indexOf(".") == -1) return this._named_subscribe(arguments[0], arguments[1]);
    if (arguments[0].indexOf(".") > -1) return this._targetted_subscribe(arguments[0].split(".")[0], arguments[0].split(".")[1], arguments[1]);
  },
  unsubscribe: function unsubscribe(id) {
    this.subscribe(id, undefined);
    return this;
  },

  _global_subscribe: function _global_subscribe(fn) {
    var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0,
          v = c == 'x' ? r : r & 0x3 | 0x8;
      return v.toString(16);
    }),
        to = "*";

    this._targetted_subscribe(id, to, fn);

    return this;
  },
  _named_subscribe: function _named_subscribe(id, fn) {
    var to = "*";
    this._targetted_subscribe(id, to, fn);

    return this;
  },
  _targetted_subscribe: function _targetted_subscribe(id, to, fn) {

    var subscriptions = this.get_subscribers_obj(to),
        to_state = this._state[to],
        state = this._state;

    if (arguments.length < 2 && fn === undefined) return subscriptions[id] || function () {};
    if (fn === undefined) {
      delete subscriptions[id];
      return this;
    }
    subscriptions[id] = fn;

    return this;
  },

  get_subscribers_obj: function get_subscribers_obj(k) {
    this._subscription[k] = this._subscription[k] || {};
    return this._subscription[k];
  },
  get_subscribers_fn: function get_subscribers_fn(k) {
    var fns = this.get_subscribers_obj(k),
        funcs = Object.keys(fns).map(function (x) {
      return fns[x];
    }),
        fn = function fn(error, value, state) {
      return funcs.map(function (g) {
        return g(error, value, state);
      });
    };

    return fn;
  },
  trigger: function trigger(name, _value, _state) {
    var subscriber = this.get_subscribers_fn(name) || function () {},
        all = this.get_subscribers_fn("*") || function () {};

    this.on("change")(name, _value, _state);

    subscriber(false, _value, _state);
    all(false, _state);
  },
  triggerBatch: function triggerBatch(obj, _state) {

    var all = this.get_subscribers_fn("*") || function () {},
        fns = Object.keys(obj).map(function (k) {
      var fn = this.get_subscribers_fn || function () {};
      return fn.bind(this)(k)(false, obj[k], _state);
    }.bind(this));

    all(false, _state);
  },
  _buildState: function _buildState() {
    this._state = Object.assign({}, this._current);

    Object.keys(this._static).map(function (k) {
      this._state[k] = this._static[k];
    }.bind(this));

    this.on("build")(this._state, this._current, this._static);

    return this._state;
  },
  update: function update(name, value) {
    this._pastPush(this._current);
    if (name) {
      var obj = {};
      obj[name] = value;
    }
    this._current = name ? Object.assign({}, this._current, obj) : Object.assign({}, this._current, value);

    this._buildState();

    return this;
  },
  setStatic: function setStatic(k, v) {
    if (k != undefined && v != undefined) this._static[k] = v;
    this._buildState();

    return this;
  },
  publishStatic: function publishStatic(name, cb) {

    var push_cb = function (error, value) {
      if (error) return subscriber(error, null);

      this._static[name] = value;
      this._buildState();
      this.trigger(name, this.state()[name], this.state());
    }.bind(this);

    if (typeof cb === "function") cb(push_cb);else push_cb(false, cb);

    return this;
  },
  _pastPush: function _pastPush(v) {
    this._past.push(v);
  },
  _futurePush: function _futurePush(v) {
    this._future.push(v);
  },
  forward: function forward() {
    this._pastPush(this._current);
    this._current = this._future.pop();

    this.on("forward")(this._current, this._past, this._future);

    this._state = this._buildState();
    this.trigger(false, this._state, this._state);
  },
  back: function back() {
    this._futurePush(this._current);
    this._current = this._past.pop();

    this.on("back")(this._current, this._future, this._past);

    this._state = this._buildState();
    this.trigger(false, this._state, this._state);
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || this._noop;
    this._on[action] = fn;
    return this;
  },
  registerEvent: function registerEvent(name, fn) {
    if (fn === undefined) return this._events[name] || this._noop;
    this._events[name] = fn;
    return this;
  },
  prepareEvent: function prepareEvent(name) {
    var fn = this._events[name];
    return fn.bind(this);
  },
  dispatchEvent: function dispatchEvent(name, data) {
    var fn = this.prepareEvent(name);
    fn(data);
    return this;
  }

};

function state(_current, _static) {
  return new State(_current, _static);
}

state.prototype = State.prototype;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function QS(state) {
    //this.state = state
    var self = this;

    this._encodeObject = function (o) {
        return JSON.stringify(o);
    };

    this._encodeArray = function (o) {
        return JSON.stringify(o);
    };
}

// LZW-compress a string
function lzw_encode(s) {
    var dict = {};
    var data = (s + "").split("");
    var out = [];
    var currChar;
    var phrase = data[0];
    var code = 256;
    for (var i = 1; i < data.length; i++) {
        currChar = data[i];
        if (dict[phrase + currChar] != null) {
            phrase += currChar;
        } else {
            out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
            dict[phrase + currChar] = code;
            code++;
            phrase = currChar;
        }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    for (var i = 0; i < out.length; i++) {
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
    for (var i = 1; i < data.length; i++) {
        var currCode = data[i].charCodeAt(0);
        if (currCode < 256) {
            phrase = data[i];
        } else {
            phrase = dict[currCode] ? dict[currCode] : oldPhrase + currChar;
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
    to: function to(state, encode) {
        var self = this;

        var params = Object.keys(state).map(function (k) {

            var value = state[k],
                o = value;

            if (value && (typeof value === "undefined" ? "undefined" : _typeof(value)) == "object" && value.length > 0) {
                o = self._encodeArray(value);
            } else if ((typeof value === "undefined" ? "undefined" : _typeof(value)) == "object") {
                o = self._encodeObject(value);
            }

            return k + "=" + encodeURIComponent(o);
        });

        if (encode) return "?" + "encoded=" + btoa(escape(lzw_encode(params.join("&"))));
        return "?" + params.join("&");
    },
    from: function from(qs) {
        var query = {};
        if (qs.indexOf("?encoded=") == 0) qs = lzw_decode(unescape(atob(qs.split("?encoded=")[1])));
        var a = qs.substr(1).split('&');
        for (var i = 0; i < a.length; i++) {
            var b = a[i].split('=');

            query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
            var _char = query[decodeURIComponent(b[0])][0];
            if (_char == "{" || _char == "[") query[decodeURIComponent(b[0])] = JSON.parse(query[decodeURIComponent(b[0])]);
        }
        return query;
    }
};

function qs(state) {
    return new QS(state);
}

qs.prototype = QS.prototype;

function comparison_eval(obj1, obj2, _final) {
  return new ComparisonEval(obj1, obj2, _final);
}

var noop = function noop(x) {};
var eqop = function eqop(x, y) {
  return x == y;
};
var acc = function acc(name, second) {
  return function (x, y) {
    return second ? y[name] : x[name];
  };
};

var ComparisonEval = function () {
  function ComparisonEval(obj1, obj2, _final) {
    classCallCheck(this, ComparisonEval);

    this._obj1 = obj1;
    this._obj2 = obj2;
    this._final = _final;
    this._comparisons = {};
  }

  createClass(ComparisonEval, [{
    key: "accessor",
    value: function accessor(name, acc1, acc2) {
      this._comparisons[name] = Object.assign({}, this._comparisons[name], {
        acc1: acc1,
        acc2: acc2
      });
      return this;
    }
  }, {
    key: "success",
    value: function success(name, fn) {
      this._comparisons[name] = Object.assign({}, this._comparisons[name], {
        success: fn
      });
      return this;
    }
  }, {
    key: "failure",
    value: function failure(name, fn) {
      this._comparisons[name] = Object.assign({}, this._comparisons[name], {
        failure: fn
      });
      return this;
    }
  }, {
    key: "equal",
    value: function equal(name, fn) {
      this._comparisons[name] = Object.assign({}, this._comparisons[name], {
        eq: fn
      });
      return this;
    }
  }, {
    key: "evaluate",
    value: function evaluate() {
      var _this = this;

      Object.keys(this._comparisons).map(function (k) {
        _this._eval(_this._comparisons[k], k);
      });
      return this._final;
    }
  }, {
    key: "comparsion",
    value: function comparsion(name, acc1, acc2, eq, success, failure) {
      this._comparisons[name] = {
        acc1: acc1,
        acc2: acc2,
        eq: eq || eqop,
        success: success || noop,
        failure: failure || noop
      };
      return this;
    }
  }, {
    key: "_eval",
    value: function _eval(comparison, name) {
      var acc1 = comparison.acc1 || acc(name),
          acc2 = comparison.acc2 || acc(name, true),
          val1 = acc1(this._obj1, this._obj2),
          val2 = acc2(this._obj1, this._obj2),
          eq = comparison.eq || eqop,
          succ = comparison.success || noop,
          fail = comparison.failure || noop;

      var _evald = eq(val1, val2);

      _evald ? succ.bind(this)(val1, val2, this._final) : fail.bind(this)(val1, val2, this._final);
    }
  }]);
  return ComparisonEval;
}();

var s = window.__state__ || state();
window.__state__ = s;

exports.s = s;
exports['default'] = s;
exports.state = state;
exports.qs = qs;
exports.comp_eval = comparison_eval;

Object.defineProperty(exports, '__esModule', { value: true });

})));
