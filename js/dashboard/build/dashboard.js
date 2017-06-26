(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
	typeof define === 'function' && define.amd ? define('dashboard', ['exports', 'd3'], factory) :
	(factory((global.dashboard = global.dashboard || {}),global.d3));
}(this, (function (exports,d3$1) { 'use strict';

d3$1 = 'default' in d3$1 ? d3$1['default'] : d3$1;

function State(_current, _static) {

  this._noop = function() {};

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
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || this._noop;
      this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$5;
      this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$4;
      this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
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

  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$3;
      this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$7;
      this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$6;
      this._on[action] = fn;
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
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
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

  on(action,fn) {
    if (fn === undefined) return this._on[action] || noop;
    this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$10;
      this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$9;
      this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$11;
      this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$8;
      this._on[action] = fn;
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

  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$12;
      this._on[action] = fn;
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



  on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$14;
    this._on[action] = fn;
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

  on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$13;
    this._on[action] = fn;
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

  on(action, fn) {
    if (fn === undefined) return this._on[action] || noop$15;
    this._on[action] = fn;
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

  on(action, fn) {
    if (fn === undefined) return this._on[action] || noop;
    this._on[action] = fn;
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$16;
      this._on[action] = fn;
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
                var line_item = select_box.node().selectedOptions.length ? select_box.node().selectedOptions[0].__data__.key : false;

                d3.xhr("/crusher/saved_dashboard")
                  .post(JSON.stringify({
                        "name": name
                      , "endpoint": window.location.pathname + window.location.search
                      , "line_item": line_item
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$1;
      this._on[action] = fn;
      return this
    }

};

var deepcopy = function(x) {
  return JSON.parse(JSON.stringify(x))
};

function build(target) {
  return new Dashboard(target)
}

class Dashboard {

  constructor(target) {
    this._target = target;
    return this.call.bind(this)
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
     .on("add-filter", function(filter) { 
       s$$1.publish("filters",s$$1.state().filters.concat(filter).filter(x => x.value) ); 
     })
     .on("modify-filter", function(filter) { 
       var filters = s$$1.state().filters;

       var has_exisiting = filters.filter(x => (x.field + x.op) == (filter.field + filter.op) );
       
       if (has_exisiting.length) {
         var new_filters = filters.reverse().map(function(x) {
           if ((x.field == filter.field) && (x.op == filter.op)) {
             x.value += "," + filter.value;
           }
           return x
         });
         s$$1.publish("filters",new_filters.filter(x => x.value));
       } else {
         s$$1.publish("filters",s$$1.state().filters.concat(filter).filter(x => x.value));
       }

     })

     .on("staged-filter.change", function(str) { s$$1.publish("staged_filter",str ); })
     .on("action.change", function(action) { s$$1.publish("selected_action",action); })
     .on("action_date.change", function(date) { s$$1.publish("action_date",date); })
     .on("comparison_date.change", function(date) { s$$1.publish("comparison_date",date); })
     .on("comparison.change", function(action) { 
       if (action.value == false) return s$$1.publish("selected_comparison",false)
       s$$1.publish("selected_comparison",action);
     })
     .on("logic.change", function(logic) {
       s$$1.publish("logic_options",logic);
     })
     .on("filter.change", function(filters) {

       s$$1.publishBatch({
           "filters":filters
       });
     })
     .on("view.change", function(x) {
       db.loading(true);
       var CP = deepcopy(value.dashboard_options);
       CP.map(function(d) {
         if (x.value == d.value) return d.selected = 1
         d.selected = 0;
       });
       s$$1.publish("dashboard_options",CP);
     })
     .on("tab.change", function(x) {
       db.loading(true);
       value.tabs.map(function(t) {
         if (t.key == x.key) return t.selected = 1
         t.selected = 0;
       });
       s$$1.publishStatic("tabs",value.tabs);
     })
     .on("ba.sort", function(x) {
       s$$1.publish("sortby",x.value);
       s$$1.publish("filters",value.filters);
   
     })
     .draw();
   
  }
}

//import * as d3 from 'd3'

function buildCategories$1(value) {
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

function buildCategoryHour(value) {
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

function buildData(data,buckets,pop_categories) {

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
	buildCategories: buildCategories$1,
	buildCategoryHour: buildCategoryHour,
	buildData: buildData
});

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


var s$1 = Object.freeze({
	compare: compare
});

//export {default as dashboard} from "./src/dashboard";
//export {default as filter_dashboard} from "./src/filter_dashboard";
let data = d;

let state = s$1;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFzaGJvYXJkLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvc3RhdGUvc3JjL3N0YXRlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N0YXRlL3NyYy9xcy5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdGF0ZS9zcmMvY29tcF9ldmFsLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N0YXRlL2luZGV4LmpzIiwiLi4vc3JjL2hlbHBlcnMuanMiLCIuLi9zcmMvZ2VuZXJpYy9zZWxlY3QuanMiLCIuLi9zcmMvZ2VuZXJpYy9oZWFkZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvdGFibGUvYnVpbGQvdGFibGUuZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvZmlsdGVyL2J1aWxkL2ZpbHRlci5qcyIsIi4uL3NyYy92aWV3cy9maWx0ZXJfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2J1dHRvbl9yYWRpby5qcyIsIi4uL3NyYy92aWV3cy9vcHRpb25fdmlldy5qcyIsIi4uL3NyYy9kYXRhX2hlbHBlcnMuanMiLCIuLi9zcmMvdGltZXNlcmllcy5qcyIsIi4uL3NyYy9nZW5lcmljL3BpZS5qcyIsIi4uL3NyYy9nZW5lcmljL2RpZmZfYmFyLmpzIiwiLi4vc3JjL2dlbmVyaWMvY29tcF9iYXIuanMiLCIuLi9zcmMvZ2VuZXJpYy9jb21wX2J1YmJsZS5qcyIsIi4uL3NyYy9nZW5lcmljL3N0cmVhbV9wbG90LmpzIiwiLi4vc3JjL3ZpZXdzL3N1bW1hcnlfdmlldy5qcyIsIi4uL3NyYy92aWV3cy9kb21haW5fZXhwYW5kZWQuanMiLCIuLi9zcmMvdmlld3MvZG9tYWluX2J1bGxldC5qcyIsIi4uL3NyYy92aWV3cy9kb21haW5fdmlldy5qcyIsIi4uL3NyYy92aWV3cy9zZWdtZW50X3ZpZXcuanMiLCIuLi9zcmMvdmlld3MvcmVmaW5lLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZ192aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3RpbWluZ192aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3N0YWdlZF9maWx0ZXJfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2NvbmRpdGlvbmFsX3Nob3cuanMiLCIuLi9zcmMvZ2VuZXJpYy9zaGFyZS5qcyIsIi4uL3NyYy9uZXdfZGFzaGJvYXJkLmpzIiwiLi4vc3JjL2J1aWxkLmpzIiwiLi4vc3JjL2RhdGEuanMiLCIuLi9zcmMvc3RhdGUuanMiLCIuLi9pbmRleC5qcyIsImJ1bmRsZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gU3RhdGUoX2N1cnJlbnQsIF9zdGF0aWMpIHtcblxuICB0aGlzLl9ub29wID0gZnVuY3Rpb24oKSB7fVxuXG4gIHRoaXMuX29uID0ge1xuICAgICAgXCJjaGFuZ2VcIjogdGhpcy5fbm9vcFxuICAgICwgXCJidWlsZFwiOiB0aGlzLl9ub29wXG4gICAgLCBcImZvcndhcmRcIjogdGhpcy5fbm9vcFxuICAgICwgXCJiYWNrXCI6IHRoaXMuX25vb3BcbiAgfVxuXG4gIHRoaXMuX3N0YXRpYyA9IF9zdGF0aWMgfHwge31cblxuICB0aGlzLl9jdXJyZW50ID0gX2N1cnJlbnQgfHwge31cbiAgdGhpcy5fcGFzdCA9IFtdXG4gIHRoaXMuX2Z1dHVyZSA9IFtdXG5cbiAgdGhpcy5fc3Vic2NyaXB0aW9uID0ge31cbiAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcblxuXG59XG5cblN0YXRlLnByb3RvdHlwZSA9IHtcbiAgICBzdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9zdGF0ZSlcbiAgICB9XG4gICwgcHVibGlzaDogZnVuY3Rpb24obmFtZSxjYikge1xuXG4gICAgICAgdmFyIHB1c2hfY2IgPSBmdW5jdGlvbihlcnJvcix2YWx1ZSkge1xuICAgICAgICAgaWYgKGVycm9yKSByZXR1cm4gc3Vic2NyaWJlcihlcnJvcixudWxsKVxuICAgICAgICAgXG4gICAgICAgICB0aGlzLnVwZGF0ZShuYW1lLCB2YWx1ZSlcbiAgICAgICAgIHRoaXMudHJpZ2dlcihuYW1lLCB0aGlzLnN0YXRlKClbbmFtZV0sIHRoaXMuc3RhdGUoKSlcblxuICAgICAgIH0uYmluZCh0aGlzKVxuXG4gICAgICAgaWYgKHR5cGVvZiBjYiA9PT0gXCJmdW5jdGlvblwiKSBjYihwdXNoX2NiKVxuICAgICAgIGVsc2UgcHVzaF9jYihmYWxzZSxjYilcblxuICAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHB1Ymxpc2hCYXRjaDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICBPYmplY3Qua2V5cyhvYmopLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHRoaXMudXBkYXRlKHgsb2JqW3hdKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB0aGlzLnRyaWdnZXJCYXRjaChvYmosdGhpcy5zdGF0ZSgpKVxuICAgIH1cbiAgLCBwdXNoOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgdGhpcy5wdWJsaXNoKGZhbHNlLHN0YXRlKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgc3Vic2NyaWJlOiBmdW5jdGlvbigpIHtcblxuICAgICAgLy8gdGhyZWUgb3B0aW9ucyBmb3IgdGhlIGFyZ3VtZW50czpcbiAgICAgIC8vIChmbikgXG4gICAgICAvLyAoaWQsZm4pXG4gICAgICAvLyAoaWQudGFyZ2V0LGZuKVxuXG5cbiAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB0aGlzLl9nbG9iYWxfc3Vic2NyaWJlKGFyZ3VtZW50c1swXSlcbiAgICAgIGlmIChhcmd1bWVudHNbMF0uaW5kZXhPZihcIi5cIikgPT0gLTEpIHJldHVybiB0aGlzLl9uYW1lZF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pXG4gICAgICBpZiAoYXJndW1lbnRzWzBdLmluZGV4T2YoXCIuXCIpID4gLTEpIHJldHVybiB0aGlzLl90YXJnZXR0ZWRfc3Vic2NyaWJlKGFyZ3VtZW50c1swXS5zcGxpdChcIi5cIilbMF0sIGFyZ3VtZW50c1swXS5zcGxpdChcIi5cIilbMV0sIGFyZ3VtZW50c1sxXSlcblxuICAgIH1cbiAgLCB1bnN1YnNjcmliZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgIHRoaXMuc3Vic2NyaWJlKGlkLHVuZGVmaW5lZClcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICwgX2dsb2JhbF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB2YXIgaWQgPSAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgICB2YXIgciA9IE1hdGgucmFuZG9tKCkqMTZ8MCwgdiA9IGMgPT0gJ3gnID8gciA6IChyJjB4M3wweDgpO1xuICAgICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICAgICAgfSlcbiAgICAgICwgdG8gPSBcIipcIjtcbiAgICAgXG4gICAgICB0aGlzLl90YXJnZXR0ZWRfc3Vic2NyaWJlKGlkLHRvLGZuKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBfbmFtZWRfc3Vic2NyaWJlOiBmdW5jdGlvbihpZCxmbikge1xuICAgICAgdmFyIHRvID0gXCIqXCJcbiAgICAgIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoaWQsdG8sZm4pXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIF90YXJnZXR0ZWRfc3Vic2NyaWJlOiBmdW5jdGlvbihpZCx0byxmbikge1xuXG4gICAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX29iaih0bylcbiAgICAgICAgLCB0b19zdGF0ZSA9IHRoaXMuX3N0YXRlW3RvXVxuICAgICAgICAsIHN0YXRlID0gdGhpcy5fc3RhdGU7XG5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiAmJiBmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gc3Vic2NyaXB0aW9uc1tpZF0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlbGV0ZSBzdWJzY3JpcHRpb25zW2lkXVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgfVxuICAgICAgc3Vic2NyaXB0aW9uc1tpZF0gPSBmbjtcblxuICAgICAgcmV0dXJuIHRoaXMgICAgICBcbiAgICB9XG4gIFxuICAsIGdldF9zdWJzY3JpYmVyc19vYmo6IGZ1bmN0aW9uKGspIHtcbiAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbltrXSA9IHRoaXMuX3N1YnNjcmlwdGlvbltrXSB8fCB7fVxuICAgICAgcmV0dXJuIHRoaXMuX3N1YnNjcmlwdGlvbltrXVxuICAgIH1cbiAgLCBnZXRfc3Vic2NyaWJlcnNfZm46IGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBmbnMgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19vYmooaylcbiAgICAgICAgLCBmdW5jcyA9IE9iamVjdC5rZXlzKGZucykubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGZuc1t4XSB9KVxuICAgICAgICAsIGZuID0gZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jcy5tYXAoZnVuY3Rpb24oZykgeyByZXR1cm4gZyhlcnJvcix2YWx1ZSxzdGF0ZSkgfSlcbiAgICAgICAgICB9XG5cbiAgICAgIHJldHVybiBmblxuICAgIH1cbiAgLCB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lLCBfdmFsdWUsIF9zdGF0ZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXIgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihuYW1lKSB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICwgYWxsID0gdGhpcy5nZXRfc3Vic2NyaWJlcnNfZm4oXCIqXCIpIHx8IGZ1bmN0aW9uKCkge307XG5cbiAgICAgIHRoaXMub24oXCJjaGFuZ2VcIikobmFtZSxfdmFsdWUsX3N0YXRlKVxuXG4gICAgICBzdWJzY3JpYmVyKGZhbHNlLF92YWx1ZSxfc3RhdGUpXG4gICAgICBhbGwoZmFsc2UsX3N0YXRlKVxuICAgIH1cbiAgLCB0cmlnZ2VyQmF0Y2g6IGZ1bmN0aW9uKG9iaiwgX3N0YXRlKSB7XG5cbiAgICAgIHZhciBhbGwgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihcIipcIikgfHwgZnVuY3Rpb24oKSB7fVxuICAgICAgICAsIGZucyA9IE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgICAgICB2YXIgZm4gPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbiB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICAgICByZXR1cm4gZm4uYmluZCh0aGlzKShrKShmYWxzZSxvYmpba10sX3N0YXRlKSAgXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgXG4gICAgICBhbGwoZmFsc2UsX3N0YXRlKVxuXG4gICAgfVxuICAsIF9idWlsZFN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jdXJyZW50KVxuXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLl9zdGF0aWMpLm1hcChmdW5jdGlvbihrKSB7IFxuICAgICAgICB0aGlzLl9zdGF0ZVtrXSA9IHRoaXMuX3N0YXRpY1trXVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB0aGlzLm9uKFwiYnVpbGRcIikodGhpcy5fc3RhdGUsIHRoaXMuX2N1cnJlbnQsIHRoaXMuX3N0YXRpYylcblxuICAgICAgcmV0dXJuIHRoaXMuX3N0YXRlXG4gICAgfVxuICAsIHVwZGF0ZTogZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgIHRoaXMuX3Bhc3RQdXNoKHRoaXMuX2N1cnJlbnQpXG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICB2YXIgb2JqID0ge31cbiAgICAgICAgb2JqW25hbWVdID0gdmFsdWU7XG4gICAgICB9XG4gICAgICB0aGlzLl9jdXJyZW50ID0gKG5hbWUpID8gXG4gICAgICAgIE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2N1cnJlbnQsIG9iaikgOlxuICAgICAgICBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9jdXJyZW50LCB2YWx1ZSApXG5cbiAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzZXRTdGF0aWM6IGZ1bmN0aW9uKGssdikge1xuICAgICAgaWYgKGsgIT0gdW5kZWZpbmVkICYmIHYgIT0gdW5kZWZpbmVkKSB0aGlzLl9zdGF0aWNba10gPSB2XG4gICAgICB0aGlzLl9idWlsZFN0YXRlKClcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcHVibGlzaFN0YXRpYzogZnVuY3Rpb24obmFtZSxjYikge1xuXG4gICAgICB2YXIgcHVzaF9jYiA9IGZ1bmN0aW9uKGVycm9yLHZhbHVlKSB7XG4gICAgICAgIGlmIChlcnJvcikgcmV0dXJuIHN1YnNjcmliZXIoZXJyb3IsbnVsbClcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX3N0YXRpY1tuYW1lXSA9IHZhbHVlXG4gICAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuICAgICAgICB0aGlzLnRyaWdnZXIobmFtZSwgdGhpcy5zdGF0ZSgpW25hbWVdLCB0aGlzLnN0YXRlKCkpXG5cbiAgICAgIH0uYmluZCh0aGlzKVxuXG4gICAgICBpZiAodHlwZW9mIGNiID09PSBcImZ1bmN0aW9uXCIpIGNiKHB1c2hfY2IpXG4gICAgICBlbHNlIHB1c2hfY2IoZmFsc2UsY2IpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgX3Bhc3RQdXNoOiBmdW5jdGlvbih2KSB7XG4gICAgICB0aGlzLl9wYXN0LnB1c2godilcbiAgICB9XG4gICwgX2Z1dHVyZVB1c2g6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHRoaXMuX2Z1dHVyZS5wdXNoKHYpXG4gICAgfVxuICAsIGZvcndhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fcGFzdFB1c2godGhpcy5fY3VycmVudClcbiAgICAgIHRoaXMuX2N1cnJlbnQgPSB0aGlzLl9mdXR1cmUucG9wKClcblxuICAgICAgdGhpcy5vbihcImZvcndhcmRcIikodGhpcy5fY3VycmVudCx0aGlzLl9wYXN0LCB0aGlzLl9mdXR1cmUpXG5cbiAgICAgIHRoaXMuX3N0YXRlID0gdGhpcy5fYnVpbGRTdGF0ZSgpXG4gICAgICB0aGlzLnRyaWdnZXIoZmFsc2UsIHRoaXMuX3N0YXRlLCB0aGlzLl9zdGF0ZSlcbiAgICB9XG4gICwgYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9mdXR1cmVQdXNoKHRoaXMuX2N1cnJlbnQpXG4gICAgICB0aGlzLl9jdXJyZW50ID0gdGhpcy5fcGFzdC5wb3AoKVxuXG4gICAgICB0aGlzLm9uKFwiYmFja1wiKSh0aGlzLl9jdXJyZW50LHRoaXMuX2Z1dHVyZSwgdGhpcy5fcGFzdClcblxuICAgICAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcbiAgICAgIHRoaXMudHJpZ2dlcihmYWxzZSwgdGhpcy5fc3RhdGUsIHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgdGhpcy5fbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSBcbiAgXG59XG5cbmZ1bmN0aW9uIHN0YXRlKF9jdXJyZW50LCBfc3RhdGljKSB7XG4gIHJldHVybiBuZXcgU3RhdGUoX2N1cnJlbnQsIF9zdGF0aWMpXG59XG5cbnN0YXRlLnByb3RvdHlwZSA9IFN0YXRlLnByb3RvdHlwZVxuXG5leHBvcnQgZGVmYXVsdCBzdGF0ZTtcbiIsImV4cG9ydCBmdW5jdGlvbiBRUyhzdGF0ZSkge1xuICAvL3RoaXMuc3RhdGUgPSBzdGF0ZVxuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy5fZW5jb2RlT2JqZWN0ID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvKVxuICB9XG5cbiAgdGhpcy5fZW5jb2RlQXJyYXkgPSBmdW5jdGlvbihvKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG8pXG4gIH1cbn1cblxuLy8gTFpXLWNvbXByZXNzIGEgc3RyaW5nXG5mdW5jdGlvbiBsendfZW5jb2RlKHMpIHtcbiAgICB2YXIgZGljdCA9IHt9O1xuICAgIHZhciBkYXRhID0gKHMgKyBcIlwiKS5zcGxpdChcIlwiKTtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgdmFyIGN1cnJDaGFyO1xuICAgIHZhciBwaHJhc2UgPSBkYXRhWzBdO1xuICAgIHZhciBjb2RlID0gMjU2O1xuICAgIGZvciAodmFyIGk9MTsgaTxkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN1cnJDaGFyPWRhdGFbaV07XG4gICAgICAgIGlmIChkaWN0W3BocmFzZSArIGN1cnJDaGFyXSAhPSBudWxsKSB7XG4gICAgICAgICAgICBwaHJhc2UgKz0gY3VyckNoYXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvdXQucHVzaChwaHJhc2UubGVuZ3RoID4gMSA/IGRpY3RbcGhyYXNlXSA6IHBocmFzZS5jaGFyQ29kZUF0KDApKTtcbiAgICAgICAgICAgIGRpY3RbcGhyYXNlICsgY3VyckNoYXJdID0gY29kZTtcbiAgICAgICAgICAgIGNvZGUrKztcbiAgICAgICAgICAgIHBocmFzZT1jdXJyQ2hhcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBvdXQucHVzaChwaHJhc2UubGVuZ3RoID4gMSA/IGRpY3RbcGhyYXNlXSA6IHBocmFzZS5jaGFyQ29kZUF0KDApKTtcbiAgICBmb3IgKHZhciBpPTA7IGk8b3V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dFtpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUob3V0W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKFwiXCIpO1xufVxuXG4vLyBEZWNvbXByZXNzIGFuIExaVy1lbmNvZGVkIHN0cmluZ1xuZnVuY3Rpb24gbHp3X2RlY29kZShzKSB7XG4gICAgdmFyIGRpY3QgPSB7fTtcbiAgICB2YXIgZGF0YSA9IChzICsgXCJcIikuc3BsaXQoXCJcIik7XG4gICAgdmFyIGN1cnJDaGFyID0gZGF0YVswXTtcbiAgICB2YXIgb2xkUGhyYXNlID0gY3VyckNoYXI7XG4gICAgdmFyIG91dCA9IFtjdXJyQ2hhcl07XG4gICAgdmFyIGNvZGUgPSAyNTY7XG4gICAgdmFyIHBocmFzZTtcbiAgICBmb3IgKHZhciBpPTE7IGk8ZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY3VyckNvZGUgPSBkYXRhW2ldLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIGlmIChjdXJyQ29kZSA8IDI1Nikge1xuICAgICAgICAgICAgcGhyYXNlID0gZGF0YVtpXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgcGhyYXNlID0gZGljdFtjdXJyQ29kZV0gPyBkaWN0W2N1cnJDb2RlXSA6IChvbGRQaHJhc2UgKyBjdXJyQ2hhcik7XG4gICAgICAgIH1cbiAgICAgICAgb3V0LnB1c2gocGhyYXNlKTtcbiAgICAgICAgY3VyckNoYXIgPSBwaHJhc2UuY2hhckF0KDApO1xuICAgICAgICBkaWN0W2NvZGVdID0gb2xkUGhyYXNlICsgY3VyckNoYXI7XG4gICAgICAgIGNvZGUrKztcbiAgICAgICAgb2xkUGhyYXNlID0gcGhyYXNlO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oXCJcIik7XG59XG5cblFTLnByb3RvdHlwZSA9IHtcbiAgICB0bzogZnVuY3Rpb24oc3RhdGUsZW5jb2RlKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdmFyIHBhcmFtcyA9IE9iamVjdC5rZXlzKHN0YXRlKS5tYXAoZnVuY3Rpb24oaykge1xuXG4gICAgICAgIHZhciB2YWx1ZSA9IHN0YXRlW2tdXG4gICAgICAgICAgLCBvID0gdmFsdWU7XG5cbiAgICAgICAgaWYgKHZhbHVlICYmICh0eXBlb2YodmFsdWUpID09IFwib2JqZWN0XCIpICYmICh2YWx1ZS5sZW5ndGggPiAwKSkge1xuICAgICAgICAgIG8gPSBzZWxmLl9lbmNvZGVBcnJheSh2YWx1ZSlcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YodmFsdWUpID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICBvID0gc2VsZi5fZW5jb2RlT2JqZWN0KHZhbHVlKVxuICAgICAgICB9IFxuXG4gICAgICAgIHJldHVybiBrICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQobykgXG5cbiAgICAgIH0pXG5cbiAgICAgIGlmIChlbmNvZGUpIHJldHVybiBcIj9cIiArIFwiZW5jb2RlZD1cIiArIGJ0b2EoZXNjYXBlKGx6d19lbmNvZGUocGFyYW1zLmpvaW4oXCImXCIpKSkpO1xuICAgICAgcmV0dXJuIFwiP1wiICsgcGFyYW1zLmpvaW4oXCImXCIpXG4gICAgICBcbiAgICB9XG4gICwgZnJvbTogZnVuY3Rpb24ocXMpIHtcbiAgICAgIHZhciBxdWVyeSA9IHt9O1xuICAgICAgaWYgKHFzLmluZGV4T2YoXCI/ZW5jb2RlZD1cIikgPT0gMCkgcXMgPSBsendfZGVjb2RlKHVuZXNjYXBlKGF0b2IocXMuc3BsaXQoXCI/ZW5jb2RlZD1cIilbMV0pKSlcbiAgICAgIHZhciBhID0gcXMuc3Vic3RyKDEpLnNwbGl0KCcmJyk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgYiA9IGFbaV0uc3BsaXQoJz0nKTtcbiAgICAgICAgICBcbiAgICAgICAgICBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldID0gKGRlY29kZVVSSUNvbXBvbmVudChiWzFdIHx8ICcnKSk7XG4gICAgICAgICAgdmFyIF9jaGFyID0gcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXVswXSBcbiAgICAgICAgICBpZiAoKF9jaGFyID09IFwie1wiKSB8fCAoX2NoYXIgPT0gXCJbXCIpKSBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldID0gSlNPTi5wYXJzZShxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHF1ZXJ5O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcXMoc3RhdGUpIHtcbiAgcmV0dXJuIG5ldyBRUyhzdGF0ZSlcbn1cblxucXMucHJvdG90eXBlID0gUVMucHJvdG90eXBlXG5cbmV4cG9ydCBkZWZhdWx0IHFzO1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcGFyaXNvbl9ldmFsKG9iajEsb2JqMixfZmluYWwpIHtcbiAgcmV0dXJuIG5ldyBDb21wYXJpc29uRXZhbChvYmoxLG9iajIsX2ZpbmFsKVxufVxuXG52YXIgbm9vcCA9ICh4KSA9PiB7fVxuICAsIGVxb3AgPSAoeCx5KSA9PiB4ID09IHlcbiAgLCBhY2MgPSAobmFtZSxzZWNvbmQpID0+IHtcbiAgICAgIHJldHVybiAoeCx5KSA9PiBzZWNvbmQgPyB5W25hbWVdIDogeFtuYW1lXSBcbiAgICB9XG5cbmNsYXNzIENvbXBhcmlzb25FdmFsIHtcbiAgY29uc3RydWN0b3Iob2JqMSxvYmoyLF9maW5hbCkge1xuICAgIHRoaXMuX29iajEgPSBvYmoxXG4gICAgdGhpcy5fb2JqMiA9IG9iajJcbiAgICB0aGlzLl9maW5hbCA9IF9maW5hbFxuICAgIHRoaXMuX2NvbXBhcmlzb25zID0ge31cbiAgfVxuXG4gIGFjY2Vzc29yKG5hbWUsYWNjMSxhY2MyKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgYWNjMTogYWNjMVxuICAgICAgLCBhY2MyOiBhY2MyXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3VjY2VzcyhuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgc3VjY2VzczogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBmYWlsdXJlKG5hbWUsZm4pIHtcbiAgICB0aGlzLl9jb21wYXJpc29uc1tuYW1lXSA9IE9iamVjdC5hc3NpZ24oe30sdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0se1xuICAgICAgICBmYWlsdXJlOiBmblxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGVxdWFsKG5hbWUsZm4pIHtcbiAgICB0aGlzLl9jb21wYXJpc29uc1tuYW1lXSA9IE9iamVjdC5hc3NpZ24oe30sdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0se1xuICAgICAgICBlcTogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBldmFsdWF0ZSgpIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLl9jb21wYXJpc29ucykubWFwKCBrID0+IHtcbiAgICAgIHRoaXMuX2V2YWwodGhpcy5fY29tcGFyaXNvbnNba10saylcbiAgICB9KVxuICAgIHJldHVybiB0aGlzLl9maW5hbFxuICB9XG4gIFxuXG4gIGNvbXBhcnNpb24obmFtZSxhY2MxLGFjYzIsZXEsc3VjY2VzcyxmYWlsdXJlKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSB7XG4gICAgICAgIGFjYzE6IGFjYzFcbiAgICAgICwgYWNjMjogYWNjMlxuICAgICAgLCBlcTogZXEgfHwgZXFvcFxuICAgICAgLCBzdWNjZXNzOiBzdWNjZXNzIHx8IG5vb3BcbiAgICAgICwgZmFpbHVyZTogZmFpbHVyZSB8fCBub29wXG4gICAgfVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBfZXZhbChjb21wYXJpc29uLG5hbWUpIHtcbiAgICB2YXIgYWNjMSA9IGNvbXBhcmlzb24uYWNjMSB8fCBhY2MobmFtZSlcbiAgICAgICwgYWNjMiA9IGNvbXBhcmlzb24uYWNjMiB8fCBhY2MobmFtZSx0cnVlKVxuICAgICAgLCB2YWwxID0gYWNjMSh0aGlzLl9vYmoxLHRoaXMuX29iajIpXG4gICAgICAsIHZhbDIgPSBhY2MyKHRoaXMuX29iajEsdGhpcy5fb2JqMilcbiAgICAgICwgZXEgPSBjb21wYXJpc29uLmVxIHx8IGVxb3BcbiAgICAgICwgc3VjYyA9IGNvbXBhcmlzb24uc3VjY2VzcyB8fCBub29wXG4gICAgICAsIGZhaWwgPSBjb21wYXJpc29uLmZhaWx1cmUgfHwgbm9vcFxuXG4gICAgdmFyIF9ldmFsZCA9IGVxKHZhbDEsIHZhbDIpXG5cbiAgICBfZXZhbGQgPyBcbiAgICAgIHN1Y2MuYmluZCh0aGlzKSh2YWwxLHZhbDIsdGhpcy5fZmluYWwpIDogXG4gICAgICBmYWlsLmJpbmQodGhpcykodmFsMSx2YWwyLHRoaXMuX2ZpbmFsKVxuICB9XG5cbiAgXG59XG4iLCJleHBvcnQge2RlZmF1bHQgYXMgc3RhdGV9IGZyb20gXCIuL3NyYy9zdGF0ZVwiO1xuZXhwb3J0IHtkZWZhdWx0IGFzIHFzfSBmcm9tIFwiLi9zcmMvcXNcIjtcbmV4cG9ydCB7ZGVmYXVsdCBhcyBjb21wX2V2YWx9IGZyb20gXCIuL3NyYy9jb21wX2V2YWxcIjtcblxuaW1wb3J0IHN0YXRlIGZyb20gXCIuL3NyYy9zdGF0ZVwiO1xuXG5kZWJ1Z2dlclxuZXhwb3J0IGNvbnN0IHMgPSB3aW5kb3cuX19zdGF0ZV9fIHx8IHN0YXRlKClcbndpbmRvdy5fX3N0YXRlX18gPSBzXG5cbmV4cG9ydCBkZWZhdWx0IHM7XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9wU2VjdGlvbihzZWN0aW9uKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHNlY3Rpb24sXCIudG9wLXNlY3Rpb25cIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidG9wLXNlY3Rpb25cIix0cnVlKVxuICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjE2MHB4XCIpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1haW5pbmdTZWN0aW9uKHNlY3Rpb24pIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUoc2VjdGlvbixcIi5yZW1haW5pbmctc2VjdGlvblwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJyZW1haW5pbmctc2VjdGlvblwiLHRydWUpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdXRvU2l6ZSh3cmFwLGFkanVzdFdpZHRoLGFkanVzdEhlaWdodCkge1xuXG4gIGZ1bmN0aW9uIGVsZW1lbnRUb1dpZHRoKGVsZW0pIHtcblxuICAgIHZhciBfdyA9IHdyYXAubm9kZSgpLm9mZnNldFdpZHRoIHx8IHdyYXAubm9kZSgpLnBhcmVudE5vZGUub2Zmc2V0V2lkdGggfHwgd3JhcC5ub2RlKCkucGFyZW50Tm9kZS5wYXJlbnROb2RlLm9mZnNldFdpZHRoXG4gICAgdmFyIG51bSA9IF93IHx8IHdyYXAuc3R5bGUoXCJ3aWR0aFwiKS5zcGxpdChcIi5cIilbMF0ucmVwbGFjZShcInB4XCIsXCJcIikgXG4gICAgcmV0dXJuIHBhcnNlSW50KG51bSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGVsZW1lbnRUb0hlaWdodChlbGVtKSB7XG4gICAgdmFyIG51bSA9IHdyYXAuc3R5bGUoXCJoZWlnaHRcIikuc3BsaXQoXCIuXCIpWzBdLnJlcGxhY2UoXCJweFwiLFwiXCIpXG4gICAgcmV0dXJuIHBhcnNlSW50KG51bSlcbiAgfVxuXG4gIHZhciB3ID0gZWxlbWVudFRvV2lkdGgod3JhcCkgfHwgNzAwLFxuICAgIGggPSBlbGVtZW50VG9IZWlnaHQod3JhcCkgfHwgMzQwO1xuXG4gIHcgPSBhZGp1c3RXaWR0aCh3KVxuICBoID0gYWRqdXN0SGVpZ2h0KGgpXG5cblxuICB2YXIgbWFyZ2luID0ge3RvcDogMTAsIHJpZ2h0OiAxNSwgYm90dG9tOiAxMCwgbGVmdDogMTV9LFxuICAgICAgd2lkdGggID0gdyAtIG1hcmdpbi5sZWZ0IC0gbWFyZ2luLnJpZ2h0LFxuICAgICAgaGVpZ2h0ID0gaCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tO1xuXG4gIHJldHVybiB7XG4gICAgbWFyZ2luOiBtYXJnaW4sXG4gICAgd2lkdGg6IHdpZHRoLFxuICAgIGhlaWdodDogaGVpZ2h0XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGF1dG9TY2FsZXMoX3NpemVzLCBsZW4pIHtcblxuICB2YXIgbWFyZ2luID0gX3NpemVzLm1hcmdpbixcbiAgICB3aWR0aCA9IF9zaXplcy53aWR0aCxcbiAgICBoZWlnaHQgPSBfc2l6ZXMuaGVpZ2h0O1xuXG4gIGhlaWdodCA9IGxlbiAqIDI2XG4gIFxuICB2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAucmFuZ2UoW3dpZHRoLzIsIHdpZHRoLTIwXSk7XG4gIFxuICB2YXIgeSA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgLnJhbmdlUm91bmRCYW5kcyhbMCwgaGVpZ2h0XSwgLjIpO1xuXG4gIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKClcbiAgICAgIC5zY2FsZSh4KVxuICAgICAgLm9yaWVudChcInRvcFwiKTtcblxuXG4gIHJldHVybiB7XG4gICAgICB4OiB4XG4gICAgLCB5OiB5XG4gICAgLCB4QXhpczogeEF4aXNcbiAgfVxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBTZWxlY3QodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2VsZWN0KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNlbGVjdCh0YXJnZXQpXG59XG5cblNlbGVjdC5wcm90b3R5cGUgPSB7XG4gICAgb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm9wdGlvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcblxuICAgICAgdGhpcy5fc2VsZWN0ID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcInNlbGVjdFwiLFwic2VsZWN0XCIsdGhpcy5fb3B0aW9ucylcblxuICAgICAgdmFyIGJvdW5kID0gdGhpcy5vbihcInNlbGVjdFwiKS5iaW5kKHRoaXMpXG5cbiAgICAgIHRoaXMuX3NlbGVjdFxuICAgICAgICAub24oXCJjaGFuZ2VcIixmdW5jdGlvbih4KSB7IGJvdW5kKHRoaXMuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fKSB9KVxuXG4gICAgICB0aGlzLl9vcHRpb25zID0gZDNfc3BsYXQodGhpcy5fc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIixpZGVudGl0eSxrZXkpXG4gICAgICAgIC50ZXh0KGtleSlcbiAgICAgICAgLnByb3BlcnR5KFwic2VsZWN0ZWRcIiwgKHgpID0+IHgudmFsdWUgPT0gdGhpcy5fc2VsZWN0ZWQgPyBcInNlbGVjdGVkXCIgOiBudWxsKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzZWxlY3RlZDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlbGVjdGVkXCIsdmFsKVxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuL3NlbGVjdCdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmZ1bmN0aW9uIGluamVjdENzcyhjc3Nfc3RyaW5nKSB7XG4gIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI2hlYWRlci1jc3NcIixcInN0eWxlXCIpXG4gICAgLmF0dHIoXCJpZFwiLFwiaGVhZGVyLWNzc1wiKVxuICAgIC50ZXh0KENTU19TVFJJTkcucmVwbGFjZShcImZ1bmN0aW9uICgpIHsvKlwiLFwiXCIpLnJlcGxhY2UoXCIqL31cIixcIlwiKSlcbn1cblxuZnVuY3Rpb24gYnV0dG9uV3JhcCh3cmFwKSB7XG4gIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwLCBcImgzLmJ1dHRvbnNcIixcImgzXCIpXG4gICAgLmNsYXNzZWQoXCJidXR0b25zXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuXG4gIHZhciByaWdodF9wdWxsID0gZDNfdXBkYXRlYWJsZShoZWFkLFwiLnB1bGwtcmlnaHRcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcInB1bGwtcmlnaHQgaGVhZGVyLWJ1dHRvbnNcIiwgdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjE3cHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjJweFwiKVxuICAgIC5zdHlsZShcInRleHQtZGVjb3JhdGlvblwiLFwibm9uZSAhaW1wb3J0YW50XCIpXG5cbiAgcmV0dXJuIHJpZ2h0X3B1bGxcbn1cblxuZnVuY3Rpb24gZXhwYW5zaW9uV3JhcCh3cmFwKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHdyYXAsXCJkaXYuaGVhZGVyLWJvZHlcIixcImRpdlwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTNweFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJub25lXCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwibm9ybWFsXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjE3NXB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMjVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjI1cHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjE3NXB4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwid2hpdGVcIilcbiAgICAuY2xhc3NlZChcImhlYWRlci1ib2R5IGhpZGRlblwiLHRydWUpXG59XG5cbmZ1bmN0aW9uIGhlYWRXcmFwKHdyYXApIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUod3JhcCwgXCJoMy5kYXRhLWhlYWRlclwiLFwiaDNcIilcbiAgICAuY2xhc3NlZChcImRhdGEtaGVhZGVyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCIgYm9sZFwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiIDE0cHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiIDIycHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwiIHVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIgIzg4OFwiKVxuICAgIC5zdHlsZShcImxldHRlci1zcGFjaW5nXCIsXCIgLjA1ZW1cIilcblxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBIZWFkZXIodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcblxuICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuICAgIC5oZWFkZXItYnV0dG9ucyBhIHNwYW4uaG92ZXItc2hvdyB7IGRpc3BsYXk6bm9uZSB9XG4gICAgLmhlYWRlci1idXR0b25zIGE6aG92ZXIgc3Bhbi5ob3Zlci1zaG93IHsgZGlzcGxheTppbmxpbmU7IHBhZGRpbmctbGVmdDozcHggfVxuICAqL30pXG4gIFxufVxuXG5mdW5jdGlvbiBoZWFkZXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgSGVhZGVyKHRhcmdldClcbn1cblxuSGVhZGVyLnByb3RvdHlwZSA9IHtcbiAgICB0ZXh0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGV4dFwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgYnV0dG9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJ1dHRvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBleHBhbnNpb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJleHBhbnNpb25cIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCwgXCIuaGVhZGVyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImhlYWRlci13cmFwXCIsdHJ1ZSlcblxuICAgICAgdmFyIGV4cGFuZF93cmFwID0gZXhwYW5zaW9uV3JhcCh3cmFwKVxuICAgICAgICAsIGJ1dHRvbl93cmFwID0gYnV0dG9uV3JhcCh3cmFwKVxuICAgICAgICAsIGhlYWRfd3JhcCA9IGhlYWRXcmFwKHdyYXApXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaGVhZF93cmFwLFwic3Bhbi50aXRsZVwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAgICAgLnRleHQodGhpcy5fdGV4dClcblxuICAgICAgaWYgKHRoaXMuX29wdGlvbnMpIHtcblxuICAgICAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwic2VsZWN0XCIpLmJpbmQodGhpcylcblxuICAgICAgICB2YXIgc2VsZWN0Qm94ID0gc2VsZWN0KGhlYWRfd3JhcClcbiAgICAgICAgICAub3B0aW9ucyh0aGlzLl9vcHRpb25zKVxuICAgICAgICAgIC5vbihcInNlbGVjdFwiLGZ1bmN0aW9uKHgpIHsgYm91bmQoeCkgfSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgc2VsZWN0Qm94Ll9zZWxlY3RcbiAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTlweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMnB4XCIpXG4gICAgICAgICAgXG4gICAgICAgIHNlbGVjdEJveC5fb3B0aW9uc1xuICAgICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCIjODg4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxMDBweFwiKVxuICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjVweFwiKVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYnV0dG9ucykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgYSA9IGQzX3NwbGF0KGJ1dHRvbl93cmFwLFwiYVwiLFwiYVwiLHRoaXMuX2J1dHRvbnMsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGV4dCB9KVxuICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIycHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWRlY29yYXRpb25cIixcIm5vbmVcIilcbiAgICAgICAgICAuaHRtbCh4ID0+IFwiPHNwYW4gY2xhc3M9J1wiICsgeC5pY29uICsgXCInPjwvc3Bhbj48c3BhbiBzdHlsZT0ncGFkZGluZy1sZWZ0OjNweCc+XCIgKyB4LnRleHQgKyBcIjwvc3Bhbj5cIilcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIseCA9PiB4LmNsYXNzKVxuICAgICAgICAgIC5vbihcImNsaWNrXCIseCA9PiB0aGlzLm9uKHguY2xhc3MgKyBcIi5jbGlja1wiKSh4KSlcblxuXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuZXhwb3J0IGRlZmF1bHQgaGVhZGVyO1xuIiwiaW1wb3J0IGQzIGZyb20gJ2QzJztcblxuZnVuY3Rpb24gYWNjZXNzb3IoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWw7XG4gIHJldHVybiB0aGlzXG59XG5cbmZ1bmN0aW9uIGQzX3VwZGF0ZWFibGUodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCI7XG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gICk7XG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKTtcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5mdW5jdGlvbiBkM19zcGxhdCh0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIjtcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKTtcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpO1xuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmZ1bmN0aW9uIFRhYmxlKHRhcmdldCkge1xuICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuLnRhYmxlLXdyYXBwZXIgdHIgeyBoZWlnaHQ6MzNweH1cbi50YWJsZS13cmFwcGVyIHRyIHRoIHsgYm9yZGVyLXJpZ2h0OjFweCBkb3R0ZWQgI2NjYyB9IFxuLnRhYmxlLXdyYXBwZXIgdHIgdGg6bGFzdC1vZi10eXBlIHsgYm9yZGVyLXJpZ2h0Om5vbmUgfSBcblxuLnRhYmxlLXdyYXBwZXIgdHIgeyBib3JkZXItYm90dG9tOjFweCBzb2xpZCAjZGRkIH1cbi50YWJsZS13cmFwcGVyIHRyIHRoLCAudGFibGUtd3JhcHBlciB0ciB0ZCB7IFxuICBwYWRkaW5nLWxlZnQ6MTBweDtcbiAgbWF4LXdpZHRoOjIwMHB4XG59XG5cbi50YWJsZS13cmFwcGVyIHRoZWFkIHRyIHsgXG4gIGJhY2tncm91bmQtY29sb3I6I2UzZWJmMDtcbn1cbi50YWJsZS13cmFwcGVyIHRoZWFkIHRyIHRoIC50aXRsZSB7IFxuICB0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2Vcbn1cbi50YWJsZS13cmFwcGVyIHRib2R5IHRyIHsgXG59XG4udGFibGUtd3JhcHBlciB0Ym9keSB0cjpob3ZlciB7IFxuICBiYWNrZ3JvdW5kLWNvbG9yOndoaXRlO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiNmOWY5ZmJcbn1cbiAgKi99KTtcblxuICB0cnkge1xuICAgIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI3RhYmxlLWNzc1wiLFwic3R5bGVcIilcbiAgICAgIC5hdHRyKFwiaWRcIixcInRhYmxlLWNzc1wiKVxuICAgICAgLnRleHQoQ1NTX1NUUklORy5yZXBsYWNlKFwiZnVuY3Rpb24gKCkgey8qXCIsXCJcIikucmVwbGFjZShcIiovfVwiLFwiXCIpKTtcbiAgfSBjYXRjaChlKSB7XG4gIH1cblxuICB0aGlzLl90YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMuX2RhdGEgPSB7fTsvL0VYQU1QTEVfREFUQVxuICB0aGlzLl9zb3J0ID0ge307XG4gIHRoaXMuX3JlbmRlcmVycyA9IHt9O1xuICB0aGlzLl90b3AgPSAwO1xuXG4gIHRoaXMuX2RlZmF1bHRfcmVuZGVyZXIgPSBmdW5jdGlvbiAoeCkge1xuICAgIGlmICh4LmtleS5pbmRleE9mKFwicGVyY2VudFwiKSA+IC0xKSByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLnRleHQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgdmFyIHBkID0gdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fO1xuICAgICAgICByZXR1cm4gZDMuZm9ybWF0KFwiLjIlXCIpKHBkW3gua2V5XS8xMDApXG4gICAgICB9KVxuICAgXG4gICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzKS50ZXh0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICB2YXIgcGQgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX187XG4gICAgICByZXR1cm4gcGRbeC5rZXldID4gMCA/IGQzLmZvcm1hdChcIiwuMmZcIikocGRbeC5rZXldKS5yZXBsYWNlKFwiLjAwXCIsXCJcIikgOiBwZFt4LmtleV1cbiAgICB9KVxuICB9O1xuXG4gIHRoaXMuX2hpZGRlbl9maWVsZHMgPSBbXTtcbiAgdGhpcy5fb24gPSB7fTtcbiAgdGhpcy5fcmVuZGVyX2hlYWRlciA9IGZ1bmN0aW9uKHdyYXApIHtcblxuXG4gICAgd3JhcC5lYWNoKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHZhciBoZWFkZXJzID0gZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QodGhpcyksXCIuaGVhZGVyc1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGVhZGVyc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLWJvdHRvbVwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKTtcblxuICAgICAgaGVhZGVycy5odG1sKFwiXCIpO1xuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaGVhZGVycyxcIi51cmxcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInVybFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3NSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KFwiQXJ0aWNsZVwiKTtcblxuICAgICAgZDNfdXBkYXRlYWJsZShoZWFkZXJzLFwiLmNvdW50XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb3VudFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KFwiQ291bnRcIik7XG5cblxuICAgIH0pO1xuXG4gIH07XG4gIHRoaXMuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihyb3cpIHtcblxuICAgICAgZDNfdXBkYXRlYWJsZShyb3csXCIudXJsXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ1cmxcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNzUlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwiaGlkZGVuXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7cmV0dXJuIHgua2V5fSk7XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUocm93LFwiLmNvdW50XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb3VudFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCl7cmV0dXJuIHgudmFsdWV9KTtcblxuICB9O1xufVxuXG5mdW5jdGlvbiB0YWJsZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBUYWJsZSh0YXJnZXQpXG59XG5cblRhYmxlLnByb3RvdHlwZSA9IHtcblxuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkgeyBcbiAgICAgIHZhciB2YWx1ZSA9IGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKTsgXG4gICAgICBpZiAodmFsICYmIHZhbC52YWx1ZXMubGVuZ3RoICYmIHRoaXMuX2hlYWRlcnMgPT0gdW5kZWZpbmVkKSB7IFxuICAgICAgICB2YXIgaGVhZGVycyA9IE9iamVjdC5rZXlzKHZhbC52YWx1ZXNbMF0pLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB7a2V5OngsdmFsdWU6eH0gfSk7XG4gICAgICAgIHRoaXMuaGVhZGVycyhoZWFkZXJzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH1cbiAgLCBza2lwX29wdGlvbjogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2tpcF9vcHRpb25cIix2YWwpIH1cblxuICAsIHRpdGxlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfVxuICAsIHJvdzogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmVuZGVyX3Jvd1wiLHZhbCkgfVxuICAsIGRlZmF1bHRfcmVuZGVyZXI6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRlZmF1bHRfcmVuZGVyZXJcIix2YWwpIH1cbiAgLCB0b3A6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRvcFwiLHZhbCkgfVxuXG4gICwgaGVhZGVyOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyZW5kZXJfaGVhZGVyXCIsdmFsKSB9XG4gICwgaGVhZGVyczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVhZGVyc1wiLHZhbCkgfVxuICAsIGhpZGRlbl9maWVsZHM6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhpZGRlbl9maWVsZHNcIix2YWwpIH1cbiAgLCBhbGxfaGVhZGVyczogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaGVhZGVycyA9IHRoaXMuaGVhZGVycygpLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjLnZhbHVlOyByZXR1cm4gcH0se30pXG4gICAgICAgICwgaXNfbG9ja2VkID0gdGhpcy5oZWFkZXJzKCkuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuICEheC5sb2NrZWQgfSkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pO1xuXG4gICAgICBpZiAodGhpcy5fZGF0YS52YWx1ZXMgJiYgdGhpcy5fZGF0YS52YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgIFxuICAgICAgICB2YXIgYWxsX2hlYWRzID0gT2JqZWN0LmtleXModGhpcy5fZGF0YS52YWx1ZXNbMF0pLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgICAgIGlmICh0aGlzLl9oaWRkZW5fZmllbGRzICYmIHRoaXMuX2hpZGRlbl9maWVsZHMuaW5kZXhPZih4KSA+IC0xKSByZXR1cm4gZmFsc2VcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBrZXk6eFxuICAgICAgICAgICAgLCB2YWx1ZTpoZWFkZXJzW3hdIHx8IHhcbiAgICAgICAgICAgICwgc2VsZWN0ZWQ6ICEhaGVhZGVyc1t4XVxuICAgICAgICAgICAgLCBsb2NrZWQ6IChpc19sb2NrZWQuaW5kZXhPZih4KSA+IC0xID8gdHJ1ZSA6IHVuZGVmaW5lZCkgXG4gICAgICAgICAgfSBcbiAgICAgICAgfS5iaW5kKHRoaXMpKS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9KTtcbiAgICAgICAgdmFyIGdldEluZGV4ID0gZnVuY3Rpb24oaykge1xuICAgICAgICAgIHJldHVybiBpc19sb2NrZWQuaW5kZXhPZihrKSA+IC0xID8gaXNfbG9ja2VkLmluZGV4T2YoaykgKyAxMCA6IDBcbiAgICAgICAgfTtcblxuICAgICAgICBhbGxfaGVhZHMgPSBhbGxfaGVhZHMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGdldEluZGV4KGMua2V5IHx8IC1JbmZpbml0eSkgLSBnZXRJbmRleChwLmtleSB8fCAtSW5maW5pdHkpIH0pO1xuICAgICAgICByZXR1cm4gYWxsX2hlYWRzXG4gICAgICB9XG4gICAgICBlbHNlIHJldHVybiB0aGlzLmhlYWRlcnMoKVxuICAgIH1cbiAgLCBzb3J0OiBmdW5jdGlvbihrZXksYXNjZW5kaW5nKSB7XG4gICAgICBpZiAoIWtleSkgcmV0dXJuIHRoaXMuX3NvcnRcbiAgICAgIHRoaXMuX3NvcnQgPSB7XG4gICAgICAgICAga2V5OiBrZXlcbiAgICAgICAgLCB2YWx1ZTogISFhc2NlbmRpbmdcbiAgICAgIH07XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAsIHJlbmRlcl93cmFwcGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gdGhpcy5fdGFyZ2V0O1xuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi50YWJsZS13cmFwcGVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS13cmFwcGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcInJlbGF0aXZlXCIpO1xuXG5cbiAgICAgIHZhciB0YWJsZSA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcInRhYmxlLm1haW5cIixcInRhYmxlXCIpXG4gICAgICAgIC5jbGFzc2VkKFwibWFpblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpO1xuXG4gICAgICB0aGlzLl90YWJsZV9tYWluID0gdGFibGU7XG5cbiAgICAgIHZhciB0aGVhZCA9IGQzX3VwZGF0ZWFibGUodGFibGUsXCJ0aGVhZFwiLFwidGhlYWRcIik7XG4gICAgICBkM191cGRhdGVhYmxlKHRhYmxlLFwidGJvZHlcIixcInRib2R5XCIpO1xuXG5cblxuICAgICAgaWYgKCF0aGlzLl9za2lwX29wdGlvbikge1xuICAgICAgdmFyIHRhYmxlX2ZpeGVkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwidGFibGUuZml4ZWRcIixcInRhYmxlXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIHRydWUpIC8vIFRPRE86IG1ha2UgdGhpcyB2aXNpYmxlIHdoZW4gbWFpbiBpcyBub3QgaW4gdmlld1xuICAgICAgICAuY2xhc3NlZChcImZpeGVkXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIix3cmFwcGVyLnN0eWxlKFwid2lkdGhcIikpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLHRoaXMuX3RvcCArIFwicHhcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpO1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB0cnkge1xuICAgICAgZDMuc2VsZWN0KHdpbmRvdykub24oJ3Njcm9sbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyh0YWJsZS5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wLCBzZWxmLl90b3ApO1xuICAgICAgICBpZiAodGFibGUubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCA8IHNlbGYuX3RvcCkgdGFibGVfZml4ZWQuY2xhc3NlZChcImhpZGRlblwiLGZhbHNlKTtcbiAgICAgICAgZWxzZSB0YWJsZV9maXhlZC5jbGFzc2VkKFwiaGlkZGVuXCIsdHJ1ZSk7XG5cbiAgICAgICAgdmFyIHdpZHRocyA9IFtdO1xuXG4gICAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLm1haW5cIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwiLnRhYmxlLWhlYWRlcnNcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwidGhcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgIHdpZHRocy5wdXNoKHRoaXMub2Zmc2V0V2lkdGgpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLmZpeGVkXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcIi50YWJsZS1oZWFkZXJzXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcInRoXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoXCJ3aWR0aFwiLHdpZHRoc1tpXSArIFwicHhcIik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgfSk7XG4gICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgXG5cbiAgICAgIHRoaXMuX3RhYmxlX2ZpeGVkID0gdGFibGVfZml4ZWQ7XG5cblxuICAgICAgdmFyIHRoZWFkID0gZDNfdXBkYXRlYWJsZSh0YWJsZV9maXhlZCxcInRoZWFkXCIsXCJ0aGVhZFwiKTtcblxuICAgICAgdmFyIHRhYmxlX2J1dHRvbiA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcIi50YWJsZS1vcHRpb25cIixcImFcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS1vcHRpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsXCItMXB4XCIpXG4gICAgICAgIC5zdHlsZShcInJpZ2h0XCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctcmlnaHRcIixcIjhweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjhweFwiKVxuICAgICAgICAudGV4dChcIk9QVElPTlNcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIsIXRoaXMuX29wdGlvbnNfaGVhZGVyLmNsYXNzZWQoXCJoaWRkZW5cIikpO1xuICAgICAgICAgIHRoaXMuX3Nob3dfb3B0aW9ucyA9ICF0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIpO1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gd3JhcHBlclxuICAgIH0gIFxuICAsIHJlbmRlcl9oZWFkZXI6IGZ1bmN0aW9uKHRhYmxlKSB7XG5cbiAgICAgIHZhciB0aGVhZCA9IHRhYmxlLnNlbGVjdEFsbChcInRoZWFkXCIpXG4gICAgICAgICwgdGJvZHkgPSB0YWJsZS5zZWxlY3RBbGwoXCJ0Ym9keVwiKTtcblxuICAgICAgaWYgKHRoaXMuaGVhZGVycygpID09IHVuZGVmaW5lZCkgcmV0dXJuXG5cbiAgICAgIHZhciBvcHRpb25zX3RoZWFkID0gZDNfdXBkYXRlYWJsZSh0aGVhZCxcInRyLnRhYmxlLW9wdGlvbnNcIixcInRyXCIsdGhpcy5hbGxfaGVhZGVycygpLGZ1bmN0aW9uKHgpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsICF0aGlzLl9zaG93X29wdGlvbnMpXG4gICAgICAgIC5jbGFzc2VkKFwidGFibGUtb3B0aW9uc1wiLHRydWUpO1xuXG4gICAgICB2YXIgaCA9IHRoaXMuX3NraXBfb3B0aW9uID8gdGhpcy5oZWFkZXJzKCkgOiB0aGlzLmhlYWRlcnMoKS5jb25jYXQoW3trZXk6XCJzcGFjZXJcIiwgd2lkdGg6XCI3MHB4XCJ9XSk7XG4gICAgICB2YXIgaGVhZGVyc190aGVhZCA9IGQzX3VwZGF0ZWFibGUodGhlYWQsXCJ0ci50YWJsZS1oZWFkZXJzXCIsXCJ0clwiLGgsZnVuY3Rpb24oeCl7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS1oZWFkZXJzXCIsdHJ1ZSk7XG5cblxuICAgICAgdmFyIHRoID0gZDNfc3BsYXQoaGVhZGVyc190aGVhZCxcInRoXCIsXCJ0aFwiLGZhbHNlLGZ1bmN0aW9uKHgsaSkge3JldHVybiB4LmtleSArIGkgfSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LndpZHRoIH0pXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJyZWxhdGl2ZVwiKVxuICAgICAgICAub3JkZXIoKTtcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHRoLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgfSlcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKHguc29ydCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB4Wydzb3J0J107XG4gICAgICAgICAgICB0aGlzLl9zb3J0ID0ge307XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeC5zb3J0ID0gISF4LnNvcnQ7XG5cbiAgICAgICAgICAgIHRoaXMuc29ydCh4LmtleSx4LnNvcnQpO1xuICAgICAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgICBkM191cGRhdGVhYmxlKHRoLFwiaVwiLFwiaVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuY2xhc3NlZChcImZhXCIsdHJ1ZSlcbiAgICAgICAgLmNsYXNzZWQoXCJmYS1zb3J0LWFzY1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiAoeC5rZXkgPT0gdGhpcy5fc29ydC5rZXkpID8gdGhpcy5fc29ydC52YWx1ZSA9PT0gdHJ1ZSA6IHVuZGVmaW5lZCB9LmJpbmQodGhpcykpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEtc29ydC1kZXNjXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuICh4LmtleSA9PSB0aGlzLl9zb3J0LmtleSkgPyB0aGlzLl9zb3J0LnZhbHVlID09PSBmYWxzZSA6IHVuZGVmaW5lZCB9LmJpbmQodGhpcykpO1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2FuX3JlZHJhdyA9IHRydWU7XG5cbiAgICAgIHZhciBkcmFnID0gZDMuYmVoYXZpb3IuZHJhZygpXG4gICAgICAgIC5vbihcImRyYWdcIiwgZnVuY3Rpb24oZCxpKSB7XG4gICAgICAgICAgICB2YXIgeCA9IGQzLmV2ZW50LmR4O1xuICAgICAgICAgICAgdmFyIHcgPSBwYXJzZUludChkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zdHlsZShcIndpZHRoXCIpLnJlcGxhY2UoXCJweFwiKSk7XG4gICAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuX19kYXRhX18ud2lkdGggPSAodyt4KStcInB4XCI7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zdHlsZShcIndpZHRoXCIsICh3K3gpK1wicHhcIik7XG5cbiAgICAgICAgICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLDApLmluZGV4T2YodGhpcy5wYXJlbnROb2RlKSArIDE7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW5baW5kZXhdKS5zdHlsZShcIndpZHRoXCIsdW5kZWZpbmVkKTtcblxuICAgICAgICAgICAgaWYgKGNhbl9yZWRyYXcpIHtcbiAgICAgICAgICAgICAgY2FuX3JlZHJhdyA9IGZhbHNlO1xuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNhbl9yZWRyYXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgICB2YXIgcmVuZGVyID0gc2VsZi5fcmVuZGVyZXJzW3gua2V5XTtcbiAgICAgICAgICAgICAgICAgIGlmIChyZW5kZXIpIHJlbmRlci5iaW5kKHRoaXMpKHgpO1xuICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgIH0sMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG5cbiAgICAgIHZhciBkcmFnZ2FibGUgPSBkM191cGRhdGVhYmxlKHRoLFwiYlwiLFwiYlwiKVxuICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIiwgXCJldy1yZXNpemVcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsIFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIiwgXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsIFwiYWJzb2x1dGVcIilcbiAgICAgICAgLnN0eWxlKFwicmlnaHRcIiwgXCItOHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLCBcIjBcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIiwgXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIiwgMSlcbiAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgdmFyIGluZGV4ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW4sMCkuaW5kZXhPZih0aGlzLnBhcmVudE5vZGUpICsgMTtcbiAgICAgICAgICAgdGJvZHkuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bnRoLW9mLXR5cGUoXCIgKyBpbmRleCArIFwiKVwiKS5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IGRvdHRlZCAjY2NjXCIpO1xuICAgICAgICB9KVxuICAgICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLDApLmluZGV4T2YodGhpcy5wYXJlbnROb2RlKSArIDE7XG4gICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuc3R5bGUoXCJib3JkZXItcmlnaHRcIix1bmRlZmluZWQpO1xuICAgICAgICB9KVxuICAgICAgICAuY2FsbChkcmFnKTtcblxuICAgICAgdGguZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICBpZiAoIXRoaXMuX3NraXBfb3B0aW9uKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IGQzX3VwZGF0ZWFibGUob3B0aW9uc190aGVhZCxcInRoXCIsXCJ0aFwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5hdHRyKFwiY29sc3BhblwiLHRoaXMuaGVhZGVycygpLmxlbmd0aCsxKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgIHZhciBvcHRpb24gPSBkM19zcGxhdChvcHRpb25zLFwiLm9wdGlvblwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJvcHRpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpO1xuXG5cbiAgICAgIG9wdGlvbi5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgZDNfdXBkYXRlYWJsZShvcHRpb24sXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgICAucHJvcGVydHkoXCJjaGVja2VkXCIsZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgICB0aGlzLmNoZWNrZWQgPSB4LnNlbGVjdGVkO1xuICAgICAgICAgIHJldHVybiB4LnNlbGVjdGVkID8gXCJjaGVja2VkXCIgOiB1bmRlZmluZWQgXG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKFwiZGlzYWJsZWRcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LmxvY2tlZCB9KVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgeC5zZWxlY3RlZCA9IHRoaXMuY2hlY2tlZDtcbiAgICAgICAgICBpZiAoeC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgc2VsZi5oZWFkZXJzKCkucHVzaCh4KTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmRyYXcoKVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgaW5kaWNlcyA9IHNlbGYuaGVhZGVycygpLm1hcChmdW5jdGlvbih6LGkpIHsgcmV0dXJuIHoua2V5ID09IHgua2V5ID8gaSA6IHVuZGVmaW5lZCAgfSkgXG4gICAgICAgICAgICAsIGluZGV4ID0gaW5kaWNlcy5maWx0ZXIoZnVuY3Rpb24oeikgeyByZXR1cm4geiB9KSB8fCAwO1xuXG4gICAgICAgICAgc2VsZi5oZWFkZXJzKCkuc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICAgIHNlbGYuZHJhdygpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICBkM191cGRhdGVhYmxlKG9wdGlvbixcInNwYW5cIixcInNwYW5cIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4gXCIgXCIgKyB4LnZhbHVlIH0pO1xuXG4gICAgIH1cblxuXG4gICAgIHRoaXMuX29wdGlvbnNfaGVhZGVyID0gdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcIi50YWJsZS1vcHRpb25zXCIpO1xuICAgIH1cbiAgXG4gICwgcmVuZGVyX3Jvd3M6IGZ1bmN0aW9uKHRhYmxlKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciB0Ym9keSA9IHRhYmxlLnNlbGVjdEFsbChcInRib2R5XCIpO1xuXG4gICAgICBpZiAodGhpcy5oZWFkZXJzKCkgPT0gdW5kZWZpbmVkKSByZXR1cm5cbiAgICAgIGlmICghKHRoaXMuX2RhdGEgJiYgdGhpcy5fZGF0YS52YWx1ZXMgJiYgdGhpcy5fZGF0YS52YWx1ZXMubGVuZ3RoKSkgcmV0dXJuXG5cbiAgICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YS52YWx1ZXNcbiAgICAgICAgLCBzb3J0YnkgPSB0aGlzLl9zb3J0IHx8IHt9O1xuXG4gICAgICBjb25zb2xlLmVycm9yKGRhdGEpO1xuXG4gICAgICBkYXRhID0gZGF0YS5zb3J0KGZ1bmN0aW9uKHAsYykge1xuICAgICAgICB2YXIgYSA9IHBbc29ydGJ5LmtleV0gfHwgLUluZmluaXR5XG4gICAgICAgICAgLCBiID0gY1tzb3J0Ynkua2V5XSB8fCAtSW5maW5pdHk7XG5cbiAgICAgICAgcmV0dXJuIHNvcnRieS52YWx1ZSA/IGQzLmFzY2VuZGluZyhhLGIpIDogZDMuZGVzY2VuZGluZyhhLGIpXG4gICAgICB9KTtcblxuICAgICAgdmFyIHJvd3MgPSBkM19zcGxhdCh0Ym9keSxcInRyXCIsXCJ0clwiLGRhdGEsZnVuY3Rpb24oeCxpKXsgcmV0dXJuIFN0cmluZyhzb3J0Ynkua2V5ICsgeFtzb3J0Ynkua2V5XSkgKyBpIH0pXG4gICAgICAgIC5vcmRlcigpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHNlbGYub24oXCJleHBhbmRcIikuYmluZCh0aGlzKSh4KTtcbiAgICAgICAgfSk7XG5cbiAgICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICB2YXIgdGQgPSBkM19zcGxhdChyb3dzLFwidGRcIixcInRkXCIsdGhpcy5oZWFkZXJzKCksZnVuY3Rpb24oeCxpKSB7cmV0dXJuIHgua2V5ICsgaSB9KVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpO1xuXG4gICAgICAgICAgdmFyIHJlbmRlcmVyID0gc2VsZi5fcmVuZGVyZXJzW3gua2V5XTtcblxuICAgICAgICAgIGlmICghcmVuZGVyZXIpIHsgXG4gICAgICAgICAgICByZW5kZXJlciA9IHNlbGYuX2RlZmF1bHRfcmVuZGVyZXIuYmluZCh0aGlzKSh4KTsgXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiByZW5kZXJlci5iaW5kKHRoaXMpKHgpXG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgXG5cbiAgICAgIHRkLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgICAgdmFyIG8gPSBkM191cGRhdGVhYmxlKHJvd3MsXCJ0ZC5vcHRpb24taGVhZGVyXCIsXCJ0ZFwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwib3B0aW9uLWhlYWRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKTtcbiBcbiAgICAgIGlmICh0aGlzLl9za2lwX29wdGlvbikgby5jbGFzc2VkKFwiaGlkZGVuXCIsdHJ1ZSk7IFxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUobyxcImFcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLmh0bWwoc2VsZi5vcHRpb25fdGV4dCgpKTtcbiAgICAgICAgXG5cblxuXG4gICAgfVxuICAsIG9wdGlvbl90ZXh0OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25fdGV4dFwiLHZhbCkgfVxuICAsIHJlbmRlcjogZnVuY3Rpb24oayxmbikge1xuICAgICAgaWYgKGZuID09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX3JlbmRlcmVyc1trXSB8fCBmYWxzZVxuICAgICAgdGhpcy5fcmVuZGVyZXJzW2tdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciB3cmFwcGVyID0gdGhpcy5yZW5kZXJfd3JhcHBlcigpO1xuXG4gICAgICB3cmFwcGVyLnNlbGVjdEFsbChcInRhYmxlXCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgc2VsZi5yZW5kZXJfaGVhZGVyKGQzLnNlbGVjdCh0aGlzKSk7IFxuICAgICAgICB9KTtcblxuICAgICAgdGhpcy5yZW5kZXJfcm93cyh0aGlzLl90YWJsZV9tYWluKTtcblxuICAgICAgcmV0dXJuIHRoaXNcblxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkMzogZDNcbn07XG5cbmV4cG9ydCB7IHRhYmxlLCB0YWJsZSBhcyB0IH07ZXhwb3J0IGRlZmF1bHQgdGFibGU7XG4iLCIvL2ltcG9ydCBkMyBmcm9tICdkMydcblxuZnVuY3Rpb24gZDNfdXBkYXRlYWJsZSh0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIjtcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGZ1bmN0aW9uKHgpe3JldHVybiBkYXRhID8gW2RhdGFdIDogW3hdfSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIFt4XX1cbiAgKTtcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpO1xuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmZ1bmN0aW9uIGQzX3NwbGF0KHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiO1xuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZGF0YSB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fVxuICApO1xuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSk7XG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuXG52YXIgdHlwZXdhdGNoID0gKGZ1bmN0aW9uKCl7XG4gIHZhciB0aW1lciA9IDA7XG4gIHJldHVybiBmdW5jdGlvbihjYWxsYmFjaywgbXMpe1xuICAgIGNsZWFyVGltZW91dCAodGltZXIpO1xuICAgIHRpbWVyID0gc2V0VGltZW91dChjYWxsYmFjaywgbXMpO1xuICB9O1xufSkoKTtcblxuXG5cbmZ1bmN0aW9uIEZpbHRlcih0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLl9kYXRhID0gZmFsc2U7XG4gIHRoaXMuX29uID0ge307XG4gIHRoaXMuX3JlbmRlcl9vcCA9IHt9O1xufVxuXG5mdW5jdGlvbiBmaWx0ZXIkMih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBGaWx0ZXIodGFyZ2V0KVxufVxuXG5GaWx0ZXIucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLmZpbHRlcnMtd3JhcHBlclwiLFwiZGl2XCIsdGhpcy5kYXRhKCksZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXJzLXdyYXBwZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIiwgXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctcmlnaHRcIiwgXCIyMHB4XCIpO1xuXG4gICAgICB2YXIgZmlsdGVycyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5maWx0ZXJzXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXJzXCIsdHJ1ZSk7XG4gICAgICBcbiAgICAgIHZhciBmaWx0ZXIgPSBkM19zcGxhdChmaWx0ZXJzLFwiLmZpbHRlclwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSArIHguZmllbGQgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKTtcblxuICAgICAgZmlsdGVyLmV4aXQoKS5yZW1vdmUoKTtcbiAgICAgIFxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgZmlsdGVyLmVhY2goZnVuY3Rpb24odixwb3MpIHtcbiAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgICBzZWxmLmZpbHRlclJvdyhkdGhpcywgc2VsZi5fZmllbGRzLCBzZWxmLl9vcHMsIHYpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHRoaXMuZmlsdGVyRm9vdGVyKHdyYXApO1xuXG4gICAgICByZXR1cm4gdGhpc1xuICAgICAgXG4gICAgfVxuICAsIG9wczogZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29wc1xuICAgICAgdGhpcy5fb3BzID0gZDtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGZpZWxkczogZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2ZpZWxkc1xuICAgICAgdGhpcy5fZmllbGRzID0gZDtcbiAgICAgIHJldHVybiB0aGlzXG4gIFx0fVxuICAsIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9kYXRhXG4gICAgICB0aGlzLl9kYXRhID0gZDtcbiAgICAgIHJldHVybiB0aGlzXG4gIFx0fVxuICAsIHRleHQ6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2ZuIHx8IGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgfVxuICAgICAgdGhpcy5fZm4gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHJlbmRlcl9vcDogZnVuY3Rpb24ob3AsZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fcmVuZGVyX29wW29wXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgdGhpcy5fcmVuZGVyX29wW29wXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGJ1aWxkT3A6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgdmFyIG9wID0gb2JqLm9wXG4gICAgICAgICwgZmllbGQgPSBvYmouZmllbGRcbiAgICAgICAgLCB2YWx1ZSA9IG9iai52YWx1ZTtcbiAgICBcbiAgICAgIGlmICggW29wLGZpZWxkLHZhbHVlXS5pbmRleE9mKHVuZGVmaW5lZCkgPiAtMSkgcmV0dXJuIGZ1bmN0aW9uKCkge3JldHVybiB0cnVlfVxuICAgIFxuICAgICAgcmV0dXJuIHRoaXMuX29wc1tvcF0oZmllbGQsIHZhbHVlKVxuICAgIH1cbiAgLCBmaWx0ZXJSb3c6IGZ1bmN0aW9uKF9maWx0ZXIsIGZpZWxkcywgb3BzLCB2YWx1ZSkge1xuICAgIFxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgcmVtb3ZlID0gZDNfdXBkYXRlYWJsZShfZmlsdGVyLFwiLnJlbW92ZVwiLFwiYVwiKVxuICAgICAgICAuY2xhc3NlZChcInJlbW92ZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJyaWdodFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuaHRtbChcIiYjMTAwMDU7XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBuZXdfZGF0YSA9IHNlbGYuZGF0YSgpLmZpbHRlcihmdW5jdGlvbihmKSB7IHJldHVybiBmICE9PSB4IH0pO1xuICAgICAgICAgIHNlbGYuZGF0YShuZXdfZGF0YSk7XG4gICAgICAgICAgc2VsZi5kcmF3KCk7XG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgIHZhciBmaWx0ZXIgPSBkM191cGRhdGVhYmxlKF9maWx0ZXIsXCIuaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSk7XG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcInNlbGVjdC5maWVsZFwiLFwic2VsZWN0XCIsZmllbGRzKVxuICAgICAgICAuY2xhc3NlZChcImZpZWxkXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE2NXB4XCIpXG4gICAgICAgIC5vbihcImNoYW5nZVwiLCBmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICB2YWx1ZS5maWVsZCA9IHRoaXMuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhciBwb3MgPSAwO1xuICAgICAgICAgIGZpZWxkcy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICBpZiAoeCA9PSB2YWx1ZS5maWVsZCkgcG9zID0gaTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBzZWxlY3RlZCA9IG9wc1twb3NdLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSA9PSB2YWx1ZS5vcCB9KTtcbiAgICAgICAgICBpZiAoc2VsZWN0ZWQubGVuZ3RoID09IDApIHZhbHVlLm9wID0gb3BzW3Bvc11bMF0ua2V5O1xuICAgICAgICAgIC8vdmFsdWUuZm4gPSBzZWxmLmJ1aWxkT3AodmFsdWUpXG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSk7XG5cbiAgICAgICAgICBcbiAgICAgICAgICBcbiAgICAgICAgICBzZWxmLmRyYXdPcHMoZmlsdGVyLCBvcHNbcG9zXSwgdmFsdWUsIHBvcyk7XG4gICAgICAgIH0pO1xuICAgICAgXG4gICAgICBkM191cGRhdGVhYmxlKHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIpXG4gICAgICAgIC5wcm9wZXJ0eShcImRpc2FibGVkXCIgLHRydWUpXG4gICAgICAgIC5wcm9wZXJ0eShcImhpZGRlblwiLCB0cnVlKVxuICAgICAgICAudGV4dChcIkZpbHRlci4uLlwiKTtcblxuICAgICAgXG4gICAgICBkM19zcGxhdChzZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4IH0pXG4gICAgICAgIC5hdHRyKFwic2VsZWN0ZWRcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geCA9PSB2YWx1ZS5maWVsZCA/IFwic2VsZWN0ZWRcIiA6IHVuZGVmaW5lZCB9KTtcblxuICAgICAgaWYgKHZhbHVlLm9wICYmIHZhbHVlLmZpZWxkICYmIHZhbHVlLnZhbHVlKSB7XG4gICAgICAgIHZhciBwb3MgPSBmaWVsZHMuaW5kZXhPZih2YWx1ZS5maWVsZCk7XG4gICAgICAgIHNlbGYuZHJhd09wcyhmaWx0ZXIsIG9wc1twb3NdLCB2YWx1ZSwgcG9zKTtcbiAgICAgIH1cblxuXG4gICAgfVxuICAsIGRyYXdPcHM6IGZ1bmN0aW9uKGZpbHRlciwgb3BzLCB2YWx1ZSkge1xuXG4gICAgICBcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJzZWxlY3Qub3BcIixcInNlbGVjdFwiLGZhbHNlLCBmdW5jdGlvbih4KSB7cmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcIm9wXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgdmFsdWUub3AgPSB0aGlzLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXk7XG4gICAgICAgICAgLy92YWx1ZS5mbiA9IHNlbGYuYnVpbGRPcCh2YWx1ZSlcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcbiAgICAgICAgICBzZWxmLmRyYXdJbnB1dChmaWx0ZXIsIHZhbHVlLCB2YWx1ZS5vcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAvL3ZhciBkZmx0ID0gW3tcImtleVwiOlwiU2VsZWN0IE9wZXJhdGlvbi4uLlwiLFwiZGlzYWJsZWRcIjp0cnVlLFwiaGlkZGVuXCI6dHJ1ZX1dXG5cbiAgICAgIHZhciBuZXdfb3BzID0gb3BzOyAvL2RmbHQuY29uY2F0KG9wcylcblxuICAgICAgdmFsdWUub3AgPSB2YWx1ZS5vcCB8fCBuZXdfb3BzWzBdLmtleTtcblxuICAgICAgdmFyIG9wcyA9IGQzX3NwbGF0KHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIsbmV3X29wcyxmdW5jdGlvbih4KXtyZXR1cm4geC5rZXl9KVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleS5zcGxpdChcIi5cIilbMF0gfSkgXG4gICAgICAgIC5hdHRyKFwic2VsZWN0ZWRcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgPT0gdmFsdWUub3AgPyBcInNlbGVjdGVkXCIgOiB1bmRlZmluZWQgfSk7XG5cbiAgICAgIG9wcy5leGl0KCkucmVtb3ZlKCk7XG4gICAgICBzZWxmLmRyYXdJbnB1dChmaWx0ZXIsIHZhbHVlLCB2YWx1ZS5vcCk7XG5cbiAgICB9XG4gICwgZHJhd0lucHV0OiBmdW5jdGlvbihmaWx0ZXIsIHZhbHVlLCBvcCkge1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIudmFsdWVcIikucmVtb3ZlKCk7XG4gICAgICB2YXIgciA9IHRoaXMuX3JlbmRlcl9vcFtvcF07XG5cbiAgICAgIGlmIChyKSB7XG4gICAgICAgIHJldHVybiByLmJpbmQodGhpcykoZmlsdGVyLHZhbHVlKVxuICAgICAgfVxuXG4gICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0LnZhbHVlXCIsXCJpbnB1dFwiKVxuICAgICAgICAuY2xhc3NlZChcInZhbHVlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMWVtXCIpXG5cbiAgICAgICAgLmF0dHIoXCJ2YWx1ZVwiLCB2YWx1ZS52YWx1ZSlcbiAgICAgICAgLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgdmFyIHQgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgICB0eXBld2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHQudmFsdWU7XG4gICAgICAgICAgICAvL3ZhbHVlLmZuID0gc2VsZi5idWlsZE9wKHZhbHVlKVxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSk7XG4gICAgICAgICAgfSwxMDAwKTtcbiAgICAgICAgfSk7XG4gICAgXG4gICAgfVxuICAsIGZpbHRlckZvb3RlcjogZnVuY3Rpb24od3JhcCkge1xuICAgICAgdmFyIGZvb3RlciA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5maWx0ZXItZm9vdGVyXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXItZm9vdGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIxMHB4XCIpO1xuXG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShmb290ZXIsXCIuYWRkXCIsXCJhXCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiYWRkXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLmh0bWwoXCImIzY1MjkxO1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlci1yYWRpdXNcIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxLjVweCBzb2xpZCAjNDI4QkNDXCIpXG4gICAgICAgIC5zdHlsZShcImN1cnNvclwiLFwicG9pbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgXG4gICAgICAgICAgdmFyIGQgPSBzZWxmLl9kYXRhO1xuICAgICAgICAgIGlmIChkLmxlbmd0aCA9PSAwIHx8IE9iamVjdC5rZXlzKGQuc2xpY2UoLTEpKS5sZW5ndGggPiAwKSBkLnB1c2goe30pO1xuICAgICAgICAgIHNlbGYuZHJhdygpO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgLCB0eXBld2F0Y2g6IHR5cGV3YXRjaFxufTtcblxuZnVuY3Rpb24gYWNjZXNzb3IkMShhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbDtcbiAgcmV0dXJuIHRoaXNcbn1cblxuZnVuY3Rpb24gRmlsdGVyRGF0YShkYXRhKSB7XG4gIHRoaXMuX2RhdGEgPSBkYXRhO1xuICB0aGlzLl9sID0gXCJvclwiO1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJfZGF0YShkYXRhKSB7XG4gIHJldHVybiBuZXcgRmlsdGVyRGF0YShkYXRhKVxufVxuXG5GaWx0ZXJEYXRhLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yJDEuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH1cbiAgLCBsb2dpYzogZnVuY3Rpb24obCkge1xuICAgICAgaWYgKGwgPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fbFxuICAgICAgdGhpcy5fbCA9IChsID09IFwiYW5kXCIpID8gXCJhbmRcIiA6IFwib3JcIjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9wOiBmdW5jdGlvbihvcCwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb3BzW29wXSB8fCB0aGlzLl9vcHNbXCJlcXVhbHNcIl07XG4gICAgICB0aGlzLl9vcHNbb3BdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuXG4gICAgfVxuICAsIGJ5OiBmdW5jdGlvbihiKSB7XG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgICAsIGZpbHRlciA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIGlmIChiLmxlbmd0aCA9PSAwKSByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbWFzayA9IGIubWFwKGZ1bmN0aW9uKHopIHtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHZhciBzcGxpdCA9IHouZmllbGQuc3BsaXQoXCIuXCIpLCBmaWVsZCA9IHNwbGl0LnNsaWNlKC0xKVswXVxuICAgICAgICAgICAgICAgICwgb2JqID0gc3BsaXQuc2xpY2UoMCwtMSkucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcFtjXSB9LHgpXG4gICAgICAgICAgICAgICAgLCBvc3BsaXQgPSB6Lm9wLnNwbGl0KFwiLlwiKSwgb3AgPSBvc3BsaXRbMF07XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICByZXR1cm4gc2VsZi5vcChvcCkoZmllbGQsei52YWx1ZSkob2JqKVxuICAgICAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geCB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNlbGYuX2wgPT0gXCJhbmRcIikgcmV0dXJuIG1hc2subGVuZ3RoID09IGIubGVuZ3RoXG4gICAgICAgICAgICByZXR1cm4gbWFzay5sZW5ndGggPiAwXG4gICAgICAgICAgfTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHRoaXMuX2RhdGEuZmlsdGVyKGZpbHRlcilcblxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgX29wczoge1xuICAgICAgICBcImVxdWFsc1wiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkgPT0gU3RyaW5nKHZhbHVlKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuLy8gICAgICAsIFwiY29udGFpbnNcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4vLyAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuLy8gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTFcbi8vICAgICAgICAgIH1cbi8vICAgICAgICB9XG4gICAgICAsIFwic3RhcnRzIHdpdGhcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPT0gMFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImVuZHMgd2l0aFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIChTdHJpbmcoeFtmaWVsZF0pLmxlbmd0aCAtIFN0cmluZyh2YWx1ZSkubGVuZ3RoKSA9PSBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJkb2VzIG5vdCBlcXVhbFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkgIT0gU3RyaW5nKHZhbHVlKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImlzIHNldFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4W2ZpZWxkXSAhPSB1bmRlZmluZWQpICYmICh4W2ZpZWxkXSAhPSBcIlwiKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImlzIG5vdCBzZXRcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4W2ZpZWxkXSA9PSB1bmRlZmluZWRcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJiZXR3ZWVuXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeFtmaWVsZF0pID49IHZhbHVlWzBdICYmIHBhcnNlSW50KHhbZmllbGRdKSA8PSB2YWx1ZVsxXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImlzIGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPiAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgICAgLCBcImlzIG5vdCBpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xIH0sIDApID09IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAsIFwiZG9lcyBub3QgY29udGFpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUudG9Mb3dlckNhc2UoKS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkudG9Mb3dlckNhc2UoKSkgPiAtMSB9LCAwKSA9PSAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgICAgLCBcImNvbnRhaW5zXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKS50b0xvd2VyQ2FzZSgpKSA+IC0xIH0sIDApID4gMFxuICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgdmVyc2lvbiA9IFwiMC4wLjFcIjtcblxuZXhwb3J0IHsgdmVyc2lvbiwgZmlsdGVyJDIgYXMgZmlsdGVyLCBmaWx0ZXJfZGF0YSB9O1xuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQge2ZpbHRlcn0gZnJvbSAnZmlsdGVyJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIEZpbHRlclZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG5cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5fZmlsdGVyX29wdGlvbnMgPSB7XG4gICAgICBcIkNhdGVnb3J5XCI6IFwicGFyZW50X2NhdGVnb3J5X25hbWVcIlxuICAgICwgXCJUaXRsZVwiOiBcInVybFwiXG4gICAgLCBcIlRpbWVcIjogXCJob3VyXCJcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmaWx0ZXJfdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBGaWx0ZXJWaWV3KHRhcmdldClcbn1cblxuRmlsdGVyVmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBsb2dpYzogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljXCIsdmFsKSBcbiAgICB9XG4gICwgY2F0ZWdvcmllczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNhdGVnb3JpZXNcIix2YWwpIFxuICAgIH1cbiAgLCBmaWx0ZXJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZmlsdGVyc1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuZmlsdGVyLXdyYXBcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCl7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXItd3JhcFwiLHRydWUpXG5cbiAgICAgIGhlYWRlcih3cmFwcGVyKVxuICAgICAgICAudGV4dChcIkZpbHRlclwiKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIHZhciBzdWJ0aXRsZSA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCIuc3VidGl0bGUtZmlsdGVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzdWJ0aXRsZS1maWx0ZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcIiB1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcIiBib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIgMzNweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIgI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgXG4gICAgICBkM191cGRhdGVhYmxlKHN1YnRpdGxlLFwic3Bhbi5maXJzdFwiLFwic3BhblwiKVxuICAgICAgICAudGV4dChcIlVzZXJzIG1hdGNoaW5nIFwiIClcbiAgICAgICAgLmNsYXNzZWQoXCJmaXJzdFwiLHRydWUpXG4gICAgXG4gICAgICB2YXIgZmlsdGVyX3R5cGUgID0gZDNfdXBkYXRlYWJsZShzdWJ0aXRsZSxcInNwYW4ubWlkZGxlXCIsXCJzcGFuXCIpXG4gICAgICAgIC5jbGFzc2VkKFwibWlkZGxlXCIsdHJ1ZSlcbiAgICBcbiAgICAgIHNlbGVjdChmaWx0ZXJfdHlwZSlcbiAgICAgICAgLm9wdGlvbnModGhpcy5sb2dpYygpKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHRoaXMubG9naWMoKS5tYXAoZnVuY3Rpb24oeSkgeyBcbiAgICAgICAgICAgIHkuc2VsZWN0ZWQgPSAoeS5rZXkgPT0geC5rZXkpXG4gICAgICAgICAgfSlcbiAgICAgICAgICB0aGlzLm9uKFwibG9naWMuY2hhbmdlXCIpKHRoaXMubG9naWMoKSlcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAuZHJhdygpXG4gICAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoc3VidGl0bGUsXCJzcGFuLmxhc3RcIixcInNwYW5cIilcbiAgICAgICAgLnRleHQoXCIgb2YgdGhlIGZvbGxvd2luZzpcIilcbiAgICAgICAgLmNsYXNzZWQoXCJsYXN0XCIsdHJ1ZSlcblxuXG4gICAgICAvLyAtLS0tLS0tLSBDQVRFR09SSUVTIC0tLS0tLS0tLSAvL1xuXG4gICAgICB2YXIgY2F0ZWdvcmllcyA9IHRoaXMuY2F0ZWdvcmllcygpXG4gICAgICB2YXIgZmlsdGVyX2NoYW5nZSA9IHRoaXMub24oXCJmaWx0ZXIuY2hhbmdlXCIpLmJpbmQodGhpcylcblxuICAgICAgZnVuY3Rpb24gc2VsZWN0aXplSW5wdXQoZmlsdGVyLHZhbHVlKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAgIC5wcm9wZXJ0eShcInZhbHVlXCIsdmFsdWUudmFsdWUpXG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciBkZXN0cm95ID0gZDMuc2VsZWN0KHRoaXMpLm9uKFwiZGVzdHJveVwiKVxuICAgICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICAgIH0pXG5cblxuICAgICAgICB2YXIgcyA9ICQoc2VsZWN0Lm5vZGUoKSkuc2VsZWN0aXplKHtcbiAgICAgICAgICBwZXJzaXN0OiBmYWxzZSxcbiAgICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSAodmFsdWUudmFsdWUgPyB2YWx1ZS52YWx1ZSArIFwiLFwiIDogXCJcIikgKyB4XG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uRGVsZXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdmFsdWUudmFsdWUuc3BsaXQoXCIsXCIpLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6ICE9IHhbMF19KS5qb2luKFwiLFwiKVxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHZhbHVlOiB4LCB0ZXh0OiB4XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAub24oXCJkZXN0cm95XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzWzBdLnNlbGVjdGl6ZS5kZXN0cm95KClcbiAgICAgICAgICB9KVxuXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHNlbGVjdGl6ZVNlbGVjdChmaWx0ZXIsdmFsdWUpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIikucmVtb3ZlKClcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIGRlc3Ryb3kgPSBkMy5zZWxlY3QodGhpcykub24oXCJkZXN0cm95XCIpXG4gICAgICAgICAgICBpZiAoZGVzdHJveSkgZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuXG5cbiAgICBcbiAgICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic2VsZWN0LnZhbHVlXCIsXCJzZWxlY3RcIilcbiAgICAgICAgICAuY2xhc3NlZChcInZhbHVlXCIsdHJ1ZSlcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1heC13aWR0aFwiLFwiNTAwcHhcIilcbiAgICAgICAgICAuYXR0cihcIm11bHRpcGxlXCIsdHJ1ZSlcbiAgICAgICAgICAub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHRoaXMudmFsdWVcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgfSlcbiAgICBcbiAgICAgICAgZDNfc3BsYXQoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIixjYXRlZ29yaWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHZhbHVlLnZhbHVlICYmIHZhbHVlLnZhbHVlLmluZGV4T2YoeC5rZXkpID4gLTEgPyBcInNlbGVjdGVkXCIgOiB1bmRlZmluZWQgfSlcbiAgICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICAgIHZhciBzID0gJChzZWxlY3Qubm9kZSgpKS5zZWxlY3RpemUoe1xuICAgICAgICAgIHBlcnNpc3Q6IGZhbHNlLFxuICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHguam9pbihcIixcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAub24oXCJkZXN0cm95XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzWzBdLnNlbGVjdGl6ZS5kZXN0cm95KClcbiAgICAgICAgICB9KVxuXG5cblxuICAgIFxuICAgICAgfVxuICAgIFxuICAgICAgdGhpcy5fbG9naWNfZmlsdGVyID0gZmlsdGVyKHdyYXBwZXIpXG4gICAgICAgIC5maWVsZHMoT2JqZWN0LmtleXModGhpcy5fZmlsdGVyX29wdGlvbnMpKVxuICAgICAgICAub3BzKFtcbiAgICAgICAgICAgIFt7XCJrZXlcIjogXCJpcyBpbi5jYXRlZ29yeVwifSx7XCJrZXlcIjogXCJpcyBub3QgaW4uY2F0ZWdvcnlcIn1dXG4gICAgICAgICAgLCBbe1wia2V5XCI6IFwiY29udGFpbnMuc2VsZWN0aXplXCJ9LCB7XCJrZXlcIjpcImRvZXMgbm90IGNvbnRhaW4uc2VsZWN0aXplXCJ9XVxuICAgICAgICAgICwgW3tcImtleVwiOiBcImVxdWFsc1wifSwge1wia2V5XCI6XCJiZXR3ZWVuXCIsXCJpbnB1dFwiOjJ9XVxuICAgICAgICBdKVxuICAgICAgICAuZGF0YSh0aGlzLmZpbHRlcnMoKSlcbiAgICAgICAgLnJlbmRlcl9vcChcImNvbnRhaW5zLnNlbGVjdGl6ZVwiLHNlbGVjdGl6ZUlucHV0KVxuICAgICAgICAucmVuZGVyX29wKFwiZG9lcyBub3QgY29udGFpbi5zZWxlY3RpemVcIixzZWxlY3RpemVJbnB1dClcbiAgICAgICAgLnJlbmRlcl9vcChcImlzIGluLmNhdGVnb3J5XCIsc2VsZWN0aXplU2VsZWN0KVxuICAgICAgICAucmVuZGVyX29wKFwiaXMgbm90IGluLmNhdGVnb3J5XCIsc2VsZWN0aXplU2VsZWN0KVxuICAgICAgICAucmVuZGVyX29wKFwiYmV0d2VlblwiLGZ1bmN0aW9uKGZpbHRlcix2YWx1ZSkge1xuICAgICAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgIFxuICAgICAgICAgIHZhbHVlLnZhbHVlID0gdHlwZW9mKHZhbHVlLnZhbHVlKSA9PSBcIm9iamVjdFwiID8gdmFsdWUudmFsdWUgOiBbMCwyNF1cbiAgICBcbiAgICAgICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0LnZhbHVlLmxvd1wiLFwiaW5wdXRcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidmFsdWUgbG93XCIsdHJ1ZSlcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjkwcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwidmFsdWVcIiwgdmFsdWUudmFsdWVbMF0pXG4gICAgICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgdmFyIHQgPSB0aGlzXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgc2VsZi50eXBld2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWVbMF0gPSB0LnZhbHVlXG4gICAgICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgICAgfSwxMDAwKVxuICAgICAgICAgICAgfSlcbiAgICBcbiAgICAgICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcInNwYW4udmFsdWUtYW5kXCIsXCJzcGFuXCIpXG4gICAgICAgICAgICAuY2xhc3NlZChcInZhbHVlLWFuZFwiLHRydWUpXG4gICAgICAgICAgICAudGV4dChcIiBhbmQgXCIpXG4gICAgXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dC52YWx1ZS5oaWdoXCIsXCJpbnB1dFwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZSBoaWdoXCIsdHJ1ZSlcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjkwcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwidmFsdWVcIiwgdmFsdWUudmFsdWVbMV0pXG4gICAgICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgdmFyIHQgPSB0aGlzXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgc2VsZi50eXBld2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWVbMV0gPSB0LnZhbHVlXG4gICAgICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgICAgfSwxMDAwKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKFwidXBkYXRlXCIsZnVuY3Rpb24oZmlsdGVycyl7XG4gICAgICAgICAgZmlsdGVyX2NoYW5nZShmaWx0ZXJzKVxuICAgICAgICB9KVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIC8vZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5maWx0ZXItd3JhcC1zcGFjZXJcIixcImRpdlwiKVxuICAgICAgLy8gIC5jbGFzc2VkKFwiZmlsdGVyLXdyYXAtc3BhY2VyXCIsdHJ1ZSlcbiAgICAgIC8vICAuc3R5bGUoXCJoZWlnaHRcIix3cmFwcGVyLnN0eWxlKFwiaGVpZ2h0XCIpKVxuXG4gICAgICAvL3dyYXBwZXJcbiAgICAgIC8vICAuc3R5bGUoXCJ3aWR0aFwiLHRoaXMudGFyZ2V0LnN0eWxlKFwid2lkdGhcIikpXG4gICAgICAvLyAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiei1pbmRleFwiLFwiMzAwXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2YwZjRmN1wiKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4vaGVhZGVyJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIEJ1dHRvblJhZGlvKHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGJ1dHRvbl9yYWRpbyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBCdXR0b25SYWRpbyh0YXJnZXQpXG59XG5cbkJ1dHRvblJhZGlvLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uICgpIHtcbiAgXG4gICAgdmFyIENTU19TVFJJTkcgPSBTdHJpbmcoZnVuY3Rpb24oKSB7LypcbiAgICAgIC5vcHRpb25zLXZpZXcgeyB0ZXh0LWFsaWduOnJpZ2h0IH1cbiAgICAgIC5zaG93LWJ1dHRvbiB7XG4gICAgICB3aWR0aDogMTUwcHg7XG4gICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgICBsaW5lLWhlaWdodDogNDBweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDE1cHg7XG4gICAgICBib3JkZXI6IDFweCBzb2xpZCAjY2NjO1xuICAgICAgZm9udC1zaXplOiAxMnB4O1xuICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbiAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgICAgZGlzcGxheTppbmxpbmUtYmxvY2s7XG4gICAgICBtYXJnaW4tcmlnaHQ6MTVweDtcbiAgICAgICAgfVxuICAgICAgLnNob3ctYnV0dG9uOmhvdmVyIHsgdGV4dC1kZWNvcmF0aW9uOm5vbmU7IGNvbG9yOiM1NTUgfVxuICAgICAgLnNob3ctYnV0dG9uLnNlbGVjdGVkIHtcbiAgICAgICAgYmFja2dyb3VuZDogI2UzZWJmMDtcbiAgICAgICAgY29sb3I6ICM1NTU7XG4gICAgICB9XG4gICAgKi99KVxuICBcbiAgICBkM191cGRhdGVhYmxlKGQzLnNlbGVjdChcImhlYWRcIiksXCJzdHlsZSNzaG93LWNzc1wiLFwic3R5bGVcIilcbiAgICAgIC5hdHRyKFwiaWRcIixcImhlYWRlci1jc3NcIilcbiAgICAgIC50ZXh0KENTU19TVFJJTkcucmVwbGFjZShcImZ1bmN0aW9uICgpIHsvKlwiLFwiXCIpLnJlcGxhY2UoXCIqL31cIixcIlwiKSlcbiAgXG4gICAgdmFyIG9wdGlvbnMgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmJ1dHRvbi1yYWRpby1yb3dcIixcImRpdlwiKVxuICAgICAgLmNsYXNzZWQoXCJidXR0b24tcmFkaW8tcm93XCIsdHJ1ZSlcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjM1cHhcIilcbiAgXG4gIFxuICAgIHZhciBidXR0b25fcm93ID0gZDNfdXBkYXRlYWJsZShvcHRpb25zLFwiLm9wdGlvbnMtdmlld1wiLFwiZGl2XCIsdGhpcy5kYXRhKCkpXG4gICAgICAuY2xhc3NlZChcIm9wdGlvbnMtdmlld1wiLHRydWUpXG5cbiAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwiY2xpY2tcIikuYmluZCh0aGlzKVxuICBcbiAgICBkM19zcGxhdChidXR0b25fcm93LFwiLnNob3ctYnV0dG9uXCIsXCJhXCIsaWRlbnRpdHksIGtleSlcbiAgICAgIC5jbGFzc2VkKFwic2hvdy1idXR0b25cIix0cnVlKVxuICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LnNlbGVjdGVkIH0pXG4gICAgICAudGV4dChrZXkpXG4gICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7IGJvdW5kKHgpIH0pXG5cbiAgICByZXR1cm4gdGhpc1xuICBcbiAgICB9XG4gIFxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZnVuY3Rpb24gT3B0aW9uVmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG9wdGlvbl92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IE9wdGlvblZpZXcodGFyZ2V0KVxufVxuXG5PcHRpb25WaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLm9wdGlvbi13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJvcHRpb24td3JhcFwiLHRydWUpXG5cbiAgICAgIC8vaGVhZGVyKHdyYXApXG4gICAgICAvLyAgLnRleHQoXCJDaG9vc2UgVmlld1wiKVxuICAgICAgLy8gIC5kcmF3KClcblxuICAgICAgYnV0dG9uX3JhZGlvKHdyYXApXG4gICAgICAgIC5vbihcImNsaWNrXCIsIHRoaXMub24oXCJzZWxlY3RcIikgKVxuICAgICAgICAuZGF0YSh0aGlzLmRhdGEoKSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiZXhwb3J0IGZ1bmN0aW9uIHByZXBEYXRhKGRkKSB7XG4gIHZhciBwID0gW11cbiAgZDMucmFuZ2UoMCwyNCkubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICBbXCIwXCIsXCIyMFwiLFwiNDBcIl0ubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgIGlmICh0IDwgMTApIHAucHVzaChcIjBcIiArIFN0cmluZyh0KStTdHJpbmcobSkpXG4gICAgICBlbHNlIHAucHVzaChTdHJpbmcodCkrU3RyaW5nKG0pKVxuXG4gICAgfSlcbiAgfSlcbiAgdmFyIHJvbGxlZCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oaykgeyByZXR1cm4gay5ob3VyICsgay5taW51dGUgfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiB2LnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgcC5hcnRpY2xlc1tjLnVybF0gPSB0cnVlXG4gICAgICAgIHAudmlld3MgKz0gYy5jb3VudFxuICAgICAgICBwLnNlc3Npb25zICs9IGMudW5pcXVlc1xuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7IGFydGljbGVzOiB7fSwgdmlld3M6IDAsIHNlc3Npb25zOiAwfSlcbiAgICB9KVxuICAgIC5lbnRyaWVzKGRkKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgT2JqZWN0LmtleXMoeC52YWx1ZXMpLm1hcChmdW5jdGlvbih5KSB7XG4gICAgICAgIHhbeV0gPSB4LnZhbHVlc1t5XVxuICAgICAgfSlcbiAgICAgIHguYXJ0aWNsZV9jb3VudCA9IE9iamVjdC5rZXlzKHguYXJ0aWNsZXMpLmxlbmd0aFxuICAgICAgeC5ob3VyID0geC5rZXkuc2xpY2UoMCwyKVxuICAgICAgeC5taW51dGUgPSB4LmtleS5zbGljZSgyKVxuICAgICAgeC52YWx1ZSA9IHguYXJ0aWNsZV9jb3VudFxuICAgICAgeC5rZXkgPSBwLmluZGV4T2YoeC5rZXkpXG4gICAgICAvL2RlbGV0ZSB4WydhcnRpY2xlcyddXG4gICAgICByZXR1cm4geFxuICAgIH0pXG4gIHJldHVybiByb2xsZWRcbn1cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN1bW1hcnlEYXRhKGRhdGEpIHtcbiAgICAgIHZhciByZWR1Y2VkID0gZGF0YS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgICAgcC5kb21haW5zW2MuZG9tYWluXSA9IHRydWVcbiAgICAgICAgICBwLmFydGljbGVzW2MudXJsXSA9IHRydWVcbiAgICAgICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgICAgICBwLnNlc3Npb25zICs9IGMudW5pcXVlc1xuXG4gICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgfSx7XG4gICAgICAgICAgICBkb21haW5zOiB7fVxuICAgICAgICAgICwgYXJ0aWNsZXM6IHt9XG4gICAgICAgICAgLCBzZXNzaW9uczogMFxuICAgICAgICAgICwgdmlld3M6IDBcbiAgICAgICAgfSlcblxuICAgICAgcmVkdWNlZC5kb21haW5zID0gT2JqZWN0LmtleXMocmVkdWNlZC5kb21haW5zKS5sZW5ndGhcbiAgICAgIHJlZHVjZWQuYXJ0aWNsZXMgPSBPYmplY3Qua2V5cyhyZWR1Y2VkLmFydGljbGVzKS5sZW5ndGhcblxuICAgICAgcmV0dXJuIHJlZHVjZWRcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5QWdncmVnYXRpb24oc2FtcCxwb3ApIHtcbiAgICAgIHZhciBkYXRhX3N1bW1hcnkgPSB7fVxuICAgICAgT2JqZWN0LmtleXMoc2FtcCkubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgZGF0YV9zdW1tYXJ5W2tdID0ge1xuICAgICAgICAgICAgc2FtcGxlOiBzYW1wW2tdXG4gICAgICAgICAgLCBwb3B1bGF0aW9uOiBwb3Bba11cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGRhdGFfc3VtbWFyeVxuICBcbn1cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhdGVnb3JpZXMoZGF0YSkge1xuICB2YXIgdmFsdWVzID0gZGF0YS5jYXRlZ29yeVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4ge1wia2V5XCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWUsIFwidmFsdWVcIjogeC5jb3VudCB9IH0pXG4gICAgICAgIC5zb3J0KGZ1bmN0aW9uKHAsYykge3JldHVybiBjLnZhbHVlIC0gcC52YWx1ZSB9KS5zbGljZSgwLDE1KVxuICAgICwgdG90YWwgPSB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsIHgpIHtyZXR1cm4gcCArIHgudmFsdWUgfSwgMClcblxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIkNhdGVnb3JpZXNcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHsgeC5wZXJjZW50ID0geC52YWx1ZS90b3RhbDsgcmV0dXJuIHh9KVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFRpbWVzKGRhdGEpIHtcblxuICB2YXIgaG91ciA9IGRhdGEuY3VycmVudF9ob3VyXG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkYXRhLmRpc3BsYXlfY2F0ZWdvcmllcy52YWx1ZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMCkge1xuICAgIGhvdXIgPSBkYXRhLmNhdGVnb3J5X2hvdXIuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTF9KVxuICAgIGhvdXIgPSBkMy5uZXN0KClcbiAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5ob3VyIH0pXG4gICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubWludXRlIH0pXG4gICAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBcbiAgICAgICAgICBwLnVuaXF1ZXMgPSAocC51bmlxdWVzIHx8IDApICsgYy51bmlxdWVzOyBcbiAgICAgICAgICBwLmNvdW50ID0gKHAuY291bnQgfHwgMCkgKyBjLmNvdW50OyAgXG4gICAgICAgICAgcmV0dXJuIHAgfSx7fSlcbiAgICAgIH0pXG4gICAgICAuZW50cmllcyhob3VyKVxuICAgICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgICBjb25zb2xlLmxvZyh4LnZhbHVlcyk7IFxuICAgICAgICByZXR1cm4geC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsayl7IFxuICAgICAgICAgIHBbJ21pbnV0ZSddID0gcGFyc2VJbnQoay5rZXkpOyBcbiAgICAgICAgICBwWydjb3VudCddID0gay52YWx1ZXMuY291bnQ7IFxuICAgICAgICAgIHBbJ3VuaXF1ZXMnXSA9IGsudmFsdWVzLnVuaXF1ZXM7IFxuICAgICAgICAgIHJldHVybiBwIFxuICAgICAgfSwge1wiaG91clwiOngua2V5fSkgfSApXG4gIH1cblxuICB2YXIgdmFsdWVzID0gaG91clxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4ge1wia2V5XCI6IHBhcnNlRmxvYXQoeC5ob3VyKSArIDEgKyB4Lm1pbnV0ZS82MCwgXCJ2YWx1ZVwiOiB4LmNvdW50IH0gfSlcblxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIkJyb3dzaW5nIGJlaGF2aW9yIGJ5IHRpbWVcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXNcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUb3BpY3MoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG5cbiAgdmFyIGlkZiA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkge3JldHVybiB4LnRvcGljfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvcGljID8geC50b3BpYy50b0xvd2VyQ2FzZSgpICE9IFwibm8gdG9waWNcIiA6IHRydWUgfSlcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwia2V5XCI6eC50b3BpY1xuICAgICAgICAsIFwidmFsdWVcIjp4LmNvdW50XG4gICAgICAgICwgXCJ1bmlxdWVzXCI6IHgudW5pcXVlcyBcbiAgICAgICAgLCBcInVybFwiOiB4LnVybFxuICAgICAgfSBcbiAgICB9KVxuXG5cblxuICB2YWx1ZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXl9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LmltcG9ydGFuY2UgPSBNYXRoLmxvZyh4LnRmX2lkZilcbiAgfSlcbiAgdmFsdWVzID0gdmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRmX2lkZiAtIHAudGZfaWRmIH0pXG5cblxuICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQqeC5wZXJjZW50X3VuaXF1ZX0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IFxuICAgIHgucG9wX3BlcmNlbnQgPSAxLjAyL2dldElERih4LmtleSkqMTAwXG4gICAgeC5wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQgPT0gSW5maW5pdHkgPyAwIDogeC5wb3BfcGVyY2VudFxuXG4gICAgeC5zYW1wbGVfcGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnNhbXBsZV9wZXJjZW50fSldKVxuICAgIC5uaWNlKClcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnNhbXBsZV9wZXJjZW50X25vcm0gPSBub3JtKHguc2FtcGxlX3BlcmNlbnQpXG5cbiAgICB4LnJhdGlvID0geC5zYW1wbGVfcGVyY2VudC94LnBvcF9wZXJjZW50XG4gICAgLy94LnBlcmNlbnRfbm9ybSA9IHgucGVyY2VudFxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgVG9waWNzXCJcbiAgICAsIHZhbHVlczogdmFsdWVzLnNsaWNlKDAsMzAwKVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERvbWFpbnMoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5kb21haW4gfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImtleVwiOnguZG9tYWluXG4gICAgICAgICwgXCJ2YWx1ZVwiOnguY291bnRcbiAgICAgICAgLCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC51bmlxdWVzIFxuICAgICAgICAsIFwidXJsXCI6IHgudXJsXG4gICAgICB9IFxuICAgIH0pXG5cblxuXG4gIHZhbHVlcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7IFxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeFswXS5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAgLCBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LmltcG9ydGFuY2UgPSBNYXRoLmxvZyh4LnRmX2lkZilcbiAgfSlcbiAgdmFsdWVzID0gdmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRmX2lkZiAtIHAudGZfaWRmIH0pXG5cblxuICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQqeC5wZXJjZW50X3VuaXF1ZX0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IFxuICAgIHgucG9wX3BlcmNlbnQgPSAxLjAyL2dldElERih4LmtleSkqMTAwXG4gICAgeC5wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQgPT0gSW5maW5pdHkgPyAwIDogeC5wb3BfcGVyY2VudFxuXG4gICAgeC5zYW1wbGVfcGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnNhbXBsZV9wZXJjZW50fSldKVxuICAgIC5uaWNlKClcblxuICB2YXIgdHQgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucG9wX3BlcmNlbnQgfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnNhbXBsZV9wZXJjZW50X25vcm0gPSBub3JtKHguc2FtcGxlX3BlcmNlbnQpXG4gICAgeC5yZWFsX3BvcF9wZXJjZW50ID0geC5wb3BfcGVyY2VudC90dCoxMDBcbiAgICB4LnJhdGlvID0geC5zYW1wbGVfcGVyY2VudC94LnJlYWxfcG9wX3BlcmNlbnRcblxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgRG9tYWluc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5zbGljZSgwLDUwMClcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRVcmxzKGRhdGEpIHtcblxuICB2YXIgY2F0ZWdvcmllcyA9IGRhdGEuZGlzcGxheV9jYXRlZ29yaWVzLnZhbHVlc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuICB2YXIgdmFsdWVzID0gZGF0YS5mdWxsX3VybHNcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHtcImtleVwiOngudXJsLFwidmFsdWVcIjp4LmNvdW50LCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWV9IH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMClcbiAgICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTEgfSlcblxuICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHgua2V5XG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cDovL1wiLFwiXCIpXG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cHM6Ly9cIixcIlwiKVxuICAgICAgICAucmVwbGFjZShcInd3dy5cIixcIlwiKS5zcGxpdChcIi5cIikuc2xpY2UoMSkuam9pbihcIi5cIikuc3BsaXQoXCIvXCIpWzFdLmxlbmd0aCA+IDVcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfSkuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudmFsdWUgLSBwLnZhbHVlIH0pXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgQXJ0aWNsZXNcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCwxMDApXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkT25zaXRlU3VtbWFyeShkYXRhKSB7XG4gIHZhciB5ZXN0ZXJkYXkgPSBkYXRhLnRpbWVzZXJpZXNfZGF0YVswXVxuICB2YXIgdmFsdWVzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlBhZ2UgVmlld3NcIlxuICAgICAgICAgICwgXCJ2YWx1ZVwiOiB5ZXN0ZXJkYXkudmlld3NcbiAgICAgICAgfVxuICAgICAgLCB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlVuaXF1ZSBWaXNpdG9yc1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IHllc3RlcmRheS51bmlxdWVzXG5cbiAgICAgICAgfVxuICAgIF1cbiAgcmV0dXJuIHtcImtleVwiOlwiT24tc2l0ZSBBY3Rpdml0eVwiLFwidmFsdWVzXCI6dmFsdWVzfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRPZmZzaXRlU3VtbWFyeShkYXRhKSB7XG4gIHZhciB2YWx1ZXMgPSBbICBcbiAgICAgICAge1xuICAgICAgICAgICAgXCJrZXlcIjogXCJPZmYtc2l0ZSBWaWV3c1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IGRhdGEuZnVsbF91cmxzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtyZXR1cm4gcCArIGMudW5pcXVlc30sMClcbiAgICAgICAgfVxuICAgICAgLCB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlVuaXF1ZSBwYWdlc1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IE9iamVjdC5rZXlzKGRhdGEuZnVsbF91cmxzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtwW2MudXJsXSA9IDA7IHJldHVybiBwIH0se30pKS5sZW5ndGhcbiAgICAgICAgfVxuICAgIF1cbiAgcmV0dXJuIHtcImtleVwiOlwiT2ZmLXNpdGUgQWN0aXZpdHlcIixcInZhbHVlc1wiOnZhbHVlc31cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWN0aW9ucyhkYXRhKSB7XG4gIFxuICByZXR1cm4ge1wia2V5XCI6XCJTZWdtZW50c1wiLFwidmFsdWVzXCI6IGRhdGEuYWN0aW9ucy5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB7XCJrZXlcIjp4LmFjdGlvbl9uYW1lLCBcInZhbHVlXCI6MCwgXCJzZWxlY3RlZFwiOiBkYXRhLmFjdGlvbl9uYW1lID09IHguYWN0aW9uX25hbWUgfSB9KX1cbn1cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuL2hlbHBlcnMnXG5pbXBvcnQge2F1dG9TaXplIGFzIGF1dG9TaXplfSBmcm9tICcuL2hlbHBlcnMnXG5pbXBvcnQge3ByZXBEYXRhIGFzIHB9IGZyb20gJy4vZGF0YV9oZWxwZXJzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHByZXBEYXRhKCkge1xuICByZXR1cm4gcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59O1xuXG52YXIgRVhBTVBMRV9EQVRBID0ge1xuICAgIFwia2V5XCI6IFwiQnJvd3NpbmcgYmVoYXZpb3IgYnkgdGltZVwiXG4gICwgXCJ2YWx1ZXNcIjogW1xuICAgICAgeyAgXG4gICAgICAgICAgXCJrZXlcIjogMVxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAyXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDIuMjVcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogMi41XG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDNcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzRcbiAgICAgIH1cblxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDRcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG5cblxuICBdIFxufVxuXG5leHBvcnQgZnVuY3Rpb24gVGltZVNlcmllcyh0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLl9kYXRhID0gRVhBTVBMRV9EQVRBXG4gIHRoaXMuX29uID0ge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdGltZV9zZXJpZXModGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGltZVNlcmllcyh0YXJnZXQpXG59XG5cblRpbWVTZXJpZXMucHJvdG90eXBlID0ge1xuXG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgdGl0bGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9XG4gICwgaGVpZ2h0OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cblxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHdyYXAgPSB0aGlzLl90YXJnZXRcbiAgICAgIHZhciBkZXNjID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnZlbmRvci1kb21haW5zLWJhci1kZXNjXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ2ZW5kb3ItZG9tYWlucy1iYXItZGVzY1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG4gICAgICAgIC5kYXR1bSh0aGlzLl9kYXRhKVxuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUoZGVzYyxcIi53XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ3XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICBcbiAgICAgIFxuXG4gICAgICB3cmFwcGVyLmVhY2goZnVuY3Rpb24ocm93KXtcblxuICAgICAgICB2YXIgZGF0YSA9IHJvdy52YWx1ZXMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMua2V5IC0gcC5rZXl9KVxuICAgICAgICAgICwgY291bnQgPSBkYXRhLmxlbmd0aDtcblxuXG4gICAgICAgIHZhciBfc2l6ZXMgPSBhdXRvU2l6ZSh3cmFwcGVyLGZ1bmN0aW9uKGQpe3JldHVybiBkIC0xMH0sIGZ1bmN0aW9uKGQpe3JldHVybiBzZWxmLl9oZWlnaHQgfHwgNjAgfSksXG4gICAgICAgICAgZ3JpZFNpemUgPSBNYXRoLmZsb29yKF9zaXplcy53aWR0aCAvIDI0IC8gMyk7XG5cbiAgICAgICAgdmFyIHZhbHVlQWNjZXNzb3IgPSBmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH1cbiAgICAgICAgICAsIHZhbHVlQWNjZXNzb3IyID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZTIgfVxuICAgICAgICAgICwga2V5QWNjZXNzb3IgPSBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9XG5cbiAgICAgICAgdmFyIHN0ZXBzID0gQXJyYXkuYXBwbHkobnVsbCwgQXJyYXkoY291bnQpKS5tYXAoZnVuY3Rpb24gKF8sIGkpIHtyZXR1cm4gaSsxO30pXG5cbiAgICAgICAgdmFyIF9jb2xvcnMgPSBbXCIjZmZmZmQ5XCIsXCIjZWRmOGIxXCIsXCIjYzdlOWI0XCIsXCIjN2ZjZGJiXCIsXCIjNDFiNmM0XCIsXCIjMWQ5MWMwXCIsXCIjMjI1ZWE4XCIsXCIjMjUzNDk0XCIsXCIjMDgxZDU4XCJdXG4gICAgICAgIHZhciBjb2xvcnMgPSBfY29sb3JzXG5cbiAgICAgICAgdmFyIHggPSBkMy5zY2FsZS5vcmRpbmFsKCkucmFuZ2Uoc3RlcHMpXG4gICAgICAgICAgLCB5ID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoW19zaXplcy5oZWlnaHQsIDAgXSlcblxuXG4gICAgICAgIHZhciBjb2xvclNjYWxlID0gZDMuc2NhbGUucXVhbnRpbGUoKVxuICAgICAgICAgIC5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbiAoZCkgeyByZXR1cm4gZC5mcmVxdWVuY3k7IH0pXSlcbiAgICAgICAgICAucmFuZ2UoY29sb3JzKTtcblxuICAgICAgICB2YXIgc3ZnX3dyYXAgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCJzdmdcIixcInN2Z1wiKVxuICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgX3NpemVzLndpZHRoICsgX3NpemVzLm1hcmdpbi5sZWZ0ICsgX3NpemVzLm1hcmdpbi5yaWdodClcbiAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBfc2l6ZXMuaGVpZ2h0ICsgX3NpemVzLm1hcmdpbi50b3AgKyBfc2l6ZXMubWFyZ2luLmJvdHRvbSlcblxuICAgICAgICB2YXIgc3ZnID0gZDNfc3BsYXQoc3ZnX3dyYXAsXCJnXCIsXCJnXCIsZnVuY3Rpb24oeCkge3JldHVybiBbeC52YWx1ZXNdfSxmdW5jdGlvbihfLGkpIHtyZXR1cm4gaX0pXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBfc2l6ZXMubWFyZ2luLmxlZnQgKyBcIixcIiArIDAgKyBcIilcIilcblxuICAgICAgICB4LmRvbWFpbihbMCw3Ml0pO1xuICAgICAgICB5LmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIE1hdGguc3FydCh2YWx1ZUFjY2Vzc29yKGQpKTsgfSldKTtcblxuICAgICAgICB2YXIgYnVpbGRCYXJzID0gZnVuY3Rpb24oZGF0YSxrZXlBY2Nlc3Nvcix2YWx1ZUFjY2Vzc29yLHksYykge1xuXG4gICAgICAgICAgdmFyIGJhcnMgPSBkM19zcGxhdChzdmcsIFwiLnRpbWluZy1iYXJcIiArIGMsIFwicmVjdFwiLCBkYXRhLCBrZXlBY2Nlc3NvcilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0aW1pbmctYmFyXCIgKyBjKVxuICAgICAgICAgICBcbiAgICAgICAgICBiYXJzXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gKChrZXlBY2Nlc3NvcihkKSAtIDEpICogZ3JpZFNpemUgKTsgfSlcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZ3JpZFNpemUgLSAxKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uKGQpIHsgXG4gICAgICAgICAgICAgIHJldHVybiB5KE1hdGguc3FydCggdmFsdWVBY2Nlc3NvcihkKSApKTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsXCIjYWFhXCIpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBjb2xvclNjYWxlKCBrZXlBY2Nlc3Nvcih4KSArIGMgKSB8fCBcImdyZXlcIiB9IClcbiAgICAgICAgICAgIC8vLmF0dHIoXCJzdHJva2VcIixcIndoaXRlXCIpXG4gICAgICAgICAgICAvLy5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsXCIxcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIF9zaXplcy5oZWlnaHQgLSB5KE1hdGguc3FydCggdmFsdWVBY2Nlc3NvcihkKSApKTsgfSlcbiAgICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIjFcIilcbiAgICAgICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLGZ1bmN0aW9uKHgpeyBcbiAgICAgICAgICAgICAgc2VsZi5vbihcImhvdmVyXCIpLmJpbmQodGhpcykoeClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgfVxuICAgICAgICBcblxuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLmxlbmd0aCAmJiBkYXRhWzBdLnZhbHVlMikge1xuICAgICAgICAgIHZhciAgeTIgPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbX3NpemVzLmhlaWdodCwgMCBdKVxuICAgICAgICAgIHkyLmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIE1hdGguc3FydCh2YWx1ZUFjY2Vzc29yMihkKSk7IH0pXSk7XG4gICAgICAgICAgYnVpbGRCYXJzKGRhdGEsa2V5QWNjZXNzb3IsdmFsdWVBY2Nlc3NvcjIseTIsXCItMlwiKVxuICAgICAgICB9XG5cblxuICAgICAgICBidWlsZEJhcnMoZGF0YSxrZXlBY2Nlc3Nvcix2YWx1ZUFjY2Vzc29yLHksXCJcIilcbiAgICAgIFxuICAgIFxuICAgICAgdmFyIHogPSBkMy50aW1lLnNjYWxlKClcbiAgICAgICAgLnJhbmdlKFswLCBncmlkU2l6ZSoyNCozXSlcbiAgICAgICAgLm5pY2UoZDMudGltZS5ob3VyLDI0KVxuICAgICAgICBcbiAgICBcbiAgICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKClcbiAgICAgICAgLnNjYWxlKHopXG4gICAgICAgIC50aWNrcygzKVxuICAgICAgICAudGlja0Zvcm1hdChkMy50aW1lLmZvcm1hdChcIiVJICVwXCIpKTtcbiAgICBcbiAgICAgIHN2Zy5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInggYXhpc1wiKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsXCIgKyBfc2l6ZXMuaGVpZ2h0ICsgXCIpXCIpXG4gICAgICAgICAgLmNhbGwoeEF4aXMpO1xuXG5cblxuICAgICAgICBcbiAgICAgIH0pXG5cblxuICAgIH1cbn1cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gUGllKHRhcmdldCkge1xuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5QaWUucHJvdG90eXBlID0ge1xuICAgIHJhZGl1czogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInJhZGl1c1wiLHZhbClcbiAgICB9XG4gICwgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgXG4gICAgdmFyIGQgPSBkMy5lbnRyaWVzKHtcbiAgICAgICAgc2FtcGxlOiB0aGlzLl9kYXRhLnNhbXBsZVxuICAgICAgLCBwb3B1bGF0aW9uOiB0aGlzLl9kYXRhLnBvcHVsYXRpb24gLSB0aGlzLl9kYXRhLnNhbXBsZVxuICAgIH0pXG4gICAgXG4gICAgdmFyIGNvbG9yID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAgIC5yYW5nZShbXCIjOThhYmM1XCIsIFwiIzhhODlhNlwiLCBcIiM3YjY4ODhcIiwgXCIjNmI0ODZiXCIsIFwiI2EwNWQ1NlwiLCBcIiNkMDc0M2NcIiwgXCIjZmY4YzAwXCJdKTtcbiAgICBcbiAgICB2YXIgYXJjID0gZDMuc3ZnLmFyYygpXG4gICAgICAgIC5vdXRlclJhZGl1cyh0aGlzLl9yYWRpdXMgLSAxMClcbiAgICAgICAgLmlubmVyUmFkaXVzKDApO1xuICAgIFxuICAgIHZhciBwaWUgPSBkMy5sYXlvdXQucGllKClcbiAgICAgICAgLnNvcnQobnVsbClcbiAgICAgICAgLnZhbHVlKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWU7IH0pO1xuICAgIFxuICAgIHZhciBzdmcgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbih4KXtyZXR1cm4gMX0pXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgNTApXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIDUyKVxuICBcbiAgICBzdmcgPSBkM191cGRhdGVhYmxlKHN2ZyxcImdcIixcImdcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAyNSArIFwiLFwiICsgMjYgKyBcIilcIik7XG4gICAgXG4gICAgdmFyIGcgPSBkM19zcGxhdChzdmcsXCIuYXJjXCIsXCJnXCIscGllKGQpLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5kYXRhLmtleSB9KVxuICAgICAgLmNsYXNzZWQoXCJhcmNcIix0cnVlKVxuICBcbiAgICBkM191cGRhdGVhYmxlKGcsXCJwYXRoXCIsXCJwYXRoXCIpXG4gICAgICAuYXR0cihcImRcIiwgYXJjKVxuICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBjb2xvcihkLmRhdGEua2V5KSB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwaWUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgUGllKHRhcmdldClcbn1cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkaWZmX2Jhcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEaWZmQmFyKHRhcmdldClcbn1cblxuLy8gZGF0YSBmb3JtYXQ6IFt7a2V5LCBub3JtYWxpemVkX2RpZmZ9LCAuLi4gXVxuXG5jbGFzcyBEaWZmQmFyIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICB0aGlzLl9rZXlfYWNjZXNzb3IgPSBcImtleVwiXG4gICAgdGhpcy5fdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcbiAgICB0aGlzLl9iYXJfaGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9iYXJfd2lkdGggPSAxNTBcbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGJhcl9oZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX2hlaWdodFwiLHZhbCkgfVxuICBiYXJfd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX3dpZHRoXCIsdmFsKSB9XG5cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHcgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5kaWZmLXdyYXBcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkge3JldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiZGlmZi13cmFwXCIsdHJ1ZSlcblxuICAgIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKS50ZXh0KHRoaXMuX3RpdGxlKVxuXG4gICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHcsXCIuc3ZnLXdyYXBcIixcImRpdlwiLHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmNsYXNzZWQoXCJzdmctd3JhcFwiLHRydWUpXG5cbiAgICB2YXIgayA9IHRoaXMua2V5X2FjY2Vzc29yKClcbiAgICAgICwgdiA9IHRoaXMudmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmJhcl9oZWlnaHQoKVxuICAgICAgLCBiYXJfd2lkdGggPSB0aGlzLmJhcl93aWR0aCgpXG5cbiAgICB2YXIga2V5cyA9IHRoaXMuX2RhdGEubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhba10gfSlcbiAgICAgICwgbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFt2XSB9KVxuICAgICAgLCBzYW1wbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gLXhbdl0gfSlcblxuICAgIHZhciB4c2FtcHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLHNhbXBtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB4c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLGtleXMubGVuZ3RoXSlcbiAgICAgICAgICAucmFuZ2UoWzAsa2V5cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoe1wid2lkdGhcIjpiYXJfd2lkdGgqMywgXCJoZWlnaHRcIjoga2V5cy5sZW5ndGgqaGVpZ2h0ICsgMTB9KTtcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ2JvdHRvbScpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4ga2V5c1tpXTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKGtleXMubGVuZ3RoKSk7XG5cbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aCArIGJhcl93aWR0aC8yKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGV4dC1hbmNob3I6IG1pZGRsZTtcIilcblxuICAgIFxuICAgIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoKjIpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuICAgIFxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTQpXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA4LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnIzM4OGUzYycpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNjYWxlKHhbdl0pIH0pXG5cbiAgICB2YXIgY2hhcnQyID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQyJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydDJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgc2FtcGJhcnMgPSBkM19zcGxhdChjaGFydDIsXCIuc2FtcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNhbXAtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtNClcbiAgICAgIC5hdHRyKHsneCc6ZnVuY3Rpb24oeCkgeyByZXR1cm4gYmFyX3dpZHRoIC0geHNhbXBzY2FsZSgteFt2XSl9LCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgOC41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJyNkMzJmMmYnKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzYW1wc2NhbGUoLXhbdl0pIH0pXG5cbiAgICB5X3hpcy5leGl0KCkucmVtb3ZlKClcblxuICAgIGNoYXJ0LmV4aXQoKS5yZW1vdmUoKVxuICAgIGNoYXJ0Mi5leGl0KCkucmVtb3ZlKClcblxuICAgIGJhcnMuZXhpdCgpLnJlbW92ZSgpXG4gICAgc2FtcGJhcnMuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgIFxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcF9iYXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQ29tcEJhcih0YXJnZXQpXG59XG5cbi8vIGRhdGEgZm9ybWF0OiBbe2tleSwgbm9ybWFsaXplZF9kaWZmfSwgLi4uIF1cblxuY2xhc3MgQ29tcEJhciB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuXG4gICAgdGhpcy5fa2V5X2FjY2Vzc29yID0gXCJrZXlcIlxuICAgIHRoaXMuX3BvcF92YWx1ZV9hY2Nlc3NvciA9IFwidmFsdWVcIlxuICAgIHRoaXMuX3NhbXBfdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcblxuICAgIHRoaXMuX2Jhcl9oZWlnaHQgPSAyMFxuICAgIHRoaXMuX2Jhcl93aWR0aCA9IDMwMFxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgcG9wX3ZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInBvcF92YWx1ZV9hY2Nlc3NvclwiLHZhbCkgfVxuICBzYW1wX3ZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNhbXBfdmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cblxuICBiYXJfaGVpZ2h0KHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJhcl9oZWlnaHRcIix2YWwpIH1cbiAgYmFyX3dpZHRoKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJhcl93aWR0aFwiLHZhbCkgfVxuXG5cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG4gIHRpdGxlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9IFxuXG5cbiAgZHJhdygpIHtcblxuICAgIHZhciB3ID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIuY29tcC13cmFwXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHtyZXR1cm4gMX0pXG4gICAgICAuY2xhc3NlZChcImNvbXAtd3JhcFwiLHRydWUpXG5cbiAgICBkM191cGRhdGVhYmxlKHcsXCJoM1wiLFwiaDNcIikudGV4dCh0aGlzLl90aXRsZSlcblxuICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh3LFwiLnN2Zy13cmFwXCIsXCJkaXZcIix0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5jbGFzc2VkKFwic3ZnLXdyYXBcIix0cnVlKVxuXG4gICAgdmFyIGsgPSB0aGlzLmtleV9hY2Nlc3NvcigpXG4gICAgICAsIHAgPSB0aGlzLnBvcF92YWx1ZV9hY2Nlc3NvcigpXG4gICAgICAsIHMgPSB0aGlzLnNhbXBfdmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmJhcl9oZWlnaHQoKVxuICAgICAgLCBiYXJfd2lkdGggPSB0aGlzLmJhcl93aWR0aCgpXG5cbiAgICB2YXIga2V5cyA9IHRoaXMuX2RhdGEubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhba10gfSlcbiAgICAgICwgbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFtwXSB9KVxuICAgICAgLCBzYW1wbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFtzXSB9KVxuXG4gICAgdmFyIHhzYW1wc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsc2FtcG1heF0pXG4gICAgICAgICAgLnJhbmdlKFswLGJhcl93aWR0aF0pXG4gICAgICAsIHhzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgLmRvbWFpbihbMCxtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB5c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsa2V5cy5sZW5ndGhdKVxuICAgICAgICAgIC5yYW5nZShbMCxrZXlzLmxlbmd0aCpoZWlnaHRdKTtcblxuICAgIHZhciBjYW52YXMgPSBkM191cGRhdGVhYmxlKHdyYXAsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAuYXR0cih7XCJ3aWR0aFwiOmJhcl93aWR0aCtiYXJfd2lkdGgvMiwgXCJoZWlnaHRcIjoga2V5cy5sZW5ndGgqaGVpZ2h0ICsgMTB9KTtcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ2JvdHRvbScpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4ga2V5c1tpXTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKGtleXMubGVuZ3RoKSk7XG5cbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aC8yKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuXG4gICAgXG4gICAgdmFyIGNoYXJ0ID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0XCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChiYXJfd2lkdGgvMikgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG4gICAgXG4gICAgdmFyIGJhcnMgPSBkM19zcGxhdChjaGFydCxcIi5wb3AtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtMilcbiAgICAgIC5hdHRyKHsneCc6MCwneSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHlzY2FsZShpKSArIDcuNTsgfX0pXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCdncmF5JylcbiAgICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4c2NhbGUoeFtwXSkgfSlcblxuXG4gICAgdmFyIHNhbXBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIuc2FtcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNhbXAtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtMTApXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyAxMS41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJyMwODFkNTgnKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzYW1wc2NhbGUoeFtzXSB8fCAwKSB9KVxuXG4gICAgeV94aXMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICBjaGFydC5leGl0KCkucmVtb3ZlKClcblxuICAgIGJhcnMuZXhpdCgpLnJlbW92ZSgpXG4gICAgc2FtcGJhcnMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcF9idWJibGUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQ29tcEJ1YmJsZSh0YXJnZXQpXG59XG5cbi8vIGRhdGEgZm9ybWF0OiBbe2tleSwgbm9ybWFsaXplZF9kaWZmfSwgLi4uIF1cblxuY2xhc3MgQ29tcEJ1YmJsZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuXG4gICAgdGhpcy5fa2V5X2FjY2Vzc29yID0gXCJrZXlcIlxuXG4gICAgdGhpcy5faGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9zcGFjZSA9IDE0XG4gICAgdGhpcy5fbWlkZGxlID0gMTgwXG4gICAgdGhpcy5fbGVnZW5kX3dpZHRoID0gODBcblxuICAgIHRoaXMuX2J1Y2tldHMgPSBbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geCo2MCB9KVxuICAgIHRoaXMuX3Jvd3MgPSBbXVxuXG5cbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG5cbiAgaGVpZ2h0KHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhlaWdodFwiLHZhbCkgfVxuICBzcGFjZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzcGFjZVwiLHZhbCkgfVxuICBtaWRkbGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibWlkZGxlXCIsdmFsKSB9XG4gIGJ1Y2tldHModmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYnVja2V0c1wiLHZhbCkgfVxuXG4gIHJvd3ModmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicm93c1wiLHZhbCkgfVxuICBhZnRlcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhZnRlclwiLHZhbCkgfVxuXG5cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cbiAgYnVpbGRTY2FsZXMoKSB7XG5cbiAgICB2YXIgcm93cyA9IHRoaXMucm93cygpXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKVxuXG4gICAgdGhpcy5feXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oWzAscm93cy5sZW5ndGhdKVxuICAgICAgLnJhbmdlKFswLHJvd3MubGVuZ3RoKmhlaWdodF0pO1xuXG4gICAgdGhpcy5feHNjYWxlID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCxidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSwoaGVpZ2h0K3NwYWNlKSkpO1xuXG4gICAgdGhpcy5feHNjYWxlcmV2ZXJzZSA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgLmRvbWFpbihidWNrZXRzLnJldmVyc2UoKSlcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLChoZWlnaHQrc3BhY2UpKSk7XG5cbiAgICB0aGlzLl9yc2NhbGUgPSBkMy5zY2FsZS5wb3coKVxuICAgICAgLmV4cG9uZW50KDAuNSlcbiAgICAgIC5kb21haW4oWzAsMV0pXG4gICAgICAucmFuZ2UoWy4zNSwxXSlcbiAgICBcbiAgICB0aGlzLl9vc2NhbGUgPSBkMy5zY2FsZS5xdWFudGl6ZSgpXG4gICAgICAuZG9tYWluKFstMSwxXSlcbiAgICAgIC5yYW5nZShbJyNmN2ZiZmYnLCcjZGVlYmY3JywnI2M2ZGJlZicsJyM5ZWNhZTEnLCcjNmJhZWQ2JywnIzQyOTJjNicsJyMyMTcxYjUnLCcjMDg1MTljJywnIzA4MzA2YiddKVxuICAgIFxuICB9XG5cbiAgZHJhd0xlZ2VuZCgpIHtcbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKSwgbWlkZGxlID0gdGhpcy5taWRkbGUoKSwgbGVnZW5kdHcgPSB0aGlzLl9sZWdlbmRfd2lkdGhcbiAgICAgICwgcnNjYWxlID0gdGhpcy5fcnNjYWxlLCBvc2NhbGUgPSB0aGlzLl9vc2NhbGU7XG5cbiAgICB2YXIgbGVnZW5kID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cubGVnZW5kJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZWdlbmRcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkqMittaWRkbGUtMzEwKSArIFwiLC0xMzApXCIpXG5cbiAgICB2YXIgc2l6ZSA9IGQzX3VwZGF0ZWFibGUobGVnZW5kLCdnLnNpemUnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNpemVcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoXCIgKyAobGVnZW5kdHcrMTApICsgXCIsMClcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZVwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZSBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHcpXG4gICAgICAuaHRtbChcIm1vcmUgYWN0aXZpdHlcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKSBcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lm1vcmUtYXJyb3dcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1vcmUtYXJyb3cgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsLWxlZ2VuZHR3LTEwKVxuICAgICAgLmh0bWwoXCImIzk2NjQ7XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIikgXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cblxuXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3NcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLmh0bWwoXCJsZXNzIGFjdGl2aXR5XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcblxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzcy1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcy1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcrMTApXG4gICAgICAuaHRtbChcIiYjOTY1NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuN2VtXCIpIFxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG4gICAgZDNfc3BsYXQoc2l6ZSxcImNpcmNsZVwiLFwiY2lyY2xlXCIsWzEsLjYsLjMsLjEsMF0pXG4gICAgICAuYXR0cihcInJcIixmdW5jdGlvbih4KSB7IHJldHVybiAoaGVpZ2h0LTIpLzIqcnNjYWxlKHgpIH0pXG4gICAgICAuYXR0cignY3gnLCBmdW5jdGlvbihkLGkpIHsgcmV0dXJuIChoZWlnaHQrNCkqaStoZWlnaHQvMn0pXG4gICAgICAuYXR0cignc3Ryb2tlJywgJ2dyZXknKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnbm9uZScpXG5cblxuICAgIFxuXG5cbiAgICB2YXIgc2l6ZSA9IGQzX3VwZGF0ZWFibGUobGVnZW5kLCdnLmltcG9ydGFuY2UnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImltcG9ydGFuY2VcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoXCIrIChsZWdlbmR0dysxMCkgK1wiLDI1KVwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlIGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dylcbiAgICAgIC5odG1sKFwibW9yZSBpbXBvcnRhbnRcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZS1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZS1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHctMTApXG4gICAgICAuaHRtbChcIiYjOTY2NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuN2VtXCIpIFxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3NcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLmh0bWwoXCJsZXNzIGltcG9ydGFudFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5sZXNzLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZXNzLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLChoZWlnaHQrNCkqNStsZWdlbmR0dysxMClcbiAgICAgIC5odG1sKFwiJiM5NjU0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cblxuICAgIGQzX3NwbGF0KHNpemUsXCJjaXJjbGVcIixcImNpcmNsZVwiLFsxLC43NSwuNSwuMjUsMF0pXG4gICAgICAuYXR0cihcInJcIixoZWlnaHQvMi0yKVxuICAgICAgLmF0dHIoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gb3NjYWxlKHgpIH0pXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIixmdW5jdGlvbih4KSB7IHJldHVybiByc2NhbGUoeC8yICsgLjIpIH0pXG4gICAgICAuYXR0cignY3gnLCBmdW5jdGlvbihkLGkpIHsgcmV0dXJuIChoZWlnaHQrNCkqaStoZWlnaHQvMiB9KVxuIFxuICB9XG5cbiAgZHJhd0F4ZXMoKSB7XG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1xuICAgICAgLCBidWNrZXRzID0gdGhpcy5idWNrZXRzKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5oZWlnaHQoKSwgc3BhY2UgPSB0aGlzLnNwYWNlKCksIG1pZGRsZSA9IHRoaXMubWlkZGxlKCksIGxlZ2VuZHR3ID0gdGhpcy5fbGVnZW5kX3dpZHRoXG4gICAgICAsIHJzY2FsZSA9IHRoaXMuX3JzY2FsZSwgb3NjYWxlID0gdGhpcy5fb3NjYWxlIFxuICAgICAgLCB4c2NhbGUgPSB0aGlzLl94c2NhbGUsIHlzY2FsZSA9IHRoaXMuX3lzY2FsZVxuICAgICAgLCB4c2NhbGVyZXZlcnNlID0gdGhpcy5feHNjYWxlcmV2ZXJzZVxuICAgICAgLCByb3dzID0gdGhpcy5fcm93c1xuXG4gICAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB4QXhpc1xuICAgICAgLm9yaWVudCgndG9wJylcbiAgICAgIC5zY2FsZSh4c2NhbGVyZXZlcnNlKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgaWYgKHggPT0gMzYwMCkgcmV0dXJuIFwiMSBob3VyXCJcbiAgICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgICBpZiAoeCA9PSA4NjQwMCkgcmV0dXJuIFwiMSBkYXlcIlxuICAgICAgICBpZiAoeCA+IDg2NDAwKSByZXR1cm4geC84NjQwMCArIFwiIGRheXNcIiBcblxuICAgICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgICAgfSlcblxuICAgIHZhciB4X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnguYmVmb3JlJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYmVmb3JlXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChoZWlnaHQgKyBzcGFjZSkrIFwiLC00KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneGF4aXMnKVxuICAgICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgICAgICAgXG4gICAgeF94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ5XCIsIC04KVxuICAgICAgLmF0dHIoXCJ4XCIsIC04KVxuICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSg0NSlcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwiZW5kXCIpXG5cbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2tcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHhfeGlzLFwidGV4dC50aXRsZVwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcbiAgICAgIC5hdHRyKFwieFwiLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLzIgLSBoZWlnaHQrc3BhY2UgKVxuICAgICAgLmF0dHIoXCJ5XCIsLTUzKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIix1bmRlZmluZWQpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgLnRleHQoXCJiZWZvcmUgYXJyaXZpbmdcIilcblxuXG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCd0b3AnKVxuICAgICAgLnNjYWxlKHhzY2FsZSlcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIGlmICh4ID09IDM2MDApIHJldHVybiBcIjEgaG91clwiXG4gICAgICAgIGlmICh4IDwgMzYwMCkgcmV0dXJuIHgvNjAgKyBcIiBtaW5zXCIgXG5cbiAgICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgICAgaWYgKHggPiA4NjQwMCkgcmV0dXJuIHgvODY0MDAgKyBcIiBkYXlzXCIgXG5cbiAgICAgICAgcmV0dXJuIHgvMzYwMCArIFwiIGhvdXJzXCJcbiAgICAgIH0pXG5cbiAgICB2YXIgeF94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy54LmFmdGVyJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYWZ0ZXJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpK21pZGRsZSkgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywneGF4aXMnKVxuICAgICAgLmNhbGwoeEF4aXMpO1xuICAgIFxuICAgIHhfeGlzLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAgIC5hdHRyKFwieVwiLCAtOClcbiAgICAgIC5hdHRyKFwieFwiLCA4KVxuICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSgtNDUpXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcInN0YXJ0XCIpXG5cbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2tcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHhfeGlzLFwidGV4dC50aXRsZVwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcbiAgICAgIC5hdHRyKFwieFwiLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLzIgIClcbiAgICAgIC5hdHRyKFwieVwiLC01MylcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsdW5kZWZpbmVkKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsIFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAgIC50ZXh0KFwiYWZ0ZXIgbGVhdmluZ1wiKVxuXG5cbiAgICB2YXIgeUF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHlBeGlzXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5zY2FsZSh5c2NhbGUpXG4gICAgICAudGlja1NpemUoMilcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKGQsaSl7IHJldHVybiByb3dzW2ldLmtleTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKHJvd3MubGVuZ3RoKSk7XG5cblxuICAgIFxuICAgIHZhciB5X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnknLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInkgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkrMCkgKyBcIiwxNSlcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3lheGlzJylcblxuXG4gICAgeV94aXNcbiAgICAgIC5jYWxsKHlBeGlzKTtcblxuICAgIHlfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgIC5hdHRyKFwieDJcIiwxOClcbiAgICAgIC5hdHRyKFwieDFcIiwyMilcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIixcIjBcIilcbiAgICAgIC5yZW1vdmUoKVxuXG5cbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJwYXRoXCIpXG4gICAgICAuYXR0cihcIngyXCIsMTgpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDE4LDApXCIpIFxuICAgICAgLy8uc3R5bGUoXCJzdHJva2VcIixcImJsYWNrXCIpXG5cblxuXG4gICAgICAvLy5yZW1vdmUoKVxuXG4gICAgXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGV4dC1hbmNob3I6IG1pZGRsZTsgZm9udC13ZWlnaHQ6Ym9sZDsgZmlsbDogIzMzM1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsbWlkZGxlLzIpXG5cblxuXG5cbiAgfVxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpLCBtaWRkbGUgPSB0aGlzLm1pZGRsZSgpLCBsZWdlbmR0dyA9IHRoaXMuX2xlZ2VuZF93aWR0aFxuICAgICAgLCByb3dzID0gdGhpcy5yb3dzKClcblxuICAgIHZhciBzdmcgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcInN2Z1wiLFwic3ZnXCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCItNXB4XCIpXG4gICAgICAuYXR0cih7J3dpZHRoJzpidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSoyK21pZGRsZSwnaGVpZ2h0Jzpyb3dzLmxlbmd0aCpoZWlnaHQgKyAxNjV9KVxuICAgICAgLmF0dHIoXCJ4bWxuc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpXG5cbiAgICB0aGlzLl9zdmcgPSBzdmdcblxuICAgIHRoaXMuX2NhbnZhcyA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLDE0MClcIilcblxuXG5cbiAgICB0aGlzLmJ1aWxkU2NhbGVzKClcbiAgICB0aGlzLmRyYXdMZWdlbmQoKVxuICAgIHRoaXMuZHJhd0F4ZXMoKVxuXG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1xuICAgICAgLCByc2NhbGUgPSB0aGlzLl9yc2NhbGUsIG9zY2FsZSA9IHRoaXMuX29zY2FsZSBcbiAgICAgICwgeHNjYWxlID0gdGhpcy5feHNjYWxlLCB5c2NhbGUgPSB0aGlzLl95c2NhbGVcbiAgICAgICwgeHNjYWxlcmV2ZXJzZSA9IHRoaXMuX3hzY2FsZXJldmVyc2VcbiAgICAgICwgcm93cyA9IHRoaXMucm93cygpXG5cblxuICAgIHZhciBjaGFydF9iZWZvcmUgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydC1iZWZvcmUnLCdnJyx0aGlzLnJvd3MoKSxmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0LWJlZm9yZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSArIFwiLDApXCIpXG4gICAgICAuYXR0cignaWQnLCdiYXJzJylcblxuXG4gICAgdmFyIHJvd3MgPSBkM19zcGxhdChjaGFydF9iZWZvcmUsXCIucm93XCIsXCJnXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicm93XCIpXG4gICAgICAuYXR0cih7J3RyYW5zZm9ybSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIFwidHJhbnNsYXRlKDAsXCIgKyAoeXNjYWxlKGkpICsgNy41KSArIFwiKVwiOyB9IH0pXG4gICAgICAuYXR0cih7J2xhYmVsJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gZC5rZXk7IH0gfSlcblxuICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYmFycyA9IGQzX3NwbGF0KHJvd3MsXCIucG9wLWJhclwiLFwiY2lyY2xlXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBvcC1iYXJcIilcbiAgICAgIC5hdHRyKCdjeScsKGhlaWdodC0yKS8yKVxuICAgICAgLmF0dHIoeydjeCc6ZnVuY3Rpb24oZCxpKSB7IHJldHVybiAteHNjYWxlKGQua2V5KX19KVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsXCIuOFwiKVxuICAgICAgLmF0dHIoXCJyXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gKGhlaWdodCkvMiAqIHJzY2FsZSh4Lm5vcm1fdGltZSkgfSkgXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gb3NjYWxlKHgucGVyY2VudF9kaWZmKSB9KVxuXG4gICAgdmFyIGNoYXJ0X2FmdGVyID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQtYWZ0ZXInLCdnJyx0aGlzLl9hZnRlcixmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0LWFmdGVyXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSttaWRkbGUpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgcm93cyA9IGQzX3NwbGF0KGNoYXJ0X2FmdGVyLFwiLnJvd1wiLFwiZ1wiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInJvd1wiKVxuICAgICAgLmF0dHIoeyd0cmFuc2Zvcm0nOmZ1bmN0aW9uKGQsaSl7IHJldHVybiBcInRyYW5zbGF0ZSgwLFwiICsgKHlzY2FsZShpKSArIDcuNSkgKyBcIilcIjsgfSB9KVxuICAgICAgLmF0dHIoeydsYWJlbCc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIGQua2V5OyB9IH0pXG5cbiAgICByb3dzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIGJhcnMgPSBkM19zcGxhdChyb3dzLFwiLnBvcC1iYXJcIixcImNpcmNsZVwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWVzIH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgICAuYXR0cignY3knLChoZWlnaHQtMikvMilcbiAgICAgIC5hdHRyKHsnY3gnOmZ1bmN0aW9uKGQsaSkgeyByZXR1cm4geHNjYWxlKGQua2V5KX19KVxuICAgICAgLmF0dHIoXCJyXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gKGhlaWdodC0yKS8yICogcnNjYWxlKHgubm9ybV90aW1lKSB9KVxuICAgICAgLnN0eWxlKFwiZmlsbFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG9zY2FsZSh4LnBlcmNlbnRfZGlmZikgfSlcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLFwiLjhcIilcblxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN0cmVhbV9wbG90KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN0cmVhbVBsb3QodGFyZ2V0KVxufVxuXG5mdW5jdGlvbiBkcmF3QXhpcyh0YXJnZXQsc2NhbGUsdGV4dCx3aWR0aCkge1xuICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICB4QXhpc1xuICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgLnNjYWxlKHNjYWxlKVxuICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgIH0pXG5cbiAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsJ2cueC5iZWZvcmUnLCdnJylcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYmVmb3JlXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwtNSlcIilcbiAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgICAgIFxuICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIC0yNSlcbiAgICAuYXR0cihcInhcIiwgMTUpXG4gICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoNDUpXCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcblxuICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrXCIpXG5cbiAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgZDNfdXBkYXRlYWJsZSh4X3hpcyxcInRleHQudGl0bGVcIixcInRleHRcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgIC5hdHRyKFwieFwiLHdpZHRoLzIpXG4gICAgLmF0dHIoXCJ5XCIsLTQ2KVxuICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsdW5kZWZpbmVkKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAudGV4dCh0ZXh0ICsgXCIgXCIpXG5cbiAgcmV0dXJuIHhfeGlzXG5cbn1cblxuXG5jbGFzcyBTdHJlYW1QbG90IHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICAgIHRoaXMuX2J1Y2tldHMgPSBbMCwxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG5cbiAgICB0aGlzLl93aWR0aCA9IDM3MFxuICAgIHRoaXMuX2hlaWdodCA9IDI1MFxuICAgIHRoaXMuX2NvbG9yID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAucmFuZ2UoXG5bJyM5OTknLCcjYWFhJywnI2JiYicsJyNjY2MnLCcjZGRkJywnI2RlZWJmNycsJyNjNmRiZWYnLCcjOWVjYWUxJywnIzZiYWVkNicsJyM0MjkyYzYnLCcjMjE3MWI1JywncmdiYSgzMywgMTEzLCAxODEsLjkpJywncmdiYSg4LCA4MSwgMTU2LC45MSknLCcjMDg1MTljJywncmdiYSg4LCA0OCwgMTA3LC45KScsJyMwODMwNmInXS5yZXZlcnNlKCkpXG5cbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGhlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cbiAgd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwid2lkdGhcIix2YWwpIH1cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgICAsIG9yZGVyID0gZGF0YS5vcmRlclxuICAgICAgLCBidWNrZXRzID0gdGhpcy5fYnVja2V0c1xuICAgICAgLCBiZWZvcmVfc3RhY2tlZCA9IGRhdGEuYmVmb3JlX3N0YWNrZWRcbiAgICAgICwgYWZ0ZXJfc3RhY2tlZCA9IGRhdGEuYWZ0ZXJfc3RhY2tlZFxuICAgICAgLCBoZWlnaHQgPSB0aGlzLl9oZWlnaHRcbiAgICAgICwgd2lkdGggPSB0aGlzLl93aWR0aFxuICAgICAgLCB0YXJnZXQgPSB0aGlzLl90YXJnZXRcbiAgICAgICwgY29sb3IgPSB0aGlzLl9jb2xvclxuICAgICAgLCBzZWxmID0gdGhpc1xuXG4gICAgY29sb3IuZG9tYWluKG9yZGVyKVxuXG4gICAgdmFyIHkgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLnJhbmdlKFtoZWlnaHQsMF0pXG4gICAgICAuZG9tYWluKFswLGQzLm1heChiZWZvcmVfc3RhY2tlZCwgZnVuY3Rpb24obGF5ZXIpIHsgcmV0dXJuIGQzLm1heChsYXllcixmdW5jdGlvbihkKSB7cmV0dXJuIGQueTAgKyBkLnkgfSl9KV0pXG4gIFxuICAgIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCx3aWR0aCx3aWR0aC8oYnVja2V0cy5sZW5ndGgtMSkpKVxuICBcbiAgICB2YXIgeHJldmVyc2UgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKSlcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLHdpZHRoKzEwLHdpZHRoLyhidWNrZXRzLmxlbmd0aC0xKSkpXG5cbiAgICB0aGlzLl9iZWZvcmVfc2NhbGUgPSB4cmV2ZXJzZVxuICAgIHRoaXMuX2FmdGVyX3NjYWxlID0geFxuICBcbiAgICB2YXIgYmFyZWEgPSBkMy5zdmcuYXJlYSgpXG4gICAgICAuaW50ZXJwb2xhdGUoXCJ6ZXJvXCIpXG4gICAgICAueChmdW5jdGlvbihkKSB7IHJldHVybiB4cmV2ZXJzZShkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICAgIHZhciBhYXJlYSA9IGQzLnN2Zy5hcmVhKClcbiAgICAgIC5pbnRlcnBvbGF0ZShcImxpbmVhclwiKVxuICAgICAgLngoZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICBcbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJzdmdcIixcInN2Z1wiKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCoyKzE4MClcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCArIDEwMCk7XG5cbiAgICB0aGlzLl9zdmcgPSBzdmdcbiAgXG4gICAgdmFyIGJlZm9yZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmJlZm9yZS1jYW52YXNcIixcImdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImJlZm9yZS1jYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsNjApXCIpXG5cbiAgICBmdW5jdGlvbiBob3ZlckNhdGVnb3J5KGNhdCx0aW1lKSB7XG4gICAgICBhcGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsXCIuNVwiKVxuICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLFwiLjVcIilcbiAgICAgIGFwYXRocy5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSBjYXQpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIGJwYXRocy5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSBjYXQpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUobWlkZGxlLFwidGV4dFwiLFwidGV4dFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiLjY1XCIpXG4gICAgICAgIC50ZXh0KGNhdClcblxuICAgICAgdmFyIG13cmFwID0gZDNfdXBkYXRlYWJsZShtaWRkbGUsXCJnXCIsXCJnXCIpXG5cbiAgICAgIHNlbGYub24oXCJjYXRlZ29yeS5ob3ZlclwiKS5iaW5kKG13cmFwLm5vZGUoKSkoY2F0LHRpbWUpXG4gICAgfVxuICBcbiAgICB2YXIgYiA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiZ1wiLFwiZ1wiKVxuXG4gICAgdmFyIGJwYXRocyA9IGQzX3NwbGF0KGIsXCJwYXRoXCIsXCJwYXRoXCIsIGJlZm9yZV9zdGFja2VkLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLmF0dHIoXCJkXCIsIGJhcmVhKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gY29sb3IoeFswXS5rZXkpOyB9KVxuICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZGQgPSBkMy5ldmVudFxuICAgICAgICB2YXIgcG9zID0gcGFyc2VJbnQoZGQub2Zmc2V0WC8od2lkdGgvYnVja2V0cy5sZW5ndGgpKVxuICAgICAgICBcbiAgICAgICAgaG92ZXJDYXRlZ29yeS5iaW5kKHRoaXMpKHhbMF0ua2V5LGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKClbcG9zXSlcbiAgICAgIH0pXG4gICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgYXBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIH0pXG5cbiAgICBicGF0aHMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYnJlY3QgPSBkM19zcGxhdChiLFwicmVjdFwiLFwicmVjdFwiLGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKCksKHgsaSkgPT4gaSlcbiAgICAgIC5hdHRyKFwieFwiLHogPT4geHJldmVyc2UoeikpXG4gICAgICAuYXR0cihcIndpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsaGVpZ2h0KVxuICAgICAgLmF0dHIoXCJ5XCIsMClcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLFwiMFwiKVxuXG5cblxuICAgICAgXG5cbiAgICB2YXIgbWlkZGxlID0gZDNfdXBkYXRlYWJsZShzdmcsXCIubWlkZGxlLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibWlkZGxlLWNhbnZhc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArICh3aWR0aCArIDE4MC8yKSArIFwiLDYwKVwiKVxuICBcbiAgXG4gIFxuICAgIHZhciBhZnRlciA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmFmdGVyLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiYWZ0ZXItY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArICh3aWR0aCArIDE4MCkgKyBcIiw2MClcIilcblxuICAgIHZhciBhID0gZDNfdXBkYXRlYWJsZShhZnRlcixcImdcIixcImdcIilcblxuICBcbiAgICB2YXIgYXBhdGhzID0gZDNfc3BsYXQoYSxcInBhdGhcIixcInBhdGhcIixhZnRlcl9zdGFja2VkLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLmF0dHIoXCJkXCIsIGFhcmVhKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gY29sb3IoeFswXS5rZXkpOyB9KVxuICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICBob3ZlckNhdGVnb3J5LmJpbmQodGhpcykoeFswXS5rZXkpXG4gICAgICB9KVxuICAgICAgLm9uKFwibW91c2VvdXRcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIGFwYXRocy5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICAgIGJwYXRocy5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICB9KVxuXG4gICAgYXBhdGhzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIF94X3hpcyA9IGRyYXdBeGlzKGJlZm9yZSx4cmV2ZXJzZSxcImJlZm9yZSBhcnJpdmluZ1wiLHdpZHRoKVxuXG4gICAgX3hfeGlzLnNlbGVjdEFsbChcInRleHRcIikuZmlsdGVyKGZ1bmN0aW9uKHkpeyByZXR1cm4geSA9PSAwIH0pLnJlbW92ZSgpXG5cbiAgICB2YXIgX3hfeGlzID0gZHJhd0F4aXMoYWZ0ZXIseCxcImFmdGVyIGxlYXZpbmdcIix3aWR0aClcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0Om5vdCgudGl0bGUpXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSgtNDUpXCIpXG4gICAgICAuYXR0cihcInhcIiwyMClcbiAgICAgIC5hdHRyKFwieVwiLC0yNSlcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpLmZpbHRlcihmdW5jdGlvbih5KXsgcmV0dXJuIHkgPT0gMCB9KS5yZW1vdmUoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIG9uKGFjdGlvbixmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgYnV0dG9uX3JhZGlvIGZyb20gJy4uL2dlbmVyaWMvYnV0dG9uX3JhZGlvJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0IHBpZSBmcm9tICcuLi9nZW5lcmljL3BpZSdcbmltcG9ydCBkaWZmX2JhciBmcm9tICcuLi9nZW5lcmljL2RpZmZfYmFyJ1xuaW1wb3J0IGNvbXBfYmFyIGZyb20gJy4uL2dlbmVyaWMvY29tcF9iYXInXG5pbXBvcnQgY29tcF9idWJibGUgZnJvbSAnLi4vZ2VuZXJpYy9jb21wX2J1YmJsZSdcbmltcG9ydCBzdHJlYW1fcGxvdCBmcm9tICcuLi9nZW5lcmljL3N0cmVhbV9wbG90J1xuXG5cblxuXG5pbXBvcnQgKiBhcyB0aW1lc2VyaWVzIGZyb20gJy4uL3RpbWVzZXJpZXMnXG5cblxuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZnVuY3Rpb24gU3VtbWFyeVZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmZ1bmN0aW9uIGJ1aWxkU3RyZWFtRGF0YShkYXRhLGJ1Y2tldHMpIHtcblxuICB2YXIgdW5pdHNfaW5fYnVja2V0ID0gYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7IHJldHVybiB4IC0gKHhbaS0xXXx8IDApIH0pXG5cbiAgdmFyIHN0YWNrYWJsZSA9IGRhdGEubWFwKGZ1bmN0aW9uKGQpIHtcbiAgICB2YXIgdmFsdWVtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy52YWx1ZXM7IHJldHVybiBwIH0se30pXG4gICAgdmFyIHBlcmNtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy5wZXJjZW50OyByZXR1cm4gcCB9LHt9KVxuXG4gICAgdmFyIHZtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy5ub3JtX2NhdDsgcmV0dXJuIHAgfSx7fSlcblxuXG4gICAgdmFyIG5vcm1hbGl6ZWRfdmFsdWVzID0gYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICBpZiAoeCA9PSAwKSByZXR1cm4ge2tleTogZC5rZXksIHg6IHBhcnNlSW50KHgpLCB5OiAodm1hcFtcIjYwMFwiXXx8MCksIHZhbHVlczogKHZhbHVlbWFwW1wiNjAwXCJdfHwwKSwgcGVyY2VudDogKHBlcmNtYXBbXCI2MDBcIl18fDApfVxuICAgICAgcmV0dXJuIHsga2V5OiBkLmtleSwgeDogcGFyc2VJbnQoeCksIHk6ICh2bWFwW3hdIHx8IDApLCB2YWx1ZXM6ICh2YWx1ZW1hcFt4XSB8fCAwKSwgcGVyY2VudDogKHBlcmNtYXBbeF0gfHwgMCkgfVxuICAgIH0pXG5cblxuICAgIHJldHVybiBub3JtYWxpemVkX3ZhbHVlc1xuICAgIC8vcmV0dXJuIGUyLmNvbmNhdChub3JtYWxpemVkX3ZhbHVlcykvLy5jb25jYXQoZXh0cmEpXG4gIH0pXG5cblxuICBzdGFja2FibGUgPSBzdGFja2FibGUuc29ydCgocCxjKSA9PiBwWzBdLnkgLSBjWzBdLnkpLnJldmVyc2UoKS5zbGljZSgwLDEyKVxuXG4gIHJldHVybiBzdGFja2FibGVcblxufVxuXG5mdW5jdGlvbiBzdHJlYW1EYXRhKGJlZm9yZSxhZnRlcixidWNrZXRzKSB7XG4gIHZhciBzdGFja2FibGUgPSBidWlsZFN0cmVhbURhdGEoYmVmb3JlLGJ1Y2tldHMpXG4gIHZhciBzdGFjayA9IGQzLmxheW91dC5zdGFjaygpLm9mZnNldChcIndpZ2dsZVwiKS5vcmRlcihcInJldmVyc2VcIilcbiAgdmFyIGJlZm9yZV9zdGFja2VkID0gc3RhY2soc3RhY2thYmxlKVxuXG4gIHZhciBvcmRlciA9IGJlZm9yZV9zdGFja2VkLm1hcChpdGVtID0+IGl0ZW1bMF0ua2V5KVxuXG4gIHZhciBzdGFja2FibGUgPSBidWlsZFN0cmVhbURhdGEoYWZ0ZXIsYnVja2V0cylcbiAgICAuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIG9yZGVyLmluZGV4T2YoY1swXS5rZXkpIC0gb3JkZXIuaW5kZXhPZihwWzBdLmtleSkgfSlcblxuICBzdGFja2FibGUgPSBzdGFja2FibGUuZmlsdGVyKHggPT4gb3JkZXIuaW5kZXhPZih4WzBdLmtleSkgPT0gLTEpLmNvbmNhdChzdGFja2FibGUuZmlsdGVyKHggPT4gb3JkZXIuaW5kZXhPZih4WzBdLmtleSkgPiAtMSkpXG5cbiAgdmFyIHN0YWNrID0gZDMubGF5b3V0LnN0YWNrKCkub2Zmc2V0KFwid2lnZ2xlXCIpLm9yZGVyKFwiZGVmYXVsdFwiKVxuICB2YXIgYWZ0ZXJfc3RhY2tlZCA9IHN0YWNrKHN0YWNrYWJsZSlcblxuICByZXR1cm4ge1xuICAgICAgb3JkZXI6IG9yZGVyXG4gICAgLCBiZWZvcmVfc3RhY2tlZDogYmVmb3JlX3N0YWNrZWRcbiAgICAsIGFmdGVyX3N0YWNrZWQ6IGFmdGVyX3N0YWNrZWRcbiAgfVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaW1wbGVUaW1lc2VyaWVzKHRhcmdldCxkYXRhLHcsaCkge1xuICB2YXIgd2lkdGggPSB3IHx8IDEyMFxuICAgICwgaGVpZ2h0ID0gaCB8fCAzMFxuXG4gIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpLmRvbWFpbihkMy5yYW5nZSgwLGRhdGEubGVuZ3RoKSkucmFuZ2UoZDMucmFuZ2UoMCx3aWR0aCx3aWR0aC9kYXRhLmxlbmd0aCkpXG4gIHZhciB5ID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoWzQsaGVpZ2h0XSkuZG9tYWluKFtkMy5taW4oZGF0YSksZDMubWF4KGRhdGEpXSlcblxuICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZ1wiLFwiZ1wiLGRhdGEsZnVuY3Rpb24oeCxpKSB7IHJldHVybiAxfSlcblxuICBkM19zcGxhdCh3cmFwLFwicmVjdFwiLFwicmVjdFwiLHggPT4geCwgKHgsaSkgPT4gaSlcbiAgICAuYXR0cihcInhcIiwoeixpKSA9PiB4KGkpKVxuICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgvZGF0YS5sZW5ndGggLTEuMilcbiAgICAuYXR0cihcInlcIiwgeiA9PiBoZWlnaHQgLSB5KHopIClcbiAgICAuYXR0cihcImhlaWdodFwiLCB6ID0+IHogPyB5KHopIDogMClcblxuICByZXR1cm4gd3JhcFxuXG59XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZHJhd1N0cmVhbSh0YXJnZXQsYmVmb3JlLGFmdGVyKSB7XG5cbmZ1bmN0aW9uIGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGFjY2Vzc29yKSB7XG4gIHZhciBidm9sdW1lID0ge30sIGF2b2x1bWUgPSB7fVxuXG4gIHRyeSB7IHZhciBidm9sdW1lID0gYlswXS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy54XSA9IGFjY2Vzc29yKGMpOyByZXR1cm4gcCB9LHt9KSB9IGNhdGNoKGUpIHt9XG4gIHRyeSB7IHZhciBhdm9sdW1lID0gYVswXS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy54XSA9IGFjY2Vzc29yKGMpOyByZXR1cm4gcCB9LHt9KSB9IGNhdGNoKGUpIHt9XG5cbiAgdmFyIHZvbHVtZSA9IGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKCkubWFwKHggPT4gYnZvbHVtZVt4XSB8fCAwKS5jb25jYXQoYnVja2V0cy5tYXAoeCA9PiBhdm9sdW1lW3hdIHx8IDApKVxuXG4gIHJldHVybiB2b2x1bWVcbn1cblxuICB2YXIgYnVja2V0cyA9IFswLDEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcblxuICB2YXIgZGF0YSA9IHN0cmVhbURhdGEoYmVmb3JlLGFmdGVyLGJ1Y2tldHMpXG4gICAgLCBiZWZvcmVfc3RhY2tlZCA9IGRhdGEuYmVmb3JlX3N0YWNrZWRcbiAgICAsIGFmdGVyX3N0YWNrZWQgPSBkYXRhLmFmdGVyX3N0YWNrZWRcblxuICB2YXIgYmVmb3JlID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuYmVmb3JlLXN0cmVhbVwiLFwiZGl2XCIsZGF0YSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgIC5jbGFzc2VkKFwiYmVmb3JlLXN0cmVhbVwiLHRydWUpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIwcHhcIilcblxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcInJnYigyMjcsIDIzNSwgMjQwKVwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJDb25zaWRlcmF0aW9uIGFuZCBSZXNlYXJjaCBQaGFzZSBJZGVudGlmaWNhdGlvblwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG4gIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSlcblxuXG5cbiAgdmFyIHN0cmVhbSA9IHN0cmVhbV9wbG90KGlubmVyKVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLm9uKFwiY2F0ZWdvcnkuaG92ZXJcIixmdW5jdGlvbih4LHRpbWUpIHtcbiAgICAgIGNvbnNvbGUubG9nKHRpbWUpXG4gICAgICB2YXIgYiA9IGRhdGEuYmVmb3JlX3N0YWNrZWQuZmlsdGVyKHkgPT4geVswXS5rZXkgPT0geClcbiAgICAgIHZhciBhID0gZGF0YS5hZnRlcl9zdGFja2VkLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IHgpXG5cbiAgICAgIHZhciB2b2x1bWUgPSBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxmdW5jdGlvbihjKSB7IHJldHVybiBjLnZhbHVlcy5sZW5ndGggfSlcbiAgICAgICAgLCBwZXJjZW50ID0gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsZnVuY3Rpb24oYykgeyByZXR1cm4gYy5wZXJjZW50IH0pXG4gICAgICAgICwgaW1wb3J0YW5jZSA9IGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMueSB9KVxuXG5cbiAgICAgIHZhciB3cmFwID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICwgdndyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudm9sdW1lXCIsXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ2b2x1bWVcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDMwKVwiKVxuICAgICAgICAsIHB3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnBlcmNlbnRcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBlcmNlbnRcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDkwKVwiKVxuICAgICAgICAsIGl3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmltcG9ydGFuY2VcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcImltcG9ydGFuY2VcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDE1MClcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHZ3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiVmlzaXRzXCIpXG4gICAgICAgIC5hdHRyKFwic3R5bGVcIixcInRpdGxlXCIpXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKHZ3cmFwLHZvbHVtZSlcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgwLDIpXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShwd3JhcCxcInRleHRcIixcInRleHRcIikudGV4dChcIlNoYXJlIG9mIHRpbWVcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcblxuICAgICAgc2ltcGxlVGltZXNlcmllcyhwd3JhcCxwZXJjZW50KVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDAsMilcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGl3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiSW1wb3J0YW5jZVwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKGl3cmFwLGltcG9ydGFuY2UpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMCwyKVwiKVxuXG5cbiAgICAgIHJldHVyblxuICAgIH0pXG4gICAgLmRyYXcoKVxuXG4gIHZhciBiZWZvcmVfYWdnID0gYmVmb3JlX3N0YWNrZWQucmVkdWNlKChvLHgpID0+IHsgcmV0dXJuIHgucmVkdWNlKChwLGMpID0+IHsgcFtjLnhdID0gKHBbYy54XSB8fCAwKSArIGMueTsgcmV0dXJuIHB9LG8pIH0se30pXG4gICAgLCBhZnRlcl9hZ2cgPSBhZnRlcl9zdGFja2VkLnJlZHVjZSgobyx4KSA9PiB7IHJldHVybiB4LnJlZHVjZSgocCxjKSA9PiB7IHBbYy54XSA9IChwW2MueF0gfHwgMCkgKyBjLnk7IHJldHVybiBwfSxvKSB9LHt9KVxuXG5cbiAgdmFyIGxvY2FsX2JlZm9yZSA9IE9iamVjdC5rZXlzKGJlZm9yZV9hZ2cpLnJlZHVjZSgobWluYXJyLGMpID0+IHtcbiAgICAgIGlmIChtaW5hcnJbMF0gPj0gYmVmb3JlX2FnZ1tjXSkgcmV0dXJuIFtiZWZvcmVfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG4gIHZhciBsb2NhbF9hZnRlciA9IE9iamVjdC5rZXlzKGFmdGVyX2FnZykucmVkdWNlKChtaW5hcnIsYykgPT4ge1xuICAgICAgaWYgKG1pbmFyclswXSA+PSBhZnRlcl9hZ2dbY10pIHJldHVybiBbYWZ0ZXJfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG5cbiAgdmFyIGJlZm9yZV9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYmVmb3JlKSldXG4gICAgLCBhZnRlcl9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYWZ0ZXIpKV1cblxuICB2YXIgc3ZnID0gc3RyZWFtXG4gICAgLl9zdmcuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIikuc3R5bGUoXCJkaXNwbGF5XCIsXCJibG9ja1wiKVxuXG5cbiAgdmFyIGJsaW5lID0gZDNfdXBkYXRlYWJsZShzdmcuc2VsZWN0QWxsKFwiLmJlZm9yZS1jYW52YXNcIiksXCJnLmxpbmUtd3JhcFwiLFwiZ1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImxpbmUtd3JhcFwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmxpbmUsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAuYXR0cihcInkxXCIsIDApXG4gICAgLmF0dHIoXCJ5MlwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcIngxXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcbiAgICAuYXR0cihcIngyXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGJsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpICsgMTApXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcInN0YXJ0XCIpXG4gICAgLnRleHQoXCJDb25zaWRlcmF0aW9uIFN0YWdlXCIpXG5cblxuICB2YXIgYWxpbmUgPSBkM191cGRhdGVhYmxlKHN2Zy5zZWxlY3RBbGwoXCIuYWZ0ZXItY2FudmFzXCIpLFwiZy5saW5lLXdyYXBcIixcImdcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJsaW5lLXdyYXBcIilcblxuICBkM191cGRhdGVhYmxlKGFsaW5lLFwibGluZVwiLFwibGluZVwiKVxuICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgIC5hdHRyKFwieTJcIiwgc3RyZWFtLl9oZWlnaHQrMjApXG4gICAgLmF0dHIoXCJ4MVwiLCBzdHJlYW0uX2FmdGVyX3NjYWxlKGFmdGVyX2xpbmUpKVxuICAgIC5hdHRyKFwieDJcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGFsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSAtIDEwKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAudGV4dChcIlZhbGlkYXRpb24gLyBSZXNlYXJjaFwiKVxuXG5cblxuICByZXR1cm4ge1xuICAgIFwiY29uc2lkZXJhdGlvblwiOiBcIlwiICsgYmVmb3JlX2xpbmUsXG4gICAgXCJ2YWxpZGF0aW9uXCI6IFwiLVwiICsgYWZ0ZXJfbGluZVxuICB9XG59XG5cblxuXG5mdW5jdGlvbiBidWlsZFN1bW1hcnlCbG9jayhkYXRhLCB0YXJnZXQsIHJhZGl1c19zY2FsZSwgeCkge1xuICB2YXIgZGF0YSA9IGRhdGFcbiAgICAsIGR0aGlzID0gZDMuc2VsZWN0KHRhcmdldClcblxuICBwaWUoZHRoaXMpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAucmFkaXVzKHJhZGl1c19zY2FsZShkYXRhLnBvcHVsYXRpb24pKVxuICAgIC5kcmF3KClcblxuICB2YXIgZncgPSBkM191cGRhdGVhYmxlKGR0aGlzLFwiLmZ3XCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAuY2xhc3NlZChcImZ3XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTBweFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiM3B4XCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE2cHhcIilcblxuICB2YXIgZncyID0gZDNfdXBkYXRlYWJsZShkdGhpcyxcIi5mdzJcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgIC5jbGFzc2VkKFwiZncyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNjBweFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiM3B4XCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIyMnB4XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiNDBweFwiKVxuICAgIC50ZXh0KGQzLmZvcm1hdChcIiVcIikoZGF0YS5zYW1wbGUvZGF0YS5wb3B1bGF0aW9uKSlcblxuXG5cbiAgZDNfdXBkYXRlYWJsZShmdyxcIi5zYW1wbGVcIixcInNwYW5cIikudGV4dChkMy5mb3JtYXQoXCIsXCIpKGRhdGEuc2FtcGxlKSlcbiAgICAuY2xhc3NlZChcInNhbXBsZVwiLHRydWUpXG4gIGQzX3VwZGF0ZWFibGUoZncsXCIudnNcIixcInNwYW5cIikuaHRtbChcIjxicj4gb3V0IG9mIDxicj5cIikuc3R5bGUoXCJmb250LXNpemVcIixcIi44OGVtXCIpXG4gICAgLmNsYXNzZWQoXCJ2c1wiLHRydWUpXG4gIGQzX3VwZGF0ZWFibGUoZncsXCIucG9wdWxhdGlvblwiLFwic3BhblwiKS50ZXh0KGQzLmZvcm1hdChcIixcIikoZGF0YS5wb3B1bGF0aW9uKSlcbiAgICAuY2xhc3NlZChcInBvcHVsYXRpb25cIix0cnVlKVxuXG59XG5cbmZ1bmN0aW9uIGRyYXdCZWZvcmVBbmRBZnRlcih0YXJnZXQsZGF0YSkge1xuXG4gIHZhciBiZWZvcmUgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5iZWZvcmVcIixcImRpdlwiLGRhdGEsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAuY2xhc3NlZChcImJlZm9yZVwiLHRydWUpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIwcHhcIilcblxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcInJnYigyMjcsIDIzNSwgMjQwKVwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJDYXRlZ29yeSBhY3Rpdml0eSBiZWZvcmUgYXJyaXZpbmcgYW5kIGFmdGVyIGxlYXZpbmcgc2l0ZVwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG4gIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcblxuICBkM191cGRhdGVhYmxlKGlubmVyLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJTb3J0IEJ5XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjJweFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNDBweFwiKVxuXG5cblxuICBpbm5lci5zZWxlY3RBbGwoXCJzZWxlY3RcIilcbiAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjE0MHB4XCIpXG5cblxuICB2YXIgY2IgPSBjb21wX2J1YmJsZShiZWZvcmUpXG4gICAgLnJvd3MoZGF0YS5iZWZvcmVfY2F0ZWdvcmllcylcbiAgICAuYWZ0ZXIoZGF0YS5hZnRlcl9jYXRlZ29yaWVzKVxuICAgIC5kcmF3KClcblxuICBjYi5fc3ZnLnN0eWxlKFwiZGlzcGxheVwiLFwiYmxvY2tcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiYXV0b1wiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiYXV0b1wiKVxuXG5cbiAgcmV0dXJuIGlubmVyXG5cbn1cblxuZnVuY3Rpb24gZHJhd0NhdGVnb3J5RGlmZih0YXJnZXQsZGF0YSkge1xuXG4gIGRpZmZfYmFyKHRhcmdldClcbiAgICAuZGF0YShkYXRhKVxuICAgIC50aXRsZShcIkNhdGVnb3J5IGluZGV4aW5nIHZlcnN1cyBjb21wXCIpXG4gICAgLnZhbHVlX2FjY2Vzc29yKFwibm9ybWFsaXplZF9kaWZmXCIpXG4gICAgLmRyYXcoKVxuXG59XG5cbmZ1bmN0aW9uIGRyYXdDYXRlZ29yeSh0YXJnZXQsZGF0YSkge1xuXG4gIGNvbXBfYmFyKHRhcmdldClcbiAgICAuZGF0YShkYXRhKVxuICAgIC50aXRsZShcIkNhdGVnb3JpZXMgdmlzaXRlZCBmb3IgZmlsdGVyZWQgdmVyc3VzIGFsbCB2aWV3c1wiKVxuICAgIC5wb3BfdmFsdWVfYWNjZXNzb3IoXCJwb3BcIilcbiAgICAuc2FtcF92YWx1ZV9hY2Nlc3NvcihcInNhbXBcIilcbiAgICAuZHJhdygpXG5cbn1cblxuZnVuY3Rpb24gZHJhd0tleXdvcmRzKHRhcmdldCxkYXRhKSB7XG5cbiAgY29tcF9iYXIodGFyZ2V0KVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLnRpdGxlKFwiS2V5d29yZHMgdmlzaXRlZCBmb3IgZmlsdGVyZWQgdmVyc3VzIGFsbCB2aWV3c1wiKVxuICAgIC5wb3BfdmFsdWVfYWNjZXNzb3IoXCJwb3BcIilcbiAgICAuc2FtcF92YWx1ZV9hY2Nlc3NvcihcInNhbXBcIilcbiAgICAuZHJhdygpXG5cblxufVxuXG5mdW5jdGlvbiBkcmF3S2V5d29yZERpZmYodGFyZ2V0LGRhdGEpIHtcblxuICBkaWZmX2Jhcih0YXJnZXQpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAudGl0bGUoXCJLZXl3b3JkIGluZGV4aW5nIHZlcnN1cyBjb21wXCIpXG4gICAgLnZhbHVlX2FjY2Vzc29yKFwibm9ybWFsaXplZF9kaWZmXCIpXG4gICAgLmRyYXcoKVxuXG59XG5cbmZ1bmN0aW9uIGRyYXdUaW1lc2VyaWVzKHRhcmdldCxkYXRhLHJhZGl1c19zY2FsZSkge1xuICB2YXIgdyA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZGl2LnRpbWVzZXJpZXNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidGltZXNlcmllc1wiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjYwJVwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsIFwiMTBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTI3cHhcIilcblxuXG5cbiAgdmFyIHEgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdi50aW1lc2VyaWVzLWRldGFpbHNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidGltZXNlcmllcy1kZXRhaWxzXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDAlXCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjE1cHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjU3cHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTI3cHhcIilcblxuXG5cblxuXG4gIHZhciBwb3AgPSBkM191cGRhdGVhYmxlKHEsXCIucG9wXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInBvcFwiLHRydWUpXG5cbiAgZDNfdXBkYXRlYWJsZShwb3AsXCIuZXhcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcImV4XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcImdyZXlcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG4gIGQzX3VwZGF0ZWFibGUocG9wLFwiLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiM3B4XCIpXG4gICAgLnRleHQoXCJhbGxcIilcblxuXG5cbiAgdmFyIHNhbXAgPSBkM191cGRhdGVhYmxlKHEsXCIuc2FtcFwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJzYW1wXCIsdHJ1ZSlcblxuICBkM191cGRhdGVhYmxlKHNhbXAsXCIuZXhcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcImV4XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiMwODFkNThcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG5cbiAgZDNfdXBkYXRlYWJsZShzYW1wLFwiLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiM3B4XCIpXG4gICAgLnRleHQoXCJmaWx0ZXJlZFwiKVxuXG5cbiAgdmFyIGRldGFpbHMgPSBkM191cGRhdGVhYmxlKHEsXCIuZGVldHNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwiZGVldHNcIix0cnVlKVxuXG5cblxuXG4gIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiRmlsdGVyZWQgdmVyc3VzIEFsbCBWaWV3c1wiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG5cblxuXG5cblxuICB0aW1lc2VyaWVzWydkZWZhdWx0J10odylcbiAgICAuZGF0YSh7XCJrZXlcIjpcInlcIixcInZhbHVlc1wiOmRhdGF9KVxuICAgIC5oZWlnaHQoODApXG4gICAgLm9uKFwiaG92ZXJcIixmdW5jdGlvbih4KSB7XG4gICAgICB2YXIgeHggPSB7fVxuICAgICAgeHhbeC5rZXldID0ge3NhbXBsZTogeC52YWx1ZSwgcG9wdWxhdGlvbjogeC52YWx1ZTIgfVxuICAgICAgZGV0YWlscy5kYXR1bSh4eClcblxuICAgICAgZDNfdXBkYXRlYWJsZShkZXRhaWxzLFwiLnRleHRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInRleHRcIix0cnVlKVxuICAgICAgICAudGV4dChcIkAgXCIgKyB4LmhvdXIgKyBcIjpcIiArICh4Lm1pbnV0ZS5sZW5ndGggPiAxID8geC5taW51dGUgOiBcIjBcIiArIHgubWludXRlKSApXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiNDlweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcblxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShkZXRhaWxzLFwiLnBpZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicGllXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxNXB4XCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IE9iamVjdC5rZXlzKHgpLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiB4W2tdIH0pWzBdXG4gICAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgICB9KVxuICAgIH0pXG4gICAgLmRyYXcoKVxuXG59XG5cblxuXG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3VtbWFyeV92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN1bW1hcnlWaWV3KHRhcmdldClcbn1cblxuU3VtbWFyeVZpZXcucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKVxuICAgIH1cbiAgLCB0aW1pbmc6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aW1pbmdcIix2YWwpXG4gICAgfVxuICAsIGNhdGVnb3J5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY2F0ZWdvcnlcIix2YWwpXG4gICAgfVxuICAsIGtleXdvcmRzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5d29yZHNcIix2YWwpXG4gICAgfVxuICAsIGJlZm9yZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJlZm9yZVwiLHZhbClcbiAgICB9XG4gICwgYWZ0ZXI6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhZnRlclwiLHZhbClcbiAgICB9XG5cblxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG5cbiAgdmFyIENTU19TVFJJTkcgPSBTdHJpbmcoZnVuY3Rpb24oKSB7Lypcbi5zdW1tYXJ5LXdyYXAgLnRhYmxlLXdyYXBwZXIgeyBiYWNrZ3JvdW5kOiNlM2ViZjA7IHBhZGRpbmctdG9wOjVweDsgcGFkZGluZy1ib3R0b206MTBweCB9XG4uc3VtbWFyeS13cmFwIC50YWJsZS13cmFwcGVyIHRyIHsgYm9yZGVyLWJvdHRvbTpub25lIH1cbi5zdW1tYXJ5LXdyYXAgLnRhYmxlLXdyYXBwZXIgdGhlYWQgdHIgeyBiYWNrZ3JvdW5kOm5vbmUgfVxuLnN1bW1hcnktd3JhcCAudGFibGUtd3JhcHBlciB0Ym9keSB0cjpob3ZlciB7IGJhY2tncm91bmQ6bm9uZSB9XG4uc3VtbWFyeS13cmFwIC50YWJsZS13cmFwcGVyIHRyIHRkIHsgYm9yZGVyLXJpZ2h0OjFweCBkb3R0ZWQgI2NjYzt0ZXh0LWFsaWduOmNlbnRlciB9XG4uc3VtbWFyeS13cmFwIC50YWJsZS13cmFwcGVyIHRyIHRkOmxhc3Qtb2YtdHlwZSB7IGJvcmRlci1yaWdodDpub25lIH1cbiAgKi99KVxuXG4gIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI2N1c3RvbS10YWJsZS1jc3NcIixcInN0eWxlXCIpXG4gICAgLmF0dHIoXCJpZFwiLFwiY3VzdG9tLXRhYmxlLWNzc1wiKVxuICAgIC50ZXh0KENTU19TVFJJTkcucmVwbGFjZShcImZ1bmN0aW9uICgpIHsvKlwiLFwiXCIpLnJlcGxhY2UoXCIqL31cIixcIlwiKSlcblxuXG5cblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLnN1bW1hcnktd3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwic3VtbWFyeS13cmFwXCIsdHJ1ZSlcblxuICAgICAgaGVhZGVyKHdyYXApXG4gICAgICAgIC50ZXh0KFwiU3VtbWFyeVwiKVxuICAgICAgICAuZHJhdygpXG5cblxuICAgICAgdmFyIHRzd3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi50cy1yb3dcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInRzLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgIHZhciBwaWV3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnBpZS1yb3dcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInBpZS1yb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgICB2YXIgY2F0d3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5jYXQtcm93XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjYXQtcm93IGRhc2gtcm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgdmFyIGtleXdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIua2V5LXJvd1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwia2V5LXJvdyBkYXNoLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgIHZhciBiYXdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuYmEtcm93XCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImJhLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgIHZhciBzdHJlYW13cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnN0cmVhbS1iYS1yb3dcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwic3RyZWFtLWJhLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cblxuXG5cblxuXG5cblxuICAgICAgdmFyIHJhZGl1c19zY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgIC5kb21haW4oW3RoaXMuX2RhdGEuZG9tYWlucy5wb3B1bGF0aW9uLHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbl0pXG4gICAgICAgIC5yYW5nZShbMjAsMzVdKVxuXG5cblxuICAgICAgdGFibGUocGlld3JhcClcbiAgICAgICAgLmRhdGEoe1wia2V5XCI6XCJUXCIsXCJ2YWx1ZXNcIjpbdGhpcy5kYXRhKCldfSlcbiAgICAgICAgLnNraXBfb3B0aW9uKHRydWUpXG4gICAgICAgIC5yZW5kZXIoXCJkb21haW5zXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkYXRhID0gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuZGF0dW0oKVt4LmtleV07XG4gICAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgICB9KVxuICAgICAgICAucmVuZGVyKFwiYXJ0aWNsZXNcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLnJlbmRlcihcInNlc3Npb25zXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkYXRhID0gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuZGF0dW0oKVt4LmtleV07XG4gICAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgICB9KVxuICAgICAgICAucmVuZGVyKFwidmlld3NcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICAgIH0pXG4gICAgICAgIC5kcmF3KClcblxuXG4gICAgICBkcmF3VGltZXNlcmllcyh0c3dyYXAsdGhpcy5fdGltaW5nLHJhZGl1c19zY2FsZSlcblxuXG4gICAgICB0cnkge1xuICAgICAgZHJhd0NhdGVnb3J5KGNhdHdyYXAsdGhpcy5fY2F0ZWdvcnkpXG4gICAgICBkcmF3Q2F0ZWdvcnlEaWZmKGNhdHdyYXAsdGhpcy5fY2F0ZWdvcnkpXG4gICAgICB9IGNhdGNoKGUpIHt9XG5cbiAgICAgIC8vZHJhd0tleXdvcmRzKGtleXdyYXAsdGhpcy5fa2V5d29yZHMpXG4gICAgICAvL2RyYXdLZXl3b3JkRGlmZihrZXl3cmFwLHRoaXMuX2tleXdvcmRzKVxuXG4gICAgICB2YXIgaW5uZXIgPSBkcmF3QmVmb3JlQW5kQWZ0ZXIoYmF3cmFwLHRoaXMuX2JlZm9yZSlcblxuICAgICAgc2VsZWN0KGlubmVyKVxuICAgICAgICAub3B0aW9ucyhbXG4gICAgICAgICAgICB7XCJrZXlcIjpcIkltcG9ydGFuY2VcIixcInZhbHVlXCI6XCJwZXJjZW50X2RpZmZcIn1cbiAgICAgICAgICAsIHtcImtleVwiOlwiQWN0aXZpdHlcIixcInZhbHVlXCI6XCJzY29yZVwifVxuICAgICAgICAgICwge1wia2V5XCI6XCJQb3B1bGF0aW9uXCIsXCJ2YWx1ZVwiOlwicG9wXCJ9XG4gICAgICAgIF0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9iZWZvcmUuc29ydGJ5IHx8IFwiXCIpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCB0aGlzLm9uKFwiYmEuc29ydFwiKSlcbiAgICAgICAgLmRyYXcoKVxuXG5cbiAgICAgIGRyYXdTdHJlYW0oc3RyZWFtd3JhcCx0aGlzLl9iZWZvcmUuYmVmb3JlX2NhdGVnb3JpZXMsdGhpcy5fYmVmb3JlLmFmdGVyX2NhdGVnb3JpZXMpXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCB0aW1lX3NlcmllcyBmcm9tICcuLi90aW1lc2VyaWVzJ1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICcuL3N1bW1hcnlfdmlldydcblxuXG5mdW5jdGlvbiBkM19jbGFzcyh0YXJnZXQsY2xzLHR5cGUsZGF0YSkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuXCIgKyBjbHMsIHR5cGUgfHwgXCJkaXZcIixkYXRhKVxuICAgIC5jbGFzc2VkKGNscyx0cnVlKVxufVxuXG5mdW5jdGlvbiBub29wKCkge31cblxuXG5leHBvcnQgZnVuY3Rpb24gRG9tYWluRXhwYW5kZWQodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbmZ1bmN0aW9uIGRvbWFpbl9leHBhbmRlZCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEb21haW5FeHBhbmRlZCh0YXJnZXQpXG59XG5cbnZhciBhbGxidWNrZXRzID0gW11cbnZhciBob3VyYnVja2V0cyA9IGQzLnJhbmdlKDAsMjQpLm1hcCh4ID0+IFN0cmluZyh4KS5sZW5ndGggPiAxID8gU3RyaW5nKHgpIDogXCIwXCIgKyB4KVxuXG52YXIgaG91cnMgPSBbMCwyMCw0MF1cbnZhciBidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkucmVkdWNlKChwLGMpID0+IHtcbiAgaG91cnMubWFwKHggPT4ge1xuICAgIHBbYyArIFwiOlwiICsgeF0gPSAwXG4gIH0pXG4gIGFsbGJ1Y2tldHMgPSBhbGxidWNrZXRzLmNvbmNhdChob3Vycy5tYXAoeiA9PiBjICsgXCI6XCIgKyB6KSlcbiAgcmV0dXJuIHBcbn0se30pXG5cbkRvbWFpbkV4cGFuZGVkLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbClcbiAgICB9XG4gICwgcmF3OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmF3XCIsdmFsKVxuICAgIH1cbiAgLCB1cmxzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidXJsc1wiLHZhbClcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuX3Jhd1xuICAgICAgdmFyIGQgPSB7IGRvbWFpbjogZGF0YVswXS5kb21haW4gfVxuXG4gICAgICAvL3ZhciBhcnRpY2xlcyA9IGRhdGEucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIC8vICBwW2MudXJsXSA9IHBbYy51cmxdIHx8IE9iamVjdC5hc3NpZ24oe30sYnVja2V0cylcbiAgICAgIC8vICBwW2MudXJsXVtjLmhvdXIgKyBcIjpcIiArIGMubWludXRlXSA9IGMuY291bnRcbiAgICAgIC8vICByZXR1cm4gcFxuICAgICAgLy99LHt9KVxuXG4gICAgICAvL09iamVjdC5rZXlzKGFydGljbGVzKS5tYXAoayA9PiB7XG4gICAgICAvLyAgYXJ0aWNsZXNba10gPSBhbGxidWNrZXRzLm1hcChiID0+IGFydGljbGVzW2tdW2JdKVxuICAgICAgLy99KVxuXG4gICAgICB2YXIgYXJ0aWNsZXMgPSBkYXRhLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgIHBbYy51cmxdID0gcFtjLnVybF0gfHwgT2JqZWN0LmFzc2lnbih7fSxidWNrZXRzKVxuICAgICAgICBwW2MudXJsXVtjLmhvdXJdID0gKHBbYy51cmxdW2MuaG91cl0gfHwgMCkgKyBjLmNvdW50XG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG5cbiAgICAgIE9iamVjdC5rZXlzKGFydGljbGVzKS5tYXAoayA9PiB7XG4gICAgICAgIGFydGljbGVzW2tdID0gaG91cmJ1Y2tldHMubWFwKGIgPT4gYXJ0aWNsZXNba11bYl0gfHwgMClcbiAgICAgIH0pXG5cbiAgICAgIHZhciB0b19kcmF3ID0gZDMuZW50cmllcyhhcnRpY2xlcylcbiAgICAgICAgLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICB4LmRvbWFpbiA9IGQuZG9tYWluXG4gICAgICAgICAgeC51cmwgPSB4LmtleVxuICAgICAgICAgIHgudG90YWwgPSBkMy5zdW0oeC52YWx1ZSlcbiAgICAgICAgICByZXR1cm4geFxuICAgICAgICB9KVxuXG4gICAgICB2YXIga3dfdG9fZHJhdyA9IHRvX2RyYXdcbiAgICAgICAgLnJlZHVjZShmdW5jdGlvbihwLGMpe1xuICAgICAgICAgIGMua2V5LnRvTG93ZXJDYXNlKCkuc3BsaXQoZC5kb21haW4pWzFdLnNwbGl0KFwiL1wiKS5yZXZlcnNlKClbMF0ucmVwbGFjZShcIl9cIixcIi1cIikuc3BsaXQoXCItXCIpLm1hcCh4ID0+IHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBbXCJ0aGF0XCIsXCJ0aGlzXCIsXCJ3aGF0XCIsXCJiZXN0XCIsXCJtb3N0XCIsXCJmcm9tXCIsXCJ5b3VyXCIsXCJoYXZlXCIsXCJmaXJzdFwiLFwid2lsbFwiLFwidGhhblwiLFwic2F5c1wiLFwibGlrZVwiLFwiaW50b1wiLFwiYWZ0ZXJcIixcIndpdGhcIl1cbiAgICAgICAgICAgIGlmICh4Lm1hdGNoKC9cXGQrL2cpID09IG51bGwgJiYgdmFsdWVzLmluZGV4T2YoeCkgPT0gLTEgJiYgeC5pbmRleE9mKFwiLFwiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCI/XCIpID09IC0xICYmIHguaW5kZXhPZihcIi5cIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiOlwiKSA9PSAtMSAmJiBwYXJzZUludCh4KSAhPSB4ICYmIHgubGVuZ3RoID4gMykge1xuICAgICAgICAgICAgICBwW3hdID0gcFt4XSB8fCB7fVxuICAgICAgICAgICAgICBPYmplY3Qua2V5cyhjLnZhbHVlKS5tYXAocSA9PiB7XG4gICAgICAgICAgICAgICAgcFt4XVtxXSA9IChwW3hdW3FdIHx8IDApICsgKGMudmFsdWVbcV0gfHwgMClcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgfSx7fSlcblxuICAgICAga3dfdG9fZHJhdyA9IGQzLmVudHJpZXMoa3dfdG9fZHJhdylcbiAgICAgICAgLm1hcCh4ID0+IHtcbiAgICAgICAgICB4LnZhbHVlcyA9IE9iamVjdC5rZXlzKHgudmFsdWUpLm1hcCh6ID0+IHgudmFsdWVbel0gfHwgMClcbiAgICAgICAgICB4LnRvdGFsID0gZDMuc3VtKHgudmFsdWVzKVxuICAgICAgICAgIHJldHVybiB4XG4gICAgICAgIH0pXG5cblxuXG4gICAgICB2YXIgdGQgPSB0aGlzLnRhcmdldFxuXG4gICAgICBkM19jbGFzcyh0ZCxcImFjdGlvbi1oZWFkZXJcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTZweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiRXhwbG9yZSBhbmQgUmVmaW5lXCIpXG5cbiAgICAgIHZhciB0aXRsZV9yb3cgPSBkM19jbGFzcyh0ZCxcInRpdGxlLXJvd1wiKVxuICAgICAgdmFyIGV4cGFuc2lvbl9yb3cgPSBkM19jbGFzcyh0ZCxcImV4cGFuc2lvbi1yb3dcIilcblxuXG5cbiAgICAgIHZhciBldWggPSBkM19jbGFzcyh0aXRsZV9yb3csXCJleHBhbnNpb24tdXJscy10aXRsZVwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICBkM19jbGFzcyhldWgsXCJ0aXRsZVwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjY1cHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnRleHQoXCJVUkxcIilcblxuICAgICAgZDNfY2xhc3MoZXVoLFwidmlld1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgICAgICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhldWgsXCJsZWdlbmRcIixcInN2Z1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0NHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0Lm9uZVwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsXCIwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwic3RhcnRcIilcbiAgICAgICAgICAgIC50ZXh0KFwiMTIgYW1cIilcblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcInRleHQudHdvXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjcyXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIjEyIHBtXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0LnRocmVlXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjE0NFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsXCIyMFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgICAgICAgLnRleHQoXCIxMiBhbVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS5vbmVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm9uZVwiLHRydWUpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDI1KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgMzUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCAwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgMClcblxuZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS50d29cIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAuY2xhc3NlZChcInR3b1wiLHRydWUpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDI1KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgMzUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCA3MilcbiAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIDcyKVxuXG5cbmQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmUudGhyZWVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAuY2xhc3NlZChcInRocmVlXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMjUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNSlcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDE0NClcbiAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIDE0NClcblxuXG5cbiAgICAgIHZhciBla2ggPSBkM19jbGFzcyh0aXRsZV9yb3csXCJleHBhbnNpb24ta3dzLXRpdGxlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgIGQzX2NsYXNzKGVraCxcInRpdGxlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoXCJLZXl3b3Jkc1wiKVxuXG4gICAgICBkM19jbGFzcyhla2gsXCJ2aWV3XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgICAgIHZhciBzdmdfbGVnZW5kID0gZDNfY2xhc3MoZWtoLFwibGVnZW5kXCIsXCJzdmdcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNDRweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cblxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwidGV4dC5vbmVcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLFwiMFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsXCIyMFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcInN0YXJ0XCIpXG4gICAgICAgICAgICAudGV4dChcIjEyIGFtXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0LnR3b1wiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsXCI3MlwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsXCIyMFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcIm1pZGRsZVwiKVxuICAgICAgICAgICAgLnRleHQoXCIxMiBwbVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwidGV4dC50aHJlZVwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsXCIxNDRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgICAgICAgIC50ZXh0KFwiMTIgYW1cIilcblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmUub25lXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJvbmVcIix0cnVlKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCAyNSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIDM1KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgMClcbiAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIDApXG5cbiAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmUudHdvXCIsXCJsaW5lXCIpXG4gICAgICAgICAgIC5jbGFzc2VkKFwidHdvXCIsdHJ1ZSlcbiAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAuYXR0cihcInkxXCIsIDI1KVxuICAgICAgICAgICAuYXR0cihcInkyXCIsIDM1KVxuICAgICAgICAgICAuYXR0cihcIngxXCIsIDcyKVxuICAgICAgICAgICAuYXR0cihcIngyXCIsIDcyKVxuXG5cbiAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmUudGhyZWVcIixcImxpbmVcIilcbiAgICAgICAgICAgLmNsYXNzZWQoXCJ0aHJlZVwiLHRydWUpXG4gICAgICAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCAyNSlcbiAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNSlcbiAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCAxNDQpXG4gICAgICAgICAgIC5hdHRyKFwieDJcIiwgMTQ0KVxuXG5cblxuXG5cblxuICAgICAgdmFyIGV4cGFuc2lvbiA9IGQzX2NsYXNzKGV4cGFuc2lvbl9yb3csXCJleHBhbnNpb24tdXJsc1wiKVxuICAgICAgICAuY2xhc3NlZChcInNjcm9sbGJveFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG4gICAgICAgIC5zdHlsZShcIm1heC1oZWlnaHRcIixcIjI1MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm92ZXJmbG93XCIsXCJzY3JvbGxcIilcblxuICAgICAgZXhwYW5zaW9uLmh0bWwoXCJcIilcblxuICAgICAgdmFyIHVybF9yb3cgPSBkM19zcGxhdChleHBhbnNpb24sXCIudXJsLXJvd1wiLFwiZGl2XCIsdG9fZHJhdy5zbGljZSgwLDUwMCksZnVuY3Rpb24oeCkgeyByZXR1cm4geC51cmwgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ1cmwtcm93XCIsdHJ1ZSlcblxuICAgICAgdmFyIHVybF9uYW1lID0gZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm5hbWVcIixcImRpdlwiKS5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwiaGlkZGVuXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKHVybF9uYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAuYXR0cihcInR5cGVcIixcImNoZWNrYm94XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgIH0pXG5cbiAgICAgIGQzX2NsYXNzKHVybF9uYW1lLFwidXJsXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LW92ZXJmbG93XCIsXCJlbGxpcHNpc1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjA1cHhcIilcbiAgICAgICAgLnRleHQoeCA9PiB7XG4gICAgICAgICAgcmV0dXJuIHgudXJsLnNwbGl0KGQuZG9tYWluKVsxXSB8fCB4LnVybFxuICAgICAgICB9KVxuICAgICAgICAuYXR0cihcImhyZWZcIiwgeCA9PiB4LnVybCApXG4gICAgICAgIC5hdHRyKFwidGFyZ2V0XCIsIFwiX2JsYW5rXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5udW1iZXJcIixcImRpdlwiKS5jbGFzc2VkKFwibnVtYmVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTNweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG90YWwgfSlcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIucGxvdFwiLFwic3ZnXCIpLmNsYXNzZWQoXCJwbG90XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0NHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAgIHZhciB2YWx1ZXMgPSB4LnZhbHVlXG4gICAgICAgICAgc2ltcGxlVGltZXNlcmllcyhkdGhpcyx2YWx1ZXMsMTQ0LDIwKVxuXG4gICAgICAgIH0pXG5cblxuICAgICAgdmFyIGV4cGFuc2lvbiA9IGQzX2NsYXNzKGV4cGFuc2lvbl9yb3csXCJleHBhbnNpb24ta3dzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwic2Nyb2xsYm94XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cbiAgICAgICAgLnN0eWxlKFwibWF4LWhlaWdodFwiLFwiMjUwcHhcIilcbiAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcInNjcm9sbFwiKVxuXG4gICAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG5cbiAgICAgIHZhciB1cmxfcm93ID0gZDNfc3BsYXQoZXhwYW5zaW9uLFwiLnVybC1yb3dcIixcImRpdlwiLGt3X3RvX2RyYXcuc2xpY2UoMCw1MDApLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgIC5jbGFzc2VkKFwidXJsLXJvd1wiLHRydWUpXG5cbiAgICAgIHZhciB1cmxfbmFtZSA9IGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5uYW1lXCIsXCJkaXZcIikuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjYwcHhcIilcbiAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcImhpZGRlblwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZSh1cmxfbmFtZSxcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSh4KVxuICAgICAgICB9KVxuXG4gICAgICBkM19jbGFzcyh1cmxfbmFtZSxcInVybFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1vdmVyZmxvd1wiLFwiZWxsaXBzaXNcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjIwNXB4XCIpXG4gICAgICAgIC50ZXh0KHggPT4ge1xuICAgICAgICAgIHJldHVybiB4LmtleVxuICAgICAgICB9KVxuXG4gICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubnVtYmVyXCIsXCJkaXZcIikuY2xhc3NlZChcIm51bWJlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEzcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvdGFsIH0pXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLnBsb3RcIixcInN2Z1wiKS5jbGFzc2VkKFwicGxvdFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNDRweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgICB2YXIgdmFsdWVzID0geC52YWx1ZXNcbiAgICAgICAgICBzaW1wbGVUaW1lc2VyaWVzKGR0aGlzLHZhbHVlcywxNDQsMjApXG5cbiAgICAgICAgfSlcblxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbmV4cG9ydCBkZWZhdWx0IGRvbWFpbl9leHBhbmRlZDtcbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gRG9tYWluQnVsbGV0KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRvbWFpbl9idWxsZXQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRG9tYWluQnVsbGV0KHRhcmdldClcbn1cblxuRG9tYWluQnVsbGV0LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG1heDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm1heFwiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgd2lkdGggPSAodGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKS5yZXBsYWNlKFwicHhcIixcIlwiKSB8fCB0aGlzLm9mZnNldFdpZHRoKSAtIDUwXG4gICAgICAgICwgaGVpZ2h0ID0gMjg7XG5cbiAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgLnJhbmdlKFswLCB3aWR0aF0pXG4gICAgICAgIC5kb21haW4oWzAsIHRoaXMubWF4KCldKVxuXG4gICAgICBpZiAodGhpcy50YXJnZXQudGV4dCgpKSB0aGlzLnRhcmdldC50ZXh0KFwiXCIpXG5cbiAgICAgIHZhciBidWxsZXQgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmJ1bGxldFwiLFwiZGl2XCIsdGhpcy5kYXRhKCksZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgICAuY2xhc3NlZChcImJ1bGxldFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjNweFwiKVxuXG4gICAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZShidWxsZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsd2lkdGgpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsaGVpZ2h0KVxuICBcbiAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTFcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItMVwiLHRydWUpXG4gICAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24oZCkge3JldHVybiB4KGQucG9wX3BlcmNlbnQpIH0pXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsXCIjODg4XCIpXG4gIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTJcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItMlwiLHRydWUpXG4gICAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAgIC5hdHRyKFwieVwiLGhlaWdodC80KVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uKGQpIHtyZXR1cm4geChkLnNhbXBsZV9wZXJjZW50X25vcm0pIH0pXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodC8yKVxuICAgICAgICAuYXR0cihcImZpbGxcIixcInJnYig4LCAyOSwgODgpXCIpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0ICogYXMgdGltZXNlcmllcyBmcm9tICcuLi90aW1lc2VyaWVzJ1xuXG5pbXBvcnQgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQgZG9tYWluX2V4cGFuZGVkIGZyb20gJy4vZG9tYWluX2V4cGFuZGVkJ1xuaW1wb3J0IGRvbWFpbl9idWxsZXQgZnJvbSAnLi9kb21haW5fYnVsbGV0J1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZnVuY3Rpb24gRG9tYWluVmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRvbWFpbl92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IERvbWFpblZpZXcodGFyZ2V0KVxufVxuXG5Eb21haW5WaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICB2YXIgX2V4cGxvcmUgPSB0aGlzLnRhcmdldFxuICAgICAgICAsIHRhYnMgPSB0aGlzLm9wdGlvbnMoKVxuICAgICAgICAsIGRhdGEgPSB0aGlzLmRhdGEoKVxuICAgICAgICAsIGZpbHRlcmVkID0gdGFicy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnNlbGVjdGVkfSlcbiAgICAgICAgLCBzZWxlY3RlZCA9IGZpbHRlcmVkLmxlbmd0aCA/IGZpbHRlcmVkWzBdIDogdGFic1swXVxuXG4gICAgICBoZWFkZXIoX2V4cGxvcmUpXG4gICAgICAgIC50ZXh0KHNlbGVjdGVkLmtleSApXG4gICAgICAgIC5vcHRpb25zKHRhYnMpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KSB7IHRoaXMub24oXCJzZWxlY3RcIikoeCkgfS5iaW5kKHRoaXMpKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIFxuXG4gICAgICBfZXhwbG9yZS5zZWxlY3RBbGwoXCIudmVuZG9yLWRvbWFpbnMtYmFyLWRlc2NcIikucmVtb3ZlKClcbiAgICAgIF9leHBsb3JlLmRhdHVtKGRhdGEpXG5cbiAgICAgIHZhciB0ID0gdGFibGUoX2V4cGxvcmUpXG4gICAgICAgIC5kYXRhKHNlbGVjdGVkKVxuXG5cbiAgICAgIHZhciBzYW1wX21heCA9IGQzLm1heChzZWxlY3RlZC52YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHguc2FtcGxlX3BlcmNlbnRfbm9ybX0pXG4gICAgICAgICwgcG9wX21heCA9IGQzLm1heChzZWxlY3RlZC52YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHgucG9wX3BlcmNlbnR9KVxuICAgICAgICAsIG1heCA9IE1hdGgubWF4KHNhbXBfbWF4LHBvcF9tYXgpO1xuXG4gICAgICB0LmhlYWRlcnMoW1xuICAgICAgICAgICAge2tleTpcImtleVwiLHZhbHVlOlwiRG9tYWluXCIsbG9ja2VkOnRydWUsd2lkdGg6XCIxMDBweFwifVxuICAgICAgICAgICwge2tleTpcInNhbXBsZV9wZXJjZW50XCIsdmFsdWU6XCJTZWdtZW50XCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICAgLCB7a2V5OlwicmVhbF9wb3BfcGVyY2VudFwiLHZhbHVlOlwiQmFzZWxpbmVcIixzZWxlY3RlZDpmYWxzZX1cbiAgICAgICAgICAsIHtrZXk6XCJyYXRpb1wiLHZhbHVlOlwiUmF0aW9cIixzZWxlY3RlZDpmYWxzZX1cbiAgICAgICAgICAsIHtrZXk6XCJpbXBvcnRhbmNlXCIsdmFsdWU6XCJJbXBvcnRhbmNlXCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICAgLCB7a2V5OlwidmFsdWVcIix2YWx1ZTpcIlNlZ21lbnQgdmVyc3VzIEJhc2VsaW5lXCIsbG9ja2VkOnRydWV9XG4gICAgICAgIF0pXG4gICAgICAgIC5zb3J0KFwiaW1wb3J0YW5jZVwiKVxuICAgICAgICAub3B0aW9uX3RleHQoXCImIzY1MjkxO1wiKVxuICAgICAgICAub24oXCJleHBhbmRcIixmdW5jdGlvbihkKSB7XG5cbiAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKFwidGQub3B0aW9uLWhlYWRlclwiKS5odG1sKFwiJm5kYXNoO1wiKVxuICAgICAgICAgIGlmICh0aGlzLm5leHRTaWJsaW5nICYmIGQzLnNlbGVjdCh0aGlzLm5leHRTaWJsaW5nKS5jbGFzc2VkKFwiZXhwYW5kZWRcIikgPT0gdHJ1ZSkge1xuICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInRkLm9wdGlvbi1oZWFkZXJcIikuaHRtbChcIiYjNjUyOTE7XCIpXG4gICAgICAgICAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc2VsZWN0QWxsKFwiLmV4cGFuZGVkXCIpLnJlbW92ZSgpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc2VsZWN0QWxsKFwiLmV4cGFuZGVkXCIpLnJlbW92ZSgpXG4gICAgICAgICAgdmFyIHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodCwgdGhpcy5uZXh0U2libGluZyk7ICBcblxuICAgICAgICAgIHZhciB0ciA9IGQzLnNlbGVjdCh0KS5jbGFzc2VkKFwiZXhwYW5kZWRcIix0cnVlKS5kYXR1bSh7fSlcbiAgICAgICAgICB2YXIgdGQgPSBkM191cGRhdGVhYmxlKHRyLFwidGRcIixcInRkXCIpXG4gICAgICAgICAgICAuYXR0cihcImNvbHNwYW5cIix0aGlzLmNoaWxkcmVuLmxlbmd0aClcbiAgICAgICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmOWY5ZmJcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgICAgICAgdmFyIGRkID0gdGhpcy5wYXJlbnRFbGVtZW50Ll9fZGF0YV9fLmZ1bGxfdXJscy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5kb21haW4gPT0gZC5rZXl9KVxuICAgICAgICAgIHZhciByb2xsZWQgPSB0aW1lc2VyaWVzLnByZXBEYXRhKGRkKVxuICAgICAgICAgIFxuICAgICAgICAgIGRvbWFpbl9leHBhbmRlZCh0ZClcbiAgICAgICAgICAgIC5yYXcoZGQpXG4gICAgICAgICAgICAuZGF0YShyb2xsZWQpXG4gICAgICAgICAgICAudXJscyhkLnVybHMpXG4gICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmRyYXcoKVxuXG4gICAgICAgIH0pXG4gICAgICAgIC5oaWRkZW5fZmllbGRzKFtcInVybHNcIixcInBlcmNlbnRfdW5pcXVlXCIsXCJzYW1wbGVfcGVyY2VudF9ub3JtXCIsXCJwb3BfcGVyY2VudFwiLFwidGZfaWRmXCIsXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiXSlcbiAgICAgICAgLnJlbmRlcihcInJhdGlvXCIsZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHRoaXMuaW5uZXJUZXh0ID0gTWF0aC50cnVuYyh0aGlzLnBhcmVudE5vZGUuX19kYXRhX18ucmF0aW8qMTAwKS8xMDAgKyBcInhcIlxuICAgICAgICB9KVxuICAgICAgICAucmVuZGVyKFwidmFsdWVcIixmdW5jdGlvbihkKSB7XG5cbiAgICAgICAgICBkb21haW5fYnVsbGV0KGQzLnNlbGVjdCh0aGlzKSlcbiAgICAgICAgICAgIC5tYXgobWF4KVxuICAgICAgICAgICAgLmRhdGEodGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fKVxuICAgICAgICAgICAgLmRyYXcoKVxuXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgdC5kcmF3KClcbiAgICAgXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZnVuY3Rpb24gc2ltcGxlQmFyKHdyYXAsdmFsdWUsc2NhbGUsY29sb3IpIHtcblxuICB2YXIgaGVpZ2h0ID0gMjBcbiAgICAsIHdpZHRoID0gd3JhcC5zdHlsZShcIndpZHRoXCIpLnJlcGxhY2UoXCJweFwiLFwiXCIpXG5cbiAgdmFyIGNhbnZhcyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcInN2Z1wiLFwic3ZnXCIsW3ZhbHVlXSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgIC5zdHlsZShcIndpZHRoXCIsd2lkdGgrXCJweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLGhlaWdodCtcInB4XCIpXG5cblxuICB2YXIgY2hhcnQgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydCcsJ2cnLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0XCIpXG4gIFxuICB2YXIgYmFycyA9IGQzX3NwbGF0KGNoYXJ0LFwiLnBvcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpIH0pXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgIC5hdHRyKCdoZWlnaHQnLGhlaWdodC00KVxuICAgIC5hdHRyKHsneCc6MCwneSc6MH0pXG4gICAgLnN0eWxlKCdmaWxsJyxjb2xvcilcbiAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gc2NhbGUoeCkgfSlcblxuXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIFNlZ21lbnRWaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2VnbWVudF92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNlZ21lbnRWaWV3KHRhcmdldClcbn1cblxuU2VnbWVudFZpZXcucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgc2VnbWVudHM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWdtZW50c1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuc2VnbWVudC13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzZWdtZW50LXdyYXBcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjE0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsdGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKSlcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIixcIjMwMFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjBmNGY3XCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5zZWdtZW50LXdyYXAtc3BhY2VyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzZWdtZW50LXdyYXAtc3BhY2VyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsd3JhcC5zdHlsZShcImhlaWdodFwiKSlcblxuXG4gICAgICBoZWFkZXIod3JhcClcbiAgICAgICAgLmJ1dHRvbnMoW1xuICAgICAgICAgICAge2NsYXNzOiBcInNhdmVkLXNlYXJjaFwiLCBpY29uOiBcImZhLWZvbGRlci1vcGVuLW8gZmFcIiwgdGV4dDogXCJPcGVuIFNhdmVkXCJ9XG4gICAgICAgICAgLCB7Y2xhc3M6IFwibmV3LXNhdmVkLXNlYXJjaFwiLCBpY29uOiBcImZhLWJvb2ttYXJrIGZhXCIsIHRleHQ6IFwiU2F2ZVwifVxuICAgICAgICAgICwge2NsYXNzOiBcImNyZWF0ZVwiLCBpY29uOiBcImZhLXBsdXMtY2lyY2xlIGZhXCIsIHRleHQ6IFwiTmV3IFNlZ21lbnRcIn1cbiAgICAgICAgICAsIHtjbGFzczogXCJsb2dvdXRcIiwgaWNvbjogXCJmYS1zaWduLW91dCBmYVwiLCB0ZXh0OiBcIkxvZ291dFwifVxuICAgICAgICBdKVxuICAgICAgICAub24oXCJzYXZlZC1zZWFyY2guY2xpY2tcIiwgdGhpcy5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiKSlcbiAgICAgICAgLm9uKFwibG9nb3V0LmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyB3aW5kb3cubG9jYXRpb24gPSBcIi9sb2dvdXRcIiB9KVxuICAgICAgICAub24oXCJjcmVhdGUuY2xpY2tcIiwgZnVuY3Rpb24oKSB7IHdpbmRvdy5sb2NhdGlvbiA9IFwiL3NlZ21lbnRzXCIgfSlcbiAgICAgICAgLm9uKFwibmV3LXNhdmVkLXNlYXJjaC5jbGlja1wiLCB0aGlzLm9uKFwibmV3LXNhdmVkLXNlYXJjaC5jbGlja1wiKSlcbiAgICAgICAgLnRleHQoXCJTZWdtZW50XCIpLmRyYXcoKSAgICAgIFxuXG5cbiAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLmhlYWRlci1ib2R5XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIXRoaXMuX2lzX2xvYWRpbmcpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCItNDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCJub25lXCIpXG4gICAgICAgIC5odG1sKFwiPGltZyBzcmM9Jy9zdGF0aWMvaW1nL2dlbmVyYWwvbG9nby1zbWFsbC5naWYnIHN0eWxlPSdoZWlnaHQ6MTVweCcvPiBsb2FkaW5nLi4uXCIpXG5cblxuICAgICAgaWYgKHRoaXMuX2RhdGEgPT0gZmFsc2UpIHJldHVyblxuXG4gICAgICB2YXIgYm9keSA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5ib2R5XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJib2R5XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiY2xlYXJcIixcImJvdGhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4LWRpcmVjdGlvblwiLFwiY29sdW1uXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi0xNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgXG5cbiAgICAgIHZhciByb3cxID0gZDNfdXBkYXRlYWJsZShib2R5LFwiLnJvdy0xXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJyb3ctMVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIiwxKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcImZsZXgtZGlyZWN0aW9uXCIsXCJyb3dcIilcblxuICAgICAgdmFyIHJvdzIgPSBkM191cGRhdGVhYmxlKGJvZHksXCIucm93LTJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInJvdy0yXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLDEpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleC1kaXJlY3Rpb25cIixcInJvd1wiKVxuXG5cbiAgICAgIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUocm93MSxcIi5hY3Rpb24uaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyIGFjdGlvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgdmFyIGlubmVyX2Rlc2MgPSBkM191cGRhdGVhYmxlKHJvdzEsXCIuYWN0aW9uLmlubmVyLWRlc2NcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyLWRlc2MgYWN0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjBweFwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIsXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnRleHQoXCJDaG9vc2UgU2VnbWVudFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNlM2ViZjBcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcixcImRpdi5jb2xvclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY29sb3JcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjMDgxZDU4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuXG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIHNlbGVjdChpbm5lcilcbiAgICAgICAgLm9wdGlvbnModGhpcy5fc2VnbWVudHMpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiY2hhbmdlXCIpLmJpbmQodGhpcykoeClcbiAgICAgICAgfSlcbiAgICAgICAgLnNlbGVjdGVkKHRoaXMuX2FjdGlvbi52YWx1ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIFxuXG5cblxuICAgICAgdmFyIGNhbCA9IGQzX3VwZGF0ZWFibGUoaW5uZXIsXCJhLmZhLWNhbGVuZGFyXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEgZmEtY2FsZW5kYXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgY2Fsc2VsLm5vZGUoKVxuICAgICAgICB9KVxuXG4gICAgICBcbiAgICAgIHZhciBjYWxzZWwgPSBzZWxlY3QoY2FsKVxuICAgICAgICAub3B0aW9ucyhbe1wia2V5XCI6XCJUb2RheVwiLFwidmFsdWVcIjowfSx7XCJrZXlcIjpcIlllc3RlcmRheVwiLFwidmFsdWVcIjoxfSx7XCJrZXlcIjpcIjcgZGF5cyBhZ29cIixcInZhbHVlXCI6N31dKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZi5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgudmFsdWUpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9hY3Rpb25fZGF0ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG4gICAgICAgIC5fc2VsZWN0XG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiLjAxXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIm5vbmVcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCJub25lXCIpXG5cbiAgICAgIFxuXG4gICAgICB2YXIgaW5uZXIyID0gZDNfdXBkYXRlYWJsZShyb3cyLFwiLmNvbXBhcmlzb24uaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyIGNvbXBhcmlzb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcblxuICAgICAgdmFyIGlubmVyX2Rlc2MyID0gZDNfdXBkYXRlYWJsZShyb3cyLFwiLmNvbXBhcmlzb24tZGVzYy5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgY29tcGFyaXNvbi1kZXNjXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG5cbiAgICAgIC8vZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiaDNcIixcImgzXCIpXG4gICAgICAvLyAgLnRleHQoXCIoRmlsdGVycyBhcHBsaWVkIHRvIHRoaXMgc2VnbWVudClcIilcbiAgICAgIC8vICAuc3R5bGUoXCJtYXJnaW5cIixcIjEwcHhcIilcbiAgICAgIC8vICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgLy8gIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgLy8gIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAvLyAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgLy8gIC5zdHlsZShcImZsZXhcIixcIjFcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiLmJhci13cmFwLXRpdGxlXCIsXCJoM1wiKS5jbGFzc2VkKFwiYmFyLXdyYXAtdGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuXG5cbiAgICAgICAgLnRleHQoXCJ2aWV3c1wiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLXRpdGxlXCIsXCJoM1wiKS5jbGFzc2VkKFwiYmFyLXdyYXAtdGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuXG5cblxuICAgICAgICAudGV4dChcInZpZXdzXCIpXG5cblxuXG4gICAgICB2YXIgYmFyX3NhbXAgPSBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCJkaXYuYmFyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJhci13cmFwXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjhweFwiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCIuYmFyLXdyYXAtc3BhY2VcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtc3BhY2VcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KGQzLmZvcm1hdChcIixcIikodGhpcy5fZGF0YS52aWV3cy5zYW1wbGUpKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcIi5iYXItd3JhcC1vcHRcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtb3B0XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC8vLnRleHQoXCJhcHBseSBmaWx0ZXJzP1wiKVxuXG5cblxuICAgICAgdmFyIHhzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgIC5kb21haW4oWzAsTWF0aC5tYXgodGhpcy5fZGF0YS52aWV3cy5zYW1wbGUsIHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbildKVxuICAgICAgICAucmFuZ2UoWzAsYmFyX3NhbXAuc3R5bGUoXCJ3aWR0aFwiKV0pXG5cblxuICAgICAgdmFyIGJhcl9wb3AgPSBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiZGl2LmJhci13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItd3JhcFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjIgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCI4cHhcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLXNwYWNlXCIsXCJkaXZcIikuY2xhc3NlZChcImJhci13cmFwLXNwYWNlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMSAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAudGV4dChkMy5mb3JtYXQoXCIsXCIpKHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbikpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjMixcIi5iYXItd3JhcC1vcHRcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtb3B0XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuICAgICAgICAuaHRtbChcImFwcGx5IGZpbHRlcnM/IDxpbnB1dCB0eXBlPSdjaGVja2JveCc+PC9pbnB1dD5cIilcblxuXG5cbiAgICAgIHNpbXBsZUJhcihiYXJfc2FtcCx0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSx4c2NhbGUsXCIjMDgxZDU4XCIpXG4gICAgICBzaW1wbGVCYXIoYmFyX3BvcCx0aGlzLl9kYXRhLnZpZXdzLnBvcHVsYXRpb24seHNjYWxlLFwiZ3JleVwiKVxuXG5cblxuXG5cblxuXG5cblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIyLFwiaDNcIixcImgzXCIpXG4gICAgICAgIC50ZXh0KFwiQ29tcGFyZSBBZ2FpbnN0XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyMixcImRpdi5jb2xvclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY29sb3JcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJncmV5XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuXG5cblxuXG5cblxuXG5cbiAgICAgIHNlbGVjdChpbm5lcjIpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIkN1cnJlbnQgU2VnbWVudCAod2l0aG91dCBmaWx0ZXJzKVwiLFwidmFsdWVcIjpmYWxzZX1dLmNvbmNhdCh0aGlzLl9zZWdtZW50cykgKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG5cbiAgICAgICAgICBzZWxmLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIikuYmluZCh0aGlzKSh4KVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fY29tcGFyaXNvbi52YWx1ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIHZhciBjYWwyID0gZDNfdXBkYXRlYWJsZShpbm5lcjIsXCJhLmZhLWNhbGVuZGFyXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEgZmEtY2FsZW5kYXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgY2Fsc2VsMi5ub2RlKClcbiAgICAgICAgfSlcblxuICAgICAgXG4gICAgICB2YXIgY2Fsc2VsMiA9IHNlbGVjdChjYWwyKVxuICAgICAgICAub3B0aW9ucyhbe1wia2V5XCI6XCJUb2RheVwiLFwidmFsdWVcIjowfSx7XCJrZXlcIjpcIlllc3RlcmRheVwiLFwidmFsdWVcIjoxfSx7XCJrZXlcIjpcIjcgZGF5cyBhZ29cIixcInZhbHVlXCI6N31dKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZi5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikuYmluZCh0aGlzKSh4LnZhbHVlKVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fY29tcGFyaXNvbl9kYXRlIHx8IDApXG4gICAgICAgIC5kcmF3KClcbiAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIuMDFcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwibm9uZVwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIm5vbmVcIilcblxuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGFjdGlvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uX2RhdGVcIix2YWwpXG4gICAgfVxuICAsIGFjdGlvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFjdGlvblwiLHZhbClcbiAgICB9XG4gICwgY29tcGFyaXNvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY29tcGFyaXNvbl9kYXRlXCIsdmFsKVxuICAgIH1cblxuICAsIGNvbXBhcmlzb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uXCIsdmFsKVxuICAgIH1cbiAgLCBpc19sb2FkaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaXNfbG9hZGluZ1wiLHZhbClcbiAgICB9XG5cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICcuL3N1bW1hcnlfdmlldydcblxudmFyIGJ1Y2tldHMgPSBbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5yZXZlcnNlKCkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZyh4KjYwKSB9KVxuYnVja2V0cyA9IGJ1Y2tldHMuY29uY2F0KFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiBTdHJpbmcoLXgqNjApIH0pKVxuXG5cbmZ1bmN0aW9uIG5vb3AoKXt9XG5cbmZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSxkYXRhKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5cIiArIGNscywgdHlwZSB8fCBcImRpdlwiLGRhdGEpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cbmZ1bmN0aW9uIGNhbGNDYXRlZ29yeShiZWZvcmVfdXJscyxhZnRlcl91cmxzKSB7XG4gIHZhciB1cmxfY2F0ZWdvcnkgPSBiZWZvcmVfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgIHBbYy51cmxdID0gYy5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgIHJldHVybiBwXG4gIH0se30pXG5cbiAgdXJsX2NhdGVnb3J5ID0gYWZ0ZXJfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgIHBbYy51cmxdID0gYy5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgIHJldHVybiBwXG4gIH0sdXJsX2NhdGVnb3J5KVxuXG4gIHJldHVybiB1cmxfY2F0ZWdvcnlcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZWZpbmUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgUmVmaW5lKHRhcmdldClcbn1cblxuY2xhc3MgUmVmaW5lIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICB9XG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9XG4gIHN0YWdlcyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzdGFnZXNcIix2YWwpIH1cblxuICBiZWZvcmVfdXJscyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiZWZvcmVfdXJsc1wiLHZhbCkgfVxuICBhZnRlcl91cmxzKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFmdGVyX3VybHNcIix2YWwpIH1cblxuXG5cbiAgb24oYWN0aW9uLCBmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgdmFyIHRkID0gdGhpcy5fdGFyZ2V0XG4gICAgdmFyIGJlZm9yZV91cmxzID0gdGhpcy5fYmVmb3JlX3VybHNcbiAgICAgICwgYWZ0ZXJfdXJscyA9IHRoaXMuX2FmdGVyX3VybHNcbiAgICAgICwgZCA9IHRoaXMuX2RhdGFcbiAgICAgICwgc3RhZ2VzID0gdGhpcy5fc3RhZ2VzXG5cblxuICAgIHZhciB1cmxfY2F0ZWdvcnkgPSBjYWxjQ2F0ZWdvcnkoYmVmb3JlX3VybHMsYWZ0ZXJfdXJscylcblxuXG4gICAgICAgICAgdmFyIHVybF92b2x1bWUgPSBiZWZvcmVfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICAgICAgcFtjLnVybF0gPSAocFtjLnVybF0gfHwgMCkgKyBjLnZpc2l0c1xuICAgICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgICB9LHt9KVxuXG4gICAgICAgICAgdXJsX3ZvbHVtZSA9IGFmdGVyX3VybHMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgICAgIHBbYy51cmxdID0gKHBbYy51cmxdIHx8IDApICsgYy52aXNpdHNcbiAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgfSx1cmxfdm9sdW1lKVxuXG5cblxuICAgICAgICAgIHZhciBzb3J0ZWRfdXJscyA9IGQzLmVudHJpZXModXJsX3ZvbHVtZSkuc29ydCgocCxjKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZDMuZGVzY2VuZGluZyhwLnZhbHVlLGMudmFsdWUpXG4gICAgICAgICAgfSlcblxuXG4gICAgICAgICAgdmFyIGJlZm9yZV91cmxfdHMgPSBiZWZvcmVfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICAgICAgcFtjLnVybF0gPSBwW2MudXJsXSB8fCB7fVxuICAgICAgICAgICAgcFtjLnVybF1bXCJ1cmxcIl0gPSBjLnVybFxuXG4gICAgICAgICAgICBwW2MudXJsXVtjLnRpbWVfZGlmZl9idWNrZXRdID0gYy52aXNpdHNcbiAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgfSx7fSlcblxuICAgICAgICAgIHZhciBhZnRlcl91cmxfdHMgPSBhZnRlcl91cmxzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgICAgICBwW2MudXJsXSA9IHBbYy51cmxdIHx8IHt9XG4gICAgICAgICAgICBwW2MudXJsXVtcInVybFwiXSA9IGMudXJsXG5cbiAgICAgICAgICAgIHBbYy51cmxdW1wiLVwiICsgYy50aW1lX2RpZmZfYnVja2V0XSA9IGMudmlzaXRzXG4gICAgICAgICAgICByZXR1cm4gcFxuICAgICAgICAgIH0sYmVmb3JlX3VybF90cylcblxuXG5cbiAgICAgICAgICB2YXIgdG9fZHJhdyA9IHNvcnRlZF91cmxzLnNsaWNlKDAsMTAwMCkubWFwKHggPT4gYWZ0ZXJfdXJsX3RzW3gua2V5XSlcbi5tYXAoZnVuY3Rpb24oeCl7XG4gIHgudG90YWwgPSBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKVxuICByZXR1cm4geFxufSlcblxudmFyIGt3X3RvX2RyYXcgPSBkMy5lbnRyaWVzKGFmdGVyX3VybF90cykucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuXG4gIGMua2V5LnRvTG93ZXJDYXNlKCkuc3BsaXQoZC5kb21haW4pWzFdLnNwbGl0KFwiL1wiKS5yZXZlcnNlKClbMF0ucmVwbGFjZShcIl9cIixcIi1cIikuc3BsaXQoXCItXCIpLm1hcCh4ID0+IHtcbiAgICB2YXIgdmFsdWVzID0gW1widGhhdFwiLFwidGhpc1wiLFwid2hhdFwiLFwiYmVzdFwiLFwibW9zdFwiLFwiZnJvbVwiLFwieW91clwiLFwiaGF2ZVwiLFwiZmlyc3RcIixcIndpbGxcIixcInRoYW5cIixcInNheXNcIixcImxpa2VcIixcImludG9cIixcImFmdGVyXCIsXCJ3aXRoXCJdXG4gICAgaWYgKHgubWF0Y2goL1xcZCsvZykgPT0gbnVsbCAmJiB2YWx1ZXMuaW5kZXhPZih4KSA9PSAtMSAmJiB4LmluZGV4T2YoXCIsXCIpID09IC0xICYmIHguaW5kZXhPZihcIj9cIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiLlwiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCI6XCIpID09IC0xICYmIHBhcnNlSW50KHgpICE9IHggJiYgeC5sZW5ndGggPiAzKSB7XG4gICAgICBwW3hdID0gcFt4XSB8fCB7fVxuICAgICAgcFt4XS5rZXkgPSB4XG4gICAgICBPYmplY3Qua2V5cyhjLnZhbHVlKS5tYXAocSA9PiB7XG4gICAgICAgIHBbeF1bcV0gPSAocFt4XVtxXSB8fCAwKSArIGMudmFsdWVbcV1cbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiBwXG4gIH0pXG4gIHJldHVybiBwXG59LHt9KVxuXG5cbmt3X3RvX2RyYXcgPSBPYmplY3Qua2V5cyhrd190b19kcmF3KS5tYXAoZnVuY3Rpb24oaykgeyByZXR1cm4ga3dfdG9fZHJhd1trXSB9KS5tYXAoZnVuY3Rpb24oeCl7XG4gIHgudG90YWwgPSBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKVxuICByZXR1cm4geFxufSkuc29ydCgocCxjKSA9PiB7XG4gIHJldHVybiBjLnRvdGFsIC0gcC50b3RhbFxufSlcblxuXG5cblxuICAgICAgICAgIHZhciBzdW1tYXJ5X3JvdyA9IGQzX2NsYXNzKHRkLFwic3VtbWFyeS1yb3dcIikuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwicmVsYXRpdmVcIilcbiAgICAgICAgICBkM19jbGFzcyh0ZCxcImFjdGlvbi1oZWFkZXJcIikuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIikuc3R5bGUoXCJmb250LXNpemVcIixcIjE2cHhcIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKS50ZXh0KFwiRXhwbG9yZSBhbmQgUmVmaW5lXCIpLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgICAgICAgIHZhciB0aXRsZV9yb3cgPSBkM19jbGFzcyh0ZCxcInRpdGxlLXJvd1wiKVxuXG4gICAgICAgICAgdmFyIGV4cGFuc2lvbl9yb3cgPSBkM19jbGFzcyh0ZCxcImV4cGFuc2lvbi1yb3dcIilcbiAgICAgICAgICB2YXIgZm9vdGVyX3JvdyA9IGQzX2NsYXNzKHRkLFwiZm9vdGVyLXJvd1wiKS5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjEwcHhcIikuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIxNXB4XCIpXG5cbiAgICAgICAgICBmdW5jdGlvbiBidWlsZEZpbHRlcklucHV0KHgpIHtcbiAgICAgICAgICAgICAgdGhpcy5vbihcInNvbWV0aGluZ1wiKSh4KVxuICAgICAgICAgICAgICAvL3NlbGVjdF92YWx1ZS52YWx1ZSArPSAoc2VsZWN0X3ZhbHVlLnZhbHVlID8gXCIsXCIgOiBcIlwiKSArIHgua2V5XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxNnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiNDBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiNXB4XCIpXG4gICAgICAgICAgICAudGV4dChcIkJlZm9yZSBhbmQgQWZ0ZXI6IFwiICsgZC5kb21haW4pXG5cbiAgICAgICAgICB2YXIgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgICAge1wia2V5XCI6XCJBbGxcIixcInZhbHVlXCI6XCJhbGxcIiwgXCJzZWxlY3RlZFwiOjF9XG4gICAgICAgICAgICAsIHtcImtleVwiOlwiQ29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcImNvbnNpZGVyYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgICAsIHtcImtleVwiOlwiVmFsaWRhdGlvblwiLFwidmFsdWVcIjpcInZhbGlkYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgXVxuXG4gICAgICAgICAgdmFyIHRzdyA9IDI1MDtcblxuICAgICAgICAgIHZhciB0aW1lc2VyaWVzID0gZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJ0aW1lc2VyaWVzXCIsXCJzdmdcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIilcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIix0c3cgKyBcInB4XCIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLFwiNzBweFwiKVxuXG5cblxuICAgICAgICAgIHZhciBiZWZvcmVfcm9sbHVwID0gZDMubmVzdCgpXG4gICAgICAgICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldH0pXG4gICAgICAgICAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGQzLnN1bSh4LHkgPT4geS52aXNpdHMpIH0pXG4gICAgICAgICAgICAubWFwKGJlZm9yZV91cmxzKVxuXG4gICAgICAgICAgdmFyIGFmdGVyX3JvbGx1cCA9IGQzLm5lc3QoKVxuICAgICAgICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiBcIi1cIiArIHgudGltZV9kaWZmX2J1Y2tldH0pXG4gICAgICAgICAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGQzLnN1bSh4LHkgPT4geS52aXNpdHMpIH0pXG4gICAgICAgICAgICAubWFwKGFmdGVyX3VybHMpXG5cbiAgICAgICAgICB2YXIgb3ZlcmFsbF9yb2xsdXAgPSBidWNrZXRzLm1hcCh4ID0+IGJlZm9yZV9yb2xsdXBbeF0gfHwgYWZ0ZXJfcm9sbHVwW3hdIHx8IDApXG5cblxuXG4gICAgICAgICAgc2ltcGxlVGltZXNlcmllcyh0aW1lc2VyaWVzLG92ZXJhbGxfcm9sbHVwLHRzdylcbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwibWlkZGxlXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCA1NSlcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIHRzdy8yKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdHN3LzIpXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwibWlkZGxlLXRleHRcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCB0c3cvMilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCA2NylcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC50ZXh0KFwiT24tc2l0ZVwiKVxuXG5cbiAgICAgICAgICB2YXIgYmVmb3JlX3BvcywgYWZ0ZXJfcG9zO1xuXG4gICAgICAgICAgYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICAgaWYgKHN0YWdlcy5jb25zaWRlcmF0aW9uID09IHgpIGJlZm9yZV9wb3MgPSBpXG4gICAgICAgICAgICAgaWYgKHN0YWdlcy52YWxpZGF0aW9uID09IHgpIGFmdGVyX3BvcyA9IGlcblxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICB2YXIgdW5pdF9zaXplID0gdHN3L2J1Y2tldHMubGVuZ3RoXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYmVmb3JlXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMzkpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIDQ1KVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCB1bml0X3NpemUqYmVmb3JlX3BvcylcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKmJlZm9yZV9wb3MpXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYmVmb3JlLXRleHRcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCB1bml0X3NpemUqYmVmb3JlX3BvcyAtIDgpXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgNDgpXG5cbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgICAgICAgIC50ZXh0KFwiQ29uc2lkZXJhdGlvblwiKVxuXG4gICAgICAgICAgZDNfY2xhc3ModGltZXNlcmllcyxcIndpbmRvd1wiLFwibGluZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgICAuYXR0cihcInkxXCIsIDQ1KVxuICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCA0NSlcbiAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgdW5pdF9zaXplKihiZWZvcmVfcG9zKSlcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkrMSlcblxuXG4gICAgICAgICAgZDNfY2xhc3ModGltZXNlcmllcyxcImFmdGVyXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMzkpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIDQ1KVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCB1bml0X3NpemUqKGFmdGVyX3BvcysxKSlcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkpXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYWZ0ZXItdGV4dFwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHVuaXRfc2l6ZSooYWZ0ZXJfcG9zKzEpICsgOClcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCA0OClcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJzdGFydFwiKVxuICAgICAgICAgICAgLnRleHQoXCJWYWxpZGF0aW9uXCIpXG5cblxuXG4gICAgICAgICAgZnVuY3Rpb24gc2VsZWN0T3B0aW9uUmVjdChvcHRpb25zKSB7XG5cbiAgICAgICAgICAgIHZhciBzdWJzZXQgPSB0ZC5zZWxlY3RBbGwoXCJzdmdcIikuc2VsZWN0QWxsKFwicmVjdFwiKVxuICAgICAgICAgICAgICAuYXR0cihcImZpbGxcIix1bmRlZmluZWQpLmZpbHRlcigoeCxpKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcImFsbFwiKSByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJjb25zaWRlcmF0aW9uXCIpIHJldHVybiAoaSA8IGJlZm9yZV9wb3MpIHx8IChpID4gYnVja2V0cy5sZW5ndGgvMiAtIDEgKVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcInZhbGlkYXRpb25cIikgcmV0dXJuIChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKVxuICAgICAgICAgICAgICB9KVxuXG5cbiAgICAgICAgICAgIHN1YnNldC5hdHRyKFwiZmlsbFwiLFwiZ3JleVwiKVxuICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICBzZWxlY3RPcHRpb25SZWN0KG9wdGlvbnMpXG5cbiAgICAgICAgICB2YXIgb3B0cyA9IGQzX2NsYXNzKHN1bW1hcnlfcm93LFwib3B0aW9uc1wiLFwiZGl2XCIsb3B0aW9ucylcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImFic29sdXRlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRvcFwiLFwiMzVweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibGVmdFwiLFwiMjAwcHhcIilcblxuXG4gICAgICAgICAgZnVuY3Rpb24gYnVpbGRPcHRpb25zKG9wdGlvbnMpIHtcblxuXG4gICAgICAgICAgICBkM19zcGxhdChvcHRzLFwiLnNob3ctYnV0dG9uXCIsXCJhXCIsb3B0aW9ucyx4ID0+IHgua2V5KVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInNob3ctYnV0dG9uXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLHggPT4geC5zZWxlY3RlZClcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE4cHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCI1cHhcIilcbiAgICAgICAgICAgICAgLnRleHQoeCA9PiB4LmtleSlcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fLm1hcCh6ID0+IHouc2VsZWN0ZWQgPSAwKVxuICAgICAgICAgICAgICAgIHguc2VsZWN0ZWQgPSAxXG4gICAgICAgICAgICAgICAgYnVpbGRPcHRpb25zKHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXylcbiAgICAgICAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcImNvbnNpZGVyYXRpb25cIikge1xuICAgICAgICAgICAgICAgICAgYnVpbGRVcmxTZWxlY3Rpb24oY29uc2lkZXJhdGlvbl90b19kcmF3KVxuICAgICAgICAgICAgICAgICAgYnVpbGRLZXl3b3JkU2VsZWN0aW9uKGNvbnNpZGVyYXRpb25fa3dfdG9fZHJhdylcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHgudmFsdWUgPT0gXCJ2YWxpZGF0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgIGJ1aWxkVXJsU2VsZWN0aW9uKHZhbGlkYXRpb25fdG9fZHJhdylcbiAgICAgICAgICAgICAgICAgIGJ1aWxkS2V5d29yZFNlbGVjdGlvbih2YWxpZGF0aW9uX2t3X3RvX2RyYXcpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGJ1aWxkVXJsU2VsZWN0aW9uKHRvX2RyYXcpXG4gICAgICAgICAgICAgICAgICBidWlsZEtleXdvcmRTZWxlY3Rpb24oa3dfdG9fZHJhdylcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZWxlY3RPcHRpb25SZWN0KHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXylcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgIH1cblxuICAgICAgICAgIGJ1aWxkT3B0aW9ucyhvcHRpb25zKVxuXG4gICAgICAgICAgZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJkZXNjcmlwdGlvblwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMjBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidG9wXCIsXCIzNXB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJyaWdodFwiLFwiMjAwcHhcIilcbiAgICAgICAgICAgIC50ZXh0KFwiU2VsZWN0IGRvbWFpbnMgYW5kIGtleXdvcmRzIHRvIGJ1aWxkIGFuZCByZWZpbmUgeW91ciBnbG9iYWwgZmlsdGVyXCIpXG5cblxuXG5cblxuICAgICAgICAgIHZhciB1cmxzX3N1bW1hcnkgPSBkM19jbGFzcyhzdW1tYXJ5X3JvdyxcInVybHMtc3VtbWFyeVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICB2YXIga3dzX3N1bW1hcnkgPSBkM19jbGFzcyhzdW1tYXJ5X3JvdyxcImt3cy1zdW1tYXJ5XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM19jbGFzcyh1cmxzX3N1bW1hcnksXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTRweFwiKVxuICAgICAgICAgICAgLnRleHQoXCJVUkwgU3VtbWFyeVwiKVxuXG4gICAgICAgICAgZDNfY2xhc3Moa3dzX3N1bW1hcnksXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTRweFwiKVxuICAgICAgICAgICAgLnRleHQoXCJLZXl3b3JkIFN1bW1hcnlcIilcblxuXG5cbiAgICAgICAgICB2YXIgY29uc2lkZXJhdGlvbl9idWNrZXRzID0gYnVja2V0cy5maWx0ZXIoKHgsaSkgPT4gISgoaSA8IGJlZm9yZV9wb3MpIHx8IChpID4gYnVja2V0cy5sZW5ndGgvMiAtIDEgKSkgKVxuICAgICAgICAgICAgLCB2YWxpZGF0aW9uX2J1Y2tldHMgPSBidWNrZXRzLmZpbHRlcigoeCxpKSA9PiAhKChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKSkgKVxuXG4gICAgICAgICAgdmFyIGNvbnNpZGVyYXRpb25fdG9fZHJhdyA9IHRvX2RyYXcuZmlsdGVyKHggPT4gY29uc2lkZXJhdGlvbl9idWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7IHAgKz0geFtjXSB8fCAwOyByZXR1cm4gcH0sMCkgKVxuICAgICAgICAgICAgLCB2YWxpZGF0aW9uX3RvX2RyYXcgPSB0b19kcmF3LmZpbHRlcih4ID0+IHZhbGlkYXRpb25fYnVja2V0cy5yZWR1Y2UoKHAsYykgPT4geyBwICs9IHhbY10gfHwgMDsgcmV0dXJuIHB9LDApIClcblxuICAgICAgICAgIGZ1bmN0aW9uIGF2Z1ZpZXdzKHRvX2RyYXcpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh0b19kcmF3LnJlZHVjZSgocCxjKSA9PiBwICsgYy50b3RhbCwwKS90b19kcmF3Lmxlbmd0aClcbiAgICAgICAgICB9XG4gICAgICAgICAgZnVuY3Rpb24gbWVkaWFuVmlld3ModG9fZHJhdykge1xuICAgICAgICAgICAgcmV0dXJuICh0b19kcmF3W3BhcnNlSW50KHRvX2RyYXcubGVuZ3RoLzIpXSB8fCB7fSkudG90YWwgfHwgMFxuICAgICAgICAgIH1cblxuXG4gICAgICAgICAgdmFyIHVybF9zdW1tYXJ5X2RhdGEgPSBbXG4gICAgICAgICAgICAgIHtcIm5hbWVcIjpcIkRpc3RpbmN0IFVSTHNcIiwgXCJhbGxcIjogdG9fZHJhdy5sZW5ndGgsIFwiY29uc2lkZXJhdGlvblwiOiBjb25zaWRlcmF0aW9uX3RvX2RyYXcubGVuZ3RoLCBcInZhbGlkYXRpb25cIjogdmFsaWRhdGlvbl90b19kcmF3Lmxlbmd0aCB9XG4gICAgICAgICAgICAsIHtcIm5hbWVcIjpcIkF2ZXJhZ2UgVmlld3NcIiwgXCJhbGxcIjogYXZnVmlld3ModG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBhdmdWaWV3cyhjb25zaWRlcmF0aW9uX3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogYXZnVmlld3ModmFsaWRhdGlvbl90b19kcmF3KSAgfVxuICAgICAgICAgICAgLCB7XCJuYW1lXCI6XCJNZWRpYW4gVmlld3NcIiwgXCJhbGxcIjogbWVkaWFuVmlld3ModG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBtZWRpYW5WaWV3cyhjb25zaWRlcmF0aW9uX3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogbWVkaWFuVmlld3ModmFsaWRhdGlvbl90b19kcmF3KSAgfVxuICAgICAgICAgIF1cblxuICAgICAgICAgIHZhciB1d3JhcCA9IGQzX2NsYXNzKHVybHNfc3VtbWFyeSxcIndyYXBcIikuc3R5bGUoXCJ3aWR0aFwiLFwiOTAlXCIpXG5cblxuICAgICAgICAgIHRhYmxlKHV3cmFwKVxuICAgICAgICAgICAgLmRhdGEoe1widmFsdWVzXCI6dXJsX3N1bW1hcnlfZGF0YX0pXG4gICAgICAgICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgICAgICAgIC5oZWFkZXJzKFtcbiAgICAgICAgICAgICAgICB7XCJrZXlcIjpcIm5hbWVcIixcInZhbHVlXCI6XCJcIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcImFsbFwiLFwidmFsdWVcIjpcIkFsbFwifVxuICAgICAgICAgICAgICAsIHtcImtleVwiOlwiY29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcIkNvbnNpZGVyYXRpb25cIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcInZhbGlkYXRpb25cIixcInZhbHVlXCI6XCJWYWxpZGF0aW9uXCJ9XG4gICAgICAgICAgICBdKVxuICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgICAgLl90YXJnZXQuc2VsZWN0QWxsKFwiLnRhYmxlLXdyYXBwZXJcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidGFibGUtd3JhcHBlclwiLGZhbHNlKVxuXG5cbiAgICAgICAgICB2YXIgY29uc2lkZXJhdGlvbl9rd190b19kcmF3ID0ga3dfdG9fZHJhdy5maWx0ZXIoeCA9PiBjb25zaWRlcmF0aW9uX2J1Y2tldHMucmVkdWNlKChwLGMpID0+IHsgcCArPSB4W2NdIHx8IDA7IHJldHVybiBwfSwwKSApXG4gICAgICAgICAgICAsIHZhbGlkYXRpb25fa3dfdG9fZHJhdyA9IGt3X3RvX2RyYXcuZmlsdGVyKHggPT4gdmFsaWRhdGlvbl9idWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7IHAgKz0geFtjXSB8fCAwOyByZXR1cm4gcH0sMCkgKVxuXG5cbiAgICAgICAgICB2YXIga3dzX3N1bW1hcnlfZGF0YSA9IFtcbiAgICAgICAgICAgICAge1wibmFtZVwiOlwiRGlzdGluY3QgS2V5d29yZHNcIiwgXCJhbGxcIjoga3dfdG9fZHJhdy5sZW5ndGgsIFwiY29uc2lkZXJhdGlvblwiOiBjb25zaWRlcmF0aW9uX2t3X3RvX2RyYXcubGVuZ3RoLCBcInZhbGlkYXRpb25cIjogdmFsaWRhdGlvbl9rd190b19kcmF3Lmxlbmd0aCB9XG4gICAgICAgICAgICAsIHtcIm5hbWVcIjpcIkF2ZXJhZ2UgVmlld3NcIiwgXCJhbGxcIjogYXZnVmlld3Moa3dfdG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBhdmdWaWV3cyhjb25zaWRlcmF0aW9uX2t3X3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogYXZnVmlld3ModmFsaWRhdGlvbl9rd190b19kcmF3KSAgfVxuICAgICAgICAgICAgLCB7XCJuYW1lXCI6XCJNZWRpYW4gVmlld3NcIiwgXCJhbGxcIjogbWVkaWFuVmlld3Moa3dfdG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBtZWRpYW5WaWV3cyhjb25zaWRlcmF0aW9uX2t3X3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogbWVkaWFuVmlld3ModmFsaWRhdGlvbl9rd190b19kcmF3KSAgfVxuICAgICAgICAgIF1cblxuICAgICAgICAgIHZhciBrd3JhcCA9IGQzX2NsYXNzKGt3c19zdW1tYXJ5LFwid3JhcFwiKS5zdHlsZShcIndpZHRoXCIsXCI5MCVcIilcblxuICAgICAgICAgIHRhYmxlKGt3cmFwKVxuICAgICAgICAgICAgLmRhdGEoe1widmFsdWVzXCI6a3dzX3N1bW1hcnlfZGF0YX0pXG4gICAgICAgICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgICAgICAgIC5oZWFkZXJzKFtcbiAgICAgICAgICAgICAgICB7XCJrZXlcIjpcIm5hbWVcIixcInZhbHVlXCI6XCJcIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcImFsbFwiLFwidmFsdWVcIjpcIkFsbFwifVxuICAgICAgICAgICAgICAsIHtcImtleVwiOlwiY29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcIkNvbnNpZGVyYXRpb25cIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcInZhbGlkYXRpb25cIixcInZhbHVlXCI6XCJWYWxpZGF0aW9uXCJ9XG4gICAgICAgICAgICBdKVxuICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgICAgLl90YXJnZXQuc2VsZWN0QWxsKFwiLnRhYmxlLXdyYXBwZXJcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidGFibGUtd3JhcHBlclwiLGZhbHNlKVxuXG5cblxuXG5cbiAgICAgICAgICB2YXIgZXVoID0gZDNfY2xhc3ModGl0bGVfcm93LFwiZXhwYW5zaW9uLXVybHMtdGl0bGVcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICAgICAgZDNfY2xhc3MoZXVoLFwidGl0bGVcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjVweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICAgICAgICAudGV4dChcIlVSTFwiKVxuXG4gICAgICAgICAgZDNfY2xhc3MoZXVoLFwidmlld1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuICAgICAgICAgICAgLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgICAgICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhldWgsXCJsZWdlbmRcIixcInN2Z1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCIuYmVmb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjMwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkJlZm9yZVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwiLmFmdGVyXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjkwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkFmdGVyXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNilcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDYwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNjApXG5cblxuXG5cbiAgICAgICAgICB2YXIgZWtoID0gZDNfY2xhc3ModGl0bGVfcm93LFwiZXhwYW5zaW9uLWt3cy10aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICBkM19jbGFzcyhla2gsXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI2NXB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAudGV4dChcIktleXdvcmRzXCIpXG5cbiAgICAgICAgICBkM19jbGFzcyhla2gsXCJ2aWV3XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgICAgICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhla2gsXCJsZWdlbmRcIixcInN2Z1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbi5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCIuYmVmb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjMwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkJlZm9yZVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwiLmFmdGVyXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjkwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkFmdGVyXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNilcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDYwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNjApXG5cblxuXG5cblxuXG5cbiAgICAgICAgICBmdW5jdGlvbiBidWlsZFVybFNlbGVjdGlvbih0b19kcmF3KSB7XG4gICAgICAgICAgICB2YXIgZXhwYW5zaW9uID0gZDNfY2xhc3MoZXhwYW5zaW9uX3JvdyxcImV4cGFuc2lvbi11cmxzXCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwic2Nyb2xsYm94XCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwibWF4LWhlaWdodFwiLFwiMjUwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcInNjcm9sbFwiKVxuXG4gICAgICAgICAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG4gICAgICAgICAgICB2YXIgdXJsX3JvdyA9IGQzX3NwbGF0KGV4cGFuc2lvbixcIi51cmwtcm93XCIsXCJkaXZcIix0b19kcmF3LnNsaWNlKDAsNTAwKSxmdW5jdGlvbih4KSB7IHJldHVybiB4LnVybCB9KVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInVybC1yb3dcIix0cnVlKVxuXG4gICAgICAgICAgICB2YXIgdXJsX25hbWUgPSBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubmFtZVwiLFwiZGl2XCIpLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI2MHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm92ZXJmbG93XCIsXCJoaWRkZW5cIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUodXJsX25hbWUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZDNfY2xhc3ModXJsX25hbWUsXCJ1cmxcIiwgXCJhXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LW92ZXJmbG93XCIsXCJlbGxpcHNpc1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjM1cHhcIilcbiAgICAgICAgICAgICAgLnRleHQoeCA9PiB4LnVybC5zcGxpdChkLmRvbWFpbilbMV0gfHwgeC51cmwgKVxuICAgICAgICAgICAgICAuYXR0cihcImhyZWZcIiwgeCA9PiB4LnVybClcbiAgICAgICAgICAgICAgLmF0dHIoXCJ0YXJnZXRcIiwgXCJfYmxhbmtcIilcblxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm51bWJlclwiLFwiZGl2XCIpLmNsYXNzZWQoXCJudW1iZXJcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxM3B4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4gZDMuc3VtKGJ1Y2tldHMubWFwKGZ1bmN0aW9uKGIpIHsgcmV0dXJuIHhbYl0gfHwgMCB9KSkgfSlcblxuXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIucGxvdFwiLFwic3ZnXCIpLmNsYXNzZWQoXCJwbG90XCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBidWNrZXRzLm1hcChmdW5jdGlvbihiKSB7IHJldHVybiB4W2JdIHx8IDAgfSlcbiAgICAgICAgICAgICAgICBzaW1wbGVUaW1lc2VyaWVzKGR0aGlzLHZhbHVlcywxMjAsMjApXG4gICAgICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShkdGhpcyxcImxpbmVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAyMClcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgNjApXG4gICAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIDYwKVxuXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgICBmdW5jdGlvbiBidWlsZEtleXdvcmRTZWxlY3Rpb24oa3dfdG9fZHJhdykge1xuICAgICAgICAgICAgdmFyIGV4cGFuc2lvbiA9IGQzX2NsYXNzKGV4cGFuc2lvbl9yb3csXCJleHBhbnNpb24ta2V5d29yZHNcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzY3JvbGxib3hcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwibWF4LWhlaWdodFwiLFwiMjUwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcInNjcm9sbFwiKVxuXG4gICAgICAgICAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG4gICAgICAgICAgICB2YXIgdXJsX3JvdyA9IGQzX3NwbGF0KGV4cGFuc2lvbixcIi51cmwtcm93XCIsXCJkaXZcIixrd190b19kcmF3LnNsaWNlKDAsNTAwKSxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInVybC1yb3dcIix0cnVlKVxuXG4gICAgICAgICAgICB2YXIga3dfbmFtZSA9IGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5uYW1lXCIsXCJkaXZcIikuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjYwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcImhpZGRlblwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcblxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShrd19uYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZDNfY2xhc3Moa3dfbmFtZSxcInVybFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LW92ZXJmbG93XCIsXCJlbGxpcHNpc1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjIzNXB4XCIpXG4gICAgICAgICAgICAgIC50ZXh0KHggPT4geC5rZXkgKVxuXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubnVtYmVyXCIsXCJkaXZcIikuY2xhc3NlZChcIm51bWJlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEzcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKSB9KVxuXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5wbG90XCIsXCJzdmdcIikuY2xhc3NlZChcInBsb3RcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlcyA9IGJ1Y2tldHMubWFwKGZ1bmN0aW9uKGIpIHsgcmV0dXJuIHhbYl0gfHwgMCB9KVxuICAgICAgICAgICAgICAgIHNpbXBsZVRpbWVzZXJpZXMoZHRoaXMsdmFsdWVzLDEyMCwyMClcbiAgICAgICAgICAgICAgICBkM191cGRhdGVhYmxlKGR0aGlzLFwibGluZVwiLFwibGluZVwiKVxuICAgICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIDIwKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCA2MClcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNjApXG5cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBidWlsZFVybFNlbGVjdGlvbih0b19kcmF3KVxuICAgICAgICAgIGJ1aWxkS2V5d29yZFNlbGVjdGlvbihrd190b19kcmF3KVxuXG5cblxuXG5cbiAgfVxuXG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQgdGltZV9zZXJpZXMgZnJvbSAnLi4vdGltZXNlcmllcydcbmltcG9ydCByZWZpbmUgZnJvbSAnLi9yZWZpbmUnXG5cblxuaW1wb3J0IHtkcmF3U3RyZWFtfSBmcm9tICcuL3N1bW1hcnlfdmlldydcbmltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnLi9zdW1tYXJ5X3ZpZXcnXG5cbmZ1bmN0aW9uIG5vb3AoKXt9XG5cbmZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSxkYXRhKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5cIiArIGNscywgdHlwZSB8fCBcImRpdlwiLGRhdGEpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVsYXRpdmVfdGltaW5nKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFJlbGF0aXZlVGltaW5nKHRhcmdldClcbn1cblxuY2xhc3MgUmVsYXRpdmVUaW1pbmcge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vbiA9IHt9XG4gIH1cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG5cbiAgb24oYWN0aW9uLCBmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICBkcmF3KCkge1xuXG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgdmFyIHdyYXAgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJzdW1tYXJ5LXdyYXBcIilcblxuICAgIGhlYWRlcih3cmFwKVxuICAgICAgLnRleHQoXCJCZWZvcmUgYW5kIEFmdGVyXCIpXG4gICAgICAuZHJhdygpXG5cbiAgICB2YXIgYmF3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmJhLXJvd1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJiYS1yb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiNjBweFwiKVxuXG4gICAgdHJ5IHtcbiAgICAgIHZhciBzdGFnZXMgPSBkcmF3U3RyZWFtKGJhd3JhcCx0aGlzLl9kYXRhLmJlZm9yZV9jYXRlZ29yaWVzLHRoaXMuX2RhdGEuYWZ0ZXJfY2F0ZWdvcmllcylcbiAgICAgIGJhd3JhcC5zZWxlY3RBbGwoXCIuYmVmb3JlLXN0cmVhbVwiKS5yZW1vdmUoKSAvLyBIQUNLXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBiYXdyYXAuaHRtbChcIlwiKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX2RhdGEuYmVmb3JlX2NhdGVnb3JpZXNbMF0udmFsdWVzXG5cblxuICAgIHZhciBjYXRlZ29yeV9tdWx0aXBsaWVycyA9IGRhdGEuYmVmb3JlX2NhdGVnb3JpZXMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIHBbYy5rZXldID0gKDEgKyBjLnZhbHVlc1swXS5wZXJjZW50X2RpZmYpXG4gICAgICByZXR1cm4gcFxuICAgIH0se30pXG5cblxuICAgIHZhciB0YWJ1bGFyX2RhdGEgPSB0aGlzLl9kYXRhLmJlZm9yZS5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgcFtjLmRvbWFpbl0gPSBwW2MuZG9tYWluXSB8fCB7fVxuICAgICAgcFtjLmRvbWFpbl1bJ2RvbWFpbiddID0gYy5kb21haW5cbiAgICAgIHBbYy5kb21haW5dWyd3ZWlnaHRlZCddID0gYy52aXNpdHMgKiBjYXRlZ29yeV9tdWx0aXBsaWVyc1tjLnBhcmVudF9jYXRlZ29yeV9uYW1lXVxuICAgICAgXG4gICAgICBwW2MuZG9tYWluXVtjLnRpbWVfZGlmZl9idWNrZXRdID0gKHBbYy5kb21haW5dW2MudGltZV9kaWZmX2J1Y2tldF0gfHwgMCkgKyBjLnZpc2l0c1xuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KVxuXG4gICAgdGFidWxhcl9kYXRhID0gdGhpcy5fZGF0YS5hZnRlci5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgcFtjLmRvbWFpbl0gPSBwW2MuZG9tYWluXSB8fCB7fSBcbiAgICAgIHBbYy5kb21haW5dWydkb21haW4nXSA9IGMuZG9tYWluXG4gICAgICBwW2MuZG9tYWluXVtcIi1cIiArIGMudGltZV9kaWZmX2J1Y2tldF0gPSAocFtjLmRvbWFpbl1bYy50aW1lX2RpZmZfYnVja2V0XSB8fCAwKSArIGMudmlzaXRzXG5cbiAgICAgIHJldHVybiBwXG4gICAgfSx0YWJ1bGFyX2RhdGEpXG5cbiAgICB2YXIgc29ydGVkX3RhYnVsYXIgPSBPYmplY3Qua2V5cyh0YWJ1bGFyX2RhdGEpLm1hcCgoaykgPT4ge1xuICAgICAgcmV0dXJuIHRhYnVsYXJfZGF0YVtrXVxuICAgIH0pLnNvcnQoKHAsYykgPT4ge1xuICAgICAgXG4gICAgICByZXR1cm4gZDMuZGVzY2VuZGluZyhwWyc2MDAnXSpwLndlaWdodGVkIHx8IC1JbmZpbml0eSxjWyc2MDAnXSpjLndlaWdodGVkIHx8IC1JbmZpbml0eSlcbiAgICB9KVxuXG5cblxuXG4gICAgdmFyIGJ1Y2tldHMgPSBbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5yZXZlcnNlKCkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZyh4KjYwKSB9KVxuICAgIGJ1Y2tldHMgPSBidWNrZXRzLmNvbmNhdChbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKC14KjYwKSB9KSlcblxuXG4gICAgdmFyIGZvcm1hdE5hbWUgPSBmdW5jdGlvbih4KSB7XG5cbiAgICAgIGlmICh4IDwgMCkgeCA9IC14XG5cbiAgICAgIGlmICh4ID09IDM2MDApIHJldHVybiBcIjEgaHJcIlxuICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICByZXR1cm4geC8zNjAwICsgXCIgaHJzXCJcbiAgICB9XG5cbiAgICBiYXdyYXAuc2VsZWN0QWxsKFwiLnRhYmxlLXdyYXBwZXJcIikuaHRtbChcIlwiKVxuXG4gICAgdmFyIHRhYmxlX29iaiA9IHRhYmxlKGJhd3JhcClcbiAgICAgIC50b3AoMTQwKVxuICAgICAgLmhlYWRlcnMoXG4gICAgICAgIFt7XCJrZXlcIjpcImRvbWFpblwiLCBcInZhbHVlXCI6XCJEb21haW5cIn1dLmNvbmNhdChcbiAgICAgICAgICBidWNrZXRzLm1hcCh4ID0+IHsgcmV0dXJuIHtcImtleVwiOngsIFwidmFsdWVcIjpmb3JtYXROYW1lKHgpLCBcInNlbGVjdGVkXCI6dHJ1ZX0gfSlcbiAgICAgICAgKVxuICAgICAgICBcbiAgICAgIClcbiAgICAgIC5vbihcImV4cGFuZFwiLGZ1bmN0aW9uKGQpIHtcblxuICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImbmRhc2g7XCIpXG4gICAgICAgICAgaWYgKHRoaXMubmV4dFNpYmxpbmcgJiYgZDMuc2VsZWN0KHRoaXMubmV4dFNpYmxpbmcpLmNsYXNzZWQoXCJleHBhbmRlZFwiKSA9PSB0cnVlKSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKFwidGQub3B0aW9uLWhlYWRlclwiKS5odG1sKFwiJiM2NTI5MTtcIilcbiAgICAgICAgICAgIHJldHVybiBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICAgICAgICB2YXIgdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG4gICAgICAgICAgdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0LCB0aGlzLm5leHRTaWJsaW5nKTsgIFxuXG5cbiAgICAgICAgICB2YXIgdHIgPSBkMy5zZWxlY3QodCkuY2xhc3NlZChcImV4cGFuZGVkXCIsdHJ1ZSkuZGF0dW0oe30pXG4gICAgICAgICAgdmFyIHRkID0gZDNfdXBkYXRlYWJsZSh0cixcInRkXCIsXCJ0ZFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsdGhpcy5jaGlsZHJlbi5sZW5ndGgpXG4gICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgICAgIHZhciBiZWZvcmVfdXJscyA9IGRhdGEuYmVmb3JlLmZpbHRlcih5ID0+IHkuZG9tYWluID09IGQuZG9tYWluKVxuICAgICAgICAgIHZhciBhZnRlcl91cmxzID0gZGF0YS5hZnRlci5maWx0ZXIoeSA9PiB5LmRvbWFpbiA9PSBkLmRvbWFpbilcblxuICAgICAgICAgIHJlZmluZSh0ZClcbiAgICAgICAgICAgIC5kYXRhKGQpXG4gICAgICAgICAgICAuc3RhZ2VzKHN0YWdlcylcbiAgICAgICAgICAgIC5iZWZvcmVfdXJscyhiZWZvcmVfdXJscylcbiAgICAgICAgICAgIC5hZnRlcl91cmxzKGFmdGVyX3VybHMpXG4gICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKVxuICAgICAgICAgICAgLmRyYXcoKVxuXG4gICAgICAgIH0pXG4gICAgICAub3B0aW9uX3RleHQoXCI8ZGl2IHN0eWxlPSd3aWR0aDo0MHB4O3RleHQtYWxpZ246Y2VudGVyJz4mIzY1MjkxOzwvZGl2PlwiKVxuICAgICAgLy8uc29ydChcIjYwMFwiKVxuICAgICAgLmRhdGEoe1widmFsdWVzXCI6c29ydGVkX3RhYnVsYXIuc2xpY2UoMCwxMDAwKX0pXG4gICAgICAuZHJhdygpXG5cbiAgICB0YWJsZV9vYmouX3RhcmdldC5zZWxlY3RBbGwoXCJ0aFwiKVxuICAgICAgLy8uc3R5bGUoXCJ3aWR0aFwiLHggPT4gKHBhcnNlSW50KHgua2V5KSA9PSB4LmtleSkgPyBcIjMxcHhcIiA6IHVuZGVmaW5lZCApXG4gICAgICAvLy5zdHlsZShcIm1heC13aWR0aFwiLHggPT4gKHBhcnNlSW50KHgua2V5KSA9PSB4LmtleSkgPyBcIjMxcHhcIiA6IHVuZGVmaW5lZCApXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmlnaHRcIixcIjFweCByZ2JhKDAsMCwwLC4xKVwiKVxuICAgICAgLnNlbGVjdEFsbChcInNwYW5cIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIiwgZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgaWYgKHBhcnNlSW50KHgua2V5KSA9PSB4LmtleSAmJiB4LmtleSA8IDApIHJldHVybiBcImZvbnQtc2l6ZTouOWVtO3dpZHRoOjcwcHg7dHJhbnNmb3JtOnJvdGF0ZSgtNDVkZWcpO2Rpc3BsYXk6aW5saW5lLWJsb2NrO21hcmdpbi1sZWZ0Oi05cHg7bWFyZ2luLWJvdHRvbTogMTJweFwiXG4gICAgICAgIGlmIChwYXJzZUludCh4LmtleSkgPT0geC5rZXkgJiYgeC5rZXkgPiAwKSByZXR1cm4gXCJmb250LXNpemU6LjllbTt3aWR0aDo3MHB4O3RyYW5zZm9ybTpyb3RhdGUoNDVkZWcpO3RleHQtYWxpZ246cmlnaHQ7ZGlzcGxheTppbmxpbmUtYmxvY2s7bWFyZ2luLWxlZnQ6IC00OHB4OyBtYXJnaW4tYm90dG9tOiAxMnB4O1wiXG5cbiAgICAgIH0pXG5cblxuICAgIHRhYmxlX29iai5fdGFyZ2V0LnNlbGVjdEFsbChcIi50YWJsZS1vcHRpb25cIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcIm5vbmVcIilcblxuXG4gICAgdmFyIG1heCA9IHNvcnRlZF90YWJ1bGFyLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhjKS5maWx0ZXIoeiA9PiB6ICE9IFwiZG9tYWluXCIgJiYgeiAhPSBcIndlaWdodGVkXCIpLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHAgPSBjW3hdID4gcCA/IGNbeF0gOiBwXG4gICAgICB9KVxuICAgIFxuICAgICAgcmV0dXJuIHBcbiAgICB9LDApXG5cbiAgICB2YXIgb3NjYWxlID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoWzAsLjhdKS5kb21haW4oWzAsTWF0aC5sb2cobWF4KV0pXG5cbiAgICB0YWJsZV9vYmouX3RhcmdldC5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpub3QoOmZpcnN0LWNoaWxkKVwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJpZ2h0XCIsXCIxcHggc29saWQgd2hpdGVcIilcbiAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMHB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfX1t4WydrZXknXV0gfHwgMFxuICAgICAgICByZXR1cm4gXCJyZ2JhKDcwLCAxMzAsIDE4MCxcIiArIG9zY2FsZShNYXRoLmxvZyh2YWx1ZSsxKSkgKyBcIilcIlxuICAgICAgfSlcblxuXG5cblxuXG5cbiAgICAgIFxuXG5cblxuICAgIC8vdmFyIHQgPSB0YWJsZS50YWJsZShfZXhwbG9yZSlcbiAgICAvLyAgLmRhdGEoc2VsZWN0ZWQpXG5cblxuXG4gICAgXG4gIH1cbn1cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCB0YWJsZSBmcm9tICd0YWJsZSdcbmltcG9ydCByZWZpbmUgZnJvbSAnLi9yZWZpbmUnXG5pbXBvcnQgKiBhcyB0aW1lc2VyaWVzIGZyb20gJy4uL3RpbWVzZXJpZXMnXG5pbXBvcnQgZG9tYWluX2V4cGFuZGVkIGZyb20gJy4vZG9tYWluX2V4cGFuZGVkJ1xuXG5cblxuXG5pbXBvcnQge2RyYXdTdHJlYW19IGZyb20gJy4vc3VtbWFyeV92aWV3J1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICcuL3N1bW1hcnlfdmlldydcblxuZnVuY3Rpb24gbm9vcCgpe31cblxuZnVuY3Rpb24gZDNfY2xhc3ModGFyZ2V0LGNscyx0eXBlLGRhdGEpIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLlwiICsgY2xzLCB0eXBlIHx8IFwiZGl2XCIsZGF0YSlcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZnVuY3Rpb24gZm9ybWF0SG91cihoKSB7XG4gIGlmIChoID09IDApIHJldHVybiBcIjEyIGFtXCJcbiAgaWYgKGggPT0gMTIpIHJldHVybiBcIjEyIHBtXCJcbiAgaWYgKGggPiAxMikgcmV0dXJuIChoLTEyKSArIFwiIHBtXCJcbiAgcmV0dXJuIChoIDwgMTAgPyBoWzFdIDogaCkgKyBcIiBhbVwiXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdGltaW5nKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFRpbWluZyh0YXJnZXQpXG59XG5cbmNsYXNzIFRpbWluZyB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuX29uID0ge31cbiAgfVxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcblxuICBvbihhY3Rpb24sIGZuKSB7XG4gICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuXG4gIGRyYXcoKSB7XG5cblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YVxuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwidGltaW5nLXdyYXBcIilcblxuICAgIGhlYWRlcih3cmFwKVxuICAgICAgLnRleHQoXCJUaW1pbmdcIilcbiAgICAgIC5kcmF3KClcblxuICAgIHZhciB0aW1pbmd3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnRpbWluZy1yb3dcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwidGltaW5nLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCI2MHB4XCIpXG5cbiAgICAvLyBEQVRBXG4gICAgdmFyIGhvdXJidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkubWFwKHggPT4gU3RyaW5nKHgpLmxlbmd0aCA+IDEgPyBTdHJpbmcoeCkgOiBcIjBcIiArIHgpXG5cblxuICAgIHZhciBkID0gZDMubmVzdCgpXG4gICAgICAua2V5KHggPT4geC5kb21haW4pXG4gICAgICAua2V5KHggPT4geC5ob3VyKVxuICAgICAgLmVudHJpZXMoZGF0YS5mdWxsX3VybHMpXG5cbiAgICB2YXIgbWF4ID0gMFxuXG4gICAgZC5tYXAoeCA9PiB7XG4gICAgICB2YXIgb2JqID0geC52YWx1ZXMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgcFtjLmtleV0gPSBjLnZhbHVlc1xuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7fSlcblxuICAgICAgeC5idWNrZXRzID0gaG91cmJ1Y2tldHMubWFwKHogPT4ge1xuICAgICAgIFxuICAgICAgICB2YXIgbyA9IHtcbiAgICAgICAgICB2YWx1ZXM6IG9ialt6XSxcbiAgICAgICAgICBrZXk6IGZvcm1hdEhvdXIoeilcbiAgICAgICAgfVxuICAgICAgICBvLnZpZXdzID0gZDMuc3VtKG9ialt6XSB8fCBbXSwgcSA9PiBxLnVuaXF1ZXMpXG5cbiAgICAgICAgbWF4ID0gbWF4ID4gby52aWV3cyA/IG1heCA6IG8udmlld3NcbiAgICAgICAgcmV0dXJuIG9cbiAgICAgIH0pXG5cbiAgICAgIHgudGFidWxhciA9IHguYnVja2V0cy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBwW2Mua2V5XSA9IGMudmlld3MgfHwgdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICB4LnRhYnVsYXJbXCJkb21haW5cIl0gPSB4LmtleVxuICAgICAgeC50YWJ1bGFyW1widG90YWxcIl0gPSBkMy5zdW0oeC5idWNrZXRzLHggPT4geC52aWV3cylcblxuICAgICAgXG4gICAgICB4LnZhbHVlc1xuICAgIH0pXG5cbiAgICB2YXIgaGVhZGVycyA9IFtcbiAgICAgIHtrZXk6XCJkb21haW5cIix2YWx1ZTpcIkRvbWFpblwifVxuICAgIF1cblxuICAgIGhlYWRlcnMgPSBoZWFkZXJzLmNvbmNhdChob3VyYnVja2V0cy5tYXAoZm9ybWF0SG91cikubWFwKHggPT4geyByZXR1cm4ge2tleTogeCwgdmFsdWU6IHh9IH0pIClcbiAgICBcbiAgICB2YXIgb3NjYWxlID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoWzAsLjhdKS5kb21haW4oWzAsTWF0aC5sb2cobWF4KV0pXG5cblxuICAgIHZhciB0YWJsZV9vYmogPSB0YWJsZSh0aW1pbmd3cmFwKVxuICAgICAgLmhlYWRlcnMoaGVhZGVycylcbiAgICAgIC5kYXRhKHtcImtleVwiOlwiXCIsIFwidmFsdWVzXCI6ZC5tYXAoeCA9PiB4LnRhYnVsYXIpIH0pXG4gICAgICAuc29ydChcInRvdGFsXCIpXG4gICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgIC5vbihcImV4cGFuZFwiLGZ1bmN0aW9uKGQpIHtcblxuICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImbmRhc2g7XCIpXG4gICAgICAgICAgaWYgKHRoaXMubmV4dFNpYmxpbmcgJiYgZDMuc2VsZWN0KHRoaXMubmV4dFNpYmxpbmcpLmNsYXNzZWQoXCJleHBhbmRlZFwiKSA9PSB0cnVlKSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKFwidGQub3B0aW9uLWhlYWRlclwiKS5odG1sKFwiJiM2NTI5MTtcIilcbiAgICAgICAgICAgIHJldHVybiBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICAgICAgICB2YXIgdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG4gICAgICAgICAgdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0LCB0aGlzLm5leHRTaWJsaW5nKTsgIFxuXG4gICAgICAgICAgdmFyIHRyID0gZDMuc2VsZWN0KHQpLmNsYXNzZWQoXCJleHBhbmRlZFwiLHRydWUpLmRhdHVtKHt9KVxuICAgICAgICAgIHZhciB0ZCA9IGQzX3VwZGF0ZWFibGUodHIsXCJ0ZFwiLFwidGRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY29sc3BhblwiLHRoaXMuY2hpbGRyZW4ubGVuZ3RoKVxuICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2Y5ZjlmYlwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgICAgICB2YXIgZGQgPSBkYXRhLmZ1bGxfdXJscy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5kb21haW4gPT0gZC5kb21haW4gfSlcbiAgICAgICAgICB2YXIgcm9sbGVkID0gdGltZXNlcmllcy5wcmVwRGF0YShkZClcbiAgICAgICAgICBcbiAgICAgICAgICBkb21haW5fZXhwYW5kZWQodGQpXG4gICAgICAgICAgICAucmF3KGRkKVxuICAgICAgICAgICAgLmRhdGEocm9sbGVkKVxuICAgICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSh4KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5kcmF3KClcblxuICAgICAgICB9KVxuICAgICAgLmRyYXcoKVxuXG4gICAgdGFibGVfb2JqLl90YXJnZXQuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bm90KDpmaXJzdC1jaGlsZClcIilcbiAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkIHdoaXRlXCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjBweFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX19beFsna2V5J11dIHx8IDBcbiAgICAgICAgcmV0dXJuIFwicmdiYSg3MCwgMTMwLCAxODAsXCIgKyBvc2NhbGUoTWF0aC5sb2codmFsdWUrMSkpICsgXCIpXCJcbiAgICAgIH0pXG5cblxuXG5cbiAgICBcbiAgfVxufVxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5cbmZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuXCIgKyBjbHMsIHR5cGUgfHwgXCJkaXZcIilcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3RhZ2VkX2ZpbHRlcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTdGFnZWRGaWx0ZXIodGFyZ2V0KVxufVxuXG5jbGFzcyBTdGFnZWRGaWx0ZXIge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vbiA9IHt9XG4gIH1cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG5cbiAgb24oYWN0aW9uLCBmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICBkcmF3KCkge1xuICAgIHZhciBvd3JhcCA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcImZvb3Rlci13cmFwXCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCI2MHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3R0b21cIixcIjBweFwiKVxuICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwMHB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjRjBGNEY3XCIpXG5cbiAgICB2YXIgd3JhcCA9IGQzX2NsYXNzKG93cmFwLFwiaW5uZXItd3JhcFwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXRvcFwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCI1cHhcIilcblxuICAgIGQzX2NsYXNzKHdyYXAsXCJoZWFkZXItbGFiZWxcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjE0cHhcIilcbiAgICAgIC5zdHlsZShcImNvbG9yXCIsXCIjODg4ODg4XCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC50ZXh0KFwiQnVpbGQgRmlsdGVyc1wiKVxuXG4gICAgZDNfY2xhc3Mod3JhcCxcInRleHQtbGFiZWxcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI2MHB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJub25lXCIpXG4gICAgICAudGV4dChcIlRpdGxlXCIpXG5cbiAgICB2YXIgc2VsZWN0X2JveCA9IHNlbGVjdCh3cmFwKVxuICAgICAgLm9wdGlvbnMoW1xuICAgICAgICAgIHtcImtleVwiOlwiY29udGFpbnNcIixcInZhbHVlXCI6XCJjb250YWluc1wifVxuICAgICAgICAsIHtcImtleVwiOlwiZG9lcyBub3QgY29udGFpblwiLFwidmFsdWVcIjpcImRvZXMgbm90IGNvbnRhaW5cIn1cbiAgICAgIF0pXG4gICAgICAuZHJhdygpXG4gICAgICAuX3NlbGVjdFxuICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cblxuXG5cbiAgICB2YXIgZm9vdGVyX3JvdyA9IGQzX2NsYXNzKHdyYXAsXCJmb290ZXItcm93XCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG4gICAgdmFyIHNlbGVjdF92YWx1ZSA9IHRoaXMuZGF0YSgpXG5cbiAgICBmdW5jdGlvbiBidWlsZEZpbHRlcklucHV0KCkge1xuXG4gICAgICBmb290ZXJfcm93LnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRlc3Ryb3kgPSBkMy5zZWxlY3QodGhpcykub24oXCJkZXN0cm95XCIpXG4gICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICB9KVxuXG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZvb3Rlcl9yb3csXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAuYXR0cihcInZhbHVlXCIsc2VsZWN0X3ZhbHVlKVxuICAgICAgICAucHJvcGVydHkoXCJ2YWx1ZVwiLHNlbGVjdF92YWx1ZSlcblxuICAgICAgXG5cblxuICAgICAgdmFyIHMgPSAkKHNlbGVjdC5ub2RlKCkpLnNlbGVjdGl6ZSh7XG4gICAgICAgIHBlcnNpc3Q6IGZhbHNlLFxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGVjdF92YWx1ZSA9IChzZWxlY3RfdmFsdWUubGVuZ3RoID8gc2VsZWN0X3ZhbHVlICsgXCIsXCIgOiBcIlwiKSArIHhcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGVjdF92YWx1ZSlcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9uRGVsZXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxlY3RfdmFsdWUgPSBzZWxlY3RfdmFsdWUuc3BsaXQoXCIsXCIpLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6ICE9IHhbMF19KS5qb2luKFwiLFwiKVxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZWN0X3ZhbHVlKVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogeCwgdGV4dDogeFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgLm9uKFwiZGVzdHJveVwiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNbMF0uc2VsZWN0aXplLmRlc3Ryb3koKVxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgYnVpbGRGaWx0ZXJJbnB1dCgpXG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBkM19jbGFzcyh3cmFwLFwiaW5jbHVkZS1zdWJtaXRcIixcImJ1dHRvblwiKVxuICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyOXB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwic3VibWl0XCIpXG4gICAgICAudGV4dChcIk1vZGlmeSBGaWx0ZXJzXCIpXG4gICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBmb290ZXJfcm93LnNlbGVjdEFsbChcImlucHV0XCIpLnByb3BlcnR5KFwidmFsdWVcIilcbiAgICAgICAgdmFyIG9wID0gIHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXkgKyBcIi5zZWxlY3RpemVcIlxuICAgICAgICBcbiAgICAgICAgc2VsZi5vbihcIm1vZGlmeVwiKSh7XCJmaWVsZFwiOlwiVGl0bGVcIixcIm9wXCI6b3AsXCJ2YWx1ZVwiOnZhbHVlfSlcbiAgICAgIH0pXG5cbiAgICBkM19jbGFzcyh3cmFwLFwiZXhjbHVkZS1zdWJtaXRcIixcImJ1dHRvblwiKVxuICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyOXB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwic3VibWl0XCIpXG4gICAgICAudGV4dChcIk5ldyBGaWx0ZXJcIilcbiAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGZvb3Rlcl9yb3cuc2VsZWN0QWxsKFwiaW5wdXRcIikucHJvcGVydHkoXCJ2YWx1ZVwiKVxuICAgICAgICB2YXIgb3AgPSAgc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleSArIFwiLnNlbGVjdGl6ZVwiXG5cbiAgICAgICAgc2VsZi5vbihcImFkZFwiKSh7XCJmaWVsZFwiOlwiVGl0bGVcIixcIm9wXCI6b3AsXCJ2YWx1ZVwiOnZhbHVlfSlcbiAgICAgIH0pXG5cblxuICB9XG59XG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi9oZWFkZXInXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5leHBvcnQgZnVuY3Rpb24gQ29uZGl0aW9uYWxTaG93KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMuX2NsYXNzZXMgPSB7fVxuICB0aGlzLl9vYmplY3RzID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29uZGl0aW9uYWxfc2hvdyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBDb25kaXRpb25hbFNob3codGFyZ2V0KVxufVxuXG5Db25kaXRpb25hbFNob3cucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgY2xhc3NlZDogZnVuY3Rpb24oaywgdikge1xuICAgICAgaWYgKGsgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2NsYXNzZXNcbiAgICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9jbGFzc2VzW2tdIFxuICAgICAgdGhpcy5fY2xhc3Nlc1trXSA9IHY7XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH0gIFxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgdmFyIGNsYXNzZXMgPSB0aGlzLmNsYXNzZWQoKVxuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuY29uZGl0aW9uYWwtd3JhcFwiLFwiZGl2XCIsdGhpcy5kYXRhKCkpXG4gICAgICAgIC5jbGFzc2VkKFwiY29uZGl0aW9uYWwtd3JhcFwiLHRydWUpXG5cbiAgICAgIHZhciBvYmplY3RzID0gZDNfc3BsYXQod3JhcCxcIi5jb25kaXRpb25hbFwiLFwiZGl2XCIsaWRlbnRpdHksIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSB9KVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJjb25kaXRpb25hbFwiLHRydWUpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuICF4LnNlbGVjdGVkIH0pXG5cblxuICAgICAgT2JqZWN0LmtleXMoY2xhc3NlcykubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgIG9iamVjdHMuY2xhc3NlZChrLGNsYXNzZXNba10pXG4gICAgICB9KVxuXG4gICAgICB0aGlzLl9vYmplY3RzID0gb2JqZWN0c1xuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gIFxuICAgIH1cbiAgLCBlYWNoOiBmdW5jdGlvbihmbikge1xuICAgICAgdGhpcy5kcmF3KClcbiAgICAgIHRoaXMuX29iamVjdHMuZWFjaChmbilcbiAgICAgIFxuICAgIH1cbn1cbiIsIlxuZXhwb3J0IGZ1bmN0aW9uIFNoYXJlKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5faW5uZXIgPSBmdW5jdGlvbigpIHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNoYXJlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNoYXJlKHRhcmdldClcbn1cblxuU2hhcmUucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgb3ZlcmxheSA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLm92ZXJsYXlcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIm92ZXJsYXlcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcInJnYmEoMCwwLDAsLjUpXCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIixcIjMwMVwiKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG92ZXJsYXkucmVtb3ZlKClcbiAgICAgICAgfSlcblxuICAgICAgdGhpcy5fb3ZlcmxheSA9IG92ZXJsYXk7XG5cbiAgICAgIHZhciBjZW50ZXIgPSBkM191cGRhdGVhYmxlKG92ZXJsYXksXCIucG9wdXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInBvcHVwIGNvbC1tZC01IGNvbC1zbS04XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCJhdXRvXCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjMwMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjE1MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIndoaXRlXCIpXG4gICAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJub25lXCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgICAgfSlcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHNlbGYuX2lubmVyKGQzLnNlbGVjdCh0aGlzKSlcbiAgICAgICAgfSlcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgaW5uZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB0aGlzLl9pbm5lciA9IGZuLmJpbmQodGhpcylcbiAgICAgIHRoaXMuZHJhdygpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX292ZXJsYXkucmVtb3ZlKClcbiAgICAgIHJldHVybiB0aGlzIFxuICAgIH1cbn1cbiIsImltcG9ydCAqIGFzIHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IGZpbHRlcl92aWV3IGZyb20gJy4vdmlld3MvZmlsdGVyX3ZpZXcnXG5pbXBvcnQgb3B0aW9uX3ZpZXcgZnJvbSAnLi92aWV3cy9vcHRpb25fdmlldydcbmltcG9ydCBkb21haW5fdmlldyBmcm9tICcuL3ZpZXdzL2RvbWFpbl92aWV3J1xuaW1wb3J0IHNlZ21lbnRfdmlldyBmcm9tICcuL3ZpZXdzL3NlZ21lbnRfdmlldydcbmltcG9ydCBzdW1tYXJ5X3ZpZXcgZnJvbSAnLi92aWV3cy9zdW1tYXJ5X3ZpZXcnXG5pbXBvcnQgcmVsYXRpdmVfdmlldyBmcm9tICcuL3ZpZXdzL3JlbGF0aXZlX3RpbWluZ192aWV3J1xuaW1wb3J0IHRpbWluZ192aWV3IGZyb20gJy4vdmlld3MvdGltaW5nX3ZpZXcnXG5cbmltcG9ydCBzdGFnZWRfZmlsdGVyX3ZpZXcgZnJvbSAnLi92aWV3cy9zdGFnZWRfZmlsdGVyX3ZpZXcnXG5cblxuXG5cblxuaW1wb3J0IGNvbmRpdGlvbmFsX3Nob3cgZnJvbSAnLi9nZW5lcmljL2NvbmRpdGlvbmFsX3Nob3cnXG5cbmltcG9ydCBzaGFyZSBmcm9tICcuL2dlbmVyaWMvc2hhcmUnXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuL2hlbHBlcnMnXG5pbXBvcnQgKiBhcyB0cmFuc2Zvcm0gZnJvbSAnLi9kYXRhX2hlbHBlcnMnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5leHBvcnQgZnVuY3Rpb24gTmV3RGFzaGJvYXJkKHRhcmdldCkge1xuICB0aGlzLnRhcmdldCA9IHRhcmdldFxuICB0aGlzLl9vbiA9IHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG5ld19kYXNoYm9hcmQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgTmV3RGFzaGJvYXJkKHRhcmdldClcbn1cblxuTmV3RGFzaGJvYXJkLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIHN0YWdlZF9maWx0ZXJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3RhZ2VkX2ZpbHRlcnNcIix2YWwpIHx8IFwiXCJcbiAgICB9XG4gICwgc2F2ZWQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzYXZlZFwiLHZhbCkgXG4gICAgfVxuICAsIGxpbmVfaXRlbXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsaW5lX2l0ZW1zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBzZWxlY3RlZF9hY3Rpb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWxlY3RlZF9hY3Rpb25cIix2YWwpIFxuICAgIH1cbiAgLCBzZWxlY3RlZF9jb21wYXJpc29uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2VsZWN0ZWRfY29tcGFyaXNvblwiLHZhbCkgXG4gICAgfVxuICAsIGFjdGlvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uX2RhdGVcIix2YWwpIFxuICAgIH1cbiAgLCBjb21wYXJpc29uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uX2RhdGVcIix2YWwpIFxuICAgIH1cblxuICAsIHZpZXdfb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZpZXdfb3B0aW9uc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgbG9naWNfb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljX29wdGlvbnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGV4cGxvcmVfdGFiczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImV4cGxvcmVfdGFic1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgbG9naWNfY2F0ZWdvcmllczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljX2NhdGVnb3JpZXNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGFjdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBzdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgdGltZV9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGltZV9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBjYXRlZ29yeV9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY2F0ZWdvcnlfc3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwga2V5d29yZF9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5d29yZF9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBiZWZvcmU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiZWZvcmVcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGFmdGVyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWZ0ZXJcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGZpbHRlcnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJmaWx0ZXJzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBsb2FkaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCkgdGhpcy5fc2VnbWVudF92aWV3ICYmIHRoaXMuX3NlZ21lbnRfdmlldy5pc19sb2FkaW5nKHZhbCkuZHJhdygpXG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvYWRpbmdcIix2YWwpXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YSgpXG5cbiAgICAgIHZhciBvcHRpb25zID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnZpZXdfb3B0aW9ucygpKSlcbiAgICAgIHZhciB0YWJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmV4cGxvcmVfdGFicygpKSlcblxuXG4gICAgICB2YXIgbG9naWMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMubG9naWNfb3B0aW9ucygpKSlcbiAgICAgICAgLCBjYXRlZ29yaWVzID0gdGhpcy5sb2dpY19jYXRlZ29yaWVzKClcbiAgICAgICAgLCBmaWx0ZXJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmZpbHRlcnMoKSkpXG4gICAgICAgICwgYWN0aW9ucyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5hY3Rpb25zKCkpKVxuICAgICAgICAsIHN0YWdlZF9maWx0ZXJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnN0YWdlZF9maWx0ZXJzKCkpKVxuXG5cblxuICAgICAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdGhpcy5fc2VnbWVudF92aWV3ID0gc2VnbWVudF92aWV3KHRhcmdldClcbiAgICAgICAgLmlzX2xvYWRpbmcoc2VsZi5sb2FkaW5nKCkgfHwgZmFsc2UpXG4gICAgICAgIC5zZWdtZW50cyhhY3Rpb25zKVxuICAgICAgICAuZGF0YShzZWxmLnN1bW1hcnkoKSlcbiAgICAgICAgLmFjdGlvbihzZWxmLnNlbGVjdGVkX2FjdGlvbigpIHx8IHt9KVxuICAgICAgICAuYWN0aW9uX2RhdGUoc2VsZi5hY3Rpb25fZGF0ZSgpIHx8IFwiXCIpXG4gICAgICAgIC5jb21wYXJpc29uX2RhdGUoc2VsZi5jb21wYXJpc29uX2RhdGUoKSB8fCBcIlwiKVxuXG4gICAgICAgIC5jb21wYXJpc29uKHNlbGYuc2VsZWN0ZWRfY29tcGFyaXNvbigpIHx8IHt9KVxuICAgICAgICAub24oXCJjaGFuZ2VcIiwgdGhpcy5vbihcImFjdGlvbi5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiLCB0aGlzLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJjb21wYXJpc29uLmNoYW5nZVwiLCB0aGlzLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIiwgdGhpcy5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiLCBmdW5jdGlvbigpIHsgIFxuICAgICAgICAgIHZhciBzcyA9IHNoYXJlKGQzLnNlbGVjdChcImJvZHlcIikpLmRyYXcoKVxuICAgICAgICAgIHNzLmlubmVyKGZ1bmN0aW9uKHRhcmdldCkge1xuXG4gICAgICAgICAgICB2YXIgaGVhZGVyID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuaGVhZGVyXCIsXCJoNFwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImhlYWRlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJPcGVuIGEgc2F2ZWQgZGFzaGJvYXJkXCIpXG5cbiAgICAgICAgICAgIHZhciBmb3JtID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJkaXZcIixcImRpdlwiLHNlbGYuc2F2ZWQoKSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjI1JVwiKVxuXG4gICAgICAgICAgICBpZiAoIXNlbGYuc2F2ZWQoKSB8fCBzZWxmLnNhdmVkKCkubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShmb3JtLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgICAgICAgICAgIC50ZXh0KFwiWW91IGN1cnJlbnRseSBoYXZlIG5vIHNhdmVkIGRhc2hib2FyZHNcIilcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGQzX3NwbGF0KGZvcm0sXCIucm93XCIsXCJhXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubmFtZSB9KVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgICAgICAgICAvLy5hdHRyKFwiaHJlZlwiLCB4ID0+IHguZW5kcG9pbnQpXG4gICAgICAgICAgICAgICAgLnRleHQoeCA9PiB4Lm5hbWUpXG4gICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgICAgLy8gSEFDSzogVEhJUyBpcyBoYWNreS4uLlxuICAgICAgICAgICAgICAgICAgdmFyIF9zdGF0ZSA9IHN0YXRlLnFzKHt9KS5mcm9tKFwiP1wiICsgeC5lbmRwb2ludC5zcGxpdChcIj9cIilbMV0pXG5cbiAgICAgICAgICAgICAgICAgIHNzLmhpZGUoKVxuICAgICAgICAgICAgICAgICAgd2luZG93Lm9ucG9wc3RhdGUoe3N0YXRlOiBfc3RhdGV9KVxuICAgICAgICAgICAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgICAub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgICB2YXIgc3MgPSBzaGFyZShkMy5zZWxlY3QoXCJib2R5XCIpKS5kcmF3KClcbiAgICAgICAgICBzcy5pbm5lcihmdW5jdGlvbih0YXJnZXQpIHtcblxuICAgICAgICAgICAgdmFyIGhlYWRlciA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLmhlYWRlclwiLFwiaDRcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJoZWFkZXJcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LWZhbWlseVwiLFwiUHJveGltYU5vdmEsIHNhbnMtc2VyaWZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiU2F2ZSB0aGlzIGRhc2hib2FyZDpcIilcblxuICAgICAgICAgICAgdmFyIGZvcm0gPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdlwiLFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG4gICAgICAgICAgICB2YXIgbmFtZSA9IGQzX3VwZGF0ZWFibGUoZm9ybSwgXCIubmFtZVwiLCBcImRpdlwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKG5hbWUsXCIubGFiZWxcIixcImRpdlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiRGFzaGJvYXJkIE5hbWU6XCIpXG5cbiAgICAgICAgICAgIHZhciBuYW1lX2lucHV0ID0gZDNfdXBkYXRlYWJsZShuYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNzBweFwiKVxuICAgICAgICAgICAgICAuYXR0cihcInBsYWNlaG9sZGVyXCIsXCJNeSBhd2Vzb21lIHNlYXJjaFwiKVxuXG4gICAgICAgICAgICB2YXIgYWR2YW5jZWQgPSBkM191cGRhdGVhYmxlKGZvcm0sIFwiLmFkdmFuY2VkXCIsIFwiZGV0YWlsc1wiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImFkdmFuY2VkXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjQwMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImxlZnRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCJhdXRvXCIpXG5cblxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKGFkdmFuY2VkLFwiLmxhYmVsXCIsXCJkaXZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAudGV4dChcIkxpbmUgSXRlbTpcIilcblxuICAgICAgICAgICAgdmFyIHNlbGVjdF9ib3ggPSBzZWxlY3QoYWR2YW5jZWQpXG4gICAgICAgICAgICAgIC5vcHRpb25zKHNlbGYubGluZV9pdGVtcygpLm1hcCh4ID0+IHsgcmV0dXJuIHtrZXk6eC5saW5lX2l0ZW1fbmFtZSwgdmFsdWU6IHgubGluZV9pdGVtX2lkfSB9KSApXG4gICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI3MHB4XCIpXG5cblxuXG5cbiAgICAgICAgICAgIHZhciBzZW5kID0gZDNfdXBkYXRlYWJsZShmb3JtLCBcIi5zZW5kXCIsIFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VuZFwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc2VuZCxcImJ1dHRvblwiLFwiYnV0dG9uXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxNnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjEwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJTZW5kXCIpXG4gICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gbmFtZV9pbnB1dC5wcm9wZXJ0eShcInZhbHVlXCIpIFxuICAgICAgICAgICAgICAgIHZhciBsaW5lX2l0ZW0gPSBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnMubGVuZ3RoID8gc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleSA6IGZhbHNlXG5cbiAgICAgICAgICAgICAgICBkMy54aHIoXCIvY3J1c2hlci9zYXZlZF9kYXNoYm9hcmRcIilcbiAgICAgICAgICAgICAgICAgIC5wb3N0KEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBuYW1lXG4gICAgICAgICAgICAgICAgICAgICAgLCBcImVuZHBvaW50XCI6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAsIFwibGluZV9pdGVtXCI6IGxpbmVfaXRlbVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgKVxuXG4gICAgICAgICAgICAgICAgc3MuaGlkZSgpXG5cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLnRleHQoXCJTYXZlXCIpXG5cblxuXG4gICAgICAgICAgfSlcblxuXG4gICAgICAgIH0pXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgaWYgKHRoaXMuc3VtbWFyeSgpID09IGZhbHNlKSByZXR1cm4gZmFsc2VcblxuICAgICAgZmlsdGVyX3ZpZXcodGFyZ2V0KVxuICAgICAgICAubG9naWMobG9naWMpXG4gICAgICAgIC5jYXRlZ29yaWVzKGNhdGVnb3JpZXMpXG4gICAgICAgIC5maWx0ZXJzKGZpbHRlcnMpXG4gICAgICAgIC5kYXRhKGRhdGEpXG4gICAgICAgIC5vbihcImxvZ2ljLmNoYW5nZVwiLCB0aGlzLm9uKFwibG9naWMuY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJmaWx0ZXIuY2hhbmdlXCIsIHRoaXMub24oXCJmaWx0ZXIuY2hhbmdlXCIpKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIG9wdGlvbl92aWV3KHRhcmdldClcbiAgICAgICAgLmRhdGEob3B0aW9ucylcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIHRoaXMub24oXCJ2aWV3LmNoYW5nZVwiKSApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgY29uZGl0aW9uYWxfc2hvdyh0YXJnZXQpXG4gICAgICAgIC5kYXRhKG9wdGlvbnMpXG4gICAgICAgIC5jbGFzc2VkKFwidmlldy1vcHRpb25cIix0cnVlKVxuICAgICAgICAuZHJhdygpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgIGlmICgheC5zZWxlY3RlZCkgcmV0dXJuXG5cbiAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwiZGF0YS12aWV3XCIpIHtcbiAgICAgICAgICAgIHZhciBkdiA9IGRvbWFpbl92aWV3KGR0aGlzKVxuICAgICAgICAgICAgICAub3B0aW9ucyh0YWJzKVxuICAgICAgICAgICAgICAuZGF0YShkYXRhKVxuICAgICAgICAgICAgICAub24oXCJzZWxlY3RcIiwgc2VsZi5vbihcInRhYi5jaGFuZ2VcIikgKVxuICAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcIm1lZGlhLXZpZXdcIikge1xuICAgICAgICAgICAgbWVkaWFfcGxhbi5tZWRpYV9wbGFuKGR0aGlzLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xNXB4XCIpLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCItMTVweFwiKSlcbiAgICAgICAgICAgICAuZGF0YShkYXRhKVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcImJhLXZpZXdcIikge1xuICAgICAgICAgICAgcmVsYXRpdmVfdmlldyhkdGhpcylcbiAgICAgICAgICAgICAuZGF0YShzZWxmLmJlZm9yZSgpKVxuICAgICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgICAgICAgc3RhZ2VkX2ZpbHRlcnMgPSBzdGFnZWRfZmlsdGVycy5zcGxpdChcIixcIikuY29uY2F0KHgua2V5IHx8IHgudXJsKS5maWx0ZXIoeCA9PiB4Lmxlbmd0aCkuam9pbihcIixcIilcbiAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKShzdGFnZWRfZmlsdGVycylcbiAgICAgICAgICAgICAgIEhBQ0tidWlsZFN0YWdlZEZpbHRlcihzdGFnZWRfZmlsdGVycylcblxuICAgIFxuICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwic3VtbWFyeS12aWV3XCIpIHtcbiAgICAgICAgICAgIHN1bW1hcnlfdmlldyhkdGhpcylcbiAgICAgICAgICAgICAuZGF0YShzZWxmLnN1bW1hcnkoKSlcbiAgICAgICAgICAgICAudGltaW5nKHNlbGYudGltZV9zdW1tYXJ5KCkpXG4gICAgICAgICAgICAgLmNhdGVnb3J5KHNlbGYuY2F0ZWdvcnlfc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC5iZWZvcmUoc2VsZi5iZWZvcmUoKSlcbiAgICAgICAgICAgICAuYWZ0ZXIoc2VsZi5hZnRlcigpKVxuICAgICAgICAgICAgIC5rZXl3b3JkcyhzZWxmLmtleXdvcmRfc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC5vbihcImJhLnNvcnRcIixzZWxmLm9uKFwiYmEuc29ydFwiKSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJ0aW1pbmctdmlld1wiKSB7XG4gICAgICAgICAgICB0aW1pbmdfdmlldyhkdGhpcylcbiAgICAgICAgICAgICAuZGF0YShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuICAgICAgZnVuY3Rpb24gSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZCkge1xuXG4gICAgICAgIHN0YWdlZF9maWx0ZXJfdmlldyh0YXJnZXQpXG4gICAgICAgICAgLmRhdGEoc3RhZ2VkKVxuICAgICAgICAgIC5vbihcInVwZGF0ZVwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKSh4KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9uKFwibW9kaWZ5XCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKFwiXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwibW9kaWZ5LWZpbHRlclwiKSh4KVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAub24oXCJhZGRcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoXCJcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJhZGQtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZHJhdygpXG4gICAgICB9XG4gICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCBuZXdfZGFzaGJvYXJkIGZyb20gJy4vbmV3X2Rhc2hib2FyZCdcblxudmFyIGRlZXBjb3B5ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh4KSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYnVpbGQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRGFzaGJvYXJkKHRhcmdldClcbn1cblxuY2xhc3MgRGFzaGJvYXJkIHtcblxuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICByZXR1cm4gdGhpcy5jYWxsLmJpbmQodGhpcylcbiAgfVxuXG4gIGNhbGwoKSB7XG4gICBsZXQgcyA9IHN0YXRlO1xuICAgbGV0IHZhbHVlID0gcy5zdGF0ZSgpXG5cbiAgIGxldCBkYiA9IG5ld19kYXNoYm9hcmQodGhpcy5fdGFyZ2V0KVxuICAgICAuc3RhZ2VkX2ZpbHRlcnModmFsdWUuc3RhZ2VkX2ZpbHRlciB8fCBcIlwiKVxuICAgICAuc2F2ZWQodmFsdWUuc2F2ZWQgfHwgW10pXG4gICAgIC5kYXRhKHZhbHVlLmZvcm1hdHRlZF9kYXRhIHx8IHt9KVxuICAgICAuYWN0aW9ucyh2YWx1ZS5hY3Rpb25zIHx8IFtdKVxuICAgICAuc2VsZWN0ZWRfYWN0aW9uKHZhbHVlLnNlbGVjdGVkX2FjdGlvbiB8fCB7fSlcbiAgICAgLnNlbGVjdGVkX2NvbXBhcmlzb24odmFsdWUuc2VsZWN0ZWRfY29tcGFyaXNvbiB8fCB7fSlcbiAgICAgLmFjdGlvbl9kYXRlKHZhbHVlLmFjdGlvbl9kYXRlIHx8IDApXG4gICAgIC5jb21wYXJpc29uX2RhdGUodmFsdWUuY29tcGFyaXNvbl9kYXRlIHx8IDApXG4gICAgIC5sb2FkaW5nKHZhbHVlLmxvYWRpbmcgfHwgZmFsc2UpXG4gICAgIC5saW5lX2l0ZW1zKHZhbHVlLmxpbmVfaXRlbXMgfHwgZmFsc2UpXG4gICAgIC5zdW1tYXJ5KHZhbHVlLnN1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC50aW1lX3N1bW1hcnkodmFsdWUudGltZV9zdW1tYXJ5IHx8IGZhbHNlKVxuICAgICAuY2F0ZWdvcnlfc3VtbWFyeSh2YWx1ZS5jYXRlZ29yeV9zdW1tYXJ5IHx8IGZhbHNlKVxuICAgICAua2V5d29yZF9zdW1tYXJ5KHZhbHVlLmtleXdvcmRfc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLmJlZm9yZSh2YWx1ZS5iZWZvcmVfdXJscyB8fCBbXSlcbiAgICAgLmFmdGVyKHZhbHVlLmFmdGVyX3VybHMgfHwgW10pXG4gICAgIC5sb2dpY19vcHRpb25zKHZhbHVlLmxvZ2ljX29wdGlvbnMgfHwgZmFsc2UpXG4gICAgIC5sb2dpY19jYXRlZ29yaWVzKHZhbHVlLmxvZ2ljX2NhdGVnb3JpZXMgfHwgZmFsc2UpXG4gICAgIC5maWx0ZXJzKHZhbHVlLmZpbHRlcnMgfHwgZmFsc2UpXG4gICAgIC52aWV3X29wdGlvbnModmFsdWUuZGFzaGJvYXJkX29wdGlvbnMgfHwgZmFsc2UpXG4gICAgIC5leHBsb3JlX3RhYnModmFsdWUudGFicyB8fCBmYWxzZSlcbiAgICAgLm9uKFwiYWRkLWZpbHRlclwiLCBmdW5jdGlvbihmaWx0ZXIpIHsgXG4gICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHMuc3RhdGUoKS5maWx0ZXJzLmNvbmNhdChmaWx0ZXIpLmZpbHRlcih4ID0+IHgudmFsdWUpICkgXG4gICAgIH0pXG4gICAgIC5vbihcIm1vZGlmeS1maWx0ZXJcIiwgZnVuY3Rpb24oZmlsdGVyKSB7IFxuICAgICAgIHZhciBmaWx0ZXJzID0gcy5zdGF0ZSgpLmZpbHRlcnNcblxuICAgICAgIHZhciBoYXNfZXhpc2l0aW5nID0gZmlsdGVycy5maWx0ZXIoeCA9PiAoeC5maWVsZCArIHgub3ApID09IChmaWx0ZXIuZmllbGQgKyBmaWx0ZXIub3ApIClcbiAgICAgICBcbiAgICAgICBpZiAoaGFzX2V4aXNpdGluZy5sZW5ndGgpIHtcbiAgICAgICAgIHZhciBuZXdfZmlsdGVycyA9IGZpbHRlcnMucmV2ZXJzZSgpLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgIGlmICgoeC5maWVsZCA9PSBmaWx0ZXIuZmllbGQpICYmICh4Lm9wID09IGZpbHRlci5vcCkpIHtcbiAgICAgICAgICAgICB4LnZhbHVlICs9IFwiLFwiICsgZmlsdGVyLnZhbHVlXG4gICAgICAgICAgIH1cbiAgICAgICAgICAgcmV0dXJuIHhcbiAgICAgICAgIH0pXG4gICAgICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIsbmV3X2ZpbHRlcnMuZmlsdGVyKHggPT4geC52YWx1ZSkpXG4gICAgICAgfSBlbHNlIHtcbiAgICAgICAgIHMucHVibGlzaChcImZpbHRlcnNcIixzLnN0YXRlKCkuZmlsdGVycy5jb25jYXQoZmlsdGVyKS5maWx0ZXIoeCA9PiB4LnZhbHVlKSlcbiAgICAgICB9XG5cbiAgICAgfSlcblxuICAgICAub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiLCBmdW5jdGlvbihzdHIpIHsgcy5wdWJsaXNoKFwic3RhZ2VkX2ZpbHRlclwiLHN0ciApIH0pXG4gICAgIC5vbihcImFjdGlvbi5jaGFuZ2VcIiwgZnVuY3Rpb24oYWN0aW9uKSB7IHMucHVibGlzaChcInNlbGVjdGVkX2FjdGlvblwiLGFjdGlvbikgfSlcbiAgICAgLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIsIGZ1bmN0aW9uKGRhdGUpIHsgcy5wdWJsaXNoKFwiYWN0aW9uX2RhdGVcIixkYXRlKSB9KVxuICAgICAub24oXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIsIGZ1bmN0aW9uKGRhdGUpIHsgcy5wdWJsaXNoKFwiY29tcGFyaXNvbl9kYXRlXCIsZGF0ZSkgfSlcbiAgICAgLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIiwgZnVuY3Rpb24oYWN0aW9uKSB7IFxuICAgICAgIGlmIChhY3Rpb24udmFsdWUgPT0gZmFsc2UpIHJldHVybiBzLnB1Ymxpc2goXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsZmFsc2UpXG4gICAgICAgcy5wdWJsaXNoKFwic2VsZWN0ZWRfY29tcGFyaXNvblwiLGFjdGlvbilcbiAgICAgfSlcbiAgICAgLm9uKFwibG9naWMuY2hhbmdlXCIsIGZ1bmN0aW9uKGxvZ2ljKSB7XG4gICAgICAgcy5wdWJsaXNoKFwibG9naWNfb3B0aW9uc1wiLGxvZ2ljKVxuICAgICB9KVxuICAgICAub24oXCJmaWx0ZXIuY2hhbmdlXCIsIGZ1bmN0aW9uKGZpbHRlcnMpIHtcblxuICAgICAgIHMucHVibGlzaEJhdGNoKHtcbiAgICAgICAgICAgXCJmaWx0ZXJzXCI6ZmlsdGVyc1xuICAgICAgIH0pXG4gICAgIH0pXG4gICAgIC5vbihcInZpZXcuY2hhbmdlXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICBkYi5sb2FkaW5nKHRydWUpXG4gICAgICAgdmFyIENQID0gZGVlcGNvcHkodmFsdWUuZGFzaGJvYXJkX29wdGlvbnMpXG4gICAgICAgQ1AubWFwKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgIGlmICh4LnZhbHVlID09IGQudmFsdWUpIHJldHVybiBkLnNlbGVjdGVkID0gMVxuICAgICAgICAgZC5zZWxlY3RlZCA9IDBcbiAgICAgICB9KVxuICAgICAgIHMucHVibGlzaChcImRhc2hib2FyZF9vcHRpb25zXCIsQ1ApXG4gICAgIH0pXG4gICAgIC5vbihcInRhYi5jaGFuZ2VcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgIGRiLmxvYWRpbmcodHJ1ZSlcbiAgICAgICB2YWx1ZS50YWJzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICAgICBpZiAodC5rZXkgPT0geC5rZXkpIHJldHVybiB0LnNlbGVjdGVkID0gMVxuICAgICAgICAgdC5zZWxlY3RlZCA9IDBcbiAgICAgICB9KVxuICAgICAgIHMucHVibGlzaFN0YXRpYyhcInRhYnNcIix2YWx1ZS50YWJzKVxuICAgICB9KVxuICAgICAub24oXCJiYS5zb3J0XCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICBzLnB1Ymxpc2goXCJzb3J0YnlcIix4LnZhbHVlKVxuICAgICAgIHMucHVibGlzaChcImZpbHRlcnNcIix2YWx1ZS5maWx0ZXJzKVxuICAgXG4gICAgIH0pXG4gICAgIC5kcmF3KClcbiAgIFxuICB9XG59XG4iLCIvL2ltcG9ydCAqIGFzIGQzIGZyb20gJ2QzJ1xuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXRlZ29yaWVzKHZhbHVlKSB7XG4gIHZhciBjYXRlZ29yaWVzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWV9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudW5pcXVlcyB9LDApXG4gICAgfSlcbiAgICAuZW50cmllcyh2YWx1ZS5mdWxsX3VybHMpXG5cbiAgdmFyIHRvdGFsID0gY2F0ZWdvcmllcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy52YWx1ZXMgfSwwKVxuXG4gIGNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnZhbHVlID0geC52YWx1ZXNcbiAgICB4LnBlcmNlbnQgPSB4LnZhbHVlIC8gdG90YWxcbiAgfSlcblxuICB2YWx1ZVtcImRpc3BsYXlfY2F0ZWdvcmllc1wiXSA9IHtcbiAgICAgIFwia2V5XCI6XCJDYXRlZ29yaWVzXCJcbiAgICAsIFwidmFsdWVzXCI6IGNhdGVnb3JpZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5ICE9IFwiTkFcIiB9KVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhdGVnb3J5SG91cih2YWx1ZSkge1xuICB2YXIgY2F0ZWdvcnlfaG91ciA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICsgeC5ob3VyICsgeC5taW51dGV9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHZbMF0ucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgLCBcImhvdXJcIjogdlswXS5ob3VyXG4gICAgICAgICwgXCJtaW51dGVcIjogdlswXS5taW51dGUgXG4gICAgICAgICwgXCJjb3VudFwiOnYucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMuY291bnQgfSwwKVxuICAgICAgfVxuICAgIH0pXG4gICAgLmVudHJpZXModmFsdWUuZnVsbF91cmxzKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICB2YWx1ZVtcImNhdGVnb3J5X2hvdXJcIl0gPSBjYXRlZ29yeV9ob3VyXG4gXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERhdGEoZGF0YSxidWNrZXRzLHBvcF9jYXRlZ29yaWVzKSB7XG5cbiAgdmFyIHRpbWVzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnRpbWVfZGlmZl9idWNrZXQgfSlcbiAgICAubWFwKGRhdGEuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIlwiIH0pIClcblxuICB2YXIgY2F0cyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgIC5tYXAoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuXG5cblxuXG4gIHZhciB0aW1lX2NhdGVnb3JpZXMgPSBidWNrZXRzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjXSA9IHt9OyByZXR1cm4gcCB9LCB7fSlcbiAgdmFyIGNhdGVnb3J5X3RpbWVzID0gT2JqZWN0LmtleXMoY2F0cykucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2NdID0ge307IHJldHVybiBwIH0sIHt9KVxuXG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgIC5lbnRyaWVzKGRhdGEuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIlwiIH0pIClcbiAgICAubWFwKGZ1bmN0aW9uKHJvdykge1xuICAgICAgcm93LnZhbHVlcy5tYXAoZnVuY3Rpb24odCkge1xuICAgICAgICB0LnBlcmNlbnQgPSBkMy5zdW0odC52YWx1ZXMsZnVuY3Rpb24oZCl7IHJldHVybiBkLnVuaXF1ZXN9KS8gZDMuc3VtKHRpbWVzW3Qua2V5XSxmdW5jdGlvbihkKSB7cmV0dXJuIGQudW5pcXVlc30pIFxuICAgICAgICB0aW1lX2NhdGVnb3JpZXNbdC5rZXldW3Jvdy5rZXldID0gdC5wZXJjZW50XG4gICAgICAgIGNhdGVnb3J5X3RpbWVzW3Jvdy5rZXldW3Qua2V5XSA9IHQucGVyY2VudFxuXG4gICAgICB9KVxuICAgICAgcmV0dXJuIHJvd1xuICAgIH0pXG4gICAgLnNvcnQoZnVuY3Rpb24oYSxiKSB7IHJldHVybiAoKHBvcF9jYXRlZ29yaWVzW2Iua2V5XSB8fCB7fSkubm9ybWFsaXplZF9wb3AgfHwgMCktICgocG9wX2NhdGVnb3JpZXNbYS5rZXldIHx8IHt9KS5ub3JtYWxpemVkX3BvcCB8fCAwKSB9KVxuXG5cbiAgdmFyIHRpbWVfbm9ybWFsaXplX3NjYWxlcyA9IHt9XG5cbiAgZDMuZW50cmllcyh0aW1lX2NhdGVnb3JpZXMpLm1hcChmdW5jdGlvbih0cm93KSB7XG4gICAgdmFyIHZhbHVlcyA9IGQzLmVudHJpZXModHJvdy52YWx1ZSkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgfSlcbiAgICB0aW1lX25vcm1hbGl6ZV9zY2FsZXNbdHJvdy5rZXldID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oW2QzLm1pbih2YWx1ZXMpLGQzLm1heCh2YWx1ZXMpXSlcbiAgICAgIC5yYW5nZShbMCwxXSlcbiAgfSlcblxuICB2YXIgY2F0X25vcm1hbGl6ZV9zY2FsZXMgPSB7fVxuXG4gIGQzLmVudHJpZXMoY2F0ZWdvcnlfdGltZXMpLm1hcChmdW5jdGlvbih0cm93KSB7XG4gICAgdmFyIHZhbHVlcyA9IGQzLmVudHJpZXModHJvdy52YWx1ZSkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgfSlcbiAgICBjYXRfbm9ybWFsaXplX3NjYWxlc1t0cm93LmtleV0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbZDMubWluKHZhbHVlcyksZDMubWF4KHZhbHVlcyldKVxuICAgICAgLnJhbmdlKFswLDFdKVxuICB9KVxuXG4gIGNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uKHApIHtcbiAgICB2YXIgY2F0ID0gcC5rZXlcbiAgICBwLnZhbHVlcy5tYXAoZnVuY3Rpb24ocSkge1xuICAgICAgcS5ub3JtX2NhdCA9IGNhdF9ub3JtYWxpemVfc2NhbGVzW2NhdF0ocS5wZXJjZW50KVxuICAgICAgcS5ub3JtX3RpbWUgPSB0aW1lX25vcm1hbGl6ZV9zY2FsZXNbcS5rZXldKHEucGVyY2VudClcblxuICAgICAgcS5zY29yZSA9IDIqcS5ub3JtX2NhdC8zICsgcS5ub3JtX3RpbWUvM1xuICAgICAgcS5zY29yZSA9IHEubm9ybV90aW1lXG5cbiAgICAgIHZhciBwZXJjZW50X3BvcCA9IHBvcF9jYXRlZ29yaWVzW2NhdF0gPyBwb3BfY2F0ZWdvcmllc1tjYXRdLnBlcmNlbnRfcG9wIDogMFxuXG4gICAgICBxLnBlcmNlbnRfZGlmZiA9IChxLnBlcmNlbnQgLSBwZXJjZW50X3BvcCkvcGVyY2VudF9wb3BcblxuICAgIH0pXG4gIH0pXG5cbiAgcmV0dXJuIGNhdGVnb3JpZXNcbn1cbiIsImltcG9ydCAqIGFzIHN0YXRlIGZyb20gJ3N0YXRlJ1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZShxc19zdGF0ZSxfc3RhdGUpIHtcblxuICB2YXIgdXBkYXRlcyA9IHt9XG5cblxuICBzdGF0ZS5jb21wX2V2YWwocXNfc3RhdGUsX3N0YXRlLHVwZGF0ZXMpXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInNlbGVjdGVkX2FjdGlvblwiXG4gICAgICAsICh4LHkpID0+IHkuYWN0aW9ucy5maWx0ZXIoeiA9PiB6LmFjdGlvbl9pZCA9PSB4LnNlbGVjdGVkX2FjdGlvbilbMF1cbiAgICAgICwgKHgseSkgPT4geS5zZWxlY3RlZF9hY3Rpb25cbiAgICApXG4gICAgLmZhaWx1cmUoXCJzZWxlY3RlZF9hY3Rpb25cIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcInNlbGVjdGVkX2FjdGlvblwiOiBfbmV3XG4gICAgICB9KVxuICAgIH0pXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInNlbGVjdGVkX3ZpZXdcIlxuICAgICAgLCAoeCx5KSA9PiB4LnNlbGVjdGVkX3ZpZXdcbiAgICAgICwgKF8seSkgPT4geS5kYXNoYm9hcmRfb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZSBcbiAgICApXG4gICAgLmZhaWx1cmUoXCJzZWxlY3RlZF92aWV3XCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7XG4gICAgICAvLyB0aGlzIHNob3VsZCBiZSByZWRvbmUgc28gaXRzIG5vdCBkaWZmZXJlbnQgbGlrZSB0aGlzXG4gICAgICBPYmplY3QuYXNzaWduKG9iaiwge1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJkYXNoYm9hcmRfb3B0aW9uc1wiOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9ucykpLm1hcCh4ID0+IHsgXG4gICAgICAgICAgICB4LnNlbGVjdGVkID0gKHgudmFsdWUgPT0gX25ldyk7IFxuICAgICAgICAgICAgcmV0dXJuIHggXG4gICAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgICAuYWNjZXNzb3IoXG4gICAgICAgIFwic2VsZWN0ZWRfY29tcGFyaXNvblwiXG4gICAgICAsICh4LHkpID0+IHkuYWN0aW9ucy5maWx0ZXIoeiA9PiB6LmFjdGlvbl9pZCA9PSB4LnNlbGVjdGVkX2NvbXBhcmlzb24pWzBdXG4gICAgICAsICh4LHkpID0+IHkuc2VsZWN0ZWRfY29tcGFyaXNvblxuICAgIClcbiAgICAuZmFpbHVyZShcInNlbGVjdGVkX2NvbXBhcmlzb25cIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcInNlbGVjdGVkX2NvbXBhcmlzb25cIjogX25ld1xuICAgICAgfSlcbiAgICB9KVxuICAgIC5lcXVhbChcImZpbHRlcnNcIiwgKHgseSkgPT4gSlNPTi5zdHJpbmdpZnkoeCkgPT0gSlNPTi5zdHJpbmdpZnkoeSkgKVxuICAgIC5mYWlsdXJlKFwiZmlsdGVyc1wiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHtcbiAgICAgICAgICBcImxvYWRpbmdcIjogdHJ1ZVxuICAgICAgICAsIFwiZmlsdGVyc1wiOiBfbmV3IHx8IFt7fV1cbiAgICAgIH0pXG4gICAgfSlcbiAgICAuZmFpbHVyZShcImFjdGlvbl9kYXRlXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmoseyBsb2FkaW5nOiB0cnVlLCBcImFjdGlvbl9kYXRlXCI6IF9uZXcgfSlcbiAgICB9KVxuICAgIC5mYWlsdXJlKFwiY29tcGFyaXNvbl9kYXRlXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmoseyBsb2FkaW5nOiB0cnVlLCBcImNvbXBhcmlzb25fZGF0ZVwiOiBfbmV3IH0pXG4gICAgfSlcblxuICAgIC5ldmFsdWF0ZSgpXG5cbiAgdmFyIGN1cnJlbnQgPSBzdGF0ZS5xcyh7fSkudG8oX3N0YXRlLnFzX3N0YXRlIHx8IHt9KVxuICAgICwgcG9wID0gc3RhdGUucXMoe30pLnRvKHFzX3N0YXRlKVxuXG4gIGlmIChPYmplY3Qua2V5cyh1cGRhdGVzKS5sZW5ndGggJiYgY3VycmVudCAhPSBwb3ApIHtcbiAgICByZXR1cm4gdXBkYXRlc1xuICB9XG5cbiAgcmV0dXJuIHt9XG4gIFxufVxuIiwiLy9leHBvcnQge2RlZmF1bHQgYXMgZGFzaGJvYXJkfSBmcm9tIFwiLi9zcmMvZGFzaGJvYXJkXCI7XG4vL2V4cG9ydCB7ZGVmYXVsdCBhcyBmaWx0ZXJfZGFzaGJvYXJkfSBmcm9tIFwiLi9zcmMvZmlsdGVyX2Rhc2hib2FyZFwiO1xuZXhwb3J0IHtkZWZhdWx0IGFzIG5ld19kYXNoYm9hcmR9IGZyb20gXCIuL3NyYy9uZXdfZGFzaGJvYXJkXCI7XG5leHBvcnQge2RlZmF1bHQgYXMgYnVpbGR9IGZyb20gXCIuL3NyYy9idWlsZFwiO1xuaW1wb3J0ICogYXMgZCBmcm9tIFwiLi9zcmMvZGF0YVwiO1xuXG5leHBvcnQgbGV0IGRhdGEgPSBkO1xuXG5leHBvcnQgKiBmcm9tIFwiLi9zcmMvZGF0YV9oZWxwZXJzXCI7XG5cbmltcG9ydCAqIGFzIHMgZnJvbSAnLi9zcmMvc3RhdGUnO1xuXG5leHBvcnQgbGV0IHN0YXRlID0gcztcblxuXG4iLCJ2YXIgdmVyc2lvbiA9IFwiMC4wLjFcIjsgZXhwb3J0ICogZnJvbSBcIi4uL2luZGV4XCI7IGV4cG9ydCB7dmVyc2lvbn07Il0sIm5hbWVzIjpbInN0YXRlIiwibm9vcCIsImlkZW50aXR5Iiwia2V5IiwiYWNjZXNzb3IiLCJkM191cGRhdGVhYmxlIiwiZDNfc3BsYXQiLCJkMyIsImZpbHRlciIsInNlbGVjdCIsInQiLCJwcmVwRGF0YSIsInAiLCJ0aW1lc2VyaWVzWydkZWZhdWx0J10iLCJ0aW1lc2VyaWVzLnByZXBEYXRhIiwiYnVja2V0cyIsImQzX2NsYXNzIiwic3RhdGUucXMiLCJyZWxhdGl2ZV92aWV3IiwidGltaW5nX3ZpZXciLCJzdGFnZWRfZmlsdGVyX3ZpZXciLCJzIiwiYnVpbGRDYXRlZ29yaWVzIiwic3RhdGUuY29tcF9ldmFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFPLFNBQVMsS0FBSyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUU7O0VBRXZDLElBQUksQ0FBQyxLQUFLLEdBQUcsV0FB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QUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztTQUN0QixLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQztTQUMzQixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztTQUNsQixPQUFPLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssSUFBSSxHQUFHLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzSCxPQUFPLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssS0FBSyxHQUFHLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOztNQUVqSSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7TUFDaEIsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDOztNQUV0QixJQUFJLElBQUksR0FBR0UsSUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUU7U0FDMUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEIsSUFBSSxDQUFDLEdBQUdBLElBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQ0EsSUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzFFLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO1lBQzVDQSxJQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzs7WUFFdEQsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMzR0EsSUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDOztZQUUvRSxJQUFJLFVBQVUsRUFBRTtjQUNkLFVBQVUsR0FBRyxLQUFLLENBQUM7Y0FDbkIsVUFBVSxDQUFDLFdBQVc7Z0JBQ3BCLFVBQVUsR0FBRyxJQUFJLENBQUM7Z0JBQ2xCLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7a0JBQ2hGLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2tCQUNwQyxJQUFJLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztpQkFFbEMsQ0FBQyxDQUFDOzs7ZUFHSixDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ047O1NBRUosQ0FBQyxDQUFDOztNQUVMLElBQUksU0FBUyxHQUFHRixlQUFhLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7U0FDdEMsS0FBSyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUM7U0FDNUIsS0FBSyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUM7U0FDMUIsS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7U0FDdkIsS0FBSyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7U0FDN0IsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUM7U0FDdEIsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUM7U0FDakIsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUM7U0FDdEIsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7U0FDbkIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxVQUFVO1dBQ3ZCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7V0FDM0csS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUMzRyxDQUFDO1NBQ0QsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVO1dBQ3RCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7V0FDM0csS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FB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QU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7WUFDbkMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBOzs7UUFHcEQsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUU7V0FDakMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7V0FDL0QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDOztRQUVqQixJQUFJLFFBQVEsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7V0FDOUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1dBQ3RFLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBOztRQUUzRSxJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztXQUMxRixJQUFJLENBQUMsV0FBVyxFQUFFLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFB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QUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztNQUN6SCxTQUFTLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7OztFQUczSCxJQUFJLFlBQVksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUs7TUFDNUQsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDekQsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7TUFDdEMsT0FBTyxNQUFNO0tBQ2QsQ0FBQyxDQUFDLFFBQVEsQ0FBQztHQUNiLENBQUMsQ0FBQyxDQUFDLENBQUE7O0VBRUosSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLO01BQzFELElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsU0FB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LENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0NBQzlFLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztFQUNkLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQ2MsU0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtFQUMvRCxPQUFPLENBQUM7Q0FDVCxDQUFDLENBQUE7O0FBRUYsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFOztFQUU3RCxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUk7SUFDbEcsSUFBSSxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO01BQzFMLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO01BQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFBO01BQ1osTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSTtRQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FDdEMsQ0FBQyxDQUFBO0tBQ0g7SUFDRCxPQUFPLENBQUM7R0FDVCxDQUFDLENBQUE7RUFDRixPQUFPLENBQUM7Q0FDVCxDQUFDLEVBQUUsQ0FBQyxDQUFBOzs7QUFHTCxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0VBQzVGLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQ0EsU0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFB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
