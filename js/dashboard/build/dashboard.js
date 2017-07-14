(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3'], factory) :
	(factory((global.dashboard = global.dashboard || {}),global.d3));
}(this, (function (exports,d3$1) { 'use strict';

function __$styleInject(css, returnValue) {
  if (typeof document === 'undefined') {
    return returnValue;
  }
  css = css || '';
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';
  if (style.styleSheet){
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  head.appendChild(style);
  return returnValue;
}

d3$1 = d3$1 && 'default' in d3$1 ? d3$1['default'] : d3$1;

const d3_updateable = function(target,selector,type,data,joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(
    function(x){return data ? [data] : [x]},
    joiner || function(x){return [x]}
  );

  updateable.enter()
    .append(type);

  return updateable
};

const d3_splat = function(target,selector,type,data,joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(
    data || function(x){return x},
    joiner || function(x){return x}
  );

  updateable.enter()
    .append(type);

  return updateable
};

function d3_class(target,cls,type,data) {
  return d3_updateable(target,"." + cls, type || "div",data)
    .classed(cls,true)
}

function noop$2() {}
function identity(x) { return x }


function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val;
  return this
}

class D3ComponentBase {
  constructor(target) {
    this._target = target;
    this._on = {};
    this.props().map(x => {
      this[x] = accessor.bind(this,x);
    });
  }
  props() {
    return ["data"]
  }
  on(action,fn) {
    if (fn === undefined) return this._on[action] || noop$2;
    this._on[action] = fn;
    return this
  }
}

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
      var fn = this._events[name]; 
      return fn.bind(this)
    }
  , dispatchEvent: function(name,data) {
      var fn = this.prepareEvent(name);
      fn(data);
      return this
    }

};

function state$1(_current, _static) {
  return new State(_current, _static)
}

state$1.prototype = State.prototype;

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

var noop$3 = (x) => {};
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
      , success: success || noop$3
      , failure: failure || noop$3
    };
    return this
  }

  _eval(comparison,name) {
    var acc1 = comparison.acc1 || acc(name)
      , acc2 = comparison.acc2 || acc(name,true)
      , val1 = acc1(this._obj1,this._obj2)
      , val2 = acc2(this._obj1,this._obj2)
      , eq = comparison.eq || eqop
      , succ = comparison.success || noop$3
      , fail = comparison.failure || noop$3;

    var _evald = eq(val1, val2);

    _evald ? 
      succ.bind(this)(val1,val2,this._final) : 
      fail.bind(this)(val1,val2,this._final);
  }

  
}

// debugger
const s = window.__state__ || state$1();
window.__state__ = s;

//import d3 from 'd3'

/* FROM OTHER FILE */


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
    x.value = Math.log(x.tf_idf);
  });
  values = values.sort(function(p,c) { return c.tf_idf - p.tf_idf });


  var total = d3.sum(values,function(x) { return x.count*x.percent_unique});

  values.map(function(x) { 
    x.pop_percent = 1.02/getIDF(x.key)*100;
    x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent;

    x.percent = x.count*x.percent_unique/total*100;
  });

  var norm = d3.scale.linear()
    .range([0, d3.max(values,function(x){ return x.pop_percent})])
    .domain([0, d3.max(values,function(x){return x.percent})])
    .nice();

  values.map(function(x) {
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




function MediaPlan(target) {
  this._target = target;
  this._on = {};
}

function media_plan(target) {
  return new MediaPlan(target)
}

function transformData(data) {

  var ch = data.category_hour.filter(function(x) { return x.parent_category_name != "NA" });

  var category_hour = d3.nest()
    .key(function(x) { return x.parent_category_name + "," + x.hour })
    .rollup(function(v) {
      return v.reduce(function(p,c) {
        p.uniques = (p.uniques || 0) + c.uniques;
        p.count = (p.count || 0) + c.count;
     
        return p
      },{})
    })
    .entries(ch)
    .map(function(x) {
      return {
          "category": x.key.split(",")[0]
        , "hour": x.key.split(",")[1]
        , "count": x.values.count
        , "uniques": x.values.uniques
      }
    });

  var scaled = d3.nest()
    .key(function(x) { return x.category } )
    .rollup(function(v) {
      var min = d3.min(v,function(x) { return x.count })
        , max = d3.max(v,function(x) { return x.count });

       var scale = d3.scale.linear()
         .domain([min,max])
         .range([0,100]);
       
       var hours = d3.range(0,24);
       hours = hours.slice(-4,24).concat(hours.slice(0,20));//.slice(3).concat(hours.slice(0,3))

       return {
           "normed": hours.map(function(i) { return v[i] ? scale(v[i].count) : 0 })
         , "count": hours.map(function(i) { return v[i] ? v[i].count : 0 })
       }
       //return hourly
    })
    .entries(category_hour)
    .map(function(x) { x.total = d3.sum(x.values); return x});
    //.sort(function(p,c) { return c.total - p.total})

  return scaled
}

MediaPlan.prototype = {
    draw: function() {
      //debugger
      if (this.data().category_hour == undefined) return this

          var _d = this.data();
          _d.display_categories = _d.display_categories || {"values":[]};
          var dd = buildDomains(_d);

      var scaled = transformData(this.data());

      
      scaled.map(function(x) {

        x.count = x.values.count;
        x.values= x.values.normed;

      });


      this.render_left(scaled);
      this.render_right(dd,scaled);


      return this
    }
  , render_right: function(d,row_data) {

      var wrapper = d3_updateable$1(this._target,".rhs","div")
        .classed("rhs col-md-4",true);

      var head = d3_updateable$1(wrapper, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","20px")
        .text("About the plan");


      d3_updateable$1(wrapper,".desc","div")
        .classed("desc",true)
        .style("padding","10px")
        .text("Hindsight has automatically determined the best sites and times where you should be targeting users. The media plan presented below describes the optimizations that can be made to any prospecting or retargeting campaign to lower CPA and save money.");

      var plan_target = d3_updateable$1(wrapper,".plan-target","div",row_data,function(){return 1})
        .classed("plan-target",true)
        .style("line-height","20px")
        .style("min-height","100px");

      plan_target.exit().remove();


      if (row_data.length > 1) {
        var remainders = row_data.map(function(r) {
        
          var to_target = d3.sum(r.mask.map(function(x,i){ return x ? r.count[i] : 0}));
          var total = d3.sum(r.count);
          return {
              total: total
            , to_target: to_target
          }
        });

        var cut = d3.sum(remainders,function(x){ return x.to_target*1.0 });
        var total = d3.sum(remainders,function(x){ return x.total }); 
        var percent = cut/total;

        var head = d3_updateable$1(plan_target, "h3.summary","h3",function(x) { return [x]} , function(x) { return 1})
          .classed("summary",true)
          .style("margin-bottom","15px")
          .style("margin-top","20px")
          .text("Plan Summary");



        d3_updateable$1(plan_target,".what","div",function(x) { return [x]} , function(x) { return 1})
          .classed("what",true)
          .html(function(x) {
            return "<div style='font-weight:bold;width:200px;padding-left:10px;text-transform:uppercase;display:inline-block'>Potential Ads Served:</div>" + d3.format(",")(total)
          });

        d3_updateable$1(plan_target,".amount","div",function(x) { return [x]} , function(x) { return 1})
          .classed("amount",true)
          .html(function(x) {
            return "<div style='font-weight:bold;width:200px;padding-left:10px;text-transform:uppercase;display:inline-block'>Optimized Ad Serving:</div>" + d3.format(",")(cut) + " (" + d3.format("%")(percent) + ")"
          });

        d3_updateable$1(plan_target,".cpa","div",function(x) { return [x]} , function(x) { return 1})
          .classed("cpa",true)
          .html(function(x) {
            return "<div style='font-weight:bold;width:200px;padding-left:10px;text-transform:uppercase;display:inline-block'>Estimated CPA reduction:</div>" + d3.format("%")(1-percent)
          });





       
        return
      }

      var plan_target = d3_updateable$1(wrapper,".plan-details","div",row_data)
        .classed("plan-details",true)
        .style("line-height","20px")
        .style("min-height","160px");



      var head = d3_updateable$1(plan_target, "h3.details","h3")
        .classed("details",true)
        .style("margin-bottom","15px")
        .style("margin-top","20px")
        .text("Plan Details");




      d3_updateable$1(plan_target,".what","div")
        .classed("what",true)
        .html(function(x) {
          return "<div style='padding-left:10px;font-weight:bold;width:140px;text-transform:uppercase;display:inline-block'>Category:</div>" + x.key
        });

      d3_updateable$1(plan_target,".saving","div")
        .classed("saving",true)
        .html(function(x) {
          console.log(d.count);
          var percent = d3.sum(x.count,function(z,i) { return x.mask[i] ? 0 : z})/d3.sum(x.count,function(z,i) { return z });
          return "<div style='padding-left:10px;font-weight:bold;width:140px;text-transform:uppercase;display:inline-block'>Strategy savings:</div>" + d3.format("%")(percent)
        });

      var when = d3_updateable$1(plan_target,".when","div",false,function(){ return 1 })
        .classed("when",true)
        .style("text-transform","uppercase")
        .style("font-weight","bold")
        .style("display","inline-block")
        .style("width","280px")
        .html("<div style='padding-left:10px;width:140px;display:inline-block;vertical-align:top'>When to serve:</div>")
        .datum(function(x) {
          var bool = false;
          var pos = -1;
          var start_ends = x.mask.reduce(function(p,c) { 
              pos += 1;
              if (bool != c) {
                bool = c;
                p.push(pos);
              }
              return p
            },[]);
          var s = "";
          start_ends.map(function(x,i) {
            if ((i != 0) && ((i%2) == 0)) s += ", ";
            if (i%2) s += " - ";

            if (x == 0) s += "12am";
            else {
              var num = (x+1)%12;
              num = num == 0 ? 12 : num;
              s += num + ((x > 11) ? "pm" : "am");
            }
           
          });
          if ((start_ends.length) % 2) s += " - 12am";

          return s.split(", ")
        });

       var items = d3_updateable$1(when,".items","div")
         .classed("items",true)
         .style("width","140px")
         .style("display","inline-block");

       d3_splat$1(items,".item","div")
         .classed("item",true)
         .style("width","140px")
         .style("display","inline-block")
         .style("text-transform","none")
         .style("font-weight","normal")
         .text(String);



      var head = d3_updateable$1(wrapper, "h3.example-sites","h3")
        .classed("example-sites",true)
        .style("margin-bottom","15px")
        .style("margin-top","20px")
        .text("Example Sites");


       var rows = d3_splat$1(wrapper,".row","div",d.slice(0,15),function(x) { return x.key })
         .classed("row",true)
         .style("line-height","18px")
         .style("padding-left","20px")

         .text(function(x) {
           return x.key
         });

       rows.exit().remove();


    }
  , render_left: function(scaled) {


      var wrapper = d3_updateable$1(this._target,".lhs","div",scaled)
        .classed("lhs col-md-8",true);

      wrapper.exit().remove();

      var head = d3_updateable$1(wrapper, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","20px")
        .text("Media Plan (Category and Time Optimization)");

      
      var self = this;

      var head = d3_updateable$1(wrapper,".head","div")
        .classed("head",true)
        .style("height","21px");

      var name = d3_updateable$1(head,".name","div")
        .classed("name",true)
        .style("width","170px")
        .style("padding-left","5px")
        .style("display","inline-block")
        .style("line-height","20px")
        .style("vertical-align","top");

       d3_splat$1(head,".hour","div",d3.range(1,25),function(x) { return x })
        .classed("sq hour",true)
        .style("display","inline-block")
        .style("width","18px")
        .style("height","20px")
        .style("font-size",".85em")
        .style("text-align","center")
        .html(function(x) {
          if (x == 1) return "<b>1a</b>"
          if (x == 24) return "<b>12a</b>"
          if (x == 12) return "<b>12p</b>"
          return x > 11 ? x%12 : x
        });


      var row = d3_splat$1(wrapper,".row","div",false,function(x) { return x.key })
        .classed("row",true)
        .style("height","21px")
        .attr("class", function(x) { return x.key + " row" })
        .on("mouseover",function(x) {

          var _d = self.data();
          _d.display_categories = _d.display_categories || {"values":[]};
          var dd = buildDomains(_d);

          var d = dd.filter(function(z) { return z.parent_category_name == x.key});
          

          self.render_right(d,x);
        });

      var MAGIC = 25; 

      var name = d3_updateable$1(row,".name","div")
        .classed("name",true)
        .style("width","170px")
        .style("padding-left","5px")
        .style("display","inline-block")
        .style("line-height","20px")
        .style("vertical-align","top")
        .text(function(x) { return x.key });

      var colors = ["#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"];
      var colors = ["#238b45"];

      var o = d3.scale.ordinal()
        .domain([-25,100])
        .range(colors);

      var square = d3_splat$1(row,".sq","div",function(x) { return x.values }, function(x,i) { return i }) 
        .classed("sq",true)
        .style("display","inline-block")
        .style("width","18px")
        .style("height","20px")
        .style("background",function(x,i) { 
          var pd = this.parentNode.__data__; 
          pd.mask = pd.mask || [];
          pd.mask[i] = ((x > MAGIC) && ( (pd.values[i-1] > MAGIC || false) || (pd.values[i+1] > MAGIC|| false) ));
          //return pd.mask[i] ? o(pd.values[i])  : "repeating-linear-gradient( 45deg, #fee0d2, #fee0d2 2px, #fcbba1 5px, #fcbba1 2px) "
          return pd.mask[i] ? 
            "repeating-linear-gradient( 135deg, #238b45, #238b45 2px, #006d2c 5px, #006d2c 2px) " : 
            "repeating-linear-gradient( 45deg, #fee0d2, #fee0d2 2px, #fcbba1 5px, #fcbba1 2px) "

        });


    }
  , data: function(d) {
      if (d === undefined) return this._target.datum()
      this._target.datum(d);
      return this
    }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
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
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action];
      this._on[action] = fn;
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

function prepData(dd) {
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
function buildSummary(urls,comparison) {
  var summary_data = buildSummaryData(urls)
    , pop_summary_data = buildSummaryData(comparison);

  return buildSummaryAggregation(summary_data,pop_summary_data)
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

















// from data.js



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
        "tab_position"
      , (x,y) => x.tab_position
      , (_,y) => y.tab_position
    )
    .failure("tab_position", (_new,_old,obj) => {
      Object.assign(obj, { "tab_position": _new });
    })

    .accessor(
        "transform"
      , (x,y) => x.transform
      , (_,y) => y.transform
    )
    .failure("transform", (_new,_old,obj) => {
      Object.assign(obj, { "transform": _new });
    })



    .accessor(
        "sort"
      , (x,y) => x.sort
      , (_,y) => y.sort
    )
    .failure("sort", (_new,_old,obj) => {
      Object.assign(obj, { "sort": _new });
    })


    .accessor(
        "ascending"
      , (x,y) => x.ascending
      , (_,y) => y.ascending
    )
    .failure("ascending", (_new,_old,obj) => {
      Object.assign(obj, { "ascending": _new });
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

function accessor$2(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val;
  return this
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

function determineLogic(options) {
  const _default = options[0];
  const selected = options.filter(function(x) { return x.selected });
  return selected.length > 0 ? selected[0] : _default
}

function filterUrls(urls,logic,filters) {
  return filter_data(urls)
    .op("is in", ops["is in"])
    .op("is not in", ops["is not in"])
    .logic(logic.value)
    .by(filters)
}

function Select(target) {
  this._on = {};
  this.target = target;
}

function noop$6() {}
function identity$3(x) { return x }
function key$3(x) { return x.key }


function select(target) {
  return new Select(target)
}

Select.prototype = {
    options: function(val) {
      return accessor$2.bind(this)("options",val) 
    }
  , draw: function() {

      this._select = d3_updateable(this.target,"select","select",this._options);

      var bound = this.on("select").bind(this);

      this._select
        .on("change",function(x) { bound(this.selectedOptions[0].__data__); });

      this._options = d3_splat(this._select,"option","option",identity$3,key$3)
        .text(key$3)
        .property("selected", (x) => {

          console.log(this._selected,x.value);
          return (x.value && x.value == this._selected) ? 
            "selected" : x.selected == 1 ? 
            "selected" : null
         
        });

      return this
    }
  , selected: function(val) {
      return accessor$2.bind(this)("selected",val)
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$6;
      this._on[action] = fn;
      return this
    }
};

function noop$5() {}
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
      return accessor$2.bind(this)("text",val) 
    }


  , select_only: function(val) {
      return accessor$2.bind(this)("select_only",val) 
    }
  , options: function(val) {
      return accessor$2.bind(this)("options",val) 
    }
  , buttons: function(val) {
      return accessor$2.bind(this)("buttons",val) 
    }
  , expansion: function(val) {
      return accessor$2.bind(this)("expansion",val) 
    }
  , draw: function() {

      

      var wrap = d3_updateable(this.target, ".header-wrap","div")
        .classed("header-wrap",true);

      var expand_wrap = expansionWrap(wrap)
        , button_wrap = buttonWrap(wrap)
        , head_wrap = headWrap(wrap);

      if (this._select_only) {
        var bound = this.on("select").bind(this);

        

        var selectBox = select(head_wrap)
          .options(this._options)
          .on("select",function(x) { bound(x); })
          .draw();

        return
      }

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
      if (fn === undefined) return this._on[action] || noop$5;
      this._on[action] = fn;
      return this
    }
};

__$styleInject(".table-wrapper tr { height:33px}\n.table-wrapper tr th { border-right:1px dotted #ccc } \n.table-wrapper tr th:last-of-type { border-right:none } \n\n.table-wrapper tr { border-bottom:1px solid #ddd }\n.table-wrapper tr th, .table-wrapper tr td { \n  padding-left:10px;\n  max-width:200px\n}\n\n.table-wrapper thead tr { \n  background-color:#e3ebf0;\n}\n.table-wrapper thead tr th .title { \n  text-transform:uppercase\n}\n.table-wrapper tbody tr { \n}\n.table-wrapper tbody tr:hover { \n  background-color:white;\n  background-color:#f9f9fb\n}\n",undefined);

function Table(target) {
  this._wrapper_class = "table-wrapper";
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

  this._render_expand = function(d) {
    d3$1.select(this).selectAll("td.option-header").html("&ndash;");
    if (this.nextSibling && d3$1.select(this.nextSibling).classed("expanded") == true) {
      d3$1.select(this).selectAll("td.option-header").html("&#65291;");
      return d3$1.select(this.parentNode).selectAll(".expanded").remove()
    }

    d3$1.select(this.parentNode).selectAll(".expanded").remove();
    var t = document.createElement('tr');
    this.parentNode.insertBefore(t, this.nextSibling);  


    var tr = d3$1.select(t).classed("expanded",true).datum({});
    var td = d3_updateable(tr,"td","td")
      .attr("colspan",this.children.length);

    return td
  };
  this._render_header = function(wrap) {


    wrap.each(function(data) {
      var headers = d3_updateable(d3$1.select(this),".headers","div")
        .classed("headers",true)
        .style("text-transform","uppercase")
        .style("font-weight","bold")
        .style("line-height","24px")
        .style("border-bottom","1px solid #ccc")
        .style("margin-bottom","10px");

      headers.html("");


      d3_updateable(headers,".url","div")
        .classed("url",true)
        .style("width","75%")
        .style("display","inline-block")
        .text("Article");

      d3_updateable(headers,".count","div")
        .classed("count",true)
        .style("width","25%")
        .style("display","inline-block")
        .text("Count");


    });

  };
  this._render_row = function(row) {

      d3_updateable(row,".url","div")
        .classed("url",true)
        .style("width","75%")
        .style("line-height","24px")
        .style("height","24px")
        .style("overflow","hidden")
        .style("display","inline-block")
        .text(function(x) {return x.key});

      d3_updateable(row,".count","div")
        .classed("count",true)
        .style("width","25%")
        .style("display","inline-block")
        .style("vertical-align","top")
        .text(function(x){return x.value});

  };
}

function table$1(target) {
  return new Table(target)
}

Table.prototype = {

    data: function(val) { 
      var value = accessor.bind(this)("data",val); 
      if (val && val.values.length && this._headers == undefined) { 
        var headers = Object.keys(val.values[0]).map(function(x) { return {key:x,value:x} });
        this.headers(headers);
      }
      return value
    }
  , skip_option: function(val) { return accessor.bind(this)("skip_option",val) }
  , wrapper_class: function(val) { return accessor.bind(this)("wrapper_class",val) }


  , title: function(val) { return accessor.bind(this)("title",val) }
  , row: function(val) { return accessor.bind(this)("render_row",val) }
  , default_renderer: function(val) { return accessor.bind(this)("default_renderer",val) }
  , top: function(val) { return accessor.bind(this)("top",val) }

  , header: function(val) { return accessor.bind(this)("render_header",val) }
  , headers: function(val) { return accessor.bind(this)("headers",val) }
  , hidden_fields: function(val) { return accessor.bind(this)("hidden_fields",val) }
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
  , sort: function(key$$1,ascending) {
      if (!key$$1) return this._sort
      this._sort = {
          key: key$$1
        , value: !!ascending
      };
      return this
    }

  , render_wrapper: function() {
      var wrap = this._target;

      var wrapper = d3_updateable(wrap,"."+this._wrapper_class,"div")
        .classed(this._wrapper_class,true)
        .style("position","relative");


      var table = d3_updateable(wrapper,"table.main","table")
        .classed("main",true)
        .style("width","100%");

      this._table_main = table;

      var thead = d3_updateable(table,"thead","thead");
      d3_updateable(table,"tbody","tbody");



      var table_fixed = d3_updateable(wrapper,"table.fixed","table")
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


      var thead = d3_updateable(table_fixed,"thead","thead");

      if (!this._skip_option) {
        var table_button = d3_updateable(wrapper,".table-option","a")
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

      var options_thead = d3_updateable(thead,"tr.table-options","tr",this.all_headers(),function(x){ return 1})
        .classed("hidden", !this._show_options)
        .classed("table-options",true);

      var h = this._skip_option ? this.headers() : this.headers().concat([{key:"spacer", width:"70px"}]);
      var headers_thead = d3_updateable(thead,"tr.table-headers","tr",h,function(x){ return 1})
        .classed("table-headers",true);


      var th = d3_splat(headers_thead,"th","th",false,function(x,i) {return x.key + i })
        .style("width",function(x) { return x.width })
        .style("position","relative")
        .order();

      var defaultSort = function(x) {
          if (x.sort === false) {
            delete x['sort'];
            this._sort = {};
            this.draw();
          } else {
            x.sort = !!x.sort;

            this.sort(x.key,x.sort);
            this.draw();
          }
        }.bind(this);


      d3_updateable(th,"span","span")
        .classed("title",true)
        .style("cursor","pointer")
        .text(function(x) { return x.value })
        .on("click",this.on("sort") != noop$2 ? this.on("sort") : defaultSort);



      d3_updateable(th,"i","i")
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

      var draggable = d3_updateable(th,"b","b")
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
      var options = d3_updateable(options_thead,"th","th",false,function() { return 1})
        .attr("colspan",this.headers().length+1)
        .style("padding-top","10px")
        .style("padding-bottom","10px");
                
      var option = d3_splat(options,".option","div",false,function(x) { return x.key })
        .classed("option",true)
        .style("width","240px")
        .style("display","inline-block");


      option.exit().remove();

      var self = this;

      d3_updateable(option,"input","input")
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

      d3_updateable(option,"span","span")
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

      data = data.sort(function(p,c) {
        var a = p[sortby.key] || -Infinity
          , b = c[sortby.key] || -Infinity;

        return sortby.value ? d3$1.ascending(a,b) : d3$1.descending(a,b)
      });

      var rows = d3_splat(tbody,"tr","tr",data,function(x,i){ return String(sortby.key + x[sortby.key]) + i })
        .order()
        .on("click",function(x) {
          if (self.on("expand") != noop$2) {
            var td = self._render_expand.bind(this)(x);
            self.on("expand").bind(this)(x,td);
          }
        });

      rows.exit().remove();

      var td = d3_splat(rows,"td","td",this.headers(),function(x,i) {return x.key + i })
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

      var o = d3_updateable(rows,"td.option-header","td",false,function() { return 1})
        .classed("option-header",true)
        .style("width","70px")
        .style("text-align","center");
 
      if (this._skip_option) o.classed("hidden",true); 


      d3_updateable(o,"a","a")
        .style("font-weight","bold")
        .html(self.option_text());
        



    }
  , option_text: function(val) { return accessor.bind(this)("option_text",val) }
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

      this.on("draw").bind(this)();

      return this

    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$2;
      this._on[action] = fn;
      return this
    }
  , d3: d3$1
};

__$styleInject(".summary-table { \n  display:inline-block;\n  vertical-align:top;\n}\n.summary-table > .title {\n  font-weight:bold;\n  font-size:14px;\n}\n\n.summary-table .wrap {\n  width:100%\n}\n",undefined);

function summary_table(target) {
  return new SummaryTable(target)
}

class SummaryTable extends D3ComponentBase {
  constructor(target) {
    super(target);
    this._wrapper_class = "table-summary-wrapper";
  }

  props() { return ["title", "headers", "data", "wrapper_class"] }

  draw() {
    var urls_summary = d3_class(this._target,"summary-table");
      
    d3_class(urls_summary,"title")
      .text(this.title());

    var uwrap = d3_class(urls_summary,"wrap");


    table$1(uwrap)
      .wrapper_class(this.wrapper_class(),true)
      .data({"values":this.data()})
      .skip_option(true)
      .headers(this.headers())
      .draw();

  }
}

function noop$4() {}
function FilterView(target) {
  this._on = {
    select: noop$4
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
      return accessor$2.bind(this)("data",val) 
    }
  , logic: function(val) {
      return accessor$2.bind(this)("logic",val) 
    }
  , categories: function(val) {
      return accessor$2.bind(this)("categories",val) 
    }
  , filters: function(val) {
      return accessor$2.bind(this)("filters",val) 
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

      function selectizeInput(filter,value) {
        var self = this;
        
        var select$$1 = d3_updateable(filter,"input","input")
          .style("width","200px")
          .property("value",value.value);

        filter.selectAll(".selectize-control")
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

        filter.selectAll(".selectize-control")
          .on("destroy",function() {
            s[0].selectize.destroy();
          });

      }

      function selectizeSelect(filter,value) {
        var self = this;

        filter.selectAll(".selectize-control").remove();

        filter.selectAll(".selectize-control")
          .each(function(x) {
            var destroy = d3.select(this).on("destroy");
            if (destroy) destroy();
          });



    
        var select$$1 = d3_updateable(filter,"select.value","select")
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

        filter.selectAll(".selectize-control")
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
        .render_op("between",function(filter,value) {
          var self = this;
    
          value.value = typeof(value.value) == "object" ? value.value : [0,24];
    
          d3_updateable(filter,"input.value.low","input")
            .classed("value low",true)
            .style("margin-bottom","10px")
            .style("padding-left","10px")
            .style("width","90px")
            .attr("value", value.value[0])
            .on("keyup", function(x){
              var t = this;
            
              self.typewatch(function() {
                value.value[0] = t.value;
                self.on("update")(self.data());
              },1000);
            });
    
          d3_updateable(filter,"span.value-and","span")
            .classed("value-and",true)
            .text(" and ");
    
          d3_updateable(filter,"input.value.high","input")
            .classed("value high",true)
            .style("margin-bottom","10px")
            .style("padding-left","10px")
            .style("width","90px")
            .attr("value", value.value[1])
            .on("keyup", function(x){
              var t = this;
            
              self.typewatch(function() {
                value.value[1] = t.value;
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
      if (fn === undefined) return this._on[action] || noop$4;
      this._on[action] = fn;
      return this
    }
};

function noop$8() {}
function identity$5(x) { return x }
function key$5(x) { return x.key }

function ButtonRadio(target) {
  this._on = {};
  this.target = target;
}

function button_radio(target) {
  return new ButtonRadio(target)
}

ButtonRadio.prototype = {
    data: function(val) {
      return accessor$2.bind(this)("data",val) 
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$8;
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
  
    d3_splat(button_row,".show-button","a",identity$5, key$5)
      .classed("show-button",true)
      .classed("selected", function(x) { return x.selected })
      .text(key$5)
      .on("click", function(x) { bound(x); });

    return this
  
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
  return new OptionView(target)
}

OptionView.prototype = {
    data: function(val) {
      return accessor$2.bind(this)("data",val) 
    }
  , options: function(val) {
      return accessor$2.bind(this)("options",val) 
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
      if (fn === undefined) return this._on[action] || noop$7;
      this._on[action] = fn;
      return this
    }
};

function prepData$1() {
  return prepData.apply(this, arguments)
}

var EXAMPLE_DATA$1 = {
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
  this._data = EXAMPLE_DATA$1;
  this._on = {};
}

function time_series(target) {
  return new TimeSeries(target)
}

TimeSeries.prototype = {

    data: function(val) { return accessor$2.bind(this)("data",val) }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
  , title: function(val) { return accessor$2.bind(this)("title",val) }
  , height: function(val) { return accessor$2.bind(this)("height",val) }

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

class TabularHeader extends D3ComponentBase {
  constructor(target) {
    super();
    this._target = target;
    this.WIDTH = 144;
    this._label = "URL";
    this._headers = ["12am", "12pm", "12am"];
    this._xs = [0,this.WIDTH/2,this.WIDTH];
    this._anchors = ["start","middle","end"];
  }

  props() { return ["label","headers"] }

  draw() {

    var euh = d3_class(this._target,"expansion-urls-title");

    d3_class(euh,"title").text(this.label());
    d3_class(euh,"view").text("Views");

    var svg_legend = d3_class(euh,"legend","svg");

    if (this.headers().length == 2) {
      this._xs = [this.WIDTH/2-this.WIDTH/4,this.WIDTH/2+this.WIDTH/4];
      this._anchors = ["middle","middle"];
    }

    d3_splat(svg_legend,"text","text",this.headers(),(x,i) => { return i })
      .attr("y","20")
      .attr("x",(x,i) => this._xs[i])
      .style("text-anchor",(x,i) => this._anchors[i])
      .text(String);

    d3_splat(svg_legend,"line","line",this.headers(),(x,i) => { return i })
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", this.headers().length == 2 ? 0 : 25)
      .attr("y2", 35)
      .attr("x1",(x,i) => this.headers().length == 2 ? this.WIDTH/2 : this._xs[i])
      .attr("x2",(x,i) => this.headers().length == 2 ? this.WIDTH/2 : this._xs[i]);

  }
}

function simpleTimeseries(target,data,w,h,min) {
  var width = w || 120
    , height = h || 30;

  var x = d3.scale.ordinal().domain(d3.range(0,data.length)).range(d3.range(0,width,width/data.length));
  var y = d3.scale.linear().range([4,height]).domain([min || d3.min(data),d3.max(data)]);

  var wrap = d3_updateable(target,"g","g",data,function(x,i) { return 1});

  d3_splat(wrap,"rect","rect",x => x, (x,i) => i)
    .attr("x",(z,i) => x(i))
    .attr("width", width/data.length -1.2)
    .attr("y", z => height - y(z) )
    .attr("height", z => z ? y(z) : 0);

  return wrap

}

function before_after_timeseries(target) {
  return new BeforeAfterTimeseries(target)
}

class BeforeAfterTimeseries extends D3ComponentBase {

  constructor(target) {
    super(target);
    this._wrapper_class = "ba-timeseries-wrap";
  }

  props() { return ["data","before","after","wrapper_class"] }

  draw() {

    const tsw = 250
      , unit_size = tsw/this.data().length
      , before_pos = this.before()
      , after_pos = this.after();


    const timeseries = d3_class(this._target,this.wrapper_class(),"svg")
      .style("display","block")
      .style("margin","auto")
      .style("margin-bottom","30px")
      .attr("width",tsw + "px")
      .attr("height","70px");

    simpleTimeseries(timeseries,this.data(),tsw);

    // add decorations

    d3_class(timeseries,"middle","line")
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 0)
      .attr("y2", 55)
      .attr("x1", tsw/2)
      .attr("x2", tsw/2);

    d3_class(timeseries,"middle-text","text")
      .attr("x", tsw/2)
      .attr("y", 67)
      .style("text-anchor","middle")
      .text("On-site");

    d3_class(timeseries,"before","line")
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 39)
      .attr("y2", 45)
      .attr("x1", unit_size*before_pos)
      .attr("x2", unit_size*before_pos);

    d3_class(timeseries,"before-text","text")
      .attr("x", unit_size*before_pos - 8)
      .attr("y", 48)
      .style("text-anchor","end")
      .text("Consideration");

    d3_class(timeseries,"window","line")
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 45)
      .attr("y2", 45)
      .attr("x1", unit_size*(before_pos))
      .attr("x2", unit_size*(after_pos+1)+1);

    d3_class(timeseries,"after","line")
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 39)
      .attr("y2", 45)
      .attr("x1", unit_size*(after_pos+1))
      .attr("x2", unit_size*(after_pos+1));

    d3_class(timeseries,"after-text","text")
      .attr("x", unit_size*(after_pos+1) + 8)
      .attr("y", 48)
      .style("text-anchor","start")
      .text("Validation");




    return this
  }

}

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

function domain_bullet(target) {
  return new DomainBullet(target)
}

// data schema: [{pop_percent, sample_percent_norm}

class DomainBullet extends D3ComponentBase {
  constructor(target) {
    super();
    this.target = target;
  }
  props() { return ["data","max"] }

  draw() {
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
}

class TabularBody extends D3ComponentBase {
  constructor(target) {
    super();
    this._target = target;
  }

  props() { return ["data","split"] }

  draw() {
    let expansion_row = this._target;

    var expansion = d3_class(expansion_row,"expansion-urls")
        .classed("scrollbox",true);

    expansion.html("");

    var url_row = d3_splat(expansion,".url-row","div",this.data().slice(0,500),function(x) { return x.key })
      .classed("url-row",true);

    var url_name = d3_updateable(url_row,".name","div").classed("name",true);

    d3_updateable(url_name,"input","input")
      .attr("type","checkbox")
      .on("click", function(x) {
        self.on("stage-filter")(x);
      });

    d3_class(url_name,"url","a")
      .text(x => { return this.split() ? x.key.split(this.split())[1] || x.key : x.key })
      .attr("href", x => x.url ? x.url : undefined )
      .attr("target", "_blank");

    d3_updateable(url_row,".number","div").classed("number",true)
      .text(function(x) { return x.total });


    d3_updateable(url_row,".plot","svg").classed("plot",true)
      .each(function(x) {
        var dthis = d3.select(this);
        var values = x.values || x.value;
        simpleTimeseries(dthis,values,144,20);
      });

  }
}

__$styleInject(".expansion-urls-title {\n  height:36px;\n  line-height:36px;\n  display:inline-block;\n  vertical-align:top;\n}\n.expansion-urls-title .title {\n  width:265px;\n  font-weight:bold;\n  display:inline-block;\n  vertical-align:top;\n}\n\n.expansion-urls-title .view {\n  width:40px;\n  margin-left:20px;\n  margin-right:20px;\n  font-weight:bold;\n  display:inline-block;\n  vertical-align:top;\n}\n.expansion-urls-title .legend {\n  width:144px;\n  height:36px;\n  vertical-align:top;\n}\n\n.scrollbox {\n  display:inline-block;\n  vertical-align:top;\n  max-height:250px;\n  overflow:scroll;\n}\n\n.url-row .name {\n  width:260px;\n  overflow:hidden;\n  line-height:20px;\n  height:20px;\n  display:inline-block;\n}\n\n.url-row input {\n      margin-right:10px;\n      display:inline-block;\n      vertical-align:top;\n}\n\n.url-row .url {\n      display:inline-block;\n      text-overflow:ellipsis;\n      width:205px;\n}\n\n.url-row .number {\n      width:40px;\n      height:20px;\n      line-height:20px;\n      vertical-align:top;\n      text-align:center;\n      font-size:13px;\n      font-weight:bold;\n      margin-left:20px;\n      margin-right:20px;\n      display:inline-block;\n}\n\n.url-row .plot {\n      width:144px;\n      height:20px;\n      display:inline-block;\n}\n",undefined);

function tabular_timeseries(target) {
  return new TabularTimeseries(target)
}

class TabularTimeseries extends D3ComponentBase {
  constructor(target) {
    super();
    this._target = target;
    this._headers = ["12am","12pm","12am"];
  }

  props() { return ["data","label","split","headers"] }

  draw() {
    let td = this._target;

    var title_row = d3_class(td,"title-row");
    var expansion_row = d3_class(td,"expansion-row");

    var header = (new TabularHeader(title_row))
      .label(this.label())
      .headers(this.headers())
      .draw();

    var body = (new TabularBody(expansion_row))
      .data(this.data())
      .split(this.split() || false)
      .draw();

  }
}

__$styleInject(".action-header {\n  text-align:center;\n  font-size:16px;\n  font-weight:bold;\n  padding:10px;\n}\n\n.url-depth, .kw-depth {\n  width:50%;\n  display:inline-block;\n}\n",undefined);

let allbuckets = [];
const hourbuckets = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x);

var minutes = [0,20,40];
const buckets = d3.range(0,24).reduce((p,c) => {
  minutes.map(x => {
    p[c + ":" + x] = 0;
  });
  allbuckets = allbuckets.concat(minutes.map(z => c + ":" + z));
  return p
},{});


const STOPWORDS = ["that","this","what","best","most","from","your","have","first","will","than","says","like","into","after","with"];

function rawToUrl(data) {
  return data.reduce((p,c) => {
      p[c.url] = p[c.url] || Object.assign({},buckets);
      p[c.url][c.hour] = (p[c.url][c.hour] || 0) + c.count;
      return p
    },{})
}

function urlToDraw(urls) {
  var obj = {};
  Object.keys(urls).map(k => {
    obj[k] = hourbuckets.map(b => urls[k][b] || 0);
  });

  return d3.entries(obj)
    .map(function(x){
      x.url = x.key;
      x.total = d3.sum(x.value);
      return x
    }) 
}

function drawToKeyword(draw,split) {
  let obj = draw
    .reduce(function(p,c){
      c.key.toLowerCase().split(split)[1].split("/").reverse()[0].replace("_","-").split("-").map(x => {
        var values = STOPWORDS;
        if (x.match(/\d+/g) == null && values.indexOf(x) == -1 && x.indexOf(",") == -1 && x.indexOf("?") == -1 && x.indexOf(".") == -1 && x.indexOf(":") == -1 && parseInt(x) != x && x.length > 3) {
          p[x] = p[x] || {};
          Object.keys(c.value).map(q => { p[x][q] = (p[x][q] || 0) + (c.value[q] || 0); });
        }
      });

      return p
    },{}); 

  return d3.entries(obj)
    .map(x => {
      x.values = Object.keys(x.value).map(z => x.value[z] || 0);
      x.total = d3.sum(x.values);
      return x
    })

}

function domain_expanded(target) {
  return new DomainExpanded(target)
}

class DomainExpanded extends D3ComponentBase {
  constructor(target) {
    super();
    this._target = target;
  }

  props() { return ["raw","data","urls","domain"] }

  draw() {
    let td = this._target;

    d3_class(td,"action-header")
      .text("Explore and Refine");

    let urlData = rawToUrl(this.raw());
    let to_draw = urlToDraw(urlData);
    let kw_to_draw = drawToKeyword(to_draw,this.domain());

    tabular_timeseries(d3_class(td,"url-depth"))
      .label("URL")
      .data(to_draw)
      .split(this.domain())
      .draw();

    tabular_timeseries(d3_class(td,"kw-depth"))
      .label("Keywords")
      .data(kw_to_draw)
      .draw();
        
  }
}

__$styleInject(".vertical-options {\n  width:120px;\n  text-align:center;\n}\n\n.vertical-options .show-button {\n  line-height:18px;\n  width:100px;\n  font-size:10px;\n  margin-bottom:5px;\n}\n.vertical-options .show-button.selected {\n  background: #e3ebf0;  \n  color: #555;\n}\n",undefined);

function vertical_option(target) {
  return new VerticalOption(target)
}

//[{key, value, selected},...]

class VerticalOption extends D3ComponentBase {
  constructor(target) {
    super();
    this._target = target;
    this._options = [];
    this._wrapper_class = "vertical-options";
  }

  props() { return ["options","wrapper_class"] }

  draw() {
    var opts = d3_class(this._target,this.wrapper_class(),"div",this.options());
      
     d3_splat(opts,".show-button","a",this.options(),x => x.key)
      .classed("show-button",true)
      .classed("selected",x => x.selected)
      .text(x => x.key)
      .on("click",this.on("click") ); 

    return this
  }
}

class DomainView extends D3ComponentBase {
  constructor(target) {
    super(target);
  }

  props() { return ["data", "options", "sort", "ascending"] }

  draw() {

    var self = this;

    var _explore = this._target
      , tabs = this.options()
      , data = this.data()
      , filtered = tabs.filter(function(x){ return x.selected})
      , selected = filtered.length ? filtered[0] : tabs[0];

    const headers = [
          {key:"key",value: selected.key.replace("Top ",""),locked:true,width:"200px"}
        , {key:"sample_percent",value:"Segment",selected:false}
        , {key:"real_pop_percent",value:"Baseline",selected:false}
        , {key:"ratio",value:"Ratio",selected:false}
        , {key:"importance",value:"Importance",selected:false}
        , {key:"value",value:"Segment versus Baseline",locked:true}
      ];//.filter((x) => !!selected.values[0][x.key])

    const samp_max = d3.max(selected.values,function(x){return x.sample_percent_norm})
      , pop_max = d3.max(selected.values,function(x){return x.pop_percent})
      , max = Math.max(samp_max,pop_max);


    const _default = "importance";
    const s = this.sort(); 
    const asc = this.ascending(); 


    const selectedHeader = headers.filter(x => x.key == s);
    const sortby = selectedHeader.length ? selectedHeader[0].key : _default;



    header(_explore)
      .text(selected.key )
      .options(tabs)
      .on("select", function(x) { this.on("select")(x); }.bind(this))
      .draw();

    _explore.selectAll(".vendor-domains-bar-desc").remove();
    _explore.datum(data);

    var t = table$1(_explore)
      .top(140)
      .data(selected)
      .headers( headers)
      .sort(sortby,asc)
      .on("sort", this.on("sort"))
      .option_text("&#65291;")
      .on("expand",function(d,td) {

        var dd = this.parentElement.__data__.full_urls.filter(function(x) { return x.domain == d.key});
        var rolled = prepData$1(dd);
        
        domain_expanded(td)
          .domain(dd[0].domain)
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
      
    t.draw();
    

    return this

  }

}

function domain_view(target) {
  return new DomainView(target)
}

function noop$9() {}
function SegmentView(target) {
  this._on = {
    select: noop$9
  };
  this.target = target;
}

function segment_view(target) {
  return new SegmentView(target)
}

SegmentView.prototype = {
    data: function(val) {
      return accessor$2.bind(this)("data",val) 
    }
  , segments: function(val) {
      return accessor$2.bind(this)("segments",val) 
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
      return accessor$2.bind(this)("action_date",val)
    }
  , action: function(val) {
      return accessor$2.bind(this)("action",val)
    }
  , comparison_date: function(val) {
      return accessor$2.bind(this)("comparison_date",val)
    }

  , comparison: function(val) {
      return accessor$2.bind(this)("comparison",val)
    }
  , is_loading: function(val) {
      return accessor$2.bind(this)("is_loading",val)
    }

  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$9;
      this._on[action] = fn;
      return this
    }
};

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

  key_accessor(val) { return accessor$2.bind(this)("key_accessor",val) }
  value_accessor(val) { return accessor$2.bind(this)("value_accessor",val) }
  bar_height(val) { return accessor$2.bind(this)("bar_height",val) }
  bar_width(val) { return accessor$2.bind(this)("bar_width",val) }



  data(val) { return accessor$2.bind(this)("data",val) } 
  title(val) { return accessor$2.bind(this)("title",val) } 


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

  key_accessor(val) { return accessor$2.bind(this)("key_accessor",val) }
  pop_value_accessor(val) { return accessor$2.bind(this)("pop_value_accessor",val) }
  samp_value_accessor(val) { return accessor$2.bind(this)("samp_value_accessor",val) }

  bar_height(val) { return accessor$2.bind(this)("bar_height",val) }
  bar_width(val) { return accessor$2.bind(this)("bar_width",val) }



  data(val) { return accessor$2.bind(this)("data",val) } 
  title(val) { return accessor$2.bind(this)("title",val) } 


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

  key_accessor(val) { return accessor$2.bind(this)("key_accessor",val) }
  value_accessor(val) { return accessor$2.bind(this)("value_accessor",val) }

  height(val) { return accessor$2.bind(this)("height",val) }
  space(val) { return accessor$2.bind(this)("space",val) }
  middle(val) { return accessor$2.bind(this)("middle",val) }
  buckets(val) { return accessor$2.bind(this)("buckets",val) }

  rows(val) { return accessor$2.bind(this)("rows",val) }
  after(val) { return accessor$2.bind(this)("after",val) }




  data(val) { return accessor$2.bind(this)("data",val) } 
  title(val) { return accessor$2.bind(this)("title",val) } 

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
    this._middle = 180;
    this._color = d3.scale.ordinal()
      .range(
['#999','#aaa','#bbb','#ccc','#ddd','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','rgba(33, 113, 181,.9)','rgba(8, 81, 156,.91)','#08519c','rgba(8, 48, 107,.9)','#08306b'].reverse());

  } 

  key_accessor(val) { return accessor$2.bind(this)("key_accessor",val) }
  value_accessor(val) { return accessor$2.bind(this)("value_accessor",val) }
  height(val) { return accessor$2.bind(this)("height",val) }
  width(val) { return accessor$2.bind(this)("width",val) }
  middle(val) { return accessor$2.bind(this)("middle",val) }
  skip_middle(val) { return accessor$2.bind(this)("skip_middle",val) }




  data(val) { return accessor$2.bind(this)("data",val) } 
  title(val) { return accessor$2.bind(this)("title",val) } 


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
      .range(d3.range(0,width+10,width/(buckets.length-1)));
  
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
      .attr("width", width*2+this._middle)
      .attr("height", height + 100);

    this._svg = svg;
  
    var before = d3_updateable(svg,".before-canvas","g")
      .attr("class","before-canvas")
      .attr("transform", "translate(-1,60)");

    function hoverCategory(cat,time) {
      if (cat === false) {
        self.on("category.hover")(false);
      }
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

    function mOver(x) {
      hoverCategory.bind(this)(x[0].key);
    }
    function mOut(x) {
      hoverCategory.bind(this)(false);
      apaths.style("opacity",undefined);
      bpaths.style("opacity",undefined);
    }
    function click(x) {
        var bool = apaths.on("mouseover") == mOver;

        apaths.on("mouseover",bool ? noop$2: mOver);
        apaths.on("mouseout",bool ? noop$2: mOut);
        bpaths.on("mouseover",bool ? noop$2: mOver);
        bpaths.on("mouseout",bool ? noop$2: mOut);

    }

    var bpaths = d3_splat(b,"path","path", before_stacked,function(x,i) { return x[0].key})
      .attr("d", barea)
      .attr("class", function(x) { return x[0].key})
      .style("fill", function(x,i) { return color(x[0].key); })
      .on("mouseover",mOver)
      .on("mouseout",mOut)
      .on("click",click);

    bpaths.exit().remove();

    var brect = d3_splat(b,"rect","rect",buckets.slice().reverse(),(x,i) => i)
      .attr("x",z => xreverse(z))
      .attr("width",1)
      .attr("height",height)
      .attr("y",0)
      .attr("opacity","0");



      

    var middle = d3_updateable(svg,".middle-canvas","g")
      .attr("class","middle-canvas")
      .attr("transform","translate(" + (width + this._middle/2) + ",60)")
      .style("display",this._skip_middle ? "none": "inherit");
  
  
  
    var after = d3_updateable(svg,".after-canvas","g")
      .attr("class","after-canvas")
      .attr("transform", "translate(" + (width + this._middle) + ",60)");

    var a = d3_updateable(after,"g","g");

    
  
    var apaths = d3_splat(a,"path","path",after_stacked,function(x,i) { return x[0].key})
      .attr("d", aarea)
      .attr("class", function(x) { return x[0].key})
      .style("fill", function(x,i) { return color(x[0].key); })
      .on("mouseover",mOver)
      .on("mouseout",mOut)
      .on("click",click);


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
    if (fn === undefined) return this._on[action] || noop$2;
    this._on[action] = fn;
    return this
  }
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


function drawStreamSkinny(target,before,after,filter) {

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

  var before = d3_class(target,"before-stream");


  var inner = d3_updateable(before,".inner","div")
    .classed("inner",true);


  var stream = stream_plot(inner)
    .width(341)
    .middle(0)
    .skip_middle(true)
    .data(data)
    .on("category.hover",function(x,time) {
      filter(x);
      if (x === false) {
        d3.select(".details-wrap").html("");
        return 
      }
      var b = data.before_stacked.filter(y => y[0].key == x);
      var a = data.after_stacked.filter(y => y[0].key == x);

      var volume = extractData(b,a,buckets,function(c) { return c.values.length })
        , percent = extractData(b,a,buckets,function(c) { return c.percent })
        , importance = extractData(b,a,buckets,function(c) { return c.y });


      var wrap = d3.select(".details-wrap")
        , title = d3_updateable(wrap,"text.cat-title","text")
            .text(x)
            .attr("class","cat-title")
            .style("text-anchor","middle")
            .style("font-weight","bold")
            .attr("x",125)
            .attr("y",10)
        , vwrap = d3_updateable(wrap,".volume","g")
            .attr("class","volume")
            .attr("transform","translate(15,30)");


      d3_updateable(vwrap,"text","text").text("Visits: " + d3.sum(volume) )
        .attr("style","title");

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

  var mline = d3_updateable(svg,"g.m-line-wrap","g")
    .attr("class","m-line-wrap");

  d3_updateable(mline,"line","line")
    .attr("stroke-width",30)
    .attr("stroke","white")
    .attr("y1", 60)
    .attr("y2", stream._height+60)
    .attr("x1", 341)
    .attr("x2", 341);

  var m = d3_updateable(mline,"g","g")
    .attr("writing-mode","tb-rl")
    .attr("transform","translate(341," + (stream._height/2 + 60) + ")");

  d3_updateable(m,"text","text")
    .text("User activity on your site")
    .style("text-anchor","middle");




  var title = d3_updateable(svg,".main-title","text")
    .attr("x","341")
    .attr("y","30")
    .style("text-anchor","middle")
    .style("font-weight","bold")
    .attr("class","main-title")
    .text("Category Importance of User's Journey to site (hover to explore, click to select)");

  var title = d3_updateable(svg,".second-title","text")
    .attr("x","341")
    .attr("y","345")
    .style("text-anchor","middle")
    .style("font-weight","bold")
    .attr("class","second-title")
    .text("Time weighted volume");




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
    .attr("y", 20)
    .attr("x", stream._before_scale(before_line) - 10)
    .style("text-anchor","end")
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
    .attr("y", 20)
    .attr("x", stream._after_scale(after_line) + 10)
    .style("text-anchor","start")
    .text("Validation / Research");



  return {
    "consideration": "" + before_line,
    "validation": "-" + after_line
  }
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

function Pie(target) {
  this.target = target;
}

Pie.prototype = {
    radius: function(val) {
      return accessor$2.bind(this)("radius",val)
    }
  , data: function(val) {
      return accessor$2.bind(this)("data",val) 
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

function buildSummaryBlock(data, target, radius_scale, x) {
  var data = data
    , dthis = d3_class(d3.select(target),"pie-summary-block");

  pie(dthis)
    .data(data)
    .radius(radius_scale(data.population))
    .draw();

  var fw = d3_class(dthis,"fw")
    .classed("fw",true);

  var fw2 = d3_class(dthis,"fw2")
    .text(d3.format("%")(data.sample/data.population));

  d3_class(fw,"sample","span")
    .text(d3.format(",")(data.sample));

  d3_class(fw,"vs","span")
    .html("<br> out of <br>")
    .style("font-size",".88em");

  d3_class(fw,"population","span")
    .text(d3.format(",")(data.population));

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

__$styleInject(".summary-view .table-wrapper { background:#e3ebf0; padding-top:5px; padding-bottom:10px }\n.summary-view .table-wrapper tr { border-bottom:none }\n.summary-view .table-wrapper thead tr { background:none }\n.summary-view .table-wrapper tbody tr:hover { background:none }\n.summary-view .table-wrapper tr td { border-right:1px dotted #ccc;text-align:center }\n.summary-view .table-wrapper tr td:last-of-type { border-right:none }\n\n.summary-view .ts-row,\n.summary-view .pie-row,\n.summary-view .cat-row,\n.summary-view .key-row,\n.summary-view .ba-row,\n.summary-view .stream-ba-row {\n  padding-bottom:10px\n}\n\n.ba-row .table-wrapper tr th {\n    padding-top:20px\n  }\n\n.ba-row .table-wrapper tr.expanded th {\n  padding-top:0px\n}\n\n.timing-row .table-wrapper tr.expanded th, \n.ba-row .table-wrapper tr.expanded th, \n.ba-row .table-wrapper tr.expanded td  {\n  width:31px;\n  max-width:200px\n}\n\n.timing-row .table-wrapper tr th, \n.timing-row .table-wrapper tr td, \n.ba-row .table-wrapper tr th, \n.ba-row .table-wrapper tr td  {\n  width:31px;\n  max-width:31px\n}\n\n\n.timing-row .table-wrapper tr th:first-of-type, \n.ba-row .table-wrapper tr th:first-of-type, \n.ba-row .table-wrapper tr td:first-of-type {\n  width:300px;\n}\n\n.dash-row > div {\n  display: inline-block;\n  width: 50%;\n  padding: 0px 10px 10px; \n  background-color: rgb(227, 235, 240);\n}\n.dash-row > div > h3 {\n  font-size: 12px;\n  color: rgb(51, 51, 51);\n  line-height: 33px;\n  background-color: rgb(227, 235, 240);\n  margin-left: -10px;\n  margin-bottom: 10px;\n  padding-left: 10px;\n  margin-top: 0px;\n  font-weight: bold;\n  text-transform: uppercase;\n  \n}\n\n.pie-summary-block .fw {\n    width:50px;\n    display:inline-block;\n    vertical-align:top;\n    padding-top:3px;\n    text-align:center;\n    line-height:16px;\n}\n\n.pie-summary-block .fw2 {\n    width:60px;\n    display:inline-block;\n    vertical-align:top;\n    padding-top:3px;\n    text-align:center;\n    font-size:22px;\n    font-weight:bold;\n    line-height:40px;\n}\n",undefined);

function summary_view(target) {
  return new SummaryView(target)
}

class SummaryView extends D3ComponentBase {
  constructor(target) {
    super(target);
  }

  props() { return ["data", "timing", "category", "keywords", "before", "after"] }

  draw() {
    var wrap = d3_class(this._target,"summary-view");

    header(wrap)
      .text("Summary")
      .draw();

    var tswrap = d3_class(wrap,"ts-row")
      , piewrap = d3_class(wrap,"pie-row")
      , catwrap = d3_class(wrap,"cat-row").classed("dash-row",true)
      , keywrap = d3_class(wrap,"key-row")
      , bawrap = d3_class(wrap,"ba-row") 
      , streamwrap = d3_class(wrap,"stream-ba-row"); 


    var radius_scale = d3.scale.linear()
      .domain([this._data.domains.population,this._data.views.population])
      .range([20,35]);

    table$1(piewrap)
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


    //drawStream(streamwrap,this._before.before_categories,this._before.after_categories)


    return this
  }
}

class DataSelector extends D3ComponentBase {
  constructor(target) {
    super(target);
  }

  props() { return ["transforms","datasets","selected_transform"] }

  draw() {
    var transform_selector = d3_class(this._target,"transform");

    select(d3_class(transform_selector,"header","span"))
      .options(this.datasets())
      .on("select", this.on("dataset.change") )
      .draw();

    select(d3_class(transform_selector,"trans","span"))
      .options(this.transforms())
      .on("select", this.on("transform.change") )//function(x){ self.on("transform.change").bind(this)(x) })
      .selected(this.selected_transform() )
      .draw();

    var toggle = d3_class(transform_selector,"show-values");

    d3_updateable(toggle,"span","span")
      .text("show values? ");

    d3_updateable(toggle,"input","input")
      .attr("type","checkbox")
      .on("change",this.on("toggle.values"));

    var toggle = d3_class(transform_selector,"filter-values");

    d3_updateable(toggle,"span","span")
      .text("live filter? ");

    d3_updateable(toggle,"input","input")
      .attr("type","checkbox")
      .attr("disabled",true)
      .attr("checked","checked");

    return this
  }
}               

function data_selector(target) {
  return new DataSelector(target)
}

class ObjectSelector extends D3ComponentBase {
  constructor(target) {
    super(target);
    this._selections = [];
  }

  props() { return ["selectAll","key"] }

  add(x) {
    this._selections.push(x);
    this.on("add")(this._selections);
  }
  remove(x) {
    var index = this._selections.indexOf(x);
    this._selections.splice(index,1);
    this.on("remove")(this._selections);
  }

  draw() {

    const self = this;

    function click(x,i,skip) {

      var bool = d3.select(this).classed("selected");

      if (!skip) {
        if (bool == false) self.add(self.key()(x,i));
        if (bool == true) self.remove(self.key()(x,i));

        d3.select(this).classed("selected",!bool);
      }


      self.on("interact").bind(this)(self.key()(x,i),skip ? [self.key()(x,i)] : self._selections);

    }

    this._target
      .selectAll(this._selectAll)
      .on("mouseover", function(x,i) {
        if (self._selections.length == 0) click.bind(this)(x,i,true);
      })
      .on("mouseout", function(x,i) {
        if (self._selections.length == 0) {
          click.bind(this)(x,i,true);
          self.on("mouseout").bind(this)(x,i);
        }
      })
      .on("click", function(x,i) {
        click.bind(this)(x,i);
        self.on("click").bind(this)(self.key()(x,i), self._selections);
      });


    return this
  }
}               

function object_selector(target) {
  return new ObjectSelector(target)
}

var buckets$1 = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) });
buckets$1 = buckets$1.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }));

 

// Rollup overall before and after data

const bucketWithPrefix = (prefix,x) => prefix + x.time_diff_bucket;
const sumVisits = (x) => d3.sum(x,y => y.visits); 

function rollupBeforeAndAfter(before_urls, after_urls) {

  const before_rollup = d3.nest()
    .key(bucketWithPrefix.bind(this,""))
    .rollup(sumVisits)
    .map(before_urls);

  const after_rollup = d3.nest()
    .key(bucketWithPrefix.bind(this,"-"))
    .rollup(sumVisits)
    .map(after_urls);

  return buckets$1.map(x => before_rollup[x] || after_rollup[x] || 0)
}




// Keyword processing helpers

const STOPWORDS$1 =[
    "that","this","what","best","most","from","your"
  , "have","first","will","than","says","like","into","after","with"
];
const cleanAndSplitURL = (domain,url) => {
  return url.toLowerCase().split(domain)[1].split("/").reverse()[0].replace("_","-").split("-")
};
const isWord = (x) => {
  return x.match(/\d+/g) == null && 
    x.indexOf(",") == -1 && 
    x.indexOf("?") == -1 && 
    x.indexOf(".") == -1 && 
    x.indexOf(":") == -1 && 
    parseInt(x) != x && 
    x.length > 3
};


const urlReducer = (p,c) => {
  p[c.url] = (p[c.url] || 0) + c.visits;
  return p
};
const urlBucketReducer = (prefix, p,c) => {
  p[c.url] = p[c.url] || {};
  p[c.url]["url"] = c.url;

  p[c.url][prefix + c.time_diff_bucket] = c.visits;
  return p
};
const urlToKeywordsObjReducer = (domain, p,c) => {
  cleanAndSplitURL(domain,c.key).map(x => {
    if (isWord(x) && STOPWORDS$1.indexOf(x) == -1) {
      p[x] = p[x] || {};
      p[x].key = x;
      Object.keys(c.value).map(q => {
        p[x][q] = (p[x][q] || 0) + c.value[q];
      });
    }
  });
  return p
};

function urlsAndKeywords(before_urls, after_urls, domain) {

    const url_volume = {};
    before_urls.reduce(urlReducer,url_volume);
    after_urls.reduce(urlReducer,url_volume);

    const url_ts = {};
    before_urls.reduce(urlBucketReducer.bind(this,""),url_ts);
    after_urls.reduce(urlBucketReducer.bind(this,"-"),url_ts);

    const urls = d3.entries(url_volume)
      .sort((p,c) => { return d3.descending(p.value,c.value) })
      .slice(0,1000)
      .map(x => url_ts[x.key])
      .map(function(x){ 
        x.key = x.url;
        x.values = buckets$1.map(y => x[y] || 0);
        x.total = d3.sum(buckets$1.map(function(b) { return x[b] || 0 }));
        return x
      });

    const keywords = {};
    d3.entries(url_ts)
      .reduce(urlToKeywordsObjReducer.bind(false,domain),keywords);
    
    
    const kws = Object.keys(keywords)
      .map(function(k) { return Object.assign(keywords[k],{key:k}) })
      .map(function(x){
        x.values = buckets$1.map(y => x[y] || 0);
        x.total = d3.sum(buckets$1.map(function(b) { return x[b] || 0 }));
        return x
      }).sort((p,c) => {
        return c.total - p.total
      });

    return {
      urls,
      kws
    }

}

function validConsid(sorted_urls, sorted_kws, before_pos, after_pos) {
    const consid_buckets = buckets$1.filter((x,i) => !((i < before_pos) || (i > buckets$1.length/2 - 1 )) );
    const valid_buckets  = buckets$1.filter((x,i) => !((i < buckets$1.length/2 ) || (i > after_pos)) );
    function containsReducer(x,p,c) {
      p += x[c] || 0;
      return p
    }
    function filterByBuckets(_buckets,x) {
      return _buckets.reduce(containsReducer.bind(false,x),0)
    }
    var urls_consid = sorted_urls.filter( filterByBuckets.bind(false,consid_buckets) )
      , kws_consid = sorted_kws.filter( filterByBuckets.bind(false,consid_buckets) );

    var urls_valid = sorted_urls.filter( filterByBuckets.bind(false,valid_buckets) )
      , kws_valid = sorted_kws.filter( filterByBuckets.bind(false,valid_buckets) );

    return {
        urls_consid
      , urls_valid
      , kws_consid
      , kws_valid
    }
}




// Build data for summary

function numViews(data) { 
  return data.length 
}
function avgViews(data) {
  return parseInt(data.reduce((p,c) => p + c.total,0)/data.length)
}
function medianViews(data) {
  return (data[parseInt(data.length/2)] || {}).total || 0
}
function summarizeViews(name, fn, all, consid, valid) {
  return {name: name, all: fn(all), consideration: fn(consid), validation: fn(valid)}
}
function summarizeData(all,consid,valid) {
  return [
      summarizeViews("Distinct URLs",numViews,all,consid,valid)
    , summarizeViews("Average Views",avgViews,all,consid,valid)
    , summarizeViews("Median Views",medianViews,all,consid,valid)
  ]
}



// Process relative timing data

function processData(before_urls, after_urls, before_pos, after_pos, domain) {

    const { urls , kws } = urlsAndKeywords(before_urls, after_urls, domain);
    const { urls_consid , urls_valid , kws_consid , kws_valid } = validConsid(urls, kws, before_pos, after_pos);

    const url_summary = summarizeData(urls, urls_consid, urls_valid);
    const kws_summary = summarizeData(kws, kws_consid, kws_valid );

    return {
      url_summary,
      kws_summary,
      urls,
      urls_consid ,
      urls_valid ,
      kws,
      kws_consid ,
      kws_valid 
    }
}

__$styleInject(".refine-relative .summary-row {\n  margin-bottom:15px;\n  position:relative;\n}\n\n.refine-relative .tables-row .url, .refine-relative .tables-row .kw {\n  width:50%;\n  display:inline-block;\n  vertical-align:top;\n}\n\n.refine-relative .action-header {\n  text-align:center;\n  font-size:16px;\n  font-weight:bold;\n  padding:10px;\n}\n\n.refine-relative .summary-row > .title {\n  font-size:16px;\n  font-weight:bold;\n  text-align:center;\n  line-height:40px;\n  margin-bottom:5px;\n}\n.refine-relative .description {\n  font-size:12px;\n  position:absolute;\n  width:120px;\n  top:35px;\n  right:200px;\n}\n\n.refine-relative .vertical-options {\n  text-align:center;\n  position:absolute;\n  width:120px;\n  top:35px;\n  left:200px;\n}\n",undefined);

function selectOptionRect(td,options,before_pos,after_pos) {

  var subset = td.selectAll("svg").selectAll("rect")
    .attr("fill",undefined).filter((x,i) => {
      var value = options.filter(x => x.selected)[0].value;
      if (value == "all") return false
      if (value == "consideration") return (i < before_pos) || (i > buckets$1.length/2 - 1 )
      if (value == "validation") return (i < buckets$1.length/2 ) || (i > after_pos)
    });

  subset.attr("fill","grey");
}


function refine_relative(target) {
  return new RefineRelative(target)
}

class RefineRelative extends D3ComponentBase {
  constructor(target) {
    super(target);
    this._options = [
        {"key":"All","value":"all", "selected":1}
      , {"key":"Consideration","value":"consideration", "selected":0}
      , {"key":"Validation","value":"validation", "selected":0}
    ];
    this._summary_headers = [
        {"key":"name","value":""}
      , {"key":"all","value":"All"}
      , {"key":"consideration","value":"Consideration"}
      , {"key":"validation","value":"Validation"}
    ];
  }

  props() { return ["data","domain","stages","before_urls","after_urls","summary_headers","options"] }

  draw() {

    var td = d3_class(this._target,"refine-relative");
    var before_urls = this._before_urls
      , after_urls = this._after_urls
      , d = this._data
      , stages = this._stages
      , summary_headers = this._summary_headers
      , options = this._options;

    var before_pos, after_pos;

    buckets$1.map(function(x,i) {
       if (stages.consideration == x) before_pos = i;
       if (stages.validation == x) after_pos = i;
    });

    var overall_rollup = rollupBeforeAndAfter(before_urls, after_urls);
    var {
        url_summary
      , urls
      , urls_consid
      , urls_valid

      , kws_summary
      , kws
      , kws_consid
      , kws_valid 

    } = processData(before_urls,after_urls,before_pos,after_pos,this._domain);


    const summary_row = d3_class(td,"summary-row");

    d3_class(summary_row,"title")
      .text("Before and After: " + this._domain);

    before_after_timeseries(summary_row)
      .data(overall_rollup)
      .before(before_pos)
      .after(after_pos)
      .draw();

    var voptions = vertical_option(summary_row)
      .options(options)
      .on("click",function(x) {

        options.map(z => z.selected = x.key == z.key ? 1: 0);
        voptions
          .options(options) 
          .draw();

        selectOptionRect(td,options,before_pos,after_pos);
      })
      .draw();

    d3_class(summary_row,"description")
      .text("Select domains and keywords to build and refine your global filter");




    const tables = d3_class(td,"tables-row");

    summary_table(d3_class(tables,"url"))
      .title("URL Summary")
      .data(url_summary)
      .headers(summary_headers)
      .draw();

    summary_table(d3_class(tables,"kw"))
      .title("Keyword Summary")
      .data(kws_summary)
      .headers(summary_headers)
      .draw();




    const modify = d3_class(td,"modify-row");

    d3_class(modify,"action-header")
      .text("Explore and Refine");

    tabular_timeseries(d3_class(modify,"url-depth"))
      .headers(["Before","After"])
      .label("URL")
      .data(urls)
      .split(this.domain())
      .draw();

    tabular_timeseries(d3_class(modify,"kw-depth"))
      .headers(["Before","After"])
      .label("Keywords")
      .data(kws)
      .draw();

  }

}

var buckets$2 = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) });
buckets$2 = buckets$2.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }));

const timeBuckets = buckets$2;


const formatName = function(x) {

  if (x < 0) x = -x;

  if (x == 3600) return "1 hr"
  if (x < 3600) return x/60 + " mins" 

  if (x == 86400) return "1 day"
  if (x > 86400) return x/86400 + " days" 

  return x/3600 + " hrs"
};

const timingHeaders = buckets$2.map(x => { return {"key":x, "value":formatName(x), "selected":true} });

function normalizeRowSimple(row) {

  var items = 0;

  var mean = timeBuckets.reduce((p,c) => {
    if (row[c] && row[c] != "") {
      items ++; 
      p += row[c] || 0;
    }
    return p
  },0)/items;

  timeBuckets.map(b => {
    if (row[b]) row[b] = row[b] > mean ? 
      Math.round((row[b] - mean)/mean*10)/10 : 
      Math.round(-(mean - row[b])/mean*10)/10;
  });

  return row
}

function normalizeByCategory(categories) {

  return function normalize(row) {
    const cat_idf = ((categories[row.parent_category_name] && categories[row.parent_category_name].idf)  || 0.032) * 100000;
    let idf = row.idf == "NA" ? 14345/100 : row.idf;
    idf = (row.key.split(".")).length > 2 ? idf*.1 : idf;

    timeBuckets.map(b => {

      if (row[b]) row[b] = Math.log(1 + (row[b]/Math.sqrt(row.total))*(row[b]*row[b])*(idf)*(1/cat_idf));
    });
    return row
  }
}

function normalizeByColumns(values) {

  var tb = timeBuckets.reduce((p,c) => { p[c] =0; return p}, {});
  
  var totals = values.reduce((tb,row) => {
    timeBuckets.map(b => {
      tb[b] += row[b] || 0;
    });
    return tb
  },tb);

  return function normalize(row) {
    timeBuckets.map(b => {
      if (row[b]) row[b] = Math.round(row[b]/totals[b]*1000)/10; 
    });
    return row
  }
}




var t1 = timeBuckets.slice(0,11).map(x => parseInt(x) ).reverse();
var t2 = [0].concat(t1);
var t3 = t1.map((v,i) => i ? (v - t2[i])/t2[i] : 1 );

const normalizers = t3.reduce((p,c) => {
  p[p.length] = p[p.length-1]*c;
  p[p.length] = p[p.length-1]*c*(1+((p.length-1)/10));
  return p
},[1]);

function normalize(totals) {

  var normd = normalizers.slice(1).map((x,i) => {
    var k = t1[i];
    return (totals[String(k)] || 0)/x
  });

  var baseValue = d3.sum(normd)/normd.filter(x => x).length;
  var estimates = normalizers.map(x => x*baseValue);

  var normalized = t1.map((k,i) => 1 + ((totals[String(k)] || 0) / estimates[i]) )
    .map(Math.log);

  var normalized2 = t1.map((k,i) => 1 + ((totals["-" + String(k)] || 0) / estimates[i]) )
    .map(Math.log);

  var values = normalized.reverse().concat(normalized2).map(x => x ? x : "" );

  return values
}

function normalizeRow(x) {
  var normed = normalize(x);
  var obj = {};
  t1.slice().reverse().concat(t1.map(x => "-" + x)).map((x,i) => obj[x] = normed[i]);

  return Object.assign({},x,obj)
}

function totalsByTime(values) {
  return values.reduce((p,c) => {
    Object.keys(c).map(k => {
      p[k] += c[k];
    });
    return p
  }, timeBuckets.reduce((p,c) => { p[c] = 0; return p }, {}))
}


const computeScale = (data) => {
  const max = data.reduce((p,c) => {
    timeBuckets.map(x => {
      p = Math.abs(c[x]) > p ? Math.abs(c[x]) : p;
    });
  
    return p
  },0);

  return d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])
};

__$styleInject(".ba-row {\n        padding-bottom:60px;\n}\n\n.ba-row .expanded td {\nbackground:#f9f9fb;\n            padding-top:10px;\n            padding-bottom:10px;\n}\n\n.ba-row th {\n  border-right:1px rgba(0,0,0,.1);\n}\n\n.ba-row th span.less-than, .ba-row th span.greater-than {\nfont-size:.9em;\nwidth:55px;\ntransform:rotate(90deg);\ntext-align:center;\ndisplay:inline-block;\nmargin-left: -20px;\n\n}\n/*\n.ba-row th span.less-than {\n    font-size: .9em;\n    width: 50px;\n    transform: rotate(-90deg);\n    display: inline-block;\n    margin-left: -20px;\n    text-align: center;\n}\n*/\n.ba-row .table-wrapper tr th {\n  border:0px;\n  height:53px\n}\n\n.transform select {\n  height: 36px;\n  vertical-align: top;\n      width:200px;\n}\n\n.transform {\n  width:255px;\n  padding:15px;\n  vertical-align: top;\n  display:inline-block;\n  padding-top:0px;\n}\n.transform span {\n  text-transform:uppercase;\n  font-weight:bold\n}\n\n.transform .filter-values,\n.transform .show-values {\n  text-align:right;\n  padding-top: 10px;\n  margin-right:25px;\n}\n\n.ba-row tr td:not(:first-child) {\n  color:transparent;\n  cursor:pointer\n}\n\n.ba-row tr td:not(:first-child):hover, .ba-row.show-values tr td:not(:first-child) {\n  color:inherit\n}\n.summary-wrap .timeseries-row {\n  padding-bottom:80px\n}\n.stream-wrap {\n  \n}\n.stream-wrap .inner {\n  margin-top:-60px\n}\n.stream-wrap .axis.before,\n.stream-wrap .axis.after {\n  display:none\n}\n\n.time-wrap {\n  float:right;\n  width:682px;\n}\n.time-wrap rect {\n  fill: grey\n}\n.time-wrap rect.selected,\n.time-wrap rect:hover {\n  fill: black\n}\n\ntr.hide-category, \ntr.hide-time {\n  display:none\n}\n",undefined);

function relative_timing(target) {
  return new RelativeTiming(target)
}

class RelativeTiming extends D3ComponentBase {
  constructor(target) {
    super(target);
  }

  props() { return ["data","transform", "sort", "ascending"] }

  draw() {

    var self = this;
    var data = this._data
      , filtered = data.filter(function(x){ return x.selected})
      , selected = filtered.length ? filtered[0] : data[0];

    var wrap = d3_class(this._target,"summary-wrap");

    header(wrap)
      .text("Before and After")
      .draw();


    var totals_by_time= totalsByTime(selected.values);
    var values = normalize(totals_by_time);

    function toggleValues(x) {
      bawrap.classed("show-values",this.checked);
    }

    this.on("toggle.values",toggleValues);

    var ts = d3_class(wrap,"timeseries-row")
      .style("padding-bottom",selected.key == "Top Categories" ? "0px" : null);

    var OPTIONS = [
          {"key":"Activity","value":false}
        , {"key":"Intent Score","value":"normalize"}
        , {"key":"Importance","value":"importance"}
        , {"key":"Percentage","value":"percent"}
        , {"key":"Percent Diff","value":"percent_diff"}
      ];

    data_selector(ts)
      .datasets(data)
      .transforms(OPTIONS)
      .selected_transform(this.transform())
      .on("toggle.values", this.on("toggle.values") )
      .on("transform.change", this.on("transform.change") )
      .on("dataset.change", x => { this.on("select")(x); })
      .draw();

    var stream_wrap = d3_class(ts,"stream-wrap")
      .style("width","682px")
      .style("display",selected.key == "Top Categories" ? "none" : "inline-block")
      .style("vertical-align","bottom");

    var details = d3_class(ts,"details-wrap","svg")
      .style("width","255px")
      .style("height","200px")
      .style("display",selected.key == "Top Categories" ? "none" : "inline-block")
      .style("margin-top","-140px")
      .style("float","left");


    var stages = drawStreamSkinny(stream_wrap,selected.data.before_categories,selected.data.after_categories,noop$2);

    object_selector(stream_wrap)
      .selectAll("path")
      .key((x,i) => { return x[0].key })
      .on("mouseout",function(key$$1,selections) {
        stream_wrap
          .selectAll("path")
          .style("opacity","1");

        bawrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-category", false);

      })
      .on("click",function(key$$1,selections) {

        stream_wrap
          .selectAll("path")
          .filter(x => {
            if (!x[0]) return false
            var k = x[0].key;

            var bool = selections
              .filter(s => { return k == s})
              .map(x => x);

            return bool.length
          })
          .classed("selected",true);


      })
      .on("interact",function(key$$1,selections) {

        stream_wrap.selectAll("path")
          .style("opacity","1")
          .filter(x => {
            if (!x[0]) return false

            var bool = selections
              .filter(s => { return x[0].key == s})
              .map(x => x);

            return !bool.length
          })
          .style("opacity",".6");

        bawrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-category", function(x) { 
            var bool =  selections.indexOf(x.parent_category_name) > -1;
            return !bool
          });

        const cat_wrap = d3_class(details,"cat","g");
        d3_class(cat_wrap,"title","text").text("Categories Selected:")
          .style("font-weight","bold")
          .style("text-transform","uppercase")
          .attr("x",15)
          .attr("y", 15);


        var cats = d3_updateable(cat_wrap,".cats","g",selections,x => 1)
          .classed("cats",true);


        var cat = cats.selectAll(".cat")
          .data(x => x);

        cat
          .enter()
          .append("text")
          .classed("cat",true)
          .attr("x",15)
          .attr("y",(x,i) => 30 + (i+1)*15);

        cat
          .text(String);
        
        cat.exit().remove();

        


      })
      .draw();



    var time_wrap = d3_class(ts,"time-wrap")
      .style("text-align", "right")
      .style("margin-right", "63px");

    var svg = d3_updateable(time_wrap,"svg","svg").attr("width",682).attr("height",80)
      .style("display","inline-block")
      .style("vertical-align","bottom")
      .style("margin-bottom","15px");



    var sts = simpleTimeseries(svg,values,682,80,-2);

    object_selector(sts)
      .selectAll("rect")
      .key((x,i) => timeBuckets[i])
      .on("mouseout",function(key$$1,selections) {

        bawrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-time", false);

      })
      .on("interact",function(key$$1,selections) {

        var tr = bawrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-time", function(x) { 
            var bool = selections.filter(s => { return x[s] != undefined && x[s] != "" }); 
            return !bool.length 
          });

      })
      .draw();


    const categories = data[0].data.category.reduce((p,c) => {
      p[c.key] = c;
      return p
    },{});

    var bawrap = d3_class(wrap,"ba-row")
      .style("min-height","600px");

    var normByCol = normalizeByColumns(selected.values);

    const sorted_tabular = selected.values.filter(x => x.key != "")
      .map(
        this.transform() == "normalize" ?  normalizeRow : 
        this.transform() == "percent" ? normalizeByColumns(selected.values) : 
        this.transform() == "percent_diff" ? row => normalizeRowSimple( normByCol(row) ) : 
        this.transform() == "importance" && selected.key.indexOf("Cat") == -1 ? normalizeByCategory(categories) : 
        identity
      )
      .slice(0,1000);

    const oscale = computeScale(sorted_tabular);
    const headers = [{"key":"key", "value":selected.key.replace("Top ","")}].concat(timingHeaders);


    const _default = "600";
    const s = this.sort(); 
    const asc = this.ascending(); 


    const selectedHeader = headers.filter(x => x.key == s);
    const sortby = selectedHeader.length ? selectedHeader[0].key : _default;

    table$1(bawrap)
      .top(140)
      .headers(headers)
      .sort(sortby,asc)
      .on("sort", this.on("sort"))
      .on("expand",function(d,td) {

        let _data = data[0].data;

        refine_relative(td)
          .data(d)
          .domain(d.key)
          .stages(stages)
          .before_urls(_data.before.filter(y => y.domain == d.key) )
          .after_urls(_data.after.filter(y => y.domain == d.key))
          .on("stage-filter",self.on("stage-filter"))
          .draw();

      })
      .on("draw",function() {
        this._target.selectAll("th")
          .selectAll("span")
          .classed("less-than", (x) => { return parseInt(x.key) == x.key && x.key < 0 })
          .classed("greater-than", (x) => { return parseInt(x.key) == x.key && x.key > 0 });

        this._target.selectAll(".table-option")
          .style("display","none");

        this._target.selectAll("tr").selectAll("td:not(:first-child)")
          .style("border-right","1px solid white")
          .style("padding-left","0px")
          .style("text-align","center")
          .style("background-color",function(x) {

            var value = this.parentNode.__data__[x['key']] || 0;
            var slug = value > 0 ? "rgba(70, 130, 180," : "rgba(244, 109, 67,";
            value = Math.abs(value);
            return slug + oscale(Math.log(value+1)) + ")"
          });     
      })
      .option_text("<div style='width:40px;text-align:center'>&#65291;</div>")
      .data({"values":sorted_tabular})
      .draw();

  }
}

function aggregateCategory(urls) {
  const categories = d3.nest()
    .key(function(x){ return x.parent_category_name})
    .rollup(function(v) { 
      return {
          "articles": v
        , "value": d3.sum(v,x => x.uniques)
      } 
    })
    .entries(urls)
    .map(function(v) { return Object.assign(v.values,{key: v.key}) });

  const total = d3.sum(categories,c => c.value);

  categories.map(function(x) {
    x.percent = x.value / total;
  });

  return categories
}

function aggregateCategoryHour(urls) {
  return d3.nest()
    .key(function(x){ return x.parent_category_name + x.hour + x.minute})
    .rollup(function(v) {
      return {
          "parent_category_name": v[0].parent_category_name
        , "hour": v[0].hour
        , "minute": v[0].minute 
        , "count": v.reduce(function(p,c) { return p + c.count },0)
        , "articles": v
      }
    })
    .entries(urls)
    .map(function(x) { return x.values })
}





function categoryReducer(group) {
  return group.reduce(function(p,c) {
      p.views += c.count;
      p.sessions += c.uniques;
      return p
    },
    { 
        articles: {}
      , views: 0
      , sessions: 0
      , pop_size: group[0].category_idf ? 1/group[0].category_idf : 0
      , idf: group[0].category_idf
    })
}

function categoryRoll(urls) {
  const rolled = d3.nest()
    .key(function(k) { return k.parent_category_name })
    .rollup(categoryReducer)
    .entries(urls);

  const pop_total = d3.sum(rolled,x => x.values.pop_size);
  const views_total = d3.sum(rolled,x => x.values.views);

  rolled.map(x => {
    x.values.real_pop_percent = x.values.pop_percent = (x.values.pop_size / pop_total * 100);
    x.values.percent = x.values.views/views_total;

  });

  return rolled
}

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

  //console.log(aggs)

  ds.map(function(o) {
    o.normalized_pop = o.pop / aggs.pop_max;
    o.percent_pop = o.pop / aggs.pop_total;

    o.normalized_samp = o.samp / aggs.samp_max;
    o.percent_samp = o.samp / aggs.samp_total;

    o.normalized_diff = (o.normalized_samp - o.normalized_pop)/o.normalized_pop;
    o.percent_diff = (o.percent_samp - o.percent_pop)/o.percent_pop;
  });
};

function categorySummary(samp_urls,pop_urls) {

  const samp_rolled = categoryRoll(samp_urls)
    , pop_rolled = categoryRoll(pop_urls)
    , mapped_cat_roll = samp_rolled.reduce(function(p,c) { 
        p[c.key] = c; 
        return p
      }, {});

  const cat_summary = pop_rolled.map(function(x) {

    [x.values].map(y => {
        y.key = x.key;
        y.pop = y.views;
        y.samp = mapped_cat_roll[x.key] ? mapped_cat_roll[x.key].values.views : 0;

        y.sample_percent_norm = y.sample_percent = y.percent*100;
        y.importance = Math.log((1/y.pop_size)*y.samp*y.samp);
        y.ratio = y.sample_percent/y.real_pop_percent;
        y.value = y.samp;
    });


    return x.values
  }).sort(function(a,b) { return b.pop - a.pop})
    .filter(function(x) { return x.key != "NA" });

  modifyWithComparisons(cat_summary);

  return cat_summary
}

function formatHour(h) {
  if (h == 0) return "12 am"
  if (h == 12) return "12 pm"
  if (h > 12) return (h-12) + " pm"
  return (h < 10 ? h[1] : h) + " am"
}

const hourbuckets$2 = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x);

function buildTiming(urls, comparison) {

  var ts = prepData(urls)
    , pop_ts = prepData(comparison);

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

  return prepped
}

const timingTabular = (data,key="domain") => {
  return d3.nest()
    .key(x => x[key])
    .key(x => x.hour)
    .entries(data)
    .map(x => {
      var obj = x.values.reduce((p,c) => {
        p[c.key] = c.values;
        return p
      },{});

      x.buckets = hourbuckets$2.map(z => {
        var o = { values: obj[z], key: formatHour(z) };
        o.views = d3.sum(obj[z] || [], q => q.uniques);
        return o
      });

      x.tabular = x.buckets.reduce((p,c) => {
        p[c.key] = c.views || undefined;
        return p
      },{});

      x.tabular["key"] = x.key;
      x.tabular["total"] = d3.sum(x.buckets,x => x.views);
      
      return x.tabular
    })
    .filter(x => x.key != "NA")
};

const hourbuckets$1 = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x);

const timingHeaders$1 = hourbuckets$1.map(formatHour).map(x => { return {key: x, value: x} });

const computeScale$1 = (data,_max) => {

  const max = _max || 1000; // need to actually compute this from data

  return d3.scale.linear().range([0,1]).domain([0,Math.log(max)])
};

function normalizeRow$1(weights) {

  return function normalize(x,mult) {
    var keys = timingHeaders$1.map(t => t.key);
    var values = keys.map(k => x[k]);

    var total = d3.sum(values);

    var estimates = Object.keys(weights).map(k => Math.sqrt(weights[k]*total) );

    var normalized = values.map((k,i) => (k/estimates[i]));
    var values = {};
    keys.map((k,i) => {
      values[k] = Math.round(normalized[i]*mult || 0) || "";
    });
    return values

  }
}

__$styleInject(".timing-row {\n        padding-bottom:60px;\n}\n\n.timing-row .expanded {\n  background:white;\n  padding:20px\n}\n\n.timing-row tr td:not(:first-child) {\n          border-right:1px solid white;\n          padding-left:0px;\n          text-align:center;\n\n}\n.timing-row .table-wrapper tr th {\n  padding:5px; text-align:center\n}\n.timing-row tr td:not(:first-child) {\n  color:transparent;\n  cursor:pointer\n}\n\n.timing-row tr td:not(:first-child):hover, .timing-row.show-values tr td:not(:first-child) {\n  color:inherit\n}\n\n.timing-wrap rect {\n  fill: grey\n}\n.timing-wrap rect.selected,\n.timing-wrap rect:hover {\n  fill: black\n}\n",undefined);

function timing(target) {
  return new Timing(target)
}

class Timing extends D3ComponentBase {
  constructor(target) {
    super(target);
  }

  props() { return ["data","transform", "sort", "ascending"] }


  draw() {

    var self = this;
    var data = this._data
      , filtered = data.filter(function(x){ return x.selected})
      , selected = filtered.length ? filtered[0] : data[0];


    var wrap = d3_class(this._target,"timing-wrap");



    const headers = [{key:"key",value:selected.key.replace("Top ","")}].concat(timingHeaders$1);
    const d = data[0].values;//timingTabular(data.full_urls)

    const _default = "total";
    const s = this.sort(); 
    const asc = this.ascending(); 


    const selectedHeader = headers.filter(x => x.key == s);
    const sortby = selectedHeader.length ? selectedHeader[0].key : _default;

    const hourlyTotals = selected.values.reduce((p,c) => {
      timingHeaders$1.map(k => {
        var h = k.key;
        p[h] = (p[h] || 0) + (c[h] || 0);
      });
      return p
    },{});

    const overallTotal = d3.sum(Object.keys(hourlyTotals).map(k => hourlyTotals[k]));
    const percentTotals = Object.keys(hourlyTotals).reduce((p,k) => {
      p[k] = hourlyTotals[k]/overallTotal;
      return p
    },{});

    const rowValue = selected.values.map(x => Math.sqrt(1 + x.total) );
    const normalizer = normalizeRow$1(percentTotals);

    var max = 0;
    const values = selected.values.map((row,i) => {
      
      const normed = this.transform() == "normalize" ? normalizer(row,rowValue[i]) : row;
      const local_max = d3.max(timingHeaders$1.map(x => x.key).map(k => normed[k]));
      max = local_max > max ? local_max : max;

      return Object.assign(normed,{"key":row.key})
    });

console.log(max);

    const oscale = computeScale$1(values,max);


    header(wrap)
      .text("Before and After") //selected.key)
      //.options(data)
      //.on("select", function(x) { this.on("select")(x) }.bind(this))
      .draw();


    var ts = d3_class(wrap,"timeseries-row");

    var OPTIONS = [
          {"key":"Activity","value":false}
        , {"key":"Scored","value":"normalize"}
      ];

      function toggleValues(x) {
        timingwrap.classed("show-values",this.checked);
      }

    data_selector(ts)
      .datasets(data)
      .transforms(OPTIONS)
      .selected_transform(this.transform())
      .on("toggle.values", toggleValues )
      .on("transform.change", this.on("transform.change") )
      .on("dataset.change", x => { this.on("select")(x); })
      .draw();


    var svg = d3_updateable(ts,"svg","svg").attr("width",744).attr("height",80);

    var totals = timingHeaders$1.map(h => {
      return hourlyTotals[h.key]
    });

    var sts = simpleTimeseries(svg,totals,744,80,-1);

    object_selector(sts)
      .selectAll("rect")
      .key((x,i) => timingHeaders$1[i].key)
      .on("mouseout",function(key$$1,selections) {

        timingwrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-time", false);

      })
      .on("interact",function(key$$1,selections) {

        var tr = timingwrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-time", function(x) { 
            var bool = selections.filter(s => { return x[s] != undefined && x[s] != "" }); 
            return !bool.length 
          });

      })
      .draw();


    var timingwrap = d3_class(wrap,"timing-row");

    var table_obj = table$1(timingwrap)
      .top(140)
      .headers(headers)
      .sort(sortby,asc)
      .on("sort", this.on("sort"))
      .data({"values":values.slice(0,500)})
      .skip_option(true)
      .on("expand",function(d,td) {

        var dd = data[0].data.filter(function(x) { return x.domain == d.key });
        var rolled = prepData$1(dd);
        
        domain_expanded(td)
          .domain(dd[0].domain)
          .raw(dd)
          .data(rolled)
          .on("stage-filter", function(x) {
            self.on("stage-filter")(x);
          })
          .draw();

      })
      .on("draw",function() {

        this._target.selectAll("tr").selectAll("td:not(:first-child)")
          .style("background-color",function(x) {
            var value = this.parentNode.__data__[x['key']] || 0;
            return "rgba(70, 130, 180," + oscale(Math.log(value+1)) + ")"
          });
      })
      .draw();
    
  }
}

function d3_class$1(target,cls,type) {
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

  data(val) { return accessor$2.bind(this)("data",val) } 

  on(action, fn) {
    if (fn === undefined) return this._on[action] || noop;
    this._on[action] = fn;
    return this
  }


  draw() {
    var owrap = d3_class$1(this._target,"footer-wrap")
      .style("padding-top","5px")
      .style("min-height","60px")
      .style("bottom","0px")
      .style("position","fixed")
      .style("width","1000px")
      .style("background","#F0F4F7");

    var wrap = d3_class$1(owrap,"inner-wrap")
      .style("border-top","1px solid #ccc")
      .style("padding-top","5px");

    d3_class$1(wrap,"header-label")
      .style("line-height","35px")
      .style("text-transform","uppercase")
      .style("font-weight","bold")
      .style("display","inline-block")
      .style("font-size","14px")
      .style("color","#888888")
      .style("width","200px")
      .style("vertical-align","top")
      .text("Build Filters");

    d3_class$1(wrap,"text-label")
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




    var footer_row = d3_class$1(wrap,"footer-row")
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
    d3_class$1(wrap,"include-submit","button")
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

    d3_class$1(wrap,"exclude-submit","button")
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

function noop$10() {}
function identity$7(x) { return x }
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
      return accessor$2.bind(this)("data",val) 
    }
  , classed: function(k, v) {
      if (k === undefined) return this._classes
      if (v === undefined) return this._classes[k] 
      this._classes[k] = v;
      return this
    }  
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$10;
      this._on[action] = fn;
      return this
    }
  , draw: function () {

      var classes = this.classed();

      var wrap = d3_updateable(this.target,".conditional-wrap","div",this.data())
        .classed("conditional-wrap",true);

      var objects = d3_splat(wrap,".conditional","div",identity$7, function(x,i) { return i })
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
      return accessor$2.bind(this)("data",val) 
    }
  , transform: function(val) {
      return accessor$2.bind(this)("transform",val) || ""
    }
  , staged_filters: function(val) {
      return accessor$2.bind(this)("staged_filters",val) || ""
    }
  , media: function(val) {
      return accessor$2.bind(this)("media",val) 
    }
  , saved: function(val) {
      return accessor$2.bind(this)("saved",val) 
    }
  , line_items: function(val) {
      return accessor$2.bind(this)("line_items",val) || []
    }
  , selected_action: function(val) {
      return accessor$2.bind(this)("selected_action",val) 
    }
  , selected_comparison: function(val) {
      return accessor$2.bind(this)("selected_comparison",val) 
    }
  , action_date: function(val) {
      return accessor$2.bind(this)("action_date",val) 
    }
  , comparison_date: function(val) {
      return accessor$2.bind(this)("comparison_date",val) 
    }

  , view_options: function(val) {
      return accessor$2.bind(this)("view_options",val) || []
    }
  , logic_options: function(val) {
      return accessor$2.bind(this)("logic_options",val) || []
    }
  , explore_tabs: function(val) {
      return accessor$2.bind(this)("explore_tabs",val) || []
    }
  , logic_categories: function(val) {
      return accessor$2.bind(this)("logic_categories",val) || []
    }
  , actions: function(val) {
      return accessor$2.bind(this)("actions",val) || []
    }
  , summary: function(val) {
      return accessor$2.bind(this)("summary",val) || []
    }
  , time_summary: function(val) {
      return accessor$2.bind(this)("time_summary",val) || []
    }
  , time_tabs: function(val) {
      return accessor$2.bind(this)("time_tabs",val) || []
    }
  , category_summary: function(val) {
      return accessor$2.bind(this)("category_summary",val) || []
    }
  , keyword_summary: function(val) {
      return accessor$2.bind(this)("keyword_summary",val) || []
    }
  , before: function(val) {
      return accessor$2.bind(this)("before",val) || []
    }
  , before_tabs: function(val) {
      return accessor$2.bind(this)("before_tabs",val) || []
    }
  , after: function(val) {
      return accessor$2.bind(this)("after",val) || []
    }
  , filters: function(val) {
      return accessor$2.bind(this)("filters",val) || []
    }
  , loading: function(val) {
      if (val !== undefined) this._segment_view && this._segment_view.is_loading(val).draw();
      return accessor$2.bind(this)("loading",val)
    }
  , sort: function(val) {
      return accessor$2.bind(this)("sort",val)
    }
  , ascending: function(val) {
      return accessor$2.bind(this)("ascending",val)
    }
  , draw: function() {

      var data = this.data();
      var media = this.media();

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
              .sort(self.sort())
              .ascending(self.ascending())
              .on("select", self.on("tab.change") )
              .on("sort", self.on("sort.change") )

              .on("stage-filter",function(x) {

               staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(x => x.length).join(",");
               self.on("staged-filter.change")(staged_filters);
               HACKbuildStagedFilter(staged_filters);
    
             })
             .draw();
          }

          if (x.value == "media-view") {
            media_plan(dthis.style("margin-left","-15px").style("margin-right","-15px"))
             .data(data)
             .draw();
          }

          if (x.value == "ba-view") {
            relative_timing(dthis)
             .transform(self.transform())
             .data(self.before_tabs())
             .sort(self.sort())
             .ascending(self.ascending())
             .on("transform.change", self.on("transform.change") )
             .on("select", self.on("tab.change") )
             .on("sort", self.on("sort.change") )
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
             //.after(self.after())
             .keywords(self.keyword_summary())
             .on("ba.sort",self.on("ba.sort"))
             .draw();
          }

          if (x.value == "timing-view") {
            timing(dthis)
             .data(self.time_tabs())
             .transform(self.transform())
             .sort(self.sort())
             .ascending(self.ascending())
             .on("transform.change", self.on("transform.change") )
             .on("select", self.on("tab.change") )
             .on("sort", self.on("sort.change") )

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

function getData(action,days_ago) {
  return function(cb){
    console.log(days_ago);

    var URL = "/crusher/v2/visitor/domains_full_time_minute/cache?url_pattern=" + action.url_pattern[0] + "&filter_id=" + action.action_id;

    var date_ago = new Date(+new Date()-24*60*60*1000*days_ago)
      , date = d3.time.format("%Y-%m-%d")(date_ago);

    if (days_ago) URL += "&date=" + date;


    d3.json(URL,function(value) {

      var categories = value.summary.category.map(function(x) {x.key = x.parent_category_name; return x});
      value.categories = categories;
      value.category = value.summary.category;
      value.current_hour = value.summary.hour;
      value.category_hour = value.summary.cross_section;

      value.original_urls = value.response;

      cb(false,value);
    });
  }

}
function create(data,cb) {
  d3.xhr("/crusher/funnel/action?format=json")
    .header("Content-Type", "application/json")
    .post(JSON.stringify(data),function(err,data) {
      cb(err,JSON.parse(data.response).response);
    });

}

function getAll(cb) {
  d3.json("/crusher/funnel/action?format=json",function(value) {
    value.response.map(function(x) { x.key = x.action_name; x.action_id = x.filter_id; x.value = x.action_id; });
    cb(false,value.response);
  });

}


var a = Object.freeze({
	getData: getData,
	create: create,
	getAll: getAll
});

let action = a;
let dashboard = {
    getAll: function(cb) {
      d3.json("/crusher/saved_dashboard",function(value) {
        cb(false,value.response);
      });
    }
};
let line_item = {
    getAll: function(cb) {
      d3.json("/line_item",function(value) {
        cb(false,value.response);
      });
    }
};

function prefixReducer(prefix, p,c) {
  p[c.key] = p[c.key] || {};
  p[c.key]['key'] = c.key;
  p[c.key]['parent_category_name'] = c.parent_category_name;
  p[c.key]['idf'] = c.idf;

  p[c.key]['total'] = (p[c.key]['total'] || 0) + c.visits;

  
  p[c.key][prefix + c.time_diff_bucket] = (p[c.key][c.time_diff_bucket] || 0) + c.visits;
  return p
}
const beforeAndAfterTabular = (before, after) => {
  const domain_time = {};

  before.reduce(prefixReducer.bind(false,""),domain_time);
  after.reduce(prefixReducer.bind(false,"-"),domain_time);

  const sorted = Object.keys(domain_time)
    .map((k) => { return domain_time[k] });

  return sorted
};


function buildBeforeAndAfter(before_urls,after_urls,cat_summary,sort_by) {

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

  var before_categories = buildData(before_urls,buckets,pop_categories)
    , after_categories = buildData(after_urls,buckets,pop_categories);

  var sortby = sort_by;

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

  return {
      "after":after_urls
    , "before":before_urls
    , "category":cat_summary
    , "before_categories":before_categories
    , "after_categories":after_categories
    , "sortby":sort_by
  }
}

function aggregateDomains(urls,categories) {
  var categories = categories
    .filter(function(a) { return a.selected })
    .map(function(a) { return a.key });

  var idf = d3.nest()
    .key(function(x) {return x.domain })
    .rollup(function(x) {return x[0].idf })
    .map(urls.filter(function(x){ return x.parent_category_name != "Internet & Telecom"}) );

  var getIDF = function(x) {
    return (idf[x] == "NA") || (idf[x] > 8686) ? 0 : idf[x]
  };

  var values = urls
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

  return values
}

function buildDomainsTab(urls,categories) {

  const values = aggregateDomains(urls,categories);

  return {
      key: "Top Domains"
    , values: values.slice(0,500)
  }
}

function init$1() {
  const s$$1 = s;

  s
    .registerEvent("add-filter", function(filter) { 
      s$$1.publish("filters",s$$1.state().filters.concat(filter).filter(x => x.value) ); 
    })
    .registerEvent("modify-filter", function(filter) { 
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
    .registerEvent("staged-filter.change", function(str) { s$$1.publish("staged_filter",str ); })
    .registerEvent("logic.change", function(logic) { s$$1.publish("logic_options",logic); })
    .registerEvent("filter.change", function(filters) { s$$1.publishBatch({ "filters":filters }); })
    .registerEvent("updateFilter", function(err,_filters,_state) {


      if (_state.data == undefined) return 

      const filters = prepareFilters(_state.filters);
      const logic = determineLogic(_state.logic_options);
      const full_urls = filterUrls(_state.data.original_urls,logic,filters);

      if ( (_state.data.full_urls) && (_state.data.full_urls.length == full_urls.length) && 
           (_state.selected_comparison) && (_state.comparison_data == value.comparison) && 
           (_state.sortby == _state.before_urls.sortby)) return 



      // BASE DATASETS
      const value = {};

      value.full_urls = full_urls;
      value.comparison = _state.comparison_data ?  _state.comparison_data.original_urls : _state.data.original_urls;

      //s.publishStatic("formatted_data",value)
      

      const cat_summary = categorySummary(value.full_urls,value.comparison);
      const summary = buildSummary(value.full_urls, value.comparison);

      s$$1.setStatic("category_summary", cat_summary);
      s$$1.setStatic("summary",summary);





      // MEDIA PLAN

      
      //value.display_categories = {"key": "Categories", values: aggregateCategory(full_urls)}
      //value.category_hour = aggregateCategoryHour(full_urls)

      const categories = aggregateCategory(full_urls);

      const media_plan = {
          display_categories: {"key": "Categories" , values: categories}
        , category_hour: aggregateCategoryHour(full_urls)
      };

      s$$1.setStatic("media_plan", media_plan);
      




      // EXPLORE TABS
      var tabs = [
          buildDomainsTab(full_urls,categories)
        , {key:"Top Categories", values: cat_summary}
        //, buildUrlsTab(full_urls,categories)
      ];

      

      if (_state.tab_position) {
        tabs.map(x => x.selected = (x.key == _state.tab_position) );
      }

      s$$1.setStatic("tabs",tabs);




      // TIMING
      const timing = buildTiming(value.full_urls, value.comparison);
      const timing_tabular = timingTabular(full_urls);
      const cat_timing_tabular = timingTabular(full_urls,"parent_category_name");
      const timing_tabs = [
          {"key":"Top Domains", "values": timing_tabular, "data": value.full_urls}
        , {"key":"Top Categories", "values": cat_timing_tabular}

      ];

      if (_state.tab_position) {
        timing_tabs.map(x => x.selected = (x.key == _state.tab_position) );
      }



      s$$1.setStatic("time_summary", timing);
      s$$1.setStatic("time_tabs", timing_tabs);




      // BEFORE AND AFTER
      if (_state.data.before) {

        const domain_idfs = d3.nest()
          .key(x => x.domain)
          .rollup(x => x[0].idf)
          .map(full_urls);

        const catmap = (x) => Object.assign(x,{key:x.parent_category_name});
        const urlmap = (x) => Object.assign({key:x.domain, idf: domain_idfs[x.domain]},x);

        const before_urls = filterUrls(_state.data.before,logic,filters).map(urlmap)
          , after_urls = filterUrls(_state.data.after,logic,filters).map(urlmap)
          , before_and_after = buildBeforeAndAfter(before_urls,after_urls,cat_summary,_state.sortby)
          , before_after_tabular = beforeAndAfterTabular(before_urls,after_urls)
          , cat_before_after_tabular = beforeAndAfterTabular(before_urls.map(catmap),after_urls.map(catmap));

        const before_tabs = [
            {key:"Top Domains",values:before_after_tabular,data:before_and_after}
          , {key:"Top Categories",values:cat_before_after_tabular,data:before_and_after}
        ];

        if (_state.tab_position) {
          before_tabs.map(x => x.selected = (x.key == _state.tab_position) );
        }


        s$$1.setStatic("before_urls",before_and_after); 
        s$$1.setStatic("before_tabs",before_tabs);

      }



      // KEYWORDS
      //s.setStatic("keyword_summary", buildKeywords(value.full_urls,value.comparions)) 




      
      s$$1.publishStatic("formatted_data",value);
    });
}

function init$2() {
  const s$$1 = s;

  s
    .registerEvent("action.change", function(action) { s$$1.publish("selected_action",action); })
    .registerEvent("action_date.change", function(date) { s$$1.publish("action_date",date); })
    .registerEvent("comparison_date.change", function(date) { s$$1.publish("comparison_date",date); })
    .registerEvent("comparison.change", function(action) { 
      if (action.value == false) return s$$1.publish("selected_comparison",false)
      s$$1.publish("selected_comparison",action);
    });


}

const s$1 = s;

const deepcopy = function(x) {
  return JSON.parse(JSON.stringify(x))
};

function init() {

  init$1();
  init$2();

  // OTHER events

  s
    .registerEvent("transform.change", function(x) {
      s$1.update("loading");
      s$1.publishStatic("transform",x.value);
      s$1.prepareEvent("updateFilter")(false,s$1.state().filters,s$1.state());
    })

    .registerEvent("sort.change", function(x) {
      const _s = s$1.state();
      const asc = _s.sort == x.key;

      s$1.update("loading");

      s$1.publishStatic("sort",x.key);
      s$1.publishStatic("ascending",asc && !_s.ascending);

      s$1.prepareEvent("updateFilter")(false,s$1.state().filters,s$1.state());

    })
    .registerEvent("view.change", function(x) {
      s$1.update("loading",true);
      var CP = deepcopy(s$1.state().dashboard_options).map(function(d) { d.selected = (x.value == d.value) ? 1 : 0; return d });
      s$1.publish("dashboard_options",CP);
    })
    .registerEvent("tab.change", function(x) {
      s$1.update("loading",true);

      s$1.publishStatic("tab_position",x.key);
      s$1.prepareEvent("updateFilter")(false,s$1.state().filters,s$1.state());
    })
    .registerEvent("ba.sort", function(x) {
      s$1.publish("sortby", x.value);
      s$1.prepareEvent("updateFilter")(false,s$1.state().filters,s$1.state());
    });
}

function publishQSUpdates(updates,qs_state) {
  if (Object.keys(updates).length) {
    updates["qs_state"] = qs_state;
    s.publishBatch(updates);
  }
}

function init$4() {

  window.onpopstate = function(i) {

    var state = s$$1._state
      , qs_state = i.state;

    var updates = compare(qs_state,state);
    publishQSUpdates(updates,qs_state);
  };

  const s$$1 = s;

  s
    .subscribe("history",function(error,_state) {
      //console.log(
      //  "current: "+JSON.stringify(_state.qs_state), 
      //  JSON.stringify(_state.filters), 
      //  _state.dashboard_options
      //)

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
      if (_state.transform) qs_state['transform'] = _state.transform;
      if (_state.tab_position) qs_state['tab_position'] = _state.tab_position;
      if (_state.sort) qs_state['sort'] = _state.sort;
      if (_state.ascending) qs_state['ascending'] = _state.ascending;




      if (_state.selected_action && qs(qs_state).to(qs_state) != window.location.search) {
        s$$1.publish("qs_state",qs_state);
      }
    })
    .subscribe("history.actions", function(error,value,_state) {
      var qs_state = qs({}).from(window.location.search);
      if (window.location.search.length && Object.keys(qs_state).length) {
        var updates = compare(qs_state,_state);
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

const s$4 = s;

function init$5() {

  // Subscriptions that receive data / modify / change where it is stored

  s
    .subscribe("receive.data",function(error,value,state) {
      s$4.publishStatic("logic_categories",value.categories);
      s$4.publish("filters",state.filters);
    })
    .subscribe("receive.comparison_data",function(error,value,state) {
      s$4.publish("filters",state.filters);
    });


  // Subscriptions that will get more data

  s
    .subscribe("get.action_date",function(error,value,state) {
      s$4.publishStatic("data",action.getData(state.selected_action,state.action_date));
    })
    .subscribe("get.comparison_date",function(error,value,state) {
      if (!value) return s$4.publishStatic("comparison_data",false)
      s$4.publishStatic("comparison_data",action.getData(state.selected_comparison,state.comparison_date));
    })
    .subscribe("get.selected_action",function(error,value,state) {
      s$4.publishStatic("data",action.getData(value,state.action_date));
    })
    .subscribe("get.selected_comparison",function(error,value,state) {
      if (!value) return s$4.publishStatic("comparison_data",false)
      s$4.publishStatic("comparison_data",action.getData(value,state.comparison_date));
    });


}

const s$3 = s;


function init$3() {

  init$4();
  init$5();

  
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
    init$3();
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

    s$$1.publishStatic("actions",action.getAll);
    s$$1.publishStatic("saved",dashboard.getAll);
    s$$1.publishStatic("line_items",line_item.getAll);

    var DEFAULTS = {
        logic_options: [{"key":"All","value":"and"},{"key":"Any","value":"or"}]
      , logic_categories: []
      , filters: [{}] 
      , dashboard_options: [
            {"key":"Overall","value":"data-view","selected":1}
          , {"key":"Path","value":"ba-view","selected":0}
          , {"key":"Timing","value":"timing-view","selected":0}
          , {"key":"Comparison","value":"summary-view","selected":0}
          //, {"key":"Media Plan", "value":"media-view","selected":0}

        ]
    };

    s$$1.update(false,DEFAULTS);
  }

  call() {

   let s$$1 = s;
   let value = s$$1.state();

   let db = new_dashboard(this._target)
     .transform(value.transform || "")
     .staged_filters(value.staged_filter || "")
     .media(value.media_plan || {})
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
     .before_tabs(value.before_tabs || [])
     //.after(value.after_urls || [])
     .logic_options(value.logic_options || false)
     .logic_categories(value.logic_categories || false)
     .filters(value.filters || false)
     .view_options(value.dashboard_options || false)
     .explore_tabs(value.tabs || false)
     .time_tabs(value.time_tabs || false)
     .sort(value.sort || false)
     .ascending(value.ascending || false)

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
     .on("sort.change", s$$1.prepareEvent("sort.change"))
     .on("transform.change", s$$1.prepareEvent("transform.change"))

     .draw();
   
  }
}

var version = "0.0.1";

exports.version = version;
exports.view = new_dashboard;
exports.build = build;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFzaGJvYXJkLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvaGVscGVycy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdGF0ZS9zcmMvc3RhdGUuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvc3JjL3FzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N0YXRlL3NyYy9jb21wX2V2YWwuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvbWVkaWFfcGxhbi9zcmMvbWVkaWFfcGxhbi5qcyIsIi4uL25vZGVfbW9kdWxlcy9maWx0ZXIvYnVpbGQvZmlsdGVyLmVzLmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzLmpzIiwiLi4vc3JjL2hlbHBlcnMvZ3JhcGhfaGVscGVycy5qcyIsIi4uL3NyYy9oZWxwZXJzL3N0YXRlX2hlbHBlcnMuanMiLCIuLi9zcmMvaGVscGVycy5qcyIsIi4uL3NyYy9nZW5lcmljL3NlbGVjdC5qcyIsIi4uL3NyYy9nZW5lcmljL2hlYWRlci5qcyIsIi4uL25vZGVfbW9kdWxlcy90YWJsZS9zcmMvdGFibGUuanMiLCIuLi9ub2RlX21vZHVsZXMvdGFibGUvc3JjL3N1bW1hcnlfdGFibGUuanMiLCIuLi9zcmMvdmlld3MvZmlsdGVyX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy9idXR0b25fcmFkaW8uanMiLCIuLi9zcmMvdmlld3Mvb3B0aW9uX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy90aW1lc2VyaWVzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdGFidWxhcl90aW1lc2VyaWVzL2hlYWRlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9jaGFydC9zcmMvc2ltcGxlX3RpbWVzZXJpZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL2JhX3RpbWVzZXJpZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL3NpbXBsZV9iYXIuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL2J1bGxldC5qcyIsIi4uL25vZGVfbW9kdWxlcy9jb21wb25lbnQvc3JjL3RhYnVsYXJfdGltZXNlcmllcy9ib2R5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdGFidWxhcl90aW1lc2VyaWVzL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvZG9tYWluX2V4cGFuZGVkLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdmVydGljYWxfb3B0aW9uLmpzIiwiLi4vc3JjL3ZpZXdzL2RvbWFpbl92aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3NlZ21lbnRfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2RpZmZfYmFyLmpzIiwiLi4vc3JjL2dlbmVyaWMvY29tcF9iYXIuanMiLCIuLi9zcmMvdmlld3Mvc3VtbWFyeS9jYXRlZ29yeS5qcyIsIi4uL3NyYy9nZW5lcmljL2NvbXBfYnViYmxlLmpzIiwiLi4vc3JjL2dlbmVyaWMvc3RyZWFtX3Bsb3QuanMiLCIuLi9zcmMvdmlld3Mvc3VtbWFyeS9iZWZvcmVfYW5kX2FmdGVyLmpzIiwiLi4vc3JjL2dlbmVyaWMvcGllLmpzIiwiLi4vc3JjL3ZpZXdzL3N1bW1hcnkvc2FtcGxlX3ZzX3BvcC5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5L3RpbWluZy5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5L3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy9kYXRhX3NlbGVjdG9yLmpzIiwiLi4vc3JjL2dlbmVyaWMvb2JqZWN0X3NlbGVjdG9yLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy9yZWZpbmVfcmVsYXRpdmVfcHJvY2Vzcy5qcyIsIi4uL3NyYy92aWV3cy9yZWxhdGl2ZV90aW1pbmcvcmVmaW5lX3JlbGF0aXZlLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy9yZWxhdGl2ZV90aW1pbmdfY29uc3RhbnRzLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy9yZWxhdGl2ZV90aW1pbmdfcHJvY2Vzcy5qcyIsIi4uL3NyYy92aWV3cy9yZWxhdGl2ZV90aW1pbmcvdmlldy5qcyIsIi4uL3NyYy9oZWxwZXJzL2RhdGFfaGVscGVycy9jYXRlZ29yeS5qcyIsIi4uL3NyYy9oZWxwZXJzL2RhdGFfaGVscGVycy90aW1pbmcuanMiLCIuLi9zcmMvdmlld3MvdGltaW5nL3RpbWluZ19jb25zdGFudHMuanMiLCIuLi9zcmMvdmlld3MvdGltaW5nL3RpbWluZ19wcm9jZXNzLmpzIiwiLi4vc3JjL3ZpZXdzL3RpbWluZy92aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3N0YWdlZF9maWx0ZXJfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2NvbmRpdGlvbmFsX3Nob3cuanMiLCIuLi9zcmMvZ2VuZXJpYy9zaGFyZS5qcyIsIi4uL3NyYy92aWV3LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2FwaS9zcmMvYWN0aW9uLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2FwaS9pbmRleC5qcyIsIi4uL3NyYy9oZWxwZXJzL2RhdGFfaGVscGVycy9iZWZvcmVfYW5kX2FmdGVyLmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2RvbWFpbnMuanMiLCIuLi9zcmMvZXZlbnRzL2ZpbHRlcl9ldmVudHMuanMiLCIuLi9zcmMvZXZlbnRzL2FjdGlvbl9ldmVudHMuanMiLCIuLi9zcmMvZXZlbnRzLmpzIiwiLi4vc3JjL3N1YnNjcmlwdGlvbnMvaGlzdG9yeS5qcyIsIi4uL3NyYy9zdWJzY3JpcHRpb25zL2FwaS5qcyIsIi4uL3NyYy9zdWJzY3JpcHRpb25zLmpzIiwiLi4vc3JjL2J1aWxkLmpzIiwiYnVuZGxlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBkM191cGRhdGVhYmxlID0gZnVuY3Rpb24odGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCJcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGZ1bmN0aW9uKHgpe3JldHVybiBkYXRhID8gW2RhdGFdIDogW3hdfSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIFt4XX1cbiAgKVxuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSlcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5leHBvcnQgY29uc3QgZDNfc3BsYXQgPSBmdW5jdGlvbih0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIlxuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZGF0YSB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fVxuICApXG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKVxuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkM19jbGFzcyh0YXJnZXQsY2xzLHR5cGUsZGF0YSkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuXCIgKyBjbHMsIHR5cGUgfHwgXCJkaXZcIixkYXRhKVxuICAgIC5jbGFzc2VkKGNscyx0cnVlKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9vcCgpIHt9XG5leHBvcnQgZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5leHBvcnQgZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjY2Vzc29yKGF0dHIsIHZhbCkge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzW1wiX1wiICsgYXR0cl1cbiAgdGhpc1tcIl9cIiArIGF0dHJdID0gdmFsXG4gIHJldHVybiB0aGlzXG59XG5cbmV4cG9ydCBjbGFzcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vbiA9IHt9XG4gICAgdGhpcy5wcm9wcygpLm1hcCh4ID0+IHtcbiAgICAgIHRoaXNbeF0gPSBhY2Nlc3Nvci5iaW5kKHRoaXMseClcbiAgICB9KVxuICB9XG4gIHByb3BzKCkge1xuICAgIHJldHVybiBbXCJkYXRhXCJdXG4gIH1cbiAgb24oYWN0aW9uLGZuKSB7XG4gICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBTdGF0ZShfY3VycmVudCwgX3N0YXRpYykge1xuXG4gIHRoaXMuX25vb3AgPSBmdW5jdGlvbigpIHt9XG4gIHRoaXMuX2V2ZW50cyA9IHt9XG5cbiAgdGhpcy5fb24gPSB7XG4gICAgICBcImNoYW5nZVwiOiB0aGlzLl9ub29wXG4gICAgLCBcImJ1aWxkXCI6IHRoaXMuX25vb3BcbiAgICAsIFwiZm9yd2FyZFwiOiB0aGlzLl9ub29wXG4gICAgLCBcImJhY2tcIjogdGhpcy5fbm9vcFxuICB9XG5cbiAgdGhpcy5fc3RhdGljID0gX3N0YXRpYyB8fCB7fVxuXG4gIHRoaXMuX2N1cnJlbnQgPSBfY3VycmVudCB8fCB7fVxuICB0aGlzLl9wYXN0ID0gW11cbiAgdGhpcy5fZnV0dXJlID0gW11cblxuICB0aGlzLl9zdWJzY3JpcHRpb24gPSB7fVxuICB0aGlzLl9zdGF0ZSA9IHRoaXMuX2J1aWxkU3RhdGUoKVxuXG5cbn1cblxuU3RhdGUucHJvdG90eXBlID0ge1xuICAgIHN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBwdWJsaXNoOiBmdW5jdGlvbihuYW1lLGNiKSB7XG5cbiAgICAgICB2YXIgcHVzaF9jYiA9IGZ1bmN0aW9uKGVycm9yLHZhbHVlKSB7XG4gICAgICAgICBpZiAoZXJyb3IpIHJldHVybiBzdWJzY3JpYmVyKGVycm9yLG51bGwpXG4gICAgICAgICBcbiAgICAgICAgIHRoaXMudXBkYXRlKG5hbWUsIHZhbHVlKVxuICAgICAgICAgdGhpcy50cmlnZ2VyKG5hbWUsIHRoaXMuc3RhdGUoKVtuYW1lXSwgdGhpcy5zdGF0ZSgpKVxuXG4gICAgICAgfS5iaW5kKHRoaXMpXG5cbiAgICAgICBpZiAodHlwZW9mIGNiID09PSBcImZ1bmN0aW9uXCIpIGNiKHB1c2hfY2IpXG4gICAgICAgZWxzZSBwdXNoX2NiKGZhbHNlLGNiKVxuXG4gICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcHVibGlzaEJhdGNoOiBmdW5jdGlvbihvYmopIHtcbiAgICAgIE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdGhpcy51cGRhdGUoeCxvYmpbeF0pXG4gICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgIHRoaXMudHJpZ2dlckJhdGNoKG9iaix0aGlzLnN0YXRlKCkpXG4gICAgfVxuICAsIHB1c2g6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICB0aGlzLnB1Ymxpc2goZmFsc2Usc3RhdGUpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzdWJzY3JpYmU6IGZ1bmN0aW9uKCkge1xuXG4gICAgICAvLyB0aHJlZSBvcHRpb25zIGZvciB0aGUgYXJndW1lbnRzOlxuICAgICAgLy8gKGZuKSBcbiAgICAgIC8vIChpZCxmbilcbiAgICAgIC8vIChpZC50YXJnZXQsZm4pXG5cblxuICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHRoaXMuX2dsb2JhbF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdKVxuICAgICAgaWYgKGFyZ3VtZW50c1swXS5pbmRleE9mKFwiLlwiKSA9PSAtMSkgcmV0dXJuIHRoaXMuX25hbWVkX3N1YnNjcmliZShhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSlcbiAgICAgIGlmIChhcmd1bWVudHNbMF0uaW5kZXhPZihcIi5cIikgPiAtMSkgcmV0dXJuIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdLnNwbGl0KFwiLlwiKVswXSwgYXJndW1lbnRzWzBdLnNwbGl0KFwiLlwiKVsxXSwgYXJndW1lbnRzWzFdKVxuXG4gICAgfVxuICAsIHVuc3Vic2NyaWJlOiBmdW5jdGlvbihpZCkge1xuICAgICAgdGhpcy5zdWJzY3JpYmUoaWQsdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgLCBfZ2xvYmFsX3N1YnNjcmliZTogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHZhciBpZCA9ICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24oYykge1xuICAgICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKSoxNnwwLCB2ID0gYyA9PSAneCcgPyByIDogKHImMHgzfDB4OCk7XG4gICAgICAgICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICAgICAgICB9KVxuICAgICAgLCB0byA9IFwiKlwiO1xuICAgICBcbiAgICAgIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoaWQsdG8sZm4pXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIF9uYW1lZF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGlkLGZuKSB7XG4gICAgICB2YXIgdG8gPSBcIipcIlxuICAgICAgdGhpcy5fdGFyZ2V0dGVkX3N1YnNjcmliZShpZCx0byxmbilcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgX3RhcmdldHRlZF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGlkLHRvLGZuKSB7XG5cbiAgICAgIHZhciBzdWJzY3JpcHRpb25zID0gdGhpcy5nZXRfc3Vic2NyaWJlcnNfb2JqKHRvKVxuICAgICAgICAsIHRvX3N0YXRlID0gdGhpcy5fc3RhdGVbdG9dXG4gICAgICAgICwgc3RhdGUgPSB0aGlzLl9zdGF0ZTtcblxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIGZuID09PSB1bmRlZmluZWQpIHJldHVybiBzdWJzY3JpcHRpb25zW2lkXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVsZXRlIHN1YnNjcmlwdGlvbnNbaWRdXG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICB9XG4gICAgICBzdWJzY3JpcHRpb25zW2lkXSA9IGZuO1xuXG4gICAgICByZXR1cm4gdGhpcyAgICAgIFxuICAgIH1cbiAgXG4gICwgZ2V0X3N1YnNjcmliZXJzX29iajogZnVuY3Rpb24oaykge1xuICAgICAgdGhpcy5fc3Vic2NyaXB0aW9uW2tdID0gdGhpcy5fc3Vic2NyaXB0aW9uW2tdIHx8IHt9XG4gICAgICByZXR1cm4gdGhpcy5fc3Vic2NyaXB0aW9uW2tdXG4gICAgfVxuICAsIGdldF9zdWJzY3JpYmVyc19mbjogZnVuY3Rpb24oaykge1xuICAgICAgdmFyIGZucyA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX29iaihrKVxuICAgICAgICAsIGZ1bmNzID0gT2JqZWN0LmtleXMoZm5zKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gZm5zW3hdIH0pXG4gICAgICAgICwgZm4gPSBmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmNzLm1hcChmdW5jdGlvbihnKSB7IHJldHVybiBnKGVycm9yLHZhbHVlLHN0YXRlKSB9KVxuICAgICAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuXG4gICAgfVxuICAsIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUsIF92YWx1ZSwgX3N0YXRlKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlciA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuKG5hbWUpIHx8IGZ1bmN0aW9uKCkge31cbiAgICAgICAgLCBhbGwgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihcIipcIikgfHwgZnVuY3Rpb24oKSB7fTtcblxuICAgICAgdGhpcy5vbihcImNoYW5nZVwiKShuYW1lLF92YWx1ZSxfc3RhdGUpXG5cbiAgICAgIHN1YnNjcmliZXIoZmFsc2UsX3ZhbHVlLF9zdGF0ZSlcbiAgICAgIGFsbChmYWxzZSxfc3RhdGUpXG4gICAgfVxuICAsIHRyaWdnZXJCYXRjaDogZnVuY3Rpb24ob2JqLCBfc3RhdGUpIHtcblxuICAgICAgdmFyIGFsbCA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuKFwiKlwiKSB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICwgZm5zID0gT2JqZWN0LmtleXMob2JqKS5tYXAoZnVuY3Rpb24oaykgeyBcbiAgICAgICAgICAgIHZhciBmbiA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuIHx8IGZ1bmN0aW9uKCkge31cbiAgICAgICAgICAgIHJldHVybiBmbi5iaW5kKHRoaXMpKGspKGZhbHNlLG9ialtrXSxfc3RhdGUpICBcbiAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICBcbiAgICAgIGFsbChmYWxzZSxfc3RhdGUpXG5cbiAgICB9XG4gICwgX2J1aWxkU3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2N1cnJlbnQpXG5cbiAgICAgIE9iamVjdC5rZXlzKHRoaXMuX3N0YXRpYykubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgIHRoaXMuX3N0YXRlW2tdID0gdGhpcy5fc3RhdGljW2tdXG4gICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgIHRoaXMub24oXCJidWlsZFwiKSh0aGlzLl9zdGF0ZSwgdGhpcy5fY3VycmVudCwgdGhpcy5fc3RhdGljKVxuXG4gICAgICByZXR1cm4gdGhpcy5fc3RhdGVcbiAgICB9XG4gICwgdXBkYXRlOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgICAgdGhpcy5fcGFzdFB1c2godGhpcy5fY3VycmVudClcbiAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgIHZhciBvYmogPSB7fVxuICAgICAgICBvYmpbbmFtZV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2N1cnJlbnQgPSAobmFtZSkgPyBcbiAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5fY3VycmVudCwgb2JqKSA6XG4gICAgICAgIE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2N1cnJlbnQsIHZhbHVlIClcblxuICAgICAgdGhpcy5fYnVpbGRTdGF0ZSgpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHNldFN0YXRpYzogZnVuY3Rpb24oayx2KSB7XG4gICAgICBpZiAoayAhPSB1bmRlZmluZWQgJiYgdiAhPSB1bmRlZmluZWQpIHRoaXMuX3N0YXRpY1trXSA9IHZcbiAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBwdWJsaXNoU3RhdGljOiBmdW5jdGlvbihuYW1lLGNiKSB7XG5cbiAgICAgIHZhciBwdXNoX2NiID0gZnVuY3Rpb24oZXJyb3IsdmFsdWUpIHtcbiAgICAgICAgaWYgKGVycm9yKSByZXR1cm4gc3Vic2NyaWJlcihlcnJvcixudWxsKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5fc3RhdGljW25hbWVdID0gdmFsdWVcbiAgICAgICAgdGhpcy5fYnVpbGRTdGF0ZSgpXG4gICAgICAgIHRoaXMudHJpZ2dlcihuYW1lLCB0aGlzLnN0YXRlKClbbmFtZV0sIHRoaXMuc3RhdGUoKSlcblxuICAgICAgfS5iaW5kKHRoaXMpXG5cbiAgICAgIGlmICh0eXBlb2YgY2IgPT09IFwiZnVuY3Rpb25cIikgY2IocHVzaF9jYilcbiAgICAgIGVsc2UgcHVzaF9jYihmYWxzZSxjYilcblxuICAgICAgcmV0dXJuIHRoaXNcblxuICAgIH1cbiAgLCBfcGFzdFB1c2g6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHRoaXMuX3Bhc3QucHVzaCh2KVxuICAgIH1cbiAgLCBfZnV0dXJlUHVzaDogZnVuY3Rpb24odikge1xuICAgICAgdGhpcy5fZnV0dXJlLnB1c2godilcbiAgICB9XG4gICwgZm9yd2FyZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9wYXN0UHVzaCh0aGlzLl9jdXJyZW50KVxuICAgICAgdGhpcy5fY3VycmVudCA9IHRoaXMuX2Z1dHVyZS5wb3AoKVxuXG4gICAgICB0aGlzLm9uKFwiZm9yd2FyZFwiKSh0aGlzLl9jdXJyZW50LHRoaXMuX3Bhc3QsIHRoaXMuX2Z1dHVyZSlcblxuICAgICAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcbiAgICAgIHRoaXMudHJpZ2dlcihmYWxzZSwgdGhpcy5fc3RhdGUsIHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2Z1dHVyZVB1c2godGhpcy5fY3VycmVudClcbiAgICAgIHRoaXMuX2N1cnJlbnQgPSB0aGlzLl9wYXN0LnBvcCgpXG5cbiAgICAgIHRoaXMub24oXCJiYWNrXCIpKHRoaXMuX2N1cnJlbnQsdGhpcy5fZnV0dXJlLCB0aGlzLl9wYXN0KVxuXG4gICAgICB0aGlzLl9zdGF0ZSA9IHRoaXMuX2J1aWxkU3RhdGUoKVxuICAgICAgdGhpcy50cmlnZ2VyKGZhbHNlLCB0aGlzLl9zdGF0ZSwgdGhpcy5fc3RhdGUpXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCB0aGlzLl9ub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9IFxuICAsIHJlZ2lzdGVyRXZlbnQ6IGZ1bmN0aW9uKG5hbWUsZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZXZlbnRzW25hbWVdIHx8IHRoaXMuX25vb3A7XG4gICAgICB0aGlzLl9ldmVudHNbbmFtZV0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHByZXBhcmVFdmVudDogZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGZuID0gdGhpcy5fZXZlbnRzW25hbWVdIFxuICAgICAgcmV0dXJuIGZuLmJpbmQodGhpcylcbiAgICB9XG4gICwgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24obmFtZSxkYXRhKSB7XG4gICAgICB2YXIgZm4gPSB0aGlzLnByZXBhcmVFdmVudChuYW1lKVxuICAgICAgZm4oZGF0YSlcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG59XG5cbmZ1bmN0aW9uIHN0YXRlKF9jdXJyZW50LCBfc3RhdGljKSB7XG4gIHJldHVybiBuZXcgU3RhdGUoX2N1cnJlbnQsIF9zdGF0aWMpXG59XG5cbnN0YXRlLnByb3RvdHlwZSA9IFN0YXRlLnByb3RvdHlwZVxuXG5leHBvcnQgZGVmYXVsdCBzdGF0ZTtcbiIsImV4cG9ydCBmdW5jdGlvbiBRUyhzdGF0ZSkge1xuICAvL3RoaXMuc3RhdGUgPSBzdGF0ZVxuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy5fZW5jb2RlT2JqZWN0ID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvKVxuICB9XG5cbiAgdGhpcy5fZW5jb2RlQXJyYXkgPSBmdW5jdGlvbihvKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG8pXG4gIH1cbn1cblxuLy8gTFpXLWNvbXByZXNzIGEgc3RyaW5nXG5mdW5jdGlvbiBsendfZW5jb2RlKHMpIHtcbiAgICB2YXIgZGljdCA9IHt9O1xuICAgIHZhciBkYXRhID0gKHMgKyBcIlwiKS5zcGxpdChcIlwiKTtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgdmFyIGN1cnJDaGFyO1xuICAgIHZhciBwaHJhc2UgPSBkYXRhWzBdO1xuICAgIHZhciBjb2RlID0gMjU2O1xuICAgIGZvciAodmFyIGk9MTsgaTxkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN1cnJDaGFyPWRhdGFbaV07XG4gICAgICAgIGlmIChkaWN0W3BocmFzZSArIGN1cnJDaGFyXSAhPSBudWxsKSB7XG4gICAgICAgICAgICBwaHJhc2UgKz0gY3VyckNoYXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvdXQucHVzaChwaHJhc2UubGVuZ3RoID4gMSA/IGRpY3RbcGhyYXNlXSA6IHBocmFzZS5jaGFyQ29kZUF0KDApKTtcbiAgICAgICAgICAgIGRpY3RbcGhyYXNlICsgY3VyckNoYXJdID0gY29kZTtcbiAgICAgICAgICAgIGNvZGUrKztcbiAgICAgICAgICAgIHBocmFzZT1jdXJyQ2hhcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBvdXQucHVzaChwaHJhc2UubGVuZ3RoID4gMSA/IGRpY3RbcGhyYXNlXSA6IHBocmFzZS5jaGFyQ29kZUF0KDApKTtcbiAgICBmb3IgKHZhciBpPTA7IGk8b3V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dFtpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUob3V0W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKFwiXCIpO1xufVxuXG4vLyBEZWNvbXByZXNzIGFuIExaVy1lbmNvZGVkIHN0cmluZ1xuZnVuY3Rpb24gbHp3X2RlY29kZShzKSB7XG4gICAgdmFyIGRpY3QgPSB7fTtcbiAgICB2YXIgZGF0YSA9IChzICsgXCJcIikuc3BsaXQoXCJcIik7XG4gICAgdmFyIGN1cnJDaGFyID0gZGF0YVswXTtcbiAgICB2YXIgb2xkUGhyYXNlID0gY3VyckNoYXI7XG4gICAgdmFyIG91dCA9IFtjdXJyQ2hhcl07XG4gICAgdmFyIGNvZGUgPSAyNTY7XG4gICAgdmFyIHBocmFzZTtcbiAgICBmb3IgKHZhciBpPTE7IGk8ZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY3VyckNvZGUgPSBkYXRhW2ldLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIGlmIChjdXJyQ29kZSA8IDI1Nikge1xuICAgICAgICAgICAgcGhyYXNlID0gZGF0YVtpXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgcGhyYXNlID0gZGljdFtjdXJyQ29kZV0gPyBkaWN0W2N1cnJDb2RlXSA6IChvbGRQaHJhc2UgKyBjdXJyQ2hhcik7XG4gICAgICAgIH1cbiAgICAgICAgb3V0LnB1c2gocGhyYXNlKTtcbiAgICAgICAgY3VyckNoYXIgPSBwaHJhc2UuY2hhckF0KDApO1xuICAgICAgICBkaWN0W2NvZGVdID0gb2xkUGhyYXNlICsgY3VyckNoYXI7XG4gICAgICAgIGNvZGUrKztcbiAgICAgICAgb2xkUGhyYXNlID0gcGhyYXNlO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oXCJcIik7XG59XG5cblFTLnByb3RvdHlwZSA9IHtcbiAgICB0bzogZnVuY3Rpb24oc3RhdGUsZW5jb2RlKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdmFyIHBhcmFtcyA9IE9iamVjdC5rZXlzKHN0YXRlKS5tYXAoZnVuY3Rpb24oaykge1xuXG4gICAgICAgIHZhciB2YWx1ZSA9IHN0YXRlW2tdXG4gICAgICAgICAgLCBvID0gdmFsdWU7XG5cbiAgICAgICAgaWYgKHZhbHVlICYmICh0eXBlb2YodmFsdWUpID09IFwib2JqZWN0XCIpICYmICh2YWx1ZS5sZW5ndGggPiAwKSkge1xuICAgICAgICAgIG8gPSBzZWxmLl9lbmNvZGVBcnJheSh2YWx1ZSlcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YodmFsdWUpID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICBvID0gc2VsZi5fZW5jb2RlT2JqZWN0KHZhbHVlKVxuICAgICAgICB9IFxuXG4gICAgICAgIHJldHVybiBrICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQobykgXG5cbiAgICAgIH0pXG5cbiAgICAgIGlmIChlbmNvZGUpIHJldHVybiBcIj9cIiArIFwiZW5jb2RlZD1cIiArIGJ0b2EoZXNjYXBlKGx6d19lbmNvZGUocGFyYW1zLmpvaW4oXCImXCIpKSkpO1xuICAgICAgcmV0dXJuIFwiP1wiICsgcGFyYW1zLmpvaW4oXCImXCIpXG4gICAgICBcbiAgICB9XG4gICwgZnJvbTogZnVuY3Rpb24ocXMpIHtcbiAgICAgIHZhciBxdWVyeSA9IHt9O1xuICAgICAgaWYgKHFzLmluZGV4T2YoXCI/ZW5jb2RlZD1cIikgPT0gMCkgcXMgPSBsendfZGVjb2RlKHVuZXNjYXBlKGF0b2IocXMuc3BsaXQoXCI/ZW5jb2RlZD1cIilbMV0pKSlcbiAgICAgIHZhciBhID0gcXMuc3Vic3RyKDEpLnNwbGl0KCcmJyk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgYiA9IGFbaV0uc3BsaXQoJz0nKTtcbiAgICAgICAgICBcbiAgICAgICAgICBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldID0gKGRlY29kZVVSSUNvbXBvbmVudChiWzFdIHx8ICcnKSk7XG4gICAgICAgICAgdmFyIF9jaGFyID0gcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXVswXSBcbiAgICAgICAgICBpZiAoKF9jaGFyID09IFwie1wiKSB8fCAoX2NoYXIgPT0gXCJbXCIpKSBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldID0gSlNPTi5wYXJzZShxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHF1ZXJ5O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcXMoc3RhdGUpIHtcbiAgcmV0dXJuIG5ldyBRUyhzdGF0ZSlcbn1cblxucXMucHJvdG90eXBlID0gUVMucHJvdG90eXBlXG5cbmV4cG9ydCBkZWZhdWx0IHFzO1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcGFyaXNvbl9ldmFsKG9iajEsb2JqMixfZmluYWwpIHtcbiAgcmV0dXJuIG5ldyBDb21wYXJpc29uRXZhbChvYmoxLG9iajIsX2ZpbmFsKVxufVxuXG52YXIgbm9vcCA9ICh4KSA9PiB7fVxuICAsIGVxb3AgPSAoeCx5KSA9PiB4ID09IHlcbiAgLCBhY2MgPSAobmFtZSxzZWNvbmQpID0+IHtcbiAgICAgIHJldHVybiAoeCx5KSA9PiBzZWNvbmQgPyB5W25hbWVdIDogeFtuYW1lXSBcbiAgICB9XG5cbmNsYXNzIENvbXBhcmlzb25FdmFsIHtcbiAgY29uc3RydWN0b3Iob2JqMSxvYmoyLF9maW5hbCkge1xuICAgIHRoaXMuX29iajEgPSBvYmoxXG4gICAgdGhpcy5fb2JqMiA9IG9iajJcbiAgICB0aGlzLl9maW5hbCA9IF9maW5hbFxuICAgIHRoaXMuX2NvbXBhcmlzb25zID0ge31cbiAgfVxuXG4gIGFjY2Vzc29yKG5hbWUsYWNjMSxhY2MyKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgYWNjMTogYWNjMVxuICAgICAgLCBhY2MyOiBhY2MyXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3VjY2VzcyhuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgc3VjY2VzczogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBmYWlsdXJlKG5hbWUsZm4pIHtcbiAgICB0aGlzLl9jb21wYXJpc29uc1tuYW1lXSA9IE9iamVjdC5hc3NpZ24oe30sdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0se1xuICAgICAgICBmYWlsdXJlOiBmblxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGVxdWFsKG5hbWUsZm4pIHtcbiAgICB0aGlzLl9jb21wYXJpc29uc1tuYW1lXSA9IE9iamVjdC5hc3NpZ24oe30sdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0se1xuICAgICAgICBlcTogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBldmFsdWF0ZSgpIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLl9jb21wYXJpc29ucykubWFwKCBrID0+IHtcbiAgICAgIHRoaXMuX2V2YWwodGhpcy5fY29tcGFyaXNvbnNba10saylcbiAgICB9KVxuICAgIHJldHVybiB0aGlzLl9maW5hbFxuICB9XG4gIFxuXG4gIGNvbXBhcnNpb24obmFtZSxhY2MxLGFjYzIsZXEsc3VjY2VzcyxmYWlsdXJlKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSB7XG4gICAgICAgIGFjYzE6IGFjYzFcbiAgICAgICwgYWNjMjogYWNjMlxuICAgICAgLCBlcTogZXEgfHwgZXFvcFxuICAgICAgLCBzdWNjZXNzOiBzdWNjZXNzIHx8IG5vb3BcbiAgICAgICwgZmFpbHVyZTogZmFpbHVyZSB8fCBub29wXG4gICAgfVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBfZXZhbChjb21wYXJpc29uLG5hbWUpIHtcbiAgICB2YXIgYWNjMSA9IGNvbXBhcmlzb24uYWNjMSB8fCBhY2MobmFtZSlcbiAgICAgICwgYWNjMiA9IGNvbXBhcmlzb24uYWNjMiB8fCBhY2MobmFtZSx0cnVlKVxuICAgICAgLCB2YWwxID0gYWNjMSh0aGlzLl9vYmoxLHRoaXMuX29iajIpXG4gICAgICAsIHZhbDIgPSBhY2MyKHRoaXMuX29iajEsdGhpcy5fb2JqMilcbiAgICAgICwgZXEgPSBjb21wYXJpc29uLmVxIHx8IGVxb3BcbiAgICAgICwgc3VjYyA9IGNvbXBhcmlzb24uc3VjY2VzcyB8fCBub29wXG4gICAgICAsIGZhaWwgPSBjb21wYXJpc29uLmZhaWx1cmUgfHwgbm9vcFxuXG4gICAgdmFyIF9ldmFsZCA9IGVxKHZhbDEsIHZhbDIpXG5cbiAgICBfZXZhbGQgPyBcbiAgICAgIHN1Y2MuYmluZCh0aGlzKSh2YWwxLHZhbDIsdGhpcy5fZmluYWwpIDogXG4gICAgICBmYWlsLmJpbmQodGhpcykodmFsMSx2YWwyLHRoaXMuX2ZpbmFsKVxuICB9XG5cbiAgXG59XG4iLCJleHBvcnQge2RlZmF1bHQgYXMgc3RhdGV9IGZyb20gXCIuL3NyYy9zdGF0ZVwiO1xuZXhwb3J0IHtkZWZhdWx0IGFzIHFzfSBmcm9tIFwiLi9zcmMvcXNcIjtcbmV4cG9ydCB7ZGVmYXVsdCBhcyBjb21wX2V2YWx9IGZyb20gXCIuL3NyYy9jb21wX2V2YWxcIjtcblxuaW1wb3J0IHN0YXRlIGZyb20gXCIuL3NyYy9zdGF0ZVwiO1xuXG4vLyBkZWJ1Z2dlclxuZXhwb3J0IGNvbnN0IHMgPSB3aW5kb3cuX19zdGF0ZV9fIHx8IHN0YXRlKClcbndpbmRvdy5fX3N0YXRlX18gPSBzXG5cbmV4cG9ydCBkZWZhdWx0IHM7XG4iLCIvL2ltcG9ydCBkMyBmcm9tICdkMydcblxuLyogRlJPTSBPVEhFUiBGSUxFICovXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRG9tYWlucyhkYXRhKSB7XG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkYXRhLmRpc3BsYXlfY2F0ZWdvcmllcy52YWx1ZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cbiAgdmFyIGlkZiA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkge3JldHVybiB4LmRvbWFpbiB9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkge3JldHVybiB4WzBdLmlkZiB9KVxuICAgIC5tYXAoZGF0YS5mdWxsX3VybHMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIkludGVybmV0ICYgVGVsZWNvbVwifSkgKVxuXG4gIHZhciBnZXRJREYgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIChpZGZbeF0gPT0gXCJOQVwiKSB8fCAoaWRmW3hdID4gODY4NikgPyAwIDogaWRmW3hdXG4gIH1cblxuICB2YXIgdmFsdWVzID0gZGF0YS5mdWxsX3VybHNcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwia2V5XCI6eC5kb21haW5cbiAgICAgICAgLCBcInZhbHVlXCI6eC5jb3VudFxuICAgICAgICAsIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAsIFwidW5pcXVlc1wiOiB4LnVuaXF1ZXMgXG4gICAgICAgICwgXCJ1cmxcIjogeC51cmxcbiAgICAgIH0gXG4gICAgfSlcblxuXG5cbiAgdmFsdWVzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5fSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB4WzBdLnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICAsIFwia2V5XCI6IHhbMF0ua2V5XG4gICAgICAgICAsIFwidmFsdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy52YWx1ZX0sMClcbiAgICAgICAgICwgXCJwZXJjZW50X3VuaXF1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnVuaXF1ZXMvYy52YWx1ZX0sMCkveC5sZW5ndGhcbiAgICAgICAgICwgXCJ1cmxzXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwLmluZGV4T2YoYy51cmwpID09IC0xID8gcC5wdXNoKGMudXJsKSA6IHA7IHJldHVybiBwIH0sW10pXG5cbiAgICAgICB9IFxuICAgIH0pXG4gICAgLmVudHJpZXModmFsdWVzKS5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB4LnZhbHVlcyB9KVxuXG4gIGlmIChjYXRlZ29yaWVzLmxlbmd0aCA+IDApXG4gICAgdmFsdWVzID0gdmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KSB7cmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZih4LnBhcmVudF9jYXRlZ29yeV9uYW1lKSA+IC0xIH0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC50Zl9pZGYgPSBnZXRJREYoeC5rZXkpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSBcbiAgICB4LmNvdW50ID0geC52YWx1ZVxuICAgIHgudmFsdWUgPSBNYXRoLmxvZyh4LnRmX2lkZilcbiAgfSlcbiAgdmFsdWVzID0gdmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRmX2lkZiAtIHAudGZfaWRmIH0pXG5cblxuICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQqeC5wZXJjZW50X3VuaXF1ZX0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IFxuICAgIHgucG9wX3BlcmNlbnQgPSAxLjAyL2dldElERih4LmtleSkqMTAwXG4gICAgeC5wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQgPT0gSW5maW5pdHkgPyAwIDogeC5wb3BfcGVyY2VudFxuXG4gICAgeC5wZXJjZW50ID0geC5jb3VudCp4LnBlcmNlbnRfdW5pcXVlL3RvdGFsKjEwMFxuICB9KVxuXG4gIHZhciBub3JtID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAucmFuZ2UoWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnBvcF9wZXJjZW50fSldKVxuICAgIC5kb21haW4oWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHgucGVyY2VudH0pXSlcbiAgICAubmljZSgpXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5wZXJjZW50X25vcm0gPSBub3JtKHgucGVyY2VudClcbiAgICAvL3gucGVyY2VudF9ub3JtID0geC5wZXJjZW50XG4gIH0pXG5cblxuXG4gIFxuICByZXR1cm4gdmFsdWVzO1xuICAvL3tcbiAgLy8gICAga2V5OiBcIlRvcCBEb21haW5zXCJcbiAgLy8gICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCwxMDApXG4gIC8vfVxufVxuXG5cbi8qIEVORCBGUk9NIE9USEVSIEZJTEUgKi9cblxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGQzX3VwZGF0ZWFibGUodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCJcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGZ1bmN0aW9uKHgpe3JldHVybiBkYXRhID8gW2RhdGFdIDogW3hdfSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIFt4XX1cbiAgKVxuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSlcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZDNfc3BsYXQodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCJcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKVxuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSlcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gTWVkaWFQbGFuKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5fb24gPSB7fVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBtZWRpYV9wbGFuKHRhcmdldCkge1xuICByZXR1cm4gbmV3IE1lZGlhUGxhbih0YXJnZXQpXG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybURhdGEoZGF0YSkge1xuXG4gIHZhciBjaCA9IGRhdGEuY2F0ZWdvcnlfaG91ci5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIk5BXCIgfSlcblxuICB2YXIgY2F0ZWdvcnlfaG91ciA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSArIFwiLFwiICsgeC5ob3VyIH0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgIHAudW5pcXVlcyA9IChwLnVuaXF1ZXMgfHwgMCkgKyBjLnVuaXF1ZXNcbiAgICAgICAgcC5jb3VudCA9IChwLmNvdW50IHx8IDApICsgYy5jb3VudFxuICAgICBcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0se30pXG4gICAgfSlcbiAgICAuZW50cmllcyhjaClcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJjYXRlZ29yeVwiOiB4LmtleS5zcGxpdChcIixcIilbMF1cbiAgICAgICAgLCBcImhvdXJcIjogeC5rZXkuc3BsaXQoXCIsXCIpWzFdXG4gICAgICAgICwgXCJjb3VudFwiOiB4LnZhbHVlcy5jb3VudFxuICAgICAgICAsIFwidW5pcXVlc1wiOiB4LnZhbHVlcy51bmlxdWVzXG4gICAgICB9XG4gICAgfSlcblxuICB2YXIgc2NhbGVkID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LmNhdGVnb3J5IH0gKVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgdmFyIG1pbiA9IGQzLm1pbih2LGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQgfSlcbiAgICAgICAgLCBtYXggPSBkMy5tYXgodixmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50IH0pXG5cbiAgICAgICB2YXIgc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgLmRvbWFpbihbbWluLG1heF0pXG4gICAgICAgICAucmFuZ2UoWzAsMTAwXSlcbiAgICAgICBcbiAgICAgICB2YXIgaG91cnMgPSBkMy5yYW5nZSgwLDI0KVxuICAgICAgIGhvdXJzID0gaG91cnMuc2xpY2UoLTQsMjQpLmNvbmNhdChob3Vycy5zbGljZSgwLDIwKSkvLy5zbGljZSgzKS5jb25jYXQoaG91cnMuc2xpY2UoMCwzKSlcblxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwibm9ybWVkXCI6IGhvdXJzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiB2W2ldID8gc2NhbGUodltpXS5jb3VudCkgOiAwIH0pXG4gICAgICAgICAsIFwiY291bnRcIjogaG91cnMubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIHZbaV0gPyB2W2ldLmNvdW50IDogMCB9KVxuICAgICAgIH1cbiAgICAgICAvL3JldHVybiBob3VybHlcbiAgICB9KVxuICAgIC5lbnRyaWVzKGNhdGVnb3J5X2hvdXIpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IHgudG90YWwgPSBkMy5zdW0oeC52YWx1ZXMpOyByZXR1cm4geH0pXG4gICAgLy8uc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudG90YWwgLSBwLnRvdGFsfSlcblxuICByZXR1cm4gc2NhbGVkXG59XG5cbk1lZGlhUGxhbi5wcm90b3R5cGUgPSB7XG4gICAgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICAvL2RlYnVnZ2VyXG4gICAgICBpZiAodGhpcy5kYXRhKCkuY2F0ZWdvcnlfaG91ciA9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzXG5cbiAgICAgICAgICB2YXIgX2QgPSB0aGlzLmRhdGEoKVxuICAgICAgICAgIF9kLmRpc3BsYXlfY2F0ZWdvcmllcyA9IF9kLmRpc3BsYXlfY2F0ZWdvcmllcyB8fCB7XCJ2YWx1ZXNcIjpbXX1cbiAgICAgICAgICB2YXIgZGQgPSBidWlsZERvbWFpbnMoX2QpXG5cbiAgICAgIHZhciBzY2FsZWQgPSB0cmFuc2Zvcm1EYXRhKHRoaXMuZGF0YSgpKVxuXG4gICAgICBcbiAgICAgIHNjYWxlZC5tYXAoZnVuY3Rpb24oeCkge1xuXG4gICAgICAgIHguY291bnQgPSB4LnZhbHVlcy5jb3VudFxuICAgICAgICB4LnZhbHVlcz0geC52YWx1ZXMubm9ybWVkXG5cbiAgICAgIH0pXG5cblxuICAgICAgdGhpcy5yZW5kZXJfbGVmdChzY2FsZWQpXG4gICAgICB0aGlzLnJlbmRlcl9yaWdodChkZCxzY2FsZWQpXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcmVuZGVyX3JpZ2h0OiBmdW5jdGlvbihkLHJvd19kYXRhKSB7XG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIucmhzXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJyaHMgY29sLW1kLTRcIix0cnVlKVxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiQWJvdXQgdGhlIHBsYW5cIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIuZGVzY1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZGVzY1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnRleHQoXCJIaW5kc2lnaHQgaGFzIGF1dG9tYXRpY2FsbHkgZGV0ZXJtaW5lZCB0aGUgYmVzdCBzaXRlcyBhbmQgdGltZXMgd2hlcmUgeW91IHNob3VsZCBiZSB0YXJnZXRpbmcgdXNlcnMuIFRoZSBtZWRpYSBwbGFuIHByZXNlbnRlZCBiZWxvdyBkZXNjcmliZXMgdGhlIG9wdGltaXphdGlvbnMgdGhhdCBjYW4gYmUgbWFkZSB0byBhbnkgcHJvc3BlY3Rpbmcgb3IgcmV0YXJnZXRpbmcgY2FtcGFpZ24gdG8gbG93ZXIgQ1BBIGFuZCBzYXZlIG1vbmV5LlwiKVxuXG4gICAgICB2YXIgcGxhbl90YXJnZXQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIucGxhbi10YXJnZXRcIixcImRpdlwiLHJvd19kYXRhLGZ1bmN0aW9uKCl7cmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcInBsYW4tdGFyZ2V0XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiMTAwcHhcIilcblxuICAgICAgcGxhbl90YXJnZXQuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgICAgaWYgKHJvd19kYXRhLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdmFyIHJlbWFpbmRlcnMgPSByb3dfZGF0YS5tYXAoZnVuY3Rpb24ocikge1xuICAgICAgICBcbiAgICAgICAgICB2YXIgdG9fdGFyZ2V0ID0gZDMuc3VtKHIubWFzay5tYXAoZnVuY3Rpb24oeCxpKXsgcmV0dXJuIHggPyByLmNvdW50W2ldIDogMH0pKVxuICAgICAgICAgIHZhciB0b3RhbCA9IGQzLnN1bShyLmNvdW50KVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHRvdGFsOiB0b3RhbFxuICAgICAgICAgICAgLCB0b190YXJnZXQ6IHRvX3RhcmdldFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICB2YXIgY3V0ID0gZDMuc3VtKHJlbWFpbmRlcnMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnRvX3RhcmdldCoxLjAgfSlcbiAgICAgICAgdmFyIHRvdGFsID0gZDMuc3VtKHJlbWFpbmRlcnMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnRvdGFsIH0pIFxuICAgICAgICB2YXIgcGVyY2VudCA9IGN1dC90b3RhbFxuXG4gICAgICAgIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCwgXCJoMy5zdW1tYXJ5XCIsXCJoM1wiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFt4XX0gLCBmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgICAuY2xhc3NlZChcInN1bW1hcnlcIix0cnVlKVxuICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgICAgLnRleHQoXCJQbGFuIFN1bW1hcnlcIilcblxuXG5cbiAgICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi53aGF0XCIsXCJkaXZcIixmdW5jdGlvbih4KSB7IHJldHVybiBbeF19ICwgZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgICAgLmNsYXNzZWQoXCJ3aGF0XCIsdHJ1ZSlcbiAgICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gXCI8ZGl2IHN0eWxlPSdmb250LXdlaWdodDpib2xkO3dpZHRoOjIwMHB4O3BhZGRpbmctbGVmdDoxMHB4O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtkaXNwbGF5OmlubGluZS1ibG9jayc+UG90ZW50aWFsIEFkcyBTZXJ2ZWQ6PC9kaXY+XCIgKyBkMy5mb3JtYXQoXCIsXCIpKHRvdGFsKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi5hbW91bnRcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFt4XX0gLCBmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgICAuY2xhc3NlZChcImFtb3VudFwiLHRydWUpXG4gICAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0nZm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoyMDBweDtwYWRkaW5nLWxlZnQ6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPk9wdGltaXplZCBBZCBTZXJ2aW5nOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiLFwiKShjdXQpICsgXCIgKFwiICsgZDMuZm9ybWF0KFwiJVwiKShwZXJjZW50KSArIFwiKVwiXG4gICAgICAgICAgfSlcblxuICAgICAgICBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LFwiLmNwYVwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gW3hdfSAsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAgIC5jbGFzc2VkKFwiY3BhXCIsdHJ1ZSlcbiAgICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gXCI8ZGl2IHN0eWxlPSdmb250LXdlaWdodDpib2xkO3dpZHRoOjIwMHB4O3BhZGRpbmctbGVmdDoxMHB4O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtkaXNwbGF5OmlubGluZS1ibG9jayc+RXN0aW1hdGVkIENQQSByZWR1Y3Rpb246PC9kaXY+XCIgKyBkMy5mb3JtYXQoXCIlXCIpKDEtcGVyY2VudClcbiAgICAgICAgICB9KVxuXG5cblxuXG5cbiAgICAgICBcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHZhciBwbGFuX3RhcmdldCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcIi5wbGFuLWRldGFpbHNcIixcImRpdlwiLHJvd19kYXRhKVxuICAgICAgICAuY2xhc3NlZChcInBsYW4tZGV0YWlsc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjE2MHB4XCIpXG5cblxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsIFwiaDMuZGV0YWlsc1wiLFwiaDNcIilcbiAgICAgICAgLmNsYXNzZWQoXCJkZXRhaWxzXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiUGxhbiBEZXRhaWxzXCIpXG5cblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIud2hhdFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwid2hhdFwiLHRydWUpXG4gICAgICAgIC5odG1sKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICByZXR1cm4gXCI8ZGl2IHN0eWxlPSdwYWRkaW5nLWxlZnQ6MTBweDtmb250LXdlaWdodDpib2xkO3dpZHRoOjE0MHB4O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtkaXNwbGF5OmlubGluZS1ibG9jayc+Q2F0ZWdvcnk6PC9kaXY+XCIgKyB4LmtleVxuICAgICAgICB9KVxuXG4gICAgICBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LFwiLnNhdmluZ1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwic2F2aW5nXCIsdHJ1ZSlcbiAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGQuY291bnQpXG4gICAgICAgICAgdmFyIHBlcmNlbnQgPSBkMy5zdW0oeC5jb3VudCxmdW5jdGlvbih6LGkpIHsgcmV0dXJuIHgubWFza1tpXSA/IDAgOiB6fSkvZDMuc3VtKHguY291bnQsZnVuY3Rpb24oeixpKSB7IHJldHVybiB6IH0pXG4gICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0ncGFkZGluZy1sZWZ0OjEwcHg7Zm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoxNDBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPlN0cmF0ZWd5IHNhdmluZ3M6PC9kaXY+XCIgKyBkMy5mb3JtYXQoXCIlXCIpKHBlcmNlbnQpXG4gICAgICAgIH0pXG5cbiAgICAgIHZhciB3aGVuID0gZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi53aGVuXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpeyByZXR1cm4gMSB9KVxuICAgICAgICAuY2xhc3NlZChcIndoZW5cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjgwcHhcIilcbiAgICAgICAgLmh0bWwoXCI8ZGl2IHN0eWxlPSdwYWRkaW5nLWxlZnQ6MTBweDt3aWR0aDoxNDBweDtkaXNwbGF5OmlubGluZS1ibG9jazt2ZXJ0aWNhbC1hbGlnbjp0b3AnPldoZW4gdG8gc2VydmU6PC9kaXY+XCIpXG4gICAgICAgIC5kYXR1bShmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGJvb2wgPSBmYWxzZVxuICAgICAgICAgIHZhciBwb3MgPSAtMVxuICAgICAgICAgIHZhciBzdGFydF9lbmRzID0geC5tYXNrLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgXG4gICAgICAgICAgICAgIHBvcyArPSAxXG4gICAgICAgICAgICAgIGlmIChib29sICE9IGMpIHtcbiAgICAgICAgICAgICAgICBib29sID0gY1xuICAgICAgICAgICAgICAgIHAucHVzaChwb3MpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgICAgIH0sW10pXG4gICAgICAgICAgdmFyIHMgPSBcIlwiXG4gICAgICAgICAgc3RhcnRfZW5kcy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICBpZiAoKGkgIT0gMCkgJiYgKChpJTIpID09IDApKSBzICs9IFwiLCBcIlxuICAgICAgICAgICAgaWYgKGklMikgcyArPSBcIiAtIFwiXG5cbiAgICAgICAgICAgIGlmICh4ID09IDApIHMgKz0gXCIxMmFtXCJcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgbnVtID0gKHgrMSklMTJcbiAgICAgICAgICAgICAgbnVtID0gbnVtID09IDAgPyAxMiA6IG51bVxuICAgICAgICAgICAgICBzICs9IG51bSArICgoeCA+IDExKSA/IFwicG1cIiA6IFwiYW1cIilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgXG4gICAgICAgICAgfSlcbiAgICAgICAgICBpZiAoKHN0YXJ0X2VuZHMubGVuZ3RoKSAlIDIpIHMgKz0gXCIgLSAxMmFtXCJcblxuICAgICAgICAgIHJldHVybiBzLnNwbGl0KFwiLCBcIilcbiAgICAgICAgfSlcblxuICAgICAgIHZhciBpdGVtcyA9IGQzX3VwZGF0ZWFibGUod2hlbixcIi5pdGVtc1wiLFwiZGl2XCIpXG4gICAgICAgICAuY2xhc3NlZChcIml0ZW1zXCIsdHJ1ZSlcbiAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNDBweFwiKVxuICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cbiAgICAgICBkM19zcGxhdChpdGVtcyxcIi5pdGVtXCIsXCJkaXZcIilcbiAgICAgICAgIC5jbGFzc2VkKFwiaXRlbVwiLHRydWUpXG4gICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQwcHhcIilcbiAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcIm5vbmVcIilcbiAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJub3JtYWxcIilcbiAgICAgICAgIC50ZXh0KFN0cmluZylcblxuXG5cbiAgICAgIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLCBcImgzLmV4YW1wbGUtc2l0ZXNcIixcImgzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZXhhbXBsZS1zaXRlc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIkV4YW1wbGUgU2l0ZXNcIilcblxuXG4gICAgICAgdmFyIHJvd3MgPSBkM19zcGxhdCh3cmFwcGVyLFwiLnJvd1wiLFwiZGl2XCIsZC5zbGljZSgwLDE1KSxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgICAgLmNsYXNzZWQoXCJyb3dcIix0cnVlKVxuICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE4cHhcIilcbiAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMjBweFwiKVxuXG4gICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgIHJldHVybiB4LmtleVxuICAgICAgICAgfSlcblxuICAgICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgIH1cbiAgLCByZW5kZXJfbGVmdDogZnVuY3Rpb24oc2NhbGVkKSB7XG5cblxuICAgICAgdmFyIHdyYXBwZXIgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5saHNcIixcImRpdlwiLHNjYWxlZClcbiAgICAgICAgLmNsYXNzZWQoXCJsaHMgY29sLW1kLThcIix0cnVlKVxuXG4gICAgICB3cmFwcGVyLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiTWVkaWEgUGxhbiAoQ2F0ZWdvcnkgYW5kIFRpbWUgT3B0aW1pemF0aW9uKVwiKVxuXG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIuaGVhZFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGVhZFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjFweFwiKVxuXG4gICAgICB2YXIgbmFtZSA9IGQzX3VwZGF0ZWFibGUoaGVhZCxcIi5uYW1lXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICBkM19zcGxhdChoZWFkLFwiLmhvdXJcIixcImRpdlwiLGQzLnJhbmdlKDEsMjUpLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSlcbiAgICAgICAgLmNsYXNzZWQoXCJzcSBob3VyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi44NWVtXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKHggPT0gMSkgcmV0dXJuIFwiPGI+MWE8L2I+XCJcbiAgICAgICAgICBpZiAoeCA9PSAyNCkgcmV0dXJuIFwiPGI+MTJhPC9iPlwiXG4gICAgICAgICAgaWYgKHggPT0gMTIpIHJldHVybiBcIjxiPjEycDwvYj5cIlxuICAgICAgICAgIHJldHVybiB4ID4gMTEgPyB4JTEyIDogeFxuICAgICAgICB9KVxuXG5cbiAgICAgIHZhciByb3cgPSBkM19zcGxhdCh3cmFwcGVyLFwiLnJvd1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJyb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIxcHhcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSArIFwiIHJvd1wiIH0pXG4gICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgIHZhciBfZCA9IHNlbGYuZGF0YSgpXG4gICAgICAgICAgX2QuZGlzcGxheV9jYXRlZ29yaWVzID0gX2QuZGlzcGxheV9jYXRlZ29yaWVzIHx8IHtcInZhbHVlc1wiOltdfVxuICAgICAgICAgIHZhciBkZCA9IGJ1aWxkRG9tYWlucyhfZClcblxuICAgICAgICAgIHZhciBkID0gZGQuZmlsdGVyKGZ1bmN0aW9uKHopIHsgcmV0dXJuIHoucGFyZW50X2NhdGVnb3J5X25hbWUgPT0geC5rZXl9KVxuICAgICAgICAgIFxuXG4gICAgICAgICAgc2VsZi5yZW5kZXJfcmlnaHQoZCx4KVxuICAgICAgICB9KVxuXG4gICAgICB2YXIgTUFHSUMgPSAyNSBcblxuICAgICAgdmFyIG5hbWUgPSBkM191cGRhdGVhYmxlKHJvdyxcIi5uYW1lXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG5cbiAgICAgIHZhciBjb2xvcnMgPSBbXCIjYTFkOTliXCIsIFwiIzc0YzQ3NlwiLCBcIiM0MWFiNWRcIiwgXCIjMjM4YjQ1XCIsIFwiIzAwNmQyY1wiLCBcIiMwMDQ0MWJcIl1cbiAgICAgIHZhciBjb2xvcnMgPSBbXCIjMjM4YjQ1XCJdXG5cbiAgICAgIHZhciBvID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAgIC5kb21haW4oWy0yNSwxMDBdKVxuICAgICAgICAucmFuZ2UoY29sb3JzKTtcblxuICAgICAgdmFyIHNxdWFyZSA9IGQzX3NwbGF0KHJvdyxcIi5zcVwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpIH0pIFxuICAgICAgICAuY2xhc3NlZChcInNxXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsZnVuY3Rpb24oeCxpKSB7IFxuICAgICAgICAgIHZhciBwZCA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXzsgXG4gICAgICAgICAgcGQubWFzayA9IHBkLm1hc2sgfHwgW11cbiAgICAgICAgICBwZC5tYXNrW2ldID0gKCh4ID4gTUFHSUMpICYmICggKHBkLnZhbHVlc1tpLTFdID4gTUFHSUMgfHwgZmFsc2UpIHx8IChwZC52YWx1ZXNbaSsxXSA+IE1BR0lDfHwgZmFsc2UpICkpXG4gICAgICAgICAgLy9yZXR1cm4gcGQubWFza1tpXSA/IG8ocGQudmFsdWVzW2ldKSAgOiBcInJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoIDQ1ZGVnLCAjZmVlMGQyLCAjZmVlMGQyIDJweCwgI2ZjYmJhMSA1cHgsICNmY2JiYTEgMnB4KSBcIlxuICAgICAgICAgIHJldHVybiBwZC5tYXNrW2ldID8gXG4gICAgICAgICAgICBcInJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoIDEzNWRlZywgIzIzOGI0NSwgIzIzOGI0NSAycHgsICMwMDZkMmMgNXB4LCAjMDA2ZDJjIDJweCkgXCIgOiBcbiAgICAgICAgICAgIFwicmVwZWF0aW5nLWxpbmVhci1ncmFkaWVudCggNDVkZWcsICNmZWUwZDIsICNmZWUwZDIgMnB4LCAjZmNiYmExIDVweCwgI2ZjYmJhMSAycHgpIFwiXG5cbiAgICAgICAgfSlcblxuXG4gICAgfVxuICAsIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl90YXJnZXQuZGF0dW0oKVxuICAgICAgdGhpcy5fdGFyZ2V0LmRhdHVtKGQpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiLy9pbXBvcnQgZDMgZnJvbSAnZDMnXG5cbmZ1bmN0aW9uIGQzX3VwZGF0ZWFibGUodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCI7XG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gICk7XG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKTtcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5mdW5jdGlvbiBkM19zcGxhdCh0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIjtcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKTtcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpO1xuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cblxudmFyIHR5cGV3YXRjaCA9IChmdW5jdGlvbigpe1xuICB2YXIgdGltZXIgPSAwO1xuICByZXR1cm4gZnVuY3Rpb24oY2FsbGJhY2ssIG1zKXtcbiAgICBjbGVhclRpbWVvdXQgKHRpbWVyKTtcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoY2FsbGJhY2ssIG1zKTtcbiAgfTtcbn0pKCk7XG5cblxuXG5mdW5jdGlvbiBGaWx0ZXIodGFyZ2V0KSB7XG4gIHRoaXMuX3RhcmdldCA9IHRhcmdldDtcbiAgdGhpcy5fZGF0YSA9IGZhbHNlO1xuICB0aGlzLl9vbiA9IHt9O1xuICB0aGlzLl9yZW5kZXJfb3AgPSB7fTtcbn1cblxuZnVuY3Rpb24gZmlsdGVyJDIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRmlsdGVyKHRhcmdldClcbn1cblxuRmlsdGVyLnByb3RvdHlwZSA9IHtcbiAgICBkcmF3OiBmdW5jdGlvbigpIHtcblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5maWx0ZXJzLXdyYXBwZXJcIixcImRpdlwiLHRoaXMuZGF0YSgpLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiZmlsdGVycy13cmFwcGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsIFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsIFwiMjBweFwiKTtcblxuICAgICAgdmFyIGZpbHRlcnMgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuZmlsdGVyc1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiZmlsdGVyc1wiLHRydWUpO1xuICAgICAgXG4gICAgICB2YXIgZmlsdGVyID0gZDNfc3BsYXQoZmlsdGVycyxcIi5maWx0ZXJcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSxmdW5jdGlvbih4LGkpIHsgcmV0dXJuIGkgKyB4LmZpZWxkIH0pXG4gICAgICAgIC5jbGFzc2VkKFwiZmlsdGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIik7XG5cbiAgICAgIGZpbHRlci5leGl0KCkucmVtb3ZlKCk7XG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIGZpbHRlci5lYWNoKGZ1bmN0aW9uKHYscG9zKSB7XG4gICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAgICAgc2VsZi5maWx0ZXJSb3coZHRoaXMsIHNlbGYuX2ZpZWxkcywgc2VsZi5fb3BzLCB2KTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICB0aGlzLmZpbHRlckZvb3Rlcih3cmFwKTtcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICAgIFxuICAgIH1cbiAgLCBvcHM6IGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vcHNcbiAgICAgIHRoaXMuX29wcyA9IGQ7XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBmaWVsZHM6IGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9maWVsZHNcbiAgICAgIHRoaXMuX2ZpZWxkcyA9IGQ7XG4gICAgICByZXR1cm4gdGhpc1xuICBcdH1cbiAgLCBkYXRhOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZGF0YVxuICAgICAgdGhpcy5fZGF0YSA9IGQ7XG4gICAgICByZXR1cm4gdGhpc1xuICBcdH1cbiAgLCB0ZXh0OiBmdW5jdGlvbihmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9mbiB8fCBmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5IH1cbiAgICAgIHRoaXMuX2ZuID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCByZW5kZXJfb3A6IGZ1bmN0aW9uKG9wLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX3JlbmRlcl9vcFtvcF0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX3JlbmRlcl9vcFtvcF0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbixmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBidWlsZE9wOiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHZhciBvcCA9IG9iai5vcFxuICAgICAgICAsIGZpZWxkID0gb2JqLmZpZWxkXG4gICAgICAgICwgdmFsdWUgPSBvYmoudmFsdWU7XG4gICAgXG4gICAgICBpZiAoIFtvcCxmaWVsZCx2YWx1ZV0uaW5kZXhPZih1bmRlZmluZWQpID4gLTEpIHJldHVybiBmdW5jdGlvbigpIHtyZXR1cm4gdHJ1ZX1cbiAgICBcbiAgICAgIHJldHVybiB0aGlzLl9vcHNbb3BdKGZpZWxkLCB2YWx1ZSlcbiAgICB9XG4gICwgZmlsdGVyUm93OiBmdW5jdGlvbihfZmlsdGVyLCBmaWVsZHMsIG9wcywgdmFsdWUpIHtcbiAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIHJlbW92ZSA9IGQzX3VwZGF0ZWFibGUoX2ZpbHRlcixcIi5yZW1vdmVcIixcImFcIilcbiAgICAgICAgLmNsYXNzZWQoXCJyZW1vdmVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbG9hdFwiLFwicmlnaHRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLmh0bWwoXCImIzEwMDA1O1wiKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgbmV3X2RhdGEgPSBzZWxmLmRhdGEoKS5maWx0ZXIoZnVuY3Rpb24oZikgeyByZXR1cm4gZiAhPT0geCB9KTtcbiAgICAgICAgICBzZWxmLmRhdGEobmV3X2RhdGEpO1xuICAgICAgICAgIHNlbGYuZHJhdygpO1xuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICB2YXIgZmlsdGVyID0gZDNfdXBkYXRlYWJsZShfZmlsdGVyLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJpbm5lclwiLHRydWUpO1xuXG4gICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJzZWxlY3QuZmllbGRcIixcInNlbGVjdFwiLGZpZWxkcylcbiAgICAgICAgLmNsYXNzZWQoXCJmaWVsZFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNjVweFwiKVxuICAgICAgICAub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgdmFsdWUuZmllbGQgPSB0aGlzLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXztcbiAgICAgICAgICBcbiAgICAgICAgICB2YXIgcG9zID0gMDtcbiAgICAgICAgICBmaWVsZHMubWFwKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgICAgaWYgKHggPT0gdmFsdWUuZmllbGQpIHBvcyA9IGk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgc2VsZWN0ZWQgPSBvcHNbcG9zXS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgPT0gdmFsdWUub3AgfSk7XG4gICAgICAgICAgaWYgKHNlbGVjdGVkLmxlbmd0aCA9PSAwKSB2YWx1ZS5vcCA9IG9wc1twb3NdWzBdLmtleTtcbiAgICAgICAgICAvL3ZhbHVlLmZuID0gc2VsZi5idWlsZE9wKHZhbHVlKVxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpO1xuXG4gICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgICAgc2VsZi5kcmF3T3BzKGZpbHRlciwgb3BzW3Bvc10sIHZhbHVlLCBwb3MpO1xuICAgICAgICB9KTtcbiAgICAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShzZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiKVxuICAgICAgICAucHJvcGVydHkoXCJkaXNhYmxlZFwiICx0cnVlKVxuICAgICAgICAucHJvcGVydHkoXCJoaWRkZW5cIiwgdHJ1ZSlcbiAgICAgICAgLnRleHQoXCJGaWx0ZXIuLi5cIik7XG5cbiAgICAgIFxuICAgICAgZDNfc3BsYXQoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9KVxuICAgICAgICAuYXR0cihcInNlbGVjdGVkXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggPT0gdmFsdWUuZmllbGQgPyBcInNlbGVjdGVkXCIgOiB1bmRlZmluZWQgfSk7XG5cbiAgICAgIGlmICh2YWx1ZS5vcCAmJiB2YWx1ZS5maWVsZCAmJiB2YWx1ZS52YWx1ZSkge1xuICAgICAgICB2YXIgcG9zID0gZmllbGRzLmluZGV4T2YodmFsdWUuZmllbGQpO1xuICAgICAgICBzZWxmLmRyYXdPcHMoZmlsdGVyLCBvcHNbcG9zXSwgdmFsdWUsIHBvcyk7XG4gICAgICB9XG5cblxuICAgIH1cbiAgLCBkcmF3T3BzOiBmdW5jdGlvbihmaWx0ZXIsIG9wcywgdmFsdWUpIHtcblxuICAgICAgXG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic2VsZWN0Lm9wXCIsXCJzZWxlY3RcIixmYWxzZSwgZnVuY3Rpb24oeCkge3JldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJvcFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLm9uKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHZhbHVlLm9wID0gdGhpcy5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18ua2V5O1xuICAgICAgICAgIC8vdmFsdWUuZm4gPSBzZWxmLmJ1aWxkT3AodmFsdWUpXG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSk7XG4gICAgICAgICAgc2VsZi5kcmF3SW5wdXQoZmlsdGVyLCB2YWx1ZSwgdmFsdWUub3ApO1xuICAgICAgICB9KTtcblxuICAgICAgLy92YXIgZGZsdCA9IFt7XCJrZXlcIjpcIlNlbGVjdCBPcGVyYXRpb24uLi5cIixcImRpc2FibGVkXCI6dHJ1ZSxcImhpZGRlblwiOnRydWV9XVxuXG4gICAgICB2YXIgbmV3X29wcyA9IG9wczsgLy9kZmx0LmNvbmNhdChvcHMpXG5cbiAgICAgIHZhbHVlLm9wID0gdmFsdWUub3AgfHwgbmV3X29wc1swXS5rZXk7XG5cbiAgICAgIHZhciBvcHMgPSBkM19zcGxhdChzZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiLG5ld19vcHMsZnVuY3Rpb24oeCl7cmV0dXJuIHgua2V5fSlcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkuc3BsaXQoXCIuXCIpWzBdIH0pIFxuICAgICAgICAuYXR0cihcInNlbGVjdGVkXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5ID09IHZhbHVlLm9wID8gXCJzZWxlY3RlZFwiIDogdW5kZWZpbmVkIH0pO1xuXG4gICAgICBvcHMuZXhpdCgpLnJlbW92ZSgpO1xuICAgICAgc2VsZi5kcmF3SW5wdXQoZmlsdGVyLCB2YWx1ZSwgdmFsdWUub3ApO1xuXG4gICAgfVxuICAsIGRyYXdJbnB1dDogZnVuY3Rpb24oZmlsdGVyLCB2YWx1ZSwgb3ApIHtcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnZhbHVlXCIpLnJlbW92ZSgpO1xuICAgICAgdmFyIHIgPSB0aGlzLl9yZW5kZXJfb3Bbb3BdO1xuXG4gICAgICBpZiAocikge1xuICAgICAgICByZXR1cm4gci5iaW5kKHRoaXMpKGZpbHRlcix2YWx1ZSlcbiAgICAgIH1cblxuICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dC52YWx1ZVwiLFwiaW5wdXRcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTUwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjFlbVwiKVxuXG4gICAgICAgIC5hdHRyKFwidmFsdWVcIiwgdmFsdWUudmFsdWUpXG4gICAgICAgIC5vbihcImtleXVwXCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHZhciB0ID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgICAgdHlwZXdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSB0LnZhbHVlO1xuICAgICAgICAgICAgLy92YWx1ZS5mbiA9IHNlbGYuYnVpbGRPcCh2YWx1ZSlcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpO1xuICAgICAgICAgIH0sMTAwMCk7XG4gICAgICAgIH0pO1xuICAgIFxuICAgIH1cbiAgLCBmaWx0ZXJGb290ZXI6IGZ1bmN0aW9uKHdyYXApIHtcbiAgICAgIHZhciBmb290ZXIgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuZmlsdGVyLWZvb3RlclwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiZmlsdGVyLWZvb3RlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMTBweFwiKTtcblxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoZm9vdGVyLFwiLmFkZFwiLFwiYVwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImFkZFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5odG1sKFwiJiM2NTI5MTtcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMS41cHggc29saWQgIzQyOEJDQ1wiKVxuICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIixcInBvaW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIFxuICAgICAgICAgIHZhciBkID0gc2VsZi5fZGF0YTtcbiAgICAgICAgICBpZiAoZC5sZW5ndGggPT0gMCB8fCBPYmplY3Qua2V5cyhkLnNsaWNlKC0xKSkubGVuZ3RoID4gMCkgZC5wdXNoKHt9KTtcbiAgICAgICAgICBzZWxmLmRyYXcoKTtcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICwgdHlwZXdhdGNoOiB0eXBld2F0Y2hcbn07XG5cbmZ1bmN0aW9uIGFjY2Vzc29yJDEoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWw7XG4gIHJldHVybiB0aGlzXG59XG5cbmZ1bmN0aW9uIEZpbHRlckRhdGEoZGF0YSkge1xuICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgdGhpcy5fbCA9IFwib3JcIjtcbn1cblxuZnVuY3Rpb24gZmlsdGVyX2RhdGEoZGF0YSkge1xuICByZXR1cm4gbmV3IEZpbHRlckRhdGEoZGF0YSlcbn1cblxuRmlsdGVyRGF0YS5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3NvciQxLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9XG4gICwgbG9naWM6IGZ1bmN0aW9uKGwpIHtcbiAgICAgIGlmIChsID09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2xcbiAgICAgIHRoaXMuX2wgPSAobCA9PSBcImFuZFwiKSA/IFwiYW5kXCIgOiBcIm9yXCI7XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvcDogZnVuY3Rpb24ob3AsIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29wc1tvcF0gfHwgdGhpcy5fb3BzW1wiZXF1YWxzXCJdO1xuICAgICAgdGhpcy5fb3BzW29wXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcblxuICAgIH1cbiAgLCBieTogZnVuY3Rpb24oYikge1xuICAgICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICAgLCBmaWx0ZXIgPSBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBpZiAoYi5sZW5ndGggPT0gMCkgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG1hc2sgPSBiLm1hcChmdW5jdGlvbih6KSB7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICB2YXIgc3BsaXQgPSB6LmZpZWxkLnNwbGl0KFwiLlwiKSwgZmllbGQgPSBzcGxpdC5zbGljZSgtMSlbMF1cbiAgICAgICAgICAgICAgICAsIG9iaiA9IHNwbGl0LnNsaWNlKDAsLTEpLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHBbY10gfSx4KVxuICAgICAgICAgICAgICAgICwgb3NwbGl0ID0gei5vcC5zcGxpdChcIi5cIiksIG9wID0gb3NwbGl0WzBdO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgcmV0dXJuIHNlbGYub3Aob3ApKGZpZWxkLHoudmFsdWUpKG9iailcbiAgICAgICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHggfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzZWxmLl9sID09IFwiYW5kXCIpIHJldHVybiBtYXNrLmxlbmd0aCA9PSBiLmxlbmd0aFxuICAgICAgICAgICAgcmV0dXJuIG1hc2subGVuZ3RoID4gMFxuICAgICAgICAgIH07XG4gICAgICBcbiAgICAgIHJldHVybiB0aGlzLl9kYXRhLmZpbHRlcihmaWx0ZXIpXG5cbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIF9vcHM6IHtcbiAgICAgICAgXCJlcXVhbHNcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcoeFtmaWVsZF0pID09IFN0cmluZyh2YWx1ZSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbi8vICAgICAgLCBcImNvbnRhaW5zXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuLy8gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbi8vICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xXG4vLyAgICAgICAgICB9XG4vLyAgICAgICAgfVxuICAgICAgLCBcInN0YXJ0cyB3aXRoXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID09IDBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJlbmRzIHdpdGhcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoU3RyaW5nKHhbZmllbGRdKS5sZW5ndGggLSBTdHJpbmcodmFsdWUpLmxlbmd0aCkgPT0gU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiZG9lcyBub3QgZXF1YWxcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcoeFtmaWVsZF0pICE9IFN0cmluZyh2YWx1ZSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJpcyBzZXRcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeFtmaWVsZF0gIT0gdW5kZWZpbmVkKSAmJiAoeFtmaWVsZF0gIT0gXCJcIilcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJpcyBub3Qgc2V0XCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4geFtmaWVsZF0gPT0gdW5kZWZpbmVkXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiYmV0d2VlblwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHhbZmllbGRdKSA+PSB2YWx1ZVswXSAmJiBwYXJzZUludCh4W2ZpZWxkXSkgPD0gdmFsdWVbMV1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJpcyBpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xIH0sIDApID4gMFxuICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICAgICwgXCJpcyBub3QgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMSB9LCAwKSA9PSAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgICAgLCBcImRvZXMgbm90IGNvbnRhaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnRvTG93ZXJDYXNlKCkuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpLnRvTG93ZXJDYXNlKCkpID4gLTEgfSwgMCkgPT0gMFxuICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICAgICwgXCJjb250YWluc1wiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUudG9Mb3dlckNhc2UoKS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkudG9Mb3dlckNhc2UoKSkgPiAtMSB9LCAwKSA+IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIHZlcnNpb24gPSBcIjAuMC4xXCI7XG5cbmV4cG9ydCB7IHZlcnNpb24sIGZpbHRlciQyIGFzIGZpbHRlciwgZmlsdGVyX2RhdGEgfTtcbiIsImV4cG9ydCBmdW5jdGlvbiBwcmVwRGF0YShkZCkge1xuICB2YXIgcCA9IFtdXG4gIGQzLnJhbmdlKDAsMjQpLm1hcChmdW5jdGlvbih0KSB7XG4gICAgW1wiMFwiLFwiMjBcIixcIjQwXCJdLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICBpZiAodCA8IDEwKSBwLnB1c2goXCIwXCIgKyBTdHJpbmcodCkrU3RyaW5nKG0pKVxuICAgICAgZWxzZSBwLnB1c2goU3RyaW5nKHQpK1N0cmluZyhtKSlcblxuICAgIH0pXG4gIH0pXG4gIHZhciByb2xsZWQgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKGspIHsgcmV0dXJuIGsuaG91ciArIGsubWludXRlIH0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgIHAuYXJ0aWNsZXNbYy51cmxdID0gdHJ1ZVxuICAgICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgICAgcC5zZXNzaW9ucyArPSBjLnVuaXF1ZXNcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0seyBhcnRpY2xlczoge30sIHZpZXdzOiAwLCBzZXNzaW9uczogMH0pXG4gICAgfSlcbiAgICAuZW50cmllcyhkZClcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgIE9iamVjdC5rZXlzKHgudmFsdWVzKS5tYXAoZnVuY3Rpb24oeSkge1xuICAgICAgICB4W3ldID0geC52YWx1ZXNbeV1cbiAgICAgIH0pXG4gICAgICB4LmFydGljbGVfY291bnQgPSBPYmplY3Qua2V5cyh4LmFydGljbGVzKS5sZW5ndGhcbiAgICAgIHguaG91ciA9IHgua2V5LnNsaWNlKDAsMilcbiAgICAgIHgubWludXRlID0geC5rZXkuc2xpY2UoMilcbiAgICAgIHgudmFsdWUgPSB4LmFydGljbGVfY291bnRcbiAgICAgIHgua2V5ID0gcC5pbmRleE9mKHgua2V5KVxuICAgICAgLy9kZWxldGUgeFsnYXJ0aWNsZXMnXVxuICAgICAgcmV0dXJuIHhcbiAgICB9KVxuICByZXR1cm4gcm9sbGVkXG59XG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5KHVybHMsY29tcGFyaXNvbikge1xuICB2YXIgc3VtbWFyeV9kYXRhID0gYnVpbGRTdW1tYXJ5RGF0YSh1cmxzKVxuICAgICwgcG9wX3N1bW1hcnlfZGF0YSA9IGJ1aWxkU3VtbWFyeURhdGEoY29tcGFyaXNvbilcblxuICByZXR1cm4gYnVpbGRTdW1tYXJ5QWdncmVnYXRpb24oc3VtbWFyeV9kYXRhLHBvcF9zdW1tYXJ5X2RhdGEpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN1bW1hcnlEYXRhKGRhdGEpIHtcbiAgdmFyIHJlZHVjZWQgPSBkYXRhLnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICAgIHAuZG9tYWluc1tjLmRvbWFpbl0gPSB0cnVlXG4gICAgICBwLmFydGljbGVzW2MudXJsXSA9IHRydWVcbiAgICAgIHAudmlld3MgKz0gYy5jb3VudFxuICAgICAgcC5zZXNzaW9ucyArPSBjLnVuaXF1ZXNcblxuICAgICAgcmV0dXJuIHBcbiAgICB9LHtcbiAgICAgICAgZG9tYWluczoge31cbiAgICAgICwgYXJ0aWNsZXM6IHt9XG4gICAgICAsIHNlc3Npb25zOiAwXG4gICAgICAsIHZpZXdzOiAwXG4gICAgfSlcblxuICByZWR1Y2VkLmRvbWFpbnMgPSBPYmplY3Qua2V5cyhyZWR1Y2VkLmRvbWFpbnMpLmxlbmd0aFxuICByZWR1Y2VkLmFydGljbGVzID0gT2JqZWN0LmtleXMocmVkdWNlZC5hcnRpY2xlcykubGVuZ3RoXG5cbiAgcmV0dXJuIHJlZHVjZWRcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU3VtbWFyeUFnZ3JlZ2F0aW9uKHNhbXAscG9wKSB7XG4gICAgICB2YXIgZGF0YV9zdW1tYXJ5ID0ge31cbiAgICAgIE9iamVjdC5rZXlzKHNhbXApLm1hcChmdW5jdGlvbihrKSB7XG4gICAgICAgIGRhdGFfc3VtbWFyeVtrXSA9IHtcbiAgICAgICAgICAgIHNhbXBsZTogc2FtcFtrXVxuICAgICAgICAgICwgcG9wdWxhdGlvbjogcG9wW2tdXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBkYXRhX3N1bW1hcnlcbiAgXG59XG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXRlZ29yaWVzT2xkKGRhdGEpIHtcbiAgdmFyIHZhbHVlcyA9IGRhdGEuY2F0ZWdvcnlcbiAgICAgICAgLm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHtcImtleVwiOiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lLCBcInZhbHVlXCI6IHguY291bnQgfSB9KVxuICAgICAgICAuc29ydChmdW5jdGlvbihwLGMpIHtyZXR1cm4gYy52YWx1ZSAtIHAudmFsdWUgfSkuc2xpY2UoMCwxNSlcbiAgICAsIHRvdGFsID0gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLCB4KSB7cmV0dXJuIHAgKyB4LnZhbHVlIH0sIDApXG5cbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJDYXRlZ29yaWVzXCJcbiAgICAsIHZhbHVlczogdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IHgucGVyY2VudCA9IHgudmFsdWUvdG90YWw7IHJldHVybiB4fSlcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUaW1lcyhkYXRhKSB7XG5cbiAgdmFyIGhvdXIgPSBkYXRhLmN1cnJlbnRfaG91clxuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIGlmIChjYXRlZ29yaWVzLmxlbmd0aCA+IDApIHtcbiAgICBob3VyID0gZGF0YS5jYXRlZ29yeV9ob3VyLmZpbHRlcihmdW5jdGlvbih4KSB7cmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZih4LnBhcmVudF9jYXRlZ29yeV9uYW1lKSA+IC0xfSlcbiAgICBob3VyID0gZDMubmVzdCgpXG4gICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguaG91ciB9KVxuICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4Lm1pbnV0ZSB9KVxuICAgICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICAgIHJldHVybiB2LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgXG4gICAgICAgICAgcC51bmlxdWVzID0gKHAudW5pcXVlcyB8fCAwKSArIGMudW5pcXVlczsgXG4gICAgICAgICAgcC5jb3VudCA9IChwLmNvdW50IHx8IDApICsgYy5jb3VudDsgIFxuICAgICAgICAgIHJldHVybiBwIH0se30pXG4gICAgICB9KVxuICAgICAgLmVudHJpZXMoaG91cilcbiAgICAgIC5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgY29uc29sZS5sb2coeC52YWx1ZXMpOyBcbiAgICAgICAgcmV0dXJuIHgudmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLGspeyBcbiAgICAgICAgICBwWydtaW51dGUnXSA9IHBhcnNlSW50KGsua2V5KTsgXG4gICAgICAgICAgcFsnY291bnQnXSA9IGsudmFsdWVzLmNvdW50OyBcbiAgICAgICAgICBwWyd1bmlxdWVzJ10gPSBrLnZhbHVlcy51bmlxdWVzOyBcbiAgICAgICAgICByZXR1cm4gcCBcbiAgICAgIH0sIHtcImhvdXJcIjp4LmtleX0pIH0gKVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGhvdXJcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHtcImtleVwiOiBwYXJzZUZsb2F0KHguaG91cikgKyAxICsgeC5taW51dGUvNjAsIFwidmFsdWVcIjogeC5jb3VudCB9IH0pXG5cbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJCcm93c2luZyBiZWhhdmlvciBieSB0aW1lXCJcbiAgICAsIHZhbHVlczogdmFsdWVzXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVG9waWNzKGRhdGEpIHtcblxuICB2YXIgY2F0ZWdvcmllcyA9IGRhdGEuZGlzcGxheV9jYXRlZ29yaWVzLnZhbHVlc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC50b3BpY30pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7cmV0dXJuIHhbMF0uaWRmIH0pXG4gICAgLm1hcChkYXRhLmZ1bGxfdXJscy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiSW50ZXJuZXQgJiBUZWxlY29tXCJ9KSApXG5cbiAgdmFyIGdldElERiA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gKGlkZlt4XSA9PSBcIk5BXCIpIHx8IChpZGZbeF0gPiA4Njg2KSA/IDAgOiBpZGZbeF1cbiAgfVxuXG4gIHZhciB2YWx1ZXMgPSBkYXRhLmZ1bGxfdXJsc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b3BpYyA/IHgudG9waWMudG9Mb3dlckNhc2UoKSAhPSBcIm5vIHRvcGljXCIgOiB0cnVlIH0pXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImtleVwiOngudG9waWNcbiAgICAgICAgLCBcInZhbHVlXCI6eC5jb3VudFxuICAgICAgICAsIFwidW5pcXVlc1wiOiB4LnVuaXF1ZXMgXG4gICAgICAgICwgXCJ1cmxcIjogeC51cmxcbiAgICAgIH0gXG4gICAgfSlcblxuXG5cbiAgdmFsdWVzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5fSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgXCJrZXlcIjogeFswXS5rZXlcbiAgICAgICAgICwgXCJ2YWx1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnZhbHVlfSwwKVxuICAgICAgICAgLCBcInBlcmNlbnRfdW5pcXVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudW5pcXVlcy9jLnZhbHVlfSwwKS94Lmxlbmd0aFxuICAgICAgICAgLCBcInVybHNcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHAuaW5kZXhPZihjLnVybCkgPT0gLTEgPyBwLnB1c2goYy51cmwpIDogcDsgcmV0dXJuIHAgfSxbXSlcblxuICAgICAgIH0gXG4gICAgfSlcbiAgICAuZW50cmllcyh2YWx1ZXMpLm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHgudmFsdWVzIH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMClcbiAgICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTEgfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnRmX2lkZiA9IGdldElERih4LmtleSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpIFxuICAgIHguY291bnQgPSB4LnZhbHVlXG4gICAgeC5pbXBvcnRhbmNlID0gTWF0aC5sb2coeC50Zl9pZGYpXG4gIH0pXG4gIHZhbHVlcyA9IHZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy50Zl9pZGYgLSBwLnRmX2lkZiB9KVxuXG5cbiAgdmFyIHRvdGFsID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50KngucGVyY2VudF91bmlxdWV9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICB4LnBvcF9wZXJjZW50ID0gMS4wMi9nZXRJREYoeC5rZXkpKjEwMFxuICAgIHgucG9wX3BlcmNlbnQgPSB4LnBvcF9wZXJjZW50ID09IEluZmluaXR5ID8gMCA6IHgucG9wX3BlcmNlbnRcblxuICAgIHguc2FtcGxlX3BlcmNlbnQgPSB4LmNvdW50KngucGVyY2VudF91bmlxdWUvdG90YWwqMTAwXG4gIH0pXG5cbiAgdmFyIG5vcm0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgIC5yYW5nZShbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXsgcmV0dXJuIHgucG9wX3BlcmNlbnR9KV0pXG4gICAgLmRvbWFpbihbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXtyZXR1cm4geC5zYW1wbGVfcGVyY2VudH0pXSlcbiAgICAubmljZSgpXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5zYW1wbGVfcGVyY2VudF9ub3JtID0gbm9ybSh4LnNhbXBsZV9wZXJjZW50KVxuXG4gICAgeC5yYXRpbyA9IHguc2FtcGxlX3BlcmNlbnQveC5wb3BfcGVyY2VudFxuICAgIC8veC5wZXJjZW50X25vcm0gPSB4LnBlcmNlbnRcbiAgfSlcblxuXG5cbiAgXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiVG9wIFRvcGljc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5zbGljZSgwLDMwMClcbiAgfVxufVxuXG5cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZE9uc2l0ZVN1bW1hcnkoZGF0YSkge1xuICB2YXIgeWVzdGVyZGF5ID0gZGF0YS50aW1lc2VyaWVzX2RhdGFbMF1cbiAgdmFyIHZhbHVlcyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJrZXlcIjogXCJQYWdlIFZpZXdzXCJcbiAgICAgICAgICAsIFwidmFsdWVcIjogeWVzdGVyZGF5LnZpZXdzXG4gICAgICAgIH1cbiAgICAgICwge1xuICAgICAgICAgICAgXCJrZXlcIjogXCJVbmlxdWUgVmlzaXRvcnNcIlxuICAgICAgICAgICwgXCJ2YWx1ZVwiOiB5ZXN0ZXJkYXkudW5pcXVlc1xuXG4gICAgICAgIH1cbiAgICBdXG4gIHJldHVybiB7XCJrZXlcIjpcIk9uLXNpdGUgQWN0aXZpdHlcIixcInZhbHVlc1wiOnZhbHVlc31cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkT2Zmc2l0ZVN1bW1hcnkoZGF0YSkge1xuICB2YXIgdmFsdWVzID0gWyAgXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwia2V5XCI6IFwiT2ZmLXNpdGUgVmlld3NcIlxuICAgICAgICAgICwgXCJ2YWx1ZVwiOiBkYXRhLmZ1bGxfdXJscy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7cmV0dXJuIHAgKyBjLnVuaXF1ZXN9LDApXG4gICAgICAgIH1cbiAgICAgICwge1xuICAgICAgICAgICAgXCJrZXlcIjogXCJVbmlxdWUgcGFnZXNcIlxuICAgICAgICAgICwgXCJ2YWx1ZVwiOiBPYmplY3Qua2V5cyhkYXRhLmZ1bGxfdXJscy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7cFtjLnVybF0gPSAwOyByZXR1cm4gcCB9LHt9KSkubGVuZ3RoXG4gICAgICAgIH1cbiAgICBdXG4gIHJldHVybiB7XCJrZXlcIjpcIk9mZi1zaXRlIEFjdGl2aXR5XCIsXCJ2YWx1ZXNcIjp2YWx1ZXN9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFjdGlvbnMoZGF0YSkge1xuICBcbiAgcmV0dXJuIHtcImtleVwiOlwiU2VnbWVudHNcIixcInZhbHVlc1wiOiBkYXRhLmFjdGlvbnMubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4ge1wia2V5XCI6eC5hY3Rpb25fbmFtZSwgXCJ2YWx1ZVwiOjAsIFwic2VsZWN0ZWRcIjogZGF0YS5hY3Rpb25fbmFtZSA9PSB4LmFjdGlvbl9uYW1lIH0gfSl9XG59XG5cblxuLy8gZnJvbSBkYXRhLmpzXG5cblxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGREYXRhKGRhdGEsYnVja2V0cyxwb3BfY2F0ZWdvcmllcykge1xuXG4gIHZhciB0aW1lcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgLm1hcChkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJcIiB9KSApXG5cbiAgdmFyIGNhdHMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAubWFwKGRhdGEuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIlwiIH0pIClcblxuXG5cblxuICB2YXIgdGltZV9jYXRlZ29yaWVzID0gYnVja2V0cy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbY10gPSB7fTsgcmV0dXJuIHAgfSwge30pXG4gIHZhciBjYXRlZ29yeV90aW1lcyA9IE9iamVjdC5rZXlzKGNhdHMpLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjXSA9IHt9OyByZXR1cm4gcCB9LCB7fSlcblxuXG4gIHZhciBjYXRlZ29yaWVzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnRpbWVfZGlmZl9idWNrZXQgfSlcbiAgICAuZW50cmllcyhkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJcIiB9KSApXG4gICAgLm1hcChmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJvdy52YWx1ZXMubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgdC5wZXJjZW50ID0gZDMuc3VtKHQudmFsdWVzLGZ1bmN0aW9uKGQpeyByZXR1cm4gZC51bmlxdWVzfSkvIGQzLnN1bSh0aW1lc1t0LmtleV0sZnVuY3Rpb24oZCkge3JldHVybiBkLnVuaXF1ZXN9KSBcbiAgICAgICAgdGltZV9jYXRlZ29yaWVzW3Qua2V5XVtyb3cua2V5XSA9IHQucGVyY2VudFxuICAgICAgICBjYXRlZ29yeV90aW1lc1tyb3cua2V5XVt0LmtleV0gPSB0LnBlcmNlbnRcblxuICAgICAgfSlcbiAgICAgIHJldHVybiByb3dcbiAgICB9KVxuICAgIC5zb3J0KGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gKChwb3BfY2F0ZWdvcmllc1tiLmtleV0gfHwge30pLm5vcm1hbGl6ZWRfcG9wIHx8IDApLSAoKHBvcF9jYXRlZ29yaWVzW2Eua2V5XSB8fCB7fSkubm9ybWFsaXplZF9wb3AgfHwgMCkgfSlcblxuXG4gIHZhciB0aW1lX25vcm1hbGl6ZV9zY2FsZXMgPSB7fVxuXG4gIGQzLmVudHJpZXModGltZV9jYXRlZ29yaWVzKS5tYXAoZnVuY3Rpb24odHJvdykge1xuICAgIHZhciB2YWx1ZXMgPSBkMy5lbnRyaWVzKHRyb3cudmFsdWUpLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH0pXG4gICAgdGltZV9ub3JtYWxpemVfc2NhbGVzW3Ryb3cua2V5XSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFtkMy5taW4odmFsdWVzKSxkMy5tYXgodmFsdWVzKV0pXG4gICAgICAucmFuZ2UoWzAsMV0pXG4gIH0pXG5cbiAgdmFyIGNhdF9ub3JtYWxpemVfc2NhbGVzID0ge31cblxuICBkMy5lbnRyaWVzKGNhdGVnb3J5X3RpbWVzKS5tYXAoZnVuY3Rpb24odHJvdykge1xuICAgIHZhciB2YWx1ZXMgPSBkMy5lbnRyaWVzKHRyb3cudmFsdWUpLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH0pXG4gICAgY2F0X25vcm1hbGl6ZV9zY2FsZXNbdHJvdy5rZXldID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oW2QzLm1pbih2YWx1ZXMpLGQzLm1heCh2YWx1ZXMpXSlcbiAgICAgIC5yYW5nZShbMCwxXSlcbiAgfSlcblxuICBjYXRlZ29yaWVzLm1hcChmdW5jdGlvbihwKSB7XG4gICAgdmFyIGNhdCA9IHAua2V5XG4gICAgcC52YWx1ZXMubWFwKGZ1bmN0aW9uKHEpIHtcbiAgICAgIHEubm9ybV9jYXQgPSBjYXRfbm9ybWFsaXplX3NjYWxlc1tjYXRdKHEucGVyY2VudClcbiAgICAgIHEubm9ybV90aW1lID0gdGltZV9ub3JtYWxpemVfc2NhbGVzW3Eua2V5XShxLnBlcmNlbnQpXG5cbiAgICAgIHEuc2NvcmUgPSAyKnEubm9ybV9jYXQvMyArIHEubm9ybV90aW1lLzNcbiAgICAgIHEuc2NvcmUgPSBxLm5vcm1fdGltZVxuXG4gICAgICB2YXIgcGVyY2VudF9wb3AgPSBwb3BfY2F0ZWdvcmllc1tjYXRdID8gcG9wX2NhdGVnb3JpZXNbY2F0XS5wZXJjZW50X3BvcCA6IDBcblxuICAgICAgcS5wZXJjZW50X2RpZmYgPSAocS5wZXJjZW50IC0gcGVyY2VudF9wb3ApL3BlcmNlbnRfcG9wXG5cbiAgICB9KVxuICB9KVxuXG4gIHJldHVybiBjYXRlZ29yaWVzXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmVwYXJlRmlsdGVycyhmaWx0ZXJzKSB7XG4gIHZhciBtYXBwaW5nID0ge1xuICAgICAgXCJDYXRlZ29yeVwiOiBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCJcbiAgICAsIFwiVGl0bGVcIjogXCJ1cmxcIlxuICAgICwgXCJUaW1lXCI6IFwiaG91clwiXG4gIH1cblxuICB2YXIgZmlsdGVycyA9IGZpbHRlcnMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE9iamVjdC5rZXlzKHgpLmxlbmd0aCAmJiB4LnZhbHVlIH0pLm1hcChmdW5jdGlvbih6KSB7XG4gICAgcmV0dXJuIHsgXG4gICAgICAgIFwiZmllbGRcIjogbWFwcGluZ1t6LmZpZWxkXVxuICAgICAgLCBcIm9wXCI6IHoub3BcbiAgICAgICwgXCJ2YWx1ZVwiOiB6LnZhbHVlXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBmaWx0ZXJzXG59XG4iLCJleHBvcnQgZnVuY3Rpb24gYXV0b1NpemUod3JhcCxhZGp1c3RXaWR0aCxhZGp1c3RIZWlnaHQpIHtcblxuICBmdW5jdGlvbiBlbGVtZW50VG9XaWR0aChlbGVtKSB7XG5cbiAgICB2YXIgX3cgPSB3cmFwLm5vZGUoKS5vZmZzZXRXaWR0aCB8fCB3cmFwLm5vZGUoKS5wYXJlbnROb2RlLm9mZnNldFdpZHRoIHx8IHdyYXAubm9kZSgpLnBhcmVudE5vZGUucGFyZW50Tm9kZS5vZmZzZXRXaWR0aFxuICAgIHZhciBudW0gPSBfdyB8fCB3cmFwLnN0eWxlKFwid2lkdGhcIikuc3BsaXQoXCIuXCIpWzBdLnJlcGxhY2UoXCJweFwiLFwiXCIpIFxuICAgIHJldHVybiBwYXJzZUludChudW0pXG4gIH1cblxuICBmdW5jdGlvbiBlbGVtZW50VG9IZWlnaHQoZWxlbSkge1xuICAgIHZhciBudW0gPSB3cmFwLnN0eWxlKFwiaGVpZ2h0XCIpLnNwbGl0KFwiLlwiKVswXS5yZXBsYWNlKFwicHhcIixcIlwiKVxuICAgIHJldHVybiBwYXJzZUludChudW0pXG4gIH1cblxuICB2YXIgdyA9IGVsZW1lbnRUb1dpZHRoKHdyYXApIHx8IDcwMCxcbiAgICBoID0gZWxlbWVudFRvSGVpZ2h0KHdyYXApIHx8IDM0MDtcblxuICB3ID0gYWRqdXN0V2lkdGgodylcbiAgaCA9IGFkanVzdEhlaWdodChoKVxuXG5cbiAgdmFyIG1hcmdpbiA9IHt0b3A6IDEwLCByaWdodDogMTUsIGJvdHRvbTogMTAsIGxlZnQ6IDE1fSxcbiAgICAgIHdpZHRoICA9IHcgLSBtYXJnaW4ubGVmdCAtIG1hcmdpbi5yaWdodCxcbiAgICAgIGhlaWdodCA9IGggLSBtYXJnaW4udG9wIC0gbWFyZ2luLmJvdHRvbTtcblxuICByZXR1cm4ge1xuICAgIG1hcmdpbjogbWFyZ2luLFxuICAgIHdpZHRoOiB3aWR0aCxcbiAgICBoZWlnaHQ6IGhlaWdodFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdXRvU2NhbGVzKF9zaXplcywgbGVuKSB7XG5cbiAgdmFyIG1hcmdpbiA9IF9zaXplcy5tYXJnaW4sXG4gICAgd2lkdGggPSBfc2l6ZXMud2lkdGgsXG4gICAgaGVpZ2h0ID0gX3NpemVzLmhlaWdodDtcblxuICBoZWlnaHQgPSBsZW4gKiAyNlxuICBcbiAgdmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLnJhbmdlKFt3aWR0aC8yLCB3aWR0aC0yMF0pO1xuICBcbiAgdmFyIHkgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5yYW5nZVJvdW5kQmFuZHMoWzAsIGhlaWdodF0sIC4yKTtcblxuICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoeClcbiAgICAgIC5vcmllbnQoXCJ0b3BcIik7XG5cblxuICByZXR1cm4ge1xuICAgICAgeDogeFxuICAgICwgeTogeVxuICAgICwgeEF4aXM6IHhBeGlzXG4gIH1cbn1cbiIsImltcG9ydCAqIGFzIHN0YXRlIGZyb20gJ3N0YXRlJ1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZShxc19zdGF0ZSxfc3RhdGUpIHtcblxuICB2YXIgdXBkYXRlcyA9IHt9XG5cblxuICBzdGF0ZS5jb21wX2V2YWwocXNfc3RhdGUsX3N0YXRlLHVwZGF0ZXMpXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInNlbGVjdGVkX2FjdGlvblwiXG4gICAgICAsICh4LHkpID0+IHkuYWN0aW9ucy5maWx0ZXIoeiA9PiB6LmFjdGlvbl9pZCA9PSB4LnNlbGVjdGVkX2FjdGlvbilbMF1cbiAgICAgICwgKHgseSkgPT4geS5zZWxlY3RlZF9hY3Rpb25cbiAgICApXG4gICAgLmZhaWx1cmUoXCJzZWxlY3RlZF9hY3Rpb25cIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcInNlbGVjdGVkX2FjdGlvblwiOiBfbmV3XG4gICAgICB9KVxuICAgIH0pXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInRhYl9wb3NpdGlvblwiXG4gICAgICAsICh4LHkpID0+IHgudGFiX3Bvc2l0aW9uXG4gICAgICAsIChfLHkpID0+IHkudGFiX3Bvc2l0aW9uXG4gICAgKVxuICAgIC5mYWlsdXJlKFwidGFiX3Bvc2l0aW9uXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7XG4gICAgICBPYmplY3QuYXNzaWduKG9iaiwgeyBcInRhYl9wb3NpdGlvblwiOiBfbmV3IH0pXG4gICAgfSlcblxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJ0cmFuc2Zvcm1cIlxuICAgICAgLCAoeCx5KSA9PiB4LnRyYW5zZm9ybVxuICAgICAgLCAoXyx5KSA9PiB5LnRyYW5zZm9ybVxuICAgIClcbiAgICAuZmFpbHVyZShcInRyYW5zZm9ybVwiLCAoX25ldyxfb2xkLG9iaikgPT4ge1xuICAgICAgT2JqZWN0LmFzc2lnbihvYmosIHsgXCJ0cmFuc2Zvcm1cIjogX25ldyB9KVxuICAgIH0pXG5cblxuXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInNvcnRcIlxuICAgICAgLCAoeCx5KSA9PiB4LnNvcnRcbiAgICAgICwgKF8seSkgPT4geS5zb3J0XG4gICAgKVxuICAgIC5mYWlsdXJlKFwic29ydFwiLCAoX25ldyxfb2xkLG9iaikgPT4ge1xuICAgICAgT2JqZWN0LmFzc2lnbihvYmosIHsgXCJzb3J0XCI6IF9uZXcgfSlcbiAgICB9KVxuXG5cbiAgICAuYWNjZXNzb3IoXG4gICAgICAgIFwiYXNjZW5kaW5nXCJcbiAgICAgICwgKHgseSkgPT4geC5hc2NlbmRpbmdcbiAgICAgICwgKF8seSkgPT4geS5hc2NlbmRpbmdcbiAgICApXG4gICAgLmZhaWx1cmUoXCJhc2NlbmRpbmdcIiwgKF9uZXcsX29sZCxvYmopID0+IHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLCB7IFwiYXNjZW5kaW5nXCI6IF9uZXcgfSlcbiAgICB9KVxuXG5cbiAgICAuYWNjZXNzb3IoXG4gICAgICAgIFwic2VsZWN0ZWRfdmlld1wiXG4gICAgICAsICh4LHkpID0+IHguc2VsZWN0ZWRfdmlld1xuICAgICAgLCAoXyx5KSA9PiB5LmRhc2hib2FyZF9vcHRpb25zLmZpbHRlcih4ID0+IHguc2VsZWN0ZWQpWzBdLnZhbHVlIFxuICAgIClcbiAgICAuZmFpbHVyZShcInNlbGVjdGVkX3ZpZXdcIiwgKF9uZXcsX29sZCxvYmopID0+IHtcbiAgICAgIC8vIHRoaXMgc2hvdWxkIGJlIHJlZG9uZSBzbyBpdHMgbm90IGRpZmZlcmVudCBsaWtlIHRoaXNcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLCB7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcImRhc2hib2FyZF9vcHRpb25zXCI6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoX3N0YXRlLmRhc2hib2FyZF9vcHRpb25zKSkubWFwKHggPT4geyBcbiAgICAgICAgICAgIHguc2VsZWN0ZWQgPSAoeC52YWx1ZSA9PSBfbmV3KTsgXG4gICAgICAgICAgICByZXR1cm4geCBcbiAgICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzZWxlY3RlZF9jb21wYXJpc29uXCJcbiAgICAgICwgKHgseSkgPT4geS5hY3Rpb25zLmZpbHRlcih6ID0+IHouYWN0aW9uX2lkID09IHguc2VsZWN0ZWRfY29tcGFyaXNvbilbMF1cbiAgICAgICwgKHgseSkgPT4geS5zZWxlY3RlZF9jb21wYXJpc29uXG4gICAgKVxuICAgIC5mYWlsdXJlKFwic2VsZWN0ZWRfY29tcGFyaXNvblwiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHtcbiAgICAgICAgICBcImxvYWRpbmdcIjogdHJ1ZVxuICAgICAgICAsIFwic2VsZWN0ZWRfY29tcGFyaXNvblwiOiBfbmV3XG4gICAgICB9KVxuICAgIH0pXG4gICAgLmVxdWFsKFwiZmlsdGVyc1wiLCAoeCx5KSA9PiBKU09OLnN0cmluZ2lmeSh4KSA9PSBKU09OLnN0cmluZ2lmeSh5KSApXG4gICAgLmZhaWx1cmUoXCJmaWx0ZXJzXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmose1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJmaWx0ZXJzXCI6IF9uZXcgfHwgW3t9XVxuICAgICAgfSlcbiAgICB9KVxuICAgIC5mYWlsdXJlKFwiYWN0aW9uX2RhdGVcIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7IGxvYWRpbmc6IHRydWUsIFwiYWN0aW9uX2RhdGVcIjogX25ldyB9KVxuICAgIH0pXG4gICAgLmZhaWx1cmUoXCJjb21wYXJpc29uX2RhdGVcIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7IGxvYWRpbmc6IHRydWUsIFwiY29tcGFyaXNvbl9kYXRlXCI6IF9uZXcgfSlcbiAgICB9KVxuXG4gICAgLmV2YWx1YXRlKClcblxuICB2YXIgY3VycmVudCA9IHN0YXRlLnFzKHt9KS50byhfc3RhdGUucXNfc3RhdGUgfHwge30pXG4gICAgLCBwb3AgPSBzdGF0ZS5xcyh7fSkudG8ocXNfc3RhdGUpXG5cbiAgaWYgKE9iamVjdC5rZXlzKHVwZGF0ZXMpLmxlbmd0aCAmJiBjdXJyZW50ICE9IHBvcCkge1xuICAgIHJldHVybiB1cGRhdGVzXG4gIH1cblxuICByZXR1cm4ge31cbiAgXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IHtmaWx0ZXJfZGF0YX0gZnJvbSAnZmlsdGVyJztcblxuZXhwb3J0ICogZnJvbSAnLi9oZWxwZXJzL2RhdGFfaGVscGVycydcbmV4cG9ydCAqIGZyb20gJy4vaGVscGVycy9ncmFwaF9oZWxwZXJzJ1xuZXhwb3J0ICogZnJvbSAnLi9oZWxwZXJzL3N0YXRlX2hlbHBlcnMnXG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYWNjZXNzb3IoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWxcbiAgcmV0dXJuIHRoaXNcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvcFNlY3Rpb24oc2VjdGlvbikge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZShzZWN0aW9uLFwiLnRvcC1zZWN0aW9uXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInRvcC1zZWN0aW9uXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCIxNjBweFwiKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVtYWluaW5nU2VjdGlvbihzZWN0aW9uKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHNlY3Rpb24sXCIucmVtYWluaW5nLXNlY3Rpb25cIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwicmVtYWluaW5nLXNlY3Rpb25cIix0cnVlKVxufVxuXG52YXIgb3BzID0ge1xuICAgIFwiaXMgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUuc3BsaXQoXCIsXCIpXG4gICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xIH0sIDApID4gMFxuICAgICAgICB9IFxuICAgICAgfVxuICAsIFwiaXMgbm90IGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKVxuICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMSB9LCAwKSA9PSAwXG4gICAgICAgIH0gXG4gICAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmVMb2dpYyhvcHRpb25zKSB7XG4gIGNvbnN0IF9kZWZhdWx0ID0gb3B0aW9uc1swXVxuICBjb25zdCBzZWxlY3RlZCA9IG9wdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguc2VsZWN0ZWQgfSlcbiAgcmV0dXJuIHNlbGVjdGVkLmxlbmd0aCA+IDAgPyBzZWxlY3RlZFswXSA6IF9kZWZhdWx0XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJVcmxzKHVybHMsbG9naWMsZmlsdGVycykge1xuICByZXR1cm4gZmlsdGVyX2RhdGEodXJscylcbiAgICAub3AoXCJpcyBpblwiLCBvcHNbXCJpcyBpblwiXSlcbiAgICAub3AoXCJpcyBub3QgaW5cIiwgb3BzW1wiaXMgbm90IGluXCJdKVxuICAgIC5sb2dpYyhsb2dpYy52YWx1ZSlcbiAgICAuYnkoZmlsdGVycylcbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIFNlbGVjdCh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7fVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzZWxlY3QodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU2VsZWN0KHRhcmdldClcbn1cblxuU2VsZWN0LnByb3RvdHlwZSA9IHtcbiAgICBvcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwib3B0aW9uc1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB0aGlzLl9zZWxlY3QgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwic2VsZWN0XCIsXCJzZWxlY3RcIix0aGlzLl9vcHRpb25zKVxuXG4gICAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwic2VsZWN0XCIpLmJpbmQodGhpcylcblxuICAgICAgdGhpcy5fc2VsZWN0XG4gICAgICAgIC5vbihcImNoYW5nZVwiLGZ1bmN0aW9uKHgpIHsgYm91bmQodGhpcy5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18pIH0pXG5cbiAgICAgIHRoaXMuX29wdGlvbnMgPSBkM19zcGxhdCh0aGlzLl9zZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiLGlkZW50aXR5LGtleSlcbiAgICAgICAgLnRleHQoa2V5KVxuICAgICAgICAucHJvcGVydHkoXCJzZWxlY3RlZFwiLCAoeCkgPT4ge1xuXG4gICAgICAgICAgY29uc29sZS5sb2codGhpcy5fc2VsZWN0ZWQseC52YWx1ZSlcbiAgICAgICAgICByZXR1cm4gKHgudmFsdWUgJiYgeC52YWx1ZSA9PSB0aGlzLl9zZWxlY3RlZCkgPyBcbiAgICAgICAgICAgIFwic2VsZWN0ZWRcIiA6IHguc2VsZWN0ZWQgPT0gMSA/IFxuICAgICAgICAgICAgXCJzZWxlY3RlZFwiIDogbnVsbFxuICAgICAgICAgXG4gICAgICAgIH0pXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHNlbGVjdGVkOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2VsZWN0ZWRcIix2YWwpXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuL3NlbGVjdCdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmZ1bmN0aW9uIGluamVjdENzcyhjc3Nfc3RyaW5nKSB7XG4gIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI2hlYWRlci1jc3NcIixcInN0eWxlXCIpXG4gICAgLmF0dHIoXCJpZFwiLFwiaGVhZGVyLWNzc1wiKVxuICAgIC50ZXh0KENTU19TVFJJTkcucmVwbGFjZShcImZ1bmN0aW9uICgpIHsvKlwiLFwiXCIpLnJlcGxhY2UoXCIqL31cIixcIlwiKSlcbn1cblxuZnVuY3Rpb24gYnV0dG9uV3JhcCh3cmFwKSB7XG4gIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwLCBcImgzLmJ1dHRvbnNcIixcImgzXCIpXG4gICAgLmNsYXNzZWQoXCJidXR0b25zXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuXG4gIHZhciByaWdodF9wdWxsID0gZDNfdXBkYXRlYWJsZShoZWFkLFwiLnB1bGwtcmlnaHRcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcInB1bGwtcmlnaHQgaGVhZGVyLWJ1dHRvbnNcIiwgdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjE3cHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjJweFwiKVxuICAgIC5zdHlsZShcInRleHQtZGVjb3JhdGlvblwiLFwibm9uZSAhaW1wb3J0YW50XCIpXG5cbiAgcmV0dXJuIHJpZ2h0X3B1bGxcbn1cblxuZnVuY3Rpb24gZXhwYW5zaW9uV3JhcCh3cmFwKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHdyYXAsXCJkaXYuaGVhZGVyLWJvZHlcIixcImRpdlwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTNweFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJub25lXCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwibm9ybWFsXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjE3NXB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMjVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjI1cHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjE3NXB4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwid2hpdGVcIilcbiAgICAuY2xhc3NlZChcImhlYWRlci1ib2R5IGhpZGRlblwiLHRydWUpXG59XG5cbmZ1bmN0aW9uIGhlYWRXcmFwKHdyYXApIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUod3JhcCwgXCJoMy5kYXRhLWhlYWRlclwiLFwiaDNcIilcbiAgICAuY2xhc3NlZChcImRhdGEtaGVhZGVyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCIgYm9sZFwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiIDE0cHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiIDIycHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwiIHVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIgIzg4OFwiKVxuICAgIC5zdHlsZShcImxldHRlci1zcGFjaW5nXCIsXCIgLjA1ZW1cIilcblxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBIZWFkZXIodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcblxuICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuICAgIC5oZWFkZXItYnV0dG9ucyBhIHNwYW4uaG92ZXItc2hvdyB7IGRpc3BsYXk6bm9uZSB9XG4gICAgLmhlYWRlci1idXR0b25zIGE6aG92ZXIgc3Bhbi5ob3Zlci1zaG93IHsgZGlzcGxheTppbmxpbmU7IHBhZGRpbmctbGVmdDozcHggfVxuICAqL30pXG4gIFxufVxuXG5mdW5jdGlvbiBoZWFkZXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgSGVhZGVyKHRhcmdldClcbn1cblxuSGVhZGVyLnByb3RvdHlwZSA9IHtcbiAgICB0ZXh0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGV4dFwiLHZhbCkgXG4gICAgfVxuXG5cbiAgLCBzZWxlY3Rfb25seTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlbGVjdF9vbmx5XCIsdmFsKSBcbiAgICB9XG4gICwgb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm9wdGlvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBidXR0b25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYnV0dG9uc1wiLHZhbCkgXG4gICAgfVxuICAsIGV4cGFuc2lvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImV4cGFuc2lvblwiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICBcblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LCBcIi5oZWFkZXItd3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGVhZGVyLXdyYXBcIix0cnVlKVxuXG4gICAgICB2YXIgZXhwYW5kX3dyYXAgPSBleHBhbnNpb25XcmFwKHdyYXApXG4gICAgICAgICwgYnV0dG9uX3dyYXAgPSBidXR0b25XcmFwKHdyYXApXG4gICAgICAgICwgaGVhZF93cmFwID0gaGVhZFdyYXAod3JhcClcblxuICAgICAgaWYgKHRoaXMuX3NlbGVjdF9vbmx5KSB7XG4gICAgICAgIHZhciBib3VuZCA9IHRoaXMub24oXCJzZWxlY3RcIikuYmluZCh0aGlzKVxuXG4gICAgICAgIFxuXG4gICAgICAgIHZhciBzZWxlY3RCb3ggPSBzZWxlY3QoaGVhZF93cmFwKVxuICAgICAgICAgIC5vcHRpb25zKHRoaXMuX29wdGlvbnMpXG4gICAgICAgICAgLm9uKFwic2VsZWN0XCIsZnVuY3Rpb24oeCkgeyBib3VuZCh4KSB9KVxuICAgICAgICAgIC5kcmF3KClcblxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgZDNfdXBkYXRlYWJsZShoZWFkX3dyYXAsXCJzcGFuLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgICAgIC5jbGFzc2VkKFwidGl0bGVcIix0cnVlKVxuICAgICAgICAudGV4dCh0aGlzLl90ZXh0KVxuXG4gICAgICBpZiAodGhpcy5fb3B0aW9ucykge1xuXG4gICAgICAgIHZhciBib3VuZCA9IHRoaXMub24oXCJzZWxlY3RcIikuYmluZCh0aGlzKVxuXG4gICAgICAgIHZhciBzZWxlY3RCb3ggPSBzZWxlY3QoaGVhZF93cmFwKVxuICAgICAgICAgIC5vcHRpb25zKHRoaXMuX29wdGlvbnMpXG4gICAgICAgICAgLm9uKFwic2VsZWN0XCIsZnVuY3Rpb24oeCkgeyBib3VuZCh4KSB9KVxuICAgICAgICAgIC5kcmF3KClcblxuICAgICAgICBzZWxlY3RCb3guX3NlbGVjdFxuICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOXB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEycHhcIilcbiAgICAgICAgICBcbiAgICAgICAgc2VsZWN0Qm94Ll9vcHRpb25zXG4gICAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcIiM4ODhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEwMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiNXB4XCIpXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9idXR0b25zKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBhID0gZDNfc3BsYXQoYnV0dG9uX3dyYXAsXCJhXCIsXCJhXCIsdGhpcy5fYnV0dG9ucywgZnVuY3Rpb24oeCkgeyByZXR1cm4geC50ZXh0IH0pXG4gICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcIm1pZGRsZVwiKVxuICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJpZ2h0XCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjJweFwiKVxuICAgICAgICAgIC5zdHlsZShcInRleHQtZGVjb3JhdGlvblwiLFwibm9uZVwiKVxuICAgICAgICAgIC5odG1sKHggPT4gXCI8c3BhbiBjbGFzcz0nXCIgKyB4Lmljb24gKyBcIic+PC9zcGFuPjxzcGFuIHN0eWxlPSdwYWRkaW5nLWxlZnQ6M3B4Jz5cIiArIHgudGV4dCArIFwiPC9zcGFuPlwiKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIix4ID0+IHguY2xhc3MpXG4gICAgICAgICAgLm9uKFwiY2xpY2tcIix4ID0+IHRoaXMub24oeC5jbGFzcyArIFwiLmNsaWNrXCIpKHgpKVxuXG5cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG5leHBvcnQgZGVmYXVsdCBoZWFkZXI7XG4iLCJpbXBvcnQge2FjY2Vzc29yLCBkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgbm9vcH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBkMyBmcm9tICdkMyc7XG5pbXBvcnQgJy4vdGFibGUuY3NzJ1xuXG5cbnZhciBFWEFNUExFX0RBVEEgPSB7XG4gICAgXCJrZXlcIjogXCJUb3AgU2l0ZXNcIlxuICAsIFwidmFsdWVzXCI6IFtcbiAgICAgIHsgIFxuICAgICAgICAgIFwia2V5XCI6XCJVUkwuY29tXCJcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjpcImFvbC5jb21cIlxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgXSBcbn1cblxuZnVuY3Rpb24gVGFibGUodGFyZ2V0KSB7XG4gIHRoaXMuX3dyYXBwZXJfY2xhc3MgPSBcInRhYmxlLXdyYXBwZXJcIlxuICB0aGlzLl90YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMuX2RhdGEgPSB7fS8vRVhBTVBMRV9EQVRBXG4gIHRoaXMuX3NvcnQgPSB7fVxuICB0aGlzLl9yZW5kZXJlcnMgPSB7fVxuICB0aGlzLl90b3AgPSAwXG5cbiAgdGhpcy5fZGVmYXVsdF9yZW5kZXJlciA9IGZ1bmN0aW9uICh4KSB7XG4gICAgaWYgKHgua2V5LmluZGV4T2YoXCJwZXJjZW50XCIpID4gLTEpIHJldHVybiBkMy5zZWxlY3QodGhpcykudGV4dChmdW5jdGlvbih4KSB7IFxuICAgICAgICB2YXIgcGQgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX19cbiAgICAgICAgcmV0dXJuIGQzLmZvcm1hdChcIi4yJVwiKShwZFt4LmtleV0vMTAwKVxuICAgICAgfSlcbiAgIFxuICAgIHJldHVybiBkMy5zZWxlY3QodGhpcykudGV4dChmdW5jdGlvbih4KSB7IFxuICAgICAgdmFyIHBkID0gdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fXG4gICAgICByZXR1cm4gcGRbeC5rZXldID4gMCA/IGQzLmZvcm1hdChcIiwuMmZcIikocGRbeC5rZXldKS5yZXBsYWNlKFwiLjAwXCIsXCJcIikgOiBwZFt4LmtleV1cbiAgICB9KVxuICB9XG5cbiAgdGhpcy5faGlkZGVuX2ZpZWxkcyA9IFtdXG4gIHRoaXMuX29uID0ge31cblxuICB0aGlzLl9yZW5kZXJfZXhwYW5kID0gZnVuY3Rpb24oZCkge1xuICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImbmRhc2g7XCIpXG4gICAgaWYgKHRoaXMubmV4dFNpYmxpbmcgJiYgZDMuc2VsZWN0KHRoaXMubmV4dFNpYmxpbmcpLmNsYXNzZWQoXCJleHBhbmRlZFwiKSA9PSB0cnVlKSB7XG4gICAgICBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKFwidGQub3B0aW9uLWhlYWRlclwiKS5odG1sKFwiJiM2NTI5MTtcIilcbiAgICAgIHJldHVybiBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICB9XG5cbiAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICB2YXIgdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG4gICAgdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0LCB0aGlzLm5leHRTaWJsaW5nKTsgIFxuXG5cbiAgICB2YXIgdHIgPSBkMy5zZWxlY3QodCkuY2xhc3NlZChcImV4cGFuZGVkXCIsdHJ1ZSkuZGF0dW0oe30pXG4gICAgdmFyIHRkID0gZDNfdXBkYXRlYWJsZSh0cixcInRkXCIsXCJ0ZFwiKVxuICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsdGhpcy5jaGlsZHJlbi5sZW5ndGgpXG5cbiAgICByZXR1cm4gdGRcbiAgfVxuICB0aGlzLl9yZW5kZXJfaGVhZGVyID0gZnVuY3Rpb24od3JhcCkge1xuXG5cbiAgICB3cmFwLmVhY2goZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIGhlYWRlcnMgPSBkM191cGRhdGVhYmxlKGQzLnNlbGVjdCh0aGlzKSxcIi5oZWFkZXJzXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoZWFkZXJzXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItYm90dG9tXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgIGhlYWRlcnMuaHRtbChcIlwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaGVhZGVycyxcIi51cmxcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInVybFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3NSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KFwiQXJ0aWNsZVwiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGhlYWRlcnMsXCIuY291bnRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImNvdW50XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI1JVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoXCJDb3VudFwiKVxuXG5cbiAgICB9KVxuXG4gIH1cbiAgdGhpcy5fcmVuZGVyX3JvdyA9IGZ1bmN0aW9uKHJvdykge1xuXG4gICAgICBkM191cGRhdGVhYmxlKHJvdyxcIi51cmxcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInVybFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3NSVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm92ZXJmbG93XCIsXCJoaWRkZW5cIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5rZXl9KVxuXG4gICAgICBkM191cGRhdGVhYmxlKHJvdyxcIi5jb3VudFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY291bnRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjUlXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpe3JldHVybiB4LnZhbHVlfSlcblxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0YWJsZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBUYWJsZSh0YXJnZXQpXG59XG5cblRhYmxlLnByb3RvdHlwZSA9IHtcblxuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkgeyBcbiAgICAgIHZhciB2YWx1ZSA9IGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICAgIGlmICh2YWwgJiYgdmFsLnZhbHVlcy5sZW5ndGggJiYgdGhpcy5faGVhZGVycyA9PSB1bmRlZmluZWQpIHsgXG4gICAgICAgIHZhciBoZWFkZXJzID0gT2JqZWN0LmtleXModmFsLnZhbHVlc1swXSkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHtrZXk6eCx2YWx1ZTp4fSB9KVxuICAgICAgICB0aGlzLmhlYWRlcnMoaGVhZGVycylcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH1cbiAgLCBza2lwX29wdGlvbjogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2tpcF9vcHRpb25cIix2YWwpIH1cbiAgLCB3cmFwcGVyX2NsYXNzOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ3cmFwcGVyX2NsYXNzXCIsdmFsKSB9XG5cblxuICAsIHRpdGxlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfVxuICAsIHJvdzogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmVuZGVyX3Jvd1wiLHZhbCkgfVxuICAsIGRlZmF1bHRfcmVuZGVyZXI6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRlZmF1bHRfcmVuZGVyZXJcIix2YWwpIH1cbiAgLCB0b3A6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRvcFwiLHZhbCkgfVxuXG4gICwgaGVhZGVyOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyZW5kZXJfaGVhZGVyXCIsdmFsKSB9XG4gICwgaGVhZGVyczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVhZGVyc1wiLHZhbCkgfVxuICAsIGhpZGRlbl9maWVsZHM6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhpZGRlbl9maWVsZHNcIix2YWwpIH1cbiAgLCBhbGxfaGVhZGVyczogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaGVhZGVycyA9IHRoaXMuaGVhZGVycygpLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjLnZhbHVlOyByZXR1cm4gcH0se30pXG4gICAgICAgICwgaXNfbG9ja2VkID0gdGhpcy5oZWFkZXJzKCkuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuICEheC5sb2NrZWQgfSkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG5cbiAgICAgIGlmICh0aGlzLl9kYXRhLnZhbHVlcyAmJiB0aGlzLl9kYXRhLnZhbHVlcy5sZW5ndGgpIHtcbiAgICAgICAgXG4gICAgICAgIHZhciBhbGxfaGVhZHMgPSBPYmplY3Qua2V5cyh0aGlzLl9kYXRhLnZhbHVlc1swXSkubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgaWYgKHRoaXMuX2hpZGRlbl9maWVsZHMgJiYgdGhpcy5faGlkZGVuX2ZpZWxkcy5pbmRleE9mKHgpID4gLTEpIHJldHVybiBmYWxzZVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGtleTp4XG4gICAgICAgICAgICAsIHZhbHVlOmhlYWRlcnNbeF0gfHwgeFxuICAgICAgICAgICAgLCBzZWxlY3RlZDogISFoZWFkZXJzW3hdXG4gICAgICAgICAgICAsIGxvY2tlZDogKGlzX2xvY2tlZC5pbmRleE9mKHgpID4gLTEgPyB0cnVlIDogdW5kZWZpbmVkKSBcbiAgICAgICAgICB9IFxuICAgICAgICB9LmJpbmQodGhpcykpLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4IH0pXG4gICAgICAgIHZhciBnZXRJbmRleCA9IGZ1bmN0aW9uKGspIHtcbiAgICAgICAgICByZXR1cm4gaXNfbG9ja2VkLmluZGV4T2YoaykgPiAtMSA/IGlzX2xvY2tlZC5pbmRleE9mKGspICsgMTAgOiAwXG4gICAgICAgIH1cblxuICAgICAgICBhbGxfaGVhZHMgPSBhbGxfaGVhZHMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGdldEluZGV4KGMua2V5IHx8IC1JbmZpbml0eSkgLSBnZXRJbmRleChwLmtleSB8fCAtSW5maW5pdHkpIH0pXG4gICAgICAgIHJldHVybiBhbGxfaGVhZHNcbiAgICAgIH1cbiAgICAgIGVsc2UgcmV0dXJuIHRoaXMuaGVhZGVycygpXG4gICAgfVxuICAsIHNvcnQ6IGZ1bmN0aW9uKGtleSxhc2NlbmRpbmcpIHtcbiAgICAgIGlmICgha2V5KSByZXR1cm4gdGhpcy5fc29ydFxuICAgICAgdGhpcy5fc29ydCA9IHtcbiAgICAgICAgICBrZXk6IGtleVxuICAgICAgICAsIHZhbHVlOiAhIWFzY2VuZGluZ1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgLCByZW5kZXJfd3JhcHBlcjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgd3JhcCA9IHRoaXMuX3RhcmdldFxuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5cIit0aGlzLl93cmFwcGVyX2NsYXNzLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKHRoaXMuX3dyYXBwZXJfY2xhc3MsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcInJlbGF0aXZlXCIpXG5cblxuICAgICAgdmFyIHRhYmxlID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwidGFibGUubWFpblwiLFwidGFibGVcIilcbiAgICAgICAgLmNsYXNzZWQoXCJtYWluXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMCVcIilcblxuICAgICAgdGhpcy5fdGFibGVfbWFpbiA9IHRhYmxlXG5cbiAgICAgIHZhciB0aGVhZCA9IGQzX3VwZGF0ZWFibGUodGFibGUsXCJ0aGVhZFwiLFwidGhlYWRcIilcbiAgICAgIGQzX3VwZGF0ZWFibGUodGFibGUsXCJ0Ym9keVwiLFwidGJvZHlcIilcblxuXG5cbiAgICAgIHZhciB0YWJsZV9maXhlZCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcInRhYmxlLmZpeGVkXCIsXCJ0YWJsZVwiKVxuICAgICAgICAuY2xhc3NlZChcImhpZGRlblwiLCB0cnVlKSAvLyBUT0RPOiBtYWtlIHRoaXMgdmlzaWJsZSB3aGVuIG1haW4gaXMgbm90IGluIHZpZXdcbiAgICAgICAgLmNsYXNzZWQoXCJmaXhlZFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsd3JhcHBlci5zdHlsZShcIndpZHRoXCIpKVxuICAgICAgICAuc3R5bGUoXCJ0b3BcIix0aGlzLl90b3AgKyBcInB4XCIpXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJmaXhlZFwiKVxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgIHRyeSB7XG4gICAgICBkMy5zZWxlY3Qod2luZG93KS5vbignc2Nyb2xsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHRhYmxlLm5vZGUoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AsIHNlbGYuX3RvcClcbiAgICAgICAgaWYgKHRhYmxlLm5vZGUoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgPCBzZWxmLl90b3ApIHRhYmxlX2ZpeGVkLmNsYXNzZWQoXCJoaWRkZW5cIixmYWxzZSlcbiAgICAgICAgZWxzZSB0YWJsZV9maXhlZC5jbGFzc2VkKFwiaGlkZGVuXCIsdHJ1ZSlcblxuICAgICAgICB2YXIgd2lkdGhzID0gW11cblxuICAgICAgICB3cmFwLnNlbGVjdEFsbChcIi5tYWluXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcIi50YWJsZS1oZWFkZXJzXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcInRoXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICB3aWR0aHMucHVzaCh0aGlzLm9mZnNldFdpZHRoKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgd3JhcC5zZWxlY3RBbGwoXCIuZml4ZWRcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwiLnRhYmxlLWhlYWRlcnNcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwidGhcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcIndpZHRoXCIsd2lkdGhzW2ldICsgXCJweFwiKVxuICAgICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgfSlcbiAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICBcblxuICAgICAgdGhpcy5fdGFibGVfZml4ZWQgPSB0YWJsZV9maXhlZFxuXG5cbiAgICAgIHZhciB0aGVhZCA9IGQzX3VwZGF0ZWFibGUodGFibGVfZml4ZWQsXCJ0aGVhZFwiLFwidGhlYWRcIilcblxuICAgICAgaWYgKCF0aGlzLl9za2lwX29wdGlvbikge1xuICAgICAgICB2YXIgdGFibGVfYnV0dG9uID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLnRhYmxlLW9wdGlvblwiLFwiYVwiKVxuICAgICAgICAgIC5jbGFzc2VkKFwidGFibGUtb3B0aW9uXCIsdHJ1ZSlcbiAgICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0b3BcIixcIi0xcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJyaWdodFwiLFwiMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctcmlnaHRcIixcIjhweFwiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiOHB4XCIpXG4gICAgICAgICAgLnRleHQoXCJPUFRJT05TXCIpXG4gICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdGhpcy5fb3B0aW9uc19oZWFkZXIuY2xhc3NlZChcImhpZGRlblwiLCF0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIpKVxuICAgICAgICAgICAgdGhpcy5fc2hvd19vcHRpb25zID0gIXRoaXMuX29wdGlvbnNfaGVhZGVyLmNsYXNzZWQoXCJoaWRkZW5cIilcbiAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB3cmFwcGVyXG4gICAgfSAgXG4gICwgcmVuZGVyX2hlYWRlcjogZnVuY3Rpb24odGFibGUpIHtcblxuICAgICAgdmFyIHRoZWFkID0gdGFibGUuc2VsZWN0QWxsKFwidGhlYWRcIilcbiAgICAgICAgLCB0Ym9keSA9IHRhYmxlLnNlbGVjdEFsbChcInRib2R5XCIpXG5cbiAgICAgIGlmICh0aGlzLmhlYWRlcnMoKSA9PSB1bmRlZmluZWQpIHJldHVyblxuXG4gICAgICB2YXIgb3B0aW9uc190aGVhZCA9IGQzX3VwZGF0ZWFibGUodGhlYWQsXCJ0ci50YWJsZS1vcHRpb25zXCIsXCJ0clwiLHRoaXMuYWxsX2hlYWRlcnMoKSxmdW5jdGlvbih4KXsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImhpZGRlblwiLCAhdGhpcy5fc2hvd19vcHRpb25zKVxuICAgICAgICAuY2xhc3NlZChcInRhYmxlLW9wdGlvbnNcIix0cnVlKVxuXG4gICAgICB2YXIgaCA9IHRoaXMuX3NraXBfb3B0aW9uID8gdGhpcy5oZWFkZXJzKCkgOiB0aGlzLmhlYWRlcnMoKS5jb25jYXQoW3trZXk6XCJzcGFjZXJcIiwgd2lkdGg6XCI3MHB4XCJ9XSlcbiAgICAgIHZhciBoZWFkZXJzX3RoZWFkID0gZDNfdXBkYXRlYWJsZSh0aGVhZCxcInRyLnRhYmxlLWhlYWRlcnNcIixcInRyXCIsaCxmdW5jdGlvbih4KXsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcInRhYmxlLWhlYWRlcnNcIix0cnVlKVxuXG5cbiAgICAgIHZhciB0aCA9IGQzX3NwbGF0KGhlYWRlcnNfdGhlYWQsXCJ0aFwiLFwidGhcIixmYWxzZSxmdW5jdGlvbih4LGkpIHtyZXR1cm4geC5rZXkgKyBpIH0pXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC53aWR0aCB9KVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwicmVsYXRpdmVcIilcbiAgICAgICAgLm9yZGVyKClcblxuICAgICAgdmFyIGRlZmF1bHRTb3J0ID0gZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGlmICh4LnNvcnQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBkZWxldGUgeFsnc29ydCddXG4gICAgICAgICAgICB0aGlzLl9zb3J0ID0ge31cbiAgICAgICAgICAgIHRoaXMuZHJhdygpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHguc29ydCA9ICEheC5zb3J0XG5cbiAgICAgICAgICAgIHRoaXMuc29ydCh4LmtleSx4LnNvcnQpXG4gICAgICAgICAgICB0aGlzLmRyYXcoKVxuICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh0aCxcInNwYW5cIixcInNwYW5cIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImN1cnNvclwiLFwicG9pbnRlclwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH0pXG4gICAgICAgIC5vbihcImNsaWNrXCIsdGhpcy5vbihcInNvcnRcIikgIT0gbm9vcCA/IHRoaXMub24oXCJzb3J0XCIpIDogZGVmYXVsdFNvcnQpXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKHRoLFwiaVwiLFwiaVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuY2xhc3NlZChcImZhXCIsdHJ1ZSlcbiAgICAgICAgLmNsYXNzZWQoXCJmYS1zb3J0LWFzY1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiAoeC5rZXkgPT0gdGhpcy5fc29ydC5rZXkpID8gdGhpcy5fc29ydC52YWx1ZSA9PT0gdHJ1ZSA6IHVuZGVmaW5lZCB9LmJpbmQodGhpcykpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEtc29ydC1kZXNjXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuICh4LmtleSA9PSB0aGlzLl9zb3J0LmtleSkgPyB0aGlzLl9zb3J0LnZhbHVlID09PSBmYWxzZSA6IHVuZGVmaW5lZCB9LmJpbmQodGhpcykpXG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBjYW5fcmVkcmF3ID0gdHJ1ZVxuXG4gICAgICB2YXIgZHJhZyA9IGQzLmJlaGF2aW9yLmRyYWcoKVxuICAgICAgICAub24oXCJkcmFnXCIsIGZ1bmN0aW9uKGQsaSkge1xuICAgICAgICAgICAgdmFyIHggPSBkMy5ldmVudC5keFxuICAgICAgICAgICAgdmFyIHcgPSBwYXJzZUludChkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zdHlsZShcIndpZHRoXCIpLnJlcGxhY2UoXCJweFwiKSlcbiAgICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXy53aWR0aCA9ICh3K3gpK1wicHhcIlxuICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc3R5bGUoXCJ3aWR0aFwiLCAodyt4KStcInB4XCIpXG5cbiAgICAgICAgICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLDApLmluZGV4T2YodGhpcy5wYXJlbnROb2RlKSArIDFcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbltpbmRleF0pLnN0eWxlKFwid2lkdGhcIix1bmRlZmluZWQpXG5cbiAgICAgICAgICAgIGlmIChjYW5fcmVkcmF3KSB7XG4gICAgICAgICAgICAgIGNhbl9yZWRyYXcgPSBmYWxzZVxuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNhbl9yZWRyYXcgPSB0cnVlXG4gICAgICAgICAgICAgICAgdGJvZHkuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bnRoLW9mLXR5cGUoXCIgKyBpbmRleCArIFwiKVwiKS5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICAgIHZhciByZW5kZXIgPSBzZWxmLl9yZW5kZXJlcnNbeC5rZXldXG4gICAgICAgICAgICAgICAgICBpZiAocmVuZGVyKSByZW5kZXIuYmluZCh0aGlzKSh4KVxuICAgIFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgfSwxKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuXG4gICAgICB2YXIgZHJhZ2dhYmxlID0gZDNfdXBkYXRlYWJsZSh0aCxcImJcIixcImJcIilcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsIFwiZXctcmVzaXplXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLCBcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsIFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLCBcImFic29sdXRlXCIpXG4gICAgICAgIC5zdHlsZShcInJpZ2h0XCIsIFwiLThweFwiKVxuICAgICAgICAuc3R5bGUoXCJ0b3BcIiwgXCIwXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsIFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ6LWluZGV4XCIsIDEpXG4gICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLDApLmluZGV4T2YodGhpcy5wYXJlbnROb2RlKSArIDFcbiAgICAgICAgICAgdGJvZHkuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bnRoLW9mLXR5cGUoXCIgKyBpbmRleCArIFwiKVwiKS5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IGRvdHRlZCAjY2NjXCIpXG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcIm1vdXNlb3V0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgdmFyIGluZGV4ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW4sMCkuaW5kZXhPZih0aGlzLnBhcmVudE5vZGUpICsgMVxuICAgICAgICAgICB0Ym9keS5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpudGgtb2YtdHlwZShcIiArIGluZGV4ICsgXCIpXCIpLnN0eWxlKFwiYm9yZGVyLXJpZ2h0XCIsdW5kZWZpbmVkKVxuICAgICAgICB9KVxuICAgICAgICAuY2FsbChkcmFnKVxuXG4gICAgICB0aC5leGl0KCkucmVtb3ZlKClcblxuICAgICAgaWYgKCF0aGlzLl9za2lwX29wdGlvbikge1xuICAgICAgdmFyIG9wdGlvbnMgPSBkM191cGRhdGVhYmxlKG9wdGlvbnNfdGhlYWQsXCJ0aFwiLFwidGhcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuYXR0cihcImNvbHNwYW5cIix0aGlzLmhlYWRlcnMoKS5sZW5ndGgrMSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcbiAgICAgICAgICAgICAgICBcbiAgICAgIHZhciBvcHRpb24gPSBkM19zcGxhdChvcHRpb25zLFwiLm9wdGlvblwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJvcHRpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cblxuICAgICAgb3B0aW9uLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgZDNfdXBkYXRlYWJsZShvcHRpb24sXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgICAucHJvcGVydHkoXCJjaGVja2VkXCIsZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgICB0aGlzLmNoZWNrZWQgPSB4LnNlbGVjdGVkXG4gICAgICAgICAgcmV0dXJuIHguc2VsZWN0ZWQgPyBcImNoZWNrZWRcIiA6IHVuZGVmaW5lZCBcbiAgICAgICAgfSlcbiAgICAgICAgLmF0dHIoXCJkaXNhYmxlZFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubG9ja2VkIH0pXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB4LnNlbGVjdGVkID0gdGhpcy5jaGVja2VkXG4gICAgICAgICAgaWYgKHguc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHNlbGYuaGVhZGVycygpLnB1c2goeClcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmRyYXcoKVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgaW5kaWNlcyA9IHNlbGYuaGVhZGVycygpLm1hcChmdW5jdGlvbih6LGkpIHsgcmV0dXJuIHoua2V5ID09IHgua2V5ID8gaSA6IHVuZGVmaW5lZCAgfSkgXG4gICAgICAgICAgICAsIGluZGV4ID0gaW5kaWNlcy5maWx0ZXIoZnVuY3Rpb24oeikgeyByZXR1cm4geiB9KSB8fCAwO1xuXG4gICAgICAgICAgc2VsZi5oZWFkZXJzKCkuc3BsaWNlKGluZGV4LDEpXG4gICAgICAgICAgc2VsZi5kcmF3KClcblxuICAgICAgICB9KVxuXG4gICAgICBkM191cGRhdGVhYmxlKG9wdGlvbixcInNwYW5cIixcInNwYW5cIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4gXCIgXCIgKyB4LnZhbHVlIH0pXG5cbiAgICAgfVxuXG5cbiAgICAgdGhpcy5fb3B0aW9uc19oZWFkZXIgPSB0aGlzLl90YXJnZXQuc2VsZWN0QWxsKFwiLnRhYmxlLW9wdGlvbnNcIilcbiAgICB9XG4gIFxuICAsIHJlbmRlcl9yb3dzOiBmdW5jdGlvbih0YWJsZSkge1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgdGJvZHkgPSB0YWJsZS5zZWxlY3RBbGwoXCJ0Ym9keVwiKVxuXG4gICAgICBpZiAodGhpcy5oZWFkZXJzKCkgPT0gdW5kZWZpbmVkKSByZXR1cm5cbiAgICAgIGlmICghKHRoaXMuX2RhdGEgJiYgdGhpcy5fZGF0YS52YWx1ZXMgJiYgdGhpcy5fZGF0YS52YWx1ZXMubGVuZ3RoKSkgcmV0dXJuXG5cbiAgICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YS52YWx1ZXNcbiAgICAgICAgLCBzb3J0YnkgPSB0aGlzLl9zb3J0IHx8IHt9O1xuXG4gICAgICBkYXRhID0gZGF0YS5zb3J0KGZ1bmN0aW9uKHAsYykge1xuICAgICAgICB2YXIgYSA9IHBbc29ydGJ5LmtleV0gfHwgLUluZmluaXR5XG4gICAgICAgICAgLCBiID0gY1tzb3J0Ynkua2V5XSB8fCAtSW5maW5pdHlcblxuICAgICAgICByZXR1cm4gc29ydGJ5LnZhbHVlID8gZDMuYXNjZW5kaW5nKGEsYikgOiBkMy5kZXNjZW5kaW5nKGEsYilcbiAgICAgIH0pXG5cbiAgICAgIHZhciByb3dzID0gZDNfc3BsYXQodGJvZHksXCJ0clwiLFwidHJcIixkYXRhLGZ1bmN0aW9uKHgsaSl7IHJldHVybiBTdHJpbmcoc29ydGJ5LmtleSArIHhbc29ydGJ5LmtleV0pICsgaSB9KVxuICAgICAgICAub3JkZXIoKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBpZiAoc2VsZi5vbihcImV4cGFuZFwiKSAhPSBub29wKSB7XG4gICAgICAgICAgICB2YXIgdGQgPSBzZWxmLl9yZW5kZXJfZXhwYW5kLmJpbmQodGhpcykoeClcbiAgICAgICAgICAgIHNlbGYub24oXCJleHBhbmRcIikuYmluZCh0aGlzKSh4LHRkKVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgcm93cy5leGl0KCkucmVtb3ZlKClcblxuICAgICAgdmFyIHRkID0gZDNfc3BsYXQocm93cyxcInRkXCIsXCJ0ZFwiLHRoaXMuaGVhZGVycygpLGZ1bmN0aW9uKHgsaSkge3JldHVybiB4LmtleSArIGkgfSlcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuXG4gICAgICAgICAgdmFyIHJlbmRlcmVyID0gc2VsZi5fcmVuZGVyZXJzW3gua2V5XVxuXG4gICAgICAgICAgaWYgKCFyZW5kZXJlcikgeyBcbiAgICAgICAgICAgIHJlbmRlcmVyID0gc2VsZi5fZGVmYXVsdF9yZW5kZXJlci5iaW5kKHRoaXMpKHgpIFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcmVuZGVyZXIuYmluZCh0aGlzKSh4KVxuICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pXG5cbiAgICAgICAgXG5cbiAgICAgIHRkLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgICB2YXIgbyA9IGQzX3VwZGF0ZWFibGUocm93cyxcInRkLm9wdGlvbi1oZWFkZXJcIixcInRkXCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJvcHRpb24taGVhZGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjcwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gXG4gICAgICBpZiAodGhpcy5fc2tpcF9vcHRpb24pIG8uY2xhc3NlZChcImhpZGRlblwiLHRydWUpIFxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUobyxcImFcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLmh0bWwoc2VsZi5vcHRpb25fdGV4dCgpKVxuICAgICAgICBcblxuXG5cbiAgICB9XG4gICwgb3B0aW9uX3RleHQ6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm9wdGlvbl90ZXh0XCIsdmFsKSB9XG4gICwgcmVuZGVyOiBmdW5jdGlvbihrLGZuKSB7XG4gICAgICBpZiAoZm4gPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fcmVuZGVyZXJzW2tdIHx8IGZhbHNlXG4gICAgICB0aGlzLl9yZW5kZXJlcnNba10gPSBmblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgIHZhciB3cmFwcGVyID0gdGhpcy5yZW5kZXJfd3JhcHBlcigpXG5cbiAgICAgIHdyYXBwZXIuc2VsZWN0QWxsKFwidGFibGVcIilcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgICBzZWxmLnJlbmRlcl9oZWFkZXIoZDMuc2VsZWN0KHRoaXMpKSBcbiAgICAgICAgfSlcblxuICAgICAgdGhpcy5yZW5kZXJfcm93cyh0aGlzLl90YWJsZV9tYWluKVxuXG4gICAgICB0aGlzLm9uKFwiZHJhd1wiKS5iaW5kKHRoaXMpKClcblxuICAgICAgcmV0dXJuIHRoaXNcblxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkMzogZDNcbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCAnLi9zdW1tYXJ5X3RhYmxlLmNzcydcbmltcG9ydCB7dGFibGV9IGZyb20gJy4vdGFibGUnXG5cbmV4cG9ydCBmdW5jdGlvbiBzdW1tYXJ5X3RhYmxlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN1bW1hcnlUYWJsZSh0YXJnZXQpXG59XG5cbmNsYXNzIFN1bW1hcnlUYWJsZSBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKHRhcmdldClcbiAgICB0aGlzLl93cmFwcGVyX2NsYXNzID0gXCJ0YWJsZS1zdW1tYXJ5LXdyYXBwZXJcIlxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJ0aXRsZVwiLCBcImhlYWRlcnNcIiwgXCJkYXRhXCIsIFwid3JhcHBlcl9jbGFzc1wiXSB9XG5cbiAgZHJhdygpIHtcbiAgICB2YXIgdXJsc19zdW1tYXJ5ID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwic3VtbWFyeS10YWJsZVwiKVxuICAgICAgXG4gICAgZDNfY2xhc3ModXJsc19zdW1tYXJ5LFwidGl0bGVcIilcbiAgICAgIC50ZXh0KHRoaXMudGl0bGUoKSlcblxuICAgIHZhciB1d3JhcCA9IGQzX2NsYXNzKHVybHNfc3VtbWFyeSxcIndyYXBcIilcblxuXG4gICAgdGFibGUodXdyYXApXG4gICAgICAud3JhcHBlcl9jbGFzcyh0aGlzLndyYXBwZXJfY2xhc3MoKSx0cnVlKVxuICAgICAgLmRhdGEoe1widmFsdWVzXCI6dGhpcy5kYXRhKCl9KVxuICAgICAgLnNraXBfb3B0aW9uKHRydWUpXG4gICAgICAuaGVhZGVycyh0aGlzLmhlYWRlcnMoKSlcbiAgICAgIC5kcmF3KClcblxuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQge2ZpbHRlcn0gZnJvbSAnZmlsdGVyJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIEZpbHRlclZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG5cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5fZmlsdGVyX29wdGlvbnMgPSB7XG4gICAgICBcIkNhdGVnb3J5XCI6IFwicGFyZW50X2NhdGVnb3J5X25hbWVcIlxuICAgICwgXCJUaXRsZVwiOiBcInVybFwiXG4gICAgLCBcIlRpbWVcIjogXCJob3VyXCJcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmaWx0ZXJfdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBGaWx0ZXJWaWV3KHRhcmdldClcbn1cblxuRmlsdGVyVmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBsb2dpYzogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljXCIsdmFsKSBcbiAgICB9XG4gICwgY2F0ZWdvcmllczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNhdGVnb3JpZXNcIix2YWwpIFxuICAgIH1cbiAgLCBmaWx0ZXJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZmlsdGVyc1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuZmlsdGVyLXdyYXBcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCl7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXItd3JhcFwiLHRydWUpXG5cbiAgICAgIGhlYWRlcih3cmFwcGVyKVxuICAgICAgICAudGV4dChcIkZpbHRlclwiKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIHZhciBzdWJ0aXRsZSA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCIuc3VidGl0bGUtZmlsdGVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzdWJ0aXRsZS1maWx0ZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcIiB1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcIiBib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIgMzNweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIgI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgXG4gICAgICBkM191cGRhdGVhYmxlKHN1YnRpdGxlLFwic3Bhbi5maXJzdFwiLFwic3BhblwiKVxuICAgICAgICAudGV4dChcIlVzZXJzIG1hdGNoaW5nIFwiIClcbiAgICAgICAgLmNsYXNzZWQoXCJmaXJzdFwiLHRydWUpXG4gICAgXG4gICAgICB2YXIgZmlsdGVyX3R5cGUgID0gZDNfdXBkYXRlYWJsZShzdWJ0aXRsZSxcInNwYW4ubWlkZGxlXCIsXCJzcGFuXCIpXG4gICAgICAgIC5jbGFzc2VkKFwibWlkZGxlXCIsdHJ1ZSlcbiAgICBcbiAgICAgIHNlbGVjdChmaWx0ZXJfdHlwZSlcbiAgICAgICAgLm9wdGlvbnModGhpcy5sb2dpYygpKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHRoaXMubG9naWMoKS5tYXAoZnVuY3Rpb24oeSkgeyBcbiAgICAgICAgICAgIHkuc2VsZWN0ZWQgPSAoeS5rZXkgPT0geC5rZXkpXG4gICAgICAgICAgfSlcbiAgICAgICAgICB0aGlzLm9uKFwibG9naWMuY2hhbmdlXCIpKHRoaXMubG9naWMoKSlcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAuZHJhdygpXG4gICAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoc3VidGl0bGUsXCJzcGFuLmxhc3RcIixcInNwYW5cIilcbiAgICAgICAgLnRleHQoXCIgb2YgdGhlIGZvbGxvd2luZzpcIilcbiAgICAgICAgLmNsYXNzZWQoXCJsYXN0XCIsdHJ1ZSlcblxuXG4gICAgICAvLyAtLS0tLS0tLSBDQVRFR09SSUVTIC0tLS0tLS0tLSAvL1xuXG4gICAgICB2YXIgY2F0ZWdvcmllcyA9IHRoaXMuY2F0ZWdvcmllcygpXG4gICAgICB2YXIgZmlsdGVyX2NoYW5nZSA9IHRoaXMub24oXCJmaWx0ZXIuY2hhbmdlXCIpLmJpbmQodGhpcylcblxuICAgICAgZnVuY3Rpb24gc2VsZWN0aXplSW5wdXQoZmlsdGVyLHZhbHVlKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAgIC5wcm9wZXJ0eShcInZhbHVlXCIsdmFsdWUudmFsdWUpXG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciBkZXN0cm95ID0gZDMuc2VsZWN0KHRoaXMpLm9uKFwiZGVzdHJveVwiKVxuICAgICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICAgIH0pXG5cblxuICAgICAgICB2YXIgcyA9ICQoc2VsZWN0Lm5vZGUoKSkuc2VsZWN0aXplKHtcbiAgICAgICAgICBwZXJzaXN0OiBmYWxzZSxcbiAgICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSAodmFsdWUudmFsdWUgPyB2YWx1ZS52YWx1ZSArIFwiLFwiIDogXCJcIikgKyB4XG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uRGVsZXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdmFsdWUudmFsdWUuc3BsaXQoXCIsXCIpLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6ICE9IHhbMF19KS5qb2luKFwiLFwiKVxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHZhbHVlOiB4LCB0ZXh0OiB4XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAub24oXCJkZXN0cm95XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzWzBdLnNlbGVjdGl6ZS5kZXN0cm95KClcbiAgICAgICAgICB9KVxuXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHNlbGVjdGl6ZVNlbGVjdChmaWx0ZXIsdmFsdWUpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIikucmVtb3ZlKClcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIGRlc3Ryb3kgPSBkMy5zZWxlY3QodGhpcykub24oXCJkZXN0cm95XCIpXG4gICAgICAgICAgICBpZiAoZGVzdHJveSkgZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuXG5cbiAgICBcbiAgICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic2VsZWN0LnZhbHVlXCIsXCJzZWxlY3RcIilcbiAgICAgICAgICAuY2xhc3NlZChcInZhbHVlXCIsdHJ1ZSlcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1heC13aWR0aFwiLFwiNTAwcHhcIilcbiAgICAgICAgICAuYXR0cihcIm11bHRpcGxlXCIsdHJ1ZSlcbiAgICAgICAgICAub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHRoaXMudmFsdWVcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgfSlcbiAgICBcbiAgICAgICAgZDNfc3BsYXQoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIixjYXRlZ29yaWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHZhbHVlLnZhbHVlICYmIHZhbHVlLnZhbHVlLmluZGV4T2YoeC5rZXkpID4gLTEgPyBcInNlbGVjdGVkXCIgOiB1bmRlZmluZWQgfSlcbiAgICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICAgIHZhciBzID0gJChzZWxlY3Qubm9kZSgpKS5zZWxlY3RpemUoe1xuICAgICAgICAgIHBlcnNpc3Q6IGZhbHNlLFxuICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHguam9pbihcIixcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAub24oXCJkZXN0cm95XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzWzBdLnNlbGVjdGl6ZS5kZXN0cm95KClcbiAgICAgICAgICB9KVxuXG5cblxuICAgIFxuICAgICAgfVxuICAgIFxuICAgICAgdGhpcy5fbG9naWNfZmlsdGVyID0gZmlsdGVyKHdyYXBwZXIpXG4gICAgICAgIC5maWVsZHMoT2JqZWN0LmtleXModGhpcy5fZmlsdGVyX29wdGlvbnMpKVxuICAgICAgICAub3BzKFtcbiAgICAgICAgICAgIFt7XCJrZXlcIjogXCJpcyBpbi5jYXRlZ29yeVwifSx7XCJrZXlcIjogXCJpcyBub3QgaW4uY2F0ZWdvcnlcIn1dXG4gICAgICAgICAgLCBbe1wia2V5XCI6IFwiY29udGFpbnMuc2VsZWN0aXplXCJ9LCB7XCJrZXlcIjpcImRvZXMgbm90IGNvbnRhaW4uc2VsZWN0aXplXCJ9XVxuICAgICAgICAgICwgW3tcImtleVwiOiBcImVxdWFsc1wifSwge1wia2V5XCI6XCJiZXR3ZWVuXCIsXCJpbnB1dFwiOjJ9XVxuICAgICAgICBdKVxuICAgICAgICAuZGF0YSh0aGlzLmZpbHRlcnMoKSlcbiAgICAgICAgLnJlbmRlcl9vcChcImNvbnRhaW5zLnNlbGVjdGl6ZVwiLHNlbGVjdGl6ZUlucHV0KVxuICAgICAgICAucmVuZGVyX29wKFwiZG9lcyBub3QgY29udGFpbi5zZWxlY3RpemVcIixzZWxlY3RpemVJbnB1dClcbiAgICAgICAgLnJlbmRlcl9vcChcImlzIGluLmNhdGVnb3J5XCIsc2VsZWN0aXplU2VsZWN0KVxuICAgICAgICAucmVuZGVyX29wKFwiaXMgbm90IGluLmNhdGVnb3J5XCIsc2VsZWN0aXplU2VsZWN0KVxuICAgICAgICAucmVuZGVyX29wKFwiYmV0d2VlblwiLGZ1bmN0aW9uKGZpbHRlcix2YWx1ZSkge1xuICAgICAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgIFxuICAgICAgICAgIHZhbHVlLnZhbHVlID0gdHlwZW9mKHZhbHVlLnZhbHVlKSA9PSBcIm9iamVjdFwiID8gdmFsdWUudmFsdWUgOiBbMCwyNF1cbiAgICBcbiAgICAgICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0LnZhbHVlLmxvd1wiLFwiaW5wdXRcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidmFsdWUgbG93XCIsdHJ1ZSlcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjkwcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwidmFsdWVcIiwgdmFsdWUudmFsdWVbMF0pXG4gICAgICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgdmFyIHQgPSB0aGlzXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgc2VsZi50eXBld2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWVbMF0gPSB0LnZhbHVlXG4gICAgICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgICAgfSwxMDAwKVxuICAgICAgICAgICAgfSlcbiAgICBcbiAgICAgICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcInNwYW4udmFsdWUtYW5kXCIsXCJzcGFuXCIpXG4gICAgICAgICAgICAuY2xhc3NlZChcInZhbHVlLWFuZFwiLHRydWUpXG4gICAgICAgICAgICAudGV4dChcIiBhbmQgXCIpXG4gICAgXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dC52YWx1ZS5oaWdoXCIsXCJpbnB1dFwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZSBoaWdoXCIsdHJ1ZSlcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjkwcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwidmFsdWVcIiwgdmFsdWUudmFsdWVbMV0pXG4gICAgICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgdmFyIHQgPSB0aGlzXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgc2VsZi50eXBld2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWVbMV0gPSB0LnZhbHVlXG4gICAgICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgICAgfSwxMDAwKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKFwidXBkYXRlXCIsZnVuY3Rpb24oZmlsdGVycyl7XG4gICAgICAgICAgZmlsdGVyX2NoYW5nZShmaWx0ZXJzKVxuICAgICAgICB9KVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIC8vZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5maWx0ZXItd3JhcC1zcGFjZXJcIixcImRpdlwiKVxuICAgICAgLy8gIC5jbGFzc2VkKFwiZmlsdGVyLXdyYXAtc3BhY2VyXCIsdHJ1ZSlcbiAgICAgIC8vICAuc3R5bGUoXCJoZWlnaHRcIix3cmFwcGVyLnN0eWxlKFwiaGVpZ2h0XCIpKVxuXG4gICAgICAvL3dyYXBwZXJcbiAgICAgIC8vICAuc3R5bGUoXCJ3aWR0aFwiLHRoaXMudGFyZ2V0LnN0eWxlKFwid2lkdGhcIikpXG4gICAgICAvLyAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiei1pbmRleFwiLFwiMzAwXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2YwZjRmN1wiKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuL2hlYWRlcidcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBCdXR0b25SYWRpbyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7fVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBidXR0b25fcmFkaW8odGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQnV0dG9uUmFkaW8odGFyZ2V0KVxufVxuXG5CdXR0b25SYWRpby5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbiAoKSB7XG4gIFxuICAgIHZhciBDU1NfU1RSSU5HID0gU3RyaW5nKGZ1bmN0aW9uKCkgey8qXG4gICAgICAub3B0aW9ucy12aWV3IHsgdGV4dC1hbGlnbjpyaWdodCB9XG4gICAgICAuc2hvdy1idXR0b24ge1xuICAgICAgd2lkdGg6IDE1MHB4O1xuICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xuICAgICAgbGluZS1oZWlnaHQ6IDQwcHg7XG4gICAgICBib3JkZXItcmFkaXVzOiAxNXB4O1xuICAgICAgYm9yZGVyOiAxcHggc29saWQgI2NjYztcbiAgICAgIGZvbnQtc2l6ZTogMTJweDtcbiAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG4gICAgICBmb250LXdlaWdodDogYm9sZDtcbiAgICAgIGRpc3BsYXk6aW5saW5lLWJsb2NrO1xuICAgICAgbWFyZ2luLXJpZ2h0OjE1cHg7XG4gICAgICAgIH1cbiAgICAgIC5zaG93LWJ1dHRvbjpob3ZlciB7IHRleHQtZGVjb3JhdGlvbjpub25lOyBjb2xvcjojNTU1IH1cbiAgICAgIC5zaG93LWJ1dHRvbi5zZWxlY3RlZCB7XG4gICAgICAgIGJhY2tncm91bmQ6ICNlM2ViZjA7XG4gICAgICAgIGNvbG9yOiAjNTU1O1xuICAgICAgfVxuICAgICovfSlcbiAgXG4gICAgZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QoXCJoZWFkXCIpLFwic3R5bGUjc2hvdy1jc3NcIixcInN0eWxlXCIpXG4gICAgICAuYXR0cihcImlkXCIsXCJoZWFkZXItY3NzXCIpXG4gICAgICAudGV4dChDU1NfU1RSSU5HLnJlcGxhY2UoXCJmdW5jdGlvbiAoKSB7LypcIixcIlwiKS5yZXBsYWNlKFwiKi99XCIsXCJcIikpXG4gIFxuICAgIHZhciBvcHRpb25zID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5idXR0b24tcmFkaW8tcm93XCIsXCJkaXZcIilcbiAgICAgIC5jbGFzc2VkKFwiYnV0dG9uLXJhZGlvLXJvd1wiLHRydWUpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIzNXB4XCIpXG4gIFxuICBcbiAgICB2YXIgYnV0dG9uX3JvdyA9IGQzX3VwZGF0ZWFibGUob3B0aW9ucyxcIi5vcHRpb25zLXZpZXdcIixcImRpdlwiLHRoaXMuZGF0YSgpKVxuICAgICAgLmNsYXNzZWQoXCJvcHRpb25zLXZpZXdcIix0cnVlKVxuXG4gICAgdmFyIGJvdW5kID0gdGhpcy5vbihcImNsaWNrXCIpLmJpbmQodGhpcylcbiAgXG4gICAgZDNfc3BsYXQoYnV0dG9uX3JvdyxcIi5zaG93LWJ1dHRvblwiLFwiYVwiLGlkZW50aXR5LCBrZXkpXG4gICAgICAuY2xhc3NlZChcInNob3ctYnV0dG9uXCIsdHJ1ZSlcbiAgICAgIC5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5zZWxlY3RlZCB9KVxuICAgICAgLnRleHQoa2V5KVxuICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkgeyBib3VuZCh4KSB9KVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgXG4gICAgfVxuICBcbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgYnV0dG9uX3JhZGlvIGZyb20gJy4uL2dlbmVyaWMvYnV0dG9uX3JhZGlvJ1xuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBPcHRpb25WaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gb3B0aW9uX3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgT3B0aW9uVmlldyh0YXJnZXQpXG59XG5cbk9wdGlvblZpZXcucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm9wdGlvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcblxuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIub3B0aW9uLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIm9wdGlvbi13cmFwXCIsdHJ1ZSlcblxuICAgICAgLy9oZWFkZXIod3JhcClcbiAgICAgIC8vICAudGV4dChcIkNob29zZSBWaWV3XCIpXG4gICAgICAvLyAgLmRyYXcoKVxuXG4gICAgICBidXR0b25fcmFkaW8od3JhcClcbiAgICAgICAgLm9uKFwiY2xpY2tcIiwgdGhpcy5vbihcInNlbGVjdFwiKSApXG4gICAgICAgIC5kYXRhKHRoaXMuZGF0YSgpKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuXG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQge2F1dG9TaXplIGFzIGF1dG9TaXplfSBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHtwcmVwRGF0YSBhcyBwfSBmcm9tICcuLi9oZWxwZXJzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHByZXBEYXRhKCkge1xuICByZXR1cm4gcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59O1xuXG52YXIgRVhBTVBMRV9EQVRBID0ge1xuICAgIFwia2V5XCI6IFwiQnJvd3NpbmcgYmVoYXZpb3IgYnkgdGltZVwiXG4gICwgXCJ2YWx1ZXNcIjogW1xuICAgICAgeyAgXG4gICAgICAgICAgXCJrZXlcIjogMVxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAyXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDIuMjVcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogMi41XG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDNcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzRcbiAgICAgIH1cblxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDRcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG5cblxuICBdIFxufVxuXG5leHBvcnQgZnVuY3Rpb24gVGltZVNlcmllcyh0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLl9kYXRhID0gRVhBTVBMRV9EQVRBXG4gIHRoaXMuX29uID0ge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdGltZV9zZXJpZXModGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGltZVNlcmllcyh0YXJnZXQpXG59XG5cblRpbWVTZXJpZXMucHJvdG90eXBlID0ge1xuXG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgdGl0bGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9XG4gICwgaGVpZ2h0OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cblxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHdyYXAgPSB0aGlzLl90YXJnZXRcbiAgICAgIHZhciBkZXNjID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnZlbmRvci1kb21haW5zLWJhci1kZXNjXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ2ZW5kb3ItZG9tYWlucy1iYXItZGVzY1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG4gICAgICAgIC5kYXR1bSh0aGlzLl9kYXRhKVxuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUoZGVzYyxcIi53XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ3XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICBcbiAgICAgIFxuXG4gICAgICB3cmFwcGVyLmVhY2goZnVuY3Rpb24ocm93KXtcblxuICAgICAgICB2YXIgZGF0YSA9IHJvdy52YWx1ZXMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMua2V5IC0gcC5rZXl9KVxuICAgICAgICAgICwgY291bnQgPSBkYXRhLmxlbmd0aDtcblxuXG4gICAgICAgIHZhciBfc2l6ZXMgPSBhdXRvU2l6ZSh3cmFwcGVyLGZ1bmN0aW9uKGQpe3JldHVybiBkIC0xMH0sIGZ1bmN0aW9uKGQpe3JldHVybiBzZWxmLl9oZWlnaHQgfHwgNjAgfSksXG4gICAgICAgICAgZ3JpZFNpemUgPSBNYXRoLmZsb29yKF9zaXplcy53aWR0aCAvIDI0IC8gMyk7XG5cbiAgICAgICAgdmFyIHZhbHVlQWNjZXNzb3IgPSBmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH1cbiAgICAgICAgICAsIHZhbHVlQWNjZXNzb3IyID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZTIgfVxuICAgICAgICAgICwga2V5QWNjZXNzb3IgPSBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9XG5cbiAgICAgICAgdmFyIHN0ZXBzID0gQXJyYXkuYXBwbHkobnVsbCwgQXJyYXkoY291bnQpKS5tYXAoZnVuY3Rpb24gKF8sIGkpIHtyZXR1cm4gaSsxO30pXG5cbiAgICAgICAgdmFyIF9jb2xvcnMgPSBbXCIjZmZmZmQ5XCIsXCIjZWRmOGIxXCIsXCIjYzdlOWI0XCIsXCIjN2ZjZGJiXCIsXCIjNDFiNmM0XCIsXCIjMWQ5MWMwXCIsXCIjMjI1ZWE4XCIsXCIjMjUzNDk0XCIsXCIjMDgxZDU4XCJdXG4gICAgICAgIHZhciBjb2xvcnMgPSBfY29sb3JzXG5cbiAgICAgICAgdmFyIHggPSBkMy5zY2FsZS5vcmRpbmFsKCkucmFuZ2Uoc3RlcHMpXG4gICAgICAgICAgLCB5ID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoW19zaXplcy5oZWlnaHQsIDAgXSlcblxuXG4gICAgICAgIHZhciBjb2xvclNjYWxlID0gZDMuc2NhbGUucXVhbnRpbGUoKVxuICAgICAgICAgIC5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbiAoZCkgeyByZXR1cm4gZC5mcmVxdWVuY3k7IH0pXSlcbiAgICAgICAgICAucmFuZ2UoY29sb3JzKTtcblxuICAgICAgICB2YXIgc3ZnX3dyYXAgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCJzdmdcIixcInN2Z1wiKVxuICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgX3NpemVzLndpZHRoICsgX3NpemVzLm1hcmdpbi5sZWZ0ICsgX3NpemVzLm1hcmdpbi5yaWdodClcbiAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBfc2l6ZXMuaGVpZ2h0ICsgX3NpemVzLm1hcmdpbi50b3AgKyBfc2l6ZXMubWFyZ2luLmJvdHRvbSlcblxuICAgICAgICB2YXIgc3ZnID0gZDNfc3BsYXQoc3ZnX3dyYXAsXCJnXCIsXCJnXCIsZnVuY3Rpb24oeCkge3JldHVybiBbeC52YWx1ZXNdfSxmdW5jdGlvbihfLGkpIHtyZXR1cm4gaX0pXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBfc2l6ZXMubWFyZ2luLmxlZnQgKyBcIixcIiArIDAgKyBcIilcIilcblxuICAgICAgICB4LmRvbWFpbihbMCw3Ml0pO1xuICAgICAgICB5LmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIE1hdGguc3FydCh2YWx1ZUFjY2Vzc29yKGQpKTsgfSldKTtcblxuICAgICAgICB2YXIgYnVpbGRCYXJzID0gZnVuY3Rpb24oZGF0YSxrZXlBY2Nlc3Nvcix2YWx1ZUFjY2Vzc29yLHksYykge1xuXG4gICAgICAgICAgdmFyIGJhcnMgPSBkM19zcGxhdChzdmcsIFwiLnRpbWluZy1iYXJcIiArIGMsIFwicmVjdFwiLCBkYXRhLCBrZXlBY2Nlc3NvcilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0aW1pbmctYmFyXCIgKyBjKVxuICAgICAgICAgICBcbiAgICAgICAgICBiYXJzXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gKChrZXlBY2Nlc3NvcihkKSAtIDEpICogZ3JpZFNpemUgKTsgfSlcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZ3JpZFNpemUgLSAxKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uKGQpIHsgXG4gICAgICAgICAgICAgIHJldHVybiB5KE1hdGguc3FydCggdmFsdWVBY2Nlc3NvcihkKSApKTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsXCIjYWFhXCIpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBjb2xvclNjYWxlKCBrZXlBY2Nlc3Nvcih4KSArIGMgKSB8fCBcImdyZXlcIiB9IClcbiAgICAgICAgICAgIC8vLmF0dHIoXCJzdHJva2VcIixcIndoaXRlXCIpXG4gICAgICAgICAgICAvLy5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsXCIxcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIF9zaXplcy5oZWlnaHQgLSB5KE1hdGguc3FydCggdmFsdWVBY2Nlc3NvcihkKSApKTsgfSlcbiAgICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIjFcIilcbiAgICAgICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLGZ1bmN0aW9uKHgpeyBcbiAgICAgICAgICAgICAgc2VsZi5vbihcImhvdmVyXCIpLmJpbmQodGhpcykoeClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgfVxuICAgICAgICBcblxuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLmxlbmd0aCAmJiBkYXRhWzBdLnZhbHVlMikge1xuICAgICAgICAgIHZhciAgeTIgPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbX3NpemVzLmhlaWdodCwgMCBdKVxuICAgICAgICAgIHkyLmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIE1hdGguc3FydCh2YWx1ZUFjY2Vzc29yMihkKSk7IH0pXSk7XG4gICAgICAgICAgYnVpbGRCYXJzKGRhdGEsa2V5QWNjZXNzb3IsdmFsdWVBY2Nlc3NvcjIseTIsXCItMlwiKVxuICAgICAgICB9XG5cblxuICAgICAgICBidWlsZEJhcnMoZGF0YSxrZXlBY2Nlc3Nvcix2YWx1ZUFjY2Vzc29yLHksXCJcIilcbiAgICAgIFxuICAgIFxuICAgICAgdmFyIHogPSBkMy50aW1lLnNjYWxlKClcbiAgICAgICAgLnJhbmdlKFswLCBncmlkU2l6ZSoyNCozXSlcbiAgICAgICAgLm5pY2UoZDMudGltZS5ob3VyLDI0KVxuICAgICAgICBcbiAgICBcbiAgICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKClcbiAgICAgICAgLnNjYWxlKHopXG4gICAgICAgIC50aWNrcygzKVxuICAgICAgICAudGlja0Zvcm1hdChkMy50aW1lLmZvcm1hdChcIiVJICVwXCIpKTtcbiAgICBcbiAgICAgIHN2Zy5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInggYXhpc1wiKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsXCIgKyBfc2l6ZXMuaGVpZ2h0ICsgXCIpXCIpXG4gICAgICAgICAgLmNhbGwoeEF4aXMpO1xuXG5cblxuICAgICAgICBcbiAgICAgIH0pXG5cblxuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3NwbGF0LCBkM191cGRhdGVhYmxlLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRhYnVsYXJIZWFkZXIgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5XSURUSCA9IDE0NFxuICAgIHRoaXMuX2xhYmVsID0gXCJVUkxcIlxuICAgIHRoaXMuX2hlYWRlcnMgPSBbXCIxMmFtXCIsIFwiMTJwbVwiLCBcIjEyYW1cIl1cbiAgICB0aGlzLl94cyA9IFswLHRoaXMuV0lEVEgvMix0aGlzLldJRFRIXVxuICAgIHRoaXMuX2FuY2hvcnMgPSBbXCJzdGFydFwiLFwibWlkZGxlXCIsXCJlbmRcIl1cbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wibGFiZWxcIixcImhlYWRlcnNcIl0gfVxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgZXVoID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwiZXhwYW5zaW9uLXVybHMtdGl0bGVcIilcblxuICAgIGQzX2NsYXNzKGV1aCxcInRpdGxlXCIpLnRleHQodGhpcy5sYWJlbCgpKVxuICAgIGQzX2NsYXNzKGV1aCxcInZpZXdcIikudGV4dChcIlZpZXdzXCIpXG5cbiAgICB2YXIgc3ZnX2xlZ2VuZCA9IGQzX2NsYXNzKGV1aCxcImxlZ2VuZFwiLFwic3ZnXCIpXG5cbiAgICBpZiAodGhpcy5oZWFkZXJzKCkubGVuZ3RoID09IDIpIHtcbiAgICAgIHRoaXMuX3hzID0gW3RoaXMuV0lEVEgvMi10aGlzLldJRFRILzQsdGhpcy5XSURUSC8yK3RoaXMuV0lEVEgvNF1cbiAgICAgIHRoaXMuX2FuY2hvcnMgPSBbXCJtaWRkbGVcIixcIm1pZGRsZVwiXVxuICAgIH1cblxuICAgIGQzX3NwbGF0KHN2Z19sZWdlbmQsXCJ0ZXh0XCIsXCJ0ZXh0XCIsdGhpcy5oZWFkZXJzKCksKHgsaSkgPT4geyByZXR1cm4gaSB9KVxuICAgICAgLmF0dHIoXCJ5XCIsXCIyMFwiKVxuICAgICAgLmF0dHIoXCJ4XCIsKHgsaSkgPT4gdGhpcy5feHNbaV0pXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCh4LGkpID0+IHRoaXMuX2FuY2hvcnNbaV0pXG4gICAgICAudGV4dChTdHJpbmcpXG5cbiAgICBkM19zcGxhdChzdmdfbGVnZW5kLFwibGluZVwiLFwibGluZVwiLHRoaXMuaGVhZGVycygpLCh4LGkpID0+IHsgcmV0dXJuIGkgfSlcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgLmF0dHIoXCJ5MVwiLCB0aGlzLmhlYWRlcnMoKS5sZW5ndGggPT0gMiA/IDAgOiAyNSlcbiAgICAgIC5hdHRyKFwieTJcIiwgMzUpXG4gICAgICAuYXR0cihcIngxXCIsKHgsaSkgPT4gdGhpcy5oZWFkZXJzKCkubGVuZ3RoID09IDIgPyB0aGlzLldJRFRILzIgOiB0aGlzLl94c1tpXSlcbiAgICAgIC5hdHRyKFwieDJcIiwoeCxpKSA9PiB0aGlzLmhlYWRlcnMoKS5sZW5ndGggPT0gMiA/IHRoaXMuV0lEVEgvMiA6IHRoaXMuX3hzW2ldKVxuXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBzaW1wbGVUaW1lc2VyaWVzKHRhcmdldCxkYXRhLHcsaCxtaW4pIHtcbiAgdmFyIHdpZHRoID0gdyB8fCAxMjBcbiAgICAsIGhlaWdodCA9IGggfHwgMzBcblxuICB2YXIgeCA9IGQzLnNjYWxlLm9yZGluYWwoKS5kb21haW4oZDMucmFuZ2UoMCxkYXRhLmxlbmd0aCkpLnJhbmdlKGQzLnJhbmdlKDAsd2lkdGgsd2lkdGgvZGF0YS5sZW5ndGgpKVxuICB2YXIgeSA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFs0LGhlaWdodF0pLmRvbWFpbihbbWluIHx8IGQzLm1pbihkYXRhKSxkMy5tYXgoZGF0YSldKVxuXG4gIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJnXCIsXCJnXCIsZGF0YSxmdW5jdGlvbih4LGkpIHsgcmV0dXJuIDF9KVxuXG4gIGQzX3NwbGF0KHdyYXAsXCJyZWN0XCIsXCJyZWN0XCIseCA9PiB4LCAoeCxpKSA9PiBpKVxuICAgIC5hdHRyKFwieFwiLCh6LGkpID0+IHgoaSkpXG4gICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aC9kYXRhLmxlbmd0aCAtMS4yKVxuICAgIC5hdHRyKFwieVwiLCB6ID0+IGhlaWdodCAtIHkoeikgKVxuICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHogPT4geiA/IHkoeikgOiAwKVxuXG4gIHJldHVybiB3cmFwXG5cbn1cbiIsImltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnLi9zaW1wbGVfdGltZXNlcmllcydcbmltcG9ydCB7ZDNfY2xhc3MsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIGJlZm9yZV9hZnRlcl90aW1lc2VyaWVzKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEJlZm9yZUFmdGVyVGltZXNlcmllcyh0YXJnZXQpXG59XG5cbmNsYXNzIEJlZm9yZUFmdGVyVGltZXNlcmllcyBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG5cbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICAgIHRoaXMuX3dyYXBwZXJfY2xhc3MgPSBcImJhLXRpbWVzZXJpZXMtd3JhcFwiXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIixcImJlZm9yZVwiLFwiYWZ0ZXJcIixcIndyYXBwZXJfY2xhc3NcIl0gfVxuXG4gIGRyYXcoKSB7XG5cbiAgICBjb25zdCB0c3cgPSAyNTBcbiAgICAgICwgdW5pdF9zaXplID0gdHN3L3RoaXMuZGF0YSgpLmxlbmd0aFxuICAgICAgLCBiZWZvcmVfcG9zID0gdGhpcy5iZWZvcmUoKVxuICAgICAgLCBhZnRlcl9wb3MgPSB0aGlzLmFmdGVyKClcblxuXG4gICAgY29uc3QgdGltZXNlcmllcyA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCx0aGlzLndyYXBwZXJfY2xhc3MoKSxcInN2Z1wiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiYmxvY2tcIilcbiAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiYXV0b1wiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMzBweFwiKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLHRzdyArIFwicHhcIilcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsXCI3MHB4XCIpXG5cbiAgICBzaW1wbGVUaW1lc2VyaWVzKHRpbWVzZXJpZXMsdGhpcy5kYXRhKCksdHN3KVxuXG4gICAgLy8gYWRkIGRlY29yYXRpb25zXG5cbiAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwibWlkZGxlXCIsXCJsaW5lXCIpXG4gICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAgIC5hdHRyKFwieTJcIiwgNTUpXG4gICAgICAuYXR0cihcIngxXCIsIHRzdy8yKVxuICAgICAgLmF0dHIoXCJ4MlwiLCB0c3cvMilcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJtaWRkbGUtdGV4dFwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ4XCIsIHRzdy8yKVxuICAgICAgLmF0dHIoXCJ5XCIsIDY3KVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcIm1pZGRsZVwiKVxuICAgICAgLnRleHQoXCJPbi1zaXRlXCIpXG5cbiAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYmVmb3JlXCIsXCJsaW5lXCIpXG4gICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgIC5hdHRyKFwieTFcIiwgMzkpXG4gICAgICAuYXR0cihcInkyXCIsIDQ1KVxuICAgICAgLmF0dHIoXCJ4MVwiLCB1bml0X3NpemUqYmVmb3JlX3BvcylcbiAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKmJlZm9yZV9wb3MpXG5cbiAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYmVmb3JlLXRleHRcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwieFwiLCB1bml0X3NpemUqYmVmb3JlX3BvcyAtIDgpXG4gICAgICAuYXR0cihcInlcIiwgNDgpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAudGV4dChcIkNvbnNpZGVyYXRpb25cIilcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJ3aW5kb3dcIixcImxpbmVcIilcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgLmF0dHIoXCJ5MVwiLCA0NSlcbiAgICAgIC5hdHRyKFwieTJcIiwgNDUpXG4gICAgICAuYXR0cihcIngxXCIsIHVuaXRfc2l6ZSooYmVmb3JlX3BvcykpXG4gICAgICAuYXR0cihcIngyXCIsIHVuaXRfc2l6ZSooYWZ0ZXJfcG9zKzEpKzEpXG5cbiAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYWZ0ZXJcIixcImxpbmVcIilcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgLmF0dHIoXCJ5MVwiLCAzOSlcbiAgICAgIC5hdHRyKFwieTJcIiwgNDUpXG4gICAgICAuYXR0cihcIngxXCIsIHVuaXRfc2l6ZSooYWZ0ZXJfcG9zKzEpKVxuICAgICAgLmF0dHIoXCJ4MlwiLCB1bml0X3NpemUqKGFmdGVyX3BvcysxKSlcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJhZnRlci10ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInhcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkgKyA4KVxuICAgICAgLmF0dHIoXCJ5XCIsIDQ4KVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcInN0YXJ0XCIpXG4gICAgICAudGV4dChcIlZhbGlkYXRpb25cIilcblxuXG5cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxufVxuXG5cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBzaW1wbGVCYXIod3JhcCx2YWx1ZSxzY2FsZSxjb2xvcikge1xuXG4gIHZhciBoZWlnaHQgPSAyMFxuICAgICwgd2lkdGggPSB3cmFwLnN0eWxlKFwid2lkdGhcIikucmVwbGFjZShcInB4XCIsXCJcIilcblxuICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixbdmFsdWVdLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgLnN0eWxlKFwid2lkdGhcIix3aWR0aCtcInB4XCIpXG4gICAgLnN0eWxlKFwiaGVpZ2h0XCIsaGVpZ2h0K1wicHhcIilcblxuICB2YXIgY2hhcnQgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydCcsJ2cnLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0XCIpXG4gIFxuICB2YXIgYmFycyA9IGQzX3NwbGF0KGNoYXJ0LFwiLnBvcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpIH0pXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgIC5hdHRyKCdoZWlnaHQnLGhlaWdodC00KVxuICAgIC5hdHRyKHsneCc6MCwneSc6MH0pXG4gICAgLnN0eWxlKCdmaWxsJyxjb2xvcilcbiAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gc2NhbGUoeCkgfSlcblxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gZG9tYWluX2J1bGxldCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEb21haW5CdWxsZXQodGFyZ2V0KVxufVxuXG4vLyBkYXRhIHNjaGVtYTogW3twb3BfcGVyY2VudCwgc2FtcGxlX3BlcmNlbnRfbm9ybX1cblxuY2xhc3MgRG9tYWluQnVsbGV0IGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG4gIH1cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJtYXhcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgdmFyIHdpZHRoID0gKHRoaXMudGFyZ2V0LnN0eWxlKFwid2lkdGhcIikucmVwbGFjZShcInB4XCIsXCJcIikgfHwgdGhpcy5vZmZzZXRXaWR0aCkgLSA1MFxuICAgICAgLCBoZWlnaHQgPSAyODtcblxuICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5yYW5nZShbMCwgd2lkdGhdKVxuICAgICAgLmRvbWFpbihbMCwgdGhpcy5tYXgoKV0pXG5cbiAgICBpZiAodGhpcy50YXJnZXQudGV4dCgpKSB0aGlzLnRhcmdldC50ZXh0KFwiXCIpXG5cbiAgICB2YXIgYnVsbGV0ID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5idWxsZXRcIixcImRpdlwiLHRoaXMuZGF0YSgpLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5jbGFzc2VkKFwiYnVsbGV0XCIsdHJ1ZSlcbiAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjNweFwiKVxuXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUoYnVsbGV0LFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgIC5hdHRyKFwid2lkdGhcIix3aWR0aClcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsaGVpZ2h0KVxuICBcbiAgIFxuICAgIGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmJhci0xXCIsXCJyZWN0XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAuY2xhc3NlZChcImJhci0xXCIsdHJ1ZSlcbiAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uKGQpIHtyZXR1cm4geChkLnBvcF9wZXJjZW50KSB9KVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgICAgLmF0dHIoXCJmaWxsXCIsXCIjODg4XCIpXG4gIFxuICAgIGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmJhci0yXCIsXCJyZWN0XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAuY2xhc3NlZChcImJhci0yXCIsdHJ1ZSlcbiAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAuYXR0cihcInlcIixoZWlnaHQvNClcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24oZCkge3JldHVybiB4KGQuc2FtcGxlX3BlcmNlbnRfbm9ybSkgfSlcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodC8yKVxuICAgICAgLmF0dHIoXCJmaWxsXCIsXCJyZ2IoOCwgMjksIDg4KVwiKVxuXG4gICAgcmV0dXJuIHRoaXMgXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3NwbGF0LCBkM191cGRhdGVhYmxlLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUYWJ1bGFyQm9keSBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiLFwic3BsaXRcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgbGV0IGV4cGFuc2lvbl9yb3cgPSB0aGlzLl90YXJnZXRcblxuICAgIHZhciBleHBhbnNpb24gPSBkM19jbGFzcyhleHBhbnNpb25fcm93LFwiZXhwYW5zaW9uLXVybHNcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzY3JvbGxib3hcIix0cnVlKVxuXG4gICAgZXhwYW5zaW9uLmh0bWwoXCJcIilcblxuICAgIHZhciB1cmxfcm93ID0gZDNfc3BsYXQoZXhwYW5zaW9uLFwiLnVybC1yb3dcIixcImRpdlwiLHRoaXMuZGF0YSgpLnNsaWNlKDAsNTAwKSxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmNsYXNzZWQoXCJ1cmwtcm93XCIsdHJ1ZSlcblxuICAgIHZhciB1cmxfbmFtZSA9IGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5uYW1lXCIsXCJkaXZcIikuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh1cmxfbmFtZSxcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICB9KVxuXG4gICAgZDNfY2xhc3ModXJsX25hbWUsXCJ1cmxcIixcImFcIilcbiAgICAgIC50ZXh0KHggPT4geyByZXR1cm4gdGhpcy5zcGxpdCgpID8geC5rZXkuc3BsaXQodGhpcy5zcGxpdCgpKVsxXSB8fCB4LmtleSA6IHgua2V5IH0pXG4gICAgICAuYXR0cihcImhyZWZcIiwgeCA9PiB4LnVybCA/IHgudXJsIDogdW5kZWZpbmVkIClcbiAgICAgIC5hdHRyKFwidGFyZ2V0XCIsIFwiX2JsYW5rXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubnVtYmVyXCIsXCJkaXZcIikuY2xhc3NlZChcIm51bWJlclwiLHRydWUpXG4gICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvdGFsIH0pXG5cblxuICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5wbG90XCIsXCJzdmdcIikuY2xhc3NlZChcInBsb3RcIix0cnVlKVxuICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgdmFyIHZhbHVlcyA9IHgudmFsdWVzIHx8IHgudmFsdWVcbiAgICAgICAgc2ltcGxlVGltZXNlcmllcyhkdGhpcyx2YWx1ZXMsMTQ0LDIwKVxuICAgICAgfSlcblxuICB9XG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM19zcGxhdCwgZDNfdXBkYXRlYWJsZSwgYWNjZXNzb3IsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCBUYWJ1bGFySGVhZGVyIGZyb20gJy4vaGVhZGVyJ1xuaW1wb3J0IFRhYnVsYXJCb2R5IGZyb20gJy4vYm9keSdcblxuaW1wb3J0ICcuL3RhYnVsYXJfdGltZXNlcmllcy5jc3MnXG5cbmV4cG9ydCBmdW5jdGlvbiB0YWJ1bGFyX3RpbWVzZXJpZXModGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGFidWxhclRpbWVzZXJpZXModGFyZ2V0KVxufVxuXG5jbGFzcyBUYWJ1bGFyVGltZXNlcmllcyBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9oZWFkZXJzID0gW1wiMTJhbVwiLFwiMTJwbVwiLFwiMTJhbVwiXVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJsYWJlbFwiLFwic3BsaXRcIixcImhlYWRlcnNcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgbGV0IHRkID0gdGhpcy5fdGFyZ2V0XG5cbiAgICB2YXIgdGl0bGVfcm93ID0gZDNfY2xhc3ModGQsXCJ0aXRsZS1yb3dcIilcbiAgICB2YXIgZXhwYW5zaW9uX3JvdyA9IGQzX2NsYXNzKHRkLFwiZXhwYW5zaW9uLXJvd1wiKVxuXG4gICAgdmFyIGhlYWRlciA9IChuZXcgVGFidWxhckhlYWRlcih0aXRsZV9yb3cpKVxuICAgICAgLmxhYmVsKHRoaXMubGFiZWwoKSlcbiAgICAgIC5oZWFkZXJzKHRoaXMuaGVhZGVycygpKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIGJvZHkgPSAobmV3IFRhYnVsYXJCb2R5KGV4cGFuc2lvbl9yb3cpKVxuICAgICAgLmRhdGEodGhpcy5kYXRhKCkpXG4gICAgICAuc3BsaXQodGhpcy5zcGxpdCgpIHx8IGZhbHNlKVxuICAgICAgLmRyYXcoKVxuXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3NwbGF0LCBkM191cGRhdGVhYmxlLCBhY2Nlc3NvciwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0ICcuL2RvbWFpbl9leHBhbmRlZC5jc3MnXG5cbmltcG9ydCB7dGFidWxhcl90aW1lc2VyaWVzfSBmcm9tICcuL3RhYnVsYXJfdGltZXNlcmllcy9pbmRleCdcblxuZXhwb3J0IGxldCBhbGxidWNrZXRzID0gW11cbmV4cG9ydCBjb25zdCBob3VyYnVja2V0cyA9IGQzLnJhbmdlKDAsMjQpLm1hcCh4ID0+IFN0cmluZyh4KS5sZW5ndGggPiAxID8gU3RyaW5nKHgpIDogXCIwXCIgKyB4KVxuXG52YXIgbWludXRlcyA9IFswLDIwLDQwXVxuZXhwb3J0IGNvbnN0IGJ1Y2tldHMgPSBkMy5yYW5nZSgwLDI0KS5yZWR1Y2UoKHAsYykgPT4ge1xuICBtaW51dGVzLm1hcCh4ID0+IHtcbiAgICBwW2MgKyBcIjpcIiArIHhdID0gMFxuICB9KVxuICBhbGxidWNrZXRzID0gYWxsYnVja2V0cy5jb25jYXQobWludXRlcy5tYXAoeiA9PiBjICsgXCI6XCIgKyB6KSlcbiAgcmV0dXJuIHBcbn0se30pXG5cblxuZXhwb3J0IGNvbnN0IFNUT1BXT1JEUyA9IFtcInRoYXRcIixcInRoaXNcIixcIndoYXRcIixcImJlc3RcIixcIm1vc3RcIixcImZyb21cIixcInlvdXJcIixcImhhdmVcIixcImZpcnN0XCIsXCJ3aWxsXCIsXCJ0aGFuXCIsXCJzYXlzXCIsXCJsaWtlXCIsXCJpbnRvXCIsXCJhZnRlclwiLFwid2l0aFwiXVxuXG5mdW5jdGlvbiByYXdUb1VybChkYXRhKSB7XG4gIHJldHVybiBkYXRhLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICBwW2MudXJsXSA9IHBbYy51cmxdIHx8IE9iamVjdC5hc3NpZ24oe30sYnVja2V0cylcbiAgICAgIHBbYy51cmxdW2MuaG91cl0gPSAocFtjLnVybF1bYy5ob3VyXSB8fCAwKSArIGMuY291bnRcbiAgICAgIHJldHVybiBwXG4gICAgfSx7fSlcbn1cblxuZnVuY3Rpb24gdXJsVG9EcmF3KHVybHMpIHtcbiAgdmFyIG9iaiA9IHt9XG4gIE9iamVjdC5rZXlzKHVybHMpLm1hcChrID0+IHtcbiAgICBvYmpba10gPSBob3VyYnVja2V0cy5tYXAoYiA9PiB1cmxzW2tdW2JdIHx8IDApXG4gIH0pXG5cbiAgcmV0dXJuIGQzLmVudHJpZXMob2JqKVxuICAgIC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICB4LnVybCA9IHgua2V5XG4gICAgICB4LnRvdGFsID0gZDMuc3VtKHgudmFsdWUpXG4gICAgICByZXR1cm4geFxuICAgIH0pIFxufVxuXG5mdW5jdGlvbiBkcmF3VG9LZXl3b3JkKGRyYXcsc3BsaXQpIHtcbiAgbGV0IG9iaiA9IGRyYXdcbiAgICAucmVkdWNlKGZ1bmN0aW9uKHAsYyl7XG4gICAgICBjLmtleS50b0xvd2VyQ2FzZSgpLnNwbGl0KHNwbGl0KVsxXS5zcGxpdChcIi9cIikucmV2ZXJzZSgpWzBdLnJlcGxhY2UoXCJfXCIsXCItXCIpLnNwbGl0KFwiLVwiKS5tYXAoeCA9PiB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSBTVE9QV09SRFNcbiAgICAgICAgaWYgKHgubWF0Y2goL1xcZCsvZykgPT0gbnVsbCAmJiB2YWx1ZXMuaW5kZXhPZih4KSA9PSAtMSAmJiB4LmluZGV4T2YoXCIsXCIpID09IC0xICYmIHguaW5kZXhPZihcIj9cIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiLlwiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCI6XCIpID09IC0xICYmIHBhcnNlSW50KHgpICE9IHggJiYgeC5sZW5ndGggPiAzKSB7XG4gICAgICAgICAgcFt4XSA9IHBbeF0gfHwge31cbiAgICAgICAgICBPYmplY3Qua2V5cyhjLnZhbHVlKS5tYXAocSA9PiB7IHBbeF1bcV0gPSAocFt4XVtxXSB8fCAwKSArIChjLnZhbHVlW3FdIHx8IDApIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBwXG4gICAgfSx7fSkgXG5cbiAgcmV0dXJuIGQzLmVudHJpZXMob2JqKVxuICAgIC5tYXAoeCA9PiB7XG4gICAgICB4LnZhbHVlcyA9IE9iamVjdC5rZXlzKHgudmFsdWUpLm1hcCh6ID0+IHgudmFsdWVbel0gfHwgMClcbiAgICAgIHgudG90YWwgPSBkMy5zdW0oeC52YWx1ZXMpXG4gICAgICByZXR1cm4geFxuICAgIH0pXG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRvbWFpbl9leHBhbmRlZCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEb21haW5FeHBhbmRlZCh0YXJnZXQpXG59XG5cbmNsYXNzIERvbWFpbkV4cGFuZGVkIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJyYXdcIixcImRhdGFcIixcInVybHNcIixcImRvbWFpblwiXSB9XG5cbiAgZHJhdygpIHtcbiAgICBsZXQgdGQgPSB0aGlzLl90YXJnZXRcblxuICAgIGQzX2NsYXNzKHRkLFwiYWN0aW9uLWhlYWRlclwiKVxuICAgICAgLnRleHQoXCJFeHBsb3JlIGFuZCBSZWZpbmVcIilcblxuICAgIGxldCB1cmxEYXRhID0gcmF3VG9VcmwodGhpcy5yYXcoKSlcbiAgICBsZXQgdG9fZHJhdyA9IHVybFRvRHJhdyh1cmxEYXRhKVxuICAgIGxldCBrd190b19kcmF3ID0gZHJhd1RvS2V5d29yZCh0b19kcmF3LHRoaXMuZG9tYWluKCkpXG5cbiAgICB0YWJ1bGFyX3RpbWVzZXJpZXMoZDNfY2xhc3ModGQsXCJ1cmwtZGVwdGhcIikpXG4gICAgICAubGFiZWwoXCJVUkxcIilcbiAgICAgIC5kYXRhKHRvX2RyYXcpXG4gICAgICAuc3BsaXQodGhpcy5kb21haW4oKSlcbiAgICAgIC5kcmF3KClcblxuICAgIHRhYnVsYXJfdGltZXNlcmllcyhkM19jbGFzcyh0ZCxcImt3LWRlcHRoXCIpKVxuICAgICAgLmxhYmVsKFwiS2V5d29yZHNcIilcbiAgICAgIC5kYXRhKGt3X3RvX2RyYXcpXG4gICAgICAuZHJhdygpXG4gICAgICAgIFxuICB9XG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM19zcGxhdCwgZDNfdXBkYXRlYWJsZSwgYWNjZXNzb3IsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCAnLi92ZXJ0aWNhbF9vcHRpb24uY3NzJ1xuXG5cbmV4cG9ydCBmdW5jdGlvbiB2ZXJ0aWNhbF9vcHRpb24odGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVmVydGljYWxPcHRpb24odGFyZ2V0KVxufVxuXG4vL1t7a2V5LCB2YWx1ZSwgc2VsZWN0ZWR9LC4uLl1cblxuY2xhc3MgVmVydGljYWxPcHRpb24gZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb3B0aW9ucyA9IFtdXG4gICAgdGhpcy5fd3JhcHBlcl9jbGFzcyA9IFwidmVydGljYWwtb3B0aW9uc1wiXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcIm9wdGlvbnNcIixcIndyYXBwZXJfY2xhc3NcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgdmFyIG9wdHMgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsdGhpcy53cmFwcGVyX2NsYXNzKCksXCJkaXZcIix0aGlzLm9wdGlvbnMoKSlcbiAgICAgIFxuICAgICBkM19zcGxhdChvcHRzLFwiLnNob3ctYnV0dG9uXCIsXCJhXCIsdGhpcy5vcHRpb25zKCkseCA9PiB4LmtleSlcbiAgICAgIC5jbGFzc2VkKFwic2hvdy1idXR0b25cIix0cnVlKVxuICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLHggPT4geC5zZWxlY3RlZClcbiAgICAgIC50ZXh0KHggPT4geC5rZXkpXG4gICAgICAub24oXCJjbGlja1wiLHRoaXMub24oXCJjbGlja1wiKSApIFxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQge3ByZXBEYXRhfSBmcm9tICcuLi9nZW5lcmljL3RpbWVzZXJpZXMnXG5cbmltcG9ydCB0YWJsZSBmcm9tICd0YWJsZSdcbmltcG9ydCB7ZG9tYWluX2V4cGFuZGVkfSBmcm9tICdjb21wb25lbnQnXG5pbXBvcnQge2RvbWFpbl9idWxsZXR9IGZyb20gJ2NoYXJ0J1xuXG5cbmV4cG9ydCBjbGFzcyBEb21haW5WaWV3IGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsIFwib3B0aW9uc1wiLCBcInNvcnRcIiwgXCJhc2NlbmRpbmdcIl0gfVxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIHZhciBfZXhwbG9yZSA9IHRoaXMuX3RhcmdldFxuICAgICAgLCB0YWJzID0gdGhpcy5vcHRpb25zKClcbiAgICAgICwgZGF0YSA9IHRoaXMuZGF0YSgpXG4gICAgICAsIGZpbHRlcmVkID0gdGFicy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnNlbGVjdGVkfSlcbiAgICAgICwgc2VsZWN0ZWQgPSBmaWx0ZXJlZC5sZW5ndGggPyBmaWx0ZXJlZFswXSA6IHRhYnNbMF1cblxuICAgIGNvbnN0IGhlYWRlcnMgPSBbXG4gICAgICAgICAge2tleTpcImtleVwiLHZhbHVlOiBzZWxlY3RlZC5rZXkucmVwbGFjZShcIlRvcCBcIixcIlwiKSxsb2NrZWQ6dHJ1ZSx3aWR0aDpcIjIwMHB4XCJ9XG4gICAgICAgICwge2tleTpcInNhbXBsZV9wZXJjZW50XCIsdmFsdWU6XCJTZWdtZW50XCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICwge2tleTpcInJlYWxfcG9wX3BlcmNlbnRcIix2YWx1ZTpcIkJhc2VsaW5lXCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICwge2tleTpcInJhdGlvXCIsdmFsdWU6XCJSYXRpb1wiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAsIHtrZXk6XCJpbXBvcnRhbmNlXCIsdmFsdWU6XCJJbXBvcnRhbmNlXCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICwge2tleTpcInZhbHVlXCIsdmFsdWU6XCJTZWdtZW50IHZlcnN1cyBCYXNlbGluZVwiLGxvY2tlZDp0cnVlfVxuICAgICAgXS8vLmZpbHRlcigoeCkgPT4gISFzZWxlY3RlZC52YWx1ZXNbMF1beC5rZXldKVxuXG4gICAgY29uc3Qgc2FtcF9tYXggPSBkMy5tYXgoc2VsZWN0ZWQudmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnNhbXBsZV9wZXJjZW50X25vcm19KVxuICAgICAgLCBwb3BfbWF4ID0gZDMubWF4KHNlbGVjdGVkLnZhbHVlcyxmdW5jdGlvbih4KXtyZXR1cm4geC5wb3BfcGVyY2VudH0pXG4gICAgICAsIG1heCA9IE1hdGgubWF4KHNhbXBfbWF4LHBvcF9tYXgpO1xuXG5cbiAgICBjb25zdCBfZGVmYXVsdCA9IFwiaW1wb3J0YW5jZVwiXG4gICAgY29uc3QgcyA9IHRoaXMuc29ydCgpIFxuICAgIGNvbnN0IGFzYyA9IHRoaXMuYXNjZW5kaW5nKCkgXG5cblxuICAgIGNvbnN0IHNlbGVjdGVkSGVhZGVyID0gaGVhZGVycy5maWx0ZXIoeCA9PiB4LmtleSA9PSBzKVxuICAgIGNvbnN0IHNvcnRieSA9IHNlbGVjdGVkSGVhZGVyLmxlbmd0aCA/IHNlbGVjdGVkSGVhZGVyWzBdLmtleSA6IF9kZWZhdWx0XG5cblxuXG4gICAgaGVhZGVyKF9leHBsb3JlKVxuICAgICAgLnRleHQoc2VsZWN0ZWQua2V5IClcbiAgICAgIC5vcHRpb25zKHRhYnMpXG4gICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCkgeyB0aGlzLm9uKFwic2VsZWN0XCIpKHgpIH0uYmluZCh0aGlzKSlcbiAgICAgIC5kcmF3KClcblxuICAgIF9leHBsb3JlLnNlbGVjdEFsbChcIi52ZW5kb3ItZG9tYWlucy1iYXItZGVzY1wiKS5yZW1vdmUoKVxuICAgIF9leHBsb3JlLmRhdHVtKGRhdGEpXG5cbiAgICB2YXIgdCA9IHRhYmxlKF9leHBsb3JlKVxuICAgICAgLnRvcCgxNDApXG4gICAgICAuZGF0YShzZWxlY3RlZClcbiAgICAgIC5oZWFkZXJzKCBoZWFkZXJzKVxuICAgICAgLnNvcnQoc29ydGJ5LGFzYylcbiAgICAgIC5vbihcInNvcnRcIiwgdGhpcy5vbihcInNvcnRcIikpXG4gICAgICAub3B0aW9uX3RleHQoXCImIzY1MjkxO1wiKVxuICAgICAgLm9uKFwiZXhwYW5kXCIsZnVuY3Rpb24oZCx0ZCkge1xuXG4gICAgICAgIHZhciBkZCA9IHRoaXMucGFyZW50RWxlbWVudC5fX2RhdGFfXy5mdWxsX3VybHMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguZG9tYWluID09IGQua2V5fSlcbiAgICAgICAgdmFyIHJvbGxlZCA9IHByZXBEYXRhKGRkKVxuICAgICAgICBcbiAgICAgICAgZG9tYWluX2V4cGFuZGVkKHRkKVxuICAgICAgICAgIC5kb21haW4oZGRbMF0uZG9tYWluKVxuICAgICAgICAgIC5yYXcoZGQpXG4gICAgICAgICAgLmRhdGEocm9sbGVkKVxuICAgICAgICAgIC51cmxzKGQudXJscylcbiAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSh4KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmRyYXcoKVxuXG4gICAgICB9KVxuICAgICAgLmhpZGRlbl9maWVsZHMoW1widXJsc1wiLFwicGVyY2VudF91bmlxdWVcIixcInNhbXBsZV9wZXJjZW50X25vcm1cIixcInBvcF9wZXJjZW50XCIsXCJ0Zl9pZGZcIixcInBhcmVudF9jYXRlZ29yeV9uYW1lXCJdKVxuICAgICAgLnJlbmRlcihcInJhdGlvXCIsZnVuY3Rpb24oZCkge1xuICAgICAgICB0aGlzLmlubmVyVGV4dCA9IE1hdGgudHJ1bmModGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fLnJhdGlvKjEwMCkvMTAwICsgXCJ4XCJcbiAgICAgIH0pXG4gICAgICAucmVuZGVyKFwidmFsdWVcIixmdW5jdGlvbihkKSB7XG5cbiAgICAgICAgZG9tYWluX2J1bGxldChkMy5zZWxlY3QodGhpcykpXG4gICAgICAgICAgLm1heChtYXgpXG4gICAgICAgICAgLmRhdGEodGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fKVxuICAgICAgICAgIC5kcmF3KClcblxuICAgICAgfSlcbiAgICAgIFxuICAgIHQuZHJhdygpXG4gICAgXG5cbiAgICByZXR1cm4gdGhpc1xuXG4gIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkb21haW5fdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEb21haW5WaWV3KHRhcmdldClcbn1cblxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBidXR0b25fcmFkaW8gZnJvbSAnLi4vZ2VuZXJpYy9idXR0b25fcmFkaW8nXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4uL2dlbmVyaWMvc2VsZWN0J1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzLCBzaW1wbGVCYXJ9IGZyb20gJ2NoYXJ0J1xuXG5pbXBvcnQgKiBhcyB0YWJsZSBmcm9tICd0YWJsZSdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBTZWdtZW50Vmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2VnbWVudF92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNlZ21lbnRWaWV3KHRhcmdldClcbn1cblxuU2VnbWVudFZpZXcucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgc2VnbWVudHM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWdtZW50c1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuc2VnbWVudC13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzZWdtZW50LXdyYXBcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjE0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsdGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKSlcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIixcIjMwMFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjBmNGY3XCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5zZWdtZW50LXdyYXAtc3BhY2VyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzZWdtZW50LXdyYXAtc3BhY2VyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsd3JhcC5zdHlsZShcImhlaWdodFwiKSlcblxuXG4gICAgICBoZWFkZXIod3JhcClcbiAgICAgICAgLmJ1dHRvbnMoW1xuICAgICAgICAgICAge2NsYXNzOiBcInNhdmVkLXNlYXJjaFwiLCBpY29uOiBcImZhLWZvbGRlci1vcGVuLW8gZmFcIiwgdGV4dDogXCJPcGVuIFNhdmVkXCJ9XG4gICAgICAgICAgLCB7Y2xhc3M6IFwibmV3LXNhdmVkLXNlYXJjaFwiLCBpY29uOiBcImZhLWJvb2ttYXJrIGZhXCIsIHRleHQ6IFwiU2F2ZVwifVxuICAgICAgICAgICwge2NsYXNzOiBcImNyZWF0ZVwiLCBpY29uOiBcImZhLXBsdXMtY2lyY2xlIGZhXCIsIHRleHQ6IFwiTmV3IFNlZ21lbnRcIn1cbiAgICAgICAgICAsIHtjbGFzczogXCJsb2dvdXRcIiwgaWNvbjogXCJmYS1zaWduLW91dCBmYVwiLCB0ZXh0OiBcIkxvZ291dFwifVxuICAgICAgICBdKVxuICAgICAgICAub24oXCJzYXZlZC1zZWFyY2guY2xpY2tcIiwgdGhpcy5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiKSlcbiAgICAgICAgLm9uKFwibG9nb3V0LmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyB3aW5kb3cubG9jYXRpb24gPSBcIi9sb2dvdXRcIiB9KVxuICAgICAgICAub24oXCJjcmVhdGUuY2xpY2tcIiwgZnVuY3Rpb24oKSB7IHdpbmRvdy5sb2NhdGlvbiA9IFwiL3NlZ21lbnRzXCIgfSlcbiAgICAgICAgLm9uKFwibmV3LXNhdmVkLXNlYXJjaC5jbGlja1wiLCB0aGlzLm9uKFwibmV3LXNhdmVkLXNlYXJjaC5jbGlja1wiKSlcbiAgICAgICAgLnRleHQoXCJTZWdtZW50XCIpLmRyYXcoKSAgICAgIFxuXG5cbiAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLmhlYWRlci1ib2R5XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIXRoaXMuX2lzX2xvYWRpbmcpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCItNDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCJub25lXCIpXG4gICAgICAgIC5odG1sKFwiPGltZyBzcmM9Jy9zdGF0aWMvaW1nL2dlbmVyYWwvbG9nby1zbWFsbC5naWYnIHN0eWxlPSdoZWlnaHQ6MTVweCcvPiBsb2FkaW5nLi4uXCIpXG5cblxuICAgICAgaWYgKHRoaXMuX2RhdGEgPT0gZmFsc2UpIHJldHVyblxuXG4gICAgICB2YXIgYm9keSA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5ib2R5XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJib2R5XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiY2xlYXJcIixcImJvdGhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4LWRpcmVjdGlvblwiLFwiY29sdW1uXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi0xNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgXG5cbiAgICAgIHZhciByb3cxID0gZDNfdXBkYXRlYWJsZShib2R5LFwiLnJvdy0xXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJyb3ctMVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIiwxKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcImZsZXgtZGlyZWN0aW9uXCIsXCJyb3dcIilcblxuICAgICAgdmFyIHJvdzIgPSBkM191cGRhdGVhYmxlKGJvZHksXCIucm93LTJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInJvdy0yXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLDEpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleC1kaXJlY3Rpb25cIixcInJvd1wiKVxuXG5cbiAgICAgIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUocm93MSxcIi5hY3Rpb24uaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyIGFjdGlvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgdmFyIGlubmVyX2Rlc2MgPSBkM191cGRhdGVhYmxlKHJvdzEsXCIuYWN0aW9uLmlubmVyLWRlc2NcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyLWRlc2MgYWN0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjBweFwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIsXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnRleHQoXCJDaG9vc2UgU2VnbWVudFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNlM2ViZjBcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcixcImRpdi5jb2xvclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY29sb3JcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjMDgxZDU4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuXG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIHNlbGVjdChpbm5lcilcbiAgICAgICAgLm9wdGlvbnModGhpcy5fc2VnbWVudHMpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiY2hhbmdlXCIpLmJpbmQodGhpcykoeClcbiAgICAgICAgfSlcbiAgICAgICAgLnNlbGVjdGVkKHRoaXMuX2FjdGlvbi52YWx1ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIFxuXG5cblxuICAgICAgdmFyIGNhbCA9IGQzX3VwZGF0ZWFibGUoaW5uZXIsXCJhLmZhLWNhbGVuZGFyXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEgZmEtY2FsZW5kYXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgY2Fsc2VsLm5vZGUoKVxuICAgICAgICB9KVxuXG4gICAgICBcbiAgICAgIHZhciBjYWxzZWwgPSBzZWxlY3QoY2FsKVxuICAgICAgICAub3B0aW9ucyhbe1wia2V5XCI6XCJUb2RheVwiLFwidmFsdWVcIjowfSx7XCJrZXlcIjpcIlllc3RlcmRheVwiLFwidmFsdWVcIjoxfSx7XCJrZXlcIjpcIjcgZGF5cyBhZ29cIixcInZhbHVlXCI6N31dKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZi5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgudmFsdWUpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9hY3Rpb25fZGF0ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG4gICAgICAgIC5fc2VsZWN0XG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiLjAxXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIm5vbmVcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCJub25lXCIpXG5cbiAgICAgIFxuXG4gICAgICB2YXIgaW5uZXIyID0gZDNfdXBkYXRlYWJsZShyb3cyLFwiLmNvbXBhcmlzb24uaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyIGNvbXBhcmlzb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcblxuICAgICAgdmFyIGlubmVyX2Rlc2MyID0gZDNfdXBkYXRlYWJsZShyb3cyLFwiLmNvbXBhcmlzb24tZGVzYy5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgY29tcGFyaXNvbi1kZXNjXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG5cbiAgICAgIC8vZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiaDNcIixcImgzXCIpXG4gICAgICAvLyAgLnRleHQoXCIoRmlsdGVycyBhcHBsaWVkIHRvIHRoaXMgc2VnbWVudClcIilcbiAgICAgIC8vICAuc3R5bGUoXCJtYXJnaW5cIixcIjEwcHhcIilcbiAgICAgIC8vICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgLy8gIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgLy8gIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAvLyAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgLy8gIC5zdHlsZShcImZsZXhcIixcIjFcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiLmJhci13cmFwLXRpdGxlXCIsXCJoM1wiKS5jbGFzc2VkKFwiYmFyLXdyYXAtdGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuXG5cbiAgICAgICAgLnRleHQoXCJ2aWV3c1wiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLXRpdGxlXCIsXCJoM1wiKS5jbGFzc2VkKFwiYmFyLXdyYXAtdGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuXG5cblxuICAgICAgICAudGV4dChcInZpZXdzXCIpXG5cblxuXG4gICAgICB2YXIgYmFyX3NhbXAgPSBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCJkaXYuYmFyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJhci13cmFwXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjhweFwiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCIuYmFyLXdyYXAtc3BhY2VcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtc3BhY2VcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KGQzLmZvcm1hdChcIixcIikodGhpcy5fZGF0YS52aWV3cy5zYW1wbGUpKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcIi5iYXItd3JhcC1vcHRcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtb3B0XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC8vLnRleHQoXCJhcHBseSBmaWx0ZXJzP1wiKVxuXG5cblxuICAgICAgdmFyIHhzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgIC5kb21haW4oWzAsTWF0aC5tYXgodGhpcy5fZGF0YS52aWV3cy5zYW1wbGUsIHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbildKVxuICAgICAgICAucmFuZ2UoWzAsYmFyX3NhbXAuc3R5bGUoXCJ3aWR0aFwiKV0pXG5cblxuICAgICAgdmFyIGJhcl9wb3AgPSBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiZGl2LmJhci13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItd3JhcFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjIgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCI4cHhcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLXNwYWNlXCIsXCJkaXZcIikuY2xhc3NlZChcImJhci13cmFwLXNwYWNlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMSAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAudGV4dChkMy5mb3JtYXQoXCIsXCIpKHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbikpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjMixcIi5iYXItd3JhcC1vcHRcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtb3B0XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuICAgICAgICAuaHRtbChcImFwcGx5IGZpbHRlcnM/IDxpbnB1dCB0eXBlPSdjaGVja2JveCc+PC9pbnB1dD5cIilcblxuXG5cbiAgICAgIHNpbXBsZUJhcihiYXJfc2FtcCx0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSx4c2NhbGUsXCIjMDgxZDU4XCIpXG4gICAgICBzaW1wbGVCYXIoYmFyX3BvcCx0aGlzLl9kYXRhLnZpZXdzLnBvcHVsYXRpb24seHNjYWxlLFwiZ3JleVwiKVxuXG5cblxuXG5cblxuXG5cblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIyLFwiaDNcIixcImgzXCIpXG4gICAgICAgIC50ZXh0KFwiQ29tcGFyZSBBZ2FpbnN0XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyMixcImRpdi5jb2xvclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY29sb3JcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJncmV5XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuXG5cblxuXG5cblxuXG5cbiAgICAgIHNlbGVjdChpbm5lcjIpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIkN1cnJlbnQgU2VnbWVudCAod2l0aG91dCBmaWx0ZXJzKVwiLFwidmFsdWVcIjpmYWxzZX1dLmNvbmNhdCh0aGlzLl9zZWdtZW50cykgKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG5cbiAgICAgICAgICBzZWxmLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIikuYmluZCh0aGlzKSh4KVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fY29tcGFyaXNvbi52YWx1ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIHZhciBjYWwyID0gZDNfdXBkYXRlYWJsZShpbm5lcjIsXCJhLmZhLWNhbGVuZGFyXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEgZmEtY2FsZW5kYXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgY2Fsc2VsMi5ub2RlKClcbiAgICAgICAgfSlcblxuICAgICAgXG4gICAgICB2YXIgY2Fsc2VsMiA9IHNlbGVjdChjYWwyKVxuICAgICAgICAub3B0aW9ucyhbe1wia2V5XCI6XCJUb2RheVwiLFwidmFsdWVcIjowfSx7XCJrZXlcIjpcIlllc3RlcmRheVwiLFwidmFsdWVcIjoxfSx7XCJrZXlcIjpcIjcgZGF5cyBhZ29cIixcInZhbHVlXCI6N31dKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZi5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikuYmluZCh0aGlzKSh4LnZhbHVlKVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fY29tcGFyaXNvbl9kYXRlIHx8IDApXG4gICAgICAgIC5kcmF3KClcbiAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIuMDFcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwibm9uZVwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIm5vbmVcIilcblxuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGFjdGlvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uX2RhdGVcIix2YWwpXG4gICAgfVxuICAsIGFjdGlvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFjdGlvblwiLHZhbClcbiAgICB9XG4gICwgY29tcGFyaXNvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY29tcGFyaXNvbl9kYXRlXCIsdmFsKVxuICAgIH1cblxuICAsIGNvbXBhcmlzb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uXCIsdmFsKVxuICAgIH1cbiAgLCBpc19sb2FkaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaXNfbG9hZGluZ1wiLHZhbClcbiAgICB9XG5cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkaWZmX2Jhcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEaWZmQmFyKHRhcmdldClcbn1cblxuLy8gZGF0YSBmb3JtYXQ6IFt7a2V5LCBub3JtYWxpemVkX2RpZmZ9LCAuLi4gXVxuXG5jbGFzcyBEaWZmQmFyIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICB0aGlzLl9rZXlfYWNjZXNzb3IgPSBcImtleVwiXG4gICAgdGhpcy5fdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcbiAgICB0aGlzLl9iYXJfaGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9iYXJfd2lkdGggPSAxNTBcbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGJhcl9oZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX2hlaWdodFwiLHZhbCkgfVxuICBiYXJfd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX3dpZHRoXCIsdmFsKSB9XG5cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHcgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5kaWZmLXdyYXBcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkge3JldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiZGlmZi13cmFwXCIsdHJ1ZSlcblxuICAgIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKS50ZXh0KHRoaXMuX3RpdGxlKVxuXG4gICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHcsXCIuc3ZnLXdyYXBcIixcImRpdlwiLHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmNsYXNzZWQoXCJzdmctd3JhcFwiLHRydWUpXG5cbiAgICB2YXIgayA9IHRoaXMua2V5X2FjY2Vzc29yKClcbiAgICAgICwgdiA9IHRoaXMudmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmJhcl9oZWlnaHQoKVxuICAgICAgLCBiYXJfd2lkdGggPSB0aGlzLmJhcl93aWR0aCgpXG5cbiAgICB2YXIga2V5cyA9IHRoaXMuX2RhdGEubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhba10gfSlcbiAgICAgICwgbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFt2XSB9KVxuICAgICAgLCBzYW1wbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gLXhbdl0gfSlcblxuICAgIHZhciB4c2FtcHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLHNhbXBtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB4c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLGtleXMubGVuZ3RoXSlcbiAgICAgICAgICAucmFuZ2UoWzAsa2V5cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoe1wid2lkdGhcIjpiYXJfd2lkdGgqMywgXCJoZWlnaHRcIjoga2V5cy5sZW5ndGgqaGVpZ2h0ICsgMTB9KTtcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ2JvdHRvbScpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4ga2V5c1tpXTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKGtleXMubGVuZ3RoKSk7XG5cbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aCArIGJhcl93aWR0aC8yKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGV4dC1hbmNob3I6IG1pZGRsZTtcIilcblxuICAgIFxuICAgIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoKjIpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuICAgIFxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTQpXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA4LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnIzM4OGUzYycpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNjYWxlKHhbdl0pIH0pXG5cbiAgICB2YXIgY2hhcnQyID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQyJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydDJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgc2FtcGJhcnMgPSBkM19zcGxhdChjaGFydDIsXCIuc2FtcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNhbXAtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtNClcbiAgICAgIC5hdHRyKHsneCc6ZnVuY3Rpb24oeCkgeyByZXR1cm4gYmFyX3dpZHRoIC0geHNhbXBzY2FsZSgteFt2XSl9LCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgOC41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJyNkMzJmMmYnKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzYW1wc2NhbGUoLXhbdl0pIH0pXG5cbiAgICB5X3hpcy5leGl0KCkucmVtb3ZlKClcblxuICAgIGNoYXJ0LmV4aXQoKS5yZW1vdmUoKVxuICAgIGNoYXJ0Mi5leGl0KCkucmVtb3ZlKClcblxuICAgIGJhcnMuZXhpdCgpLnJlbW92ZSgpXG4gICAgc2FtcGJhcnMuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgIFxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBfYmFyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IENvbXBCYXIodGFyZ2V0KVxufVxuXG4vLyBkYXRhIGZvcm1hdDogW3trZXksIG5vcm1hbGl6ZWRfZGlmZn0sIC4uLiBdXG5cbmNsYXNzIENvbXBCYXIge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcblxuICAgIHRoaXMuX2tleV9hY2Nlc3NvciA9IFwia2V5XCJcbiAgICB0aGlzLl9wb3BfdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcbiAgICB0aGlzLl9zYW1wX3ZhbHVlX2FjY2Vzc29yID0gXCJ2YWx1ZVwiXG5cbiAgICB0aGlzLl9iYXJfaGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9iYXJfd2lkdGggPSAzMDBcbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHBvcF92YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJwb3BfdmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cbiAgc2FtcF92YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzYW1wX3ZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG5cbiAgYmFyX2hlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfaGVpZ2h0XCIsdmFsKSB9XG4gIGJhcl93aWR0aCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfd2lkdGhcIix2YWwpIH1cblxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgdyA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLmNvbXAtd3JhcFwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7cmV0dXJuIDF9KVxuICAgICAgLmNsYXNzZWQoXCJjb21wLXdyYXBcIix0cnVlKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh3LFwiaDNcIixcImgzXCIpLnRleHQodGhpcy5fdGl0bGUpXG5cbiAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodyxcIi5zdmctd3JhcFwiLFwiZGl2XCIsdGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiAxIH0pXG4gICAgICAuY2xhc3NlZChcInN2Zy13cmFwXCIsdHJ1ZSlcblxuICAgIHZhciBrID0gdGhpcy5rZXlfYWNjZXNzb3IoKVxuICAgICAgLCBwID0gdGhpcy5wb3BfdmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBzID0gdGhpcy5zYW1wX3ZhbHVlX2FjY2Vzc29yKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5iYXJfaGVpZ2h0KClcbiAgICAgICwgYmFyX3dpZHRoID0gdGhpcy5iYXJfd2lkdGgoKVxuXG4gICAgdmFyIGtleXMgPSB0aGlzLl9kYXRhLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4W2tdIH0pXG4gICAgICAsIG1heCA9IGQzLm1heCh0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbcF0gfSlcbiAgICAgICwgc2FtcG1heCA9IGQzLm1heCh0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbc10gfSlcblxuICAgIHZhciB4c2FtcHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLHNhbXBtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB4c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLGtleXMubGVuZ3RoXSlcbiAgICAgICAgICAucmFuZ2UoWzAsa2V5cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoe1wid2lkdGhcIjpiYXJfd2lkdGgrYmFyX3dpZHRoLzIsIFwiaGVpZ2h0XCI6IGtleXMubGVuZ3RoKmhlaWdodCArIDEwfSk7XG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCdib3R0b20nKVxuICAgICAgLnNjYWxlKHhzY2FsZSlcblxuICAgIHZhciB5QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeUF4aXNcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLnNjYWxlKHlzY2FsZSlcbiAgICAgIC50aWNrU2l6ZSgyKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oZCxpKXsgcmV0dXJuIGtleXNbaV07IH0pXG4gICAgICAudGlja1ZhbHVlcyhkMy5yYW5nZShrZXlzLmxlbmd0aCkpO1xuXG4gICAgdmFyIHlfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieSBheGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChiYXJfd2lkdGgvMikgKyBcIiwxNSlcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3lheGlzJylcbiAgICAgIC5jYWxsKHlBeGlzKTtcblxuICAgIHlfeGlzLnNlbGVjdEFsbChcInRleHRcIilcblxuICAgIFxuICAgIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoLzIpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuICAgIFxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTIpXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA3LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnZ3JheScpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNjYWxlKHhbcF0pIH0pXG5cblxuICAgIHZhciBzYW1wYmFycyA9IGQzX3NwbGF0KGNoYXJ0LFwiLnNhbXAtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJzYW1wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTEwKVxuICAgICAgLmF0dHIoeyd4JzowLCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgMTEuNTsgfX0pXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCcjMDgxZDU4JylcbiAgICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4c2FtcHNjYWxlKHhbc10gfHwgMCkgfSlcblxuICAgIHlfeGlzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgY2hhcnQuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICBiYXJzLmV4aXQoKS5yZW1vdmUoKVxuICAgIHNhbXBiYXJzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwiaW1wb3J0IGRpZmZfYmFyIGZyb20gJy4uLy4uL2dlbmVyaWMvZGlmZl9iYXInXG5pbXBvcnQgY29tcF9iYXIgZnJvbSAnLi4vLi4vZ2VuZXJpYy9jb21wX2JhcidcblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdDYXRlZ29yeURpZmYodGFyZ2V0LGRhdGEpIHtcblxuICBkaWZmX2Jhcih0YXJnZXQpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAudGl0bGUoXCJDYXRlZ29yeSBpbmRleGluZyB2ZXJzdXMgY29tcFwiKVxuICAgIC52YWx1ZV9hY2Nlc3NvcihcIm5vcm1hbGl6ZWRfZGlmZlwiKVxuICAgIC5kcmF3KClcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJhd0NhdGVnb3J5KHRhcmdldCxkYXRhKSB7XG5cbiAgY29tcF9iYXIodGFyZ2V0KVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLnRpdGxlKFwiQ2F0ZWdvcmllcyB2aXNpdGVkIGZvciBmaWx0ZXJlZCB2ZXJzdXMgYWxsIHZpZXdzXCIpXG4gICAgLnBvcF92YWx1ZV9hY2Nlc3NvcihcInBvcFwiKVxuICAgIC5zYW1wX3ZhbHVlX2FjY2Vzc29yKFwic2FtcFwiKVxuICAgIC5kcmF3KClcblxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb21wX2J1YmJsZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBDb21wQnViYmxlKHRhcmdldClcbn1cblxuLy8gZGF0YSBmb3JtYXQ6IFt7a2V5LCBub3JtYWxpemVkX2RpZmZ9LCAuLi4gXVxuXG5jbGFzcyBDb21wQnViYmxlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICB0aGlzLl9rZXlfYWNjZXNzb3IgPSBcImtleVwiXG5cbiAgICB0aGlzLl9oZWlnaHQgPSAyMFxuICAgIHRoaXMuX3NwYWNlID0gMTRcbiAgICB0aGlzLl9taWRkbGUgPSAxODBcbiAgICB0aGlzLl9sZWdlbmRfd2lkdGggPSA4MFxuXG4gICAgdGhpcy5fYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG4gICAgdGhpcy5fcm93cyA9IFtdXG5cblxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgdmFsdWVfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cblxuICBoZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVpZ2h0XCIsdmFsKSB9XG4gIHNwYWNlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNwYWNlXCIsdmFsKSB9XG4gIG1pZGRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJtaWRkbGVcIix2YWwpIH1cbiAgYnVja2V0cyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJidWNrZXRzXCIsdmFsKSB9XG5cbiAgcm93cyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyb3dzXCIsdmFsKSB9XG4gIGFmdGVyKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFmdGVyXCIsdmFsKSB9XG5cblxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuICBidWlsZFNjYWxlcygpIHtcblxuICAgIHZhciByb3dzID0gdGhpcy5yb3dzKClcbiAgICAgICwgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpXG5cbiAgICB0aGlzLl95c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbMCxyb3dzLmxlbmd0aF0pXG4gICAgICAucmFuZ2UoWzAscm93cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB0aGlzLl94c2NhbGUgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cylcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLChoZWlnaHQrc3BhY2UpKSk7XG5cbiAgICB0aGlzLl94c2NhbGVyZXZlcnNlID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMucmV2ZXJzZSgpKVxuICAgICAgLnJhbmdlKGQzLnJhbmdlKDAsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSksKGhlaWdodCtzcGFjZSkpKTtcblxuICAgIHRoaXMuX3JzY2FsZSA9IGQzLnNjYWxlLnBvdygpXG4gICAgICAuZXhwb25lbnQoMC41KVxuICAgICAgLmRvbWFpbihbMCwxXSlcbiAgICAgIC5yYW5nZShbLjM1LDFdKVxuICAgIFxuICAgIHRoaXMuX29zY2FsZSA9IGQzLnNjYWxlLnF1YW50aXplKClcbiAgICAgIC5kb21haW4oWy0xLDFdKVxuICAgICAgLnJhbmdlKFsnI2Y3ZmJmZicsJyNkZWViZjcnLCcjYzZkYmVmJywnIzllY2FlMScsJyM2YmFlZDYnLCcjNDI5MmM2JywnIzIxNzFiNScsJyMwODUxOWMnLCcjMDgzMDZiJ10pXG4gICAgXG4gIH1cblxuICBkcmF3TGVnZW5kKCkge1xuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNcbiAgICAgICwgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpLCBtaWRkbGUgPSB0aGlzLm1pZGRsZSgpLCBsZWdlbmR0dyA9IHRoaXMuX2xlZ2VuZF93aWR0aFxuICAgICAgLCByc2NhbGUgPSB0aGlzLl9yc2NhbGUsIG9zY2FsZSA9IHRoaXMuX29zY2FsZTtcblxuICAgIHZhciBsZWdlbmQgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5sZWdlbmQnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlZ2VuZFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSoyK21pZGRsZS0zMTApICsgXCIsLTEzMClcIilcblxuICAgIHZhciBzaXplID0gZDNfdXBkYXRlYWJsZShsZWdlbmQsJ2cuc2l6ZScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwic2l6ZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArIChsZWdlbmR0dysxMCkgKyBcIiwwKVwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlIGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dylcbiAgICAgIC5odG1sKFwibW9yZSBhY3Rpdml0eVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpIFxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZS1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZS1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHctMTApXG4gICAgICAuaHRtbChcIiYjOTY2NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKSBcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG5cblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzc1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuaHRtbChcImxlc3MgYWN0aXZpdHlcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5sZXNzLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZXNzLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLChoZWlnaHQrNCkqNStsZWdlbmR0dysxMClcbiAgICAgIC5odG1sKFwiJiM5NjU0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIikgXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cbiAgICBkM19zcGxhdChzaXplLFwiY2lyY2xlXCIsXCJjaXJjbGVcIixbMSwuNiwuMywuMSwwXSlcbiAgICAgIC5hdHRyKFwiclwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIChoZWlnaHQtMikvMipyc2NhbGUoeCkgfSlcbiAgICAgIC5hdHRyKCdjeCcsIGZ1bmN0aW9uKGQsaSkgeyByZXR1cm4gKGhlaWdodCs0KSppK2hlaWdodC8yfSlcbiAgICAgIC5hdHRyKCdzdHJva2UnLCAnZ3JleScpXG4gICAgICAuYXR0cignZmlsbCcsICdub25lJylcblxuXG4gICAgXG5cblxuICAgIHZhciBzaXplID0gZDNfdXBkYXRlYWJsZShsZWdlbmQsJ2cuaW1wb3J0YW5jZScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiaW1wb3J0YW5jZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIisgKGxlZ2VuZHR3KzEwKSArXCIsMjUpXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lm1vcmVcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1vcmUgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsLWxlZ2VuZHR3KVxuICAgICAgLmh0bWwoXCJtb3JlIGltcG9ydGFudFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dy0xMClcbiAgICAgIC5odG1sKFwiJiM5NjY0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIikgXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzc1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuaHRtbChcImxlc3MgaW1wb3J0YW50XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3MtYXJyb3dcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MtYXJyb3cgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KzEwKVxuICAgICAgLmh0bWwoXCImIzk2NTQ7XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG4gICAgZDNfc3BsYXQoc2l6ZSxcImNpcmNsZVwiLFwiY2lyY2xlXCIsWzEsLjc1LC41LC4yNSwwXSlcbiAgICAgIC5hdHRyKFwiclwiLGhlaWdodC8yLTIpXG4gICAgICAuYXR0cihcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBvc2NhbGUoeCkgfSlcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHJzY2FsZSh4LzIgKyAuMikgfSlcbiAgICAgIC5hdHRyKCdjeCcsIGZ1bmN0aW9uKGQsaSkgeyByZXR1cm4gKGhlaWdodCs0KSppK2hlaWdodC8yIH0pXG4gXG4gIH1cblxuICBkcmF3QXhlcygpIHtcbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKSwgbWlkZGxlID0gdGhpcy5taWRkbGUoKSwgbGVnZW5kdHcgPSB0aGlzLl9sZWdlbmRfd2lkdGhcbiAgICAgICwgcnNjYWxlID0gdGhpcy5fcnNjYWxlLCBvc2NhbGUgPSB0aGlzLl9vc2NhbGUgXG4gICAgICAsIHhzY2FsZSA9IHRoaXMuX3hzY2FsZSwgeXNjYWxlID0gdGhpcy5feXNjYWxlXG4gICAgICAsIHhzY2FsZXJldmVyc2UgPSB0aGlzLl94c2NhbGVyZXZlcnNlXG4gICAgICAsIHJvd3MgPSB0aGlzLl9yb3dzXG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCd0b3AnKVxuICAgICAgLnNjYWxlKHhzY2FsZXJldmVyc2UpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbih4KSB7IFxuICAgICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgICBpZiAoeCA8IDM2MDApIHJldHVybiB4LzYwICsgXCIgbWluc1wiIFxuXG4gICAgICAgIGlmICh4ID09IDg2NDAwKSByZXR1cm4gXCIxIGRheVwiXG4gICAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICAgIHJldHVybiB4LzM2MDAgKyBcIiBob3Vyc1wiXG4gICAgICB9KVxuXG4gICAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueC5iZWZvcmUnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInggYXhpcyBiZWZvcmVcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGhlaWdodCArIHNwYWNlKSsgXCIsLTQpXCIpXG4gICAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgICAuY2FsbCh4QXhpcyk7XG5cbiAgICAgICAgICBcbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInlcIiwgLTgpXG4gICAgICAuYXR0cihcInhcIiwgLTgpXG4gICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKDQ1KVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFja1wiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrOyBkaXNwbGF5OmluaGVyaXRcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoeF94aXMsXCJ0ZXh0LnRpdGxlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgICAgLmF0dHIoXCJ4XCIsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkvMiAtIGhlaWdodCtzcGFjZSApXG4gICAgICAuYXR0cihcInlcIiwtNTMpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLHVuZGVmaW5lZClcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLCBcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXG4gICAgICAudGV4dChcImJlZm9yZSBhcnJpdmluZ1wiKVxuXG5cblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgaWYgKHggPT0gMzYwMCkgcmV0dXJuIFwiMSBob3VyXCJcbiAgICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgICBpZiAoeCA9PSA4NjQwMCkgcmV0dXJuIFwiMSBkYXlcIlxuICAgICAgICBpZiAoeCA+IDg2NDAwKSByZXR1cm4geC84NjQwMCArIFwiIGRheXNcIiBcblxuICAgICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgICAgfSlcblxuICAgIHZhciB4X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnguYWZ0ZXInLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInggYXhpcyBhZnRlclwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkrbWlkZGxlKSArIFwiLDApXCIpXG4gICAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgICAuY2FsbCh4QXhpcyk7XG4gICAgXG4gICAgeF94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ5XCIsIC04KVxuICAgICAgLmF0dHIoXCJ4XCIsIDgpXG4gICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKC00NSlcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwic3RhcnRcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFja1wiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrOyBkaXNwbGF5OmluaGVyaXRcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoeF94aXMsXCJ0ZXh0LnRpdGxlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgICAgLmF0dHIoXCJ4XCIsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkvMiAgKVxuICAgICAgLmF0dHIoXCJ5XCIsLTUzKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIix1bmRlZmluZWQpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgLnRleHQoXCJhZnRlciBsZWF2aW5nXCIpXG5cblxuICAgIHZhciB5QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeUF4aXNcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLnNjYWxlKHlzY2FsZSlcbiAgICAgIC50aWNrU2l6ZSgyKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHJvd3NbaV0ua2V5OyB9KVxuICAgICAgLnRpY2tWYWx1ZXMoZDMucmFuZ2Uocm93cy5sZW5ndGgpKTtcblxuXG4gICAgXG4gICAgdmFyIHlfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieSBheGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSswKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuXG5cbiAgICB5X3hpc1xuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwibGluZVwiKVxuICAgICAgLmF0dHIoXCJ4MlwiLDE4KVxuICAgICAgLmF0dHIoXCJ4MVwiLDIyKVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLFwiMFwiKVxuICAgICAgLnJlbW92ZSgpXG5cblxuICAgIHlfeGlzLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAgIC5hdHRyKFwieDJcIiwxOClcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMTgsMClcIikgXG4gICAgICAvLy5zdHlsZShcInN0cm9rZVwiLFwiYmxhY2tcIilcblxuXG5cbiAgICAgIC8vLnJlbW92ZSgpXG5cbiAgICBcbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJ0ZXh0LWFuY2hvcjogbWlkZGxlOyBmb250LXdlaWdodDpib2xkOyBmaWxsOiAjMzMzXCIpXG4gICAgICAuYXR0cihcInhcIixtaWRkbGUvMilcblxuXG5cblxuICB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBidWNrZXRzID0gdGhpcy5idWNrZXRzKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5oZWlnaHQoKSwgc3BhY2UgPSB0aGlzLnNwYWNlKCksIG1pZGRsZSA9IHRoaXMubWlkZGxlKCksIGxlZ2VuZHR3ID0gdGhpcy5fbGVnZW5kX3dpZHRoXG4gICAgICAsIHJvd3MgPSB0aGlzLnJvd3MoKVxuXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi01cHhcIilcbiAgICAgIC5hdHRyKHsnd2lkdGgnOmJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpKjIrbWlkZGxlLCdoZWlnaHQnOnJvd3MubGVuZ3RoKmhlaWdodCArIDE2NX0pXG4gICAgICAuYXR0cihcInhtbG5zXCIsIFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIilcblxuICAgIHRoaXMuX3N2ZyA9IHN2Z1xuXG4gICAgdGhpcy5fY2FudmFzID0gZDNfdXBkYXRlYWJsZShzdmcsXCIuY2FudmFzXCIsXCJnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMTQwKVwiKVxuXG5cblxuICAgIHRoaXMuYnVpbGRTY2FsZXMoKVxuICAgIHRoaXMuZHJhd0xlZ2VuZCgpXG4gICAgdGhpcy5kcmF3QXhlcygpXG5cbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzXG4gICAgICAsIHJzY2FsZSA9IHRoaXMuX3JzY2FsZSwgb3NjYWxlID0gdGhpcy5fb3NjYWxlIFxuICAgICAgLCB4c2NhbGUgPSB0aGlzLl94c2NhbGUsIHlzY2FsZSA9IHRoaXMuX3lzY2FsZVxuICAgICAgLCB4c2NhbGVyZXZlcnNlID0gdGhpcy5feHNjYWxlcmV2ZXJzZVxuICAgICAgLCByb3dzID0gdGhpcy5yb3dzKClcblxuXG4gICAgdmFyIGNoYXJ0X2JlZm9yZSA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0LWJlZm9yZScsJ2cnLHRoaXMucm93cygpLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnQtYmVmb3JlXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgcm93cyA9IGQzX3NwbGF0KGNoYXJ0X2JlZm9yZSxcIi5yb3dcIixcImdcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJyb3dcIilcbiAgICAgIC5hdHRyKHsndHJhbnNmb3JtJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gXCJ0cmFuc2xhdGUoMCxcIiArICh5c2NhbGUoaSkgKyA3LjUpICsgXCIpXCI7IH0gfSlcbiAgICAgIC5hdHRyKHsnbGFiZWwnOmZ1bmN0aW9uKGQsaSl7IHJldHVybiBkLmtleTsgfSB9KVxuXG4gICAgcm93cy5leGl0KCkucmVtb3ZlKClcblxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQocm93cyxcIi5wb3AtYmFyXCIsXCJjaXJjbGVcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlcyB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2N5JywoaGVpZ2h0LTIpLzIpXG4gICAgICAuYXR0cih7J2N4JzpmdW5jdGlvbihkLGkpIHsgcmV0dXJuIC14c2NhbGUoZC5rZXkpfX0pXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIixcIi44XCIpXG4gICAgICAuYXR0cihcInJcIixmdW5jdGlvbih4KSB7IHJldHVybiAoaGVpZ2h0KS8yICogcnNjYWxlKHgubm9ybV90aW1lKSB9KSBcbiAgICAgIC5zdHlsZShcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBvc2NhbGUoeC5wZXJjZW50X2RpZmYpIH0pXG5cbiAgICB2YXIgY2hhcnRfYWZ0ZXIgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydC1hZnRlcicsJ2cnLHRoaXMuX2FmdGVyLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnQtYWZ0ZXJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpK21pZGRsZSkgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG5cblxuICAgIHZhciByb3dzID0gZDNfc3BsYXQoY2hhcnRfYWZ0ZXIsXCIucm93XCIsXCJnXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicm93XCIpXG4gICAgICAuYXR0cih7J3RyYW5zZm9ybSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIFwidHJhbnNsYXRlKDAsXCIgKyAoeXNjYWxlKGkpICsgNy41KSArIFwiKVwiOyB9IH0pXG4gICAgICAuYXR0cih7J2xhYmVsJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gZC5rZXk7IH0gfSlcblxuICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYmFycyA9IGQzX3NwbGF0KHJvd3MsXCIucG9wLWJhclwiLFwiY2lyY2xlXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBvcC1iYXJcIilcbiAgICAgIC5hdHRyKCdjeScsKGhlaWdodC0yKS8yKVxuICAgICAgLmF0dHIoeydjeCc6ZnVuY3Rpb24oZCxpKSB7IHJldHVybiB4c2NhbGUoZC5rZXkpfX0pXG4gICAgICAuYXR0cihcInJcIixmdW5jdGlvbih4KSB7IHJldHVybiAoaGVpZ2h0LTIpLzIgKiByc2NhbGUoeC5ub3JtX3RpbWUpIH0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gb3NjYWxlKHgucGVyY2VudF9kaWZmKSB9KVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsXCIuOFwiKVxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge25vb3AsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN0cmVhbV9wbG90KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN0cmVhbVBsb3QodGFyZ2V0KVxufVxuXG5mdW5jdGlvbiBkcmF3QXhpcyh0YXJnZXQsc2NhbGUsdGV4dCx3aWR0aCkge1xuICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICB4QXhpc1xuICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgLnNjYWxlKHNjYWxlKVxuICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgIH0pXG5cbiAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsJ2cueC5iZWZvcmUnLCdnJylcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYmVmb3JlXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwtNSlcIilcbiAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgICAgIFxuICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIC0yNSlcbiAgICAuYXR0cihcInhcIiwgMTUpXG4gICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoNDUpXCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcblxuICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrXCIpXG5cbiAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgZDNfdXBkYXRlYWJsZSh4X3hpcyxcInRleHQudGl0bGVcIixcInRleHRcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgIC5hdHRyKFwieFwiLHdpZHRoLzIpXG4gICAgLmF0dHIoXCJ5XCIsLTQ2KVxuICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsdW5kZWZpbmVkKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAudGV4dCh0ZXh0ICsgXCIgXCIpXG5cbiAgcmV0dXJuIHhfeGlzXG5cbn1cblxuXG5jbGFzcyBTdHJlYW1QbG90IHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICAgIHRoaXMuX2J1Y2tldHMgPSBbMCwxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG5cbiAgICB0aGlzLl93aWR0aCA9IDM3MFxuICAgIHRoaXMuX2hlaWdodCA9IDI1MFxuICAgIHRoaXMuX21pZGRsZSA9IDE4MFxuICAgIHRoaXMuX2NvbG9yID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAucmFuZ2UoXG5bJyM5OTknLCcjYWFhJywnI2JiYicsJyNjY2MnLCcjZGRkJywnI2RlZWJmNycsJyNjNmRiZWYnLCcjOWVjYWUxJywnIzZiYWVkNicsJyM0MjkyYzYnLCcjMjE3MWI1JywncmdiYSgzMywgMTEzLCAxODEsLjkpJywncmdiYSg4LCA4MSwgMTU2LC45MSknLCcjMDg1MTljJywncmdiYSg4LCA0OCwgMTA3LC45KScsJyMwODMwNmInXS5yZXZlcnNlKCkpXG5cbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGhlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cbiAgd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwid2lkdGhcIix2YWwpIH1cbiAgbWlkZGxlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm1pZGRsZVwiLHZhbCkgfVxuICBza2lwX21pZGRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJza2lwX21pZGRsZVwiLHZhbCkgfVxuXG5cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgICAsIG9yZGVyID0gZGF0YS5vcmRlclxuICAgICAgLCBidWNrZXRzID0gdGhpcy5fYnVja2V0c1xuICAgICAgLCBiZWZvcmVfc3RhY2tlZCA9IGRhdGEuYmVmb3JlX3N0YWNrZWRcbiAgICAgICwgYWZ0ZXJfc3RhY2tlZCA9IGRhdGEuYWZ0ZXJfc3RhY2tlZFxuICAgICAgLCBoZWlnaHQgPSB0aGlzLl9oZWlnaHRcbiAgICAgICwgd2lkdGggPSB0aGlzLl93aWR0aFxuICAgICAgLCB0YXJnZXQgPSB0aGlzLl90YXJnZXRcbiAgICAgICwgY29sb3IgPSB0aGlzLl9jb2xvclxuICAgICAgLCBzZWxmID0gdGhpc1xuXG4gICAgY29sb3IuZG9tYWluKG9yZGVyKVxuXG4gICAgdmFyIHkgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLnJhbmdlKFtoZWlnaHQsMF0pXG4gICAgICAuZG9tYWluKFswLGQzLm1heChiZWZvcmVfc3RhY2tlZCwgZnVuY3Rpb24obGF5ZXIpIHsgcmV0dXJuIGQzLm1heChsYXllcixmdW5jdGlvbihkKSB7cmV0dXJuIGQueTAgKyBkLnkgfSl9KV0pXG4gIFxuICAgIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCx3aWR0aCsxMCx3aWR0aC8oYnVja2V0cy5sZW5ndGgtMSkpKVxuICBcbiAgICB2YXIgeHJldmVyc2UgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKSlcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLHdpZHRoKzEwLHdpZHRoLyhidWNrZXRzLmxlbmd0aC0xKSkpXG5cbiAgICB0aGlzLl9iZWZvcmVfc2NhbGUgPSB4cmV2ZXJzZVxuICAgIHRoaXMuX2FmdGVyX3NjYWxlID0geFxuICBcbiAgICB2YXIgYmFyZWEgPSBkMy5zdmcuYXJlYSgpXG4gICAgICAuaW50ZXJwb2xhdGUoXCJ6ZXJvXCIpXG4gICAgICAueChmdW5jdGlvbihkKSB7IHJldHVybiB4cmV2ZXJzZShkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICAgIHZhciBhYXJlYSA9IGQzLnN2Zy5hcmVhKClcbiAgICAgIC5pbnRlcnBvbGF0ZShcImxpbmVhclwiKVxuICAgICAgLngoZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICBcbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJzdmdcIixcInN2Z1wiKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCoyK3RoaXMuX21pZGRsZSlcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCArIDEwMCk7XG5cbiAgICB0aGlzLl9zdmcgPSBzdmdcbiAgXG4gICAgdmFyIGJlZm9yZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmJlZm9yZS1jYW52YXNcIixcImdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImJlZm9yZS1jYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKC0xLDYwKVwiKVxuXG4gICAgZnVuY3Rpb24gaG92ZXJDYXRlZ29yeShjYXQsdGltZSkge1xuICAgICAgaWYgKGNhdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgc2VsZi5vbihcImNhdGVnb3J5LmhvdmVyXCIpKGZhbHNlKVxuICAgICAgfVxuICAgICAgYXBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLFwiLjVcIilcbiAgICAgIGJwYXRocy5zdHlsZShcIm9wYWNpdHlcIixcIi41XCIpXG4gICAgICBhcGF0aHMuZmlsdGVyKHkgPT4geVswXS5rZXkgPT0gY2F0KS5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICBicGF0aHMuZmlsdGVyKHkgPT4geVswXS5rZXkgPT0gY2F0KS5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuXG4gICAgICBkM191cGRhdGVhYmxlKG1pZGRsZSxcInRleHRcIixcInRleHRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIi42NVwiKVxuICAgICAgICAudGV4dChjYXQpXG5cbiAgICAgIHZhciBtd3JhcCA9IGQzX3VwZGF0ZWFibGUobWlkZGxlLFwiZ1wiLFwiZ1wiKVxuXG4gICAgICBzZWxmLm9uKFwiY2F0ZWdvcnkuaG92ZXJcIikuYmluZChtd3JhcC5ub2RlKCkpKGNhdCx0aW1lKVxuICAgIH1cbiAgXG4gICAgdmFyIGIgPSBkM191cGRhdGVhYmxlKGJlZm9yZSxcImdcIixcImdcIilcblxuICAgIGZ1bmN0aW9uIG1PdmVyKHgpIHtcbiAgICAgIGhvdmVyQ2F0ZWdvcnkuYmluZCh0aGlzKSh4WzBdLmtleSlcbiAgICB9XG4gICAgZnVuY3Rpb24gbU91dCh4KSB7XG4gICAgICBob3ZlckNhdGVnb3J5LmJpbmQodGhpcykoZmFsc2UpXG4gICAgICBhcGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICB9XG4gICAgZnVuY3Rpb24gY2xpY2soeCkge1xuICAgICAgICB2YXIgYm9vbCA9IGFwYXRocy5vbihcIm1vdXNlb3ZlclwiKSA9PSBtT3ZlclxuXG4gICAgICAgIGFwYXRocy5vbihcIm1vdXNlb3ZlclwiLGJvb2wgPyBub29wOiBtT3ZlcilcbiAgICAgICAgYXBhdGhzLm9uKFwibW91c2VvdXRcIixib29sID8gbm9vcDogbU91dClcbiAgICAgICAgYnBhdGhzLm9uKFwibW91c2VvdmVyXCIsYm9vbCA/IG5vb3A6IG1PdmVyKVxuICAgICAgICBicGF0aHMub24oXCJtb3VzZW91dFwiLGJvb2wgPyBub29wOiBtT3V0KVxuXG4gICAgfVxuXG4gICAgdmFyIGJwYXRocyA9IGQzX3NwbGF0KGIsXCJwYXRoXCIsXCJwYXRoXCIsIGJlZm9yZV9zdGFja2VkLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLmF0dHIoXCJkXCIsIGJhcmVhKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gY29sb3IoeFswXS5rZXkpOyB9KVxuICAgICAgLm9uKFwibW91c2VvdmVyXCIsbU92ZXIpXG4gICAgICAub24oXCJtb3VzZW91dFwiLG1PdXQpXG4gICAgICAub24oXCJjbGlja1wiLGNsaWNrKVxuXG4gICAgYnBhdGhzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIGJyZWN0ID0gZDNfc3BsYXQoYixcInJlY3RcIixcInJlY3RcIixidWNrZXRzLnNsaWNlKCkucmV2ZXJzZSgpLCh4LGkpID0+IGkpXG4gICAgICAuYXR0cihcInhcIix6ID0+IHhyZXZlcnNlKHopKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLDEpXG4gICAgICAuYXR0cihcImhlaWdodFwiLGhlaWdodClcbiAgICAgIC5hdHRyKFwieVwiLDApXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIixcIjBcIilcblxuXG5cbiAgICAgIFxuXG4gICAgdmFyIG1pZGRsZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLm1pZGRsZS1jYW52YXNcIixcImdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1pZGRsZS1jYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoXCIgKyAod2lkdGggKyB0aGlzLl9taWRkbGUvMikgKyBcIiw2MClcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIix0aGlzLl9za2lwX21pZGRsZSA/IFwibm9uZVwiOiBcImluaGVyaXRcIilcbiAgXG4gIFxuICBcbiAgICB2YXIgYWZ0ZXIgPSBkM191cGRhdGVhYmxlKHN2ZyxcIi5hZnRlci1jYW52YXNcIixcImdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImFmdGVyLWNhbnZhc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAod2lkdGggKyB0aGlzLl9taWRkbGUpICsgXCIsNjApXCIpXG5cbiAgICB2YXIgYSA9IGQzX3VwZGF0ZWFibGUoYWZ0ZXIsXCJnXCIsXCJnXCIpXG5cbiAgICBcbiAgXG4gICAgdmFyIGFwYXRocyA9IGQzX3NwbGF0KGEsXCJwYXRoXCIsXCJwYXRoXCIsYWZ0ZXJfc3RhY2tlZCxmdW5jdGlvbih4LGkpIHsgcmV0dXJuIHhbMF0ua2V5fSlcbiAgICAgIC5hdHRyKFwiZFwiLCBhYXJlYSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbih4LGkpIHsgcmV0dXJuIGNvbG9yKHhbMF0ua2V5KTsgfSlcbiAgICAgIC5vbihcIm1vdXNlb3ZlclwiLG1PdmVyKVxuICAgICAgLm9uKFwibW91c2VvdXRcIixtT3V0KVxuICAgICAgLm9uKFwiY2xpY2tcIixjbGljaylcblxuXG4gICAgYXBhdGhzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIF94X3hpcyA9IGRyYXdBeGlzKGJlZm9yZSx4cmV2ZXJzZSxcImJlZm9yZSBhcnJpdmluZ1wiLHdpZHRoKVxuXG4gICAgX3hfeGlzLnNlbGVjdEFsbChcInRleHRcIikuZmlsdGVyKGZ1bmN0aW9uKHkpeyByZXR1cm4geSA9PSAwIH0pLnJlbW92ZSgpXG5cbiAgICB2YXIgX3hfeGlzID0gZHJhd0F4aXMoYWZ0ZXIseCxcImFmdGVyIGxlYXZpbmdcIix3aWR0aClcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0Om5vdCgudGl0bGUpXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSgtNDUpXCIpXG4gICAgICAuYXR0cihcInhcIiwyMClcbiAgICAgIC5hdHRyKFwieVwiLC0yNSlcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpLmZpbHRlcihmdW5jdGlvbih5KXsgcmV0dXJuIHkgPT0gMCB9KS5yZW1vdmUoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIG9uKGFjdGlvbixmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuaW1wb3J0IHtkM19jbGFzcywgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5cbmltcG9ydCBjb21wX2J1YmJsZSBmcm9tICcuLi8uLi9nZW5lcmljL2NvbXBfYnViYmxlJ1xuaW1wb3J0IHN0cmVhbV9wbG90IGZyb20gJy4uLy4uL2dlbmVyaWMvc3RyZWFtX3Bsb3QnXG5cbmZ1bmN0aW9uIGJ1aWxkU3RyZWFtRGF0YShkYXRhLGJ1Y2tldHMpIHtcblxuICB2YXIgdW5pdHNfaW5fYnVja2V0ID0gYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7IHJldHVybiB4IC0gKHhbaS0xXXx8IDApIH0pXG5cbiAgdmFyIHN0YWNrYWJsZSA9IGRhdGEubWFwKGZ1bmN0aW9uKGQpIHtcbiAgICB2YXIgdmFsdWVtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy52YWx1ZXM7IHJldHVybiBwIH0se30pXG4gICAgdmFyIHBlcmNtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy5wZXJjZW50OyByZXR1cm4gcCB9LHt9KVxuXG4gICAgdmFyIHZtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy5ub3JtX2NhdDsgcmV0dXJuIHAgfSx7fSlcblxuXG4gICAgdmFyIG5vcm1hbGl6ZWRfdmFsdWVzID0gYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICBpZiAoeCA9PSAwKSByZXR1cm4ge2tleTogZC5rZXksIHg6IHBhcnNlSW50KHgpLCB5OiAodm1hcFtcIjYwMFwiXXx8MCksIHZhbHVlczogKHZhbHVlbWFwW1wiNjAwXCJdfHwwKSwgcGVyY2VudDogKHBlcmNtYXBbXCI2MDBcIl18fDApfVxuICAgICAgcmV0dXJuIHsga2V5OiBkLmtleSwgeDogcGFyc2VJbnQoeCksIHk6ICh2bWFwW3hdIHx8IDApLCB2YWx1ZXM6ICh2YWx1ZW1hcFt4XSB8fCAwKSwgcGVyY2VudDogKHBlcmNtYXBbeF0gfHwgMCkgfVxuICAgIH0pXG5cblxuICAgIHJldHVybiBub3JtYWxpemVkX3ZhbHVlc1xuICAgIC8vcmV0dXJuIGUyLmNvbmNhdChub3JtYWxpemVkX3ZhbHVlcykvLy5jb25jYXQoZXh0cmEpXG4gIH0pXG5cblxuICBzdGFja2FibGUgPSBzdGFja2FibGUuc29ydCgocCxjKSA9PiBwWzBdLnkgLSBjWzBdLnkpLnJldmVyc2UoKS5zbGljZSgwLDEyKVxuXG4gIHJldHVybiBzdGFja2FibGVcblxufVxuXG5mdW5jdGlvbiBzdHJlYW1EYXRhKGJlZm9yZSxhZnRlcixidWNrZXRzKSB7XG4gIHZhciBzdGFja2FibGUgPSBidWlsZFN0cmVhbURhdGEoYmVmb3JlLGJ1Y2tldHMpXG4gIHZhciBzdGFjayA9IGQzLmxheW91dC5zdGFjaygpLm9mZnNldChcIndpZ2dsZVwiKS5vcmRlcihcInJldmVyc2VcIilcbiAgdmFyIGJlZm9yZV9zdGFja2VkID0gc3RhY2soc3RhY2thYmxlKVxuXG4gIHZhciBvcmRlciA9IGJlZm9yZV9zdGFja2VkLm1hcChpdGVtID0+IGl0ZW1bMF0ua2V5KVxuXG4gIHZhciBzdGFja2FibGUgPSBidWlsZFN0cmVhbURhdGEoYWZ0ZXIsYnVja2V0cylcbiAgICAuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIG9yZGVyLmluZGV4T2YoY1swXS5rZXkpIC0gb3JkZXIuaW5kZXhPZihwWzBdLmtleSkgfSlcblxuICBzdGFja2FibGUgPSBzdGFja2FibGUuZmlsdGVyKHggPT4gb3JkZXIuaW5kZXhPZih4WzBdLmtleSkgPT0gLTEpLmNvbmNhdChzdGFja2FibGUuZmlsdGVyKHggPT4gb3JkZXIuaW5kZXhPZih4WzBdLmtleSkgPiAtMSkpXG5cbiAgdmFyIHN0YWNrID0gZDMubGF5b3V0LnN0YWNrKCkub2Zmc2V0KFwid2lnZ2xlXCIpLm9yZGVyKFwiZGVmYXVsdFwiKVxuICB2YXIgYWZ0ZXJfc3RhY2tlZCA9IHN0YWNrKHN0YWNrYWJsZSlcblxuICByZXR1cm4ge1xuICAgICAgb3JkZXI6IG9yZGVyXG4gICAgLCBiZWZvcmVfc3RhY2tlZDogYmVmb3JlX3N0YWNrZWRcbiAgICAsIGFmdGVyX3N0YWNrZWQ6IGFmdGVyX3N0YWNrZWRcbiAgfVxuXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdTdHJlYW1Ta2lubnkodGFyZ2V0LGJlZm9yZSxhZnRlcixmaWx0ZXIpIHtcblxuICBmdW5jdGlvbiBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxhY2Nlc3Nvcikge1xuICAgIHZhciBidm9sdW1lID0ge30sIGF2b2x1bWUgPSB7fVxuICBcbiAgICB0cnkgeyB2YXIgYnZvbHVtZSA9IGJbMF0ucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2MueF0gPSBhY2Nlc3NvcihjKTsgcmV0dXJuIHAgfSx7fSkgfSBjYXRjaChlKSB7fVxuICAgIHRyeSB7IHZhciBhdm9sdW1lID0gYVswXS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy54XSA9IGFjY2Vzc29yKGMpOyByZXR1cm4gcCB9LHt9KSB9IGNhdGNoKGUpIHt9XG4gIFxuICAgIHZhciB2b2x1bWUgPSBidWNrZXRzLnNsaWNlKCkucmV2ZXJzZSgpLm1hcCh4ID0+IGJ2b2x1bWVbeF0gfHwgMCkuY29uY2F0KGJ1Y2tldHMubWFwKHggPT4gYXZvbHVtZVt4XSB8fCAwKSlcbiAgXG4gICAgcmV0dXJuIHZvbHVtZVxuICB9XG5cbiAgdmFyIGJ1Y2tldHMgPSBbMCwxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG5cbiAgdmFyIGRhdGEgPSBzdHJlYW1EYXRhKGJlZm9yZSxhZnRlcixidWNrZXRzKVxuICAgICwgYmVmb3JlX3N0YWNrZWQgPSBkYXRhLmJlZm9yZV9zdGFja2VkXG4gICAgLCBhZnRlcl9zdGFja2VkID0gZGF0YS5hZnRlcl9zdGFja2VkXG5cbiAgdmFyIGJlZm9yZSA9IGQzX2NsYXNzKHRhcmdldCxcImJlZm9yZS1zdHJlYW1cIilcblxuXG4gIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSlcblxuXG4gIHZhciBzdHJlYW0gPSBzdHJlYW1fcGxvdChpbm5lcilcbiAgICAud2lkdGgoMzQxKVxuICAgIC5taWRkbGUoMClcbiAgICAuc2tpcF9taWRkbGUodHJ1ZSlcbiAgICAuZGF0YShkYXRhKVxuICAgIC5vbihcImNhdGVnb3J5LmhvdmVyXCIsZnVuY3Rpb24oeCx0aW1lKSB7XG4gICAgICBmaWx0ZXIoeClcbiAgICAgIGlmICh4ID09PSBmYWxzZSkge1xuICAgICAgICBkMy5zZWxlY3QoXCIuZGV0YWlscy13cmFwXCIpLmh0bWwoXCJcIilcbiAgICAgICAgcmV0dXJuIFxuICAgICAgfVxuICAgICAgdmFyIGIgPSBkYXRhLmJlZm9yZV9zdGFja2VkLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IHgpXG4gICAgICB2YXIgYSA9IGRhdGEuYWZ0ZXJfc3RhY2tlZC5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSB4KVxuXG4gICAgICB2YXIgdm9sdW1lID0gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsZnVuY3Rpb24oYykgeyByZXR1cm4gYy52YWx1ZXMubGVuZ3RoIH0pXG4gICAgICAgICwgcGVyY2VudCA9IGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMucGVyY2VudCB9KVxuICAgICAgICAsIGltcG9ydGFuY2UgPSBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxmdW5jdGlvbihjKSB7IHJldHVybiBjLnkgfSlcblxuXG4gICAgICB2YXIgd3JhcCA9IGQzLnNlbGVjdChcIi5kZXRhaWxzLXdyYXBcIilcbiAgICAgICAgLCB0aXRsZSA9IGQzX3VwZGF0ZWFibGUod3JhcCxcInRleHQuY2F0LXRpdGxlXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAudGV4dCh4KVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2F0LXRpdGxlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsMTI1KVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsMTApXG4gICAgICAgICwgdndyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudm9sdW1lXCIsXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ2b2x1bWVcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMTUsMzApXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh2d3JhcCxcInRleHRcIixcInRleHRcIikudGV4dChcIlZpc2l0czogXCIgKyBkMy5zdW0odm9sdW1lKSApXG4gICAgICAgIC5hdHRyKFwic3R5bGVcIixcInRpdGxlXCIpXG5cbiAgICAgIHJldHVyblxuICAgIH0pXG4gICAgLmRyYXcoKVxuXG5cbiAgdmFyIGJlZm9yZV9hZ2cgPSBiZWZvcmVfc3RhY2tlZC5yZWR1Y2UoKG8seCkgPT4geyByZXR1cm4geC5yZWR1Y2UoKHAsYykgPT4geyBwW2MueF0gPSAocFtjLnhdIHx8IDApICsgYy55OyByZXR1cm4gcH0sbykgfSx7fSlcbiAgICAsIGFmdGVyX2FnZyA9IGFmdGVyX3N0YWNrZWQucmVkdWNlKChvLHgpID0+IHsgcmV0dXJuIHgucmVkdWNlKChwLGMpID0+IHsgcFtjLnhdID0gKHBbYy54XSB8fCAwKSArIGMueTsgcmV0dXJuIHB9LG8pIH0se30pXG5cblxuICB2YXIgbG9jYWxfYmVmb3JlID0gT2JqZWN0LmtleXMoYmVmb3JlX2FnZykucmVkdWNlKChtaW5hcnIsYykgPT4ge1xuICAgICAgaWYgKG1pbmFyclswXSA+PSBiZWZvcmVfYWdnW2NdKSByZXR1cm4gW2JlZm9yZV9hZ2dbY10sY107XG4gICAgICBpZiAobWluYXJyLmxlbmd0aCA+IDEpIG1pbmFyclswXSA9IC0xO1xuICAgICAgcmV0dXJuIG1pbmFyclxuICAgIH0sW0luZmluaXR5XVxuICApWzFdXG5cbiAgdmFyIGxvY2FsX2FmdGVyID0gT2JqZWN0LmtleXMoYWZ0ZXJfYWdnKS5yZWR1Y2UoKG1pbmFycixjKSA9PiB7XG4gICAgICBpZiAobWluYXJyWzBdID49IGFmdGVyX2FnZ1tjXSkgcmV0dXJuIFthZnRlcl9hZ2dbY10sY107XG4gICAgICBpZiAobWluYXJyLmxlbmd0aCA+IDEpIG1pbmFyclswXSA9IC0xO1xuICAgICAgcmV0dXJuIG1pbmFyclxuICAgIH0sW0luZmluaXR5XVxuICApWzFdXG5cblxuICB2YXIgYmVmb3JlX2xpbmUgPSBidWNrZXRzW2J1Y2tldHMuaW5kZXhPZihwYXJzZUludChsb2NhbF9iZWZvcmUpKV1cbiAgICAsIGFmdGVyX2xpbmUgPSBidWNrZXRzW2J1Y2tldHMuaW5kZXhPZihwYXJzZUludChsb2NhbF9hZnRlcikpXVxuXG4gIHZhciBzdmcgPSBzdHJlYW1cbiAgICAuX3N2Zy5zdHlsZShcIm1hcmdpblwiLFwiYXV0b1wiKS5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG5cbiAgdmFyIG1saW5lID0gZDNfdXBkYXRlYWJsZShzdmcsXCJnLm0tbGluZS13cmFwXCIsXCJnXCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwibS1saW5lLXdyYXBcIilcblxuICBkM191cGRhdGVhYmxlKG1saW5lLFwibGluZVwiLFwibGluZVwiKVxuICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMzApXG4gICAgLmF0dHIoXCJzdHJva2VcIixcIndoaXRlXCIpXG4gICAgLmF0dHIoXCJ5MVwiLCA2MClcbiAgICAuYXR0cihcInkyXCIsIHN0cmVhbS5faGVpZ2h0KzYwKVxuICAgIC5hdHRyKFwieDFcIiwgMzQxKVxuICAgIC5hdHRyKFwieDJcIiwgMzQxKVxuXG4gIHZhciBtID0gZDNfdXBkYXRlYWJsZShtbGluZSxcImdcIixcImdcIilcbiAgICAuYXR0cihcIndyaXRpbmctbW9kZVwiLFwidGItcmxcIilcbiAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDM0MSxcIiArIChzdHJlYW0uX2hlaWdodC8yICsgNjApICsgXCIpXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShtLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC50ZXh0KFwiVXNlciBhY3Rpdml0eSBvbiB5b3VyIHNpdGVcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG5cblxuXG5cbiAgdmFyIHRpdGxlID0gZDNfdXBkYXRlYWJsZShzdmcsXCIubWFpbi10aXRsZVwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieFwiLFwiMzQxXCIpXG4gICAgLmF0dHIoXCJ5XCIsXCIzMFwiKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJtaWRkbGVcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcIm1haW4tdGl0bGVcIilcbiAgICAudGV4dChcIkNhdGVnb3J5IEltcG9ydGFuY2Ugb2YgVXNlcidzIEpvdXJuZXkgdG8gc2l0ZSAoaG92ZXIgdG8gZXhwbG9yZSwgY2xpY2sgdG8gc2VsZWN0KVwiKVxuXG4gIHZhciB0aXRsZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLnNlY29uZC10aXRsZVwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieFwiLFwiMzQxXCIpXG4gICAgLmF0dHIoXCJ5XCIsXCIzNDVcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJzZWNvbmQtdGl0bGVcIilcbiAgICAudGV4dChcIlRpbWUgd2VpZ2h0ZWQgdm9sdW1lXCIpXG5cblxuXG5cbiAgdmFyIGJsaW5lID0gZDNfdXBkYXRlYWJsZShzdmcuc2VsZWN0QWxsKFwiLmJlZm9yZS1jYW52YXNcIiksXCJnLmxpbmUtd3JhcFwiLFwiZ1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImxpbmUtd3JhcFwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmxpbmUsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAuYXR0cihcInkxXCIsIDApXG4gICAgLmF0dHIoXCJ5MlwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcIngxXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcbiAgICAuYXR0cihcIngyXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGJsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCAyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpIC0gMTApXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgIC50ZXh0KFwiQ29uc2lkZXJhdGlvbiBTdGFnZVwiKVxuXG5cbiAgdmFyIGFsaW5lID0gZDNfdXBkYXRlYWJsZShzdmcuc2VsZWN0QWxsKFwiLmFmdGVyLWNhbnZhc1wiKSxcImcubGluZS13cmFwXCIsXCJnXCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwibGluZS13cmFwXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShhbGluZSxcImxpbmVcIixcImxpbmVcIilcbiAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAuYXR0cihcInkyXCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieDFcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSlcbiAgICAuYXR0cihcIngyXCIsIHN0cmVhbS5fYWZ0ZXJfc2NhbGUoYWZ0ZXJfbGluZSkpXG5cbiAgZDNfdXBkYXRlYWJsZShhbGluZSxcInRleHRcIixcInRleHRcIilcbiAgICAuYXR0cihcInlcIiwgMjApXG4gICAgLmF0dHIoXCJ4XCIsIHN0cmVhbS5fYWZ0ZXJfc2NhbGUoYWZ0ZXJfbGluZSkgKyAxMClcbiAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwic3RhcnRcIilcbiAgICAudGV4dChcIlZhbGlkYXRpb24gLyBSZXNlYXJjaFwiKVxuXG5cblxuICByZXR1cm4ge1xuICAgIFwiY29uc2lkZXJhdGlvblwiOiBcIlwiICsgYmVmb3JlX2xpbmUsXG4gICAgXCJ2YWxpZGF0aW9uXCI6IFwiLVwiICsgYWZ0ZXJfbGluZVxuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdTdHJlYW0odGFyZ2V0LGJlZm9yZSxhZnRlcikge1xuXG4gIGZ1bmN0aW9uIGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGFjY2Vzc29yKSB7XG4gICAgdmFyIGJ2b2x1bWUgPSB7fSwgYXZvbHVtZSA9IHt9XG4gIFxuICAgIHRyeSB7IHZhciBidm9sdW1lID0gYlswXS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy54XSA9IGFjY2Vzc29yKGMpOyByZXR1cm4gcCB9LHt9KSB9IGNhdGNoKGUpIHt9XG4gICAgdHJ5IHsgdmFyIGF2b2x1bWUgPSBhWzBdLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLnhdID0gYWNjZXNzb3IoYyk7IHJldHVybiBwIH0se30pIH0gY2F0Y2goZSkge31cbiAgXG4gICAgdmFyIHZvbHVtZSA9IGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKCkubWFwKHggPT4gYnZvbHVtZVt4XSB8fCAwKS5jb25jYXQoYnVja2V0cy5tYXAoeCA9PiBhdm9sdW1lW3hdIHx8IDApKVxuICBcbiAgICByZXR1cm4gdm9sdW1lXG4gIH1cblxuICB2YXIgYnVja2V0cyA9IFswLDEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcblxuICB2YXIgZGF0YSA9IHN0cmVhbURhdGEoYmVmb3JlLGFmdGVyLGJ1Y2tldHMpXG4gICAgLCBiZWZvcmVfc3RhY2tlZCA9IGRhdGEuYmVmb3JlX3N0YWNrZWRcbiAgICAsIGFmdGVyX3N0YWNrZWQgPSBkYXRhLmFmdGVyX3N0YWNrZWRcblxuICB2YXIgYmVmb3JlID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuYmVmb3JlLXN0cmVhbVwiLFwiZGl2XCIsZGF0YSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgIC5jbGFzc2VkKFwiYmVmb3JlLXN0cmVhbVwiLHRydWUpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIwcHhcIilcblxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcInJnYigyMjcsIDIzNSwgMjQwKVwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJDb25zaWRlcmF0aW9uIGFuZCBSZXNlYXJjaCBQaGFzZSBJZGVudGlmaWNhdGlvblwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG4gIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSlcblxuXG5cbiAgdmFyIHN0cmVhbSA9IHN0cmVhbV9wbG90KGlubmVyKVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLm9uKFwiY2F0ZWdvcnkuaG92ZXJcIixmdW5jdGlvbih4LHRpbWUpIHtcbiAgICAgIGNvbnNvbGUubG9nKHRpbWUpXG4gICAgICB2YXIgYiA9IGRhdGEuYmVmb3JlX3N0YWNrZWQuZmlsdGVyKHkgPT4geVswXS5rZXkgPT0geClcbiAgICAgIHZhciBhID0gZGF0YS5hZnRlcl9zdGFja2VkLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IHgpXG5cbiAgICAgIHZhciB2b2x1bWUgPSBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxmdW5jdGlvbihjKSB7IHJldHVybiBjLnZhbHVlcy5sZW5ndGggfSlcbiAgICAgICAgLCBwZXJjZW50ID0gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsZnVuY3Rpb24oYykgeyByZXR1cm4gYy5wZXJjZW50IH0pXG4gICAgICAgICwgaW1wb3J0YW5jZSA9IGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMueSB9KVxuXG5cbiAgICAgIHZhciB3cmFwID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICwgdndyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudm9sdW1lXCIsXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ2b2x1bWVcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDMwKVwiKVxuICAgICAgICAsIHB3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnBlcmNlbnRcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBlcmNlbnRcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDkwKVwiKVxuICAgICAgICAsIGl3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmltcG9ydGFuY2VcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcImltcG9ydGFuY2VcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDE1MClcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHZ3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiVmlzaXRzXCIpXG4gICAgICAgIC5hdHRyKFwic3R5bGVcIixcInRpdGxlXCIpXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKHZ3cmFwLHZvbHVtZSlcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgwLDIpXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShwd3JhcCxcInRleHRcIixcInRleHRcIikudGV4dChcIlNoYXJlIG9mIHRpbWVcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcblxuICAgICAgc2ltcGxlVGltZXNlcmllcyhwd3JhcCxwZXJjZW50KVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDAsMilcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGl3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiSW1wb3J0YW5jZVwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKGl3cmFwLGltcG9ydGFuY2UpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMCwyKVwiKVxuXG5cbiAgICAgIHJldHVyblxuICAgIH0pXG4gICAgLmRyYXcoKVxuXG4gIHZhciBiZWZvcmVfYWdnID0gYmVmb3JlX3N0YWNrZWQucmVkdWNlKChvLHgpID0+IHsgcmV0dXJuIHgucmVkdWNlKChwLGMpID0+IHsgcFtjLnhdID0gKHBbYy54XSB8fCAwKSArIGMueTsgcmV0dXJuIHB9LG8pIH0se30pXG4gICAgLCBhZnRlcl9hZ2cgPSBhZnRlcl9zdGFja2VkLnJlZHVjZSgobyx4KSA9PiB7IHJldHVybiB4LnJlZHVjZSgocCxjKSA9PiB7IHBbYy54XSA9IChwW2MueF0gfHwgMCkgKyBjLnk7IHJldHVybiBwfSxvKSB9LHt9KVxuXG5cbiAgdmFyIGxvY2FsX2JlZm9yZSA9IE9iamVjdC5rZXlzKGJlZm9yZV9hZ2cpLnJlZHVjZSgobWluYXJyLGMpID0+IHtcbiAgICAgIGlmIChtaW5hcnJbMF0gPj0gYmVmb3JlX2FnZ1tjXSkgcmV0dXJuIFtiZWZvcmVfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG4gIHZhciBsb2NhbF9hZnRlciA9IE9iamVjdC5rZXlzKGFmdGVyX2FnZykucmVkdWNlKChtaW5hcnIsYykgPT4ge1xuICAgICAgaWYgKG1pbmFyclswXSA+PSBhZnRlcl9hZ2dbY10pIHJldHVybiBbYWZ0ZXJfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG5cbiAgdmFyIGJlZm9yZV9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYmVmb3JlKSldXG4gICAgLCBhZnRlcl9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYWZ0ZXIpKV1cblxuICB2YXIgc3ZnID0gc3RyZWFtXG4gICAgLl9zdmcuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIikuc3R5bGUoXCJkaXNwbGF5XCIsXCJibG9ja1wiKVxuXG5cbiAgdmFyIGJsaW5lID0gZDNfdXBkYXRlYWJsZShzdmcuc2VsZWN0QWxsKFwiLmJlZm9yZS1jYW52YXNcIiksXCJnLmxpbmUtd3JhcFwiLFwiZ1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImxpbmUtd3JhcFwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmxpbmUsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAuYXR0cihcInkxXCIsIDApXG4gICAgLmF0dHIoXCJ5MlwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcIngxXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcbiAgICAuYXR0cihcIngyXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGJsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpICsgMTApXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcInN0YXJ0XCIpXG4gICAgLnRleHQoXCJDb25zaWRlcmF0aW9uIFN0YWdlXCIpXG5cblxuICB2YXIgYWxpbmUgPSBkM191cGRhdGVhYmxlKHN2Zy5zZWxlY3RBbGwoXCIuYWZ0ZXItY2FudmFzXCIpLFwiZy5saW5lLXdyYXBcIixcImdcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJsaW5lLXdyYXBcIilcblxuICBkM191cGRhdGVhYmxlKGFsaW5lLFwibGluZVwiLFwibGluZVwiKVxuICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgIC5hdHRyKFwieTJcIiwgc3RyZWFtLl9oZWlnaHQrMjApXG4gICAgLmF0dHIoXCJ4MVwiLCBzdHJlYW0uX2FmdGVyX3NjYWxlKGFmdGVyX2xpbmUpKVxuICAgIC5hdHRyKFwieDJcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGFsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSAtIDEwKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAudGV4dChcIlZhbGlkYXRpb24gLyBSZXNlYXJjaFwiKVxuXG5cblxuICByZXR1cm4ge1xuICAgIFwiY29uc2lkZXJhdGlvblwiOiBcIlwiICsgYmVmb3JlX2xpbmUsXG4gICAgXCJ2YWxpZGF0aW9uXCI6IFwiLVwiICsgYWZ0ZXJfbGluZVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3QmVmb3JlQW5kQWZ0ZXIodGFyZ2V0LGRhdGEpIHtcblxuICB2YXIgYmVmb3JlID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuYmVmb3JlXCIsXCJkaXZcIixkYXRhLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgLmNsYXNzZWQoXCJiZWZvcmVcIix0cnVlKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMHB4XCIpXG5cbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJyZ2IoMjI3LCAyMzUsIDI0MClcIilcblxuICBkM191cGRhdGVhYmxlKGJlZm9yZSxcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiQ2F0ZWdvcnkgYWN0aXZpdHkgYmVmb3JlIGFycml2aW5nIGFuZCBhZnRlciBsZWF2aW5nIHNpdGVcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzMzM1wiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIwcHhcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcblxuICB2YXIgaW5uZXIgPSBkM191cGRhdGVhYmxlKGJlZm9yZSxcIi5pbm5lclwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJpbm5lclwiLHRydWUpXG4gICAgLnN0eWxlKFwicG9zaXRpb25cIixcImFic29sdXRlXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShpbm5lcixcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiU29ydCBCeVwiKVxuICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQwcHhcIilcblxuXG5cbiAgaW5uZXIuc2VsZWN0QWxsKFwic2VsZWN0XCIpXG4gICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxNDBweFwiKVxuXG5cbiAgdmFyIGNiID0gY29tcF9idWJibGUoYmVmb3JlKVxuICAgIC5yb3dzKGRhdGEuYmVmb3JlX2NhdGVnb3JpZXMpXG4gICAgLmFmdGVyKGRhdGEuYWZ0ZXJfY2F0ZWdvcmllcylcbiAgICAuZHJhdygpXG5cbiAgY2IuX3N2Zy5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcImF1dG9cIilcblxuXG4gIHJldHVybiBpbm5lclxuXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBQaWUodGFyZ2V0KSB7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cblBpZS5wcm90b3R5cGUgPSB7XG4gICAgcmFkaXVzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmFkaXVzXCIsdmFsKVxuICAgIH1cbiAgLCBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICBcbiAgICB2YXIgZCA9IGQzLmVudHJpZXMoe1xuICAgICAgICBzYW1wbGU6IHRoaXMuX2RhdGEuc2FtcGxlXG4gICAgICAsIHBvcHVsYXRpb246IHRoaXMuX2RhdGEucG9wdWxhdGlvbiAtIHRoaXMuX2RhdGEuc2FtcGxlXG4gICAgfSlcbiAgICBcbiAgICB2YXIgY29sb3IgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgICAgLnJhbmdlKFtcIiM5OGFiYzVcIiwgXCIjOGE4OWE2XCIsIFwiIzdiNjg4OFwiLCBcIiM2YjQ4NmJcIiwgXCIjYTA1ZDU2XCIsIFwiI2QwNzQzY1wiLCBcIiNmZjhjMDBcIl0pO1xuICAgIFxuICAgIHZhciBhcmMgPSBkMy5zdmcuYXJjKClcbiAgICAgICAgLm91dGVyUmFkaXVzKHRoaXMuX3JhZGl1cyAtIDEwKVxuICAgICAgICAuaW5uZXJSYWRpdXMoMCk7XG4gICAgXG4gICAgdmFyIHBpZSA9IGQzLmxheW91dC5waWUoKVxuICAgICAgICAuc29ydChudWxsKVxuICAgICAgICAudmFsdWUoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSk7XG4gICAgXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKHgpe3JldHVybiAxfSlcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCA1MClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgNTIpXG4gIFxuICAgIHN2ZyA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiZ1wiLFwiZ1wiKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIDI1ICsgXCIsXCIgKyAyNiArIFwiKVwiKTtcbiAgICBcbiAgICB2YXIgZyA9IGQzX3NwbGF0KHN2ZyxcIi5hcmNcIixcImdcIixwaWUoZCksZnVuY3Rpb24oeCl7IHJldHVybiB4LmRhdGEua2V5IH0pXG4gICAgICAuY2xhc3NlZChcImFyY1wiLHRydWUpXG4gIFxuICAgIGQzX3VwZGF0ZWFibGUoZyxcInBhdGhcIixcInBhdGhcIilcbiAgICAgIC5hdHRyKFwiZFwiLCBhcmMpXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGNvbG9yKGQuZGF0YS5rZXkpIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHBpZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBQaWUodGFyZ2V0KVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgcGllIGZyb20gJy4uLy4uL2dlbmVyaWMvcGllJ1xuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSwgdGFyZ2V0LCByYWRpdXNfc2NhbGUsIHgpIHtcbiAgdmFyIGRhdGEgPSBkYXRhXG4gICAgLCBkdGhpcyA9IGQzX2NsYXNzKGQzLnNlbGVjdCh0YXJnZXQpLFwicGllLXN1bW1hcnktYmxvY2tcIilcblxuICBwaWUoZHRoaXMpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAucmFkaXVzKHJhZGl1c19zY2FsZShkYXRhLnBvcHVsYXRpb24pKVxuICAgIC5kcmF3KClcblxuICB2YXIgZncgPSBkM19jbGFzcyhkdGhpcyxcImZ3XCIpXG4gICAgLmNsYXNzZWQoXCJmd1wiLHRydWUpXG5cbiAgdmFyIGZ3MiA9IGQzX2NsYXNzKGR0aGlzLFwiZncyXCIpXG4gICAgLnRleHQoZDMuZm9ybWF0KFwiJVwiKShkYXRhLnNhbXBsZS9kYXRhLnBvcHVsYXRpb24pKVxuXG4gIGQzX2NsYXNzKGZ3LFwic2FtcGxlXCIsXCJzcGFuXCIpXG4gICAgLnRleHQoZDMuZm9ybWF0KFwiLFwiKShkYXRhLnNhbXBsZSkpXG5cbiAgZDNfY2xhc3MoZncsXCJ2c1wiLFwic3BhblwiKVxuICAgIC5odG1sKFwiPGJyPiBvdXQgb2YgPGJyPlwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjg4ZW1cIilcblxuICBkM19jbGFzcyhmdyxcInBvcHVsYXRpb25cIixcInNwYW5cIilcbiAgICAudGV4dChkMy5mb3JtYXQoXCIsXCIpKGRhdGEucG9wdWxhdGlvbikpXG5cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IHtidWlsZFN1bW1hcnlCbG9ja30gZnJvbSAnLi9zYW1wbGVfdnNfcG9wJ1xuXG5pbXBvcnQgKiBhcyB0aW1lc2VyaWVzIGZyb20gJy4uLy4uL2dlbmVyaWMvdGltZXNlcmllcydcblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdUaW1lc2VyaWVzKHRhcmdldCxkYXRhLHJhZGl1c19zY2FsZSkge1xuICB2YXIgdyA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZGl2LnRpbWVzZXJpZXNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidGltZXNlcmllc1wiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjYwJVwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsIFwiMTBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTI3cHhcIilcblxuXG5cbiAgdmFyIHEgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdi50aW1lc2VyaWVzLWRldGFpbHNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidGltZXNlcmllcy1kZXRhaWxzXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDAlXCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjE1cHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjU3cHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTI3cHhcIilcblxuXG5cblxuXG4gIHZhciBwb3AgPSBkM191cGRhdGVhYmxlKHEsXCIucG9wXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInBvcFwiLHRydWUpXG5cbiAgZDNfdXBkYXRlYWJsZShwb3AsXCIuZXhcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcImV4XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcImdyZXlcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG4gIGQzX3VwZGF0ZWFibGUocG9wLFwiLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiM3B4XCIpXG4gICAgLnRleHQoXCJhbGxcIilcblxuXG5cbiAgdmFyIHNhbXAgPSBkM191cGRhdGVhYmxlKHEsXCIuc2FtcFwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJzYW1wXCIsdHJ1ZSlcblxuICBkM191cGRhdGVhYmxlKHNhbXAsXCIuZXhcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcImV4XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiMwODFkNThcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG5cbiAgZDNfdXBkYXRlYWJsZShzYW1wLFwiLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiM3B4XCIpXG4gICAgLnRleHQoXCJmaWx0ZXJlZFwiKVxuXG5cbiAgdmFyIGRldGFpbHMgPSBkM191cGRhdGVhYmxlKHEsXCIuZGVldHNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwiZGVldHNcIix0cnVlKVxuXG5cblxuXG4gIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiRmlsdGVyZWQgdmVyc3VzIEFsbCBWaWV3c1wiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG5cblxuXG5cblxuICB0aW1lc2VyaWVzWydkZWZhdWx0J10odylcbiAgICAuZGF0YSh7XCJrZXlcIjpcInlcIixcInZhbHVlc1wiOmRhdGF9KVxuICAgIC5oZWlnaHQoODApXG4gICAgLm9uKFwiaG92ZXJcIixmdW5jdGlvbih4KSB7XG4gICAgICB2YXIgeHggPSB7fVxuICAgICAgeHhbeC5rZXldID0ge3NhbXBsZTogeC52YWx1ZSwgcG9wdWxhdGlvbjogeC52YWx1ZTIgfVxuICAgICAgZGV0YWlscy5kYXR1bSh4eClcblxuICAgICAgZDNfdXBkYXRlYWJsZShkZXRhaWxzLFwiLnRleHRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInRleHRcIix0cnVlKVxuICAgICAgICAudGV4dChcIkAgXCIgKyB4LmhvdXIgKyBcIjpcIiArICh4Lm1pbnV0ZS5sZW5ndGggPiAxID8geC5taW51dGUgOiBcIjBcIiArIHgubWludXRlKSApXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiNDlweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZShkZXRhaWxzLFwiLnBpZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicGllXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxNXB4XCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IE9iamVjdC5rZXlzKHgpLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiB4W2tdIH0pWzBdXG4gICAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgICB9KVxuICAgIH0pXG4gICAgLmRyYXcoKVxuXG59XG4iLCJpbXBvcnQge3RhYmxlfSBmcm9tICd0YWJsZSdcbmltcG9ydCB7ZDNfY2xhc3MsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5cbmltcG9ydCB7ZHJhd0NhdGVnb3J5LCBkcmF3Q2F0ZWdvcnlEaWZmfSBmcm9tICcuL2NhdGVnb3J5J1xuaW1wb3J0IHtkcmF3U3RyZWFtLCBkcmF3QmVmb3JlQW5kQWZ0ZXJ9IGZyb20gJy4vYmVmb3JlX2FuZF9hZnRlcidcbmltcG9ydCB7YnVpbGRTdW1tYXJ5QmxvY2t9IGZyb20gJy4vc2FtcGxlX3ZzX3BvcCdcbmltcG9ydCB7ZHJhd1RpbWVzZXJpZXN9IGZyb20gJy4vdGltaW5nJ1xuaW1wb3J0IHtkcmF3S2V5d29yZHMsIGRyYXdLZXl3b3JkRGlmZn0gZnJvbSAnLi9rZXl3b3JkcydcblxuaW1wb3J0IGhlYWRlciBmcm9tICcuLi8uLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCAnLi9zdW1tYXJ5LmNzcydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3VtbWFyeV92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN1bW1hcnlWaWV3KHRhcmdldClcbn1cblxuZXhwb3J0IGNsYXNzIFN1bW1hcnlWaWV3IGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsIFwidGltaW5nXCIsIFwiY2F0ZWdvcnlcIiwgXCJrZXl3b3Jkc1wiLCBcImJlZm9yZVwiLCBcImFmdGVyXCJdIH1cblxuICBkcmF3KCkge1xuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwic3VtbWFyeS12aWV3XCIpXG5cbiAgICBoZWFkZXIod3JhcClcbiAgICAgIC50ZXh0KFwiU3VtbWFyeVwiKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIHRzd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJ0cy1yb3dcIilcbiAgICAgICwgcGlld3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJwaWUtcm93XCIpXG4gICAgICAsIGNhdHdyYXAgPSBkM19jbGFzcyh3cmFwLFwiY2F0LXJvd1wiKS5jbGFzc2VkKFwiZGFzaC1yb3dcIix0cnVlKVxuICAgICAgLCBrZXl3cmFwID0gZDNfY2xhc3Mod3JhcCxcImtleS1yb3dcIilcbiAgICAgICwgYmF3cmFwID0gZDNfY2xhc3Mod3JhcCxcImJhLXJvd1wiKSBcbiAgICAgICwgc3RyZWFtd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJzdHJlYW0tYmEtcm93XCIpIFxuXG5cbiAgICB2YXIgcmFkaXVzX3NjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oW3RoaXMuX2RhdGEuZG9tYWlucy5wb3B1bGF0aW9uLHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbl0pXG4gICAgICAucmFuZ2UoWzIwLDM1XSlcblxuICAgIHRhYmxlKHBpZXdyYXApXG4gICAgICAuZGF0YSh7XCJrZXlcIjpcIlRcIixcInZhbHVlc1wiOlt0aGlzLmRhdGEoKV19KVxuICAgICAgLnNraXBfb3B0aW9uKHRydWUpXG4gICAgICAucmVuZGVyKFwiZG9tYWluc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5yZW5kZXIoXCJhcnRpY2xlc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5yZW5kZXIoXCJzZXNzaW9uc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5yZW5kZXIoXCJ2aWV3c1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcblxuXG4gICAgZHJhd1RpbWVzZXJpZXModHN3cmFwLHRoaXMuX3RpbWluZyxyYWRpdXNfc2NhbGUpXG5cblxuICAgIHRyeSB7XG4gICAgZHJhd0NhdGVnb3J5KGNhdHdyYXAsdGhpcy5fY2F0ZWdvcnkpXG4gICAgZHJhd0NhdGVnb3J5RGlmZihjYXR3cmFwLHRoaXMuX2NhdGVnb3J5KVxuICAgIH0gY2F0Y2goZSkge31cblxuICAgIC8vZHJhd0tleXdvcmRzKGtleXdyYXAsdGhpcy5fa2V5d29yZHMpXG4gICAgLy9kcmF3S2V5d29yZERpZmYoa2V5d3JhcCx0aGlzLl9rZXl3b3JkcylcblxuICAgIHZhciBpbm5lciA9IGRyYXdCZWZvcmVBbmRBZnRlcihiYXdyYXAsdGhpcy5fYmVmb3JlKVxuXG4gICAgc2VsZWN0KGlubmVyKVxuICAgICAgLm9wdGlvbnMoW1xuICAgICAgICAgIHtcImtleVwiOlwiSW1wb3J0YW5jZVwiLFwidmFsdWVcIjpcInBlcmNlbnRfZGlmZlwifVxuICAgICAgICAsIHtcImtleVwiOlwiQWN0aXZpdHlcIixcInZhbHVlXCI6XCJzY29yZVwifVxuICAgICAgICAsIHtcImtleVwiOlwiUG9wdWxhdGlvblwiLFwidmFsdWVcIjpcInBvcFwifVxuICAgICAgXSlcbiAgICAgIC5zZWxlY3RlZCh0aGlzLl9iZWZvcmUuc29ydGJ5IHx8IFwiXCIpXG4gICAgICAub24oXCJzZWxlY3RcIiwgdGhpcy5vbihcImJhLnNvcnRcIikpXG4gICAgICAuZHJhdygpXG5cblxuICAgIC8vZHJhd1N0cmVhbShzdHJlYW13cmFwLHRoaXMuX2JlZm9yZS5iZWZvcmVfY2F0ZWdvcmllcyx0aGlzLl9iZWZvcmUuYWZ0ZXJfY2F0ZWdvcmllcylcblxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufSAgICAgICAgICAgICAgIFxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi9zZWxlY3QnXG5cblxuY2xhc3MgRGF0YVNlbGVjdG9yIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJ0cmFuc2Zvcm1zXCIsXCJkYXRhc2V0c1wiLFwic2VsZWN0ZWRfdHJhbnNmb3JtXCJdIH1cblxuICBkcmF3KCkge1xuICAgIHZhciB0cmFuc2Zvcm1fc2VsZWN0b3IgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJ0cmFuc2Zvcm1cIilcblxuICAgIHNlbGVjdChkM19jbGFzcyh0cmFuc2Zvcm1fc2VsZWN0b3IsXCJoZWFkZXJcIixcInNwYW5cIikpXG4gICAgICAub3B0aW9ucyh0aGlzLmRhdGFzZXRzKCkpXG4gICAgICAub24oXCJzZWxlY3RcIiwgdGhpcy5vbihcImRhdGFzZXQuY2hhbmdlXCIpIClcbiAgICAgIC5kcmF3KClcblxuICAgIHNlbGVjdChkM19jbGFzcyh0cmFuc2Zvcm1fc2VsZWN0b3IsXCJ0cmFuc1wiLFwic3BhblwiKSlcbiAgICAgIC5vcHRpb25zKHRoaXMudHJhbnNmb3JtcygpKVxuICAgICAgLm9uKFwic2VsZWN0XCIsIHRoaXMub24oXCJ0cmFuc2Zvcm0uY2hhbmdlXCIpICkvL2Z1bmN0aW9uKHgpeyBzZWxmLm9uKFwidHJhbnNmb3JtLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgpIH0pXG4gICAgICAuc2VsZWN0ZWQodGhpcy5zZWxlY3RlZF90cmFuc2Zvcm0oKSApXG4gICAgICAuZHJhdygpXG5cbiAgICB2YXIgdG9nZ2xlID0gZDNfY2xhc3ModHJhbnNmb3JtX3NlbGVjdG9yLFwic2hvdy12YWx1ZXNcIilcblxuICAgIGQzX3VwZGF0ZWFibGUodG9nZ2xlLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgLnRleHQoXCJzaG93IHZhbHVlcz8gXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHRvZ2dsZSxcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgLm9uKFwiY2hhbmdlXCIsdGhpcy5vbihcInRvZ2dsZS52YWx1ZXNcIikpXG5cbiAgICB2YXIgdG9nZ2xlID0gZDNfY2xhc3ModHJhbnNmb3JtX3NlbGVjdG9yLFwiZmlsdGVyLXZhbHVlc1wiKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh0b2dnbGUsXCJzcGFuXCIsXCJzcGFuXCIpXG4gICAgICAudGV4dChcImxpdmUgZmlsdGVyPyBcIilcblxuICAgIGQzX3VwZGF0ZWFibGUodG9nZ2xlLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAuYXR0cihcInR5cGVcIixcImNoZWNrYm94XCIpXG4gICAgICAuYXR0cihcImRpc2FibGVkXCIsdHJ1ZSlcbiAgICAgIC5hdHRyKFwiY2hlY2tlZFwiLFwiY2hlY2tlZFwiKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufSAgICAgICAgICAgICAgIFxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkYXRhX3NlbGVjdG9yKHRhcmdldCkge1xuICByZXR1cm4gbmV3IERhdGFTZWxlY3Rvcih0YXJnZXQpXG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuXG5jbGFzcyBPYmplY3RTZWxlY3RvciBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKHRhcmdldClcbiAgICB0aGlzLl9zZWxlY3Rpb25zID0gW11cbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wic2VsZWN0QWxsXCIsXCJrZXlcIl0gfVxuXG4gIGFkZCh4KSB7XG4gICAgdGhpcy5fc2VsZWN0aW9ucy5wdXNoKHgpXG4gICAgdGhpcy5vbihcImFkZFwiKSh0aGlzLl9zZWxlY3Rpb25zKVxuICB9XG4gIHJlbW92ZSh4KSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fc2VsZWN0aW9ucy5pbmRleE9mKHgpXG4gICAgdGhpcy5fc2VsZWN0aW9ucy5zcGxpY2UoaW5kZXgsMSlcbiAgICB0aGlzLm9uKFwicmVtb3ZlXCIpKHRoaXMuX3NlbGVjdGlvbnMpXG4gIH1cblxuICBkcmF3KCkge1xuXG4gICAgY29uc3Qgc2VsZiA9IHRoaXNcblxuICAgIGZ1bmN0aW9uIGNsaWNrKHgsaSxza2lwKSB7XG5cbiAgICAgIHZhciBib29sID0gZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoXCJzZWxlY3RlZFwiKVxuXG4gICAgICBpZiAoIXNraXApIHtcbiAgICAgICAgaWYgKGJvb2wgPT0gZmFsc2UpIHNlbGYuYWRkKHNlbGYua2V5KCkoeCxpKSlcbiAgICAgICAgaWYgKGJvb2wgPT0gdHJ1ZSkgc2VsZi5yZW1vdmUoc2VsZi5rZXkoKSh4LGkpKVxuXG4gICAgICAgIGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKFwic2VsZWN0ZWRcIiwhYm9vbClcbiAgICAgIH1cblxuXG4gICAgICBzZWxmLm9uKFwiaW50ZXJhY3RcIikuYmluZCh0aGlzKShzZWxmLmtleSgpKHgsaSksc2tpcCA/IFtzZWxmLmtleSgpKHgsaSldIDogc2VsZi5fc2VsZWN0aW9ucylcblxuICAgIH1cblxuICAgIHRoaXMuX3RhcmdldFxuICAgICAgLnNlbGVjdEFsbCh0aGlzLl9zZWxlY3RBbGwpXG4gICAgICAub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgIGlmIChzZWxmLl9zZWxlY3Rpb25zLmxlbmd0aCA9PSAwKSBjbGljay5iaW5kKHRoaXMpKHgsaSx0cnVlKVxuICAgICAgfSlcbiAgICAgIC5vbihcIm1vdXNlb3V0XCIsIGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICBpZiAoc2VsZi5fc2VsZWN0aW9ucy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgIGNsaWNrLmJpbmQodGhpcykoeCxpLHRydWUpXG4gICAgICAgICAgc2VsZi5vbihcIm1vdXNlb3V0XCIpLmJpbmQodGhpcykoeCxpKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgIGNsaWNrLmJpbmQodGhpcykoeCxpKVxuICAgICAgICBzZWxmLm9uKFwiY2xpY2tcIikuYmluZCh0aGlzKShzZWxmLmtleSgpKHgsaSksIHNlbGYuX3NlbGVjdGlvbnMpXG4gICAgICB9KVxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59ICAgICAgICAgICAgICAgXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG9iamVjdF9zZWxlY3Rvcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBPYmplY3RTZWxlY3Rvcih0YXJnZXQpXG59XG4iLCJleHBvcnQgdmFyIGJ1Y2tldHMgPSBbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5yZXZlcnNlKCkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZyh4KjYwKSB9KVxuYnVja2V0cyA9IGJ1Y2tldHMuY29uY2F0KFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiBTdHJpbmcoLXgqNjApIH0pKVxuXG4gXG5cbi8vIFJvbGx1cCBvdmVyYWxsIGJlZm9yZSBhbmQgYWZ0ZXIgZGF0YVxuXG5jb25zdCBidWNrZXRXaXRoUHJlZml4ID0gKHByZWZpeCx4KSA9PiBwcmVmaXggKyB4LnRpbWVfZGlmZl9idWNrZXRcbmNvbnN0IHN1bVZpc2l0cyA9ICh4KSA9PiBkMy5zdW0oeCx5ID0+IHkudmlzaXRzKSBcblxuZXhwb3J0IGZ1bmN0aW9uIHJvbGx1cEJlZm9yZUFuZEFmdGVyKGJlZm9yZV91cmxzLCBhZnRlcl91cmxzKSB7XG5cbiAgY29uc3QgYmVmb3JlX3JvbGx1cCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoYnVja2V0V2l0aFByZWZpeC5iaW5kKHRoaXMsXCJcIikpXG4gICAgLnJvbGx1cChzdW1WaXNpdHMpXG4gICAgLm1hcChiZWZvcmVfdXJscylcblxuICBjb25zdCBhZnRlcl9yb2xsdXAgPSBkMy5uZXN0KClcbiAgICAua2V5KGJ1Y2tldFdpdGhQcmVmaXguYmluZCh0aGlzLFwiLVwiKSlcbiAgICAucm9sbHVwKHN1bVZpc2l0cylcbiAgICAubWFwKGFmdGVyX3VybHMpXG5cbiAgcmV0dXJuIGJ1Y2tldHMubWFwKHggPT4gYmVmb3JlX3JvbGx1cFt4XSB8fCBhZnRlcl9yb2xsdXBbeF0gfHwgMClcbn1cblxuXG5cblxuLy8gS2V5d29yZCBwcm9jZXNzaW5nIGhlbHBlcnNcblxuY29uc3QgU1RPUFdPUkRTID1bXG4gICAgXCJ0aGF0XCIsXCJ0aGlzXCIsXCJ3aGF0XCIsXCJiZXN0XCIsXCJtb3N0XCIsXCJmcm9tXCIsXCJ5b3VyXCJcbiAgLCBcImhhdmVcIixcImZpcnN0XCIsXCJ3aWxsXCIsXCJ0aGFuXCIsXCJzYXlzXCIsXCJsaWtlXCIsXCJpbnRvXCIsXCJhZnRlclwiLFwid2l0aFwiXG5dXG5jb25zdCBjbGVhbkFuZFNwbGl0VVJMID0gKGRvbWFpbix1cmwpID0+IHtcbiAgcmV0dXJuIHVybC50b0xvd2VyQ2FzZSgpLnNwbGl0KGRvbWFpbilbMV0uc3BsaXQoXCIvXCIpLnJldmVyc2UoKVswXS5yZXBsYWNlKFwiX1wiLFwiLVwiKS5zcGxpdChcIi1cIilcbn1cbmNvbnN0IGlzV29yZCA9ICh4KSA9PiB7XG4gIHJldHVybiB4Lm1hdGNoKC9cXGQrL2cpID09IG51bGwgJiYgXG4gICAgeC5pbmRleE9mKFwiLFwiKSA9PSAtMSAmJiBcbiAgICB4LmluZGV4T2YoXCI/XCIpID09IC0xICYmIFxuICAgIHguaW5kZXhPZihcIi5cIikgPT0gLTEgJiYgXG4gICAgeC5pbmRleE9mKFwiOlwiKSA9PSAtMSAmJiBcbiAgICBwYXJzZUludCh4KSAhPSB4ICYmIFxuICAgIHgubGVuZ3RoID4gM1xufVxuXG5cbmNvbnN0IHVybFJlZHVjZXIgPSAocCxjKSA9PiB7XG4gIHBbYy51cmxdID0gKHBbYy51cmxdIHx8IDApICsgYy52aXNpdHNcbiAgcmV0dXJuIHBcbn1cbmNvbnN0IHVybEJ1Y2tldFJlZHVjZXIgPSAocHJlZml4LCBwLGMpID0+IHtcbiAgcFtjLnVybF0gPSBwW2MudXJsXSB8fCB7fVxuICBwW2MudXJsXVtcInVybFwiXSA9IGMudXJsXG5cbiAgcFtjLnVybF1bcHJlZml4ICsgYy50aW1lX2RpZmZfYnVja2V0XSA9IGMudmlzaXRzXG4gIHJldHVybiBwXG59XG5jb25zdCB1cmxUb0tleXdvcmRzT2JqUmVkdWNlciA9IChkb21haW4sIHAsYykgPT4ge1xuICBjbGVhbkFuZFNwbGl0VVJMKGRvbWFpbixjLmtleSkubWFwKHggPT4ge1xuICAgIGlmIChpc1dvcmQoeCkgJiYgU1RPUFdPUkRTLmluZGV4T2YoeCkgPT0gLTEpIHtcbiAgICAgIHBbeF0gPSBwW3hdIHx8IHt9XG4gICAgICBwW3hdLmtleSA9IHhcbiAgICAgIE9iamVjdC5rZXlzKGMudmFsdWUpLm1hcChxID0+IHtcbiAgICAgICAgcFt4XVtxXSA9IChwW3hdW3FdIHx8IDApICsgYy52YWx1ZVtxXVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG4gIHJldHVybiBwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1cmxzQW5kS2V5d29yZHMoYmVmb3JlX3VybHMsIGFmdGVyX3VybHMsIGRvbWFpbikge1xuXG4gICAgY29uc3QgdXJsX3ZvbHVtZSA9IHt9XG4gICAgYmVmb3JlX3VybHMucmVkdWNlKHVybFJlZHVjZXIsdXJsX3ZvbHVtZSlcbiAgICBhZnRlcl91cmxzLnJlZHVjZSh1cmxSZWR1Y2VyLHVybF92b2x1bWUpXG5cbiAgICBjb25zdCB1cmxfdHMgPSB7fVxuICAgIGJlZm9yZV91cmxzLnJlZHVjZSh1cmxCdWNrZXRSZWR1Y2VyLmJpbmQodGhpcyxcIlwiKSx1cmxfdHMpXG4gICAgYWZ0ZXJfdXJscy5yZWR1Y2UodXJsQnVja2V0UmVkdWNlci5iaW5kKHRoaXMsXCItXCIpLHVybF90cylcblxuICAgIGNvbnN0IHVybHMgPSBkMy5lbnRyaWVzKHVybF92b2x1bWUpXG4gICAgICAuc29ydCgocCxjKSA9PiB7IHJldHVybiBkMy5kZXNjZW5kaW5nKHAudmFsdWUsYy52YWx1ZSkgfSlcbiAgICAgIC5zbGljZSgwLDEwMDApXG4gICAgICAubWFwKHggPT4gdXJsX3RzW3gua2V5XSlcbiAgICAgIC5tYXAoZnVuY3Rpb24oeCl7IFxuICAgICAgICB4LmtleSA9IHgudXJsXG4gICAgICAgIHgudmFsdWVzID0gYnVja2V0cy5tYXAoeSA9PiB4W3ldIHx8IDApXG4gICAgICAgIHgudG90YWwgPSBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKVxuICAgICAgICByZXR1cm4geFxuICAgICAgfSlcblxuICAgIGNvbnN0IGtleXdvcmRzID0ge31cbiAgICBkMy5lbnRyaWVzKHVybF90cylcbiAgICAgIC5yZWR1Y2UodXJsVG9LZXl3b3Jkc09ialJlZHVjZXIuYmluZChmYWxzZSxkb21haW4pLGtleXdvcmRzKVxuICAgIFxuICAgIFxuICAgIGNvbnN0IGt3cyA9IE9iamVjdC5rZXlzKGtleXdvcmRzKVxuICAgICAgLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiBPYmplY3QuYXNzaWduKGtleXdvcmRzW2tdLHtrZXk6a30pIH0pXG4gICAgICAubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICB4LnZhbHVlcyA9IGJ1Y2tldHMubWFwKHkgPT4geFt5XSB8fCAwKVxuICAgICAgICB4LnRvdGFsID0gZDMuc3VtKGJ1Y2tldHMubWFwKGZ1bmN0aW9uKGIpIHsgcmV0dXJuIHhbYl0gfHwgMCB9KSlcbiAgICAgICAgcmV0dXJuIHhcbiAgICAgIH0pLnNvcnQoKHAsYykgPT4ge1xuICAgICAgICByZXR1cm4gYy50b3RhbCAtIHAudG90YWxcbiAgICAgIH0pXG5cbiAgICByZXR1cm4ge1xuICAgICAgdXJscyxcbiAgICAgIGt3c1xuICAgIH1cblxufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRDb25zaWQoc29ydGVkX3VybHMsIHNvcnRlZF9rd3MsIGJlZm9yZV9wb3MsIGFmdGVyX3Bvcykge1xuICAgIGNvbnN0IGNvbnNpZF9idWNrZXRzID0gYnVja2V0cy5maWx0ZXIoKHgsaSkgPT4gISgoaSA8IGJlZm9yZV9wb3MpIHx8IChpID4gYnVja2V0cy5sZW5ndGgvMiAtIDEgKSkgKVxuICAgIGNvbnN0IHZhbGlkX2J1Y2tldHMgID0gYnVja2V0cy5maWx0ZXIoKHgsaSkgPT4gISgoaSA8IGJ1Y2tldHMubGVuZ3RoLzIgKSB8fCAoaSA+IGFmdGVyX3BvcykpIClcbiAgICBmdW5jdGlvbiBjb250YWluc1JlZHVjZXIoeCxwLGMpIHtcbiAgICAgIHAgKz0geFtjXSB8fCAwO1xuICAgICAgcmV0dXJuIHBcbiAgICB9XG4gICAgZnVuY3Rpb24gZmlsdGVyQnlCdWNrZXRzKF9idWNrZXRzLHgpIHtcbiAgICAgIHJldHVybiBfYnVja2V0cy5yZWR1Y2UoY29udGFpbnNSZWR1Y2VyLmJpbmQoZmFsc2UseCksMClcbiAgICB9XG4gICAgdmFyIHVybHNfY29uc2lkID0gc29ydGVkX3VybHMuZmlsdGVyKCBmaWx0ZXJCeUJ1Y2tldHMuYmluZChmYWxzZSxjb25zaWRfYnVja2V0cykgKVxuICAgICAgLCBrd3NfY29uc2lkID0gc29ydGVkX2t3cy5maWx0ZXIoIGZpbHRlckJ5QnVja2V0cy5iaW5kKGZhbHNlLGNvbnNpZF9idWNrZXRzKSApXG5cbiAgICB2YXIgdXJsc192YWxpZCA9IHNvcnRlZF91cmxzLmZpbHRlciggZmlsdGVyQnlCdWNrZXRzLmJpbmQoZmFsc2UsdmFsaWRfYnVja2V0cykgKVxuICAgICAgLCBrd3NfdmFsaWQgPSBzb3J0ZWRfa3dzLmZpbHRlciggZmlsdGVyQnlCdWNrZXRzLmJpbmQoZmFsc2UsdmFsaWRfYnVja2V0cykgKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdXJsc19jb25zaWRcbiAgICAgICwgdXJsc192YWxpZFxuICAgICAgLCBrd3NfY29uc2lkXG4gICAgICAsIGt3c192YWxpZFxuICAgIH1cbn1cblxuXG5cblxuLy8gQnVpbGQgZGF0YSBmb3Igc3VtbWFyeVxuXG5mdW5jdGlvbiBudW1WaWV3cyhkYXRhKSB7IFxuICByZXR1cm4gZGF0YS5sZW5ndGggXG59XG5mdW5jdGlvbiBhdmdWaWV3cyhkYXRhKSB7XG4gIHJldHVybiBwYXJzZUludChkYXRhLnJlZHVjZSgocCxjKSA9PiBwICsgYy50b3RhbCwwKS9kYXRhLmxlbmd0aClcbn1cbmZ1bmN0aW9uIG1lZGlhblZpZXdzKGRhdGEpIHtcbiAgcmV0dXJuIChkYXRhW3BhcnNlSW50KGRhdGEubGVuZ3RoLzIpXSB8fCB7fSkudG90YWwgfHwgMFxufVxuZnVuY3Rpb24gc3VtbWFyaXplVmlld3MobmFtZSwgZm4sIGFsbCwgY29uc2lkLCB2YWxpZCkge1xuICByZXR1cm4ge25hbWU6IG5hbWUsIGFsbDogZm4oYWxsKSwgY29uc2lkZXJhdGlvbjogZm4oY29uc2lkKSwgdmFsaWRhdGlvbjogZm4odmFsaWQpfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHN1bW1hcml6ZURhdGEoYWxsLGNvbnNpZCx2YWxpZCkge1xuICByZXR1cm4gW1xuICAgICAgc3VtbWFyaXplVmlld3MoXCJEaXN0aW5jdCBVUkxzXCIsbnVtVmlld3MsYWxsLGNvbnNpZCx2YWxpZClcbiAgICAsIHN1bW1hcml6ZVZpZXdzKFwiQXZlcmFnZSBWaWV3c1wiLGF2Z1ZpZXdzLGFsbCxjb25zaWQsdmFsaWQpXG4gICAgLCBzdW1tYXJpemVWaWV3cyhcIk1lZGlhbiBWaWV3c1wiLG1lZGlhblZpZXdzLGFsbCxjb25zaWQsdmFsaWQpXG4gIF1cbn1cblxuXG5cbi8vIFByb2Nlc3MgcmVsYXRpdmUgdGltaW5nIGRhdGFcblxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NEYXRhKGJlZm9yZV91cmxzLCBhZnRlcl91cmxzLCBiZWZvcmVfcG9zLCBhZnRlcl9wb3MsIGRvbWFpbikge1xuXG4gICAgY29uc3QgeyB1cmxzICwga3dzIH0gPSB1cmxzQW5kS2V5d29yZHMoYmVmb3JlX3VybHMsIGFmdGVyX3VybHMsIGRvbWFpbilcbiAgICBjb25zdCB7IHVybHNfY29uc2lkICwgdXJsc192YWxpZCAsIGt3c19jb25zaWQgLCBrd3NfdmFsaWQgfSA9IHZhbGlkQ29uc2lkKHVybHMsIGt3cywgYmVmb3JlX3BvcywgYWZ0ZXJfcG9zKVxuXG4gICAgY29uc3QgdXJsX3N1bW1hcnkgPSBzdW1tYXJpemVEYXRhKHVybHMsIHVybHNfY29uc2lkLCB1cmxzX3ZhbGlkKVxuICAgIGNvbnN0IGt3c19zdW1tYXJ5ID0gc3VtbWFyaXplRGF0YShrd3MsIGt3c19jb25zaWQsIGt3c192YWxpZCApXG5cbiAgICByZXR1cm4ge1xuICAgICAgdXJsX3N1bW1hcnksXG4gICAgICBrd3Nfc3VtbWFyeSxcbiAgICAgIHVybHMsXG4gICAgICB1cmxzX2NvbnNpZCAsXG4gICAgICB1cmxzX3ZhbGlkICxcbiAgICAgIGt3cyxcbiAgICAgIGt3c19jb25zaWQgLFxuICAgICAga3dzX3ZhbGlkIFxuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIGQzX2NsYXNzLCBub29wLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQge3RhYmxlLCBzdW1tYXJ5X3RhYmxlfSBmcm9tICd0YWJsZSdcbmltcG9ydCB7c2ltcGxlVGltZXNlcmllcywgYmVmb3JlX2FmdGVyX3RpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuaW1wb3J0IHt0YWJ1bGFyX3RpbWVzZXJpZXMsIHZlcnRpY2FsX29wdGlvbn0gZnJvbSAnY29tcG9uZW50J1xuXG5pbXBvcnQge3JvbGx1cEJlZm9yZUFuZEFmdGVyLCBwcm9jZXNzRGF0YSwgYnVja2V0c30gZnJvbSAnLi9yZWZpbmVfcmVsYXRpdmVfcHJvY2VzcydcbmltcG9ydCAnLi9yZWZpbmVfcmVsYXRpdmUuY3NzJ1xuXG5cbmZ1bmN0aW9uIHNlbGVjdE9wdGlvblJlY3QodGQsb3B0aW9ucyxiZWZvcmVfcG9zLGFmdGVyX3Bvcykge1xuXG4gIHZhciBzdWJzZXQgPSB0ZC5zZWxlY3RBbGwoXCJzdmdcIikuc2VsZWN0QWxsKFwicmVjdFwiKVxuICAgIC5hdHRyKFwiZmlsbFwiLHVuZGVmaW5lZCkuZmlsdGVyKCh4LGkpID0+IHtcbiAgICAgIHZhciB2YWx1ZSA9IG9wdGlvbnMuZmlsdGVyKHggPT4geC5zZWxlY3RlZClbMF0udmFsdWVcbiAgICAgIGlmICh2YWx1ZSA9PSBcImFsbFwiKSByZXR1cm4gZmFsc2VcbiAgICAgIGlmICh2YWx1ZSA9PSBcImNvbnNpZGVyYXRpb25cIikgcmV0dXJuIChpIDwgYmVmb3JlX3BvcykgfHwgKGkgPiBidWNrZXRzLmxlbmd0aC8yIC0gMSApXG4gICAgICBpZiAodmFsdWUgPT0gXCJ2YWxpZGF0aW9uXCIpIHJldHVybiAoaSA8IGJ1Y2tldHMubGVuZ3RoLzIgKSB8fCAoaSA+IGFmdGVyX3BvcylcbiAgICB9KVxuXG4gIHN1YnNldC5hdHRyKFwiZmlsbFwiLFwiZ3JleVwiKVxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlZmluZV9yZWxhdGl2ZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBSZWZpbmVSZWxhdGl2ZSh0YXJnZXQpXG59XG5cbmNsYXNzIFJlZmluZVJlbGF0aXZlIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICAgIHRoaXMuX29wdGlvbnMgPSBbXG4gICAgICAgIHtcImtleVwiOlwiQWxsXCIsXCJ2YWx1ZVwiOlwiYWxsXCIsIFwic2VsZWN0ZWRcIjoxfVxuICAgICAgLCB7XCJrZXlcIjpcIkNvbnNpZGVyYXRpb25cIixcInZhbHVlXCI6XCJjb25zaWRlcmF0aW9uXCIsIFwic2VsZWN0ZWRcIjowfVxuICAgICAgLCB7XCJrZXlcIjpcIlZhbGlkYXRpb25cIixcInZhbHVlXCI6XCJ2YWxpZGF0aW9uXCIsIFwic2VsZWN0ZWRcIjowfVxuICAgIF1cbiAgICB0aGlzLl9zdW1tYXJ5X2hlYWRlcnMgPSBbXG4gICAgICAgIHtcImtleVwiOlwibmFtZVwiLFwidmFsdWVcIjpcIlwifVxuICAgICAgLCB7XCJrZXlcIjpcImFsbFwiLFwidmFsdWVcIjpcIkFsbFwifVxuICAgICAgLCB7XCJrZXlcIjpcImNvbnNpZGVyYXRpb25cIixcInZhbHVlXCI6XCJDb25zaWRlcmF0aW9uXCJ9XG4gICAgICAsIHtcImtleVwiOlwidmFsaWRhdGlvblwiLFwidmFsdWVcIjpcIlZhbGlkYXRpb25cIn1cbiAgICBdXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIixcImRvbWFpblwiLFwic3RhZ2VzXCIsXCJiZWZvcmVfdXJsc1wiLFwiYWZ0ZXJfdXJsc1wiLFwic3VtbWFyeV9oZWFkZXJzXCIsXCJvcHRpb25zXCJdIH1cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHRkID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwicmVmaW5lLXJlbGF0aXZlXCIpXG4gICAgdmFyIGJlZm9yZV91cmxzID0gdGhpcy5fYmVmb3JlX3VybHNcbiAgICAgICwgYWZ0ZXJfdXJscyA9IHRoaXMuX2FmdGVyX3VybHNcbiAgICAgICwgZCA9IHRoaXMuX2RhdGFcbiAgICAgICwgc3RhZ2VzID0gdGhpcy5fc3RhZ2VzXG4gICAgICAsIHN1bW1hcnlfaGVhZGVycyA9IHRoaXMuX3N1bW1hcnlfaGVhZGVyc1xuICAgICAgLCBvcHRpb25zID0gdGhpcy5fb3B0aW9uc1xuXG4gICAgdmFyIGJlZm9yZV9wb3MsIGFmdGVyX3BvcztcblxuICAgIGJ1Y2tldHMubWFwKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgIGlmIChzdGFnZXMuY29uc2lkZXJhdGlvbiA9PSB4KSBiZWZvcmVfcG9zID0gaVxuICAgICAgIGlmIChzdGFnZXMudmFsaWRhdGlvbiA9PSB4KSBhZnRlcl9wb3MgPSBpXG4gICAgfSlcblxuICAgIHZhciBvdmVyYWxsX3JvbGx1cCA9IHJvbGx1cEJlZm9yZUFuZEFmdGVyKGJlZm9yZV91cmxzLCBhZnRlcl91cmxzKVxuICAgIHZhciB7XG4gICAgICAgIHVybF9zdW1tYXJ5XG4gICAgICAsIHVybHNcbiAgICAgICwgdXJsc19jb25zaWRcbiAgICAgICwgdXJsc192YWxpZFxuXG4gICAgICAsIGt3c19zdW1tYXJ5XG4gICAgICAsIGt3c1xuICAgICAgLCBrd3NfY29uc2lkXG4gICAgICAsIGt3c192YWxpZCBcblxuICAgIH0gPSBwcm9jZXNzRGF0YShiZWZvcmVfdXJscyxhZnRlcl91cmxzLGJlZm9yZV9wb3MsYWZ0ZXJfcG9zLHRoaXMuX2RvbWFpbilcblxuXG4gICAgY29uc3Qgc3VtbWFyeV9yb3cgPSBkM19jbGFzcyh0ZCxcInN1bW1hcnktcm93XCIpXG5cbiAgICBkM19jbGFzcyhzdW1tYXJ5X3JvdyxcInRpdGxlXCIpXG4gICAgICAudGV4dChcIkJlZm9yZSBhbmQgQWZ0ZXI6IFwiICsgdGhpcy5fZG9tYWluKVxuXG4gICAgYmVmb3JlX2FmdGVyX3RpbWVzZXJpZXMoc3VtbWFyeV9yb3cpXG4gICAgICAuZGF0YShvdmVyYWxsX3JvbGx1cClcbiAgICAgIC5iZWZvcmUoYmVmb3JlX3BvcylcbiAgICAgIC5hZnRlcihhZnRlcl9wb3MpXG4gICAgICAuZHJhdygpXG5cbiAgICB2YXIgdm9wdGlvbnMgPSB2ZXJ0aWNhbF9vcHRpb24oc3VtbWFyeV9yb3cpXG4gICAgICAub3B0aW9ucyhvcHRpb25zKVxuICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgb3B0aW9ucy5tYXAoeiA9PiB6LnNlbGVjdGVkID0geC5rZXkgPT0gei5rZXkgPyAxOiAwKVxuICAgICAgICB2b3B0aW9uc1xuICAgICAgICAgIC5vcHRpb25zKG9wdGlvbnMpIFxuICAgICAgICAgIC5kcmF3KClcblxuICAgICAgICBzZWxlY3RPcHRpb25SZWN0KHRkLG9wdGlvbnMsYmVmb3JlX3BvcyxhZnRlcl9wb3MpXG4gICAgICB9KVxuICAgICAgLmRyYXcoKVxuXG4gICAgZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJkZXNjcmlwdGlvblwiKVxuICAgICAgLnRleHQoXCJTZWxlY3QgZG9tYWlucyBhbmQga2V5d29yZHMgdG8gYnVpbGQgYW5kIHJlZmluZSB5b3VyIGdsb2JhbCBmaWx0ZXJcIilcblxuXG5cblxuICAgIGNvbnN0IHRhYmxlcyA9IGQzX2NsYXNzKHRkLFwidGFibGVzLXJvd1wiKVxuXG4gICAgc3VtbWFyeV90YWJsZShkM19jbGFzcyh0YWJsZXMsXCJ1cmxcIikpXG4gICAgICAudGl0bGUoXCJVUkwgU3VtbWFyeVwiKVxuICAgICAgLmRhdGEodXJsX3N1bW1hcnkpXG4gICAgICAuaGVhZGVycyhzdW1tYXJ5X2hlYWRlcnMpXG4gICAgICAuZHJhdygpXG5cbiAgICBzdW1tYXJ5X3RhYmxlKGQzX2NsYXNzKHRhYmxlcyxcImt3XCIpKVxuICAgICAgLnRpdGxlKFwiS2V5d29yZCBTdW1tYXJ5XCIpXG4gICAgICAuZGF0YShrd3Nfc3VtbWFyeSlcbiAgICAgIC5oZWFkZXJzKHN1bW1hcnlfaGVhZGVycylcbiAgICAgIC5kcmF3KClcblxuXG5cblxuICAgIGNvbnN0IG1vZGlmeSA9IGQzX2NsYXNzKHRkLFwibW9kaWZ5LXJvd1wiKVxuXG4gICAgZDNfY2xhc3MobW9kaWZ5LFwiYWN0aW9uLWhlYWRlclwiKVxuICAgICAgLnRleHQoXCJFeHBsb3JlIGFuZCBSZWZpbmVcIilcblxuICAgIHRhYnVsYXJfdGltZXNlcmllcyhkM19jbGFzcyhtb2RpZnksXCJ1cmwtZGVwdGhcIikpXG4gICAgICAuaGVhZGVycyhbXCJCZWZvcmVcIixcIkFmdGVyXCJdKVxuICAgICAgLmxhYmVsKFwiVVJMXCIpXG4gICAgICAuZGF0YSh1cmxzKVxuICAgICAgLnNwbGl0KHRoaXMuZG9tYWluKCkpXG4gICAgICAuZHJhdygpXG5cbiAgICB0YWJ1bGFyX3RpbWVzZXJpZXMoZDNfY2xhc3MobW9kaWZ5LFwia3ctZGVwdGhcIikpXG4gICAgICAuaGVhZGVycyhbXCJCZWZvcmVcIixcIkFmdGVyXCJdKVxuICAgICAgLmxhYmVsKFwiS2V5d29yZHNcIilcbiAgICAgIC5kYXRhKGt3cylcbiAgICAgIC5kcmF3KClcblxuICB9XG5cbn1cblxuXG4iLCJ2YXIgYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKHgqNjApIH0pXG5idWNrZXRzID0gYnVja2V0cy5jb25jYXQoWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZygteCo2MCkgfSkpXG5cbmV4cG9ydCBjb25zdCB0aW1lQnVja2V0cyA9IGJ1Y2tldHM7XG5cblxuY29uc3QgZm9ybWF0TmFtZSA9IGZ1bmN0aW9uKHgpIHtcblxuICBpZiAoeCA8IDApIHggPSAteFxuXG4gIGlmICh4ID09IDM2MDApIHJldHVybiBcIjEgaHJcIlxuICBpZiAoeCA8IDM2MDApIHJldHVybiB4LzYwICsgXCIgbWluc1wiIFxuXG4gIGlmICh4ID09IDg2NDAwKSByZXR1cm4gXCIxIGRheVwiXG4gIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gIHJldHVybiB4LzM2MDAgKyBcIiBocnNcIlxufVxuXG5leHBvcnQgY29uc3QgdGltaW5nSGVhZGVycyA9IGJ1Y2tldHMubWFwKHggPT4geyByZXR1cm4ge1wia2V5XCI6eCwgXCJ2YWx1ZVwiOmZvcm1hdE5hbWUoeCksIFwic2VsZWN0ZWRcIjp0cnVlfSB9KVxuIiwiaW1wb3J0IHt0aW1lQnVja2V0c30gZnJvbSAnLi9yZWxhdGl2ZV90aW1pbmdfY29uc3RhbnRzJztcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVJvd1NpbXBsZShyb3cpIHtcblxuICB2YXIgaXRlbXMgPSAwXG5cbiAgdmFyIG1lYW4gPSB0aW1lQnVja2V0cy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgIGlmIChyb3dbY10gJiYgcm93W2NdICE9IFwiXCIpIHtcbiAgICAgIGl0ZW1zICsrIFxuICAgICAgcCArPSByb3dbY10gfHwgMFxuICAgIH1cbiAgICByZXR1cm4gcFxuICB9LDApL2l0ZW1zXG5cbiAgdGltZUJ1Y2tldHMubWFwKGIgPT4ge1xuICAgIGlmIChyb3dbYl0pIHJvd1tiXSA9IHJvd1tiXSA+IG1lYW4gPyBcbiAgICAgIE1hdGgucm91bmQoKHJvd1tiXSAtIG1lYW4pL21lYW4qMTApLzEwIDogXG4gICAgICBNYXRoLnJvdW5kKC0obWVhbiAtIHJvd1tiXSkvbWVhbioxMCkvMTBcbiAgfSlcblxuICByZXR1cm4gcm93XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVCeUNhdGVnb3J5KGNhdGVnb3JpZXMpIHtcblxuICByZXR1cm4gZnVuY3Rpb24gbm9ybWFsaXplKHJvdykge1xuICAgIGNvbnN0IGNhdF9pZGYgPSAoKGNhdGVnb3JpZXNbcm93LnBhcmVudF9jYXRlZ29yeV9uYW1lXSAmJiBjYXRlZ29yaWVzW3Jvdy5wYXJlbnRfY2F0ZWdvcnlfbmFtZV0uaWRmKSAgfHwgMC4wMzIpICogMTAwMDAwXG4gICAgbGV0IGlkZiA9IHJvdy5pZGYgPT0gXCJOQVwiID8gMTQzNDUvMTAwIDogcm93LmlkZlxuICAgIGlkZiA9IChyb3cua2V5LnNwbGl0KFwiLlwiKSkubGVuZ3RoID4gMiA/IGlkZiouMSA6IGlkZlxuXG4gICAgdGltZUJ1Y2tldHMubWFwKGIgPT4ge1xuXG4gICAgICBpZiAocm93W2JdKSByb3dbYl0gPSBNYXRoLmxvZygxICsgKHJvd1tiXS9NYXRoLnNxcnQocm93LnRvdGFsKSkqKHJvd1tiXSpyb3dbYl0pKihpZGYpKigxL2NhdF9pZGYpKVxuICAgIH0pXG4gICAgcmV0dXJuIHJvd1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVCeUNvbHVtbnModmFsdWVzKSB7XG5cbiAgdmFyIHRiID0gdGltZUJ1Y2tldHMucmVkdWNlKChwLGMpID0+IHsgcFtjXSA9MDsgcmV0dXJuIHB9LCB7fSlcbiAgXG4gIHZhciB0b3RhbHMgPSB2YWx1ZXMucmVkdWNlKCh0Yixyb3cpID0+IHtcbiAgICB0aW1lQnVja2V0cy5tYXAoYiA9PiB7XG4gICAgICB0YltiXSArPSByb3dbYl0gfHwgMFxuICAgIH0pXG4gICAgcmV0dXJuIHRiXG4gIH0sdGIpXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIG5vcm1hbGl6ZShyb3cpIHtcbiAgICB0aW1lQnVja2V0cy5tYXAoYiA9PiB7XG4gICAgICBpZiAocm93W2JdKSByb3dbYl0gPSBNYXRoLnJvdW5kKHJvd1tiXS90b3RhbHNbYl0qMTAwMCkvMTAgXG4gICAgfSlcbiAgICByZXR1cm4gcm93XG4gIH1cbn1cblxuXG5leHBvcnQgY29uc3QgY2F0ZWdvcnlXZWlnaHRzID0gKGNhdGVnb3JpZXMpID0+IHtcbiAgcmV0dXJuIGNhdGVnb3JpZXMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIHBbYy5rZXldID0gKDEgKyBjLnZhbHVlc1swXS5wZXJjZW50X2RpZmYpXG4gICAgICByZXR1cm4gcFxuICAgIH0se30pXG59XG5cbnZhciB0MSA9IHRpbWVCdWNrZXRzLnNsaWNlKDAsMTEpLm1hcCh4ID0+IHBhcnNlSW50KHgpICkucmV2ZXJzZSgpXG52YXIgdDIgPSBbMF0uY29uY2F0KHQxKVxudmFyIHQzID0gdDEubWFwKCh2LGkpID0+IGkgPyAodiAtIHQyW2ldKS90MltpXSA6IDEgKVxuXG5leHBvcnQgY29uc3Qgbm9ybWFsaXplcnMgPSB0My5yZWR1Y2UoKHAsYykgPT4ge1xuICBwW3AubGVuZ3RoXSA9IHBbcC5sZW5ndGgtMV0qY1xuICBwW3AubGVuZ3RoXSA9IHBbcC5sZW5ndGgtMV0qYyooMSsoKHAubGVuZ3RoLTEpLzEwKSlcbiAgcmV0dXJuIHBcbn0sWzFdKVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplKHRvdGFscykge1xuXG4gIHZhciBub3JtZCA9IG5vcm1hbGl6ZXJzLnNsaWNlKDEpLm1hcCgoeCxpKSA9PiB7XG4gICAgdmFyIGsgPSB0MVtpXVxuICAgIHJldHVybiAodG90YWxzW1N0cmluZyhrKV0gfHwgMCkveFxuICB9KVxuXG4gIHZhciBiYXNlVmFsdWUgPSBkMy5zdW0obm9ybWQpL25vcm1kLmZpbHRlcih4ID0+IHgpLmxlbmd0aFxuICB2YXIgZXN0aW1hdGVzID0gbm9ybWFsaXplcnMubWFwKHggPT4geCpiYXNlVmFsdWUpXG5cbiAgdmFyIG5vcm1hbGl6ZWQgPSB0MS5tYXAoKGssaSkgPT4gMSArICgodG90YWxzW1N0cmluZyhrKV0gfHwgMCkgLyBlc3RpbWF0ZXNbaV0pIClcbiAgICAubWFwKE1hdGgubG9nKVxuXG4gIHZhciBub3JtYWxpemVkMiA9IHQxLm1hcCgoayxpKSA9PiAxICsgKCh0b3RhbHNbXCItXCIgKyBTdHJpbmcoayldIHx8IDApIC8gZXN0aW1hdGVzW2ldKSApXG4gICAgLm1hcChNYXRoLmxvZylcblxuICB2YXIgdmFsdWVzID0gbm9ybWFsaXplZC5yZXZlcnNlKCkuY29uY2F0KG5vcm1hbGl6ZWQyKS5tYXAoeCA9PiB4ID8geCA6IFwiXCIgKVxuXG4gIHJldHVybiB2YWx1ZXNcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVJvdyh4KSB7XG4gIHZhciBub3JtZWQgPSBub3JtYWxpemUoeClcbiAgdmFyIG9iaiA9IHt9XG4gIHQxLnNsaWNlKCkucmV2ZXJzZSgpLmNvbmNhdCh0MS5tYXAoeCA9PiBcIi1cIiArIHgpKS5tYXAoKHgsaSkgPT4gb2JqW3hdID0gbm9ybWVkW2ldKVxuXG4gIHJldHVybiBPYmplY3QuYXNzaWduKHt9LHgsb2JqKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdG90YWxzQnlUaW1lKHZhbHVlcykge1xuICByZXR1cm4gdmFsdWVzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgT2JqZWN0LmtleXMoYykubWFwKGsgPT4ge1xuICAgICAgcFtrXSArPSBjW2tdXG4gICAgfSlcbiAgICByZXR1cm4gcFxuICB9LCB0aW1lQnVja2V0cy5yZWR1Y2UoKHAsYykgPT4geyBwW2NdID0gMDsgcmV0dXJuIHAgfSwge30pKVxufVxuXG5cbmV4cG9ydCBjb25zdCBjb21wdXRlU2NhbGUgPSAoZGF0YSkgPT4ge1xuICBjb25zdCBtYXggPSBkYXRhLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgdGltZUJ1Y2tldHMubWFwKHggPT4ge1xuICAgICAgcCA9IE1hdGguYWJzKGNbeF0pID4gcCA/IE1hdGguYWJzKGNbeF0pIDogcFxuICAgIH0pXG4gIFxuICAgIHJldHVybiBwXG4gIH0sMClcblxuICByZXR1cm4gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoWzAsLjhdKS5kb21haW4oWzAsTWF0aC5sb2cobWF4KV0pXG59XG4iLCJpbXBvcnQge25vb3AsIGlkZW50aXR5LCBkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgZDNfY2xhc3MsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4uLy4uL2dlbmVyaWMvc2VsZWN0J1xuaW1wb3J0IGRhdGFfc2VsZWN0b3IgZnJvbSAnLi4vLi4vZ2VuZXJpYy9kYXRhX3NlbGVjdG9yJ1xuaW1wb3J0IG9iamVjdF9zZWxlY3RvciBmcm9tICcuLi8uLi9nZW5lcmljL29iamVjdF9zZWxlY3RvcidcblxuXG5cbmltcG9ydCB0YWJsZSBmcm9tICd0YWJsZSdcblxuaW1wb3J0IHJlZmluZV9yZWxhdGl2ZSBmcm9tICcuL3JlZmluZV9yZWxhdGl2ZSdcbmltcG9ydCB7Y2F0ZWdvcnlXZWlnaHRzLCBjb21wdXRlU2NhbGUsIG5vcm1hbGl6ZVJvd1NpbXBsZSwgbm9ybWFsaXplUm93LCBub3JtYWxpemUsIHRvdGFsc0J5VGltZSwgbm9ybWFsaXplQnlDb2x1bW5zLCBub3JtYWxpemVCeUNhdGVnb3J5fSBmcm9tICcuL3JlbGF0aXZlX3RpbWluZ19wcm9jZXNzJ1xuaW1wb3J0IHt0aW1pbmdIZWFkZXJzLCB0aW1lQnVja2V0c30gZnJvbSAnLi9yZWxhdGl2ZV90aW1pbmdfY29uc3RhbnRzJ1xuaW1wb3J0IHtkcmF3U3RyZWFtLCBkcmF3U3RyZWFtU2tpbm55fSBmcm9tICcuLi9zdW1tYXJ5L2JlZm9yZV9hbmRfYWZ0ZXInXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuXG5pbXBvcnQgdGltZXNlcmllcyBmcm9tICcuLi8uLi9nZW5lcmljL3RpbWVzZXJpZXMnXG5cblxuaW1wb3J0ICcuL3JlbGF0aXZlX3RpbWluZy5jc3MnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlbGF0aXZlX3RpbWluZyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBSZWxhdGl2ZVRpbWluZyh0YXJnZXQpXG59XG5cbmNsYXNzIFJlbGF0aXZlVGltaW5nIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJ0cmFuc2Zvcm1cIiwgXCJzb3J0XCIsIFwiYXNjZW5kaW5nXCJdIH1cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgICAsIGZpbHRlcmVkID0gZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnNlbGVjdGVkfSlcbiAgICAgICwgc2VsZWN0ZWQgPSBmaWx0ZXJlZC5sZW5ndGggPyBmaWx0ZXJlZFswXSA6IGRhdGFbMF1cblxuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwic3VtbWFyeS13cmFwXCIpXG5cbiAgICBoZWFkZXIod3JhcClcbiAgICAgIC50ZXh0KFwiQmVmb3JlIGFuZCBBZnRlclwiKVxuICAgICAgLmRyYXcoKVxuXG5cbiAgICB2YXIgdG90YWxzX2J5X3RpbWU9IHRvdGFsc0J5VGltZShzZWxlY3RlZC52YWx1ZXMpXG4gICAgdmFyIHZhbHVlcyA9IG5vcm1hbGl6ZSh0b3RhbHNfYnlfdGltZSlcblxuICAgIGZ1bmN0aW9uIHRvZ2dsZVZhbHVlcyh4KSB7XG4gICAgICBiYXdyYXAuY2xhc3NlZChcInNob3ctdmFsdWVzXCIsdGhpcy5jaGVja2VkKVxuICAgIH1cblxuICAgIHRoaXMub24oXCJ0b2dnbGUudmFsdWVzXCIsdG9nZ2xlVmFsdWVzKVxuXG4gICAgdmFyIHRzID0gZDNfY2xhc3Mod3JhcCxcInRpbWVzZXJpZXMtcm93XCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLHNlbGVjdGVkLmtleSA9PSBcIlRvcCBDYXRlZ29yaWVzXCIgPyBcIjBweFwiIDogbnVsbClcblxuICAgIHZhciBPUFRJT05TID0gW1xuICAgICAgICAgIHtcImtleVwiOlwiQWN0aXZpdHlcIixcInZhbHVlXCI6ZmFsc2V9XG4gICAgICAgICwge1wia2V5XCI6XCJJbnRlbnQgU2NvcmVcIixcInZhbHVlXCI6XCJub3JtYWxpemVcIn1cbiAgICAgICAgLCB7XCJrZXlcIjpcIkltcG9ydGFuY2VcIixcInZhbHVlXCI6XCJpbXBvcnRhbmNlXCJ9XG4gICAgICAgICwge1wia2V5XCI6XCJQZXJjZW50YWdlXCIsXCJ2YWx1ZVwiOlwicGVyY2VudFwifVxuICAgICAgICAsIHtcImtleVwiOlwiUGVyY2VudCBEaWZmXCIsXCJ2YWx1ZVwiOlwicGVyY2VudF9kaWZmXCJ9XG4gICAgICBdXG5cbiAgICBkYXRhX3NlbGVjdG9yKHRzKVxuICAgICAgLmRhdGFzZXRzKGRhdGEpXG4gICAgICAudHJhbnNmb3JtcyhPUFRJT05TKVxuICAgICAgLnNlbGVjdGVkX3RyYW5zZm9ybSh0aGlzLnRyYW5zZm9ybSgpKVxuICAgICAgLm9uKFwidG9nZ2xlLnZhbHVlc1wiLCB0aGlzLm9uKFwidG9nZ2xlLnZhbHVlc1wiKSApXG4gICAgICAub24oXCJ0cmFuc2Zvcm0uY2hhbmdlXCIsIHRoaXMub24oXCJ0cmFuc2Zvcm0uY2hhbmdlXCIpIClcbiAgICAgIC5vbihcImRhdGFzZXQuY2hhbmdlXCIsIHggPT4geyB0aGlzLm9uKFwic2VsZWN0XCIpKHgpIH0pXG4gICAgICAuZHJhdygpXG5cbiAgICB2YXIgc3RyZWFtX3dyYXAgPSBkM19jbGFzcyh0cyxcInN0cmVhbS13cmFwXCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNjgycHhcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixzZWxlY3RlZC5rZXkgPT0gXCJUb3AgQ2F0ZWdvcmllc1wiID8gXCJub25lXCIgOiBcImlubGluZS1ibG9ja1wiKVxuICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcImJvdHRvbVwiKVxuXG4gICAgdmFyIGRldGFpbHMgPSBkM19jbGFzcyh0cyxcImRldGFpbHMtd3JhcFwiLFwic3ZnXCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjU1cHhcIilcbiAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjAwcHhcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixzZWxlY3RlZC5rZXkgPT0gXCJUb3AgQ2F0ZWdvcmllc1wiID8gXCJub25lXCIgOiBcImlubGluZS1ibG9ja1wiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTE0MHB4XCIpXG4gICAgICAuc3R5bGUoXCJmbG9hdFwiLFwibGVmdFwiKVxuXG5cbiAgICB2YXIgc3RhZ2VzID0gZHJhd1N0cmVhbVNraW5ueShzdHJlYW1fd3JhcCxzZWxlY3RlZC5kYXRhLmJlZm9yZV9jYXRlZ29yaWVzLHNlbGVjdGVkLmRhdGEuYWZ0ZXJfY2F0ZWdvcmllcyxub29wKVxuXG4gICAgb2JqZWN0X3NlbGVjdG9yKHN0cmVhbV93cmFwKVxuICAgICAgLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAgIC5rZXkoKHgsaSkgPT4geyByZXR1cm4geFswXS5rZXkgfSlcbiAgICAgIC5vbihcIm1vdXNlb3V0XCIsZnVuY3Rpb24oa2V5LHNlbGVjdGlvbnMpIHtcbiAgICAgICAgc3RyZWFtX3dyYXBcbiAgICAgICAgICAuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIjFcIilcblxuICAgICAgICBiYXdyYXAuc2VsZWN0QWxsKFwidGJvZHlcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwidHJcIilcbiAgICAgICAgICAuY2xhc3NlZChcImhpZGUtY2F0ZWdvcnlcIiwgZmFsc2UpXG5cbiAgICAgIH0pXG4gICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKGtleSxzZWxlY3Rpb25zKSB7XG5cbiAgICAgICAgc3RyZWFtX3dyYXBcbiAgICAgICAgICAuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgICAgIC5maWx0ZXIoeCA9PiB7XG4gICAgICAgICAgICBpZiAoIXhbMF0pIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgdmFyIGsgPSB4WzBdLmtleVxuXG4gICAgICAgICAgICB2YXIgYm9vbCA9IHNlbGVjdGlvbnNcbiAgICAgICAgICAgICAgLmZpbHRlcihzID0+IHsgcmV0dXJuIGsgPT0gc30pXG4gICAgICAgICAgICAgIC5tYXAoeCA9PiB4KVxuXG4gICAgICAgICAgICByZXR1cm4gYm9vbC5sZW5ndGhcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jbGFzc2VkKFwic2VsZWN0ZWRcIix0cnVlKVxuXG5cbiAgICAgIH0pXG4gICAgICAub24oXCJpbnRlcmFjdFwiLGZ1bmN0aW9uKGtleSxzZWxlY3Rpb25zKSB7XG5cbiAgICAgICAgc3RyZWFtX3dyYXAuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIjFcIilcbiAgICAgICAgICAuZmlsdGVyKHggPT4ge1xuICAgICAgICAgICAgaWYgKCF4WzBdKSByZXR1cm4gZmFsc2VcblxuICAgICAgICAgICAgdmFyIGJvb2wgPSBzZWxlY3Rpb25zXG4gICAgICAgICAgICAgIC5maWx0ZXIocyA9PiB7IHJldHVybiB4WzBdLmtleSA9PSBzfSlcbiAgICAgICAgICAgICAgLm1hcCh4ID0+IHgpXG5cbiAgICAgICAgICAgIHJldHVybiAhYm9vbC5sZW5ndGhcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIi42XCIpXG5cbiAgICAgICAgYmF3cmFwLnNlbGVjdEFsbChcInRib2R5XCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcInRyXCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJoaWRlLWNhdGVnb3J5XCIsIGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgICB2YXIgYm9vbCA9ICBzZWxlY3Rpb25zLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMVxuICAgICAgICAgICAgcmV0dXJuICFib29sXG4gICAgICAgICAgfSlcblxuICAgICAgICBjb25zdCBjYXRfd3JhcCA9IGQzX2NsYXNzKGRldGFpbHMsXCJjYXRcIixcImdcIilcbiAgICAgICAgZDNfY2xhc3MoY2F0X3dyYXAsXCJ0aXRsZVwiLFwidGV4dFwiKS50ZXh0KFwiQ2F0ZWdvcmllcyBTZWxlY3RlZDpcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAuYXR0cihcInhcIiwxNSlcbiAgICAgICAgICAuYXR0cihcInlcIiwgMTUpXG5cblxuICAgICAgICB2YXIgY2F0cyA9IGQzX3VwZGF0ZWFibGUoY2F0X3dyYXAsXCIuY2F0c1wiLFwiZ1wiLHNlbGVjdGlvbnMseCA9PiAxKVxuICAgICAgICAgIC5jbGFzc2VkKFwiY2F0c1wiLHRydWUpXG5cblxuICAgICAgICB2YXIgY2F0ID0gY2F0cy5zZWxlY3RBbGwoXCIuY2F0XCIpXG4gICAgICAgICAgLmRhdGEoeCA9PiB4KVxuXG4gICAgICAgIGNhdFxuICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAuY2xhc3NlZChcImNhdFwiLHRydWUpXG4gICAgICAgICAgLmF0dHIoXCJ4XCIsMTUpXG4gICAgICAgICAgLmF0dHIoXCJ5XCIsKHgsaSkgPT4gMzAgKyAoaSsxKSoxNSlcblxuICAgICAgICBjYXRcbiAgICAgICAgICAudGV4dChTdHJpbmcpXG4gICAgICAgIFxuICAgICAgICBjYXQuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICAgICAgXG5cblxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcblxuXG5cbiAgICB2YXIgdGltZV93cmFwID0gZDNfY2xhc3ModHMsXCJ0aW1lLXdyYXBcIilcbiAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIiwgXCJyaWdodFwiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsIFwiNjNweFwiKVxuXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodGltZV93cmFwLFwic3ZnXCIsXCJzdmdcIikuYXR0cihcIndpZHRoXCIsNjgyKS5hdHRyKFwiaGVpZ2h0XCIsODApXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJib3R0b21cIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcblxuXG5cbiAgICB2YXIgc3RzID0gc2ltcGxlVGltZXNlcmllcyhzdmcsdmFsdWVzLDY4Miw4MCwtMilcblxuICAgIG9iamVjdF9zZWxlY3RvcihzdHMpXG4gICAgICAuc2VsZWN0QWxsKFwicmVjdFwiKVxuICAgICAgLmtleSgoeCxpKSA9PiB0aW1lQnVja2V0c1tpXSlcbiAgICAgIC5vbihcIm1vdXNlb3V0XCIsZnVuY3Rpb24oa2V5LHNlbGVjdGlvbnMpIHtcblxuICAgICAgICBiYXdyYXAuc2VsZWN0QWxsKFwidGJvZHlcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwidHJcIilcbiAgICAgICAgICAuY2xhc3NlZChcImhpZGUtdGltZVwiLCBmYWxzZSlcblxuICAgICAgfSlcbiAgICAgIC5vbihcImludGVyYWN0XCIsZnVuY3Rpb24oa2V5LHNlbGVjdGlvbnMpIHtcblxuICAgICAgICB2YXIgdHIgPSBiYXdyYXAuc2VsZWN0QWxsKFwidGJvZHlcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwidHJcIilcbiAgICAgICAgICAuY2xhc3NlZChcImhpZGUtdGltZVwiLCBmdW5jdGlvbih4KSB7IFxuICAgICAgICAgICAgdmFyIGJvb2wgPSBzZWxlY3Rpb25zLmZpbHRlcihzID0+IHsgcmV0dXJuIHhbc10gIT0gdW5kZWZpbmVkICYmIHhbc10gIT0gXCJcIiB9KSBcbiAgICAgICAgICAgIHJldHVybiAhYm9vbC5sZW5ndGggXG4gICAgICAgICAgfSlcblxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcblxuXG4gICAgY29uc3QgY2F0ZWdvcmllcyA9IGRhdGFbMF0uZGF0YS5jYXRlZ29yeS5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgcFtjLmtleV0gPSBjXG4gICAgICByZXR1cm4gcFxuICAgIH0se30pXG5cbiAgICB2YXIgYmF3cmFwID0gZDNfY2xhc3Mod3JhcCxcImJhLXJvd1wiKVxuICAgICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiNjAwcHhcIilcblxuICAgIHZhciBub3JtQnlDb2wgPSBub3JtYWxpemVCeUNvbHVtbnMoc2VsZWN0ZWQudmFsdWVzKVxuXG4gICAgY29uc3Qgc29ydGVkX3RhYnVsYXIgPSBzZWxlY3RlZC52YWx1ZXMuZmlsdGVyKHggPT4geC5rZXkgIT0gXCJcIilcbiAgICAgIC5tYXAoXG4gICAgICAgIHRoaXMudHJhbnNmb3JtKCkgPT0gXCJub3JtYWxpemVcIiA/ICBub3JtYWxpemVSb3cgOiBcbiAgICAgICAgdGhpcy50cmFuc2Zvcm0oKSA9PSBcInBlcmNlbnRcIiA/IG5vcm1hbGl6ZUJ5Q29sdW1ucyhzZWxlY3RlZC52YWx1ZXMpIDogXG4gICAgICAgIHRoaXMudHJhbnNmb3JtKCkgPT0gXCJwZXJjZW50X2RpZmZcIiA/IHJvdyA9PiBub3JtYWxpemVSb3dTaW1wbGUoIG5vcm1CeUNvbChyb3cpICkgOiBcbiAgICAgICAgdGhpcy50cmFuc2Zvcm0oKSA9PSBcImltcG9ydGFuY2VcIiAmJiBzZWxlY3RlZC5rZXkuaW5kZXhPZihcIkNhdFwiKSA9PSAtMSA/IG5vcm1hbGl6ZUJ5Q2F0ZWdvcnkoY2F0ZWdvcmllcykgOiBcbiAgICAgICAgaWRlbnRpdHlcbiAgICAgIClcbiAgICAgIC5zbGljZSgwLDEwMDApXG5cbiAgICBjb25zdCBvc2NhbGUgPSBjb21wdXRlU2NhbGUoc29ydGVkX3RhYnVsYXIpXG4gICAgY29uc3QgaGVhZGVycyA9IFt7XCJrZXlcIjpcImtleVwiLCBcInZhbHVlXCI6c2VsZWN0ZWQua2V5LnJlcGxhY2UoXCJUb3AgXCIsXCJcIil9XS5jb25jYXQodGltaW5nSGVhZGVycylcblxuXG4gICAgY29uc3QgX2RlZmF1bHQgPSBcIjYwMFwiXG4gICAgY29uc3QgcyA9IHRoaXMuc29ydCgpIFxuICAgIGNvbnN0IGFzYyA9IHRoaXMuYXNjZW5kaW5nKCkgXG5cblxuICAgIGNvbnN0IHNlbGVjdGVkSGVhZGVyID0gaGVhZGVycy5maWx0ZXIoeCA9PiB4LmtleSA9PSBzKVxuICAgIGNvbnN0IHNvcnRieSA9IHNlbGVjdGVkSGVhZGVyLmxlbmd0aCA/IHNlbGVjdGVkSGVhZGVyWzBdLmtleSA6IF9kZWZhdWx0XG5cbiAgICB0YWJsZShiYXdyYXApXG4gICAgICAudG9wKDE0MClcbiAgICAgIC5oZWFkZXJzKGhlYWRlcnMpXG4gICAgICAuc29ydChzb3J0YnksYXNjKVxuICAgICAgLm9uKFwic29ydFwiLCB0aGlzLm9uKFwic29ydFwiKSlcbiAgICAgIC5vbihcImV4cGFuZFwiLGZ1bmN0aW9uKGQsdGQpIHtcblxuICAgICAgICBsZXQgX2RhdGEgPSBkYXRhWzBdLmRhdGFcblxuICAgICAgICByZWZpbmVfcmVsYXRpdmUodGQpXG4gICAgICAgICAgLmRhdGEoZClcbiAgICAgICAgICAuZG9tYWluKGQua2V5KVxuICAgICAgICAgIC5zdGFnZXMoc3RhZ2VzKVxuICAgICAgICAgIC5iZWZvcmVfdXJscyhfZGF0YS5iZWZvcmUuZmlsdGVyKHkgPT4geS5kb21haW4gPT0gZC5rZXkpIClcbiAgICAgICAgICAuYWZ0ZXJfdXJscyhfZGF0YS5hZnRlci5maWx0ZXIoeSA9PiB5LmRvbWFpbiA9PSBkLmtleSkpXG4gICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgIH0pXG4gICAgICAub24oXCJkcmF3XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCJ0aFwiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCJzcGFuXCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJsZXNzLXRoYW5cIiwgKHgpID0+IHsgcmV0dXJuIHBhcnNlSW50KHgua2V5KSA9PSB4LmtleSAmJiB4LmtleSA8IDAgfSlcbiAgICAgICAgICAuY2xhc3NlZChcImdyZWF0ZXItdGhhblwiLCAoeCkgPT4geyByZXR1cm4gcGFyc2VJbnQoeC5rZXkpID09IHgua2V5ICYmIHgua2V5ID4gMCB9KVxuXG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCIudGFibGUtb3B0aW9uXCIpXG4gICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwibm9uZVwiKVxuXG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpub3QoOmZpcnN0LWNoaWxkKVwiKVxuICAgICAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkIHdoaXRlXCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX19beFsna2V5J11dIHx8IDBcbiAgICAgICAgICAgIHZhciBzbHVnID0gdmFsdWUgPiAwID8gXCJyZ2JhKDcwLCAxMzAsIDE4MCxcIiA6IFwicmdiYSgyNDQsIDEwOSwgNjcsXCJcbiAgICAgICAgICAgIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG4gICAgICAgICAgICByZXR1cm4gc2x1ZyArIG9zY2FsZShNYXRoLmxvZyh2YWx1ZSsxKSkgKyBcIilcIlxuICAgICAgICAgIH0pICAgICBcbiAgICAgIH0pXG4gICAgICAub3B0aW9uX3RleHQoXCI8ZGl2IHN0eWxlPSd3aWR0aDo0MHB4O3RleHQtYWxpZ246Y2VudGVyJz4mIzY1MjkxOzwvZGl2PlwiKVxuICAgICAgLmRhdGEoe1widmFsdWVzXCI6c29ydGVkX3RhYnVsYXJ9KVxuICAgICAgLmRyYXcoKVxuXG4gIH1cbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBhZ2dyZWdhdGVDYXRlZ29yeSh1cmxzKSB7XG4gIGNvbnN0IGNhdGVnb3JpZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImFydGljbGVzXCI6IHZcbiAgICAgICAgLCBcInZhbHVlXCI6IGQzLnN1bSh2LHggPT4geC51bmlxdWVzKVxuICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHVybHMpXG4gICAgLm1hcChmdW5jdGlvbih2KSB7IHJldHVybiBPYmplY3QuYXNzaWduKHYudmFsdWVzLHtrZXk6IHYua2V5fSkgfSlcblxuICBjb25zdCB0b3RhbCA9IGQzLnN1bShjYXRlZ29yaWVzLGMgPT4gYy52YWx1ZSlcblxuICBjYXRlZ29yaWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5wZXJjZW50ID0geC52YWx1ZSAvIHRvdGFsXG4gIH0pXG5cbiAgcmV0dXJuIGNhdGVnb3JpZXNcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFnZ3JlZ2F0ZUNhdGVnb3J5SG91cih1cmxzKSB7XG4gIHJldHVybiBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSArIHguaG91ciArIHgubWludXRlfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB2WzBdLnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICwgXCJob3VyXCI6IHZbMF0uaG91clxuICAgICAgICAsIFwibWludXRlXCI6IHZbMF0ubWludXRlIFxuICAgICAgICAsIFwiY291bnRcIjogdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy5jb3VudCB9LDApXG4gICAgICAgICwgXCJhcnRpY2xlc1wiOiB2XG4gICAgICB9XG4gICAgfSlcbiAgICAuZW50cmllcyh1cmxzKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3J5UmVsYXRpdmVTaXplKHVybHMpIHtcbiAgcmV0dXJuIGQzLm5lc3QoKVxuICAgIC5rZXkoeCA9PiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lKVxuICAgIC5yb2xsdXAodiA9PiB2WzBdLmNhdGVnb3J5X2lkZiA/IDEvdlswXS5jYXRlZ29yeV9pZGYgOiAwKVxuICAgIC5tYXAodXJscykgXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yeVBlcmNlbnQodXJscykge1xuXG4gIGNvbnN0IHJlbGF0aXZlX3NpemUgPSBjYXRlZ29yeVJlbGF0aXZlU2l6ZSh1cmxzKVxuICBjb25zdCB0b3RhbCA9IGQzLnN1bShPYmplY3Qua2V5cyhjYXRlZ29yaWVzKS5tYXAoeCA9PiBjYXRlZ29yaWVzW3hdKSlcbiAgY29uc3QgcGVyY2VudCA9IHt9XG5cbiAgT2JqZWN0LmtleXMoY2F0ZWdvcmllcykubWFwKHggPT4ge1xuICAgIHBlcmNlbnRbeF0gPSByZWxhdGl2ZV9zaXplW3hdL3RvdGFsXG4gIH0pXG5cbiAgcmV0dXJuIHBlcmNlbnRcbn1cblxuZnVuY3Rpb24gY2F0ZWdvcnlSZWR1Y2VyKGdyb3VwKSB7XG4gIHJldHVybiBncm91cC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG4gICAgICByZXR1cm4gcFxuICAgIH0sXG4gICAgeyBcbiAgICAgICAgYXJ0aWNsZXM6IHt9XG4gICAgICAsIHZpZXdzOiAwXG4gICAgICAsIHNlc3Npb25zOiAwXG4gICAgICAsIHBvcF9zaXplOiBncm91cFswXS5jYXRlZ29yeV9pZGYgPyAxL2dyb3VwWzBdLmNhdGVnb3J5X2lkZiA6IDBcbiAgICAgICwgaWRmOiBncm91cFswXS5jYXRlZ29yeV9pZGZcbiAgICB9KVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcnlSb2xsKHVybHMpIHtcbiAgY29uc3Qgcm9sbGVkID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbihrKSB7IHJldHVybiBrLnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLnJvbGx1cChjYXRlZ29yeVJlZHVjZXIpXG4gICAgLmVudHJpZXModXJscylcblxuICBjb25zdCBwb3BfdG90YWwgPSBkMy5zdW0ocm9sbGVkLHggPT4geC52YWx1ZXMucG9wX3NpemUpXG4gIGNvbnN0IHZpZXdzX3RvdGFsID0gZDMuc3VtKHJvbGxlZCx4ID0+IHgudmFsdWVzLnZpZXdzKVxuXG4gIHJvbGxlZC5tYXAoeCA9PiB7XG4gICAgeC52YWx1ZXMucmVhbF9wb3BfcGVyY2VudCA9IHgudmFsdWVzLnBvcF9wZXJjZW50ID0gKHgudmFsdWVzLnBvcF9zaXplIC8gcG9wX3RvdGFsICogMTAwKVxuICAgIHgudmFsdWVzLnBlcmNlbnQgPSB4LnZhbHVlcy52aWV3cy92aWV3c190b3RhbFxuXG4gIH0pXG5cbiAgcmV0dXJuIHJvbGxlZFxufVxuXG52YXIgbW9kaWZ5V2l0aENvbXBhcmlzb25zID0gZnVuY3Rpb24oZHMpIHtcblxuICB2YXIgYWdncyA9IGRzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICBwLnBvcF9tYXggPSAocC5wb3BfbWF4IHx8IDApIDwgYy5wb3AgPyBjLnBvcCA6IHAucG9wX21heFxuICAgIHAucG9wX3RvdGFsID0gKHAucG9wX3RvdGFsIHx8IDApICsgYy5wb3BcblxuICAgIGlmIChjLnNhbXApIHtcbiAgICAgIHAuc2FtcF9tYXggPSAocC5zYW1wX21heCB8fCAwKSA+IGMuc2FtcCA/IHAuc2FtcF9tYXggOiBjLnNhbXBcbiAgICAgIHAuc2FtcF90b3RhbCA9IChwLnNhbXBfdG90YWwgfHwgMCkgKyBjLnNhbXBcbiAgICB9XG5cbiAgICByZXR1cm4gcFxuICB9LHt9KVxuXG4gIC8vY29uc29sZS5sb2coYWdncylcblxuICBkcy5tYXAoZnVuY3Rpb24obykge1xuICAgIG8ubm9ybWFsaXplZF9wb3AgPSBvLnBvcCAvIGFnZ3MucG9wX21heFxuICAgIG8ucGVyY2VudF9wb3AgPSBvLnBvcCAvIGFnZ3MucG9wX3RvdGFsXG5cbiAgICBvLm5vcm1hbGl6ZWRfc2FtcCA9IG8uc2FtcCAvIGFnZ3Muc2FtcF9tYXhcbiAgICBvLnBlcmNlbnRfc2FtcCA9IG8uc2FtcCAvIGFnZ3Muc2FtcF90b3RhbFxuXG4gICAgby5ub3JtYWxpemVkX2RpZmYgPSAoby5ub3JtYWxpemVkX3NhbXAgLSBvLm5vcm1hbGl6ZWRfcG9wKS9vLm5vcm1hbGl6ZWRfcG9wXG4gICAgby5wZXJjZW50X2RpZmYgPSAoby5wZXJjZW50X3NhbXAgLSBvLnBlcmNlbnRfcG9wKS9vLnBlcmNlbnRfcG9wXG4gIH0pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yeVN1bW1hcnkoc2FtcF91cmxzLHBvcF91cmxzKSB7XG5cbiAgY29uc3Qgc2FtcF9yb2xsZWQgPSBjYXRlZ29yeVJvbGwoc2FtcF91cmxzKVxuICAgICwgcG9wX3JvbGxlZCA9IGNhdGVnb3J5Um9sbChwb3BfdXJscylcbiAgICAsIG1hcHBlZF9jYXRfcm9sbCA9IHNhbXBfcm9sbGVkLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgXG4gICAgICAgIHBbYy5rZXldID0gYzsgXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LCB7fSlcblxuICBjb25zdCBjYXRfc3VtbWFyeSA9IHBvcF9yb2xsZWQubWFwKGZ1bmN0aW9uKHgpIHtcblxuICAgIFt4LnZhbHVlc10ubWFwKHkgPT4ge1xuICAgICAgICB5LmtleSA9IHgua2V5XG4gICAgICAgIHkucG9wID0geS52aWV3c1xuICAgICAgICB5LnNhbXAgPSBtYXBwZWRfY2F0X3JvbGxbeC5rZXldID8gbWFwcGVkX2NhdF9yb2xsW3gua2V5XS52YWx1ZXMudmlld3MgOiAwXG5cbiAgICAgICAgeS5zYW1wbGVfcGVyY2VudF9ub3JtID0geS5zYW1wbGVfcGVyY2VudCA9IHkucGVyY2VudCoxMDBcbiAgICAgICAgeS5pbXBvcnRhbmNlID0gTWF0aC5sb2coKDEveS5wb3Bfc2l6ZSkqeS5zYW1wKnkuc2FtcClcbiAgICAgICAgeS5yYXRpbyA9IHkuc2FtcGxlX3BlcmNlbnQveS5yZWFsX3BvcF9wZXJjZW50XG4gICAgICAgIHkudmFsdWUgPSB5LnNhbXBcbiAgICB9KVxuXG5cbiAgICByZXR1cm4geC52YWx1ZXNcbiAgfSkuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGIucG9wIC0gYS5wb3B9KVxuICAgIC5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgIT0gXCJOQVwiIH0pXG5cbiAgbW9kaWZ5V2l0aENvbXBhcmlzb25zKGNhdF9zdW1tYXJ5KVxuXG4gIHJldHVybiBjYXRfc3VtbWFyeVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhdGVnb3JpZXModmFsdWUpIHtcblxuICBjb25zdCBjYXRlZ29yaWVzID0gYWdncmVnYXRlQ2F0ZWdvcnkodmFsdWUuZnVsbF91cmxzKVxuICB2YWx1ZVtcImRpc3BsYXlfY2F0ZWdvcmllc1wiXSA9IHtcbiAgICAgIFwia2V5XCI6XCJDYXRlZ29yaWVzXCJcbiAgICAsIFwidmFsdWVzXCI6IGNhdGVnb3JpZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5ICE9IFwiTkFcIiB9KVxuICB9XG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2F0ZWdvcnlIb3VyKHZhbHVlKSB7XG4gIHZhbHVlW1wiY2F0ZWdvcnlfaG91clwiXSA9IGFnZ3JlZ2F0ZUNhdGVnb3J5SG91cih2YWx1ZS5mdWxsX3VybHMpXG59XG4iLCJpbXBvcnQge1xuICBwcmVwRGF0YSwgXG59IGZyb20gJy4uLy4uL2hlbHBlcnMnXG5pbXBvcnQge1xuICBhZ2dyZWdhdGVDYXRlZ29yeVxufSBmcm9tICcuL2NhdGVnb3J5J1xuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0SG91cihoKSB7XG4gIGlmIChoID09IDApIHJldHVybiBcIjEyIGFtXCJcbiAgaWYgKGggPT0gMTIpIHJldHVybiBcIjEyIHBtXCJcbiAgaWYgKGggPiAxMikgcmV0dXJuIChoLTEyKSArIFwiIHBtXCJcbiAgcmV0dXJuIChoIDwgMTAgPyBoWzFdIDogaCkgKyBcIiBhbVwiXG59XG5cbmV4cG9ydCBjb25zdCBob3VyYnVja2V0cyA9IGQzLnJhbmdlKDAsMjQpLm1hcCh4ID0+IFN0cmluZyh4KS5sZW5ndGggPiAxID8gU3RyaW5nKHgpIDogXCIwXCIgKyB4KVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUaW1pbmcodXJscywgY29tcGFyaXNvbikge1xuXG4gIHZhciB0cyA9IHByZXBEYXRhKHVybHMpXG4gICAgLCBwb3BfdHMgPSBwcmVwRGF0YShjb21wYXJpc29uKVxuXG4gIHZhciBtYXBwZWR0cyA9IHRzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjOyByZXR1cm4gcH0sIHt9KVxuXG4gIHZhciBwcmVwcGVkID0gcG9wX3RzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAga2V5OiB4LmtleVxuICAgICAgLCBob3VyOiB4LmhvdXJcbiAgICAgICwgbWludXRlOiB4Lm1pbnV0ZVxuICAgICAgLCB2YWx1ZTI6IHgudmFsdWVcbiAgICAgICwgdmFsdWU6IG1hcHBlZHRzW3gua2V5XSA/ICBtYXBwZWR0c1t4LmtleV0udmFsdWUgOiAwXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBwcmVwcGVkXG59XG5cbmV4cG9ydCBjb25zdCB0aW1pbmdUYWJ1bGFyID0gKGRhdGEsa2V5PVwiZG9tYWluXCIpID0+IHtcbiAgcmV0dXJuIGQzLm5lc3QoKVxuICAgIC5rZXkoeCA9PiB4W2tleV0pXG4gICAgLmtleSh4ID0+IHguaG91cilcbiAgICAuZW50cmllcyhkYXRhKVxuICAgIC5tYXAoeCA9PiB7XG4gICAgICB2YXIgb2JqID0geC52YWx1ZXMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgcFtjLmtleV0gPSBjLnZhbHVlc1xuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7fSlcblxuICAgICAgeC5idWNrZXRzID0gaG91cmJ1Y2tldHMubWFwKHogPT4ge1xuICAgICAgICB2YXIgbyA9IHsgdmFsdWVzOiBvYmpbel0sIGtleTogZm9ybWF0SG91cih6KSB9XG4gICAgICAgIG8udmlld3MgPSBkMy5zdW0ob2JqW3pdIHx8IFtdLCBxID0+IHEudW5pcXVlcylcbiAgICAgICAgcmV0dXJuIG9cbiAgICAgIH0pXG5cbiAgICAgIHgudGFidWxhciA9IHguYnVja2V0cy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBwW2Mua2V5XSA9IGMudmlld3MgfHwgdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICB4LnRhYnVsYXJbXCJrZXlcIl0gPSB4LmtleVxuICAgICAgeC50YWJ1bGFyW1widG90YWxcIl0gPSBkMy5zdW0oeC5idWNrZXRzLHggPT4geC52aWV3cylcbiAgICAgIFxuICAgICAgcmV0dXJuIHgudGFidWxhclxuICAgIH0pXG4gICAgLmZpbHRlcih4ID0+IHgua2V5ICE9IFwiTkFcIilcbn1cbiIsImltcG9ydCB7Zm9ybWF0SG91cn0gZnJvbSAnLi4vLi4vaGVscGVycy9kYXRhX2hlbHBlcnMvdGltaW5nJ1xuXG5leHBvcnQgY29uc3QgaG91cmJ1Y2tldHMgPSBkMy5yYW5nZSgwLDI0KS5tYXAoeCA9PiBTdHJpbmcoeCkubGVuZ3RoID4gMSA/IFN0cmluZyh4KSA6IFwiMFwiICsgeClcblxuZXhwb3J0IGNvbnN0IHRpbWluZ0hlYWRlcnMgPSBob3VyYnVja2V0cy5tYXAoZm9ybWF0SG91cikubWFwKHggPT4geyByZXR1cm4ge2tleTogeCwgdmFsdWU6IHh9IH0pXG4iLCJpbXBvcnQge2hvdXJidWNrZXRzLCB0aW1pbmdIZWFkZXJzfSBmcm9tICcuL3RpbWluZ19jb25zdGFudHMnXG5cblxuZXhwb3J0IGNvbnN0IGNvbXB1dGVTY2FsZSA9IChkYXRhLF9tYXgpID0+IHtcblxuICBjb25zdCBtYXggPSBfbWF4IHx8IDEwMDAgLy8gbmVlZCB0byBhY3R1YWxseSBjb21wdXRlIHRoaXMgZnJvbSBkYXRhXG5cbiAgcmV0dXJuIGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFswLDFdKS5kb21haW4oWzAsTWF0aC5sb2cobWF4KV0pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVSb3cod2VpZ2h0cykge1xuXG4gIHJldHVybiBmdW5jdGlvbiBub3JtYWxpemUoeCxtdWx0KSB7XG4gICAgdmFyIGtleXMgPSB0aW1pbmdIZWFkZXJzLm1hcCh0ID0+IHQua2V5KVxuICAgIHZhciB2YWx1ZXMgPSBrZXlzLm1hcChrID0+IHhba10pXG5cbiAgICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzKVxuXG4gICAgdmFyIGVzdGltYXRlcyA9IE9iamVjdC5rZXlzKHdlaWdodHMpLm1hcChrID0+IE1hdGguc3FydCh3ZWlnaHRzW2tdKnRvdGFsKSApXG5cbiAgICB2YXIgbm9ybWFsaXplZCA9IHZhbHVlcy5tYXAoKGssaSkgPT4gKGsvZXN0aW1hdGVzW2ldKSlcbiAgICB2YXIgdmFsdWVzID0ge31cbiAgICBrZXlzLm1hcCgoayxpKSA9PiB7XG4gICAgICB2YWx1ZXNba10gPSBNYXRoLnJvdW5kKG5vcm1hbGl6ZWRbaV0qbXVsdCB8fCAwKSB8fCBcIlwiXG4gICAgfSlcbiAgICByZXR1cm4gdmFsdWVzXG5cbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgZDNfY2xhc3MsIEQzQ29tcG9uZW50QmFzZSwgbm9vcH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4uLy4uL2dlbmVyaWMvc2VsZWN0J1xuaW1wb3J0IGRhdGFfc2VsZWN0b3IgZnJvbSAnLi4vLi4vZ2VuZXJpYy9kYXRhX3NlbGVjdG9yJ1xuXG5pbXBvcnQgb2JqZWN0X3NlbGVjdG9yIGZyb20gJy4uLy4uL2dlbmVyaWMvb2JqZWN0X3NlbGVjdG9yJ1xuXG5cbmltcG9ydCB0YWJsZSBmcm9tICd0YWJsZSdcbmltcG9ydCAqIGFzIHRpbWVzZXJpZXMgZnJvbSAnLi4vLi4vZ2VuZXJpYy90aW1lc2VyaWVzJ1xuaW1wb3J0IHtkb21haW5fZXhwYW5kZWR9IGZyb20gJ2NvbXBvbmVudCdcbmltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnY2hhcnQnXG5cbmltcG9ydCB7aG91cmJ1Y2tldHMsIHRpbWluZ0hlYWRlcnN9IGZyb20gJy4vdGltaW5nX2NvbnN0YW50cydcbmltcG9ydCB7Y29tcHV0ZVNjYWxlLCBub3JtYWxpemVSb3d9IGZyb20gJy4vdGltaW5nX3Byb2Nlc3MnXG5cblxuXG5pbXBvcnQgJy4vdGltaW5nLmNzcydcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0aW1pbmcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGltaW5nKHRhcmdldClcbn1cblxuY2xhc3MgVGltaW5nIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJ0cmFuc2Zvcm1cIiwgXCJzb3J0XCIsIFwiYXNjZW5kaW5nXCJdIH1cblxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGFcbiAgICAgICwgZmlsdGVyZWQgPSBkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHguc2VsZWN0ZWR9KVxuICAgICAgLCBzZWxlY3RlZCA9IGZpbHRlcmVkLmxlbmd0aCA/IGZpbHRlcmVkWzBdIDogZGF0YVswXVxuXG5cbiAgICB2YXIgd3JhcCA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcInRpbWluZy13cmFwXCIpXG5cblxuXG4gICAgY29uc3QgaGVhZGVycyA9IFt7a2V5Olwia2V5XCIsdmFsdWU6c2VsZWN0ZWQua2V5LnJlcGxhY2UoXCJUb3AgXCIsXCJcIil9XS5jb25jYXQodGltaW5nSGVhZGVycylcbiAgICBjb25zdCBkID0gZGF0YVswXS52YWx1ZXMvL3RpbWluZ1RhYnVsYXIoZGF0YS5mdWxsX3VybHMpXG5cbiAgICBjb25zdCBfZGVmYXVsdCA9IFwidG90YWxcIlxuICAgIGNvbnN0IHMgPSB0aGlzLnNvcnQoKSBcbiAgICBjb25zdCBhc2MgPSB0aGlzLmFzY2VuZGluZygpIFxuXG5cbiAgICBjb25zdCBzZWxlY3RlZEhlYWRlciA9IGhlYWRlcnMuZmlsdGVyKHggPT4geC5rZXkgPT0gcylcbiAgICBjb25zdCBzb3J0YnkgPSBzZWxlY3RlZEhlYWRlci5sZW5ndGggPyBzZWxlY3RlZEhlYWRlclswXS5rZXkgOiBfZGVmYXVsdFxuXG4gICAgY29uc3QgaG91cmx5VG90YWxzID0gc2VsZWN0ZWQudmFsdWVzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICB0aW1pbmdIZWFkZXJzLm1hcChrID0+IHtcbiAgICAgICAgdmFyIGggPSBrLmtleVxuICAgICAgICBwW2hdID0gKHBbaF0gfHwgMCkgKyAoY1toXSB8fCAwKVxuICAgICAgfSlcbiAgICAgIHJldHVybiBwXG4gICAgfSx7fSlcblxuICAgIGNvbnN0IG92ZXJhbGxUb3RhbCA9IGQzLnN1bShPYmplY3Qua2V5cyhob3VybHlUb3RhbHMpLm1hcChrID0+IGhvdXJseVRvdGFsc1trXSkpXG4gICAgY29uc3QgcGVyY2VudFRvdGFscyA9IE9iamVjdC5rZXlzKGhvdXJseVRvdGFscykucmVkdWNlKChwLGspID0+IHtcbiAgICAgIHBba10gPSBob3VybHlUb3RhbHNba10vb3ZlcmFsbFRvdGFsXG4gICAgICByZXR1cm4gcFxuICAgIH0se30pXG5cbiAgICBjb25zdCByb3dWYWx1ZSA9IHNlbGVjdGVkLnZhbHVlcy5tYXAoeCA9PiBNYXRoLnNxcnQoMSArIHgudG90YWwpIClcbiAgICBjb25zdCBub3JtYWxpemVyID0gbm9ybWFsaXplUm93KHBlcmNlbnRUb3RhbHMpXG5cbiAgICB2YXIgbWF4ID0gMFxuICAgIGNvbnN0IHZhbHVlcyA9IHNlbGVjdGVkLnZhbHVlcy5tYXAoKHJvdyxpKSA9PiB7XG4gICAgICBcbiAgICAgIGNvbnN0IG5vcm1lZCA9IHRoaXMudHJhbnNmb3JtKCkgPT0gXCJub3JtYWxpemVcIiA/IG5vcm1hbGl6ZXIocm93LHJvd1ZhbHVlW2ldKSA6IHJvd1xuICAgICAgY29uc3QgbG9jYWxfbWF4ID0gZDMubWF4KHRpbWluZ0hlYWRlcnMubWFwKHggPT4geC5rZXkpLm1hcChrID0+IG5vcm1lZFtrXSkpXG4gICAgICBtYXggPSBsb2NhbF9tYXggPiBtYXggPyBsb2NhbF9tYXggOiBtYXhcblxuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24obm9ybWVkLHtcImtleVwiOnJvdy5rZXl9KVxuICAgIH0pXG5cbmNvbnNvbGUubG9nKG1heClcblxuICAgIGNvbnN0IG9zY2FsZSA9IGNvbXB1dGVTY2FsZSh2YWx1ZXMsbWF4KVxuXG5cbiAgICBoZWFkZXIod3JhcClcbiAgICAgIC50ZXh0KFwiQmVmb3JlIGFuZCBBZnRlclwiKSAvL3NlbGVjdGVkLmtleSlcbiAgICAgIC8vLm9wdGlvbnMoZGF0YSlcbiAgICAgIC8vLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpIHsgdGhpcy5vbihcInNlbGVjdFwiKSh4KSB9LmJpbmQodGhpcykpXG4gICAgICAuZHJhdygpXG5cblxuICAgIHZhciB0cyA9IGQzX2NsYXNzKHdyYXAsXCJ0aW1lc2VyaWVzLXJvd1wiKVxuXG4gICAgdmFyIE9QVElPTlMgPSBbXG4gICAgICAgICAge1wia2V5XCI6XCJBY3Rpdml0eVwiLFwidmFsdWVcIjpmYWxzZX1cbiAgICAgICAgLCB7XCJrZXlcIjpcIlNjb3JlZFwiLFwidmFsdWVcIjpcIm5vcm1hbGl6ZVwifVxuICAgICAgXVxuXG4gICAgICBmdW5jdGlvbiB0b2dnbGVWYWx1ZXMoeCkge1xuICAgICAgICB0aW1pbmd3cmFwLmNsYXNzZWQoXCJzaG93LXZhbHVlc1wiLHRoaXMuY2hlY2tlZClcbiAgICAgIH1cblxuICAgIGRhdGFfc2VsZWN0b3IodHMpXG4gICAgICAuZGF0YXNldHMoZGF0YSlcbiAgICAgIC50cmFuc2Zvcm1zKE9QVElPTlMpXG4gICAgICAuc2VsZWN0ZWRfdHJhbnNmb3JtKHRoaXMudHJhbnNmb3JtKCkpXG4gICAgICAub24oXCJ0b2dnbGUudmFsdWVzXCIsIHRvZ2dsZVZhbHVlcyApXG4gICAgICAub24oXCJ0cmFuc2Zvcm0uY2hhbmdlXCIsIHRoaXMub24oXCJ0cmFuc2Zvcm0uY2hhbmdlXCIpIClcbiAgICAgIC5vbihcImRhdGFzZXQuY2hhbmdlXCIsIHggPT4geyB0aGlzLm9uKFwic2VsZWN0XCIpKHgpIH0pXG4gICAgICAuZHJhdygpXG5cblxuICAgIHZhciBzdmcgPSBkM191cGRhdGVhYmxlKHRzLFwic3ZnXCIsXCJzdmdcIikuYXR0cihcIndpZHRoXCIsNzQ0KS5hdHRyKFwiaGVpZ2h0XCIsODApXG5cbiAgICB2YXIgdG90YWxzID0gdGltaW5nSGVhZGVycy5tYXAoaCA9PiB7XG4gICAgICByZXR1cm4gaG91cmx5VG90YWxzW2gua2V5XVxuICAgIH0pXG5cbiAgICB2YXIgc3RzID0gc2ltcGxlVGltZXNlcmllcyhzdmcsdG90YWxzLDc0NCw4MCwtMSlcblxuICAgIG9iamVjdF9zZWxlY3RvcihzdHMpXG4gICAgICAuc2VsZWN0QWxsKFwicmVjdFwiKVxuICAgICAgLmtleSgoeCxpKSA9PiB0aW1pbmdIZWFkZXJzW2ldLmtleSlcbiAgICAgIC5vbihcIm1vdXNlb3V0XCIsZnVuY3Rpb24oa2V5LHNlbGVjdGlvbnMpIHtcblxuICAgICAgICB0aW1pbmd3cmFwLnNlbGVjdEFsbChcInRib2R5XCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcInRyXCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJoaWRlLXRpbWVcIiwgZmFsc2UpXG5cbiAgICAgIH0pXG4gICAgICAub24oXCJpbnRlcmFjdFwiLGZ1bmN0aW9uKGtleSxzZWxlY3Rpb25zKSB7XG5cbiAgICAgICAgdmFyIHRyID0gdGltaW5nd3JhcC5zZWxlY3RBbGwoXCJ0Ym9keVwiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCJ0clwiKVxuICAgICAgICAgIC5jbGFzc2VkKFwiaGlkZS10aW1lXCIsIGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgICB2YXIgYm9vbCA9IHNlbGVjdGlvbnMuZmlsdGVyKHMgPT4geyByZXR1cm4geFtzXSAhPSB1bmRlZmluZWQgJiYgeFtzXSAhPSBcIlwiIH0pIFxuICAgICAgICAgICAgcmV0dXJuICFib29sLmxlbmd0aCBcbiAgICAgICAgICB9KVxuXG4gICAgICB9KVxuICAgICAgLmRyYXcoKVxuXG5cbiAgICB2YXIgdGltaW5nd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJ0aW1pbmctcm93XCIpXG5cbiAgICB2YXIgdGFibGVfb2JqID0gdGFibGUodGltaW5nd3JhcClcbiAgICAgIC50b3AoMTQwKVxuICAgICAgLmhlYWRlcnMoaGVhZGVycylcbiAgICAgIC5zb3J0KHNvcnRieSxhc2MpXG4gICAgICAub24oXCJzb3J0XCIsIHRoaXMub24oXCJzb3J0XCIpKVxuICAgICAgLmRhdGEoe1widmFsdWVzXCI6dmFsdWVzLnNsaWNlKDAsNTAwKX0pXG4gICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgIC5vbihcImV4cGFuZFwiLGZ1bmN0aW9uKGQsdGQpIHtcblxuICAgICAgICB2YXIgZGQgPSBkYXRhWzBdLmRhdGEuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguZG9tYWluID09IGQua2V5IH0pXG4gICAgICAgIHZhciByb2xsZWQgPSB0aW1lc2VyaWVzLnByZXBEYXRhKGRkKVxuICAgICAgICBcbiAgICAgICAgZG9tYWluX2V4cGFuZGVkKHRkKVxuICAgICAgICAgIC5kb21haW4oZGRbMF0uZG9tYWluKVxuICAgICAgICAgIC5yYXcoZGQpXG4gICAgICAgICAgLmRhdGEocm9sbGVkKVxuICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgIH0pXG4gICAgICAub24oXCJkcmF3XCIsZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm5vdCg6Zmlyc3QtY2hpbGQpXCIpXG4gICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfX1t4WydrZXknXV0gfHwgMFxuICAgICAgICAgICAgcmV0dXJuIFwicmdiYSg3MCwgMTMwLCAxODAsXCIgKyBvc2NhbGUoTWF0aC5sb2codmFsdWUrMSkpICsgXCIpXCJcbiAgICAgICAgICB9KVxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcbiAgICBcbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBkM19jbGFzcyh0YXJnZXQsY2xzLHR5cGUpIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLlwiICsgY2xzLCB0eXBlIHx8IFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN0YWdlZF9maWx0ZXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU3RhZ2VkRmlsdGVyKHRhcmdldClcbn1cblxuY2xhc3MgU3RhZ2VkRmlsdGVyIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICB9XG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuXG4gIG9uKGFjdGlvbiwgZm4pIHtcbiAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG5cbiAgZHJhdygpIHtcbiAgICB2YXIgb3dyYXAgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJmb290ZXItd3JhcFwiKVxuICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjVweFwiKVxuICAgICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiNjBweFwiKVxuICAgICAgLnN0eWxlKFwiYm90dG9tXCIsXCIwcHhcIilcbiAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJmaXhlZFwiKVxuICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMDBweFwiKVxuICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI0YwRjRGN1wiKVxuXG4gICAgdmFyIHdyYXAgPSBkM19jbGFzcyhvd3JhcCxcImlubmVyLXdyYXBcIilcbiAgICAgIC5zdHlsZShcImJvcmRlci10b3BcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiNXB4XCIpXG5cbiAgICBkM19jbGFzcyh3cmFwLFwiaGVhZGVyLWxhYmVsXCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzVweFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxNHB4XCIpXG4gICAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzg4ODg4OFwiKVxuICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjIwMHB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAudGV4dChcIkJ1aWxkIEZpbHRlcnNcIilcblxuICAgIGQzX2NsYXNzKHdyYXAsXCJ0ZXh0LWxhYmVsXCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzVweFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNjBweFwiKVxuICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwibm9uZVwiKVxuICAgICAgLnRleHQoXCJUaXRsZVwiKVxuXG4gICAgdmFyIHNlbGVjdF9ib3ggPSBzZWxlY3Qod3JhcClcbiAgICAgIC5vcHRpb25zKFtcbiAgICAgICAgICB7XCJrZXlcIjpcImNvbnRhaW5zXCIsXCJ2YWx1ZVwiOlwiY29udGFpbnNcIn1cbiAgICAgICAgLCB7XCJrZXlcIjpcImRvZXMgbm90IGNvbnRhaW5cIixcInZhbHVlXCI6XCJkb2VzIG5vdCBjb250YWluXCJ9XG4gICAgICBdKVxuICAgICAgLmRyYXcoKVxuICAgICAgLl9zZWxlY3RcbiAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cblxuXG4gICAgdmFyIGZvb3Rlcl9yb3cgPSBkM19jbGFzcyh3cmFwLFwiZm9vdGVyLXJvd1wiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cblxuICAgIHZhciBzZWxlY3RfdmFsdWUgPSB0aGlzLmRhdGEoKVxuXG4gICAgZnVuY3Rpb24gYnVpbGRGaWx0ZXJJbnB1dCgpIHtcblxuICAgICAgZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkZXN0cm95ID0gZDMuc2VsZWN0KHRoaXMpLm9uKFwiZGVzdHJveVwiKVxuICAgICAgICAgIGlmIChkZXN0cm95KSBkZXN0cm95KClcbiAgICAgICAgfSlcblxuXG4gICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmb290ZXJfcm93LFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgICAgLmF0dHIoXCJ2YWx1ZVwiLHNlbGVjdF92YWx1ZSlcbiAgICAgICAgLnByb3BlcnR5KFwidmFsdWVcIixzZWxlY3RfdmFsdWUpXG5cbiAgICAgIFxuXG5cbiAgICAgIHZhciBzID0gJChzZWxlY3Qubm9kZSgpKS5zZWxlY3RpemUoe1xuICAgICAgICBwZXJzaXN0OiBmYWxzZSxcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxlY3RfdmFsdWUgPSAoc2VsZWN0X3ZhbHVlLmxlbmd0aCA/IHNlbGVjdF92YWx1ZSArIFwiLFwiIDogXCJcIikgKyB4XG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxlY3RfdmFsdWUpXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHZhbHVlOiB4LCB0ZXh0OiB4XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvbkRlbGV0ZTogZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZWN0X3ZhbHVlID0gc2VsZWN0X3ZhbHVlLnNwbGl0KFwiLFwiKS5maWx0ZXIoZnVuY3Rpb24oeikgeyByZXR1cm4geiAhPSB4WzBdfSkuam9pbihcIixcIilcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGVjdF92YWx1ZSlcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGZvb3Rlcl9yb3cuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgIC5vbihcImRlc3Ryb3lcIixmdW5jdGlvbigpIHtcbiAgICAgICAgICBzWzBdLnNlbGVjdGl6ZS5kZXN0cm95KClcbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIGJ1aWxkRmlsdGVySW5wdXQoKVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgZDNfY2xhc3Mod3JhcCxcImluY2x1ZGUtc3VibWl0XCIsXCJidXR0b25cIilcbiAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJyaWdodFwiKVxuICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxMjBweFwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjlweFwiKVxuICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2Y5ZjlmYlwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAuYXR0cihcInR5cGVcIixcInN1Ym1pdFwiKVxuICAgICAgLnRleHQoXCJNb2RpZnkgRmlsdGVyc1wiKVxuICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCJpbnB1dFwiKS5wcm9wZXJ0eShcInZhbHVlXCIpXG4gICAgICAgIHZhciBvcCA9ICBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18ua2V5ICsgXCIuc2VsZWN0aXplXCJcbiAgICAgICAgXG4gICAgICAgIHNlbGYub24oXCJtb2RpZnlcIikoe1wiZmllbGRcIjpcIlRpdGxlXCIsXCJvcFwiOm9wLFwidmFsdWVcIjp2YWx1ZX0pXG4gICAgICB9KVxuXG4gICAgZDNfY2xhc3Mod3JhcCxcImV4Y2x1ZGUtc3VibWl0XCIsXCJidXR0b25cIilcbiAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJyaWdodFwiKVxuICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxMjBweFwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjlweFwiKVxuICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2Y5ZjlmYlwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAuYXR0cihcInR5cGVcIixcInN1Ym1pdFwiKVxuICAgICAgLnRleHQoXCJOZXcgRmlsdGVyXCIpXG4gICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBmb290ZXJfcm93LnNlbGVjdEFsbChcImlucHV0XCIpLnByb3BlcnR5KFwidmFsdWVcIilcbiAgICAgICAgdmFyIG9wID0gIHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXkgKyBcIi5zZWxlY3RpemVcIlxuXG4gICAgICAgIHNlbGYub24oXCJhZGRcIikoe1wiZmllbGRcIjpcIlRpdGxlXCIsXCJvcFwiOm9wLFwidmFsdWVcIjp2YWx1ZX0pXG4gICAgICB9KVxuXG5cbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuL2hlYWRlcidcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBDb25kaXRpb25hbFNob3codGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy5fY2xhc3NlcyA9IHt9XG4gIHRoaXMuX29iamVjdHMgPSB7fVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb25kaXRpb25hbF9zaG93KHRhcmdldCkge1xuICByZXR1cm4gbmV3IENvbmRpdGlvbmFsU2hvdyh0YXJnZXQpXG59XG5cbkNvbmRpdGlvbmFsU2hvdy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBjbGFzc2VkOiBmdW5jdGlvbihrLCB2KSB7XG4gICAgICBpZiAoayA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fY2xhc3Nlc1xuICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2NsYXNzZXNba10gXG4gICAgICB0aGlzLl9jbGFzc2VzW2tdID0gdjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSAgXG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24gKCkge1xuXG4gICAgICB2YXIgY2xhc3NlcyA9IHRoaXMuY2xhc3NlZCgpXG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5jb25kaXRpb25hbC13cmFwXCIsXCJkaXZcIix0aGlzLmRhdGEoKSlcbiAgICAgICAgLmNsYXNzZWQoXCJjb25kaXRpb25hbC13cmFwXCIsdHJ1ZSlcblxuICAgICAgdmFyIG9iamVjdHMgPSBkM19zcGxhdCh3cmFwLFwiLmNvbmRpdGlvbmFsXCIsXCJkaXZcIixpZGVudGl0eSwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpIH0pXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgICAgICAuY2xhc3NlZChcImNvbmRpdGlvbmFsXCIsdHJ1ZSlcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4gIXguc2VsZWN0ZWQgfSlcblxuXG4gICAgICBPYmplY3Qua2V5cyhjbGFzc2VzKS5tYXAoZnVuY3Rpb24oaykgeyBcbiAgICAgICAgb2JqZWN0cy5jbGFzc2VkKGssY2xhc3Nlc1trXSlcbiAgICAgIH0pXG5cbiAgICAgIHRoaXMuX29iamVjdHMgPSBvYmplY3RzXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgXG4gICAgfVxuICAsIGVhY2g6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB0aGlzLmRyYXcoKVxuICAgICAgdGhpcy5fb2JqZWN0cy5lYWNoKGZuKVxuICAgICAgXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIFNoYXJlKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5faW5uZXIgPSBmdW5jdGlvbigpIHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNoYXJlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNoYXJlKHRhcmdldClcbn1cblxuU2hhcmUucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgb3ZlcmxheSA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLm92ZXJsYXlcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIm92ZXJsYXlcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcInJnYmEoMCwwLDAsLjUpXCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIixcIjMwMVwiKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG92ZXJsYXkucmVtb3ZlKClcbiAgICAgICAgfSlcblxuICAgICAgdGhpcy5fb3ZlcmxheSA9IG92ZXJsYXk7XG5cbiAgICAgIHZhciBjZW50ZXIgPSBkM191cGRhdGVhYmxlKG92ZXJsYXksXCIucG9wdXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInBvcHVwIGNvbC1tZC01IGNvbC1zbS04XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCJhdXRvXCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjMwMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjE1MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIndoaXRlXCIpXG4gICAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJub25lXCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgICAgfSlcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHNlbGYuX2lubmVyKGQzLnNlbGVjdCh0aGlzKSlcbiAgICAgICAgfSlcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgaW5uZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB0aGlzLl9pbm5lciA9IGZuLmJpbmQodGhpcylcbiAgICAgIHRoaXMuZHJhdygpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX292ZXJsYXkucmVtb3ZlKClcbiAgICAgIHJldHVybiB0aGlzIFxuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgKiBhcyBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCB7bWVkaWFfcGxhbn0gZnJvbSAnbWVkaWFfcGxhbidcbmltcG9ydCBmaWx0ZXJfdmlldyBmcm9tICcuL3ZpZXdzL2ZpbHRlcl92aWV3J1xuaW1wb3J0IG9wdGlvbl92aWV3IGZyb20gJy4vdmlld3Mvb3B0aW9uX3ZpZXcnXG5pbXBvcnQgZG9tYWluX3ZpZXcgZnJvbSAnLi92aWV3cy9kb21haW5fdmlldydcbmltcG9ydCBzZWdtZW50X3ZpZXcgZnJvbSAnLi92aWV3cy9zZWdtZW50X3ZpZXcnXG5pbXBvcnQgc3VtbWFyeV92aWV3IGZyb20gJy4vdmlld3Mvc3VtbWFyeS92aWV3J1xuaW1wb3J0IHJlbGF0aXZlX3ZpZXcgZnJvbSAnLi92aWV3cy9yZWxhdGl2ZV90aW1pbmcvdmlldydcbmltcG9ydCB0aW1pbmdfdmlldyBmcm9tICcuL3ZpZXdzL3RpbWluZy92aWV3J1xuaW1wb3J0IHN0YWdlZF9maWx0ZXJfdmlldyBmcm9tICcuL3ZpZXdzL3N0YWdlZF9maWx0ZXJfdmlldydcblxuXG5cblxuXG5pbXBvcnQgY29uZGl0aW9uYWxfc2hvdyBmcm9tICcuL2dlbmVyaWMvY29uZGl0aW9uYWxfc2hvdydcblxuaW1wb3J0IHNoYXJlIGZyb20gJy4vZ2VuZXJpYy9zaGFyZSdcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4vaGVscGVycydcbmltcG9ydCAqIGFzIHRyYW5zZm9ybSBmcm9tICcuL2hlbHBlcnMnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5leHBvcnQgZnVuY3Rpb24gTmV3RGFzaGJvYXJkKHRhcmdldCkge1xuICB0aGlzLnRhcmdldCA9IHRhcmdldFxuICB0aGlzLl9vbiA9IHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG5ld19kYXNoYm9hcmQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgTmV3RGFzaGJvYXJkKHRhcmdldClcbn1cblxuTmV3RGFzaGJvYXJkLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIHRyYW5zZm9ybTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRyYW5zZm9ybVwiLHZhbCkgfHwgXCJcIlxuICAgIH1cbiAgLCBzdGFnZWRfZmlsdGVyczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInN0YWdlZF9maWx0ZXJzXCIsdmFsKSB8fCBcIlwiXG4gICAgfVxuICAsIG1lZGlhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibWVkaWFcIix2YWwpIFxuICAgIH1cbiAgLCBzYXZlZDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNhdmVkXCIsdmFsKSBcbiAgICB9XG4gICwgbGluZV9pdGVtczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxpbmVfaXRlbXNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIHNlbGVjdGVkX2FjdGlvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlbGVjdGVkX2FjdGlvblwiLHZhbCkgXG4gICAgfVxuICAsIHNlbGVjdGVkX2NvbXBhcmlzb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsdmFsKSBcbiAgICB9XG4gICwgYWN0aW9uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25fZGF0ZVwiLHZhbCkgXG4gICAgfVxuICAsIGNvbXBhcmlzb25fZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNvbXBhcmlzb25fZGF0ZVwiLHZhbCkgXG4gICAgfVxuXG4gICwgdmlld19vcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidmlld19vcHRpb25zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBsb2dpY19vcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibG9naWNfb3B0aW9uc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgZXhwbG9yZV90YWJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZXhwbG9yZV90YWJzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBsb2dpY19jYXRlZ29yaWVzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibG9naWNfY2F0ZWdvcmllc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgYWN0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFjdGlvbnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIHN1bW1hcnk6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCB0aW1lX3N1bW1hcnk6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aW1lX3N1bW1hcnlcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIHRpbWVfdGFiczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpbWVfdGFic1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgY2F0ZWdvcnlfc3VtbWFyeTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNhdGVnb3J5X3N1bW1hcnlcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGtleXdvcmRfc3VtbWFyeTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImtleXdvcmRfc3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgYmVmb3JlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmVmb3JlXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBiZWZvcmVfdGFiczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJlZm9yZV90YWJzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBhZnRlcjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFmdGVyXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBmaWx0ZXJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZmlsdGVyc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgbG9hZGluZzogZnVuY3Rpb24odmFsKSB7XG4gICAgICBpZiAodmFsICE9PSB1bmRlZmluZWQpIHRoaXMuX3NlZ21lbnRfdmlldyAmJiB0aGlzLl9zZWdtZW50X3ZpZXcuaXNfbG9hZGluZyh2YWwpLmRyYXcoKVxuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsb2FkaW5nXCIsdmFsKVxuICAgIH1cbiAgLCBzb3J0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic29ydFwiLHZhbClcbiAgICB9XG4gICwgYXNjZW5kaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYXNjZW5kaW5nXCIsdmFsKVxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcblxuICAgICAgdmFyIGRhdGEgPSB0aGlzLmRhdGEoKVxuICAgICAgdmFyIG1lZGlhID0gdGhpcy5tZWRpYSgpXG5cbiAgICAgIHZhciBvcHRpb25zID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnZpZXdfb3B0aW9ucygpKSlcbiAgICAgIHZhciB0YWJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmV4cGxvcmVfdGFicygpKSlcblxuXG4gICAgICB2YXIgbG9naWMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMubG9naWNfb3B0aW9ucygpKSlcbiAgICAgICAgLCBjYXRlZ29yaWVzID0gdGhpcy5sb2dpY19jYXRlZ29yaWVzKClcbiAgICAgICAgLCBmaWx0ZXJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmZpbHRlcnMoKSkpXG4gICAgICAgICwgYWN0aW9ucyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5hY3Rpb25zKCkpKVxuICAgICAgICAsIHN0YWdlZF9maWx0ZXJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnN0YWdlZF9maWx0ZXJzKCkpKVxuXG5cblxuICAgICAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdGhpcy5fc2VnbWVudF92aWV3ID0gc2VnbWVudF92aWV3KHRhcmdldClcbiAgICAgICAgLmlzX2xvYWRpbmcoc2VsZi5sb2FkaW5nKCkgfHwgZmFsc2UpXG4gICAgICAgIC5zZWdtZW50cyhhY3Rpb25zKVxuICAgICAgICAuZGF0YShzZWxmLnN1bW1hcnkoKSlcbiAgICAgICAgLmFjdGlvbihzZWxmLnNlbGVjdGVkX2FjdGlvbigpIHx8IHt9KVxuICAgICAgICAuYWN0aW9uX2RhdGUoc2VsZi5hY3Rpb25fZGF0ZSgpIHx8IFwiXCIpXG4gICAgICAgIC5jb21wYXJpc29uX2RhdGUoc2VsZi5jb21wYXJpc29uX2RhdGUoKSB8fCBcIlwiKVxuXG4gICAgICAgIC5jb21wYXJpc29uKHNlbGYuc2VsZWN0ZWRfY29tcGFyaXNvbigpIHx8IHt9KVxuICAgICAgICAub24oXCJjaGFuZ2VcIiwgdGhpcy5vbihcImFjdGlvbi5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiLCB0aGlzLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJjb21wYXJpc29uLmNoYW5nZVwiLCB0aGlzLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIiwgdGhpcy5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiLCBmdW5jdGlvbigpIHsgIFxuICAgICAgICAgIHZhciBzcyA9IHNoYXJlKGQzLnNlbGVjdChcImJvZHlcIikpLmRyYXcoKVxuICAgICAgICAgIHNzLmlubmVyKGZ1bmN0aW9uKHRhcmdldCkge1xuXG4gICAgICAgICAgICB2YXIgaGVhZGVyID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuaGVhZGVyXCIsXCJoNFwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImhlYWRlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJPcGVuIGEgc2F2ZWQgZGFzaGJvYXJkXCIpXG5cbiAgICAgICAgICAgIHZhciBmb3JtID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJkaXZcIixcImRpdlwiLHNlbGYuc2F2ZWQoKSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjI1JVwiKVxuXG4gICAgICAgICAgICBpZiAoIXNlbGYuc2F2ZWQoKSB8fCBzZWxmLnNhdmVkKCkubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShmb3JtLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgICAgICAgICAgIC50ZXh0KFwiWW91IGN1cnJlbnRseSBoYXZlIG5vIHNhdmVkIGRhc2hib2FyZHNcIilcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGQzX3NwbGF0KGZvcm0sXCIucm93XCIsXCJhXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubmFtZSB9KVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgICAgICAgICAvLy5hdHRyKFwiaHJlZlwiLCB4ID0+IHguZW5kcG9pbnQpXG4gICAgICAgICAgICAgICAgLnRleHQoeCA9PiB4Lm5hbWUpXG4gICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgICAgLy8gSEFDSzogVEhJUyBpcyBoYWNreS4uLlxuICAgICAgICAgICAgICAgICAgdmFyIF9zdGF0ZSA9IHN0YXRlLnFzKHt9KS5mcm9tKFwiP1wiICsgeC5lbmRwb2ludC5zcGxpdChcIj9cIilbMV0pXG5cbiAgICAgICAgICAgICAgICAgIHNzLmhpZGUoKVxuICAgICAgICAgICAgICAgICAgd2luZG93Lm9ucG9wc3RhdGUoe3N0YXRlOiBfc3RhdGV9KVxuICAgICAgICAgICAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgICAub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgICB2YXIgc3MgPSBzaGFyZShkMy5zZWxlY3QoXCJib2R5XCIpKS5kcmF3KClcbiAgICAgICAgICBzcy5pbm5lcihmdW5jdGlvbih0YXJnZXQpIHtcblxuICAgICAgICAgICAgdmFyIGhlYWRlciA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLmhlYWRlclwiLFwiaDRcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJoZWFkZXJcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LWZhbWlseVwiLFwiUHJveGltYU5vdmEsIHNhbnMtc2VyaWZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiU2F2ZSB0aGlzIGRhc2hib2FyZDpcIilcblxuICAgICAgICAgICAgdmFyIGZvcm0gPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdlwiLFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG4gICAgICAgICAgICB2YXIgbmFtZSA9IGQzX3VwZGF0ZWFibGUoZm9ybSwgXCIubmFtZVwiLCBcImRpdlwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKG5hbWUsXCIubGFiZWxcIixcImRpdlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiRGFzaGJvYXJkIE5hbWU6XCIpXG5cbiAgICAgICAgICAgIHZhciBuYW1lX2lucHV0ID0gZDNfdXBkYXRlYWJsZShuYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNzBweFwiKVxuICAgICAgICAgICAgICAuYXR0cihcInBsYWNlaG9sZGVyXCIsXCJNeSBhd2Vzb21lIHNlYXJjaFwiKVxuXG4gICAgICAgICAgICB2YXIgYWR2YW5jZWQgPSBkM191cGRhdGVhYmxlKGZvcm0sIFwiLmFkdmFuY2VkXCIsIFwiZGV0YWlsc1wiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImFkdmFuY2VkXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjQwMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImxlZnRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCJhdXRvXCIpXG5cblxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKGFkdmFuY2VkLFwiLmxhYmVsXCIsXCJkaXZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAudGV4dChcIkxpbmUgSXRlbTpcIilcblxuICAgICAgICAgICAgdmFyIHNlbGVjdF9ib3ggPSBzZWxlY3QoYWR2YW5jZWQpXG4gICAgICAgICAgICAgIC5vcHRpb25zKHNlbGYubGluZV9pdGVtcygpLm1hcCh4ID0+IHsgcmV0dXJuIHtrZXk6eC5saW5lX2l0ZW1fbmFtZSwgdmFsdWU6IHgubGluZV9pdGVtX2lkfSB9KSApXG4gICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI3MHB4XCIpXG5cblxuXG5cbiAgICAgICAgICAgIHZhciBzZW5kID0gZDNfdXBkYXRlYWJsZShmb3JtLCBcIi5zZW5kXCIsIFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VuZFwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc2VuZCxcImJ1dHRvblwiLFwiYnV0dG9uXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxNnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjEwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJTZW5kXCIpXG4gICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gbmFtZV9pbnB1dC5wcm9wZXJ0eShcInZhbHVlXCIpIFxuICAgICAgICAgICAgICAgIHZhciBsaW5lX2l0ZW0gPSBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnMubGVuZ3RoID8gc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleSA6IGZhbHNlXG5cbiAgICAgICAgICAgICAgICBkMy54aHIoXCIvY3J1c2hlci9zYXZlZF9kYXNoYm9hcmRcIilcbiAgICAgICAgICAgICAgICAgIC5wb3N0KEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBuYW1lXG4gICAgICAgICAgICAgICAgICAgICAgLCBcImVuZHBvaW50XCI6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAsIFwibGluZV9pdGVtXCI6IGxpbmVfaXRlbVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgKVxuXG4gICAgICAgICAgICAgICAgc3MuaGlkZSgpXG5cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLnRleHQoXCJTYXZlXCIpXG5cblxuXG4gICAgICAgICAgfSlcblxuXG4gICAgICAgIH0pXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgaWYgKHRoaXMuc3VtbWFyeSgpID09IGZhbHNlKSByZXR1cm4gZmFsc2VcblxuICAgICAgZmlsdGVyX3ZpZXcodGFyZ2V0KVxuICAgICAgICAubG9naWMobG9naWMpXG4gICAgICAgIC5jYXRlZ29yaWVzKGNhdGVnb3JpZXMpXG4gICAgICAgIC5maWx0ZXJzKGZpbHRlcnMpXG4gICAgICAgIC5kYXRhKGRhdGEpXG4gICAgICAgIC5vbihcImxvZ2ljLmNoYW5nZVwiLCB0aGlzLm9uKFwibG9naWMuY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJmaWx0ZXIuY2hhbmdlXCIsIHRoaXMub24oXCJmaWx0ZXIuY2hhbmdlXCIpKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIG9wdGlvbl92aWV3KHRhcmdldClcbiAgICAgICAgLmRhdGEob3B0aW9ucylcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIHRoaXMub24oXCJ2aWV3LmNoYW5nZVwiKSApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgY29uZGl0aW9uYWxfc2hvdyh0YXJnZXQpXG4gICAgICAgIC5kYXRhKG9wdGlvbnMpXG4gICAgICAgIC5jbGFzc2VkKFwidmlldy1vcHRpb25cIix0cnVlKVxuICAgICAgICAuZHJhdygpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgIGlmICgheC5zZWxlY3RlZCkgcmV0dXJuXG5cbiAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwiZGF0YS12aWV3XCIpIHtcbiAgICAgICAgICAgIHZhciBkdiA9IGRvbWFpbl92aWV3KGR0aGlzKVxuICAgICAgICAgICAgICAub3B0aW9ucyh0YWJzKVxuICAgICAgICAgICAgICAuZGF0YShkYXRhKVxuICAgICAgICAgICAgICAuc29ydChzZWxmLnNvcnQoKSlcbiAgICAgICAgICAgICAgLmFzY2VuZGluZyhzZWxmLmFzY2VuZGluZygpKVxuICAgICAgICAgICAgICAub24oXCJzZWxlY3RcIiwgc2VsZi5vbihcInRhYi5jaGFuZ2VcIikgKVxuICAgICAgICAgICAgICAub24oXCJzb3J0XCIsIHNlbGYub24oXCJzb3J0LmNoYW5nZVwiKSApXG5cbiAgICAgICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgICAgICBzdGFnZWRfZmlsdGVycyA9IHN0YWdlZF9maWx0ZXJzLnNwbGl0KFwiLFwiKS5jb25jYXQoeC5rZXkgfHwgeC51cmwpLmZpbHRlcih4ID0+IHgubGVuZ3RoKS5qb2luKFwiLFwiKVxuICAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKHN0YWdlZF9maWx0ZXJzKVxuICAgICAgICAgICAgICAgSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZF9maWx0ZXJzKVxuICAgIFxuICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwibWVkaWEtdmlld1wiKSB7XG4gICAgICAgICAgICBtZWRpYV9wbGFuKGR0aGlzLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xNXB4XCIpLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCItMTVweFwiKSlcbiAgICAgICAgICAgICAuZGF0YShkYXRhKVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcImJhLXZpZXdcIikge1xuICAgICAgICAgICAgcmVsYXRpdmVfdmlldyhkdGhpcylcbiAgICAgICAgICAgICAudHJhbnNmb3JtKHNlbGYudHJhbnNmb3JtKCkpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi5iZWZvcmVfdGFicygpKVxuICAgICAgICAgICAgIC5zb3J0KHNlbGYuc29ydCgpKVxuICAgICAgICAgICAgIC5hc2NlbmRpbmcoc2VsZi5hc2NlbmRpbmcoKSlcbiAgICAgICAgICAgICAub24oXCJ0cmFuc2Zvcm0uY2hhbmdlXCIsIHNlbGYub24oXCJ0cmFuc2Zvcm0uY2hhbmdlXCIpIClcbiAgICAgICAgICAgICAub24oXCJzZWxlY3RcIiwgc2VsZi5vbihcInRhYi5jaGFuZ2VcIikgKVxuICAgICAgICAgICAgIC5vbihcInNvcnRcIiwgc2VsZi5vbihcInNvcnQuY2hhbmdlXCIpIClcbiAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcInN1bW1hcnktdmlld1wiKSB7XG4gICAgICAgICAgICBzdW1tYXJ5X3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi5zdW1tYXJ5KCkpXG4gICAgICAgICAgICAgLnRpbWluZyhzZWxmLnRpbWVfc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC5jYXRlZ29yeShzZWxmLmNhdGVnb3J5X3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAuYmVmb3JlKHNlbGYuYmVmb3JlKCkpXG4gICAgICAgICAgICAgLy8uYWZ0ZXIoc2VsZi5hZnRlcigpKVxuICAgICAgICAgICAgIC5rZXl3b3JkcyhzZWxmLmtleXdvcmRfc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC5vbihcImJhLnNvcnRcIixzZWxmLm9uKFwiYmEuc29ydFwiKSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJ0aW1pbmctdmlld1wiKSB7XG4gICAgICAgICAgICB0aW1pbmdfdmlldyhkdGhpcylcbiAgICAgICAgICAgICAuZGF0YShzZWxmLnRpbWVfdGFicygpKVxuICAgICAgICAgICAgIC50cmFuc2Zvcm0oc2VsZi50cmFuc2Zvcm0oKSlcbiAgICAgICAgICAgICAuc29ydChzZWxmLnNvcnQoKSlcbiAgICAgICAgICAgICAuYXNjZW5kaW5nKHNlbGYuYXNjZW5kaW5nKCkpXG4gICAgICAgICAgICAgLm9uKFwidHJhbnNmb3JtLmNoYW5nZVwiLCBzZWxmLm9uKFwidHJhbnNmb3JtLmNoYW5nZVwiKSApXG4gICAgICAgICAgICAgLm9uKFwic2VsZWN0XCIsIHNlbGYub24oXCJ0YWIuY2hhbmdlXCIpIClcbiAgICAgICAgICAgICAub24oXCJzb3J0XCIsIHNlbGYub24oXCJzb3J0LmNoYW5nZVwiKSApXG5cbiAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuICAgICAgZnVuY3Rpb24gSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZCkge1xuXG4gICAgICAgIHN0YWdlZF9maWx0ZXJfdmlldyh0YXJnZXQpXG4gICAgICAgICAgLmRhdGEoc3RhZ2VkKVxuICAgICAgICAgIC5vbihcInVwZGF0ZVwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKSh4KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9uKFwibW9kaWZ5XCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKFwiXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwibW9kaWZ5LWZpbHRlclwiKSh4KVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAub24oXCJhZGRcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoXCJcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJhZGQtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZHJhdygpXG4gICAgICB9XG4gICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBnZXREYXRhKGFjdGlvbixkYXlzX2Fnbykge1xuICByZXR1cm4gZnVuY3Rpb24oY2Ipe1xuICAgIGNvbnNvbGUubG9nKGRheXNfYWdvKVxuXG4gICAgdmFyIFVSTCA9IFwiL2NydXNoZXIvdjIvdmlzaXRvci9kb21haW5zX2Z1bGxfdGltZV9taW51dGUvY2FjaGU/dXJsX3BhdHRlcm49XCIgKyBhY3Rpb24udXJsX3BhdHRlcm5bMF0gKyBcIiZmaWx0ZXJfaWQ9XCIgKyBhY3Rpb24uYWN0aW9uX2lkXG5cbiAgICB2YXIgZGF0ZV9hZ28gPSBuZXcgRGF0ZSgrbmV3IERhdGUoKS0yNCo2MCo2MCoxMDAwKmRheXNfYWdvKVxuICAgICAgLCBkYXRlID0gZDMudGltZS5mb3JtYXQoXCIlWS0lbS0lZFwiKShkYXRlX2FnbylcblxuICAgIGlmIChkYXlzX2FnbykgVVJMICs9IFwiJmRhdGU9XCIgKyBkYXRlXG5cblxuICAgIGQzLmpzb24oVVJMLGZ1bmN0aW9uKHZhbHVlKSB7XG5cbiAgICAgIHZhciBjYXRlZ29yaWVzID0gdmFsdWUuc3VtbWFyeS5jYXRlZ29yeS5tYXAoZnVuY3Rpb24oeCkge3gua2V5ID0geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZTsgcmV0dXJuIHh9KVxuICAgICAgdmFsdWUuY2F0ZWdvcmllcyA9IGNhdGVnb3JpZXNcbiAgICAgIHZhbHVlLmNhdGVnb3J5ID0gdmFsdWUuc3VtbWFyeS5jYXRlZ29yeVxuICAgICAgdmFsdWUuY3VycmVudF9ob3VyID0gdmFsdWUuc3VtbWFyeS5ob3VyXG4gICAgICB2YWx1ZS5jYXRlZ29yeV9ob3VyID0gdmFsdWUuc3VtbWFyeS5jcm9zc19zZWN0aW9uXG5cbiAgICAgIHZhbHVlLm9yaWdpbmFsX3VybHMgPSB2YWx1ZS5yZXNwb25zZVxuXG4gICAgICBjYihmYWxzZSx2YWx1ZSlcbiAgICB9KVxuICB9XG5cbn1cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGUoZGF0YSxjYikge1xuICBkMy54aHIoXCIvY3J1c2hlci9mdW5uZWwvYWN0aW9uP2Zvcm1hdD1qc29uXCIpXG4gICAgLmhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIilcbiAgICAucG9zdChKU09OLnN0cmluZ2lmeShkYXRhKSxmdW5jdGlvbihlcnIsZGF0YSkge1xuICAgICAgY2IoZXJyLEpTT04ucGFyc2UoZGF0YS5yZXNwb25zZSkucmVzcG9uc2UpXG4gICAgfSlcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsKGNiKSB7XG4gIGQzLmpzb24oXCIvY3J1c2hlci9mdW5uZWwvYWN0aW9uP2Zvcm1hdD1qc29uXCIsZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YWx1ZS5yZXNwb25zZS5tYXAoZnVuY3Rpb24oeCkgeyB4LmtleSA9IHguYWN0aW9uX25hbWU7IHguYWN0aW9uX2lkID0geC5maWx0ZXJfaWQ7IHgudmFsdWUgPSB4LmFjdGlvbl9pZCB9KVxuICAgIGNiKGZhbHNlLHZhbHVlLnJlc3BvbnNlKVxuICB9KVxuXG59XG4iLCJpbXBvcnQgKiBhcyBhIGZyb20gJy4vc3JjL2FjdGlvbi5qcyc7XG5cbmV4cG9ydCBsZXQgYWN0aW9uID0gYTtcbmV4cG9ydCBsZXQgZGFzaGJvYXJkID0ge1xuICAgIGdldEFsbDogZnVuY3Rpb24oY2IpIHtcbiAgICAgIGQzLmpzb24oXCIvY3J1c2hlci9zYXZlZF9kYXNoYm9hcmRcIixmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjYihmYWxzZSx2YWx1ZS5yZXNwb25zZSlcbiAgICAgIH0pXG4gICAgfVxufVxuZXhwb3J0IGxldCBsaW5lX2l0ZW0gPSB7XG4gICAgZ2V0QWxsOiBmdW5jdGlvbihjYikge1xuICAgICAgZDMuanNvbihcIi9saW5lX2l0ZW1cIixmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjYihmYWxzZSx2YWx1ZS5yZXNwb25zZSlcbiAgICAgIH0pXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgZmlsdGVyX2RhdGEgfSBmcm9tICdmaWx0ZXInO1xuaW1wb3J0IHsgYnVpbGREYXRhIH0gZnJvbSAnLi4vLi4vaGVscGVycydcblxuZnVuY3Rpb24gcHJlZml4UmVkdWNlcihwcmVmaXgsIHAsYykge1xuICBwW2Mua2V5XSA9IHBbYy5rZXldIHx8IHt9XG4gIHBbYy5rZXldWydrZXknXSA9IGMua2V5XG4gIHBbYy5rZXldWydwYXJlbnRfY2F0ZWdvcnlfbmFtZSddID0gYy5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICBwW2Mua2V5XVsnaWRmJ10gPSBjLmlkZlxuXG4gIHBbYy5rZXldWyd0b3RhbCddID0gKHBbYy5rZXldWyd0b3RhbCddIHx8IDApICsgYy52aXNpdHNcblxuICBcbiAgcFtjLmtleV1bcHJlZml4ICsgYy50aW1lX2RpZmZfYnVja2V0XSA9IChwW2Mua2V5XVtjLnRpbWVfZGlmZl9idWNrZXRdIHx8IDApICsgYy52aXNpdHNcbiAgcmV0dXJuIHBcbn1cbmV4cG9ydCBjb25zdCBiZWZvcmVBbmRBZnRlclRhYnVsYXIgPSAoYmVmb3JlLCBhZnRlcikgPT4ge1xuICBjb25zdCBkb21haW5fdGltZSA9IHt9XG5cbiAgYmVmb3JlLnJlZHVjZShwcmVmaXhSZWR1Y2VyLmJpbmQoZmFsc2UsXCJcIiksZG9tYWluX3RpbWUpXG4gIGFmdGVyLnJlZHVjZShwcmVmaXhSZWR1Y2VyLmJpbmQoZmFsc2UsXCItXCIpLGRvbWFpbl90aW1lKVxuXG4gIGNvbnN0IHNvcnRlZCA9IE9iamVjdC5rZXlzKGRvbWFpbl90aW1lKVxuICAgIC5tYXAoKGspID0+IHsgcmV0dXJuIGRvbWFpbl90aW1lW2tdIH0pXG5cbiAgcmV0dXJuIHNvcnRlZFxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEJlZm9yZUFuZEFmdGVyKGJlZm9yZV91cmxzLGFmdGVyX3VybHMsY2F0X3N1bW1hcnksc29ydF9ieSkge1xuXG4gIHZhciBidSA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgLmVudHJpZXMoYmVmb3JlX3VybHMpXG5cbiAgdmFyIGF1ID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnRpbWVfZGlmZl9idWNrZXQgfSlcbiAgICAuZW50cmllcyhhZnRlcl91cmxzKVxuXG4gIHZhciBidWNrZXRzID0gWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcbiAgICAsIHBvcF9jYXRlZ29yaWVzID0gY2F0X3N1bW1hcnkucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGM7IHJldHVybiBwIH0sIHt9KVxuICAgICwgY2F0cyA9IGNhdF9zdW1tYXJ5Lm1hcChmdW5jdGlvbihwKSB7IHJldHVybiBwLmtleSB9KVxuXG4gIHZhciBiZWZvcmVfY2F0ZWdvcmllcyA9IGJ1aWxkRGF0YShiZWZvcmVfdXJscyxidWNrZXRzLHBvcF9jYXRlZ29yaWVzKVxuICAgICwgYWZ0ZXJfY2F0ZWdvcmllcyA9IGJ1aWxkRGF0YShhZnRlcl91cmxzLGJ1Y2tldHMscG9wX2NhdGVnb3JpZXMpXG5cbiAgdmFyIHNvcnRieSA9IHNvcnRfYnlcblxuICBpZiAoc29ydGJ5ID09IFwic2NvcmVcIikge1xuXG4gICAgYmVmb3JlX2NhdGVnb3JpZXMgPSBiZWZvcmVfY2F0ZWdvcmllcy5zb3J0KGZ1bmN0aW9uKGEsYikgeyBcbiAgICAgIHZhciBwID0gLTEsIHEgPSAtMTtcbiAgICAgIHRyeSB7IHAgPSBiLnZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSA9PSBcIjYwMFwiIH0pWzBdLnNjb3JlIH0gY2F0Y2goZSkge31cbiAgICAgIHRyeSB7IHEgPSBhLnZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSA9PSBcIjYwMFwiIH0pWzBdLnNjb3JlIH0gY2F0Y2goZSkge31cbiAgICAgIHJldHVybiBkMy5hc2NlbmRpbmcocCwgcSlcbiAgICB9KVxuICAgIFxuICB9IGVsc2UgaWYgKHNvcnRieSA9PSBcInBvcFwiKSB7XG5cbiAgICBiZWZvcmVfY2F0ZWdvcmllcyA9IGJlZm9yZV9jYXRlZ29yaWVzLnNvcnQoZnVuY3Rpb24oYSxiKSB7IFxuICAgICAgdmFyIHAgPSBjYXRzLmluZGV4T2YoYS5rZXkpXG4gICAgICAgICwgcSA9IGNhdHMuaW5kZXhPZihiLmtleSlcbiAgICAgIHJldHVybiBkMy5hc2NlbmRpbmcocCA+IC0xID8gcCA6IDEwMDAwLCBxID4gLTEgPyBxIDogMTAwMDApXG4gICAgfSlcblxuICB9IGVsc2Uge1xuXG4gICAgYmVmb3JlX2NhdGVnb3JpZXMgPSBiZWZvcmVfY2F0ZWdvcmllcy5zb3J0KGZ1bmN0aW9uKGEsYikgeyBcbiAgICAgIHZhciBwID0gLTEsIHEgPSAtMTtcbiAgICAgIHRyeSB7IHAgPSBiLnZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSA9PSBcIjYwMFwiIH0pWzBdLnBlcmNlbnRfZGlmZiB9IGNhdGNoKGUpIHt9XG4gICAgICB0cnkgeyBxID0gYS52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5wZXJjZW50X2RpZmYgfSBjYXRjaChlKSB7fVxuICAgICAgcmV0dXJuIGQzLmFzY2VuZGluZyhwLCBxKVxuICAgIH0pXG5cbiAgICBcbiAgfVxuXG5cbiAgdmFyIG9yZGVyID0gYmVmb3JlX2NhdGVnb3JpZXMubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG5cbiAgYWZ0ZXJfY2F0ZWdvcmllcyA9IGFmdGVyX2NhdGVnb3JpZXMuZmlsdGVyKGZ1bmN0aW9uKHgpe3JldHVybiBvcmRlci5pbmRleE9mKHgua2V5KSA+IC0xfSkuc29ydChmdW5jdGlvbihhLGIpIHtcbiAgICByZXR1cm4gb3JkZXIuaW5kZXhPZihhLmtleSkgLSBvcmRlci5pbmRleE9mKGIua2V5KVxuICB9KVxuXG4gIHJldHVybiB7XG4gICAgICBcImFmdGVyXCI6YWZ0ZXJfdXJsc1xuICAgICwgXCJiZWZvcmVcIjpiZWZvcmVfdXJsc1xuICAgICwgXCJjYXRlZ29yeVwiOmNhdF9zdW1tYXJ5XG4gICAgLCBcImJlZm9yZV9jYXRlZ29yaWVzXCI6YmVmb3JlX2NhdGVnb3JpZXNcbiAgICAsIFwiYWZ0ZXJfY2F0ZWdvcmllc1wiOmFmdGVyX2NhdGVnb3JpZXNcbiAgICAsIFwic29ydGJ5XCI6c29ydF9ieVxuICB9XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gYWdncmVnYXRlRG9tYWlucyh1cmxzLGNhdGVnb3JpZXMpIHtcbiAgdmFyIGNhdGVnb3JpZXMgPSBjYXRlZ29yaWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5kb21haW4gfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKHVybHMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIkludGVybmV0ICYgVGVsZWNvbVwifSkgKVxuXG4gIHZhciBnZXRJREYgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIChpZGZbeF0gPT0gXCJOQVwiKSB8fCAoaWRmW3hdID4gODY4NikgPyAwIDogaWRmW3hdXG4gIH1cblxuICB2YXIgdmFsdWVzID0gdXJsc1xuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJrZXlcIjp4LmRvbWFpblxuICAgICAgICAsIFwidmFsdWVcIjp4LmNvdW50XG4gICAgICAgICwgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICwgXCJ1bmlxdWVzXCI6IHgudW5pcXVlcyBcbiAgICAgICAgLCBcInVybFwiOiB4LnVybFxuICAgICAgfSBcbiAgICB9KVxuXG5cblxuICB2YWx1ZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXl9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHhbMF0ucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgICwgXCJrZXlcIjogeFswXS5rZXlcbiAgICAgICAgICwgXCJ2YWx1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnZhbHVlfSwwKVxuICAgICAgICAgLCBcInBlcmNlbnRfdW5pcXVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudW5pcXVlcy9jLnZhbHVlfSwwKS94Lmxlbmd0aFxuICAgICAgICAgLCBcInVybHNcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHAuaW5kZXhPZihjLnVybCkgPT0gLTEgPyBwLnB1c2goYy51cmwpIDogcDsgcmV0dXJuIHAgfSxbXSlcblxuICAgICAgIH0gXG4gICAgfSlcbiAgICAuZW50cmllcyh2YWx1ZXMpLm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHgudmFsdWVzIH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMClcbiAgICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTEgfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnRmX2lkZiA9IGdldElERih4LmtleSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpIFxuICAgIHguY291bnQgPSB4LnZhbHVlXG4gICAgeC5pbXBvcnRhbmNlID0gTWF0aC5sb2coeC50Zl9pZGYpXG4gIH0pXG4gIHZhbHVlcyA9IHZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy50Zl9pZGYgLSBwLnRmX2lkZiB9KVxuXG5cbiAgdmFyIHRvdGFsID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50KngucGVyY2VudF91bmlxdWV9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICB4LnBvcF9wZXJjZW50ID0gMS4wMi9nZXRJREYoeC5rZXkpKjEwMFxuICAgIHgucG9wX3BlcmNlbnQgPSB4LnBvcF9wZXJjZW50ID09IEluZmluaXR5ID8gMCA6IHgucG9wX3BlcmNlbnRcblxuICAgIHguc2FtcGxlX3BlcmNlbnQgPSB4LmNvdW50KngucGVyY2VudF91bmlxdWUvdG90YWwqMTAwXG4gIH0pXG5cbiAgdmFyIG5vcm0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgIC5yYW5nZShbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXsgcmV0dXJuIHgucG9wX3BlcmNlbnR9KV0pXG4gICAgLmRvbWFpbihbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXtyZXR1cm4geC5zYW1wbGVfcGVyY2VudH0pXSlcbiAgICAubmljZSgpXG5cbiAgdmFyIHR0ID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LnBvcF9wZXJjZW50IH0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5zYW1wbGVfcGVyY2VudF9ub3JtID0gbm9ybSh4LnNhbXBsZV9wZXJjZW50KVxuICAgIHgucmVhbF9wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQvdHQqMTAwXG4gICAgeC5yYXRpbyA9IHguc2FtcGxlX3BlcmNlbnQveC5yZWFsX3BvcF9wZXJjZW50XG5cbiAgfSlcblxuICByZXR1cm4gdmFsdWVzXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERvbWFpbnNUYWIodXJscyxjYXRlZ29yaWVzKSB7XG5cbiAgY29uc3QgdmFsdWVzID0gYWdncmVnYXRlRG9tYWlucyh1cmxzLGNhdGVnb3JpZXMpXG5cbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgRG9tYWluc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5zbGljZSgwLDUwMClcbiAgfVxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJztcblxuaW1wb3J0IHtcbiAgYWdncmVnYXRlQ2F0ZWdvcnksXG4gIGFnZ3JlZ2F0ZUNhdGVnb3J5SG91cixcbiAgY2F0ZWdvcnlTdW1tYXJ5XG59IGZyb20gJy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2NhdGVnb3J5J1xuXG5pbXBvcnQge1xuICBidWlsZEJlZm9yZUFuZEFmdGVyLFxuICBiZWZvcmVBbmRBZnRlclRhYnVsYXJcbn0gZnJvbSAnLi4vaGVscGVycy9kYXRhX2hlbHBlcnMvYmVmb3JlX2FuZF9hZnRlcidcblxuaW1wb3J0IHtcbiAgYnVpbGRLZXl3b3Jkc1xufSBmcm9tICcuLi9oZWxwZXJzL2RhdGFfaGVscGVycy9rZXl3b3JkcydcblxuaW1wb3J0IHtcbiAgYnVpbGRUaW1pbmcsXG4gIHRpbWluZ1RhYnVsYXJcbn0gZnJvbSAnLi4vaGVscGVycy9kYXRhX2hlbHBlcnMvdGltaW5nJ1xuXG5pbXBvcnQge1xuICBidWlsZFVybHNUYWJcbn0gZnJvbSAnLi4vaGVscGVycy9kYXRhX2hlbHBlcnMvdXJscydcblxuaW1wb3J0IHtcbiAgYnVpbGREb21haW5zVGFiXG59IGZyb20gJy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2RvbWFpbnMnXG5cbmltcG9ydCB7XG4gIGJ1aWxkU3VtbWFyeSxcbiAgZGV0ZXJtaW5lTG9naWMsXG4gIHByZXBhcmVGaWx0ZXJzLFxuICBmaWx0ZXJVcmxzXG59IGZyb20gJy4uL2hlbHBlcnMnXG5cbmNvbnN0IHMgPSBzdGF0ZTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgY29uc3QgcyA9IHN0YXRlO1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhZGQtZmlsdGVyXCIsIGZ1bmN0aW9uKGZpbHRlcikgeyBcbiAgICAgIHMucHVibGlzaChcImZpbHRlcnNcIixzLnN0YXRlKCkuZmlsdGVycy5jb25jYXQoZmlsdGVyKS5maWx0ZXIoeCA9PiB4LnZhbHVlKSApIFxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJtb2RpZnktZmlsdGVyXCIsIGZ1bmN0aW9uKGZpbHRlcikgeyBcbiAgICAgIHZhciBmaWx0ZXJzID0gcy5zdGF0ZSgpLmZpbHRlcnNcbiAgICAgIHZhciBoYXNfZXhpc2l0aW5nID0gZmlsdGVycy5maWx0ZXIoeCA9PiAoeC5maWVsZCArIHgub3ApID09IChmaWx0ZXIuZmllbGQgKyBmaWx0ZXIub3ApIClcbiAgICAgIFxuICAgICAgaWYgKGhhc19leGlzaXRpbmcubGVuZ3RoKSB7XG4gICAgICAgIHZhciBuZXdfZmlsdGVycyA9IGZpbHRlcnMucmV2ZXJzZSgpLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKCh4LmZpZWxkID09IGZpbHRlci5maWVsZCkgJiYgKHgub3AgPT0gZmlsdGVyLm9wKSkge1xuICAgICAgICAgICAgeC52YWx1ZSArPSBcIixcIiArIGZpbHRlci52YWx1ZVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4geFxuICAgICAgICB9KVxuICAgICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIsbmV3X2ZpbHRlcnMuZmlsdGVyKHggPT4geC52YWx1ZSkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIscy5zdGF0ZSgpLmZpbHRlcnMuY29uY2F0KGZpbHRlcikuZmlsdGVyKHggPT4geC52YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIsIGZ1bmN0aW9uKHN0cikgeyBzLnB1Ymxpc2goXCJzdGFnZWRfZmlsdGVyXCIsc3RyICkgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImxvZ2ljLmNoYW5nZVwiLCBmdW5jdGlvbihsb2dpYykgeyBzLnB1Ymxpc2goXCJsb2dpY19vcHRpb25zXCIsbG9naWMpIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJmaWx0ZXIuY2hhbmdlXCIsIGZ1bmN0aW9uKGZpbHRlcnMpIHsgcy5wdWJsaXNoQmF0Y2goeyBcImZpbHRlcnNcIjpmaWx0ZXJzIH0pIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIiwgZnVuY3Rpb24oZXJyLF9maWx0ZXJzLF9zdGF0ZSkge1xuXG5cbiAgICAgIGlmIChfc3RhdGUuZGF0YSA9PSB1bmRlZmluZWQpIHJldHVybiBcblxuICAgICAgY29uc3QgZmlsdGVycyA9IHByZXBhcmVGaWx0ZXJzKF9zdGF0ZS5maWx0ZXJzKVxuICAgICAgY29uc3QgbG9naWMgPSBkZXRlcm1pbmVMb2dpYyhfc3RhdGUubG9naWNfb3B0aW9ucylcbiAgICAgIGNvbnN0IGZ1bGxfdXJscyA9IGZpbHRlclVybHMoX3N0YXRlLmRhdGEub3JpZ2luYWxfdXJscyxsb2dpYyxmaWx0ZXJzKVxuXG4gICAgICBpZiAoIChfc3RhdGUuZGF0YS5mdWxsX3VybHMpICYmIChfc3RhdGUuZGF0YS5mdWxsX3VybHMubGVuZ3RoID09IGZ1bGxfdXJscy5sZW5ndGgpICYmIFxuICAgICAgICAgICAoX3N0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24pICYmIChfc3RhdGUuY29tcGFyaXNvbl9kYXRhID09IHZhbHVlLmNvbXBhcmlzb24pICYmIFxuICAgICAgICAgICAoX3N0YXRlLnNvcnRieSA9PSBfc3RhdGUuYmVmb3JlX3VybHMuc29ydGJ5KSkgcmV0dXJuIFxuXG5cblxuICAgICAgLy8gQkFTRSBEQVRBU0VUU1xuICAgICAgY29uc3QgdmFsdWUgPSB7fVxuXG4gICAgICB2YWx1ZS5mdWxsX3VybHMgPSBmdWxsX3VybHNcbiAgICAgIHZhbHVlLmNvbXBhcmlzb24gPSBfc3RhdGUuY29tcGFyaXNvbl9kYXRhID8gIF9zdGF0ZS5jb21wYXJpc29uX2RhdGEub3JpZ2luYWxfdXJscyA6IF9zdGF0ZS5kYXRhLm9yaWdpbmFsX3VybHM7XG5cbiAgICAgIC8vcy5wdWJsaXNoU3RhdGljKFwiZm9ybWF0dGVkX2RhdGFcIix2YWx1ZSlcbiAgICAgIFxuXG4gICAgICBjb25zdCBjYXRfc3VtbWFyeSA9IGNhdGVnb3J5U3VtbWFyeSh2YWx1ZS5mdWxsX3VybHMsdmFsdWUuY29tcGFyaXNvbilcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBidWlsZFN1bW1hcnkodmFsdWUuZnVsbF91cmxzLCB2YWx1ZS5jb21wYXJpc29uKVxuXG4gICAgICBzLnNldFN0YXRpYyhcImNhdGVnb3J5X3N1bW1hcnlcIiwgY2F0X3N1bW1hcnkpXG4gICAgICBzLnNldFN0YXRpYyhcInN1bW1hcnlcIixzdW1tYXJ5KVxuXG5cblxuXG5cbiAgICAgIC8vIE1FRElBIFBMQU5cblxuICAgICAgXG4gICAgICAvL3ZhbHVlLmRpc3BsYXlfY2F0ZWdvcmllcyA9IHtcImtleVwiOiBcIkNhdGVnb3JpZXNcIiwgdmFsdWVzOiBhZ2dyZWdhdGVDYXRlZ29yeShmdWxsX3VybHMpfVxuICAgICAgLy92YWx1ZS5jYXRlZ29yeV9ob3VyID0gYWdncmVnYXRlQ2F0ZWdvcnlIb3VyKGZ1bGxfdXJscylcblxuICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IGFnZ3JlZ2F0ZUNhdGVnb3J5KGZ1bGxfdXJscylcblxuICAgICAgY29uc3QgbWVkaWFfcGxhbiA9IHtcbiAgICAgICAgICBkaXNwbGF5X2NhdGVnb3JpZXM6IHtcImtleVwiOiBcIkNhdGVnb3JpZXNcIiAsIHZhbHVlczogY2F0ZWdvcmllc31cbiAgICAgICAgLCBjYXRlZ29yeV9ob3VyOiBhZ2dyZWdhdGVDYXRlZ29yeUhvdXIoZnVsbF91cmxzKVxuICAgICAgfVxuXG4gICAgICBzLnNldFN0YXRpYyhcIm1lZGlhX3BsYW5cIiwgbWVkaWFfcGxhbilcbiAgICAgIFxuXG5cblxuXG4gICAgICAvLyBFWFBMT1JFIFRBQlNcbiAgICAgIHZhciB0YWJzID0gW1xuICAgICAgICAgIGJ1aWxkRG9tYWluc1RhYihmdWxsX3VybHMsY2F0ZWdvcmllcylcbiAgICAgICAgLCB7a2V5OlwiVG9wIENhdGVnb3JpZXNcIiwgdmFsdWVzOiBjYXRfc3VtbWFyeX1cbiAgICAgICAgLy8sIGJ1aWxkVXJsc1RhYihmdWxsX3VybHMsY2F0ZWdvcmllcylcbiAgICAgIF1cblxuICAgICAgXG5cbiAgICAgIGlmIChfc3RhdGUudGFiX3Bvc2l0aW9uKSB7XG4gICAgICAgIHRhYnMubWFwKHggPT4geC5zZWxlY3RlZCA9ICh4LmtleSA9PSBfc3RhdGUudGFiX3Bvc2l0aW9uKSApXG4gICAgICB9XG5cbiAgICAgIHMuc2V0U3RhdGljKFwidGFic1wiLHRhYnMpXG5cblxuXG5cbiAgICAgIC8vIFRJTUlOR1xuICAgICAgY29uc3QgdGltaW5nID0gYnVpbGRUaW1pbmcodmFsdWUuZnVsbF91cmxzLCB2YWx1ZS5jb21wYXJpc29uKVxuICAgICAgY29uc3QgdGltaW5nX3RhYnVsYXIgPSB0aW1pbmdUYWJ1bGFyKGZ1bGxfdXJscylcbiAgICAgIGNvbnN0IGNhdF90aW1pbmdfdGFidWxhciA9IHRpbWluZ1RhYnVsYXIoZnVsbF91cmxzLFwicGFyZW50X2NhdGVnb3J5X25hbWVcIilcbiAgICAgIGNvbnN0IHRpbWluZ190YWJzID0gW1xuICAgICAgICAgIHtcImtleVwiOlwiVG9wIERvbWFpbnNcIiwgXCJ2YWx1ZXNcIjogdGltaW5nX3RhYnVsYXIsIFwiZGF0YVwiOiB2YWx1ZS5mdWxsX3VybHN9XG4gICAgICAgICwge1wia2V5XCI6XCJUb3AgQ2F0ZWdvcmllc1wiLCBcInZhbHVlc1wiOiBjYXRfdGltaW5nX3RhYnVsYXJ9XG5cbiAgICAgIF1cblxuICAgICAgaWYgKF9zdGF0ZS50YWJfcG9zaXRpb24pIHtcbiAgICAgICAgdGltaW5nX3RhYnMubWFwKHggPT4geC5zZWxlY3RlZCA9ICh4LmtleSA9PSBfc3RhdGUudGFiX3Bvc2l0aW9uKSApXG4gICAgICB9XG5cblxuXG4gICAgICBzLnNldFN0YXRpYyhcInRpbWVfc3VtbWFyeVwiLCB0aW1pbmcpXG4gICAgICBzLnNldFN0YXRpYyhcInRpbWVfdGFic1wiLCB0aW1pbmdfdGFicylcblxuXG5cblxuICAgICAgLy8gQkVGT1JFIEFORCBBRlRFUlxuICAgICAgaWYgKF9zdGF0ZS5kYXRhLmJlZm9yZSkge1xuXG4gICAgICAgIGNvbnN0IGRvbWFpbl9pZGZzID0gZDMubmVzdCgpXG4gICAgICAgICAgLmtleSh4ID0+IHguZG9tYWluKVxuICAgICAgICAgIC5yb2xsdXAoeCA9PiB4WzBdLmlkZilcbiAgICAgICAgICAubWFwKGZ1bGxfdXJscylcblxuICAgICAgICBjb25zdCBjYXRtYXAgPSAoeCkgPT4gT2JqZWN0LmFzc2lnbih4LHtrZXk6eC5wYXJlbnRfY2F0ZWdvcnlfbmFtZX0pXG4gICAgICAgIGNvbnN0IHVybG1hcCA9ICh4KSA9PiBPYmplY3QuYXNzaWduKHtrZXk6eC5kb21haW4sIGlkZjogZG9tYWluX2lkZnNbeC5kb21haW5dfSx4KVxuXG4gICAgICAgIGNvbnN0IGJlZm9yZV91cmxzID0gZmlsdGVyVXJscyhfc3RhdGUuZGF0YS5iZWZvcmUsbG9naWMsZmlsdGVycykubWFwKHVybG1hcClcbiAgICAgICAgICAsIGFmdGVyX3VybHMgPSBmaWx0ZXJVcmxzKF9zdGF0ZS5kYXRhLmFmdGVyLGxvZ2ljLGZpbHRlcnMpLm1hcCh1cmxtYXApXG4gICAgICAgICAgLCBiZWZvcmVfYW5kX2FmdGVyID0gYnVpbGRCZWZvcmVBbmRBZnRlcihiZWZvcmVfdXJscyxhZnRlcl91cmxzLGNhdF9zdW1tYXJ5LF9zdGF0ZS5zb3J0YnkpXG4gICAgICAgICAgLCBiZWZvcmVfYWZ0ZXJfdGFidWxhciA9IGJlZm9yZUFuZEFmdGVyVGFidWxhcihiZWZvcmVfdXJscyxhZnRlcl91cmxzKVxuICAgICAgICAgICwgY2F0X2JlZm9yZV9hZnRlcl90YWJ1bGFyID0gYmVmb3JlQW5kQWZ0ZXJUYWJ1bGFyKGJlZm9yZV91cmxzLm1hcChjYXRtYXApLGFmdGVyX3VybHMubWFwKGNhdG1hcCkpXG5cbiAgICAgICAgY29uc3QgYmVmb3JlX3RhYnMgPSBbXG4gICAgICAgICAgICB7a2V5OlwiVG9wIERvbWFpbnNcIix2YWx1ZXM6YmVmb3JlX2FmdGVyX3RhYnVsYXIsZGF0YTpiZWZvcmVfYW5kX2FmdGVyfVxuICAgICAgICAgICwge2tleTpcIlRvcCBDYXRlZ29yaWVzXCIsdmFsdWVzOmNhdF9iZWZvcmVfYWZ0ZXJfdGFidWxhcixkYXRhOmJlZm9yZV9hbmRfYWZ0ZXJ9XG4gICAgICAgIF1cblxuICAgICAgICBpZiAoX3N0YXRlLnRhYl9wb3NpdGlvbikge1xuICAgICAgICAgIGJlZm9yZV90YWJzLm1hcCh4ID0+IHguc2VsZWN0ZWQgPSAoeC5rZXkgPT0gX3N0YXRlLnRhYl9wb3NpdGlvbikgKVxuICAgICAgICB9XG5cblxuICAgICAgICBzLnNldFN0YXRpYyhcImJlZm9yZV91cmxzXCIsYmVmb3JlX2FuZF9hZnRlcikgXG4gICAgICAgIHMuc2V0U3RhdGljKFwiYmVmb3JlX3RhYnNcIixiZWZvcmVfdGFicylcblxuICAgICAgfVxuXG5cblxuICAgICAgLy8gS0VZV09SRFNcbiAgICAgIC8vcy5zZXRTdGF0aWMoXCJrZXl3b3JkX3N1bW1hcnlcIiwgYnVpbGRLZXl3b3Jkcyh2YWx1ZS5mdWxsX3VybHMsdmFsdWUuY29tcGFyaW9ucykpIFxuXG5cblxuXG4gICAgICBcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImZvcm1hdHRlZF9kYXRhXCIsdmFsdWUpXG4gICAgfSlcbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSc7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgY29uc3QgcyA9IHN0YXRlO1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhY3Rpb24uY2hhbmdlXCIsIGZ1bmN0aW9uKGFjdGlvbikgeyBzLnB1Ymxpc2goXCJzZWxlY3RlZF9hY3Rpb25cIixhY3Rpb24pIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIiwgZnVuY3Rpb24oZGF0ZSkgeyBzLnB1Ymxpc2goXCJhY3Rpb25fZGF0ZVwiLGRhdGUpIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIsIGZ1bmN0aW9uKGRhdGUpIHsgcy5wdWJsaXNoKFwiY29tcGFyaXNvbl9kYXRlXCIsZGF0ZSkgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImNvbXBhcmlzb24uY2hhbmdlXCIsIGZ1bmN0aW9uKGFjdGlvbikgeyBcbiAgICAgIGlmIChhY3Rpb24udmFsdWUgPT0gZmFsc2UpIHJldHVybiBzLnB1Ymxpc2goXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsZmFsc2UpXG4gICAgICBzLnB1Ymxpc2goXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsYWN0aW9uKVxuICAgIH0pXG5cblxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IGZpbHRlckluaXQgZnJvbSAnLi9ldmVudHMvZmlsdGVyX2V2ZW50cydcbmltcG9ydCBhY3Rpb25Jbml0IGZyb20gJy4vZXZlbnRzL2FjdGlvbl9ldmVudHMnXG5cblxuY29uc3QgcyA9IHN0YXRlO1xuXG5jb25zdCBkZWVwY29weSA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoeCkpXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgZmlsdGVySW5pdCgpXG4gIGFjdGlvbkluaXQoKVxuXG4gIC8vIE9USEVSIGV2ZW50c1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ0cmFuc2Zvcm0uY2hhbmdlXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHMudXBkYXRlKFwibG9hZGluZ1wiKVxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwidHJhbnNmb3JtXCIseC52YWx1ZSlcbiAgICAgIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKGZhbHNlLHMuc3RhdGUoKS5maWx0ZXJzLHMuc3RhdGUoKSlcbiAgICB9KVxuXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJzb3J0LmNoYW5nZVwiLCBmdW5jdGlvbih4KSB7XG4gICAgICBjb25zdCBfcyA9IHMuc3RhdGUoKVxuICAgICAgY29uc3QgYXNjID0gX3Muc29ydCA9PSB4LmtleVxuXG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIilcblxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwic29ydFwiLHgua2V5KVxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiYXNjZW5kaW5nXCIsYXNjICYmICFfcy5hc2NlbmRpbmcpXG5cbiAgICAgIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKGZhbHNlLHMuc3RhdGUoKS5maWx0ZXJzLHMuc3RhdGUoKSlcblxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ2aWV3LmNoYW5nZVwiLCBmdW5jdGlvbih4KSB7XG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIix0cnVlKVxuICAgICAgdmFyIENQID0gZGVlcGNvcHkocy5zdGF0ZSgpLmRhc2hib2FyZF9vcHRpb25zKS5tYXAoZnVuY3Rpb24oZCkgeyBkLnNlbGVjdGVkID0gKHgudmFsdWUgPT0gZC52YWx1ZSkgPyAxIDogMDsgcmV0dXJuIGQgfSlcbiAgICAgIHMucHVibGlzaChcImRhc2hib2FyZF9vcHRpb25zXCIsQ1ApXG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcInRhYi5jaGFuZ2VcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIsdHJ1ZSlcblxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwidGFiX3Bvc2l0aW9uXCIseC5rZXkpXG4gICAgICBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKShmYWxzZSxzLnN0YXRlKCkuZmlsdGVycyxzLnN0YXRlKCkpXG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImJhLnNvcnRcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgcy5wdWJsaXNoKFwic29ydGJ5XCIsIHgudmFsdWUpXG4gICAgICBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKShmYWxzZSxzLnN0YXRlKCkuZmlsdGVycyxzLnN0YXRlKCkpXG4gICAgfSlcbn1cbiIsImltcG9ydCB7cXN9IGZyb20gJ3N0YXRlJztcbmltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSc7XG5pbXBvcnQge2NvbXBhcmV9IGZyb20gJy4uL2hlbHBlcnMnXG5cbmZ1bmN0aW9uIHB1Ymxpc2hRU1VwZGF0ZXModXBkYXRlcyxxc19zdGF0ZSkge1xuICBpZiAoT2JqZWN0LmtleXModXBkYXRlcykubGVuZ3RoKSB7XG4gICAgdXBkYXRlc1tcInFzX3N0YXRlXCJdID0gcXNfc3RhdGVcbiAgICBzdGF0ZS5wdWJsaXNoQmF0Y2godXBkYXRlcylcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuXG4gIHdpbmRvdy5vbnBvcHN0YXRlID0gZnVuY3Rpb24oaSkge1xuXG4gICAgdmFyIHN0YXRlID0gcy5fc3RhdGVcbiAgICAgICwgcXNfc3RhdGUgPSBpLnN0YXRlXG5cbiAgICB2YXIgdXBkYXRlcyA9IGNvbXBhcmUocXNfc3RhdGUsc3RhdGUpXG4gICAgcHVibGlzaFFTVXBkYXRlcyh1cGRhdGVzLHFzX3N0YXRlKVxuICB9XG5cbiAgY29uc3QgcyA9IHN0YXRlO1xuXG4gIHN0YXRlXG4gICAgLnN1YnNjcmliZShcImhpc3RvcnlcIixmdW5jdGlvbihlcnJvcixfc3RhdGUpIHtcbiAgICAgIC8vY29uc29sZS5sb2coXG4gICAgICAvLyAgXCJjdXJyZW50OiBcIitKU09OLnN0cmluZ2lmeShfc3RhdGUucXNfc3RhdGUpLCBcbiAgICAgIC8vICBKU09OLnN0cmluZ2lmeShfc3RhdGUuZmlsdGVycyksIFxuICAgICAgLy8gIF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9uc1xuICAgICAgLy8pXG5cbiAgICAgIHZhciBmb3Jfc3RhdGUgPSBbXCJmaWx0ZXJzXCJdXG5cbiAgICAgIHZhciBxc19zdGF0ZSA9IGZvcl9zdGF0ZS5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBpZiAoX3N0YXRlW2NdKSBwW2NdID0gX3N0YXRlW2NdXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICBpZiAoX3N0YXRlLnNlbGVjdGVkX2FjdGlvbikgcXNfc3RhdGVbJ3NlbGVjdGVkX2FjdGlvbiddID0gX3N0YXRlLnNlbGVjdGVkX2FjdGlvbi5hY3Rpb25faWRcbiAgICAgIGlmIChfc3RhdGUuc2VsZWN0ZWRfY29tcGFyaXNvbikgcXNfc3RhdGVbJ3NlbGVjdGVkX2NvbXBhcmlzb24nXSA9IF9zdGF0ZS5zZWxlY3RlZF9jb21wYXJpc29uLmFjdGlvbl9pZFxuICAgICAgaWYgKF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9ucykgcXNfc3RhdGVbJ3NlbGVjdGVkX3ZpZXcnXSA9IF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZVxuICAgICAgaWYgKF9zdGF0ZS5hY3Rpb25fZGF0ZSkgcXNfc3RhdGVbJ2FjdGlvbl9kYXRlJ10gPSBfc3RhdGUuYWN0aW9uX2RhdGVcbiAgICAgIGlmIChfc3RhdGUuY29tcGFyaXNvbl9kYXRlKSBxc19zdGF0ZVsnY29tcGFyaXNvbl9kYXRlJ10gPSBfc3RhdGUuY29tcGFyaXNvbl9kYXRlXG4gICAgICBpZiAoX3N0YXRlLnRyYW5zZm9ybSkgcXNfc3RhdGVbJ3RyYW5zZm9ybSddID0gX3N0YXRlLnRyYW5zZm9ybVxuICAgICAgaWYgKF9zdGF0ZS50YWJfcG9zaXRpb24pIHFzX3N0YXRlWyd0YWJfcG9zaXRpb24nXSA9IF9zdGF0ZS50YWJfcG9zaXRpb25cbiAgICAgIGlmIChfc3RhdGUuc29ydCkgcXNfc3RhdGVbJ3NvcnQnXSA9IF9zdGF0ZS5zb3J0XG4gICAgICBpZiAoX3N0YXRlLmFzY2VuZGluZykgcXNfc3RhdGVbJ2FzY2VuZGluZyddID0gX3N0YXRlLmFzY2VuZGluZ1xuXG5cblxuXG4gICAgICBpZiAoX3N0YXRlLnNlbGVjdGVkX2FjdGlvbiAmJiBxcyhxc19zdGF0ZSkudG8ocXNfc3RhdGUpICE9IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpIHtcbiAgICAgICAgcy5wdWJsaXNoKFwicXNfc3RhdGVcIixxc19zdGF0ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJoaXN0b3J5LmFjdGlvbnNcIiwgZnVuY3Rpb24oZXJyb3IsdmFsdWUsX3N0YXRlKSB7XG4gICAgICB2YXIgcXNfc3RhdGUgPSBxcyh7fSkuZnJvbSh3aW5kb3cubG9jYXRpb24uc2VhcmNoKVxuICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gubGVuZ3RoICYmIE9iamVjdC5rZXlzKHFzX3N0YXRlKS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHVwZGF0ZXMgPSBjb21wYXJlKHFzX3N0YXRlLF9zdGF0ZSlcbiAgICAgICAgcmV0dXJuIHB1Ymxpc2hRU1VwZGF0ZXModXBkYXRlcyxxc19zdGF0ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMucHVibGlzaChcInNlbGVjdGVkX2FjdGlvblwiLHZhbHVlWzBdKVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImhpc3RvcnkucXNfc3RhdGVcIiwgZnVuY3Rpb24oZXJyb3IscXNfc3RhdGUsX3N0YXRlKSB7XG5cbiAgICAgIGlmIChKU09OLnN0cmluZ2lmeShoaXN0b3J5LnN0YXRlKSA9PSBKU09OLnN0cmluZ2lmeShxc19zdGF0ZSkpIHJldHVyblxuICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggPT0gXCJcIikgaGlzdG9yeS5yZXBsYWNlU3RhdGUocXNfc3RhdGUsXCJcIixxcyhxc19zdGF0ZSkudG8ocXNfc3RhdGUpKVxuICAgICAgZWxzZSBoaXN0b3J5LnB1c2hTdGF0ZShxc19zdGF0ZSxcIlwiLHFzKHFzX3N0YXRlKS50byhxc19zdGF0ZSkpXG5cbiAgICB9KVxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJ2FwaSdcblxuY29uc3QgcyA9IHN0YXRlO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuXG4gIC8vIFN1YnNjcmlwdGlvbnMgdGhhdCByZWNlaXZlIGRhdGEgLyBtb2RpZnkgLyBjaGFuZ2Ugd2hlcmUgaXQgaXMgc3RvcmVkXG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwicmVjZWl2ZS5kYXRhXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImxvZ2ljX2NhdGVnb3JpZXNcIix2YWx1ZS5jYXRlZ29yaWVzKVxuICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHN0YXRlLmZpbHRlcnMpXG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwicmVjZWl2ZS5jb21wYXJpc29uX2RhdGFcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHN0YXRlLmZpbHRlcnMpXG4gICAgfSlcblxuXG4gIC8vIFN1YnNjcmlwdGlvbnMgdGhhdCB3aWxsIGdldCBtb3JlIGRhdGFcblxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuYWN0aW9uX2RhdGVcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YShzdGF0ZS5zZWxlY3RlZF9hY3Rpb24sc3RhdGUuYWN0aW9uX2RhdGUpKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImdldC5jb21wYXJpc29uX2RhdGVcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGZhbHNlKVxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiY29tcGFyaXNvbl9kYXRhXCIsYXBpLmFjdGlvbi5nZXREYXRhKHN0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24sc3RhdGUuY29tcGFyaXNvbl9kYXRlKSlcbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuc2VsZWN0ZWRfYWN0aW9uXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImRhdGFcIixhcGkuYWN0aW9uLmdldERhdGEodmFsdWUsc3RhdGUuYWN0aW9uX2RhdGUpKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImdldC5zZWxlY3RlZF9jb21wYXJpc29uXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybiBzLnB1Ymxpc2hTdGF0aWMoXCJjb21wYXJpc29uX2RhdGFcIixmYWxzZSlcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YSh2YWx1ZSxzdGF0ZS5jb21wYXJpc29uX2RhdGUpKVxuICAgIH0pXG5cblxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IHtxc30gZnJvbSAnc3RhdGUnXG5pbXBvcnQgYnVpbGQgZnJvbSAnLi9idWlsZCdcbmltcG9ydCBoaXN0b3J5U3Vic2NyaXB0aW9ucyBmcm9tICcuL3N1YnNjcmlwdGlvbnMvaGlzdG9yeSdcbmltcG9ydCBhcGlTdWJzY3JpcHRpb25zIGZyb20gJy4vc3Vic2NyaXB0aW9ucy9hcGknXG5cblxuY29uc3QgcyA9IHN0YXRlO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgaGlzdG9yeVN1YnNjcmlwdGlvbnMoKVxuICBhcGlTdWJzY3JpcHRpb25zKClcblxuICBcbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLmxvYWRpbmdcIiwgZnVuY3Rpb24oZXJyb3IsbG9hZGluZyx2YWx1ZSkgeyBidWlsZCgpKCkgfSlcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLmRhc2hib2FyZF9vcHRpb25zXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKVxuICAgIC5zdWJzY3JpYmUoXCJjaGFuZ2UudGFic1wiLCBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKSkgXG4gICAgLnN1YnNjcmliZShcImNoYW5nZS5sb2dpY19vcHRpb25zXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpIClcbiAgICAuc3Vic2NyaWJlKFwidXBkYXRlLmZpbHRlcnNcIiwgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikpXG4gICAgXG5cbiAgLy8gUkVEUkFXOiB0aGlzIGlzIHdoZXJlIHRoZSBlbnRpcmUgYXBwIGdldHMgcmVkcmF3biAtIGlmIGZvcm1hdHRlZF9kYXRhIGNoYW5nZXMsIHJlZHJhdyB0aGUgYXBwXG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwicmVkcmF3LmZvcm1hdHRlZF9kYXRhXCIsIGZ1bmN0aW9uKGVycm9yLGZvcm1hdHRlZF9kYXRhLHZhbHVlKSB7IFxuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIsZmFsc2UpOyBcbiAgICAgIGJ1aWxkKCkoKSBcbiAgICB9KVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGQzIGZyb20gJ2QzJ1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJ2FwaSdcbmltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCB2aWV3IGZyb20gJy4vdmlldydcbmltcG9ydCBpbml0RXZlbnRzIGZyb20gJy4vZXZlbnRzJ1xuaW1wb3J0IGluaXRTdWJzY3JpcHRpb25zIGZyb20gJy4vc3Vic2NyaXB0aW9ucydcblxuXG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYnVpbGQodGFyZ2V0KSB7XG4gIGNvbnN0IGRiID0gbmV3IERhc2hib2FyZCh0YXJnZXQpXG4gIHJldHVybiBkYlxufVxuXG5jbGFzcyBEYXNoYm9hcmQge1xuXG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIGluaXRFdmVudHMoKVxuICAgIGluaXRTdWJzY3JpcHRpb25zKClcbiAgICB0aGlzLnRhcmdldCh0YXJnZXQpXG4gICAgdGhpcy5pbml0KClcblxuICAgIHJldHVybiB0aGlzLmNhbGwuYmluZCh0aGlzKVxuICB9XG5cbiAgdGFyZ2V0KHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldCB8fCBkM191cGRhdGVhYmxlKGQzLnNlbGVjdChcIi5jb250YWluZXJcIiksXCJkaXZcIixcImRpdlwiKVxuICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMDBweFwiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiYXV0b1wiKVxuICB9XG5cbiAgaW5pdCgpIHtcbiAgICBsZXQgcyA9IHN0YXRlO1xuICAgIGxldCB2YWx1ZSA9IHMuc3RhdGUoKVxuICAgIHRoaXMuZGVmYXVsdHMocylcbiAgfVxuXG4gIGRlZmF1bHRzKHMpIHtcblxuICAgIGlmICghIXMuc3RhdGUoKS5kYXNoYm9hcmRfb3B0aW9ucykgcmV0dXJuIC8vIGRvbid0IHJlbG9hZCBkZWZhdWx0cyBpZiBwcmVzZW50XG5cbiAgICBzLnB1Ymxpc2hTdGF0aWMoXCJhY3Rpb25zXCIsYXBpLmFjdGlvbi5nZXRBbGwpXG4gICAgcy5wdWJsaXNoU3RhdGljKFwic2F2ZWRcIixhcGkuZGFzaGJvYXJkLmdldEFsbClcbiAgICBzLnB1Ymxpc2hTdGF0aWMoXCJsaW5lX2l0ZW1zXCIsYXBpLmxpbmVfaXRlbS5nZXRBbGwpXG5cbiAgICB2YXIgREVGQVVMVFMgPSB7XG4gICAgICAgIGxvZ2ljX29wdGlvbnM6IFt7XCJrZXlcIjpcIkFsbFwiLFwidmFsdWVcIjpcImFuZFwifSx7XCJrZXlcIjpcIkFueVwiLFwidmFsdWVcIjpcIm9yXCJ9XVxuICAgICAgLCBsb2dpY19jYXRlZ29yaWVzOiBbXVxuICAgICAgLCBmaWx0ZXJzOiBbe31dIFxuICAgICAgLCBkYXNoYm9hcmRfb3B0aW9uczogW1xuICAgICAgICAgICAge1wia2V5XCI6XCJPdmVyYWxsXCIsXCJ2YWx1ZVwiOlwiZGF0YS12aWV3XCIsXCJzZWxlY3RlZFwiOjF9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIlBhdGhcIixcInZhbHVlXCI6XCJiYS12aWV3XCIsXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIlRpbWluZ1wiLFwidmFsdWVcIjpcInRpbWluZy12aWV3XCIsXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIkNvbXBhcmlzb25cIixcInZhbHVlXCI6XCJzdW1tYXJ5LXZpZXdcIixcInNlbGVjdGVkXCI6MH1cbiAgICAgICAgICAvLywge1wia2V5XCI6XCJNZWRpYSBQbGFuXCIsIFwidmFsdWVcIjpcIm1lZGlhLXZpZXdcIixcInNlbGVjdGVkXCI6MH1cblxuICAgICAgICBdXG4gICAgfVxuXG4gICAgcy51cGRhdGUoZmFsc2UsREVGQVVMVFMpXG4gIH1cblxuICBjYWxsKCkge1xuXG4gICBsZXQgcyA9IHN0YXRlO1xuICAgbGV0IHZhbHVlID0gcy5zdGF0ZSgpXG5cbiAgIGxldCBkYiA9IHZpZXcodGhpcy5fdGFyZ2V0KVxuICAgICAudHJhbnNmb3JtKHZhbHVlLnRyYW5zZm9ybSB8fCBcIlwiKVxuICAgICAuc3RhZ2VkX2ZpbHRlcnModmFsdWUuc3RhZ2VkX2ZpbHRlciB8fCBcIlwiKVxuICAgICAubWVkaWEodmFsdWUubWVkaWFfcGxhbiB8fCB7fSlcbiAgICAgLnNhdmVkKHZhbHVlLnNhdmVkIHx8IFtdKVxuICAgICAuZGF0YSh2YWx1ZS5mb3JtYXR0ZWRfZGF0YSB8fCB7fSlcbiAgICAgLmFjdGlvbnModmFsdWUuYWN0aW9ucyB8fCBbXSlcbiAgICAgLnNlbGVjdGVkX2FjdGlvbih2YWx1ZS5zZWxlY3RlZF9hY3Rpb24gfHwge30pXG4gICAgIC5zZWxlY3RlZF9jb21wYXJpc29uKHZhbHVlLnNlbGVjdGVkX2NvbXBhcmlzb24gfHwge30pXG4gICAgIC5hY3Rpb25fZGF0ZSh2YWx1ZS5hY3Rpb25fZGF0ZSB8fCAwKVxuICAgICAuY29tcGFyaXNvbl9kYXRlKHZhbHVlLmNvbXBhcmlzb25fZGF0ZSB8fCAwKVxuICAgICAubG9hZGluZyh2YWx1ZS5sb2FkaW5nIHx8IGZhbHNlKVxuICAgICAubGluZV9pdGVtcyh2YWx1ZS5saW5lX2l0ZW1zIHx8IGZhbHNlKVxuICAgICAuc3VtbWFyeSh2YWx1ZS5zdW1tYXJ5IHx8IGZhbHNlKVxuICAgICAudGltZV9zdW1tYXJ5KHZhbHVlLnRpbWVfc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLmNhdGVnb3J5X3N1bW1hcnkodmFsdWUuY2F0ZWdvcnlfc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLmtleXdvcmRfc3VtbWFyeSh2YWx1ZS5rZXl3b3JkX3N1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC5iZWZvcmUodmFsdWUuYmVmb3JlX3VybHMgfHwgW10pXG4gICAgIC5iZWZvcmVfdGFicyh2YWx1ZS5iZWZvcmVfdGFicyB8fCBbXSlcbiAgICAgLy8uYWZ0ZXIodmFsdWUuYWZ0ZXJfdXJscyB8fCBbXSlcbiAgICAgLmxvZ2ljX29wdGlvbnModmFsdWUubG9naWNfb3B0aW9ucyB8fCBmYWxzZSlcbiAgICAgLmxvZ2ljX2NhdGVnb3JpZXModmFsdWUubG9naWNfY2F0ZWdvcmllcyB8fCBmYWxzZSlcbiAgICAgLmZpbHRlcnModmFsdWUuZmlsdGVycyB8fCBmYWxzZSlcbiAgICAgLnZpZXdfb3B0aW9ucyh2YWx1ZS5kYXNoYm9hcmRfb3B0aW9ucyB8fCBmYWxzZSlcbiAgICAgLmV4cGxvcmVfdGFicyh2YWx1ZS50YWJzIHx8IGZhbHNlKVxuICAgICAudGltZV90YWJzKHZhbHVlLnRpbWVfdGFicyB8fCBmYWxzZSlcbiAgICAgLnNvcnQodmFsdWUuc29ydCB8fCBmYWxzZSlcbiAgICAgLmFzY2VuZGluZyh2YWx1ZS5hc2NlbmRpbmcgfHwgZmFsc2UpXG5cbiAgICAgLm9uKFwiYWRkLWZpbHRlclwiLCBzLnByZXBhcmVFdmVudChcImFkZC1maWx0ZXJcIikpXG4gICAgIC5vbihcIm1vZGlmeS1maWx0ZXJcIiwgcy5wcmVwYXJlRXZlbnQoXCJtb2RpZnktZmlsdGVyXCIpKVxuICAgICAub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKVxuICAgICAub24oXCJhY3Rpb24uY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwiYWN0aW9uLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIpKVxuICAgICAub24oXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJjb21wYXJpc29uLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwibG9naWMuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwibG9naWMuY2hhbmdlXCIpKVxuICAgICAub24oXCJmaWx0ZXIuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwiZmlsdGVyLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwidmlldy5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJ2aWV3LmNoYW5nZVwiKSlcbiAgICAgLm9uKFwidGFiLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcInRhYi5jaGFuZ2VcIikpXG4gICAgIC5vbihcImJhLnNvcnRcIiwgcy5wcmVwYXJlRXZlbnQoXCJiYS5zb3J0XCIpKVxuICAgICAub24oXCJzb3J0LmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcInNvcnQuY2hhbmdlXCIpKVxuICAgICAub24oXCJ0cmFuc2Zvcm0uY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwidHJhbnNmb3JtLmNoYW5nZVwiKSlcblxuICAgICAuZHJhdygpXG4gICBcbiAgfVxufVxuIiwidmFyIHZlcnNpb24gPSBcIjAuMC4xXCI7IGV4cG9ydCAqIGZyb20gXCIuLi9pbmRleFwiOyBleHBvcnQge3ZlcnNpb259OyJdLCJuYW1lcyI6WyJub29wIiwic3RhdGUiLCJkM191cGRhdGVhYmxlIiwiZDNfc3BsYXQiLCJhY2Nlc3NvciQxIiwic3RhdGUuY29tcF9ldmFsIiwic3RhdGUucXMiLCJhY2Nlc3NvciIsImlkZW50aXR5Iiwia2V5IiwiZDMiLCJ0YWJsZSIsInNlbGVjdCIsImZpbHRlciIsInByZXBEYXRhIiwicCIsIkVYQU1QTEVfREFUQSIsInRpbWVzZXJpZXNbJ2RlZmF1bHQnXSIsImJ1Y2tldHMiLCJTVE9QV09SRFMiLCJob3VyYnVja2V0cyIsInRpbWluZ0hlYWRlcnMiLCJjb21wdXRlU2NhbGUiLCJub3JtYWxpemVSb3ciLCJ0aW1lc2VyaWVzLnByZXBEYXRhIiwiZDNfY2xhc3MiLCJyZWxhdGl2ZV92aWV3IiwidGltaW5nX3ZpZXciLCJzdGFnZWRfZmlsdGVyX3ZpZXciLCJpbml0IiwicyIsImZpbHRlckluaXQiLCJhY3Rpb25Jbml0IiwiYXBpLmFjdGlvbiIsImhpc3RvcnlTdWJzY3JpcHRpb25zIiwiYXBpU3Vic2NyaXB0aW9ucyIsImluaXRFdmVudHMiLCJpbml0U3Vic2NyaXB0aW9ucyIsImFwaS5kYXNoYm9hcmQiLCJhcGkubGluZV9pdGVtIiwidmlldyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFPLE1BQU0sYUFBYSxHQUFHLFNBQVMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtFQUN0RSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksTUFBSztFQUN4QixJQUFJLFVBQVUsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUk7SUFDOUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xDOztFQUVELFVBQVUsQ0FBQyxLQUFLLEVBQUU7S0FDZixNQUFNLENBQUMsSUFBSSxFQUFDOztFQUVmLE9BQU8sVUFBVTtFQUNsQjs7QUFFRCxBQUFPLE1BQU0sUUFBUSxH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LENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQ25CLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJO1FBQy9GLElBQUksTUFBTSxHQUFHLFVBQVM7UUFDdEIsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtVQUMxTCxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUU7VUFDakIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFD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LEdBQUcsR0FBRTs7SUFFOUIsSUFBSSxFQUFFLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBR0EsV0FBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7SUFDbEcsSUFBSSxFQUFFLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBR0EsV0FBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7O0lBRWxHLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDOztJQUUxRyxPQUFPLE1BQU07R0FDZDs7RUFFRCxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUM7O0VBRWhHLElB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LElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQzs7UUFFOUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxFQUFDO09BQzFDOzs7TUFHRCxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFDOztLQUU1Rjs7SUFFRCxJQUFJLENBQUMsT0FBTztPQUNULFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO09BQzFCLEVBQUUsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQzdCLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUM7T0FDN0QsQ0FBQztPQUNELEVBQUUsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQzVCLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1VBQ2hDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUM7VUFDMUIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztTQUNwQztPQUNGLENBQUM7T0FDRCxFQUFFLENBQUMsT0FBTyxFQUFF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QUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRTs7QUFFcEQsQUFBTyxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztFQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUM7RUFDbkQsT0FBTyxDQUFDO0NBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDOztBQUVOLEFBQU8sU0FBUyxTQUFTLENBQUMsTUFBTSxFQUFFOztFQUVoQyxJQUFJLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7SUFDNUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBQztJQUNiLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7R0FDbEMsRUFBQzs7RUFFRixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU07RUFDekQsSUFBSSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBQzs7RUFFakQsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FB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
