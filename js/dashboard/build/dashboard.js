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

debugger
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


    drawStream(streamwrap,this._before.before_categories,this._before.after_categories);


    return this
  }
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

    } = processData(before_urls,after_urls,before_pos,after_pos,d.domain);




    const summary_row = d3_class(td,"summary-row");

    d3_class(summary_row,"title")
      .text("Before and After: " + d.domain);

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

__$styleInject(".ba-row {\n        padding-bottom:60px;\n}\n\n.ba-row .expanded td {\nbackground:#f9f9fb;\n            padding-top:10px;\n            padding-bottom:10px;\n}\n\n.ba-row th {\n  border-right:1px rgba(0,0,0,.1);\n}\n\n.ba-row th span.less-than, .ba-row th span.greater-than {\nfont-size:.9em;\nwidth:55px;\ntransform:rotate(90deg);\ntext-align:center;\ndisplay:inline-block;\nmargin-left: -20px;\n\n}\n/*\n.ba-row th span.less-than {\n    font-size: .9em;\n    width: 50px;\n    transform: rotate(-90deg);\n    display: inline-block;\n    margin-left: -20px;\n    text-align: center;\n}\n*/\n.ba-row .table-wrapper tr th {\n  border:0px;\n  height:53px\n}\n\n.transform select {\n  height: 36px;\n  vertical-align: top;\n      width:200px;\n}\n\n.transform {\n  width:255px;\n  padding:15px;\n  vertical-align: top;\n  display:inline-block;\n  padding-top:0px;\n}\n.transform span {\n  text-transform:uppercase;\n  font-weight:bold\n}\n\n.transform .filter-values,\n.transform .show-values {\n  text-align:right;\n  padding-top: 10px;\n  margin-right:25px;\n}\n\n.ba-row tr td:not(:first-child) {\n  color:transparent;\n  cursor:pointer\n}\n\n.ba-row tr td:not(:first-child):hover, .ba-row.show-values tr td:not(:first-child) {\n  color:inherit\n}\n.timeseries-row {\n  padding-bottom:80px\n}\n.stream-wrap {\n  \n}\n.stream-wrap .inner {\n  margin-top:-60px\n}\n.stream-wrap .axis.before,\n.stream-wrap .axis.after {\n  display:none\n}\n\n.time-wrap {\n  float:right;\n  width:682px;\n}\n.time-wrap rect {\n  fill: grey\n}\n.time-wrap rect.selected,\n.time-wrap rect:hover {\n  fill: black\n}\n\ntr.hide-category, \ntr.hide-time {\n  display:none\n}\n",undefined);

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

    var ts = d3_class(wrap,"timeseries-row")
      .style("padding-bottom",selected.key == "Top Categories" ? "0px" : null);


    var transform_selector = d3_class(ts,"transform");

    select(d3_class(transform_selector,"header","span"))
      .options(data)
      .on("select", function(x) { this.on("select")(x); }.bind(this))
      .draw();

    var OPTIONS = [
          {"key":"Activity","value":false}
        , {"key":"Intent Score","value":"normalize"}
        , {"key":"Importance","value":"importance"}
        , {"key":"Percentage","value":"percent"}
        , {"key":"Percent Diff","value":"percent_diff"}
      ];



    select(d3_class(transform_selector,"trans","span"))
      .options(OPTIONS)
      .on("select", function(x){
        self.on("transform.change").bind(this)(x);
      })
      .selected(this.transform() )
      .draw();




    var toggle = d3_class(transform_selector,"show-values");

    d3_updateable(toggle,"span","span")
      .text("show values? ");

    d3_updateable(toggle,"input","input")
      .attr("type","checkbox")
      .on("change",function(x) {
        bawrap.classed("show-values",this.checked);
      });


    var toggle = d3_class(transform_selector,"filter-values");

    d3_updateable(toggle,"span","span")
      .text("live filter? ");

    d3_updateable(toggle,"input","input")
      .attr("type","checkbox")
      .attr("disabled",true)
      .attr("checked","checked");

    var toggle = d3_class(transform_selector,"reset-values");

    d3_updateable(toggle,"a","a")
      .style("display","none")
      .style("text-align","center")
      .text("Reset");






    var stream_wrap = d3_class(ts,"stream-wrap")
      .style("width","682px")
      .style("display",selected.key == "Top Categories" ? "none" : "inline-block")
      .style("vertical-align","bottom");

    var details = d3_class(ts,"details-wrap","svg")
      .style("width","255px")
      .style("height","200px")
      .style("display",selected.key == "Top Categories" ? "none" : "inline-block")


      .style("margin-top","-110px")
      .style("float","left");

    function filter(cat) {

      var tr = bawrap.selectAll("tbody").selectAll("tr")
        .classed("hide-category",false);

      if (cat === false) return 

      var filtered = tr.filter(function(x) { 
          return x.parent_category_name != cat
        })
        .classed("hide-category",true);
    }

    var stages = drawStreamSkinny(stream_wrap,selected.data.before_categories,selected.data.after_categories,filter);

    var time_wrap = d3_class(ts,"time-wrap")
      .style("text-align", "right")
      .style("margin-right", "63px");

    var svg = d3_updateable(time_wrap,"svg","svg").attr("width",682).attr("height",80)
      .style("display","inline-block")
      .style("vertical-align","bottom")
      .style("margin-bottom","15px");



    var sts = simpleTimeseries(svg,values,682,80,-2);

    var lock = false;

    function filterTime(t,i) {
      var key$$1 = timeBuckets[i];

      if (lock) {
        clearTimeout(lock);
      }
      lock = setTimeout(function() {
        lock = false;
        var tr = bawrap.selectAll("tbody").selectAll("tr")
          .classed("hide-time",false);

        if (i === false) return false

        var filtered = tr.filter(function(x) { 
            return x[key$$1] == undefined || x[key$$1] == ""
          })
          .classed("hide-time",true);
      },10);

    }


    sts.selectAll("rect")
      .on("mouseover",filterTime)
      .on("mouseout",function() { 
        filterTime(false,false);
      })
      .on("click",function() {
        lock = false;
        var bool = (sts.selectAll("rect").on("mouseover") == filterTime);

        sts.selectAll("rect")
          .on("mouseover", bool ? noop$2 : filterTime)
          .on("mouseout", bool ? noop$2 : function() { filterTime(false,false); })

          .classed("selected",false);

        d3.select(this).classed("selected",bool);

        //d3.event.stopPropagation()
        return false

      });

    const categories = data[0].data.category.reduce((p,c) => {
      p[c.key] = c;
      return p
    },{});

    var bawrap = d3_class(wrap,"ba-row")
      .style("min-height","600px");

    //TODO: fix this

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

        refine_relative(td)
          .data(d)
          .domain(d.domain)
          .stages(stages)
          .before_urls(data.before.filter(y => y.domain == d.domain) )
          .after_urls(data.after.filter(y => y.domain == d.domain))
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

  return d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])
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

__$styleInject(".timing-row {\n        padding-bottom:60px;\n}\n\n.timing-row .expanded {\n  background:white;\n  padding:20px\n}\n\n.timing-row tr td:not(:first-child) {\n          border-right:1px solid white;\n          padding-left:0px;\n          text-align:center;\n\n}\n.timing-row .table-wrapper tr th {\n  padding:5px; text-align:center\n}\n.timing-row tr td:not(:first-child) {\n  color:transparent;\n  cursor:pointer\n}\n\n.timing-row tr td:not(:first-child):hover, .timing-row.show-values tr td:not(:first-child) {\n  color:inherit\n}\n",undefined);

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
      const local_max = d3.max(Object.keys(normed).map(k => normed[k]));
      max = local_max > max ? local_max : max;

      return Object.assign(normed,{"key":row.key})
    });


    const oscale = computeScale$1(values,max);


    header(wrap)
      .text(selected.key)
      .options(data)
      .on("select", function(x) { this.on("select")(x); }.bind(this))
      .draw();


    var ts = d3_class(wrap,"timeseries-row");


    var transform_selector = d3_class(ts,"transform");

    select(transform_selector)
      .options([{"key":"Activity","value":false},{"key":"Normalized","value":"normalize"}])
      .on("select", function(x){
        self.on("transform.change").bind(this)(x);
      })
      .draw();

    var toggle = d3_class(transform_selector,"show-values");



    d3_updateable(toggle,"span","span")
      .text("show values? ");

    d3_updateable(toggle,"input","input")
      .attr("type","checkbox")
      .on("change",function(x) {
        timingwrap.classed("show-values",this.checked);
      });



    var svg = d3_updateable(ts,"svg","svg").attr("width",744).attr("height",80);

    var totals = timingHeaders$1.map(h => {
      return hourlyTotals[h.key]
    });

    simpleTimeseries(svg,totals,744,80,-1);

    var timingwrap = d3_class(wrap,"timing-row");

    var table_obj = table$1(timingwrap)
      .top(140)
      .headers(headers)
      .sort(sortby,asc)
      .on("sort", this.on("sort"))
      .data({"values":values})
      .skip_option(true)
      .on("expand",function(d,td) {

        var dd = data.full_urls.filter(function(x) { return x.domain == d.domain });
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

function aggregateUrls(urls,categories) {
  var categories = categories
    .filter(function(a) { return a.selected })
    .map(function(a) { return a.key });

  var values = urls
    .map(function(x) { return {"key":x.url,"value":x.count, "parent_category_name": x.parent_category_name} });

  if (categories.length > 0)
    values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 });

  return values.filter(function(x) {
    try {
      return x.key
        .replace("http://","")
        .replace("https://","")
        .replace("www.","").split(".").slice(1).join(".").split("/")[1].length > 5
    } catch(e) {
      return false
    }
  }).sort(function(p,c) { return c.value - p.value })

}

function buildUrlsTab(urls,categories) {

  const values = aggregateUrls(urls,categories);
  
  return {
      key: "Top Articles"
    , values: values.slice(0,100)
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
        , buildUrlsTab(full_urls,categories)
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
          {"key":"Top Domains", "values": timing_tabular}
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
          , {"key":"Data summary","value":"summary-view","selected":0}
          , {"key":"Media Plan", "value":"media-view","selected":0}

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFzaGJvYXJkLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvaGVscGVycy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdGF0ZS9zcmMvc3RhdGUuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvc3JjL3FzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N0YXRlL3NyYy9jb21wX2V2YWwuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvbWVkaWFfcGxhbi9zcmMvbWVkaWFfcGxhbi5qcyIsIi4uL25vZGVfbW9kdWxlcy9maWx0ZXIvYnVpbGQvZmlsdGVyLmVzLmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzLmpzIiwiLi4vc3JjL2hlbHBlcnMvZ3JhcGhfaGVscGVycy5qcyIsIi4uL3NyYy9oZWxwZXJzL3N0YXRlX2hlbHBlcnMuanMiLCIuLi9zcmMvaGVscGVycy5qcyIsIi4uL3NyYy9nZW5lcmljL3NlbGVjdC5qcyIsIi4uL3NyYy9nZW5lcmljL2hlYWRlci5qcyIsIi4uL25vZGVfbW9kdWxlcy90YWJsZS9zcmMvdGFibGUuanMiLCIuLi9ub2RlX21vZHVsZXMvdGFibGUvc3JjL3N1bW1hcnlfdGFibGUuanMiLCIuLi9zcmMvdmlld3MvZmlsdGVyX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy9idXR0b25fcmFkaW8uanMiLCIuLi9zcmMvdmlld3Mvb3B0aW9uX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy90aW1lc2VyaWVzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdGFidWxhcl90aW1lc2VyaWVzL2hlYWRlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9jaGFydC9zcmMvc2ltcGxlX3RpbWVzZXJpZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL2JhX3RpbWVzZXJpZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL3NpbXBsZV9iYXIuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL2J1bGxldC5qcyIsIi4uL25vZGVfbW9kdWxlcy9jb21wb25lbnQvc3JjL3RhYnVsYXJfdGltZXNlcmllcy9ib2R5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdGFidWxhcl90aW1lc2VyaWVzL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvZG9tYWluX2V4cGFuZGVkLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdmVydGljYWxfb3B0aW9uLmpzIiwiLi4vc3JjL3ZpZXdzL2RvbWFpbl92aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3NlZ21lbnRfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2RpZmZfYmFyLmpzIiwiLi4vc3JjL2dlbmVyaWMvY29tcF9iYXIuanMiLCIuLi9zcmMvdmlld3Mvc3VtbWFyeS9jYXRlZ29yeS5qcyIsIi4uL3NyYy9nZW5lcmljL2NvbXBfYnViYmxlLmpzIiwiLi4vc3JjL2dlbmVyaWMvc3RyZWFtX3Bsb3QuanMiLCIuLi9zcmMvdmlld3Mvc3VtbWFyeS9iZWZvcmVfYW5kX2FmdGVyLmpzIiwiLi4vc3JjL2dlbmVyaWMvcGllLmpzIiwiLi4vc3JjL3ZpZXdzL3N1bW1hcnkvc2FtcGxlX3ZzX3BvcC5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5L3RpbWluZy5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5L3ZpZXcuanMiLCIuLi9zcmMvdmlld3MvcmVsYXRpdmVfdGltaW5nL3JlZmluZV9yZWxhdGl2ZV9wcm9jZXNzLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy9yZWZpbmVfcmVsYXRpdmUuanMiLCIuLi9zcmMvdmlld3MvcmVsYXRpdmVfdGltaW5nL3JlbGF0aXZlX3RpbWluZ19jb25zdGFudHMuanMiLCIuLi9zcmMvdmlld3MvcmVsYXRpdmVfdGltaW5nL3JlbGF0aXZlX3RpbWluZ19wcm9jZXNzLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy92aWV3LmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2NhdGVnb3J5LmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzL3RpbWluZy5qcyIsIi4uL3NyYy92aWV3cy90aW1pbmcvdGltaW5nX2NvbnN0YW50cy5qcyIsIi4uL3NyYy92aWV3cy90aW1pbmcvdGltaW5nX3Byb2Nlc3MuanMiLCIuLi9zcmMvdmlld3MvdGltaW5nL3ZpZXcuanMiLCIuLi9zcmMvdmlld3Mvc3RhZ2VkX2ZpbHRlcl92aWV3LmpzIiwiLi4vc3JjL2dlbmVyaWMvY29uZGl0aW9uYWxfc2hvdy5qcyIsIi4uL3NyYy9nZW5lcmljL3NoYXJlLmpzIiwiLi4vc3JjL3ZpZXcuanMiLCIuLi9ub2RlX21vZHVsZXMvYXBpL3NyYy9hY3Rpb24uanMiLCIuLi9ub2RlX21vZHVsZXMvYXBpL2luZGV4LmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2JlZm9yZV9hbmRfYWZ0ZXIuanMiLCIuLi9zcmMvaGVscGVycy9kYXRhX2hlbHBlcnMvdXJscy5qcyIsIi4uL3NyYy9oZWxwZXJzL2RhdGFfaGVscGVycy9kb21haW5zLmpzIiwiLi4vc3JjL2V2ZW50cy9maWx0ZXJfZXZlbnRzLmpzIiwiLi4vc3JjL2V2ZW50cy9hY3Rpb25fZXZlbnRzLmpzIiwiLi4vc3JjL2V2ZW50cy5qcyIsIi4uL3NyYy9zdWJzY3JpcHRpb25zL2hpc3RvcnkuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy9hcGkuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy5qcyIsIi4uL3NyYy9idWlsZC5qcyIsImJ1bmRsZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgZDNfdXBkYXRlYWJsZSA9IGZ1bmN0aW9uKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZXhwb3J0IGNvbnN0IGQzX3NwbGF0ID0gZnVuY3Rpb24odGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCJcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKVxuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSlcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZDNfY2xhc3ModGFyZ2V0LGNscyx0eXBlLGRhdGEpIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLlwiICsgY2xzLCB0eXBlIHx8IFwiZGl2XCIsZGF0YSlcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vb3AoKSB7fVxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZXhwb3J0IGZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgY2xhc3MgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICAgIHRoaXMucHJvcHMoKS5tYXAoeCA9PiB7XG4gICAgICB0aGlzW3hdID0gYWNjZXNzb3IuYmluZCh0aGlzLHgpXG4gICAgfSlcbiAgfVxuICBwcm9wcygpIHtcbiAgICByZXR1cm4gW1wiZGF0YVwiXVxuICB9XG4gIG9uKGFjdGlvbixmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gU3RhdGUoX2N1cnJlbnQsIF9zdGF0aWMpIHtcblxuICB0aGlzLl9ub29wID0gZnVuY3Rpb24oKSB7fVxuICB0aGlzLl9ldmVudHMgPSB7fVxuXG4gIHRoaXMuX29uID0ge1xuICAgICAgXCJjaGFuZ2VcIjogdGhpcy5fbm9vcFxuICAgICwgXCJidWlsZFwiOiB0aGlzLl9ub29wXG4gICAgLCBcImZvcndhcmRcIjogdGhpcy5fbm9vcFxuICAgICwgXCJiYWNrXCI6IHRoaXMuX25vb3BcbiAgfVxuXG4gIHRoaXMuX3N0YXRpYyA9IF9zdGF0aWMgfHwge31cblxuICB0aGlzLl9jdXJyZW50ID0gX2N1cnJlbnQgfHwge31cbiAgdGhpcy5fcGFzdCA9IFtdXG4gIHRoaXMuX2Z1dHVyZSA9IFtdXG5cbiAgdGhpcy5fc3Vic2NyaXB0aW9uID0ge31cbiAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcblxuXG59XG5cblN0YXRlLnByb3RvdHlwZSA9IHtcbiAgICBzdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9zdGF0ZSlcbiAgICB9XG4gICwgcHVibGlzaDogZnVuY3Rpb24obmFtZSxjYikge1xuXG4gICAgICAgdmFyIHB1c2hfY2IgPSBmdW5jdGlvbihlcnJvcix2YWx1ZSkge1xuICAgICAgICAgaWYgKGVycm9yKSByZXR1cm4gc3Vic2NyaWJlcihlcnJvcixudWxsKVxuICAgICAgICAgXG4gICAgICAgICB0aGlzLnVwZGF0ZShuYW1lLCB2YWx1ZSlcbiAgICAgICAgIHRoaXMudHJpZ2dlcihuYW1lLCB0aGlzLnN0YXRlKClbbmFtZV0sIHRoaXMuc3RhdGUoKSlcblxuICAgICAgIH0uYmluZCh0aGlzKVxuXG4gICAgICAgaWYgKHR5cGVvZiBjYiA9PT0gXCJmdW5jdGlvblwiKSBjYihwdXNoX2NiKVxuICAgICAgIGVsc2UgcHVzaF9jYihmYWxzZSxjYilcblxuICAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHB1Ymxpc2hCYXRjaDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICBPYmplY3Qua2V5cyhvYmopLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHRoaXMudXBkYXRlKHgsb2JqW3hdKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB0aGlzLnRyaWdnZXJCYXRjaChvYmosdGhpcy5zdGF0ZSgpKVxuICAgIH1cbiAgLCBwdXNoOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgdGhpcy5wdWJsaXNoKGZhbHNlLHN0YXRlKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgc3Vic2NyaWJlOiBmdW5jdGlvbigpIHtcblxuICAgICAgLy8gdGhyZWUgb3B0aW9ucyBmb3IgdGhlIGFyZ3VtZW50czpcbiAgICAgIC8vIChmbikgXG4gICAgICAvLyAoaWQsZm4pXG4gICAgICAvLyAoaWQudGFyZ2V0LGZuKVxuXG5cbiAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB0aGlzLl9nbG9iYWxfc3Vic2NyaWJlKGFyZ3VtZW50c1swXSlcbiAgICAgIGlmIChhcmd1bWVudHNbMF0uaW5kZXhPZihcIi5cIikgPT0gLTEpIHJldHVybiB0aGlzLl9uYW1lZF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pXG4gICAgICBpZiAoYXJndW1lbnRzWzBdLmluZGV4T2YoXCIuXCIpID4gLTEpIHJldHVybiB0aGlzLl90YXJnZXR0ZWRfc3Vic2NyaWJlKGFyZ3VtZW50c1swXS5zcGxpdChcIi5cIilbMF0sIGFyZ3VtZW50c1swXS5zcGxpdChcIi5cIilbMV0sIGFyZ3VtZW50c1sxXSlcblxuICAgIH1cbiAgLCB1bnN1YnNjcmliZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgIHRoaXMuc3Vic2NyaWJlKGlkLHVuZGVmaW5lZClcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICwgX2dsb2JhbF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB2YXIgaWQgPSAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgICB2YXIgciA9IE1hdGgucmFuZG9tKCkqMTZ8MCwgdiA9IGMgPT0gJ3gnID8gciA6IChyJjB4M3wweDgpO1xuICAgICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICAgICAgfSlcbiAgICAgICwgdG8gPSBcIipcIjtcbiAgICAgXG4gICAgICB0aGlzLl90YXJnZXR0ZWRfc3Vic2NyaWJlKGlkLHRvLGZuKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBfbmFtZWRfc3Vic2NyaWJlOiBmdW5jdGlvbihpZCxmbikge1xuICAgICAgdmFyIHRvID0gXCIqXCJcbiAgICAgIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoaWQsdG8sZm4pXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIF90YXJnZXR0ZWRfc3Vic2NyaWJlOiBmdW5jdGlvbihpZCx0byxmbikge1xuXG4gICAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX29iaih0bylcbiAgICAgICAgLCB0b19zdGF0ZSA9IHRoaXMuX3N0YXRlW3RvXVxuICAgICAgICAsIHN0YXRlID0gdGhpcy5fc3RhdGU7XG5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiAmJiBmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gc3Vic2NyaXB0aW9uc1tpZF0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlbGV0ZSBzdWJzY3JpcHRpb25zW2lkXVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgfVxuICAgICAgc3Vic2NyaXB0aW9uc1tpZF0gPSBmbjtcblxuICAgICAgcmV0dXJuIHRoaXMgICAgICBcbiAgICB9XG4gIFxuICAsIGdldF9zdWJzY3JpYmVyc19vYmo6IGZ1bmN0aW9uKGspIHtcbiAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbltrXSA9IHRoaXMuX3N1YnNjcmlwdGlvbltrXSB8fCB7fVxuICAgICAgcmV0dXJuIHRoaXMuX3N1YnNjcmlwdGlvbltrXVxuICAgIH1cbiAgLCBnZXRfc3Vic2NyaWJlcnNfZm46IGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBmbnMgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19vYmooaylcbiAgICAgICAgLCBmdW5jcyA9IE9iamVjdC5rZXlzKGZucykubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGZuc1t4XSB9KVxuICAgICAgICAsIGZuID0gZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jcy5tYXAoZnVuY3Rpb24oZykgeyByZXR1cm4gZyhlcnJvcix2YWx1ZSxzdGF0ZSkgfSlcbiAgICAgICAgICB9XG5cbiAgICAgIHJldHVybiBmblxuICAgIH1cbiAgLCB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lLCBfdmFsdWUsIF9zdGF0ZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXIgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihuYW1lKSB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICwgYWxsID0gdGhpcy5nZXRfc3Vic2NyaWJlcnNfZm4oXCIqXCIpIHx8IGZ1bmN0aW9uKCkge307XG5cbiAgICAgIHRoaXMub24oXCJjaGFuZ2VcIikobmFtZSxfdmFsdWUsX3N0YXRlKVxuXG4gICAgICBzdWJzY3JpYmVyKGZhbHNlLF92YWx1ZSxfc3RhdGUpXG4gICAgICBhbGwoZmFsc2UsX3N0YXRlKVxuICAgIH1cbiAgLCB0cmlnZ2VyQmF0Y2g6IGZ1bmN0aW9uKG9iaiwgX3N0YXRlKSB7XG5cbiAgICAgIHZhciBhbGwgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihcIipcIikgfHwgZnVuY3Rpb24oKSB7fVxuICAgICAgICAsIGZucyA9IE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgICAgICB2YXIgZm4gPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbiB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICAgICByZXR1cm4gZm4uYmluZCh0aGlzKShrKShmYWxzZSxvYmpba10sX3N0YXRlKSAgXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgXG4gICAgICBhbGwoZmFsc2UsX3N0YXRlKVxuXG4gICAgfVxuICAsIF9idWlsZFN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jdXJyZW50KVxuXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLl9zdGF0aWMpLm1hcChmdW5jdGlvbihrKSB7IFxuICAgICAgICB0aGlzLl9zdGF0ZVtrXSA9IHRoaXMuX3N0YXRpY1trXVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB0aGlzLm9uKFwiYnVpbGRcIikodGhpcy5fc3RhdGUsIHRoaXMuX2N1cnJlbnQsIHRoaXMuX3N0YXRpYylcblxuICAgICAgcmV0dXJuIHRoaXMuX3N0YXRlXG4gICAgfVxuICAsIHVwZGF0ZTogZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgIHRoaXMuX3Bhc3RQdXNoKHRoaXMuX2N1cnJlbnQpXG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICB2YXIgb2JqID0ge31cbiAgICAgICAgb2JqW25hbWVdID0gdmFsdWU7XG4gICAgICB9XG4gICAgICB0aGlzLl9jdXJyZW50ID0gKG5hbWUpID8gXG4gICAgICAgIE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2N1cnJlbnQsIG9iaikgOlxuICAgICAgICBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9jdXJyZW50LCB2YWx1ZSApXG5cbiAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzZXRTdGF0aWM6IGZ1bmN0aW9uKGssdikge1xuICAgICAgaWYgKGsgIT0gdW5kZWZpbmVkICYmIHYgIT0gdW5kZWZpbmVkKSB0aGlzLl9zdGF0aWNba10gPSB2XG4gICAgICB0aGlzLl9idWlsZFN0YXRlKClcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcHVibGlzaFN0YXRpYzogZnVuY3Rpb24obmFtZSxjYikge1xuXG4gICAgICB2YXIgcHVzaF9jYiA9IGZ1bmN0aW9uKGVycm9yLHZhbHVlKSB7XG4gICAgICAgIGlmIChlcnJvcikgcmV0dXJuIHN1YnNjcmliZXIoZXJyb3IsbnVsbClcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX3N0YXRpY1tuYW1lXSA9IHZhbHVlXG4gICAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuICAgICAgICB0aGlzLnRyaWdnZXIobmFtZSwgdGhpcy5zdGF0ZSgpW25hbWVdLCB0aGlzLnN0YXRlKCkpXG5cbiAgICAgIH0uYmluZCh0aGlzKVxuXG4gICAgICBpZiAodHlwZW9mIGNiID09PSBcImZ1bmN0aW9uXCIpIGNiKHB1c2hfY2IpXG4gICAgICBlbHNlIHB1c2hfY2IoZmFsc2UsY2IpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgX3Bhc3RQdXNoOiBmdW5jdGlvbih2KSB7XG4gICAgICB0aGlzLl9wYXN0LnB1c2godilcbiAgICB9XG4gICwgX2Z1dHVyZVB1c2g6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHRoaXMuX2Z1dHVyZS5wdXNoKHYpXG4gICAgfVxuICAsIGZvcndhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fcGFzdFB1c2godGhpcy5fY3VycmVudClcbiAgICAgIHRoaXMuX2N1cnJlbnQgPSB0aGlzLl9mdXR1cmUucG9wKClcblxuICAgICAgdGhpcy5vbihcImZvcndhcmRcIikodGhpcy5fY3VycmVudCx0aGlzLl9wYXN0LCB0aGlzLl9mdXR1cmUpXG5cbiAgICAgIHRoaXMuX3N0YXRlID0gdGhpcy5fYnVpbGRTdGF0ZSgpXG4gICAgICB0aGlzLnRyaWdnZXIoZmFsc2UsIHRoaXMuX3N0YXRlLCB0aGlzLl9zdGF0ZSlcbiAgICB9XG4gICwgYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9mdXR1cmVQdXNoKHRoaXMuX2N1cnJlbnQpXG4gICAgICB0aGlzLl9jdXJyZW50ID0gdGhpcy5fcGFzdC5wb3AoKVxuXG4gICAgICB0aGlzLm9uKFwiYmFja1wiKSh0aGlzLl9jdXJyZW50LHRoaXMuX2Z1dHVyZSwgdGhpcy5fcGFzdClcblxuICAgICAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcbiAgICAgIHRoaXMudHJpZ2dlcihmYWxzZSwgdGhpcy5fc3RhdGUsIHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgdGhpcy5fbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSBcbiAgLCByZWdpc3RlckV2ZW50OiBmdW5jdGlvbihuYW1lLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2V2ZW50c1tuYW1lXSB8fCB0aGlzLl9ub29wO1xuICAgICAgdGhpcy5fZXZlbnRzW25hbWVdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBwcmVwYXJlRXZlbnQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmbiA9IHRoaXMuX2V2ZW50c1tuYW1lXSBcbiAgICAgIHJldHVybiBmbi5iaW5kKHRoaXMpXG4gICAgfVxuICAsIGRpc3BhdGNoRXZlbnQ6IGZ1bmN0aW9uKG5hbWUsZGF0YSkge1xuICAgICAgdmFyIGZuID0gdGhpcy5wcmVwYXJlRXZlbnQobmFtZSlcbiAgICAgIGZuKGRhdGEpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxufVxuXG5mdW5jdGlvbiBzdGF0ZShfY3VycmVudCwgX3N0YXRpYykge1xuICByZXR1cm4gbmV3IFN0YXRlKF9jdXJyZW50LCBfc3RhdGljKVxufVxuXG5zdGF0ZS5wcm90b3R5cGUgPSBTdGF0ZS5wcm90b3R5cGVcblxuZXhwb3J0IGRlZmF1bHQgc3RhdGU7XG4iLCJleHBvcnQgZnVuY3Rpb24gUVMoc3RhdGUpIHtcbiAgLy90aGlzLnN0YXRlID0gc3RhdGVcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRoaXMuX2VuY29kZU9iamVjdCA9IGZ1bmN0aW9uKG8pIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkobylcbiAgfVxuXG4gIHRoaXMuX2VuY29kZUFycmF5ID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvKVxuICB9XG59XG5cbi8vIExaVy1jb21wcmVzcyBhIHN0cmluZ1xuZnVuY3Rpb24gbHp3X2VuY29kZShzKSB7XG4gICAgdmFyIGRpY3QgPSB7fTtcbiAgICB2YXIgZGF0YSA9IChzICsgXCJcIikuc3BsaXQoXCJcIik7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIHZhciBjdXJyQ2hhcjtcbiAgICB2YXIgcGhyYXNlID0gZGF0YVswXTtcbiAgICB2YXIgY29kZSA9IDI1NjtcbiAgICBmb3IgKHZhciBpPTE7IGk8ZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJyQ2hhcj1kYXRhW2ldO1xuICAgICAgICBpZiAoZGljdFtwaHJhc2UgKyBjdXJyQ2hhcl0gIT0gbnVsbCkge1xuICAgICAgICAgICAgcGhyYXNlICs9IGN1cnJDaGFyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb3V0LnB1c2gocGhyYXNlLmxlbmd0aCA+IDEgPyBkaWN0W3BocmFzZV0gOiBwaHJhc2UuY2hhckNvZGVBdCgwKSk7XG4gICAgICAgICAgICBkaWN0W3BocmFzZSArIGN1cnJDaGFyXSA9IGNvZGU7XG4gICAgICAgICAgICBjb2RlKys7XG4gICAgICAgICAgICBwaHJhc2U9Y3VyckNoYXI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgb3V0LnB1c2gocGhyYXNlLmxlbmd0aCA+IDEgPyBkaWN0W3BocmFzZV0gOiBwaHJhc2UuY2hhckNvZGVBdCgwKSk7XG4gICAgZm9yICh2YXIgaT0wOyBpPG91dC5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXRbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG91dFtpXSk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbihcIlwiKTtcbn1cblxuLy8gRGVjb21wcmVzcyBhbiBMWlctZW5jb2RlZCBzdHJpbmdcbmZ1bmN0aW9uIGx6d19kZWNvZGUocykge1xuICAgIHZhciBkaWN0ID0ge307XG4gICAgdmFyIGRhdGEgPSAocyArIFwiXCIpLnNwbGl0KFwiXCIpO1xuICAgIHZhciBjdXJyQ2hhciA9IGRhdGFbMF07XG4gICAgdmFyIG9sZFBocmFzZSA9IGN1cnJDaGFyO1xuICAgIHZhciBvdXQgPSBbY3VyckNoYXJdO1xuICAgIHZhciBjb2RlID0gMjU2O1xuICAgIHZhciBwaHJhc2U7XG4gICAgZm9yICh2YXIgaT0xOyBpPGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGN1cnJDb2RlID0gZGF0YVtpXS5jaGFyQ29kZUF0KDApO1xuICAgICAgICBpZiAoY3VyckNvZGUgPCAyNTYpIHtcbiAgICAgICAgICAgIHBocmFzZSA9IGRhdGFbaV07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgIHBocmFzZSA9IGRpY3RbY3VyckNvZGVdID8gZGljdFtjdXJyQ29kZV0gOiAob2xkUGhyYXNlICsgY3VyckNoYXIpO1xuICAgICAgICB9XG4gICAgICAgIG91dC5wdXNoKHBocmFzZSk7XG4gICAgICAgIGN1cnJDaGFyID0gcGhyYXNlLmNoYXJBdCgwKTtcbiAgICAgICAgZGljdFtjb2RlXSA9IG9sZFBocmFzZSArIGN1cnJDaGFyO1xuICAgICAgICBjb2RlKys7XG4gICAgICAgIG9sZFBocmFzZSA9IHBocmFzZTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKFwiXCIpO1xufVxuXG5RUy5wcm90b3R5cGUgPSB7XG4gICAgdG86IGZ1bmN0aW9uKHN0YXRlLGVuY29kZSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIHZhciBwYXJhbXMgPSBPYmplY3Qua2V5cyhzdGF0ZSkubWFwKGZ1bmN0aW9uKGspIHtcblxuICAgICAgICB2YXIgdmFsdWUgPSBzdGF0ZVtrXVxuICAgICAgICAgICwgbyA9IHZhbHVlO1xuXG4gICAgICAgIGlmICh2YWx1ZSAmJiAodHlwZW9mKHZhbHVlKSA9PSBcIm9iamVjdFwiKSAmJiAodmFsdWUubGVuZ3RoID4gMCkpIHtcbiAgICAgICAgICBvID0gc2VsZi5fZW5jb2RlQXJyYXkodmFsdWUpXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mKHZhbHVlKSA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgbyA9IHNlbGYuX2VuY29kZU9iamVjdCh2YWx1ZSlcbiAgICAgICAgfSBcblxuICAgICAgICByZXR1cm4gayArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG8pIFxuXG4gICAgICB9KVxuXG4gICAgICBpZiAoZW5jb2RlKSByZXR1cm4gXCI/XCIgKyBcImVuY29kZWQ9XCIgKyBidG9hKGVzY2FwZShsendfZW5jb2RlKHBhcmFtcy5qb2luKFwiJlwiKSkpKTtcbiAgICAgIHJldHVybiBcIj9cIiArIHBhcmFtcy5qb2luKFwiJlwiKVxuICAgICAgXG4gICAgfVxuICAsIGZyb206IGZ1bmN0aW9uKHFzKSB7XG4gICAgICB2YXIgcXVlcnkgPSB7fTtcbiAgICAgIGlmIChxcy5pbmRleE9mKFwiP2VuY29kZWQ9XCIpID09IDApIHFzID0gbHp3X2RlY29kZSh1bmVzY2FwZShhdG9iKHFzLnNwbGl0KFwiP2VuY29kZWQ9XCIpWzFdKSkpXG4gICAgICB2YXIgYSA9IHFzLnN1YnN0cigxKS5zcGxpdCgnJicpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGIgPSBhW2ldLnNwbGl0KCc9Jyk7XG4gICAgICAgICAgXG4gICAgICAgICAgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSA9IChkZWNvZGVVUklDb21wb25lbnQoYlsxXSB8fCAnJykpO1xuICAgICAgICAgIHZhciBfY2hhciA9IHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChiWzBdKV1bMF0gXG4gICAgICAgICAgaWYgKChfY2hhciA9PSBcIntcIikgfHwgKF9jaGFyID09IFwiW1wiKSkgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSA9IEpTT04ucGFyc2UocXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBxdWVyeTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHFzKHN0YXRlKSB7XG4gIHJldHVybiBuZXcgUVMoc3RhdGUpXG59XG5cbnFzLnByb3RvdHlwZSA9IFFTLnByb3RvdHlwZVxuXG5leHBvcnQgZGVmYXVsdCBxcztcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBhcmlzb25fZXZhbChvYmoxLG9iajIsX2ZpbmFsKSB7XG4gIHJldHVybiBuZXcgQ29tcGFyaXNvbkV2YWwob2JqMSxvYmoyLF9maW5hbClcbn1cblxudmFyIG5vb3AgPSAoeCkgPT4ge31cbiAgLCBlcW9wID0gKHgseSkgPT4geCA9PSB5XG4gICwgYWNjID0gKG5hbWUsc2Vjb25kKSA9PiB7XG4gICAgICByZXR1cm4gKHgseSkgPT4gc2Vjb25kID8geVtuYW1lXSA6IHhbbmFtZV0gXG4gICAgfVxuXG5jbGFzcyBDb21wYXJpc29uRXZhbCB7XG4gIGNvbnN0cnVjdG9yKG9iajEsb2JqMixfZmluYWwpIHtcbiAgICB0aGlzLl9vYmoxID0gb2JqMVxuICAgIHRoaXMuX29iajIgPSBvYmoyXG4gICAgdGhpcy5fZmluYWwgPSBfZmluYWxcbiAgICB0aGlzLl9jb21wYXJpc29ucyA9IHt9XG4gIH1cblxuICBhY2Nlc3NvcihuYW1lLGFjYzEsYWNjMikge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jb21wYXJpc29uc1tuYW1lXSx7XG4gICAgICAgIGFjYzE6IGFjYzFcbiAgICAgICwgYWNjMjogYWNjMlxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN1Y2Nlc3MobmFtZSxmbikge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jb21wYXJpc29uc1tuYW1lXSx7XG4gICAgICAgIHN1Y2Nlc3M6IGZuXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZmFpbHVyZShuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgZmFpbHVyZTogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBlcXVhbChuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgZXE6IGZuXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZXZhbHVhdGUoKSB7XG4gICAgT2JqZWN0LmtleXModGhpcy5fY29tcGFyaXNvbnMpLm1hcCggayA9PiB7XG4gICAgICB0aGlzLl9ldmFsKHRoaXMuX2NvbXBhcmlzb25zW2tdLGspXG4gICAgfSlcbiAgICByZXR1cm4gdGhpcy5fZmluYWxcbiAgfVxuICBcblxuICBjb21wYXJzaW9uKG5hbWUsYWNjMSxhY2MyLGVxLHN1Y2Nlc3MsZmFpbHVyZSkge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0ge1xuICAgICAgICBhY2MxOiBhY2MxXG4gICAgICAsIGFjYzI6IGFjYzJcbiAgICAgICwgZXE6IGVxIHx8IGVxb3BcbiAgICAgICwgc3VjY2Vzczogc3VjY2VzcyB8fCBub29wXG4gICAgICAsIGZhaWx1cmU6IGZhaWx1cmUgfHwgbm9vcFxuICAgIH1cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgX2V2YWwoY29tcGFyaXNvbixuYW1lKSB7XG4gICAgdmFyIGFjYzEgPSBjb21wYXJpc29uLmFjYzEgfHwgYWNjKG5hbWUpXG4gICAgICAsIGFjYzIgPSBjb21wYXJpc29uLmFjYzIgfHwgYWNjKG5hbWUsdHJ1ZSlcbiAgICAgICwgdmFsMSA9IGFjYzEodGhpcy5fb2JqMSx0aGlzLl9vYmoyKVxuICAgICAgLCB2YWwyID0gYWNjMih0aGlzLl9vYmoxLHRoaXMuX29iajIpXG4gICAgICAsIGVxID0gY29tcGFyaXNvbi5lcSB8fCBlcW9wXG4gICAgICAsIHN1Y2MgPSBjb21wYXJpc29uLnN1Y2Nlc3MgfHwgbm9vcFxuICAgICAgLCBmYWlsID0gY29tcGFyaXNvbi5mYWlsdXJlIHx8IG5vb3BcblxuICAgIHZhciBfZXZhbGQgPSBlcSh2YWwxLCB2YWwyKVxuXG4gICAgX2V2YWxkID8gXG4gICAgICBzdWNjLmJpbmQodGhpcykodmFsMSx2YWwyLHRoaXMuX2ZpbmFsKSA6IFxuICAgICAgZmFpbC5iaW5kKHRoaXMpKHZhbDEsdmFsMix0aGlzLl9maW5hbClcbiAgfVxuXG4gIFxufVxuIiwiZXhwb3J0IHtkZWZhdWx0IGFzIHN0YXRlfSBmcm9tIFwiLi9zcmMvc3RhdGVcIjtcbmV4cG9ydCB7ZGVmYXVsdCBhcyBxc30gZnJvbSBcIi4vc3JjL3FzXCI7XG5leHBvcnQge2RlZmF1bHQgYXMgY29tcF9ldmFsfSBmcm9tIFwiLi9zcmMvY29tcF9ldmFsXCI7XG5cbmltcG9ydCBzdGF0ZSBmcm9tIFwiLi9zcmMvc3RhdGVcIjtcblxuZGVidWdnZXJcbmV4cG9ydCBjb25zdCBzID0gd2luZG93Ll9fc3RhdGVfXyB8fCBzdGF0ZSgpXG53aW5kb3cuX19zdGF0ZV9fID0gc1xuXG5leHBvcnQgZGVmYXVsdCBzO1xuIiwiLy9pbXBvcnQgZDMgZnJvbSAnZDMnXG5cbi8qIEZST00gT1RIRVIgRklMRSAqL1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERvbWFpbnMoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5kb21haW4gfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImtleVwiOnguZG9tYWluXG4gICAgICAgICwgXCJ2YWx1ZVwiOnguY291bnRcbiAgICAgICAgLCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC51bmlxdWVzIFxuICAgICAgICAsIFwidXJsXCI6IHgudXJsXG4gICAgICB9IFxuICAgIH0pXG5cblxuXG4gIHZhbHVlcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7IFxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeFswXS5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAgLCBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LnZhbHVlID0gTWF0aC5sb2coeC50Zl9pZGYpXG4gIH0pXG4gIHZhbHVlcyA9IHZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy50Zl9pZGYgLSBwLnRmX2lkZiB9KVxuXG5cbiAgdmFyIHRvdGFsID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50KngucGVyY2VudF91bmlxdWV9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICB4LnBvcF9wZXJjZW50ID0gMS4wMi9nZXRJREYoeC5rZXkpKjEwMFxuICAgIHgucG9wX3BlcmNlbnQgPSB4LnBvcF9wZXJjZW50ID09IEluZmluaXR5ID8gMCA6IHgucG9wX3BlcmNlbnRcblxuICAgIHgucGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnBlcmNlbnR9KV0pXG4gICAgLm5pY2UoKVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgucGVyY2VudF9ub3JtID0gbm9ybSh4LnBlcmNlbnQpXG4gICAgLy94LnBlcmNlbnRfbm9ybSA9IHgucGVyY2VudFxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHZhbHVlcztcbiAgLy97XG4gIC8vICAgIGtleTogXCJUb3AgRG9tYWluc1wiXG4gIC8vICAsIHZhbHVlczogdmFsdWVzLnNsaWNlKDAsMTAwKVxuICAvL31cbn1cblxuXG4vKiBFTkQgRlJPTSBPVEhFUiBGSUxFICovXG5cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkM191cGRhdGVhYmxlKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGQzX3NwbGF0KHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYWNjZXNzb3IoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWxcbiAgcmV0dXJuIHRoaXNcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIE1lZGlhUGxhbih0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gIHRoaXMuX29uID0ge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbWVkaWFfcGxhbih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBNZWRpYVBsYW4odGFyZ2V0KVxufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1EYXRhKGRhdGEpIHtcblxuICB2YXIgY2ggPSBkYXRhLmNhdGVnb3J5X2hvdXIuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJOQVwiIH0pXG5cbiAgdmFyIGNhdGVnb3J5X2hvdXIgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgKyBcIixcIiArIHguaG91ciB9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICBwLnVuaXF1ZXMgPSAocC51bmlxdWVzIHx8IDApICsgYy51bmlxdWVzXG4gICAgICAgIHAuY291bnQgPSAocC5jb3VudCB8fCAwKSArIGMuY291bnRcbiAgICAgXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuICAgIH0pXG4gICAgLmVudHJpZXMoY2gpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwiY2F0ZWdvcnlcIjogeC5rZXkuc3BsaXQoXCIsXCIpWzBdXG4gICAgICAgICwgXCJob3VyXCI6IHgua2V5LnNwbGl0KFwiLFwiKVsxXVxuICAgICAgICAsIFwiY291bnRcIjogeC52YWx1ZXMuY291bnRcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC52YWx1ZXMudW5pcXVlc1xuICAgICAgfVxuICAgIH0pXG5cbiAgdmFyIHNjYWxlZCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jYXRlZ29yeSB9IClcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHZhciBtaW4gPSBkMy5taW4odixmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50IH0pXG4gICAgICAgICwgbWF4ID0gZDMubWF4KHYsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jb3VudCB9KVxuXG4gICAgICAgdmFyIHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgIC5kb21haW4oW21pbixtYXhdKVxuICAgICAgICAgLnJhbmdlKFswLDEwMF0pXG4gICAgICAgXG4gICAgICAgdmFyIGhvdXJzID0gZDMucmFuZ2UoMCwyNClcbiAgICAgICBob3VycyA9IGhvdXJzLnNsaWNlKC00LDI0KS5jb25jYXQoaG91cnMuc2xpY2UoMCwyMCkpLy8uc2xpY2UoMykuY29uY2F0KGhvdXJzLnNsaWNlKDAsMykpXG5cbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcIm5vcm1lZFwiOiBob3Vycy5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gdltpXSA/IHNjYWxlKHZbaV0uY291bnQpIDogMCB9KVxuICAgICAgICAgLCBcImNvdW50XCI6IGhvdXJzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiB2W2ldID8gdltpXS5jb3VudCA6IDAgfSlcbiAgICAgICB9XG4gICAgICAgLy9yZXR1cm4gaG91cmx5XG4gICAgfSlcbiAgICAuZW50cmllcyhjYXRlZ29yeV9ob3VyKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyB4LnRvdGFsID0gZDMuc3VtKHgudmFsdWVzKTsgcmV0dXJuIHh9KVxuICAgIC8vLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRvdGFsIC0gcC50b3RhbH0pXG5cbiAgcmV0dXJuIHNjYWxlZFxufVxuXG5NZWRpYVBsYW4ucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgLy9kZWJ1Z2dlclxuICAgICAgaWYgKHRoaXMuZGF0YSgpLmNhdGVnb3J5X2hvdXIgPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1xuXG4gICAgICAgICAgdmFyIF9kID0gdGhpcy5kYXRhKClcbiAgICAgICAgICBfZC5kaXNwbGF5X2NhdGVnb3JpZXMgPSBfZC5kaXNwbGF5X2NhdGVnb3JpZXMgfHwge1widmFsdWVzXCI6W119XG4gICAgICAgICAgdmFyIGRkID0gYnVpbGREb21haW5zKF9kKVxuXG4gICAgICB2YXIgc2NhbGVkID0gdHJhbnNmb3JtRGF0YSh0aGlzLmRhdGEoKSlcblxuICAgICAgXG4gICAgICBzY2FsZWQubWFwKGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICB4LmNvdW50ID0geC52YWx1ZXMuY291bnRcbiAgICAgICAgeC52YWx1ZXM9IHgudmFsdWVzLm5vcm1lZFxuXG4gICAgICB9KVxuXG5cbiAgICAgIHRoaXMucmVuZGVyX2xlZnQoc2NhbGVkKVxuICAgICAgdGhpcy5yZW5kZXJfcmlnaHQoZGQsc2NhbGVkKVxuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHJlbmRlcl9yaWdodDogZnVuY3Rpb24oZCxyb3dfZGF0YSkge1xuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLnJoc1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicmhzIGNvbC1tZC00XCIsdHJ1ZSlcblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsIFwiaDNcIixcImgzXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIkFib3V0IHRoZSBwbGFuXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLmRlc2NcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImRlc2NcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiSGluZHNpZ2h0IGhhcyBhdXRvbWF0aWNhbGx5IGRldGVybWluZWQgdGhlIGJlc3Qgc2l0ZXMgYW5kIHRpbWVzIHdoZXJlIHlvdSBzaG91bGQgYmUgdGFyZ2V0aW5nIHVzZXJzLiBUaGUgbWVkaWEgcGxhbiBwcmVzZW50ZWQgYmVsb3cgZGVzY3JpYmVzIHRoZSBvcHRpbWl6YXRpb25zIHRoYXQgY2FuIGJlIG1hZGUgdG8gYW55IHByb3NwZWN0aW5nIG9yIHJldGFyZ2V0aW5nIGNhbXBhaWduIHRvIGxvd2VyIENQQSBhbmQgc2F2ZSBtb25leS5cIilcblxuICAgICAgdmFyIHBsYW5fdGFyZ2V0ID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLnBsYW4tdGFyZ2V0XCIsXCJkaXZcIixyb3dfZGF0YSxmdW5jdGlvbigpe3JldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJwbGFuLXRhcmdldFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjEwMHB4XCIpXG5cbiAgICAgIHBsYW5fdGFyZ2V0LmV4aXQoKS5yZW1vdmUoKVxuXG5cbiAgICAgIGlmIChyb3dfZGF0YS5sZW5ndGggPiAxKSB7XG4gICAgICAgIHZhciByZW1haW5kZXJzID0gcm93X2RhdGEubWFwKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgXG4gICAgICAgICAgdmFyIHRvX3RhcmdldCA9IGQzLnN1bShyLm1hc2subWFwKGZ1bmN0aW9uKHgsaSl7IHJldHVybiB4ID8gci5jb3VudFtpXSA6IDB9KSlcbiAgICAgICAgICB2YXIgdG90YWwgPSBkMy5zdW0oci5jb3VudClcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0b3RhbDogdG90YWxcbiAgICAgICAgICAgICwgdG9fdGFyZ2V0OiB0b190YXJnZXRcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdmFyIGN1dCA9IGQzLnN1bShyZW1haW5kZXJzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC50b190YXJnZXQqMS4wIH0pXG4gICAgICAgIHZhciB0b3RhbCA9IGQzLnN1bShyZW1haW5kZXJzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC50b3RhbCB9KSBcbiAgICAgICAgdmFyIHBlcmNlbnQgPSBjdXQvdG90YWxcblxuICAgICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsIFwiaDMuc3VtbWFyeVwiLFwiaDNcIixmdW5jdGlvbih4KSB7IHJldHVybiBbeF19ICwgZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgICAgLmNsYXNzZWQoXCJzdW1tYXJ5XCIsdHJ1ZSlcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAgIC50ZXh0KFwiUGxhbiBTdW1tYXJ5XCIpXG5cblxuXG4gICAgICAgIGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIud2hhdFwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gW3hdfSAsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAgIC5jbGFzc2VkKFwid2hhdFwiLHRydWUpXG4gICAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0nZm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoyMDBweDtwYWRkaW5nLWxlZnQ6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPlBvdGVudGlhbCBBZHMgU2VydmVkOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiLFwiKSh0b3RhbClcbiAgICAgICAgICB9KVxuXG4gICAgICAgIGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIuYW1vdW50XCIsXCJkaXZcIixmdW5jdGlvbih4KSB7IHJldHVybiBbeF19ICwgZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgICAgLmNsYXNzZWQoXCJhbW91bnRcIix0cnVlKVxuICAgICAgICAgIC5odG1sKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIjxkaXYgc3R5bGU9J2ZvbnQtd2VpZ2h0OmJvbGQ7d2lkdGg6MjAwcHg7cGFkZGluZy1sZWZ0OjEwcHg7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2Rpc3BsYXk6aW5saW5lLWJsb2NrJz5PcHRpbWl6ZWQgQWQgU2VydmluZzo8L2Rpdj5cIiArIGQzLmZvcm1hdChcIixcIikoY3V0KSArIFwiIChcIiArIGQzLmZvcm1hdChcIiVcIikocGVyY2VudCkgKyBcIilcIlxuICAgICAgICAgIH0pXG5cbiAgICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi5jcGFcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFt4XX0gLCBmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgICAuY2xhc3NlZChcImNwYVwiLHRydWUpXG4gICAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0nZm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoyMDBweDtwYWRkaW5nLWxlZnQ6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPkVzdGltYXRlZCBDUEEgcmVkdWN0aW9uOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiJVwiKSgxLXBlcmNlbnQpXG4gICAgICAgICAgfSlcblxuXG5cblxuXG4gICAgICAgXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB2YXIgcGxhbl90YXJnZXQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIucGxhbi1kZXRhaWxzXCIsXCJkaXZcIixyb3dfZGF0YSlcbiAgICAgICAgLmNsYXNzZWQoXCJwbGFuLWRldGFpbHNcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCIxNjBweFwiKVxuXG5cblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LCBcImgzLmRldGFpbHNcIixcImgzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZGV0YWlsc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIlBsYW4gRGV0YWlsc1wiKVxuXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LFwiLndoYXRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIndoYXRcIix0cnVlKVxuICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0ncGFkZGluZy1sZWZ0OjEwcHg7Zm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoxNDBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPkNhdGVnb3J5OjwvZGl2PlwiICsgeC5rZXlcbiAgICAgICAgfSlcblxuICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi5zYXZpbmdcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNhdmluZ1wiLHRydWUpXG4gICAgICAgIC5odG1sKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkLmNvdW50KVxuICAgICAgICAgIHZhciBwZXJjZW50ID0gZDMuc3VtKHguY291bnQsZnVuY3Rpb24oeixpKSB7IHJldHVybiB4Lm1hc2tbaV0gPyAwIDogen0pL2QzLnN1bSh4LmNvdW50LGZ1bmN0aW9uKHosaSkgeyByZXR1cm4geiB9KVxuICAgICAgICAgIHJldHVybiBcIjxkaXYgc3R5bGU9J3BhZGRpbmctbGVmdDoxMHB4O2ZvbnQtd2VpZ2h0OmJvbGQ7d2lkdGg6MTQwcHg7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2Rpc3BsYXk6aW5saW5lLWJsb2NrJz5TdHJhdGVneSBzYXZpbmdzOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiJVwiKShwZXJjZW50KVxuICAgICAgICB9KVxuXG4gICAgICB2YXIgd2hlbiA9IGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIud2hlblwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKXsgcmV0dXJuIDEgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ3aGVuXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI4MHB4XCIpXG4gICAgICAgIC5odG1sKFwiPGRpdiBzdHlsZT0ncGFkZGluZy1sZWZ0OjEwcHg7d2lkdGg6MTQwcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7dmVydGljYWwtYWxpZ246dG9wJz5XaGVuIHRvIHNlcnZlOjwvZGl2PlwiKVxuICAgICAgICAuZGF0dW0oZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBib29sID0gZmFsc2VcbiAgICAgICAgICB2YXIgcG9zID0gLTFcbiAgICAgICAgICB2YXIgc3RhcnRfZW5kcyA9IHgubWFzay5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IFxuICAgICAgICAgICAgICBwb3MgKz0gMVxuICAgICAgICAgICAgICBpZiAoYm9vbCAhPSBjKSB7XG4gICAgICAgICAgICAgICAgYm9vbCA9IGNcbiAgICAgICAgICAgICAgICBwLnB1c2gocG9zKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgICB9LFtdKVxuICAgICAgICAgIHZhciBzID0gXCJcIlxuICAgICAgICAgIHN0YXJ0X2VuZHMubWFwKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgICAgaWYgKChpICE9IDApICYmICgoaSUyKSA9PSAwKSkgcyArPSBcIiwgXCJcbiAgICAgICAgICAgIGlmIChpJTIpIHMgKz0gXCIgLSBcIlxuXG4gICAgICAgICAgICBpZiAoeCA9PSAwKSBzICs9IFwiMTJhbVwiXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIG51bSA9ICh4KzEpJTEyXG4gICAgICAgICAgICAgIG51bSA9IG51bSA9PSAwID8gMTIgOiBudW1cbiAgICAgICAgICAgICAgcyArPSBudW0gKyAoKHggPiAxMSkgPyBcInBtXCIgOiBcImFtXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgIFxuICAgICAgICAgIH0pXG4gICAgICAgICAgaWYgKChzdGFydF9lbmRzLmxlbmd0aCkgJSAyKSBzICs9IFwiIC0gMTJhbVwiXG5cbiAgICAgICAgICByZXR1cm4gcy5zcGxpdChcIiwgXCIpXG4gICAgICAgIH0pXG5cbiAgICAgICB2YXIgaXRlbXMgPSBkM191cGRhdGVhYmxlKHdoZW4sXCIuaXRlbXNcIixcImRpdlwiKVxuICAgICAgICAgLmNsYXNzZWQoXCJpdGVtc1wiLHRydWUpXG4gICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQwcHhcIilcbiAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICAgZDNfc3BsYXQoaXRlbXMsXCIuaXRlbVwiLFwiZGl2XCIpXG4gICAgICAgICAuY2xhc3NlZChcIml0ZW1cIix0cnVlKVxuICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0MHB4XCIpXG4gICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJub25lXCIpXG4gICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwibm9ybWFsXCIpXG4gICAgICAgICAudGV4dChTdHJpbmcpXG5cblxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCJoMy5leGFtcGxlLXNpdGVzXCIsXCJoM1wiKVxuICAgICAgICAuY2xhc3NlZChcImV4YW1wbGUtc2l0ZXNcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjIwcHhcIilcbiAgICAgICAgLnRleHQoXCJFeGFtcGxlIFNpdGVzXCIpXG5cblxuICAgICAgIHZhciByb3dzID0gZDNfc3BsYXQod3JhcHBlcixcIi5yb3dcIixcImRpdlwiLGQuc2xpY2UoMCwxNSksZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxOHB4XCIpXG4gICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjIwcHhcIilcblxuICAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICByZXR1cm4geC5rZXlcbiAgICAgICAgIH0pXG5cbiAgICAgICByb3dzLmV4aXQoKS5yZW1vdmUoKVxuXG5cbiAgICB9XG4gICwgcmVuZGVyX2xlZnQ6IGZ1bmN0aW9uKHNjYWxlZCkge1xuXG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIubGhzXCIsXCJkaXZcIixzY2FsZWQpXG4gICAgICAgIC5jbGFzc2VkKFwibGhzIGNvbC1tZC04XCIsdHJ1ZSlcblxuICAgICAgd3JhcHBlci5leGl0KCkucmVtb3ZlKClcblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsIFwiaDNcIixcImgzXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIk1lZGlhIFBsYW4gKENhdGVnb3J5IGFuZCBUaW1lIE9wdGltaXphdGlvbilcIilcblxuICAgICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLmhlYWRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImhlYWRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIxcHhcIilcblxuICAgICAgdmFyIG5hbWUgPSBkM191cGRhdGVhYmxlKGhlYWQsXCIubmFtZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNzBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICAgZDNfc3BsYXQoaGVhZCxcIi5ob3VyXCIsXCJkaXZcIixkMy5yYW5nZSgxLDI1KSxmdW5jdGlvbih4KSB7IHJldHVybiB4IH0pXG4gICAgICAgIC5jbGFzc2VkKFwic3EgaG91clwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuODVlbVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGlmICh4ID09IDEpIHJldHVybiBcIjxiPjFhPC9iPlwiXG4gICAgICAgICAgaWYgKHggPT0gMjQpIHJldHVybiBcIjxiPjEyYTwvYj5cIlxuICAgICAgICAgIGlmICh4ID09IDEyKSByZXR1cm4gXCI8Yj4xMnA8L2I+XCJcbiAgICAgICAgICByZXR1cm4geCA+IDExID8geCUxMiA6IHhcbiAgICAgICAgfSlcblxuXG4gICAgICB2YXIgcm93ID0gZDNfc3BsYXQod3JhcHBlcixcIi5yb3dcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMXB4XCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgKyBcIiByb3dcIiB9KVxuICAgICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICB2YXIgX2QgPSBzZWxmLmRhdGEoKVxuICAgICAgICAgIF9kLmRpc3BsYXlfY2F0ZWdvcmllcyA9IF9kLmRpc3BsYXlfY2F0ZWdvcmllcyB8fCB7XCJ2YWx1ZXNcIjpbXX1cbiAgICAgICAgICB2YXIgZGQgPSBidWlsZERvbWFpbnMoX2QpXG5cbiAgICAgICAgICB2YXIgZCA9IGRkLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6LnBhcmVudF9jYXRlZ29yeV9uYW1lID09IHgua2V5fSlcbiAgICAgICAgICBcblxuICAgICAgICAgIHNlbGYucmVuZGVyX3JpZ2h0KGQseClcbiAgICAgICAgfSlcblxuICAgICAgdmFyIE1BR0lDID0gMjUgXG5cbiAgICAgIHZhciBuYW1lID0gZDNfdXBkYXRlYWJsZShyb3csXCIubmFtZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNzBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICB2YXIgY29sb3JzID0gW1wiI2ExZDk5YlwiLCBcIiM3NGM0NzZcIiwgXCIjNDFhYjVkXCIsIFwiIzIzOGI0NVwiLCBcIiMwMDZkMmNcIiwgXCIjMDA0NDFiXCJdXG4gICAgICB2YXIgY29sb3JzID0gW1wiIzIzOGI0NVwiXVxuXG4gICAgICB2YXIgbyA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgICAuZG9tYWluKFstMjUsMTAwXSlcbiAgICAgICAgLnJhbmdlKGNvbG9ycyk7XG5cbiAgICAgIHZhciBzcXVhcmUgPSBkM19zcGxhdChyb3csXCIuc3FcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWVzIH0sIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSB9KSBcbiAgICAgICAgLmNsYXNzZWQoXCJzcVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLGZ1bmN0aW9uKHgsaSkgeyBcbiAgICAgICAgICB2YXIgcGQgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX187IFxuICAgICAgICAgIHBkLm1hc2sgPSBwZC5tYXNrIHx8IFtdXG4gICAgICAgICAgcGQubWFza1tpXSA9ICgoeCA+IE1BR0lDKSAmJiAoIChwZC52YWx1ZXNbaS0xXSA+IE1BR0lDIHx8IGZhbHNlKSB8fCAocGQudmFsdWVzW2krMV0gPiBNQUdJQ3x8IGZhbHNlKSApKVxuICAgICAgICAgIC8vcmV0dXJuIHBkLm1hc2tbaV0gPyBvKHBkLnZhbHVlc1tpXSkgIDogXCJyZXBlYXRpbmctbGluZWFyLWdyYWRpZW50KCA0NWRlZywgI2ZlZTBkMiwgI2ZlZTBkMiAycHgsICNmY2JiYTEgNXB4LCAjZmNiYmExIDJweCkgXCJcbiAgICAgICAgICByZXR1cm4gcGQubWFza1tpXSA/IFxuICAgICAgICAgICAgXCJyZXBlYXRpbmctbGluZWFyLWdyYWRpZW50KCAxMzVkZWcsICMyMzhiNDUsICMyMzhiNDUgMnB4LCAjMDA2ZDJjIDVweCwgIzAwNmQyYyAycHgpIFwiIDogXG4gICAgICAgICAgICBcInJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoIDQ1ZGVnLCAjZmVlMGQyLCAjZmVlMGQyIDJweCwgI2ZjYmJhMSA1cHgsICNmY2JiYTEgMnB4KSBcIlxuXG4gICAgICAgIH0pXG5cblxuICAgIH1cbiAgLCBkYXRhOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fdGFyZ2V0LmRhdHVtKClcbiAgICAgIHRoaXMuX3RhcmdldC5kYXR1bShkKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbixmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbiIsIi8vaW1wb3J0IGQzIGZyb20gJ2QzJ1xuXG5mdW5jdGlvbiBkM191cGRhdGVhYmxlKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiO1xuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZnVuY3Rpb24oeCl7cmV0dXJuIGRhdGEgPyBbZGF0YV0gOiBbeF19LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4gW3hdfVxuICApO1xuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSk7XG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZnVuY3Rpb24gZDNfc3BsYXQodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCI7XG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gICk7XG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKTtcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5cbnZhciB0eXBld2F0Y2ggPSAoZnVuY3Rpb24oKXtcbiAgdmFyIHRpbWVyID0gMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNhbGxiYWNrLCBtcyl7XG4gICAgY2xlYXJUaW1lb3V0ICh0aW1lcik7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGNhbGxiYWNrLCBtcyk7XG4gIH07XG59KSgpO1xuXG5cblxuZnVuY3Rpb24gRmlsdGVyKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMuX2RhdGEgPSBmYWxzZTtcbiAgdGhpcy5fb24gPSB7fTtcbiAgdGhpcy5fcmVuZGVyX29wID0ge307XG59XG5cbmZ1bmN0aW9uIGZpbHRlciQyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEZpbHRlcih0YXJnZXQpXG59XG5cbkZpbHRlci5wcm90b3R5cGUgPSB7XG4gICAgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIuZmlsdGVycy13cmFwcGVyXCIsXCJkaXZcIix0aGlzLmRhdGEoKSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlcnMtd3JhcHBlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLCBcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1yaWdodFwiLCBcIjIwcHhcIik7XG5cbiAgICAgIHZhciBmaWx0ZXJzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmZpbHRlcnNcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlcnNcIix0cnVlKTtcbiAgICAgIFxuICAgICAgdmFyIGZpbHRlciA9IGQzX3NwbGF0KGZpbHRlcnMsXCIuZmlsdGVyXCIsXCJkaXZcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpICsgeC5maWVsZCB9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpO1xuXG4gICAgICBmaWx0ZXIuZXhpdCgpLnJlbW92ZSgpO1xuICAgICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBmaWx0ZXIuZWFjaChmdW5jdGlvbih2LHBvcykge1xuICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgIHNlbGYuZmlsdGVyUm93KGR0aGlzLCBzZWxmLl9maWVsZHMsIHNlbGYuX29wcywgdik7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgdGhpcy5maWx0ZXJGb290ZXIod3JhcCk7XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgICBcbiAgICB9XG4gICwgb3BzOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb3BzXG4gICAgICB0aGlzLl9vcHMgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZmllbGRzOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZmllbGRzXG4gICAgICB0aGlzLl9maWVsZHMgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgXHR9XG4gICwgZGF0YTogZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2RhdGFcbiAgICAgIHRoaXMuX2RhdGEgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgXHR9XG4gICwgdGV4dDogZnVuY3Rpb24oZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZm4gfHwgZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSB9XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcmVuZGVyX29wOiBmdW5jdGlvbihvcCxmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9yZW5kZXJfb3Bbb3BdIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9yZW5kZXJfb3Bbb3BdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgYnVpbGRPcDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICB2YXIgb3AgPSBvYmoub3BcbiAgICAgICAgLCBmaWVsZCA9IG9iai5maWVsZFxuICAgICAgICAsIHZhbHVlID0gb2JqLnZhbHVlO1xuICAgIFxuICAgICAgaWYgKCBbb3AsZmllbGQsdmFsdWVdLmluZGV4T2YodW5kZWZpbmVkKSA+IC0xKSByZXR1cm4gZnVuY3Rpb24oKSB7cmV0dXJuIHRydWV9XG4gICAgXG4gICAgICByZXR1cm4gdGhpcy5fb3BzW29wXShmaWVsZCwgdmFsdWUpXG4gICAgfVxuICAsIGZpbHRlclJvdzogZnVuY3Rpb24oX2ZpbHRlciwgZmllbGRzLCBvcHMsIHZhbHVlKSB7XG4gICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciByZW1vdmUgPSBkM191cGRhdGVhYmxlKF9maWx0ZXIsXCIucmVtb3ZlXCIsXCJhXCIpXG4gICAgICAgIC5jbGFzc2VkKFwicmVtb3ZlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5odG1sKFwiJiMxMDAwNTtcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIG5ld19kYXRhID0gc2VsZi5kYXRhKCkuZmlsdGVyKGZ1bmN0aW9uKGYpIHsgcmV0dXJuIGYgIT09IHggfSk7XG4gICAgICAgICAgc2VsZi5kYXRhKG5ld19kYXRhKTtcbiAgICAgICAgICBzZWxmLmRyYXcoKTtcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcblxuICAgICAgICB9KTtcblxuICAgICAgdmFyIGZpbHRlciA9IGQzX3VwZGF0ZWFibGUoX2ZpbHRlcixcIi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXJcIix0cnVlKTtcblxuICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic2VsZWN0LmZpZWxkXCIsXCJzZWxlY3RcIixmaWVsZHMpXG4gICAgICAgIC5jbGFzc2VkKFwiZmllbGRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTY1cHhcIilcbiAgICAgICAgLm9uKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgIHZhbHVlLmZpZWxkID0gdGhpcy5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX187XG4gICAgICAgICAgXG4gICAgICAgICAgdmFyIHBvcyA9IDA7XG4gICAgICAgICAgZmllbGRzLm1hcChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgIGlmICh4ID09IHZhbHVlLmZpZWxkKSBwb3MgPSBpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdmFyIHNlbGVjdGVkID0gb3BzW3Bvc10uZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5ID09IHZhbHVlLm9wIH0pO1xuICAgICAgICAgIGlmIChzZWxlY3RlZC5sZW5ndGggPT0gMCkgdmFsdWUub3AgPSBvcHNbcG9zXVswXS5rZXk7XG4gICAgICAgICAgLy92YWx1ZS5mbiA9IHNlbGYuYnVpbGRPcCh2YWx1ZSlcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcblxuICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAgIHNlbGYuZHJhd09wcyhmaWx0ZXIsIG9wc1twb3NdLCB2YWx1ZSwgcG9zKTtcbiAgICAgICAgfSk7XG4gICAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIilcbiAgICAgICAgLnByb3BlcnR5KFwiZGlzYWJsZWRcIiAsdHJ1ZSlcbiAgICAgICAgLnByb3BlcnR5KFwiaGlkZGVuXCIsIHRydWUpXG4gICAgICAgIC50ZXh0KFwiRmlsdGVyLi4uXCIpO1xuXG4gICAgICBcbiAgICAgIGQzX3NwbGF0KHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSlcbiAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4ID09IHZhbHVlLmZpZWxkID8gXCJzZWxlY3RlZFwiIDogdW5kZWZpbmVkIH0pO1xuXG4gICAgICBpZiAodmFsdWUub3AgJiYgdmFsdWUuZmllbGQgJiYgdmFsdWUudmFsdWUpIHtcbiAgICAgICAgdmFyIHBvcyA9IGZpZWxkcy5pbmRleE9mKHZhbHVlLmZpZWxkKTtcbiAgICAgICAgc2VsZi5kcmF3T3BzKGZpbHRlciwgb3BzW3Bvc10sIHZhbHVlLCBwb3MpO1xuICAgICAgfVxuXG5cbiAgICB9XG4gICwgZHJhd09wczogZnVuY3Rpb24oZmlsdGVyLCBvcHMsIHZhbHVlKSB7XG5cbiAgICAgIFxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcInNlbGVjdC5vcFwiLFwic2VsZWN0XCIsZmFsc2UsIGZ1bmN0aW9uKHgpIHtyZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwib3BcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5vbihcImNoYW5nZVwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICB2YWx1ZS5vcCA9IHRoaXMuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleTtcbiAgICAgICAgICAvL3ZhbHVlLmZuID0gc2VsZi5idWlsZE9wKHZhbHVlKVxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpO1xuICAgICAgICAgIHNlbGYuZHJhd0lucHV0KGZpbHRlciwgdmFsdWUsIHZhbHVlLm9wKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIC8vdmFyIGRmbHQgPSBbe1wia2V5XCI6XCJTZWxlY3QgT3BlcmF0aW9uLi4uXCIsXCJkaXNhYmxlZFwiOnRydWUsXCJoaWRkZW5cIjp0cnVlfV1cblxuICAgICAgdmFyIG5ld19vcHMgPSBvcHM7IC8vZGZsdC5jb25jYXQob3BzKVxuXG4gICAgICB2YWx1ZS5vcCA9IHZhbHVlLm9wIHx8IG5ld19vcHNbMF0ua2V5O1xuXG4gICAgICB2YXIgb3BzID0gZDNfc3BsYXQoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIixuZXdfb3BzLGZ1bmN0aW9uKHgpe3JldHVybiB4LmtleX0pXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5LnNwbGl0KFwiLlwiKVswXSB9KSBcbiAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSA9PSB2YWx1ZS5vcCA/IFwic2VsZWN0ZWRcIiA6IHVuZGVmaW5lZCB9KTtcblxuICAgICAgb3BzLmV4aXQoKS5yZW1vdmUoKTtcbiAgICAgIHNlbGYuZHJhd0lucHV0KGZpbHRlciwgdmFsdWUsIHZhbHVlLm9wKTtcblxuICAgIH1cbiAgLCBkcmF3SW5wdXQ6IGZ1bmN0aW9uKGZpbHRlciwgdmFsdWUsIG9wKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi52YWx1ZVwiKS5yZW1vdmUoKTtcbiAgICAgIHZhciByID0gdGhpcy5fcmVuZGVyX29wW29wXTtcblxuICAgICAgaWYgKHIpIHtcbiAgICAgICAgcmV0dXJuIHIuYmluZCh0aGlzKShmaWx0ZXIsdmFsdWUpXG4gICAgICB9XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwiaW5wdXQudmFsdWVcIixcImlucHV0XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidmFsdWVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE1MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxZW1cIilcblxuICAgICAgICAuYXR0cihcInZhbHVlXCIsIHZhbHVlLnZhbHVlKVxuICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICB2YXIgdCA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAgIHR5cGV3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdC52YWx1ZTtcbiAgICAgICAgICAgIC8vdmFsdWUuZm4gPSBzZWxmLmJ1aWxkT3AodmFsdWUpXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcbiAgICAgICAgICB9LDEwMDApO1xuICAgICAgICB9KTtcbiAgICBcbiAgICB9XG4gICwgZmlsdGVyRm9vdGVyOiBmdW5jdGlvbih3cmFwKSB7XG4gICAgICB2YXIgZm9vdGVyID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmZpbHRlci1mb290ZXJcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlci1mb290ZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjEwcHhcIik7XG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgXG4gICAgICBkM191cGRhdGVhYmxlKGZvb3RlcixcIi5hZGRcIixcImFcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJhZGRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuaHRtbChcIiYjNjUyOTE7XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjEuNXB4IHNvbGlkICM0MjhCQ0NcIilcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICBcbiAgICAgICAgICB2YXIgZCA9IHNlbGYuX2RhdGE7XG4gICAgICAgICAgaWYgKGQubGVuZ3RoID09IDAgfHwgT2JqZWN0LmtleXMoZC5zbGljZSgtMSkpLmxlbmd0aCA+IDApIGQucHVzaCh7fSk7XG4gICAgICAgICAgc2VsZi5kcmF3KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAsIHR5cGV3YXRjaDogdHlwZXdhdGNoXG59O1xuXG5mdW5jdGlvbiBhY2Nlc3NvciQxKGF0dHIsIHZhbCkge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzW1wiX1wiICsgYXR0cl1cbiAgdGhpc1tcIl9cIiArIGF0dHJdID0gdmFsO1xuICByZXR1cm4gdGhpc1xufVxuXG5mdW5jdGlvbiBGaWx0ZXJEYXRhKGRhdGEpIHtcbiAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gIHRoaXMuX2wgPSBcIm9yXCI7XG59XG5cbmZ1bmN0aW9uIGZpbHRlcl9kYXRhKGRhdGEpIHtcbiAgcmV0dXJuIG5ldyBGaWx0ZXJEYXRhKGRhdGEpXG59XG5cbkZpbHRlckRhdGEucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IkMS5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfVxuICAsIGxvZ2ljOiBmdW5jdGlvbihsKSB7XG4gICAgICBpZiAobCA9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9sXG4gICAgICB0aGlzLl9sID0gKGwgPT0gXCJhbmRcIikgPyBcImFuZFwiIDogXCJvclwiO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb3A6IGZ1bmN0aW9uKG9wLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vcHNbb3BdIHx8IHRoaXMuX29wc1tcImVxdWFsc1wiXTtcbiAgICAgIHRoaXMuX29wc1tvcF0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgYnk6IGZ1bmN0aW9uKGIpIHtcbiAgICAgIFxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICAgICwgZmlsdGVyID0gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgaWYgKGIubGVuZ3RoID09IDApIHJldHVybiB0cnVlXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBtYXNrID0gYi5tYXAoZnVuY3Rpb24oeikge1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgdmFyIHNwbGl0ID0gei5maWVsZC5zcGxpdChcIi5cIiksIGZpZWxkID0gc3BsaXQuc2xpY2UoLTEpWzBdXG4gICAgICAgICAgICAgICAgLCBvYmogPSBzcGxpdC5zbGljZSgwLC0xKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwW2NdIH0seClcbiAgICAgICAgICAgICAgICAsIG9zcGxpdCA9IHoub3Auc3BsaXQoXCIuXCIpLCBvcCA9IG9zcGxpdFswXTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHJldHVybiBzZWxmLm9wKG9wKShmaWVsZCx6LnZhbHVlKShvYmopXG4gICAgICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4IH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2VsZi5fbCA9PSBcImFuZFwiKSByZXR1cm4gbWFzay5sZW5ndGggPT0gYi5sZW5ndGhcbiAgICAgICAgICAgIHJldHVybiBtYXNrLmxlbmd0aCA+IDBcbiAgICAgICAgICB9O1xuICAgICAgXG4gICAgICByZXR1cm4gdGhpcy5fZGF0YS5maWx0ZXIoZmlsdGVyKVxuXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl07XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBfb3BzOiB7XG4gICAgICAgIFwiZXF1YWxzXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKSA9PSBTdHJpbmcodmFsdWUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4vLyAgICAgICwgXCJjb250YWluc1wiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbi8vICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4vLyAgICAgICAgICAgIHJldHVybiBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMVxuLy8gICAgICAgICAgfVxuLy8gICAgICAgIH1cbiAgICAgICwgXCJzdGFydHMgd2l0aFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA9PSAwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiZW5kcyB3aXRoXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gKFN0cmluZyh4W2ZpZWxkXSkubGVuZ3RoIC0gU3RyaW5nKHZhbHVlKS5sZW5ndGgpID09IFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImRvZXMgbm90IGVxdWFsXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKSAhPSBTdHJpbmcodmFsdWUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgc2V0XCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHhbZmllbGRdICE9IHVuZGVmaW5lZCkgJiYgKHhbZmllbGRdICE9IFwiXCIpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgbm90IHNldFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIHhbZmllbGRdID09IHVuZGVmaW5lZFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImJldHdlZW5cIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh4W2ZpZWxkXSkgPj0gdmFsdWVbMF0gJiYgcGFyc2VJbnQoeFtmaWVsZF0pIDw9IHZhbHVlWzFdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMSB9LCAwKSA+IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAsIFwiaXMgbm90IGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPT0gMFxuICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICAgICwgXCJkb2VzIG5vdCBjb250YWluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKS50b0xvd2VyQ2FzZSgpKSA+IC0xIH0sIDApID09IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAsIFwiY29udGFpbnNcIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnRvTG93ZXJDYXNlKCkuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpLnRvTG93ZXJDYXNlKCkpID4gLTEgfSwgMCkgPiAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciB2ZXJzaW9uID0gXCIwLjAuMVwiO1xuXG5leHBvcnQgeyB2ZXJzaW9uLCBmaWx0ZXIkMiBhcyBmaWx0ZXIsIGZpbHRlcl9kYXRhIH07XG4iLCJleHBvcnQgZnVuY3Rpb24gcHJlcERhdGEoZGQpIHtcbiAgdmFyIHAgPSBbXVxuICBkMy5yYW5nZSgwLDI0KS5tYXAoZnVuY3Rpb24odCkge1xuICAgIFtcIjBcIixcIjIwXCIsXCI0MFwiXS5tYXAoZnVuY3Rpb24obSkge1xuICAgICAgaWYgKHQgPCAxMCkgcC5wdXNoKFwiMFwiICsgU3RyaW5nKHQpK1N0cmluZyhtKSlcbiAgICAgIGVsc2UgcC5wdXNoKFN0cmluZyh0KStTdHJpbmcobSkpXG5cbiAgICB9KVxuICB9KVxuICB2YXIgcm9sbGVkID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbihrKSB7IHJldHVybiBrLmhvdXIgKyBrLm1pbnV0ZSB9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICBwLmFydGljbGVzW2MudXJsXSA9IHRydWVcbiAgICAgICAgcC52aWV3cyArPSBjLmNvdW50XG4gICAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHsgYXJ0aWNsZXM6IHt9LCB2aWV3czogMCwgc2Vzc2lvbnM6IDB9KVxuICAgIH0pXG4gICAgLmVudHJpZXMoZGQpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICBPYmplY3Qua2V5cyh4LnZhbHVlcykubWFwKGZ1bmN0aW9uKHkpIHtcbiAgICAgICAgeFt5XSA9IHgudmFsdWVzW3ldXG4gICAgICB9KVxuICAgICAgeC5hcnRpY2xlX2NvdW50ID0gT2JqZWN0LmtleXMoeC5hcnRpY2xlcykubGVuZ3RoXG4gICAgICB4LmhvdXIgPSB4LmtleS5zbGljZSgwLDIpXG4gICAgICB4Lm1pbnV0ZSA9IHgua2V5LnNsaWNlKDIpXG4gICAgICB4LnZhbHVlID0geC5hcnRpY2xlX2NvdW50XG4gICAgICB4LmtleSA9IHAuaW5kZXhPZih4LmtleSlcbiAgICAgIC8vZGVsZXRlIHhbJ2FydGljbGVzJ11cbiAgICAgIHJldHVybiB4XG4gICAgfSlcbiAgcmV0dXJuIHJvbGxlZFxufVxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU3VtbWFyeSh1cmxzLGNvbXBhcmlzb24pIHtcbiAgdmFyIHN1bW1hcnlfZGF0YSA9IGJ1aWxkU3VtbWFyeURhdGEodXJscylcbiAgICAsIHBvcF9zdW1tYXJ5X2RhdGEgPSBidWlsZFN1bW1hcnlEYXRhKGNvbXBhcmlzb24pXG5cbiAgcmV0dXJuIGJ1aWxkU3VtbWFyeUFnZ3JlZ2F0aW9uKHN1bW1hcnlfZGF0YSxwb3Bfc3VtbWFyeV9kYXRhKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5RGF0YShkYXRhKSB7XG4gIHZhciByZWR1Y2VkID0gZGF0YS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICBwLmRvbWFpbnNbYy5kb21haW5dID0gdHJ1ZVxuICAgICAgcC5hcnRpY2xlc1tjLnVybF0gPSB0cnVlXG4gICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG5cbiAgICAgIHJldHVybiBwXG4gICAgfSx7XG4gICAgICAgIGRvbWFpbnM6IHt9XG4gICAgICAsIGFydGljbGVzOiB7fVxuICAgICAgLCBzZXNzaW9uczogMFxuICAgICAgLCB2aWV3czogMFxuICAgIH0pXG5cbiAgcmVkdWNlZC5kb21haW5zID0gT2JqZWN0LmtleXMocmVkdWNlZC5kb21haW5zKS5sZW5ndGhcbiAgcmVkdWNlZC5hcnRpY2xlcyA9IE9iamVjdC5rZXlzKHJlZHVjZWQuYXJ0aWNsZXMpLmxlbmd0aFxuXG4gIHJldHVybiByZWR1Y2VkXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN1bW1hcnlBZ2dyZWdhdGlvbihzYW1wLHBvcCkge1xuICAgICAgdmFyIGRhdGFfc3VtbWFyeSA9IHt9XG4gICAgICBPYmplY3Qua2V5cyhzYW1wKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgICBkYXRhX3N1bW1hcnlba10gPSB7XG4gICAgICAgICAgICBzYW1wbGU6IHNhbXBba11cbiAgICAgICAgICAsIHBvcHVsYXRpb246IHBvcFtrXVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gZGF0YV9zdW1tYXJ5XG4gIFxufVxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2F0ZWdvcmllc09sZChkYXRhKSB7XG4gIHZhciB2YWx1ZXMgPSBkYXRhLmNhdGVnb3J5XG4gICAgICAgIC5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB7XCJrZXlcIjogeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSwgXCJ2YWx1ZVwiOiB4LmNvdW50IH0gfSlcbiAgICAgICAgLnNvcnQoZnVuY3Rpb24ocCxjKSB7cmV0dXJuIGMudmFsdWUgLSBwLnZhbHVlIH0pLnNsaWNlKDAsMTUpXG4gICAgLCB0b3RhbCA9IHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCwgeCkge3JldHVybiBwICsgeC52YWx1ZSB9LCAwKVxuXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiQ2F0ZWdvcmllc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyB4LnBlcmNlbnQgPSB4LnZhbHVlL3RvdGFsOyByZXR1cm4geH0pXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVGltZXMoZGF0YSkge1xuXG4gIHZhciBob3VyID0gZGF0YS5jdXJyZW50X2hvdXJcblxuICB2YXIgY2F0ZWdvcmllcyA9IGRhdGEuZGlzcGxheV9jYXRlZ29yaWVzLnZhbHVlc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKSB7XG4gICAgaG91ciA9IGRhdGEuY2F0ZWdvcnlfaG91ci5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMX0pXG4gICAgaG91ciA9IGQzLm5lc3QoKVxuICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LmhvdXIgfSlcbiAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5taW51dGUgfSlcbiAgICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IFxuICAgICAgICAgIHAudW5pcXVlcyA9IChwLnVuaXF1ZXMgfHwgMCkgKyBjLnVuaXF1ZXM7IFxuICAgICAgICAgIHAuY291bnQgPSAocC5jb3VudCB8fCAwKSArIGMuY291bnQ7ICBcbiAgICAgICAgICByZXR1cm4gcCB9LHt9KVxuICAgICAgfSlcbiAgICAgIC5lbnRyaWVzKGhvdXIpXG4gICAgICAubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIGNvbnNvbGUubG9nKHgudmFsdWVzKTsgXG4gICAgICAgIHJldHVybiB4LnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxrKXsgXG4gICAgICAgICAgcFsnbWludXRlJ10gPSBwYXJzZUludChrLmtleSk7IFxuICAgICAgICAgIHBbJ2NvdW50J10gPSBrLnZhbHVlcy5jb3VudDsgXG4gICAgICAgICAgcFsndW5pcXVlcyddID0gay52YWx1ZXMudW5pcXVlczsgXG4gICAgICAgICAgcmV0dXJuIHAgXG4gICAgICB9LCB7XCJob3VyXCI6eC5rZXl9KSB9IClcbiAgfVxuXG4gIHZhciB2YWx1ZXMgPSBob3VyXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB7XCJrZXlcIjogcGFyc2VGbG9hdCh4LmhvdXIpICsgMSArIHgubWludXRlLzYwLCBcInZhbHVlXCI6IHguY291bnQgfSB9KVxuXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiQnJvd3NpbmcgYmVoYXZpb3IgYnkgdGltZVwiXG4gICAgLCB2YWx1ZXM6IHZhbHVlc1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFRvcGljcyhkYXRhKSB7XG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkYXRhLmRpc3BsYXlfY2F0ZWdvcmllcy52YWx1ZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cblxuICB2YXIgaWRmID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7cmV0dXJuIHgudG9waWN9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkge3JldHVybiB4WzBdLmlkZiB9KVxuICAgIC5tYXAoZGF0YS5mdWxsX3VybHMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIkludGVybmV0ICYgVGVsZWNvbVwifSkgKVxuXG4gIHZhciBnZXRJREYgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIChpZGZbeF0gPT0gXCJOQVwiKSB8fCAoaWRmW3hdID4gODY4NikgPyAwIDogaWRmW3hdXG4gIH1cblxuICB2YXIgdmFsdWVzID0gZGF0YS5mdWxsX3VybHNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG9waWMgPyB4LnRvcGljLnRvTG93ZXJDYXNlKCkgIT0gXCJubyB0b3BpY1wiIDogdHJ1ZSB9KVxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJrZXlcIjp4LnRvcGljXG4gICAgICAgICwgXCJ2YWx1ZVwiOnguY291bnRcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC51bmlxdWVzIFxuICAgICAgICAsIFwidXJsXCI6IHgudXJsXG4gICAgICB9IFxuICAgIH0pXG5cblxuXG4gIHZhbHVlcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7IFxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwia2V5XCI6IHhbMF0ua2V5XG4gICAgICAgICAsIFwidmFsdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy52YWx1ZX0sMClcbiAgICAgICAgICwgXCJwZXJjZW50X3VuaXF1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnVuaXF1ZXMvYy52YWx1ZX0sMCkveC5sZW5ndGhcbiAgICAgICAgICwgXCJ1cmxzXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwLmluZGV4T2YoYy51cmwpID09IC0xID8gcC5wdXNoKGMudXJsKSA6IHA7IHJldHVybiBwIH0sW10pXG5cbiAgICAgICB9IFxuICAgIH0pXG4gICAgLmVudHJpZXModmFsdWVzKS5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB4LnZhbHVlcyB9KVxuXG4gIGlmIChjYXRlZ29yaWVzLmxlbmd0aCA+IDApXG4gICAgdmFsdWVzID0gdmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KSB7cmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZih4LnBhcmVudF9jYXRlZ29yeV9uYW1lKSA+IC0xIH0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC50Zl9pZGYgPSBnZXRJREYoeC5rZXkpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSBcbiAgICB4LmNvdW50ID0geC52YWx1ZVxuICAgIHguaW1wb3J0YW5jZSA9IE1hdGgubG9nKHgudGZfaWRmKVxuICB9KVxuICB2YWx1ZXMgPSB2YWx1ZXMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudGZfaWRmIC0gcC50Zl9pZGYgfSlcblxuXG4gIHZhciB0b3RhbCA9IGQzLnN1bSh2YWx1ZXMsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jb3VudCp4LnBlcmNlbnRfdW5pcXVlfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgeC5wb3BfcGVyY2VudCA9IDEuMDIvZ2V0SURGKHgua2V5KSoxMDBcbiAgICB4LnBvcF9wZXJjZW50ID0geC5wb3BfcGVyY2VudCA9PSBJbmZpbml0eSA/IDAgOiB4LnBvcF9wZXJjZW50XG5cbiAgICB4LnNhbXBsZV9wZXJjZW50ID0geC5jb3VudCp4LnBlcmNlbnRfdW5pcXVlL3RvdGFsKjEwMFxuICB9KVxuXG4gIHZhciBub3JtID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAucmFuZ2UoWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnBvcF9wZXJjZW50fSldKVxuICAgIC5kb21haW4oWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHguc2FtcGxlX3BlcmNlbnR9KV0pXG4gICAgLm5pY2UoKVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHguc2FtcGxlX3BlcmNlbnRfbm9ybSA9IG5vcm0oeC5zYW1wbGVfcGVyY2VudClcblxuICAgIHgucmF0aW8gPSB4LnNhbXBsZV9wZXJjZW50L3gucG9wX3BlcmNlbnRcbiAgICAvL3gucGVyY2VudF9ub3JtID0geC5wZXJjZW50XG4gIH0pXG5cblxuXG4gIFxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIlRvcCBUb3BpY3NcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCwzMDApXG4gIH1cbn1cblxuXG5cblxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRPbnNpdGVTdW1tYXJ5KGRhdGEpIHtcbiAgdmFyIHllc3RlcmRheSA9IGRhdGEudGltZXNlcmllc19kYXRhWzBdXG4gIHZhciB2YWx1ZXMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwia2V5XCI6IFwiUGFnZSBWaWV3c1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IHllc3RlcmRheS52aWV3c1xuICAgICAgICB9XG4gICAgICAsIHtcbiAgICAgICAgICAgIFwia2V5XCI6IFwiVW5pcXVlIFZpc2l0b3JzXCJcbiAgICAgICAgICAsIFwidmFsdWVcIjogeWVzdGVyZGF5LnVuaXF1ZXNcblxuICAgICAgICB9XG4gICAgXVxuICByZXR1cm4ge1wia2V5XCI6XCJPbi1zaXRlIEFjdGl2aXR5XCIsXCJ2YWx1ZXNcIjp2YWx1ZXN9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZE9mZnNpdGVTdW1tYXJ5KGRhdGEpIHtcbiAgdmFyIHZhbHVlcyA9IFsgIFxuICAgICAgICB7XG4gICAgICAgICAgICBcImtleVwiOiBcIk9mZi1zaXRlIFZpZXdzXCJcbiAgICAgICAgICAsIFwidmFsdWVcIjogZGF0YS5mdWxsX3VybHMucmVkdWNlKGZ1bmN0aW9uKHAsYykge3JldHVybiBwICsgYy51bmlxdWVzfSwwKVxuICAgICAgICB9XG4gICAgICAsIHtcbiAgICAgICAgICAgIFwia2V5XCI6IFwiVW5pcXVlIHBhZ2VzXCJcbiAgICAgICAgICAsIFwidmFsdWVcIjogT2JqZWN0LmtleXMoZGF0YS5mdWxsX3VybHMucmVkdWNlKGZ1bmN0aW9uKHAsYykge3BbYy51cmxdID0gMDsgcmV0dXJuIHAgfSx7fSkpLmxlbmd0aFxuICAgICAgICB9XG4gICAgXVxuICByZXR1cm4ge1wia2V5XCI6XCJPZmYtc2l0ZSBBY3Rpdml0eVwiLFwidmFsdWVzXCI6dmFsdWVzfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBY3Rpb25zKGRhdGEpIHtcbiAgXG4gIHJldHVybiB7XCJrZXlcIjpcIlNlZ21lbnRzXCIsXCJ2YWx1ZXNcIjogZGF0YS5hY3Rpb25zLm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHtcImtleVwiOnguYWN0aW9uX25hbWUsIFwidmFsdWVcIjowLCBcInNlbGVjdGVkXCI6IGRhdGEuYWN0aW9uX25hbWUgPT0geC5hY3Rpb25fbmFtZSB9IH0pfVxufVxuXG5cbi8vIGZyb20gZGF0YS5qc1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRGF0YShkYXRhLGJ1Y2tldHMscG9wX2NhdGVnb3JpZXMpIHtcblxuICB2YXIgdGltZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgIC5tYXAoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuXG4gIHZhciBjYXRzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLm1hcChkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJcIiB9KSApXG5cblxuXG5cbiAgdmFyIHRpbWVfY2F0ZWdvcmllcyA9IGJ1Y2tldHMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2NdID0ge307IHJldHVybiBwIH0sIHt9KVxuICB2YXIgY2F0ZWdvcnlfdGltZXMgPSBPYmplY3Qua2V5cyhjYXRzKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbY10gPSB7fTsgcmV0dXJuIHAgfSwge30pXG5cblxuICB2YXIgY2F0ZWdvcmllcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgLmVudHJpZXMoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7XG4gICAgICByb3cudmFsdWVzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICAgIHQucGVyY2VudCA9IGQzLnN1bSh0LnZhbHVlcyxmdW5jdGlvbihkKXsgcmV0dXJuIGQudW5pcXVlc30pLyBkMy5zdW0odGltZXNbdC5rZXldLGZ1bmN0aW9uKGQpIHtyZXR1cm4gZC51bmlxdWVzfSkgXG4gICAgICAgIHRpbWVfY2F0ZWdvcmllc1t0LmtleV1bcm93LmtleV0gPSB0LnBlcmNlbnRcbiAgICAgICAgY2F0ZWdvcnlfdGltZXNbcm93LmtleV1bdC5rZXldID0gdC5wZXJjZW50XG5cbiAgICAgIH0pXG4gICAgICByZXR1cm4gcm93XG4gICAgfSlcbiAgICAuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuICgocG9wX2NhdGVnb3JpZXNbYi5rZXldIHx8IHt9KS5ub3JtYWxpemVkX3BvcCB8fCAwKS0gKChwb3BfY2F0ZWdvcmllc1thLmtleV0gfHwge30pLm5vcm1hbGl6ZWRfcG9wIHx8IDApIH0pXG5cblxuICB2YXIgdGltZV9ub3JtYWxpemVfc2NhbGVzID0ge31cblxuICBkMy5lbnRyaWVzKHRpbWVfY2F0ZWdvcmllcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIHRpbWVfbm9ybWFsaXplX3NjYWxlc1t0cm93LmtleV0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbZDMubWluKHZhbHVlcyksZDMubWF4KHZhbHVlcyldKVxuICAgICAgLnJhbmdlKFswLDFdKVxuICB9KVxuXG4gIHZhciBjYXRfbm9ybWFsaXplX3NjYWxlcyA9IHt9XG5cbiAgZDMuZW50cmllcyhjYXRlZ29yeV90aW1lcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIGNhdF9ub3JtYWxpemVfc2NhbGVzW3Ryb3cua2V5XSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFtkMy5taW4odmFsdWVzKSxkMy5tYXgodmFsdWVzKV0pXG4gICAgICAucmFuZ2UoWzAsMV0pXG4gIH0pXG5cbiAgY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24ocCkge1xuICAgIHZhciBjYXQgPSBwLmtleVxuICAgIHAudmFsdWVzLm1hcChmdW5jdGlvbihxKSB7XG4gICAgICBxLm5vcm1fY2F0ID0gY2F0X25vcm1hbGl6ZV9zY2FsZXNbY2F0XShxLnBlcmNlbnQpXG4gICAgICBxLm5vcm1fdGltZSA9IHRpbWVfbm9ybWFsaXplX3NjYWxlc1txLmtleV0ocS5wZXJjZW50KVxuXG4gICAgICBxLnNjb3JlID0gMipxLm5vcm1fY2F0LzMgKyBxLm5vcm1fdGltZS8zXG4gICAgICBxLnNjb3JlID0gcS5ub3JtX3RpbWVcblxuICAgICAgdmFyIHBlcmNlbnRfcG9wID0gcG9wX2NhdGVnb3JpZXNbY2F0XSA/IHBvcF9jYXRlZ29yaWVzW2NhdF0ucGVyY2VudF9wb3AgOiAwXG5cbiAgICAgIHEucGVyY2VudF9kaWZmID0gKHEucGVyY2VudCAtIHBlcmNlbnRfcG9wKS9wZXJjZW50X3BvcFxuXG4gICAgfSlcbiAgfSlcblxuICByZXR1cm4gY2F0ZWdvcmllc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJlcGFyZUZpbHRlcnMoZmlsdGVycykge1xuICB2YXIgbWFwcGluZyA9IHtcbiAgICAgIFwiQ2F0ZWdvcnlcIjogXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiXG4gICAgLCBcIlRpdGxlXCI6IFwidXJsXCJcbiAgICAsIFwiVGltZVwiOiBcImhvdXJcIlxuICB9XG5cbiAgdmFyIGZpbHRlcnMgPSBmaWx0ZXJzLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiBPYmplY3Qua2V5cyh4KS5sZW5ndGggJiYgeC52YWx1ZSB9KS5tYXAoZnVuY3Rpb24oeikge1xuICAgIHJldHVybiB7IFxuICAgICAgICBcImZpZWxkXCI6IG1hcHBpbmdbei5maWVsZF1cbiAgICAgICwgXCJvcFwiOiB6Lm9wXG4gICAgICAsIFwidmFsdWVcIjogei52YWx1ZVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gZmlsdGVyc1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGF1dG9TaXplKHdyYXAsYWRqdXN0V2lkdGgsYWRqdXN0SGVpZ2h0KSB7XG5cbiAgZnVuY3Rpb24gZWxlbWVudFRvV2lkdGgoZWxlbSkge1xuXG4gICAgdmFyIF93ID0gd3JhcC5ub2RlKCkub2Zmc2V0V2lkdGggfHwgd3JhcC5ub2RlKCkucGFyZW50Tm9kZS5vZmZzZXRXaWR0aCB8fCB3cmFwLm5vZGUoKS5wYXJlbnROb2RlLnBhcmVudE5vZGUub2Zmc2V0V2lkdGhcbiAgICB2YXIgbnVtID0gX3cgfHwgd3JhcC5zdHlsZShcIndpZHRoXCIpLnNwbGl0KFwiLlwiKVswXS5yZXBsYWNlKFwicHhcIixcIlwiKSBcbiAgICByZXR1cm4gcGFyc2VJbnQobnVtKVxuICB9XG5cbiAgZnVuY3Rpb24gZWxlbWVudFRvSGVpZ2h0KGVsZW0pIHtcbiAgICB2YXIgbnVtID0gd3JhcC5zdHlsZShcImhlaWdodFwiKS5zcGxpdChcIi5cIilbMF0ucmVwbGFjZShcInB4XCIsXCJcIilcbiAgICByZXR1cm4gcGFyc2VJbnQobnVtKVxuICB9XG5cbiAgdmFyIHcgPSBlbGVtZW50VG9XaWR0aCh3cmFwKSB8fCA3MDAsXG4gICAgaCA9IGVsZW1lbnRUb0hlaWdodCh3cmFwKSB8fCAzNDA7XG5cbiAgdyA9IGFkanVzdFdpZHRoKHcpXG4gIGggPSBhZGp1c3RIZWlnaHQoaClcblxuXG4gIHZhciBtYXJnaW4gPSB7dG9wOiAxMCwgcmlnaHQ6IDE1LCBib3R0b206IDEwLCBsZWZ0OiAxNX0sXG4gICAgICB3aWR0aCAgPSB3IC0gbWFyZ2luLmxlZnQgLSBtYXJnaW4ucmlnaHQsXG4gICAgICBoZWlnaHQgPSBoIC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b207XG5cbiAgcmV0dXJuIHtcbiAgICBtYXJnaW46IG1hcmdpbixcbiAgICB3aWR0aDogd2lkdGgsXG4gICAgaGVpZ2h0OiBoZWlnaHRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXV0b1NjYWxlcyhfc2l6ZXMsIGxlbikge1xuXG4gIHZhciBtYXJnaW4gPSBfc2l6ZXMubWFyZ2luLFxuICAgIHdpZHRoID0gX3NpemVzLndpZHRoLFxuICAgIGhlaWdodCA9IF9zaXplcy5oZWlnaHQ7XG5cbiAgaGVpZ2h0ID0gbGVuICogMjZcbiAgXG4gIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5yYW5nZShbd2lkdGgvMiwgd2lkdGgtMjBdKTtcbiAgXG4gIHZhciB5ID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAucmFuZ2VSb3VuZEJhbmRzKFswLCBoZWlnaHRdLCAuMik7XG5cbiAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHgpXG4gICAgICAub3JpZW50KFwidG9wXCIpO1xuXG5cbiAgcmV0dXJuIHtcbiAgICAgIHg6IHhcbiAgICAsIHk6IHlcbiAgICAsIHhBeGlzOiB4QXhpc1xuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBzdGF0ZSBmcm9tICdzdGF0ZSdcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmUocXNfc3RhdGUsX3N0YXRlKSB7XG5cbiAgdmFyIHVwZGF0ZXMgPSB7fVxuXG5cbiAgc3RhdGUuY29tcF9ldmFsKHFzX3N0YXRlLF9zdGF0ZSx1cGRhdGVzKVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzZWxlY3RlZF9hY3Rpb25cIlxuICAgICAgLCAoeCx5KSA9PiB5LmFjdGlvbnMuZmlsdGVyKHogPT4gei5hY3Rpb25faWQgPT0geC5zZWxlY3RlZF9hY3Rpb24pWzBdXG4gICAgICAsICh4LHkpID0+IHkuc2VsZWN0ZWRfYWN0aW9uXG4gICAgKVxuICAgIC5mYWlsdXJlKFwic2VsZWN0ZWRfYWN0aW9uXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmose1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJzZWxlY3RlZF9hY3Rpb25cIjogX25ld1xuICAgICAgfSlcbiAgICB9KVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJ0YWJfcG9zaXRpb25cIlxuICAgICAgLCAoeCx5KSA9PiB4LnRhYl9wb3NpdGlvblxuICAgICAgLCAoXyx5KSA9PiB5LnRhYl9wb3NpdGlvblxuICAgIClcbiAgICAuZmFpbHVyZShcInRhYl9wb3NpdGlvblwiLCAoX25ldyxfb2xkLG9iaikgPT4ge1xuICAgICAgT2JqZWN0LmFzc2lnbihvYmosIHsgXCJ0YWJfcG9zaXRpb25cIjogX25ldyB9KVxuICAgIH0pXG5cbiAgICAuYWNjZXNzb3IoXG4gICAgICAgIFwidHJhbnNmb3JtXCJcbiAgICAgICwgKHgseSkgPT4geC50cmFuc2Zvcm1cbiAgICAgICwgKF8seSkgPT4geS50cmFuc2Zvcm1cbiAgICApXG4gICAgLmZhaWx1cmUoXCJ0cmFuc2Zvcm1cIiwgKF9uZXcsX29sZCxvYmopID0+IHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLCB7IFwidHJhbnNmb3JtXCI6IF9uZXcgfSlcbiAgICB9KVxuXG5cblxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzb3J0XCJcbiAgICAgICwgKHgseSkgPT4geC5zb3J0XG4gICAgICAsIChfLHkpID0+IHkuc29ydFxuICAgIClcbiAgICAuZmFpbHVyZShcInNvcnRcIiwgKF9uZXcsX29sZCxvYmopID0+IHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLCB7IFwic29ydFwiOiBfbmV3IH0pXG4gICAgfSlcblxuXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcImFzY2VuZGluZ1wiXG4gICAgICAsICh4LHkpID0+IHguYXNjZW5kaW5nXG4gICAgICAsIChfLHkpID0+IHkuYXNjZW5kaW5nXG4gICAgKVxuICAgIC5mYWlsdXJlKFwiYXNjZW5kaW5nXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7XG4gICAgICBPYmplY3QuYXNzaWduKG9iaiwgeyBcImFzY2VuZGluZ1wiOiBfbmV3IH0pXG4gICAgfSlcblxuXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInNlbGVjdGVkX3ZpZXdcIlxuICAgICAgLCAoeCx5KSA9PiB4LnNlbGVjdGVkX3ZpZXdcbiAgICAgICwgKF8seSkgPT4geS5kYXNoYm9hcmRfb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZSBcbiAgICApXG4gICAgLmZhaWx1cmUoXCJzZWxlY3RlZF92aWV3XCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7XG4gICAgICAvLyB0aGlzIHNob3VsZCBiZSByZWRvbmUgc28gaXRzIG5vdCBkaWZmZXJlbnQgbGlrZSB0aGlzXG4gICAgICBPYmplY3QuYXNzaWduKG9iaiwge1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJkYXNoYm9hcmRfb3B0aW9uc1wiOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9ucykpLm1hcCh4ID0+IHsgXG4gICAgICAgICAgICB4LnNlbGVjdGVkID0gKHgudmFsdWUgPT0gX25ldyk7IFxuICAgICAgICAgICAgcmV0dXJuIHggXG4gICAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgICAuYWNjZXNzb3IoXG4gICAgICAgIFwic2VsZWN0ZWRfY29tcGFyaXNvblwiXG4gICAgICAsICh4LHkpID0+IHkuYWN0aW9ucy5maWx0ZXIoeiA9PiB6LmFjdGlvbl9pZCA9PSB4LnNlbGVjdGVkX2NvbXBhcmlzb24pWzBdXG4gICAgICAsICh4LHkpID0+IHkuc2VsZWN0ZWRfY29tcGFyaXNvblxuICAgIClcbiAgICAuZmFpbHVyZShcInNlbGVjdGVkX2NvbXBhcmlzb25cIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcInNlbGVjdGVkX2NvbXBhcmlzb25cIjogX25ld1xuICAgICAgfSlcbiAgICB9KVxuICAgIC5lcXVhbChcImZpbHRlcnNcIiwgKHgseSkgPT4gSlNPTi5zdHJpbmdpZnkoeCkgPT0gSlNPTi5zdHJpbmdpZnkoeSkgKVxuICAgIC5mYWlsdXJlKFwiZmlsdGVyc1wiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHtcbiAgICAgICAgICBcImxvYWRpbmdcIjogdHJ1ZVxuICAgICAgICAsIFwiZmlsdGVyc1wiOiBfbmV3IHx8IFt7fV1cbiAgICAgIH0pXG4gICAgfSlcbiAgICAuZmFpbHVyZShcImFjdGlvbl9kYXRlXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmoseyBsb2FkaW5nOiB0cnVlLCBcImFjdGlvbl9kYXRlXCI6IF9uZXcgfSlcbiAgICB9KVxuICAgIC5mYWlsdXJlKFwiY29tcGFyaXNvbl9kYXRlXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmoseyBsb2FkaW5nOiB0cnVlLCBcImNvbXBhcmlzb25fZGF0ZVwiOiBfbmV3IH0pXG4gICAgfSlcblxuICAgIC5ldmFsdWF0ZSgpXG5cbiAgdmFyIGN1cnJlbnQgPSBzdGF0ZS5xcyh7fSkudG8oX3N0YXRlLnFzX3N0YXRlIHx8IHt9KVxuICAgICwgcG9wID0gc3RhdGUucXMoe30pLnRvKHFzX3N0YXRlKVxuXG4gIGlmIChPYmplY3Qua2V5cyh1cGRhdGVzKS5sZW5ndGggJiYgY3VycmVudCAhPSBwb3ApIHtcbiAgICByZXR1cm4gdXBkYXRlc1xuICB9XG5cbiAgcmV0dXJuIHt9XG4gIFxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCB7ZmlsdGVyX2RhdGF9IGZyb20gJ2ZpbHRlcic7XG5cbmV4cG9ydCAqIGZyb20gJy4vaGVscGVycy9kYXRhX2hlbHBlcnMnXG5leHBvcnQgKiBmcm9tICcuL2hlbHBlcnMvZ3JhcGhfaGVscGVycydcbmV4cG9ydCAqIGZyb20gJy4vaGVscGVycy9zdGF0ZV9oZWxwZXJzJ1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGFjY2Vzc29yKGF0dHIsIHZhbCkge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzW1wiX1wiICsgYXR0cl1cbiAgdGhpc1tcIl9cIiArIGF0dHJdID0gdmFsXG4gIHJldHVybiB0aGlzXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b3BTZWN0aW9uKHNlY3Rpb24pIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUoc2VjdGlvbixcIi50b3Atc2VjdGlvblwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJ0b3Atc2VjdGlvblwiLHRydWUpXG4gICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiMTYwcHhcIilcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbWFpbmluZ1NlY3Rpb24oc2VjdGlvbikge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZShzZWN0aW9uLFwiLnJlbWFpbmluZy1zZWN0aW9uXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInJlbWFpbmluZy1zZWN0aW9uXCIsdHJ1ZSlcbn1cblxudmFyIG9wcyA9IHtcbiAgICBcImlzIGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKVxuICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMSB9LCAwKSA+IDBcbiAgICAgICAgfSBcbiAgICAgIH1cbiAgLCBcImlzIG5vdCBpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIilcbiAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPT0gMFxuICAgICAgICB9IFxuICAgICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGV0ZXJtaW5lTG9naWMob3B0aW9ucykge1xuICBjb25zdCBfZGVmYXVsdCA9IG9wdGlvbnNbMF1cbiAgY29uc3Qgc2VsZWN0ZWQgPSBvcHRpb25zLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LnNlbGVjdGVkIH0pXG4gIHJldHVybiBzZWxlY3RlZC5sZW5ndGggPiAwID8gc2VsZWN0ZWRbMF0gOiBfZGVmYXVsdFxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyVXJscyh1cmxzLGxvZ2ljLGZpbHRlcnMpIHtcbiAgcmV0dXJuIGZpbHRlcl9kYXRhKHVybHMpXG4gICAgLm9wKFwiaXMgaW5cIiwgb3BzW1wiaXMgaW5cIl0pXG4gICAgLm9wKFwiaXMgbm90IGluXCIsIG9wc1tcImlzIG5vdCBpblwiXSlcbiAgICAubG9naWMobG9naWMudmFsdWUpXG4gICAgLmJ5KGZpbHRlcnMpXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBTZWxlY3QodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2VsZWN0KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNlbGVjdCh0YXJnZXQpXG59XG5cblNlbGVjdC5wcm90b3R5cGUgPSB7XG4gICAgb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm9wdGlvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcblxuICAgICAgdGhpcy5fc2VsZWN0ID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcInNlbGVjdFwiLFwic2VsZWN0XCIsdGhpcy5fb3B0aW9ucylcblxuICAgICAgdmFyIGJvdW5kID0gdGhpcy5vbihcInNlbGVjdFwiKS5iaW5kKHRoaXMpXG5cbiAgICAgIHRoaXMuX3NlbGVjdFxuICAgICAgICAub24oXCJjaGFuZ2VcIixmdW5jdGlvbih4KSB7IGJvdW5kKHRoaXMuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fKSB9KVxuXG4gICAgICB0aGlzLl9vcHRpb25zID0gZDNfc3BsYXQodGhpcy5fc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIixpZGVudGl0eSxrZXkpXG4gICAgICAgIC50ZXh0KGtleSlcbiAgICAgICAgLnByb3BlcnR5KFwic2VsZWN0ZWRcIiwgKHgpID0+IHtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuX3NlbGVjdGVkLHgudmFsdWUpXG4gICAgICAgICAgcmV0dXJuICh4LnZhbHVlICYmIHgudmFsdWUgPT0gdGhpcy5fc2VsZWN0ZWQpID8gXG4gICAgICAgICAgICBcInNlbGVjdGVkXCIgOiB4LnNlbGVjdGVkID09IDEgPyBcbiAgICAgICAgICAgIFwic2VsZWN0ZWRcIiA6IG51bGxcbiAgICAgICAgIFxuICAgICAgICB9KVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzZWxlY3RlZDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlbGVjdGVkXCIsdmFsKVxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi9zZWxlY3QnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5mdW5jdGlvbiBpbmplY3RDc3MoY3NzX3N0cmluZykge1xuICBkM191cGRhdGVhYmxlKGQzLnNlbGVjdChcImhlYWRcIiksXCJzdHlsZSNoZWFkZXItY3NzXCIsXCJzdHlsZVwiKVxuICAgIC5hdHRyKFwiaWRcIixcImhlYWRlci1jc3NcIilcbiAgICAudGV4dChDU1NfU1RSSU5HLnJlcGxhY2UoXCJmdW5jdGlvbiAoKSB7LypcIixcIlwiKS5yZXBsYWNlKFwiKi99XCIsXCJcIikpXG59XG5cbmZ1bmN0aW9uIGJ1dHRvbldyYXAod3JhcCkge1xuICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcCwgXCJoMy5idXR0b25zXCIsXCJoM1wiKVxuICAgIC5jbGFzc2VkKFwiYnV0dG9uc1wiLHRydWUpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi01cHhcIilcblxuICB2YXIgcmlnaHRfcHVsbCA9IGQzX3VwZGF0ZWFibGUoaGVhZCxcIi5wdWxsLXJpZ2h0XCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJwdWxsLXJpZ2h0IGhlYWRlci1idXR0b25zXCIsIHRydWUpXG4gICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxN3B4XCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIycHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LWRlY29yYXRpb25cIixcIm5vbmUgIWltcG9ydGFudFwiKVxuXG4gIHJldHVybiByaWdodF9wdWxsXG59XG5cbmZ1bmN0aW9uIGV4cGFuc2lvbldyYXAod3JhcCkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh3cmFwLFwiZGl2LmhlYWRlci1ib2R5XCIsXCJkaXZcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEzcHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwibm9uZVwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcIm5vcm1hbFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxNzVweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjI1cHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIyNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxNzVweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIndoaXRlXCIpXG4gICAgLmNsYXNzZWQoXCJoZWFkZXItYm9keSBoaWRkZW5cIix0cnVlKVxufVxuXG5mdW5jdGlvbiBoZWFkV3JhcCh3cmFwKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHdyYXAsIFwiaDMuZGF0YS1oZWFkZXJcIixcImgzXCIpXG4gICAgLmNsYXNzZWQoXCJkYXRhLWhlYWRlclwiLHRydWUpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi01cHhcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiIGJvbGRcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIiAxNHB4XCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIiAyMnB4XCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcIiB1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiICM4ODhcIilcbiAgICAuc3R5bGUoXCJsZXR0ZXItc3BhY2luZ1wiLFwiIC4wNWVtXCIpXG5cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gSGVhZGVyKHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG5cbiAgdmFyIENTU19TVFJJTkcgPSBTdHJpbmcoZnVuY3Rpb24oKSB7LypcbiAgICAuaGVhZGVyLWJ1dHRvbnMgYSBzcGFuLmhvdmVyLXNob3cgeyBkaXNwbGF5Om5vbmUgfVxuICAgIC5oZWFkZXItYnV0dG9ucyBhOmhvdmVyIHNwYW4uaG92ZXItc2hvdyB7IGRpc3BsYXk6aW5saW5lOyBwYWRkaW5nLWxlZnQ6M3B4IH1cbiAgKi99KVxuICBcbn1cblxuZnVuY3Rpb24gaGVhZGVyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEhlYWRlcih0YXJnZXQpXG59XG5cbkhlYWRlci5wcm90b3R5cGUgPSB7XG4gICAgdGV4dDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRleHRcIix2YWwpIFxuICAgIH1cblxuXG4gICwgc2VsZWN0X29ubHk6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWxlY3Rfb25seVwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgYnV0dG9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJ1dHRvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBleHBhbnNpb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJleHBhbnNpb25cIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcblxuICAgICAgXG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCwgXCIuaGVhZGVyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImhlYWRlci13cmFwXCIsdHJ1ZSlcblxuICAgICAgdmFyIGV4cGFuZF93cmFwID0gZXhwYW5zaW9uV3JhcCh3cmFwKVxuICAgICAgICAsIGJ1dHRvbl93cmFwID0gYnV0dG9uV3JhcCh3cmFwKVxuICAgICAgICAsIGhlYWRfd3JhcCA9IGhlYWRXcmFwKHdyYXApXG5cbiAgICAgIGlmICh0aGlzLl9zZWxlY3Rfb25seSkge1xuICAgICAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwic2VsZWN0XCIpLmJpbmQodGhpcylcblxuICAgICAgICBcblxuICAgICAgICB2YXIgc2VsZWN0Qm94ID0gc2VsZWN0KGhlYWRfd3JhcClcbiAgICAgICAgICAub3B0aW9ucyh0aGlzLl9vcHRpb25zKVxuICAgICAgICAgIC5vbihcInNlbGVjdFwiLGZ1bmN0aW9uKHgpIHsgYm91bmQoeCkgfSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaGVhZF93cmFwLFwic3Bhbi50aXRsZVwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAgICAgLnRleHQodGhpcy5fdGV4dClcblxuICAgICAgaWYgKHRoaXMuX29wdGlvbnMpIHtcblxuICAgICAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwic2VsZWN0XCIpLmJpbmQodGhpcylcblxuICAgICAgICB2YXIgc2VsZWN0Qm94ID0gc2VsZWN0KGhlYWRfd3JhcClcbiAgICAgICAgICAub3B0aW9ucyh0aGlzLl9vcHRpb25zKVxuICAgICAgICAgIC5vbihcInNlbGVjdFwiLGZ1bmN0aW9uKHgpIHsgYm91bmQoeCkgfSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgc2VsZWN0Qm94Ll9zZWxlY3RcbiAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTlweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMnB4XCIpXG4gICAgICAgICAgXG4gICAgICAgIHNlbGVjdEJveC5fb3B0aW9uc1xuICAgICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCIjODg4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxMDBweFwiKVxuICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjVweFwiKVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYnV0dG9ucykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgYSA9IGQzX3NwbGF0KGJ1dHRvbl93cmFwLFwiYVwiLFwiYVwiLHRoaXMuX2J1dHRvbnMsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGV4dCB9KVxuICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIycHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWRlY29yYXRpb25cIixcIm5vbmVcIilcbiAgICAgICAgICAuaHRtbCh4ID0+IFwiPHNwYW4gY2xhc3M9J1wiICsgeC5pY29uICsgXCInPjwvc3Bhbj48c3BhbiBzdHlsZT0ncGFkZGluZy1sZWZ0OjNweCc+XCIgKyB4LnRleHQgKyBcIjwvc3Bhbj5cIilcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIseCA9PiB4LmNsYXNzKVxuICAgICAgICAgIC5vbihcImNsaWNrXCIseCA9PiB0aGlzLm9uKHguY2xhc3MgKyBcIi5jbGlja1wiKSh4KSlcblxuXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuZXhwb3J0IGRlZmF1bHQgaGVhZGVyO1xuIiwiaW1wb3J0IHthY2Nlc3NvciwgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIG5vb3B9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgZDMgZnJvbSAnZDMnO1xuaW1wb3J0ICcuL3RhYmxlLmNzcydcblxuXG52YXIgRVhBTVBMRV9EQVRBID0ge1xuICAgIFwia2V5XCI6IFwiVG9wIFNpdGVzXCJcbiAgLCBcInZhbHVlc1wiOiBbXG4gICAgICB7ICBcbiAgICAgICAgICBcImtleVwiOlwiVVJMLmNvbVwiXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6XCJhb2wuY29tXCJcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gIF0gXG59XG5cbmZ1bmN0aW9uIFRhYmxlKHRhcmdldCkge1xuICB0aGlzLl93cmFwcGVyX2NsYXNzID0gXCJ0YWJsZS13cmFwcGVyXCJcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLl9kYXRhID0ge30vL0VYQU1QTEVfREFUQVxuICB0aGlzLl9zb3J0ID0ge31cbiAgdGhpcy5fcmVuZGVyZXJzID0ge31cbiAgdGhpcy5fdG9wID0gMFxuXG4gIHRoaXMuX2RlZmF1bHRfcmVuZGVyZXIgPSBmdW5jdGlvbiAoeCkge1xuICAgIGlmICh4LmtleS5pbmRleE9mKFwicGVyY2VudFwiKSA+IC0xKSByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLnRleHQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgdmFyIHBkID0gdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fXG4gICAgICAgIHJldHVybiBkMy5mb3JtYXQoXCIuMiVcIikocGRbeC5rZXldLzEwMClcbiAgICAgIH0pXG4gICBcbiAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLnRleHQoZnVuY3Rpb24oeCkgeyBcbiAgICAgIHZhciBwZCA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfX1xuICAgICAgcmV0dXJuIHBkW3gua2V5XSA+IDAgPyBkMy5mb3JtYXQoXCIsLjJmXCIpKHBkW3gua2V5XSkucmVwbGFjZShcIi4wMFwiLFwiXCIpIDogcGRbeC5rZXldXG4gICAgfSlcbiAgfVxuXG4gIHRoaXMuX2hpZGRlbl9maWVsZHMgPSBbXVxuICB0aGlzLl9vbiA9IHt9XG5cbiAgdGhpcy5fcmVuZGVyX2V4cGFuZCA9IGZ1bmN0aW9uKGQpIHtcbiAgICBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKFwidGQub3B0aW9uLWhlYWRlclwiKS5odG1sKFwiJm5kYXNoO1wiKVxuICAgIGlmICh0aGlzLm5leHRTaWJsaW5nICYmIGQzLnNlbGVjdCh0aGlzLm5leHRTaWJsaW5nKS5jbGFzc2VkKFwiZXhwYW5kZWRcIikgPT0gdHJ1ZSkge1xuICAgICAgZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInRkLm9wdGlvbi1oZWFkZXJcIikuaHRtbChcIiYjNjUyOTE7XCIpXG4gICAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc2VsZWN0QWxsKFwiLmV4cGFuZGVkXCIpLnJlbW92ZSgpXG4gICAgfVxuXG4gICAgZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc2VsZWN0QWxsKFwiLmV4cGFuZGVkXCIpLnJlbW92ZSgpXG4gICAgdmFyIHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICAgIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodCwgdGhpcy5uZXh0U2libGluZyk7ICBcblxuXG4gICAgdmFyIHRyID0gZDMuc2VsZWN0KHQpLmNsYXNzZWQoXCJleHBhbmRlZFwiLHRydWUpLmRhdHVtKHt9KVxuICAgIHZhciB0ZCA9IGQzX3VwZGF0ZWFibGUodHIsXCJ0ZFwiLFwidGRcIilcbiAgICAgIC5hdHRyKFwiY29sc3BhblwiLHRoaXMuY2hpbGRyZW4ubGVuZ3RoKVxuXG4gICAgcmV0dXJuIHRkXG4gIH1cbiAgdGhpcy5fcmVuZGVyX2hlYWRlciA9IGZ1bmN0aW9uKHdyYXApIHtcblxuXG4gICAgd3JhcC5lYWNoKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHZhciBoZWFkZXJzID0gZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QodGhpcyksXCIuaGVhZGVyc1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGVhZGVyc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLWJvdHRvbVwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgICBoZWFkZXJzLmh0bWwoXCJcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGhlYWRlcnMsXCIudXJsXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ1cmxcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNzUlXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChcIkFydGljbGVcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZShoZWFkZXJzLFwiLmNvdW50XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb3VudFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KFwiQ291bnRcIilcblxuXG4gICAgfSlcblxuICB9XG4gIHRoaXMuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihyb3cpIHtcblxuICAgICAgZDNfdXBkYXRlYWJsZShyb3csXCIudXJsXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ1cmxcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNzUlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwiaGlkZGVuXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7cmV0dXJuIHgua2V5fSlcblxuICAgICAgZDNfdXBkYXRlYWJsZShyb3csXCIuY291bnRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImNvdW50XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI1JVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KXtyZXR1cm4geC52YWx1ZX0pXG5cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdGFibGUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGFibGUodGFyZ2V0KVxufVxuXG5UYWJsZS5wcm90b3R5cGUgPSB7XG5cbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHsgXG4gICAgICB2YXIgdmFsdWUgPSBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgICBpZiAodmFsICYmIHZhbC52YWx1ZXMubGVuZ3RoICYmIHRoaXMuX2hlYWRlcnMgPT0gdW5kZWZpbmVkKSB7IFxuICAgICAgICB2YXIgaGVhZGVycyA9IE9iamVjdC5rZXlzKHZhbC52YWx1ZXNbMF0pLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB7a2V5OngsdmFsdWU6eH0gfSlcbiAgICAgICAgdGhpcy5oZWFkZXJzKGhlYWRlcnMpXG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9XG4gICwgc2tpcF9vcHRpb246IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNraXBfb3B0aW9uXCIsdmFsKSB9XG4gICwgd3JhcHBlcl9jbGFzczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwid3JhcHBlcl9jbGFzc1wiLHZhbCkgfVxuXG5cbiAgLCB0aXRsZTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH1cbiAgLCByb3c6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInJlbmRlcl9yb3dcIix2YWwpIH1cbiAgLCBkZWZhdWx0X3JlbmRlcmVyOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkZWZhdWx0X3JlbmRlcmVyXCIsdmFsKSB9XG4gICwgdG9wOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0b3BcIix2YWwpIH1cblxuICAsIGhlYWRlcjogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmVuZGVyX2hlYWRlclwiLHZhbCkgfVxuICAsIGhlYWRlcnM6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhlYWRlcnNcIix2YWwpIH1cbiAgLCBoaWRkZW5fZmllbGRzOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoaWRkZW5fZmllbGRzXCIsdmFsKSB9XG4gICwgYWxsX2hlYWRlcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhlYWRlcnMgPSB0aGlzLmhlYWRlcnMoKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy52YWx1ZTsgcmV0dXJuIHB9LHt9KVxuICAgICAgICAsIGlzX2xvY2tlZCA9IHRoaXMuaGVhZGVycygpLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiAhIXgubG9ja2VkIH0pLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICBpZiAodGhpcy5fZGF0YS52YWx1ZXMgJiYgdGhpcy5fZGF0YS52YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgIFxuICAgICAgICB2YXIgYWxsX2hlYWRzID0gT2JqZWN0LmtleXModGhpcy5fZGF0YS52YWx1ZXNbMF0pLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgICAgIGlmICh0aGlzLl9oaWRkZW5fZmllbGRzICYmIHRoaXMuX2hpZGRlbl9maWVsZHMuaW5kZXhPZih4KSA+IC0xKSByZXR1cm4gZmFsc2VcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBrZXk6eFxuICAgICAgICAgICAgLCB2YWx1ZTpoZWFkZXJzW3hdIHx8IHhcbiAgICAgICAgICAgICwgc2VsZWN0ZWQ6ICEhaGVhZGVyc1t4XVxuICAgICAgICAgICAgLCBsb2NrZWQ6IChpc19sb2NrZWQuaW5kZXhPZih4KSA+IC0xID8gdHJ1ZSA6IHVuZGVmaW5lZCkgXG4gICAgICAgICAgfSBcbiAgICAgICAgfS5iaW5kKHRoaXMpKS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9KVxuICAgICAgICB2YXIgZ2V0SW5kZXggPSBmdW5jdGlvbihrKSB7XG4gICAgICAgICAgcmV0dXJuIGlzX2xvY2tlZC5pbmRleE9mKGspID4gLTEgPyBpc19sb2NrZWQuaW5kZXhPZihrKSArIDEwIDogMFxuICAgICAgICB9XG5cbiAgICAgICAgYWxsX2hlYWRzID0gYWxsX2hlYWRzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBnZXRJbmRleChjLmtleSB8fCAtSW5maW5pdHkpIC0gZ2V0SW5kZXgocC5rZXkgfHwgLUluZmluaXR5KSB9KVxuICAgICAgICByZXR1cm4gYWxsX2hlYWRzXG4gICAgICB9XG4gICAgICBlbHNlIHJldHVybiB0aGlzLmhlYWRlcnMoKVxuICAgIH1cbiAgLCBzb3J0OiBmdW5jdGlvbihrZXksYXNjZW5kaW5nKSB7XG4gICAgICBpZiAoIWtleSkgcmV0dXJuIHRoaXMuX3NvcnRcbiAgICAgIHRoaXMuX3NvcnQgPSB7XG4gICAgICAgICAga2V5OiBrZXlcbiAgICAgICAgLCB2YWx1ZTogISFhc2NlbmRpbmdcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICwgcmVuZGVyX3dyYXBwZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHdyYXAgPSB0aGlzLl90YXJnZXRcblxuICAgICAgdmFyIHdyYXBwZXIgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuXCIrdGhpcy5fd3JhcHBlcl9jbGFzcyxcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZCh0aGlzLl93cmFwcGVyX2NsYXNzLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJyZWxhdGl2ZVwiKVxuXG5cbiAgICAgIHZhciB0YWJsZSA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcInRhYmxlLm1haW5cIixcInRhYmxlXCIpXG4gICAgICAgIC5jbGFzc2VkKFwibWFpblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG5cbiAgICAgIHRoaXMuX3RhYmxlX21haW4gPSB0YWJsZVxuXG4gICAgICB2YXIgdGhlYWQgPSBkM191cGRhdGVhYmxlKHRhYmxlLFwidGhlYWRcIixcInRoZWFkXCIpXG4gICAgICBkM191cGRhdGVhYmxlKHRhYmxlLFwidGJvZHlcIixcInRib2R5XCIpXG5cblxuXG4gICAgICB2YXIgdGFibGVfZml4ZWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCJ0YWJsZS5maXhlZFwiLFwidGFibGVcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwgdHJ1ZSkgLy8gVE9ETzogbWFrZSB0aGlzIHZpc2libGUgd2hlbiBtYWluIGlzIG5vdCBpbiB2aWV3XG4gICAgICAgIC5jbGFzc2VkKFwiZml4ZWRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLHdyYXBwZXIuc3R5bGUoXCJ3aWR0aFwiKSlcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsdGhpcy5fdG9wICsgXCJweFwiKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICB0cnkge1xuICAgICAgZDMuc2VsZWN0KHdpbmRvdykub24oJ3Njcm9sbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyh0YWJsZS5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wLCBzZWxmLl90b3ApXG4gICAgICAgIGlmICh0YWJsZS5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wIDwgc2VsZi5fdG9wKSB0YWJsZV9maXhlZC5jbGFzc2VkKFwiaGlkZGVuXCIsZmFsc2UpXG4gICAgICAgIGVsc2UgdGFibGVfZml4ZWQuY2xhc3NlZChcImhpZGRlblwiLHRydWUpXG5cbiAgICAgICAgdmFyIHdpZHRocyA9IFtdXG5cbiAgICAgICAgd3JhcC5zZWxlY3RBbGwoXCIubWFpblwiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCIudGFibGUtaGVhZGVyc1wiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCJ0aFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgICAgd2lkdGhzLnB1c2godGhpcy5vZmZzZXRXaWR0aClcbiAgICAgICAgICB9KVxuXG4gICAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLmZpeGVkXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcIi50YWJsZS1oZWFkZXJzXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcInRoXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoXCJ3aWR0aFwiLHdpZHRoc1tpXSArIFwicHhcIilcbiAgICAgICAgICB9KVxuICAgICAgICBcbiAgICAgIH0pXG4gICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgXG5cbiAgICAgIHRoaXMuX3RhYmxlX2ZpeGVkID0gdGFibGVfZml4ZWRcblxuXG4gICAgICB2YXIgdGhlYWQgPSBkM191cGRhdGVhYmxlKHRhYmxlX2ZpeGVkLFwidGhlYWRcIixcInRoZWFkXCIpXG5cbiAgICAgIGlmICghdGhpcy5fc2tpcF9vcHRpb24pIHtcbiAgICAgICAgdmFyIHRhYmxlX2J1dHRvbiA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcIi50YWJsZS1vcHRpb25cIixcImFcIilcbiAgICAgICAgICAuY2xhc3NlZChcInRhYmxlLW9wdGlvblwiLHRydWUpXG4gICAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImFic29sdXRlXCIpXG4gICAgICAgICAgLnN0eWxlKFwidG9wXCIsXCItMXB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicmlnaHRcIixcIjBweFwiKVxuICAgICAgICAgIC5zdHlsZShcImN1cnNvclwiLFwicG9pbnRlclwiKVxuICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpXG4gICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCI4cHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjhweFwiKVxuICAgICAgICAgIC50ZXh0KFwiT1BUSU9OU1wiKVxuICAgICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNlM2ViZjBcIilcbiAgICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHRoaXMuX29wdGlvbnNfaGVhZGVyLmNsYXNzZWQoXCJoaWRkZW5cIiwhdGhpcy5fb3B0aW9uc19oZWFkZXIuY2xhc3NlZChcImhpZGRlblwiKSlcbiAgICAgICAgICAgIHRoaXMuX3Nob3dfb3B0aW9ucyA9ICF0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIpXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gd3JhcHBlclxuICAgIH0gIFxuICAsIHJlbmRlcl9oZWFkZXI6IGZ1bmN0aW9uKHRhYmxlKSB7XG5cbiAgICAgIHZhciB0aGVhZCA9IHRhYmxlLnNlbGVjdEFsbChcInRoZWFkXCIpXG4gICAgICAgICwgdGJvZHkgPSB0YWJsZS5zZWxlY3RBbGwoXCJ0Ym9keVwiKVxuXG4gICAgICBpZiAodGhpcy5oZWFkZXJzKCkgPT0gdW5kZWZpbmVkKSByZXR1cm5cblxuICAgICAgdmFyIG9wdGlvbnNfdGhlYWQgPSBkM191cGRhdGVhYmxlKHRoZWFkLFwidHIudGFibGUtb3B0aW9uc1wiLFwidHJcIix0aGlzLmFsbF9oZWFkZXJzKCksZnVuY3Rpb24oeCl7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwgIXRoaXMuX3Nob3dfb3B0aW9ucylcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS1vcHRpb25zXCIsdHJ1ZSlcblxuICAgICAgdmFyIGggPSB0aGlzLl9za2lwX29wdGlvbiA/IHRoaXMuaGVhZGVycygpIDogdGhpcy5oZWFkZXJzKCkuY29uY2F0KFt7a2V5Olwic3BhY2VyXCIsIHdpZHRoOlwiNzBweFwifV0pXG4gICAgICB2YXIgaGVhZGVyc190aGVhZCA9IGQzX3VwZGF0ZWFibGUodGhlYWQsXCJ0ci50YWJsZS1oZWFkZXJzXCIsXCJ0clwiLGgsZnVuY3Rpb24oeCl7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS1oZWFkZXJzXCIsdHJ1ZSlcblxuXG4gICAgICB2YXIgdGggPSBkM19zcGxhdChoZWFkZXJzX3RoZWFkLFwidGhcIixcInRoXCIsZmFsc2UsZnVuY3Rpb24oeCxpKSB7cmV0dXJuIHgua2V5ICsgaSB9KVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgud2lkdGggfSlcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcInJlbGF0aXZlXCIpXG4gICAgICAgIC5vcmRlcigpXG5cbiAgICAgIHZhciBkZWZhdWx0U29ydCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBpZiAoeC5zb3J0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgZGVsZXRlIHhbJ3NvcnQnXVxuICAgICAgICAgICAgdGhpcy5fc29ydCA9IHt9XG4gICAgICAgICAgICB0aGlzLmRyYXcoKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4LnNvcnQgPSAhIXguc29ydFxuXG4gICAgICAgICAgICB0aGlzLnNvcnQoeC5rZXkseC5zb3J0KVxuICAgICAgICAgICAgdGhpcy5kcmF3KClcbiAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodGgsXCJzcGFuXCIsXCJzcGFuXCIpXG4gICAgICAgIC5jbGFzc2VkKFwidGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIixcInBvaW50ZXJcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgICAgICAub24oXCJjbGlja1wiLHRoaXMub24oXCJzb3J0XCIpICE9IG5vb3AgPyB0aGlzLm9uKFwic29ydFwiKSA6IGRlZmF1bHRTb3J0KVxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh0aCxcImlcIixcImlcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCI1cHhcIilcbiAgICAgICAgLmNsYXNzZWQoXCJmYVwiLHRydWUpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEtc29ydC1hc2NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4gKHgua2V5ID09IHRoaXMuX3NvcnQua2V5KSA/IHRoaXMuX3NvcnQudmFsdWUgPT09IHRydWUgOiB1bmRlZmluZWQgfS5iaW5kKHRoaXMpKVxuICAgICAgICAuY2xhc3NlZChcImZhLXNvcnQtZGVzY1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiAoeC5rZXkgPT0gdGhpcy5fc29ydC5rZXkpID8gdGhpcy5fc29ydC52YWx1ZSA9PT0gZmFsc2UgOiB1bmRlZmluZWQgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2FuX3JlZHJhdyA9IHRydWVcblxuICAgICAgdmFyIGRyYWcgPSBkMy5iZWhhdmlvci5kcmFnKClcbiAgICAgICAgLm9uKFwiZHJhZ1wiLCBmdW5jdGlvbihkLGkpIHtcbiAgICAgICAgICAgIHZhciB4ID0gZDMuZXZlbnQuZHhcbiAgICAgICAgICAgIHZhciB3ID0gcGFyc2VJbnQoZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc3R5bGUoXCJ3aWR0aFwiKS5yZXBsYWNlKFwicHhcIikpXG4gICAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuX19kYXRhX18ud2lkdGggPSAodyt4KStcInB4XCJcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnN0eWxlKFwid2lkdGhcIiwgKHcreCkrXCJweFwiKVxuXG4gICAgICAgICAgICB2YXIgaW5kZXggPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbiwwKS5pbmRleE9mKHRoaXMucGFyZW50Tm9kZSkgKyAxXG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW5baW5kZXhdKS5zdHlsZShcIndpZHRoXCIsdW5kZWZpbmVkKVxuXG4gICAgICAgICAgICBpZiAoY2FuX3JlZHJhdykge1xuICAgICAgICAgICAgICBjYW5fcmVkcmF3ID0gZmFsc2VcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjYW5fcmVkcmF3ID0gdHJ1ZVxuICAgICAgICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgICB2YXIgcmVuZGVyID0gc2VsZi5fcmVuZGVyZXJzW3gua2V5XVxuICAgICAgICAgICAgICAgICAgaWYgKHJlbmRlcikgcmVuZGVyLmJpbmQodGhpcykoeClcbiAgICBcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgIH0sMSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcblxuICAgICAgdmFyIGRyYWdnYWJsZSA9IGQzX3VwZGF0ZWFibGUodGgsXCJiXCIsXCJiXCIpXG4gICAgICAgIC5zdHlsZShcImN1cnNvclwiLCBcImV3LXJlc2l6ZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIiwgXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLCBcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIiwgXCJhYnNvbHV0ZVwiKVxuICAgICAgICAuc3R5bGUoXCJyaWdodFwiLCBcIi04cHhcIilcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsIFwiMFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLCBcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiei1pbmRleFwiLCAxKVxuICAgICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbigpe1xuICAgICAgICAgICB2YXIgaW5kZXggPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbiwwKS5pbmRleE9mKHRoaXMucGFyZW50Tm9kZSkgKyAxXG4gICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuc3R5bGUoXCJib3JkZXItcmlnaHRcIixcIjFweCBkb3R0ZWQgI2NjY1wiKVxuICAgICAgICB9KVxuICAgICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLDApLmluZGV4T2YodGhpcy5wYXJlbnROb2RlKSArIDFcbiAgICAgICAgICAgdGJvZHkuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bnRoLW9mLXR5cGUoXCIgKyBpbmRleCArIFwiKVwiKS5zdHlsZShcImJvcmRlci1yaWdodFwiLHVuZGVmaW5lZClcbiAgICAgICAgfSlcbiAgICAgICAgLmNhbGwoZHJhZylcblxuICAgICAgdGguZXhpdCgpLnJlbW92ZSgpXG5cbiAgICAgIGlmICghdGhpcy5fc2tpcF9vcHRpb24pIHtcbiAgICAgIHZhciBvcHRpb25zID0gZDNfdXBkYXRlYWJsZShvcHRpb25zX3RoZWFkLFwidGhcIixcInRoXCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsdGhpcy5oZWFkZXJzKCkubGVuZ3RoKzEpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAgICAgXG4gICAgICB2YXIgb3B0aW9uID0gZDNfc3BsYXQob3B0aW9ucyxcIi5vcHRpb25cIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgIC5jbGFzc2VkKFwib3B0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG5cbiAgICAgIG9wdGlvbi5leGl0KCkucmVtb3ZlKClcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUob3B0aW9uLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgICAgLnByb3BlcnR5KFwiY2hlY2tlZFwiLGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgdGhpcy5jaGVja2VkID0geC5zZWxlY3RlZFxuICAgICAgICAgIHJldHVybiB4LnNlbGVjdGVkID8gXCJjaGVja2VkXCIgOiB1bmRlZmluZWQgXG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKFwiZGlzYWJsZWRcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LmxvY2tlZCB9KVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgeC5zZWxlY3RlZCA9IHRoaXMuY2hlY2tlZFxuICAgICAgICAgIGlmICh4LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICBzZWxmLmhlYWRlcnMoKS5wdXNoKHgpXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5kcmF3KClcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGluZGljZXMgPSBzZWxmLmhlYWRlcnMoKS5tYXAoZnVuY3Rpb24oeixpKSB7IHJldHVybiB6LmtleSA9PSB4LmtleSA/IGkgOiB1bmRlZmluZWQgIH0pIFxuICAgICAgICAgICAgLCBpbmRleCA9IGluZGljZXMuZmlsdGVyKGZ1bmN0aW9uKHopIHsgcmV0dXJuIHogfSkgfHwgMDtcblxuICAgICAgICAgIHNlbGYuaGVhZGVycygpLnNwbGljZShpbmRleCwxKVxuICAgICAgICAgIHNlbGYuZHJhdygpXG5cbiAgICAgICAgfSlcblxuICAgICAgZDNfdXBkYXRlYWJsZShvcHRpb24sXCJzcGFuXCIsXCJzcGFuXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFwiIFwiICsgeC52YWx1ZSB9KVxuXG4gICAgIH1cblxuXG4gICAgIHRoaXMuX29wdGlvbnNfaGVhZGVyID0gdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcIi50YWJsZS1vcHRpb25zXCIpXG4gICAgfVxuICBcbiAgLCByZW5kZXJfcm93czogZnVuY3Rpb24odGFibGUpIHtcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHRib2R5ID0gdGFibGUuc2VsZWN0QWxsKFwidGJvZHlcIilcblxuICAgICAgaWYgKHRoaXMuaGVhZGVycygpID09IHVuZGVmaW5lZCkgcmV0dXJuXG4gICAgICBpZiAoISh0aGlzLl9kYXRhICYmIHRoaXMuX2RhdGEudmFsdWVzICYmIHRoaXMuX2RhdGEudmFsdWVzLmxlbmd0aCkpIHJldHVyblxuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGEudmFsdWVzXG4gICAgICAgICwgc29ydGJ5ID0gdGhpcy5fc29ydCB8fCB7fTtcblxuICAgICAgZGF0YSA9IGRhdGEuc29ydChmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgdmFyIGEgPSBwW3NvcnRieS5rZXldIHx8IC1JbmZpbml0eVxuICAgICAgICAgICwgYiA9IGNbc29ydGJ5LmtleV0gfHwgLUluZmluaXR5XG5cbiAgICAgICAgcmV0dXJuIHNvcnRieS52YWx1ZSA/IGQzLmFzY2VuZGluZyhhLGIpIDogZDMuZGVzY2VuZGluZyhhLGIpXG4gICAgICB9KVxuXG4gICAgICB2YXIgcm93cyA9IGQzX3NwbGF0KHRib2R5LFwidHJcIixcInRyXCIsZGF0YSxmdW5jdGlvbih4LGkpeyByZXR1cm4gU3RyaW5nKHNvcnRieS5rZXkgKyB4W3NvcnRieS5rZXldKSArIGkgfSlcbiAgICAgICAgLm9yZGVyKClcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKHNlbGYub24oXCJleHBhbmRcIikgIT0gbm9vcCkge1xuICAgICAgICAgICAgdmFyIHRkID0gc2VsZi5fcmVuZGVyX2V4cGFuZC5iaW5kKHRoaXMpKHgpXG4gICAgICAgICAgICBzZWxmLm9uKFwiZXhwYW5kXCIpLmJpbmQodGhpcykoeCx0ZClcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICAgIHZhciB0ZCA9IGQzX3NwbGF0KHJvd3MsXCJ0ZFwiLFwidGRcIix0aGlzLmhlYWRlcnMoKSxmdW5jdGlvbih4LGkpIHtyZXR1cm4geC5rZXkgKyBpIH0pXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcblxuICAgICAgICAgIHZhciByZW5kZXJlciA9IHNlbGYuX3JlbmRlcmVyc1t4LmtleV1cblxuICAgICAgICAgIGlmICghcmVuZGVyZXIpIHsgXG4gICAgICAgICAgICByZW5kZXJlciA9IHNlbGYuX2RlZmF1bHRfcmVuZGVyZXIuYmluZCh0aGlzKSh4KSBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHJlbmRlcmVyLmJpbmQodGhpcykoeClcbiAgICAgICAgICB9XG5cblxuICAgICAgICB9KVxuXG4gICAgICAgIFxuXG4gICAgICB0ZC5leGl0KCkucmVtb3ZlKClcblxuICAgICAgdmFyIG8gPSBkM191cGRhdGVhYmxlKHJvd3MsXCJ0ZC5vcHRpb24taGVhZGVyXCIsXCJ0ZFwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwib3B0aW9uLWhlYWRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuIFxuICAgICAgaWYgKHRoaXMuX3NraXBfb3B0aW9uKSBvLmNsYXNzZWQoXCJoaWRkZW5cIix0cnVlKSBcblxuXG4gICAgICBkM191cGRhdGVhYmxlKG8sXCJhXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5odG1sKHNlbGYub3B0aW9uX3RleHQoKSlcbiAgICAgICAgXG5cblxuXG4gICAgfVxuICAsIG9wdGlvbl90ZXh0OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25fdGV4dFwiLHZhbCkgfVxuICAsIHJlbmRlcjogZnVuY3Rpb24oayxmbikge1xuICAgICAgaWYgKGZuID09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX3JlbmRlcmVyc1trXSB8fCBmYWxzZVxuICAgICAgdGhpcy5fcmVuZGVyZXJzW2tdID0gZm5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICB2YXIgd3JhcHBlciA9IHRoaXMucmVuZGVyX3dyYXBwZXIoKVxuXG4gICAgICB3cmFwcGVyLnNlbGVjdEFsbChcInRhYmxlXCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgc2VsZi5yZW5kZXJfaGVhZGVyKGQzLnNlbGVjdCh0aGlzKSkgXG4gICAgICAgIH0pXG5cbiAgICAgIHRoaXMucmVuZGVyX3Jvd3ModGhpcy5fdGFibGVfbWFpbilcblxuICAgICAgdGhpcy5vbihcImRyYXdcIikuYmluZCh0aGlzKSgpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZDM6IGQzXG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgJy4vc3VtbWFyeV90YWJsZS5jc3MnXG5pbXBvcnQge3RhYmxlfSBmcm9tICcuL3RhYmxlJ1xuXG5leHBvcnQgZnVuY3Rpb24gc3VtbWFyeV90YWJsZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTdW1tYXJ5VGFibGUodGFyZ2V0KVxufVxuXG5jbGFzcyBTdW1tYXJ5VGFibGUgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gICAgdGhpcy5fd3JhcHBlcl9jbGFzcyA9IFwidGFibGUtc3VtbWFyeS13cmFwcGVyXCJcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1widGl0bGVcIiwgXCJoZWFkZXJzXCIsIFwiZGF0YVwiLCBcIndyYXBwZXJfY2xhc3NcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgdmFyIHVybHNfc3VtbWFyeSA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcInN1bW1hcnktdGFibGVcIilcbiAgICAgIFxuICAgIGQzX2NsYXNzKHVybHNfc3VtbWFyeSxcInRpdGxlXCIpXG4gICAgICAudGV4dCh0aGlzLnRpdGxlKCkpXG5cbiAgICB2YXIgdXdyYXAgPSBkM19jbGFzcyh1cmxzX3N1bW1hcnksXCJ3cmFwXCIpXG5cblxuICAgIHRhYmxlKHV3cmFwKVxuICAgICAgLndyYXBwZXJfY2xhc3ModGhpcy53cmFwcGVyX2NsYXNzKCksdHJ1ZSlcbiAgICAgIC5kYXRhKHtcInZhbHVlc1wiOnRoaXMuZGF0YSgpfSlcbiAgICAgIC5za2lwX29wdGlvbih0cnVlKVxuICAgICAgLmhlYWRlcnModGhpcy5oZWFkZXJzKCkpXG4gICAgICAuZHJhdygpXG5cbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtmaWx0ZXJ9IGZyb20gJ2ZpbHRlcidcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBGaWx0ZXJWaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuXG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG4gIHRoaXMuX2ZpbHRlcl9vcHRpb25zID0ge1xuICAgICAgXCJDYXRlZ29yeVwiOiBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCJcbiAgICAsIFwiVGl0bGVcIjogXCJ1cmxcIlxuICAgICwgXCJUaW1lXCI6IFwiaG91clwiXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZmlsdGVyX3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRmlsdGVyVmlldyh0YXJnZXQpXG59XG5cbkZpbHRlclZpZXcucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgbG9naWM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsb2dpY1wiLHZhbCkgXG4gICAgfVxuICAsIGNhdGVnb3JpZXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjYXRlZ29yaWVzXCIsdmFsKSBcbiAgICB9XG4gICwgZmlsdGVyczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImZpbHRlcnNcIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIFxuICAgICAgdmFyIHdyYXBwZXIgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmZpbHRlci13cmFwXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiZmlsdGVyLXdyYXBcIix0cnVlKVxuXG4gICAgICBoZWFkZXIod3JhcHBlcilcbiAgICAgICAgLnRleHQoXCJGaWx0ZXJcIilcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICB2YXIgc3VidGl0bGUgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsIFwiLnN1YnRpdGxlLWZpbHRlclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwic3VidGl0bGUtZmlsdGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCIgdXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCIgYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiIDMzcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiICNlM2ViZjBcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdWJ0aXRsZSxcInNwYW4uZmlyc3RcIixcInNwYW5cIilcbiAgICAgICAgLnRleHQoXCJVc2VycyBtYXRjaGluZyBcIiApXG4gICAgICAgIC5jbGFzc2VkKFwiZmlyc3RcIix0cnVlKVxuICAgIFxuICAgICAgdmFyIGZpbHRlcl90eXBlICA9IGQzX3VwZGF0ZWFibGUoc3VidGl0bGUsXCJzcGFuLm1pZGRsZVwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcIm1pZGRsZVwiLHRydWUpXG4gICAgXG4gICAgICBzZWxlY3QoZmlsdGVyX3R5cGUpXG4gICAgICAgIC5vcHRpb25zKHRoaXMubG9naWMoKSlcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB0aGlzLmxvZ2ljKCkubWFwKGZ1bmN0aW9uKHkpIHsgXG4gICAgICAgICAgICB5LnNlbGVjdGVkID0gKHkua2V5ID09IHgua2V5KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgdGhpcy5vbihcImxvZ2ljLmNoYW5nZVwiKSh0aGlzLmxvZ2ljKCkpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgLmRyYXcoKVxuICAgICAgXG4gICAgICBkM191cGRhdGVhYmxlKHN1YnRpdGxlLFwic3Bhbi5sYXN0XCIsXCJzcGFuXCIpXG4gICAgICAgIC50ZXh0KFwiIG9mIHRoZSBmb2xsb3dpbmc6XCIpXG4gICAgICAgIC5jbGFzc2VkKFwibGFzdFwiLHRydWUpXG5cblxuICAgICAgLy8gLS0tLS0tLS0gQ0FURUdPUklFUyAtLS0tLS0tLS0gLy9cblxuICAgICAgdmFyIGNhdGVnb3JpZXMgPSB0aGlzLmNhdGVnb3JpZXMoKVxuICAgICAgdmFyIGZpbHRlcl9jaGFuZ2UgPSB0aGlzLm9uKFwiZmlsdGVyLmNoYW5nZVwiKS5iaW5kKHRoaXMpXG5cbiAgICAgIGZ1bmN0aW9uIHNlbGVjdGl6ZUlucHV0KGZpbHRlcix2YWx1ZSkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgICAgICAucHJvcGVydHkoXCJ2YWx1ZVwiLHZhbHVlLnZhbHVlKVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgZGVzdHJveSA9IGQzLnNlbGVjdCh0aGlzKS5vbihcImRlc3Ryb3lcIilcbiAgICAgICAgICAgIGlmIChkZXN0cm95KSBkZXN0cm95KClcbiAgICAgICAgICB9KVxuXG5cbiAgICAgICAgdmFyIHMgPSAkKHNlbGVjdC5ub2RlKCkpLnNlbGVjdGl6ZSh7XG4gICAgICAgICAgcGVyc2lzdDogZmFsc2UsXG4gICAgICAgICAgY3JlYXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gKHZhbHVlLnZhbHVlID8gdmFsdWUudmFsdWUgKyBcIixcIiA6IFwiXCIpICsgeFxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHZhbHVlOiB4LCB0ZXh0OiB4XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkRlbGV0ZTogZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHZhbHVlLnZhbHVlLnNwbGl0KFwiLFwiKS5maWx0ZXIoZnVuY3Rpb24oeikgeyByZXR1cm4geiAhPSB4WzBdfSkuam9pbihcIixcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB2YWx1ZTogeCwgdGV4dDogeFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLm9uKFwiZGVzdHJveVwiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc1swXS5zZWxlY3RpemUuZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBzZWxlY3RpemVTZWxlY3QoZmlsdGVyLHZhbHVlKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpLnJlbW92ZSgpXG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciBkZXN0cm95ID0gZDMuc2VsZWN0KHRoaXMpLm9uKFwiZGVzdHJveVwiKVxuICAgICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICAgIH0pXG5cblxuXG4gICAgXG4gICAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcInNlbGVjdC52YWx1ZVwiLFwic2VsZWN0XCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZVwiLHRydWUpXG4gICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtYXgtd2lkdGhcIixcIjUwMHB4XCIpXG4gICAgICAgICAgLmF0dHIoXCJtdWx0aXBsZVwiLHRydWUpXG4gICAgICAgICAgLm9uKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSB0aGlzLnZhbHVlXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgIH0pXG4gICAgXG4gICAgICAgIGQzX3NwbGF0KHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIsY2F0ZWdvcmllcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgICAgIC5hdHRyKFwic2VsZWN0ZWRcIixmdW5jdGlvbih4KSB7IHJldHVybiB2YWx1ZS52YWx1ZSAmJiB2YWx1ZS52YWx1ZS5pbmRleE9mKHgua2V5KSA+IC0xID8gXCJzZWxlY3RlZFwiIDogdW5kZWZpbmVkIH0pXG4gICAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcblxuICAgICAgICB2YXIgcyA9ICQoc2VsZWN0Lm5vZGUoKSkuc2VsZWN0aXplKHtcbiAgICAgICAgICBwZXJzaXN0OiBmYWxzZSxcbiAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSB4LmpvaW4oXCIsXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLm9uKFwiZGVzdHJveVwiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc1swXS5zZWxlY3RpemUuZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuXG5cbiAgICBcbiAgICAgIH1cbiAgICBcbiAgICAgIHRoaXMuX2xvZ2ljX2ZpbHRlciA9IGZpbHRlcih3cmFwcGVyKVxuICAgICAgICAuZmllbGRzKE9iamVjdC5rZXlzKHRoaXMuX2ZpbHRlcl9vcHRpb25zKSlcbiAgICAgICAgLm9wcyhbXG4gICAgICAgICAgICBbe1wia2V5XCI6IFwiaXMgaW4uY2F0ZWdvcnlcIn0se1wia2V5XCI6IFwiaXMgbm90IGluLmNhdGVnb3J5XCJ9XVxuICAgICAgICAgICwgW3tcImtleVwiOiBcImNvbnRhaW5zLnNlbGVjdGl6ZVwifSwge1wia2V5XCI6XCJkb2VzIG5vdCBjb250YWluLnNlbGVjdGl6ZVwifV1cbiAgICAgICAgICAsIFt7XCJrZXlcIjogXCJlcXVhbHNcIn0sIHtcImtleVwiOlwiYmV0d2VlblwiLFwiaW5wdXRcIjoyfV1cbiAgICAgICAgXSlcbiAgICAgICAgLmRhdGEodGhpcy5maWx0ZXJzKCkpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJjb250YWlucy5zZWxlY3RpemVcIixzZWxlY3RpemVJbnB1dClcbiAgICAgICAgLnJlbmRlcl9vcChcImRvZXMgbm90IGNvbnRhaW4uc2VsZWN0aXplXCIsc2VsZWN0aXplSW5wdXQpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJpcyBpbi5jYXRlZ29yeVwiLHNlbGVjdGl6ZVNlbGVjdClcbiAgICAgICAgLnJlbmRlcl9vcChcImlzIG5vdCBpbi5jYXRlZ29yeVwiLHNlbGVjdGl6ZVNlbGVjdClcbiAgICAgICAgLnJlbmRlcl9vcChcImJldHdlZW5cIixmdW5jdGlvbihmaWx0ZXIsdmFsdWUpIHtcbiAgICAgICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBcbiAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHR5cGVvZih2YWx1ZS52YWx1ZSkgPT0gXCJvYmplY3RcIiA/IHZhbHVlLnZhbHVlIDogWzAsMjRdXG4gICAgXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dC52YWx1ZS5sb3dcIixcImlucHV0XCIpXG4gICAgICAgICAgICAuY2xhc3NlZChcInZhbHVlIGxvd1wiLHRydWUpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI5MHB4XCIpXG4gICAgICAgICAgICAuYXR0cihcInZhbHVlXCIsIHZhbHVlLnZhbHVlWzBdKVxuICAgICAgICAgICAgLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgIHZhciB0ID0gdGhpc1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHNlbGYudHlwZXdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlWzBdID0gdC52YWx1ZVxuICAgICAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICAgIH0sMTAwMClcbiAgICAgICAgICAgIH0pXG4gICAgXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJzcGFuLnZhbHVlLWFuZFwiLFwic3BhblwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZS1hbmRcIix0cnVlKVxuICAgICAgICAgICAgLnRleHQoXCIgYW5kIFwiKVxuICAgIFxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwiaW5wdXQudmFsdWUuaGlnaFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidmFsdWUgaGlnaFwiLHRydWUpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI5MHB4XCIpXG4gICAgICAgICAgICAuYXR0cihcInZhbHVlXCIsIHZhbHVlLnZhbHVlWzFdKVxuICAgICAgICAgICAgLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgIHZhciB0ID0gdGhpc1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHNlbGYudHlwZXdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlWzFdID0gdC52YWx1ZVxuICAgICAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICAgIH0sMTAwMClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcInVwZGF0ZVwiLGZ1bmN0aW9uKGZpbHRlcnMpe1xuICAgICAgICAgIGZpbHRlcl9jaGFuZ2UoZmlsdGVycylcbiAgICAgICAgfSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICAvL2QzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuZmlsdGVyLXdyYXAtc3BhY2VyXCIsXCJkaXZcIilcbiAgICAgIC8vICAuY2xhc3NlZChcImZpbHRlci13cmFwLXNwYWNlclwiLHRydWUpXG4gICAgICAvLyAgLnN0eWxlKFwiaGVpZ2h0XCIsd3JhcHBlci5zdHlsZShcImhlaWdodFwiKSlcblxuICAgICAgLy93cmFwcGVyXG4gICAgICAvLyAgLnN0eWxlKFwid2lkdGhcIix0aGlzLnRhcmdldC5zdHlsZShcIndpZHRoXCIpKVxuICAgICAgLy8gIC5zdHlsZShcInBvc2l0aW9uXCIsXCJmaXhlZFwiKVxuICAgICAgLy8gIC5zdHlsZShcInotaW5kZXhcIixcIjMwMFwiKVxuICAgICAgLy8gIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmMGY0ZjdcIilcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG5cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi9oZWFkZXInXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5leHBvcnQgZnVuY3Rpb24gQnV0dG9uUmFkaW8odGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYnV0dG9uX3JhZGlvKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEJ1dHRvblJhZGlvKHRhcmdldClcbn1cblxuQnV0dG9uUmFkaW8ucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24gKCkge1xuICBcbiAgICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuICAgICAgLm9wdGlvbnMtdmlldyB7IHRleHQtYWxpZ246cmlnaHQgfVxuICAgICAgLnNob3ctYnV0dG9uIHtcbiAgICAgIHdpZHRoOiAxNTBweDtcbiAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICAgIGxpbmUtaGVpZ2h0OiA0MHB4O1xuICAgICAgYm9yZGVyLXJhZGl1czogMTVweDtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNjY2M7XG4gICAgICBmb250LXNpemU6IDEycHg7XG4gICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xuICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7XG4gICAgICBkaXNwbGF5OmlubGluZS1ibG9jaztcbiAgICAgIG1hcmdpbi1yaWdodDoxNXB4O1xuICAgICAgICB9XG4gICAgICAuc2hvdy1idXR0b246aG92ZXIgeyB0ZXh0LWRlY29yYXRpb246bm9uZTsgY29sb3I6IzU1NSB9XG4gICAgICAuc2hvdy1idXR0b24uc2VsZWN0ZWQge1xuICAgICAgICBiYWNrZ3JvdW5kOiAjZTNlYmYwO1xuICAgICAgICBjb2xvcjogIzU1NTtcbiAgICAgIH1cbiAgICAqL30pXG4gIFxuICAgIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI3Nob3ctY3NzXCIsXCJzdHlsZVwiKVxuICAgICAgLmF0dHIoXCJpZFwiLFwiaGVhZGVyLWNzc1wiKVxuICAgICAgLnRleHQoQ1NTX1NUUklORy5yZXBsYWNlKFwiZnVuY3Rpb24gKCkgey8qXCIsXCJcIikucmVwbGFjZShcIiovfVwiLFwiXCIpKVxuICBcbiAgICB2YXIgb3B0aW9ucyA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuYnV0dG9uLXJhZGlvLXJvd1wiLFwiZGl2XCIpXG4gICAgICAuY2xhc3NlZChcImJ1dHRvbi1yYWRpby1yb3dcIix0cnVlKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMzVweFwiKVxuICBcbiAgXG4gICAgdmFyIGJ1dHRvbl9yb3cgPSBkM191cGRhdGVhYmxlKG9wdGlvbnMsXCIub3B0aW9ucy12aWV3XCIsXCJkaXZcIix0aGlzLmRhdGEoKSlcbiAgICAgIC5jbGFzc2VkKFwib3B0aW9ucy12aWV3XCIsdHJ1ZSlcblxuICAgIHZhciBib3VuZCA9IHRoaXMub24oXCJjbGlja1wiKS5iaW5kKHRoaXMpXG4gIFxuICAgIGQzX3NwbGF0KGJ1dHRvbl9yb3csXCIuc2hvdy1idXR0b25cIixcImFcIixpZGVudGl0eSwga2V5KVxuICAgICAgLmNsYXNzZWQoXCJzaG93LWJ1dHRvblwiLHRydWUpXG4gICAgICAuY2xhc3NlZChcInNlbGVjdGVkXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguc2VsZWN0ZWQgfSlcbiAgICAgIC50ZXh0KGtleSlcbiAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHsgYm91bmQoeCkgfSlcblxuICAgIHJldHVybiB0aGlzXG4gIFxuICAgIH1cbiAgXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZnVuY3Rpb24gT3B0aW9uVmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG9wdGlvbl92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IE9wdGlvblZpZXcodGFyZ2V0KVxufVxuXG5PcHRpb25WaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLm9wdGlvbi13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJvcHRpb24td3JhcFwiLHRydWUpXG5cbiAgICAgIC8vaGVhZGVyKHdyYXApXG4gICAgICAvLyAgLnRleHQoXCJDaG9vc2UgVmlld1wiKVxuICAgICAgLy8gIC5kcmF3KClcblxuICAgICAgYnV0dG9uX3JhZGlvKHdyYXApXG4gICAgICAgIC5vbihcImNsaWNrXCIsIHRoaXMub24oXCJzZWxlY3RcIikgKVxuICAgICAgICAuZGF0YSh0aGlzLmRhdGEoKSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IHthdXRvU2l6ZSBhcyBhdXRvU2l6ZX0gZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCB7cHJlcERhdGEgYXMgcH0gZnJvbSAnLi4vaGVscGVycyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmVwRGF0YSgpIHtcbiAgcmV0dXJuIHAuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufTtcblxudmFyIEVYQU1QTEVfREFUQSA9IHtcbiAgICBcImtleVwiOiBcIkJyb3dzaW5nIGJlaGF2aW9yIGJ5IHRpbWVcIlxuICAsIFwidmFsdWVzXCI6IFtcbiAgICAgIHsgIFxuICAgICAgICAgIFwia2V5XCI6IDFcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogMlxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAyLjI1XG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDIuNVxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAzXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0XG4gICAgICB9XG5cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiA0XG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuXG5cbiAgXSBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFRpbWVTZXJpZXModGFyZ2V0KSB7XG4gIHRoaXMuX3RhcmdldCA9IHRhcmdldDtcbiAgdGhpcy5fZGF0YSA9IEVYQU1QTEVfREFUQVxuICB0aGlzLl9vbiA9IHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRpbWVfc2VyaWVzKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFRpbWVTZXJpZXModGFyZ2V0KVxufVxuXG5UaW1lU2VyaWVzLnByb3RvdHlwZSA9IHtcblxuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHRpdGxlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfVxuICAsIGhlaWdodDogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVpZ2h0XCIsdmFsKSB9XG5cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gdGhpcy5fdGFyZ2V0XG4gICAgICB2YXIgZGVzYyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi52ZW5kb3ItZG9tYWlucy1iYXItZGVzY1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidmVuZG9yLWRvbWFpbnMtYmFyLWRlc2NcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuICAgICAgICAuZGF0dW0odGhpcy5fZGF0YSlcblxuICAgICAgdmFyIHdyYXBwZXIgPSBkM191cGRhdGVhYmxlKGRlc2MsXCIud1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwid1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuXG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgXG4gICAgICBcblxuICAgICAgd3JhcHBlci5lYWNoKGZ1bmN0aW9uKHJvdyl7XG5cbiAgICAgICAgdmFyIGRhdGEgPSByb3cudmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLmtleSAtIHAua2V5fSlcbiAgICAgICAgICAsIGNvdW50ID0gZGF0YS5sZW5ndGg7XG5cblxuICAgICAgICB2YXIgX3NpemVzID0gYXV0b1NpemUod3JhcHBlcixmdW5jdGlvbihkKXtyZXR1cm4gZCAtMTB9LCBmdW5jdGlvbihkKXtyZXR1cm4gc2VsZi5faGVpZ2h0IHx8IDYwIH0pLFxuICAgICAgICAgIGdyaWRTaXplID0gTWF0aC5mbG9vcihfc2l6ZXMud2lkdGggLyAyNCAvIDMpO1xuXG4gICAgICAgIHZhciB2YWx1ZUFjY2Vzc29yID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9XG4gICAgICAgICAgLCB2YWx1ZUFjY2Vzc29yMiA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUyIH1cbiAgICAgICAgICAsIGtleUFjY2Vzc29yID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfVxuXG4gICAgICAgIHZhciBzdGVwcyA9IEFycmF5LmFwcGx5KG51bGwsIEFycmF5KGNvdW50KSkubWFwKGZ1bmN0aW9uIChfLCBpKSB7cmV0dXJuIGkrMTt9KVxuXG4gICAgICAgIHZhciBfY29sb3JzID0gW1wiI2ZmZmZkOVwiLFwiI2VkZjhiMVwiLFwiI2M3ZTliNFwiLFwiIzdmY2RiYlwiLFwiIzQxYjZjNFwiLFwiIzFkOTFjMFwiLFwiIzIyNWVhOFwiLFwiIzI1MzQ5NFwiLFwiIzA4MWQ1OFwiXVxuICAgICAgICB2YXIgY29sb3JzID0gX2NvbG9yc1xuXG4gICAgICAgIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpLnJhbmdlKHN0ZXBzKVxuICAgICAgICAgICwgeSA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFtfc2l6ZXMuaGVpZ2h0LCAwIF0pXG5cblxuICAgICAgICB2YXIgY29sb3JTY2FsZSA9IGQzLnNjYWxlLnF1YW50aWxlKClcbiAgICAgICAgICAuZG9tYWluKFswLCBkMy5tYXgoZGF0YSwgZnVuY3Rpb24gKGQpIHsgcmV0dXJuIGQuZnJlcXVlbmN5OyB9KV0pXG4gICAgICAgICAgLnJhbmdlKGNvbG9ycyk7XG5cbiAgICAgICAgdmFyIHN2Z193cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwic3ZnXCIsXCJzdmdcIilcbiAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIF9zaXplcy53aWR0aCArIF9zaXplcy5tYXJnaW4ubGVmdCArIF9zaXplcy5tYXJnaW4ucmlnaHQpXG4gICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgX3NpemVzLmhlaWdodCArIF9zaXplcy5tYXJnaW4udG9wICsgX3NpemVzLm1hcmdpbi5ib3R0b20pXG5cbiAgICAgICAgdmFyIHN2ZyA9IGQzX3NwbGF0KHN2Z193cmFwLFwiZ1wiLFwiZ1wiLGZ1bmN0aW9uKHgpIHtyZXR1cm4gW3gudmFsdWVzXX0sZnVuY3Rpb24oXyxpKSB7cmV0dXJuIGl9KVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgX3NpemVzLm1hcmdpbi5sZWZ0ICsgXCIsXCIgKyAwICsgXCIpXCIpXG5cbiAgICAgICAgeC5kb21haW4oWzAsNzJdKTtcbiAgICAgICAgeS5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBNYXRoLnNxcnQodmFsdWVBY2Nlc3NvcihkKSk7IH0pXSk7XG5cbiAgICAgICAgdmFyIGJ1aWxkQmFycyA9IGZ1bmN0aW9uKGRhdGEsa2V5QWNjZXNzb3IsdmFsdWVBY2Nlc3Nvcix5LGMpIHtcblxuICAgICAgICAgIHZhciBiYXJzID0gZDNfc3BsYXQoc3ZnLCBcIi50aW1pbmctYmFyXCIgKyBjLCBcInJlY3RcIiwgZGF0YSwga2V5QWNjZXNzb3IpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidGltaW5nLWJhclwiICsgYylcbiAgICAgICAgICAgXG4gICAgICAgICAgYmFyc1xuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuICgoa2V5QWNjZXNzb3IoZCkgLSAxKSAqIGdyaWRTaXplICk7IH0pXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGdyaWRTaXplIC0gMSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7IFxuICAgICAgICAgICAgICByZXR1cm4geShNYXRoLnNxcnQoIHZhbHVlQWNjZXNzb3IoZCkgKSk7IFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLFwiI2FhYVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gY29sb3JTY2FsZSgga2V5QWNjZXNzb3IoeCkgKyBjICkgfHwgXCJncmV5XCIgfSApXG4gICAgICAgICAgICAvLy5hdHRyKFwic3Ryb2tlXCIsXCJ3aGl0ZVwiKVxuICAgICAgICAgICAgLy8uYXR0cihcInN0cm9rZS13aWR0aFwiLFwiMXB4XCIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBfc2l6ZXMuaGVpZ2h0IC0geShNYXRoLnNxcnQoIHZhbHVlQWNjZXNzb3IoZCkgKSk7IH0pXG4gICAgICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIxXCIpXG4gICAgICAgICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbih4KXsgXG4gICAgICAgICAgICAgIHNlbGYub24oXCJob3ZlclwiKS5iaW5kKHRoaXMpKHgpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIH1cbiAgICAgICAgXG5cbiAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5sZW5ndGggJiYgZGF0YVswXS52YWx1ZTIpIHtcbiAgICAgICAgICB2YXIgIHkyID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoW19zaXplcy5oZWlnaHQsIDAgXSlcbiAgICAgICAgICB5Mi5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBNYXRoLnNxcnQodmFsdWVBY2Nlc3NvcjIoZCkpOyB9KV0pO1xuICAgICAgICAgIGJ1aWxkQmFycyhkYXRhLGtleUFjY2Vzc29yLHZhbHVlQWNjZXNzb3IyLHkyLFwiLTJcIilcbiAgICAgICAgfVxuXG5cbiAgICAgICAgYnVpbGRCYXJzKGRhdGEsa2V5QWNjZXNzb3IsdmFsdWVBY2Nlc3Nvcix5LFwiXCIpXG4gICAgICBcbiAgICBcbiAgICAgIHZhciB6ID0gZDMudGltZS5zY2FsZSgpXG4gICAgICAgIC5yYW5nZShbMCwgZ3JpZFNpemUqMjQqM10pXG4gICAgICAgIC5uaWNlKGQzLnRpbWUuaG91ciwyNClcbiAgICAgICAgXG4gICAgXG4gICAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpXG4gICAgICAgIC5zY2FsZSh6KVxuICAgICAgICAudGlja3MoMylcbiAgICAgICAgLnRpY2tGb3JtYXQoZDMudGltZS5mb3JtYXQoXCIlSSAlcFwiKSk7XG4gICAgXG4gICAgICBzdmcuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ4IGF4aXNcIilcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLFwiICsgX3NpemVzLmhlaWdodCArIFwiKVwiKVxuICAgICAgICAgIC5jYWxsKHhBeGlzKTtcblxuXG5cbiAgICAgICAgXG4gICAgICB9KVxuXG5cbiAgICB9XG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM19zcGxhdCwgZDNfdXBkYXRlYWJsZSwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUYWJ1bGFySGVhZGVyIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuV0lEVEggPSAxNDRcbiAgICB0aGlzLl9sYWJlbCA9IFwiVVJMXCJcbiAgICB0aGlzLl9oZWFkZXJzID0gW1wiMTJhbVwiLCBcIjEycG1cIiwgXCIxMmFtXCJdXG4gICAgdGhpcy5feHMgPSBbMCx0aGlzLldJRFRILzIsdGhpcy5XSURUSF1cbiAgICB0aGlzLl9hbmNob3JzID0gW1wic3RhcnRcIixcIm1pZGRsZVwiLFwiZW5kXCJdXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImxhYmVsXCIsXCJoZWFkZXJzXCJdIH1cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIGV1aCA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcImV4cGFuc2lvbi11cmxzLXRpdGxlXCIpXG5cbiAgICBkM19jbGFzcyhldWgsXCJ0aXRsZVwiKS50ZXh0KHRoaXMubGFiZWwoKSlcbiAgICBkM19jbGFzcyhldWgsXCJ2aWV3XCIpLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhldWgsXCJsZWdlbmRcIixcInN2Z1wiKVxuXG4gICAgaWYgKHRoaXMuaGVhZGVycygpLmxlbmd0aCA9PSAyKSB7XG4gICAgICB0aGlzLl94cyA9IFt0aGlzLldJRFRILzItdGhpcy5XSURUSC80LHRoaXMuV0lEVEgvMit0aGlzLldJRFRILzRdXG4gICAgICB0aGlzLl9hbmNob3JzID0gW1wibWlkZGxlXCIsXCJtaWRkbGVcIl1cbiAgICB9XG5cbiAgICBkM19zcGxhdChzdmdfbGVnZW5kLFwidGV4dFwiLFwidGV4dFwiLHRoaXMuaGVhZGVycygpLCh4LGkpID0+IHsgcmV0dXJuIGkgfSlcbiAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgIC5hdHRyKFwieFwiLCh4LGkpID0+IHRoaXMuX3hzW2ldKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwoeCxpKSA9PiB0aGlzLl9hbmNob3JzW2ldKVxuICAgICAgLnRleHQoU3RyaW5nKVxuXG4gICAgZDNfc3BsYXQoc3ZnX2xlZ2VuZCxcImxpbmVcIixcImxpbmVcIix0aGlzLmhlYWRlcnMoKSwoeCxpKSA9PiB7IHJldHVybiBpIH0pXG4gICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgIC5hdHRyKFwieTFcIiwgdGhpcy5oZWFkZXJzKCkubGVuZ3RoID09IDIgPyAwIDogMjUpXG4gICAgICAuYXR0cihcInkyXCIsIDM1KVxuICAgICAgLmF0dHIoXCJ4MVwiLCh4LGkpID0+IHRoaXMuaGVhZGVycygpLmxlbmd0aCA9PSAyID8gdGhpcy5XSURUSC8yIDogdGhpcy5feHNbaV0pXG4gICAgICAuYXR0cihcIngyXCIsKHgsaSkgPT4gdGhpcy5oZWFkZXJzKCkubGVuZ3RoID09IDIgPyB0aGlzLldJRFRILzIgOiB0aGlzLl94c1tpXSlcblxuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gc2ltcGxlVGltZXNlcmllcyh0YXJnZXQsZGF0YSx3LGgsbWluKSB7XG4gIHZhciB3aWR0aCA9IHcgfHwgMTIwXG4gICAgLCBoZWlnaHQgPSBoIHx8IDMwXG5cbiAgdmFyIHggPSBkMy5zY2FsZS5vcmRpbmFsKCkuZG9tYWluKGQzLnJhbmdlKDAsZGF0YS5sZW5ndGgpKS5yYW5nZShkMy5yYW5nZSgwLHdpZHRoLHdpZHRoL2RhdGEubGVuZ3RoKSlcbiAgdmFyIHkgPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbNCxoZWlnaHRdKS5kb21haW4oW21pbiB8fCBkMy5taW4oZGF0YSksZDMubWF4KGRhdGEpXSlcblxuICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZ1wiLFwiZ1wiLGRhdGEsZnVuY3Rpb24oeCxpKSB7IHJldHVybiAxfSlcblxuICBkM19zcGxhdCh3cmFwLFwicmVjdFwiLFwicmVjdFwiLHggPT4geCwgKHgsaSkgPT4gaSlcbiAgICAuYXR0cihcInhcIiwoeixpKSA9PiB4KGkpKVxuICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgvZGF0YS5sZW5ndGggLTEuMilcbiAgICAuYXR0cihcInlcIiwgeiA9PiBoZWlnaHQgLSB5KHopIClcbiAgICAuYXR0cihcImhlaWdodFwiLCB6ID0+IHogPyB5KHopIDogMClcblxuICByZXR1cm4gd3JhcFxuXG59XG4iLCJpbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJy4vc2ltcGxlX3RpbWVzZXJpZXMnXG5pbXBvcnQge2QzX2NsYXNzLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBiZWZvcmVfYWZ0ZXJfdGltZXNlcmllcyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBCZWZvcmVBZnRlclRpbWVzZXJpZXModGFyZ2V0KVxufVxuXG5jbGFzcyBCZWZvcmVBZnRlclRpbWVzZXJpZXMgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuXG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKHRhcmdldClcbiAgICB0aGlzLl93cmFwcGVyX2NsYXNzID0gXCJiYS10aW1lc2VyaWVzLXdyYXBcIlxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJiZWZvcmVcIixcImFmdGVyXCIsXCJ3cmFwcGVyX2NsYXNzXCJdIH1cblxuICBkcmF3KCkge1xuXG4gICAgY29uc3QgdHN3ID0gMjUwXG4gICAgICAsIHVuaXRfc2l6ZSA9IHRzdy90aGlzLmRhdGEoKS5sZW5ndGhcbiAgICAgICwgYmVmb3JlX3BvcyA9IHRoaXMuYmVmb3JlKClcbiAgICAgICwgYWZ0ZXJfcG9zID0gdGhpcy5hZnRlcigpXG5cblxuICAgIGNvbnN0IHRpbWVzZXJpZXMgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsdGhpcy53cmFwcGVyX2NsYXNzKCksXCJzdmdcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgIC5hdHRyKFwid2lkdGhcIix0c3cgKyBcInB4XCIpXG4gICAgICAuYXR0cihcImhlaWdodFwiLFwiNzBweFwiKVxuXG4gICAgc2ltcGxlVGltZXNlcmllcyh0aW1lc2VyaWVzLHRoaXMuZGF0YSgpLHRzdylcblxuICAgIC8vIGFkZCBkZWNvcmF0aW9uc1xuXG4gICAgZDNfY2xhc3ModGltZXNlcmllcyxcIm1pZGRsZVwiLFwibGluZVwiKVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAuYXR0cihcInkyXCIsIDU1KVxuICAgICAgLmF0dHIoXCJ4MVwiLCB0c3cvMilcbiAgICAgIC5hdHRyKFwieDJcIiwgdHN3LzIpXG5cbiAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwibWlkZGxlLXRleHRcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwieFwiLCB0c3cvMilcbiAgICAgIC5hdHRyKFwieVwiLCA2NylcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJtaWRkbGVcIilcbiAgICAgIC50ZXh0KFwiT24tc2l0ZVwiKVxuXG4gICAgZDNfY2xhc3ModGltZXNlcmllcyxcImJlZm9yZVwiLFwibGluZVwiKVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAuYXR0cihcInkxXCIsIDM5KVxuICAgICAgLmF0dHIoXCJ5MlwiLCA0NSlcbiAgICAgIC5hdHRyKFwieDFcIiwgdW5pdF9zaXplKmJlZm9yZV9wb3MpXG4gICAgICAuYXR0cihcIngyXCIsIHVuaXRfc2l6ZSpiZWZvcmVfcG9zKVxuXG4gICAgZDNfY2xhc3ModGltZXNlcmllcyxcImJlZm9yZS10ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInhcIiwgdW5pdF9zaXplKmJlZm9yZV9wb3MgLSA4KVxuICAgICAgLmF0dHIoXCJ5XCIsIDQ4KVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLnRleHQoXCJDb25zaWRlcmF0aW9uXCIpXG5cbiAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwid2luZG93XCIsXCJsaW5lXCIpXG4gICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgIC5hdHRyKFwieTFcIiwgNDUpXG4gICAgICAuYXR0cihcInkyXCIsIDQ1KVxuICAgICAgLmF0dHIoXCJ4MVwiLCB1bml0X3NpemUqKGJlZm9yZV9wb3MpKVxuICAgICAgLmF0dHIoXCJ4MlwiLCB1bml0X3NpemUqKGFmdGVyX3BvcysxKSsxKVxuXG4gICAgZDNfY2xhc3ModGltZXNlcmllcyxcImFmdGVyXCIsXCJsaW5lXCIpXG4gICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgIC5hdHRyKFwieTFcIiwgMzkpXG4gICAgICAuYXR0cihcInkyXCIsIDQ1KVxuICAgICAgLmF0dHIoXCJ4MVwiLCB1bml0X3NpemUqKGFmdGVyX3BvcysxKSlcbiAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkpXG5cbiAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYWZ0ZXItdGV4dFwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ4XCIsIHVuaXRfc2l6ZSooYWZ0ZXJfcG9zKzEpICsgOClcbiAgICAgIC5hdHRyKFwieVwiLCA0OClcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJzdGFydFwiKVxuICAgICAgLnRleHQoXCJWYWxpZGF0aW9uXCIpXG5cblxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbn1cblxuXG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gc2ltcGxlQmFyKHdyYXAsdmFsdWUsc2NhbGUsY29sb3IpIHtcblxuICB2YXIgaGVpZ2h0ID0gMjBcbiAgICAsIHdpZHRoID0gd3JhcC5zdHlsZShcIndpZHRoXCIpLnJlcGxhY2UoXCJweFwiLFwiXCIpXG5cbiAgdmFyIGNhbnZhcyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcInN2Z1wiLFwic3ZnXCIsW3ZhbHVlXSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgIC5zdHlsZShcIndpZHRoXCIsd2lkdGgrXCJweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLGhlaWdodCtcInB4XCIpXG5cbiAgdmFyIGNoYXJ0ID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQnLCdnJyxmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICBcbiAgdmFyIGJhcnMgPSBkM19zcGxhdChjaGFydCxcIi5wb3AtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSB9KVxuICAgIC5hdHRyKFwiY2xhc3NcIixcInBvcC1iYXJcIilcbiAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtNClcbiAgICAuYXR0cih7J3gnOjAsJ3knOjB9KVxuICAgIC5zdHlsZSgnZmlsbCcsY29sb3IpXG4gICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHNjYWxlKHgpIH0pXG5cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIGRvbWFpbl9idWxsZXQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRG9tYWluQnVsbGV0KHRhcmdldClcbn1cblxuLy8gZGF0YSBzY2hlbWE6IFt7cG9wX3BlcmNlbnQsIHNhbXBsZV9wZXJjZW50X25vcm19XG5cbmNsYXNzIERvbWFpbkJ1bGxldCBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnRhcmdldCA9IHRhcmdldFxuICB9XG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiLFwibWF4XCJdIH1cblxuICBkcmF3KCkge1xuICAgIHZhciB3aWR0aCA9ICh0aGlzLnRhcmdldC5zdHlsZShcIndpZHRoXCIpLnJlcGxhY2UoXCJweFwiLFwiXCIpIHx8IHRoaXMub2Zmc2V0V2lkdGgpIC0gNTBcbiAgICAgICwgaGVpZ2h0ID0gMjg7XG5cbiAgICB2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAucmFuZ2UoWzAsIHdpZHRoXSlcbiAgICAgIC5kb21haW4oWzAsIHRoaXMubWF4KCldKVxuXG4gICAgaWYgKHRoaXMudGFyZ2V0LnRleHQoKSkgdGhpcy50YXJnZXQudGV4dChcIlwiKVxuXG4gICAgdmFyIGJ1bGxldCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuYnVsbGV0XCIsXCJkaXZcIix0aGlzLmRhdGEoKSxmdW5jdGlvbih4KSB7IHJldHVybiAxIH0pXG4gICAgICAuY2xhc3NlZChcImJ1bGxldFwiLHRydWUpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIzcHhcIilcblxuICAgIHZhciBzdmcgPSBkM191cGRhdGVhYmxlKGJ1bGxldCxcInN2Z1wiLFwic3ZnXCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAuYXR0cihcIndpZHRoXCIsd2lkdGgpXG4gICAgICAuYXR0cihcImhlaWdodFwiLGhlaWdodClcbiAgXG4gICBcbiAgICBkM191cGRhdGVhYmxlKHN2ZyxcIi5iYXItMVwiLFwicmVjdFwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgLmNsYXNzZWQoXCJiYXItMVwiLHRydWUpXG4gICAgICAuYXR0cihcInhcIiwwKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbihkKSB7cmV0dXJuIHgoZC5wb3BfcGVyY2VudCkgfSlcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICAgIC5hdHRyKFwiZmlsbFwiLFwiIzg4OFwiKVxuICBcbiAgICBkM191cGRhdGVhYmxlKHN2ZyxcIi5iYXItMlwiLFwicmVjdFwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgLmNsYXNzZWQoXCJiYXItMlwiLHRydWUpXG4gICAgICAuYXR0cihcInhcIiwwKVxuICAgICAgLmF0dHIoXCJ5XCIsaGVpZ2h0LzQpXG4gICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uKGQpIHtyZXR1cm4geChkLnNhbXBsZV9wZXJjZW50X25vcm0pIH0pXG4gICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQvMilcbiAgICAgIC5hdHRyKFwiZmlsbFwiLFwicmdiKDgsIDI5LCA4OClcIilcblxuICAgIHJldHVybiB0aGlzIFxuICB9XG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM19zcGxhdCwgZDNfdXBkYXRlYWJsZSwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICdjaGFydCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGFidWxhckJvZHkgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIixcInNwbGl0XCJdIH1cblxuICBkcmF3KCkge1xuICAgIGxldCBleHBhbnNpb25fcm93ID0gdGhpcy5fdGFyZ2V0XG5cbiAgICB2YXIgZXhwYW5zaW9uID0gZDNfY2xhc3MoZXhwYW5zaW9uX3JvdyxcImV4cGFuc2lvbi11cmxzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwic2Nyb2xsYm94XCIsdHJ1ZSlcblxuICAgIGV4cGFuc2lvbi5odG1sKFwiXCIpXG5cbiAgICB2YXIgdXJsX3JvdyA9IGQzX3NwbGF0KGV4cGFuc2lvbixcIi51cmwtcm93XCIsXCJkaXZcIix0aGlzLmRhdGEoKS5zbGljZSgwLDUwMCksZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5jbGFzc2VkKFwidXJsLXJvd1wiLHRydWUpXG5cbiAgICB2YXIgdXJsX25hbWUgPSBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubmFtZVwiLFwiZGl2XCIpLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcblxuICAgIGQzX3VwZGF0ZWFibGUodXJsX25hbWUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSh4KVxuICAgICAgfSlcblxuICAgIGQzX2NsYXNzKHVybF9uYW1lLFwidXJsXCIsXCJhXCIpXG4gICAgICAudGV4dCh4ID0+IHsgcmV0dXJuIHRoaXMuc3BsaXQoKSA/IHgua2V5LnNwbGl0KHRoaXMuc3BsaXQoKSlbMV0gfHwgeC5rZXkgOiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJocmVmXCIsIHggPT4geC51cmwgPyB4LnVybCA6IHVuZGVmaW5lZCApXG4gICAgICAuYXR0cihcInRhcmdldFwiLCBcIl9ibGFua1wiKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm51bWJlclwiLFwiZGl2XCIpLmNsYXNzZWQoXCJudW1iZXJcIix0cnVlKVxuICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b3RhbCB9KVxuXG5cbiAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIucGxvdFwiLFwic3ZnXCIpLmNsYXNzZWQoXCJwbG90XCIsdHJ1ZSlcbiAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgIHZhciB2YWx1ZXMgPSB4LnZhbHVlcyB8fCB4LnZhbHVlXG4gICAgICAgIHNpbXBsZVRpbWVzZXJpZXMoZHRoaXMsdmFsdWVzLDE0NCwyMClcbiAgICAgIH0pXG5cbiAgfVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfc3BsYXQsIGQzX3VwZGF0ZWFibGUsIGFjY2Vzc29yLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgVGFidWxhckhlYWRlciBmcm9tICcuL2hlYWRlcidcbmltcG9ydCBUYWJ1bGFyQm9keSBmcm9tICcuL2JvZHknXG5cbmltcG9ydCAnLi90YWJ1bGFyX3RpbWVzZXJpZXMuY3NzJ1xuXG5leHBvcnQgZnVuY3Rpb24gdGFidWxhcl90aW1lc2VyaWVzKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFRhYnVsYXJUaW1lc2VyaWVzKHRhcmdldClcbn1cblxuY2xhc3MgVGFidWxhclRpbWVzZXJpZXMgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5faGVhZGVycyA9IFtcIjEyYW1cIixcIjEycG1cIixcIjEyYW1cIl1cbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiLFwibGFiZWxcIixcInNwbGl0XCIsXCJoZWFkZXJzXCJdIH1cblxuICBkcmF3KCkge1xuICAgIGxldCB0ZCA9IHRoaXMuX3RhcmdldFxuXG4gICAgdmFyIHRpdGxlX3JvdyA9IGQzX2NsYXNzKHRkLFwidGl0bGUtcm93XCIpXG4gICAgdmFyIGV4cGFuc2lvbl9yb3cgPSBkM19jbGFzcyh0ZCxcImV4cGFuc2lvbi1yb3dcIilcblxuICAgIHZhciBoZWFkZXIgPSAobmV3IFRhYnVsYXJIZWFkZXIodGl0bGVfcm93KSlcbiAgICAgIC5sYWJlbCh0aGlzLmxhYmVsKCkpXG4gICAgICAuaGVhZGVycyh0aGlzLmhlYWRlcnMoKSlcbiAgICAgIC5kcmF3KClcblxuICAgIHZhciBib2R5ID0gKG5ldyBUYWJ1bGFyQm9keShleHBhbnNpb25fcm93KSlcbiAgICAgIC5kYXRhKHRoaXMuZGF0YSgpKVxuICAgICAgLnNwbGl0KHRoaXMuc3BsaXQoKSB8fCBmYWxzZSlcbiAgICAgIC5kcmF3KClcblxuICB9XG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM19zcGxhdCwgZDNfdXBkYXRlYWJsZSwgYWNjZXNzb3IsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCAnLi9kb21haW5fZXhwYW5kZWQuY3NzJ1xuXG5pbXBvcnQge3RhYnVsYXJfdGltZXNlcmllc30gZnJvbSAnLi90YWJ1bGFyX3RpbWVzZXJpZXMvaW5kZXgnXG5cbmV4cG9ydCBsZXQgYWxsYnVja2V0cyA9IFtdXG5leHBvcnQgY29uc3QgaG91cmJ1Y2tldHMgPSBkMy5yYW5nZSgwLDI0KS5tYXAoeCA9PiBTdHJpbmcoeCkubGVuZ3RoID4gMSA/IFN0cmluZyh4KSA6IFwiMFwiICsgeClcblxudmFyIG1pbnV0ZXMgPSBbMCwyMCw0MF1cbmV4cG9ydCBjb25zdCBidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkucmVkdWNlKChwLGMpID0+IHtcbiAgbWludXRlcy5tYXAoeCA9PiB7XG4gICAgcFtjICsgXCI6XCIgKyB4XSA9IDBcbiAgfSlcbiAgYWxsYnVja2V0cyA9IGFsbGJ1Y2tldHMuY29uY2F0KG1pbnV0ZXMubWFwKHogPT4gYyArIFwiOlwiICsgeikpXG4gIHJldHVybiBwXG59LHt9KVxuXG5cbmV4cG9ydCBjb25zdCBTVE9QV09SRFMgPSBbXCJ0aGF0XCIsXCJ0aGlzXCIsXCJ3aGF0XCIsXCJiZXN0XCIsXCJtb3N0XCIsXCJmcm9tXCIsXCJ5b3VyXCIsXCJoYXZlXCIsXCJmaXJzdFwiLFwid2lsbFwiLFwidGhhblwiLFwic2F5c1wiLFwibGlrZVwiLFwiaW50b1wiLFwiYWZ0ZXJcIixcIndpdGhcIl1cblxuZnVuY3Rpb24gcmF3VG9VcmwoZGF0YSkge1xuICByZXR1cm4gZGF0YS5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgcFtjLnVybF0gPSBwW2MudXJsXSB8fCBPYmplY3QuYXNzaWduKHt9LGJ1Y2tldHMpXG4gICAgICBwW2MudXJsXVtjLmhvdXJdID0gKHBbYy51cmxdW2MuaG91cl0gfHwgMCkgKyBjLmNvdW50XG4gICAgICByZXR1cm4gcFxuICAgIH0se30pXG59XG5cbmZ1bmN0aW9uIHVybFRvRHJhdyh1cmxzKSB7XG4gIHZhciBvYmogPSB7fVxuICBPYmplY3Qua2V5cyh1cmxzKS5tYXAoayA9PiB7XG4gICAgb2JqW2tdID0gaG91cmJ1Y2tldHMubWFwKGIgPT4gdXJsc1trXVtiXSB8fCAwKVxuICB9KVxuXG4gIHJldHVybiBkMy5lbnRyaWVzKG9iailcbiAgICAubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgeC51cmwgPSB4LmtleVxuICAgICAgeC50b3RhbCA9IGQzLnN1bSh4LnZhbHVlKVxuICAgICAgcmV0dXJuIHhcbiAgICB9KSBcbn1cblxuZnVuY3Rpb24gZHJhd1RvS2V5d29yZChkcmF3LHNwbGl0KSB7XG4gIGxldCBvYmogPSBkcmF3XG4gICAgLnJlZHVjZShmdW5jdGlvbihwLGMpe1xuICAgICAgYy5rZXkudG9Mb3dlckNhc2UoKS5zcGxpdChzcGxpdClbMV0uc3BsaXQoXCIvXCIpLnJldmVyc2UoKVswXS5yZXBsYWNlKFwiX1wiLFwiLVwiKS5zcGxpdChcIi1cIikubWFwKHggPT4ge1xuICAgICAgICB2YXIgdmFsdWVzID0gU1RPUFdPUkRTXG4gICAgICAgIGlmICh4Lm1hdGNoKC9cXGQrL2cpID09IG51bGwgJiYgdmFsdWVzLmluZGV4T2YoeCkgPT0gLTEgJiYgeC5pbmRleE9mKFwiLFwiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCI/XCIpID09IC0xICYmIHguaW5kZXhPZihcIi5cIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiOlwiKSA9PSAtMSAmJiBwYXJzZUludCh4KSAhPSB4ICYmIHgubGVuZ3RoID4gMykge1xuICAgICAgICAgIHBbeF0gPSBwW3hdIHx8IHt9XG4gICAgICAgICAgT2JqZWN0LmtleXMoYy52YWx1ZSkubWFwKHEgPT4geyBwW3hdW3FdID0gKHBbeF1bcV0gfHwgMCkgKyAoYy52YWx1ZVtxXSB8fCAwKSB9KVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gcFxuICAgIH0se30pIFxuXG4gIHJldHVybiBkMy5lbnRyaWVzKG9iailcbiAgICAubWFwKHggPT4ge1xuICAgICAgeC52YWx1ZXMgPSBPYmplY3Qua2V5cyh4LnZhbHVlKS5tYXAoeiA9PiB4LnZhbHVlW3pdIHx8IDApXG4gICAgICB4LnRvdGFsID0gZDMuc3VtKHgudmFsdWVzKVxuICAgICAgcmV0dXJuIHhcbiAgICB9KVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkb21haW5fZXhwYW5kZWQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRG9tYWluRXhwYW5kZWQodGFyZ2V0KVxufVxuXG5jbGFzcyBEb21haW5FeHBhbmRlZCBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wicmF3XCIsXCJkYXRhXCIsXCJ1cmxzXCIsXCJkb21haW5cIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgbGV0IHRkID0gdGhpcy5fdGFyZ2V0XG5cbiAgICBkM19jbGFzcyh0ZCxcImFjdGlvbi1oZWFkZXJcIilcbiAgICAgIC50ZXh0KFwiRXhwbG9yZSBhbmQgUmVmaW5lXCIpXG5cbiAgICBsZXQgdXJsRGF0YSA9IHJhd1RvVXJsKHRoaXMucmF3KCkpXG4gICAgbGV0IHRvX2RyYXcgPSB1cmxUb0RyYXcodXJsRGF0YSlcbiAgICBsZXQga3dfdG9fZHJhdyA9IGRyYXdUb0tleXdvcmQodG9fZHJhdyx0aGlzLmRvbWFpbigpKVxuXG4gICAgdGFidWxhcl90aW1lc2VyaWVzKGQzX2NsYXNzKHRkLFwidXJsLWRlcHRoXCIpKVxuICAgICAgLmxhYmVsKFwiVVJMXCIpXG4gICAgICAuZGF0YSh0b19kcmF3KVxuICAgICAgLnNwbGl0KHRoaXMuZG9tYWluKCkpXG4gICAgICAuZHJhdygpXG5cbiAgICB0YWJ1bGFyX3RpbWVzZXJpZXMoZDNfY2xhc3ModGQsXCJrdy1kZXB0aFwiKSlcbiAgICAgIC5sYWJlbChcIktleXdvcmRzXCIpXG4gICAgICAuZGF0YShrd190b19kcmF3KVxuICAgICAgLmRyYXcoKVxuICAgICAgICBcbiAgfVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfc3BsYXQsIGQzX3VwZGF0ZWFibGUsIGFjY2Vzc29yLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgJy4vdmVydGljYWxfb3B0aW9uLmNzcydcblxuXG5leHBvcnQgZnVuY3Rpb24gdmVydGljYWxfb3B0aW9uKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFZlcnRpY2FsT3B0aW9uKHRhcmdldClcbn1cblxuLy9be2tleSwgdmFsdWUsIHNlbGVjdGVkfSwuLi5dXG5cbmNsYXNzIFZlcnRpY2FsT3B0aW9uIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuX29wdGlvbnMgPSBbXVxuICAgIHRoaXMuX3dyYXBwZXJfY2xhc3MgPSBcInZlcnRpY2FsLW9wdGlvbnNcIlxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJvcHRpb25zXCIsXCJ3cmFwcGVyX2NsYXNzXCJdIH1cblxuICBkcmF3KCkge1xuICAgIHZhciBvcHRzID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LHRoaXMud3JhcHBlcl9jbGFzcygpLFwiZGl2XCIsdGhpcy5vcHRpb25zKCkpXG4gICAgICBcbiAgICAgZDNfc3BsYXQob3B0cyxcIi5zaG93LWJ1dHRvblwiLFwiYVwiLHRoaXMub3B0aW9ucygpLHggPT4geC5rZXkpXG4gICAgICAuY2xhc3NlZChcInNob3ctYnV0dG9uXCIsdHJ1ZSlcbiAgICAgIC5jbGFzc2VkKFwic2VsZWN0ZWRcIix4ID0+IHguc2VsZWN0ZWQpXG4gICAgICAudGV4dCh4ID0+IHgua2V5KVxuICAgICAgLm9uKFwiY2xpY2tcIix0aGlzLm9uKFwiY2xpY2tcIikgKSBcblxuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHtwcmVwRGF0YX0gZnJvbSAnLi4vZ2VuZXJpYy90aW1lc2VyaWVzJ1xuXG5pbXBvcnQgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQge2RvbWFpbl9leHBhbmRlZH0gZnJvbSAnY29tcG9uZW50J1xuaW1wb3J0IHtkb21haW5fYnVsbGV0fSBmcm9tICdjaGFydCdcblxuXG5leHBvcnQgY2xhc3MgRG9tYWluVmlldyBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKHRhcmdldClcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiLCBcIm9wdGlvbnNcIiwgXCJzb3J0XCIsIFwiYXNjZW5kaW5nXCJdIH1cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICB2YXIgX2V4cGxvcmUgPSB0aGlzLl90YXJnZXRcbiAgICAgICwgdGFicyA9IHRoaXMub3B0aW9ucygpXG4gICAgICAsIGRhdGEgPSB0aGlzLmRhdGEoKVxuICAgICAgLCBmaWx0ZXJlZCA9IHRhYnMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5zZWxlY3RlZH0pXG4gICAgICAsIHNlbGVjdGVkID0gZmlsdGVyZWQubGVuZ3RoID8gZmlsdGVyZWRbMF0gOiB0YWJzWzBdXG5cbiAgICBjb25zdCBoZWFkZXJzID0gW1xuICAgICAgICAgIHtrZXk6XCJrZXlcIix2YWx1ZTogc2VsZWN0ZWQua2V5LnJlcGxhY2UoXCJUb3AgXCIsXCJcIiksbG9ja2VkOnRydWUsd2lkdGg6XCIyMDBweFwifVxuICAgICAgICAsIHtrZXk6XCJzYW1wbGVfcGVyY2VudFwiLHZhbHVlOlwiU2VnbWVudFwiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAsIHtrZXk6XCJyZWFsX3BvcF9wZXJjZW50XCIsdmFsdWU6XCJCYXNlbGluZVwiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAsIHtrZXk6XCJyYXRpb1wiLHZhbHVlOlwiUmF0aW9cIixzZWxlY3RlZDpmYWxzZX1cbiAgICAgICAgLCB7a2V5OlwiaW1wb3J0YW5jZVwiLHZhbHVlOlwiSW1wb3J0YW5jZVwiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAsIHtrZXk6XCJ2YWx1ZVwiLHZhbHVlOlwiU2VnbWVudCB2ZXJzdXMgQmFzZWxpbmVcIixsb2NrZWQ6dHJ1ZX1cbiAgICAgIF0vLy5maWx0ZXIoKHgpID0+ICEhc2VsZWN0ZWQudmFsdWVzWzBdW3gua2V5XSlcblxuICAgIGNvbnN0IHNhbXBfbWF4ID0gZDMubWF4KHNlbGVjdGVkLnZhbHVlcyxmdW5jdGlvbih4KXtyZXR1cm4geC5zYW1wbGVfcGVyY2VudF9ub3JtfSlcbiAgICAgICwgcG9wX21heCA9IGQzLm1heChzZWxlY3RlZC52YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHgucG9wX3BlcmNlbnR9KVxuICAgICAgLCBtYXggPSBNYXRoLm1heChzYW1wX21heCxwb3BfbWF4KTtcblxuXG4gICAgY29uc3QgX2RlZmF1bHQgPSBcImltcG9ydGFuY2VcIlxuICAgIGNvbnN0IHMgPSB0aGlzLnNvcnQoKSBcbiAgICBjb25zdCBhc2MgPSB0aGlzLmFzY2VuZGluZygpIFxuXG5cbiAgICBjb25zdCBzZWxlY3RlZEhlYWRlciA9IGhlYWRlcnMuZmlsdGVyKHggPT4geC5rZXkgPT0gcylcbiAgICBjb25zdCBzb3J0YnkgPSBzZWxlY3RlZEhlYWRlci5sZW5ndGggPyBzZWxlY3RlZEhlYWRlclswXS5rZXkgOiBfZGVmYXVsdFxuXG5cblxuICAgIGhlYWRlcihfZXhwbG9yZSlcbiAgICAgIC50ZXh0KHNlbGVjdGVkLmtleSApXG4gICAgICAub3B0aW9ucyh0YWJzKVxuICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpIHsgdGhpcy5vbihcInNlbGVjdFwiKSh4KSB9LmJpbmQodGhpcykpXG4gICAgICAuZHJhdygpXG5cbiAgICBfZXhwbG9yZS5zZWxlY3RBbGwoXCIudmVuZG9yLWRvbWFpbnMtYmFyLWRlc2NcIikucmVtb3ZlKClcbiAgICBfZXhwbG9yZS5kYXR1bShkYXRhKVxuXG4gICAgdmFyIHQgPSB0YWJsZShfZXhwbG9yZSlcbiAgICAgIC50b3AoMTQwKVxuICAgICAgLmRhdGEoc2VsZWN0ZWQpXG4gICAgICAuaGVhZGVycyggaGVhZGVycylcbiAgICAgIC5zb3J0KHNvcnRieSxhc2MpXG4gICAgICAub24oXCJzb3J0XCIsIHRoaXMub24oXCJzb3J0XCIpKVxuICAgICAgLm9wdGlvbl90ZXh0KFwiJiM2NTI5MTtcIilcbiAgICAgIC5vbihcImV4cGFuZFwiLGZ1bmN0aW9uKGQsdGQpIHtcblxuICAgICAgICB2YXIgZGQgPSB0aGlzLnBhcmVudEVsZW1lbnQuX19kYXRhX18uZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmRvbWFpbiA9PSBkLmtleX0pXG4gICAgICAgIHZhciByb2xsZWQgPSBwcmVwRGF0YShkZClcbiAgICAgICAgXG4gICAgICAgIGRvbWFpbl9leHBhbmRlZCh0ZClcbiAgICAgICAgICAuZG9tYWluKGRkWzBdLmRvbWFpbilcbiAgICAgICAgICAucmF3KGRkKVxuICAgICAgICAgIC5kYXRhKHJvbGxlZClcbiAgICAgICAgICAudXJscyhkLnVybHMpXG4gICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5kcmF3KClcblxuICAgICAgfSlcbiAgICAgIC5oaWRkZW5fZmllbGRzKFtcInVybHNcIixcInBlcmNlbnRfdW5pcXVlXCIsXCJzYW1wbGVfcGVyY2VudF9ub3JtXCIsXCJwb3BfcGVyY2VudFwiLFwidGZfaWRmXCIsXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiXSlcbiAgICAgIC5yZW5kZXIoXCJyYXRpb1wiLGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgdGhpcy5pbm5lclRleHQgPSBNYXRoLnRydW5jKHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXy5yYXRpbyoxMDApLzEwMCArIFwieFwiXG4gICAgICB9KVxuICAgICAgLnJlbmRlcihcInZhbHVlXCIsZnVuY3Rpb24oZCkge1xuXG4gICAgICAgIGRvbWFpbl9idWxsZXQoZDMuc2VsZWN0KHRoaXMpKVxuICAgICAgICAgIC5tYXgobWF4KVxuICAgICAgICAgIC5kYXRhKHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXylcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgIH0pXG4gICAgICBcbiAgICB0LmRyYXcoKVxuICAgIFxuXG4gICAgcmV0dXJuIHRoaXNcblxuICB9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZG9tYWluX3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRG9tYWluVmlldyh0YXJnZXQpXG59XG5cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgYnV0dG9uX3JhZGlvIGZyb20gJy4uL2dlbmVyaWMvYnV0dG9uX3JhZGlvJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcbmltcG9ydCB7c2ltcGxlVGltZXNlcmllcywgc2ltcGxlQmFyfSBmcm9tICdjaGFydCdcblxuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5leHBvcnQgZnVuY3Rpb24gU2VnbWVudFZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNlZ21lbnRfdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTZWdtZW50Vmlldyh0YXJnZXQpXG59XG5cblNlZ21lbnRWaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIHNlZ21lbnRzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2VnbWVudHNcIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLnNlZ21lbnQtd3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwic2VnbWVudC13cmFwXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxNDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLHRoaXMudGFyZ2V0LnN0eWxlKFwid2lkdGhcIikpXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJmaXhlZFwiKVxuICAgICAgICAuc3R5bGUoXCJ6LWluZGV4XCIsXCIzMDBcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2YwZjRmN1wiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuc2VnbWVudC13cmFwLXNwYWNlclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwic2VnbWVudC13cmFwLXNwYWNlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLHdyYXAuc3R5bGUoXCJoZWlnaHRcIikpXG5cblxuICAgICAgaGVhZGVyKHdyYXApXG4gICAgICAgIC5idXR0b25zKFtcbiAgICAgICAgICAgIHtjbGFzczogXCJzYXZlZC1zZWFyY2hcIiwgaWNvbjogXCJmYS1mb2xkZXItb3Blbi1vIGZhXCIsIHRleHQ6IFwiT3BlbiBTYXZlZFwifVxuICAgICAgICAgICwge2NsYXNzOiBcIm5ldy1zYXZlZC1zZWFyY2hcIiwgaWNvbjogXCJmYS1ib29rbWFyayBmYVwiLCB0ZXh0OiBcIlNhdmVcIn1cbiAgICAgICAgICAsIHtjbGFzczogXCJjcmVhdGVcIiwgaWNvbjogXCJmYS1wbHVzLWNpcmNsZSBmYVwiLCB0ZXh0OiBcIk5ldyBTZWdtZW50XCJ9XG4gICAgICAgICAgLCB7Y2xhc3M6IFwibG9nb3V0XCIsIGljb246IFwiZmEtc2lnbi1vdXQgZmFcIiwgdGV4dDogXCJMb2dvdXRcIn1cbiAgICAgICAgXSlcbiAgICAgICAgLm9uKFwic2F2ZWQtc2VhcmNoLmNsaWNrXCIsIHRoaXMub24oXCJzYXZlZC1zZWFyY2guY2xpY2tcIikpXG4gICAgICAgIC5vbihcImxvZ291dC5jbGlja1wiLCBmdW5jdGlvbigpIHsgd2luZG93LmxvY2F0aW9uID0gXCIvbG9nb3V0XCIgfSlcbiAgICAgICAgLm9uKFwiY3JlYXRlLmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyB3aW5kb3cubG9jYXRpb24gPSBcIi9zZWdtZW50c1wiIH0pXG4gICAgICAgIC5vbihcIm5ldy1zYXZlZC1zZWFyY2guY2xpY2tcIiwgdGhpcy5vbihcIm5ldy1zYXZlZC1zZWFyY2guY2xpY2tcIikpXG4gICAgICAgIC50ZXh0KFwiU2VnbWVudFwiKS5kcmF3KCkgICAgICBcblxuXG4gICAgICB3cmFwLnNlbGVjdEFsbChcIi5oZWFkZXItYm9keVwiKVxuICAgICAgICAuY2xhc3NlZChcImhpZGRlblwiLCF0aGlzLl9pc19sb2FkaW5nKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiLTQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwibm9uZVwiKVxuICAgICAgICAuaHRtbChcIjxpbWcgc3JjPScvc3RhdGljL2ltZy9nZW5lcmFsL2xvZ28tc21hbGwuZ2lmJyBzdHlsZT0naGVpZ2h0OjE1cHgnLz4gbG9hZGluZy4uLlwiKVxuXG5cbiAgICAgIGlmICh0aGlzLl9kYXRhID09IGZhbHNlKSByZXR1cm5cblxuICAgICAgdmFyIGJvZHkgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuYm9keVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiYm9keVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImNsZWFyXCIsXCJib3RoXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleC1kaXJlY3Rpb25cIixcImNvbHVtblwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCItMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIzMHB4XCIpXG4gICAgICAgIFxuXG4gICAgICB2YXIgcm93MSA9IGQzX3VwZGF0ZWFibGUoYm9keSxcIi5yb3ctMVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicm93LTFcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsMSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4LWRpcmVjdGlvblwiLFwicm93XCIpXG5cbiAgICAgIHZhciByb3cyID0gZDNfdXBkYXRlYWJsZShib2R5LFwiLnJvdy0yXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJyb3ctMlwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIiwxKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcImZsZXgtZGlyZWN0aW9uXCIsXCJyb3dcIilcblxuXG4gICAgICB2YXIgaW5uZXIgPSBkM191cGRhdGVhYmxlKHJvdzEsXCIuYWN0aW9uLmlubmVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJpbm5lciBhY3Rpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMHB4XCIpXG5cbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMHB4XCIpXG5cbiAgICAgIHZhciBpbm5lcl9kZXNjID0gZDNfdXBkYXRlYWJsZShyb3cxLFwiLmFjdGlvbi5pbm5lci1kZXNjXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJpbm5lci1kZXNjIGFjdGlvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMHB4XCIpXG5cbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIwcHhcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyLFwiaDNcIixcImgzXCIpXG4gICAgICAgIC50ZXh0KFwiQ2hvb3NlIFNlZ21lbnRcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZTNlYmYwXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIsXCJkaXYuY29sb3JcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImNvbG9yXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiIzA4MWQ1OFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTEwcHhcIilcblxuXG5cbiAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICBzZWxlY3QoaW5uZXIpXG4gICAgICAgIC5vcHRpb25zKHRoaXMuX3NlZ21lbnRzKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZi5vbihcImNoYW5nZVwiKS5iaW5kKHRoaXMpKHgpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9hY3Rpb24udmFsdWUgfHwgMClcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICBcblxuXG5cbiAgICAgIHZhciBjYWwgPSBkM191cGRhdGVhYmxlKGlubmVyLFwiYS5mYS1jYWxlbmRhclwiLFwiYVwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzRweFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMzZweFwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlci1yYWRpdXNcIixcIjVweFwiKVxuICAgICAgICAuY2xhc3NlZChcImZhIGZhLWNhbGVuZGFyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCI1cHhcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGNhbHNlbC5ub2RlKClcbiAgICAgICAgfSlcblxuICAgICAgXG4gICAgICB2YXIgY2Fsc2VsID0gc2VsZWN0KGNhbClcbiAgICAgICAgLm9wdGlvbnMoW3tcImtleVwiOlwiVG9kYXlcIixcInZhbHVlXCI6MH0se1wia2V5XCI6XCJZZXN0ZXJkYXlcIixcInZhbHVlXCI6MX0se1wia2V5XCI6XCI3IGRheXMgYWdvXCIsXCJ2YWx1ZVwiOjd9XSlcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGYub24oXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIikuYmluZCh0aGlzKSh4LnZhbHVlKVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fYWN0aW9uX2RhdGUgfHwgMClcbiAgICAgICAgLmRyYXcoKVxuICAgICAgICAuX3NlbGVjdFxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIi4wMVwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCJub25lXCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwibm9uZVwiKVxuXG4gICAgICBcblxuICAgICAgdmFyIGlubmVyMiA9IGQzX3VwZGF0ZWFibGUocm93MixcIi5jb21wYXJpc29uLmlubmVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJpbm5lciBjb21wYXJpc29uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG5cbiAgICAgIHZhciBpbm5lcl9kZXNjMiA9IGQzX3VwZGF0ZWFibGUocm93MixcIi5jb21wYXJpc29uLWRlc2MuaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyIGNvbXBhcmlzb24tZGVzY1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMHB4XCIpXG5cbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuXG4gICAgICAvL2QzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcImgzXCIsXCJoM1wiKVxuICAgICAgLy8gIC50ZXh0KFwiKEZpbHRlcnMgYXBwbGllZCB0byB0aGlzIHNlZ21lbnQpXCIpXG4gICAgICAvLyAgLnN0eWxlKFwibWFyZ2luXCIsXCIxMHB4XCIpXG4gICAgICAvLyAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgIC8vICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgIC8vICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLy8gIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgIC8vICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcIi5iYXItd3JhcC10aXRsZVwiLFwiaDNcIikuY2xhc3NlZChcImJhci13cmFwLXRpdGxlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMSAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwicmlnaHRcIilcblxuXG4gICAgICAgIC50ZXh0KFwidmlld3NcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjMixcIi5iYXItd3JhcC10aXRsZVwiLFwiaDNcIikuY2xhc3NlZChcImJhci13cmFwLXRpdGxlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMSAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwicmlnaHRcIilcblxuXG5cbiAgICAgICAgLnRleHQoXCJ2aWV3c1wiKVxuXG5cblxuICAgICAgdmFyIGJhcl9zYW1wID0gZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiZGl2LmJhci13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItd3JhcFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjIgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCI4cHhcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiLmJhci13cmFwLXNwYWNlXCIsXCJkaXZcIikuY2xhc3NlZChcImJhci13cmFwLXNwYWNlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMSAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAudGV4dChkMy5mb3JtYXQoXCIsXCIpKHRoaXMuX2RhdGEudmlld3Muc2FtcGxlKSlcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCIuYmFyLXdyYXAtb3B0XCIsXCJkaXZcIikuY2xhc3NlZChcImJhci13cmFwLW9wdFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjIgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAvLy50ZXh0KFwiYXBwbHkgZmlsdGVycz9cIilcblxuXG5cbiAgICAgIHZhciB4c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAuZG9tYWluKFswLE1hdGgubWF4KHRoaXMuX2RhdGEudmlld3Muc2FtcGxlLCB0aGlzLl9kYXRhLnZpZXdzLnBvcHVsYXRpb24pXSlcbiAgICAgICAgLnJhbmdlKFswLGJhcl9zYW1wLnN0eWxlKFwid2lkdGhcIildKVxuXG5cbiAgICAgIHZhciBiYXJfcG9wID0gZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjMixcImRpdi5iYXItd3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiYmFyLXdyYXBcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiOHB4XCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjMixcIi5iYXItd3JhcC1zcGFjZVwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1zcGFjZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnRleHQoZDMuZm9ybWF0KFwiLFwiKSh0aGlzLl9kYXRhLnZpZXdzLnBvcHVsYXRpb24pKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCIuYmFyLXdyYXAtb3B0XCIsXCJkaXZcIikuY2xhc3NlZChcImJhci13cmFwLW9wdFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjIgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwicmlnaHRcIilcbiAgICAgICAgLmh0bWwoXCJhcHBseSBmaWx0ZXJzPyA8aW5wdXQgdHlwZT0nY2hlY2tib3gnPjwvaW5wdXQ+XCIpXG5cblxuXG4gICAgICBzaW1wbGVCYXIoYmFyX3NhbXAsdGhpcy5fZGF0YS52aWV3cy5zYW1wbGUseHNjYWxlLFwiIzA4MWQ1OFwiKVxuICAgICAgc2ltcGxlQmFyKGJhcl9wb3AsdGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uLHhzY2FsZSxcImdyZXlcIilcblxuXG5cblxuXG5cblxuXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyMixcImgzXCIsXCJoM1wiKVxuICAgICAgICAudGV4dChcIkNvbXBhcmUgQWdhaW5zdFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNlM2ViZjBcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcjIsXCJkaXYuY29sb3JcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImNvbG9yXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiZ3JleVwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTEwcHhcIilcblxuXG5cblxuXG5cblxuXG4gICAgICBzZWxlY3QoaW5uZXIyKVxuICAgICAgICAub3B0aW9ucyhbe1wia2V5XCI6XCJDdXJyZW50IFNlZ21lbnQgKHdpdGhvdXQgZmlsdGVycylcIixcInZhbHVlXCI6ZmFsc2V9XS5jb25jYXQodGhpcy5fc2VnbWVudHMpIClcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpe1xuXG4gICAgICAgICAgc2VsZi5vbihcImNvbXBhcmlzb24uY2hhbmdlXCIpLmJpbmQodGhpcykoeClcbiAgICAgICAgfSlcbiAgICAgICAgLnNlbGVjdGVkKHRoaXMuX2NvbXBhcmlzb24udmFsdWUgfHwgMClcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICB2YXIgY2FsMiA9IGQzX3VwZGF0ZWFibGUoaW5uZXIyLFwiYS5mYS1jYWxlbmRhclwiLFwiYVwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzRweFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMzZweFwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlci1yYWRpdXNcIixcIjVweFwiKVxuICAgICAgICAuY2xhc3NlZChcImZhIGZhLWNhbGVuZGFyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCI1cHhcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGNhbHNlbDIubm9kZSgpXG4gICAgICAgIH0pXG5cbiAgICAgIFxuICAgICAgdmFyIGNhbHNlbDIgPSBzZWxlY3QoY2FsMilcbiAgICAgICAgLm9wdGlvbnMoW3tcImtleVwiOlwiVG9kYXlcIixcInZhbHVlXCI6MH0se1wia2V5XCI6XCJZZXN0ZXJkYXlcIixcInZhbHVlXCI6MX0se1wia2V5XCI6XCI3IGRheXMgYWdvXCIsXCJ2YWx1ZVwiOjd9XSlcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGYub24oXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIpLmJpbmQodGhpcykoeC52YWx1ZSlcbiAgICAgICAgfSlcbiAgICAgICAgLnNlbGVjdGVkKHRoaXMuX2NvbXBhcmlzb25fZGF0ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG4gICAgICAgIC5fc2VsZWN0XG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiLjAxXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIm5vbmVcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCJub25lXCIpXG5cblxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBhY3Rpb25fZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFjdGlvbl9kYXRlXCIsdmFsKVxuICAgIH1cbiAgLCBhY3Rpb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25cIix2YWwpXG4gICAgfVxuICAsIGNvbXBhcmlzb25fZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNvbXBhcmlzb25fZGF0ZVwiLHZhbClcbiAgICB9XG5cbiAgLCBjb21wYXJpc29uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY29tcGFyaXNvblwiLHZhbClcbiAgICB9XG4gICwgaXNfbG9hZGluZzogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImlzX2xvYWRpbmdcIix2YWwpXG4gICAgfVxuXG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG5cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZGlmZl9iYXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRGlmZkJhcih0YXJnZXQpXG59XG5cbi8vIGRhdGEgZm9ybWF0OiBbe2tleSwgbm9ybWFsaXplZF9kaWZmfSwgLi4uIF1cblxuY2xhc3MgRGlmZkJhciB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuXG4gICAgdGhpcy5fa2V5X2FjY2Vzc29yID0gXCJrZXlcIlxuICAgIHRoaXMuX3ZhbHVlX2FjY2Vzc29yID0gXCJ2YWx1ZVwiXG4gICAgdGhpcy5fYmFyX2hlaWdodCA9IDIwXG4gICAgdGhpcy5fYmFyX3dpZHRoID0gMTUwXG4gIH0gXG5cbiAga2V5X2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImtleV9hY2Nlc3NvclwiLHZhbCkgfVxuICB2YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ2YWx1ZV9hY2Nlc3NvclwiLHZhbCkgfVxuICBiYXJfaGVpZ2h0KHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJhcl9oZWlnaHRcIix2YWwpIH1cbiAgYmFyX3dpZHRoKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJhcl93aWR0aFwiLHZhbCkgfVxuXG5cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG4gIHRpdGxlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9IFxuXG5cbiAgZHJhdygpIHtcblxuICAgIHZhciB3ID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIuZGlmZi13cmFwXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHtyZXR1cm4gMX0pXG4gICAgICAuY2xhc3NlZChcImRpZmYtd3JhcFwiLHRydWUpXG5cbiAgICBkM191cGRhdGVhYmxlKHcsXCJoM1wiLFwiaDNcIikudGV4dCh0aGlzLl90aXRsZSlcblxuICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh3LFwiLnN2Zy13cmFwXCIsXCJkaXZcIix0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5jbGFzc2VkKFwic3ZnLXdyYXBcIix0cnVlKVxuXG4gICAgdmFyIGsgPSB0aGlzLmtleV9hY2Nlc3NvcigpXG4gICAgICAsIHYgPSB0aGlzLnZhbHVlX2FjY2Vzc29yKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5iYXJfaGVpZ2h0KClcbiAgICAgICwgYmFyX3dpZHRoID0gdGhpcy5iYXJfd2lkdGgoKVxuXG4gICAgdmFyIGtleXMgPSB0aGlzLl9kYXRhLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4W2tdIH0pXG4gICAgICAsIG1heCA9IGQzLm1heCh0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbdl0gfSlcbiAgICAgICwgc2FtcG1heCA9IGQzLm1heCh0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIC14W3ZdIH0pXG5cbiAgICB2YXIgeHNhbXBzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgLmRvbWFpbihbMCxzYW1wbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLG1heF0pXG4gICAgICAgICAgLnJhbmdlKFswLGJhcl93aWR0aF0pXG4gICAgICAsIHlzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgLmRvbWFpbihbMCxrZXlzLmxlbmd0aF0pXG4gICAgICAgICAgLnJhbmdlKFswLGtleXMubGVuZ3RoKmhlaWdodF0pO1xuXG4gICAgdmFyIGNhbnZhcyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcInN2Z1wiLFwic3ZnXCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgIC5hdHRyKHtcIndpZHRoXCI6YmFyX3dpZHRoKjMsIFwiaGVpZ2h0XCI6IGtleXMubGVuZ3RoKmhlaWdodCArIDEwfSk7XG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCdib3R0b20nKVxuICAgICAgLnNjYWxlKHhzY2FsZSlcblxuICAgIHZhciB5QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeUF4aXNcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLnNjYWxlKHlzY2FsZSlcbiAgICAgIC50aWNrU2l6ZSgyKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oZCxpKXsgcmV0dXJuIGtleXNbaV07IH0pXG4gICAgICAudGlja1ZhbHVlcyhkMy5yYW5nZShrZXlzLmxlbmd0aCkpO1xuXG4gICAgdmFyIHlfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieSBheGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChiYXJfd2lkdGggKyBiYXJfd2lkdGgvMikgKyBcIiwxNSlcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3lheGlzJylcbiAgICAgIC5jYWxsKHlBeGlzKTtcblxuICAgIHlfeGlzLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInRleHQtYW5jaG9yOiBtaWRkbGU7XCIpXG5cbiAgICBcbiAgICB2YXIgY2hhcnQgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydCcsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnRcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aCoyKSArIFwiLDApXCIpXG4gICAgICAuYXR0cignaWQnLCdiYXJzJylcbiAgICBcbiAgICB2YXIgYmFycyA9IGQzX3NwbGF0KGNoYXJ0LFwiLnBvcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBvcC1iYXJcIilcbiAgICAgIC5hdHRyKCdoZWlnaHQnLGhlaWdodC00KVxuICAgICAgLmF0dHIoeyd4JzowLCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgOC41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJyMzODhlM2MnKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzY2FsZSh4W3ZdKSB9KVxuXG4gICAgdmFyIGNoYXJ0MiA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0MicsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnQyXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLDApXCIpXG4gICAgICAuYXR0cignaWQnLCdiYXJzJylcblxuXG4gICAgdmFyIHNhbXBiYXJzID0gZDNfc3BsYXQoY2hhcnQyLFwiLnNhbXAtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJzYW1wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTQpXG4gICAgICAuYXR0cih7J3gnOmZ1bmN0aW9uKHgpIHsgcmV0dXJuIGJhcl93aWR0aCAtIHhzYW1wc2NhbGUoLXhbdl0pfSwneSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHlzY2FsZShpKSArIDguNTsgfX0pXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCcjZDMyZjJmJylcbiAgICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4c2FtcHNjYWxlKC14W3ZdKSB9KVxuXG4gICAgeV94aXMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICBjaGFydC5leGl0KCkucmVtb3ZlKClcbiAgICBjaGFydDIuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICBiYXJzLmV4aXQoKS5yZW1vdmUoKVxuICAgIHNhbXBiYXJzLmV4aXQoKS5yZW1vdmUoKVxuXG5cbiAgICBcblxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb21wX2Jhcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBDb21wQmFyKHRhcmdldClcbn1cblxuLy8gZGF0YSBmb3JtYXQ6IFt7a2V5LCBub3JtYWxpemVkX2RpZmZ9LCAuLi4gXVxuXG5jbGFzcyBDb21wQmFyIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICB0aGlzLl9rZXlfYWNjZXNzb3IgPSBcImtleVwiXG4gICAgdGhpcy5fcG9wX3ZhbHVlX2FjY2Vzc29yID0gXCJ2YWx1ZVwiXG4gICAgdGhpcy5fc2FtcF92YWx1ZV9hY2Nlc3NvciA9IFwidmFsdWVcIlxuXG4gICAgdGhpcy5fYmFyX2hlaWdodCA9IDIwXG4gICAgdGhpcy5fYmFyX3dpZHRoID0gMzAwXG4gIH0gXG5cbiAga2V5X2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImtleV9hY2Nlc3NvclwiLHZhbCkgfVxuICBwb3BfdmFsdWVfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicG9wX3ZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIHNhbXBfdmFsdWVfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2FtcF92YWx1ZV9hY2Nlc3NvclwiLHZhbCkgfVxuXG4gIGJhcl9oZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX2hlaWdodFwiLHZhbCkgfVxuICBiYXJfd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX3dpZHRoXCIsdmFsKSB9XG5cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHcgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5jb21wLXdyYXBcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkge3JldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiY29tcC13cmFwXCIsdHJ1ZSlcblxuICAgIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKS50ZXh0KHRoaXMuX3RpdGxlKVxuXG4gICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHcsXCIuc3ZnLXdyYXBcIixcImRpdlwiLHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmNsYXNzZWQoXCJzdmctd3JhcFwiLHRydWUpXG5cbiAgICB2YXIgayA9IHRoaXMua2V5X2FjY2Vzc29yKClcbiAgICAgICwgcCA9IHRoaXMucG9wX3ZhbHVlX2FjY2Vzc29yKClcbiAgICAgICwgcyA9IHRoaXMuc2FtcF92YWx1ZV9hY2Nlc3NvcigpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuYmFyX2hlaWdodCgpXG4gICAgICAsIGJhcl93aWR0aCA9IHRoaXMuYmFyX3dpZHRoKClcblxuICAgIHZhciBrZXlzID0gdGhpcy5fZGF0YS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geFtrXSB9KVxuICAgICAgLCBtYXggPSBkMy5tYXgodGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiB4W3BdIH0pXG4gICAgICAsIHNhbXBtYXggPSBkMy5tYXgodGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiB4W3NdIH0pXG5cbiAgICB2YXIgeHNhbXBzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgLmRvbWFpbihbMCxzYW1wbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLG1heF0pXG4gICAgICAgICAgLnJhbmdlKFswLGJhcl93aWR0aF0pXG4gICAgICAsIHlzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgLmRvbWFpbihbMCxrZXlzLmxlbmd0aF0pXG4gICAgICAgICAgLnJhbmdlKFswLGtleXMubGVuZ3RoKmhlaWdodF0pO1xuXG4gICAgdmFyIGNhbnZhcyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcInN2Z1wiLFwic3ZnXCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgIC5hdHRyKHtcIndpZHRoXCI6YmFyX3dpZHRoK2Jhcl93aWR0aC8yLCBcImhlaWdodFwiOiBrZXlzLmxlbmd0aCpoZWlnaHQgKyAxMH0pO1xuXG4gICAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB4QXhpc1xuICAgICAgLm9yaWVudCgnYm90dG9tJylcbiAgICAgIC5zY2FsZSh4c2NhbGUpXG5cbiAgICB2YXIgeUF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHlBeGlzXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5zY2FsZSh5c2NhbGUpXG4gICAgICAudGlja1NpemUoMilcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKGQsaSl7IHJldHVybiBrZXlzW2ldOyB9KVxuICAgICAgLnRpY2tWYWx1ZXMoZDMucmFuZ2Uoa2V5cy5sZW5ndGgpKTtcblxuICAgIHZhciB5X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnknLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInkgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoLzIpICsgXCIsMTUpXCIpXG4gICAgICAuYXR0cignaWQnLCd5YXhpcycpXG4gICAgICAuY2FsbCh5QXhpcyk7XG5cbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG5cbiAgICBcbiAgICB2YXIgY2hhcnQgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydCcsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnRcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aC8yKSArIFwiLDApXCIpXG4gICAgICAuYXR0cignaWQnLCdiYXJzJylcbiAgICBcbiAgICB2YXIgYmFycyA9IGQzX3NwbGF0KGNoYXJ0LFwiLnBvcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBvcC1iYXJcIilcbiAgICAgIC5hdHRyKCdoZWlnaHQnLGhlaWdodC0yKVxuICAgICAgLmF0dHIoeyd4JzowLCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgNy41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJ2dyYXknKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzY2FsZSh4W3BdKSB9KVxuXG5cbiAgICB2YXIgc2FtcGJhcnMgPSBkM19zcGxhdChjaGFydCxcIi5zYW1wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwic2FtcC1iYXJcIilcbiAgICAgIC5hdHRyKCdoZWlnaHQnLGhlaWdodC0xMClcbiAgICAgIC5hdHRyKHsneCc6MCwneSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHlzY2FsZShpKSArIDExLjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnIzA4MWQ1OCcpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNhbXBzY2FsZSh4W3NdIHx8IDApIH0pXG5cbiAgICB5X3hpcy5leGl0KCkucmVtb3ZlKClcblxuICAgIGNoYXJ0LmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgYmFycy5leGl0KCkucmVtb3ZlKClcbiAgICBzYW1wYmFycy5leGl0KCkucmVtb3ZlKClcblxuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cbiIsImltcG9ydCBkaWZmX2JhciBmcm9tICcuLi8uLi9nZW5lcmljL2RpZmZfYmFyJ1xuaW1wb3J0IGNvbXBfYmFyIGZyb20gJy4uLy4uL2dlbmVyaWMvY29tcF9iYXInXG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3Q2F0ZWdvcnlEaWZmKHRhcmdldCxkYXRhKSB7XG5cbiAgZGlmZl9iYXIodGFyZ2V0KVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLnRpdGxlKFwiQ2F0ZWdvcnkgaW5kZXhpbmcgdmVyc3VzIGNvbXBcIilcbiAgICAudmFsdWVfYWNjZXNzb3IoXCJub3JtYWxpemVkX2RpZmZcIilcbiAgICAuZHJhdygpXG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdDYXRlZ29yeSh0YXJnZXQsZGF0YSkge1xuXG4gIGNvbXBfYmFyKHRhcmdldClcbiAgICAuZGF0YShkYXRhKVxuICAgIC50aXRsZShcIkNhdGVnb3JpZXMgdmlzaXRlZCBmb3IgZmlsdGVyZWQgdmVyc3VzIGFsbCB2aWV3c1wiKVxuICAgIC5wb3BfdmFsdWVfYWNjZXNzb3IoXCJwb3BcIilcbiAgICAuc2FtcF92YWx1ZV9hY2Nlc3NvcihcInNhbXBcIilcbiAgICAuZHJhdygpXG5cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcF9idWJibGUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQ29tcEJ1YmJsZSh0YXJnZXQpXG59XG5cbi8vIGRhdGEgZm9ybWF0OiBbe2tleSwgbm9ybWFsaXplZF9kaWZmfSwgLi4uIF1cblxuY2xhc3MgQ29tcEJ1YmJsZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuXG4gICAgdGhpcy5fa2V5X2FjY2Vzc29yID0gXCJrZXlcIlxuXG4gICAgdGhpcy5faGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9zcGFjZSA9IDE0XG4gICAgdGhpcy5fbWlkZGxlID0gMTgwXG4gICAgdGhpcy5fbGVnZW5kX3dpZHRoID0gODBcblxuICAgIHRoaXMuX2J1Y2tldHMgPSBbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geCo2MCB9KVxuICAgIHRoaXMuX3Jvd3MgPSBbXVxuXG5cbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG5cbiAgaGVpZ2h0KHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhlaWdodFwiLHZhbCkgfVxuICBzcGFjZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzcGFjZVwiLHZhbCkgfVxuICBtaWRkbGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibWlkZGxlXCIsdmFsKSB9XG4gIGJ1Y2tldHModmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYnVja2V0c1wiLHZhbCkgfVxuXG4gIHJvd3ModmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicm93c1wiLHZhbCkgfVxuICBhZnRlcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhZnRlclwiLHZhbCkgfVxuXG5cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cbiAgYnVpbGRTY2FsZXMoKSB7XG5cbiAgICB2YXIgcm93cyA9IHRoaXMucm93cygpXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKVxuXG4gICAgdGhpcy5feXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oWzAscm93cy5sZW5ndGhdKVxuICAgICAgLnJhbmdlKFswLHJvd3MubGVuZ3RoKmhlaWdodF0pO1xuXG4gICAgdGhpcy5feHNjYWxlID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCxidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSwoaGVpZ2h0K3NwYWNlKSkpO1xuXG4gICAgdGhpcy5feHNjYWxlcmV2ZXJzZSA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgLmRvbWFpbihidWNrZXRzLnJldmVyc2UoKSlcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLChoZWlnaHQrc3BhY2UpKSk7XG5cbiAgICB0aGlzLl9yc2NhbGUgPSBkMy5zY2FsZS5wb3coKVxuICAgICAgLmV4cG9uZW50KDAuNSlcbiAgICAgIC5kb21haW4oWzAsMV0pXG4gICAgICAucmFuZ2UoWy4zNSwxXSlcbiAgICBcbiAgICB0aGlzLl9vc2NhbGUgPSBkMy5zY2FsZS5xdWFudGl6ZSgpXG4gICAgICAuZG9tYWluKFstMSwxXSlcbiAgICAgIC5yYW5nZShbJyNmN2ZiZmYnLCcjZGVlYmY3JywnI2M2ZGJlZicsJyM5ZWNhZTEnLCcjNmJhZWQ2JywnIzQyOTJjNicsJyMyMTcxYjUnLCcjMDg1MTljJywnIzA4MzA2YiddKVxuICAgIFxuICB9XG5cbiAgZHJhd0xlZ2VuZCgpIHtcbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKSwgbWlkZGxlID0gdGhpcy5taWRkbGUoKSwgbGVnZW5kdHcgPSB0aGlzLl9sZWdlbmRfd2lkdGhcbiAgICAgICwgcnNjYWxlID0gdGhpcy5fcnNjYWxlLCBvc2NhbGUgPSB0aGlzLl9vc2NhbGU7XG5cbiAgICB2YXIgbGVnZW5kID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cubGVnZW5kJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZWdlbmRcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkqMittaWRkbGUtMzEwKSArIFwiLC0xMzApXCIpXG5cbiAgICB2YXIgc2l6ZSA9IGQzX3VwZGF0ZWFibGUobGVnZW5kLCdnLnNpemUnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNpemVcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoXCIgKyAobGVnZW5kdHcrMTApICsgXCIsMClcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZVwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZSBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHcpXG4gICAgICAuaHRtbChcIm1vcmUgYWN0aXZpdHlcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKSBcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lm1vcmUtYXJyb3dcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1vcmUtYXJyb3cgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsLWxlZ2VuZHR3LTEwKVxuICAgICAgLmh0bWwoXCImIzk2NjQ7XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIikgXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cblxuXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3NcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLmh0bWwoXCJsZXNzIGFjdGl2aXR5XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcblxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzcy1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcy1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcrMTApXG4gICAgICAuaHRtbChcIiYjOTY1NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuN2VtXCIpIFxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG4gICAgZDNfc3BsYXQoc2l6ZSxcImNpcmNsZVwiLFwiY2lyY2xlXCIsWzEsLjYsLjMsLjEsMF0pXG4gICAgICAuYXR0cihcInJcIixmdW5jdGlvbih4KSB7IHJldHVybiAoaGVpZ2h0LTIpLzIqcnNjYWxlKHgpIH0pXG4gICAgICAuYXR0cignY3gnLCBmdW5jdGlvbihkLGkpIHsgcmV0dXJuIChoZWlnaHQrNCkqaStoZWlnaHQvMn0pXG4gICAgICAuYXR0cignc3Ryb2tlJywgJ2dyZXknKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnbm9uZScpXG5cblxuICAgIFxuXG5cbiAgICB2YXIgc2l6ZSA9IGQzX3VwZGF0ZWFibGUobGVnZW5kLCdnLmltcG9ydGFuY2UnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImltcG9ydGFuY2VcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoXCIrIChsZWdlbmR0dysxMCkgK1wiLDI1KVwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlIGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dylcbiAgICAgIC5odG1sKFwibW9yZSBpbXBvcnRhbnRcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZS1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZS1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHctMTApXG4gICAgICAuaHRtbChcIiYjOTY2NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuN2VtXCIpIFxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3NcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLmh0bWwoXCJsZXNzIGltcG9ydGFudFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5sZXNzLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZXNzLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLChoZWlnaHQrNCkqNStsZWdlbmR0dysxMClcbiAgICAgIC5odG1sKFwiJiM5NjU0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cblxuICAgIGQzX3NwbGF0KHNpemUsXCJjaXJjbGVcIixcImNpcmNsZVwiLFsxLC43NSwuNSwuMjUsMF0pXG4gICAgICAuYXR0cihcInJcIixoZWlnaHQvMi0yKVxuICAgICAgLmF0dHIoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gb3NjYWxlKHgpIH0pXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIixmdW5jdGlvbih4KSB7IHJldHVybiByc2NhbGUoeC8yICsgLjIpIH0pXG4gICAgICAuYXR0cignY3gnLCBmdW5jdGlvbihkLGkpIHsgcmV0dXJuIChoZWlnaHQrNCkqaStoZWlnaHQvMiB9KVxuIFxuICB9XG5cbiAgZHJhd0F4ZXMoKSB7XG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1xuICAgICAgLCBidWNrZXRzID0gdGhpcy5idWNrZXRzKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5oZWlnaHQoKSwgc3BhY2UgPSB0aGlzLnNwYWNlKCksIG1pZGRsZSA9IHRoaXMubWlkZGxlKCksIGxlZ2VuZHR3ID0gdGhpcy5fbGVnZW5kX3dpZHRoXG4gICAgICAsIHJzY2FsZSA9IHRoaXMuX3JzY2FsZSwgb3NjYWxlID0gdGhpcy5fb3NjYWxlIFxuICAgICAgLCB4c2NhbGUgPSB0aGlzLl94c2NhbGUsIHlzY2FsZSA9IHRoaXMuX3lzY2FsZVxuICAgICAgLCB4c2NhbGVyZXZlcnNlID0gdGhpcy5feHNjYWxlcmV2ZXJzZVxuICAgICAgLCByb3dzID0gdGhpcy5fcm93c1xuXG4gICAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB4QXhpc1xuICAgICAgLm9yaWVudCgndG9wJylcbiAgICAgIC5zY2FsZSh4c2NhbGVyZXZlcnNlKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgaWYgKHggPT0gMzYwMCkgcmV0dXJuIFwiMSBob3VyXCJcbiAgICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgICBpZiAoeCA9PSA4NjQwMCkgcmV0dXJuIFwiMSBkYXlcIlxuICAgICAgICBpZiAoeCA+IDg2NDAwKSByZXR1cm4geC84NjQwMCArIFwiIGRheXNcIiBcblxuICAgICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgICAgfSlcblxuICAgIHZhciB4X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnguYmVmb3JlJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYmVmb3JlXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChoZWlnaHQgKyBzcGFjZSkrIFwiLC00KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneGF4aXMnKVxuICAgICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgICAgICAgXG4gICAgeF94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ5XCIsIC04KVxuICAgICAgLmF0dHIoXCJ4XCIsIC04KVxuICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSg0NSlcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwiZW5kXCIpXG5cbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2tcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHhfeGlzLFwidGV4dC50aXRsZVwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcbiAgICAgIC5hdHRyKFwieFwiLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLzIgLSBoZWlnaHQrc3BhY2UgKVxuICAgICAgLmF0dHIoXCJ5XCIsLTUzKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIix1bmRlZmluZWQpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgLnRleHQoXCJiZWZvcmUgYXJyaXZpbmdcIilcblxuXG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCd0b3AnKVxuICAgICAgLnNjYWxlKHhzY2FsZSlcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIGlmICh4ID09IDM2MDApIHJldHVybiBcIjEgaG91clwiXG4gICAgICAgIGlmICh4IDwgMzYwMCkgcmV0dXJuIHgvNjAgKyBcIiBtaW5zXCIgXG5cbiAgICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgICAgaWYgKHggPiA4NjQwMCkgcmV0dXJuIHgvODY0MDAgKyBcIiBkYXlzXCIgXG5cbiAgICAgICAgcmV0dXJuIHgvMzYwMCArIFwiIGhvdXJzXCJcbiAgICAgIH0pXG5cbiAgICB2YXIgeF94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy54LmFmdGVyJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYWZ0ZXJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpK21pZGRsZSkgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywneGF4aXMnKVxuICAgICAgLmNhbGwoeEF4aXMpO1xuICAgIFxuICAgIHhfeGlzLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAgIC5hdHRyKFwieVwiLCAtOClcbiAgICAgIC5hdHRyKFwieFwiLCA4KVxuICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSgtNDUpXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcInN0YXJ0XCIpXG5cbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2tcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHhfeGlzLFwidGV4dC50aXRsZVwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcbiAgICAgIC5hdHRyKFwieFwiLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLzIgIClcbiAgICAgIC5hdHRyKFwieVwiLC01MylcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsdW5kZWZpbmVkKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsIFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAgIC50ZXh0KFwiYWZ0ZXIgbGVhdmluZ1wiKVxuXG5cbiAgICB2YXIgeUF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHlBeGlzXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5zY2FsZSh5c2NhbGUpXG4gICAgICAudGlja1NpemUoMilcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKGQsaSl7IHJldHVybiByb3dzW2ldLmtleTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKHJvd3MubGVuZ3RoKSk7XG5cblxuICAgIFxuICAgIHZhciB5X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnknLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInkgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkrMCkgKyBcIiwxNSlcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3lheGlzJylcblxuXG4gICAgeV94aXNcbiAgICAgIC5jYWxsKHlBeGlzKTtcblxuICAgIHlfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgIC5hdHRyKFwieDJcIiwxOClcbiAgICAgIC5hdHRyKFwieDFcIiwyMilcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIixcIjBcIilcbiAgICAgIC5yZW1vdmUoKVxuXG5cbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJwYXRoXCIpXG4gICAgICAuYXR0cihcIngyXCIsMTgpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDE4LDApXCIpIFxuICAgICAgLy8uc3R5bGUoXCJzdHJva2VcIixcImJsYWNrXCIpXG5cblxuXG4gICAgICAvLy5yZW1vdmUoKVxuXG4gICAgXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGV4dC1hbmNob3I6IG1pZGRsZTsgZm9udC13ZWlnaHQ6Ym9sZDsgZmlsbDogIzMzM1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsbWlkZGxlLzIpXG5cblxuXG5cbiAgfVxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpLCBtaWRkbGUgPSB0aGlzLm1pZGRsZSgpLCBsZWdlbmR0dyA9IHRoaXMuX2xlZ2VuZF93aWR0aFxuICAgICAgLCByb3dzID0gdGhpcy5yb3dzKClcblxuICAgIHZhciBzdmcgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcInN2Z1wiLFwic3ZnXCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCItNXB4XCIpXG4gICAgICAuYXR0cih7J3dpZHRoJzpidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSoyK21pZGRsZSwnaGVpZ2h0Jzpyb3dzLmxlbmd0aCpoZWlnaHQgKyAxNjV9KVxuICAgICAgLmF0dHIoXCJ4bWxuc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpXG5cbiAgICB0aGlzLl9zdmcgPSBzdmdcblxuICAgIHRoaXMuX2NhbnZhcyA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLDE0MClcIilcblxuXG5cbiAgICB0aGlzLmJ1aWxkU2NhbGVzKClcbiAgICB0aGlzLmRyYXdMZWdlbmQoKVxuICAgIHRoaXMuZHJhd0F4ZXMoKVxuXG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1xuICAgICAgLCByc2NhbGUgPSB0aGlzLl9yc2NhbGUsIG9zY2FsZSA9IHRoaXMuX29zY2FsZSBcbiAgICAgICwgeHNjYWxlID0gdGhpcy5feHNjYWxlLCB5c2NhbGUgPSB0aGlzLl95c2NhbGVcbiAgICAgICwgeHNjYWxlcmV2ZXJzZSA9IHRoaXMuX3hzY2FsZXJldmVyc2VcbiAgICAgICwgcm93cyA9IHRoaXMucm93cygpXG5cblxuICAgIHZhciBjaGFydF9iZWZvcmUgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydC1iZWZvcmUnLCdnJyx0aGlzLnJvd3MoKSxmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0LWJlZm9yZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSArIFwiLDApXCIpXG4gICAgICAuYXR0cignaWQnLCdiYXJzJylcblxuXG4gICAgdmFyIHJvd3MgPSBkM19zcGxhdChjaGFydF9iZWZvcmUsXCIucm93XCIsXCJnXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicm93XCIpXG4gICAgICAuYXR0cih7J3RyYW5zZm9ybSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIFwidHJhbnNsYXRlKDAsXCIgKyAoeXNjYWxlKGkpICsgNy41KSArIFwiKVwiOyB9IH0pXG4gICAgICAuYXR0cih7J2xhYmVsJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gZC5rZXk7IH0gfSlcblxuICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYmFycyA9IGQzX3NwbGF0KHJvd3MsXCIucG9wLWJhclwiLFwiY2lyY2xlXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBvcC1iYXJcIilcbiAgICAgIC5hdHRyKCdjeScsKGhlaWdodC0yKS8yKVxuICAgICAgLmF0dHIoeydjeCc6ZnVuY3Rpb24oZCxpKSB7IHJldHVybiAteHNjYWxlKGQua2V5KX19KVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsXCIuOFwiKVxuICAgICAgLmF0dHIoXCJyXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gKGhlaWdodCkvMiAqIHJzY2FsZSh4Lm5vcm1fdGltZSkgfSkgXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gb3NjYWxlKHgucGVyY2VudF9kaWZmKSB9KVxuXG4gICAgdmFyIGNoYXJ0X2FmdGVyID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQtYWZ0ZXInLCdnJyx0aGlzLl9hZnRlcixmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0LWFmdGVyXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSttaWRkbGUpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgcm93cyA9IGQzX3NwbGF0KGNoYXJ0X2FmdGVyLFwiLnJvd1wiLFwiZ1wiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInJvd1wiKVxuICAgICAgLmF0dHIoeyd0cmFuc2Zvcm0nOmZ1bmN0aW9uKGQsaSl7IHJldHVybiBcInRyYW5zbGF0ZSgwLFwiICsgKHlzY2FsZShpKSArIDcuNSkgKyBcIilcIjsgfSB9KVxuICAgICAgLmF0dHIoeydsYWJlbCc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIGQua2V5OyB9IH0pXG5cbiAgICByb3dzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIGJhcnMgPSBkM19zcGxhdChyb3dzLFwiLnBvcC1iYXJcIixcImNpcmNsZVwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWVzIH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgICAuYXR0cignY3knLChoZWlnaHQtMikvMilcbiAgICAgIC5hdHRyKHsnY3gnOmZ1bmN0aW9uKGQsaSkgeyByZXR1cm4geHNjYWxlKGQua2V5KX19KVxuICAgICAgLmF0dHIoXCJyXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gKGhlaWdodC0yKS8yICogcnNjYWxlKHgubm9ybV90aW1lKSB9KVxuICAgICAgLnN0eWxlKFwiZmlsbFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG9zY2FsZSh4LnBlcmNlbnRfZGlmZikgfSlcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLFwiLjhcIilcblxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwiaW1wb3J0IHtub29wLCBkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzdHJlYW1fcGxvdCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTdHJlYW1QbG90KHRhcmdldClcbn1cblxuZnVuY3Rpb24gZHJhd0F4aXModGFyZ2V0LHNjYWxlLHRleHQsd2lkdGgpIHtcbiAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgeEF4aXNcbiAgICAub3JpZW50KCd0b3AnKVxuICAgIC5zY2FsZShzY2FsZSlcbiAgICAudGlja0Zvcm1hdChmdW5jdGlvbih4KSB7IFxuICAgICAgaWYgKHggPT0gMzYwMCkgcmV0dXJuIFwiMSBob3VyXCJcbiAgICAgIGlmICh4IDwgMzYwMCkgcmV0dXJuIHgvNjAgKyBcIiBtaW5zXCIgXG5cbiAgICAgIGlmICh4ID09IDg2NDAwKSByZXR1cm4gXCIxIGRheVwiXG4gICAgICBpZiAoeCA+IDg2NDAwKSByZXR1cm4geC84NjQwMCArIFwiIGRheXNcIiBcblxuICAgICAgcmV0dXJuIHgvMzYwMCArIFwiIGhvdXJzXCJcbiAgICB9KVxuXG4gIHZhciB4X3hpcyA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LCdnLnguYmVmb3JlJywnZycpXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwieCBheGlzIGJlZm9yZVwiKVxuICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsLTUpXCIpXG4gICAgLmF0dHIoJ2lkJywneGF4aXMnKVxuICAgIC5jYWxsKHhBeGlzKTtcblxuICAgICAgICBcbiAgeF94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCAtMjUpXG4gICAgLmF0dHIoXCJ4XCIsIDE1KVxuICAgIC5hdHRyKFwiZHlcIiwgXCIuMzVlbVwiKVxuICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKDQ1KVwiKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwiZW5kXCIpXG5cbiAgeF94aXMuc2VsZWN0QWxsKFwibGluZVwiKVxuICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFja1wiKVxuXG4gIHhfeGlzLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2s7IGRpc3BsYXk6aW5oZXJpdFwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoeF94aXMsXCJ0ZXh0LnRpdGxlXCIsXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcbiAgICAuYXR0cihcInhcIix3aWR0aC8yKVxuICAgIC5hdHRyKFwieVwiLC00NilcbiAgICAuYXR0cihcInRyYW5zZm9ybVwiLHVuZGVmaW5lZClcbiAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsIFwidXBwZXJjYXNlXCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXG4gICAgLnRleHQodGV4dCArIFwiIFwiKVxuXG4gIHJldHVybiB4X3hpc1xuXG59XG5cblxuY2xhc3MgU3RyZWFtUGxvdCB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuX29uID0ge31cbiAgICB0aGlzLl9idWNrZXRzID0gWzAsMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geCo2MCB9KVxuXG4gICAgdGhpcy5fd2lkdGggPSAzNzBcbiAgICB0aGlzLl9oZWlnaHQgPSAyNTBcbiAgICB0aGlzLl9taWRkbGUgPSAxODBcbiAgICB0aGlzLl9jb2xvciA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgLnJhbmdlKFxuWycjOTk5JywnI2FhYScsJyNiYmInLCcjY2NjJywnI2RkZCcsJyNkZWViZjcnLCcjYzZkYmVmJywnIzllY2FlMScsJyM2YmFlZDYnLCcjNDI5MmM2JywnIzIxNzFiNScsJ3JnYmEoMzMsIDExMywgMTgxLC45KScsJ3JnYmEoOCwgODEsIDE1NiwuOTEpJywnIzA4NTE5YycsJ3JnYmEoOCwgNDgsIDEwNywuOSknLCcjMDgzMDZiJ10ucmV2ZXJzZSgpKVxuXG4gIH0gXG5cbiAga2V5X2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImtleV9hY2Nlc3NvclwiLHZhbCkgfVxuICB2YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ2YWx1ZV9hY2Nlc3NvclwiLHZhbCkgfVxuICBoZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVpZ2h0XCIsdmFsKSB9XG4gIHdpZHRoKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIndpZHRoXCIsdmFsKSB9XG4gIG1pZGRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJtaWRkbGVcIix2YWwpIH1cbiAgc2tpcF9taWRkbGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2tpcF9taWRkbGVcIix2YWwpIH1cblxuXG5cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG4gIHRpdGxlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9IFxuXG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YVxuICAgICAgLCBvcmRlciA9IGRhdGEub3JkZXJcbiAgICAgICwgYnVja2V0cyA9IHRoaXMuX2J1Y2tldHNcbiAgICAgICwgYmVmb3JlX3N0YWNrZWQgPSBkYXRhLmJlZm9yZV9zdGFja2VkXG4gICAgICAsIGFmdGVyX3N0YWNrZWQgPSBkYXRhLmFmdGVyX3N0YWNrZWRcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5faGVpZ2h0XG4gICAgICAsIHdpZHRoID0gdGhpcy5fd2lkdGhcbiAgICAgICwgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0XG4gICAgICAsIGNvbG9yID0gdGhpcy5fY29sb3JcbiAgICAgICwgc2VsZiA9IHRoaXNcblxuICAgIGNvbG9yLmRvbWFpbihvcmRlcilcblxuICAgIHZhciB5ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5yYW5nZShbaGVpZ2h0LDBdKVxuICAgICAgLmRvbWFpbihbMCxkMy5tYXgoYmVmb3JlX3N0YWNrZWQsIGZ1bmN0aW9uKGxheWVyKSB7IHJldHVybiBkMy5tYXgobGF5ZXIsZnVuY3Rpb24oZCkge3JldHVybiBkLnkwICsgZC55IH0pfSldKVxuICBcbiAgICB2YXIgeCA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgLmRvbWFpbihidWNrZXRzKVxuICAgICAgLnJhbmdlKGQzLnJhbmdlKDAsd2lkdGgrMTAsd2lkdGgvKGJ1Y2tldHMubGVuZ3RoLTEpKSlcbiAgXG4gICAgdmFyIHhyZXZlcnNlID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKCkpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCx3aWR0aCsxMCx3aWR0aC8oYnVja2V0cy5sZW5ndGgtMSkpKVxuXG4gICAgdGhpcy5fYmVmb3JlX3NjYWxlID0geHJldmVyc2VcbiAgICB0aGlzLl9hZnRlcl9zY2FsZSA9IHhcbiAgXG4gICAgdmFyIGJhcmVhID0gZDMuc3ZnLmFyZWEoKVxuICAgICAgLmludGVycG9sYXRlKFwiemVyb1wiKVxuICAgICAgLngoZnVuY3Rpb24oZCkgeyByZXR1cm4geHJldmVyc2UoZC54KTsgfSlcbiAgICAgIC55MChmdW5jdGlvbihkKSB7IHJldHVybiB5KGQueTApOyB9KVxuICAgICAgLnkxKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCArIGQueSk7IH0pO1xuICBcbiAgICB2YXIgYWFyZWEgPSBkMy5zdmcuYXJlYSgpXG4gICAgICAuaW50ZXJwb2xhdGUoXCJsaW5lYXJcIilcbiAgICAgIC54KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoZC54KTsgfSlcbiAgICAgIC55MChmdW5jdGlvbihkKSB7IHJldHVybiB5KGQueTApOyB9KVxuICAgICAgLnkxKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCArIGQueSk7IH0pO1xuICBcbiAgXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwic3ZnXCIsXCJzdmdcIilcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgqMit0aGlzLl9taWRkbGUpXG4gICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQgKyAxMDApO1xuXG4gICAgdGhpcy5fc3ZnID0gc3ZnXG4gIFxuICAgIHZhciBiZWZvcmUgPSBkM191cGRhdGVhYmxlKHN2ZyxcIi5iZWZvcmUtY2FudmFzXCIsXCJnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJiZWZvcmUtY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgtMSw2MClcIilcblxuICAgIGZ1bmN0aW9uIGhvdmVyQ2F0ZWdvcnkoY2F0LHRpbWUpIHtcbiAgICAgIGlmIChjYXQgPT09IGZhbHNlKSB7XG4gICAgICAgIHNlbGYub24oXCJjYXRlZ29yeS5ob3ZlclwiKShmYWxzZSlcbiAgICAgIH1cbiAgICAgIGFwYXRocy5zdHlsZShcIm9wYWNpdHlcIixcIi41XCIpXG4gICAgICBicGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsXCIuNVwiKVxuICAgICAgYXBhdGhzLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IGNhdCkuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuICAgICAgYnBhdGhzLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IGNhdCkuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuICAgICAgZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcblxuICAgICAgZDNfdXBkYXRlYWJsZShtaWRkbGUsXCJ0ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzMzM1wiKVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIuNjVcIilcbiAgICAgICAgLnRleHQoY2F0KVxuXG4gICAgICB2YXIgbXdyYXAgPSBkM191cGRhdGVhYmxlKG1pZGRsZSxcImdcIixcImdcIilcblxuICAgICAgc2VsZi5vbihcImNhdGVnb3J5LmhvdmVyXCIpLmJpbmQobXdyYXAubm9kZSgpKShjYXQsdGltZSlcbiAgICB9XG4gIFxuICAgIHZhciBiID0gZDNfdXBkYXRlYWJsZShiZWZvcmUsXCJnXCIsXCJnXCIpXG5cbiAgICBmdW5jdGlvbiBtT3Zlcih4KSB7XG4gICAgICBob3ZlckNhdGVnb3J5LmJpbmQodGhpcykoeFswXS5rZXkpXG4gICAgfVxuICAgIGZ1bmN0aW9uIG1PdXQoeCkge1xuICAgICAgaG92ZXJDYXRlZ29yeS5iaW5kKHRoaXMpKGZhbHNlKVxuICAgICAgYXBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIGJwYXRocy5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgfVxuICAgIGZ1bmN0aW9uIGNsaWNrKHgpIHtcbiAgICAgICAgdmFyIGJvb2wgPSBhcGF0aHMub24oXCJtb3VzZW92ZXJcIikgPT0gbU92ZXJcblxuICAgICAgICBhcGF0aHMub24oXCJtb3VzZW92ZXJcIixib29sID8gbm9vcDogbU92ZXIpXG4gICAgICAgIGFwYXRocy5vbihcIm1vdXNlb3V0XCIsYm9vbCA/IG5vb3A6IG1PdXQpXG4gICAgICAgIGJwYXRocy5vbihcIm1vdXNlb3ZlclwiLGJvb2wgPyBub29wOiBtT3ZlcilcbiAgICAgICAgYnBhdGhzLm9uKFwibW91c2VvdXRcIixib29sID8gbm9vcDogbU91dClcblxuICAgIH1cblxuICAgIHZhciBicGF0aHMgPSBkM19zcGxhdChiLFwicGF0aFwiLFwicGF0aFwiLCBiZWZvcmVfc3RhY2tlZCxmdW5jdGlvbih4LGkpIHsgcmV0dXJuIHhbMF0ua2V5fSlcbiAgICAgIC5hdHRyKFwiZFwiLCBiYXJlYSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbih4LGkpIHsgcmV0dXJuIGNvbG9yKHhbMF0ua2V5KTsgfSlcbiAgICAgIC5vbihcIm1vdXNlb3ZlclwiLG1PdmVyKVxuICAgICAgLm9uKFwibW91c2VvdXRcIixtT3V0KVxuICAgICAgLm9uKFwiY2xpY2tcIixjbGljaylcblxuICAgIGJwYXRocy5leGl0KCkucmVtb3ZlKClcblxuICAgIHZhciBicmVjdCA9IGQzX3NwbGF0KGIsXCJyZWN0XCIsXCJyZWN0XCIsYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKSwoeCxpKSA9PiBpKVxuICAgICAgLmF0dHIoXCJ4XCIseiA9PiB4cmV2ZXJzZSh6KSlcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIixoZWlnaHQpXG4gICAgICAuYXR0cihcInlcIiwwKVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsXCIwXCIpXG5cblxuXG4gICAgICBcblxuICAgIHZhciBtaWRkbGUgPSBkM191cGRhdGVhYmxlKHN2ZyxcIi5taWRkbGUtY2FudmFzXCIsXCJnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtaWRkbGUtY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKFwiICsgKHdpZHRoICsgdGhpcy5fbWlkZGxlLzIpICsgXCIsNjApXCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsdGhpcy5fc2tpcF9taWRkbGUgPyBcIm5vbmVcIjogXCJpbmhlcml0XCIpXG4gIFxuICBcbiAgXG4gICAgdmFyIGFmdGVyID0gZDNfdXBkYXRlYWJsZShzdmcsXCIuYWZ0ZXItY2FudmFzXCIsXCJnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJhZnRlci1jYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKHdpZHRoICsgdGhpcy5fbWlkZGxlKSArIFwiLDYwKVwiKVxuXG4gICAgdmFyIGEgPSBkM191cGRhdGVhYmxlKGFmdGVyLFwiZ1wiLFwiZ1wiKVxuXG4gICAgXG4gIFxuICAgIHZhciBhcGF0aHMgPSBkM19zcGxhdChhLFwicGF0aFwiLFwicGF0aFwiLGFmdGVyX3N0YWNrZWQsZnVuY3Rpb24oeCxpKSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuYXR0cihcImRcIiwgYWFyZWEpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbMF0ua2V5fSlcbiAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBjb2xvcih4WzBdLmtleSk7IH0pXG4gICAgICAub24oXCJtb3VzZW92ZXJcIixtT3ZlcilcbiAgICAgIC5vbihcIm1vdXNlb3V0XCIsbU91dClcbiAgICAgIC5vbihcImNsaWNrXCIsY2xpY2spXG5cblxuICAgIGFwYXRocy5leGl0KCkucmVtb3ZlKClcblxuICAgIHZhciBfeF94aXMgPSBkcmF3QXhpcyhiZWZvcmUseHJldmVyc2UsXCJiZWZvcmUgYXJyaXZpbmdcIix3aWR0aClcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpLmZpbHRlcihmdW5jdGlvbih5KXsgcmV0dXJuIHkgPT0gMCB9KS5yZW1vdmUoKVxuXG4gICAgdmFyIF94X3hpcyA9IGRyYXdBeGlzKGFmdGVyLHgsXCJhZnRlciBsZWF2aW5nXCIsd2lkdGgpXG5cbiAgICBfeF94aXMuc2VsZWN0QWxsKFwidGV4dDpub3QoLnRpdGxlKVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoLTQ1KVwiKVxuICAgICAgLmF0dHIoXCJ4XCIsMjApXG4gICAgICAuYXR0cihcInlcIiwtMjUpXG5cbiAgICBfeF94aXMuc2VsZWN0QWxsKFwidGV4dFwiKS5maWx0ZXIoZnVuY3Rpb24oeSl7IHJldHVybiB5ID09IDAgfSkucmVtb3ZlKClcblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBvbihhY3Rpb24sZm4pIHtcbiAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwiaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICdjaGFydCdcbmltcG9ydCB7ZDNfY2xhc3MsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuXG5pbXBvcnQgY29tcF9idWJibGUgZnJvbSAnLi4vLi4vZ2VuZXJpYy9jb21wX2J1YmJsZSdcbmltcG9ydCBzdHJlYW1fcGxvdCBmcm9tICcuLi8uLi9nZW5lcmljL3N0cmVhbV9wbG90J1xuXG5mdW5jdGlvbiBidWlsZFN0cmVhbURhdGEoZGF0YSxidWNrZXRzKSB7XG5cbiAgdmFyIHVuaXRzX2luX2J1Y2tldCA9IGJ1Y2tldHMubWFwKGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geCAtICh4W2ktMV18fCAwKSB9KVxuXG4gIHZhciBzdGFja2FibGUgPSBkYXRhLm1hcChmdW5jdGlvbihkKSB7XG4gICAgdmFyIHZhbHVlbWFwID0gZC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMudmFsdWVzOyByZXR1cm4gcCB9LHt9KVxuICAgIHZhciBwZXJjbWFwID0gZC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMucGVyY2VudDsgcmV0dXJuIHAgfSx7fSlcblxuICAgIHZhciB2bWFwID0gZC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMubm9ybV9jYXQ7IHJldHVybiBwIH0se30pXG5cblxuICAgIHZhciBub3JtYWxpemVkX3ZhbHVlcyA9IGJ1Y2tldHMubWFwKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgaWYgKHggPT0gMCkgcmV0dXJuIHtrZXk6IGQua2V5LCB4OiBwYXJzZUludCh4KSwgeTogKHZtYXBbXCI2MDBcIl18fDApLCB2YWx1ZXM6ICh2YWx1ZW1hcFtcIjYwMFwiXXx8MCksIHBlcmNlbnQ6IChwZXJjbWFwW1wiNjAwXCJdfHwwKX1cbiAgICAgIHJldHVybiB7IGtleTogZC5rZXksIHg6IHBhcnNlSW50KHgpLCB5OiAodm1hcFt4XSB8fCAwKSwgdmFsdWVzOiAodmFsdWVtYXBbeF0gfHwgMCksIHBlcmNlbnQ6IChwZXJjbWFwW3hdIHx8IDApIH1cbiAgICB9KVxuXG5cbiAgICByZXR1cm4gbm9ybWFsaXplZF92YWx1ZXNcbiAgICAvL3JldHVybiBlMi5jb25jYXQobm9ybWFsaXplZF92YWx1ZXMpLy8uY29uY2F0KGV4dHJhKVxuICB9KVxuXG5cbiAgc3RhY2thYmxlID0gc3RhY2thYmxlLnNvcnQoKHAsYykgPT4gcFswXS55IC0gY1swXS55KS5yZXZlcnNlKCkuc2xpY2UoMCwxMilcblxuICByZXR1cm4gc3RhY2thYmxlXG5cbn1cblxuZnVuY3Rpb24gc3RyZWFtRGF0YShiZWZvcmUsYWZ0ZXIsYnVja2V0cykge1xuICB2YXIgc3RhY2thYmxlID0gYnVpbGRTdHJlYW1EYXRhKGJlZm9yZSxidWNrZXRzKVxuICB2YXIgc3RhY2sgPSBkMy5sYXlvdXQuc3RhY2soKS5vZmZzZXQoXCJ3aWdnbGVcIikub3JkZXIoXCJyZXZlcnNlXCIpXG4gIHZhciBiZWZvcmVfc3RhY2tlZCA9IHN0YWNrKHN0YWNrYWJsZSlcblxuICB2YXIgb3JkZXIgPSBiZWZvcmVfc3RhY2tlZC5tYXAoaXRlbSA9PiBpdGVtWzBdLmtleSlcblxuICB2YXIgc3RhY2thYmxlID0gYnVpbGRTdHJlYW1EYXRhKGFmdGVyLGJ1Y2tldHMpXG4gICAgLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBvcmRlci5pbmRleE9mKGNbMF0ua2V5KSAtIG9yZGVyLmluZGV4T2YocFswXS5rZXkpIH0pXG5cbiAgc3RhY2thYmxlID0gc3RhY2thYmxlLmZpbHRlcih4ID0+IG9yZGVyLmluZGV4T2YoeFswXS5rZXkpID09IC0xKS5jb25jYXQoc3RhY2thYmxlLmZpbHRlcih4ID0+IG9yZGVyLmluZGV4T2YoeFswXS5rZXkpID4gLTEpKVxuXG4gIHZhciBzdGFjayA9IGQzLmxheW91dC5zdGFjaygpLm9mZnNldChcIndpZ2dsZVwiKS5vcmRlcihcImRlZmF1bHRcIilcbiAgdmFyIGFmdGVyX3N0YWNrZWQgPSBzdGFjayhzdGFja2FibGUpXG5cbiAgcmV0dXJuIHtcbiAgICAgIG9yZGVyOiBvcmRlclxuICAgICwgYmVmb3JlX3N0YWNrZWQ6IGJlZm9yZV9zdGFja2VkXG4gICAgLCBhZnRlcl9zdGFja2VkOiBhZnRlcl9zdGFja2VkXG4gIH1cblxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3U3RyZWFtU2tpbm55KHRhcmdldCxiZWZvcmUsYWZ0ZXIsZmlsdGVyKSB7XG5cbiAgZnVuY3Rpb24gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsYWNjZXNzb3IpIHtcbiAgICB2YXIgYnZvbHVtZSA9IHt9LCBhdm9sdW1lID0ge31cbiAgXG4gICAgdHJ5IHsgdmFyIGJ2b2x1bWUgPSBiWzBdLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLnhdID0gYWNjZXNzb3IoYyk7IHJldHVybiBwIH0se30pIH0gY2F0Y2goZSkge31cbiAgICB0cnkgeyB2YXIgYXZvbHVtZSA9IGFbMF0ucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2MueF0gPSBhY2Nlc3NvcihjKTsgcmV0dXJuIHAgfSx7fSkgfSBjYXRjaChlKSB7fVxuICBcbiAgICB2YXIgdm9sdW1lID0gYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKS5tYXAoeCA9PiBidm9sdW1lW3hdIHx8IDApLmNvbmNhdChidWNrZXRzLm1hcCh4ID0+IGF2b2x1bWVbeF0gfHwgMCkpXG4gIFxuICAgIHJldHVybiB2b2x1bWVcbiAgfVxuXG4gIHZhciBidWNrZXRzID0gWzAsMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geCo2MCB9KVxuXG4gIHZhciBkYXRhID0gc3RyZWFtRGF0YShiZWZvcmUsYWZ0ZXIsYnVja2V0cylcbiAgICAsIGJlZm9yZV9zdGFja2VkID0gZGF0YS5iZWZvcmVfc3RhY2tlZFxuICAgICwgYWZ0ZXJfc3RhY2tlZCA9IGRhdGEuYWZ0ZXJfc3RhY2tlZFxuXG4gIHZhciBiZWZvcmUgPSBkM19jbGFzcyh0YXJnZXQsXCJiZWZvcmUtc3RyZWFtXCIpXG5cblxuICB2YXIgaW5uZXIgPSBkM191cGRhdGVhYmxlKGJlZm9yZSxcIi5pbm5lclwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJpbm5lclwiLHRydWUpXG5cblxuICB2YXIgc3RyZWFtID0gc3RyZWFtX3Bsb3QoaW5uZXIpXG4gICAgLndpZHRoKDM0MSlcbiAgICAubWlkZGxlKDApXG4gICAgLnNraXBfbWlkZGxlKHRydWUpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAub24oXCJjYXRlZ29yeS5ob3ZlclwiLGZ1bmN0aW9uKHgsdGltZSkge1xuICAgICAgZmlsdGVyKHgpXG4gICAgICBpZiAoeCA9PT0gZmFsc2UpIHtcbiAgICAgICAgZDMuc2VsZWN0KFwiLmRldGFpbHMtd3JhcFwiKS5odG1sKFwiXCIpXG4gICAgICAgIHJldHVybiBcbiAgICAgIH1cbiAgICAgIHZhciBiID0gZGF0YS5iZWZvcmVfc3RhY2tlZC5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSB4KVxuICAgICAgdmFyIGEgPSBkYXRhLmFmdGVyX3N0YWNrZWQuZmlsdGVyKHkgPT4geVswXS5rZXkgPT0geClcblxuICAgICAgdmFyIHZvbHVtZSA9IGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMudmFsdWVzLmxlbmd0aCB9KVxuICAgICAgICAsIHBlcmNlbnQgPSBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxmdW5jdGlvbihjKSB7IHJldHVybiBjLnBlcmNlbnQgfSlcbiAgICAgICAgLCBpbXBvcnRhbmNlID0gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsZnVuY3Rpb24oYykgeyByZXR1cm4gYy55IH0pXG5cblxuICAgICAgdmFyIHdyYXAgPSBkMy5zZWxlY3QoXCIuZGV0YWlscy13cmFwXCIpXG4gICAgICAgICwgdGl0bGUgPSBkM191cGRhdGVhYmxlKHdyYXAsXCJ0ZXh0LmNhdC10aXRsZVwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLnRleHQoeClcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNhdC10aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcIm1pZGRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLDEyNSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLDEwKVxuICAgICAgICAsIHZ3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnZvbHVtZVwiLFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidm9sdW1lXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDE1LDMwKVwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodndyYXAsXCJ0ZXh0XCIsXCJ0ZXh0XCIpLnRleHQoXCJWaXNpdHM6IFwiICsgZDMuc3VtKHZvbHVtZSkgKVxuICAgICAgICAuYXR0cihcInN0eWxlXCIsXCJ0aXRsZVwiKVxuXG5cblxuXG4gICAgICByZXR1cm5cbiAgICB9KVxuICAgIC5kcmF3KClcblxuXG4gIHZhciBiZWZvcmVfYWdnID0gYmVmb3JlX3N0YWNrZWQucmVkdWNlKChvLHgpID0+IHsgcmV0dXJuIHgucmVkdWNlKChwLGMpID0+IHsgcFtjLnhdID0gKHBbYy54XSB8fCAwKSArIGMueTsgcmV0dXJuIHB9LG8pIH0se30pXG4gICAgLCBhZnRlcl9hZ2cgPSBhZnRlcl9zdGFja2VkLnJlZHVjZSgobyx4KSA9PiB7IHJldHVybiB4LnJlZHVjZSgocCxjKSA9PiB7IHBbYy54XSA9IChwW2MueF0gfHwgMCkgKyBjLnk7IHJldHVybiBwfSxvKSB9LHt9KVxuXG5cbiAgdmFyIGxvY2FsX2JlZm9yZSA9IE9iamVjdC5rZXlzKGJlZm9yZV9hZ2cpLnJlZHVjZSgobWluYXJyLGMpID0+IHtcbiAgICAgIGlmIChtaW5hcnJbMF0gPj0gYmVmb3JlX2FnZ1tjXSkgcmV0dXJuIFtiZWZvcmVfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG4gIHZhciBsb2NhbF9hZnRlciA9IE9iamVjdC5rZXlzKGFmdGVyX2FnZykucmVkdWNlKChtaW5hcnIsYykgPT4ge1xuICAgICAgaWYgKG1pbmFyclswXSA+PSBhZnRlcl9hZ2dbY10pIHJldHVybiBbYWZ0ZXJfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG5cbiAgdmFyIGJlZm9yZV9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYmVmb3JlKSldXG4gICAgLCBhZnRlcl9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYWZ0ZXIpKV1cblxuICB2YXIgc3ZnID0gc3RyZWFtXG4gICAgLl9zdmcuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIikuc3R5bGUoXCJkaXNwbGF5XCIsXCJibG9ja1wiKVxuXG5cbiAgdmFyIGJsaW5lID0gZDNfdXBkYXRlYWJsZShzdmcuc2VsZWN0QWxsKFwiLmJlZm9yZS1jYW52YXNcIiksXCJnLmxpbmUtd3JhcFwiLFwiZ1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImxpbmUtd3JhcFwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmxpbmUsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAuYXR0cihcInkxXCIsIDApXG4gICAgLmF0dHIoXCJ5MlwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcIngxXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcbiAgICAuYXR0cihcIngyXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGJsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCAyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpIC0gMTApXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgIC50ZXh0KFwiQ29uc2lkZXJhdGlvbiBTdGFnZVwiKVxuXG5cbiAgdmFyIGFsaW5lID0gZDNfdXBkYXRlYWJsZShzdmcuc2VsZWN0QWxsKFwiLmFmdGVyLWNhbnZhc1wiKSxcImcubGluZS13cmFwXCIsXCJnXCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwibGluZS13cmFwXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShhbGluZSxcImxpbmVcIixcImxpbmVcIilcbiAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAuYXR0cihcInkyXCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieDFcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSlcbiAgICAuYXR0cihcIngyXCIsIHN0cmVhbS5fYWZ0ZXJfc2NhbGUoYWZ0ZXJfbGluZSkpXG5cbiAgZDNfdXBkYXRlYWJsZShhbGluZSxcInRleHRcIixcInRleHRcIilcbiAgICAuYXR0cihcInlcIiwgMjApXG4gICAgLmF0dHIoXCJ4XCIsIHN0cmVhbS5fYWZ0ZXJfc2NhbGUoYWZ0ZXJfbGluZSkgKyAxMClcbiAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwic3RhcnRcIilcbiAgICAudGV4dChcIlZhbGlkYXRpb24gLyBSZXNlYXJjaFwiKVxuXG5cblxuICByZXR1cm4ge1xuICAgIFwiY29uc2lkZXJhdGlvblwiOiBcIlwiICsgYmVmb3JlX2xpbmUsXG4gICAgXCJ2YWxpZGF0aW9uXCI6IFwiLVwiICsgYWZ0ZXJfbGluZVxuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdTdHJlYW0odGFyZ2V0LGJlZm9yZSxhZnRlcikge1xuXG4gIGZ1bmN0aW9uIGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGFjY2Vzc29yKSB7XG4gICAgdmFyIGJ2b2x1bWUgPSB7fSwgYXZvbHVtZSA9IHt9XG4gIFxuICAgIHRyeSB7IHZhciBidm9sdW1lID0gYlswXS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy54XSA9IGFjY2Vzc29yKGMpOyByZXR1cm4gcCB9LHt9KSB9IGNhdGNoKGUpIHt9XG4gICAgdHJ5IHsgdmFyIGF2b2x1bWUgPSBhWzBdLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLnhdID0gYWNjZXNzb3IoYyk7IHJldHVybiBwIH0se30pIH0gY2F0Y2goZSkge31cbiAgXG4gICAgdmFyIHZvbHVtZSA9IGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKCkubWFwKHggPT4gYnZvbHVtZVt4XSB8fCAwKS5jb25jYXQoYnVja2V0cy5tYXAoeCA9PiBhdm9sdW1lW3hdIHx8IDApKVxuICBcbiAgICByZXR1cm4gdm9sdW1lXG4gIH1cblxuICB2YXIgYnVja2V0cyA9IFswLDEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcblxuICB2YXIgZGF0YSA9IHN0cmVhbURhdGEoYmVmb3JlLGFmdGVyLGJ1Y2tldHMpXG4gICAgLCBiZWZvcmVfc3RhY2tlZCA9IGRhdGEuYmVmb3JlX3N0YWNrZWRcbiAgICAsIGFmdGVyX3N0YWNrZWQgPSBkYXRhLmFmdGVyX3N0YWNrZWRcblxuICB2YXIgYmVmb3JlID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuYmVmb3JlLXN0cmVhbVwiLFwiZGl2XCIsZGF0YSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgIC5jbGFzc2VkKFwiYmVmb3JlLXN0cmVhbVwiLHRydWUpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIwcHhcIilcblxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcInJnYigyMjcsIDIzNSwgMjQwKVwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJDb25zaWRlcmF0aW9uIGFuZCBSZXNlYXJjaCBQaGFzZSBJZGVudGlmaWNhdGlvblwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG4gIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSlcblxuXG5cbiAgdmFyIHN0cmVhbSA9IHN0cmVhbV9wbG90KGlubmVyKVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLm9uKFwiY2F0ZWdvcnkuaG92ZXJcIixmdW5jdGlvbih4LHRpbWUpIHtcbiAgICAgIGNvbnNvbGUubG9nKHRpbWUpXG4gICAgICB2YXIgYiA9IGRhdGEuYmVmb3JlX3N0YWNrZWQuZmlsdGVyKHkgPT4geVswXS5rZXkgPT0geClcbiAgICAgIHZhciBhID0gZGF0YS5hZnRlcl9zdGFja2VkLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IHgpXG5cbiAgICAgIHZhciB2b2x1bWUgPSBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxmdW5jdGlvbihjKSB7IHJldHVybiBjLnZhbHVlcy5sZW5ndGggfSlcbiAgICAgICAgLCBwZXJjZW50ID0gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsZnVuY3Rpb24oYykgeyByZXR1cm4gYy5wZXJjZW50IH0pXG4gICAgICAgICwgaW1wb3J0YW5jZSA9IGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMueSB9KVxuXG5cbiAgICAgIHZhciB3cmFwID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICwgdndyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudm9sdW1lXCIsXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ2b2x1bWVcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDMwKVwiKVxuICAgICAgICAsIHB3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnBlcmNlbnRcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBlcmNlbnRcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDkwKVwiKVxuICAgICAgICAsIGl3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmltcG9ydGFuY2VcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcImltcG9ydGFuY2VcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDE1MClcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHZ3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiVmlzaXRzXCIpXG4gICAgICAgIC5hdHRyKFwic3R5bGVcIixcInRpdGxlXCIpXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKHZ3cmFwLHZvbHVtZSlcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgwLDIpXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShwd3JhcCxcInRleHRcIixcInRleHRcIikudGV4dChcIlNoYXJlIG9mIHRpbWVcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcblxuICAgICAgc2ltcGxlVGltZXNlcmllcyhwd3JhcCxwZXJjZW50KVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDAsMilcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGl3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiSW1wb3J0YW5jZVwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKGl3cmFwLGltcG9ydGFuY2UpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMCwyKVwiKVxuXG5cbiAgICAgIHJldHVyblxuICAgIH0pXG4gICAgLmRyYXcoKVxuXG4gIHZhciBiZWZvcmVfYWdnID0gYmVmb3JlX3N0YWNrZWQucmVkdWNlKChvLHgpID0+IHsgcmV0dXJuIHgucmVkdWNlKChwLGMpID0+IHsgcFtjLnhdID0gKHBbYy54XSB8fCAwKSArIGMueTsgcmV0dXJuIHB9LG8pIH0se30pXG4gICAgLCBhZnRlcl9hZ2cgPSBhZnRlcl9zdGFja2VkLnJlZHVjZSgobyx4KSA9PiB7IHJldHVybiB4LnJlZHVjZSgocCxjKSA9PiB7IHBbYy54XSA9IChwW2MueF0gfHwgMCkgKyBjLnk7IHJldHVybiBwfSxvKSB9LHt9KVxuXG5cbiAgdmFyIGxvY2FsX2JlZm9yZSA9IE9iamVjdC5rZXlzKGJlZm9yZV9hZ2cpLnJlZHVjZSgobWluYXJyLGMpID0+IHtcbiAgICAgIGlmIChtaW5hcnJbMF0gPj0gYmVmb3JlX2FnZ1tjXSkgcmV0dXJuIFtiZWZvcmVfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG4gIHZhciBsb2NhbF9hZnRlciA9IE9iamVjdC5rZXlzKGFmdGVyX2FnZykucmVkdWNlKChtaW5hcnIsYykgPT4ge1xuICAgICAgaWYgKG1pbmFyclswXSA+PSBhZnRlcl9hZ2dbY10pIHJldHVybiBbYWZ0ZXJfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG5cbiAgdmFyIGJlZm9yZV9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYmVmb3JlKSldXG4gICAgLCBhZnRlcl9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYWZ0ZXIpKV1cblxuICB2YXIgc3ZnID0gc3RyZWFtXG4gICAgLl9zdmcuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIikuc3R5bGUoXCJkaXNwbGF5XCIsXCJibG9ja1wiKVxuXG5cbiAgdmFyIGJsaW5lID0gZDNfdXBkYXRlYWJsZShzdmcuc2VsZWN0QWxsKFwiLmJlZm9yZS1jYW52YXNcIiksXCJnLmxpbmUtd3JhcFwiLFwiZ1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImxpbmUtd3JhcFwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmxpbmUsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAuYXR0cihcInkxXCIsIDApXG4gICAgLmF0dHIoXCJ5MlwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcIngxXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcbiAgICAuYXR0cihcIngyXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGJsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpICsgMTApXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcInN0YXJ0XCIpXG4gICAgLnRleHQoXCJDb25zaWRlcmF0aW9uIFN0YWdlXCIpXG5cblxuICB2YXIgYWxpbmUgPSBkM191cGRhdGVhYmxlKHN2Zy5zZWxlY3RBbGwoXCIuYWZ0ZXItY2FudmFzXCIpLFwiZy5saW5lLXdyYXBcIixcImdcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJsaW5lLXdyYXBcIilcblxuICBkM191cGRhdGVhYmxlKGFsaW5lLFwibGluZVwiLFwibGluZVwiKVxuICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgIC5hdHRyKFwieTJcIiwgc3RyZWFtLl9oZWlnaHQrMjApXG4gICAgLmF0dHIoXCJ4MVwiLCBzdHJlYW0uX2FmdGVyX3NjYWxlKGFmdGVyX2xpbmUpKVxuICAgIC5hdHRyKFwieDJcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGFsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSAtIDEwKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAudGV4dChcIlZhbGlkYXRpb24gLyBSZXNlYXJjaFwiKVxuXG5cblxuICByZXR1cm4ge1xuICAgIFwiY29uc2lkZXJhdGlvblwiOiBcIlwiICsgYmVmb3JlX2xpbmUsXG4gICAgXCJ2YWxpZGF0aW9uXCI6IFwiLVwiICsgYWZ0ZXJfbGluZVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3QmVmb3JlQW5kQWZ0ZXIodGFyZ2V0LGRhdGEpIHtcblxuICB2YXIgYmVmb3JlID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuYmVmb3JlXCIsXCJkaXZcIixkYXRhLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgLmNsYXNzZWQoXCJiZWZvcmVcIix0cnVlKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMHB4XCIpXG5cbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJyZ2IoMjI3LCAyMzUsIDI0MClcIilcblxuICBkM191cGRhdGVhYmxlKGJlZm9yZSxcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiQ2F0ZWdvcnkgYWN0aXZpdHkgYmVmb3JlIGFycml2aW5nIGFuZCBhZnRlciBsZWF2aW5nIHNpdGVcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzMzM1wiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIwcHhcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcblxuICB2YXIgaW5uZXIgPSBkM191cGRhdGVhYmxlKGJlZm9yZSxcIi5pbm5lclwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJpbm5lclwiLHRydWUpXG4gICAgLnN0eWxlKFwicG9zaXRpb25cIixcImFic29sdXRlXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShpbm5lcixcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiU29ydCBCeVwiKVxuICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQwcHhcIilcblxuXG5cbiAgaW5uZXIuc2VsZWN0QWxsKFwic2VsZWN0XCIpXG4gICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxNDBweFwiKVxuXG5cbiAgdmFyIGNiID0gY29tcF9idWJibGUoYmVmb3JlKVxuICAgIC5yb3dzKGRhdGEuYmVmb3JlX2NhdGVnb3JpZXMpXG4gICAgLmFmdGVyKGRhdGEuYWZ0ZXJfY2F0ZWdvcmllcylcbiAgICAuZHJhdygpXG5cbiAgY2IuX3N2Zy5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcImF1dG9cIilcblxuXG4gIHJldHVybiBpbm5lclxuXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBQaWUodGFyZ2V0KSB7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cblBpZS5wcm90b3R5cGUgPSB7XG4gICAgcmFkaXVzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmFkaXVzXCIsdmFsKVxuICAgIH1cbiAgLCBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICBcbiAgICB2YXIgZCA9IGQzLmVudHJpZXMoe1xuICAgICAgICBzYW1wbGU6IHRoaXMuX2RhdGEuc2FtcGxlXG4gICAgICAsIHBvcHVsYXRpb246IHRoaXMuX2RhdGEucG9wdWxhdGlvbiAtIHRoaXMuX2RhdGEuc2FtcGxlXG4gICAgfSlcbiAgICBcbiAgICB2YXIgY29sb3IgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgICAgLnJhbmdlKFtcIiM5OGFiYzVcIiwgXCIjOGE4OWE2XCIsIFwiIzdiNjg4OFwiLCBcIiM2YjQ4NmJcIiwgXCIjYTA1ZDU2XCIsIFwiI2QwNzQzY1wiLCBcIiNmZjhjMDBcIl0pO1xuICAgIFxuICAgIHZhciBhcmMgPSBkMy5zdmcuYXJjKClcbiAgICAgICAgLm91dGVyUmFkaXVzKHRoaXMuX3JhZGl1cyAtIDEwKVxuICAgICAgICAuaW5uZXJSYWRpdXMoMCk7XG4gICAgXG4gICAgdmFyIHBpZSA9IGQzLmxheW91dC5waWUoKVxuICAgICAgICAuc29ydChudWxsKVxuICAgICAgICAudmFsdWUoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSk7XG4gICAgXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKHgpe3JldHVybiAxfSlcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCA1MClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgNTIpXG4gIFxuICAgIHN2ZyA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiZ1wiLFwiZ1wiKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIDI1ICsgXCIsXCIgKyAyNiArIFwiKVwiKTtcbiAgICBcbiAgICB2YXIgZyA9IGQzX3NwbGF0KHN2ZyxcIi5hcmNcIixcImdcIixwaWUoZCksZnVuY3Rpb24oeCl7IHJldHVybiB4LmRhdGEua2V5IH0pXG4gICAgICAuY2xhc3NlZChcImFyY1wiLHRydWUpXG4gIFxuICAgIGQzX3VwZGF0ZWFibGUoZyxcInBhdGhcIixcInBhdGhcIilcbiAgICAgIC5hdHRyKFwiZFwiLCBhcmMpXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGNvbG9yKGQuZGF0YS5rZXkpIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHBpZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBQaWUodGFyZ2V0KVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgcGllIGZyb20gJy4uLy4uL2dlbmVyaWMvcGllJ1xuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSwgdGFyZ2V0LCByYWRpdXNfc2NhbGUsIHgpIHtcbiAgdmFyIGRhdGEgPSBkYXRhXG4gICAgLCBkdGhpcyA9IGQzX2NsYXNzKGQzLnNlbGVjdCh0YXJnZXQpLFwicGllLXN1bW1hcnktYmxvY2tcIilcblxuICBwaWUoZHRoaXMpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAucmFkaXVzKHJhZGl1c19zY2FsZShkYXRhLnBvcHVsYXRpb24pKVxuICAgIC5kcmF3KClcblxuICB2YXIgZncgPSBkM19jbGFzcyhkdGhpcyxcImZ3XCIpXG4gICAgLmNsYXNzZWQoXCJmd1wiLHRydWUpXG5cbiAgdmFyIGZ3MiA9IGQzX2NsYXNzKGR0aGlzLFwiZncyXCIpXG4gICAgLnRleHQoZDMuZm9ybWF0KFwiJVwiKShkYXRhLnNhbXBsZS9kYXRhLnBvcHVsYXRpb24pKVxuXG4gIGQzX2NsYXNzKGZ3LFwic2FtcGxlXCIsXCJzcGFuXCIpXG4gICAgLnRleHQoZDMuZm9ybWF0KFwiLFwiKShkYXRhLnNhbXBsZSkpXG5cbiAgZDNfY2xhc3MoZncsXCJ2c1wiLFwic3BhblwiKVxuICAgIC5odG1sKFwiPGJyPiBvdXQgb2YgPGJyPlwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjg4ZW1cIilcblxuICBkM19jbGFzcyhmdyxcInBvcHVsYXRpb25cIixcInNwYW5cIilcbiAgICAudGV4dChkMy5mb3JtYXQoXCIsXCIpKGRhdGEucG9wdWxhdGlvbikpXG5cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IHtidWlsZFN1bW1hcnlCbG9ja30gZnJvbSAnLi9zYW1wbGVfdnNfcG9wJ1xuXG5pbXBvcnQgKiBhcyB0aW1lc2VyaWVzIGZyb20gJy4uLy4uL2dlbmVyaWMvdGltZXNlcmllcydcblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdUaW1lc2VyaWVzKHRhcmdldCxkYXRhLHJhZGl1c19zY2FsZSkge1xuICB2YXIgdyA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZGl2LnRpbWVzZXJpZXNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidGltZXNlcmllc1wiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjYwJVwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsIFwiMTBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTI3cHhcIilcblxuXG5cbiAgdmFyIHEgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdi50aW1lc2VyaWVzLWRldGFpbHNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidGltZXNlcmllcy1kZXRhaWxzXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDAlXCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjE1cHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjU3cHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTI3cHhcIilcblxuXG5cblxuXG4gIHZhciBwb3AgPSBkM191cGRhdGVhYmxlKHEsXCIucG9wXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInBvcFwiLHRydWUpXG5cbiAgZDNfdXBkYXRlYWJsZShwb3AsXCIuZXhcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcImV4XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcImdyZXlcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG4gIGQzX3VwZGF0ZWFibGUocG9wLFwiLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiM3B4XCIpXG4gICAgLnRleHQoXCJhbGxcIilcblxuXG5cbiAgdmFyIHNhbXAgPSBkM191cGRhdGVhYmxlKHEsXCIuc2FtcFwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJzYW1wXCIsdHJ1ZSlcblxuICBkM191cGRhdGVhYmxlKHNhbXAsXCIuZXhcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcImV4XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiMwODFkNThcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG5cbiAgZDNfdXBkYXRlYWJsZShzYW1wLFwiLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiM3B4XCIpXG4gICAgLnRleHQoXCJmaWx0ZXJlZFwiKVxuXG5cbiAgdmFyIGRldGFpbHMgPSBkM191cGRhdGVhYmxlKHEsXCIuZGVldHNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwiZGVldHNcIix0cnVlKVxuXG5cblxuXG4gIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiRmlsdGVyZWQgdmVyc3VzIEFsbCBWaWV3c1wiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG5cblxuXG5cblxuICB0aW1lc2VyaWVzWydkZWZhdWx0J10odylcbiAgICAuZGF0YSh7XCJrZXlcIjpcInlcIixcInZhbHVlc1wiOmRhdGF9KVxuICAgIC5oZWlnaHQoODApXG4gICAgLm9uKFwiaG92ZXJcIixmdW5jdGlvbih4KSB7XG4gICAgICB2YXIgeHggPSB7fVxuICAgICAgeHhbeC5rZXldID0ge3NhbXBsZTogeC52YWx1ZSwgcG9wdWxhdGlvbjogeC52YWx1ZTIgfVxuICAgICAgZGV0YWlscy5kYXR1bSh4eClcblxuICAgICAgZDNfdXBkYXRlYWJsZShkZXRhaWxzLFwiLnRleHRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInRleHRcIix0cnVlKVxuICAgICAgICAudGV4dChcIkAgXCIgKyB4LmhvdXIgKyBcIjpcIiArICh4Lm1pbnV0ZS5sZW5ndGggPiAxID8geC5taW51dGUgOiBcIjBcIiArIHgubWludXRlKSApXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiNDlweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZShkZXRhaWxzLFwiLnBpZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicGllXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxNXB4XCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IE9iamVjdC5rZXlzKHgpLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiB4W2tdIH0pWzBdXG4gICAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgICB9KVxuICAgIH0pXG4gICAgLmRyYXcoKVxuXG59XG4iLCJpbXBvcnQge3RhYmxlfSBmcm9tICd0YWJsZSdcbmltcG9ydCB7ZDNfY2xhc3MsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5cbmltcG9ydCB7ZHJhd0NhdGVnb3J5LCBkcmF3Q2F0ZWdvcnlEaWZmfSBmcm9tICcuL2NhdGVnb3J5J1xuaW1wb3J0IHtkcmF3U3RyZWFtLCBkcmF3QmVmb3JlQW5kQWZ0ZXJ9IGZyb20gJy4vYmVmb3JlX2FuZF9hZnRlcidcbmltcG9ydCB7YnVpbGRTdW1tYXJ5QmxvY2t9IGZyb20gJy4vc2FtcGxlX3ZzX3BvcCdcbmltcG9ydCB7ZHJhd1RpbWVzZXJpZXN9IGZyb20gJy4vdGltaW5nJ1xuaW1wb3J0IHtkcmF3S2V5d29yZHMsIGRyYXdLZXl3b3JkRGlmZn0gZnJvbSAnLi9rZXl3b3JkcydcblxuaW1wb3J0IGhlYWRlciBmcm9tICcuLi8uLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCAnLi9zdW1tYXJ5LmNzcydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3VtbWFyeV92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN1bW1hcnlWaWV3KHRhcmdldClcbn1cblxuZXhwb3J0IGNsYXNzIFN1bW1hcnlWaWV3IGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsIFwidGltaW5nXCIsIFwiY2F0ZWdvcnlcIiwgXCJrZXl3b3Jkc1wiLCBcImJlZm9yZVwiLCBcImFmdGVyXCJdIH1cblxuICBkcmF3KCkge1xuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwic3VtbWFyeS12aWV3XCIpXG5cbiAgICBoZWFkZXIod3JhcClcbiAgICAgIC50ZXh0KFwiU3VtbWFyeVwiKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIHRzd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJ0cy1yb3dcIilcbiAgICAgICwgcGlld3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJwaWUtcm93XCIpXG4gICAgICAsIGNhdHdyYXAgPSBkM19jbGFzcyh3cmFwLFwiY2F0LXJvd1wiKS5jbGFzc2VkKFwiZGFzaC1yb3dcIix0cnVlKVxuICAgICAgLCBrZXl3cmFwID0gZDNfY2xhc3Mod3JhcCxcImtleS1yb3dcIilcbiAgICAgICwgYmF3cmFwID0gZDNfY2xhc3Mod3JhcCxcImJhLXJvd1wiKSBcbiAgICAgICwgc3RyZWFtd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJzdHJlYW0tYmEtcm93XCIpIFxuXG5cbiAgICB2YXIgcmFkaXVzX3NjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oW3RoaXMuX2RhdGEuZG9tYWlucy5wb3B1bGF0aW9uLHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbl0pXG4gICAgICAucmFuZ2UoWzIwLDM1XSlcblxuICAgIHRhYmxlKHBpZXdyYXApXG4gICAgICAuZGF0YSh7XCJrZXlcIjpcIlRcIixcInZhbHVlc1wiOlt0aGlzLmRhdGEoKV19KVxuICAgICAgLnNraXBfb3B0aW9uKHRydWUpXG4gICAgICAucmVuZGVyKFwiZG9tYWluc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5yZW5kZXIoXCJhcnRpY2xlc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5yZW5kZXIoXCJzZXNzaW9uc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5yZW5kZXIoXCJ2aWV3c1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcblxuXG4gICAgZHJhd1RpbWVzZXJpZXModHN3cmFwLHRoaXMuX3RpbWluZyxyYWRpdXNfc2NhbGUpXG5cblxuICAgIHRyeSB7XG4gICAgZHJhd0NhdGVnb3J5KGNhdHdyYXAsdGhpcy5fY2F0ZWdvcnkpXG4gICAgZHJhd0NhdGVnb3J5RGlmZihjYXR3cmFwLHRoaXMuX2NhdGVnb3J5KVxuICAgIH0gY2F0Y2goZSkge31cblxuICAgIC8vZHJhd0tleXdvcmRzKGtleXdyYXAsdGhpcy5fa2V5d29yZHMpXG4gICAgLy9kcmF3S2V5d29yZERpZmYoa2V5d3JhcCx0aGlzLl9rZXl3b3JkcylcblxuICAgIHZhciBpbm5lciA9IGRyYXdCZWZvcmVBbmRBZnRlcihiYXdyYXAsdGhpcy5fYmVmb3JlKVxuXG4gICAgc2VsZWN0KGlubmVyKVxuICAgICAgLm9wdGlvbnMoW1xuICAgICAgICAgIHtcImtleVwiOlwiSW1wb3J0YW5jZVwiLFwidmFsdWVcIjpcInBlcmNlbnRfZGlmZlwifVxuICAgICAgICAsIHtcImtleVwiOlwiQWN0aXZpdHlcIixcInZhbHVlXCI6XCJzY29yZVwifVxuICAgICAgICAsIHtcImtleVwiOlwiUG9wdWxhdGlvblwiLFwidmFsdWVcIjpcInBvcFwifVxuICAgICAgXSlcbiAgICAgIC5zZWxlY3RlZCh0aGlzLl9iZWZvcmUuc29ydGJ5IHx8IFwiXCIpXG4gICAgICAub24oXCJzZWxlY3RcIiwgdGhpcy5vbihcImJhLnNvcnRcIikpXG4gICAgICAuZHJhdygpXG5cblxuICAgIGRyYXdTdHJlYW0oc3RyZWFtd3JhcCx0aGlzLl9iZWZvcmUuYmVmb3JlX2NhdGVnb3JpZXMsdGhpcy5fYmVmb3JlLmFmdGVyX2NhdGVnb3JpZXMpXG5cblxuICAgIHJldHVybiB0aGlzXG4gIH1cbn0gICAgICAgICAgICAgICBcbiIsImV4cG9ydCB2YXIgYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKHgqNjApIH0pXG5idWNrZXRzID0gYnVja2V0cy5jb25jYXQoWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZygteCo2MCkgfSkpXG5cbiBcblxuLy8gUm9sbHVwIG92ZXJhbGwgYmVmb3JlIGFuZCBhZnRlciBkYXRhXG5cbmNvbnN0IGJ1Y2tldFdpdGhQcmVmaXggPSAocHJlZml4LHgpID0+IHByZWZpeCArIHgudGltZV9kaWZmX2J1Y2tldFxuY29uc3Qgc3VtVmlzaXRzID0gKHgpID0+IGQzLnN1bSh4LHkgPT4geS52aXNpdHMpIFxuXG5leHBvcnQgZnVuY3Rpb24gcm9sbHVwQmVmb3JlQW5kQWZ0ZXIoYmVmb3JlX3VybHMsIGFmdGVyX3VybHMpIHtcblxuICBjb25zdCBiZWZvcmVfcm9sbHVwID0gZDMubmVzdCgpXG4gICAgLmtleShidWNrZXRXaXRoUHJlZml4LmJpbmQodGhpcyxcIlwiKSlcbiAgICAucm9sbHVwKHN1bVZpc2l0cylcbiAgICAubWFwKGJlZm9yZV91cmxzKVxuXG4gIGNvbnN0IGFmdGVyX3JvbGx1cCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoYnVja2V0V2l0aFByZWZpeC5iaW5kKHRoaXMsXCItXCIpKVxuICAgIC5yb2xsdXAoc3VtVmlzaXRzKVxuICAgIC5tYXAoYWZ0ZXJfdXJscylcblxuICByZXR1cm4gYnVja2V0cy5tYXAoeCA9PiBiZWZvcmVfcm9sbHVwW3hdIHx8IGFmdGVyX3JvbGx1cFt4XSB8fCAwKVxufVxuXG5cblxuXG4vLyBLZXl3b3JkIHByb2Nlc3NpbmcgaGVscGVyc1xuXG5jb25zdCBTVE9QV09SRFMgPVtcbiAgICBcInRoYXRcIixcInRoaXNcIixcIndoYXRcIixcImJlc3RcIixcIm1vc3RcIixcImZyb21cIixcInlvdXJcIlxuICAsIFwiaGF2ZVwiLFwiZmlyc3RcIixcIndpbGxcIixcInRoYW5cIixcInNheXNcIixcImxpa2VcIixcImludG9cIixcImFmdGVyXCIsXCJ3aXRoXCJcbl1cbmNvbnN0IGNsZWFuQW5kU3BsaXRVUkwgPSAoZG9tYWluLHVybCkgPT4ge1xuICByZXR1cm4gdXJsLnRvTG93ZXJDYXNlKCkuc3BsaXQoZG9tYWluKVsxXS5zcGxpdChcIi9cIikucmV2ZXJzZSgpWzBdLnJlcGxhY2UoXCJfXCIsXCItXCIpLnNwbGl0KFwiLVwiKVxufVxuY29uc3QgaXNXb3JkID0gKHgpID0+IHtcbiAgcmV0dXJuIHgubWF0Y2goL1xcZCsvZykgPT0gbnVsbCAmJiBcbiAgICB4LmluZGV4T2YoXCIsXCIpID09IC0xICYmIFxuICAgIHguaW5kZXhPZihcIj9cIikgPT0gLTEgJiYgXG4gICAgeC5pbmRleE9mKFwiLlwiKSA9PSAtMSAmJiBcbiAgICB4LmluZGV4T2YoXCI6XCIpID09IC0xICYmIFxuICAgIHBhcnNlSW50KHgpICE9IHggJiYgXG4gICAgeC5sZW5ndGggPiAzXG59XG5cblxuY29uc3QgdXJsUmVkdWNlciA9IChwLGMpID0+IHtcbiAgcFtjLnVybF0gPSAocFtjLnVybF0gfHwgMCkgKyBjLnZpc2l0c1xuICByZXR1cm4gcFxufVxuY29uc3QgdXJsQnVja2V0UmVkdWNlciA9IChwcmVmaXgsIHAsYykgPT4ge1xuICBwW2MudXJsXSA9IHBbYy51cmxdIHx8IHt9XG4gIHBbYy51cmxdW1widXJsXCJdID0gYy51cmxcblxuICBwW2MudXJsXVtwcmVmaXggKyBjLnRpbWVfZGlmZl9idWNrZXRdID0gYy52aXNpdHNcbiAgcmV0dXJuIHBcbn1cbmNvbnN0IHVybFRvS2V5d29yZHNPYmpSZWR1Y2VyID0gKGRvbWFpbiwgcCxjKSA9PiB7XG4gIGNsZWFuQW5kU3BsaXRVUkwoZG9tYWluLGMua2V5KS5tYXAoeCA9PiB7XG4gICAgaWYgKGlzV29yZCh4KSAmJiBTVE9QV09SRFMuaW5kZXhPZih4KSA9PSAtMSkge1xuICAgICAgcFt4XSA9IHBbeF0gfHwge31cbiAgICAgIHBbeF0ua2V5ID0geFxuICAgICAgT2JqZWN0LmtleXMoYy52YWx1ZSkubWFwKHEgPT4ge1xuICAgICAgICBwW3hdW3FdID0gKHBbeF1bcV0gfHwgMCkgKyBjLnZhbHVlW3FdXG4gICAgICB9KVxuICAgIH1cbiAgfSlcbiAgcmV0dXJuIHBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVybHNBbmRLZXl3b3JkcyhiZWZvcmVfdXJscywgYWZ0ZXJfdXJscywgZG9tYWluKSB7XG5cbiAgICBjb25zdCB1cmxfdm9sdW1lID0ge31cbiAgICBiZWZvcmVfdXJscy5yZWR1Y2UodXJsUmVkdWNlcix1cmxfdm9sdW1lKVxuICAgIGFmdGVyX3VybHMucmVkdWNlKHVybFJlZHVjZXIsdXJsX3ZvbHVtZSlcblxuICAgIGNvbnN0IHVybF90cyA9IHt9XG4gICAgYmVmb3JlX3VybHMucmVkdWNlKHVybEJ1Y2tldFJlZHVjZXIuYmluZCh0aGlzLFwiXCIpLHVybF90cylcbiAgICBhZnRlcl91cmxzLnJlZHVjZSh1cmxCdWNrZXRSZWR1Y2VyLmJpbmQodGhpcyxcIi1cIiksdXJsX3RzKVxuXG4gICAgY29uc3QgdXJscyA9IGQzLmVudHJpZXModXJsX3ZvbHVtZSlcbiAgICAgIC5zb3J0KChwLGMpID0+IHsgcmV0dXJuIGQzLmRlc2NlbmRpbmcocC52YWx1ZSxjLnZhbHVlKSB9KVxuICAgICAgLnNsaWNlKDAsMTAwMClcbiAgICAgIC5tYXAoeCA9PiB1cmxfdHNbeC5rZXldKVxuICAgICAgLm1hcChmdW5jdGlvbih4KXsgXG4gICAgICAgIHgua2V5ID0geC51cmxcbiAgICAgICAgeC52YWx1ZXMgPSBidWNrZXRzLm1hcCh5ID0+IHhbeV0gfHwgMClcbiAgICAgICAgeC50b3RhbCA9IGQzLnN1bShidWNrZXRzLm1hcChmdW5jdGlvbihiKSB7IHJldHVybiB4W2JdIHx8IDAgfSkpXG4gICAgICAgIHJldHVybiB4XG4gICAgICB9KVxuXG4gICAgY29uc3Qga2V5d29yZHMgPSB7fVxuICAgIGQzLmVudHJpZXModXJsX3RzKVxuICAgICAgLnJlZHVjZSh1cmxUb0tleXdvcmRzT2JqUmVkdWNlci5iaW5kKGZhbHNlLGRvbWFpbiksa2V5d29yZHMpXG4gICAgXG4gICAgXG4gICAgY29uc3Qga3dzID0gT2JqZWN0LmtleXMoa2V5d29yZHMpXG4gICAgICAubWFwKGZ1bmN0aW9uKGspIHsgcmV0dXJuIE9iamVjdC5hc3NpZ24oa2V5d29yZHNba10se2tleTprfSkgfSlcbiAgICAgIC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgIHgudmFsdWVzID0gYnVja2V0cy5tYXAoeSA9PiB4W3ldIHx8IDApXG4gICAgICAgIHgudG90YWwgPSBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKVxuICAgICAgICByZXR1cm4geFxuICAgICAgfSkuc29ydCgocCxjKSA9PiB7XG4gICAgICAgIHJldHVybiBjLnRvdGFsIC0gcC50b3RhbFxuICAgICAgfSlcblxuICAgIHJldHVybiB7XG4gICAgICB1cmxzLFxuICAgICAga3dzXG4gICAgfVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZENvbnNpZChzb3J0ZWRfdXJscywgc29ydGVkX2t3cywgYmVmb3JlX3BvcywgYWZ0ZXJfcG9zKSB7XG4gICAgY29uc3QgY29uc2lkX2J1Y2tldHMgPSBidWNrZXRzLmZpbHRlcigoeCxpKSA9PiAhKChpIDwgYmVmb3JlX3BvcykgfHwgKGkgPiBidWNrZXRzLmxlbmd0aC8yIC0gMSApKSApXG4gICAgY29uc3QgdmFsaWRfYnVja2V0cyAgPSBidWNrZXRzLmZpbHRlcigoeCxpKSA9PiAhKChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKSkgKVxuICAgIGZ1bmN0aW9uIGNvbnRhaW5zUmVkdWNlcih4LHAsYykge1xuICAgICAgcCArPSB4W2NdIHx8IDA7XG4gICAgICByZXR1cm4gcFxuICAgIH1cbiAgICBmdW5jdGlvbiBmaWx0ZXJCeUJ1Y2tldHMoX2J1Y2tldHMseCkge1xuICAgICAgcmV0dXJuIF9idWNrZXRzLnJlZHVjZShjb250YWluc1JlZHVjZXIuYmluZChmYWxzZSx4KSwwKVxuICAgIH1cbiAgICB2YXIgdXJsc19jb25zaWQgPSBzb3J0ZWRfdXJscy5maWx0ZXIoIGZpbHRlckJ5QnVja2V0cy5iaW5kKGZhbHNlLGNvbnNpZF9idWNrZXRzKSApXG4gICAgICAsIGt3c19jb25zaWQgPSBzb3J0ZWRfa3dzLmZpbHRlciggZmlsdGVyQnlCdWNrZXRzLmJpbmQoZmFsc2UsY29uc2lkX2J1Y2tldHMpIClcblxuICAgIHZhciB1cmxzX3ZhbGlkID0gc29ydGVkX3VybHMuZmlsdGVyKCBmaWx0ZXJCeUJ1Y2tldHMuYmluZChmYWxzZSx2YWxpZF9idWNrZXRzKSApXG4gICAgICAsIGt3c192YWxpZCA9IHNvcnRlZF9rd3MuZmlsdGVyKCBmaWx0ZXJCeUJ1Y2tldHMuYmluZChmYWxzZSx2YWxpZF9idWNrZXRzKSApXG5cbiAgICByZXR1cm4ge1xuICAgICAgICB1cmxzX2NvbnNpZFxuICAgICAgLCB1cmxzX3ZhbGlkXG4gICAgICAsIGt3c19jb25zaWRcbiAgICAgICwga3dzX3ZhbGlkXG4gICAgfVxufVxuXG5cblxuXG4vLyBCdWlsZCBkYXRhIGZvciBzdW1tYXJ5XG5cbmZ1bmN0aW9uIG51bVZpZXdzKGRhdGEpIHsgXG4gIHJldHVybiBkYXRhLmxlbmd0aCBcbn1cbmZ1bmN0aW9uIGF2Z1ZpZXdzKGRhdGEpIHtcbiAgcmV0dXJuIHBhcnNlSW50KGRhdGEucmVkdWNlKChwLGMpID0+IHAgKyBjLnRvdGFsLDApL2RhdGEubGVuZ3RoKVxufVxuZnVuY3Rpb24gbWVkaWFuVmlld3MoZGF0YSkge1xuICByZXR1cm4gKGRhdGFbcGFyc2VJbnQoZGF0YS5sZW5ndGgvMildIHx8IHt9KS50b3RhbCB8fCAwXG59XG5mdW5jdGlvbiBzdW1tYXJpemVWaWV3cyhuYW1lLCBmbiwgYWxsLCBjb25zaWQsIHZhbGlkKSB7XG4gIHJldHVybiB7bmFtZTogbmFtZSwgYWxsOiBmbihhbGwpLCBjb25zaWRlcmF0aW9uOiBmbihjb25zaWQpLCB2YWxpZGF0aW9uOiBmbih2YWxpZCl9XG59XG5leHBvcnQgZnVuY3Rpb24gc3VtbWFyaXplRGF0YShhbGwsY29uc2lkLHZhbGlkKSB7XG4gIHJldHVybiBbXG4gICAgICBzdW1tYXJpemVWaWV3cyhcIkRpc3RpbmN0IFVSTHNcIixudW1WaWV3cyxhbGwsY29uc2lkLHZhbGlkKVxuICAgICwgc3VtbWFyaXplVmlld3MoXCJBdmVyYWdlIFZpZXdzXCIsYXZnVmlld3MsYWxsLGNvbnNpZCx2YWxpZClcbiAgICAsIHN1bW1hcml6ZVZpZXdzKFwiTWVkaWFuIFZpZXdzXCIsbWVkaWFuVmlld3MsYWxsLGNvbnNpZCx2YWxpZClcbiAgXVxufVxuXG5cblxuLy8gUHJvY2VzcyByZWxhdGl2ZSB0aW1pbmcgZGF0YVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvY2Vzc0RhdGEoYmVmb3JlX3VybHMsIGFmdGVyX3VybHMsIGJlZm9yZV9wb3MsIGFmdGVyX3BvcywgZG9tYWluKSB7XG5cbiAgICBjb25zdCB7IHVybHMgLCBrd3MgfSA9IHVybHNBbmRLZXl3b3JkcyhiZWZvcmVfdXJscywgYWZ0ZXJfdXJscywgZG9tYWluKVxuICAgIGNvbnN0IHsgdXJsc19jb25zaWQgLCB1cmxzX3ZhbGlkICwga3dzX2NvbnNpZCAsIGt3c192YWxpZCB9ID0gdmFsaWRDb25zaWQodXJscywga3dzLCBiZWZvcmVfcG9zLCBhZnRlcl9wb3MpXG5cbiAgICBjb25zdCB1cmxfc3VtbWFyeSA9IHN1bW1hcml6ZURhdGEodXJscywgdXJsc19jb25zaWQsIHVybHNfdmFsaWQpXG4gICAgY29uc3Qga3dzX3N1bW1hcnkgPSBzdW1tYXJpemVEYXRhKGt3cywga3dzX2NvbnNpZCwga3dzX3ZhbGlkIClcblxuICAgIHJldHVybiB7XG4gICAgICB1cmxfc3VtbWFyeSxcbiAgICAgIGt3c19zdW1tYXJ5LFxuICAgICAgdXJscyxcbiAgICAgIHVybHNfY29uc2lkICxcbiAgICAgIHVybHNfdmFsaWQgLFxuICAgICAga3dzLFxuICAgICAga3dzX2NvbnNpZCAsXG4gICAgICBrd3NfdmFsaWQgXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgZDNfY2xhc3MsIG5vb3AsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCB7dGFibGUsIHN1bW1hcnlfdGFibGV9IGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzLCBiZWZvcmVfYWZ0ZXJfdGltZXNlcmllc30gZnJvbSAnY2hhcnQnXG5pbXBvcnQge3RhYnVsYXJfdGltZXNlcmllcywgdmVydGljYWxfb3B0aW9ufSBmcm9tICdjb21wb25lbnQnXG5cbmltcG9ydCB7cm9sbHVwQmVmb3JlQW5kQWZ0ZXIsIHByb2Nlc3NEYXRhLCBidWNrZXRzfSBmcm9tICcuL3JlZmluZV9yZWxhdGl2ZV9wcm9jZXNzJ1xuaW1wb3J0ICcuL3JlZmluZV9yZWxhdGl2ZS5jc3MnXG5cblxuZnVuY3Rpb24gc2VsZWN0T3B0aW9uUmVjdCh0ZCxvcHRpb25zLGJlZm9yZV9wb3MsYWZ0ZXJfcG9zKSB7XG5cbiAgdmFyIHN1YnNldCA9IHRkLnNlbGVjdEFsbChcInN2Z1wiKS5zZWxlY3RBbGwoXCJyZWN0XCIpXG4gICAgLmF0dHIoXCJmaWxsXCIsdW5kZWZpbmVkKS5maWx0ZXIoKHgsaSkgPT4ge1xuICAgICAgdmFyIHZhbHVlID0gb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZVxuICAgICAgaWYgKHZhbHVlID09IFwiYWxsXCIpIHJldHVybiBmYWxzZVxuICAgICAgaWYgKHZhbHVlID09IFwiY29uc2lkZXJhdGlvblwiKSByZXR1cm4gKGkgPCBiZWZvcmVfcG9zKSB8fCAoaSA+IGJ1Y2tldHMubGVuZ3RoLzIgLSAxIClcbiAgICAgIGlmICh2YWx1ZSA9PSBcInZhbGlkYXRpb25cIikgcmV0dXJuIChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKVxuICAgIH0pXG5cbiAgc3Vic2V0LmF0dHIoXCJmaWxsXCIsXCJncmV5XCIpXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVmaW5lX3JlbGF0aXZlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFJlZmluZVJlbGF0aXZlKHRhcmdldClcbn1cblxuY2xhc3MgUmVmaW5lUmVsYXRpdmUgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gICAgdGhpcy5fb3B0aW9ucyA9IFtcbiAgICAgICAge1wia2V5XCI6XCJBbGxcIixcInZhbHVlXCI6XCJhbGxcIiwgXCJzZWxlY3RlZFwiOjF9XG4gICAgICAsIHtcImtleVwiOlwiQ29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcImNvbnNpZGVyYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgICAsIHtcImtleVwiOlwiVmFsaWRhdGlvblwiLFwidmFsdWVcIjpcInZhbGlkYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgXVxuICAgIHRoaXMuX3N1bW1hcnlfaGVhZGVycyA9IFtcbiAgICAgICAge1wia2V5XCI6XCJuYW1lXCIsXCJ2YWx1ZVwiOlwiXCJ9XG4gICAgICAsIHtcImtleVwiOlwiYWxsXCIsXCJ2YWx1ZVwiOlwiQWxsXCJ9XG4gICAgICAsIHtcImtleVwiOlwiY29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcIkNvbnNpZGVyYXRpb25cIn1cbiAgICAgICwge1wia2V5XCI6XCJ2YWxpZGF0aW9uXCIsXCJ2YWx1ZVwiOlwiVmFsaWRhdGlvblwifVxuICAgIF1cbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiLFwiZG9tYWluXCIsXCJzdGFnZXNcIixcImJlZm9yZV91cmxzXCIsXCJhZnRlcl91cmxzXCIsXCJzdW1tYXJ5X2hlYWRlcnNcIixcIm9wdGlvbnNcIl0gfVxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgdGQgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJyZWZpbmUtcmVsYXRpdmVcIilcbiAgICB2YXIgYmVmb3JlX3VybHMgPSB0aGlzLl9iZWZvcmVfdXJsc1xuICAgICAgLCBhZnRlcl91cmxzID0gdGhpcy5fYWZ0ZXJfdXJsc1xuICAgICAgLCBkID0gdGhpcy5fZGF0YVxuICAgICAgLCBzdGFnZXMgPSB0aGlzLl9zdGFnZXNcbiAgICAgICwgc3VtbWFyeV9oZWFkZXJzID0gdGhpcy5fc3VtbWFyeV9oZWFkZXJzXG4gICAgICAsIG9wdGlvbnMgPSB0aGlzLl9vcHRpb25zXG5cbiAgICB2YXIgYmVmb3JlX3BvcywgYWZ0ZXJfcG9zO1xuXG4gICAgYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgaWYgKHN0YWdlcy5jb25zaWRlcmF0aW9uID09IHgpIGJlZm9yZV9wb3MgPSBpXG4gICAgICAgaWYgKHN0YWdlcy52YWxpZGF0aW9uID09IHgpIGFmdGVyX3BvcyA9IGlcbiAgICB9KVxuXG4gICAgdmFyIG92ZXJhbGxfcm9sbHVwID0gcm9sbHVwQmVmb3JlQW5kQWZ0ZXIoYmVmb3JlX3VybHMsIGFmdGVyX3VybHMpXG4gICAgdmFyIHtcbiAgICAgICAgdXJsX3N1bW1hcnlcbiAgICAgICwgdXJsc1xuICAgICAgLCB1cmxzX2NvbnNpZFxuICAgICAgLCB1cmxzX3ZhbGlkXG5cbiAgICAgICwga3dzX3N1bW1hcnlcbiAgICAgICwga3dzXG4gICAgICAsIGt3c19jb25zaWRcbiAgICAgICwga3dzX3ZhbGlkIFxuXG4gICAgfSA9IHByb2Nlc3NEYXRhKGJlZm9yZV91cmxzLGFmdGVyX3VybHMsYmVmb3JlX3BvcyxhZnRlcl9wb3MsZC5kb21haW4pXG5cblxuXG5cbiAgICBjb25zdCBzdW1tYXJ5X3JvdyA9IGQzX2NsYXNzKHRkLFwic3VtbWFyeS1yb3dcIilcblxuICAgIGQzX2NsYXNzKHN1bW1hcnlfcm93LFwidGl0bGVcIilcbiAgICAgIC50ZXh0KFwiQmVmb3JlIGFuZCBBZnRlcjogXCIgKyBkLmRvbWFpbilcblxuICAgIGJlZm9yZV9hZnRlcl90aW1lc2VyaWVzKHN1bW1hcnlfcm93KVxuICAgICAgLmRhdGEob3ZlcmFsbF9yb2xsdXApXG4gICAgICAuYmVmb3JlKGJlZm9yZV9wb3MpXG4gICAgICAuYWZ0ZXIoYWZ0ZXJfcG9zKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIHZvcHRpb25zID0gdmVydGljYWxfb3B0aW9uKHN1bW1hcnlfcm93KVxuICAgICAgLm9wdGlvbnMob3B0aW9ucylcbiAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgIG9wdGlvbnMubWFwKHogPT4gei5zZWxlY3RlZCA9IHgua2V5ID09IHoua2V5ID8gMTogMClcbiAgICAgICAgdm9wdGlvbnNcbiAgICAgICAgICAub3B0aW9ucyhvcHRpb25zKSBcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgc2VsZWN0T3B0aW9uUmVjdCh0ZCxvcHRpb25zLGJlZm9yZV9wb3MsYWZ0ZXJfcG9zKVxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcblxuICAgIGQzX2NsYXNzKHN1bW1hcnlfcm93LFwiZGVzY3JpcHRpb25cIilcbiAgICAgIC50ZXh0KFwiU2VsZWN0IGRvbWFpbnMgYW5kIGtleXdvcmRzIHRvIGJ1aWxkIGFuZCByZWZpbmUgeW91ciBnbG9iYWwgZmlsdGVyXCIpXG5cblxuXG5cbiAgICBjb25zdCB0YWJsZXMgPSBkM19jbGFzcyh0ZCxcInRhYmxlcy1yb3dcIilcblxuICAgIHN1bW1hcnlfdGFibGUoZDNfY2xhc3ModGFibGVzLFwidXJsXCIpKVxuICAgICAgLnRpdGxlKFwiVVJMIFN1bW1hcnlcIilcbiAgICAgIC5kYXRhKHVybF9zdW1tYXJ5KVxuICAgICAgLmhlYWRlcnMoc3VtbWFyeV9oZWFkZXJzKVxuICAgICAgLmRyYXcoKVxuXG4gICAgc3VtbWFyeV90YWJsZShkM19jbGFzcyh0YWJsZXMsXCJrd1wiKSlcbiAgICAgIC50aXRsZShcIktleXdvcmQgU3VtbWFyeVwiKVxuICAgICAgLmRhdGEoa3dzX3N1bW1hcnkpXG4gICAgICAuaGVhZGVycyhzdW1tYXJ5X2hlYWRlcnMpXG4gICAgICAuZHJhdygpXG5cblxuXG5cbiAgICBjb25zdCBtb2RpZnkgPSBkM19jbGFzcyh0ZCxcIm1vZGlmeS1yb3dcIilcblxuICAgIGQzX2NsYXNzKG1vZGlmeSxcImFjdGlvbi1oZWFkZXJcIilcbiAgICAgIC50ZXh0KFwiRXhwbG9yZSBhbmQgUmVmaW5lXCIpXG5cbiAgICB0YWJ1bGFyX3RpbWVzZXJpZXMoZDNfY2xhc3MobW9kaWZ5LFwidXJsLWRlcHRoXCIpKVxuICAgICAgLmhlYWRlcnMoW1wiQmVmb3JlXCIsXCJBZnRlclwiXSlcbiAgICAgIC5sYWJlbChcIlVSTFwiKVxuICAgICAgLmRhdGEodXJscylcbiAgICAgIC5zcGxpdCh0aGlzLmRvbWFpbigpKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdGFidWxhcl90aW1lc2VyaWVzKGQzX2NsYXNzKG1vZGlmeSxcImt3LWRlcHRoXCIpKVxuICAgICAgLmhlYWRlcnMoW1wiQmVmb3JlXCIsXCJBZnRlclwiXSlcbiAgICAgIC5sYWJlbChcIktleXdvcmRzXCIpXG4gICAgICAuZGF0YShrd3MpXG4gICAgICAuZHJhdygpXG5cbiAgfVxuXG59XG5cblxuIiwidmFyIGJ1Y2tldHMgPSBbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5yZXZlcnNlKCkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZyh4KjYwKSB9KVxuYnVja2V0cyA9IGJ1Y2tldHMuY29uY2F0KFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiBTdHJpbmcoLXgqNjApIH0pKVxuXG5leHBvcnQgY29uc3QgdGltZUJ1Y2tldHMgPSBidWNrZXRzO1xuXG5cbmNvbnN0IGZvcm1hdE5hbWUgPSBmdW5jdGlvbih4KSB7XG5cbiAgaWYgKHggPCAwKSB4ID0gLXhcblxuICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhyXCJcbiAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICBpZiAoeCA9PSA4NjQwMCkgcmV0dXJuIFwiMSBkYXlcIlxuICBpZiAoeCA+IDg2NDAwKSByZXR1cm4geC84NjQwMCArIFwiIGRheXNcIiBcblxuICByZXR1cm4geC8zNjAwICsgXCIgaHJzXCJcbn1cblxuZXhwb3J0IGNvbnN0IHRpbWluZ0hlYWRlcnMgPSBidWNrZXRzLm1hcCh4ID0+IHsgcmV0dXJuIHtcImtleVwiOngsIFwidmFsdWVcIjpmb3JtYXROYW1lKHgpLCBcInNlbGVjdGVkXCI6dHJ1ZX0gfSlcbiIsImltcG9ydCB7dGltZUJ1Y2tldHN9IGZyb20gJy4vcmVsYXRpdmVfdGltaW5nX2NvbnN0YW50cyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVSb3dTaW1wbGUocm93KSB7XG5cbiAgdmFyIGl0ZW1zID0gMFxuXG4gIHZhciBtZWFuID0gdGltZUJ1Y2tldHMucmVkdWNlKChwLGMpID0+IHtcbiAgICBpZiAocm93W2NdICYmIHJvd1tjXSAhPSBcIlwiKSB7XG4gICAgICBpdGVtcyArKyBcbiAgICAgIHAgKz0gcm93W2NdIHx8IDBcbiAgICB9XG4gICAgcmV0dXJuIHBcbiAgfSwwKS9pdGVtc1xuXG4gIHRpbWVCdWNrZXRzLm1hcChiID0+IHtcbiAgICBpZiAocm93W2JdKSByb3dbYl0gPSByb3dbYl0gPiBtZWFuID8gXG4gICAgICBNYXRoLnJvdW5kKChyb3dbYl0gLSBtZWFuKS9tZWFuKjEwKS8xMCA6IFxuICAgICAgTWF0aC5yb3VuZCgtKG1lYW4gLSByb3dbYl0pL21lYW4qMTApLzEwXG4gIH0pXG5cbiAgcmV0dXJuIHJvd1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplQnlDYXRlZ29yeShjYXRlZ29yaWVzKSB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIG5vcm1hbGl6ZShyb3cpIHtcbiAgICBjb25zdCBjYXRfaWRmID0gKChjYXRlZ29yaWVzW3Jvdy5wYXJlbnRfY2F0ZWdvcnlfbmFtZV0gJiYgY2F0ZWdvcmllc1tyb3cucGFyZW50X2NhdGVnb3J5X25hbWVdLmlkZikgIHx8IDAuMDMyKSAqIDEwMDAwMFxuICAgIGxldCBpZGYgPSByb3cuaWRmID09IFwiTkFcIiA/IDE0MzQ1LzEwMCA6IHJvdy5pZGZcbiAgICBpZGYgPSAocm93LmtleS5zcGxpdChcIi5cIikpLmxlbmd0aCA+IDIgPyBpZGYqLjEgOiBpZGZcblxuICAgIHRpbWVCdWNrZXRzLm1hcChiID0+IHtcblxuICAgICAgaWYgKHJvd1tiXSkgcm93W2JdID0gTWF0aC5sb2coMSArIChyb3dbYl0vTWF0aC5zcXJ0KHJvdy50b3RhbCkpKihyb3dbYl0qcm93W2JdKSooaWRmKSooMS9jYXRfaWRmKSlcbiAgICB9KVxuICAgIHJldHVybiByb3dcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplQnlDb2x1bW5zKHZhbHVlcykge1xuXG4gIHZhciB0YiA9IHRpbWVCdWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7IHBbY10gPTA7IHJldHVybiBwfSwge30pXG4gIFxuICB2YXIgdG90YWxzID0gdmFsdWVzLnJlZHVjZSgodGIscm93KSA9PiB7XG4gICAgdGltZUJ1Y2tldHMubWFwKGIgPT4ge1xuICAgICAgdGJbYl0gKz0gcm93W2JdIHx8IDBcbiAgICB9KVxuICAgIHJldHVybiB0YlxuICB9LHRiKVxuXG4gIHJldHVybiBmdW5jdGlvbiBub3JtYWxpemUocm93KSB7XG4gICAgdGltZUJ1Y2tldHMubWFwKGIgPT4ge1xuICAgICAgaWYgKHJvd1tiXSkgcm93W2JdID0gTWF0aC5yb3VuZChyb3dbYl0vdG90YWxzW2JdKjEwMDApLzEwIFxuICAgIH0pXG4gICAgcmV0dXJuIHJvd1xuICB9XG59XG5cblxuZXhwb3J0IGNvbnN0IGNhdGVnb3J5V2VpZ2h0cyA9IChjYXRlZ29yaWVzKSA9PiB7XG4gIHJldHVybiBjYXRlZ29yaWVzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICBwW2Mua2V5XSA9ICgxICsgYy52YWx1ZXNbMF0ucGVyY2VudF9kaWZmKVxuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KVxufVxuXG52YXIgdDEgPSB0aW1lQnVja2V0cy5zbGljZSgwLDExKS5tYXAoeCA9PiBwYXJzZUludCh4KSApLnJldmVyc2UoKVxudmFyIHQyID0gWzBdLmNvbmNhdCh0MSlcbnZhciB0MyA9IHQxLm1hcCgodixpKSA9PiBpID8gKHYgLSB0MltpXSkvdDJbaV0gOiAxIClcblxuZXhwb3J0IGNvbnN0IG5vcm1hbGl6ZXJzID0gdDMucmVkdWNlKChwLGMpID0+IHtcbiAgcFtwLmxlbmd0aF0gPSBwW3AubGVuZ3RoLTFdKmNcbiAgcFtwLmxlbmd0aF0gPSBwW3AubGVuZ3RoLTFdKmMqKDErKChwLmxlbmd0aC0xKS8xMCkpXG4gIHJldHVybiBwXG59LFsxXSlcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZSh0b3RhbHMpIHtcblxuICB2YXIgbm9ybWQgPSBub3JtYWxpemVycy5zbGljZSgxKS5tYXAoKHgsaSkgPT4ge1xuICAgIHZhciBrID0gdDFbaV1cbiAgICByZXR1cm4gKHRvdGFsc1tTdHJpbmcoayldIHx8IDApL3hcbiAgfSlcblxuICB2YXIgYmFzZVZhbHVlID0gZDMuc3VtKG5vcm1kKS9ub3JtZC5maWx0ZXIoeCA9PiB4KS5sZW5ndGhcbiAgdmFyIGVzdGltYXRlcyA9IG5vcm1hbGl6ZXJzLm1hcCh4ID0+IHgqYmFzZVZhbHVlKVxuXG4gIHZhciBub3JtYWxpemVkID0gdDEubWFwKChrLGkpID0+IDEgKyAoKHRvdGFsc1tTdHJpbmcoayldIHx8IDApIC8gZXN0aW1hdGVzW2ldKSApXG4gICAgLm1hcChNYXRoLmxvZylcblxuICB2YXIgbm9ybWFsaXplZDIgPSB0MS5tYXAoKGssaSkgPT4gMSArICgodG90YWxzW1wiLVwiICsgU3RyaW5nKGspXSB8fCAwKSAvIGVzdGltYXRlc1tpXSkgKVxuICAgIC5tYXAoTWF0aC5sb2cpXG5cbiAgdmFyIHZhbHVlcyA9IG5vcm1hbGl6ZWQucmV2ZXJzZSgpLmNvbmNhdChub3JtYWxpemVkMikubWFwKHggPT4geCA/IHggOiBcIlwiIClcblxuICByZXR1cm4gdmFsdWVzXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVSb3coeCkge1xuICB2YXIgbm9ybWVkID0gbm9ybWFsaXplKHgpXG4gIHZhciBvYmogPSB7fVxuICB0MS5zbGljZSgpLnJldmVyc2UoKS5jb25jYXQodDEubWFwKHggPT4gXCItXCIgKyB4KSkubWFwKCh4LGkpID0+IG9ialt4XSA9IG5vcm1lZFtpXSlcblxuICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSx4LG9iailcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvdGFsc0J5VGltZSh2YWx1ZXMpIHtcbiAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgIE9iamVjdC5rZXlzKGMpLm1hcChrID0+IHtcbiAgICAgIHBba10gKz0gY1trXVxuICAgIH0pXG4gICAgcmV0dXJuIHBcbiAgfSwgdGltZUJ1Y2tldHMucmVkdWNlKChwLGMpID0+IHsgcFtjXSA9IDA7IHJldHVybiBwIH0sIHt9KSlcbn1cblxuXG5leHBvcnQgY29uc3QgY29tcHV0ZVNjYWxlID0gKGRhdGEpID0+IHtcbiAgY29uc3QgbWF4ID0gZGF0YS5yZWR1Y2UoKHAsYykgPT4ge1xuICAgIHRpbWVCdWNrZXRzLm1hcCh4ID0+IHtcbiAgICAgIHAgPSBNYXRoLmFicyhjW3hdKSA+IHAgPyBNYXRoLmFicyhjW3hdKSA6IHBcbiAgICB9KVxuICBcbiAgICByZXR1cm4gcFxuICB9LDApXG5cbiAgcmV0dXJuIGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFswLC44XSkuZG9tYWluKFswLE1hdGgubG9nKG1heCldKVxufVxuIiwiaW1wb3J0IHtub29wLCBpZGVudGl0eSwgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIGQzX2NsYXNzLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uLy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi8uLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5pbXBvcnQgcmVmaW5lX3JlbGF0aXZlIGZyb20gJy4vcmVmaW5lX3JlbGF0aXZlJ1xuaW1wb3J0IHtjYXRlZ29yeVdlaWdodHMsIGNvbXB1dGVTY2FsZSwgbm9ybWFsaXplUm93U2ltcGxlLCBub3JtYWxpemVSb3csIG5vcm1hbGl6ZSwgdG90YWxzQnlUaW1lLCBub3JtYWxpemVCeUNvbHVtbnMsIG5vcm1hbGl6ZUJ5Q2F0ZWdvcnl9IGZyb20gJy4vcmVsYXRpdmVfdGltaW5nX3Byb2Nlc3MnXG5pbXBvcnQge3RpbWluZ0hlYWRlcnMsIHRpbWVCdWNrZXRzfSBmcm9tICcuL3JlbGF0aXZlX3RpbWluZ19jb25zdGFudHMnXG5pbXBvcnQge2RyYXdTdHJlYW0sIGRyYXdTdHJlYW1Ta2lubnl9IGZyb20gJy4uL3N1bW1hcnkvYmVmb3JlX2FuZF9hZnRlcidcbmltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnY2hhcnQnXG5cbmltcG9ydCB0aW1lc2VyaWVzIGZyb20gJy4uLy4uL2dlbmVyaWMvdGltZXNlcmllcydcblxuXG5pbXBvcnQgJy4vcmVsYXRpdmVfdGltaW5nLmNzcydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVsYXRpdmVfdGltaW5nKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFJlbGF0aXZlVGltaW5nKHRhcmdldClcbn1cblxuY2xhc3MgUmVsYXRpdmVUaW1pbmcgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIixcInRyYW5zZm9ybVwiLCBcInNvcnRcIiwgXCJhc2NlbmRpbmdcIl0gfVxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGFcbiAgICAgICwgZmlsdGVyZWQgPSBkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHguc2VsZWN0ZWR9KVxuICAgICAgLCBzZWxlY3RlZCA9IGZpbHRlcmVkLmxlbmd0aCA/IGZpbHRlcmVkWzBdIDogZGF0YVswXVxuXG4gICAgdmFyIHdyYXAgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJzdW1tYXJ5LXdyYXBcIilcblxuICAgIGhlYWRlcih3cmFwKVxuICAgICAgLnRleHQoXCJCZWZvcmUgYW5kIEFmdGVyXCIpXG4gICAgICAuZHJhdygpXG5cblxuICAgIHZhciB0b3RhbHNfYnlfdGltZT0gdG90YWxzQnlUaW1lKHNlbGVjdGVkLnZhbHVlcylcbiAgICB2YXIgdmFsdWVzID0gbm9ybWFsaXplKHRvdGFsc19ieV90aW1lKVxuXG4gICAgdmFyIHRzID0gZDNfY2xhc3Mod3JhcCxcInRpbWVzZXJpZXMtcm93XCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLHNlbGVjdGVkLmtleSA9PSBcIlRvcCBDYXRlZ29yaWVzXCIgPyBcIjBweFwiIDogbnVsbClcblxuXG4gICAgdmFyIHRyYW5zZm9ybV9zZWxlY3RvciA9IGQzX2NsYXNzKHRzLFwidHJhbnNmb3JtXCIpXG5cbiAgICBzZWxlY3QoZDNfY2xhc3ModHJhbnNmb3JtX3NlbGVjdG9yLFwiaGVhZGVyXCIsXCJzcGFuXCIpKVxuICAgICAgLm9wdGlvbnMoZGF0YSlcbiAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KSB7IHRoaXMub24oXCJzZWxlY3RcIikoeCkgfS5iaW5kKHRoaXMpKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIE9QVElPTlMgPSBbXG4gICAgICAgICAge1wia2V5XCI6XCJBY3Rpdml0eVwiLFwidmFsdWVcIjpmYWxzZX1cbiAgICAgICAgLCB7XCJrZXlcIjpcIkludGVudCBTY29yZVwiLFwidmFsdWVcIjpcIm5vcm1hbGl6ZVwifVxuICAgICAgICAsIHtcImtleVwiOlwiSW1wb3J0YW5jZVwiLFwidmFsdWVcIjpcImltcG9ydGFuY2VcIn1cbiAgICAgICAgLCB7XCJrZXlcIjpcIlBlcmNlbnRhZ2VcIixcInZhbHVlXCI6XCJwZXJjZW50XCJ9XG4gICAgICAgICwge1wia2V5XCI6XCJQZXJjZW50IERpZmZcIixcInZhbHVlXCI6XCJwZXJjZW50X2RpZmZcIn1cbiAgICAgIF1cblxuXG5cbiAgICBzZWxlY3QoZDNfY2xhc3ModHJhbnNmb3JtX3NlbGVjdG9yLFwidHJhbnNcIixcInNwYW5cIikpXG4gICAgICAub3B0aW9ucyhPUFRJT05TKVxuICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICBzZWxmLm9uKFwidHJhbnNmb3JtLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgpXG4gICAgICB9KVxuICAgICAgLnNlbGVjdGVkKHRoaXMudHJhbnNmb3JtKCkgKVxuICAgICAgLmRyYXcoKVxuXG5cblxuXG4gICAgdmFyIHRvZ2dsZSA9IGQzX2NsYXNzKHRyYW5zZm9ybV9zZWxlY3RvcixcInNob3ctdmFsdWVzXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHRvZ2dsZSxcInNwYW5cIixcInNwYW5cIilcbiAgICAgIC50ZXh0KFwic2hvdyB2YWx1ZXM/IFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh0b2dnbGUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgIC5vbihcImNoYW5nZVwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgYmF3cmFwLmNsYXNzZWQoXCJzaG93LXZhbHVlc1wiLHRoaXMuY2hlY2tlZClcbiAgICAgIH0pXG5cblxuICAgIHZhciB0b2dnbGUgPSBkM19jbGFzcyh0cmFuc2Zvcm1fc2VsZWN0b3IsXCJmaWx0ZXItdmFsdWVzXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHRvZ2dsZSxcInNwYW5cIixcInNwYW5cIilcbiAgICAgIC50ZXh0KFwibGl2ZSBmaWx0ZXI/IFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh0b2dnbGUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgIC5hdHRyKFwiZGlzYWJsZWRcIix0cnVlKVxuICAgICAgLmF0dHIoXCJjaGVja2VkXCIsXCJjaGVja2VkXCIpXG5cbiAgICB2YXIgdG9nZ2xlID0gZDNfY2xhc3ModHJhbnNmb3JtX3NlbGVjdG9yLFwicmVzZXQtdmFsdWVzXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHRvZ2dsZSxcImFcIixcImFcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcIm5vbmVcIilcbiAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgLnRleHQoXCJSZXNldFwiKVxuXG5cblxuXG5cblxuICAgIHZhciBzdHJlYW1fd3JhcCA9IGQzX2NsYXNzKHRzLFwic3RyZWFtLXdyYXBcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI2ODJweFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLHNlbGVjdGVkLmtleSA9PSBcIlRvcCBDYXRlZ29yaWVzXCIgPyBcIm5vbmVcIiA6IFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwiYm90dG9tXCIpXG5cbiAgICB2YXIgZGV0YWlscyA9IGQzX2NsYXNzKHRzLFwiZGV0YWlscy13cmFwXCIsXCJzdmdcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNTVweFwiKVxuICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMDBweFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLHNlbGVjdGVkLmtleSA9PSBcIlRvcCBDYXRlZ29yaWVzXCIgPyBcIm5vbmVcIiA6IFwiaW5saW5lLWJsb2NrXCIpXG5cblxuICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTExMHB4XCIpXG4gICAgICAuc3R5bGUoXCJmbG9hdFwiLFwibGVmdFwiKVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyKGNhdCkge1xuXG4gICAgICB2YXIgdHIgPSBiYXdyYXAuc2VsZWN0QWxsKFwidGJvZHlcIikuc2VsZWN0QWxsKFwidHJcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRlLWNhdGVnb3J5XCIsZmFsc2UpXG5cbiAgICAgIGlmIChjYXQgPT09IGZhbHNlKSByZXR1cm4gXG5cbiAgICAgIHZhciBmaWx0ZXJlZCA9IHRyLmZpbHRlcihmdW5jdGlvbih4KSB7IFxuICAgICAgICAgIHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IGNhdFxuICAgICAgICB9KVxuICAgICAgICAuY2xhc3NlZChcImhpZGUtY2F0ZWdvcnlcIix0cnVlKVxuICAgIH1cblxuICAgIHZhciBzdGFnZXMgPSBkcmF3U3RyZWFtU2tpbm55KHN0cmVhbV93cmFwLHNlbGVjdGVkLmRhdGEuYmVmb3JlX2NhdGVnb3JpZXMsc2VsZWN0ZWQuZGF0YS5hZnRlcl9jYXRlZ29yaWVzLGZpbHRlcilcblxuICAgIHZhciB0aW1lX3dyYXAgPSBkM19jbGFzcyh0cyxcInRpbWUtd3JhcFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLCBcInJpZ2h0XCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIiwgXCI2M3B4XCIpXG5cbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZSh0aW1lX3dyYXAsXCJzdmdcIixcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiw2ODIpLmF0dHIoXCJoZWlnaHRcIiw4MClcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcImJvdHRvbVwiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuXG5cblxuICAgIHZhciBzdHMgPSBzaW1wbGVUaW1lc2VyaWVzKHN2Zyx2YWx1ZXMsNjgyLDgwLC0yKVxuXG4gICAgdmFyIGxvY2sgPSBmYWxzZVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyVGltZSh0LGkpIHtcbiAgICAgIHZhciBrZXkgPSB0aW1lQnVja2V0c1tpXVxuXG4gICAgICBpZiAobG9jaykge1xuICAgICAgICBjbGVhclRpbWVvdXQobG9jaylcbiAgICAgIH1cbiAgICAgIGxvY2sgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2NrID0gZmFsc2VcbiAgICAgICAgdmFyIHRyID0gYmF3cmFwLnNlbGVjdEFsbChcInRib2R5XCIpLnNlbGVjdEFsbChcInRyXCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJoaWRlLXRpbWVcIixmYWxzZSlcblxuICAgICAgICBpZiAoaSA9PT0gZmFsc2UpIHJldHVybiBmYWxzZVxuXG4gICAgICAgIHZhciBmaWx0ZXJlZCA9IHRyLmZpbHRlcihmdW5jdGlvbih4KSB7IFxuICAgICAgICAgICAgcmV0dXJuIHhba2V5XSA9PSB1bmRlZmluZWQgfHwgeFtrZXldID09IFwiXCJcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jbGFzc2VkKFwiaGlkZS10aW1lXCIsdHJ1ZSlcbiAgICAgIH0sMTApXG5cbiAgICB9XG5cblxuICAgIHN0cy5zZWxlY3RBbGwoXCJyZWN0XCIpXG4gICAgICAub24oXCJtb3VzZW92ZXJcIixmaWx0ZXJUaW1lKVxuICAgICAgLm9uKFwibW91c2VvdXRcIixmdW5jdGlvbigpIHsgXG4gICAgICAgIGZpbHRlclRpbWUoZmFsc2UsZmFsc2UpXG4gICAgICB9KVxuICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpIHtcbiAgICAgICAgbG9jayA9IGZhbHNlXG4gICAgICAgIHZhciBib29sID0gKHN0cy5zZWxlY3RBbGwoXCJyZWN0XCIpLm9uKFwibW91c2VvdmVyXCIpID09IGZpbHRlclRpbWUpXG5cbiAgICAgICAgc3RzLnNlbGVjdEFsbChcInJlY3RcIilcbiAgICAgICAgICAub24oXCJtb3VzZW92ZXJcIiwgYm9vbCA/IG5vb3AgOiBmaWx0ZXJUaW1lKVxuICAgICAgICAgIC5vbihcIm1vdXNlb3V0XCIsIGJvb2wgPyBub29wIDogZnVuY3Rpb24oKSB7IGZpbHRlclRpbWUoZmFsc2UsZmFsc2UpIH0pXG5cbiAgICAgICAgICAuY2xhc3NlZChcInNlbGVjdGVkXCIsZmFsc2UpXG5cbiAgICAgICAgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoXCJzZWxlY3RlZFwiLGJvb2wpXG5cbiAgICAgICAgLy9kMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKVxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgfSlcblxuICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBkYXRhWzBdLmRhdGEuY2F0ZWdvcnkucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIHBbYy5rZXldID0gY1xuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KVxuXG4gICAgdmFyIGJhd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJiYS1yb3dcIilcbiAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjYwMHB4XCIpXG5cbiAgICAvL1RPRE86IGZpeCB0aGlzXG5cbiAgICB2YXIgbm9ybUJ5Q29sID0gbm9ybWFsaXplQnlDb2x1bW5zKHNlbGVjdGVkLnZhbHVlcylcblxuXG4gICAgY29uc3Qgc29ydGVkX3RhYnVsYXIgPSBzZWxlY3RlZC52YWx1ZXMuZmlsdGVyKHggPT4geC5rZXkgIT0gXCJcIilcbiAgICAgIC5tYXAoXG4gICAgICAgIHRoaXMudHJhbnNmb3JtKCkgPT0gXCJub3JtYWxpemVcIiA/ICBub3JtYWxpemVSb3cgOiBcbiAgICAgICAgdGhpcy50cmFuc2Zvcm0oKSA9PSBcInBlcmNlbnRcIiA/IG5vcm1hbGl6ZUJ5Q29sdW1ucyhzZWxlY3RlZC52YWx1ZXMpIDogXG4gICAgICAgIHRoaXMudHJhbnNmb3JtKCkgPT0gXCJwZXJjZW50X2RpZmZcIiA/IHJvdyA9PiBub3JtYWxpemVSb3dTaW1wbGUoIG5vcm1CeUNvbChyb3cpICkgOiBcblxuICAgICAgICB0aGlzLnRyYW5zZm9ybSgpID09IFwiaW1wb3J0YW5jZVwiICYmIHNlbGVjdGVkLmtleS5pbmRleE9mKFwiQ2F0XCIpID09IC0xID8gbm9ybWFsaXplQnlDYXRlZ29yeShjYXRlZ29yaWVzKSA6IFxuICAgICAgICBpZGVudGl0eVxuICAgICAgKVxuICAgICAgLnNsaWNlKDAsMTAwMClcblxuICAgIGNvbnN0IG9zY2FsZSA9IGNvbXB1dGVTY2FsZShzb3J0ZWRfdGFidWxhcilcbiAgICBjb25zdCBoZWFkZXJzID0gW3tcImtleVwiOlwia2V5XCIsIFwidmFsdWVcIjpzZWxlY3RlZC5rZXkucmVwbGFjZShcIlRvcCBcIixcIlwiKX1dLmNvbmNhdCh0aW1pbmdIZWFkZXJzKVxuXG5cbiAgICBjb25zdCBfZGVmYXVsdCA9IFwiNjAwXCJcbiAgICBjb25zdCBzID0gdGhpcy5zb3J0KCkgXG4gICAgY29uc3QgYXNjID0gdGhpcy5hc2NlbmRpbmcoKSBcblxuXG4gICAgY29uc3Qgc2VsZWN0ZWRIZWFkZXIgPSBoZWFkZXJzLmZpbHRlcih4ID0+IHgua2V5ID09IHMpXG4gICAgY29uc3Qgc29ydGJ5ID0gc2VsZWN0ZWRIZWFkZXIubGVuZ3RoID8gc2VsZWN0ZWRIZWFkZXJbMF0ua2V5IDogX2RlZmF1bHRcblxuICAgIHRhYmxlKGJhd3JhcClcbiAgICAgIC50b3AoMTQwKVxuICAgICAgLmhlYWRlcnMoaGVhZGVycylcbiAgICAgIC5zb3J0KHNvcnRieSxhc2MpXG4gICAgICAub24oXCJzb3J0XCIsIHRoaXMub24oXCJzb3J0XCIpKVxuICAgICAgLm9uKFwiZXhwYW5kXCIsZnVuY3Rpb24oZCx0ZCkge1xuXG4gICAgICAgIHJlZmluZV9yZWxhdGl2ZSh0ZClcbiAgICAgICAgICAuZGF0YShkKVxuICAgICAgICAgIC5kb21haW4oZC5kb21haW4pXG4gICAgICAgICAgLnN0YWdlcyhzdGFnZXMpXG4gICAgICAgICAgLmJlZm9yZV91cmxzKGRhdGEuYmVmb3JlLmZpbHRlcih5ID0+IHkuZG9tYWluID09IGQuZG9tYWluKSApXG4gICAgICAgICAgLmFmdGVyX3VybHMoZGF0YS5hZnRlci5maWx0ZXIoeSA9PiB5LmRvbWFpbiA9PSBkLmRvbWFpbikpXG4gICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgIH0pXG4gICAgICAub24oXCJkcmF3XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCJ0aFwiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCJzcGFuXCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJsZXNzLXRoYW5cIiwgKHgpID0+IHsgcmV0dXJuIHBhcnNlSW50KHgua2V5KSA9PSB4LmtleSAmJiB4LmtleSA8IDAgfSlcbiAgICAgICAgICAuY2xhc3NlZChcImdyZWF0ZXItdGhhblwiLCAoeCkgPT4geyByZXR1cm4gcGFyc2VJbnQoeC5rZXkpID09IHgua2V5ICYmIHgua2V5ID4gMCB9KVxuXG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCIudGFibGUtb3B0aW9uXCIpXG4gICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwibm9uZVwiKVxuXG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpub3QoOmZpcnN0LWNoaWxkKVwiKVxuICAgICAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkIHdoaXRlXCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX19beFsna2V5J11dIHx8IDBcbiAgICAgICAgICAgIHZhciBzbHVnID0gdmFsdWUgPiAwID8gXCJyZ2JhKDcwLCAxMzAsIDE4MCxcIiA6IFwicmdiYSgyNDQsIDEwOSwgNjcsXCJcbiAgICAgICAgICAgIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG4gICAgICAgICAgICByZXR1cm4gc2x1ZyArIG9zY2FsZShNYXRoLmxvZyh2YWx1ZSsxKSkgKyBcIilcIlxuICAgICAgICAgIH0pICAgICBcbiAgICAgIH0pXG4gICAgICAub3B0aW9uX3RleHQoXCI8ZGl2IHN0eWxlPSd3aWR0aDo0MHB4O3RleHQtYWxpZ246Y2VudGVyJz4mIzY1MjkxOzwvZGl2PlwiKVxuICAgICAgLmRhdGEoe1widmFsdWVzXCI6c29ydGVkX3RhYnVsYXJ9KVxuICAgICAgLmRyYXcoKVxuXG4gIH1cbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBhZ2dyZWdhdGVDYXRlZ29yeSh1cmxzKSB7XG4gIGNvbnN0IGNhdGVnb3JpZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImFydGljbGVzXCI6IHZcbiAgICAgICAgLCBcInZhbHVlXCI6IGQzLnN1bSh2LHggPT4geC51bmlxdWVzKVxuICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHVybHMpXG4gICAgLm1hcChmdW5jdGlvbih2KSB7IHJldHVybiBPYmplY3QuYXNzaWduKHYudmFsdWVzLHtrZXk6IHYua2V5fSkgfSlcblxuICBjb25zdCB0b3RhbCA9IGQzLnN1bShjYXRlZ29yaWVzLGMgPT4gYy52YWx1ZSlcblxuICBjYXRlZ29yaWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5wZXJjZW50ID0geC52YWx1ZSAvIHRvdGFsXG4gIH0pXG5cbiAgcmV0dXJuIGNhdGVnb3JpZXNcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFnZ3JlZ2F0ZUNhdGVnb3J5SG91cih1cmxzKSB7XG4gIHJldHVybiBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSArIHguaG91ciArIHgubWludXRlfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB2WzBdLnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICwgXCJob3VyXCI6IHZbMF0uaG91clxuICAgICAgICAsIFwibWludXRlXCI6IHZbMF0ubWludXRlIFxuICAgICAgICAsIFwiY291bnRcIjogdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy5jb3VudCB9LDApXG4gICAgICAgICwgXCJhcnRpY2xlc1wiOiB2XG4gICAgICB9XG4gICAgfSlcbiAgICAuZW50cmllcyh1cmxzKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3J5UmVsYXRpdmVTaXplKHVybHMpIHtcbiAgcmV0dXJuIGQzLm5lc3QoKVxuICAgIC5rZXkoeCA9PiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lKVxuICAgIC5yb2xsdXAodiA9PiB2WzBdLmNhdGVnb3J5X2lkZiA/IDEvdlswXS5jYXRlZ29yeV9pZGYgOiAwKVxuICAgIC5tYXAodXJscykgXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yeVBlcmNlbnQodXJscykge1xuXG4gIGNvbnN0IHJlbGF0aXZlX3NpemUgPSBjYXRlZ29yeVJlbGF0aXZlU2l6ZSh1cmxzKVxuICBjb25zdCB0b3RhbCA9IGQzLnN1bShPYmplY3Qua2V5cyhjYXRlZ29yaWVzKS5tYXAoeCA9PiBjYXRlZ29yaWVzW3hdKSlcbiAgY29uc3QgcGVyY2VudCA9IHt9XG5cbiAgT2JqZWN0LmtleXMoY2F0ZWdvcmllcykubWFwKHggPT4ge1xuICAgIHBlcmNlbnRbeF0gPSByZWxhdGl2ZV9zaXplW3hdL3RvdGFsXG4gIH0pXG5cbiAgcmV0dXJuIHBlcmNlbnRcbn1cblxuZnVuY3Rpb24gY2F0ZWdvcnlSZWR1Y2VyKGdyb3VwKSB7XG4gIHJldHVybiBncm91cC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG4gICAgICByZXR1cm4gcFxuICAgIH0sXG4gICAgeyBcbiAgICAgICAgYXJ0aWNsZXM6IHt9XG4gICAgICAsIHZpZXdzOiAwXG4gICAgICAsIHNlc3Npb25zOiAwXG4gICAgICAsIHBvcF9zaXplOiBncm91cFswXS5jYXRlZ29yeV9pZGYgPyAxL2dyb3VwWzBdLmNhdGVnb3J5X2lkZiA6IDBcbiAgICAgICwgaWRmOiBncm91cFswXS5jYXRlZ29yeV9pZGZcbiAgICB9KVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcnlSb2xsKHVybHMpIHtcbiAgY29uc3Qgcm9sbGVkID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbihrKSB7IHJldHVybiBrLnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLnJvbGx1cChjYXRlZ29yeVJlZHVjZXIpXG4gICAgLmVudHJpZXModXJscylcblxuICBjb25zdCBwb3BfdG90YWwgPSBkMy5zdW0ocm9sbGVkLHggPT4geC52YWx1ZXMucG9wX3NpemUpXG4gIGNvbnN0IHZpZXdzX3RvdGFsID0gZDMuc3VtKHJvbGxlZCx4ID0+IHgudmFsdWVzLnZpZXdzKVxuXG4gIHJvbGxlZC5tYXAoeCA9PiB7XG4gICAgeC52YWx1ZXMucmVhbF9wb3BfcGVyY2VudCA9IHgudmFsdWVzLnBvcF9wZXJjZW50ID0gKHgudmFsdWVzLnBvcF9zaXplIC8gcG9wX3RvdGFsICogMTAwKVxuICAgIHgudmFsdWVzLnBlcmNlbnQgPSB4LnZhbHVlcy52aWV3cy92aWV3c190b3RhbFxuXG4gIH0pXG5cbiAgcmV0dXJuIHJvbGxlZFxufVxuXG52YXIgbW9kaWZ5V2l0aENvbXBhcmlzb25zID0gZnVuY3Rpb24oZHMpIHtcblxuICB2YXIgYWdncyA9IGRzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICBwLnBvcF9tYXggPSAocC5wb3BfbWF4IHx8IDApIDwgYy5wb3AgPyBjLnBvcCA6IHAucG9wX21heFxuICAgIHAucG9wX3RvdGFsID0gKHAucG9wX3RvdGFsIHx8IDApICsgYy5wb3BcblxuICAgIGlmIChjLnNhbXApIHtcbiAgICAgIHAuc2FtcF9tYXggPSAocC5zYW1wX21heCB8fCAwKSA+IGMuc2FtcCA/IHAuc2FtcF9tYXggOiBjLnNhbXBcbiAgICAgIHAuc2FtcF90b3RhbCA9IChwLnNhbXBfdG90YWwgfHwgMCkgKyBjLnNhbXBcbiAgICB9XG5cbiAgICByZXR1cm4gcFxuICB9LHt9KVxuXG4gIC8vY29uc29sZS5sb2coYWdncylcblxuICBkcy5tYXAoZnVuY3Rpb24obykge1xuICAgIG8ubm9ybWFsaXplZF9wb3AgPSBvLnBvcCAvIGFnZ3MucG9wX21heFxuICAgIG8ucGVyY2VudF9wb3AgPSBvLnBvcCAvIGFnZ3MucG9wX3RvdGFsXG5cbiAgICBvLm5vcm1hbGl6ZWRfc2FtcCA9IG8uc2FtcCAvIGFnZ3Muc2FtcF9tYXhcbiAgICBvLnBlcmNlbnRfc2FtcCA9IG8uc2FtcCAvIGFnZ3Muc2FtcF90b3RhbFxuXG4gICAgby5ub3JtYWxpemVkX2RpZmYgPSAoby5ub3JtYWxpemVkX3NhbXAgLSBvLm5vcm1hbGl6ZWRfcG9wKS9vLm5vcm1hbGl6ZWRfcG9wXG4gICAgby5wZXJjZW50X2RpZmYgPSAoby5wZXJjZW50X3NhbXAgLSBvLnBlcmNlbnRfcG9wKS9vLnBlcmNlbnRfcG9wXG4gIH0pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yeVN1bW1hcnkoc2FtcF91cmxzLHBvcF91cmxzKSB7XG5cbiAgY29uc3Qgc2FtcF9yb2xsZWQgPSBjYXRlZ29yeVJvbGwoc2FtcF91cmxzKVxuICAgICwgcG9wX3JvbGxlZCA9IGNhdGVnb3J5Um9sbChwb3BfdXJscylcbiAgICAsIG1hcHBlZF9jYXRfcm9sbCA9IHNhbXBfcm9sbGVkLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgXG4gICAgICAgIHBbYy5rZXldID0gYzsgXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LCB7fSlcblxuICBjb25zdCBjYXRfc3VtbWFyeSA9IHBvcF9yb2xsZWQubWFwKGZ1bmN0aW9uKHgpIHtcblxuICAgIFt4LnZhbHVlc10ubWFwKHkgPT4ge1xuICAgICAgICB5LmtleSA9IHgua2V5XG4gICAgICAgIHkucG9wID0geS52aWV3c1xuICAgICAgICB5LnNhbXAgPSBtYXBwZWRfY2F0X3JvbGxbeC5rZXldID8gbWFwcGVkX2NhdF9yb2xsW3gua2V5XS52YWx1ZXMudmlld3MgOiAwXG5cbiAgICAgICAgeS5zYW1wbGVfcGVyY2VudF9ub3JtID0geS5zYW1wbGVfcGVyY2VudCA9IHkucGVyY2VudCoxMDBcbiAgICAgICAgeS5pbXBvcnRhbmNlID0gTWF0aC5sb2coKDEveS5wb3Bfc2l6ZSkqeS5zYW1wKnkuc2FtcClcbiAgICAgICAgeS5yYXRpbyA9IHkuc2FtcGxlX3BlcmNlbnQveS5yZWFsX3BvcF9wZXJjZW50XG4gICAgICAgIHkudmFsdWUgPSB5LnNhbXBcbiAgICB9KVxuXG5cbiAgICByZXR1cm4geC52YWx1ZXNcbiAgfSkuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGIucG9wIC0gYS5wb3B9KVxuICAgIC5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgIT0gXCJOQVwiIH0pXG5cbiAgbW9kaWZ5V2l0aENvbXBhcmlzb25zKGNhdF9zdW1tYXJ5KVxuXG4gIHJldHVybiBjYXRfc3VtbWFyeVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhdGVnb3JpZXModmFsdWUpIHtcblxuICBjb25zdCBjYXRlZ29yaWVzID0gYWdncmVnYXRlQ2F0ZWdvcnkodmFsdWUuZnVsbF91cmxzKVxuICB2YWx1ZVtcImRpc3BsYXlfY2F0ZWdvcmllc1wiXSA9IHtcbiAgICAgIFwia2V5XCI6XCJDYXRlZ29yaWVzXCJcbiAgICAsIFwidmFsdWVzXCI6IGNhdGVnb3JpZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5ICE9IFwiTkFcIiB9KVxuICB9XG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2F0ZWdvcnlIb3VyKHZhbHVlKSB7XG4gIHZhbHVlW1wiY2F0ZWdvcnlfaG91clwiXSA9IGFnZ3JlZ2F0ZUNhdGVnb3J5SG91cih2YWx1ZS5mdWxsX3VybHMpXG59XG4iLCJpbXBvcnQge1xuICBwcmVwRGF0YSwgXG59IGZyb20gJy4uLy4uL2hlbHBlcnMnXG5pbXBvcnQge1xuICBhZ2dyZWdhdGVDYXRlZ29yeVxufSBmcm9tICcuL2NhdGVnb3J5J1xuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0SG91cihoKSB7XG4gIGlmIChoID09IDApIHJldHVybiBcIjEyIGFtXCJcbiAgaWYgKGggPT0gMTIpIHJldHVybiBcIjEyIHBtXCJcbiAgaWYgKGggPiAxMikgcmV0dXJuIChoLTEyKSArIFwiIHBtXCJcbiAgcmV0dXJuIChoIDwgMTAgPyBoWzFdIDogaCkgKyBcIiBhbVwiXG59XG5cbmV4cG9ydCBjb25zdCBob3VyYnVja2V0cyA9IGQzLnJhbmdlKDAsMjQpLm1hcCh4ID0+IFN0cmluZyh4KS5sZW5ndGggPiAxID8gU3RyaW5nKHgpIDogXCIwXCIgKyB4KVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUaW1pbmcodXJscywgY29tcGFyaXNvbikge1xuXG4gIHZhciB0cyA9IHByZXBEYXRhKHVybHMpXG4gICAgLCBwb3BfdHMgPSBwcmVwRGF0YShjb21wYXJpc29uKVxuXG4gIHZhciBtYXBwZWR0cyA9IHRzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjOyByZXR1cm4gcH0sIHt9KVxuXG4gIHZhciBwcmVwcGVkID0gcG9wX3RzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAga2V5OiB4LmtleVxuICAgICAgLCBob3VyOiB4LmhvdXJcbiAgICAgICwgbWludXRlOiB4Lm1pbnV0ZVxuICAgICAgLCB2YWx1ZTI6IHgudmFsdWVcbiAgICAgICwgdmFsdWU6IG1hcHBlZHRzW3gua2V5XSA/ICBtYXBwZWR0c1t4LmtleV0udmFsdWUgOiAwXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBwcmVwcGVkXG59XG5cbmV4cG9ydCBjb25zdCB0aW1pbmdUYWJ1bGFyID0gKGRhdGEsa2V5PVwiZG9tYWluXCIpID0+IHtcbiAgcmV0dXJuIGQzLm5lc3QoKVxuICAgIC5rZXkoeCA9PiB4W2tleV0pXG4gICAgLmtleSh4ID0+IHguaG91cilcbiAgICAuZW50cmllcyhkYXRhKVxuICAgIC5tYXAoeCA9PiB7XG4gICAgICB2YXIgb2JqID0geC52YWx1ZXMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgcFtjLmtleV0gPSBjLnZhbHVlc1xuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7fSlcblxuICAgICAgeC5idWNrZXRzID0gaG91cmJ1Y2tldHMubWFwKHogPT4ge1xuICAgICAgICB2YXIgbyA9IHsgdmFsdWVzOiBvYmpbel0sIGtleTogZm9ybWF0SG91cih6KSB9XG4gICAgICAgIG8udmlld3MgPSBkMy5zdW0ob2JqW3pdIHx8IFtdLCBxID0+IHEudW5pcXVlcylcbiAgICAgICAgcmV0dXJuIG9cbiAgICAgIH0pXG5cbiAgICAgIHgudGFidWxhciA9IHguYnVja2V0cy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBwW2Mua2V5XSA9IGMudmlld3MgfHwgdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICB4LnRhYnVsYXJbXCJrZXlcIl0gPSB4LmtleVxuICAgICAgeC50YWJ1bGFyW1widG90YWxcIl0gPSBkMy5zdW0oeC5idWNrZXRzLHggPT4geC52aWV3cylcbiAgICAgIFxuICAgICAgcmV0dXJuIHgudGFidWxhclxuICAgIH0pXG4gICAgLmZpbHRlcih4ID0+IHgua2V5ICE9IFwiTkFcIilcbn1cbiIsImltcG9ydCB7Zm9ybWF0SG91cn0gZnJvbSAnLi4vLi4vaGVscGVycy9kYXRhX2hlbHBlcnMvdGltaW5nJ1xuXG5leHBvcnQgY29uc3QgaG91cmJ1Y2tldHMgPSBkMy5yYW5nZSgwLDI0KS5tYXAoeCA9PiBTdHJpbmcoeCkubGVuZ3RoID4gMSA/IFN0cmluZyh4KSA6IFwiMFwiICsgeClcblxuZXhwb3J0IGNvbnN0IHRpbWluZ0hlYWRlcnMgPSBob3VyYnVja2V0cy5tYXAoZm9ybWF0SG91cikubWFwKHggPT4geyByZXR1cm4ge2tleTogeCwgdmFsdWU6IHh9IH0pXG4iLCJpbXBvcnQge2hvdXJidWNrZXRzLCB0aW1pbmdIZWFkZXJzfSBmcm9tICcuL3RpbWluZ19jb25zdGFudHMnXG5cblxuZXhwb3J0IGNvbnN0IGNvbXB1dGVTY2FsZSA9IChkYXRhLF9tYXgpID0+IHtcblxuICBjb25zdCBtYXggPSBfbWF4IHx8IDEwMDAgLy8gbmVlZCB0byBhY3R1YWxseSBjb21wdXRlIHRoaXMgZnJvbSBkYXRhXG5cbiAgcmV0dXJuIGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFswLC44XSkuZG9tYWluKFswLE1hdGgubG9nKG1heCldKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplUm93KHdlaWdodHMpIHtcblxuICByZXR1cm4gZnVuY3Rpb24gbm9ybWFsaXplKHgsbXVsdCkge1xuICAgIHZhciBrZXlzID0gdGltaW5nSGVhZGVycy5tYXAodCA9PiB0LmtleSlcbiAgICB2YXIgdmFsdWVzID0ga2V5cy5tYXAoayA9PiB4W2tdKVxuXG4gICAgdmFyIHRvdGFsID0gZDMuc3VtKHZhbHVlcylcblxuICAgIHZhciBlc3RpbWF0ZXMgPSBPYmplY3Qua2V5cyh3ZWlnaHRzKS5tYXAoayA9PiBNYXRoLnNxcnQod2VpZ2h0c1trXSp0b3RhbCkgKVxuXG4gICAgdmFyIG5vcm1hbGl6ZWQgPSB2YWx1ZXMubWFwKChrLGkpID0+IChrL2VzdGltYXRlc1tpXSkpXG4gICAgdmFyIHZhbHVlcyA9IHt9XG4gICAga2V5cy5tYXAoKGssaSkgPT4ge1xuICAgICAgdmFsdWVzW2tdID0gTWF0aC5yb3VuZChub3JtYWxpemVkW2ldKm11bHQgfHwgMCkgfHwgXCJcIlxuICAgIH0pXG4gICAgcmV0dXJuIHZhbHVlc1xuXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIGQzX2NsYXNzLCBEM0NvbXBvbmVudEJhc2UsIG5vb3B9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uLy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi8uLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0ICogYXMgdGltZXNlcmllcyBmcm9tICcuLi8uLi9nZW5lcmljL3RpbWVzZXJpZXMnXG5pbXBvcnQge2RvbWFpbl9leHBhbmRlZH0gZnJvbSAnY29tcG9uZW50J1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICdjaGFydCdcblxuaW1wb3J0IHtob3VyYnVja2V0cywgdGltaW5nSGVhZGVyc30gZnJvbSAnLi90aW1pbmdfY29uc3RhbnRzJ1xuaW1wb3J0IHtjb21wdXRlU2NhbGUsIG5vcm1hbGl6ZVJvd30gZnJvbSAnLi90aW1pbmdfcHJvY2VzcydcblxuXG5cbmltcG9ydCAnLi90aW1pbmcuY3NzJ1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRpbWluZyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBUaW1pbmcodGFyZ2V0KVxufVxuXG5jbGFzcyBUaW1pbmcgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIixcInRyYW5zZm9ybVwiLCBcInNvcnRcIiwgXCJhc2NlbmRpbmdcIl0gfVxuXG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YVxuICAgICAgLCBmaWx0ZXJlZCA9IGRhdGEuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5zZWxlY3RlZH0pXG4gICAgICAsIHNlbGVjdGVkID0gZmlsdGVyZWQubGVuZ3RoID8gZmlsdGVyZWRbMF0gOiBkYXRhWzBdXG5cblxuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwidGltaW5nLXdyYXBcIilcblxuXG5cbiAgICBjb25zdCBoZWFkZXJzID0gW3trZXk6XCJrZXlcIix2YWx1ZTpzZWxlY3RlZC5rZXkucmVwbGFjZShcIlRvcCBcIixcIlwiKX1dLmNvbmNhdCh0aW1pbmdIZWFkZXJzKVxuICAgIGNvbnN0IGQgPSBkYXRhWzBdLnZhbHVlcy8vdGltaW5nVGFidWxhcihkYXRhLmZ1bGxfdXJscylcblxuICAgIGNvbnN0IF9kZWZhdWx0ID0gXCJ0b3RhbFwiXG4gICAgY29uc3QgcyA9IHRoaXMuc29ydCgpIFxuICAgIGNvbnN0IGFzYyA9IHRoaXMuYXNjZW5kaW5nKCkgXG5cblxuICAgIGNvbnN0IHNlbGVjdGVkSGVhZGVyID0gaGVhZGVycy5maWx0ZXIoeCA9PiB4LmtleSA9PSBzKVxuICAgIGNvbnN0IHNvcnRieSA9IHNlbGVjdGVkSGVhZGVyLmxlbmd0aCA/IHNlbGVjdGVkSGVhZGVyWzBdLmtleSA6IF9kZWZhdWx0XG5cbiAgICBjb25zdCBob3VybHlUb3RhbHMgPSBzZWxlY3RlZC52YWx1ZXMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIHRpbWluZ0hlYWRlcnMubWFwKGsgPT4ge1xuICAgICAgICB2YXIgaCA9IGsua2V5XG4gICAgICAgIHBbaF0gPSAocFtoXSB8fCAwKSArIChjW2hdIHx8IDApXG4gICAgICB9KVxuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KVxuXG4gICAgY29uc3Qgb3ZlcmFsbFRvdGFsID0gZDMuc3VtKE9iamVjdC5rZXlzKGhvdXJseVRvdGFscykubWFwKGsgPT4gaG91cmx5VG90YWxzW2tdKSlcbiAgICBjb25zdCBwZXJjZW50VG90YWxzID0gT2JqZWN0LmtleXMoaG91cmx5VG90YWxzKS5yZWR1Y2UoKHAsaykgPT4ge1xuICAgICAgcFtrXSA9IGhvdXJseVRvdGFsc1trXS9vdmVyYWxsVG90YWxcbiAgICAgIHJldHVybiBwXG4gICAgfSx7fSlcblxuICAgIGNvbnN0IHJvd1ZhbHVlID0gc2VsZWN0ZWQudmFsdWVzLm1hcCh4ID0+IE1hdGguc3FydCgxICsgeC50b3RhbCkgKVxuICAgIGNvbnN0IG5vcm1hbGl6ZXIgPSBub3JtYWxpemVSb3cocGVyY2VudFRvdGFscylcblxuICAgIHZhciBtYXggPSAwXG4gICAgY29uc3QgdmFsdWVzID0gc2VsZWN0ZWQudmFsdWVzLm1hcCgocm93LGkpID0+IHtcbiAgICAgIFxuICAgICAgY29uc3Qgbm9ybWVkID0gdGhpcy50cmFuc2Zvcm0oKSA9PSBcIm5vcm1hbGl6ZVwiID8gbm9ybWFsaXplcihyb3cscm93VmFsdWVbaV0pIDogcm93XG4gICAgICBjb25zdCBsb2NhbF9tYXggPSBkMy5tYXgoT2JqZWN0LmtleXMobm9ybWVkKS5tYXAoayA9PiBub3JtZWRba10pKVxuICAgICAgbWF4ID0gbG9jYWxfbWF4ID4gbWF4ID8gbG9jYWxfbWF4IDogbWF4XG5cbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKG5vcm1lZCx7XCJrZXlcIjpyb3cua2V5fSlcbiAgICB9KVxuXG5cbiAgICBjb25zdCBvc2NhbGUgPSBjb21wdXRlU2NhbGUodmFsdWVzLG1heClcblxuXG4gICAgaGVhZGVyKHdyYXApXG4gICAgICAudGV4dChzZWxlY3RlZC5rZXkpXG4gICAgICAub3B0aW9ucyhkYXRhKVxuICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpIHsgdGhpcy5vbihcInNlbGVjdFwiKSh4KSB9LmJpbmQodGhpcykpXG4gICAgICAuZHJhdygpXG5cblxuICAgIHZhciB0cyA9IGQzX2NsYXNzKHdyYXAsXCJ0aW1lc2VyaWVzLXJvd1wiKVxuXG5cbiAgICB2YXIgdHJhbnNmb3JtX3NlbGVjdG9yID0gZDNfY2xhc3ModHMsXCJ0cmFuc2Zvcm1cIilcblxuICAgIHNlbGVjdCh0cmFuc2Zvcm1fc2VsZWN0b3IpXG4gICAgICAub3B0aW9ucyhbe1wia2V5XCI6XCJBY3Rpdml0eVwiLFwidmFsdWVcIjpmYWxzZX0se1wia2V5XCI6XCJOb3JtYWxpemVkXCIsXCJ2YWx1ZVwiOlwibm9ybWFsaXplXCJ9XSlcbiAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgc2VsZi5vbihcInRyYW5zZm9ybS5jaGFuZ2VcIikuYmluZCh0aGlzKSh4KVxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcblxuICAgIHZhciB0b2dnbGUgPSBkM19jbGFzcyh0cmFuc2Zvcm1fc2VsZWN0b3IsXCJzaG93LXZhbHVlc1wiKVxuXG5cblxuICAgIGQzX3VwZGF0ZWFibGUodG9nZ2xlLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgLnRleHQoXCJzaG93IHZhbHVlcz8gXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHRvZ2dsZSxcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgLm9uKFwiY2hhbmdlXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB0aW1pbmd3cmFwLmNsYXNzZWQoXCJzaG93LXZhbHVlc1wiLHRoaXMuY2hlY2tlZClcbiAgICAgIH0pXG5cblxuXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodHMsXCJzdmdcIixcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiw3NDQpLmF0dHIoXCJoZWlnaHRcIiw4MClcblxuICAgIHZhciB0b3RhbHMgPSB0aW1pbmdIZWFkZXJzLm1hcChoID0+IHtcbiAgICAgIHJldHVybiBob3VybHlUb3RhbHNbaC5rZXldXG4gICAgfSlcblxuICAgIHNpbXBsZVRpbWVzZXJpZXMoc3ZnLHRvdGFscyw3NDQsODAsLTEpXG5cbiAgICB2YXIgdGltaW5nd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJ0aW1pbmctcm93XCIpXG5cbiAgICB2YXIgdGFibGVfb2JqID0gdGFibGUodGltaW5nd3JhcClcbiAgICAgIC50b3AoMTQwKVxuICAgICAgLmhlYWRlcnMoaGVhZGVycylcbiAgICAgIC5zb3J0KHNvcnRieSxhc2MpXG4gICAgICAub24oXCJzb3J0XCIsIHRoaXMub24oXCJzb3J0XCIpKVxuICAgICAgLmRhdGEoe1widmFsdWVzXCI6dmFsdWVzfSlcbiAgICAgIC5za2lwX29wdGlvbih0cnVlKVxuICAgICAgLm9uKFwiZXhwYW5kXCIsZnVuY3Rpb24oZCx0ZCkge1xuXG4gICAgICAgIHZhciBkZCA9IGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmRvbWFpbiA9PSBkLmRvbWFpbiB9KVxuICAgICAgICB2YXIgcm9sbGVkID0gdGltZXNlcmllcy5wcmVwRGF0YShkZClcbiAgICAgICAgXG4gICAgICAgIGRvbWFpbl9leHBhbmRlZCh0ZClcbiAgICAgICAgICAuZG9tYWluKGRkWzBdLmRvbWFpbilcbiAgICAgICAgICAucmF3KGRkKVxuICAgICAgICAgIC5kYXRhKHJvbGxlZClcbiAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSh4KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmRyYXcoKVxuXG4gICAgICB9KVxuICAgICAgLm9uKFwiZHJhd1wiLGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpub3QoOmZpcnN0LWNoaWxkKVwiKVxuICAgICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX19beFsna2V5J11dIHx8IDBcbiAgICAgICAgICAgIHJldHVybiBcInJnYmEoNzAsIDEzMCwgMTgwLFwiICsgb3NjYWxlKE1hdGgubG9nKHZhbHVlKzEpKSArIFwiKVwiXG4gICAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgICAuZHJhdygpXG4gICAgXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4uL2dlbmVyaWMvc2VsZWN0J1xuXG5pbXBvcnQgKiBhcyB0YWJsZSBmcm9tICd0YWJsZSdcblxuZnVuY3Rpb24gZDNfY2xhc3ModGFyZ2V0LGNscyx0eXBlKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5cIiArIGNscywgdHlwZSB8fCBcImRpdlwiKVxuICAgIC5jbGFzc2VkKGNscyx0cnVlKVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzdGFnZWRfZmlsdGVyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN0YWdlZEZpbHRlcih0YXJnZXQpXG59XG5cbmNsYXNzIFN0YWdlZEZpbHRlciB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuX29uID0ge31cbiAgfVxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcblxuICBvbihhY3Rpb24sIGZuKSB7XG4gICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuXG4gIGRyYXcoKSB7XG4gICAgdmFyIG93cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwiZm9vdGVyLXdyYXBcIilcbiAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjYwcHhcIilcbiAgICAgIC5zdHlsZShcImJvdHRvbVwiLFwiMHB4XCIpXG4gICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAwcHhcIilcbiAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNGMEY0RjdcIilcblxuICAgIHZhciB3cmFwID0gZDNfY2xhc3Mob3dyYXAsXCJpbm5lci13cmFwXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItdG9wXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjVweFwiKVxuXG4gICAgZDNfY2xhc3Mod3JhcCxcImhlYWRlci1sYWJlbFwiKVxuICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM1cHhcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTRweFwiKVxuICAgICAgLnN0eWxlKFwiY29sb3JcIixcIiM4ODg4ODhcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgLnRleHQoXCJCdWlsZCBGaWx0ZXJzXCIpXG5cbiAgICBkM19jbGFzcyh3cmFwLFwidGV4dC1sYWJlbFwiKVxuICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM1cHhcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjYwcHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcIm5vbmVcIilcbiAgICAgIC50ZXh0KFwiVGl0bGVcIilcblxuICAgIHZhciBzZWxlY3RfYm94ID0gc2VsZWN0KHdyYXApXG4gICAgICAub3B0aW9ucyhbXG4gICAgICAgICAge1wia2V5XCI6XCJjb250YWluc1wiLFwidmFsdWVcIjpcImNvbnRhaW5zXCJ9XG4gICAgICAgICwge1wia2V5XCI6XCJkb2VzIG5vdCBjb250YWluXCIsXCJ2YWx1ZVwiOlwiZG9lcyBub3QgY29udGFpblwifVxuICAgICAgXSlcbiAgICAgIC5kcmF3KClcbiAgICAgIC5fc2VsZWN0XG4gICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cblxuICAgIHZhciBmb290ZXJfcm93ID0gZDNfY2xhc3Mod3JhcCxcImZvb3Rlci1yb3dcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG5cbiAgICB2YXIgc2VsZWN0X3ZhbHVlID0gdGhpcy5kYXRhKClcblxuICAgIGZ1bmN0aW9uIGJ1aWxkRmlsdGVySW5wdXQoKSB7XG5cbiAgICAgIGZvb3Rlcl9yb3cuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZGVzdHJveSA9IGQzLnNlbGVjdCh0aGlzKS5vbihcImRlc3Ryb3lcIilcbiAgICAgICAgICBpZiAoZGVzdHJveSkgZGVzdHJveSgpXG4gICAgICAgIH0pXG5cblxuICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZm9vdGVyX3JvdyxcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjIwMHB4XCIpXG4gICAgICAgIC5hdHRyKFwidmFsdWVcIixzZWxlY3RfdmFsdWUpXG4gICAgICAgIC5wcm9wZXJ0eShcInZhbHVlXCIsc2VsZWN0X3ZhbHVlKVxuXG4gICAgICBcblxuXG4gICAgICB2YXIgcyA9ICQoc2VsZWN0Lm5vZGUoKSkuc2VsZWN0aXplKHtcbiAgICAgICAgcGVyc2lzdDogZmFsc2UsXG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZWN0X3ZhbHVlID0gKHNlbGVjdF92YWx1ZS5sZW5ndGggPyBzZWxlY3RfdmFsdWUgKyBcIixcIiA6IFwiXCIpICsgeFxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZWN0X3ZhbHVlKVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogeCwgdGV4dDogeFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb25EZWxldGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGVjdF92YWx1ZSA9IHNlbGVjdF92YWx1ZS5zcGxpdChcIixcIikuZmlsdGVyKGZ1bmN0aW9uKHopIHsgcmV0dXJuIHogIT0geFswXX0pLmpvaW4oXCIsXCIpXG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxlY3RfdmFsdWUpXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHZhbHVlOiB4LCB0ZXh0OiB4XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICBmb290ZXJfcm93LnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAub24oXCJkZXN0cm95XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc1swXS5zZWxlY3RpemUuZGVzdHJveSgpXG4gICAgICAgIH0pXG5cbiAgICB9XG5cbiAgICBidWlsZEZpbHRlcklucHV0KClcblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIGQzX2NsYXNzKHdyYXAsXCJpbmNsdWRlLXN1Ym1pdFwiLFwiYnV0dG9uXCIpXG4gICAgICAuc3R5bGUoXCJmbG9hdFwiLFwicmlnaHRcIilcbiAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLFwiMTIwcHhcIilcbiAgICAgIC5zdHlsZShcImJvcmRlci1yYWRpdXNcIixcIjVweFwiKVxuICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI5cHhcIilcbiAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmOWY5ZmJcIilcbiAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgIC5zdHlsZShcImJvcmRlci1yYWRpdXNcIixcIjVweFwiKVxuICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJzdWJtaXRcIilcbiAgICAgIC50ZXh0KFwiTW9kaWZ5IEZpbHRlcnNcIilcbiAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGZvb3Rlcl9yb3cuc2VsZWN0QWxsKFwiaW5wdXRcIikucHJvcGVydHkoXCJ2YWx1ZVwiKVxuICAgICAgICB2YXIgb3AgPSAgc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleSArIFwiLnNlbGVjdGl6ZVwiXG4gICAgICAgIFxuICAgICAgICBzZWxmLm9uKFwibW9kaWZ5XCIpKHtcImZpZWxkXCI6XCJUaXRsZVwiLFwib3BcIjpvcCxcInZhbHVlXCI6dmFsdWV9KVxuICAgICAgfSlcblxuICAgIGQzX2NsYXNzKHdyYXAsXCJleGNsdWRlLXN1Ym1pdFwiLFwiYnV0dG9uXCIpXG4gICAgICAuc3R5bGUoXCJmbG9hdFwiLFwicmlnaHRcIilcbiAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLFwiMTIwcHhcIilcbiAgICAgIC5zdHlsZShcImJvcmRlci1yYWRpdXNcIixcIjVweFwiKVxuICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI5cHhcIilcbiAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmOWY5ZmJcIilcbiAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgIC5zdHlsZShcImJvcmRlci1yYWRpdXNcIixcIjVweFwiKVxuICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJzdWJtaXRcIilcbiAgICAgIC50ZXh0KFwiTmV3IEZpbHRlclwiKVxuICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCJpbnB1dFwiKS5wcm9wZXJ0eShcInZhbHVlXCIpXG4gICAgICAgIHZhciBvcCA9ICBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18ua2V5ICsgXCIuc2VsZWN0aXplXCJcblxuICAgICAgICBzZWxmLm9uKFwiYWRkXCIpKHtcImZpZWxkXCI6XCJUaXRsZVwiLFwib3BcIjpvcCxcInZhbHVlXCI6dmFsdWV9KVxuICAgICAgfSlcblxuXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi9oZWFkZXInXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5leHBvcnQgZnVuY3Rpb24gQ29uZGl0aW9uYWxTaG93KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMuX2NsYXNzZXMgPSB7fVxuICB0aGlzLl9vYmplY3RzID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29uZGl0aW9uYWxfc2hvdyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBDb25kaXRpb25hbFNob3codGFyZ2V0KVxufVxuXG5Db25kaXRpb25hbFNob3cucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgY2xhc3NlZDogZnVuY3Rpb24oaywgdikge1xuICAgICAgaWYgKGsgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2NsYXNzZXNcbiAgICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9jbGFzc2VzW2tdIFxuICAgICAgdGhpcy5fY2xhc3Nlc1trXSA9IHY7XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH0gIFxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgdmFyIGNsYXNzZXMgPSB0aGlzLmNsYXNzZWQoKVxuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuY29uZGl0aW9uYWwtd3JhcFwiLFwiZGl2XCIsdGhpcy5kYXRhKCkpXG4gICAgICAgIC5jbGFzc2VkKFwiY29uZGl0aW9uYWwtd3JhcFwiLHRydWUpXG5cbiAgICAgIHZhciBvYmplY3RzID0gZDNfc3BsYXQod3JhcCxcIi5jb25kaXRpb25hbFwiLFwiZGl2XCIsaWRlbnRpdHksIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSB9KVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJjb25kaXRpb25hbFwiLHRydWUpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuICF4LnNlbGVjdGVkIH0pXG5cblxuICAgICAgT2JqZWN0LmtleXMoY2xhc3NlcykubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgIG9iamVjdHMuY2xhc3NlZChrLGNsYXNzZXNba10pXG4gICAgICB9KVxuXG4gICAgICB0aGlzLl9vYmplY3RzID0gb2JqZWN0c1xuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gIFxuICAgIH1cbiAgLCBlYWNoOiBmdW5jdGlvbihmbikge1xuICAgICAgdGhpcy5kcmF3KClcbiAgICAgIHRoaXMuX29iamVjdHMuZWFjaChmbilcbiAgICAgIFxuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBTaGFyZSh0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gIHRoaXMuX2lubmVyID0gZnVuY3Rpb24oKSB7fVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzaGFyZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTaGFyZSh0YXJnZXQpXG59XG5cblNoYXJlLnByb3RvdHlwZSA9IHtcbiAgICBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIG92ZXJsYXkgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5vdmVybGF5XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJvdmVybGF5XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJmaXhlZFwiKVxuICAgICAgICAuc3R5bGUoXCJ0b3BcIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCJyZ2JhKDAsMCwwLC41KVwiKVxuICAgICAgICAuc3R5bGUoXCJ6LWluZGV4XCIsXCIzMDFcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpIHtcbiAgICAgICAgICBvdmVybGF5LnJlbW92ZSgpXG4gICAgICAgIH0pXG5cbiAgICAgIHRoaXMuX292ZXJsYXkgPSBvdmVybGF5O1xuXG4gICAgICB2YXIgY2VudGVyID0gZDNfdXBkYXRlYWJsZShvdmVybGF5LFwiLnBvcHVwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJwb3B1cCBjb2wtbWQtNSBjb2wtc20tOFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCJhdXRvXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiYXV0b1wiKVxuICAgICAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCIzMDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIxNTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJ3aGl0ZVwiKVxuICAgICAgICAuc3R5bGUoXCJmbG9hdFwiLFwibm9uZVwiKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGQzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgICAgIH0pXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBzZWxmLl9pbm5lcihkMy5zZWxlY3QodGhpcykpXG4gICAgICAgIH0pXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGlubmVyOiBmdW5jdGlvbihmbikge1xuICAgICAgdGhpcy5faW5uZXIgPSBmbi5iaW5kKHRoaXMpXG4gICAgICB0aGlzLmRyYXcoKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9vdmVybGF5LnJlbW92ZSgpXG4gICAgICByZXR1cm4gdGhpcyBcbiAgICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0ICogYXMgc3RhdGUgZnJvbSAnc3RhdGUnXG5pbXBvcnQge21lZGlhX3BsYW59IGZyb20gJ21lZGlhX3BsYW4nXG5pbXBvcnQgZmlsdGVyX3ZpZXcgZnJvbSAnLi92aWV3cy9maWx0ZXJfdmlldydcbmltcG9ydCBvcHRpb25fdmlldyBmcm9tICcuL3ZpZXdzL29wdGlvbl92aWV3J1xuaW1wb3J0IGRvbWFpbl92aWV3IGZyb20gJy4vdmlld3MvZG9tYWluX3ZpZXcnXG5pbXBvcnQgc2VnbWVudF92aWV3IGZyb20gJy4vdmlld3Mvc2VnbWVudF92aWV3J1xuaW1wb3J0IHN1bW1hcnlfdmlldyBmcm9tICcuL3ZpZXdzL3N1bW1hcnkvdmlldydcbmltcG9ydCByZWxhdGl2ZV92aWV3IGZyb20gJy4vdmlld3MvcmVsYXRpdmVfdGltaW5nL3ZpZXcnXG5pbXBvcnQgdGltaW5nX3ZpZXcgZnJvbSAnLi92aWV3cy90aW1pbmcvdmlldydcbmltcG9ydCBzdGFnZWRfZmlsdGVyX3ZpZXcgZnJvbSAnLi92aWV3cy9zdGFnZWRfZmlsdGVyX3ZpZXcnXG5cblxuXG5cblxuaW1wb3J0IGNvbmRpdGlvbmFsX3Nob3cgZnJvbSAnLi9nZW5lcmljL2NvbmRpdGlvbmFsX3Nob3cnXG5cbmltcG9ydCBzaGFyZSBmcm9tICcuL2dlbmVyaWMvc2hhcmUnXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuL2hlbHBlcnMnXG5pbXBvcnQgKiBhcyB0cmFuc2Zvcm0gZnJvbSAnLi9oZWxwZXJzJ1xuXG5mdW5jdGlvbiBub29wKCkge31cblxuZXhwb3J0IGZ1bmN0aW9uIE5ld0Rhc2hib2FyZCh0YXJnZXQpIHtcbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5fb24gPSB7fVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBuZXdfZGFzaGJvYXJkKHRhcmdldCkge1xuICByZXR1cm4gbmV3IE5ld0Rhc2hib2FyZCh0YXJnZXQpXG59XG5cbk5ld0Rhc2hib2FyZC5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCB0cmFuc2Zvcm06IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0cmFuc2Zvcm1cIix2YWwpIHx8IFwiXCJcbiAgICB9XG4gICwgc3RhZ2VkX2ZpbHRlcnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzdGFnZWRfZmlsdGVyc1wiLHZhbCkgfHwgXCJcIlxuICAgIH1cbiAgLCBtZWRpYTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm1lZGlhXCIsdmFsKSBcbiAgICB9XG4gICwgc2F2ZWQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzYXZlZFwiLHZhbCkgXG4gICAgfVxuICAsIGxpbmVfaXRlbXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsaW5lX2l0ZW1zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBzZWxlY3RlZF9hY3Rpb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWxlY3RlZF9hY3Rpb25cIix2YWwpIFxuICAgIH1cbiAgLCBzZWxlY3RlZF9jb21wYXJpc29uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2VsZWN0ZWRfY29tcGFyaXNvblwiLHZhbCkgXG4gICAgfVxuICAsIGFjdGlvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uX2RhdGVcIix2YWwpIFxuICAgIH1cbiAgLCBjb21wYXJpc29uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uX2RhdGVcIix2YWwpIFxuICAgIH1cblxuICAsIHZpZXdfb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZpZXdfb3B0aW9uc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgbG9naWNfb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljX29wdGlvbnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGV4cGxvcmVfdGFiczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImV4cGxvcmVfdGFic1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgbG9naWNfY2F0ZWdvcmllczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljX2NhdGVnb3JpZXNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGFjdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBzdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgdGltZV9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGltZV9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCB0aW1lX3RhYnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aW1lX3RhYnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGNhdGVnb3J5X3N1bW1hcnk6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjYXRlZ29yeV9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBrZXl3b3JkX3N1bW1hcnk6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXl3b3JkX3N1bW1hcnlcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGJlZm9yZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJlZm9yZVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgYmVmb3JlX3RhYnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiZWZvcmVfdGFic1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgYWZ0ZXI6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhZnRlclwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgZmlsdGVyczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImZpbHRlcnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGxvYWRpbmc6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkKSB0aGlzLl9zZWdtZW50X3ZpZXcgJiYgdGhpcy5fc2VnbWVudF92aWV3LmlzX2xvYWRpbmcodmFsKS5kcmF3KClcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibG9hZGluZ1wiLHZhbClcbiAgICB9XG4gICwgc29ydDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNvcnRcIix2YWwpXG4gICAgfVxuICAsIGFzY2VuZGluZzogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFzY2VuZGluZ1wiLHZhbClcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhKClcbiAgICAgIHZhciBtZWRpYSA9IHRoaXMubWVkaWEoKVxuXG4gICAgICB2YXIgb3B0aW9ucyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy52aWV3X29wdGlvbnMoKSkpXG4gICAgICB2YXIgdGFicyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5leHBsb3JlX3RhYnMoKSkpXG5cblxuICAgICAgdmFyIGxvZ2ljID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmxvZ2ljX29wdGlvbnMoKSkpXG4gICAgICAgICwgY2F0ZWdvcmllcyA9IHRoaXMubG9naWNfY2F0ZWdvcmllcygpXG4gICAgICAgICwgZmlsdGVycyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5maWx0ZXJzKCkpKVxuICAgICAgICAsIGFjdGlvbnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuYWN0aW9ucygpKSlcbiAgICAgICAgLCBzdGFnZWRfZmlsdGVycyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5zdGFnZWRfZmlsdGVycygpKSlcblxuXG5cbiAgICAgIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldFxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIHRoaXMuX3NlZ21lbnRfdmlldyA9IHNlZ21lbnRfdmlldyh0YXJnZXQpXG4gICAgICAgIC5pc19sb2FkaW5nKHNlbGYubG9hZGluZygpIHx8IGZhbHNlKVxuICAgICAgICAuc2VnbWVudHMoYWN0aW9ucylcbiAgICAgICAgLmRhdGEoc2VsZi5zdW1tYXJ5KCkpXG4gICAgICAgIC5hY3Rpb24oc2VsZi5zZWxlY3RlZF9hY3Rpb24oKSB8fCB7fSlcbiAgICAgICAgLmFjdGlvbl9kYXRlKHNlbGYuYWN0aW9uX2RhdGUoKSB8fCBcIlwiKVxuICAgICAgICAuY29tcGFyaXNvbl9kYXRlKHNlbGYuY29tcGFyaXNvbl9kYXRlKCkgfHwgXCJcIilcblxuICAgICAgICAuY29tcGFyaXNvbihzZWxmLnNlbGVjdGVkX2NvbXBhcmlzb24oKSB8fCB7fSlcbiAgICAgICAgLm9uKFwiY2hhbmdlXCIsIHRoaXMub24oXCJhY3Rpb24uY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIiwgdGhpcy5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiKSlcbiAgICAgICAgLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIiwgdGhpcy5vbihcImNvbXBhcmlzb24uY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIsIHRoaXMub24oXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJzYXZlZC1zZWFyY2guY2xpY2tcIiwgZnVuY3Rpb24oKSB7ICBcbiAgICAgICAgICB2YXIgc3MgPSBzaGFyZShkMy5zZWxlY3QoXCJib2R5XCIpKS5kcmF3KClcbiAgICAgICAgICBzcy5pbm5lcihmdW5jdGlvbih0YXJnZXQpIHtcblxuICAgICAgICAgICAgdmFyIGhlYWRlciA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLmhlYWRlclwiLFwiaDRcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJoZWFkZXJcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LWZhbWlseVwiLFwiUHJveGltYU5vdmEsIHNhbnMtc2VyaWZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiT3BlbiBhIHNhdmVkIGRhc2hib2FyZFwiKVxuXG4gICAgICAgICAgICB2YXIgZm9ybSA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZGl2XCIsXCJkaXZcIixzZWxmLnNhdmVkKCkpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImxlZnRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIyNSVcIilcblxuICAgICAgICAgICAgaWYgKCFzZWxmLnNhdmVkKCkgfHwgc2VsZi5zYXZlZCgpLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUoZm9ybSxcInNwYW5cIixcInNwYW5cIilcbiAgICAgICAgICAgICAgICAudGV4dChcIllvdSBjdXJyZW50bHkgaGF2ZSBubyBzYXZlZCBkYXNoYm9hcmRzXCIpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkM19zcGxhdChmb3JtLFwiLnJvd1wiLFwiYVwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSxmdW5jdGlvbih4KSB7IHJldHVybiB4Lm5hbWUgfSlcbiAgICAgICAgICAgICAgICAuY2xhc3NlZChcInJvd1wiLHRydWUpXG4gICAgICAgICAgICAgICAgLy8uYXR0cihcImhyZWZcIiwgeCA9PiB4LmVuZHBvaW50KVxuICAgICAgICAgICAgICAgIC50ZXh0KHggPT4geC5uYW1lKVxuICAgICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEhBQ0s6IFRISVMgaXMgaGFja3kuLi5cbiAgICAgICAgICAgICAgICAgIHZhciBfc3RhdGUgPSBzdGF0ZS5xcyh7fSkuZnJvbShcIj9cIiArIHguZW5kcG9pbnQuc3BsaXQoXCI/XCIpWzFdKVxuXG4gICAgICAgICAgICAgICAgICBzcy5oaWRlKClcbiAgICAgICAgICAgICAgICAgIHdpbmRvdy5vbnBvcHN0YXRlKHtzdGF0ZTogX3N0YXRlfSlcbiAgICAgICAgICAgICAgICAgIGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0pXG5cbiAgICAgICAgfSlcbiAgICAgICAgLm9uKFwibmV3LXNhdmVkLXNlYXJjaC5jbGlja1wiLCBmdW5jdGlvbigpIHsgXG4gICAgICAgICAgdmFyIHNzID0gc2hhcmUoZDMuc2VsZWN0KFwiYm9keVwiKSkuZHJhdygpXG4gICAgICAgICAgc3MuaW5uZXIoZnVuY3Rpb24odGFyZ2V0KSB7XG5cbiAgICAgICAgICAgIHZhciBoZWFkZXIgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5oZWFkZXJcIixcImg0XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwiaGVhZGVyXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMzBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMzBweFwiKVxuICAgICAgICAgICAgICAudGV4dChcIlNhdmUgdGhpcyBkYXNoYm9hcmQ6XCIpXG5cbiAgICAgICAgICAgIHZhciBmb3JtID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJkaXZcIixcImRpdlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcblxuICAgICAgICAgICAgdmFyIG5hbWUgPSBkM191cGRhdGVhYmxlKGZvcm0sIFwiLm5hbWVcIiwgXCJkaXZcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShuYW1lLFwiLmxhYmVsXCIsXCJkaXZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAudGV4dChcIkRhc2hib2FyZCBOYW1lOlwiKVxuXG4gICAgICAgICAgICB2YXIgbmFtZV9pbnB1dCA9IGQzX3VwZGF0ZWFibGUobmFtZSxcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjcwcHhcIilcbiAgICAgICAgICAgICAgLmF0dHIoXCJwbGFjZWhvbGRlclwiLFwiTXkgYXdlc29tZSBzZWFyY2hcIilcblxuICAgICAgICAgICAgdmFyIGFkdmFuY2VkID0gZDNfdXBkYXRlYWJsZShmb3JtLCBcIi5hZHZhbmNlZFwiLCBcImRldGFpbHNcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJhZHZhbmNlZFwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI0MDBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiYXV0b1wiKVxuXG5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShhZHZhbmNlZCxcIi5sYWJlbFwiLFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMzBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LWZhbWlseVwiLFwiUHJveGltYU5vdmEsIHNhbnMtc2VyaWZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImxlZnRcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJMaW5lIEl0ZW06XCIpXG5cbiAgICAgICAgICAgIHZhciBzZWxlY3RfYm94ID0gc2VsZWN0KGFkdmFuY2VkKVxuICAgICAgICAgICAgICAub3B0aW9ucyhzZWxmLmxpbmVfaXRlbXMoKS5tYXAoeCA9PiB7IHJldHVybiB7a2V5OngubGluZV9pdGVtX25hbWUsIHZhbHVlOiB4LmxpbmVfaXRlbV9pZH0gfSkgKVxuICAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgICAgIC5fc2VsZWN0XG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNzBweFwiKVxuXG5cblxuXG4gICAgICAgICAgICB2YXIgc2VuZCA9IGQzX3VwZGF0ZWFibGUoZm9ybSwgXCIuc2VuZFwiLCBcImRpdlwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInNlbmRcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcblxuXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKHNlbmQsXCJidXR0b25cIixcImJ1dHRvblwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMTZweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiU2VuZFwiKVxuICAgICAgICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IG5hbWVfaW5wdXQucHJvcGVydHkoXCJ2YWx1ZVwiKSBcbiAgICAgICAgICAgICAgICB2YXIgbGluZV9pdGVtID0gc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zLmxlbmd0aCA/IHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXkgOiBmYWxzZVxuXG4gICAgICAgICAgICAgICAgZDMueGhyKFwiL2NydXNoZXIvc2F2ZWRfZGFzaGJvYXJkXCIpXG4gICAgICAgICAgICAgICAgICAucG9zdChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogbmFtZVxuICAgICAgICAgICAgICAgICAgICAgICwgXCJlbmRwb2ludFwiOiB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyB3aW5kb3cubG9jYXRpb24uc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgLCBcImxpbmVfaXRlbVwiOiBsaW5lX2l0ZW1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIClcblxuICAgICAgICAgICAgICAgIHNzLmhpZGUoKVxuXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC50ZXh0KFwiU2F2ZVwiKVxuXG5cblxuICAgICAgICAgIH0pXG5cblxuICAgICAgICB9KVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIGlmICh0aGlzLnN1bW1hcnkoKSA9PSBmYWxzZSkgcmV0dXJuIGZhbHNlXG5cbiAgICAgIGZpbHRlcl92aWV3KHRhcmdldClcbiAgICAgICAgLmxvZ2ljKGxvZ2ljKVxuICAgICAgICAuY2F0ZWdvcmllcyhjYXRlZ29yaWVzKVxuICAgICAgICAuZmlsdGVycyhmaWx0ZXJzKVxuICAgICAgICAuZGF0YShkYXRhKVxuICAgICAgICAub24oXCJsb2dpYy5jaGFuZ2VcIiwgdGhpcy5vbihcImxvZ2ljLmNoYW5nZVwiKSlcbiAgICAgICAgLm9uKFwiZmlsdGVyLmNoYW5nZVwiLCB0aGlzLm9uKFwiZmlsdGVyLmNoYW5nZVwiKSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICBvcHRpb25fdmlldyh0YXJnZXQpXG4gICAgICAgIC5kYXRhKG9wdGlvbnMpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCB0aGlzLm9uKFwidmlldy5jaGFuZ2VcIikgKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIGNvbmRpdGlvbmFsX3Nob3codGFyZ2V0KVxuICAgICAgICAuZGF0YShvcHRpb25zKVxuICAgICAgICAuY2xhc3NlZChcInZpZXctb3B0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLmRyYXcoKVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICBpZiAoIXguc2VsZWN0ZWQpIHJldHVyblxuXG4gICAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpXG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcImRhdGEtdmlld1wiKSB7XG4gICAgICAgICAgICB2YXIgZHYgPSBkb21haW5fdmlldyhkdGhpcylcbiAgICAgICAgICAgICAgLm9wdGlvbnModGFicylcbiAgICAgICAgICAgICAgLmRhdGEoZGF0YSlcbiAgICAgICAgICAgICAgLnNvcnQoc2VsZi5zb3J0KCkpXG4gICAgICAgICAgICAgIC5hc2NlbmRpbmcoc2VsZi5hc2NlbmRpbmcoKSlcbiAgICAgICAgICAgICAgLm9uKFwic2VsZWN0XCIsIHNlbGYub24oXCJ0YWIuY2hhbmdlXCIpIClcbiAgICAgICAgICAgICAgLm9uKFwic29ydFwiLCBzZWxmLm9uKFwic29ydC5jaGFuZ2VcIikgKVxuXG4gICAgICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgICAgICAgc3RhZ2VkX2ZpbHRlcnMgPSBzdGFnZWRfZmlsdGVycy5zcGxpdChcIixcIikuY29uY2F0KHgua2V5IHx8IHgudXJsKS5maWx0ZXIoeCA9PiB4Lmxlbmd0aCkuam9pbihcIixcIilcbiAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKShzdGFnZWRfZmlsdGVycylcbiAgICAgICAgICAgICAgIEhBQ0tidWlsZFN0YWdlZEZpbHRlcihzdGFnZWRfZmlsdGVycylcbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcIm1lZGlhLXZpZXdcIikge1xuICAgICAgICAgICAgbWVkaWFfcGxhbihkdGhpcy5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTVweFwiKS5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiLTE1cHhcIikpXG4gICAgICAgICAgICAgLmRhdGEoZGF0YSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJiYS12aWV3XCIpIHtcbiAgICAgICAgICAgIHJlbGF0aXZlX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLnRyYW5zZm9ybShzZWxmLnRyYW5zZm9ybSgpKVxuICAgICAgICAgICAgIC5kYXRhKHNlbGYuYmVmb3JlX3RhYnMoKSlcbiAgICAgICAgICAgICAuc29ydChzZWxmLnNvcnQoKSlcbiAgICAgICAgICAgICAuYXNjZW5kaW5nKHNlbGYuYXNjZW5kaW5nKCkpXG4gICAgICAgICAgICAgLm9uKFwidHJhbnNmb3JtLmNoYW5nZVwiLCBzZWxmLm9uKFwidHJhbnNmb3JtLmNoYW5nZVwiKSApXG4gICAgICAgICAgICAgLm9uKFwic2VsZWN0XCIsIHNlbGYub24oXCJ0YWIuY2hhbmdlXCIpIClcbiAgICAgICAgICAgICAub24oXCJzb3J0XCIsIHNlbGYub24oXCJzb3J0LmNoYW5nZVwiKSApXG4gICAgICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgICAgICBzdGFnZWRfZmlsdGVycyA9IHN0YWdlZF9maWx0ZXJzLnNwbGl0KFwiLFwiKS5jb25jYXQoeC5rZXkgfHwgeC51cmwpLmZpbHRlcih4ID0+IHgubGVuZ3RoKS5qb2luKFwiLFwiKVxuICAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKHN0YWdlZF9maWx0ZXJzKVxuICAgICAgICAgICAgICAgSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZF9maWx0ZXJzKVxuXG4gICAgXG4gICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJzdW1tYXJ5LXZpZXdcIikge1xuICAgICAgICAgICAgc3VtbWFyeV92aWV3KGR0aGlzKVxuICAgICAgICAgICAgIC5kYXRhKHNlbGYuc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC50aW1pbmcoc2VsZi50aW1lX3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAuY2F0ZWdvcnkoc2VsZi5jYXRlZ29yeV9zdW1tYXJ5KCkpXG4gICAgICAgICAgICAgLmJlZm9yZShzZWxmLmJlZm9yZSgpKVxuICAgICAgICAgICAgIC8vLmFmdGVyKHNlbGYuYWZ0ZXIoKSlcbiAgICAgICAgICAgICAua2V5d29yZHMoc2VsZi5rZXl3b3JkX3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAub24oXCJiYS5zb3J0XCIsc2VsZi5vbihcImJhLnNvcnRcIikpXG4gICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwidGltaW5nLXZpZXdcIikge1xuICAgICAgICAgICAgdGltaW5nX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi50aW1lX3RhYnMoKSlcbiAgICAgICAgICAgICAudHJhbnNmb3JtKHNlbGYudHJhbnNmb3JtKCkpXG4gICAgICAgICAgICAgLnNvcnQoc2VsZi5zb3J0KCkpXG4gICAgICAgICAgICAgLmFzY2VuZGluZyhzZWxmLmFzY2VuZGluZygpKVxuICAgICAgICAgICAgIC5vbihcInRyYW5zZm9ybS5jaGFuZ2VcIiwgc2VsZi5vbihcInRyYW5zZm9ybS5jaGFuZ2VcIikgKVxuICAgICAgICAgICAgIC5vbihcInNlbGVjdFwiLCBzZWxmLm9uKFwidGFiLmNoYW5nZVwiKSApXG4gICAgICAgICAgICAgLm9uKFwic29ydFwiLCBzZWxmLm9uKFwic29ydC5jaGFuZ2VcIikgKVxuXG4gICAgICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgICAgICBzdGFnZWRfZmlsdGVycyA9IHN0YWdlZF9maWx0ZXJzLnNwbGl0KFwiLFwiKS5jb25jYXQoeC5rZXkgfHwgeC51cmwpLmZpbHRlcih4ID0+IHgubGVuZ3RoKS5qb2luKFwiLFwiKVxuICAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKHN0YWdlZF9maWx0ZXJzKVxuICAgICAgICAgICAgICAgSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZF9maWx0ZXJzKVxuXG4gICAgXG4gICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pXG5cbiAgICAgIGZ1bmN0aW9uIEhBQ0tidWlsZFN0YWdlZEZpbHRlcihzdGFnZWQpIHtcblxuICAgICAgICBzdGFnZWRfZmlsdGVyX3ZpZXcodGFyZ2V0KVxuICAgICAgICAgIC5kYXRhKHN0YWdlZClcbiAgICAgICAgICAub24oXCJ1cGRhdGVcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoeClcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vbihcIm1vZGlmeVwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKShcIlwiKVxuICAgICAgICAgICAgc2VsZi5vbihcIm1vZGlmeS1maWx0ZXJcIikoeClcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgLm9uKFwiYWRkXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKFwiXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwiYWRkLWZpbHRlclwiKSh4KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmRyYXcoKVxuICAgICAgfVxuICAgICAgSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZF9maWx0ZXJzKVxuXG4gICAgICByZXR1cm4gdGhpc1xuXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG59XG4iLCJleHBvcnQgZnVuY3Rpb24gZ2V0RGF0YShhY3Rpb24sZGF5c19hZ28pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNiKXtcbiAgICBjb25zb2xlLmxvZyhkYXlzX2FnbylcblxuICAgIHZhciBVUkwgPSBcIi9jcnVzaGVyL3YyL3Zpc2l0b3IvZG9tYWluc19mdWxsX3RpbWVfbWludXRlL2NhY2hlP3VybF9wYXR0ZXJuPVwiICsgYWN0aW9uLnVybF9wYXR0ZXJuWzBdICsgXCImZmlsdGVyX2lkPVwiICsgYWN0aW9uLmFjdGlvbl9pZFxuXG4gICAgdmFyIGRhdGVfYWdvID0gbmV3IERhdGUoK25ldyBEYXRlKCktMjQqNjAqNjAqMTAwMCpkYXlzX2FnbylcbiAgICAgICwgZGF0ZSA9IGQzLnRpbWUuZm9ybWF0KFwiJVktJW0tJWRcIikoZGF0ZV9hZ28pXG5cbiAgICBpZiAoZGF5c19hZ28pIFVSTCArPSBcIiZkYXRlPVwiICsgZGF0ZVxuXG5cbiAgICBkMy5qc29uKFVSTCxmdW5jdGlvbih2YWx1ZSkge1xuXG4gICAgICB2YXIgY2F0ZWdvcmllcyA9IHZhbHVlLnN1bW1hcnkuY2F0ZWdvcnkubWFwKGZ1bmN0aW9uKHgpIHt4LmtleSA9IHgucGFyZW50X2NhdGVnb3J5X25hbWU7IHJldHVybiB4fSlcbiAgICAgIHZhbHVlLmNhdGVnb3JpZXMgPSBjYXRlZ29yaWVzXG4gICAgICB2YWx1ZS5jYXRlZ29yeSA9IHZhbHVlLnN1bW1hcnkuY2F0ZWdvcnlcbiAgICAgIHZhbHVlLmN1cnJlbnRfaG91ciA9IHZhbHVlLnN1bW1hcnkuaG91clxuICAgICAgdmFsdWUuY2F0ZWdvcnlfaG91ciA9IHZhbHVlLnN1bW1hcnkuY3Jvc3Nfc2VjdGlvblxuXG4gICAgICB2YWx1ZS5vcmlnaW5hbF91cmxzID0gdmFsdWUucmVzcG9uc2VcblxuICAgICAgY2IoZmFsc2UsdmFsdWUpXG4gICAgfSlcbiAgfVxuXG59XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlKGRhdGEsY2IpIHtcbiAgZDMueGhyKFwiL2NydXNoZXIvZnVubmVsL2FjdGlvbj9mb3JtYXQ9anNvblwiKVxuICAgIC5oZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpXG4gICAgLnBvc3QoSlNPTi5zdHJpbmdpZnkoZGF0YSksZnVuY3Rpb24oZXJyLGRhdGEpIHtcbiAgICAgIGNiKGVycixKU09OLnBhcnNlKGRhdGEucmVzcG9uc2UpLnJlc3BvbnNlKVxuICAgIH0pXG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbChjYikge1xuICBkMy5qc29uKFwiL2NydXNoZXIvZnVubmVsL2FjdGlvbj9mb3JtYXQ9anNvblwiLGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFsdWUucmVzcG9uc2UubWFwKGZ1bmN0aW9uKHgpIHsgeC5rZXkgPSB4LmFjdGlvbl9uYW1lOyB4LmFjdGlvbl9pZCA9IHguZmlsdGVyX2lkOyB4LnZhbHVlID0geC5hY3Rpb25faWQgfSlcbiAgICBjYihmYWxzZSx2YWx1ZS5yZXNwb25zZSlcbiAgfSlcblxufVxuIiwiaW1wb3J0ICogYXMgYSBmcm9tICcuL3NyYy9hY3Rpb24uanMnO1xuXG5leHBvcnQgbGV0IGFjdGlvbiA9IGE7XG5leHBvcnQgbGV0IGRhc2hib2FyZCA9IHtcbiAgICBnZXRBbGw6IGZ1bmN0aW9uKGNiKSB7XG4gICAgICBkMy5qc29uKFwiL2NydXNoZXIvc2F2ZWRfZGFzaGJvYXJkXCIsZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2IoZmFsc2UsdmFsdWUucmVzcG9uc2UpXG4gICAgICB9KVxuICAgIH1cbn1cbmV4cG9ydCBsZXQgbGluZV9pdGVtID0ge1xuICAgIGdldEFsbDogZnVuY3Rpb24oY2IpIHtcbiAgICAgIGQzLmpzb24oXCIvbGluZV9pdGVtXCIsZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2IoZmFsc2UsdmFsdWUucmVzcG9uc2UpXG4gICAgICB9KVxuICAgIH1cbn1cbiIsImltcG9ydCB7IGZpbHRlcl9kYXRhIH0gZnJvbSAnZmlsdGVyJztcbmltcG9ydCB7IGJ1aWxkRGF0YSB9IGZyb20gJy4uLy4uL2hlbHBlcnMnXG5cbmZ1bmN0aW9uIHByZWZpeFJlZHVjZXIocHJlZml4LCBwLGMpIHtcbiAgcFtjLmtleV0gPSBwW2Mua2V5XSB8fCB7fVxuICBwW2Mua2V5XVsna2V5J10gPSBjLmtleVxuICBwW2Mua2V5XVsncGFyZW50X2NhdGVnb3J5X25hbWUnXSA9IGMucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgcFtjLmtleV1bJ2lkZiddID0gYy5pZGZcblxuICBwW2Mua2V5XVsndG90YWwnXSA9IChwW2Mua2V5XVsndG90YWwnXSB8fCAwKSArIGMudmlzaXRzXG5cbiAgXG4gIHBbYy5rZXldW3ByZWZpeCArIGMudGltZV9kaWZmX2J1Y2tldF0gPSAocFtjLmtleV1bYy50aW1lX2RpZmZfYnVja2V0XSB8fCAwKSArIGMudmlzaXRzXG4gIHJldHVybiBwXG59XG5leHBvcnQgY29uc3QgYmVmb3JlQW5kQWZ0ZXJUYWJ1bGFyID0gKGJlZm9yZSwgYWZ0ZXIpID0+IHtcbiAgY29uc3QgZG9tYWluX3RpbWUgPSB7fVxuXG4gIGJlZm9yZS5yZWR1Y2UocHJlZml4UmVkdWNlci5iaW5kKGZhbHNlLFwiXCIpLGRvbWFpbl90aW1lKVxuICBhZnRlci5yZWR1Y2UocHJlZml4UmVkdWNlci5iaW5kKGZhbHNlLFwiLVwiKSxkb21haW5fdGltZSlcblxuICBjb25zdCBzb3J0ZWQgPSBPYmplY3Qua2V5cyhkb21haW5fdGltZSlcbiAgICAubWFwKChrKSA9PiB7IHJldHVybiBkb21haW5fdGltZVtrXSB9KVxuXG4gIHJldHVybiBzb3J0ZWRcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRCZWZvcmVBbmRBZnRlcihiZWZvcmVfdXJscyxhZnRlcl91cmxzLGNhdF9zdW1tYXJ5LHNvcnRfYnkpIHtcblxuICB2YXIgYnUgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgIC5lbnRyaWVzKGJlZm9yZV91cmxzKVxuXG4gIHZhciBhdSA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgLmVudHJpZXMoYWZ0ZXJfdXJscylcblxuICB2YXIgYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG4gICAgLCBwb3BfY2F0ZWdvcmllcyA9IGNhdF9zdW1tYXJ5LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjOyByZXR1cm4gcCB9LCB7fSlcbiAgICAsIGNhdHMgPSBjYXRfc3VtbWFyeS5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC5rZXkgfSlcblxuICB2YXIgYmVmb3JlX2NhdGVnb3JpZXMgPSBidWlsZERhdGEoYmVmb3JlX3VybHMsYnVja2V0cyxwb3BfY2F0ZWdvcmllcylcbiAgICAsIGFmdGVyX2NhdGVnb3JpZXMgPSBidWlsZERhdGEoYWZ0ZXJfdXJscyxidWNrZXRzLHBvcF9jYXRlZ29yaWVzKVxuXG4gIHZhciBzb3J0YnkgPSBzb3J0X2J5XG5cbiAgaWYgKHNvcnRieSA9PSBcInNjb3JlXCIpIHtcblxuICAgIGJlZm9yZV9jYXRlZ29yaWVzID0gYmVmb3JlX2NhdGVnb3JpZXMuc29ydChmdW5jdGlvbihhLGIpIHsgXG4gICAgICB2YXIgcCA9IC0xLCBxID0gLTE7XG4gICAgICB0cnkgeyBwID0gYi52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5zY29yZSB9IGNhdGNoKGUpIHt9XG4gICAgICB0cnkgeyBxID0gYS52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5zY29yZSB9IGNhdGNoKGUpIHt9XG4gICAgICByZXR1cm4gZDMuYXNjZW5kaW5nKHAsIHEpXG4gICAgfSlcbiAgICBcbiAgfSBlbHNlIGlmIChzb3J0YnkgPT0gXCJwb3BcIikge1xuXG4gICAgYmVmb3JlX2NhdGVnb3JpZXMgPSBiZWZvcmVfY2F0ZWdvcmllcy5zb3J0KGZ1bmN0aW9uKGEsYikgeyBcbiAgICAgIHZhciBwID0gY2F0cy5pbmRleE9mKGEua2V5KVxuICAgICAgICAsIHEgPSBjYXRzLmluZGV4T2YoYi5rZXkpXG4gICAgICByZXR1cm4gZDMuYXNjZW5kaW5nKHAgPiAtMSA/IHAgOiAxMDAwMCwgcSA+IC0xID8gcSA6IDEwMDAwKVxuICAgIH0pXG5cbiAgfSBlbHNlIHtcblxuICAgIGJlZm9yZV9jYXRlZ29yaWVzID0gYmVmb3JlX2NhdGVnb3JpZXMuc29ydChmdW5jdGlvbihhLGIpIHsgXG4gICAgICB2YXIgcCA9IC0xLCBxID0gLTE7XG4gICAgICB0cnkgeyBwID0gYi52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5wZXJjZW50X2RpZmYgfSBjYXRjaChlKSB7fVxuICAgICAgdHJ5IHsgcSA9IGEudmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5ID09IFwiNjAwXCIgfSlbMF0ucGVyY2VudF9kaWZmIH0gY2F0Y2goZSkge31cbiAgICAgIHJldHVybiBkMy5hc2NlbmRpbmcocCwgcSlcbiAgICB9KVxuXG4gICAgXG4gIH1cblxuXG4gIHZhciBvcmRlciA9IGJlZm9yZV9jYXRlZ29yaWVzLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gIGFmdGVyX2NhdGVnb3JpZXMgPSBhZnRlcl9jYXRlZ29yaWVzLmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4gb3JkZXIuaW5kZXhPZih4LmtleSkgPiAtMX0pLnNvcnQoZnVuY3Rpb24oYSxiKSB7XG4gICAgcmV0dXJuIG9yZGVyLmluZGV4T2YoYS5rZXkpIC0gb3JkZXIuaW5kZXhPZihiLmtleSlcbiAgfSlcblxuICByZXR1cm4ge1xuICAgICAgXCJhZnRlclwiOmFmdGVyX3VybHNcbiAgICAsIFwiYmVmb3JlXCI6YmVmb3JlX3VybHNcbiAgICAsIFwiY2F0ZWdvcnlcIjpjYXRfc3VtbWFyeVxuICAgICwgXCJiZWZvcmVfY2F0ZWdvcmllc1wiOmJlZm9yZV9jYXRlZ29yaWVzXG4gICAgLCBcImFmdGVyX2NhdGVnb3JpZXNcIjphZnRlcl9jYXRlZ29yaWVzXG4gICAgLCBcInNvcnRieVwiOnNvcnRfYnlcbiAgfVxufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGFnZ3JlZ2F0ZVVybHModXJscyxjYXRlZ29yaWVzKSB7XG4gIHZhciBjYXRlZ29yaWVzID0gY2F0ZWdvcmllc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuICB2YXIgdmFsdWVzID0gdXJsc1xuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4ge1wia2V5XCI6eC51cmwsXCJ2YWx1ZVwiOnguY291bnQsIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZX0gfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHJldHVybiB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHgua2V5XG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cDovL1wiLFwiXCIpXG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cHM6Ly9cIixcIlwiKVxuICAgICAgICAucmVwbGFjZShcInd3dy5cIixcIlwiKS5zcGxpdChcIi5cIikuc2xpY2UoMSkuam9pbihcIi5cIikuc3BsaXQoXCIvXCIpWzFdLmxlbmd0aCA+IDVcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfSkuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudmFsdWUgLSBwLnZhbHVlIH0pXG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVXJsc1RhYih1cmxzLGNhdGVnb3JpZXMpIHtcblxuICBjb25zdCB2YWx1ZXMgPSBhZ2dyZWdhdGVVcmxzKHVybHMsY2F0ZWdvcmllcylcbiAgXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiVG9wIEFydGljbGVzXCJcbiAgICAsIHZhbHVlczogdmFsdWVzLnNsaWNlKDAsMTAwKVxuICB9XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gYWdncmVnYXRlRG9tYWlucyh1cmxzLGNhdGVnb3JpZXMpIHtcbiAgdmFyIGNhdGVnb3JpZXMgPSBjYXRlZ29yaWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5kb21haW4gfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKHVybHMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIkludGVybmV0ICYgVGVsZWNvbVwifSkgKVxuXG4gIHZhciBnZXRJREYgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIChpZGZbeF0gPT0gXCJOQVwiKSB8fCAoaWRmW3hdID4gODY4NikgPyAwIDogaWRmW3hdXG4gIH1cblxuICB2YXIgdmFsdWVzID0gdXJsc1xuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJrZXlcIjp4LmRvbWFpblxuICAgICAgICAsIFwidmFsdWVcIjp4LmNvdW50XG4gICAgICAgICwgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICwgXCJ1bmlxdWVzXCI6IHgudW5pcXVlcyBcbiAgICAgICAgLCBcInVybFwiOiB4LnVybFxuICAgICAgfSBcbiAgICB9KVxuXG5cblxuICB2YWx1ZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXl9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHhbMF0ucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgICwgXCJrZXlcIjogeFswXS5rZXlcbiAgICAgICAgICwgXCJ2YWx1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnZhbHVlfSwwKVxuICAgICAgICAgLCBcInBlcmNlbnRfdW5pcXVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudW5pcXVlcy9jLnZhbHVlfSwwKS94Lmxlbmd0aFxuICAgICAgICAgLCBcInVybHNcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHAuaW5kZXhPZihjLnVybCkgPT0gLTEgPyBwLnB1c2goYy51cmwpIDogcDsgcmV0dXJuIHAgfSxbXSlcblxuICAgICAgIH0gXG4gICAgfSlcbiAgICAuZW50cmllcyh2YWx1ZXMpLm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHgudmFsdWVzIH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMClcbiAgICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTEgfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnRmX2lkZiA9IGdldElERih4LmtleSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpIFxuICAgIHguY291bnQgPSB4LnZhbHVlXG4gICAgeC5pbXBvcnRhbmNlID0gTWF0aC5sb2coeC50Zl9pZGYpXG4gIH0pXG4gIHZhbHVlcyA9IHZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy50Zl9pZGYgLSBwLnRmX2lkZiB9KVxuXG5cbiAgdmFyIHRvdGFsID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50KngucGVyY2VudF91bmlxdWV9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICB4LnBvcF9wZXJjZW50ID0gMS4wMi9nZXRJREYoeC5rZXkpKjEwMFxuICAgIHgucG9wX3BlcmNlbnQgPSB4LnBvcF9wZXJjZW50ID09IEluZmluaXR5ID8gMCA6IHgucG9wX3BlcmNlbnRcblxuICAgIHguc2FtcGxlX3BlcmNlbnQgPSB4LmNvdW50KngucGVyY2VudF91bmlxdWUvdG90YWwqMTAwXG4gIH0pXG5cbiAgdmFyIG5vcm0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgIC5yYW5nZShbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXsgcmV0dXJuIHgucG9wX3BlcmNlbnR9KV0pXG4gICAgLmRvbWFpbihbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXtyZXR1cm4geC5zYW1wbGVfcGVyY2VudH0pXSlcbiAgICAubmljZSgpXG5cbiAgdmFyIHR0ID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LnBvcF9wZXJjZW50IH0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5zYW1wbGVfcGVyY2VudF9ub3JtID0gbm9ybSh4LnNhbXBsZV9wZXJjZW50KVxuICAgIHgucmVhbF9wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQvdHQqMTAwXG4gICAgeC5yYXRpbyA9IHguc2FtcGxlX3BlcmNlbnQveC5yZWFsX3BvcF9wZXJjZW50XG5cbiAgfSlcblxuICByZXR1cm4gdmFsdWVzXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERvbWFpbnNUYWIodXJscyxjYXRlZ29yaWVzKSB7XG5cbiAgY29uc3QgdmFsdWVzID0gYWdncmVnYXRlRG9tYWlucyh1cmxzLGNhdGVnb3JpZXMpXG5cbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgRG9tYWluc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5zbGljZSgwLDUwMClcbiAgfVxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJztcblxuaW1wb3J0IHtcbiAgYWdncmVnYXRlQ2F0ZWdvcnksXG4gIGFnZ3JlZ2F0ZUNhdGVnb3J5SG91cixcbiAgY2F0ZWdvcnlTdW1tYXJ5XG59IGZyb20gJy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2NhdGVnb3J5J1xuXG5pbXBvcnQge1xuICBidWlsZEJlZm9yZUFuZEFmdGVyLFxuICBiZWZvcmVBbmRBZnRlclRhYnVsYXJcbn0gZnJvbSAnLi4vaGVscGVycy9kYXRhX2hlbHBlcnMvYmVmb3JlX2FuZF9hZnRlcidcblxuaW1wb3J0IHtcbiAgYnVpbGRLZXl3b3Jkc1xufSBmcm9tICcuLi9oZWxwZXJzL2RhdGFfaGVscGVycy9rZXl3b3JkcydcblxuaW1wb3J0IHtcbiAgYnVpbGRUaW1pbmcsXG4gIHRpbWluZ1RhYnVsYXJcbn0gZnJvbSAnLi4vaGVscGVycy9kYXRhX2hlbHBlcnMvdGltaW5nJ1xuXG5pbXBvcnQge1xuICBidWlsZFVybHNUYWJcbn0gZnJvbSAnLi4vaGVscGVycy9kYXRhX2hlbHBlcnMvdXJscydcblxuaW1wb3J0IHtcbiAgYnVpbGREb21haW5zVGFiXG59IGZyb20gJy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2RvbWFpbnMnXG5cbmltcG9ydCB7XG4gIGJ1aWxkU3VtbWFyeSxcbiAgZGV0ZXJtaW5lTG9naWMsXG4gIHByZXBhcmVGaWx0ZXJzLFxuICBmaWx0ZXJVcmxzXG59IGZyb20gJy4uL2hlbHBlcnMnXG5cbmNvbnN0IHMgPSBzdGF0ZTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgY29uc3QgcyA9IHN0YXRlO1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhZGQtZmlsdGVyXCIsIGZ1bmN0aW9uKGZpbHRlcikgeyBcbiAgICAgIHMucHVibGlzaChcImZpbHRlcnNcIixzLnN0YXRlKCkuZmlsdGVycy5jb25jYXQoZmlsdGVyKS5maWx0ZXIoeCA9PiB4LnZhbHVlKSApIFxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJtb2RpZnktZmlsdGVyXCIsIGZ1bmN0aW9uKGZpbHRlcikgeyBcbiAgICAgIHZhciBmaWx0ZXJzID0gcy5zdGF0ZSgpLmZpbHRlcnNcbiAgICAgIHZhciBoYXNfZXhpc2l0aW5nID0gZmlsdGVycy5maWx0ZXIoeCA9PiAoeC5maWVsZCArIHgub3ApID09IChmaWx0ZXIuZmllbGQgKyBmaWx0ZXIub3ApIClcbiAgICAgIFxuICAgICAgaWYgKGhhc19leGlzaXRpbmcubGVuZ3RoKSB7XG4gICAgICAgIHZhciBuZXdfZmlsdGVycyA9IGZpbHRlcnMucmV2ZXJzZSgpLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKCh4LmZpZWxkID09IGZpbHRlci5maWVsZCkgJiYgKHgub3AgPT0gZmlsdGVyLm9wKSkge1xuICAgICAgICAgICAgeC52YWx1ZSArPSBcIixcIiArIGZpbHRlci52YWx1ZVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4geFxuICAgICAgICB9KVxuICAgICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIsbmV3X2ZpbHRlcnMuZmlsdGVyKHggPT4geC52YWx1ZSkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIscy5zdGF0ZSgpLmZpbHRlcnMuY29uY2F0KGZpbHRlcikuZmlsdGVyKHggPT4geC52YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIsIGZ1bmN0aW9uKHN0cikgeyBzLnB1Ymxpc2goXCJzdGFnZWRfZmlsdGVyXCIsc3RyICkgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImxvZ2ljLmNoYW5nZVwiLCBmdW5jdGlvbihsb2dpYykgeyBzLnB1Ymxpc2goXCJsb2dpY19vcHRpb25zXCIsbG9naWMpIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJmaWx0ZXIuY2hhbmdlXCIsIGZ1bmN0aW9uKGZpbHRlcnMpIHsgcy5wdWJsaXNoQmF0Y2goeyBcImZpbHRlcnNcIjpmaWx0ZXJzIH0pIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIiwgZnVuY3Rpb24oZXJyLF9maWx0ZXJzLF9zdGF0ZSkge1xuXG5cbiAgICAgIGlmIChfc3RhdGUuZGF0YSA9PSB1bmRlZmluZWQpIHJldHVybiBcblxuICAgICAgY29uc3QgZmlsdGVycyA9IHByZXBhcmVGaWx0ZXJzKF9zdGF0ZS5maWx0ZXJzKVxuICAgICAgY29uc3QgbG9naWMgPSBkZXRlcm1pbmVMb2dpYyhfc3RhdGUubG9naWNfb3B0aW9ucylcbiAgICAgIGNvbnN0IGZ1bGxfdXJscyA9IGZpbHRlclVybHMoX3N0YXRlLmRhdGEub3JpZ2luYWxfdXJscyxsb2dpYyxmaWx0ZXJzKVxuXG4gICAgICBpZiAoIChfc3RhdGUuZGF0YS5mdWxsX3VybHMpICYmIChfc3RhdGUuZGF0YS5mdWxsX3VybHMubGVuZ3RoID09IGZ1bGxfdXJscy5sZW5ndGgpICYmIFxuICAgICAgICAgICAoX3N0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24pICYmIChfc3RhdGUuY29tcGFyaXNvbl9kYXRhID09IHZhbHVlLmNvbXBhcmlzb24pICYmIFxuICAgICAgICAgICAoX3N0YXRlLnNvcnRieSA9PSBfc3RhdGUuYmVmb3JlX3VybHMuc29ydGJ5KSkgcmV0dXJuIFxuXG5cblxuICAgICAgLy8gQkFTRSBEQVRBU0VUU1xuICAgICAgY29uc3QgdmFsdWUgPSB7fVxuXG4gICAgICB2YWx1ZS5mdWxsX3VybHMgPSBmdWxsX3VybHNcbiAgICAgIHZhbHVlLmNvbXBhcmlzb24gPSBfc3RhdGUuY29tcGFyaXNvbl9kYXRhID8gIF9zdGF0ZS5jb21wYXJpc29uX2RhdGEub3JpZ2luYWxfdXJscyA6IF9zdGF0ZS5kYXRhLm9yaWdpbmFsX3VybHM7XG5cbiAgICAgIC8vcy5wdWJsaXNoU3RhdGljKFwiZm9ybWF0dGVkX2RhdGFcIix2YWx1ZSlcbiAgICAgIFxuXG4gICAgICBjb25zdCBjYXRfc3VtbWFyeSA9IGNhdGVnb3J5U3VtbWFyeSh2YWx1ZS5mdWxsX3VybHMsdmFsdWUuY29tcGFyaXNvbilcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBidWlsZFN1bW1hcnkodmFsdWUuZnVsbF91cmxzLCB2YWx1ZS5jb21wYXJpc29uKVxuXG4gICAgICBzLnNldFN0YXRpYyhcImNhdGVnb3J5X3N1bW1hcnlcIiwgY2F0X3N1bW1hcnkpXG4gICAgICBzLnNldFN0YXRpYyhcInN1bW1hcnlcIixzdW1tYXJ5KVxuXG5cblxuXG5cbiAgICAgIC8vIE1FRElBIFBMQU5cblxuICAgICAgXG4gICAgICAvL3ZhbHVlLmRpc3BsYXlfY2F0ZWdvcmllcyA9IHtcImtleVwiOiBcIkNhdGVnb3JpZXNcIiwgdmFsdWVzOiBhZ2dyZWdhdGVDYXRlZ29yeShmdWxsX3VybHMpfVxuICAgICAgLy92YWx1ZS5jYXRlZ29yeV9ob3VyID0gYWdncmVnYXRlQ2F0ZWdvcnlIb3VyKGZ1bGxfdXJscylcblxuICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IGFnZ3JlZ2F0ZUNhdGVnb3J5KGZ1bGxfdXJscylcblxuICAgICAgY29uc3QgbWVkaWFfcGxhbiA9IHtcbiAgICAgICAgICBkaXNwbGF5X2NhdGVnb3JpZXM6IHtcImtleVwiOiBcIkNhdGVnb3JpZXNcIiAsIHZhbHVlczogY2F0ZWdvcmllc31cbiAgICAgICAgLCBjYXRlZ29yeV9ob3VyOiBhZ2dyZWdhdGVDYXRlZ29yeUhvdXIoZnVsbF91cmxzKVxuICAgICAgfVxuXG4gICAgICBzLnNldFN0YXRpYyhcIm1lZGlhX3BsYW5cIiwgbWVkaWFfcGxhbilcbiAgICAgIFxuXG5cblxuXG4gICAgICAvLyBFWFBMT1JFIFRBQlNcbiAgICAgIHZhciB0YWJzID0gW1xuICAgICAgICAgIGJ1aWxkRG9tYWluc1RhYihmdWxsX3VybHMsY2F0ZWdvcmllcylcbiAgICAgICAgLCB7a2V5OlwiVG9wIENhdGVnb3JpZXNcIiwgdmFsdWVzOiBjYXRfc3VtbWFyeX1cbiAgICAgICAgLCBidWlsZFVybHNUYWIoZnVsbF91cmxzLGNhdGVnb3JpZXMpXG4gICAgICBdXG5cbiAgICAgIFxuXG4gICAgICBpZiAoX3N0YXRlLnRhYl9wb3NpdGlvbikge1xuICAgICAgICB0YWJzLm1hcCh4ID0+IHguc2VsZWN0ZWQgPSAoeC5rZXkgPT0gX3N0YXRlLnRhYl9wb3NpdGlvbikgKVxuICAgICAgfVxuXG4gICAgICBzLnNldFN0YXRpYyhcInRhYnNcIix0YWJzKVxuXG5cblxuXG4gICAgICAvLyBUSU1JTkdcbiAgICAgIGNvbnN0IHRpbWluZyA9IGJ1aWxkVGltaW5nKHZhbHVlLmZ1bGxfdXJscywgdmFsdWUuY29tcGFyaXNvbilcbiAgICAgIGNvbnN0IHRpbWluZ190YWJ1bGFyID0gdGltaW5nVGFidWxhcihmdWxsX3VybHMpXG4gICAgICBjb25zdCBjYXRfdGltaW5nX3RhYnVsYXIgPSB0aW1pbmdUYWJ1bGFyKGZ1bGxfdXJscyxcInBhcmVudF9jYXRlZ29yeV9uYW1lXCIpXG4gICAgICBjb25zdCB0aW1pbmdfdGFicyA9IFtcbiAgICAgICAgICB7XCJrZXlcIjpcIlRvcCBEb21haW5zXCIsIFwidmFsdWVzXCI6IHRpbWluZ190YWJ1bGFyfVxuICAgICAgICAsIHtcImtleVwiOlwiVG9wIENhdGVnb3JpZXNcIiwgXCJ2YWx1ZXNcIjogY2F0X3RpbWluZ190YWJ1bGFyfVxuXG4gICAgICBdXG5cbiAgICAgIGlmIChfc3RhdGUudGFiX3Bvc2l0aW9uKSB7XG4gICAgICAgIHRpbWluZ190YWJzLm1hcCh4ID0+IHguc2VsZWN0ZWQgPSAoeC5rZXkgPT0gX3N0YXRlLnRhYl9wb3NpdGlvbikgKVxuICAgICAgfVxuXG5cblxuICAgICAgcy5zZXRTdGF0aWMoXCJ0aW1lX3N1bW1hcnlcIiwgdGltaW5nKVxuICAgICAgcy5zZXRTdGF0aWMoXCJ0aW1lX3RhYnNcIiwgdGltaW5nX3RhYnMpXG5cblxuXG5cbiAgICAgIC8vIEJFRk9SRSBBTkQgQUZURVJcbiAgICAgIGlmIChfc3RhdGUuZGF0YS5iZWZvcmUpIHtcblxuICAgICAgICBjb25zdCBkb21haW5faWRmcyA9IGQzLm5lc3QoKVxuICAgICAgICAgIC5rZXkoeCA9PiB4LmRvbWFpbilcbiAgICAgICAgICAucm9sbHVwKHggPT4geFswXS5pZGYpXG4gICAgICAgICAgLm1hcChmdWxsX3VybHMpXG5cbiAgICAgICAgY29uc3QgY2F0bWFwID0gKHgpID0+IE9iamVjdC5hc3NpZ24oeCx7a2V5OngucGFyZW50X2NhdGVnb3J5X25hbWV9KVxuICAgICAgICBjb25zdCB1cmxtYXAgPSAoeCkgPT4gT2JqZWN0LmFzc2lnbih7a2V5OnguZG9tYWluLCBpZGY6IGRvbWFpbl9pZGZzW3guZG9tYWluXX0seClcblxuICAgICAgICBjb25zdCBiZWZvcmVfdXJscyA9IGZpbHRlclVybHMoX3N0YXRlLmRhdGEuYmVmb3JlLGxvZ2ljLGZpbHRlcnMpLm1hcCh1cmxtYXApXG4gICAgICAgICAgLCBhZnRlcl91cmxzID0gZmlsdGVyVXJscyhfc3RhdGUuZGF0YS5hZnRlcixsb2dpYyxmaWx0ZXJzKS5tYXAodXJsbWFwKVxuICAgICAgICAgICwgYmVmb3JlX2FuZF9hZnRlciA9IGJ1aWxkQmVmb3JlQW5kQWZ0ZXIoYmVmb3JlX3VybHMsYWZ0ZXJfdXJscyxjYXRfc3VtbWFyeSxfc3RhdGUuc29ydGJ5KVxuICAgICAgICAgICwgYmVmb3JlX2FmdGVyX3RhYnVsYXIgPSBiZWZvcmVBbmRBZnRlclRhYnVsYXIoYmVmb3JlX3VybHMsYWZ0ZXJfdXJscylcbiAgICAgICAgICAsIGNhdF9iZWZvcmVfYWZ0ZXJfdGFidWxhciA9IGJlZm9yZUFuZEFmdGVyVGFidWxhcihiZWZvcmVfdXJscy5tYXAoY2F0bWFwKSxhZnRlcl91cmxzLm1hcChjYXRtYXApKVxuXG4gICAgICAgIGNvbnN0IGJlZm9yZV90YWJzID0gW1xuICAgICAgICAgICAge2tleTpcIlRvcCBEb21haW5zXCIsdmFsdWVzOmJlZm9yZV9hZnRlcl90YWJ1bGFyLGRhdGE6YmVmb3JlX2FuZF9hZnRlcn1cbiAgICAgICAgICAsIHtrZXk6XCJUb3AgQ2F0ZWdvcmllc1wiLHZhbHVlczpjYXRfYmVmb3JlX2FmdGVyX3RhYnVsYXIsZGF0YTpiZWZvcmVfYW5kX2FmdGVyfVxuICAgICAgICBdXG5cbiAgICAgICAgaWYgKF9zdGF0ZS50YWJfcG9zaXRpb24pIHtcbiAgICAgICAgICBiZWZvcmVfdGFicy5tYXAoeCA9PiB4LnNlbGVjdGVkID0gKHgua2V5ID09IF9zdGF0ZS50YWJfcG9zaXRpb24pIClcbiAgICAgICAgfVxuXG5cbiAgICAgICAgcy5zZXRTdGF0aWMoXCJiZWZvcmVfdXJsc1wiLGJlZm9yZV9hbmRfYWZ0ZXIpIFxuICAgICAgICBzLnNldFN0YXRpYyhcImJlZm9yZV90YWJzXCIsYmVmb3JlX3RhYnMpXG5cbiAgICAgIH1cblxuXG5cbiAgICAgIC8vIEtFWVdPUkRTXG4gICAgICAvL3Muc2V0U3RhdGljKFwia2V5d29yZF9zdW1tYXJ5XCIsIGJ1aWxkS2V5d29yZHModmFsdWUuZnVsbF91cmxzLHZhbHVlLmNvbXBhcmlvbnMpKSBcblxuXG5cblxuICAgICAgXG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJmb3JtYXR0ZWRfZGF0YVwiLHZhbHVlKVxuICAgIH0pXG59XG4iLCJpbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG4gIGNvbnN0IHMgPSBzdGF0ZTtcblxuICBzdGF0ZVxuICAgIC5yZWdpc3RlckV2ZW50KFwiYWN0aW9uLmNoYW5nZVwiLCBmdW5jdGlvbihhY3Rpb24pIHsgcy5wdWJsaXNoKFwic2VsZWN0ZWRfYWN0aW9uXCIsYWN0aW9uKSB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIsIGZ1bmN0aW9uKGRhdGUpIHsgcy5wdWJsaXNoKFwiYWN0aW9uX2RhdGVcIixkYXRlKSB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiLCBmdW5jdGlvbihkYXRlKSB7IHMucHVibGlzaChcImNvbXBhcmlzb25fZGF0ZVwiLGRhdGUpIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJjb21wYXJpc29uLmNoYW5nZVwiLCBmdW5jdGlvbihhY3Rpb24pIHsgXG4gICAgICBpZiAoYWN0aW9uLnZhbHVlID09IGZhbHNlKSByZXR1cm4gcy5wdWJsaXNoKFwic2VsZWN0ZWRfY29tcGFyaXNvblwiLGZhbHNlKVxuICAgICAgcy5wdWJsaXNoKFwic2VsZWN0ZWRfY29tcGFyaXNvblwiLGFjdGlvbilcbiAgICB9KVxuXG5cbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCBmaWx0ZXJJbml0IGZyb20gJy4vZXZlbnRzL2ZpbHRlcl9ldmVudHMnXG5pbXBvcnQgYWN0aW9uSW5pdCBmcm9tICcuL2V2ZW50cy9hY3Rpb25fZXZlbnRzJ1xuXG5cbmNvbnN0IHMgPSBzdGF0ZTtcblxuY29uc3QgZGVlcGNvcHkgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHgpKVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuXG4gIGZpbHRlckluaXQoKVxuICBhY3Rpb25Jbml0KClcblxuICAvLyBPVEhFUiBldmVudHNcblxuICBzdGF0ZVxuICAgIC5yZWdpc3RlckV2ZW50KFwidHJhbnNmb3JtLmNoYW5nZVwiLCBmdW5jdGlvbih4KSB7XG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIilcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcInRyYW5zZm9ybVwiLHgudmFsdWUpXG4gICAgICBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKShmYWxzZSxzLnN0YXRlKCkuZmlsdGVycyxzLnN0YXRlKCkpXG4gICAgfSlcblxuICAgIC5yZWdpc3RlckV2ZW50KFwic29ydC5jaGFuZ2VcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgY29uc3QgX3MgPSBzLnN0YXRlKClcbiAgICAgIGNvbnN0IGFzYyA9IF9zLnNvcnQgPT0geC5rZXlcblxuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIpXG5cbiAgICAgIHMucHVibGlzaFN0YXRpYyhcInNvcnRcIix4LmtleSlcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImFzY2VuZGluZ1wiLGFzYyAmJiAhX3MuYXNjZW5kaW5nKVxuXG4gICAgICBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKShmYWxzZSxzLnN0YXRlKCkuZmlsdGVycyxzLnN0YXRlKCkpXG5cbiAgICB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwidmlldy5jaGFuZ2VcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIsdHJ1ZSlcbiAgICAgIHZhciBDUCA9IGRlZXBjb3B5KHMuc3RhdGUoKS5kYXNoYm9hcmRfb3B0aW9ucykubWFwKGZ1bmN0aW9uKGQpIHsgZC5zZWxlY3RlZCA9ICh4LnZhbHVlID09IGQudmFsdWUpID8gMSA6IDA7IHJldHVybiBkIH0pXG4gICAgICBzLnB1Ymxpc2goXCJkYXNoYm9hcmRfb3B0aW9uc1wiLENQKVxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ0YWIuY2hhbmdlXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHMudXBkYXRlKFwibG9hZGluZ1wiLHRydWUpXG5cbiAgICAgIHMucHVibGlzaFN0YXRpYyhcInRhYl9wb3NpdGlvblwiLHgua2V5KVxuICAgICAgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikoZmFsc2Uscy5zdGF0ZSgpLmZpbHRlcnMscy5zdGF0ZSgpKVxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJiYS5zb3J0XCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHMucHVibGlzaChcInNvcnRieVwiLCB4LnZhbHVlKVxuICAgICAgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikoZmFsc2Uscy5zdGF0ZSgpLmZpbHRlcnMscy5zdGF0ZSgpKVxuICAgIH0pXG59XG4iLCJpbXBvcnQge3FzfSBmcm9tICdzdGF0ZSc7XG5pbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnO1xuaW1wb3J0IHtjb21wYXJlfSBmcm9tICcuLi9oZWxwZXJzJ1xuXG5mdW5jdGlvbiBwdWJsaXNoUVNVcGRhdGVzKHVwZGF0ZXMscXNfc3RhdGUpIHtcbiAgaWYgKE9iamVjdC5rZXlzKHVwZGF0ZXMpLmxlbmd0aCkge1xuICAgIHVwZGF0ZXNbXCJxc19zdGF0ZVwiXSA9IHFzX3N0YXRlXG4gICAgc3RhdGUucHVibGlzaEJhdGNoKHVwZGF0ZXMpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcblxuICB3aW5kb3cub25wb3BzdGF0ZSA9IGZ1bmN0aW9uKGkpIHtcblxuICAgIHZhciBzdGF0ZSA9IHMuX3N0YXRlXG4gICAgICAsIHFzX3N0YXRlID0gaS5zdGF0ZVxuXG4gICAgdmFyIHVwZGF0ZXMgPSBjb21wYXJlKHFzX3N0YXRlLHN0YXRlKVxuICAgIHB1Ymxpc2hRU1VwZGF0ZXModXBkYXRlcyxxc19zdGF0ZSlcbiAgfVxuXG4gIGNvbnN0IHMgPSBzdGF0ZTtcblxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJoaXN0b3J5XCIsZnVuY3Rpb24oZXJyb3IsX3N0YXRlKSB7XG4gICAgICAvL2NvbnNvbGUubG9nKFxuICAgICAgLy8gIFwiY3VycmVudDogXCIrSlNPTi5zdHJpbmdpZnkoX3N0YXRlLnFzX3N0YXRlKSwgXG4gICAgICAvLyAgSlNPTi5zdHJpbmdpZnkoX3N0YXRlLmZpbHRlcnMpLCBcbiAgICAgIC8vICBfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnNcbiAgICAgIC8vKVxuXG4gICAgICB2YXIgZm9yX3N0YXRlID0gW1wiZmlsdGVyc1wiXVxuXG4gICAgICB2YXIgcXNfc3RhdGUgPSBmb3Jfc3RhdGUucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgaWYgKF9zdGF0ZVtjXSkgcFtjXSA9IF9zdGF0ZVtjXVxuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7fSlcblxuICAgICAgaWYgKF9zdGF0ZS5zZWxlY3RlZF9hY3Rpb24pIHFzX3N0YXRlWydzZWxlY3RlZF9hY3Rpb24nXSA9IF9zdGF0ZS5zZWxlY3RlZF9hY3Rpb24uYWN0aW9uX2lkXG4gICAgICBpZiAoX3N0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24pIHFzX3N0YXRlWydzZWxlY3RlZF9jb21wYXJpc29uJ10gPSBfc3RhdGUuc2VsZWN0ZWRfY29tcGFyaXNvbi5hY3Rpb25faWRcbiAgICAgIGlmIChfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMpIHFzX3N0YXRlWydzZWxlY3RlZF92aWV3J10gPSBfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMuZmlsdGVyKHggPT4geC5zZWxlY3RlZClbMF0udmFsdWVcbiAgICAgIGlmIChfc3RhdGUuYWN0aW9uX2RhdGUpIHFzX3N0YXRlWydhY3Rpb25fZGF0ZSddID0gX3N0YXRlLmFjdGlvbl9kYXRlXG4gICAgICBpZiAoX3N0YXRlLmNvbXBhcmlzb25fZGF0ZSkgcXNfc3RhdGVbJ2NvbXBhcmlzb25fZGF0ZSddID0gX3N0YXRlLmNvbXBhcmlzb25fZGF0ZVxuICAgICAgaWYgKF9zdGF0ZS50cmFuc2Zvcm0pIHFzX3N0YXRlWyd0cmFuc2Zvcm0nXSA9IF9zdGF0ZS50cmFuc2Zvcm1cbiAgICAgIGlmIChfc3RhdGUudGFiX3Bvc2l0aW9uKSBxc19zdGF0ZVsndGFiX3Bvc2l0aW9uJ10gPSBfc3RhdGUudGFiX3Bvc2l0aW9uXG4gICAgICBpZiAoX3N0YXRlLnNvcnQpIHFzX3N0YXRlWydzb3J0J10gPSBfc3RhdGUuc29ydFxuICAgICAgaWYgKF9zdGF0ZS5hc2NlbmRpbmcpIHFzX3N0YXRlWydhc2NlbmRpbmcnXSA9IF9zdGF0ZS5hc2NlbmRpbmdcblxuXG5cblxuICAgICAgaWYgKF9zdGF0ZS5zZWxlY3RlZF9hY3Rpb24gJiYgcXMocXNfc3RhdGUpLnRvKHFzX3N0YXRlKSAhPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoKSB7XG4gICAgICAgIHMucHVibGlzaChcInFzX3N0YXRlXCIscXNfc3RhdGUpXG4gICAgICB9XG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwiaGlzdG9yeS5hY3Rpb25zXCIsIGZ1bmN0aW9uKGVycm9yLHZhbHVlLF9zdGF0ZSkge1xuICAgICAgdmFyIHFzX3N0YXRlID0gcXMoe30pLmZyb20od2luZG93LmxvY2F0aW9uLnNlYXJjaClcbiAgICAgIGlmICh3aW5kb3cubG9jYXRpb24uc2VhcmNoLmxlbmd0aCAmJiBPYmplY3Qua2V5cyhxc19zdGF0ZSkubGVuZ3RoKSB7XG4gICAgICAgIHZhciB1cGRhdGVzID0gY29tcGFyZShxc19zdGF0ZSxfc3RhdGUpXG4gICAgICAgIHJldHVybiBwdWJsaXNoUVNVcGRhdGVzKHVwZGF0ZXMscXNfc3RhdGUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzLnB1Ymxpc2goXCJzZWxlY3RlZF9hY3Rpb25cIix2YWx1ZVswXSlcbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJoaXN0b3J5LnFzX3N0YXRlXCIsIGZ1bmN0aW9uKGVycm9yLHFzX3N0YXRlLF9zdGF0ZSkge1xuXG4gICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoaGlzdG9yeS5zdGF0ZSkgPT0gSlNPTi5zdHJpbmdpZnkocXNfc3RhdGUpKSByZXR1cm5cbiAgICAgIGlmICh3aW5kb3cubG9jYXRpb24uc2VhcmNoID09IFwiXCIpIGhpc3RvcnkucmVwbGFjZVN0YXRlKHFzX3N0YXRlLFwiXCIscXMocXNfc3RhdGUpLnRvKHFzX3N0YXRlKSlcbiAgICAgIGVsc2UgaGlzdG9yeS5wdXNoU3RhdGUocXNfc3RhdGUsXCJcIixxcyhxc19zdGF0ZSkudG8ocXNfc3RhdGUpKVxuXG4gICAgfSlcbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCAqIGFzIGFwaSBmcm9tICdhcGknXG5cbmNvbnN0IHMgPSBzdGF0ZTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcblxuICAvLyBTdWJzY3JpcHRpb25zIHRoYXQgcmVjZWl2ZSBkYXRhIC8gbW9kaWZ5IC8gY2hhbmdlIHdoZXJlIGl0IGlzIHN0b3JlZFxuXG4gIHN0YXRlXG4gICAgLnN1YnNjcmliZShcInJlY2VpdmUuZGF0YVwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJsb2dpY19jYXRlZ29yaWVzXCIsdmFsdWUuY2F0ZWdvcmllcylcbiAgICAgIHMucHVibGlzaChcImZpbHRlcnNcIixzdGF0ZS5maWx0ZXJzKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcInJlY2VpdmUuY29tcGFyaXNvbl9kYXRhXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaChcImZpbHRlcnNcIixzdGF0ZS5maWx0ZXJzKVxuICAgIH0pXG5cblxuICAvLyBTdWJzY3JpcHRpb25zIHRoYXQgd2lsbCBnZXQgbW9yZSBkYXRhXG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwiZ2V0LmFjdGlvbl9kYXRlXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImRhdGFcIixhcGkuYWN0aW9uLmdldERhdGEoc3RhdGUuc2VsZWN0ZWRfYWN0aW9uLHN0YXRlLmFjdGlvbl9kYXRlKSlcbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuY29tcGFyaXNvbl9kYXRlXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybiBzLnB1Ymxpc2hTdGF0aWMoXCJjb21wYXJpc29uX2RhdGFcIixmYWxzZSlcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YShzdGF0ZS5zZWxlY3RlZF9jb21wYXJpc29uLHN0YXRlLmNvbXBhcmlzb25fZGF0ZSkpXG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwiZ2V0LnNlbGVjdGVkX2FjdGlvblwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJkYXRhXCIsYXBpLmFjdGlvbi5nZXREYXRhKHZhbHVlLHN0YXRlLmFjdGlvbl9kYXRlKSlcbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuc2VsZWN0ZWRfY29tcGFyaXNvblwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBpZiAoIXZhbHVlKSByZXR1cm4gcy5wdWJsaXNoU3RhdGljKFwiY29tcGFyaXNvbl9kYXRhXCIsZmFsc2UpXG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJjb21wYXJpc29uX2RhdGFcIixhcGkuYWN0aW9uLmdldERhdGEodmFsdWUsc3RhdGUuY29tcGFyaXNvbl9kYXRlKSlcbiAgICB9KVxuXG5cbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCB7cXN9IGZyb20gJ3N0YXRlJ1xuaW1wb3J0IGJ1aWxkIGZyb20gJy4vYnVpbGQnXG5pbXBvcnQgaGlzdG9yeVN1YnNjcmlwdGlvbnMgZnJvbSAnLi9zdWJzY3JpcHRpb25zL2hpc3RvcnknXG5pbXBvcnQgYXBpU3Vic2NyaXB0aW9ucyBmcm9tICcuL3N1YnNjcmlwdGlvbnMvYXBpJ1xuXG5cbmNvbnN0IHMgPSBzdGF0ZTtcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuXG4gIGhpc3RvcnlTdWJzY3JpcHRpb25zKClcbiAgYXBpU3Vic2NyaXB0aW9ucygpXG5cbiAgXG4gIHN0YXRlXG4gICAgLnN1YnNjcmliZShcImNoYW5nZS5sb2FkaW5nXCIsIGZ1bmN0aW9uKGVycm9yLGxvYWRpbmcsdmFsdWUpIHsgYnVpbGQoKSgpIH0pXG4gICAgLnN1YnNjcmliZShcImNoYW5nZS5kYXNoYm9hcmRfb3B0aW9uc1wiLCBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKSlcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLnRhYnNcIiwgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikpIFxuICAgIC5zdWJzY3JpYmUoXCJjaGFuZ2UubG9naWNfb3B0aW9uc1wiLCBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKSApXG4gICAgLnN1YnNjcmliZShcInVwZGF0ZS5maWx0ZXJzXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKVxuICAgIFxuXG4gIC8vIFJFRFJBVzogdGhpcyBpcyB3aGVyZSB0aGUgZW50aXJlIGFwcCBnZXRzIHJlZHJhd24gLSBpZiBmb3JtYXR0ZWRfZGF0YSBjaGFuZ2VzLCByZWRyYXcgdGhlIGFwcFxuXG4gIHN0YXRlXG4gICAgLnN1YnNjcmliZShcInJlZHJhdy5mb3JtYXR0ZWRfZGF0YVwiLCBmdW5jdGlvbihlcnJvcixmb3JtYXR0ZWRfZGF0YSx2YWx1ZSkgeyBcbiAgICAgIHMudXBkYXRlKFwibG9hZGluZ1wiLGZhbHNlKTsgXG4gICAgICBidWlsZCgpKCkgXG4gICAgfSlcbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCBkMyBmcm9tICdkMydcbmltcG9ydCAqIGFzIGFwaSBmcm9tICdhcGknXG5pbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnXG5pbXBvcnQgdmlldyBmcm9tICcuL3ZpZXcnXG5pbXBvcnQgaW5pdEV2ZW50cyBmcm9tICcuL2V2ZW50cydcbmltcG9ydCBpbml0U3Vic2NyaXB0aW9ucyBmcm9tICcuL3N1YnNjcmlwdGlvbnMnXG5cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGJ1aWxkKHRhcmdldCkge1xuICBjb25zdCBkYiA9IG5ldyBEYXNoYm9hcmQodGFyZ2V0KVxuICByZXR1cm4gZGJcbn1cblxuY2xhc3MgRGFzaGJvYXJkIHtcblxuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBpbml0RXZlbnRzKClcbiAgICBpbml0U3Vic2NyaXB0aW9ucygpXG4gICAgdGhpcy50YXJnZXQodGFyZ2V0KVxuICAgIHRoaXMuaW5pdCgpXG5cbiAgICByZXR1cm4gdGhpcy5jYWxsLmJpbmQodGhpcylcbiAgfVxuXG4gIHRhcmdldCh0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXQgfHwgZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QoXCIuY29udGFpbmVyXCIpLFwiZGl2XCIsXCJkaXZcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAwcHhcIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCJhdXRvXCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcImF1dG9cIilcbiAgfVxuXG4gIGluaXQoKSB7XG4gICAgbGV0IHMgPSBzdGF0ZTtcbiAgICBsZXQgdmFsdWUgPSBzLnN0YXRlKClcbiAgICB0aGlzLmRlZmF1bHRzKHMpXG4gIH1cblxuICBkZWZhdWx0cyhzKSB7XG5cbiAgICBpZiAoISFzLnN0YXRlKCkuZGFzaGJvYXJkX29wdGlvbnMpIHJldHVybiAvLyBkb24ndCByZWxvYWQgZGVmYXVsdHMgaWYgcHJlc2VudFxuXG4gICAgcy5wdWJsaXNoU3RhdGljKFwiYWN0aW9uc1wiLGFwaS5hY3Rpb24uZ2V0QWxsKVxuICAgIHMucHVibGlzaFN0YXRpYyhcInNhdmVkXCIsYXBpLmRhc2hib2FyZC5nZXRBbGwpXG4gICAgcy5wdWJsaXNoU3RhdGljKFwibGluZV9pdGVtc1wiLGFwaS5saW5lX2l0ZW0uZ2V0QWxsKVxuXG4gICAgdmFyIERFRkFVTFRTID0ge1xuICAgICAgICBsb2dpY19vcHRpb25zOiBbe1wia2V5XCI6XCJBbGxcIixcInZhbHVlXCI6XCJhbmRcIn0se1wia2V5XCI6XCJBbnlcIixcInZhbHVlXCI6XCJvclwifV1cbiAgICAgICwgbG9naWNfY2F0ZWdvcmllczogW11cbiAgICAgICwgZmlsdGVyczogW3t9XSBcbiAgICAgICwgZGFzaGJvYXJkX29wdGlvbnM6IFtcbiAgICAgICAgICAgIHtcImtleVwiOlwiT3ZlcmFsbFwiLFwidmFsdWVcIjpcImRhdGEtdmlld1wiLFwic2VsZWN0ZWRcIjoxfVxuICAgICAgICAgICwge1wia2V5XCI6XCJQYXRoXCIsXCJ2YWx1ZVwiOlwiYmEtdmlld1wiLFwic2VsZWN0ZWRcIjowfVxuICAgICAgICAgICwge1wia2V5XCI6XCJUaW1pbmdcIixcInZhbHVlXCI6XCJ0aW1pbmctdmlld1wiLFwic2VsZWN0ZWRcIjowfVxuICAgICAgICAgICwge1wia2V5XCI6XCJEYXRhIHN1bW1hcnlcIixcInZhbHVlXCI6XCJzdW1tYXJ5LXZpZXdcIixcInNlbGVjdGVkXCI6MH1cbiAgICAgICAgICAsIHtcImtleVwiOlwiTWVkaWEgUGxhblwiLCBcInZhbHVlXCI6XCJtZWRpYS12aWV3XCIsXCJzZWxlY3RlZFwiOjB9XG5cbiAgICAgICAgXVxuICAgIH1cblxuICAgIHMudXBkYXRlKGZhbHNlLERFRkFVTFRTKVxuICB9XG5cbiAgY2FsbCgpIHtcblxuICAgbGV0IHMgPSBzdGF0ZTtcbiAgIGxldCB2YWx1ZSA9IHMuc3RhdGUoKVxuXG4gICBsZXQgZGIgPSB2aWV3KHRoaXMuX3RhcmdldClcbiAgICAgLnRyYW5zZm9ybSh2YWx1ZS50cmFuc2Zvcm0gfHwgXCJcIilcbiAgICAgLnN0YWdlZF9maWx0ZXJzKHZhbHVlLnN0YWdlZF9maWx0ZXIgfHwgXCJcIilcbiAgICAgLm1lZGlhKHZhbHVlLm1lZGlhX3BsYW4gfHwge30pXG4gICAgIC5zYXZlZCh2YWx1ZS5zYXZlZCB8fCBbXSlcbiAgICAgLmRhdGEodmFsdWUuZm9ybWF0dGVkX2RhdGEgfHwge30pXG4gICAgIC5hY3Rpb25zKHZhbHVlLmFjdGlvbnMgfHwgW10pXG4gICAgIC5zZWxlY3RlZF9hY3Rpb24odmFsdWUuc2VsZWN0ZWRfYWN0aW9uIHx8IHt9KVxuICAgICAuc2VsZWN0ZWRfY29tcGFyaXNvbih2YWx1ZS5zZWxlY3RlZF9jb21wYXJpc29uIHx8IHt9KVxuICAgICAuYWN0aW9uX2RhdGUodmFsdWUuYWN0aW9uX2RhdGUgfHwgMClcbiAgICAgLmNvbXBhcmlzb25fZGF0ZSh2YWx1ZS5jb21wYXJpc29uX2RhdGUgfHwgMClcbiAgICAgLmxvYWRpbmcodmFsdWUubG9hZGluZyB8fCBmYWxzZSlcbiAgICAgLmxpbmVfaXRlbXModmFsdWUubGluZV9pdGVtcyB8fCBmYWxzZSlcbiAgICAgLnN1bW1hcnkodmFsdWUuc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLnRpbWVfc3VtbWFyeSh2YWx1ZS50aW1lX3N1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC5jYXRlZ29yeV9zdW1tYXJ5KHZhbHVlLmNhdGVnb3J5X3N1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC5rZXl3b3JkX3N1bW1hcnkodmFsdWUua2V5d29yZF9zdW1tYXJ5IHx8IGZhbHNlKVxuICAgICAuYmVmb3JlKHZhbHVlLmJlZm9yZV91cmxzIHx8IFtdKVxuICAgICAuYmVmb3JlX3RhYnModmFsdWUuYmVmb3JlX3RhYnMgfHwgW10pXG4gICAgIC8vLmFmdGVyKHZhbHVlLmFmdGVyX3VybHMgfHwgW10pXG4gICAgIC5sb2dpY19vcHRpb25zKHZhbHVlLmxvZ2ljX29wdGlvbnMgfHwgZmFsc2UpXG4gICAgIC5sb2dpY19jYXRlZ29yaWVzKHZhbHVlLmxvZ2ljX2NhdGVnb3JpZXMgfHwgZmFsc2UpXG4gICAgIC5maWx0ZXJzKHZhbHVlLmZpbHRlcnMgfHwgZmFsc2UpXG4gICAgIC52aWV3X29wdGlvbnModmFsdWUuZGFzaGJvYXJkX29wdGlvbnMgfHwgZmFsc2UpXG4gICAgIC5leHBsb3JlX3RhYnModmFsdWUudGFicyB8fCBmYWxzZSlcbiAgICAgLnRpbWVfdGFicyh2YWx1ZS50aW1lX3RhYnMgfHwgZmFsc2UpXG4gICAgIC5zb3J0KHZhbHVlLnNvcnQgfHwgZmFsc2UpXG4gICAgIC5hc2NlbmRpbmcodmFsdWUuYXNjZW5kaW5nIHx8IGZhbHNlKVxuXG4gICAgIC5vbihcImFkZC1maWx0ZXJcIiwgcy5wcmVwYXJlRXZlbnQoXCJhZGQtZmlsdGVyXCIpKVxuICAgICAub24oXCJtb2RpZnktZmlsdGVyXCIsIHMucHJlcGFyZUV2ZW50KFwibW9kaWZ5LWZpbHRlclwiKSlcbiAgICAgLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiYWN0aW9uLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImFjdGlvbi5jaGFuZ2VcIikpXG4gICAgIC5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImFjdGlvbl9kYXRlLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgIC5vbihcImNvbXBhcmlzb24uY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwiY29tcGFyaXNvbi5jaGFuZ2VcIikpXG4gICAgIC5vbihcImxvZ2ljLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImxvZ2ljLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiZmlsdGVyLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImZpbHRlci5jaGFuZ2VcIikpXG4gICAgIC5vbihcInZpZXcuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwidmlldy5jaGFuZ2VcIikpXG4gICAgIC5vbihcInRhYi5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJ0YWIuY2hhbmdlXCIpKVxuICAgICAub24oXCJiYS5zb3J0XCIsIHMucHJlcGFyZUV2ZW50KFwiYmEuc29ydFwiKSlcbiAgICAgLm9uKFwic29ydC5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJzb3J0LmNoYW5nZVwiKSlcbiAgICAgLm9uKFwidHJhbnNmb3JtLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcInRyYW5zZm9ybS5jaGFuZ2VcIikpXG5cbiAgICAgLmRyYXcoKVxuICAgXG4gIH1cbn1cbiIsInZhciB2ZXJzaW9uID0gXCIwLjAuMVwiOyBleHBvcnQgKiBmcm9tIFwiLi4vaW5kZXhcIjsgZXhwb3J0IHt2ZXJzaW9ufTsiXSwibmFtZXMiOlsibm9vcCIsInN0YXRlIiwiZDNfdXBkYXRlYWJsZSIsImQzX3NwbGF0IiwiYWNjZXNzb3IkMSIsInN0YXRlLmNvbXBfZXZhbCIsInN0YXRlLnFzIiwiYWNjZXNzb3IiLCJpZGVudGl0eSIsImtleSIsImQzIiwidGFibGUiLCJzZWxlY3QiLCJmaWx0ZXIiLCJwcmVwRGF0YSIsInAiLCJFWEFNUExFX0RBVEEiLCJ0aW1lc2VyaWVzWydkZWZhdWx0J10iLCJidWNrZXRzIiwiU1RPUFdPUkRTIiwiaG91cmJ1Y2tldHMiLCJ0aW1pbmdIZWFkZXJzIiwiY29tcHV0ZVNjYWxlIiwibm9ybWFsaXplUm93IiwidGltZXNlcmllcy5wcmVwRGF0YSIsImQzX2NsYXNzIiwicmVsYXRpdmVfdmlldyIsInRpbWluZ192aWV3Iiwic3RhZ2VkX2ZpbHRlcl92aWV3IiwiaW5pdCIsInMiLCJmaWx0ZXJJbml0IiwiYWN0aW9uSW5pdCIsImFwaS5hY3Rpb24iLCJoaXN0b3J5U3Vic2NyaXB0aW9ucyIsImFwaVN1YnNjcmlwdGlvbnMiLCJpbml0RXZlbnRzIiwiaW5pdFN1YnNjcmlwdGlvbnMiLCJhcGkuZGFzaGJvYXJkIiwiYXBpLmxpbmVfaXRlbSIsInZpZXciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBTyxNQUFNLGFBQWEsR0FBRyxTQUFTLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7RUFDdEUsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLE1BQUs7RUFDeEIsSUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJO0lBQzlDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQzs7RUFFRCxVQUFVLENBQUMsS0FBSyxFQUFFO0tBQ2YsTUFBTSxDQUFDLElBQUksRUFBQzs7RUFFZixPQUFPLFVBQVU7RUFDbEI7O0FBRUQsQUFBTyxNQUFNLFFBQVEsR0FBRyxTQUFTLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7RUFDakUsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLE1BQUs7RUFDeEIsSUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJO0lBQzlDLElBQUksSUFBSSxTQUFTLENBQUMs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QUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUM7SUFDbEYsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBSztJQUNqQixDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQztHQUM3QixFQUFDO0VBQ0YsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBQzs7O0VBR2xFLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsRUFBQzs7RUFFekUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtJQUNyQixDQUFDLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUc7SUFDdEMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsV0FBVyxJQUFJLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVc7O0lBRTdELENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFHO0dBQy9DLEVBQUM7O0VBRUYsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7S0FDekIsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENB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LEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBRztFQUN0QixPQUFPLElBQUk7Q0FDWjs7QUFFRCxBQUlDOztBQUVELEFBR0M7O0FBRUQsSUFBSSxHQUFHLEdBQUc7SUFDTixPQUFPLEVBQUUsU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFO1FBQzNCLE9BQU8sU0FBUyxDQUFDLEVBQUU7VUFDakIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUM7VUFDN0IsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDO1NBQzNHO09BQ0Y7SUFDSCxXQUFXLEVBQUUsU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFO1FBQy9CLE9BQU8sU0FBUyxDQUFDLEVBQUU7VUFDakIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUM7VUFDN0IsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDO1NBQzVHO09BQ0Y7RUFDTjs7QUFFRCxBQUFPLFNBQVMsY0FBYyxDQUFDLE9BQU8sRUFBRTtFQUN0QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQyxFQUFDO0VBQzNCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBQztFQUNsRSxPQUFPLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRO0NBQ3BEOztBQUVELEFBQU8sU0FBUyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7RUFDN0MsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDO0tBQ3JCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ3pCLEVBQUUsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQ2pDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO0tBQ2xCLEVBQUUsQ0FBQyxPQUFPLENBQUM7Q0FDZjs7QUNqRE0sU0FBUyxNQUFNLENBQUMsTUFBTSxFQUFFO0VBQzdCLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRTtFQUNiLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTTtDQUNyQjs7QUFFRCxTQUFTUCxNQUFJLEdBQUcsRUFBRTtBQUNsQixTQUFTUSxVQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7QUFDakMsU0FBU0MsS0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRTs7O0FBR2hDLEFBQWUsU0FBUyxNQUFNLENBQUMsTUFBTSxFQUFFO0VBQ3JDLE9BQU8sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDO0NBQzFCOztBQUVELE1BQU0sQ0FBQyxTQUFTLEdBQUc7SUFDZixPQUFPLEVBQUUsU0FBUyxHQUFHLEVBQUU7TUFDckIsT0FBT0YsVUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO0tBQzFDO0lBQ0QsSUFBSSxFQUFFLFdBQVc7O01BRWYsSUFBSSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUM7O01BRXpFLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQzs7TUFFeEMsSUFBSSxDQUFDLE9BQU87U0FDVCxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFDLEVBQUUsRUFBQzs7TUFFdkUsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDQyxVQUFRLENBQUNDLEtBQUcsQ0FBQztTQUNsRSxJQUFJLENBQUNBLEtBQUcsQ0FBQztTQUNULFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEtBQUs7O1VBRTNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDO1VBQ25DLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLFNBQVM7WUFDMUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQztZQUM1QixVQUFVLEdBQUcsSUFBSTs7U0FFcEIsRUFBQzs7TUFFSixPQUFPLElBQUk7S0FDWjtJQUNELFFBQVEsRUFBRSxTQUFTLEdBQUcsRUFBRTtNQUN0QixPQUFPRixVQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7S0FDM0M7SUFDRCxFQUFFLEVBQUUsU0FBUyxNQUFNLEVBQUUsRUFBRSxFQUFFO01BQ3ZCLElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUlQLE1BQUksQ0FBQztNQUN0RCxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztNQUN0QixPQUFPLElBQUk7S0FDWjtDQUNKOztBQy9DRCxTQUFTQSxNQUFJLEdBQUcsRUFBRTtBQUNsQixBQVNBLFNBQVMsVUFBVSxDQUFDLElBQUksRUFBRTtFQUN4QixJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxJQUFJLENBQUM7S0FDOUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7S0FDdkIsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUM7S0FDN0IsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUM7O0VBRTdCLElBQUksVUFBVSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztLQUN0RCxPQUFPLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxDQUFDO0tBQzFDLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO0tBQzVCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO0tBQzNCLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBQzs7RUFFN0MsT0FBTyxVQUFVO0NBQ2xCOztBQUVELFNBQVMsYUFBYSxDQUFDLElBQUksRUFBRTtFQUMzQixPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO0tBQy9DLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO0tBQ3pCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7S0FDOUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7S0FDckIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUM7S0FDN0IsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7S0FDNUIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7S0FDdkIsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUM7S0FDN0IsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUM7S0FDN0IsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztLQUNqQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDO0NBQ3RDOztBQUVELFNBQVMsUUFBUSxDQUFDLElBQUksRUFBRTtFQUN0QixPQUFPLGFBQWEsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO0tBQzlDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDO0tBQzNCLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDO0tBQzdCLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO0tBQzFCLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO0tBQzVCLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO0tBQzFCLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO0tBQzVCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUM7S0FDcEMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7S0FDdEIsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQzs7Q0FFcEM7OztBQUdELEFBQU8sU0FBUyxNQUFNLENBQUMsTUFBTSxFQUFFO0VBQzdCLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRTtFQUNiLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTTs7RUFFcEIsSUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLFdBQVc7OztLQUdoQyxFQUFDOztDQUVMOztBQUVELFNBQVMsTUFBTSxDQUFDLE1BQU0sRUFBRTtFQUN0QixPQUFPLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQztDQUMxQjs7QUFFRCxNQUFNLENBQUMsU0FBUyxHQUFHO0lBQ2YsSUFBSSxFQUFFLFNBQVMsR0FBRyxFQUFFO01BQ2xCLE9BQU9PLFVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztLQUN2Qzs7O0lBR0QsV0FBVyxFQUFFLFNBQVMsR0FBRyxFQUFFO01BQ3pCLE9BQU9BLFVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQztLQUM5QztJQUNELE9BQU8sRUFBRSxTQUFTLEdBQUcsRUFBRTtNQUNyQixPQUFPQSxVQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7S0FDMUM7SUFDRCxPQUFPLEVBQUUsU0FBUyxHQUFHLEVBQUU7TUFDckIsT0FBT0EsVUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO0tBQzFDO0lBQ0QsU0FBUyxFQUFFLFNBQVMsR0FBRyxFQUFFO01BQ3ZCLE9BQU9BLFVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQztLQUM1QztJQUNELElBQUksRUFBRSxXQUFXOzs7O01BSWYsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQztTQUN4RCxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksRUFBQzs7TUFFOUIsSUFBSSxXQUFXLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQztVQUNqQyxXQUFXLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztVQUM5QixTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBQzs7TUFFOUIsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO1FBQ3JCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQzs7OztRQUl4QyxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO1dBQzlCLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1dBQ3RCLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQztXQUNyQyxJQUFJLEdBQUU7O1FBRVQsTUFBTTtPQUNQOztNQUVELGFBQWEsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztTQUN6QyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztTQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBQzs7TUFFbkIsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFOztRQUVqQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUM7O1FBRXhDLElBQUksU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7V0FDOUIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7V0FDdEIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDO1dBQ3JDLElBQUksR0FBRTs7UUFFVCxTQUFTLENBQUMsT0FBTztXQUNkLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1dBQ3JCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFDOztRQUU5QixTQUFTLENBQUMsUUFBUTtXQUNmLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1dBQ3JCLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO1dBQzFCLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDO1dBQzVCLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1dBQy9CLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFDO09BQzFCOztNQUVELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTs7UUFFakIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDOztRQUVoQixJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1dBQy9FLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUM7V0FDaEMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUM7V0FDekIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7V0FDM0IsS0FBSyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQztXQUN0QyxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQztXQUM3QixLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztXQUM1QixLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztXQUMvQixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztXQUMzQixLQUFLLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDO1dBQy9CLElBQUksQ0FBQyxDQUFDLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsMENBQTBDLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7V0FDckcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQztXQUMxQixFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7OztPQUduRDs7TUFFRCxPQUFPLElBQUk7S0FDWjtJQUNELEVBQUUsRUFBRSxTQUFTLE1BQU0sRUFBRSxFQUFFLEVBQUU7TUFDdkIsSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSVAsTUFBSSxDQUFDO01BQ3RELElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO01BQ3RCLE9BQU8sSUFBSTtLQUNaO0NBQ0o7Ozs7QUNySkQsU0FBUyxLQUFLLENBQUMsTUFBTSxFQUFFO0VBQ3JCLElBQUksQ0FBQyxjQUFjLEdBQUcsZ0JBQWU7RUFDckMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7RUFDdEIsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFFO0VBQ2YsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFFO0VBQ2YsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFFO0VBQ3BCLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBQzs7RUFFYixJQUFJLENBQUMsaUJBQWlCLEdBQUcsVUFBVSxDQUFDLEVBQUU7SUFDcEMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPVSxJQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUN2RSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVE7UUFDakMsT0FBT0EsSUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztPQUN2QyxDQUFDOztJQUVKLE9BQU9BLElBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO01BQ3RDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUTtNQUNqQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHQSxJQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0tBQ2xGLENBQUM7SUFDSDs7RUFFRCxJQUFJLENBQUMsY0FBYyxHQUFHLEdBQUU7RUFDeEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFFOztFQUViLElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFDLEVBQUU7SUFDaENBLElBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQztJQUM3RCxJQUFJLElBQUksQ0FBQyxXQUFXLElBQUlBLElBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLEVBQUU7TUFDL0VBLElBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBQztNQUM5RCxPQUFPQSxJQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFO0tBQ2xFOztJQUVEQSxJQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxHQUFFO0lBQzFELElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzs7O0lBR2xELElBQUksRUFBRSxHQUFHQSxJQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBQztJQUN4RCxJQUFJLEVBQUUsR0FBRyxhQUFhLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7T0FDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBQzs7SUFFdkMsT0FBTyxFQUFFO0lBQ1Y7RUFDRCxJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsSUFBSSxFQUFFOzs7SUFHbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksRUFBRTtNQUN2QixJQUFJLE9BQU8sR0FBRyxhQUFhLENBQUNBLElBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztTQUMxRCxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztTQUN2QixLQUFLLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDO1NBQ25DLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1NBQzNCLEtBQUssQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUM7U0FDdkMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUM7O01BRWhDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFDOzs7TUFHaEIsYUFBYSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1NBQ2hDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1NBQ25CLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1NBQ3BCLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1NBQy9CLElBQUksQ0FBQyxTQUFTLEVBQUM7O01BRWxCLGFBQWEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztTQUNsQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztTQUNyQixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztTQUNwQixLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztTQUMvQixJQUFJLENBQUMsT0FBTyxFQUFDOzs7S0FHakIsRUFBQzs7SUFFSDtFQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxHQUFHLEVBQUU7O01BRTdCLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztTQUM1QixPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztTQUNuQixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztTQUNwQixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUN0QixLQUFLLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztTQUMxQixLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztTQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBQzs7TUFFbkMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1NBQzlCLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1NBQ3JCLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1NBQ3BCLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO1NBQy9CLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7U0FDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUM7O0lBRXZDO0NBQ0Y7O0FBRUQsQUFBTyxTQUFTQyxPQUFLLENBQUMsTUFBTSxFQUFFO0VBQzVCLE9BQU8sSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDO0NBQ3pCOztBQUVELEtBQUssQ0FBQyxTQUFTLEdBQUc7O0lBRWQsSUFBSSxFQUFFLFNBQVMsR0FBRyxFQUFFO01BQ2xCLElBQUksS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztNQUMzQyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLFNBQVMsRUFBRTtRQUMxRCxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQztRQUNwRixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBQztPQUN0QjtNQUNELE9BQU8sS0FBSztLQUNiO0lBQ0QsV0FBVyxFQUFFLFNBQVMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUM1RSxhQUFhLEVBQUUsU0FBUyxHQUFHLEVBQUUsRUFBRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFOzs7SUFHaEYsS0FBSyxFQUFFLFNBQVMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUNoRSxHQUFHLEVBQUUsU0FBUyxHQUFHLEVBQUUsRUFBRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ25FLGdCQUFnQixFQUFFLFNBQVMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ3RGLEdBQUcsRUFBRSxTQUFTLEdBQUcsRUFBRSxFQUFFLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7O0lBRTVELE1BQU0sRUFBRSxTQUFTLEdBQUcsRUFBRSxFQUFFLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUU7SUFDekUsT0FBTyxFQUFFLFNBQVMsR0FBRyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUNwRSxhQUFhLEVBQUUsU0FBUyxHQUFHLEVBQUUsRUFBRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2hGLFdBQVcsRUFBRSxXQUFXO01BQ3RCLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7VUFDakYsU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQzs7TUFFMUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7O1FBRWpELElBQUksU0FBUyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7VUFDaEUsSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sS0FBSztVQUM1RSxPQUFPO2NBQ0gsR0FBRyxDQUFDLENBQUM7Y0FDTCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Y0FDckIsUUFBUSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2NBQ3RCLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxTQUFTLENBQUM7V0FDekQ7U0FDRixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUM7UUFDOUMsSUFBSSxRQUFRLEdBQUcsU0FBUyxDQUFDLEVBQUU7VUFDekIsT0FBTyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7VUFDakU7O1FBRUQsU0FBUyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBQztRQUNoSCxPQUFPLFNBQVM7T0FDakI7V0FDSSxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUU7S0FDM0I7SUFDRCxJQUFJLEVBQUUsU0FBU0YsTUFBRyxDQUFDLFNBQVMsRUFBRTtNQUM1QixJQUFJLENBQUNBLE1BQUcsRUFBRSxPQUFPLElBQUksQ0FBQyxLQUFLO01BQzNCLElBQUksQ0FBQyxLQUFLLEdBQUc7VUFDVCxHQUFHLEVBQUVBLE1BQUc7VUFDUixLQUFLLEVBQUUsQ0FBQyxDQUFDLFNBQVM7UUFDckI7TUFDRCxPQUFPLElBQUk7S0FDWjs7SUFFRCxjQUFjLEVBQUUsV0FBVztNQUN6QixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsUUFBTzs7TUFFdkIsSUFBSSxPQUFPLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUM7U0FDNUQsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDO1NBQ2pDLEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFDOzs7TUFHL0IsSUFBSSxLQUFLLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO1NBQ3BELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1NBQ3BCLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFDOztNQUV4QixJQUFJLENBQUMsV0FBVyxHQUFHLE1BQUs7O01BRXhCLElBQUksS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBQztNQUNoRCxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUM7Ozs7TUFJcEMsSUFBSSxXQUFXLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO1NBQzNELE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDO1NBQ3ZCLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1NBQ3JCLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNyQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQzdCLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFDOztNQUU1QixJQUFJLElBQUksR0FBRyxLQUFJO01BQ2YsSUFBSTtNQUNKQyxJQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsV0FBVztRQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFDO1FBQ2hFLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLHFCQUFxQixFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFDO2FBQ3hGLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBQzs7UUFFdkMsSUFBSSxNQUFNLEdBQUcsR0FBRTs7UUFFZixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztXQUNwQixTQUFTLENBQUMsZ0JBQWdCLENBQUM7V0FDM0IsU0FBUyxDQUFDLElBQUksQ0FBQztXQUNmLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFDO1dBQzlCLEVBQUM7O1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7V0FDckIsU0FBUyxDQUFDLGdCQUFnQixDQUFDO1dBQzNCLFNBQVMsQ0FBQyxJQUFJLENBQUM7V0FDZixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2xCQSxJQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBQztXQUNoRCxFQUFDOztPQUVMLEVBQUM7T0FDRCxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7OztNQUdiLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBVzs7O01BRy9CLElBQUksS0FBSyxHQUFHLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBQzs7TUFFdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUU7UUFDdEIsSUFBSSxZQUFZLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDO1dBQzFELE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDO1dBQzVCLEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1dBQzVCLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1dBQ25CLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1dBQ3BCLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO1dBQ3pCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1dBQzNCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1dBQzNCLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1dBQzVCLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO1dBQzNCLElBQUksQ0FBQyxTQUFTLENBQUM7V0FDZixLQUFLLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQztXQUM3QixFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3RCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFDO1lBQzlFLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUM7V0FDN0QsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUM7T0FDaEI7O01BRUQsT0FBTyxPQUFPO0tBQ2Y7SUFDRCxhQUFhLEVBQUUsU0FBUyxLQUFLLEVBQUU7O01BRTdCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO1VBQ2hDLEtBQUssR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBQzs7TUFFcEMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksU0FBUyxFQUFFLE1BQU07O01BRXZDLElBQUksYUFBYSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDdkcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7U0FDdEMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUM7O01BRWhDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUM7TUFDbEcsSUFBSSxhQUFhLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUN0RixPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksRUFBQzs7O01BR2hDLElBQUksRUFBRSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO1NBQy9FLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUM3QyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztTQUM1QixLQUFLLEdBQUU7O01BRVYsSUFBSSxXQUFXLEdBQUcsU0FBUyxDQUFDLEVBQUU7VUFDMUIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLEtBQUssRUFBRTtZQUNwQixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUM7WUFDaEIsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFFO1lBQ2YsSUFBSSxDQUFDLElBQUksR0FBRTtXQUNaLE1BQU07WUFDTCxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSTs7WUFFakIsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUM7WUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRTtXQUNaO1NBQ0YsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDOzs7TUFHZCxhQUFhLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7U0FDNUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDckIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7U0FDekIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDcEMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJVixNQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxXQUFXLEVBQUM7Ozs7TUFJdEUsYUFBYSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO1NBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2xCLE9BQU8sQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxJQUFJLEdBQUcsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzNILE9BQU8sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxLQUFLLEdBQUcsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDOztNQUVoSSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7TUFDaEIsSUFBSSxVQUFVLEdBQUcsS0FBSTs7TUFFckIsSUFBSSxJQUFJLEdBQUdVLElBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO1NBQzFCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3RCLElBQUksQ0FBQyxHQUFHQSxJQUFFLENBQUMsS0FBSyxDQUFDLEdBQUU7WUFDbkIsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDQSxJQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDO1lBQ3pFLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSTtZQUMzQ0EsSUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFDOztZQUVyRCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBQztZQUMxR0EsSUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBQzs7WUFFOUUsSUFBSSxVQUFVLEVBQUU7Y0FDZCxVQUFVLEdBQUcsTUFBSztjQUNsQixVQUFVLENBQUMsV0FBVztnQkFDcEIsVUFBVSxHQUFHLEtBQUk7Z0JBQ2pCLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7a0JBQ2hGLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQztrQkFDbkMsSUFBSSxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUM7O2lCQUVqQyxFQUFDOzs7ZUFHSCxDQUFDLENBQUMsRUFBQzthQUNMOztTQUVKLENBQUMsQ0FBQzs7TUFFTCxJQUFJLFNBQVMsR0FBRyxhQUFhLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7U0FDdEMsS0FBSyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUM7U0FDNUIsS0FBSyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUM7U0FDMUIsS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7U0FDdkIsS0FBSyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7U0FDN0IsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUM7U0FDdEIsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUM7U0FDakIsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUM7U0FDdEIsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7U0FDbkIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxVQUFVO1dBQ3ZCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFDO1dBQzFHLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFDO1NBQzFHLENBQUM7U0FDRCxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVU7V0FDdEIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUM7V0FDMUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFDO1NBQ2xHLENBQUM7U0FDRCxJQUFJLENBQUMsSUFBSSxFQUFDOztNQUViLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEdBQUU7O01BRWxCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFO01BQ3hCLElBQUksT0FBTyxHQUFHLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDOUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztTQUN2QyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUMzQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFDOztNQUVqQyxJQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7U0FDOUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7U0FDdEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7U0FDdEIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUM7OztNQUdsQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFFOztNQUV0QixJQUFJLElBQUksR0FBRyxLQUFJOztNQUVmLGFBQWEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztTQUNsQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztTQUN2QixRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1VBQzlCLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLFNBQVE7VUFDekIsT0FBTyxDQUFDLENBQUMsUUFBUSxHQUFHLFNBQVMsR0FBRyxTQUFTO1NBQzFDLENBQUM7U0FDRCxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDaEQsRUFBRSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsRUFBRTtVQUN2QixDQUFDLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFPO1VBQ3pCLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRTtZQUNkLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDO1lBQ3RCLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRTtXQUNuQjtVQUNELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLFNBQVMsR0FBRyxDQUFDO2NBQ3RGLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7VUFFMUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDO1VBQzlCLElBQUksQ0FBQyxJQUFJLEdBQUU7O1NBRVosRUFBQzs7TUFFSixhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7U0FDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFDOztNQUU3Qzs7O0tBR0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBQztLQUMvRDs7SUFFRCxXQUFXLEVBQUUsU0FBUyxLQUFLLEVBQUU7O01BRTNCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztNQUNoQixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBQzs7TUFFcEMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksU0FBUyxFQUFFLE1BQU07TUFDdkMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTTs7TUFFMUUsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNO1VBQ3hCLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQzs7TUFFOUIsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQzdCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRO1lBQzlCLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUTs7UUFFbEMsT0FBTyxNQUFNLENBQUMsS0FBSyxHQUFHQSxJQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBR0EsSUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQzdELEVBQUM7O01BRUYsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztTQUNyRyxLQUFLLEVBQUU7U0FDUCxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1VBQ3RCLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSVYsTUFBSSxFQUFFO1lBQzdCLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztZQUMxQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDO1dBQ25DO1NBQ0YsRUFBQzs7TUFFSixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFFOztNQUVwQixJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztTQUMvRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7VUFDaEIsSUFBSSxLQUFLLEdBQUdVLElBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFDOztVQUUzQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUM7O1VBRXJDLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDYixRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUM7V0FDaEQsTUFBTTtZQUNMLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7V0FDOUI7OztTQUdGLEVBQUM7Ozs7TUFJSixFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFFOztNQUVsQixJQUFJLENBQUMsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDN0UsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7U0FDN0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7U0FDckIsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUM7O01BRS9CLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUM7OztNQUcvQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7U0FDckIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7U0FDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBQzs7Ozs7S0FLNUI7SUFDRCxXQUFXLEVBQUUsU0FBUyxHQUFHLEVBQUUsRUFBRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQzVFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUU7TUFDckIsSUFBSSxFQUFFLElBQUksU0FBUyxFQUFFLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLO01BQ3ZELElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRTtNQUN2QixPQUFPLElBQUk7S0FDWjtJQUNELElBQUksRUFBRSxXQUFXO01BQ2YsSUFBSSxJQUFJLEdBQUcsS0FBSTtNQUNmLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLEdBQUU7O01BRW5DLE9BQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO1NBQ3ZCLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtVQUNoQixJQUFJLENBQUMsYUFBYSxDQUFDQSxJQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFDO1NBQ3BDLEVBQUM7O01BRUosSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFDOztNQUVsQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRTs7TUFFNUIsT0FBTyxJQUFJOztLQUVaO0lBQ0QsRUFBRSxFQUFFLFNBQVMsTUFBTSxFQUFFLEVBQUUsRUFBRTtNQUN2QixJQUFJLEVBQUUsS0FBSyxTQUFTLEVBQUUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJVixNQUFJLENBQUM7TUFDdEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7TUFDdEIsT0FBTyxJQUFJO0tBQ1o7SUFDRCxFQUFFLEVBQUVVLElBQUU7Q0FDVDs7OztBQ25lTSxTQUFTLGFBQWEsQ0FBQyxNQUFNLEVBQUU7RUFDcEMsT0FBTyxJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUM7Q0FDaEM7O0FBRUQsTUFBTSxZQUFZLFNBQVMsZUFBZSxDQUFDO0VBQ3pDLFdBQVcsQ0FBQyxNQUFNLEVBQUU7SUFDbEIsS0FBSyxDQUFDLE1BQU0sRUFBQztJQUNiLElBQUksQ0FBQyxjQUFjLEdBQUcsd0JBQXVCO0dBQzlDOztFQUVELEtBQUssR0FBRyxFQUFFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxlQUFlLENBQUMsRUFBRTs7RUFFaEUsSUFBSSxHQUFHO0lBQ0wsSUFBSSxZQUFZLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFDOztJQUV6RCxRQUFRLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQztPQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFDOztJQUVyQixJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBQzs7O0lBR3pDQyxPQUFLLENBQUMsS0FBSyxDQUFDO09BQ1QsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUM7T0FDeEMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO09BQzVCLFdBQVcsQ0FBQyxJQUFJLENBQUM7T0FDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztPQUN2QixJQUFJLEdBQUU7O0dBRVY7Q0FDRjs7QUN6QkQsU0FBU1gsTUFBSSxHQUFHLEVBQUU7QUFDbEIsQUFHTyxTQUFTLFVBQVUsQ0FBQyxNQUFNLEVBQUU7RUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRztJQUNULE1BQU0sRUFBRUEsTUFBSTtJQUNiOztFQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTTtFQUNwQixJQUFJLENBQUMsZUFBZSxHQUFHO01BQ25CLFVBQVUsRUFBRSxzQkFBc0I7TUFDbEMsT0FBTyxFQUFFLEtBQUs7TUFDZCxNQUFNLEVBQUUsTUFBTTtJQUNqQjtDQUNGOztBQUVELEFBQWUsU0FBUyxXQUFXLENBQUMsTUFBTSxFQUFFO0VBQzFDLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO0NBQzlCOztBQUVELFVBQVUsQ0FBQyxTQUFTLEdBQUc7SUFDbkIsSUFBSSxFQUFFLFNBQVMsR0FBRyxFQUFFO01BQ2xCLE9BQU9PLFVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztLQUN2QztJQUNELEtBQUssRUFBRSxTQUFTLEdBQUcsRUFBRTtNQUNuQixPQUFPQSxVQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7S0FDeEM7SUFDRCxVQUFVLEVBQUUsU0FBUyxHQUFHLEVBQUU7TUFDeEIsT0FBT0EsVUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDO0tBQzdDO0lBQ0QsT0FBTyxFQUFFLFNBQVMsR0FBRyxFQUFFO01BQ3JCLE9BQU9BLFVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztLQUMxQztJQUNELElBQUksRUFBRSxXQUFXOztNQUVmLElBQUksT0FBTyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ3RGLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFDOztNQUU5QixNQUFNLENBQUMsT0FBTyxDQUFDO1NBQ1osSUFBSSxDQUFDLFFBQVEsQ0FBQztTQUNkLElBQUksR0FBRTs7TUFFVCxJQUFJLFFBQVEsR0FBRyxhQUFhLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLEtBQUssQ0FBQztTQUM1RCxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDO1NBQy9CLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUM7U0FDcEMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7U0FDNUIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7U0FDNUIsS0FBSyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUM7U0FDOUIsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUM7O01BRWhDLGFBQWEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztTQUN4QyxJQUFJLENBQUMsaUJBQWlCLEVBQUU7U0FDeEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUM7O01BRXhCLElBQUksV0FBVyxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUM1RCxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBQzs7TUFFekIsTUFBTSxDQUFDLFdBQVcsQ0FBQztTQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ3JCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7VUFDeEIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUMzQixDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBQztXQUM5QixFQUFDO1VBQ0YsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUM7U0FDdEMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDWixJQUFJLEdBQUU7O01BRVQsYUFBYSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO1NBQ3ZDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztTQUMxQixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksRUFBQzs7Ozs7TUFLdkIsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsR0FBRTtNQUNsQyxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUM7O01BRXZELFNBQVMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7UUFDcEMsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDOztRQUVoQixJQUFJSyxTQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1dBQy9DLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1dBQ3RCLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBQzs7UUFFaEMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQztXQUNuQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDaEIsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDO1lBQzNDLElBQUksT0FBTyxFQUFFLE9BQU8sR0FBRTtXQUN2QixFQUFDOzs7UUFHSixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUNBLFNBQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQztVQUNqQyxPQUFPLEVBQUUsS0FBSztVQUNkLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNqQixLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxFQUFFLElBQUksRUFBQztZQUN4RCxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBQztZQUM5QixPQUFPO2NBQ0wsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQzthQUNsQjtXQUNGO1VBQ0QsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ25CLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDO1lBQ3RGLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFDO1lBQzlCLE9BQU87Y0FDTCxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDO2FBQ2xCO1dBQ0Y7U0FDRixFQUFDOztRQUVGLE1BQU0sQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUM7V0FDbkMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXO1lBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFFO1dBQ3pCLEVBQUM7O09BRUw7O01BRUQsU0FBUyxlQUFlLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRTtRQUNyQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7O1FBRWhCLE1BQU0sQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxNQUFNLEdBQUU7O1FBRS9DLE1BQU0sQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUM7V0FDbkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2hCLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQztZQUMzQyxJQUFJLE9BQU8sRUFBRSxPQUFPLEdBQUU7V0FDdkIsRUFBQzs7Ozs7UUFLSixJQUFJQSxTQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDO1dBQ3ZELE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1dBQ3JCLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDO1dBQzdCLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1dBQzVCLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO1dBQzFCLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO1dBQzFCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1dBQ3JCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDdkIsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBSztZQUN4QixJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBQztXQUMvQixFQUFDOztRQUVKLFFBQVEsQ0FBQ0EsU0FBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7V0FDdkUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sS0FBSyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLFNBQVMsRUFBRSxDQUFDO1dBQy9HLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDOztRQUVyQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUNBLFNBQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQztVQUNqQyxPQUFPLEVBQUUsS0FBSztVQUNkLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtZQUNwQixLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDO1lBQ3pCLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFDO1dBQy9CO1NBQ0YsRUFBQzs7UUFFRixNQUFNLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDO1dBQ25DLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVztZQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRTtXQUN6QixFQUFDOzs7OztPQUtMOztNQUVELElBQUksQ0FBQyxhQUFhLEdBQUdDLFFBQU0sQ0FBQyxPQUFPLENBQUM7U0FDakMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1NBQ3pDLEdBQUcsQ0FBQztZQUNELENBQUMsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3pELENBQUMsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1lBQ3JFLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuRCxDQUFDO1NBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNwQixTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDO1NBQzlDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxjQUFjLENBQUM7U0FDdEQsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztTQUMzQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsZUFBZSxDQUFDO1NBQy9DLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxNQUFNLENBQUMsS0FBSyxFQUFFO1VBQzFDLElBQUksSUFBSSxHQUFHLEtBQUk7O1VBRWYsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUM7O1VBRXBFLGFBQWEsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDO2FBQzVDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO2FBQ3pCLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDO2FBQzdCLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO2FBQzVCLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO2FBQ3JCLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUM3QixFQUFFLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2NBQ3RCLElBQUksQ0FBQyxHQUFHLEtBQUk7O2NBRVosSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXO2dCQUN4QixLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFLO2dCQUN4QixJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBQztlQUMvQixDQUFDLElBQUksRUFBQzthQUNSLEVBQUM7O1VBRUosYUFBYSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7YUFDMUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7YUFDekIsSUFBSSxDQUFDLE9BQU8sRUFBQzs7VUFFaEIsYUFBYSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7YUFDN0MsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7YUFDMUIsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUM7YUFDN0IsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7YUFDNUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7YUFDckIsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzdCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7Y0FDdEIsSUFBSSxDQUFDLEdBQUcsS0FBSTs7Y0FFWixJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVc7Z0JBQ3hCLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQUs7Z0JBQ3hCLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFDO2VBQy9CLENBQUMsSUFBSSxFQUFDO2FBQ1IsRUFBQztTQUNMLENBQUM7U0FDRCxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsT0FBTyxDQUFDO1VBQzVCLGFBQWEsQ0FBQyxPQUFPLEVBQUM7U0FDdkIsQ0FBQztTQUNELElBQUksR0FBRTs7Ozs7Ozs7Ozs7O01BWVQsT0FBTyxJQUFJO0tBQ1o7SUFDRCxFQUFFLEVBQUUsU0FBUyxNQUFNLEVBQUUsRUFBRSxFQUFFO01BQ3ZCLElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUliLE1BQUksQ0FBQztNQUN0RCxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztNQUN0QixPQUFPLElBQUk7S0FDWjtDQUNKOztBQ25QRCxTQUFTQSxNQUFJLEdBQUcsRUFBRTtBQUNsQixTQUFTUSxVQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7QUFDakMsU0FBU0MsS0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRTs7QUFFaEMsQUFBTyxTQUFTLFdBQVcsQ0FBQyxNQUFNLEVBQUU7RUFDbEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFFO0VBQ2IsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFNO0NBQ3JCOztBQUVELEFBQWUsU0FBUyxZQUFZLENBQUMsTUFBTSxFQUFFO0VBQzNDLE9BQU8sSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDO0NBQy9COztBQUVELFdBQVcsQ0FBQyxTQUFTLEdBQUc7SUFDcEIsSUFBSSxFQUFFLFNBQVMsR0FBRyxFQUFFO01BQ2xCLE9BQU9GLFVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztLQUN2QztJQUNELEVBQUUsRUFBRSxTQUFTLE1BQU0sRUFBRSxFQUFFLEVBQUU7TUFDdkIsSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSVAsTUFBSSxDQUFDO01BQ3RELElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO01BQ3RCLE9BQU8sSUFBSTtLQUNaO0lBQ0QsSUFBSSxFQUFFLFlBQVk7O0lBRWxCLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxXQUFXOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BbUJoQyxFQUFDOztJQUVKLGFBQWEsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQztPQUN0RCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztPQUN2QixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDOztJQUVuRSxJQUFJLE9BQU8sR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUM7T0FDL0QsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQztPQUNoQyxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBQzs7O0lBR2hDLElBQUksVUFBVSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7T0FDdEUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUM7O0lBRS9CLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQzs7SUFFdkMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDUSxVQUFRLEVBQUVDLEtBQUcsQ0FBQztPQUNsRCxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztPQUMzQixPQUFPLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7T0FDdEQsSUFBSSxDQUFDQSxLQUFHLENBQUM7T0FDVCxFQUFFLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUM7O0lBRXhDLE9BQU8sSUFBSTs7S0FFVjs7Q0FFSjs7QUNuRUQsU0FBU1QsTUFBSSxHQUFHLEVBQUU7QUFDbEIsQUFJTyxTQUFTLFVBQVUsQ0FBQyxNQUFNLEVBQUU7RUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRztJQUNULE1BQU0sRUFBRUEsTUFBSTtJQUNiO0VBQ0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFNO0NBQ3JCOzs7O0FBSUQsQUFBZSxTQUFTLFdBQVcsQ0FBQyxNQUFNLEVBQUU7RUFDMUMsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7Q0FDOUI7O0FBRUQsVUFBVSxDQUFDLFNBQVMsR0FBRztJQUNuQixJQUFJLEVBQUUsU0FBUyxHQUFHLEVBQUU7TUFDbEIsT0FBT08sVUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0tBQ3ZDO0lBQ0QsT0FBTyxFQUFFLFNBQVMsR0FBRyxFQUFFO01BQ3JCLE9BQU9BLFVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztLQUMxQztJQUNELElBQUksRUFBRSxXQUFXOzs7TUFHZixJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO1NBQ3ZELE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFDOzs7Ozs7TUFNOUIsWUFBWSxDQUFDLElBQUksQ0FBQztTQUNmLEVBQUUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtTQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ2pCLElBQUksR0FBRTs7TUFFVCxPQUFPLElBQUk7S0FDWjtJQUNELEVBQUUsRUFBRSxTQUFTLE1BQU0sRUFBRSxFQUFFLEVBQUU7TUFDdkIsSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSVAsTUFBSSxDQUFDO01BQ3RELElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO01BQ3RCLE9BQU8sSUFBSTtLQUNaO0NBQ0o7O0FDaERNLFNBQVNjLFVBQVEsR0FBRztFQUN6QixPQUFPQyxRQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUM7Q0FDaEMsQUFBQzs7QUFFRixJQUFJQyxjQUFZLEdBQUc7SUFDZixLQUFLLEVBQUUsMkJBQTJCO0lBQ2xDLFFBQVEsRUFBRTtNQUNSO1VBQ0ksS0FBSyxFQUFFLENBQUM7VUFDUixPQUFPLEVBQUUsS0FBSztPQUNqQjtNQUNEO1VBQ0ksS0FBSyxFQUFFLENBQUM7VUFDUixPQUFPLEVBQUUsS0FBSztPQUNqQjtNQUNEO1VBQ0ksS0FBSyxFQUFFLElBQUk7VUFDWCxPQUFPLEVBQUUsS0FBSztPQUNqQjtNQUNEO1VBQ0ksS0FBSyxFQUFFLEdBQUc7VUFDVixPQUFPLEVBQUUsS0FBSztPQUNqQjtNQUNEO1VBQ0ksS0FBSyxFQUFFLENBQUM7VUFDUixPQUFPLEVBQUUsSUFBSTtPQUNoQjs7TUFFRDtVQUNJLEtBQUssRUFBRSxDQUFDO1VBQ1IsT0FBTyxFQUFFLEtBQUs7T0FDakI7OztHQUdKO0VBQ0Y7O0FBRUQsQUFBTyxTQUFTLFVBQVUsQ0FBQyxNQUFNLEVBQUU7RUFDakMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7RUFDdEIsSUFBSSxDQUFDLEtBQUssR0FBR0EsZUFBWTtFQUN6QixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUU7Q0FDZDs7QUFFRCxBQUFlLFNBQVMsV0FBVyxDQUFDLE1BQU0sRUFBRTtFQUMxQyxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztDQUM5Qjs7QUFFRCxVQUFVLENBQUMsU0FBUyxHQUFHOztJQUVuQixJQUFJLEVBQUUsU0FBUyxHQUFHLEVBQUUsRUFBRSxPQUFPVCxVQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUM5RCxFQUFFLEVBQUUsU0FBUyxNQUFNLENBQUMsRUFBRSxFQUFFO01BQ3RCLElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksV0FBVyxFQUFFLENBQUM7TUFDL0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7TUFDdEIsT0FBTyxJQUFJO0tBQ1o7SUFDRCxLQUFLLEVBQUUsU0FBUyxHQUFHLEVBQUUsRUFBRSxPQUFPQSxVQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUNoRSxNQUFNLEVBQUUsU0FBUyxHQUFHLEVBQUUsRUFBRSxPQUFPQSxVQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTs7SUFFbEUsSUFBSSxFQUFFLFdBQVc7TUFDZixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsUUFBTztNQUN2QixJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQztTQUM1RCxPQUFPLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDO1NBQ3ZDLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO1NBQzFCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQ3RCLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1NBQ3JCLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDOztNQUVwQixJQUFJLE9BQU8sR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7U0FDekMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7U0FDakIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDdEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUM7OztNQUd4QixJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7Ozs7TUFJaEIsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQzs7UUFFeEIsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3RCxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQzs7O1FBR3hCLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLEVBQUUsQ0FBQztVQUMvRixRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzs7UUFFL0MsSUFBSSxhQUFhLEdBQUcsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUU7WUFDOUMsY0FBYyxHQUFHLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFO1lBQ2hELFdBQVcsR0FBRyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsR0FBRTs7UUFFOUMsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7O1FBRTlFLElBQUksT0FBTyxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUM7UUFDekcsSUFBSSxNQUFNLEdBQUcsUUFBTzs7UUFFcEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQ25DLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUM7OztRQUdwRCxJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRTtXQUNqQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztXQUMvRCxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7O1FBRWpCLElBQUksUUFBUSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztXQUM5QyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7V0FDdEUsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFDOztRQUUzRSxJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztXQUMxRixJQUFJLENBQUMsV0FBVyxFQUFFLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBQzs7UUFFdkUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDOztRQUVqRixJQUFJLFNBQVMsR0FBRyxTQUFTLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7O1VBRTNELElBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLEVBQUUsYUFBYSxHQUFHLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQzthQUNuRSxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksR0FBRyxDQUFDLEVBQUM7O1VBRWxDLElBQUk7YUFDRCxJQUFJLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQzthQUNyRSxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsR0FBRyxDQUFDLENBQUM7YUFDM0IsSUFBSSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsRUFBRTtjQUNyQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDekMsQ0FBQzthQUNELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO2FBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksTUFBTSxFQUFFLEVBQUU7OzthQUcvRSxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO2FBQ3hGLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO2FBQ3BCLEVBQUUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7Y0FDekIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDO2FBQy9CLEVBQUM7O1VBRUw7OztRQUdELElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRTtVQUN6QyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUM7VUFDdEQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7VUFDbkYsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUM7U0FDbkQ7OztRQUdELFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDOzs7TUFHaEQsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7U0FDcEIsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDekIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBQzs7O01BR3hCLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO1NBQ3RCLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDUixLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ1IsVUFBVSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7O01BRXZDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO1dBQ1YsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7V0FDdkIsSUFBSSxDQUFDLFdBQVcsRUFBRSxjQUFjLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7V0FDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOzs7OztPQUtoQixFQUFDOzs7S0FHSDtDQUNKOztBQzVLYyxNQUFNLGFBQWEsU0FBUyxlQUFlLENBQUM7RUFDekQsV0FBVyxDQUFDLE1BQU0sRUFBRTtJQUNsQixLQUFLLEdBQUU7SUFDUCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU07SUFDckIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFHO0lBQ2hCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBSztJQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUM7SUFDeEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDO0lBQ3RDLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBQztHQUN6Qzs7RUFFRCxLQUFLLEdBQUcsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFOztFQUV0QyxJQUFJLEdBQUc7O0lBRUwsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEVBQUM7O0lBRXZELFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBQztJQUN4QyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUM7O0lBRWxDLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBQzs7SUFFN0MsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtNQUM5QixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUM7TUFDaEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUM7S0FDcEM7O0lBRUQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO09BQ3BFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO09BQ2QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUM5QixLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQzlDLElBQUksQ0FBQyxNQUFNLEVBQUM7O0lBRWYsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO09BQ3BFLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUM7T0FDaEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7T0FDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7T0FDdEIsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO09BQy9DLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO09BQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUMzRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDOztHQUUvRTtDQUNGOztBQzNDTSxTQUFTLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUU7RUFDcEQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEdBQUc7TUFDaEIsTUFBTSxHQUFHLENBQUMsSUFBSSxHQUFFOztFQUVwQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUM7RUFDckcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUM7O0VBRXRGLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBQzs7RUFFdkUsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUM1QyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdkIsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUM7S0FDckMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtLQUM5QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcs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RSxPQUFPQSxVQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUN0RCxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBT0EsVUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDeEQsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU9BLFVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFOztFQUUxRCxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBT0EsVUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDcEQsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU9BLFVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFOzs7OztFQUt0RCxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBT0EsVUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDcEQsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU9BLFVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFOztFQUV0RCxXQUFXLEdBQUc7O0lBRVosSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRTtRQUNsQixPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUN4QixNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFFOztJQUVoRCxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFO09BQzdCLE1BQU0sQ0FBQyxDQUFDLENB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LFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxHQUFFO0FBQ2pFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBQztBQUN2QixJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUU7O0FBRXBELEFBQU8sTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7RUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDO0VBQ25ELE9BQU8sQ0FBQztDQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQzs7QUFFTixBQUFPLFNBQVMsU0FBUyxDQUFDLE1BQU0sRUFBRTs7RUFFaEMsSUFBSSxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0lBQzVDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUM7SUFDYixPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FB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
