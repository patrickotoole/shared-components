(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3'), require('api')) :
	typeof define === 'function' && define.amd ? define('dashboard', ['exports', 'd3', 'api'], factory) :
	(factory((global.dashboard = global.dashboard || {}),global.d3,global.api));
}(this, (function (exports,d3$1,api) { 'use strict';

d3$1 = 'default' in d3$1 ? d3$1['default'] : d3$1;

function State(_current, _static) {

  this._noop = function() {};
  this._events = {};

  this._on = {
      "change": this._noop
    , "build": this._noop
    , "forward": this._noop
    , "back": this._noop
  };

  this._static = _static || {};

  this._current = _current || {};
  this._past = [];
  this._future = [];

  this._subscription = {};
  this._state = this._buildState();


}

State.prototype = {
    state: function() {
      return Object.assign({},this._state)
    }
  , publish: function(name,cb) {

       var push_cb = function(error,value) {
         if (error) return subscriber(error,null)
         
         this.update(name, value);
         this.trigger(name, this.state()[name], this.state());

       }.bind(this);

       if (typeof cb === "function") cb(push_cb);
       else push_cb(false,cb);

       return this
    }
  , publishBatch: function(obj) {
      Object.keys(obj).map(function(x) {
        this.update(x,obj[x]);
      }.bind(this));

      this.triggerBatch(obj,this.state());
    }
  , push: function(state) {
      this.publish(false,state);
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
      this.subscribe(id,undefined);
      return this
    }

  , _global_subscribe: function(fn) {
      var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
        })
      , to = "*";
     
      this._targetted_subscribe(id,to,fn);

      return this
    }
  , _named_subscribe: function(id,fn) {
      var to = "*";
      this._targetted_subscribe(id,to,fn);

      return this
    }
  , _targetted_subscribe: function(id,to,fn) {

      var subscriptions = this.get_subscribers_obj(to)
        , to_state = this._state[to]
        , state = this._state;

      if (arguments.length < 2 && fn === undefined) return subscriptions[id] || function() {};
      if (fn === undefined) {
        delete subscriptions[id];
        return this
      }
      subscriptions[id] = fn;

      return this      
    }
  
  , get_subscribers_obj: function(k) {
      this._subscription[k] = this._subscription[k] || {};
      return this._subscription[k]
    }
  , get_subscribers_fn: function(k) {
      var fns = this.get_subscribers_obj(k)
        , funcs = Object.keys(fns).map(function(x) { return fns[x] })
        , fn = function(error,value,state) {
            return funcs.map(function(g) { return g(error,value,state) })
          };

      return fn
    }
  , trigger: function(name, _value, _state) {
      var subscriber = this.get_subscribers_fn(name) || function() {}
        , all = this.get_subscribers_fn("*") || function() {};

      this.on("change")(name,_value,_state);

      subscriber(false,_value,_state);
      all(false,_state);
    }
  , triggerBatch: function(obj, _state) {

      var all = this.get_subscribers_fn("*") || function() {}
        , fns = Object.keys(obj).map(function(k) { 
            var fn = this.get_subscribers_fn || function() {};
            return fn.bind(this)(k)(false,obj[k],_state)  
          }.bind(this));
      
      all(false,_state);

    }
  , _buildState: function() {
      this._state = Object.assign({},this._current);

      Object.keys(this._static).map(function(k) { 
        this._state[k] = this._static[k];
      }.bind(this));

      this.on("build")(this._state, this._current, this._static);

      return this._state
    }
  , update: function(name, value) {
      this._pastPush(this._current);
      if (name) {
        var obj = {};
        obj[name] = value;
      }
      this._current = (name) ? 
        Object.assign({}, this._current, obj) :
        Object.assign({}, this._current, value );

      this._buildState();

      return this
    }
  , setStatic: function(k,v) {
      if (k != undefined && v != undefined) this._static[k] = v;
      this._buildState();

      return this
    }
  , publishStatic: function(name,cb) {

      var push_cb = function(error,value) {
        if (error) return subscriber(error,null)
        
        this._static[name] = value;
        this._buildState();
        this.trigger(name, this.state()[name], this.state());

      }.bind(this);

      if (typeof cb === "function") cb(push_cb);
      else push_cb(false,cb);

      return this

    }
  , _pastPush: function(v) {
      this._past.push(v);
    }
  , _futurePush: function(v) {
      this._future.push(v);
    }
  , forward: function() {
      this._pastPush(this._current);
      this._current = this._future.pop();

      this.on("forward")(this._current,this._past, this._future);

      this._state = this._buildState();
      this.trigger(false, this._state, this._state);
    }
  , back: function() {
      this._futurePush(this._current);
      this._current = this._past.pop();

      this.on("back")(this._current,this._future, this._past);

      this._state = this._buildState();
      this.trigger(false, this._state, this._state);
    }
  , on: function(action$$1,fn) {
      if (fn === undefined) return this._on[action$$1] || this._noop;
      this._on[action$$1] = fn;
      return this
    } 
  , registerEvent: function(name,fn) {
      if (fn === undefined) return this._events[name] || this._noop;
      this._events[name] = fn;
      return this
    }
  , prepareEvent: function(name) {
      var fn = this._events[name]; 
      return fn.bind(this)
    }
  , dispatchEvent: function(name,data) {
      var fn = this.prepareEvent(name);
      fn(data);
      return this
    }

};

function state$2(_current, _static) {
  return new State(_current, _static)
}

state$2.prototype = State.prototype;

function QS(state) {
  //this.state = state
  var self = this;

  this._encodeObject = function(o) {
    return JSON.stringify(o)
  };

  this._encodeArray = function(o) {
    return JSON.stringify(o)
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
    to: function(state,encode) {
      var self = this;

      var params = Object.keys(state).map(function(k) {

        var value = state[k]
          , o = value;

        if (value && (typeof(value) == "object") && (value.length > 0)) {
          o = self._encodeArray(value);
        } else if (typeof(value) == "object") {
          o = self._encodeObject(value);
        } 

        return k + "=" + encodeURIComponent(o) 

      });

      if (encode) return "?" + "encoded=" + btoa(escape(lzw_encode(params.join("&"))));
      return "?" + params.join("&")
      
    }
  , from: function(qs) {
      var query = {};
      if (qs.indexOf("?encoded=") == 0) qs = lzw_decode(unescape(atob(qs.split("?encoded=")[1])));
      var a = qs.substr(1).split('&');
      for (var i = 0; i < a.length; i++) {
          var b = a[i].split('=');
          
          query[decodeURIComponent(b[0])] = (decodeURIComponent(b[1] || ''));
          var _char = query[decodeURIComponent(b[0])][0]; 
          if ((_char == "{") || (_char == "[")) query[decodeURIComponent(b[0])] = JSON.parse(query[decodeURIComponent(b[0])]);
      }
      return query;
    }
};

function qs(state) {
  return new QS(state)
}

qs.prototype = QS.prototype;

function comparison_eval(obj1,obj2,_final) {
  return new ComparisonEval(obj1,obj2,_final)
}

var noop$2 = (x) => {};
var eqop = (x,y) => x == y;
var acc = (name,second) => {
      return (x,y) => second ? y[name] : x[name] 
    };

class ComparisonEval {
  constructor(obj1,obj2,_final) {
    this._obj1 = obj1;
    this._obj2 = obj2;
    this._final = _final;
    this._comparisons = {};
  }

  accessor(name,acc1,acc2) {
    this._comparisons[name] = Object.assign({},this._comparisons[name],{
        acc1: acc1
      , acc2: acc2
    });
    return this
  }

  success(name,fn) {
    this._comparisons[name] = Object.assign({},this._comparisons[name],{
        success: fn
    });
    return this
  }

  failure(name,fn) {
    this._comparisons[name] = Object.assign({},this._comparisons[name],{
        failure: fn
    });
    return this
  }

  equal(name,fn) {
    this._comparisons[name] = Object.assign({},this._comparisons[name],{
        eq: fn
    });
    return this
  }

  evaluate() {
    Object.keys(this._comparisons).map( k => {
      this._eval(this._comparisons[k],k);
    });
    return this._final
  }
  

  comparsion(name,acc1,acc2,eq,success,failure) {
    this._comparisons[name] = {
        acc1: acc1
      , acc2: acc2
      , eq: eq || eqop
      , success: success || noop$2
      , failure: failure || noop$2
    };
    return this
  }

  _eval(comparison,name) {
    var acc1 = comparison.acc1 || acc(name)
      , acc2 = comparison.acc2 || acc(name,true)
      , val1 = acc1(this._obj1,this._obj2)
      , val2 = acc2(this._obj1,this._obj2)
      , eq = comparison.eq || eqop
      , succ = comparison.success || noop$2
      , fail = comparison.failure || noop$2;

    var _evald = eq(val1, val2);

    _evald ? 
      succ.bind(this)(val1,val2,this._final) : 
      fail.bind(this)(val1,val2,this._final);
  }

  
}

debugger
const s = window.__state__ || state$2();
window.__state__ = s;

function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val;
  return this
}





function autoSize(wrap,adjustWidth,adjustHeight) {

  function elementToWidth(elem) {

    var _w = wrap.node().offsetWidth || wrap.node().parentNode.offsetWidth || wrap.node().parentNode.parentNode.offsetWidth;
    var num = _w || wrap.style("width").split(".")[0].replace("px",""); 
    return parseInt(num)
  }

  function elementToHeight(elem) {
    var num = wrap.style("height").split(".")[0].replace("px","");
    return parseInt(num)
  }

  var w = elementToWidth(wrap) || 700,
    h = elementToHeight(wrap) || 340;

  w = adjustWidth(w);
  h = adjustHeight(h);


  var margin = {top: 10, right: 15, bottom: 10, left: 15},
      width  = w - margin.left - margin.right,
      height = h - margin.top - margin.bottom;

  return {
    margin: margin,
    width: width,
    height: height
  }
}

function Select(target) {
  this._on = {};
  this.target = target;
}

function noop$5() {}
function identity$2(x) { return x }
function key$2(x) { return x.key }


function select(target) {
  return new Select(target)
}

Select.prototype = {
    options: function(val) {
      return accessor.bind(this)("options",val) 
    }
  , draw: function() {

      this._select = d3_updateable(this.target,"select","select",this._options);

      var bound = this.on("select").bind(this);

      this._select
        .on("change",function(x) { bound(this.selectedOptions[0].__data__); });

      this._options = d3_splat(this._select,"option","option",identity$2,key$2)
        .text(key$2)
        .property("selected", (x) => x.value == this._selected ? "selected" : null);

      return this
    }
  , selected: function(val) {
      return accessor.bind(this)("selected",val)
    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$5;
      this._on[action$$1] = fn;
      return this
    }
};

function noop$4() {}
function buttonWrap(wrap) {
  var head = d3_updateable(wrap, "h3.buttons","h3")
    .classed("buttons",true)
    .style("margin-bottom","15px")
    .style("margin-top","-5px");

  var right_pull = d3_updateable(head,".pull-right","span")
    .classed("pull-right header-buttons", true)
    .style("margin-right","17px")
    .style("line-height","22px")
    .style("text-decoration","none !important");

  return right_pull
}

function expansionWrap(wrap) {
  return d3_updateable(wrap,"div.header-body","div")
    .style("font-size","13px")
    .style("text-transform","none")
    .style("color","#333")
    .style("font-weight","normal")
    .style("margin-left","175px")
    .style("padding","25px")
    .style("margin-bottom","25px")
    .style("margin-right","175px")
    .style("background-color","white")
    .classed("header-body hidden",true)
}

function headWrap(wrap) {
  return d3_updateable(wrap, "h3.data-header","h3")
    .classed("data-header",true)
    .style("margin-bottom","15px")
    .style("margin-top","-5px")
    .style("font-weight"," bold")
    .style("font-size"," 14px")
    .style("line-height"," 22px")
    .style("text-transform"," uppercase")
    .style("color"," #888")
    .style("letter-spacing"," .05em")

}


function Header(target) {
  this._on = {};
  this.target = target;

  var CSS_STRING = String(function() {/*
    .header-buttons a span.hover-show { display:none }
    .header-buttons a:hover span.hover-show { display:inline; padding-left:3px }
  */});
  
}

function header(target) {
  return new Header(target)
}

Header.prototype = {
    text: function(val) {
      return accessor.bind(this)("text",val) 
    }
  , options: function(val) {
      return accessor.bind(this)("options",val) 
    }
  , buttons: function(val) {
      return accessor.bind(this)("buttons",val) 
    }
  , expansion: function(val) {
      return accessor.bind(this)("expansion",val) 
    }
  , draw: function() {
      var wrap = d3_updateable(this.target, ".header-wrap","div")
        .classed("header-wrap",true);

      var expand_wrap = expansionWrap(wrap)
        , button_wrap = buttonWrap(wrap)
        , head_wrap = headWrap(wrap);

      d3_updateable(head_wrap,"span.title","span")
        .classed("title",true)
        .text(this._text);

      if (this._options) {

        var bound = this.on("select").bind(this);

        var selectBox = select(head_wrap)
          .options(this._options)
          .on("select",function(x) { bound(x); })
          .draw();

        selectBox._select
          .style("width","19px")
          .style("margin-left","12px");
          
        selectBox._options
          .style("color","#888")
          .style("min-width","100px")
          .style("text-align","center")
          .style("display","inline-block")
          .style("padding","5px");
      }

      if (this._buttons) {

        var self = this;

        var a = d3_splat(button_wrap,"a","a",this._buttons, function(x) { return x.text })
          .style("vertical-align","middle")
          .style("font-size","12px")
          .style("font-weight","bold")
          .style("border-right","1px solid #ccc")
          .style("padding-right","10px")
          .style("padding-left","10px")
          .style("display","inline-block")
          .style("line-height","22px")
          .style("text-decoration","none")
          .html(x => "<span class='" + x.icon + "'></span><span style='padding-left:3px'>" + x.text + "</span>")
          .attr("class",x => x.class)
          .on("click",x => this.on(x.class + ".click")(x));


      }

      return this
    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$4;
      this._on[action$$1] = fn;
      return this
    }
};

function accessor$1(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val;
  return this
}

function d3_updateable$1(target,selector,type,data,joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(
    function(x){return data ? [data] : [x]},
    joiner || function(x){return [x]}
  );

  updateable.enter()
    .append(type);

  return updateable
}

function d3_splat$1(target,selector,type,data,joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(
    data || function(x){return x},
    joiner || function(x){return x}
  );

  updateable.enter()
    .append(type);

  return updateable
}

function Table(target) {
  var CSS_STRING = String(function() {/*
.table-wrapper tr { height:33px}
.table-wrapper tr th { border-right:1px dotted #ccc } 
.table-wrapper tr th:last-of-type { border-right:none } 

.table-wrapper tr { border-bottom:1px solid #ddd }
.table-wrapper tr th, .table-wrapper tr td { 
  padding-left:10px;
  max-width:200px
}

.table-wrapper thead tr { 
  background-color:#e3ebf0;
}
.table-wrapper thead tr th .title { 
  text-transform:uppercase
}
.table-wrapper tbody tr { 
}
.table-wrapper tbody tr:hover { 
  background-color:white;
  background-color:#f9f9fb
}
  */});

  try {
    d3_updateable$1(d3$1.select("head"),"style#table-css","style")
      .attr("id","table-css")
      .text(CSS_STRING.replace("function () {/*","").replace("*/}",""));
  } catch(e) {
  }

  this._target = target;
  this._data = {};//EXAMPLE_DATA
  this._sort = {};
  this._renderers = {};
  this._top = 0;

  this._default_renderer = function (x) {
    if (x.key.indexOf("percent") > -1) return d3$1.select(this).text(function(x) { 
        var pd = this.parentNode.__data__;
        return d3$1.format(".2%")(pd[x.key]/100)
      })
   
    return d3$1.select(this).text(function(x) { 
      var pd = this.parentNode.__data__;
      return pd[x.key] > 0 ? d3$1.format(",.2f")(pd[x.key]).replace(".00","") : pd[x.key]
    })
  };

  this._hidden_fields = [];
  this._on = {};
  this._render_header = function(wrap) {


    wrap.each(function(data) {
      var headers = d3_updateable$1(d3$1.select(this),".headers","div")
        .classed("headers",true)
        .style("text-transform","uppercase")
        .style("font-weight","bold")
        .style("line-height","24px")
        .style("border-bottom","1px solid #ccc")
        .style("margin-bottom","10px");

      headers.html("");


      d3_updateable$1(headers,".url","div")
        .classed("url",true)
        .style("width","75%")
        .style("display","inline-block")
        .text("Article");

      d3_updateable$1(headers,".count","div")
        .classed("count",true)
        .style("width","25%")
        .style("display","inline-block")
        .text("Count");


    });

  };
  this._render_row = function(row) {

      d3_updateable$1(row,".url","div")
        .classed("url",true)
        .style("width","75%")
        .style("line-height","24px")
        .style("height","24px")
        .style("overflow","hidden")
        .style("display","inline-block")
        .text(function(x) {return x.key});

      d3_updateable$1(row,".count","div")
        .classed("count",true)
        .style("width","25%")
        .style("display","inline-block")
        .style("vertical-align","top")
        .text(function(x){return x.value});

  };
}

function table(target) {
  return new Table(target)
}

Table.prototype = {

    data: function(val) { 
      var value = accessor$1.bind(this)("data",val); 
      if (val && val.values.length && this._headers == undefined) { 
        var headers = Object.keys(val.values[0]).map(function(x) { return {key:x,value:x} });
        this.headers(headers);
      }
      return value
    }
  , skip_option: function(val) { return accessor$1.bind(this)("skip_option",val) }

  , title: function(val) { return accessor$1.bind(this)("title",val) }
  , row: function(val) { return accessor$1.bind(this)("render_row",val) }
  , default_renderer: function(val) { return accessor$1.bind(this)("default_renderer",val) }
  , top: function(val) { return accessor$1.bind(this)("top",val) }

  , header: function(val) { return accessor$1.bind(this)("render_header",val) }
  , headers: function(val) { return accessor$1.bind(this)("headers",val) }
  , hidden_fields: function(val) { return accessor$1.bind(this)("hidden_fields",val) }
  , all_headers: function() {
      var headers = this.headers().reduce(function(p,c) { p[c.key] = c.value; return p},{})
        , is_locked = this.headers().filter(function(x) { return !!x.locked }).map(function(x) { return x.key });

      if (this._data.values && this._data.values.length) {
        
        var all_heads = Object.keys(this._data.values[0]).map(function(x) { 
          if (this._hidden_fields && this._hidden_fields.indexOf(x) > -1) return false
          return {
              key:x
            , value:headers[x] || x
            , selected: !!headers[x]
            , locked: (is_locked.indexOf(x) > -1 ? true : undefined) 
          } 
        }.bind(this)).filter(function(x) { return x });
        var getIndex = function(k) {
          return is_locked.indexOf(k) > -1 ? is_locked.indexOf(k) + 10 : 0
        };

        all_heads = all_heads.sort(function(p,c) { return getIndex(c.key || -Infinity) - getIndex(p.key || -Infinity) });
        return all_heads
      }
      else return this.headers()
    }
  , sort: function(key,ascending) {
      if (!key) return this._sort
      this._sort = {
          key: key
        , value: !!ascending
      };
      return this
    }

  , render_wrapper: function() {
      var wrap = this._target;

      var wrapper = d3_updateable$1(wrap,".table-wrapper","div")
        .classed("table-wrapper",true)
        .style("position","relative");


      var table = d3_updateable$1(wrapper,"table.main","table")
        .classed("main",true)
        .style("width","100%");

      this._table_main = table;

      var thead = d3_updateable$1(table,"thead","thead");
      d3_updateable$1(table,"tbody","tbody");



      if (!this._skip_option) {
      var table_fixed = d3_updateable$1(wrapper,"table.fixed","table")
        .classed("hidden", true) // TODO: make this visible when main is not in view
        .classed("fixed",true)
        .style("width",wrapper.style("width"))
        .style("top",this._top + "px")
        .style("position","fixed");

      var self = this;
      try {
      d3$1.select(window).on('scroll', function() {
        console.log(table.node().getBoundingClientRect().top, self._top);
        if (table.node().getBoundingClientRect().top < self._top) table_fixed.classed("hidden",false);
        else table_fixed.classed("hidden",true);

        var widths = [];

        wrap.selectAll(".main")
          .selectAll(".table-headers")
          .selectAll("th")
          .each(function(x,i) {
            widths.push(this.offsetWidth);
          });

        wrap.selectAll(".fixed")
          .selectAll(".table-headers")
          .selectAll("th")
          .each(function(x,i) {
            d3$1.select(this).style("width",widths[i] + "px");
          });
        
      });
      } catch(e) {}
       

      this._table_fixed = table_fixed;


      var thead = d3_updateable$1(table_fixed,"thead","thead");

      var table_button = d3_updateable$1(wrapper,".table-option","a")
        .classed("table-option",true)
        .style("position","absolute")
        .style("top","-1px")
        .style("right","0px")
        .style("cursor","pointer")
        .style("line-height","33px")
        .style("font-weight","bold")
        .style("padding-right","8px")
        .style("padding-left","8px")
        .text("OPTIONS")
        .style("background","#e3ebf0")
        .on("click",function(x) {
          this._options_header.classed("hidden",!this._options_header.classed("hidden"));
          this._show_options = !this._options_header.classed("hidden");
        }.bind(this));
      }

      return wrapper
    }  
  , render_header: function(table) {

      var thead = table.selectAll("thead")
        , tbody = table.selectAll("tbody");

      if (this.headers() == undefined) return

      var options_thead = d3_updateable$1(thead,"tr.table-options","tr",this.all_headers(),function(x){ return 1})
        .classed("hidden", !this._show_options)
        .classed("table-options",true);

      var h = this._skip_option ? this.headers() : this.headers().concat([{key:"spacer", width:"70px"}]);
      var headers_thead = d3_updateable$1(thead,"tr.table-headers","tr",h,function(x){ return 1})
        .classed("table-headers",true);


      var th = d3_splat$1(headers_thead,"th","th",false,function(x,i) {return x.key + i })
        .style("width",function(x) { return x.width })
        .style("position","relative")
        .order();


      d3_updateable$1(th,"span","span")
        .classed("title",true)
        .style("cursor","pointer")
        .text(function(x) { return x.value })
        .on("click",function(x) {
          if (x.sort === false) {
            delete x['sort'];
            this._sort = {};
            this.draw();
          } else {
            x.sort = !!x.sort;

            this.sort(x.key,x.sort);
            this.draw();
          }
        }.bind(this));

      d3_updateable$1(th,"i","i")
        .style("padding-left","5px")
        .classed("fa",true)
        .classed("fa-sort-asc", function(x) { return (x.key == this._sort.key) ? this._sort.value === true : undefined }.bind(this))
        .classed("fa-sort-desc", function(x) { return (x.key == this._sort.key) ? this._sort.value === false : undefined }.bind(this));

      var self = this;
      var can_redraw = true;

      var drag = d3$1.behavior.drag()
        .on("drag", function(d,i) {
            var x = d3$1.event.dx;
            var w = parseInt(d3$1.select(this.parentNode).style("width").replace("px"));
            this.parentNode.__data__.width = (w+x)+"px";
            d3$1.select(this.parentNode).style("width", (w+x)+"px");

            var index = Array.prototype.slice.call(this.parentNode.parentNode.children,0).indexOf(this.parentNode) + 1;
            d3$1.select(this.parentNode.parentNode.children[index]).style("width",undefined);

            if (can_redraw) {
              can_redraw = false;
              setTimeout(function() {
                can_redraw = true;
                tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").each(function(x) {
                  var render = self._renderers[x.key];
                  if (render) render.bind(this)(x);
    
                });
                

              },1);
            }
            
        });

      var draggable = d3_updateable$1(th,"b","b")
        .style("cursor", "ew-resize")
        .style("font-size", "100%")
        .style("height", "100%")
        .style("position", "absolute")
        .style("right", "-8px")
        .style("top", "0")
        .style("width", "10px")
        .style("z-index", 1)
        .on("mouseover",function(){
           var index = Array.prototype.slice.call(this.parentNode.parentNode.children,0).indexOf(this.parentNode) + 1;
           tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").style("border-right","1px dotted #ccc");
        })
        .on("mouseout",function(){
           var index = Array.prototype.slice.call(this.parentNode.parentNode.children,0).indexOf(this.parentNode) + 1;
           tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").style("border-right",undefined);
        })
        .call(drag);

      th.exit().remove();

      if (!this._skip_option) {
      var options = d3_updateable$1(options_thead,"th","th",false,function() { return 1})
        .attr("colspan",this.headers().length+1)
        .style("padding-top","10px")
        .style("padding-bottom","10px");
                
      var option = d3_splat$1(options,".option","div",false,function(x) { return x.key })
        .classed("option",true)
        .style("width","240px")
        .style("display","inline-block");


      option.exit().remove();

      var self = this;

      d3_updateable$1(option,"input","input")
        .attr("type","checkbox")
        .property("checked",function(x) { 
          this.checked = x.selected;
          return x.selected ? "checked" : undefined 
        })
        .attr("disabled",function(x) { return x.locked })
        .on("click", function(x) {
          x.selected = this.checked;
          if (x.selected) {
            self.headers().push(x);
            return self.draw()
          }
          var indices = self.headers().map(function(z,i) { return z.key == x.key ? i : undefined  }) 
            , index = indices.filter(function(z) { return z }) || 0;

          self.headers().splice(index,1);
          self.draw();

        });

      d3_updateable$1(option,"span","span")
        .text(function(x) { return " " + x.value });

     }


     this._options_header = this._target.selectAll(".table-options");
    }
  
  , render_rows: function(table) {

      var self = this;
      var tbody = table.selectAll("tbody");

      if (this.headers() == undefined) return
      if (!(this._data && this._data.values && this._data.values.length)) return

      var data = this._data.values
        , sortby = this._sort || {};

      console.error(data);

      data = data.sort(function(p,c) {
        var a = p[sortby.key] || -Infinity
          , b = c[sortby.key] || -Infinity;

        return sortby.value ? d3$1.ascending(a,b) : d3$1.descending(a,b)
      });

      var rows = d3_splat$1(tbody,"tr","tr",data,function(x,i){ return String(sortby.key + x[sortby.key]) + i })
        .order()
        .on("click",function(x) {
          self.on("expand").bind(this)(x);
        });

      rows.exit().remove();

      var td = d3_splat$1(rows,"td","td",this.headers(),function(x,i) {return x.key + i })
        .each(function(x) {
          var dthis = d3$1.select(this);

          var renderer = self._renderers[x.key];

          if (!renderer) { 
            renderer = self._default_renderer.bind(this)(x); 
          } else {
            return renderer.bind(this)(x)
          }


        });

        

      td.exit().remove();

      var o = d3_updateable$1(rows,"td.option-header","td",false,function() { return 1})
        .classed("option-header",true)
        .style("width","70px")
        .style("text-align","center");
 
      if (this._skip_option) o.classed("hidden",true); 


      d3_updateable$1(o,"a","a")
        .style("font-weight","bold")
        .html(self.option_text());
        



    }
  , option_text: function(val) { return accessor$1.bind(this)("option_text",val) }
  , render: function(k,fn) {
      if (fn == undefined) return this._renderers[k] || false
      this._renderers[k] = fn;
      return this
    }
  , draw: function() {
      var self = this;
      var wrapper = this.render_wrapper();

      wrapper.selectAll("table")
        .each(function(x) { 
          self.render_header(d3$1.select(this)); 
        });

      this.render_rows(this._table_main);

      return this

    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || function() {};
      this._on[action$$1] = fn;
      return this
    }
  , d3: d3$1
};

//import d3 from 'd3'

function d3_updateable$2(target,selector,type,data,joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(
    function(x){return data ? [data] : [x]},
    joiner || function(x){return [x]}
  );

  updateable.enter()
    .append(type);

  return updateable
}

function d3_splat$2(target,selector,type,data,joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(
    data || function(x){return x},
    joiner || function(x){return x}
  );

  updateable.enter()
    .append(type);

  return updateable
}


var typewatch = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();



function Filter(target) {
  this._target = target;
  this._data = false;
  this._on = {};
  this._render_op = {};
}

function filter$2(target) {
  return new Filter(target)
}

Filter.prototype = {
    draw: function() {

      var wrap = d3_updateable$2(this._target,".filters-wrapper","div",this.data(),function() { return 1})
        .classed("filters-wrapper",true)
        .style("padding-left", "10px")
        .style("padding-right", "20px");

      var filters = d3_updateable$2(wrap,".filters","div",false,function(x) { return 1})
        .classed("filters",true);
      
      var filter = d3_splat$2(filters,".filter","div",function(x) { return x },function(x,i) { return i + x.field })
        .classed("filter",true)
        .style("line-height","33px");

      filter.exit().remove();
      
      var self = this;
      filter.each(function(v,pos) {
        var dthis = d3.select(this);
        self.filterRow(dthis, self._fields, self._ops, v);
      });
      
      this.filterFooter(wrap);

      return this
      
    }
  , ops: function(d) {
      if (d === undefined) return this._ops
      this._ops = d;
      return this
    }
  , fields: function(d) {
      if (d === undefined) return this._fields
      this._fields = d;
      return this
  	}
  , data: function(d) {
      if (d === undefined) return this._data
      this._data = d;
      return this
  	}
  , text: function(fn) {
      if (fn === undefined) return this._fn || function(x){ return x.key }
      this._fn = fn;
      return this
    }
  , render_op: function(op,fn) {
      if (fn === undefined) return this._render_op[op] || function() {};
      this._render_op[op] = fn;
      return this
    }

  , on: function(action$$1,fn) {
      if (fn === undefined) return this._on[action$$1] || function() {};
      this._on[action$$1] = fn;
      return this
    }
  , buildOp: function(obj) {
      var op = obj.op
        , field = obj.field
        , value = obj.value;
    
      if ( [op,field,value].indexOf(undefined) > -1) return function() {return true}
    
      return this._ops[op](field, value)
    }
  , filterRow: function(_filter, fields, ops, value) {
    
      var self = this;

      var remove = d3_updateable$2(_filter,".remove","a")
        .classed("remove",true)
        .style("float","right")
        .style("font-weight","bold")
        .html("&#10005;")
        .on("click",function(x) {
          var new_data = self.data().filter(function(f) { return f !== x });
          self.data(new_data);
          self.draw();
          self.on("update")(self.data());

        });

      var filter = d3_updateable$2(_filter,".inner","div")
        .classed("inner",true);

      var select = d3_updateable$2(filter,"select.field","select",fields)
        .classed("field",true)
        .style("width","165px")
        .on("change", function(x,i) {
          value.field = this.selectedOptions[0].__data__;
          
          var pos = 0;
          fields.map(function(x,i) {
            if (x == value.field) pos = i;
          });

          var selected = ops[pos].filter(function(x) { return x.key == value.op });
          if (selected.length == 0) value.op = ops[pos][0].key;
          //value.fn = self.buildOp(value)
          self.on("update")(self.data());

          
          
          self.drawOps(filter, ops[pos], value, pos);
        });
      
      d3_updateable$2(select,"option","option")
        .property("disabled" ,true)
        .property("hidden", true)
        .text("Filter...");

      
      d3_splat$2(select,"option","option")
        .text(function(x) { return x })
        .attr("selected", function(x) { return x == value.field ? "selected" : undefined });

      if (value.op && value.field && value.value) {
        var pos = fields.indexOf(value.field);
        self.drawOps(filter, ops[pos], value, pos);
      }


    }
  , drawOps: function(filter, ops, value) {

      

      var self = this;

      var select = d3_updateable$2(filter,"select.op","select",false, function(x) {return 1})
        .classed("op",true)
        .style("width","100px")
        .style("margin-left","10px")
        .style("margin-right","10px")
        .on("change", function(x){
          value.op = this.selectedOptions[0].__data__.key;
          //value.fn = self.buildOp(value)
          self.on("update")(self.data());
          self.drawInput(filter, value, value.op);
        });

      //var dflt = [{"key":"Select Operation...","disabled":true,"hidden":true}]

      var new_ops = ops; //dflt.concat(ops)

      value.op = value.op || new_ops[0].key;

      var ops = d3_splat$2(select,"option","option",new_ops,function(x){return x.key})
        .text(function(x) { return x.key.split(".")[0] }) 
        .attr("selected", function(x) { return x.key == value.op ? "selected" : undefined });

      ops.exit().remove();
      self.drawInput(filter, value, value.op);

    }
  , drawInput: function(filter, value, op) {

      var self = this;

      filter.selectAll(".value").remove();
      var r = this._render_op[op];

      if (r) {
        return r.bind(this)(filter,value)
      }

      d3_updateable$2(filter,"input.value","input")
        .classed("value",true)
        .style("padding-left","10px")
        .style("width","150px")
        .style("line-height","1em")

        .attr("value", value.value)
        .on("keyup", function(x){
          var t = this;
        
          typewatch(function() {
            value.value = t.value;
            //value.fn = self.buildOp(value)
            self.on("update")(self.data());
          },1000);
        });
    
    }
  , filterFooter: function(wrap) {
      var footer = d3_updateable$2(wrap,".filter-footer","div",false,function(x) { return 1})
        .classed("filter-footer",true)
        .style("margin-bottom","15px")
        .style("margin-top","10px");


      var self = this;
      
      d3_updateable$2(footer,".add","a",false,function(x) { return 1})
        .classed("add",true)
        .style("font-weight","bold")
        .html("&#65291;")
        .style("width","24px")
        .style("height","24px")
        .style("line-height","24px")
        .style("text-align","center")
        .style("border-radius","15px")
        .style("border","1.5px solid #428BCC")
        .style("cursor","pointer")
        .style("display","inline-block")

        .on("click",function(x) {
        
          var d = self._data;
          if (d.length == 0 || Object.keys(d.slice(-1)).length > 0) d.push({});
          self.draw();
            
        });
    }
  , typewatch: typewatch
};

function accessor$1$1(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val;
  return this
}

function FilterData(data) {
  this._data = data;
  this._l = "or";
}

function filter_data(data) {
  return new FilterData(data)
}

FilterData.prototype = {
    data: function(val) { return accessor$1$1.bind(this)("data",val) }
  , logic: function(l) {
      if (l == undefined) return this._l
      this._l = (l == "and") ? "and" : "or";
      return this
    }
  , op: function(op, fn) {
      if (fn === undefined) return this._ops[op] || this._ops["equals"];
      this._ops[op] = fn;
      return this

    }
  , by: function(b) {
      
      var self = this
        , filter = function(x) {
            if (b.length == 0) return true
            
            var mask = b.map(function(z) {
              
              var split = z.field.split("."), field = split.slice(-1)[0]
                , obj = split.slice(0,-1).reduce(function(p,c) { return p[c] },x)
                , osplit = z.op.split("."), op = osplit[0];
              
              return self.op(op)(field,z.value)(obj)
            }).filter(function(x){ return x });
            
            if (self._l == "and") return mask.length == b.length
            return mask.length > 0
          };
      
      return this._data.filter(filter)

    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1];
      this._on[action$$1] = fn;
      return this
    }
  , _ops: {
        "equals" : function(field,value) {
          return function(x) {
            return String(x[field]) == String(value)
          }
        }
//      , "contains" : function(field,value) {
//          return function(x) {
//            return String(x[field]).indexOf(String(value)) > -1
//          }
//        }
      , "starts with" : function(field,value) {
          return function(x) {
            return String(x[field]).indexOf(String(value)) == 0
          }
        }
      , "ends with" : function(field,value) {
          return function(x) {
            return (String(x[field]).length - String(value).length) == String(x[field]).indexOf(String(value))
          }
        }
      , "does not equal" : function(field,value) {
          return function(x) {
            return String(x[field]) != String(value)
          }
        }
      , "is set" : function(field,value) {
          return function(x) {
            return (x[field] != undefined) && (x[field] != "")
          }
        }
      , "is not set" : function(field,value) {
          return function(x) {
            return x[field] == undefined
          }
        }
      , "between" : function(field,value) {
          return function(x) {
            return parseInt(x[field]) >= value[0] && parseInt(x[field]) <= value[1]
          }
        }
      , "is in": function(field,value) {
          return function(x) {
            var values = value.split(",");
            return values.reduce(function(p,value) { return p + String(x[field]).indexOf(String(value)) > -1 }, 0) > 0
          } 
        }
      , "is not in": function(field,value) {
          return function(x) {
            var values = value.split(",");
            return values.reduce(function(p,value) { return p + String(x[field]).indexOf(String(value)) > -1 }, 0) == 0
          } 
        }
      , "does not contain": function(field,value) {
          return function(x) {
            var values = value.toLowerCase().split(",");
            return values.reduce(function(p,value) { return p + String(x[field]).indexOf(String(value).toLowerCase()) > -1 }, 0) == 0
          } 
        }
      , "contains": function(field,value) {
          return function(x) {
            var values = value.toLowerCase().split(",");
            return values.reduce(function(p,value) { return p + String(x[field]).indexOf(String(value).toLowerCase()) > -1 }, 0) > 0
          } 
        }
    }
};

function noop$3() {}
function FilterView(target) {
  this._on = {
    select: noop$3
  };

  this.target = target;
  this._filter_options = {
      "Category": "parent_category_name"
    , "Title": "url"
    , "Time": "hour"
  };
}

function filter_view(target) {
  return new FilterView(target)
}

FilterView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , logic: function(val) {
      return accessor.bind(this)("logic",val) 
    }
  , categories: function(val) {
      return accessor.bind(this)("categories",val) 
    }
  , filters: function(val) {
      return accessor.bind(this)("filters",val) 
    }
  , draw: function() {
      
      var wrapper = d3_updateable(this.target,".filter-wrap","div",false,function(){ return 1})
        .classed("filter-wrap",true);

      header(wrapper)
        .text("Filter")
        .draw();

      var subtitle = d3_updateable(wrapper, ".subtitle-filter","div")
        .classed("subtitle-filter",true)
        .style("padding-left","10px")
        .style("text-transform"," uppercase")
        .style("font-weight"," bold")
        .style("line-height"," 33px")
        .style("background"," #e3ebf0")
        .style("margin-bottom","10px");
    
      d3_updateable(subtitle,"span.first","span")
        .text("Users matching " )
        .classed("first",true);
    
      var filter_type  = d3_updateable(subtitle,"span.middle","span")
        .classed("middle",true);
    
      select(filter_type)
        .options(this.logic())
        .on("select", function(x) {
          this.logic().map(function(y) { 
            y.selected = (y.key == x.key);
          });
          this.on("logic.change")(this.logic());
        }.bind(this))
        .draw();
      
      d3_updateable(subtitle,"span.last","span")
        .text(" of the following:")
        .classed("last",true);


      // -------- CATEGORIES --------- //

      var categories = this.categories();
      var filter_change = this.on("filter.change").bind(this);

      function selectizeInput(filter$$1,value) {
        var self = this;
        
        var select$$1 = d3_updateable(filter$$1,"input","input")
          .style("width","200px")
          .property("value",value.value);

        filter$$1.selectAll(".selectize-control")
          .each(function(x) {
            var destroy = d3.select(this).on("destroy");
            if (destroy) destroy();
          });


        var s = $(select$$1.node()).selectize({
          persist: false,
          create: function(x){
            value.value = (value.value ? value.value + "," : "") + x;
            self.on("update")(self.data());
            return {
              value: x, text: x
            }
          },
          onDelete: function(x){
            value.value = value.value.split(",").filter(function(z) { return z != x[0]}).join(",");
            self.on("update")(self.data());
            return {
              value: x, text: x
            }
          }
        });

        filter$$1.selectAll(".selectize-control")
          .on("destroy",function() {
            s[0].selectize.destroy();
          });

      }

      function selectizeSelect(filter$$1,value) {
        var self = this;

        filter$$1.selectAll(".selectize-control").remove();

        filter$$1.selectAll(".selectize-control")
          .each(function(x) {
            var destroy = d3.select(this).on("destroy");
            if (destroy) destroy();
          });



    
        var select$$1 = d3_updateable(filter$$1,"select.value","select")
          .classed("value",true)
          .style("margin-bottom","10px")
          .style("padding-left","10px")
          .style("min-width","200px")
          .style("max-width","500px")
          .attr("multiple",true)
          .on("change", function(x){
            value.value = this.value;
            self.on("update")(self.data());
          });
    
        d3_splat(select$$1,"option","option",categories,function(x) { return x.key })
          .attr("selected",function(x) { return value.value && value.value.indexOf(x.key) > -1 ? "selected" : undefined })
          .text(function(x) { return x.key });

        var s = $(select$$1.node()).selectize({
          persist: false,
          onChange: function(x) {
            value.value = x.join(",");
            self.on("update")(self.data());
          }
        });

        filter$$1.selectAll(".selectize-control")
          .on("destroy",function() {
            s[0].selectize.destroy();
          });



    
      }
    
      this._logic_filter = filter$2(wrapper)
        .fields(Object.keys(this._filter_options))
        .ops([
            [{"key": "is in.category"},{"key": "is not in.category"}]
          , [{"key": "contains.selectize"}, {"key":"does not contain.selectize"}]
          , [{"key": "equals"}, {"key":"between","input":2}]
        ])
        .data(this.filters())
        .render_op("contains.selectize",selectizeInput)
        .render_op("does not contain.selectize",selectizeInput)
        .render_op("is in.category",selectizeSelect)
        .render_op("is not in.category",selectizeSelect)
        .render_op("between",function(filter$$1,value) {
          var self = this;
    
          value.value = typeof(value.value) == "object" ? value.value : [0,24];
    
          d3_updateable(filter$$1,"input.value.low","input")
            .classed("value low",true)
            .style("margin-bottom","10px")
            .style("padding-left","10px")
            .style("width","90px")
            .attr("value", value.value[0])
            .on("keyup", function(x){
              var t$$1 = this;
            
              self.typewatch(function() {
                value.value[0] = t$$1.value;
                self.on("update")(self.data());
              },1000);
            });
    
          d3_updateable(filter$$1,"span.value-and","span")
            .classed("value-and",true)
            .text(" and ");
    
          d3_updateable(filter$$1,"input.value.high","input")
            .classed("value high",true)
            .style("margin-bottom","10px")
            .style("padding-left","10px")
            .style("width","90px")
            .attr("value", value.value[1])
            .on("keyup", function(x){
              var t$$1 = this;
            
              self.typewatch(function() {
                value.value[1] = t$$1.value;
                self.on("update")(self.data());
              },1000);
            });
        })
        .on("update",function(filters){
          filter_change(filters);
        })
        .draw();

      //d3_updateable(this.target,".filter-wrap-spacer","div")
      //  .classed("filter-wrap-spacer",true)
      //  .style("height",wrapper.style("height"))

      //wrapper
      //  .style("width",this.target.style("width"))
      //  .style("position","fixed")
      //  .style("z-index","300")
      //  .style("background","#f0f4f7")

      return this
    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$3;
      this._on[action$$1] = fn;
      return this
    }
};

function noop$7() {}
function identity$4(x) { return x }
function key$4(x) { return x.key }

function ButtonRadio(target) {
  this._on = {};
  this.target = target;
}

function button_radio(target) {
  return new ButtonRadio(target)
}

ButtonRadio.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$7;
      this._on[action$$1] = fn;
      return this
    }
  , draw: function () {
  
    var CSS_STRING = String(function() {/*
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
  
    d3_updateable(d3.select("head"),"style#show-css","style")
      .attr("id","header-css")
      .text(CSS_STRING.replace("function () {/*","").replace("*/}",""));
  
    var options = d3_updateable(this.target,".button-radio-row","div")
      .classed("button-radio-row",true)
      .style("margin-bottom","35px");
  
  
    var button_row = d3_updateable(options,".options-view","div",this.data())
      .classed("options-view",true);

    var bound = this.on("click").bind(this);
  
    d3_splat(button_row,".show-button","a",identity$4, key$4)
      .classed("show-button",true)
      .classed("selected", function(x) { return x.selected })
      .text(key$4)
      .on("click", function(x) { bound(x); });

    return this
  
    }
  
};

function noop$6() {}
function OptionView(target) {
  this._on = {
    select: noop$6
  };
  this.target = target;
}



function option_view(target) {
  return new OptionView(target)
}

OptionView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , options: function(val) {
      return accessor.bind(this)("options",val) 
    }
  , draw: function() {


      var wrap = d3_updateable(this.target,".option-wrap","div")
        .classed("option-wrap",true);

      //header(wrap)
      //  .text("Choose View")
      //  .draw()

      button_radio(wrap)
        .on("click", this.on("select") )
        .data(this.data())
        .draw();

      return this
    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$6;
      this._on[action$$1] = fn;
      return this
    }
};

function prepData$1(dd) {
  var p = [];
  d3.range(0,24).map(function(t) {
    ["0","20","40"].map(function(m) {
      if (t < 10) p.push("0" + String(t)+String(m));
      else p.push(String(t)+String(m));

    });
  });
  var rolled = d3.nest()
    .key(function(k) { return k.hour + k.minute })
    .rollup(function(v) {
      return v.reduce(function(p,c) {
        p.articles[c.url] = true;
        p.views += c.count;
        p.sessions += c.uniques;
        return p
      },{ articles: {}, views: 0, sessions: 0})
    })
    .entries(dd)
    .map(function(x) {
      Object.keys(x.values).map(function(y) {
        x[y] = x.values[y];
      });
      x.article_count = Object.keys(x.articles).length;
      x.hour = x.key.slice(0,2);
      x.minute = x.key.slice(2);
      x.value = x.article_count;
      x.key = p.indexOf(x.key);
      //delete x['articles']
      return x
    });
  return rolled
}
function buildSummaryData(data) {
      var reduced = data.reduce(function(p,c) {
          p.domains[c.domain] = true;
          p.articles[c.url] = true;
          p.views += c.count;
          p.sessions += c.uniques;

          return p
        },{
            domains: {}
          , articles: {}
          , sessions: 0
          , views: 0
        });

      reduced.domains = Object.keys(reduced.domains).length;
      reduced.articles = Object.keys(reduced.articles).length;

      return reduced

}

function buildSummaryAggregation(samp,pop) {
      var data_summary = {};
      Object.keys(samp).map(function(k) {
        data_summary[k] = {
            sample: samp[k]
          , population: pop[k]
        };
      });

      return data_summary
  
}
function buildCategories(data) {
  var values = data.category
        .map(function(x){ return {"key": x.parent_category_name, "value": x.count } })
        .sort(function(p,c) {return c.value - p.value }).slice(0,15)
    , total = values.reduce(function(p, x) {return p + x.value }, 0);

  return {
      key: "Categories"
    , values: values.map(function(x) { x.percent = x.value/total; return x})
  }
}

function buildTimes(data) {

  var hour = data.current_hour;

  var categories = data.display_categories.values
    .filter(function(a) { return a.selected })
    .map(function(a) { return a.key });

  if (categories.length > 0) {
    hour = data.category_hour.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1});
    hour = d3.nest()
      .key(function(x) { return x.hour })
      .key(function(x) { return x.minute })
      .rollup(function(v) {
        return v.reduce(function(p,c) { 
          p.uniques = (p.uniques || 0) + c.uniques; 
          p.count = (p.count || 0) + c.count;  
          return p },{})
      })
      .entries(hour)
      .map(function(x) { 
        console.log(x.values); 
        return x.values.reduce(function(p,k){ 
          p['minute'] = parseInt(k.key); 
          p['count'] = k.values.count; 
          p['uniques'] = k.values.uniques; 
          return p 
      }, {"hour":x.key}) } );
  }

  var values = hour
    .map(function(x) { return {"key": parseFloat(x.hour) + 1 + x.minute/60, "value": x.count } });

  return {
      key: "Browsing behavior by time"
    , values: values
  }
}

function buildTopics(data) {

  var categories = data.display_categories.values
    .filter(function(a) { return a.selected })
    .map(function(a) { return a.key });


  var idf = d3.nest()
    .key(function(x) {return x.topic})
    .rollup(function(x) {return x[0].idf })
    .map(data.full_urls.filter(function(x){ return x.parent_category_name != "Internet & Telecom"}) );

  var getIDF = function(x) {
    return (idf[x] == "NA") || (idf[x] > 8686) ? 0 : idf[x]
  };

  var values = data.full_urls
    .filter(function(x) { return x.topic ? x.topic.toLowerCase() != "no topic" : true })
    .map(function(x) { 
      return {
          "key":x.topic
        , "value":x.count
        , "uniques": x.uniques 
        , "url": x.url
      } 
    });



  values = d3.nest()
    .key(function(x){ return x.key})
    .rollup(function(x) { 
       return {
           "key": x[0].key
         , "value": x.reduce(function(p,c) { return p + c.value},0)
         , "percent_unique": x.reduce(function(p,c) { return p + c.uniques/c.value},0)/x.length
         , "urls": x.reduce(function(p,c) { p.indexOf(c.url) == -1 ? p.push(c.url) : p; return p },[])

       } 
    })
    .entries(values).map(function(x){ return x.values });

  if (categories.length > 0)
    values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 });

  values.map(function(x) {
    x.tf_idf = getIDF(x.key) * (x.value*x.percent_unique) * (x.value*x.percent_unique); 
    x.count = x.value;
    x.importance = Math.log(x.tf_idf);
  });
  values = values.sort(function(p,c) { return c.tf_idf - p.tf_idf });


  var total = d3.sum(values,function(x) { return x.count*x.percent_unique});

  values.map(function(x) { 
    x.pop_percent = 1.02/getIDF(x.key)*100;
    x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent;

    x.sample_percent = x.count*x.percent_unique/total*100;
  });

  var norm = d3.scale.linear()
    .range([0, d3.max(values,function(x){ return x.pop_percent})])
    .domain([0, d3.max(values,function(x){return x.sample_percent})])
    .nice();

  values.map(function(x) {
    x.sample_percent_norm = norm(x.sample_percent);

    x.ratio = x.sample_percent/x.pop_percent;
    //x.percent_norm = x.percent
  });



  
  return {
      key: "Top Topics"
    , values: values.slice(0,300)
  }
}

function buildDomains(data) {

  var categories = data.display_categories.values
    .filter(function(a) { return a.selected })
    .map(function(a) { return a.key });

  var idf = d3.nest()
    .key(function(x) {return x.domain })
    .rollup(function(x) {return x[0].idf })
    .map(data.full_urls.filter(function(x){ return x.parent_category_name != "Internet & Telecom"}) );

  var getIDF = function(x) {
    return (idf[x] == "NA") || (idf[x] > 8686) ? 0 : idf[x]
  };

  var values = data.full_urls
    .map(function(x) { 
      return {
          "key":x.domain
        , "value":x.count
        , "parent_category_name": x.parent_category_name
        , "uniques": x.uniques 
        , "url": x.url
      } 
    });



  values = d3.nest()
    .key(function(x){ return x.key})
    .rollup(function(x) { 
       return {
           "parent_category_name": x[0].parent_category_name
         , "key": x[0].key
         , "value": x.reduce(function(p,c) { return p + c.value},0)
         , "percent_unique": x.reduce(function(p,c) { return p + c.uniques/c.value},0)/x.length
         , "urls": x.reduce(function(p,c) { p.indexOf(c.url) == -1 ? p.push(c.url) : p; return p },[])

       } 
    })
    .entries(values).map(function(x){ return x.values });

  if (categories.length > 0)
    values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 });

  values.map(function(x) {
    x.tf_idf = getIDF(x.key) * (x.value*x.percent_unique) * (x.value*x.percent_unique); 
    x.count = x.value;
    x.importance = Math.log(x.tf_idf);
  });
  values = values.sort(function(p,c) { return c.tf_idf - p.tf_idf });


  var total = d3.sum(values,function(x) { return x.count*x.percent_unique});

  values.map(function(x) { 
    x.pop_percent = 1.02/getIDF(x.key)*100;
    x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent;

    x.sample_percent = x.count*x.percent_unique/total*100;
  });

  var norm = d3.scale.linear()
    .range([0, d3.max(values,function(x){ return x.pop_percent})])
    .domain([0, d3.max(values,function(x){return x.sample_percent})])
    .nice();

  var tt = d3.sum(values,function(x) { return x.pop_percent });

  values.map(function(x) {
    x.sample_percent_norm = norm(x.sample_percent);
    x.real_pop_percent = x.pop_percent/tt*100;
    x.ratio = x.sample_percent/x.real_pop_percent;

  });



  
  return {
      key: "Top Domains"
    , values: values.slice(0,500)
  }
}

function buildUrls(data) {

  var categories = data.display_categories.values
    .filter(function(a) { return a.selected })
    .map(function(a) { return a.key });

  var values = data.full_urls
    .map(function(x) { return {"key":x.url,"value":x.count, "parent_category_name": x.parent_category_name} });

  if (categories.length > 0)
    values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 });

  values = values.filter(function(x) {
    try {
      return x.key
        .replace("http://","")
        .replace("https://","")
        .replace("www.","").split(".").slice(1).join(".").split("/")[1].length > 5
    } catch(e) {
      return false
    }
  }).sort(function(p,c) { return c.value - p.value });


  
  return {
      key: "Top Articles"
    , values: values.slice(0,100)
  }
}

function buildOnsiteSummary(data) {
  var yesterday = data.timeseries_data[0];
  var values = [
        {
            "key": "Page Views"
          , "value": yesterday.views
        }
      , {
            "key": "Unique Visitors"
          , "value": yesterday.uniques

        }
    ];
  return {"key":"On-site Activity","values":values}
}

function buildOffsiteSummary(data) {
  var values = [  
        {
            "key": "Off-site Views"
          , "value": data.full_urls.reduce(function(p,c) {return p + c.uniques},0)
        }
      , {
            "key": "Unique pages"
          , "value": Object.keys(data.full_urls.reduce(function(p,c) {p[c.url] = 0; return p },{})).length
        }
    ];
  return {"key":"Off-site Activity","values":values}
}

function buildActions(data) {
  
  return {"key":"Segments","values": data.actions.map(function(x){ return {"key":x.action_name, "value":0, "selected": data.action_name == x.action_name } })}
}

function prepData$$1() {
  return prepData$1.apply(this, arguments)
}

var EXAMPLE_DATA = {
    "key": "Browsing behavior by time"
  , "values": [
      {  
          "key": 1
        , "value": 12344
      }
    , {
          "key": 2
        , "value": 12344
      }
    , {
          "key": 2.25
        , "value": 12344
      }
    , {
          "key": 2.5
        , "value": 12344
      }
    , {
          "key": 3
        , "value": 1234
      }

    , {
          "key": 4
        , "value": 12344
      }


  ] 
};

function TimeSeries(target) {
  this._target = target;
  this._data = EXAMPLE_DATA;
  this._on = {};
}

function time_series(target) {
  return new TimeSeries(target)
}

TimeSeries.prototype = {

    data: function(val) { return accessor.bind(this)("data",val) }
  , on: function(action$$1,fn) {
      if (fn === undefined) return this._on[action$$1] || function() {};
      this._on[action$$1] = fn;
      return this
    }
  , title: function(val) { return accessor.bind(this)("title",val) }
  , height: function(val) { return accessor.bind(this)("height",val) }

  , draw: function() {
      var wrap = this._target;
      var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
        .classed("vendor-domains-bar-desc",true)
        .style("display","inherit")
        .style("height","100%")
        .style("width","100%")
        .datum(this._data);

      var wrapper = d3_updateable(desc,".w","div")
        .classed("w",true)
        .style("height","100%")
        .style("width","100%");


      var self = this;
  
      

      wrapper.each(function(row){

        var data = row.values.sort(function(p,c) { return c.key - p.key})
          , count = data.length;


        var _sizes = autoSize(wrapper,function(d){return d -10}, function(d){return self._height || 60 }),
          gridSize = Math.floor(_sizes.width / 24 / 3);

        var valueAccessor = function(x) { return x.value }
          , valueAccessor2 = function(x) { return x.value2 }
          , keyAccessor = function(x) { return x.key };

        var steps = Array.apply(null, Array(count)).map(function (_, i) {return i+1;});

        var _colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"];
        var colors = _colors;

        var x = d3.scale.ordinal().range(steps)
          , y = d3.scale.linear().range([_sizes.height, 0 ]);


        var colorScale = d3.scale.quantile()
          .domain([0, d3.max(data, function (d) { return d.frequency; })])
          .range(colors);

        var svg_wrap = d3_updateable(wrapper,"svg","svg")
          .attr("width", _sizes.width + _sizes.margin.left + _sizes.margin.right)
          .attr("height", _sizes.height + _sizes.margin.top + _sizes.margin.bottom);

        var svg = d3_splat(svg_wrap,"g","g",function(x) {return [x.values]},function(_,i) {return i})
          .attr("transform", "translate(" + _sizes.margin.left + "," + 0 + ")");

        x.domain([0,72]);
        y.domain([0, d3.max(data, function(d) { return Math.sqrt(valueAccessor(d)); })]);

        var buildBars = function(data,keyAccessor,valueAccessor,y,c) {

          var bars = d3_splat(svg, ".timing-bar" + c, "rect", data, keyAccessor)
            .attr("class", "timing-bar" + c);
           
          bars
            .attr("x", function(d) { return ((keyAccessor(d) - 1) * gridSize ); })
            .attr("width", gridSize - 1)
            .attr("y", function(d) { 
              return y(Math.sqrt( valueAccessor(d) )); 
            })
            .attr("fill","#aaa")
            .attr("fill",function(x) { return colorScale( keyAccessor(x) + c ) || "grey" } )
            //.attr("stroke","white")
            //.attr("stroke-width","1px")
            .attr("height", function(d) { return _sizes.height - y(Math.sqrt( valueAccessor(d) )); })
            .style("opacity","1")
            .on("mouseover",function(x){ 
              self.on("hover").bind(this)(x);
            });

        };
        

        if (data && data.length && data[0].value2) {
          var  y2 = d3.scale.linear().range([_sizes.height, 0 ]);
          y2.domain([0, d3.max(data, function(d) { return Math.sqrt(valueAccessor2(d)); })]);
          buildBars(data,keyAccessor,valueAccessor2,y2,"-2");
        }


        buildBars(data,keyAccessor,valueAccessor,y,"");
      
    
      var z = d3.time.scale()
        .range([0, gridSize*24*3])
        .nice(d3.time.hour,24);
        
    
      var xAxis = d3.svg.axis()
        .scale(z)
        .ticks(3)
        .tickFormat(d3.time.format("%I %p"));
    
      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + _sizes.height + ")")
          .call(xAxis);



        
      });


    }
};

function Pie(target) {
  this.target = target;
}

Pie.prototype = {
    radius: function(val) {
      return accessor.bind(this)("radius",val)
    }
  , data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop;
      this._on[action$$1] = fn;
      return this
    }
  , draw: function() {
  
    var d = d3.entries({
        sample: this._data.sample
      , population: this._data.population - this._data.sample
    });
    
    var color = d3.scale.ordinal()
        .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
    
    var arc = d3.svg.arc()
        .outerRadius(this._radius - 10)
        .innerRadius(0);
    
    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) { return d.value; });
    
    var svg = d3_updateable(this.target,"svg","svg",false,function(x){return 1})
        .attr("width", 50)
        .attr("height", 52);
  
    svg = d3_updateable(svg,"g","g")
        .attr("transform", "translate(" + 25 + "," + 26 + ")");
    
    var g = d3_splat(svg,".arc","g",pie(d),function(x){ return x.data.key })
      .classed("arc",true);
  
    d3_updateable(g,"path","path")
      .attr("d", arc)
      .style("fill", function(d) { return color(d.data.key) });
  }
};

function pie(target) {
  return new Pie(target)
}

function diff_bar(target) {
  return new DiffBar(target)
}

// data format: [{key, normalized_diff}, ... ]

class DiffBar {
  constructor(target) {
    this._target = target;

    this._key_accessor = "key";
    this._value_accessor = "value";
    this._bar_height = 20;
    this._bar_width = 150;
  } 

  key_accessor(val) { return accessor.bind(this)("key_accessor",val) }
  value_accessor(val) { return accessor.bind(this)("value_accessor",val) }
  bar_height(val) { return accessor.bind(this)("bar_height",val) }
  bar_width(val) { return accessor.bind(this)("bar_width",val) }



  data(val) { return accessor.bind(this)("data",val) } 
  title(val) { return accessor.bind(this)("title",val) } 


  draw() {

    var w = d3_updateable(this._target,".diff-wrap","div",false,function() {return 1})
      .classed("diff-wrap",true);

    d3_updateable(w,"h3","h3").text(this._title);

    var wrap = d3_updateable(w,".svg-wrap","div",this._data,function(x) { return 1 })
      .classed("svg-wrap",true);

    var k = this.key_accessor()
      , v = this.value_accessor()
      , height = this.bar_height()
      , bar_width = this.bar_width();

    var keys = this._data.map(function(x) { return x[k] })
      , max = d3.max(this._data,function(x) { return x[v] })
      , sampmax = d3.max(this._data,function(x) { return -x[v] });

    var xsampscale = d3.scale.linear()
          .domain([0,sampmax])
          .range([0,bar_width])
      , xscale = d3.scale.linear()
          .domain([0,max])
          .range([0,bar_width])
      , yscale = d3.scale.linear()
          .domain([0,keys.length])
          .range([0,keys.length*height]);

    var canvas = d3_updateable(wrap,"svg","svg",false,function() { return 1})
      .attr({"width":bar_width*3, "height": keys.length*height + 10});

    var xAxis = d3.svg.axis();
    xAxis
      .orient('bottom')
      .scale(xscale);

    var yAxis = d3.svg.axis();
    yAxis
      .orient('left')
      .scale(yscale)
      .tickSize(2)
      .tickFormat(function(d,i){ return keys[i]; })
      .tickValues(d3.range(keys.length));

    var y_xis = d3_updateable(canvas,'g.y','g')
      .attr("class","y axis")
      .attr("transform", "translate(" + (bar_width + bar_width/2) + ",15)")
      .attr('id','yaxis')
      .call(yAxis);

    y_xis.selectAll("text")
      .attr("style","text-anchor: middle;");

    
    var chart = d3_updateable(canvas,'g.chart','g')
      .attr("class","chart")
      .attr("transform", "translate(" + (bar_width*2) + ",0)")
      .attr('id','bars');
    
    var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x) { return x.key })
      .attr("class","pop-bar")
      .attr('height',height-4)
      .attr({'x':0,'y':function(d,i){ return yscale(i) + 8.5; }})
      .style('fill','#388e3c')
      .attr("width",function(x) { return xscale(x[v]) });

    var chart2 = d3_updateable(canvas,'g.chart2','g')
      .attr("class","chart2")
      .attr("transform", "translate(0,0)")
      .attr('id','bars');


    var sampbars = d3_splat(chart2,".samp-bar","rect",function(x) { return x}, function(x) { return x.key })
      .attr("class","samp-bar")
      .attr('height',height-4)
      .attr({'x':function(x) { return bar_width - xsampscale(-x[v])},'y':function(d,i){ return yscale(i) + 8.5; }})
      .style('fill','#d32f2f')
      .attr("width",function(x) { return xsampscale(-x[v]) });

    y_xis.exit().remove();

    chart.exit().remove();
    chart2.exit().remove();

    bars.exit().remove();
    sampbars.exit().remove();


    


    return this
  }
}

function comp_bar(target) {
  return new CompBar(target)
}

// data format: [{key, normalized_diff}, ... ]

class CompBar {
  constructor(target) {
    this._target = target;

    this._key_accessor = "key";
    this._pop_value_accessor = "value";
    this._samp_value_accessor = "value";

    this._bar_height = 20;
    this._bar_width = 300;
  } 

  key_accessor(val) { return accessor.bind(this)("key_accessor",val) }
  pop_value_accessor(val) { return accessor.bind(this)("pop_value_accessor",val) }
  samp_value_accessor(val) { return accessor.bind(this)("samp_value_accessor",val) }

  bar_height(val) { return accessor.bind(this)("bar_height",val) }
  bar_width(val) { return accessor.bind(this)("bar_width",val) }



  data(val) { return accessor.bind(this)("data",val) } 
  title(val) { return accessor.bind(this)("title",val) } 


  draw() {

    var w = d3_updateable(this._target,".comp-wrap","div",false,function() {return 1})
      .classed("comp-wrap",true);

    d3_updateable(w,"h3","h3").text(this._title);

    var wrap = d3_updateable(w,".svg-wrap","div",this._data,function(x) { return 1 })
      .classed("svg-wrap",true);

    var k = this.key_accessor()
      , p = this.pop_value_accessor()
      , s = this.samp_value_accessor()
      , height = this.bar_height()
      , bar_width = this.bar_width();

    var keys = this._data.map(function(x) { return x[k] })
      , max = d3.max(this._data,function(x) { return x[p] })
      , sampmax = d3.max(this._data,function(x) { return x[s] });

    var xsampscale = d3.scale.linear()
          .domain([0,sampmax])
          .range([0,bar_width])
      , xscale = d3.scale.linear()
          .domain([0,max])
          .range([0,bar_width])
      , yscale = d3.scale.linear()
          .domain([0,keys.length])
          .range([0,keys.length*height]);

    var canvas = d3_updateable(wrap,"svg","svg",false,function() { return 1})
      .attr({"width":bar_width+bar_width/2, "height": keys.length*height + 10});

    var xAxis = d3.svg.axis();
    xAxis
      .orient('bottom')
      .scale(xscale);

    var yAxis = d3.svg.axis();
    yAxis
      .orient('left')
      .scale(yscale)
      .tickSize(2)
      .tickFormat(function(d,i){ return keys[i]; })
      .tickValues(d3.range(keys.length));

    var y_xis = d3_updateable(canvas,'g.y','g')
      .attr("class","y axis")
      .attr("transform", "translate(" + (bar_width/2) + ",15)")
      .attr('id','yaxis')
      .call(yAxis);

    y_xis.selectAll("text");

    
    var chart = d3_updateable(canvas,'g.chart','g')
      .attr("class","chart")
      .attr("transform", "translate(" + (bar_width/2) + ",0)")
      .attr('id','bars');
    
    var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x) { return x.key })
      .attr("class","pop-bar")
      .attr('height',height-2)
      .attr({'x':0,'y':function(d,i){ return yscale(i) + 7.5; }})
      .style('fill','gray')
      .attr("width",function(x) { return xscale(x[p]) });


    var sampbars = d3_splat(chart,".samp-bar","rect",function(x) { return x}, function(x) { return x.key })
      .attr("class","samp-bar")
      .attr('height',height-10)
      .attr({'x':0,'y':function(d,i){ return yscale(i) + 11.5; }})
      .style('fill','#081d58')
      .attr("width",function(x) { return xsampscale(x[s] || 0) });

    y_xis.exit().remove();

    chart.exit().remove();

    bars.exit().remove();
    sampbars.exit().remove();

    return this
  }
}

function comp_bubble(target) {
  return new CompBubble(target)
}

// data format: [{key, normalized_diff}, ... ]

class CompBubble {
  constructor(target) {
    this._target = target;

    this._key_accessor = "key";

    this._height = 20;
    this._space = 14;
    this._middle = 180;
    this._legend_width = 80;

    this._buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 });
    this._rows = [];


  } 

  key_accessor(val) { return accessor.bind(this)("key_accessor",val) }
  value_accessor(val) { return accessor.bind(this)("value_accessor",val) }

  height(val) { return accessor.bind(this)("height",val) }
  space(val) { return accessor.bind(this)("space",val) }
  middle(val) { return accessor.bind(this)("middle",val) }
  buckets(val) { return accessor.bind(this)("buckets",val) }

  rows(val) { return accessor.bind(this)("rows",val) }
  after(val) { return accessor.bind(this)("after",val) }




  data(val) { return accessor.bind(this)("data",val) } 
  title(val) { return accessor.bind(this)("title",val) } 

  buildScales() {

    var rows = this.rows()
      , buckets = this.buckets()
      , height = this.height(), space = this.space();

    this._yscale = d3.scale.linear()
      .domain([0,rows.length])
      .range([0,rows.length*height]);

    this._xscale = d3.scale.ordinal()
      .domain(buckets)
      .range(d3.range(0,buckets.length*(height+space),(height+space)));

    this._xscalereverse = d3.scale.ordinal()
      .domain(buckets.reverse())
      .range(d3.range(0,buckets.length*(height+space),(height+space)));

    this._rscale = d3.scale.pow()
      .exponent(0.5)
      .domain([0,1])
      .range([.35,1]);
    
    this._oscale = d3.scale.quantize()
      .domain([-1,1])
      .range(['#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#08519c','#08306b']);
    
  }

  drawLegend() {
    var canvas = this._canvas
      , buckets = this.buckets()
      , height = this.height(), space = this.space(), middle = this.middle(), legendtw = this._legend_width
      , rscale = this._rscale, oscale = this._oscale;

    var legend = d3_updateable(canvas,'g.legend','g')
      .attr("class","legend")
      .attr("transform","translate(" + (buckets.length*(height+space)*2+middle-310) + ",-130)");

    var size = d3_updateable(legend,'g.size','g')
      .attr("class","size")
      .attr("transform","translate(" + (legendtw+10) + ",0)");

    d3_updateable(size,"text.more","text")
      .attr("class","more axis")
      .attr("x",-legendtw)
      .html("more activity")
      .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold") 
      .attr("dominant-baseline", "central");

    d3_updateable(size,"text.more-arrow","text")
      .attr("class","more-arrow axis")
      .attr("x",-legendtw-10)
      .html("&#9664;")
      .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold") 
      .style("font-size",".7em")
      .attr("dominant-baseline", "central");




    d3_updateable(size,"text.less","text")
      .attr("class","less axis")
      .attr("x",(height+4)*5+legendtw)
      .style("text-anchor","end")
      .html("less activity")
      .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")

      .attr("dominant-baseline", "central");

    d3_updateable(size,"text.less-arrow","text")
      .attr("class","less-arrow axis")
      .attr("x",(height+4)*5+legendtw+10)
      .html("&#9654;")
      .style("text-anchor","end")
      .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
      .style("font-size",".7em") 
      .attr("dominant-baseline", "central");


    d3_splat(size,"circle","circle",[1,.6,.3,.1,0])
      .attr("r",function(x) { return (height-2)/2*rscale(x) })
      .attr('cx', function(d,i) { return (height+4)*i+height/2})
      .attr('stroke', 'grey')
      .attr('fill', 'none');


    


    var size = d3_updateable(legend,'g.importance','g')
      .attr("class","importance")
      .attr("transform","translate("+ (legendtw+10) +",25)");

    d3_updateable(size,"text.more","text")
      .attr("class","more axis")
      .attr("x",-legendtw)
      .html("more important")
      .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
      .attr("dominant-baseline", "central");

    d3_updateable(size,"text.more-arrow","text")
      .attr("class","more-arrow axis")
      .attr("x",-legendtw-10)
      .html("&#9664;")
      .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
      .style("font-size",".7em") 
      .attr("dominant-baseline", "central");



    d3_updateable(size,"text.less","text")
      .attr("class","less axis")
      .attr("x",(height+4)*5+legendtw)
      .style("text-anchor","end")
      .html("less important")
      .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
      .attr("dominant-baseline", "central");

    d3_updateable(size,"text.less-arrow","text")
      .attr("class","less-arrow axis")
      .attr("x",(height+4)*5+legendtw+10)
      .html("&#9654;")
      .style("text-anchor","end")
      .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
      .style("font-size",".7em")
      .attr("dominant-baseline", "central");


    d3_splat(size,"circle","circle",[1,.75,.5,.25,0])
      .attr("r",height/2-2)
      .attr("fill",function(x) { return oscale(x) })
      .attr("opacity",function(x) { return rscale(x/2 + .2) })
      .attr('cx', function(d,i) { return (height+4)*i+height/2 });
 
  }

  drawAxes() {
    var canvas = this._canvas
      , buckets = this.buckets()
      , height = this.height(), space = this.space(), middle = this.middle(), legendtw = this._legend_width
      , rscale = this._rscale, oscale = this._oscale 
      , xscale = this._xscale, yscale = this._yscale
      , xscalereverse = this._xscalereverse
      , rows = this._rows;

    var xAxis = d3.svg.axis();
    xAxis
      .orient('top')
      .scale(xscalereverse)
      .tickFormat(function(x) { 
        if (x == 3600) return "1 hour"
        if (x < 3600) return x/60 + " mins" 

        if (x == 86400) return "1 day"
        if (x > 86400) return x/86400 + " days" 

        return x/3600 + " hours"
      });

    var x_xis = d3_updateable(canvas,'g.x.before','g')
      .attr("class","x axis before")
      .attr("transform", "translate(" + (height + space)+ ",-4)")
      .attr('id','xaxis')
      .call(xAxis);

          
    x_xis.selectAll("text")
      .attr("y", -8)
      .attr("x", -8)
      .attr("dy", ".35em")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "end");

    x_xis.selectAll("line")
      .attr("style","stroke:black");

    x_xis.selectAll("path")
      .attr("style","stroke:black; display:inherit");

    d3_updateable(x_xis,"text.title","text")
      .attr("class","title")
      .attr("x",buckets.length*(height+space)/2 - height+space )
      .attr("y",-53)
      .attr("transform",undefined)
      .style("text-anchor", "middle")
      .style("text-transform", "uppercase")
      .style("font-weight", "bold")
      .text("before arriving");



    var xAxis = d3.svg.axis();
    xAxis
      .orient('top')
      .scale(xscale)
      .tickFormat(function(x) { 
        if (x == 3600) return "1 hour"
        if (x < 3600) return x/60 + " mins" 

        if (x == 86400) return "1 day"
        if (x > 86400) return x/86400 + " days" 

        return x/3600 + " hours"
      });

    var x_xis = d3_updateable(canvas,'g.x.after','g')
      .attr("class","x axis after")
      .attr("transform", "translate(" + (buckets.length*(height+space)+middle) + ",0)")
      .attr('id','xaxis')
      .call(xAxis);
    
    x_xis.selectAll("text")
      .attr("y", -8)
      .attr("x", 8)
      .attr("dy", ".35em")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "start");

    x_xis.selectAll("line")
      .attr("style","stroke:black");

    x_xis.selectAll("path")
      .attr("style","stroke:black; display:inherit");

    d3_updateable(x_xis,"text.title","text")
      .attr("class","title")
      .attr("x",buckets.length*(height+space)/2  )
      .attr("y",-53)
      .attr("transform",undefined)
      .style("text-anchor", "middle")
      .style("text-transform", "uppercase")
      .style("font-weight", "bold")
      .text("after leaving");


    var yAxis = d3.svg.axis();
    yAxis
      .orient('left')
      .scale(yscale)
      .tickSize(2)
      .tickFormat(function(d,i){ return rows[i].key; })
      .tickValues(d3.range(rows.length));


    
    var y_xis = d3_updateable(canvas,'g.y','g')
      .attr("class","y axis")
      .attr("transform", "translate(" + (buckets.length*(height+space)+0) + ",15)")
      .attr('id','yaxis');


    y_xis
      .call(yAxis);

    y_xis.selectAll("line")
      .attr("x2",18)
      .attr("x1",22)
      .style("stroke-dasharray","0")
      .remove();


    y_xis.selectAll("path")
      .attr("x2",18)
      .attr("transform","translate(18,0)"); 
      //.style("stroke","black")



      //.remove()

    
    y_xis.selectAll("text")
      .attr("style","text-anchor: middle; font-weight:bold; fill: #333")
      .attr("x",middle/2);




  }

  draw() {

    var buckets = this.buckets()
      , height = this.height(), space = this.space(), middle = this.middle(), legendtw = this._legend_width
      , rows = this.rows();

    var svg = d3_updateable(this._target,"svg","svg",false,function() { return 1})
      .style("margin-left","10px")
      .style("margin-top","-5px")
      .attr({'width':buckets.length*(height+space)*2+middle,'height':rows.length*height + 165})
      .attr("xmlns", "http://www.w3.org/2000/svg");

    this._svg = svg;

    this._canvas = d3_updateable(svg,".canvas","g")
      .attr("class","canvas")
      .attr("transform", "translate(0,140)");



    this.buildScales();
    this.drawLegend();
    this.drawAxes();

    var canvas = this._canvas
      , rscale = this._rscale, oscale = this._oscale 
      , xscale = this._xscale, yscale = this._yscale
      , xscalereverse = this._xscalereverse
      , rows = this.rows();


    var chart_before = d3_updateable(canvas,'g.chart-before','g',this.rows(),function() { return 1 })
      .attr("class","chart-before")
      .attr("transform", "translate(" + buckets.length*(height+space) + ",0)")
      .attr('id','bars');


    var rows = d3_splat(chart_before,".row","g",function(x) { return x }, function(x) { return x.key })
      .attr("class","row")
      .attr({'transform':function(d,i){ return "translate(0," + (yscale(i) + 7.5) + ")"; } })
      .attr({'label':function(d,i){ return d.key; } });

    rows.exit().remove();

    var bars = d3_splat(rows,".pop-bar","circle",function(x) { return x.values }, function(x) { return x.key })
      .attr("class","pop-bar")
      .attr('cy',(height-2)/2)
      .attr({'cx':function(d,i) { return -xscale(d.key)}})
      .attr("opacity",".8")
      .attr("r",function(x) { return (height)/2 * rscale(x.norm_time) }) 
      .style("fill",function(x) { return oscale(x.percent_diff) });

    var chart_after = d3_updateable(canvas,'g.chart-after','g',this._after,function() { return 1 })
      .attr("class","chart-after")
      .attr("transform", "translate(" + (buckets.length*(height+space)+middle) + ",0)")
      .attr('id','bars');


    var rows = d3_splat(chart_after,".row","g",function(x) { return x }, function(x) { return x.key })
      .attr("class","row")
      .attr({'transform':function(d,i){ return "translate(0," + (yscale(i) + 7.5) + ")"; } })
      .attr({'label':function(d,i){ return d.key; } });

    rows.exit().remove();

    var bars = d3_splat(rows,".pop-bar","circle",function(x) { return x.values }, function(x) { return x.key })
      .attr("class","pop-bar")
      .attr('cy',(height-2)/2)
      .attr({'cx':function(d,i) { return xscale(d.key)}})
      .attr("r",function(x) { return (height-2)/2 * rscale(x.norm_time) })
      .style("fill",function(x) { return oscale(x.percent_diff) })
      .attr("opacity",".8");


    return this
  }
}

function stream_plot(target) {
  return new StreamPlot(target)
}

function drawAxis(target,scale,text,width) {
  var xAxis = d3.svg.axis();
  xAxis
    .orient('top')
    .scale(scale)
    .tickFormat(function(x) { 
      if (x == 3600) return "1 hour"
      if (x < 3600) return x/60 + " mins" 

      if (x == 86400) return "1 day"
      if (x > 86400) return x/86400 + " days" 

      return x/3600 + " hours"
    });

  var x_xis = d3_updateable(target,'g.x.before','g')
    .attr("class","x axis before")
    .attr("transform", "translate(0,-5)")
    .attr('id','xaxis')
    .call(xAxis);

        
  x_xis.selectAll("text")
    .attr("y", -25)
    .attr("x", 15)
    .attr("dy", ".35em")
    .attr("transform", "rotate(45)")
    .style("text-anchor", "end");

  x_xis.selectAll("line")
    .attr("style","stroke:black");

  x_xis.selectAll("path")
    .attr("style","stroke:black; display:inherit");

  d3_updateable(x_xis,"text.title","text")
    .attr("class","title")
    .attr("x",width/2)
    .attr("y",-46)
    .attr("transform",undefined)
    .style("text-anchor", "middle")
    .style("text-transform", "uppercase")
    .style("font-weight", "bold")
    .text(text + " ");

  return x_xis

}


class StreamPlot {
  constructor(target) {
    this._target = target;
    this._on = {};
    this._buckets = [0,10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 });

    this._width = 370;
    this._height = 250;
    this._color = d3.scale.ordinal()
      .range(
['#999','#aaa','#bbb','#ccc','#ddd','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','rgba(33, 113, 181,.9)','rgba(8, 81, 156,.91)','#08519c','rgba(8, 48, 107,.9)','#08306b'].reverse());

  } 

  key_accessor(val) { return accessor.bind(this)("key_accessor",val) }
  value_accessor(val) { return accessor.bind(this)("value_accessor",val) }
  height(val) { return accessor.bind(this)("height",val) }
  width(val) { return accessor.bind(this)("width",val) }


  data(val) { return accessor.bind(this)("data",val) } 
  title(val) { return accessor.bind(this)("title",val) } 


  draw() {

    var data = this._data
      , order = data.order
      , buckets = this._buckets
      , before_stacked = data.before_stacked
      , after_stacked = data.after_stacked
      , height = this._height
      , width = this._width
      , target = this._target
      , color = this._color
      , self = this;

    color.domain(order);

    var y = d3.scale.linear()
      .range([height,0])
      .domain([0,d3.max(before_stacked, function(layer) { return d3.max(layer,function(d) {return d.y0 + d.y })})]);
  
    var x = d3.scale.ordinal()
      .domain(buckets)
      .range(d3.range(0,width,width/(buckets.length-1)));
  
    var xreverse = d3.scale.ordinal()
      .domain(buckets.slice().reverse())
      .range(d3.range(0,width+10,width/(buckets.length-1)));

    this._before_scale = xreverse;
    this._after_scale = x;
  
    var barea = d3.svg.area()
      .interpolate("zero")
      .x(function(d) { return xreverse(d.x); })
      .y0(function(d) { return y(d.y0); })
      .y1(function(d) { return y(d.y0 + d.y); });
  
    var aarea = d3.svg.area()
      .interpolate("linear")
      .x(function(d) { return x(d.x); })
      .y0(function(d) { return y(d.y0); })
      .y1(function(d) { return y(d.y0 + d.y); });
  
  
    var svg = d3_updateable(target,"svg","svg")
      .attr("width", width*2+180)
      .attr("height", height + 100);

    this._svg = svg;
  
    var before = d3_updateable(svg,".before-canvas","g")
      .attr("class","before-canvas")
      .attr("transform", "translate(0,60)");

    function hoverCategory(cat,time) {
      apaths.style("opacity",".5");
      bpaths.style("opacity",".5");
      apaths.filter(y => y[0].key == cat).style("opacity",undefined);
      bpaths.filter(y => y[0].key == cat).style("opacity",undefined);
      d3.select(this).style("opacity",undefined);

      d3_updateable(middle,"text","text")
        .style("text-anchor", "middle")
        .style("text-transform","uppercase")
        .style("font-weight", "bold")
        .style("font-size","10px")
        .style("color","#333")
        .style("opacity",".65")
        .text(cat);

      var mwrap = d3_updateable(middle,"g","g");

      self.on("category.hover").bind(mwrap.node())(cat,time);
    }
  
    var b = d3_updateable(before,"g","g");

    var bpaths = d3_splat(b,"path","path", before_stacked,function(x,i) { return x[0].key})
      .attr("d", barea)
      .attr("class", function(x) { return x[0].key})
      .style("fill", function(x,i) { return color(x[0].key); })
      .on("mouseover",function(x) {
        var dd = d3.event;
        var pos = parseInt(dd.offsetX/(width/buckets.length));
        
        hoverCategory.bind(this)(x[0].key,buckets.slice().reverse()[pos]);
      })
      .on("mouseout",function(x) {
        apaths.style("opacity",undefined);
        bpaths.style("opacity",undefined);
      });

    bpaths.exit().remove();

    var brect = d3_splat(b,"rect","rect",buckets.slice().reverse(),(x,i) => i)
      .attr("x",z => xreverse(z))
      .attr("width",1)
      .attr("height",height)
      .attr("y",0)
      .attr("opacity","0");



      

    var middle = d3_updateable(svg,".middle-canvas","g")
      .attr("class","middle-canvas")
      .attr("transform","translate(" + (width + 180/2) + ",60)");
  
  
  
    var after = d3_updateable(svg,".after-canvas","g")
      .attr("class","after-canvas")
      .attr("transform", "translate(" + (width + 180) + ",60)");

    var a = d3_updateable(after,"g","g");

  
    var apaths = d3_splat(a,"path","path",after_stacked,function(x,i) { return x[0].key})
      .attr("d", aarea)
      .attr("class", function(x) { return x[0].key})
      .style("fill", function(x,i) { return color(x[0].key); })
      .on("mouseover",function(x) {
        hoverCategory.bind(this)(x[0].key);
      })
      .on("mouseout",function(x) {
        apaths.style("opacity",undefined);
        bpaths.style("opacity",undefined);
      });

    apaths.exit().remove();

    var _x_xis = drawAxis(before,xreverse,"before arriving",width);

    _x_xis.selectAll("text").filter(function(y){ return y == 0 }).remove();

    var _x_xis = drawAxis(after,x,"after leaving",width);

    _x_xis.selectAll("text:not(.title)")
      .attr("transform", "rotate(-45)")
      .attr("x",20)
      .attr("y",-25);

    _x_xis.selectAll("text").filter(function(y){ return y == 0 }).remove();

    return this
  }

  on(action$$1,fn) {
    if (fn === undefined) return this._on[action$$1] || noop;
    this._on[action$$1] = fn;
    return this
  }
}

function noop$10() {}
function SummaryView(target) {
  this._on = {
    select: noop$10
  };
  this.target = target;
}

function buildStreamData(data,buckets) {

  var units_in_bucket = buckets.map(function(x,i) { return x - (x[i-1]|| 0) });

  var stackable = data.map(function(d) {
    var valuemap = d.values.reduce(function(p,c) { p[c.key] = c.values; return p },{});
    var percmap = d.values.reduce(function(p,c) { p[c.key] = c.percent; return p },{});

    var vmap = d.values.reduce(function(p,c) { p[c.key] = c.norm_cat; return p },{});


    var normalized_values = buckets.map(function(x,i) {
      if (x == 0) return {key: d.key, x: parseInt(x), y: (vmap["600"]||0), values: (valuemap["600"]||0), percent: (percmap["600"]||0)}
      return { key: d.key, x: parseInt(x), y: (vmap[x] || 0), values: (valuemap[x] || 0), percent: (percmap[x] || 0) }
    });


    return normalized_values
    //return e2.concat(normalized_values)//.concat(extra)
  });


  stackable = stackable.sort((p,c) => p[0].y - c[0].y).reverse().slice(0,12);

  return stackable

}

function streamData(before,after,buckets) {
  var stackable = buildStreamData(before,buckets);
  var stack = d3.layout.stack().offset("wiggle").order("reverse");
  var before_stacked = stack(stackable);

  var order = before_stacked.map(item => item[0].key);

  var stackable = buildStreamData(after,buckets)
    .sort(function(p,c) { return order.indexOf(c[0].key) - order.indexOf(p[0].key) });

  stackable = stackable.filter(x => order.indexOf(x[0].key) == -1).concat(stackable.filter(x => order.indexOf(x[0].key) > -1));

  var stack = d3.layout.stack().offset("wiggle").order("default");
  var after_stacked = stack(stackable);

  return {
      order: order
    , before_stacked: before_stacked
    , after_stacked: after_stacked
  }

}

function simpleTimeseries(target,data,w,h) {
  var width = w || 120
    , height = h || 30;

  var x = d3.scale.ordinal().domain(d3.range(0,data.length)).range(d3.range(0,width,width/data.length));
  var y = d3.scale.linear().range([4,height]).domain([d3.min(data),d3.max(data)]);

  var wrap = d3_updateable(target,"g","g",data,function(x,i) { return 1});

  d3_splat(wrap,"rect","rect",x => x, (x,i) => i)
    .attr("x",(z,i) => x(i))
    .attr("width", width/data.length -1.2)
    .attr("y", z => height - y(z) )
    .attr("height", z => z ? y(z) : 0);

  return wrap

}



function drawStream(target,before,after) {

function extractData(b,a,buckets,accessor$$1) {
  var bvolume = {}, avolume = {};

  try { var bvolume = b[0].reduce(function(p,c) { p[c.x] = accessor$$1(c); return p },{}); } catch(e) {}
  try { var avolume = a[0].reduce(function(p,c) { p[c.x] = accessor$$1(c); return p },{}); } catch(e) {}

  var volume = buckets.slice().reverse().map(x => bvolume[x] || 0).concat(buckets.map(x => avolume[x] || 0));

  return volume
}

  var buckets = [0,10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 });

  var data = streamData(before,after,buckets)
    , before_stacked = data.before_stacked
    , after_stacked = data.after_stacked;

  var before = d3_updateable(target,".before-stream","div",data,function() { return 1})
    .classed("before-stream",true)
    .style("padding","10px")
    .style("padding-top","0px")

    .style("background-color","rgb(227, 235, 240)");

  d3_updateable(before,"h3","h3")
    .text("Consideration and Research Phase Identification")
    .style("font-size","12px")
    .style("color","#333")
    .style("line-height","33px")
    .style("background-color","#e3ebf0")
    .style("margin-left","-10px")
    .style("margin-bottom","10px")
    .style("padding-left","10px")
    .style("margin-top","0px")
    .style("font-weight","bold")
    .style("text-transform","uppercase");

  var inner = d3_updateable(before,".inner","div")
    .classed("inner",true);



  var stream = stream_plot(inner)
    .data(data)
    .on("category.hover",function(x,time) {
      console.log(time);
      var b = data.before_stacked.filter(y => y[0].key == x);
      var a = data.after_stacked.filter(y => y[0].key == x);

      var volume = extractData(b,a,buckets,function(c) { return c.values.length })
        , percent = extractData(b,a,buckets,function(c) { return c.percent })
        , importance = extractData(b,a,buckets,function(c) { return c.y });


      var wrap = d3.select(this)
        , vwrap = d3_updateable(wrap,".volume","g")
            .attr("class","volume")
            .attr("transform","translate(-60,30)")
        , pwrap = d3_updateable(wrap,".percent","g")
            .attr("class","percent")
            .attr("transform","translate(-60,90)")
        , iwrap = d3_updateable(wrap,".importance","g")
            .attr("class","importance")
            .attr("transform","translate(-60,150)");


      d3_updateable(vwrap,"text","text").text("Visits")
        .attr("style","title");
      simpleTimeseries(vwrap,volume)
        .attr("transform","translate(0,2)");


      d3_updateable(pwrap,"text","text").text("Share of time")
        .attr("class","title");

      simpleTimeseries(pwrap,percent)
        .attr("transform","translate(0,2)");


      d3_updateable(iwrap,"text","text").text("Importance")
        .attr("class","title");

      simpleTimeseries(iwrap,importance)
        .attr("transform","translate(0,2)");


      return
    })
    .draw();

  var before_agg = before_stacked.reduce((o,x) => { return x.reduce((p,c) => { p[c.x] = (p[c.x] || 0) + c.y; return p},o) },{})
    , after_agg = after_stacked.reduce((o,x) => { return x.reduce((p,c) => { p[c.x] = (p[c.x] || 0) + c.y; return p},o) },{});


  var local_before = Object.keys(before_agg).reduce((minarr,c) => {
      if (minarr[0] >= before_agg[c]) return [before_agg[c],c];
      if (minarr.length > 1) minarr[0] = -1;
      return minarr
    },[Infinity]
  )[1];

  var local_after = Object.keys(after_agg).reduce((minarr,c) => {
      if (minarr[0] >= after_agg[c]) return [after_agg[c],c];
      if (minarr.length > 1) minarr[0] = -1;
      return minarr
    },[Infinity]
  )[1];


  var before_line = buckets[buckets.indexOf(parseInt(local_before))]
    , after_line = buckets[buckets.indexOf(parseInt(local_after))];

  var svg = stream
    ._svg.style("margin","auto").style("display","block");


  var bline = d3_updateable(svg.selectAll(".before-canvas"),"g.line-wrap","g")
    .attr("class","line-wrap");

  d3_updateable(bline,"line","line")
    .style("stroke-dasharray", "1,5")
    .attr("stroke-width",1)
    .attr("stroke","black")
    .attr("y1", 0)
    .attr("y2", stream._height+20)
    .attr("x1", stream._before_scale(before_line))
    .attr("x2", stream._before_scale(before_line));

  d3_updateable(bline,"text","text")
    .attr("y", stream._height+20)
    .attr("x", stream._before_scale(before_line) + 10)
    .style("text-anchor","start")
    .text("Consideration Stage");


  var aline = d3_updateable(svg.selectAll(".after-canvas"),"g.line-wrap","g")
    .attr("class","line-wrap");

  d3_updateable(aline,"line","line")
    .style("stroke-dasharray", "1,5")
    .attr("stroke-width",1)
    .attr("stroke","black")
    .attr("y1", 0)
    .attr("y2", stream._height+20)
    .attr("x1", stream._after_scale(after_line))
    .attr("x2", stream._after_scale(after_line));

  d3_updateable(aline,"text","text")
    .attr("y", stream._height+20)
    .attr("x", stream._after_scale(after_line) - 10)
    .style("text-anchor","end")
    .text("Validation / Research");



  return {
    "consideration": "" + before_line,
    "validation": "-" + after_line
  }
}



function buildSummaryBlock(data, target, radius_scale, x) {
  var data = data
    , dthis = d3.select(target);

  pie(dthis)
    .data(data)
    .radius(radius_scale(data.population))
    .draw();

  var fw = d3_updateable(dthis,".fw","div",false,function() { return 1 })
    .classed("fw",true)
    .style("width","50px")
    .style("display","inline-block")
    .style("vertical-align","top")
    .style("padding-top","3px")
    .style("text-align","center")
    .style("line-height","16px");

  var fw2 = d3_updateable(dthis,".fw2","div",false,function() { return 1 })
    .classed("fw2",true)
    .style("width","60px")
    .style("display","inline-block")
    .style("vertical-align","top")
    .style("padding-top","3px")
    .style("text-align","center")
    .style("font-size","22px")
    .style("font-weight","bold")
    .style("line-height","40px")
    .text(d3.format("%")(data.sample/data.population));



  d3_updateable(fw,".sample","span").text(d3.format(",")(data.sample))
    .classed("sample",true);
  d3_updateable(fw,".vs","span").html("<br> out of <br>").style("font-size",".88em")
    .classed("vs",true);
  d3_updateable(fw,".population","span").text(d3.format(",")(data.population))
    .classed("population",true);

}

function drawBeforeAndAfter(target,data) {

  var before = d3_updateable(target,".before","div",data,function() { return 1})
    .classed("before",true)
    .style("padding","10px")
    .style("padding-top","0px")

    .style("background-color","rgb(227, 235, 240)");

  d3_updateable(before,"h3","h3")
    .text("Category activity before arriving and after leaving site")
    .style("font-size","12px")
    .style("color","#333")
    .style("line-height","33px")
    .style("background-color","#e3ebf0")
    .style("margin-left","-10px")
    .style("margin-bottom","10px")
    .style("padding-left","10px")
    .style("margin-top","0px")
    .style("font-weight","bold")
    .style("text-transform","uppercase");

  var inner = d3_updateable(before,".inner","div")
    .classed("inner",true)
    .style("position","absolute");

  d3_updateable(inner,"h3","h3")
    .text("Sort By")
    .style("margin","0px")
    .style("line-height","32px")
    .style("color","inherit")
    .style("font-size","inherit")
    .style("font-weight","bold")
    .style("text-transform","uppercase")
    .style("background","#e3ebf0")
    .style("padding-left","10px")
    .style("margin-right","10px")
    .style("margin-top","2px")
    .style("margin-bottom","2px")
    .style("display","inline-block")
    .style("width","140px");



  inner.selectAll("select")
    .style("min-width","140px");


  var cb = comp_bubble(before)
    .rows(data.before_categories)
    .after(data.after_categories)
    .draw();

  cb._svg.style("display","block")
    .style("margin-left","auto")
    .style("margin-right","auto");


  return inner

}

function drawCategoryDiff(target,data) {

  diff_bar(target)
    .data(data)
    .title("Category indexing versus comp")
    .value_accessor("normalized_diff")
    .draw();

}

function drawCategory(target,data) {

  comp_bar(target)
    .data(data)
    .title("Categories visited for filtered versus all views")
    .pop_value_accessor("pop")
    .samp_value_accessor("samp")
    .draw();

}

function drawTimeseries(target,data,radius_scale) {
  var w = d3_updateable(target,"div.timeseries","div")
    .classed("timeseries",true)
    .style("width","60%")
    .style("display","inline-block")
    .style("background-color", "#e3ebf0")
    .style("padding-left", "10px")
    .style("height","127px");



  var q = d3_updateable(target,"div.timeseries-details","div")
    .classed("timeseries-details",true)
    .style("width","40%")
    .style("display","inline-block")
    .style("vertical-align","top")
    .style("padding","15px")
    .style("padding-left","57px")
    .style("background-color", "#e3ebf0")
    .style("height","127px");





  var pop = d3_updateable(q,".pop","div")
    .classed("pop",true);

  d3_updateable(pop,".ex","span")
    .classed("ex",true)
    .style("width","20px")
    .style("height","10px")
    .style("background-color","grey")
    .style("display","inline-block");


  d3_updateable(pop,".title","span")
    .classed("title",true)
    .style("text-transform","uppercase")
    .style("padding-left","3px")
    .text("all");



  var samp = d3_updateable(q,".samp","div")
    .classed("samp",true);

  d3_updateable(samp,".ex","span")
    .classed("ex",true)
    .style("width","20px")
    .style("height","10px")
    .style("background-color","#081d58")
    .style("display","inline-block");



  d3_updateable(samp,".title","span")
    .classed("title",true)
    .style("text-transform","uppercase")
    .style("padding-left","3px")
    .text("filtered");


  var details = d3_updateable(q,".deets","div")
    .classed("deets",true);




  d3_updateable(w,"h3","h3")
    .text("Filtered versus All Views")
    .style("font-size","12px")
    .style("color","#333")
    .style("line-height","33px")
    .style("background-color","#e3ebf0")
    .style("margin-left","-10px")
    .style("margin-bottom","10px")
    .style("padding-left","10px")
    .style("margin-top","0px")
    .style("font-weight","bold")
    .style("text-transform","uppercase");






  time_series(w)
    .data({"key":"y","values":data})
    .height(80)
    .on("hover",function(x) {
      var xx = {};
      xx[x.key] = {sample: x.value, population: x.value2 };
      details.datum(xx);

      d3_updateable(details,".text","div")
        .classed("text",true)
        .text("@ " + x.hour + ":" + (x.minute.length > 1 ? x.minute : "0" + x.minute) )
        .style("display","inline-block")
        .style("line-height","49px")
        .style("padding-top","15px")
        .style("padding-right","15px")
        .style("font-size","22px")
        .style("font-weight","bold")
        .style("width","110px")
        .style("vertical-align","top")
        .style("text-align","center");




      d3_updateable(details,".pie","div")
        .classed("pie",true)
        .style("display","inline-block")
        .style("padding-top","15px")
        .each(function(x) {
          var data = Object.keys(x).map(function(k) { return x[k] })[0];
          buildSummaryBlock(data,this,radius_scale,x);
        });
    })
    .draw();

}





function summary_view(target) {
  return new SummaryView(target)
}

SummaryView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val)
    }
  , timing: function(val) {
      return accessor.bind(this)("timing",val)
    }
  , category: function(val) {
      return accessor.bind(this)("category",val)
    }
  , keywords: function(val) {
      return accessor.bind(this)("keywords",val)
    }
  , before: function(val) {
      return accessor.bind(this)("before",val)
    }
  , after: function(val) {
      return accessor.bind(this)("after",val)
    }


  , draw: function() {


  var CSS_STRING = String(function() {/*
.summary-wrap .table-wrapper { background:#e3ebf0; padding-top:5px; padding-bottom:10px }
.summary-wrap .table-wrapper tr { border-bottom:none }
.summary-wrap .table-wrapper thead tr { background:none }
.summary-wrap .table-wrapper tbody tr:hover { background:none }
.summary-wrap .table-wrapper tr td { border-right:1px dotted #ccc;text-align:center }
.summary-wrap .table-wrapper tr td:last-of-type { border-right:none }
  */});

  d3_updateable(d3.select("head"),"style#custom-table-css","style")
    .attr("id","custom-table-css")
    .text(CSS_STRING.replace("function () {/*","").replace("*/}",""));




      var wrap = d3_updateable(this.target,".summary-wrap","div")
        .classed("summary-wrap",true);

      header(wrap)
        .text("Summary")
        .draw();


      var tswrap = d3_updateable(wrap,".ts-row","div")
        .classed("ts-row",true)
        .style("padding-bottom","10px");

      var piewrap = d3_updateable(wrap,".pie-row","div")
        .classed("pie-row",true)
        .style("padding-bottom","10px");

      var catwrap = d3_updateable(wrap,".cat-row","div")
        .classed("cat-row dash-row",true)
        .style("padding-bottom","10px");

      var keywrap = d3_updateable(wrap,".key-row","div")
        .classed("key-row dash-row",true)
        .style("padding-bottom","10px");

      var bawrap = d3_updateable(wrap,".ba-row","div",false,function() { return 1})
        .classed("ba-row",true)
        .style("padding-bottom","10px");

      var streamwrap = d3_updateable(wrap,".stream-ba-row","div",false,function() { return 1})
        .classed("stream-ba-row",true)
        .style("padding-bottom","10px");








      var radius_scale = d3.scale.linear()
        .domain([this._data.domains.population,this._data.views.population])
        .range([20,35]);



      table(piewrap)
        .data({"key":"T","values":[this.data()]})
        .skip_option(true)
        .render("domains",function(x) {
          var data = d3.select(this.parentNode).datum()[x.key];
          buildSummaryBlock(data,this,radius_scale,x);
        })
        .render("articles",function(x) {
          var data = d3.select(this.parentNode).datum()[x.key];
          buildSummaryBlock(data,this,radius_scale,x);
        })

        .render("sessions",function(x) {
          var data = d3.select(this.parentNode).datum()[x.key];
          buildSummaryBlock(data,this,radius_scale,x);
        })
        .render("views",function(x) {
          var data = d3.select(this.parentNode).datum()[x.key];
          buildSummaryBlock(data,this,radius_scale,x);
        })
        .draw();


      drawTimeseries(tswrap,this._timing,radius_scale);


      try {
      drawCategory(catwrap,this._category);
      drawCategoryDiff(catwrap,this._category);
      } catch(e) {}

      //drawKeywords(keywrap,this._keywords)
      //drawKeywordDiff(keywrap,this._keywords)

      var inner = drawBeforeAndAfter(bawrap,this._before);

      select(inner)
        .options([
            {"key":"Importance","value":"percent_diff"}
          , {"key":"Activity","value":"score"}
          , {"key":"Population","value":"pop"}
        ])
        .selected(this._before.sortby || "")
        .on("select", this.on("ba.sort"))
        .draw();


      drawStream(streamwrap,this._before.before_categories,this._before.after_categories);


      return this
    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$10;
      this._on[action$$1] = fn;
      return this
    }
};

function d3_class(target,cls,type,data) {
  return d3_updateable(target,"." + cls, type || "div",data)
    .classed(cls,true)
}

function noop$9() {}


function DomainExpanded(target) {
  this._on = {};
  this.target = target;
}

function domain_expanded(target) {
  return new DomainExpanded(target)
}

var allbuckets = [];
var hourbuckets = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x);

var hours = [0,20,40];
var buckets = d3.range(0,24).reduce((p,c) => {
  hours.map(x => {
    p[c + ":" + x] = 0;
  });
  allbuckets = allbuckets.concat(hours.map(z => c + ":" + z));
  return p
},{});

DomainExpanded.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val)
    }
  , raw: function(val) {
      return accessor.bind(this)("raw",val)
    }
  , urls: function(val) {
      return accessor.bind(this)("urls",val)
    }
  , draw: function() {

      var self = this;

      var data = this._raw;
      var d = { domain: data[0].domain };

      //var articles = data.reduce((p,c) => {
      //  p[c.url] = p[c.url] || Object.assign({},buckets)
      //  p[c.url][c.hour + ":" + c.minute] = c.count
      //  return p
      //},{})

      //Object.keys(articles).map(k => {
      //  articles[k] = allbuckets.map(b => articles[k][b])
      //})

      var articles = data.reduce((p,c) => {
        p[c.url] = p[c.url] || Object.assign({},buckets);
        p[c.url][c.hour] = (p[c.url][c.hour] || 0) + c.count;
        return p
      },{});


      Object.keys(articles).map(k => {
        articles[k] = hourbuckets.map(b => articles[k][b] || 0);
      });

      var to_draw = d3.entries(articles)
        .map(function(x){
          x.domain = d.domain;
          x.url = x.key;
          x.total = d3.sum(x.value);
          return x
        });

      var kw_to_draw = to_draw
        .reduce(function(p,c){
          c.key.toLowerCase().split(d.domain)[1].split("/").reverse()[0].replace("_","-").split("-").map(x => {
            var values = ["that","this","what","best","most","from","your","have","first","will","than","says","like","into","after","with"];
            if (x.match(/\d+/g) == null && values.indexOf(x) == -1 && x.indexOf(",") == -1 && x.indexOf("?") == -1 && x.indexOf(".") == -1 && x.indexOf(":") == -1 && parseInt(x) != x && x.length > 3) {
              p[x] = p[x] || {};
              Object.keys(c.value).map(q => {
                p[x][q] = (p[x][q] || 0) + (c.value[q] || 0);
              });
            }
          });

          return p
        },{});

      kw_to_draw = d3.entries(kw_to_draw)
        .map(x => {
          x.values = Object.keys(x.value).map(z => x.value[z] || 0);
          x.total = d3.sum(x.values);
          return x
        });



      var td = this.target;

      d3_class(td,"action-header")
        .style("text-align","center")
        .style("font-size","16px")
        .style("font-weight","bold")
        .style("padding","10px")
        .text("Explore and Refine");

      var title_row = d3_class(td,"title-row");
      var expansion_row = d3_class(td,"expansion-row");



      var euh = d3_class(title_row,"expansion-urls-title")
        .style("width","50%")
        .style("height","36px")
        .style("line-height","36px")
        .style("display","inline-block")
        .style("vertical-align","top");

      d3_class(euh,"title")
        .style("width","265px")
        .style("font-weight","bold")
        .style("display","inline-block")
        .style("vertical-align","top")
        .text("URL");

      d3_class(euh,"view")
        .style("width","40px")
        .style("margin-left","20px")
        .style("margin-right","20px")
        .style("font-weight","bold")
        .style("display","inline-block")
        .style("vertical-align","top")
        .text("Views");

          var svg_legend = d3_class(euh,"legend","svg")
            .style("width","144px")
            .style("height","36px")
            .style("vertical-align","top");



          d3_updateable(svg_legend,"text.one","text")
            .attr("x","0")
            .attr("y","20")
            .style("text-anchor","start")
            .text("12 am");

          d3_updateable(svg_legend,"text.two","text")
            .attr("x","72")
            .attr("y","20")
            .style("text-anchor","middle")
            .text("12 pm");

          d3_updateable(svg_legend,"text.three","text")
            .attr("x","144")
            .attr("y","20")
            .style("text-anchor","end")
            .text("12 am");

          d3_updateable(svg_legend,"line.one","line")
                .classed("one",true)
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 25)
                .attr("y2", 35)
                .attr("x1", 0)
                .attr("x2", 0);

d3_updateable(svg_legend,"line.two","line")
                .classed("two",true)
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 25)
                .attr("y2", 35)
                .attr("x1", 72)
                .attr("x2", 72);


d3_updateable(svg_legend,"line.three","line")
                .classed("three",true)
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 25)
                .attr("y2", 35)
                .attr("x1", 144)
                .attr("x2", 144);



      var ekh = d3_class(title_row,"expansion-kws-title")
        .style("width","50%")
        .style("height","36px")
        .style("line-height","36px")
        .style("display","inline-block")
        .style("vertical-align","top");

      d3_class(ekh,"title")
        .style("width","265px")
        .style("font-weight","bold")
        .style("display","inline-block")
        .text("Keywords");

      d3_class(ekh,"view")
        .style("width","40px")
        .style("margin-left","20px")
        .style("margin-right","20px")
        .style("font-weight","bold")
        .style("display","inline-block")
        .text("Views");

        var svg_legend = d3_class(ekh,"legend","svg")
            .style("width","144px")
            .style("height","36px")
            .style("vertical-align","top");



          d3_updateable(svg_legend,"text.one","text")
            .attr("x","0")
            .attr("y","20")
            .style("text-anchor","start")
            .text("12 am");

          d3_updateable(svg_legend,"text.two","text")
            .attr("x","72")
            .attr("y","20")
            .style("text-anchor","middle")
            .text("12 pm");

          d3_updateable(svg_legend,"text.three","text")
            .attr("x","144")
            .attr("y","20")
            .style("text-anchor","end")
            .text("12 am");

          d3_updateable(svg_legend,"line.one","line")
                .classed("one",true)
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 25)
                .attr("y2", 35)
                .attr("x1", 0)
                .attr("x2", 0);

         d3_updateable(svg_legend,"line.two","line")
           .classed("two",true)
           .style("stroke-dasharray", "1,5")
           .attr("stroke-width",1)
           .attr("stroke","black")
           .attr("y1", 25)
           .attr("y2", 35)
           .attr("x1", 72)
           .attr("x2", 72);


         d3_updateable(svg_legend,"line.three","line")
           .classed("three",true)
           .style("stroke-dasharray", "1,5")
           .attr("stroke-width",1)
           .attr("stroke","black")
           .attr("y1", 25)
           .attr("y2", 35)
           .attr("x1", 144)
           .attr("x2", 144);






      var expansion = d3_class(expansion_row,"expansion-urls")
        .classed("scrollbox",true)
        .style("width","50%")
        .style("display","inline-block")
        .style("vertical-align","top")


        .style("max-height","250px")
        .style("overflow","scroll");

      expansion.html("");

      var url_row = d3_splat(expansion,".url-row","div",to_draw.slice(0,500),function(x) { return x.url })
        .classed("url-row",true);

      var url_name = d3_updateable(url_row,".name","div").classed("name",true)
        .style("width","260px")
        .style("overflow","hidden")
        .style("line-height","20px")
        .style("height","20px")

        .style("display","inline-block");

      d3_updateable(url_name,"input","input")
        .style("margin-right","10px")
        .style("display","inline-block")
        .style("vertical-align","top")
        .attr("type","checkbox")
        .on("click", function(x) {
          self.on("stage-filter")(x);
        });

      d3_class(url_name,"url","a")
        .style("display","inline-block")
        .style("text-overflow","ellipsis")
        .style("width","205px")
        .text(x => {
          return x.url.split(d.domain)[1] || x.url
        })
        .attr("href", x => x.url )
        .attr("target", "_blank");

      d3_updateable(url_row,".number","div").classed("number",true)
        .style("width","40px")
        .style("height","20px")
        .style("line-height","20px")
        .style("vertical-align","top")
        .style("text-align","center")
        .style("font-size","13px")
        .style("font-weight","bold")
        .style("margin-left","20px")
        .style("margin-right","20px")
        .style("display","inline-block")
        .text(function(x) { return x.total });


      d3_updateable(url_row,".plot","svg").classed("plot",true)
        .style("width","144px")
        .style("height","20px")
        .style("display","inline-block")
        .each(function(x) {
          var dthis = d3.select(this);
          var values = x.value;
          simpleTimeseries(dthis,values,144,20);

        });


      var expansion = d3_class(expansion_row,"expansion-kws")
        .classed("scrollbox",true)
        .style("width","50%")
        .style("display","inline-block")
        .style("vertical-align","top")


        .style("max-height","250px")
        .style("overflow","scroll");

      expansion.html("");


      var url_row = d3_splat(expansion,".url-row","div",kw_to_draw.slice(0,500),function(x) { return x.key })
        .classed("url-row",true);

      var url_name = d3_updateable(url_row,".name","div").classed("name",true)
        .style("width","260px")
        .style("overflow","hidden")
        .style("line-height","20px")
        .style("height","20px")

        .style("display","inline-block");

      d3_updateable(url_name,"input","input")
        .style("margin-right","10px")
        .style("display","inline-block")
        .style("vertical-align","top")
        .attr("type","checkbox")
        .on("click", function(x) {
          self.on("stage-filter")(x);
        });

      d3_class(url_name,"url")
        .style("display","inline-block")
        .style("text-overflow","ellipsis")
        .style("width","205px")
        .text(x => {
          return x.key
        });

      d3_updateable(url_row,".number","div").classed("number",true)
        .style("width","40px")
        .style("height","20px")
        .style("line-height","20px")
        .style("vertical-align","top")
        .style("text-align","center")
        .style("font-size","13px")
        .style("font-weight","bold")
        .style("margin-left","20px")
        .style("margin-right","20px")
        .style("display","inline-block")
        .text(function(x) { return x.total });


      d3_updateable(url_row,".plot","svg").classed("plot",true)
        .style("width","144px")
        .style("height","20px")
        .style("display","inline-block")
        .each(function(x) {
          var dthis = d3.select(this);
          var values = x.values;
          simpleTimeseries(dthis,values,144,20);

        });


      return this
    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$9;
      this._on[action$$1] = fn;
      return this
    }
};

function DomainBullet(target) {
  this._on = {};
  this.target = target;
}

function noop$11() {}
function domain_bullet(target) {
  return new DomainBullet(target)
}

DomainBullet.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , max: function(val) {
      return accessor.bind(this)("max",val) 
    }
  , draw: function() {

      var width = (this.target.style("width").replace("px","") || this.offsetWidth) - 50
        , height = 28;

      var x = d3.scale.linear()
        .range([0, width])
        .domain([0, this.max()]);

      if (this.target.text()) this.target.text("");

      var bullet = d3_updateable(this.target,".bullet","div",this.data(),function(x) { return 1 })
        .classed("bullet",true)
        .style("margin-top","3px");

      var svg = d3_updateable(bullet,"svg","svg",false,function(x) { return 1})
        .attr("width",width)
        .attr("height",height);
  
   
      d3_updateable(svg,".bar-1","rect",false,function(x) { return 1})
        .classed("bar-1",true)
        .attr("x",0)
        .attr("width", function(d) {return x(d.pop_percent) })
        .attr("height", height)
        .attr("fill","#888");
  
      d3_updateable(svg,".bar-2","rect",false,function(x) { return 1})
        .classed("bar-2",true)
        .attr("x",0)
        .attr("y",height/4)
        .attr("width", function(d) {return x(d.sample_percent_norm) })
        .attr("height", height/2)
        .attr("fill","rgb(8, 29, 88)");

      return this
    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$11;
      this._on[action$$1] = fn;
      return this
    }
};

function noop$8() {}
function DomainView(target) {
  this._on = {
    select: noop$8
  };
  this.target = target;
}



function domain_view(target) {
  return new DomainView(target)
}

DomainView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , options: function(val) {
      return accessor.bind(this)("options",val) 
    }
  , draw: function() {

      var self = this;

      var _explore = this.target
        , tabs = this.options()
        , data = this.data()
        , filtered = tabs.filter(function(x){ return x.selected})
        , selected = filtered.length ? filtered[0] : tabs[0];

      header(_explore)
        .text(selected.key )
        .options(tabs)
        .on("select", function(x) { this.on("select")(x); }.bind(this))
        .draw();

      

      _explore.selectAll(".vendor-domains-bar-desc").remove();
      _explore.datum(data);

      var t$$1 = table(_explore)
        .data(selected);


      var samp_max = d3.max(selected.values,function(x){return x.sample_percent_norm})
        , pop_max = d3.max(selected.values,function(x){return x.pop_percent})
        , max = Math.max(samp_max,pop_max);

      t$$1.headers([
            {key:"key",value:"Domain",locked:true,width:"100px"}
          , {key:"sample_percent",value:"Segment",selected:false}
          , {key:"real_pop_percent",value:"Baseline",selected:false}
          , {key:"ratio",value:"Ratio",selected:false}
          , {key:"importance",value:"Importance",selected:false}
          , {key:"value",value:"Segment versus Baseline",locked:true}
        ])
        .sort("importance")
        .option_text("&#65291;")
        .on("expand",function(d) {

          d3.select(this).selectAll("td.option-header").html("&ndash;");
          if (this.nextSibling && d3.select(this.nextSibling).classed("expanded") == true) {
            d3.select(this).selectAll("td.option-header").html("&#65291;");
            return d3.select(this.parentNode).selectAll(".expanded").remove()
          }

          d3.select(this.parentNode).selectAll(".expanded").remove();
          var t$$1 = document.createElement('tr');
          this.parentNode.insertBefore(t$$1, this.nextSibling);  

          var tr = d3.select(t$$1).classed("expanded",true).datum({});
          var td = d3_updateable(tr,"td","td")
            .attr("colspan",this.children.length)
            .style("background","#f9f9fb")
            .style("padding-top","10px")
            .style("padding-bottom","10px");

          var dd = this.parentElement.__data__.full_urls.filter(function(x) { return x.domain == d.key});
          var rolled = prepData$$1(dd);
          
          domain_expanded(td)
            .raw(dd)
            .data(rolled)
            .urls(d.urls)
            .on("stage-filter", function(x) {
              self.on("stage-filter")(x);
            })
            .draw();

        })
        .hidden_fields(["urls","percent_unique","sample_percent_norm","pop_percent","tf_idf","parent_category_name"])
        .render("ratio",function(d) {
          this.innerText = Math.trunc(this.parentNode.__data__.ratio*100)/100 + "x";
        })
        .render("value",function(d) {

          domain_bullet(d3.select(this))
            .max(max)
            .data(this.parentNode.__data__)
            .draw();

        });
        
      t$$1.draw();
     

      return this
    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$8;
      this._on[action$$1] = fn;
      return this
    }
};

function noop$12() {}
function simpleBar(wrap,value,scale,color) {

  var height = 20
    , width = wrap.style("width").replace("px","");

  var canvas = d3_updateable(wrap,"svg","svg",[value],function() { return 1})
    .style("width",width+"px")
    .style("height",height+"px");


  var chart = d3_updateable(canvas,'g.chart','g',false,function() { return 1 })
    .attr("class","chart");
  
  var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x,i) { return i })
    .attr("class","pop-bar")
    .attr('height',height-4)
    .attr({'x':0,'y':0})
    .style('fill',color)
    .attr("width",function(x) { return scale(x) });


}


function SegmentView(target) {
  this._on = {
    select: noop$12
  };
  this.target = target;
}



function segment_view(target) {
  return new SegmentView(target)
}

SegmentView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , segments: function(val) {
      return accessor.bind(this)("segments",val) 
    }
  , draw: function() {

      var wrap = d3_updateable(this.target,".segment-wrap","div")
        .classed("segment-wrap",true)
        .style("height","140px")
        .style("width",this.target.style("width"))
        .style("position","fixed")
        .style("z-index","300")
        .style("background","#f0f4f7");


      d3_updateable(this.target,".segment-wrap-spacer","div")
        .classed("segment-wrap-spacer",true)
        .style("height",wrap.style("height"));


      header(wrap)
        .buttons([
            {class: "saved-search", icon: "fa-folder-open-o fa", text: "Open Saved"}
          , {class: "new-saved-search", icon: "fa-bookmark fa", text: "Save"}
          , {class: "create", icon: "fa-plus-circle fa", text: "New Segment"}
          , {class: "logout", icon: "fa-sign-out fa", text: "Logout"}
        ])
        .on("saved-search.click", this.on("saved-search.click"))
        .on("logout.click", function() { window.location = "/logout"; })
        .on("create.click", function() { window.location = "/segments"; })
        .on("new-saved-search.click", this.on("new-saved-search.click"))
        .text("Segment").draw();      


      wrap.selectAll(".header-body")
        .classed("hidden",!this._is_loading)
        .style("text-align","center")
        .style("margin-bottom","-40px")
        .style("padding-top","10px")
        .style("height","0px")
        .style("background","none")
        .html("<img src='/static/img/general/logo-small.gif' style='height:15px'/> loading...");


      if (this._data == false) return

      var body = d3_updateable(wrap,".body","div")
        .classed("body",true)
        .style("clear","both")
        .style("display","flex")
        .style("flex-direction","column")
        .style("margin-top","-15px")
        .style("margin-bottom","30px");
        

      var row1 = d3_updateable(body,".row-1","div")
        .classed("row-1",true)
        .style("flex",1)
        .style("display","flex")
        .style("flex-direction","row");

      var row2 = d3_updateable(body,".row-2","div")
        .classed("row-2",true)
        .style("flex",1)
        .style("display","flex")
        .style("flex-direction","row");


      var inner = d3_updateable(row1,".action.inner","div")
        .classed("inner action",true)
        .style("flex","1")
        .style("display","flex")
        .style("padding","10px")
        .style("padding-bottom","0px")

        .style("margin-bottom","0px");

      var inner_desc = d3_updateable(row1,".action.inner-desc","div")
        .classed("inner-desc action",true)
        .style("flex","1")
        .style("padding","10px")
        .style("padding-bottom","0px")

        .style("display","flex")
        .style("margin-bottom","0px");


      d3_updateable(inner,"h3","h3")
        .text("Choose Segment")
        .style("margin","0px")
        .style("line-height","32px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("text-transform","uppercase")
        .style("flex","1")
        .style("background","#e3ebf0")
        .style("padding-left","10px")
        .style("margin-right","10px")
        .style("margin-top","2px")
        .style("margin-bottom","2px")
        .style("height","100%");



      d3_updateable(inner,"div.color","div")
        .classed("color",true)
        .style("background-color","#081d58")
        .style("width","10px")
        .style("height","32px")
        .style("margin-top","2px")
        .style("margin-right","10px")
        .style("margin-left","-10px");



      var self = this;

      select(inner)
        .options(this._segments)
        .on("select", function(x){
          self.on("change").bind(this)(x);
        })
        .selected(this._action.value || 0)
        .draw();

      



      var cal = d3_updateable(inner,"a.fa-calendar","a")
        .style("line-height","34px")
        .style("width","36px")
        .style("border","1px solid #ccc")
        .style("border-radius","5px")
        .classed("fa fa-calendar",true)
        .style("text-align","center")
        .style("margin-left","5px")
        .on("click", function(x) {
          calsel.node();
        });

      
      var calsel = select(cal)
        .options([{"key":"Today","value":0},{"key":"Yesterday","value":1},{"key":"7 days ago","value":7}])
        .on("select", function(x){
          self.on("action_date.change").bind(this)(x.value);
        })
        .selected(this._action_date || 0)
        .draw()
        ._select
        .style("width","18px")
        .style("margin-left","-18px")
        .style("height","34px")
        .style("opacity",".01")
        .style("flex","none")
        .style("border","none");

      

      var inner2 = d3_updateable(row2,".comparison.inner","div")
        .classed("inner comparison",true)
        .style("flex","1")
        .style("padding","10px")
        .style("padding-bottom","0px")

        .style("display","flex");

      var inner_desc2 = d3_updateable(row2,".comparison-desc.inner","div")
        .classed("inner comparison-desc",true)
        .style("flex","1")
        .style("padding","10px")
        .style("padding-bottom","0px")

        .style("display","flex");

      //d3_updateable(inner_desc,"h3","h3")
      //  .text("(Filters applied to this segment)")
      //  .style("margin","10px")
      //  .style("color","inherit")
      //  .style("font-size","inherit")
      //  .style("font-weight","bold")
      //  .style("text-transform","uppercase")
      //  .style("flex","1")

      d3_updateable(inner_desc,".bar-wrap-title","h3").classed("bar-wrap-title",true)
        .style("flex","1 1 0%")
        .style("margin","0px")
        .style("line-height","32px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("text-transform","uppercase")
        .style("padding-left","10px")
        .style("margin-right","10px")
        .style("margin-top","2px")
        .style("margin-bottom","2px")
        .style("height","100%")
        .style("text-align","right")


        .text("views");

      d3_updateable(inner_desc2,".bar-wrap-title","h3").classed("bar-wrap-title",true)
        .style("flex","1 1 0%")
        .style("margin","0px")
        .style("line-height","32px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("text-transform","uppercase")
        .style("padding-left","10px")
        .style("margin-right","10px")
        .style("margin-top","2px")
        .style("margin-bottom","2px")
        .style("height","100%")
        .style("text-align","right")



        .text("views");



      var bar_samp = d3_updateable(inner_desc,"div.bar-wrap","div")
        .classed("bar-wrap",true)
        .style("flex","2 1 0%")
        .style("margin-top","8px");

      d3_updateable(inner_desc,".bar-wrap-space","div").classed("bar-wrap-space",true)
        .style("flex","1 1 0%")
        .style("line-height","36px")
        .style("padding-left","10px")
        .text(d3.format(",")(this._data.views.sample));


      d3_updateable(inner_desc,".bar-wrap-opt","div").classed("bar-wrap-opt",true)
        .style("flex","2 1 0%")
        .style("line-height","36px");
        //.text("apply filters?")



      var xscale = d3.scale.linear()
        .domain([0,Math.max(this._data.views.sample, this._data.views.population)])
        .range([0,bar_samp.style("width")]);


      var bar_pop = d3_updateable(inner_desc2,"div.bar-wrap","div")
        .classed("bar-wrap",true)
        .style("flex","2 1 0%")
        .style("margin-top","8px");


      d3_updateable(inner_desc2,".bar-wrap-space","div").classed("bar-wrap-space",true)
        .style("flex","1 1 0%")
        .style("line-height","36px")
        .style("padding-left","10px")
        .text(d3.format(",")(this._data.views.population));


      d3_updateable(inner_desc2,".bar-wrap-opt","div").classed("bar-wrap-opt",true)
        .style("flex","2 1 0%")
        .style("margin","0px")
        .style("line-height","32px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("text-transform","uppercase")
        .style("height","100%")
        .style("text-align","right")
        .html("apply filters? <input type='checkbox'></input>");



      simpleBar(bar_samp,this._data.views.sample,xscale,"#081d58");
      simpleBar(bar_pop,this._data.views.population,xscale,"grey");











      d3_updateable(inner2,"h3","h3")
        .text("Compare Against")
        .style("line-height","32px")
        .style("margin","0px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("flex","1")
        .style("text-transform","uppercase")
        .style("background","#e3ebf0")
        .style("padding-left","10px")
        .style("margin-right","10px")
        .style("margin-top","2px")
        .style("margin-bottom","2px")
        .style("height","100%");



      d3_updateable(inner2,"div.color","div")
        .classed("color",true)
        .style("background-color","grey")
        .style("width","10px")
        .style("height","32px")
        .style("margin-top","2px")
        .style("margin-right","10px")
        .style("margin-left","-10px");








      select(inner2)
        .options([{"key":"Current Segment (without filters)","value":false}].concat(this._segments) )
        .on("select", function(x){

          self.on("comparison.change").bind(this)(x);
        })
        .selected(this._comparison.value || 0)
        .draw();

      var cal2 = d3_updateable(inner2,"a.fa-calendar","a")
        .style("line-height","34px")
        .style("width","36px")
        .style("border","1px solid #ccc")
        .style("border-radius","5px")
        .classed("fa fa-calendar",true)
        .style("text-align","center")
        .style("margin-left","5px")
        .on("click", function(x) {
          calsel2.node();
        });

      
      var calsel2 = select(cal2)
        .options([{"key":"Today","value":0},{"key":"Yesterday","value":1},{"key":"7 days ago","value":7}])
        .on("select", function(x){
          self.on("comparison_date.change").bind(this)(x.value);
        })
        .selected(this._comparison_date || 0)
        .draw()
        ._select
        .style("width","18px")
        .style("margin-left","-18px")
        .style("height","34px")
        .style("opacity",".01")
        .style("flex","none")
        .style("border","none");



      return this
    }
  , action_date: function(val) {
      return accessor.bind(this)("action_date",val)
    }
  , action: function(val) {
      return accessor.bind(this)("action",val)
    }
  , comparison_date: function(val) {
      return accessor.bind(this)("comparison_date",val)
    }

  , comparison: function(val) {
      return accessor.bind(this)("comparison",val)
    }
  , is_loading: function(val) {
      return accessor.bind(this)("is_loading",val)
    }

  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$12;
      this._on[action$$1] = fn;
      return this
    }
};

var buckets$1 = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) });
buckets$1 = buckets$1.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }));


function noop$14(){}

function d3_class$2(target,cls,type,data) {
  return d3_updateable(target,"." + cls, type || "div",data)
    .classed(cls,true)
}

function calcCategory(before_urls,after_urls) {
  var url_category = before_urls.reduce((p,c) => {
    p[c.url] = c.parent_category_name;
    return p
  },{});

  url_category = after_urls.reduce((p,c) => {
    p[c.url] = c.parent_category_name;
    return p
  },url_category);

  return url_category
}


function refine(target) {
  return new Refine(target)
}

class Refine {
  constructor(target) {
    this._target = target;
    this._on = {};
  }

  data(val) { return accessor.bind(this)("data",val) }
  stages(val) { return accessor.bind(this)("stages",val) }

  before_urls(val) { return accessor.bind(this)("before_urls",val) }
  after_urls(val) { return accessor.bind(this)("after_urls",val) }



  on(action$$1, fn) {
    if (fn === undefined) return this._on[action$$1] || noop$14;
    this._on[action$$1] = fn;
    return this
  }

  draw() {

    var self = this;

    var td = this._target;
    var before_urls = this._before_urls
      , after_urls = this._after_urls
      , d = this._data
      , stages = this._stages;


    var url_category = calcCategory(before_urls,after_urls);


          var url_volume = before_urls.reduce((p,c) => {
            p[c.url] = (p[c.url] || 0) + c.visits;
            return p
          },{});

          url_volume = after_urls.reduce((p,c) => {
            p[c.url] = (p[c.url] || 0) + c.visits;
            return p
          },url_volume);



          var sorted_urls = d3.entries(url_volume).sort((p,c) => {
            return d3.descending(p.value,c.value)
          });


          var before_url_ts = before_urls.reduce((p,c) => {
            p[c.url] = p[c.url] || {};
            p[c.url]["url"] = c.url;

            p[c.url][c.time_diff_bucket] = c.visits;
            return p
          },{});

          var after_url_ts = after_urls.reduce((p,c) => {
            p[c.url] = p[c.url] || {};
            p[c.url]["url"] = c.url;

            p[c.url]["-" + c.time_diff_bucket] = c.visits;
            return p
          },before_url_ts);



          var to_draw = sorted_urls.slice(0,1000).map(x => after_url_ts[x.key])
.map(function(x){
  x.total = d3.sum(buckets$1.map(function(b) { return x[b] || 0 }));
  return x
});

var kw_to_draw = d3.entries(after_url_ts).reduce(function(p,c) {

  c.key.toLowerCase().split(d.domain)[1].split("/").reverse()[0].replace("_","-").split("-").map(x => {
    var values = ["that","this","what","best","most","from","your","have","first","will","than","says","like","into","after","with"];
    if (x.match(/\d+/g) == null && values.indexOf(x) == -1 && x.indexOf(",") == -1 && x.indexOf("?") == -1 && x.indexOf(".") == -1 && x.indexOf(":") == -1 && parseInt(x) != x && x.length > 3) {
      p[x] = p[x] || {};
      p[x].key = x;
      Object.keys(c.value).map(q => {
        p[x][q] = (p[x][q] || 0) + c.value[q];
      });
    }
    return p
  });
  return p
},{});


kw_to_draw = Object.keys(kw_to_draw).map(function(k) { return kw_to_draw[k] }).map(function(x){
  x.total = d3.sum(buckets$1.map(function(b) { return x[b] || 0 }));
  return x
}).sort((p,c) => {
  return c.total - p.total
});




          var summary_row = d3_class$2(td,"summary-row").style("margin-bottom","15px")
            .style("position","relative");
          d3_class$2(td,"action-header").style("text-align","center").style("font-size","16px").style("font-weight","bold").text("Explore and Refine").style("padding","10px");
          var title_row = d3_class$2(td,"title-row");

          var expansion_row = d3_class$2(td,"expansion-row");
          var footer_row = d3_class$2(td,"footer-row").style("min-height","10px").style("margin-top","15px");

          d3_class$2(summary_row,"title")
            .style("font-size","16px")
            .style("font-weight","bold")
            .style("text-align","center")
            .style("line-height","40px")
            .style("margin-bottom","5px")
            .text("Before and After: " + d.domain);

          var options = [
              {"key":"All","value":"all", "selected":1}
            , {"key":"Consideration","value":"consideration", "selected":0}
            , {"key":"Validation","value":"validation", "selected":0}
          ];

          var tsw = 250;

          var timeseries = d3_class$2(summary_row,"timeseries","svg")
            .style("display","block")
            .style("margin","auto")
            .style("margin-bottom","30px")
            .attr("width",tsw + "px")
            .attr("height","70px");



          var before_rollup = d3.nest()
            .key(function(x) { return x.time_diff_bucket})
            .rollup(function(x) { return d3.sum(x,y => y.visits) })
            .map(before_urls);

          var after_rollup = d3.nest()
            .key(function(x) { return "-" + x.time_diff_bucket})
            .rollup(function(x) { return d3.sum(x,y => y.visits) })
            .map(after_urls);

          var overall_rollup = buckets$1.map(x => before_rollup[x] || after_rollup[x] || 0);



          simpleTimeseries(timeseries,overall_rollup,tsw);
          d3_class$2(timeseries,"middle","line")
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 0)
                .attr("y2", 55)
                .attr("x1", tsw/2)
                .attr("x2", tsw/2);

          d3_class$2(timeseries,"middle-text","text")
            .attr("x", tsw/2)
            .attr("y", 67)
            .style("text-anchor","middle")
            .text("On-site");


          var before_pos, after_pos;

          buckets$1.map(function(x,i) {
             if (stages.consideration == x) before_pos = i;
             if (stages.validation == x) after_pos = i;

          });

          var unit_size = tsw/buckets$1.length;

          d3_class$2(timeseries,"before","line")
            .style("stroke-dasharray", "1,5")
            .attr("stroke-width",1)
            .attr("stroke","black")
            .attr("y1", 39)
            .attr("y2", 45)
            .attr("x1", unit_size*before_pos)
            .attr("x2", unit_size*before_pos);

          d3_class$2(timeseries,"before-text","text")
            .attr("x", unit_size*before_pos - 8)
            .attr("y", 48)

            .style("text-anchor","end")
            .text("Consideration");

          d3_class$2(timeseries,"window","line")
            .style("stroke-dasharray", "1,5")
            .attr("stroke-width",1)
            .attr("stroke","black")
            .attr("y1", 45)
            .attr("y2", 45)
            .attr("x1", unit_size*(before_pos))
            .attr("x2", unit_size*(after_pos+1)+1);


          d3_class$2(timeseries,"after","line")
            .style("stroke-dasharray", "1,5")
            .attr("stroke-width",1)
            .attr("stroke","black")
            .attr("y1", 39)
            .attr("y2", 45)
            .attr("x1", unit_size*(after_pos+1))
            .attr("x2", unit_size*(after_pos+1));

          d3_class$2(timeseries,"after-text","text")
            .attr("x", unit_size*(after_pos+1) + 8)
            .attr("y", 48)
            .style("text-anchor","start")
            .text("Validation");



          function selectOptionRect(options) {

            var subset = td.selectAll("svg").selectAll("rect")
              .attr("fill",undefined).filter((x,i) => {
                var value = options.filter(x => x.selected)[0].value;
                if (value == "all") return false
                if (value == "consideration") return (i < before_pos) || (i > buckets$1.length/2 - 1 )
                if (value == "validation") return (i < buckets$1.length/2 ) || (i > after_pos)
              });


            subset.attr("fill","grey");
          }



          selectOptionRect(options);

          var opts = d3_class$2(summary_row,"options","div",options)
            .style("text-align","center")
            .style("position","absolute")
            .style("width","120px")
            .style("top","35px")
            .style("left","200px");


          function buildOptions(options) {


            d3_splat(opts,".show-button","a",options,x => x.key)
              .classed("show-button",true)
              .classed("selected",x => x.selected)
              .style("line-height","18px")
              .style("width","100px")
              .style("font-size","10px")
              .style("margin-bottom","5px")
              .text(x => x.key)
              .on("click",function(x) {
                this.parentNode.__data__.map(z => z.selected = 0);
                x.selected = 1;
                buildOptions(this.parentNode.__data__);
                if (x.value == "consideration") {
                  buildUrlSelection(consideration_to_draw);
                  buildKeywordSelection(consideration_kw_to_draw);
                } else if (x.value == "validation") {
                  buildUrlSelection(validation_to_draw);
                  buildKeywordSelection(validation_kw_to_draw);
                } else {
                  buildUrlSelection(to_draw);
                  buildKeywordSelection(kw_to_draw);
                }

                selectOptionRect(this.parentNode.__data__);
              });

          }

          buildOptions(options);

          d3_class$2(summary_row,"description")
            .style("font-size","12px")
            .style("position","absolute")
            .style("width","120px")
            .style("top","35px")
            .style("right","200px")
            .text("Select domains and keywords to build and refine your global filter");





          var urls_summary = d3_class$2(summary_row,"urls-summary")
            .style("display","inline-block")
            .style("width","50%")
            .style("vertical-align","top");

          var kws_summary = d3_class$2(summary_row,"kws-summary")
            .style("display","inline-block")
            .style("width","50%")
            .style("vertical-align","top");



          d3_class$2(urls_summary,"title")
            .style("font-weight","bold")
            .style("font-size","14px")
            .text("URL Summary");

          d3_class$2(kws_summary,"title")
            .style("font-weight","bold")
            .style("font-size","14px")
            .text("Keyword Summary");



          var consideration_buckets = buckets$1.filter((x,i) => !((i < before_pos) || (i > buckets$1.length/2 - 1 )) )
            , validation_buckets = buckets$1.filter((x,i) => !((i < buckets$1.length/2 ) || (i > after_pos)) );

          var consideration_to_draw = to_draw.filter(x => consideration_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) )
            , validation_to_draw = to_draw.filter(x => validation_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) );

          function avgViews(to_draw) {
            return parseInt(to_draw.reduce((p,c) => p + c.total,0)/to_draw.length)
          }
          function medianViews(to_draw) {
            return (to_draw[parseInt(to_draw.length/2)] || {}).total || 0
          }


          var url_summary_data = [
              {"name":"Distinct URLs", "all": to_draw.length, "consideration": consideration_to_draw.length, "validation": validation_to_draw.length }
            , {"name":"Average Views", "all": avgViews(to_draw), "consideration": avgViews(consideration_to_draw), "validation": avgViews(validation_to_draw)  }
            , {"name":"Median Views", "all": medianViews(to_draw), "consideration": medianViews(consideration_to_draw), "validation": medianViews(validation_to_draw)  }
          ];

          var uwrap = d3_class$2(urls_summary,"wrap").style("width","90%");


          table(uwrap)
            .data({"values":url_summary_data})
            .skip_option(true)
            .headers([
                {"key":"name","value":""}
              , {"key":"all","value":"All"}
              , {"key":"consideration","value":"Consideration"}
              , {"key":"validation","value":"Validation"}
            ])
            .draw()
            ._target.selectAll(".table-wrapper")
            .classed("table-wrapper",false);


          var consideration_kw_to_draw = kw_to_draw.filter(x => consideration_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) )
            , validation_kw_to_draw = kw_to_draw.filter(x => validation_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) );


          var kws_summary_data = [
              {"name":"Distinct Keywords", "all": kw_to_draw.length, "consideration": consideration_kw_to_draw.length, "validation": validation_kw_to_draw.length }
            , {"name":"Average Views", "all": avgViews(kw_to_draw), "consideration": avgViews(consideration_kw_to_draw), "validation": avgViews(validation_kw_to_draw)  }
            , {"name":"Median Views", "all": medianViews(kw_to_draw), "consideration": medianViews(consideration_kw_to_draw), "validation": medianViews(validation_kw_to_draw)  }
          ];

          var kwrap = d3_class$2(kws_summary,"wrap").style("width","90%");

          table(kwrap)
            .data({"values":kws_summary_data})
            .skip_option(true)
            .headers([
                {"key":"name","value":""}
              , {"key":"all","value":"All"}
              , {"key":"consideration","value":"Consideration"}
              , {"key":"validation","value":"Validation"}
            ])
            .draw()
            ._target.selectAll(".table-wrapper")
            .classed("table-wrapper",false);





          var euh = d3_class$2(title_row,"expansion-urls-title")
            .style("width","50%")
            .style("height","36px")
            .style("line-height","36px")
            .style("display","inline-block")
            .style("vertical-align","top");

          d3_class$2(euh,"title")
            .style("width","265px")
            .style("font-weight","bold")
            .style("display","inline-block")
            .style("vertical-align","top")

            .text("URL");

          d3_class$2(euh,"view")
            .style("width","50px")
            .style("margin-left","20px")
            .style("margin-right","20px")
            .style("font-weight","bold")
            .style("display","inline-block")
            .style("vertical-align","top")

            .text("Views");

          var svg_legend = d3_class$2(euh,"legend","svg")
            .style("width","120px")
            .style("height","36px")
            .style("vertical-align","top");



          d3_updateable(svg_legend,".before","text")
            .attr("x","30")
            .attr("y","20")
            .style("text-anchor","middle")
            .text("Before");

          d3_updateable(svg_legend,".after","text")
            .attr("x","90")
            .attr("y","20")
            .style("text-anchor","middle")
            .text("After");

          d3_updateable(svg_legend,"line","line")
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 0)
                .attr("y2", 36)
                .attr("x1", 60)
                .attr("x2", 60);




          var ekh = d3_class$2(title_row,"expansion-kws-title")
            .style("width","50%")
            .style("height","36px")
            .style("line-height","36px")
            .style("display","inline-block")
            .style("vertical-align","top");

          d3_class$2(ekh,"title")
            .style("width","265px")
            .style("font-weight","bold")
            .style("display","inline-block")
            .text("Keywords");

          d3_class$2(ekh,"view")
            .style("width","50px")
            .style("margin-left","20px")
            .style("margin-right","20px")
            .style("font-weight","bold")
            .style("display","inline-block")
            .text("Views");

          var svg_legend = d3_class$2(ekh,"legend","svg")
            .style("width","120px")
            .style("height","36px")
.style("vertical-align","top");



          d3_updateable(svg_legend,".before","text")
            .attr("x","30")
            .attr("y","20")
            .style("text-anchor","middle")
            .text("Before");

          d3_updateable(svg_legend,".after","text")
            .attr("x","90")
            .attr("y","20")
            .style("text-anchor","middle")
            .text("After");

          d3_updateable(svg_legend,"line","line")
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 0)
                .attr("y2", 36)
                .attr("x1", 60)
                .attr("x2", 60);







          function buildUrlSelection(to_draw) {
            var expansion = d3_class$2(expansion_row,"expansion-urls")
              .classed("scrollbox",true)
              .style("width","50%")
              .style("display","inline-block")
              .style("vertical-align","top")


              .style("max-height","250px")
              .style("overflow","scroll");

            expansion.html("");

            var url_row = d3_splat(expansion,".url-row","div",to_draw.slice(0,500),function(x) { return x.url })
              .classed("url-row",true);

            var url_name = d3_updateable(url_row,".name","div").classed("name",true)
              .style("width","260px")
              .style("overflow","hidden")
              .style("line-height","20px")
              .style("height","20px")

              .style("display","inline-block");

            d3_updateable(url_name,"input","input")
              .style("margin-right","10px")
              .style("display","inline-block")
              .style("vertical-align","top")
              .attr("type","checkbox")
              .on("click", function(x) {
                self.on("stage-filter")(x);
              });

            d3_class$2(url_name,"url", "a")
              .style("display","inline-block")
              .style("text-overflow","ellipsis")
              .style("width","235px")
              .text(x => x.url.split(d.domain)[1] || x.url )
              .attr("href", x => x.url)
              .attr("target", "_blank");

            d3_updateable(url_row,".number","div").classed("number",true)
              .style("width","50px")
              .style("height","20px")
              .style("line-height","20px")
              .style("vertical-align","top")
              .style("text-align","center")
              .style("font-size","13px")
              .style("font-weight","bold")
              .style("margin-left","20px")
              .style("margin-right","20px")
              .style("display","inline-block")
              .text(function(x) { return d3.sum(buckets$1.map(function(b) { return x[b] || 0 })) });


            d3_updateable(url_row,".plot","svg").classed("plot",true)
              .style("width","120px")
              .style("height","20px")
              .style("display","inline-block")
              .each(function(x) {
                var dthis = d3.select(this);
                var values = buckets$1.map(function(b) { return x[b] || 0 });
                simpleTimeseries(dthis,values,120,20);
                d3_updateable(dthis,"line","line")
                  .style("stroke-dasharray", "1,5")
                  .attr("stroke-width",1)
                  .attr("stroke","black")
                  .attr("y1", 0)
                  .attr("y2", 20)
                  .attr("x1", 60)
                  .attr("x2", 60);

              });
          }


          function buildKeywordSelection(kw_to_draw) {
            var expansion = d3_class$2(expansion_row,"expansion-keywords")
              .classed("scrollbox",true)
              .style("width","50%")
              .style("display","inline-block")
              .style("vertical-align","top")

              .style("max-height","250px")
              .style("overflow","scroll");

            expansion.html("");

            var url_row = d3_splat(expansion,".url-row","div",kw_to_draw.slice(0,500),function(x) { return x.key })
              .classed("url-row",true);

            var kw_name = d3_updateable(url_row,".name","div").classed("name",true)
              .style("width","260px")
              .style("overflow","hidden")
              .style("line-height","20px")
              .style("height","20px")

              .style("display","inline-block");

            d3_updateable(kw_name,"input","input")
              .style("display","inline-block")
              .style("vertical-align","top")

              .style("margin-right","10px")
              .attr("type","checkbox")
              .on("click", function(x) {
                self.on("stage-filter")(x);
              });

            d3_class$2(kw_name,"url")
              .style("text-overflow","ellipsis")
              .style("display","inline-block")
              .style("width","235px")
              .text(x => x.key );

            d3_updateable(url_row,".number","div").classed("number",true)
              .style("width","50px")
              .style("height","20px")
              .style("line-height","20px")
              .style("vertical-align","top")
              .style("text-align","center")
              .style("font-size","13px")
              .style("font-weight","bold")
              .style("margin-left","20px")
              .style("margin-right","20px")
              .style("display","inline-block")
              .text(function(x) { return d3.sum(buckets$1.map(function(b) { return x[b] || 0 })) });


            d3_updateable(url_row,".plot","svg").classed("plot",true)
              .style("width","120px")
              .style("height","20px")
              .style("display","inline-block")
              .each(function(x) {
                var dthis = d3.select(this);
                var values = buckets$1.map(function(b) { return x[b] || 0 });
                simpleTimeseries(dthis,values,120,20);
                d3_updateable(dthis,"line","line")
                  .style("stroke-dasharray", "1,5")
                  .attr("stroke-width",1)
                  .attr("stroke","black")
                  .attr("y1", 0)
                  .attr("y2", 20)
                  .attr("x1", 60)
                  .attr("x2", 60);

              });
          }

          buildUrlSelection(to_draw);
          buildKeywordSelection(kw_to_draw);





  }

}

function noop$13(){}

function d3_class$1(target,cls,type,data) {
  return d3_updateable(target,"." + cls, type || "div",data)
    .classed(cls,true)
}


function relative_timing(target) {
  return new RelativeTiming(target)
}

class RelativeTiming {
  constructor(target) {
    this._target = target;
    this._on = {};
  }

  data(val) { return accessor.bind(this)("data",val) } 

  on(action$$1, fn) {
    if (fn === undefined) return this._on[action$$1] || noop$13;
    this._on[action$$1] = fn;
    return this
  }


  draw() {


        var self = this;
    var data = this._data;
    var wrap = d3_class$1(this._target,"summary-wrap");

    header(wrap)
      .text("Before and After")
      .draw();

    var bawrap = d3_updateable(wrap,".ba-row","div",false,function() { return 1})
        .classed("ba-row",true)
        .style("padding-bottom","60px");

    try {
      var stages = drawStream(bawrap,this._data.before_categories,this._data.after_categories);
      bawrap.selectAll(".before-stream").remove(); // HACK
    } catch(e) {
      bawrap.html("");
      return
    }

    var values = this._data.before_categories[0].values;


    var category_multipliers = data.before_categories.reduce((p,c) => {
      p[c.key] = (1 + c.values[0].percent_diff);
      return p
    },{});


    var tabular_data = this._data.before.reduce((p,c) => {
      p[c.domain] = p[c.domain] || {};
      p[c.domain]['domain'] = c.domain;
      p[c.domain]['weighted'] = c.visits * category_multipliers[c.parent_category_name];
      
      p[c.domain][c.time_diff_bucket] = (p[c.domain][c.time_diff_bucket] || 0) + c.visits;
      return p
    },{});

    tabular_data = this._data.after.reduce((p,c) => {
      p[c.domain] = p[c.domain] || {}; 
      p[c.domain]['domain'] = c.domain;
      p[c.domain]["-" + c.time_diff_bucket] = (p[c.domain][c.time_diff_bucket] || 0) + c.visits;

      return p
    },tabular_data);

    var sorted_tabular = Object.keys(tabular_data).map((k) => {
      return tabular_data[k]
    }).sort((p,c) => {
      
      return d3.descending(p['600']*p.weighted || -Infinity,c['600']*c.weighted || -Infinity)
    });




    var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) });
    buckets = buckets.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }));


    var formatName = function(x) {

      if (x < 0) x = -x;

      if (x == 3600) return "1 hr"
      if (x < 3600) return x/60 + " mins" 

      if (x == 86400) return "1 day"
      if (x > 86400) return x/86400 + " days" 

      return x/3600 + " hrs"
    };

    bawrap.selectAll(".table-wrapper").html("");

    var table_obj = table(bawrap)
      .top(140)
      .headers(
        [{"key":"domain", "value":"Domain"}].concat(
          buckets.map(x => { return {"key":x, "value":formatName(x), "selected":true} })
        )
        
      )
      .on("expand",function(d) {

          d3.select(this).selectAll("td.option-header").html("&ndash;");
          if (this.nextSibling && d3.select(this.nextSibling).classed("expanded") == true) {
            d3.select(this).selectAll("td.option-header").html("&#65291;");
            return d3.select(this.parentNode).selectAll(".expanded").remove()
          }

          d3.select(this.parentNode).selectAll(".expanded").remove();
          var t$$1 = document.createElement('tr');
          this.parentNode.insertBefore(t$$1, this.nextSibling);  


          var tr = d3.select(t$$1).classed("expanded",true).datum({});
          var td = d3_updateable(tr,"td","td")
            .attr("colspan",this.children.length)
            .style("background","#f9f9fb")
            .style("padding-top","10px")
            .style("padding-bottom","10px");

          var before_urls = data.before.filter(y => y.domain == d.domain);
          var after_urls = data.after.filter(y => y.domain == d.domain);

          refine(td)
            .data(d)
            .stages(stages)
            .before_urls(before_urls)
            .after_urls(after_urls)
            .on("stage-filter",self.on("stage-filter"))
            .draw();

        })
      .option_text("<div style='width:40px;text-align:center'>&#65291;</div>")
      //.sort("600")
      .data({"values":sorted_tabular.slice(0,1000)})
      .draw();

    table_obj._target.selectAll("th")
      //.style("width",x => (parseInt(x.key) == x.key) ? "31px" : undefined )
      //.style("max-width",x => (parseInt(x.key) == x.key) ? "31px" : undefined )
      .style("border-right","1px rgba(0,0,0,.1)")
      .selectAll("span")
      .attr("style", function(x) { 
        if (parseInt(x.key) == x.key && x.key < 0) return "font-size:.9em;width:70px;transform:rotate(-45deg);display:inline-block;margin-left:-9px;margin-bottom: 12px"
        if (parseInt(x.key) == x.key && x.key > 0) return "font-size:.9em;width:70px;transform:rotate(45deg);text-align:right;display:inline-block;margin-left: -48px; margin-bottom: 12px;"

      });


    table_obj._target.selectAll(".table-option")
      .style("display","none");


    var max = sorted_tabular.reduce((p,c) => {
      Object.keys(c).filter(z => z != "domain" && z != "weighted").map(function(x) {
        p = c[x] > p ? c[x] : p;
      });
    
      return p
    },0);

    var oscale = d3.scale.linear().range([0,.8]).domain([0,Math.log(max)]);

    table_obj._target.selectAll("tr").selectAll("td:not(:first-child)")
      .style("border-right","1px solid white")
      .style("padding-left","0px")
      .style("text-align","center")
      .style("background-color",function(x) {
        var value = this.parentNode.__data__[x['key']] || 0;
        return "rgba(70, 130, 180," + oscale(Math.log(value+1)) + ")"
      });






      



    //var t = table.table(_explore)
    //  .data(selected)



    
  }
}

function noop$15(){}

function d3_class$3(target,cls,type,data) {
  return d3_updateable(target,"." + cls, type || "div",data)
    .classed(cls,true)
}

function formatHour(h) {
  if (h == 0) return "12 am"
  if (h == 12) return "12 pm"
  if (h > 12) return (h-12) + " pm"
  return (h < 10 ? h[1] : h) + " am"
}


function timing(target) {
  return new Timing(target)
}

class Timing {
  constructor(target) {
    this._target = target;
    this._on = {};
  }

  data(val) { return accessor.bind(this)("data",val) } 

  on(action$$1, fn) {
    if (fn === undefined) return this._on[action$$1] || noop$15;
    this._on[action$$1] = fn;
    return this
  }


  draw() {


    var self = this;
    var data = this._data;
    var wrap = d3_class$3(this._target,"timing-wrap");

    header(wrap)
      .text("Timing")
      .draw();

    var timingwrap = d3_updateable(wrap,".timing-row","div",false,function() { return 1})
        .classed("timing-row",true)
        .style("padding-bottom","60px");

    // DATA
    var hourbuckets = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x);


    var d = d3.nest()
      .key(x => x.domain)
      .key(x => x.hour)
      .entries(data.full_urls);

    var max = 0;

    d.map(x => {
      var obj = x.values.reduce((p,c) => {
        p[c.key] = c.values;
        return p
      },{});

      x.buckets = hourbuckets.map(z => {
       
        var o = {
          values: obj[z],
          key: formatHour(z)
        };
        o.views = d3.sum(obj[z] || [], q => q.uniques);

        max = max > o.views ? max : o.views;
        return o
      });

      x.tabular = x.buckets.reduce((p,c) => {
        p[c.key] = c.views || undefined;
        return p
      },{});

      x.tabular["domain"] = x.key;
      x.tabular["total"] = d3.sum(x.buckets,x => x.views);

      
      x.values;
    });

    var headers = [
      {key:"domain",value:"Domain"}
    ];

    headers = headers.concat(hourbuckets.map(formatHour).map(x => { return {key: x, value: x} }) );
    
    var oscale = d3.scale.linear().range([0,.8]).domain([0,Math.log(max)]);


    var table_obj = table(timingwrap)
      .headers(headers)
      .data({"key":"", "values":d.map(x => x.tabular) })
      .sort("total")
      .skip_option(true)
      .on("expand",function(d) {

          d3.select(this).selectAll("td.option-header").html("&ndash;");
          if (this.nextSibling && d3.select(this.nextSibling).classed("expanded") == true) {
            d3.select(this).selectAll("td.option-header").html("&#65291;");
            return d3.select(this.parentNode).selectAll(".expanded").remove()
          }

          d3.select(this.parentNode).selectAll(".expanded").remove();
          var t$$1 = document.createElement('tr');
          this.parentNode.insertBefore(t$$1, this.nextSibling);  

          var tr = d3.select(t$$1).classed("expanded",true).datum({});
          var td = d3_updateable(tr,"td","td")
            .attr("colspan",this.children.length)
            .style("background","#f9f9fb")
            .style("padding-top","10px")
            .style("padding-bottom","10px");

          var dd = data.full_urls.filter(function(x) { return x.domain == d.domain });
          var rolled = prepData$$1(dd);
          
          domain_expanded(td)
            .raw(dd)
            .data(rolled)
            .on("stage-filter", function(x) {
              self.on("stage-filter")(x);
            })
            .draw();

        })
      .draw();

    table_obj._target.selectAll("tr").selectAll("td:not(:first-child)")
      .style("border-right","1px solid white")
      .style("padding-left","0px")
      .style("text-align","center")
      .style("background-color",function(x) {
        var value = this.parentNode.__data__[x['key']] || 0;
        return "rgba(70, 130, 180," + oscale(Math.log(value+1)) + ")"
      });




    
  }
}

function d3_class$4(target,cls,type) {
  return d3_updateable(target,"." + cls, type || "div")
    .classed(cls,true)
}

function staged_filter(target) {
  return new StagedFilter(target)
}

class StagedFilter {
  constructor(target) {
    this._target = target;
    this._on = {};
  }

  data(val) { return accessor.bind(this)("data",val) } 

  on(action$$1, fn) {
    if (fn === undefined) return this._on[action$$1] || noop;
    this._on[action$$1] = fn;
    return this
  }


  draw() {
    var owrap = d3_class$4(this._target,"footer-wrap")
      .style("padding-top","5px")
      .style("min-height","60px")
      .style("bottom","0px")
      .style("position","fixed")
      .style("width","1000px")
      .style("background","#F0F4F7");

    var wrap = d3_class$4(owrap,"inner-wrap")
      .style("border-top","1px solid #ccc")
      .style("padding-top","5px");

    d3_class$4(wrap,"header-label")
      .style("line-height","35px")
      .style("text-transform","uppercase")
      .style("font-weight","bold")
      .style("display","inline-block")
      .style("font-size","14px")
      .style("color","#888888")
      .style("width","200px")
      .style("vertical-align","top")
      .text("Build Filters");

    d3_class$4(wrap,"text-label")
      .style("line-height","35px")
      .style("text-transform","uppercase")
      .style("font-weight","bold")
      .style("display","inline-block")
      .style("font-size","12px")
      .style("width","60px")
      .style("vertical-align","top")
      .style("display","none")
      .text("Title");

    var select_box = select(wrap)
      .options([
          {"key":"contains","value":"contains"}
        , {"key":"does not contain","value":"does not contain"}
      ])
      .draw()
      ._select
      .style("height","36px")
      .style("vertical-align","top");




    var footer_row = d3_class$4(wrap,"footer-row")
      .style("display","inline-block");


    var select_value = this.data();

    function buildFilterInput() {

      footer_row.selectAll(".selectize-control")
        .each(function(x) {
          var destroy = d3.select(this).on("destroy");
          if (destroy) destroy();
        });


      var select$$1 = d3_updateable(footer_row,"input","input")
        .style("margin-left","10px")
        .style("min-width","200px")
        .attr("value",select_value)
        .property("value",select_value);

      


      var s = $(select$$1.node()).selectize({
        persist: false,
        create: function(x){
          select_value = (select_value.length ? select_value + "," : "") + x;
          self.on("update")(select_value);
          return {
            value: x, text: x
          }
        },
        onDelete: function(x){
          select_value = select_value.split(",").filter(function(z) { return z != x[0]}).join(",");
          self.on("update")(select_value);
          return {
            value: x, text: x
          }
        }
      });

      footer_row.selectAll(".selectize-control")
        .on("destroy",function() {
          s[0].selectize.destroy();
        });

    }

    buildFilterInput();

    var self = this;
    d3_class$4(wrap,"include-submit","button")
      .style("float","right")
      .style("min-width","120px")
      .style("border-radius","5px")
      .style("line-height","29px")
      .style("background","#f9f9fb")
      .style("border","1px solid #ccc")
      .style("border-radius","5px")
      .style("vertical-align","top")
      .attr("type","submit")
      .text("Modify Filters")
      .on("click",function() {
        var value = footer_row.selectAll("input").property("value");
        var op =  select_box.node().selectedOptions[0].__data__.key + ".selectize";
        
        self.on("modify")({"field":"Title","op":op,"value":value});
      });

    d3_class$4(wrap,"exclude-submit","button")
      .style("float","right")
      .style("min-width","120px")
      .style("border-radius","5px")
      .style("line-height","29px")
      .style("background","#f9f9fb")
      .style("border","1px solid #ccc")
      .style("border-radius","5px")
      .style("vertical-align","top")
      .attr("type","submit")
      .text("New Filter")
      .on("click",function() {
        var value = footer_row.selectAll("input").property("value");
        var op =  select_box.node().selectedOptions[0].__data__.key + ".selectize";

        self.on("add")({"field":"Title","op":op,"value":value});
      });


  }
}

function noop$16() {}
function identity$10(x) { return x }
function ConditionalShow(target) {
  this._on = {};
  this._classes = {};
  this._objects = {};
  this.target = target;
}

function conditional_show(target) {
  return new ConditionalShow(target)
}

ConditionalShow.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , classed: function(k, v) {
      if (k === undefined) return this._classes
      if (v === undefined) return this._classes[k] 
      this._classes[k] = v;
      return this
    }  
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$16;
      this._on[action$$1] = fn;
      return this
    }
  , draw: function () {

      var classes = this.classed();

      var wrap = d3_updateable(this.target,".conditional-wrap","div",this.data())
        .classed("conditional-wrap",true);

      var objects = d3_splat(wrap,".conditional","div",identity$10, function(x,i) { return i })
        .attr("class", function(x) { return x.value })
        .classed("conditional",true)
        .classed("hidden", function(x) { return !x.selected });


      Object.keys(classes).map(function(k) { 
        objects.classed(k,classes[k]);
      });

      this._objects = objects;


      return this
  
    }
  , each: function(fn) {
      this.draw();
      this._objects.each(fn);
      
    }
};

function Share(target) {
  this._target = target;
  this._inner = function() {};
}

function share(target) {
  return new Share(target)
}

Share.prototype = {
    draw: function() {
      var self = this;

      var overlay = d3_updateable(this._target,".overlay","div")
        .classed("overlay",true)
        .style("width","100%")
        .style("height","100%")
        .style("position","fixed")
        .style("top","0px")
        .style("background","rgba(0,0,0,.5)")
        .style("z-index","301")
        .on("click",function() {
          overlay.remove();
        });

      this._overlay = overlay;

      var center = d3_updateable(overlay,".popup","div")
        .classed("popup col-md-5 col-sm-8",true)
        .style("margin-left","auto")
        .style("margin-right","auto")
        .style("min-height","300px")
        .style("margin-top","150px")
        .style("background-color","white")
        .style("float","none")
        .on("click",function() {
          d3.event.stopPropagation();
        })
        .each(function(x) {
          self._inner(d3.select(this));
        });

      return this
    }
  , inner: function(fn) {
      this._inner = fn.bind(this);
      this.draw();
      return this
    }
  , hide: function() {
      this._overlay.remove();
      return this 
    }
};

function noop$1() {}

function NewDashboard(target) {
  this.target = target;
  this._on = {};
}

function new_dashboard(target) {
  return new NewDashboard(target)
}

NewDashboard.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , staged_filters: function(val) {
      return accessor.bind(this)("staged_filters",val) || ""
    }
  , saved: function(val) {
      return accessor.bind(this)("saved",val) 
    }
  , line_items: function(val) {
      return accessor.bind(this)("line_items",val) || []
    }
  , selected_action: function(val) {
      return accessor.bind(this)("selected_action",val) 
    }
  , selected_comparison: function(val) {
      return accessor.bind(this)("selected_comparison",val) 
    }
  , action_date: function(val) {
      return accessor.bind(this)("action_date",val) 
    }
  , comparison_date: function(val) {
      return accessor.bind(this)("comparison_date",val) 
    }

  , view_options: function(val) {
      return accessor.bind(this)("view_options",val) || []
    }
  , logic_options: function(val) {
      return accessor.bind(this)("logic_options",val) || []
    }
  , explore_tabs: function(val) {
      return accessor.bind(this)("explore_tabs",val) || []
    }
  , logic_categories: function(val) {
      return accessor.bind(this)("logic_categories",val) || []
    }
  , actions: function(val) {
      return accessor.bind(this)("actions",val) || []
    }
  , summary: function(val) {
      return accessor.bind(this)("summary",val) || []
    }
  , time_summary: function(val) {
      return accessor.bind(this)("time_summary",val) || []
    }
  , category_summary: function(val) {
      return accessor.bind(this)("category_summary",val) || []
    }
  , keyword_summary: function(val) {
      return accessor.bind(this)("keyword_summary",val) || []
    }
  , before: function(val) {
      return accessor.bind(this)("before",val) || []
    }
  , after: function(val) {
      return accessor.bind(this)("after",val) || []
    }
  , filters: function(val) {
      return accessor.bind(this)("filters",val) || []
    }
  , loading: function(val) {
      if (val !== undefined) this._segment_view && this._segment_view.is_loading(val).draw();
      return accessor.bind(this)("loading",val)
    }
  , draw: function() {

      var data = this.data();

      var options = JSON.parse(JSON.stringify(this.view_options()));
      var tabs = JSON.parse(JSON.stringify(this.explore_tabs()));


      var logic = JSON.parse(JSON.stringify(this.logic_options()))
        , categories = this.logic_categories()
        , filters = JSON.parse(JSON.stringify(this.filters()))
        , actions = JSON.parse(JSON.stringify(this.actions()))
        , staged_filters = JSON.parse(JSON.stringify(this.staged_filters()));



      var target = this.target;
      var self = this;

      this._segment_view = segment_view(target)
        .is_loading(self.loading() || false)
        .segments(actions)
        .data(self.summary())
        .action(self.selected_action() || {})
        .action_date(self.action_date() || "")
        .comparison_date(self.comparison_date() || "")

        .comparison(self.selected_comparison() || {})
        .on("change", this.on("action.change"))
        .on("action_date.change", this.on("action_date.change"))
        .on("comparison.change", this.on("comparison.change"))
        .on("comparison_date.change", this.on("comparison_date.change"))
        .on("saved-search.click", function() {  
          var ss = share(d3.select("body")).draw();
          ss.inner(function(target) {

            var header = d3_updateable(target,".header","h4")
              .classed("header",true)
              .style("text-align","center")
              .style("text-transform","uppercase")
              .style("font-family","ProximaNova, sans-serif")
              .style("font-size","12px")
              .style("font-weight","bold")
              .style("padding-top","30px")
              .style("padding-bottom","30px")
              .text("Open a saved dashboard");

            var form = d3_updateable(target,"div","div",self.saved())
              .style("text-align","left")
              .style("padding-left","25%");

            if (!self.saved() || self.saved().length == 0) {
              d3_updateable(form,"span","span")
                .text("You currently have no saved dashboards");
            } else {
              d3_splat(form,".row","a",function(x) { return x },function(x) { return x.name })
                .classed("row",true)
                //.attr("href", x => x.endpoint)
                .text(x => x.name)
                .on("click", function(x) {
                  // HACK: THIS is hacky...
                  var _state = qs({}).from("?" + x.endpoint.split("?")[1]);

                  ss.hide();
                  window.onpopstate({state: _state});
                  d3.event.preventDefault();
                  return false
                });

            }

          });

        })
        .on("new-saved-search.click", function() { 
          var ss = share(d3.select("body")).draw();
          ss.inner(function(target) {

            var header = d3_updateable(target,".header","h4")
              .classed("header",true)
              .style("text-align","center")
              .style("text-transform","uppercase")
              .style("font-family","ProximaNova, sans-serif")
              .style("font-size","12px")
              .style("font-weight","bold")
              .style("padding-top","30px")
              .style("padding-bottom","30px")
              .text("Save this dashboard:");

            var form = d3_updateable(target,"div","div")
              .style("text-align","center");

            var name = d3_updateable(form, ".name", "div")
              .classed("name",true);
            
            d3_updateable(name,".label","div")
              .style("width","130px")
              .style("display","inline-block")
              .style("text-transform","uppercase")
              .style("font-family","ProximaNova, sans-serif")
              .style("font-size","12px")
              .style("font-weight","bold")
              .style("text-align","left")
              .text("Dashboard Name:");

            var name_input = d3_updateable(name,"input","input")
              .style("width","270px")
              .attr("placeholder","My awesome search");

            var advanced = d3_updateable(form, ".advanced", "details")
              .classed("advanced",true)
              .style("width","400px")
              .style("text-align","left")
              .style("margin","auto");


            
            d3_updateable(advanced,".label","div")
              .style("width","130px")
              .style("display","inline-block")
              .style("text-transform","uppercase")
              .style("font-family","ProximaNova, sans-serif")
              .style("font-size","12px")
              .style("font-weight","bold")
              .style("text-align","left")
              .text("Line Item:");

            var select_box = select(advanced)
              .options(self.line_items().map(x => { return {key:x.line_item_name, value: x.line_item_id} }) )
              .draw()
              ._select
              .style("width","270px");




            var send = d3_updateable(form, ".send", "div")
              .classed("send",true)
              .style("text-align","center");


            d3_updateable(send,"button","button")
              .style("line-height","16px")
              .style("margin-top","10px")
              .text("Send")
              .on("click",function(x) {
                var name = name_input.property("value"); 
                var line_item$$1 = select_box.node().selectedOptions.length ? select_box.node().selectedOptions[0].__data__.key : false;

                d3.xhr("/crusher/saved_dashboard")
                  .post(JSON.stringify({
                        "name": name
                      , "endpoint": window.location.pathname + window.location.search
                      , "line_item": line_item$$1
                    })
                  );

                ss.hide();

              })
              .text("Save");



          });


        })
        .draw();

      if (this.summary() == false) return false

      filter_view(target)
        .logic(logic)
        .categories(categories)
        .filters(filters)
        .data(data)
        .on("logic.change", this.on("logic.change"))
        .on("filter.change", this.on("filter.change"))
        .draw();

      option_view(target)
        .data(options)
        .on("select", this.on("view.change") )
        .draw();

      conditional_show(target)
        .data(options)
        .classed("view-option",true)
        .draw()
        .each(function(x) {

          if (!x.selected) return

          var dthis = d3.select(this);

          if (x.value == "data-view") {
            var dv = domain_view(dthis)
              .options(tabs)
              .data(data)
              .on("select", self.on("tab.change") )
              .on("stage-filter",function(x) {

               staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(x => x.length).join(",");
               self.on("staged-filter.change")(staged_filters);
               HACKbuildStagedFilter(staged_filters);

    
             })

              .draw();
          }

          if (x.value == "media-view") {
            media_plan.media_plan(dthis.style("margin-left","-15px").style("margin-right","-15px"))
             .data(data)
             .draw();
          }

          if (x.value == "ba-view") {
            relative_timing(dthis)
             .data(self.before())
             .on("stage-filter",function(x) {

               staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(x => x.length).join(",");
               self.on("staged-filter.change")(staged_filters);
               HACKbuildStagedFilter(staged_filters);

    
             })
             .draw();
          }

          if (x.value == "summary-view") {
            summary_view(dthis)
             .data(self.summary())
             .timing(self.time_summary())
             .category(self.category_summary())
             .before(self.before())
             .after(self.after())
             .keywords(self.keyword_summary())
             .on("ba.sort",self.on("ba.sort"))
             .draw();
          }

          if (x.value == "timing-view") {
            timing(dthis)
             .data(self.data())
             .on("stage-filter",function(x) {

               staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(x => x.length).join(",");
               self.on("staged-filter.change")(staged_filters);
               HACKbuildStagedFilter(staged_filters);

    
             })
             .draw();
          }

        });

      function HACKbuildStagedFilter(staged) {

        staged_filter(target)
          .data(staged)
          .on("update",function(x) {
            self.on("staged-filter.change")(x);
          })
          .on("modify",function(x) {
            self.on("staged-filter.change")("");
            self.on("modify-filter")(x);
          })

          .on("add",function(x) {
            self.on("staged-filter.change")("");
            self.on("add-filter")(x);
          })
          .draw();
      }
      HACKbuildStagedFilter(staged_filters);

      return this

    }
  , on: function(action$$1, fn) {
      if (fn === undefined) return this._on[action$$1] || noop$1;
      this._on[action$$1] = fn;
      return this
    }

};

//import * as d3 from 'd3'

function buildCategories$2(value) {
  var categories = d3.nest()
    .key(function(x){ return x.parent_category_name})
    .rollup(function(v) {
      return v.reduce(function(p,c) { return p + c.uniques },0)
    })
    .entries(value.full_urls);

  var total = categories.reduce(function(p,c) { return p + c.values },0);

  categories.map(function(x) {
    x.value = x.values;
    x.percent = x.value / total;
  });

  value["display_categories"] = {
      "key":"Categories"
    , "values": categories.filter(function(x) { return x.key != "NA" })
  };
}

function buildCategoryHour$1(value) {
  var category_hour = d3.nest()
    .key(function(x){ return x.parent_category_name + x.hour + x.minute})
    .rollup(function(v) {
      return {
          "parent_category_name": v[0].parent_category_name
        , "hour": v[0].hour
        , "minute": v[0].minute 
        , "count":v.reduce(function(p,c) { return p + c.count },0)
      }
    })
    .entries(value.full_urls)
    .map(function(x) { return x.values });

  value["category_hour"] = category_hour;
 
}

function buildData$1(data,buckets,pop_categories) {

  var times = d3.nest()
    .key(function(x) { return x.time_diff_bucket })
    .map(data.filter(function(x){ return x.parent_category_name != "" }) );

  var cats = d3.nest()
    .key(function(x) { return x.parent_category_name })
    .map(data.filter(function(x){ return x.parent_category_name != "" }) );




  var time_categories = buckets.reduce(function(p,c) { p[c] = {}; return p }, {});
  var category_times = Object.keys(cats).reduce(function(p,c) { p[c] = {}; return p }, {});


  var categories = d3.nest()
    .key(function(x) { return x.parent_category_name })
    .key(function(x) { return x.time_diff_bucket })
    .entries(data.filter(function(x){ return x.parent_category_name != "" }) )
    .map(function(row) {
      row.values.map(function(t) {
        t.percent = d3.sum(t.values,function(d){ return d.uniques})/ d3.sum(times[t.key],function(d) {return d.uniques}); 
        time_categories[t.key][row.key] = t.percent;
        category_times[row.key][t.key] = t.percent;

      });
      return row
    })
    .sort(function(a,b) { return ((pop_categories[b.key] || {}).normalized_pop || 0)- ((pop_categories[a.key] || {}).normalized_pop || 0) });


  var time_normalize_scales = {};

  d3.entries(time_categories).map(function(trow) {
    var values = d3.entries(trow.value).map(function(x) { return x.value });
    time_normalize_scales[trow.key] = d3.scale.linear()
      .domain([d3.min(values),d3.max(values)])
      .range([0,1]);
  });

  var cat_normalize_scales = {};

  d3.entries(category_times).map(function(trow) {
    var values = d3.entries(trow.value).map(function(x) { return x.value });
    cat_normalize_scales[trow.key] = d3.scale.linear()
      .domain([d3.min(values),d3.max(values)])
      .range([0,1]);
  });

  categories.map(function(p) {
    var cat = p.key;
    p.values.map(function(q) {
      q.norm_cat = cat_normalize_scales[cat](q.percent);
      q.norm_time = time_normalize_scales[q.key](q.percent);

      q.score = 2*q.norm_cat/3 + q.norm_time/3;
      q.score = q.norm_time;

      var percent_pop = pop_categories[cat] ? pop_categories[cat].percent_pop : 0;

      q.percent_diff = (q.percent - percent_pop)/percent_pop;

    });
  });

  return categories
}


var d = Object.freeze({
	buildCategories: buildCategories$2,
	buildCategoryHour: buildCategoryHour$1,
	buildData: buildData$1
});

var buildCategories$1 = buildCategories$2;
var buildCategoryHour$$1 = buildCategoryHour$1;
var buildData$$1 = buildData$1;


function prepareFilters(filters) {
  var mapping = {
      "Category": "parent_category_name"
    , "Title": "url"
    , "Time": "hour"
  };

  var filters = filters.filter(function(x) { return Object.keys(x).length && x.value }).map(function(z) {
    return { 
        "field": mapping[z.field]
      , "op": z.op
      , "value": z.value
    }
  });

  return filters
}



var ops = {
    "is in": function(field,value) {
        return function(x) {
          var values = value.split(",");
          return values.reduce(function(p,value) { return p + String(x[field]).indexOf(String(value)) > -1 }, 0) > 0
        } 
      }
  , "is not in": function(field,value) {
        return function(x) {
          var values = value.split(",");
          return values.reduce(function(p,value) { return p + String(x[field]).indexOf(String(value)) > -1 }, 0) == 0
        } 
      }
};

function init$1() {
  const s$$1 = s;

  s
    .registerEvent("updateFilter", function(err,filters,_state) {

      var filters = _state.filters;
      var value = _state.data;

      if (value == undefined) return // return early if there is no data...

      var filters = prepareFilters(filters);

      var logic = _state.logic_options.filter(function(x) { return x.selected });
      logic = logic.length > 0 ? logic[0] : _state.logic_options[0];

      var full_urls = filter_data(value.original_urls)
        .op("is in", ops["is in"])
        .op("is not in", ops["is not in"])
        .logic(logic.value)
        .by(filters);


      // should not filter if...
      //debugger

      if ( (value.full_urls) && 
           (value.full_urls.length == full_urls.length) && 
           (_state.selected_comparison && (_state.comparison_data == value.comparison))) return

      value.full_urls = full_urls;

      var compareTo = _state.comparison_data ? _state.comparison_data.original_urls : value.original_urls;

      value.comparison = compareTo;

      // all this logic should be move to the respective views...

      // ----- START : FOR MEDIA PLAN ----- //

      buildCategories$1(value);
      buildCategoryHour$$1(value);

      // ----- END : FOR MEDIA PLAN ----- //

      var tabs = [
          dashboard.buildDomains(value)
        , dashboard.buildUrls(value)
        //, dashboard.buildTopics(value)
      ];

      var summary_data = dashboard.buildSummaryData(value.full_urls)
        , pop_summary_data = dashboard.buildSummaryData(compareTo);

      var summary = dashboard.buildSummaryAggregation(summary_data,pop_summary_data);

      var ts = dashboard.prepData(value.full_urls)
        , pop_ts = dashboard.prepData(compareTo);

      var mappedts = ts.reduce(function(p,c) { p[c.key] = c; return p}, {});

      var prepped = pop_ts.map(function(x) {
        return {
            key: x.key
          , hour: x.hour
          , minute: x.minute
          , value2: x.value
          , value: mappedts[x.key] ?  mappedts[x.key].value : 0
        }
      });

      var cat_roll = d3.nest()
        .key(function(k) { return k.parent_category_name })
        .rollup(function(v) {
          return v.reduce(function(p,c) {
            p.views += c.count;
            p.sessions += c.uniques;
            return p
          },{ articles: {}, views: 0, sessions: 0})
        })
        .entries(value.full_urls);

      var pop_cat_roll = d3.nest()
        .key(function(k) { return k.parent_category_name })
        .rollup(function(v) {
          return v.reduce(function(p,c) {
            p.views += c.count;
            p.sessions += c.uniques;
            return p
          },{ articles: {}, views: 0, sessions: 0})
        })
        .entries(compareTo);

      var mapped_cat_roll = cat_roll.reduce(function(p,c) { p[c.key] = c; return p}, {});

      var cat_summary = pop_cat_roll.map(function(x) {
        return {
            key: x.key
          , pop: x.values.views
          , samp: mapped_cat_roll[x.key] ? mapped_cat_roll[x.key].values.views : 0
        }
      }).sort(function(a,b) { return b.pop - a.pop})
        .filter(function(x) { return x.key != "NA" });

      var parseWords = function(p,c) {
        var splitted = c.url.split(".com/");
        if (splitted.length > 1) {
          var last = splitted[1].split("/").slice(-1)[0].split("?")[0];
          var words = last.split("-").join("+").split("+").join("_").split("_").join(" ").split(" ");
          words.map(function(w) { 
            if ((w.length <= 4) || (String(parseInt(w[0])) == w[0] ) || (w.indexOf("asp") > -1) || (w.indexOf("php") > -1) || (w.indexOf("html") > -1) ) return
            p[w] = p[w] ? p[w] + 1 : 1;
          });
        }
        return p
      };

      var pop_counts = compareTo.reduce(parseWords,{});
      var samp_counts = value.full_urls.reduce(parseWords,{});


      var entries = d3.entries(pop_counts).filter(function(x) { return x.value > 1})
        .map(function(x) {
          x.samp = samp_counts[x.key];
          x.pop = x.value;
          return x
        })
        .sort(function(a,b) { return b.pop - a.pop})
        .slice(0,25);


      var modifyWithComparisons = function(ds) {

        var aggs = ds.reduce(function(p,c) {
          p.pop_max = (p.pop_max || 0) < c.pop ? c.pop : p.pop_max;
          p.pop_total = (p.pop_total || 0) + c.pop;

          if (c.samp) {
            p.samp_max = (p.samp_max || 0) > c.samp ? p.samp_max : c.samp;
            p.samp_total = (p.samp_total || 0) + c.samp;
          }

          return p
        },{});

        console.log(aggs);

        ds.map(function(o) {
          o.normalized_pop = o.pop / aggs.pop_max;
          o.percent_pop = o.pop / aggs.pop_total;

          o.normalized_samp = o.samp / aggs.samp_max;
          o.percent_samp = o.samp / aggs.samp_total;

          o.normalized_diff = (o.normalized_samp - o.normalized_pop)/o.normalized_pop;
          o.percent_diff = (o.percent_samp - o.percent_pop)/o.percent_pop;
        });
      };

      modifyWithComparisons(cat_summary);
      modifyWithComparisons(entries);


      if (value.before) {
        var before_urls = filter_data(value.before)
          .op("is in", ops["is in"])
          .op("is not in", ops["is not in"])
          //.op("does not contain", ops["does not contain"])
          //.op("contains", ops["contains"])
          .logic(logic.value)
          .by(filters);

        var after_urls = filter_data(value.after)
          .op("is in", ops["is in"])
          .op("is not in", ops["is not in"])
          //.op("does not contain", ops["does not contain"])
          //.op("contains", ops["contains"])
          .logic(logic.value)
          .by(filters);


        var bu = d3.nest()
          .key(function(x) { return x.parent_category_name })
          .key(function(x) { return x.time_diff_bucket })
          .entries(before_urls);

        var au = d3.nest()
          .key(function(x) { return x.parent_category_name })
          .key(function(x) { return x.time_diff_bucket })
          .entries(after_urls);

        var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })
          , pop_categories = cat_summary.reduce(function(p,c) { p[c.key] = c; return p }, {})
          , cats = cat_summary.map(function(p) { return p.key });

        var before_categories = buildData$$1(before_urls,buckets,pop_categories)
          , after_categories = buildData$$1(after_urls,buckets,pop_categories);

        var sortby = _state.sortby;

        if (sortby == "score") {

          before_categories = before_categories.sort(function(a,b) { 
            var p = -1, q = -1;
            try { p = b.values.filter(function(x){ return x.key == "600" })[0].score; } catch(e) {}
            try { q = a.values.filter(function(x){ return x.key == "600" })[0].score; } catch(e) {}
            return d3.ascending(p, q)
          });
          
        } else if (sortby == "pop") {

          before_categories = before_categories.sort(function(a,b) { 
            var p = cats.indexOf(a.key)
              , q = cats.indexOf(b.key);
            return d3.ascending(p > -1 ? p : 10000, q > -1 ? q : 10000)
          });

        } else {

          before_categories = before_categories.sort(function(a,b) { 
            var p = -1, q = -1;
            try { p = b.values.filter(function(x){ return x.key == "600" })[0].percent_diff; } catch(e) {}
            try { q = a.values.filter(function(x){ return x.key == "600" })[0].percent_diff; } catch(e) {}
            return d3.ascending(p, q)
          });

          
        }


        var order = before_categories.map(function(x) { return x.key });

        after_categories = after_categories.filter(function(x){return order.indexOf(x.key) > -1}).sort(function(a,b) {
          return order.indexOf(a.key) - order.indexOf(b.key)
        });

        s$$1.setStatic("before_urls",{"after":after_urls,"before":before_urls,"category":cat_summary,"before_categories":before_categories,"after_categories":after_categories,"sortby":value.sortby}); 
        s$$1.setStatic("after_urls", after_urls);

        


      }

      

      s$$1.setStatic("keyword_summary", entries); 
      s$$1.setStatic("time_summary", prepped);
      s$$1.setStatic("category_summary", cat_summary);

      s$$1.setStatic("summary",summary);
      s$$1.setStatic("tabs",tabs);
      s$$1.publishStatic("formatted_data",value);

    });
}

const s$1 = s;

const deepcopy = function(x) {
  return JSON.parse(JSON.stringify(x))
};

function init() {
  init$1();
  s
    .registerEvent("add-filter", function(filter) { 
      s$1.publish("filters",s$1.state().filters.concat(filter).filter(x => x.value) ); 
    })
    .registerEvent("modify-filter", function(filter) { 
      var filters = s$1.state().filters;
      var has_exisiting = filters.filter(x => (x.field + x.op) == (filter.field + filter.op) );
      
      if (has_exisiting.length) {
        var new_filters = filters.reverse().map(function(x) {
          if ((x.field == filter.field) && (x.op == filter.op)) {
            x.value += "," + filter.value;
          }
          return x
        });
        s$1.publish("filters",new_filters.filter(x => x.value));
      } else {
        s$1.publish("filters",s$1.state().filters.concat(filter).filter(x => x.value));
      }
    })
    .registerEvent("staged-filter.change", function(str) { s$1.publish("staged_filter",str ); })
    .registerEvent("action.change", function(action$$1) { s$1.publish("selected_action",action$$1); })
    .registerEvent("action_date.change", function(date) { s$1.publish("action_date",date); })
    .registerEvent("comparison_date.change", function(date) { s$1.publish("comparison_date",date); })
    .registerEvent("comparison.change", function(action$$1) { 
      if (action$$1.value == false) return s$1.publish("selected_comparison",false)
      s$1.publish("selected_comparison",action$$1);
    })
    .registerEvent("logic.change", function(logic) { s$1.publish("logic_options",logic); })
    .registerEvent("filter.change", function(filters) { s$1.publishBatch({ "filters":filters }); })
    .registerEvent("view.change", function(x) {
      s$1.update("loading",true);
      var CP = deepcopy(s$1.state().dashboard_options).map(function(d) { d.selected = (x.value == d.value) ? 1 : 0; return d });
      s$1.publish("dashboard_options",CP);
    })
    .registerEvent("tab.change", function(x) {
      s$1.update("loading",true);
      const value = s$1.state();
      value.tabs.map(function(t) { t.selected = (t.key == x.key) ? 1 : 0; });
      s$1.publishStatic("tabs",value.tabs);
    })
    .registerEvent("ba.sort", function(x) {
      s$1.publishBatch({
        "sortby": x.value,
        "filters":value.filters
      });
    });
}

function compare(qs_state,_state) {

  var updates = {};


  comparison_eval(qs_state,_state,updates)
    .accessor(
        "selected_action"
      , (x,y) => y.actions.filter(z => z.action_id == x.selected_action)[0]
      , (x,y) => y.selected_action
    )
    .failure("selected_action", (_new,_old,obj) => { 
      Object.assign(obj,{
          "loading": true
        , "selected_action": _new
      });
    })
    .accessor(
        "selected_view"
      , (x,y) => x.selected_view
      , (_,y) => y.dashboard_options.filter(x => x.selected)[0].value 
    )
    .failure("selected_view", (_new,_old,obj) => {
      // this should be redone so its not different like this
      Object.assign(obj, {
          "loading": true
        , "dashboard_options": JSON.parse(JSON.stringify(_state.dashboard_options)).map(x => { 
            x.selected = (x.value == _new); 
            return x 
          })
      });
    })
    .accessor(
        "selected_comparison"
      , (x,y) => y.actions.filter(z => z.action_id == x.selected_comparison)[0]
      , (x,y) => y.selected_comparison
    )
    .failure("selected_comparison", (_new,_old,obj) => { 
      Object.assign(obj,{
          "loading": true
        , "selected_comparison": _new
      });
    })
    .equal("filters", (x,y) => JSON.stringify(x) == JSON.stringify(y) )
    .failure("filters", (_new,_old,obj) => { 
      Object.assign(obj,{
          "loading": true
        , "filters": _new || [{}]
      });
    })
    .failure("action_date", (_new,_old,obj) => { 
      Object.assign(obj,{ loading: true, "action_date": _new });
    })
    .failure("comparison_date", (_new,_old,obj) => { 
      Object.assign(obj,{ loading: true, "comparison_date": _new });
    })

    .evaluate();

  var current = qs({}).to(_state.qs_state || {})
    , pop = qs({}).to(qs_state);

  if (Object.keys(updates).length && current != pop) {
    return updates
  }

  return {}
  
}


var s$4 = Object.freeze({
	compare: compare
});

function publishQSUpdates(updates,qs_state) {
  if (Object.keys(updates).length) {
    updates["qs_state"] = qs_state;
    s.publishBatch(updates);
  }
}

function init$3() {

  window.onpopstate = function(i) {

    var state$$1 = s$$1._state
      , qs_state = i.state;

    var updates = compare(qs_state,state$$1);
    publishQSUpdates(updates,qs_state);
  };

  const s$$1 = s;

  s
    .subscribe("history",function(error,_state) {
      console.log(
        "current: "+JSON.stringify(_state.qs_state), 
        JSON.stringify(_state.filters), 
        _state.dashboard_options
      );

      var for_state = ["filters"];

      var qs_state = for_state.reduce((p,c) => {
        if (_state[c]) p[c] = _state[c];
        return p
      },{});

      if (_state.selected_action) qs_state['selected_action'] = _state.selected_action.action_id;
      if (_state.selected_comparison) qs_state['selected_comparison'] = _state.selected_comparison.action_id;
      if (_state.dashboard_options) qs_state['selected_view'] = _state.dashboard_options.filter(x => x.selected)[0].value;
      if (_state.action_date) qs_state['action_date'] = _state.action_date;
      if (_state.comparison_date) qs_state['comparison_date'] = _state.comparison_date;


      if (_state.selected_action && qs(qs_state).to(qs_state) != window.location.search) {
        s$$1.publish("qs_state",qs_state);
      }
    })
    .subscribe("history.actions", function(error,value,_state) {
      var qs_state = qs({}).from(window.location.search);
      if (window.location.search.length && Object.keys(qs_state).length) {
        var updates = dashboard.state.compare(qs_state,_state);
        return publishQSUpdates(updates,qs_state)
      } else {
        s$$1.publish("selected_action",value[0]);
      }
    })
    .subscribe("history.qs_state", function(error,qs_state,_state) {

      if (JSON.stringify(history.state) == JSON.stringify(qs_state)) return
      if (window.location.search == "") history.replaceState(qs_state,"",qs(qs_state).to(qs_state));
      else history.pushState(qs_state,"",qs(qs_state).to(qs_state));

    });
}

const s$5 = s;

function init$4() {

  // Subscriptions that receive data / modify / change where it is stored

  s
    .subscribe("receive.data",function(error,value,state$$1) {
      s$5.publishStatic("logic_categories",value.categories);
      s$5.publish("filters",state$$1.filters);
    })
    .subscribe("receive.comparison_data",function(error,value,state$$1) {
      s$5.publish("filters",state$$1.filters);
    });


  // Subscriptions that will get more data

  s
    .subscribe("get.action_date",function(error,value,state$$1) {
      s$5.publishStatic("data",api.action.getData(state$$1.selected_action,state$$1.action_date));
    })
    .subscribe("get.comparison_date",function(error,value,state$$1) {
      if (!value) return s$5.publishStatic("comparison_data",false)
      s$5.publishStatic("comparison_data",api.action.getData(state$$1.selected_comparison,state$$1.comparison_date));
    })
    .subscribe("get.selected_action",function(error,value,state$$1) {
      s$5.publishStatic("data",api.action.getData(value,state$$1.action_date));
    })
    .subscribe("get.selected_comparison",function(error,value,state$$1) {
      if (!value) return s$5.publishStatic("comparison_data",false)
      s$5.publishStatic("comparison_data",api.action.getData(value,state$$1.comparison_date));
    });


}

const s$3 = s;


function init$2() {

  init$3();
  init$4();

  
  s
    .subscribe("change.loading", function(error,loading,value) { build()(); })
    .subscribe("change.dashboard_options", s$3.prepareEvent("updateFilter"))
    .subscribe("change.tabs", s$3.prepareEvent("updateFilter")) 
    .subscribe("change.logic_options", s$3.prepareEvent("updateFilter") )
    .subscribe("update.filters", s$3.prepareEvent("updateFilter"));
    

  // REDRAW: this is where the entire app gets redrawn - if formatted_data changes, redraw the app

  s
    .subscribe("redraw.formatted_data", function(error,formatted_data,value) { 
      s$3.update("loading",false); 
      build()(); 
    });
}

function build(target) {
  const db = new Dashboard(target);
  return db
}

class Dashboard {

  constructor(target) {
    init();
    init$2();
    this.target(target);
    this.init();

    return this.call.bind(this)
  }

  target(target) {
    this._target = target || d3_updateable(d3$1.select(".container"),"div","div")
      .style("width","1000px")
      .style("margin-left","auto")
      .style("margin-right","auto");
  }

  init() {
    let s$$1 = s;
    let value = s$$1.state();
    this.defaults(s$$1);
  }

  defaults(s$$1) {

    if (!!s$$1.state().dashboard_options) return // don't reload defaults if present

    s$$1.publishStatic("actions",api.action.getAll);
    s$$1.publishStatic("saved",api.dashboard.getAll);
    s$$1.publishStatic("line_items",api.line_item.getAll);

    var DEFAULTS = {
        logic_options: [{"key":"All","value":"and"},{"key":"Any","value":"or"}]
      , logic_categories: []
      , filters: [{}] 
      , dashboard_options: [
            {"key":"Data summary","value":"summary-view","selected":1}
          , {"key":"Explore data","value":"data-view","selected":0}
          , {"key":"Before & After","value":"ba-view","selected":0}
          , {"key":"Timing","value":"timing-view","selected":0}
          , {"key":"Media Plan", "value":"media-view","selected":0}

        ]
    };

    s$$1.update(false,DEFAULTS);
  }

  call() {

   let s$$1 = s;
   let value = s$$1.state();

   let db = new_dashboard(this._target)
     .staged_filters(value.staged_filter || "")
     .saved(value.saved || [])
     .data(value.formatted_data || {})
     .actions(value.actions || [])
     .selected_action(value.selected_action || {})
     .selected_comparison(value.selected_comparison || {})
     .action_date(value.action_date || 0)
     .comparison_date(value.comparison_date || 0)
     .loading(value.loading || false)
     .line_items(value.line_items || false)
     .summary(value.summary || false)
     .time_summary(value.time_summary || false)
     .category_summary(value.category_summary || false)
     .keyword_summary(value.keyword_summary || false)
     .before(value.before_urls || [])
     .after(value.after_urls || [])
     .logic_options(value.logic_options || false)
     .logic_categories(value.logic_categories || false)
     .filters(value.filters || false)
     .view_options(value.dashboard_options || false)
     .explore_tabs(value.tabs || false)
     .on("add-filter", s$$1.prepareEvent("add-filter"))
     .on("modify-filter", s$$1.prepareEvent("modify-filter"))
     .on("staged-filter.change", s$$1.prepareEvent("staged-filter.change"))
     .on("action.change", s$$1.prepareEvent("action.change"))
     .on("action_date.change", s$$1.prepareEvent("action_date.change"))
     .on("comparison_date.change", s$$1.prepareEvent("comparison_date.change"))
     .on("comparison.change", s$$1.prepareEvent("comparison.change"))
     .on("logic.change", s$$1.prepareEvent("logic.change"))
     .on("filter.change", s$$1.prepareEvent("filter.change"))
     .on("view.change", s$$1.prepareEvent("view.change"))
     .on("tab.change", s$$1.prepareEvent("tab.change"))
     .on("ba.sort", s$$1.prepareEvent("ba.sort"))
     .draw();
   
  }
}

//export {default as dashboard} from "./src/dashboard";
//export {default as filter_dashboard} from "./src/filter_dashboard";
let data = d;

let state = s$4;

var version = "0.0.1";

exports.version = version;
exports.data = data;
exports.state = state;
exports.new_dashboard = new_dashboard;
exports.build = build;
exports.prepData = prepData$1;
exports.buildSummaryData = buildSummaryData;
exports.buildSummaryAggregation = buildSummaryAggregation;
exports.buildCategories = buildCategories;
exports.buildTimes = buildTimes;
exports.buildTopics = buildTopics;
exports.buildDomains = buildDomains;
exports.buildUrls = buildUrls;
exports.buildOnsiteSummary = buildOnsiteSummary;
exports.buildOffsiteSummary = buildOffsiteSummary;
exports.buildActions = buildActions;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFzaGJvYXJkLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvc3RhdGUvc3JjL3N0YXRlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N0YXRlL3NyYy9xcy5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdGF0ZS9zcmMvY29tcF9ldmFsLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N0YXRlL2luZGV4LmpzIiwiLi4vc3JjL2hlbHBlcnMuanMiLCIuLi9zcmMvZ2VuZXJpYy9zZWxlY3QuanMiLCIuLi9zcmMvZ2VuZXJpYy9oZWFkZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvdGFibGUvYnVpbGQvdGFibGUuZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvZmlsdGVyL2J1aWxkL2ZpbHRlci5qcyIsIi4uL3NyYy92aWV3cy9maWx0ZXJfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2J1dHRvbl9yYWRpby5qcyIsIi4uL3NyYy92aWV3cy9vcHRpb25fdmlldy5qcyIsIi4uL3NyYy9kYXRhX2hlbHBlcnMuanMiLCIuLi9zcmMvdGltZXNlcmllcy5qcyIsIi4uL3NyYy9nZW5lcmljL3BpZS5qcyIsIi4uL3NyYy9nZW5lcmljL2RpZmZfYmFyLmpzIiwiLi4vc3JjL2dlbmVyaWMvY29tcF9iYXIuanMiLCIuLi9zcmMvZ2VuZXJpYy9jb21wX2J1YmJsZS5qcyIsIi4uL3NyYy9nZW5lcmljL3N0cmVhbV9wbG90LmpzIiwiLi4vc3JjL3ZpZXdzL3N1bW1hcnlfdmlldy5qcyIsIi4uL3NyYy92aWV3cy9kb21haW5fZXhwYW5kZWQuanMiLCIuLi9zcmMvdmlld3MvZG9tYWluX2J1bGxldC5qcyIsIi4uL3NyYy92aWV3cy9kb21haW5fdmlldy5qcyIsIi4uL3NyYy92aWV3cy9zZWdtZW50X3ZpZXcuanMiLCIuLi9zcmMvdmlld3MvcmVmaW5lLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZ192aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3RpbWluZ192aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3N0YWdlZF9maWx0ZXJfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2NvbmRpdGlvbmFsX3Nob3cuanMiLCIuLi9zcmMvZ2VuZXJpYy9zaGFyZS5qcyIsIi4uL3NyYy9uZXdfZGFzaGJvYXJkLmpzIiwiLi4vc3JjL2RhdGEuanMiLCIuLi9zcmMvZXZlbnRzL2ZpbHRlcl9ldmVudHMuanMiLCIuLi9zcmMvZXZlbnRzL2V2ZW50cy5qcyIsIi4uL3NyYy9zdGF0ZS5qcyIsIi4uL3NyYy9zdWJzY3JpcHRpb25zL2hpc3RvcnkuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy9hcGkuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy5qcyIsIi4uL3NyYy9idWlsZC5qcyIsIi4uL2luZGV4LmpzIiwiYnVuZGxlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBTdGF0ZShfY3VycmVudCwgX3N0YXRpYykge1xuXG4gIHRoaXMuX25vb3AgPSBmdW5jdGlvbigpIHt9XG4gIHRoaXMuX2V2ZW50cyA9IHt9XG5cbiAgdGhpcy5fb24gPSB7XG4gICAgICBcImNoYW5nZVwiOiB0aGlzLl9ub29wXG4gICAgLCBcImJ1aWxkXCI6IHRoaXMuX25vb3BcbiAgICAsIFwiZm9yd2FyZFwiOiB0aGlzLl9ub29wXG4gICAgLCBcImJhY2tcIjogdGhpcy5fbm9vcFxuICB9XG5cbiAgdGhpcy5fc3RhdGljID0gX3N0YXRpYyB8fCB7fVxuXG4gIHRoaXMuX2N1cnJlbnQgPSBfY3VycmVudCB8fCB7fVxuICB0aGlzLl9wYXN0ID0gW11cbiAgdGhpcy5fZnV0dXJlID0gW11cblxuICB0aGlzLl9zdWJzY3JpcHRpb24gPSB7fVxuICB0aGlzLl9zdGF0ZSA9IHRoaXMuX2J1aWxkU3RhdGUoKVxuXG5cbn1cblxuU3RhdGUucHJvdG90eXBlID0ge1xuICAgIHN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBwdWJsaXNoOiBmdW5jdGlvbihuYW1lLGNiKSB7XG5cbiAgICAgICB2YXIgcHVzaF9jYiA9IGZ1bmN0aW9uKGVycm9yLHZhbHVlKSB7XG4gICAgICAgICBpZiAoZXJyb3IpIHJldHVybiBzdWJzY3JpYmVyKGVycm9yLG51bGwpXG4gICAgICAgICBcbiAgICAgICAgIHRoaXMudXBkYXRlKG5hbWUsIHZhbHVlKVxuICAgICAgICAgdGhpcy50cmlnZ2VyKG5hbWUsIHRoaXMuc3RhdGUoKVtuYW1lXSwgdGhpcy5zdGF0ZSgpKVxuXG4gICAgICAgfS5iaW5kKHRoaXMpXG5cbiAgICAgICBpZiAodHlwZW9mIGNiID09PSBcImZ1bmN0aW9uXCIpIGNiKHB1c2hfY2IpXG4gICAgICAgZWxzZSBwdXNoX2NiKGZhbHNlLGNiKVxuXG4gICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcHVibGlzaEJhdGNoOiBmdW5jdGlvbihvYmopIHtcbiAgICAgIE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdGhpcy51cGRhdGUoeCxvYmpbeF0pXG4gICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgIHRoaXMudHJpZ2dlckJhdGNoKG9iaix0aGlzLnN0YXRlKCkpXG4gICAgfVxuICAsIHB1c2g6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICB0aGlzLnB1Ymxpc2goZmFsc2Usc3RhdGUpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzdWJzY3JpYmU6IGZ1bmN0aW9uKCkge1xuXG4gICAgICAvLyB0aHJlZSBvcHRpb25zIGZvciB0aGUgYXJndW1lbnRzOlxuICAgICAgLy8gKGZuKSBcbiAgICAgIC8vIChpZCxmbilcbiAgICAgIC8vIChpZC50YXJnZXQsZm4pXG5cblxuICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHRoaXMuX2dsb2JhbF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdKVxuICAgICAgaWYgKGFyZ3VtZW50c1swXS5pbmRleE9mKFwiLlwiKSA9PSAtMSkgcmV0dXJuIHRoaXMuX25hbWVkX3N1YnNjcmliZShhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSlcbiAgICAgIGlmIChhcmd1bWVudHNbMF0uaW5kZXhPZihcIi5cIikgPiAtMSkgcmV0dXJuIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdLnNwbGl0KFwiLlwiKVswXSwgYXJndW1lbnRzWzBdLnNwbGl0KFwiLlwiKVsxXSwgYXJndW1lbnRzWzFdKVxuXG4gICAgfVxuICAsIHVuc3Vic2NyaWJlOiBmdW5jdGlvbihpZCkge1xuICAgICAgdGhpcy5zdWJzY3JpYmUoaWQsdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgLCBfZ2xvYmFsX3N1YnNjcmliZTogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHZhciBpZCA9ICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24oYykge1xuICAgICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKSoxNnwwLCB2ID0gYyA9PSAneCcgPyByIDogKHImMHgzfDB4OCk7XG4gICAgICAgICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICAgICAgICB9KVxuICAgICAgLCB0byA9IFwiKlwiO1xuICAgICBcbiAgICAgIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoaWQsdG8sZm4pXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIF9uYW1lZF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGlkLGZuKSB7XG4gICAgICB2YXIgdG8gPSBcIipcIlxuICAgICAgdGhpcy5fdGFyZ2V0dGVkX3N1YnNjcmliZShpZCx0byxmbilcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgX3RhcmdldHRlZF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGlkLHRvLGZuKSB7XG5cbiAgICAgIHZhciBzdWJzY3JpcHRpb25zID0gdGhpcy5nZXRfc3Vic2NyaWJlcnNfb2JqKHRvKVxuICAgICAgICAsIHRvX3N0YXRlID0gdGhpcy5fc3RhdGVbdG9dXG4gICAgICAgICwgc3RhdGUgPSB0aGlzLl9zdGF0ZTtcblxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIGZuID09PSB1bmRlZmluZWQpIHJldHVybiBzdWJzY3JpcHRpb25zW2lkXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVsZXRlIHN1YnNjcmlwdGlvbnNbaWRdXG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICB9XG4gICAgICBzdWJzY3JpcHRpb25zW2lkXSA9IGZuO1xuXG4gICAgICByZXR1cm4gdGhpcyAgICAgIFxuICAgIH1cbiAgXG4gICwgZ2V0X3N1YnNjcmliZXJzX29iajogZnVuY3Rpb24oaykge1xuICAgICAgdGhpcy5fc3Vic2NyaXB0aW9uW2tdID0gdGhpcy5fc3Vic2NyaXB0aW9uW2tdIHx8IHt9XG4gICAgICByZXR1cm4gdGhpcy5fc3Vic2NyaXB0aW9uW2tdXG4gICAgfVxuICAsIGdldF9zdWJzY3JpYmVyc19mbjogZnVuY3Rpb24oaykge1xuICAgICAgdmFyIGZucyA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX29iaihrKVxuICAgICAgICAsIGZ1bmNzID0gT2JqZWN0LmtleXMoZm5zKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gZm5zW3hdIH0pXG4gICAgICAgICwgZm4gPSBmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmNzLm1hcChmdW5jdGlvbihnKSB7IHJldHVybiBnKGVycm9yLHZhbHVlLHN0YXRlKSB9KVxuICAgICAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuXG4gICAgfVxuICAsIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUsIF92YWx1ZSwgX3N0YXRlKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlciA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuKG5hbWUpIHx8IGZ1bmN0aW9uKCkge31cbiAgICAgICAgLCBhbGwgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihcIipcIikgfHwgZnVuY3Rpb24oKSB7fTtcblxuICAgICAgdGhpcy5vbihcImNoYW5nZVwiKShuYW1lLF92YWx1ZSxfc3RhdGUpXG5cbiAgICAgIHN1YnNjcmliZXIoZmFsc2UsX3ZhbHVlLF9zdGF0ZSlcbiAgICAgIGFsbChmYWxzZSxfc3RhdGUpXG4gICAgfVxuICAsIHRyaWdnZXJCYXRjaDogZnVuY3Rpb24ob2JqLCBfc3RhdGUpIHtcblxuICAgICAgdmFyIGFsbCA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuKFwiKlwiKSB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICwgZm5zID0gT2JqZWN0LmtleXMob2JqKS5tYXAoZnVuY3Rpb24oaykgeyBcbiAgICAgICAgICAgIHZhciBmbiA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuIHx8IGZ1bmN0aW9uKCkge31cbiAgICAgICAgICAgIHJldHVybiBmbi5iaW5kKHRoaXMpKGspKGZhbHNlLG9ialtrXSxfc3RhdGUpICBcbiAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICBcbiAgICAgIGFsbChmYWxzZSxfc3RhdGUpXG5cbiAgICB9XG4gICwgX2J1aWxkU3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2N1cnJlbnQpXG5cbiAgICAgIE9iamVjdC5rZXlzKHRoaXMuX3N0YXRpYykubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgIHRoaXMuX3N0YXRlW2tdID0gdGhpcy5fc3RhdGljW2tdXG4gICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgIHRoaXMub24oXCJidWlsZFwiKSh0aGlzLl9zdGF0ZSwgdGhpcy5fY3VycmVudCwgdGhpcy5fc3RhdGljKVxuXG4gICAgICByZXR1cm4gdGhpcy5fc3RhdGVcbiAgICB9XG4gICwgdXBkYXRlOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgICAgdGhpcy5fcGFzdFB1c2godGhpcy5fY3VycmVudClcbiAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgIHZhciBvYmogPSB7fVxuICAgICAgICBvYmpbbmFtZV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2N1cnJlbnQgPSAobmFtZSkgPyBcbiAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5fY3VycmVudCwgb2JqKSA6XG4gICAgICAgIE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2N1cnJlbnQsIHZhbHVlIClcblxuICAgICAgdGhpcy5fYnVpbGRTdGF0ZSgpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHNldFN0YXRpYzogZnVuY3Rpb24oayx2KSB7XG4gICAgICBpZiAoayAhPSB1bmRlZmluZWQgJiYgdiAhPSB1bmRlZmluZWQpIHRoaXMuX3N0YXRpY1trXSA9IHZcbiAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBwdWJsaXNoU3RhdGljOiBmdW5jdGlvbihuYW1lLGNiKSB7XG5cbiAgICAgIHZhciBwdXNoX2NiID0gZnVuY3Rpb24oZXJyb3IsdmFsdWUpIHtcbiAgICAgICAgaWYgKGVycm9yKSByZXR1cm4gc3Vic2NyaWJlcihlcnJvcixudWxsKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5fc3RhdGljW25hbWVdID0gdmFsdWVcbiAgICAgICAgdGhpcy5fYnVpbGRTdGF0ZSgpXG4gICAgICAgIHRoaXMudHJpZ2dlcihuYW1lLCB0aGlzLnN0YXRlKClbbmFtZV0sIHRoaXMuc3RhdGUoKSlcblxuICAgICAgfS5iaW5kKHRoaXMpXG5cbiAgICAgIGlmICh0eXBlb2YgY2IgPT09IFwiZnVuY3Rpb25cIikgY2IocHVzaF9jYilcbiAgICAgIGVsc2UgcHVzaF9jYihmYWxzZSxjYilcblxuICAgICAgcmV0dXJuIHRoaXNcblxuICAgIH1cbiAgLCBfcGFzdFB1c2g6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHRoaXMuX3Bhc3QucHVzaCh2KVxuICAgIH1cbiAgLCBfZnV0dXJlUHVzaDogZnVuY3Rpb24odikge1xuICAgICAgdGhpcy5fZnV0dXJlLnB1c2godilcbiAgICB9XG4gICwgZm9yd2FyZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9wYXN0UHVzaCh0aGlzLl9jdXJyZW50KVxuICAgICAgdGhpcy5fY3VycmVudCA9IHRoaXMuX2Z1dHVyZS5wb3AoKVxuXG4gICAgICB0aGlzLm9uKFwiZm9yd2FyZFwiKSh0aGlzLl9jdXJyZW50LHRoaXMuX3Bhc3QsIHRoaXMuX2Z1dHVyZSlcblxuICAgICAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcbiAgICAgIHRoaXMudHJpZ2dlcihmYWxzZSwgdGhpcy5fc3RhdGUsIHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2Z1dHVyZVB1c2godGhpcy5fY3VycmVudClcbiAgICAgIHRoaXMuX2N1cnJlbnQgPSB0aGlzLl9wYXN0LnBvcCgpXG5cbiAgICAgIHRoaXMub24oXCJiYWNrXCIpKHRoaXMuX2N1cnJlbnQsdGhpcy5fZnV0dXJlLCB0aGlzLl9wYXN0KVxuXG4gICAgICB0aGlzLl9zdGF0ZSA9IHRoaXMuX2J1aWxkU3RhdGUoKVxuICAgICAgdGhpcy50cmlnZ2VyKGZhbHNlLCB0aGlzLl9zdGF0ZSwgdGhpcy5fc3RhdGUpXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCB0aGlzLl9ub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9IFxuICAsIHJlZ2lzdGVyRXZlbnQ6IGZ1bmN0aW9uKG5hbWUsZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZXZlbnRzW25hbWVdIHx8IHRoaXMuX25vb3A7XG4gICAgICB0aGlzLl9ldmVudHNbbmFtZV0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHByZXBhcmVFdmVudDogZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGZuID0gdGhpcy5fZXZlbnRzW25hbWVdIFxuICAgICAgcmV0dXJuIGZuLmJpbmQodGhpcylcbiAgICB9XG4gICwgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24obmFtZSxkYXRhKSB7XG4gICAgICB2YXIgZm4gPSB0aGlzLnByZXBhcmVFdmVudChuYW1lKVxuICAgICAgZm4oZGF0YSlcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG59XG5cbmZ1bmN0aW9uIHN0YXRlKF9jdXJyZW50LCBfc3RhdGljKSB7XG4gIHJldHVybiBuZXcgU3RhdGUoX2N1cnJlbnQsIF9zdGF0aWMpXG59XG5cbnN0YXRlLnByb3RvdHlwZSA9IFN0YXRlLnByb3RvdHlwZVxuXG5leHBvcnQgZGVmYXVsdCBzdGF0ZTtcbiIsImV4cG9ydCBmdW5jdGlvbiBRUyhzdGF0ZSkge1xuICAvL3RoaXMuc3RhdGUgPSBzdGF0ZVxuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy5fZW5jb2RlT2JqZWN0ID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvKVxuICB9XG5cbiAgdGhpcy5fZW5jb2RlQXJyYXkgPSBmdW5jdGlvbihvKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG8pXG4gIH1cbn1cblxuLy8gTFpXLWNvbXByZXNzIGEgc3RyaW5nXG5mdW5jdGlvbiBsendfZW5jb2RlKHMpIHtcbiAgICB2YXIgZGljdCA9IHt9O1xuICAgIHZhciBkYXRhID0gKHMgKyBcIlwiKS5zcGxpdChcIlwiKTtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgdmFyIGN1cnJDaGFyO1xuICAgIHZhciBwaHJhc2UgPSBkYXRhWzBdO1xuICAgIHZhciBjb2RlID0gMjU2O1xuICAgIGZvciAodmFyIGk9MTsgaTxkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN1cnJDaGFyPWRhdGFbaV07XG4gICAgICAgIGlmIChkaWN0W3BocmFzZSArIGN1cnJDaGFyXSAhPSBudWxsKSB7XG4gICAgICAgICAgICBwaHJhc2UgKz0gY3VyckNoYXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvdXQucHVzaChwaHJhc2UubGVuZ3RoID4gMSA/IGRpY3RbcGhyYXNlXSA6IHBocmFzZS5jaGFyQ29kZUF0KDApKTtcbiAgICAgICAgICAgIGRpY3RbcGhyYXNlICsgY3VyckNoYXJdID0gY29kZTtcbiAgICAgICAgICAgIGNvZGUrKztcbiAgICAgICAgICAgIHBocmFzZT1jdXJyQ2hhcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBvdXQucHVzaChwaHJhc2UubGVuZ3RoID4gMSA/IGRpY3RbcGhyYXNlXSA6IHBocmFzZS5jaGFyQ29kZUF0KDApKTtcbiAgICBmb3IgKHZhciBpPTA7IGk8b3V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dFtpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUob3V0W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKFwiXCIpO1xufVxuXG4vLyBEZWNvbXByZXNzIGFuIExaVy1lbmNvZGVkIHN0cmluZ1xuZnVuY3Rpb24gbHp3X2RlY29kZShzKSB7XG4gICAgdmFyIGRpY3QgPSB7fTtcbiAgICB2YXIgZGF0YSA9IChzICsgXCJcIikuc3BsaXQoXCJcIik7XG4gICAgdmFyIGN1cnJDaGFyID0gZGF0YVswXTtcbiAgICB2YXIgb2xkUGhyYXNlID0gY3VyckNoYXI7XG4gICAgdmFyIG91dCA9IFtjdXJyQ2hhcl07XG4gICAgdmFyIGNvZGUgPSAyNTY7XG4gICAgdmFyIHBocmFzZTtcbiAgICBmb3IgKHZhciBpPTE7IGk8ZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY3VyckNvZGUgPSBkYXRhW2ldLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIGlmIChjdXJyQ29kZSA8IDI1Nikge1xuICAgICAgICAgICAgcGhyYXNlID0gZGF0YVtpXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgcGhyYXNlID0gZGljdFtjdXJyQ29kZV0gPyBkaWN0W2N1cnJDb2RlXSA6IChvbGRQaHJhc2UgKyBjdXJyQ2hhcik7XG4gICAgICAgIH1cbiAgICAgICAgb3V0LnB1c2gocGhyYXNlKTtcbiAgICAgICAgY3VyckNoYXIgPSBwaHJhc2UuY2hhckF0KDApO1xuICAgICAgICBkaWN0W2NvZGVdID0gb2xkUGhyYXNlICsgY3VyckNoYXI7XG4gICAgICAgIGNvZGUrKztcbiAgICAgICAgb2xkUGhyYXNlID0gcGhyYXNlO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oXCJcIik7XG59XG5cblFTLnByb3RvdHlwZSA9IHtcbiAgICB0bzogZnVuY3Rpb24oc3RhdGUsZW5jb2RlKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdmFyIHBhcmFtcyA9IE9iamVjdC5rZXlzKHN0YXRlKS5tYXAoZnVuY3Rpb24oaykge1xuXG4gICAgICAgIHZhciB2YWx1ZSA9IHN0YXRlW2tdXG4gICAgICAgICAgLCBvID0gdmFsdWU7XG5cbiAgICAgICAgaWYgKHZhbHVlICYmICh0eXBlb2YodmFsdWUpID09IFwib2JqZWN0XCIpICYmICh2YWx1ZS5sZW5ndGggPiAwKSkge1xuICAgICAgICAgIG8gPSBzZWxmLl9lbmNvZGVBcnJheSh2YWx1ZSlcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YodmFsdWUpID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICBvID0gc2VsZi5fZW5jb2RlT2JqZWN0KHZhbHVlKVxuICAgICAgICB9IFxuXG4gICAgICAgIHJldHVybiBrICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQobykgXG5cbiAgICAgIH0pXG5cbiAgICAgIGlmIChlbmNvZGUpIHJldHVybiBcIj9cIiArIFwiZW5jb2RlZD1cIiArIGJ0b2EoZXNjYXBlKGx6d19lbmNvZGUocGFyYW1zLmpvaW4oXCImXCIpKSkpO1xuICAgICAgcmV0dXJuIFwiP1wiICsgcGFyYW1zLmpvaW4oXCImXCIpXG4gICAgICBcbiAgICB9XG4gICwgZnJvbTogZnVuY3Rpb24ocXMpIHtcbiAgICAgIHZhciBxdWVyeSA9IHt9O1xuICAgICAgaWYgKHFzLmluZGV4T2YoXCI/ZW5jb2RlZD1cIikgPT0gMCkgcXMgPSBsendfZGVjb2RlKHVuZXNjYXBlKGF0b2IocXMuc3BsaXQoXCI/ZW5jb2RlZD1cIilbMV0pKSlcbiAgICAgIHZhciBhID0gcXMuc3Vic3RyKDEpLnNwbGl0KCcmJyk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgYiA9IGFbaV0uc3BsaXQoJz0nKTtcbiAgICAgICAgICBcbiAgICAgICAgICBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldID0gKGRlY29kZVVSSUNvbXBvbmVudChiWzFdIHx8ICcnKSk7XG4gICAgICAgICAgdmFyIF9jaGFyID0gcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXVswXSBcbiAgICAgICAgICBpZiAoKF9jaGFyID09IFwie1wiKSB8fCAoX2NoYXIgPT0gXCJbXCIpKSBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldID0gSlNPTi5wYXJzZShxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHF1ZXJ5O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcXMoc3RhdGUpIHtcbiAgcmV0dXJuIG5ldyBRUyhzdGF0ZSlcbn1cblxucXMucHJvdG90eXBlID0gUVMucHJvdG90eXBlXG5cbmV4cG9ydCBkZWZhdWx0IHFzO1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcGFyaXNvbl9ldmFsKG9iajEsb2JqMixfZmluYWwpIHtcbiAgcmV0dXJuIG5ldyBDb21wYXJpc29uRXZhbChvYmoxLG9iajIsX2ZpbmFsKVxufVxuXG52YXIgbm9vcCA9ICh4KSA9PiB7fVxuICAsIGVxb3AgPSAoeCx5KSA9PiB4ID09IHlcbiAgLCBhY2MgPSAobmFtZSxzZWNvbmQpID0+IHtcbiAgICAgIHJldHVybiAoeCx5KSA9PiBzZWNvbmQgPyB5W25hbWVdIDogeFtuYW1lXSBcbiAgICB9XG5cbmNsYXNzIENvbXBhcmlzb25FdmFsIHtcbiAgY29uc3RydWN0b3Iob2JqMSxvYmoyLF9maW5hbCkge1xuICAgIHRoaXMuX29iajEgPSBvYmoxXG4gICAgdGhpcy5fb2JqMiA9IG9iajJcbiAgICB0aGlzLl9maW5hbCA9IF9maW5hbFxuICAgIHRoaXMuX2NvbXBhcmlzb25zID0ge31cbiAgfVxuXG4gIGFjY2Vzc29yKG5hbWUsYWNjMSxhY2MyKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgYWNjMTogYWNjMVxuICAgICAgLCBhY2MyOiBhY2MyXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3VjY2VzcyhuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgc3VjY2VzczogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBmYWlsdXJlKG5hbWUsZm4pIHtcbiAgICB0aGlzLl9jb21wYXJpc29uc1tuYW1lXSA9IE9iamVjdC5hc3NpZ24oe30sdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0se1xuICAgICAgICBmYWlsdXJlOiBmblxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGVxdWFsKG5hbWUsZm4pIHtcbiAgICB0aGlzLl9jb21wYXJpc29uc1tuYW1lXSA9IE9iamVjdC5hc3NpZ24oe30sdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0se1xuICAgICAgICBlcTogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBldmFsdWF0ZSgpIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLl9jb21wYXJpc29ucykubWFwKCBrID0+IHtcbiAgICAgIHRoaXMuX2V2YWwodGhpcy5fY29tcGFyaXNvbnNba10saylcbiAgICB9KVxuICAgIHJldHVybiB0aGlzLl9maW5hbFxuICB9XG4gIFxuXG4gIGNvbXBhcnNpb24obmFtZSxhY2MxLGFjYzIsZXEsc3VjY2VzcyxmYWlsdXJlKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSB7XG4gICAgICAgIGFjYzE6IGFjYzFcbiAgICAgICwgYWNjMjogYWNjMlxuICAgICAgLCBlcTogZXEgfHwgZXFvcFxuICAgICAgLCBzdWNjZXNzOiBzdWNjZXNzIHx8IG5vb3BcbiAgICAgICwgZmFpbHVyZTogZmFpbHVyZSB8fCBub29wXG4gICAgfVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBfZXZhbChjb21wYXJpc29uLG5hbWUpIHtcbiAgICB2YXIgYWNjMSA9IGNvbXBhcmlzb24uYWNjMSB8fCBhY2MobmFtZSlcbiAgICAgICwgYWNjMiA9IGNvbXBhcmlzb24uYWNjMiB8fCBhY2MobmFtZSx0cnVlKVxuICAgICAgLCB2YWwxID0gYWNjMSh0aGlzLl9vYmoxLHRoaXMuX29iajIpXG4gICAgICAsIHZhbDIgPSBhY2MyKHRoaXMuX29iajEsdGhpcy5fb2JqMilcbiAgICAgICwgZXEgPSBjb21wYXJpc29uLmVxIHx8IGVxb3BcbiAgICAgICwgc3VjYyA9IGNvbXBhcmlzb24uc3VjY2VzcyB8fCBub29wXG4gICAgICAsIGZhaWwgPSBjb21wYXJpc29uLmZhaWx1cmUgfHwgbm9vcFxuXG4gICAgdmFyIF9ldmFsZCA9IGVxKHZhbDEsIHZhbDIpXG5cbiAgICBfZXZhbGQgPyBcbiAgICAgIHN1Y2MuYmluZCh0aGlzKSh2YWwxLHZhbDIsdGhpcy5fZmluYWwpIDogXG4gICAgICBmYWlsLmJpbmQodGhpcykodmFsMSx2YWwyLHRoaXMuX2ZpbmFsKVxuICB9XG5cbiAgXG59XG4iLCJleHBvcnQge2RlZmF1bHQgYXMgc3RhdGV9IGZyb20gXCIuL3NyYy9zdGF0ZVwiO1xuZXhwb3J0IHtkZWZhdWx0IGFzIHFzfSBmcm9tIFwiLi9zcmMvcXNcIjtcbmV4cG9ydCB7ZGVmYXVsdCBhcyBjb21wX2V2YWx9IGZyb20gXCIuL3NyYy9jb21wX2V2YWxcIjtcblxuaW1wb3J0IHN0YXRlIGZyb20gXCIuL3NyYy9zdGF0ZVwiO1xuXG5kZWJ1Z2dlclxuZXhwb3J0IGNvbnN0IHMgPSB3aW5kb3cuX19zdGF0ZV9fIHx8IHN0YXRlKClcbndpbmRvdy5fX3N0YXRlX18gPSBzXG5cbmV4cG9ydCBkZWZhdWx0IHM7XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9wU2VjdGlvbihzZWN0aW9uKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHNlY3Rpb24sXCIudG9wLXNlY3Rpb25cIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidG9wLXNlY3Rpb25cIix0cnVlKVxuICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjE2MHB4XCIpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1haW5pbmdTZWN0aW9uKHNlY3Rpb24pIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUoc2VjdGlvbixcIi5yZW1haW5pbmctc2VjdGlvblwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJyZW1haW5pbmctc2VjdGlvblwiLHRydWUpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdXRvU2l6ZSh3cmFwLGFkanVzdFdpZHRoLGFkanVzdEhlaWdodCkge1xuXG4gIGZ1bmN0aW9uIGVsZW1lbnRUb1dpZHRoKGVsZW0pIHtcblxuICAgIHZhciBfdyA9IHdyYXAubm9kZSgpLm9mZnNldFdpZHRoIHx8IHdyYXAubm9kZSgpLnBhcmVudE5vZGUub2Zmc2V0V2lkdGggfHwgd3JhcC5ub2RlKCkucGFyZW50Tm9kZS5wYXJlbnROb2RlLm9mZnNldFdpZHRoXG4gICAgdmFyIG51bSA9IF93IHx8IHdyYXAuc3R5bGUoXCJ3aWR0aFwiKS5zcGxpdChcIi5cIilbMF0ucmVwbGFjZShcInB4XCIsXCJcIikgXG4gICAgcmV0dXJuIHBhcnNlSW50KG51bSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGVsZW1lbnRUb0hlaWdodChlbGVtKSB7XG4gICAgdmFyIG51bSA9IHdyYXAuc3R5bGUoXCJoZWlnaHRcIikuc3BsaXQoXCIuXCIpWzBdLnJlcGxhY2UoXCJweFwiLFwiXCIpXG4gICAgcmV0dXJuIHBhcnNlSW50KG51bSlcbiAgfVxuXG4gIHZhciB3ID0gZWxlbWVudFRvV2lkdGgod3JhcCkgfHwgNzAwLFxuICAgIGggPSBlbGVtZW50VG9IZWlnaHQod3JhcCkgfHwgMzQwO1xuXG4gIHcgPSBhZGp1c3RXaWR0aCh3KVxuICBoID0gYWRqdXN0SGVpZ2h0KGgpXG5cblxuICB2YXIgbWFyZ2luID0ge3RvcDogMTAsIHJpZ2h0OiAxNSwgYm90dG9tOiAxMCwgbGVmdDogMTV9LFxuICAgICAgd2lkdGggID0gdyAtIG1hcmdpbi5sZWZ0IC0gbWFyZ2luLnJpZ2h0LFxuICAgICAgaGVpZ2h0ID0gaCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tO1xuXG4gIHJldHVybiB7XG4gICAgbWFyZ2luOiBtYXJnaW4sXG4gICAgd2lkdGg6IHdpZHRoLFxuICAgIGhlaWdodDogaGVpZ2h0XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGF1dG9TY2FsZXMoX3NpemVzLCBsZW4pIHtcblxuICB2YXIgbWFyZ2luID0gX3NpemVzLm1hcmdpbixcbiAgICB3aWR0aCA9IF9zaXplcy53aWR0aCxcbiAgICBoZWlnaHQgPSBfc2l6ZXMuaGVpZ2h0O1xuXG4gIGhlaWdodCA9IGxlbiAqIDI2XG4gIFxuICB2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAucmFuZ2UoW3dpZHRoLzIsIHdpZHRoLTIwXSk7XG4gIFxuICB2YXIgeSA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgLnJhbmdlUm91bmRCYW5kcyhbMCwgaGVpZ2h0XSwgLjIpO1xuXG4gIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKClcbiAgICAgIC5zY2FsZSh4KVxuICAgICAgLm9yaWVudChcInRvcFwiKTtcblxuXG4gIHJldHVybiB7XG4gICAgICB4OiB4XG4gICAgLCB5OiB5XG4gICAgLCB4QXhpczogeEF4aXNcbiAgfVxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBTZWxlY3QodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2VsZWN0KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNlbGVjdCh0YXJnZXQpXG59XG5cblNlbGVjdC5wcm90b3R5cGUgPSB7XG4gICAgb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm9wdGlvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcblxuICAgICAgdGhpcy5fc2VsZWN0ID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcInNlbGVjdFwiLFwic2VsZWN0XCIsdGhpcy5fb3B0aW9ucylcblxuICAgICAgdmFyIGJvdW5kID0gdGhpcy5vbihcInNlbGVjdFwiKS5iaW5kKHRoaXMpXG5cbiAgICAgIHRoaXMuX3NlbGVjdFxuICAgICAgICAub24oXCJjaGFuZ2VcIixmdW5jdGlvbih4KSB7IGJvdW5kKHRoaXMuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fKSB9KVxuXG4gICAgICB0aGlzLl9vcHRpb25zID0gZDNfc3BsYXQodGhpcy5fc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIixpZGVudGl0eSxrZXkpXG4gICAgICAgIC50ZXh0KGtleSlcbiAgICAgICAgLnByb3BlcnR5KFwic2VsZWN0ZWRcIiwgKHgpID0+IHgudmFsdWUgPT0gdGhpcy5fc2VsZWN0ZWQgPyBcInNlbGVjdGVkXCIgOiBudWxsKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzZWxlY3RlZDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlbGVjdGVkXCIsdmFsKVxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuL3NlbGVjdCdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmZ1bmN0aW9uIGluamVjdENzcyhjc3Nfc3RyaW5nKSB7XG4gIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI2hlYWRlci1jc3NcIixcInN0eWxlXCIpXG4gICAgLmF0dHIoXCJpZFwiLFwiaGVhZGVyLWNzc1wiKVxuICAgIC50ZXh0KENTU19TVFJJTkcucmVwbGFjZShcImZ1bmN0aW9uICgpIHsvKlwiLFwiXCIpLnJlcGxhY2UoXCIqL31cIixcIlwiKSlcbn1cblxuZnVuY3Rpb24gYnV0dG9uV3JhcCh3cmFwKSB7XG4gIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwLCBcImgzLmJ1dHRvbnNcIixcImgzXCIpXG4gICAgLmNsYXNzZWQoXCJidXR0b25zXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuXG4gIHZhciByaWdodF9wdWxsID0gZDNfdXBkYXRlYWJsZShoZWFkLFwiLnB1bGwtcmlnaHRcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcInB1bGwtcmlnaHQgaGVhZGVyLWJ1dHRvbnNcIiwgdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjE3cHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjJweFwiKVxuICAgIC5zdHlsZShcInRleHQtZGVjb3JhdGlvblwiLFwibm9uZSAhaW1wb3J0YW50XCIpXG5cbiAgcmV0dXJuIHJpZ2h0X3B1bGxcbn1cblxuZnVuY3Rpb24gZXhwYW5zaW9uV3JhcCh3cmFwKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHdyYXAsXCJkaXYuaGVhZGVyLWJvZHlcIixcImRpdlwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTNweFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJub25lXCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwibm9ybWFsXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjE3NXB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMjVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjI1cHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjE3NXB4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwid2hpdGVcIilcbiAgICAuY2xhc3NlZChcImhlYWRlci1ib2R5IGhpZGRlblwiLHRydWUpXG59XG5cbmZ1bmN0aW9uIGhlYWRXcmFwKHdyYXApIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUod3JhcCwgXCJoMy5kYXRhLWhlYWRlclwiLFwiaDNcIilcbiAgICAuY2xhc3NlZChcImRhdGEtaGVhZGVyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCIgYm9sZFwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiIDE0cHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiIDIycHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwiIHVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIgIzg4OFwiKVxuICAgIC5zdHlsZShcImxldHRlci1zcGFjaW5nXCIsXCIgLjA1ZW1cIilcblxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBIZWFkZXIodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcblxuICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuICAgIC5oZWFkZXItYnV0dG9ucyBhIHNwYW4uaG92ZXItc2hvdyB7IGRpc3BsYXk6bm9uZSB9XG4gICAgLmhlYWRlci1idXR0b25zIGE6aG92ZXIgc3Bhbi5ob3Zlci1zaG93IHsgZGlzcGxheTppbmxpbmU7IHBhZGRpbmctbGVmdDozcHggfVxuICAqL30pXG4gIFxufVxuXG5mdW5jdGlvbiBoZWFkZXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgSGVhZGVyKHRhcmdldClcbn1cblxuSGVhZGVyLnByb3RvdHlwZSA9IHtcbiAgICB0ZXh0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGV4dFwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgYnV0dG9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJ1dHRvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBleHBhbnNpb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJleHBhbnNpb25cIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCwgXCIuaGVhZGVyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImhlYWRlci13cmFwXCIsdHJ1ZSlcblxuICAgICAgdmFyIGV4cGFuZF93cmFwID0gZXhwYW5zaW9uV3JhcCh3cmFwKVxuICAgICAgICAsIGJ1dHRvbl93cmFwID0gYnV0dG9uV3JhcCh3cmFwKVxuICAgICAgICAsIGhlYWRfd3JhcCA9IGhlYWRXcmFwKHdyYXApXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaGVhZF93cmFwLFwic3Bhbi50aXRsZVwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAgICAgLnRleHQodGhpcy5fdGV4dClcblxuICAgICAgaWYgKHRoaXMuX29wdGlvbnMpIHtcblxuICAgICAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwic2VsZWN0XCIpLmJpbmQodGhpcylcblxuICAgICAgICB2YXIgc2VsZWN0Qm94ID0gc2VsZWN0KGhlYWRfd3JhcClcbiAgICAgICAgICAub3B0aW9ucyh0aGlzLl9vcHRpb25zKVxuICAgICAgICAgIC5vbihcInNlbGVjdFwiLGZ1bmN0aW9uKHgpIHsgYm91bmQoeCkgfSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgc2VsZWN0Qm94Ll9zZWxlY3RcbiAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTlweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMnB4XCIpXG4gICAgICAgICAgXG4gICAgICAgIHNlbGVjdEJveC5fb3B0aW9uc1xuICAgICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCIjODg4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxMDBweFwiKVxuICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjVweFwiKVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYnV0dG9ucykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgYSA9IGQzX3NwbGF0KGJ1dHRvbl93cmFwLFwiYVwiLFwiYVwiLHRoaXMuX2J1dHRvbnMsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGV4dCB9KVxuICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIycHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWRlY29yYXRpb25cIixcIm5vbmVcIilcbiAgICAgICAgICAuaHRtbCh4ID0+IFwiPHNwYW4gY2xhc3M9J1wiICsgeC5pY29uICsgXCInPjwvc3Bhbj48c3BhbiBzdHlsZT0ncGFkZGluZy1sZWZ0OjNweCc+XCIgKyB4LnRleHQgKyBcIjwvc3Bhbj5cIilcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIseCA9PiB4LmNsYXNzKVxuICAgICAgICAgIC5vbihcImNsaWNrXCIseCA9PiB0aGlzLm9uKHguY2xhc3MgKyBcIi5jbGlja1wiKSh4KSlcblxuXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuZXhwb3J0IGRlZmF1bHQgaGVhZGVyO1xuIiwiaW1wb3J0IGQzIGZyb20gJ2QzJztcblxuZnVuY3Rpb24gYWNjZXNzb3IoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWw7XG4gIHJldHVybiB0aGlzXG59XG5cbmZ1bmN0aW9uIGQzX3VwZGF0ZWFibGUodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCI7XG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gICk7XG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKTtcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5mdW5jdGlvbiBkM19zcGxhdCh0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIjtcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKTtcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpO1xuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmZ1bmN0aW9uIFRhYmxlKHRhcmdldCkge1xuICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuLnRhYmxlLXdyYXBwZXIgdHIgeyBoZWlnaHQ6MzNweH1cbi50YWJsZS13cmFwcGVyIHRyIHRoIHsgYm9yZGVyLXJpZ2h0OjFweCBkb3R0ZWQgI2NjYyB9IFxuLnRhYmxlLXdyYXBwZXIgdHIgdGg6bGFzdC1vZi10eXBlIHsgYm9yZGVyLXJpZ2h0Om5vbmUgfSBcblxuLnRhYmxlLXdyYXBwZXIgdHIgeyBib3JkZXItYm90dG9tOjFweCBzb2xpZCAjZGRkIH1cbi50YWJsZS13cmFwcGVyIHRyIHRoLCAudGFibGUtd3JhcHBlciB0ciB0ZCB7IFxuICBwYWRkaW5nLWxlZnQ6MTBweDtcbiAgbWF4LXdpZHRoOjIwMHB4XG59XG5cbi50YWJsZS13cmFwcGVyIHRoZWFkIHRyIHsgXG4gIGJhY2tncm91bmQtY29sb3I6I2UzZWJmMDtcbn1cbi50YWJsZS13cmFwcGVyIHRoZWFkIHRyIHRoIC50aXRsZSB7IFxuICB0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2Vcbn1cbi50YWJsZS13cmFwcGVyIHRib2R5IHRyIHsgXG59XG4udGFibGUtd3JhcHBlciB0Ym9keSB0cjpob3ZlciB7IFxuICBiYWNrZ3JvdW5kLWNvbG9yOndoaXRlO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiNmOWY5ZmJcbn1cbiAgKi99KTtcblxuICB0cnkge1xuICAgIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI3RhYmxlLWNzc1wiLFwic3R5bGVcIilcbiAgICAgIC5hdHRyKFwiaWRcIixcInRhYmxlLWNzc1wiKVxuICAgICAgLnRleHQoQ1NTX1NUUklORy5yZXBsYWNlKFwiZnVuY3Rpb24gKCkgey8qXCIsXCJcIikucmVwbGFjZShcIiovfVwiLFwiXCIpKTtcbiAgfSBjYXRjaChlKSB7XG4gIH1cblxuICB0aGlzLl90YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMuX2RhdGEgPSB7fTsvL0VYQU1QTEVfREFUQVxuICB0aGlzLl9zb3J0ID0ge307XG4gIHRoaXMuX3JlbmRlcmVycyA9IHt9O1xuICB0aGlzLl90b3AgPSAwO1xuXG4gIHRoaXMuX2RlZmF1bHRfcmVuZGVyZXIgPSBmdW5jdGlvbiAoeCkge1xuICAgIGlmICh4LmtleS5pbmRleE9mKFwicGVyY2VudFwiKSA+IC0xKSByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLnRleHQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgdmFyIHBkID0gdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fO1xuICAgICAgICByZXR1cm4gZDMuZm9ybWF0KFwiLjIlXCIpKHBkW3gua2V5XS8xMDApXG4gICAgICB9KVxuICAgXG4gICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzKS50ZXh0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICB2YXIgcGQgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX187XG4gICAgICByZXR1cm4gcGRbeC5rZXldID4gMCA/IGQzLmZvcm1hdChcIiwuMmZcIikocGRbeC5rZXldKS5yZXBsYWNlKFwiLjAwXCIsXCJcIikgOiBwZFt4LmtleV1cbiAgICB9KVxuICB9O1xuXG4gIHRoaXMuX2hpZGRlbl9maWVsZHMgPSBbXTtcbiAgdGhpcy5fb24gPSB7fTtcbiAgdGhpcy5fcmVuZGVyX2hlYWRlciA9IGZ1bmN0aW9uKHdyYXApIHtcblxuXG4gICAgd3JhcC5lYWNoKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHZhciBoZWFkZXJzID0gZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QodGhpcyksXCIuaGVhZGVyc1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGVhZGVyc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLWJvdHRvbVwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKTtcblxuICAgICAgaGVhZGVycy5odG1sKFwiXCIpO1xuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaGVhZGVycyxcIi51cmxcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInVybFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3NSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KFwiQXJ0aWNsZVwiKTtcblxuICAgICAgZDNfdXBkYXRlYWJsZShoZWFkZXJzLFwiLmNvdW50XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb3VudFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KFwiQ291bnRcIik7XG5cblxuICAgIH0pO1xuXG4gIH07XG4gIHRoaXMuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihyb3cpIHtcblxuICAgICAgZDNfdXBkYXRlYWJsZShyb3csXCIudXJsXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ1cmxcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNzUlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwiaGlkZGVuXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7cmV0dXJuIHgua2V5fSk7XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUocm93LFwiLmNvdW50XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb3VudFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCl7cmV0dXJuIHgudmFsdWV9KTtcblxuICB9O1xufVxuXG5mdW5jdGlvbiB0YWJsZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBUYWJsZSh0YXJnZXQpXG59XG5cblRhYmxlLnByb3RvdHlwZSA9IHtcblxuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkgeyBcbiAgICAgIHZhciB2YWx1ZSA9IGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKTsgXG4gICAgICBpZiAodmFsICYmIHZhbC52YWx1ZXMubGVuZ3RoICYmIHRoaXMuX2hlYWRlcnMgPT0gdW5kZWZpbmVkKSB7IFxuICAgICAgICB2YXIgaGVhZGVycyA9IE9iamVjdC5rZXlzKHZhbC52YWx1ZXNbMF0pLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB7a2V5OngsdmFsdWU6eH0gfSk7XG4gICAgICAgIHRoaXMuaGVhZGVycyhoZWFkZXJzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH1cbiAgLCBza2lwX29wdGlvbjogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2tpcF9vcHRpb25cIix2YWwpIH1cblxuICAsIHRpdGxlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfVxuICAsIHJvdzogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmVuZGVyX3Jvd1wiLHZhbCkgfVxuICAsIGRlZmF1bHRfcmVuZGVyZXI6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRlZmF1bHRfcmVuZGVyZXJcIix2YWwpIH1cbiAgLCB0b3A6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRvcFwiLHZhbCkgfVxuXG4gICwgaGVhZGVyOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyZW5kZXJfaGVhZGVyXCIsdmFsKSB9XG4gICwgaGVhZGVyczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVhZGVyc1wiLHZhbCkgfVxuICAsIGhpZGRlbl9maWVsZHM6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhpZGRlbl9maWVsZHNcIix2YWwpIH1cbiAgLCBhbGxfaGVhZGVyczogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaGVhZGVycyA9IHRoaXMuaGVhZGVycygpLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjLnZhbHVlOyByZXR1cm4gcH0se30pXG4gICAgICAgICwgaXNfbG9ja2VkID0gdGhpcy5oZWFkZXJzKCkuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuICEheC5sb2NrZWQgfSkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pO1xuXG4gICAgICBpZiAodGhpcy5fZGF0YS52YWx1ZXMgJiYgdGhpcy5fZGF0YS52YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgIFxuICAgICAgICB2YXIgYWxsX2hlYWRzID0gT2JqZWN0LmtleXModGhpcy5fZGF0YS52YWx1ZXNbMF0pLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgICAgIGlmICh0aGlzLl9oaWRkZW5fZmllbGRzICYmIHRoaXMuX2hpZGRlbl9maWVsZHMuaW5kZXhPZih4KSA+IC0xKSByZXR1cm4gZmFsc2VcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBrZXk6eFxuICAgICAgICAgICAgLCB2YWx1ZTpoZWFkZXJzW3hdIHx8IHhcbiAgICAgICAgICAgICwgc2VsZWN0ZWQ6ICEhaGVhZGVyc1t4XVxuICAgICAgICAgICAgLCBsb2NrZWQ6IChpc19sb2NrZWQuaW5kZXhPZih4KSA+IC0xID8gdHJ1ZSA6IHVuZGVmaW5lZCkgXG4gICAgICAgICAgfSBcbiAgICAgICAgfS5iaW5kKHRoaXMpKS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9KTtcbiAgICAgICAgdmFyIGdldEluZGV4ID0gZnVuY3Rpb24oaykge1xuICAgICAgICAgIHJldHVybiBpc19sb2NrZWQuaW5kZXhPZihrKSA+IC0xID8gaXNfbG9ja2VkLmluZGV4T2YoaykgKyAxMCA6IDBcbiAgICAgICAgfTtcblxuICAgICAgICBhbGxfaGVhZHMgPSBhbGxfaGVhZHMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGdldEluZGV4KGMua2V5IHx8IC1JbmZpbml0eSkgLSBnZXRJbmRleChwLmtleSB8fCAtSW5maW5pdHkpIH0pO1xuICAgICAgICByZXR1cm4gYWxsX2hlYWRzXG4gICAgICB9XG4gICAgICBlbHNlIHJldHVybiB0aGlzLmhlYWRlcnMoKVxuICAgIH1cbiAgLCBzb3J0OiBmdW5jdGlvbihrZXksYXNjZW5kaW5nKSB7XG4gICAgICBpZiAoIWtleSkgcmV0dXJuIHRoaXMuX3NvcnRcbiAgICAgIHRoaXMuX3NvcnQgPSB7XG4gICAgICAgICAga2V5OiBrZXlcbiAgICAgICAgLCB2YWx1ZTogISFhc2NlbmRpbmdcbiAgICAgIH07XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAsIHJlbmRlcl93cmFwcGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gdGhpcy5fdGFyZ2V0O1xuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi50YWJsZS13cmFwcGVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS13cmFwcGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcInJlbGF0aXZlXCIpO1xuXG5cbiAgICAgIHZhciB0YWJsZSA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcInRhYmxlLm1haW5cIixcInRhYmxlXCIpXG4gICAgICAgIC5jbGFzc2VkKFwibWFpblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpO1xuXG4gICAgICB0aGlzLl90YWJsZV9tYWluID0gdGFibGU7XG5cbiAgICAgIHZhciB0aGVhZCA9IGQzX3VwZGF0ZWFibGUodGFibGUsXCJ0aGVhZFwiLFwidGhlYWRcIik7XG4gICAgICBkM191cGRhdGVhYmxlKHRhYmxlLFwidGJvZHlcIixcInRib2R5XCIpO1xuXG5cblxuICAgICAgaWYgKCF0aGlzLl9za2lwX29wdGlvbikge1xuICAgICAgdmFyIHRhYmxlX2ZpeGVkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwidGFibGUuZml4ZWRcIixcInRhYmxlXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIHRydWUpIC8vIFRPRE86IG1ha2UgdGhpcyB2aXNpYmxlIHdoZW4gbWFpbiBpcyBub3QgaW4gdmlld1xuICAgICAgICAuY2xhc3NlZChcImZpeGVkXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIix3cmFwcGVyLnN0eWxlKFwid2lkdGhcIikpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLHRoaXMuX3RvcCArIFwicHhcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpO1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB0cnkge1xuICAgICAgZDMuc2VsZWN0KHdpbmRvdykub24oJ3Njcm9sbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyh0YWJsZS5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wLCBzZWxmLl90b3ApO1xuICAgICAgICBpZiAodGFibGUubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCA8IHNlbGYuX3RvcCkgdGFibGVfZml4ZWQuY2xhc3NlZChcImhpZGRlblwiLGZhbHNlKTtcbiAgICAgICAgZWxzZSB0YWJsZV9maXhlZC5jbGFzc2VkKFwiaGlkZGVuXCIsdHJ1ZSk7XG5cbiAgICAgICAgdmFyIHdpZHRocyA9IFtdO1xuXG4gICAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLm1haW5cIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwiLnRhYmxlLWhlYWRlcnNcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwidGhcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgIHdpZHRocy5wdXNoKHRoaXMub2Zmc2V0V2lkdGgpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLmZpeGVkXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcIi50YWJsZS1oZWFkZXJzXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcInRoXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoXCJ3aWR0aFwiLHdpZHRoc1tpXSArIFwicHhcIik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgfSk7XG4gICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgXG5cbiAgICAgIHRoaXMuX3RhYmxlX2ZpeGVkID0gdGFibGVfZml4ZWQ7XG5cblxuICAgICAgdmFyIHRoZWFkID0gZDNfdXBkYXRlYWJsZSh0YWJsZV9maXhlZCxcInRoZWFkXCIsXCJ0aGVhZFwiKTtcblxuICAgICAgdmFyIHRhYmxlX2J1dHRvbiA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcIi50YWJsZS1vcHRpb25cIixcImFcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS1vcHRpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsXCItMXB4XCIpXG4gICAgICAgIC5zdHlsZShcInJpZ2h0XCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctcmlnaHRcIixcIjhweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjhweFwiKVxuICAgICAgICAudGV4dChcIk9QVElPTlNcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIsIXRoaXMuX29wdGlvbnNfaGVhZGVyLmNsYXNzZWQoXCJoaWRkZW5cIikpO1xuICAgICAgICAgIHRoaXMuX3Nob3dfb3B0aW9ucyA9ICF0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIpO1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gd3JhcHBlclxuICAgIH0gIFxuICAsIHJlbmRlcl9oZWFkZXI6IGZ1bmN0aW9uKHRhYmxlKSB7XG5cbiAgICAgIHZhciB0aGVhZCA9IHRhYmxlLnNlbGVjdEFsbChcInRoZWFkXCIpXG4gICAgICAgICwgdGJvZHkgPSB0YWJsZS5zZWxlY3RBbGwoXCJ0Ym9keVwiKTtcblxuICAgICAgaWYgKHRoaXMuaGVhZGVycygpID09IHVuZGVmaW5lZCkgcmV0dXJuXG5cbiAgICAgIHZhciBvcHRpb25zX3RoZWFkID0gZDNfdXBkYXRlYWJsZSh0aGVhZCxcInRyLnRhYmxlLW9wdGlvbnNcIixcInRyXCIsdGhpcy5hbGxfaGVhZGVycygpLGZ1bmN0aW9uKHgpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsICF0aGlzLl9zaG93X29wdGlvbnMpXG4gICAgICAgIC5jbGFzc2VkKFwidGFibGUtb3B0aW9uc1wiLHRydWUpO1xuXG4gICAgICB2YXIgaCA9IHRoaXMuX3NraXBfb3B0aW9uID8gdGhpcy5oZWFkZXJzKCkgOiB0aGlzLmhlYWRlcnMoKS5jb25jYXQoW3trZXk6XCJzcGFjZXJcIiwgd2lkdGg6XCI3MHB4XCJ9XSk7XG4gICAgICB2YXIgaGVhZGVyc190aGVhZCA9IGQzX3VwZGF0ZWFibGUodGhlYWQsXCJ0ci50YWJsZS1oZWFkZXJzXCIsXCJ0clwiLGgsZnVuY3Rpb24oeCl7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS1oZWFkZXJzXCIsdHJ1ZSk7XG5cblxuICAgICAgdmFyIHRoID0gZDNfc3BsYXQoaGVhZGVyc190aGVhZCxcInRoXCIsXCJ0aFwiLGZhbHNlLGZ1bmN0aW9uKHgsaSkge3JldHVybiB4LmtleSArIGkgfSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LndpZHRoIH0pXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJyZWxhdGl2ZVwiKVxuICAgICAgICAub3JkZXIoKTtcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHRoLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgfSlcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKHguc29ydCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB4Wydzb3J0J107XG4gICAgICAgICAgICB0aGlzLl9zb3J0ID0ge307XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeC5zb3J0ID0gISF4LnNvcnQ7XG5cbiAgICAgICAgICAgIHRoaXMuc29ydCh4LmtleSx4LnNvcnQpO1xuICAgICAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgICBkM191cGRhdGVhYmxlKHRoLFwiaVwiLFwiaVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuY2xhc3NlZChcImZhXCIsdHJ1ZSlcbiAgICAgICAgLmNsYXNzZWQoXCJmYS1zb3J0LWFzY1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiAoeC5rZXkgPT0gdGhpcy5fc29ydC5rZXkpID8gdGhpcy5fc29ydC52YWx1ZSA9PT0gdHJ1ZSA6IHVuZGVmaW5lZCB9LmJpbmQodGhpcykpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEtc29ydC1kZXNjXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuICh4LmtleSA9PSB0aGlzLl9zb3J0LmtleSkgPyB0aGlzLl9zb3J0LnZhbHVlID09PSBmYWxzZSA6IHVuZGVmaW5lZCB9LmJpbmQodGhpcykpO1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2FuX3JlZHJhdyA9IHRydWU7XG5cbiAgICAgIHZhciBkcmFnID0gZDMuYmVoYXZpb3IuZHJhZygpXG4gICAgICAgIC5vbihcImRyYWdcIiwgZnVuY3Rpb24oZCxpKSB7XG4gICAgICAgICAgICB2YXIgeCA9IGQzLmV2ZW50LmR4O1xuICAgICAgICAgICAgdmFyIHcgPSBwYXJzZUludChkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zdHlsZShcIndpZHRoXCIpLnJlcGxhY2UoXCJweFwiKSk7XG4gICAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuX19kYXRhX18ud2lkdGggPSAodyt4KStcInB4XCI7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zdHlsZShcIndpZHRoXCIsICh3K3gpK1wicHhcIik7XG5cbiAgICAgICAgICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLDApLmluZGV4T2YodGhpcy5wYXJlbnROb2RlKSArIDE7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW5baW5kZXhdKS5zdHlsZShcIndpZHRoXCIsdW5kZWZpbmVkKTtcblxuICAgICAgICAgICAgaWYgKGNhbl9yZWRyYXcpIHtcbiAgICAgICAgICAgICAgY2FuX3JlZHJhdyA9IGZhbHNlO1xuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNhbl9yZWRyYXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgICB2YXIgcmVuZGVyID0gc2VsZi5fcmVuZGVyZXJzW3gua2V5XTtcbiAgICAgICAgICAgICAgICAgIGlmIChyZW5kZXIpIHJlbmRlci5iaW5kKHRoaXMpKHgpO1xuICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgIH0sMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG5cbiAgICAgIHZhciBkcmFnZ2FibGUgPSBkM191cGRhdGVhYmxlKHRoLFwiYlwiLFwiYlwiKVxuICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIiwgXCJldy1yZXNpemVcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsIFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIiwgXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsIFwiYWJzb2x1dGVcIilcbiAgICAgICAgLnN0eWxlKFwicmlnaHRcIiwgXCItOHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLCBcIjBcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIiwgXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIiwgMSlcbiAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgdmFyIGluZGV4ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW4sMCkuaW5kZXhPZih0aGlzLnBhcmVudE5vZGUpICsgMTtcbiAgICAgICAgICAgdGJvZHkuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bnRoLW9mLXR5cGUoXCIgKyBpbmRleCArIFwiKVwiKS5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IGRvdHRlZCAjY2NjXCIpO1xuICAgICAgICB9KVxuICAgICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLDApLmluZGV4T2YodGhpcy5wYXJlbnROb2RlKSArIDE7XG4gICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuc3R5bGUoXCJib3JkZXItcmlnaHRcIix1bmRlZmluZWQpO1xuICAgICAgICB9KVxuICAgICAgICAuY2FsbChkcmFnKTtcblxuICAgICAgdGguZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICBpZiAoIXRoaXMuX3NraXBfb3B0aW9uKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IGQzX3VwZGF0ZWFibGUob3B0aW9uc190aGVhZCxcInRoXCIsXCJ0aFwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5hdHRyKFwiY29sc3BhblwiLHRoaXMuaGVhZGVycygpLmxlbmd0aCsxKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgIHZhciBvcHRpb24gPSBkM19zcGxhdChvcHRpb25zLFwiLm9wdGlvblwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJvcHRpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpO1xuXG5cbiAgICAgIG9wdGlvbi5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgZDNfdXBkYXRlYWJsZShvcHRpb24sXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgICAucHJvcGVydHkoXCJjaGVja2VkXCIsZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgICB0aGlzLmNoZWNrZWQgPSB4LnNlbGVjdGVkO1xuICAgICAgICAgIHJldHVybiB4LnNlbGVjdGVkID8gXCJjaGVja2VkXCIgOiB1bmRlZmluZWQgXG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKFwiZGlzYWJsZWRcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LmxvY2tlZCB9KVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgeC5zZWxlY3RlZCA9IHRoaXMuY2hlY2tlZDtcbiAgICAgICAgICBpZiAoeC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgc2VsZi5oZWFkZXJzKCkucHVzaCh4KTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmRyYXcoKVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgaW5kaWNlcyA9IHNlbGYuaGVhZGVycygpLm1hcChmdW5jdGlvbih6LGkpIHsgcmV0dXJuIHoua2V5ID09IHgua2V5ID8gaSA6IHVuZGVmaW5lZCAgfSkgXG4gICAgICAgICAgICAsIGluZGV4ID0gaW5kaWNlcy5maWx0ZXIoZnVuY3Rpb24oeikgeyByZXR1cm4geiB9KSB8fCAwO1xuXG4gICAgICAgICAgc2VsZi5oZWFkZXJzKCkuc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICAgIHNlbGYuZHJhdygpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICBkM191cGRhdGVhYmxlKG9wdGlvbixcInNwYW5cIixcInNwYW5cIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4gXCIgXCIgKyB4LnZhbHVlIH0pO1xuXG4gICAgIH1cblxuXG4gICAgIHRoaXMuX29wdGlvbnNfaGVhZGVyID0gdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcIi50YWJsZS1vcHRpb25zXCIpO1xuICAgIH1cbiAgXG4gICwgcmVuZGVyX3Jvd3M6IGZ1bmN0aW9uKHRhYmxlKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciB0Ym9keSA9IHRhYmxlLnNlbGVjdEFsbChcInRib2R5XCIpO1xuXG4gICAgICBpZiAodGhpcy5oZWFkZXJzKCkgPT0gdW5kZWZpbmVkKSByZXR1cm5cbiAgICAgIGlmICghKHRoaXMuX2RhdGEgJiYgdGhpcy5fZGF0YS52YWx1ZXMgJiYgdGhpcy5fZGF0YS52YWx1ZXMubGVuZ3RoKSkgcmV0dXJuXG5cbiAgICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YS52YWx1ZXNcbiAgICAgICAgLCBzb3J0YnkgPSB0aGlzLl9zb3J0IHx8IHt9O1xuXG4gICAgICBjb25zb2xlLmVycm9yKGRhdGEpO1xuXG4gICAgICBkYXRhID0gZGF0YS5zb3J0KGZ1bmN0aW9uKHAsYykge1xuICAgICAgICB2YXIgYSA9IHBbc29ydGJ5LmtleV0gfHwgLUluZmluaXR5XG4gICAgICAgICAgLCBiID0gY1tzb3J0Ynkua2V5XSB8fCAtSW5maW5pdHk7XG5cbiAgICAgICAgcmV0dXJuIHNvcnRieS52YWx1ZSA/IGQzLmFzY2VuZGluZyhhLGIpIDogZDMuZGVzY2VuZGluZyhhLGIpXG4gICAgICB9KTtcblxuICAgICAgdmFyIHJvd3MgPSBkM19zcGxhdCh0Ym9keSxcInRyXCIsXCJ0clwiLGRhdGEsZnVuY3Rpb24oeCxpKXsgcmV0dXJuIFN0cmluZyhzb3J0Ynkua2V5ICsgeFtzb3J0Ynkua2V5XSkgKyBpIH0pXG4gICAgICAgIC5vcmRlcigpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHNlbGYub24oXCJleHBhbmRcIikuYmluZCh0aGlzKSh4KTtcbiAgICAgICAgfSk7XG5cbiAgICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICB2YXIgdGQgPSBkM19zcGxhdChyb3dzLFwidGRcIixcInRkXCIsdGhpcy5oZWFkZXJzKCksZnVuY3Rpb24oeCxpKSB7cmV0dXJuIHgua2V5ICsgaSB9KVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpO1xuXG4gICAgICAgICAgdmFyIHJlbmRlcmVyID0gc2VsZi5fcmVuZGVyZXJzW3gua2V5XTtcblxuICAgICAgICAgIGlmICghcmVuZGVyZXIpIHsgXG4gICAgICAgICAgICByZW5kZXJlciA9IHNlbGYuX2RlZmF1bHRfcmVuZGVyZXIuYmluZCh0aGlzKSh4KTsgXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiByZW5kZXJlci5iaW5kKHRoaXMpKHgpXG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgXG5cbiAgICAgIHRkLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgICAgdmFyIG8gPSBkM191cGRhdGVhYmxlKHJvd3MsXCJ0ZC5vcHRpb24taGVhZGVyXCIsXCJ0ZFwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwib3B0aW9uLWhlYWRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKTtcbiBcbiAgICAgIGlmICh0aGlzLl9za2lwX29wdGlvbikgby5jbGFzc2VkKFwiaGlkZGVuXCIsdHJ1ZSk7IFxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUobyxcImFcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLmh0bWwoc2VsZi5vcHRpb25fdGV4dCgpKTtcbiAgICAgICAgXG5cblxuXG4gICAgfVxuICAsIG9wdGlvbl90ZXh0OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25fdGV4dFwiLHZhbCkgfVxuICAsIHJlbmRlcjogZnVuY3Rpb24oayxmbikge1xuICAgICAgaWYgKGZuID09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX3JlbmRlcmVyc1trXSB8fCBmYWxzZVxuICAgICAgdGhpcy5fcmVuZGVyZXJzW2tdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciB3cmFwcGVyID0gdGhpcy5yZW5kZXJfd3JhcHBlcigpO1xuXG4gICAgICB3cmFwcGVyLnNlbGVjdEFsbChcInRhYmxlXCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgc2VsZi5yZW5kZXJfaGVhZGVyKGQzLnNlbGVjdCh0aGlzKSk7IFxuICAgICAgICB9KTtcblxuICAgICAgdGhpcy5yZW5kZXJfcm93cyh0aGlzLl90YWJsZV9tYWluKTtcblxuICAgICAgcmV0dXJuIHRoaXNcblxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkMzogZDNcbn07XG5cbmV4cG9ydCB7IHRhYmxlLCB0YWJsZSBhcyB0IH07ZXhwb3J0IGRlZmF1bHQgdGFibGU7XG4iLCIvL2ltcG9ydCBkMyBmcm9tICdkMydcblxuZnVuY3Rpb24gZDNfdXBkYXRlYWJsZSh0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIjtcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGZ1bmN0aW9uKHgpe3JldHVybiBkYXRhID8gW2RhdGFdIDogW3hdfSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIFt4XX1cbiAgKTtcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpO1xuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmZ1bmN0aW9uIGQzX3NwbGF0KHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiO1xuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZGF0YSB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fVxuICApO1xuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSk7XG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuXG52YXIgdHlwZXdhdGNoID0gKGZ1bmN0aW9uKCl7XG4gIHZhciB0aW1lciA9IDA7XG4gIHJldHVybiBmdW5jdGlvbihjYWxsYmFjaywgbXMpe1xuICAgIGNsZWFyVGltZW91dCAodGltZXIpO1xuICAgIHRpbWVyID0gc2V0VGltZW91dChjYWxsYmFjaywgbXMpO1xuICB9O1xufSkoKTtcblxuXG5cbmZ1bmN0aW9uIEZpbHRlcih0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLl9kYXRhID0gZmFsc2U7XG4gIHRoaXMuX29uID0ge307XG4gIHRoaXMuX3JlbmRlcl9vcCA9IHt9O1xufVxuXG5mdW5jdGlvbiBmaWx0ZXIkMih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBGaWx0ZXIodGFyZ2V0KVxufVxuXG5GaWx0ZXIucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLmZpbHRlcnMtd3JhcHBlclwiLFwiZGl2XCIsdGhpcy5kYXRhKCksZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXJzLXdyYXBwZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIiwgXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctcmlnaHRcIiwgXCIyMHB4XCIpO1xuXG4gICAgICB2YXIgZmlsdGVycyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5maWx0ZXJzXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXJzXCIsdHJ1ZSk7XG4gICAgICBcbiAgICAgIHZhciBmaWx0ZXIgPSBkM19zcGxhdChmaWx0ZXJzLFwiLmZpbHRlclwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSArIHguZmllbGQgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKTtcblxuICAgICAgZmlsdGVyLmV4aXQoKS5yZW1vdmUoKTtcbiAgICAgIFxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgZmlsdGVyLmVhY2goZnVuY3Rpb24odixwb3MpIHtcbiAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgICBzZWxmLmZpbHRlclJvdyhkdGhpcywgc2VsZi5fZmllbGRzLCBzZWxmLl9vcHMsIHYpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHRoaXMuZmlsdGVyRm9vdGVyKHdyYXApO1xuXG4gICAgICByZXR1cm4gdGhpc1xuICAgICAgXG4gICAgfVxuICAsIG9wczogZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29wc1xuICAgICAgdGhpcy5fb3BzID0gZDtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGZpZWxkczogZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2ZpZWxkc1xuICAgICAgdGhpcy5fZmllbGRzID0gZDtcbiAgICAgIHJldHVybiB0aGlzXG4gIFx0fVxuICAsIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9kYXRhXG4gICAgICB0aGlzLl9kYXRhID0gZDtcbiAgICAgIHJldHVybiB0aGlzXG4gIFx0fVxuICAsIHRleHQ6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2ZuIHx8IGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgfVxuICAgICAgdGhpcy5fZm4gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHJlbmRlcl9vcDogZnVuY3Rpb24ob3AsZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fcmVuZGVyX29wW29wXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgdGhpcy5fcmVuZGVyX29wW29wXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGJ1aWxkT3A6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgdmFyIG9wID0gb2JqLm9wXG4gICAgICAgICwgZmllbGQgPSBvYmouZmllbGRcbiAgICAgICAgLCB2YWx1ZSA9IG9iai52YWx1ZTtcbiAgICBcbiAgICAgIGlmICggW29wLGZpZWxkLHZhbHVlXS5pbmRleE9mKHVuZGVmaW5lZCkgPiAtMSkgcmV0dXJuIGZ1bmN0aW9uKCkge3JldHVybiB0cnVlfVxuICAgIFxuICAgICAgcmV0dXJuIHRoaXMuX29wc1tvcF0oZmllbGQsIHZhbHVlKVxuICAgIH1cbiAgLCBmaWx0ZXJSb3c6IGZ1bmN0aW9uKF9maWx0ZXIsIGZpZWxkcywgb3BzLCB2YWx1ZSkge1xuICAgIFxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgcmVtb3ZlID0gZDNfdXBkYXRlYWJsZShfZmlsdGVyLFwiLnJlbW92ZVwiLFwiYVwiKVxuICAgICAgICAuY2xhc3NlZChcInJlbW92ZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJyaWdodFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuaHRtbChcIiYjMTAwMDU7XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBuZXdfZGF0YSA9IHNlbGYuZGF0YSgpLmZpbHRlcihmdW5jdGlvbihmKSB7IHJldHVybiBmICE9PSB4IH0pO1xuICAgICAgICAgIHNlbGYuZGF0YShuZXdfZGF0YSk7XG4gICAgICAgICAgc2VsZi5kcmF3KCk7XG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgIHZhciBmaWx0ZXIgPSBkM191cGRhdGVhYmxlKF9maWx0ZXIsXCIuaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSk7XG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcInNlbGVjdC5maWVsZFwiLFwic2VsZWN0XCIsZmllbGRzKVxuICAgICAgICAuY2xhc3NlZChcImZpZWxkXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE2NXB4XCIpXG4gICAgICAgIC5vbihcImNoYW5nZVwiLCBmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICB2YWx1ZS5maWVsZCA9IHRoaXMuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhciBwb3MgPSAwO1xuICAgICAgICAgIGZpZWxkcy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICBpZiAoeCA9PSB2YWx1ZS5maWVsZCkgcG9zID0gaTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBzZWxlY3RlZCA9IG9wc1twb3NdLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSA9PSB2YWx1ZS5vcCB9KTtcbiAgICAgICAgICBpZiAoc2VsZWN0ZWQubGVuZ3RoID09IDApIHZhbHVlLm9wID0gb3BzW3Bvc11bMF0ua2V5O1xuICAgICAgICAgIC8vdmFsdWUuZm4gPSBzZWxmLmJ1aWxkT3AodmFsdWUpXG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSk7XG5cbiAgICAgICAgICBcbiAgICAgICAgICBcbiAgICAgICAgICBzZWxmLmRyYXdPcHMoZmlsdGVyLCBvcHNbcG9zXSwgdmFsdWUsIHBvcyk7XG4gICAgICAgIH0pO1xuICAgICAgXG4gICAgICBkM191cGRhdGVhYmxlKHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIpXG4gICAgICAgIC5wcm9wZXJ0eShcImRpc2FibGVkXCIgLHRydWUpXG4gICAgICAgIC5wcm9wZXJ0eShcImhpZGRlblwiLCB0cnVlKVxuICAgICAgICAudGV4dChcIkZpbHRlci4uLlwiKTtcblxuICAgICAgXG4gICAgICBkM19zcGxhdChzZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4IH0pXG4gICAgICAgIC5hdHRyKFwic2VsZWN0ZWRcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geCA9PSB2YWx1ZS5maWVsZCA/IFwic2VsZWN0ZWRcIiA6IHVuZGVmaW5lZCB9KTtcblxuICAgICAgaWYgKHZhbHVlLm9wICYmIHZhbHVlLmZpZWxkICYmIHZhbHVlLnZhbHVlKSB7XG4gICAgICAgIHZhciBwb3MgPSBmaWVsZHMuaW5kZXhPZih2YWx1ZS5maWVsZCk7XG4gICAgICAgIHNlbGYuZHJhd09wcyhmaWx0ZXIsIG9wc1twb3NdLCB2YWx1ZSwgcG9zKTtcbiAgICAgIH1cblxuXG4gICAgfVxuICAsIGRyYXdPcHM6IGZ1bmN0aW9uKGZpbHRlciwgb3BzLCB2YWx1ZSkge1xuXG4gICAgICBcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJzZWxlY3Qub3BcIixcInNlbGVjdFwiLGZhbHNlLCBmdW5jdGlvbih4KSB7cmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcIm9wXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgdmFsdWUub3AgPSB0aGlzLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXk7XG4gICAgICAgICAgLy92YWx1ZS5mbiA9IHNlbGYuYnVpbGRPcCh2YWx1ZSlcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcbiAgICAgICAgICBzZWxmLmRyYXdJbnB1dChmaWx0ZXIsIHZhbHVlLCB2YWx1ZS5vcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAvL3ZhciBkZmx0ID0gW3tcImtleVwiOlwiU2VsZWN0IE9wZXJhdGlvbi4uLlwiLFwiZGlzYWJsZWRcIjp0cnVlLFwiaGlkZGVuXCI6dHJ1ZX1dXG5cbiAgICAgIHZhciBuZXdfb3BzID0gb3BzOyAvL2RmbHQuY29uY2F0KG9wcylcblxuICAgICAgdmFsdWUub3AgPSB2YWx1ZS5vcCB8fCBuZXdfb3BzWzBdLmtleTtcblxuICAgICAgdmFyIG9wcyA9IGQzX3NwbGF0KHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIsbmV3X29wcyxmdW5jdGlvbih4KXtyZXR1cm4geC5rZXl9KVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleS5zcGxpdChcIi5cIilbMF0gfSkgXG4gICAgICAgIC5hdHRyKFwic2VsZWN0ZWRcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgPT0gdmFsdWUub3AgPyBcInNlbGVjdGVkXCIgOiB1bmRlZmluZWQgfSk7XG5cbiAgICAgIG9wcy5leGl0KCkucmVtb3ZlKCk7XG4gICAgICBzZWxmLmRyYXdJbnB1dChmaWx0ZXIsIHZhbHVlLCB2YWx1ZS5vcCk7XG5cbiAgICB9XG4gICwgZHJhd0lucHV0OiBmdW5jdGlvbihmaWx0ZXIsIHZhbHVlLCBvcCkge1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIudmFsdWVcIikucmVtb3ZlKCk7XG4gICAgICB2YXIgciA9IHRoaXMuX3JlbmRlcl9vcFtvcF07XG5cbiAgICAgIGlmIChyKSB7XG4gICAgICAgIHJldHVybiByLmJpbmQodGhpcykoZmlsdGVyLHZhbHVlKVxuICAgICAgfVxuXG4gICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0LnZhbHVlXCIsXCJpbnB1dFwiKVxuICAgICAgICAuY2xhc3NlZChcInZhbHVlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMWVtXCIpXG5cbiAgICAgICAgLmF0dHIoXCJ2YWx1ZVwiLCB2YWx1ZS52YWx1ZSlcbiAgICAgICAgLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgdmFyIHQgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgICB0eXBld2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHQudmFsdWU7XG4gICAgICAgICAgICAvL3ZhbHVlLmZuID0gc2VsZi5idWlsZE9wKHZhbHVlKVxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSk7XG4gICAgICAgICAgfSwxMDAwKTtcbiAgICAgICAgfSk7XG4gICAgXG4gICAgfVxuICAsIGZpbHRlckZvb3RlcjogZnVuY3Rpb24od3JhcCkge1xuICAgICAgdmFyIGZvb3RlciA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5maWx0ZXItZm9vdGVyXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXItZm9vdGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIxMHB4XCIpO1xuXG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShmb290ZXIsXCIuYWRkXCIsXCJhXCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiYWRkXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLmh0bWwoXCImIzY1MjkxO1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlci1yYWRpdXNcIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxLjVweCBzb2xpZCAjNDI4QkNDXCIpXG4gICAgICAgIC5zdHlsZShcImN1cnNvclwiLFwicG9pbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgXG4gICAgICAgICAgdmFyIGQgPSBzZWxmLl9kYXRhO1xuICAgICAgICAgIGlmIChkLmxlbmd0aCA9PSAwIHx8IE9iamVjdC5rZXlzKGQuc2xpY2UoLTEpKS5sZW5ndGggPiAwKSBkLnB1c2goe30pO1xuICAgICAgICAgIHNlbGYuZHJhdygpO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgLCB0eXBld2F0Y2g6IHR5cGV3YXRjaFxufTtcblxuZnVuY3Rpb24gYWNjZXNzb3IkMShhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbDtcbiAgcmV0dXJuIHRoaXNcbn1cblxuZnVuY3Rpb24gRmlsdGVyRGF0YShkYXRhKSB7XG4gIHRoaXMuX2RhdGEgPSBkYXRhO1xuICB0aGlzLl9sID0gXCJvclwiO1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJfZGF0YShkYXRhKSB7XG4gIHJldHVybiBuZXcgRmlsdGVyRGF0YShkYXRhKVxufVxuXG5GaWx0ZXJEYXRhLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yJDEuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH1cbiAgLCBsb2dpYzogZnVuY3Rpb24obCkge1xuICAgICAgaWYgKGwgPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fbFxuICAgICAgdGhpcy5fbCA9IChsID09IFwiYW5kXCIpID8gXCJhbmRcIiA6IFwib3JcIjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9wOiBmdW5jdGlvbihvcCwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb3BzW29wXSB8fCB0aGlzLl9vcHNbXCJlcXVhbHNcIl07XG4gICAgICB0aGlzLl9vcHNbb3BdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuXG4gICAgfVxuICAsIGJ5OiBmdW5jdGlvbihiKSB7XG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgICAsIGZpbHRlciA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIGlmIChiLmxlbmd0aCA9PSAwKSByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbWFzayA9IGIubWFwKGZ1bmN0aW9uKHopIHtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHZhciBzcGxpdCA9IHouZmllbGQuc3BsaXQoXCIuXCIpLCBmaWVsZCA9IHNwbGl0LnNsaWNlKC0xKVswXVxuICAgICAgICAgICAgICAgICwgb2JqID0gc3BsaXQuc2xpY2UoMCwtMSkucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcFtjXSB9LHgpXG4gICAgICAgICAgICAgICAgLCBvc3BsaXQgPSB6Lm9wLnNwbGl0KFwiLlwiKSwgb3AgPSBvc3BsaXRbMF07XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICByZXR1cm4gc2VsZi5vcChvcCkoZmllbGQsei52YWx1ZSkob2JqKVxuICAgICAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geCB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNlbGYuX2wgPT0gXCJhbmRcIikgcmV0dXJuIG1hc2subGVuZ3RoID09IGIubGVuZ3RoXG4gICAgICAgICAgICByZXR1cm4gbWFzay5sZW5ndGggPiAwXG4gICAgICAgICAgfTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHRoaXMuX2RhdGEuZmlsdGVyKGZpbHRlcilcblxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgX29wczoge1xuICAgICAgICBcImVxdWFsc1wiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkgPT0gU3RyaW5nKHZhbHVlKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuLy8gICAgICAsIFwiY29udGFpbnNcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4vLyAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuLy8gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTFcbi8vICAgICAgICAgIH1cbi8vICAgICAgICB9XG4gICAgICAsIFwic3RhcnRzIHdpdGhcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPT0gMFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImVuZHMgd2l0aFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIChTdHJpbmcoeFtmaWVsZF0pLmxlbmd0aCAtIFN0cmluZyh2YWx1ZSkubGVuZ3RoKSA9PSBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJkb2VzIG5vdCBlcXVhbFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkgIT0gU3RyaW5nKHZhbHVlKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImlzIHNldFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4W2ZpZWxkXSAhPSB1bmRlZmluZWQpICYmICh4W2ZpZWxkXSAhPSBcIlwiKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImlzIG5vdCBzZXRcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4W2ZpZWxkXSA9PSB1bmRlZmluZWRcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJiZXR3ZWVuXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeFtmaWVsZF0pID49IHZhbHVlWzBdICYmIHBhcnNlSW50KHhbZmllbGRdKSA8PSB2YWx1ZVsxXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImlzIGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPiAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgICAgLCBcImlzIG5vdCBpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xIH0sIDApID09IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAsIFwiZG9lcyBub3QgY29udGFpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUudG9Mb3dlckNhc2UoKS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkudG9Mb3dlckNhc2UoKSkgPiAtMSB9LCAwKSA9PSAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgICAgLCBcImNvbnRhaW5zXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKS50b0xvd2VyQ2FzZSgpKSA+IC0xIH0sIDApID4gMFxuICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgdmVyc2lvbiA9IFwiMC4wLjFcIjtcblxuZXhwb3J0IHsgdmVyc2lvbiwgZmlsdGVyJDIgYXMgZmlsdGVyLCBmaWx0ZXJfZGF0YSB9O1xuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQge2ZpbHRlcn0gZnJvbSAnZmlsdGVyJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIEZpbHRlclZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG5cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5fZmlsdGVyX29wdGlvbnMgPSB7XG4gICAgICBcIkNhdGVnb3J5XCI6IFwicGFyZW50X2NhdGVnb3J5X25hbWVcIlxuICAgICwgXCJUaXRsZVwiOiBcInVybFwiXG4gICAgLCBcIlRpbWVcIjogXCJob3VyXCJcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmaWx0ZXJfdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBGaWx0ZXJWaWV3KHRhcmdldClcbn1cblxuRmlsdGVyVmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBsb2dpYzogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljXCIsdmFsKSBcbiAgICB9XG4gICwgY2F0ZWdvcmllczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNhdGVnb3JpZXNcIix2YWwpIFxuICAgIH1cbiAgLCBmaWx0ZXJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZmlsdGVyc1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuZmlsdGVyLXdyYXBcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCl7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXItd3JhcFwiLHRydWUpXG5cbiAgICAgIGhlYWRlcih3cmFwcGVyKVxuICAgICAgICAudGV4dChcIkZpbHRlclwiKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIHZhciBzdWJ0aXRsZSA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCIuc3VidGl0bGUtZmlsdGVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzdWJ0aXRsZS1maWx0ZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcIiB1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcIiBib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIgMzNweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIgI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgXG4gICAgICBkM191cGRhdGVhYmxlKHN1YnRpdGxlLFwic3Bhbi5maXJzdFwiLFwic3BhblwiKVxuICAgICAgICAudGV4dChcIlVzZXJzIG1hdGNoaW5nIFwiIClcbiAgICAgICAgLmNsYXNzZWQoXCJmaXJzdFwiLHRydWUpXG4gICAgXG4gICAgICB2YXIgZmlsdGVyX3R5cGUgID0gZDNfdXBkYXRlYWJsZShzdWJ0aXRsZSxcInNwYW4ubWlkZGxlXCIsXCJzcGFuXCIpXG4gICAgICAgIC5jbGFzc2VkKFwibWlkZGxlXCIsdHJ1ZSlcbiAgICBcbiAgICAgIHNlbGVjdChmaWx0ZXJfdHlwZSlcbiAgICAgICAgLm9wdGlvbnModGhpcy5sb2dpYygpKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHRoaXMubG9naWMoKS5tYXAoZnVuY3Rpb24oeSkgeyBcbiAgICAgICAgICAgIHkuc2VsZWN0ZWQgPSAoeS5rZXkgPT0geC5rZXkpXG4gICAgICAgICAgfSlcbiAgICAgICAgICB0aGlzLm9uKFwibG9naWMuY2hhbmdlXCIpKHRoaXMubG9naWMoKSlcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAuZHJhdygpXG4gICAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoc3VidGl0bGUsXCJzcGFuLmxhc3RcIixcInNwYW5cIilcbiAgICAgICAgLnRleHQoXCIgb2YgdGhlIGZvbGxvd2luZzpcIilcbiAgICAgICAgLmNsYXNzZWQoXCJsYXN0XCIsdHJ1ZSlcblxuXG4gICAgICAvLyAtLS0tLS0tLSBDQVRFR09SSUVTIC0tLS0tLS0tLSAvL1xuXG4gICAgICB2YXIgY2F0ZWdvcmllcyA9IHRoaXMuY2F0ZWdvcmllcygpXG4gICAgICB2YXIgZmlsdGVyX2NoYW5nZSA9IHRoaXMub24oXCJmaWx0ZXIuY2hhbmdlXCIpLmJpbmQodGhpcylcblxuICAgICAgZnVuY3Rpb24gc2VsZWN0aXplSW5wdXQoZmlsdGVyLHZhbHVlKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAgIC5wcm9wZXJ0eShcInZhbHVlXCIsdmFsdWUudmFsdWUpXG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciBkZXN0cm95ID0gZDMuc2VsZWN0KHRoaXMpLm9uKFwiZGVzdHJveVwiKVxuICAgICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICAgIH0pXG5cblxuICAgICAgICB2YXIgcyA9ICQoc2VsZWN0Lm5vZGUoKSkuc2VsZWN0aXplKHtcbiAgICAgICAgICBwZXJzaXN0OiBmYWxzZSxcbiAgICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSAodmFsdWUudmFsdWUgPyB2YWx1ZS52YWx1ZSArIFwiLFwiIDogXCJcIikgKyB4XG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uRGVsZXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdmFsdWUudmFsdWUuc3BsaXQoXCIsXCIpLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6ICE9IHhbMF19KS5qb2luKFwiLFwiKVxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHZhbHVlOiB4LCB0ZXh0OiB4XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAub24oXCJkZXN0cm95XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzWzBdLnNlbGVjdGl6ZS5kZXN0cm95KClcbiAgICAgICAgICB9KVxuXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHNlbGVjdGl6ZVNlbGVjdChmaWx0ZXIsdmFsdWUpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIikucmVtb3ZlKClcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIGRlc3Ryb3kgPSBkMy5zZWxlY3QodGhpcykub24oXCJkZXN0cm95XCIpXG4gICAgICAgICAgICBpZiAoZGVzdHJveSkgZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuXG5cbiAgICBcbiAgICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic2VsZWN0LnZhbHVlXCIsXCJzZWxlY3RcIilcbiAgICAgICAgICAuY2xhc3NlZChcInZhbHVlXCIsdHJ1ZSlcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1heC13aWR0aFwiLFwiNTAwcHhcIilcbiAgICAgICAgICAuYXR0cihcIm11bHRpcGxlXCIsdHJ1ZSlcbiAgICAgICAgICAub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHRoaXMudmFsdWVcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgfSlcbiAgICBcbiAgICAgICAgZDNfc3BsYXQoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIixjYXRlZ29yaWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHZhbHVlLnZhbHVlICYmIHZhbHVlLnZhbHVlLmluZGV4T2YoeC5rZXkpID4gLTEgPyBcInNlbGVjdGVkXCIgOiB1bmRlZmluZWQgfSlcbiAgICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICAgIHZhciBzID0gJChzZWxlY3Qubm9kZSgpKS5zZWxlY3RpemUoe1xuICAgICAgICAgIHBlcnNpc3Q6IGZhbHNlLFxuICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHguam9pbihcIixcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAub24oXCJkZXN0cm95XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzWzBdLnNlbGVjdGl6ZS5kZXN0cm95KClcbiAgICAgICAgICB9KVxuXG5cblxuICAgIFxuICAgICAgfVxuICAgIFxuICAgICAgdGhpcy5fbG9naWNfZmlsdGVyID0gZmlsdGVyKHdyYXBwZXIpXG4gICAgICAgIC5maWVsZHMoT2JqZWN0LmtleXModGhpcy5fZmlsdGVyX29wdGlvbnMpKVxuICAgICAgICAub3BzKFtcbiAgICAgICAgICAgIFt7XCJrZXlcIjogXCJpcyBpbi5jYXRlZ29yeVwifSx7XCJrZXlcIjogXCJpcyBub3QgaW4uY2F0ZWdvcnlcIn1dXG4gICAgICAgICAgLCBbe1wia2V5XCI6IFwiY29udGFpbnMuc2VsZWN0aXplXCJ9LCB7XCJrZXlcIjpcImRvZXMgbm90IGNvbnRhaW4uc2VsZWN0aXplXCJ9XVxuICAgICAgICAgICwgW3tcImtleVwiOiBcImVxdWFsc1wifSwge1wia2V5XCI6XCJiZXR3ZWVuXCIsXCJpbnB1dFwiOjJ9XVxuICAgICAgICBdKVxuICAgICAgICAuZGF0YSh0aGlzLmZpbHRlcnMoKSlcbiAgICAgICAgLnJlbmRlcl9vcChcImNvbnRhaW5zLnNlbGVjdGl6ZVwiLHNlbGVjdGl6ZUlucHV0KVxuICAgICAgICAucmVuZGVyX29wKFwiZG9lcyBub3QgY29udGFpbi5zZWxlY3RpemVcIixzZWxlY3RpemVJbnB1dClcbiAgICAgICAgLnJlbmRlcl9vcChcImlzIGluLmNhdGVnb3J5XCIsc2VsZWN0aXplU2VsZWN0KVxuICAgICAgICAucmVuZGVyX29wKFwiaXMgbm90IGluLmNhdGVnb3J5XCIsc2VsZWN0aXplU2VsZWN0KVxuICAgICAgICAucmVuZGVyX29wKFwiYmV0d2VlblwiLGZ1bmN0aW9uKGZpbHRlcix2YWx1ZSkge1xuICAgICAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgIFxuICAgICAgICAgIHZhbHVlLnZhbHVlID0gdHlwZW9mKHZhbHVlLnZhbHVlKSA9PSBcIm9iamVjdFwiID8gdmFsdWUudmFsdWUgOiBbMCwyNF1cbiAgICBcbiAgICAgICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0LnZhbHVlLmxvd1wiLFwiaW5wdXRcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidmFsdWUgbG93XCIsdHJ1ZSlcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjkwcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwidmFsdWVcIiwgdmFsdWUudmFsdWVbMF0pXG4gICAgICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgdmFyIHQgPSB0aGlzXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgc2VsZi50eXBld2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWVbMF0gPSB0LnZhbHVlXG4gICAgICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgICAgfSwxMDAwKVxuICAgICAgICAgICAgfSlcbiAgICBcbiAgICAgICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcInNwYW4udmFsdWUtYW5kXCIsXCJzcGFuXCIpXG4gICAgICAgICAgICAuY2xhc3NlZChcInZhbHVlLWFuZFwiLHRydWUpXG4gICAgICAgICAgICAudGV4dChcIiBhbmQgXCIpXG4gICAgXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dC52YWx1ZS5oaWdoXCIsXCJpbnB1dFwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZSBoaWdoXCIsdHJ1ZSlcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjkwcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwidmFsdWVcIiwgdmFsdWUudmFsdWVbMV0pXG4gICAgICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgdmFyIHQgPSB0aGlzXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgc2VsZi50eXBld2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWVbMV0gPSB0LnZhbHVlXG4gICAgICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgICAgfSwxMDAwKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKFwidXBkYXRlXCIsZnVuY3Rpb24oZmlsdGVycyl7XG4gICAgICAgICAgZmlsdGVyX2NoYW5nZShmaWx0ZXJzKVxuICAgICAgICB9KVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIC8vZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5maWx0ZXItd3JhcC1zcGFjZXJcIixcImRpdlwiKVxuICAgICAgLy8gIC5jbGFzc2VkKFwiZmlsdGVyLXdyYXAtc3BhY2VyXCIsdHJ1ZSlcbiAgICAgIC8vICAuc3R5bGUoXCJoZWlnaHRcIix3cmFwcGVyLnN0eWxlKFwiaGVpZ2h0XCIpKVxuXG4gICAgICAvL3dyYXBwZXJcbiAgICAgIC8vICAuc3R5bGUoXCJ3aWR0aFwiLHRoaXMudGFyZ2V0LnN0eWxlKFwid2lkdGhcIikpXG4gICAgICAvLyAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiei1pbmRleFwiLFwiMzAwXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2YwZjRmN1wiKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4vaGVhZGVyJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIEJ1dHRvblJhZGlvKHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGJ1dHRvbl9yYWRpbyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBCdXR0b25SYWRpbyh0YXJnZXQpXG59XG5cbkJ1dHRvblJhZGlvLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uICgpIHtcbiAgXG4gICAgdmFyIENTU19TVFJJTkcgPSBTdHJpbmcoZnVuY3Rpb24oKSB7LypcbiAgICAgIC5vcHRpb25zLXZpZXcgeyB0ZXh0LWFsaWduOnJpZ2h0IH1cbiAgICAgIC5zaG93LWJ1dHRvbiB7XG4gICAgICB3aWR0aDogMTUwcHg7XG4gICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgICBsaW5lLWhlaWdodDogNDBweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDE1cHg7XG4gICAgICBib3JkZXI6IDFweCBzb2xpZCAjY2NjO1xuICAgICAgZm9udC1zaXplOiAxMnB4O1xuICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbiAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgICAgZGlzcGxheTppbmxpbmUtYmxvY2s7XG4gICAgICBtYXJnaW4tcmlnaHQ6MTVweDtcbiAgICAgICAgfVxuICAgICAgLnNob3ctYnV0dG9uOmhvdmVyIHsgdGV4dC1kZWNvcmF0aW9uOm5vbmU7IGNvbG9yOiM1NTUgfVxuICAgICAgLnNob3ctYnV0dG9uLnNlbGVjdGVkIHtcbiAgICAgICAgYmFja2dyb3VuZDogI2UzZWJmMDtcbiAgICAgICAgY29sb3I6ICM1NTU7XG4gICAgICB9XG4gICAgKi99KVxuICBcbiAgICBkM191cGRhdGVhYmxlKGQzLnNlbGVjdChcImhlYWRcIiksXCJzdHlsZSNzaG93LWNzc1wiLFwic3R5bGVcIilcbiAgICAgIC5hdHRyKFwiaWRcIixcImhlYWRlci1jc3NcIilcbiAgICAgIC50ZXh0KENTU19TVFJJTkcucmVwbGFjZShcImZ1bmN0aW9uICgpIHsvKlwiLFwiXCIpLnJlcGxhY2UoXCIqL31cIixcIlwiKSlcbiAgXG4gICAgdmFyIG9wdGlvbnMgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmJ1dHRvbi1yYWRpby1yb3dcIixcImRpdlwiKVxuICAgICAgLmNsYXNzZWQoXCJidXR0b24tcmFkaW8tcm93XCIsdHJ1ZSlcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjM1cHhcIilcbiAgXG4gIFxuICAgIHZhciBidXR0b25fcm93ID0gZDNfdXBkYXRlYWJsZShvcHRpb25zLFwiLm9wdGlvbnMtdmlld1wiLFwiZGl2XCIsdGhpcy5kYXRhKCkpXG4gICAgICAuY2xhc3NlZChcIm9wdGlvbnMtdmlld1wiLHRydWUpXG5cbiAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwiY2xpY2tcIikuYmluZCh0aGlzKVxuICBcbiAgICBkM19zcGxhdChidXR0b25fcm93LFwiLnNob3ctYnV0dG9uXCIsXCJhXCIsaWRlbnRpdHksIGtleSlcbiAgICAgIC5jbGFzc2VkKFwic2hvdy1idXR0b25cIix0cnVlKVxuICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LnNlbGVjdGVkIH0pXG4gICAgICAudGV4dChrZXkpXG4gICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7IGJvdW5kKHgpIH0pXG5cbiAgICByZXR1cm4gdGhpc1xuICBcbiAgICB9XG4gIFxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZnVuY3Rpb24gT3B0aW9uVmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG9wdGlvbl92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IE9wdGlvblZpZXcodGFyZ2V0KVxufVxuXG5PcHRpb25WaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLm9wdGlvbi13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJvcHRpb24td3JhcFwiLHRydWUpXG5cbiAgICAgIC8vaGVhZGVyKHdyYXApXG4gICAgICAvLyAgLnRleHQoXCJDaG9vc2UgVmlld1wiKVxuICAgICAgLy8gIC5kcmF3KClcblxuICAgICAgYnV0dG9uX3JhZGlvKHdyYXApXG4gICAgICAgIC5vbihcImNsaWNrXCIsIHRoaXMub24oXCJzZWxlY3RcIikgKVxuICAgICAgICAuZGF0YSh0aGlzLmRhdGEoKSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiZXhwb3J0IGZ1bmN0aW9uIHByZXBEYXRhKGRkKSB7XG4gIHZhciBwID0gW11cbiAgZDMucmFuZ2UoMCwyNCkubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICBbXCIwXCIsXCIyMFwiLFwiNDBcIl0ubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgIGlmICh0IDwgMTApIHAucHVzaChcIjBcIiArIFN0cmluZyh0KStTdHJpbmcobSkpXG4gICAgICBlbHNlIHAucHVzaChTdHJpbmcodCkrU3RyaW5nKG0pKVxuXG4gICAgfSlcbiAgfSlcbiAgdmFyIHJvbGxlZCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oaykgeyByZXR1cm4gay5ob3VyICsgay5taW51dGUgfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiB2LnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgcC5hcnRpY2xlc1tjLnVybF0gPSB0cnVlXG4gICAgICAgIHAudmlld3MgKz0gYy5jb3VudFxuICAgICAgICBwLnNlc3Npb25zICs9IGMudW5pcXVlc1xuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7IGFydGljbGVzOiB7fSwgdmlld3M6IDAsIHNlc3Npb25zOiAwfSlcbiAgICB9KVxuICAgIC5lbnRyaWVzKGRkKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgT2JqZWN0LmtleXMoeC52YWx1ZXMpLm1hcChmdW5jdGlvbih5KSB7XG4gICAgICAgIHhbeV0gPSB4LnZhbHVlc1t5XVxuICAgICAgfSlcbiAgICAgIHguYXJ0aWNsZV9jb3VudCA9IE9iamVjdC5rZXlzKHguYXJ0aWNsZXMpLmxlbmd0aFxuICAgICAgeC5ob3VyID0geC5rZXkuc2xpY2UoMCwyKVxuICAgICAgeC5taW51dGUgPSB4LmtleS5zbGljZSgyKVxuICAgICAgeC52YWx1ZSA9IHguYXJ0aWNsZV9jb3VudFxuICAgICAgeC5rZXkgPSBwLmluZGV4T2YoeC5rZXkpXG4gICAgICAvL2RlbGV0ZSB4WydhcnRpY2xlcyddXG4gICAgICByZXR1cm4geFxuICAgIH0pXG4gIHJldHVybiByb2xsZWRcbn1cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN1bW1hcnlEYXRhKGRhdGEpIHtcbiAgICAgIHZhciByZWR1Y2VkID0gZGF0YS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgICAgcC5kb21haW5zW2MuZG9tYWluXSA9IHRydWVcbiAgICAgICAgICBwLmFydGljbGVzW2MudXJsXSA9IHRydWVcbiAgICAgICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgICAgICBwLnNlc3Npb25zICs9IGMudW5pcXVlc1xuXG4gICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgfSx7XG4gICAgICAgICAgICBkb21haW5zOiB7fVxuICAgICAgICAgICwgYXJ0aWNsZXM6IHt9XG4gICAgICAgICAgLCBzZXNzaW9uczogMFxuICAgICAgICAgICwgdmlld3M6IDBcbiAgICAgICAgfSlcblxuICAgICAgcmVkdWNlZC5kb21haW5zID0gT2JqZWN0LmtleXMocmVkdWNlZC5kb21haW5zKS5sZW5ndGhcbiAgICAgIHJlZHVjZWQuYXJ0aWNsZXMgPSBPYmplY3Qua2V5cyhyZWR1Y2VkLmFydGljbGVzKS5sZW5ndGhcblxuICAgICAgcmV0dXJuIHJlZHVjZWRcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5QWdncmVnYXRpb24oc2FtcCxwb3ApIHtcbiAgICAgIHZhciBkYXRhX3N1bW1hcnkgPSB7fVxuICAgICAgT2JqZWN0LmtleXMoc2FtcCkubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgZGF0YV9zdW1tYXJ5W2tdID0ge1xuICAgICAgICAgICAgc2FtcGxlOiBzYW1wW2tdXG4gICAgICAgICAgLCBwb3B1bGF0aW9uOiBwb3Bba11cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGRhdGFfc3VtbWFyeVxuICBcbn1cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhdGVnb3JpZXMoZGF0YSkge1xuICB2YXIgdmFsdWVzID0gZGF0YS5jYXRlZ29yeVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4ge1wia2V5XCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWUsIFwidmFsdWVcIjogeC5jb3VudCB9IH0pXG4gICAgICAgIC5zb3J0KGZ1bmN0aW9uKHAsYykge3JldHVybiBjLnZhbHVlIC0gcC52YWx1ZSB9KS5zbGljZSgwLDE1KVxuICAgICwgdG90YWwgPSB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsIHgpIHtyZXR1cm4gcCArIHgudmFsdWUgfSwgMClcblxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIkNhdGVnb3JpZXNcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHsgeC5wZXJjZW50ID0geC52YWx1ZS90b3RhbDsgcmV0dXJuIHh9KVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFRpbWVzKGRhdGEpIHtcblxuICB2YXIgaG91ciA9IGRhdGEuY3VycmVudF9ob3VyXG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkYXRhLmRpc3BsYXlfY2F0ZWdvcmllcy52YWx1ZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMCkge1xuICAgIGhvdXIgPSBkYXRhLmNhdGVnb3J5X2hvdXIuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTF9KVxuICAgIGhvdXIgPSBkMy5uZXN0KClcbiAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5ob3VyIH0pXG4gICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubWludXRlIH0pXG4gICAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBcbiAgICAgICAgICBwLnVuaXF1ZXMgPSAocC51bmlxdWVzIHx8IDApICsgYy51bmlxdWVzOyBcbiAgICAgICAgICBwLmNvdW50ID0gKHAuY291bnQgfHwgMCkgKyBjLmNvdW50OyAgXG4gICAgICAgICAgcmV0dXJuIHAgfSx7fSlcbiAgICAgIH0pXG4gICAgICAuZW50cmllcyhob3VyKVxuICAgICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgICBjb25zb2xlLmxvZyh4LnZhbHVlcyk7IFxuICAgICAgICByZXR1cm4geC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsayl7IFxuICAgICAgICAgIHBbJ21pbnV0ZSddID0gcGFyc2VJbnQoay5rZXkpOyBcbiAgICAgICAgICBwWydjb3VudCddID0gay52YWx1ZXMuY291bnQ7IFxuICAgICAgICAgIHBbJ3VuaXF1ZXMnXSA9IGsudmFsdWVzLnVuaXF1ZXM7IFxuICAgICAgICAgIHJldHVybiBwIFxuICAgICAgfSwge1wiaG91clwiOngua2V5fSkgfSApXG4gIH1cblxuICB2YXIgdmFsdWVzID0gaG91clxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4ge1wia2V5XCI6IHBhcnNlRmxvYXQoeC5ob3VyKSArIDEgKyB4Lm1pbnV0ZS82MCwgXCJ2YWx1ZVwiOiB4LmNvdW50IH0gfSlcblxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIkJyb3dzaW5nIGJlaGF2aW9yIGJ5IHRpbWVcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXNcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUb3BpY3MoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG5cbiAgdmFyIGlkZiA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkge3JldHVybiB4LnRvcGljfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvcGljID8geC50b3BpYy50b0xvd2VyQ2FzZSgpICE9IFwibm8gdG9waWNcIiA6IHRydWUgfSlcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwia2V5XCI6eC50b3BpY1xuICAgICAgICAsIFwidmFsdWVcIjp4LmNvdW50XG4gICAgICAgICwgXCJ1bmlxdWVzXCI6IHgudW5pcXVlcyBcbiAgICAgICAgLCBcInVybFwiOiB4LnVybFxuICAgICAgfSBcbiAgICB9KVxuXG5cblxuICB2YWx1ZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXl9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LmltcG9ydGFuY2UgPSBNYXRoLmxvZyh4LnRmX2lkZilcbiAgfSlcbiAgdmFsdWVzID0gdmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRmX2lkZiAtIHAudGZfaWRmIH0pXG5cblxuICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQqeC5wZXJjZW50X3VuaXF1ZX0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IFxuICAgIHgucG9wX3BlcmNlbnQgPSAxLjAyL2dldElERih4LmtleSkqMTAwXG4gICAgeC5wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQgPT0gSW5maW5pdHkgPyAwIDogeC5wb3BfcGVyY2VudFxuXG4gICAgeC5zYW1wbGVfcGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnNhbXBsZV9wZXJjZW50fSldKVxuICAgIC5uaWNlKClcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnNhbXBsZV9wZXJjZW50X25vcm0gPSBub3JtKHguc2FtcGxlX3BlcmNlbnQpXG5cbiAgICB4LnJhdGlvID0geC5zYW1wbGVfcGVyY2VudC94LnBvcF9wZXJjZW50XG4gICAgLy94LnBlcmNlbnRfbm9ybSA9IHgucGVyY2VudFxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgVG9waWNzXCJcbiAgICAsIHZhbHVlczogdmFsdWVzLnNsaWNlKDAsMzAwKVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERvbWFpbnMoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5kb21haW4gfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImtleVwiOnguZG9tYWluXG4gICAgICAgICwgXCJ2YWx1ZVwiOnguY291bnRcbiAgICAgICAgLCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC51bmlxdWVzIFxuICAgICAgICAsIFwidXJsXCI6IHgudXJsXG4gICAgICB9IFxuICAgIH0pXG5cblxuXG4gIHZhbHVlcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7IFxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeFswXS5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAgLCBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LmltcG9ydGFuY2UgPSBNYXRoLmxvZyh4LnRmX2lkZilcbiAgfSlcbiAgdmFsdWVzID0gdmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRmX2lkZiAtIHAudGZfaWRmIH0pXG5cblxuICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQqeC5wZXJjZW50X3VuaXF1ZX0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IFxuICAgIHgucG9wX3BlcmNlbnQgPSAxLjAyL2dldElERih4LmtleSkqMTAwXG4gICAgeC5wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQgPT0gSW5maW5pdHkgPyAwIDogeC5wb3BfcGVyY2VudFxuXG4gICAgeC5zYW1wbGVfcGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnNhbXBsZV9wZXJjZW50fSldKVxuICAgIC5uaWNlKClcblxuICB2YXIgdHQgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucG9wX3BlcmNlbnQgfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnNhbXBsZV9wZXJjZW50X25vcm0gPSBub3JtKHguc2FtcGxlX3BlcmNlbnQpXG4gICAgeC5yZWFsX3BvcF9wZXJjZW50ID0geC5wb3BfcGVyY2VudC90dCoxMDBcbiAgICB4LnJhdGlvID0geC5zYW1wbGVfcGVyY2VudC94LnJlYWxfcG9wX3BlcmNlbnRcblxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgRG9tYWluc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5zbGljZSgwLDUwMClcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRVcmxzKGRhdGEpIHtcblxuICB2YXIgY2F0ZWdvcmllcyA9IGRhdGEuZGlzcGxheV9jYXRlZ29yaWVzLnZhbHVlc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuICB2YXIgdmFsdWVzID0gZGF0YS5mdWxsX3VybHNcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHtcImtleVwiOngudXJsLFwidmFsdWVcIjp4LmNvdW50LCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWV9IH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMClcbiAgICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTEgfSlcblxuICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHgua2V5XG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cDovL1wiLFwiXCIpXG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cHM6Ly9cIixcIlwiKVxuICAgICAgICAucmVwbGFjZShcInd3dy5cIixcIlwiKS5zcGxpdChcIi5cIikuc2xpY2UoMSkuam9pbihcIi5cIikuc3BsaXQoXCIvXCIpWzFdLmxlbmd0aCA+IDVcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfSkuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudmFsdWUgLSBwLnZhbHVlIH0pXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgQXJ0aWNsZXNcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCwxMDApXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkT25zaXRlU3VtbWFyeShkYXRhKSB7XG4gIHZhciB5ZXN0ZXJkYXkgPSBkYXRhLnRpbWVzZXJpZXNfZGF0YVswXVxuICB2YXIgdmFsdWVzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlBhZ2UgVmlld3NcIlxuICAgICAgICAgICwgXCJ2YWx1ZVwiOiB5ZXN0ZXJkYXkudmlld3NcbiAgICAgICAgfVxuICAgICAgLCB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlVuaXF1ZSBWaXNpdG9yc1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IHllc3RlcmRheS51bmlxdWVzXG5cbiAgICAgICAgfVxuICAgIF1cbiAgcmV0dXJuIHtcImtleVwiOlwiT24tc2l0ZSBBY3Rpdml0eVwiLFwidmFsdWVzXCI6dmFsdWVzfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRPZmZzaXRlU3VtbWFyeShkYXRhKSB7XG4gIHZhciB2YWx1ZXMgPSBbICBcbiAgICAgICAge1xuICAgICAgICAgICAgXCJrZXlcIjogXCJPZmYtc2l0ZSBWaWV3c1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IGRhdGEuZnVsbF91cmxzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtyZXR1cm4gcCArIGMudW5pcXVlc30sMClcbiAgICAgICAgfVxuICAgICAgLCB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlVuaXF1ZSBwYWdlc1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IE9iamVjdC5rZXlzKGRhdGEuZnVsbF91cmxzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtwW2MudXJsXSA9IDA7IHJldHVybiBwIH0se30pKS5sZW5ndGhcbiAgICAgICAgfVxuICAgIF1cbiAgcmV0dXJuIHtcImtleVwiOlwiT2ZmLXNpdGUgQWN0aXZpdHlcIixcInZhbHVlc1wiOnZhbHVlc31cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWN0aW9ucyhkYXRhKSB7XG4gIFxuICByZXR1cm4ge1wia2V5XCI6XCJTZWdtZW50c1wiLFwidmFsdWVzXCI6IGRhdGEuYWN0aW9ucy5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB7XCJrZXlcIjp4LmFjdGlvbl9uYW1lLCBcInZhbHVlXCI6MCwgXCJzZWxlY3RlZFwiOiBkYXRhLmFjdGlvbl9uYW1lID09IHguYWN0aW9uX25hbWUgfSB9KX1cbn1cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuL2hlbHBlcnMnXG5pbXBvcnQge2F1dG9TaXplIGFzIGF1dG9TaXplfSBmcm9tICcuL2hlbHBlcnMnXG5pbXBvcnQge3ByZXBEYXRhIGFzIHB9IGZyb20gJy4vZGF0YV9oZWxwZXJzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHByZXBEYXRhKCkge1xuICByZXR1cm4gcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59O1xuXG52YXIgRVhBTVBMRV9EQVRBID0ge1xuICAgIFwia2V5XCI6IFwiQnJvd3NpbmcgYmVoYXZpb3IgYnkgdGltZVwiXG4gICwgXCJ2YWx1ZXNcIjogW1xuICAgICAgeyAgXG4gICAgICAgICAgXCJrZXlcIjogMVxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAyXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDIuMjVcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogMi41XG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDNcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzRcbiAgICAgIH1cblxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDRcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG5cblxuICBdIFxufVxuXG5leHBvcnQgZnVuY3Rpb24gVGltZVNlcmllcyh0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLl9kYXRhID0gRVhBTVBMRV9EQVRBXG4gIHRoaXMuX29uID0ge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdGltZV9zZXJpZXModGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGltZVNlcmllcyh0YXJnZXQpXG59XG5cblRpbWVTZXJpZXMucHJvdG90eXBlID0ge1xuXG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgdGl0bGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9XG4gICwgaGVpZ2h0OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cblxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHdyYXAgPSB0aGlzLl90YXJnZXRcbiAgICAgIHZhciBkZXNjID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnZlbmRvci1kb21haW5zLWJhci1kZXNjXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ2ZW5kb3ItZG9tYWlucy1iYXItZGVzY1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG4gICAgICAgIC5kYXR1bSh0aGlzLl9kYXRhKVxuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUoZGVzYyxcIi53XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ3XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICBcbiAgICAgIFxuXG4gICAgICB3cmFwcGVyLmVhY2goZnVuY3Rpb24ocm93KXtcblxuICAgICAgICB2YXIgZGF0YSA9IHJvdy52YWx1ZXMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMua2V5IC0gcC5rZXl9KVxuICAgICAgICAgICwgY291bnQgPSBkYXRhLmxlbmd0aDtcblxuXG4gICAgICAgIHZhciBfc2l6ZXMgPSBhdXRvU2l6ZSh3cmFwcGVyLGZ1bmN0aW9uKGQpe3JldHVybiBkIC0xMH0sIGZ1bmN0aW9uKGQpe3JldHVybiBzZWxmLl9oZWlnaHQgfHwgNjAgfSksXG4gICAgICAgICAgZ3JpZFNpemUgPSBNYXRoLmZsb29yKF9zaXplcy53aWR0aCAvIDI0IC8gMyk7XG5cbiAgICAgICAgdmFyIHZhbHVlQWNjZXNzb3IgPSBmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH1cbiAgICAgICAgICAsIHZhbHVlQWNjZXNzb3IyID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZTIgfVxuICAgICAgICAgICwga2V5QWNjZXNzb3IgPSBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9XG5cbiAgICAgICAgdmFyIHN0ZXBzID0gQXJyYXkuYXBwbHkobnVsbCwgQXJyYXkoY291bnQpKS5tYXAoZnVuY3Rpb24gKF8sIGkpIHtyZXR1cm4gaSsxO30pXG5cbiAgICAgICAgdmFyIF9jb2xvcnMgPSBbXCIjZmZmZmQ5XCIsXCIjZWRmOGIxXCIsXCIjYzdlOWI0XCIsXCIjN2ZjZGJiXCIsXCIjNDFiNmM0XCIsXCIjMWQ5MWMwXCIsXCIjMjI1ZWE4XCIsXCIjMjUzNDk0XCIsXCIjMDgxZDU4XCJdXG4gICAgICAgIHZhciBjb2xvcnMgPSBfY29sb3JzXG5cbiAgICAgICAgdmFyIHggPSBkMy5zY2FsZS5vcmRpbmFsKCkucmFuZ2Uoc3RlcHMpXG4gICAgICAgICAgLCB5ID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoW19zaXplcy5oZWlnaHQsIDAgXSlcblxuXG4gICAgICAgIHZhciBjb2xvclNjYWxlID0gZDMuc2NhbGUucXVhbnRpbGUoKVxuICAgICAgICAgIC5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbiAoZCkgeyByZXR1cm4gZC5mcmVxdWVuY3k7IH0pXSlcbiAgICAgICAgICAucmFuZ2UoY29sb3JzKTtcblxuICAgICAgICB2YXIgc3ZnX3dyYXAgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCJzdmdcIixcInN2Z1wiKVxuICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgX3NpemVzLndpZHRoICsgX3NpemVzLm1hcmdpbi5sZWZ0ICsgX3NpemVzLm1hcmdpbi5yaWdodClcbiAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBfc2l6ZXMuaGVpZ2h0ICsgX3NpemVzLm1hcmdpbi50b3AgKyBfc2l6ZXMubWFyZ2luLmJvdHRvbSlcblxuICAgICAgICB2YXIgc3ZnID0gZDNfc3BsYXQoc3ZnX3dyYXAsXCJnXCIsXCJnXCIsZnVuY3Rpb24oeCkge3JldHVybiBbeC52YWx1ZXNdfSxmdW5jdGlvbihfLGkpIHtyZXR1cm4gaX0pXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBfc2l6ZXMubWFyZ2luLmxlZnQgKyBcIixcIiArIDAgKyBcIilcIilcblxuICAgICAgICB4LmRvbWFpbihbMCw3Ml0pO1xuICAgICAgICB5LmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIE1hdGguc3FydCh2YWx1ZUFjY2Vzc29yKGQpKTsgfSldKTtcblxuICAgICAgICB2YXIgYnVpbGRCYXJzID0gZnVuY3Rpb24oZGF0YSxrZXlBY2Nlc3Nvcix2YWx1ZUFjY2Vzc29yLHksYykge1xuXG4gICAgICAgICAgdmFyIGJhcnMgPSBkM19zcGxhdChzdmcsIFwiLnRpbWluZy1iYXJcIiArIGMsIFwicmVjdFwiLCBkYXRhLCBrZXlBY2Nlc3NvcilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0aW1pbmctYmFyXCIgKyBjKVxuICAgICAgICAgICBcbiAgICAgICAgICBiYXJzXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gKChrZXlBY2Nlc3NvcihkKSAtIDEpICogZ3JpZFNpemUgKTsgfSlcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZ3JpZFNpemUgLSAxKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uKGQpIHsgXG4gICAgICAgICAgICAgIHJldHVybiB5KE1hdGguc3FydCggdmFsdWVBY2Nlc3NvcihkKSApKTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsXCIjYWFhXCIpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBjb2xvclNjYWxlKCBrZXlBY2Nlc3Nvcih4KSArIGMgKSB8fCBcImdyZXlcIiB9IClcbiAgICAgICAgICAgIC8vLmF0dHIoXCJzdHJva2VcIixcIndoaXRlXCIpXG4gICAgICAgICAgICAvLy5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsXCIxcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIF9zaXplcy5oZWlnaHQgLSB5KE1hdGguc3FydCggdmFsdWVBY2Nlc3NvcihkKSApKTsgfSlcbiAgICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIjFcIilcbiAgICAgICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLGZ1bmN0aW9uKHgpeyBcbiAgICAgICAgICAgICAgc2VsZi5vbihcImhvdmVyXCIpLmJpbmQodGhpcykoeClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgfVxuICAgICAgICBcblxuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLmxlbmd0aCAmJiBkYXRhWzBdLnZhbHVlMikge1xuICAgICAgICAgIHZhciAgeTIgPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbX3NpemVzLmhlaWdodCwgMCBdKVxuICAgICAgICAgIHkyLmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIE1hdGguc3FydCh2YWx1ZUFjY2Vzc29yMihkKSk7IH0pXSk7XG4gICAgICAgICAgYnVpbGRCYXJzKGRhdGEsa2V5QWNjZXNzb3IsdmFsdWVBY2Nlc3NvcjIseTIsXCItMlwiKVxuICAgICAgICB9XG5cblxuICAgICAgICBidWlsZEJhcnMoZGF0YSxrZXlBY2Nlc3Nvcix2YWx1ZUFjY2Vzc29yLHksXCJcIilcbiAgICAgIFxuICAgIFxuICAgICAgdmFyIHogPSBkMy50aW1lLnNjYWxlKClcbiAgICAgICAgLnJhbmdlKFswLCBncmlkU2l6ZSoyNCozXSlcbiAgICAgICAgLm5pY2UoZDMudGltZS5ob3VyLDI0KVxuICAgICAgICBcbiAgICBcbiAgICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKClcbiAgICAgICAgLnNjYWxlKHopXG4gICAgICAgIC50aWNrcygzKVxuICAgICAgICAudGlja0Zvcm1hdChkMy50aW1lLmZvcm1hdChcIiVJICVwXCIpKTtcbiAgICBcbiAgICAgIHN2Zy5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInggYXhpc1wiKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsXCIgKyBfc2l6ZXMuaGVpZ2h0ICsgXCIpXCIpXG4gICAgICAgICAgLmNhbGwoeEF4aXMpO1xuXG5cblxuICAgICAgICBcbiAgICAgIH0pXG5cblxuICAgIH1cbn1cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gUGllKHRhcmdldCkge1xuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5QaWUucHJvdG90eXBlID0ge1xuICAgIHJhZGl1czogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInJhZGl1c1wiLHZhbClcbiAgICB9XG4gICwgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgXG4gICAgdmFyIGQgPSBkMy5lbnRyaWVzKHtcbiAgICAgICAgc2FtcGxlOiB0aGlzLl9kYXRhLnNhbXBsZVxuICAgICAgLCBwb3B1bGF0aW9uOiB0aGlzLl9kYXRhLnBvcHVsYXRpb24gLSB0aGlzLl9kYXRhLnNhbXBsZVxuICAgIH0pXG4gICAgXG4gICAgdmFyIGNvbG9yID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAgIC5yYW5nZShbXCIjOThhYmM1XCIsIFwiIzhhODlhNlwiLCBcIiM3YjY4ODhcIiwgXCIjNmI0ODZiXCIsIFwiI2EwNWQ1NlwiLCBcIiNkMDc0M2NcIiwgXCIjZmY4YzAwXCJdKTtcbiAgICBcbiAgICB2YXIgYXJjID0gZDMuc3ZnLmFyYygpXG4gICAgICAgIC5vdXRlclJhZGl1cyh0aGlzLl9yYWRpdXMgLSAxMClcbiAgICAgICAgLmlubmVyUmFkaXVzKDApO1xuICAgIFxuICAgIHZhciBwaWUgPSBkMy5sYXlvdXQucGllKClcbiAgICAgICAgLnNvcnQobnVsbClcbiAgICAgICAgLnZhbHVlKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWU7IH0pO1xuICAgIFxuICAgIHZhciBzdmcgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbih4KXtyZXR1cm4gMX0pXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgNTApXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIDUyKVxuICBcbiAgICBzdmcgPSBkM191cGRhdGVhYmxlKHN2ZyxcImdcIixcImdcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAyNSArIFwiLFwiICsgMjYgKyBcIilcIik7XG4gICAgXG4gICAgdmFyIGcgPSBkM19zcGxhdChzdmcsXCIuYXJjXCIsXCJnXCIscGllKGQpLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5kYXRhLmtleSB9KVxuICAgICAgLmNsYXNzZWQoXCJhcmNcIix0cnVlKVxuICBcbiAgICBkM191cGRhdGVhYmxlKGcsXCJwYXRoXCIsXCJwYXRoXCIpXG4gICAgICAuYXR0cihcImRcIiwgYXJjKVxuICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBjb2xvcihkLmRhdGEua2V5KSB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwaWUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgUGllKHRhcmdldClcbn1cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkaWZmX2Jhcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEaWZmQmFyKHRhcmdldClcbn1cblxuLy8gZGF0YSBmb3JtYXQ6IFt7a2V5LCBub3JtYWxpemVkX2RpZmZ9LCAuLi4gXVxuXG5jbGFzcyBEaWZmQmFyIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICB0aGlzLl9rZXlfYWNjZXNzb3IgPSBcImtleVwiXG4gICAgdGhpcy5fdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcbiAgICB0aGlzLl9iYXJfaGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9iYXJfd2lkdGggPSAxNTBcbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGJhcl9oZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX2hlaWdodFwiLHZhbCkgfVxuICBiYXJfd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX3dpZHRoXCIsdmFsKSB9XG5cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHcgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5kaWZmLXdyYXBcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkge3JldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiZGlmZi13cmFwXCIsdHJ1ZSlcblxuICAgIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKS50ZXh0KHRoaXMuX3RpdGxlKVxuXG4gICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHcsXCIuc3ZnLXdyYXBcIixcImRpdlwiLHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmNsYXNzZWQoXCJzdmctd3JhcFwiLHRydWUpXG5cbiAgICB2YXIgayA9IHRoaXMua2V5X2FjY2Vzc29yKClcbiAgICAgICwgdiA9IHRoaXMudmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmJhcl9oZWlnaHQoKVxuICAgICAgLCBiYXJfd2lkdGggPSB0aGlzLmJhcl93aWR0aCgpXG5cbiAgICB2YXIga2V5cyA9IHRoaXMuX2RhdGEubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhba10gfSlcbiAgICAgICwgbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFt2XSB9KVxuICAgICAgLCBzYW1wbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gLXhbdl0gfSlcblxuICAgIHZhciB4c2FtcHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLHNhbXBtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB4c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLGtleXMubGVuZ3RoXSlcbiAgICAgICAgICAucmFuZ2UoWzAsa2V5cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoe1wid2lkdGhcIjpiYXJfd2lkdGgqMywgXCJoZWlnaHRcIjoga2V5cy5sZW5ndGgqaGVpZ2h0ICsgMTB9KTtcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ2JvdHRvbScpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4ga2V5c1tpXTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKGtleXMubGVuZ3RoKSk7XG5cbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aCArIGJhcl93aWR0aC8yKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGV4dC1hbmNob3I6IG1pZGRsZTtcIilcblxuICAgIFxuICAgIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoKjIpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuICAgIFxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTQpXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA4LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnIzM4OGUzYycpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNjYWxlKHhbdl0pIH0pXG5cbiAgICB2YXIgY2hhcnQyID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQyJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydDJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgc2FtcGJhcnMgPSBkM19zcGxhdChjaGFydDIsXCIuc2FtcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNhbXAtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtNClcbiAgICAgIC5hdHRyKHsneCc6ZnVuY3Rpb24oeCkgeyByZXR1cm4gYmFyX3dpZHRoIC0geHNhbXBzY2FsZSgteFt2XSl9LCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgOC41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJyNkMzJmMmYnKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzYW1wc2NhbGUoLXhbdl0pIH0pXG5cbiAgICB5X3hpcy5leGl0KCkucmVtb3ZlKClcblxuICAgIGNoYXJ0LmV4aXQoKS5yZW1vdmUoKVxuICAgIGNoYXJ0Mi5leGl0KCkucmVtb3ZlKClcblxuICAgIGJhcnMuZXhpdCgpLnJlbW92ZSgpXG4gICAgc2FtcGJhcnMuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgIFxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcF9iYXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQ29tcEJhcih0YXJnZXQpXG59XG5cbi8vIGRhdGEgZm9ybWF0OiBbe2tleSwgbm9ybWFsaXplZF9kaWZmfSwgLi4uIF1cblxuY2xhc3MgQ29tcEJhciB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuXG4gICAgdGhpcy5fa2V5X2FjY2Vzc29yID0gXCJrZXlcIlxuICAgIHRoaXMuX3BvcF92YWx1ZV9hY2Nlc3NvciA9IFwidmFsdWVcIlxuICAgIHRoaXMuX3NhbXBfdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcblxuICAgIHRoaXMuX2Jhcl9oZWlnaHQgPSAyMFxuICAgIHRoaXMuX2Jhcl93aWR0aCA9IDMwMFxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgcG9wX3ZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInBvcF92YWx1ZV9hY2Nlc3NvclwiLHZhbCkgfVxuICBzYW1wX3ZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNhbXBfdmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cblxuICBiYXJfaGVpZ2h0KHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJhcl9oZWlnaHRcIix2YWwpIH1cbiAgYmFyX3dpZHRoKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJhcl93aWR0aFwiLHZhbCkgfVxuXG5cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG4gIHRpdGxlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9IFxuXG5cbiAgZHJhdygpIHtcblxuICAgIHZhciB3ID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIuY29tcC13cmFwXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHtyZXR1cm4gMX0pXG4gICAgICAuY2xhc3NlZChcImNvbXAtd3JhcFwiLHRydWUpXG5cbiAgICBkM191cGRhdGVhYmxlKHcsXCJoM1wiLFwiaDNcIikudGV4dCh0aGlzLl90aXRsZSlcblxuICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh3LFwiLnN2Zy13cmFwXCIsXCJkaXZcIix0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5jbGFzc2VkKFwic3ZnLXdyYXBcIix0cnVlKVxuXG4gICAgdmFyIGsgPSB0aGlzLmtleV9hY2Nlc3NvcigpXG4gICAgICAsIHAgPSB0aGlzLnBvcF92YWx1ZV9hY2Nlc3NvcigpXG4gICAgICAsIHMgPSB0aGlzLnNhbXBfdmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmJhcl9oZWlnaHQoKVxuICAgICAgLCBiYXJfd2lkdGggPSB0aGlzLmJhcl93aWR0aCgpXG5cbiAgICB2YXIga2V5cyA9IHRoaXMuX2RhdGEubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhba10gfSlcbiAgICAgICwgbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFtwXSB9KVxuICAgICAgLCBzYW1wbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFtzXSB9KVxuXG4gICAgdmFyIHhzYW1wc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsc2FtcG1heF0pXG4gICAgICAgICAgLnJhbmdlKFswLGJhcl93aWR0aF0pXG4gICAgICAsIHhzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgLmRvbWFpbihbMCxtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB5c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsa2V5cy5sZW5ndGhdKVxuICAgICAgICAgIC5yYW5nZShbMCxrZXlzLmxlbmd0aCpoZWlnaHRdKTtcblxuICAgIHZhciBjYW52YXMgPSBkM191cGRhdGVhYmxlKHdyYXAsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAuYXR0cih7XCJ3aWR0aFwiOmJhcl93aWR0aCtiYXJfd2lkdGgvMiwgXCJoZWlnaHRcIjoga2V5cy5sZW5ndGgqaGVpZ2h0ICsgMTB9KTtcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ2JvdHRvbScpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4ga2V5c1tpXTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKGtleXMubGVuZ3RoKSk7XG5cbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aC8yKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuXG4gICAgXG4gICAgdmFyIGNoYXJ0ID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0XCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChiYXJfd2lkdGgvMikgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG4gICAgXG4gICAgdmFyIGJhcnMgPSBkM19zcGxhdChjaGFydCxcIi5wb3AtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtMilcbiAgICAgIC5hdHRyKHsneCc6MCwneSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHlzY2FsZShpKSArIDcuNTsgfX0pXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCdncmF5JylcbiAgICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4c2NhbGUoeFtwXSkgfSlcblxuXG4gICAgdmFyIHNhbXBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIuc2FtcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNhbXAtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtMTApXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyAxMS41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJyMwODFkNTgnKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzYW1wc2NhbGUoeFtzXSB8fCAwKSB9KVxuXG4gICAgeV94aXMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICBjaGFydC5leGl0KCkucmVtb3ZlKClcblxuICAgIGJhcnMuZXhpdCgpLnJlbW92ZSgpXG4gICAgc2FtcGJhcnMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcF9idWJibGUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQ29tcEJ1YmJsZSh0YXJnZXQpXG59XG5cbi8vIGRhdGEgZm9ybWF0OiBbe2tleSwgbm9ybWFsaXplZF9kaWZmfSwgLi4uIF1cblxuY2xhc3MgQ29tcEJ1YmJsZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuXG4gICAgdGhpcy5fa2V5X2FjY2Vzc29yID0gXCJrZXlcIlxuXG4gICAgdGhpcy5faGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9zcGFjZSA9IDE0XG4gICAgdGhpcy5fbWlkZGxlID0gMTgwXG4gICAgdGhpcy5fbGVnZW5kX3dpZHRoID0gODBcblxuICAgIHRoaXMuX2J1Y2tldHMgPSBbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geCo2MCB9KVxuICAgIHRoaXMuX3Jvd3MgPSBbXVxuXG5cbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG5cbiAgaGVpZ2h0KHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhlaWdodFwiLHZhbCkgfVxuICBzcGFjZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzcGFjZVwiLHZhbCkgfVxuICBtaWRkbGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibWlkZGxlXCIsdmFsKSB9XG4gIGJ1Y2tldHModmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYnVja2V0c1wiLHZhbCkgfVxuXG4gIHJvd3ModmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicm93c1wiLHZhbCkgfVxuICBhZnRlcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhZnRlclwiLHZhbCkgfVxuXG5cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cbiAgYnVpbGRTY2FsZXMoKSB7XG5cbiAgICB2YXIgcm93cyA9IHRoaXMucm93cygpXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKVxuXG4gICAgdGhpcy5feXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oWzAscm93cy5sZW5ndGhdKVxuICAgICAgLnJhbmdlKFswLHJvd3MubGVuZ3RoKmhlaWdodF0pO1xuXG4gICAgdGhpcy5feHNjYWxlID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCxidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSwoaGVpZ2h0K3NwYWNlKSkpO1xuXG4gICAgdGhpcy5feHNjYWxlcmV2ZXJzZSA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgLmRvbWFpbihidWNrZXRzLnJldmVyc2UoKSlcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLChoZWlnaHQrc3BhY2UpKSk7XG5cbiAgICB0aGlzLl9yc2NhbGUgPSBkMy5zY2FsZS5wb3coKVxuICAgICAgLmV4cG9uZW50KDAuNSlcbiAgICAgIC5kb21haW4oWzAsMV0pXG4gICAgICAucmFuZ2UoWy4zNSwxXSlcbiAgICBcbiAgICB0aGlzLl9vc2NhbGUgPSBkMy5zY2FsZS5xdWFudGl6ZSgpXG4gICAgICAuZG9tYWluKFstMSwxXSlcbiAgICAgIC5yYW5nZShbJyNmN2ZiZmYnLCcjZGVlYmY3JywnI2M2ZGJlZicsJyM5ZWNhZTEnLCcjNmJhZWQ2JywnIzQyOTJjNicsJyMyMTcxYjUnLCcjMDg1MTljJywnIzA4MzA2YiddKVxuICAgIFxuICB9XG5cbiAgZHJhd0xlZ2VuZCgpIHtcbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKSwgbWlkZGxlID0gdGhpcy5taWRkbGUoKSwgbGVnZW5kdHcgPSB0aGlzLl9sZWdlbmRfd2lkdGhcbiAgICAgICwgcnNjYWxlID0gdGhpcy5fcnNjYWxlLCBvc2NhbGUgPSB0aGlzLl9vc2NhbGU7XG5cbiAgICB2YXIgbGVnZW5kID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cubGVnZW5kJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZWdlbmRcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkqMittaWRkbGUtMzEwKSArIFwiLC0xMzApXCIpXG5cbiAgICB2YXIgc2l6ZSA9IGQzX3VwZGF0ZWFibGUobGVnZW5kLCdnLnNpemUnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNpemVcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoXCIgKyAobGVnZW5kdHcrMTApICsgXCIsMClcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZVwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZSBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHcpXG4gICAgICAuaHRtbChcIm1vcmUgYWN0aXZpdHlcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKSBcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lm1vcmUtYXJyb3dcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1vcmUtYXJyb3cgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsLWxlZ2VuZHR3LTEwKVxuICAgICAgLmh0bWwoXCImIzk2NjQ7XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIikgXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cblxuXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3NcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLmh0bWwoXCJsZXNzIGFjdGl2aXR5XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcblxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzcy1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcy1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcrMTApXG4gICAgICAuaHRtbChcIiYjOTY1NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuN2VtXCIpIFxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG4gICAgZDNfc3BsYXQoc2l6ZSxcImNpcmNsZVwiLFwiY2lyY2xlXCIsWzEsLjYsLjMsLjEsMF0pXG4gICAgICAuYXR0cihcInJcIixmdW5jdGlvbih4KSB7IHJldHVybiAoaGVpZ2h0LTIpLzIqcnNjYWxlKHgpIH0pXG4gICAgICAuYXR0cignY3gnLCBmdW5jdGlvbihkLGkpIHsgcmV0dXJuIChoZWlnaHQrNCkqaStoZWlnaHQvMn0pXG4gICAgICAuYXR0cignc3Ryb2tlJywgJ2dyZXknKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnbm9uZScpXG5cblxuICAgIFxuXG5cbiAgICB2YXIgc2l6ZSA9IGQzX3VwZGF0ZWFibGUobGVnZW5kLCdnLmltcG9ydGFuY2UnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImltcG9ydGFuY2VcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoXCIrIChsZWdlbmR0dysxMCkgK1wiLDI1KVwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlIGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dylcbiAgICAgIC5odG1sKFwibW9yZSBpbXBvcnRhbnRcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZS1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZS1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHctMTApXG4gICAgICAuaHRtbChcIiYjOTY2NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuN2VtXCIpIFxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3NcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLmh0bWwoXCJsZXNzIGltcG9ydGFudFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5sZXNzLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZXNzLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLChoZWlnaHQrNCkqNStsZWdlbmR0dysxMClcbiAgICAgIC5odG1sKFwiJiM5NjU0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cblxuICAgIGQzX3NwbGF0KHNpemUsXCJjaXJjbGVcIixcImNpcmNsZVwiLFsxLC43NSwuNSwuMjUsMF0pXG4gICAgICAuYXR0cihcInJcIixoZWlnaHQvMi0yKVxuICAgICAgLmF0dHIoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gb3NjYWxlKHgpIH0pXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIixmdW5jdGlvbih4KSB7IHJldHVybiByc2NhbGUoeC8yICsgLjIpIH0pXG4gICAgICAuYXR0cignY3gnLCBmdW5jdGlvbihkLGkpIHsgcmV0dXJuIChoZWlnaHQrNCkqaStoZWlnaHQvMiB9KVxuIFxuICB9XG5cbiAgZHJhd0F4ZXMoKSB7XG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1xuICAgICAgLCBidWNrZXRzID0gdGhpcy5idWNrZXRzKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5oZWlnaHQoKSwgc3BhY2UgPSB0aGlzLnNwYWNlKCksIG1pZGRsZSA9IHRoaXMubWlkZGxlKCksIGxlZ2VuZHR3ID0gdGhpcy5fbGVnZW5kX3dpZHRoXG4gICAgICAsIHJzY2FsZSA9IHRoaXMuX3JzY2FsZSwgb3NjYWxlID0gdGhpcy5fb3NjYWxlIFxuICAgICAgLCB4c2NhbGUgPSB0aGlzLl94c2NhbGUsIHlzY2FsZSA9IHRoaXMuX3lzY2FsZVxuICAgICAgLCB4c2NhbGVyZXZlcnNlID0gdGhpcy5feHNjYWxlcmV2ZXJzZVxuICAgICAgLCByb3dzID0gdGhpcy5fcm93c1xuXG4gICAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB4QXhpc1xuICAgICAgLm9yaWVudCgndG9wJylcbiAgICAgIC5zY2FsZSh4c2NhbGVyZXZlcnNlKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgaWYgKHggPT0gMzYwMCkgcmV0dXJuIFwiMSBob3VyXCJcbiAgICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgICBpZiAoeCA9PSA4NjQwMCkgcmV0dXJuIFwiMSBkYXlcIlxuICAgICAgICBpZiAoeCA+IDg2NDAwKSByZXR1cm4geC84NjQwMCArIFwiIGRheXNcIiBcblxuICAgICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgICAgfSlcblxuICAgIHZhciB4X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnguYmVmb3JlJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYmVmb3JlXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChoZWlnaHQgKyBzcGFjZSkrIFwiLC00KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneGF4aXMnKVxuICAgICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgICAgICAgXG4gICAgeF94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ5XCIsIC04KVxuICAgICAgLmF0dHIoXCJ4XCIsIC04KVxuICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSg0NSlcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwiZW5kXCIpXG5cbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2tcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHhfeGlzLFwidGV4dC50aXRsZVwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcbiAgICAgIC5hdHRyKFwieFwiLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLzIgLSBoZWlnaHQrc3BhY2UgKVxuICAgICAgLmF0dHIoXCJ5XCIsLTUzKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIix1bmRlZmluZWQpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgLnRleHQoXCJiZWZvcmUgYXJyaXZpbmdcIilcblxuXG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCd0b3AnKVxuICAgICAgLnNjYWxlKHhzY2FsZSlcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIGlmICh4ID09IDM2MDApIHJldHVybiBcIjEgaG91clwiXG4gICAgICAgIGlmICh4IDwgMzYwMCkgcmV0dXJuIHgvNjAgKyBcIiBtaW5zXCIgXG5cbiAgICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgICAgaWYgKHggPiA4NjQwMCkgcmV0dXJuIHgvODY0MDAgKyBcIiBkYXlzXCIgXG5cbiAgICAgICAgcmV0dXJuIHgvMzYwMCArIFwiIGhvdXJzXCJcbiAgICAgIH0pXG5cbiAgICB2YXIgeF94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy54LmFmdGVyJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYWZ0ZXJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpK21pZGRsZSkgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywneGF4aXMnKVxuICAgICAgLmNhbGwoeEF4aXMpO1xuICAgIFxuICAgIHhfeGlzLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAgIC5hdHRyKFwieVwiLCAtOClcbiAgICAgIC5hdHRyKFwieFwiLCA4KVxuICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSgtNDUpXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcInN0YXJ0XCIpXG5cbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2tcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHhfeGlzLFwidGV4dC50aXRsZVwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcbiAgICAgIC5hdHRyKFwieFwiLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLzIgIClcbiAgICAgIC5hdHRyKFwieVwiLC01MylcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsdW5kZWZpbmVkKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsIFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAgIC50ZXh0KFwiYWZ0ZXIgbGVhdmluZ1wiKVxuXG5cbiAgICB2YXIgeUF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHlBeGlzXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5zY2FsZSh5c2NhbGUpXG4gICAgICAudGlja1NpemUoMilcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKGQsaSl7IHJldHVybiByb3dzW2ldLmtleTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKHJvd3MubGVuZ3RoKSk7XG5cblxuICAgIFxuICAgIHZhciB5X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnknLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInkgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkrMCkgKyBcIiwxNSlcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3lheGlzJylcblxuXG4gICAgeV94aXNcbiAgICAgIC5jYWxsKHlBeGlzKTtcblxuICAgIHlfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgIC5hdHRyKFwieDJcIiwxOClcbiAgICAgIC5hdHRyKFwieDFcIiwyMilcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIixcIjBcIilcbiAgICAgIC5yZW1vdmUoKVxuXG5cbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJwYXRoXCIpXG4gICAgICAuYXR0cihcIngyXCIsMTgpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDE4LDApXCIpIFxuICAgICAgLy8uc3R5bGUoXCJzdHJva2VcIixcImJsYWNrXCIpXG5cblxuXG4gICAgICAvLy5yZW1vdmUoKVxuXG4gICAgXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGV4dC1hbmNob3I6IG1pZGRsZTsgZm9udC13ZWlnaHQ6Ym9sZDsgZmlsbDogIzMzM1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsbWlkZGxlLzIpXG5cblxuXG5cbiAgfVxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpLCBtaWRkbGUgPSB0aGlzLm1pZGRsZSgpLCBsZWdlbmR0dyA9IHRoaXMuX2xlZ2VuZF93aWR0aFxuICAgICAgLCByb3dzID0gdGhpcy5yb3dzKClcblxuICAgIHZhciBzdmcgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcInN2Z1wiLFwic3ZnXCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCItNXB4XCIpXG4gICAgICAuYXR0cih7J3dpZHRoJzpidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSoyK21pZGRsZSwnaGVpZ2h0Jzpyb3dzLmxlbmd0aCpoZWlnaHQgKyAxNjV9KVxuICAgICAgLmF0dHIoXCJ4bWxuc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpXG5cbiAgICB0aGlzLl9zdmcgPSBzdmdcblxuICAgIHRoaXMuX2NhbnZhcyA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLDE0MClcIilcblxuXG5cbiAgICB0aGlzLmJ1aWxkU2NhbGVzKClcbiAgICB0aGlzLmRyYXdMZWdlbmQoKVxuICAgIHRoaXMuZHJhd0F4ZXMoKVxuXG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1xuICAgICAgLCByc2NhbGUgPSB0aGlzLl9yc2NhbGUsIG9zY2FsZSA9IHRoaXMuX29zY2FsZSBcbiAgICAgICwgeHNjYWxlID0gdGhpcy5feHNjYWxlLCB5c2NhbGUgPSB0aGlzLl95c2NhbGVcbiAgICAgICwgeHNjYWxlcmV2ZXJzZSA9IHRoaXMuX3hzY2FsZXJldmVyc2VcbiAgICAgICwgcm93cyA9IHRoaXMucm93cygpXG5cblxuICAgIHZhciBjaGFydF9iZWZvcmUgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydC1iZWZvcmUnLCdnJyx0aGlzLnJvd3MoKSxmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0LWJlZm9yZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSArIFwiLDApXCIpXG4gICAgICAuYXR0cignaWQnLCdiYXJzJylcblxuXG4gICAgdmFyIHJvd3MgPSBkM19zcGxhdChjaGFydF9iZWZvcmUsXCIucm93XCIsXCJnXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicm93XCIpXG4gICAgICAuYXR0cih7J3RyYW5zZm9ybSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIFwidHJhbnNsYXRlKDAsXCIgKyAoeXNjYWxlKGkpICsgNy41KSArIFwiKVwiOyB9IH0pXG4gICAgICAuYXR0cih7J2xhYmVsJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gZC5rZXk7IH0gfSlcblxuICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYmFycyA9IGQzX3NwbGF0KHJvd3MsXCIucG9wLWJhclwiLFwiY2lyY2xlXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBvcC1iYXJcIilcbiAgICAgIC5hdHRyKCdjeScsKGhlaWdodC0yKS8yKVxuICAgICAgLmF0dHIoeydjeCc6ZnVuY3Rpb24oZCxpKSB7IHJldHVybiAteHNjYWxlKGQua2V5KX19KVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsXCIuOFwiKVxuICAgICAgLmF0dHIoXCJyXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gKGhlaWdodCkvMiAqIHJzY2FsZSh4Lm5vcm1fdGltZSkgfSkgXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gb3NjYWxlKHgucGVyY2VudF9kaWZmKSB9KVxuXG4gICAgdmFyIGNoYXJ0X2FmdGVyID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQtYWZ0ZXInLCdnJyx0aGlzLl9hZnRlcixmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0LWFmdGVyXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSttaWRkbGUpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgcm93cyA9IGQzX3NwbGF0KGNoYXJ0X2FmdGVyLFwiLnJvd1wiLFwiZ1wiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInJvd1wiKVxuICAgICAgLmF0dHIoeyd0cmFuc2Zvcm0nOmZ1bmN0aW9uKGQsaSl7IHJldHVybiBcInRyYW5zbGF0ZSgwLFwiICsgKHlzY2FsZShpKSArIDcuNSkgKyBcIilcIjsgfSB9KVxuICAgICAgLmF0dHIoeydsYWJlbCc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIGQua2V5OyB9IH0pXG5cbiAgICByb3dzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIGJhcnMgPSBkM19zcGxhdChyb3dzLFwiLnBvcC1iYXJcIixcImNpcmNsZVwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWVzIH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgICAuYXR0cignY3knLChoZWlnaHQtMikvMilcbiAgICAgIC5hdHRyKHsnY3gnOmZ1bmN0aW9uKGQsaSkgeyByZXR1cm4geHNjYWxlKGQua2V5KX19KVxuICAgICAgLmF0dHIoXCJyXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gKGhlaWdodC0yKS8yICogcnNjYWxlKHgubm9ybV90aW1lKSB9KVxuICAgICAgLnN0eWxlKFwiZmlsbFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG9zY2FsZSh4LnBlcmNlbnRfZGlmZikgfSlcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLFwiLjhcIilcblxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN0cmVhbV9wbG90KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN0cmVhbVBsb3QodGFyZ2V0KVxufVxuXG5mdW5jdGlvbiBkcmF3QXhpcyh0YXJnZXQsc2NhbGUsdGV4dCx3aWR0aCkge1xuICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICB4QXhpc1xuICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgLnNjYWxlKHNjYWxlKVxuICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgIH0pXG5cbiAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsJ2cueC5iZWZvcmUnLCdnJylcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYmVmb3JlXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwtNSlcIilcbiAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgICAgIFxuICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIC0yNSlcbiAgICAuYXR0cihcInhcIiwgMTUpXG4gICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoNDUpXCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcblxuICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrXCIpXG5cbiAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgZDNfdXBkYXRlYWJsZSh4X3hpcyxcInRleHQudGl0bGVcIixcInRleHRcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgIC5hdHRyKFwieFwiLHdpZHRoLzIpXG4gICAgLmF0dHIoXCJ5XCIsLTQ2KVxuICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsdW5kZWZpbmVkKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAudGV4dCh0ZXh0ICsgXCIgXCIpXG5cbiAgcmV0dXJuIHhfeGlzXG5cbn1cblxuXG5jbGFzcyBTdHJlYW1QbG90IHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICAgIHRoaXMuX2J1Y2tldHMgPSBbMCwxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG5cbiAgICB0aGlzLl93aWR0aCA9IDM3MFxuICAgIHRoaXMuX2hlaWdodCA9IDI1MFxuICAgIHRoaXMuX2NvbG9yID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAucmFuZ2UoXG5bJyM5OTknLCcjYWFhJywnI2JiYicsJyNjY2MnLCcjZGRkJywnI2RlZWJmNycsJyNjNmRiZWYnLCcjOWVjYWUxJywnIzZiYWVkNicsJyM0MjkyYzYnLCcjMjE3MWI1JywncmdiYSgzMywgMTEzLCAxODEsLjkpJywncmdiYSg4LCA4MSwgMTU2LC45MSknLCcjMDg1MTljJywncmdiYSg4LCA0OCwgMTA3LC45KScsJyMwODMwNmInXS5yZXZlcnNlKCkpXG5cbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGhlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cbiAgd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwid2lkdGhcIix2YWwpIH1cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgICAsIG9yZGVyID0gZGF0YS5vcmRlclxuICAgICAgLCBidWNrZXRzID0gdGhpcy5fYnVja2V0c1xuICAgICAgLCBiZWZvcmVfc3RhY2tlZCA9IGRhdGEuYmVmb3JlX3N0YWNrZWRcbiAgICAgICwgYWZ0ZXJfc3RhY2tlZCA9IGRhdGEuYWZ0ZXJfc3RhY2tlZFxuICAgICAgLCBoZWlnaHQgPSB0aGlzLl9oZWlnaHRcbiAgICAgICwgd2lkdGggPSB0aGlzLl93aWR0aFxuICAgICAgLCB0YXJnZXQgPSB0aGlzLl90YXJnZXRcbiAgICAgICwgY29sb3IgPSB0aGlzLl9jb2xvclxuICAgICAgLCBzZWxmID0gdGhpc1xuXG4gICAgY29sb3IuZG9tYWluKG9yZGVyKVxuXG4gICAgdmFyIHkgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLnJhbmdlKFtoZWlnaHQsMF0pXG4gICAgICAuZG9tYWluKFswLGQzLm1heChiZWZvcmVfc3RhY2tlZCwgZnVuY3Rpb24obGF5ZXIpIHsgcmV0dXJuIGQzLm1heChsYXllcixmdW5jdGlvbihkKSB7cmV0dXJuIGQueTAgKyBkLnkgfSl9KV0pXG4gIFxuICAgIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCx3aWR0aCx3aWR0aC8oYnVja2V0cy5sZW5ndGgtMSkpKVxuICBcbiAgICB2YXIgeHJldmVyc2UgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKSlcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLHdpZHRoKzEwLHdpZHRoLyhidWNrZXRzLmxlbmd0aC0xKSkpXG5cbiAgICB0aGlzLl9iZWZvcmVfc2NhbGUgPSB4cmV2ZXJzZVxuICAgIHRoaXMuX2FmdGVyX3NjYWxlID0geFxuICBcbiAgICB2YXIgYmFyZWEgPSBkMy5zdmcuYXJlYSgpXG4gICAgICAuaW50ZXJwb2xhdGUoXCJ6ZXJvXCIpXG4gICAgICAueChmdW5jdGlvbihkKSB7IHJldHVybiB4cmV2ZXJzZShkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICAgIHZhciBhYXJlYSA9IGQzLnN2Zy5hcmVhKClcbiAgICAgIC5pbnRlcnBvbGF0ZShcImxpbmVhclwiKVxuICAgICAgLngoZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICBcbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJzdmdcIixcInN2Z1wiKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCoyKzE4MClcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCArIDEwMCk7XG5cbiAgICB0aGlzLl9zdmcgPSBzdmdcbiAgXG4gICAgdmFyIGJlZm9yZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmJlZm9yZS1jYW52YXNcIixcImdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImJlZm9yZS1jYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsNjApXCIpXG5cbiAgICBmdW5jdGlvbiBob3ZlckNhdGVnb3J5KGNhdCx0aW1lKSB7XG4gICAgICBhcGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsXCIuNVwiKVxuICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLFwiLjVcIilcbiAgICAgIGFwYXRocy5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSBjYXQpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIGJwYXRocy5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSBjYXQpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUobWlkZGxlLFwidGV4dFwiLFwidGV4dFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiLjY1XCIpXG4gICAgICAgIC50ZXh0KGNhdClcblxuICAgICAgdmFyIG13cmFwID0gZDNfdXBkYXRlYWJsZShtaWRkbGUsXCJnXCIsXCJnXCIpXG5cbiAgICAgIHNlbGYub24oXCJjYXRlZ29yeS5ob3ZlclwiKS5iaW5kKG13cmFwLm5vZGUoKSkoY2F0LHRpbWUpXG4gICAgfVxuICBcbiAgICB2YXIgYiA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiZ1wiLFwiZ1wiKVxuXG4gICAgdmFyIGJwYXRocyA9IGQzX3NwbGF0KGIsXCJwYXRoXCIsXCJwYXRoXCIsIGJlZm9yZV9zdGFja2VkLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLmF0dHIoXCJkXCIsIGJhcmVhKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gY29sb3IoeFswXS5rZXkpOyB9KVxuICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZGQgPSBkMy5ldmVudFxuICAgICAgICB2YXIgcG9zID0gcGFyc2VJbnQoZGQub2Zmc2V0WC8od2lkdGgvYnVja2V0cy5sZW5ndGgpKVxuICAgICAgICBcbiAgICAgICAgaG92ZXJDYXRlZ29yeS5iaW5kKHRoaXMpKHhbMF0ua2V5LGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKClbcG9zXSlcbiAgICAgIH0pXG4gICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgYXBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIH0pXG5cbiAgICBicGF0aHMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYnJlY3QgPSBkM19zcGxhdChiLFwicmVjdFwiLFwicmVjdFwiLGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKCksKHgsaSkgPT4gaSlcbiAgICAgIC5hdHRyKFwieFwiLHogPT4geHJldmVyc2UoeikpXG4gICAgICAuYXR0cihcIndpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsaGVpZ2h0KVxuICAgICAgLmF0dHIoXCJ5XCIsMClcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLFwiMFwiKVxuXG5cblxuICAgICAgXG5cbiAgICB2YXIgbWlkZGxlID0gZDNfdXBkYXRlYWJsZShzdmcsXCIubWlkZGxlLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibWlkZGxlLWNhbnZhc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArICh3aWR0aCArIDE4MC8yKSArIFwiLDYwKVwiKVxuICBcbiAgXG4gIFxuICAgIHZhciBhZnRlciA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmFmdGVyLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiYWZ0ZXItY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArICh3aWR0aCArIDE4MCkgKyBcIiw2MClcIilcblxuICAgIHZhciBhID0gZDNfdXBkYXRlYWJsZShhZnRlcixcImdcIixcImdcIilcblxuICBcbiAgICB2YXIgYXBhdGhzID0gZDNfc3BsYXQoYSxcInBhdGhcIixcInBhdGhcIixhZnRlcl9zdGFja2VkLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLmF0dHIoXCJkXCIsIGFhcmVhKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gY29sb3IoeFswXS5rZXkpOyB9KVxuICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICBob3ZlckNhdGVnb3J5LmJpbmQodGhpcykoeFswXS5rZXkpXG4gICAgICB9KVxuICAgICAgLm9uKFwibW91c2VvdXRcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIGFwYXRocy5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICAgIGJwYXRocy5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICB9KVxuXG4gICAgYXBhdGhzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIF94X3hpcyA9IGRyYXdBeGlzKGJlZm9yZSx4cmV2ZXJzZSxcImJlZm9yZSBhcnJpdmluZ1wiLHdpZHRoKVxuXG4gICAgX3hfeGlzLnNlbGVjdEFsbChcInRleHRcIikuZmlsdGVyKGZ1bmN0aW9uKHkpeyByZXR1cm4geSA9PSAwIH0pLnJlbW92ZSgpXG5cbiAgICB2YXIgX3hfeGlzID0gZHJhd0F4aXMoYWZ0ZXIseCxcImFmdGVyIGxlYXZpbmdcIix3aWR0aClcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0Om5vdCgudGl0bGUpXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSgtNDUpXCIpXG4gICAgICAuYXR0cihcInhcIiwyMClcbiAgICAgIC5hdHRyKFwieVwiLC0yNSlcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpLmZpbHRlcihmdW5jdGlvbih5KXsgcmV0dXJuIHkgPT0gMCB9KS5yZW1vdmUoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIG9uKGFjdGlvbixmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgYnV0dG9uX3JhZGlvIGZyb20gJy4uL2dlbmVyaWMvYnV0dG9uX3JhZGlvJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0IHBpZSBmcm9tICcuLi9nZW5lcmljL3BpZSdcbmltcG9ydCBkaWZmX2JhciBmcm9tICcuLi9nZW5lcmljL2RpZmZfYmFyJ1xuaW1wb3J0IGNvbXBfYmFyIGZyb20gJy4uL2dlbmVyaWMvY29tcF9iYXInXG5pbXBvcnQgY29tcF9idWJibGUgZnJvbSAnLi4vZ2VuZXJpYy9jb21wX2J1YmJsZSdcbmltcG9ydCBzdHJlYW1fcGxvdCBmcm9tICcuLi9nZW5lcmljL3N0cmVhbV9wbG90J1xuXG5cblxuXG5pbXBvcnQgKiBhcyB0aW1lc2VyaWVzIGZyb20gJy4uL3RpbWVzZXJpZXMnXG5cblxuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZnVuY3Rpb24gU3VtbWFyeVZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmZ1bmN0aW9uIGJ1aWxkU3RyZWFtRGF0YShkYXRhLGJ1Y2tldHMpIHtcblxuICB2YXIgdW5pdHNfaW5fYnVja2V0ID0gYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7IHJldHVybiB4IC0gKHhbaS0xXXx8IDApIH0pXG5cbiAgdmFyIHN0YWNrYWJsZSA9IGRhdGEubWFwKGZ1bmN0aW9uKGQpIHtcbiAgICB2YXIgdmFsdWVtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy52YWx1ZXM7IHJldHVybiBwIH0se30pXG4gICAgdmFyIHBlcmNtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy5wZXJjZW50OyByZXR1cm4gcCB9LHt9KVxuXG4gICAgdmFyIHZtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy5ub3JtX2NhdDsgcmV0dXJuIHAgfSx7fSlcblxuXG4gICAgdmFyIG5vcm1hbGl6ZWRfdmFsdWVzID0gYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICBpZiAoeCA9PSAwKSByZXR1cm4ge2tleTogZC5rZXksIHg6IHBhcnNlSW50KHgpLCB5OiAodm1hcFtcIjYwMFwiXXx8MCksIHZhbHVlczogKHZhbHVlbWFwW1wiNjAwXCJdfHwwKSwgcGVyY2VudDogKHBlcmNtYXBbXCI2MDBcIl18fDApfVxuICAgICAgcmV0dXJuIHsga2V5OiBkLmtleSwgeDogcGFyc2VJbnQoeCksIHk6ICh2bWFwW3hdIHx8IDApLCB2YWx1ZXM6ICh2YWx1ZW1hcFt4XSB8fCAwKSwgcGVyY2VudDogKHBlcmNtYXBbeF0gfHwgMCkgfVxuICAgIH0pXG5cblxuICAgIHJldHVybiBub3JtYWxpemVkX3ZhbHVlc1xuICAgIC8vcmV0dXJuIGUyLmNvbmNhdChub3JtYWxpemVkX3ZhbHVlcykvLy5jb25jYXQoZXh0cmEpXG4gIH0pXG5cblxuICBzdGFja2FibGUgPSBzdGFja2FibGUuc29ydCgocCxjKSA9PiBwWzBdLnkgLSBjWzBdLnkpLnJldmVyc2UoKS5zbGljZSgwLDEyKVxuXG4gIHJldHVybiBzdGFja2FibGVcblxufVxuXG5mdW5jdGlvbiBzdHJlYW1EYXRhKGJlZm9yZSxhZnRlcixidWNrZXRzKSB7XG4gIHZhciBzdGFja2FibGUgPSBidWlsZFN0cmVhbURhdGEoYmVmb3JlLGJ1Y2tldHMpXG4gIHZhciBzdGFjayA9IGQzLmxheW91dC5zdGFjaygpLm9mZnNldChcIndpZ2dsZVwiKS5vcmRlcihcInJldmVyc2VcIilcbiAgdmFyIGJlZm9yZV9zdGFja2VkID0gc3RhY2soc3RhY2thYmxlKVxuXG4gIHZhciBvcmRlciA9IGJlZm9yZV9zdGFja2VkLm1hcChpdGVtID0+IGl0ZW1bMF0ua2V5KVxuXG4gIHZhciBzdGFja2FibGUgPSBidWlsZFN0cmVhbURhdGEoYWZ0ZXIsYnVja2V0cylcbiAgICAuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIG9yZGVyLmluZGV4T2YoY1swXS5rZXkpIC0gb3JkZXIuaW5kZXhPZihwWzBdLmtleSkgfSlcblxuICBzdGFja2FibGUgPSBzdGFja2FibGUuZmlsdGVyKHggPT4gb3JkZXIuaW5kZXhPZih4WzBdLmtleSkgPT0gLTEpLmNvbmNhdChzdGFja2FibGUuZmlsdGVyKHggPT4gb3JkZXIuaW5kZXhPZih4WzBdLmtleSkgPiAtMSkpXG5cbiAgdmFyIHN0YWNrID0gZDMubGF5b3V0LnN0YWNrKCkub2Zmc2V0KFwid2lnZ2xlXCIpLm9yZGVyKFwiZGVmYXVsdFwiKVxuICB2YXIgYWZ0ZXJfc3RhY2tlZCA9IHN0YWNrKHN0YWNrYWJsZSlcblxuICByZXR1cm4ge1xuICAgICAgb3JkZXI6IG9yZGVyXG4gICAgLCBiZWZvcmVfc3RhY2tlZDogYmVmb3JlX3N0YWNrZWRcbiAgICAsIGFmdGVyX3N0YWNrZWQ6IGFmdGVyX3N0YWNrZWRcbiAgfVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaW1wbGVUaW1lc2VyaWVzKHRhcmdldCxkYXRhLHcsaCkge1xuICB2YXIgd2lkdGggPSB3IHx8IDEyMFxuICAgICwgaGVpZ2h0ID0gaCB8fCAzMFxuXG4gIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpLmRvbWFpbihkMy5yYW5nZSgwLGRhdGEubGVuZ3RoKSkucmFuZ2UoZDMucmFuZ2UoMCx3aWR0aCx3aWR0aC9kYXRhLmxlbmd0aCkpXG4gIHZhciB5ID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoWzQsaGVpZ2h0XSkuZG9tYWluKFtkMy5taW4oZGF0YSksZDMubWF4KGRhdGEpXSlcblxuICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZ1wiLFwiZ1wiLGRhdGEsZnVuY3Rpb24oeCxpKSB7IHJldHVybiAxfSlcblxuICBkM19zcGxhdCh3cmFwLFwicmVjdFwiLFwicmVjdFwiLHggPT4geCwgKHgsaSkgPT4gaSlcbiAgICAuYXR0cihcInhcIiwoeixpKSA9PiB4KGkpKVxuICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgvZGF0YS5sZW5ndGggLTEuMilcbiAgICAuYXR0cihcInlcIiwgeiA9PiBoZWlnaHQgLSB5KHopIClcbiAgICAuYXR0cihcImhlaWdodFwiLCB6ID0+IHogPyB5KHopIDogMClcblxuICByZXR1cm4gd3JhcFxuXG59XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZHJhd1N0cmVhbSh0YXJnZXQsYmVmb3JlLGFmdGVyKSB7XG5cbmZ1bmN0aW9uIGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGFjY2Vzc29yKSB7XG4gIHZhciBidm9sdW1lID0ge30sIGF2b2x1bWUgPSB7fVxuXG4gIHRyeSB7IHZhciBidm9sdW1lID0gYlswXS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy54XSA9IGFjY2Vzc29yKGMpOyByZXR1cm4gcCB9LHt9KSB9IGNhdGNoKGUpIHt9XG4gIHRyeSB7IHZhciBhdm9sdW1lID0gYVswXS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy54XSA9IGFjY2Vzc29yKGMpOyByZXR1cm4gcCB9LHt9KSB9IGNhdGNoKGUpIHt9XG5cbiAgdmFyIHZvbHVtZSA9IGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKCkubWFwKHggPT4gYnZvbHVtZVt4XSB8fCAwKS5jb25jYXQoYnVja2V0cy5tYXAoeCA9PiBhdm9sdW1lW3hdIHx8IDApKVxuXG4gIHJldHVybiB2b2x1bWVcbn1cblxuICB2YXIgYnVja2V0cyA9IFswLDEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcblxuICB2YXIgZGF0YSA9IHN0cmVhbURhdGEoYmVmb3JlLGFmdGVyLGJ1Y2tldHMpXG4gICAgLCBiZWZvcmVfc3RhY2tlZCA9IGRhdGEuYmVmb3JlX3N0YWNrZWRcbiAgICAsIGFmdGVyX3N0YWNrZWQgPSBkYXRhLmFmdGVyX3N0YWNrZWRcblxuICB2YXIgYmVmb3JlID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuYmVmb3JlLXN0cmVhbVwiLFwiZGl2XCIsZGF0YSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgIC5jbGFzc2VkKFwiYmVmb3JlLXN0cmVhbVwiLHRydWUpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIwcHhcIilcblxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcInJnYigyMjcsIDIzNSwgMjQwKVwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJDb25zaWRlcmF0aW9uIGFuZCBSZXNlYXJjaCBQaGFzZSBJZGVudGlmaWNhdGlvblwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG4gIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSlcblxuXG5cbiAgdmFyIHN0cmVhbSA9IHN0cmVhbV9wbG90KGlubmVyKVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLm9uKFwiY2F0ZWdvcnkuaG92ZXJcIixmdW5jdGlvbih4LHRpbWUpIHtcbiAgICAgIGNvbnNvbGUubG9nKHRpbWUpXG4gICAgICB2YXIgYiA9IGRhdGEuYmVmb3JlX3N0YWNrZWQuZmlsdGVyKHkgPT4geVswXS5rZXkgPT0geClcbiAgICAgIHZhciBhID0gZGF0YS5hZnRlcl9zdGFja2VkLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IHgpXG5cbiAgICAgIHZhciB2b2x1bWUgPSBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxmdW5jdGlvbihjKSB7IHJldHVybiBjLnZhbHVlcy5sZW5ndGggfSlcbiAgICAgICAgLCBwZXJjZW50ID0gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsZnVuY3Rpb24oYykgeyByZXR1cm4gYy5wZXJjZW50IH0pXG4gICAgICAgICwgaW1wb3J0YW5jZSA9IGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMueSB9KVxuXG5cbiAgICAgIHZhciB3cmFwID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICwgdndyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudm9sdW1lXCIsXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ2b2x1bWVcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDMwKVwiKVxuICAgICAgICAsIHB3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnBlcmNlbnRcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBlcmNlbnRcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDkwKVwiKVxuICAgICAgICAsIGl3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmltcG9ydGFuY2VcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcImltcG9ydGFuY2VcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDE1MClcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHZ3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiVmlzaXRzXCIpXG4gICAgICAgIC5hdHRyKFwic3R5bGVcIixcInRpdGxlXCIpXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKHZ3cmFwLHZvbHVtZSlcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgwLDIpXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShwd3JhcCxcInRleHRcIixcInRleHRcIikudGV4dChcIlNoYXJlIG9mIHRpbWVcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcblxuICAgICAgc2ltcGxlVGltZXNlcmllcyhwd3JhcCxwZXJjZW50KVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDAsMilcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGl3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiSW1wb3J0YW5jZVwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKGl3cmFwLGltcG9ydGFuY2UpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMCwyKVwiKVxuXG5cbiAgICAgIHJldHVyblxuICAgIH0pXG4gICAgLmRyYXcoKVxuXG4gIHZhciBiZWZvcmVfYWdnID0gYmVmb3JlX3N0YWNrZWQucmVkdWNlKChvLHgpID0+IHsgcmV0dXJuIHgucmVkdWNlKChwLGMpID0+IHsgcFtjLnhdID0gKHBbYy54XSB8fCAwKSArIGMueTsgcmV0dXJuIHB9LG8pIH0se30pXG4gICAgLCBhZnRlcl9hZ2cgPSBhZnRlcl9zdGFja2VkLnJlZHVjZSgobyx4KSA9PiB7IHJldHVybiB4LnJlZHVjZSgocCxjKSA9PiB7IHBbYy54XSA9IChwW2MueF0gfHwgMCkgKyBjLnk7IHJldHVybiBwfSxvKSB9LHt9KVxuXG5cbiAgdmFyIGxvY2FsX2JlZm9yZSA9IE9iamVjdC5rZXlzKGJlZm9yZV9hZ2cpLnJlZHVjZSgobWluYXJyLGMpID0+IHtcbiAgICAgIGlmIChtaW5hcnJbMF0gPj0gYmVmb3JlX2FnZ1tjXSkgcmV0dXJuIFtiZWZvcmVfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG4gIHZhciBsb2NhbF9hZnRlciA9IE9iamVjdC5rZXlzKGFmdGVyX2FnZykucmVkdWNlKChtaW5hcnIsYykgPT4ge1xuICAgICAgaWYgKG1pbmFyclswXSA+PSBhZnRlcl9hZ2dbY10pIHJldHVybiBbYWZ0ZXJfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG5cbiAgdmFyIGJlZm9yZV9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYmVmb3JlKSldXG4gICAgLCBhZnRlcl9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYWZ0ZXIpKV1cblxuICB2YXIgc3ZnID0gc3RyZWFtXG4gICAgLl9zdmcuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIikuc3R5bGUoXCJkaXNwbGF5XCIsXCJibG9ja1wiKVxuXG5cbiAgdmFyIGJsaW5lID0gZDNfdXBkYXRlYWJsZShzdmcuc2VsZWN0QWxsKFwiLmJlZm9yZS1jYW52YXNcIiksXCJnLmxpbmUtd3JhcFwiLFwiZ1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImxpbmUtd3JhcFwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmxpbmUsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAuYXR0cihcInkxXCIsIDApXG4gICAgLmF0dHIoXCJ5MlwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcIngxXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcbiAgICAuYXR0cihcIngyXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGJsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpICsgMTApXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcInN0YXJ0XCIpXG4gICAgLnRleHQoXCJDb25zaWRlcmF0aW9uIFN0YWdlXCIpXG5cblxuICB2YXIgYWxpbmUgPSBkM191cGRhdGVhYmxlKHN2Zy5zZWxlY3RBbGwoXCIuYWZ0ZXItY2FudmFzXCIpLFwiZy5saW5lLXdyYXBcIixcImdcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJsaW5lLXdyYXBcIilcblxuICBkM191cGRhdGVhYmxlKGFsaW5lLFwibGluZVwiLFwibGluZVwiKVxuICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgIC5hdHRyKFwieTJcIiwgc3RyZWFtLl9oZWlnaHQrMjApXG4gICAgLmF0dHIoXCJ4MVwiLCBzdHJlYW0uX2FmdGVyX3NjYWxlKGFmdGVyX2xpbmUpKVxuICAgIC5hdHRyKFwieDJcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGFsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSAtIDEwKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAudGV4dChcIlZhbGlkYXRpb24gLyBSZXNlYXJjaFwiKVxuXG5cblxuICByZXR1cm4ge1xuICAgIFwiY29uc2lkZXJhdGlvblwiOiBcIlwiICsgYmVmb3JlX2xpbmUsXG4gICAgXCJ2YWxpZGF0aW9uXCI6IFwiLVwiICsgYWZ0ZXJfbGluZVxuICB9XG59XG5cblxuXG5mdW5jdGlvbiBidWlsZFN1bW1hcnlCbG9jayhkYXRhLCB0YXJnZXQsIHJhZGl1c19zY2FsZSwgeCkge1xuICB2YXIgZGF0YSA9IGRhdGFcbiAgICAsIGR0aGlzID0gZDMuc2VsZWN0KHRhcmdldClcblxuICBwaWUoZHRoaXMpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAucmFkaXVzKHJhZGl1c19zY2FsZShkYXRhLnBvcHVsYXRpb24pKVxuICAgIC5kcmF3KClcblxuICB2YXIgZncgPSBkM191cGRhdGVhYmxlKGR0aGlzLFwiLmZ3XCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAuY2xhc3NlZChcImZ3XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTBweFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiM3B4XCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE2cHhcIilcblxuICB2YXIgZncyID0gZDNfdXBkYXRlYWJsZShkdGhpcyxcIi5mdzJcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgIC5jbGFzc2VkKFwiZncyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNjBweFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiM3B4XCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIyMnB4XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiNDBweFwiKVxuICAgIC50ZXh0KGQzLmZvcm1hdChcIiVcIikoZGF0YS5zYW1wbGUvZGF0YS5wb3B1bGF0aW9uKSlcblxuXG5cbiAgZDNfdXBkYXRlYWJsZShmdyxcIi5zYW1wbGVcIixcInNwYW5cIikudGV4dChkMy5mb3JtYXQoXCIsXCIpKGRhdGEuc2FtcGxlKSlcbiAgICAuY2xhc3NlZChcInNhbXBsZVwiLHRydWUpXG4gIGQzX3VwZGF0ZWFibGUoZncsXCIudnNcIixcInNwYW5cIikuaHRtbChcIjxicj4gb3V0IG9mIDxicj5cIikuc3R5bGUoXCJmb250LXNpemVcIixcIi44OGVtXCIpXG4gICAgLmNsYXNzZWQoXCJ2c1wiLHRydWUpXG4gIGQzX3VwZGF0ZWFibGUoZncsXCIucG9wdWxhdGlvblwiLFwic3BhblwiKS50ZXh0KGQzLmZvcm1hdChcIixcIikoZGF0YS5wb3B1bGF0aW9uKSlcbiAgICAuY2xhc3NlZChcInBvcHVsYXRpb25cIix0cnVlKVxuXG59XG5cbmZ1bmN0aW9uIGRyYXdCZWZvcmVBbmRBZnRlcih0YXJnZXQsZGF0YSkge1xuXG4gIHZhciBiZWZvcmUgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5iZWZvcmVcIixcImRpdlwiLGRhdGEsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAuY2xhc3NlZChcImJlZm9yZVwiLHRydWUpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIwcHhcIilcblxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcInJnYigyMjcsIDIzNSwgMjQwKVwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJDYXRlZ29yeSBhY3Rpdml0eSBiZWZvcmUgYXJyaXZpbmcgYW5kIGFmdGVyIGxlYXZpbmcgc2l0ZVwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG4gIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcblxuICBkM191cGRhdGVhYmxlKGlubmVyLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJTb3J0IEJ5XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjJweFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNDBweFwiKVxuXG5cblxuICBpbm5lci5zZWxlY3RBbGwoXCJzZWxlY3RcIilcbiAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjE0MHB4XCIpXG5cblxuICB2YXIgY2IgPSBjb21wX2J1YmJsZShiZWZvcmUpXG4gICAgLnJvd3MoZGF0YS5iZWZvcmVfY2F0ZWdvcmllcylcbiAgICAuYWZ0ZXIoZGF0YS5hZnRlcl9jYXRlZ29yaWVzKVxuICAgIC5kcmF3KClcblxuICBjYi5fc3ZnLnN0eWxlKFwiZGlzcGxheVwiLFwiYmxvY2tcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiYXV0b1wiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiYXV0b1wiKVxuXG5cbiAgcmV0dXJuIGlubmVyXG5cbn1cblxuZnVuY3Rpb24gZHJhd0NhdGVnb3J5RGlmZih0YXJnZXQsZGF0YSkge1xuXG4gIGRpZmZfYmFyKHRhcmdldClcbiAgICAuZGF0YShkYXRhKVxuICAgIC50aXRsZShcIkNhdGVnb3J5IGluZGV4aW5nIHZlcnN1cyBjb21wXCIpXG4gICAgLnZhbHVlX2FjY2Vzc29yKFwibm9ybWFsaXplZF9kaWZmXCIpXG4gICAgLmRyYXcoKVxuXG59XG5cbmZ1bmN0aW9uIGRyYXdDYXRlZ29yeSh0YXJnZXQsZGF0YSkge1xuXG4gIGNvbXBfYmFyKHRhcmdldClcbiAgICAuZGF0YShkYXRhKVxuICAgIC50aXRsZShcIkNhdGVnb3JpZXMgdmlzaXRlZCBmb3IgZmlsdGVyZWQgdmVyc3VzIGFsbCB2aWV3c1wiKVxuICAgIC5wb3BfdmFsdWVfYWNjZXNzb3IoXCJwb3BcIilcbiAgICAuc2FtcF92YWx1ZV9hY2Nlc3NvcihcInNhbXBcIilcbiAgICAuZHJhdygpXG5cbn1cblxuZnVuY3Rpb24gZHJhd0tleXdvcmRzKHRhcmdldCxkYXRhKSB7XG5cbiAgY29tcF9iYXIodGFyZ2V0KVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLnRpdGxlKFwiS2V5d29yZHMgdmlzaXRlZCBmb3IgZmlsdGVyZWQgdmVyc3VzIGFsbCB2aWV3c1wiKVxuICAgIC5wb3BfdmFsdWVfYWNjZXNzb3IoXCJwb3BcIilcbiAgICAuc2FtcF92YWx1ZV9hY2Nlc3NvcihcInNhbXBcIilcbiAgICAuZHJhdygpXG5cblxufVxuXG5mdW5jdGlvbiBkcmF3S2V5d29yZERpZmYodGFyZ2V0LGRhdGEpIHtcblxuICBkaWZmX2Jhcih0YXJnZXQpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAudGl0bGUoXCJLZXl3b3JkIGluZGV4aW5nIHZlcnN1cyBjb21wXCIpXG4gICAgLnZhbHVlX2FjY2Vzc29yKFwibm9ybWFsaXplZF9kaWZmXCIpXG4gICAgLmRyYXcoKVxuXG59XG5cbmZ1bmN0aW9uIGRyYXdUaW1lc2VyaWVzKHRhcmdldCxkYXRhLHJhZGl1c19zY2FsZSkge1xuICB2YXIgdyA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZGl2LnRpbWVzZXJpZXNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidGltZXNlcmllc1wiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjYwJVwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsIFwiMTBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTI3cHhcIilcblxuXG5cbiAgdmFyIHEgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdi50aW1lc2VyaWVzLWRldGFpbHNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidGltZXNlcmllcy1kZXRhaWxzXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDAlXCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjE1cHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjU3cHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTI3cHhcIilcblxuXG5cblxuXG4gIHZhciBwb3AgPSBkM191cGRhdGVhYmxlKHEsXCIucG9wXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInBvcFwiLHRydWUpXG5cbiAgZDNfdXBkYXRlYWJsZShwb3AsXCIuZXhcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcImV4XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcImdyZXlcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG4gIGQzX3VwZGF0ZWFibGUocG9wLFwiLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiM3B4XCIpXG4gICAgLnRleHQoXCJhbGxcIilcblxuXG5cbiAgdmFyIHNhbXAgPSBkM191cGRhdGVhYmxlKHEsXCIuc2FtcFwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJzYW1wXCIsdHJ1ZSlcblxuICBkM191cGRhdGVhYmxlKHNhbXAsXCIuZXhcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcImV4XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiMwODFkNThcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG5cbiAgZDNfdXBkYXRlYWJsZShzYW1wLFwiLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiM3B4XCIpXG4gICAgLnRleHQoXCJmaWx0ZXJlZFwiKVxuXG5cbiAgdmFyIGRldGFpbHMgPSBkM191cGRhdGVhYmxlKHEsXCIuZGVldHNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwiZGVldHNcIix0cnVlKVxuXG5cblxuXG4gIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiRmlsdGVyZWQgdmVyc3VzIEFsbCBWaWV3c1wiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG5cblxuXG5cblxuICB0aW1lc2VyaWVzWydkZWZhdWx0J10odylcbiAgICAuZGF0YSh7XCJrZXlcIjpcInlcIixcInZhbHVlc1wiOmRhdGF9KVxuICAgIC5oZWlnaHQoODApXG4gICAgLm9uKFwiaG92ZXJcIixmdW5jdGlvbih4KSB7XG4gICAgICB2YXIgeHggPSB7fVxuICAgICAgeHhbeC5rZXldID0ge3NhbXBsZTogeC52YWx1ZSwgcG9wdWxhdGlvbjogeC52YWx1ZTIgfVxuICAgICAgZGV0YWlscy5kYXR1bSh4eClcblxuICAgICAgZDNfdXBkYXRlYWJsZShkZXRhaWxzLFwiLnRleHRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInRleHRcIix0cnVlKVxuICAgICAgICAudGV4dChcIkAgXCIgKyB4LmhvdXIgKyBcIjpcIiArICh4Lm1pbnV0ZS5sZW5ndGggPiAxID8geC5taW51dGUgOiBcIjBcIiArIHgubWludXRlKSApXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiNDlweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcblxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShkZXRhaWxzLFwiLnBpZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicGllXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxNXB4XCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IE9iamVjdC5rZXlzKHgpLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiB4W2tdIH0pWzBdXG4gICAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgICB9KVxuICAgIH0pXG4gICAgLmRyYXcoKVxuXG59XG5cblxuXG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3VtbWFyeV92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN1bW1hcnlWaWV3KHRhcmdldClcbn1cblxuU3VtbWFyeVZpZXcucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKVxuICAgIH1cbiAgLCB0aW1pbmc6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aW1pbmdcIix2YWwpXG4gICAgfVxuICAsIGNhdGVnb3J5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY2F0ZWdvcnlcIix2YWwpXG4gICAgfVxuICAsIGtleXdvcmRzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5d29yZHNcIix2YWwpXG4gICAgfVxuICAsIGJlZm9yZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJlZm9yZVwiLHZhbClcbiAgICB9XG4gICwgYWZ0ZXI6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhZnRlclwiLHZhbClcbiAgICB9XG5cblxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG5cbiAgdmFyIENTU19TVFJJTkcgPSBTdHJpbmcoZnVuY3Rpb24oKSB7Lypcbi5zdW1tYXJ5LXdyYXAgLnRhYmxlLXdyYXBwZXIgeyBiYWNrZ3JvdW5kOiNlM2ViZjA7IHBhZGRpbmctdG9wOjVweDsgcGFkZGluZy1ib3R0b206MTBweCB9XG4uc3VtbWFyeS13cmFwIC50YWJsZS13cmFwcGVyIHRyIHsgYm9yZGVyLWJvdHRvbTpub25lIH1cbi5zdW1tYXJ5LXdyYXAgLnRhYmxlLXdyYXBwZXIgdGhlYWQgdHIgeyBiYWNrZ3JvdW5kOm5vbmUgfVxuLnN1bW1hcnktd3JhcCAudGFibGUtd3JhcHBlciB0Ym9keSB0cjpob3ZlciB7IGJhY2tncm91bmQ6bm9uZSB9XG4uc3VtbWFyeS13cmFwIC50YWJsZS13cmFwcGVyIHRyIHRkIHsgYm9yZGVyLXJpZ2h0OjFweCBkb3R0ZWQgI2NjYzt0ZXh0LWFsaWduOmNlbnRlciB9XG4uc3VtbWFyeS13cmFwIC50YWJsZS13cmFwcGVyIHRyIHRkOmxhc3Qtb2YtdHlwZSB7IGJvcmRlci1yaWdodDpub25lIH1cbiAgKi99KVxuXG4gIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI2N1c3RvbS10YWJsZS1jc3NcIixcInN0eWxlXCIpXG4gICAgLmF0dHIoXCJpZFwiLFwiY3VzdG9tLXRhYmxlLWNzc1wiKVxuICAgIC50ZXh0KENTU19TVFJJTkcucmVwbGFjZShcImZ1bmN0aW9uICgpIHsvKlwiLFwiXCIpLnJlcGxhY2UoXCIqL31cIixcIlwiKSlcblxuXG5cblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLnN1bW1hcnktd3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwic3VtbWFyeS13cmFwXCIsdHJ1ZSlcblxuICAgICAgaGVhZGVyKHdyYXApXG4gICAgICAgIC50ZXh0KFwiU3VtbWFyeVwiKVxuICAgICAgICAuZHJhdygpXG5cblxuICAgICAgdmFyIHRzd3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi50cy1yb3dcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInRzLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgIHZhciBwaWV3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnBpZS1yb3dcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInBpZS1yb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgICB2YXIgY2F0d3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5jYXQtcm93XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjYXQtcm93IGRhc2gtcm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgdmFyIGtleXdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIua2V5LXJvd1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwia2V5LXJvdyBkYXNoLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgIHZhciBiYXdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuYmEtcm93XCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImJhLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgIHZhciBzdHJlYW13cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnN0cmVhbS1iYS1yb3dcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwic3RyZWFtLWJhLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cblxuXG5cblxuXG5cblxuICAgICAgdmFyIHJhZGl1c19zY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgIC5kb21haW4oW3RoaXMuX2RhdGEuZG9tYWlucy5wb3B1bGF0aW9uLHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbl0pXG4gICAgICAgIC5yYW5nZShbMjAsMzVdKVxuXG5cblxuICAgICAgdGFibGUocGlld3JhcClcbiAgICAgICAgLmRhdGEoe1wia2V5XCI6XCJUXCIsXCJ2YWx1ZXNcIjpbdGhpcy5kYXRhKCldfSlcbiAgICAgICAgLnNraXBfb3B0aW9uKHRydWUpXG4gICAgICAgIC5yZW5kZXIoXCJkb21haW5zXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkYXRhID0gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuZGF0dW0oKVt4LmtleV07XG4gICAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgICB9KVxuICAgICAgICAucmVuZGVyKFwiYXJ0aWNsZXNcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLnJlbmRlcihcInNlc3Npb25zXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkYXRhID0gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuZGF0dW0oKVt4LmtleV07XG4gICAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgICB9KVxuICAgICAgICAucmVuZGVyKFwidmlld3NcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICAgIH0pXG4gICAgICAgIC5kcmF3KClcblxuXG4gICAgICBkcmF3VGltZXNlcmllcyh0c3dyYXAsdGhpcy5fdGltaW5nLHJhZGl1c19zY2FsZSlcblxuXG4gICAgICB0cnkge1xuICAgICAgZHJhd0NhdGVnb3J5KGNhdHdyYXAsdGhpcy5fY2F0ZWdvcnkpXG4gICAgICBkcmF3Q2F0ZWdvcnlEaWZmKGNhdHdyYXAsdGhpcy5fY2F0ZWdvcnkpXG4gICAgICB9IGNhdGNoKGUpIHt9XG5cbiAgICAgIC8vZHJhd0tleXdvcmRzKGtleXdyYXAsdGhpcy5fa2V5d29yZHMpXG4gICAgICAvL2RyYXdLZXl3b3JkRGlmZihrZXl3cmFwLHRoaXMuX2tleXdvcmRzKVxuXG4gICAgICB2YXIgaW5uZXIgPSBkcmF3QmVmb3JlQW5kQWZ0ZXIoYmF3cmFwLHRoaXMuX2JlZm9yZSlcblxuICAgICAgc2VsZWN0KGlubmVyKVxuICAgICAgICAub3B0aW9ucyhbXG4gICAgICAgICAgICB7XCJrZXlcIjpcIkltcG9ydGFuY2VcIixcInZhbHVlXCI6XCJwZXJjZW50X2RpZmZcIn1cbiAgICAgICAgICAsIHtcImtleVwiOlwiQWN0aXZpdHlcIixcInZhbHVlXCI6XCJzY29yZVwifVxuICAgICAgICAgICwge1wia2V5XCI6XCJQb3B1bGF0aW9uXCIsXCJ2YWx1ZVwiOlwicG9wXCJ9XG4gICAgICAgIF0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9iZWZvcmUuc29ydGJ5IHx8IFwiXCIpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCB0aGlzLm9uKFwiYmEuc29ydFwiKSlcbiAgICAgICAgLmRyYXcoKVxuXG5cbiAgICAgIGRyYXdTdHJlYW0oc3RyZWFtd3JhcCx0aGlzLl9iZWZvcmUuYmVmb3JlX2NhdGVnb3JpZXMsdGhpcy5fYmVmb3JlLmFmdGVyX2NhdGVnb3JpZXMpXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCB0aW1lX3NlcmllcyBmcm9tICcuLi90aW1lc2VyaWVzJ1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICcuL3N1bW1hcnlfdmlldydcblxuXG5mdW5jdGlvbiBkM19jbGFzcyh0YXJnZXQsY2xzLHR5cGUsZGF0YSkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuXCIgKyBjbHMsIHR5cGUgfHwgXCJkaXZcIixkYXRhKVxuICAgIC5jbGFzc2VkKGNscyx0cnVlKVxufVxuXG5mdW5jdGlvbiBub29wKCkge31cblxuXG5leHBvcnQgZnVuY3Rpb24gRG9tYWluRXhwYW5kZWQodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbmZ1bmN0aW9uIGRvbWFpbl9leHBhbmRlZCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEb21haW5FeHBhbmRlZCh0YXJnZXQpXG59XG5cbnZhciBhbGxidWNrZXRzID0gW11cbnZhciBob3VyYnVja2V0cyA9IGQzLnJhbmdlKDAsMjQpLm1hcCh4ID0+IFN0cmluZyh4KS5sZW5ndGggPiAxID8gU3RyaW5nKHgpIDogXCIwXCIgKyB4KVxuXG52YXIgaG91cnMgPSBbMCwyMCw0MF1cbnZhciBidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkucmVkdWNlKChwLGMpID0+IHtcbiAgaG91cnMubWFwKHggPT4ge1xuICAgIHBbYyArIFwiOlwiICsgeF0gPSAwXG4gIH0pXG4gIGFsbGJ1Y2tldHMgPSBhbGxidWNrZXRzLmNvbmNhdChob3Vycy5tYXAoeiA9PiBjICsgXCI6XCIgKyB6KSlcbiAgcmV0dXJuIHBcbn0se30pXG5cbkRvbWFpbkV4cGFuZGVkLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbClcbiAgICB9XG4gICwgcmF3OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmF3XCIsdmFsKVxuICAgIH1cbiAgLCB1cmxzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidXJsc1wiLHZhbClcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuX3Jhd1xuICAgICAgdmFyIGQgPSB7IGRvbWFpbjogZGF0YVswXS5kb21haW4gfVxuXG4gICAgICAvL3ZhciBhcnRpY2xlcyA9IGRhdGEucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIC8vICBwW2MudXJsXSA9IHBbYy51cmxdIHx8IE9iamVjdC5hc3NpZ24oe30sYnVja2V0cylcbiAgICAgIC8vICBwW2MudXJsXVtjLmhvdXIgKyBcIjpcIiArIGMubWludXRlXSA9IGMuY291bnRcbiAgICAgIC8vICByZXR1cm4gcFxuICAgICAgLy99LHt9KVxuXG4gICAgICAvL09iamVjdC5rZXlzKGFydGljbGVzKS5tYXAoayA9PiB7XG4gICAgICAvLyAgYXJ0aWNsZXNba10gPSBhbGxidWNrZXRzLm1hcChiID0+IGFydGljbGVzW2tdW2JdKVxuICAgICAgLy99KVxuXG4gICAgICB2YXIgYXJ0aWNsZXMgPSBkYXRhLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgIHBbYy51cmxdID0gcFtjLnVybF0gfHwgT2JqZWN0LmFzc2lnbih7fSxidWNrZXRzKVxuICAgICAgICBwW2MudXJsXVtjLmhvdXJdID0gKHBbYy51cmxdW2MuaG91cl0gfHwgMCkgKyBjLmNvdW50XG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG5cbiAgICAgIE9iamVjdC5rZXlzKGFydGljbGVzKS5tYXAoayA9PiB7XG4gICAgICAgIGFydGljbGVzW2tdID0gaG91cmJ1Y2tldHMubWFwKGIgPT4gYXJ0aWNsZXNba11bYl0gfHwgMClcbiAgICAgIH0pXG5cbiAgICAgIHZhciB0b19kcmF3ID0gZDMuZW50cmllcyhhcnRpY2xlcylcbiAgICAgICAgLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICB4LmRvbWFpbiA9IGQuZG9tYWluXG4gICAgICAgICAgeC51cmwgPSB4LmtleVxuICAgICAgICAgIHgudG90YWwgPSBkMy5zdW0oeC52YWx1ZSlcbiAgICAgICAgICByZXR1cm4geFxuICAgICAgICB9KVxuXG4gICAgICB2YXIga3dfdG9fZHJhdyA9IHRvX2RyYXdcbiAgICAgICAgLnJlZHVjZShmdW5jdGlvbihwLGMpe1xuICAgICAgICAgIGMua2V5LnRvTG93ZXJDYXNlKCkuc3BsaXQoZC5kb21haW4pWzFdLnNwbGl0KFwiL1wiKS5yZXZlcnNlKClbMF0ucmVwbGFjZShcIl9cIixcIi1cIikuc3BsaXQoXCItXCIpLm1hcCh4ID0+IHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBbXCJ0aGF0XCIsXCJ0aGlzXCIsXCJ3aGF0XCIsXCJiZXN0XCIsXCJtb3N0XCIsXCJmcm9tXCIsXCJ5b3VyXCIsXCJoYXZlXCIsXCJmaXJzdFwiLFwid2lsbFwiLFwidGhhblwiLFwic2F5c1wiLFwibGlrZVwiLFwiaW50b1wiLFwiYWZ0ZXJcIixcIndpdGhcIl1cbiAgICAgICAgICAgIGlmICh4Lm1hdGNoKC9cXGQrL2cpID09IG51bGwgJiYgdmFsdWVzLmluZGV4T2YoeCkgPT0gLTEgJiYgeC5pbmRleE9mKFwiLFwiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCI/XCIpID09IC0xICYmIHguaW5kZXhPZihcIi5cIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiOlwiKSA9PSAtMSAmJiBwYXJzZUludCh4KSAhPSB4ICYmIHgubGVuZ3RoID4gMykge1xuICAgICAgICAgICAgICBwW3hdID0gcFt4XSB8fCB7fVxuICAgICAgICAgICAgICBPYmplY3Qua2V5cyhjLnZhbHVlKS5tYXAocSA9PiB7XG4gICAgICAgICAgICAgICAgcFt4XVtxXSA9IChwW3hdW3FdIHx8IDApICsgKGMudmFsdWVbcV0gfHwgMClcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgfSx7fSlcblxuICAgICAga3dfdG9fZHJhdyA9IGQzLmVudHJpZXMoa3dfdG9fZHJhdylcbiAgICAgICAgLm1hcCh4ID0+IHtcbiAgICAgICAgICB4LnZhbHVlcyA9IE9iamVjdC5rZXlzKHgudmFsdWUpLm1hcCh6ID0+IHgudmFsdWVbel0gfHwgMClcbiAgICAgICAgICB4LnRvdGFsID0gZDMuc3VtKHgudmFsdWVzKVxuICAgICAgICAgIHJldHVybiB4XG4gICAgICAgIH0pXG5cblxuXG4gICAgICB2YXIgdGQgPSB0aGlzLnRhcmdldFxuXG4gICAgICBkM19jbGFzcyh0ZCxcImFjdGlvbi1oZWFkZXJcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTZweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiRXhwbG9yZSBhbmQgUmVmaW5lXCIpXG5cbiAgICAgIHZhciB0aXRsZV9yb3cgPSBkM19jbGFzcyh0ZCxcInRpdGxlLXJvd1wiKVxuICAgICAgdmFyIGV4cGFuc2lvbl9yb3cgPSBkM19jbGFzcyh0ZCxcImV4cGFuc2lvbi1yb3dcIilcblxuXG5cbiAgICAgIHZhciBldWggPSBkM19jbGFzcyh0aXRsZV9yb3csXCJleHBhbnNpb24tdXJscy10aXRsZVwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICBkM19jbGFzcyhldWgsXCJ0aXRsZVwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjY1cHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnRleHQoXCJVUkxcIilcblxuICAgICAgZDNfY2xhc3MoZXVoLFwidmlld1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgICAgICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhldWgsXCJsZWdlbmRcIixcInN2Z1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0NHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0Lm9uZVwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsXCIwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwic3RhcnRcIilcbiAgICAgICAgICAgIC50ZXh0KFwiMTIgYW1cIilcblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcInRleHQudHdvXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjcyXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIjEyIHBtXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0LnRocmVlXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjE0NFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsXCIyMFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgICAgICAgLnRleHQoXCIxMiBhbVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS5vbmVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm9uZVwiLHRydWUpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDI1KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgMzUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCAwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgMClcblxuZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS50d29cIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAuY2xhc3NlZChcInR3b1wiLHRydWUpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDI1KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgMzUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCA3MilcbiAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIDcyKVxuXG5cbmQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmUudGhyZWVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAuY2xhc3NlZChcInRocmVlXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMjUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNSlcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDE0NClcbiAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIDE0NClcblxuXG5cbiAgICAgIHZhciBla2ggPSBkM19jbGFzcyh0aXRsZV9yb3csXCJleHBhbnNpb24ta3dzLXRpdGxlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgIGQzX2NsYXNzKGVraCxcInRpdGxlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoXCJLZXl3b3Jkc1wiKVxuXG4gICAgICBkM19jbGFzcyhla2gsXCJ2aWV3XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgICAgIHZhciBzdmdfbGVnZW5kID0gZDNfY2xhc3MoZWtoLFwibGVnZW5kXCIsXCJzdmdcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNDRweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cblxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwidGV4dC5vbmVcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLFwiMFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsXCIyMFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcInN0YXJ0XCIpXG4gICAgICAgICAgICAudGV4dChcIjEyIGFtXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0LnR3b1wiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsXCI3MlwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsXCIyMFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcIm1pZGRsZVwiKVxuICAgICAgICAgICAgLnRleHQoXCIxMiBwbVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwidGV4dC50aHJlZVwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsXCIxNDRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgICAgICAgIC50ZXh0KFwiMTIgYW1cIilcblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmUub25lXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJvbmVcIix0cnVlKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCAyNSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIDM1KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgMClcbiAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIDApXG5cbiAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmUudHdvXCIsXCJsaW5lXCIpXG4gICAgICAgICAgIC5jbGFzc2VkKFwidHdvXCIsdHJ1ZSlcbiAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAuYXR0cihcInkxXCIsIDI1KVxuICAgICAgICAgICAuYXR0cihcInkyXCIsIDM1KVxuICAgICAgICAgICAuYXR0cihcIngxXCIsIDcyKVxuICAgICAgICAgICAuYXR0cihcIngyXCIsIDcyKVxuXG5cbiAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmUudGhyZWVcIixcImxpbmVcIilcbiAgICAgICAgICAgLmNsYXNzZWQoXCJ0aHJlZVwiLHRydWUpXG4gICAgICAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCAyNSlcbiAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNSlcbiAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCAxNDQpXG4gICAgICAgICAgIC5hdHRyKFwieDJcIiwgMTQ0KVxuXG5cblxuXG5cblxuICAgICAgdmFyIGV4cGFuc2lvbiA9IGQzX2NsYXNzKGV4cGFuc2lvbl9yb3csXCJleHBhbnNpb24tdXJsc1wiKVxuICAgICAgICAuY2xhc3NlZChcInNjcm9sbGJveFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG4gICAgICAgIC5zdHlsZShcIm1heC1oZWlnaHRcIixcIjI1MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm92ZXJmbG93XCIsXCJzY3JvbGxcIilcblxuICAgICAgZXhwYW5zaW9uLmh0bWwoXCJcIilcblxuICAgICAgdmFyIHVybF9yb3cgPSBkM19zcGxhdChleHBhbnNpb24sXCIudXJsLXJvd1wiLFwiZGl2XCIsdG9fZHJhdy5zbGljZSgwLDUwMCksZnVuY3Rpb24oeCkgeyByZXR1cm4geC51cmwgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ1cmwtcm93XCIsdHJ1ZSlcblxuICAgICAgdmFyIHVybF9uYW1lID0gZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm5hbWVcIixcImRpdlwiKS5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwiaGlkZGVuXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKHVybF9uYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAuYXR0cihcInR5cGVcIixcImNoZWNrYm94XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgIH0pXG5cbiAgICAgIGQzX2NsYXNzKHVybF9uYW1lLFwidXJsXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LW92ZXJmbG93XCIsXCJlbGxpcHNpc1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjA1cHhcIilcbiAgICAgICAgLnRleHQoeCA9PiB7XG4gICAgICAgICAgcmV0dXJuIHgudXJsLnNwbGl0KGQuZG9tYWluKVsxXSB8fCB4LnVybFxuICAgICAgICB9KVxuICAgICAgICAuYXR0cihcImhyZWZcIiwgeCA9PiB4LnVybCApXG4gICAgICAgIC5hdHRyKFwidGFyZ2V0XCIsIFwiX2JsYW5rXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5udW1iZXJcIixcImRpdlwiKS5jbGFzc2VkKFwibnVtYmVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTNweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG90YWwgfSlcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIucGxvdFwiLFwic3ZnXCIpLmNsYXNzZWQoXCJwbG90XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0NHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAgIHZhciB2YWx1ZXMgPSB4LnZhbHVlXG4gICAgICAgICAgc2ltcGxlVGltZXNlcmllcyhkdGhpcyx2YWx1ZXMsMTQ0LDIwKVxuXG4gICAgICAgIH0pXG5cblxuICAgICAgdmFyIGV4cGFuc2lvbiA9IGQzX2NsYXNzKGV4cGFuc2lvbl9yb3csXCJleHBhbnNpb24ta3dzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwic2Nyb2xsYm94XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cbiAgICAgICAgLnN0eWxlKFwibWF4LWhlaWdodFwiLFwiMjUwcHhcIilcbiAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcInNjcm9sbFwiKVxuXG4gICAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG5cbiAgICAgIHZhciB1cmxfcm93ID0gZDNfc3BsYXQoZXhwYW5zaW9uLFwiLnVybC1yb3dcIixcImRpdlwiLGt3X3RvX2RyYXcuc2xpY2UoMCw1MDApLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgIC5jbGFzc2VkKFwidXJsLXJvd1wiLHRydWUpXG5cbiAgICAgIHZhciB1cmxfbmFtZSA9IGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5uYW1lXCIsXCJkaXZcIikuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjYwcHhcIilcbiAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcImhpZGRlblwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZSh1cmxfbmFtZSxcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSh4KVxuICAgICAgICB9KVxuXG4gICAgICBkM19jbGFzcyh1cmxfbmFtZSxcInVybFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1vdmVyZmxvd1wiLFwiZWxsaXBzaXNcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjIwNXB4XCIpXG4gICAgICAgIC50ZXh0KHggPT4ge1xuICAgICAgICAgIHJldHVybiB4LmtleVxuICAgICAgICB9KVxuXG4gICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubnVtYmVyXCIsXCJkaXZcIikuY2xhc3NlZChcIm51bWJlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEzcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvdGFsIH0pXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLnBsb3RcIixcInN2Z1wiKS5jbGFzc2VkKFwicGxvdFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNDRweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgICB2YXIgdmFsdWVzID0geC52YWx1ZXNcbiAgICAgICAgICBzaW1wbGVUaW1lc2VyaWVzKGR0aGlzLHZhbHVlcywxNDQsMjApXG5cbiAgICAgICAgfSlcblxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbmV4cG9ydCBkZWZhdWx0IGRvbWFpbl9leHBhbmRlZDtcbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gRG9tYWluQnVsbGV0KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRvbWFpbl9idWxsZXQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRG9tYWluQnVsbGV0KHRhcmdldClcbn1cblxuRG9tYWluQnVsbGV0LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG1heDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm1heFwiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgd2lkdGggPSAodGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKS5yZXBsYWNlKFwicHhcIixcIlwiKSB8fCB0aGlzLm9mZnNldFdpZHRoKSAtIDUwXG4gICAgICAgICwgaGVpZ2h0ID0gMjg7XG5cbiAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgLnJhbmdlKFswLCB3aWR0aF0pXG4gICAgICAgIC5kb21haW4oWzAsIHRoaXMubWF4KCldKVxuXG4gICAgICBpZiAodGhpcy50YXJnZXQudGV4dCgpKSB0aGlzLnRhcmdldC50ZXh0KFwiXCIpXG5cbiAgICAgIHZhciBidWxsZXQgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmJ1bGxldFwiLFwiZGl2XCIsdGhpcy5kYXRhKCksZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgICAuY2xhc3NlZChcImJ1bGxldFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjNweFwiKVxuXG4gICAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZShidWxsZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsd2lkdGgpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsaGVpZ2h0KVxuICBcbiAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTFcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItMVwiLHRydWUpXG4gICAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24oZCkge3JldHVybiB4KGQucG9wX3BlcmNlbnQpIH0pXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsXCIjODg4XCIpXG4gIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTJcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItMlwiLHRydWUpXG4gICAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAgIC5hdHRyKFwieVwiLGhlaWdodC80KVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uKGQpIHtyZXR1cm4geChkLnNhbXBsZV9wZXJjZW50X25vcm0pIH0pXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodC8yKVxuICAgICAgICAuYXR0cihcImZpbGxcIixcInJnYig4LCAyOSwgODgpXCIpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0ICogYXMgdGltZXNlcmllcyBmcm9tICcuLi90aW1lc2VyaWVzJ1xuXG5pbXBvcnQgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQgZG9tYWluX2V4cGFuZGVkIGZyb20gJy4vZG9tYWluX2V4cGFuZGVkJ1xuaW1wb3J0IGRvbWFpbl9idWxsZXQgZnJvbSAnLi9kb21haW5fYnVsbGV0J1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZnVuY3Rpb24gRG9tYWluVmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRvbWFpbl92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IERvbWFpblZpZXcodGFyZ2V0KVxufVxuXG5Eb21haW5WaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICB2YXIgX2V4cGxvcmUgPSB0aGlzLnRhcmdldFxuICAgICAgICAsIHRhYnMgPSB0aGlzLm9wdGlvbnMoKVxuICAgICAgICAsIGRhdGEgPSB0aGlzLmRhdGEoKVxuICAgICAgICAsIGZpbHRlcmVkID0gdGFicy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnNlbGVjdGVkfSlcbiAgICAgICAgLCBzZWxlY3RlZCA9IGZpbHRlcmVkLmxlbmd0aCA/IGZpbHRlcmVkWzBdIDogdGFic1swXVxuXG4gICAgICBoZWFkZXIoX2V4cGxvcmUpXG4gICAgICAgIC50ZXh0KHNlbGVjdGVkLmtleSApXG4gICAgICAgIC5vcHRpb25zKHRhYnMpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KSB7IHRoaXMub24oXCJzZWxlY3RcIikoeCkgfS5iaW5kKHRoaXMpKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIFxuXG4gICAgICBfZXhwbG9yZS5zZWxlY3RBbGwoXCIudmVuZG9yLWRvbWFpbnMtYmFyLWRlc2NcIikucmVtb3ZlKClcbiAgICAgIF9leHBsb3JlLmRhdHVtKGRhdGEpXG5cbiAgICAgIHZhciB0ID0gdGFibGUoX2V4cGxvcmUpXG4gICAgICAgIC5kYXRhKHNlbGVjdGVkKVxuXG5cbiAgICAgIHZhciBzYW1wX21heCA9IGQzLm1heChzZWxlY3RlZC52YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHguc2FtcGxlX3BlcmNlbnRfbm9ybX0pXG4gICAgICAgICwgcG9wX21heCA9IGQzLm1heChzZWxlY3RlZC52YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHgucG9wX3BlcmNlbnR9KVxuICAgICAgICAsIG1heCA9IE1hdGgubWF4KHNhbXBfbWF4LHBvcF9tYXgpO1xuXG4gICAgICB0LmhlYWRlcnMoW1xuICAgICAgICAgICAge2tleTpcImtleVwiLHZhbHVlOlwiRG9tYWluXCIsbG9ja2VkOnRydWUsd2lkdGg6XCIxMDBweFwifVxuICAgICAgICAgICwge2tleTpcInNhbXBsZV9wZXJjZW50XCIsdmFsdWU6XCJTZWdtZW50XCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICAgLCB7a2V5OlwicmVhbF9wb3BfcGVyY2VudFwiLHZhbHVlOlwiQmFzZWxpbmVcIixzZWxlY3RlZDpmYWxzZX1cbiAgICAgICAgICAsIHtrZXk6XCJyYXRpb1wiLHZhbHVlOlwiUmF0aW9cIixzZWxlY3RlZDpmYWxzZX1cbiAgICAgICAgICAsIHtrZXk6XCJpbXBvcnRhbmNlXCIsdmFsdWU6XCJJbXBvcnRhbmNlXCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICAgLCB7a2V5OlwidmFsdWVcIix2YWx1ZTpcIlNlZ21lbnQgdmVyc3VzIEJhc2VsaW5lXCIsbG9ja2VkOnRydWV9XG4gICAgICAgIF0pXG4gICAgICAgIC5zb3J0KFwiaW1wb3J0YW5jZVwiKVxuICAgICAgICAub3B0aW9uX3RleHQoXCImIzY1MjkxO1wiKVxuICAgICAgICAub24oXCJleHBhbmRcIixmdW5jdGlvbihkKSB7XG5cbiAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKFwidGQub3B0aW9uLWhlYWRlclwiKS5odG1sKFwiJm5kYXNoO1wiKVxuICAgICAgICAgIGlmICh0aGlzLm5leHRTaWJsaW5nICYmIGQzLnNlbGVjdCh0aGlzLm5leHRTaWJsaW5nKS5jbGFzc2VkKFwiZXhwYW5kZWRcIikgPT0gdHJ1ZSkge1xuICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInRkLm9wdGlvbi1oZWFkZXJcIikuaHRtbChcIiYjNjUyOTE7XCIpXG4gICAgICAgICAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc2VsZWN0QWxsKFwiLmV4cGFuZGVkXCIpLnJlbW92ZSgpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc2VsZWN0QWxsKFwiLmV4cGFuZGVkXCIpLnJlbW92ZSgpXG4gICAgICAgICAgdmFyIHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodCwgdGhpcy5uZXh0U2libGluZyk7ICBcblxuICAgICAgICAgIHZhciB0ciA9IGQzLnNlbGVjdCh0KS5jbGFzc2VkKFwiZXhwYW5kZWRcIix0cnVlKS5kYXR1bSh7fSlcbiAgICAgICAgICB2YXIgdGQgPSBkM191cGRhdGVhYmxlKHRyLFwidGRcIixcInRkXCIpXG4gICAgICAgICAgICAuYXR0cihcImNvbHNwYW5cIix0aGlzLmNoaWxkcmVuLmxlbmd0aClcbiAgICAgICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmOWY5ZmJcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgICAgICAgdmFyIGRkID0gdGhpcy5wYXJlbnRFbGVtZW50Ll9fZGF0YV9fLmZ1bGxfdXJscy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5kb21haW4gPT0gZC5rZXl9KVxuICAgICAgICAgIHZhciByb2xsZWQgPSB0aW1lc2VyaWVzLnByZXBEYXRhKGRkKVxuICAgICAgICAgIFxuICAgICAgICAgIGRvbWFpbl9leHBhbmRlZCh0ZClcbiAgICAgICAgICAgIC5yYXcoZGQpXG4gICAgICAgICAgICAuZGF0YShyb2xsZWQpXG4gICAgICAgICAgICAudXJscyhkLnVybHMpXG4gICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmRyYXcoKVxuXG4gICAgICAgIH0pXG4gICAgICAgIC5oaWRkZW5fZmllbGRzKFtcInVybHNcIixcInBlcmNlbnRfdW5pcXVlXCIsXCJzYW1wbGVfcGVyY2VudF9ub3JtXCIsXCJwb3BfcGVyY2VudFwiLFwidGZfaWRmXCIsXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiXSlcbiAgICAgICAgLnJlbmRlcihcInJhdGlvXCIsZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHRoaXMuaW5uZXJUZXh0ID0gTWF0aC50cnVuYyh0aGlzLnBhcmVudE5vZGUuX19kYXRhX18ucmF0aW8qMTAwKS8xMDAgKyBcInhcIlxuICAgICAgICB9KVxuICAgICAgICAucmVuZGVyKFwidmFsdWVcIixmdW5jdGlvbihkKSB7XG5cbiAgICAgICAgICBkb21haW5fYnVsbGV0KGQzLnNlbGVjdCh0aGlzKSlcbiAgICAgICAgICAgIC5tYXgobWF4KVxuICAgICAgICAgICAgLmRhdGEodGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fKVxuICAgICAgICAgICAgLmRyYXcoKVxuXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgdC5kcmF3KClcbiAgICAgXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZnVuY3Rpb24gc2ltcGxlQmFyKHdyYXAsdmFsdWUsc2NhbGUsY29sb3IpIHtcblxuICB2YXIgaGVpZ2h0ID0gMjBcbiAgICAsIHdpZHRoID0gd3JhcC5zdHlsZShcIndpZHRoXCIpLnJlcGxhY2UoXCJweFwiLFwiXCIpXG5cbiAgdmFyIGNhbnZhcyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcInN2Z1wiLFwic3ZnXCIsW3ZhbHVlXSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgIC5zdHlsZShcIndpZHRoXCIsd2lkdGgrXCJweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLGhlaWdodCtcInB4XCIpXG5cblxuICB2YXIgY2hhcnQgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydCcsJ2cnLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0XCIpXG4gIFxuICB2YXIgYmFycyA9IGQzX3NwbGF0KGNoYXJ0LFwiLnBvcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpIH0pXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgIC5hdHRyKCdoZWlnaHQnLGhlaWdodC00KVxuICAgIC5hdHRyKHsneCc6MCwneSc6MH0pXG4gICAgLnN0eWxlKCdmaWxsJyxjb2xvcilcbiAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gc2NhbGUoeCkgfSlcblxuXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIFNlZ21lbnRWaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2VnbWVudF92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNlZ21lbnRWaWV3KHRhcmdldClcbn1cblxuU2VnbWVudFZpZXcucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgc2VnbWVudHM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWdtZW50c1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuc2VnbWVudC13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzZWdtZW50LXdyYXBcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjE0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsdGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKSlcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIixcIjMwMFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjBmNGY3XCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5zZWdtZW50LXdyYXAtc3BhY2VyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzZWdtZW50LXdyYXAtc3BhY2VyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsd3JhcC5zdHlsZShcImhlaWdodFwiKSlcblxuXG4gICAgICBoZWFkZXIod3JhcClcbiAgICAgICAgLmJ1dHRvbnMoW1xuICAgICAgICAgICAge2NsYXNzOiBcInNhdmVkLXNlYXJjaFwiLCBpY29uOiBcImZhLWZvbGRlci1vcGVuLW8gZmFcIiwgdGV4dDogXCJPcGVuIFNhdmVkXCJ9XG4gICAgICAgICAgLCB7Y2xhc3M6IFwibmV3LXNhdmVkLXNlYXJjaFwiLCBpY29uOiBcImZhLWJvb2ttYXJrIGZhXCIsIHRleHQ6IFwiU2F2ZVwifVxuICAgICAgICAgICwge2NsYXNzOiBcImNyZWF0ZVwiLCBpY29uOiBcImZhLXBsdXMtY2lyY2xlIGZhXCIsIHRleHQ6IFwiTmV3IFNlZ21lbnRcIn1cbiAgICAgICAgICAsIHtjbGFzczogXCJsb2dvdXRcIiwgaWNvbjogXCJmYS1zaWduLW91dCBmYVwiLCB0ZXh0OiBcIkxvZ291dFwifVxuICAgICAgICBdKVxuICAgICAgICAub24oXCJzYXZlZC1zZWFyY2guY2xpY2tcIiwgdGhpcy5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiKSlcbiAgICAgICAgLm9uKFwibG9nb3V0LmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyB3aW5kb3cubG9jYXRpb24gPSBcIi9sb2dvdXRcIiB9KVxuICAgICAgICAub24oXCJjcmVhdGUuY2xpY2tcIiwgZnVuY3Rpb24oKSB7IHdpbmRvdy5sb2NhdGlvbiA9IFwiL3NlZ21lbnRzXCIgfSlcbiAgICAgICAgLm9uKFwibmV3LXNhdmVkLXNlYXJjaC5jbGlja1wiLCB0aGlzLm9uKFwibmV3LXNhdmVkLXNlYXJjaC5jbGlja1wiKSlcbiAgICAgICAgLnRleHQoXCJTZWdtZW50XCIpLmRyYXcoKSAgICAgIFxuXG5cbiAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLmhlYWRlci1ib2R5XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIXRoaXMuX2lzX2xvYWRpbmcpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCItNDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCJub25lXCIpXG4gICAgICAgIC5odG1sKFwiPGltZyBzcmM9Jy9zdGF0aWMvaW1nL2dlbmVyYWwvbG9nby1zbWFsbC5naWYnIHN0eWxlPSdoZWlnaHQ6MTVweCcvPiBsb2FkaW5nLi4uXCIpXG5cblxuICAgICAgaWYgKHRoaXMuX2RhdGEgPT0gZmFsc2UpIHJldHVyblxuXG4gICAgICB2YXIgYm9keSA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5ib2R5XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJib2R5XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiY2xlYXJcIixcImJvdGhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4LWRpcmVjdGlvblwiLFwiY29sdW1uXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi0xNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgXG5cbiAgICAgIHZhciByb3cxID0gZDNfdXBkYXRlYWJsZShib2R5LFwiLnJvdy0xXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJyb3ctMVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIiwxKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcImZsZXgtZGlyZWN0aW9uXCIsXCJyb3dcIilcblxuICAgICAgdmFyIHJvdzIgPSBkM191cGRhdGVhYmxlKGJvZHksXCIucm93LTJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInJvdy0yXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLDEpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleC1kaXJlY3Rpb25cIixcInJvd1wiKVxuXG5cbiAgICAgIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUocm93MSxcIi5hY3Rpb24uaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyIGFjdGlvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgdmFyIGlubmVyX2Rlc2MgPSBkM191cGRhdGVhYmxlKHJvdzEsXCIuYWN0aW9uLmlubmVyLWRlc2NcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyLWRlc2MgYWN0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjBweFwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIsXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnRleHQoXCJDaG9vc2UgU2VnbWVudFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNlM2ViZjBcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcixcImRpdi5jb2xvclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY29sb3JcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjMDgxZDU4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuXG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIHNlbGVjdChpbm5lcilcbiAgICAgICAgLm9wdGlvbnModGhpcy5fc2VnbWVudHMpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiY2hhbmdlXCIpLmJpbmQodGhpcykoeClcbiAgICAgICAgfSlcbiAgICAgICAgLnNlbGVjdGVkKHRoaXMuX2FjdGlvbi52YWx1ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIFxuXG5cblxuICAgICAgdmFyIGNhbCA9IGQzX3VwZGF0ZWFibGUoaW5uZXIsXCJhLmZhLWNhbGVuZGFyXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEgZmEtY2FsZW5kYXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgY2Fsc2VsLm5vZGUoKVxuICAgICAgICB9KVxuXG4gICAgICBcbiAgICAgIHZhciBjYWxzZWwgPSBzZWxlY3QoY2FsKVxuICAgICAgICAub3B0aW9ucyhbe1wia2V5XCI6XCJUb2RheVwiLFwidmFsdWVcIjowfSx7XCJrZXlcIjpcIlllc3RlcmRheVwiLFwidmFsdWVcIjoxfSx7XCJrZXlcIjpcIjcgZGF5cyBhZ29cIixcInZhbHVlXCI6N31dKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZi5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgudmFsdWUpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9hY3Rpb25fZGF0ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG4gICAgICAgIC5fc2VsZWN0XG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiLjAxXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIm5vbmVcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCJub25lXCIpXG5cbiAgICAgIFxuXG4gICAgICB2YXIgaW5uZXIyID0gZDNfdXBkYXRlYWJsZShyb3cyLFwiLmNvbXBhcmlzb24uaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyIGNvbXBhcmlzb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcblxuICAgICAgdmFyIGlubmVyX2Rlc2MyID0gZDNfdXBkYXRlYWJsZShyb3cyLFwiLmNvbXBhcmlzb24tZGVzYy5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgY29tcGFyaXNvbi1kZXNjXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG5cbiAgICAgIC8vZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiaDNcIixcImgzXCIpXG4gICAgICAvLyAgLnRleHQoXCIoRmlsdGVycyBhcHBsaWVkIHRvIHRoaXMgc2VnbWVudClcIilcbiAgICAgIC8vICAuc3R5bGUoXCJtYXJnaW5cIixcIjEwcHhcIilcbiAgICAgIC8vICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgLy8gIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgLy8gIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAvLyAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgLy8gIC5zdHlsZShcImZsZXhcIixcIjFcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiLmJhci13cmFwLXRpdGxlXCIsXCJoM1wiKS5jbGFzc2VkKFwiYmFyLXdyYXAtdGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuXG5cbiAgICAgICAgLnRleHQoXCJ2aWV3c1wiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLXRpdGxlXCIsXCJoM1wiKS5jbGFzc2VkKFwiYmFyLXdyYXAtdGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuXG5cblxuICAgICAgICAudGV4dChcInZpZXdzXCIpXG5cblxuXG4gICAgICB2YXIgYmFyX3NhbXAgPSBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCJkaXYuYmFyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJhci13cmFwXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjhweFwiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCIuYmFyLXdyYXAtc3BhY2VcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtc3BhY2VcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KGQzLmZvcm1hdChcIixcIikodGhpcy5fZGF0YS52aWV3cy5zYW1wbGUpKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcIi5iYXItd3JhcC1vcHRcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtb3B0XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC8vLnRleHQoXCJhcHBseSBmaWx0ZXJzP1wiKVxuXG5cblxuICAgICAgdmFyIHhzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgIC5kb21haW4oWzAsTWF0aC5tYXgodGhpcy5fZGF0YS52aWV3cy5zYW1wbGUsIHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbildKVxuICAgICAgICAucmFuZ2UoWzAsYmFyX3NhbXAuc3R5bGUoXCJ3aWR0aFwiKV0pXG5cblxuICAgICAgdmFyIGJhcl9wb3AgPSBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiZGl2LmJhci13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItd3JhcFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjIgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCI4cHhcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLXNwYWNlXCIsXCJkaXZcIikuY2xhc3NlZChcImJhci13cmFwLXNwYWNlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMSAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAudGV4dChkMy5mb3JtYXQoXCIsXCIpKHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbikpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjMixcIi5iYXItd3JhcC1vcHRcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtb3B0XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuICAgICAgICAuaHRtbChcImFwcGx5IGZpbHRlcnM/IDxpbnB1dCB0eXBlPSdjaGVja2JveCc+PC9pbnB1dD5cIilcblxuXG5cbiAgICAgIHNpbXBsZUJhcihiYXJfc2FtcCx0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSx4c2NhbGUsXCIjMDgxZDU4XCIpXG4gICAgICBzaW1wbGVCYXIoYmFyX3BvcCx0aGlzLl9kYXRhLnZpZXdzLnBvcHVsYXRpb24seHNjYWxlLFwiZ3JleVwiKVxuXG5cblxuXG5cblxuXG5cblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIyLFwiaDNcIixcImgzXCIpXG4gICAgICAgIC50ZXh0KFwiQ29tcGFyZSBBZ2FpbnN0XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyMixcImRpdi5jb2xvclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY29sb3JcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJncmV5XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuXG5cblxuXG5cblxuXG5cbiAgICAgIHNlbGVjdChpbm5lcjIpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIkN1cnJlbnQgU2VnbWVudCAod2l0aG91dCBmaWx0ZXJzKVwiLFwidmFsdWVcIjpmYWxzZX1dLmNvbmNhdCh0aGlzLl9zZWdtZW50cykgKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG5cbiAgICAgICAgICBzZWxmLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIikuYmluZCh0aGlzKSh4KVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fY29tcGFyaXNvbi52YWx1ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIHZhciBjYWwyID0gZDNfdXBkYXRlYWJsZShpbm5lcjIsXCJhLmZhLWNhbGVuZGFyXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEgZmEtY2FsZW5kYXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgY2Fsc2VsMi5ub2RlKClcbiAgICAgICAgfSlcblxuICAgICAgXG4gICAgICB2YXIgY2Fsc2VsMiA9IHNlbGVjdChjYWwyKVxuICAgICAgICAub3B0aW9ucyhbe1wia2V5XCI6XCJUb2RheVwiLFwidmFsdWVcIjowfSx7XCJrZXlcIjpcIlllc3RlcmRheVwiLFwidmFsdWVcIjoxfSx7XCJrZXlcIjpcIjcgZGF5cyBhZ29cIixcInZhbHVlXCI6N31dKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZi5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikuYmluZCh0aGlzKSh4LnZhbHVlKVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fY29tcGFyaXNvbl9kYXRlIHx8IDApXG4gICAgICAgIC5kcmF3KClcbiAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIuMDFcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwibm9uZVwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIm5vbmVcIilcblxuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGFjdGlvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uX2RhdGVcIix2YWwpXG4gICAgfVxuICAsIGFjdGlvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFjdGlvblwiLHZhbClcbiAgICB9XG4gICwgY29tcGFyaXNvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY29tcGFyaXNvbl9kYXRlXCIsdmFsKVxuICAgIH1cblxuICAsIGNvbXBhcmlzb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uXCIsdmFsKVxuICAgIH1cbiAgLCBpc19sb2FkaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaXNfbG9hZGluZ1wiLHZhbClcbiAgICB9XG5cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICcuL3N1bW1hcnlfdmlldydcblxudmFyIGJ1Y2tldHMgPSBbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5yZXZlcnNlKCkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZyh4KjYwKSB9KVxuYnVja2V0cyA9IGJ1Y2tldHMuY29uY2F0KFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiBTdHJpbmcoLXgqNjApIH0pKVxuXG5cbmZ1bmN0aW9uIG5vb3AoKXt9XG5cbmZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSxkYXRhKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5cIiArIGNscywgdHlwZSB8fCBcImRpdlwiLGRhdGEpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cbmZ1bmN0aW9uIGNhbGNDYXRlZ29yeShiZWZvcmVfdXJscyxhZnRlcl91cmxzKSB7XG4gIHZhciB1cmxfY2F0ZWdvcnkgPSBiZWZvcmVfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgIHBbYy51cmxdID0gYy5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgIHJldHVybiBwXG4gIH0se30pXG5cbiAgdXJsX2NhdGVnb3J5ID0gYWZ0ZXJfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgIHBbYy51cmxdID0gYy5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgIHJldHVybiBwXG4gIH0sdXJsX2NhdGVnb3J5KVxuXG4gIHJldHVybiB1cmxfY2F0ZWdvcnlcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZWZpbmUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgUmVmaW5lKHRhcmdldClcbn1cblxuY2xhc3MgUmVmaW5lIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICB9XG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9XG4gIHN0YWdlcyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzdGFnZXNcIix2YWwpIH1cblxuICBiZWZvcmVfdXJscyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiZWZvcmVfdXJsc1wiLHZhbCkgfVxuICBhZnRlcl91cmxzKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFmdGVyX3VybHNcIix2YWwpIH1cblxuXG5cbiAgb24oYWN0aW9uLCBmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgdmFyIHRkID0gdGhpcy5fdGFyZ2V0XG4gICAgdmFyIGJlZm9yZV91cmxzID0gdGhpcy5fYmVmb3JlX3VybHNcbiAgICAgICwgYWZ0ZXJfdXJscyA9IHRoaXMuX2FmdGVyX3VybHNcbiAgICAgICwgZCA9IHRoaXMuX2RhdGFcbiAgICAgICwgc3RhZ2VzID0gdGhpcy5fc3RhZ2VzXG5cblxuICAgIHZhciB1cmxfY2F0ZWdvcnkgPSBjYWxjQ2F0ZWdvcnkoYmVmb3JlX3VybHMsYWZ0ZXJfdXJscylcblxuXG4gICAgICAgICAgdmFyIHVybF92b2x1bWUgPSBiZWZvcmVfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICAgICAgcFtjLnVybF0gPSAocFtjLnVybF0gfHwgMCkgKyBjLnZpc2l0c1xuICAgICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgICB9LHt9KVxuXG4gICAgICAgICAgdXJsX3ZvbHVtZSA9IGFmdGVyX3VybHMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgICAgIHBbYy51cmxdID0gKHBbYy51cmxdIHx8IDApICsgYy52aXNpdHNcbiAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgfSx1cmxfdm9sdW1lKVxuXG5cblxuICAgICAgICAgIHZhciBzb3J0ZWRfdXJscyA9IGQzLmVudHJpZXModXJsX3ZvbHVtZSkuc29ydCgocCxjKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZDMuZGVzY2VuZGluZyhwLnZhbHVlLGMudmFsdWUpXG4gICAgICAgICAgfSlcblxuXG4gICAgICAgICAgdmFyIGJlZm9yZV91cmxfdHMgPSBiZWZvcmVfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICAgICAgcFtjLnVybF0gPSBwW2MudXJsXSB8fCB7fVxuICAgICAgICAgICAgcFtjLnVybF1bXCJ1cmxcIl0gPSBjLnVybFxuXG4gICAgICAgICAgICBwW2MudXJsXVtjLnRpbWVfZGlmZl9idWNrZXRdID0gYy52aXNpdHNcbiAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgfSx7fSlcblxuICAgICAgICAgIHZhciBhZnRlcl91cmxfdHMgPSBhZnRlcl91cmxzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgICAgICBwW2MudXJsXSA9IHBbYy51cmxdIHx8IHt9XG4gICAgICAgICAgICBwW2MudXJsXVtcInVybFwiXSA9IGMudXJsXG5cbiAgICAgICAgICAgIHBbYy51cmxdW1wiLVwiICsgYy50aW1lX2RpZmZfYnVja2V0XSA9IGMudmlzaXRzXG4gICAgICAgICAgICByZXR1cm4gcFxuICAgICAgICAgIH0sYmVmb3JlX3VybF90cylcblxuXG5cbiAgICAgICAgICB2YXIgdG9fZHJhdyA9IHNvcnRlZF91cmxzLnNsaWNlKDAsMTAwMCkubWFwKHggPT4gYWZ0ZXJfdXJsX3RzW3gua2V5XSlcbi5tYXAoZnVuY3Rpb24oeCl7XG4gIHgudG90YWwgPSBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKVxuICByZXR1cm4geFxufSlcblxudmFyIGt3X3RvX2RyYXcgPSBkMy5lbnRyaWVzKGFmdGVyX3VybF90cykucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuXG4gIGMua2V5LnRvTG93ZXJDYXNlKCkuc3BsaXQoZC5kb21haW4pWzFdLnNwbGl0KFwiL1wiKS5yZXZlcnNlKClbMF0ucmVwbGFjZShcIl9cIixcIi1cIikuc3BsaXQoXCItXCIpLm1hcCh4ID0+IHtcbiAgICB2YXIgdmFsdWVzID0gW1widGhhdFwiLFwidGhpc1wiLFwid2hhdFwiLFwiYmVzdFwiLFwibW9zdFwiLFwiZnJvbVwiLFwieW91clwiLFwiaGF2ZVwiLFwiZmlyc3RcIixcIndpbGxcIixcInRoYW5cIixcInNheXNcIixcImxpa2VcIixcImludG9cIixcImFmdGVyXCIsXCJ3aXRoXCJdXG4gICAgaWYgKHgubWF0Y2goL1xcZCsvZykgPT0gbnVsbCAmJiB2YWx1ZXMuaW5kZXhPZih4KSA9PSAtMSAmJiB4LmluZGV4T2YoXCIsXCIpID09IC0xICYmIHguaW5kZXhPZihcIj9cIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiLlwiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCI6XCIpID09IC0xICYmIHBhcnNlSW50KHgpICE9IHggJiYgeC5sZW5ndGggPiAzKSB7XG4gICAgICBwW3hdID0gcFt4XSB8fCB7fVxuICAgICAgcFt4XS5rZXkgPSB4XG4gICAgICBPYmplY3Qua2V5cyhjLnZhbHVlKS5tYXAocSA9PiB7XG4gICAgICAgIHBbeF1bcV0gPSAocFt4XVtxXSB8fCAwKSArIGMudmFsdWVbcV1cbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiBwXG4gIH0pXG4gIHJldHVybiBwXG59LHt9KVxuXG5cbmt3X3RvX2RyYXcgPSBPYmplY3Qua2V5cyhrd190b19kcmF3KS5tYXAoZnVuY3Rpb24oaykgeyByZXR1cm4ga3dfdG9fZHJhd1trXSB9KS5tYXAoZnVuY3Rpb24oeCl7XG4gIHgudG90YWwgPSBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKVxuICByZXR1cm4geFxufSkuc29ydCgocCxjKSA9PiB7XG4gIHJldHVybiBjLnRvdGFsIC0gcC50b3RhbFxufSlcblxuXG5cblxuICAgICAgICAgIHZhciBzdW1tYXJ5X3JvdyA9IGQzX2NsYXNzKHRkLFwic3VtbWFyeS1yb3dcIikuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwicmVsYXRpdmVcIilcbiAgICAgICAgICBkM19jbGFzcyh0ZCxcImFjdGlvbi1oZWFkZXJcIikuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIikuc3R5bGUoXCJmb250LXNpemVcIixcIjE2cHhcIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKS50ZXh0KFwiRXhwbG9yZSBhbmQgUmVmaW5lXCIpLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgICAgICAgIHZhciB0aXRsZV9yb3cgPSBkM19jbGFzcyh0ZCxcInRpdGxlLXJvd1wiKVxuXG4gICAgICAgICAgdmFyIGV4cGFuc2lvbl9yb3cgPSBkM19jbGFzcyh0ZCxcImV4cGFuc2lvbi1yb3dcIilcbiAgICAgICAgICB2YXIgZm9vdGVyX3JvdyA9IGQzX2NsYXNzKHRkLFwiZm9vdGVyLXJvd1wiKS5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjEwcHhcIikuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIxNXB4XCIpXG5cbiAgICAgICAgICBmdW5jdGlvbiBidWlsZEZpbHRlcklucHV0KHgpIHtcbiAgICAgICAgICAgICAgdGhpcy5vbihcInNvbWV0aGluZ1wiKSh4KVxuICAgICAgICAgICAgICAvL3NlbGVjdF92YWx1ZS52YWx1ZSArPSAoc2VsZWN0X3ZhbHVlLnZhbHVlID8gXCIsXCIgOiBcIlwiKSArIHgua2V5XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxNnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiNDBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiNXB4XCIpXG4gICAgICAgICAgICAudGV4dChcIkJlZm9yZSBhbmQgQWZ0ZXI6IFwiICsgZC5kb21haW4pXG5cbiAgICAgICAgICB2YXIgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgICAge1wia2V5XCI6XCJBbGxcIixcInZhbHVlXCI6XCJhbGxcIiwgXCJzZWxlY3RlZFwiOjF9XG4gICAgICAgICAgICAsIHtcImtleVwiOlwiQ29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcImNvbnNpZGVyYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgICAsIHtcImtleVwiOlwiVmFsaWRhdGlvblwiLFwidmFsdWVcIjpcInZhbGlkYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgXVxuXG4gICAgICAgICAgdmFyIHRzdyA9IDI1MDtcblxuICAgICAgICAgIHZhciB0aW1lc2VyaWVzID0gZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJ0aW1lc2VyaWVzXCIsXCJzdmdcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIilcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIix0c3cgKyBcInB4XCIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLFwiNzBweFwiKVxuXG5cblxuICAgICAgICAgIHZhciBiZWZvcmVfcm9sbHVwID0gZDMubmVzdCgpXG4gICAgICAgICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldH0pXG4gICAgICAgICAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGQzLnN1bSh4LHkgPT4geS52aXNpdHMpIH0pXG4gICAgICAgICAgICAubWFwKGJlZm9yZV91cmxzKVxuXG4gICAgICAgICAgdmFyIGFmdGVyX3JvbGx1cCA9IGQzLm5lc3QoKVxuICAgICAgICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiBcIi1cIiArIHgudGltZV9kaWZmX2J1Y2tldH0pXG4gICAgICAgICAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGQzLnN1bSh4LHkgPT4geS52aXNpdHMpIH0pXG4gICAgICAgICAgICAubWFwKGFmdGVyX3VybHMpXG5cbiAgICAgICAgICB2YXIgb3ZlcmFsbF9yb2xsdXAgPSBidWNrZXRzLm1hcCh4ID0+IGJlZm9yZV9yb2xsdXBbeF0gfHwgYWZ0ZXJfcm9sbHVwW3hdIHx8IDApXG5cblxuXG4gICAgICAgICAgc2ltcGxlVGltZXNlcmllcyh0aW1lc2VyaWVzLG92ZXJhbGxfcm9sbHVwLHRzdylcbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwibWlkZGxlXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCA1NSlcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIHRzdy8yKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdHN3LzIpXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwibWlkZGxlLXRleHRcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCB0c3cvMilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCA2NylcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC50ZXh0KFwiT24tc2l0ZVwiKVxuXG5cbiAgICAgICAgICB2YXIgYmVmb3JlX3BvcywgYWZ0ZXJfcG9zO1xuXG4gICAgICAgICAgYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICAgaWYgKHN0YWdlcy5jb25zaWRlcmF0aW9uID09IHgpIGJlZm9yZV9wb3MgPSBpXG4gICAgICAgICAgICAgaWYgKHN0YWdlcy52YWxpZGF0aW9uID09IHgpIGFmdGVyX3BvcyA9IGlcblxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICB2YXIgdW5pdF9zaXplID0gdHN3L2J1Y2tldHMubGVuZ3RoXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYmVmb3JlXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMzkpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIDQ1KVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCB1bml0X3NpemUqYmVmb3JlX3BvcylcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKmJlZm9yZV9wb3MpXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYmVmb3JlLXRleHRcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCB1bml0X3NpemUqYmVmb3JlX3BvcyAtIDgpXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgNDgpXG5cbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgICAgICAgIC50ZXh0KFwiQ29uc2lkZXJhdGlvblwiKVxuXG4gICAgICAgICAgZDNfY2xhc3ModGltZXNlcmllcyxcIndpbmRvd1wiLFwibGluZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgICAuYXR0cihcInkxXCIsIDQ1KVxuICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCA0NSlcbiAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgdW5pdF9zaXplKihiZWZvcmVfcG9zKSlcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkrMSlcblxuXG4gICAgICAgICAgZDNfY2xhc3ModGltZXNlcmllcyxcImFmdGVyXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMzkpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIDQ1KVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCB1bml0X3NpemUqKGFmdGVyX3BvcysxKSlcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkpXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYWZ0ZXItdGV4dFwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHVuaXRfc2l6ZSooYWZ0ZXJfcG9zKzEpICsgOClcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCA0OClcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJzdGFydFwiKVxuICAgICAgICAgICAgLnRleHQoXCJWYWxpZGF0aW9uXCIpXG5cblxuXG4gICAgICAgICAgZnVuY3Rpb24gc2VsZWN0T3B0aW9uUmVjdChvcHRpb25zKSB7XG5cbiAgICAgICAgICAgIHZhciBzdWJzZXQgPSB0ZC5zZWxlY3RBbGwoXCJzdmdcIikuc2VsZWN0QWxsKFwicmVjdFwiKVxuICAgICAgICAgICAgICAuYXR0cihcImZpbGxcIix1bmRlZmluZWQpLmZpbHRlcigoeCxpKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcImFsbFwiKSByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJjb25zaWRlcmF0aW9uXCIpIHJldHVybiAoaSA8IGJlZm9yZV9wb3MpIHx8IChpID4gYnVja2V0cy5sZW5ndGgvMiAtIDEgKVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcInZhbGlkYXRpb25cIikgcmV0dXJuIChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKVxuICAgICAgICAgICAgICB9KVxuXG5cbiAgICAgICAgICAgIHN1YnNldC5hdHRyKFwiZmlsbFwiLFwiZ3JleVwiKVxuICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICBzZWxlY3RPcHRpb25SZWN0KG9wdGlvbnMpXG5cbiAgICAgICAgICB2YXIgb3B0cyA9IGQzX2NsYXNzKHN1bW1hcnlfcm93LFwib3B0aW9uc1wiLFwiZGl2XCIsb3B0aW9ucylcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImFic29sdXRlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRvcFwiLFwiMzVweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibGVmdFwiLFwiMjAwcHhcIilcblxuXG4gICAgICAgICAgZnVuY3Rpb24gYnVpbGRPcHRpb25zKG9wdGlvbnMpIHtcblxuXG4gICAgICAgICAgICBkM19zcGxhdChvcHRzLFwiLnNob3ctYnV0dG9uXCIsXCJhXCIsb3B0aW9ucyx4ID0+IHgua2V5KVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInNob3ctYnV0dG9uXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLHggPT4geC5zZWxlY3RlZClcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE4cHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCI1cHhcIilcbiAgICAgICAgICAgICAgLnRleHQoeCA9PiB4LmtleSlcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fLm1hcCh6ID0+IHouc2VsZWN0ZWQgPSAwKVxuICAgICAgICAgICAgICAgIHguc2VsZWN0ZWQgPSAxXG4gICAgICAgICAgICAgICAgYnVpbGRPcHRpb25zKHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXylcbiAgICAgICAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcImNvbnNpZGVyYXRpb25cIikge1xuICAgICAgICAgICAgICAgICAgYnVpbGRVcmxTZWxlY3Rpb24oY29uc2lkZXJhdGlvbl90b19kcmF3KVxuICAgICAgICAgICAgICAgICAgYnVpbGRLZXl3b3JkU2VsZWN0aW9uKGNvbnNpZGVyYXRpb25fa3dfdG9fZHJhdylcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHgudmFsdWUgPT0gXCJ2YWxpZGF0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgIGJ1aWxkVXJsU2VsZWN0aW9uKHZhbGlkYXRpb25fdG9fZHJhdylcbiAgICAgICAgICAgICAgICAgIGJ1aWxkS2V5d29yZFNlbGVjdGlvbih2YWxpZGF0aW9uX2t3X3RvX2RyYXcpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGJ1aWxkVXJsU2VsZWN0aW9uKHRvX2RyYXcpXG4gICAgICAgICAgICAgICAgICBidWlsZEtleXdvcmRTZWxlY3Rpb24oa3dfdG9fZHJhdylcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZWxlY3RPcHRpb25SZWN0KHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXylcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgIH1cblxuICAgICAgICAgIGJ1aWxkT3B0aW9ucyhvcHRpb25zKVxuXG4gICAgICAgICAgZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJkZXNjcmlwdGlvblwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMjBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidG9wXCIsXCIzNXB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJyaWdodFwiLFwiMjAwcHhcIilcbiAgICAgICAgICAgIC50ZXh0KFwiU2VsZWN0IGRvbWFpbnMgYW5kIGtleXdvcmRzIHRvIGJ1aWxkIGFuZCByZWZpbmUgeW91ciBnbG9iYWwgZmlsdGVyXCIpXG5cblxuXG5cblxuICAgICAgICAgIHZhciB1cmxzX3N1bW1hcnkgPSBkM19jbGFzcyhzdW1tYXJ5X3JvdyxcInVybHMtc3VtbWFyeVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICB2YXIga3dzX3N1bW1hcnkgPSBkM19jbGFzcyhzdW1tYXJ5X3JvdyxcImt3cy1zdW1tYXJ5XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM19jbGFzcyh1cmxzX3N1bW1hcnksXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTRweFwiKVxuICAgICAgICAgICAgLnRleHQoXCJVUkwgU3VtbWFyeVwiKVxuXG4gICAgICAgICAgZDNfY2xhc3Moa3dzX3N1bW1hcnksXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTRweFwiKVxuICAgICAgICAgICAgLnRleHQoXCJLZXl3b3JkIFN1bW1hcnlcIilcblxuXG5cbiAgICAgICAgICB2YXIgY29uc2lkZXJhdGlvbl9idWNrZXRzID0gYnVja2V0cy5maWx0ZXIoKHgsaSkgPT4gISgoaSA8IGJlZm9yZV9wb3MpIHx8IChpID4gYnVja2V0cy5sZW5ndGgvMiAtIDEgKSkgKVxuICAgICAgICAgICAgLCB2YWxpZGF0aW9uX2J1Y2tldHMgPSBidWNrZXRzLmZpbHRlcigoeCxpKSA9PiAhKChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKSkgKVxuXG4gICAgICAgICAgdmFyIGNvbnNpZGVyYXRpb25fdG9fZHJhdyA9IHRvX2RyYXcuZmlsdGVyKHggPT4gY29uc2lkZXJhdGlvbl9idWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7IHAgKz0geFtjXSB8fCAwOyByZXR1cm4gcH0sMCkgKVxuICAgICAgICAgICAgLCB2YWxpZGF0aW9uX3RvX2RyYXcgPSB0b19kcmF3LmZpbHRlcih4ID0+IHZhbGlkYXRpb25fYnVja2V0cy5yZWR1Y2UoKHAsYykgPT4geyBwICs9IHhbY10gfHwgMDsgcmV0dXJuIHB9LDApIClcblxuICAgICAgICAgIGZ1bmN0aW9uIGF2Z1ZpZXdzKHRvX2RyYXcpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh0b19kcmF3LnJlZHVjZSgocCxjKSA9PiBwICsgYy50b3RhbCwwKS90b19kcmF3Lmxlbmd0aClcbiAgICAgICAgICB9XG4gICAgICAgICAgZnVuY3Rpb24gbWVkaWFuVmlld3ModG9fZHJhdykge1xuICAgICAgICAgICAgcmV0dXJuICh0b19kcmF3W3BhcnNlSW50KHRvX2RyYXcubGVuZ3RoLzIpXSB8fCB7fSkudG90YWwgfHwgMFxuICAgICAgICAgIH1cblxuXG4gICAgICAgICAgdmFyIHVybF9zdW1tYXJ5X2RhdGEgPSBbXG4gICAgICAgICAgICAgIHtcIm5hbWVcIjpcIkRpc3RpbmN0IFVSTHNcIiwgXCJhbGxcIjogdG9fZHJhdy5sZW5ndGgsIFwiY29uc2lkZXJhdGlvblwiOiBjb25zaWRlcmF0aW9uX3RvX2RyYXcubGVuZ3RoLCBcInZhbGlkYXRpb25cIjogdmFsaWRhdGlvbl90b19kcmF3Lmxlbmd0aCB9XG4gICAgICAgICAgICAsIHtcIm5hbWVcIjpcIkF2ZXJhZ2UgVmlld3NcIiwgXCJhbGxcIjogYXZnVmlld3ModG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBhdmdWaWV3cyhjb25zaWRlcmF0aW9uX3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogYXZnVmlld3ModmFsaWRhdGlvbl90b19kcmF3KSAgfVxuICAgICAgICAgICAgLCB7XCJuYW1lXCI6XCJNZWRpYW4gVmlld3NcIiwgXCJhbGxcIjogbWVkaWFuVmlld3ModG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBtZWRpYW5WaWV3cyhjb25zaWRlcmF0aW9uX3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogbWVkaWFuVmlld3ModmFsaWRhdGlvbl90b19kcmF3KSAgfVxuICAgICAgICAgIF1cblxuICAgICAgICAgIHZhciB1d3JhcCA9IGQzX2NsYXNzKHVybHNfc3VtbWFyeSxcIndyYXBcIikuc3R5bGUoXCJ3aWR0aFwiLFwiOTAlXCIpXG5cblxuICAgICAgICAgIHRhYmxlKHV3cmFwKVxuICAgICAgICAgICAgLmRhdGEoe1widmFsdWVzXCI6dXJsX3N1bW1hcnlfZGF0YX0pXG4gICAgICAgICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgICAgICAgIC5oZWFkZXJzKFtcbiAgICAgICAgICAgICAgICB7XCJrZXlcIjpcIm5hbWVcIixcInZhbHVlXCI6XCJcIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcImFsbFwiLFwidmFsdWVcIjpcIkFsbFwifVxuICAgICAgICAgICAgICAsIHtcImtleVwiOlwiY29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcIkNvbnNpZGVyYXRpb25cIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcInZhbGlkYXRpb25cIixcInZhbHVlXCI6XCJWYWxpZGF0aW9uXCJ9XG4gICAgICAgICAgICBdKVxuICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgICAgLl90YXJnZXQuc2VsZWN0QWxsKFwiLnRhYmxlLXdyYXBwZXJcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidGFibGUtd3JhcHBlclwiLGZhbHNlKVxuXG5cbiAgICAgICAgICB2YXIgY29uc2lkZXJhdGlvbl9rd190b19kcmF3ID0ga3dfdG9fZHJhdy5maWx0ZXIoeCA9PiBjb25zaWRlcmF0aW9uX2J1Y2tldHMucmVkdWNlKChwLGMpID0+IHsgcCArPSB4W2NdIHx8IDA7IHJldHVybiBwfSwwKSApXG4gICAgICAgICAgICAsIHZhbGlkYXRpb25fa3dfdG9fZHJhdyA9IGt3X3RvX2RyYXcuZmlsdGVyKHggPT4gdmFsaWRhdGlvbl9idWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7IHAgKz0geFtjXSB8fCAwOyByZXR1cm4gcH0sMCkgKVxuXG5cbiAgICAgICAgICB2YXIga3dzX3N1bW1hcnlfZGF0YSA9IFtcbiAgICAgICAgICAgICAge1wibmFtZVwiOlwiRGlzdGluY3QgS2V5d29yZHNcIiwgXCJhbGxcIjoga3dfdG9fZHJhdy5sZW5ndGgsIFwiY29uc2lkZXJhdGlvblwiOiBjb25zaWRlcmF0aW9uX2t3X3RvX2RyYXcubGVuZ3RoLCBcInZhbGlkYXRpb25cIjogdmFsaWRhdGlvbl9rd190b19kcmF3Lmxlbmd0aCB9XG4gICAgICAgICAgICAsIHtcIm5hbWVcIjpcIkF2ZXJhZ2UgVmlld3NcIiwgXCJhbGxcIjogYXZnVmlld3Moa3dfdG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBhdmdWaWV3cyhjb25zaWRlcmF0aW9uX2t3X3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogYXZnVmlld3ModmFsaWRhdGlvbl9rd190b19kcmF3KSAgfVxuICAgICAgICAgICAgLCB7XCJuYW1lXCI6XCJNZWRpYW4gVmlld3NcIiwgXCJhbGxcIjogbWVkaWFuVmlld3Moa3dfdG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBtZWRpYW5WaWV3cyhjb25zaWRlcmF0aW9uX2t3X3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogbWVkaWFuVmlld3ModmFsaWRhdGlvbl9rd190b19kcmF3KSAgfVxuICAgICAgICAgIF1cblxuICAgICAgICAgIHZhciBrd3JhcCA9IGQzX2NsYXNzKGt3c19zdW1tYXJ5LFwid3JhcFwiKS5zdHlsZShcIndpZHRoXCIsXCI5MCVcIilcblxuICAgICAgICAgIHRhYmxlKGt3cmFwKVxuICAgICAgICAgICAgLmRhdGEoe1widmFsdWVzXCI6a3dzX3N1bW1hcnlfZGF0YX0pXG4gICAgICAgICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgICAgICAgIC5oZWFkZXJzKFtcbiAgICAgICAgICAgICAgICB7XCJrZXlcIjpcIm5hbWVcIixcInZhbHVlXCI6XCJcIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcImFsbFwiLFwidmFsdWVcIjpcIkFsbFwifVxuICAgICAgICAgICAgICAsIHtcImtleVwiOlwiY29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcIkNvbnNpZGVyYXRpb25cIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcInZhbGlkYXRpb25cIixcInZhbHVlXCI6XCJWYWxpZGF0aW9uXCJ9XG4gICAgICAgICAgICBdKVxuICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgICAgLl90YXJnZXQuc2VsZWN0QWxsKFwiLnRhYmxlLXdyYXBwZXJcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidGFibGUtd3JhcHBlclwiLGZhbHNlKVxuXG5cblxuXG5cbiAgICAgICAgICB2YXIgZXVoID0gZDNfY2xhc3ModGl0bGVfcm93LFwiZXhwYW5zaW9uLXVybHMtdGl0bGVcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICAgICAgZDNfY2xhc3MoZXVoLFwidGl0bGVcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjVweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICAgICAgICAudGV4dChcIlVSTFwiKVxuXG4gICAgICAgICAgZDNfY2xhc3MoZXVoLFwidmlld1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuICAgICAgICAgICAgLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgICAgICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhldWgsXCJsZWdlbmRcIixcInN2Z1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCIuYmVmb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjMwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkJlZm9yZVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwiLmFmdGVyXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjkwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkFmdGVyXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNilcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDYwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNjApXG5cblxuXG5cbiAgICAgICAgICB2YXIgZWtoID0gZDNfY2xhc3ModGl0bGVfcm93LFwiZXhwYW5zaW9uLWt3cy10aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICBkM19jbGFzcyhla2gsXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI2NXB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAudGV4dChcIktleXdvcmRzXCIpXG5cbiAgICAgICAgICBkM19jbGFzcyhla2gsXCJ2aWV3XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgICAgICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhla2gsXCJsZWdlbmRcIixcInN2Z1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbi5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCIuYmVmb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjMwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkJlZm9yZVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwiLmFmdGVyXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjkwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkFmdGVyXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNilcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDYwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNjApXG5cblxuXG5cblxuXG5cbiAgICAgICAgICBmdW5jdGlvbiBidWlsZFVybFNlbGVjdGlvbih0b19kcmF3KSB7XG4gICAgICAgICAgICB2YXIgZXhwYW5zaW9uID0gZDNfY2xhc3MoZXhwYW5zaW9uX3JvdyxcImV4cGFuc2lvbi11cmxzXCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwic2Nyb2xsYm94XCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwibWF4LWhlaWdodFwiLFwiMjUwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcInNjcm9sbFwiKVxuXG4gICAgICAgICAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG4gICAgICAgICAgICB2YXIgdXJsX3JvdyA9IGQzX3NwbGF0KGV4cGFuc2lvbixcIi51cmwtcm93XCIsXCJkaXZcIix0b19kcmF3LnNsaWNlKDAsNTAwKSxmdW5jdGlvbih4KSB7IHJldHVybiB4LnVybCB9KVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInVybC1yb3dcIix0cnVlKVxuXG4gICAgICAgICAgICB2YXIgdXJsX25hbWUgPSBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubmFtZVwiLFwiZGl2XCIpLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI2MHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm92ZXJmbG93XCIsXCJoaWRkZW5cIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUodXJsX25hbWUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZDNfY2xhc3ModXJsX25hbWUsXCJ1cmxcIiwgXCJhXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LW92ZXJmbG93XCIsXCJlbGxpcHNpc1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjM1cHhcIilcbiAgICAgICAgICAgICAgLnRleHQoeCA9PiB4LnVybC5zcGxpdChkLmRvbWFpbilbMV0gfHwgeC51cmwgKVxuICAgICAgICAgICAgICAuYXR0cihcImhyZWZcIiwgeCA9PiB4LnVybClcbiAgICAgICAgICAgICAgLmF0dHIoXCJ0YXJnZXRcIiwgXCJfYmxhbmtcIilcblxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm51bWJlclwiLFwiZGl2XCIpLmNsYXNzZWQoXCJudW1iZXJcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxM3B4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4gZDMuc3VtKGJ1Y2tldHMubWFwKGZ1bmN0aW9uKGIpIHsgcmV0dXJuIHhbYl0gfHwgMCB9KSkgfSlcblxuXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIucGxvdFwiLFwic3ZnXCIpLmNsYXNzZWQoXCJwbG90XCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBidWNrZXRzLm1hcChmdW5jdGlvbihiKSB7IHJldHVybiB4W2JdIHx8IDAgfSlcbiAgICAgICAgICAgICAgICBzaW1wbGVUaW1lc2VyaWVzKGR0aGlzLHZhbHVlcywxMjAsMjApXG4gICAgICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShkdGhpcyxcImxpbmVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAyMClcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgNjApXG4gICAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIDYwKVxuXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgICBmdW5jdGlvbiBidWlsZEtleXdvcmRTZWxlY3Rpb24oa3dfdG9fZHJhdykge1xuICAgICAgICAgICAgdmFyIGV4cGFuc2lvbiA9IGQzX2NsYXNzKGV4cGFuc2lvbl9yb3csXCJleHBhbnNpb24ta2V5d29yZHNcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzY3JvbGxib3hcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwibWF4LWhlaWdodFwiLFwiMjUwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcInNjcm9sbFwiKVxuXG4gICAgICAgICAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG4gICAgICAgICAgICB2YXIgdXJsX3JvdyA9IGQzX3NwbGF0KGV4cGFuc2lvbixcIi51cmwtcm93XCIsXCJkaXZcIixrd190b19kcmF3LnNsaWNlKDAsNTAwKSxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInVybC1yb3dcIix0cnVlKVxuXG4gICAgICAgICAgICB2YXIga3dfbmFtZSA9IGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5uYW1lXCIsXCJkaXZcIikuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjYwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcImhpZGRlblwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcblxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShrd19uYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZDNfY2xhc3Moa3dfbmFtZSxcInVybFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LW92ZXJmbG93XCIsXCJlbGxpcHNpc1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjIzNXB4XCIpXG4gICAgICAgICAgICAgIC50ZXh0KHggPT4geC5rZXkgKVxuXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubnVtYmVyXCIsXCJkaXZcIikuY2xhc3NlZChcIm51bWJlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEzcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKSB9KVxuXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5wbG90XCIsXCJzdmdcIikuY2xhc3NlZChcInBsb3RcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlcyA9IGJ1Y2tldHMubWFwKGZ1bmN0aW9uKGIpIHsgcmV0dXJuIHhbYl0gfHwgMCB9KVxuICAgICAgICAgICAgICAgIHNpbXBsZVRpbWVzZXJpZXMoZHRoaXMsdmFsdWVzLDEyMCwyMClcbiAgICAgICAgICAgICAgICBkM191cGRhdGVhYmxlKGR0aGlzLFwibGluZVwiLFwibGluZVwiKVxuICAgICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIDIwKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCA2MClcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNjApXG5cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBidWlsZFVybFNlbGVjdGlvbih0b19kcmF3KVxuICAgICAgICAgIGJ1aWxkS2V5d29yZFNlbGVjdGlvbihrd190b19kcmF3KVxuXG5cblxuXG5cbiAgfVxuXG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQgdGltZV9zZXJpZXMgZnJvbSAnLi4vdGltZXNlcmllcydcbmltcG9ydCByZWZpbmUgZnJvbSAnLi9yZWZpbmUnXG5cblxuaW1wb3J0IHtkcmF3U3RyZWFtfSBmcm9tICcuL3N1bW1hcnlfdmlldydcbmltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnLi9zdW1tYXJ5X3ZpZXcnXG5cbmZ1bmN0aW9uIG5vb3AoKXt9XG5cbmZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSxkYXRhKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5cIiArIGNscywgdHlwZSB8fCBcImRpdlwiLGRhdGEpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVsYXRpdmVfdGltaW5nKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFJlbGF0aXZlVGltaW5nKHRhcmdldClcbn1cblxuY2xhc3MgUmVsYXRpdmVUaW1pbmcge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vbiA9IHt9XG4gIH1cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG5cbiAgb24oYWN0aW9uLCBmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICBkcmF3KCkge1xuXG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgdmFyIHdyYXAgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJzdW1tYXJ5LXdyYXBcIilcblxuICAgIGhlYWRlcih3cmFwKVxuICAgICAgLnRleHQoXCJCZWZvcmUgYW5kIEFmdGVyXCIpXG4gICAgICAuZHJhdygpXG5cbiAgICB2YXIgYmF3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmJhLXJvd1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJiYS1yb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiNjBweFwiKVxuXG4gICAgdHJ5IHtcbiAgICAgIHZhciBzdGFnZXMgPSBkcmF3U3RyZWFtKGJhd3JhcCx0aGlzLl9kYXRhLmJlZm9yZV9jYXRlZ29yaWVzLHRoaXMuX2RhdGEuYWZ0ZXJfY2F0ZWdvcmllcylcbiAgICAgIGJhd3JhcC5zZWxlY3RBbGwoXCIuYmVmb3JlLXN0cmVhbVwiKS5yZW1vdmUoKSAvLyBIQUNLXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBiYXdyYXAuaHRtbChcIlwiKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX2RhdGEuYmVmb3JlX2NhdGVnb3JpZXNbMF0udmFsdWVzXG5cblxuICAgIHZhciBjYXRlZ29yeV9tdWx0aXBsaWVycyA9IGRhdGEuYmVmb3JlX2NhdGVnb3JpZXMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIHBbYy5rZXldID0gKDEgKyBjLnZhbHVlc1swXS5wZXJjZW50X2RpZmYpXG4gICAgICByZXR1cm4gcFxuICAgIH0se30pXG5cblxuICAgIHZhciB0YWJ1bGFyX2RhdGEgPSB0aGlzLl9kYXRhLmJlZm9yZS5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgcFtjLmRvbWFpbl0gPSBwW2MuZG9tYWluXSB8fCB7fVxuICAgICAgcFtjLmRvbWFpbl1bJ2RvbWFpbiddID0gYy5kb21haW5cbiAgICAgIHBbYy5kb21haW5dWyd3ZWlnaHRlZCddID0gYy52aXNpdHMgKiBjYXRlZ29yeV9tdWx0aXBsaWVyc1tjLnBhcmVudF9jYXRlZ29yeV9uYW1lXVxuICAgICAgXG4gICAgICBwW2MuZG9tYWluXVtjLnRpbWVfZGlmZl9idWNrZXRdID0gKHBbYy5kb21haW5dW2MudGltZV9kaWZmX2J1Y2tldF0gfHwgMCkgKyBjLnZpc2l0c1xuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KVxuXG4gICAgdGFidWxhcl9kYXRhID0gdGhpcy5fZGF0YS5hZnRlci5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgcFtjLmRvbWFpbl0gPSBwW2MuZG9tYWluXSB8fCB7fSBcbiAgICAgIHBbYy5kb21haW5dWydkb21haW4nXSA9IGMuZG9tYWluXG4gICAgICBwW2MuZG9tYWluXVtcIi1cIiArIGMudGltZV9kaWZmX2J1Y2tldF0gPSAocFtjLmRvbWFpbl1bYy50aW1lX2RpZmZfYnVja2V0XSB8fCAwKSArIGMudmlzaXRzXG5cbiAgICAgIHJldHVybiBwXG4gICAgfSx0YWJ1bGFyX2RhdGEpXG5cbiAgICB2YXIgc29ydGVkX3RhYnVsYXIgPSBPYmplY3Qua2V5cyh0YWJ1bGFyX2RhdGEpLm1hcCgoaykgPT4ge1xuICAgICAgcmV0dXJuIHRhYnVsYXJfZGF0YVtrXVxuICAgIH0pLnNvcnQoKHAsYykgPT4ge1xuICAgICAgXG4gICAgICByZXR1cm4gZDMuZGVzY2VuZGluZyhwWyc2MDAnXSpwLndlaWdodGVkIHx8IC1JbmZpbml0eSxjWyc2MDAnXSpjLndlaWdodGVkIHx8IC1JbmZpbml0eSlcbiAgICB9KVxuXG5cblxuXG4gICAgdmFyIGJ1Y2tldHMgPSBbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5yZXZlcnNlKCkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZyh4KjYwKSB9KVxuICAgIGJ1Y2tldHMgPSBidWNrZXRzLmNvbmNhdChbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKC14KjYwKSB9KSlcblxuXG4gICAgdmFyIGZvcm1hdE5hbWUgPSBmdW5jdGlvbih4KSB7XG5cbiAgICAgIGlmICh4IDwgMCkgeCA9IC14XG5cbiAgICAgIGlmICh4ID09IDM2MDApIHJldHVybiBcIjEgaHJcIlxuICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICByZXR1cm4geC8zNjAwICsgXCIgaHJzXCJcbiAgICB9XG5cbiAgICBiYXdyYXAuc2VsZWN0QWxsKFwiLnRhYmxlLXdyYXBwZXJcIikuaHRtbChcIlwiKVxuXG4gICAgdmFyIHRhYmxlX29iaiA9IHRhYmxlKGJhd3JhcClcbiAgICAgIC50b3AoMTQwKVxuICAgICAgLmhlYWRlcnMoXG4gICAgICAgIFt7XCJrZXlcIjpcImRvbWFpblwiLCBcInZhbHVlXCI6XCJEb21haW5cIn1dLmNvbmNhdChcbiAgICAgICAgICBidWNrZXRzLm1hcCh4ID0+IHsgcmV0dXJuIHtcImtleVwiOngsIFwidmFsdWVcIjpmb3JtYXROYW1lKHgpLCBcInNlbGVjdGVkXCI6dHJ1ZX0gfSlcbiAgICAgICAgKVxuICAgICAgICBcbiAgICAgIClcbiAgICAgIC5vbihcImV4cGFuZFwiLGZ1bmN0aW9uKGQpIHtcblxuICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImbmRhc2g7XCIpXG4gICAgICAgICAgaWYgKHRoaXMubmV4dFNpYmxpbmcgJiYgZDMuc2VsZWN0KHRoaXMubmV4dFNpYmxpbmcpLmNsYXNzZWQoXCJleHBhbmRlZFwiKSA9PSB0cnVlKSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKFwidGQub3B0aW9uLWhlYWRlclwiKS5odG1sKFwiJiM2NTI5MTtcIilcbiAgICAgICAgICAgIHJldHVybiBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICAgICAgICB2YXIgdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG4gICAgICAgICAgdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0LCB0aGlzLm5leHRTaWJsaW5nKTsgIFxuXG5cbiAgICAgICAgICB2YXIgdHIgPSBkMy5zZWxlY3QodCkuY2xhc3NlZChcImV4cGFuZGVkXCIsdHJ1ZSkuZGF0dW0oe30pXG4gICAgICAgICAgdmFyIHRkID0gZDNfdXBkYXRlYWJsZSh0cixcInRkXCIsXCJ0ZFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsdGhpcy5jaGlsZHJlbi5sZW5ndGgpXG4gICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgICAgIHZhciBiZWZvcmVfdXJscyA9IGRhdGEuYmVmb3JlLmZpbHRlcih5ID0+IHkuZG9tYWluID09IGQuZG9tYWluKVxuICAgICAgICAgIHZhciBhZnRlcl91cmxzID0gZGF0YS5hZnRlci5maWx0ZXIoeSA9PiB5LmRvbWFpbiA9PSBkLmRvbWFpbilcblxuICAgICAgICAgIHJlZmluZSh0ZClcbiAgICAgICAgICAgIC5kYXRhKGQpXG4gICAgICAgICAgICAuc3RhZ2VzKHN0YWdlcylcbiAgICAgICAgICAgIC5iZWZvcmVfdXJscyhiZWZvcmVfdXJscylcbiAgICAgICAgICAgIC5hZnRlcl91cmxzKGFmdGVyX3VybHMpXG4gICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKVxuICAgICAgICAgICAgLmRyYXcoKVxuXG4gICAgICAgIH0pXG4gICAgICAub3B0aW9uX3RleHQoXCI8ZGl2IHN0eWxlPSd3aWR0aDo0MHB4O3RleHQtYWxpZ246Y2VudGVyJz4mIzY1MjkxOzwvZGl2PlwiKVxuICAgICAgLy8uc29ydChcIjYwMFwiKVxuICAgICAgLmRhdGEoe1widmFsdWVzXCI6c29ydGVkX3RhYnVsYXIuc2xpY2UoMCwxMDAwKX0pXG4gICAgICAuZHJhdygpXG5cbiAgICB0YWJsZV9vYmouX3RhcmdldC5zZWxlY3RBbGwoXCJ0aFwiKVxuICAgICAgLy8uc3R5bGUoXCJ3aWR0aFwiLHggPT4gKHBhcnNlSW50KHgua2V5KSA9PSB4LmtleSkgPyBcIjMxcHhcIiA6IHVuZGVmaW5lZCApXG4gICAgICAvLy5zdHlsZShcIm1heC13aWR0aFwiLHggPT4gKHBhcnNlSW50KHgua2V5KSA9PSB4LmtleSkgPyBcIjMxcHhcIiA6IHVuZGVmaW5lZCApXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmlnaHRcIixcIjFweCByZ2JhKDAsMCwwLC4xKVwiKVxuICAgICAgLnNlbGVjdEFsbChcInNwYW5cIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIiwgZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgaWYgKHBhcnNlSW50KHgua2V5KSA9PSB4LmtleSAmJiB4LmtleSA8IDApIHJldHVybiBcImZvbnQtc2l6ZTouOWVtO3dpZHRoOjcwcHg7dHJhbnNmb3JtOnJvdGF0ZSgtNDVkZWcpO2Rpc3BsYXk6aW5saW5lLWJsb2NrO21hcmdpbi1sZWZ0Oi05cHg7bWFyZ2luLWJvdHRvbTogMTJweFwiXG4gICAgICAgIGlmIChwYXJzZUludCh4LmtleSkgPT0geC5rZXkgJiYgeC5rZXkgPiAwKSByZXR1cm4gXCJmb250LXNpemU6LjllbTt3aWR0aDo3MHB4O3RyYW5zZm9ybTpyb3RhdGUoNDVkZWcpO3RleHQtYWxpZ246cmlnaHQ7ZGlzcGxheTppbmxpbmUtYmxvY2s7bWFyZ2luLWxlZnQ6IC00OHB4OyBtYXJnaW4tYm90dG9tOiAxMnB4O1wiXG5cbiAgICAgIH0pXG5cblxuICAgIHRhYmxlX29iai5fdGFyZ2V0LnNlbGVjdEFsbChcIi50YWJsZS1vcHRpb25cIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcIm5vbmVcIilcblxuXG4gICAgdmFyIG1heCA9IHNvcnRlZF90YWJ1bGFyLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhjKS5maWx0ZXIoeiA9PiB6ICE9IFwiZG9tYWluXCIgJiYgeiAhPSBcIndlaWdodGVkXCIpLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHAgPSBjW3hdID4gcCA/IGNbeF0gOiBwXG4gICAgICB9KVxuICAgIFxuICAgICAgcmV0dXJuIHBcbiAgICB9LDApXG5cbiAgICB2YXIgb3NjYWxlID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoWzAsLjhdKS5kb21haW4oWzAsTWF0aC5sb2cobWF4KV0pXG5cbiAgICB0YWJsZV9vYmouX3RhcmdldC5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpub3QoOmZpcnN0LWNoaWxkKVwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJpZ2h0XCIsXCIxcHggc29saWQgd2hpdGVcIilcbiAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMHB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfX1t4WydrZXknXV0gfHwgMFxuICAgICAgICByZXR1cm4gXCJyZ2JhKDcwLCAxMzAsIDE4MCxcIiArIG9zY2FsZShNYXRoLmxvZyh2YWx1ZSsxKSkgKyBcIilcIlxuICAgICAgfSlcblxuXG5cblxuXG5cbiAgICAgIFxuXG5cblxuICAgIC8vdmFyIHQgPSB0YWJsZS50YWJsZShfZXhwbG9yZSlcbiAgICAvLyAgLmRhdGEoc2VsZWN0ZWQpXG5cblxuXG4gICAgXG4gIH1cbn1cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCB0YWJsZSBmcm9tICd0YWJsZSdcbmltcG9ydCByZWZpbmUgZnJvbSAnLi9yZWZpbmUnXG5pbXBvcnQgKiBhcyB0aW1lc2VyaWVzIGZyb20gJy4uL3RpbWVzZXJpZXMnXG5pbXBvcnQgZG9tYWluX2V4cGFuZGVkIGZyb20gJy4vZG9tYWluX2V4cGFuZGVkJ1xuXG5cblxuXG5pbXBvcnQge2RyYXdTdHJlYW19IGZyb20gJy4vc3VtbWFyeV92aWV3J1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICcuL3N1bW1hcnlfdmlldydcblxuZnVuY3Rpb24gbm9vcCgpe31cblxuZnVuY3Rpb24gZDNfY2xhc3ModGFyZ2V0LGNscyx0eXBlLGRhdGEpIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLlwiICsgY2xzLCB0eXBlIHx8IFwiZGl2XCIsZGF0YSlcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZnVuY3Rpb24gZm9ybWF0SG91cihoKSB7XG4gIGlmIChoID09IDApIHJldHVybiBcIjEyIGFtXCJcbiAgaWYgKGggPT0gMTIpIHJldHVybiBcIjEyIHBtXCJcbiAgaWYgKGggPiAxMikgcmV0dXJuIChoLTEyKSArIFwiIHBtXCJcbiAgcmV0dXJuIChoIDwgMTAgPyBoWzFdIDogaCkgKyBcIiBhbVwiXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdGltaW5nKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFRpbWluZyh0YXJnZXQpXG59XG5cbmNsYXNzIFRpbWluZyB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuX29uID0ge31cbiAgfVxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcblxuICBvbihhY3Rpb24sIGZuKSB7XG4gICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuXG4gIGRyYXcoKSB7XG5cblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YVxuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwidGltaW5nLXdyYXBcIilcblxuICAgIGhlYWRlcih3cmFwKVxuICAgICAgLnRleHQoXCJUaW1pbmdcIilcbiAgICAgIC5kcmF3KClcblxuICAgIHZhciB0aW1pbmd3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnRpbWluZy1yb3dcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwidGltaW5nLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCI2MHB4XCIpXG5cbiAgICAvLyBEQVRBXG4gICAgdmFyIGhvdXJidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkubWFwKHggPT4gU3RyaW5nKHgpLmxlbmd0aCA+IDEgPyBTdHJpbmcoeCkgOiBcIjBcIiArIHgpXG5cblxuICAgIHZhciBkID0gZDMubmVzdCgpXG4gICAgICAua2V5KHggPT4geC5kb21haW4pXG4gICAgICAua2V5KHggPT4geC5ob3VyKVxuICAgICAgLmVudHJpZXMoZGF0YS5mdWxsX3VybHMpXG5cbiAgICB2YXIgbWF4ID0gMFxuXG4gICAgZC5tYXAoeCA9PiB7XG4gICAgICB2YXIgb2JqID0geC52YWx1ZXMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgcFtjLmtleV0gPSBjLnZhbHVlc1xuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7fSlcblxuICAgICAgeC5idWNrZXRzID0gaG91cmJ1Y2tldHMubWFwKHogPT4ge1xuICAgICAgIFxuICAgICAgICB2YXIgbyA9IHtcbiAgICAgICAgICB2YWx1ZXM6IG9ialt6XSxcbiAgICAgICAgICBrZXk6IGZvcm1hdEhvdXIoeilcbiAgICAgICAgfVxuICAgICAgICBvLnZpZXdzID0gZDMuc3VtKG9ialt6XSB8fCBbXSwgcSA9PiBxLnVuaXF1ZXMpXG5cbiAgICAgICAgbWF4ID0gbWF4ID4gby52aWV3cyA/IG1heCA6IG8udmlld3NcbiAgICAgICAgcmV0dXJuIG9cbiAgICAgIH0pXG5cbiAgICAgIHgudGFidWxhciA9IHguYnVja2V0cy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBwW2Mua2V5XSA9IGMudmlld3MgfHwgdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICB4LnRhYnVsYXJbXCJkb21haW5cIl0gPSB4LmtleVxuICAgICAgeC50YWJ1bGFyW1widG90YWxcIl0gPSBkMy5zdW0oeC5idWNrZXRzLHggPT4geC52aWV3cylcblxuICAgICAgXG4gICAgICB4LnZhbHVlc1xuICAgIH0pXG5cbiAgICB2YXIgaGVhZGVycyA9IFtcbiAgICAgIHtrZXk6XCJkb21haW5cIix2YWx1ZTpcIkRvbWFpblwifVxuICAgIF1cblxuICAgIGhlYWRlcnMgPSBoZWFkZXJzLmNvbmNhdChob3VyYnVja2V0cy5tYXAoZm9ybWF0SG91cikubWFwKHggPT4geyByZXR1cm4ge2tleTogeCwgdmFsdWU6IHh9IH0pIClcbiAgICBcbiAgICB2YXIgb3NjYWxlID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoWzAsLjhdKS5kb21haW4oWzAsTWF0aC5sb2cobWF4KV0pXG5cblxuICAgIHZhciB0YWJsZV9vYmogPSB0YWJsZSh0aW1pbmd3cmFwKVxuICAgICAgLmhlYWRlcnMoaGVhZGVycylcbiAgICAgIC5kYXRhKHtcImtleVwiOlwiXCIsIFwidmFsdWVzXCI6ZC5tYXAoeCA9PiB4LnRhYnVsYXIpIH0pXG4gICAgICAuc29ydChcInRvdGFsXCIpXG4gICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgIC5vbihcImV4cGFuZFwiLGZ1bmN0aW9uKGQpIHtcblxuICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImbmRhc2g7XCIpXG4gICAgICAgICAgaWYgKHRoaXMubmV4dFNpYmxpbmcgJiYgZDMuc2VsZWN0KHRoaXMubmV4dFNpYmxpbmcpLmNsYXNzZWQoXCJleHBhbmRlZFwiKSA9PSB0cnVlKSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKFwidGQub3B0aW9uLWhlYWRlclwiKS5odG1sKFwiJiM2NTI5MTtcIilcbiAgICAgICAgICAgIHJldHVybiBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICAgICAgICB2YXIgdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG4gICAgICAgICAgdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0LCB0aGlzLm5leHRTaWJsaW5nKTsgIFxuXG4gICAgICAgICAgdmFyIHRyID0gZDMuc2VsZWN0KHQpLmNsYXNzZWQoXCJleHBhbmRlZFwiLHRydWUpLmRhdHVtKHt9KVxuICAgICAgICAgIHZhciB0ZCA9IGQzX3VwZGF0ZWFibGUodHIsXCJ0ZFwiLFwidGRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY29sc3BhblwiLHRoaXMuY2hpbGRyZW4ubGVuZ3RoKVxuICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2Y5ZjlmYlwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgICAgICB2YXIgZGQgPSBkYXRhLmZ1bGxfdXJscy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5kb21haW4gPT0gZC5kb21haW4gfSlcbiAgICAgICAgICB2YXIgcm9sbGVkID0gdGltZXNlcmllcy5wcmVwRGF0YShkZClcbiAgICAgICAgICBcbiAgICAgICAgICBkb21haW5fZXhwYW5kZWQodGQpXG4gICAgICAgICAgICAucmF3KGRkKVxuICAgICAgICAgICAgLmRhdGEocm9sbGVkKVxuICAgICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSh4KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5kcmF3KClcblxuICAgICAgICB9KVxuICAgICAgLmRyYXcoKVxuXG4gICAgdGFibGVfb2JqLl90YXJnZXQuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bm90KDpmaXJzdC1jaGlsZClcIilcbiAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkIHdoaXRlXCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjBweFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX19beFsna2V5J11dIHx8IDBcbiAgICAgICAgcmV0dXJuIFwicmdiYSg3MCwgMTMwLCAxODAsXCIgKyBvc2NhbGUoTWF0aC5sb2codmFsdWUrMSkpICsgXCIpXCJcbiAgICAgIH0pXG5cblxuXG5cbiAgICBcbiAgfVxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5cbmZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuXCIgKyBjbHMsIHR5cGUgfHwgXCJkaXZcIilcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3RhZ2VkX2ZpbHRlcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTdGFnZWRGaWx0ZXIodGFyZ2V0KVxufVxuXG5jbGFzcyBTdGFnZWRGaWx0ZXIge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vbiA9IHt9XG4gIH1cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG5cbiAgb24oYWN0aW9uLCBmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICBkcmF3KCkge1xuICAgIHZhciBvd3JhcCA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcImZvb3Rlci13cmFwXCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCI2MHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3R0b21cIixcIjBweFwiKVxuICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwMHB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjRjBGNEY3XCIpXG5cbiAgICB2YXIgd3JhcCA9IGQzX2NsYXNzKG93cmFwLFwiaW5uZXItd3JhcFwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXRvcFwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCI1cHhcIilcblxuICAgIGQzX2NsYXNzKHdyYXAsXCJoZWFkZXItbGFiZWxcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjE0cHhcIilcbiAgICAgIC5zdHlsZShcImNvbG9yXCIsXCIjODg4ODg4XCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC50ZXh0KFwiQnVpbGQgRmlsdGVyc1wiKVxuXG4gICAgZDNfY2xhc3Mod3JhcCxcInRleHQtbGFiZWxcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI2MHB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJub25lXCIpXG4gICAgICAudGV4dChcIlRpdGxlXCIpXG5cbiAgICB2YXIgc2VsZWN0X2JveCA9IHNlbGVjdCh3cmFwKVxuICAgICAgLm9wdGlvbnMoW1xuICAgICAgICAgIHtcImtleVwiOlwiY29udGFpbnNcIixcInZhbHVlXCI6XCJjb250YWluc1wifVxuICAgICAgICAsIHtcImtleVwiOlwiZG9lcyBub3QgY29udGFpblwiLFwidmFsdWVcIjpcImRvZXMgbm90IGNvbnRhaW5cIn1cbiAgICAgIF0pXG4gICAgICAuZHJhdygpXG4gICAgICAuX3NlbGVjdFxuICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cblxuXG5cbiAgICB2YXIgZm9vdGVyX3JvdyA9IGQzX2NsYXNzKHdyYXAsXCJmb290ZXItcm93XCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG4gICAgdmFyIHNlbGVjdF92YWx1ZSA9IHRoaXMuZGF0YSgpXG5cbiAgICBmdW5jdGlvbiBidWlsZEZpbHRlcklucHV0KCkge1xuXG4gICAgICBmb290ZXJfcm93LnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRlc3Ryb3kgPSBkMy5zZWxlY3QodGhpcykub24oXCJkZXN0cm95XCIpXG4gICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICB9KVxuXG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZvb3Rlcl9yb3csXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAuYXR0cihcInZhbHVlXCIsc2VsZWN0X3ZhbHVlKVxuICAgICAgICAucHJvcGVydHkoXCJ2YWx1ZVwiLHNlbGVjdF92YWx1ZSlcblxuICAgICAgXG5cblxuICAgICAgdmFyIHMgPSAkKHNlbGVjdC5ub2RlKCkpLnNlbGVjdGl6ZSh7XG4gICAgICAgIHBlcnNpc3Q6IGZhbHNlLFxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGVjdF92YWx1ZSA9IChzZWxlY3RfdmFsdWUubGVuZ3RoID8gc2VsZWN0X3ZhbHVlICsgXCIsXCIgOiBcIlwiKSArIHhcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGVjdF92YWx1ZSlcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9uRGVsZXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxlY3RfdmFsdWUgPSBzZWxlY3RfdmFsdWUuc3BsaXQoXCIsXCIpLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6ICE9IHhbMF19KS5qb2luKFwiLFwiKVxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZWN0X3ZhbHVlKVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogeCwgdGV4dDogeFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgLm9uKFwiZGVzdHJveVwiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNbMF0uc2VsZWN0aXplLmRlc3Ryb3koKVxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgYnVpbGRGaWx0ZXJJbnB1dCgpXG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBkM19jbGFzcyh3cmFwLFwiaW5jbHVkZS1zdWJtaXRcIixcImJ1dHRvblwiKVxuICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyOXB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwic3VibWl0XCIpXG4gICAgICAudGV4dChcIk1vZGlmeSBGaWx0ZXJzXCIpXG4gICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBmb290ZXJfcm93LnNlbGVjdEFsbChcImlucHV0XCIpLnByb3BlcnR5KFwidmFsdWVcIilcbiAgICAgICAgdmFyIG9wID0gIHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXkgKyBcIi5zZWxlY3RpemVcIlxuICAgICAgICBcbiAgICAgICAgc2VsZi5vbihcIm1vZGlmeVwiKSh7XCJmaWVsZFwiOlwiVGl0bGVcIixcIm9wXCI6b3AsXCJ2YWx1ZVwiOnZhbHVlfSlcbiAgICAgIH0pXG5cbiAgICBkM19jbGFzcyh3cmFwLFwiZXhjbHVkZS1zdWJtaXRcIixcImJ1dHRvblwiKVxuICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyOXB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwic3VibWl0XCIpXG4gICAgICAudGV4dChcIk5ldyBGaWx0ZXJcIilcbiAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGZvb3Rlcl9yb3cuc2VsZWN0QWxsKFwiaW5wdXRcIikucHJvcGVydHkoXCJ2YWx1ZVwiKVxuICAgICAgICB2YXIgb3AgPSAgc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleSArIFwiLnNlbGVjdGl6ZVwiXG5cbiAgICAgICAgc2VsZi5vbihcImFkZFwiKSh7XCJmaWVsZFwiOlwiVGl0bGVcIixcIm9wXCI6b3AsXCJ2YWx1ZVwiOnZhbHVlfSlcbiAgICAgIH0pXG5cblxuICB9XG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi9oZWFkZXInXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5leHBvcnQgZnVuY3Rpb24gQ29uZGl0aW9uYWxTaG93KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMuX2NsYXNzZXMgPSB7fVxuICB0aGlzLl9vYmplY3RzID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29uZGl0aW9uYWxfc2hvdyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBDb25kaXRpb25hbFNob3codGFyZ2V0KVxufVxuXG5Db25kaXRpb25hbFNob3cucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgY2xhc3NlZDogZnVuY3Rpb24oaywgdikge1xuICAgICAgaWYgKGsgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2NsYXNzZXNcbiAgICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9jbGFzc2VzW2tdIFxuICAgICAgdGhpcy5fY2xhc3Nlc1trXSA9IHY7XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH0gIFxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgdmFyIGNsYXNzZXMgPSB0aGlzLmNsYXNzZWQoKVxuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuY29uZGl0aW9uYWwtd3JhcFwiLFwiZGl2XCIsdGhpcy5kYXRhKCkpXG4gICAgICAgIC5jbGFzc2VkKFwiY29uZGl0aW9uYWwtd3JhcFwiLHRydWUpXG5cbiAgICAgIHZhciBvYmplY3RzID0gZDNfc3BsYXQod3JhcCxcIi5jb25kaXRpb25hbFwiLFwiZGl2XCIsaWRlbnRpdHksIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSB9KVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJjb25kaXRpb25hbFwiLHRydWUpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuICF4LnNlbGVjdGVkIH0pXG5cblxuICAgICAgT2JqZWN0LmtleXMoY2xhc3NlcykubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgIG9iamVjdHMuY2xhc3NlZChrLGNsYXNzZXNba10pXG4gICAgICB9KVxuXG4gICAgICB0aGlzLl9vYmplY3RzID0gb2JqZWN0c1xuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gIFxuICAgIH1cbiAgLCBlYWNoOiBmdW5jdGlvbihmbikge1xuICAgICAgdGhpcy5kcmF3KClcbiAgICAgIHRoaXMuX29iamVjdHMuZWFjaChmbilcbiAgICAgIFxuICAgIH1cbn1cbiIsIlxuZXhwb3J0IGZ1bmN0aW9uIFNoYXJlKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5faW5uZXIgPSBmdW5jdGlvbigpIHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNoYXJlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNoYXJlKHRhcmdldClcbn1cblxuU2hhcmUucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgb3ZlcmxheSA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLm92ZXJsYXlcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIm92ZXJsYXlcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcInJnYmEoMCwwLDAsLjUpXCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIixcIjMwMVwiKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG92ZXJsYXkucmVtb3ZlKClcbiAgICAgICAgfSlcblxuICAgICAgdGhpcy5fb3ZlcmxheSA9IG92ZXJsYXk7XG5cbiAgICAgIHZhciBjZW50ZXIgPSBkM191cGRhdGVhYmxlKG92ZXJsYXksXCIucG9wdXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInBvcHVwIGNvbC1tZC01IGNvbC1zbS04XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCJhdXRvXCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjMwMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjE1MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIndoaXRlXCIpXG4gICAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJub25lXCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgICAgfSlcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHNlbGYuX2lubmVyKGQzLnNlbGVjdCh0aGlzKSlcbiAgICAgICAgfSlcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgaW5uZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB0aGlzLl9pbm5lciA9IGZuLmJpbmQodGhpcylcbiAgICAgIHRoaXMuZHJhdygpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX292ZXJsYXkucmVtb3ZlKClcbiAgICAgIHJldHVybiB0aGlzIFxuICAgIH1cbn1cbiIsImltcG9ydCAqIGFzIHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IGZpbHRlcl92aWV3IGZyb20gJy4vdmlld3MvZmlsdGVyX3ZpZXcnXG5pbXBvcnQgb3B0aW9uX3ZpZXcgZnJvbSAnLi92aWV3cy9vcHRpb25fdmlldydcbmltcG9ydCBkb21haW5fdmlldyBmcm9tICcuL3ZpZXdzL2RvbWFpbl92aWV3J1xuaW1wb3J0IHNlZ21lbnRfdmlldyBmcm9tICcuL3ZpZXdzL3NlZ21lbnRfdmlldydcbmltcG9ydCBzdW1tYXJ5X3ZpZXcgZnJvbSAnLi92aWV3cy9zdW1tYXJ5X3ZpZXcnXG5pbXBvcnQgcmVsYXRpdmVfdmlldyBmcm9tICcuL3ZpZXdzL3JlbGF0aXZlX3RpbWluZ192aWV3J1xuaW1wb3J0IHRpbWluZ192aWV3IGZyb20gJy4vdmlld3MvdGltaW5nX3ZpZXcnXG5cbmltcG9ydCBzdGFnZWRfZmlsdGVyX3ZpZXcgZnJvbSAnLi92aWV3cy9zdGFnZWRfZmlsdGVyX3ZpZXcnXG5cblxuXG5cblxuaW1wb3J0IGNvbmRpdGlvbmFsX3Nob3cgZnJvbSAnLi9nZW5lcmljL2NvbmRpdGlvbmFsX3Nob3cnXG5cbmltcG9ydCBzaGFyZSBmcm9tICcuL2dlbmVyaWMvc2hhcmUnXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuL2hlbHBlcnMnXG5pbXBvcnQgKiBhcyB0cmFuc2Zvcm0gZnJvbSAnLi9kYXRhX2hlbHBlcnMnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5leHBvcnQgZnVuY3Rpb24gTmV3RGFzaGJvYXJkKHRhcmdldCkge1xuICB0aGlzLnRhcmdldCA9IHRhcmdldFxuICB0aGlzLl9vbiA9IHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG5ld19kYXNoYm9hcmQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgTmV3RGFzaGJvYXJkKHRhcmdldClcbn1cblxuTmV3RGFzaGJvYXJkLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIHN0YWdlZF9maWx0ZXJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3RhZ2VkX2ZpbHRlcnNcIix2YWwpIHx8IFwiXCJcbiAgICB9XG4gICwgc2F2ZWQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzYXZlZFwiLHZhbCkgXG4gICAgfVxuICAsIGxpbmVfaXRlbXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsaW5lX2l0ZW1zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBzZWxlY3RlZF9hY3Rpb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWxlY3RlZF9hY3Rpb25cIix2YWwpIFxuICAgIH1cbiAgLCBzZWxlY3RlZF9jb21wYXJpc29uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2VsZWN0ZWRfY29tcGFyaXNvblwiLHZhbCkgXG4gICAgfVxuICAsIGFjdGlvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uX2RhdGVcIix2YWwpIFxuICAgIH1cbiAgLCBjb21wYXJpc29uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uX2RhdGVcIix2YWwpIFxuICAgIH1cblxuICAsIHZpZXdfb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZpZXdfb3B0aW9uc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgbG9naWNfb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljX29wdGlvbnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGV4cGxvcmVfdGFiczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImV4cGxvcmVfdGFic1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgbG9naWNfY2F0ZWdvcmllczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljX2NhdGVnb3JpZXNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGFjdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBzdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgdGltZV9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGltZV9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBjYXRlZ29yeV9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY2F0ZWdvcnlfc3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwga2V5d29yZF9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5d29yZF9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBiZWZvcmU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiZWZvcmVcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGFmdGVyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWZ0ZXJcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGZpbHRlcnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJmaWx0ZXJzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBsb2FkaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCkgdGhpcy5fc2VnbWVudF92aWV3ICYmIHRoaXMuX3NlZ21lbnRfdmlldy5pc19sb2FkaW5nKHZhbCkuZHJhdygpXG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvYWRpbmdcIix2YWwpXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YSgpXG5cbiAgICAgIHZhciBvcHRpb25zID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnZpZXdfb3B0aW9ucygpKSlcbiAgICAgIHZhciB0YWJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmV4cGxvcmVfdGFicygpKSlcblxuXG4gICAgICB2YXIgbG9naWMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMubG9naWNfb3B0aW9ucygpKSlcbiAgICAgICAgLCBjYXRlZ29yaWVzID0gdGhpcy5sb2dpY19jYXRlZ29yaWVzKClcbiAgICAgICAgLCBmaWx0ZXJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmZpbHRlcnMoKSkpXG4gICAgICAgICwgYWN0aW9ucyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5hY3Rpb25zKCkpKVxuICAgICAgICAsIHN0YWdlZF9maWx0ZXJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnN0YWdlZF9maWx0ZXJzKCkpKVxuXG5cblxuICAgICAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdGhpcy5fc2VnbWVudF92aWV3ID0gc2VnbWVudF92aWV3KHRhcmdldClcbiAgICAgICAgLmlzX2xvYWRpbmcoc2VsZi5sb2FkaW5nKCkgfHwgZmFsc2UpXG4gICAgICAgIC5zZWdtZW50cyhhY3Rpb25zKVxuICAgICAgICAuZGF0YShzZWxmLnN1bW1hcnkoKSlcbiAgICAgICAgLmFjdGlvbihzZWxmLnNlbGVjdGVkX2FjdGlvbigpIHx8IHt9KVxuICAgICAgICAuYWN0aW9uX2RhdGUoc2VsZi5hY3Rpb25fZGF0ZSgpIHx8IFwiXCIpXG4gICAgICAgIC5jb21wYXJpc29uX2RhdGUoc2VsZi5jb21wYXJpc29uX2RhdGUoKSB8fCBcIlwiKVxuXG4gICAgICAgIC5jb21wYXJpc29uKHNlbGYuc2VsZWN0ZWRfY29tcGFyaXNvbigpIHx8IHt9KVxuICAgICAgICAub24oXCJjaGFuZ2VcIiwgdGhpcy5vbihcImFjdGlvbi5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiLCB0aGlzLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJjb21wYXJpc29uLmNoYW5nZVwiLCB0aGlzLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIiwgdGhpcy5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiLCBmdW5jdGlvbigpIHsgIFxuICAgICAgICAgIHZhciBzcyA9IHNoYXJlKGQzLnNlbGVjdChcImJvZHlcIikpLmRyYXcoKVxuICAgICAgICAgIHNzLmlubmVyKGZ1bmN0aW9uKHRhcmdldCkge1xuXG4gICAgICAgICAgICB2YXIgaGVhZGVyID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuaGVhZGVyXCIsXCJoNFwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImhlYWRlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJPcGVuIGEgc2F2ZWQgZGFzaGJvYXJkXCIpXG5cbiAgICAgICAgICAgIHZhciBmb3JtID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJkaXZcIixcImRpdlwiLHNlbGYuc2F2ZWQoKSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjI1JVwiKVxuXG4gICAgICAgICAgICBpZiAoIXNlbGYuc2F2ZWQoKSB8fCBzZWxmLnNhdmVkKCkubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShmb3JtLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgICAgICAgICAgIC50ZXh0KFwiWW91IGN1cnJlbnRseSBoYXZlIG5vIHNhdmVkIGRhc2hib2FyZHNcIilcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGQzX3NwbGF0KGZvcm0sXCIucm93XCIsXCJhXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubmFtZSB9KVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgICAgICAgICAvLy5hdHRyKFwiaHJlZlwiLCB4ID0+IHguZW5kcG9pbnQpXG4gICAgICAgICAgICAgICAgLnRleHQoeCA9PiB4Lm5hbWUpXG4gICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgICAgLy8gSEFDSzogVEhJUyBpcyBoYWNreS4uLlxuICAgICAgICAgICAgICAgICAgdmFyIF9zdGF0ZSA9IHN0YXRlLnFzKHt9KS5mcm9tKFwiP1wiICsgeC5lbmRwb2ludC5zcGxpdChcIj9cIilbMV0pXG5cbiAgICAgICAgICAgICAgICAgIHNzLmhpZGUoKVxuICAgICAgICAgICAgICAgICAgd2luZG93Lm9ucG9wc3RhdGUoe3N0YXRlOiBfc3RhdGV9KVxuICAgICAgICAgICAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgICAub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgICB2YXIgc3MgPSBzaGFyZShkMy5zZWxlY3QoXCJib2R5XCIpKS5kcmF3KClcbiAgICAgICAgICBzcy5pbm5lcihmdW5jdGlvbih0YXJnZXQpIHtcblxuICAgICAgICAgICAgdmFyIGhlYWRlciA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLmhlYWRlclwiLFwiaDRcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJoZWFkZXJcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LWZhbWlseVwiLFwiUHJveGltYU5vdmEsIHNhbnMtc2VyaWZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiU2F2ZSB0aGlzIGRhc2hib2FyZDpcIilcblxuICAgICAgICAgICAgdmFyIGZvcm0gPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdlwiLFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG4gICAgICAgICAgICB2YXIgbmFtZSA9IGQzX3VwZGF0ZWFibGUoZm9ybSwgXCIubmFtZVwiLCBcImRpdlwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKG5hbWUsXCIubGFiZWxcIixcImRpdlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiRGFzaGJvYXJkIE5hbWU6XCIpXG5cbiAgICAgICAgICAgIHZhciBuYW1lX2lucHV0ID0gZDNfdXBkYXRlYWJsZShuYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNzBweFwiKVxuICAgICAgICAgICAgICAuYXR0cihcInBsYWNlaG9sZGVyXCIsXCJNeSBhd2Vzb21lIHNlYXJjaFwiKVxuXG4gICAgICAgICAgICB2YXIgYWR2YW5jZWQgPSBkM191cGRhdGVhYmxlKGZvcm0sIFwiLmFkdmFuY2VkXCIsIFwiZGV0YWlsc1wiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImFkdmFuY2VkXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjQwMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImxlZnRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCJhdXRvXCIpXG5cblxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKGFkdmFuY2VkLFwiLmxhYmVsXCIsXCJkaXZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAudGV4dChcIkxpbmUgSXRlbTpcIilcblxuICAgICAgICAgICAgdmFyIHNlbGVjdF9ib3ggPSBzZWxlY3QoYWR2YW5jZWQpXG4gICAgICAgICAgICAgIC5vcHRpb25zKHNlbGYubGluZV9pdGVtcygpLm1hcCh4ID0+IHsgcmV0dXJuIHtrZXk6eC5saW5lX2l0ZW1fbmFtZSwgdmFsdWU6IHgubGluZV9pdGVtX2lkfSB9KSApXG4gICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI3MHB4XCIpXG5cblxuXG5cbiAgICAgICAgICAgIHZhciBzZW5kID0gZDNfdXBkYXRlYWJsZShmb3JtLCBcIi5zZW5kXCIsIFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VuZFwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc2VuZCxcImJ1dHRvblwiLFwiYnV0dG9uXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxNnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjEwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJTZW5kXCIpXG4gICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gbmFtZV9pbnB1dC5wcm9wZXJ0eShcInZhbHVlXCIpIFxuICAgICAgICAgICAgICAgIHZhciBsaW5lX2l0ZW0gPSBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnMubGVuZ3RoID8gc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleSA6IGZhbHNlXG5cbiAgICAgICAgICAgICAgICBkMy54aHIoXCIvY3J1c2hlci9zYXZlZF9kYXNoYm9hcmRcIilcbiAgICAgICAgICAgICAgICAgIC5wb3N0KEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBuYW1lXG4gICAgICAgICAgICAgICAgICAgICAgLCBcImVuZHBvaW50XCI6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAsIFwibGluZV9pdGVtXCI6IGxpbmVfaXRlbVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgKVxuXG4gICAgICAgICAgICAgICAgc3MuaGlkZSgpXG5cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLnRleHQoXCJTYXZlXCIpXG5cblxuXG4gICAgICAgICAgfSlcblxuXG4gICAgICAgIH0pXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgaWYgKHRoaXMuc3VtbWFyeSgpID09IGZhbHNlKSByZXR1cm4gZmFsc2VcblxuICAgICAgZmlsdGVyX3ZpZXcodGFyZ2V0KVxuICAgICAgICAubG9naWMobG9naWMpXG4gICAgICAgIC5jYXRlZ29yaWVzKGNhdGVnb3JpZXMpXG4gICAgICAgIC5maWx0ZXJzKGZpbHRlcnMpXG4gICAgICAgIC5kYXRhKGRhdGEpXG4gICAgICAgIC5vbihcImxvZ2ljLmNoYW5nZVwiLCB0aGlzLm9uKFwibG9naWMuY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJmaWx0ZXIuY2hhbmdlXCIsIHRoaXMub24oXCJmaWx0ZXIuY2hhbmdlXCIpKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIG9wdGlvbl92aWV3KHRhcmdldClcbiAgICAgICAgLmRhdGEob3B0aW9ucylcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIHRoaXMub24oXCJ2aWV3LmNoYW5nZVwiKSApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgY29uZGl0aW9uYWxfc2hvdyh0YXJnZXQpXG4gICAgICAgIC5kYXRhKG9wdGlvbnMpXG4gICAgICAgIC5jbGFzc2VkKFwidmlldy1vcHRpb25cIix0cnVlKVxuICAgICAgICAuZHJhdygpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgIGlmICgheC5zZWxlY3RlZCkgcmV0dXJuXG5cbiAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwiZGF0YS12aWV3XCIpIHtcbiAgICAgICAgICAgIHZhciBkdiA9IGRvbWFpbl92aWV3KGR0aGlzKVxuICAgICAgICAgICAgICAub3B0aW9ucyh0YWJzKVxuICAgICAgICAgICAgICAuZGF0YShkYXRhKVxuICAgICAgICAgICAgICAub24oXCJzZWxlY3RcIiwgc2VsZi5vbihcInRhYi5jaGFuZ2VcIikgKVxuICAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcIm1lZGlhLXZpZXdcIikge1xuICAgICAgICAgICAgbWVkaWFfcGxhbi5tZWRpYV9wbGFuKGR0aGlzLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xNXB4XCIpLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCItMTVweFwiKSlcbiAgICAgICAgICAgICAuZGF0YShkYXRhKVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcImJhLXZpZXdcIikge1xuICAgICAgICAgICAgcmVsYXRpdmVfdmlldyhkdGhpcylcbiAgICAgICAgICAgICAuZGF0YShzZWxmLmJlZm9yZSgpKVxuICAgICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgICAgICAgc3RhZ2VkX2ZpbHRlcnMgPSBzdGFnZWRfZmlsdGVycy5zcGxpdChcIixcIikuY29uY2F0KHgua2V5IHx8IHgudXJsKS5maWx0ZXIoeCA9PiB4Lmxlbmd0aCkuam9pbihcIixcIilcbiAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKShzdGFnZWRfZmlsdGVycylcbiAgICAgICAgICAgICAgIEhBQ0tidWlsZFN0YWdlZEZpbHRlcihzdGFnZWRfZmlsdGVycylcblxuICAgIFxuICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwic3VtbWFyeS12aWV3XCIpIHtcbiAgICAgICAgICAgIHN1bW1hcnlfdmlldyhkdGhpcylcbiAgICAgICAgICAgICAuZGF0YShzZWxmLnN1bW1hcnkoKSlcbiAgICAgICAgICAgICAudGltaW5nKHNlbGYudGltZV9zdW1tYXJ5KCkpXG4gICAgICAgICAgICAgLmNhdGVnb3J5KHNlbGYuY2F0ZWdvcnlfc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC5iZWZvcmUoc2VsZi5iZWZvcmUoKSlcbiAgICAgICAgICAgICAuYWZ0ZXIoc2VsZi5hZnRlcigpKVxuICAgICAgICAgICAgIC5rZXl3b3JkcyhzZWxmLmtleXdvcmRfc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC5vbihcImJhLnNvcnRcIixzZWxmLm9uKFwiYmEuc29ydFwiKSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJ0aW1pbmctdmlld1wiKSB7XG4gICAgICAgICAgICB0aW1pbmdfdmlldyhkdGhpcylcbiAgICAgICAgICAgICAuZGF0YShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuICAgICAgZnVuY3Rpb24gSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZCkge1xuXG4gICAgICAgIHN0YWdlZF9maWx0ZXJfdmlldyh0YXJnZXQpXG4gICAgICAgICAgLmRhdGEoc3RhZ2VkKVxuICAgICAgICAgIC5vbihcInVwZGF0ZVwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKSh4KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9uKFwibW9kaWZ5XCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKFwiXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwibW9kaWZ5LWZpbHRlclwiKSh4KVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAub24oXCJhZGRcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoXCJcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJhZGQtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZHJhdygpXG4gICAgICB9XG4gICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbn1cbiIsIi8vaW1wb3J0ICogYXMgZDMgZnJvbSAnZDMnXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhdGVnb3JpZXModmFsdWUpIHtcbiAgdmFyIGNhdGVnb3JpZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzIH0sMClcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlLmZ1bGxfdXJscylcblxuICB2YXIgdG90YWwgPSBjYXRlZ29yaWVzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnZhbHVlcyB9LDApXG5cbiAgY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudmFsdWUgPSB4LnZhbHVlc1xuICAgIHgucGVyY2VudCA9IHgudmFsdWUgLyB0b3RhbFxuICB9KVxuXG4gIHZhbHVlW1wiZGlzcGxheV9jYXRlZ29yaWVzXCJdID0ge1xuICAgICAgXCJrZXlcIjpcIkNhdGVnb3JpZXNcIlxuICAgICwgXCJ2YWx1ZXNcIjogY2F0ZWdvcmllcy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgIT0gXCJOQVwiIH0pXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2F0ZWdvcnlIb3VyKHZhbHVlKSB7XG4gIHZhciBjYXRlZ29yeV9ob3VyID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgKyB4LmhvdXIgKyB4Lm1pbnV0ZX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogdlswXS5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAsIFwiaG91clwiOiB2WzBdLmhvdXJcbiAgICAgICAgLCBcIm1pbnV0ZVwiOiB2WzBdLm1pbnV0ZSBcbiAgICAgICAgLCBcImNvdW50XCI6di5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy5jb3VudCB9LDApXG4gICAgICB9XG4gICAgfSlcbiAgICAuZW50cmllcyh2YWx1ZS5mdWxsX3VybHMpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlcyB9KVxuXG4gIHZhbHVlW1wiY2F0ZWdvcnlfaG91clwiXSA9IGNhdGVnb3J5X2hvdXJcbiBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRGF0YShkYXRhLGJ1Y2tldHMscG9wX2NhdGVnb3JpZXMpIHtcblxuICB2YXIgdGltZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgIC5tYXAoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuXG4gIHZhciBjYXRzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLm1hcChkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJcIiB9KSApXG5cblxuXG5cbiAgdmFyIHRpbWVfY2F0ZWdvcmllcyA9IGJ1Y2tldHMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2NdID0ge307IHJldHVybiBwIH0sIHt9KVxuICB2YXIgY2F0ZWdvcnlfdGltZXMgPSBPYmplY3Qua2V5cyhjYXRzKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbY10gPSB7fTsgcmV0dXJuIHAgfSwge30pXG5cblxuICB2YXIgY2F0ZWdvcmllcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgLmVudHJpZXMoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7XG4gICAgICByb3cudmFsdWVzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICAgIHQucGVyY2VudCA9IGQzLnN1bSh0LnZhbHVlcyxmdW5jdGlvbihkKXsgcmV0dXJuIGQudW5pcXVlc30pLyBkMy5zdW0odGltZXNbdC5rZXldLGZ1bmN0aW9uKGQpIHtyZXR1cm4gZC51bmlxdWVzfSkgXG4gICAgICAgIHRpbWVfY2F0ZWdvcmllc1t0LmtleV1bcm93LmtleV0gPSB0LnBlcmNlbnRcbiAgICAgICAgY2F0ZWdvcnlfdGltZXNbcm93LmtleV1bdC5rZXldID0gdC5wZXJjZW50XG5cbiAgICAgIH0pXG4gICAgICByZXR1cm4gcm93XG4gICAgfSlcbiAgICAuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuICgocG9wX2NhdGVnb3JpZXNbYi5rZXldIHx8IHt9KS5ub3JtYWxpemVkX3BvcCB8fCAwKS0gKChwb3BfY2F0ZWdvcmllc1thLmtleV0gfHwge30pLm5vcm1hbGl6ZWRfcG9wIHx8IDApIH0pXG5cblxuICB2YXIgdGltZV9ub3JtYWxpemVfc2NhbGVzID0ge31cblxuICBkMy5lbnRyaWVzKHRpbWVfY2F0ZWdvcmllcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIHRpbWVfbm9ybWFsaXplX3NjYWxlc1t0cm93LmtleV0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbZDMubWluKHZhbHVlcyksZDMubWF4KHZhbHVlcyldKVxuICAgICAgLnJhbmdlKFswLDFdKVxuICB9KVxuXG4gIHZhciBjYXRfbm9ybWFsaXplX3NjYWxlcyA9IHt9XG5cbiAgZDMuZW50cmllcyhjYXRlZ29yeV90aW1lcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIGNhdF9ub3JtYWxpemVfc2NhbGVzW3Ryb3cua2V5XSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFtkMy5taW4odmFsdWVzKSxkMy5tYXgodmFsdWVzKV0pXG4gICAgICAucmFuZ2UoWzAsMV0pXG4gIH0pXG5cbiAgY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24ocCkge1xuICAgIHZhciBjYXQgPSBwLmtleVxuICAgIHAudmFsdWVzLm1hcChmdW5jdGlvbihxKSB7XG4gICAgICBxLm5vcm1fY2F0ID0gY2F0X25vcm1hbGl6ZV9zY2FsZXNbY2F0XShxLnBlcmNlbnQpXG4gICAgICBxLm5vcm1fdGltZSA9IHRpbWVfbm9ybWFsaXplX3NjYWxlc1txLmtleV0ocS5wZXJjZW50KVxuXG4gICAgICBxLnNjb3JlID0gMipxLm5vcm1fY2F0LzMgKyBxLm5vcm1fdGltZS8zXG4gICAgICBxLnNjb3JlID0gcS5ub3JtX3RpbWVcblxuICAgICAgdmFyIHBlcmNlbnRfcG9wID0gcG9wX2NhdGVnb3JpZXNbY2F0XSA/IHBvcF9jYXRlZ29yaWVzW2NhdF0ucGVyY2VudF9wb3AgOiAwXG5cbiAgICAgIHEucGVyY2VudF9kaWZmID0gKHEucGVyY2VudCAtIHBlcmNlbnRfcG9wKS9wZXJjZW50X3BvcFxuXG4gICAgfSlcbiAgfSlcblxuICByZXR1cm4gY2F0ZWdvcmllc1xufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJztcbmltcG9ydCB7ZmlsdGVyX2RhdGF9IGZyb20gJ2ZpbHRlcic7XG5pbXBvcnQgKiBhcyBkYXRhIGZyb20gJy4uL2RhdGEnXG5cbmNvbnN0IHMgPSBzdGF0ZTtcblxudmFyIGJ1aWxkQ2F0ZWdvcmllcyA9IGRhdGEuYnVpbGRDYXRlZ29yaWVzXG4gICwgYnVpbGRDYXRlZ29yeUhvdXIgPSBkYXRhLmJ1aWxkQ2F0ZWdvcnlIb3VyXG4gICwgYnVpbGREYXRhID0gZGF0YS5idWlsZERhdGE7XG5cblxuZnVuY3Rpb24gcHJlcGFyZUZpbHRlcnMoZmlsdGVycykge1xuICB2YXIgbWFwcGluZyA9IHtcbiAgICAgIFwiQ2F0ZWdvcnlcIjogXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiXG4gICAgLCBcIlRpdGxlXCI6IFwidXJsXCJcbiAgICAsIFwiVGltZVwiOiBcImhvdXJcIlxuICB9XG5cbiAgdmFyIGZpbHRlcnMgPSBmaWx0ZXJzLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiBPYmplY3Qua2V5cyh4KS5sZW5ndGggJiYgeC52YWx1ZSB9KS5tYXAoZnVuY3Rpb24oeikge1xuICAgIHJldHVybiB7IFxuICAgICAgICBcImZpZWxkXCI6IG1hcHBpbmdbei5maWVsZF1cbiAgICAgICwgXCJvcFwiOiB6Lm9wXG4gICAgICAsIFwidmFsdWVcIjogei52YWx1ZVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gZmlsdGVyc1xufVxuXG5cblxudmFyIG9wcyA9IHtcbiAgICBcImlzIGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKVxuICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMSB9LCAwKSA+IDBcbiAgICAgICAgfSBcbiAgICAgIH1cbiAgLCBcImlzIG5vdCBpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIilcbiAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPT0gMFxuICAgICAgICB9IFxuICAgICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuICBjb25zdCBzID0gc3RhdGU7XG5cbiAgc3RhdGVcbiAgICAucmVnaXN0ZXJFdmVudChcInVwZGF0ZUZpbHRlclwiLCBmdW5jdGlvbihlcnIsZmlsdGVycyxfc3RhdGUpIHtcblxuICAgICAgdmFyIGZpbHRlcnMgPSBfc3RhdGUuZmlsdGVyc1xuICAgICAgdmFyIHZhbHVlID0gX3N0YXRlLmRhdGFcblxuICAgICAgaWYgKHZhbHVlID09IHVuZGVmaW5lZCkgcmV0dXJuIC8vIHJldHVybiBlYXJseSBpZiB0aGVyZSBpcyBubyBkYXRhLi4uXG5cbiAgICAgIHZhciBmaWx0ZXJzID0gcHJlcGFyZUZpbHRlcnMoZmlsdGVycylcblxuICAgICAgdmFyIGxvZ2ljID0gX3N0YXRlLmxvZ2ljX29wdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguc2VsZWN0ZWQgfSlcbiAgICAgIGxvZ2ljID0gbG9naWMubGVuZ3RoID4gMCA/IGxvZ2ljWzBdIDogX3N0YXRlLmxvZ2ljX29wdGlvbnNbMF1cblxuICAgICAgdmFyIGZ1bGxfdXJscyA9IGZpbHRlcl9kYXRhKHZhbHVlLm9yaWdpbmFsX3VybHMpXG4gICAgICAgIC5vcChcImlzIGluXCIsIG9wc1tcImlzIGluXCJdKVxuICAgICAgICAub3AoXCJpcyBub3QgaW5cIiwgb3BzW1wiaXMgbm90IGluXCJdKVxuICAgICAgICAubG9naWMobG9naWMudmFsdWUpXG4gICAgICAgIC5ieShmaWx0ZXJzKVxuXG5cbiAgICAgIC8vIHNob3VsZCBub3QgZmlsdGVyIGlmLi4uXG4gICAgICAvL2RlYnVnZ2VyXG5cbiAgICAgIGlmICggKHZhbHVlLmZ1bGxfdXJscykgJiYgXG4gICAgICAgICAgICh2YWx1ZS5mdWxsX3VybHMubGVuZ3RoID09IGZ1bGxfdXJscy5sZW5ndGgpICYmIFxuICAgICAgICAgICAoX3N0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24gJiYgKF9zdGF0ZS5jb21wYXJpc29uX2RhdGEgPT0gdmFsdWUuY29tcGFyaXNvbikpKSByZXR1cm5cblxuICAgICAgdmFsdWUuZnVsbF91cmxzID0gZnVsbF91cmxzXG5cbiAgICAgIHZhciBjb21wYXJlVG8gPSBfc3RhdGUuY29tcGFyaXNvbl9kYXRhID8gX3N0YXRlLmNvbXBhcmlzb25fZGF0YS5vcmlnaW5hbF91cmxzIDogdmFsdWUub3JpZ2luYWxfdXJscztcblxuICAgICAgdmFsdWUuY29tcGFyaXNvbiA9IGNvbXBhcmVUb1xuXG4gICAgICAvLyBhbGwgdGhpcyBsb2dpYyBzaG91bGQgYmUgbW92ZSB0byB0aGUgcmVzcGVjdGl2ZSB2aWV3cy4uLlxuXG4gICAgICAvLyAtLS0tLSBTVEFSVCA6IEZPUiBNRURJQSBQTEFOIC0tLS0tIC8vXG5cbiAgICAgIGJ1aWxkQ2F0ZWdvcmllcyh2YWx1ZSlcbiAgICAgIGJ1aWxkQ2F0ZWdvcnlIb3VyKHZhbHVlKVxuXG4gICAgICAvLyAtLS0tLSBFTkQgOiBGT1IgTUVESUEgUExBTiAtLS0tLSAvL1xuXG4gICAgICB2YXIgdGFicyA9IFtcbiAgICAgICAgICBkYXNoYm9hcmQuYnVpbGREb21haW5zKHZhbHVlKVxuICAgICAgICAsIGRhc2hib2FyZC5idWlsZFVybHModmFsdWUpXG4gICAgICAgIC8vLCBkYXNoYm9hcmQuYnVpbGRUb3BpY3ModmFsdWUpXG4gICAgICBdXG5cbiAgICAgIHZhciBzdW1tYXJ5X2RhdGEgPSBkYXNoYm9hcmQuYnVpbGRTdW1tYXJ5RGF0YSh2YWx1ZS5mdWxsX3VybHMpXG4gICAgICAgICwgcG9wX3N1bW1hcnlfZGF0YSA9IGRhc2hib2FyZC5idWlsZFN1bW1hcnlEYXRhKGNvbXBhcmVUbylcblxuICAgICAgdmFyIHN1bW1hcnkgPSBkYXNoYm9hcmQuYnVpbGRTdW1tYXJ5QWdncmVnYXRpb24oc3VtbWFyeV9kYXRhLHBvcF9zdW1tYXJ5X2RhdGEpXG5cbiAgICAgIHZhciB0cyA9IGRhc2hib2FyZC5wcmVwRGF0YSh2YWx1ZS5mdWxsX3VybHMpXG4gICAgICAgICwgcG9wX3RzID0gZGFzaGJvYXJkLnByZXBEYXRhKGNvbXBhcmVUbylcblxuICAgICAgdmFyIG1hcHBlZHRzID0gdHMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGM7IHJldHVybiBwfSwge30pXG5cbiAgICAgIHZhciBwcmVwcGVkID0gcG9wX3RzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBrZXk6IHgua2V5XG4gICAgICAgICAgLCBob3VyOiB4LmhvdXJcbiAgICAgICAgICAsIG1pbnV0ZTogeC5taW51dGVcbiAgICAgICAgICAsIHZhbHVlMjogeC52YWx1ZVxuICAgICAgICAgICwgdmFsdWU6IG1hcHBlZHRzW3gua2V5XSA/ICBtYXBwZWR0c1t4LmtleV0udmFsdWUgOiAwXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHZhciBjYXRfcm9sbCA9IGQzLm5lc3QoKVxuICAgICAgICAua2V5KGZ1bmN0aW9uKGspIHsgcmV0dXJuIGsucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAgICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICAgICAgcC52aWV3cyArPSBjLmNvdW50XG4gICAgICAgICAgICBwLnNlc3Npb25zICs9IGMudW5pcXVlc1xuICAgICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgICB9LHsgYXJ0aWNsZXM6IHt9LCB2aWV3czogMCwgc2Vzc2lvbnM6IDB9KVxuICAgICAgICB9KVxuICAgICAgICAuZW50cmllcyh2YWx1ZS5mdWxsX3VybHMpXG5cbiAgICAgIHZhciBwb3BfY2F0X3JvbGwgPSBkMy5uZXN0KClcbiAgICAgICAgLmtleShmdW5jdGlvbihrKSB7IHJldHVybiBrLnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgICAgIHJldHVybiB2LnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgICAgIHAudmlld3MgKz0gYy5jb3VudFxuICAgICAgICAgICAgcC5zZXNzaW9ucyArPSBjLnVuaXF1ZXNcbiAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgfSx7IGFydGljbGVzOiB7fSwgdmlld3M6IDAsIHNlc3Npb25zOiAwfSlcbiAgICAgICAgfSlcbiAgICAgICAgLmVudHJpZXMoY29tcGFyZVRvKVxuXG4gICAgICB2YXIgbWFwcGVkX2NhdF9yb2xsID0gY2F0X3JvbGwucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGM7IHJldHVybiBwfSwge30pXG5cbiAgICAgIHZhciBjYXRfc3VtbWFyeSA9IHBvcF9jYXRfcm9sbC5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAga2V5OiB4LmtleVxuICAgICAgICAgICwgcG9wOiB4LnZhbHVlcy52aWV3c1xuICAgICAgICAgICwgc2FtcDogbWFwcGVkX2NhdF9yb2xsW3gua2V5XSA/IG1hcHBlZF9jYXRfcm9sbFt4LmtleV0udmFsdWVzLnZpZXdzIDogMFxuICAgICAgICB9XG4gICAgICB9KS5zb3J0KGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYi5wb3AgLSBhLnBvcH0pXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgIT0gXCJOQVwiIH0pXG5cbiAgICAgIHZhciBwYXJzZVdvcmRzID0gZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgIHZhciBzcGxpdHRlZCA9IGMudXJsLnNwbGl0KFwiLmNvbS9cIilcbiAgICAgICAgaWYgKHNwbGl0dGVkLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICB2YXIgbGFzdCA9IHNwbGl0dGVkWzFdLnNwbGl0KFwiL1wiKS5zbGljZSgtMSlbMF0uc3BsaXQoXCI/XCIpWzBdXG4gICAgICAgICAgdmFyIHdvcmRzID0gbGFzdC5zcGxpdChcIi1cIikuam9pbihcIitcIikuc3BsaXQoXCIrXCIpLmpvaW4oXCJfXCIpLnNwbGl0KFwiX1wiKS5qb2luKFwiIFwiKS5zcGxpdChcIiBcIilcbiAgICAgICAgICB3b3Jkcy5tYXAoZnVuY3Rpb24odykgeyBcbiAgICAgICAgICAgIGlmICgody5sZW5ndGggPD0gNCkgfHwgKFN0cmluZyhwYXJzZUludCh3WzBdKSkgPT0gd1swXSApIHx8ICh3LmluZGV4T2YoXCJhc3BcIikgPiAtMSkgfHwgKHcuaW5kZXhPZihcInBocFwiKSA+IC0xKSB8fCAody5pbmRleE9mKFwiaHRtbFwiKSA+IC0xKSApIHJldHVyblxuICAgICAgICAgICAgcFt3XSA9IHBbd10gPyBwW3ddICsgMSA6IDFcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwXG4gICAgICB9XG5cbiAgICAgIHZhciBwb3BfY291bnRzID0gY29tcGFyZVRvLnJlZHVjZShwYXJzZVdvcmRzLHt9KVxuICAgICAgdmFyIHNhbXBfY291bnRzID0gdmFsdWUuZnVsbF91cmxzLnJlZHVjZShwYXJzZVdvcmRzLHt9KVxuXG5cbiAgICAgIHZhciBlbnRyaWVzID0gZDMuZW50cmllcyhwb3BfY291bnRzKS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSA+IDF9KVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB4LnNhbXAgPSBzYW1wX2NvdW50c1t4LmtleV1cbiAgICAgICAgICB4LnBvcCA9IHgudmFsdWVcbiAgICAgICAgICByZXR1cm4geFxuICAgICAgICB9KVxuICAgICAgICAuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGIucG9wIC0gYS5wb3B9KVxuICAgICAgICAuc2xpY2UoMCwyNSlcblxuXG4gICAgICB2YXIgbW9kaWZ5V2l0aENvbXBhcmlzb25zID0gZnVuY3Rpb24oZHMpIHtcblxuICAgICAgICB2YXIgYWdncyA9IGRzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgICBwLnBvcF9tYXggPSAocC5wb3BfbWF4IHx8IDApIDwgYy5wb3AgPyBjLnBvcCA6IHAucG9wX21heFxuICAgICAgICAgIHAucG9wX3RvdGFsID0gKHAucG9wX3RvdGFsIHx8IDApICsgYy5wb3BcblxuICAgICAgICAgIGlmIChjLnNhbXApIHtcbiAgICAgICAgICAgIHAuc2FtcF9tYXggPSAocC5zYW1wX21heCB8fCAwKSA+IGMuc2FtcCA/IHAuc2FtcF9tYXggOiBjLnNhbXBcbiAgICAgICAgICAgIHAuc2FtcF90b3RhbCA9IChwLnNhbXBfdG90YWwgfHwgMCkgKyBjLnNhbXBcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gcFxuICAgICAgICB9LHt9KVxuXG4gICAgICAgIGNvbnNvbGUubG9nKGFnZ3MpXG5cbiAgICAgICAgZHMubWFwKGZ1bmN0aW9uKG8pIHtcbiAgICAgICAgICBvLm5vcm1hbGl6ZWRfcG9wID0gby5wb3AgLyBhZ2dzLnBvcF9tYXhcbiAgICAgICAgICBvLnBlcmNlbnRfcG9wID0gby5wb3AgLyBhZ2dzLnBvcF90b3RhbFxuXG4gICAgICAgICAgby5ub3JtYWxpemVkX3NhbXAgPSBvLnNhbXAgLyBhZ2dzLnNhbXBfbWF4XG4gICAgICAgICAgby5wZXJjZW50X3NhbXAgPSBvLnNhbXAgLyBhZ2dzLnNhbXBfdG90YWxcblxuICAgICAgICAgIG8ubm9ybWFsaXplZF9kaWZmID0gKG8ubm9ybWFsaXplZF9zYW1wIC0gby5ub3JtYWxpemVkX3BvcCkvby5ub3JtYWxpemVkX3BvcFxuICAgICAgICAgIG8ucGVyY2VudF9kaWZmID0gKG8ucGVyY2VudF9zYW1wIC0gby5wZXJjZW50X3BvcCkvby5wZXJjZW50X3BvcFxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICBtb2RpZnlXaXRoQ29tcGFyaXNvbnMoY2F0X3N1bW1hcnkpXG4gICAgICBtb2RpZnlXaXRoQ29tcGFyaXNvbnMoZW50cmllcylcblxuXG4gICAgICBpZiAodmFsdWUuYmVmb3JlKSB7XG4gICAgICAgIHZhciBiZWZvcmVfdXJscyA9IGZpbHRlcl9kYXRhKHZhbHVlLmJlZm9yZSlcbiAgICAgICAgICAub3AoXCJpcyBpblwiLCBvcHNbXCJpcyBpblwiXSlcbiAgICAgICAgICAub3AoXCJpcyBub3QgaW5cIiwgb3BzW1wiaXMgbm90IGluXCJdKVxuICAgICAgICAgIC8vLm9wKFwiZG9lcyBub3QgY29udGFpblwiLCBvcHNbXCJkb2VzIG5vdCBjb250YWluXCJdKVxuICAgICAgICAgIC8vLm9wKFwiY29udGFpbnNcIiwgb3BzW1wiY29udGFpbnNcIl0pXG4gICAgICAgICAgLmxvZ2ljKGxvZ2ljLnZhbHVlKVxuICAgICAgICAgIC5ieShmaWx0ZXJzKVxuXG4gICAgICAgIHZhciBhZnRlcl91cmxzID0gZmlsdGVyX2RhdGEodmFsdWUuYWZ0ZXIpXG4gICAgICAgICAgLm9wKFwiaXMgaW5cIiwgb3BzW1wiaXMgaW5cIl0pXG4gICAgICAgICAgLm9wKFwiaXMgbm90IGluXCIsIG9wc1tcImlzIG5vdCBpblwiXSlcbiAgICAgICAgICAvLy5vcChcImRvZXMgbm90IGNvbnRhaW5cIiwgb3BzW1wiZG9lcyBub3QgY29udGFpblwiXSlcbiAgICAgICAgICAvLy5vcChcImNvbnRhaW5zXCIsIG9wc1tcImNvbnRhaW5zXCJdKVxuICAgICAgICAgIC5sb2dpYyhsb2dpYy52YWx1ZSlcbiAgICAgICAgICAuYnkoZmlsdGVycylcblxuXG4gICAgICAgIHZhciBidSA9IGQzLm5lc3QoKVxuICAgICAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgICAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgICAgICAgLmVudHJpZXMoYmVmb3JlX3VybHMpXG5cbiAgICAgICAgdmFyIGF1ID0gZDMubmVzdCgpXG4gICAgICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnRpbWVfZGlmZl9idWNrZXQgfSlcbiAgICAgICAgICAuZW50cmllcyhhZnRlcl91cmxzKVxuXG4gICAgICAgIHZhciBidWNrZXRzID0gWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcbiAgICAgICAgICAsIHBvcF9jYXRlZ29yaWVzID0gY2F0X3N1bW1hcnkucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGM7IHJldHVybiBwIH0sIHt9KVxuICAgICAgICAgICwgY2F0cyA9IGNhdF9zdW1tYXJ5Lm1hcChmdW5jdGlvbihwKSB7IHJldHVybiBwLmtleSB9KVxuXG4gICAgICAgIHZhciBiZWZvcmVfY2F0ZWdvcmllcyA9IGJ1aWxkRGF0YShiZWZvcmVfdXJscyxidWNrZXRzLHBvcF9jYXRlZ29yaWVzKVxuICAgICAgICAgICwgYWZ0ZXJfY2F0ZWdvcmllcyA9IGJ1aWxkRGF0YShhZnRlcl91cmxzLGJ1Y2tldHMscG9wX2NhdGVnb3JpZXMpXG5cbiAgICAgICAgdmFyIHNvcnRieSA9IF9zdGF0ZS5zb3J0YnlcblxuICAgICAgICBpZiAoc29ydGJ5ID09IFwic2NvcmVcIikge1xuXG4gICAgICAgICAgYmVmb3JlX2NhdGVnb3JpZXMgPSBiZWZvcmVfY2F0ZWdvcmllcy5zb3J0KGZ1bmN0aW9uKGEsYikgeyBcbiAgICAgICAgICAgIHZhciBwID0gLTEsIHEgPSAtMTtcbiAgICAgICAgICAgIHRyeSB7IHAgPSBiLnZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSA9PSBcIjYwMFwiIH0pWzBdLnNjb3JlIH0gY2F0Y2goZSkge31cbiAgICAgICAgICAgIHRyeSB7IHEgPSBhLnZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSA9PSBcIjYwMFwiIH0pWzBdLnNjb3JlIH0gY2F0Y2goZSkge31cbiAgICAgICAgICAgIHJldHVybiBkMy5hc2NlbmRpbmcocCwgcSlcbiAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICB9IGVsc2UgaWYgKHNvcnRieSA9PSBcInBvcFwiKSB7XG5cbiAgICAgICAgICBiZWZvcmVfY2F0ZWdvcmllcyA9IGJlZm9yZV9jYXRlZ29yaWVzLnNvcnQoZnVuY3Rpb24oYSxiKSB7IFxuICAgICAgICAgICAgdmFyIHAgPSBjYXRzLmluZGV4T2YoYS5rZXkpXG4gICAgICAgICAgICAgICwgcSA9IGNhdHMuaW5kZXhPZihiLmtleSlcbiAgICAgICAgICAgIHJldHVybiBkMy5hc2NlbmRpbmcocCA+IC0xID8gcCA6IDEwMDAwLCBxID4gLTEgPyBxIDogMTAwMDApXG4gICAgICAgICAgfSlcblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgYmVmb3JlX2NhdGVnb3JpZXMgPSBiZWZvcmVfY2F0ZWdvcmllcy5zb3J0KGZ1bmN0aW9uKGEsYikgeyBcbiAgICAgICAgICAgIHZhciBwID0gLTEsIHEgPSAtMTtcbiAgICAgICAgICAgIHRyeSB7IHAgPSBiLnZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSA9PSBcIjYwMFwiIH0pWzBdLnBlcmNlbnRfZGlmZiB9IGNhdGNoKGUpIHt9XG4gICAgICAgICAgICB0cnkgeyBxID0gYS52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5wZXJjZW50X2RpZmYgfSBjYXRjaChlKSB7fVxuICAgICAgICAgICAgcmV0dXJuIGQzLmFzY2VuZGluZyhwLCBxKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICBcbiAgICAgICAgfVxuXG5cbiAgICAgICAgdmFyIG9yZGVyID0gYmVmb3JlX2NhdGVnb3JpZXMubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG5cbiAgICAgICAgYWZ0ZXJfY2F0ZWdvcmllcyA9IGFmdGVyX2NhdGVnb3JpZXMuZmlsdGVyKGZ1bmN0aW9uKHgpe3JldHVybiBvcmRlci5pbmRleE9mKHgua2V5KSA+IC0xfSkuc29ydChmdW5jdGlvbihhLGIpIHtcbiAgICAgICAgICByZXR1cm4gb3JkZXIuaW5kZXhPZihhLmtleSkgLSBvcmRlci5pbmRleE9mKGIua2V5KVxuICAgICAgICB9KVxuXG4gICAgICAgIHMuc2V0U3RhdGljKFwiYmVmb3JlX3VybHNcIix7XCJhZnRlclwiOmFmdGVyX3VybHMsXCJiZWZvcmVcIjpiZWZvcmVfdXJscyxcImNhdGVnb3J5XCI6Y2F0X3N1bW1hcnksXCJiZWZvcmVfY2F0ZWdvcmllc1wiOmJlZm9yZV9jYXRlZ29yaWVzLFwiYWZ0ZXJfY2F0ZWdvcmllc1wiOmFmdGVyX2NhdGVnb3JpZXMsXCJzb3J0YnlcIjp2YWx1ZS5zb3J0Ynl9KSBcbiAgICAgICAgcy5zZXRTdGF0aWMoXCJhZnRlcl91cmxzXCIsIGFmdGVyX3VybHMpXG5cbiAgICAgICAgXG5cblxuICAgICAgfVxuXG4gICAgICBcblxuICAgICAgcy5zZXRTdGF0aWMoXCJrZXl3b3JkX3N1bW1hcnlcIiwgZW50cmllcykgXG4gICAgICBzLnNldFN0YXRpYyhcInRpbWVfc3VtbWFyeVwiLCBwcmVwcGVkKVxuICAgICAgcy5zZXRTdGF0aWMoXCJjYXRlZ29yeV9zdW1tYXJ5XCIsIGNhdF9zdW1tYXJ5KVxuXG4gICAgICBzLnNldFN0YXRpYyhcInN1bW1hcnlcIixzdW1tYXJ5KVxuICAgICAgcy5zZXRTdGF0aWMoXCJ0YWJzXCIsdGFicylcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImZvcm1hdHRlZF9kYXRhXCIsdmFsdWUpXG5cbiAgICB9KVxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IGZpbHRlckluaXQgZnJvbSAnLi9maWx0ZXJfZXZlbnRzJ1xuXG5jb25zdCBzID0gc3RhdGU7XG5cbmNvbnN0IGRlZXBjb3B5ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh4KSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgZmlsdGVySW5pdCgpXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhZGQtZmlsdGVyXCIsIGZ1bmN0aW9uKGZpbHRlcikgeyBcbiAgICAgIHMucHVibGlzaChcImZpbHRlcnNcIixzLnN0YXRlKCkuZmlsdGVycy5jb25jYXQoZmlsdGVyKS5maWx0ZXIoeCA9PiB4LnZhbHVlKSApIFxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJtb2RpZnktZmlsdGVyXCIsIGZ1bmN0aW9uKGZpbHRlcikgeyBcbiAgICAgIHZhciBmaWx0ZXJzID0gcy5zdGF0ZSgpLmZpbHRlcnNcbiAgICAgIHZhciBoYXNfZXhpc2l0aW5nID0gZmlsdGVycy5maWx0ZXIoeCA9PiAoeC5maWVsZCArIHgub3ApID09IChmaWx0ZXIuZmllbGQgKyBmaWx0ZXIub3ApIClcbiAgICAgIFxuICAgICAgaWYgKGhhc19leGlzaXRpbmcubGVuZ3RoKSB7XG4gICAgICAgIHZhciBuZXdfZmlsdGVycyA9IGZpbHRlcnMucmV2ZXJzZSgpLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKCh4LmZpZWxkID09IGZpbHRlci5maWVsZCkgJiYgKHgub3AgPT0gZmlsdGVyLm9wKSkge1xuICAgICAgICAgICAgeC52YWx1ZSArPSBcIixcIiArIGZpbHRlci52YWx1ZVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4geFxuICAgICAgICB9KVxuICAgICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIsbmV3X2ZpbHRlcnMuZmlsdGVyKHggPT4geC52YWx1ZSkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIscy5zdGF0ZSgpLmZpbHRlcnMuY29uY2F0KGZpbHRlcikuZmlsdGVyKHggPT4geC52YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIsIGZ1bmN0aW9uKHN0cikgeyBzLnB1Ymxpc2goXCJzdGFnZWRfZmlsdGVyXCIsc3RyICkgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImFjdGlvbi5jaGFuZ2VcIiwgZnVuY3Rpb24oYWN0aW9uKSB7IHMucHVibGlzaChcInNlbGVjdGVkX2FjdGlvblwiLGFjdGlvbikgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImFjdGlvbl9kYXRlLmNoYW5nZVwiLCBmdW5jdGlvbihkYXRlKSB7IHMucHVibGlzaChcImFjdGlvbl9kYXRlXCIsZGF0ZSkgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIiwgZnVuY3Rpb24oZGF0ZSkgeyBzLnB1Ymxpc2goXCJjb21wYXJpc29uX2RhdGVcIixkYXRlKSB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwiY29tcGFyaXNvbi5jaGFuZ2VcIiwgZnVuY3Rpb24oYWN0aW9uKSB7IFxuICAgICAgaWYgKGFjdGlvbi52YWx1ZSA9PSBmYWxzZSkgcmV0dXJuIHMucHVibGlzaChcInNlbGVjdGVkX2NvbXBhcmlzb25cIixmYWxzZSlcbiAgICAgIHMucHVibGlzaChcInNlbGVjdGVkX2NvbXBhcmlzb25cIixhY3Rpb24pXG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImxvZ2ljLmNoYW5nZVwiLCBmdW5jdGlvbihsb2dpYykgeyBzLnB1Ymxpc2goXCJsb2dpY19vcHRpb25zXCIsbG9naWMpIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJmaWx0ZXIuY2hhbmdlXCIsIGZ1bmN0aW9uKGZpbHRlcnMpIHsgcy5wdWJsaXNoQmF0Y2goeyBcImZpbHRlcnNcIjpmaWx0ZXJzIH0pIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ2aWV3LmNoYW5nZVwiLCBmdW5jdGlvbih4KSB7XG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIix0cnVlKVxuICAgICAgdmFyIENQID0gZGVlcGNvcHkocy5zdGF0ZSgpLmRhc2hib2FyZF9vcHRpb25zKS5tYXAoZnVuY3Rpb24oZCkgeyBkLnNlbGVjdGVkID0gKHgudmFsdWUgPT0gZC52YWx1ZSkgPyAxIDogMDsgcmV0dXJuIGQgfSlcbiAgICAgIHMucHVibGlzaChcImRhc2hib2FyZF9vcHRpb25zXCIsQ1ApXG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcInRhYi5jaGFuZ2VcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIsdHJ1ZSlcbiAgICAgIGNvbnN0IHZhbHVlID0gcy5zdGF0ZSgpXG4gICAgICB2YWx1ZS50YWJzLm1hcChmdW5jdGlvbih0KSB7IHQuc2VsZWN0ZWQgPSAodC5rZXkgPT0geC5rZXkpID8gMSA6IDAgfSlcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcInRhYnNcIix2YWx1ZS50YWJzKVxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJiYS5zb3J0XCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHMucHVibGlzaEJhdGNoKHtcbiAgICAgICAgXCJzb3J0YnlcIjogeC52YWx1ZSxcbiAgICAgICAgXCJmaWx0ZXJzXCI6dmFsdWUuZmlsdGVyc1xuICAgICAgfSlcbiAgICB9KVxufVxuIiwiaW1wb3J0ICogYXMgc3RhdGUgZnJvbSAnc3RhdGUnXG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlKHFzX3N0YXRlLF9zdGF0ZSkge1xuXG4gIHZhciB1cGRhdGVzID0ge31cblxuXG4gIHN0YXRlLmNvbXBfZXZhbChxc19zdGF0ZSxfc3RhdGUsdXBkYXRlcylcbiAgICAuYWNjZXNzb3IoXG4gICAgICAgIFwic2VsZWN0ZWRfYWN0aW9uXCJcbiAgICAgICwgKHgseSkgPT4geS5hY3Rpb25zLmZpbHRlcih6ID0+IHouYWN0aW9uX2lkID09IHguc2VsZWN0ZWRfYWN0aW9uKVswXVxuICAgICAgLCAoeCx5KSA9PiB5LnNlbGVjdGVkX2FjdGlvblxuICAgIClcbiAgICAuZmFpbHVyZShcInNlbGVjdGVkX2FjdGlvblwiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHtcbiAgICAgICAgICBcImxvYWRpbmdcIjogdHJ1ZVxuICAgICAgICAsIFwic2VsZWN0ZWRfYWN0aW9uXCI6IF9uZXdcbiAgICAgIH0pXG4gICAgfSlcbiAgICAuYWNjZXNzb3IoXG4gICAgICAgIFwic2VsZWN0ZWRfdmlld1wiXG4gICAgICAsICh4LHkpID0+IHguc2VsZWN0ZWRfdmlld1xuICAgICAgLCAoXyx5KSA9PiB5LmRhc2hib2FyZF9vcHRpb25zLmZpbHRlcih4ID0+IHguc2VsZWN0ZWQpWzBdLnZhbHVlIFxuICAgIClcbiAgICAuZmFpbHVyZShcInNlbGVjdGVkX3ZpZXdcIiwgKF9uZXcsX29sZCxvYmopID0+IHtcbiAgICAgIC8vIHRoaXMgc2hvdWxkIGJlIHJlZG9uZSBzbyBpdHMgbm90IGRpZmZlcmVudCBsaWtlIHRoaXNcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLCB7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcImRhc2hib2FyZF9vcHRpb25zXCI6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoX3N0YXRlLmRhc2hib2FyZF9vcHRpb25zKSkubWFwKHggPT4geyBcbiAgICAgICAgICAgIHguc2VsZWN0ZWQgPSAoeC52YWx1ZSA9PSBfbmV3KTsgXG4gICAgICAgICAgICByZXR1cm4geCBcbiAgICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzZWxlY3RlZF9jb21wYXJpc29uXCJcbiAgICAgICwgKHgseSkgPT4geS5hY3Rpb25zLmZpbHRlcih6ID0+IHouYWN0aW9uX2lkID09IHguc2VsZWN0ZWRfY29tcGFyaXNvbilbMF1cbiAgICAgICwgKHgseSkgPT4geS5zZWxlY3RlZF9jb21wYXJpc29uXG4gICAgKVxuICAgIC5mYWlsdXJlKFwic2VsZWN0ZWRfY29tcGFyaXNvblwiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHtcbiAgICAgICAgICBcImxvYWRpbmdcIjogdHJ1ZVxuICAgICAgICAsIFwic2VsZWN0ZWRfY29tcGFyaXNvblwiOiBfbmV3XG4gICAgICB9KVxuICAgIH0pXG4gICAgLmVxdWFsKFwiZmlsdGVyc1wiLCAoeCx5KSA9PiBKU09OLnN0cmluZ2lmeSh4KSA9PSBKU09OLnN0cmluZ2lmeSh5KSApXG4gICAgLmZhaWx1cmUoXCJmaWx0ZXJzXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmose1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJmaWx0ZXJzXCI6IF9uZXcgfHwgW3t9XVxuICAgICAgfSlcbiAgICB9KVxuICAgIC5mYWlsdXJlKFwiYWN0aW9uX2RhdGVcIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7IGxvYWRpbmc6IHRydWUsIFwiYWN0aW9uX2RhdGVcIjogX25ldyB9KVxuICAgIH0pXG4gICAgLmZhaWx1cmUoXCJjb21wYXJpc29uX2RhdGVcIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7IGxvYWRpbmc6IHRydWUsIFwiY29tcGFyaXNvbl9kYXRlXCI6IF9uZXcgfSlcbiAgICB9KVxuXG4gICAgLmV2YWx1YXRlKClcblxuICB2YXIgY3VycmVudCA9IHN0YXRlLnFzKHt9KS50byhfc3RhdGUucXNfc3RhdGUgfHwge30pXG4gICAgLCBwb3AgPSBzdGF0ZS5xcyh7fSkudG8ocXNfc3RhdGUpXG5cbiAgaWYgKE9iamVjdC5rZXlzKHVwZGF0ZXMpLmxlbmd0aCAmJiBjdXJyZW50ICE9IHBvcCkge1xuICAgIHJldHVybiB1cGRhdGVzXG4gIH1cblxuICByZXR1cm4ge31cbiAgXG59XG4iLCJpbXBvcnQge3FzfSBmcm9tICdzdGF0ZSc7XG5pbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnO1xuaW1wb3J0IHtjb21wYXJlfSBmcm9tICcuLi9zdGF0ZSdcblxuZnVuY3Rpb24gcHVibGlzaFFTVXBkYXRlcyh1cGRhdGVzLHFzX3N0YXRlKSB7XG4gIGlmIChPYmplY3Qua2V5cyh1cGRhdGVzKS5sZW5ndGgpIHtcbiAgICB1cGRhdGVzW1wicXNfc3RhdGVcIl0gPSBxc19zdGF0ZVxuICAgIHN0YXRlLnB1Ymxpc2hCYXRjaCh1cGRhdGVzKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgd2luZG93Lm9ucG9wc3RhdGUgPSBmdW5jdGlvbihpKSB7XG5cbiAgICB2YXIgc3RhdGUgPSBzLl9zdGF0ZVxuICAgICAgLCBxc19zdGF0ZSA9IGkuc3RhdGVcblxuICAgIHZhciB1cGRhdGVzID0gY29tcGFyZShxc19zdGF0ZSxzdGF0ZSlcbiAgICBwdWJsaXNoUVNVcGRhdGVzKHVwZGF0ZXMscXNfc3RhdGUpXG4gIH1cblxuICBjb25zdCBzID0gc3RhdGU7XG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwiaGlzdG9yeVwiLGZ1bmN0aW9uKGVycm9yLF9zdGF0ZSkge1xuICAgICAgY29uc29sZS5sb2coXG4gICAgICAgIFwiY3VycmVudDogXCIrSlNPTi5zdHJpbmdpZnkoX3N0YXRlLnFzX3N0YXRlKSwgXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KF9zdGF0ZS5maWx0ZXJzKSwgXG4gICAgICAgIF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9uc1xuICAgICAgKVxuXG4gICAgICB2YXIgZm9yX3N0YXRlID0gW1wiZmlsdGVyc1wiXVxuXG4gICAgICB2YXIgcXNfc3RhdGUgPSBmb3Jfc3RhdGUucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgaWYgKF9zdGF0ZVtjXSkgcFtjXSA9IF9zdGF0ZVtjXVxuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7fSlcblxuICAgICAgaWYgKF9zdGF0ZS5zZWxlY3RlZF9hY3Rpb24pIHFzX3N0YXRlWydzZWxlY3RlZF9hY3Rpb24nXSA9IF9zdGF0ZS5zZWxlY3RlZF9hY3Rpb24uYWN0aW9uX2lkXG4gICAgICBpZiAoX3N0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24pIHFzX3N0YXRlWydzZWxlY3RlZF9jb21wYXJpc29uJ10gPSBfc3RhdGUuc2VsZWN0ZWRfY29tcGFyaXNvbi5hY3Rpb25faWRcbiAgICAgIGlmIChfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMpIHFzX3N0YXRlWydzZWxlY3RlZF92aWV3J10gPSBfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMuZmlsdGVyKHggPT4geC5zZWxlY3RlZClbMF0udmFsdWVcbiAgICAgIGlmIChfc3RhdGUuYWN0aW9uX2RhdGUpIHFzX3N0YXRlWydhY3Rpb25fZGF0ZSddID0gX3N0YXRlLmFjdGlvbl9kYXRlXG4gICAgICBpZiAoX3N0YXRlLmNvbXBhcmlzb25fZGF0ZSkgcXNfc3RhdGVbJ2NvbXBhcmlzb25fZGF0ZSddID0gX3N0YXRlLmNvbXBhcmlzb25fZGF0ZVxuXG5cbiAgICAgIGlmIChfc3RhdGUuc2VsZWN0ZWRfYWN0aW9uICYmIHFzKHFzX3N0YXRlKS50byhxc19zdGF0ZSkgIT0gd2luZG93LmxvY2F0aW9uLnNlYXJjaCkge1xuICAgICAgICBzLnB1Ymxpc2goXCJxc19zdGF0ZVwiLHFzX3N0YXRlKVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImhpc3RvcnkuYWN0aW9uc1wiLCBmdW5jdGlvbihlcnJvcix2YWx1ZSxfc3RhdGUpIHtcbiAgICAgIHZhciBxc19zdGF0ZSA9IHFzKHt9KS5mcm9tKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpXG4gICAgICBpZiAod2luZG93LmxvY2F0aW9uLnNlYXJjaC5sZW5ndGggJiYgT2JqZWN0LmtleXMocXNfc3RhdGUpLmxlbmd0aCkge1xuICAgICAgICB2YXIgdXBkYXRlcyA9IGRhc2hib2FyZC5zdGF0ZS5jb21wYXJlKHFzX3N0YXRlLF9zdGF0ZSlcbiAgICAgICAgcmV0dXJuIHB1Ymxpc2hRU1VwZGF0ZXModXBkYXRlcyxxc19zdGF0ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMucHVibGlzaChcInNlbGVjdGVkX2FjdGlvblwiLHZhbHVlWzBdKVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImhpc3RvcnkucXNfc3RhdGVcIiwgZnVuY3Rpb24oZXJyb3IscXNfc3RhdGUsX3N0YXRlKSB7XG5cbiAgICAgIGlmIChKU09OLnN0cmluZ2lmeShoaXN0b3J5LnN0YXRlKSA9PSBKU09OLnN0cmluZ2lmeShxc19zdGF0ZSkpIHJldHVyblxuICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggPT0gXCJcIikgaGlzdG9yeS5yZXBsYWNlU3RhdGUocXNfc3RhdGUsXCJcIixxcyhxc19zdGF0ZSkudG8ocXNfc3RhdGUpKVxuICAgICAgZWxzZSBoaXN0b3J5LnB1c2hTdGF0ZShxc19zdGF0ZSxcIlwiLHFzKHFzX3N0YXRlKS50byhxc19zdGF0ZSkpXG5cbiAgICB9KVxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJ2FwaSdcblxuY29uc3QgcyA9IHN0YXRlO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuXG4gIC8vIFN1YnNjcmlwdGlvbnMgdGhhdCByZWNlaXZlIGRhdGEgLyBtb2RpZnkgLyBjaGFuZ2Ugd2hlcmUgaXQgaXMgc3RvcmVkXG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwicmVjZWl2ZS5kYXRhXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImxvZ2ljX2NhdGVnb3JpZXNcIix2YWx1ZS5jYXRlZ29yaWVzKVxuICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHN0YXRlLmZpbHRlcnMpXG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwicmVjZWl2ZS5jb21wYXJpc29uX2RhdGFcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHN0YXRlLmZpbHRlcnMpXG4gICAgfSlcblxuXG4gIC8vIFN1YnNjcmlwdGlvbnMgdGhhdCB3aWxsIGdldCBtb3JlIGRhdGFcblxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuYWN0aW9uX2RhdGVcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YShzdGF0ZS5zZWxlY3RlZF9hY3Rpb24sc3RhdGUuYWN0aW9uX2RhdGUpKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImdldC5jb21wYXJpc29uX2RhdGVcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGZhbHNlKVxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiY29tcGFyaXNvbl9kYXRhXCIsYXBpLmFjdGlvbi5nZXREYXRhKHN0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24sc3RhdGUuY29tcGFyaXNvbl9kYXRlKSlcbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuc2VsZWN0ZWRfYWN0aW9uXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImRhdGFcIixhcGkuYWN0aW9uLmdldERhdGEodmFsdWUsc3RhdGUuYWN0aW9uX2RhdGUpKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImdldC5zZWxlY3RlZF9jb21wYXJpc29uXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybiBzLnB1Ymxpc2hTdGF0aWMoXCJjb21wYXJpc29uX2RhdGFcIixmYWxzZSlcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YSh2YWx1ZSxzdGF0ZS5jb21wYXJpc29uX2RhdGUpKVxuICAgIH0pXG5cblxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IHtxc30gZnJvbSAnc3RhdGUnXG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnYXBpJ1xuaW1wb3J0ICogYXMgZGF0YSBmcm9tICcuL2RhdGEnXG5pbXBvcnQgYnVpbGQgZnJvbSAnLi9idWlsZCdcbmltcG9ydCBoaXN0b3J5U3Vic2NyaXB0aW9ucyBmcm9tICcuL3N1YnNjcmlwdGlvbnMvaGlzdG9yeSdcbmltcG9ydCBhcGlTdWJzY3JpcHRpb25zIGZyb20gJy4vc3Vic2NyaXB0aW9ucy9hcGknXG5cblxuY29uc3QgcyA9IHN0YXRlO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgaGlzdG9yeVN1YnNjcmlwdGlvbnMoKVxuICBhcGlTdWJzY3JpcHRpb25zKClcblxuICBcbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLmxvYWRpbmdcIiwgZnVuY3Rpb24oZXJyb3IsbG9hZGluZyx2YWx1ZSkgeyBidWlsZCgpKCkgfSlcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLmRhc2hib2FyZF9vcHRpb25zXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKVxuICAgIC5zdWJzY3JpYmUoXCJjaGFuZ2UudGFic1wiLCBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKSkgXG4gICAgLnN1YnNjcmliZShcImNoYW5nZS5sb2dpY19vcHRpb25zXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpIClcbiAgICAuc3Vic2NyaWJlKFwidXBkYXRlLmZpbHRlcnNcIiwgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikpXG4gICAgXG5cbiAgLy8gUkVEUkFXOiB0aGlzIGlzIHdoZXJlIHRoZSBlbnRpcmUgYXBwIGdldHMgcmVkcmF3biAtIGlmIGZvcm1hdHRlZF9kYXRhIGNoYW5nZXMsIHJlZHJhdyB0aGUgYXBwXG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwicmVkcmF3LmZvcm1hdHRlZF9kYXRhXCIsIGZ1bmN0aW9uKGVycm9yLGZvcm1hdHRlZF9kYXRhLHZhbHVlKSB7IFxuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIsZmFsc2UpOyBcbiAgICAgIGJ1aWxkKCkoKSBcbiAgICB9KVxufVxuIiwiaW1wb3J0IGQzIGZyb20gJ2QzJ1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJ2FwaSdcbmltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCBuZXdfZGFzaGJvYXJkIGZyb20gJy4vbmV3X2Rhc2hib2FyZCdcbmltcG9ydCBpbml0RXZlbnRzIGZyb20gJy4vZXZlbnRzL2V2ZW50cydcbmltcG9ydCBpbml0U3Vic2NyaXB0aW9ucyBmcm9tICcuL3N1YnNjcmlwdGlvbnMnXG5cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGJ1aWxkKHRhcmdldCkge1xuICBjb25zdCBkYiA9IG5ldyBEYXNoYm9hcmQodGFyZ2V0KVxuICByZXR1cm4gZGJcbn1cblxuY2xhc3MgRGFzaGJvYXJkIHtcblxuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBpbml0RXZlbnRzKClcbiAgICBpbml0U3Vic2NyaXB0aW9ucygpXG4gICAgdGhpcy50YXJnZXQodGFyZ2V0KVxuICAgIHRoaXMuaW5pdCgpXG5cbiAgICByZXR1cm4gdGhpcy5jYWxsLmJpbmQodGhpcylcbiAgfVxuXG4gIHRhcmdldCh0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXQgfHwgZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QoXCIuY29udGFpbmVyXCIpLFwiZGl2XCIsXCJkaXZcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAwcHhcIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCJhdXRvXCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcImF1dG9cIilcbiAgfVxuXG4gIGluaXQoKSB7XG4gICAgbGV0IHMgPSBzdGF0ZTtcbiAgICBsZXQgdmFsdWUgPSBzLnN0YXRlKClcbiAgICB0aGlzLmRlZmF1bHRzKHMpXG4gIH1cblxuICBkZWZhdWx0cyhzKSB7XG5cbiAgICBpZiAoISFzLnN0YXRlKCkuZGFzaGJvYXJkX29wdGlvbnMpIHJldHVybiAvLyBkb24ndCByZWxvYWQgZGVmYXVsdHMgaWYgcHJlc2VudFxuXG4gICAgcy5wdWJsaXNoU3RhdGljKFwiYWN0aW9uc1wiLGFwaS5hY3Rpb24uZ2V0QWxsKVxuICAgIHMucHVibGlzaFN0YXRpYyhcInNhdmVkXCIsYXBpLmRhc2hib2FyZC5nZXRBbGwpXG4gICAgcy5wdWJsaXNoU3RhdGljKFwibGluZV9pdGVtc1wiLGFwaS5saW5lX2l0ZW0uZ2V0QWxsKVxuXG4gICAgdmFyIERFRkFVTFRTID0ge1xuICAgICAgICBsb2dpY19vcHRpb25zOiBbe1wia2V5XCI6XCJBbGxcIixcInZhbHVlXCI6XCJhbmRcIn0se1wia2V5XCI6XCJBbnlcIixcInZhbHVlXCI6XCJvclwifV1cbiAgICAgICwgbG9naWNfY2F0ZWdvcmllczogW11cbiAgICAgICwgZmlsdGVyczogW3t9XSBcbiAgICAgICwgZGFzaGJvYXJkX29wdGlvbnM6IFtcbiAgICAgICAgICAgIHtcImtleVwiOlwiRGF0YSBzdW1tYXJ5XCIsXCJ2YWx1ZVwiOlwic3VtbWFyeS12aWV3XCIsXCJzZWxlY3RlZFwiOjF9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIkV4cGxvcmUgZGF0YVwiLFwidmFsdWVcIjpcImRhdGEtdmlld1wiLFwic2VsZWN0ZWRcIjowfVxuICAgICAgICAgICwge1wia2V5XCI6XCJCZWZvcmUgJiBBZnRlclwiLFwidmFsdWVcIjpcImJhLXZpZXdcIixcInNlbGVjdGVkXCI6MH1cbiAgICAgICAgICAsIHtcImtleVwiOlwiVGltaW5nXCIsXCJ2YWx1ZVwiOlwidGltaW5nLXZpZXdcIixcInNlbGVjdGVkXCI6MH1cbiAgICAgICAgICAsIHtcImtleVwiOlwiTWVkaWEgUGxhblwiLCBcInZhbHVlXCI6XCJtZWRpYS12aWV3XCIsXCJzZWxlY3RlZFwiOjB9XG5cbiAgICAgICAgXVxuICAgIH1cblxuICAgIHMudXBkYXRlKGZhbHNlLERFRkFVTFRTKVxuICB9XG5cbiAgY2FsbCgpIHtcblxuICAgbGV0IHMgPSBzdGF0ZTtcbiAgIGxldCB2YWx1ZSA9IHMuc3RhdGUoKVxuXG4gICBsZXQgZGIgPSBuZXdfZGFzaGJvYXJkKHRoaXMuX3RhcmdldClcbiAgICAgLnN0YWdlZF9maWx0ZXJzKHZhbHVlLnN0YWdlZF9maWx0ZXIgfHwgXCJcIilcbiAgICAgLnNhdmVkKHZhbHVlLnNhdmVkIHx8IFtdKVxuICAgICAuZGF0YSh2YWx1ZS5mb3JtYXR0ZWRfZGF0YSB8fCB7fSlcbiAgICAgLmFjdGlvbnModmFsdWUuYWN0aW9ucyB8fCBbXSlcbiAgICAgLnNlbGVjdGVkX2FjdGlvbih2YWx1ZS5zZWxlY3RlZF9hY3Rpb24gfHwge30pXG4gICAgIC5zZWxlY3RlZF9jb21wYXJpc29uKHZhbHVlLnNlbGVjdGVkX2NvbXBhcmlzb24gfHwge30pXG4gICAgIC5hY3Rpb25fZGF0ZSh2YWx1ZS5hY3Rpb25fZGF0ZSB8fCAwKVxuICAgICAuY29tcGFyaXNvbl9kYXRlKHZhbHVlLmNvbXBhcmlzb25fZGF0ZSB8fCAwKVxuICAgICAubG9hZGluZyh2YWx1ZS5sb2FkaW5nIHx8IGZhbHNlKVxuICAgICAubGluZV9pdGVtcyh2YWx1ZS5saW5lX2l0ZW1zIHx8IGZhbHNlKVxuICAgICAuc3VtbWFyeSh2YWx1ZS5zdW1tYXJ5IHx8IGZhbHNlKVxuICAgICAudGltZV9zdW1tYXJ5KHZhbHVlLnRpbWVfc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLmNhdGVnb3J5X3N1bW1hcnkodmFsdWUuY2F0ZWdvcnlfc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLmtleXdvcmRfc3VtbWFyeSh2YWx1ZS5rZXl3b3JkX3N1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC5iZWZvcmUodmFsdWUuYmVmb3JlX3VybHMgfHwgW10pXG4gICAgIC5hZnRlcih2YWx1ZS5hZnRlcl91cmxzIHx8IFtdKVxuICAgICAubG9naWNfb3B0aW9ucyh2YWx1ZS5sb2dpY19vcHRpb25zIHx8IGZhbHNlKVxuICAgICAubG9naWNfY2F0ZWdvcmllcyh2YWx1ZS5sb2dpY19jYXRlZ29yaWVzIHx8IGZhbHNlKVxuICAgICAuZmlsdGVycyh2YWx1ZS5maWx0ZXJzIHx8IGZhbHNlKVxuICAgICAudmlld19vcHRpb25zKHZhbHVlLmRhc2hib2FyZF9vcHRpb25zIHx8IGZhbHNlKVxuICAgICAuZXhwbG9yZV90YWJzKHZhbHVlLnRhYnMgfHwgZmFsc2UpXG4gICAgIC5vbihcImFkZC1maWx0ZXJcIiwgcy5wcmVwYXJlRXZlbnQoXCJhZGQtZmlsdGVyXCIpKVxuICAgICAub24oXCJtb2RpZnktZmlsdGVyXCIsIHMucHJlcGFyZUV2ZW50KFwibW9kaWZ5LWZpbHRlclwiKSlcbiAgICAgLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiYWN0aW9uLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImFjdGlvbi5jaGFuZ2VcIikpXG4gICAgIC5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImFjdGlvbl9kYXRlLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgIC5vbihcImNvbXBhcmlzb24uY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwiY29tcGFyaXNvbi5jaGFuZ2VcIikpXG4gICAgIC5vbihcImxvZ2ljLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImxvZ2ljLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiZmlsdGVyLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImZpbHRlci5jaGFuZ2VcIikpXG4gICAgIC5vbihcInZpZXcuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwidmlldy5jaGFuZ2VcIikpXG4gICAgIC5vbihcInRhYi5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJ0YWIuY2hhbmdlXCIpKVxuICAgICAub24oXCJiYS5zb3J0XCIsIHMucHJlcGFyZUV2ZW50KFwiYmEuc29ydFwiKSlcbiAgICAgLmRyYXcoKVxuICAgXG4gIH1cbn1cbiIsIi8vZXhwb3J0IHtkZWZhdWx0IGFzIGRhc2hib2FyZH0gZnJvbSBcIi4vc3JjL2Rhc2hib2FyZFwiO1xuLy9leHBvcnQge2RlZmF1bHQgYXMgZmlsdGVyX2Rhc2hib2FyZH0gZnJvbSBcIi4vc3JjL2ZpbHRlcl9kYXNoYm9hcmRcIjtcbmV4cG9ydCB7ZGVmYXVsdCBhcyBuZXdfZGFzaGJvYXJkfSBmcm9tIFwiLi9zcmMvbmV3X2Rhc2hib2FyZFwiO1xuZXhwb3J0IHtkZWZhdWx0IGFzIGJ1aWxkfSBmcm9tIFwiLi9zcmMvYnVpbGRcIjtcbmltcG9ydCAqIGFzIGQgZnJvbSBcIi4vc3JjL2RhdGFcIjtcblxuZXhwb3J0IGxldCBkYXRhID0gZDtcblxuZXhwb3J0ICogZnJvbSBcIi4vc3JjL2RhdGFfaGVscGVyc1wiO1xuXG5pbXBvcnQgKiBhcyBzIGZyb20gJy4vc3JjL3N0YXRlJztcblxuZXhwb3J0IGxldCBzdGF0ZSA9IHM7XG5cblxuIiwidmFyIHZlcnNpb24gPSBcIjAuMC4xXCI7IGV4cG9ydCAqIGZyb20gXCIuLi9pbmRleFwiOyBleHBvcnQge3ZlcnNpb259OyJdLCJuYW1lcyI6WyJhY3Rpb24iLCJzdGF0ZSIsIm5vb3AiLCJpZGVudGl0eSIsImtleSIsImFjY2Vzc29yIiwiZDNfdXBkYXRlYWJsZSIsImQzX3NwbGF0IiwiZDMiLCJhY2Nlc3NvciQxIiwiZmlsdGVyIiwic2VsZWN0IiwidCIsInByZXBEYXRhIiwicCIsInRpbWVzZXJpZXNbJ2RlZmF1bHQnXSIsInRpbWVzZXJpZXMucHJlcERhdGEiLCJidWNrZXRzIiwiZDNfY2xhc3MiLCJzdGF0ZS5xcyIsImxpbmVfaXRlbSIsInJlbGF0aXZlX3ZpZXciLCJ0aW1pbmdfdmlldyIsInN0YWdlZF9maWx0ZXJfdmlldyIsImJ1aWxkQ2F0ZWdvcmllcyIsImJ1aWxkQ2F0ZWdvcnlIb3VyIiwiYnVpbGREYXRhIiwiZGF0YS5idWlsZENhdGVnb3JpZXMiLCJkYXRhLmJ1aWxkQ2F0ZWdvcnlIb3VyIiwiZGF0YS5idWlsZERhdGEiLCJpbml0IiwicyIsImZpbHRlckluaXQiLCJzdGF0ZS5jb21wX2V2YWwiLCJhcGkuYWN0aW9uIiwiaGlzdG9yeVN1YnNjcmlwdGlvbnMiLCJhcGlTdWJzY3JpcHRpb25zIiwiaW5pdEV2ZW50cyIsImluaXRTdWJzY3JpcHRpb25zIiwiYXBpLmRhc2hib2FyZCIsImFwaS5saW5lX2l0ZW0iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQU8sU0FBUyxLQUFLLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRTs7RUFFdkMsSUFBSSxDQUFDLEtBQUssR0FBRyxXQUFXLEVBQUUsQ0FBQTtFQUMxQixJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTs7RUFFakIsSUFBSSxD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QUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQzdCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRO1lBQzlCLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDOztRQUVuQyxPQUFPLE1BQU0sQ0FBQyxLQUFLLEdBQUdFLElBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHQSxJQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDN0QsQ0FBQyxDQUFDOztNQUVILElBQUksSUFBSSxHQUFHRCxVQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1NBQ3JHLEtBQUssRUFBRTtTQUNQLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7VUFDdEIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakMsQ0FBQyxDQUFDOztNQUVMLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQzs7TUFFckIsSUFBSSxFQUFFLEdBQUdBLFVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO1NBQy9FLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtVQUNoQixJQUFJ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LENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztPQUN2QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7T0FDdkIsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO09BQzFELEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO09BQ3BCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7OztJQUdwRCxJQUFJLFFBQVEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7T0FDcEcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7T0FDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO09BQ3hCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztPQUMzRCxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztPQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTs7SUFFN0QsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFBOztJQUVyQixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUE7O0lBRXJCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNwQixRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUE7O0lBRXhCLE9BQU8sSUFBSTtHQUNaO0NBQ0Y7O0FDbkhjLFNBQVMsV0FBVyxDQUFDLE1BQU0sRUFBRTtFQUMxQyxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztDQUM5Qjs7OztBQUlELE1BQU0sVUFBVSxDQUFDO0VBQ2YsV0FBVyxDQUFDLE1BQU0sRUFBRTtJQUNsQixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTs7SUFFckIsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUE7O0lBRTFCLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFBO0lBQ2pCLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFBO0lBQ2hCLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFBO0lBQ2xCLElBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFBOztJQUV2QixJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDaEcsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUE7OztHQUdoQjs7RUFFRCxZQUFZLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUNwRSxjQUFjLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFOztFQUV4RSxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUN4RCxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUN0RCxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUN4RCxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRTs7RUFFMUQsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDcEQsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7Ozs7O0VBS3RELElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQ3BELEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFOztFQUV0RCxXQUFXLEdBQUc7O0lBRVosSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRTtR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LFNBQVMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ2hELElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxHQUFHO01BQ2hCLE1BQU0sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBOztFQUVwQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtFQUNyRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7O0VBRS9FLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBOztFQUV2RSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQzVDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN2QixJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQztLQUNyQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0tBQzlCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7O0VBRXBDLE9BQU8sSUFBSTs7Q0FFWjs7OztBQUlELEFBQU8sU0FBUyxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7O0FBRWhELFNBQVMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDRyxXQUFRLEVBQUU7RUFDekMsSUFBSSxPQUFPLEdBQUcsRUFBRSxFQUFFLE9BQU8sR0FBRyxFQUFFLENBQUE7O0VBRTlCLElBQUksRUFBRSxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUdBLFdBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUEsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7RUFDbEcsSUFBSSxFQUFFLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBR0EsV0FBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRTs7RUFFbEcsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElB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QUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTs7O0VBRzNILElBQUksWUFBWSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSztNQUM1RCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUN6RCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztNQUN0QyxPQUFPLE1BQU07S0FDZCxDQUFDLENBQUMsUUFBUSxDQUFDO0dBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQTs7RUFFSixJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUs7TUFDMUQsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDdkQsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7TUFDdEMsT0FBTyxNQUFNO0tBQ2QsQ0FBQyxDQUFDLFFBQVEsQ0FBQztHQUNiLENBQUMsQ0FBQyxDQUFDLENBQUE7OztFQUdKLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO01BQzlELFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FB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QUFDO1NBQ3hDLFdBQVcsQ0FBQyxJQUFJLENBQUM7U0FDakIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRTtVQUM1QixJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7VUFDckQsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FDNUMsQ0FBQztTQUNELE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUU7VUFDN0IsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1VBQ3JELGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQzVDLENBQUM7O1NBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRTtVQUM3QixJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7VUFDckQsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FDNUMsQ0FBQztTQUNELE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7VUFDMUIsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1VBQ3JELGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFB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LENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSTtZQUNsRyxJQUFJLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2hJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Y0FDMUwsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7Y0FDakIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSTtnQkFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO2VBQzdDLENBQUMsQ0FBQTthQUNIO1dBQ0YsQ0FBQyxDQUFBOztVQUVGLE9BQU8sQ0FBQztTQUNULENBQUMsRUFBRSxDQUFDLENBQUE7O01BRVAsVUFBVSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO1NBQ2hDLEdBQUcsQ0FBQyxDQUFDLElBQUk7VUFDUixDQUFDLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtVQUN6RCxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1VBQzFCLE9BQU8sQ0FBQztTQUNULENBQUMsQ0FBQTs7OztNQUlKLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7O01BRXBCLFFBQVEsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDO1NBQ3pCLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO1NBQ3pCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO1NBQ3ZCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBOztNQUU3QixJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFBO01BQ3hDLElBQUksYUFBYSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUE7Ozs7TUFJaEQsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQztTQUNqRCxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztTQUNwQixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUN0QixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztTQUMvQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7O01BRWhDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO1NBQ2xCLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1NBQy9CLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7U0FDN0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBOztNQUVkLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO1NBQ2pCLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1NBQ3JCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1NBQy9CLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7U0FDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBOztVQUVaLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQzthQUMxQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQzthQUN0QixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQzthQUN0QixLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7Ozs7VUFJaEMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO2FBQ3hDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO2FBQ2IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7YUFDZCxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQzthQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7O1VBRWhCLGFBQWEsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQzthQUN4QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQzthQUNkLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2FBQ2QsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUM7YUFDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBOztVQUVoQixhQUFhLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7YUFDMUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7YUFDZixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQzthQUNkLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO2FBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTs7VUFFaEIsYUFBYSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO2lCQUNwQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztpQkFDbkIsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQztpQkFDaEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7aUJBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO2lCQUN0QixJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztpQkFDZCxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztpQkFDZCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztpQkFDYixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBOztBQUU5QixhQUFhLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7aUJBQzFCLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2lCQUNuQixLQUFLLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDO2lCQUNoQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztpQkFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7aUJBQ3RCLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO2lCQUNkLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO2lCQUNkLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO2lCQUNkLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7OztBQUcvQixhQUFhLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7aUJBQzVCLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO2lCQUNyQixLQUFLLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDO2lCQUNoQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztpQkFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7aUJBQ3RCLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO2lCQUNkLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO2lCQUNkLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDO2lCQUNmLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7Ozs7TUFJMUIsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQztTQUNoRCxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztTQUNwQixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUN0QixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztTQUMvQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7O01BRWhDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO1NBQ2xCLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1NBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTs7TUFFbkIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7U0FDakIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7U0FDckIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7U0FDM0IsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7U0FDNUIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7U0FDM0IsS0FBSyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUM7U0FDL0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBOztRQUVkLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQzthQUN4QyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQzthQUN0QixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQzthQUN0QixLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7Ozs7VUFJaEMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO2FBQ3hDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO2FBQ2IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7YUFDZCxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQzthQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7O1VBRWhCLGFBQWEsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQzthQUN4QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQzthQUNkLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2FBQ2QsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUM7YUFDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBOztVQUVoQixhQUFhLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7YUFDMUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7YUFDZixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQzthQUNkLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO2FBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTs7VUFFaEIsYUFBYSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO2lCQUNwQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztpQkFDbkIsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQztpQkFDaEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7aUJBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO2lCQUN0QixJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztpQkFDZCxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztpQkFDZCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztpQkFDYixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBOztTQUVyQixhQUFhLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7WUFDeEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDbkIsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQztZQUNoQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztZQUN0QixJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBOzs7U0FHakIsYUFBYSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO1lBQzFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ3JCLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUM7WUFDaEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDdEIsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDO1lBQ2YsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTs7Ozs7OztNQU9yQixJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDO1NBQ3JELE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO1NBQ3pCLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1NBQ3BCLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1NBQy9CLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7OztTQUc3QixLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQztTQUMzQixLQUFLLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBOztNQUU3QixTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBOztNQUVsQixJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNqRyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBOztNQUUxQixJQUFJLFFBQVEsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztTQUNyRSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztTQUN0QixLQUFLLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztTQUMxQixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQzs7U0FFdEIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQTs7TUFFbEMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1NBQ3BDLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1NBQy9CLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7U0FDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7U0FDdkIsRUFBRSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsRUFBRTtVQUN2QixJQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQzNCLENBQUMsQ0FBQTs7TUFFSixRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7U0FDekIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUM7U0FDL0IsS0FBSyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUM7U0FDakMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7U0FDdEIsSUFBSSxDQUFDLENBQUMsSUFBSTtVQUNULE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHO1NBQ3pDLENBQUM7U0FDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFO1NBQ3pCLElBQUksQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7O01BRTNCLGFBQWEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1NBQzFELEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1NBQ3JCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7U0FDN0IsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUM7U0FDNUIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUM7U0FDekIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7U0FDM0IsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7U0FDM0IsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7U0FDNUIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUM7U0FDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTs7O01BR3ZDLGFBQWEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1NBQ3RELEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1NBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtVQUNoQixJQUFJLEtBQUssR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1VBQzNCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUE7VUFDcEIsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7O1NBRXRDLENBQUMsQ0FBQTs7O01BR0osSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUM7U0FDcEQsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7U0FDekIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7U0FDcEIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUM7U0FDL0IsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQzs7O1NBRzdCLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO1NBQzNCLEtBQUssQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUE7O01BRTdCLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7OztNQUdsQixJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNwRyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBOztNQUUxQixJQUFJLFFBQVEsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztTQUNyRSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztTQUN0QixLQUFLLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztTQUMxQixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQzs7U0FFdEIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQTs7TUFFbEMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1NBQ3BDLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1NBQy9CLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7U0FDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7U0FDdkIsRUFBRSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsRUFBRTtVQUN2QixJQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQzNCLENBQUMsQ0FBQTs7TUFFSixRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztTQUNyQixLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztTQUMvQixLQUFLLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQztTQUNqQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztTQUN0QixJQUFJLENBQUMsQ0FBQyxJQUFJO1VBQ1QsT0FBTyxDQUFDLENBQUMsR0FBRztTQUNiLENBQUMsQ0FBQTs7TUFFSixhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztTQUMxRCxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztTQUNyQixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUN0QixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1NBQzdCLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO1NBQ3pCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1NBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7OztNQUd2QyxhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztTQUN0RCxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztTQUN0QixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUN0QixLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztTQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7VUFDaEIsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtVQUMzQixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFBO1VBQ3JCLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBOztTQUV0QyxDQUFDLENBQUE7OztNQUdKLE9BQU8sSUFBSTtLQUNaO0lBQ0QsRUFBRSxFQUFFLFNBQVNGLFNBQU0sRUFBRSxFQUFFLEVBQUU7TUFDdkIsSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQ0EsU0FBTSxDQUFDLElBQUlFLE1BQUksQ0FBQztNQUN0RCxJQUFJLENBQUMsR0FBRyxDQUFDRixTQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7TUFDdEIsT0FBTyxJQUFJO0tBQ1o7Q0FDSixDQUFBLEFBQ0QsQUFBK0I7O0FDMWF4QixTQUFTLFlBQVksQ0FBQyxNQUFNLEVBQUU7RUFDbkMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUE7RUFDYixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtDQUNyQjs7QUFFRCxTQUFTRSxPQUFJLEdBQUcsRUFBRTtBQUNsQixBQUNBLEFBR0EsQUFBZSxTQUFTLGFBQWEsQ0FBQyxNQUFNLEVBQUU7RUFDNUMsT0FBTyxJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUM7Q0FDaEM7O0FBRUQsWUFBWSxDQUFDLFNBQVMsR0FBRztJQUNyQixJQUFJLEVBQUUsU0FBUyxHQUFHLEVBQUU7TUFDbEIsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7S0FDdkM7SUFDRCxHQUFHLEVBQUUsU0FBUyxHQUFHLEVBQUU7TUFDakIsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7S0FDdEM7SUFDRCxJQUFJLEVBQUUsV0FBVzs7TUFFZixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxFQUFFO1VBQzlFLE1BQU0sR0FBRyxFQUFFLENBQUM7O01BRWhCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFO1NBQ3RCLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNqQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTs7TUFFMUIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBOztNQUU1QyxJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDekYsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7U0FDdEIsS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQTs7TUFFNUIsSUFBSSxHQUFHLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDdEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7U0FDbkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTs7O01BR3hCLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQzdELE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1NBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ1gsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1NBQ3JELElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO1NBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7O01BRXRCLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQzdELE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1NBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ1gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1NBQ2xCLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDO1NBQzdELElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztTQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUE7O01BRWhDLE9BQU8sSUFBSTtLQUNaO0lBQ0QsRUFBRSxFQUFFLFNBQVNGLFNBQU0sRUFBRSxFQUFFLEVBQUU7TUFDdkIsSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQ0EsU0FBTSxDQUFDLElBQUlFLE9BQUksQ0FBQztNQUN0RCxJQUFJLENBQUMsR0FBRyxDQUFDRixTQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7TUFDdEIsT0FBTyxJQUFJO0tBQ1o7Q0FDSixDQUFBOztBQ3pERCxTQUFTRSxNQUFJLEdBQUcsRUFBRTtBQUNsQixBQUNBLEFBR0EsQUFBTyxTQUFTLFVBQVUsQ0FBQyxNQUFNLEVBQUU7RUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRztJQUNULE1BQU0sRUFBRUEsTUFBSTtHQUNiLENBQUE7RUFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtDQUNyQjs7OztBQUlELEFBQWUsU0FBUyxXQUFXLENBQUMsTUFBTSxFQUFFO0VBQzFDLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO0NBQzlCOztBQUVELFVBQVUsQ0FBQyxTQUFTLEdBQUc7SUFDbkIsSUFBSSxFQUFFLFNBQVMsR0FBRyxFQUFFO01BQ2xCLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0tBQ3ZDO0lBQ0QsT0FBTyxFQUFFLFNBQVMsR0FBRyxFQUFFO01BQ3JCLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO0tBQzFDO0lBQ0QsSUFBSSxFQUFFLFdBQVc7O01BRWYsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFBOztNQUVmLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNO1VBQ3RCLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFO1VBQ3JCLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFO1VBQ2xCLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7VUFDdkQsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTs7TUFFdEQsTUFBTSxDQUFDLFFBQVEsQ0FBQztTQUNiLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1NBQ25CLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDYixFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzdELElBQUksRUFBRSxDQUFBOzs7O01BSVQsUUFBUSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFBO01BQ3ZELFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7O01BRXBCLElBQUlVLElBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1NBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTs7O01BR2pCLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUM7VUFDNUUsT0FBTyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1VBQ25FLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7TUFFckNBLElBQUMsQ0FBQyxPQUFPLENBQUM7WUFDSixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7WUFDcEQsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQ3JELENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztZQUN4RCxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQzFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7WUFDcEQsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1NBQzVELENBQUM7U0FDRCxJQUFJLENBQUMsWUFBWSxDQUFDO1NBQ2xCLFdBQVcsQ0FBQyxVQUFVLENBQUM7U0FDdkIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTs7VUFFdkIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7VUFDN0QsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFDL0UsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUQsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFO1dBQ2xFOztVQUVELEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtVQUMxRCxJQUFJQSxJQUFDLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztVQUNyQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQ0EsSUFBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzs7VUFFbEQsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQ0EsSUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7VUFDeEQsSUFBSSxFQUFFLEdBQUcsYUFBYSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2FBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7YUFDcEMsS0FBSyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUM7YUFDN0IsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7YUFDM0IsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFBOztVQUVqQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1VBQzlGLElBQUksTUFBTSxHQUFHSSxXQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFBOztVQUVwQyxlQUFlLENBQUMsRUFBRSxDQUFDO2FBQ2hCLEdBQUcsQ0FBQyxFQUFFLENBQUM7YUFDUCxJQUFJLENBQUMsTUFBTSxDQUFDO2FBQ1osSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7YUFDWixFQUFFLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxFQUFFO2NBQzlCLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7YUFDM0IsQ0FBQzthQUNELElBQUksRUFBRSxDQUFBOztTQUVWLENBQUM7U0FDRCxhQUFhLENBQUMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1NBQzVHLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7VUFDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFBO1NBQzFFLENBQUM7U0FDRCxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFOztVQUUxQixhQUFhLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMzQixHQUFHLENBQUMsR0FBRyxDQUFDO2FBQ1IsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO2FBQzlCLElBQUksRUFBRSxDQUFBOztTQUVWLENBQUMsQ0FBQTs7TUFFSkosSUFBQyxDQUFDLElBQUksRUFBRSxDQUFBOzs7TUFHUixPQUFPLElBQUk7S0FDWjtJQUNELEVBQUUsRUFBRSxTQUFTWixTQUFNLEVBQUUsRUFBRSxFQUFFO01BQ3ZCLElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUNBLFNBQU0sQ0FBQyxJQUFJRSxNQUFJLENBQUM7TUFDdEQsSUFBSSxDQUFDLEdBQUcsQ0FBQ0YsU0FBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO01BQ3RCLE9BQU8sSUFBSTtLQUNaO0NBQ0osQ0FBQTs7QUN4SEQsU0FBU0UsT0FBSSxHQUFHLEVBQUU7QUFDbEIsQUFDQSxBQUVBLFNBQVMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRTs7RUFFekMsSUFBSSxNQUFNLEdBQUcsRUFBRTtNQUNYLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7O0VBRWhELElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0tBQ3hFLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztLQUN6QixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTs7O0VBRzlCLElBQUksS0FBSyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUM7S0FDMUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTs7RUFFeEIsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO0tBQzdGLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO0tBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztLQUN2QixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNuQixLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztLQUNuQixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBOzs7Q0FHakQ7OztBQUdELEFBQU8sU0FBUyxXQUFXLENBQUMsTUFBTSxFQUFFO0VBQ2xDLElBQUksQ0FBQyxHQUFHLEdBQUc7SUFDVCxNQUFNLEVBQUVBLE9BQUk7R0FDYixDQUFBO0VBQ0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7Q0FDckI7Ozs7QUFJRCxBQUFlLFNBQVMsWUFBWSxDQUFDLE1BQU0sRUFBRTtFQUMzQyxPQUFPLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQztDQUMvQjs7QUFFRCxXQUFXLENBQUMsU0FBUyxHQUFHO0lBQ3BCLElBQUksRUFBRSxTQUFTLEdBQUcsRUFBRTtNQUNsQixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztLQUN2QztJQUNELFFBQVEsRUFBRSxTQUFTLEdBQUcsRUFBRTtNQUN0QixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztLQUMzQztJQUNELElBQUksRUFBRSxXQUFXOztNQUVmLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7U0FDeEQsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7U0FDNUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7U0FDdkIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN6QyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQztTQUN6QixLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztTQUN0QixLQUFLLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBOzs7TUFHaEMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDO1NBQ3BELE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUM7U0FDbkMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7OztNQUd2QyxNQUFNLENBQUMsSUFBSSxDQUFDO1NBQ1QsT0FBTyxDQUFDO1lBQ0wsQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDO1lBQ3hFLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDO1lBQ2pFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLGFBQWEsQ0FBQztZQUNqRSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxRQUFRLENBQUM7U0FDNUQsQ0FBQztTQUNELEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDdkQsRUFBRSxDQUFDLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUEsRUFBRSxDQUFDO1NBQzlELEVBQUUsQ0FBQyxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxRQUFRLEdBQUcsV0FBVyxDQUFBLEVBQUUsQ0FBQztTQUNoRSxFQUFFLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1NBQy9ELElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTs7O01BR3pCLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1NBQzNCLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO1NBQ25DLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDO1NBQzlCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1NBQ3JCLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO1NBQzFCLElBQUksQ0FBQyxnRkFBZ0YsQ0FBQyxDQUFBOzs7TUFHekYsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssRUFBRSxNQUFNOztNQUUvQixJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7U0FDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7U0FDcEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7U0FDckIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7U0FDdkIsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQztTQUNoQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQztTQUMzQixLQUFLLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBOzs7TUFHaEMsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1NBQzFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1NBQ3JCLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1NBQ2YsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7U0FDdkIsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBOztNQUVoQyxJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7U0FDMUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDckIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7U0FDZixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztTQUN2QixLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7OztNQUdoQyxJQUFJLEtBQUssR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7U0FDbEQsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7U0FDNUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7U0FDakIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7U0FDdkIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7U0FDdkIsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQzs7U0FFN0IsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTs7TUFFL0IsSUFBSSxVQUFVLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUM7U0FDNUQsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQztTQUNqQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztTQUNqQixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztTQUN2QixLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDOztTQUU3QixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztTQUN2QixLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBOzs7TUFHL0IsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztTQUN0QixLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztTQUNyQixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztTQUN4QixLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQztTQUM1QixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDO1NBQ25DLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO1NBQ2pCLEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO1NBQzdCLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1NBQ3pCLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1NBQzVCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7Ozs7TUFJekIsYUFBYSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1NBQ25DLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1NBQ3JCLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUM7U0FDbkMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7U0FDckIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDdEIsS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7U0FDekIsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7U0FDNUIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTs7OztNQUkvQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUE7O01BRWYsTUFBTSxDQUFDLEtBQUssQ0FBQztTQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1NBQ3ZCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7VUFDdkIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FDaEMsQ0FBQztTQUNELFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUM7U0FDakMsSUFBSSxFQUFFLENBQUE7Ozs7OztNQU1ULElBQUksR0FBRyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQztTQUMvQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztTQUNyQixLQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDO1NBQ2hDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1NBQzVCLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7U0FDOUIsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUM7U0FDNUIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7U0FDMUIsRUFBRSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsRUFBRTtVQUN2QixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7U0FDZCxDQUFDLENBQUE7OztNQUdKLElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUM7U0FDckIsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqRyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1VBQ3ZCLElBQUksQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1NBQ2xELENBQUM7U0FDRCxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUM7U0FDaEMsSUFBSSxFQUFFO1NBQ04sT0FBTztTQUNQLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1NBQ3JCLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO1NBQzVCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1NBQ3BCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7Ozs7TUFJekIsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUM7U0FDdkQsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQztTQUNoQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztTQUNqQixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztTQUN2QixLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDOztTQUU3QixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBOztNQUUxQixJQUFJLFdBQVcsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQztTQUNqRSxPQUFPLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDO1NBQ3JDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO1NBQ2pCLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO1NBQ3ZCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7O1NBRTdCLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7Ozs7Ozs7Ozs7O01BVzFCLGFBQWEsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQztTQUM1RSxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztTQUN0QixLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztTQUNyQixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztTQUN4QixLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQztTQUM1QixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDO1NBQ25DLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1NBQ3pCLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1NBQzVCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDOzs7U0FHM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBOztNQUVoQixhQUFhLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7U0FDN0UsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7U0FDdEIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7U0FDckIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7U0FDM0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7U0FDeEIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7U0FDNUIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7U0FDM0IsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQztTQUNuQyxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztTQUM1QixLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztTQUM1QixLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztTQUN6QixLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztTQUM1QixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUN0QixLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQzs7OztTQUkzQixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7Ozs7TUFJaEIsSUFBSSxRQUFRLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO1NBQzFELE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1NBQ3hCLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7O01BRTVCLGFBQWEsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQztTQUM3RSxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztTQUN0QixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztTQUM1QixJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBOzs7TUFHaEQsYUFBYSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7U0FDekUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7U0FDdEIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTs7Ozs7TUFLOUIsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7U0FDM0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7U0FDMUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBOzs7TUFHckMsSUFBSSxPQUFPLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO1NBQzFELE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1NBQ3hCLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7OztNQUc1QixhQUFhLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7U0FDOUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7U0FDdEIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7U0FDM0IsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7U0FDNUIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTs7O01BR3BELGFBQWEsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDO1NBQzFFLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1NBQ3JCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1NBQ3hCLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDO1NBQzVCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUM7U0FDbkMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDdEIsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUM7U0FDM0IsSUFBSSxDQUFDLGdEQUFnRCxDQUFDLENBQUE7Ozs7TUFJekQsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO01BQzVELFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTs7Ozs7Ozs7Ozs7O01BWTVELGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztTQUM1QixJQUFJLENBQUMsaUJBQWlCLENBQUM7U0FDdkIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7U0FDM0IsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7U0FDckIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7U0FDeEIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7U0FDNUIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7U0FDM0IsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7U0FDakIsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQztTQUNuQyxLQUFLLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQztTQUM3QixLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztTQUM1QixLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztTQUM1QixLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztTQUN6QixLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztTQUM1QixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBOzs7O01BSXpCLGFBQWEsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztTQUNwQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztTQUNyQixLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDO1NBQ2hDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1NBQ3JCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1NBQ3pCLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7Ozs7Ozs7OztNQVMvQixNQUFNLENBQUMsTUFBTSxDQUFDO1NBQ1gsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsbUNBQW1DLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtTQUM1RixFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDOztVQUV2QixJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQzNDLENBQUM7U0FDRCxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO1NBQ3JDLElBQUksRUFBRSxDQUFBOztNQUVULElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQztTQUNqRCxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztTQUNyQixLQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDO1NBQ2hDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1NBQzVCLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7U0FDOUIsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUM7U0FDNUIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7U0FDMUIsRUFBRSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsRUFBRTtVQUN2QixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7U0FDZixDQUFDLENBQUE7OztNQUdKLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7U0FDdkIsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqRyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1VBQ3ZCLElBQUksQ0FBQyxFQUFFLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1NBQ3RELENBQUM7U0FDRCxRQUFRLENBQUMsSUFBSSxDQUFDLGdCQUFnQixJQUFJLENBQUMsQ0FBQztTQUNwQyxJQUFJLEVBQUU7U0FDTixPQUFPO1NBQ1AsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7U0FDckIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7U0FDNUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDdEIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7U0FDdEIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7U0FDcEIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTs7OztNQUl6QixPQUFPLElBQUk7S0FDWjtJQUNELFdBQVcsRUFBRSxTQUFTLEdBQUcsRUFBRTtNQUN6QixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQztLQUM5QztJQUNELE1BQU0sRUFBRSxTQUFTLEdBQUcsRUFBRTtNQUNwQixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztLQUN6QztJQUNELGVBQWUsRUFBRSxTQUFTLEdBQUcsRUFBRTtNQUM3QixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDO0tBQ2xEOztJQUVELFVBQVUsRUFBRSxTQUFTLEdBQUcsRUFBRTtNQUN4QixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQztLQUM3QztJQUNELFVBQVUsRUFBRSxTQUFTLEdBQUcsRUFBRTtNQUN4QixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQztLQUM3Qzs7SUFFRCxFQUFFLEVBQUUsU0FBU0YsU0FBTSxFQUFFLEVBQUUsRUFBRTtNQUN2QixJQUFJLEVBQUUsS0FBSyxTQUFTLEVBQUUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDQSxTQUFNLENBQUMsSUFBSUUsT0FBSSxDQUFDO01BQ3RELElBQUksQ0FBQyxHQUFHLENBQUNGLFNBQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztNQUN0QixPQUFPLElBQUk7S0FDWjtDQUNKLENBQUE7O0FDL2FELElBQUlpQixTQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtBQUNoSEEsU0FBTyxHQUFHQSxTQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBOzs7QUFHbkgsU0FBU2YsT0FBSSxFQUFFLEVBQUU7O0FBRWpCLFNBQVNnQixVQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0VBQ3RDLE9BQU8sYUFBYSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDO0tBQ3ZELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO0NBQ3JCOztBQUVELFNBQVMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUU7RUFDNUMsSUFBSSxZQUFZLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7SUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsb0JBQW9CLENBQUE7SUFDakMsT0FBTyxDQUFDO0dBQ1QsQ0FBQyxFQUFFLENBQUMsQ0FBQTs7RUFFTCxZQUFZLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7SUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsb0JBQW9CLENBQUE7SUFDakMsT0FBTyxDQUFDO0dBQ1QsQ0FBQyxZQUFZLENBQUMsQ0FBQTs7RUFFZixPQUFPLFlBQVk7Q0FDcEI7OztBQUdELEFBQWUsU0FBUyxNQUFNLENBQUMsTUFBTSxFQUFFO0VBQ3JDLE9BQU8sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDO0NBQzFCOztBQUVELE1BQU0sTUFBTSxDQUFDO0VBQ1gsV0FBVyxDQUFDLE1BQU0sRUFBRTtJQUNsQixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtJQUNyQixJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQTtHQUNkOztFQUVELElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQ3BELE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFOztFQUV4RCxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUNsRSxVQUFVLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRTs7OztFQUloRSxFQUFFLENBQUNsQixTQUFNLEVBQUUsRUFBRSxFQUFFO0lBQ2IsSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQ0EsU0FBTSxDQUFDLElBQUlFLE9BQUksQ0FBQztJQUN0RCxJQUFJLENBQUMsR0FBRyxDQUFDRixTQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDdEIsT0FBTyxJQUFJO0dBQ1o7O0VBRUQsSUFBSSxHQUFHOztJQUVMLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQTs7SUFFZixJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3JCLElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZO1FBQy9CLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVztRQUM3QixDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUs7UUFDZCxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTs7O0lBR3pCLElBQUksWUFBWSxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7OztVQUdqRCxJQUFJLFVBQVUsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztZQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQTtZQUNyQyxPQUFPLENBQUM7V0FDVCxDQUFDLEVBQUUsQ0FBQyxDQUFBOztVQUVMLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztZQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQTtZQUNyQyxPQUFPLENBQUM7V0FDVCxDQUFDLFVBQVUsQ0FBQyxDQUFBOzs7O1VBSWIsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO1lBQ3JELE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7V0FDdEMsQ0FBQyxDQUFBOzs7VUFHRixJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztZQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQTs7WUFFdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFBO1lBQ3ZDLE9BQU8sQ0FBQztXQUNULENBQUMsRUFBRSxDQUFDLENBQUE7O1VBRUwsSUFBSSxZQUFZLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7WUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUE7O1lBRXZCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUE7WUFDN0MsT0FBTyxDQUFDO1dBQ1QsQ0FBQyxhQUFhLENBQUMsQ0FBQTs7OztVQUloQixJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDOUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0VBQ2QsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDaUIsU0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtFQUMvRCxPQUFPLENBQUM7Q0FDVCxDQUFDLENBQUE7O0FBRUYsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFOztFQUU3RCxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUk7SUFDbEcsSUFBSSxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO01BQzFMLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO01BQ2pCLENB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QUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtVQUMxRixLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3BCLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTTtZQUNuSixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1dBQzNCLENBQUMsQ0FBQTtTQUNIO1FBQ0QsT0FBTyxDQUFDO09BQ1QsQ0FBQTs7TUFFRCxJQUFJLFVBQVUsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtNQUNoRCxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7OztNQUd2RCxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztTQUMzRSxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7VUFDZixDQUFDLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENB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
