(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.dashboard = global.dashboard || {})));
}(this, (function (exports) {

function __$styleInject(css, returnValue) {
  if (typeof document === 'undefined') {
    return returnValue;
  }
  css = css || '';
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';
  head.appendChild(style);
  
  if (style.styleSheet){
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  return returnValue;
}

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









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var d3_updateable = function d3_updateable(target, selector, type, data, joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(function (x) {
    return data ? [data] : [x];
  }, joiner || function (x) {
    return [x];
  });

  updateable.enter().append(type);

  return updateable;
};

var d3_splat = function d3_splat(target, selector, type, data, joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(data || function (x) {
    return x;
  }, joiner || function (x) {
    return x;
  });

  updateable.enter().append(type);

  return updateable;
};

function d3_class(target, cls, type, data) {
  return d3_updateable(target, "." + cls, type || "div", data).classed(cls, true);
}

function noop$2() {}
function identity(x) {
  return x;
}


function accessor(attr, val) {
  if (val === undefined) return this["_" + attr];
  this["_" + attr] = val;
  return this;
}

var D3ComponentBase = function () {
  function D3ComponentBase(target) {
    var _this = this;

    classCallCheck(this, D3ComponentBase);

    this._target = target;
    this._on = {};
    this.props().map(function (x) {
      _this[x] = accessor.bind(_this, x);
    });
  }

  createClass(D3ComponentBase, [{
    key: "props",
    value: function props() {
      return ["data"];
    }
  }, {
    key: "on",
    value: function on(action, fn) {
      if (fn === undefined) return this._on[action] || noop$2;
      this._on[action] = fn;
      return this;
    }
  }]);
  return D3ComponentBase;
}();

__$styleInject(".scrollbox {\n  /*border-top:1px solid #ccc;*/\n  padding-top:12px;\n  padding-left:5px;\n}\n\n.scrollbox:first-of-type {\n  /*border-right:1px solid #ccc;*/\n}\n\n.inner > select, .inner > input {\n  height: 36px;\n  vertical-align:top\n}\n.selectize-control.multi {\n  display: inline-block\n}\n.selectize-dropdown.multi {\n  padding:5px;\n}\n.expanded thead tr {\n  height:28px;\n  background:none\n}\n\n.expanded .table-wrapper tr { height:28px }\n\n\n.inner .header-wrap, .inner select { flex: 1}\n\n.head-wrap {\n  height: 150px;\n  border-bottom:1px solid #ddd\n}\nbody {\n  padding-top:0px;\n}\nbody > .container {\n  margin-left: 0px;\n}\n.body-wrap {\n  overflow:hidden\n}\n.head-wrap .item, .body-wrap .item {\n  display:table-cell;\n  width:50px;\n  height:50px;\n  position:relative;\n  vertical-align:top\n}\n\n.head-wrap .item {\n  display:table-cell;\n  width:50px;\n  height:150px;\n  position:relative\n}\n\n.tabular-wrapper {\n  width:900px\n}\n\n.head-wrap .item span {\n  transform: rotate(-45deg);\n  display: block;\n  position: absolute;\n  bottom: 50px;\n  width: 155px;\n  text-transform: uppercase;\n  font-size: .85em;\n  font-weight: normal;\n  border-bottom: solid 1px #DDD;\n  line-height: 30px;\n  right: -120px;\n}\n.versus {\n\n  margin-top:10px;\n  margin-right:10px;\n  display:inline-block;\n\n  padding:10px;\n  border-radius:10px;\n  border: 1px solid #ccc;\n}\na.versus:hover {\n  text-decoration:none;\n\n}\n\n.versus.selected, .square.selected {\n  background-color:white\n}\n\n.axis { opacity:.7; font-size:10px }\n.hidden { display:none }\n", undefined);

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

function state$1(_current, _static) {
  return new State(_current, _static);
}

state$1.prototype = State.prototype;

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

var noop$3 = function noop(x) {};
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
        success: success || noop$3,
        failure: failure || noop$3
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
          succ = comparison.success || noop$3,
          fail = comparison.failure || noop$3;

      var _evald = eq(val1, val2);

      _evald ? succ.bind(this)(val1, val2, this._final) : fail.bind(this)(val1, val2, this._final);
    }
  }]);
  return ComparisonEval;
}();

var s = window.__state__ || state$1();
window.__state__ = s;

//import d3 from 'd3'

/* FROM OTHER FILE */

function buildDomains(data) {

  var categories = data.display_categories.values.filter(function (a) {
    return a.selected;
  }).map(function (a) {
    return a.key;
  });

  var idf = d3.nest().key(function (x) {
    return x.domain;
  }).rollup(function (x) {
    return x[0].idf;
  }).map(data.full_urls.filter(function (x) {
    return x.parent_category_name != "Internet & Telecom";
  }));

  var getIDF = function getIDF(x) {
    return idf[x] == "NA" || idf[x] > 8686 ? 0 : idf[x];
  };

  var values = data.full_urls.map(function (x) {
    return {
      "key": x.domain,
      "value": x.count,
      "parent_category_name": x.parent_category_name,
      "uniques": x.uniques,
      "url": x.url
    };
  });

  values = d3.nest().key(function (x) {
    return x.key;
  }).rollup(function (x) {
    return {
      "parent_category_name": x[0].parent_category_name,
      "key": x[0].key,
      "value": x.reduce(function (p, c) {
        return p + c.value;
      }, 0),
      "percent_unique": x.reduce(function (p, c) {
        return p + c.uniques / c.value;
      }, 0) / x.length,
      "urls": x.reduce(function (p, c) {
        p.indexOf(c.url) == -1 ? p.push(c.url) : p;return p;
      }, [])

    };
  }).entries(values).map(function (x) {
    return x.values;
  });

  if (categories.length > 0) values = values.filter(function (x) {
    return categories.indexOf(x.parent_category_name) > -1;
  });

  values.map(function (x) {
    x.tf_idf = getIDF(x.key) * (x.value * x.percent_unique) * (x.value * x.percent_unique);
    x.count = x.value;
    x.value = Math.log(x.tf_idf);
  });
  values = values.sort(function (p, c) {
    return c.tf_idf - p.tf_idf;
  });

  var total = d3.sum(values, function (x) {
    return x.count * x.percent_unique;
  });

  values.map(function (x) {
    x.pop_percent = 1.02 / getIDF(x.key) * 100;
    x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent;

    x.percent = x.count * x.percent_unique / total * 100;
  });

  var norm = d3.scale.linear().range([0, d3.max(values, function (x) {
    return x.pop_percent;
  })]).domain([0, d3.max(values, function (x) {
    return x.percent;
  })]).nice();

  values.map(function (x) {
    x.percent_norm = norm(x.percent);
    //x.percent_norm = x.percent
  });

  return values;
  //{
  //    key: "Top Domains"
  //  , values: values.slice(0,100)
  //}
}

/* END FROM OTHER FILE */

function d3_updateable$1(target, selector, type, data, joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(function (x) {
    return data ? [data] : [x];
  }, joiner || function (x) {
    return [x];
  });

  updateable.enter().append(type);

  return updateable;
}

function d3_splat$1(target, selector, type, data, joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(data || function (x) {
    return x;
  }, joiner || function (x) {
    return x;
  });

  updateable.enter().append(type);

  return updateable;
}



function MediaPlan(target) {
  this._target = target;
  this._on = {};
}

function media_plan(target) {
  return new MediaPlan(target);
}

function transformData(data) {

  var ch = data.category_hour.filter(function (x) {
    return x.parent_category_name != "NA";
  });

  var category_hour = d3.nest().key(function (x) {
    return x.parent_category_name + "," + x.hour;
  }).rollup(function (v) {
    return v.reduce(function (p, c) {
      p.uniques = (p.uniques || 0) + c.uniques;
      p.count = (p.count || 0) + c.count;

      return p;
    }, {});
  }).entries(ch).map(function (x) {
    return {
      "category": x.key.split(",")[0],
      "hour": x.key.split(",")[1],
      "count": x.values.count,
      "uniques": x.values.uniques
    };
  });

  var scaled = d3.nest().key(function (x) {
    return x.category;
  }).rollup(function (v) {
    var min = d3.min(v, function (x) {
      return x.count;
    }),
        max = d3.max(v, function (x) {
      return x.count;
    });

    var scale = d3.scale.linear().domain([min, max]).range([0, 100]);

    var hours = d3.range(0, 24);
    hours = hours.slice(-4, 24).concat(hours.slice(0, 20)); //.slice(3).concat(hours.slice(0,3))

    return {
      "normed": hours.map(function (i) {
        return v[i] ? scale(v[i].count) : 0;
      }),
      "count": hours.map(function (i) {
        return v[i] ? v[i].count : 0;
      })
      //return hourly
    };
  }).entries(category_hour).map(function (x) {
    x.total = d3.sum(x.values);return x;
  });
  //.sort(function(p,c) { return c.total - p.total})

  return scaled;
}

MediaPlan.prototype = {
  draw: function draw() {
    //debugger
    if (this.data().category_hour == undefined) return this;

    var _d = this.data();
    _d.display_categories = _d.display_categories || { "values": [] };
    var dd = buildDomains(_d);

    var scaled = transformData(this.data());

    scaled.map(function (x) {

      x.count = x.values.count;
      x.values = x.values.normed;
    });

    this.render_left(scaled);
    this.render_right(dd, scaled);

    return this;
  },
  render_right: function render_right(d, row_data) {

    var wrapper = d3_updateable$1(this._target, ".rhs", "div").classed("rhs col-md-4", true);

    var head = d3_updateable$1(wrapper, "h3", "h3").style("margin-bottom", "15px").style("margin-top", "20px").text("About the plan");

    d3_updateable$1(wrapper, ".desc", "div").classed("desc", true).style("padding", "10px").text("Hindsight has automatically determined the best sites and times where you should be targeting users. The media plan presented below describes the optimizations that can be made to any prospecting or retargeting campaign to lower CPA and save money.");

    var plan_target = d3_updateable$1(wrapper, ".plan-target", "div", row_data, function () {
      return 1;
    }).classed("plan-target", true).style("line-height", "20px").style("min-height", "100px");

    plan_target.exit().remove();

    if (row_data.length > 1) {
      var remainders = row_data.map(function (r) {

        var to_target = d3.sum(r.mask.map(function (x, i) {
          return x ? r.count[i] : 0;
        }));
        var total = d3.sum(r.count);
        return {
          total: total,
          to_target: to_target
        };
      });

      var cut = d3.sum(remainders, function (x) {
        return x.to_target * 1.0;
      });
      var total = d3.sum(remainders, function (x) {
        return x.total;
      });
      var percent = cut / total;

      var head = d3_updateable$1(plan_target, "h3.summary", "h3", function (x) {
        return [x];
      }, function (x) {
        return 1;
      }).classed("summary", true).style("margin-bottom", "15px").style("margin-top", "20px").text("Plan Summary");

      d3_updateable$1(plan_target, ".what", "div", function (x) {
        return [x];
      }, function (x) {
        return 1;
      }).classed("what", true).html(function (x) {
        return "<div style='font-weight:bold;width:200px;padding-left:10px;text-transform:uppercase;display:inline-block'>Potential Ads Served:</div>" + d3.format(",")(total);
      });

      d3_updateable$1(plan_target, ".amount", "div", function (x) {
        return [x];
      }, function (x) {
        return 1;
      }).classed("amount", true).html(function (x) {
        return "<div style='font-weight:bold;width:200px;padding-left:10px;text-transform:uppercase;display:inline-block'>Optimized Ad Serving:</div>" + d3.format(",")(cut) + " (" + d3.format("%")(percent) + ")";
      });

      d3_updateable$1(plan_target, ".cpa", "div", function (x) {
        return [x];
      }, function (x) {
        return 1;
      }).classed("cpa", true).html(function (x) {
        return "<div style='font-weight:bold;width:200px;padding-left:10px;text-transform:uppercase;display:inline-block'>Estimated CPA reduction:</div>" + d3.format("%")(1 - percent);
      });

      return;
    }

    var plan_target = d3_updateable$1(wrapper, ".plan-details", "div", row_data).classed("plan-details", true).style("line-height", "20px").style("min-height", "160px");

    var head = d3_updateable$1(plan_target, "h3.details", "h3").classed("details", true).style("margin-bottom", "15px").style("margin-top", "20px").text("Plan Details");

    d3_updateable$1(plan_target, ".what", "div").classed("what", true).html(function (x) {
      return "<div style='padding-left:10px;font-weight:bold;width:140px;text-transform:uppercase;display:inline-block'>Category:</div>" + x.key;
    });

    d3_updateable$1(plan_target, ".saving", "div").classed("saving", true).html(function (x) {
      console.log(d.count);
      var percent = d3.sum(x.count, function (z, i) {
        return x.mask[i] ? 0 : z;
      }) / d3.sum(x.count, function (z, i) {
        return z;
      });
      return "<div style='padding-left:10px;font-weight:bold;width:140px;text-transform:uppercase;display:inline-block'>Strategy savings:</div>" + d3.format("%")(percent);
    });

    var when = d3_updateable$1(plan_target, ".when", "div", false, function () {
      return 1;
    }).classed("when", true).style("text-transform", "uppercase").style("font-weight", "bold").style("display", "inline-block").style("width", "280px").html("<div style='padding-left:10px;width:140px;display:inline-block;vertical-align:top'>When to serve:</div>").datum(function (x) {
      var bool = false;
      var pos = -1;
      var start_ends = x.mask.reduce(function (p, c) {
        pos += 1;
        if (bool != c) {
          bool = c;
          p.push(pos);
        }
        return p;
      }, []);
      var s = "";
      start_ends.map(function (x, i) {
        if (i != 0 && i % 2 == 0) s += ", ";
        if (i % 2) s += " - ";

        if (x == 0) s += "12am";else {
          var num = (x + 1) % 12;
          num = num == 0 ? 12 : num;
          s += num + (x > 11 ? "pm" : "am");
        }
      });
      if (start_ends.length % 2) s += " - 12am";

      return s.split(", ");
    });

    var items = d3_updateable$1(when, ".items", "div").classed("items", true).style("width", "140px").style("display", "inline-block");

    d3_splat$1(items, ".item", "div").classed("item", true).style("width", "140px").style("display", "inline-block").style("text-transform", "none").style("font-weight", "normal").text(String);

    var head = d3_updateable$1(wrapper, "h3.example-sites", "h3").classed("example-sites", true).style("margin-bottom", "15px").style("margin-top", "20px").text("Example Sites");

    var rows = d3_splat$1(wrapper, ".row", "div", d.slice(0, 15), function (x) {
      return x.key;
    }).classed("row", true).style("line-height", "18px").style("padding-left", "20px").text(function (x) {
      return x.key;
    });

    rows.exit().remove();
  },
  render_left: function render_left(scaled) {

    var wrapper = d3_updateable$1(this._target, ".lhs", "div", scaled).classed("lhs col-md-8", true);

    wrapper.exit().remove();

    var head = d3_updateable$1(wrapper, "h3", "h3").style("margin-bottom", "15px").style("margin-top", "20px").text("Media Plan (Category and Time Optimization)");

    var self = this;

    var head = d3_updateable$1(wrapper, ".head", "div").classed("head", true).style("height", "21px");

    var name = d3_updateable$1(head, ".name", "div").classed("name", true).style("width", "170px").style("padding-left", "5px").style("display", "inline-block").style("line-height", "20px").style("vertical-align", "top");

    d3_splat$1(head, ".hour", "div", d3.range(1, 25), function (x) {
      return x;
    }).classed("sq hour", true).style("display", "inline-block").style("width", "18px").style("height", "20px").style("font-size", ".85em").style("text-align", "center").html(function (x) {
      if (x == 1) return "<b>1a</b>";
      if (x == 24) return "<b>12a</b>";
      if (x == 12) return "<b>12p</b>";
      return x > 11 ? x % 12 : x;
    });

    var row = d3_splat$1(wrapper, ".row", "div", false, function (x) {
      return x.key;
    }).classed("row", true).style("height", "21px").attr("class", function (x) {
      return x.key + " row";
    }).on("mouseover", function (x) {

      var _d = self.data();
      _d.display_categories = _d.display_categories || { "values": [] };
      var dd = buildDomains(_d);

      var d = dd.filter(function (z) {
        return z.parent_category_name == x.key;
      });

      self.render_right(d, x);
    });

    var MAGIC = 25;

    var name = d3_updateable$1(row, ".name", "div").classed("name", true).style("width", "170px").style("padding-left", "5px").style("display", "inline-block").style("line-height", "20px").style("vertical-align", "top").text(function (x) {
      return x.key;
    });

    var colors = ["#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"];
    var colors = ["#238b45"];

    var o = d3.scale.ordinal().domain([-25, 100]).range(colors);

    var square = d3_splat$1(row, ".sq", "div", function (x) {
      return x.values;
    }, function (x, i) {
      return i;
    }).classed("sq", true).style("display", "inline-block").style("width", "18px").style("height", "20px").style("background", function (x, i) {
      var pd = this.parentNode.__data__;
      pd.mask = pd.mask || [];
      pd.mask[i] = x > MAGIC && (pd.values[i - 1] > MAGIC || false || pd.values[i + 1] > MAGIC || false);
      //return pd.mask[i] ? o(pd.values[i])  : "repeating-linear-gradient( 45deg, #fee0d2, #fee0d2 2px, #fcbba1 5px, #fcbba1 2px) "
      return pd.mask[i] ? "repeating-linear-gradient( 135deg, #238b45, #238b45 2px, #006d2c 5px, #006d2c 2px) " : "repeating-linear-gradient( 45deg, #fee0d2, #fee0d2 2px, #fcbba1 5px, #fcbba1 2px) ";
    });
  },
  data: function data(d) {
    if (d === undefined) return this._target.datum();
    this._target.datum(d);
    return this;
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || function () {};
    this._on[action] = fn;
    return this;
  }
};

//import d3 from 'd3'

function d3_updateable$2(target, selector, type, data, joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(function (x) {
    return data ? [data] : [x];
  }, joiner || function (x) {
    return [x];
  });

  updateable.enter().append(type);

  return updateable;
}

function d3_splat$2(target, selector, type, data, joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(data || function (x) {
    return x;
  }, joiner || function (x) {
    return x;
  });

  updateable.enter().append(type);

  return updateable;
}

var typewatch = function () {
  var timer = 0;
  return function (callback, ms) {
    clearTimeout(timer);
    timer = setTimeout(callback, ms);
  };
}();

function Filter(target) {
  this._target = target;
  this._data = false;
  this._on = {};
  this._render_op = {};
}

function filter$2(target) {
  return new Filter(target);
}

Filter.prototype = {
  draw: function draw() {

    var wrap = d3_updateable$2(this._target, ".filters-wrapper", "div", this.data(), function () {
      return 1;
    }).classed("filters-wrapper", true).style("padding-left", "10px").style("padding-right", "20px");

    var filters = d3_updateable$2(wrap, ".filters", "div", false, function (x) {
      return 1;
    }).classed("filters", true);

    var filter = d3_splat$2(filters, ".filter", "div", function (x) {
      return x;
    }, function (x, i) {
      return i + x.field;
    }).classed("filter", true).style("line-height", "33px");

    filter.exit().remove();

    var self = this;
    filter.each(function (v, pos) {
      var dthis = d3.select(this);
      self.filterRow(dthis, self._fields, self._ops, v);
    });

    this.filterFooter(wrap);

    return this;
  },
  ops: function ops(d) {
    if (d === undefined) return this._ops;
    this._ops = d;
    return this;
  },
  fields: function fields(d) {
    if (d === undefined) return this._fields;
    this._fields = d;
    return this;
  },
  data: function data(d) {
    if (d === undefined) return this._data;
    this._data = d;
    return this;
  },
  text: function text(fn) {
    if (fn === undefined) return this._fn || function (x) {
      return x.key;
    };
    this._fn = fn;
    return this;
  },
  render_op: function render_op(op, fn) {
    if (fn === undefined) return this._render_op[op] || function () {};
    this._render_op[op] = fn;
    return this;
  },

  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || function () {};
    this._on[action] = fn;
    return this;
  },
  buildOp: function buildOp(obj) {
    var op = obj.op,
        field = obj.field,
        value = obj.value;

    if ([op, field, value].indexOf(undefined) > -1) return function () {
      return true;
    };

    return this._ops[op](field, value);
  },
  filterRow: function filterRow(_filter, fields, ops, value) {

    var self = this;

    var remove = d3_updateable$2(_filter, ".remove", "a").classed("remove", true).style("float", "right").style("font-weight", "bold").html("&#10005;").on("click", function (x) {
      var new_data = self.data().filter(function (f) {
        return f !== x;
      });
      self.data(new_data);
      self.draw();
      self.on("update")(self.data());
    });

    var filter = d3_updateable$2(_filter, ".inner", "div").classed("inner", true);

    var select = d3_updateable$2(filter, "select.field", "select", fields).classed("field", true).style("width", "165px").on("change", function (x, i) {
      value.field = this.selectedOptions[0].__data__;

      var pos = 0;
      fields.map(function (x, i) {
        if (x == value.field) pos = i;
      });

      var selected = ops[pos].filter(function (x) {
        return x.key == value.op;
      });
      if (selected.length == 0) value.op = ops[pos][0].key;
      //value.fn = self.buildOp(value)
      self.on("update")(self.data());

      self.drawOps(filter, ops[pos], value, pos);
    });

    d3_updateable$2(select, "option", "option").property("disabled", true).property("hidden", true).text("Filter...");

    d3_splat$2(select, "option", "option").text(function (x) {
      return x;
    }).attr("selected", function (x) {
      return x == value.field ? "selected" : undefined;
    });

    if (value.op && value.field && value.value) {
      var pos = fields.indexOf(value.field);
      self.drawOps(filter, ops[pos], value, pos);
    }
  },
  drawOps: function drawOps(filter, ops, value) {

    var self = this;

    var select = d3_updateable$2(filter, "select.op", "select", false, function (x) {
      return 1;
    }).classed("op", true).style("width", "100px").style("margin-left", "10px").style("margin-right", "10px").on("change", function (x) {
      value.op = this.selectedOptions[0].__data__.key;
      //value.fn = self.buildOp(value)
      self.on("update")(self.data());
      self.drawInput(filter, value, value.op);
    });

    //var dflt = [{"key":"Select Operation...","disabled":true,"hidden":true}]

    var new_ops = ops; //dflt.concat(ops)

    value.op = value.op || new_ops[0].key;

    var ops = d3_splat$2(select, "option", "option", new_ops, function (x) {
      return x.key;
    }).text(function (x) {
      return x.key.split(".")[0];
    }).attr("selected", function (x) {
      return x.key == value.op ? "selected" : undefined;
    });

    ops.exit().remove();
    self.drawInput(filter, value, value.op);
  },
  drawInput: function drawInput(filter, value, op) {

    var self = this;

    filter.selectAll(".value").remove();
    var r = this._render_op[op];

    if (r) {
      return r.bind(this)(filter, value);
    }

    d3_updateable$2(filter, "input.value", "input").classed("value", true).style("padding-left", "10px").style("width", "150px").style("line-height", "1em").attr("value", value.value).on("keyup", function (x) {
      var t = this;

      typewatch(function () {
        value.value = t.value;
        //value.fn = self.buildOp(value)
        self.on("update")(self.data());
      }, 1000);
    });
  },
  filterFooter: function filterFooter(wrap) {
    var footer = d3_updateable$2(wrap, ".filter-footer", "div", false, function (x) {
      return 1;
    }).classed("filter-footer", true).style("margin-bottom", "15px").style("margin-top", "10px");

    var self = this;

    d3_updateable$2(footer, ".add", "a", false, function (x) {
      return 1;
    }).classed("add", true).style("font-weight", "bold").html("&#65291;").style("width", "24px").style("height", "24px").style("line-height", "24px").style("text-align", "center").style("border-radius", "15px").style("border", "1.5px solid #428BCC").style("cursor", "pointer").style("display", "inline-block").on("click", function (x) {

      var d = self._data;
      if (d.length == 0 || Object.keys(d.slice(-1)).length > 0) d.push({});
      self.draw();
    });
  },
  typewatch: typewatch
};

function accessor$1$1(attr, val) {
  if (val === undefined) return this["_" + attr];
  this["_" + attr] = val;
  return this;
}

function FilterData(data) {
  this._data = data;
  this._l = "or";
}

function filter_data(data) {
  return new FilterData(data);
}

FilterData.prototype = {
  data: function data(val) {
    return accessor$1$1.bind(this)("data", val);
  },
  logic: function logic(l) {
    if (l == undefined) return this._l;
    this._l = l == "and" ? "and" : "or";
    return this;
  },
  op: function op(_op, fn) {
    if (fn === undefined) return this._ops[_op] || this._ops["equals"];
    this._ops[_op] = fn;
    return this;
  },
  by: function by(b) {

    var self = this,
        filter = function filter(x) {
      if (b.length == 0) return true;

      var mask = b.map(function (z) {

        var split = z.field.split("."),
            field = split.slice(-1)[0],
            obj = split.slice(0, -1).reduce(function (p, c) {
          return p[c];
        }, x),
            osplit = z.op.split("."),
            op = osplit[0];

        return self.op(op)(field, z.value)(obj);
      }).filter(function (x) {
        return x;
      });

      if (self._l == "and") return mask.length == b.length;
      return mask.length > 0;
    };

    return this._data.filter(filter);
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action];
    this._on[action] = fn;
    return this;
  },
  _ops: {
    "equals": function equals(field, value) {
      return function (x) {
        return String(x[field]) == String(value);
      };
    }
    //      , "contains" : function(field,value) {
    //          return function(x) {
    //            return String(x[field]).indexOf(String(value)) > -1
    //          }
    //        }
    , "starts with": function startsWith(field, value) {
      return function (x) {
        return String(x[field]).indexOf(String(value)) == 0;
      };
    },
    "ends with": function endsWith(field, value) {
      return function (x) {
        return String(x[field]).length - String(value).length == String(x[field]).indexOf(String(value));
      };
    },
    "does not equal": function doesNotEqual(field, value) {
      return function (x) {
        return String(x[field]) != String(value);
      };
    },
    "is set": function isSet(field, value) {
      return function (x) {
        return x[field] != undefined && x[field] != "";
      };
    },
    "is not set": function isNotSet(field, value) {
      return function (x) {
        return x[field] == undefined;
      };
    },
    "between": function between(field, value) {
      return function (x) {
        return parseInt(x[field]) >= value[0] && parseInt(x[field]) <= value[1];
      };
    },
    "is in": function isIn(field, value) {
      return function (x) {
        var values = value.split(",");
        return values.reduce(function (p, value) {
          return p + String(x[field]).indexOf(String(value)) > -1;
        }, 0) > 0;
      };
    },
    "is not in": function isNotIn(field, value) {
      return function (x) {
        var values = value.split(",");
        return values.reduce(function (p, value) {
          return p + String(x[field]).indexOf(String(value)) > -1;
        }, 0) == 0;
      };
    },
    "does not contain": function doesNotContain(field, value) {
      return function (x) {
        var values = value.toLowerCase().split(",");
        return values.reduce(function (p, value) {
          return p + String(x[field]).indexOf(String(value).toLowerCase()) > -1;
        }, 0) == 0;
      };
    },
    "contains": function contains(field, value) {
      return function (x) {
        var values = value.toLowerCase().split(",");
        return values.reduce(function (p, value) {
          return p + String(x[field]).indexOf(String(value).toLowerCase()) > -1;
        }, 0) > 0;
      };
    }
  }
};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var d3$1 = createCommonjsModule(function (module) {
  !function () {
    var d3 = {
      version: "3.5.12"
    };
    var d3_arraySlice = [].slice,
        d3_array = function d3_array(list) {
      return d3_arraySlice.call(list);
    };
    var d3_document = this.document;
    function d3_documentElement(node) {
      return node && (node.ownerDocument || node.document || node).documentElement;
    }
    function d3_window(node) {
      return node && (node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView);
    }
    if (d3_document) {
      try {
        d3_array(d3_document.documentElement.childNodes)[0].nodeType;
      } catch (e) {
        d3_array = function d3_array(list) {
          var i = list.length,
              array = new Array(i);
          while (i--) {
            array[i] = list[i];
          }return array;
        };
      }
    }
    if (!Date.now) Date.now = function () {
      return +new Date();
    };
    if (d3_document) {
      try {
        d3_document.createElement("DIV").style.setProperty("opacity", 0, "");
      } catch (error) {
        var d3_element_prototype = this.Element.prototype,
            d3_element_setAttribute = d3_element_prototype.setAttribute,
            d3_element_setAttributeNS = d3_element_prototype.setAttributeNS,
            d3_style_prototype = this.CSSStyleDeclaration.prototype,
            d3_style_setProperty = d3_style_prototype.setProperty;
        d3_element_prototype.setAttribute = function (name, value) {
          d3_element_setAttribute.call(this, name, value + "");
        };
        d3_element_prototype.setAttributeNS = function (space, local, value) {
          d3_element_setAttributeNS.call(this, space, local, value + "");
        };
        d3_style_prototype.setProperty = function (name, value, priority) {
          d3_style_setProperty.call(this, name, value + "", priority);
        };
      }
    }
    d3.ascending = d3_ascending;
    function d3_ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }
    d3.descending = function (a, b) {
      return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
    };
    d3.min = function (array, f) {
      var i = -1,
          n = array.length,
          a,
          b;
      if (arguments.length === 1) {
        while (++i < n) {
          if ((b = array[i]) != null && b >= b) {
            a = b;
            break;
          }
        }while (++i < n) {
          if ((b = array[i]) != null && a > b) a = b;
        }
      } else {
        while (++i < n) {
          if ((b = f.call(array, array[i], i)) != null && b >= b) {
            a = b;
            break;
          }
        }while (++i < n) {
          if ((b = f.call(array, array[i], i)) != null && a > b) a = b;
        }
      }
      return a;
    };
    d3.max = function (array, f) {
      var i = -1,
          n = array.length,
          a,
          b;
      if (arguments.length === 1) {
        while (++i < n) {
          if ((b = array[i]) != null && b >= b) {
            a = b;
            break;
          }
        }while (++i < n) {
          if ((b = array[i]) != null && b > a) a = b;
        }
      } else {
        while (++i < n) {
          if ((b = f.call(array, array[i], i)) != null && b >= b) {
            a = b;
            break;
          }
        }while (++i < n) {
          if ((b = f.call(array, array[i], i)) != null && b > a) a = b;
        }
      }
      return a;
    };
    d3.extent = function (array, f) {
      var i = -1,
          n = array.length,
          a,
          b,
          c;
      if (arguments.length === 1) {
        while (++i < n) {
          if ((b = array[i]) != null && b >= b) {
            a = c = b;
            break;
          }
        }while (++i < n) {
          if ((b = array[i]) != null) {
            if (a > b) a = b;
            if (c < b) c = b;
          }
        }
      } else {
        while (++i < n) {
          if ((b = f.call(array, array[i], i)) != null && b >= b) {
            a = c = b;
            break;
          }
        }while (++i < n) {
          if ((b = f.call(array, array[i], i)) != null) {
            if (a > b) a = b;
            if (c < b) c = b;
          }
        }
      }
      return [a, c];
    };
    function d3_number(x) {
      return x === null ? NaN : +x;
    }
    function d3_numeric(x) {
      return !isNaN(x);
    }
    d3.sum = function (array, f) {
      var s = 0,
          n = array.length,
          a,
          i = -1;
      if (arguments.length === 1) {
        while (++i < n) {
          if (d3_numeric(a = +array[i])) s += a;
        }
      } else {
        while (++i < n) {
          if (d3_numeric(a = +f.call(array, array[i], i))) s += a;
        }
      }
      return s;
    };
    d3.mean = function (array, f) {
      var s = 0,
          n = array.length,
          a,
          i = -1,
          j = n;
      if (arguments.length === 1) {
        while (++i < n) {
          if (d3_numeric(a = d3_number(array[i]))) s += a;else --j;
        }
      } else {
        while (++i < n) {
          if (d3_numeric(a = d3_number(f.call(array, array[i], i)))) s += a;else --j;
        }
      }
      if (j) return s / j;
    };
    d3.quantile = function (values, p) {
      var H = (values.length - 1) * p + 1,
          h = Math.floor(H),
          v = +values[h - 1],
          e = H - h;
      return e ? v + e * (values[h] - v) : v;
    };
    d3.median = function (array, f) {
      var numbers = [],
          n = array.length,
          a,
          i = -1;
      if (arguments.length === 1) {
        while (++i < n) {
          if (d3_numeric(a = d3_number(array[i]))) numbers.push(a);
        }
      } else {
        while (++i < n) {
          if (d3_numeric(a = d3_number(f.call(array, array[i], i)))) numbers.push(a);
        }
      }
      if (numbers.length) return d3.quantile(numbers.sort(d3_ascending), .5);
    };
    d3.variance = function (array, f) {
      var n = array.length,
          m = 0,
          a,
          d,
          s = 0,
          i = -1,
          j = 0;
      if (arguments.length === 1) {
        while (++i < n) {
          if (d3_numeric(a = d3_number(array[i]))) {
            d = a - m;
            m += d / ++j;
            s += d * (a - m);
          }
        }
      } else {
        while (++i < n) {
          if (d3_numeric(a = d3_number(f.call(array, array[i], i)))) {
            d = a - m;
            m += d / ++j;
            s += d * (a - m);
          }
        }
      }
      if (j > 1) return s / (j - 1);
    };
    d3.deviation = function () {
      var v = d3.variance.apply(this, arguments);
      return v ? Math.sqrt(v) : v;
    };
    function d3_bisector(compare) {
      return {
        left: function left(a, x, lo, hi) {
          if (arguments.length < 3) lo = 0;
          if (arguments.length < 4) hi = a.length;
          while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (compare(a[mid], x) < 0) lo = mid + 1;else hi = mid;
          }
          return lo;
        },
        right: function right(a, x, lo, hi) {
          if (arguments.length < 3) lo = 0;
          if (arguments.length < 4) hi = a.length;
          while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (compare(a[mid], x) > 0) hi = mid;else lo = mid + 1;
          }
          return lo;
        }
      };
    }
    var d3_bisect = d3_bisector(d3_ascending);
    d3.bisectLeft = d3_bisect.left;
    d3.bisect = d3.bisectRight = d3_bisect.right;
    d3.bisector = function (f) {
      return d3_bisector(f.length === 1 ? function (d, x) {
        return d3_ascending(f(d), x);
      } : f);
    };
    d3.shuffle = function (array, i0, i1) {
      if ((m = arguments.length) < 3) {
        i1 = array.length;
        if (m < 2) i0 = 0;
      }
      var m = i1 - i0,
          t,
          i;
      while (m) {
        i = Math.random() * m-- | 0;
        t = array[m + i0], array[m + i0] = array[i + i0], array[i + i0] = t;
      }
      return array;
    };
    d3.permute = function (array, indexes) {
      var i = indexes.length,
          permutes = new Array(i);
      while (i--) {
        permutes[i] = array[indexes[i]];
      }return permutes;
    };
    d3.pairs = function (array) {
      var i = 0,
          n = array.length - 1,
          p0,
          p1 = array[0],
          pairs = new Array(n < 0 ? 0 : n);
      while (i < n) {
        pairs[i] = [p0 = p1, p1 = array[++i]];
      }return pairs;
    };
    d3.zip = function () {
      if (!(n = arguments.length)) return [];
      for (var i = -1, m = d3.min(arguments, d3_zipLength), zips = new Array(m); ++i < m;) {
        for (var j = -1, n, zip = zips[i] = new Array(n); ++j < n;) {
          zip[j] = arguments[j][i];
        }
      }
      return zips;
    };
    function d3_zipLength(d) {
      return d.length;
    }
    d3.transpose = function (matrix) {
      return d3.zip.apply(d3, matrix);
    };
    d3.keys = function (map) {
      var keys = [];
      for (var key in map) {
        keys.push(key);
      }return keys;
    };
    d3.values = function (map) {
      var values = [];
      for (var key in map) {
        values.push(map[key]);
      }return values;
    };
    d3.entries = function (map) {
      var entries = [];
      for (var key in map) {
        entries.push({
          key: key,
          value: map[key]
        });
      }return entries;
    };
    d3.merge = function (arrays) {
      var n = arrays.length,
          m,
          i = -1,
          j = 0,
          merged,
          array;
      while (++i < n) {
        j += arrays[i].length;
      }merged = new Array(j);
      while (--n >= 0) {
        array = arrays[n];
        m = array.length;
        while (--m >= 0) {
          merged[--j] = array[m];
        }
      }
      return merged;
    };
    var abs = Math.abs;
    d3.range = function (start, stop, step) {
      if (arguments.length < 3) {
        step = 1;
        if (arguments.length < 2) {
          stop = start;
          start = 0;
        }
      }
      if ((stop - start) / step === Infinity) throw new Error("infinite range");
      var range = [],
          k = d3_range_integerScale(abs(step)),
          i = -1,
          j;
      start *= k, stop *= k, step *= k;
      if (step < 0) while ((j = start + step * ++i) > stop) {
        range.push(j / k);
      } else while ((j = start + step * ++i) < stop) {
        range.push(j / k);
      }return range;
    };
    function d3_range_integerScale(x) {
      var k = 1;
      while (x * k % 1) {
        k *= 10;
      }return k;
    }
    function d3_class(ctor, properties) {
      for (var key in properties) {
        Object.defineProperty(ctor.prototype, key, {
          value: properties[key],
          enumerable: false
        });
      }
    }
    d3.map = function (object, f) {
      var map = new d3_Map();
      if (object instanceof d3_Map) {
        object.forEach(function (key, value) {
          map.set(key, value);
        });
      } else if (Array.isArray(object)) {
        var i = -1,
            n = object.length,
            o;
        if (arguments.length === 1) while (++i < n) {
          map.set(i, object[i]);
        } else while (++i < n) {
          map.set(f.call(object, o = object[i], i), o);
        }
      } else {
        for (var key in object) {
          map.set(key, object[key]);
        }
      }
      return map;
    };
    function d3_Map() {
      this._ = Object.create(null);
    }
    var d3_map_proto = "__proto__",
        d3_map_zero = "\x00";
    d3_class(d3_Map, {
      has: d3_map_has,
      get: function get$$1(key) {
        return this._[d3_map_escape(key)];
      },
      set: function set$$1(key, value) {
        return this._[d3_map_escape(key)] = value;
      },
      remove: d3_map_remove,
      keys: d3_map_keys,
      values: function values() {
        var values = [];
        for (var key in this._) {
          values.push(this._[key]);
        }return values;
      },
      entries: function entries() {
        var entries = [];
        for (var key in this._) {
          entries.push({
            key: d3_map_unescape(key),
            value: this._[key]
          });
        }return entries;
      },
      size: d3_map_size,
      empty: d3_map_empty,
      forEach: function forEach(f) {
        for (var key in this._) {
          f.call(this, d3_map_unescape(key), this._[key]);
        }
      }
    });
    function d3_map_escape(key) {
      return (key += "") === d3_map_proto || key[0] === d3_map_zero ? d3_map_zero + key : key;
    }
    function d3_map_unescape(key) {
      return (key += "")[0] === d3_map_zero ? key.slice(1) : key;
    }
    function d3_map_has(key) {
      return d3_map_escape(key) in this._;
    }
    function d3_map_remove(key) {
      return (key = d3_map_escape(key)) in this._ && delete this._[key];
    }
    function d3_map_keys() {
      var keys = [];
      for (var key in this._) {
        keys.push(d3_map_unescape(key));
      }return keys;
    }
    function d3_map_size() {
      var size = 0;
      for (var key in this._) {
        ++size;
      }return size;
    }
    function d3_map_empty() {
      for (var key in this._) {
        return false;
      }return true;
    }
    d3.nest = function () {
      var nest = {},
          keys = [],
          sortKeys = [],
          sortValues,
          rollup;
      function map(mapType, array, depth) {
        if (depth >= keys.length) return rollup ? rollup.call(nest, array) : sortValues ? array.sort(sortValues) : array;
        var i = -1,
            n = array.length,
            key = keys[depth++],
            keyValue,
            object,
            setter,
            valuesByKey = new d3_Map(),
            values;
        while (++i < n) {
          if (values = valuesByKey.get(keyValue = key(object = array[i]))) {
            values.push(object);
          } else {
            valuesByKey.set(keyValue, [object]);
          }
        }
        if (mapType) {
          object = mapType();
          setter = function setter(keyValue, values) {
            object.set(keyValue, map(mapType, values, depth));
          };
        } else {
          object = {};
          setter = function setter(keyValue, values) {
            object[keyValue] = map(mapType, values, depth);
          };
        }
        valuesByKey.forEach(setter);
        return object;
      }
      function entries(map, depth) {
        if (depth >= keys.length) return map;
        var array = [],
            sortKey = sortKeys[depth++];
        map.forEach(function (key, keyMap) {
          array.push({
            key: key,
            values: entries(keyMap, depth)
          });
        });
        return sortKey ? array.sort(function (a, b) {
          return sortKey(a.key, b.key);
        }) : array;
      }
      nest.map = function (array, mapType) {
        return map(mapType, array, 0);
      };
      nest.entries = function (array) {
        return entries(map(d3.map, array, 0), 0);
      };
      nest.key = function (d) {
        keys.push(d);
        return nest;
      };
      nest.sortKeys = function (order) {
        sortKeys[keys.length - 1] = order;
        return nest;
      };
      nest.sortValues = function (order) {
        sortValues = order;
        return nest;
      };
      nest.rollup = function (f) {
        rollup = f;
        return nest;
      };
      return nest;
    };
    d3.set = function (array) {
      var set$$1 = new d3_Set();
      if (array) for (var i = 0, n = array.length; i < n; ++i) {
        set$$1.add(array[i]);
      }return set$$1;
    };
    function d3_Set() {
      this._ = Object.create(null);
    }
    d3_class(d3_Set, {
      has: d3_map_has,
      add: function add(key) {
        this._[d3_map_escape(key += "")] = true;
        return key;
      },
      remove: d3_map_remove,
      values: d3_map_keys,
      size: d3_map_size,
      empty: d3_map_empty,
      forEach: function forEach(f) {
        for (var key in this._) {
          f.call(this, d3_map_unescape(key));
        }
      }
    });
    d3.behavior = {};
    function d3_identity(d) {
      return d;
    }
    d3.rebind = function (target, source) {
      var i = 1,
          n = arguments.length,
          method;
      while (++i < n) {
        target[method = arguments[i]] = d3_rebind(target, source, source[method]);
      }return target;
    };
    function d3_rebind(target, source, method) {
      return function () {
        var value = method.apply(source, arguments);
        return value === source ? target : value;
      };
    }
    function d3_vendorSymbol(object, name) {
      if (name in object) return name;
      name = name.charAt(0).toUpperCase() + name.slice(1);
      for (var i = 0, n = d3_vendorPrefixes.length; i < n; ++i) {
        var prefixName = d3_vendorPrefixes[i] + name;
        if (prefixName in object) return prefixName;
      }
    }
    var d3_vendorPrefixes = ["webkit", "ms", "moz", "Moz", "o", "O"];
    function d3_noop() {}
    d3.dispatch = function () {
      var dispatch = new d3_dispatch(),
          i = -1,
          n = arguments.length;
      while (++i < n) {
        dispatch[arguments[i]] = d3_dispatch_event(dispatch);
      }return dispatch;
    };
    function d3_dispatch() {}
    d3_dispatch.prototype.on = function (type, listener) {
      var i = type.indexOf("."),
          name = "";
      if (i >= 0) {
        name = type.slice(i + 1);
        type = type.slice(0, i);
      }
      if (type) return arguments.length < 2 ? this[type].on(name) : this[type].on(name, listener);
      if (arguments.length === 2) {
        if (listener == null) for (type in this) {
          if (this.hasOwnProperty(type)) this[type].on(name, null);
        }
        return this;
      }
    };
    function d3_dispatch_event(dispatch) {
      var listeners = [],
          listenerByName = new d3_Map();
      function event() {
        var z = listeners,
            i = -1,
            n = z.length,
            l;
        while (++i < n) {
          if (l = z[i].on) l.apply(this, arguments);
        }return dispatch;
      }
      event.on = function (name, listener) {
        var l = listenerByName.get(name),
            i;
        if (arguments.length < 2) return l && l.on;
        if (l) {
          l.on = null;
          listeners = listeners.slice(0, i = listeners.indexOf(l)).concat(listeners.slice(i + 1));
          listenerByName.remove(name);
        }
        if (listener) listeners.push(listenerByName.set(name, {
          on: listener
        }));
        return dispatch;
      };
      return event;
    }
    d3.event = null;
    function d3_eventPreventDefault() {
      d3.event.preventDefault();
    }
    function d3_eventSource() {
      var e = d3.event,
          s;
      while (s = e.sourceEvent) {
        e = s;
      }return e;
    }
    function d3_eventDispatch(target) {
      var dispatch = new d3_dispatch(),
          i = 0,
          n = arguments.length;
      while (++i < n) {
        dispatch[arguments[i]] = d3_dispatch_event(dispatch);
      }dispatch.of = function (thiz, argumentz) {
        return function (e1) {
          try {
            var e0 = e1.sourceEvent = d3.event;
            e1.target = target;
            d3.event = e1;
            dispatch[e1.type].apply(thiz, argumentz);
          } finally {
            d3.event = e0;
          }
        };
      };
      return dispatch;
    }
    d3.requote = function (s) {
      return s.replace(d3_requote_re, "\\$&");
    };
    var d3_requote_re = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;
    var d3_subclass = {}.__proto__ ? function (object, prototype) {
      object.__proto__ = prototype;
    } : function (object, prototype) {
      for (var property in prototype) {
        object[property] = prototype[property];
      }
    };
    function d3_selection(groups) {
      d3_subclass(groups, d3_selectionPrototype);
      return groups;
    }
    var d3_select = function d3_select(s, n) {
      return n.querySelector(s);
    },
        d3_selectAll = function d3_selectAll(s, n) {
      return n.querySelectorAll(s);
    },
        _d3_selectMatches = function d3_selectMatches(n, s) {
      var d3_selectMatcher = n.matches || n[d3_vendorSymbol(n, "matchesSelector")];
      _d3_selectMatches = function d3_selectMatches(n, s) {
        return d3_selectMatcher.call(n, s);
      };
      return _d3_selectMatches(n, s);
    };
    if (typeof Sizzle === "function") {
      d3_select = function d3_select(s, n) {
        return Sizzle(s, n)[0] || null;
      };
      d3_selectAll = Sizzle;
      _d3_selectMatches = Sizzle.matchesSelector;
    }
    d3.selection = function () {
      return d3.select(d3_document.documentElement);
    };
    var d3_selectionPrototype = d3.selection.prototype = [];
    d3_selectionPrototype.select = function (selector) {
      var subgroups = [],
          subgroup,
          subnode,
          group,
          node;
      selector = d3_selection_selector(selector);
      for (var j = -1, m = this.length; ++j < m;) {
        subgroups.push(subgroup = []);
        subgroup.parentNode = (group = this[j]).parentNode;
        for (var i = -1, n = group.length; ++i < n;) {
          if (node = group[i]) {
            subgroup.push(subnode = selector.call(node, node.__data__, i, j));
            if (subnode && "__data__" in node) subnode.__data__ = node.__data__;
          } else {
            subgroup.push(null);
          }
        }
      }
      return d3_selection(subgroups);
    };
    function d3_selection_selector(selector) {
      return typeof selector === "function" ? selector : function () {
        return d3_select(selector, this);
      };
    }
    d3_selectionPrototype.selectAll = function (selector) {
      var subgroups = [],
          subgroup,
          node;
      selector = d3_selection_selectorAll(selector);
      for (var j = -1, m = this.length; ++j < m;) {
        for (var group = this[j], i = -1, n = group.length; ++i < n;) {
          if (node = group[i]) {
            subgroups.push(subgroup = d3_array(selector.call(node, node.__data__, i, j)));
            subgroup.parentNode = node;
          }
        }
      }
      return d3_selection(subgroups);
    };
    function d3_selection_selectorAll(selector) {
      return typeof selector === "function" ? selector : function () {
        return d3_selectAll(selector, this);
      };
    }
    var d3_nsPrefix = {
      svg: "http://www.w3.org/2000/svg",
      xhtml: "http://www.w3.org/1999/xhtml",
      xlink: "http://www.w3.org/1999/xlink",
      xml: "http://www.w3.org/XML/1998/namespace",
      xmlns: "http://www.w3.org/2000/xmlns/"
    };
    d3.ns = {
      prefix: d3_nsPrefix,
      qualify: function qualify(name) {
        var i = name.indexOf(":"),
            prefix = name;
        if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
        return d3_nsPrefix.hasOwnProperty(prefix) ? {
          space: d3_nsPrefix[prefix],
          local: name
        } : name;
      }
    };
    d3_selectionPrototype.attr = function (name, value) {
      if (arguments.length < 2) {
        if (typeof name === "string") {
          var node = this.node();
          name = d3.ns.qualify(name);
          return name.local ? node.getAttributeNS(name.space, name.local) : node.getAttribute(name);
        }
        for (value in name) {
          this.each(d3_selection_attr(value, name[value]));
        }return this;
      }
      return this.each(d3_selection_attr(name, value));
    };
    function d3_selection_attr(name, value) {
      name = d3.ns.qualify(name);
      function attrNull() {
        this.removeAttribute(name);
      }
      function attrNullNS() {
        this.removeAttributeNS(name.space, name.local);
      }
      function attrConstant() {
        this.setAttribute(name, value);
      }
      function attrConstantNS() {
        this.setAttributeNS(name.space, name.local, value);
      }
      function attrFunction() {
        var x = value.apply(this, arguments);
        if (x == null) this.removeAttribute(name);else this.setAttribute(name, x);
      }
      function attrFunctionNS() {
        var x = value.apply(this, arguments);
        if (x == null) this.removeAttributeNS(name.space, name.local);else this.setAttributeNS(name.space, name.local, x);
      }
      return value == null ? name.local ? attrNullNS : attrNull : typeof value === "function" ? name.local ? attrFunctionNS : attrFunction : name.local ? attrConstantNS : attrConstant;
    }
    function d3_collapse(s) {
      return s.trim().replace(/\s+/g, " ");
    }
    d3_selectionPrototype.classed = function (name, value) {
      if (arguments.length < 2) {
        if (typeof name === "string") {
          var node = this.node(),
              n = (name = d3_selection_classes(name)).length,
              i = -1;
          if (value = node.classList) {
            while (++i < n) {
              if (!value.contains(name[i])) return false;
            }
          } else {
            value = node.getAttribute("class");
            while (++i < n) {
              if (!d3_selection_classedRe(name[i]).test(value)) return false;
            }
          }
          return true;
        }
        for (value in name) {
          this.each(d3_selection_classed(value, name[value]));
        }return this;
      }
      return this.each(d3_selection_classed(name, value));
    };
    function d3_selection_classedRe(name) {
      return new RegExp("(?:^|\\s+)" + d3.requote(name) + "(?:\\s+|$)", "g");
    }
    function d3_selection_classes(name) {
      return (name + "").trim().split(/^|\s+/);
    }
    function d3_selection_classed(name, value) {
      name = d3_selection_classes(name).map(d3_selection_classedName);
      var n = name.length;
      function classedConstant() {
        var i = -1;
        while (++i < n) {
          name[i](this, value);
        }
      }
      function classedFunction() {
        var i = -1,
            x = value.apply(this, arguments);
        while (++i < n) {
          name[i](this, x);
        }
      }
      return typeof value === "function" ? classedFunction : classedConstant;
    }
    function d3_selection_classedName(name) {
      var re = d3_selection_classedRe(name);
      return function (node, value) {
        if (c = node.classList) return value ? c.add(name) : c.remove(name);
        var c = node.getAttribute("class") || "";
        if (value) {
          re.lastIndex = 0;
          if (!re.test(c)) node.setAttribute("class", d3_collapse(c + " " + name));
        } else {
          node.setAttribute("class", d3_collapse(c.replace(re, " ")));
        }
      };
    }
    d3_selectionPrototype.style = function (name, value, priority) {
      var n = arguments.length;
      if (n < 3) {
        if (typeof name !== "string") {
          if (n < 2) value = "";
          for (priority in name) {
            this.each(d3_selection_style(priority, name[priority], value));
          }return this;
        }
        if (n < 2) {
          var node = this.node();
          return d3_window(node).getComputedStyle(node, null).getPropertyValue(name);
        }
        priority = "";
      }
      return this.each(d3_selection_style(name, value, priority));
    };
    function d3_selection_style(name, value, priority) {
      function styleNull() {
        this.style.removeProperty(name);
      }
      function styleConstant() {
        this.style.setProperty(name, value, priority);
      }
      function styleFunction() {
        var x = value.apply(this, arguments);
        if (x == null) this.style.removeProperty(name);else this.style.setProperty(name, x, priority);
      }
      return value == null ? styleNull : typeof value === "function" ? styleFunction : styleConstant;
    }
    d3_selectionPrototype.property = function (name, value) {
      if (arguments.length < 2) {
        if (typeof name === "string") return this.node()[name];
        for (value in name) {
          this.each(d3_selection_property(value, name[value]));
        }return this;
      }
      return this.each(d3_selection_property(name, value));
    };
    function d3_selection_property(name, value) {
      function propertyNull() {
        delete this[name];
      }
      function propertyConstant() {
        this[name] = value;
      }
      function propertyFunction() {
        var x = value.apply(this, arguments);
        if (x == null) delete this[name];else this[name] = x;
      }
      return value == null ? propertyNull : typeof value === "function" ? propertyFunction : propertyConstant;
    }
    d3_selectionPrototype.text = function (value) {
      return arguments.length ? this.each(typeof value === "function" ? function () {
        var v = value.apply(this, arguments);
        this.textContent = v == null ? "" : v;
      } : value == null ? function () {
        this.textContent = "";
      } : function () {
        this.textContent = value;
      }) : this.node().textContent;
    };
    d3_selectionPrototype.html = function (value) {
      return arguments.length ? this.each(typeof value === "function" ? function () {
        var v = value.apply(this, arguments);
        this.innerHTML = v == null ? "" : v;
      } : value == null ? function () {
        this.innerHTML = "";
      } : function () {
        this.innerHTML = value;
      }) : this.node().innerHTML;
    };
    d3_selectionPrototype.append = function (name) {
      name = d3_selection_creator(name);
      return this.select(function () {
        return this.appendChild(name.apply(this, arguments));
      });
    };
    function d3_selection_creator(name) {
      function create() {
        var document = this.ownerDocument,
            namespace = this.namespaceURI;
        return namespace ? document.createElementNS(namespace, name) : document.createElement(name);
      }
      function createNS() {
        return this.ownerDocument.createElementNS(name.space, name.local);
      }
      return typeof name === "function" ? name : (name = d3.ns.qualify(name)).local ? createNS : create;
    }
    d3_selectionPrototype.insert = function (name, before) {
      name = d3_selection_creator(name);
      before = d3_selection_selector(before);
      return this.select(function () {
        return this.insertBefore(name.apply(this, arguments), before.apply(this, arguments) || null);
      });
    };
    d3_selectionPrototype.remove = function () {
      return this.each(d3_selectionRemove);
    };
    function d3_selectionRemove() {
      var parent = this.parentNode;
      if (parent) parent.removeChild(this);
    }
    d3_selectionPrototype.data = function (value, key) {
      var i = -1,
          n = this.length,
          group,
          node;
      if (!arguments.length) {
        value = new Array(n = (group = this[0]).length);
        while (++i < n) {
          if (node = group[i]) {
            value[i] = node.__data__;
          }
        }
        return value;
      }
      function bind(group, groupData) {
        var i,
            n = group.length,
            m = groupData.length,
            n0 = Math.min(n, m),
            updateNodes = new Array(m),
            enterNodes = new Array(m),
            exitNodes = new Array(n),
            node,
            nodeData;
        if (key) {
          var nodeByKeyValue = new d3_Map(),
              keyValues = new Array(n),
              keyValue;
          for (i = -1; ++i < n;) {
            if (node = group[i]) {
              if (nodeByKeyValue.has(keyValue = key.call(node, node.__data__, i))) {
                exitNodes[i] = node;
              } else {
                nodeByKeyValue.set(keyValue, node);
              }
              keyValues[i] = keyValue;
            }
          }
          for (i = -1; ++i < m;) {
            if (!(node = nodeByKeyValue.get(keyValue = key.call(groupData, nodeData = groupData[i], i)))) {
              enterNodes[i] = d3_selection_dataNode(nodeData);
            } else if (node !== true) {
              updateNodes[i] = node;
              node.__data__ = nodeData;
            }
            nodeByKeyValue.set(keyValue, true);
          }
          for (i = -1; ++i < n;) {
            if (i in keyValues && nodeByKeyValue.get(keyValues[i]) !== true) {
              exitNodes[i] = group[i];
            }
          }
        } else {
          for (i = -1; ++i < n0;) {
            node = group[i];
            nodeData = groupData[i];
            if (node) {
              node.__data__ = nodeData;
              updateNodes[i] = node;
            } else {
              enterNodes[i] = d3_selection_dataNode(nodeData);
            }
          }
          for (; i < m; ++i) {
            enterNodes[i] = d3_selection_dataNode(groupData[i]);
          }
          for (; i < n; ++i) {
            exitNodes[i] = group[i];
          }
        }
        enterNodes.update = updateNodes;
        enterNodes.parentNode = updateNodes.parentNode = exitNodes.parentNode = group.parentNode;
        enter.push(enterNodes);
        update.push(updateNodes);
        exit.push(exitNodes);
      }
      var enter = d3_selection_enter([]),
          update = d3_selection([]),
          exit = d3_selection([]);
      if (typeof value === "function") {
        while (++i < n) {
          bind(group = this[i], value.call(group, group.parentNode.__data__, i));
        }
      } else {
        while (++i < n) {
          bind(group = this[i], value);
        }
      }
      update.enter = function () {
        return enter;
      };
      update.exit = function () {
        return exit;
      };
      return update;
    };
    function d3_selection_dataNode(data) {
      return {
        __data__: data
      };
    }
    d3_selectionPrototype.datum = function (value) {
      return arguments.length ? this.property("__data__", value) : this.property("__data__");
    };
    d3_selectionPrototype.filter = function (filter) {
      var subgroups = [],
          subgroup,
          group,
          node;
      if (typeof filter !== "function") filter = d3_selection_filter(filter);
      for (var j = 0, m = this.length; j < m; j++) {
        subgroups.push(subgroup = []);
        subgroup.parentNode = (group = this[j]).parentNode;
        for (var i = 0, n = group.length; i < n; i++) {
          if ((node = group[i]) && filter.call(node, node.__data__, i, j)) {
            subgroup.push(node);
          }
        }
      }
      return d3_selection(subgroups);
    };
    function d3_selection_filter(selector) {
      return function () {
        return _d3_selectMatches(this, selector);
      };
    }
    d3_selectionPrototype.order = function () {
      for (var j = -1, m = this.length; ++j < m;) {
        for (var group = this[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
          if (node = group[i]) {
            if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
            next = node;
          }
        }
      }
      return this;
    };
    d3_selectionPrototype.sort = function (comparator) {
      comparator = d3_selection_sortComparator.apply(this, arguments);
      for (var j = -1, m = this.length; ++j < m;) {
        this[j].sort(comparator);
      }return this.order();
    };
    function d3_selection_sortComparator(comparator) {
      if (!arguments.length) comparator = d3_ascending;
      return function (a, b) {
        return a && b ? comparator(a.__data__, b.__data__) : !a - !b;
      };
    }
    d3_selectionPrototype.each = function (callback) {
      return d3_selection_each(this, function (node, i, j) {
        callback.call(node, node.__data__, i, j);
      });
    };
    function d3_selection_each(groups, callback) {
      for (var j = 0, m = groups.length; j < m; j++) {
        for (var group = groups[j], i = 0, n = group.length, node; i < n; i++) {
          if (node = group[i]) callback(node, i, j);
        }
      }
      return groups;
    }
    d3_selectionPrototype.call = function (callback) {
      var args = d3_array(arguments);
      callback.apply(args[0] = this, args);
      return this;
    };
    d3_selectionPrototype.empty = function () {
      return !this.node();
    };
    d3_selectionPrototype.node = function () {
      for (var j = 0, m = this.length; j < m; j++) {
        for (var group = this[j], i = 0, n = group.length; i < n; i++) {
          var node = group[i];
          if (node) return node;
        }
      }
      return null;
    };
    d3_selectionPrototype.size = function () {
      var n = 0;
      d3_selection_each(this, function () {
        ++n;
      });
      return n;
    };
    function d3_selection_enter(selection) {
      d3_subclass(selection, d3_selection_enterPrototype);
      return selection;
    }
    var d3_selection_enterPrototype = [];
    d3.selection.enter = d3_selection_enter;
    d3.selection.enter.prototype = d3_selection_enterPrototype;
    d3_selection_enterPrototype.append = d3_selectionPrototype.append;
    d3_selection_enterPrototype.empty = d3_selectionPrototype.empty;
    d3_selection_enterPrototype.node = d3_selectionPrototype.node;
    d3_selection_enterPrototype.call = d3_selectionPrototype.call;
    d3_selection_enterPrototype.size = d3_selectionPrototype.size;
    d3_selection_enterPrototype.select = function (selector) {
      var subgroups = [],
          subgroup,
          subnode,
          upgroup,
          group,
          node;
      for (var j = -1, m = this.length; ++j < m;) {
        upgroup = (group = this[j]).update;
        subgroups.push(subgroup = []);
        subgroup.parentNode = group.parentNode;
        for (var i = -1, n = group.length; ++i < n;) {
          if (node = group[i]) {
            subgroup.push(upgroup[i] = subnode = selector.call(group.parentNode, node.__data__, i, j));
            subnode.__data__ = node.__data__;
          } else {
            subgroup.push(null);
          }
        }
      }
      return d3_selection(subgroups);
    };
    d3_selection_enterPrototype.insert = function (name, before) {
      if (arguments.length < 2) before = d3_selection_enterInsertBefore(this);
      return d3_selectionPrototype.insert.call(this, name, before);
    };
    function d3_selection_enterInsertBefore(enter) {
      var i0, j0;
      return function (d, i, j) {
        var group = enter[j].update,
            n = group.length,
            node;
        if (j != j0) j0 = j, i0 = 0;
        if (i >= i0) i0 = i + 1;
        while (!(node = group[i0]) && ++i0 < n) {}
        return node;
      };
    }
    d3.select = function (node) {
      var group;
      if (typeof node === "string") {
        group = [d3_select(node, d3_document)];
        group.parentNode = d3_document.documentElement;
      } else {
        group = [node];
        group.parentNode = d3_documentElement(node);
      }
      return d3_selection([group]);
    };
    d3.selectAll = function (nodes) {
      var group;
      if (typeof nodes === "string") {
        group = d3_array(d3_selectAll(nodes, d3_document));
        group.parentNode = d3_document.documentElement;
      } else {
        group = d3_array(nodes);
        group.parentNode = null;
      }
      return d3_selection([group]);
    };
    d3_selectionPrototype.on = function (type, listener, capture) {
      var n = arguments.length;
      if (n < 3) {
        if (typeof type !== "string") {
          if (n < 2) listener = false;
          for (capture in type) {
            this.each(d3_selection_on(capture, type[capture], listener));
          }return this;
        }
        if (n < 2) return (n = this.node()["__on" + type]) && n._;
        capture = false;
      }
      return this.each(d3_selection_on(type, listener, capture));
    };
    function d3_selection_on(type, listener, capture) {
      var name = "__on" + type,
          i = type.indexOf("."),
          wrap = d3_selection_onListener;
      if (i > 0) type = type.slice(0, i);
      var filter = d3_selection_onFilters.get(type);
      if (filter) type = filter, wrap = d3_selection_onFilter;
      function onRemove() {
        var l = this[name];
        if (l) {
          this.removeEventListener(type, l, l.$);
          delete this[name];
        }
      }
      function onAdd() {
        var l = wrap(listener, d3_array(arguments));
        onRemove.call(this);
        this.addEventListener(type, this[name] = l, l.$ = capture);
        l._ = listener;
      }
      function removeAll() {
        var re = new RegExp("^__on([^.]+)" + d3.requote(type) + "$"),
            match;
        for (var name in this) {
          if (match = name.match(re)) {
            var l = this[name];
            this.removeEventListener(match[1], l, l.$);
            delete this[name];
          }
        }
      }
      return i ? listener ? onAdd : onRemove : listener ? d3_noop : removeAll;
    }
    var d3_selection_onFilters = d3.map({
      mouseenter: "mouseover",
      mouseleave: "mouseout"
    });
    if (d3_document) {
      d3_selection_onFilters.forEach(function (k) {
        if ("on" + k in d3_document) d3_selection_onFilters.remove(k);
      });
    }
    function d3_selection_onListener(listener, argumentz) {
      return function (e) {
        var o = d3.event;
        d3.event = e;
        argumentz[0] = this.__data__;
        try {
          listener.apply(this, argumentz);
        } finally {
          d3.event = o;
        }
      };
    }
    function d3_selection_onFilter(listener, argumentz) {
      var l = d3_selection_onListener(listener, argumentz);
      return function (e) {
        var target = this,
            related = e.relatedTarget;
        if (!related || related !== target && !(related.compareDocumentPosition(target) & 8)) {
          l.call(target, e);
        }
      };
    }
    var d3_event_dragSelect,
        d3_event_dragId = 0;
    function d3_event_dragSuppress(node) {
      var name = ".dragsuppress-" + ++d3_event_dragId,
          click = "click" + name,
          w = d3.select(d3_window(node)).on("touchmove" + name, d3_eventPreventDefault).on("dragstart" + name, d3_eventPreventDefault).on("selectstart" + name, d3_eventPreventDefault);
      if (d3_event_dragSelect == null) {
        d3_event_dragSelect = "onselectstart" in node ? false : d3_vendorSymbol(node.style, "userSelect");
      }
      if (d3_event_dragSelect) {
        var style = d3_documentElement(node).style,
            select = style[d3_event_dragSelect];
        style[d3_event_dragSelect] = "none";
      }
      return function (suppressClick) {
        w.on(name, null);
        if (d3_event_dragSelect) style[d3_event_dragSelect] = select;
        if (suppressClick) {
          var off = function off() {
            w.on(click, null);
          };
          w.on(click, function () {
            d3_eventPreventDefault();
            off();
          }, true);
          setTimeout(off, 0);
        }
      };
    }
    d3.mouse = function (container) {
      return d3_mousePoint(container, d3_eventSource());
    };
    var d3_mouse_bug44083 = this.navigator && /WebKit/.test(this.navigator.userAgent) ? -1 : 0;
    function d3_mousePoint(container, e) {
      if (e.changedTouches) e = e.changedTouches[0];
      var svg = container.ownerSVGElement || container;
      if (svg.createSVGPoint) {
        var point = svg.createSVGPoint();
        if (d3_mouse_bug44083 < 0) {
          var window = d3_window(container);
          if (window.scrollX || window.scrollY) {
            svg = d3.select("body").append("svg").style({
              position: "absolute",
              top: 0,
              left: 0,
              margin: 0,
              padding: 0,
              border: "none"
            }, "important");
            var ctm = svg[0][0].getScreenCTM();
            d3_mouse_bug44083 = !(ctm.f || ctm.e);
            svg.remove();
          }
        }
        if (d3_mouse_bug44083) point.x = e.pageX, point.y = e.pageY;else point.x = e.clientX, point.y = e.clientY;
        point = point.matrixTransform(container.getScreenCTM().inverse());
        return [point.x, point.y];
      }
      var rect = container.getBoundingClientRect();
      return [e.clientX - rect.left - container.clientLeft, e.clientY - rect.top - container.clientTop];
    }
    d3.touch = function (container, touches, identifier) {
      if (arguments.length < 3) identifier = touches, touches = d3_eventSource().changedTouches;
      if (touches) for (var i = 0, n = touches.length, touch; i < n; ++i) {
        if ((touch = touches[i]).identifier === identifier) {
          return d3_mousePoint(container, touch);
        }
      }
    };
    d3.behavior.drag = function () {
      var event = d3_eventDispatch(drag, "drag", "dragstart", "dragend"),
          origin = null,
          mousedown = dragstart(d3_noop, d3.mouse, d3_window, "mousemove", "mouseup"),
          touchstart = dragstart(d3_behavior_dragTouchId, d3.touch, d3_identity, "touchmove", "touchend");
      function drag() {
        this.on("mousedown.drag", mousedown).on("touchstart.drag", touchstart);
      }
      function dragstart(id, position, subject, move, end) {
        return function () {
          var that = this,
              target = d3.event.target,
              parent = that.parentNode,
              dispatch = event.of(that, arguments),
              dragged = 0,
              dragId = id(),
              dragName = ".drag" + (dragId == null ? "" : "-" + dragId),
              dragOffset,
              dragSubject = d3.select(subject(target)).on(move + dragName, moved).on(end + dragName, ended),
              dragRestore = d3_event_dragSuppress(target),
              position0 = position(parent, dragId);
          if (origin) {
            dragOffset = origin.apply(that, arguments);
            dragOffset = [dragOffset.x - position0[0], dragOffset.y - position0[1]];
          } else {
            dragOffset = [0, 0];
          }
          dispatch({
            type: "dragstart"
          });
          function moved() {
            var position1 = position(parent, dragId),
                dx,
                dy;
            if (!position1) return;
            dx = position1[0] - position0[0];
            dy = position1[1] - position0[1];
            dragged |= dx | dy;
            position0 = position1;
            dispatch({
              type: "drag",
              x: position1[0] + dragOffset[0],
              y: position1[1] + dragOffset[1],
              dx: dx,
              dy: dy
            });
          }
          function ended() {
            if (!position(parent, dragId)) return;
            dragSubject.on(move + dragName, null).on(end + dragName, null);
            dragRestore(dragged);
            dispatch({
              type: "dragend"
            });
          }
        };
      }
      drag.origin = function (x) {
        if (!arguments.length) return origin;
        origin = x;
        return drag;
      };
      return d3.rebind(drag, event, "on");
    };
    function d3_behavior_dragTouchId() {
      return d3.event.changedTouches[0].identifier;
    }
    d3.touches = function (container, touches) {
      if (arguments.length < 2) touches = d3_eventSource().touches;
      return touches ? d3_array(touches).map(function (touch) {
        var point = d3_mousePoint(container, touch);
        point.identifier = touch.identifier;
        return point;
      }) : [];
    };
    var ε = 1e-6,
        ε2 = ε * ε,
        π = Math.PI,
        τ = 2 * π,
        τε = τ - ε,
        halfπ = π / 2,
        d3_radians = π / 180,
        d3_degrees = 180 / π;
    function d3_sgn(x) {
      return x > 0 ? 1 : x < 0 ? -1 : 0;
    }
    function d3_cross2d(a, b, c) {
      return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    }
    function d3_acos(x) {
      return x > 1 ? 0 : x < -1 ? π : Math.acos(x);
    }
    function d3_asin(x) {
      return x > 1 ? halfπ : x < -1 ? -halfπ : Math.asin(x);
    }
    function d3_sinh(x) {
      return ((x = Math.exp(x)) - 1 / x) / 2;
    }
    function d3_cosh(x) {
      return ((x = Math.exp(x)) + 1 / x) / 2;
    }
    function d3_tanh(x) {
      return ((x = Math.exp(2 * x)) - 1) / (x + 1);
    }
    function d3_haversin(x) {
      return (x = Math.sin(x / 2)) * x;
    }
    var ρ = Math.SQRT2,
        ρ2 = 2,
        ρ4 = 4;
    d3.interpolateZoom = function (p0, p1) {
      var ux0 = p0[0],
          uy0 = p0[1],
          w0 = p0[2],
          ux1 = p1[0],
          uy1 = p1[1],
          w1 = p1[2],
          dx = ux1 - ux0,
          dy = uy1 - uy0,
          d2 = dx * dx + dy * dy,
          i,
          S;
      if (d2 < ε2) {
        S = Math.log(w1 / w0) / ρ;
        i = function i(t) {
          return [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(ρ * t * S)];
        };
      } else {
        var d1 = Math.sqrt(d2),
            b0 = (w1 * w1 - w0 * w0 + ρ4 * d2) / (2 * w0 * ρ2 * d1),
            b1 = (w1 * w1 - w0 * w0 - ρ4 * d2) / (2 * w1 * ρ2 * d1),
            r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
            r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
        S = (r1 - r0) / ρ;
        i = function i(t) {
          var s = t * S,
              coshr0 = d3_cosh(r0),
              u = w0 / (ρ2 * d1) * (coshr0 * d3_tanh(ρ * s + r0) - d3_sinh(r0));
          return [ux0 + u * dx, uy0 + u * dy, w0 * coshr0 / d3_cosh(ρ * s + r0)];
        };
      }
      i.duration = S * 1e3;
      return i;
    };
    d3.behavior.zoom = function () {
      var view = {
        x: 0,
        y: 0,
        k: 1
      },
          translate0,
          center0,
          center,
          size = [960, 500],
          scaleExtent = d3_behavior_zoomInfinity,
          duration = 250,
          zooming = 0,
          mousedown = "mousedown.zoom",
          mousemove = "mousemove.zoom",
          mouseup = "mouseup.zoom",
          mousewheelTimer,
          touchstart = "touchstart.zoom",
          touchtime,
          event = d3_eventDispatch(zoom, "zoomstart", "zoom", "zoomend"),
          x0,
          x1,
          y0,
          y1;
      if (!d3_behavior_zoomWheel) {
        d3_behavior_zoomWheel = "onwheel" in d3_document ? (d3_behavior_zoomDelta = function d3_behavior_zoomDelta() {
          return -d3.event.deltaY * (d3.event.deltaMode ? 120 : 1);
        }, "wheel") : "onmousewheel" in d3_document ? (d3_behavior_zoomDelta = function d3_behavior_zoomDelta() {
          return d3.event.wheelDelta;
        }, "mousewheel") : (d3_behavior_zoomDelta = function d3_behavior_zoomDelta() {
          return -d3.event.detail;
        }, "MozMousePixelScroll");
      }
      function zoom(g) {
        g.on(mousedown, mousedowned).on(d3_behavior_zoomWheel + ".zoom", mousewheeled).on("dblclick.zoom", dblclicked).on(touchstart, touchstarted);
      }
      zoom.event = function (g) {
        g.each(function () {
          var dispatch = event.of(this, arguments),
              view1 = view;
          if (d3_transitionInheritId) {
            d3.select(this).transition().each("start.zoom", function () {
              view = this.__chart__ || {
                x: 0,
                y: 0,
                k: 1
              };
              zoomstarted(dispatch);
            }).tween("zoom:zoom", function () {
              var dx = size[0],
                  dy = size[1],
                  cx = center0 ? center0[0] : dx / 2,
                  cy = center0 ? center0[1] : dy / 2,
                  i = d3.interpolateZoom([(cx - view.x) / view.k, (cy - view.y) / view.k, dx / view.k], [(cx - view1.x) / view1.k, (cy - view1.y) / view1.k, dx / view1.k]);
              return function (t) {
                var l = i(t),
                    k = dx / l[2];
                this.__chart__ = view = {
                  x: cx - l[0] * k,
                  y: cy - l[1] * k,
                  k: k
                };
                zoomed(dispatch);
              };
            }).each("interrupt.zoom", function () {
              zoomended(dispatch);
            }).each("end.zoom", function () {
              zoomended(dispatch);
            });
          } else {
            this.__chart__ = view;
            zoomstarted(dispatch);
            zoomed(dispatch);
            zoomended(dispatch);
          }
        });
      };
      zoom.translate = function (_) {
        if (!arguments.length) return [view.x, view.y];
        view = {
          x: +_[0],
          y: +_[1],
          k: view.k
        };
        rescale();
        return zoom;
      };
      zoom.scale = function (_) {
        if (!arguments.length) return view.k;
        view = {
          x: view.x,
          y: view.y,
          k: null
        };
        scaleTo(+_);
        rescale();
        return zoom;
      };
      zoom.scaleExtent = function (_) {
        if (!arguments.length) return scaleExtent;
        scaleExtent = _ == null ? d3_behavior_zoomInfinity : [+_[0], +_[1]];
        return zoom;
      };
      zoom.center = function (_) {
        if (!arguments.length) return center;
        center = _ && [+_[0], +_[1]];
        return zoom;
      };
      zoom.size = function (_) {
        if (!arguments.length) return size;
        size = _ && [+_[0], +_[1]];
        return zoom;
      };
      zoom.duration = function (_) {
        if (!arguments.length) return duration;
        duration = +_;
        return zoom;
      };
      zoom.x = function (z) {
        if (!arguments.length) return x1;
        x1 = z;
        x0 = z.copy();
        view = {
          x: 0,
          y: 0,
          k: 1
        };
        return zoom;
      };
      zoom.y = function (z) {
        if (!arguments.length) return y1;
        y1 = z;
        y0 = z.copy();
        view = {
          x: 0,
          y: 0,
          k: 1
        };
        return zoom;
      };
      function location(p) {
        return [(p[0] - view.x) / view.k, (p[1] - view.y) / view.k];
      }
      function point(l) {
        return [l[0] * view.k + view.x, l[1] * view.k + view.y];
      }
      function scaleTo(s) {
        view.k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], s));
      }
      function translateTo(p, l) {
        l = point(l);
        view.x += p[0] - l[0];
        view.y += p[1] - l[1];
      }
      function zoomTo(that, p, l, k) {
        that.__chart__ = {
          x: view.x,
          y: view.y,
          k: view.k
        };
        scaleTo(Math.pow(2, k));
        translateTo(center0 = p, l);
        that = d3.select(that);
        if (duration > 0) that = that.transition().duration(duration);
        that.call(zoom.event);
      }
      function rescale() {
        if (x1) x1.domain(x0.range().map(function (x) {
          return (x - view.x) / view.k;
        }).map(x0.invert));
        if (y1) y1.domain(y0.range().map(function (y) {
          return (y - view.y) / view.k;
        }).map(y0.invert));
      }
      function zoomstarted(dispatch) {
        if (!zooming++) dispatch({
          type: "zoomstart"
        });
      }
      function zoomed(dispatch) {
        rescale();
        dispatch({
          type: "zoom",
          scale: view.k,
          translate: [view.x, view.y]
        });
      }
      function zoomended(dispatch) {
        if (! --zooming) dispatch({
          type: "zoomend"
        }), center0 = null;
      }
      function mousedowned() {
        var that = this,
            dispatch = event.of(that, arguments),
            dragged = 0,
            subject = d3.select(d3_window(that)).on(mousemove, moved).on(mouseup, ended),
            location0 = location(d3.mouse(that)),
            dragRestore = d3_event_dragSuppress(that);
        d3_selection_interrupt.call(that);
        zoomstarted(dispatch);
        function moved() {
          dragged = 1;
          translateTo(d3.mouse(that), location0);
          zoomed(dispatch);
        }
        function ended() {
          subject.on(mousemove, null).on(mouseup, null);
          dragRestore(dragged);
          zoomended(dispatch);
        }
      }
      function touchstarted() {
        var that = this,
            dispatch = event.of(that, arguments),
            locations0 = {},
            distance0 = 0,
            scale0,
            zoomName = ".zoom-" + d3.event.changedTouches[0].identifier,
            touchmove = "touchmove" + zoomName,
            touchend = "touchend" + zoomName,
            targets = [],
            subject = d3.select(that),
            dragRestore = d3_event_dragSuppress(that);
        started();
        zoomstarted(dispatch);
        subject.on(mousedown, null).on(touchstart, started);
        function relocate() {
          var touches = d3.touches(that);
          scale0 = view.k;
          touches.forEach(function (t) {
            if (t.identifier in locations0) locations0[t.identifier] = location(t);
          });
          return touches;
        }
        function started() {
          var target = d3.event.target;
          d3.select(target).on(touchmove, moved).on(touchend, ended);
          targets.push(target);
          var changed = d3.event.changedTouches;
          for (var i = 0, n = changed.length; i < n; ++i) {
            locations0[changed[i].identifier] = null;
          }
          var touches = relocate(),
              now = Date.now();
          if (touches.length === 1) {
            if (now - touchtime < 500) {
              var p = touches[0];
              zoomTo(that, p, locations0[p.identifier], Math.floor(Math.log(view.k) / Math.LN2) + 1);
              d3_eventPreventDefault();
            }
            touchtime = now;
          } else if (touches.length > 1) {
            var p = touches[0],
                q = touches[1],
                dx = p[0] - q[0],
                dy = p[1] - q[1];
            distance0 = dx * dx + dy * dy;
          }
        }
        function moved() {
          var touches = d3.touches(that),
              p0,
              l0,
              p1,
              l1;
          d3_selection_interrupt.call(that);
          for (var i = 0, n = touches.length; i < n; ++i, l1 = null) {
            p1 = touches[i];
            if (l1 = locations0[p1.identifier]) {
              if (l0) break;
              p0 = p1, l0 = l1;
            }
          }
          if (l1) {
            var distance1 = (distance1 = p1[0] - p0[0]) * distance1 + (distance1 = p1[1] - p0[1]) * distance1,
                scale1 = distance0 && Math.sqrt(distance1 / distance0);
            p0 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
            l0 = [(l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2];
            scaleTo(scale1 * scale0);
          }
          touchtime = null;
          translateTo(p0, l0);
          zoomed(dispatch);
        }
        function ended() {
          if (d3.event.touches.length) {
            var changed = d3.event.changedTouches;
            for (var i = 0, n = changed.length; i < n; ++i) {
              delete locations0[changed[i].identifier];
            }
            for (var identifier in locations0) {
              return void relocate();
            }
          }
          d3.selectAll(targets).on(zoomName, null);
          subject.on(mousedown, mousedowned).on(touchstart, touchstarted);
          dragRestore();
          zoomended(dispatch);
        }
      }
      function mousewheeled() {
        var dispatch = event.of(this, arguments);
        if (mousewheelTimer) clearTimeout(mousewheelTimer);else d3_selection_interrupt.call(this), translate0 = location(center0 = center || d3.mouse(this)), zoomstarted(dispatch);
        mousewheelTimer = setTimeout(function () {
          mousewheelTimer = null;
          zoomended(dispatch);
        }, 50);
        d3_eventPreventDefault();
        scaleTo(Math.pow(2, d3_behavior_zoomDelta() * .002) * view.k);
        translateTo(center0, translate0);
        zoomed(dispatch);
      }
      function dblclicked() {
        var p = d3.mouse(this),
            k = Math.log(view.k) / Math.LN2;
        zoomTo(this, p, location(p), d3.event.shiftKey ? Math.ceil(k) - 1 : Math.floor(k) + 1);
      }
      return d3.rebind(zoom, event, "on");
    };
    var d3_behavior_zoomInfinity = [0, Infinity],
        d3_behavior_zoomDelta,
        d3_behavior_zoomWheel;
    d3.color = d3_color;
    function d3_color() {}
    d3_color.prototype.toString = function () {
      return this.rgb() + "";
    };
    d3.hsl = d3_hsl;
    function d3_hsl(h, s, l) {
      return this instanceof d3_hsl ? void (this.h = +h, this.s = +s, this.l = +l) : arguments.length < 2 ? h instanceof d3_hsl ? new d3_hsl(h.h, h.s, h.l) : d3_rgb_parse("" + h, d3_rgb_hsl, d3_hsl) : new d3_hsl(h, s, l);
    }
    var d3_hslPrototype = d3_hsl.prototype = new d3_color();
    d3_hslPrototype.brighter = function (k) {
      k = Math.pow(.7, arguments.length ? k : 1);
      return new d3_hsl(this.h, this.s, this.l / k);
    };
    d3_hslPrototype.darker = function (k) {
      k = Math.pow(.7, arguments.length ? k : 1);
      return new d3_hsl(this.h, this.s, k * this.l);
    };
    d3_hslPrototype.rgb = function () {
      return d3_hsl_rgb(this.h, this.s, this.l);
    };
    function d3_hsl_rgb(h, s, l) {
      var m1, m2;
      h = isNaN(h) ? 0 : (h %= 360) < 0 ? h + 360 : h;
      s = isNaN(s) ? 0 : s < 0 ? 0 : s > 1 ? 1 : s;
      l = l < 0 ? 0 : l > 1 ? 1 : l;
      m2 = l <= .5 ? l * (1 + s) : l + s - l * s;
      m1 = 2 * l - m2;
      function v(h) {
        if (h > 360) h -= 360;else if (h < 0) h += 360;
        if (h < 60) return m1 + (m2 - m1) * h / 60;
        if (h < 180) return m2;
        if (h < 240) return m1 + (m2 - m1) * (240 - h) / 60;
        return m1;
      }
      function vv(h) {
        return Math.round(v(h) * 255);
      }
      return new d3_rgb(vv(h + 120), vv(h), vv(h - 120));
    }
    d3.hcl = d3_hcl;
    function d3_hcl(h, c, l) {
      return this instanceof d3_hcl ? void (this.h = +h, this.c = +c, this.l = +l) : arguments.length < 2 ? h instanceof d3_hcl ? new d3_hcl(h.h, h.c, h.l) : h instanceof d3_lab ? d3_lab_hcl(h.l, h.a, h.b) : d3_lab_hcl((h = d3_rgb_lab((h = d3.rgb(h)).r, h.g, h.b)).l, h.a, h.b) : new d3_hcl(h, c, l);
    }
    var d3_hclPrototype = d3_hcl.prototype = new d3_color();
    d3_hclPrototype.brighter = function (k) {
      return new d3_hcl(this.h, this.c, Math.min(100, this.l + d3_lab_K * (arguments.length ? k : 1)));
    };
    d3_hclPrototype.darker = function (k) {
      return new d3_hcl(this.h, this.c, Math.max(0, this.l - d3_lab_K * (arguments.length ? k : 1)));
    };
    d3_hclPrototype.rgb = function () {
      return d3_hcl_lab(this.h, this.c, this.l).rgb();
    };
    function d3_hcl_lab(h, c, l) {
      if (isNaN(h)) h = 0;
      if (isNaN(c)) c = 0;
      return new d3_lab(l, Math.cos(h *= d3_radians) * c, Math.sin(h) * c);
    }
    d3.lab = d3_lab;
    function d3_lab(l, a, b) {
      return this instanceof d3_lab ? void (this.l = +l, this.a = +a, this.b = +b) : arguments.length < 2 ? l instanceof d3_lab ? new d3_lab(l.l, l.a, l.b) : l instanceof d3_hcl ? d3_hcl_lab(l.h, l.c, l.l) : d3_rgb_lab((l = d3_rgb(l)).r, l.g, l.b) : new d3_lab(l, a, b);
    }
    var d3_lab_K = 18;
    var d3_lab_X = .95047,
        d3_lab_Y = 1,
        d3_lab_Z = 1.08883;
    var d3_labPrototype = d3_lab.prototype = new d3_color();
    d3_labPrototype.brighter = function (k) {
      return new d3_lab(Math.min(100, this.l + d3_lab_K * (arguments.length ? k : 1)), this.a, this.b);
    };
    d3_labPrototype.darker = function (k) {
      return new d3_lab(Math.max(0, this.l - d3_lab_K * (arguments.length ? k : 1)), this.a, this.b);
    };
    d3_labPrototype.rgb = function () {
      return d3_lab_rgb(this.l, this.a, this.b);
    };
    function d3_lab_rgb(l, a, b) {
      var y = (l + 16) / 116,
          x = y + a / 500,
          z = y - b / 200;
      x = d3_lab_xyz(x) * d3_lab_X;
      y = d3_lab_xyz(y) * d3_lab_Y;
      z = d3_lab_xyz(z) * d3_lab_Z;
      return new d3_rgb(d3_xyz_rgb(3.2404542 * x - 1.5371385 * y - .4985314 * z), d3_xyz_rgb(-.969266 * x + 1.8760108 * y + .041556 * z), d3_xyz_rgb(.0556434 * x - .2040259 * y + 1.0572252 * z));
    }
    function d3_lab_hcl(l, a, b) {
      return l > 0 ? new d3_hcl(Math.atan2(b, a) * d3_degrees, Math.sqrt(a * a + b * b), l) : new d3_hcl(NaN, NaN, l);
    }
    function d3_lab_xyz(x) {
      return x > .206893034 ? x * x * x : (x - 4 / 29) / 7.787037;
    }
    function d3_xyz_lab(x) {
      return x > .008856 ? Math.pow(x, 1 / 3) : 7.787037 * x + 4 / 29;
    }
    function d3_xyz_rgb(r) {
      return Math.round(255 * (r <= .00304 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - .055));
    }
    d3.rgb = d3_rgb;
    function d3_rgb(r, g, b) {
      return this instanceof d3_rgb ? void (this.r = ~~r, this.g = ~~g, this.b = ~~b) : arguments.length < 2 ? r instanceof d3_rgb ? new d3_rgb(r.r, r.g, r.b) : d3_rgb_parse("" + r, d3_rgb, d3_hsl_rgb) : new d3_rgb(r, g, b);
    }
    function d3_rgbNumber(value) {
      return new d3_rgb(value >> 16, value >> 8 & 255, value & 255);
    }
    function d3_rgbString(value) {
      return d3_rgbNumber(value) + "";
    }
    var d3_rgbPrototype = d3_rgb.prototype = new d3_color();
    d3_rgbPrototype.brighter = function (k) {
      k = Math.pow(.7, arguments.length ? k : 1);
      var r = this.r,
          g = this.g,
          b = this.b,
          i = 30;
      if (!r && !g && !b) return new d3_rgb(i, i, i);
      if (r && r < i) r = i;
      if (g && g < i) g = i;
      if (b && b < i) b = i;
      return new d3_rgb(Math.min(255, r / k), Math.min(255, g / k), Math.min(255, b / k));
    };
    d3_rgbPrototype.darker = function (k) {
      k = Math.pow(.7, arguments.length ? k : 1);
      return new d3_rgb(k * this.r, k * this.g, k * this.b);
    };
    d3_rgbPrototype.hsl = function () {
      return d3_rgb_hsl(this.r, this.g, this.b);
    };
    d3_rgbPrototype.toString = function () {
      return "#" + d3_rgb_hex(this.r) + d3_rgb_hex(this.g) + d3_rgb_hex(this.b);
    };
    function d3_rgb_hex(v) {
      return v < 16 ? "0" + Math.max(0, v).toString(16) : Math.min(255, v).toString(16);
    }
    function d3_rgb_parse(format, rgb, hsl) {
      var r = 0,
          g = 0,
          b = 0,
          m1,
          m2,
          color;
      m1 = /([a-z]+)\((.*)\)/.exec(format = format.toLowerCase());
      if (m1) {
        m2 = m1[2].split(",");
        switch (m1[1]) {
          case "hsl":
            {
              return hsl(parseFloat(m2[0]), parseFloat(m2[1]) / 100, parseFloat(m2[2]) / 100);
            }

          case "rgb":
            {
              return rgb(d3_rgb_parseNumber(m2[0]), d3_rgb_parseNumber(m2[1]), d3_rgb_parseNumber(m2[2]));
            }
        }
      }
      if (color = d3_rgb_names.get(format)) {
        return rgb(color.r, color.g, color.b);
      }
      if (format != null && format.charAt(0) === "#" && !isNaN(color = parseInt(format.slice(1), 16))) {
        if (format.length === 4) {
          r = (color & 3840) >> 4;
          r = r >> 4 | r;
          g = color & 240;
          g = g >> 4 | g;
          b = color & 15;
          b = b << 4 | b;
        } else if (format.length === 7) {
          r = (color & 16711680) >> 16;
          g = (color & 65280) >> 8;
          b = color & 255;
        }
      }
      return rgb(r, g, b);
    }
    function d3_rgb_hsl(r, g, b) {
      var min = Math.min(r /= 255, g /= 255, b /= 255),
          max = Math.max(r, g, b),
          d = max - min,
          h,
          s,
          l = (max + min) / 2;
      if (d) {
        s = l < .5 ? d / (max + min) : d / (2 - max - min);
        if (r == max) h = (g - b) / d + (g < b ? 6 : 0);else if (g == max) h = (b - r) / d + 2;else h = (r - g) / d + 4;
        h *= 60;
      } else {
        h = NaN;
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new d3_hsl(h, s, l);
    }
    function d3_rgb_lab(r, g, b) {
      r = d3_rgb_xyz(r);
      g = d3_rgb_xyz(g);
      b = d3_rgb_xyz(b);
      var x = d3_xyz_lab((.4124564 * r + .3575761 * g + .1804375 * b) / d3_lab_X),
          y = d3_xyz_lab((.2126729 * r + .7151522 * g + .072175 * b) / d3_lab_Y),
          z = d3_xyz_lab((.0193339 * r + .119192 * g + .9503041 * b) / d3_lab_Z);
      return d3_lab(116 * y - 16, 500 * (x - y), 200 * (y - z));
    }
    function d3_rgb_xyz(r) {
      return (r /= 255) <= .04045 ? r / 12.92 : Math.pow((r + .055) / 1.055, 2.4);
    }
    function d3_rgb_parseNumber(c) {
      var f = parseFloat(c);
      return c.charAt(c.length - 1) === "%" ? Math.round(f * 2.55) : f;
    }
    var d3_rgb_names = d3.map({
      aliceblue: 15792383,
      antiquewhite: 16444375,
      aqua: 65535,
      aquamarine: 8388564,
      azure: 15794175,
      beige: 16119260,
      bisque: 16770244,
      black: 0,
      blanchedalmond: 16772045,
      blue: 255,
      blueviolet: 9055202,
      brown: 10824234,
      burlywood: 14596231,
      cadetblue: 6266528,
      chartreuse: 8388352,
      chocolate: 13789470,
      coral: 16744272,
      cornflowerblue: 6591981,
      cornsilk: 16775388,
      crimson: 14423100,
      cyan: 65535,
      darkblue: 139,
      darkcyan: 35723,
      darkgoldenrod: 12092939,
      darkgray: 11119017,
      darkgreen: 25600,
      darkgrey: 11119017,
      darkkhaki: 12433259,
      darkmagenta: 9109643,
      darkolivegreen: 5597999,
      darkorange: 16747520,
      darkorchid: 10040012,
      darkred: 9109504,
      darksalmon: 15308410,
      darkseagreen: 9419919,
      darkslateblue: 4734347,
      darkslategray: 3100495,
      darkslategrey: 3100495,
      darkturquoise: 52945,
      darkviolet: 9699539,
      deeppink: 16716947,
      deepskyblue: 49151,
      dimgray: 6908265,
      dimgrey: 6908265,
      dodgerblue: 2003199,
      firebrick: 11674146,
      floralwhite: 16775920,
      forestgreen: 2263842,
      fuchsia: 16711935,
      gainsboro: 14474460,
      ghostwhite: 16316671,
      gold: 16766720,
      goldenrod: 14329120,
      gray: 8421504,
      green: 32768,
      greenyellow: 11403055,
      grey: 8421504,
      honeydew: 15794160,
      hotpink: 16738740,
      indianred: 13458524,
      indigo: 4915330,
      ivory: 16777200,
      khaki: 15787660,
      lavender: 15132410,
      lavenderblush: 16773365,
      lawngreen: 8190976,
      lemonchiffon: 16775885,
      lightblue: 11393254,
      lightcoral: 15761536,
      lightcyan: 14745599,
      lightgoldenrodyellow: 16448210,
      lightgray: 13882323,
      lightgreen: 9498256,
      lightgrey: 13882323,
      lightpink: 16758465,
      lightsalmon: 16752762,
      lightseagreen: 2142890,
      lightskyblue: 8900346,
      lightslategray: 7833753,
      lightslategrey: 7833753,
      lightsteelblue: 11584734,
      lightyellow: 16777184,
      lime: 65280,
      limegreen: 3329330,
      linen: 16445670,
      magenta: 16711935,
      maroon: 8388608,
      mediumaquamarine: 6737322,
      mediumblue: 205,
      mediumorchid: 12211667,
      mediumpurple: 9662683,
      mediumseagreen: 3978097,
      mediumslateblue: 8087790,
      mediumspringgreen: 64154,
      mediumturquoise: 4772300,
      mediumvioletred: 13047173,
      midnightblue: 1644912,
      mintcream: 16121850,
      mistyrose: 16770273,
      moccasin: 16770229,
      navajowhite: 16768685,
      navy: 128,
      oldlace: 16643558,
      olive: 8421376,
      olivedrab: 7048739,
      orange: 16753920,
      orangered: 16729344,
      orchid: 14315734,
      palegoldenrod: 15657130,
      palegreen: 10025880,
      paleturquoise: 11529966,
      palevioletred: 14381203,
      papayawhip: 16773077,
      peachpuff: 16767673,
      peru: 13468991,
      pink: 16761035,
      plum: 14524637,
      powderblue: 11591910,
      purple: 8388736,
      rebeccapurple: 6697881,
      red: 16711680,
      rosybrown: 12357519,
      royalblue: 4286945,
      saddlebrown: 9127187,
      salmon: 16416882,
      sandybrown: 16032864,
      seagreen: 3050327,
      seashell: 16774638,
      sienna: 10506797,
      silver: 12632256,
      skyblue: 8900331,
      slateblue: 6970061,
      slategray: 7372944,
      slategrey: 7372944,
      snow: 16775930,
      springgreen: 65407,
      steelblue: 4620980,
      tan: 13808780,
      teal: 32896,
      thistle: 14204888,
      tomato: 16737095,
      turquoise: 4251856,
      violet: 15631086,
      wheat: 16113331,
      white: 16777215,
      whitesmoke: 16119285,
      yellow: 16776960,
      yellowgreen: 10145074
    });
    d3_rgb_names.forEach(function (key, value) {
      d3_rgb_names.set(key, d3_rgbNumber(value));
    });
    function d3_functor(v) {
      return typeof v === "function" ? v : function () {
        return v;
      };
    }
    d3.functor = d3_functor;
    d3.xhr = d3_xhrType(d3_identity);
    function d3_xhrType(response) {
      return function (url, mimeType, callback) {
        if (arguments.length === 2 && typeof mimeType === "function") callback = mimeType, mimeType = null;
        return d3_xhr(url, mimeType, response, callback);
      };
    }
    function d3_xhr(url, mimeType, response, callback) {
      var xhr = {},
          dispatch = d3.dispatch("beforesend", "progress", "load", "error"),
          headers = {},
          request = new XMLHttpRequest(),
          responseType = null;
      if (this.XDomainRequest && !("withCredentials" in request) && /^(http(s)?:)?\/\//.test(url)) request = new XDomainRequest();
      "onload" in request ? request.onload = request.onerror = respond : request.onreadystatechange = function () {
        request.readyState > 3 && respond();
      };
      function respond() {
        var status = request.status,
            result;
        if (!status && d3_xhrHasResponse(request) || status >= 200 && status < 300 || status === 304) {
          try {
            result = response.call(xhr, request);
          } catch (e) {
            dispatch.error.call(xhr, e);
            return;
          }
          dispatch.load.call(xhr, result);
        } else {
          dispatch.error.call(xhr, request);
        }
      }
      request.onprogress = function (event) {
        var o = d3.event;
        d3.event = event;
        try {
          dispatch.progress.call(xhr, request);
        } finally {
          d3.event = o;
        }
      };
      xhr.header = function (name, value) {
        name = (name + "").toLowerCase();
        if (arguments.length < 2) return headers[name];
        if (value == null) delete headers[name];else headers[name] = value + "";
        return xhr;
      };
      xhr.mimeType = function (value) {
        if (!arguments.length) return mimeType;
        mimeType = value == null ? null : value + "";
        return xhr;
      };
      xhr.responseType = function (value) {
        if (!arguments.length) return responseType;
        responseType = value;
        return xhr;
      };
      xhr.response = function (value) {
        response = value;
        return xhr;
      };
      ["get", "post"].forEach(function (method) {
        xhr[method] = function () {
          return xhr.send.apply(xhr, [method].concat(d3_array(arguments)));
        };
      });
      xhr.send = function (method, data, callback) {
        if (arguments.length === 2 && typeof data === "function") callback = data, data = null;
        request.open(method, url, true);
        if (mimeType != null && !("accept" in headers)) headers["accept"] = mimeType + ",*/*";
        if (request.setRequestHeader) for (var name in headers) {
          request.setRequestHeader(name, headers[name]);
        }if (mimeType != null && request.overrideMimeType) request.overrideMimeType(mimeType);
        if (responseType != null) request.responseType = responseType;
        if (callback != null) xhr.on("error", callback).on("load", function (request) {
          callback(null, request);
        });
        dispatch.beforesend.call(xhr, request);
        request.send(data == null ? null : data);
        return xhr;
      };
      xhr.abort = function () {
        request.abort();
        return xhr;
      };
      d3.rebind(xhr, dispatch, "on");
      return callback == null ? xhr : xhr.get(d3_xhr_fixCallback(callback));
    }
    function d3_xhr_fixCallback(callback) {
      return callback.length === 1 ? function (error, request) {
        callback(error == null ? request : null);
      } : callback;
    }
    function d3_xhrHasResponse(request) {
      var type = request.responseType;
      return type && type !== "text" ? request.response : request.responseText;
    }
    d3.dsv = function (delimiter, mimeType) {
      var reFormat = new RegExp('["' + delimiter + "\n]"),
          delimiterCode = delimiter.charCodeAt(0);
      function dsv(url, row, callback) {
        if (arguments.length < 3) callback = row, row = null;
        var xhr = d3_xhr(url, mimeType, row == null ? response : typedResponse(row), callback);
        xhr.row = function (_) {
          return arguments.length ? xhr.response((row = _) == null ? response : typedResponse(_)) : row;
        };
        return xhr;
      }
      function response(request) {
        return dsv.parse(request.responseText);
      }
      function typedResponse(f) {
        return function (request) {
          return dsv.parse(request.responseText, f);
        };
      }
      dsv.parse = function (text, f) {
        var o;
        return dsv.parseRows(text, function (row, i) {
          if (o) return o(row, i - 1);
          var a = new Function("d", "return {" + row.map(function (name, i) {
            return JSON.stringify(name) + ": d[" + i + "]";
          }).join(",") + "}");
          o = f ? function (row, i) {
            return f(a(row), i);
          } : a;
        });
      };
      dsv.parseRows = function (text, f) {
        var EOL = {},
            EOF = {},
            rows = [],
            N = text.length,
            I = 0,
            n = 0,
            t,
            eol;
        function token() {
          if (I >= N) return EOF;
          if (eol) return eol = false, EOL;
          var j = I;
          if (text.charCodeAt(j) === 34) {
            var i = j;
            while (i++ < N) {
              if (text.charCodeAt(i) === 34) {
                if (text.charCodeAt(i + 1) !== 34) break;
                ++i;
              }
            }
            I = i + 2;
            var c = text.charCodeAt(i + 1);
            if (c === 13) {
              eol = true;
              if (text.charCodeAt(i + 2) === 10) ++I;
            } else if (c === 10) {
              eol = true;
            }
            return text.slice(j + 1, i).replace(/""/g, '"');
          }
          while (I < N) {
            var c = text.charCodeAt(I++),
                k = 1;
            if (c === 10) eol = true;else if (c === 13) {
              eol = true;
              if (text.charCodeAt(I) === 10) ++I, ++k;
            } else if (c !== delimiterCode) continue;
            return text.slice(j, I - k);
          }
          return text.slice(j);
        }
        while ((t = token()) !== EOF) {
          var a = [];
          while (t !== EOL && t !== EOF) {
            a.push(t);
            t = token();
          }
          if (f && (a = f(a, n++)) == null) continue;
          rows.push(a);
        }
        return rows;
      };
      dsv.format = function (rows) {
        if (Array.isArray(rows[0])) return dsv.formatRows(rows);
        var fieldSet = new d3_Set(),
            fields = [];
        rows.forEach(function (row) {
          for (var field in row) {
            if (!fieldSet.has(field)) {
              fields.push(fieldSet.add(field));
            }
          }
        });
        return [fields.map(formatValue).join(delimiter)].concat(rows.map(function (row) {
          return fields.map(function (field) {
            return formatValue(row[field]);
          }).join(delimiter);
        })).join("\n");
      };
      dsv.formatRows = function (rows) {
        return rows.map(formatRow).join("\n");
      };
      function formatRow(row) {
        return row.map(formatValue).join(delimiter);
      }
      function formatValue(text) {
        return reFormat.test(text) ? '"' + text.replace(/\"/g, '""') + '"' : text;
      }
      return dsv;
    };
    d3.csv = d3.dsv(",", "text/csv");
    d3.tsv = d3.dsv("	", "text/tab-separated-values");
    var d3_timer_queueHead,
        d3_timer_queueTail,
        d3_timer_interval,
        d3_timer_timeout,
        d3_timer_frame = this[d3_vendorSymbol(this, "requestAnimationFrame")] || function (callback) {
      setTimeout(callback, 17);
    };
    d3.timer = function () {
      d3_timer.apply(this, arguments);
    };
    function d3_timer(callback, delay, then) {
      var n = arguments.length;
      if (n < 2) delay = 0;
      if (n < 3) then = Date.now();
      var time = then + delay,
          timer = {
        c: callback,
        t: time,
        n: null
      };
      if (d3_timer_queueTail) d3_timer_queueTail.n = timer;else d3_timer_queueHead = timer;
      d3_timer_queueTail = timer;
      if (!d3_timer_interval) {
        d3_timer_timeout = clearTimeout(d3_timer_timeout);
        d3_timer_interval = 1;
        d3_timer_frame(d3_timer_step);
      }
      return timer;
    }
    function d3_timer_step() {
      var now = d3_timer_mark(),
          delay = d3_timer_sweep() - now;
      if (delay > 24) {
        if (isFinite(delay)) {
          clearTimeout(d3_timer_timeout);
          d3_timer_timeout = setTimeout(d3_timer_step, delay);
        }
        d3_timer_interval = 0;
      } else {
        d3_timer_interval = 1;
        d3_timer_frame(d3_timer_step);
      }
    }
    d3.timer.flush = function () {
      d3_timer_mark();
      d3_timer_sweep();
    };
    function d3_timer_mark() {
      var now = Date.now(),
          timer = d3_timer_queueHead;
      while (timer) {
        if (now >= timer.t && timer.c(now - timer.t)) timer.c = null;
        timer = timer.n;
      }
      return now;
    }
    function d3_timer_sweep() {
      var t0,
          t1 = d3_timer_queueHead,
          time = Infinity;
      while (t1) {
        if (t1.c) {
          if (t1.t < time) time = t1.t;
          t1 = (t0 = t1).n;
        } else {
          t1 = t0 ? t0.n = t1.n : d3_timer_queueHead = t1.n;
        }
      }
      d3_timer_queueTail = t0;
      return time;
    }
    function d3_format_precision(x, p) {
      return p - (x ? Math.ceil(Math.log(x) / Math.LN10) : 1);
    }
    d3.round = function (x, n) {
      return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x);
    };
    var d3_formatPrefixes = ["y", "z", "a", "f", "p", "n", "µ", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y"].map(d3_formatPrefix);
    d3.formatPrefix = function (value, precision) {
      var i = 0;
      if (value = +value) {
        if (value < 0) value *= -1;
        if (precision) value = d3.round(value, d3_format_precision(value, precision));
        i = 1 + Math.floor(1e-12 + Math.log(value) / Math.LN10);
        i = Math.max(-24, Math.min(24, Math.floor((i - 1) / 3) * 3));
      }
      return d3_formatPrefixes[8 + i / 3];
    };
    function d3_formatPrefix(d, i) {
      var k = Math.pow(10, abs(8 - i) * 3);
      return {
        scale: i > 8 ? function (d) {
          return d / k;
        } : function (d) {
          return d * k;
        },
        symbol: d
      };
    }
    function d3_locale_numberFormat(locale) {
      var locale_decimal = locale.decimal,
          locale_thousands = locale.thousands,
          locale_grouping = locale.grouping,
          locale_currency = locale.currency,
          formatGroup = locale_grouping && locale_thousands ? function (value, width) {
        var i = value.length,
            t = [],
            j = 0,
            g = locale_grouping[0],
            length = 0;
        while (i > 0 && g > 0) {
          if (length + g + 1 > width) g = Math.max(1, width - length);
          t.push(value.substring(i -= g, i + g));
          if ((length += g + 1) > width) break;
          g = locale_grouping[j = (j + 1) % locale_grouping.length];
        }
        return t.reverse().join(locale_thousands);
      } : d3_identity;
      return function (specifier) {
        var match = d3_format_re.exec(specifier),
            fill = match[1] || " ",
            align = match[2] || ">",
            sign = match[3] || "-",
            symbol = match[4] || "",
            zfill = match[5],
            width = +match[6],
            comma = match[7],
            precision = match[8],
            type = match[9],
            scale = 1,
            prefix = "",
            suffix = "",
            integer = false,
            exponent = true;
        if (precision) precision = +precision.substring(1);
        if (zfill || fill === "0" && align === "=") {
          zfill = fill = "0";
          align = "=";
        }
        switch (type) {
          case "n":
            comma = true;
            type = "g";
            break;

          case "%":
            scale = 100;
            suffix = "%";
            type = "f";
            break;

          case "p":
            scale = 100;
            suffix = "%";
            type = "r";
            break;

          case "b":
          case "o":
          case "x":
          case "X":
            if (symbol === "#") prefix = "0" + type.toLowerCase();

          case "c":
            exponent = false;

          case "d":
            integer = true;
            precision = 0;
            break;

          case "s":
            scale = -1;
            type = "r";
            break;
        }
        if (symbol === "$") prefix = locale_currency[0], suffix = locale_currency[1];
        if (type == "r" && !precision) type = "g";
        if (precision != null) {
          if (type == "g") precision = Math.max(1, Math.min(21, precision));else if (type == "e" || type == "f") precision = Math.max(0, Math.min(20, precision));
        }
        type = d3_format_types.get(type) || d3_format_typeDefault;
        var zcomma = zfill && comma;
        return function (value) {
          var fullSuffix = suffix;
          if (integer && value % 1) return "";
          var negative = value < 0 || value === 0 && 1 / value < 0 ? (value = -value, "-") : sign === "-" ? "" : sign;
          if (scale < 0) {
            var unit = d3.formatPrefix(value, precision);
            value = unit.scale(value);
            fullSuffix = unit.symbol + suffix;
          } else {
            value *= scale;
          }
          value = type(value, precision);
          var i = value.lastIndexOf("."),
              before,
              after;
          if (i < 0) {
            var j = exponent ? value.lastIndexOf("e") : -1;
            if (j < 0) before = value, after = "";else before = value.substring(0, j), after = value.substring(j);
          } else {
            before = value.substring(0, i);
            after = locale_decimal + value.substring(i + 1);
          }
          if (!zfill && comma) before = formatGroup(before, Infinity);
          var length = prefix.length + before.length + after.length + (zcomma ? 0 : negative.length),
              padding = length < width ? new Array(length = width - length + 1).join(fill) : "";
          if (zcomma) before = formatGroup(padding + before, padding.length ? width - after.length : Infinity);
          negative += prefix;
          value = before + after;
          return (align === "<" ? negative + value + padding : align === ">" ? padding + negative + value : align === "^" ? padding.substring(0, length >>= 1) + negative + value + padding.substring(length) : negative + (zcomma ? value : padding + value)) + fullSuffix;
        };
      };
    }
    var d3_format_re = /(?:([^{])?([<>=^]))?([+\- ])?([$#])?(0)?(\d+)?(,)?(\.-?\d+)?([a-z%])?/i;
    var d3_format_types = d3.map({
      b: function b(x) {
        return x.toString(2);
      },
      c: function c(x) {
        return String.fromCharCode(x);
      },
      o: function o(x) {
        return x.toString(8);
      },
      x: function x(_x) {
        return _x.toString(16);
      },
      X: function X(x) {
        return x.toString(16).toUpperCase();
      },
      g: function g(x, p) {
        return x.toPrecision(p);
      },
      e: function e(x, p) {
        return x.toExponential(p);
      },
      f: function f(x, p) {
        return x.toFixed(p);
      },
      r: function r(x, p) {
        return (x = d3.round(x, d3_format_precision(x, p))).toFixed(Math.max(0, Math.min(20, d3_format_precision(x * (1 + 1e-15), p))));
      }
    });
    function d3_format_typeDefault(x) {
      return x + "";
    }
    var d3_time = d3.time = {},
        d3_date = Date;
    function d3_date_utc() {
      this._ = new Date(arguments.length > 1 ? Date.UTC.apply(this, arguments) : arguments[0]);
    }
    d3_date_utc.prototype = {
      getDate: function getDate() {
        return this._.getUTCDate();
      },
      getDay: function getDay() {
        return this._.getUTCDay();
      },
      getFullYear: function getFullYear() {
        return this._.getUTCFullYear();
      },
      getHours: function getHours() {
        return this._.getUTCHours();
      },
      getMilliseconds: function getMilliseconds() {
        return this._.getUTCMilliseconds();
      },
      getMinutes: function getMinutes() {
        return this._.getUTCMinutes();
      },
      getMonth: function getMonth() {
        return this._.getUTCMonth();
      },
      getSeconds: function getSeconds() {
        return this._.getUTCSeconds();
      },
      getTime: function getTime() {
        return this._.getTime();
      },
      getTimezoneOffset: function getTimezoneOffset() {
        return 0;
      },
      valueOf: function valueOf() {
        return this._.valueOf();
      },
      setDate: function setDate() {
        d3_time_prototype.setUTCDate.apply(this._, arguments);
      },
      setDay: function setDay() {
        d3_time_prototype.setUTCDay.apply(this._, arguments);
      },
      setFullYear: function setFullYear() {
        d3_time_prototype.setUTCFullYear.apply(this._, arguments);
      },
      setHours: function setHours() {
        d3_time_prototype.setUTCHours.apply(this._, arguments);
      },
      setMilliseconds: function setMilliseconds() {
        d3_time_prototype.setUTCMilliseconds.apply(this._, arguments);
      },
      setMinutes: function setMinutes() {
        d3_time_prototype.setUTCMinutes.apply(this._, arguments);
      },
      setMonth: function setMonth() {
        d3_time_prototype.setUTCMonth.apply(this._, arguments);
      },
      setSeconds: function setSeconds() {
        d3_time_prototype.setUTCSeconds.apply(this._, arguments);
      },
      setTime: function setTime() {
        d3_time_prototype.setTime.apply(this._, arguments);
      }
    };
    var d3_time_prototype = Date.prototype;
    function d3_time_interval(local, step, number) {
      function round(date) {
        var d0 = local(date),
            d1 = offset(d0, 1);
        return date - d0 < d1 - date ? d0 : d1;
      }
      function ceil(date) {
        step(date = local(new d3_date(date - 1)), 1);
        return date;
      }
      function offset(date, k) {
        step(date = new d3_date(+date), k);
        return date;
      }
      function range(t0, t1, dt) {
        var time = ceil(t0),
            times = [];
        if (dt > 1) {
          while (time < t1) {
            if (!(number(time) % dt)) times.push(new Date(+time));
            step(time, 1);
          }
        } else {
          while (time < t1) {
            times.push(new Date(+time)), step(time, 1);
          }
        }
        return times;
      }
      function range_utc(t0, t1, dt) {
        try {
          d3_date = d3_date_utc;
          var utc = new d3_date_utc();
          utc._ = t0;
          return range(utc, t1, dt);
        } finally {
          d3_date = Date;
        }
      }
      local.floor = local;
      local.round = round;
      local.ceil = ceil;
      local.offset = offset;
      local.range = range;
      var utc = local.utc = d3_time_interval_utc(local);
      utc.floor = utc;
      utc.round = d3_time_interval_utc(round);
      utc.ceil = d3_time_interval_utc(ceil);
      utc.offset = d3_time_interval_utc(offset);
      utc.range = range_utc;
      return local;
    }
    function d3_time_interval_utc(method) {
      return function (date, k) {
        try {
          d3_date = d3_date_utc;
          var utc = new d3_date_utc();
          utc._ = date;
          return method(utc, k)._;
        } finally {
          d3_date = Date;
        }
      };
    }
    d3_time.year = d3_time_interval(function (date) {
      date = d3_time.day(date);
      date.setMonth(0, 1);
      return date;
    }, function (date, offset) {
      date.setFullYear(date.getFullYear() + offset);
    }, function (date) {
      return date.getFullYear();
    });
    d3_time.years = d3_time.year.range;
    d3_time.years.utc = d3_time.year.utc.range;
    d3_time.day = d3_time_interval(function (date) {
      var day = new d3_date(2e3, 0);
      day.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      return day;
    }, function (date, offset) {
      date.setDate(date.getDate() + offset);
    }, function (date) {
      return date.getDate() - 1;
    });
    d3_time.days = d3_time.day.range;
    d3_time.days.utc = d3_time.day.utc.range;
    d3_time.dayOfYear = function (date) {
      var year = d3_time.year(date);
      return Math.floor((date - year - (date.getTimezoneOffset() - year.getTimezoneOffset()) * 6e4) / 864e5);
    };
    ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].forEach(function (day, i) {
      i = 7 - i;
      var interval = d3_time[day] = d3_time_interval(function (date) {
        (date = d3_time.day(date)).setDate(date.getDate() - (date.getDay() + i) % 7);
        return date;
      }, function (date, offset) {
        date.setDate(date.getDate() + Math.floor(offset) * 7);
      }, function (date) {
        var day = d3_time.year(date).getDay();
        return Math.floor((d3_time.dayOfYear(date) + (day + i) % 7) / 7) - (day !== i);
      });
      d3_time[day + "s"] = interval.range;
      d3_time[day + "s"].utc = interval.utc.range;
      d3_time[day + "OfYear"] = function (date) {
        var day = d3_time.year(date).getDay();
        return Math.floor((d3_time.dayOfYear(date) + (day + i) % 7) / 7);
      };
    });
    d3_time.week = d3_time.sunday;
    d3_time.weeks = d3_time.sunday.range;
    d3_time.weeks.utc = d3_time.sunday.utc.range;
    d3_time.weekOfYear = d3_time.sundayOfYear;
    function d3_locale_timeFormat(locale) {
      var locale_dateTime = locale.dateTime,
          locale_date = locale.date,
          locale_time = locale.time,
          locale_periods = locale.periods,
          locale_days = locale.days,
          locale_shortDays = locale.shortDays,
          locale_months = locale.months,
          locale_shortMonths = locale.shortMonths;
      function d3_time_format(template) {
        var n = template.length;
        function format(date) {
          var string = [],
              i = -1,
              j = 0,
              c,
              p,
              f;
          while (++i < n) {
            if (template.charCodeAt(i) === 37) {
              string.push(template.slice(j, i));
              if ((p = d3_time_formatPads[c = template.charAt(++i)]) != null) c = template.charAt(++i);
              if (f = d3_time_formats[c]) c = f(date, p == null ? c === "e" ? " " : "0" : p);
              string.push(c);
              j = i + 1;
            }
          }
          string.push(template.slice(j, i));
          return string.join("");
        }
        format.parse = function (string) {
          var d = {
            y: 1900,
            m: 0,
            d: 1,
            H: 0,
            M: 0,
            S: 0,
            L: 0,
            Z: null
          },
              i = d3_time_parse(d, template, string, 0);
          if (i != string.length) return null;
          if ("p" in d) d.H = d.H % 12 + d.p * 12;
          var localZ = d.Z != null && d3_date !== d3_date_utc,
              date = new (localZ ? d3_date_utc : d3_date)();
          if ("j" in d) date.setFullYear(d.y, 0, d.j);else if ("W" in d || "U" in d) {
            if (!("w" in d)) d.w = "W" in d ? 1 : 0;
            date.setFullYear(d.y, 0, 1);
            date.setFullYear(d.y, 0, "W" in d ? (d.w + 6) % 7 + d.W * 7 - (date.getDay() + 5) % 7 : d.w + d.U * 7 - (date.getDay() + 6) % 7);
          } else date.setFullYear(d.y, d.m, d.d);
          date.setHours(d.H + (d.Z / 100 | 0), d.M + d.Z % 100, d.S, d.L);
          return localZ ? date._ : date;
        };
        format.toString = function () {
          return template;
        };
        return format;
      }
      function d3_time_parse(date, template, string, j) {
        var c,
            p,
            t,
            i = 0,
            n = template.length,
            m = string.length;
        while (i < n) {
          if (j >= m) return -1;
          c = template.charCodeAt(i++);
          if (c === 37) {
            t = template.charAt(i++);
            p = d3_time_parsers[t in d3_time_formatPads ? template.charAt(i++) : t];
            if (!p || (j = p(date, string, j)) < 0) return -1;
          } else if (c != string.charCodeAt(j++)) {
            return -1;
          }
        }
        return j;
      }
      d3_time_format.utc = function (template) {
        var local = d3_time_format(template);
        function format(date) {
          try {
            d3_date = d3_date_utc;
            var utc = new d3_date();
            utc._ = date;
            return local(utc);
          } finally {
            d3_date = Date;
          }
        }
        format.parse = function (string) {
          try {
            d3_date = d3_date_utc;
            var date = local.parse(string);
            return date && date._;
          } finally {
            d3_date = Date;
          }
        };
        format.toString = local.toString;
        return format;
      };
      d3_time_format.multi = d3_time_format.utc.multi = d3_time_formatMulti;
      var d3_time_periodLookup = d3.map(),
          d3_time_dayRe = d3_time_formatRe(locale_days),
          d3_time_dayLookup = d3_time_formatLookup(locale_days),
          d3_time_dayAbbrevRe = d3_time_formatRe(locale_shortDays),
          d3_time_dayAbbrevLookup = d3_time_formatLookup(locale_shortDays),
          d3_time_monthRe = d3_time_formatRe(locale_months),
          d3_time_monthLookup = d3_time_formatLookup(locale_months),
          d3_time_monthAbbrevRe = d3_time_formatRe(locale_shortMonths),
          d3_time_monthAbbrevLookup = d3_time_formatLookup(locale_shortMonths);
      locale_periods.forEach(function (p, i) {
        d3_time_periodLookup.set(p.toLowerCase(), i);
      });
      var d3_time_formats = {
        a: function a(d) {
          return locale_shortDays[d.getDay()];
        },
        A: function A(d) {
          return locale_days[d.getDay()];
        },
        b: function b(d) {
          return locale_shortMonths[d.getMonth()];
        },
        B: function B(d) {
          return locale_months[d.getMonth()];
        },
        c: d3_time_format(locale_dateTime),
        d: function d(_d, p) {
          return d3_time_formatPad(_d.getDate(), p, 2);
        },
        e: function e(d, p) {
          return d3_time_formatPad(d.getDate(), p, 2);
        },
        H: function H(d, p) {
          return d3_time_formatPad(d.getHours(), p, 2);
        },
        I: function I(d, p) {
          return d3_time_formatPad(d.getHours() % 12 || 12, p, 2);
        },
        j: function j(d, p) {
          return d3_time_formatPad(1 + d3_time.dayOfYear(d), p, 3);
        },
        L: function L(d, p) {
          return d3_time_formatPad(d.getMilliseconds(), p, 3);
        },
        m: function m(d, p) {
          return d3_time_formatPad(d.getMonth() + 1, p, 2);
        },
        M: function M(d, p) {
          return d3_time_formatPad(d.getMinutes(), p, 2);
        },
        p: function p(d) {
          return locale_periods[+(d.getHours() >= 12)];
        },
        S: function S(d, p) {
          return d3_time_formatPad(d.getSeconds(), p, 2);
        },
        U: function U(d, p) {
          return d3_time_formatPad(d3_time.sundayOfYear(d), p, 2);
        },
        w: function w(d) {
          return d.getDay();
        },
        W: function W(d, p) {
          return d3_time_formatPad(d3_time.mondayOfYear(d), p, 2);
        },
        x: d3_time_format(locale_date),
        X: d3_time_format(locale_time),
        y: function y(d, p) {
          return d3_time_formatPad(d.getFullYear() % 100, p, 2);
        },
        Y: function Y(d, p) {
          return d3_time_formatPad(d.getFullYear() % 1e4, p, 4);
        },
        Z: d3_time_zone,
        "%": function _() {
          return "%";
        }
      };
      var d3_time_parsers = {
        a: d3_time_parseWeekdayAbbrev,
        A: d3_time_parseWeekday,
        b: d3_time_parseMonthAbbrev,
        B: d3_time_parseMonth,
        c: d3_time_parseLocaleFull,
        d: d3_time_parseDay,
        e: d3_time_parseDay,
        H: d3_time_parseHour24,
        I: d3_time_parseHour24,
        j: d3_time_parseDayOfYear,
        L: d3_time_parseMilliseconds,
        m: d3_time_parseMonthNumber,
        M: d3_time_parseMinutes,
        p: d3_time_parseAmPm,
        S: d3_time_parseSeconds,
        U: d3_time_parseWeekNumberSunday,
        w: d3_time_parseWeekdayNumber,
        W: d3_time_parseWeekNumberMonday,
        x: d3_time_parseLocaleDate,
        X: d3_time_parseLocaleTime,
        y: d3_time_parseYear,
        Y: d3_time_parseFullYear,
        Z: d3_time_parseZone,
        "%": d3_time_parseLiteralPercent
      };
      function d3_time_parseWeekdayAbbrev(date, string, i) {
        d3_time_dayAbbrevRe.lastIndex = 0;
        var n = d3_time_dayAbbrevRe.exec(string.slice(i));
        return n ? (date.w = d3_time_dayAbbrevLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }
      function d3_time_parseWeekday(date, string, i) {
        d3_time_dayRe.lastIndex = 0;
        var n = d3_time_dayRe.exec(string.slice(i));
        return n ? (date.w = d3_time_dayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }
      function d3_time_parseMonthAbbrev(date, string, i) {
        d3_time_monthAbbrevRe.lastIndex = 0;
        var n = d3_time_monthAbbrevRe.exec(string.slice(i));
        return n ? (date.m = d3_time_monthAbbrevLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }
      function d3_time_parseMonth(date, string, i) {
        d3_time_monthRe.lastIndex = 0;
        var n = d3_time_monthRe.exec(string.slice(i));
        return n ? (date.m = d3_time_monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }
      function d3_time_parseLocaleFull(date, string, i) {
        return d3_time_parse(date, d3_time_formats.c.toString(), string, i);
      }
      function d3_time_parseLocaleDate(date, string, i) {
        return d3_time_parse(date, d3_time_formats.x.toString(), string, i);
      }
      function d3_time_parseLocaleTime(date, string, i) {
        return d3_time_parse(date, d3_time_formats.X.toString(), string, i);
      }
      function d3_time_parseAmPm(date, string, i) {
        var n = d3_time_periodLookup.get(string.slice(i, i += 2).toLowerCase());
        return n == null ? -1 : (date.p = n, i);
      }
      return d3_time_format;
    }
    var d3_time_formatPads = {
      "-": "",
      _: " ",
      "0": "0"
    },
        d3_time_numberRe = /^\s*\d+/,
        d3_time_percentRe = /^%/;
    function d3_time_formatPad(value, fill, width) {
      var sign = value < 0 ? "-" : "",
          string = (sign ? -value : value) + "",
          length = string.length;
      return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
    }
    function d3_time_formatRe(names) {
      return new RegExp("^(?:" + names.map(d3.requote).join("|") + ")", "i");
    }
    function d3_time_formatLookup(names) {
      var map = new d3_Map(),
          i = -1,
          n = names.length;
      while (++i < n) {
        map.set(names[i].toLowerCase(), i);
      }return map;
    }
    function d3_time_parseWeekdayNumber(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i, i + 1));
      return n ? (date.w = +n[0], i + n[0].length) : -1;
    }
    function d3_time_parseWeekNumberSunday(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i));
      return n ? (date.U = +n[0], i + n[0].length) : -1;
    }
    function d3_time_parseWeekNumberMonday(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i));
      return n ? (date.W = +n[0], i + n[0].length) : -1;
    }
    function d3_time_parseFullYear(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i, i + 4));
      return n ? (date.y = +n[0], i + n[0].length) : -1;
    }
    function d3_time_parseYear(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i, i + 2));
      return n ? (date.y = d3_time_expandYear(+n[0]), i + n[0].length) : -1;
    }
    function d3_time_parseZone(date, string, i) {
      return (/^[+-]\d{4}$/.test(string = string.slice(i, i + 5)) ? (date.Z = -string, i + 5) : -1
      );
    }
    function d3_time_expandYear(d) {
      return d + (d > 68 ? 1900 : 2e3);
    }
    function d3_time_parseMonthNumber(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i, i + 2));
      return n ? (date.m = n[0] - 1, i + n[0].length) : -1;
    }
    function d3_time_parseDay(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i, i + 2));
      return n ? (date.d = +n[0], i + n[0].length) : -1;
    }
    function d3_time_parseDayOfYear(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i, i + 3));
      return n ? (date.j = +n[0], i + n[0].length) : -1;
    }
    function d3_time_parseHour24(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i, i + 2));
      return n ? (date.H = +n[0], i + n[0].length) : -1;
    }
    function d3_time_parseMinutes(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i, i + 2));
      return n ? (date.M = +n[0], i + n[0].length) : -1;
    }
    function d3_time_parseSeconds(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i, i + 2));
      return n ? (date.S = +n[0], i + n[0].length) : -1;
    }
    function d3_time_parseMilliseconds(date, string, i) {
      d3_time_numberRe.lastIndex = 0;
      var n = d3_time_numberRe.exec(string.slice(i, i + 3));
      return n ? (date.L = +n[0], i + n[0].length) : -1;
    }
    function d3_time_zone(d) {
      var z = d.getTimezoneOffset(),
          zs = z > 0 ? "-" : "+",
          zh = abs(z) / 60 | 0,
          zm = abs(z) % 60;
      return zs + d3_time_formatPad(zh, "0", 2) + d3_time_formatPad(zm, "0", 2);
    }
    function d3_time_parseLiteralPercent(date, string, i) {
      d3_time_percentRe.lastIndex = 0;
      var n = d3_time_percentRe.exec(string.slice(i, i + 1));
      return n ? i + n[0].length : -1;
    }
    function d3_time_formatMulti(formats) {
      var n = formats.length,
          i = -1;
      while (++i < n) {
        formats[i][0] = this(formats[i][0]);
      }return function (date) {
        var i = 0,
            f = formats[i];
        while (!f[1](date)) {
          f = formats[++i];
        }return f[0](date);
      };
    }
    d3.locale = function (locale) {
      return {
        numberFormat: d3_locale_numberFormat(locale),
        timeFormat: d3_locale_timeFormat(locale)
      };
    };
    var d3_locale_enUS = d3.locale({
      decimal: ".",
      thousands: ",",
      grouping: [3],
      currency: ["$", ""],
      dateTime: "%a %b %e %X %Y",
      date: "%m/%d/%Y",
      time: "%H:%M:%S",
      periods: ["AM", "PM"],
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    });
    d3.format = d3_locale_enUS.numberFormat;
    d3.geo = {};
    function d3_adder() {}
    d3_adder.prototype = {
      s: 0,
      t: 0,
      add: function add(y) {
        d3_adderSum(y, this.t, d3_adderTemp);
        d3_adderSum(d3_adderTemp.s, this.s, this);
        if (this.s) this.t += d3_adderTemp.t;else this.s = d3_adderTemp.t;
      },
      reset: function reset() {
        this.s = this.t = 0;
      },
      valueOf: function valueOf() {
        return this.s;
      }
    };
    var d3_adderTemp = new d3_adder();
    function d3_adderSum(a, b, o) {
      var x = o.s = a + b,
          bv = x - a,
          av = x - bv;
      o.t = a - av + (b - bv);
    }
    d3.geo.stream = function (object, listener) {
      if (object && d3_geo_streamObjectType.hasOwnProperty(object.type)) {
        d3_geo_streamObjectType[object.type](object, listener);
      } else {
        d3_geo_streamGeometry(object, listener);
      }
    };
    function d3_geo_streamGeometry(geometry, listener) {
      if (geometry && d3_geo_streamGeometryType.hasOwnProperty(geometry.type)) {
        d3_geo_streamGeometryType[geometry.type](geometry, listener);
      }
    }
    var d3_geo_streamObjectType = {
      Feature: function Feature(feature, listener) {
        d3_geo_streamGeometry(feature.geometry, listener);
      },
      FeatureCollection: function FeatureCollection(object, listener) {
        var features = object.features,
            i = -1,
            n = features.length;
        while (++i < n) {
          d3_geo_streamGeometry(features[i].geometry, listener);
        }
      }
    };
    var d3_geo_streamGeometryType = {
      Sphere: function Sphere(object, listener) {
        listener.sphere();
      },
      Point: function Point(object, listener) {
        object = object.coordinates;
        listener.point(object[0], object[1], object[2]);
      },
      MultiPoint: function MultiPoint(object, listener) {
        var coordinates = object.coordinates,
            i = -1,
            n = coordinates.length;
        while (++i < n) {
          object = coordinates[i], listener.point(object[0], object[1], object[2]);
        }
      },
      LineString: function LineString(object, listener) {
        d3_geo_streamLine(object.coordinates, listener, 0);
      },
      MultiLineString: function MultiLineString(object, listener) {
        var coordinates = object.coordinates,
            i = -1,
            n = coordinates.length;
        while (++i < n) {
          d3_geo_streamLine(coordinates[i], listener, 0);
        }
      },
      Polygon: function Polygon(object, listener) {
        d3_geo_streamPolygon(object.coordinates, listener);
      },
      MultiPolygon: function MultiPolygon(object, listener) {
        var coordinates = object.coordinates,
            i = -1,
            n = coordinates.length;
        while (++i < n) {
          d3_geo_streamPolygon(coordinates[i], listener);
        }
      },
      GeometryCollection: function GeometryCollection(object, listener) {
        var geometries = object.geometries,
            i = -1,
            n = geometries.length;
        while (++i < n) {
          d3_geo_streamGeometry(geometries[i], listener);
        }
      }
    };
    function d3_geo_streamLine(coordinates, listener, closed) {
      var i = -1,
          n = coordinates.length - closed,
          coordinate;
      listener.lineStart();
      while (++i < n) {
        coordinate = coordinates[i], listener.point(coordinate[0], coordinate[1], coordinate[2]);
      }listener.lineEnd();
    }
    function d3_geo_streamPolygon(coordinates, listener) {
      var i = -1,
          n = coordinates.length;
      listener.polygonStart();
      while (++i < n) {
        d3_geo_streamLine(coordinates[i], listener, 1);
      }listener.polygonEnd();
    }
    d3.geo.area = function (object) {
      d3_geo_areaSum = 0;
      d3.geo.stream(object, d3_geo_area);
      return d3_geo_areaSum;
    };
    var d3_geo_areaSum,
        d3_geo_areaRingSum = new d3_adder();
    var d3_geo_area = {
      sphere: function sphere() {
        d3_geo_areaSum += 4 * π;
      },
      point: d3_noop,
      lineStart: d3_noop,
      lineEnd: d3_noop,
      polygonStart: function polygonStart() {
        d3_geo_areaRingSum.reset();
        d3_geo_area.lineStart = d3_geo_areaRingStart;
      },
      polygonEnd: function polygonEnd() {
        var area = 2 * d3_geo_areaRingSum;
        d3_geo_areaSum += area < 0 ? 4 * π + area : area;
        d3_geo_area.lineStart = d3_geo_area.lineEnd = d3_geo_area.point = d3_noop;
      }
    };
    function d3_geo_areaRingStart() {
      var λ00, φ00, λ0, cosφ0, sinφ0;
      d3_geo_area.point = function (λ, φ) {
        d3_geo_area.point = nextPoint;
        λ0 = (λ00 = λ) * d3_radians, cosφ0 = Math.cos(φ = (φ00 = φ) * d3_radians / 2 + π / 4), sinφ0 = Math.sin(φ);
      };
      function nextPoint(λ, φ) {
        λ *= d3_radians;
        φ = φ * d3_radians / 2 + π / 4;
        var dλ = λ - λ0,
            sdλ = dλ >= 0 ? 1 : -1,
            adλ = sdλ * dλ,
            cosφ = Math.cos(φ),
            sinφ = Math.sin(φ),
            k = sinφ0 * sinφ,
            u = cosφ0 * cosφ + k * Math.cos(adλ),
            v = k * sdλ * Math.sin(adλ);
        d3_geo_areaRingSum.add(Math.atan2(v, u));
        λ0 = λ, cosφ0 = cosφ, sinφ0 = sinφ;
      }
      d3_geo_area.lineEnd = function () {
        nextPoint(λ00, φ00);
      };
    }
    function d3_geo_cartesian(spherical) {
      var λ = spherical[0],
          φ = spherical[1],
          cosφ = Math.cos(φ);
      return [cosφ * Math.cos(λ), cosφ * Math.sin(λ), Math.sin(φ)];
    }
    function d3_geo_cartesianDot(a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }
    function d3_geo_cartesianCross(a, b) {
      return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }
    function d3_geo_cartesianAdd(a, b) {
      a[0] += b[0];
      a[1] += b[1];
      a[2] += b[2];
    }
    function d3_geo_cartesianScale(vector, k) {
      return [vector[0] * k, vector[1] * k, vector[2] * k];
    }
    function d3_geo_cartesianNormalize(d) {
      var l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
      d[0] /= l;
      d[1] /= l;
      d[2] /= l;
    }
    function d3_geo_spherical(cartesian) {
      return [Math.atan2(cartesian[1], cartesian[0]), d3_asin(cartesian[2])];
    }
    function d3_geo_sphericalEqual(a, b) {
      return abs(a[0] - b[0]) < ε && abs(a[1] - b[1]) < ε;
    }
    d3.geo.bounds = function () {
      var λ0, φ0, λ1, φ1, λ_, λ__, φ__, p0, dλSum, ranges, range;
      var bound = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function polygonStart() {
          bound.point = ringPoint;
          bound.lineStart = ringStart;
          bound.lineEnd = ringEnd;
          dλSum = 0;
          d3_geo_area.polygonStart();
        },
        polygonEnd: function polygonEnd() {
          d3_geo_area.polygonEnd();
          bound.point = point;
          bound.lineStart = lineStart;
          bound.lineEnd = lineEnd;
          if (d3_geo_areaRingSum < 0) λ0 = -(λ1 = 180), φ0 = -(φ1 = 90);else if (dλSum > ε) φ1 = 90;else if (dλSum < -ε) φ0 = -90;
          range[0] = λ0, range[1] = λ1;
        }
      };
      function point(λ, φ) {
        ranges.push(range = [λ0 = λ, λ1 = λ]);
        if (φ < φ0) φ0 = φ;
        if (φ > φ1) φ1 = φ;
      }
      function linePoint(λ, φ) {
        var p = d3_geo_cartesian([λ * d3_radians, φ * d3_radians]);
        if (p0) {
          var normal = d3_geo_cartesianCross(p0, p),
              equatorial = [normal[1], -normal[0], 0],
              inflection = d3_geo_cartesianCross(equatorial, normal);
          d3_geo_cartesianNormalize(inflection);
          inflection = d3_geo_spherical(inflection);
          var dλ = λ - λ_,
              s = dλ > 0 ? 1 : -1,
              λi = inflection[0] * d3_degrees * s,
              antimeridian = abs(dλ) > 180;
          if (antimeridian ^ (s * λ_ < λi && λi < s * λ)) {
            var φi = inflection[1] * d3_degrees;
            if (φi > φ1) φ1 = φi;
          } else if (λi = (λi + 360) % 360 - 180, antimeridian ^ (s * λ_ < λi && λi < s * λ)) {
            var φi = -inflection[1] * d3_degrees;
            if (φi < φ0) φ0 = φi;
          } else {
            if (φ < φ0) φ0 = φ;
            if (φ > φ1) φ1 = φ;
          }
          if (antimeridian) {
            if (λ < λ_) {
              if (angle(λ0, λ) > angle(λ0, λ1)) λ1 = λ;
            } else {
              if (angle(λ, λ1) > angle(λ0, λ1)) λ0 = λ;
            }
          } else {
            if (λ1 >= λ0) {
              if (λ < λ0) λ0 = λ;
              if (λ > λ1) λ1 = λ;
            } else {
              if (λ > λ_) {
                if (angle(λ0, λ) > angle(λ0, λ1)) λ1 = λ;
              } else {
                if (angle(λ, λ1) > angle(λ0, λ1)) λ0 = λ;
              }
            }
          }
        } else {
          point(λ, φ);
        }
        p0 = p, λ_ = λ;
      }
      function lineStart() {
        bound.point = linePoint;
      }
      function lineEnd() {
        range[0] = λ0, range[1] = λ1;
        bound.point = point;
        p0 = null;
      }
      function ringPoint(λ, φ) {
        if (p0) {
          var dλ = λ - λ_;
          dλSum += abs(dλ) > 180 ? dλ + (dλ > 0 ? 360 : -360) : dλ;
        } else λ__ = λ, φ__ = φ;
        d3_geo_area.point(λ, φ);
        linePoint(λ, φ);
      }
      function ringStart() {
        d3_geo_area.lineStart();
      }
      function ringEnd() {
        ringPoint(λ__, φ__);
        d3_geo_area.lineEnd();
        if (abs(dλSum) > ε) λ0 = -(λ1 = 180);
        range[0] = λ0, range[1] = λ1;
        p0 = null;
      }
      function angle(λ0, λ1) {
        return (λ1 -= λ0) < 0 ? λ1 + 360 : λ1;
      }
      function compareRanges(a, b) {
        return a[0] - b[0];
      }
      function withinRange(x, range) {
        return range[0] <= range[1] ? range[0] <= x && x <= range[1] : x < range[0] || range[1] < x;
      }
      return function (feature) {
        φ1 = λ1 = -(λ0 = φ0 = Infinity);
        ranges = [];
        d3.geo.stream(feature, bound);
        var n = ranges.length;
        if (n) {
          ranges.sort(compareRanges);
          for (var i = 1, a = ranges[0], b, merged = [a]; i < n; ++i) {
            b = ranges[i];
            if (withinRange(b[0], a) || withinRange(b[1], a)) {
              if (angle(a[0], b[1]) > angle(a[0], a[1])) a[1] = b[1];
              if (angle(b[0], a[1]) > angle(a[0], a[1])) a[0] = b[0];
            } else {
              merged.push(a = b);
            }
          }
          var best = -Infinity,
              dλ;
          for (var n = merged.length - 1, i = 0, a = merged[n], b; i <= n; a = b, ++i) {
            b = merged[i];
            if ((dλ = angle(a[1], b[0])) > best) best = dλ, λ0 = b[0], λ1 = a[1];
          }
        }
        ranges = range = null;
        return λ0 === Infinity || φ0 === Infinity ? [[NaN, NaN], [NaN, NaN]] : [[λ0, φ0], [λ1, φ1]];
      };
    }();
    d3.geo.centroid = function (object) {
      d3_geo_centroidW0 = d3_geo_centroidW1 = d3_geo_centroidX0 = d3_geo_centroidY0 = d3_geo_centroidZ0 = d3_geo_centroidX1 = d3_geo_centroidY1 = d3_geo_centroidZ1 = d3_geo_centroidX2 = d3_geo_centroidY2 = d3_geo_centroidZ2 = 0;
      d3.geo.stream(object, d3_geo_centroid);
      var x = d3_geo_centroidX2,
          y = d3_geo_centroidY2,
          z = d3_geo_centroidZ2,
          m = x * x + y * y + z * z;
      if (m < ε2) {
        x = d3_geo_centroidX1, y = d3_geo_centroidY1, z = d3_geo_centroidZ1;
        if (d3_geo_centroidW1 < ε) x = d3_geo_centroidX0, y = d3_geo_centroidY0, z = d3_geo_centroidZ0;
        m = x * x + y * y + z * z;
        if (m < ε2) return [NaN, NaN];
      }
      return [Math.atan2(y, x) * d3_degrees, d3_asin(z / Math.sqrt(m)) * d3_degrees];
    };
    var d3_geo_centroidW0, d3_geo_centroidW1, d3_geo_centroidX0, d3_geo_centroidY0, d3_geo_centroidZ0, d3_geo_centroidX1, d3_geo_centroidY1, d3_geo_centroidZ1, d3_geo_centroidX2, d3_geo_centroidY2, d3_geo_centroidZ2;
    var d3_geo_centroid = {
      sphere: d3_noop,
      point: d3_geo_centroidPoint,
      lineStart: d3_geo_centroidLineStart,
      lineEnd: d3_geo_centroidLineEnd,
      polygonStart: function polygonStart() {
        d3_geo_centroid.lineStart = d3_geo_centroidRingStart;
      },
      polygonEnd: function polygonEnd() {
        d3_geo_centroid.lineStart = d3_geo_centroidLineStart;
      }
    };
    function d3_geo_centroidPoint(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians);
      d3_geo_centroidPointXYZ(cosφ * Math.cos(λ), cosφ * Math.sin(λ), Math.sin(φ));
    }
    function d3_geo_centroidPointXYZ(x, y, z) {
      ++d3_geo_centroidW0;
      d3_geo_centroidX0 += (x - d3_geo_centroidX0) / d3_geo_centroidW0;
      d3_geo_centroidY0 += (y - d3_geo_centroidY0) / d3_geo_centroidW0;
      d3_geo_centroidZ0 += (z - d3_geo_centroidZ0) / d3_geo_centroidW0;
    }
    function d3_geo_centroidLineStart() {
      var x0, y0, z0;
      d3_geo_centroid.point = function (λ, φ) {
        λ *= d3_radians;
        var cosφ = Math.cos(φ *= d3_radians);
        x0 = cosφ * Math.cos(λ);
        y0 = cosφ * Math.sin(λ);
        z0 = Math.sin(φ);
        d3_geo_centroid.point = nextPoint;
        d3_geo_centroidPointXYZ(x0, y0, z0);
      };
      function nextPoint(λ, φ) {
        λ *= d3_radians;
        var cosφ = Math.cos(φ *= d3_radians),
            x = cosφ * Math.cos(λ),
            y = cosφ * Math.sin(λ),
            z = Math.sin(φ),
            w = Math.atan2(Math.sqrt((w = y0 * z - z0 * y) * w + (w = z0 * x - x0 * z) * w + (w = x0 * y - y0 * x) * w), x0 * x + y0 * y + z0 * z);
        d3_geo_centroidW1 += w;
        d3_geo_centroidX1 += w * (x0 + (x0 = x));
        d3_geo_centroidY1 += w * (y0 + (y0 = y));
        d3_geo_centroidZ1 += w * (z0 + (z0 = z));
        d3_geo_centroidPointXYZ(x0, y0, z0);
      }
    }
    function d3_geo_centroidLineEnd() {
      d3_geo_centroid.point = d3_geo_centroidPoint;
    }
    function d3_geo_centroidRingStart() {
      var λ00, φ00, x0, y0, z0;
      d3_geo_centroid.point = function (λ, φ) {
        λ00 = λ, φ00 = φ;
        d3_geo_centroid.point = nextPoint;
        λ *= d3_radians;
        var cosφ = Math.cos(φ *= d3_radians);
        x0 = cosφ * Math.cos(λ);
        y0 = cosφ * Math.sin(λ);
        z0 = Math.sin(φ);
        d3_geo_centroidPointXYZ(x0, y0, z0);
      };
      d3_geo_centroid.lineEnd = function () {
        nextPoint(λ00, φ00);
        d3_geo_centroid.lineEnd = d3_geo_centroidLineEnd;
        d3_geo_centroid.point = d3_geo_centroidPoint;
      };
      function nextPoint(λ, φ) {
        λ *= d3_radians;
        var cosφ = Math.cos(φ *= d3_radians),
            x = cosφ * Math.cos(λ),
            y = cosφ * Math.sin(λ),
            z = Math.sin(φ),
            cx = y0 * z - z0 * y,
            cy = z0 * x - x0 * z,
            cz = x0 * y - y0 * x,
            m = Math.sqrt(cx * cx + cy * cy + cz * cz),
            u = x0 * x + y0 * y + z0 * z,
            v = m && -d3_acos(u) / m,
            w = Math.atan2(m, u);
        d3_geo_centroidX2 += v * cx;
        d3_geo_centroidY2 += v * cy;
        d3_geo_centroidZ2 += v * cz;
        d3_geo_centroidW1 += w;
        d3_geo_centroidX1 += w * (x0 + (x0 = x));
        d3_geo_centroidY1 += w * (y0 + (y0 = y));
        d3_geo_centroidZ1 += w * (z0 + (z0 = z));
        d3_geo_centroidPointXYZ(x0, y0, z0);
      }
    }
    function d3_geo_compose(a, b) {
      function compose(x, y) {
        return x = a(x, y), b(x[0], x[1]);
      }
      if (a.invert && b.invert) compose.invert = function (x, y) {
        return x = b.invert(x, y), x && a.invert(x[0], x[1]);
      };
      return compose;
    }
    function d3_true() {
      return true;
    }
    function d3_geo_clipPolygon(segments, compare, clipStartInside, interpolate, listener) {
      var subject = [],
          clip = [];
      segments.forEach(function (segment) {
        if ((n = segment.length - 1) <= 0) return;
        var n,
            p0 = segment[0],
            p1 = segment[n];
        if (d3_geo_sphericalEqual(p0, p1)) {
          listener.lineStart();
          for (var i = 0; i < n; ++i) {
            listener.point((p0 = segment[i])[0], p0[1]);
          }listener.lineEnd();
          return;
        }
        var a = new d3_geo_clipPolygonIntersection(p0, segment, null, true),
            b = new d3_geo_clipPolygonIntersection(p0, null, a, false);
        a.o = b;
        subject.push(a);
        clip.push(b);
        a = new d3_geo_clipPolygonIntersection(p1, segment, null, false);
        b = new d3_geo_clipPolygonIntersection(p1, null, a, true);
        a.o = b;
        subject.push(a);
        clip.push(b);
      });
      clip.sort(compare);
      d3_geo_clipPolygonLinkCircular(subject);
      d3_geo_clipPolygonLinkCircular(clip);
      if (!subject.length) return;
      for (var i = 0, entry = clipStartInside, n = clip.length; i < n; ++i) {
        clip[i].e = entry = !entry;
      }
      var start = subject[0],
          points,
          point;
      while (1) {
        var current = start,
            isSubject = true;
        while (current.v) {
          if ((current = current.n) === start) return;
        }points = current.z;
        listener.lineStart();
        do {
          current.v = current.o.v = true;
          if (current.e) {
            if (isSubject) {
              for (var i = 0, n = points.length; i < n; ++i) {
                listener.point((point = points[i])[0], point[1]);
              }
            } else {
              interpolate(current.x, current.n.x, 1, listener);
            }
            current = current.n;
          } else {
            if (isSubject) {
              points = current.p.z;
              for (var i = points.length - 1; i >= 0; --i) {
                listener.point((point = points[i])[0], point[1]);
              }
            } else {
              interpolate(current.x, current.p.x, -1, listener);
            }
            current = current.p;
          }
          current = current.o;
          points = current.z;
          isSubject = !isSubject;
        } while (!current.v);
        listener.lineEnd();
      }
    }
    function d3_geo_clipPolygonLinkCircular(array) {
      if (!(n = array.length)) return;
      var n,
          i = 0,
          a = array[0],
          b;
      while (++i < n) {
        a.n = b = array[i];
        b.p = a;
        a = b;
      }
      a.n = b = array[0];
      b.p = a;
    }
    function d3_geo_clipPolygonIntersection(point, points, other, entry) {
      this.x = point;
      this.z = points;
      this.o = other;
      this.e = entry;
      this.v = false;
      this.n = this.p = null;
    }
    function d3_geo_clip(pointVisible, clipLine, interpolate, clipStart) {
      return function (rotate, listener) {
        var line = clipLine(listener),
            rotatedClipStart = rotate.invert(clipStart[0], clipStart[1]);
        var clip = {
          point: point,
          lineStart: lineStart,
          lineEnd: lineEnd,
          polygonStart: function polygonStart() {
            clip.point = pointRing;
            clip.lineStart = ringStart;
            clip.lineEnd = ringEnd;
            segments = [];
            polygon = [];
          },
          polygonEnd: function polygonEnd() {
            clip.point = point;
            clip.lineStart = lineStart;
            clip.lineEnd = lineEnd;
            segments = d3.merge(segments);
            var clipStartInside = d3_geo_pointInPolygon(rotatedClipStart, polygon);
            if (segments.length) {
              if (!polygonStarted) listener.polygonStart(), polygonStarted = true;
              d3_geo_clipPolygon(segments, d3_geo_clipSort, clipStartInside, interpolate, listener);
            } else if (clipStartInside) {
              if (!polygonStarted) listener.polygonStart(), polygonStarted = true;
              listener.lineStart();
              interpolate(null, null, 1, listener);
              listener.lineEnd();
            }
            if (polygonStarted) listener.polygonEnd(), polygonStarted = false;
            segments = polygon = null;
          },
          sphere: function sphere() {
            listener.polygonStart();
            listener.lineStart();
            interpolate(null, null, 1, listener);
            listener.lineEnd();
            listener.polygonEnd();
          }
        };
        function point(λ, φ) {
          var point = rotate(λ, φ);
          if (pointVisible(λ = point[0], φ = point[1])) listener.point(λ, φ);
        }
        function pointLine(λ, φ) {
          var point = rotate(λ, φ);
          line.point(point[0], point[1]);
        }
        function lineStart() {
          clip.point = pointLine;
          line.lineStart();
        }
        function lineEnd() {
          clip.point = point;
          line.lineEnd();
        }
        var segments;
        var buffer = d3_geo_clipBufferListener(),
            ringListener = clipLine(buffer),
            polygonStarted = false,
            polygon,
            ring;
        function pointRing(λ, φ) {
          ring.push([λ, φ]);
          var point = rotate(λ, φ);
          ringListener.point(point[0], point[1]);
        }
        function ringStart() {
          ringListener.lineStart();
          ring = [];
        }
        function ringEnd() {
          pointRing(ring[0][0], ring[0][1]);
          ringListener.lineEnd();
          var clean = ringListener.clean(),
              ringSegments = buffer.buffer(),
              segment,
              n = ringSegments.length;
          ring.pop();
          polygon.push(ring);
          ring = null;
          if (!n) return;
          if (clean & 1) {
            segment = ringSegments[0];
            var n = segment.length - 1,
                i = -1,
                point;
            if (n > 0) {
              if (!polygonStarted) listener.polygonStart(), polygonStarted = true;
              listener.lineStart();
              while (++i < n) {
                listener.point((point = segment[i])[0], point[1]);
              }listener.lineEnd();
            }
            return;
          }
          if (n > 1 && clean & 2) ringSegments.push(ringSegments.pop().concat(ringSegments.shift()));
          segments.push(ringSegments.filter(d3_geo_clipSegmentLength1));
        }
        return clip;
      };
    }
    function d3_geo_clipSegmentLength1(segment) {
      return segment.length > 1;
    }
    function d3_geo_clipBufferListener() {
      var lines = [],
          line;
      return {
        lineStart: function lineStart() {
          lines.push(line = []);
        },
        point: function point(λ, φ) {
          line.push([λ, φ]);
        },
        lineEnd: d3_noop,
        buffer: function buffer() {
          var buffer = lines;
          lines = [];
          line = null;
          return buffer;
        },
        rejoin: function rejoin() {
          if (lines.length > 1) lines.push(lines.pop().concat(lines.shift()));
        }
      };
    }
    function d3_geo_clipSort(a, b) {
      return ((a = a.x)[0] < 0 ? a[1] - halfπ - ε : halfπ - a[1]) - ((b = b.x)[0] < 0 ? b[1] - halfπ - ε : halfπ - b[1]);
    }
    var d3_geo_clipAntimeridian = d3_geo_clip(d3_true, d3_geo_clipAntimeridianLine, d3_geo_clipAntimeridianInterpolate, [-π, -π / 2]);
    function d3_geo_clipAntimeridianLine(listener) {
      var λ0 = NaN,
          φ0 = NaN,
          sλ0 = NaN,
          _clean;
      return {
        lineStart: function lineStart() {
          listener.lineStart();
          _clean = 1;
        },
        point: function point(λ1, φ1) {
          var sλ1 = λ1 > 0 ? π : -π,
              dλ = abs(λ1 - λ0);
          if (abs(dλ - π) < ε) {
            listener.point(λ0, φ0 = (φ0 + φ1) / 2 > 0 ? halfπ : -halfπ);
            listener.point(sλ0, φ0);
            listener.lineEnd();
            listener.lineStart();
            listener.point(sλ1, φ0);
            listener.point(λ1, φ0);
            _clean = 0;
          } else if (sλ0 !== sλ1 && dλ >= π) {
            if (abs(λ0 - sλ0) < ε) λ0 -= sλ0 * ε;
            if (abs(λ1 - sλ1) < ε) λ1 -= sλ1 * ε;
            φ0 = d3_geo_clipAntimeridianIntersect(λ0, φ0, λ1, φ1);
            listener.point(sλ0, φ0);
            listener.lineEnd();
            listener.lineStart();
            listener.point(sλ1, φ0);
            _clean = 0;
          }
          listener.point(λ0 = λ1, φ0 = φ1);
          sλ0 = sλ1;
        },
        lineEnd: function lineEnd() {
          listener.lineEnd();
          λ0 = φ0 = NaN;
        },
        clean: function clean() {
          return 2 - _clean;
        }
      };
    }
    function d3_geo_clipAntimeridianIntersect(λ0, φ0, λ1, φ1) {
      var cosφ0,
          cosφ1,
          sinλ0_λ1 = Math.sin(λ0 - λ1);
      return abs(sinλ0_λ1) > ε ? Math.atan((Math.sin(φ0) * (cosφ1 = Math.cos(φ1)) * Math.sin(λ1) - Math.sin(φ1) * (cosφ0 = Math.cos(φ0)) * Math.sin(λ0)) / (cosφ0 * cosφ1 * sinλ0_λ1)) : (φ0 + φ1) / 2;
    }
    function d3_geo_clipAntimeridianInterpolate(from, to, direction, listener) {
      var φ;
      if (from == null) {
        φ = direction * halfπ;
        listener.point(-π, φ);
        listener.point(0, φ);
        listener.point(π, φ);
        listener.point(π, 0);
        listener.point(π, -φ);
        listener.point(0, -φ);
        listener.point(-π, -φ);
        listener.point(-π, 0);
        listener.point(-π, φ);
      } else if (abs(from[0] - to[0]) > ε) {
        var s = from[0] < to[0] ? π : -π;
        φ = direction * s / 2;
        listener.point(-s, φ);
        listener.point(0, φ);
        listener.point(s, φ);
      } else {
        listener.point(to[0], to[1]);
      }
    }
    function d3_geo_pointInPolygon(point, polygon) {
      var meridian = point[0],
          parallel = point[1],
          meridianNormal = [Math.sin(meridian), -Math.cos(meridian), 0],
          polarAngle = 0,
          winding = 0;
      d3_geo_areaRingSum.reset();
      for (var i = 0, n = polygon.length; i < n; ++i) {
        var ring = polygon[i],
            m = ring.length;
        if (!m) continue;
        var point0 = ring[0],
            λ0 = point0[0],
            φ0 = point0[1] / 2 + π / 4,
            sinφ0 = Math.sin(φ0),
            cosφ0 = Math.cos(φ0),
            j = 1;
        while (true) {
          if (j === m) j = 0;
          point = ring[j];
          var λ = point[0],
              φ = point[1] / 2 + π / 4,
              sinφ = Math.sin(φ),
              cosφ = Math.cos(φ),
              dλ = λ - λ0,
              sdλ = dλ >= 0 ? 1 : -1,
              adλ = sdλ * dλ,
              antimeridian = adλ > π,
              k = sinφ0 * sinφ;
          d3_geo_areaRingSum.add(Math.atan2(k * sdλ * Math.sin(adλ), cosφ0 * cosφ + k * Math.cos(adλ)));
          polarAngle += antimeridian ? dλ + sdλ * τ : dλ;
          if (antimeridian ^ λ0 >= meridian ^ λ >= meridian) {
            var arc = d3_geo_cartesianCross(d3_geo_cartesian(point0), d3_geo_cartesian(point));
            d3_geo_cartesianNormalize(arc);
            var intersection = d3_geo_cartesianCross(meridianNormal, arc);
            d3_geo_cartesianNormalize(intersection);
            var φarc = (antimeridian ^ dλ >= 0 ? -1 : 1) * d3_asin(intersection[2]);
            if (parallel > φarc || parallel === φarc && (arc[0] || arc[1])) {
              winding += antimeridian ^ dλ >= 0 ? 1 : -1;
            }
          }
          if (!j++) break;
          λ0 = λ, sinφ0 = sinφ, cosφ0 = cosφ, point0 = point;
        }
      }
      return (polarAngle < -ε || polarAngle < ε && d3_geo_areaRingSum < 0) ^ winding & 1;
    }
    function d3_geo_clipCircle(radius) {
      var cr = Math.cos(radius),
          smallRadius = cr > 0,
          notHemisphere = abs(cr) > ε,
          interpolate = d3_geo_circleInterpolate(radius, 6 * d3_radians);
      return d3_geo_clip(visible, clipLine, interpolate, smallRadius ? [0, -radius] : [-π, radius - π]);
      function visible(λ, φ) {
        return Math.cos(λ) * Math.cos(φ) > cr;
      }
      function clipLine(listener) {
        var point0, c0, v0, v00, _clean2;
        return {
          lineStart: function lineStart() {
            v00 = v0 = false;
            _clean2 = 1;
          },
          point: function point(λ, φ) {
            var point1 = [λ, φ],
                point2,
                v = visible(λ, φ),
                c = smallRadius ? v ? 0 : code(λ, φ) : v ? code(λ + (λ < 0 ? π : -π), φ) : 0;
            if (!point0 && (v00 = v0 = v)) listener.lineStart();
            if (v !== v0) {
              point2 = intersect(point0, point1);
              if (d3_geo_sphericalEqual(point0, point2) || d3_geo_sphericalEqual(point1, point2)) {
                point1[0] += ε;
                point1[1] += ε;
                v = visible(point1[0], point1[1]);
              }
            }
            if (v !== v0) {
              _clean2 = 0;
              if (v) {
                listener.lineStart();
                point2 = intersect(point1, point0);
                listener.point(point2[0], point2[1]);
              } else {
                point2 = intersect(point0, point1);
                listener.point(point2[0], point2[1]);
                listener.lineEnd();
              }
              point0 = point2;
            } else if (notHemisphere && point0 && smallRadius ^ v) {
              var t;
              if (!(c & c0) && (t = intersect(point1, point0, true))) {
                _clean2 = 0;
                if (smallRadius) {
                  listener.lineStart();
                  listener.point(t[0][0], t[0][1]);
                  listener.point(t[1][0], t[1][1]);
                  listener.lineEnd();
                } else {
                  listener.point(t[1][0], t[1][1]);
                  listener.lineEnd();
                  listener.lineStart();
                  listener.point(t[0][0], t[0][1]);
                }
              }
            }
            if (v && (!point0 || !d3_geo_sphericalEqual(point0, point1))) {
              listener.point(point1[0], point1[1]);
            }
            point0 = point1, v0 = v, c0 = c;
          },
          lineEnd: function lineEnd() {
            if (v0) listener.lineEnd();
            point0 = null;
          },
          clean: function clean() {
            return _clean2 | (v00 && v0) << 1;
          }
        };
      }
      function intersect(a, b, two) {
        var pa = d3_geo_cartesian(a),
            pb = d3_geo_cartesian(b);
        var n1 = [1, 0, 0],
            n2 = d3_geo_cartesianCross(pa, pb),
            n2n2 = d3_geo_cartesianDot(n2, n2),
            n1n2 = n2[0],
            determinant = n2n2 - n1n2 * n1n2;
        if (!determinant) return !two && a;
        var c1 = cr * n2n2 / determinant,
            c2 = -cr * n1n2 / determinant,
            n1xn2 = d3_geo_cartesianCross(n1, n2),
            A = d3_geo_cartesianScale(n1, c1),
            B = d3_geo_cartesianScale(n2, c2);
        d3_geo_cartesianAdd(A, B);
        var u = n1xn2,
            w = d3_geo_cartesianDot(A, u),
            uu = d3_geo_cartesianDot(u, u),
            t2 = w * w - uu * (d3_geo_cartesianDot(A, A) - 1);
        if (t2 < 0) return;
        var t = Math.sqrt(t2),
            q = d3_geo_cartesianScale(u, (-w - t) / uu);
        d3_geo_cartesianAdd(q, A);
        q = d3_geo_spherical(q);
        if (!two) return q;
        var λ0 = a[0],
            λ1 = b[0],
            φ0 = a[1],
            φ1 = b[1],
            z;
        if (λ1 < λ0) z = λ0, λ0 = λ1, λ1 = z;
        var δλ = λ1 - λ0,
            polar = abs(δλ - π) < ε,
            meridian = polar || δλ < ε;
        if (!polar && φ1 < φ0) z = φ0, φ0 = φ1, φ1 = z;
        if (meridian ? polar ? φ0 + φ1 > 0 ^ q[1] < (abs(q[0] - λ0) < ε ? φ0 : φ1) : φ0 <= q[1] && q[1] <= φ1 : δλ > π ^ (λ0 <= q[0] && q[0] <= λ1)) {
          var q1 = d3_geo_cartesianScale(u, (-w + t) / uu);
          d3_geo_cartesianAdd(q1, A);
          return [q, d3_geo_spherical(q1)];
        }
      }
      function code(λ, φ) {
        var r = smallRadius ? radius : π - radius,
            code = 0;
        if (λ < -r) code |= 1;else if (λ > r) code |= 2;
        if (φ < -r) code |= 4;else if (φ > r) code |= 8;
        return code;
      }
    }
    function d3_geom_clipLine(x0, y0, x1, y1) {
      return function (line) {
        var a = line.a,
            b = line.b,
            ax = a.x,
            ay = a.y,
            bx = b.x,
            by = b.y,
            t0 = 0,
            t1 = 1,
            dx = bx - ax,
            dy = by - ay,
            r;
        r = x0 - ax;
        if (!dx && r > 0) return;
        r /= dx;
        if (dx < 0) {
          if (r < t0) return;
          if (r < t1) t1 = r;
        } else if (dx > 0) {
          if (r > t1) return;
          if (r > t0) t0 = r;
        }
        r = x1 - ax;
        if (!dx && r < 0) return;
        r /= dx;
        if (dx < 0) {
          if (r > t1) return;
          if (r > t0) t0 = r;
        } else if (dx > 0) {
          if (r < t0) return;
          if (r < t1) t1 = r;
        }
        r = y0 - ay;
        if (!dy && r > 0) return;
        r /= dy;
        if (dy < 0) {
          if (r < t0) return;
          if (r < t1) t1 = r;
        } else if (dy > 0) {
          if (r > t1) return;
          if (r > t0) t0 = r;
        }
        r = y1 - ay;
        if (!dy && r < 0) return;
        r /= dy;
        if (dy < 0) {
          if (r > t1) return;
          if (r > t0) t0 = r;
        } else if (dy > 0) {
          if (r < t0) return;
          if (r < t1) t1 = r;
        }
        if (t0 > 0) line.a = {
          x: ax + t0 * dx,
          y: ay + t0 * dy
        };
        if (t1 < 1) line.b = {
          x: ax + t1 * dx,
          y: ay + t1 * dy
        };
        return line;
      };
    }
    var d3_geo_clipExtentMAX = 1e9;
    d3.geo.clipExtent = function () {
      var x0,
          y0,
          x1,
          y1,
          _stream,
          clip,
          clipExtent = {
        stream: function stream(output) {
          if (_stream) _stream.valid = false;
          _stream = clip(output);
          _stream.valid = true;
          return _stream;
        },
        extent: function extent(_) {
          if (!arguments.length) return [[x0, y0], [x1, y1]];
          clip = d3_geo_clipExtent(x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1]);
          if (_stream) _stream.valid = false, _stream = null;
          return clipExtent;
        }
      };
      return clipExtent.extent([[0, 0], [960, 500]]);
    };
    function d3_geo_clipExtent(x0, y0, x1, y1) {
      return function (listener) {
        var listener_ = listener,
            bufferListener = d3_geo_clipBufferListener(),
            clipLine = d3_geom_clipLine(x0, y0, x1, y1),
            segments,
            polygon,
            ring;
        var clip = {
          point: point,
          lineStart: lineStart,
          lineEnd: lineEnd,
          polygonStart: function polygonStart() {
            listener = bufferListener;
            segments = [];
            polygon = [];
            clean = true;
          },
          polygonEnd: function polygonEnd() {
            listener = listener_;
            segments = d3.merge(segments);
            var clipStartInside = insidePolygon([x0, y1]),
                inside = clean && clipStartInside,
                visible = segments.length;
            if (inside || visible) {
              listener.polygonStart();
              if (inside) {
                listener.lineStart();
                interpolate(null, null, 1, listener);
                listener.lineEnd();
              }
              if (visible) {
                d3_geo_clipPolygon(segments, compare, clipStartInside, interpolate, listener);
              }
              listener.polygonEnd();
            }
            segments = polygon = ring = null;
          }
        };
        function insidePolygon(p) {
          var wn = 0,
              n = polygon.length,
              y = p[1];
          for (var i = 0; i < n; ++i) {
            for (var j = 1, v = polygon[i], m = v.length, a = v[0], b; j < m; ++j) {
              b = v[j];
              if (a[1] <= y) {
                if (b[1] > y && d3_cross2d(a, b, p) > 0) ++wn;
              } else {
                if (b[1] <= y && d3_cross2d(a, b, p) < 0) --wn;
              }
              a = b;
            }
          }
          return wn !== 0;
        }
        function interpolate(from, to, direction, listener) {
          var a = 0,
              a1 = 0;
          if (from == null || (a = corner(from, direction)) !== (a1 = corner(to, direction)) || comparePoints(from, to) < 0 ^ direction > 0) {
            do {
              listener.point(a === 0 || a === 3 ? x0 : x1, a > 1 ? y1 : y0);
            } while ((a = (a + direction + 4) % 4) !== a1);
          } else {
            listener.point(to[0], to[1]);
          }
        }
        function pointVisible(x, y) {
          return x0 <= x && x <= x1 && y0 <= y && y <= y1;
        }
        function point(x, y) {
          if (pointVisible(x, y)) listener.point(x, y);
        }
        var x__, y__, v__, x_, y_, v_, first, clean;
        function lineStart() {
          clip.point = linePoint;
          if (polygon) polygon.push(ring = []);
          first = true;
          v_ = false;
          x_ = y_ = NaN;
        }
        function lineEnd() {
          if (segments) {
            linePoint(x__, y__);
            if (v__ && v_) bufferListener.rejoin();
            segments.push(bufferListener.buffer());
          }
          clip.point = point;
          if (v_) listener.lineEnd();
        }
        function linePoint(x, y) {
          x = Math.max(-d3_geo_clipExtentMAX, Math.min(d3_geo_clipExtentMAX, x));
          y = Math.max(-d3_geo_clipExtentMAX, Math.min(d3_geo_clipExtentMAX, y));
          var v = pointVisible(x, y);
          if (polygon) ring.push([x, y]);
          if (first) {
            x__ = x, y__ = y, v__ = v;
            first = false;
            if (v) {
              listener.lineStart();
              listener.point(x, y);
            }
          } else {
            if (v && v_) listener.point(x, y);else {
              var l = {
                a: {
                  x: x_,
                  y: y_
                },
                b: {
                  x: x,
                  y: y
                }
              };
              if (clipLine(l)) {
                if (!v_) {
                  listener.lineStart();
                  listener.point(l.a.x, l.a.y);
                }
                listener.point(l.b.x, l.b.y);
                if (!v) listener.lineEnd();
                clean = false;
              } else if (v) {
                listener.lineStart();
                listener.point(x, y);
                clean = false;
              }
            }
          }
          x_ = x, y_ = y, v_ = v;
        }
        return clip;
      };
      function corner(p, direction) {
        return abs(p[0] - x0) < ε ? direction > 0 ? 0 : 3 : abs(p[0] - x1) < ε ? direction > 0 ? 2 : 1 : abs(p[1] - y0) < ε ? direction > 0 ? 1 : 0 : direction > 0 ? 3 : 2;
      }
      function compare(a, b) {
        return comparePoints(a.x, b.x);
      }
      function comparePoints(a, b) {
        var ca = corner(a, 1),
            cb = corner(b, 1);
        return ca !== cb ? ca - cb : ca === 0 ? b[1] - a[1] : ca === 1 ? a[0] - b[0] : ca === 2 ? a[1] - b[1] : b[0] - a[0];
      }
    }
    function d3_geo_conic(projectAt) {
      var φ0 = 0,
          φ1 = π / 3,
          m = d3_geo_projectionMutator(projectAt),
          p = m(φ0, φ1);
      p.parallels = function (_) {
        if (!arguments.length) return [φ0 / π * 180, φ1 / π * 180];
        return m(φ0 = _[0] * π / 180, φ1 = _[1] * π / 180);
      };
      return p;
    }
    function d3_geo_conicEqualArea(φ0, φ1) {
      var sinφ0 = Math.sin(φ0),
          n = (sinφ0 + Math.sin(φ1)) / 2,
          C = 1 + sinφ0 * (2 * n - sinφ0),
          ρ0 = Math.sqrt(C) / n;
      function forward(λ, φ) {
        var ρ = Math.sqrt(C - 2 * n * Math.sin(φ)) / n;
        return [ρ * Math.sin(λ *= n), ρ0 - ρ * Math.cos(λ)];
      }
      forward.invert = function (x, y) {
        var ρ0_y = ρ0 - y;
        return [Math.atan2(x, ρ0_y) / n, d3_asin((C - (x * x + ρ0_y * ρ0_y) * n * n) / (2 * n))];
      };
      return forward;
    }
    (d3.geo.conicEqualArea = function () {
      return d3_geo_conic(d3_geo_conicEqualArea);
    }).raw = d3_geo_conicEqualArea;
    d3.geo.albers = function () {
      return d3.geo.conicEqualArea().rotate([96, 0]).center([-.6, 38.7]).parallels([29.5, 45.5]).scale(1070);
    };
    d3.geo.albersUsa = function () {
      var lower48 = d3.geo.albers();
      var alaska = d3.geo.conicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]);
      var hawaii = d3.geo.conicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]);
      var _point,
          pointStream = {
        point: function point(x, y) {
          _point = [x, y];
        }
      },
          lower48Point,
          alaskaPoint,
          hawaiiPoint;
      function albersUsa(coordinates) {
        var x = coordinates[0],
            y = coordinates[1];
        _point = null;
        (lower48Point(x, y), _point) || (alaskaPoint(x, y), _point) || hawaiiPoint(x, y);
        return _point;
      }
      albersUsa.invert = function (coordinates) {
        var k = lower48.scale(),
            t = lower48.translate(),
            x = (coordinates[0] - t[0]) / k,
            y = (coordinates[1] - t[1]) / k;
        return (y >= .12 && y < .234 && x >= -.425 && x < -.214 ? alaska : y >= .166 && y < .234 && x >= -.214 && x < -.115 ? hawaii : lower48).invert(coordinates);
      };
      albersUsa.stream = function (stream) {
        var lower48Stream = lower48.stream(stream),
            alaskaStream = alaska.stream(stream),
            hawaiiStream = hawaii.stream(stream);
        return {
          point: function point(x, y) {
            lower48Stream.point(x, y);
            alaskaStream.point(x, y);
            hawaiiStream.point(x, y);
          },
          sphere: function sphere() {
            lower48Stream.sphere();
            alaskaStream.sphere();
            hawaiiStream.sphere();
          },
          lineStart: function lineStart() {
            lower48Stream.lineStart();
            alaskaStream.lineStart();
            hawaiiStream.lineStart();
          },
          lineEnd: function lineEnd() {
            lower48Stream.lineEnd();
            alaskaStream.lineEnd();
            hawaiiStream.lineEnd();
          },
          polygonStart: function polygonStart() {
            lower48Stream.polygonStart();
            alaskaStream.polygonStart();
            hawaiiStream.polygonStart();
          },
          polygonEnd: function polygonEnd() {
            lower48Stream.polygonEnd();
            alaskaStream.polygonEnd();
            hawaiiStream.polygonEnd();
          }
        };
      };
      albersUsa.precision = function (_) {
        if (!arguments.length) return lower48.precision();
        lower48.precision(_);
        alaska.precision(_);
        hawaii.precision(_);
        return albersUsa;
      };
      albersUsa.scale = function (_) {
        if (!arguments.length) return lower48.scale();
        lower48.scale(_);
        alaska.scale(_ * .35);
        hawaii.scale(_);
        return albersUsa.translate(lower48.translate());
      };
      albersUsa.translate = function (_) {
        if (!arguments.length) return lower48.translate();
        var k = lower48.scale(),
            x = +_[0],
            y = +_[1];
        lower48Point = lower48.translate(_).clipExtent([[x - .455 * k, y - .238 * k], [x + .455 * k, y + .238 * k]]).stream(pointStream).point;
        alaskaPoint = alaska.translate([x - .307 * k, y + .201 * k]).clipExtent([[x - .425 * k + ε, y + .12 * k + ε], [x - .214 * k - ε, y + .234 * k - ε]]).stream(pointStream).point;
        hawaiiPoint = hawaii.translate([x - .205 * k, y + .212 * k]).clipExtent([[x - .214 * k + ε, y + .166 * k + ε], [x - .115 * k - ε, y + .234 * k - ε]]).stream(pointStream).point;
        return albersUsa;
      };
      return albersUsa.scale(1070);
    };
    var d3_geo_pathAreaSum,
        d3_geo_pathAreaPolygon,
        d3_geo_pathArea = {
      point: d3_noop,
      lineStart: d3_noop,
      lineEnd: d3_noop,
      polygonStart: function polygonStart() {
        d3_geo_pathAreaPolygon = 0;
        d3_geo_pathArea.lineStart = d3_geo_pathAreaRingStart;
      },
      polygonEnd: function polygonEnd() {
        d3_geo_pathArea.lineStart = d3_geo_pathArea.lineEnd = d3_geo_pathArea.point = d3_noop;
        d3_geo_pathAreaSum += abs(d3_geo_pathAreaPolygon / 2);
      }
    };
    function d3_geo_pathAreaRingStart() {
      var x00, y00, x0, y0;
      d3_geo_pathArea.point = function (x, y) {
        d3_geo_pathArea.point = nextPoint;
        x00 = x0 = x, y00 = y0 = y;
      };
      function nextPoint(x, y) {
        d3_geo_pathAreaPolygon += y0 * x - x0 * y;
        x0 = x, y0 = y;
      }
      d3_geo_pathArea.lineEnd = function () {
        nextPoint(x00, y00);
      };
    }
    var d3_geo_pathBoundsX0, d3_geo_pathBoundsY0, d3_geo_pathBoundsX1, d3_geo_pathBoundsY1;
    var d3_geo_pathBounds = {
      point: d3_geo_pathBoundsPoint,
      lineStart: d3_noop,
      lineEnd: d3_noop,
      polygonStart: d3_noop,
      polygonEnd: d3_noop
    };
    function d3_geo_pathBoundsPoint(x, y) {
      if (x < d3_geo_pathBoundsX0) d3_geo_pathBoundsX0 = x;
      if (x > d3_geo_pathBoundsX1) d3_geo_pathBoundsX1 = x;
      if (y < d3_geo_pathBoundsY0) d3_geo_pathBoundsY0 = y;
      if (y > d3_geo_pathBoundsY1) d3_geo_pathBoundsY1 = y;
    }
    function d3_geo_pathBuffer() {
      var pointCircle = d3_geo_pathBufferCircle(4.5),
          buffer = [];
      var stream = {
        point: point,
        lineStart: function lineStart() {
          stream.point = pointLineStart;
        },
        lineEnd: lineEnd,
        polygonStart: function polygonStart() {
          stream.lineEnd = lineEndPolygon;
        },
        polygonEnd: function polygonEnd() {
          stream.lineEnd = lineEnd;
          stream.point = point;
        },
        pointRadius: function pointRadius(_) {
          pointCircle = d3_geo_pathBufferCircle(_);
          return stream;
        },
        result: function result() {
          if (buffer.length) {
            var result = buffer.join("");
            buffer = [];
            return result;
          }
        }
      };
      function point(x, y) {
        buffer.push("M", x, ",", y, pointCircle);
      }
      function pointLineStart(x, y) {
        buffer.push("M", x, ",", y);
        stream.point = pointLine;
      }
      function pointLine(x, y) {
        buffer.push("L", x, ",", y);
      }
      function lineEnd() {
        stream.point = point;
      }
      function lineEndPolygon() {
        buffer.push("Z");
      }
      return stream;
    }
    function d3_geo_pathBufferCircle(radius) {
      return "m0," + radius + "a" + radius + "," + radius + " 0 1,1 0," + -2 * radius + "a" + radius + "," + radius + " 0 1,1 0," + 2 * radius + "z";
    }
    var d3_geo_pathCentroid = {
      point: d3_geo_pathCentroidPoint,
      lineStart: d3_geo_pathCentroidLineStart,
      lineEnd: d3_geo_pathCentroidLineEnd,
      polygonStart: function polygonStart() {
        d3_geo_pathCentroid.lineStart = d3_geo_pathCentroidRingStart;
      },
      polygonEnd: function polygonEnd() {
        d3_geo_pathCentroid.point = d3_geo_pathCentroidPoint;
        d3_geo_pathCentroid.lineStart = d3_geo_pathCentroidLineStart;
        d3_geo_pathCentroid.lineEnd = d3_geo_pathCentroidLineEnd;
      }
    };
    function d3_geo_pathCentroidPoint(x, y) {
      d3_geo_centroidX0 += x;
      d3_geo_centroidY0 += y;
      ++d3_geo_centroidZ0;
    }
    function d3_geo_pathCentroidLineStart() {
      var x0, y0;
      d3_geo_pathCentroid.point = function (x, y) {
        d3_geo_pathCentroid.point = nextPoint;
        d3_geo_pathCentroidPoint(x0 = x, y0 = y);
      };
      function nextPoint(x, y) {
        var dx = x - x0,
            dy = y - y0,
            z = Math.sqrt(dx * dx + dy * dy);
        d3_geo_centroidX1 += z * (x0 + x) / 2;
        d3_geo_centroidY1 += z * (y0 + y) / 2;
        d3_geo_centroidZ1 += z;
        d3_geo_pathCentroidPoint(x0 = x, y0 = y);
      }
    }
    function d3_geo_pathCentroidLineEnd() {
      d3_geo_pathCentroid.point = d3_geo_pathCentroidPoint;
    }
    function d3_geo_pathCentroidRingStart() {
      var x00, y00, x0, y0;
      d3_geo_pathCentroid.point = function (x, y) {
        d3_geo_pathCentroid.point = nextPoint;
        d3_geo_pathCentroidPoint(x00 = x0 = x, y00 = y0 = y);
      };
      function nextPoint(x, y) {
        var dx = x - x0,
            dy = y - y0,
            z = Math.sqrt(dx * dx + dy * dy);
        d3_geo_centroidX1 += z * (x0 + x) / 2;
        d3_geo_centroidY1 += z * (y0 + y) / 2;
        d3_geo_centroidZ1 += z;
        z = y0 * x - x0 * y;
        d3_geo_centroidX2 += z * (x0 + x);
        d3_geo_centroidY2 += z * (y0 + y);
        d3_geo_centroidZ2 += z * 3;
        d3_geo_pathCentroidPoint(x0 = x, y0 = y);
      }
      d3_geo_pathCentroid.lineEnd = function () {
        nextPoint(x00, y00);
      };
    }
    function d3_geo_pathContext(context) {
      var _pointRadius = 4.5;
      var stream = {
        point: point,
        lineStart: function lineStart() {
          stream.point = pointLineStart;
        },
        lineEnd: lineEnd,
        polygonStart: function polygonStart() {
          stream.lineEnd = lineEndPolygon;
        },
        polygonEnd: function polygonEnd() {
          stream.lineEnd = lineEnd;
          stream.point = point;
        },
        pointRadius: function pointRadius(_) {
          _pointRadius = _;
          return stream;
        },
        result: d3_noop
      };
      function point(x, y) {
        context.moveTo(x + _pointRadius, y);
        context.arc(x, y, _pointRadius, 0, τ);
      }
      function pointLineStart(x, y) {
        context.moveTo(x, y);
        stream.point = pointLine;
      }
      function pointLine(x, y) {
        context.lineTo(x, y);
      }
      function lineEnd() {
        stream.point = point;
      }
      function lineEndPolygon() {
        context.closePath();
      }
      return stream;
    }
    function d3_geo_resample(project) {
      var δ2 = .5,
          cosMinDistance = Math.cos(30 * d3_radians),
          maxDepth = 16;
      function resample(stream) {
        return (maxDepth ? resampleRecursive : resampleNone)(stream);
      }
      function resampleNone(stream) {
        return d3_geo_transformPoint(stream, function (x, y) {
          x = project(x, y);
          stream.point(x[0], x[1]);
        });
      }
      function resampleRecursive(stream) {
        var λ00, φ00, x00, y00, a00, b00, c00, λ0, x0, y0, a0, b0, c0;
        var resample = {
          point: point,
          lineStart: lineStart,
          lineEnd: lineEnd,
          polygonStart: function polygonStart() {
            stream.polygonStart();
            resample.lineStart = ringStart;
          },
          polygonEnd: function polygonEnd() {
            stream.polygonEnd();
            resample.lineStart = lineStart;
          }
        };
        function point(x, y) {
          x = project(x, y);
          stream.point(x[0], x[1]);
        }
        function lineStart() {
          x0 = NaN;
          resample.point = linePoint;
          stream.lineStart();
        }
        function linePoint(λ, φ) {
          var c = d3_geo_cartesian([λ, φ]),
              p = project(λ, φ);
          resampleLineTo(x0, y0, λ0, a0, b0, c0, x0 = p[0], y0 = p[1], λ0 = λ, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
          stream.point(x0, y0);
        }
        function lineEnd() {
          resample.point = point;
          stream.lineEnd();
        }
        function ringStart() {
          lineStart();
          resample.point = ringPoint;
          resample.lineEnd = ringEnd;
        }
        function ringPoint(λ, φ) {
          linePoint(λ00 = λ, φ00 = φ), x00 = x0, y00 = y0, a00 = a0, b00 = b0, c00 = c0;
          resample.point = linePoint;
        }
        function ringEnd() {
          resampleLineTo(x0, y0, λ0, a0, b0, c0, x00, y00, λ00, a00, b00, c00, maxDepth, stream);
          resample.lineEnd = lineEnd;
          lineEnd();
        }
        return resample;
      }
      function resampleLineTo(x0, y0, λ0, a0, b0, c0, x1, y1, λ1, a1, b1, c1, depth, stream) {
        var dx = x1 - x0,
            dy = y1 - y0,
            d2 = dx * dx + dy * dy;
        if (d2 > 4 * δ2 && depth--) {
          var a = a0 + a1,
              b = b0 + b1,
              c = c0 + c1,
              m = Math.sqrt(a * a + b * b + c * c),
              φ2 = Math.asin(c /= m),
              λ2 = abs(abs(c) - 1) < ε || abs(λ0 - λ1) < ε ? (λ0 + λ1) / 2 : Math.atan2(b, a),
              p = project(λ2, φ2),
              x2 = p[0],
              y2 = p[1],
              dx2 = x2 - x0,
              dy2 = y2 - y0,
              dz = dy * dx2 - dx * dy2;
          if (dz * dz / d2 > δ2 || abs((dx * dx2 + dy * dy2) / d2 - .5) > .3 || a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) {
            resampleLineTo(x0, y0, λ0, a0, b0, c0, x2, y2, λ2, a /= m, b /= m, c, depth, stream);
            stream.point(x2, y2);
            resampleLineTo(x2, y2, λ2, a, b, c, x1, y1, λ1, a1, b1, c1, depth, stream);
          }
        }
      }
      resample.precision = function (_) {
        if (!arguments.length) return Math.sqrt(δ2);
        maxDepth = (δ2 = _ * _) > 0 && 16;
        return resample;
      };
      return resample;
    }
    d3.geo.path = function () {
      var pointRadius = 4.5,
          projection,
          context,
          projectStream,
          contextStream,
          cacheStream;
      function path(object) {
        if (object) {
          if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
          if (!cacheStream || !cacheStream.valid) cacheStream = projectStream(contextStream);
          d3.geo.stream(object, cacheStream);
        }
        return contextStream.result();
      }
      path.area = function (object) {
        d3_geo_pathAreaSum = 0;
        d3.geo.stream(object, projectStream(d3_geo_pathArea));
        return d3_geo_pathAreaSum;
      };
      path.centroid = function (object) {
        d3_geo_centroidX0 = d3_geo_centroidY0 = d3_geo_centroidZ0 = d3_geo_centroidX1 = d3_geo_centroidY1 = d3_geo_centroidZ1 = d3_geo_centroidX2 = d3_geo_centroidY2 = d3_geo_centroidZ2 = 0;
        d3.geo.stream(object, projectStream(d3_geo_pathCentroid));
        return d3_geo_centroidZ2 ? [d3_geo_centroidX2 / d3_geo_centroidZ2, d3_geo_centroidY2 / d3_geo_centroidZ2] : d3_geo_centroidZ1 ? [d3_geo_centroidX1 / d3_geo_centroidZ1, d3_geo_centroidY1 / d3_geo_centroidZ1] : d3_geo_centroidZ0 ? [d3_geo_centroidX0 / d3_geo_centroidZ0, d3_geo_centroidY0 / d3_geo_centroidZ0] : [NaN, NaN];
      };
      path.bounds = function (object) {
        d3_geo_pathBoundsX1 = d3_geo_pathBoundsY1 = -(d3_geo_pathBoundsX0 = d3_geo_pathBoundsY0 = Infinity);
        d3.geo.stream(object, projectStream(d3_geo_pathBounds));
        return [[d3_geo_pathBoundsX0, d3_geo_pathBoundsY0], [d3_geo_pathBoundsX1, d3_geo_pathBoundsY1]];
      };
      path.projection = function (_) {
        if (!arguments.length) return projection;
        projectStream = (projection = _) ? _.stream || d3_geo_pathProjectStream(_) : d3_identity;
        return reset();
      };
      path.context = function (_) {
        if (!arguments.length) return context;
        contextStream = (context = _) == null ? new d3_geo_pathBuffer() : new d3_geo_pathContext(_);
        if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
        return reset();
      };
      path.pointRadius = function (_) {
        if (!arguments.length) return pointRadius;
        pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
        return path;
      };
      function reset() {
        cacheStream = null;
        return path;
      }
      return path.projection(d3.geo.albersUsa()).context(null);
    };
    function d3_geo_pathProjectStream(project) {
      var resample = d3_geo_resample(function (x, y) {
        return project([x * d3_degrees, y * d3_degrees]);
      });
      return function (stream) {
        return d3_geo_projectionRadians(resample(stream));
      };
    }
    d3.geo.transform = function (methods) {
      return {
        stream: function stream(_stream2) {
          var transform = new d3_geo_transform(_stream2);
          for (var k in methods) {
            transform[k] = methods[k];
          }return transform;
        }
      };
    };
    function d3_geo_transform(stream) {
      this.stream = stream;
    }
    d3_geo_transform.prototype = {
      point: function point(x, y) {
        this.stream.point(x, y);
      },
      sphere: function sphere() {
        this.stream.sphere();
      },
      lineStart: function lineStart() {
        this.stream.lineStart();
      },
      lineEnd: function lineEnd() {
        this.stream.lineEnd();
      },
      polygonStart: function polygonStart() {
        this.stream.polygonStart();
      },
      polygonEnd: function polygonEnd() {
        this.stream.polygonEnd();
      }
    };
    function d3_geo_transformPoint(stream, point) {
      return {
        point: point,
        sphere: function sphere() {
          stream.sphere();
        },
        lineStart: function lineStart() {
          stream.lineStart();
        },
        lineEnd: function lineEnd() {
          stream.lineEnd();
        },
        polygonStart: function polygonStart() {
          stream.polygonStart();
        },
        polygonEnd: function polygonEnd() {
          stream.polygonEnd();
        }
      };
    }
    d3.geo.projection = d3_geo_projection;
    d3.geo.projectionMutator = d3_geo_projectionMutator;
    function d3_geo_projection(project) {
      return d3_geo_projectionMutator(function () {
        return project;
      })();
    }
    function d3_geo_projectionMutator(projectAt) {
      var project,
          rotate,
          projectRotate,
          projectResample = d3_geo_resample(function (x, y) {
        x = project(x, y);
        return [x[0] * k + δx, δy - x[1] * k];
      }),
          k = 150,
          x = 480,
          y = 250,
          λ = 0,
          φ = 0,
          δλ = 0,
          δφ = 0,
          δγ = 0,
          δx,
          δy,
          preclip = d3_geo_clipAntimeridian,
          postclip = d3_identity,
          clipAngle = null,
          clipExtent = null,
          stream;
      function projection(point) {
        point = projectRotate(point[0] * d3_radians, point[1] * d3_radians);
        return [point[0] * k + δx, δy - point[1] * k];
      }
      function invert(point) {
        point = projectRotate.invert((point[0] - δx) / k, (δy - point[1]) / k);
        return point && [point[0] * d3_degrees, point[1] * d3_degrees];
      }
      projection.stream = function (output) {
        if (stream) stream.valid = false;
        stream = d3_geo_projectionRadians(preclip(rotate, projectResample(postclip(output))));
        stream.valid = true;
        return stream;
      };
      projection.clipAngle = function (_) {
        if (!arguments.length) return clipAngle;
        preclip = _ == null ? (clipAngle = _, d3_geo_clipAntimeridian) : d3_geo_clipCircle((clipAngle = +_) * d3_radians);
        return invalidate();
      };
      projection.clipExtent = function (_) {
        if (!arguments.length) return clipExtent;
        clipExtent = _;
        postclip = _ ? d3_geo_clipExtent(_[0][0], _[0][1], _[1][0], _[1][1]) : d3_identity;
        return invalidate();
      };
      projection.scale = function (_) {
        if (!arguments.length) return k;
        k = +_;
        return reset();
      };
      projection.translate = function (_) {
        if (!arguments.length) return [x, y];
        x = +_[0];
        y = +_[1];
        return reset();
      };
      projection.center = function (_) {
        if (!arguments.length) return [λ * d3_degrees, φ * d3_degrees];
        λ = _[0] % 360 * d3_radians;
        φ = _[1] % 360 * d3_radians;
        return reset();
      };
      projection.rotate = function (_) {
        if (!arguments.length) return [δλ * d3_degrees, δφ * d3_degrees, δγ * d3_degrees];
        δλ = _[0] % 360 * d3_radians;
        δφ = _[1] % 360 * d3_radians;
        δγ = _.length > 2 ? _[2] % 360 * d3_radians : 0;
        return reset();
      };
      d3.rebind(projection, projectResample, "precision");
      function reset() {
        projectRotate = d3_geo_compose(rotate = d3_geo_rotation(δλ, δφ, δγ), project);
        var center = project(λ, φ);
        δx = x - center[0] * k;
        δy = y + center[1] * k;
        return invalidate();
      }
      function invalidate() {
        if (stream) stream.valid = false, stream = null;
        return projection;
      }
      return function () {
        project = projectAt.apply(this, arguments);
        projection.invert = project.invert && invert;
        return reset();
      };
    }
    function d3_geo_projectionRadians(stream) {
      return d3_geo_transformPoint(stream, function (x, y) {
        stream.point(x * d3_radians, y * d3_radians);
      });
    }
    function d3_geo_equirectangular(λ, φ) {
      return [λ, φ];
    }
    (d3.geo.equirectangular = function () {
      return d3_geo_projection(d3_geo_equirectangular);
    }).raw = d3_geo_equirectangular.invert = d3_geo_equirectangular;
    d3.geo.rotation = function (rotate) {
      rotate = d3_geo_rotation(rotate[0] % 360 * d3_radians, rotate[1] * d3_radians, rotate.length > 2 ? rotate[2] * d3_radians : 0);
      function forward(coordinates) {
        coordinates = rotate(coordinates[0] * d3_radians, coordinates[1] * d3_radians);
        return coordinates[0] *= d3_degrees, coordinates[1] *= d3_degrees, coordinates;
      }
      forward.invert = function (coordinates) {
        coordinates = rotate.invert(coordinates[0] * d3_radians, coordinates[1] * d3_radians);
        return coordinates[0] *= d3_degrees, coordinates[1] *= d3_degrees, coordinates;
      };
      return forward;
    };
    function d3_geo_identityRotation(λ, φ) {
      return [λ > π ? λ - τ : λ < -π ? λ + τ : λ, φ];
    }
    d3_geo_identityRotation.invert = d3_geo_equirectangular;
    function d3_geo_rotation(δλ, δφ, δγ) {
      return δλ ? δφ || δγ ? d3_geo_compose(d3_geo_rotationλ(δλ), d3_geo_rotationφγ(δφ, δγ)) : d3_geo_rotationλ(δλ) : δφ || δγ ? d3_geo_rotationφγ(δφ, δγ) : d3_geo_identityRotation;
    }
    function d3_geo_forwardRotationλ(δλ) {
      return function (λ, φ) {
        return λ += δλ, [λ > π ? λ - τ : λ < -π ? λ + τ : λ, φ];
      };
    }
    function d3_geo_rotationλ(δλ) {
      var rotation = d3_geo_forwardRotationλ(δλ);
      rotation.invert = d3_geo_forwardRotationλ(-δλ);
      return rotation;
    }
    function d3_geo_rotationφγ(δφ, δγ) {
      var cosδφ = Math.cos(δφ),
          sinδφ = Math.sin(δφ),
          cosδγ = Math.cos(δγ),
          sinδγ = Math.sin(δγ);
      function rotation(λ, φ) {
        var cosφ = Math.cos(φ),
            x = Math.cos(λ) * cosφ,
            y = Math.sin(λ) * cosφ,
            z = Math.sin(φ),
            k = z * cosδφ + x * sinδφ;
        return [Math.atan2(y * cosδγ - k * sinδγ, x * cosδφ - z * sinδφ), d3_asin(k * cosδγ + y * sinδγ)];
      }
      rotation.invert = function (λ, φ) {
        var cosφ = Math.cos(φ),
            x = Math.cos(λ) * cosφ,
            y = Math.sin(λ) * cosφ,
            z = Math.sin(φ),
            k = z * cosδγ - y * sinδγ;
        return [Math.atan2(y * cosδγ + z * sinδγ, x * cosδφ + k * sinδφ), d3_asin(k * cosδφ - x * sinδφ)];
      };
      return rotation;
    }
    d3.geo.circle = function () {
      var origin = [0, 0],
          angle,
          precision = 6,
          interpolate;
      function circle() {
        var center = typeof origin === "function" ? origin.apply(this, arguments) : origin,
            rotate = d3_geo_rotation(-center[0] * d3_radians, -center[1] * d3_radians, 0).invert,
            ring = [];
        interpolate(null, null, 1, {
          point: function point(x, y) {
            ring.push(x = rotate(x, y));
            x[0] *= d3_degrees, x[1] *= d3_degrees;
          }
        });
        return {
          type: "Polygon",
          coordinates: [ring]
        };
      }
      circle.origin = function (x) {
        if (!arguments.length) return origin;
        origin = x;
        return circle;
      };
      circle.angle = function (x) {
        if (!arguments.length) return angle;
        interpolate = d3_geo_circleInterpolate((angle = +x) * d3_radians, precision * d3_radians);
        return circle;
      };
      circle.precision = function (_) {
        if (!arguments.length) return precision;
        interpolate = d3_geo_circleInterpolate(angle * d3_radians, (precision = +_) * d3_radians);
        return circle;
      };
      return circle.angle(90);
    };
    function d3_geo_circleInterpolate(radius, precision) {
      var cr = Math.cos(radius),
          sr = Math.sin(radius);
      return function (from, to, direction, listener) {
        var step = direction * precision;
        if (from != null) {
          from = d3_geo_circleAngle(cr, from);
          to = d3_geo_circleAngle(cr, to);
          if (direction > 0 ? from < to : from > to) from += direction * τ;
        } else {
          from = radius + direction * τ;
          to = radius - .5 * step;
        }
        for (var point, t = from; direction > 0 ? t > to : t < to; t -= step) {
          listener.point((point = d3_geo_spherical([cr, -sr * Math.cos(t), -sr * Math.sin(t)]))[0], point[1]);
        }
      };
    }
    function d3_geo_circleAngle(cr, point) {
      var a = d3_geo_cartesian(point);
      a[0] -= cr;
      d3_geo_cartesianNormalize(a);
      var angle = d3_acos(-a[1]);
      return ((-a[2] < 0 ? -angle : angle) + 2 * Math.PI - ε) % (2 * Math.PI);
    }
    d3.geo.distance = function (a, b) {
      var Δλ = (b[0] - a[0]) * d3_radians,
          φ0 = a[1] * d3_radians,
          φ1 = b[1] * d3_radians,
          sinΔλ = Math.sin(Δλ),
          cosΔλ = Math.cos(Δλ),
          sinφ0 = Math.sin(φ0),
          cosφ0 = Math.cos(φ0),
          sinφ1 = Math.sin(φ1),
          cosφ1 = Math.cos(φ1),
          t;
      return Math.atan2(Math.sqrt((t = cosφ1 * sinΔλ) * t + (t = cosφ0 * sinφ1 - sinφ0 * cosφ1 * cosΔλ) * t), sinφ0 * sinφ1 + cosφ0 * cosφ1 * cosΔλ);
    };
    d3.geo.graticule = function () {
      var x1,
          x0,
          X1,
          X0,
          y1,
          y0,
          Y1,
          Y0,
          dx = 10,
          dy = dx,
          DX = 90,
          DY = 360,
          x,
          y,
          X,
          Y,
          precision = 2.5;
      function graticule() {
        return {
          type: "MultiLineString",
          coordinates: lines()
        };
      }
      function lines() {
        return d3.range(Math.ceil(X0 / DX) * DX, X1, DX).map(X).concat(d3.range(Math.ceil(Y0 / DY) * DY, Y1, DY).map(Y)).concat(d3.range(Math.ceil(x0 / dx) * dx, x1, dx).filter(function (x) {
          return abs(x % DX) > ε;
        }).map(x)).concat(d3.range(Math.ceil(y0 / dy) * dy, y1, dy).filter(function (y) {
          return abs(y % DY) > ε;
        }).map(y));
      }
      graticule.lines = function () {
        return lines().map(function (coordinates) {
          return {
            type: "LineString",
            coordinates: coordinates
          };
        });
      };
      graticule.outline = function () {
        return {
          type: "Polygon",
          coordinates: [X(X0).concat(Y(Y1).slice(1), X(X1).reverse().slice(1), Y(Y0).reverse().slice(1))]
        };
      };
      graticule.extent = function (_) {
        if (!arguments.length) return graticule.minorExtent();
        return graticule.majorExtent(_).minorExtent(_);
      };
      graticule.majorExtent = function (_) {
        if (!arguments.length) return [[X0, Y0], [X1, Y1]];
        X0 = +_[0][0], X1 = +_[1][0];
        Y0 = +_[0][1], Y1 = +_[1][1];
        if (X0 > X1) _ = X0, X0 = X1, X1 = _;
        if (Y0 > Y1) _ = Y0, Y0 = Y1, Y1 = _;
        return graticule.precision(precision);
      };
      graticule.minorExtent = function (_) {
        if (!arguments.length) return [[x0, y0], [x1, y1]];
        x0 = +_[0][0], x1 = +_[1][0];
        y0 = +_[0][1], y1 = +_[1][1];
        if (x0 > x1) _ = x0, x0 = x1, x1 = _;
        if (y0 > y1) _ = y0, y0 = y1, y1 = _;
        return graticule.precision(precision);
      };
      graticule.step = function (_) {
        if (!arguments.length) return graticule.minorStep();
        return graticule.majorStep(_).minorStep(_);
      };
      graticule.majorStep = function (_) {
        if (!arguments.length) return [DX, DY];
        DX = +_[0], DY = +_[1];
        return graticule;
      };
      graticule.minorStep = function (_) {
        if (!arguments.length) return [dx, dy];
        dx = +_[0], dy = +_[1];
        return graticule;
      };
      graticule.precision = function (_) {
        if (!arguments.length) return precision;
        precision = +_;
        x = d3_geo_graticuleX(y0, y1, 90);
        y = d3_geo_graticuleY(x0, x1, precision);
        X = d3_geo_graticuleX(Y0, Y1, 90);
        Y = d3_geo_graticuleY(X0, X1, precision);
        return graticule;
      };
      return graticule.majorExtent([[-180, -90 + ε], [180, 90 - ε]]).minorExtent([[-180, -80 - ε], [180, 80 + ε]]);
    };
    function d3_geo_graticuleX(y0, y1, dy) {
      var y = d3.range(y0, y1 - ε, dy).concat(y1);
      return function (x) {
        return y.map(function (y) {
          return [x, y];
        });
      };
    }
    function d3_geo_graticuleY(x0, x1, dx) {
      var x = d3.range(x0, x1 - ε, dx).concat(x1);
      return function (y) {
        return x.map(function (x) {
          return [x, y];
        });
      };
    }
    function d3_source(d) {
      return d.source;
    }
    function d3_target(d) {
      return d.target;
    }
    d3.geo.greatArc = function () {
      var source = d3_source,
          source_,
          target = d3_target,
          target_;
      function greatArc() {
        return {
          type: "LineString",
          coordinates: [source_ || source.apply(this, arguments), target_ || target.apply(this, arguments)]
        };
      }
      greatArc.distance = function () {
        return d3.geo.distance(source_ || source.apply(this, arguments), target_ || target.apply(this, arguments));
      };
      greatArc.source = function (_) {
        if (!arguments.length) return source;
        source = _, source_ = typeof _ === "function" ? null : _;
        return greatArc;
      };
      greatArc.target = function (_) {
        if (!arguments.length) return target;
        target = _, target_ = typeof _ === "function" ? null : _;
        return greatArc;
      };
      greatArc.precision = function () {
        return arguments.length ? greatArc : 0;
      };
      return greatArc;
    };
    d3.geo.interpolate = function (source, target) {
      return d3_geo_interpolate(source[0] * d3_radians, source[1] * d3_radians, target[0] * d3_radians, target[1] * d3_radians);
    };
    function d3_geo_interpolate(x0, y0, x1, y1) {
      var cy0 = Math.cos(y0),
          sy0 = Math.sin(y0),
          cy1 = Math.cos(y1),
          sy1 = Math.sin(y1),
          kx0 = cy0 * Math.cos(x0),
          ky0 = cy0 * Math.sin(x0),
          kx1 = cy1 * Math.cos(x1),
          ky1 = cy1 * Math.sin(x1),
          d = 2 * Math.asin(Math.sqrt(d3_haversin(y1 - y0) + cy0 * cy1 * d3_haversin(x1 - x0))),
          k = 1 / Math.sin(d);
      var interpolate = d ? function (t) {
        var B = Math.sin(t *= d) * k,
            A = Math.sin(d - t) * k,
            x = A * kx0 + B * kx1,
            y = A * ky0 + B * ky1,
            z = A * sy0 + B * sy1;
        return [Math.atan2(y, x) * d3_degrees, Math.atan2(z, Math.sqrt(x * x + y * y)) * d3_degrees];
      } : function () {
        return [x0 * d3_degrees, y0 * d3_degrees];
      };
      interpolate.distance = d;
      return interpolate;
    }
    d3.geo.length = function (object) {
      d3_geo_lengthSum = 0;
      d3.geo.stream(object, d3_geo_length);
      return d3_geo_lengthSum;
    };
    var d3_geo_lengthSum;
    var d3_geo_length = {
      sphere: d3_noop,
      point: d3_noop,
      lineStart: d3_geo_lengthLineStart,
      lineEnd: d3_noop,
      polygonStart: d3_noop,
      polygonEnd: d3_noop
    };
    function d3_geo_lengthLineStart() {
      var λ0, sinφ0, cosφ0;
      d3_geo_length.point = function (λ, φ) {
        λ0 = λ * d3_radians, sinφ0 = Math.sin(φ *= d3_radians), cosφ0 = Math.cos(φ);
        d3_geo_length.point = nextPoint;
      };
      d3_geo_length.lineEnd = function () {
        d3_geo_length.point = d3_geo_length.lineEnd = d3_noop;
      };
      function nextPoint(λ, φ) {
        var sinφ = Math.sin(φ *= d3_radians),
            cosφ = Math.cos(φ),
            t = abs((λ *= d3_radians) - λ0),
            cosΔλ = Math.cos(t);
        d3_geo_lengthSum += Math.atan2(Math.sqrt((t = cosφ * Math.sin(t)) * t + (t = cosφ0 * sinφ - sinφ0 * cosφ * cosΔλ) * t), sinφ0 * sinφ + cosφ0 * cosφ * cosΔλ);
        λ0 = λ, sinφ0 = sinφ, cosφ0 = cosφ;
      }
    }
    function d3_geo_azimuthal(scale, angle) {
      function azimuthal(λ, φ) {
        var cosλ = Math.cos(λ),
            cosφ = Math.cos(φ),
            k = scale(cosλ * cosφ);
        return [k * cosφ * Math.sin(λ), k * Math.sin(φ)];
      }
      azimuthal.invert = function (x, y) {
        var ρ = Math.sqrt(x * x + y * y),
            c = angle(ρ),
            sinc = Math.sin(c),
            cosc = Math.cos(c);
        return [Math.atan2(x * sinc, ρ * cosc), Math.asin(ρ && y * sinc / ρ)];
      };
      return azimuthal;
    }
    var d3_geo_azimuthalEqualArea = d3_geo_azimuthal(function (cosλcosφ) {
      return Math.sqrt(2 / (1 + cosλcosφ));
    }, function (ρ) {
      return 2 * Math.asin(ρ / 2);
    });
    (d3.geo.azimuthalEqualArea = function () {
      return d3_geo_projection(d3_geo_azimuthalEqualArea);
    }).raw = d3_geo_azimuthalEqualArea;
    var d3_geo_azimuthalEquidistant = d3_geo_azimuthal(function (cosλcosφ) {
      var c = Math.acos(cosλcosφ);
      return c && c / Math.sin(c);
    }, d3_identity);
    (d3.geo.azimuthalEquidistant = function () {
      return d3_geo_projection(d3_geo_azimuthalEquidistant);
    }).raw = d3_geo_azimuthalEquidistant;
    function d3_geo_conicConformal(φ0, φ1) {
      var cosφ0 = Math.cos(φ0),
          t = function t(φ) {
        return Math.tan(π / 4 + φ / 2);
      },
          n = φ0 === φ1 ? Math.sin(φ0) : Math.log(cosφ0 / Math.cos(φ1)) / Math.log(t(φ1) / t(φ0)),
          F = cosφ0 * Math.pow(t(φ0), n) / n;
      if (!n) return d3_geo_mercator;
      function forward(λ, φ) {
        if (F > 0) {
          if (φ < -halfπ + ε) φ = -halfπ + ε;
        } else {
          if (φ > halfπ - ε) φ = halfπ - ε;
        }
        var ρ = F / Math.pow(t(φ), n);
        return [ρ * Math.sin(n * λ), F - ρ * Math.cos(n * λ)];
      }
      forward.invert = function (x, y) {
        var ρ0_y = F - y,
            ρ = d3_sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y);
        return [Math.atan2(x, ρ0_y) / n, 2 * Math.atan(Math.pow(F / ρ, 1 / n)) - halfπ];
      };
      return forward;
    }
    (d3.geo.conicConformal = function () {
      return d3_geo_conic(d3_geo_conicConformal);
    }).raw = d3_geo_conicConformal;
    function d3_geo_conicEquidistant(φ0, φ1) {
      var cosφ0 = Math.cos(φ0),
          n = φ0 === φ1 ? Math.sin(φ0) : (cosφ0 - Math.cos(φ1)) / (φ1 - φ0),
          G = cosφ0 / n + φ0;
      if (abs(n) < ε) return d3_geo_equirectangular;
      function forward(λ, φ) {
        var ρ = G - φ;
        return [ρ * Math.sin(n * λ), G - ρ * Math.cos(n * λ)];
      }
      forward.invert = function (x, y) {
        var ρ0_y = G - y;
        return [Math.atan2(x, ρ0_y) / n, G - d3_sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y)];
      };
      return forward;
    }
    (d3.geo.conicEquidistant = function () {
      return d3_geo_conic(d3_geo_conicEquidistant);
    }).raw = d3_geo_conicEquidistant;
    var d3_geo_gnomonic = d3_geo_azimuthal(function (cosλcosφ) {
      return 1 / cosλcosφ;
    }, Math.atan);
    (d3.geo.gnomonic = function () {
      return d3_geo_projection(d3_geo_gnomonic);
    }).raw = d3_geo_gnomonic;
    function d3_geo_mercator(λ, φ) {
      return [λ, Math.log(Math.tan(π / 4 + φ / 2))];
    }
    d3_geo_mercator.invert = function (x, y) {
      return [x, 2 * Math.atan(Math.exp(y)) - halfπ];
    };
    function d3_geo_mercatorProjection(project) {
      var m = d3_geo_projection(project),
          scale = m.scale,
          translate = m.translate,
          clipExtent = m.clipExtent,
          clipAuto;
      m.scale = function () {
        var v = scale.apply(m, arguments);
        return v === m ? clipAuto ? m.clipExtent(null) : m : v;
      };
      m.translate = function () {
        var v = translate.apply(m, arguments);
        return v === m ? clipAuto ? m.clipExtent(null) : m : v;
      };
      m.clipExtent = function (_) {
        var v = clipExtent.apply(m, arguments);
        if (v === m) {
          if (clipAuto = _ == null) {
            var k = π * scale(),
                t = translate();
            clipExtent([[t[0] - k, t[1] - k], [t[0] + k, t[1] + k]]);
          }
        } else if (clipAuto) {
          v = null;
        }
        return v;
      };
      return m.clipExtent(null);
    }
    (d3.geo.mercator = function () {
      return d3_geo_mercatorProjection(d3_geo_mercator);
    }).raw = d3_geo_mercator;
    var d3_geo_orthographic = d3_geo_azimuthal(function () {
      return 1;
    }, Math.asin);
    (d3.geo.orthographic = function () {
      return d3_geo_projection(d3_geo_orthographic);
    }).raw = d3_geo_orthographic;
    var d3_geo_stereographic = d3_geo_azimuthal(function (cosλcosφ) {
      return 1 / (1 + cosλcosφ);
    }, function (ρ) {
      return 2 * Math.atan(ρ);
    });
    (d3.geo.stereographic = function () {
      return d3_geo_projection(d3_geo_stereographic);
    }).raw = d3_geo_stereographic;
    function d3_geo_transverseMercator(λ, φ) {
      return [Math.log(Math.tan(π / 4 + φ / 2)), -λ];
    }
    d3_geo_transverseMercator.invert = function (x, y) {
      return [-y, 2 * Math.atan(Math.exp(x)) - halfπ];
    };
    (d3.geo.transverseMercator = function () {
      var projection = d3_geo_mercatorProjection(d3_geo_transverseMercator),
          center = projection.center,
          rotate = projection.rotate;
      projection.center = function (_) {
        return _ ? center([-_[1], _[0]]) : (_ = center(), [_[1], -_[0]]);
      };
      projection.rotate = function (_) {
        return _ ? rotate([_[0], _[1], _.length > 2 ? _[2] + 90 : 90]) : (_ = rotate(), [_[0], _[1], _[2] - 90]);
      };
      return rotate([0, 0, 90]);
    }).raw = d3_geo_transverseMercator;
    d3.geom = {};
    function d3_geom_pointX(d) {
      return d[0];
    }
    function d3_geom_pointY(d) {
      return d[1];
    }
    d3.geom.hull = function (vertices) {
      var x = d3_geom_pointX,
          y = d3_geom_pointY;
      if (arguments.length) return hull(vertices);
      function hull(data) {
        if (data.length < 3) return [];
        var fx = d3_functor(x),
            fy = d3_functor(y),
            i,
            n = data.length,
            points = [],
            flippedPoints = [];
        for (i = 0; i < n; i++) {
          points.push([+fx.call(this, data[i], i), +fy.call(this, data[i], i), i]);
        }
        points.sort(d3_geom_hullOrder);
        for (i = 0; i < n; i++) {
          flippedPoints.push([points[i][0], -points[i][1]]);
        }var upper = d3_geom_hullUpper(points),
            lower = d3_geom_hullUpper(flippedPoints);
        var skipLeft = lower[0] === upper[0],
            skipRight = lower[lower.length - 1] === upper[upper.length - 1],
            polygon = [];
        for (i = upper.length - 1; i >= 0; --i) {
          polygon.push(data[points[upper[i]][2]]);
        }for (i = +skipLeft; i < lower.length - skipRight; ++i) {
          polygon.push(data[points[lower[i]][2]]);
        }return polygon;
      }
      hull.x = function (_) {
        return arguments.length ? (x = _, hull) : x;
      };
      hull.y = function (_) {
        return arguments.length ? (y = _, hull) : y;
      };
      return hull;
    };
    function d3_geom_hullUpper(points) {
      var n = points.length,
          hull = [0, 1],
          hs = 2;
      for (var i = 2; i < n; i++) {
        while (hs > 1 && d3_cross2d(points[hull[hs - 2]], points[hull[hs - 1]], points[i]) <= 0) {
          --hs;
        }hull[hs++] = i;
      }
      return hull.slice(0, hs);
    }
    function d3_geom_hullOrder(a, b) {
      return a[0] - b[0] || a[1] - b[1];
    }
    d3.geom.polygon = function (coordinates) {
      d3_subclass(coordinates, d3_geom_polygonPrototype);
      return coordinates;
    };
    var d3_geom_polygonPrototype = d3.geom.polygon.prototype = [];
    d3_geom_polygonPrototype.area = function () {
      var i = -1,
          n = this.length,
          a,
          b = this[n - 1],
          area = 0;
      while (++i < n) {
        a = b;
        b = this[i];
        area += a[1] * b[0] - a[0] * b[1];
      }
      return area * .5;
    };
    d3_geom_polygonPrototype.centroid = function (k) {
      var i = -1,
          n = this.length,
          x = 0,
          y = 0,
          a,
          b = this[n - 1],
          c;
      if (!arguments.length) k = -1 / (6 * this.area());
      while (++i < n) {
        a = b;
        b = this[i];
        c = a[0] * b[1] - b[0] * a[1];
        x += (a[0] + b[0]) * c;
        y += (a[1] + b[1]) * c;
      }
      return [x * k, y * k];
    };
    d3_geom_polygonPrototype.clip = function (subject) {
      var input,
          closed = d3_geom_polygonClosed(subject),
          i = -1,
          n = this.length - d3_geom_polygonClosed(this),
          j,
          m,
          a = this[n - 1],
          b,
          c,
          d;
      while (++i < n) {
        input = subject.slice();
        subject.length = 0;
        b = this[i];
        c = input[(m = input.length - closed) - 1];
        j = -1;
        while (++j < m) {
          d = input[j];
          if (d3_geom_polygonInside(d, a, b)) {
            if (!d3_geom_polygonInside(c, a, b)) {
              subject.push(d3_geom_polygonIntersect(c, d, a, b));
            }
            subject.push(d);
          } else if (d3_geom_polygonInside(c, a, b)) {
            subject.push(d3_geom_polygonIntersect(c, d, a, b));
          }
          c = d;
        }
        if (closed) subject.push(subject[0]);
        a = b;
      }
      return subject;
    };
    function d3_geom_polygonInside(p, a, b) {
      return (b[0] - a[0]) * (p[1] - a[1]) < (b[1] - a[1]) * (p[0] - a[0]);
    }
    function d3_geom_polygonIntersect(c, d, a, b) {
      var x1 = c[0],
          x3 = a[0],
          x21 = d[0] - x1,
          x43 = b[0] - x3,
          y1 = c[1],
          y3 = a[1],
          y21 = d[1] - y1,
          y43 = b[1] - y3,
          ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
      return [x1 + ua * x21, y1 + ua * y21];
    }
    function d3_geom_polygonClosed(coordinates) {
      var a = coordinates[0],
          b = coordinates[coordinates.length - 1];
      return !(a[0] - b[0] || a[1] - b[1]);
    }
    var d3_geom_voronoiEdges,
        d3_geom_voronoiCells,
        d3_geom_voronoiBeaches,
        d3_geom_voronoiBeachPool = [],
        d3_geom_voronoiFirstCircle,
        d3_geom_voronoiCircles,
        d3_geom_voronoiCirclePool = [];
    function d3_geom_voronoiBeach() {
      d3_geom_voronoiRedBlackNode(this);
      this.edge = this.site = this.circle = null;
    }
    function d3_geom_voronoiCreateBeach(site) {
      var beach = d3_geom_voronoiBeachPool.pop() || new d3_geom_voronoiBeach();
      beach.site = site;
      return beach;
    }
    function d3_geom_voronoiDetachBeach(beach) {
      d3_geom_voronoiDetachCircle(beach);
      d3_geom_voronoiBeaches.remove(beach);
      d3_geom_voronoiBeachPool.push(beach);
      d3_geom_voronoiRedBlackNode(beach);
    }
    function d3_geom_voronoiRemoveBeach(beach) {
      var circle = beach.circle,
          x = circle.x,
          y = circle.cy,
          vertex = {
        x: x,
        y: y
      },
          previous = beach.P,
          next = beach.N,
          disappearing = [beach];
      d3_geom_voronoiDetachBeach(beach);
      var lArc = previous;
      while (lArc.circle && abs(x - lArc.circle.x) < ε && abs(y - lArc.circle.cy) < ε) {
        previous = lArc.P;
        disappearing.unshift(lArc);
        d3_geom_voronoiDetachBeach(lArc);
        lArc = previous;
      }
      disappearing.unshift(lArc);
      d3_geom_voronoiDetachCircle(lArc);
      var rArc = next;
      while (rArc.circle && abs(x - rArc.circle.x) < ε && abs(y - rArc.circle.cy) < ε) {
        next = rArc.N;
        disappearing.push(rArc);
        d3_geom_voronoiDetachBeach(rArc);
        rArc = next;
      }
      disappearing.push(rArc);
      d3_geom_voronoiDetachCircle(rArc);
      var nArcs = disappearing.length,
          iArc;
      for (iArc = 1; iArc < nArcs; ++iArc) {
        rArc = disappearing[iArc];
        lArc = disappearing[iArc - 1];
        d3_geom_voronoiSetEdgeEnd(rArc.edge, lArc.site, rArc.site, vertex);
      }
      lArc = disappearing[0];
      rArc = disappearing[nArcs - 1];
      rArc.edge = d3_geom_voronoiCreateEdge(lArc.site, rArc.site, null, vertex);
      d3_geom_voronoiAttachCircle(lArc);
      d3_geom_voronoiAttachCircle(rArc);
    }
    function d3_geom_voronoiAddBeach(site) {
      var x = site.x,
          directrix = site.y,
          lArc,
          rArc,
          dxl,
          dxr,
          node = d3_geom_voronoiBeaches._;
      while (node) {
        dxl = d3_geom_voronoiLeftBreakPoint(node, directrix) - x;
        if (dxl > ε) node = node.L;else {
          dxr = x - d3_geom_voronoiRightBreakPoint(node, directrix);
          if (dxr > ε) {
            if (!node.R) {
              lArc = node;
              break;
            }
            node = node.R;
          } else {
            if (dxl > -ε) {
              lArc = node.P;
              rArc = node;
            } else if (dxr > -ε) {
              lArc = node;
              rArc = node.N;
            } else {
              lArc = rArc = node;
            }
            break;
          }
        }
      }
      var newArc = d3_geom_voronoiCreateBeach(site);
      d3_geom_voronoiBeaches.insert(lArc, newArc);
      if (!lArc && !rArc) return;
      if (lArc === rArc) {
        d3_geom_voronoiDetachCircle(lArc);
        rArc = d3_geom_voronoiCreateBeach(lArc.site);
        d3_geom_voronoiBeaches.insert(newArc, rArc);
        newArc.edge = rArc.edge = d3_geom_voronoiCreateEdge(lArc.site, newArc.site);
        d3_geom_voronoiAttachCircle(lArc);
        d3_geom_voronoiAttachCircle(rArc);
        return;
      }
      if (!rArc) {
        newArc.edge = d3_geom_voronoiCreateEdge(lArc.site, newArc.site);
        return;
      }
      d3_geom_voronoiDetachCircle(lArc);
      d3_geom_voronoiDetachCircle(rArc);
      var lSite = lArc.site,
          ax = lSite.x,
          ay = lSite.y,
          bx = site.x - ax,
          by = site.y - ay,
          rSite = rArc.site,
          cx = rSite.x - ax,
          cy = rSite.y - ay,
          d = 2 * (bx * cy - by * cx),
          hb = bx * bx + by * by,
          hc = cx * cx + cy * cy,
          vertex = {
        x: (cy * hb - by * hc) / d + ax,
        y: (bx * hc - cx * hb) / d + ay
      };
      d3_geom_voronoiSetEdgeEnd(rArc.edge, lSite, rSite, vertex);
      newArc.edge = d3_geom_voronoiCreateEdge(lSite, site, null, vertex);
      rArc.edge = d3_geom_voronoiCreateEdge(site, rSite, null, vertex);
      d3_geom_voronoiAttachCircle(lArc);
      d3_geom_voronoiAttachCircle(rArc);
    }
    function d3_geom_voronoiLeftBreakPoint(arc, directrix) {
      var site = arc.site,
          rfocx = site.x,
          rfocy = site.y,
          pby2 = rfocy - directrix;
      if (!pby2) return rfocx;
      var lArc = arc.P;
      if (!lArc) return -Infinity;
      site = lArc.site;
      var lfocx = site.x,
          lfocy = site.y,
          plby2 = lfocy - directrix;
      if (!plby2) return lfocx;
      var hl = lfocx - rfocx,
          aby2 = 1 / pby2 - 1 / plby2,
          b = hl / plby2;
      if (aby2) return (-b + Math.sqrt(b * b - 2 * aby2 * (hl * hl / (-2 * plby2) - lfocy + plby2 / 2 + rfocy - pby2 / 2))) / aby2 + rfocx;
      return (rfocx + lfocx) / 2;
    }
    function d3_geom_voronoiRightBreakPoint(arc, directrix) {
      var rArc = arc.N;
      if (rArc) return d3_geom_voronoiLeftBreakPoint(rArc, directrix);
      var site = arc.site;
      return site.y === directrix ? site.x : Infinity;
    }
    function d3_geom_voronoiCell(site) {
      this.site = site;
      this.edges = [];
    }
    d3_geom_voronoiCell.prototype.prepare = function () {
      var halfEdges = this.edges,
          iHalfEdge = halfEdges.length,
          edge;
      while (iHalfEdge--) {
        edge = halfEdges[iHalfEdge].edge;
        if (!edge.b || !edge.a) halfEdges.splice(iHalfEdge, 1);
      }
      halfEdges.sort(d3_geom_voronoiHalfEdgeOrder);
      return halfEdges.length;
    };
    function d3_geom_voronoiCloseCells(extent) {
      var x0 = extent[0][0],
          x1 = extent[1][0],
          y0 = extent[0][1],
          y1 = extent[1][1],
          x2,
          y2,
          x3,
          y3,
          cells = d3_geom_voronoiCells,
          iCell = cells.length,
          cell,
          iHalfEdge,
          halfEdges,
          nHalfEdges,
          start,
          end;
      while (iCell--) {
        cell = cells[iCell];
        if (!cell || !cell.prepare()) continue;
        halfEdges = cell.edges;
        nHalfEdges = halfEdges.length;
        iHalfEdge = 0;
        while (iHalfEdge < nHalfEdges) {
          end = halfEdges[iHalfEdge].end(), x3 = end.x, y3 = end.y;
          start = halfEdges[++iHalfEdge % nHalfEdges].start(), x2 = start.x, y2 = start.y;
          if (abs(x3 - x2) > ε || abs(y3 - y2) > ε) {
            halfEdges.splice(iHalfEdge, 0, new d3_geom_voronoiHalfEdge(d3_geom_voronoiCreateBorderEdge(cell.site, end, abs(x3 - x0) < ε && y1 - y3 > ε ? {
              x: x0,
              y: abs(x2 - x0) < ε ? y2 : y1
            } : abs(y3 - y1) < ε && x1 - x3 > ε ? {
              x: abs(y2 - y1) < ε ? x2 : x1,
              y: y1
            } : abs(x3 - x1) < ε && y3 - y0 > ε ? {
              x: x1,
              y: abs(x2 - x1) < ε ? y2 : y0
            } : abs(y3 - y0) < ε && x3 - x0 > ε ? {
              x: abs(y2 - y0) < ε ? x2 : x0,
              y: y0
            } : null), cell.site, null));
            ++nHalfEdges;
          }
        }
      }
    }
    function d3_geom_voronoiHalfEdgeOrder(a, b) {
      return b.angle - a.angle;
    }
    function d3_geom_voronoiCircle() {
      d3_geom_voronoiRedBlackNode(this);
      this.x = this.y = this.arc = this.site = this.cy = null;
    }
    function d3_geom_voronoiAttachCircle(arc) {
      var lArc = arc.P,
          rArc = arc.N;
      if (!lArc || !rArc) return;
      var lSite = lArc.site,
          cSite = arc.site,
          rSite = rArc.site;
      if (lSite === rSite) return;
      var bx = cSite.x,
          by = cSite.y,
          ax = lSite.x - bx,
          ay = lSite.y - by,
          cx = rSite.x - bx,
          cy = rSite.y - by;
      var d = 2 * (ax * cy - ay * cx);
      if (d >= -ε2) return;
      var ha = ax * ax + ay * ay,
          hc = cx * cx + cy * cy,
          x = (cy * ha - ay * hc) / d,
          y = (ax * hc - cx * ha) / d,
          cy = y + by;
      var circle = d3_geom_voronoiCirclePool.pop() || new d3_geom_voronoiCircle();
      circle.arc = arc;
      circle.site = cSite;
      circle.x = x + bx;
      circle.y = cy + Math.sqrt(x * x + y * y);
      circle.cy = cy;
      arc.circle = circle;
      var before = null,
          node = d3_geom_voronoiCircles._;
      while (node) {
        if (circle.y < node.y || circle.y === node.y && circle.x <= node.x) {
          if (node.L) node = node.L;else {
            before = node.P;
            break;
          }
        } else {
          if (node.R) node = node.R;else {
            before = node;
            break;
          }
        }
      }
      d3_geom_voronoiCircles.insert(before, circle);
      if (!before) d3_geom_voronoiFirstCircle = circle;
    }
    function d3_geom_voronoiDetachCircle(arc) {
      var circle = arc.circle;
      if (circle) {
        if (!circle.P) d3_geom_voronoiFirstCircle = circle.N;
        d3_geom_voronoiCircles.remove(circle);
        d3_geom_voronoiCirclePool.push(circle);
        d3_geom_voronoiRedBlackNode(circle);
        arc.circle = null;
      }
    }
    function d3_geom_voronoiClipEdges(extent) {
      var edges = d3_geom_voronoiEdges,
          clip = d3_geom_clipLine(extent[0][0], extent[0][1], extent[1][0], extent[1][1]),
          i = edges.length,
          e;
      while (i--) {
        e = edges[i];
        if (!d3_geom_voronoiConnectEdge(e, extent) || !clip(e) || abs(e.a.x - e.b.x) < ε && abs(e.a.y - e.b.y) < ε) {
          e.a = e.b = null;
          edges.splice(i, 1);
        }
      }
    }
    function d3_geom_voronoiConnectEdge(edge, extent) {
      var vb = edge.b;
      if (vb) return true;
      var va = edge.a,
          x0 = extent[0][0],
          x1 = extent[1][0],
          y0 = extent[0][1],
          y1 = extent[1][1],
          lSite = edge.l,
          rSite = edge.r,
          lx = lSite.x,
          ly = lSite.y,
          rx = rSite.x,
          ry = rSite.y,
          fx = (lx + rx) / 2,
          fy = (ly + ry) / 2,
          fm,
          fb;
      if (ry === ly) {
        if (fx < x0 || fx >= x1) return;
        if (lx > rx) {
          if (!va) va = {
            x: fx,
            y: y0
          };else if (va.y >= y1) return;
          vb = {
            x: fx,
            y: y1
          };
        } else {
          if (!va) va = {
            x: fx,
            y: y1
          };else if (va.y < y0) return;
          vb = {
            x: fx,
            y: y0
          };
        }
      } else {
        fm = (lx - rx) / (ry - ly);
        fb = fy - fm * fx;
        if (fm < -1 || fm > 1) {
          if (lx > rx) {
            if (!va) va = {
              x: (y0 - fb) / fm,
              y: y0
            };else if (va.y >= y1) return;
            vb = {
              x: (y1 - fb) / fm,
              y: y1
            };
          } else {
            if (!va) va = {
              x: (y1 - fb) / fm,
              y: y1
            };else if (va.y < y0) return;
            vb = {
              x: (y0 - fb) / fm,
              y: y0
            };
          }
        } else {
          if (ly < ry) {
            if (!va) va = {
              x: x0,
              y: fm * x0 + fb
            };else if (va.x >= x1) return;
            vb = {
              x: x1,
              y: fm * x1 + fb
            };
          } else {
            if (!va) va = {
              x: x1,
              y: fm * x1 + fb
            };else if (va.x < x0) return;
            vb = {
              x: x0,
              y: fm * x0 + fb
            };
          }
        }
      }
      edge.a = va;
      edge.b = vb;
      return true;
    }
    function d3_geom_voronoiEdge(lSite, rSite) {
      this.l = lSite;
      this.r = rSite;
      this.a = this.b = null;
    }
    function d3_geom_voronoiCreateEdge(lSite, rSite, va, vb) {
      var edge = new d3_geom_voronoiEdge(lSite, rSite);
      d3_geom_voronoiEdges.push(edge);
      if (va) d3_geom_voronoiSetEdgeEnd(edge, lSite, rSite, va);
      if (vb) d3_geom_voronoiSetEdgeEnd(edge, rSite, lSite, vb);
      d3_geom_voronoiCells[lSite.i].edges.push(new d3_geom_voronoiHalfEdge(edge, lSite, rSite));
      d3_geom_voronoiCells[rSite.i].edges.push(new d3_geom_voronoiHalfEdge(edge, rSite, lSite));
      return edge;
    }
    function d3_geom_voronoiCreateBorderEdge(lSite, va, vb) {
      var edge = new d3_geom_voronoiEdge(lSite, null);
      edge.a = va;
      edge.b = vb;
      d3_geom_voronoiEdges.push(edge);
      return edge;
    }
    function d3_geom_voronoiSetEdgeEnd(edge, lSite, rSite, vertex) {
      if (!edge.a && !edge.b) {
        edge.a = vertex;
        edge.l = lSite;
        edge.r = rSite;
      } else if (edge.l === rSite) {
        edge.b = vertex;
      } else {
        edge.a = vertex;
      }
    }
    function d3_geom_voronoiHalfEdge(edge, lSite, rSite) {
      var va = edge.a,
          vb = edge.b;
      this.edge = edge;
      this.site = lSite;
      this.angle = rSite ? Math.atan2(rSite.y - lSite.y, rSite.x - lSite.x) : edge.l === lSite ? Math.atan2(vb.x - va.x, va.y - vb.y) : Math.atan2(va.x - vb.x, vb.y - va.y);
    }
    d3_geom_voronoiHalfEdge.prototype = {
      start: function start() {
        return this.edge.l === this.site ? this.edge.a : this.edge.b;
      },
      end: function end() {
        return this.edge.l === this.site ? this.edge.b : this.edge.a;
      }
    };
    function d3_geom_voronoiRedBlackTree() {
      this._ = null;
    }
    function d3_geom_voronoiRedBlackNode(node) {
      node.U = node.C = node.L = node.R = node.P = node.N = null;
    }
    d3_geom_voronoiRedBlackTree.prototype = {
      insert: function insert(after, node) {
        var parent, grandpa, uncle;
        if (after) {
          node.P = after;
          node.N = after.N;
          if (after.N) after.N.P = node;
          after.N = node;
          if (after.R) {
            after = after.R;
            while (after.L) {
              after = after.L;
            }after.L = node;
          } else {
            after.R = node;
          }
          parent = after;
        } else if (this._) {
          after = d3_geom_voronoiRedBlackFirst(this._);
          node.P = null;
          node.N = after;
          after.P = after.L = node;
          parent = after;
        } else {
          node.P = node.N = null;
          this._ = node;
          parent = null;
        }
        node.L = node.R = null;
        node.U = parent;
        node.C = true;
        after = node;
        while (parent && parent.C) {
          grandpa = parent.U;
          if (parent === grandpa.L) {
            uncle = grandpa.R;
            if (uncle && uncle.C) {
              parent.C = uncle.C = false;
              grandpa.C = true;
              after = grandpa;
            } else {
              if (after === parent.R) {
                d3_geom_voronoiRedBlackRotateLeft(this, parent);
                after = parent;
                parent = after.U;
              }
              parent.C = false;
              grandpa.C = true;
              d3_geom_voronoiRedBlackRotateRight(this, grandpa);
            }
          } else {
            uncle = grandpa.L;
            if (uncle && uncle.C) {
              parent.C = uncle.C = false;
              grandpa.C = true;
              after = grandpa;
            } else {
              if (after === parent.L) {
                d3_geom_voronoiRedBlackRotateRight(this, parent);
                after = parent;
                parent = after.U;
              }
              parent.C = false;
              grandpa.C = true;
              d3_geom_voronoiRedBlackRotateLeft(this, grandpa);
            }
          }
          parent = after.U;
        }
        this._.C = false;
      },
      remove: function remove(node) {
        if (node.N) node.N.P = node.P;
        if (node.P) node.P.N = node.N;
        node.N = node.P = null;
        var parent = node.U,
            sibling,
            left = node.L,
            right = node.R,
            next,
            red;
        if (!left) next = right;else if (!right) next = left;else next = d3_geom_voronoiRedBlackFirst(right);
        if (parent) {
          if (parent.L === node) parent.L = next;else parent.R = next;
        } else {
          this._ = next;
        }
        if (left && right) {
          red = next.C;
          next.C = node.C;
          next.L = left;
          left.U = next;
          if (next !== right) {
            parent = next.U;
            next.U = node.U;
            node = next.R;
            parent.L = node;
            next.R = right;
            right.U = next;
          } else {
            next.U = parent;
            parent = next;
            node = next.R;
          }
        } else {
          red = node.C;
          node = next;
        }
        if (node) node.U = parent;
        if (red) return;
        if (node && node.C) {
          node.C = false;
          return;
        }
        do {
          if (node === this._) break;
          if (node === parent.L) {
            sibling = parent.R;
            if (sibling.C) {
              sibling.C = false;
              parent.C = true;
              d3_geom_voronoiRedBlackRotateLeft(this, parent);
              sibling = parent.R;
            }
            if (sibling.L && sibling.L.C || sibling.R && sibling.R.C) {
              if (!sibling.R || !sibling.R.C) {
                sibling.L.C = false;
                sibling.C = true;
                d3_geom_voronoiRedBlackRotateRight(this, sibling);
                sibling = parent.R;
              }
              sibling.C = parent.C;
              parent.C = sibling.R.C = false;
              d3_geom_voronoiRedBlackRotateLeft(this, parent);
              node = this._;
              break;
            }
          } else {
            sibling = parent.L;
            if (sibling.C) {
              sibling.C = false;
              parent.C = true;
              d3_geom_voronoiRedBlackRotateRight(this, parent);
              sibling = parent.L;
            }
            if (sibling.L && sibling.L.C || sibling.R && sibling.R.C) {
              if (!sibling.L || !sibling.L.C) {
                sibling.R.C = false;
                sibling.C = true;
                d3_geom_voronoiRedBlackRotateLeft(this, sibling);
                sibling = parent.L;
              }
              sibling.C = parent.C;
              parent.C = sibling.L.C = false;
              d3_geom_voronoiRedBlackRotateRight(this, parent);
              node = this._;
              break;
            }
          }
          sibling.C = true;
          node = parent;
          parent = parent.U;
        } while (!node.C);
        if (node) node.C = false;
      }
    };
    function d3_geom_voronoiRedBlackRotateLeft(tree, node) {
      var p = node,
          q = node.R,
          parent = p.U;
      if (parent) {
        if (parent.L === p) parent.L = q;else parent.R = q;
      } else {
        tree._ = q;
      }
      q.U = parent;
      p.U = q;
      p.R = q.L;
      if (p.R) p.R.U = p;
      q.L = p;
    }
    function d3_geom_voronoiRedBlackRotateRight(tree, node) {
      var p = node,
          q = node.L,
          parent = p.U;
      if (parent) {
        if (parent.L === p) parent.L = q;else parent.R = q;
      } else {
        tree._ = q;
      }
      q.U = parent;
      p.U = q;
      p.L = q.R;
      if (p.L) p.L.U = p;
      q.R = p;
    }
    function d3_geom_voronoiRedBlackFirst(node) {
      while (node.L) {
        node = node.L;
      }return node;
    }
    function d3_geom_voronoi(sites, bbox) {
      var site = sites.sort(d3_geom_voronoiVertexOrder).pop(),
          x0,
          y0,
          circle;
      d3_geom_voronoiEdges = [];
      d3_geom_voronoiCells = new Array(sites.length);
      d3_geom_voronoiBeaches = new d3_geom_voronoiRedBlackTree();
      d3_geom_voronoiCircles = new d3_geom_voronoiRedBlackTree();
      while (true) {
        circle = d3_geom_voronoiFirstCircle;
        if (site && (!circle || site.y < circle.y || site.y === circle.y && site.x < circle.x)) {
          if (site.x !== x0 || site.y !== y0) {
            d3_geom_voronoiCells[site.i] = new d3_geom_voronoiCell(site);
            d3_geom_voronoiAddBeach(site);
            x0 = site.x, y0 = site.y;
          }
          site = sites.pop();
        } else if (circle) {
          d3_geom_voronoiRemoveBeach(circle.arc);
        } else {
          break;
        }
      }
      if (bbox) d3_geom_voronoiClipEdges(bbox), d3_geom_voronoiCloseCells(bbox);
      var diagram = {
        cells: d3_geom_voronoiCells,
        edges: d3_geom_voronoiEdges
      };
      d3_geom_voronoiBeaches = d3_geom_voronoiCircles = d3_geom_voronoiEdges = d3_geom_voronoiCells = null;
      return diagram;
    }
    function d3_geom_voronoiVertexOrder(a, b) {
      return b.y - a.y || b.x - a.x;
    }
    d3.geom.voronoi = function (points) {
      var x = d3_geom_pointX,
          y = d3_geom_pointY,
          fx = x,
          fy = y,
          clipExtent = d3_geom_voronoiClipExtent;
      if (points) return voronoi(points);
      function voronoi(data) {
        var polygons = new Array(data.length),
            x0 = clipExtent[0][0],
            y0 = clipExtent[0][1],
            x1 = clipExtent[1][0],
            y1 = clipExtent[1][1];
        d3_geom_voronoi(sites(data), clipExtent).cells.forEach(function (cell, i) {
          var edges = cell.edges,
              site = cell.site,
              polygon = polygons[i] = edges.length ? edges.map(function (e) {
            var s = e.start();
            return [s.x, s.y];
          }) : site.x >= x0 && site.x <= x1 && site.y >= y0 && site.y <= y1 ? [[x0, y1], [x1, y1], [x1, y0], [x0, y0]] : [];
          polygon.point = data[i];
        });
        return polygons;
      }
      function sites(data) {
        return data.map(function (d, i) {
          return {
            x: Math.round(fx(d, i) / ε) * ε,
            y: Math.round(fy(d, i) / ε) * ε,
            i: i
          };
        });
      }
      voronoi.links = function (data) {
        return d3_geom_voronoi(sites(data)).edges.filter(function (edge) {
          return edge.l && edge.r;
        }).map(function (edge) {
          return {
            source: data[edge.l.i],
            target: data[edge.r.i]
          };
        });
      };
      voronoi.triangles = function (data) {
        var triangles = [];
        d3_geom_voronoi(sites(data)).cells.forEach(function (cell, i) {
          var site = cell.site,
              edges = cell.edges.sort(d3_geom_voronoiHalfEdgeOrder),
              j = -1,
              m = edges.length,
              e0,
              s0,
              e1 = edges[m - 1].edge,
              s1 = e1.l === site ? e1.r : e1.l;
          while (++j < m) {
            e0 = e1;
            s0 = s1;
            e1 = edges[j].edge;
            s1 = e1.l === site ? e1.r : e1.l;
            if (i < s0.i && i < s1.i && d3_geom_voronoiTriangleArea(site, s0, s1) < 0) {
              triangles.push([data[i], data[s0.i], data[s1.i]]);
            }
          }
        });
        return triangles;
      };
      voronoi.x = function (_) {
        return arguments.length ? (fx = d3_functor(x = _), voronoi) : x;
      };
      voronoi.y = function (_) {
        return arguments.length ? (fy = d3_functor(y = _), voronoi) : y;
      };
      voronoi.clipExtent = function (_) {
        if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent;
        clipExtent = _ == null ? d3_geom_voronoiClipExtent : _;
        return voronoi;
      };
      voronoi.size = function (_) {
        if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent && clipExtent[1];
        return voronoi.clipExtent(_ && [[0, 0], _]);
      };
      return voronoi;
    };
    var d3_geom_voronoiClipExtent = [[-1e6, -1e6], [1e6, 1e6]];
    function d3_geom_voronoiTriangleArea(a, b, c) {
      return (a.x - c.x) * (b.y - a.y) - (a.x - b.x) * (c.y - a.y);
    }
    d3.geom.delaunay = function (vertices) {
      return d3.geom.voronoi().triangles(vertices);
    };
    d3.geom.quadtree = function (points, x1, y1, x2, y2) {
      var x = d3_geom_pointX,
          y = d3_geom_pointY,
          compat;
      if (compat = arguments.length) {
        x = d3_geom_quadtreeCompatX;
        y = d3_geom_quadtreeCompatY;
        if (compat === 3) {
          y2 = y1;
          x2 = x1;
          y1 = x1 = 0;
        }
        return quadtree(points);
      }
      function quadtree(data) {
        var d,
            fx = d3_functor(x),
            fy = d3_functor(y),
            xs,
            ys,
            i,
            n,
            x1_,
            y1_,
            x2_,
            y2_;
        if (x1 != null) {
          x1_ = x1, y1_ = y1, x2_ = x2, y2_ = y2;
        } else {
          x2_ = y2_ = -(x1_ = y1_ = Infinity);
          xs = [], ys = [];
          n = data.length;
          if (compat) for (i = 0; i < n; ++i) {
            d = data[i];
            if (d.x < x1_) x1_ = d.x;
            if (d.y < y1_) y1_ = d.y;
            if (d.x > x2_) x2_ = d.x;
            if (d.y > y2_) y2_ = d.y;
            xs.push(d.x);
            ys.push(d.y);
          } else for (i = 0; i < n; ++i) {
            var x_ = +fx(d = data[i], i),
                y_ = +fy(d, i);
            if (x_ < x1_) x1_ = x_;
            if (y_ < y1_) y1_ = y_;
            if (x_ > x2_) x2_ = x_;
            if (y_ > y2_) y2_ = y_;
            xs.push(x_);
            ys.push(y_);
          }
        }
        var dx = x2_ - x1_,
            dy = y2_ - y1_;
        if (dx > dy) y2_ = y1_ + dx;else x2_ = x1_ + dy;
        function insert(n, d, x, y, x1, y1, x2, y2) {
          if (isNaN(x) || isNaN(y)) return;
          if (n.leaf) {
            var nx = n.x,
                ny = n.y;
            if (nx != null) {
              if (abs(nx - x) + abs(ny - y) < .01) {
                insertChild(n, d, x, y, x1, y1, x2, y2);
              } else {
                var nPoint = n.point;
                n.x = n.y = n.point = null;
                insertChild(n, nPoint, nx, ny, x1, y1, x2, y2);
                insertChild(n, d, x, y, x1, y1, x2, y2);
              }
            } else {
              n.x = x, n.y = y, n.point = d;
            }
          } else {
            insertChild(n, d, x, y, x1, y1, x2, y2);
          }
        }
        function insertChild(n, d, x, y, x1, y1, x2, y2) {
          var xm = (x1 + x2) * .5,
              ym = (y1 + y2) * .5,
              right = x >= xm,
              below = y >= ym,
              i = below << 1 | right;
          n.leaf = false;
          n = n.nodes[i] || (n.nodes[i] = d3_geom_quadtreeNode());
          if (right) x1 = xm;else x2 = xm;
          if (below) y1 = ym;else y2 = ym;
          insert(n, d, x, y, x1, y1, x2, y2);
        }
        var root = d3_geom_quadtreeNode();
        root.add = function (d) {
          insert(root, d, +fx(d, ++i), +fy(d, i), x1_, y1_, x2_, y2_);
        };
        root.visit = function (f) {
          d3_geom_quadtreeVisit(f, root, x1_, y1_, x2_, y2_);
        };
        root.find = function (point) {
          return d3_geom_quadtreeFind(root, point[0], point[1], x1_, y1_, x2_, y2_);
        };
        i = -1;
        if (x1 == null) {
          while (++i < n) {
            insert(root, data[i], xs[i], ys[i], x1_, y1_, x2_, y2_);
          }
          --i;
        } else data.forEach(root.add);
        xs = ys = data = d = null;
        return root;
      }
      quadtree.x = function (_) {
        return arguments.length ? (x = _, quadtree) : x;
      };
      quadtree.y = function (_) {
        return arguments.length ? (y = _, quadtree) : y;
      };
      quadtree.extent = function (_) {
        if (!arguments.length) return x1 == null ? null : [[x1, y1], [x2, y2]];
        if (_ == null) x1 = y1 = x2 = y2 = null;else x1 = +_[0][0], y1 = +_[0][1], x2 = +_[1][0], y2 = +_[1][1];
        return quadtree;
      };
      quadtree.size = function (_) {
        if (!arguments.length) return x1 == null ? null : [x2 - x1, y2 - y1];
        if (_ == null) x1 = y1 = x2 = y2 = null;else x1 = y1 = 0, x2 = +_[0], y2 = +_[1];
        return quadtree;
      };
      return quadtree;
    };
    function d3_geom_quadtreeCompatX(d) {
      return d.x;
    }
    function d3_geom_quadtreeCompatY(d) {
      return d.y;
    }
    function d3_geom_quadtreeNode() {
      return {
        leaf: true,
        nodes: [],
        point: null,
        x: null,
        y: null
      };
    }
    function d3_geom_quadtreeVisit(f, node, x1, y1, x2, y2) {
      if (!f(node, x1, y1, x2, y2)) {
        var sx = (x1 + x2) * .5,
            sy = (y1 + y2) * .5,
            children = node.nodes;
        if (children[0]) d3_geom_quadtreeVisit(f, children[0], x1, y1, sx, sy);
        if (children[1]) d3_geom_quadtreeVisit(f, children[1], sx, y1, x2, sy);
        if (children[2]) d3_geom_quadtreeVisit(f, children[2], x1, sy, sx, y2);
        if (children[3]) d3_geom_quadtreeVisit(f, children[3], sx, sy, x2, y2);
      }
    }
    function d3_geom_quadtreeFind(root, x, y, x0, y0, x3, y3) {
      var minDistance2 = Infinity,
          closestPoint;
      (function find(node, x1, y1, x2, y2) {
        if (x1 > x3 || y1 > y3 || x2 < x0 || y2 < y0) return;
        if (point = node.point) {
          var point,
              dx = x - node.x,
              dy = y - node.y,
              distance2 = dx * dx + dy * dy;
          if (distance2 < minDistance2) {
            var distance = Math.sqrt(minDistance2 = distance2);
            x0 = x - distance, y0 = y - distance;
            x3 = x + distance, y3 = y + distance;
            closestPoint = point;
          }
        }
        var children = node.nodes,
            xm = (x1 + x2) * .5,
            ym = (y1 + y2) * .5,
            right = x >= xm,
            below = y >= ym;
        for (var i = below << 1 | right, j = i + 4; i < j; ++i) {
          if (node = children[i & 3]) switch (i & 3) {
            case 0:
              find(node, x1, y1, xm, ym);
              break;

            case 1:
              find(node, xm, y1, x2, ym);
              break;

            case 2:
              find(node, x1, ym, xm, y2);
              break;

            case 3:
              find(node, xm, ym, x2, y2);
              break;
          }
        }
      })(root, x0, y0, x3, y3);
      return closestPoint;
    }
    d3.interpolateRgb = d3_interpolateRgb;
    function d3_interpolateRgb(a, b) {
      a = d3.rgb(a);
      b = d3.rgb(b);
      var ar = a.r,
          ag = a.g,
          ab = a.b,
          br = b.r - ar,
          bg = b.g - ag,
          bb = b.b - ab;
      return function (t) {
        return "#" + d3_rgb_hex(Math.round(ar + br * t)) + d3_rgb_hex(Math.round(ag + bg * t)) + d3_rgb_hex(Math.round(ab + bb * t));
      };
    }
    d3.interpolateObject = d3_interpolateObject;
    function d3_interpolateObject(a, b) {
      var i = {},
          c = {},
          k;
      for (k in a) {
        if (k in b) {
          i[k] = d3_interpolate(a[k], b[k]);
        } else {
          c[k] = a[k];
        }
      }
      for (k in b) {
        if (!(k in a)) {
          c[k] = b[k];
        }
      }
      return function (t) {
        for (k in i) {
          c[k] = i[k](t);
        }return c;
      };
    }
    d3.interpolateNumber = d3_interpolateNumber;
    function d3_interpolateNumber(a, b) {
      a = +a, b = +b;
      return function (t) {
        return a * (1 - t) + b * t;
      };
    }
    d3.interpolateString = d3_interpolateString;
    function d3_interpolateString(a, b) {
      var bi = d3_interpolate_numberA.lastIndex = d3_interpolate_numberB.lastIndex = 0,
          am,
          bm,
          bs,
          i = -1,
          s = [],
          q = [];
      a = a + "", b = b + "";
      while ((am = d3_interpolate_numberA.exec(a)) && (bm = d3_interpolate_numberB.exec(b))) {
        if ((bs = bm.index) > bi) {
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs;else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) {
          if (s[i]) s[i] += bm;else s[++i] = bm;
        } else {
          s[++i] = null;
          q.push({
            i: i,
            x: d3_interpolateNumber(am, bm)
          });
        }
        bi = d3_interpolate_numberB.lastIndex;
      }
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs;else s[++i] = bs;
      }
      return s.length < 2 ? q[0] ? (b = q[0].x, function (t) {
        return b(t) + "";
      }) : function () {
        return b;
      } : (b = q.length, function (t) {
        for (var i = 0, o; i < b; ++i) {
          s[(o = q[i]).i] = o.x(t);
        }return s.join("");
      });
    }
    var d3_interpolate_numberA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
        d3_interpolate_numberB = new RegExp(d3_interpolate_numberA.source, "g");
    d3.interpolate = d3_interpolate;
    function d3_interpolate(a, b) {
      var i = d3.interpolators.length,
          f;
      while (--i >= 0 && !(f = d3.interpolators[i](a, b))) {}
      return f;
    }
    d3.interpolators = [function (a, b) {
      var t = typeof b === "undefined" ? "undefined" : _typeof(b);
      return (t === "string" ? d3_rgb_names.has(b.toLowerCase()) || /^(#|rgb\(|hsl\()/i.test(b) ? d3_interpolateRgb : d3_interpolateString : b instanceof d3_color ? d3_interpolateRgb : Array.isArray(b) ? d3_interpolateArray : t === "object" && isNaN(b) ? d3_interpolateObject : d3_interpolateNumber)(a, b);
    }];
    d3.interpolateArray = d3_interpolateArray;
    function d3_interpolateArray(a, b) {
      var x = [],
          c = [],
          na = a.length,
          nb = b.length,
          n0 = Math.min(a.length, b.length),
          i;
      for (i = 0; i < n0; ++i) {
        x.push(d3_interpolate(a[i], b[i]));
      }for (; i < na; ++i) {
        c[i] = a[i];
      }for (; i < nb; ++i) {
        c[i] = b[i];
      }return function (t) {
        for (i = 0; i < n0; ++i) {
          c[i] = x[i](t);
        }return c;
      };
    }
    var d3_ease_default = function d3_ease_default() {
      return d3_identity;
    };
    var d3_ease = d3.map({
      linear: d3_ease_default,
      poly: d3_ease_poly,
      quad: function quad() {
        return d3_ease_quad;
      },
      cubic: function cubic() {
        return d3_ease_cubic;
      },
      sin: function sin() {
        return d3_ease_sin;
      },
      exp: function exp() {
        return d3_ease_exp;
      },
      circle: function circle() {
        return d3_ease_circle;
      },
      elastic: d3_ease_elastic,
      back: d3_ease_back,
      bounce: function bounce() {
        return d3_ease_bounce;
      }
    });
    var d3_ease_mode = d3.map({
      "in": d3_identity,
      out: d3_ease_reverse,
      "in-out": d3_ease_reflect,
      "out-in": function outIn(f) {
        return d3_ease_reflect(d3_ease_reverse(f));
      }
    });
    d3.ease = function (name) {
      var i = name.indexOf("-"),
          t = i >= 0 ? name.slice(0, i) : name,
          m = i >= 0 ? name.slice(i + 1) : "in";
      t = d3_ease.get(t) || d3_ease_default;
      m = d3_ease_mode.get(m) || d3_identity;
      return d3_ease_clamp(m(t.apply(null, d3_arraySlice.call(arguments, 1))));
    };
    function d3_ease_clamp(f) {
      return function (t) {
        return t <= 0 ? 0 : t >= 1 ? 1 : f(t);
      };
    }
    function d3_ease_reverse(f) {
      return function (t) {
        return 1 - f(1 - t);
      };
    }
    function d3_ease_reflect(f) {
      return function (t) {
        return .5 * (t < .5 ? f(2 * t) : 2 - f(2 - 2 * t));
      };
    }
    function d3_ease_quad(t) {
      return t * t;
    }
    function d3_ease_cubic(t) {
      return t * t * t;
    }
    function d3_ease_cubicInOut(t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      var t2 = t * t,
          t3 = t2 * t;
      return 4 * (t < .5 ? t3 : 3 * (t - t2) + t3 - .75);
    }
    function d3_ease_poly(e) {
      return function (t) {
        return Math.pow(t, e);
      };
    }
    function d3_ease_sin(t) {
      return 1 - Math.cos(t * halfπ);
    }
    function d3_ease_exp(t) {
      return Math.pow(2, 10 * (t - 1));
    }
    function d3_ease_circle(t) {
      return 1 - Math.sqrt(1 - t * t);
    }
    function d3_ease_elastic(a, p) {
      var s;
      if (arguments.length < 2) p = .45;
      if (arguments.length) s = p / τ * Math.asin(1 / a);else a = 1, s = p / 4;
      return function (t) {
        return 1 + a * Math.pow(2, -10 * t) * Math.sin((t - s) * τ / p);
      };
    }
    function d3_ease_back(s) {
      if (!s) s = 1.70158;
      return function (t) {
        return t * t * ((s + 1) * t - s);
      };
    }
    function d3_ease_bounce(t) {
      return t < 1 / 2.75 ? 7.5625 * t * t : t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + .75 : t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + .9375 : 7.5625 * (t -= 2.625 / 2.75) * t + .984375;
    }
    d3.interpolateHcl = d3_interpolateHcl;
    function d3_interpolateHcl(a, b) {
      a = d3.hcl(a);
      b = d3.hcl(b);
      var ah = a.h,
          ac = a.c,
          al = a.l,
          bh = b.h - ah,
          bc = b.c - ac,
          bl = b.l - al;
      if (isNaN(bc)) bc = 0, ac = isNaN(ac) ? b.c : ac;
      if (isNaN(bh)) bh = 0, ah = isNaN(ah) ? b.h : ah;else if (bh > 180) bh -= 360;else if (bh < -180) bh += 360;
      return function (t) {
        return d3_hcl_lab(ah + bh * t, ac + bc * t, al + bl * t) + "";
      };
    }
    d3.interpolateHsl = d3_interpolateHsl;
    function d3_interpolateHsl(a, b) {
      a = d3.hsl(a);
      b = d3.hsl(b);
      var ah = a.h,
          as = a.s,
          al = a.l,
          bh = b.h - ah,
          bs = b.s - as,
          bl = b.l - al;
      if (isNaN(bs)) bs = 0, as = isNaN(as) ? b.s : as;
      if (isNaN(bh)) bh = 0, ah = isNaN(ah) ? b.h : ah;else if (bh > 180) bh -= 360;else if (bh < -180) bh += 360;
      return function (t) {
        return d3_hsl_rgb(ah + bh * t, as + bs * t, al + bl * t) + "";
      };
    }
    d3.interpolateLab = d3_interpolateLab;
    function d3_interpolateLab(a, b) {
      a = d3.lab(a);
      b = d3.lab(b);
      var al = a.l,
          aa = a.a,
          ab = a.b,
          bl = b.l - al,
          ba = b.a - aa,
          bb = b.b - ab;
      return function (t) {
        return d3_lab_rgb(al + bl * t, aa + ba * t, ab + bb * t) + "";
      };
    }
    d3.interpolateRound = d3_interpolateRound;
    function d3_interpolateRound(a, b) {
      b -= a;
      return function (t) {
        return Math.round(a + b * t);
      };
    }
    d3.transform = function (string) {
      var g = d3_document.createElementNS(d3.ns.prefix.svg, "g");
      return (d3.transform = function (string) {
        if (string != null) {
          g.setAttribute("transform", string);
          var t = g.transform.baseVal.consolidate();
        }
        return new d3_transform(t ? t.matrix : d3_transformIdentity);
      })(string);
    };
    function d3_transform(m) {
      var r0 = [m.a, m.b],
          r1 = [m.c, m.d],
          kx = d3_transformNormalize(r0),
          kz = d3_transformDot(r0, r1),
          ky = d3_transformNormalize(d3_transformCombine(r1, r0, -kz)) || 0;
      if (r0[0] * r1[1] < r1[0] * r0[1]) {
        r0[0] *= -1;
        r0[1] *= -1;
        kx *= -1;
        kz *= -1;
      }
      this.rotate = (kx ? Math.atan2(r0[1], r0[0]) : Math.atan2(-r1[0], r1[1])) * d3_degrees;
      this.translate = [m.e, m.f];
      this.scale = [kx, ky];
      this.skew = ky ? Math.atan2(kz, ky) * d3_degrees : 0;
    }
    d3_transform.prototype.toString = function () {
      return "translate(" + this.translate + ")rotate(" + this.rotate + ")skewX(" + this.skew + ")scale(" + this.scale + ")";
    };
    function d3_transformDot(a, b) {
      return a[0] * b[0] + a[1] * b[1];
    }
    function d3_transformNormalize(a) {
      var k = Math.sqrt(d3_transformDot(a, a));
      if (k) {
        a[0] /= k;
        a[1] /= k;
      }
      return k;
    }
    function d3_transformCombine(a, b, k) {
      a[0] += k * b[0];
      a[1] += k * b[1];
      return a;
    }
    var d3_transformIdentity = {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0
    };
    d3.interpolateTransform = d3_interpolateTransform;
    function d3_interpolateTransformPop(s) {
      return s.length ? s.pop() + "," : "";
    }
    function d3_interpolateTranslate(ta, tb, s, q) {
      if (ta[0] !== tb[0] || ta[1] !== tb[1]) {
        var i = s.push("translate(", null, ",", null, ")");
        q.push({
          i: i - 4,
          x: d3_interpolateNumber(ta[0], tb[0])
        }, {
          i: i - 2,
          x: d3_interpolateNumber(ta[1], tb[1])
        });
      } else if (tb[0] || tb[1]) {
        s.push("translate(" + tb + ")");
      }
    }
    function d3_interpolateRotate(ra, rb, s, q) {
      if (ra !== rb) {
        if (ra - rb > 180) rb += 360;else if (rb - ra > 180) ra += 360;
        q.push({
          i: s.push(d3_interpolateTransformPop(s) + "rotate(", null, ")") - 2,
          x: d3_interpolateNumber(ra, rb)
        });
      } else if (rb) {
        s.push(d3_interpolateTransformPop(s) + "rotate(" + rb + ")");
      }
    }
    function d3_interpolateSkew(wa, wb, s, q) {
      if (wa !== wb) {
        q.push({
          i: s.push(d3_interpolateTransformPop(s) + "skewX(", null, ")") - 2,
          x: d3_interpolateNumber(wa, wb)
        });
      } else if (wb) {
        s.push(d3_interpolateTransformPop(s) + "skewX(" + wb + ")");
      }
    }
    function d3_interpolateScale(ka, kb, s, q) {
      if (ka[0] !== kb[0] || ka[1] !== kb[1]) {
        var i = s.push(d3_interpolateTransformPop(s) + "scale(", null, ",", null, ")");
        q.push({
          i: i - 4,
          x: d3_interpolateNumber(ka[0], kb[0])
        }, {
          i: i - 2,
          x: d3_interpolateNumber(ka[1], kb[1])
        });
      } else if (kb[0] !== 1 || kb[1] !== 1) {
        s.push(d3_interpolateTransformPop(s) + "scale(" + kb + ")");
      }
    }
    function d3_interpolateTransform(a, b) {
      var s = [],
          q = [];
      a = d3.transform(a), b = d3.transform(b);
      d3_interpolateTranslate(a.translate, b.translate, s, q);
      d3_interpolateRotate(a.rotate, b.rotate, s, q);
      d3_interpolateSkew(a.skew, b.skew, s, q);
      d3_interpolateScale(a.scale, b.scale, s, q);
      a = b = null;
      return function (t) {
        var i = -1,
            n = q.length,
            o;
        while (++i < n) {
          s[(o = q[i]).i] = o.x(t);
        }return s.join("");
      };
    }
    function d3_uninterpolateNumber(a, b) {
      b = (b -= a = +a) || 1 / b;
      return function (x) {
        return (x - a) / b;
      };
    }
    function d3_uninterpolateClamp(a, b) {
      b = (b -= a = +a) || 1 / b;
      return function (x) {
        return Math.max(0, Math.min(1, (x - a) / b));
      };
    }
    d3.layout = {};
    d3.layout.bundle = function () {
      return function (links) {
        var paths = [],
            i = -1,
            n = links.length;
        while (++i < n) {
          paths.push(d3_layout_bundlePath(links[i]));
        }return paths;
      };
    };
    function d3_layout_bundlePath(link) {
      var start = link.source,
          end = link.target,
          lca = d3_layout_bundleLeastCommonAncestor(start, end),
          points = [start];
      while (start !== lca) {
        start = start.parent;
        points.push(start);
      }
      var k = points.length;
      while (end !== lca) {
        points.splice(k, 0, end);
        end = end.parent;
      }
      return points;
    }
    function d3_layout_bundleAncestors(node) {
      var ancestors = [],
          parent = node.parent;
      while (parent != null) {
        ancestors.push(node);
        node = parent;
        parent = parent.parent;
      }
      ancestors.push(node);
      return ancestors;
    }
    function d3_layout_bundleLeastCommonAncestor(a, b) {
      if (a === b) return a;
      var aNodes = d3_layout_bundleAncestors(a),
          bNodes = d3_layout_bundleAncestors(b),
          aNode = aNodes.pop(),
          bNode = bNodes.pop(),
          sharedNode = null;
      while (aNode === bNode) {
        sharedNode = aNode;
        aNode = aNodes.pop();
        bNode = bNodes.pop();
      }
      return sharedNode;
    }
    d3.layout.chord = function () {
      var chord = {},
          chords,
          groups,
          matrix,
          n,
          padding = 0,
          sortGroups,
          sortSubgroups,
          sortChords;
      function relayout() {
        var subgroups = {},
            groupSums = [],
            groupIndex = d3.range(n),
            subgroupIndex = [],
            k,
            x,
            x0,
            i,
            j;
        chords = [];
        groups = [];
        k = 0, i = -1;
        while (++i < n) {
          x = 0, j = -1;
          while (++j < n) {
            x += matrix[i][j];
          }
          groupSums.push(x);
          subgroupIndex.push(d3.range(n));
          k += x;
        }
        if (sortGroups) {
          groupIndex.sort(function (a, b) {
            return sortGroups(groupSums[a], groupSums[b]);
          });
        }
        if (sortSubgroups) {
          subgroupIndex.forEach(function (d, i) {
            d.sort(function (a, b) {
              return sortSubgroups(matrix[i][a], matrix[i][b]);
            });
          });
        }
        k = (τ - padding * n) / k;
        x = 0, i = -1;
        while (++i < n) {
          x0 = x, j = -1;
          while (++j < n) {
            var di = groupIndex[i],
                dj = subgroupIndex[di][j],
                v = matrix[di][dj],
                a0 = x,
                a1 = x += v * k;
            subgroups[di + "-" + dj] = {
              index: di,
              subindex: dj,
              startAngle: a0,
              endAngle: a1,
              value: v
            };
          }
          groups[di] = {
            index: di,
            startAngle: x0,
            endAngle: x,
            value: groupSums[di]
          };
          x += padding;
        }
        i = -1;
        while (++i < n) {
          j = i - 1;
          while (++j < n) {
            var source = subgroups[i + "-" + j],
                target = subgroups[j + "-" + i];
            if (source.value || target.value) {
              chords.push(source.value < target.value ? {
                source: target,
                target: source
              } : {
                source: source,
                target: target
              });
            }
          }
        }
        if (sortChords) resort();
      }
      function resort() {
        chords.sort(function (a, b) {
          return sortChords((a.source.value + a.target.value) / 2, (b.source.value + b.target.value) / 2);
        });
      }
      chord.matrix = function (x) {
        if (!arguments.length) return matrix;
        n = (matrix = x) && matrix.length;
        chords = groups = null;
        return chord;
      };
      chord.padding = function (x) {
        if (!arguments.length) return padding;
        padding = x;
        chords = groups = null;
        return chord;
      };
      chord.sortGroups = function (x) {
        if (!arguments.length) return sortGroups;
        sortGroups = x;
        chords = groups = null;
        return chord;
      };
      chord.sortSubgroups = function (x) {
        if (!arguments.length) return sortSubgroups;
        sortSubgroups = x;
        chords = null;
        return chord;
      };
      chord.sortChords = function (x) {
        if (!arguments.length) return sortChords;
        sortChords = x;
        if (chords) resort();
        return chord;
      };
      chord.chords = function () {
        if (!chords) relayout();
        return chords;
      };
      chord.groups = function () {
        if (!groups) relayout();
        return groups;
      };
      return chord;
    };
    d3.layout.force = function () {
      var force = {},
          event = d3.dispatch("start", "tick", "end"),
          timer,
          size = [1, 1],
          drag,
          alpha,
          friction = .9,
          linkDistance = d3_layout_forceLinkDistance,
          linkStrength = d3_layout_forceLinkStrength,
          charge = -30,
          chargeDistance2 = d3_layout_forceChargeDistance2,
          gravity = .1,
          theta2 = .64,
          nodes = [],
          links = [],
          distances,
          strengths,
          charges;
      function repulse(node) {
        return function (quad, x1, _, x2) {
          if (quad.point !== node) {
            var dx = quad.cx - node.x,
                dy = quad.cy - node.y,
                dw = x2 - x1,
                dn = dx * dx + dy * dy;
            if (dw * dw / theta2 < dn) {
              if (dn < chargeDistance2) {
                var k = quad.charge / dn;
                node.px -= dx * k;
                node.py -= dy * k;
              }
              return true;
            }
            if (quad.point && dn && dn < chargeDistance2) {
              var k = quad.pointCharge / dn;
              node.px -= dx * k;
              node.py -= dy * k;
            }
          }
          return !quad.charge;
        };
      }
      force.tick = function () {
        if ((alpha *= .99) < .005) {
          timer = null;
          event.end({
            type: "end",
            alpha: alpha = 0
          });
          return true;
        }
        var n = nodes.length,
            m = links.length,
            q,
            i,
            o,
            s,
            t,
            l,
            k,
            x,
            y;
        for (i = 0; i < m; ++i) {
          o = links[i];
          s = o.source;
          t = o.target;
          x = t.x - s.x;
          y = t.y - s.y;
          if (l = x * x + y * y) {
            l = alpha * strengths[i] * ((l = Math.sqrt(l)) - distances[i]) / l;
            x *= l;
            y *= l;
            t.x -= x * (k = s.weight + t.weight ? s.weight / (s.weight + t.weight) : .5);
            t.y -= y * k;
            s.x += x * (k = 1 - k);
            s.y += y * k;
          }
        }
        if (k = alpha * gravity) {
          x = size[0] / 2;
          y = size[1] / 2;
          i = -1;
          if (k) while (++i < n) {
            o = nodes[i];
            o.x += (x - o.x) * k;
            o.y += (y - o.y) * k;
          }
        }
        if (charge) {
          d3_layout_forceAccumulate(q = d3.geom.quadtree(nodes), alpha, charges);
          i = -1;
          while (++i < n) {
            if (!(o = nodes[i]).fixed) {
              q.visit(repulse(o));
            }
          }
        }
        i = -1;
        while (++i < n) {
          o = nodes[i];
          if (o.fixed) {
            o.x = o.px;
            o.y = o.py;
          } else {
            o.x -= (o.px - (o.px = o.x)) * friction;
            o.y -= (o.py - (o.py = o.y)) * friction;
          }
        }
        event.tick({
          type: "tick",
          alpha: alpha
        });
      };
      force.nodes = function (x) {
        if (!arguments.length) return nodes;
        nodes = x;
        return force;
      };
      force.links = function (x) {
        if (!arguments.length) return links;
        links = x;
        return force;
      };
      force.size = function (x) {
        if (!arguments.length) return size;
        size = x;
        return force;
      };
      force.linkDistance = function (x) {
        if (!arguments.length) return linkDistance;
        linkDistance = typeof x === "function" ? x : +x;
        return force;
      };
      force.distance = force.linkDistance;
      force.linkStrength = function (x) {
        if (!arguments.length) return linkStrength;
        linkStrength = typeof x === "function" ? x : +x;
        return force;
      };
      force.friction = function (x) {
        if (!arguments.length) return friction;
        friction = +x;
        return force;
      };
      force.charge = function (x) {
        if (!arguments.length) return charge;
        charge = typeof x === "function" ? x : +x;
        return force;
      };
      force.chargeDistance = function (x) {
        if (!arguments.length) return Math.sqrt(chargeDistance2);
        chargeDistance2 = x * x;
        return force;
      };
      force.gravity = function (x) {
        if (!arguments.length) return gravity;
        gravity = +x;
        return force;
      };
      force.theta = function (x) {
        if (!arguments.length) return Math.sqrt(theta2);
        theta2 = x * x;
        return force;
      };
      force.alpha = function (x) {
        if (!arguments.length) return alpha;
        x = +x;
        if (alpha) {
          if (x > 0) {
            alpha = x;
          } else {
            timer.c = null, timer.t = NaN, timer = null;
            event.end({
              type: "end",
              alpha: alpha = 0
            });
          }
        } else if (x > 0) {
          event.start({
            type: "start",
            alpha: alpha = x
          });
          timer = d3_timer(force.tick);
        }
        return force;
      };
      force.start = function () {
        var i,
            n = nodes.length,
            m = links.length,
            w = size[0],
            h = size[1],
            neighbors,
            o;
        for (i = 0; i < n; ++i) {
          (o = nodes[i]).index = i;
          o.weight = 0;
        }
        for (i = 0; i < m; ++i) {
          o = links[i];
          if (typeof o.source == "number") o.source = nodes[o.source];
          if (typeof o.target == "number") o.target = nodes[o.target];
          ++o.source.weight;
          ++o.target.weight;
        }
        for (i = 0; i < n; ++i) {
          o = nodes[i];
          if (isNaN(o.x)) o.x = position("x", w);
          if (isNaN(o.y)) o.y = position("y", h);
          if (isNaN(o.px)) o.px = o.x;
          if (isNaN(o.py)) o.py = o.y;
        }
        distances = [];
        if (typeof linkDistance === "function") for (i = 0; i < m; ++i) {
          distances[i] = +linkDistance.call(this, links[i], i);
        } else for (i = 0; i < m; ++i) {
          distances[i] = linkDistance;
        }strengths = [];
        if (typeof linkStrength === "function") for (i = 0; i < m; ++i) {
          strengths[i] = +linkStrength.call(this, links[i], i);
        } else for (i = 0; i < m; ++i) {
          strengths[i] = linkStrength;
        }charges = [];
        if (typeof charge === "function") for (i = 0; i < n; ++i) {
          charges[i] = +charge.call(this, nodes[i], i);
        } else for (i = 0; i < n; ++i) {
          charges[i] = charge;
        }function position(dimension, size) {
          if (!neighbors) {
            neighbors = new Array(n);
            for (j = 0; j < n; ++j) {
              neighbors[j] = [];
            }
            for (j = 0; j < m; ++j) {
              var o = links[j];
              neighbors[o.source.index].push(o.target);
              neighbors[o.target.index].push(o.source);
            }
          }
          var candidates = neighbors[i],
              j = -1,
              l = candidates.length,
              x;
          while (++j < l) {
            if (!isNaN(x = candidates[j][dimension])) return x;
          }return Math.random() * size;
        }
        return force.resume();
      };
      force.resume = function () {
        return force.alpha(.1);
      };
      force.stop = function () {
        return force.alpha(0);
      };
      force.drag = function () {
        if (!drag) drag = d3.behavior.drag().origin(d3_identity).on("dragstart.force", d3_layout_forceDragstart).on("drag.force", dragmove).on("dragend.force", d3_layout_forceDragend);
        if (!arguments.length) return drag;
        this.on("mouseover.force", d3_layout_forceMouseover).on("mouseout.force", d3_layout_forceMouseout).call(drag);
      };
      function dragmove(d) {
        d.px = d3.event.x, d.py = d3.event.y;
        force.resume();
      }
      return d3.rebind(force, event, "on");
    };
    function d3_layout_forceDragstart(d) {
      d.fixed |= 2;
    }
    function d3_layout_forceDragend(d) {
      d.fixed &= ~6;
    }
    function d3_layout_forceMouseover(d) {
      d.fixed |= 4;
      d.px = d.x, d.py = d.y;
    }
    function d3_layout_forceMouseout(d) {
      d.fixed &= ~4;
    }
    function d3_layout_forceAccumulate(quad, alpha, charges) {
      var cx = 0,
          cy = 0;
      quad.charge = 0;
      if (!quad.leaf) {
        var nodes = quad.nodes,
            n = nodes.length,
            i = -1,
            c;
        while (++i < n) {
          c = nodes[i];
          if (c == null) continue;
          d3_layout_forceAccumulate(c, alpha, charges);
          quad.charge += c.charge;
          cx += c.charge * c.cx;
          cy += c.charge * c.cy;
        }
      }
      if (quad.point) {
        if (!quad.leaf) {
          quad.point.x += Math.random() - .5;
          quad.point.y += Math.random() - .5;
        }
        var k = alpha * charges[quad.point.index];
        quad.charge += quad.pointCharge = k;
        cx += k * quad.point.x;
        cy += k * quad.point.y;
      }
      quad.cx = cx / quad.charge;
      quad.cy = cy / quad.charge;
    }
    var d3_layout_forceLinkDistance = 20,
        d3_layout_forceLinkStrength = 1,
        d3_layout_forceChargeDistance2 = Infinity;
    d3.layout.hierarchy = function () {
      var sort = d3_layout_hierarchySort,
          children = d3_layout_hierarchyChildren,
          value = d3_layout_hierarchyValue;
      function hierarchy(root) {
        var stack = [root],
            nodes = [],
            node;
        root.depth = 0;
        while ((node = stack.pop()) != null) {
          nodes.push(node);
          if ((childs = children.call(hierarchy, node, node.depth)) && (n = childs.length)) {
            var n, childs, child;
            while (--n >= 0) {
              stack.push(child = childs[n]);
              child.parent = node;
              child.depth = node.depth + 1;
            }
            if (value) node.value = 0;
            node.children = childs;
          } else {
            if (value) node.value = +value.call(hierarchy, node, node.depth) || 0;
            delete node.children;
          }
        }
        d3_layout_hierarchyVisitAfter(root, function (node) {
          var childs, parent;
          if (sort && (childs = node.children)) childs.sort(sort);
          if (value && (parent = node.parent)) parent.value += node.value;
        });
        return nodes;
      }
      hierarchy.sort = function (x) {
        if (!arguments.length) return sort;
        sort = x;
        return hierarchy;
      };
      hierarchy.children = function (x) {
        if (!arguments.length) return children;
        children = x;
        return hierarchy;
      };
      hierarchy.value = function (x) {
        if (!arguments.length) return value;
        value = x;
        return hierarchy;
      };
      hierarchy.revalue = function (root) {
        if (value) {
          d3_layout_hierarchyVisitBefore(root, function (node) {
            if (node.children) node.value = 0;
          });
          d3_layout_hierarchyVisitAfter(root, function (node) {
            var parent;
            if (!node.children) node.value = +value.call(hierarchy, node, node.depth) || 0;
            if (parent = node.parent) parent.value += node.value;
          });
        }
        return root;
      };
      return hierarchy;
    };
    function d3_layout_hierarchyRebind(object, hierarchy) {
      d3.rebind(object, hierarchy, "sort", "children", "value");
      object.nodes = object;
      object.links = d3_layout_hierarchyLinks;
      return object;
    }
    function d3_layout_hierarchyVisitBefore(node, callback) {
      var nodes = [node];
      while ((node = nodes.pop()) != null) {
        callback(node);
        if ((children = node.children) && (n = children.length)) {
          var n, children;
          while (--n >= 0) {
            nodes.push(children[n]);
          }
        }
      }
    }
    function d3_layout_hierarchyVisitAfter(node, callback) {
      var nodes = [node],
          nodes2 = [];
      while ((node = nodes.pop()) != null) {
        nodes2.push(node);
        if ((children = node.children) && (n = children.length)) {
          var i = -1,
              n,
              children;
          while (++i < n) {
            nodes.push(children[i]);
          }
        }
      }
      while ((node = nodes2.pop()) != null) {
        callback(node);
      }
    }
    function d3_layout_hierarchyChildren(d) {
      return d.children;
    }
    function d3_layout_hierarchyValue(d) {
      return d.value;
    }
    function d3_layout_hierarchySort(a, b) {
      return b.value - a.value;
    }
    function d3_layout_hierarchyLinks(nodes) {
      return d3.merge(nodes.map(function (parent) {
        return (parent.children || []).map(function (child) {
          return {
            source: parent,
            target: child
          };
        });
      }));
    }
    d3.layout.partition = function () {
      var hierarchy = d3.layout.hierarchy(),
          size = [1, 1];
      function position(node, x, dx, dy) {
        var children = node.children;
        node.x = x;
        node.y = node.depth * dy;
        node.dx = dx;
        node.dy = dy;
        if (children && (n = children.length)) {
          var i = -1,
              n,
              c,
              d;
          dx = node.value ? dx / node.value : 0;
          while (++i < n) {
            position(c = children[i], x, d = c.value * dx, dy);
            x += d;
          }
        }
      }
      function depth(node) {
        var children = node.children,
            d = 0;
        if (children && (n = children.length)) {
          var i = -1,
              n;
          while (++i < n) {
            d = Math.max(d, depth(children[i]));
          }
        }
        return 1 + d;
      }
      function partition(d, i) {
        var nodes = hierarchy.call(this, d, i);
        position(nodes[0], 0, size[0], size[1] / depth(nodes[0]));
        return nodes;
      }
      partition.size = function (x) {
        if (!arguments.length) return size;
        size = x;
        return partition;
      };
      return d3_layout_hierarchyRebind(partition, hierarchy);
    };
    d3.layout.pie = function () {
      var value = Number,
          sort = d3_layout_pieSortByValue,
          startAngle = 0,
          endAngle = τ,
          padAngle = 0;
      function pie(data) {
        var n = data.length,
            values = data.map(function (d, i) {
          return +value.call(pie, d, i);
        }),
            a = +(typeof startAngle === "function" ? startAngle.apply(this, arguments) : startAngle),
            da = (typeof endAngle === "function" ? endAngle.apply(this, arguments) : endAngle) - a,
            p = Math.min(Math.abs(da) / n, +(typeof padAngle === "function" ? padAngle.apply(this, arguments) : padAngle)),
            pa = p * (da < 0 ? -1 : 1),
            sum = d3.sum(values),
            k = sum ? (da - n * pa) / sum : 0,
            index = d3.range(n),
            arcs = [],
            v;
        if (sort != null) index.sort(sort === d3_layout_pieSortByValue ? function (i, j) {
          return values[j] - values[i];
        } : function (i, j) {
          return sort(data[i], data[j]);
        });
        index.forEach(function (i) {
          arcs[i] = {
            data: data[i],
            value: v = values[i],
            startAngle: a,
            endAngle: a += v * k + pa,
            padAngle: p
          };
        });
        return arcs;
      }
      pie.value = function (_) {
        if (!arguments.length) return value;
        value = _;
        return pie;
      };
      pie.sort = function (_) {
        if (!arguments.length) return sort;
        sort = _;
        return pie;
      };
      pie.startAngle = function (_) {
        if (!arguments.length) return startAngle;
        startAngle = _;
        return pie;
      };
      pie.endAngle = function (_) {
        if (!arguments.length) return endAngle;
        endAngle = _;
        return pie;
      };
      pie.padAngle = function (_) {
        if (!arguments.length) return padAngle;
        padAngle = _;
        return pie;
      };
      return pie;
    };
    var d3_layout_pieSortByValue = {};
    d3.layout.stack = function () {
      var values = d3_identity,
          order = d3_layout_stackOrderDefault,
          offset = d3_layout_stackOffsetZero,
          out = d3_layout_stackOut,
          x = d3_layout_stackX,
          y = d3_layout_stackY;
      function stack(data, index) {
        if (!(n = data.length)) return data;
        var series = data.map(function (d, i) {
          return values.call(stack, d, i);
        });
        var points = series.map(function (d) {
          return d.map(function (v, i) {
            return [x.call(stack, v, i), y.call(stack, v, i)];
          });
        });
        var orders = order.call(stack, points, index);
        series = d3.permute(series, orders);
        points = d3.permute(points, orders);
        var offsets = offset.call(stack, points, index);
        var m = series[0].length,
            n,
            i,
            j,
            o;
        for (j = 0; j < m; ++j) {
          out.call(stack, series[0][j], o = offsets[j], points[0][j][1]);
          for (i = 1; i < n; ++i) {
            out.call(stack, series[i][j], o += points[i - 1][j][1], points[i][j][1]);
          }
        }
        return data;
      }
      stack.values = function (x) {
        if (!arguments.length) return values;
        values = x;
        return stack;
      };
      stack.order = function (x) {
        if (!arguments.length) return order;
        order = typeof x === "function" ? x : d3_layout_stackOrders.get(x) || d3_layout_stackOrderDefault;
        return stack;
      };
      stack.offset = function (x) {
        if (!arguments.length) return offset;
        offset = typeof x === "function" ? x : d3_layout_stackOffsets.get(x) || d3_layout_stackOffsetZero;
        return stack;
      };
      stack.x = function (z) {
        if (!arguments.length) return x;
        x = z;
        return stack;
      };
      stack.y = function (z) {
        if (!arguments.length) return y;
        y = z;
        return stack;
      };
      stack.out = function (z) {
        if (!arguments.length) return out;
        out = z;
        return stack;
      };
      return stack;
    };
    function d3_layout_stackX(d) {
      return d.x;
    }
    function d3_layout_stackY(d) {
      return d.y;
    }
    function d3_layout_stackOut(d, y0, y) {
      d.y0 = y0;
      d.y = y;
    }
    var d3_layout_stackOrders = d3.map({
      "inside-out": function insideOut(data) {
        var n = data.length,
            i,
            j,
            max = data.map(d3_layout_stackMaxIndex),
            sums = data.map(d3_layout_stackReduceSum),
            index = d3.range(n).sort(function (a, b) {
          return max[a] - max[b];
        }),
            top = 0,
            bottom = 0,
            tops = [],
            bottoms = [];
        for (i = 0; i < n; ++i) {
          j = index[i];
          if (top < bottom) {
            top += sums[j];
            tops.push(j);
          } else {
            bottom += sums[j];
            bottoms.push(j);
          }
        }
        return bottoms.reverse().concat(tops);
      },
      reverse: function reverse(data) {
        return d3.range(data.length).reverse();
      },
      "default": d3_layout_stackOrderDefault
    });
    var d3_layout_stackOffsets = d3.map({
      silhouette: function silhouette(data) {
        var n = data.length,
            m = data[0].length,
            sums = [],
            max = 0,
            i,
            j,
            o,
            y0 = [];
        for (j = 0; j < m; ++j) {
          for (i = 0, o = 0; i < n; i++) {
            o += data[i][j][1];
          }if (o > max) max = o;
          sums.push(o);
        }
        for (j = 0; j < m; ++j) {
          y0[j] = (max - sums[j]) / 2;
        }
        return y0;
      },
      wiggle: function wiggle(data) {
        var n = data.length,
            x = data[0],
            m = x.length,
            i,
            j,
            k,
            s1,
            s2,
            s3,
            dx,
            o,
            o0,
            y0 = [];
        y0[0] = o = o0 = 0;
        for (j = 1; j < m; ++j) {
          for (i = 0, s1 = 0; i < n; ++i) {
            s1 += data[i][j][1];
          }for (i = 0, s2 = 0, dx = x[j][0] - x[j - 1][0]; i < n; ++i) {
            for (k = 0, s3 = (data[i][j][1] - data[i][j - 1][1]) / (2 * dx); k < i; ++k) {
              s3 += (data[k][j][1] - data[k][j - 1][1]) / dx;
            }
            s2 += s3 * data[i][j][1];
          }
          y0[j] = o -= s1 ? s2 / s1 * dx : 0;
          if (o < o0) o0 = o;
        }
        for (j = 0; j < m; ++j) {
          y0[j] -= o0;
        }return y0;
      },
      expand: function expand(data) {
        var n = data.length,
            m = data[0].length,
            k = 1 / n,
            i,
            j,
            o,
            y0 = [];
        for (j = 0; j < m; ++j) {
          for (i = 0, o = 0; i < n; i++) {
            o += data[i][j][1];
          }if (o) for (i = 0; i < n; i++) {
            data[i][j][1] /= o;
          } else for (i = 0; i < n; i++) {
            data[i][j][1] = k;
          }
        }
        for (j = 0; j < m; ++j) {
          y0[j] = 0;
        }return y0;
      },
      zero: d3_layout_stackOffsetZero
    });
    function d3_layout_stackOrderDefault(data) {
      return d3.range(data.length);
    }
    function d3_layout_stackOffsetZero(data) {
      var j = -1,
          m = data[0].length,
          y0 = [];
      while (++j < m) {
        y0[j] = 0;
      }return y0;
    }
    function d3_layout_stackMaxIndex(array) {
      var i = 1,
          j = 0,
          v = array[0][1],
          k,
          n = array.length;
      for (; i < n; ++i) {
        if ((k = array[i][1]) > v) {
          j = i;
          v = k;
        }
      }
      return j;
    }
    function d3_layout_stackReduceSum(d) {
      return d.reduce(d3_layout_stackSum, 0);
    }
    function d3_layout_stackSum(p, d) {
      return p + d[1];
    }
    d3.layout.histogram = function () {
      var frequency = true,
          valuer = Number,
          ranger = d3_layout_histogramRange,
          binner = d3_layout_histogramBinSturges;
      function histogram(data, i) {
        var bins = [],
            values = data.map(valuer, this),
            range = ranger.call(this, values, i),
            thresholds = binner.call(this, range, values, i),
            bin,
            i = -1,
            n = values.length,
            m = thresholds.length - 1,
            k = frequency ? 1 : 1 / n,
            x;
        while (++i < m) {
          bin = bins[i] = [];
          bin.dx = thresholds[i + 1] - (bin.x = thresholds[i]);
          bin.y = 0;
        }
        if (m > 0) {
          i = -1;
          while (++i < n) {
            x = values[i];
            if (x >= range[0] && x <= range[1]) {
              bin = bins[d3.bisect(thresholds, x, 1, m) - 1];
              bin.y += k;
              bin.push(data[i]);
            }
          }
        }
        return bins;
      }
      histogram.value = function (x) {
        if (!arguments.length) return valuer;
        valuer = x;
        return histogram;
      };
      histogram.range = function (x) {
        if (!arguments.length) return ranger;
        ranger = d3_functor(x);
        return histogram;
      };
      histogram.bins = function (x) {
        if (!arguments.length) return binner;
        binner = typeof x === "number" ? function (range) {
          return d3_layout_histogramBinFixed(range, x);
        } : d3_functor(x);
        return histogram;
      };
      histogram.frequency = function (x) {
        if (!arguments.length) return frequency;
        frequency = !!x;
        return histogram;
      };
      return histogram;
    };
    function d3_layout_histogramBinSturges(range, values) {
      return d3_layout_histogramBinFixed(range, Math.ceil(Math.log(values.length) / Math.LN2 + 1));
    }
    function d3_layout_histogramBinFixed(range, n) {
      var x = -1,
          b = +range[0],
          m = (range[1] - b) / n,
          f = [];
      while (++x <= n) {
        f[x] = m * x + b;
      }return f;
    }
    function d3_layout_histogramRange(values) {
      return [d3.min(values), d3.max(values)];
    }
    d3.layout.pack = function () {
      var hierarchy = d3.layout.hierarchy().sort(d3_layout_packSort),
          padding = 0,
          size = [1, 1],
          radius;
      function pack(d, i) {
        var nodes = hierarchy.call(this, d, i),
            root = nodes[0],
            w = size[0],
            h = size[1],
            r = radius == null ? Math.sqrt : typeof radius === "function" ? radius : function () {
          return radius;
        };
        root.x = root.y = 0;
        d3_layout_hierarchyVisitAfter(root, function (d) {
          d.r = +r(d.value);
        });
        d3_layout_hierarchyVisitAfter(root, d3_layout_packSiblings);
        if (padding) {
          var dr = padding * (radius ? 1 : Math.max(2 * root.r / w, 2 * root.r / h)) / 2;
          d3_layout_hierarchyVisitAfter(root, function (d) {
            d.r += dr;
          });
          d3_layout_hierarchyVisitAfter(root, d3_layout_packSiblings);
          d3_layout_hierarchyVisitAfter(root, function (d) {
            d.r -= dr;
          });
        }
        d3_layout_packTransform(root, w / 2, h / 2, radius ? 1 : 1 / Math.max(2 * root.r / w, 2 * root.r / h));
        return nodes;
      }
      pack.size = function (_) {
        if (!arguments.length) return size;
        size = _;
        return pack;
      };
      pack.radius = function (_) {
        if (!arguments.length) return radius;
        radius = _ == null || typeof _ === "function" ? _ : +_;
        return pack;
      };
      pack.padding = function (_) {
        if (!arguments.length) return padding;
        padding = +_;
        return pack;
      };
      return d3_layout_hierarchyRebind(pack, hierarchy);
    };
    function d3_layout_packSort(a, b) {
      return a.value - b.value;
    }
    function d3_layout_packInsert(a, b) {
      var c = a._pack_next;
      a._pack_next = b;
      b._pack_prev = a;
      b._pack_next = c;
      c._pack_prev = b;
    }
    function d3_layout_packSplice(a, b) {
      a._pack_next = b;
      b._pack_prev = a;
    }
    function d3_layout_packIntersects(a, b) {
      var dx = b.x - a.x,
          dy = b.y - a.y,
          dr = a.r + b.r;
      return .999 * dr * dr > dx * dx + dy * dy;
    }
    function d3_layout_packSiblings(node) {
      if (!(nodes = node.children) || !(n = nodes.length)) return;
      var nodes,
          xMin = Infinity,
          xMax = -Infinity,
          yMin = Infinity,
          yMax = -Infinity,
          a,
          b,
          c,
          i,
          j,
          k,
          n;
      function bound(node) {
        xMin = Math.min(node.x - node.r, xMin);
        xMax = Math.max(node.x + node.r, xMax);
        yMin = Math.min(node.y - node.r, yMin);
        yMax = Math.max(node.y + node.r, yMax);
      }
      nodes.forEach(d3_layout_packLink);
      a = nodes[0];
      a.x = -a.r;
      a.y = 0;
      bound(a);
      if (n > 1) {
        b = nodes[1];
        b.x = b.r;
        b.y = 0;
        bound(b);
        if (n > 2) {
          c = nodes[2];
          d3_layout_packPlace(a, b, c);
          bound(c);
          d3_layout_packInsert(a, c);
          a._pack_prev = c;
          d3_layout_packInsert(c, b);
          b = a._pack_next;
          for (i = 3; i < n; i++) {
            d3_layout_packPlace(a, b, c = nodes[i]);
            var isect = 0,
                s1 = 1,
                s2 = 1;
            for (j = b._pack_next; j !== b; j = j._pack_next, s1++) {
              if (d3_layout_packIntersects(j, c)) {
                isect = 1;
                break;
              }
            }
            if (isect == 1) {
              for (k = a._pack_prev; k !== j._pack_prev; k = k._pack_prev, s2++) {
                if (d3_layout_packIntersects(k, c)) {
                  break;
                }
              }
            }
            if (isect) {
              if (s1 < s2 || s1 == s2 && b.r < a.r) d3_layout_packSplice(a, b = j);else d3_layout_packSplice(a = k, b);
              i--;
            } else {
              d3_layout_packInsert(a, c);
              b = c;
              bound(c);
            }
          }
        }
      }
      var cx = (xMin + xMax) / 2,
          cy = (yMin + yMax) / 2,
          cr = 0;
      for (i = 0; i < n; i++) {
        c = nodes[i];
        c.x -= cx;
        c.y -= cy;
        cr = Math.max(cr, c.r + Math.sqrt(c.x * c.x + c.y * c.y));
      }
      node.r = cr;
      nodes.forEach(d3_layout_packUnlink);
    }
    function d3_layout_packLink(node) {
      node._pack_next = node._pack_prev = node;
    }
    function d3_layout_packUnlink(node) {
      delete node._pack_next;
      delete node._pack_prev;
    }
    function d3_layout_packTransform(node, x, y, k) {
      var children = node.children;
      node.x = x += k * node.x;
      node.y = y += k * node.y;
      node.r *= k;
      if (children) {
        var i = -1,
            n = children.length;
        while (++i < n) {
          d3_layout_packTransform(children[i], x, y, k);
        }
      }
    }
    function d3_layout_packPlace(a, b, c) {
      var db = a.r + c.r,
          dx = b.x - a.x,
          dy = b.y - a.y;
      if (db && (dx || dy)) {
        var da = b.r + c.r,
            dc = dx * dx + dy * dy;
        da *= da;
        db *= db;
        var x = .5 + (db - da) / (2 * dc),
            y = Math.sqrt(Math.max(0, 2 * da * (db + dc) - (db -= dc) * db - da * da)) / (2 * dc);
        c.x = a.x + x * dx + y * dy;
        c.y = a.y + x * dy - y * dx;
      } else {
        c.x = a.x + db;
        c.y = a.y;
      }
    }
    d3.layout.tree = function () {
      var hierarchy = d3.layout.hierarchy().sort(null).value(null),
          separation = d3_layout_treeSeparation,
          size = [1, 1],
          nodeSize = null;
      function tree(d, i) {
        var nodes = hierarchy.call(this, d, i),
            root0 = nodes[0],
            root1 = wrapTree(root0);
        d3_layout_hierarchyVisitAfter(root1, firstWalk), root1.parent.m = -root1.z;
        d3_layout_hierarchyVisitBefore(root1, secondWalk);
        if (nodeSize) d3_layout_hierarchyVisitBefore(root0, sizeNode);else {
          var left = root0,
              right = root0,
              bottom = root0;
          d3_layout_hierarchyVisitBefore(root0, function (node) {
            if (node.x < left.x) left = node;
            if (node.x > right.x) right = node;
            if (node.depth > bottom.depth) bottom = node;
          });
          var tx = separation(left, right) / 2 - left.x,
              kx = size[0] / (right.x + separation(right, left) / 2 + tx),
              ky = size[1] / (bottom.depth || 1);
          d3_layout_hierarchyVisitBefore(root0, function (node) {
            node.x = (node.x + tx) * kx;
            node.y = node.depth * ky;
          });
        }
        return nodes;
      }
      function wrapTree(root0) {
        var root1 = {
          A: null,
          children: [root0]
        },
            queue = [root1],
            node1;
        while ((node1 = queue.pop()) != null) {
          for (var children = node1.children, child, i = 0, n = children.length; i < n; ++i) {
            queue.push((children[i] = child = {
              _: children[i],
              parent: node1,
              children: (child = children[i].children) && child.slice() || [],
              A: null,
              a: null,
              z: 0,
              m: 0,
              c: 0,
              s: 0,
              t: null,
              i: i
            }).a = child);
          }
        }
        return root1.children[0];
      }
      function firstWalk(v) {
        var children = v.children,
            siblings = v.parent.children,
            w = v.i ? siblings[v.i - 1] : null;
        if (children.length) {
          d3_layout_treeShift(v);
          var midpoint = (children[0].z + children[children.length - 1].z) / 2;
          if (w) {
            v.z = w.z + separation(v._, w._);
            v.m = v.z - midpoint;
          } else {
            v.z = midpoint;
          }
        } else if (w) {
          v.z = w.z + separation(v._, w._);
        }
        v.parent.A = apportion(v, w, v.parent.A || siblings[0]);
      }
      function secondWalk(v) {
        v._.x = v.z + v.parent.m;
        v.m += v.parent.m;
      }
      function apportion(v, w, ancestor) {
        if (w) {
          var vip = v,
              vop = v,
              vim = w,
              vom = vip.parent.children[0],
              sip = vip.m,
              sop = vop.m,
              sim = vim.m,
              som = vom.m,
              shift;
          while (vim = d3_layout_treeRight(vim), vip = d3_layout_treeLeft(vip), vim && vip) {
            vom = d3_layout_treeLeft(vom);
            vop = d3_layout_treeRight(vop);
            vop.a = v;
            shift = vim.z + sim - vip.z - sip + separation(vim._, vip._);
            if (shift > 0) {
              d3_layout_treeMove(d3_layout_treeAncestor(vim, v, ancestor), v, shift);
              sip += shift;
              sop += shift;
            }
            sim += vim.m;
            sip += vip.m;
            som += vom.m;
            sop += vop.m;
          }
          if (vim && !d3_layout_treeRight(vop)) {
            vop.t = vim;
            vop.m += sim - sop;
          }
          if (vip && !d3_layout_treeLeft(vom)) {
            vom.t = vip;
            vom.m += sip - som;
            ancestor = v;
          }
        }
        return ancestor;
      }
      function sizeNode(node) {
        node.x *= size[0];
        node.y = node.depth * size[1];
      }
      tree.separation = function (x) {
        if (!arguments.length) return separation;
        separation = x;
        return tree;
      };
      tree.size = function (x) {
        if (!arguments.length) return nodeSize ? null : size;
        nodeSize = (size = x) == null ? sizeNode : null;
        return tree;
      };
      tree.nodeSize = function (x) {
        if (!arguments.length) return nodeSize ? size : null;
        nodeSize = (size = x) == null ? null : sizeNode;
        return tree;
      };
      return d3_layout_hierarchyRebind(tree, hierarchy);
    };
    function d3_layout_treeSeparation(a, b) {
      return a.parent == b.parent ? 1 : 2;
    }
    function d3_layout_treeLeft(v) {
      var children = v.children;
      return children.length ? children[0] : v.t;
    }
    function d3_layout_treeRight(v) {
      var children = v.children,
          n;
      return (n = children.length) ? children[n - 1] : v.t;
    }
    function d3_layout_treeMove(wm, wp, shift) {
      var change = shift / (wp.i - wm.i);
      wp.c -= change;
      wp.s += shift;
      wm.c += change;
      wp.z += shift;
      wp.m += shift;
    }
    function d3_layout_treeShift(v) {
      var shift = 0,
          change = 0,
          children = v.children,
          i = children.length,
          w;
      while (--i >= 0) {
        w = children[i];
        w.z += shift;
        w.m += shift;
        shift += w.s + (change += w.c);
      }
    }
    function d3_layout_treeAncestor(vim, v, ancestor) {
      return vim.a.parent === v.parent ? vim.a : ancestor;
    }
    d3.layout.cluster = function () {
      var hierarchy = d3.layout.hierarchy().sort(null).value(null),
          separation = d3_layout_treeSeparation,
          size = [1, 1],
          nodeSize = false;
      function cluster(d, i) {
        var nodes = hierarchy.call(this, d, i),
            root = nodes[0],
            previousNode,
            x = 0;
        d3_layout_hierarchyVisitAfter(root, function (node) {
          var children = node.children;
          if (children && children.length) {
            node.x = d3_layout_clusterX(children);
            node.y = d3_layout_clusterY(children);
          } else {
            node.x = previousNode ? x += separation(node, previousNode) : 0;
            node.y = 0;
            previousNode = node;
          }
        });
        var left = d3_layout_clusterLeft(root),
            right = d3_layout_clusterRight(root),
            x0 = left.x - separation(left, right) / 2,
            x1 = right.x + separation(right, left) / 2;
        d3_layout_hierarchyVisitAfter(root, nodeSize ? function (node) {
          node.x = (node.x - root.x) * size[0];
          node.y = (root.y - node.y) * size[1];
        } : function (node) {
          node.x = (node.x - x0) / (x1 - x0) * size[0];
          node.y = (1 - (root.y ? node.y / root.y : 1)) * size[1];
        });
        return nodes;
      }
      cluster.separation = function (x) {
        if (!arguments.length) return separation;
        separation = x;
        return cluster;
      };
      cluster.size = function (x) {
        if (!arguments.length) return nodeSize ? null : size;
        nodeSize = (size = x) == null;
        return cluster;
      };
      cluster.nodeSize = function (x) {
        if (!arguments.length) return nodeSize ? size : null;
        nodeSize = (size = x) != null;
        return cluster;
      };
      return d3_layout_hierarchyRebind(cluster, hierarchy);
    };
    function d3_layout_clusterY(children) {
      return 1 + d3.max(children, function (child) {
        return child.y;
      });
    }
    function d3_layout_clusterX(children) {
      return children.reduce(function (x, child) {
        return x + child.x;
      }, 0) / children.length;
    }
    function d3_layout_clusterLeft(node) {
      var children = node.children;
      return children && children.length ? d3_layout_clusterLeft(children[0]) : node;
    }
    function d3_layout_clusterRight(node) {
      var children = node.children,
          n;
      return children && (n = children.length) ? d3_layout_clusterRight(children[n - 1]) : node;
    }
    d3.layout.treemap = function () {
      var hierarchy = d3.layout.hierarchy(),
          round = Math.round,
          size = [1, 1],
          padding = null,
          pad = d3_layout_treemapPadNull,
          sticky = false,
          stickies,
          mode = "squarify",
          ratio = .5 * (1 + Math.sqrt(5));
      function scale(children, k) {
        var i = -1,
            n = children.length,
            child,
            area;
        while (++i < n) {
          area = (child = children[i]).value * (k < 0 ? 0 : k);
          child.area = isNaN(area) || area <= 0 ? 0 : area;
        }
      }
      function squarify(node) {
        var children = node.children;
        if (children && children.length) {
          var rect = pad(node),
              row = [],
              remaining = children.slice(),
              child,
              best = Infinity,
              score,
              u = mode === "slice" ? rect.dx : mode === "dice" ? rect.dy : mode === "slice-dice" ? node.depth & 1 ? rect.dy : rect.dx : Math.min(rect.dx, rect.dy),
              n;
          scale(remaining, rect.dx * rect.dy / node.value);
          row.area = 0;
          while ((n = remaining.length) > 0) {
            row.push(child = remaining[n - 1]);
            row.area += child.area;
            if (mode !== "squarify" || (score = worst(row, u)) <= best) {
              remaining.pop();
              best = score;
            } else {
              row.area -= row.pop().area;
              position(row, u, rect, false);
              u = Math.min(rect.dx, rect.dy);
              row.length = row.area = 0;
              best = Infinity;
            }
          }
          if (row.length) {
            position(row, u, rect, true);
            row.length = row.area = 0;
          }
          children.forEach(squarify);
        }
      }
      function stickify(node) {
        var children = node.children;
        if (children && children.length) {
          var rect = pad(node),
              remaining = children.slice(),
              child,
              row = [];
          scale(remaining, rect.dx * rect.dy / node.value);
          row.area = 0;
          while (child = remaining.pop()) {
            row.push(child);
            row.area += child.area;
            if (child.z != null) {
              position(row, child.z ? rect.dx : rect.dy, rect, !remaining.length);
              row.length = row.area = 0;
            }
          }
          children.forEach(stickify);
        }
      }
      function worst(row, u) {
        var s = row.area,
            r,
            rmax = 0,
            rmin = Infinity,
            i = -1,
            n = row.length;
        while (++i < n) {
          if (!(r = row[i].area)) continue;
          if (r < rmin) rmin = r;
          if (r > rmax) rmax = r;
        }
        s *= s;
        u *= u;
        return s ? Math.max(u * rmax * ratio / s, s / (u * rmin * ratio)) : Infinity;
      }
      function position(row, u, rect, flush) {
        var i = -1,
            n = row.length,
            x = rect.x,
            y = rect.y,
            v = u ? round(row.area / u) : 0,
            o;
        if (u == rect.dx) {
          if (flush || v > rect.dy) v = rect.dy;
          while (++i < n) {
            o = row[i];
            o.x = x;
            o.y = y;
            o.dy = v;
            x += o.dx = Math.min(rect.x + rect.dx - x, v ? round(o.area / v) : 0);
          }
          o.z = true;
          o.dx += rect.x + rect.dx - x;
          rect.y += v;
          rect.dy -= v;
        } else {
          if (flush || v > rect.dx) v = rect.dx;
          while (++i < n) {
            o = row[i];
            o.x = x;
            o.y = y;
            o.dx = v;
            y += o.dy = Math.min(rect.y + rect.dy - y, v ? round(o.area / v) : 0);
          }
          o.z = false;
          o.dy += rect.y + rect.dy - y;
          rect.x += v;
          rect.dx -= v;
        }
      }
      function treemap(d) {
        var nodes = stickies || hierarchy(d),
            root = nodes[0];
        root.x = root.y = 0;
        if (root.value) root.dx = size[0], root.dy = size[1];else root.dx = root.dy = 0;
        if (stickies) hierarchy.revalue(root);
        scale([root], root.dx * root.dy / root.value);
        (stickies ? stickify : squarify)(root);
        if (sticky) stickies = nodes;
        return nodes;
      }
      treemap.size = function (x) {
        if (!arguments.length) return size;
        size = x;
        return treemap;
      };
      treemap.padding = function (x) {
        if (!arguments.length) return padding;
        function padFunction(node) {
          var p = x.call(treemap, node, node.depth);
          return p == null ? d3_layout_treemapPadNull(node) : d3_layout_treemapPad(node, typeof p === "number" ? [p, p, p, p] : p);
        }
        function padConstant(node) {
          return d3_layout_treemapPad(node, x);
        }
        var type;
        pad = (padding = x) == null ? d3_layout_treemapPadNull : (type = typeof x === "undefined" ? "undefined" : _typeof(x)) === "function" ? padFunction : type === "number" ? (x = [x, x, x, x], padConstant) : padConstant;
        return treemap;
      };
      treemap.round = function (x) {
        if (!arguments.length) return round != Number;
        round = x ? Math.round : Number;
        return treemap;
      };
      treemap.sticky = function (x) {
        if (!arguments.length) return sticky;
        sticky = x;
        stickies = null;
        return treemap;
      };
      treemap.ratio = function (x) {
        if (!arguments.length) return ratio;
        ratio = x;
        return treemap;
      };
      treemap.mode = function (x) {
        if (!arguments.length) return mode;
        mode = x + "";
        return treemap;
      };
      return d3_layout_hierarchyRebind(treemap, hierarchy);
    };
    function d3_layout_treemapPadNull(node) {
      return {
        x: node.x,
        y: node.y,
        dx: node.dx,
        dy: node.dy
      };
    }
    function d3_layout_treemapPad(node, padding) {
      var x = node.x + padding[3],
          y = node.y + padding[0],
          dx = node.dx - padding[1] - padding[3],
          dy = node.dy - padding[0] - padding[2];
      if (dx < 0) {
        x += dx / 2;
        dx = 0;
      }
      if (dy < 0) {
        y += dy / 2;
        dy = 0;
      }
      return {
        x: x,
        y: y,
        dx: dx,
        dy: dy
      };
    }
    d3.random = {
      normal: function normal(µ, σ) {
        var n = arguments.length;
        if (n < 2) σ = 1;
        if (n < 1) µ = 0;
        return function () {
          var x, y, r;
          do {
            x = Math.random() * 2 - 1;
            y = Math.random() * 2 - 1;
            r = x * x + y * y;
          } while (!r || r > 1);
          return µ + σ * x * Math.sqrt(-2 * Math.log(r) / r);
        };
      },
      logNormal: function logNormal() {
        var random = d3.random.normal.apply(d3, arguments);
        return function () {
          return Math.exp(random());
        };
      },
      bates: function bates(m) {
        var random = d3.random.irwinHall(m);
        return function () {
          return random() / m;
        };
      },
      irwinHall: function irwinHall(m) {
        return function () {
          for (var s = 0, j = 0; j < m; j++) {
            s += Math.random();
          }return s;
        };
      }
    };
    d3.scale = {};
    function d3_scaleExtent(domain) {
      var start = domain[0],
          stop = domain[domain.length - 1];
      return start < stop ? [start, stop] : [stop, start];
    }
    function d3_scaleRange(scale) {
      return scale.rangeExtent ? scale.rangeExtent() : d3_scaleExtent(scale.range());
    }
    function d3_scale_bilinear(domain, range, uninterpolate, interpolate) {
      var u = uninterpolate(domain[0], domain[1]),
          i = interpolate(range[0], range[1]);
      return function (x) {
        return i(u(x));
      };
    }
    function d3_scale_nice(domain, nice) {
      var i0 = 0,
          i1 = domain.length - 1,
          x0 = domain[i0],
          x1 = domain[i1],
          dx;
      if (x1 < x0) {
        dx = i0, i0 = i1, i1 = dx;
        dx = x0, x0 = x1, x1 = dx;
      }
      domain[i0] = nice.floor(x0);
      domain[i1] = nice.ceil(x1);
      return domain;
    }
    function d3_scale_niceStep(step) {
      return step ? {
        floor: function floor(x) {
          return Math.floor(x / step) * step;
        },
        ceil: function ceil(x) {
          return Math.ceil(x / step) * step;
        }
      } : d3_scale_niceIdentity;
    }
    var d3_scale_niceIdentity = {
      floor: d3_identity,
      ceil: d3_identity
    };
    function d3_scale_polylinear(domain, range, uninterpolate, interpolate) {
      var u = [],
          i = [],
          j = 0,
          k = Math.min(domain.length, range.length) - 1;
      if (domain[k] < domain[0]) {
        domain = domain.slice().reverse();
        range = range.slice().reverse();
      }
      while (++j <= k) {
        u.push(uninterpolate(domain[j - 1], domain[j]));
        i.push(interpolate(range[j - 1], range[j]));
      }
      return function (x) {
        var j = d3.bisect(domain, x, 1, k) - 1;
        return i[j](u[j](x));
      };
    }
    d3.scale.linear = function () {
      return d3_scale_linear([0, 1], [0, 1], d3_interpolate, false);
    };
    function d3_scale_linear(domain, range, interpolate, clamp) {
      var output, input;
      function rescale() {
        var linear = Math.min(domain.length, range.length) > 2 ? d3_scale_polylinear : d3_scale_bilinear,
            uninterpolate = clamp ? d3_uninterpolateClamp : d3_uninterpolateNumber;
        output = linear(domain, range, uninterpolate, interpolate);
        input = linear(range, domain, uninterpolate, d3_interpolate);
        return scale;
      }
      function scale(x) {
        return output(x);
      }
      scale.invert = function (y) {
        return input(y);
      };
      scale.domain = function (x) {
        if (!arguments.length) return domain;
        domain = x.map(Number);
        return rescale();
      };
      scale.range = function (x) {
        if (!arguments.length) return range;
        range = x;
        return rescale();
      };
      scale.rangeRound = function (x) {
        return scale.range(x).interpolate(d3_interpolateRound);
      };
      scale.clamp = function (x) {
        if (!arguments.length) return clamp;
        clamp = x;
        return rescale();
      };
      scale.interpolate = function (x) {
        if (!arguments.length) return interpolate;
        interpolate = x;
        return rescale();
      };
      scale.ticks = function (m) {
        return d3_scale_linearTicks(domain, m);
      };
      scale.tickFormat = function (m, format) {
        return d3_scale_linearTickFormat(domain, m, format);
      };
      scale.nice = function (m) {
        d3_scale_linearNice(domain, m);
        return rescale();
      };
      scale.copy = function () {
        return d3_scale_linear(domain, range, interpolate, clamp);
      };
      return rescale();
    }
    function d3_scale_linearRebind(scale, linear) {
      return d3.rebind(scale, linear, "range", "rangeRound", "interpolate", "clamp");
    }
    function d3_scale_linearNice(domain, m) {
      d3_scale_nice(domain, d3_scale_niceStep(d3_scale_linearTickRange(domain, m)[2]));
      d3_scale_nice(domain, d3_scale_niceStep(d3_scale_linearTickRange(domain, m)[2]));
      return domain;
    }
    function d3_scale_linearTickRange(domain, m) {
      if (m == null) m = 10;
      var extent = d3_scaleExtent(domain),
          span = extent[1] - extent[0],
          step = Math.pow(10, Math.floor(Math.log(span / m) / Math.LN10)),
          err = m / span * step;
      if (err <= .15) step *= 10;else if (err <= .35) step *= 5;else if (err <= .75) step *= 2;
      extent[0] = Math.ceil(extent[0] / step) * step;
      extent[1] = Math.floor(extent[1] / step) * step + step * .5;
      extent[2] = step;
      return extent;
    }
    function d3_scale_linearTicks(domain, m) {
      return d3.range.apply(d3, d3_scale_linearTickRange(domain, m));
    }
    function d3_scale_linearTickFormat(domain, m, format) {
      var range = d3_scale_linearTickRange(domain, m);
      if (format) {
        var match = d3_format_re.exec(format);
        match.shift();
        if (match[8] === "s") {
          var prefix = d3.formatPrefix(Math.max(abs(range[0]), abs(range[1])));
          if (!match[7]) match[7] = "." + d3_scale_linearPrecision(prefix.scale(range[2]));
          match[8] = "f";
          format = d3.format(match.join(""));
          return function (d) {
            return format(prefix.scale(d)) + prefix.symbol;
          };
        }
        if (!match[7]) match[7] = "." + d3_scale_linearFormatPrecision(match[8], range);
        format = match.join("");
      } else {
        format = ",." + d3_scale_linearPrecision(range[2]) + "f";
      }
      return d3.format(format);
    }
    var d3_scale_linearFormatSignificant = {
      s: 1,
      g: 1,
      p: 1,
      r: 1,
      e: 1
    };
    function d3_scale_linearPrecision(value) {
      return -Math.floor(Math.log(value) / Math.LN10 + .01);
    }
    function d3_scale_linearFormatPrecision(type, range) {
      var p = d3_scale_linearPrecision(range[2]);
      return type in d3_scale_linearFormatSignificant ? Math.abs(p - d3_scale_linearPrecision(Math.max(abs(range[0]), abs(range[1])))) + +(type !== "e") : p - (type === "%") * 2;
    }
    d3.scale.log = function () {
      return d3_scale_log(d3.scale.linear().domain([0, 1]), 10, true, [1, 10]);
    };
    function d3_scale_log(linear, base, positive, domain) {
      function log(x) {
        return (positive ? Math.log(x < 0 ? 0 : x) : -Math.log(x > 0 ? 0 : -x)) / Math.log(base);
      }
      function pow(x) {
        return positive ? Math.pow(base, x) : -Math.pow(base, -x);
      }
      function scale(x) {
        return linear(log(x));
      }
      scale.invert = function (x) {
        return pow(linear.invert(x));
      };
      scale.domain = function (x) {
        if (!arguments.length) return domain;
        positive = x[0] >= 0;
        linear.domain((domain = x.map(Number)).map(log));
        return scale;
      };
      scale.base = function (_) {
        if (!arguments.length) return base;
        base = +_;
        linear.domain(domain.map(log));
        return scale;
      };
      scale.nice = function () {
        var niced = d3_scale_nice(domain.map(log), positive ? Math : d3_scale_logNiceNegative);
        linear.domain(niced);
        domain = niced.map(pow);
        return scale;
      };
      scale.ticks = function () {
        var extent = d3_scaleExtent(domain),
            ticks = [],
            u = extent[0],
            v = extent[1],
            i = Math.floor(log(u)),
            j = Math.ceil(log(v)),
            n = base % 1 ? 2 : base;
        if (isFinite(j - i)) {
          if (positive) {
            for (; i < j; i++) {
              for (var k = 1; k < n; k++) {
                ticks.push(pow(i) * k);
              }
            }ticks.push(pow(i));
          } else {
            ticks.push(pow(i));
            for (; i++ < j;) {
              for (var k = n - 1; k > 0; k--) {
                ticks.push(pow(i) * k);
              }
            }
          }
          for (i = 0; ticks[i] < u; i++) {}
          for (j = ticks.length; ticks[j - 1] > v; j--) {}
          ticks = ticks.slice(i, j);
        }
        return ticks;
      };
      scale.tickFormat = function (n, format) {
        if (!arguments.length) return d3_scale_logFormat;
        if (arguments.length < 2) format = d3_scale_logFormat;else if (typeof format !== "function") format = d3.format(format);
        var k = Math.max(1, base * n / scale.ticks().length);
        return function (d) {
          var i = d / pow(Math.round(log(d)));
          if (i * base < base - .5) i *= base;
          return i <= k ? format(d) : "";
        };
      };
      scale.copy = function () {
        return d3_scale_log(linear.copy(), base, positive, domain);
      };
      return d3_scale_linearRebind(scale, linear);
    }
    var d3_scale_logFormat = d3.format(".0e"),
        d3_scale_logNiceNegative = {
      floor: function floor(x) {
        return -Math.ceil(-x);
      },
      ceil: function ceil(x) {
        return -Math.floor(-x);
      }
    };
    d3.scale.pow = function () {
      return d3_scale_pow(d3.scale.linear(), 1, [0, 1]);
    };
    function d3_scale_pow(linear, exponent, domain) {
      var powp = d3_scale_powPow(exponent),
          powb = d3_scale_powPow(1 / exponent);
      function scale(x) {
        return linear(powp(x));
      }
      scale.invert = function (x) {
        return powb(linear.invert(x));
      };
      scale.domain = function (x) {
        if (!arguments.length) return domain;
        linear.domain((domain = x.map(Number)).map(powp));
        return scale;
      };
      scale.ticks = function (m) {
        return d3_scale_linearTicks(domain, m);
      };
      scale.tickFormat = function (m, format) {
        return d3_scale_linearTickFormat(domain, m, format);
      };
      scale.nice = function (m) {
        return scale.domain(d3_scale_linearNice(domain, m));
      };
      scale.exponent = function (x) {
        if (!arguments.length) return exponent;
        powp = d3_scale_powPow(exponent = x);
        powb = d3_scale_powPow(1 / exponent);
        linear.domain(domain.map(powp));
        return scale;
      };
      scale.copy = function () {
        return d3_scale_pow(linear.copy(), exponent, domain);
      };
      return d3_scale_linearRebind(scale, linear);
    }
    function d3_scale_powPow(e) {
      return function (x) {
        return x < 0 ? -Math.pow(-x, e) : Math.pow(x, e);
      };
    }
    d3.scale.sqrt = function () {
      return d3.scale.pow().exponent(.5);
    };
    d3.scale.ordinal = function () {
      return d3_scale_ordinal([], {
        t: "range",
        a: [[]]
      });
    };
    function d3_scale_ordinal(domain, ranger) {
      var index, range, rangeBand;
      function scale(x) {
        return range[((index.get(x) || (ranger.t === "range" ? index.set(x, domain.push(x)) : NaN)) - 1) % range.length];
      }
      function steps(start, step) {
        return d3.range(domain.length).map(function (i) {
          return start + step * i;
        });
      }
      scale.domain = function (x) {
        if (!arguments.length) return domain;
        domain = [];
        index = new d3_Map();
        var i = -1,
            n = x.length,
            xi;
        while (++i < n) {
          if (!index.has(xi = x[i])) index.set(xi, domain.push(xi));
        }return scale[ranger.t].apply(scale, ranger.a);
      };
      scale.range = function (x) {
        if (!arguments.length) return range;
        range = x;
        rangeBand = 0;
        ranger = {
          t: "range",
          a: arguments
        };
        return scale;
      };
      scale.rangePoints = function (x, padding) {
        if (arguments.length < 2) padding = 0;
        var start = x[0],
            stop = x[1],
            step = domain.length < 2 ? (start = (start + stop) / 2, 0) : (stop - start) / (domain.length - 1 + padding);
        range = steps(start + step * padding / 2, step);
        rangeBand = 0;
        ranger = {
          t: "rangePoints",
          a: arguments
        };
        return scale;
      };
      scale.rangeRoundPoints = function (x, padding) {
        if (arguments.length < 2) padding = 0;
        var start = x[0],
            stop = x[1],
            step = domain.length < 2 ? (start = stop = Math.round((start + stop) / 2), 0) : (stop - start) / (domain.length - 1 + padding) | 0;
        range = steps(start + Math.round(step * padding / 2 + (stop - start - (domain.length - 1 + padding) * step) / 2), step);
        rangeBand = 0;
        ranger = {
          t: "rangeRoundPoints",
          a: arguments
        };
        return scale;
      };
      scale.rangeBands = function (x, padding, outerPadding) {
        if (arguments.length < 2) padding = 0;
        if (arguments.length < 3) outerPadding = padding;
        var reverse = x[1] < x[0],
            start = x[reverse - 0],
            stop = x[1 - reverse],
            step = (stop - start) / (domain.length - padding + 2 * outerPadding);
        range = steps(start + step * outerPadding, step);
        if (reverse) range.reverse();
        rangeBand = step * (1 - padding);
        ranger = {
          t: "rangeBands",
          a: arguments
        };
        return scale;
      };
      scale.rangeRoundBands = function (x, padding, outerPadding) {
        if (arguments.length < 2) padding = 0;
        if (arguments.length < 3) outerPadding = padding;
        var reverse = x[1] < x[0],
            start = x[reverse - 0],
            stop = x[1 - reverse],
            step = Math.floor((stop - start) / (domain.length - padding + 2 * outerPadding));
        range = steps(start + Math.round((stop - start - (domain.length - padding) * step) / 2), step);
        if (reverse) range.reverse();
        rangeBand = Math.round(step * (1 - padding));
        ranger = {
          t: "rangeRoundBands",
          a: arguments
        };
        return scale;
      };
      scale.rangeBand = function () {
        return rangeBand;
      };
      scale.rangeExtent = function () {
        return d3_scaleExtent(ranger.a[0]);
      };
      scale.copy = function () {
        return d3_scale_ordinal(domain, ranger);
      };
      return scale.domain(domain);
    }
    d3.scale.category10 = function () {
      return d3.scale.ordinal().range(d3_category10);
    };
    d3.scale.category20 = function () {
      return d3.scale.ordinal().range(d3_category20);
    };
    d3.scale.category20b = function () {
      return d3.scale.ordinal().range(d3_category20b);
    };
    d3.scale.category20c = function () {
      return d3.scale.ordinal().range(d3_category20c);
    };
    var d3_category10 = [2062260, 16744206, 2924588, 14034728, 9725885, 9197131, 14907330, 8355711, 12369186, 1556175].map(d3_rgbString);
    var d3_category20 = [2062260, 11454440, 16744206, 16759672, 2924588, 10018698, 14034728, 16750742, 9725885, 12955861, 9197131, 12885140, 14907330, 16234194, 8355711, 13092807, 12369186, 14408589, 1556175, 10410725].map(d3_rgbString);
    var d3_category20b = [3750777, 5395619, 7040719, 10264286, 6519097, 9216594, 11915115, 13556636, 9202993, 12426809, 15186514, 15190932, 8666169, 11356490, 14049643, 15177372, 8077683, 10834324, 13528509, 14589654].map(d3_rgbString);
    var d3_category20c = [3244733, 7057110, 10406625, 13032431, 15095053, 16616764, 16625259, 16634018, 3253076, 7652470, 10607003, 13101504, 7695281, 10394312, 12369372, 14342891, 6513507, 9868950, 12434877, 14277081].map(d3_rgbString);
    d3.scale.quantile = function () {
      return d3_scale_quantile([], []);
    };
    function d3_scale_quantile(domain, range) {
      var thresholds;
      function rescale() {
        var k = 0,
            q = range.length;
        thresholds = [];
        while (++k < q) {
          thresholds[k - 1] = d3.quantile(domain, k / q);
        }return scale;
      }
      function scale(x) {
        if (!isNaN(x = +x)) return range[d3.bisect(thresholds, x)];
      }
      scale.domain = function (x) {
        if (!arguments.length) return domain;
        domain = x.map(d3_number).filter(d3_numeric).sort(d3_ascending);
        return rescale();
      };
      scale.range = function (x) {
        if (!arguments.length) return range;
        range = x;
        return rescale();
      };
      scale.quantiles = function () {
        return thresholds;
      };
      scale.invertExtent = function (y) {
        y = range.indexOf(y);
        return y < 0 ? [NaN, NaN] : [y > 0 ? thresholds[y - 1] : domain[0], y < thresholds.length ? thresholds[y] : domain[domain.length - 1]];
      };
      scale.copy = function () {
        return d3_scale_quantile(domain, range);
      };
      return rescale();
    }
    d3.scale.quantize = function () {
      return d3_scale_quantize(0, 1, [0, 1]);
    };
    function d3_scale_quantize(x0, x1, range) {
      var kx, i;
      function scale(x) {
        return range[Math.max(0, Math.min(i, Math.floor(kx * (x - x0))))];
      }
      function rescale() {
        kx = range.length / (x1 - x0);
        i = range.length - 1;
        return scale;
      }
      scale.domain = function (x) {
        if (!arguments.length) return [x0, x1];
        x0 = +x[0];
        x1 = +x[x.length - 1];
        return rescale();
      };
      scale.range = function (x) {
        if (!arguments.length) return range;
        range = x;
        return rescale();
      };
      scale.invertExtent = function (y) {
        y = range.indexOf(y);
        y = y < 0 ? NaN : y / kx + x0;
        return [y, y + 1 / kx];
      };
      scale.copy = function () {
        return d3_scale_quantize(x0, x1, range);
      };
      return rescale();
    }
    d3.scale.threshold = function () {
      return d3_scale_threshold([.5], [0, 1]);
    };
    function d3_scale_threshold(domain, range) {
      function scale(x) {
        if (x <= x) return range[d3.bisect(domain, x)];
      }
      scale.domain = function (_) {
        if (!arguments.length) return domain;
        domain = _;
        return scale;
      };
      scale.range = function (_) {
        if (!arguments.length) return range;
        range = _;
        return scale;
      };
      scale.invertExtent = function (y) {
        y = range.indexOf(y);
        return [domain[y - 1], domain[y]];
      };
      scale.copy = function () {
        return d3_scale_threshold(domain, range);
      };
      return scale;
    }
    d3.scale.identity = function () {
      return d3_scale_identity([0, 1]);
    };
    function d3_scale_identity(domain) {
      function identity(x) {
        return +x;
      }
      identity.invert = identity;
      identity.domain = identity.range = function (x) {
        if (!arguments.length) return domain;
        domain = x.map(identity);
        return identity;
      };
      identity.ticks = function (m) {
        return d3_scale_linearTicks(domain, m);
      };
      identity.tickFormat = function (m, format) {
        return d3_scale_linearTickFormat(domain, m, format);
      };
      identity.copy = function () {
        return d3_scale_identity(domain);
      };
      return identity;
    }
    d3.svg = {};
    function d3_zero() {
      return 0;
    }
    d3.svg.arc = function () {
      var innerRadius = d3_svg_arcInnerRadius,
          outerRadius = d3_svg_arcOuterRadius,
          cornerRadius = d3_zero,
          padRadius = d3_svg_arcAuto,
          startAngle = d3_svg_arcStartAngle,
          endAngle = d3_svg_arcEndAngle,
          padAngle = d3_svg_arcPadAngle;
      function arc() {
        var r0 = Math.max(0, +innerRadius.apply(this, arguments)),
            r1 = Math.max(0, +outerRadius.apply(this, arguments)),
            a0 = startAngle.apply(this, arguments) - halfπ,
            a1 = endAngle.apply(this, arguments) - halfπ,
            da = Math.abs(a1 - a0),
            cw = a0 > a1 ? 0 : 1;
        if (r1 < r0) rc = r1, r1 = r0, r0 = rc;
        if (da >= τε) return circleSegment(r1, cw) + (r0 ? circleSegment(r0, 1 - cw) : "") + "Z";
        var rc,
            cr,
            rp,
            ap,
            p0 = 0,
            p1 = 0,
            x0,
            y0,
            x1,
            y1,
            x2,
            y2,
            x3,
            y3,
            path = [];
        if (ap = (+padAngle.apply(this, arguments) || 0) / 2) {
          rp = padRadius === d3_svg_arcAuto ? Math.sqrt(r0 * r0 + r1 * r1) : +padRadius.apply(this, arguments);
          if (!cw) p1 *= -1;
          if (r1) p1 = d3_asin(rp / r1 * Math.sin(ap));
          if (r0) p0 = d3_asin(rp / r0 * Math.sin(ap));
        }
        if (r1) {
          x0 = r1 * Math.cos(a0 + p1);
          y0 = r1 * Math.sin(a0 + p1);
          x1 = r1 * Math.cos(a1 - p1);
          y1 = r1 * Math.sin(a1 - p1);
          var l1 = Math.abs(a1 - a0 - 2 * p1) <= π ? 0 : 1;
          if (p1 && d3_svg_arcSweep(x0, y0, x1, y1) === cw ^ l1) {
            var h1 = (a0 + a1) / 2;
            x0 = r1 * Math.cos(h1);
            y0 = r1 * Math.sin(h1);
            x1 = y1 = null;
          }
        } else {
          x0 = y0 = 0;
        }
        if (r0) {
          x2 = r0 * Math.cos(a1 - p0);
          y2 = r0 * Math.sin(a1 - p0);
          x3 = r0 * Math.cos(a0 + p0);
          y3 = r0 * Math.sin(a0 + p0);
          var l0 = Math.abs(a0 - a1 + 2 * p0) <= π ? 0 : 1;
          if (p0 && d3_svg_arcSweep(x2, y2, x3, y3) === 1 - cw ^ l0) {
            var h0 = (a0 + a1) / 2;
            x2 = r0 * Math.cos(h0);
            y2 = r0 * Math.sin(h0);
            x3 = y3 = null;
          }
        } else {
          x2 = y2 = 0;
        }
        if (da > ε && (rc = Math.min(Math.abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments))) > .001) {
          cr = r0 < r1 ^ cw ? 0 : 1;
          var rc1 = rc,
              rc0 = rc;
          if (da < π) {
            var oc = x3 == null ? [x2, y2] : x1 == null ? [x0, y0] : d3_geom_polygonIntersect([x0, y0], [x3, y3], [x1, y1], [x2, y2]),
                ax = x0 - oc[0],
                ay = y0 - oc[1],
                bx = x1 - oc[0],
                by = y1 - oc[1],
                kc = 1 / Math.sin(Math.acos((ax * bx + ay * by) / (Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by))) / 2),
                lc = Math.sqrt(oc[0] * oc[0] + oc[1] * oc[1]);
            rc0 = Math.min(rc, (r0 - lc) / (kc - 1));
            rc1 = Math.min(rc, (r1 - lc) / (kc + 1));
          }
          if (x1 != null) {
            var t30 = d3_svg_arcCornerTangents(x3 == null ? [x2, y2] : [x3, y3], [x0, y0], r1, rc1, cw),
                t12 = d3_svg_arcCornerTangents([x1, y1], [x2, y2], r1, rc1, cw);
            if (rc === rc1) {
              path.push("M", t30[0], "A", rc1, ",", rc1, " 0 0,", cr, " ", t30[1], "A", r1, ",", r1, " 0 ", 1 - cw ^ d3_svg_arcSweep(t30[1][0], t30[1][1], t12[1][0], t12[1][1]), ",", cw, " ", t12[1], "A", rc1, ",", rc1, " 0 0,", cr, " ", t12[0]);
            } else {
              path.push("M", t30[0], "A", rc1, ",", rc1, " 0 1,", cr, " ", t12[0]);
            }
          } else {
            path.push("M", x0, ",", y0);
          }
          if (x3 != null) {
            var t03 = d3_svg_arcCornerTangents([x0, y0], [x3, y3], r0, -rc0, cw),
                t21 = d3_svg_arcCornerTangents([x2, y2], x1 == null ? [x0, y0] : [x1, y1], r0, -rc0, cw);
            if (rc === rc0) {
              path.push("L", t21[0], "A", rc0, ",", rc0, " 0 0,", cr, " ", t21[1], "A", r0, ",", r0, " 0 ", cw ^ d3_svg_arcSweep(t21[1][0], t21[1][1], t03[1][0], t03[1][1]), ",", 1 - cw, " ", t03[1], "A", rc0, ",", rc0, " 0 0,", cr, " ", t03[0]);
            } else {
              path.push("L", t21[0], "A", rc0, ",", rc0, " 0 0,", cr, " ", t03[0]);
            }
          } else {
            path.push("L", x2, ",", y2);
          }
        } else {
          path.push("M", x0, ",", y0);
          if (x1 != null) path.push("A", r1, ",", r1, " 0 ", l1, ",", cw, " ", x1, ",", y1);
          path.push("L", x2, ",", y2);
          if (x3 != null) path.push("A", r0, ",", r0, " 0 ", l0, ",", 1 - cw, " ", x3, ",", y3);
        }
        path.push("Z");
        return path.join("");
      }
      function circleSegment(r1, cw) {
        return "M0," + r1 + "A" + r1 + "," + r1 + " 0 1," + cw + " 0," + -r1 + "A" + r1 + "," + r1 + " 0 1," + cw + " 0," + r1;
      }
      arc.innerRadius = function (v) {
        if (!arguments.length) return innerRadius;
        innerRadius = d3_functor(v);
        return arc;
      };
      arc.outerRadius = function (v) {
        if (!arguments.length) return outerRadius;
        outerRadius = d3_functor(v);
        return arc;
      };
      arc.cornerRadius = function (v) {
        if (!arguments.length) return cornerRadius;
        cornerRadius = d3_functor(v);
        return arc;
      };
      arc.padRadius = function (v) {
        if (!arguments.length) return padRadius;
        padRadius = v == d3_svg_arcAuto ? d3_svg_arcAuto : d3_functor(v);
        return arc;
      };
      arc.startAngle = function (v) {
        if (!arguments.length) return startAngle;
        startAngle = d3_functor(v);
        return arc;
      };
      arc.endAngle = function (v) {
        if (!arguments.length) return endAngle;
        endAngle = d3_functor(v);
        return arc;
      };
      arc.padAngle = function (v) {
        if (!arguments.length) return padAngle;
        padAngle = d3_functor(v);
        return arc;
      };
      arc.centroid = function () {
        var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2,
            a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - halfπ;
        return [Math.cos(a) * r, Math.sin(a) * r];
      };
      return arc;
    };
    var d3_svg_arcAuto = "auto";
    function d3_svg_arcInnerRadius(d) {
      return d.innerRadius;
    }
    function d3_svg_arcOuterRadius(d) {
      return d.outerRadius;
    }
    function d3_svg_arcStartAngle(d) {
      return d.startAngle;
    }
    function d3_svg_arcEndAngle(d) {
      return d.endAngle;
    }
    function d3_svg_arcPadAngle(d) {
      return d && d.padAngle;
    }
    function d3_svg_arcSweep(x0, y0, x1, y1) {
      return (x0 - x1) * y0 - (y0 - y1) * x0 > 0 ? 0 : 1;
    }
    function d3_svg_arcCornerTangents(p0, p1, r1, rc, cw) {
      var x01 = p0[0] - p1[0],
          y01 = p0[1] - p1[1],
          lo = (cw ? rc : -rc) / Math.sqrt(x01 * x01 + y01 * y01),
          ox = lo * y01,
          oy = -lo * x01,
          x1 = p0[0] + ox,
          y1 = p0[1] + oy,
          x2 = p1[0] + ox,
          y2 = p1[1] + oy,
          x3 = (x1 + x2) / 2,
          y3 = (y1 + y2) / 2,
          dx = x2 - x1,
          dy = y2 - y1,
          d2 = dx * dx + dy * dy,
          r = r1 - rc,
          D = x1 * y2 - x2 * y1,
          d = (dy < 0 ? -1 : 1) * Math.sqrt(Math.max(0, r * r * d2 - D * D)),
          cx0 = (D * dy - dx * d) / d2,
          cy0 = (-D * dx - dy * d) / d2,
          cx1 = (D * dy + dx * d) / d2,
          cy1 = (-D * dx + dy * d) / d2,
          dx0 = cx0 - x3,
          dy0 = cy0 - y3,
          dx1 = cx1 - x3,
          dy1 = cy1 - y3;
      if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;
      return [[cx0 - ox, cy0 - oy], [cx0 * r1 / r, cy0 * r1 / r]];
    }
    function d3_svg_line(projection) {
      var x = d3_geom_pointX,
          y = d3_geom_pointY,
          defined = d3_true,
          interpolate = d3_svg_lineLinear,
          interpolateKey = interpolate.key,
          tension = .7;
      function line(data) {
        var segments = [],
            points = [],
            i = -1,
            n = data.length,
            d,
            fx = d3_functor(x),
            fy = d3_functor(y);
        function segment() {
          segments.push("M", interpolate(projection(points), tension));
        }
        while (++i < n) {
          if (defined.call(this, d = data[i], i)) {
            points.push([+fx.call(this, d, i), +fy.call(this, d, i)]);
          } else if (points.length) {
            segment();
            points = [];
          }
        }
        if (points.length) segment();
        return segments.length ? segments.join("") : null;
      }
      line.x = function (_) {
        if (!arguments.length) return x;
        x = _;
        return line;
      };
      line.y = function (_) {
        if (!arguments.length) return y;
        y = _;
        return line;
      };
      line.defined = function (_) {
        if (!arguments.length) return defined;
        defined = _;
        return line;
      };
      line.interpolate = function (_) {
        if (!arguments.length) return interpolateKey;
        if (typeof _ === "function") interpolateKey = interpolate = _;else interpolateKey = (interpolate = d3_svg_lineInterpolators.get(_) || d3_svg_lineLinear).key;
        return line;
      };
      line.tension = function (_) {
        if (!arguments.length) return tension;
        tension = _;
        return line;
      };
      return line;
    }
    d3.svg.line = function () {
      return d3_svg_line(d3_identity);
    };
    var d3_svg_lineInterpolators = d3.map({
      linear: d3_svg_lineLinear,
      "linear-closed": d3_svg_lineLinearClosed,
      step: d3_svg_lineStep,
      "step-before": d3_svg_lineStepBefore,
      "step-after": d3_svg_lineStepAfter,
      basis: d3_svg_lineBasis,
      "basis-open": d3_svg_lineBasisOpen,
      "basis-closed": d3_svg_lineBasisClosed,
      bundle: d3_svg_lineBundle,
      cardinal: d3_svg_lineCardinal,
      "cardinal-open": d3_svg_lineCardinalOpen,
      "cardinal-closed": d3_svg_lineCardinalClosed,
      monotone: d3_svg_lineMonotone
    });
    d3_svg_lineInterpolators.forEach(function (key, value) {
      value.key = key;
      value.closed = /-closed$/.test(key);
    });
    function d3_svg_lineLinear(points) {
      return points.length > 1 ? points.join("L") : points + "Z";
    }
    function d3_svg_lineLinearClosed(points) {
      return points.join("L") + "Z";
    }
    function d3_svg_lineStep(points) {
      var i = 0,
          n = points.length,
          p = points[0],
          path = [p[0], ",", p[1]];
      while (++i < n) {
        path.push("H", (p[0] + (p = points[i])[0]) / 2, "V", p[1]);
      }if (n > 1) path.push("H", p[0]);
      return path.join("");
    }
    function d3_svg_lineStepBefore(points) {
      var i = 0,
          n = points.length,
          p = points[0],
          path = [p[0], ",", p[1]];
      while (++i < n) {
        path.push("V", (p = points[i])[1], "H", p[0]);
      }return path.join("");
    }
    function d3_svg_lineStepAfter(points) {
      var i = 0,
          n = points.length,
          p = points[0],
          path = [p[0], ",", p[1]];
      while (++i < n) {
        path.push("H", (p = points[i])[0], "V", p[1]);
      }return path.join("");
    }
    function d3_svg_lineCardinalOpen(points, tension) {
      return points.length < 4 ? d3_svg_lineLinear(points) : points[1] + d3_svg_lineHermite(points.slice(1, -1), d3_svg_lineCardinalTangents(points, tension));
    }
    function d3_svg_lineCardinalClosed(points, tension) {
      return points.length < 3 ? d3_svg_lineLinearClosed(points) : points[0] + d3_svg_lineHermite((points.push(points[0]), points), d3_svg_lineCardinalTangents([points[points.length - 2]].concat(points, [points[1]]), tension));
    }
    function d3_svg_lineCardinal(points, tension) {
      return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite(points, d3_svg_lineCardinalTangents(points, tension));
    }
    function d3_svg_lineHermite(points, tangents) {
      if (tangents.length < 1 || points.length != tangents.length && points.length != tangents.length + 2) {
        return d3_svg_lineLinear(points);
      }
      var quad = points.length != tangents.length,
          path = "",
          p0 = points[0],
          p = points[1],
          t0 = tangents[0],
          t = t0,
          pi = 1;
      if (quad) {
        path += "Q" + (p[0] - t0[0] * 2 / 3) + "," + (p[1] - t0[1] * 2 / 3) + "," + p[0] + "," + p[1];
        p0 = points[1];
        pi = 2;
      }
      if (tangents.length > 1) {
        t = tangents[1];
        p = points[pi];
        pi++;
        path += "C" + (p0[0] + t0[0]) + "," + (p0[1] + t0[1]) + "," + (p[0] - t[0]) + "," + (p[1] - t[1]) + "," + p[0] + "," + p[1];
        for (var i = 2; i < tangents.length; i++, pi++) {
          p = points[pi];
          t = tangents[i];
          path += "S" + (p[0] - t[0]) + "," + (p[1] - t[1]) + "," + p[0] + "," + p[1];
        }
      }
      if (quad) {
        var lp = points[pi];
        path += "Q" + (p[0] + t[0] * 2 / 3) + "," + (p[1] + t[1] * 2 / 3) + "," + lp[0] + "," + lp[1];
      }
      return path;
    }
    function d3_svg_lineCardinalTangents(points, tension) {
      var tangents = [],
          a = (1 - tension) / 2,
          p0,
          p1 = points[0],
          p2 = points[1],
          i = 1,
          n = points.length;
      while (++i < n) {
        p0 = p1;
        p1 = p2;
        p2 = points[i];
        tangents.push([a * (p2[0] - p0[0]), a * (p2[1] - p0[1])]);
      }
      return tangents;
    }
    function d3_svg_lineBasis(points) {
      if (points.length < 3) return d3_svg_lineLinear(points);
      var i = 1,
          n = points.length,
          pi = points[0],
          x0 = pi[0],
          y0 = pi[1],
          px = [x0, x0, x0, (pi = points[1])[0]],
          py = [y0, y0, y0, pi[1]],
          path = [x0, ",", y0, "L", d3_svg_lineDot4(d3_svg_lineBasisBezier3, px), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, py)];
      points.push(points[n - 1]);
      while (++i <= n) {
        pi = points[i];
        px.shift();
        px.push(pi[0]);
        py.shift();
        py.push(pi[1]);
        d3_svg_lineBasisBezier(path, px, py);
      }
      points.pop();
      path.push("L", pi);
      return path.join("");
    }
    function d3_svg_lineBasisOpen(points) {
      if (points.length < 4) return d3_svg_lineLinear(points);
      var path = [],
          i = -1,
          n = points.length,
          pi,
          px = [0],
          py = [0];
      while (++i < 3) {
        pi = points[i];
        px.push(pi[0]);
        py.push(pi[1]);
      }
      path.push(d3_svg_lineDot4(d3_svg_lineBasisBezier3, px) + "," + d3_svg_lineDot4(d3_svg_lineBasisBezier3, py));
      --i;
      while (++i < n) {
        pi = points[i];
        px.shift();
        px.push(pi[0]);
        py.shift();
        py.push(pi[1]);
        d3_svg_lineBasisBezier(path, px, py);
      }
      return path.join("");
    }
    function d3_svg_lineBasisClosed(points) {
      var path,
          i = -1,
          n = points.length,
          m = n + 4,
          pi,
          px = [],
          py = [];
      while (++i < 4) {
        pi = points[i % n];
        px.push(pi[0]);
        py.push(pi[1]);
      }
      path = [d3_svg_lineDot4(d3_svg_lineBasisBezier3, px), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, py)];
      --i;
      while (++i < m) {
        pi = points[i % n];
        px.shift();
        px.push(pi[0]);
        py.shift();
        py.push(pi[1]);
        d3_svg_lineBasisBezier(path, px, py);
      }
      return path.join("");
    }
    function d3_svg_lineBundle(points, tension) {
      var n = points.length - 1;
      if (n) {
        var x0 = points[0][0],
            y0 = points[0][1],
            dx = points[n][0] - x0,
            dy = points[n][1] - y0,
            i = -1,
            p,
            t;
        while (++i <= n) {
          p = points[i];
          t = i / n;
          p[0] = tension * p[0] + (1 - tension) * (x0 + t * dx);
          p[1] = tension * p[1] + (1 - tension) * (y0 + t * dy);
        }
      }
      return d3_svg_lineBasis(points);
    }
    function d3_svg_lineDot4(a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    }
    var d3_svg_lineBasisBezier1 = [0, 2 / 3, 1 / 3, 0],
        d3_svg_lineBasisBezier2 = [0, 1 / 3, 2 / 3, 0],
        d3_svg_lineBasisBezier3 = [0, 1 / 6, 2 / 3, 1 / 6];
    function d3_svg_lineBasisBezier(path, x, y) {
      path.push("C", d3_svg_lineDot4(d3_svg_lineBasisBezier1, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier1, y), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier2, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier2, y), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, y));
    }
    function d3_svg_lineSlope(p0, p1) {
      return (p1[1] - p0[1]) / (p1[0] - p0[0]);
    }
    function d3_svg_lineFiniteDifferences(points) {
      var i = 0,
          j = points.length - 1,
          m = [],
          p0 = points[0],
          p1 = points[1],
          d = m[0] = d3_svg_lineSlope(p0, p1);
      while (++i < j) {
        m[i] = (d + (d = d3_svg_lineSlope(p0 = p1, p1 = points[i + 1]))) / 2;
      }
      m[i] = d;
      return m;
    }
    function d3_svg_lineMonotoneTangents(points) {
      var tangents = [],
          d,
          a,
          b,
          s,
          m = d3_svg_lineFiniteDifferences(points),
          i = -1,
          j = points.length - 1;
      while (++i < j) {
        d = d3_svg_lineSlope(points[i], points[i + 1]);
        if (abs(d) < ε) {
          m[i] = m[i + 1] = 0;
        } else {
          a = m[i] / d;
          b = m[i + 1] / d;
          s = a * a + b * b;
          if (s > 9) {
            s = d * 3 / Math.sqrt(s);
            m[i] = s * a;
            m[i + 1] = s * b;
          }
        }
      }
      i = -1;
      while (++i <= j) {
        s = (points[Math.min(j, i + 1)][0] - points[Math.max(0, i - 1)][0]) / (6 * (1 + m[i] * m[i]));
        tangents.push([s || 0, m[i] * s || 0]);
      }
      return tangents;
    }
    function d3_svg_lineMonotone(points) {
      return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite(points, d3_svg_lineMonotoneTangents(points));
    }
    d3.svg.line.radial = function () {
      var line = d3_svg_line(d3_svg_lineRadial);
      line.radius = line.x, delete line.x;
      line.angle = line.y, delete line.y;
      return line;
    };
    function d3_svg_lineRadial(points) {
      var point,
          i = -1,
          n = points.length,
          r,
          a;
      while (++i < n) {
        point = points[i];
        r = point[0];
        a = point[1] - halfπ;
        point[0] = r * Math.cos(a);
        point[1] = r * Math.sin(a);
      }
      return points;
    }
    function d3_svg_area(projection) {
      var x0 = d3_geom_pointX,
          x1 = d3_geom_pointX,
          y0 = 0,
          y1 = d3_geom_pointY,
          defined = d3_true,
          interpolate = d3_svg_lineLinear,
          interpolateKey = interpolate.key,
          interpolateReverse = interpolate,
          L = "L",
          tension = .7;
      function area(data) {
        var segments = [],
            points0 = [],
            points1 = [],
            i = -1,
            n = data.length,
            d,
            fx0 = d3_functor(x0),
            fy0 = d3_functor(y0),
            fx1 = x0 === x1 ? function () {
          return x;
        } : d3_functor(x1),
            fy1 = y0 === y1 ? function () {
          return y;
        } : d3_functor(y1),
            x,
            y;
        function segment() {
          segments.push("M", interpolate(projection(points1), tension), L, interpolateReverse(projection(points0.reverse()), tension), "Z");
        }
        while (++i < n) {
          if (defined.call(this, d = data[i], i)) {
            points0.push([x = +fx0.call(this, d, i), y = +fy0.call(this, d, i)]);
            points1.push([+fx1.call(this, d, i), +fy1.call(this, d, i)]);
          } else if (points0.length) {
            segment();
            points0 = [];
            points1 = [];
          }
        }
        if (points0.length) segment();
        return segments.length ? segments.join("") : null;
      }
      area.x = function (_) {
        if (!arguments.length) return x1;
        x0 = x1 = _;
        return area;
      };
      area.x0 = function (_) {
        if (!arguments.length) return x0;
        x0 = _;
        return area;
      };
      area.x1 = function (_) {
        if (!arguments.length) return x1;
        x1 = _;
        return area;
      };
      area.y = function (_) {
        if (!arguments.length) return y1;
        y0 = y1 = _;
        return area;
      };
      area.y0 = function (_) {
        if (!arguments.length) return y0;
        y0 = _;
        return area;
      };
      area.y1 = function (_) {
        if (!arguments.length) return y1;
        y1 = _;
        return area;
      };
      area.defined = function (_) {
        if (!arguments.length) return defined;
        defined = _;
        return area;
      };
      area.interpolate = function (_) {
        if (!arguments.length) return interpolateKey;
        if (typeof _ === "function") interpolateKey = interpolate = _;else interpolateKey = (interpolate = d3_svg_lineInterpolators.get(_) || d3_svg_lineLinear).key;
        interpolateReverse = interpolate.reverse || interpolate;
        L = interpolate.closed ? "M" : "L";
        return area;
      };
      area.tension = function (_) {
        if (!arguments.length) return tension;
        tension = _;
        return area;
      };
      return area;
    }
    d3_svg_lineStepBefore.reverse = d3_svg_lineStepAfter;
    d3_svg_lineStepAfter.reverse = d3_svg_lineStepBefore;
    d3.svg.area = function () {
      return d3_svg_area(d3_identity);
    };
    d3.svg.area.radial = function () {
      var area = d3_svg_area(d3_svg_lineRadial);
      area.radius = area.x, delete area.x;
      area.innerRadius = area.x0, delete area.x0;
      area.outerRadius = area.x1, delete area.x1;
      area.angle = area.y, delete area.y;
      area.startAngle = area.y0, delete area.y0;
      area.endAngle = area.y1, delete area.y1;
      return area;
    };
    d3.svg.chord = function () {
      var source = d3_source,
          target = d3_target,
          radius = d3_svg_chordRadius,
          startAngle = d3_svg_arcStartAngle,
          endAngle = d3_svg_arcEndAngle;
      function chord(d, i) {
        var s = subgroup(this, source, d, i),
            t = subgroup(this, target, d, i);
        return "M" + s.p0 + arc(s.r, s.p1, s.a1 - s.a0) + (equals(s, t) ? curve(s.r, s.p1, s.r, s.p0) : curve(s.r, s.p1, t.r, t.p0) + arc(t.r, t.p1, t.a1 - t.a0) + curve(t.r, t.p1, s.r, s.p0)) + "Z";
      }
      function subgroup(self, f, d, i) {
        var subgroup = f.call(self, d, i),
            r = radius.call(self, subgroup, i),
            a0 = startAngle.call(self, subgroup, i) - halfπ,
            a1 = endAngle.call(self, subgroup, i) - halfπ;
        return {
          r: r,
          a0: a0,
          a1: a1,
          p0: [r * Math.cos(a0), r * Math.sin(a0)],
          p1: [r * Math.cos(a1), r * Math.sin(a1)]
        };
      }
      function equals(a, b) {
        return a.a0 == b.a0 && a.a1 == b.a1;
      }
      function arc(r, p, a) {
        return "A" + r + "," + r + " 0 " + +(a > π) + ",1 " + p;
      }
      function curve(r0, p0, r1, p1) {
        return "Q 0,0 " + p1;
      }
      chord.radius = function (v) {
        if (!arguments.length) return radius;
        radius = d3_functor(v);
        return chord;
      };
      chord.source = function (v) {
        if (!arguments.length) return source;
        source = d3_functor(v);
        return chord;
      };
      chord.target = function (v) {
        if (!arguments.length) return target;
        target = d3_functor(v);
        return chord;
      };
      chord.startAngle = function (v) {
        if (!arguments.length) return startAngle;
        startAngle = d3_functor(v);
        return chord;
      };
      chord.endAngle = function (v) {
        if (!arguments.length) return endAngle;
        endAngle = d3_functor(v);
        return chord;
      };
      return chord;
    };
    function d3_svg_chordRadius(d) {
      return d.radius;
    }
    d3.svg.diagonal = function () {
      var source = d3_source,
          target = d3_target,
          projection = d3_svg_diagonalProjection;
      function diagonal(d, i) {
        var p0 = source.call(this, d, i),
            p3 = target.call(this, d, i),
            m = (p0.y + p3.y) / 2,
            p = [p0, {
          x: p0.x,
          y: m
        }, {
          x: p3.x,
          y: m
        }, p3];
        p = p.map(projection);
        return "M" + p[0] + "C" + p[1] + " " + p[2] + " " + p[3];
      }
      diagonal.source = function (x) {
        if (!arguments.length) return source;
        source = d3_functor(x);
        return diagonal;
      };
      diagonal.target = function (x) {
        if (!arguments.length) return target;
        target = d3_functor(x);
        return diagonal;
      };
      diagonal.projection = function (x) {
        if (!arguments.length) return projection;
        projection = x;
        return diagonal;
      };
      return diagonal;
    };
    function d3_svg_diagonalProjection(d) {
      return [d.x, d.y];
    }
    d3.svg.diagonal.radial = function () {
      var diagonal = d3.svg.diagonal(),
          projection = d3_svg_diagonalProjection,
          projection_ = diagonal.projection;
      diagonal.projection = function (x) {
        return arguments.length ? projection_(d3_svg_diagonalRadialProjection(projection = x)) : projection;
      };
      return diagonal;
    };
    function d3_svg_diagonalRadialProjection(projection) {
      return function () {
        var d = projection.apply(this, arguments),
            r = d[0],
            a = d[1] - halfπ;
        return [r * Math.cos(a), r * Math.sin(a)];
      };
    }
    d3.svg.symbol = function () {
      var type = d3_svg_symbolType,
          size = d3_svg_symbolSize;
      function symbol(d, i) {
        return (d3_svg_symbols.get(type.call(this, d, i)) || d3_svg_symbolCircle)(size.call(this, d, i));
      }
      symbol.type = function (x) {
        if (!arguments.length) return type;
        type = d3_functor(x);
        return symbol;
      };
      symbol.size = function (x) {
        if (!arguments.length) return size;
        size = d3_functor(x);
        return symbol;
      };
      return symbol;
    };
    function d3_svg_symbolSize() {
      return 64;
    }
    function d3_svg_symbolType() {
      return "circle";
    }
    function d3_svg_symbolCircle(size) {
      var r = Math.sqrt(size / π);
      return "M0," + r + "A" + r + "," + r + " 0 1,1 0," + -r + "A" + r + "," + r + " 0 1,1 0," + r + "Z";
    }
    var d3_svg_symbols = d3.map({
      circle: d3_svg_symbolCircle,
      cross: function cross(size) {
        var r = Math.sqrt(size / 5) / 2;
        return "M" + -3 * r + "," + -r + "H" + -r + "V" + -3 * r + "H" + r + "V" + -r + "H" + 3 * r + "V" + r + "H" + r + "V" + 3 * r + "H" + -r + "V" + r + "H" + -3 * r + "Z";
      },
      diamond: function diamond(size) {
        var ry = Math.sqrt(size / (2 * d3_svg_symbolTan30)),
            rx = ry * d3_svg_symbolTan30;
        return "M0," + -ry + "L" + rx + ",0" + " 0," + ry + " " + -rx + ",0" + "Z";
      },
      square: function square(size) {
        var r = Math.sqrt(size) / 2;
        return "M" + -r + "," + -r + "L" + r + "," + -r + " " + r + "," + r + " " + -r + "," + r + "Z";
      },
      "triangle-down": function triangleDown(size) {
        var rx = Math.sqrt(size / d3_svg_symbolSqrt3),
            ry = rx * d3_svg_symbolSqrt3 / 2;
        return "M0," + ry + "L" + rx + "," + -ry + " " + -rx + "," + -ry + "Z";
      },
      "triangle-up": function triangleUp(size) {
        var rx = Math.sqrt(size / d3_svg_symbolSqrt3),
            ry = rx * d3_svg_symbolSqrt3 / 2;
        return "M0," + -ry + "L" + rx + "," + ry + " " + -rx + "," + ry + "Z";
      }
    });
    d3.svg.symbolTypes = d3_svg_symbols.keys();
    var d3_svg_symbolSqrt3 = Math.sqrt(3),
        d3_svg_symbolTan30 = Math.tan(30 * d3_radians);
    d3_selectionPrototype.transition = function (name) {
      var id = d3_transitionInheritId || ++d3_transitionId,
          ns = d3_transitionNamespace(name),
          subgroups = [],
          subgroup,
          node,
          transition = d3_transitionInherit || {
        time: Date.now(),
        ease: d3_ease_cubicInOut,
        delay: 0,
        duration: 250
      };
      for (var j = -1, m = this.length; ++j < m;) {
        subgroups.push(subgroup = []);
        for (var group = this[j], i = -1, n = group.length; ++i < n;) {
          if (node = group[i]) d3_transitionNode(node, i, ns, id, transition);
          subgroup.push(node);
        }
      }
      return d3_transition(subgroups, ns, id);
    };
    d3_selectionPrototype.interrupt = function (name) {
      return this.each(name == null ? d3_selection_interrupt : d3_selection_interruptNS(d3_transitionNamespace(name)));
    };
    var d3_selection_interrupt = d3_selection_interruptNS(d3_transitionNamespace());
    function d3_selection_interruptNS(ns) {
      return function () {
        var lock, activeId, active;
        if ((lock = this[ns]) && (active = lock[activeId = lock.active])) {
          active.timer.c = null;
          active.timer.t = NaN;
          if (--lock.count) delete lock[activeId];else delete this[ns];
          lock.active += .5;
          active.event && active.event.interrupt.call(this, this.__data__, active.index);
        }
      };
    }
    function d3_transition(groups, ns, id) {
      d3_subclass(groups, d3_transitionPrototype);
      groups.namespace = ns;
      groups.id = id;
      return groups;
    }
    var d3_transitionPrototype = [],
        d3_transitionId = 0,
        d3_transitionInheritId,
        d3_transitionInherit;
    d3_transitionPrototype.call = d3_selectionPrototype.call;
    d3_transitionPrototype.empty = d3_selectionPrototype.empty;
    d3_transitionPrototype.node = d3_selectionPrototype.node;
    d3_transitionPrototype.size = d3_selectionPrototype.size;
    d3.transition = function (selection, name) {
      return selection && selection.transition ? d3_transitionInheritId ? selection.transition(name) : selection : d3.selection().transition(selection);
    };
    d3.transition.prototype = d3_transitionPrototype;
    d3_transitionPrototype.select = function (selector) {
      var id = this.id,
          ns = this.namespace,
          subgroups = [],
          subgroup,
          subnode,
          node;
      selector = d3_selection_selector(selector);
      for (var j = -1, m = this.length; ++j < m;) {
        subgroups.push(subgroup = []);
        for (var group = this[j], i = -1, n = group.length; ++i < n;) {
          if ((node = group[i]) && (subnode = selector.call(node, node.__data__, i, j))) {
            if ("__data__" in node) subnode.__data__ = node.__data__;
            d3_transitionNode(subnode, i, ns, id, node[ns][id]);
            subgroup.push(subnode);
          } else {
            subgroup.push(null);
          }
        }
      }
      return d3_transition(subgroups, ns, id);
    };
    d3_transitionPrototype.selectAll = function (selector) {
      var id = this.id,
          ns = this.namespace,
          subgroups = [],
          subgroup,
          subnodes,
          node,
          subnode,
          transition;
      selector = d3_selection_selectorAll(selector);
      for (var j = -1, m = this.length; ++j < m;) {
        for (var group = this[j], i = -1, n = group.length; ++i < n;) {
          if (node = group[i]) {
            transition = node[ns][id];
            subnodes = selector.call(node, node.__data__, i, j);
            subgroups.push(subgroup = []);
            for (var k = -1, o = subnodes.length; ++k < o;) {
              if (subnode = subnodes[k]) d3_transitionNode(subnode, k, ns, id, transition);
              subgroup.push(subnode);
            }
          }
        }
      }
      return d3_transition(subgroups, ns, id);
    };
    d3_transitionPrototype.filter = function (filter) {
      var subgroups = [],
          subgroup,
          group,
          node;
      if (typeof filter !== "function") filter = d3_selection_filter(filter);
      for (var j = 0, m = this.length; j < m; j++) {
        subgroups.push(subgroup = []);
        for (var group = this[j], i = 0, n = group.length; i < n; i++) {
          if ((node = group[i]) && filter.call(node, node.__data__, i, j)) {
            subgroup.push(node);
          }
        }
      }
      return d3_transition(subgroups, this.namespace, this.id);
    };
    d3_transitionPrototype.tween = function (name, tween) {
      var id = this.id,
          ns = this.namespace;
      if (arguments.length < 2) return this.node()[ns][id].tween.get(name);
      return d3_selection_each(this, tween == null ? function (node) {
        node[ns][id].tween.remove(name);
      } : function (node) {
        node[ns][id].tween.set(name, tween);
      });
    };
    function d3_transition_tween(groups, name, value, tween) {
      var id = groups.id,
          ns = groups.namespace;
      return d3_selection_each(groups, typeof value === "function" ? function (node, i, j) {
        node[ns][id].tween.set(name, tween(value.call(node, node.__data__, i, j)));
      } : (value = tween(value), function (node) {
        node[ns][id].tween.set(name, value);
      }));
    }
    d3_transitionPrototype.attr = function (nameNS, value) {
      if (arguments.length < 2) {
        for (value in nameNS) {
          this.attr(value, nameNS[value]);
        }return this;
      }
      var interpolate = nameNS == "transform" ? d3_interpolateTransform : d3_interpolate,
          name = d3.ns.qualify(nameNS);
      function attrNull() {
        this.removeAttribute(name);
      }
      function attrNullNS() {
        this.removeAttributeNS(name.space, name.local);
      }
      function attrTween(b) {
        return b == null ? attrNull : (b += "", function () {
          var a = this.getAttribute(name),
              i;
          return a !== b && (i = interpolate(a, b), function (t) {
            this.setAttribute(name, i(t));
          });
        });
      }
      function attrTweenNS(b) {
        return b == null ? attrNullNS : (b += "", function () {
          var a = this.getAttributeNS(name.space, name.local),
              i;
          return a !== b && (i = interpolate(a, b), function (t) {
            this.setAttributeNS(name.space, name.local, i(t));
          });
        });
      }
      return d3_transition_tween(this, "attr." + nameNS, value, name.local ? attrTweenNS : attrTween);
    };
    d3_transitionPrototype.attrTween = function (nameNS, tween) {
      var name = d3.ns.qualify(nameNS);
      function attrTween(d, i) {
        var f = tween.call(this, d, i, this.getAttribute(name));
        return f && function (t) {
          this.setAttribute(name, f(t));
        };
      }
      function attrTweenNS(d, i) {
        var f = tween.call(this, d, i, this.getAttributeNS(name.space, name.local));
        return f && function (t) {
          this.setAttributeNS(name.space, name.local, f(t));
        };
      }
      return this.tween("attr." + nameNS, name.local ? attrTweenNS : attrTween);
    };
    d3_transitionPrototype.style = function (name, value, priority) {
      var n = arguments.length;
      if (n < 3) {
        if (typeof name !== "string") {
          if (n < 2) value = "";
          for (priority in name) {
            this.style(priority, name[priority], value);
          }return this;
        }
        priority = "";
      }
      function styleNull() {
        this.style.removeProperty(name);
      }
      function styleString(b) {
        return b == null ? styleNull : (b += "", function () {
          var a = d3_window(this).getComputedStyle(this, null).getPropertyValue(name),
              i;
          return a !== b && (i = d3_interpolate(a, b), function (t) {
            this.style.setProperty(name, i(t), priority);
          });
        });
      }
      return d3_transition_tween(this, "style." + name, value, styleString);
    };
    d3_transitionPrototype.styleTween = function (name, tween, priority) {
      if (arguments.length < 3) priority = "";
      function styleTween(d, i) {
        var f = tween.call(this, d, i, d3_window(this).getComputedStyle(this, null).getPropertyValue(name));
        return f && function (t) {
          this.style.setProperty(name, f(t), priority);
        };
      }
      return this.tween("style." + name, styleTween);
    };
    d3_transitionPrototype.text = function (value) {
      return d3_transition_tween(this, "text", value, d3_transition_text);
    };
    function d3_transition_text(b) {
      if (b == null) b = "";
      return function () {
        this.textContent = b;
      };
    }
    d3_transitionPrototype.remove = function () {
      var ns = this.namespace;
      return this.each("end.transition", function () {
        var p;
        if (this[ns].count < 2 && (p = this.parentNode)) p.removeChild(this);
      });
    };
    d3_transitionPrototype.ease = function (value) {
      var id = this.id,
          ns = this.namespace;
      if (arguments.length < 1) return this.node()[ns][id].ease;
      if (typeof value !== "function") value = d3.ease.apply(d3, arguments);
      return d3_selection_each(this, function (node) {
        node[ns][id].ease = value;
      });
    };
    d3_transitionPrototype.delay = function (value) {
      var id = this.id,
          ns = this.namespace;
      if (arguments.length < 1) return this.node()[ns][id].delay;
      return d3_selection_each(this, typeof value === "function" ? function (node, i, j) {
        node[ns][id].delay = +value.call(node, node.__data__, i, j);
      } : (value = +value, function (node) {
        node[ns][id].delay = value;
      }));
    };
    d3_transitionPrototype.duration = function (value) {
      var id = this.id,
          ns = this.namespace;
      if (arguments.length < 1) return this.node()[ns][id].duration;
      return d3_selection_each(this, typeof value === "function" ? function (node, i, j) {
        node[ns][id].duration = Math.max(1, value.call(node, node.__data__, i, j));
      } : (value = Math.max(1, value), function (node) {
        node[ns][id].duration = value;
      }));
    };
    d3_transitionPrototype.each = function (type, listener) {
      var id = this.id,
          ns = this.namespace;
      if (arguments.length < 2) {
        var inherit = d3_transitionInherit,
            inheritId = d3_transitionInheritId;
        try {
          d3_transitionInheritId = id;
          d3_selection_each(this, function (node, i, j) {
            d3_transitionInherit = node[ns][id];
            type.call(node, node.__data__, i, j);
          });
        } finally {
          d3_transitionInherit = inherit;
          d3_transitionInheritId = inheritId;
        }
      } else {
        d3_selection_each(this, function (node) {
          var transition = node[ns][id];
          (transition.event || (transition.event = d3.dispatch("start", "end", "interrupt"))).on(type, listener);
        });
      }
      return this;
    };
    d3_transitionPrototype.transition = function () {
      var id0 = this.id,
          id1 = ++d3_transitionId,
          ns = this.namespace,
          subgroups = [],
          subgroup,
          group,
          node,
          transition;
      for (var j = 0, m = this.length; j < m; j++) {
        subgroups.push(subgroup = []);
        for (var group = this[j], i = 0, n = group.length; i < n; i++) {
          if (node = group[i]) {
            transition = node[ns][id0];
            d3_transitionNode(node, i, ns, id1, {
              time: transition.time,
              ease: transition.ease,
              delay: transition.delay + transition.duration,
              duration: transition.duration
            });
          }
          subgroup.push(node);
        }
      }
      return d3_transition(subgroups, ns, id1);
    };
    function d3_transitionNamespace(name) {
      return name == null ? "__transition__" : "__transition_" + name + "__";
    }
    function d3_transitionNode(node, i, ns, id, inherit) {
      var lock = node[ns] || (node[ns] = {
        active: 0,
        count: 0
      }),
          transition = lock[id],
          time,
          timer,
          duration,
          ease,
          tweens;
      function schedule(elapsed) {
        var delay = transition.delay;
        timer.t = delay + time;
        if (delay <= elapsed) return start(elapsed - delay);
        timer.c = start;
      }
      function start(elapsed) {
        var activeId = lock.active,
            active = lock[activeId];
        if (active) {
          active.timer.c = null;
          active.timer.t = NaN;
          --lock.count;
          delete lock[activeId];
          active.event && active.event.interrupt.call(node, node.__data__, active.index);
        }
        for (var cancelId in lock) {
          if (+cancelId < id) {
            var cancel = lock[cancelId];
            cancel.timer.c = null;
            cancel.timer.t = NaN;
            --lock.count;
            delete lock[cancelId];
          }
        }
        timer.c = tick;
        d3_timer(function () {
          if (timer.c && tick(elapsed || 1)) {
            timer.c = null;
            timer.t = NaN;
          }
          return 1;
        }, 0, time);
        lock.active = id;
        transition.event && transition.event.start.call(node, node.__data__, i);
        tweens = [];
        transition.tween.forEach(function (key, value) {
          if (value = value.call(node, node.__data__, i)) {
            tweens.push(value);
          }
        });
        ease = transition.ease;
        duration = transition.duration;
      }
      function tick(elapsed) {
        var t = elapsed / duration,
            e = ease(t),
            n = tweens.length;
        while (n > 0) {
          tweens[--n].call(node, e);
        }
        if (t >= 1) {
          transition.event && transition.event.end.call(node, node.__data__, i);
          if (--lock.count) delete lock[id];else delete node[ns];
          return 1;
        }
      }
      if (!transition) {
        time = inherit.time;
        timer = d3_timer(schedule, 0, time);
        transition = lock[id] = {
          tween: new d3_Map(),
          time: time,
          timer: timer,
          delay: inherit.delay,
          duration: inherit.duration,
          ease: inherit.ease,
          index: i
        };
        inherit = null;
        ++lock.count;
      }
    }
    d3.svg.axis = function () {
      var scale = d3.scale.linear(),
          orient = d3_svg_axisDefaultOrient,
          innerTickSize = 6,
          outerTickSize = 6,
          tickPadding = 3,
          tickArguments_ = [10],
          tickValues = null,
          tickFormat_;
      function axis(g) {
        g.each(function () {
          var g = d3.select(this);
          var scale0 = this.__chart__ || scale,
              scale1 = this.__chart__ = scale.copy();
          var ticks = tickValues == null ? scale1.ticks ? scale1.ticks.apply(scale1, tickArguments_) : scale1.domain() : tickValues,
              tickFormat = tickFormat_ == null ? scale1.tickFormat ? scale1.tickFormat.apply(scale1, tickArguments_) : d3_identity : tickFormat_,
              tick = g.selectAll(".tick").data(ticks, scale1),
              tickEnter = tick.enter().insert("g", ".domain").attr("class", "tick").style("opacity", ε),
              tickExit = d3.transition(tick.exit()).style("opacity", ε).remove(),
              tickUpdate = d3.transition(tick.order()).style("opacity", 1),
              tickSpacing = Math.max(innerTickSize, 0) + tickPadding,
              tickTransform;
          var range = d3_scaleRange(scale1),
              path = g.selectAll(".domain").data([0]),
              pathUpdate = (path.enter().append("path").attr("class", "domain"), d3.transition(path));
          tickEnter.append("line");
          tickEnter.append("text");
          var lineEnter = tickEnter.select("line"),
              lineUpdate = tickUpdate.select("line"),
              text = tick.select("text").text(tickFormat),
              textEnter = tickEnter.select("text"),
              textUpdate = tickUpdate.select("text"),
              sign = orient === "top" || orient === "left" ? -1 : 1,
              x1,
              x2,
              y1,
              y2;
          if (orient === "bottom" || orient === "top") {
            tickTransform = d3_svg_axisX, x1 = "x", y1 = "y", x2 = "x2", y2 = "y2";
            text.attr("dy", sign < 0 ? "0em" : ".71em").style("text-anchor", "middle");
            pathUpdate.attr("d", "M" + range[0] + "," + sign * outerTickSize + "V0H" + range[1] + "V" + sign * outerTickSize);
          } else {
            tickTransform = d3_svg_axisY, x1 = "y", y1 = "x", x2 = "y2", y2 = "x2";
            text.attr("dy", ".32em").style("text-anchor", sign < 0 ? "end" : "start");
            pathUpdate.attr("d", "M" + sign * outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + sign * outerTickSize);
          }
          lineEnter.attr(y2, sign * innerTickSize);
          textEnter.attr(y1, sign * tickSpacing);
          lineUpdate.attr(x2, 0).attr(y2, sign * innerTickSize);
          textUpdate.attr(x1, 0).attr(y1, sign * tickSpacing);
          if (scale1.rangeBand) {
            var x = scale1,
                dx = x.rangeBand() / 2;
            scale0 = scale1 = function scale1(d) {
              return x(d) + dx;
            };
          } else if (scale0.rangeBand) {
            scale0 = scale1;
          } else {
            tickExit.call(tickTransform, scale1, scale0);
          }
          tickEnter.call(tickTransform, scale0, scale1);
          tickUpdate.call(tickTransform, scale1, scale1);
        });
      }
      axis.scale = function (x) {
        if (!arguments.length) return scale;
        scale = x;
        return axis;
      };
      axis.orient = function (x) {
        if (!arguments.length) return orient;
        orient = x in d3_svg_axisOrients ? x + "" : d3_svg_axisDefaultOrient;
        return axis;
      };
      axis.ticks = function () {
        if (!arguments.length) return tickArguments_;
        tickArguments_ = d3_array(arguments);
        return axis;
      };
      axis.tickValues = function (x) {
        if (!arguments.length) return tickValues;
        tickValues = x;
        return axis;
      };
      axis.tickFormat = function (x) {
        if (!arguments.length) return tickFormat_;
        tickFormat_ = x;
        return axis;
      };
      axis.tickSize = function (x) {
        var n = arguments.length;
        if (!n) return innerTickSize;
        innerTickSize = +x;
        outerTickSize = +arguments[n - 1];
        return axis;
      };
      axis.innerTickSize = function (x) {
        if (!arguments.length) return innerTickSize;
        innerTickSize = +x;
        return axis;
      };
      axis.outerTickSize = function (x) {
        if (!arguments.length) return outerTickSize;
        outerTickSize = +x;
        return axis;
      };
      axis.tickPadding = function (x) {
        if (!arguments.length) return tickPadding;
        tickPadding = +x;
        return axis;
      };
      axis.tickSubdivide = function () {
        return arguments.length && axis;
      };
      return axis;
    };
    var d3_svg_axisDefaultOrient = "bottom",
        d3_svg_axisOrients = {
      top: 1,
      right: 1,
      bottom: 1,
      left: 1
    };
    function d3_svg_axisX(selection, x0, x1) {
      selection.attr("transform", function (d) {
        var v0 = x0(d);
        return "translate(" + (isFinite(v0) ? v0 : x1(d)) + ",0)";
      });
    }
    function d3_svg_axisY(selection, y0, y1) {
      selection.attr("transform", function (d) {
        var v0 = y0(d);
        return "translate(0," + (isFinite(v0) ? v0 : y1(d)) + ")";
      });
    }
    d3.svg.brush = function () {
      var event = d3_eventDispatch(brush, "brushstart", "brush", "brushend"),
          x = null,
          y = null,
          xExtent = [0, 0],
          yExtent = [0, 0],
          xExtentDomain,
          yExtentDomain,
          xClamp = true,
          yClamp = true,
          resizes = d3_svg_brushResizes[0];
      function brush(g) {
        g.each(function () {
          var g = d3.select(this).style("pointer-events", "all").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)").on("mousedown.brush", brushstart).on("touchstart.brush", brushstart);
          var background = g.selectAll(".background").data([0]);
          background.enter().append("rect").attr("class", "background").style("visibility", "hidden").style("cursor", "crosshair");
          g.selectAll(".extent").data([0]).enter().append("rect").attr("class", "extent").style("cursor", "move");
          var resize = g.selectAll(".resize").data(resizes, d3_identity);
          resize.exit().remove();
          resize.enter().append("g").attr("class", function (d) {
            return "resize " + d;
          }).style("cursor", function (d) {
            return d3_svg_brushCursor[d];
          }).append("rect").attr("x", function (d) {
            return (/[ew]$/.test(d) ? -3 : null
            );
          }).attr("y", function (d) {
            return (/^[ns]/.test(d) ? -3 : null
            );
          }).attr("width", 6).attr("height", 6).style("visibility", "hidden");
          resize.style("display", brush.empty() ? "none" : null);
          var gUpdate = d3.transition(g),
              backgroundUpdate = d3.transition(background),
              range;
          if (x) {
            range = d3_scaleRange(x);
            backgroundUpdate.attr("x", range[0]).attr("width", range[1] - range[0]);
            redrawX(gUpdate);
          }
          if (y) {
            range = d3_scaleRange(y);
            backgroundUpdate.attr("y", range[0]).attr("height", range[1] - range[0]);
            redrawY(gUpdate);
          }
          redraw(gUpdate);
        });
      }
      brush.event = function (g) {
        g.each(function () {
          var event_ = event.of(this, arguments),
              extent1 = {
            x: xExtent,
            y: yExtent,
            i: xExtentDomain,
            j: yExtentDomain
          },
              extent0 = this.__chart__ || extent1;
          this.__chart__ = extent1;
          if (d3_transitionInheritId) {
            d3.select(this).transition().each("start.brush", function () {
              xExtentDomain = extent0.i;
              yExtentDomain = extent0.j;
              xExtent = extent0.x;
              yExtent = extent0.y;
              event_({
                type: "brushstart"
              });
            }).tween("brush:brush", function () {
              var xi = d3_interpolateArray(xExtent, extent1.x),
                  yi = d3_interpolateArray(yExtent, extent1.y);
              xExtentDomain = yExtentDomain = null;
              return function (t) {
                xExtent = extent1.x = xi(t);
                yExtent = extent1.y = yi(t);
                event_({
                  type: "brush",
                  mode: "resize"
                });
              };
            }).each("end.brush", function () {
              xExtentDomain = extent1.i;
              yExtentDomain = extent1.j;
              event_({
                type: "brush",
                mode: "resize"
              });
              event_({
                type: "brushend"
              });
            });
          } else {
            event_({
              type: "brushstart"
            });
            event_({
              type: "brush",
              mode: "resize"
            });
            event_({
              type: "brushend"
            });
          }
        });
      };
      function redraw(g) {
        g.selectAll(".resize").attr("transform", function (d) {
          return "translate(" + xExtent[+/e$/.test(d)] + "," + yExtent[+/^s/.test(d)] + ")";
        });
      }
      function redrawX(g) {
        g.select(".extent").attr("x", xExtent[0]);
        g.selectAll(".extent,.n>rect,.s>rect").attr("width", xExtent[1] - xExtent[0]);
      }
      function redrawY(g) {
        g.select(".extent").attr("y", yExtent[0]);
        g.selectAll(".extent,.e>rect,.w>rect").attr("height", yExtent[1] - yExtent[0]);
      }
      function brushstart() {
        var target = this,
            eventTarget = d3.select(d3.event.target),
            event_ = event.of(target, arguments),
            g = d3.select(target),
            resizing = eventTarget.datum(),
            resizingX = !/^(n|s)$/.test(resizing) && x,
            resizingY = !/^(e|w)$/.test(resizing) && y,
            dragging = eventTarget.classed("extent"),
            dragRestore = d3_event_dragSuppress(target),
            center,
            origin = d3.mouse(target),
            offset;
        var w = d3.select(d3_window(target)).on("keydown.brush", keydown).on("keyup.brush", keyup);
        if (d3.event.changedTouches) {
          w.on("touchmove.brush", brushmove).on("touchend.brush", brushend);
        } else {
          w.on("mousemove.brush", brushmove).on("mouseup.brush", brushend);
        }
        g.interrupt().selectAll("*").interrupt();
        if (dragging) {
          origin[0] = xExtent[0] - origin[0];
          origin[1] = yExtent[0] - origin[1];
        } else if (resizing) {
          var ex = +/w$/.test(resizing),
              ey = +/^n/.test(resizing);
          offset = [xExtent[1 - ex] - origin[0], yExtent[1 - ey] - origin[1]];
          origin[0] = xExtent[ex];
          origin[1] = yExtent[ey];
        } else if (d3.event.altKey) center = origin.slice();
        g.style("pointer-events", "none").selectAll(".resize").style("display", null);
        d3.select("body").style("cursor", eventTarget.style("cursor"));
        event_({
          type: "brushstart"
        });
        brushmove();
        function keydown() {
          if (d3.event.keyCode == 32) {
            if (!dragging) {
              center = null;
              origin[0] -= xExtent[1];
              origin[1] -= yExtent[1];
              dragging = 2;
            }
            d3_eventPreventDefault();
          }
        }
        function keyup() {
          if (d3.event.keyCode == 32 && dragging == 2) {
            origin[0] += xExtent[1];
            origin[1] += yExtent[1];
            dragging = 0;
            d3_eventPreventDefault();
          }
        }
        function brushmove() {
          var point = d3.mouse(target),
              moved = false;
          if (offset) {
            point[0] += offset[0];
            point[1] += offset[1];
          }
          if (!dragging) {
            if (d3.event.altKey) {
              if (!center) center = [(xExtent[0] + xExtent[1]) / 2, (yExtent[0] + yExtent[1]) / 2];
              origin[0] = xExtent[+(point[0] < center[0])];
              origin[1] = yExtent[+(point[1] < center[1])];
            } else center = null;
          }
          if (resizingX && move1(point, x, 0)) {
            redrawX(g);
            moved = true;
          }
          if (resizingY && move1(point, y, 1)) {
            redrawY(g);
            moved = true;
          }
          if (moved) {
            redraw(g);
            event_({
              type: "brush",
              mode: dragging ? "move" : "resize"
            });
          }
        }
        function move1(point, scale, i) {
          var range = d3_scaleRange(scale),
              r0 = range[0],
              r1 = range[1],
              position = origin[i],
              extent = i ? yExtent : xExtent,
              size = extent[1] - extent[0],
              min,
              max;
          if (dragging) {
            r0 -= position;
            r1 -= size + position;
          }
          min = (i ? yClamp : xClamp) ? Math.max(r0, Math.min(r1, point[i])) : point[i];
          if (dragging) {
            max = (min += position) + size;
          } else {
            if (center) position = Math.max(r0, Math.min(r1, 2 * center[i] - min));
            if (position < min) {
              max = min;
              min = position;
            } else {
              max = position;
            }
          }
          if (extent[0] != min || extent[1] != max) {
            if (i) yExtentDomain = null;else xExtentDomain = null;
            extent[0] = min;
            extent[1] = max;
            return true;
          }
        }
        function brushend() {
          brushmove();
          g.style("pointer-events", "all").selectAll(".resize").style("display", brush.empty() ? "none" : null);
          d3.select("body").style("cursor", null);
          w.on("mousemove.brush", null).on("mouseup.brush", null).on("touchmove.brush", null).on("touchend.brush", null).on("keydown.brush", null).on("keyup.brush", null);
          dragRestore();
          event_({
            type: "brushend"
          });
        }
      }
      brush.x = function (z) {
        if (!arguments.length) return x;
        x = z;
        resizes = d3_svg_brushResizes[!x << 1 | !y];
        return brush;
      };
      brush.y = function (z) {
        if (!arguments.length) return y;
        y = z;
        resizes = d3_svg_brushResizes[!x << 1 | !y];
        return brush;
      };
      brush.clamp = function (z) {
        if (!arguments.length) return x && y ? [xClamp, yClamp] : x ? xClamp : y ? yClamp : null;
        if (x && y) xClamp = !!z[0], yClamp = !!z[1];else if (x) xClamp = !!z;else if (y) yClamp = !!z;
        return brush;
      };
      brush.extent = function (z) {
        var x0, x1, y0, y1, t;
        if (!arguments.length) {
          if (x) {
            if (xExtentDomain) {
              x0 = xExtentDomain[0], x1 = xExtentDomain[1];
            } else {
              x0 = xExtent[0], x1 = xExtent[1];
              if (x.invert) x0 = x.invert(x0), x1 = x.invert(x1);
              if (x1 < x0) t = x0, x0 = x1, x1 = t;
            }
          }
          if (y) {
            if (yExtentDomain) {
              y0 = yExtentDomain[0], y1 = yExtentDomain[1];
            } else {
              y0 = yExtent[0], y1 = yExtent[1];
              if (y.invert) y0 = y.invert(y0), y1 = y.invert(y1);
              if (y1 < y0) t = y0, y0 = y1, y1 = t;
            }
          }
          return x && y ? [[x0, y0], [x1, y1]] : x ? [x0, x1] : y && [y0, y1];
        }
        if (x) {
          x0 = z[0], x1 = z[1];
          if (y) x0 = x0[0], x1 = x1[0];
          xExtentDomain = [x0, x1];
          if (x.invert) x0 = x(x0), x1 = x(x1);
          if (x1 < x0) t = x0, x0 = x1, x1 = t;
          if (x0 != xExtent[0] || x1 != xExtent[1]) xExtent = [x0, x1];
        }
        if (y) {
          y0 = z[0], y1 = z[1];
          if (x) y0 = y0[1], y1 = y1[1];
          yExtentDomain = [y0, y1];
          if (y.invert) y0 = y(y0), y1 = y(y1);
          if (y1 < y0) t = y0, y0 = y1, y1 = t;
          if (y0 != yExtent[0] || y1 != yExtent[1]) yExtent = [y0, y1];
        }
        return brush;
      };
      brush.clear = function () {
        if (!brush.empty()) {
          xExtent = [0, 0], yExtent = [0, 0];
          xExtentDomain = yExtentDomain = null;
        }
        return brush;
      };
      brush.empty = function () {
        return !!x && xExtent[0] == xExtent[1] || !!y && yExtent[0] == yExtent[1];
      };
      return d3.rebind(brush, event, "on");
    };
    var d3_svg_brushCursor = {
      n: "ns-resize",
      e: "ew-resize",
      s: "ns-resize",
      w: "ew-resize",
      nw: "nwse-resize",
      ne: "nesw-resize",
      se: "nwse-resize",
      sw: "nesw-resize"
    };
    var d3_svg_brushResizes = [["n", "e", "s", "w", "nw", "ne", "se", "sw"], ["e", "w"], ["n", "s"], []];
    var d3_time_format = d3_time.format = d3_locale_enUS.timeFormat;
    var d3_time_formatUtc = d3_time_format.utc;
    var d3_time_formatIso = d3_time_formatUtc("%Y-%m-%dT%H:%M:%S.%LZ");
    d3_time_format.iso = Date.prototype.toISOString && +new Date("2000-01-01T00:00:00.000Z") ? d3_time_formatIsoNative : d3_time_formatIso;
    function d3_time_formatIsoNative(date) {
      return date.toISOString();
    }
    d3_time_formatIsoNative.parse = function (string) {
      var date = new Date(string);
      return isNaN(date) ? null : date;
    };
    d3_time_formatIsoNative.toString = d3_time_formatIso.toString;
    d3_time.second = d3_time_interval(function (date) {
      return new d3_date(Math.floor(date / 1e3) * 1e3);
    }, function (date, offset) {
      date.setTime(date.getTime() + Math.floor(offset) * 1e3);
    }, function (date) {
      return date.getSeconds();
    });
    d3_time.seconds = d3_time.second.range;
    d3_time.seconds.utc = d3_time.second.utc.range;
    d3_time.minute = d3_time_interval(function (date) {
      return new d3_date(Math.floor(date / 6e4) * 6e4);
    }, function (date, offset) {
      date.setTime(date.getTime() + Math.floor(offset) * 6e4);
    }, function (date) {
      return date.getMinutes();
    });
    d3_time.minutes = d3_time.minute.range;
    d3_time.minutes.utc = d3_time.minute.utc.range;
    d3_time.hour = d3_time_interval(function (date) {
      var timezone = date.getTimezoneOffset() / 60;
      return new d3_date((Math.floor(date / 36e5 - timezone) + timezone) * 36e5);
    }, function (date, offset) {
      date.setTime(date.getTime() + Math.floor(offset) * 36e5);
    }, function (date) {
      return date.getHours();
    });
    d3_time.hours = d3_time.hour.range;
    d3_time.hours.utc = d3_time.hour.utc.range;
    d3_time.month = d3_time_interval(function (date) {
      date = d3_time.day(date);
      date.setDate(1);
      return date;
    }, function (date, offset) {
      date.setMonth(date.getMonth() + offset);
    }, function (date) {
      return date.getMonth();
    });
    d3_time.months = d3_time.month.range;
    d3_time.months.utc = d3_time.month.utc.range;
    function d3_time_scale(linear, methods, format) {
      function scale(x) {
        return linear(x);
      }
      scale.invert = function (x) {
        return d3_time_scaleDate(linear.invert(x));
      };
      scale.domain = function (x) {
        if (!arguments.length) return linear.domain().map(d3_time_scaleDate);
        linear.domain(x);
        return scale;
      };
      function tickMethod(extent, count) {
        var span = extent[1] - extent[0],
            target = span / count,
            i = d3.bisect(d3_time_scaleSteps, target);
        return i == d3_time_scaleSteps.length ? [methods.year, d3_scale_linearTickRange(extent.map(function (d) {
          return d / 31536e6;
        }), count)[2]] : !i ? [d3_time_scaleMilliseconds, d3_scale_linearTickRange(extent, count)[2]] : methods[target / d3_time_scaleSteps[i - 1] < d3_time_scaleSteps[i] / target ? i - 1 : i];
      }
      scale.nice = function (interval, skip) {
        var domain = scale.domain(),
            extent = d3_scaleExtent(domain),
            method = interval == null ? tickMethod(extent, 10) : typeof interval === "number" && tickMethod(extent, interval);
        if (method) interval = method[0], skip = method[1];
        function skipped(date) {
          return !isNaN(date) && !interval.range(date, d3_time_scaleDate(+date + 1), skip).length;
        }
        return scale.domain(d3_scale_nice(domain, skip > 1 ? {
          floor: function floor(date) {
            while (skipped(date = interval.floor(date))) {
              date = d3_time_scaleDate(date - 1);
            }return date;
          },
          ceil: function ceil(date) {
            while (skipped(date = interval.ceil(date))) {
              date = d3_time_scaleDate(+date + 1);
            }return date;
          }
        } : interval));
      };
      scale.ticks = function (interval, skip) {
        var extent = d3_scaleExtent(scale.domain()),
            method = interval == null ? tickMethod(extent, 10) : typeof interval === "number" ? tickMethod(extent, interval) : !interval.range && [{
          range: interval
        }, skip];
        if (method) interval = method[0], skip = method[1];
        return interval.range(extent[0], d3_time_scaleDate(+extent[1] + 1), skip < 1 ? 1 : skip);
      };
      scale.tickFormat = function () {
        return format;
      };
      scale.copy = function () {
        return d3_time_scale(linear.copy(), methods, format);
      };
      return d3_scale_linearRebind(scale, linear);
    }
    function d3_time_scaleDate(t) {
      return new Date(t);
    }
    var d3_time_scaleSteps = [1e3, 5e3, 15e3, 3e4, 6e4, 3e5, 9e5, 18e5, 36e5, 108e5, 216e5, 432e5, 864e5, 1728e5, 6048e5, 2592e6, 7776e6, 31536e6];
    var d3_time_scaleLocalMethods = [[d3_time.second, 1], [d3_time.second, 5], [d3_time.second, 15], [d3_time.second, 30], [d3_time.minute, 1], [d3_time.minute, 5], [d3_time.minute, 15], [d3_time.minute, 30], [d3_time.hour, 1], [d3_time.hour, 3], [d3_time.hour, 6], [d3_time.hour, 12], [d3_time.day, 1], [d3_time.day, 2], [d3_time.week, 1], [d3_time.month, 1], [d3_time.month, 3], [d3_time.year, 1]];
    var d3_time_scaleLocalFormat = d3_time_format.multi([[".%L", function (d) {
      return d.getMilliseconds();
    }], [":%S", function (d) {
      return d.getSeconds();
    }], ["%I:%M", function (d) {
      return d.getMinutes();
    }], ["%I %p", function (d) {
      return d.getHours();
    }], ["%a %d", function (d) {
      return d.getDay() && d.getDate() != 1;
    }], ["%b %d", function (d) {
      return d.getDate() != 1;
    }], ["%B", function (d) {
      return d.getMonth();
    }], ["%Y", d3_true]]);
    var d3_time_scaleMilliseconds = {
      range: function range(start, stop, step) {
        return d3.range(Math.ceil(start / step) * step, +stop, step).map(d3_time_scaleDate);
      },
      floor: d3_identity,
      ceil: d3_identity
    };
    d3_time_scaleLocalMethods.year = d3_time.year;
    d3_time.scale = function () {
      return d3_time_scale(d3.scale.linear(), d3_time_scaleLocalMethods, d3_time_scaleLocalFormat);
    };
    var d3_time_scaleUtcMethods = d3_time_scaleLocalMethods.map(function (m) {
      return [m[0].utc, m[1]];
    });
    var d3_time_scaleUtcFormat = d3_time_formatUtc.multi([[".%L", function (d) {
      return d.getUTCMilliseconds();
    }], [":%S", function (d) {
      return d.getUTCSeconds();
    }], ["%I:%M", function (d) {
      return d.getUTCMinutes();
    }], ["%I %p", function (d) {
      return d.getUTCHours();
    }], ["%a %d", function (d) {
      return d.getUTCDay() && d.getUTCDate() != 1;
    }], ["%b %d", function (d) {
      return d.getUTCDate() != 1;
    }], ["%B", function (d) {
      return d.getUTCMonth();
    }], ["%Y", d3_true]]);
    d3_time_scaleUtcMethods.year = d3_time.year.utc;
    d3_time.scale.utc = function () {
      return d3_time_scale(d3.scale.linear(), d3_time_scaleUtcMethods, d3_time_scaleUtcFormat);
    };
    d3.text = d3_xhrType(function (request) {
      return request.responseText;
    });
    d3.json = function (url, callback) {
      return d3_xhr(url, "application/json", d3_json, callback);
    };
    function d3_json(request) {
      return JSON.parse(request.responseText);
    }
    d3.html = function (url, callback) {
      return d3_xhr(url, "text/html", d3_html, callback);
    };
    function d3_html(request) {
      var range = d3_document.createRange();
      range.selectNode(d3_document.body);
      return range.createContextualFragment(request.responseText);
    }
    d3.xml = d3_xhrType(function (request) {
      return request.responseXML;
    });
    if (typeof undefined === "function" && undefined.amd) this.d3 = d3, undefined(d3);else if ('object' === "object" && module.exports) module.exports = d3;else this.d3 = d3;
  }();
});

function prepData(dd) {
  var p = [];
  d3$1.range(0, 24).map(function (t) {
    ["0", "20", "40"].map(function (m) {
      if (t < 10) p.push("0" + String(t) + String(m));else p.push(String(t) + String(m));
    });
  });
  var rolled = d3$1.nest().key(function (k) {
    return k.hour + k.minute;
  }).rollup(function (v) {
    return v.reduce(function (p, c) {
      p.articles[c.url] = true;
      p.views += c.count;
      p.sessions += c.uniques;
      return p;
    }, { articles: {}, views: 0, sessions: 0 });
  }).entries(dd).map(function (x) {
    Object.keys(x.values).map(function (y) {
      x[y] = x.values[y];
    });
    x.article_count = Object.keys(x.articles).length;
    x.hour = x.key.slice(0, 2);
    x.minute = x.key.slice(2);
    x.value = x.article_count;
    x.key = p.indexOf(x.key);
    //delete x['articles']
    return x;
  });
  return rolled;
}
function buildSummary(urls, comparison) {
  var summary_data = buildSummaryData(urls),
      pop_summary_data = buildSummaryData(comparison);

  return buildSummaryAggregation(summary_data, pop_summary_data);
}

function buildSummaryData(data) {
  var reduced = data.reduce(function (p, c) {
    p.domains[c.domain] = true;
    p.articles[c.url] = true;
    p.views += c.count;
    p.sessions += c.uniques;

    return p;
  }, {
    domains: {},
    articles: {},
    sessions: 0,
    views: 0
  });

  reduced.domains = Object.keys(reduced.domains).length;
  reduced.articles = Object.keys(reduced.articles).length;

  return reduced;
}

function buildSummaryAggregation(samp, pop) {
  var data_summary = {};
  Object.keys(samp).map(function (k) {
    data_summary[k] = {
      sample: samp[k],
      population: pop[k]
    };
  });

  return data_summary;
}












// from data.js


function buildData(data, buckets, pop_categories) {

  var times = d3$1.nest().key(function (x) {
    return x.time_diff_bucket;
  }).map(data.filter(function (x) {
    return x.parent_category_name != "";
  }));

  var cats = d3$1.nest().key(function (x) {
    return x.parent_category_name;
  }).map(data.filter(function (x) {
    return x.parent_category_name != "";
  }));

  var time_categories = buckets.reduce(function (p, c) {
    p[c] = {};return p;
  }, {});
  var category_times = Object.keys(cats).reduce(function (p, c) {
    p[c] = {};return p;
  }, {});

  var categories = d3$1.nest().key(function (x) {
    return x.parent_category_name;
  }).key(function (x) {
    return x.time_diff_bucket;
  }).entries(data.filter(function (x) {
    return x.parent_category_name != "";
  })).map(function (row) {
    row.values.map(function (t) {
      t.percent = d3$1.sum(t.values, function (d) {
        return d.uniques;
      }) / d3$1.sum(times[t.key], function (d) {
        return d.uniques;
      });
      time_categories[t.key][row.key] = t.percent;
      category_times[row.key][t.key] = t.percent;
    });
    return row;
  }).sort(function (a, b) {
    return ((pop_categories[b.key] || {}).normalized_pop || 0) - ((pop_categories[a.key] || {}).normalized_pop || 0);
  });

  var time_normalize_scales = {};

  d3$1.entries(time_categories).map(function (trow) {
    var values = d3$1.entries(trow.value).map(function (x) {
      return x.value;
    });
    time_normalize_scales[trow.key] = d3$1.scale.linear().domain([d3$1.min(values), d3$1.max(values)]).range([0, 1]);
  });

  var cat_normalize_scales = {};

  d3$1.entries(category_times).map(function (trow) {
    var values = d3$1.entries(trow.value).map(function (x) {
      return x.value;
    });
    cat_normalize_scales[trow.key] = d3$1.scale.linear().domain([d3$1.min(values), d3$1.max(values)]).range([0, 1]);
  });

  categories.map(function (p) {
    var cat = p.key;
    p.values.map(function (q) {
      q.norm_cat = cat_normalize_scales[cat](q.percent);
      q.norm_time = time_normalize_scales[q.key](q.percent);

      q.score = 2 * q.norm_cat / 3 + q.norm_time / 3;
      q.score = q.norm_time;

      var percent_pop = pop_categories[cat] ? pop_categories[cat].percent_pop : 0;

      q.percent_diff = (q.percent - percent_pop) / percent_pop;
    });
  });

  return categories;
}

function prepareFilters(filters) {
  var mapping = {
    "Category": "parent_category_name",
    "Title": "url",
    "Time": "hour"
  };

  var filters = filters.filter(function (x) {
    return Object.keys(x).length && x.value;
  }).map(function (z) {
    return {
      "field": mapping[z.field],
      "op": z.op,
      "value": z.value
    };
  });

  return filters;
}

function autoSize(wrap, adjustWidth, adjustHeight) {

  function elementToWidth(elem) {

    var _w = wrap.node().offsetWidth || wrap.node().parentNode.offsetWidth || wrap.node().parentNode.parentNode.offsetWidth;
    var num = _w || wrap.style("width").split(".")[0].replace("px", "");
    return parseInt(num);
  }

  function elementToHeight(elem) {
    var num = wrap.style("height").split(".")[0].replace("px", "");
    return parseInt(num);
  }

  var w = elementToWidth(wrap) || 700,
      h = elementToHeight(wrap) || 340;

  w = adjustWidth(w);
  h = adjustHeight(h);

  var margin = { top: 10, right: 15, bottom: 10, left: 15 },
      width = w - margin.left - margin.right,
      height = h - margin.top - margin.bottom;

  return {
    margin: margin,
    width: width,
    height: height
  };
}

function compare(qs_state, _state) {

  var updates = {};

  comparison_eval(qs_state, _state, updates).accessor("selected_action", function (x, y) {
    return y.actions.filter(function (z) {
      return z.action_id == x.selected_action;
    })[0];
  }, function (x, y) {
    return y.selected_action;
  }).failure("selected_action", function (_new, _old, obj) {
    Object.assign(obj, {
      "loading": true,
      "selected_action": _new
    });
  }).accessor("tab_position", function (x, y) {
    return x.tab_position;
  }, function (_, y) {
    return y.tab_position;
  }).failure("tab_position", function (_new, _old, obj) {
    Object.assign(obj, { "tab_position": _new });
  }).accessor("transform", function (x, y) {
    return x.transform;
  }, function (_, y) {
    return y.transform;
  }).failure("transform", function (_new, _old, obj) {
    Object.assign(obj, { "transform": _new });
  }).accessor("sort", function (x, y) {
    return x.sort;
  }, function (_, y) {
    return y.sort;
  }).failure("sort", function (_new, _old, obj) {
    Object.assign(obj, { "sort": _new });
  }).accessor("ascending", function (x, y) {
    return x.ascending;
  }, function (_, y) {
    return y.ascending;
  }).failure("ascending", function (_new, _old, obj) {
    Object.assign(obj, { "ascending": _new });
  }).accessor("selected_view", function (x, y) {
    return x.selected_view;
  }, function (_, y) {
    return y.dashboard_options.filter(function (x) {
      return x.selected;
    })[0].value;
  }).failure("selected_view", function (_new, _old, obj) {
    // this should be redone so its not different like this
    Object.assign(obj, {
      "loading": true,
      "dashboard_options": JSON.parse(JSON.stringify(_state.dashboard_options)).map(function (x) {
        x.selected = x.value == _new;
        return x;
      })
    });
  }).accessor("selected_comparison", function (x, y) {
    return y.actions.filter(function (z) {
      return z.action_id == x.selected_comparison;
    })[0];
  }, function (x, y) {
    return y.selected_comparison;
  }).failure("selected_comparison", function (_new, _old, obj) {
    Object.assign(obj, {
      "loading": true,
      "selected_comparison": _new
    });
  }).equal("filters", function (x, y) {
    return JSON.stringify(x) == JSON.stringify(y);
  }).failure("filters", function (_new, _old, obj) {
    Object.assign(obj, {
      "loading": true,
      "filters": _new || [{}]
    });
  }).failure("action_date", function (_new, _old, obj) {
    Object.assign(obj, { loading: true, "action_date": _new });
  }).failure("comparison_date", function (_new, _old, obj) {
    Object.assign(obj, { loading: true, "comparison_date": _new });
  }).evaluate();

  var current = qs({}).to(_state.qs_state || {}),
      pop = qs({}).to(qs_state);

  if (Object.keys(updates).length && current != pop) {
    return updates;
  }

  return {};
}

function accessor$2(attr, val) {
  if (val === undefined) return this["_" + attr];
  this["_" + attr] = val;
  return this;
}





var ops = {
  "is in": function isIn(field, value) {
    return function (x) {
      var values = value.split(",");
      return values.reduce(function (p, value) {
        return p + String(x[field]).indexOf(String(value)) > -1;
      }, 0) > 0;
    };
  },
  "is not in": function isNotIn(field, value) {
    return function (x) {
      var values = value.split(",");
      return values.reduce(function (p, value) {
        return p + String(x[field]).indexOf(String(value)) > -1;
      }, 0) == 0;
    };
  }
};

function determineLogic(options) {
  var _default = options[0];
  var selected = options.filter(function (x) {
    return x.selected;
  });
  return selected.length > 0 ? selected[0] : _default;
}

function filterUrls(urls, logic, filters) {
  return filter_data(urls).op("is in", ops["is in"]).op("is not in", ops["is not in"]).logic(logic.value).by(filters);
}

function Select(target) {
  this._on = {};
  this.target = target;
}

function noop$6() {}
function identity$3(x) {
  return x;
}
function key$3(x) {
  return x.key;
}

function select(target) {
  return new Select(target);
}

Select.prototype = {
  options: function options(val) {
    return accessor$2.bind(this)("options", val);
  },
  draw: function draw() {
    var _this = this;

    this._select = d3_updateable(this.target, "select", "select", this._options);

    var bound = this.on("select").bind(this);

    this._select.on("change", function (x) {
      bound(this.selectedOptions[0].__data__);
    });

    this._options = d3_splat(this._select, "option", "option", identity$3, key$3).text(key$3).property("selected", function (x) {

      console.log(_this._selected, x.value);
      return x.value && x.value == _this._selected ? "selected" : x.selected == 1 ? "selected" : null;
    });

    return this;
  },
  selected: function selected(val) {
    return accessor$2.bind(this)("selected", val);
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$6;
    this._on[action] = fn;
    return this;
  }
};

function noop$5() {}
function buttonWrap(wrap) {
  var head = d3_updateable(wrap, "h3.buttons", "h3").classed("buttons", true).style("margin-bottom", "15px").style("margin-top", "-5px");

  var right_pull = d3_updateable(head, ".pull-right", "span").classed("pull-right header-buttons", true).style("margin-right", "17px").style("line-height", "22px").style("text-decoration", "none !important");

  return right_pull;
}

function expansionWrap(wrap) {
  return d3_updateable(wrap, "div.header-body", "div").style("font-size", "13px").style("text-transform", "none").style("color", "#333").style("font-weight", "normal").style("margin-left", "175px").style("padding", "25px").style("margin-bottom", "25px").style("margin-right", "175px").style("background-color", "white").classed("header-body hidden", true);
}

function headWrap(wrap) {
  return d3_updateable(wrap, "h3.data-header", "h3").classed("data-header", true).style("margin-bottom", "15px").style("margin-top", "-5px").style("font-weight", " bold").style("font-size", " 14px").style("line-height", " 22px").style("text-transform", " uppercase").style("color", " #888").style("letter-spacing", " .05em");
}

function Header(target) {
  this._on = {};
  this.target = target;

  var CSS_STRING = String(function () {/*
                                       .header-buttons a span.hover-show { display:none }
                                       .header-buttons a:hover span.hover-show { display:inline; padding-left:3px }
                                       */});
}

function header(target) {
  return new Header(target);
}

Header.prototype = {
  text: function text(val) {
    return accessor$2.bind(this)("text", val);
  },

  select_only: function select_only(val) {
    return accessor$2.bind(this)("select_only", val);
  },
  options: function options(val) {
    return accessor$2.bind(this)("options", val);
  },
  buttons: function buttons(val) {
    return accessor$2.bind(this)("buttons", val);
  },
  expansion: function expansion(val) {
    return accessor$2.bind(this)("expansion", val);
  },
  draw: function draw() {
    var _this = this;

    var wrap = d3_updateable(this.target, ".header-wrap", "div").classed("header-wrap", true);

    var expand_wrap = expansionWrap(wrap),
        button_wrap = buttonWrap(wrap),
        head_wrap = headWrap(wrap);

    if (this._select_only) {
      var bound = this.on("select").bind(this);

      var selectBox = select(head_wrap).options(this._options).on("select", function (x) {
        bound(x);
      }).draw();

      return;
    }

    d3_updateable(head_wrap, "span.title", "span").classed("title", true).text(this._text);

    if (this._options) {

      var bound = this.on("select").bind(this);

      var selectBox = select(head_wrap).options(this._options).on("select", function (x) {
        bound(x);
      }).draw();

      selectBox._select.style("width", "19px").style("margin-left", "12px");

      selectBox._options.style("color", "#888").style("min-width", "100px").style("text-align", "center").style("display", "inline-block").style("padding", "5px");
    }

    if (this._buttons) {

      var self = this;

      var a = d3_splat(button_wrap, "a", "a", this._buttons, function (x) {
        return x.text;
      }).style("vertical-align", "middle").style("font-size", "12px").style("font-weight", "bold").style("border-right", "1px solid #ccc").style("padding-right", "10px").style("padding-left", "10px").style("display", "inline-block").style("line-height", "22px").style("text-decoration", "none").html(function (x) {
        return "<span class='" + x.icon + "'></span><span style='padding-left:3px'>" + x.text + "</span>";
      }).attr("class", function (x) {
        return x.class;
      }).on("click", function (x) {
        return _this.on(x.class + ".click")(x);
      });
    }

    return this;
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$5;
    this._on[action] = fn;
    return this;
  }
};

__$styleInject(".table-wrapper tr { height:33px}\n.table-wrapper tr th { border-right:1px dotted #ccc } \n.table-wrapper tr th:last-of-type { border-right:none } \n\n.table-wrapper tr { border-bottom:1px solid #ddd }\n.table-wrapper tr th, .table-wrapper tr td { \n  padding-left:10px;\n  max-width:200px\n}\n\n.table-wrapper thead tr { \n  background-color:#e3ebf0;\n}\n.table-wrapper thead tr th .title { \n  text-transform:uppercase\n}\n.table-wrapper tbody tr { \n}\n.table-wrapper tbody tr:hover { \n  background-color:white;\n  background-color:#f9f9fb\n}\n", undefined);

function Table(target) {
  this._wrapper_class = "table-wrapper";
  this._target = target;
  this._data = {}; //EXAMPLE_DATA
  this._sort = {};
  this._renderers = {};
  this._top = 0;

  this._default_renderer = function (x) {
    if (x.key.indexOf("percent") > -1) return d3$1.select(this).text(function (x) {
      var pd = this.parentNode.__data__;
      return d3$1.format(".2%")(pd[x.key] / 100);
    });

    return d3$1.select(this).text(function (x) {
      var pd = this.parentNode.__data__;
      return pd[x.key] > 0 ? d3$1.format(",.2f")(pd[x.key]).replace(".00", "") : pd[x.key];
    });
  };

  this._hidden_fields = [];
  this._on = {};

  this._render_expand = function (d) {
    d3$1.select(this).selectAll("td.option-header").html("&ndash;");
    if (this.nextSibling && d3$1.select(this.nextSibling).classed("expanded") == true) {
      d3$1.select(this).selectAll("td.option-header").html("&#65291;");
      return d3$1.select(this.parentNode).selectAll(".expanded").remove();
    }

    d3$1.select(this.parentNode).selectAll(".expanded").remove();
    var t = document.createElement('tr');
    this.parentNode.insertBefore(t, this.nextSibling);

    var tr = d3$1.select(t).classed("expanded", true).datum({});
    var td = d3_updateable(tr, "td", "td").attr("colspan", this.children.length);

    return td;
  };
  this._render_header = function (wrap) {

    wrap.each(function (data) {
      var headers = d3_updateable(d3$1.select(this), ".headers", "div").classed("headers", true).style("text-transform", "uppercase").style("font-weight", "bold").style("line-height", "24px").style("border-bottom", "1px solid #ccc").style("margin-bottom", "10px");

      headers.html("");

      d3_updateable(headers, ".url", "div").classed("url", true).style("width", "75%").style("display", "inline-block").text("Article");

      d3_updateable(headers, ".count", "div").classed("count", true).style("width", "25%").style("display", "inline-block").text("Count");
    });
  };
  this._render_row = function (row) {

    d3_updateable(row, ".url", "div").classed("url", true).style("width", "75%").style("line-height", "24px").style("height", "24px").style("overflow", "hidden").style("display", "inline-block").text(function (x) {
      return x.key;
    });

    d3_updateable(row, ".count", "div").classed("count", true).style("width", "25%").style("display", "inline-block").style("vertical-align", "top").text(function (x) {
      return x.value;
    });
  };
}

function table$1(target) {
  return new Table(target);
}

Table.prototype = {

  data: function data(val) {
    var value = accessor.bind(this)("data", val);
    if (val && val.values.length && this._headers == undefined) {
      var headers = Object.keys(val.values[0]).map(function (x) {
        return { key: x, value: x };
      });
      this.headers(headers);
    }
    return value;
  },
  skip_option: function skip_option(val) {
    return accessor.bind(this)("skip_option", val);
  },
  wrapper_class: function wrapper_class(val) {
    return accessor.bind(this)("wrapper_class", val);
  },

  title: function title(val) {
    return accessor.bind(this)("title", val);
  },
  row: function row(val) {
    return accessor.bind(this)("render_row", val);
  },
  default_renderer: function default_renderer(val) {
    return accessor.bind(this)("default_renderer", val);
  },
  top: function top(val) {
    return accessor.bind(this)("top", val);
  },

  header: function header(val) {
    return accessor.bind(this)("render_header", val);
  },
  headers: function headers(val) {
    return accessor.bind(this)("headers", val);
  },
  hidden_fields: function hidden_fields(val) {
    return accessor.bind(this)("hidden_fields", val);
  },
  all_headers: function all_headers() {
    var headers = this.headers().reduce(function (p, c) {
      p[c.key] = c.value;return p;
    }, {}),
        is_locked = this.headers().filter(function (x) {
      return !!x.locked;
    }).map(function (x) {
      return x.key;
    });

    if (this._data.values && this._data.values.length) {

      var all_heads = Object.keys(this._data.values[0]).map(function (x) {
        if (this._hidden_fields && this._hidden_fields.indexOf(x) > -1) return false;
        return {
          key: x,
          value: headers[x] || x,
          selected: !!headers[x],
          locked: is_locked.indexOf(x) > -1 ? true : undefined
        };
      }.bind(this)).filter(function (x) {
        return x;
      });
      var getIndex = function getIndex(k) {
        return is_locked.indexOf(k) > -1 ? is_locked.indexOf(k) + 10 : 0;
      };

      all_heads = all_heads.sort(function (p, c) {
        return getIndex(c.key || -Infinity) - getIndex(p.key || -Infinity);
      });
      return all_heads;
    } else return this.headers();
  },
  sort: function sort(key$$1, ascending) {
    if (!key$$1) return this._sort;
    this._sort = {
      key: key$$1,
      value: !!ascending
    };
    return this;
  },

  render_wrapper: function render_wrapper() {
    var wrap = this._target;

    var wrapper = d3_updateable(wrap, "." + this._wrapper_class, "div").classed(this._wrapper_class, true).style("position", "relative");

    var table = d3_updateable(wrapper, "table.main", "table").classed("main", true).style("width", "100%");

    this._table_main = table;

    var thead = d3_updateable(table, "thead", "thead");
    d3_updateable(table, "tbody", "tbody");

    var table_fixed = d3_updateable(wrapper, "table.fixed", "table").classed("hidden", true) // TODO: make this visible when main is not in view
    .classed("fixed", true).style("width", wrapper.style("width")).style("top", this._top + "px").style("position", "fixed");

    var self = this;
    try {
      d3$1.select(window).on('scroll', function () {
        console.log(table.node().getBoundingClientRect().top, self._top);
        if (table.node().getBoundingClientRect().top < self._top) table_fixed.classed("hidden", false);else table_fixed.classed("hidden", true);

        var widths = [];

        wrap.selectAll(".main").selectAll(".table-headers").selectAll("th").each(function (x, i) {
          widths.push(this.offsetWidth);
        });

        wrap.selectAll(".fixed").selectAll(".table-headers").selectAll("th").each(function (x, i) {
          d3$1.select(this).style("width", widths[i] + "px");
        });
      });
    } catch (e) {}

    this._table_fixed = table_fixed;

    var thead = d3_updateable(table_fixed, "thead", "thead");

    if (!this._skip_option) {
      var table_button = d3_updateable(wrapper, ".table-option", "a").classed("table-option", true).style("position", "absolute").style("top", "-1px").style("right", "0px").style("cursor", "pointer").style("line-height", "33px").style("font-weight", "bold").style("padding-right", "8px").style("padding-left", "8px").text("OPTIONS").style("background", "#e3ebf0").on("click", function (x) {
        this._options_header.classed("hidden", !this._options_header.classed("hidden"));
        this._show_options = !this._options_header.classed("hidden");
      }.bind(this));
    }

    return wrapper;
  },
  render_header: function render_header(table) {

    var thead = table.selectAll("thead"),
        tbody = table.selectAll("tbody");

    if (this.headers() == undefined) return;

    var options_thead = d3_updateable(thead, "tr.table-options", "tr", this.all_headers(), function (x) {
      return 1;
    }).classed("hidden", !this._show_options).classed("table-options", true);

    var h = this._skip_option ? this.headers() : this.headers().concat([{ key: "spacer", width: "70px" }]);
    var headers_thead = d3_updateable(thead, "tr.table-headers", "tr", h, function (x) {
      return 1;
    }).classed("table-headers", true);

    var th = d3_splat(headers_thead, "th", "th", false, function (x, i) {
      return x.key + i;
    }).style("width", function (x) {
      return x.width;
    }).style("position", "relative").order();

    var defaultSort = function (x) {
      if (x.sort === false) {
        delete x['sort'];
        this._sort = {};
        this.draw();
      } else {
        x.sort = !!x.sort;

        this.sort(x.key, x.sort);
        this.draw();
      }
    }.bind(this);

    d3_updateable(th, "span", "span").classed("title", true).style("cursor", "pointer").text(function (x) {
      return x.value;
    }).on("click", this.on("sort") != noop$2 ? this.on("sort") : defaultSort);

    d3_updateable(th, "i", "i").style("padding-left", "5px").classed("fa", true).classed("fa-sort-asc", function (x) {
      return x.key == this._sort.key ? this._sort.value === true : undefined;
    }.bind(this)).classed("fa-sort-desc", function (x) {
      return x.key == this._sort.key ? this._sort.value === false : undefined;
    }.bind(this));

    var self = this;
    var can_redraw = true;

    var drag = d3$1.behavior.drag().on("drag", function (d, i) {
      var x = d3$1.event.dx;
      var w = parseInt(d3$1.select(this.parentNode).style("width").replace("px"));
      this.parentNode.__data__.width = w + x + "px";
      d3$1.select(this.parentNode).style("width", w + x + "px");

      var index = Array.prototype.slice.call(this.parentNode.parentNode.children, 0).indexOf(this.parentNode) + 1;
      d3$1.select(this.parentNode.parentNode.children[index]).style("width", undefined);

      if (can_redraw) {
        can_redraw = false;
        setTimeout(function () {
          can_redraw = true;
          tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").each(function (x) {
            var render = self._renderers[x.key];
            if (render) render.bind(this)(x);
          });
        }, 1);
      }
    });

    var draggable = d3_updateable(th, "b", "b").style("cursor", "ew-resize").style("font-size", "100%").style("height", "100%").style("position", "absolute").style("right", "-8px").style("top", "0").style("width", "10px").style("z-index", 1).on("mouseover", function () {
      var index = Array.prototype.slice.call(this.parentNode.parentNode.children, 0).indexOf(this.parentNode) + 1;
      tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").style("border-right", "1px dotted #ccc");
    }).on("mouseout", function () {
      var index = Array.prototype.slice.call(this.parentNode.parentNode.children, 0).indexOf(this.parentNode) + 1;
      tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").style("border-right", undefined);
    }).call(drag);

    th.exit().remove();

    if (!this._skip_option) {
      var options = d3_updateable(options_thead, "th", "th", false, function () {
        return 1;
      }).attr("colspan", this.headers().length + 1).style("padding-top", "10px").style("padding-bottom", "10px");

      var option = d3_splat(options, ".option", "div", false, function (x) {
        return x.key;
      }).classed("option", true).style("width", "240px").style("display", "inline-block");

      option.exit().remove();

      var self = this;

      d3_updateable(option, "input", "input").attr("type", "checkbox").property("checked", function (x) {
        this.checked = x.selected;
        return x.selected ? "checked" : undefined;
      }).attr("disabled", function (x) {
        return x.locked;
      }).on("click", function (x) {
        x.selected = this.checked;
        if (x.selected) {
          self.headers().push(x);
          return self.draw();
        }
        var indices = self.headers().map(function (z, i) {
          return z.key == x.key ? i : undefined;
        }),
            index = indices.filter(function (z) {
          return z;
        }) || 0;

        self.headers().splice(index, 1);
        self.draw();
      });

      d3_updateable(option, "span", "span").text(function (x) {
        return " " + x.value;
      });
    }

    this._options_header = this._target.selectAll(".table-options");
  },

  render_rows: function render_rows(table) {

    var self = this;
    var tbody = table.selectAll("tbody");

    if (this.headers() == undefined) return;
    if (!(this._data && this._data.values && this._data.values.length)) return;

    var data = this._data.values,
        sortby = this._sort || {};

    data = data.sort(function (p, c) {
      var a = p[sortby.key] || -Infinity,
          b = c[sortby.key] || -Infinity;

      return sortby.value ? d3$1.ascending(a, b) : d3$1.descending(a, b);
    });

    var rows = d3_splat(tbody, "tr", "tr", data, function (x, i) {
      return String(sortby.key + x[sortby.key]) + i;
    }).order().on("click", function (x) {
      if (self.on("expand") != noop$2) {
        var td = self._render_expand.bind(this)(x);
        self.on("expand").bind(this)(x, td);
      }
    });

    rows.exit().remove();

    var td = d3_splat(rows, "td", "td", this.headers(), function (x, i) {
      return x.key + i;
    }).each(function (x) {
      var dthis = d3$1.select(this);

      var renderer = self._renderers[x.key];

      if (!renderer) {
        renderer = self._default_renderer.bind(this)(x);
      } else {
        return renderer.bind(this)(x);
      }
    });

    td.exit().remove();

    var o = d3_updateable(rows, "td.option-header", "td", false, function () {
      return 1;
    }).classed("option-header", true).style("width", "70px").style("text-align", "center");

    if (this._skip_option) o.classed("hidden", true);

    d3_updateable(o, "a", "a").style("font-weight", "bold").html(self.option_text());
  },
  option_text: function option_text(val) {
    return accessor.bind(this)("option_text", val);
  },
  render: function render(k, fn) {
    if (fn == undefined) return this._renderers[k] || false;
    this._renderers[k] = fn;
    return this;
  },
  draw: function draw() {
    var self = this;
    var wrapper = this.render_wrapper();

    wrapper.selectAll("table").each(function (x) {
      self.render_header(d3$1.select(this));
    });

    this.render_rows(this._table_main);

    this.on("draw").bind(this)();

    return this;
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$2;
    this._on[action] = fn;
    return this;
  },
  d3: d3$1
};

__$styleInject(".summary-table { \n  display:inline-block;\n  vertical-align:top;\n}\n.summary-table > .title {\n  font-weight:bold;\n  font-size:14px;\n}\n\n.summary-table .wrap {\n  width:100%\n}\n", undefined);

function summary_table(target) {
  return new SummaryTable(target);
}

var SummaryTable = function (_D3ComponentBase) {
  inherits(SummaryTable, _D3ComponentBase);

  function SummaryTable(target) {
    classCallCheck(this, SummaryTable);

    var _this = possibleConstructorReturn(this, (SummaryTable.__proto__ || Object.getPrototypeOf(SummaryTable)).call(this, target));

    _this._wrapper_class = "table-summary-wrapper";
    return _this;
  }

  createClass(SummaryTable, [{
    key: 'props',
    value: function props() {
      return ["title", "headers", "data", "wrapper_class"];
    }
  }, {
    key: 'draw',
    value: function draw() {
      var urls_summary = d3_class(this._target, "summary-table");

      d3_class(urls_summary, "title").text(this.title());

      var uwrap = d3_class(urls_summary, "wrap");

      table$1(uwrap).wrapper_class(this.wrapper_class(), true).data({ "values": this.data() }).skip_option(true).headers(this.headers()).draw();
    }
  }]);
  return SummaryTable;
}(D3ComponentBase);

function noop$4() {}
function FilterView(target) {
  this._on = {
    select: noop$4
  };

  this.target = target;
  this._filter_options = {
    "Category": "parent_category_name",
    "Title": "url",
    "Time": "hour"
  };
}

function filter_view(target) {
  return new FilterView(target);
}

FilterView.prototype = {
  data: function data(val) {
    return accessor$2.bind(this)("data", val);
  },
  logic: function logic(val) {
    return accessor$2.bind(this)("logic", val);
  },
  categories: function categories(val) {
    return accessor$2.bind(this)("categories", val);
  },
  filters: function filters(val) {
    return accessor$2.bind(this)("filters", val);
  },
  draw: function draw() {

    var wrapper = d3_updateable(this.target, ".filter-wrap", "div", false, function () {
      return 1;
    }).classed("filter-wrap", true);

    header(wrapper).text("Filter").draw();

    var subtitle = d3_updateable(wrapper, ".subtitle-filter", "div").classed("subtitle-filter", true).style("padding-left", "10px").style("text-transform", " uppercase").style("font-weight", " bold").style("line-height", " 33px").style("background", " #e3ebf0").style("margin-bottom", "10px");

    d3_updateable(subtitle, "span.first", "span").text("Users matching ").classed("first", true);

    var filter_type = d3_updateable(subtitle, "span.middle", "span").classed("middle", true);

    select(filter_type).options(this.logic()).on("select", function (x) {
      this.logic().map(function (y) {
        y.selected = y.key == x.key;
      });
      this.on("logic.change")(this.logic());
    }.bind(this)).draw();

    d3_updateable(subtitle, "span.last", "span").text(" of the following:").classed("last", true);

    // -------- CATEGORIES --------- //

    var categories = this.categories();
    var filter_change = this.on("filter.change").bind(this);

    function selectizeInput(filter, value) {
      var self = this;

      var select$$1 = d3_updateable(filter, "input", "input").style("width", "200px").property("value", value.value);

      filter.selectAll(".selectize-control").each(function (x) {
        var destroy = d3.select(this).on("destroy");
        if (destroy) destroy();
      });

      var s = $(select$$1.node()).selectize({
        persist: false,
        create: function create(x) {
          value.value = (value.value ? value.value + "," : "") + x;
          self.on("update")(self.data());
          return {
            value: x, text: x
          };
        },
        onDelete: function onDelete(x) {
          value.value = value.value.split(",").filter(function (z) {
            return z != x[0];
          }).join(",");
          self.on("update")(self.data());
          return {
            value: x, text: x
          };
        }
      });

      filter.selectAll(".selectize-control").on("destroy", function () {
        s[0].selectize.destroy();
      });
    }

    function selectizeSelect(filter, value) {
      var self = this;

      filter.selectAll(".selectize-control").remove();

      filter.selectAll(".selectize-control").each(function (x) {
        var destroy = d3.select(this).on("destroy");
        if (destroy) destroy();
      });

      var select$$1 = d3_updateable(filter, "select.value", "select").classed("value", true).style("margin-bottom", "10px").style("padding-left", "10px").style("min-width", "200px").style("max-width", "500px").attr("multiple", true).on("change", function (x) {
        value.value = this.value;
        self.on("update")(self.data());
      });

      d3_splat(select$$1, "option", "option", categories, function (x) {
        return x.key;
      }).attr("selected", function (x) {
        return value.value && value.value.indexOf(x.key) > -1 ? "selected" : undefined;
      }).text(function (x) {
        return x.key;
      });

      var s = $(select$$1.node()).selectize({
        persist: false,
        onChange: function onChange(x) {
          value.value = x.join(",");
          self.on("update")(self.data());
        }
      });

      filter.selectAll(".selectize-control").on("destroy", function () {
        s[0].selectize.destroy();
      });
    }

    this._logic_filter = filter$2(wrapper).fields(Object.keys(this._filter_options)).ops([[{ "key": "is in.category" }, { "key": "is not in.category" }], [{ "key": "contains.selectize" }, { "key": "does not contain.selectize" }], [{ "key": "equals" }, { "key": "between", "input": 2 }]]).data(this.filters()).render_op("contains.selectize", selectizeInput).render_op("does not contain.selectize", selectizeInput).render_op("is in.category", selectizeSelect).render_op("is not in.category", selectizeSelect).render_op("between", function (filter, value) {
      var self = this;

      value.value = _typeof(value.value) == "object" ? value.value : [0, 24];

      d3_updateable(filter, "input.value.low", "input").classed("value low", true).style("margin-bottom", "10px").style("padding-left", "10px").style("width", "90px").attr("value", value.value[0]).on("keyup", function (x) {
        var t = this;

        self.typewatch(function () {
          value.value[0] = t.value;
          self.on("update")(self.data());
        }, 1000);
      });

      d3_updateable(filter, "span.value-and", "span").classed("value-and", true).text(" and ");

      d3_updateable(filter, "input.value.high", "input").classed("value high", true).style("margin-bottom", "10px").style("padding-left", "10px").style("width", "90px").attr("value", value.value[1]).on("keyup", function (x) {
        var t = this;

        self.typewatch(function () {
          value.value[1] = t.value;
          self.on("update")(self.data());
        }, 1000);
      });
    }).on("update", function (filters) {
      filter_change(filters);
    }).draw();

    //d3_updateable(this.target,".filter-wrap-spacer","div")
    //  .classed("filter-wrap-spacer",true)
    //  .style("height",wrapper.style("height"))

    //wrapper
    //  .style("width",this.target.style("width"))
    //  .style("position","fixed")
    //  .style("z-index","300")
    //  .style("background","#f0f4f7")

    return this;
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$4;
    this._on[action] = fn;
    return this;
  }
};

function noop$8() {}
function identity$5(x) {
  return x;
}
function key$5(x) {
  return x.key;
}

function ButtonRadio(target) {
  this._on = {};
  this.target = target;
}

function button_radio(target) {
  return new ButtonRadio(target);
}

ButtonRadio.prototype = {
  data: function data(val) {
    return accessor$2.bind(this)("data", val);
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$8;
    this._on[action] = fn;
    return this;
  },
  draw: function draw() {

    var CSS_STRING = String(function () {/*
                                         .options-view { text-align:right }
                                         .show-button {
                                         width: 150px;
                                         text-align: center;
                                         line-height: 40px;
                                         border-radius: 15px;
                                         border: 1px solid #ccc;
                                         font-size: 12px;
                                         text-transform: uppercase;
                                         font-weight: bold;
                                         display:inline-block;
                                         margin-right:15px;
                                         }
                                         .show-button:hover { text-decoration:none; color:#555 }
                                         .show-button.selected {
                                         background: #e3ebf0;
                                         color: #555;
                                         }
                                         */});

    d3_updateable(d3.select("head"), "style#show-css", "style").attr("id", "header-css").text(CSS_STRING.replace("function () {/*", "").replace("*/}", ""));

    var options = d3_updateable(this.target, ".button-radio-row", "div").classed("button-radio-row", true).style("margin-bottom", "35px");

    var button_row = d3_updateable(options, ".options-view", "div", this.data()).classed("options-view", true);

    var bound = this.on("click").bind(this);

    d3_splat(button_row, ".show-button", "a", identity$5, key$5).classed("show-button", true).classed("selected", function (x) {
      return x.selected;
    }).text(key$5).on("click", function (x) {
      bound(x);
    });

    return this;
  }

};

function noop$7() {}
function OptionView(target) {
  this._on = {
    select: noop$7
  };
  this.target = target;
}

function option_view(target) {
  return new OptionView(target);
}

OptionView.prototype = {
  data: function data(val) {
    return accessor$2.bind(this)("data", val);
  },
  options: function options(val) {
    return accessor$2.bind(this)("options", val);
  },
  draw: function draw() {

    var wrap = d3_updateable(this.target, ".option-wrap", "div").classed("option-wrap", true);

    //header(wrap)
    //  .text("Choose View")
    //  .draw()

    button_radio(wrap).on("click", this.on("select")).data(this.data()).draw();

    return this;
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$7;
    this._on[action] = fn;
    return this;
  }
};

function prepData$1() {
  return prepData.apply(this, arguments);
}

var EXAMPLE_DATA$1 = {
  "key": "Browsing behavior by time",
  "values": [{
    "key": 1,
    "value": 12344
  }, {
    "key": 2,
    "value": 12344
  }, {
    "key": 2.25,
    "value": 12344
  }, {
    "key": 2.5,
    "value": 12344
  }, {
    "key": 3,
    "value": 1234
  }, {
    "key": 4,
    "value": 12344
  }]
};

function TimeSeries(target) {
  this._target = target;
  this._data = EXAMPLE_DATA$1;
  this._on = {};
}

function time_series(target) {
  return new TimeSeries(target);
}

TimeSeries.prototype = {

  data: function data(val) {
    return accessor$2.bind(this)("data", val);
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || function () {};
    this._on[action] = fn;
    return this;
  },
  title: function title(val) {
    return accessor$2.bind(this)("title", val);
  },
  height: function height(val) {
    return accessor$2.bind(this)("height", val);
  },

  draw: function draw() {
    var wrap = this._target;
    var desc = d3_updateable(wrap, ".vendor-domains-bar-desc", "div").classed("vendor-domains-bar-desc", true).style("display", "inherit").style("height", "100%").style("width", "100%").datum(this._data);

    var wrapper = d3_updateable(desc, ".w", "div").classed("w", true).style("height", "100%").style("width", "100%");

    var self = this;

    wrapper.each(function (row) {

      var data = row.values.sort(function (p, c) {
        return c.key - p.key;
      }),
          count = data.length;

      var _sizes = autoSize(wrapper, function (d) {
        return d - 10;
      }, function (d) {
        return self._height || 60;
      }),
          gridSize = Math.floor(_sizes.width / 24 / 3);

      var valueAccessor = function valueAccessor(x) {
        return x.value;
      },
          valueAccessor2 = function valueAccessor2(x) {
        return x.value2;
      },
          keyAccessor = function keyAccessor(x) {
        return x.key;
      };

      var steps = Array.apply(null, Array(count)).map(function (_, i) {
        return i + 1;
      });

      var _colors = ["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#253494", "#081d58"];
      var colors = _colors;

      var x = d3.scale.ordinal().range(steps),
          y = d3.scale.linear().range([_sizes.height, 0]);

      var colorScale = d3.scale.quantile().domain([0, d3.max(data, function (d) {
        return d.frequency;
      })]).range(colors);

      var svg_wrap = d3_updateable(wrapper, "svg", "svg").attr("width", _sizes.width + _sizes.margin.left + _sizes.margin.right).attr("height", _sizes.height + _sizes.margin.top + _sizes.margin.bottom);

      var svg = d3_splat(svg_wrap, "g", "g", function (x) {
        return [x.values];
      }, function (_, i) {
        return i;
      }).attr("transform", "translate(" + _sizes.margin.left + "," + 0 + ")");

      x.domain([0, 72]);
      y.domain([0, d3.max(data, function (d) {
        return Math.sqrt(valueAccessor(d));
      })]);

      var buildBars = function buildBars(data, keyAccessor, valueAccessor, y, c) {

        var bars = d3_splat(svg, ".timing-bar" + c, "rect", data, keyAccessor).attr("class", "timing-bar" + c);

        bars.attr("x", function (d) {
          return (keyAccessor(d) - 1) * gridSize;
        }).attr("width", gridSize - 1).attr("y", function (d) {
          return y(Math.sqrt(valueAccessor(d)));
        }).attr("fill", "#aaa").attr("fill", function (x) {
          return colorScale(keyAccessor(x) + c) || "grey";
        })
        //.attr("stroke","white")
        //.attr("stroke-width","1px")
        .attr("height", function (d) {
          return _sizes.height - y(Math.sqrt(valueAccessor(d)));
        }).style("opacity", "1").on("mouseover", function (x) {
          self.on("hover").bind(this)(x);
        });
      };

      if (data && data.length && data[0].value2) {
        var y2 = d3.scale.linear().range([_sizes.height, 0]);
        y2.domain([0, d3.max(data, function (d) {
          return Math.sqrt(valueAccessor2(d));
        })]);
        buildBars(data, keyAccessor, valueAccessor2, y2, "-2");
      }

      buildBars(data, keyAccessor, valueAccessor, y, "");

      var z = d3.time.scale().range([0, gridSize * 24 * 3]).nice(d3.time.hour, 24);

      var xAxis = d3.svg.axis().scale(z).ticks(3).tickFormat(d3.time.format("%I %p"));

      svg.append("g").attr("class", "x axis").attr("transform", "translate(0," + _sizes.height + ")").call(xAxis);
    });
  }
};

var DataSelector = function (_D3ComponentBase) {
  inherits(DataSelector, _D3ComponentBase);

  function DataSelector(target) {
    classCallCheck(this, DataSelector);

    var _this = possibleConstructorReturn(this, (DataSelector.__proto__ || Object.getPrototypeOf(DataSelector)).call(this, target));

    _this._transforms = false;
    _this._selected_transform = false;
    _this._skip_values = false;
    return _this;
  }

  createClass(DataSelector, [{
    key: 'props',
    value: function props() {
      return ["transforms", "datasets", "selected_transform", "skip_values"];
    }
  }, {
    key: 'draw',
    value: function draw() {
      var transform_selector = d3_class(this._target, "transform");

      select(d3_class(transform_selector, "header", "span")).options(this.datasets()).on("select", this.on("dataset.change")).draw();

      if (this.transforms()) {
        select(d3_class(transform_selector, "trans", "span")).options(this.transforms()).on("select", this.on("transform.change")) //function(x){ self.on("transform.change").bind(this)(x) })
        .selected(this.selected_transform()).draw();
      }

      var toggle = d3_class(transform_selector, "show-values").style("display", this.skip_values() ? "none" : null);

      d3_updateable(toggle, "span", "span").text("show values? ");

      d3_updateable(toggle, "input", "input").attr("type", "checkbox").on("change", this.on("toggle.values"));

      var toggle = d3_class(transform_selector, "filter-values");

      d3_updateable(toggle, "span", "span").text("live filter? ");

      d3_updateable(toggle, "input", "input").attr("type", "checkbox").attr("disabled", true).attr("checked", "checked");

      return this;
    }
  }]);
  return DataSelector;
}(D3ComponentBase);

function data_selector(target) {
  return new DataSelector(target);
}

var TabularHeader = function (_D3ComponentBase) {
  inherits(TabularHeader, _D3ComponentBase);

  function TabularHeader(target) {
    classCallCheck(this, TabularHeader);

    var _this = possibleConstructorReturn(this, (TabularHeader.__proto__ || Object.getPrototypeOf(TabularHeader)).call(this));

    _this._target = target;
    _this.WIDTH = 144;
    _this._label = "URL";
    _this._headers = ["12am", "12pm", "12am"];
    _this._xs = [0, _this.WIDTH / 2, _this.WIDTH];
    _this._anchors = ["start", "middle", "end"];
    return _this;
  }

  createClass(TabularHeader, [{
    key: "props",
    value: function props() {
      return ["label", "headers"];
    }
  }, {
    key: "draw",
    value: function draw() {
      var _this2 = this;

      var euh = d3_class(this._target, "expansion-urls-title");

      d3_class(euh, "title").text(this.label());
      d3_class(euh, "view").text("Views");

      var svg_legend = d3_class(euh, "legend", "svg");

      if (this.headers().length == 2) {
        this._xs = [this.WIDTH / 2 - this.WIDTH / 4, this.WIDTH / 2 + this.WIDTH / 4];
        this._anchors = ["middle", "middle"];
      }

      d3_splat(svg_legend, "text", "text", this.headers(), function (x, i) {
        return i;
      }).attr("y", "20").attr("x", function (x, i) {
        return _this2._xs[i];
      }).style("text-anchor", function (x, i) {
        return _this2._anchors[i];
      }).text(String);

      d3_splat(svg_legend, "line", "line", this.headers(), function (x, i) {
        return i;
      }).style("stroke-dasharray", "1,5").attr("stroke-width", 1).attr("stroke", "black").attr("y1", this.headers().length == 2 ? 0 : 25).attr("y2", 35).attr("x1", function (x, i) {
        return _this2.headers().length == 2 ? _this2.WIDTH / 2 : _this2._xs[i];
      }).attr("x2", function (x, i) {
        return _this2.headers().length == 2 ? _this2.WIDTH / 2 : _this2._xs[i];
      });
    }
  }]);
  return TabularHeader;
}(D3ComponentBase);

function simpleTimeseries(target, data, w, h, min) {
  var width = w || 120,
      height = h || 30;

  var x = d3.scale.ordinal().domain(d3.range(0, data.length)).range(d3.range(0, width, width / data.length));
  var y = d3.scale.linear().range([4, height]).domain([min || d3.min(data), d3.max(data)]);

  var wrap = d3_updateable(target, "g", "g", data, function (x, i) {
    return 1;
  });

  d3_splat(wrap, "rect", "rect", function (x) {
    return x;
  }, function (x, i) {
    return i;
  }).attr("x", function (z, i) {
    return x(i);
  }).attr("width", width / data.length - 1.2).attr("y", function (z) {
    return height - y(z);
  }).attr("height", function (z) {
    return z ? y(z) : 0;
  });

  return wrap;
}

function before_after_timeseries(target) {
  return new BeforeAfterTimeseries(target);
}

var BeforeAfterTimeseries = function (_D3ComponentBase) {
  inherits(BeforeAfterTimeseries, _D3ComponentBase);

  function BeforeAfterTimeseries(target) {
    classCallCheck(this, BeforeAfterTimeseries);

    var _this = possibleConstructorReturn(this, (BeforeAfterTimeseries.__proto__ || Object.getPrototypeOf(BeforeAfterTimeseries)).call(this, target));

    _this._wrapper_class = "ba-timeseries-wrap";
    return _this;
  }

  createClass(BeforeAfterTimeseries, [{
    key: 'props',
    value: function props() {
      return ["data", "before", "after", "wrapper_class"];
    }
  }, {
    key: 'draw',
    value: function draw() {

      var tsw = 250,
          unit_size = tsw / this.data().length,
          before_pos = this.before(),
          after_pos = this.after();

      var timeseries = d3_class(this._target, this.wrapper_class(), "svg").style("display", "block").style("margin", "auto").style("margin-bottom", "30px").attr("width", tsw + "px").attr("height", "70px");

      simpleTimeseries(timeseries, this.data(), tsw);

      // add decorations

      d3_class(timeseries, "middle", "line").style("stroke-dasharray", "1,5").attr("stroke-width", 1).attr("stroke", "black").attr("y1", 0).attr("y2", 55).attr("x1", tsw / 2).attr("x2", tsw / 2);

      d3_class(timeseries, "middle-text", "text").attr("x", tsw / 2).attr("y", 67).style("text-anchor", "middle").text("On-site");

      d3_class(timeseries, "before", "line").style("stroke-dasharray", "1,5").attr("stroke-width", 1).attr("stroke", "black").attr("y1", 39).attr("y2", 45).attr("x1", unit_size * before_pos).attr("x2", unit_size * before_pos);

      d3_class(timeseries, "before-text", "text").attr("x", unit_size * before_pos - 8).attr("y", 48).style("text-anchor", "end").text("Consideration");

      d3_class(timeseries, "window", "line").style("stroke-dasharray", "1,5").attr("stroke-width", 1).attr("stroke", "black").attr("y1", 45).attr("y2", 45).attr("x1", unit_size * before_pos).attr("x2", unit_size * (after_pos + 1) + 1);

      d3_class(timeseries, "after", "line").style("stroke-dasharray", "1,5").attr("stroke-width", 1).attr("stroke", "black").attr("y1", 39).attr("y2", 45).attr("x1", unit_size * (after_pos + 1)).attr("x2", unit_size * (after_pos + 1));

      d3_class(timeseries, "after-text", "text").attr("x", unit_size * (after_pos + 1) + 8).attr("y", 48).style("text-anchor", "start").text("Validation");

      return this;
    }
  }]);
  return BeforeAfterTimeseries;
}(D3ComponentBase);

function simpleBar(wrap, value, scale, color) {

  var height = 20,
      width = wrap.style("width").replace("px", "");

  var canvas = d3_updateable(wrap, "svg", "svg", [value], function () {
    return 1;
  }).style("width", width + "px").style("height", height + "px");

  var chart = d3_updateable(canvas, 'g.chart', 'g', false, function () {
    return 1;
  }).attr("class", "chart");

  var bars = d3_splat(chart, ".pop-bar", "rect", function (x) {
    return x;
  }, function (x, i) {
    return i;
  }).attr("class", "pop-bar").attr('height', height - 4).attr({ 'x': 0, 'y': 0 }).style('fill', color).attr("width", function (x) {
    return scale(x);
  });
}

function domain_bullet(target) {
  return new DomainBullet(target);
}

// data schema: [{pop_percent, sample_percent_norm}

var DomainBullet = function (_D3ComponentBase) {
  inherits(DomainBullet, _D3ComponentBase);

  function DomainBullet(target) {
    classCallCheck(this, DomainBullet);

    var _this = possibleConstructorReturn(this, (DomainBullet.__proto__ || Object.getPrototypeOf(DomainBullet)).call(this));

    _this.target = target;
    return _this;
  }

  createClass(DomainBullet, [{
    key: "props",
    value: function props() {
      return ["data", "max"];
    }
  }, {
    key: "draw",
    value: function draw() {
      var width = (this.target.style("width").replace("px", "") || this.offsetWidth) - 50,
          height = 28;

      var x = d3.scale.linear().range([0, width]).domain([0, this.max()]);

      if (this.target.text()) this.target.text("");

      var bullet = d3_updateable(this.target, ".bullet", "div", this.data(), function (x) {
        return 1;
      }).classed("bullet", true).style("margin-top", "3px");

      var svg = d3_updateable(bullet, "svg", "svg", false, function (x) {
        return 1;
      }).attr("width", width).attr("height", height);

      d3_updateable(svg, ".bar-1", "rect", false, function (x) {
        return 1;
      }).classed("bar-1", true).attr("x", 0).attr("width", function (d) {
        return x(d.pop_percent);
      }).attr("height", height).attr("fill", "#888");

      d3_updateable(svg, ".bar-2", "rect", false, function (x) {
        return 1;
      }).classed("bar-2", true).attr("x", 0).attr("y", height / 4).attr("width", function (d) {
        return x(d.sample_percent_norm);
      }).attr("height", height / 2).attr("fill", "rgb(8, 29, 88)");

      return this;
    }
  }]);
  return DomainBullet;
}(D3ComponentBase);

var TabularBody = function (_D3ComponentBase) {
  inherits(TabularBody, _D3ComponentBase);

  function TabularBody(target) {
    classCallCheck(this, TabularBody);

    var _this = possibleConstructorReturn(this, (TabularBody.__proto__ || Object.getPrototypeOf(TabularBody)).call(this));

    _this._target = target;
    return _this;
  }

  createClass(TabularBody, [{
    key: 'props',
    value: function props() {
      return ["data", "split"];
    }
  }, {
    key: 'draw',
    value: function draw() {
      var _this2 = this;

      var self = this;

      var expansion_row = this._target;

      var expansion = d3_class(expansion_row, "expansion-urls").classed("scrollbox", true);

      expansion.html("");

      var url_row = d3_splat(expansion, ".url-row", "div", this.data().slice(0, 500), function (x) {
        return x.key;
      }).classed("url-row", true);

      var url_name = d3_updateable(url_row, ".name", "div").classed("name", true);

      d3_updateable(url_name, "input", "input").attr("type", "checkbox").on("click", self.on("stage-filter"));

      d3_class(url_name, "url", "a").text(function (x) {
        return _this2.split() ? x.key.split(_this2.split())[1] || x.key : x.key;
      }).attr("href", function (x) {
        return x.url ? x.url : undefined;
      }).attr("target", "_blank");

      d3_updateable(url_row, ".number", "div").classed("number", true).text(function (x) {
        return x.total;
      });

      d3_updateable(url_row, ".plot", "svg").classed("plot", true).each(function (x) {
        var dthis = d3.select(this);
        var values = x.values || x.value;
        simpleTimeseries(dthis, values, 144, 20);
      });
    }
  }]);
  return TabularBody;
}(D3ComponentBase);

__$styleInject(".expansion-urls-title {\n  height:36px;\n  line-height:36px;\n  display:inline-block;\n  vertical-align:top;\n}\n.expansion-urls-title .title {\n  width:265px;\n  font-weight:bold;\n  display:inline-block;\n  vertical-align:top;\n}\n\n.expansion-urls-title .view {\n  width:40px;\n  margin-left:20px;\n  margin-right:20px;\n  font-weight:bold;\n  display:inline-block;\n  vertical-align:top;\n}\n.expansion-urls-title .legend {\n  width:144px;\n  height:36px;\n  vertical-align:top;\n}\n\n.scrollbox {\n  display:inline-block;\n  vertical-align:top;\n  max-height:250px;\n  overflow:scroll;\n}\n\n.url-row .name {\n  width:260px;\n  overflow:hidden;\n  line-height:20px;\n  height:20px;\n  display:inline-block;\n}\n\n.url-row input {\n      margin-right:10px;\n      display:inline-block;\n      vertical-align:top;\n}\n\n.url-row .url {\n      display:inline-block;\n      text-overflow:ellipsis;\n      width:205px;\n}\n\n.url-row .number {\n      width:40px;\n      height:20px;\n      line-height:20px;\n      vertical-align:top;\n      text-align:center;\n      font-size:13px;\n      font-weight:bold;\n      margin-left:20px;\n      margin-right:20px;\n      display:inline-block;\n}\n\n.url-row .plot {\n      width:144px;\n      height:20px;\n      display:inline-block;\n}\n", undefined);

function tabular_timeseries(target) {
  return new TabularTimeseries(target);
}

var TabularTimeseries = function (_D3ComponentBase) {
  inherits(TabularTimeseries, _D3ComponentBase);

  function TabularTimeseries(target) {
    classCallCheck(this, TabularTimeseries);

    var _this = possibleConstructorReturn(this, (TabularTimeseries.__proto__ || Object.getPrototypeOf(TabularTimeseries)).call(this));

    _this._target = target;
    _this._headers = ["12am", "12pm", "12am"];
    return _this;
  }

  createClass(TabularTimeseries, [{
    key: 'props',
    value: function props() {
      return ["data", "label", "split", "headers"];
    }
  }, {
    key: 'draw',
    value: function draw() {
      var td = this._target;

      var title_row = d3_class(td, "title-row");
      var expansion_row = d3_class(td, "expansion-row");

      var header = new TabularHeader(title_row).label(this.label()).headers(this.headers()).draw();

      var body = new TabularBody(expansion_row).data(this.data()).split(this.split() || false).on("stage-filter", this.on("stage-filter")).draw();
    }
  }]);
  return TabularTimeseries;
}(D3ComponentBase);

__$styleInject(".action-header {\n  text-align:center;\n  font-size:16px;\n  font-weight:bold;\n  padding:10px;\n}\n\n.url-depth, .kw-depth {\n  width:50%;\n  display:inline-block;\n}\n", undefined);

var allbuckets = [];
var hourbuckets = d3$1.range(0, 24).map(function (x) {
  return String(x).length > 1 ? String(x) : "0" + x;
});

var minutes = [0, 20, 40];
var buckets = d3$1.range(0, 24).reduce(function (p, c) {
  minutes.map(function (x) {
    p[c + ":" + x] = 0;
  });
  allbuckets = allbuckets.concat(minutes.map(function (z) {
    return c + ":" + z;
  }));
  return p;
}, {});

var STOPWORDS = ["that", "this", "what", "best", "most", "from", "your", "have", "first", "will", "than", "says", "like", "into", "after", "with"];

function rawToUrl(data) {
  return data.reduce(function (p, c) {
    p[c.url] = p[c.url] || Object.assign({}, buckets);
    p[c.url][c.hour] = (p[c.url][c.hour] || 0) + c.count;
    return p;
  }, {});
}

function urlToDraw(urls) {
  var obj = {};
  Object.keys(urls).map(function (k) {
    obj[k] = hourbuckets.map(function (b) {
      return urls[k][b] || 0;
    });
  });

  return d3$1.entries(obj).map(function (x) {
    x.url = x.key;
    x.total = d3$1.sum(x.value);
    return x;
  });
}

function drawToKeyword(draw, split) {
  var obj = draw.reduce(function (p, c) {
    c.key.toLowerCase().split(split)[1].split("/").reverse()[0].replace("_", "-").split("-").map(function (x) {
      var values = STOPWORDS;
      if (x.match(/\d+/g) == null && values.indexOf(x) == -1 && x.indexOf(",") == -1 && x.indexOf("?") == -1 && x.indexOf(".") == -1 && x.indexOf(":") == -1 && parseInt(x) != x && x.length > 3) {
        p[x] = p[x] || {};
        Object.keys(c.value).map(function (q) {
          p[x][q] = (p[x][q] || 0) + (c.value[q] || 0);
        });
      }
    });

    return p;
  }, {});

  return d3$1.entries(obj).map(function (x) {
    x.values = Object.keys(x.value).map(function (z) {
      return x.value[z] || 0;
    });
    x.total = d3$1.sum(x.values);
    return x;
  });
}

function domain_expanded(target) {
  return new DomainExpanded(target);
}

var DomainExpanded = function (_D3ComponentBase) {
  inherits(DomainExpanded, _D3ComponentBase);

  function DomainExpanded(target) {
    classCallCheck(this, DomainExpanded);

    var _this = possibleConstructorReturn(this, (DomainExpanded.__proto__ || Object.getPrototypeOf(DomainExpanded)).call(this));

    _this._target = target;
    return _this;
  }

  createClass(DomainExpanded, [{
    key: 'props',
    value: function props() {
      return ["raw", "data", "urls", "domain"];
    }
  }, {
    key: 'draw',
    value: function draw() {
      var td = this._target;

      d3_class(td, "action-header").text("Explore and Refine");

      var urlData = rawToUrl(this.raw());
      var to_draw = urlToDraw(urlData);
      var kw_to_draw = drawToKeyword(to_draw, this.domain());

      tabular_timeseries(d3_class(td, "url-depth")).label("URL").data(to_draw).split(this.domain()).on("stage-filter", this.on("stage-filter")).draw();

      tabular_timeseries(d3_class(td, "kw-depth")).label("Keywords").data(kw_to_draw).on("stage-filter", this.on("stage-filter")).draw();
    }
  }]);
  return DomainExpanded;
}(D3ComponentBase);

__$styleInject(".vertical-options {\n  width:120px;\n  text-align:center;\n}\n\n.vertical-options .show-button {\n  line-height:18px;\n  width:100px;\n  font-size:10px;\n  margin-bottom:5px;\n}\n.vertical-options .show-button.selected {\n  background: #e3ebf0;  \n  color: #555;\n}\n", undefined);

function vertical_option(target) {
  return new VerticalOption(target);
}

//[{key, value, selected},...]

var VerticalOption = function (_D3ComponentBase) {
  inherits(VerticalOption, _D3ComponentBase);

  function VerticalOption(target) {
    classCallCheck(this, VerticalOption);

    var _this = possibleConstructorReturn(this, (VerticalOption.__proto__ || Object.getPrototypeOf(VerticalOption)).call(this));

    _this._target = target;
    _this._options = [];
    _this._wrapper_class = "vertical-options";
    return _this;
  }

  createClass(VerticalOption, [{
    key: 'props',
    value: function props() {
      return ["options", "wrapper_class"];
    }
  }, {
    key: 'draw',
    value: function draw() {
      var opts = d3_class(this._target, this.wrapper_class(), "div", this.options());

      d3_splat(opts, ".show-button", "a", this.options(), function (x) {
        return x.key;
      }).classed("show-button", true).classed("selected", function (x) {
        return x.selected;
      }).text(function (x) {
        return x.key;
      }).on("click", this.on("click"));

      return this;
    }
  }]);
  return VerticalOption;
}(D3ComponentBase);

var DomainView = function (_D3ComponentBase) {
  inherits(DomainView, _D3ComponentBase);

  function DomainView(target) {
    classCallCheck(this, DomainView);
    return possibleConstructorReturn(this, (DomainView.__proto__ || Object.getPrototypeOf(DomainView)).call(this, target));
  }

  createClass(DomainView, [{
    key: 'props',
    value: function props() {
      return ["data", "options", "sort", "ascending"];
    }
  }, {
    key: 'draw',
    value: function draw() {
      var _this2 = this;

      var self = this;

      var _explore = this._target,
          tabs = this.options(),
          data = this.data(),
          filtered = tabs.filter(function (x) {
        return x.selected;
      }),
          selected = filtered.length ? filtered[0] : tabs[0];

      var headers = [{ key: "key", value: selected.key.replace("Top ", ""), locked: true, width: "200px" }, { key: "sample_percent", value: "Segment", selected: false }, { key: "real_pop_percent", value: "Baseline", selected: false }, { key: "ratio", value: "Ratio", selected: false }, { key: "importance", value: "Importance", selected: false }, { key: "value", value: "Segment versus Baseline", locked: true }]; //.filter((x) => !!selected.values[0][x.key])

      var samp_max = d3.max(selected.values, function (x) {
        return x.sample_percent_norm;
      }),
          pop_max = d3.max(selected.values, function (x) {
        return x.pop_percent;
      }),
          max = Math.max(samp_max, pop_max);

      var _default = "importance";
      var s = this.sort();
      var asc = this.ascending();

      var selectedHeader = headers.filter(function (x) {
        return x.key == s;
      });
      var sortby = selectedHeader.length ? selectedHeader[0].key : _default;

      header(_explore).text("Overall").draw();

      data_selector(_explore).datasets(tabs).skip_values(true).on("dataset.change", function (x) {
        _this2.on("select")(x);
      }).draw();

      _explore.selectAll(".vendor-domains-bar-desc").remove();
      _explore.datum(data);

      var legend = d3_class(_explore, "legend").style("display", "inline-block").style("margin-left", "358px");

      d3_class(legend, "legend-label", "span").style("text-transform", "uppercase").style("font-weight", "bold").style("line-height", "30px").style("vertical-align", "top").style("margin-right", "10px").text("Key");

      var graphic = d3_class(legend, "graphic").style("width", "300px").style("display", "inline-block");

      domain_bullet(graphic).max(max).data({ "pop_percent": max / 3 * 2, "sample_percent_norm": max }).draw();

      var svg = graphic.selectAll("svg").attr("width", 400).attr("height", 68);

      d3_updateable(svg, "line.segment", "line").classed("segment", true).attr("stroke-width", 1).attr("stroke-dasharray", "1 3").attr("stroke", "#333").attr("y2", 14).attr("y1", 14).attr("x2", 250).attr("x1", 265);

      d3_updateable(svg, "text.segment", "text").classed("segment", true).attr("y", 18).attr("x", 270).style("text-anchor", "start").style("font-weight", "bold").text("Users in segment");

      d3_updateable(svg, "line.population", "line").classed("population", true).attr("stroke-width", 1).attr("stroke-dasharray", "1 3").attr("stroke", "#333").attr("y2", 48).attr("y1", 27).attr("x2", 140).attr("x1", 140);

      d3_updateable(svg, "text.population", "text").classed("population", true).style("text-anchor", "start").style("font-weight", "bold").attr("y", 53).attr("x", 150).text("Users in population");

      var t = table$1(_explore).top(140).data(selected).headers(headers).sort(sortby, asc).on("sort", this.on("sort")).option_text("&#65291;").on("expand", function (d, td) {

        var dd = this.parentElement.__data__.full_urls.filter(function (x) {
          return x.domain == d.key;
        });
        var rolled = prepData$1(dd);

        domain_expanded(td).domain(dd[0].domain).raw(dd).data(rolled).urls(d.urls).on("stage-filter", function (x) {
          self.on("stage-filter")(x);
        }).draw();
      }).hidden_fields(["urls", "percent_unique", "sample_percent_norm", "pop_percent", "tf_idf", "parent_category_name"]).render("ratio", function (d) {
        this.innerText = Math.trunc(this.parentNode.__data__.ratio * 100) / 100 + "x";
      }).render("value", function (d) {

        domain_bullet(d3.select(this)).max(max).data(this.parentNode.__data__).draw();
      });

      t.draw();

      return this;
    }
  }]);
  return DomainView;
}(D3ComponentBase);

function domain_view(target) {
  return new DomainView(target);
}

function noop$9() {}
function SegmentView(target) {
  this._on = {
    select: noop$9
  };
  this.target = target;
}

function segment_view(target) {
  return new SegmentView(target);
}

SegmentView.prototype = {
  data: function data(val) {
    return accessor$2.bind(this)("data", val);
  },
  segments: function segments(val) {
    return accessor$2.bind(this)("segments", val);
  },
  draw: function draw() {

    var wrap = d3_updateable(this.target, ".segment-wrap", "div").classed("segment-wrap", true).style("height", "140px").style("width", this.target.style("width")).style("position", "fixed").style("z-index", "300").style("background", "#f0f4f7");

    d3_updateable(this.target, ".segment-wrap-spacer", "div").classed("segment-wrap-spacer", true).style("height", wrap.style("height"));

    header(wrap).buttons([{ class: "download", icon: "fa-filefa", text: "Export Saved" }, { class: "saved-search", icon: "fa-folder-open-o fa", text: "Open Saved" }, { class: "new-saved-search", icon: "fa-bookmark fa", text: "Save" }, { class: "create", icon: "fa-plus-circle fa", text: "New Segment" }, { class: "logout", icon: "fa-sign-out fa", text: "Logout" }]).on("saved-search.click", this.on("saved-search.click")).on("download.click", this.on("download.click")).on("logout.click", function () {
      window.location = "/logout";
    }).on("create.click", function () {
      window.location = "/segments";
    }).on("new-saved-search.click", this.on("new-saved-search.click")).text("Segment").draw();

    wrap.selectAll(".header-body").classed("hidden", !this._is_loading).style("text-align", "center").style("margin-bottom", "-40px").style("padding-top", "10px").style("height", "0px").style("background", "none").html("<img src='/static/img/general/logo-small.gif' style='height:15px'/> loading...");

    if (this._data == false) return;

    var body = d3_updateable(wrap, ".body", "div").classed("body", true).style("clear", "both").style("display", "flex").style("flex-direction", "column").style("margin-top", "-15px").style("margin-bottom", "30px");

    var row1 = d3_updateable(body, ".row-1", "div").classed("row-1", true).style("flex", 1).style("display", "flex").style("flex-direction", "row");

    var row2 = d3_updateable(body, ".row-2", "div").classed("row-2", true).style("flex", 1).style("display", "flex").style("flex-direction", "row");

    var inner = d3_updateable(row1, ".action.inner", "div").classed("inner action", true).style("flex", "1").style("display", "flex").style("padding", "10px").style("padding-bottom", "0px").style("margin-bottom", "0px");

    var inner_desc = d3_updateable(row1, ".action.inner-desc", "div").classed("inner-desc action", true).style("flex", "1").style("padding", "10px").style("padding-bottom", "0px").style("display", "flex").style("margin-bottom", "0px");

    d3_updateable(inner, "h3", "h3").text("Choose Segment").style("margin", "0px").style("line-height", "32px").style("color", "inherit").style("font-size", "inherit").style("font-weight", "bold").style("text-transform", "uppercase").style("flex", "1").style("background", "#e3ebf0").style("padding-left", "10px").style("margin-right", "10px").style("margin-top", "2px").style("margin-bottom", "2px").style("height", "100%");

    d3_updateable(inner, "div.color", "div").classed("color", true).style("background-color", "#081d58").style("width", "10px").style("height", "32px").style("margin-top", "2px").style("margin-right", "10px").style("margin-left", "-10px");

    var self = this;

    select(inner).options(this._segments).on("select", function (x) {
      self.on("change").bind(this)(x);
    }).selected(this._action.value || 0).draw();

    var cal = d3_updateable(inner, "a.fa-calendar", "a").style("line-height", "34px").style("width", "36px").style("border", "1px solid #ccc").style("border-radius", "5px").classed("fa fa-calendar", true).style("text-align", "center").style("margin-left", "5px").on("click", function (x) {
      calsel.node();
    });

    var calsel = select(cal).options([{ "key": "Today", "value": 0 }, { "key": "Yesterday", "value": 1 }, { "key": "7 days ago", "value": 7 }]).on("select", function (x) {
      self.on("action_date.change").bind(this)(x.value);
    }).selected(this._action_date || 0).draw()._select.style("width", "18px").style("margin-left", "-18px").style("height", "34px").style("opacity", ".01").style("flex", "none").style("border", "none");

    var inner2 = d3_updateable(row2, ".comparison.inner", "div").classed("inner comparison", true).style("flex", "1").style("padding", "10px").style("padding-bottom", "0px").style("display", "flex");

    var inner_desc2 = d3_updateable(row2, ".comparison-desc.inner", "div").classed("inner comparison-desc", true).style("flex", "1").style("padding", "10px").style("padding-bottom", "0px").style("display", "flex");

    //d3_updateable(inner_desc,"h3","h3")
    //  .text("(Filters applied to this segment)")
    //  .style("margin","10px")
    //  .style("color","inherit")
    //  .style("font-size","inherit")
    //  .style("font-weight","bold")
    //  .style("text-transform","uppercase")
    //  .style("flex","1")

    d3_updateable(inner_desc, ".bar-wrap-title", "h3").classed("bar-wrap-title", true).style("flex", "1 1 0%").style("margin", "0px").style("line-height", "32px").style("color", "inherit").style("font-size", "inherit").style("font-weight", "bold").style("text-transform", "uppercase").style("padding-left", "10px").style("margin-right", "10px").style("margin-top", "2px").style("margin-bottom", "2px").style("height", "100%").style("text-align", "right").text("views");

    d3_updateable(inner_desc2, ".bar-wrap-title", "h3").classed("bar-wrap-title", true).style("flex", "1 1 0%").style("margin", "0px").style("line-height", "32px").style("color", "inherit").style("font-size", "inherit").style("font-weight", "bold").style("text-transform", "uppercase").style("padding-left", "10px").style("margin-right", "10px").style("margin-top", "2px").style("margin-bottom", "2px").style("height", "100%").style("text-align", "right").text("views");

    var bar_samp = d3_updateable(inner_desc, "div.bar-wrap", "div").classed("bar-wrap", true).style("flex", "2 1 0%").style("margin-top", "8px");

    d3_updateable(inner_desc, ".bar-wrap-space", "div").classed("bar-wrap-space", true).style("flex", "1 1 0%").style("line-height", "36px").style("padding-left", "10px").text(d3.format(",")(this._data.views.sample));

    d3_updateable(inner_desc, ".bar-wrap-opt", "div").classed("bar-wrap-opt", true).style("flex", "2 1 0%").style("line-height", "36px");
    //.text("apply filters?")


    var xscale = d3.scale.linear().domain([0, Math.max(this._data.views.sample, this._data.views.population)]).range([0, bar_samp.style("width")]);

    var bar_pop = d3_updateable(inner_desc2, "div.bar-wrap", "div").classed("bar-wrap", true).style("flex", "2 1 0%").style("margin-top", "8px");

    d3_updateable(inner_desc2, ".bar-wrap-space", "div").classed("bar-wrap-space", true).style("flex", "1 1 0%").style("line-height", "36px").style("padding-left", "10px").text(d3.format(",")(this._data.views.population));

    d3_updateable(inner_desc2, ".bar-wrap-opt", "div").classed("bar-wrap-opt", true).style("flex", "2 1 0%").style("margin", "0px").style("line-height", "32px").style("color", "inherit").style("font-size", "inherit").style("font-weight", "bold").style("text-transform", "uppercase").style("height", "100%").style("text-align", "right").html("apply filters? <input type='checkbox'></input>");

    simpleBar(bar_samp, this._data.views.sample, xscale, "#081d58");
    simpleBar(bar_pop, this._data.views.population, xscale, "grey");

    d3_updateable(inner2, "h3", "h3").text("Compare Against").style("line-height", "32px").style("margin", "0px").style("color", "inherit").style("font-size", "inherit").style("font-weight", "bold").style("flex", "1").style("text-transform", "uppercase").style("background", "#e3ebf0").style("padding-left", "10px").style("margin-right", "10px").style("margin-top", "2px").style("margin-bottom", "2px").style("height", "100%");

    d3_updateable(inner2, "div.color", "div").classed("color", true).style("background-color", "grey").style("width", "10px").style("height", "32px").style("margin-top", "2px").style("margin-right", "10px").style("margin-left", "-10px");

    select(inner2).options([{ "key": "Current Segment (without filters)", "value": false }].concat(this._segments)).on("select", function (x) {

      self.on("comparison.change").bind(this)(x);
    }).selected(this._comparison.value || 0).draw();

    var cal2 = d3_updateable(inner2, "a.fa-calendar", "a").style("line-height", "34px").style("width", "36px").style("border", "1px solid #ccc").style("border-radius", "5px").classed("fa fa-calendar", true).style("text-align", "center").style("margin-left", "5px").on("click", function (x) {
      calsel2.node();
    });

    var calsel2 = select(cal2).options([{ "key": "Today", "value": 0 }, { "key": "Yesterday", "value": 1 }, { "key": "7 days ago", "value": 7 }]).on("select", function (x) {
      self.on("comparison_date.change").bind(this)(x.value);
    }).selected(this._comparison_date || 0).draw()._select.style("width", "18px").style("margin-left", "-18px").style("height", "34px").style("opacity", ".01").style("flex", "none").style("border", "none");

    return this;
  },
  action_date: function action_date(val) {
    return accessor$2.bind(this)("action_date", val);
  },
  action: function action(val) {
    return accessor$2.bind(this)("action", val);
  },
  comparison_date: function comparison_date(val) {
    return accessor$2.bind(this)("comparison_date", val);
  },

  comparison: function comparison(val) {
    return accessor$2.bind(this)("comparison", val);
  },
  is_loading: function is_loading(val) {
    return accessor$2.bind(this)("is_loading", val);
  },

  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$9;
    this._on[action] = fn;
    return this;
  }
};

function diff_bar(target) {
  return new DiffBar(target);
}

// data format: [{key, normalized_diff}, ... ]

var DiffBar = function () {
  function DiffBar(target) {
    classCallCheck(this, DiffBar);

    this._target = target;

    this._key_accessor = "key";
    this._value_accessor = "value";
    this._bar_height = 20;
    this._bar_width = 150;
  }

  createClass(DiffBar, [{
    key: 'key_accessor',
    value: function key_accessor(val) {
      return accessor$2.bind(this)("key_accessor", val);
    }
  }, {
    key: 'value_accessor',
    value: function value_accessor(val) {
      return accessor$2.bind(this)("value_accessor", val);
    }
  }, {
    key: 'bar_height',
    value: function bar_height(val) {
      return accessor$2.bind(this)("bar_height", val);
    }
  }, {
    key: 'bar_width',
    value: function bar_width(val) {
      return accessor$2.bind(this)("bar_width", val);
    }
  }, {
    key: 'data',
    value: function data(val) {
      return accessor$2.bind(this)("data", val);
    }
  }, {
    key: 'title',
    value: function title(val) {
      return accessor$2.bind(this)("title", val);
    }
  }, {
    key: 'draw',
    value: function draw() {

      var w = d3_updateable(this._target, ".diff-wrap", "div", false, function () {
        return 1;
      }).classed("diff-wrap", true);

      d3_updateable(w, "h3", "h3").text(this._title);

      var wrap = d3_updateable(w, ".svg-wrap", "div", this._data, function (x) {
        return 1;
      }).classed("svg-wrap", true);

      var k = this.key_accessor(),
          v = this.value_accessor(),
          height = this.bar_height(),
          bar_width = this.bar_width();

      var keys = this._data.map(function (x) {
        return x[k];
      }),
          max = d3.max(this._data, function (x) {
        return x[v];
      }),
          sampmax = d3.max(this._data, function (x) {
        return -x[v];
      });

      var xsampscale = d3.scale.linear().domain([0, sampmax]).range([0, bar_width]),
          xscale = d3.scale.linear().domain([0, max]).range([0, bar_width]),
          yscale = d3.scale.linear().domain([0, keys.length]).range([0, keys.length * height]);

      var canvas = d3_updateable(wrap, "svg", "svg", false, function () {
        return 1;
      }).attr({ "width": bar_width * 3, "height": keys.length * height + 10 });

      var xAxis = d3.svg.axis();
      xAxis.orient('bottom').scale(xscale);

      var yAxis = d3.svg.axis();
      yAxis.orient('left').scale(yscale).tickSize(2).tickFormat(function (d, i) {
        return keys[i];
      }).tickValues(d3.range(keys.length));

      var y_xis = d3_updateable(canvas, 'g.y', 'g').attr("class", "y axis").attr("transform", "translate(" + (bar_width + bar_width / 2) + ",15)").attr('id', 'yaxis').call(yAxis);

      y_xis.selectAll("text").attr("style", "text-anchor: middle;");

      var chart = d3_updateable(canvas, 'g.chart', 'g').attr("class", "chart").attr("transform", "translate(" + bar_width * 2 + ",0)").attr('id', 'bars');

      var bars = d3_splat(chart, ".pop-bar", "rect", function (x) {
        return x;
      }, function (x) {
        return x.key;
      }).attr("class", "pop-bar").attr('height', height - 4).attr({ 'x': 0, 'y': function y(d, i) {
          return yscale(i) + 8.5;
        } }).style('fill', '#388e3c').attr("width", function (x) {
        return xscale(x[v]);
      });

      var chart2 = d3_updateable(canvas, 'g.chart2', 'g').attr("class", "chart2").attr("transform", "translate(0,0)").attr('id', 'bars');

      var sampbars = d3_splat(chart2, ".samp-bar", "rect", function (x) {
        return x;
      }, function (x) {
        return x.key;
      }).attr("class", "samp-bar").attr('height', height - 4).attr({ 'x': function x(_x) {
          return bar_width - xsampscale(-_x[v]);
        }, 'y': function y(d, i) {
          return yscale(i) + 8.5;
        } }).style('fill', '#d32f2f').attr("width", function (x) {
        return xsampscale(-x[v]);
      });

      y_xis.exit().remove();

      chart.exit().remove();
      chart2.exit().remove();

      bars.exit().remove();
      sampbars.exit().remove();

      return this;
    }
  }]);
  return DiffBar;
}();

function comp_bar(target) {
  return new CompBar(target);
}

// data format: [{key, normalized_diff}, ... ]

var CompBar = function () {
  function CompBar(target) {
    classCallCheck(this, CompBar);

    this._target = target;

    this._key_accessor = "key";
    this._pop_value_accessor = "value";
    this._samp_value_accessor = "value";

    this._bar_height = 20;
    this._bar_width = 300;
  }

  createClass(CompBar, [{
    key: 'key_accessor',
    value: function key_accessor(val) {
      return accessor$2.bind(this)("key_accessor", val);
    }
  }, {
    key: 'pop_value_accessor',
    value: function pop_value_accessor(val) {
      return accessor$2.bind(this)("pop_value_accessor", val);
    }
  }, {
    key: 'samp_value_accessor',
    value: function samp_value_accessor(val) {
      return accessor$2.bind(this)("samp_value_accessor", val);
    }
  }, {
    key: 'bar_height',
    value: function bar_height(val) {
      return accessor$2.bind(this)("bar_height", val);
    }
  }, {
    key: 'bar_width',
    value: function bar_width(val) {
      return accessor$2.bind(this)("bar_width", val);
    }
  }, {
    key: 'data',
    value: function data(val) {
      return accessor$2.bind(this)("data", val);
    }
  }, {
    key: 'title',
    value: function title(val) {
      return accessor$2.bind(this)("title", val);
    }
  }, {
    key: 'draw',
    value: function draw() {

      var w = d3_updateable(this._target, ".comp-wrap", "div", false, function () {
        return 1;
      }).classed("comp-wrap", true);

      d3_updateable(w, "h3", "h3").text(this._title);

      var wrap = d3_updateable(w, ".svg-wrap", "div", this._data, function (x) {
        return 1;
      }).classed("svg-wrap", true);

      var k = this.key_accessor(),
          p = this.pop_value_accessor(),
          s = this.samp_value_accessor(),
          height = this.bar_height(),
          bar_width = this.bar_width();

      var keys = this._data.map(function (x) {
        return x[k];
      }),
          max = d3.max(this._data, function (x) {
        return x[p];
      }),
          sampmax = d3.max(this._data, function (x) {
        return x[s];
      });

      var xsampscale = d3.scale.linear().domain([0, sampmax]).range([0, bar_width]),
          xscale = d3.scale.linear().domain([0, max]).range([0, bar_width]),
          yscale = d3.scale.linear().domain([0, keys.length]).range([0, keys.length * height]);

      var canvas = d3_updateable(wrap, "svg", "svg", false, function () {
        return 1;
      }).attr({ "width": bar_width + bar_width / 2, "height": keys.length * height + 10 });

      var xAxis = d3.svg.axis();
      xAxis.orient('bottom').scale(xscale);

      var yAxis = d3.svg.axis();
      yAxis.orient('left').scale(yscale).tickSize(2).tickFormat(function (d, i) {
        return keys[i];
      }).tickValues(d3.range(keys.length));

      var y_xis = d3_updateable(canvas, 'g.y', 'g').attr("class", "y axis").attr("transform", "translate(" + bar_width / 2 + ",15)").attr('id', 'yaxis').call(yAxis);

      y_xis.selectAll("text");

      var chart = d3_updateable(canvas, 'g.chart', 'g').attr("class", "chart").attr("transform", "translate(" + bar_width / 2 + ",0)").attr('id', 'bars');

      var bars = d3_splat(chart, ".pop-bar", "rect", function (x) {
        return x;
      }, function (x) {
        return x.key;
      }).attr("class", "pop-bar").attr('height', height - 2).attr({ 'x': 0, 'y': function y(d, i) {
          return yscale(i) + 7.5;
        } }).style('fill', 'gray').attr("width", function (x) {
        return xscale(x[p]);
      });

      var sampbars = d3_splat(chart, ".samp-bar", "rect", function (x) {
        return x;
      }, function (x) {
        return x.key;
      }).attr("class", "samp-bar").attr('height', height - 10).attr({ 'x': 0, 'y': function y(d, i) {
          return yscale(i) + 11.5;
        } }).style('fill', '#081d58').attr("width", function (x) {
        return xsampscale(x[s] || 0);
      });

      y_xis.exit().remove();

      chart.exit().remove();

      bars.exit().remove();
      sampbars.exit().remove();

      return this;
    }
  }]);
  return CompBar;
}();

function drawCategoryDiff(target, data) {

  diff_bar(target).data(data).title("Category indexing versus comp").value_accessor("normalized_diff").draw();
}

function drawCategory(target, data) {

  comp_bar(target).data(data).title("Categories visited for filtered versus all views").pop_value_accessor("pop").samp_value_accessor("samp").draw();
}

function comp_bubble(target) {
  return new CompBubble(target);
}

// data format: [{key, normalized_diff}, ... ]

var CompBubble = function () {
  function CompBubble(target) {
    classCallCheck(this, CompBubble);

    this._target = target;

    this._key_accessor = "key";

    this._height = 20;
    this._space = 14;
    this._middle = 180;
    this._legend_width = 80;

    this._buckets = [10, 30, 60, 120, 180, 360, 720, 1440, 2880, 5760, 10080].map(function (x) {
      return x * 60;
    });
    this._rows = [];
  }

  createClass(CompBubble, [{
    key: 'key_accessor',
    value: function key_accessor(val) {
      return accessor$2.bind(this)("key_accessor", val);
    }
  }, {
    key: 'value_accessor',
    value: function value_accessor(val) {
      return accessor$2.bind(this)("value_accessor", val);
    }
  }, {
    key: 'height',
    value: function height(val) {
      return accessor$2.bind(this)("height", val);
    }
  }, {
    key: 'space',
    value: function space(val) {
      return accessor$2.bind(this)("space", val);
    }
  }, {
    key: 'middle',
    value: function middle(val) {
      return accessor$2.bind(this)("middle", val);
    }
  }, {
    key: 'buckets',
    value: function buckets(val) {
      return accessor$2.bind(this)("buckets", val);
    }
  }, {
    key: 'rows',
    value: function rows(val) {
      return accessor$2.bind(this)("rows", val);
    }
  }, {
    key: 'after',
    value: function after(val) {
      return accessor$2.bind(this)("after", val);
    }
  }, {
    key: 'data',
    value: function data(val) {
      return accessor$2.bind(this)("data", val);
    }
  }, {
    key: 'title',
    value: function title(val) {
      return accessor$2.bind(this)("title", val);
    }
  }, {
    key: 'buildScales',
    value: function buildScales() {

      var rows = this.rows(),
          buckets = this.buckets(),
          height = this.height(),
          space = this.space();

      this._yscale = d3.scale.linear().domain([0, rows.length]).range([0, rows.length * height]);

      this._xscale = d3.scale.ordinal().domain(buckets).range(d3.range(0, buckets.length * (height + space), height + space));

      this._xscalereverse = d3.scale.ordinal().domain(buckets.reverse()).range(d3.range(0, buckets.length * (height + space), height + space));

      this._rscale = d3.scale.pow().exponent(0.5).domain([0, 1]).range([.35, 1]);

      this._oscale = d3.scale.quantize().domain([-1, 1]).range(['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b']);
    }
  }, {
    key: 'drawLegend',
    value: function drawLegend() {
      var canvas = this._canvas,
          buckets = this.buckets(),
          height = this.height(),
          space = this.space(),
          middle = this.middle(),
          legendtw = this._legend_width,
          rscale = this._rscale,
          oscale = this._oscale;

      var legend = d3_updateable(canvas, 'g.legend', 'g').attr("class", "legend").attr("transform", "translate(" + (buckets.length * (height + space) * 2 + middle - 310) + ",-130)");

      var size = d3_updateable(legend, 'g.size', 'g').attr("class", "size").attr("transform", "translate(" + (legendtw + 10) + ",0)");

      d3_updateable(size, "text.more", "text").attr("class", "more axis").attr("x", -legendtw).html("more activity").style("text-transform", "uppercase").style("font-size", ".6em").style("font-weight", "bold").attr("dominant-baseline", "central");

      d3_updateable(size, "text.more-arrow", "text").attr("class", "more-arrow axis").attr("x", -legendtw - 10).html("&#9664;").style("text-transform", "uppercase").style("font-size", ".6em").style("font-weight", "bold").style("font-size", ".7em").attr("dominant-baseline", "central");

      d3_updateable(size, "text.less", "text").attr("class", "less axis").attr("x", (height + 4) * 5 + legendtw).style("text-anchor", "end").html("less activity").style("text-transform", "uppercase").style("font-size", ".6em").style("font-weight", "bold").attr("dominant-baseline", "central");

      d3_updateable(size, "text.less-arrow", "text").attr("class", "less-arrow axis").attr("x", (height + 4) * 5 + legendtw + 10).html("&#9654;").style("text-anchor", "end").style("text-transform", "uppercase").style("font-size", ".6em").style("font-weight", "bold").style("font-size", ".7em").attr("dominant-baseline", "central");

      d3_splat(size, "circle", "circle", [1, .6, .3, .1, 0]).attr("r", function (x) {
        return (height - 2) / 2 * rscale(x);
      }).attr('cx', function (d, i) {
        return (height + 4) * i + height / 2;
      }).attr('stroke', 'grey').attr('fill', 'none');

      var size = d3_updateable(legend, 'g.importance', 'g').attr("class", "importance").attr("transform", "translate(" + (legendtw + 10) + ",25)");

      d3_updateable(size, "text.more", "text").attr("class", "more axis").attr("x", -legendtw).html("more important").style("text-transform", "uppercase").style("font-size", ".6em").style("font-weight", "bold").attr("dominant-baseline", "central");

      d3_updateable(size, "text.more-arrow", "text").attr("class", "more-arrow axis").attr("x", -legendtw - 10).html("&#9664;").style("text-transform", "uppercase").style("font-size", ".6em").style("font-weight", "bold").style("font-size", ".7em").attr("dominant-baseline", "central");

      d3_updateable(size, "text.less", "text").attr("class", "less axis").attr("x", (height + 4) * 5 + legendtw).style("text-anchor", "end").html("less important").style("text-transform", "uppercase").style("font-size", ".6em").style("font-weight", "bold").attr("dominant-baseline", "central");

      d3_updateable(size, "text.less-arrow", "text").attr("class", "less-arrow axis").attr("x", (height + 4) * 5 + legendtw + 10).html("&#9654;").style("text-anchor", "end").style("text-transform", "uppercase").style("font-size", ".6em").style("font-weight", "bold").style("font-size", ".7em").attr("dominant-baseline", "central");

      d3_splat(size, "circle", "circle", [1, .75, .5, .25, 0]).attr("r", height / 2 - 2).attr("fill", function (x) {
        return oscale(x);
      }).attr("opacity", function (x) {
        return rscale(x / 2 + .2);
      }).attr('cx', function (d, i) {
        return (height + 4) * i + height / 2;
      });
    }
  }, {
    key: 'drawAxes',
    value: function drawAxes() {
      var canvas = this._canvas,
          buckets = this.buckets(),
          height = this.height(),
          space = this.space(),
          middle = this.middle(),
          legendtw = this._legend_width,
          rscale = this._rscale,
          oscale = this._oscale,
          xscale = this._xscale,
          yscale = this._yscale,
          xscalereverse = this._xscalereverse,
          rows = this._rows;

      var xAxis = d3.svg.axis();
      xAxis.orient('top').scale(xscalereverse).tickFormat(function (x) {
        if (x == 3600) return "1 hour";
        if (x < 3600) return x / 60 + " mins";

        if (x == 86400) return "1 day";
        if (x > 86400) return x / 86400 + " days";

        return x / 3600 + " hours";
      });

      var x_xis = d3_updateable(canvas, 'g.x.before', 'g').attr("class", "x axis before").attr("transform", "translate(" + (height + space) + ",-4)").attr('id', 'xaxis').call(xAxis);

      x_xis.selectAll("text").attr("y", -8).attr("x", -8).attr("dy", ".35em").attr("transform", "rotate(45)").style("text-anchor", "end");

      x_xis.selectAll("line").attr("style", "stroke:black");

      x_xis.selectAll("path").attr("style", "stroke:black; display:inherit");

      d3_updateable(x_xis, "text.title", "text").attr("class", "title").attr("x", buckets.length * (height + space) / 2 - height + space).attr("y", -53).attr("transform", undefined).style("text-anchor", "middle").style("text-transform", "uppercase").style("font-weight", "bold").text("before arriving");

      var xAxis = d3.svg.axis();
      xAxis.orient('top').scale(xscale).tickFormat(function (x) {
        if (x == 3600) return "1 hour";
        if (x < 3600) return x / 60 + " mins";

        if (x == 86400) return "1 day";
        if (x > 86400) return x / 86400 + " days";

        return x / 3600 + " hours";
      });

      var x_xis = d3_updateable(canvas, 'g.x.after', 'g').attr("class", "x axis after").attr("transform", "translate(" + (buckets.length * (height + space) + middle) + ",0)").attr('id', 'xaxis').call(xAxis);

      x_xis.selectAll("text").attr("y", -8).attr("x", 8).attr("dy", ".35em").attr("transform", "rotate(-45)").style("text-anchor", "start");

      x_xis.selectAll("line").attr("style", "stroke:black");

      x_xis.selectAll("path").attr("style", "stroke:black; display:inherit");

      d3_updateable(x_xis, "text.title", "text").attr("class", "title").attr("x", buckets.length * (height + space) / 2).attr("y", -53).attr("transform", undefined).style("text-anchor", "middle").style("text-transform", "uppercase").style("font-weight", "bold").text("after leaving");

      var yAxis = d3.svg.axis();
      yAxis.orient('left').scale(yscale).tickSize(2).tickFormat(function (d, i) {
        return rows[i].key;
      }).tickValues(d3.range(rows.length));

      var y_xis = d3_updateable(canvas, 'g.y', 'g').attr("class", "y axis").attr("transform", "translate(" + (buckets.length * (height + space) + 0) + ",15)").attr('id', 'yaxis');

      y_xis.call(yAxis);

      y_xis.selectAll("line").attr("x2", 18).attr("x1", 22).style("stroke-dasharray", "0").remove();

      y_xis.selectAll("path").attr("x2", 18).attr("transform", "translate(18,0)");
      //.style("stroke","black")


      //.remove()


      y_xis.selectAll("text").attr("style", "text-anchor: middle; font-weight:bold; fill: #333").attr("x", middle / 2);
    }
  }, {
    key: 'draw',
    value: function draw() {

      var buckets = this.buckets(),
          height = this.height(),
          space = this.space(),
          middle = this.middle(),
          legendtw = this._legend_width,
          rows = this.rows();

      var svg = d3_updateable(this._target, "svg", "svg", false, function () {
        return 1;
      }).style("margin-left", "10px").style("margin-top", "-5px").attr({ 'width': buckets.length * (height + space) * 2 + middle, 'height': rows.length * height + 165 }).attr("xmlns", "http://www.w3.org/2000/svg");

      this._svg = svg;

      this._canvas = d3_updateable(svg, ".canvas", "g").attr("class", "canvas").attr("transform", "translate(0,140)");

      this.buildScales();
      this.drawLegend();
      this.drawAxes();

      var canvas = this._canvas,
          rscale = this._rscale,
          oscale = this._oscale,
          xscale = this._xscale,
          yscale = this._yscale,
          xscalereverse = this._xscalereverse,
          rows = this.rows();

      var chart_before = d3_updateable(canvas, 'g.chart-before', 'g', this.rows(), function () {
        return 1;
      }).attr("class", "chart-before").attr("transform", "translate(" + buckets.length * (height + space) + ",0)").attr('id', 'bars');

      var rows = d3_splat(chart_before, ".row", "g", function (x) {
        return x;
      }, function (x) {
        return x.key;
      }).attr("class", "row").attr({ 'transform': function transform(d, i) {
          return "translate(0," + (yscale(i) + 7.5) + ")";
        } }).attr({ 'label': function label(d, i) {
          return d.key;
        } });

      rows.exit().remove();

      var bars = d3_splat(rows, ".pop-bar", "circle", function (x) {
        return x.values;
      }, function (x) {
        return x.key;
      }).attr("class", "pop-bar").attr('cy', (height - 2) / 2).attr({ 'cx': function cx(d, i) {
          return -xscale(d.key);
        } }).attr("opacity", ".8").attr("r", function (x) {
        return height / 2 * rscale(x.norm_time);
      }).style("fill", function (x) {
        return oscale(x.percent_diff);
      });

      var chart_after = d3_updateable(canvas, 'g.chart-after', 'g', this._after, function () {
        return 1;
      }).attr("class", "chart-after").attr("transform", "translate(" + (buckets.length * (height + space) + middle) + ",0)").attr('id', 'bars');

      var rows = d3_splat(chart_after, ".row", "g", function (x) {
        return x;
      }, function (x) {
        return x.key;
      }).attr("class", "row").attr({ 'transform': function transform(d, i) {
          return "translate(0," + (yscale(i) + 7.5) + ")";
        } }).attr({ 'label': function label(d, i) {
          return d.key;
        } });

      rows.exit().remove();

      var bars = d3_splat(rows, ".pop-bar", "circle", function (x) {
        return x.values;
      }, function (x) {
        return x.key;
      }).attr("class", "pop-bar").attr('cy', (height - 2) / 2).attr({ 'cx': function cx(d, i) {
          return xscale(d.key);
        } }).attr("r", function (x) {
        return (height - 2) / 2 * rscale(x.norm_time);
      }).style("fill", function (x) {
        return oscale(x.percent_diff);
      }).attr("opacity", ".8");

      return this;
    }
  }]);
  return CompBubble;
}();

function stream_plot(target) {
  return new StreamPlot(target);
}

function drawAxis(target, scale, text, width) {
  var xAxis = d3.svg.axis();
  xAxis.orient('top').scale(scale).tickFormat(function (x) {
    if (x == 3600) return "1 hour";
    if (x < 3600) return x / 60 + " mins";

    if (x == 86400) return "1 day";
    if (x > 86400) return x / 86400 + " days";

    return x / 3600 + " hours";
  });

  var x_xis = d3_updateable(target, 'g.x.before', 'g').attr("class", "x axis before").attr("transform", "translate(0,-5)").attr('id', 'xaxis').call(xAxis);

  x_xis.selectAll("text").attr("y", -25).attr("x", 15).attr("dy", ".35em").attr("transform", "rotate(45)").style("text-anchor", "end");

  x_xis.selectAll("line").attr("style", "stroke:black");

  x_xis.selectAll("path").attr("style", "stroke:black; display:inherit");

  d3_updateable(x_xis, "text.title", "text").attr("class", "title").attr("x", width / 2).attr("y", -46).attr("transform", undefined).style("text-anchor", "middle").style("text-transform", "uppercase").style("font-weight", "bold").text(text + " ");

  return x_xis;
}

var StreamPlot = function () {
  function StreamPlot(target) {
    classCallCheck(this, StreamPlot);

    this._target = target;
    this._on = {};
    this._buckets = [0, 10, 30, 60, 120, 180, 360, 720, 1440, 2880, 5760, 10080].map(function (x) {
      return x * 60;
    });

    this._width = 370;
    this._height = 250;
    this._middle = 180;
    this._color = d3.scale.ordinal().range(['#999', '#aaa', '#bbb', '#ccc', '#ddd', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', 'rgba(33, 113, 181,.9)', 'rgba(8, 81, 156,.91)', '#08519c', 'rgba(8, 48, 107,.9)', '#08306b'].reverse());
  }

  createClass(StreamPlot, [{
    key: 'key_accessor',
    value: function key_accessor(val) {
      return accessor$2.bind(this)("key_accessor", val);
    }
  }, {
    key: 'value_accessor',
    value: function value_accessor(val) {
      return accessor$2.bind(this)("value_accessor", val);
    }
  }, {
    key: 'height',
    value: function height(val) {
      return accessor$2.bind(this)("height", val);
    }
  }, {
    key: 'width',
    value: function width(val) {
      return accessor$2.bind(this)("width", val);
    }
  }, {
    key: 'middle',
    value: function middle(val) {
      return accessor$2.bind(this)("middle", val);
    }
  }, {
    key: 'skip_middle',
    value: function skip_middle(val) {
      return accessor$2.bind(this)("skip_middle", val);
    }
  }, {
    key: 'data',
    value: function data(val) {
      return accessor$2.bind(this)("data", val);
    }
  }, {
    key: 'title',
    value: function title(val) {
      return accessor$2.bind(this)("title", val);
    }
  }, {
    key: 'draw',
    value: function draw() {

      var data = this._data,
          order = data.order,
          buckets = this._buckets,
          before_stacked = data.before_stacked,
          after_stacked = data.after_stacked,
          height = this._height,
          width = this._width,
          target = this._target,
          color = this._color,
          self = this;

      color.domain(order);

      var y = d3.scale.linear().range([height, 0]).domain([0, d3.max(before_stacked, function (layer) {
        return d3.max(layer, function (d) {
          return d.y0 + d.y;
        });
      })]);

      var x = d3.scale.ordinal().domain(buckets).range(d3.range(0, width + 10, width / (buckets.length - 1)));

      var xreverse = d3.scale.ordinal().domain(buckets.slice().reverse()).range(d3.range(0, width + 10, width / (buckets.length - 1)));

      this._before_scale = xreverse;
      this._after_scale = x;

      var barea = d3.svg.area().interpolate("zero").x(function (d) {
        return xreverse(d.x);
      }).y0(function (d) {
        return y(d.y0);
      }).y1(function (d) {
        return y(d.y0 + d.y);
      });

      var aarea = d3.svg.area().interpolate("linear").x(function (d) {
        return x(d.x);
      }).y0(function (d) {
        return y(d.y0);
      }).y1(function (d) {
        return y(d.y0 + d.y);
      });

      var svg = d3_updateable(target, "svg", "svg").attr("width", width * 2 + this._middle).attr("height", height + 100);

      this._svg = svg;

      var before = d3_updateable(svg, ".before-canvas", "g").attr("class", "before-canvas").attr("transform", "translate(-1,60)");

      function hoverCategory(cat, time) {
        if (cat === false) {
          self.on("category.hover")(false);
        }
        apaths.style("opacity", ".5");
        bpaths.style("opacity", ".5");
        apaths.filter(function (y) {
          return y[0].key == cat;
        }).style("opacity", undefined);
        bpaths.filter(function (y) {
          return y[0].key == cat;
        }).style("opacity", undefined);
        d3.select(this).style("opacity", undefined);

        d3_updateable(middle, "text", "text").style("text-anchor", "middle").style("text-transform", "uppercase").style("font-weight", "bold").style("font-size", "10px").style("color", "#333").style("opacity", ".65").text(cat);

        var mwrap = d3_updateable(middle, "g", "g");

        self.on("category.hover").bind(mwrap.node())(cat, time);
      }

      var b = d3_updateable(before, "g", "g");

      function mOver(x) {
        hoverCategory.bind(this)(x[0].key);
      }
      function mOut(x) {
        hoverCategory.bind(this)(false);
        apaths.style("opacity", undefined);
        bpaths.style("opacity", undefined);
      }
      function click(x) {
        var bool = apaths.on("mouseover") == mOver;

        apaths.on("mouseover", bool ? noop$2 : mOver);
        apaths.on("mouseout", bool ? noop$2 : mOut);
        bpaths.on("mouseover", bool ? noop$2 : mOver);
        bpaths.on("mouseout", bool ? noop$2 : mOut);
      }

      var bpaths = d3_splat(b, "path", "path", before_stacked, function (x, i) {
        return x[0].key;
      }).attr("d", barea).attr("class", function (x) {
        return x[0].key;
      }).style("fill", function (x, i) {
        return color(x[0].key);
      }).on("mouseover", mOver).on("mouseout", mOut).on("click", click);

      bpaths.exit().remove();

      var brect = d3_splat(b, "rect", "rect", buckets.slice().reverse(), function (x, i) {
        return i;
      }).attr("x", function (z) {
        return xreverse(z);
      }).attr("width", 1).attr("height", height).attr("y", 0).attr("opacity", "0");

      var middle = d3_updateable(svg, ".middle-canvas", "g").attr("class", "middle-canvas").attr("transform", "translate(" + (width + this._middle / 2) + ",60)").style("display", this._skip_middle ? "none" : "inherit");

      var after = d3_updateable(svg, ".after-canvas", "g").attr("class", "after-canvas").attr("transform", "translate(" + (width + this._middle) + ",60)");

      var a = d3_updateable(after, "g", "g");

      var apaths = d3_splat(a, "path", "path", after_stacked, function (x, i) {
        return x[0].key;
      }).attr("d", aarea).attr("class", function (x) {
        return x[0].key;
      }).style("fill", function (x, i) {
        return color(x[0].key);
      }).on("mouseover", mOver).on("mouseout", mOut).on("click", click);

      apaths.exit().remove();

      var _x_xis = drawAxis(before, xreverse, "before arriving", width);

      _x_xis.selectAll("text").filter(function (y) {
        return y == 0;
      }).remove();

      var _x_xis = drawAxis(after, x, "after leaving", width);

      _x_xis.selectAll("text:not(.title)").attr("transform", "rotate(-45)").attr("x", 20).attr("y", -25);

      _x_xis.selectAll("text").filter(function (y) {
        return y == 0;
      }).remove();

      return this;
    }
  }, {
    key: 'on',
    value: function on(action, fn) {
      if (fn === undefined) return this._on[action] || noop$2;
      this._on[action] = fn;
      return this;
    }
  }]);
  return StreamPlot;
}();

function buildStreamData(data, buckets) {

  var units_in_bucket = buckets.map(function (x, i) {
    return x - (x[i - 1] || 0);
  });

  var stackable = data.map(function (d) {
    var valuemap = d.values.reduce(function (p, c) {
      p[c.key] = c.values;return p;
    }, {});
    var percmap = d.values.reduce(function (p, c) {
      p[c.key] = c.percent;return p;
    }, {});

    var vmap = d.values.reduce(function (p, c) {
      p[c.key] = c.norm_cat;return p;
    }, {});

    var normalized_values = buckets.map(function (x, i) {
      if (x == 0) return { key: d.key, x: parseInt(x), y: vmap["600"] || 0, values: valuemap["600"] || 0, percent: percmap["600"] || 0 };
      return { key: d.key, x: parseInt(x), y: vmap[x] || 0, values: valuemap[x] || 0, percent: percmap[x] || 0 };
    });

    return normalized_values;
    //return e2.concat(normalized_values)//.concat(extra)
  });

  stackable = stackable.sort(function (p, c) {
    return p[0].y - c[0].y;
  }).reverse().slice(0, 12);

  return stackable;
}

function streamData(before, after, buckets) {
  var stackable = buildStreamData(before, buckets);
  var stack = d3.layout.stack().offset("wiggle").order("reverse");
  var before_stacked = stack(stackable);

  var order = before_stacked.map(function (item) {
    return item[0].key;
  });

  var stackable = buildStreamData(after, buckets).sort(function (p, c) {
    return order.indexOf(c[0].key) - order.indexOf(p[0].key);
  });

  stackable = stackable.filter(function (x) {
    return order.indexOf(x[0].key) == -1;
  }).concat(stackable.filter(function (x) {
    return order.indexOf(x[0].key) > -1;
  }));

  var stack = d3.layout.stack().offset("wiggle").order("default");
  var after_stacked = stack(stackable);

  return {
    order: order,
    before_stacked: before_stacked,
    after_stacked: after_stacked
  };
}

function drawStreamSkinny(target, before, after, filter) {

  function extractData(b, a, buckets, accessor$$1) {
    var bvolume = {},
        avolume = {};

    try {
      var bvolume = b[0].reduce(function (p, c) {
        p[c.x] = accessor$$1(c);return p;
      }, {});
    } catch (e) {}
    try {
      var avolume = a[0].reduce(function (p, c) {
        p[c.x] = accessor$$1(c);return p;
      }, {});
    } catch (e) {}

    var volume = buckets.slice().reverse().map(function (x) {
      return bvolume[x] || 0;
    }).concat(buckets.map(function (x) {
      return avolume[x] || 0;
    }));

    return volume;
  }

  var buckets = [0, 10, 30, 60, 120, 180, 360, 720, 1440, 2880, 5760, 10080].map(function (x) {
    return x * 60;
  });

  var data = streamData(before, after, buckets),
      before_stacked = data.before_stacked,
      after_stacked = data.after_stacked;

  var before = d3_class(target, "before-stream");

  var inner = d3_updateable(before, ".inner", "div").classed("inner", true);

  var stream = stream_plot(inner).width(341).middle(0).skip_middle(true).data(data).on("category.hover", function (x, time) {
    filter(x);
    if (x === false) {
      d3.select(".details-wrap").html("");
      return;
    }
    var b = data.before_stacked.filter(function (y) {
      return y[0].key == x;
    });
    var a = data.after_stacked.filter(function (y) {
      return y[0].key == x;
    });

    var volume = extractData(b, a, buckets, function (c) {
      return c.values.length;
    }),
        percent = extractData(b, a, buckets, function (c) {
      return c.percent;
    }),
        importance = extractData(b, a, buckets, function (c) {
      return c.y;
    });

    var wrap = d3.select(".details-wrap"),
        title = d3_updateable(wrap, "text.cat-title", "text").text(x).attr("class", "cat-title").style("text-anchor", "middle").style("font-weight", "bold").attr("x", 125).attr("y", 10),
        vwrap = d3_updateable(wrap, ".volume", "g").attr("class", "volume").attr("transform", "translate(15,30)");

    d3_updateable(vwrap, "text", "text").text("Visits: " + d3.sum(volume)).attr("style", "title");

    return;
  }).draw();

  var before_agg = before_stacked.reduce(function (o, x) {
    return x.reduce(function (p, c) {
      p[c.x] = (p[c.x] || 0) + c.y;return p;
    }, o);
  }, {}),
      after_agg = after_stacked.reduce(function (o, x) {
    return x.reduce(function (p, c) {
      p[c.x] = (p[c.x] || 0) + c.y;return p;
    }, o);
  }, {});

  var local_before = Object.keys(before_agg).reduce(function (minarr, c) {
    if (minarr[0] >= before_agg[c]) return [before_agg[c], c];
    if (minarr.length > 1) minarr[0] = -1;
    return minarr;
  }, [Infinity])[1];

  var local_after = Object.keys(after_agg).reduce(function (minarr, c) {
    if (minarr[0] >= after_agg[c]) return [after_agg[c], c];
    if (minarr.length > 1) minarr[0] = -1;
    return minarr;
  }, [Infinity])[1];

  var before_line = buckets[buckets.indexOf(parseInt(local_before))],
      after_line = buckets[buckets.indexOf(parseInt(local_after))];

  var svg = stream._svg.style("margin", "auto").style("display", "block");

  var mline = d3_updateable(svg, "g.m-line-wrap", "g").attr("class", "m-line-wrap");

  d3_updateable(mline, "line", "line").attr("stroke-width", 30).attr("stroke", "white").attr("y1", 60).attr("y2", stream._height + 60).attr("x1", 341).attr("x2", 341);

  var m = d3_updateable(mline, "g", "g").attr("writing-mode", "tb-rl").attr("transform", "translate(341," + (stream._height / 2 + 60) + ")");

  d3_updateable(m, "text", "text").text("User activity on your site").style("text-anchor", "middle");

  var title = d3_updateable(svg, ".main-title", "text").attr("x", "341").attr("y", "30").style("text-anchor", "middle").style("font-weight", "bold").attr("class", "main-title").text("Category Importance of User's Journey to site (hover to explore, click to select)");

  var title = d3_updateable(svg, ".second-title", "text").attr("x", "341").attr("y", "345").style("text-anchor", "middle").style("font-weight", "bold").attr("class", "second-title").text("Time weighted volume");

  var bline = d3_updateable(svg.selectAll(".before-canvas"), "g.line-wrap", "g").attr("class", "line-wrap");

  d3_updateable(bline, "line", "line").style("stroke-dasharray", "1,5").attr("stroke-width", 1).attr("stroke", "black").attr("y1", 0).attr("y2", stream._height + 20).attr("x1", stream._before_scale(before_line)).attr("x2", stream._before_scale(before_line));

  d3_updateable(bline, "text", "text").attr("y", 20).attr("x", stream._before_scale(before_line) - 10).style("text-anchor", "end").text("Consideration Stage");

  var aline = d3_updateable(svg.selectAll(".after-canvas"), "g.line-wrap", "g").attr("class", "line-wrap");

  d3_updateable(aline, "line", "line").style("stroke-dasharray", "1,5").attr("stroke-width", 1).attr("stroke", "black").attr("y1", 0).attr("y2", stream._height + 20).attr("x1", stream._after_scale(after_line)).attr("x2", stream._after_scale(after_line));

  d3_updateable(aline, "text", "text").attr("y", 20).attr("x", stream._after_scale(after_line) + 10).style("text-anchor", "start").text("Validation / Research");

  return {
    "consideration": "" + before_line,
    "validation": "-" + after_line
  };
}



function drawBeforeAndAfter(target, data) {

  var before = d3_updateable(target, ".before", "div", data, function () {
    return 1;
  }).classed("before", true).style("padding", "10px").style("padding-top", "0px").style("background-color", "rgb(227, 235, 240)");

  d3_updateable(before, "h3", "h3").text("Category activity before arriving and after leaving site").style("font-size", "12px").style("color", "#333").style("line-height", "33px").style("background-color", "#e3ebf0").style("margin-left", "-10px").style("margin-bottom", "10px").style("padding-left", "10px").style("margin-top", "0px").style("font-weight", "bold").style("text-transform", "uppercase");

  var inner = d3_updateable(before, ".inner", "div").classed("inner", true).style("position", "absolute");

  d3_updateable(inner, "h3", "h3").text("Sort By").style("margin", "0px").style("line-height", "32px").style("color", "inherit").style("font-size", "inherit").style("font-weight", "bold").style("text-transform", "uppercase").style("background", "#e3ebf0").style("padding-left", "10px").style("margin-right", "10px").style("margin-top", "2px").style("margin-bottom", "2px").style("display", "inline-block").style("width", "140px");

  inner.selectAll("select").style("min-width", "140px");

  var cb = comp_bubble(before).rows(data.before_categories).after(data.after_categories).draw();

  cb._svg.style("display", "block").style("margin-left", "auto").style("margin-right", "auto");

  return inner;
}

function Pie(target) {
  this.target = target;
}

Pie.prototype = {
  radius: function radius(val) {
    return accessor$2.bind(this)("radius", val);
  },
  data: function data(val) {
    return accessor$2.bind(this)("data", val);
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || noop;
    this._on[action] = fn;
    return this;
  },
  draw: function draw() {

    var d = d3.entries({
      sample: this._data.sample,
      population: this._data.population - this._data.sample
    });

    var color = d3.scale.ordinal().range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

    var arc = d3.svg.arc().outerRadius(this._radius - 10).innerRadius(0);

    var pie = d3.layout.pie().sort(null).value(function (d) {
      return d.value;
    });

    var svg = d3_updateable(this.target, "svg", "svg", false, function (x) {
      return 1;
    }).attr("width", 50).attr("height", 52);

    svg = d3_updateable(svg, "g", "g").attr("transform", "translate(" + 25 + "," + 26 + ")");

    var g = d3_splat(svg, ".arc", "g", pie(d), function (x) {
      return x.data.key;
    }).classed("arc", true);

    d3_updateable(g, "path", "path").attr("d", arc).style("fill", function (d) {
      return color(d.data.key);
    });
  }
};

function pie(target) {
  return new Pie(target);
}

function buildSummaryBlock(data, target, radius_scale, x) {
  var data = data,
      dthis = d3_class(d3.select(target), "pie-summary-block");

  pie(dthis).data(data).radius(radius_scale(data.population)).draw();

  var fw = d3_class(dthis, "fw").classed("fw", true);

  var fw2 = d3_class(dthis, "fw2").text(d3.format("%")(data.sample / data.population));

  d3_class(fw, "sample", "span").text(d3.format(",")(data.sample));

  d3_class(fw, "vs", "span").html("<br> out of <br>").style("font-size", ".88em");

  d3_class(fw, "population", "span").text(d3.format(",")(data.population));
}

function drawTimeseries(target, data, radius_scale) {
  var w = d3_updateable(target, "div.timeseries", "div").classed("timeseries", true).style("width", "60%").style("display", "inline-block").style("background-color", "#e3ebf0").style("padding-left", "10px").style("height", "127px");

  var q = d3_updateable(target, "div.timeseries-details", "div").classed("timeseries-details", true).style("width", "40%").style("display", "inline-block").style("vertical-align", "top").style("padding", "15px").style("padding-left", "57px").style("background-color", "#e3ebf0").style("height", "127px");

  var pop = d3_updateable(q, ".pop", "div").classed("pop", true);

  d3_updateable(pop, ".ex", "span").classed("ex", true).style("width", "20px").style("height", "10px").style("background-color", "grey").style("display", "inline-block");

  d3_updateable(pop, ".title", "span").classed("title", true).style("text-transform", "uppercase").style("padding-left", "3px").text("all");

  var samp = d3_updateable(q, ".samp", "div").classed("samp", true);

  d3_updateable(samp, ".ex", "span").classed("ex", true).style("width", "20px").style("height", "10px").style("background-color", "#081d58").style("display", "inline-block");

  d3_updateable(samp, ".title", "span").classed("title", true).style("text-transform", "uppercase").style("padding-left", "3px").text("filtered");

  var details = d3_updateable(q, ".deets", "div").classed("deets", true);

  d3_updateable(w, "h3", "h3").text("Filtered versus All Views").style("font-size", "12px").style("color", "#333").style("line-height", "33px").style("background-color", "#e3ebf0").style("margin-left", "-10px").style("margin-bottom", "10px").style("padding-left", "10px").style("margin-top", "0px").style("font-weight", "bold").style("text-transform", "uppercase");

  time_series(w).data({ "key": "y", "values": data }).height(80).on("hover", function (x) {
    var xx = {};
    xx[x.key] = { sample: x.value, population: x.value2 };
    details.datum(xx);

    d3_updateable(details, ".text", "div").classed("text", true).text("@ " + x.hour + ":" + (x.minute.length > 1 ? x.minute : "0" + x.minute)).style("display", "inline-block").style("line-height", "49px").style("padding-top", "15px").style("padding-right", "15px").style("font-size", "22px").style("font-weight", "bold").style("width", "110px").style("vertical-align", "top").style("text-align", "center");

    d3_updateable(details, ".pie", "div").classed("pie", true).style("display", "inline-block").style("padding-top", "15px").each(function (x) {
      var data = Object.keys(x).map(function (k) {
        return x[k];
      })[0];
      buildSummaryBlock(data, this, radius_scale, x);
    });
  }).draw();
}

__$styleInject(".summary-view .table-wrapper { background:#e3ebf0; padding-top:5px; padding-bottom:10px }\n.summary-view .table-wrapper tr { border-bottom:none }\n.summary-view .table-wrapper thead tr { background:none }\n.summary-view .table-wrapper tbody tr:hover { background:none }\n.summary-view .table-wrapper tr td { border-right:1px dotted #ccc;text-align:center }\n.summary-view .table-wrapper tr td:last-of-type { border-right:none }\n\n.summary-view .ts-row,\n.summary-view .pie-row,\n.summary-view .cat-row,\n.summary-view .key-row,\n.summary-view .ba-row,\n.summary-view .stream-ba-row {\n  padding-bottom:10px\n}\n\n.ba-row .table-wrapper tr th {\n    padding-top:20px\n  }\n\n.ba-row .table-wrapper tr.expanded th {\n  padding-top:0px\n}\n\n.timing-row .table-wrapper tr.expanded th, \n.ba-row .table-wrapper tr.expanded th, \n.ba-row .table-wrapper tr.expanded td  {\n  width:31px;\n  max-width:200px\n}\n\n.timing-row .table-wrapper tr th, \n.timing-row .table-wrapper tr td, \n.ba-row .table-wrapper tr th, \n.ba-row .table-wrapper tr td  {\n  width:31px;\n  max-width:31px\n}\n\n\n.timing-row .table-wrapper tr th:first-of-type, \n.ba-row .table-wrapper tr th:first-of-type, \n.ba-row .table-wrapper tr td:first-of-type {\n  width:300px;\n}\n\n.dash-row > div {\n  display: inline-block;\n  width: 50%;\n  padding: 0px 10px 10px; \n  background-color: rgb(227, 235, 240);\n}\n.dash-row > div > h3 {\n  font-size: 12px;\n  color: rgb(51, 51, 51);\n  line-height: 33px;\n  background-color: rgb(227, 235, 240);\n  margin-left: -10px;\n  margin-bottom: 10px;\n  padding-left: 10px;\n  margin-top: 0px;\n  font-weight: bold;\n  text-transform: uppercase;\n  \n}\n\n.pie-summary-block .fw {\n    width:50px;\n    display:inline-block;\n    vertical-align:top;\n    padding-top:3px;\n    text-align:center;\n    line-height:16px;\n}\n\n.pie-summary-block .fw2 {\n    width:60px;\n    display:inline-block;\n    vertical-align:top;\n    padding-top:3px;\n    text-align:center;\n    font-size:22px;\n    font-weight:bold;\n    line-height:40px;\n}\n", undefined);

function summary_view(target) {
  return new SummaryView(target);
}

var SummaryView = function (_D3ComponentBase) {
  inherits(SummaryView, _D3ComponentBase);

  function SummaryView(target) {
    classCallCheck(this, SummaryView);
    return possibleConstructorReturn(this, (SummaryView.__proto__ || Object.getPrototypeOf(SummaryView)).call(this, target));
  }

  createClass(SummaryView, [{
    key: 'props',
    value: function props() {
      return ["data", "timing", "category", "keywords", "before", "after"];
    }
  }, {
    key: 'draw',
    value: function draw() {
      var wrap = d3_class(this._target, "summary-view");

      header(wrap).text("Summary").draw();

      var tswrap = d3_class(wrap, "ts-row"),
          piewrap = d3_class(wrap, "pie-row"),
          catwrap = d3_class(wrap, "cat-row").classed("dash-row", true),
          keywrap = d3_class(wrap, "key-row"),
          bawrap = d3_class(wrap, "ba-row"),
          streamwrap = d3_class(wrap, "stream-ba-row");

      var radius_scale = d3.scale.linear().domain([this._data.domains.population, this._data.views.population]).range([20, 35]);

      table$1(piewrap).data({ "key": "T", "values": [this.data()] }).skip_option(true).render("domains", function (x) {
        var data = d3.select(this.parentNode).datum()[x.key];
        buildSummaryBlock(data, this, radius_scale, x);
      }).render("articles", function (x) {
        var data = d3.select(this.parentNode).datum()[x.key];
        buildSummaryBlock(data, this, radius_scale, x);
      }).render("sessions", function (x) {
        var data = d3.select(this.parentNode).datum()[x.key];
        buildSummaryBlock(data, this, radius_scale, x);
      }).render("views", function (x) {
        var data = d3.select(this.parentNode).datum()[x.key];
        buildSummaryBlock(data, this, radius_scale, x);
      }).draw();

      drawTimeseries(tswrap, this._timing, radius_scale);

      try {
        drawCategory(catwrap, this._category);
        drawCategoryDiff(catwrap, this._category);
      } catch (e) {}

      //drawKeywords(keywrap,this._keywords)
      //drawKeywordDiff(keywrap,this._keywords)

      var inner = drawBeforeAndAfter(bawrap, this._before);

      select(inner).options([{ "key": "Importance", "value": "percent_diff" }, { "key": "Activity", "value": "score" }, { "key": "Population", "value": "pop" }]).selected(this._before.sortby || "").on("select", this.on("ba.sort")).draw();

      //drawStream(streamwrap,this._before.before_categories,this._before.after_categories)


      return this;
    }
  }]);
  return SummaryView;
}(D3ComponentBase);

var ObjectSelector = function (_D3ComponentBase) {
  inherits(ObjectSelector, _D3ComponentBase);

  function ObjectSelector(target) {
    classCallCheck(this, ObjectSelector);

    var _this = possibleConstructorReturn(this, (ObjectSelector.__proto__ || Object.getPrototypeOf(ObjectSelector)).call(this, target));

    _this._selections = [];
    return _this;
  }

  createClass(ObjectSelector, [{
    key: "props",
    value: function props() {
      return ["selectAll", "key"];
    }
  }, {
    key: "add",
    value: function add(x) {
      this._selections.push(x);
      this.on("add")(this._selections);
    }
  }, {
    key: "remove",
    value: function remove(x) {
      var index = this._selections.indexOf(x);
      this._selections.splice(index, 1);
      this.on("remove")(this._selections);
    }
  }, {
    key: "draw",
    value: function draw() {

      var self = this;

      function click(x, i, skip) {

        var bool = d3.select(this).classed("selected");

        if (!skip) {
          if (bool == false) self.add(self.key()(x, i));
          if (bool == true) self.remove(self.key()(x, i));

          d3.select(this).classed("selected", !bool);
        }

        self.on("interact").bind(this)(self.key()(x, i), skip ? [self.key()(x, i)] : self._selections);
      }

      this._target.selectAll(this._selectAll).on("mouseover", function (x, i) {
        if (self._selections.length == 0) click.bind(this)(x, i, true);
      }).on("mouseout", function (x, i) {
        if (self._selections.length == 0) {
          click.bind(this)(x, i, true);
          self.on("mouseout").bind(this)(x, i);
        }
      }).on("click", function (x, i) {
        click.bind(this)(x, i);
        self.on("click").bind(this)(self.key()(x, i), self._selections);
      });

      return this;
    }
  }]);
  return ObjectSelector;
}(D3ComponentBase);

function object_selector(target) {
  return new ObjectSelector(target);
}

var buckets$1 = [10, 30, 60, 120, 180, 360, 720, 1440, 2880, 5760, 10080].reverse().map(function (x) {
  return String(x * 60);
});
buckets$1 = buckets$1.concat([10, 30, 60, 120, 180, 360, 720, 1440, 2880, 5760, 10080].map(function (x) {
  return String(-x * 60);
}));

// Rollup overall before and after data

var bucketWithPrefix = function bucketWithPrefix(prefix, x) {
  return prefix + x.time_diff_bucket;
};
var sumVisits = function sumVisits(x) {
  return d3.sum(x, function (y) {
    return y.visits;
  });
};

function rollupBeforeAndAfter(before_urls, after_urls) {

  var before_rollup = d3.nest().key(bucketWithPrefix.bind(this, "")).rollup(sumVisits).map(before_urls);

  var after_rollup = d3.nest().key(bucketWithPrefix.bind(this, "-")).rollup(sumVisits).map(after_urls);

  return buckets$1.map(function (x) {
    return before_rollup[x] || after_rollup[x] || 0;
  });
}

// Keyword processing helpers

var STOPWORDS$1 = ["that", "this", "what", "best", "most", "from", "your", "have", "first", "will", "than", "says", "like", "into", "after", "with"];
var cleanAndSplitURL = function cleanAndSplitURL(domain, url) {
  return url.toLowerCase().split(domain)[1].split("/").reverse()[0].replace("_", "-").split("-");
};
var isWord = function isWord(x) {
  return x.match(/\d+/g) == null && x.indexOf(",") == -1 && x.indexOf("?") == -1 && x.indexOf(".") == -1 && x.indexOf(":") == -1 && parseInt(x) != x && x.length > 3;
};

var urlReducer = function urlReducer(p, c) {
  p[c.url] = (p[c.url] || 0) + c.visits;
  return p;
};
var urlBucketReducer = function urlBucketReducer(prefix, p, c) {
  p[c.url] = p[c.url] || {};
  p[c.url]["url"] = c.url;

  p[c.url][prefix + c.time_diff_bucket] = c.visits;
  return p;
};
var urlToKeywordsObjReducer = function urlToKeywordsObjReducer(domain, p, c) {
  cleanAndSplitURL(domain, c.key).map(function (x) {
    if (isWord(x) && STOPWORDS$1.indexOf(x) == -1) {
      p[x] = p[x] || {};
      p[x].key = x;
      Object.keys(c.value).map(function (q) {
        p[x][q] = (p[x][q] || 0) + c.value[q];
      });
    }
  });
  return p;
};

function urlsAndKeywords(before_urls, after_urls, domain) {

  var url_volume = {};
  before_urls.reduce(urlReducer, url_volume);
  after_urls.reduce(urlReducer, url_volume);

  var url_ts = {};
  before_urls.reduce(urlBucketReducer.bind(this, ""), url_ts);
  after_urls.reduce(urlBucketReducer.bind(this, "-"), url_ts);

  var urls = d3.entries(url_volume).sort(function (p, c) {
    return d3.descending(p.value, c.value);
  }).slice(0, 1000).map(function (x) {
    return url_ts[x.key];
  }).map(function (x) {
    x.key = x.url;
    x.values = buckets$1.map(function (y) {
      return x[y] || 0;
    });
    x.total = d3.sum(buckets$1.map(function (b) {
      return x[b] || 0;
    }));
    return x;
  });

  var keywords = {};
  d3.entries(url_ts).reduce(urlToKeywordsObjReducer.bind(false, domain), keywords);

  var kws = Object.keys(keywords).map(function (k) {
    return Object.assign(keywords[k], { key: k });
  }).map(function (x) {
    x.values = buckets$1.map(function (y) {
      return x[y] || 0;
    });
    x.total = d3.sum(buckets$1.map(function (b) {
      return x[b] || 0;
    }));
    return x;
  }).sort(function (p, c) {
    return c.total - p.total;
  });

  return {
    urls: urls,
    kws: kws
  };
}

function validConsid(sorted_urls, sorted_kws, before_pos, after_pos) {
  var consid_buckets = buckets$1.filter(function (x, i) {
    return !(i < before_pos || i > buckets$1.length / 2 - 1);
  });
  var valid_buckets = buckets$1.filter(function (x, i) {
    return !(i < buckets$1.length / 2 || i > after_pos);
  });
  function containsReducer(x, p, c) {
    p += x[c] || 0;
    return p;
  }
  function filterByBuckets(_buckets, x) {
    return _buckets.reduce(containsReducer.bind(false, x), 0);
  }
  var urls_consid = sorted_urls.filter(filterByBuckets.bind(false, consid_buckets)),
      kws_consid = sorted_kws.filter(filterByBuckets.bind(false, consid_buckets));

  var urls_valid = sorted_urls.filter(filterByBuckets.bind(false, valid_buckets)),
      kws_valid = sorted_kws.filter(filterByBuckets.bind(false, valid_buckets));

  return {
    urls_consid: urls_consid,
    urls_valid: urls_valid,
    kws_consid: kws_consid,
    kws_valid: kws_valid
  };
}

// Build data for summary

function numViews(data) {
  return data.length;
}
function avgViews(data) {
  return parseInt(data.reduce(function (p, c) {
    return p + c.total;
  }, 0) / data.length);
}
function medianViews(data) {
  return (data[parseInt(data.length / 2)] || {}).total || 0;
}
function summarizeViews(name, fn, all, consid, valid) {
  return { name: name, all: fn(all), consideration: fn(consid), validation: fn(valid) };
}
function summarizeData(all, consid, valid) {
  return [summarizeViews("Distinct URLs", numViews, all, consid, valid), summarizeViews("Average Views", avgViews, all, consid, valid), summarizeViews("Median Views", medianViews, all, consid, valid)];
}

// Process relative timing data

function processData(before_urls, after_urls, before_pos, after_pos, domain) {
  var _urlsAndKeywords = urlsAndKeywords(before_urls, after_urls, domain),
      urls = _urlsAndKeywords.urls,
      kws = _urlsAndKeywords.kws;

  var _validConsid = validConsid(urls, kws, before_pos, after_pos),
      urls_consid = _validConsid.urls_consid,
      urls_valid = _validConsid.urls_valid,
      kws_consid = _validConsid.kws_consid,
      kws_valid = _validConsid.kws_valid;

  var url_summary = summarizeData(urls, urls_consid, urls_valid);
  var kws_summary = summarizeData(kws, kws_consid, kws_valid);

  return {
    url_summary: url_summary,
    kws_summary: kws_summary,
    urls: urls,
    urls_consid: urls_consid,
    urls_valid: urls_valid,
    kws: kws,
    kws_consid: kws_consid,
    kws_valid: kws_valid
  };
}

__$styleInject(".refine-relative .summary-row {\n  margin-bottom:15px;\n  position:relative;\n}\n\n.refine-relative .tables-row .url, .refine-relative .tables-row .kw {\n  width:50%;\n  display:inline-block;\n  vertical-align:top;\n}\n\n.refine-relative .action-header {\n  text-align:center;\n  font-size:16px;\n  font-weight:bold;\n  padding:10px;\n}\n\n.refine-relative .summary-row > .title {\n  font-size:16px;\n  font-weight:bold;\n  text-align:center;\n  line-height:40px;\n  margin-bottom:5px;\n}\n.refine-relative .description {\n  font-size:12px;\n  position:absolute;\n  width:120px;\n  top:35px;\n  right:200px;\n}\n\n.refine-relative .vertical-options {\n  text-align:center;\n  position:absolute;\n  width:120px;\n  top:35px;\n  left:200px;\n}\n", undefined);

function selectOptionRect(td, options, before_pos, after_pos) {

  var subset = td.selectAll("svg").selectAll("rect").attr("fill", undefined).filter(function (x, i) {
    var value = options.filter(function (x) {
      return x.selected;
    })[0].value;
    if (value == "all") return false;
    if (value == "consideration") return i < before_pos || i > buckets$1.length / 2 - 1;
    if (value == "validation") return i < buckets$1.length / 2 || i > after_pos;
  });

  subset.attr("fill", "grey");
}

function refine_relative(target) {
  return new RefineRelative(target);
}

var RefineRelative = function (_D3ComponentBase) {
  inherits(RefineRelative, _D3ComponentBase);

  function RefineRelative(target) {
    classCallCheck(this, RefineRelative);

    var _this = possibleConstructorReturn(this, (RefineRelative.__proto__ || Object.getPrototypeOf(RefineRelative)).call(this, target));

    _this._options = [{ "key": "All", "value": "all", "selected": 1 }, { "key": "Consideration", "value": "consideration", "selected": 0 }, { "key": "Validation", "value": "validation", "selected": 0 }];
    _this._summary_headers = [{ "key": "name", "value": "" }, { "key": "all", "value": "All" }, { "key": "consideration", "value": "Consideration" }, { "key": "validation", "value": "Validation" }];
    return _this;
  }

  createClass(RefineRelative, [{
    key: 'props',
    value: function props() {
      return ["data", "domain", "stages", "before_urls", "after_urls", "summary_headers", "options"];
    }
  }, {
    key: 'draw',
    value: function draw() {

      var td = d3_class(this._target, "refine-relative");
      var before_urls = this._before_urls,
          after_urls = this._after_urls,
          d = this._data,
          stages = this._stages,
          summary_headers = this._summary_headers,
          options = this._options;

      var before_pos, after_pos;

      buckets$1.map(function (x, i) {
        if (stages.consideration == x) before_pos = i;
        if (stages.validation == x) after_pos = i;
      });

      var overall_rollup = rollupBeforeAndAfter(before_urls, after_urls);

      var _processData = processData(before_urls, after_urls, before_pos, after_pos, this._domain),
          url_summary = _processData.url_summary,
          urls = _processData.urls,
          urls_consid = _processData.urls_consid,
          urls_valid = _processData.urls_valid,
          kws_summary = _processData.kws_summary,
          kws = _processData.kws,
          kws_consid = _processData.kws_consid,
          kws_valid = _processData.kws_valid;

      var summary_row = d3_class(td, "summary-row");

      d3_class(summary_row, "title").text("Before and After: " + this._domain);

      before_after_timeseries(summary_row).data(overall_rollup).before(before_pos).after(after_pos).draw();

      var voptions = vertical_option(summary_row).options(options).on("click", function (x) {

        options.map(function (z) {
          return z.selected = x.key == z.key ? 1 : 0;
        });
        voptions.options(options).draw();

        selectOptionRect(td, options, before_pos, after_pos);
      }).draw();

      d3_class(summary_row, "description").text("Select domains and keywords to build and refine your global filter");

      var tables = d3_class(td, "tables-row");

      summary_table(d3_class(tables, "url")).title("URL Summary").data(url_summary).headers(summary_headers).draw();

      summary_table(d3_class(tables, "kw")).title("Keyword Summary").data(kws_summary).headers(summary_headers).draw();

      var modify = d3_class(td, "modify-row");

      d3_class(modify, "action-header").text("Explore and Refine");

      tabular_timeseries(d3_class(modify, "url-depth")).headers(["Before", "After"]).label("URL").data(urls).split(this.domain()).on("stage-filter", this.on("stage-filter")).draw();

      tabular_timeseries(d3_class(modify, "kw-depth")).headers(["Before", "After"]).label("Keywords").data(kws).on("stage-filter", this.on("stage-filter")).draw();
    }
  }]);
  return RefineRelative;
}(D3ComponentBase);

var buckets$2 = [10, 30, 60, 120, 180, 360, 720, 1440, 2880, 5760, 10080].reverse().map(function (x) {
  return String(x * 60);
});
buckets$2 = buckets$2.concat([10, 30, 60, 120, 180, 360, 720, 1440, 2880, 5760, 10080].map(function (x) {
  return String(-x * 60);
}));

var timeBuckets = buckets$2;

var formatName = function formatName(x) {

  if (x < 0) x = -x;

  if (x == 3600) return "1 hr";
  if (x < 3600) return x / 60 + " mins";

  if (x == 86400) return "1 day";
  if (x > 86400) return x / 86400 + " days";

  return x / 3600 + " hrs";
};

var timingHeaders = buckets$2.map(function (x) {
  return { "key": x, "value": formatName(x), "selected": true };
});

function normalizeRowSimple(row) {

  var items = 0;

  var mean = timeBuckets.reduce(function (p, c) {
    if (row[c] && row[c] != "") {
      items++;
      p += row[c] || 0;
    }
    return p;
  }, 0) / items;

  timeBuckets.map(function (b) {
    if (row[b]) row[b] = row[b] > mean ? Math.round((row[b] - mean) / mean * 10) / 10 : Math.round(-(mean - row[b]) / mean * 10) / 10;
  });

  return row;
}

function normalizeByCategory(categories) {

  return function normalize(row) {
    var cat_idf = (categories[row.parent_category_name] && categories[row.parent_category_name].idf || 0.032) * 100000;
    var idf = row.idf == "NA" ? 14345 / 100 : row.idf;
    idf = row.key.split(".").length > 2 ? idf * .1 : idf;

    timeBuckets.map(function (b) {

      if (row[b]) row[b] = Math.log(1 + row[b] / Math.sqrt(row.total) * (row[b] * row[b]) * idf * (1 / cat_idf));
    });
    return row;
  };
}

function normalizeByColumns(values) {

  var tb = timeBuckets.reduce(function (p, c) {
    p[c] = 0;return p;
  }, {});

  var totals = values.reduce(function (tb, row) {
    timeBuckets.map(function (b) {
      tb[b] += row[b] || 0;
    });
    return tb;
  }, tb);

  return function normalize(row) {
    timeBuckets.map(function (b) {
      if (row[b]) row[b] = Math.round(row[b] / totals[b] * 1000) / 10;
    });
    return row;
  };
}



var t1 = timeBuckets.slice(0, 11).map(function (x) {
  return parseInt(x);
}).reverse();
var t2 = [0].concat(t1);
var t3 = t1.map(function (v, i) {
  return i ? (v - t2[i]) / t2[i] : 1;
});

var normalizers = t3.reduce(function (p, c) {
  p[p.length] = p[p.length - 1] * c;
  p[p.length] = p[p.length - 1] * c * (1 + (p.length - 1) / 10);
  return p;
}, [1]);

function normalize(totals) {

  var normd = normalizers.slice(1).map(function (x, i) {
    var k = t1[i];
    return (totals[String(k)] || 0) / x;
  });

  var baseValue = d3.sum(normd) / normd.filter(function (x) {
    return x;
  }).length;
  var estimates = normalizers.map(function (x) {
    return x * baseValue;
  });

  var normalized = t1.map(function (k, i) {
    return 1 + (totals[String(k)] || 0) / estimates[i];
  }).map(Math.log);

  var normalized2 = t1.map(function (k, i) {
    return 1 + (totals["-" + String(k)] || 0) / estimates[i];
  }).map(Math.log);

  var values = normalized.reverse().concat(normalized2).map(function (x) {
    return x ? x : "";
  });

  return values;
}

function normalizeRow(x) {
  var normed = normalize(x);
  var obj = {};
  t1.slice().reverse().concat(t1.map(function (x) {
    return "-" + x;
  })).map(function (x, i) {
    return obj[x] = normed[i];
  });

  return Object.assign({}, x, obj);
}

function totalsByTime(values) {
  return values.reduce(function (p, c) {
    Object.keys(c).map(function (k) {
      p[k] += c[k];
    });
    return p;
  }, timeBuckets.reduce(function (p, c) {
    p[c] = 0;return p;
  }, {}));
}

var computeScale = function computeScale(data) {
  var max = data.reduce(function (p, c) {
    timeBuckets.map(function (x) {
      p = Math.abs(c[x]) > p ? Math.abs(c[x]) : p;
    });

    return p;
  }, 0);

  return d3.scale.linear().range([0, .8]).domain([0, Math.log(max)]);
};

__$styleInject(".ba-row {\n        padding-bottom:60px;\n}\n\n.ba-row .expanded td {\nbackground:#f9f9fb;\n            padding-top:10px;\n            padding-bottom:10px;\n}\n\n.ba-row th {\n  border-right:1px rgba(0,0,0,.1);\n}\n\n.ba-row th span.less-than, .ba-row th span.greater-than {\nfont-size:.9em;\nwidth:55px;\ntransform:rotate(90deg);\ntext-align:center;\ndisplay:inline-block;\nmargin-left: -20px;\n\n}\n/*\n.ba-row th span.less-than {\n    font-size: .9em;\n    width: 50px;\n    transform: rotate(-90deg);\n    display: inline-block;\n    margin-left: -20px;\n    text-align: center;\n}\n*/\n.ba-row .table-wrapper tr th {\n  border:0px;\n  height:53px\n}\n\n.transform select {\n  height: 36px;\n  vertical-align: top;\n      width:200px;\n}\n\n.transform {\n  width:255px;\n  padding:15px;\n  vertical-align: top;\n  display:inline-block;\n  padding-top:0px;\n}\n.transform span {\n  text-transform:uppercase;\n  font-weight:bold\n}\n\n.transform .filter-values,\n.transform .show-values {\n  text-align:right;\n  padding-top: 10px;\n  margin-right:25px;\n}\n\n.ba-row tr td:not(:first-child) {\n\n  color:transparent;\n  cursor:pointer\n}\n\n.ba-row tr td:not(:first-child):hover, \n.ba-row.show-values tr td:not(:first-child),\n.ba-row tr.expanded td {\n  color:inherit\n}\n.summary-wrap .timeseries-row {\n  /*padding-bottom:80px*/\n}\n.stream-wrap {\n  display:inline-block\n}\n.stream-wrap .inner {\n  margin-top:-60px\n}\n.stream-wrap .axis.before,\n.stream-wrap .axis.after {\n  display:none\n}\n\n.time-wrap {\n}\n.time-wrap rect {\n  fill: grey\n}\n.time-wrap rect.selected,\n.time-wrap rect:hover {\n  fill: black\n}\n\ntr.hide-category, \ntr.hide-time {\n  display:none\n}\n", undefined);

function relative_timing(target) {
  return new RelativeTiming(target);
}

var RelativeTiming = function (_D3ComponentBase) {
  inherits(RelativeTiming, _D3ComponentBase);

  function RelativeTiming(target) {
    classCallCheck(this, RelativeTiming);
    return possibleConstructorReturn(this, (RelativeTiming.__proto__ || Object.getPrototypeOf(RelativeTiming)).call(this, target));
  }

  createClass(RelativeTiming, [{
    key: 'props',
    value: function props() {
      return ["data", "transform", "sort", "ascending"];
    }
  }, {
    key: 'draw',
    value: function draw() {
      var _this2 = this;

      var self = this;
      var data = this._data,
          filtered = data.filter(function (x) {
        return x.selected;
      }),
          selected = filtered.length ? filtered[0] : data[0];

      var wrap = d3_class(this._target, "summary-wrap");

      header(wrap).text("Before and After").draw();

      var totals_by_time = totalsByTime(selected.values);
      var values = normalize(totals_by_time);

      function toggleValues(x) {
        bawrap.classed("show-values", this.checked);
      }

      this.on("toggle.values", toggleValues);

      var ts = d3_class(wrap, "timeseries-row").style("padding-bottom", selected.key == "Top Categories" ? "0px" : null);

      var OPTIONS = [{ "key": "Activity", "value": false }, { "key": "Intent Score", "value": "normalize" }, { "key": "Importance", "value": "importance" }, { "key": "Percentage", "value": "percent" }, { "key": "Percent Diff", "value": "percent_diff" }];

      data_selector(ts).datasets(data).transforms(OPTIONS).selected_transform(this.transform()).on("toggle.values", this.on("toggle.values")).on("transform.change", this.on("transform.change")).on("dataset.change", function (x) {
        _this2.on("select")(x);
      }).draw();

      var details = d3_class(ts.selectAll(".transform"), "details-wrap", "svg").style("width", "255px").style("height", "150px").style("display", selected.key == "Top Categories" ? "none" : "inline-block").style("margin-top", "20px");

      var stream_wrap = d3_class(ts, "stream-wrap").style("width", "682px").style("height", selected.key == "Top Categories" ? "100px" : "390px");

      var stages = drawStreamSkinny(stream_wrap, selected.data.before_categories, selected.data.after_categories, noop$2);

      stream_wrap.selectAll(".before-stream").style("display", selected.key == "Top Categories" ? "none" : null);

      var time_wrap = d3_class(stream_wrap, "time-wrap");

      object_selector(stream_wrap).selectAll("path").key(function (x, i) {
        return x[0].key;
      }).on("mouseout", function (key$$1, selections) {
        stream_wrap.selectAll("path").style("opacity", "1");

        bawrap.selectAll("tbody").selectAll("tr").classed("hide-category", false);
      }).on("click", function (key$$1, selections) {

        stream_wrap.selectAll("path").filter(function (x) {
          if (!x[0]) return false;
          var k = x[0].key;

          var bool = selections.filter(function (s) {
            return k == s;
          }).map(function (x) {
            return x;
          });

          return bool.length;
        }).classed("selected", true);
      }).on("interact", function (key$$1, selections) {

        stream_wrap.selectAll("path").style("opacity", "1").filter(function (x) {
          if (!x[0]) return false;

          var bool = selections.filter(function (s) {
            return x[0].key == s;
          }).map(function (x) {
            return x;
          });

          return !bool.length;
        }).style("opacity", ".6");

        bawrap.selectAll("tbody").selectAll("tr").classed("hide-category", function (x) {
          var bool = selections.indexOf(x.parent_category_name) > -1;
          return !bool;
        });

        var cat_wrap = d3_class(details, "cat", "g");
        d3_class(cat_wrap, "title", "text").text("Categories Selected:").style("font-weight", "bold").style("text-transform", "uppercase").attr("y", 15);

        var cats = d3_updateable(cat_wrap, ".cats", "g", selections, function (x) {
          return 1;
        }).classed("cats", true);

        var cat = cats.selectAll(".cat").data(function (x) {
          return x;
        });

        cat.enter().append("text").classed("cat", true).attr("x", 15).attr("y", function (x, i) {
          return 30 + (i + 1) * 15;
        });

        cat.text(String);

        cat.exit().remove();
      }).draw();

      var svg = d3_updateable(time_wrap, "svg", "svg").attr("width", 682).attr("height", 80).style("display", "inline-block").style("vertical-align", "bottom").style("margin-bottom", "15px");

      var sts = simpleTimeseries(svg, values, 682, 80, -2);

      object_selector(sts).selectAll("rect").key(function (x, i) {
        return timeBuckets[i];
      }).on("mouseout", function (key$$1, selections) {

        bawrap.selectAll("tbody").selectAll("tr").classed("hide-time", false);
      }).on("interact", function (key$$1, selections) {

        var tr = bawrap.selectAll("tbody").selectAll("tr").classed("hide-time", function (x) {
          var bool = selections.filter(function (s) {
            return x[s] != undefined && x[s] != "";
          });
          return !bool.length;
        });
      }).draw();

      var categories = data[0].data.category.reduce(function (p, c) {
        p[c.key] = c;
        return p;
      }, {});

      var bawrap = d3_class(wrap, "ba-row").style("min-height", "600px");

      var normByCol = normalizeByColumns(selected.values);

      var sorted_tabular = selected.values.filter(function (x) {
        return x.key != "";
      }).map(this.transform() == "normalize" ? normalizeRow : this.transform() == "percent" ? normByCol : this.transform() == "percent_diff" ? function (row) {
        return normalizeRowSimple(normByCol(row));
      } : this.transform() == "importance" && selected.key.indexOf("Cat") == -1 ? normalizeByCategory(categories) : identity).slice(0, 1000);

      var oscale = computeScale(sorted_tabular);
      var headers = [{ "key": "key", "value": selected.key.replace("Top ", "") }].concat(timingHeaders);

      var _default = "600";
      var s = this.sort();
      var asc = this.ascending();

      var selectedHeader = headers.filter(function (x) {
        return x.key == s;
      });
      var sortby = selectedHeader.length ? selectedHeader[0].key : _default;

      table$1(bawrap).top(140).headers(headers).sort(sortby, asc).on("sort", this.on("sort")).on("expand", function (d, td) {

        var _data = data[0].data;

        refine_relative(td).data(d).domain(d.key).stages(stages).before_urls(_data.before.filter(function (y) {
          return y.domain == d.key;
        })).after_urls(_data.after.filter(function (y) {
          return y.domain == d.key;
        })).on("stage-filter", self.on("stage-filter")).draw();
      }).on("draw", function () {
        this._target.selectAll("th").selectAll("span").classed("less-than", function (x) {
          return parseInt(x.key) == x.key && x.key < 0;
        }).classed("greater-than", function (x) {
          return parseInt(x.key) == x.key && x.key > 0;
        });

        this._target.selectAll(".table-option").style("display", "none");

        var trs = this._target.selectAll("tr").selectAll("td:not(:first-child)").style("border-right", "1px solid white").style("padding-left", "0px").style("text-align", "center").style("background-color", function (x) {

          var value = this.parentNode.__data__[x['key']] || 0;
          var slug = value > 0 ? "rgba(70, 130, 180," : "rgba(244, 109, 67,";
          value = Math.abs(value);
          return slug + oscale(Math.log(value + 1)) + ")";
        });

        if (self.transform() == "percent") trs.text(function (x) {
          if (this.classList.contains("option-header")) return "";

          var value = this.parentNode.__data__[x['key']] || 0;
          var f = d3.format(".1%")(value / 100);
          f = f.length > 4 ? f.slice(0, 2) : f.slice(0, -1);
          return f + "%";
        });
      }).option_text("<div style='width:40px;text-align:center'>&#65291;</div>").data({ "values": sorted_tabular }).draw();
    }
  }]);
  return RelativeTiming;
}(D3ComponentBase);

function aggregateCategory(urls) {
  var categories = d3.nest().key(function (x) {
    return x.parent_category_name;
  }).rollup(function (v) {
    return {
      "articles": v,
      "value": d3.sum(v, function (x) {
        return x.uniques;
      })
    };
  }).entries(urls).map(function (v) {
    return Object.assign(v.values, { key: v.key });
  });

  var total = d3.sum(categories, function (c) {
    return c.value;
  });

  categories.map(function (x) {
    x.percent = x.value / total;
  });

  return categories;
}

function aggregateCategoryHour(urls) {
  return d3.nest().key(function (x) {
    return x.parent_category_name + x.hour + x.minute;
  }).rollup(function (v) {
    return {
      "parent_category_name": v[0].parent_category_name,
      "hour": v[0].hour,
      "minute": v[0].minute,
      "count": v.reduce(function (p, c) {
        return p + c.count;
      }, 0),
      "articles": v
    };
  }).entries(urls).map(function (x) {
    return x.values;
  });
}





function categoryReducer(group) {
  return group.reduce(function (p, c) {
    p.views += c.count;
    p.sessions += c.uniques;
    return p;
  }, {
    articles: {},
    views: 0,
    sessions: 0,
    pop_size: group[0].category_idf ? 1 / group[0].category_idf : 0,
    idf: group[0].category_idf
  });
}

function categoryRoll(urls) {
  var rolled = d3.nest().key(function (k) {
    return k.parent_category_name;
  }).rollup(categoryReducer).entries(urls);

  var pop_total = d3.sum(rolled, function (x) {
    return x.values.pop_size;
  });
  var views_total = d3.sum(rolled, function (x) {
    return x.values.views;
  });

  rolled.map(function (x) {
    x.values.real_pop_percent = x.values.pop_percent = x.values.pop_size / pop_total * 100;
    x.values.percent = x.values.views / views_total;
  });

  return rolled;
}

var modifyWithComparisons = function modifyWithComparisons(ds) {

  var aggs = ds.reduce(function (p, c) {
    p.pop_max = (p.pop_max || 0) < c.pop ? c.pop : p.pop_max;
    p.pop_total = (p.pop_total || 0) + c.pop;

    if (c.samp) {
      p.samp_max = (p.samp_max || 0) > c.samp ? p.samp_max : c.samp;
      p.samp_total = (p.samp_total || 0) + c.samp;
    }

    return p;
  }, {});

  //console.log(aggs)

  ds.map(function (o) {
    o.normalized_pop = o.pop / aggs.pop_max;
    o.percent_pop = o.pop / aggs.pop_total;

    o.normalized_samp = o.samp / aggs.samp_max;
    o.percent_samp = o.samp / aggs.samp_total;

    o.normalized_diff = (o.normalized_samp - o.normalized_pop) / o.normalized_pop;
    o.percent_diff = (o.percent_samp - o.percent_pop) / o.percent_pop;
  });
};

function categorySummary(samp_urls, pop_urls) {

  var samp_rolled = categoryRoll(samp_urls),
      pop_rolled = categoryRoll(pop_urls),
      mapped_cat_roll = samp_rolled.reduce(function (p, c) {
    p[c.key] = c;
    return p;
  }, {});

  var cat_summary = pop_rolled.map(function (x) {

    [x.values].map(function (y) {
      y.key = x.key;
      y.pop = y.views;
      y.samp = mapped_cat_roll[x.key] ? mapped_cat_roll[x.key].values.views : 0;

      y.sample_percent_norm = y.sample_percent = y.percent * 100;
      y.importance = Math.log(1 / y.pop_size * y.samp * y.samp);
      y.ratio = y.sample_percent / y.real_pop_percent;
      y.value = y.samp;
    });

    return x.values;
  }).sort(function (a, b) {
    return b.pop - a.pop;
  }).filter(function (x) {
    return x.key != "NA";
  });

  modifyWithComparisons(cat_summary);

  return cat_summary;
}

function formatHour(h) {
  if (h == 0) return "12 am";
  if (h == 12) return "12 pm";
  if (h > 12) return h - 12 + " pm";
  return (h < 10 ? h[1] : h) + " am";
}

var hourbuckets$2 = d3$1.range(0, 24).map(function (x) {
  return String(x).length > 1 ? String(x) : "0" + x;
});

function buildTiming(urls, comparison) {

  var ts = prepData(urls),
      pop_ts = prepData(comparison);

  var mappedts = ts.reduce(function (p, c) {
    p[c.key] = c;return p;
  }, {});

  var prepped = pop_ts.map(function (x) {
    return {
      key: x.key,
      hour: x.hour,
      minute: x.minute,
      value2: x.value,
      value: mappedts[x.key] ? mappedts[x.key].value : 0
    };
  });

  return prepped;
}

var timingTabular = function timingTabular(data) {
  var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "domain";

  return d3$1.nest().key(function (x) {
    return x[key];
  }).key(function (x) {
    return x.hour;
  }).entries(data).map(function (x) {
    var obj = x.values.reduce(function (p, c) {
      p[c.key] = c.values;
      return p;
    }, {});

    x.buckets = hourbuckets$2.map(function (z) {
      var o = { values: obj[z], key: formatHour(z) };
      o.views = d3$1.sum(obj[z] || [], function (q) {
        return q.uniques;
      });
      return o;
    });

    x.tabular = x.buckets.reduce(function (p, c) {
      p[c.key] = c.views || undefined;
      return p;
    }, {});

    x.tabular["key"] = x.key;
    x.tabular["total"] = d3$1.sum(x.buckets, function (x) {
      return x.views;
    });

    return x.tabular;
  }).filter(function (x) {
    return x.key != "NA";
  });
};

var hourbuckets$1 = d3$1.range(0, 24).map(function (x) {
  return String(x).length > 1 ? String(x) : "0" + x;
});

var timingHeaders$1 = hourbuckets$1.map(formatHour).map(function (x) {
  return { key: x, value: x };
});

var timeHeaders = timingHeaders$1.map(function (x) {
  return x.key;
});

function normalizeByColumns$1(values) {

  var tb = timeHeaders.reduce(function (p, c) {
    p[c] = 0;return p;
  }, {});

  var totals = values.reduce(function (tb, row) {
    timeHeaders.map(function (b) {
      tb[b] += row[b] || 0;
    });
    return tb;
  }, tb);

  return function normalize(row) {
    timeHeaders.map(function (b) {
      if (row[b]) row[b] = Math.round(row[b] / totals[b] * 1000) / 10;
    });
    return row;
  };
}

function normalizeRowSimple$1(row) {

  var items = 0;

  var mean = timeHeaders.reduce(function (p, c) {
    if (row[c] && row[c] != "") {
      items++;
      p += row[c] || 0;
    }
    return p;
  }, 0) / items;

  timeHeaders.map(function (b) {
    if (row[b]) row[b] = row[b] > mean ? Math.round((row[b] - mean) / mean * 10) / 10 : Math.round(-(mean - row[b]) / mean * 10) / 10;
  });

  return row;
}

var computeScale$1 = function computeScale(data, _max) {

  var max = _max || 1000; // need to actually compute this from data

  return d3$1.scale.linear().range([0, 1]).domain([0, Math.log(max)]);
};

function normalizeRow$1(weights) {

  return function normalize(x, mult) {
    var keys = timingHeaders$1.map(function (t) {
      return t.key;
    });
    var values = keys.map(function (k) {
      return x[k];
    });

    var total = d3$1.sum(values);

    var estimates = Object.keys(weights).map(function (k) {
      return Math.sqrt(weights[k] * total);
    });

    var normalized = values.map(function (k, i) {
      return k / estimates[i];
    });
    var values = {};
    keys.map(function (k, i) {
      values[k] = Math.round(normalized[i] * mult || 0) || "";
    });
    return values;
  };
}

__$styleInject(".timing-row {\n        padding-bottom:60px;\n}\n\n.timing-row .expanded {\n  background:white;\n  padding:20px\n}\n\n.timing-row tr td:not(:first-child) {\n          border-right:1px solid white;\n          padding-left:0px;\n          text-align:center;\n\n}\n.timing-row .table-wrapper tr th {\n  padding:5px; text-align:center\n}\n.timing-row tr td:not(:first-child) {\n  color:transparent;\n  cursor:pointer\n}\n\n.timing-row tr td:not(:first-child):hover, \n.timing-row.show-values tr td:not(:first-child),\ntr.expanded td {\n  color:inherit\n}\n\n.timing-wrap rect {\n  fill: grey\n}\n.timing-wrap rect.selected,\n.timing-wrap rect:hover {\n  fill: black\n}\n", undefined);

function timing(target) {
  return new Timing(target);
}

var Timing = function (_D3ComponentBase) {
  inherits(Timing, _D3ComponentBase);

  function Timing(target) {
    classCallCheck(this, Timing);
    return possibleConstructorReturn(this, (Timing.__proto__ || Object.getPrototypeOf(Timing)).call(this, target));
  }

  createClass(Timing, [{
    key: 'props',
    value: function props() {
      return ["data", "transform", "sort", "ascending"];
    }
  }, {
    key: 'draw',
    value: function draw() {
      var _this2 = this;

      var self = this;
      var data = this._data,
          filtered = data.filter(function (x) {
        return x.selected;
      }),
          selected = filtered.length ? filtered[0] : data[0];

      var wrap = d3_class(this._target, "timing-wrap");

      var headers = [{ key: "key", value: selected.key.replace("Top ", "") }].concat(timingHeaders$1);
      var d = data[0].values; //timingTabular(data.full_urls)

      var _default = "total";
      var s = this.sort();
      var asc = this.ascending();

      var selectedHeader = headers.filter(function (x) {
        return x.key == s;
      });
      var sortby = selectedHeader.length ? selectedHeader[0].key : _default;

      var hourlyTotals = selected.values.reduce(function (p, c) {
        timingHeaders$1.map(function (k) {
          var h = k.key;
          p[h] = (p[h] || 0) + (c[h] || 0);
        });
        return p;
      }, {});

      var overallTotal = d3.sum(Object.keys(hourlyTotals).map(function (k) {
        return hourlyTotals[k];
      }));
      var percentTotals = Object.keys(hourlyTotals).reduce(function (p, k) {
        p[k] = hourlyTotals[k] / overallTotal;
        return p;
      }, {});

      var rowValue = selected.values.map(function (x) {
        return Math.sqrt(1 + x.total);
      });
      var normalizer = normalizeRow$1(percentTotals);

      var normByCol = normalizeByColumns$1(selected.values);

      var max = 0;
      var values = selected.values.map(function (row, i) {

        var normed = _this2.transform() == "normalize" ? normalizer(row, rowValue[i]) : _this2.transform() == "percent" ? normByCol(row) : _this2.transform() == "percent_diff" ? normalizeRowSimple$1(row) : row;

        var local_max = d3.max(timingHeaders$1.map(function (x) {
          return x.key;
        }).map(function (k) {
          return normed[k];
        }));
        max = local_max > max ? local_max : max;

        return Object.assign(normed, { "key": row.key });
      });

      var oscale = computeScale$1(values, max);

      header(wrap).text("Timing").draw();

      var ts = d3_class(wrap, "timeseries-row");

      var OPTIONS = [{ "key": "Activity", "value": false }, { "key": "Scored", "value": "normalize" }, { "key": "Percent", "value": "percent" }, { "key": "Percent Diff", "value": "percent_diff" }];

      function toggleValues(x) {
        timingwrap.classed("show-values", this.checked);
      }

      data_selector(ts).datasets(data).transforms(OPTIONS).selected_transform(this.transform()).on("toggle.values", toggleValues).on("transform.change", this.on("transform.change")).on("dataset.change", function (x) {
        _this2.on("select")(x);
      }).draw();

      var svg = d3_updateable(ts, "svg", "svg").attr("width", 744).attr("height", 80);

      var totals = timingHeaders$1.map(function (h) {
        return hourlyTotals[h.key];
      });

      var sts = simpleTimeseries(svg, totals, 744, 80, -1);

      object_selector(sts).selectAll("rect").key(function (x, i) {
        return timingHeaders$1[i].key;
      }).on("mouseout", function (key$$1, selections) {

        timingwrap.selectAll("tbody").selectAll("tr").classed("hide-time", false);
      }).on("interact", function (key$$1, selections) {

        var tr = timingwrap.selectAll("tbody").selectAll("tr").classed("hide-time", function (x) {
          var bool = selections.filter(function (s) {
            return x[s] != undefined && x[s] != "";
          });
          return !bool.length;
        });
      }).draw();

      var timingwrap = d3_class(wrap, "timing-row");

      var table_obj = table$1(timingwrap).top(140).headers(headers).sort(sortby, asc).on("sort", this.on("sort")).data({ "values": values.slice(0, 500) }).skip_option(true).on("expand", function (d, td) {

        var dd = data[0].data.filter(function (x) {
          return x.domain == d.key;
        });
        var rolled = prepData$1(dd);

        domain_expanded(td).domain(dd[0].domain).raw(dd).data(rolled).on("stage-filter", function (x) {
          self.on("stage-filter")(x);
        }).draw();
      }).on("draw", function () {

        var trs = this._target.selectAll("tr").selectAll("td:not(:first-child)").style("background-color", function (x) {
          var value = this.parentNode.__data__[x['key']] || 0;
          var slug = value > 0 ? "rgba(70, 130, 180," : "rgba(244, 109, 67,";
          value = Math.abs(value);
          return slug + oscale(Math.log(value + 1)) + ")";
        });
        if (self.transform() == "percent") trs.text(function (x) {
          var value = this.parentNode.__data__[x['key']] || 0;
          var f = d3.format(".1%")(value / 100);

          f = f.length > 4 ? f.slice(0, 2) : f.slice(0, -1);
          return f + "%";
        });
      }).draw();
    }
  }]);
  return Timing;
}(D3ComponentBase);

function d3_class$1(target, cls, type) {
  return d3_updateable(target, "." + cls, type || "div").classed(cls, true);
}

function staged_filter(target) {
  return new StagedFilter(target);
}

var StagedFilter = function () {
  function StagedFilter(target) {
    classCallCheck(this, StagedFilter);

    this._target = target;
    this._on = {};
  }

  createClass(StagedFilter, [{
    key: 'data',
    value: function data(val) {
      return accessor$2.bind(this)("data", val);
    }
  }, {
    key: 'on',
    value: function on(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this;
    }
  }, {
    key: 'draw',
    value: function draw() {
      var owrap = d3_class$1(this._target, "footer-wrap").style("padding-top", "5px").style("min-height", "60px").style("bottom", "0px").style("position", "fixed").style("width", "1000px").style("background", "#F0F4F7");

      var wrap = d3_class$1(owrap, "inner-wrap").style("border-top", "1px solid #ccc").style("padding-top", "5px");

      d3_class$1(wrap, "header-label").style("line-height", "35px").style("text-transform", "uppercase").style("font-weight", "bold").style("display", "inline-block").style("font-size", "14px").style("color", "#888888").style("width", "200px").style("vertical-align", "top").text("Build Filters");

      d3_class$1(wrap, "text-label").style("line-height", "35px").style("text-transform", "uppercase").style("font-weight", "bold").style("display", "inline-block").style("font-size", "12px").style("width", "60px").style("vertical-align", "top").style("display", "none").text("Title");

      var select_box = select(wrap).options([{ "key": "contains", "value": "contains" }, { "key": "does not contain", "value": "does not contain" }]).draw()._select.style("height", "36px").style("vertical-align", "top");

      var footer_row = d3_class$1(wrap, "footer-row").style("display", "inline-block");

      var select_value = this.data();

      function buildFilterInput() {

        footer_row.selectAll(".selectize-control").each(function (x) {
          var destroy = d3.select(this).on("destroy");
          if (destroy) destroy();
        });

        var select$$1 = d3_updateable(footer_row, "input", "input").style("margin-left", "10px").style("min-width", "200px").attr("value", select_value).property("value", select_value);

        var s = $(select$$1.node()).selectize({
          persist: false,
          create: function create(x) {
            select_value = (select_value.length ? select_value + "," : "") + x;
            self.on("update")(select_value);
            return {
              value: x, text: x
            };
          },
          onDelete: function onDelete(x) {
            select_value = select_value.split(",").filter(function (z) {
              return z != x[0];
            }).join(",");
            self.on("update")(select_value);
            return {
              value: x, text: x
            };
          }
        });

        footer_row.selectAll(".selectize-control").on("destroy", function () {
          s[0].selectize.destroy();
        });
      }

      buildFilterInput();

      var self = this;
      d3_class$1(wrap, "include-submit", "button").style("float", "right").style("min-width", "120px").style("border-radius", "5px").style("line-height", "29px").style("background", "#f9f9fb").style("border", "1px solid #ccc").style("border-radius", "5px").style("vertical-align", "top").attr("type", "submit").text("Modify Filters").on("click", function () {
        var value = footer_row.selectAll("input").property("value");
        var op = select_box.node().selectedOptions[0].__data__.key + ".selectize";

        self.on("modify")({ "field": "Title", "op": op, "value": value });
      });

      d3_class$1(wrap, "exclude-submit", "button").style("float", "right").style("min-width", "120px").style("border-radius", "5px").style("line-height", "29px").style("background", "#f9f9fb").style("border", "1px solid #ccc").style("border-radius", "5px").style("vertical-align", "top").attr("type", "submit").text("New Filter").on("click", function () {
        var value = footer_row.selectAll("input").property("value");
        var op = select_box.node().selectedOptions[0].__data__.key + ".selectize";

        self.on("add")({ "field": "Title", "op": op, "value": value });
      });
    }
  }]);
  return StagedFilter;
}();

function noop$10() {}
function identity$7(x) {
  return x;
}
function ConditionalShow(target) {
  this._on = {};
  this._classes = {};
  this._objects = {};
  this.target = target;
}

function conditional_show(target) {
  return new ConditionalShow(target);
}

ConditionalShow.prototype = {
  data: function data(val) {
    return accessor$2.bind(this)("data", val);
  },
  classed: function classed(k, v) {
    if (k === undefined) return this._classes;
    if (v === undefined) return this._classes[k];
    this._classes[k] = v;
    return this;
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$10;
    this._on[action] = fn;
    return this;
  },
  draw: function draw() {

    var classes = this.classed();

    var wrap = d3_updateable(this.target, ".conditional-wrap", "div", this.data()).classed("conditional-wrap", true);

    var objects = d3_splat(wrap, ".conditional", "div", identity$7, function (x, i) {
      return i;
    }).attr("class", function (x) {
      return x.value;
    }).classed("conditional", true).classed("hidden", function (x) {
      return !x.selected;
    });

    Object.keys(classes).map(function (k) {
      objects.classed(k, classes[k]);
    });

    this._objects = objects;

    return this;
  },
  each: function each(fn) {
    this.draw();
    this._objects.each(fn);
  }
};

function Share(target) {
  this._target = target;
  this._inner = function () {};
}

function share(target) {
  return new Share(target);
}

Share.prototype = {
  draw: function draw() {
    var self = this;

    var overlay = d3_updateable(this._target, ".overlay", "div").classed("overlay", true).style("width", "100%").style("height", "100%").style("position", "fixed").style("top", "0px").style("background", "rgba(0,0,0,.5)").style("z-index", "301").on("click", function () {
      overlay.remove();
    });

    this._overlay = overlay;

    var center = d3_updateable(overlay, ".popup", "div").classed("popup col-md-5 col-sm-8", true).style("margin-left", "auto").style("margin-right", "auto").style("min-height", "300px").style("margin-top", "150px").style("background-color", "white").style("float", "none").on("click", function () {
      d3.event.stopPropagation();
    }).each(function (x) {
      self._inner(d3.select(this));
    });

    return this;
  },
  inner: function inner(fn) {
    this._inner = fn.bind(this);
    this.draw();
    return this;
  },
  hide: function hide() {
    this._overlay.remove();
    return this;
  }
};

function noop$1() {}

function NewDashboard(target) {
  this.target = target;
  this._on = {};
}

function new_dashboard(target) {
  return new NewDashboard(target);
}

NewDashboard.prototype = {
  data: function data(val) {
    return accessor$2.bind(this)("data", val);
  },
  transform: function transform(val) {
    return accessor$2.bind(this)("transform", val) || "";
  },
  staged_filters: function staged_filters(val) {
    return accessor$2.bind(this)("staged_filters", val) || "";
  },
  media: function media(val) {
    return accessor$2.bind(this)("media", val);
  },
  saved: function saved(val) {
    return accessor$2.bind(this)("saved", val);
  },
  line_items: function line_items(val) {
    return accessor$2.bind(this)("line_items", val) || [];
  },
  selected_action: function selected_action(val) {
    return accessor$2.bind(this)("selected_action", val);
  },
  selected_comparison: function selected_comparison(val) {
    return accessor$2.bind(this)("selected_comparison", val);
  },
  action_date: function action_date(val) {
    return accessor$2.bind(this)("action_date", val);
  },
  comparison_date: function comparison_date(val) {
    return accessor$2.bind(this)("comparison_date", val);
  },

  view_options: function view_options(val) {
    return accessor$2.bind(this)("view_options", val) || [];
  },
  logic_options: function logic_options(val) {
    return accessor$2.bind(this)("logic_options", val) || [];
  },
  explore_tabs: function explore_tabs(val) {
    return accessor$2.bind(this)("explore_tabs", val) || [];
  },
  logic_categories: function logic_categories(val) {
    return accessor$2.bind(this)("logic_categories", val) || [];
  },
  actions: function actions(val) {
    return accessor$2.bind(this)("actions", val) || [];
  },
  summary: function summary(val) {
    return accessor$2.bind(this)("summary", val) || [];
  },
  time_summary: function time_summary(val) {
    return accessor$2.bind(this)("time_summary", val) || [];
  },
  time_tabs: function time_tabs(val) {
    return accessor$2.bind(this)("time_tabs", val) || [];
  },
  category_summary: function category_summary(val) {
    return accessor$2.bind(this)("category_summary", val) || [];
  },
  keyword_summary: function keyword_summary(val) {
    return accessor$2.bind(this)("keyword_summary", val) || [];
  },
  before: function before(val) {
    return accessor$2.bind(this)("before", val) || [];
  },
  before_tabs: function before_tabs(val) {
    return accessor$2.bind(this)("before_tabs", val) || [];
  },
  after: function after(val) {
    return accessor$2.bind(this)("after", val) || [];
  },
  filters: function filters(val) {
    return accessor$2.bind(this)("filters", val) || [];
  },
  loading: function loading(val) {
    if (val !== undefined) this._segment_view && this._segment_view.is_loading(val).draw();
    return accessor$2.bind(this)("loading", val);
  },
  sort: function sort(val) {
    return accessor$2.bind(this)("sort", val);
  },
  ascending: function ascending(val) {
    return accessor$2.bind(this)("ascending", val);
  },
  draw: function draw() {

    var data = this.data();
    var media = this.media();

    var options = JSON.parse(JSON.stringify(this.view_options()));
    var tabs = JSON.parse(JSON.stringify(this.explore_tabs()));

    var logic = JSON.parse(JSON.stringify(this.logic_options())),
        categories = this.logic_categories(),
        filters = JSON.parse(JSON.stringify(this.filters())),
        actions = JSON.parse(JSON.stringify(this.actions())),
        staged_filters = JSON.parse(JSON.stringify(this.staged_filters()));

    var target = this.target;
    var self = this;

    this._segment_view = segment_view(target).is_loading(self.loading() || false).segments(actions).data(self.summary()).action(self.selected_action() || {}).action_date(self.action_date() || "").comparison_date(self.comparison_date() || "").comparison(self.selected_comparison() || {}).on("change", this.on("action.change")).on("action_date.change", this.on("action_date.change")).on("comparison.change", this.on("comparison.change")).on("comparison_date.change", this.on("comparison_date.change")).on("download.click", function () {
      var ss = share(d3.select("body")).draw();
      ss.inner(function (target) {

        var header = d3_updateable(target, ".header", "h4").classed("header", true).style("text-align", "center").style("text-transform", "uppercase").style("font-family", "ProximaNova, sans-serif").style("font-size", "12px").style("font-weight", "bold").style("padding-top", "30px").style("padding-bottom", "30px").text("Download a saved media plan");

        var form = d3_updateable(target, "div", "div", self.saved()).style("text-align", "left").style("padding-left", "25%");

        if (!self.saved() || self.saved().length == 0) {
          d3_updateable(form, "span", "span").text("You currently have no saved mediaplans");
        } else {
          d3_splat(form, ".row", "a", function (x) {
            return x;
          }, function (x) {
            return x.name;
          }).classed("row", true).attr("href", function (x) {

            var filter_id = x.endpoint.split("selected_action=")[1].split("&")[0];
            return "/mediaplan/cache?format=csv&filter_id=" + filter_id + "&name=" + x.name;
          }).attr("download", function (x) {
            return x.name + "-export.csv";
          }).text(function (x) {
            return x.name;
          });
        }
      });
    }).on("saved-search.click", function () {
      var ss = share(d3.select("body")).draw();
      ss.inner(function (target) {

        var header = d3_updateable(target, ".header", "h4").classed("header", true).style("text-align", "center").style("text-transform", "uppercase").style("font-family", "ProximaNova, sans-serif").style("font-size", "12px").style("font-weight", "bold").style("padding-top", "30px").style("padding-bottom", "30px").text("Open a saved dashboard");

        var form = d3_updateable(target, "div", "div", self.saved()).style("text-align", "left").style("padding-left", "25%");

        if (!self.saved() || self.saved().length == 0) {
          d3_updateable(form, "span", "span").text("You currently have no saved dashboards");
        } else {
          d3_splat(form, ".row", "a", function (x) {
            return x;
          }, function (x) {
            return x.name;
          }).classed("row", true)
          //.attr("href", x => x.endpoint)
          .text(function (x) {
            return x.name;
          }).on("click", function (x) {
            // HACK: THIS is hacky...
            var _state = qs({}).from("?" + x.endpoint.split("?")[1]);

            ss.hide();
            window.onpopstate({ state: _state });
            d3.event.preventDefault();
            return false;
          });
        }
      });
    }).on("new-saved-search.click", function () {
      var ss = share(d3.select("body")).draw();
      ss.inner(function (target) {

        var header = d3_updateable(target, ".header", "h4").classed("header", true).style("text-align", "center").style("text-transform", "uppercase").style("font-family", "ProximaNova, sans-serif").style("font-size", "12px").style("font-weight", "bold").style("padding-top", "30px").style("padding-bottom", "30px").text("Save this dashboard:");

        var form = d3_updateable(target, "div", "div").style("text-align", "center");

        var name = d3_updateable(form, ".name", "div").classed("name", true);

        d3_updateable(name, ".label", "div").style("width", "130px").style("display", "inline-block").style("text-transform", "uppercase").style("font-family", "ProximaNova, sans-serif").style("font-size", "12px").style("font-weight", "bold").style("text-align", "left").text("Dashboard Name:");

        var name_input = d3_updateable(name, "input", "input").style("width", "270px").attr("placeholder", "My awesome search");

        var advanced = d3_updateable(form, ".advanced", "details").classed("advanced", true).style("width", "400px").style("text-align", "left").style("margin", "auto");

        d3_updateable(advanced, ".label", "div").style("width", "130px").style("display", "inline-block").style("text-transform", "uppercase").style("font-family", "ProximaNova, sans-serif").style("font-size", "12px").style("font-weight", "bold").style("text-align", "left").text("Line Item:");

        var select_box = select(advanced).options(self.line_items().map(function (x) {
          return { key: x.line_item_name, value: x.line_item_id };
        })).draw()._select.style("width", "270px");

        var send = d3_updateable(form, ".send", "div").classed("send", true).style("text-align", "center");

        d3_updateable(send, "button", "button").style("line-height", "16px").style("margin-top", "10px").text("Send").on("click", function (x) {
          var name = name_input.property("value");
          var line_item = select_box.node().selectedOptions.length ? select_box.node().selectedOptions[0].__data__.key : false;

          d3.xhr("/crusher/saved_dashboard").post(JSON.stringify({
            "name": name,
            "endpoint": window.location.pathname + window.location.search,
            "line_item": line_item
          }));

          ss.hide();
        }).text("Save");
      });
    }).draw();

    if (this.summary() == false) return false;

    filter_view(target).logic(logic).categories(categories).filters(filters).data(data).on("logic.change", this.on("logic.change")).on("filter.change", this.on("filter.change")).draw();

    option_view(target).data(options).on("select", this.on("view.change")).draw();

    conditional_show(target).data(options).classed("view-option", true).draw().each(function (x) {

      if (!x.selected) return;

      var dthis = d3.select(this);

      if (x.value == "data-view") {
        var dv = domain_view(dthis).options(tabs).data(data).sort(self.sort()).ascending(self.ascending()).on("select", self.on("tab.change")).on("sort", self.on("sort.change")).on("stage-filter", function (x) {

          staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(function (x) {
            return x.length;
          }).join(",");
          self.on("staged-filter.change")(staged_filters);
          HACKbuildStagedFilter(staged_filters);
        }).draw();
      }

      if (x.value == "media-view") {
        media_plan(dthis.style("margin-left", "-15px").style("margin-right", "-15px")).data(data).draw();
      }

      if (x.value == "ba-view") {
        relative_timing(dthis).transform(self.transform()).data(self.before_tabs()).sort(self.sort()).ascending(self.ascending()).on("transform.change", self.on("transform.change")).on("select", self.on("tab.change")).on("sort", self.on("sort.change")).on("stage-filter", function (x) {

          staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(function (x) {
            return x.length;
          }).join(",");
          self.on("staged-filter.change")(staged_filters);
          HACKbuildStagedFilter(staged_filters);
        }).draw();
      }

      if (x.value == "summary-view") {
        summary_view(dthis).data(self.summary()).timing(self.time_summary()).category(self.category_summary()).before(self.before())
        //.after(self.after())
        .keywords(self.keyword_summary()).on("ba.sort", self.on("ba.sort")).draw();
      }

      if (x.value == "timing-view") {
        timing(dthis).data(self.time_tabs()).transform(self.transform()).sort(self.sort()).ascending(self.ascending()).on("transform.change", self.on("transform.change")).on("select", self.on("tab.change")).on("sort", self.on("sort.change")).on("stage-filter", function (x) {

          staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(function (x) {
            return x.length;
          }).join(",");
          self.on("staged-filter.change")(staged_filters);
          HACKbuildStagedFilter(staged_filters);
        }).draw();
      }
    });

    function HACKbuildStagedFilter(staged) {

      staged_filter(target).data(staged).on("update", function (x) {
        self.on("staged-filter.change")(x);
      }).on("modify", function (x) {
        self.on("staged-filter.change")("");
        self.on("modify-filter")(x);
      }).on("add", function (x) {
        self.on("staged-filter.change")("");
        self.on("add-filter")(x);
      }).draw();
    }
    HACKbuildStagedFilter(staged_filters);

    return this;
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$1;
    this._on[action] = fn;
    return this;
  }

};

function getData(action, days_ago) {
  return function (cb) {
    console.log(days_ago);

    var URL = "/crusher/v2/visitor/domains_full_time_minute/cache?url_pattern=" + action.url_pattern[0] + "&filter_id=" + action.action_id;

    var date_ago = new Date(+new Date() - 24 * 60 * 60 * 1000 * days_ago),
        date = d3.time.format("%Y-%m-%d")(date_ago);

    if (days_ago) URL += "&date=" + date;

    d3.json(URL, function (value) {

      var categories = value.summary.category.map(function (x) {
        x.key = x.parent_category_name;return x;
      });
      value.categories = categories;
      value.category = value.summary.category;
      value.current_hour = value.summary.hour;
      value.category_hour = value.summary.cross_section;

      value.original_urls = value.response;

      cb(false, value);
    });
  };
}
function create(data, cb) {
  d3.xhr("/crusher/funnel/action?format=json").header("Content-Type", "application/json").post(JSON.stringify(data), function (err, data) {
    cb(err, JSON.parse(data.response).response);
  });
}

function getAll(cb) {
  d3.json("/crusher/funnel/action?format=json", function (value) {
    value.response.map(function (x) {
      x.key = x.action_name;x.action_id = x.filter_id;x.value = x.action_id;
    });
    cb(false, value.response);
  });
}

var a = Object.freeze({
	getData: getData,
	create: create,
	getAll: getAll
});

var action = a;
var dashboard = {
  getAll: function getAll$$1(cb) {
    d3.json("/crusher/saved_dashboard", function (value) {
      cb(false, value.response);
    });
  }
};
var line_item = {
  getAll: function getAll$$1(cb) {
    d3.json("/line_item", function (value) {
      cb(false, value.response);
    });
  }
};

function prefixReducer(prefix, p, c) {
  p[c.key] = p[c.key] || {};
  p[c.key]['key'] = c.key;
  p[c.key]['parent_category_name'] = c.parent_category_name;
  p[c.key]['idf'] = c.idf;

  p[c.key]['total'] = (p[c.key]['total'] || 0) + c.visits;

  p[c.key][prefix + c.time_diff_bucket] = (p[c.key][c.time_diff_bucket] || 0) + c.visits;
  return p;
}
var beforeAndAfterTabular = function beforeAndAfterTabular(before, after) {
  var domain_time = {};

  before.reduce(prefixReducer.bind(false, ""), domain_time);
  after.reduce(prefixReducer.bind(false, "-"), domain_time);

  var sorted = Object.keys(domain_time).map(function (k) {
    return domain_time[k];
  });

  return sorted;
};

function buildBeforeAndAfter(before_urls, after_urls, cat_summary, sort_by) {

  var bu = d3.nest().key(function (x) {
    return x.parent_category_name;
  }).key(function (x) {
    return x.time_diff_bucket;
  }).entries(before_urls);

  var au = d3.nest().key(function (x) {
    return x.parent_category_name;
  }).key(function (x) {
    return x.time_diff_bucket;
  }).entries(after_urls);

  var buckets = [10, 30, 60, 120, 180, 360, 720, 1440, 2880, 5760, 10080].map(function (x) {
    return x * 60;
  }),
      pop_categories = cat_summary.reduce(function (p, c) {
    p[c.key] = c;return p;
  }, {}),
      cats = cat_summary.map(function (p) {
    return p.key;
  });

  var before_categories = buildData(before_urls, buckets, pop_categories),
      after_categories = buildData(after_urls, buckets, pop_categories);

  var sortby = sort_by;

  if (sortby == "score") {

    before_categories = before_categories.sort(function (a, b) {
      var p = -1,
          q = -1;
      try {
        p = b.values.filter(function (x) {
          return x.key == "600";
        })[0].score;
      } catch (e) {}
      try {
        q = a.values.filter(function (x) {
          return x.key == "600";
        })[0].score;
      } catch (e) {}
      return d3.ascending(p, q);
    });
  } else if (sortby == "pop") {

    before_categories = before_categories.sort(function (a, b) {
      var p = cats.indexOf(a.key),
          q = cats.indexOf(b.key);
      return d3.ascending(p > -1 ? p : 10000, q > -1 ? q : 10000);
    });
  } else {

    before_categories = before_categories.sort(function (a, b) {
      var p = -1,
          q = -1;
      try {
        p = b.values.filter(function (x) {
          return x.key == "600";
        })[0].percent_diff;
      } catch (e) {}
      try {
        q = a.values.filter(function (x) {
          return x.key == "600";
        })[0].percent_diff;
      } catch (e) {}
      return d3.ascending(p, q);
    });
  }

  var order = before_categories.map(function (x) {
    return x.key;
  });

  after_categories = after_categories.filter(function (x) {
    return order.indexOf(x.key) > -1;
  }).sort(function (a, b) {
    return order.indexOf(a.key) - order.indexOf(b.key);
  });

  return {
    "after": after_urls,
    "before": before_urls,
    "category": cat_summary,
    "before_categories": before_categories,
    "after_categories": after_categories,
    "sortby": sort_by
  };
}

function aggregateDomains(urls, categories) {
  var categories = categories.filter(function (a) {
    return a.selected;
  }).map(function (a) {
    return a.key;
  });

  var idf = d3$1.nest().key(function (x) {
    return x.domain;
  }).rollup(function (x) {
    return x[0].idf;
  }).map(urls.filter(function (x) {
    return x.parent_category_name != "Internet & Telecom";
  }));

  var getIDF = function getIDF(x) {
    return idf[x] == "NA" || idf[x] > 8686 ? 0 : idf[x];
  };

  var values = urls.map(function (x) {
    return {
      "key": x.domain,
      "value": x.count,
      "parent_category_name": x.parent_category_name,
      "uniques": x.uniques,
      "url": x.url
    };
  });

  values = d3$1.nest().key(function (x) {
    return x.key;
  }).rollup(function (x) {
    return {
      "parent_category_name": x[0].parent_category_name,
      "key": x[0].key,
      "value": x.reduce(function (p, c) {
        return p + c.value;
      }, 0),
      "percent_unique": x.reduce(function (p, c) {
        return p + c.uniques / c.value;
      }, 0) / x.length,
      "urls": x.reduce(function (p, c) {
        p.indexOf(c.url) == -1 ? p.push(c.url) : p;return p;
      }, [])

    };
  }).entries(values).map(function (x) {
    return x.values;
  });

  if (categories.length > 0) values = values.filter(function (x) {
    return categories.indexOf(x.parent_category_name) > -1;
  });

  values.map(function (x) {
    x.tf_idf = getIDF(x.key) * (x.value * x.percent_unique) * (x.value * x.percent_unique);
    x.count = x.value;
    x.importance = Math.log(x.tf_idf);
  });
  values = values.sort(function (p, c) {
    return c.tf_idf - p.tf_idf;
  });

  var total = d3$1.sum(values, function (x) {
    return x.count * x.percent_unique;
  });

  values.map(function (x) {
    x.pop_percent = 1.02 / getIDF(x.key) * 100;
    x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent;

    x.sample_percent = x.count * x.percent_unique / total * 100;
  });

  var norm = d3$1.scale.linear().range([0, d3$1.max(values, function (x) {
    return x.pop_percent;
  })]).domain([0, d3$1.max(values, function (x) {
    return x.sample_percent;
  })]).nice();

  var tt = d3$1.sum(values, function (x) {
    return x.pop_percent;
  });

  values.map(function (x) {
    x.sample_percent_norm = norm(x.sample_percent);
    x.real_pop_percent = x.pop_percent / tt * 100;
    x.ratio = x.sample_percent / x.real_pop_percent;
  });

  return values;
}

function buildDomainsTab(urls, categories) {

  var values = aggregateDomains(urls, categories);

  return {
    key: "Top Domains",
    values: values.slice(0, 500)
  };
}

function init$1() {
  var s$$1 = s;

  s.registerEvent("add-filter", function (filter) {
    s$$1.publish("filters", s$$1.state().filters.concat(filter).filter(function (x) {
      return x.value;
    }));
  }).registerEvent("modify-filter", function (filter) {
    var filters = s$$1.state().filters;
    var has_exisiting = filters.filter(function (x) {
      return x.field + x.op == filter.field + filter.op;
    });

    if (has_exisiting.length) {
      var new_filters = filters.reverse().map(function (x) {
        if (x.field == filter.field && x.op == filter.op) {
          x.value += "," + filter.value;
        }
        return x;
      });
      s$$1.publish("filters", new_filters.filter(function (x) {
        return x.value;
      }));
    } else {
      s$$1.publish("filters", s$$1.state().filters.concat(filter).filter(function (x) {
        return x.value;
      }));
    }
  }).registerEvent("staged-filter.change", function (str) {
    s$$1.publish("staged_filter", str);
  }).registerEvent("logic.change", function (logic) {
    s$$1.publish("logic_options", logic);
  }).registerEvent("filter.change", function (filters) {
    s$$1.publishBatch({ "filters": filters });
  }).registerEvent("updateFilter", function (err, _filters, _state) {

    if (_state.data == undefined) return;

    var filters = prepareFilters(_state.filters);
    var logic = determineLogic(_state.logic_options);
    var full_urls = filterUrls(_state.data.original_urls, logic, filters);

    if (_state.data.full_urls && _state.data.full_urls.length == full_urls.length && _state.selected_comparison && _state.comparison_data == value.comparison && _state.sortby == _state.before_urls.sortby) return;

    // BASE DATASETS
    var value = {};

    value.full_urls = full_urls;
    value.comparison = _state.comparison_data ? _state.comparison_data.original_urls : _state.data.original_urls;

    //s.publishStatic("formatted_data",value)


    var cat_summary = categorySummary(value.full_urls, value.comparison);
    var summary = buildSummary(value.full_urls, value.comparison);

    s$$1.setStatic("category_summary", cat_summary);
    s$$1.setStatic("summary", summary);

    var domain_idfs = d3.nest().key(function (x) {
      return x.domain;
    }).rollup(function (x) {
      return x[0].idf;
    }).map(full_urls);

    var category_idfs = d3.nest().key(function (x) {
      return x.parent_category_name;
    }).rollup(function (x) {
      return x[0].category_idf;
    }).map(full_urls);

    s$$1.setStatic("domain_idfs", domain_idfs);
    s$$1.setStatic("category_idfs", category_idfs);

    // MEDIA PLAN


    //value.display_categories = {"key": "Categories", values: aggregateCategory(full_urls)}
    //value.category_hour = aggregateCategoryHour(full_urls)

    var categories = aggregateCategory(full_urls);

    var media_plan = {
      display_categories: { "key": "Categories", values: categories },
      category_hour: aggregateCategoryHour(full_urls)
    };

    s$$1.setStatic("media_plan", media_plan);

    // EXPLORE TABS
    var tabs = [buildDomainsTab(full_urls, categories), { key: "Top Categories", values: cat_summary
      //, buildUrlsTab(full_urls,categories)
    }];

    if (_state.tab_position) {
      tabs.map(function (x) {
        return x.selected = x.key == _state.tab_position;
      });
    }

    s$$1.setStatic("tabs", tabs);

    // EXECUTION PLAN
    var domains_rolled = d3.nest().key(function (x) {
      return x.domain;
    }).rollup(function (x) {
      return { "idf": x[0].idf, "count": x.length };
    }).entries(full_urls);

    var times_rolled = d3.nest().key(function (x) {
      return parseInt(x.hour) - 12 > 0 ? parseInt(x.hour) - 12 + "pm" : parseInt(x.hour) + "am";
    }).rollup(function (x) {
      return x.length;
    }).entries(full_urls);

    var edomains = tabs[0].values.sort(function (p, c) {
      return c.importance - p.importance;
    }).slice(0, 10);

    s$$1.setStatic("execution_plan", {
      "categories": tabs[1].values.sort(function (p, c) {
        return c.importance - p.importance;
      }).slice(0, 10),
      "domains": edomains,
      "articles": edomains.map(function (x) {
        return { "key": x.urls[0] };
      }).slice(0, 20),
      "times": times_rolled.sort(function (p, c) {
        return p.count - c.count;
      }).slice(0, 8),
      "filters_used": _state.filters
    });
    s$$1.setStatic("category_idfs", category_idfs);

    // TIMING
    var timing = buildTiming(value.full_urls, value.comparison);
    var timing_tabular = timingTabular(full_urls);
    var cat_timing_tabular = timingTabular(full_urls, "parent_category_name");
    var timing_tabs = [{ "key": "Top Domains", "values": timing_tabular, "data": value.full_urls }, { "key": "Top Categories", "values": cat_timing_tabular }];

    if (_state.tab_position) {
      timing_tabs.map(function (x) {
        return x.selected = x.key == _state.tab_position;
      });
    }

    s$$1.setStatic("time_summary", timing);
    s$$1.setStatic("time_tabs", timing_tabs);

    // BEFORE AND AFTER
    if (_state.data.before) {

      var catmap = function catmap(x) {
        return Object.assign(x, { key: x.parent_category_name });
      };
      var urlmap = function urlmap(x) {
        return Object.assign({ key: x.domain, idf: domain_idfs[x.domain] }, x);
      };

      var before_urls = filterUrls(_state.data.before, logic, filters).map(urlmap),
          after_urls = filterUrls(_state.data.after, logic, filters).map(urlmap),
          before_and_after = buildBeforeAndAfter(before_urls, after_urls, cat_summary, _state.sortby),
          before_after_tabular = beforeAndAfterTabular(before_urls, after_urls),
          cat_before_after_tabular = beforeAndAfterTabular(before_urls.map(catmap), after_urls.map(catmap));

      var before_tabs = [{ key: "Top Domains", values: before_after_tabular, data: before_and_after }, { key: "Top Categories", values: cat_before_after_tabular, data: before_and_after }];

      if (_state.tab_position) {
        before_tabs.map(function (x) {
          return x.selected = x.key == _state.tab_position;
        });
      }

      s$$1.setStatic("before_urls", before_and_after);
      s$$1.setStatic("before_tabs", before_tabs);
    }

    // KEYWORDS
    //s.setStatic("keyword_summary", buildKeywords(value.full_urls,value.comparions)) 


    s$$1.publishStatic("formatted_data", value);
  });
}

function init$2() {
  var s$$1 = s;

  s.registerEvent("action.change", function (action) {
    s$$1.publish("selected_action", action);
  }).registerEvent("action_date.change", function (date) {
    s$$1.publish("action_date", date);
  }).registerEvent("comparison_date.change", function (date) {
    s$$1.publish("comparison_date", date);
  }).registerEvent("comparison.change", function (action) {
    if (action.value == false) return s$$1.publish("selected_comparison", false);
    s$$1.publish("selected_comparison", action);
  });
}

var s$1 = s;

var deepcopy = function deepcopy(x) {
  return JSON.parse(JSON.stringify(x));
};

function init() {

  init$1();
  init$2();

  // OTHER events

  s.registerEvent("transform.change", function (x) {
    s$1.update("loading");
    s$1.publishStatic("transform", x.value);
    s$1.prepareEvent("updateFilter")(false, s$1.state().filters, s$1.state());
  }).registerEvent("sort.change", function (x) {
    var _s = s$1.state();
    var asc = _s.sort == x.key;

    s$1.update("loading");

    s$1.publishStatic("sort", x.key);
    s$1.publishStatic("ascending", asc && !_s.ascending);

    s$1.prepareEvent("updateFilter")(false, s$1.state().filters, s$1.state());
  }).registerEvent("view.change", function (x) {
    s$1.update("loading", true);
    var CP = deepcopy(s$1.state().dashboard_options).map(function (d) {
      d.selected = x.value == d.value ? 1 : 0;return d;
    });
    s$1.publish("dashboard_options", CP);
  }).registerEvent("tab.change", function (x) {
    s$1.update("loading", true);

    s$1.publishStatic("tab_position", x.key);
    s$1.prepareEvent("updateFilter")(false, s$1.state().filters, s$1.state());
  }).registerEvent("ba.sort", function (x) {
    s$1.publish("sortby", x.value);
    s$1.prepareEvent("updateFilter")(false, s$1.state().filters, s$1.state());
  });
}

function publishQSUpdates(updates, qs_state) {
  if (Object.keys(updates).length) {
    updates["qs_state"] = qs_state;
    s.publishBatch(updates);
  }
}

function init$4() {

  window.onpopstate = function (i) {

    var state = s$$1._state,
        qs_state = i.state;

    var updates = compare(qs_state, state);
    publishQSUpdates(updates, qs_state);
  };

  var s$$1 = s;

  s.subscribe("history", function (error, _state) {
    //console.log(
    //  "current: "+JSON.stringify(_state.qs_state), 
    //  JSON.stringify(_state.filters), 
    //  _state.dashboard_options
    //)

    var for_state = ["filters"];

    var qs_state = for_state.reduce(function (p, c) {
      if (_state[c]) p[c] = _state[c];
      return p;
    }, {});

    if (_state.selected_action) qs_state['selected_action'] = _state.selected_action.action_id;
    if (_state.selected_comparison) qs_state['selected_comparison'] = _state.selected_comparison.action_id;
    if (_state.dashboard_options) qs_state['selected_view'] = _state.dashboard_options.filter(function (x) {
      return x.selected;
    })[0].value;
    if (_state.action_date) qs_state['action_date'] = _state.action_date;
    if (_state.comparison_date) qs_state['comparison_date'] = _state.comparison_date;
    if (_state.transform) qs_state['transform'] = _state.transform;
    if (_state.tab_position) qs_state['tab_position'] = _state.tab_position;
    if (_state.sort) qs_state['sort'] = _state.sort;
    if (_state.ascending) qs_state['ascending'] = _state.ascending;

    if (_state.selected_action && qs(qs_state).to(qs_state) != window.location.search) {
      s$$1.publish("qs_state", qs_state);
    }
  }).subscribe("history.actions", function (error, value, _state) {
    var qs_state = qs({}).from(window.location.search);
    if (window.location.search.length && Object.keys(qs_state).length) {
      var updates = compare(qs_state, _state);
      return publishQSUpdates(updates, qs_state);
    } else {
      s$$1.publish("selected_action", value[0]);
    }
  }).subscribe("history.qs_state", function (error, qs_state, _state) {

    if (JSON.stringify(history.state) == JSON.stringify(qs_state)) return;
    if (window.location.search == "") history.replaceState(qs_state, "", qs(qs_state).to(qs_state));else history.pushState(qs_state, "", qs(qs_state).to(qs_state));
  });
}

var s$4 = s;

function init$5() {

  // Subscriptions that receive data / modify / change where it is stored

  s.subscribe("receive.data", function (error, value, state) {
    s$4.publishStatic("logic_categories", value.categories);
    s$4.publish("filters", state.filters);
  }).subscribe("receive.comparison_data", function (error, value, state) {
    s$4.publish("filters", state.filters);
  });

  // Subscriptions that will get more data

  s.subscribe("get.action_date", function (error, value, state) {
    s$4.publishStatic("data", action.getData(state.selected_action, state.action_date));
  }).subscribe("get.comparison_date", function (error, value, state) {
    if (!value) return s$4.publishStatic("comparison_data", false);
    s$4.publishStatic("comparison_data", action.getData(state.selected_comparison, state.comparison_date));
  }).subscribe("get.selected_action", function (error, value, state) {
    s$4.publishStatic("data", action.getData(value, state.action_date));
  }).subscribe("get.selected_comparison", function (error, value, state) {
    if (!value) return s$4.publishStatic("comparison_data", false);
    s$4.publishStatic("comparison_data", action.getData(value, state.comparison_date));
  });
}

var s$3 = s;

function init$3(target) {

  init$4();
  init$5();

  s.subscribe("change.loading", function (error, loading, value) {
    build(target)();
  }).subscribe("change.dashboard_options", s$3.prepareEvent("updateFilter")).subscribe("change.tabs", s$3.prepareEvent("updateFilter")).subscribe("change.logic_options", s$3.prepareEvent("updateFilter")).subscribe("update.filters", s$3.prepareEvent("updateFilter"));

  // REDRAW: this is where the entire app gets redrawn - if formatted_data changes, redraw the app

  s.subscribe("redraw.formatted_data", function (error, formatted_data, value) {
    s$3.update("loading", false);
    build(target)();
  });
}

function build(target) {
  var db = new Dashboard(target);
  return db;
}

var Dashboard = function () {
  function Dashboard(target) {
    classCallCheck(this, Dashboard);

    init();
    init$3(target);
    this.target(target);
    this.init();

    return this.call.bind(this);
  }

  createClass(Dashboard, [{
    key: 'target',
    value: function target(_target) {
      this._target = _target || d3_updateable(d3$1.select(".container"), "div", "div").style("width", "1000px").style("margin-left", "auto").style("margin-right", "auto");
    }
  }, {
    key: 'init',
    value: function init$$1() {
      var s$$1 = s;
      var value = s$$1.state();
      this.defaults(s$$1);
    }
  }, {
    key: 'defaults',
    value: function defaults$$1(s$$1) {

      if (!!s$$1.state().dashboard_options) return; // don't reload defaults if present

      s$$1.publishStatic("actions", action.getAll);
      s$$1.publishStatic("saved", dashboard.getAll);
      s$$1.publishStatic("line_items", line_item.getAll);

      var DEFAULTS = {
        logic_options: [{ "key": "All", "value": "and" }, { "key": "Any", "value": "or" }],
        logic_categories: [],
        filters: [{}],
        dashboard_options: [{ "key": "Overall", "value": "data-view", "selected": 1 }, { "key": "Path", "value": "ba-view", "selected": 0 }, { "key": "Timing", "value": "timing-view", "selected": 0 }, { "key": "Comparison", "value": "summary-view", "selected": 0
          //, {"key":"Media Plan", "value":"media-view","selected":0}

        }]
      };

      s$$1.update(false, DEFAULTS);
    }
  }, {
    key: 'call',
    value: function call() {

      var s$$1 = s;
      var value = s$$1.state();

      var db = new_dashboard(this._target).transform(value.transform || "").staged_filters(value.staged_filter || "").media(value.media_plan || {}).saved(value.saved || []).data(value.formatted_data || {}).actions(value.actions || []).selected_action(value.selected_action || {}).selected_comparison(value.selected_comparison || {}).action_date(value.action_date || 0).comparison_date(value.comparison_date || 0).loading(value.loading || false).line_items(value.line_items || false).summary(value.summary || false).time_summary(value.time_summary || false).category_summary(value.category_summary || false).keyword_summary(value.keyword_summary || false).before(value.before_urls || []).before_tabs(value.before_tabs || [])
      //.after(value.after_urls || [])
      .logic_options(value.logic_options || false).logic_categories(value.logic_categories || false).filters(value.filters || false).view_options(value.dashboard_options || false).explore_tabs(value.tabs || false).time_tabs(value.time_tabs || false).sort(value.sort || false).ascending(value.ascending || false).on("add-filter", s$$1.prepareEvent("add-filter")).on("modify-filter", s$$1.prepareEvent("modify-filter")).on("staged-filter.change", s$$1.prepareEvent("staged-filter.change")).on("action.change", s$$1.prepareEvent("action.change")).on("action_date.change", s$$1.prepareEvent("action_date.change")).on("comparison_date.change", s$$1.prepareEvent("comparison_date.change")).on("comparison.change", s$$1.prepareEvent("comparison.change")).on("logic.change", s$$1.prepareEvent("logic.change")).on("filter.change", s$$1.prepareEvent("filter.change")).on("view.change", s$$1.prepareEvent("view.change")).on("tab.change", s$$1.prepareEvent("tab.change")).on("ba.sort", s$$1.prepareEvent("ba.sort")).on("sort.change", s$$1.prepareEvent("sort.change")).on("transform.change", s$$1.prepareEvent("transform.change")).draw();
    }
  }]);
  return Dashboard;
}();

var version = "0.0.1";

exports.version = version;
exports.view = new_dashboard;
exports.build = build;
exports.initEvents = init;
exports.initAPI = init$5;

Object.defineProperty(exports, '__esModule', { value: true });

})));