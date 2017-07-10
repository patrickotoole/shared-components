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
    this._color = d3.scale.ordinal()
      .range(
['#999','#aaa','#bbb','#ccc','#ddd','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','rgba(33, 113, 181,.9)','rgba(8, 81, 156,.91)','#08519c','rgba(8, 48, 107,.9)','#08306b'].reverse());

  } 

  key_accessor(val) { return accessor$2.bind(this)("key_accessor",val) }
  value_accessor(val) { return accessor$2.bind(this)("value_accessor",val) }
  height(val) { return accessor$2.bind(this)("height",val) }
  width(val) { return accessor$2.bind(this)("width",val) }


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

  return Object.assign({key:x.key},obj)
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
    Object.keys(c).filter(z => z != "domain" && z != "weighted").map(function(x) {
      p = c[x] > p ? c[x] : p;
    });
  
    return p
  },0);

  return d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])
};

__$styleInject(".ba-row {\n        padding-bottom:60px;\n}\n\n.ba-row .expanded td {\nbackground:#f9f9fb;\n            padding-top:10px;\n            padding-bottom:10px;\n}\n\n.ba-row th {\n  border-right:1px rgba(0,0,0,.1);\n}\n\n.ba-row th span.greater-than {\nfont-size:.9em;\nwidth:70px;\ntransform:rotate(45deg);\ntext-align:right;\ndisplay:inline-block;\nmargin-left: -48px;\nmargin-bottom: 12px;\n\n}\n.ba-row th span.less-than {\nfont-size:.9em;\nwidth:70px;\ntransform:rotate(-45deg);\ndisplay:inline-block;\nmargin-left:-9px;\nmargin-bottom: 12px\n}\n.ba-row .table-wrapper tr th {\n  border:0px\n}\n",undefined);

function relative_timing(target) {
  return new RelativeTiming(target)
}

class RelativeTiming extends D3ComponentBase {
  constructor(target) {
    super(target);
  }

  props() { return ["data","normalize", "sort", "ascending"] }

  draw() {

    var self = this;
    var data = this._data
      , filtered = data.filter(function(x){ return x.selected})
      , selected = filtered.length ? filtered[0] : data[0];

    var wrap = d3_class(this._target,"summary-wrap");

    header(wrap)
      .text(selected.key)
      .options(data)
      .on("select", function(x) { this.on("select")(x); }.bind(this))
      .draw();

    var totals_by_time= totalsByTime(selected.values);
    var values = normalize(totals_by_time);

    var ts = d3_class(wrap,"timeseries-row");
    var svg = d3_updateable(ts,"svg","svg").attr("width",936).attr("height",80).style("margin-left","254px");

    simpleTimeseries(svg,values,682,80,-2);


    var bawrap = d3_class(wrap,"ba-row");




    const sorted_tabular = selected.values.filter(x => x.key != "")
      .map(this.normalize() ? normalizeRow : identity)
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
            return "rgba(70, 130, 180," + oscale(Math.log(value+1)) + ")"
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

const computeScale$1 = (data) => {

  const max = 1000; // need to actually compute this from data

  return d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])
};

__$styleInject(".timing-row {\n        padding-bottom:60px;\n}\n\n.timing-row .expanded {\n  background:white;\n  padding:20px\n}\n\n.timing-row tr td:not(:first-child) {\n          border-right:1px solid white;\n          padding-left:0px;\n          text-align:center;\n\n}\n.timing-row .table-wrapper tr th {\n  padding:5px; text-align:center\n}\n",undefined);

function timing(target) {
  return new Timing(target)
}

class Timing extends D3ComponentBase {
  constructor(target) {
    super(target);
  }

  props() { return ["data","normalize", "sort", "ascending"] }


  draw() {

    var self = this;
    var data = this._data
      , filtered = data.filter(function(x){ return x.selected})
      , selected = filtered.length ? filtered[0] : data[0];


    var wrap = d3_class(this._target,"timing-wrap");

    const headers = [{key:"key",value:selected.key.replace("Top ","")}].concat(timingHeaders$1);
    const d = data[0].values;//timingTabular(data.full_urls)
    const oscale = computeScale$1(d);

    const _default = "total";
    const s = this.sort(); 
    const asc = this.ascending(); 


    const selectedHeader = headers.filter(x => x.key == s);
    const sortby = selectedHeader.length ? selectedHeader[0].key : _default;



    header(wrap)
      .text(selected.key)
      .options(data)
      .on("select", function(x) { this.on("select")(x); }.bind(this))
      .draw();

    var timingwrap = d3_class(wrap,"timing-row");

    var table_obj = table$1(timingwrap)
      .top(140)
      .headers(headers)
      .sort(sortby,asc)
      .on("sort", this.on("sort"))
      .data(selected)
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
             .normalize(self.transform() == "normalize")
             .data(self.before_tabs())
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

        const catmap = (x) => Object.assign(x,{key:x.parent_category_name});

        const before_urls = filterUrls(_state.data.before,logic,filters).map(x => Object.assign({key:x.domain},x) )
          , after_urls = filterUrls(_state.data.after,logic,filters).map(x => Object.assign({key:x.domain},x) )
          , before_and_after = buildBeforeAndAfter(before_urls,after_urls,cat_summary,_state.sortby)
          , before_after_tabular = beforeAndAfterTabular(before_urls,after_urls)
          , cat_before_after_tabular = beforeAndAfterTabular(before_urls.map(catmap),after_urls.map(catmap));

        const before_tabs = [
            {key:"Top Domains",values:before_after_tabular}
          , {key:"Top Categories",values:cat_before_after_tabular}
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
     .draw();
   
  }
}

var version = "0.0.1";

exports.version = version;
exports.view = new_dashboard;
exports.build = build;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFzaGJvYXJkLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvaGVscGVycy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdGF0ZS9zcmMvc3RhdGUuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvc3JjL3FzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N0YXRlL3NyYy9jb21wX2V2YWwuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvbWVkaWFfcGxhbi9zcmMvbWVkaWFfcGxhbi5qcyIsIi4uL25vZGVfbW9kdWxlcy9maWx0ZXIvYnVpbGQvZmlsdGVyLmVzLmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzLmpzIiwiLi4vc3JjL2hlbHBlcnMvZ3JhcGhfaGVscGVycy5qcyIsIi4uL3NyYy9oZWxwZXJzL3N0YXRlX2hlbHBlcnMuanMiLCIuLi9zcmMvaGVscGVycy5qcyIsIi4uL3NyYy9nZW5lcmljL3NlbGVjdC5qcyIsIi4uL3NyYy9nZW5lcmljL2hlYWRlci5qcyIsIi4uL25vZGVfbW9kdWxlcy90YWJsZS9zcmMvdGFibGUuanMiLCIuLi9ub2RlX21vZHVsZXMvdGFibGUvc3JjL3N1bW1hcnlfdGFibGUuanMiLCIuLi9zcmMvdmlld3MvZmlsdGVyX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy9idXR0b25fcmFkaW8uanMiLCIuLi9zcmMvdmlld3Mvb3B0aW9uX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy90aW1lc2VyaWVzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdGFidWxhcl90aW1lc2VyaWVzL2hlYWRlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9jaGFydC9zcmMvc2ltcGxlX3RpbWVzZXJpZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL2JhX3RpbWVzZXJpZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL3NpbXBsZV9iYXIuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL2J1bGxldC5qcyIsIi4uL25vZGVfbW9kdWxlcy9jb21wb25lbnQvc3JjL3RhYnVsYXJfdGltZXNlcmllcy9ib2R5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdGFidWxhcl90aW1lc2VyaWVzL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvZG9tYWluX2V4cGFuZGVkLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdmVydGljYWxfb3B0aW9uLmpzIiwiLi4vc3JjL3ZpZXdzL2RvbWFpbl92aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3NlZ21lbnRfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2RpZmZfYmFyLmpzIiwiLi4vc3JjL2dlbmVyaWMvY29tcF9iYXIuanMiLCIuLi9zcmMvdmlld3Mvc3VtbWFyeS9jYXRlZ29yeS5qcyIsIi4uL3NyYy9nZW5lcmljL2NvbXBfYnViYmxlLmpzIiwiLi4vc3JjL2dlbmVyaWMvc3RyZWFtX3Bsb3QuanMiLCIuLi9zcmMvdmlld3Mvc3VtbWFyeS9iZWZvcmVfYW5kX2FmdGVyLmpzIiwiLi4vc3JjL2dlbmVyaWMvcGllLmpzIiwiLi4vc3JjL3ZpZXdzL3N1bW1hcnkvc2FtcGxlX3ZzX3BvcC5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5L3RpbWluZy5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5L3ZpZXcuanMiLCIuLi9zcmMvdmlld3MvcmVsYXRpdmVfdGltaW5nL3JlZmluZV9yZWxhdGl2ZV9wcm9jZXNzLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy9yZWZpbmVfcmVsYXRpdmUuanMiLCIuLi9zcmMvdmlld3MvcmVsYXRpdmVfdGltaW5nL3JlbGF0aXZlX3RpbWluZ19jb25zdGFudHMuanMiLCIuLi9zcmMvdmlld3MvcmVsYXRpdmVfdGltaW5nL3JlbGF0aXZlX3RpbWluZ19wcm9jZXNzLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy92aWV3LmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2NhdGVnb3J5LmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzL3RpbWluZy5qcyIsIi4uL3NyYy92aWV3cy90aW1pbmcvdGltaW5nX2NvbnN0YW50cy5qcyIsIi4uL3NyYy92aWV3cy90aW1pbmcvdGltaW5nX3Byb2Nlc3MuanMiLCIuLi9zcmMvdmlld3MvdGltaW5nL3ZpZXcuanMiLCIuLi9zcmMvdmlld3Mvc3RhZ2VkX2ZpbHRlcl92aWV3LmpzIiwiLi4vc3JjL2dlbmVyaWMvY29uZGl0aW9uYWxfc2hvdy5qcyIsIi4uL3NyYy9nZW5lcmljL3NoYXJlLmpzIiwiLi4vc3JjL3ZpZXcuanMiLCIuLi9ub2RlX21vZHVsZXMvYXBpL3NyYy9hY3Rpb24uanMiLCIuLi9ub2RlX21vZHVsZXMvYXBpL2luZGV4LmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2JlZm9yZV9hbmRfYWZ0ZXIuanMiLCIuLi9zcmMvaGVscGVycy9kYXRhX2hlbHBlcnMvdXJscy5qcyIsIi4uL3NyYy9oZWxwZXJzL2RhdGFfaGVscGVycy9kb21haW5zLmpzIiwiLi4vc3JjL2V2ZW50cy9maWx0ZXJfZXZlbnRzLmpzIiwiLi4vc3JjL2V2ZW50cy9hY3Rpb25fZXZlbnRzLmpzIiwiLi4vc3JjL2V2ZW50cy5qcyIsIi4uL3NyYy9zdWJzY3JpcHRpb25zL2hpc3RvcnkuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy9hcGkuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy5qcyIsIi4uL3NyYy9idWlsZC5qcyIsImJ1bmRsZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgZDNfdXBkYXRlYWJsZSA9IGZ1bmN0aW9uKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZXhwb3J0IGNvbnN0IGQzX3NwbGF0ID0gZnVuY3Rpb24odGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCJcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKVxuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSlcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZDNfY2xhc3ModGFyZ2V0LGNscyx0eXBlLGRhdGEpIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLlwiICsgY2xzLCB0eXBlIHx8IFwiZGl2XCIsZGF0YSlcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vb3AoKSB7fVxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZXhwb3J0IGZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgY2xhc3MgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICAgIHRoaXMucHJvcHMoKS5tYXAoeCA9PiB7XG4gICAgICB0aGlzW3hdID0gYWNjZXNzb3IuYmluZCh0aGlzLHgpXG4gICAgfSlcbiAgfVxuICBwcm9wcygpIHtcbiAgICByZXR1cm4gW1wiZGF0YVwiXVxuICB9XG4gIG9uKGFjdGlvbixmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gU3RhdGUoX2N1cnJlbnQsIF9zdGF0aWMpIHtcblxuICB0aGlzLl9ub29wID0gZnVuY3Rpb24oKSB7fVxuICB0aGlzLl9ldmVudHMgPSB7fVxuXG4gIHRoaXMuX29uID0ge1xuICAgICAgXCJjaGFuZ2VcIjogdGhpcy5fbm9vcFxuICAgICwgXCJidWlsZFwiOiB0aGlzLl9ub29wXG4gICAgLCBcImZvcndhcmRcIjogdGhpcy5fbm9vcFxuICAgICwgXCJiYWNrXCI6IHRoaXMuX25vb3BcbiAgfVxuXG4gIHRoaXMuX3N0YXRpYyA9IF9zdGF0aWMgfHwge31cblxuICB0aGlzLl9jdXJyZW50ID0gX2N1cnJlbnQgfHwge31cbiAgdGhpcy5fcGFzdCA9IFtdXG4gIHRoaXMuX2Z1dHVyZSA9IFtdXG5cbiAgdGhpcy5fc3Vic2NyaXB0aW9uID0ge31cbiAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcblxuXG59XG5cblN0YXRlLnByb3RvdHlwZSA9IHtcbiAgICBzdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9zdGF0ZSlcbiAgICB9XG4gICwgcHVibGlzaDogZnVuY3Rpb24obmFtZSxjYikge1xuXG4gICAgICAgdmFyIHB1c2hfY2IgPSBmdW5jdGlvbihlcnJvcix2YWx1ZSkge1xuICAgICAgICAgaWYgKGVycm9yKSByZXR1cm4gc3Vic2NyaWJlcihlcnJvcixudWxsKVxuICAgICAgICAgXG4gICAgICAgICB0aGlzLnVwZGF0ZShuYW1lLCB2YWx1ZSlcbiAgICAgICAgIHRoaXMudHJpZ2dlcihuYW1lLCB0aGlzLnN0YXRlKClbbmFtZV0sIHRoaXMuc3RhdGUoKSlcblxuICAgICAgIH0uYmluZCh0aGlzKVxuXG4gICAgICAgaWYgKHR5cGVvZiBjYiA9PT0gXCJmdW5jdGlvblwiKSBjYihwdXNoX2NiKVxuICAgICAgIGVsc2UgcHVzaF9jYihmYWxzZSxjYilcblxuICAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHB1Ymxpc2hCYXRjaDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICBPYmplY3Qua2V5cyhvYmopLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHRoaXMudXBkYXRlKHgsb2JqW3hdKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB0aGlzLnRyaWdnZXJCYXRjaChvYmosdGhpcy5zdGF0ZSgpKVxuICAgIH1cbiAgLCBwdXNoOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgdGhpcy5wdWJsaXNoKGZhbHNlLHN0YXRlKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgc3Vic2NyaWJlOiBmdW5jdGlvbigpIHtcblxuICAgICAgLy8gdGhyZWUgb3B0aW9ucyBmb3IgdGhlIGFyZ3VtZW50czpcbiAgICAgIC8vIChmbikgXG4gICAgICAvLyAoaWQsZm4pXG4gICAgICAvLyAoaWQudGFyZ2V0LGZuKVxuXG5cbiAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB0aGlzLl9nbG9iYWxfc3Vic2NyaWJlKGFyZ3VtZW50c1swXSlcbiAgICAgIGlmIChhcmd1bWVudHNbMF0uaW5kZXhPZihcIi5cIikgPT0gLTEpIHJldHVybiB0aGlzLl9uYW1lZF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pXG4gICAgICBpZiAoYXJndW1lbnRzWzBdLmluZGV4T2YoXCIuXCIpID4gLTEpIHJldHVybiB0aGlzLl90YXJnZXR0ZWRfc3Vic2NyaWJlKGFyZ3VtZW50c1swXS5zcGxpdChcIi5cIilbMF0sIGFyZ3VtZW50c1swXS5zcGxpdChcIi5cIilbMV0sIGFyZ3VtZW50c1sxXSlcblxuICAgIH1cbiAgLCB1bnN1YnNjcmliZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgIHRoaXMuc3Vic2NyaWJlKGlkLHVuZGVmaW5lZClcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICwgX2dsb2JhbF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB2YXIgaWQgPSAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgICB2YXIgciA9IE1hdGgucmFuZG9tKCkqMTZ8MCwgdiA9IGMgPT0gJ3gnID8gciA6IChyJjB4M3wweDgpO1xuICAgICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICAgICAgfSlcbiAgICAgICwgdG8gPSBcIipcIjtcbiAgICAgXG4gICAgICB0aGlzLl90YXJnZXR0ZWRfc3Vic2NyaWJlKGlkLHRvLGZuKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBfbmFtZWRfc3Vic2NyaWJlOiBmdW5jdGlvbihpZCxmbikge1xuICAgICAgdmFyIHRvID0gXCIqXCJcbiAgICAgIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoaWQsdG8sZm4pXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIF90YXJnZXR0ZWRfc3Vic2NyaWJlOiBmdW5jdGlvbihpZCx0byxmbikge1xuXG4gICAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX29iaih0bylcbiAgICAgICAgLCB0b19zdGF0ZSA9IHRoaXMuX3N0YXRlW3RvXVxuICAgICAgICAsIHN0YXRlID0gdGhpcy5fc3RhdGU7XG5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiAmJiBmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gc3Vic2NyaXB0aW9uc1tpZF0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlbGV0ZSBzdWJzY3JpcHRpb25zW2lkXVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgfVxuICAgICAgc3Vic2NyaXB0aW9uc1tpZF0gPSBmbjtcblxuICAgICAgcmV0dXJuIHRoaXMgICAgICBcbiAgICB9XG4gIFxuICAsIGdldF9zdWJzY3JpYmVyc19vYmo6IGZ1bmN0aW9uKGspIHtcbiAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbltrXSA9IHRoaXMuX3N1YnNjcmlwdGlvbltrXSB8fCB7fVxuICAgICAgcmV0dXJuIHRoaXMuX3N1YnNjcmlwdGlvbltrXVxuICAgIH1cbiAgLCBnZXRfc3Vic2NyaWJlcnNfZm46IGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBmbnMgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19vYmooaylcbiAgICAgICAgLCBmdW5jcyA9IE9iamVjdC5rZXlzKGZucykubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGZuc1t4XSB9KVxuICAgICAgICAsIGZuID0gZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jcy5tYXAoZnVuY3Rpb24oZykgeyByZXR1cm4gZyhlcnJvcix2YWx1ZSxzdGF0ZSkgfSlcbiAgICAgICAgICB9XG5cbiAgICAgIHJldHVybiBmblxuICAgIH1cbiAgLCB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lLCBfdmFsdWUsIF9zdGF0ZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXIgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihuYW1lKSB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICwgYWxsID0gdGhpcy5nZXRfc3Vic2NyaWJlcnNfZm4oXCIqXCIpIHx8IGZ1bmN0aW9uKCkge307XG5cbiAgICAgIHRoaXMub24oXCJjaGFuZ2VcIikobmFtZSxfdmFsdWUsX3N0YXRlKVxuXG4gICAgICBzdWJzY3JpYmVyKGZhbHNlLF92YWx1ZSxfc3RhdGUpXG4gICAgICBhbGwoZmFsc2UsX3N0YXRlKVxuICAgIH1cbiAgLCB0cmlnZ2VyQmF0Y2g6IGZ1bmN0aW9uKG9iaiwgX3N0YXRlKSB7XG5cbiAgICAgIHZhciBhbGwgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihcIipcIikgfHwgZnVuY3Rpb24oKSB7fVxuICAgICAgICAsIGZucyA9IE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgICAgICB2YXIgZm4gPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbiB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICAgICByZXR1cm4gZm4uYmluZCh0aGlzKShrKShmYWxzZSxvYmpba10sX3N0YXRlKSAgXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgXG4gICAgICBhbGwoZmFsc2UsX3N0YXRlKVxuXG4gICAgfVxuICAsIF9idWlsZFN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jdXJyZW50KVxuXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLl9zdGF0aWMpLm1hcChmdW5jdGlvbihrKSB7IFxuICAgICAgICB0aGlzLl9zdGF0ZVtrXSA9IHRoaXMuX3N0YXRpY1trXVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB0aGlzLm9uKFwiYnVpbGRcIikodGhpcy5fc3RhdGUsIHRoaXMuX2N1cnJlbnQsIHRoaXMuX3N0YXRpYylcblxuICAgICAgcmV0dXJuIHRoaXMuX3N0YXRlXG4gICAgfVxuICAsIHVwZGF0ZTogZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgIHRoaXMuX3Bhc3RQdXNoKHRoaXMuX2N1cnJlbnQpXG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICB2YXIgb2JqID0ge31cbiAgICAgICAgb2JqW25hbWVdID0gdmFsdWU7XG4gICAgICB9XG4gICAgICB0aGlzLl9jdXJyZW50ID0gKG5hbWUpID8gXG4gICAgICAgIE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2N1cnJlbnQsIG9iaikgOlxuICAgICAgICBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9jdXJyZW50LCB2YWx1ZSApXG5cbiAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzZXRTdGF0aWM6IGZ1bmN0aW9uKGssdikge1xuICAgICAgaWYgKGsgIT0gdW5kZWZpbmVkICYmIHYgIT0gdW5kZWZpbmVkKSB0aGlzLl9zdGF0aWNba10gPSB2XG4gICAgICB0aGlzLl9idWlsZFN0YXRlKClcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcHVibGlzaFN0YXRpYzogZnVuY3Rpb24obmFtZSxjYikge1xuXG4gICAgICB2YXIgcHVzaF9jYiA9IGZ1bmN0aW9uKGVycm9yLHZhbHVlKSB7XG4gICAgICAgIGlmIChlcnJvcikgcmV0dXJuIHN1YnNjcmliZXIoZXJyb3IsbnVsbClcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX3N0YXRpY1tuYW1lXSA9IHZhbHVlXG4gICAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuICAgICAgICB0aGlzLnRyaWdnZXIobmFtZSwgdGhpcy5zdGF0ZSgpW25hbWVdLCB0aGlzLnN0YXRlKCkpXG5cbiAgICAgIH0uYmluZCh0aGlzKVxuXG4gICAgICBpZiAodHlwZW9mIGNiID09PSBcImZ1bmN0aW9uXCIpIGNiKHB1c2hfY2IpXG4gICAgICBlbHNlIHB1c2hfY2IoZmFsc2UsY2IpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgX3Bhc3RQdXNoOiBmdW5jdGlvbih2KSB7XG4gICAgICB0aGlzLl9wYXN0LnB1c2godilcbiAgICB9XG4gICwgX2Z1dHVyZVB1c2g6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHRoaXMuX2Z1dHVyZS5wdXNoKHYpXG4gICAgfVxuICAsIGZvcndhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fcGFzdFB1c2godGhpcy5fY3VycmVudClcbiAgICAgIHRoaXMuX2N1cnJlbnQgPSB0aGlzLl9mdXR1cmUucG9wKClcblxuICAgICAgdGhpcy5vbihcImZvcndhcmRcIikodGhpcy5fY3VycmVudCx0aGlzLl9wYXN0LCB0aGlzLl9mdXR1cmUpXG5cbiAgICAgIHRoaXMuX3N0YXRlID0gdGhpcy5fYnVpbGRTdGF0ZSgpXG4gICAgICB0aGlzLnRyaWdnZXIoZmFsc2UsIHRoaXMuX3N0YXRlLCB0aGlzLl9zdGF0ZSlcbiAgICB9XG4gICwgYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9mdXR1cmVQdXNoKHRoaXMuX2N1cnJlbnQpXG4gICAgICB0aGlzLl9jdXJyZW50ID0gdGhpcy5fcGFzdC5wb3AoKVxuXG4gICAgICB0aGlzLm9uKFwiYmFja1wiKSh0aGlzLl9jdXJyZW50LHRoaXMuX2Z1dHVyZSwgdGhpcy5fcGFzdClcblxuICAgICAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcbiAgICAgIHRoaXMudHJpZ2dlcihmYWxzZSwgdGhpcy5fc3RhdGUsIHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgdGhpcy5fbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSBcbiAgLCByZWdpc3RlckV2ZW50OiBmdW5jdGlvbihuYW1lLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2V2ZW50c1tuYW1lXSB8fCB0aGlzLl9ub29wO1xuICAgICAgdGhpcy5fZXZlbnRzW25hbWVdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBwcmVwYXJlRXZlbnQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmbiA9IHRoaXMuX2V2ZW50c1tuYW1lXSBcbiAgICAgIHJldHVybiBmbi5iaW5kKHRoaXMpXG4gICAgfVxuICAsIGRpc3BhdGNoRXZlbnQ6IGZ1bmN0aW9uKG5hbWUsZGF0YSkge1xuICAgICAgdmFyIGZuID0gdGhpcy5wcmVwYXJlRXZlbnQobmFtZSlcbiAgICAgIGZuKGRhdGEpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxufVxuXG5mdW5jdGlvbiBzdGF0ZShfY3VycmVudCwgX3N0YXRpYykge1xuICByZXR1cm4gbmV3IFN0YXRlKF9jdXJyZW50LCBfc3RhdGljKVxufVxuXG5zdGF0ZS5wcm90b3R5cGUgPSBTdGF0ZS5wcm90b3R5cGVcblxuZXhwb3J0IGRlZmF1bHQgc3RhdGU7XG4iLCJleHBvcnQgZnVuY3Rpb24gUVMoc3RhdGUpIHtcbiAgLy90aGlzLnN0YXRlID0gc3RhdGVcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRoaXMuX2VuY29kZU9iamVjdCA9IGZ1bmN0aW9uKG8pIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkobylcbiAgfVxuXG4gIHRoaXMuX2VuY29kZUFycmF5ID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvKVxuICB9XG59XG5cbi8vIExaVy1jb21wcmVzcyBhIHN0cmluZ1xuZnVuY3Rpb24gbHp3X2VuY29kZShzKSB7XG4gICAgdmFyIGRpY3QgPSB7fTtcbiAgICB2YXIgZGF0YSA9IChzICsgXCJcIikuc3BsaXQoXCJcIik7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIHZhciBjdXJyQ2hhcjtcbiAgICB2YXIgcGhyYXNlID0gZGF0YVswXTtcbiAgICB2YXIgY29kZSA9IDI1NjtcbiAgICBmb3IgKHZhciBpPTE7IGk8ZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJyQ2hhcj1kYXRhW2ldO1xuICAgICAgICBpZiAoZGljdFtwaHJhc2UgKyBjdXJyQ2hhcl0gIT0gbnVsbCkge1xuICAgICAgICAgICAgcGhyYXNlICs9IGN1cnJDaGFyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb3V0LnB1c2gocGhyYXNlLmxlbmd0aCA+IDEgPyBkaWN0W3BocmFzZV0gOiBwaHJhc2UuY2hhckNvZGVBdCgwKSk7XG4gICAgICAgICAgICBkaWN0W3BocmFzZSArIGN1cnJDaGFyXSA9IGNvZGU7XG4gICAgICAgICAgICBjb2RlKys7XG4gICAgICAgICAgICBwaHJhc2U9Y3VyckNoYXI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgb3V0LnB1c2gocGhyYXNlLmxlbmd0aCA+IDEgPyBkaWN0W3BocmFzZV0gOiBwaHJhc2UuY2hhckNvZGVBdCgwKSk7XG4gICAgZm9yICh2YXIgaT0wOyBpPG91dC5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXRbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG91dFtpXSk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbihcIlwiKTtcbn1cblxuLy8gRGVjb21wcmVzcyBhbiBMWlctZW5jb2RlZCBzdHJpbmdcbmZ1bmN0aW9uIGx6d19kZWNvZGUocykge1xuICAgIHZhciBkaWN0ID0ge307XG4gICAgdmFyIGRhdGEgPSAocyArIFwiXCIpLnNwbGl0KFwiXCIpO1xuICAgIHZhciBjdXJyQ2hhciA9IGRhdGFbMF07XG4gICAgdmFyIG9sZFBocmFzZSA9IGN1cnJDaGFyO1xuICAgIHZhciBvdXQgPSBbY3VyckNoYXJdO1xuICAgIHZhciBjb2RlID0gMjU2O1xuICAgIHZhciBwaHJhc2U7XG4gICAgZm9yICh2YXIgaT0xOyBpPGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGN1cnJDb2RlID0gZGF0YVtpXS5jaGFyQ29kZUF0KDApO1xuICAgICAgICBpZiAoY3VyckNvZGUgPCAyNTYpIHtcbiAgICAgICAgICAgIHBocmFzZSA9IGRhdGFbaV07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgIHBocmFzZSA9IGRpY3RbY3VyckNvZGVdID8gZGljdFtjdXJyQ29kZV0gOiAob2xkUGhyYXNlICsgY3VyckNoYXIpO1xuICAgICAgICB9XG4gICAgICAgIG91dC5wdXNoKHBocmFzZSk7XG4gICAgICAgIGN1cnJDaGFyID0gcGhyYXNlLmNoYXJBdCgwKTtcbiAgICAgICAgZGljdFtjb2RlXSA9IG9sZFBocmFzZSArIGN1cnJDaGFyO1xuICAgICAgICBjb2RlKys7XG4gICAgICAgIG9sZFBocmFzZSA9IHBocmFzZTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKFwiXCIpO1xufVxuXG5RUy5wcm90b3R5cGUgPSB7XG4gICAgdG86IGZ1bmN0aW9uKHN0YXRlLGVuY29kZSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIHZhciBwYXJhbXMgPSBPYmplY3Qua2V5cyhzdGF0ZSkubWFwKGZ1bmN0aW9uKGspIHtcblxuICAgICAgICB2YXIgdmFsdWUgPSBzdGF0ZVtrXVxuICAgICAgICAgICwgbyA9IHZhbHVlO1xuXG4gICAgICAgIGlmICh2YWx1ZSAmJiAodHlwZW9mKHZhbHVlKSA9PSBcIm9iamVjdFwiKSAmJiAodmFsdWUubGVuZ3RoID4gMCkpIHtcbiAgICAgICAgICBvID0gc2VsZi5fZW5jb2RlQXJyYXkodmFsdWUpXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mKHZhbHVlKSA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgbyA9IHNlbGYuX2VuY29kZU9iamVjdCh2YWx1ZSlcbiAgICAgICAgfSBcblxuICAgICAgICByZXR1cm4gayArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG8pIFxuXG4gICAgICB9KVxuXG4gICAgICBpZiAoZW5jb2RlKSByZXR1cm4gXCI/XCIgKyBcImVuY29kZWQ9XCIgKyBidG9hKGVzY2FwZShsendfZW5jb2RlKHBhcmFtcy5qb2luKFwiJlwiKSkpKTtcbiAgICAgIHJldHVybiBcIj9cIiArIHBhcmFtcy5qb2luKFwiJlwiKVxuICAgICAgXG4gICAgfVxuICAsIGZyb206IGZ1bmN0aW9uKHFzKSB7XG4gICAgICB2YXIgcXVlcnkgPSB7fTtcbiAgICAgIGlmIChxcy5pbmRleE9mKFwiP2VuY29kZWQ9XCIpID09IDApIHFzID0gbHp3X2RlY29kZSh1bmVzY2FwZShhdG9iKHFzLnNwbGl0KFwiP2VuY29kZWQ9XCIpWzFdKSkpXG4gICAgICB2YXIgYSA9IHFzLnN1YnN0cigxKS5zcGxpdCgnJicpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGIgPSBhW2ldLnNwbGl0KCc9Jyk7XG4gICAgICAgICAgXG4gICAgICAgICAgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSA9IChkZWNvZGVVUklDb21wb25lbnQoYlsxXSB8fCAnJykpO1xuICAgICAgICAgIHZhciBfY2hhciA9IHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChiWzBdKV1bMF0gXG4gICAgICAgICAgaWYgKChfY2hhciA9PSBcIntcIikgfHwgKF9jaGFyID09IFwiW1wiKSkgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSA9IEpTT04ucGFyc2UocXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBxdWVyeTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHFzKHN0YXRlKSB7XG4gIHJldHVybiBuZXcgUVMoc3RhdGUpXG59XG5cbnFzLnByb3RvdHlwZSA9IFFTLnByb3RvdHlwZVxuXG5leHBvcnQgZGVmYXVsdCBxcztcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBhcmlzb25fZXZhbChvYmoxLG9iajIsX2ZpbmFsKSB7XG4gIHJldHVybiBuZXcgQ29tcGFyaXNvbkV2YWwob2JqMSxvYmoyLF9maW5hbClcbn1cblxudmFyIG5vb3AgPSAoeCkgPT4ge31cbiAgLCBlcW9wID0gKHgseSkgPT4geCA9PSB5XG4gICwgYWNjID0gKG5hbWUsc2Vjb25kKSA9PiB7XG4gICAgICByZXR1cm4gKHgseSkgPT4gc2Vjb25kID8geVtuYW1lXSA6IHhbbmFtZV0gXG4gICAgfVxuXG5jbGFzcyBDb21wYXJpc29uRXZhbCB7XG4gIGNvbnN0cnVjdG9yKG9iajEsb2JqMixfZmluYWwpIHtcbiAgICB0aGlzLl9vYmoxID0gb2JqMVxuICAgIHRoaXMuX29iajIgPSBvYmoyXG4gICAgdGhpcy5fZmluYWwgPSBfZmluYWxcbiAgICB0aGlzLl9jb21wYXJpc29ucyA9IHt9XG4gIH1cblxuICBhY2Nlc3NvcihuYW1lLGFjYzEsYWNjMikge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jb21wYXJpc29uc1tuYW1lXSx7XG4gICAgICAgIGFjYzE6IGFjYzFcbiAgICAgICwgYWNjMjogYWNjMlxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN1Y2Nlc3MobmFtZSxmbikge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jb21wYXJpc29uc1tuYW1lXSx7XG4gICAgICAgIHN1Y2Nlc3M6IGZuXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZmFpbHVyZShuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgZmFpbHVyZTogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBlcXVhbChuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgZXE6IGZuXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZXZhbHVhdGUoKSB7XG4gICAgT2JqZWN0LmtleXModGhpcy5fY29tcGFyaXNvbnMpLm1hcCggayA9PiB7XG4gICAgICB0aGlzLl9ldmFsKHRoaXMuX2NvbXBhcmlzb25zW2tdLGspXG4gICAgfSlcbiAgICByZXR1cm4gdGhpcy5fZmluYWxcbiAgfVxuICBcblxuICBjb21wYXJzaW9uKG5hbWUsYWNjMSxhY2MyLGVxLHN1Y2Nlc3MsZmFpbHVyZSkge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0ge1xuICAgICAgICBhY2MxOiBhY2MxXG4gICAgICAsIGFjYzI6IGFjYzJcbiAgICAgICwgZXE6IGVxIHx8IGVxb3BcbiAgICAgICwgc3VjY2Vzczogc3VjY2VzcyB8fCBub29wXG4gICAgICAsIGZhaWx1cmU6IGZhaWx1cmUgfHwgbm9vcFxuICAgIH1cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgX2V2YWwoY29tcGFyaXNvbixuYW1lKSB7XG4gICAgdmFyIGFjYzEgPSBjb21wYXJpc29uLmFjYzEgfHwgYWNjKG5hbWUpXG4gICAgICAsIGFjYzIgPSBjb21wYXJpc29uLmFjYzIgfHwgYWNjKG5hbWUsdHJ1ZSlcbiAgICAgICwgdmFsMSA9IGFjYzEodGhpcy5fb2JqMSx0aGlzLl9vYmoyKVxuICAgICAgLCB2YWwyID0gYWNjMih0aGlzLl9vYmoxLHRoaXMuX29iajIpXG4gICAgICAsIGVxID0gY29tcGFyaXNvbi5lcSB8fCBlcW9wXG4gICAgICAsIHN1Y2MgPSBjb21wYXJpc29uLnN1Y2Nlc3MgfHwgbm9vcFxuICAgICAgLCBmYWlsID0gY29tcGFyaXNvbi5mYWlsdXJlIHx8IG5vb3BcblxuICAgIHZhciBfZXZhbGQgPSBlcSh2YWwxLCB2YWwyKVxuXG4gICAgX2V2YWxkID8gXG4gICAgICBzdWNjLmJpbmQodGhpcykodmFsMSx2YWwyLHRoaXMuX2ZpbmFsKSA6IFxuICAgICAgZmFpbC5iaW5kKHRoaXMpKHZhbDEsdmFsMix0aGlzLl9maW5hbClcbiAgfVxuXG4gIFxufVxuIiwiZXhwb3J0IHtkZWZhdWx0IGFzIHN0YXRlfSBmcm9tIFwiLi9zcmMvc3RhdGVcIjtcbmV4cG9ydCB7ZGVmYXVsdCBhcyBxc30gZnJvbSBcIi4vc3JjL3FzXCI7XG5leHBvcnQge2RlZmF1bHQgYXMgY29tcF9ldmFsfSBmcm9tIFwiLi9zcmMvY29tcF9ldmFsXCI7XG5cbmltcG9ydCBzdGF0ZSBmcm9tIFwiLi9zcmMvc3RhdGVcIjtcblxuZGVidWdnZXJcbmV4cG9ydCBjb25zdCBzID0gd2luZG93Ll9fc3RhdGVfXyB8fCBzdGF0ZSgpXG53aW5kb3cuX19zdGF0ZV9fID0gc1xuXG5leHBvcnQgZGVmYXVsdCBzO1xuIiwiLy9pbXBvcnQgZDMgZnJvbSAnZDMnXG5cbi8qIEZST00gT1RIRVIgRklMRSAqL1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERvbWFpbnMoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5kb21haW4gfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImtleVwiOnguZG9tYWluXG4gICAgICAgICwgXCJ2YWx1ZVwiOnguY291bnRcbiAgICAgICAgLCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC51bmlxdWVzIFxuICAgICAgICAsIFwidXJsXCI6IHgudXJsXG4gICAgICB9IFxuICAgIH0pXG5cblxuXG4gIHZhbHVlcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7IFxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeFswXS5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAgLCBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LnZhbHVlID0gTWF0aC5sb2coeC50Zl9pZGYpXG4gIH0pXG4gIHZhbHVlcyA9IHZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy50Zl9pZGYgLSBwLnRmX2lkZiB9KVxuXG5cbiAgdmFyIHRvdGFsID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50KngucGVyY2VudF91bmlxdWV9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICB4LnBvcF9wZXJjZW50ID0gMS4wMi9nZXRJREYoeC5rZXkpKjEwMFxuICAgIHgucG9wX3BlcmNlbnQgPSB4LnBvcF9wZXJjZW50ID09IEluZmluaXR5ID8gMCA6IHgucG9wX3BlcmNlbnRcblxuICAgIHgucGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnBlcmNlbnR9KV0pXG4gICAgLm5pY2UoKVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgucGVyY2VudF9ub3JtID0gbm9ybSh4LnBlcmNlbnQpXG4gICAgLy94LnBlcmNlbnRfbm9ybSA9IHgucGVyY2VudFxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHZhbHVlcztcbiAgLy97XG4gIC8vICAgIGtleTogXCJUb3AgRG9tYWluc1wiXG4gIC8vICAsIHZhbHVlczogdmFsdWVzLnNsaWNlKDAsMTAwKVxuICAvL31cbn1cblxuXG4vKiBFTkQgRlJPTSBPVEhFUiBGSUxFICovXG5cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkM191cGRhdGVhYmxlKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGQzX3NwbGF0KHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYWNjZXNzb3IoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWxcbiAgcmV0dXJuIHRoaXNcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIE1lZGlhUGxhbih0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gIHRoaXMuX29uID0ge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbWVkaWFfcGxhbih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBNZWRpYVBsYW4odGFyZ2V0KVxufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1EYXRhKGRhdGEpIHtcblxuICB2YXIgY2ggPSBkYXRhLmNhdGVnb3J5X2hvdXIuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJOQVwiIH0pXG5cbiAgdmFyIGNhdGVnb3J5X2hvdXIgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgKyBcIixcIiArIHguaG91ciB9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICBwLnVuaXF1ZXMgPSAocC51bmlxdWVzIHx8IDApICsgYy51bmlxdWVzXG4gICAgICAgIHAuY291bnQgPSAocC5jb3VudCB8fCAwKSArIGMuY291bnRcbiAgICAgXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuICAgIH0pXG4gICAgLmVudHJpZXMoY2gpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwiY2F0ZWdvcnlcIjogeC5rZXkuc3BsaXQoXCIsXCIpWzBdXG4gICAgICAgICwgXCJob3VyXCI6IHgua2V5LnNwbGl0KFwiLFwiKVsxXVxuICAgICAgICAsIFwiY291bnRcIjogeC52YWx1ZXMuY291bnRcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC52YWx1ZXMudW5pcXVlc1xuICAgICAgfVxuICAgIH0pXG5cbiAgdmFyIHNjYWxlZCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jYXRlZ29yeSB9IClcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHZhciBtaW4gPSBkMy5taW4odixmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50IH0pXG4gICAgICAgICwgbWF4ID0gZDMubWF4KHYsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jb3VudCB9KVxuXG4gICAgICAgdmFyIHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgIC5kb21haW4oW21pbixtYXhdKVxuICAgICAgICAgLnJhbmdlKFswLDEwMF0pXG4gICAgICAgXG4gICAgICAgdmFyIGhvdXJzID0gZDMucmFuZ2UoMCwyNClcbiAgICAgICBob3VycyA9IGhvdXJzLnNsaWNlKC00LDI0KS5jb25jYXQoaG91cnMuc2xpY2UoMCwyMCkpLy8uc2xpY2UoMykuY29uY2F0KGhvdXJzLnNsaWNlKDAsMykpXG5cbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcIm5vcm1lZFwiOiBob3Vycy5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gdltpXSA/IHNjYWxlKHZbaV0uY291bnQpIDogMCB9KVxuICAgICAgICAgLCBcImNvdW50XCI6IGhvdXJzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiB2W2ldID8gdltpXS5jb3VudCA6IDAgfSlcbiAgICAgICB9XG4gICAgICAgLy9yZXR1cm4gaG91cmx5XG4gICAgfSlcbiAgICAuZW50cmllcyhjYXRlZ29yeV9ob3VyKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyB4LnRvdGFsID0gZDMuc3VtKHgudmFsdWVzKTsgcmV0dXJuIHh9KVxuICAgIC8vLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRvdGFsIC0gcC50b3RhbH0pXG5cbiAgcmV0dXJuIHNjYWxlZFxufVxuXG5NZWRpYVBsYW4ucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgLy9kZWJ1Z2dlclxuICAgICAgaWYgKHRoaXMuZGF0YSgpLmNhdGVnb3J5X2hvdXIgPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1xuXG4gICAgICAgICAgdmFyIF9kID0gdGhpcy5kYXRhKClcbiAgICAgICAgICBfZC5kaXNwbGF5X2NhdGVnb3JpZXMgPSBfZC5kaXNwbGF5X2NhdGVnb3JpZXMgfHwge1widmFsdWVzXCI6W119XG4gICAgICAgICAgdmFyIGRkID0gYnVpbGREb21haW5zKF9kKVxuXG4gICAgICB2YXIgc2NhbGVkID0gdHJhbnNmb3JtRGF0YSh0aGlzLmRhdGEoKSlcblxuICAgICAgXG4gICAgICBzY2FsZWQubWFwKGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICB4LmNvdW50ID0geC52YWx1ZXMuY291bnRcbiAgICAgICAgeC52YWx1ZXM9IHgudmFsdWVzLm5vcm1lZFxuXG4gICAgICB9KVxuXG5cbiAgICAgIHRoaXMucmVuZGVyX2xlZnQoc2NhbGVkKVxuICAgICAgdGhpcy5yZW5kZXJfcmlnaHQoZGQsc2NhbGVkKVxuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHJlbmRlcl9yaWdodDogZnVuY3Rpb24oZCxyb3dfZGF0YSkge1xuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLnJoc1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicmhzIGNvbC1tZC00XCIsdHJ1ZSlcblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsIFwiaDNcIixcImgzXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIkFib3V0IHRoZSBwbGFuXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLmRlc2NcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImRlc2NcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiSGluZHNpZ2h0IGhhcyBhdXRvbWF0aWNhbGx5IGRldGVybWluZWQgdGhlIGJlc3Qgc2l0ZXMgYW5kIHRpbWVzIHdoZXJlIHlvdSBzaG91bGQgYmUgdGFyZ2V0aW5nIHVzZXJzLiBUaGUgbWVkaWEgcGxhbiBwcmVzZW50ZWQgYmVsb3cgZGVzY3JpYmVzIHRoZSBvcHRpbWl6YXRpb25zIHRoYXQgY2FuIGJlIG1hZGUgdG8gYW55IHByb3NwZWN0aW5nIG9yIHJldGFyZ2V0aW5nIGNhbXBhaWduIHRvIGxvd2VyIENQQSBhbmQgc2F2ZSBtb25leS5cIilcblxuICAgICAgdmFyIHBsYW5fdGFyZ2V0ID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLnBsYW4tdGFyZ2V0XCIsXCJkaXZcIixyb3dfZGF0YSxmdW5jdGlvbigpe3JldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJwbGFuLXRhcmdldFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjEwMHB4XCIpXG5cbiAgICAgIHBsYW5fdGFyZ2V0LmV4aXQoKS5yZW1vdmUoKVxuXG5cbiAgICAgIGlmIChyb3dfZGF0YS5sZW5ndGggPiAxKSB7XG4gICAgICAgIHZhciByZW1haW5kZXJzID0gcm93X2RhdGEubWFwKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgXG4gICAgICAgICAgdmFyIHRvX3RhcmdldCA9IGQzLnN1bShyLm1hc2subWFwKGZ1bmN0aW9uKHgsaSl7IHJldHVybiB4ID8gci5jb3VudFtpXSA6IDB9KSlcbiAgICAgICAgICB2YXIgdG90YWwgPSBkMy5zdW0oci5jb3VudClcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0b3RhbDogdG90YWxcbiAgICAgICAgICAgICwgdG9fdGFyZ2V0OiB0b190YXJnZXRcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdmFyIGN1dCA9IGQzLnN1bShyZW1haW5kZXJzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC50b190YXJnZXQqMS4wIH0pXG4gICAgICAgIHZhciB0b3RhbCA9IGQzLnN1bShyZW1haW5kZXJzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC50b3RhbCB9KSBcbiAgICAgICAgdmFyIHBlcmNlbnQgPSBjdXQvdG90YWxcblxuICAgICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsIFwiaDMuc3VtbWFyeVwiLFwiaDNcIixmdW5jdGlvbih4KSB7IHJldHVybiBbeF19ICwgZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgICAgLmNsYXNzZWQoXCJzdW1tYXJ5XCIsdHJ1ZSlcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAgIC50ZXh0KFwiUGxhbiBTdW1tYXJ5XCIpXG5cblxuXG4gICAgICAgIGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIud2hhdFwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gW3hdfSAsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAgIC5jbGFzc2VkKFwid2hhdFwiLHRydWUpXG4gICAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0nZm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoyMDBweDtwYWRkaW5nLWxlZnQ6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPlBvdGVudGlhbCBBZHMgU2VydmVkOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiLFwiKSh0b3RhbClcbiAgICAgICAgICB9KVxuXG4gICAgICAgIGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIuYW1vdW50XCIsXCJkaXZcIixmdW5jdGlvbih4KSB7IHJldHVybiBbeF19ICwgZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgICAgLmNsYXNzZWQoXCJhbW91bnRcIix0cnVlKVxuICAgICAgICAgIC5odG1sKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIjxkaXYgc3R5bGU9J2ZvbnQtd2VpZ2h0OmJvbGQ7d2lkdGg6MjAwcHg7cGFkZGluZy1sZWZ0OjEwcHg7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2Rpc3BsYXk6aW5saW5lLWJsb2NrJz5PcHRpbWl6ZWQgQWQgU2VydmluZzo8L2Rpdj5cIiArIGQzLmZvcm1hdChcIixcIikoY3V0KSArIFwiIChcIiArIGQzLmZvcm1hdChcIiVcIikocGVyY2VudCkgKyBcIilcIlxuICAgICAgICAgIH0pXG5cbiAgICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi5jcGFcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFt4XX0gLCBmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgICAuY2xhc3NlZChcImNwYVwiLHRydWUpXG4gICAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0nZm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoyMDBweDtwYWRkaW5nLWxlZnQ6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPkVzdGltYXRlZCBDUEEgcmVkdWN0aW9uOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiJVwiKSgxLXBlcmNlbnQpXG4gICAgICAgICAgfSlcblxuXG5cblxuXG4gICAgICAgXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB2YXIgcGxhbl90YXJnZXQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIucGxhbi1kZXRhaWxzXCIsXCJkaXZcIixyb3dfZGF0YSlcbiAgICAgICAgLmNsYXNzZWQoXCJwbGFuLWRldGFpbHNcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCIxNjBweFwiKVxuXG5cblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LCBcImgzLmRldGFpbHNcIixcImgzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZGV0YWlsc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIlBsYW4gRGV0YWlsc1wiKVxuXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LFwiLndoYXRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIndoYXRcIix0cnVlKVxuICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0ncGFkZGluZy1sZWZ0OjEwcHg7Zm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoxNDBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPkNhdGVnb3J5OjwvZGl2PlwiICsgeC5rZXlcbiAgICAgICAgfSlcblxuICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi5zYXZpbmdcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNhdmluZ1wiLHRydWUpXG4gICAgICAgIC5odG1sKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkLmNvdW50KVxuICAgICAgICAgIHZhciBwZXJjZW50ID0gZDMuc3VtKHguY291bnQsZnVuY3Rpb24oeixpKSB7IHJldHVybiB4Lm1hc2tbaV0gPyAwIDogen0pL2QzLnN1bSh4LmNvdW50LGZ1bmN0aW9uKHosaSkgeyByZXR1cm4geiB9KVxuICAgICAgICAgIHJldHVybiBcIjxkaXYgc3R5bGU9J3BhZGRpbmctbGVmdDoxMHB4O2ZvbnQtd2VpZ2h0OmJvbGQ7d2lkdGg6MTQwcHg7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2Rpc3BsYXk6aW5saW5lLWJsb2NrJz5TdHJhdGVneSBzYXZpbmdzOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiJVwiKShwZXJjZW50KVxuICAgICAgICB9KVxuXG4gICAgICB2YXIgd2hlbiA9IGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIud2hlblwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKXsgcmV0dXJuIDEgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ3aGVuXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI4MHB4XCIpXG4gICAgICAgIC5odG1sKFwiPGRpdiBzdHlsZT0ncGFkZGluZy1sZWZ0OjEwcHg7d2lkdGg6MTQwcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7dmVydGljYWwtYWxpZ246dG9wJz5XaGVuIHRvIHNlcnZlOjwvZGl2PlwiKVxuICAgICAgICAuZGF0dW0oZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBib29sID0gZmFsc2VcbiAgICAgICAgICB2YXIgcG9zID0gLTFcbiAgICAgICAgICB2YXIgc3RhcnRfZW5kcyA9IHgubWFzay5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IFxuICAgICAgICAgICAgICBwb3MgKz0gMVxuICAgICAgICAgICAgICBpZiAoYm9vbCAhPSBjKSB7XG4gICAgICAgICAgICAgICAgYm9vbCA9IGNcbiAgICAgICAgICAgICAgICBwLnB1c2gocG9zKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgICB9LFtdKVxuICAgICAgICAgIHZhciBzID0gXCJcIlxuICAgICAgICAgIHN0YXJ0X2VuZHMubWFwKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgICAgaWYgKChpICE9IDApICYmICgoaSUyKSA9PSAwKSkgcyArPSBcIiwgXCJcbiAgICAgICAgICAgIGlmIChpJTIpIHMgKz0gXCIgLSBcIlxuXG4gICAgICAgICAgICBpZiAoeCA9PSAwKSBzICs9IFwiMTJhbVwiXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIG51bSA9ICh4KzEpJTEyXG4gICAgICAgICAgICAgIG51bSA9IG51bSA9PSAwID8gMTIgOiBudW1cbiAgICAgICAgICAgICAgcyArPSBudW0gKyAoKHggPiAxMSkgPyBcInBtXCIgOiBcImFtXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgIFxuICAgICAgICAgIH0pXG4gICAgICAgICAgaWYgKChzdGFydF9lbmRzLmxlbmd0aCkgJSAyKSBzICs9IFwiIC0gMTJhbVwiXG5cbiAgICAgICAgICByZXR1cm4gcy5zcGxpdChcIiwgXCIpXG4gICAgICAgIH0pXG5cbiAgICAgICB2YXIgaXRlbXMgPSBkM191cGRhdGVhYmxlKHdoZW4sXCIuaXRlbXNcIixcImRpdlwiKVxuICAgICAgICAgLmNsYXNzZWQoXCJpdGVtc1wiLHRydWUpXG4gICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQwcHhcIilcbiAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICAgZDNfc3BsYXQoaXRlbXMsXCIuaXRlbVwiLFwiZGl2XCIpXG4gICAgICAgICAuY2xhc3NlZChcIml0ZW1cIix0cnVlKVxuICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0MHB4XCIpXG4gICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJub25lXCIpXG4gICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwibm9ybWFsXCIpXG4gICAgICAgICAudGV4dChTdHJpbmcpXG5cblxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCJoMy5leGFtcGxlLXNpdGVzXCIsXCJoM1wiKVxuICAgICAgICAuY2xhc3NlZChcImV4YW1wbGUtc2l0ZXNcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjIwcHhcIilcbiAgICAgICAgLnRleHQoXCJFeGFtcGxlIFNpdGVzXCIpXG5cblxuICAgICAgIHZhciByb3dzID0gZDNfc3BsYXQod3JhcHBlcixcIi5yb3dcIixcImRpdlwiLGQuc2xpY2UoMCwxNSksZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxOHB4XCIpXG4gICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjIwcHhcIilcblxuICAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICByZXR1cm4geC5rZXlcbiAgICAgICAgIH0pXG5cbiAgICAgICByb3dzLmV4aXQoKS5yZW1vdmUoKVxuXG5cbiAgICB9XG4gICwgcmVuZGVyX2xlZnQ6IGZ1bmN0aW9uKHNjYWxlZCkge1xuXG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIubGhzXCIsXCJkaXZcIixzY2FsZWQpXG4gICAgICAgIC5jbGFzc2VkKFwibGhzIGNvbC1tZC04XCIsdHJ1ZSlcblxuICAgICAgd3JhcHBlci5leGl0KCkucmVtb3ZlKClcblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsIFwiaDNcIixcImgzXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIk1lZGlhIFBsYW4gKENhdGVnb3J5IGFuZCBUaW1lIE9wdGltaXphdGlvbilcIilcblxuICAgICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLmhlYWRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImhlYWRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIxcHhcIilcblxuICAgICAgdmFyIG5hbWUgPSBkM191cGRhdGVhYmxlKGhlYWQsXCIubmFtZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNzBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICAgZDNfc3BsYXQoaGVhZCxcIi5ob3VyXCIsXCJkaXZcIixkMy5yYW5nZSgxLDI1KSxmdW5jdGlvbih4KSB7IHJldHVybiB4IH0pXG4gICAgICAgIC5jbGFzc2VkKFwic3EgaG91clwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuODVlbVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGlmICh4ID09IDEpIHJldHVybiBcIjxiPjFhPC9iPlwiXG4gICAgICAgICAgaWYgKHggPT0gMjQpIHJldHVybiBcIjxiPjEyYTwvYj5cIlxuICAgICAgICAgIGlmICh4ID09IDEyKSByZXR1cm4gXCI8Yj4xMnA8L2I+XCJcbiAgICAgICAgICByZXR1cm4geCA+IDExID8geCUxMiA6IHhcbiAgICAgICAgfSlcblxuXG4gICAgICB2YXIgcm93ID0gZDNfc3BsYXQod3JhcHBlcixcIi5yb3dcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMXB4XCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgKyBcIiByb3dcIiB9KVxuICAgICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICB2YXIgX2QgPSBzZWxmLmRhdGEoKVxuICAgICAgICAgIF9kLmRpc3BsYXlfY2F0ZWdvcmllcyA9IF9kLmRpc3BsYXlfY2F0ZWdvcmllcyB8fCB7XCJ2YWx1ZXNcIjpbXX1cbiAgICAgICAgICB2YXIgZGQgPSBidWlsZERvbWFpbnMoX2QpXG5cbiAgICAgICAgICB2YXIgZCA9IGRkLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6LnBhcmVudF9jYXRlZ29yeV9uYW1lID09IHgua2V5fSlcbiAgICAgICAgICBcblxuICAgICAgICAgIHNlbGYucmVuZGVyX3JpZ2h0KGQseClcbiAgICAgICAgfSlcblxuICAgICAgdmFyIE1BR0lDID0gMjUgXG5cbiAgICAgIHZhciBuYW1lID0gZDNfdXBkYXRlYWJsZShyb3csXCIubmFtZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNzBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICB2YXIgY29sb3JzID0gW1wiI2ExZDk5YlwiLCBcIiM3NGM0NzZcIiwgXCIjNDFhYjVkXCIsIFwiIzIzOGI0NVwiLCBcIiMwMDZkMmNcIiwgXCIjMDA0NDFiXCJdXG4gICAgICB2YXIgY29sb3JzID0gW1wiIzIzOGI0NVwiXVxuXG4gICAgICB2YXIgbyA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgICAuZG9tYWluKFstMjUsMTAwXSlcbiAgICAgICAgLnJhbmdlKGNvbG9ycyk7XG5cbiAgICAgIHZhciBzcXVhcmUgPSBkM19zcGxhdChyb3csXCIuc3FcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWVzIH0sIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSB9KSBcbiAgICAgICAgLmNsYXNzZWQoXCJzcVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLGZ1bmN0aW9uKHgsaSkgeyBcbiAgICAgICAgICB2YXIgcGQgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX187IFxuICAgICAgICAgIHBkLm1hc2sgPSBwZC5tYXNrIHx8IFtdXG4gICAgICAgICAgcGQubWFza1tpXSA9ICgoeCA+IE1BR0lDKSAmJiAoIChwZC52YWx1ZXNbaS0xXSA+IE1BR0lDIHx8IGZhbHNlKSB8fCAocGQudmFsdWVzW2krMV0gPiBNQUdJQ3x8IGZhbHNlKSApKVxuICAgICAgICAgIC8vcmV0dXJuIHBkLm1hc2tbaV0gPyBvKHBkLnZhbHVlc1tpXSkgIDogXCJyZXBlYXRpbmctbGluZWFyLWdyYWRpZW50KCA0NWRlZywgI2ZlZTBkMiwgI2ZlZTBkMiAycHgsICNmY2JiYTEgNXB4LCAjZmNiYmExIDJweCkgXCJcbiAgICAgICAgICByZXR1cm4gcGQubWFza1tpXSA/IFxuICAgICAgICAgICAgXCJyZXBlYXRpbmctbGluZWFyLWdyYWRpZW50KCAxMzVkZWcsICMyMzhiNDUsICMyMzhiNDUgMnB4LCAjMDA2ZDJjIDVweCwgIzAwNmQyYyAycHgpIFwiIDogXG4gICAgICAgICAgICBcInJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoIDQ1ZGVnLCAjZmVlMGQyLCAjZmVlMGQyIDJweCwgI2ZjYmJhMSA1cHgsICNmY2JiYTEgMnB4KSBcIlxuXG4gICAgICAgIH0pXG5cblxuICAgIH1cbiAgLCBkYXRhOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fdGFyZ2V0LmRhdHVtKClcbiAgICAgIHRoaXMuX3RhcmdldC5kYXR1bShkKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbixmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbiIsIi8vaW1wb3J0IGQzIGZyb20gJ2QzJ1xuXG5mdW5jdGlvbiBkM191cGRhdGVhYmxlKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiO1xuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZnVuY3Rpb24oeCl7cmV0dXJuIGRhdGEgPyBbZGF0YV0gOiBbeF19LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4gW3hdfVxuICApO1xuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSk7XG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZnVuY3Rpb24gZDNfc3BsYXQodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCI7XG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gICk7XG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKTtcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5cbnZhciB0eXBld2F0Y2ggPSAoZnVuY3Rpb24oKXtcbiAgdmFyIHRpbWVyID0gMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNhbGxiYWNrLCBtcyl7XG4gICAgY2xlYXJUaW1lb3V0ICh0aW1lcik7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGNhbGxiYWNrLCBtcyk7XG4gIH07XG59KSgpO1xuXG5cblxuZnVuY3Rpb24gRmlsdGVyKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMuX2RhdGEgPSBmYWxzZTtcbiAgdGhpcy5fb24gPSB7fTtcbiAgdGhpcy5fcmVuZGVyX29wID0ge307XG59XG5cbmZ1bmN0aW9uIGZpbHRlciQyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEZpbHRlcih0YXJnZXQpXG59XG5cbkZpbHRlci5wcm90b3R5cGUgPSB7XG4gICAgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIuZmlsdGVycy13cmFwcGVyXCIsXCJkaXZcIix0aGlzLmRhdGEoKSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlcnMtd3JhcHBlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLCBcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1yaWdodFwiLCBcIjIwcHhcIik7XG5cbiAgICAgIHZhciBmaWx0ZXJzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmZpbHRlcnNcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlcnNcIix0cnVlKTtcbiAgICAgIFxuICAgICAgdmFyIGZpbHRlciA9IGQzX3NwbGF0KGZpbHRlcnMsXCIuZmlsdGVyXCIsXCJkaXZcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpICsgeC5maWVsZCB9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpO1xuXG4gICAgICBmaWx0ZXIuZXhpdCgpLnJlbW92ZSgpO1xuICAgICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBmaWx0ZXIuZWFjaChmdW5jdGlvbih2LHBvcykge1xuICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgIHNlbGYuZmlsdGVyUm93KGR0aGlzLCBzZWxmLl9maWVsZHMsIHNlbGYuX29wcywgdik7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgdGhpcy5maWx0ZXJGb290ZXIod3JhcCk7XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgICBcbiAgICB9XG4gICwgb3BzOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb3BzXG4gICAgICB0aGlzLl9vcHMgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZmllbGRzOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZmllbGRzXG4gICAgICB0aGlzLl9maWVsZHMgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgXHR9XG4gICwgZGF0YTogZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2RhdGFcbiAgICAgIHRoaXMuX2RhdGEgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgXHR9XG4gICwgdGV4dDogZnVuY3Rpb24oZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZm4gfHwgZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSB9XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcmVuZGVyX29wOiBmdW5jdGlvbihvcCxmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9yZW5kZXJfb3Bbb3BdIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9yZW5kZXJfb3Bbb3BdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgYnVpbGRPcDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICB2YXIgb3AgPSBvYmoub3BcbiAgICAgICAgLCBmaWVsZCA9IG9iai5maWVsZFxuICAgICAgICAsIHZhbHVlID0gb2JqLnZhbHVlO1xuICAgIFxuICAgICAgaWYgKCBbb3AsZmllbGQsdmFsdWVdLmluZGV4T2YodW5kZWZpbmVkKSA+IC0xKSByZXR1cm4gZnVuY3Rpb24oKSB7cmV0dXJuIHRydWV9XG4gICAgXG4gICAgICByZXR1cm4gdGhpcy5fb3BzW29wXShmaWVsZCwgdmFsdWUpXG4gICAgfVxuICAsIGZpbHRlclJvdzogZnVuY3Rpb24oX2ZpbHRlciwgZmllbGRzLCBvcHMsIHZhbHVlKSB7XG4gICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciByZW1vdmUgPSBkM191cGRhdGVhYmxlKF9maWx0ZXIsXCIucmVtb3ZlXCIsXCJhXCIpXG4gICAgICAgIC5jbGFzc2VkKFwicmVtb3ZlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5odG1sKFwiJiMxMDAwNTtcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIG5ld19kYXRhID0gc2VsZi5kYXRhKCkuZmlsdGVyKGZ1bmN0aW9uKGYpIHsgcmV0dXJuIGYgIT09IHggfSk7XG4gICAgICAgICAgc2VsZi5kYXRhKG5ld19kYXRhKTtcbiAgICAgICAgICBzZWxmLmRyYXcoKTtcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcblxuICAgICAgICB9KTtcblxuICAgICAgdmFyIGZpbHRlciA9IGQzX3VwZGF0ZWFibGUoX2ZpbHRlcixcIi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXJcIix0cnVlKTtcblxuICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic2VsZWN0LmZpZWxkXCIsXCJzZWxlY3RcIixmaWVsZHMpXG4gICAgICAgIC5jbGFzc2VkKFwiZmllbGRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTY1cHhcIilcbiAgICAgICAgLm9uKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgIHZhbHVlLmZpZWxkID0gdGhpcy5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX187XG4gICAgICAgICAgXG4gICAgICAgICAgdmFyIHBvcyA9IDA7XG4gICAgICAgICAgZmllbGRzLm1hcChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgIGlmICh4ID09IHZhbHVlLmZpZWxkKSBwb3MgPSBpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdmFyIHNlbGVjdGVkID0gb3BzW3Bvc10uZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5ID09IHZhbHVlLm9wIH0pO1xuICAgICAgICAgIGlmIChzZWxlY3RlZC5sZW5ndGggPT0gMCkgdmFsdWUub3AgPSBvcHNbcG9zXVswXS5rZXk7XG4gICAgICAgICAgLy92YWx1ZS5mbiA9IHNlbGYuYnVpbGRPcCh2YWx1ZSlcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcblxuICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAgIHNlbGYuZHJhd09wcyhmaWx0ZXIsIG9wc1twb3NdLCB2YWx1ZSwgcG9zKTtcbiAgICAgICAgfSk7XG4gICAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIilcbiAgICAgICAgLnByb3BlcnR5KFwiZGlzYWJsZWRcIiAsdHJ1ZSlcbiAgICAgICAgLnByb3BlcnR5KFwiaGlkZGVuXCIsIHRydWUpXG4gICAgICAgIC50ZXh0KFwiRmlsdGVyLi4uXCIpO1xuXG4gICAgICBcbiAgICAgIGQzX3NwbGF0KHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSlcbiAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4ID09IHZhbHVlLmZpZWxkID8gXCJzZWxlY3RlZFwiIDogdW5kZWZpbmVkIH0pO1xuXG4gICAgICBpZiAodmFsdWUub3AgJiYgdmFsdWUuZmllbGQgJiYgdmFsdWUudmFsdWUpIHtcbiAgICAgICAgdmFyIHBvcyA9IGZpZWxkcy5pbmRleE9mKHZhbHVlLmZpZWxkKTtcbiAgICAgICAgc2VsZi5kcmF3T3BzKGZpbHRlciwgb3BzW3Bvc10sIHZhbHVlLCBwb3MpO1xuICAgICAgfVxuXG5cbiAgICB9XG4gICwgZHJhd09wczogZnVuY3Rpb24oZmlsdGVyLCBvcHMsIHZhbHVlKSB7XG5cbiAgICAgIFxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcInNlbGVjdC5vcFwiLFwic2VsZWN0XCIsZmFsc2UsIGZ1bmN0aW9uKHgpIHtyZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwib3BcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5vbihcImNoYW5nZVwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICB2YWx1ZS5vcCA9IHRoaXMuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleTtcbiAgICAgICAgICAvL3ZhbHVlLmZuID0gc2VsZi5idWlsZE9wKHZhbHVlKVxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpO1xuICAgICAgICAgIHNlbGYuZHJhd0lucHV0KGZpbHRlciwgdmFsdWUsIHZhbHVlLm9wKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIC8vdmFyIGRmbHQgPSBbe1wia2V5XCI6XCJTZWxlY3QgT3BlcmF0aW9uLi4uXCIsXCJkaXNhYmxlZFwiOnRydWUsXCJoaWRkZW5cIjp0cnVlfV1cblxuICAgICAgdmFyIG5ld19vcHMgPSBvcHM7IC8vZGZsdC5jb25jYXQob3BzKVxuXG4gICAgICB2YWx1ZS5vcCA9IHZhbHVlLm9wIHx8IG5ld19vcHNbMF0ua2V5O1xuXG4gICAgICB2YXIgb3BzID0gZDNfc3BsYXQoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIixuZXdfb3BzLGZ1bmN0aW9uKHgpe3JldHVybiB4LmtleX0pXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5LnNwbGl0KFwiLlwiKVswXSB9KSBcbiAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSA9PSB2YWx1ZS5vcCA/IFwic2VsZWN0ZWRcIiA6IHVuZGVmaW5lZCB9KTtcblxuICAgICAgb3BzLmV4aXQoKS5yZW1vdmUoKTtcbiAgICAgIHNlbGYuZHJhd0lucHV0KGZpbHRlciwgdmFsdWUsIHZhbHVlLm9wKTtcblxuICAgIH1cbiAgLCBkcmF3SW5wdXQ6IGZ1bmN0aW9uKGZpbHRlciwgdmFsdWUsIG9wKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi52YWx1ZVwiKS5yZW1vdmUoKTtcbiAgICAgIHZhciByID0gdGhpcy5fcmVuZGVyX29wW29wXTtcblxuICAgICAgaWYgKHIpIHtcbiAgICAgICAgcmV0dXJuIHIuYmluZCh0aGlzKShmaWx0ZXIsdmFsdWUpXG4gICAgICB9XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwiaW5wdXQudmFsdWVcIixcImlucHV0XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidmFsdWVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE1MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxZW1cIilcblxuICAgICAgICAuYXR0cihcInZhbHVlXCIsIHZhbHVlLnZhbHVlKVxuICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICB2YXIgdCA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAgIHR5cGV3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdC52YWx1ZTtcbiAgICAgICAgICAgIC8vdmFsdWUuZm4gPSBzZWxmLmJ1aWxkT3AodmFsdWUpXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcbiAgICAgICAgICB9LDEwMDApO1xuICAgICAgICB9KTtcbiAgICBcbiAgICB9XG4gICwgZmlsdGVyRm9vdGVyOiBmdW5jdGlvbih3cmFwKSB7XG4gICAgICB2YXIgZm9vdGVyID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmZpbHRlci1mb290ZXJcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlci1mb290ZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjEwcHhcIik7XG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgXG4gICAgICBkM191cGRhdGVhYmxlKGZvb3RlcixcIi5hZGRcIixcImFcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJhZGRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuaHRtbChcIiYjNjUyOTE7XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjEuNXB4IHNvbGlkICM0MjhCQ0NcIilcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICBcbiAgICAgICAgICB2YXIgZCA9IHNlbGYuX2RhdGE7XG4gICAgICAgICAgaWYgKGQubGVuZ3RoID09IDAgfHwgT2JqZWN0LmtleXMoZC5zbGljZSgtMSkpLmxlbmd0aCA+IDApIGQucHVzaCh7fSk7XG4gICAgICAgICAgc2VsZi5kcmF3KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAsIHR5cGV3YXRjaDogdHlwZXdhdGNoXG59O1xuXG5mdW5jdGlvbiBhY2Nlc3NvciQxKGF0dHIsIHZhbCkge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzW1wiX1wiICsgYXR0cl1cbiAgdGhpc1tcIl9cIiArIGF0dHJdID0gdmFsO1xuICByZXR1cm4gdGhpc1xufVxuXG5mdW5jdGlvbiBGaWx0ZXJEYXRhKGRhdGEpIHtcbiAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gIHRoaXMuX2wgPSBcIm9yXCI7XG59XG5cbmZ1bmN0aW9uIGZpbHRlcl9kYXRhKGRhdGEpIHtcbiAgcmV0dXJuIG5ldyBGaWx0ZXJEYXRhKGRhdGEpXG59XG5cbkZpbHRlckRhdGEucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IkMS5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfVxuICAsIGxvZ2ljOiBmdW5jdGlvbihsKSB7XG4gICAgICBpZiAobCA9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9sXG4gICAgICB0aGlzLl9sID0gKGwgPT0gXCJhbmRcIikgPyBcImFuZFwiIDogXCJvclwiO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb3A6IGZ1bmN0aW9uKG9wLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vcHNbb3BdIHx8IHRoaXMuX29wc1tcImVxdWFsc1wiXTtcbiAgICAgIHRoaXMuX29wc1tvcF0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgYnk6IGZ1bmN0aW9uKGIpIHtcbiAgICAgIFxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICAgICwgZmlsdGVyID0gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgaWYgKGIubGVuZ3RoID09IDApIHJldHVybiB0cnVlXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBtYXNrID0gYi5tYXAoZnVuY3Rpb24oeikge1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgdmFyIHNwbGl0ID0gei5maWVsZC5zcGxpdChcIi5cIiksIGZpZWxkID0gc3BsaXQuc2xpY2UoLTEpWzBdXG4gICAgICAgICAgICAgICAgLCBvYmogPSBzcGxpdC5zbGljZSgwLC0xKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwW2NdIH0seClcbiAgICAgICAgICAgICAgICAsIG9zcGxpdCA9IHoub3Auc3BsaXQoXCIuXCIpLCBvcCA9IG9zcGxpdFswXTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHJldHVybiBzZWxmLm9wKG9wKShmaWVsZCx6LnZhbHVlKShvYmopXG4gICAgICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4IH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2VsZi5fbCA9PSBcImFuZFwiKSByZXR1cm4gbWFzay5sZW5ndGggPT0gYi5sZW5ndGhcbiAgICAgICAgICAgIHJldHVybiBtYXNrLmxlbmd0aCA+IDBcbiAgICAgICAgICB9O1xuICAgICAgXG4gICAgICByZXR1cm4gdGhpcy5fZGF0YS5maWx0ZXIoZmlsdGVyKVxuXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl07XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBfb3BzOiB7XG4gICAgICAgIFwiZXF1YWxzXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKSA9PSBTdHJpbmcodmFsdWUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4vLyAgICAgICwgXCJjb250YWluc1wiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbi8vICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4vLyAgICAgICAgICAgIHJldHVybiBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMVxuLy8gICAgICAgICAgfVxuLy8gICAgICAgIH1cbiAgICAgICwgXCJzdGFydHMgd2l0aFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA9PSAwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiZW5kcyB3aXRoXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gKFN0cmluZyh4W2ZpZWxkXSkubGVuZ3RoIC0gU3RyaW5nKHZhbHVlKS5sZW5ndGgpID09IFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImRvZXMgbm90IGVxdWFsXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKSAhPSBTdHJpbmcodmFsdWUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgc2V0XCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHhbZmllbGRdICE9IHVuZGVmaW5lZCkgJiYgKHhbZmllbGRdICE9IFwiXCIpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgbm90IHNldFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIHhbZmllbGRdID09IHVuZGVmaW5lZFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImJldHdlZW5cIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh4W2ZpZWxkXSkgPj0gdmFsdWVbMF0gJiYgcGFyc2VJbnQoeFtmaWVsZF0pIDw9IHZhbHVlWzFdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMSB9LCAwKSA+IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAsIFwiaXMgbm90IGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPT0gMFxuICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICAgICwgXCJkb2VzIG5vdCBjb250YWluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKS50b0xvd2VyQ2FzZSgpKSA+IC0xIH0sIDApID09IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAsIFwiY29udGFpbnNcIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnRvTG93ZXJDYXNlKCkuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpLnRvTG93ZXJDYXNlKCkpID4gLTEgfSwgMCkgPiAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciB2ZXJzaW9uID0gXCIwLjAuMVwiO1xuXG5leHBvcnQgeyB2ZXJzaW9uLCBmaWx0ZXIkMiBhcyBmaWx0ZXIsIGZpbHRlcl9kYXRhIH07XG4iLCJleHBvcnQgZnVuY3Rpb24gcHJlcERhdGEoZGQpIHtcbiAgdmFyIHAgPSBbXVxuICBkMy5yYW5nZSgwLDI0KS5tYXAoZnVuY3Rpb24odCkge1xuICAgIFtcIjBcIixcIjIwXCIsXCI0MFwiXS5tYXAoZnVuY3Rpb24obSkge1xuICAgICAgaWYgKHQgPCAxMCkgcC5wdXNoKFwiMFwiICsgU3RyaW5nKHQpK1N0cmluZyhtKSlcbiAgICAgIGVsc2UgcC5wdXNoKFN0cmluZyh0KStTdHJpbmcobSkpXG5cbiAgICB9KVxuICB9KVxuICB2YXIgcm9sbGVkID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbihrKSB7IHJldHVybiBrLmhvdXIgKyBrLm1pbnV0ZSB9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICBwLmFydGljbGVzW2MudXJsXSA9IHRydWVcbiAgICAgICAgcC52aWV3cyArPSBjLmNvdW50XG4gICAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHsgYXJ0aWNsZXM6IHt9LCB2aWV3czogMCwgc2Vzc2lvbnM6IDB9KVxuICAgIH0pXG4gICAgLmVudHJpZXMoZGQpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICBPYmplY3Qua2V5cyh4LnZhbHVlcykubWFwKGZ1bmN0aW9uKHkpIHtcbiAgICAgICAgeFt5XSA9IHgudmFsdWVzW3ldXG4gICAgICB9KVxuICAgICAgeC5hcnRpY2xlX2NvdW50ID0gT2JqZWN0LmtleXMoeC5hcnRpY2xlcykubGVuZ3RoXG4gICAgICB4LmhvdXIgPSB4LmtleS5zbGljZSgwLDIpXG4gICAgICB4Lm1pbnV0ZSA9IHgua2V5LnNsaWNlKDIpXG4gICAgICB4LnZhbHVlID0geC5hcnRpY2xlX2NvdW50XG4gICAgICB4LmtleSA9IHAuaW5kZXhPZih4LmtleSlcbiAgICAgIC8vZGVsZXRlIHhbJ2FydGljbGVzJ11cbiAgICAgIHJldHVybiB4XG4gICAgfSlcbiAgcmV0dXJuIHJvbGxlZFxufVxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU3VtbWFyeSh1cmxzLGNvbXBhcmlzb24pIHtcbiAgdmFyIHN1bW1hcnlfZGF0YSA9IGJ1aWxkU3VtbWFyeURhdGEodXJscylcbiAgICAsIHBvcF9zdW1tYXJ5X2RhdGEgPSBidWlsZFN1bW1hcnlEYXRhKGNvbXBhcmlzb24pXG5cbiAgcmV0dXJuIGJ1aWxkU3VtbWFyeUFnZ3JlZ2F0aW9uKHN1bW1hcnlfZGF0YSxwb3Bfc3VtbWFyeV9kYXRhKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5RGF0YShkYXRhKSB7XG4gIHZhciByZWR1Y2VkID0gZGF0YS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICBwLmRvbWFpbnNbYy5kb21haW5dID0gdHJ1ZVxuICAgICAgcC5hcnRpY2xlc1tjLnVybF0gPSB0cnVlXG4gICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG5cbiAgICAgIHJldHVybiBwXG4gICAgfSx7XG4gICAgICAgIGRvbWFpbnM6IHt9XG4gICAgICAsIGFydGljbGVzOiB7fVxuICAgICAgLCBzZXNzaW9uczogMFxuICAgICAgLCB2aWV3czogMFxuICAgIH0pXG5cbiAgcmVkdWNlZC5kb21haW5zID0gT2JqZWN0LmtleXMocmVkdWNlZC5kb21haW5zKS5sZW5ndGhcbiAgcmVkdWNlZC5hcnRpY2xlcyA9IE9iamVjdC5rZXlzKHJlZHVjZWQuYXJ0aWNsZXMpLmxlbmd0aFxuXG4gIHJldHVybiByZWR1Y2VkXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN1bW1hcnlBZ2dyZWdhdGlvbihzYW1wLHBvcCkge1xuICAgICAgdmFyIGRhdGFfc3VtbWFyeSA9IHt9XG4gICAgICBPYmplY3Qua2V5cyhzYW1wKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgICBkYXRhX3N1bW1hcnlba10gPSB7XG4gICAgICAgICAgICBzYW1wbGU6IHNhbXBba11cbiAgICAgICAgICAsIHBvcHVsYXRpb246IHBvcFtrXVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gZGF0YV9zdW1tYXJ5XG4gIFxufVxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2F0ZWdvcmllc09sZChkYXRhKSB7XG4gIHZhciB2YWx1ZXMgPSBkYXRhLmNhdGVnb3J5XG4gICAgICAgIC5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB7XCJrZXlcIjogeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSwgXCJ2YWx1ZVwiOiB4LmNvdW50IH0gfSlcbiAgICAgICAgLnNvcnQoZnVuY3Rpb24ocCxjKSB7cmV0dXJuIGMudmFsdWUgLSBwLnZhbHVlIH0pLnNsaWNlKDAsMTUpXG4gICAgLCB0b3RhbCA9IHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCwgeCkge3JldHVybiBwICsgeC52YWx1ZSB9LCAwKVxuXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiQ2F0ZWdvcmllc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyB4LnBlcmNlbnQgPSB4LnZhbHVlL3RvdGFsOyByZXR1cm4geH0pXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVGltZXMoZGF0YSkge1xuXG4gIHZhciBob3VyID0gZGF0YS5jdXJyZW50X2hvdXJcblxuICB2YXIgY2F0ZWdvcmllcyA9IGRhdGEuZGlzcGxheV9jYXRlZ29yaWVzLnZhbHVlc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKSB7XG4gICAgaG91ciA9IGRhdGEuY2F0ZWdvcnlfaG91ci5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMX0pXG4gICAgaG91ciA9IGQzLm5lc3QoKVxuICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LmhvdXIgfSlcbiAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5taW51dGUgfSlcbiAgICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IFxuICAgICAgICAgIHAudW5pcXVlcyA9IChwLnVuaXF1ZXMgfHwgMCkgKyBjLnVuaXF1ZXM7IFxuICAgICAgICAgIHAuY291bnQgPSAocC5jb3VudCB8fCAwKSArIGMuY291bnQ7ICBcbiAgICAgICAgICByZXR1cm4gcCB9LHt9KVxuICAgICAgfSlcbiAgICAgIC5lbnRyaWVzKGhvdXIpXG4gICAgICAubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIGNvbnNvbGUubG9nKHgudmFsdWVzKTsgXG4gICAgICAgIHJldHVybiB4LnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxrKXsgXG4gICAgICAgICAgcFsnbWludXRlJ10gPSBwYXJzZUludChrLmtleSk7IFxuICAgICAgICAgIHBbJ2NvdW50J10gPSBrLnZhbHVlcy5jb3VudDsgXG4gICAgICAgICAgcFsndW5pcXVlcyddID0gay52YWx1ZXMudW5pcXVlczsgXG4gICAgICAgICAgcmV0dXJuIHAgXG4gICAgICB9LCB7XCJob3VyXCI6eC5rZXl9KSB9IClcbiAgfVxuXG4gIHZhciB2YWx1ZXMgPSBob3VyXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB7XCJrZXlcIjogcGFyc2VGbG9hdCh4LmhvdXIpICsgMSArIHgubWludXRlLzYwLCBcInZhbHVlXCI6IHguY291bnQgfSB9KVxuXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiQnJvd3NpbmcgYmVoYXZpb3IgYnkgdGltZVwiXG4gICAgLCB2YWx1ZXM6IHZhbHVlc1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFRvcGljcyhkYXRhKSB7XG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkYXRhLmRpc3BsYXlfY2F0ZWdvcmllcy52YWx1ZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cblxuICB2YXIgaWRmID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7cmV0dXJuIHgudG9waWN9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkge3JldHVybiB4WzBdLmlkZiB9KVxuICAgIC5tYXAoZGF0YS5mdWxsX3VybHMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIkludGVybmV0ICYgVGVsZWNvbVwifSkgKVxuXG4gIHZhciBnZXRJREYgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIChpZGZbeF0gPT0gXCJOQVwiKSB8fCAoaWRmW3hdID4gODY4NikgPyAwIDogaWRmW3hdXG4gIH1cblxuICB2YXIgdmFsdWVzID0gZGF0YS5mdWxsX3VybHNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG9waWMgPyB4LnRvcGljLnRvTG93ZXJDYXNlKCkgIT0gXCJubyB0b3BpY1wiIDogdHJ1ZSB9KVxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJrZXlcIjp4LnRvcGljXG4gICAgICAgICwgXCJ2YWx1ZVwiOnguY291bnRcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC51bmlxdWVzIFxuICAgICAgICAsIFwidXJsXCI6IHgudXJsXG4gICAgICB9IFxuICAgIH0pXG5cblxuXG4gIHZhbHVlcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7IFxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwia2V5XCI6IHhbMF0ua2V5XG4gICAgICAgICAsIFwidmFsdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy52YWx1ZX0sMClcbiAgICAgICAgICwgXCJwZXJjZW50X3VuaXF1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnVuaXF1ZXMvYy52YWx1ZX0sMCkveC5sZW5ndGhcbiAgICAgICAgICwgXCJ1cmxzXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwLmluZGV4T2YoYy51cmwpID09IC0xID8gcC5wdXNoKGMudXJsKSA6IHA7IHJldHVybiBwIH0sW10pXG5cbiAgICAgICB9IFxuICAgIH0pXG4gICAgLmVudHJpZXModmFsdWVzKS5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB4LnZhbHVlcyB9KVxuXG4gIGlmIChjYXRlZ29yaWVzLmxlbmd0aCA+IDApXG4gICAgdmFsdWVzID0gdmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KSB7cmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZih4LnBhcmVudF9jYXRlZ29yeV9uYW1lKSA+IC0xIH0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC50Zl9pZGYgPSBnZXRJREYoeC5rZXkpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSBcbiAgICB4LmNvdW50ID0geC52YWx1ZVxuICAgIHguaW1wb3J0YW5jZSA9IE1hdGgubG9nKHgudGZfaWRmKVxuICB9KVxuICB2YWx1ZXMgPSB2YWx1ZXMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudGZfaWRmIC0gcC50Zl9pZGYgfSlcblxuXG4gIHZhciB0b3RhbCA9IGQzLnN1bSh2YWx1ZXMsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jb3VudCp4LnBlcmNlbnRfdW5pcXVlfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgeC5wb3BfcGVyY2VudCA9IDEuMDIvZ2V0SURGKHgua2V5KSoxMDBcbiAgICB4LnBvcF9wZXJjZW50ID0geC5wb3BfcGVyY2VudCA9PSBJbmZpbml0eSA/IDAgOiB4LnBvcF9wZXJjZW50XG5cbiAgICB4LnNhbXBsZV9wZXJjZW50ID0geC5jb3VudCp4LnBlcmNlbnRfdW5pcXVlL3RvdGFsKjEwMFxuICB9KVxuXG4gIHZhciBub3JtID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAucmFuZ2UoWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnBvcF9wZXJjZW50fSldKVxuICAgIC5kb21haW4oWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHguc2FtcGxlX3BlcmNlbnR9KV0pXG4gICAgLm5pY2UoKVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHguc2FtcGxlX3BlcmNlbnRfbm9ybSA9IG5vcm0oeC5zYW1wbGVfcGVyY2VudClcblxuICAgIHgucmF0aW8gPSB4LnNhbXBsZV9wZXJjZW50L3gucG9wX3BlcmNlbnRcbiAgICAvL3gucGVyY2VudF9ub3JtID0geC5wZXJjZW50XG4gIH0pXG5cblxuXG4gIFxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIlRvcCBUb3BpY3NcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCwzMDApXG4gIH1cbn1cblxuXG5cblxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRPbnNpdGVTdW1tYXJ5KGRhdGEpIHtcbiAgdmFyIHllc3RlcmRheSA9IGRhdGEudGltZXNlcmllc19kYXRhWzBdXG4gIHZhciB2YWx1ZXMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwia2V5XCI6IFwiUGFnZSBWaWV3c1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IHllc3RlcmRheS52aWV3c1xuICAgICAgICB9XG4gICAgICAsIHtcbiAgICAgICAgICAgIFwia2V5XCI6IFwiVW5pcXVlIFZpc2l0b3JzXCJcbiAgICAgICAgICAsIFwidmFsdWVcIjogeWVzdGVyZGF5LnVuaXF1ZXNcblxuICAgICAgICB9XG4gICAgXVxuICByZXR1cm4ge1wia2V5XCI6XCJPbi1zaXRlIEFjdGl2aXR5XCIsXCJ2YWx1ZXNcIjp2YWx1ZXN9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZE9mZnNpdGVTdW1tYXJ5KGRhdGEpIHtcbiAgdmFyIHZhbHVlcyA9IFsgIFxuICAgICAgICB7XG4gICAgICAgICAgICBcImtleVwiOiBcIk9mZi1zaXRlIFZpZXdzXCJcbiAgICAgICAgICAsIFwidmFsdWVcIjogZGF0YS5mdWxsX3VybHMucmVkdWNlKGZ1bmN0aW9uKHAsYykge3JldHVybiBwICsgYy51bmlxdWVzfSwwKVxuICAgICAgICB9XG4gICAgICAsIHtcbiAgICAgICAgICAgIFwia2V5XCI6IFwiVW5pcXVlIHBhZ2VzXCJcbiAgICAgICAgICAsIFwidmFsdWVcIjogT2JqZWN0LmtleXMoZGF0YS5mdWxsX3VybHMucmVkdWNlKGZ1bmN0aW9uKHAsYykge3BbYy51cmxdID0gMDsgcmV0dXJuIHAgfSx7fSkpLmxlbmd0aFxuICAgICAgICB9XG4gICAgXVxuICByZXR1cm4ge1wia2V5XCI6XCJPZmYtc2l0ZSBBY3Rpdml0eVwiLFwidmFsdWVzXCI6dmFsdWVzfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBY3Rpb25zKGRhdGEpIHtcbiAgXG4gIHJldHVybiB7XCJrZXlcIjpcIlNlZ21lbnRzXCIsXCJ2YWx1ZXNcIjogZGF0YS5hY3Rpb25zLm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHtcImtleVwiOnguYWN0aW9uX25hbWUsIFwidmFsdWVcIjowLCBcInNlbGVjdGVkXCI6IGRhdGEuYWN0aW9uX25hbWUgPT0geC5hY3Rpb25fbmFtZSB9IH0pfVxufVxuXG5cbi8vIGZyb20gZGF0YS5qc1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRGF0YShkYXRhLGJ1Y2tldHMscG9wX2NhdGVnb3JpZXMpIHtcblxuICB2YXIgdGltZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgIC5tYXAoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuXG4gIHZhciBjYXRzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLm1hcChkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJcIiB9KSApXG5cblxuXG5cbiAgdmFyIHRpbWVfY2F0ZWdvcmllcyA9IGJ1Y2tldHMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2NdID0ge307IHJldHVybiBwIH0sIHt9KVxuICB2YXIgY2F0ZWdvcnlfdGltZXMgPSBPYmplY3Qua2V5cyhjYXRzKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbY10gPSB7fTsgcmV0dXJuIHAgfSwge30pXG5cblxuICB2YXIgY2F0ZWdvcmllcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgLmVudHJpZXMoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7XG4gICAgICByb3cudmFsdWVzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICAgIHQucGVyY2VudCA9IGQzLnN1bSh0LnZhbHVlcyxmdW5jdGlvbihkKXsgcmV0dXJuIGQudW5pcXVlc30pLyBkMy5zdW0odGltZXNbdC5rZXldLGZ1bmN0aW9uKGQpIHtyZXR1cm4gZC51bmlxdWVzfSkgXG4gICAgICAgIHRpbWVfY2F0ZWdvcmllc1t0LmtleV1bcm93LmtleV0gPSB0LnBlcmNlbnRcbiAgICAgICAgY2F0ZWdvcnlfdGltZXNbcm93LmtleV1bdC5rZXldID0gdC5wZXJjZW50XG5cbiAgICAgIH0pXG4gICAgICByZXR1cm4gcm93XG4gICAgfSlcbiAgICAuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuICgocG9wX2NhdGVnb3JpZXNbYi5rZXldIHx8IHt9KS5ub3JtYWxpemVkX3BvcCB8fCAwKS0gKChwb3BfY2F0ZWdvcmllc1thLmtleV0gfHwge30pLm5vcm1hbGl6ZWRfcG9wIHx8IDApIH0pXG5cblxuICB2YXIgdGltZV9ub3JtYWxpemVfc2NhbGVzID0ge31cblxuICBkMy5lbnRyaWVzKHRpbWVfY2F0ZWdvcmllcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIHRpbWVfbm9ybWFsaXplX3NjYWxlc1t0cm93LmtleV0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbZDMubWluKHZhbHVlcyksZDMubWF4KHZhbHVlcyldKVxuICAgICAgLnJhbmdlKFswLDFdKVxuICB9KVxuXG4gIHZhciBjYXRfbm9ybWFsaXplX3NjYWxlcyA9IHt9XG5cbiAgZDMuZW50cmllcyhjYXRlZ29yeV90aW1lcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIGNhdF9ub3JtYWxpemVfc2NhbGVzW3Ryb3cua2V5XSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFtkMy5taW4odmFsdWVzKSxkMy5tYXgodmFsdWVzKV0pXG4gICAgICAucmFuZ2UoWzAsMV0pXG4gIH0pXG5cbiAgY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24ocCkge1xuICAgIHZhciBjYXQgPSBwLmtleVxuICAgIHAudmFsdWVzLm1hcChmdW5jdGlvbihxKSB7XG4gICAgICBxLm5vcm1fY2F0ID0gY2F0X25vcm1hbGl6ZV9zY2FsZXNbY2F0XShxLnBlcmNlbnQpXG4gICAgICBxLm5vcm1fdGltZSA9IHRpbWVfbm9ybWFsaXplX3NjYWxlc1txLmtleV0ocS5wZXJjZW50KVxuXG4gICAgICBxLnNjb3JlID0gMipxLm5vcm1fY2F0LzMgKyBxLm5vcm1fdGltZS8zXG4gICAgICBxLnNjb3JlID0gcS5ub3JtX3RpbWVcblxuICAgICAgdmFyIHBlcmNlbnRfcG9wID0gcG9wX2NhdGVnb3JpZXNbY2F0XSA/IHBvcF9jYXRlZ29yaWVzW2NhdF0ucGVyY2VudF9wb3AgOiAwXG5cbiAgICAgIHEucGVyY2VudF9kaWZmID0gKHEucGVyY2VudCAtIHBlcmNlbnRfcG9wKS9wZXJjZW50X3BvcFxuXG4gICAgfSlcbiAgfSlcblxuICByZXR1cm4gY2F0ZWdvcmllc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJlcGFyZUZpbHRlcnMoZmlsdGVycykge1xuICB2YXIgbWFwcGluZyA9IHtcbiAgICAgIFwiQ2F0ZWdvcnlcIjogXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiXG4gICAgLCBcIlRpdGxlXCI6IFwidXJsXCJcbiAgICAsIFwiVGltZVwiOiBcImhvdXJcIlxuICB9XG5cbiAgdmFyIGZpbHRlcnMgPSBmaWx0ZXJzLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiBPYmplY3Qua2V5cyh4KS5sZW5ndGggJiYgeC52YWx1ZSB9KS5tYXAoZnVuY3Rpb24oeikge1xuICAgIHJldHVybiB7IFxuICAgICAgICBcImZpZWxkXCI6IG1hcHBpbmdbei5maWVsZF1cbiAgICAgICwgXCJvcFwiOiB6Lm9wXG4gICAgICAsIFwidmFsdWVcIjogei52YWx1ZVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gZmlsdGVyc1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGF1dG9TaXplKHdyYXAsYWRqdXN0V2lkdGgsYWRqdXN0SGVpZ2h0KSB7XG5cbiAgZnVuY3Rpb24gZWxlbWVudFRvV2lkdGgoZWxlbSkge1xuXG4gICAgdmFyIF93ID0gd3JhcC5ub2RlKCkub2Zmc2V0V2lkdGggfHwgd3JhcC5ub2RlKCkucGFyZW50Tm9kZS5vZmZzZXRXaWR0aCB8fCB3cmFwLm5vZGUoKS5wYXJlbnROb2RlLnBhcmVudE5vZGUub2Zmc2V0V2lkdGhcbiAgICB2YXIgbnVtID0gX3cgfHwgd3JhcC5zdHlsZShcIndpZHRoXCIpLnNwbGl0KFwiLlwiKVswXS5yZXBsYWNlKFwicHhcIixcIlwiKSBcbiAgICByZXR1cm4gcGFyc2VJbnQobnVtKVxuICB9XG5cbiAgZnVuY3Rpb24gZWxlbWVudFRvSGVpZ2h0KGVsZW0pIHtcbiAgICB2YXIgbnVtID0gd3JhcC5zdHlsZShcImhlaWdodFwiKS5zcGxpdChcIi5cIilbMF0ucmVwbGFjZShcInB4XCIsXCJcIilcbiAgICByZXR1cm4gcGFyc2VJbnQobnVtKVxuICB9XG5cbiAgdmFyIHcgPSBlbGVtZW50VG9XaWR0aCh3cmFwKSB8fCA3MDAsXG4gICAgaCA9IGVsZW1lbnRUb0hlaWdodCh3cmFwKSB8fCAzNDA7XG5cbiAgdyA9IGFkanVzdFdpZHRoKHcpXG4gIGggPSBhZGp1c3RIZWlnaHQoaClcblxuXG4gIHZhciBtYXJnaW4gPSB7dG9wOiAxMCwgcmlnaHQ6IDE1LCBib3R0b206IDEwLCBsZWZ0OiAxNX0sXG4gICAgICB3aWR0aCAgPSB3IC0gbWFyZ2luLmxlZnQgLSBtYXJnaW4ucmlnaHQsXG4gICAgICBoZWlnaHQgPSBoIC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b207XG5cbiAgcmV0dXJuIHtcbiAgICBtYXJnaW46IG1hcmdpbixcbiAgICB3aWR0aDogd2lkdGgsXG4gICAgaGVpZ2h0OiBoZWlnaHRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXV0b1NjYWxlcyhfc2l6ZXMsIGxlbikge1xuXG4gIHZhciBtYXJnaW4gPSBfc2l6ZXMubWFyZ2luLFxuICAgIHdpZHRoID0gX3NpemVzLndpZHRoLFxuICAgIGhlaWdodCA9IF9zaXplcy5oZWlnaHQ7XG5cbiAgaGVpZ2h0ID0gbGVuICogMjZcbiAgXG4gIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5yYW5nZShbd2lkdGgvMiwgd2lkdGgtMjBdKTtcbiAgXG4gIHZhciB5ID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAucmFuZ2VSb3VuZEJhbmRzKFswLCBoZWlnaHRdLCAuMik7XG5cbiAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHgpXG4gICAgICAub3JpZW50KFwidG9wXCIpO1xuXG5cbiAgcmV0dXJuIHtcbiAgICAgIHg6IHhcbiAgICAsIHk6IHlcbiAgICAsIHhBeGlzOiB4QXhpc1xuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBzdGF0ZSBmcm9tICdzdGF0ZSdcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmUocXNfc3RhdGUsX3N0YXRlKSB7XG5cbiAgdmFyIHVwZGF0ZXMgPSB7fVxuXG5cbiAgc3RhdGUuY29tcF9ldmFsKHFzX3N0YXRlLF9zdGF0ZSx1cGRhdGVzKVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzZWxlY3RlZF9hY3Rpb25cIlxuICAgICAgLCAoeCx5KSA9PiB5LmFjdGlvbnMuZmlsdGVyKHogPT4gei5hY3Rpb25faWQgPT0geC5zZWxlY3RlZF9hY3Rpb24pWzBdXG4gICAgICAsICh4LHkpID0+IHkuc2VsZWN0ZWRfYWN0aW9uXG4gICAgKVxuICAgIC5mYWlsdXJlKFwic2VsZWN0ZWRfYWN0aW9uXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmose1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJzZWxlY3RlZF9hY3Rpb25cIjogX25ld1xuICAgICAgfSlcbiAgICB9KVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJ0YWJfcG9zaXRpb25cIlxuICAgICAgLCAoeCx5KSA9PiB4LnRhYl9wb3NpdGlvblxuICAgICAgLCAoXyx5KSA9PiB5LnRhYl9wb3NpdGlvblxuICAgIClcbiAgICAuZmFpbHVyZShcInRhYl9wb3NpdGlvblwiLCAoX25ldyxfb2xkLG9iaikgPT4ge1xuICAgICAgT2JqZWN0LmFzc2lnbihvYmosIHsgXCJ0YWJfcG9zaXRpb25cIjogX25ldyB9KVxuICAgIH0pXG5cbiAgICAuYWNjZXNzb3IoXG4gICAgICAgIFwic29ydFwiXG4gICAgICAsICh4LHkpID0+IHguc29ydFxuICAgICAgLCAoXyx5KSA9PiB5LnNvcnRcbiAgICApXG4gICAgLmZhaWx1cmUoXCJzb3J0XCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7XG4gICAgICBPYmplY3QuYXNzaWduKG9iaiwgeyBcInNvcnRcIjogX25ldyB9KVxuICAgIH0pXG5cblxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJhc2NlbmRpbmdcIlxuICAgICAgLCAoeCx5KSA9PiB4LmFzY2VuZGluZ1xuICAgICAgLCAoXyx5KSA9PiB5LmFzY2VuZGluZ1xuICAgIClcbiAgICAuZmFpbHVyZShcImFzY2VuZGluZ1wiLCAoX25ldyxfb2xkLG9iaikgPT4ge1xuICAgICAgT2JqZWN0LmFzc2lnbihvYmosIHsgXCJhc2NlbmRpbmdcIjogX25ldyB9KVxuICAgIH0pXG5cblxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzZWxlY3RlZF92aWV3XCJcbiAgICAgICwgKHgseSkgPT4geC5zZWxlY3RlZF92aWV3XG4gICAgICAsIChfLHkpID0+IHkuZGFzaGJvYXJkX29wdGlvbnMuZmlsdGVyKHggPT4geC5zZWxlY3RlZClbMF0udmFsdWUgXG4gICAgKVxuICAgIC5mYWlsdXJlKFwic2VsZWN0ZWRfdmlld1wiLCAoX25ldyxfb2xkLG9iaikgPT4ge1xuICAgICAgLy8gdGhpcyBzaG91bGQgYmUgcmVkb25lIHNvIGl0cyBub3QgZGlmZmVyZW50IGxpa2UgdGhpc1xuICAgICAgT2JqZWN0LmFzc2lnbihvYmosIHtcbiAgICAgICAgICBcImxvYWRpbmdcIjogdHJ1ZVxuICAgICAgICAsIFwiZGFzaGJvYXJkX29wdGlvbnNcIjogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMpKS5tYXAoeCA9PiB7IFxuICAgICAgICAgICAgeC5zZWxlY3RlZCA9ICh4LnZhbHVlID09IF9uZXcpOyBcbiAgICAgICAgICAgIHJldHVybiB4IFxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInNlbGVjdGVkX2NvbXBhcmlzb25cIlxuICAgICAgLCAoeCx5KSA9PiB5LmFjdGlvbnMuZmlsdGVyKHogPT4gei5hY3Rpb25faWQgPT0geC5zZWxlY3RlZF9jb21wYXJpc29uKVswXVxuICAgICAgLCAoeCx5KSA9PiB5LnNlbGVjdGVkX2NvbXBhcmlzb25cbiAgICApXG4gICAgLmZhaWx1cmUoXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmose1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJzZWxlY3RlZF9jb21wYXJpc29uXCI6IF9uZXdcbiAgICAgIH0pXG4gICAgfSlcbiAgICAuZXF1YWwoXCJmaWx0ZXJzXCIsICh4LHkpID0+IEpTT04uc3RyaW5naWZ5KHgpID09IEpTT04uc3RyaW5naWZ5KHkpIClcbiAgICAuZmFpbHVyZShcImZpbHRlcnNcIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcImZpbHRlcnNcIjogX25ldyB8fCBbe31dXG4gICAgICB9KVxuICAgIH0pXG4gICAgLmZhaWx1cmUoXCJhY3Rpb25fZGF0ZVwiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHsgbG9hZGluZzogdHJ1ZSwgXCJhY3Rpb25fZGF0ZVwiOiBfbmV3IH0pXG4gICAgfSlcbiAgICAuZmFpbHVyZShcImNvbXBhcmlzb25fZGF0ZVwiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHsgbG9hZGluZzogdHJ1ZSwgXCJjb21wYXJpc29uX2RhdGVcIjogX25ldyB9KVxuICAgIH0pXG5cbiAgICAuZXZhbHVhdGUoKVxuXG4gIHZhciBjdXJyZW50ID0gc3RhdGUucXMoe30pLnRvKF9zdGF0ZS5xc19zdGF0ZSB8fCB7fSlcbiAgICAsIHBvcCA9IHN0YXRlLnFzKHt9KS50byhxc19zdGF0ZSlcblxuICBpZiAoT2JqZWN0LmtleXModXBkYXRlcykubGVuZ3RoICYmIGN1cnJlbnQgIT0gcG9wKSB7XG4gICAgcmV0dXJuIHVwZGF0ZXNcbiAgfVxuXG4gIHJldHVybiB7fVxuICBcbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQge2ZpbHRlcl9kYXRhfSBmcm9tICdmaWx0ZXInO1xuXG5leHBvcnQgKiBmcm9tICcuL2hlbHBlcnMvZGF0YV9oZWxwZXJzJ1xuZXhwb3J0ICogZnJvbSAnLi9oZWxwZXJzL2dyYXBoX2hlbHBlcnMnXG5leHBvcnQgKiBmcm9tICcuL2hlbHBlcnMvc3RhdGVfaGVscGVycydcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9wU2VjdGlvbihzZWN0aW9uKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHNlY3Rpb24sXCIudG9wLXNlY3Rpb25cIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidG9wLXNlY3Rpb25cIix0cnVlKVxuICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjE2MHB4XCIpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1haW5pbmdTZWN0aW9uKHNlY3Rpb24pIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUoc2VjdGlvbixcIi5yZW1haW5pbmctc2VjdGlvblwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJyZW1haW5pbmctc2VjdGlvblwiLHRydWUpXG59XG5cbnZhciBvcHMgPSB7XG4gICAgXCJpcyBpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIilcbiAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPiAwXG4gICAgICAgIH0gXG4gICAgICB9XG4gICwgXCJpcyBub3QgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUuc3BsaXQoXCIsXCIpXG4gICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xIH0sIDApID09IDBcbiAgICAgICAgfSBcbiAgICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVybWluZUxvZ2ljKG9wdGlvbnMpIHtcbiAgY29uc3QgX2RlZmF1bHQgPSBvcHRpb25zWzBdXG4gIGNvbnN0IHNlbGVjdGVkID0gb3B0aW9ucy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5zZWxlY3RlZCB9KVxuICByZXR1cm4gc2VsZWN0ZWQubGVuZ3RoID4gMCA/IHNlbGVjdGVkWzBdIDogX2RlZmF1bHRcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclVybHModXJscyxsb2dpYyxmaWx0ZXJzKSB7XG4gIHJldHVybiBmaWx0ZXJfZGF0YSh1cmxzKVxuICAgIC5vcChcImlzIGluXCIsIG9wc1tcImlzIGluXCJdKVxuICAgIC5vcChcImlzIG5vdCBpblwiLCBvcHNbXCJpcyBub3QgaW5cIl0pXG4gICAgLmxvZ2ljKGxvZ2ljLnZhbHVlKVxuICAgIC5ieShmaWx0ZXJzKVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gU2VsZWN0KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNlbGVjdCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3QodGFyZ2V0KVxufVxuXG5TZWxlY3QucHJvdG90eXBlID0ge1xuICAgIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHRoaXMuX3NlbGVjdCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCJzZWxlY3RcIixcInNlbGVjdFwiLHRoaXMuX29wdGlvbnMpXG5cbiAgICAgIHZhciBib3VuZCA9IHRoaXMub24oXCJzZWxlY3RcIikuYmluZCh0aGlzKVxuXG4gICAgICB0aGlzLl9zZWxlY3RcbiAgICAgICAgLm9uKFwiY2hhbmdlXCIsZnVuY3Rpb24oeCkgeyBib3VuZCh0aGlzLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXykgfSlcblxuICAgICAgdGhpcy5fb3B0aW9ucyA9IGQzX3NwbGF0KHRoaXMuX3NlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIsaWRlbnRpdHksa2V5KVxuICAgICAgICAudGV4dChrZXkpXG4gICAgICAgIC5wcm9wZXJ0eShcInNlbGVjdGVkXCIsICh4KSA9PiB7XG4gICAgICAgICAgcmV0dXJuICh4LnZhbHVlICYmIHgudmFsdWUgPT0gdGhpcy5fc2VsZWN0ZWQpID8gXG4gICAgICAgICAgICBcInNlbGVjdGVkXCIgOiB4LnNlbGVjdGVkID09IDEgPyBcbiAgICAgICAgICAgIFwic2VsZWN0ZWRcIiA6IG51bGxcbiAgICAgICAgIFxuICAgICAgICB9KVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzZWxlY3RlZDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlbGVjdGVkXCIsdmFsKVxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi9zZWxlY3QnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5mdW5jdGlvbiBpbmplY3RDc3MoY3NzX3N0cmluZykge1xuICBkM191cGRhdGVhYmxlKGQzLnNlbGVjdChcImhlYWRcIiksXCJzdHlsZSNoZWFkZXItY3NzXCIsXCJzdHlsZVwiKVxuICAgIC5hdHRyKFwiaWRcIixcImhlYWRlci1jc3NcIilcbiAgICAudGV4dChDU1NfU1RSSU5HLnJlcGxhY2UoXCJmdW5jdGlvbiAoKSB7LypcIixcIlwiKS5yZXBsYWNlKFwiKi99XCIsXCJcIikpXG59XG5cbmZ1bmN0aW9uIGJ1dHRvbldyYXAod3JhcCkge1xuICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcCwgXCJoMy5idXR0b25zXCIsXCJoM1wiKVxuICAgIC5jbGFzc2VkKFwiYnV0dG9uc1wiLHRydWUpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi01cHhcIilcblxuICB2YXIgcmlnaHRfcHVsbCA9IGQzX3VwZGF0ZWFibGUoaGVhZCxcIi5wdWxsLXJpZ2h0XCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJwdWxsLXJpZ2h0IGhlYWRlci1idXR0b25zXCIsIHRydWUpXG4gICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxN3B4XCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIycHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LWRlY29yYXRpb25cIixcIm5vbmUgIWltcG9ydGFudFwiKVxuXG4gIHJldHVybiByaWdodF9wdWxsXG59XG5cbmZ1bmN0aW9uIGV4cGFuc2lvbldyYXAod3JhcCkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh3cmFwLFwiZGl2LmhlYWRlci1ib2R5XCIsXCJkaXZcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEzcHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwibm9uZVwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcIm5vcm1hbFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxNzVweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjI1cHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIyNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxNzVweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIndoaXRlXCIpXG4gICAgLmNsYXNzZWQoXCJoZWFkZXItYm9keSBoaWRkZW5cIix0cnVlKVxufVxuXG5mdW5jdGlvbiBoZWFkV3JhcCh3cmFwKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHdyYXAsIFwiaDMuZGF0YS1oZWFkZXJcIixcImgzXCIpXG4gICAgLmNsYXNzZWQoXCJkYXRhLWhlYWRlclwiLHRydWUpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi01cHhcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiIGJvbGRcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIiAxNHB4XCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIiAyMnB4XCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcIiB1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiICM4ODhcIilcbiAgICAuc3R5bGUoXCJsZXR0ZXItc3BhY2luZ1wiLFwiIC4wNWVtXCIpXG5cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gSGVhZGVyKHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG5cbiAgdmFyIENTU19TVFJJTkcgPSBTdHJpbmcoZnVuY3Rpb24oKSB7LypcbiAgICAuaGVhZGVyLWJ1dHRvbnMgYSBzcGFuLmhvdmVyLXNob3cgeyBkaXNwbGF5Om5vbmUgfVxuICAgIC5oZWFkZXItYnV0dG9ucyBhOmhvdmVyIHNwYW4uaG92ZXItc2hvdyB7IGRpc3BsYXk6aW5saW5lOyBwYWRkaW5nLWxlZnQ6M3B4IH1cbiAgKi99KVxuICBcbn1cblxuZnVuY3Rpb24gaGVhZGVyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEhlYWRlcih0YXJnZXQpXG59XG5cbkhlYWRlci5wcm90b3R5cGUgPSB7XG4gICAgdGV4dDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRleHRcIix2YWwpIFxuICAgIH1cbiAgLCBvcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwib3B0aW9uc1wiLHZhbCkgXG4gICAgfVxuICAsIGJ1dHRvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJidXR0b25zXCIsdmFsKSBcbiAgICB9XG4gICwgZXhwYW5zaW9uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZXhwYW5zaW9uXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsIFwiLmhlYWRlci13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoZWFkZXItd3JhcFwiLHRydWUpXG5cbiAgICAgIHZhciBleHBhbmRfd3JhcCA9IGV4cGFuc2lvbldyYXAod3JhcClcbiAgICAgICAgLCBidXR0b25fd3JhcCA9IGJ1dHRvbldyYXAod3JhcClcbiAgICAgICAgLCBoZWFkX3dyYXAgPSBoZWFkV3JhcCh3cmFwKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGhlYWRfd3JhcCxcInNwYW4udGl0bGVcIixcInNwYW5cIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgICAgIC50ZXh0KHRoaXMuX3RleHQpXG5cbiAgICAgIGlmICh0aGlzLl9vcHRpb25zKSB7XG5cbiAgICAgICAgdmFyIGJvdW5kID0gdGhpcy5vbihcInNlbGVjdFwiKS5iaW5kKHRoaXMpXG5cbiAgICAgICAgdmFyIHNlbGVjdEJveCA9IHNlbGVjdChoZWFkX3dyYXApXG4gICAgICAgICAgLm9wdGlvbnModGhpcy5fb3B0aW9ucylcbiAgICAgICAgICAub24oXCJzZWxlY3RcIixmdW5jdGlvbih4KSB7IGJvdW5kKHgpIH0pXG4gICAgICAgICAgLmRyYXcoKVxuXG4gICAgICAgIHNlbGVjdEJveC5fc2VsZWN0XG4gICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE5cHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMTJweFwiKVxuICAgICAgICAgIFxuICAgICAgICBzZWxlY3RCb3guX29wdGlvbnNcbiAgICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzg4OFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLFwiMTAwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCI1cHhcIilcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2J1dHRvbnMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGEgPSBkM19zcGxhdChidXR0b25fd3JhcCxcImFcIixcImFcIix0aGlzLl9idXR0b25zLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRleHQgfSlcbiAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAuc3R5bGUoXCJib3JkZXItcmlnaHRcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMnB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwidGV4dC1kZWNvcmF0aW9uXCIsXCJub25lXCIpXG4gICAgICAgICAgLmh0bWwoeCA9PiBcIjxzcGFuIGNsYXNzPSdcIiArIHguaWNvbiArIFwiJz48L3NwYW4+PHNwYW4gc3R5bGU9J3BhZGRpbmctbGVmdDozcHgnPlwiICsgeC50ZXh0ICsgXCI8L3NwYW4+XCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLHggPT4geC5jbGFzcylcbiAgICAgICAgICAub24oXCJjbGlja1wiLHggPT4gdGhpcy5vbih4LmNsYXNzICsgXCIuY2xpY2tcIikoeCkpXG5cblxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbmV4cG9ydCBkZWZhdWx0IGhlYWRlcjtcbiIsImltcG9ydCB7YWNjZXNzb3IsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBub29wfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGQzIGZyb20gJ2QzJztcbmltcG9ydCAnLi90YWJsZS5jc3MnXG5cblxudmFyIEVYQU1QTEVfREFUQSA9IHtcbiAgICBcImtleVwiOiBcIlRvcCBTaXRlc1wiXG4gICwgXCJ2YWx1ZXNcIjogW1xuICAgICAgeyAgXG4gICAgICAgICAgXCJrZXlcIjpcIlVSTC5jb21cIlxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOlwiYW9sLmNvbVwiXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICBdIFxufVxuXG5mdW5jdGlvbiBUYWJsZSh0YXJnZXQpIHtcbiAgdGhpcy5fd3JhcHBlcl9jbGFzcyA9IFwidGFibGUtd3JhcHBlclwiXG4gIHRoaXMuX3RhcmdldCA9IHRhcmdldDtcbiAgdGhpcy5fZGF0YSA9IHt9Ly9FWEFNUExFX0RBVEFcbiAgdGhpcy5fc29ydCA9IHt9XG4gIHRoaXMuX3JlbmRlcmVycyA9IHt9XG4gIHRoaXMuX3RvcCA9IDBcblxuICB0aGlzLl9kZWZhdWx0X3JlbmRlcmVyID0gZnVuY3Rpb24gKHgpIHtcbiAgICBpZiAoeC5rZXkuaW5kZXhPZihcInBlcmNlbnRcIikgPiAtMSkgcmV0dXJuIGQzLnNlbGVjdCh0aGlzKS50ZXh0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIHZhciBwZCA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfX1xuICAgICAgICByZXR1cm4gZDMuZm9ybWF0KFwiLjIlXCIpKHBkW3gua2V5XS8xMDApXG4gICAgICB9KVxuICAgXG4gICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzKS50ZXh0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICB2YXIgcGQgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX19cbiAgICAgIHJldHVybiBwZFt4LmtleV0gPiAwID8gZDMuZm9ybWF0KFwiLC4yZlwiKShwZFt4LmtleV0pLnJlcGxhY2UoXCIuMDBcIixcIlwiKSA6IHBkW3gua2V5XVxuICAgIH0pXG4gIH1cblxuICB0aGlzLl9oaWRkZW5fZmllbGRzID0gW11cbiAgdGhpcy5fb24gPSB7fVxuXG4gIHRoaXMuX3JlbmRlcl9leHBhbmQgPSBmdW5jdGlvbihkKSB7XG4gICAgZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInRkLm9wdGlvbi1oZWFkZXJcIikuaHRtbChcIiZuZGFzaDtcIilcbiAgICBpZiAodGhpcy5uZXh0U2libGluZyAmJiBkMy5zZWxlY3QodGhpcy5uZXh0U2libGluZykuY2xhc3NlZChcImV4cGFuZGVkXCIpID09IHRydWUpIHtcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImIzY1MjkxO1wiKVxuICAgICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgIH1cblxuICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgIHZhciB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcbiAgICB0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHQsIHRoaXMubmV4dFNpYmxpbmcpOyAgXG5cblxuICAgIHZhciB0ciA9IGQzLnNlbGVjdCh0KS5jbGFzc2VkKFwiZXhwYW5kZWRcIix0cnVlKS5kYXR1bSh7fSlcbiAgICB2YXIgdGQgPSBkM191cGRhdGVhYmxlKHRyLFwidGRcIixcInRkXCIpXG4gICAgICAuYXR0cihcImNvbHNwYW5cIix0aGlzLmNoaWxkcmVuLmxlbmd0aClcblxuICAgIHJldHVybiB0ZFxuICB9XG4gIHRoaXMuX3JlbmRlcl9oZWFkZXIgPSBmdW5jdGlvbih3cmFwKSB7XG5cblxuICAgIHdyYXAuZWFjaChmdW5jdGlvbihkYXRhKSB7XG4gICAgICB2YXIgaGVhZGVycyA9IGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KHRoaXMpLFwiLmhlYWRlcnNcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImhlYWRlcnNcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlci1ib3R0b21cIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgaGVhZGVycy5odG1sKFwiXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShoZWFkZXJzLFwiLnVybFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidXJsXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjc1JVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoXCJBcnRpY2xlXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaGVhZGVycyxcIi5jb3VudFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY291bnRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjUlXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChcIkNvdW50XCIpXG5cblxuICAgIH0pXG5cbiAgfVxuICB0aGlzLl9yZW5kZXJfcm93ID0gZnVuY3Rpb24ocm93KSB7XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUocm93LFwiLnVybFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidXJsXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjc1JVwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcImhpZGRlblwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkge3JldHVybiB4LmtleX0pXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUocm93LFwiLmNvdW50XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb3VudFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCl7cmV0dXJuIHgudmFsdWV9KVxuXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRhYmxlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFRhYmxlKHRhcmdldClcbn1cblxuVGFibGUucHJvdG90eXBlID0ge1xuXG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7IFxuICAgICAgdmFyIHZhbHVlID0gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgICAgaWYgKHZhbCAmJiB2YWwudmFsdWVzLmxlbmd0aCAmJiB0aGlzLl9oZWFkZXJzID09IHVuZGVmaW5lZCkgeyBcbiAgICAgICAgdmFyIGhlYWRlcnMgPSBPYmplY3Qua2V5cyh2YWwudmFsdWVzWzBdKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4ge2tleTp4LHZhbHVlOnh9IH0pXG4gICAgICAgIHRoaXMuaGVhZGVycyhoZWFkZXJzKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlXG4gICAgfVxuICAsIHNraXBfb3B0aW9uOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJza2lwX29wdGlvblwiLHZhbCkgfVxuICAsIHdyYXBwZXJfY2xhc3M6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIndyYXBwZXJfY2xhc3NcIix2YWwpIH1cblxuXG4gICwgdGl0bGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9XG4gICwgcm93OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyZW5kZXJfcm93XCIsdmFsKSB9XG4gICwgZGVmYXVsdF9yZW5kZXJlcjogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGVmYXVsdF9yZW5kZXJlclwiLHZhbCkgfVxuICAsIHRvcDogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidG9wXCIsdmFsKSB9XG5cbiAgLCBoZWFkZXI6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInJlbmRlcl9oZWFkZXJcIix2YWwpIH1cbiAgLCBoZWFkZXJzOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWFkZXJzXCIsdmFsKSB9XG4gICwgaGlkZGVuX2ZpZWxkczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGlkZGVuX2ZpZWxkc1wiLHZhbCkgfVxuICAsIGFsbF9oZWFkZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBoZWFkZXJzID0gdGhpcy5oZWFkZXJzKCkucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMudmFsdWU7IHJldHVybiBwfSx7fSlcbiAgICAgICAgLCBpc19sb2NrZWQgPSB0aGlzLmhlYWRlcnMoKS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4gISF4LmxvY2tlZCB9KS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcblxuICAgICAgaWYgKHRoaXMuX2RhdGEudmFsdWVzICYmIHRoaXMuX2RhdGEudmFsdWVzLmxlbmd0aCkge1xuICAgICAgICBcbiAgICAgICAgdmFyIGFsbF9oZWFkcyA9IE9iamVjdC5rZXlzKHRoaXMuX2RhdGEudmFsdWVzWzBdKS5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgICBpZiAodGhpcy5faGlkZGVuX2ZpZWxkcyAmJiB0aGlzLl9oaWRkZW5fZmllbGRzLmluZGV4T2YoeCkgPiAtMSkgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAga2V5OnhcbiAgICAgICAgICAgICwgdmFsdWU6aGVhZGVyc1t4XSB8fCB4XG4gICAgICAgICAgICAsIHNlbGVjdGVkOiAhIWhlYWRlcnNbeF1cbiAgICAgICAgICAgICwgbG9ja2VkOiAoaXNfbG9ja2VkLmluZGV4T2YoeCkgPiAtMSA/IHRydWUgOiB1bmRlZmluZWQpIFxuICAgICAgICAgIH0gXG4gICAgICAgIH0uYmluZCh0aGlzKSkuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSlcbiAgICAgICAgdmFyIGdldEluZGV4ID0gZnVuY3Rpb24oaykge1xuICAgICAgICAgIHJldHVybiBpc19sb2NrZWQuaW5kZXhPZihrKSA+IC0xID8gaXNfbG9ja2VkLmluZGV4T2YoaykgKyAxMCA6IDBcbiAgICAgICAgfVxuXG4gICAgICAgIGFsbF9oZWFkcyA9IGFsbF9oZWFkcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gZ2V0SW5kZXgoYy5rZXkgfHwgLUluZmluaXR5KSAtIGdldEluZGV4KHAua2V5IHx8IC1JbmZpbml0eSkgfSlcbiAgICAgICAgcmV0dXJuIGFsbF9oZWFkc1xuICAgICAgfVxuICAgICAgZWxzZSByZXR1cm4gdGhpcy5oZWFkZXJzKClcbiAgICB9XG4gICwgc29ydDogZnVuY3Rpb24oa2V5LGFzY2VuZGluZykge1xuICAgICAgaWYgKCFrZXkpIHJldHVybiB0aGlzLl9zb3J0XG4gICAgICB0aGlzLl9zb3J0ID0ge1xuICAgICAgICAgIGtleToga2V5XG4gICAgICAgICwgdmFsdWU6ICEhYXNjZW5kaW5nXG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAsIHJlbmRlcl93cmFwcGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gdGhpcy5fdGFyZ2V0XG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLlwiK3RoaXMuX3dyYXBwZXJfY2xhc3MsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQodGhpcy5fd3JhcHBlcl9jbGFzcyx0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwicmVsYXRpdmVcIilcblxuXG4gICAgICB2YXIgdGFibGUgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCJ0YWJsZS5tYWluXCIsXCJ0YWJsZVwiKVxuICAgICAgICAuY2xhc3NlZChcIm1haW5cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuXG4gICAgICB0aGlzLl90YWJsZV9tYWluID0gdGFibGVcblxuICAgICAgdmFyIHRoZWFkID0gZDNfdXBkYXRlYWJsZSh0YWJsZSxcInRoZWFkXCIsXCJ0aGVhZFwiKVxuICAgICAgZDNfdXBkYXRlYWJsZSh0YWJsZSxcInRib2R5XCIsXCJ0Ym9keVwiKVxuXG5cblxuICAgICAgdmFyIHRhYmxlX2ZpeGVkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwidGFibGUuZml4ZWRcIixcInRhYmxlXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIHRydWUpIC8vIFRPRE86IG1ha2UgdGhpcyB2aXNpYmxlIHdoZW4gbWFpbiBpcyBub3QgaW4gdmlld1xuICAgICAgICAuY2xhc3NlZChcImZpeGVkXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIix3cmFwcGVyLnN0eWxlKFwid2lkdGhcIikpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLHRoaXMuX3RvcCArIFwicHhcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG5cbiAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgdHJ5IHtcbiAgICAgIGQzLnNlbGVjdCh3aW5kb3cpLm9uKCdzY3JvbGwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2codGFibGUubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCwgc2VsZi5fdG9wKVxuICAgICAgICBpZiAodGFibGUubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCA8IHNlbGYuX3RvcCkgdGFibGVfZml4ZWQuY2xhc3NlZChcImhpZGRlblwiLGZhbHNlKVxuICAgICAgICBlbHNlIHRhYmxlX2ZpeGVkLmNsYXNzZWQoXCJoaWRkZW5cIix0cnVlKVxuXG4gICAgICAgIHZhciB3aWR0aHMgPSBbXVxuXG4gICAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLm1haW5cIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwiLnRhYmxlLWhlYWRlcnNcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwidGhcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgIHdpZHRocy5wdXNoKHRoaXMub2Zmc2V0V2lkdGgpXG4gICAgICAgICAgfSlcblxuICAgICAgICB3cmFwLnNlbGVjdEFsbChcIi5maXhlZFwiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCIudGFibGUtaGVhZGVyc1wiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCJ0aFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwid2lkdGhcIix3aWR0aHNbaV0gKyBcInB4XCIpXG4gICAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICB9KVxuICAgICAgfSBjYXRjaChlKSB7fVxuICAgICAgIFxuXG4gICAgICB0aGlzLl90YWJsZV9maXhlZCA9IHRhYmxlX2ZpeGVkXG5cblxuICAgICAgdmFyIHRoZWFkID0gZDNfdXBkYXRlYWJsZSh0YWJsZV9maXhlZCxcInRoZWFkXCIsXCJ0aGVhZFwiKVxuXG4gICAgICBpZiAoIXRoaXMuX3NraXBfb3B0aW9uKSB7XG4gICAgICAgIHZhciB0YWJsZV9idXR0b24gPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIudGFibGUtb3B0aW9uXCIsXCJhXCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS1vcHRpb25cIix0cnVlKVxuICAgICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJhYnNvbHV0ZVwiKVxuICAgICAgICAgIC5zdHlsZShcInRvcFwiLFwiLTFweFwiKVxuICAgICAgICAgIC5zdHlsZShcInJpZ2h0XCIsXCIwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIixcInBvaW50ZXJcIilcbiAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKVxuICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1yaWdodFwiLFwiOHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCI4cHhcIilcbiAgICAgICAgICAudGV4dChcIk9QVElPTlNcIilcbiAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZTNlYmYwXCIpXG4gICAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIsIXRoaXMuX29wdGlvbnNfaGVhZGVyLmNsYXNzZWQoXCJoaWRkZW5cIikpXG4gICAgICAgICAgICB0aGlzLl9zaG93X29wdGlvbnMgPSAhdGhpcy5fb3B0aW9uc19oZWFkZXIuY2xhc3NlZChcImhpZGRlblwiKVxuICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHdyYXBwZXJcbiAgICB9ICBcbiAgLCByZW5kZXJfaGVhZGVyOiBmdW5jdGlvbih0YWJsZSkge1xuXG4gICAgICB2YXIgdGhlYWQgPSB0YWJsZS5zZWxlY3RBbGwoXCJ0aGVhZFwiKVxuICAgICAgICAsIHRib2R5ID0gdGFibGUuc2VsZWN0QWxsKFwidGJvZHlcIilcblxuICAgICAgaWYgKHRoaXMuaGVhZGVycygpID09IHVuZGVmaW5lZCkgcmV0dXJuXG5cbiAgICAgIHZhciBvcHRpb25zX3RoZWFkID0gZDNfdXBkYXRlYWJsZSh0aGVhZCxcInRyLnRhYmxlLW9wdGlvbnNcIixcInRyXCIsdGhpcy5hbGxfaGVhZGVycygpLGZ1bmN0aW9uKHgpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsICF0aGlzLl9zaG93X29wdGlvbnMpXG4gICAgICAgIC5jbGFzc2VkKFwidGFibGUtb3B0aW9uc1wiLHRydWUpXG5cbiAgICAgIHZhciBoID0gdGhpcy5fc2tpcF9vcHRpb24gPyB0aGlzLmhlYWRlcnMoKSA6IHRoaXMuaGVhZGVycygpLmNvbmNhdChbe2tleTpcInNwYWNlclwiLCB3aWR0aDpcIjcwcHhcIn1dKVxuICAgICAgdmFyIGhlYWRlcnNfdGhlYWQgPSBkM191cGRhdGVhYmxlKHRoZWFkLFwidHIudGFibGUtaGVhZGVyc1wiLFwidHJcIixoLGZ1bmN0aW9uKHgpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwidGFibGUtaGVhZGVyc1wiLHRydWUpXG5cblxuICAgICAgdmFyIHRoID0gZDNfc3BsYXQoaGVhZGVyc190aGVhZCxcInRoXCIsXCJ0aFwiLGZhbHNlLGZ1bmN0aW9uKHgsaSkge3JldHVybiB4LmtleSArIGkgfSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LndpZHRoIH0pXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJyZWxhdGl2ZVwiKVxuICAgICAgICAub3JkZXIoKVxuXG4gICAgICB2YXIgZGVmYXVsdFNvcnQgPSBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKHguc29ydCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB4Wydzb3J0J11cbiAgICAgICAgICAgIHRoaXMuX3NvcnQgPSB7fVxuICAgICAgICAgICAgdGhpcy5kcmF3KClcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeC5zb3J0ID0gISF4LnNvcnRcblxuICAgICAgICAgICAgdGhpcy5zb3J0KHgua2V5LHguc29ydClcbiAgICAgICAgICAgIHRoaXMuZHJhdygpXG4gICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcylcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHRoLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgfSlcbiAgICAgICAgLm9uKFwiY2xpY2tcIix0aGlzLm9uKFwic29ydFwiKSAhPSBub29wID8gdGhpcy5vbihcInNvcnRcIikgOiBkZWZhdWx0U29ydClcblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodGgsXCJpXCIsXCJpXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZmFcIix0cnVlKVxuICAgICAgICAuY2xhc3NlZChcImZhLXNvcnQtYXNjXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuICh4LmtleSA9PSB0aGlzLl9zb3J0LmtleSkgPyB0aGlzLl9zb3J0LnZhbHVlID09PSB0cnVlIDogdW5kZWZpbmVkIH0uYmluZCh0aGlzKSlcbiAgICAgICAgLmNsYXNzZWQoXCJmYS1zb3J0LWRlc2NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4gKHgua2V5ID09IHRoaXMuX3NvcnQua2V5KSA/IHRoaXMuX3NvcnQudmFsdWUgPT09IGZhbHNlIDogdW5kZWZpbmVkIH0uYmluZCh0aGlzKSlcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGNhbl9yZWRyYXcgPSB0cnVlXG5cbiAgICAgIHZhciBkcmFnID0gZDMuYmVoYXZpb3IuZHJhZygpXG4gICAgICAgIC5vbihcImRyYWdcIiwgZnVuY3Rpb24oZCxpKSB7XG4gICAgICAgICAgICB2YXIgeCA9IGQzLmV2ZW50LmR4XG4gICAgICAgICAgICB2YXIgdyA9IHBhcnNlSW50KGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnN0eWxlKFwid2lkdGhcIikucmVwbGFjZShcInB4XCIpKVxuICAgICAgICAgICAgdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fLndpZHRoID0gKHcreCkrXCJweFwiXG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zdHlsZShcIndpZHRoXCIsICh3K3gpK1wicHhcIilcblxuICAgICAgICAgICAgdmFyIGluZGV4ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW4sMCkuaW5kZXhPZih0aGlzLnBhcmVudE5vZGUpICsgMVxuICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuW2luZGV4XSkuc3R5bGUoXCJ3aWR0aFwiLHVuZGVmaW5lZClcblxuICAgICAgICAgICAgaWYgKGNhbl9yZWRyYXcpIHtcbiAgICAgICAgICAgICAgY2FuX3JlZHJhdyA9IGZhbHNlXG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY2FuX3JlZHJhdyA9IHRydWVcbiAgICAgICAgICAgICAgICB0Ym9keS5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpudGgtb2YtdHlwZShcIiArIGluZGV4ICsgXCIpXCIpLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgICAgdmFyIHJlbmRlciA9IHNlbGYuX3JlbmRlcmVyc1t4LmtleV1cbiAgICAgICAgICAgICAgICAgIGlmIChyZW5kZXIpIHJlbmRlci5iaW5kKHRoaXMpKHgpXG4gICAgXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICB9LDEpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG5cbiAgICAgIHZhciBkcmFnZ2FibGUgPSBkM191cGRhdGVhYmxlKHRoLFwiYlwiLFwiYlwiKVxuICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIiwgXCJldy1yZXNpemVcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsIFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIiwgXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsIFwiYWJzb2x1dGVcIilcbiAgICAgICAgLnN0eWxlKFwicmlnaHRcIiwgXCItOHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLCBcIjBcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIiwgXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIiwgMSlcbiAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgdmFyIGluZGV4ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW4sMCkuaW5kZXhPZih0aGlzLnBhcmVudE5vZGUpICsgMVxuICAgICAgICAgICB0Ym9keS5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpudGgtb2YtdHlwZShcIiArIGluZGV4ICsgXCIpXCIpLnN0eWxlKFwiYm9yZGVyLXJpZ2h0XCIsXCIxcHggZG90dGVkICNjY2NcIilcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKFwibW91c2VvdXRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICB2YXIgaW5kZXggPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbiwwKS5pbmRleE9mKHRoaXMucGFyZW50Tm9kZSkgKyAxXG4gICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuc3R5bGUoXCJib3JkZXItcmlnaHRcIix1bmRlZmluZWQpXG4gICAgICAgIH0pXG4gICAgICAgIC5jYWxsKGRyYWcpXG5cbiAgICAgIHRoLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgICBpZiAoIXRoaXMuX3NraXBfb3B0aW9uKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IGQzX3VwZGF0ZWFibGUob3B0aW9uc190aGVhZCxcInRoXCIsXCJ0aFwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5hdHRyKFwiY29sc3BhblwiLHRoaXMuaGVhZGVycygpLmxlbmd0aCsxKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgICAgICAgICAgICAgIFxuICAgICAgdmFyIG9wdGlvbiA9IGQzX3NwbGF0KG9wdGlvbnMsXCIub3B0aW9uXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgICAuY2xhc3NlZChcIm9wdGlvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG4gICAgICBvcHRpb24uZXhpdCgpLnJlbW92ZSgpXG5cbiAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICBkM191cGRhdGVhYmxlKG9wdGlvbixcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgICAuYXR0cihcInR5cGVcIixcImNoZWNrYm94XCIpXG4gICAgICAgIC5wcm9wZXJ0eShcImNoZWNrZWRcIixmdW5jdGlvbih4KSB7IFxuICAgICAgICAgIHRoaXMuY2hlY2tlZCA9IHguc2VsZWN0ZWRcbiAgICAgICAgICByZXR1cm4geC5zZWxlY3RlZCA/IFwiY2hlY2tlZFwiIDogdW5kZWZpbmVkIFxuICAgICAgICB9KVxuICAgICAgICAuYXR0cihcImRpc2FibGVkXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5sb2NrZWQgfSlcbiAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHguc2VsZWN0ZWQgPSB0aGlzLmNoZWNrZWRcbiAgICAgICAgICBpZiAoeC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgc2VsZi5oZWFkZXJzKCkucHVzaCh4KVxuICAgICAgICAgICAgcmV0dXJuIHNlbGYuZHJhdygpXG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBpbmRpY2VzID0gc2VsZi5oZWFkZXJzKCkubWFwKGZ1bmN0aW9uKHosaSkgeyByZXR1cm4gei5rZXkgPT0geC5rZXkgPyBpIDogdW5kZWZpbmVkICB9KSBcbiAgICAgICAgICAgICwgaW5kZXggPSBpbmRpY2VzLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6IH0pIHx8IDA7XG5cbiAgICAgICAgICBzZWxmLmhlYWRlcnMoKS5zcGxpY2UoaW5kZXgsMSlcbiAgICAgICAgICBzZWxmLmRyYXcoKVxuXG4gICAgICAgIH0pXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUob3B0aW9uLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiBcIiBcIiArIHgudmFsdWUgfSlcblxuICAgICB9XG5cblxuICAgICB0aGlzLl9vcHRpb25zX2hlYWRlciA9IHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCIudGFibGUtb3B0aW9uc1wiKVxuICAgIH1cbiAgXG4gICwgcmVuZGVyX3Jvd3M6IGZ1bmN0aW9uKHRhYmxlKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciB0Ym9keSA9IHRhYmxlLnNlbGVjdEFsbChcInRib2R5XCIpXG5cbiAgICAgIGlmICh0aGlzLmhlYWRlcnMoKSA9PSB1bmRlZmluZWQpIHJldHVyblxuICAgICAgaWYgKCEodGhpcy5fZGF0YSAmJiB0aGlzLl9kYXRhLnZhbHVlcyAmJiB0aGlzLl9kYXRhLnZhbHVlcy5sZW5ndGgpKSByZXR1cm5cblxuICAgICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhLnZhbHVlc1xuICAgICAgICAsIHNvcnRieSA9IHRoaXMuX3NvcnQgfHwge307XG5cbiAgICAgIGRhdGEgPSBkYXRhLnNvcnQoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgIHZhciBhID0gcFtzb3J0Ynkua2V5XSB8fCAtSW5maW5pdHlcbiAgICAgICAgICAsIGIgPSBjW3NvcnRieS5rZXldIHx8IC1JbmZpbml0eVxuXG4gICAgICAgIHJldHVybiBzb3J0YnkudmFsdWUgPyBkMy5hc2NlbmRpbmcoYSxiKSA6IGQzLmRlc2NlbmRpbmcoYSxiKVxuICAgICAgfSlcblxuICAgICAgdmFyIHJvd3MgPSBkM19zcGxhdCh0Ym9keSxcInRyXCIsXCJ0clwiLGRhdGEsZnVuY3Rpb24oeCxpKXsgcmV0dXJuIFN0cmluZyhzb3J0Ynkua2V5ICsgeFtzb3J0Ynkua2V5XSkgKyBpIH0pXG4gICAgICAgIC5vcmRlcigpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGlmIChzZWxmLm9uKFwiZXhwYW5kXCIpICE9IG5vb3ApIHtcbiAgICAgICAgICAgIHZhciB0ZCA9IHNlbGYuX3JlbmRlcl9leHBhbmQuYmluZCh0aGlzKSh4KVxuICAgICAgICAgICAgc2VsZi5vbihcImV4cGFuZFwiKS5iaW5kKHRoaXMpKHgsdGQpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICByb3dzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgICB2YXIgdGQgPSBkM19zcGxhdChyb3dzLFwidGRcIixcInRkXCIsdGhpcy5oZWFkZXJzKCksZnVuY3Rpb24oeCxpKSB7cmV0dXJuIHgua2V5ICsgaSB9KVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpXG5cbiAgICAgICAgICB2YXIgcmVuZGVyZXIgPSBzZWxmLl9yZW5kZXJlcnNbeC5rZXldXG5cbiAgICAgICAgICBpZiAoIXJlbmRlcmVyKSB7IFxuICAgICAgICAgICAgcmVuZGVyZXIgPSBzZWxmLl9kZWZhdWx0X3JlbmRlcmVyLmJpbmQodGhpcykoeCkgXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiByZW5kZXJlci5iaW5kKHRoaXMpKHgpXG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgfSlcblxuICAgICAgICBcblxuICAgICAgdGQuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICAgIHZhciBvID0gZDNfdXBkYXRlYWJsZShyb3dzLFwidGQub3B0aW9uLWhlYWRlclwiLFwidGRcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcIm9wdGlvbi1oZWFkZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNzBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiBcbiAgICAgIGlmICh0aGlzLl9za2lwX29wdGlvbikgby5jbGFzc2VkKFwiaGlkZGVuXCIsdHJ1ZSkgXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShvLFwiYVwiLFwiYVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuaHRtbChzZWxmLm9wdGlvbl90ZXh0KCkpXG4gICAgICAgIFxuXG5cblxuICAgIH1cbiAgLCBvcHRpb25fdGV4dDogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwib3B0aW9uX3RleHRcIix2YWwpIH1cbiAgLCByZW5kZXI6IGZ1bmN0aW9uKGssZm4pIHtcbiAgICAgIGlmIChmbiA9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9yZW5kZXJlcnNba10gfHwgZmFsc2VcbiAgICAgIHRoaXMuX3JlbmRlcmVyc1trXSA9IGZuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgdmFyIHdyYXBwZXIgPSB0aGlzLnJlbmRlcl93cmFwcGVyKClcblxuICAgICAgd3JhcHBlci5zZWxlY3RBbGwoXCJ0YWJsZVwiKVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7IFxuICAgICAgICAgIHNlbGYucmVuZGVyX2hlYWRlcihkMy5zZWxlY3QodGhpcykpIFxuICAgICAgICB9KVxuXG4gICAgICB0aGlzLnJlbmRlcl9yb3dzKHRoaXMuX3RhYmxlX21haW4pXG5cbiAgICAgIHRoaXMub24oXCJkcmF3XCIpLmJpbmQodGhpcykoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGQzOiBkM1xufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0ICcuL3N1bW1hcnlfdGFibGUuY3NzJ1xuaW1wb3J0IHt0YWJsZX0gZnJvbSAnLi90YWJsZSdcblxuZXhwb3J0IGZ1bmN0aW9uIHN1bW1hcnlfdGFibGUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU3VtbWFyeVRhYmxlKHRhcmdldClcbn1cblxuY2xhc3MgU3VtbWFyeVRhYmxlIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICAgIHRoaXMuX3dyYXBwZXJfY2xhc3MgPSBcInRhYmxlLXN1bW1hcnktd3JhcHBlclwiXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcInRpdGxlXCIsIFwiaGVhZGVyc1wiLCBcImRhdGFcIiwgXCJ3cmFwcGVyX2NsYXNzXCJdIH1cblxuICBkcmF3KCkge1xuICAgIHZhciB1cmxzX3N1bW1hcnkgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJzdW1tYXJ5LXRhYmxlXCIpXG4gICAgICBcbiAgICBkM19jbGFzcyh1cmxzX3N1bW1hcnksXCJ0aXRsZVwiKVxuICAgICAgLnRleHQodGhpcy50aXRsZSgpKVxuXG4gICAgdmFyIHV3cmFwID0gZDNfY2xhc3ModXJsc19zdW1tYXJ5LFwid3JhcFwiKVxuXG5cbiAgICB0YWJsZSh1d3JhcClcbiAgICAgIC53cmFwcGVyX2NsYXNzKHRoaXMud3JhcHBlcl9jbGFzcygpLHRydWUpXG4gICAgICAuZGF0YSh7XCJ2YWx1ZXNcIjp0aGlzLmRhdGEoKX0pXG4gICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgIC5oZWFkZXJzKHRoaXMuaGVhZGVycygpKVxuICAgICAgLmRyYXcoKVxuXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4uL2dlbmVyaWMvc2VsZWN0J1xuXG5pbXBvcnQgKiBhcyB0YWJsZSBmcm9tICd0YWJsZSdcbmltcG9ydCB7ZmlsdGVyfSBmcm9tICdmaWx0ZXInXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5leHBvcnQgZnVuY3Rpb24gRmlsdGVyVmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cblxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxuICB0aGlzLl9maWx0ZXJfb3B0aW9ucyA9IHtcbiAgICAgIFwiQ2F0ZWdvcnlcIjogXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiXG4gICAgLCBcIlRpdGxlXCI6IFwidXJsXCJcbiAgICAsIFwiVGltZVwiOiBcImhvdXJcIlxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGZpbHRlcl92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IEZpbHRlclZpZXcodGFyZ2V0KVxufVxuXG5GaWx0ZXJWaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIGxvZ2ljOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibG9naWNcIix2YWwpIFxuICAgIH1cbiAgLCBjYXRlZ29yaWVzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY2F0ZWdvcmllc1wiLHZhbCkgXG4gICAgfVxuICAsIGZpbHRlcnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJmaWx0ZXJzXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICBcbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5maWx0ZXItd3JhcFwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKXsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlci13cmFwXCIsdHJ1ZSlcblxuICAgICAgaGVhZGVyKHdyYXBwZXIpXG4gICAgICAgIC50ZXh0KFwiRmlsdGVyXCIpXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgdmFyIHN1YnRpdGxlID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLCBcIi5zdWJ0aXRsZS1maWx0ZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInN1YnRpdGxlLWZpbHRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwiIHVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiIGJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIiAzM3B4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiAjZTNlYmYwXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoc3VidGl0bGUsXCJzcGFuLmZpcnN0XCIsXCJzcGFuXCIpXG4gICAgICAgIC50ZXh0KFwiVXNlcnMgbWF0Y2hpbmcgXCIgKVxuICAgICAgICAuY2xhc3NlZChcImZpcnN0XCIsdHJ1ZSlcbiAgICBcbiAgICAgIHZhciBmaWx0ZXJfdHlwZSAgPSBkM191cGRhdGVhYmxlKHN1YnRpdGxlLFwic3Bhbi5taWRkbGVcIixcInNwYW5cIilcbiAgICAgICAgLmNsYXNzZWQoXCJtaWRkbGVcIix0cnVlKVxuICAgIFxuICAgICAgc2VsZWN0KGZpbHRlcl90eXBlKVxuICAgICAgICAub3B0aW9ucyh0aGlzLmxvZ2ljKCkpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdGhpcy5sb2dpYygpLm1hcChmdW5jdGlvbih5KSB7IFxuICAgICAgICAgICAgeS5zZWxlY3RlZCA9ICh5LmtleSA9PSB4LmtleSlcbiAgICAgICAgICB9KVxuICAgICAgICAgIHRoaXMub24oXCJsb2dpYy5jaGFuZ2VcIikodGhpcy5sb2dpYygpKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIC5kcmF3KClcbiAgICAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdWJ0aXRsZSxcInNwYW4ubGFzdFwiLFwic3BhblwiKVxuICAgICAgICAudGV4dChcIiBvZiB0aGUgZm9sbG93aW5nOlwiKVxuICAgICAgICAuY2xhc3NlZChcImxhc3RcIix0cnVlKVxuXG5cbiAgICAgIC8vIC0tLS0tLS0tIENBVEVHT1JJRVMgLS0tLS0tLS0tIC8vXG5cbiAgICAgIHZhciBjYXRlZ29yaWVzID0gdGhpcy5jYXRlZ29yaWVzKClcbiAgICAgIHZhciBmaWx0ZXJfY2hhbmdlID0gdGhpcy5vbihcImZpbHRlci5jaGFuZ2VcIikuYmluZCh0aGlzKVxuXG4gICAgICBmdW5jdGlvbiBzZWxlY3RpemVJbnB1dChmaWx0ZXIsdmFsdWUpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjIwMHB4XCIpXG4gICAgICAgICAgLnByb3BlcnR5KFwidmFsdWVcIix2YWx1ZS52YWx1ZSlcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIGRlc3Ryb3kgPSBkMy5zZWxlY3QodGhpcykub24oXCJkZXN0cm95XCIpXG4gICAgICAgICAgICBpZiAoZGVzdHJveSkgZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuXG4gICAgICAgIHZhciBzID0gJChzZWxlY3Qubm9kZSgpKS5zZWxlY3RpemUoe1xuICAgICAgICAgIHBlcnNpc3Q6IGZhbHNlLFxuICAgICAgICAgIGNyZWF0ZTogZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9ICh2YWx1ZS52YWx1ZSA/IHZhbHVlLnZhbHVlICsgXCIsXCIgOiBcIlwiKSArIHhcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB2YWx1ZTogeCwgdGV4dDogeFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgb25EZWxldGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSB2YWx1ZS52YWx1ZS5zcGxpdChcIixcIikuZmlsdGVyKGZ1bmN0aW9uKHopIHsgcmV0dXJuIHogIT0geFswXX0pLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAgIC5vbihcImRlc3Ryb3lcIixmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNbMF0uc2VsZWN0aXplLmRlc3Ryb3koKVxuICAgICAgICAgIH0pXG5cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gc2VsZWN0aXplU2VsZWN0KGZpbHRlcix2YWx1ZSkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKS5yZW1vdmUoKVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgZGVzdHJveSA9IGQzLnNlbGVjdCh0aGlzKS5vbihcImRlc3Ryb3lcIilcbiAgICAgICAgICAgIGlmIChkZXN0cm95KSBkZXN0cm95KClcbiAgICAgICAgICB9KVxuXG5cblxuICAgIFxuICAgICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJzZWxlY3QudmFsdWVcIixcInNlbGVjdFwiKVxuICAgICAgICAgIC5jbGFzc2VkKFwidmFsdWVcIix0cnVlKVxuICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjIwMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWF4LXdpZHRoXCIsXCI1MDBweFwiKVxuICAgICAgICAgIC5hdHRyKFwibXVsdGlwbGVcIix0cnVlKVxuICAgICAgICAgIC5vbihcImNoYW5nZVwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdGhpcy52YWx1ZVxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICB9KVxuICAgIFxuICAgICAgICBkM19zcGxhdChzZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiLGNhdGVnb3JpZXMsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgICAuYXR0cihcInNlbGVjdGVkXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gdmFsdWUudmFsdWUgJiYgdmFsdWUudmFsdWUuaW5kZXhPZih4LmtleSkgPiAtMSA/IFwic2VsZWN0ZWRcIiA6IHVuZGVmaW5lZCB9KVxuICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG5cbiAgICAgICAgdmFyIHMgPSAkKHNlbGVjdC5ub2RlKCkpLnNlbGVjdGl6ZSh7XG4gICAgICAgICAgcGVyc2lzdDogZmFsc2UsXG4gICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0geC5qb2luKFwiLFwiKVxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAgIC5vbihcImRlc3Ryb3lcIixmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNbMF0uc2VsZWN0aXplLmRlc3Ryb3koKVxuICAgICAgICAgIH0pXG5cblxuXG4gICAgXG4gICAgICB9XG4gICAgXG4gICAgICB0aGlzLl9sb2dpY19maWx0ZXIgPSBmaWx0ZXIod3JhcHBlcilcbiAgICAgICAgLmZpZWxkcyhPYmplY3Qua2V5cyh0aGlzLl9maWx0ZXJfb3B0aW9ucykpXG4gICAgICAgIC5vcHMoW1xuICAgICAgICAgICAgW3tcImtleVwiOiBcImlzIGluLmNhdGVnb3J5XCJ9LHtcImtleVwiOiBcImlzIG5vdCBpbi5jYXRlZ29yeVwifV1cbiAgICAgICAgICAsIFt7XCJrZXlcIjogXCJjb250YWlucy5zZWxlY3RpemVcIn0sIHtcImtleVwiOlwiZG9lcyBub3QgY29udGFpbi5zZWxlY3RpemVcIn1dXG4gICAgICAgICAgLCBbe1wia2V5XCI6IFwiZXF1YWxzXCJ9LCB7XCJrZXlcIjpcImJldHdlZW5cIixcImlucHV0XCI6Mn1dXG4gICAgICAgIF0pXG4gICAgICAgIC5kYXRhKHRoaXMuZmlsdGVycygpKVxuICAgICAgICAucmVuZGVyX29wKFwiY29udGFpbnMuc2VsZWN0aXplXCIsc2VsZWN0aXplSW5wdXQpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJkb2VzIG5vdCBjb250YWluLnNlbGVjdGl6ZVwiLHNlbGVjdGl6ZUlucHV0KVxuICAgICAgICAucmVuZGVyX29wKFwiaXMgaW4uY2F0ZWdvcnlcIixzZWxlY3RpemVTZWxlY3QpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJpcyBub3QgaW4uY2F0ZWdvcnlcIixzZWxlY3RpemVTZWxlY3QpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJiZXR3ZWVuXCIsZnVuY3Rpb24oZmlsdGVyLHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgXG4gICAgICAgICAgdmFsdWUudmFsdWUgPSB0eXBlb2YodmFsdWUudmFsdWUpID09IFwib2JqZWN0XCIgPyB2YWx1ZS52YWx1ZSA6IFswLDI0XVxuICAgIFxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwiaW5wdXQudmFsdWUubG93XCIsXCJpbnB1dFwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZSBsb3dcIix0cnVlKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiOTBweFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ2YWx1ZVwiLCB2YWx1ZS52YWx1ZVswXSlcbiAgICAgICAgICAgIC5vbihcImtleXVwXCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICB2YXIgdCA9IHRoaXNcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgICBzZWxmLnR5cGV3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZS52YWx1ZVswXSA9IHQudmFsdWVcbiAgICAgICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgICAgICB9LDEwMDApXG4gICAgICAgICAgICB9KVxuICAgIFxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic3Bhbi52YWx1ZS1hbmRcIixcInNwYW5cIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidmFsdWUtYW5kXCIsdHJ1ZSlcbiAgICAgICAgICAgIC50ZXh0KFwiIGFuZCBcIilcbiAgICBcbiAgICAgICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0LnZhbHVlLmhpZ2hcIixcImlucHV0XCIpXG4gICAgICAgICAgICAuY2xhc3NlZChcInZhbHVlIGhpZ2hcIix0cnVlKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiOTBweFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ2YWx1ZVwiLCB2YWx1ZS52YWx1ZVsxXSlcbiAgICAgICAgICAgIC5vbihcImtleXVwXCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICB2YXIgdCA9IHRoaXNcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgICBzZWxmLnR5cGV3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZS52YWx1ZVsxXSA9IHQudmFsdWVcbiAgICAgICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgICAgICB9LDEwMDApXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICAub24oXCJ1cGRhdGVcIixmdW5jdGlvbihmaWx0ZXJzKXtcbiAgICAgICAgICBmaWx0ZXJfY2hhbmdlKGZpbHRlcnMpXG4gICAgICAgIH0pXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgLy9kM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmZpbHRlci13cmFwLXNwYWNlclwiLFwiZGl2XCIpXG4gICAgICAvLyAgLmNsYXNzZWQoXCJmaWx0ZXItd3JhcC1zcGFjZXJcIix0cnVlKVxuICAgICAgLy8gIC5zdHlsZShcImhlaWdodFwiLHdyYXBwZXIuc3R5bGUoXCJoZWlnaHRcIikpXG5cbiAgICAgIC8vd3JhcHBlclxuICAgICAgLy8gIC5zdHlsZShcIndpZHRoXCIsdGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKSlcbiAgICAgIC8vICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcbiAgICAgIC8vICAuc3R5bGUoXCJ6LWluZGV4XCIsXCIzMDBcIilcbiAgICAgIC8vICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjBmNGY3XCIpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuXG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4vaGVhZGVyJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIEJ1dHRvblJhZGlvKHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGJ1dHRvbl9yYWRpbyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBCdXR0b25SYWRpbyh0YXJnZXQpXG59XG5cbkJ1dHRvblJhZGlvLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uICgpIHtcbiAgXG4gICAgdmFyIENTU19TVFJJTkcgPSBTdHJpbmcoZnVuY3Rpb24oKSB7LypcbiAgICAgIC5vcHRpb25zLXZpZXcgeyB0ZXh0LWFsaWduOnJpZ2h0IH1cbiAgICAgIC5zaG93LWJ1dHRvbiB7XG4gICAgICB3aWR0aDogMTUwcHg7XG4gICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgICBsaW5lLWhlaWdodDogNDBweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDE1cHg7XG4gICAgICBib3JkZXI6IDFweCBzb2xpZCAjY2NjO1xuICAgICAgZm9udC1zaXplOiAxMnB4O1xuICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbiAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgICAgZGlzcGxheTppbmxpbmUtYmxvY2s7XG4gICAgICBtYXJnaW4tcmlnaHQ6MTVweDtcbiAgICAgICAgfVxuICAgICAgLnNob3ctYnV0dG9uOmhvdmVyIHsgdGV4dC1kZWNvcmF0aW9uOm5vbmU7IGNvbG9yOiM1NTUgfVxuICAgICAgLnNob3ctYnV0dG9uLnNlbGVjdGVkIHtcbiAgICAgICAgYmFja2dyb3VuZDogI2UzZWJmMDtcbiAgICAgICAgY29sb3I6ICM1NTU7XG4gICAgICB9XG4gICAgKi99KVxuICBcbiAgICBkM191cGRhdGVhYmxlKGQzLnNlbGVjdChcImhlYWRcIiksXCJzdHlsZSNzaG93LWNzc1wiLFwic3R5bGVcIilcbiAgICAgIC5hdHRyKFwiaWRcIixcImhlYWRlci1jc3NcIilcbiAgICAgIC50ZXh0KENTU19TVFJJTkcucmVwbGFjZShcImZ1bmN0aW9uICgpIHsvKlwiLFwiXCIpLnJlcGxhY2UoXCIqL31cIixcIlwiKSlcbiAgXG4gICAgdmFyIG9wdGlvbnMgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmJ1dHRvbi1yYWRpby1yb3dcIixcImRpdlwiKVxuICAgICAgLmNsYXNzZWQoXCJidXR0b24tcmFkaW8tcm93XCIsdHJ1ZSlcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjM1cHhcIilcbiAgXG4gIFxuICAgIHZhciBidXR0b25fcm93ID0gZDNfdXBkYXRlYWJsZShvcHRpb25zLFwiLm9wdGlvbnMtdmlld1wiLFwiZGl2XCIsdGhpcy5kYXRhKCkpXG4gICAgICAuY2xhc3NlZChcIm9wdGlvbnMtdmlld1wiLHRydWUpXG5cbiAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwiY2xpY2tcIikuYmluZCh0aGlzKVxuICBcbiAgICBkM19zcGxhdChidXR0b25fcm93LFwiLnNob3ctYnV0dG9uXCIsXCJhXCIsaWRlbnRpdHksIGtleSlcbiAgICAgIC5jbGFzc2VkKFwic2hvdy1idXR0b25cIix0cnVlKVxuICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LnNlbGVjdGVkIH0pXG4gICAgICAudGV4dChrZXkpXG4gICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7IGJvdW5kKHgpIH0pXG5cbiAgICByZXR1cm4gdGhpc1xuICBcbiAgICB9XG4gIFxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBidXR0b25fcmFkaW8gZnJvbSAnLi4vZ2VuZXJpYy9idXR0b25fcmFkaW8nXG5pbXBvcnQgKiBhcyB0YWJsZSBmcm9tICd0YWJsZSdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cblxuZXhwb3J0IGZ1bmN0aW9uIE9wdGlvblZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBvcHRpb25fdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBPcHRpb25WaWV3KHRhcmdldClcbn1cblxuT3B0aW9uVmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBvcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwib3B0aW9uc1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5vcHRpb24td3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwib3B0aW9uLXdyYXBcIix0cnVlKVxuXG4gICAgICAvL2hlYWRlcih3cmFwKVxuICAgICAgLy8gIC50ZXh0KFwiQ2hvb3NlIFZpZXdcIilcbiAgICAgIC8vICAuZHJhdygpXG5cbiAgICAgIGJ1dHRvbl9yYWRpbyh3cmFwKVxuICAgICAgICAub24oXCJjbGlja1wiLCB0aGlzLm9uKFwic2VsZWN0XCIpIClcbiAgICAgICAgLmRhdGEodGhpcy5kYXRhKCkpXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG5cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCB7YXV0b1NpemUgYXMgYXV0b1NpemV9IGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQge3ByZXBEYXRhIGFzIHB9IGZyb20gJy4uL2hlbHBlcnMnO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJlcERhdGEoKSB7XG4gIHJldHVybiBwLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn07XG5cbnZhciBFWEFNUExFX0RBVEEgPSB7XG4gICAgXCJrZXlcIjogXCJCcm93c2luZyBiZWhhdmlvciBieSB0aW1lXCJcbiAgLCBcInZhbHVlc1wiOiBbXG4gICAgICB7ICBcbiAgICAgICAgICBcImtleVwiOiAxXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDJcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogMi4yNVxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAyLjVcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogM1xuICAgICAgICAsIFwidmFsdWVcIjogMTIzNFxuICAgICAgfVxuXG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogNFxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cblxuXG4gIF0gXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBUaW1lU2VyaWVzKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMuX2RhdGEgPSBFWEFNUExFX0RBVEFcbiAgdGhpcy5fb24gPSB7fVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0aW1lX3Nlcmllcyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBUaW1lU2VyaWVzKHRhcmdldClcbn1cblxuVGltZVNlcmllcy5wcm90b3R5cGUgPSB7XG5cbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbixmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCB0aXRsZTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH1cbiAgLCBoZWlnaHQ6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhlaWdodFwiLHZhbCkgfVxuXG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgd3JhcCA9IHRoaXMuX3RhcmdldFxuICAgICAgdmFyIGRlc2MgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudmVuZG9yLWRvbWFpbnMtYmFyLWRlc2NcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInZlbmRvci1kb21haW5zLWJhci1kZXNjXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMCVcIilcbiAgICAgICAgLmRhdHVtKHRoaXMuX2RhdGEpXG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZShkZXNjLFwiLndcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIndcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMCVcIilcblxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gIFxuICAgICAgXG5cbiAgICAgIHdyYXBwZXIuZWFjaChmdW5jdGlvbihyb3cpe1xuXG4gICAgICAgIHZhciBkYXRhID0gcm93LnZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy5rZXkgLSBwLmtleX0pXG4gICAgICAgICAgLCBjb3VudCA9IGRhdGEubGVuZ3RoO1xuXG5cbiAgICAgICAgdmFyIF9zaXplcyA9IGF1dG9TaXplKHdyYXBwZXIsZnVuY3Rpb24oZCl7cmV0dXJuIGQgLTEwfSwgZnVuY3Rpb24oZCl7cmV0dXJuIHNlbGYuX2hlaWdodCB8fCA2MCB9KSxcbiAgICAgICAgICBncmlkU2l6ZSA9IE1hdGguZmxvb3IoX3NpemVzLndpZHRoIC8gMjQgLyAzKTtcblxuICAgICAgICB2YXIgdmFsdWVBY2Nlc3NvciA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgfVxuICAgICAgICAgICwgdmFsdWVBY2Nlc3NvcjIgPSBmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlMiB9XG4gICAgICAgICAgLCBrZXlBY2Nlc3NvciA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH1cblxuICAgICAgICB2YXIgc3RlcHMgPSBBcnJheS5hcHBseShudWxsLCBBcnJheShjb3VudCkpLm1hcChmdW5jdGlvbiAoXywgaSkge3JldHVybiBpKzE7fSlcblxuICAgICAgICB2YXIgX2NvbG9ycyA9IFtcIiNmZmZmZDlcIixcIiNlZGY4YjFcIixcIiNjN2U5YjRcIixcIiM3ZmNkYmJcIixcIiM0MWI2YzRcIixcIiMxZDkxYzBcIixcIiMyMjVlYThcIixcIiMyNTM0OTRcIixcIiMwODFkNThcIl1cbiAgICAgICAgdmFyIGNvbG9ycyA9IF9jb2xvcnNcblxuICAgICAgICB2YXIgeCA9IGQzLnNjYWxlLm9yZGluYWwoKS5yYW5nZShzdGVwcylcbiAgICAgICAgICAsIHkgPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbX3NpemVzLmhlaWdodCwgMCBdKVxuXG5cbiAgICAgICAgdmFyIGNvbG9yU2NhbGUgPSBkMy5zY2FsZS5xdWFudGlsZSgpXG4gICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uIChkKSB7IHJldHVybiBkLmZyZXF1ZW5jeTsgfSldKVxuICAgICAgICAgIC5yYW5nZShjb2xvcnMpO1xuXG4gICAgICAgIHZhciBzdmdfd3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcInN2Z1wiLFwic3ZnXCIpXG4gICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBfc2l6ZXMud2lkdGggKyBfc2l6ZXMubWFyZ2luLmxlZnQgKyBfc2l6ZXMubWFyZ2luLnJpZ2h0KVxuICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIF9zaXplcy5oZWlnaHQgKyBfc2l6ZXMubWFyZ2luLnRvcCArIF9zaXplcy5tYXJnaW4uYm90dG9tKVxuXG4gICAgICAgIHZhciBzdmcgPSBkM19zcGxhdChzdmdfd3JhcCxcImdcIixcImdcIixmdW5jdGlvbih4KSB7cmV0dXJuIFt4LnZhbHVlc119LGZ1bmN0aW9uKF8saSkge3JldHVybiBpfSlcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIF9zaXplcy5tYXJnaW4ubGVmdCArIFwiLFwiICsgMCArIFwiKVwiKVxuXG4gICAgICAgIHguZG9tYWluKFswLDcyXSk7XG4gICAgICAgIHkuZG9tYWluKFswLCBkMy5tYXgoZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gTWF0aC5zcXJ0KHZhbHVlQWNjZXNzb3IoZCkpOyB9KV0pO1xuXG4gICAgICAgIHZhciBidWlsZEJhcnMgPSBmdW5jdGlvbihkYXRhLGtleUFjY2Vzc29yLHZhbHVlQWNjZXNzb3IseSxjKSB7XG5cbiAgICAgICAgICB2YXIgYmFycyA9IGQzX3NwbGF0KHN2ZywgXCIudGltaW5nLWJhclwiICsgYywgXCJyZWN0XCIsIGRhdGEsIGtleUFjY2Vzc29yKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRpbWluZy1iYXJcIiArIGMpXG4gICAgICAgICAgIFxuICAgICAgICAgIGJhcnNcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiAoKGtleUFjY2Vzc29yKGQpIC0gMSkgKiBncmlkU2l6ZSApOyB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBncmlkU2l6ZSAtIDEpXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24oZCkgeyBcbiAgICAgICAgICAgICAgcmV0dXJuIHkoTWF0aC5zcXJ0KCB2YWx1ZUFjY2Vzc29yKGQpICkpOyBcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIixcIiNhYWFcIilcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGNvbG9yU2NhbGUoIGtleUFjY2Vzc29yKHgpICsgYyApIHx8IFwiZ3JleVwiIH0gKVxuICAgICAgICAgICAgLy8uYXR0cihcInN0cm9rZVwiLFwid2hpdGVcIilcbiAgICAgICAgICAgIC8vLmF0dHIoXCJzdHJva2Utd2lkdGhcIixcIjFweFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gX3NpemVzLmhlaWdodCAtIHkoTWF0aC5zcXJ0KCB2YWx1ZUFjY2Vzc29yKGQpICkpOyB9KVxuICAgICAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiMVwiKVxuICAgICAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCl7IFxuICAgICAgICAgICAgICBzZWxmLm9uKFwiaG92ZXJcIikuYmluZCh0aGlzKSh4KVxuICAgICAgICAgICAgfSlcblxuICAgICAgICB9XG4gICAgICAgIFxuXG4gICAgICAgIGlmIChkYXRhICYmIGRhdGEubGVuZ3RoICYmIGRhdGFbMF0udmFsdWUyKSB7XG4gICAgICAgICAgdmFyICB5MiA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFtfc2l6ZXMuaGVpZ2h0LCAwIF0pXG4gICAgICAgICAgeTIuZG9tYWluKFswLCBkMy5tYXgoZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gTWF0aC5zcXJ0KHZhbHVlQWNjZXNzb3IyKGQpKTsgfSldKTtcbiAgICAgICAgICBidWlsZEJhcnMoZGF0YSxrZXlBY2Nlc3Nvcix2YWx1ZUFjY2Vzc29yMix5MixcIi0yXCIpXG4gICAgICAgIH1cblxuXG4gICAgICAgIGJ1aWxkQmFycyhkYXRhLGtleUFjY2Vzc29yLHZhbHVlQWNjZXNzb3IseSxcIlwiKVxuICAgICAgXG4gICAgXG4gICAgICB2YXIgeiA9IGQzLnRpbWUuc2NhbGUoKVxuICAgICAgICAucmFuZ2UoWzAsIGdyaWRTaXplKjI0KjNdKVxuICAgICAgICAubmljZShkMy50aW1lLmhvdXIsMjQpXG4gICAgICAgIFxuICAgIFxuICAgICAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKVxuICAgICAgICAuc2NhbGUoeilcbiAgICAgICAgLnRpY2tzKDMpXG4gICAgICAgIC50aWNrRm9ybWF0KGQzLnRpbWUuZm9ybWF0KFwiJUkgJXBcIikpO1xuICAgIFxuICAgICAgc3ZnLmFwcGVuZChcImdcIilcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwieCBheGlzXCIpXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCxcIiArIF9zaXplcy5oZWlnaHQgKyBcIilcIilcbiAgICAgICAgICAuY2FsbCh4QXhpcyk7XG5cblxuXG4gICAgICAgIFxuICAgICAgfSlcblxuXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfc3BsYXQsIGQzX3VwZGF0ZWFibGUsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGFidWxhckhlYWRlciBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLldJRFRIID0gMTQ0XG4gICAgdGhpcy5fbGFiZWwgPSBcIlVSTFwiXG4gICAgdGhpcy5faGVhZGVycyA9IFtcIjEyYW1cIiwgXCIxMnBtXCIsIFwiMTJhbVwiXVxuICAgIHRoaXMuX3hzID0gWzAsdGhpcy5XSURUSC8yLHRoaXMuV0lEVEhdXG4gICAgdGhpcy5fYW5jaG9ycyA9IFtcInN0YXJ0XCIsXCJtaWRkbGVcIixcImVuZFwiXVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJsYWJlbFwiLFwiaGVhZGVyc1wiXSB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBldWggPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJleHBhbnNpb24tdXJscy10aXRsZVwiKVxuXG4gICAgZDNfY2xhc3MoZXVoLFwidGl0bGVcIikudGV4dCh0aGlzLmxhYmVsKCkpXG4gICAgZDNfY2xhc3MoZXVoLFwidmlld1wiKS50ZXh0KFwiVmlld3NcIilcblxuICAgIHZhciBzdmdfbGVnZW5kID0gZDNfY2xhc3MoZXVoLFwibGVnZW5kXCIsXCJzdmdcIilcblxuICAgIGlmICh0aGlzLmhlYWRlcnMoKS5sZW5ndGggPT0gMikge1xuICAgICAgdGhpcy5feHMgPSBbdGhpcy5XSURUSC8yLXRoaXMuV0lEVEgvNCx0aGlzLldJRFRILzIrdGhpcy5XSURUSC80XVxuICAgICAgdGhpcy5fYW5jaG9ycyA9IFtcIm1pZGRsZVwiLFwibWlkZGxlXCJdXG4gICAgfVxuXG4gICAgZDNfc3BsYXQoc3ZnX2xlZ2VuZCxcInRleHRcIixcInRleHRcIix0aGlzLmhlYWRlcnMoKSwoeCxpKSA9PiB7IHJldHVybiBpIH0pXG4gICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAuYXR0cihcInhcIiwoeCxpKSA9PiB0aGlzLl94c1tpXSlcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsKHgsaSkgPT4gdGhpcy5fYW5jaG9yc1tpXSlcbiAgICAgIC50ZXh0KFN0cmluZylcblxuICAgIGQzX3NwbGF0KHN2Z19sZWdlbmQsXCJsaW5lXCIsXCJsaW5lXCIsdGhpcy5oZWFkZXJzKCksKHgsaSkgPT4geyByZXR1cm4gaSB9KVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAuYXR0cihcInkxXCIsIHRoaXMuaGVhZGVycygpLmxlbmd0aCA9PSAyID8gMCA6IDI1KVxuICAgICAgLmF0dHIoXCJ5MlwiLCAzNSlcbiAgICAgIC5hdHRyKFwieDFcIiwoeCxpKSA9PiB0aGlzLmhlYWRlcnMoKS5sZW5ndGggPT0gMiA/IHRoaXMuV0lEVEgvMiA6IHRoaXMuX3hzW2ldKVxuICAgICAgLmF0dHIoXCJ4MlwiLCh4LGkpID0+IHRoaXMuaGVhZGVycygpLmxlbmd0aCA9PSAyID8gdGhpcy5XSURUSC8yIDogdGhpcy5feHNbaV0pXG5cbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIHNpbXBsZVRpbWVzZXJpZXModGFyZ2V0LGRhdGEsdyxoLG1pbikge1xuICB2YXIgd2lkdGggPSB3IHx8IDEyMFxuICAgICwgaGVpZ2h0ID0gaCB8fCAzMFxuXG4gIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpLmRvbWFpbihkMy5yYW5nZSgwLGRhdGEubGVuZ3RoKSkucmFuZ2UoZDMucmFuZ2UoMCx3aWR0aCx3aWR0aC9kYXRhLmxlbmd0aCkpXG4gIHZhciB5ID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoWzQsaGVpZ2h0XSkuZG9tYWluKFttaW4gfHwgZDMubWluKGRhdGEpLGQzLm1heChkYXRhKV0pXG5cbiAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImdcIixcImdcIixkYXRhLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gMX0pXG5cbiAgZDNfc3BsYXQod3JhcCxcInJlY3RcIixcInJlY3RcIix4ID0+IHgsICh4LGkpID0+IGkpXG4gICAgLmF0dHIoXCJ4XCIsKHosaSkgPT4geChpKSlcbiAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoL2RhdGEubGVuZ3RoIC0xLjIpXG4gICAgLmF0dHIoXCJ5XCIsIHogPT4gaGVpZ2h0IC0geSh6KSApXG4gICAgLmF0dHIoXCJoZWlnaHRcIiwgeiA9PiB6ID8geSh6KSA6IDApXG5cbiAgcmV0dXJuIHdyYXBcblxufVxuIiwiaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICcuL3NpbXBsZV90aW1lc2VyaWVzJ1xuaW1wb3J0IHtkM19jbGFzcywgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gYmVmb3JlX2FmdGVyX3RpbWVzZXJpZXModGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQmVmb3JlQWZ0ZXJUaW1lc2VyaWVzKHRhcmdldClcbn1cblxuY2xhc3MgQmVmb3JlQWZ0ZXJUaW1lc2VyaWVzIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcblxuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gICAgdGhpcy5fd3JhcHBlcl9jbGFzcyA9IFwiYmEtdGltZXNlcmllcy13cmFwXCJcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiLFwiYmVmb3JlXCIsXCJhZnRlclwiLFwid3JhcHBlcl9jbGFzc1wiXSB9XG5cbiAgZHJhdygpIHtcblxuICAgIGNvbnN0IHRzdyA9IDI1MFxuICAgICAgLCB1bml0X3NpemUgPSB0c3cvdGhpcy5kYXRhKCkubGVuZ3RoXG4gICAgICAsIGJlZm9yZV9wb3MgPSB0aGlzLmJlZm9yZSgpXG4gICAgICAsIGFmdGVyX3BvcyA9IHRoaXMuYWZ0ZXIoKVxuXG5cbiAgICBjb25zdCB0aW1lc2VyaWVzID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LHRoaXMud3JhcHBlcl9jbGFzcygpLFwic3ZnXCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJibG9ja1wiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCJhdXRvXCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIzMHB4XCIpXG4gICAgICAuYXR0cihcIndpZHRoXCIsdHN3ICsgXCJweFwiKVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIixcIjcwcHhcIilcblxuICAgIHNpbXBsZVRpbWVzZXJpZXModGltZXNlcmllcyx0aGlzLmRhdGEoKSx0c3cpXG5cbiAgICAvLyBhZGQgZGVjb3JhdGlvbnNcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJtaWRkbGVcIixcImxpbmVcIilcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgICAgLmF0dHIoXCJ5MlwiLCA1NSlcbiAgICAgIC5hdHRyKFwieDFcIiwgdHN3LzIpXG4gICAgICAuYXR0cihcIngyXCIsIHRzdy8yKVxuXG4gICAgZDNfY2xhc3ModGltZXNlcmllcyxcIm1pZGRsZS10ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInhcIiwgdHN3LzIpXG4gICAgICAuYXR0cihcInlcIiwgNjcpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAudGV4dChcIk9uLXNpdGVcIilcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJiZWZvcmVcIixcImxpbmVcIilcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgLmF0dHIoXCJ5MVwiLCAzOSlcbiAgICAgIC5hdHRyKFwieTJcIiwgNDUpXG4gICAgICAuYXR0cihcIngxXCIsIHVuaXRfc2l6ZSpiZWZvcmVfcG9zKVxuICAgICAgLmF0dHIoXCJ4MlwiLCB1bml0X3NpemUqYmVmb3JlX3BvcylcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJiZWZvcmUtdGV4dFwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ4XCIsIHVuaXRfc2l6ZSpiZWZvcmVfcG9zIC0gOClcbiAgICAgIC5hdHRyKFwieVwiLCA0OClcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC50ZXh0KFwiQ29uc2lkZXJhdGlvblwiKVxuXG4gICAgZDNfY2xhc3ModGltZXNlcmllcyxcIndpbmRvd1wiLFwibGluZVwiKVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAuYXR0cihcInkxXCIsIDQ1KVxuICAgICAgLmF0dHIoXCJ5MlwiLCA0NSlcbiAgICAgIC5hdHRyKFwieDFcIiwgdW5pdF9zaXplKihiZWZvcmVfcG9zKSlcbiAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkrMSlcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJhZnRlclwiLFwibGluZVwiKVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAuYXR0cihcInkxXCIsIDM5KVxuICAgICAgLmF0dHIoXCJ5MlwiLCA0NSlcbiAgICAgIC5hdHRyKFwieDFcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkpXG4gICAgICAuYXR0cihcIngyXCIsIHVuaXRfc2l6ZSooYWZ0ZXJfcG9zKzEpKVxuXG4gICAgZDNfY2xhc3ModGltZXNlcmllcyxcImFmdGVyLXRleHRcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwieFwiLCB1bml0X3NpemUqKGFmdGVyX3BvcysxKSArIDgpXG4gICAgICAuYXR0cihcInlcIiwgNDgpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwic3RhcnRcIilcbiAgICAgIC50ZXh0KFwiVmFsaWRhdGlvblwiKVxuXG5cblxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG59XG5cblxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIHNpbXBsZUJhcih3cmFwLHZhbHVlLHNjYWxlLGNvbG9yKSB7XG5cbiAgdmFyIGhlaWdodCA9IDIwXG4gICAgLCB3aWR0aCA9IHdyYXAuc3R5bGUoXCJ3aWR0aFwiKS5yZXBsYWNlKFwicHhcIixcIlwiKVxuXG4gIHZhciBjYW52YXMgPSBkM191cGRhdGVhYmxlKHdyYXAsXCJzdmdcIixcInN2Z1wiLFt2YWx1ZV0sZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLHdpZHRoK1wicHhcIilcbiAgICAuc3R5bGUoXCJoZWlnaHRcIixoZWlnaHQrXCJweFwiKVxuXG4gIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxIH0pXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnRcIilcbiAgXG4gIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4LGkpIHsgcmV0dXJuIGkgfSlcbiAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTQpXG4gICAgLmF0dHIoeyd4JzowLCd5JzowfSlcbiAgICAuc3R5bGUoJ2ZpbGwnLGNvbG9yKVxuICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiBzY2FsZSh4KSB9KVxuXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBkb21haW5fYnVsbGV0KHRhcmdldCkge1xuICByZXR1cm4gbmV3IERvbWFpbkJ1bGxldCh0YXJnZXQpXG59XG5cbi8vIGRhdGEgc2NoZW1hOiBbe3BvcF9wZXJjZW50LCBzYW1wbGVfcGVyY2VudF9ub3JtfVxuXG5jbGFzcyBEb21haW5CdWxsZXQgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbiAgfVxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIixcIm1heFwiXSB9XG5cbiAgZHJhdygpIHtcbiAgICB2YXIgd2lkdGggPSAodGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKS5yZXBsYWNlKFwicHhcIixcIlwiKSB8fCB0aGlzLm9mZnNldFdpZHRoKSAtIDUwXG4gICAgICAsIGhlaWdodCA9IDI4O1xuXG4gICAgdmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLnJhbmdlKFswLCB3aWR0aF0pXG4gICAgICAuZG9tYWluKFswLCB0aGlzLm1heCgpXSlcblxuICAgIGlmICh0aGlzLnRhcmdldC50ZXh0KCkpIHRoaXMudGFyZ2V0LnRleHQoXCJcIilcblxuICAgIHZhciBidWxsZXQgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmJ1bGxldFwiLFwiZGl2XCIsdGhpcy5kYXRhKCksZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmNsYXNzZWQoXCJidWxsZXRcIix0cnVlKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiM3B4XCIpXG5cbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZShidWxsZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLHdpZHRoKVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIixoZWlnaHQpXG4gIFxuICAgXG4gICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTFcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiYmFyLTFcIix0cnVlKVxuICAgICAgLmF0dHIoXCJ4XCIsMClcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24oZCkge3JldHVybiB4KGQucG9wX3BlcmNlbnQpIH0pXG4gICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG4gICAgICAuYXR0cihcImZpbGxcIixcIiM4ODhcIilcbiAgXG4gICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTJcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiYmFyLTJcIix0cnVlKVxuICAgICAgLmF0dHIoXCJ4XCIsMClcbiAgICAgIC5hdHRyKFwieVwiLGhlaWdodC80KVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbihkKSB7cmV0dXJuIHgoZC5zYW1wbGVfcGVyY2VudF9ub3JtKSB9KVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0LzIpXG4gICAgICAuYXR0cihcImZpbGxcIixcInJnYig4LCAyOSwgODgpXCIpXG5cbiAgICByZXR1cm4gdGhpcyBcbiAgfVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfc3BsYXQsIGQzX3VwZGF0ZWFibGUsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnY2hhcnQnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRhYnVsYXJCb2R5IGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJzcGxpdFwiXSB9XG5cbiAgZHJhdygpIHtcbiAgICBsZXQgZXhwYW5zaW9uX3JvdyA9IHRoaXMuX3RhcmdldFxuXG4gICAgdmFyIGV4cGFuc2lvbiA9IGQzX2NsYXNzKGV4cGFuc2lvbl9yb3csXCJleHBhbnNpb24tdXJsc1wiKVxuICAgICAgICAuY2xhc3NlZChcInNjcm9sbGJveFwiLHRydWUpXG5cbiAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG4gICAgdmFyIHVybF9yb3cgPSBkM19zcGxhdChleHBhbnNpb24sXCIudXJsLXJvd1wiLFwiZGl2XCIsdGhpcy5kYXRhKCkuc2xpY2UoMCw1MDApLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuY2xhc3NlZChcInVybC1yb3dcIix0cnVlKVxuXG4gICAgdmFyIHVybF9uYW1lID0gZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm5hbWVcIixcImRpdlwiKS5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG5cbiAgICBkM191cGRhdGVhYmxlKHVybF9uYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAuYXR0cihcInR5cGVcIixcImNoZWNrYm94XCIpXG4gICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgIH0pXG5cbiAgICBkM19jbGFzcyh1cmxfbmFtZSxcInVybFwiLFwiYVwiKVxuICAgICAgLnRleHQoeCA9PiB7IHJldHVybiB0aGlzLnNwbGl0KCkgPyB4LmtleS5zcGxpdCh0aGlzLnNwbGl0KCkpWzFdIHx8IHgua2V5IDogeC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiaHJlZlwiLCB4ID0+IHgudXJsID8geC51cmwgOiB1bmRlZmluZWQgKVxuICAgICAgLmF0dHIoXCJ0YXJnZXRcIiwgXCJfYmxhbmtcIilcblxuICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5udW1iZXJcIixcImRpdlwiKS5jbGFzc2VkKFwibnVtYmVyXCIsdHJ1ZSlcbiAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG90YWwgfSlcblxuXG4gICAgZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLnBsb3RcIixcInN2Z1wiKS5jbGFzc2VkKFwicGxvdFwiLHRydWUpXG4gICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICB2YXIgdmFsdWVzID0geC52YWx1ZXMgfHwgeC52YWx1ZVxuICAgICAgICBzaW1wbGVUaW1lc2VyaWVzKGR0aGlzLHZhbHVlcywxNDQsMjApXG4gICAgICB9KVxuXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3NwbGF0LCBkM191cGRhdGVhYmxlLCBhY2Nlc3NvciwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IFRhYnVsYXJIZWFkZXIgZnJvbSAnLi9oZWFkZXInXG5pbXBvcnQgVGFidWxhckJvZHkgZnJvbSAnLi9ib2R5J1xuXG5pbXBvcnQgJy4vdGFidWxhcl90aW1lc2VyaWVzLmNzcydcblxuZXhwb3J0IGZ1bmN0aW9uIHRhYnVsYXJfdGltZXNlcmllcyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBUYWJ1bGFyVGltZXNlcmllcyh0YXJnZXQpXG59XG5cbmNsYXNzIFRhYnVsYXJUaW1lc2VyaWVzIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuX2hlYWRlcnMgPSBbXCIxMmFtXCIsXCIxMnBtXCIsXCIxMmFtXCJdXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIixcImxhYmVsXCIsXCJzcGxpdFwiLFwiaGVhZGVyc1wiXSB9XG5cbiAgZHJhdygpIHtcbiAgICBsZXQgdGQgPSB0aGlzLl90YXJnZXRcblxuICAgIHZhciB0aXRsZV9yb3cgPSBkM19jbGFzcyh0ZCxcInRpdGxlLXJvd1wiKVxuICAgIHZhciBleHBhbnNpb25fcm93ID0gZDNfY2xhc3ModGQsXCJleHBhbnNpb24tcm93XCIpXG5cbiAgICB2YXIgaGVhZGVyID0gKG5ldyBUYWJ1bGFySGVhZGVyKHRpdGxlX3JvdykpXG4gICAgICAubGFiZWwodGhpcy5sYWJlbCgpKVxuICAgICAgLmhlYWRlcnModGhpcy5oZWFkZXJzKCkpXG4gICAgICAuZHJhdygpXG5cbiAgICB2YXIgYm9keSA9IChuZXcgVGFidWxhckJvZHkoZXhwYW5zaW9uX3JvdykpXG4gICAgICAuZGF0YSh0aGlzLmRhdGEoKSlcbiAgICAgIC5zcGxpdCh0aGlzLnNwbGl0KCkgfHwgZmFsc2UpXG4gICAgICAuZHJhdygpXG5cbiAgfVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfc3BsYXQsIGQzX3VwZGF0ZWFibGUsIGFjY2Vzc29yLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgJy4vZG9tYWluX2V4cGFuZGVkLmNzcydcblxuaW1wb3J0IHt0YWJ1bGFyX3RpbWVzZXJpZXN9IGZyb20gJy4vdGFidWxhcl90aW1lc2VyaWVzL2luZGV4J1xuXG5leHBvcnQgbGV0IGFsbGJ1Y2tldHMgPSBbXVxuZXhwb3J0IGNvbnN0IGhvdXJidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkubWFwKHggPT4gU3RyaW5nKHgpLmxlbmd0aCA+IDEgPyBTdHJpbmcoeCkgOiBcIjBcIiArIHgpXG5cbnZhciBtaW51dGVzID0gWzAsMjAsNDBdXG5leHBvcnQgY29uc3QgYnVja2V0cyA9IGQzLnJhbmdlKDAsMjQpLnJlZHVjZSgocCxjKSA9PiB7XG4gIG1pbnV0ZXMubWFwKHggPT4ge1xuICAgIHBbYyArIFwiOlwiICsgeF0gPSAwXG4gIH0pXG4gIGFsbGJ1Y2tldHMgPSBhbGxidWNrZXRzLmNvbmNhdChtaW51dGVzLm1hcCh6ID0+IGMgKyBcIjpcIiArIHopKVxuICByZXR1cm4gcFxufSx7fSlcblxuXG5leHBvcnQgY29uc3QgU1RPUFdPUkRTID0gW1widGhhdFwiLFwidGhpc1wiLFwid2hhdFwiLFwiYmVzdFwiLFwibW9zdFwiLFwiZnJvbVwiLFwieW91clwiLFwiaGF2ZVwiLFwiZmlyc3RcIixcIndpbGxcIixcInRoYW5cIixcInNheXNcIixcImxpa2VcIixcImludG9cIixcImFmdGVyXCIsXCJ3aXRoXCJdXG5cbmZ1bmN0aW9uIHJhd1RvVXJsKGRhdGEpIHtcbiAgcmV0dXJuIGRhdGEucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIHBbYy51cmxdID0gcFtjLnVybF0gfHwgT2JqZWN0LmFzc2lnbih7fSxidWNrZXRzKVxuICAgICAgcFtjLnVybF1bYy5ob3VyXSA9IChwW2MudXJsXVtjLmhvdXJdIHx8IDApICsgYy5jb3VudFxuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KVxufVxuXG5mdW5jdGlvbiB1cmxUb0RyYXcodXJscykge1xuICB2YXIgb2JqID0ge31cbiAgT2JqZWN0LmtleXModXJscykubWFwKGsgPT4ge1xuICAgIG9ialtrXSA9IGhvdXJidWNrZXRzLm1hcChiID0+IHVybHNba11bYl0gfHwgMClcbiAgfSlcblxuICByZXR1cm4gZDMuZW50cmllcyhvYmopXG4gICAgLm1hcChmdW5jdGlvbih4KXtcbiAgICAgIHgudXJsID0geC5rZXlcbiAgICAgIHgudG90YWwgPSBkMy5zdW0oeC52YWx1ZSlcbiAgICAgIHJldHVybiB4XG4gICAgfSkgXG59XG5cbmZ1bmN0aW9uIGRyYXdUb0tleXdvcmQoZHJhdyxzcGxpdCkge1xuICBsZXQgb2JqID0gZHJhd1xuICAgIC5yZWR1Y2UoZnVuY3Rpb24ocCxjKXtcbiAgICAgIGMua2V5LnRvTG93ZXJDYXNlKCkuc3BsaXQoc3BsaXQpWzFdLnNwbGl0KFwiL1wiKS5yZXZlcnNlKClbMF0ucmVwbGFjZShcIl9cIixcIi1cIikuc3BsaXQoXCItXCIpLm1hcCh4ID0+IHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IFNUT1BXT1JEU1xuICAgICAgICBpZiAoeC5tYXRjaCgvXFxkKy9nKSA9PSBudWxsICYmIHZhbHVlcy5pbmRleE9mKHgpID09IC0xICYmIHguaW5kZXhPZihcIixcIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiP1wiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCIuXCIpID09IC0xICYmIHguaW5kZXhPZihcIjpcIikgPT0gLTEgJiYgcGFyc2VJbnQoeCkgIT0geCAmJiB4Lmxlbmd0aCA+IDMpIHtcbiAgICAgICAgICBwW3hdID0gcFt4XSB8fCB7fVxuICAgICAgICAgIE9iamVjdC5rZXlzKGMudmFsdWUpLm1hcChxID0+IHsgcFt4XVtxXSA9IChwW3hdW3FdIHx8IDApICsgKGMudmFsdWVbcV0gfHwgMCkgfSlcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KSBcblxuICByZXR1cm4gZDMuZW50cmllcyhvYmopXG4gICAgLm1hcCh4ID0+IHtcbiAgICAgIHgudmFsdWVzID0gT2JqZWN0LmtleXMoeC52YWx1ZSkubWFwKHogPT4geC52YWx1ZVt6XSB8fCAwKVxuICAgICAgeC50b3RhbCA9IGQzLnN1bSh4LnZhbHVlcylcbiAgICAgIHJldHVybiB4XG4gICAgfSlcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gZG9tYWluX2V4cGFuZGVkKHRhcmdldCkge1xuICByZXR1cm4gbmV3IERvbWFpbkV4cGFuZGVkKHRhcmdldClcbn1cblxuY2xhc3MgRG9tYWluRXhwYW5kZWQgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcInJhd1wiLFwiZGF0YVwiLFwidXJsc1wiLFwiZG9tYWluXCJdIH1cblxuICBkcmF3KCkge1xuICAgIGxldCB0ZCA9IHRoaXMuX3RhcmdldFxuXG4gICAgZDNfY2xhc3ModGQsXCJhY3Rpb24taGVhZGVyXCIpXG4gICAgICAudGV4dChcIkV4cGxvcmUgYW5kIFJlZmluZVwiKVxuXG4gICAgbGV0IHVybERhdGEgPSByYXdUb1VybCh0aGlzLnJhdygpKVxuICAgIGxldCB0b19kcmF3ID0gdXJsVG9EcmF3KHVybERhdGEpXG4gICAgbGV0IGt3X3RvX2RyYXcgPSBkcmF3VG9LZXl3b3JkKHRvX2RyYXcsdGhpcy5kb21haW4oKSlcblxuICAgIHRhYnVsYXJfdGltZXNlcmllcyhkM19jbGFzcyh0ZCxcInVybC1kZXB0aFwiKSlcbiAgICAgIC5sYWJlbChcIlVSTFwiKVxuICAgICAgLmRhdGEodG9fZHJhdylcbiAgICAgIC5zcGxpdCh0aGlzLmRvbWFpbigpKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdGFidWxhcl90aW1lc2VyaWVzKGQzX2NsYXNzKHRkLFwia3ctZGVwdGhcIikpXG4gICAgICAubGFiZWwoXCJLZXl3b3Jkc1wiKVxuICAgICAgLmRhdGEoa3dfdG9fZHJhdylcbiAgICAgIC5kcmF3KClcbiAgICAgICAgXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3NwbGF0LCBkM191cGRhdGVhYmxlLCBhY2Nlc3NvciwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0ICcuL3ZlcnRpY2FsX29wdGlvbi5jc3MnXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHZlcnRpY2FsX29wdGlvbih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBWZXJ0aWNhbE9wdGlvbih0YXJnZXQpXG59XG5cbi8vW3trZXksIHZhbHVlLCBzZWxlY3RlZH0sLi4uXVxuXG5jbGFzcyBWZXJ0aWNhbE9wdGlvbiBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vcHRpb25zID0gW11cbiAgICB0aGlzLl93cmFwcGVyX2NsYXNzID0gXCJ2ZXJ0aWNhbC1vcHRpb25zXCJcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wib3B0aW9uc1wiLFwid3JhcHBlcl9jbGFzc1wiXSB9XG5cbiAgZHJhdygpIHtcbiAgICB2YXIgb3B0cyA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCx0aGlzLndyYXBwZXJfY2xhc3MoKSxcImRpdlwiLHRoaXMub3B0aW9ucygpKVxuICAgICAgXG4gICAgIGQzX3NwbGF0KG9wdHMsXCIuc2hvdy1idXR0b25cIixcImFcIix0aGlzLm9wdGlvbnMoKSx4ID0+IHgua2V5KVxuICAgICAgLmNsYXNzZWQoXCJzaG93LWJ1dHRvblwiLHRydWUpXG4gICAgICAuY2xhc3NlZChcInNlbGVjdGVkXCIseCA9PiB4LnNlbGVjdGVkKVxuICAgICAgLnRleHQoeCA9PiB4LmtleSlcbiAgICAgIC5vbihcImNsaWNrXCIsdGhpcy5vbihcImNsaWNrXCIpICkgXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCB7cHJlcERhdGF9IGZyb20gJy4uL2dlbmVyaWMvdGltZXNlcmllcydcblxuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtkb21haW5fZXhwYW5kZWR9IGZyb20gJ2NvbXBvbmVudCdcbmltcG9ydCB7ZG9tYWluX2J1bGxldH0gZnJvbSAnY2hhcnQnXG5cblxuZXhwb3J0IGNsYXNzIERvbWFpblZpZXcgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIiwgXCJvcHRpb25zXCIsIFwic29ydFwiLCBcImFzY2VuZGluZ1wiXSB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgdmFyIF9leHBsb3JlID0gdGhpcy5fdGFyZ2V0XG4gICAgICAsIHRhYnMgPSB0aGlzLm9wdGlvbnMoKVxuICAgICAgLCBkYXRhID0gdGhpcy5kYXRhKClcbiAgICAgICwgZmlsdGVyZWQgPSB0YWJzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHguc2VsZWN0ZWR9KVxuICAgICAgLCBzZWxlY3RlZCA9IGZpbHRlcmVkLmxlbmd0aCA/IGZpbHRlcmVkWzBdIDogdGFic1swXVxuXG4gICAgY29uc3QgaGVhZGVycyA9IFtcbiAgICAgICAgICB7a2V5Olwia2V5XCIsdmFsdWU6IHNlbGVjdGVkLmtleS5yZXBsYWNlKFwiVG9wIFwiLFwiXCIpLGxvY2tlZDp0cnVlLHdpZHRoOlwiMjAwcHhcIn1cbiAgICAgICAgLCB7a2V5Olwic2FtcGxlX3BlcmNlbnRcIix2YWx1ZTpcIlNlZ21lbnRcIixzZWxlY3RlZDpmYWxzZX1cbiAgICAgICAgLCB7a2V5OlwicmVhbF9wb3BfcGVyY2VudFwiLHZhbHVlOlwiQmFzZWxpbmVcIixzZWxlY3RlZDpmYWxzZX1cbiAgICAgICAgLCB7a2V5OlwicmF0aW9cIix2YWx1ZTpcIlJhdGlvXCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICwge2tleTpcImltcG9ydGFuY2VcIix2YWx1ZTpcIkltcG9ydGFuY2VcIixzZWxlY3RlZDpmYWxzZX1cbiAgICAgICAgLCB7a2V5OlwidmFsdWVcIix2YWx1ZTpcIlNlZ21lbnQgdmVyc3VzIEJhc2VsaW5lXCIsbG9ja2VkOnRydWV9XG4gICAgICBdLy8uZmlsdGVyKCh4KSA9PiAhIXNlbGVjdGVkLnZhbHVlc1swXVt4LmtleV0pXG5cbiAgICBjb25zdCBzYW1wX21heCA9IGQzLm1heChzZWxlY3RlZC52YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHguc2FtcGxlX3BlcmNlbnRfbm9ybX0pXG4gICAgICAsIHBvcF9tYXggPSBkMy5tYXgoc2VsZWN0ZWQudmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnBvcF9wZXJjZW50fSlcbiAgICAgICwgbWF4ID0gTWF0aC5tYXgoc2FtcF9tYXgscG9wX21heCk7XG5cblxuICAgIGNvbnN0IF9kZWZhdWx0ID0gXCJpbXBvcnRhbmNlXCJcbiAgICBjb25zdCBzID0gdGhpcy5zb3J0KCkgXG4gICAgY29uc3QgYXNjID0gdGhpcy5hc2NlbmRpbmcoKSBcblxuXG4gICAgY29uc3Qgc2VsZWN0ZWRIZWFkZXIgPSBoZWFkZXJzLmZpbHRlcih4ID0+IHgua2V5ID09IHMpXG4gICAgY29uc3Qgc29ydGJ5ID0gc2VsZWN0ZWRIZWFkZXIubGVuZ3RoID8gc2VsZWN0ZWRIZWFkZXJbMF0ua2V5IDogX2RlZmF1bHRcblxuXG5cbiAgICBoZWFkZXIoX2V4cGxvcmUpXG4gICAgICAudGV4dChzZWxlY3RlZC5rZXkgKVxuICAgICAgLm9wdGlvbnModGFicylcbiAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KSB7IHRoaXMub24oXCJzZWxlY3RcIikoeCkgfS5iaW5kKHRoaXMpKVxuICAgICAgLmRyYXcoKVxuXG4gICAgX2V4cGxvcmUuc2VsZWN0QWxsKFwiLnZlbmRvci1kb21haW5zLWJhci1kZXNjXCIpLnJlbW92ZSgpXG4gICAgX2V4cGxvcmUuZGF0dW0oZGF0YSlcblxuICAgIHZhciB0ID0gdGFibGUoX2V4cGxvcmUpXG4gICAgICAudG9wKDE0MClcbiAgICAgIC5kYXRhKHNlbGVjdGVkKVxuICAgICAgLmhlYWRlcnMoIGhlYWRlcnMpXG4gICAgICAuc29ydChzb3J0YnksYXNjKVxuICAgICAgLm9uKFwic29ydFwiLCB0aGlzLm9uKFwic29ydFwiKSlcbiAgICAgIC5vcHRpb25fdGV4dChcIiYjNjUyOTE7XCIpXG4gICAgICAub24oXCJleHBhbmRcIixmdW5jdGlvbihkLHRkKSB7XG5cbiAgICAgICAgdmFyIGRkID0gdGhpcy5wYXJlbnRFbGVtZW50Ll9fZGF0YV9fLmZ1bGxfdXJscy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5kb21haW4gPT0gZC5rZXl9KVxuICAgICAgICB2YXIgcm9sbGVkID0gcHJlcERhdGEoZGQpXG4gICAgICAgIFxuICAgICAgICBkb21haW5fZXhwYW5kZWQodGQpXG4gICAgICAgICAgLmRvbWFpbihkZFswXS5kb21haW4pXG4gICAgICAgICAgLnJhdyhkZClcbiAgICAgICAgICAuZGF0YShyb2xsZWQpXG4gICAgICAgICAgLnVybHMoZC51cmxzKVxuICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgIH0pXG4gICAgICAuaGlkZGVuX2ZpZWxkcyhbXCJ1cmxzXCIsXCJwZXJjZW50X3VuaXF1ZVwiLFwic2FtcGxlX3BlcmNlbnRfbm9ybVwiLFwicG9wX3BlcmNlbnRcIixcInRmX2lkZlwiLFwicGFyZW50X2NhdGVnb3J5X25hbWVcIl0pXG4gICAgICAucmVuZGVyKFwicmF0aW9cIixmdW5jdGlvbihkKSB7XG4gICAgICAgIHRoaXMuaW5uZXJUZXh0ID0gTWF0aC50cnVuYyh0aGlzLnBhcmVudE5vZGUuX19kYXRhX18ucmF0aW8qMTAwKS8xMDAgKyBcInhcIlxuICAgICAgfSlcbiAgICAgIC5yZW5kZXIoXCJ2YWx1ZVwiLGZ1bmN0aW9uKGQpIHtcblxuICAgICAgICBkb21haW5fYnVsbGV0KGQzLnNlbGVjdCh0aGlzKSlcbiAgICAgICAgICAubWF4KG1heClcbiAgICAgICAgICAuZGF0YSh0aGlzLnBhcmVudE5vZGUuX19kYXRhX18pXG4gICAgICAgICAgLmRyYXcoKVxuXG4gICAgICB9KVxuICAgICAgXG4gICAgdC5kcmF3KClcbiAgICBcblxuICAgIHJldHVybiB0aGlzXG5cbiAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRvbWFpbl92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IERvbWFpblZpZXcodGFyZ2V0KVxufVxuXG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXMsIHNpbXBsZUJhcn0gZnJvbSAnY2hhcnQnXG5cbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIFNlZ21lbnRWaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzZWdtZW50X3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU2VnbWVudFZpZXcodGFyZ2V0KVxufVxuXG5TZWdtZW50Vmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBzZWdtZW50czogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlZ21lbnRzXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5zZWdtZW50LXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNlZ21lbnQtd3JhcFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIix0aGlzLnRhcmdldC5zdHlsZShcIndpZHRoXCIpKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcbiAgICAgICAgLnN0eWxlKFwiei1pbmRleFwiLFwiMzAwXCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmMGY0ZjdcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLnNlZ21lbnQtd3JhcC1zcGFjZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNlZ21lbnQtd3JhcC1zcGFjZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIix3cmFwLnN0eWxlKFwiaGVpZ2h0XCIpKVxuXG5cbiAgICAgIGhlYWRlcih3cmFwKVxuICAgICAgICAuYnV0dG9ucyhbXG4gICAgICAgICAgICB7Y2xhc3M6IFwic2F2ZWQtc2VhcmNoXCIsIGljb246IFwiZmEtZm9sZGVyLW9wZW4tbyBmYVwiLCB0ZXh0OiBcIk9wZW4gU2F2ZWRcIn1cbiAgICAgICAgICAsIHtjbGFzczogXCJuZXctc2F2ZWQtc2VhcmNoXCIsIGljb246IFwiZmEtYm9va21hcmsgZmFcIiwgdGV4dDogXCJTYXZlXCJ9XG4gICAgICAgICAgLCB7Y2xhc3M6IFwiY3JlYXRlXCIsIGljb246IFwiZmEtcGx1cy1jaXJjbGUgZmFcIiwgdGV4dDogXCJOZXcgU2VnbWVudFwifVxuICAgICAgICAgICwge2NsYXNzOiBcImxvZ291dFwiLCBpY29uOiBcImZhLXNpZ24tb3V0IGZhXCIsIHRleHQ6IFwiTG9nb3V0XCJ9XG4gICAgICAgIF0pXG4gICAgICAgIC5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiLCB0aGlzLm9uKFwic2F2ZWQtc2VhcmNoLmNsaWNrXCIpKVxuICAgICAgICAub24oXCJsb2dvdXQuY2xpY2tcIiwgZnVuY3Rpb24oKSB7IHdpbmRvdy5sb2NhdGlvbiA9IFwiL2xvZ291dFwiIH0pXG4gICAgICAgIC5vbihcImNyZWF0ZS5jbGlja1wiLCBmdW5jdGlvbigpIHsgd2luZG93LmxvY2F0aW9uID0gXCIvc2VnbWVudHNcIiB9KVxuICAgICAgICAub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIsIHRoaXMub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIpKVxuICAgICAgICAudGV4dChcIlNlZ21lbnRcIikuZHJhdygpICAgICAgXG5cblxuICAgICAgd3JhcC5zZWxlY3RBbGwoXCIuaGVhZGVyLWJvZHlcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwhdGhpcy5faXNfbG9hZGluZylcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIi00MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIm5vbmVcIilcbiAgICAgICAgLmh0bWwoXCI8aW1nIHNyYz0nL3N0YXRpYy9pbWcvZ2VuZXJhbC9sb2dvLXNtYWxsLmdpZicgc3R5bGU9J2hlaWdodDoxNXB4Jy8+IGxvYWRpbmcuLi5cIilcblxuXG4gICAgICBpZiAodGhpcy5fZGF0YSA9PSBmYWxzZSkgcmV0dXJuXG5cbiAgICAgIHZhciBib2R5ID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmJvZHlcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJvZHlcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJjbGVhclwiLFwiYm90aFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcImZsZXgtZGlyZWN0aW9uXCIsXCJjb2x1bW5cIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMzBweFwiKVxuICAgICAgICBcblxuICAgICAgdmFyIHJvdzEgPSBkM191cGRhdGVhYmxlKGJvZHksXCIucm93LTFcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInJvdy0xXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLDEpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleC1kaXJlY3Rpb25cIixcInJvd1wiKVxuXG4gICAgICB2YXIgcm93MiA9IGQzX3VwZGF0ZWFibGUoYm9keSxcIi5yb3ctMlwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicm93LTJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsMSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4LWRpcmVjdGlvblwiLFwicm93XCIpXG5cblxuICAgICAgdmFyIGlubmVyID0gZDNfdXBkYXRlYWJsZShyb3cxLFwiLmFjdGlvbi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgYWN0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICB2YXIgaW5uZXJfZGVzYyA9IGQzX3VwZGF0ZWFibGUocm93MSxcIi5hY3Rpb24uaW5uZXItZGVzY1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXItZGVzYyBhY3Rpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMHB4XCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcixcImgzXCIsXCJoM1wiKVxuICAgICAgICAudGV4dChcIkNob29zZSBTZWdtZW50XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyLFwiZGl2LmNvbG9yXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb2xvclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiMwODFkNThcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG5cblxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgc2VsZWN0KGlubmVyKVxuICAgICAgICAub3B0aW9ucyh0aGlzLl9zZWdtZW50cylcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGYub24oXCJjaGFuZ2VcIikuYmluZCh0aGlzKSh4KVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fYWN0aW9uLnZhbHVlIHx8IDApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgXG5cblxuXG4gICAgICB2YXIgY2FsID0gZDNfdXBkYXRlYWJsZShpbm5lcixcImEuZmEtY2FsZW5kYXJcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgICAgLmNsYXNzZWQoXCJmYSBmYS1jYWxlbmRhclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjYWxzZWwubm9kZSgpXG4gICAgICAgIH0pXG5cbiAgICAgIFxuICAgICAgdmFyIGNhbHNlbCA9IHNlbGVjdChjYWwpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIlRvZGF5XCIsXCJ2YWx1ZVwiOjB9LHtcImtleVwiOlwiWWVzdGVyZGF5XCIsXCJ2YWx1ZVwiOjF9LHtcImtleVwiOlwiNyBkYXlzIGFnb1wiLFwidmFsdWVcIjo3fV0pXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIpLmJpbmQodGhpcykoeC52YWx1ZSlcbiAgICAgICAgfSlcbiAgICAgICAgLnNlbGVjdGVkKHRoaXMuX2FjdGlvbl9kYXRlIHx8IDApXG4gICAgICAgIC5kcmF3KClcbiAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIuMDFcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwibm9uZVwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIm5vbmVcIilcblxuICAgICAgXG5cbiAgICAgIHZhciBpbm5lcjIgPSBkM191cGRhdGVhYmxlKHJvdzIsXCIuY29tcGFyaXNvbi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgY29tcGFyaXNvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMHB4XCIpXG5cbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuXG4gICAgICB2YXIgaW5uZXJfZGVzYzIgPSBkM191cGRhdGVhYmxlKHJvdzIsXCIuY29tcGFyaXNvbi1kZXNjLmlubmVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJpbm5lciBjb21wYXJpc29uLWRlc2NcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcblxuICAgICAgLy9kM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCJoM1wiLFwiaDNcIilcbiAgICAgIC8vICAudGV4dChcIihGaWx0ZXJzIGFwcGxpZWQgdG8gdGhpcyBzZWdtZW50KVwiKVxuICAgICAgLy8gIC5zdHlsZShcIm1hcmdpblwiLFwiMTBweFwiKVxuICAgICAgLy8gIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC8vICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCIuYmFyLXdyYXAtdGl0bGVcIixcImgzXCIpLmNsYXNzZWQoXCJiYXItd3JhcC10aXRsZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG5cblxuICAgICAgICAudGV4dChcInZpZXdzXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCIuYmFyLXdyYXAtdGl0bGVcIixcImgzXCIpLmNsYXNzZWQoXCJiYXItd3JhcC10aXRsZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG5cblxuXG4gICAgICAgIC50ZXh0KFwidmlld3NcIilcblxuXG5cbiAgICAgIHZhciBiYXJfc2FtcCA9IGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcImRpdi5iYXItd3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiYmFyLXdyYXBcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiOHB4XCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcIi5iYXItd3JhcC1zcGFjZVwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1zcGFjZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnRleHQoZDMuZm9ybWF0KFwiLFwiKSh0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSkpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiLmJhci13cmFwLW9wdFwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1vcHRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLy8udGV4dChcImFwcGx5IGZpbHRlcnM/XCIpXG5cblxuXG4gICAgICB2YXIgeHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgLmRvbWFpbihbMCxNYXRoLm1heCh0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSwgdGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uKV0pXG4gICAgICAgIC5yYW5nZShbMCxiYXJfc2FtcC5zdHlsZShcIndpZHRoXCIpXSlcblxuXG4gICAgICB2YXIgYmFyX3BvcCA9IGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCJkaXYuYmFyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJhci13cmFwXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjhweFwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCIuYmFyLXdyYXAtc3BhY2VcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtc3BhY2VcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KGQzLmZvcm1hdChcIixcIikodGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uKSlcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLW9wdFwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1vcHRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG4gICAgICAgIC5odG1sKFwiYXBwbHkgZmlsdGVycz8gPGlucHV0IHR5cGU9J2NoZWNrYm94Jz48L2lucHV0PlwiKVxuXG5cblxuICAgICAgc2ltcGxlQmFyKGJhcl9zYW1wLHRoaXMuX2RhdGEudmlld3Muc2FtcGxlLHhzY2FsZSxcIiMwODFkNThcIilcbiAgICAgIHNpbXBsZUJhcihiYXJfcG9wLHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbix4c2NhbGUsXCJncmV5XCIpXG5cblxuXG5cblxuXG5cblxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcjIsXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnRleHQoXCJDb21wYXJlIEFnYWluc3RcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZTNlYmYwXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIyLFwiZGl2LmNvbG9yXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb2xvclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcImdyZXlcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG5cblxuXG5cblxuXG5cblxuICAgICAgc2VsZWN0KGlubmVyMilcbiAgICAgICAgLm9wdGlvbnMoW3tcImtleVwiOlwiQ3VycmVudCBTZWdtZW50ICh3aXRob3V0IGZpbHRlcnMpXCIsXCJ2YWx1ZVwiOmZhbHNlfV0uY29uY2F0KHRoaXMuX3NlZ21lbnRzKSApXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcblxuICAgICAgICAgIHNlbGYub24oXCJjb21wYXJpc29uLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9jb21wYXJpc29uLnZhbHVlIHx8IDApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgdmFyIGNhbDIgPSBkM191cGRhdGVhYmxlKGlubmVyMixcImEuZmEtY2FsZW5kYXJcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgICAgLmNsYXNzZWQoXCJmYSBmYS1jYWxlbmRhclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjYWxzZWwyLm5vZGUoKVxuICAgICAgICB9KVxuXG4gICAgICBcbiAgICAgIHZhciBjYWxzZWwyID0gc2VsZWN0KGNhbDIpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIlRvZGF5XCIsXCJ2YWx1ZVwiOjB9LHtcImtleVwiOlwiWWVzdGVyZGF5XCIsXCJ2YWx1ZVwiOjF9LHtcImtleVwiOlwiNyBkYXlzIGFnb1wiLFwidmFsdWVcIjo3fV0pXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgudmFsdWUpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9jb21wYXJpc29uX2RhdGUgfHwgMClcbiAgICAgICAgLmRyYXcoKVxuICAgICAgICAuX3NlbGVjdFxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIi4wMVwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCJub25lXCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwibm9uZVwiKVxuXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgYWN0aW9uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25fZGF0ZVwiLHZhbClcbiAgICB9XG4gICwgYWN0aW9uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uXCIsdmFsKVxuICAgIH1cbiAgLCBjb21wYXJpc29uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uX2RhdGVcIix2YWwpXG4gICAgfVxuXG4gICwgY29tcGFyaXNvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNvbXBhcmlzb25cIix2YWwpXG4gICAgfVxuICAsIGlzX2xvYWRpbmc6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJpc19sb2FkaW5nXCIsdmFsKVxuICAgIH1cblxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuXG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRpZmZfYmFyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IERpZmZCYXIodGFyZ2V0KVxufVxuXG4vLyBkYXRhIGZvcm1hdDogW3trZXksIG5vcm1hbGl6ZWRfZGlmZn0sIC4uLiBdXG5cbmNsYXNzIERpZmZCYXIge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcblxuICAgIHRoaXMuX2tleV9hY2Nlc3NvciA9IFwia2V5XCJcbiAgICB0aGlzLl92YWx1ZV9hY2Nlc3NvciA9IFwidmFsdWVcIlxuICAgIHRoaXMuX2Jhcl9oZWlnaHQgPSAyMFxuICAgIHRoaXMuX2Jhcl93aWR0aCA9IDE1MFxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgdmFsdWVfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cbiAgYmFyX2hlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfaGVpZ2h0XCIsdmFsKSB9XG4gIGJhcl93aWR0aCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfd2lkdGhcIix2YWwpIH1cblxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgdyA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLmRpZmYtd3JhcFwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7cmV0dXJuIDF9KVxuICAgICAgLmNsYXNzZWQoXCJkaWZmLXdyYXBcIix0cnVlKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh3LFwiaDNcIixcImgzXCIpLnRleHQodGhpcy5fdGl0bGUpXG5cbiAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodyxcIi5zdmctd3JhcFwiLFwiZGl2XCIsdGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiAxIH0pXG4gICAgICAuY2xhc3NlZChcInN2Zy13cmFwXCIsdHJ1ZSlcblxuICAgIHZhciBrID0gdGhpcy5rZXlfYWNjZXNzb3IoKVxuICAgICAgLCB2ID0gdGhpcy52YWx1ZV9hY2Nlc3NvcigpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuYmFyX2hlaWdodCgpXG4gICAgICAsIGJhcl93aWR0aCA9IHRoaXMuYmFyX3dpZHRoKClcblxuICAgIHZhciBrZXlzID0gdGhpcy5fZGF0YS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geFtrXSB9KVxuICAgICAgLCBtYXggPSBkMy5tYXgodGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiB4W3ZdIH0pXG4gICAgICAsIHNhbXBtYXggPSBkMy5tYXgodGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiAteFt2XSB9KVxuXG4gICAgdmFyIHhzYW1wc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsc2FtcG1heF0pXG4gICAgICAgICAgLnJhbmdlKFswLGJhcl93aWR0aF0pXG4gICAgICAsIHhzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgLmRvbWFpbihbMCxtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB5c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsa2V5cy5sZW5ndGhdKVxuICAgICAgICAgIC5yYW5nZShbMCxrZXlzLmxlbmd0aCpoZWlnaHRdKTtcblxuICAgIHZhciBjYW52YXMgPSBkM191cGRhdGVhYmxlKHdyYXAsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAuYXR0cih7XCJ3aWR0aFwiOmJhcl93aWR0aCozLCBcImhlaWdodFwiOiBrZXlzLmxlbmd0aCpoZWlnaHQgKyAxMH0pO1xuXG4gICAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB4QXhpc1xuICAgICAgLm9yaWVudCgnYm90dG9tJylcbiAgICAgIC5zY2FsZSh4c2NhbGUpXG5cbiAgICB2YXIgeUF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHlBeGlzXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5zY2FsZSh5c2NhbGUpXG4gICAgICAudGlja1NpemUoMilcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKGQsaSl7IHJldHVybiBrZXlzW2ldOyB9KVxuICAgICAgLnRpY2tWYWx1ZXMoZDMucmFuZ2Uoa2V5cy5sZW5ndGgpKTtcblxuICAgIHZhciB5X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnknLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInkgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoICsgYmFyX3dpZHRoLzIpICsgXCIsMTUpXCIpXG4gICAgICAuYXR0cignaWQnLCd5YXhpcycpXG4gICAgICAuY2FsbCh5QXhpcyk7XG5cbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJ0ZXh0LWFuY2hvcjogbWlkZGxlO1wiKVxuXG4gICAgXG4gICAgdmFyIGNoYXJ0ID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0XCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChiYXJfd2lkdGgqMikgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG4gICAgXG4gICAgdmFyIGJhcnMgPSBkM19zcGxhdChjaGFydCxcIi5wb3AtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtNClcbiAgICAgIC5hdHRyKHsneCc6MCwneSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHlzY2FsZShpKSArIDguNTsgfX0pXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCcjMzg4ZTNjJylcbiAgICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4c2NhbGUoeFt2XSkgfSlcblxuICAgIHZhciBjaGFydDIgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydDInLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0MlwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG5cblxuICAgIHZhciBzYW1wYmFycyA9IGQzX3NwbGF0KGNoYXJ0MixcIi5zYW1wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwic2FtcC1iYXJcIilcbiAgICAgIC5hdHRyKCdoZWlnaHQnLGhlaWdodC00KVxuICAgICAgLmF0dHIoeyd4JzpmdW5jdGlvbih4KSB7IHJldHVybiBiYXJfd2lkdGggLSB4c2FtcHNjYWxlKC14W3ZdKX0sJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA4LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnI2QzMmYyZicpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNhbXBzY2FsZSgteFt2XSkgfSlcblxuICAgIHlfeGlzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgY2hhcnQuZXhpdCgpLnJlbW92ZSgpXG4gICAgY2hhcnQyLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgYmFycy5leGl0KCkucmVtb3ZlKClcbiAgICBzYW1wYmFycy5leGl0KCkucmVtb3ZlKClcblxuXG4gICAgXG5cblxuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcF9iYXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQ29tcEJhcih0YXJnZXQpXG59XG5cbi8vIGRhdGEgZm9ybWF0OiBbe2tleSwgbm9ybWFsaXplZF9kaWZmfSwgLi4uIF1cblxuY2xhc3MgQ29tcEJhciB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuXG4gICAgdGhpcy5fa2V5X2FjY2Vzc29yID0gXCJrZXlcIlxuICAgIHRoaXMuX3BvcF92YWx1ZV9hY2Nlc3NvciA9IFwidmFsdWVcIlxuICAgIHRoaXMuX3NhbXBfdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcblxuICAgIHRoaXMuX2Jhcl9oZWlnaHQgPSAyMFxuICAgIHRoaXMuX2Jhcl93aWR0aCA9IDMwMFxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgcG9wX3ZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInBvcF92YWx1ZV9hY2Nlc3NvclwiLHZhbCkgfVxuICBzYW1wX3ZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNhbXBfdmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cblxuICBiYXJfaGVpZ2h0KHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJhcl9oZWlnaHRcIix2YWwpIH1cbiAgYmFyX3dpZHRoKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJhcl93aWR0aFwiLHZhbCkgfVxuXG5cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG4gIHRpdGxlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9IFxuXG5cbiAgZHJhdygpIHtcblxuICAgIHZhciB3ID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIuY29tcC13cmFwXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHtyZXR1cm4gMX0pXG4gICAgICAuY2xhc3NlZChcImNvbXAtd3JhcFwiLHRydWUpXG5cbiAgICBkM191cGRhdGVhYmxlKHcsXCJoM1wiLFwiaDNcIikudGV4dCh0aGlzLl90aXRsZSlcblxuICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh3LFwiLnN2Zy13cmFwXCIsXCJkaXZcIix0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5jbGFzc2VkKFwic3ZnLXdyYXBcIix0cnVlKVxuXG4gICAgdmFyIGsgPSB0aGlzLmtleV9hY2Nlc3NvcigpXG4gICAgICAsIHAgPSB0aGlzLnBvcF92YWx1ZV9hY2Nlc3NvcigpXG4gICAgICAsIHMgPSB0aGlzLnNhbXBfdmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmJhcl9oZWlnaHQoKVxuICAgICAgLCBiYXJfd2lkdGggPSB0aGlzLmJhcl93aWR0aCgpXG5cbiAgICB2YXIga2V5cyA9IHRoaXMuX2RhdGEubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhba10gfSlcbiAgICAgICwgbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFtwXSB9KVxuICAgICAgLCBzYW1wbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFtzXSB9KVxuXG4gICAgdmFyIHhzYW1wc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsc2FtcG1heF0pXG4gICAgICAgICAgLnJhbmdlKFswLGJhcl93aWR0aF0pXG4gICAgICAsIHhzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgLmRvbWFpbihbMCxtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB5c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsa2V5cy5sZW5ndGhdKVxuICAgICAgICAgIC5yYW5nZShbMCxrZXlzLmxlbmd0aCpoZWlnaHRdKTtcblxuICAgIHZhciBjYW52YXMgPSBkM191cGRhdGVhYmxlKHdyYXAsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAuYXR0cih7XCJ3aWR0aFwiOmJhcl93aWR0aCtiYXJfd2lkdGgvMiwgXCJoZWlnaHRcIjoga2V5cy5sZW5ndGgqaGVpZ2h0ICsgMTB9KTtcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ2JvdHRvbScpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4ga2V5c1tpXTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKGtleXMubGVuZ3RoKSk7XG5cbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aC8yKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuXG4gICAgXG4gICAgdmFyIGNoYXJ0ID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0XCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChiYXJfd2lkdGgvMikgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG4gICAgXG4gICAgdmFyIGJhcnMgPSBkM19zcGxhdChjaGFydCxcIi5wb3AtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtMilcbiAgICAgIC5hdHRyKHsneCc6MCwneSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHlzY2FsZShpKSArIDcuNTsgfX0pXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCdncmF5JylcbiAgICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4c2NhbGUoeFtwXSkgfSlcblxuXG4gICAgdmFyIHNhbXBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIuc2FtcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNhbXAtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtMTApXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyAxMS41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJyMwODFkNTgnKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzYW1wc2NhbGUoeFtzXSB8fCAwKSB9KVxuXG4gICAgeV94aXMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICBjaGFydC5leGl0KCkucmVtb3ZlKClcblxuICAgIGJhcnMuZXhpdCgpLnJlbW92ZSgpXG4gICAgc2FtcGJhcnMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQgZGlmZl9iYXIgZnJvbSAnLi4vLi4vZ2VuZXJpYy9kaWZmX2JhcidcbmltcG9ydCBjb21wX2JhciBmcm9tICcuLi8uLi9nZW5lcmljL2NvbXBfYmFyJ1xuXG5leHBvcnQgZnVuY3Rpb24gZHJhd0NhdGVnb3J5RGlmZih0YXJnZXQsZGF0YSkge1xuXG4gIGRpZmZfYmFyKHRhcmdldClcbiAgICAuZGF0YShkYXRhKVxuICAgIC50aXRsZShcIkNhdGVnb3J5IGluZGV4aW5nIHZlcnN1cyBjb21wXCIpXG4gICAgLnZhbHVlX2FjY2Vzc29yKFwibm9ybWFsaXplZF9kaWZmXCIpXG4gICAgLmRyYXcoKVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3Q2F0ZWdvcnkodGFyZ2V0LGRhdGEpIHtcblxuICBjb21wX2Jhcih0YXJnZXQpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAudGl0bGUoXCJDYXRlZ29yaWVzIHZpc2l0ZWQgZm9yIGZpbHRlcmVkIHZlcnN1cyBhbGwgdmlld3NcIilcbiAgICAucG9wX3ZhbHVlX2FjY2Vzc29yKFwicG9wXCIpXG4gICAgLnNhbXBfdmFsdWVfYWNjZXNzb3IoXCJzYW1wXCIpXG4gICAgLmRyYXcoKVxuXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBfYnViYmxlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IENvbXBCdWJibGUodGFyZ2V0KVxufVxuXG4vLyBkYXRhIGZvcm1hdDogW3trZXksIG5vcm1hbGl6ZWRfZGlmZn0sIC4uLiBdXG5cbmNsYXNzIENvbXBCdWJibGUge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcblxuICAgIHRoaXMuX2tleV9hY2Nlc3NvciA9IFwia2V5XCJcblxuICAgIHRoaXMuX2hlaWdodCA9IDIwXG4gICAgdGhpcy5fc3BhY2UgPSAxNFxuICAgIHRoaXMuX21pZGRsZSA9IDE4MFxuICAgIHRoaXMuX2xlZ2VuZF93aWR0aCA9IDgwXG5cbiAgICB0aGlzLl9idWNrZXRzID0gWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcbiAgICB0aGlzLl9yb3dzID0gW11cblxuXG4gIH0gXG5cbiAga2V5X2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImtleV9hY2Nlc3NvclwiLHZhbCkgfVxuICB2YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ2YWx1ZV9hY2Nlc3NvclwiLHZhbCkgfVxuXG4gIGhlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cbiAgc3BhY2UodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3BhY2VcIix2YWwpIH1cbiAgbWlkZGxlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm1pZGRsZVwiLHZhbCkgfVxuICBidWNrZXRzKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJ1Y2tldHNcIix2YWwpIH1cblxuICByb3dzKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInJvd3NcIix2YWwpIH1cbiAgYWZ0ZXIodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWZ0ZXJcIix2YWwpIH1cblxuXG5cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG4gIHRpdGxlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9IFxuXG4gIGJ1aWxkU2NhbGVzKCkge1xuXG4gICAgdmFyIHJvd3MgPSB0aGlzLnJvd3MoKVxuICAgICAgLCBidWNrZXRzID0gdGhpcy5idWNrZXRzKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5oZWlnaHQoKSwgc3BhY2UgPSB0aGlzLnNwYWNlKClcblxuICAgIHRoaXMuX3lzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFswLHJvd3MubGVuZ3RoXSlcbiAgICAgIC5yYW5nZShbMCxyb3dzLmxlbmd0aCpoZWlnaHRdKTtcblxuICAgIHRoaXMuX3hzY2FsZSA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgLmRvbWFpbihidWNrZXRzKVxuICAgICAgLnJhbmdlKGQzLnJhbmdlKDAsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSksKGhlaWdodCtzcGFjZSkpKTtcblxuICAgIHRoaXMuX3hzY2FsZXJldmVyc2UgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cy5yZXZlcnNlKCkpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCxidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSwoaGVpZ2h0K3NwYWNlKSkpO1xuXG4gICAgdGhpcy5fcnNjYWxlID0gZDMuc2NhbGUucG93KClcbiAgICAgIC5leHBvbmVudCgwLjUpXG4gICAgICAuZG9tYWluKFswLDFdKVxuICAgICAgLnJhbmdlKFsuMzUsMV0pXG4gICAgXG4gICAgdGhpcy5fb3NjYWxlID0gZDMuc2NhbGUucXVhbnRpemUoKVxuICAgICAgLmRvbWFpbihbLTEsMV0pXG4gICAgICAucmFuZ2UoWycjZjdmYmZmJywnI2RlZWJmNycsJyNjNmRiZWYnLCcjOWVjYWUxJywnIzZiYWVkNicsJyM0MjkyYzYnLCcjMjE3MWI1JywnIzA4NTE5YycsJyMwODMwNmInXSlcbiAgICBcbiAgfVxuXG4gIGRyYXdMZWdlbmQoKSB7XG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1xuICAgICAgLCBidWNrZXRzID0gdGhpcy5idWNrZXRzKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5oZWlnaHQoKSwgc3BhY2UgPSB0aGlzLnNwYWNlKCksIG1pZGRsZSA9IHRoaXMubWlkZGxlKCksIGxlZ2VuZHR3ID0gdGhpcy5fbGVnZW5kX3dpZHRoXG4gICAgICAsIHJzY2FsZSA9IHRoaXMuX3JzY2FsZSwgb3NjYWxlID0gdGhpcy5fb3NjYWxlO1xuXG4gICAgdmFyIGxlZ2VuZCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmxlZ2VuZCcsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVnZW5kXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKFwiICsgKGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpKjIrbWlkZGxlLTMxMCkgKyBcIiwtMTMwKVwiKVxuXG4gICAgdmFyIHNpemUgPSBkM191cGRhdGVhYmxlKGxlZ2VuZCwnZy5zaXplJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJzaXplXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKFwiICsgKGxlZ2VuZHR3KzEwKSArIFwiLDApXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lm1vcmVcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1vcmUgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsLWxlZ2VuZHR3KVxuICAgICAgLmh0bWwoXCJtb3JlIGFjdGl2aXR5XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIikgXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dy0xMClcbiAgICAgIC5odG1sKFwiJiM5NjY0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpIFxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuN2VtXCIpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cblxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5sZXNzXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZXNzIGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLChoZWlnaHQrNCkqNStsZWdlbmR0dylcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC5odG1sKFwibGVzcyBhY3Rpdml0eVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG5cbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3MtYXJyb3dcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MtYXJyb3cgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KzEwKVxuICAgICAgLmh0bWwoXCImIzk2NTQ7XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKSBcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cblxuICAgIGQzX3NwbGF0KHNpemUsXCJjaXJjbGVcIixcImNpcmNsZVwiLFsxLC42LC4zLC4xLDBdKVxuICAgICAgLmF0dHIoXCJyXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gKGhlaWdodC0yKS8yKnJzY2FsZSh4KSB9KVxuICAgICAgLmF0dHIoJ2N4JywgZnVuY3Rpb24oZCxpKSB7IHJldHVybiAoaGVpZ2h0KzQpKmkraGVpZ2h0LzJ9KVxuICAgICAgLmF0dHIoJ3N0cm9rZScsICdncmV5JylcbiAgICAgIC5hdHRyKCdmaWxsJywgJ25vbmUnKVxuXG5cbiAgICBcblxuXG4gICAgdmFyIHNpemUgPSBkM191cGRhdGVhYmxlKGxlZ2VuZCwnZy5pbXBvcnRhbmNlJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJpbXBvcnRhbmNlXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKFwiKyAobGVnZW5kdHcrMTApICtcIiwyNSlcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZVwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZSBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHcpXG4gICAgICAuaHRtbChcIm1vcmUgaW1wb3J0YW50XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lm1vcmUtYXJyb3dcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1vcmUtYXJyb3cgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsLWxlZ2VuZHR3LTEwKVxuICAgICAgLmh0bWwoXCImIzk2NjQ7XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKSBcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cblxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5sZXNzXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZXNzIGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLChoZWlnaHQrNCkqNStsZWdlbmR0dylcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC5odG1sKFwibGVzcyBpbXBvcnRhbnRcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzcy1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcy1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcrMTApXG4gICAgICAuaHRtbChcIiYjOTY1NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuN2VtXCIpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cbiAgICBkM19zcGxhdChzaXplLFwiY2lyY2xlXCIsXCJjaXJjbGVcIixbMSwuNzUsLjUsLjI1LDBdKVxuICAgICAgLmF0dHIoXCJyXCIsaGVpZ2h0LzItMilcbiAgICAgIC5hdHRyKFwiZmlsbFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG9zY2FsZSh4KSB9KVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gcnNjYWxlKHgvMiArIC4yKSB9KVxuICAgICAgLmF0dHIoJ2N4JywgZnVuY3Rpb24oZCxpKSB7IHJldHVybiAoaGVpZ2h0KzQpKmkraGVpZ2h0LzIgfSlcbiBcbiAgfVxuXG4gIGRyYXdBeGVzKCkge1xuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNcbiAgICAgICwgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpLCBtaWRkbGUgPSB0aGlzLm1pZGRsZSgpLCBsZWdlbmR0dyA9IHRoaXMuX2xlZ2VuZF93aWR0aFxuICAgICAgLCByc2NhbGUgPSB0aGlzLl9yc2NhbGUsIG9zY2FsZSA9IHRoaXMuX29zY2FsZSBcbiAgICAgICwgeHNjYWxlID0gdGhpcy5feHNjYWxlLCB5c2NhbGUgPSB0aGlzLl95c2NhbGVcbiAgICAgICwgeHNjYWxlcmV2ZXJzZSA9IHRoaXMuX3hzY2FsZXJldmVyc2VcbiAgICAgICwgcm93cyA9IHRoaXMuX3Jvd3NcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgICAuc2NhbGUoeHNjYWxlcmV2ZXJzZSlcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIGlmICh4ID09IDM2MDApIHJldHVybiBcIjEgaG91clwiXG4gICAgICAgIGlmICh4IDwgMzYwMCkgcmV0dXJuIHgvNjAgKyBcIiBtaW5zXCIgXG5cbiAgICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgICAgaWYgKHggPiA4NjQwMCkgcmV0dXJuIHgvODY0MDAgKyBcIiBkYXlzXCIgXG5cbiAgICAgICAgcmV0dXJuIHgvMzYwMCArIFwiIGhvdXJzXCJcbiAgICAgIH0pXG5cbiAgICB2YXIgeF94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy54LmJlZm9yZScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieCBheGlzIGJlZm9yZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoaGVpZ2h0ICsgc3BhY2UpKyBcIiwtNClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3hheGlzJylcbiAgICAgIC5jYWxsKHhBeGlzKTtcblxuICAgICAgICAgIFxuICAgIHhfeGlzLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAgIC5hdHRyKFwieVwiLCAtOClcbiAgICAgIC5hdHRyKFwieFwiLCAtOClcbiAgICAgIC5hdHRyKFwiZHlcIiwgXCIuMzVlbVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoNDUpXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcImVuZFwiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwibGluZVwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrXCIpXG5cbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJwYXRoXCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2s7IGRpc3BsYXk6aW5oZXJpdFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh4X3hpcyxcInRleHQudGl0bGVcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInRpdGxlXCIpXG4gICAgICAuYXR0cihcInhcIixidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKS8yIC0gaGVpZ2h0K3NwYWNlIClcbiAgICAgIC5hdHRyKFwieVwiLC01MylcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsdW5kZWZpbmVkKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsIFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAgIC50ZXh0KFwiYmVmb3JlIGFycml2aW5nXCIpXG5cblxuXG4gICAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB4QXhpc1xuICAgICAgLm9yaWVudCgndG9wJylcbiAgICAgIC5zY2FsZSh4c2NhbGUpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbih4KSB7IFxuICAgICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgICBpZiAoeCA8IDM2MDApIHJldHVybiB4LzYwICsgXCIgbWluc1wiIFxuXG4gICAgICAgIGlmICh4ID09IDg2NDAwKSByZXR1cm4gXCIxIGRheVwiXG4gICAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICAgIHJldHVybiB4LzM2MDAgKyBcIiBob3Vyc1wiXG4gICAgICB9KVxuXG4gICAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueC5hZnRlcicsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieCBheGlzIGFmdGVyXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSttaWRkbGUpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3hheGlzJylcbiAgICAgIC5jYWxsKHhBeGlzKTtcbiAgICBcbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInlcIiwgLTgpXG4gICAgICAuYXR0cihcInhcIiwgOClcbiAgICAgIC5hdHRyKFwiZHlcIiwgXCIuMzVlbVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoLTQ1KVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJzdGFydFwiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwibGluZVwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrXCIpXG5cbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJwYXRoXCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2s7IGRpc3BsYXk6aW5oZXJpdFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh4X3hpcyxcInRleHQudGl0bGVcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInRpdGxlXCIpXG4gICAgICAuYXR0cihcInhcIixidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKS8yICApXG4gICAgICAuYXR0cihcInlcIiwtNTMpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLHVuZGVmaW5lZClcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLCBcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXG4gICAgICAudGV4dChcImFmdGVyIGxlYXZpbmdcIilcblxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4gcm93c1tpXS5rZXk7IH0pXG4gICAgICAudGlja1ZhbHVlcyhkMy5yYW5nZShyb3dzLmxlbmd0aCkpO1xuXG5cbiAgICBcbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpKzApICsgXCIsMTUpXCIpXG4gICAgICAuYXR0cignaWQnLCd5YXhpcycpXG5cblxuICAgIHlfeGlzXG4gICAgICAuY2FsbCh5QXhpcyk7XG5cbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgICAuYXR0cihcIngyXCIsMTgpXG4gICAgICAuYXR0cihcIngxXCIsMjIpXG4gICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsXCIwXCIpXG4gICAgICAucmVtb3ZlKClcblxuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJ4MlwiLDE4KVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgxOCwwKVwiKSBcbiAgICAgIC8vLnN0eWxlKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuXG5cblxuICAgICAgLy8ucmVtb3ZlKClcblxuICAgIFxuICAgIHlfeGlzLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInRleHQtYW5jaG9yOiBtaWRkbGU7IGZvbnQtd2VpZ2h0OmJvbGQ7IGZpbGw6ICMzMzNcIilcbiAgICAgIC5hdHRyKFwieFwiLG1pZGRsZS8yKVxuXG5cblxuXG4gIH1cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKSwgbWlkZGxlID0gdGhpcy5taWRkbGUoKSwgbGVnZW5kdHcgPSB0aGlzLl9sZWdlbmRfd2lkdGhcbiAgICAgICwgcm93cyA9IHRoaXMucm93cygpXG5cbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMTBweFwiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuICAgICAgLmF0dHIoeyd3aWR0aCc6YnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkqMittaWRkbGUsJ2hlaWdodCc6cm93cy5sZW5ndGgqaGVpZ2h0ICsgMTY1fSlcbiAgICAgIC5hdHRyKFwieG1sbnNcIiwgXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiKVxuXG4gICAgdGhpcy5fc3ZnID0gc3ZnXG5cbiAgICB0aGlzLl9jYW52YXMgPSBkM191cGRhdGVhYmxlKHN2ZyxcIi5jYW52YXNcIixcImdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNhbnZhc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwxNDApXCIpXG5cblxuXG4gICAgdGhpcy5idWlsZFNjYWxlcygpXG4gICAgdGhpcy5kcmF3TGVnZW5kKClcbiAgICB0aGlzLmRyYXdBeGVzKClcblxuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNcbiAgICAgICwgcnNjYWxlID0gdGhpcy5fcnNjYWxlLCBvc2NhbGUgPSB0aGlzLl9vc2NhbGUgXG4gICAgICAsIHhzY2FsZSA9IHRoaXMuX3hzY2FsZSwgeXNjYWxlID0gdGhpcy5feXNjYWxlXG4gICAgICAsIHhzY2FsZXJldmVyc2UgPSB0aGlzLl94c2NhbGVyZXZlcnNlXG4gICAgICAsIHJvd3MgPSB0aGlzLnJvd3MoKVxuXG5cbiAgICB2YXIgY2hhcnRfYmVmb3JlID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQtYmVmb3JlJywnZycsdGhpcy5yb3dzKCksZnVuY3Rpb24oKSB7IHJldHVybiAxIH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydC1iZWZvcmVcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG5cblxuICAgIHZhciByb3dzID0gZDNfc3BsYXQoY2hhcnRfYmVmb3JlLFwiLnJvd1wiLFwiZ1wiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInJvd1wiKVxuICAgICAgLmF0dHIoeyd0cmFuc2Zvcm0nOmZ1bmN0aW9uKGQsaSl7IHJldHVybiBcInRyYW5zbGF0ZSgwLFwiICsgKHlzY2FsZShpKSArIDcuNSkgKyBcIilcIjsgfSB9KVxuICAgICAgLmF0dHIoeydsYWJlbCc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIGQua2V5OyB9IH0pXG5cbiAgICByb3dzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIGJhcnMgPSBkM19zcGxhdChyb3dzLFwiLnBvcC1iYXJcIixcImNpcmNsZVwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWVzIH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgICAuYXR0cignY3knLChoZWlnaHQtMikvMilcbiAgICAgIC5hdHRyKHsnY3gnOmZ1bmN0aW9uKGQsaSkgeyByZXR1cm4gLXhzY2FsZShkLmtleSl9fSlcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLFwiLjhcIilcbiAgICAgIC5hdHRyKFwiclwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIChoZWlnaHQpLzIgKiByc2NhbGUoeC5ub3JtX3RpbWUpIH0pIFxuICAgICAgLnN0eWxlKFwiZmlsbFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG9zY2FsZSh4LnBlcmNlbnRfZGlmZikgfSlcblxuICAgIHZhciBjaGFydF9hZnRlciA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0LWFmdGVyJywnZycsdGhpcy5fYWZ0ZXIsZnVuY3Rpb24oKSB7IHJldHVybiAxIH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydC1hZnRlclwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkrbWlkZGxlKSArIFwiLDApXCIpXG4gICAgICAuYXR0cignaWQnLCdiYXJzJylcblxuXG4gICAgdmFyIHJvd3MgPSBkM19zcGxhdChjaGFydF9hZnRlcixcIi5yb3dcIixcImdcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJyb3dcIilcbiAgICAgIC5hdHRyKHsndHJhbnNmb3JtJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gXCJ0cmFuc2xhdGUoMCxcIiArICh5c2NhbGUoaSkgKyA3LjUpICsgXCIpXCI7IH0gfSlcbiAgICAgIC5hdHRyKHsnbGFiZWwnOmZ1bmN0aW9uKGQsaSl7IHJldHVybiBkLmtleTsgfSB9KVxuXG4gICAgcm93cy5leGl0KCkucmVtb3ZlKClcblxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQocm93cyxcIi5wb3AtYmFyXCIsXCJjaXJjbGVcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlcyB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2N5JywoaGVpZ2h0LTIpLzIpXG4gICAgICAuYXR0cih7J2N4JzpmdW5jdGlvbihkLGkpIHsgcmV0dXJuIHhzY2FsZShkLmtleSl9fSlcbiAgICAgIC5hdHRyKFwiclwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIChoZWlnaHQtMikvMiAqIHJzY2FsZSh4Lm5vcm1fdGltZSkgfSlcbiAgICAgIC5zdHlsZShcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBvc2NhbGUoeC5wZXJjZW50X2RpZmYpIH0pXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIixcIi44XCIpXG5cblxuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3RyZWFtX3Bsb3QodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU3RyZWFtUGxvdCh0YXJnZXQpXG59XG5cbmZ1bmN0aW9uIGRyYXdBeGlzKHRhcmdldCxzY2FsZSx0ZXh0LHdpZHRoKSB7XG4gIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gIHhBeGlzXG4gICAgLm9yaWVudCgndG9wJylcbiAgICAuc2NhbGUoc2NhbGUpXG4gICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oeCkgeyBcbiAgICAgIGlmICh4ID09IDM2MDApIHJldHVybiBcIjEgaG91clwiXG4gICAgICBpZiAoeCA8IDM2MDApIHJldHVybiB4LzYwICsgXCIgbWluc1wiIFxuXG4gICAgICBpZiAoeCA9PSA4NjQwMCkgcmV0dXJuIFwiMSBkYXlcIlxuICAgICAgaWYgKHggPiA4NjQwMCkgcmV0dXJuIHgvODY0MDAgKyBcIiBkYXlzXCIgXG5cbiAgICAgIHJldHVybiB4LzM2MDAgKyBcIiBob3Vyc1wiXG4gICAgfSlcblxuICB2YXIgeF94aXMgPSBkM191cGRhdGVhYmxlKHRhcmdldCwnZy54LmJlZm9yZScsJ2cnKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcInggYXhpcyBiZWZvcmVcIilcbiAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLC01KVwiKVxuICAgIC5hdHRyKCdpZCcsJ3hheGlzJylcbiAgICAuY2FsbCh4QXhpcyk7XG5cbiAgICAgICAgXG4gIHhfeGlzLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAuYXR0cihcInlcIiwgLTI1KVxuICAgIC5hdHRyKFwieFwiLCAxNSlcbiAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSg0NSlcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcImVuZFwiKVxuXG4gIHhfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2tcIilcblxuICB4X3hpcy5zZWxlY3RBbGwoXCJwYXRoXCIpXG4gICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrOyBkaXNwbGF5OmluaGVyaXRcIilcblxuICBkM191cGRhdGVhYmxlKHhfeGlzLFwidGV4dC50aXRsZVwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcInRpdGxlXCIpXG4gICAgLmF0dHIoXCJ4XCIsd2lkdGgvMilcbiAgICAuYXR0cihcInlcIiwtNDYpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIix1bmRlZmluZWQpXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLCBcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgIC50ZXh0KHRleHQgKyBcIiBcIilcblxuICByZXR1cm4geF94aXNcblxufVxuXG5cbmNsYXNzIFN0cmVhbVBsb3Qge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vbiA9IHt9XG4gICAgdGhpcy5fYnVja2V0cyA9IFswLDEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcblxuICAgIHRoaXMuX3dpZHRoID0gMzcwXG4gICAgdGhpcy5faGVpZ2h0ID0gMjUwXG4gICAgdGhpcy5fY29sb3IgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5yYW5nZShcblsnIzk5OScsJyNhYWEnLCcjYmJiJywnI2NjYycsJyNkZGQnLCcjZGVlYmY3JywnI2M2ZGJlZicsJyM5ZWNhZTEnLCcjNmJhZWQ2JywnIzQyOTJjNicsJyMyMTcxYjUnLCdyZ2JhKDMzLCAxMTMsIDE4MSwuOSknLCdyZ2JhKDgsIDgxLCAxNTYsLjkxKScsJyMwODUxOWMnLCdyZ2JhKDgsIDQ4LCAxMDcsLjkpJywnIzA4MzA2YiddLnJldmVyc2UoKSlcblxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgdmFsdWVfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cbiAgaGVpZ2h0KHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhlaWdodFwiLHZhbCkgfVxuICB3aWR0aCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ3aWR0aFwiLHZhbCkgfVxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGFcbiAgICAgICwgb3JkZXIgPSBkYXRhLm9yZGVyXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLl9idWNrZXRzXG4gICAgICAsIGJlZm9yZV9zdGFja2VkID0gZGF0YS5iZWZvcmVfc3RhY2tlZFxuICAgICAgLCBhZnRlcl9zdGFja2VkID0gZGF0YS5hZnRlcl9zdGFja2VkXG4gICAgICAsIGhlaWdodCA9IHRoaXMuX2hlaWdodFxuICAgICAgLCB3aWR0aCA9IHRoaXMuX3dpZHRoXG4gICAgICAsIHRhcmdldCA9IHRoaXMuX3RhcmdldFxuICAgICAgLCBjb2xvciA9IHRoaXMuX2NvbG9yXG4gICAgICAsIHNlbGYgPSB0aGlzXG5cbiAgICBjb2xvci5kb21haW4ob3JkZXIpXG5cbiAgICB2YXIgeSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAucmFuZ2UoW2hlaWdodCwwXSlcbiAgICAgIC5kb21haW4oWzAsZDMubWF4KGJlZm9yZV9zdGFja2VkLCBmdW5jdGlvbihsYXllcikgeyByZXR1cm4gZDMubWF4KGxheWVyLGZ1bmN0aW9uKGQpIHtyZXR1cm4gZC55MCArIGQueSB9KX0pXSlcbiAgXG4gICAgdmFyIHggPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cylcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLHdpZHRoLHdpZHRoLyhidWNrZXRzLmxlbmd0aC0xKSkpXG4gIFxuICAgIHZhciB4cmV2ZXJzZSA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgLmRvbWFpbihidWNrZXRzLnNsaWNlKCkucmV2ZXJzZSgpKVxuICAgICAgLnJhbmdlKGQzLnJhbmdlKDAsd2lkdGgrMTAsd2lkdGgvKGJ1Y2tldHMubGVuZ3RoLTEpKSlcblxuICAgIHRoaXMuX2JlZm9yZV9zY2FsZSA9IHhyZXZlcnNlXG4gICAgdGhpcy5fYWZ0ZXJfc2NhbGUgPSB4XG4gIFxuICAgIHZhciBiYXJlYSA9IGQzLnN2Zy5hcmVhKClcbiAgICAgIC5pbnRlcnBvbGF0ZShcInplcm9cIilcbiAgICAgIC54KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHhyZXZlcnNlKGQueCk7IH0pXG4gICAgICAueTAoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwKTsgfSlcbiAgICAgIC55MShmdW5jdGlvbihkKSB7IHJldHVybiB5KGQueTAgKyBkLnkpOyB9KTtcbiAgXG4gICAgdmFyIGFhcmVhID0gZDMuc3ZnLmFyZWEoKVxuICAgICAgLmludGVycG9sYXRlKFwibGluZWFyXCIpXG4gICAgICAueChmdW5jdGlvbihkKSB7IHJldHVybiB4KGQueCk7IH0pXG4gICAgICAueTAoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwKTsgfSlcbiAgICAgIC55MShmdW5jdGlvbihkKSB7IHJldHVybiB5KGQueTAgKyBkLnkpOyB9KTtcbiAgXG4gIFxuICAgIHZhciBzdmcgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcInN2Z1wiLFwic3ZnXCIpXG4gICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKjIrMTgwKVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0ICsgMTAwKTtcblxuICAgIHRoaXMuX3N2ZyA9IHN2Z1xuICBcbiAgICB2YXIgYmVmb3JlID0gZDNfdXBkYXRlYWJsZShzdmcsXCIuYmVmb3JlLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiYmVmb3JlLWNhbnZhc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCw2MClcIilcblxuICAgIGZ1bmN0aW9uIGhvdmVyQ2F0ZWdvcnkoY2F0LHRpbWUpIHtcbiAgICAgIGFwYXRocy5zdHlsZShcIm9wYWNpdHlcIixcIi41XCIpXG4gICAgICBicGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsXCIuNVwiKVxuICAgICAgYXBhdGhzLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IGNhdCkuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuICAgICAgYnBhdGhzLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IGNhdCkuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuICAgICAgZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcblxuICAgICAgZDNfdXBkYXRlYWJsZShtaWRkbGUsXCJ0ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzMzM1wiKVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIuNjVcIilcbiAgICAgICAgLnRleHQoY2F0KVxuXG4gICAgICB2YXIgbXdyYXAgPSBkM191cGRhdGVhYmxlKG1pZGRsZSxcImdcIixcImdcIilcblxuICAgICAgc2VsZi5vbihcImNhdGVnb3J5LmhvdmVyXCIpLmJpbmQobXdyYXAubm9kZSgpKShjYXQsdGltZSlcbiAgICB9XG4gIFxuICAgIHZhciBiID0gZDNfdXBkYXRlYWJsZShiZWZvcmUsXCJnXCIsXCJnXCIpXG5cbiAgICB2YXIgYnBhdGhzID0gZDNfc3BsYXQoYixcInBhdGhcIixcInBhdGhcIiwgYmVmb3JlX3N0YWNrZWQsZnVuY3Rpb24oeCxpKSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuYXR0cihcImRcIiwgYmFyZWEpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbMF0ua2V5fSlcbiAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBjb2xvcih4WzBdLmtleSk7IH0pXG4gICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIHZhciBkZCA9IGQzLmV2ZW50XG4gICAgICAgIHZhciBwb3MgPSBwYXJzZUludChkZC5vZmZzZXRYLyh3aWR0aC9idWNrZXRzLmxlbmd0aCkpXG4gICAgICAgIFxuICAgICAgICBob3ZlckNhdGVnb3J5LmJpbmQodGhpcykoeFswXS5rZXksYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKVtwb3NdKVxuICAgICAgfSlcbiAgICAgIC5vbihcIm1vdXNlb3V0XCIsZnVuY3Rpb24oeCkge1xuICAgICAgICBhcGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuICAgICAgICBicGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuICAgICAgfSlcblxuICAgIGJwYXRocy5leGl0KCkucmVtb3ZlKClcblxuICAgIHZhciBicmVjdCA9IGQzX3NwbGF0KGIsXCJyZWN0XCIsXCJyZWN0XCIsYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKSwoeCxpKSA9PiBpKVxuICAgICAgLmF0dHIoXCJ4XCIseiA9PiB4cmV2ZXJzZSh6KSlcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIixoZWlnaHQpXG4gICAgICAuYXR0cihcInlcIiwwKVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsXCIwXCIpXG5cblxuXG4gICAgICBcblxuICAgIHZhciBtaWRkbGUgPSBkM191cGRhdGVhYmxlKHN2ZyxcIi5taWRkbGUtY2FudmFzXCIsXCJnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtaWRkbGUtY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKFwiICsgKHdpZHRoICsgMTgwLzIpICsgXCIsNjApXCIpXG4gIFxuICBcbiAgXG4gICAgdmFyIGFmdGVyID0gZDNfdXBkYXRlYWJsZShzdmcsXCIuYWZ0ZXItY2FudmFzXCIsXCJnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJhZnRlci1jYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKHdpZHRoICsgMTgwKSArIFwiLDYwKVwiKVxuXG4gICAgdmFyIGEgPSBkM191cGRhdGVhYmxlKGFmdGVyLFwiZ1wiLFwiZ1wiKVxuXG4gIFxuICAgIHZhciBhcGF0aHMgPSBkM19zcGxhdChhLFwicGF0aFwiLFwicGF0aFwiLGFmdGVyX3N0YWNrZWQsZnVuY3Rpb24oeCxpKSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuYXR0cihcImRcIiwgYWFyZWEpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbMF0ua2V5fSlcbiAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBjb2xvcih4WzBdLmtleSk7IH0pXG4gICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIGhvdmVyQ2F0ZWdvcnkuYmluZCh0aGlzKSh4WzBdLmtleSlcbiAgICAgIH0pXG4gICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgYXBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIH0pXG5cbiAgICBhcGF0aHMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgX3hfeGlzID0gZHJhd0F4aXMoYmVmb3JlLHhyZXZlcnNlLFwiYmVmb3JlIGFycml2aW5nXCIsd2lkdGgpXG5cbiAgICBfeF94aXMuc2VsZWN0QWxsKFwidGV4dFwiKS5maWx0ZXIoZnVuY3Rpb24oeSl7IHJldHVybiB5ID09IDAgfSkucmVtb3ZlKClcblxuICAgIHZhciBfeF94aXMgPSBkcmF3QXhpcyhhZnRlcix4LFwiYWZ0ZXIgbGVhdmluZ1wiLHdpZHRoKVxuXG4gICAgX3hfeGlzLnNlbGVjdEFsbChcInRleHQ6bm90KC50aXRsZSlcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKC00NSlcIilcbiAgICAgIC5hdHRyKFwieFwiLDIwKVxuICAgICAgLmF0dHIoXCJ5XCIsLTI1KVxuXG4gICAgX3hfeGlzLnNlbGVjdEFsbChcInRleHRcIikuZmlsdGVyKGZ1bmN0aW9uKHkpeyByZXR1cm4geSA9PSAwIH0pLnJlbW92ZSgpXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgb24oYWN0aW9uLGZuKSB7XG4gICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cbiIsImltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnY2hhcnQnXG5pbXBvcnQge2QzX2NsYXNzLCBkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcblxuaW1wb3J0IGNvbXBfYnViYmxlIGZyb20gJy4uLy4uL2dlbmVyaWMvY29tcF9idWJibGUnXG5pbXBvcnQgc3RyZWFtX3Bsb3QgZnJvbSAnLi4vLi4vZ2VuZXJpYy9zdHJlYW1fcGxvdCdcblxuZnVuY3Rpb24gYnVpbGRTdHJlYW1EYXRhKGRhdGEsYnVja2V0cykge1xuXG4gIHZhciB1bml0c19pbl9idWNrZXQgPSBidWNrZXRzLm1hcChmdW5jdGlvbih4LGkpIHsgcmV0dXJuIHggLSAoeFtpLTFdfHwgMCkgfSlcblxuICB2YXIgc3RhY2thYmxlID0gZGF0YS5tYXAoZnVuY3Rpb24oZCkge1xuICAgIHZhciB2YWx1ZW1hcCA9IGQudmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjLnZhbHVlczsgcmV0dXJuIHAgfSx7fSlcbiAgICB2YXIgcGVyY21hcCA9IGQudmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjLnBlcmNlbnQ7IHJldHVybiBwIH0se30pXG5cbiAgICB2YXIgdm1hcCA9IGQudmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjLm5vcm1fY2F0OyByZXR1cm4gcCB9LHt9KVxuXG5cbiAgICB2YXIgbm9ybWFsaXplZF92YWx1ZXMgPSBidWNrZXRzLm1hcChmdW5jdGlvbih4LGkpIHtcbiAgICAgIGlmICh4ID09IDApIHJldHVybiB7a2V5OiBkLmtleSwgeDogcGFyc2VJbnQoeCksIHk6ICh2bWFwW1wiNjAwXCJdfHwwKSwgdmFsdWVzOiAodmFsdWVtYXBbXCI2MDBcIl18fDApLCBwZXJjZW50OiAocGVyY21hcFtcIjYwMFwiXXx8MCl9XG4gICAgICByZXR1cm4geyBrZXk6IGQua2V5LCB4OiBwYXJzZUludCh4KSwgeTogKHZtYXBbeF0gfHwgMCksIHZhbHVlczogKHZhbHVlbWFwW3hdIHx8IDApLCBwZXJjZW50OiAocGVyY21hcFt4XSB8fCAwKSB9XG4gICAgfSlcblxuXG4gICAgcmV0dXJuIG5vcm1hbGl6ZWRfdmFsdWVzXG4gICAgLy9yZXR1cm4gZTIuY29uY2F0KG5vcm1hbGl6ZWRfdmFsdWVzKS8vLmNvbmNhdChleHRyYSlcbiAgfSlcblxuXG4gIHN0YWNrYWJsZSA9IHN0YWNrYWJsZS5zb3J0KChwLGMpID0+IHBbMF0ueSAtIGNbMF0ueSkucmV2ZXJzZSgpLnNsaWNlKDAsMTIpXG5cbiAgcmV0dXJuIHN0YWNrYWJsZVxuXG59XG5cbmZ1bmN0aW9uIHN0cmVhbURhdGEoYmVmb3JlLGFmdGVyLGJ1Y2tldHMpIHtcbiAgdmFyIHN0YWNrYWJsZSA9IGJ1aWxkU3RyZWFtRGF0YShiZWZvcmUsYnVja2V0cylcbiAgdmFyIHN0YWNrID0gZDMubGF5b3V0LnN0YWNrKCkub2Zmc2V0KFwid2lnZ2xlXCIpLm9yZGVyKFwicmV2ZXJzZVwiKVxuICB2YXIgYmVmb3JlX3N0YWNrZWQgPSBzdGFjayhzdGFja2FibGUpXG5cbiAgdmFyIG9yZGVyID0gYmVmb3JlX3N0YWNrZWQubWFwKGl0ZW0gPT4gaXRlbVswXS5rZXkpXG5cbiAgdmFyIHN0YWNrYWJsZSA9IGJ1aWxkU3RyZWFtRGF0YShhZnRlcixidWNrZXRzKVxuICAgIC5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gb3JkZXIuaW5kZXhPZihjWzBdLmtleSkgLSBvcmRlci5pbmRleE9mKHBbMF0ua2V5KSB9KVxuXG4gIHN0YWNrYWJsZSA9IHN0YWNrYWJsZS5maWx0ZXIoeCA9PiBvcmRlci5pbmRleE9mKHhbMF0ua2V5KSA9PSAtMSkuY29uY2F0KHN0YWNrYWJsZS5maWx0ZXIoeCA9PiBvcmRlci5pbmRleE9mKHhbMF0ua2V5KSA+IC0xKSlcblxuICB2YXIgc3RhY2sgPSBkMy5sYXlvdXQuc3RhY2soKS5vZmZzZXQoXCJ3aWdnbGVcIikub3JkZXIoXCJkZWZhdWx0XCIpXG4gIHZhciBhZnRlcl9zdGFja2VkID0gc3RhY2soc3RhY2thYmxlKVxuXG4gIHJldHVybiB7XG4gICAgICBvcmRlcjogb3JkZXJcbiAgICAsIGJlZm9yZV9zdGFja2VkOiBiZWZvcmVfc3RhY2tlZFxuICAgICwgYWZ0ZXJfc3RhY2tlZDogYWZ0ZXJfc3RhY2tlZFxuICB9XG5cbn1cblxuXG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZHJhd1N0cmVhbSh0YXJnZXQsYmVmb3JlLGFmdGVyKSB7XG5cbiAgZnVuY3Rpb24gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsYWNjZXNzb3IpIHtcbiAgICB2YXIgYnZvbHVtZSA9IHt9LCBhdm9sdW1lID0ge31cbiAgXG4gICAgdHJ5IHsgdmFyIGJ2b2x1bWUgPSBiWzBdLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLnhdID0gYWNjZXNzb3IoYyk7IHJldHVybiBwIH0se30pIH0gY2F0Y2goZSkge31cbiAgICB0cnkgeyB2YXIgYXZvbHVtZSA9IGFbMF0ucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2MueF0gPSBhY2Nlc3NvcihjKTsgcmV0dXJuIHAgfSx7fSkgfSBjYXRjaChlKSB7fVxuICBcbiAgICB2YXIgdm9sdW1lID0gYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKS5tYXAoeCA9PiBidm9sdW1lW3hdIHx8IDApLmNvbmNhdChidWNrZXRzLm1hcCh4ID0+IGF2b2x1bWVbeF0gfHwgMCkpXG4gIFxuICAgIHJldHVybiB2b2x1bWVcbiAgfVxuXG4gIHZhciBidWNrZXRzID0gWzAsMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geCo2MCB9KVxuXG4gIHZhciBkYXRhID0gc3RyZWFtRGF0YShiZWZvcmUsYWZ0ZXIsYnVja2V0cylcbiAgICAsIGJlZm9yZV9zdGFja2VkID0gZGF0YS5iZWZvcmVfc3RhY2tlZFxuICAgICwgYWZ0ZXJfc3RhY2tlZCA9IGRhdGEuYWZ0ZXJfc3RhY2tlZFxuXG4gIHZhciBiZWZvcmUgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5iZWZvcmUtc3RyZWFtXCIsXCJkaXZcIixkYXRhLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgLmNsYXNzZWQoXCJiZWZvcmUtc3RyZWFtXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjBweFwiKVxuXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwicmdiKDIyNywgMjM1LCAyNDApXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShiZWZvcmUsXCJoM1wiLFwiaDNcIilcbiAgICAudGV4dChcIkNvbnNpZGVyYXRpb24gYW5kIFJlc2VhcmNoIFBoYXNlIElkZW50aWZpY2F0aW9uXCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMHB4XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG5cbiAgdmFyIGlubmVyID0gZDNfdXBkYXRlYWJsZShiZWZvcmUsXCIuaW5uZXJcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwiaW5uZXJcIix0cnVlKVxuXG5cblxuICB2YXIgc3RyZWFtID0gc3RyZWFtX3Bsb3QoaW5uZXIpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAub24oXCJjYXRlZ29yeS5ob3ZlclwiLGZ1bmN0aW9uKHgsdGltZSkge1xuICAgICAgY29uc29sZS5sb2codGltZSlcbiAgICAgIHZhciBiID0gZGF0YS5iZWZvcmVfc3RhY2tlZC5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSB4KVxuICAgICAgdmFyIGEgPSBkYXRhLmFmdGVyX3N0YWNrZWQuZmlsdGVyKHkgPT4geVswXS5rZXkgPT0geClcblxuICAgICAgdmFyIHZvbHVtZSA9IGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMudmFsdWVzLmxlbmd0aCB9KVxuICAgICAgICAsIHBlcmNlbnQgPSBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxmdW5jdGlvbihjKSB7IHJldHVybiBjLnBlcmNlbnQgfSlcbiAgICAgICAgLCBpbXBvcnRhbmNlID0gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsZnVuY3Rpb24oYykgeyByZXR1cm4gYy55IH0pXG5cblxuICAgICAgdmFyIHdyYXAgPSBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgLCB2d3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi52b2x1bWVcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInZvbHVtZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgtNjAsMzApXCIpXG4gICAgICAgICwgcHdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIucGVyY2VudFwiLFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicGVyY2VudFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgtNjAsOTApXCIpXG4gICAgICAgICwgaXdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuaW1wb3J0YW5jZVwiLFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiaW1wb3J0YW5jZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgtNjAsMTUwKVwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodndyYXAsXCJ0ZXh0XCIsXCJ0ZXh0XCIpLnRleHQoXCJWaXNpdHNcIilcbiAgICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGl0bGVcIilcbiAgICAgIHNpbXBsZVRpbWVzZXJpZXModndyYXAsdm9sdW1lKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDAsMilcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHB3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiU2hhcmUgb2YgdGltZVwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKHB3cmFwLHBlcmNlbnQpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMCwyKVwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaXdyYXAsXCJ0ZXh0XCIsXCJ0ZXh0XCIpLnRleHQoXCJJbXBvcnRhbmNlXCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInRpdGxlXCIpXG5cbiAgICAgIHNpbXBsZVRpbWVzZXJpZXMoaXdyYXAsaW1wb3J0YW5jZSlcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgwLDIpXCIpXG5cblxuICAgICAgcmV0dXJuXG4gICAgfSlcbiAgICAuZHJhdygpXG5cbiAgdmFyIGJlZm9yZV9hZ2cgPSBiZWZvcmVfc3RhY2tlZC5yZWR1Y2UoKG8seCkgPT4geyByZXR1cm4geC5yZWR1Y2UoKHAsYykgPT4geyBwW2MueF0gPSAocFtjLnhdIHx8IDApICsgYy55OyByZXR1cm4gcH0sbykgfSx7fSlcbiAgICAsIGFmdGVyX2FnZyA9IGFmdGVyX3N0YWNrZWQucmVkdWNlKChvLHgpID0+IHsgcmV0dXJuIHgucmVkdWNlKChwLGMpID0+IHsgcFtjLnhdID0gKHBbYy54XSB8fCAwKSArIGMueTsgcmV0dXJuIHB9LG8pIH0se30pXG5cblxuICB2YXIgbG9jYWxfYmVmb3JlID0gT2JqZWN0LmtleXMoYmVmb3JlX2FnZykucmVkdWNlKChtaW5hcnIsYykgPT4ge1xuICAgICAgaWYgKG1pbmFyclswXSA+PSBiZWZvcmVfYWdnW2NdKSByZXR1cm4gW2JlZm9yZV9hZ2dbY10sY107XG4gICAgICBpZiAobWluYXJyLmxlbmd0aCA+IDEpIG1pbmFyclswXSA9IC0xO1xuICAgICAgcmV0dXJuIG1pbmFyclxuICAgIH0sW0luZmluaXR5XVxuICApWzFdXG5cbiAgdmFyIGxvY2FsX2FmdGVyID0gT2JqZWN0LmtleXMoYWZ0ZXJfYWdnKS5yZWR1Y2UoKG1pbmFycixjKSA9PiB7XG4gICAgICBpZiAobWluYXJyWzBdID49IGFmdGVyX2FnZ1tjXSkgcmV0dXJuIFthZnRlcl9hZ2dbY10sY107XG4gICAgICBpZiAobWluYXJyLmxlbmd0aCA+IDEpIG1pbmFyclswXSA9IC0xO1xuICAgICAgcmV0dXJuIG1pbmFyclxuICAgIH0sW0luZmluaXR5XVxuICApWzFdXG5cblxuICB2YXIgYmVmb3JlX2xpbmUgPSBidWNrZXRzW2J1Y2tldHMuaW5kZXhPZihwYXJzZUludChsb2NhbF9iZWZvcmUpKV1cbiAgICAsIGFmdGVyX2xpbmUgPSBidWNrZXRzW2J1Y2tldHMuaW5kZXhPZihwYXJzZUludChsb2NhbF9hZnRlcikpXVxuXG4gIHZhciBzdmcgPSBzdHJlYW1cbiAgICAuX3N2Zy5zdHlsZShcIm1hcmdpblwiLFwiYXV0b1wiKS5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG5cblxuICB2YXIgYmxpbmUgPSBkM191cGRhdGVhYmxlKHN2Zy5zZWxlY3RBbGwoXCIuYmVmb3JlLWNhbnZhc1wiKSxcImcubGluZS13cmFwXCIsXCJnXCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwibGluZS13cmFwXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShibGluZSxcImxpbmVcIixcImxpbmVcIilcbiAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAuYXR0cihcInkyXCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieDFcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpKVxuICAgIC5hdHRyKFwieDJcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmxpbmUsXCJ0ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieFwiLCBzdHJlYW0uX2JlZm9yZV9zY2FsZShiZWZvcmVfbGluZSkgKyAxMClcbiAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwic3RhcnRcIilcbiAgICAudGV4dChcIkNvbnNpZGVyYXRpb24gU3RhZ2VcIilcblxuXG4gIHZhciBhbGluZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLnNlbGVjdEFsbChcIi5hZnRlci1jYW52YXNcIiksXCJnLmxpbmUtd3JhcFwiLFwiZ1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImxpbmUtd3JhcFwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYWxpbmUsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAuYXR0cihcInkxXCIsIDApXG4gICAgLmF0dHIoXCJ5MlwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcIngxXCIsIHN0cmVhbS5fYWZ0ZXJfc2NhbGUoYWZ0ZXJfbGluZSkpXG4gICAgLmF0dHIoXCJ4MlwiLCBzdHJlYW0uX2FmdGVyX3NjYWxlKGFmdGVyX2xpbmUpKVxuXG4gIGQzX3VwZGF0ZWFibGUoYWxpbmUsXCJ0ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieFwiLCBzdHJlYW0uX2FmdGVyX3NjYWxlKGFmdGVyX2xpbmUpIC0gMTApXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgIC50ZXh0KFwiVmFsaWRhdGlvbiAvIFJlc2VhcmNoXCIpXG5cblxuXG4gIHJldHVybiB7XG4gICAgXCJjb25zaWRlcmF0aW9uXCI6IFwiXCIgKyBiZWZvcmVfbGluZSxcbiAgICBcInZhbGlkYXRpb25cIjogXCItXCIgKyBhZnRlcl9saW5lXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdCZWZvcmVBbmRBZnRlcih0YXJnZXQsZGF0YSkge1xuXG4gIHZhciBiZWZvcmUgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5iZWZvcmVcIixcImRpdlwiLGRhdGEsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAuY2xhc3NlZChcImJlZm9yZVwiLHRydWUpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIwcHhcIilcblxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcInJnYigyMjcsIDIzNSwgMjQwKVwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJDYXRlZ29yeSBhY3Rpdml0eSBiZWZvcmUgYXJyaXZpbmcgYW5kIGFmdGVyIGxlYXZpbmcgc2l0ZVwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG4gIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcblxuICBkM191cGRhdGVhYmxlKGlubmVyLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJTb3J0IEJ5XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjJweFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNDBweFwiKVxuXG5cblxuICBpbm5lci5zZWxlY3RBbGwoXCJzZWxlY3RcIilcbiAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjE0MHB4XCIpXG5cblxuICB2YXIgY2IgPSBjb21wX2J1YmJsZShiZWZvcmUpXG4gICAgLnJvd3MoZGF0YS5iZWZvcmVfY2F0ZWdvcmllcylcbiAgICAuYWZ0ZXIoZGF0YS5hZnRlcl9jYXRlZ29yaWVzKVxuICAgIC5kcmF3KClcblxuICBjYi5fc3ZnLnN0eWxlKFwiZGlzcGxheVwiLFwiYmxvY2tcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiYXV0b1wiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiYXV0b1wiKVxuXG5cbiAgcmV0dXJuIGlubmVyXG5cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIFBpZSh0YXJnZXQpIHtcbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuUGllLnByb3RvdHlwZSA9IHtcbiAgICByYWRpdXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyYWRpdXNcIix2YWwpXG4gICAgfVxuICAsIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG4gIFxuICAgIHZhciBkID0gZDMuZW50cmllcyh7XG4gICAgICAgIHNhbXBsZTogdGhpcy5fZGF0YS5zYW1wbGVcbiAgICAgICwgcG9wdWxhdGlvbjogdGhpcy5fZGF0YS5wb3B1bGF0aW9uIC0gdGhpcy5fZGF0YS5zYW1wbGVcbiAgICB9KVxuICAgIFxuICAgIHZhciBjb2xvciA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgICAucmFuZ2UoW1wiIzk4YWJjNVwiLCBcIiM4YTg5YTZcIiwgXCIjN2I2ODg4XCIsIFwiIzZiNDg2YlwiLCBcIiNhMDVkNTZcIiwgXCIjZDA3NDNjXCIsIFwiI2ZmOGMwMFwiXSk7XG4gICAgXG4gICAgdmFyIGFyYyA9IGQzLnN2Zy5hcmMoKVxuICAgICAgICAub3V0ZXJSYWRpdXModGhpcy5fcmFkaXVzIC0gMTApXG4gICAgICAgIC5pbm5lclJhZGl1cygwKTtcbiAgICBcbiAgICB2YXIgcGllID0gZDMubGF5b3V0LnBpZSgpXG4gICAgICAgIC5zb3J0KG51bGwpXG4gICAgICAgIC52YWx1ZShmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KTtcbiAgICBcbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcInN2Z1wiLFwic3ZnXCIsZmFsc2UsZnVuY3Rpb24oeCl7cmV0dXJuIDF9KVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIDUwKVxuICAgICAgICAuYXR0cihcImhlaWdodFwiLCA1MilcbiAgXG4gICAgc3ZnID0gZDNfdXBkYXRlYWJsZShzdmcsXCJnXCIsXCJnXCIpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgMjUgKyBcIixcIiArIDI2ICsgXCIpXCIpO1xuICAgIFxuICAgIHZhciBnID0gZDNfc3BsYXQoc3ZnLFwiLmFyY1wiLFwiZ1wiLHBpZShkKSxmdW5jdGlvbih4KXsgcmV0dXJuIHguZGF0YS5rZXkgfSlcbiAgICAgIC5jbGFzc2VkKFwiYXJjXCIsdHJ1ZSlcbiAgXG4gICAgZDNfdXBkYXRlYWJsZShnLFwicGF0aFwiLFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJkXCIsIGFyYylcbiAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gY29sb3IoZC5kYXRhLmtleSkgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcGllKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFBpZSh0YXJnZXQpXG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBwaWUgZnJvbSAnLi4vLi4vZ2VuZXJpYy9waWUnXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN1bW1hcnlCbG9jayhkYXRhLCB0YXJnZXQsIHJhZGl1c19zY2FsZSwgeCkge1xuICB2YXIgZGF0YSA9IGRhdGFcbiAgICAsIGR0aGlzID0gZDNfY2xhc3MoZDMuc2VsZWN0KHRhcmdldCksXCJwaWUtc3VtbWFyeS1ibG9ja1wiKVxuXG4gIHBpZShkdGhpcylcbiAgICAuZGF0YShkYXRhKVxuICAgIC5yYWRpdXMocmFkaXVzX3NjYWxlKGRhdGEucG9wdWxhdGlvbikpXG4gICAgLmRyYXcoKVxuXG4gIHZhciBmdyA9IGQzX2NsYXNzKGR0aGlzLFwiZndcIilcbiAgICAuY2xhc3NlZChcImZ3XCIsdHJ1ZSlcblxuICB2YXIgZncyID0gZDNfY2xhc3MoZHRoaXMsXCJmdzJcIilcbiAgICAudGV4dChkMy5mb3JtYXQoXCIlXCIpKGRhdGEuc2FtcGxlL2RhdGEucG9wdWxhdGlvbikpXG5cbiAgZDNfY2xhc3MoZncsXCJzYW1wbGVcIixcInNwYW5cIilcbiAgICAudGV4dChkMy5mb3JtYXQoXCIsXCIpKGRhdGEuc2FtcGxlKSlcblxuICBkM19jbGFzcyhmdyxcInZzXCIsXCJzcGFuXCIpXG4gICAgLmh0bWwoXCI8YnI+IG91dCBvZiA8YnI+XCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuODhlbVwiKVxuXG4gIGQzX2NsYXNzKGZ3LFwicG9wdWxhdGlvblwiLFwic3BhblwiKVxuICAgIC50ZXh0KGQzLmZvcm1hdChcIixcIikoZGF0YS5wb3B1bGF0aW9uKSlcblxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQge2J1aWxkU3VtbWFyeUJsb2NrfSBmcm9tICcuL3NhbXBsZV92c19wb3AnXG5cbmltcG9ydCAqIGFzIHRpbWVzZXJpZXMgZnJvbSAnLi4vLi4vZ2VuZXJpYy90aW1lc2VyaWVzJ1xuXG5leHBvcnQgZnVuY3Rpb24gZHJhd1RpbWVzZXJpZXModGFyZ2V0LGRhdGEscmFkaXVzX3NjYWxlKSB7XG4gIHZhciB3ID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJkaXYudGltZXNlcmllc1wiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJ0aW1lc2VyaWVzXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNjAlXCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIiwgXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMjdweFwiKVxuXG5cblxuICB2YXIgcSA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZGl2LnRpbWVzZXJpZXMtZGV0YWlsc1wiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJ0aW1lc2VyaWVzLWRldGFpbHNcIix0cnVlKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCI0MCVcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTVweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiNTdweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMjdweFwiKVxuXG5cblxuXG5cbiAgdmFyIHBvcCA9IGQzX3VwZGF0ZWFibGUocSxcIi5wb3BcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwicG9wXCIsdHJ1ZSlcblxuICBkM191cGRhdGVhYmxlKHBvcCxcIi5leFwiLFwic3BhblwiKVxuICAgIC5jbGFzc2VkKFwiZXhcIix0cnVlKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMHB4XCIpXG4gICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiZ3JleVwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG5cbiAgZDNfdXBkYXRlYWJsZShwb3AsXCIudGl0bGVcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIzcHhcIilcbiAgICAudGV4dChcImFsbFwiKVxuXG5cblxuICB2YXIgc2FtcCA9IGQzX3VwZGF0ZWFibGUocSxcIi5zYW1wXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInNhbXBcIix0cnVlKVxuXG4gIGQzX3VwZGF0ZWFibGUoc2FtcCxcIi5leFwiLFwic3BhblwiKVxuICAgIC5jbGFzc2VkKFwiZXhcIix0cnVlKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMHB4XCIpXG4gICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiIzA4MWQ1OFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG5cblxuICBkM191cGRhdGVhYmxlKHNhbXAsXCIudGl0bGVcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIzcHhcIilcbiAgICAudGV4dChcImZpbHRlcmVkXCIpXG5cblxuICB2YXIgZGV0YWlscyA9IGQzX3VwZGF0ZWFibGUocSxcIi5kZWV0c1wiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJkZWV0c1wiLHRydWUpXG5cblxuXG5cbiAgZDNfdXBkYXRlYWJsZSh3LFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJGaWx0ZXJlZCB2ZXJzdXMgQWxsIFZpZXdzXCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMHB4XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG5cblxuXG5cblxuXG4gIHRpbWVzZXJpZXNbJ2RlZmF1bHQnXSh3KVxuICAgIC5kYXRhKHtcImtleVwiOlwieVwiLFwidmFsdWVzXCI6ZGF0YX0pXG4gICAgLmhlaWdodCg4MClcbiAgICAub24oXCJob3ZlclwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgIHZhciB4eCA9IHt9XG4gICAgICB4eFt4LmtleV0gPSB7c2FtcGxlOiB4LnZhbHVlLCBwb3B1bGF0aW9uOiB4LnZhbHVlMiB9XG4gICAgICBkZXRhaWxzLmRhdHVtKHh4KVxuXG4gICAgICBkM191cGRhdGVhYmxlKGRldGFpbHMsXCIudGV4dFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidGV4dFwiLHRydWUpXG4gICAgICAgIC50ZXh0KFwiQCBcIiArIHguaG91ciArIFwiOlwiICsgKHgubWludXRlLmxlbmd0aCA+IDEgPyB4Lm1pbnV0ZSA6IFwiMFwiICsgeC5taW51dGUpIClcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCI0OXB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctcmlnaHRcIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIyMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGRldGFpbHMsXCIucGllXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJwaWVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjE1cHhcIilcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkYXRhID0gT2JqZWN0LmtleXMoeCkubWFwKGZ1bmN0aW9uKGspIHsgcmV0dXJuIHhba10gfSlbMF1cbiAgICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICAgIH0pXG4gICAgfSlcbiAgICAuZHJhdygpXG5cbn1cbiIsImltcG9ydCB7dGFibGV9IGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtkM19jbGFzcywgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcblxuaW1wb3J0IHtkcmF3Q2F0ZWdvcnksIGRyYXdDYXRlZ29yeURpZmZ9IGZyb20gJy4vY2F0ZWdvcnknXG5pbXBvcnQge2RyYXdTdHJlYW0sIGRyYXdCZWZvcmVBbmRBZnRlcn0gZnJvbSAnLi9iZWZvcmVfYW5kX2FmdGVyJ1xuaW1wb3J0IHtidWlsZFN1bW1hcnlCbG9ja30gZnJvbSAnLi9zYW1wbGVfdnNfcG9wJ1xuaW1wb3J0IHtkcmF3VGltZXNlcmllc30gZnJvbSAnLi90aW1pbmcnXG5pbXBvcnQge2RyYXdLZXl3b3JkcywgZHJhd0tleXdvcmREaWZmfSBmcm9tICcuL2tleXdvcmRzJ1xuXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uLy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi8uLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0ICcuL3N1bW1hcnkuY3NzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzdW1tYXJ5X3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU3VtbWFyeVZpZXcodGFyZ2V0KVxufVxuXG5leHBvcnQgY2xhc3MgU3VtbWFyeVZpZXcgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIiwgXCJ0aW1pbmdcIiwgXCJjYXRlZ29yeVwiLCBcImtleXdvcmRzXCIsIFwiYmVmb3JlXCIsIFwiYWZ0ZXJcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgdmFyIHdyYXAgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJzdW1tYXJ5LXZpZXdcIilcblxuICAgIGhlYWRlcih3cmFwKVxuICAgICAgLnRleHQoXCJTdW1tYXJ5XCIpXG4gICAgICAuZHJhdygpXG5cbiAgICB2YXIgdHN3cmFwID0gZDNfY2xhc3Mod3JhcCxcInRzLXJvd1wiKVxuICAgICAgLCBwaWV3cmFwID0gZDNfY2xhc3Mod3JhcCxcInBpZS1yb3dcIilcbiAgICAgICwgY2F0d3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJjYXQtcm93XCIpLmNsYXNzZWQoXCJkYXNoLXJvd1wiLHRydWUpXG4gICAgICAsIGtleXdyYXAgPSBkM19jbGFzcyh3cmFwLFwia2V5LXJvd1wiKVxuICAgICAgLCBiYXdyYXAgPSBkM19jbGFzcyh3cmFwLFwiYmEtcm93XCIpIFxuICAgICAgLCBzdHJlYW13cmFwID0gZDNfY2xhc3Mod3JhcCxcInN0cmVhbS1iYS1yb3dcIikgXG5cblxuICAgIHZhciByYWRpdXNfc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbdGhpcy5fZGF0YS5kb21haW5zLnBvcHVsYXRpb24sdGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uXSlcbiAgICAgIC5yYW5nZShbMjAsMzVdKVxuXG4gICAgdGFibGUocGlld3JhcClcbiAgICAgIC5kYXRhKHtcImtleVwiOlwiVFwiLFwidmFsdWVzXCI6W3RoaXMuZGF0YSgpXX0pXG4gICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgIC5yZW5kZXIoXCJkb21haW5zXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZGF0YSA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLmRhdHVtKClbeC5rZXldO1xuICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICB9KVxuICAgICAgLnJlbmRlcihcImFydGljbGVzXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZGF0YSA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLmRhdHVtKClbeC5rZXldO1xuICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICB9KVxuICAgICAgLnJlbmRlcihcInNlc3Npb25zXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZGF0YSA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLmRhdHVtKClbeC5rZXldO1xuICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICB9KVxuICAgICAgLnJlbmRlcihcInZpZXdzXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZGF0YSA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLmRhdHVtKClbeC5rZXldO1xuICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICB9KVxuICAgICAgLmRyYXcoKVxuXG5cbiAgICBkcmF3VGltZXNlcmllcyh0c3dyYXAsdGhpcy5fdGltaW5nLHJhZGl1c19zY2FsZSlcblxuXG4gICAgdHJ5IHtcbiAgICBkcmF3Q2F0ZWdvcnkoY2F0d3JhcCx0aGlzLl9jYXRlZ29yeSlcbiAgICBkcmF3Q2F0ZWdvcnlEaWZmKGNhdHdyYXAsdGhpcy5fY2F0ZWdvcnkpXG4gICAgfSBjYXRjaChlKSB7fVxuXG4gICAgLy9kcmF3S2V5d29yZHMoa2V5d3JhcCx0aGlzLl9rZXl3b3JkcylcbiAgICAvL2RyYXdLZXl3b3JkRGlmZihrZXl3cmFwLHRoaXMuX2tleXdvcmRzKVxuXG4gICAgdmFyIGlubmVyID0gZHJhd0JlZm9yZUFuZEFmdGVyKGJhd3JhcCx0aGlzLl9iZWZvcmUpXG5cbiAgICBzZWxlY3QoaW5uZXIpXG4gICAgICAub3B0aW9ucyhbXG4gICAgICAgICAge1wia2V5XCI6XCJJbXBvcnRhbmNlXCIsXCJ2YWx1ZVwiOlwicGVyY2VudF9kaWZmXCJ9XG4gICAgICAgICwge1wia2V5XCI6XCJBY3Rpdml0eVwiLFwidmFsdWVcIjpcInNjb3JlXCJ9XG4gICAgICAgICwge1wia2V5XCI6XCJQb3B1bGF0aW9uXCIsXCJ2YWx1ZVwiOlwicG9wXCJ9XG4gICAgICBdKVxuICAgICAgLnNlbGVjdGVkKHRoaXMuX2JlZm9yZS5zb3J0YnkgfHwgXCJcIilcbiAgICAgIC5vbihcInNlbGVjdFwiLCB0aGlzLm9uKFwiYmEuc29ydFwiKSlcbiAgICAgIC5kcmF3KClcblxuXG4gICAgZHJhd1N0cmVhbShzdHJlYW13cmFwLHRoaXMuX2JlZm9yZS5iZWZvcmVfY2F0ZWdvcmllcyx0aGlzLl9iZWZvcmUuYWZ0ZXJfY2F0ZWdvcmllcylcblxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufSAgICAgICAgICAgICAgIFxuIiwiZXhwb3J0IHZhciBidWNrZXRzID0gWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ucmV2ZXJzZSgpLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiBTdHJpbmcoeCo2MCkgfSlcbmJ1Y2tldHMgPSBidWNrZXRzLmNvbmNhdChbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKC14KjYwKSB9KSlcblxuIFxuXG4vLyBSb2xsdXAgb3ZlcmFsbCBiZWZvcmUgYW5kIGFmdGVyIGRhdGFcblxuY29uc3QgYnVja2V0V2l0aFByZWZpeCA9IChwcmVmaXgseCkgPT4gcHJlZml4ICsgeC50aW1lX2RpZmZfYnVja2V0XG5jb25zdCBzdW1WaXNpdHMgPSAoeCkgPT4gZDMuc3VtKHgseSA9PiB5LnZpc2l0cykgXG5cbmV4cG9ydCBmdW5jdGlvbiByb2xsdXBCZWZvcmVBbmRBZnRlcihiZWZvcmVfdXJscywgYWZ0ZXJfdXJscykge1xuXG4gIGNvbnN0IGJlZm9yZV9yb2xsdXAgPSBkMy5uZXN0KClcbiAgICAua2V5KGJ1Y2tldFdpdGhQcmVmaXguYmluZCh0aGlzLFwiXCIpKVxuICAgIC5yb2xsdXAoc3VtVmlzaXRzKVxuICAgIC5tYXAoYmVmb3JlX3VybHMpXG5cbiAgY29uc3QgYWZ0ZXJfcm9sbHVwID0gZDMubmVzdCgpXG4gICAgLmtleShidWNrZXRXaXRoUHJlZml4LmJpbmQodGhpcyxcIi1cIikpXG4gICAgLnJvbGx1cChzdW1WaXNpdHMpXG4gICAgLm1hcChhZnRlcl91cmxzKVxuXG4gIHJldHVybiBidWNrZXRzLm1hcCh4ID0+IGJlZm9yZV9yb2xsdXBbeF0gfHwgYWZ0ZXJfcm9sbHVwW3hdIHx8IDApXG59XG5cblxuXG5cbi8vIEtleXdvcmQgcHJvY2Vzc2luZyBoZWxwZXJzXG5cbmNvbnN0IFNUT1BXT1JEUyA9W1xuICAgIFwidGhhdFwiLFwidGhpc1wiLFwid2hhdFwiLFwiYmVzdFwiLFwibW9zdFwiLFwiZnJvbVwiLFwieW91clwiXG4gICwgXCJoYXZlXCIsXCJmaXJzdFwiLFwid2lsbFwiLFwidGhhblwiLFwic2F5c1wiLFwibGlrZVwiLFwiaW50b1wiLFwiYWZ0ZXJcIixcIndpdGhcIlxuXVxuY29uc3QgY2xlYW5BbmRTcGxpdFVSTCA9IChkb21haW4sdXJsKSA9PiB7XG4gIHJldHVybiB1cmwudG9Mb3dlckNhc2UoKS5zcGxpdChkb21haW4pWzFdLnNwbGl0KFwiL1wiKS5yZXZlcnNlKClbMF0ucmVwbGFjZShcIl9cIixcIi1cIikuc3BsaXQoXCItXCIpXG59XG5jb25zdCBpc1dvcmQgPSAoeCkgPT4ge1xuICByZXR1cm4geC5tYXRjaCgvXFxkKy9nKSA9PSBudWxsICYmIFxuICAgIHguaW5kZXhPZihcIixcIikgPT0gLTEgJiYgXG4gICAgeC5pbmRleE9mKFwiP1wiKSA9PSAtMSAmJiBcbiAgICB4LmluZGV4T2YoXCIuXCIpID09IC0xICYmIFxuICAgIHguaW5kZXhPZihcIjpcIikgPT0gLTEgJiYgXG4gICAgcGFyc2VJbnQoeCkgIT0geCAmJiBcbiAgICB4Lmxlbmd0aCA+IDNcbn1cblxuXG5jb25zdCB1cmxSZWR1Y2VyID0gKHAsYykgPT4ge1xuICBwW2MudXJsXSA9IChwW2MudXJsXSB8fCAwKSArIGMudmlzaXRzXG4gIHJldHVybiBwXG59XG5jb25zdCB1cmxCdWNrZXRSZWR1Y2VyID0gKHByZWZpeCwgcCxjKSA9PiB7XG4gIHBbYy51cmxdID0gcFtjLnVybF0gfHwge31cbiAgcFtjLnVybF1bXCJ1cmxcIl0gPSBjLnVybFxuXG4gIHBbYy51cmxdW3ByZWZpeCArIGMudGltZV9kaWZmX2J1Y2tldF0gPSBjLnZpc2l0c1xuICByZXR1cm4gcFxufVxuY29uc3QgdXJsVG9LZXl3b3Jkc09ialJlZHVjZXIgPSAoZG9tYWluLCBwLGMpID0+IHtcbiAgY2xlYW5BbmRTcGxpdFVSTChkb21haW4sYy5rZXkpLm1hcCh4ID0+IHtcbiAgICBpZiAoaXNXb3JkKHgpICYmIFNUT1BXT1JEUy5pbmRleE9mKHgpID09IC0xKSB7XG4gICAgICBwW3hdID0gcFt4XSB8fCB7fVxuICAgICAgcFt4XS5rZXkgPSB4XG4gICAgICBPYmplY3Qua2V5cyhjLnZhbHVlKS5tYXAocSA9PiB7XG4gICAgICAgIHBbeF1bcV0gPSAocFt4XVtxXSB8fCAwKSArIGMudmFsdWVbcV1cbiAgICAgIH0pXG4gICAgfVxuICB9KVxuICByZXR1cm4gcFxufVxuXG5leHBvcnQgZnVuY3Rpb24gdXJsc0FuZEtleXdvcmRzKGJlZm9yZV91cmxzLCBhZnRlcl91cmxzLCBkb21haW4pIHtcblxuICAgIGNvbnN0IHVybF92b2x1bWUgPSB7fVxuICAgIGJlZm9yZV91cmxzLnJlZHVjZSh1cmxSZWR1Y2VyLHVybF92b2x1bWUpXG4gICAgYWZ0ZXJfdXJscy5yZWR1Y2UodXJsUmVkdWNlcix1cmxfdm9sdW1lKVxuXG4gICAgY29uc3QgdXJsX3RzID0ge31cbiAgICBiZWZvcmVfdXJscy5yZWR1Y2UodXJsQnVja2V0UmVkdWNlci5iaW5kKHRoaXMsXCJcIiksdXJsX3RzKVxuICAgIGFmdGVyX3VybHMucmVkdWNlKHVybEJ1Y2tldFJlZHVjZXIuYmluZCh0aGlzLFwiLVwiKSx1cmxfdHMpXG5cbiAgICBjb25zdCB1cmxzID0gZDMuZW50cmllcyh1cmxfdm9sdW1lKVxuICAgICAgLnNvcnQoKHAsYykgPT4geyByZXR1cm4gZDMuZGVzY2VuZGluZyhwLnZhbHVlLGMudmFsdWUpIH0pXG4gICAgICAuc2xpY2UoMCwxMDAwKVxuICAgICAgLm1hcCh4ID0+IHVybF90c1t4LmtleV0pXG4gICAgICAubWFwKGZ1bmN0aW9uKHgpeyBcbiAgICAgICAgeC5rZXkgPSB4LnVybFxuICAgICAgICB4LnZhbHVlcyA9IGJ1Y2tldHMubWFwKHkgPT4geFt5XSB8fCAwKVxuICAgICAgICB4LnRvdGFsID0gZDMuc3VtKGJ1Y2tldHMubWFwKGZ1bmN0aW9uKGIpIHsgcmV0dXJuIHhbYl0gfHwgMCB9KSlcbiAgICAgICAgcmV0dXJuIHhcbiAgICAgIH0pXG5cbiAgICBjb25zdCBrZXl3b3JkcyA9IHt9XG4gICAgZDMuZW50cmllcyh1cmxfdHMpXG4gICAgICAucmVkdWNlKHVybFRvS2V5d29yZHNPYmpSZWR1Y2VyLmJpbmQoZmFsc2UsZG9tYWluKSxrZXl3b3JkcylcbiAgICBcbiAgICBcbiAgICBjb25zdCBrd3MgPSBPYmplY3Qua2V5cyhrZXl3b3JkcylcbiAgICAgIC5tYXAoZnVuY3Rpb24oaykgeyByZXR1cm4gT2JqZWN0LmFzc2lnbihrZXl3b3Jkc1trXSx7a2V5Omt9KSB9KVxuICAgICAgLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgeC52YWx1ZXMgPSBidWNrZXRzLm1hcCh5ID0+IHhbeV0gfHwgMClcbiAgICAgICAgeC50b3RhbCA9IGQzLnN1bShidWNrZXRzLm1hcChmdW5jdGlvbihiKSB7IHJldHVybiB4W2JdIHx8IDAgfSkpXG4gICAgICAgIHJldHVybiB4XG4gICAgICB9KS5zb3J0KChwLGMpID0+IHtcbiAgICAgICAgcmV0dXJuIGMudG90YWwgLSBwLnRvdGFsXG4gICAgICB9KVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHVybHMsXG4gICAgICBrd3NcbiAgICB9XG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkQ29uc2lkKHNvcnRlZF91cmxzLCBzb3J0ZWRfa3dzLCBiZWZvcmVfcG9zLCBhZnRlcl9wb3MpIHtcbiAgICBjb25zdCBjb25zaWRfYnVja2V0cyA9IGJ1Y2tldHMuZmlsdGVyKCh4LGkpID0+ICEoKGkgPCBiZWZvcmVfcG9zKSB8fCAoaSA+IGJ1Y2tldHMubGVuZ3RoLzIgLSAxICkpIClcbiAgICBjb25zdCB2YWxpZF9idWNrZXRzICA9IGJ1Y2tldHMuZmlsdGVyKCh4LGkpID0+ICEoKGkgPCBidWNrZXRzLmxlbmd0aC8yICkgfHwgKGkgPiBhZnRlcl9wb3MpKSApXG4gICAgZnVuY3Rpb24gY29udGFpbnNSZWR1Y2VyKHgscCxjKSB7XG4gICAgICBwICs9IHhbY10gfHwgMDtcbiAgICAgIHJldHVybiBwXG4gICAgfVxuICAgIGZ1bmN0aW9uIGZpbHRlckJ5QnVja2V0cyhfYnVja2V0cyx4KSB7XG4gICAgICByZXR1cm4gX2J1Y2tldHMucmVkdWNlKGNvbnRhaW5zUmVkdWNlci5iaW5kKGZhbHNlLHgpLDApXG4gICAgfVxuICAgIHZhciB1cmxzX2NvbnNpZCA9IHNvcnRlZF91cmxzLmZpbHRlciggZmlsdGVyQnlCdWNrZXRzLmJpbmQoZmFsc2UsY29uc2lkX2J1Y2tldHMpIClcbiAgICAgICwga3dzX2NvbnNpZCA9IHNvcnRlZF9rd3MuZmlsdGVyKCBmaWx0ZXJCeUJ1Y2tldHMuYmluZChmYWxzZSxjb25zaWRfYnVja2V0cykgKVxuXG4gICAgdmFyIHVybHNfdmFsaWQgPSBzb3J0ZWRfdXJscy5maWx0ZXIoIGZpbHRlckJ5QnVja2V0cy5iaW5kKGZhbHNlLHZhbGlkX2J1Y2tldHMpIClcbiAgICAgICwga3dzX3ZhbGlkID0gc29ydGVkX2t3cy5maWx0ZXIoIGZpbHRlckJ5QnVja2V0cy5iaW5kKGZhbHNlLHZhbGlkX2J1Y2tldHMpIClcblxuICAgIHJldHVybiB7XG4gICAgICAgIHVybHNfY29uc2lkXG4gICAgICAsIHVybHNfdmFsaWRcbiAgICAgICwga3dzX2NvbnNpZFxuICAgICAgLCBrd3NfdmFsaWRcbiAgICB9XG59XG5cblxuXG5cbi8vIEJ1aWxkIGRhdGEgZm9yIHN1bW1hcnlcblxuZnVuY3Rpb24gbnVtVmlld3MoZGF0YSkgeyBcbiAgcmV0dXJuIGRhdGEubGVuZ3RoIFxufVxuZnVuY3Rpb24gYXZnVmlld3MoZGF0YSkge1xuICByZXR1cm4gcGFyc2VJbnQoZGF0YS5yZWR1Y2UoKHAsYykgPT4gcCArIGMudG90YWwsMCkvZGF0YS5sZW5ndGgpXG59XG5mdW5jdGlvbiBtZWRpYW5WaWV3cyhkYXRhKSB7XG4gIHJldHVybiAoZGF0YVtwYXJzZUludChkYXRhLmxlbmd0aC8yKV0gfHwge30pLnRvdGFsIHx8IDBcbn1cbmZ1bmN0aW9uIHN1bW1hcml6ZVZpZXdzKG5hbWUsIGZuLCBhbGwsIGNvbnNpZCwgdmFsaWQpIHtcbiAgcmV0dXJuIHtuYW1lOiBuYW1lLCBhbGw6IGZuKGFsbCksIGNvbnNpZGVyYXRpb246IGZuKGNvbnNpZCksIHZhbGlkYXRpb246IGZuKHZhbGlkKX1cbn1cbmV4cG9ydCBmdW5jdGlvbiBzdW1tYXJpemVEYXRhKGFsbCxjb25zaWQsdmFsaWQpIHtcbiAgcmV0dXJuIFtcbiAgICAgIHN1bW1hcml6ZVZpZXdzKFwiRGlzdGluY3QgVVJMc1wiLG51bVZpZXdzLGFsbCxjb25zaWQsdmFsaWQpXG4gICAgLCBzdW1tYXJpemVWaWV3cyhcIkF2ZXJhZ2UgVmlld3NcIixhdmdWaWV3cyxhbGwsY29uc2lkLHZhbGlkKVxuICAgICwgc3VtbWFyaXplVmlld3MoXCJNZWRpYW4gVmlld3NcIixtZWRpYW5WaWV3cyxhbGwsY29uc2lkLHZhbGlkKVxuICBdXG59XG5cblxuXG4vLyBQcm9jZXNzIHJlbGF0aXZlIHRpbWluZyBkYXRhXG5cbmV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzRGF0YShiZWZvcmVfdXJscywgYWZ0ZXJfdXJscywgYmVmb3JlX3BvcywgYWZ0ZXJfcG9zLCBkb21haW4pIHtcblxuICAgIGNvbnN0IHsgdXJscyAsIGt3cyB9ID0gdXJsc0FuZEtleXdvcmRzKGJlZm9yZV91cmxzLCBhZnRlcl91cmxzLCBkb21haW4pXG4gICAgY29uc3QgeyB1cmxzX2NvbnNpZCAsIHVybHNfdmFsaWQgLCBrd3NfY29uc2lkICwga3dzX3ZhbGlkIH0gPSB2YWxpZENvbnNpZCh1cmxzLCBrd3MsIGJlZm9yZV9wb3MsIGFmdGVyX3BvcylcblxuICAgIGNvbnN0IHVybF9zdW1tYXJ5ID0gc3VtbWFyaXplRGF0YSh1cmxzLCB1cmxzX2NvbnNpZCwgdXJsc192YWxpZClcbiAgICBjb25zdCBrd3Nfc3VtbWFyeSA9IHN1bW1hcml6ZURhdGEoa3dzLCBrd3NfY29uc2lkLCBrd3NfdmFsaWQgKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHVybF9zdW1tYXJ5LFxuICAgICAga3dzX3N1bW1hcnksXG4gICAgICB1cmxzLFxuICAgICAgdXJsc19jb25zaWQgLFxuICAgICAgdXJsc192YWxpZCAsXG4gICAgICBrd3MsXG4gICAgICBrd3NfY29uc2lkICxcbiAgICAgIGt3c192YWxpZCBcbiAgICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBkM19jbGFzcywgbm9vcCwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IHt0YWJsZSwgc3VtbWFyeV90YWJsZX0gZnJvbSAndGFibGUnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXMsIGJlZm9yZV9hZnRlcl90aW1lc2VyaWVzfSBmcm9tICdjaGFydCdcbmltcG9ydCB7dGFidWxhcl90aW1lc2VyaWVzLCB2ZXJ0aWNhbF9vcHRpb259IGZyb20gJ2NvbXBvbmVudCdcblxuaW1wb3J0IHtyb2xsdXBCZWZvcmVBbmRBZnRlciwgcHJvY2Vzc0RhdGEsIGJ1Y2tldHN9IGZyb20gJy4vcmVmaW5lX3JlbGF0aXZlX3Byb2Nlc3MnXG5pbXBvcnQgJy4vcmVmaW5lX3JlbGF0aXZlLmNzcydcblxuXG5mdW5jdGlvbiBzZWxlY3RPcHRpb25SZWN0KHRkLG9wdGlvbnMsYmVmb3JlX3BvcyxhZnRlcl9wb3MpIHtcblxuICB2YXIgc3Vic2V0ID0gdGQuc2VsZWN0QWxsKFwic3ZnXCIpLnNlbGVjdEFsbChcInJlY3RcIilcbiAgICAuYXR0cihcImZpbGxcIix1bmRlZmluZWQpLmZpbHRlcigoeCxpKSA9PiB7XG4gICAgICB2YXIgdmFsdWUgPSBvcHRpb25zLmZpbHRlcih4ID0+IHguc2VsZWN0ZWQpWzBdLnZhbHVlXG4gICAgICBpZiAodmFsdWUgPT0gXCJhbGxcIikgcmV0dXJuIGZhbHNlXG4gICAgICBpZiAodmFsdWUgPT0gXCJjb25zaWRlcmF0aW9uXCIpIHJldHVybiAoaSA8IGJlZm9yZV9wb3MpIHx8IChpID4gYnVja2V0cy5sZW5ndGgvMiAtIDEgKVxuICAgICAgaWYgKHZhbHVlID09IFwidmFsaWRhdGlvblwiKSByZXR1cm4gKGkgPCBidWNrZXRzLmxlbmd0aC8yICkgfHwgKGkgPiBhZnRlcl9wb3MpXG4gICAgfSlcblxuICBzdWJzZXQuYXR0cihcImZpbGxcIixcImdyZXlcIilcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZWZpbmVfcmVsYXRpdmUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgUmVmaW5lUmVsYXRpdmUodGFyZ2V0KVxufVxuXG5jbGFzcyBSZWZpbmVSZWxhdGl2ZSBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKHRhcmdldClcbiAgICB0aGlzLl9vcHRpb25zID0gW1xuICAgICAgICB7XCJrZXlcIjpcIkFsbFwiLFwidmFsdWVcIjpcImFsbFwiLCBcInNlbGVjdGVkXCI6MX1cbiAgICAgICwge1wia2V5XCI6XCJDb25zaWRlcmF0aW9uXCIsXCJ2YWx1ZVwiOlwiY29uc2lkZXJhdGlvblwiLCBcInNlbGVjdGVkXCI6MH1cbiAgICAgICwge1wia2V5XCI6XCJWYWxpZGF0aW9uXCIsXCJ2YWx1ZVwiOlwidmFsaWRhdGlvblwiLCBcInNlbGVjdGVkXCI6MH1cbiAgICBdXG4gICAgdGhpcy5fc3VtbWFyeV9oZWFkZXJzID0gW1xuICAgICAgICB7XCJrZXlcIjpcIm5hbWVcIixcInZhbHVlXCI6XCJcIn1cbiAgICAgICwge1wia2V5XCI6XCJhbGxcIixcInZhbHVlXCI6XCJBbGxcIn1cbiAgICAgICwge1wia2V5XCI6XCJjb25zaWRlcmF0aW9uXCIsXCJ2YWx1ZVwiOlwiQ29uc2lkZXJhdGlvblwifVxuICAgICAgLCB7XCJrZXlcIjpcInZhbGlkYXRpb25cIixcInZhbHVlXCI6XCJWYWxpZGF0aW9uXCJ9XG4gICAgXVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJkb21haW5cIixcInN0YWdlc1wiLFwiYmVmb3JlX3VybHNcIixcImFmdGVyX3VybHNcIixcInN1bW1hcnlfaGVhZGVyc1wiLFwib3B0aW9uc1wiXSB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciB0ZCA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcInJlZmluZS1yZWxhdGl2ZVwiKVxuICAgIHZhciBiZWZvcmVfdXJscyA9IHRoaXMuX2JlZm9yZV91cmxzXG4gICAgICAsIGFmdGVyX3VybHMgPSB0aGlzLl9hZnRlcl91cmxzXG4gICAgICAsIGQgPSB0aGlzLl9kYXRhXG4gICAgICAsIHN0YWdlcyA9IHRoaXMuX3N0YWdlc1xuICAgICAgLCBzdW1tYXJ5X2hlYWRlcnMgPSB0aGlzLl9zdW1tYXJ5X2hlYWRlcnNcbiAgICAgICwgb3B0aW9ucyA9IHRoaXMuX29wdGlvbnNcblxuICAgIHZhciBiZWZvcmVfcG9zLCBhZnRlcl9wb3M7XG5cbiAgICBidWNrZXRzLm1hcChmdW5jdGlvbih4LGkpIHtcbiAgICAgICBpZiAoc3RhZ2VzLmNvbnNpZGVyYXRpb24gPT0geCkgYmVmb3JlX3BvcyA9IGlcbiAgICAgICBpZiAoc3RhZ2VzLnZhbGlkYXRpb24gPT0geCkgYWZ0ZXJfcG9zID0gaVxuICAgIH0pXG5cbiAgICB2YXIgb3ZlcmFsbF9yb2xsdXAgPSByb2xsdXBCZWZvcmVBbmRBZnRlcihiZWZvcmVfdXJscywgYWZ0ZXJfdXJscylcbiAgICB2YXIge1xuICAgICAgICB1cmxfc3VtbWFyeVxuICAgICAgLCB1cmxzXG4gICAgICAsIHVybHNfY29uc2lkXG4gICAgICAsIHVybHNfdmFsaWRcblxuICAgICAgLCBrd3Nfc3VtbWFyeVxuICAgICAgLCBrd3NcbiAgICAgICwga3dzX2NvbnNpZFxuICAgICAgLCBrd3NfdmFsaWQgXG5cbiAgICB9ID0gcHJvY2Vzc0RhdGEoYmVmb3JlX3VybHMsYWZ0ZXJfdXJscyxiZWZvcmVfcG9zLGFmdGVyX3BvcyxkLmRvbWFpbilcblxuXG5cblxuICAgIGNvbnN0IHN1bW1hcnlfcm93ID0gZDNfY2xhc3ModGQsXCJzdW1tYXJ5LXJvd1wiKVxuXG4gICAgZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJ0aXRsZVwiKVxuICAgICAgLnRleHQoXCJCZWZvcmUgYW5kIEFmdGVyOiBcIiArIGQuZG9tYWluKVxuXG4gICAgYmVmb3JlX2FmdGVyX3RpbWVzZXJpZXMoc3VtbWFyeV9yb3cpXG4gICAgICAuZGF0YShvdmVyYWxsX3JvbGx1cClcbiAgICAgIC5iZWZvcmUoYmVmb3JlX3BvcylcbiAgICAgIC5hZnRlcihhZnRlcl9wb3MpXG4gICAgICAuZHJhdygpXG5cbiAgICB2YXIgdm9wdGlvbnMgPSB2ZXJ0aWNhbF9vcHRpb24oc3VtbWFyeV9yb3cpXG4gICAgICAub3B0aW9ucyhvcHRpb25zKVxuICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgb3B0aW9ucy5tYXAoeiA9PiB6LnNlbGVjdGVkID0geC5rZXkgPT0gei5rZXkgPyAxOiAwKVxuICAgICAgICB2b3B0aW9uc1xuICAgICAgICAgIC5vcHRpb25zKG9wdGlvbnMpIFxuICAgICAgICAgIC5kcmF3KClcblxuICAgICAgICBzZWxlY3RPcHRpb25SZWN0KHRkLG9wdGlvbnMsYmVmb3JlX3BvcyxhZnRlcl9wb3MpXG4gICAgICB9KVxuICAgICAgLmRyYXcoKVxuXG4gICAgZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJkZXNjcmlwdGlvblwiKVxuICAgICAgLnRleHQoXCJTZWxlY3QgZG9tYWlucyBhbmQga2V5d29yZHMgdG8gYnVpbGQgYW5kIHJlZmluZSB5b3VyIGdsb2JhbCBmaWx0ZXJcIilcblxuXG5cblxuICAgIGNvbnN0IHRhYmxlcyA9IGQzX2NsYXNzKHRkLFwidGFibGVzLXJvd1wiKVxuXG4gICAgc3VtbWFyeV90YWJsZShkM19jbGFzcyh0YWJsZXMsXCJ1cmxcIikpXG4gICAgICAudGl0bGUoXCJVUkwgU3VtbWFyeVwiKVxuICAgICAgLmRhdGEodXJsX3N1bW1hcnkpXG4gICAgICAuaGVhZGVycyhzdW1tYXJ5X2hlYWRlcnMpXG4gICAgICAuZHJhdygpXG5cbiAgICBzdW1tYXJ5X3RhYmxlKGQzX2NsYXNzKHRhYmxlcyxcImt3XCIpKVxuICAgICAgLnRpdGxlKFwiS2V5d29yZCBTdW1tYXJ5XCIpXG4gICAgICAuZGF0YShrd3Nfc3VtbWFyeSlcbiAgICAgIC5oZWFkZXJzKHN1bW1hcnlfaGVhZGVycylcbiAgICAgIC5kcmF3KClcblxuXG5cblxuICAgIGNvbnN0IG1vZGlmeSA9IGQzX2NsYXNzKHRkLFwibW9kaWZ5LXJvd1wiKVxuXG4gICAgZDNfY2xhc3MobW9kaWZ5LFwiYWN0aW9uLWhlYWRlclwiKVxuICAgICAgLnRleHQoXCJFeHBsb3JlIGFuZCBSZWZpbmVcIilcblxuICAgIHRhYnVsYXJfdGltZXNlcmllcyhkM19jbGFzcyhtb2RpZnksXCJ1cmwtZGVwdGhcIikpXG4gICAgICAuaGVhZGVycyhbXCJCZWZvcmVcIixcIkFmdGVyXCJdKVxuICAgICAgLmxhYmVsKFwiVVJMXCIpXG4gICAgICAuZGF0YSh1cmxzKVxuICAgICAgLnNwbGl0KHRoaXMuZG9tYWluKCkpXG4gICAgICAuZHJhdygpXG5cbiAgICB0YWJ1bGFyX3RpbWVzZXJpZXMoZDNfY2xhc3MobW9kaWZ5LFwia3ctZGVwdGhcIikpXG4gICAgICAuaGVhZGVycyhbXCJCZWZvcmVcIixcIkFmdGVyXCJdKVxuICAgICAgLmxhYmVsKFwiS2V5d29yZHNcIilcbiAgICAgIC5kYXRhKGt3cylcbiAgICAgIC5kcmF3KClcblxuICB9XG5cbn1cblxuXG4iLCJ2YXIgYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKHgqNjApIH0pXG5idWNrZXRzID0gYnVja2V0cy5jb25jYXQoWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZygteCo2MCkgfSkpXG5cbmV4cG9ydCBjb25zdCB0aW1lQnVja2V0cyA9IGJ1Y2tldHM7XG5cblxuY29uc3QgZm9ybWF0TmFtZSA9IGZ1bmN0aW9uKHgpIHtcblxuICBpZiAoeCA8IDApIHggPSAteFxuXG4gIGlmICh4ID09IDM2MDApIHJldHVybiBcIjEgaHJcIlxuICBpZiAoeCA8IDM2MDApIHJldHVybiB4LzYwICsgXCIgbWluc1wiIFxuXG4gIGlmICh4ID09IDg2NDAwKSByZXR1cm4gXCIxIGRheVwiXG4gIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gIHJldHVybiB4LzM2MDAgKyBcIiBocnNcIlxufVxuXG5leHBvcnQgY29uc3QgdGltaW5nSGVhZGVycyA9IGJ1Y2tldHMubWFwKHggPT4geyByZXR1cm4ge1wia2V5XCI6eCwgXCJ2YWx1ZVwiOmZvcm1hdE5hbWUoeCksIFwic2VsZWN0ZWRcIjp0cnVlfSB9KVxuIiwiaW1wb3J0IHt0aW1lQnVja2V0c30gZnJvbSAnLi9yZWxhdGl2ZV90aW1pbmdfY29uc3RhbnRzJ1xuXG5cbmV4cG9ydCBjb25zdCBjYXRlZ29yeVdlaWdodHMgPSAoY2F0ZWdvcmllcykgPT4ge1xuICByZXR1cm4gY2F0ZWdvcmllcy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgcFtjLmtleV0gPSAoMSArIGMudmFsdWVzWzBdLnBlcmNlbnRfZGlmZilcbiAgICAgIHJldHVybiBwXG4gICAgfSx7fSlcbn1cblxudmFyIHQxID0gdGltZUJ1Y2tldHMuc2xpY2UoMCwxMSkubWFwKHggPT4gcGFyc2VJbnQoeCkgKS5yZXZlcnNlKClcbnZhciB0MiA9IFswXS5jb25jYXQodDEpXG52YXIgdDMgPSB0MS5tYXAoKHYsaSkgPT4gaSA/ICh2IC0gdDJbaV0pL3QyW2ldIDogMSApXG5cbmV4cG9ydCBjb25zdCBub3JtYWxpemVycyA9IHQzLnJlZHVjZSgocCxjKSA9PiB7XG4gIHBbcC5sZW5ndGhdID0gcFtwLmxlbmd0aC0xXSpjXG4gIHBbcC5sZW5ndGhdID0gcFtwLmxlbmd0aC0xXSpjKigxKygocC5sZW5ndGgtMSkvMTApKVxuICByZXR1cm4gcFxufSxbMV0pXG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemUodG90YWxzKSB7XG5cbiAgdmFyIG5vcm1kID0gbm9ybWFsaXplcnMuc2xpY2UoMSkubWFwKCh4LGkpID0+IHtcbiAgICB2YXIgayA9IHQxW2ldXG4gICAgcmV0dXJuICh0b3RhbHNbU3RyaW5nKGspXSB8fCAwKS94XG4gIH0pXG5cbiAgdmFyIGJhc2VWYWx1ZSA9IGQzLnN1bShub3JtZCkvbm9ybWQuZmlsdGVyKHggPT4geCkubGVuZ3RoXG4gIHZhciBlc3RpbWF0ZXMgPSBub3JtYWxpemVycy5tYXAoeCA9PiB4KmJhc2VWYWx1ZSlcblxuICB2YXIgbm9ybWFsaXplZCA9IHQxLm1hcCgoayxpKSA9PiAxICsgKCh0b3RhbHNbU3RyaW5nKGspXSB8fCAwKSAvIGVzdGltYXRlc1tpXSkgKVxuICAgIC5tYXAoTWF0aC5sb2cpXG5cbiAgdmFyIG5vcm1hbGl6ZWQyID0gdDEubWFwKChrLGkpID0+IDEgKyAoKHRvdGFsc1tcIi1cIiArIFN0cmluZyhrKV0gfHwgMCkgLyBlc3RpbWF0ZXNbaV0pIClcbiAgICAubWFwKE1hdGgubG9nKVxuXG4gIHZhciB2YWx1ZXMgPSBub3JtYWxpemVkLnJldmVyc2UoKS5jb25jYXQobm9ybWFsaXplZDIpLm1hcCh4ID0+IHggPyB4IDogXCJcIiApXG5cbiAgcmV0dXJuIHZhbHVlc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplUm93KHgpIHtcbiAgdmFyIG5vcm1lZCA9IG5vcm1hbGl6ZSh4KVxuICB2YXIgb2JqID0ge31cbiAgdDEuc2xpY2UoKS5yZXZlcnNlKCkuY29uY2F0KHQxLm1hcCh4ID0+IFwiLVwiICsgeCkpLm1hcCgoeCxpKSA9PiBvYmpbeF0gPSBub3JtZWRbaV0pXG5cbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe2tleTp4LmtleX0sb2JqKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdG90YWxzQnlUaW1lKHZhbHVlcykge1xuICByZXR1cm4gdmFsdWVzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgT2JqZWN0LmtleXMoYykubWFwKGsgPT4ge1xuICAgICAgcFtrXSArPSBjW2tdXG4gICAgfSlcbiAgICByZXR1cm4gcFxuICB9LCB0aW1lQnVja2V0cy5yZWR1Y2UoKHAsYykgPT4geyBwW2NdID0gMDsgcmV0dXJuIHAgfSwge30pKVxufVxuXG5cbmV4cG9ydCBjb25zdCBjb21wdXRlU2NhbGUgPSAoZGF0YSkgPT4ge1xuICBjb25zdCBtYXggPSBkYXRhLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgT2JqZWN0LmtleXMoYykuZmlsdGVyKHogPT4geiAhPSBcImRvbWFpblwiICYmIHogIT0gXCJ3ZWlnaHRlZFwiKS5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgcCA9IGNbeF0gPiBwID8gY1t4XSA6IHBcbiAgICB9KVxuICBcbiAgICByZXR1cm4gcFxuICB9LDApXG5cbiAgcmV0dXJuIGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFswLC44XSkuZG9tYWluKFswLE1hdGgubG9nKG1heCldKVxufVxuIiwiaW1wb3J0IHtpZGVudGl0eSwgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIGQzX2NsYXNzLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uLy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5pbXBvcnQgcmVmaW5lX3JlbGF0aXZlIGZyb20gJy4vcmVmaW5lX3JlbGF0aXZlJ1xuaW1wb3J0IHtjYXRlZ29yeVdlaWdodHMsIGNvbXB1dGVTY2FsZSwgbm9ybWFsaXplUm93LCBub3JtYWxpemUsIHRvdGFsc0J5VGltZX0gZnJvbSAnLi9yZWxhdGl2ZV90aW1pbmdfcHJvY2VzcydcbmltcG9ydCB7dGltaW5nSGVhZGVycywgdGltZUJ1Y2tldHN9IGZyb20gJy4vcmVsYXRpdmVfdGltaW5nX2NvbnN0YW50cydcblxuaW1wb3J0IHtkcmF3U3RyZWFtfSBmcm9tICcuLi9zdW1tYXJ5L2JlZm9yZV9hbmRfYWZ0ZXInXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuXG5pbXBvcnQgdGltZXNlcmllcyBmcm9tICcuLi8uLi9nZW5lcmljL3RpbWVzZXJpZXMnXG5cblxuaW1wb3J0ICcuL3JlbGF0aXZlX3RpbWluZy5jc3MnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlbGF0aXZlX3RpbWluZyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBSZWxhdGl2ZVRpbWluZyh0YXJnZXQpXG59XG5cbmNsYXNzIFJlbGF0aXZlVGltaW5nIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJub3JtYWxpemVcIiwgXCJzb3J0XCIsIFwiYXNjZW5kaW5nXCJdIH1cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgICAsIGZpbHRlcmVkID0gZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnNlbGVjdGVkfSlcbiAgICAgICwgc2VsZWN0ZWQgPSBmaWx0ZXJlZC5sZW5ndGggPyBmaWx0ZXJlZFswXSA6IGRhdGFbMF1cblxuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwic3VtbWFyeS13cmFwXCIpXG5cbiAgICBoZWFkZXIod3JhcClcbiAgICAgIC50ZXh0KHNlbGVjdGVkLmtleSlcbiAgICAgIC5vcHRpb25zKGRhdGEpXG4gICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCkgeyB0aGlzLm9uKFwic2VsZWN0XCIpKHgpIH0uYmluZCh0aGlzKSlcbiAgICAgIC5kcmF3KClcblxuICAgIHZhciB0b3RhbHNfYnlfdGltZT0gdG90YWxzQnlUaW1lKHNlbGVjdGVkLnZhbHVlcylcbiAgICB2YXIgdmFsdWVzID0gbm9ybWFsaXplKHRvdGFsc19ieV90aW1lKVxuXG4gICAgdmFyIHRzID0gZDNfY2xhc3Mod3JhcCxcInRpbWVzZXJpZXMtcm93XCIpXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodHMsXCJzdmdcIixcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiw5MzYpLmF0dHIoXCJoZWlnaHRcIiw4MCkuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMjU0cHhcIilcblxuICAgIHNpbXBsZVRpbWVzZXJpZXMoc3ZnLHZhbHVlcyw2ODIsODAsLTIpXG5cblxuICAgIHZhciBiYXdyYXAgPSBkM19jbGFzcyh3cmFwLFwiYmEtcm93XCIpXG5cblxuXG5cbiAgICBjb25zdCBzb3J0ZWRfdGFidWxhciA9IHNlbGVjdGVkLnZhbHVlcy5maWx0ZXIoeCA9PiB4LmtleSAhPSBcIlwiKVxuICAgICAgLm1hcCh0aGlzLm5vcm1hbGl6ZSgpID8gbm9ybWFsaXplUm93IDogaWRlbnRpdHkpXG4gICAgICAuc2xpY2UoMCwxMDAwKVxuXG4gICAgY29uc3Qgb3NjYWxlID0gY29tcHV0ZVNjYWxlKHNvcnRlZF90YWJ1bGFyKVxuICAgIGNvbnN0IGhlYWRlcnMgPSBbe1wia2V5XCI6XCJrZXlcIiwgXCJ2YWx1ZVwiOnNlbGVjdGVkLmtleS5yZXBsYWNlKFwiVG9wIFwiLFwiXCIpfV0uY29uY2F0KHRpbWluZ0hlYWRlcnMpXG5cblxuICAgIGNvbnN0IF9kZWZhdWx0ID0gXCI2MDBcIlxuICAgIGNvbnN0IHMgPSB0aGlzLnNvcnQoKSBcbiAgICBjb25zdCBhc2MgPSB0aGlzLmFzY2VuZGluZygpIFxuXG5cbiAgICBjb25zdCBzZWxlY3RlZEhlYWRlciA9IGhlYWRlcnMuZmlsdGVyKHggPT4geC5rZXkgPT0gcylcbiAgICBjb25zdCBzb3J0YnkgPSBzZWxlY3RlZEhlYWRlci5sZW5ndGggPyBzZWxlY3RlZEhlYWRlclswXS5rZXkgOiBfZGVmYXVsdFxuXG4gICAgdGFibGUoYmF3cmFwKVxuICAgICAgLnRvcCgxNDApXG4gICAgICAuaGVhZGVycyhoZWFkZXJzKVxuICAgICAgLnNvcnQoc29ydGJ5LGFzYylcbiAgICAgIC5vbihcInNvcnRcIiwgdGhpcy5vbihcInNvcnRcIikpXG4gICAgICAub24oXCJleHBhbmRcIixmdW5jdGlvbihkLHRkKSB7XG5cbiAgICAgICAgcmVmaW5lX3JlbGF0aXZlKHRkKVxuICAgICAgICAgIC5kYXRhKGQpXG4gICAgICAgICAgLmRvbWFpbihkLmRvbWFpbilcbiAgICAgICAgICAuc3RhZ2VzKHN0YWdlcylcbiAgICAgICAgICAuYmVmb3JlX3VybHMoZGF0YS5iZWZvcmUuZmlsdGVyKHkgPT4geS5kb21haW4gPT0gZC5kb21haW4pIClcbiAgICAgICAgICAuYWZ0ZXJfdXJscyhkYXRhLmFmdGVyLmZpbHRlcih5ID0+IHkuZG9tYWluID09IGQuZG9tYWluKSlcbiAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKVxuICAgICAgICAgIC5kcmF3KClcblxuICAgICAgfSlcbiAgICAgIC5vbihcImRyYXdcIixmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcInRoXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcInNwYW5cIilcbiAgICAgICAgICAuY2xhc3NlZChcImxlc3MtdGhhblwiLCAoeCkgPT4geyByZXR1cm4gcGFyc2VJbnQoeC5rZXkpID09IHgua2V5ICYmIHgua2V5IDwgMCB9KVxuICAgICAgICAgIC5jbGFzc2VkKFwiZ3JlYXRlci10aGFuXCIsICh4KSA9PiB7IHJldHVybiBwYXJzZUludCh4LmtleSkgPT0geC5rZXkgJiYgeC5rZXkgPiAwIH0pXG5cbiAgICAgICAgdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcIi50YWJsZS1vcHRpb25cIilcbiAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJub25lXCIpXG5cbiAgICAgICAgdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm5vdCg6Zmlyc3QtY2hpbGQpXCIpXG4gICAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJpZ2h0XCIsXCIxcHggc29saWQgd2hpdGVcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjBweFwiKVxuICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX19beFsna2V5J11dIHx8IDBcbiAgICAgICAgICAgIHJldHVybiBcInJnYmEoNzAsIDEzMCwgMTgwLFwiICsgb3NjYWxlKE1hdGgubG9nKHZhbHVlKzEpKSArIFwiKVwiXG4gICAgICAgICAgfSkgICAgIFxuICAgICAgfSlcbiAgICAgIC5vcHRpb25fdGV4dChcIjxkaXYgc3R5bGU9J3dpZHRoOjQwcHg7dGV4dC1hbGlnbjpjZW50ZXInPiYjNjUyOTE7PC9kaXY+XCIpXG4gICAgICAuZGF0YSh7XCJ2YWx1ZXNcIjpzb3J0ZWRfdGFidWxhcn0pXG4gICAgICAuZHJhdygpXG5cbiAgfVxufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGFnZ3JlZ2F0ZUNhdGVnb3J5KHVybHMpIHtcbiAgY29uc3QgY2F0ZWdvcmllcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHsgXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwiYXJ0aWNsZXNcIjogdlxuICAgICAgICAsIFwidmFsdWVcIjogZDMuc3VtKHYseCA9PiB4LnVuaXF1ZXMpXG4gICAgICB9IFxuICAgIH0pXG4gICAgLmVudHJpZXModXJscylcbiAgICAubWFwKGZ1bmN0aW9uKHYpIHsgcmV0dXJuIE9iamVjdC5hc3NpZ24odi52YWx1ZXMse2tleTogdi5rZXl9KSB9KVxuXG4gIGNvbnN0IHRvdGFsID0gZDMuc3VtKGNhdGVnb3JpZXMsYyA9PiBjLnZhbHVlKVxuXG4gIGNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnBlcmNlbnQgPSB4LnZhbHVlIC8gdG90YWxcbiAgfSlcblxuICByZXR1cm4gY2F0ZWdvcmllc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWdncmVnYXRlQ2F0ZWdvcnlIb3VyKHVybHMpIHtcbiAgcmV0dXJuIGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICsgeC5ob3VyICsgeC5taW51dGV9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHZbMF0ucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgLCBcImhvdXJcIjogdlswXS5ob3VyXG4gICAgICAgICwgXCJtaW51dGVcIjogdlswXS5taW51dGUgXG4gICAgICAgICwgXCJjb3VudFwiOiB2LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLmNvdW50IH0sMClcbiAgICAgICAgLCBcImFydGljbGVzXCI6IHZcbiAgICAgIH1cbiAgICB9KVxuICAgIC5lbnRyaWVzKHVybHMpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlcyB9KVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcnlSZWxhdGl2ZVNpemUodXJscykge1xuICByZXR1cm4gZDMubmVzdCgpXG4gICAgLmtleSh4ID0+IHgucGFyZW50X2NhdGVnb3J5X25hbWUpXG4gICAgLnJvbGx1cCh2ID0+IHZbMF0uY2F0ZWdvcnlfaWRmID8gMS92WzBdLmNhdGVnb3J5X2lkZiA6IDApXG4gICAgLm1hcCh1cmxzKSBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3J5UGVyY2VudCh1cmxzKSB7XG5cbiAgY29uc3QgcmVsYXRpdmVfc2l6ZSA9IGNhdGVnb3J5UmVsYXRpdmVTaXplKHVybHMpXG4gIGNvbnN0IHRvdGFsID0gZDMuc3VtKE9iamVjdC5rZXlzKGNhdGVnb3JpZXMpLm1hcCh4ID0+IGNhdGVnb3JpZXNbeF0pKVxuICBjb25zdCBwZXJjZW50ID0ge31cblxuICBPYmplY3Qua2V5cyhjYXRlZ29yaWVzKS5tYXAoeCA9PiB7XG4gICAgcGVyY2VudFt4XSA9IHJlbGF0aXZlX3NpemVbeF0vdG90YWxcbiAgfSlcblxuICByZXR1cm4gcGVyY2VudFxufVxuXG5mdW5jdGlvbiBjYXRlZ29yeVJlZHVjZXIoZ3JvdXApIHtcbiAgcmV0dXJuIGdyb3VwLnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICAgIHAudmlld3MgKz0gYy5jb3VudFxuICAgICAgcC5zZXNzaW9ucyArPSBjLnVuaXF1ZXNcbiAgICAgIHJldHVybiBwXG4gICAgfSxcbiAgICB7IFxuICAgICAgICBhcnRpY2xlczoge31cbiAgICAgICwgdmlld3M6IDBcbiAgICAgICwgc2Vzc2lvbnM6IDBcbiAgICAgICwgcG9wX3NpemU6IGdyb3VwWzBdLmNhdGVnb3J5X2lkZiA/IDEvZ3JvdXBbMF0uY2F0ZWdvcnlfaWRmIDogMFxuICAgIH0pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yeVJvbGwodXJscykge1xuICBjb25zdCByb2xsZWQgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKGspIHsgcmV0dXJuIGsucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAucm9sbHVwKGNhdGVnb3J5UmVkdWNlcilcbiAgICAuZW50cmllcyh1cmxzKVxuXG4gIGNvbnN0IHBvcF90b3RhbCA9IGQzLnN1bShyb2xsZWQseCA9PiB4LnZhbHVlcy5wb3Bfc2l6ZSlcbiAgY29uc3Qgdmlld3NfdG90YWwgPSBkMy5zdW0ocm9sbGVkLHggPT4geC52YWx1ZXMudmlld3MpXG5cbiAgcm9sbGVkLm1hcCh4ID0+IHtcbiAgICB4LnZhbHVlcy5yZWFsX3BvcF9wZXJjZW50ID0geC52YWx1ZXMucG9wX3BlcmNlbnQgPSAoeC52YWx1ZXMucG9wX3NpemUgLyBwb3BfdG90YWwgKiAxMDApXG4gICAgeC52YWx1ZXMucGVyY2VudCA9IHgudmFsdWVzLnZpZXdzL3ZpZXdzX3RvdGFsXG5cbiAgfSlcblxuICByZXR1cm4gcm9sbGVkXG59XG5cbnZhciBtb2RpZnlXaXRoQ29tcGFyaXNvbnMgPSBmdW5jdGlvbihkcykge1xuXG4gIHZhciBhZ2dzID0gZHMucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgIHAucG9wX21heCA9IChwLnBvcF9tYXggfHwgMCkgPCBjLnBvcCA/IGMucG9wIDogcC5wb3BfbWF4XG4gICAgcC5wb3BfdG90YWwgPSAocC5wb3BfdG90YWwgfHwgMCkgKyBjLnBvcFxuXG4gICAgaWYgKGMuc2FtcCkge1xuICAgICAgcC5zYW1wX21heCA9IChwLnNhbXBfbWF4IHx8IDApID4gYy5zYW1wID8gcC5zYW1wX21heCA6IGMuc2FtcFxuICAgICAgcC5zYW1wX3RvdGFsID0gKHAuc2FtcF90b3RhbCB8fCAwKSArIGMuc2FtcFxuICAgIH1cblxuICAgIHJldHVybiBwXG4gIH0se30pXG5cbiAgLy9jb25zb2xlLmxvZyhhZ2dzKVxuXG4gIGRzLm1hcChmdW5jdGlvbihvKSB7XG4gICAgby5ub3JtYWxpemVkX3BvcCA9IG8ucG9wIC8gYWdncy5wb3BfbWF4XG4gICAgby5wZXJjZW50X3BvcCA9IG8ucG9wIC8gYWdncy5wb3BfdG90YWxcblxuICAgIG8ubm9ybWFsaXplZF9zYW1wID0gby5zYW1wIC8gYWdncy5zYW1wX21heFxuICAgIG8ucGVyY2VudF9zYW1wID0gby5zYW1wIC8gYWdncy5zYW1wX3RvdGFsXG5cbiAgICBvLm5vcm1hbGl6ZWRfZGlmZiA9IChvLm5vcm1hbGl6ZWRfc2FtcCAtIG8ubm9ybWFsaXplZF9wb3ApL28ubm9ybWFsaXplZF9wb3BcbiAgICBvLnBlcmNlbnRfZGlmZiA9IChvLnBlcmNlbnRfc2FtcCAtIG8ucGVyY2VudF9wb3ApL28ucGVyY2VudF9wb3BcbiAgfSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3J5U3VtbWFyeShzYW1wX3VybHMscG9wX3VybHMpIHtcblxuICBjb25zdCBzYW1wX3JvbGxlZCA9IGNhdGVnb3J5Um9sbChzYW1wX3VybHMpXG4gICAgLCBwb3Bfcm9sbGVkID0gY2F0ZWdvcnlSb2xsKHBvcF91cmxzKVxuICAgICwgbWFwcGVkX2NhdF9yb2xsID0gc2FtcF9yb2xsZWQucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBcbiAgICAgICAgcFtjLmtleV0gPSBjOyBcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0sIHt9KVxuXG4gIGNvbnN0IGNhdF9zdW1tYXJ5ID0gcG9wX3JvbGxlZC5tYXAoZnVuY3Rpb24oeCkge1xuXG4gICAgW3gudmFsdWVzXS5tYXAoeSA9PiB7XG4gICAgICAgIHkua2V5ID0geC5rZXlcbiAgICAgICAgeS5wb3AgPSB5LnZpZXdzXG4gICAgICAgIHkuc2FtcCA9IG1hcHBlZF9jYXRfcm9sbFt4LmtleV0gPyBtYXBwZWRfY2F0X3JvbGxbeC5rZXldLnZhbHVlcy52aWV3cyA6IDBcblxuICAgICAgICB5LnNhbXBsZV9wZXJjZW50X25vcm0gPSB5LnNhbXBsZV9wZXJjZW50ID0geS5wZXJjZW50KjEwMFxuICAgICAgICB5LmltcG9ydGFuY2UgPSBNYXRoLmxvZygoMS95LnBvcF9zaXplKSp5LnNhbXAqeS5zYW1wKVxuICAgICAgICB5LnJhdGlvID0geS5zYW1wbGVfcGVyY2VudC95LnJlYWxfcG9wX3BlcmNlbnRcbiAgICAgICAgeS52YWx1ZSA9IHkuc2FtcFxuICAgIH0pXG5cblxuICAgIHJldHVybiB4LnZhbHVlc1xuICB9KS5zb3J0KGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYi5wb3AgLSBhLnBvcH0pXG4gICAgLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSAhPSBcIk5BXCIgfSlcblxuICBtb2RpZnlXaXRoQ29tcGFyaXNvbnMoY2F0X3N1bW1hcnkpXG5cbiAgcmV0dXJuIGNhdF9zdW1tYXJ5XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2F0ZWdvcmllcyh2YWx1ZSkge1xuXG4gIGNvbnN0IGNhdGVnb3JpZXMgPSBhZ2dyZWdhdGVDYXRlZ29yeSh2YWx1ZS5mdWxsX3VybHMpXG4gIHZhbHVlW1wiZGlzcGxheV9jYXRlZ29yaWVzXCJdID0ge1xuICAgICAgXCJrZXlcIjpcIkNhdGVnb3JpZXNcIlxuICAgICwgXCJ2YWx1ZXNcIjogY2F0ZWdvcmllcy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgIT0gXCJOQVwiIH0pXG4gIH1cblxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXRlZ29yeUhvdXIodmFsdWUpIHtcbiAgdmFsdWVbXCJjYXRlZ29yeV9ob3VyXCJdID0gYWdncmVnYXRlQ2F0ZWdvcnlIb3VyKHZhbHVlLmZ1bGxfdXJscylcbn1cbiIsImltcG9ydCB7XG4gIHByZXBEYXRhLCBcbn0gZnJvbSAnLi4vLi4vaGVscGVycydcbmltcG9ydCB7XG4gIGFnZ3JlZ2F0ZUNhdGVnb3J5XG59IGZyb20gJy4vY2F0ZWdvcnknXG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRIb3VyKGgpIHtcbiAgaWYgKGggPT0gMCkgcmV0dXJuIFwiMTIgYW1cIlxuICBpZiAoaCA9PSAxMikgcmV0dXJuIFwiMTIgcG1cIlxuICBpZiAoaCA+IDEyKSByZXR1cm4gKGgtMTIpICsgXCIgcG1cIlxuICByZXR1cm4gKGggPCAxMCA/IGhbMV0gOiBoKSArIFwiIGFtXCJcbn1cblxuZXhwb3J0IGNvbnN0IGhvdXJidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkubWFwKHggPT4gU3RyaW5nKHgpLmxlbmd0aCA+IDEgPyBTdHJpbmcoeCkgOiBcIjBcIiArIHgpXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFRpbWluZyh1cmxzLCBjb21wYXJpc29uKSB7XG5cbiAgdmFyIHRzID0gcHJlcERhdGEodXJscylcbiAgICAsIHBvcF90cyA9IHByZXBEYXRhKGNvbXBhcmlzb24pXG5cbiAgdmFyIG1hcHBlZHRzID0gdHMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGM7IHJldHVybiBwfSwge30pXG5cbiAgdmFyIHByZXBwZWQgPSBwb3BfdHMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBrZXk6IHgua2V5XG4gICAgICAsIGhvdXI6IHguaG91clxuICAgICAgLCBtaW51dGU6IHgubWludXRlXG4gICAgICAsIHZhbHVlMjogeC52YWx1ZVxuICAgICAgLCB2YWx1ZTogbWFwcGVkdHNbeC5rZXldID8gIG1hcHBlZHRzW3gua2V5XS52YWx1ZSA6IDBcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIHByZXBwZWRcbn1cblxuZXhwb3J0IGNvbnN0IHRpbWluZ1RhYnVsYXIgPSAoZGF0YSxrZXk9XCJkb21haW5cIikgPT4ge1xuICByZXR1cm4gZDMubmVzdCgpXG4gICAgLmtleSh4ID0+IHhba2V5XSlcbiAgICAua2V5KHggPT4geC5ob3VyKVxuICAgIC5lbnRyaWVzKGRhdGEpXG4gICAgLm1hcCh4ID0+IHtcbiAgICAgIHZhciBvYmogPSB4LnZhbHVlcy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBwW2Mua2V5XSA9IGMudmFsdWVzXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICB4LmJ1Y2tldHMgPSBob3VyYnVja2V0cy5tYXAoeiA9PiB7XG4gICAgICAgIHZhciBvID0geyB2YWx1ZXM6IG9ialt6XSwga2V5OiBmb3JtYXRIb3VyKHopIH1cbiAgICAgICAgby52aWV3cyA9IGQzLnN1bShvYmpbel0gfHwgW10sIHEgPT4gcS51bmlxdWVzKVxuICAgICAgICByZXR1cm4gb1xuICAgICAgfSlcblxuICAgICAgeC50YWJ1bGFyID0geC5idWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgIHBbYy5rZXldID0gYy52aWV3cyB8fCB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0se30pXG5cbiAgICAgIHgudGFidWxhcltcImtleVwiXSA9IHgua2V5XG4gICAgICB4LnRhYnVsYXJbXCJ0b3RhbFwiXSA9IGQzLnN1bSh4LmJ1Y2tldHMseCA9PiB4LnZpZXdzKVxuICAgICAgXG4gICAgICByZXR1cm4geC50YWJ1bGFyXG4gICAgfSlcbiAgICAuZmlsdGVyKHggPT4geC5rZXkgIT0gXCJOQVwiKVxufVxuIiwiaW1wb3J0IHtmb3JtYXRIb3VyfSBmcm9tICcuLi8uLi9oZWxwZXJzL2RhdGFfaGVscGVycy90aW1pbmcnXG5cbmV4cG9ydCBjb25zdCBob3VyYnVja2V0cyA9IGQzLnJhbmdlKDAsMjQpLm1hcCh4ID0+IFN0cmluZyh4KS5sZW5ndGggPiAxID8gU3RyaW5nKHgpIDogXCIwXCIgKyB4KVxuXG5leHBvcnQgY29uc3QgdGltaW5nSGVhZGVycyA9IGhvdXJidWNrZXRzLm1hcChmb3JtYXRIb3VyKS5tYXAoeCA9PiB7IHJldHVybiB7a2V5OiB4LCB2YWx1ZTogeH0gfSlcbiIsImltcG9ydCB7aG91cmJ1Y2tldHN9IGZyb20gJy4vdGltaW5nX2NvbnN0YW50cydcblxuXG5leHBvcnQgY29uc3QgY29tcHV0ZVNjYWxlID0gKGRhdGEpID0+IHtcblxuICBjb25zdCBtYXggPSAxMDAwIC8vIG5lZWQgdG8gYWN0dWFsbHkgY29tcHV0ZSB0aGlzIGZyb20gZGF0YVxuXG4gIHJldHVybiBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbMCwuOF0pLmRvbWFpbihbMCxNYXRoLmxvZyhtYXgpXSlcbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIGQzX2NsYXNzLCBEM0NvbXBvbmVudEJhc2UsIG5vb3B9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uLy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0ICogYXMgdGltZXNlcmllcyBmcm9tICcuLi8uLi9nZW5lcmljL3RpbWVzZXJpZXMnXG5pbXBvcnQge2RvbWFpbl9leHBhbmRlZH0gZnJvbSAnY29tcG9uZW50J1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICdjaGFydCdcblxuaW1wb3J0IHtob3VyYnVja2V0cywgdGltaW5nSGVhZGVyc30gZnJvbSAnLi90aW1pbmdfY29uc3RhbnRzJ1xuaW1wb3J0IHtjb21wdXRlU2NhbGV9IGZyb20gJy4vdGltaW5nX3Byb2Nlc3MnXG5cblxuXG5pbXBvcnQgJy4vdGltaW5nLmNzcydcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0aW1pbmcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGltaW5nKHRhcmdldClcbn1cblxuY2xhc3MgVGltaW5nIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJub3JtYWxpemVcIiwgXCJzb3J0XCIsIFwiYXNjZW5kaW5nXCJdIH1cblxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGFcbiAgICAgICwgZmlsdGVyZWQgPSBkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHguc2VsZWN0ZWR9KVxuICAgICAgLCBzZWxlY3RlZCA9IGZpbHRlcmVkLmxlbmd0aCA/IGZpbHRlcmVkWzBdIDogZGF0YVswXVxuXG5cbiAgICB2YXIgd3JhcCA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcInRpbWluZy13cmFwXCIpXG5cbiAgICBjb25zdCBoZWFkZXJzID0gW3trZXk6XCJrZXlcIix2YWx1ZTpzZWxlY3RlZC5rZXkucmVwbGFjZShcIlRvcCBcIixcIlwiKX1dLmNvbmNhdCh0aW1pbmdIZWFkZXJzKVxuICAgIGNvbnN0IGQgPSBkYXRhWzBdLnZhbHVlcy8vdGltaW5nVGFidWxhcihkYXRhLmZ1bGxfdXJscylcbiAgICBjb25zdCBvc2NhbGUgPSBjb21wdXRlU2NhbGUoZClcblxuICAgIGNvbnN0IF9kZWZhdWx0ID0gXCJ0b3RhbFwiXG4gICAgY29uc3QgcyA9IHRoaXMuc29ydCgpIFxuICAgIGNvbnN0IGFzYyA9IHRoaXMuYXNjZW5kaW5nKCkgXG5cblxuICAgIGNvbnN0IHNlbGVjdGVkSGVhZGVyID0gaGVhZGVycy5maWx0ZXIoeCA9PiB4LmtleSA9PSBzKVxuICAgIGNvbnN0IHNvcnRieSA9IHNlbGVjdGVkSGVhZGVyLmxlbmd0aCA/IHNlbGVjdGVkSGVhZGVyWzBdLmtleSA6IF9kZWZhdWx0XG5cblxuXG4gICAgaGVhZGVyKHdyYXApXG4gICAgICAudGV4dChzZWxlY3RlZC5rZXkpXG4gICAgICAub3B0aW9ucyhkYXRhKVxuICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpIHsgdGhpcy5vbihcInNlbGVjdFwiKSh4KSB9LmJpbmQodGhpcykpXG4gICAgICAuZHJhdygpXG5cbiAgICB2YXIgdGltaW5nd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJ0aW1pbmctcm93XCIpXG5cbiAgICB2YXIgdGFibGVfb2JqID0gdGFibGUodGltaW5nd3JhcClcbiAgICAgIC50b3AoMTQwKVxuICAgICAgLmhlYWRlcnMoaGVhZGVycylcbiAgICAgIC5zb3J0KHNvcnRieSxhc2MpXG4gICAgICAub24oXCJzb3J0XCIsIHRoaXMub24oXCJzb3J0XCIpKVxuICAgICAgLmRhdGEoc2VsZWN0ZWQpXG4gICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgIC5vbihcImV4cGFuZFwiLGZ1bmN0aW9uKGQsdGQpIHtcblxuICAgICAgICB2YXIgZGQgPSBkYXRhLmZ1bGxfdXJscy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5kb21haW4gPT0gZC5kb21haW4gfSlcbiAgICAgICAgdmFyIHJvbGxlZCA9IHRpbWVzZXJpZXMucHJlcERhdGEoZGQpXG4gICAgICAgIFxuICAgICAgICBkb21haW5fZXhwYW5kZWQodGQpXG4gICAgICAgICAgLmRvbWFpbihkZFswXS5kb21haW4pXG4gICAgICAgICAgLnJhdyhkZClcbiAgICAgICAgICAuZGF0YShyb2xsZWQpXG4gICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5kcmF3KClcblxuICAgICAgfSlcbiAgICAgIC5vbihcImRyYXdcIixmdW5jdGlvbigpIHtcblxuICAgICAgICB0aGlzLl90YXJnZXQuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bm90KDpmaXJzdC1jaGlsZClcIilcbiAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fW3hbJ2tleSddXSB8fCAwXG4gICAgICAgICAgICByZXR1cm4gXCJyZ2JhKDcwLCAxMzAsIDE4MCxcIiArIG9zY2FsZShNYXRoLmxvZyh2YWx1ZSsxKSkgKyBcIilcIlxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgICAgLmRyYXcoKVxuICAgIFxuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5cbmZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuXCIgKyBjbHMsIHR5cGUgfHwgXCJkaXZcIilcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3RhZ2VkX2ZpbHRlcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTdGFnZWRGaWx0ZXIodGFyZ2V0KVxufVxuXG5jbGFzcyBTdGFnZWRGaWx0ZXIge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vbiA9IHt9XG4gIH1cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG5cbiAgb24oYWN0aW9uLCBmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICBkcmF3KCkge1xuICAgIHZhciBvd3JhcCA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcImZvb3Rlci13cmFwXCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCI2MHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3R0b21cIixcIjBweFwiKVxuICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwMHB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjRjBGNEY3XCIpXG5cbiAgICB2YXIgd3JhcCA9IGQzX2NsYXNzKG93cmFwLFwiaW5uZXItd3JhcFwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXRvcFwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCI1cHhcIilcblxuICAgIGQzX2NsYXNzKHdyYXAsXCJoZWFkZXItbGFiZWxcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjE0cHhcIilcbiAgICAgIC5zdHlsZShcImNvbG9yXCIsXCIjODg4ODg4XCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC50ZXh0KFwiQnVpbGQgRmlsdGVyc1wiKVxuXG4gICAgZDNfY2xhc3Mod3JhcCxcInRleHQtbGFiZWxcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI2MHB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJub25lXCIpXG4gICAgICAudGV4dChcIlRpdGxlXCIpXG5cbiAgICB2YXIgc2VsZWN0X2JveCA9IHNlbGVjdCh3cmFwKVxuICAgICAgLm9wdGlvbnMoW1xuICAgICAgICAgIHtcImtleVwiOlwiY29udGFpbnNcIixcInZhbHVlXCI6XCJjb250YWluc1wifVxuICAgICAgICAsIHtcImtleVwiOlwiZG9lcyBub3QgY29udGFpblwiLFwidmFsdWVcIjpcImRvZXMgbm90IGNvbnRhaW5cIn1cbiAgICAgIF0pXG4gICAgICAuZHJhdygpXG4gICAgICAuX3NlbGVjdFxuICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cblxuXG5cbiAgICB2YXIgZm9vdGVyX3JvdyA9IGQzX2NsYXNzKHdyYXAsXCJmb290ZXItcm93XCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG4gICAgdmFyIHNlbGVjdF92YWx1ZSA9IHRoaXMuZGF0YSgpXG5cbiAgICBmdW5jdGlvbiBidWlsZEZpbHRlcklucHV0KCkge1xuXG4gICAgICBmb290ZXJfcm93LnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRlc3Ryb3kgPSBkMy5zZWxlY3QodGhpcykub24oXCJkZXN0cm95XCIpXG4gICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICB9KVxuXG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZvb3Rlcl9yb3csXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAuYXR0cihcInZhbHVlXCIsc2VsZWN0X3ZhbHVlKVxuICAgICAgICAucHJvcGVydHkoXCJ2YWx1ZVwiLHNlbGVjdF92YWx1ZSlcblxuICAgICAgXG5cblxuICAgICAgdmFyIHMgPSAkKHNlbGVjdC5ub2RlKCkpLnNlbGVjdGl6ZSh7XG4gICAgICAgIHBlcnNpc3Q6IGZhbHNlLFxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGVjdF92YWx1ZSA9IChzZWxlY3RfdmFsdWUubGVuZ3RoID8gc2VsZWN0X3ZhbHVlICsgXCIsXCIgOiBcIlwiKSArIHhcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGVjdF92YWx1ZSlcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9uRGVsZXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxlY3RfdmFsdWUgPSBzZWxlY3RfdmFsdWUuc3BsaXQoXCIsXCIpLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6ICE9IHhbMF19KS5qb2luKFwiLFwiKVxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZWN0X3ZhbHVlKVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogeCwgdGV4dDogeFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgLm9uKFwiZGVzdHJveVwiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNbMF0uc2VsZWN0aXplLmRlc3Ryb3koKVxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgYnVpbGRGaWx0ZXJJbnB1dCgpXG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBkM19jbGFzcyh3cmFwLFwiaW5jbHVkZS1zdWJtaXRcIixcImJ1dHRvblwiKVxuICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyOXB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwic3VibWl0XCIpXG4gICAgICAudGV4dChcIk1vZGlmeSBGaWx0ZXJzXCIpXG4gICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBmb290ZXJfcm93LnNlbGVjdEFsbChcImlucHV0XCIpLnByb3BlcnR5KFwidmFsdWVcIilcbiAgICAgICAgdmFyIG9wID0gIHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXkgKyBcIi5zZWxlY3RpemVcIlxuICAgICAgICBcbiAgICAgICAgc2VsZi5vbihcIm1vZGlmeVwiKSh7XCJmaWVsZFwiOlwiVGl0bGVcIixcIm9wXCI6b3AsXCJ2YWx1ZVwiOnZhbHVlfSlcbiAgICAgIH0pXG5cbiAgICBkM19jbGFzcyh3cmFwLFwiZXhjbHVkZS1zdWJtaXRcIixcImJ1dHRvblwiKVxuICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyOXB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwic3VibWl0XCIpXG4gICAgICAudGV4dChcIk5ldyBGaWx0ZXJcIilcbiAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGZvb3Rlcl9yb3cuc2VsZWN0QWxsKFwiaW5wdXRcIikucHJvcGVydHkoXCJ2YWx1ZVwiKVxuICAgICAgICB2YXIgb3AgPSAgc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleSArIFwiLnNlbGVjdGl6ZVwiXG5cbiAgICAgICAgc2VsZi5vbihcImFkZFwiKSh7XCJmaWVsZFwiOlwiVGl0bGVcIixcIm9wXCI6b3AsXCJ2YWx1ZVwiOnZhbHVlfSlcbiAgICAgIH0pXG5cblxuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4vaGVhZGVyJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIENvbmRpdGlvbmFsU2hvdyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7fVxuICB0aGlzLl9jbGFzc2VzID0ge31cbiAgdGhpcy5fb2JqZWN0cyA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbmRpdGlvbmFsX3Nob3codGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQ29uZGl0aW9uYWxTaG93KHRhcmdldClcbn1cblxuQ29uZGl0aW9uYWxTaG93LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIGNsYXNzZWQ6IGZ1bmN0aW9uKGssIHYpIHtcbiAgICAgIGlmIChrID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9jbGFzc2VzXG4gICAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fY2xhc3Nlc1trXSBcbiAgICAgIHRoaXMuX2NsYXNzZXNba10gPSB2O1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9ICBcbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIHZhciBjbGFzc2VzID0gdGhpcy5jbGFzc2VkKClcblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmNvbmRpdGlvbmFsLXdyYXBcIixcImRpdlwiLHRoaXMuZGF0YSgpKVxuICAgICAgICAuY2xhc3NlZChcImNvbmRpdGlvbmFsLXdyYXBcIix0cnVlKVxuXG4gICAgICB2YXIgb2JqZWN0cyA9IGQzX3NwbGF0KHdyYXAsXCIuY29uZGl0aW9uYWxcIixcImRpdlwiLGlkZW50aXR5LCBmdW5jdGlvbih4LGkpIHsgcmV0dXJuIGkgfSlcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH0pXG4gICAgICAgIC5jbGFzc2VkKFwiY29uZGl0aW9uYWxcIix0cnVlKVxuICAgICAgICAuY2xhc3NlZChcImhpZGRlblwiLCBmdW5jdGlvbih4KSB7IHJldHVybiAheC5zZWxlY3RlZCB9KVxuXG5cbiAgICAgIE9iamVjdC5rZXlzKGNsYXNzZXMpLm1hcChmdW5jdGlvbihrKSB7IFxuICAgICAgICBvYmplY3RzLmNsYXNzZWQoayxjbGFzc2VzW2tdKVxuICAgICAgfSlcblxuICAgICAgdGhpcy5fb2JqZWN0cyA9IG9iamVjdHNcblxuXG4gICAgICByZXR1cm4gdGhpc1xuICBcbiAgICB9XG4gICwgZWFjaDogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHRoaXMuZHJhdygpXG4gICAgICB0aGlzLl9vYmplY3RzLmVhY2goZm4pXG4gICAgICBcbiAgICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gU2hhcmUodGFyZ2V0KSB7XG4gIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICB0aGlzLl9pbm5lciA9IGZ1bmN0aW9uKCkge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2hhcmUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU2hhcmUodGFyZ2V0KVxufVxuXG5TaGFyZS5wcm90b3R5cGUgPSB7XG4gICAgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciBvdmVybGF5ID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIub3ZlcmxheVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwib3ZlcmxheVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwicmdiYSgwLDAsMCwuNSlcIilcbiAgICAgICAgLnN0eWxlKFwiei1pbmRleFwiLFwiMzAxXCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgb3ZlcmxheS5yZW1vdmUoKVxuICAgICAgICB9KVxuXG4gICAgICB0aGlzLl9vdmVybGF5ID0gb3ZlcmxheTtcblxuICAgICAgdmFyIGNlbnRlciA9IGQzX3VwZGF0ZWFibGUob3ZlcmxheSxcIi5wb3B1cFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicG9wdXAgY29sLW1kLTUgY29sLXNtLThcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiYXV0b1wiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcImF1dG9cIilcbiAgICAgICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiMzAwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMTUwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwid2hpdGVcIilcbiAgICAgICAgLnN0eWxlKFwiZmxvYXRcIixcIm5vbmVcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpIHtcbiAgICAgICAgICBkMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKVxuICAgICAgICB9KVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgc2VsZi5faW5uZXIoZDMuc2VsZWN0KHRoaXMpKVxuICAgICAgICB9KVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBpbm5lcjogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHRoaXMuX2lubmVyID0gZm4uYmluZCh0aGlzKVxuICAgICAgdGhpcy5kcmF3KClcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fb3ZlcmxheS5yZW1vdmUoKVxuICAgICAgcmV0dXJuIHRoaXMgXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCAqIGFzIHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IHttZWRpYV9wbGFufSBmcm9tICdtZWRpYV9wbGFuJ1xuaW1wb3J0IGZpbHRlcl92aWV3IGZyb20gJy4vdmlld3MvZmlsdGVyX3ZpZXcnXG5pbXBvcnQgb3B0aW9uX3ZpZXcgZnJvbSAnLi92aWV3cy9vcHRpb25fdmlldydcbmltcG9ydCBkb21haW5fdmlldyBmcm9tICcuL3ZpZXdzL2RvbWFpbl92aWV3J1xuaW1wb3J0IHNlZ21lbnRfdmlldyBmcm9tICcuL3ZpZXdzL3NlZ21lbnRfdmlldydcbmltcG9ydCBzdW1tYXJ5X3ZpZXcgZnJvbSAnLi92aWV3cy9zdW1tYXJ5L3ZpZXcnXG5pbXBvcnQgcmVsYXRpdmVfdmlldyBmcm9tICcuL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy92aWV3J1xuaW1wb3J0IHRpbWluZ192aWV3IGZyb20gJy4vdmlld3MvdGltaW5nL3ZpZXcnXG5pbXBvcnQgc3RhZ2VkX2ZpbHRlcl92aWV3IGZyb20gJy4vdmlld3Mvc3RhZ2VkX2ZpbHRlcl92aWV3J1xuXG5cblxuXG5cbmltcG9ydCBjb25kaXRpb25hbF9zaG93IGZyb20gJy4vZ2VuZXJpYy9jb25kaXRpb25hbF9zaG93J1xuXG5pbXBvcnQgc2hhcmUgZnJvbSAnLi9nZW5lcmljL3NoYXJlJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuL2dlbmVyaWMvc2VsZWN0J1xuXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi9oZWxwZXJzJ1xuaW1wb3J0ICogYXMgdHJhbnNmb3JtIGZyb20gJy4vaGVscGVycydcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbmV4cG9ydCBmdW5jdGlvbiBOZXdEYXNoYm9hcmQodGFyZ2V0KSB7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG4gIHRoaXMuX29uID0ge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbmV3X2Rhc2hib2FyZCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBOZXdEYXNoYm9hcmQodGFyZ2V0KVxufVxuXG5OZXdEYXNoYm9hcmQucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgdHJhbnNmb3JtOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidHJhbnNmb3JtXCIsdmFsKSB8fCBcIlwiXG4gICAgfVxuICAsIHN0YWdlZF9maWx0ZXJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3RhZ2VkX2ZpbHRlcnNcIix2YWwpIHx8IFwiXCJcbiAgICB9XG4gICwgbWVkaWE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJtZWRpYVwiLHZhbCkgXG4gICAgfVxuICAsIHNhdmVkOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2F2ZWRcIix2YWwpIFxuICAgIH1cbiAgLCBsaW5lX2l0ZW1zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibGluZV9pdGVtc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgc2VsZWN0ZWRfYWN0aW9uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2VsZWN0ZWRfYWN0aW9uXCIsdmFsKSBcbiAgICB9XG4gICwgc2VsZWN0ZWRfY29tcGFyaXNvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlbGVjdGVkX2NvbXBhcmlzb25cIix2YWwpIFxuICAgIH1cbiAgLCBhY3Rpb25fZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFjdGlvbl9kYXRlXCIsdmFsKSBcbiAgICB9XG4gICwgY29tcGFyaXNvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY29tcGFyaXNvbl9kYXRlXCIsdmFsKSBcbiAgICB9XG5cbiAgLCB2aWV3X29wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ2aWV3X29wdGlvbnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGxvZ2ljX29wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsb2dpY19vcHRpb25zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBleHBsb3JlX3RhYnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJleHBsb3JlX3RhYnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGxvZ2ljX2NhdGVnb3JpZXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsb2dpY19jYXRlZ29yaWVzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBhY3Rpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgc3VtbWFyeTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInN1bW1hcnlcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIHRpbWVfc3VtbWFyeTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpbWVfc3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgdGltZV90YWJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGltZV90YWJzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBjYXRlZ29yeV9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY2F0ZWdvcnlfc3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwga2V5d29yZF9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5d29yZF9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBiZWZvcmU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiZWZvcmVcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGJlZm9yZV90YWJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmVmb3JlX3RhYnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGFmdGVyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWZ0ZXJcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGZpbHRlcnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJmaWx0ZXJzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBsb2FkaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCkgdGhpcy5fc2VnbWVudF92aWV3ICYmIHRoaXMuX3NlZ21lbnRfdmlldy5pc19sb2FkaW5nKHZhbCkuZHJhdygpXG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvYWRpbmdcIix2YWwpXG4gICAgfVxuICAsIHNvcnQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzb3J0XCIsdmFsKVxuICAgIH1cbiAgLCBhc2NlbmRpbmc6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhc2NlbmRpbmdcIix2YWwpXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YSgpXG4gICAgICB2YXIgbWVkaWEgPSB0aGlzLm1lZGlhKClcblxuICAgICAgdmFyIG9wdGlvbnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMudmlld19vcHRpb25zKCkpKVxuICAgICAgdmFyIHRhYnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuZXhwbG9yZV90YWJzKCkpKVxuXG5cbiAgICAgIHZhciBsb2dpYyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5sb2dpY19vcHRpb25zKCkpKVxuICAgICAgICAsIGNhdGVnb3JpZXMgPSB0aGlzLmxvZ2ljX2NhdGVnb3JpZXMoKVxuICAgICAgICAsIGZpbHRlcnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuZmlsdGVycygpKSlcbiAgICAgICAgLCBhY3Rpb25zID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmFjdGlvbnMoKSkpXG4gICAgICAgICwgc3RhZ2VkX2ZpbHRlcnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuc3RhZ2VkX2ZpbHRlcnMoKSkpXG5cblxuXG4gICAgICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXRcbiAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICB0aGlzLl9zZWdtZW50X3ZpZXcgPSBzZWdtZW50X3ZpZXcodGFyZ2V0KVxuICAgICAgICAuaXNfbG9hZGluZyhzZWxmLmxvYWRpbmcoKSB8fCBmYWxzZSlcbiAgICAgICAgLnNlZ21lbnRzKGFjdGlvbnMpXG4gICAgICAgIC5kYXRhKHNlbGYuc3VtbWFyeSgpKVxuICAgICAgICAuYWN0aW9uKHNlbGYuc2VsZWN0ZWRfYWN0aW9uKCkgfHwge30pXG4gICAgICAgIC5hY3Rpb25fZGF0ZShzZWxmLmFjdGlvbl9kYXRlKCkgfHwgXCJcIilcbiAgICAgICAgLmNvbXBhcmlzb25fZGF0ZShzZWxmLmNvbXBhcmlzb25fZGF0ZSgpIHx8IFwiXCIpXG5cbiAgICAgICAgLmNvbXBhcmlzb24oc2VsZi5zZWxlY3RlZF9jb21wYXJpc29uKCkgfHwge30pXG4gICAgICAgIC5vbihcImNoYW5nZVwiLCB0aGlzLm9uKFwiYWN0aW9uLmNoYW5nZVwiKSlcbiAgICAgICAgLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIsIHRoaXMub24oXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImNvbXBhcmlzb24uY2hhbmdlXCIsIHRoaXMub24oXCJjb21wYXJpc29uLmNoYW5nZVwiKSlcbiAgICAgICAgLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiLCB0aGlzLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiKSlcbiAgICAgICAgLm9uKFwic2F2ZWQtc2VhcmNoLmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyAgXG4gICAgICAgICAgdmFyIHNzID0gc2hhcmUoZDMuc2VsZWN0KFwiYm9keVwiKSkuZHJhdygpXG4gICAgICAgICAgc3MuaW5uZXIoZnVuY3Rpb24odGFyZ2V0KSB7XG5cbiAgICAgICAgICAgIHZhciBoZWFkZXIgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5oZWFkZXJcIixcImg0XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwiaGVhZGVyXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMzBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMzBweFwiKVxuICAgICAgICAgICAgICAudGV4dChcIk9wZW4gYSBzYXZlZCBkYXNoYm9hcmRcIilcblxuICAgICAgICAgICAgdmFyIGZvcm0gPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdlwiLFwiZGl2XCIsc2VsZi5zYXZlZCgpKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMjUlXCIpXG5cbiAgICAgICAgICAgIGlmICghc2VsZi5zYXZlZCgpIHx8IHNlbGYuc2F2ZWQoKS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICBkM191cGRhdGVhYmxlKGZvcm0sXCJzcGFuXCIsXCJzcGFuXCIpXG4gICAgICAgICAgICAgICAgLnRleHQoXCJZb3UgY3VycmVudGx5IGhhdmUgbm8gc2F2ZWQgZGFzaGJvYXJkc1wiKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZDNfc3BsYXQoZm9ybSxcIi5yb3dcIixcImFcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sZnVuY3Rpb24oeCkgeyByZXR1cm4geC5uYW1lIH0pXG4gICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJyb3dcIix0cnVlKVxuICAgICAgICAgICAgICAgIC8vLmF0dHIoXCJocmVmXCIsIHggPT4geC5lbmRwb2ludClcbiAgICAgICAgICAgICAgICAudGV4dCh4ID0+IHgubmFtZSlcbiAgICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgICAvLyBIQUNLOiBUSElTIGlzIGhhY2t5Li4uXG4gICAgICAgICAgICAgICAgICB2YXIgX3N0YXRlID0gc3RhdGUucXMoe30pLmZyb20oXCI/XCIgKyB4LmVuZHBvaW50LnNwbGl0KFwiP1wiKVsxXSlcblxuICAgICAgICAgICAgICAgICAgc3MuaGlkZSgpXG4gICAgICAgICAgICAgICAgICB3aW5kb3cub25wb3BzdGF0ZSh7c3RhdGU6IF9zdGF0ZX0pXG4gICAgICAgICAgICAgICAgICBkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcIm5ldy1zYXZlZC1zZWFyY2guY2xpY2tcIiwgZnVuY3Rpb24oKSB7IFxuICAgICAgICAgIHZhciBzcyA9IHNoYXJlKGQzLnNlbGVjdChcImJvZHlcIikpLmRyYXcoKVxuICAgICAgICAgIHNzLmlubmVyKGZ1bmN0aW9uKHRhcmdldCkge1xuXG4gICAgICAgICAgICB2YXIgaGVhZGVyID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuaGVhZGVyXCIsXCJoNFwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImhlYWRlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJTYXZlIHRoaXMgZGFzaGJvYXJkOlwiKVxuXG4gICAgICAgICAgICB2YXIgZm9ybSA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZGl2XCIsXCJkaXZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG5cbiAgICAgICAgICAgIHZhciBuYW1lID0gZDNfdXBkYXRlYWJsZShmb3JtLCBcIi5uYW1lXCIsIFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUobmFtZSxcIi5sYWJlbFwiLFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMzBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LWZhbWlseVwiLFwiUHJveGltYU5vdmEsIHNhbnMtc2VyaWZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImxlZnRcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJEYXNoYm9hcmQgTmFtZTpcIilcblxuICAgICAgICAgICAgdmFyIG5hbWVfaW5wdXQgPSBkM191cGRhdGVhYmxlKG5hbWUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI3MHB4XCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwicGxhY2Vob2xkZXJcIixcIk15IGF3ZXNvbWUgc2VhcmNoXCIpXG5cbiAgICAgICAgICAgIHZhciBhZHZhbmNlZCA9IGQzX3VwZGF0ZWFibGUoZm9ybSwgXCIuYWR2YW5jZWRcIiwgXCJkZXRhaWxzXCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwiYWR2YW5jZWRcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDAwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIilcblxuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUoYWR2YW5jZWQsXCIubGFiZWxcIixcImRpdlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiTGluZSBJdGVtOlwiKVxuXG4gICAgICAgICAgICB2YXIgc2VsZWN0X2JveCA9IHNlbGVjdChhZHZhbmNlZClcbiAgICAgICAgICAgICAgLm9wdGlvbnMoc2VsZi5saW5lX2l0ZW1zKCkubWFwKHggPT4geyByZXR1cm4ge2tleTp4LmxpbmVfaXRlbV9uYW1lLCB2YWx1ZTogeC5saW5lX2l0ZW1faWR9IH0pIClcbiAgICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgICAgICAuX3NlbGVjdFxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjcwcHhcIilcblxuXG5cblxuICAgICAgICAgICAgdmFyIHNlbmQgPSBkM191cGRhdGVhYmxlKGZvcm0sIFwiLnNlbmRcIiwgXCJkaXZcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZW5kXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG5cblxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShzZW5kLFwiYnV0dG9uXCIsXCJidXR0b25cIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE2cHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgICAudGV4dChcIlNlbmRcIilcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBuYW1lX2lucHV0LnByb3BlcnR5KFwidmFsdWVcIikgXG4gICAgICAgICAgICAgICAgdmFyIGxpbmVfaXRlbSA9IHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9ucy5sZW5ndGggPyBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18ua2V5IDogZmFsc2VcblxuICAgICAgICAgICAgICAgIGQzLnhocihcIi9jcnVzaGVyL3NhdmVkX2Rhc2hib2FyZFwiKVxuICAgICAgICAgICAgICAgICAgLnBvc3QoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IG5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAsIFwiZW5kcG9pbnRcIjogd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgd2luZG93LmxvY2F0aW9uLnNlYXJjaFxuICAgICAgICAgICAgICAgICAgICAgICwgXCJsaW5lX2l0ZW1cIjogbGluZV9pdGVtXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICApXG5cbiAgICAgICAgICAgICAgICBzcy5oaWRlKClcblxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAudGV4dChcIlNhdmVcIilcblxuXG5cbiAgICAgICAgICB9KVxuXG5cbiAgICAgICAgfSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICBpZiAodGhpcy5zdW1tYXJ5KCkgPT0gZmFsc2UpIHJldHVybiBmYWxzZVxuXG4gICAgICBmaWx0ZXJfdmlldyh0YXJnZXQpXG4gICAgICAgIC5sb2dpYyhsb2dpYylcbiAgICAgICAgLmNhdGVnb3JpZXMoY2F0ZWdvcmllcylcbiAgICAgICAgLmZpbHRlcnMoZmlsdGVycylcbiAgICAgICAgLmRhdGEoZGF0YSlcbiAgICAgICAgLm9uKFwibG9naWMuY2hhbmdlXCIsIHRoaXMub24oXCJsb2dpYy5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImZpbHRlci5jaGFuZ2VcIiwgdGhpcy5vbihcImZpbHRlci5jaGFuZ2VcIikpXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgb3B0aW9uX3ZpZXcodGFyZ2V0KVxuICAgICAgICAuZGF0YShvcHRpb25zKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgdGhpcy5vbihcInZpZXcuY2hhbmdlXCIpIClcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICBjb25kaXRpb25hbF9zaG93KHRhcmdldClcbiAgICAgICAgLmRhdGEob3B0aW9ucylcbiAgICAgICAgLmNsYXNzZWQoXCJ2aWV3LW9wdGlvblwiLHRydWUpXG4gICAgICAgIC5kcmF3KClcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgaWYgKCF4LnNlbGVjdGVkKSByZXR1cm5cblxuICAgICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJkYXRhLXZpZXdcIikge1xuICAgICAgICAgICAgdmFyIGR2ID0gZG9tYWluX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgIC5vcHRpb25zKHRhYnMpXG4gICAgICAgICAgICAgIC5kYXRhKGRhdGEpXG4gICAgICAgICAgICAgIC5zb3J0KHNlbGYuc29ydCgpKVxuICAgICAgICAgICAgICAuYXNjZW5kaW5nKHNlbGYuYXNjZW5kaW5nKCkpXG4gICAgICAgICAgICAgIC5vbihcInNlbGVjdFwiLCBzZWxmLm9uKFwidGFiLmNoYW5nZVwiKSApXG4gICAgICAgICAgICAgIC5vbihcInNvcnRcIiwgc2VsZi5vbihcInNvcnQuY2hhbmdlXCIpIClcblxuICAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgXG4gICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJtZWRpYS12aWV3XCIpIHtcbiAgICAgICAgICAgIG1lZGlhX3BsYW4oZHRoaXMuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTE1cHhcIikuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIi0xNXB4XCIpKVxuICAgICAgICAgICAgIC5kYXRhKGRhdGEpXG4gICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwiYmEtdmlld1wiKSB7XG4gICAgICAgICAgICByZWxhdGl2ZV92aWV3KGR0aGlzKVxuICAgICAgICAgICAgIC5ub3JtYWxpemUoc2VsZi50cmFuc2Zvcm0oKSA9PSBcIm5vcm1hbGl6ZVwiKVxuICAgICAgICAgICAgIC5kYXRhKHNlbGYuYmVmb3JlX3RhYnMoKSlcbiAgICAgICAgICAgICAuc29ydChzZWxmLnNvcnQoKSlcbiAgICAgICAgICAgICAuYXNjZW5kaW5nKHNlbGYuYXNjZW5kaW5nKCkpXG4gICAgICAgICAgICAgLm9uKFwic2VsZWN0XCIsIHNlbGYub24oXCJ0YWIuY2hhbmdlXCIpIClcbiAgICAgICAgICAgICAub24oXCJzb3J0XCIsIHNlbGYub24oXCJzb3J0LmNoYW5nZVwiKSApXG4gICAgICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgICAgICBzdGFnZWRfZmlsdGVycyA9IHN0YWdlZF9maWx0ZXJzLnNwbGl0KFwiLFwiKS5jb25jYXQoeC5rZXkgfHwgeC51cmwpLmZpbHRlcih4ID0+IHgubGVuZ3RoKS5qb2luKFwiLFwiKVxuICAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKHN0YWdlZF9maWx0ZXJzKVxuICAgICAgICAgICAgICAgSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZF9maWx0ZXJzKVxuXG4gICAgXG4gICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJzdW1tYXJ5LXZpZXdcIikge1xuICAgICAgICAgICAgc3VtbWFyeV92aWV3KGR0aGlzKVxuICAgICAgICAgICAgIC5kYXRhKHNlbGYuc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC50aW1pbmcoc2VsZi50aW1lX3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAuY2F0ZWdvcnkoc2VsZi5jYXRlZ29yeV9zdW1tYXJ5KCkpXG4gICAgICAgICAgICAgLmJlZm9yZShzZWxmLmJlZm9yZSgpKVxuICAgICAgICAgICAgIC8vLmFmdGVyKHNlbGYuYWZ0ZXIoKSlcbiAgICAgICAgICAgICAua2V5d29yZHMoc2VsZi5rZXl3b3JkX3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAub24oXCJiYS5zb3J0XCIsc2VsZi5vbihcImJhLnNvcnRcIikpXG4gICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwidGltaW5nLXZpZXdcIikge1xuICAgICAgICAgICAgdGltaW5nX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi50aW1lX3RhYnMoKSlcbiAgICAgICAgICAgICAuc29ydChzZWxmLnNvcnQoKSlcbiAgICAgICAgICAgICAuYXNjZW5kaW5nKHNlbGYuYXNjZW5kaW5nKCkpXG4gICAgICAgICAgICAgLm9uKFwic2VsZWN0XCIsIHNlbGYub24oXCJ0YWIuY2hhbmdlXCIpIClcbiAgICAgICAgICAgICAub24oXCJzb3J0XCIsIHNlbGYub24oXCJzb3J0LmNoYW5nZVwiKSApXG5cbiAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuICAgICAgZnVuY3Rpb24gSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZCkge1xuXG4gICAgICAgIHN0YWdlZF9maWx0ZXJfdmlldyh0YXJnZXQpXG4gICAgICAgICAgLmRhdGEoc3RhZ2VkKVxuICAgICAgICAgIC5vbihcInVwZGF0ZVwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKSh4KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9uKFwibW9kaWZ5XCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKFwiXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwibW9kaWZ5LWZpbHRlclwiKSh4KVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAub24oXCJhZGRcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoXCJcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJhZGQtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZHJhdygpXG4gICAgICB9XG4gICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBnZXREYXRhKGFjdGlvbixkYXlzX2Fnbykge1xuICByZXR1cm4gZnVuY3Rpb24oY2Ipe1xuICAgIGNvbnNvbGUubG9nKGRheXNfYWdvKVxuXG4gICAgdmFyIFVSTCA9IFwiL2NydXNoZXIvdjIvdmlzaXRvci9kb21haW5zX2Z1bGxfdGltZV9taW51dGUvY2FjaGU/dXJsX3BhdHRlcm49XCIgKyBhY3Rpb24udXJsX3BhdHRlcm5bMF0gKyBcIiZmaWx0ZXJfaWQ9XCIgKyBhY3Rpb24uYWN0aW9uX2lkXG5cbiAgICB2YXIgZGF0ZV9hZ28gPSBuZXcgRGF0ZSgrbmV3IERhdGUoKS0yNCo2MCo2MCoxMDAwKmRheXNfYWdvKVxuICAgICAgLCBkYXRlID0gZDMudGltZS5mb3JtYXQoXCIlWS0lbS0lZFwiKShkYXRlX2FnbylcblxuICAgIGlmIChkYXlzX2FnbykgVVJMICs9IFwiJmRhdGU9XCIgKyBkYXRlXG5cblxuICAgIGQzLmpzb24oVVJMLGZ1bmN0aW9uKHZhbHVlKSB7XG5cbiAgICAgIHZhciBjYXRlZ29yaWVzID0gdmFsdWUuc3VtbWFyeS5jYXRlZ29yeS5tYXAoZnVuY3Rpb24oeCkge3gua2V5ID0geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZTsgcmV0dXJuIHh9KVxuICAgICAgdmFsdWUuY2F0ZWdvcmllcyA9IGNhdGVnb3JpZXNcbiAgICAgIHZhbHVlLmNhdGVnb3J5ID0gdmFsdWUuc3VtbWFyeS5jYXRlZ29yeVxuICAgICAgdmFsdWUuY3VycmVudF9ob3VyID0gdmFsdWUuc3VtbWFyeS5ob3VyXG4gICAgICB2YWx1ZS5jYXRlZ29yeV9ob3VyID0gdmFsdWUuc3VtbWFyeS5jcm9zc19zZWN0aW9uXG5cbiAgICAgIHZhbHVlLm9yaWdpbmFsX3VybHMgPSB2YWx1ZS5yZXNwb25zZVxuXG4gICAgICBjYihmYWxzZSx2YWx1ZSlcbiAgICB9KVxuICB9XG5cbn1cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGUoZGF0YSxjYikge1xuICBkMy54aHIoXCIvY3J1c2hlci9mdW5uZWwvYWN0aW9uP2Zvcm1hdD1qc29uXCIpXG4gICAgLmhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIilcbiAgICAucG9zdChKU09OLnN0cmluZ2lmeShkYXRhKSxmdW5jdGlvbihlcnIsZGF0YSkge1xuICAgICAgY2IoZXJyLEpTT04ucGFyc2UoZGF0YS5yZXNwb25zZSkucmVzcG9uc2UpXG4gICAgfSlcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsKGNiKSB7XG4gIGQzLmpzb24oXCIvY3J1c2hlci9mdW5uZWwvYWN0aW9uP2Zvcm1hdD1qc29uXCIsZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YWx1ZS5yZXNwb25zZS5tYXAoZnVuY3Rpb24oeCkgeyB4LmtleSA9IHguYWN0aW9uX25hbWU7IHguYWN0aW9uX2lkID0geC5maWx0ZXJfaWQ7IHgudmFsdWUgPSB4LmFjdGlvbl9pZCB9KVxuICAgIGNiKGZhbHNlLHZhbHVlLnJlc3BvbnNlKVxuICB9KVxuXG59XG4iLCJpbXBvcnQgKiBhcyBhIGZyb20gJy4vc3JjL2FjdGlvbi5qcyc7XG5cbmV4cG9ydCBsZXQgYWN0aW9uID0gYTtcbmV4cG9ydCBsZXQgZGFzaGJvYXJkID0ge1xuICAgIGdldEFsbDogZnVuY3Rpb24oY2IpIHtcbiAgICAgIGQzLmpzb24oXCIvY3J1c2hlci9zYXZlZF9kYXNoYm9hcmRcIixmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjYihmYWxzZSx2YWx1ZS5yZXNwb25zZSlcbiAgICAgIH0pXG4gICAgfVxufVxuZXhwb3J0IGxldCBsaW5lX2l0ZW0gPSB7XG4gICAgZ2V0QWxsOiBmdW5jdGlvbihjYikge1xuICAgICAgZDMuanNvbihcIi9saW5lX2l0ZW1cIixmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjYihmYWxzZSx2YWx1ZS5yZXNwb25zZSlcbiAgICAgIH0pXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgZmlsdGVyX2RhdGEgfSBmcm9tICdmaWx0ZXInO1xuaW1wb3J0IHsgYnVpbGREYXRhIH0gZnJvbSAnLi4vLi4vaGVscGVycydcblxuZnVuY3Rpb24gcHJlZml4UmVkdWNlcihwcmVmaXgsIHAsYykge1xuICBwW2Mua2V5XSA9IHBbYy5rZXldIHx8IHt9XG4gIHBbYy5rZXldWydrZXknXSA9IGMua2V5XG4gIFxuICBwW2Mua2V5XVtwcmVmaXggKyBjLnRpbWVfZGlmZl9idWNrZXRdID0gKHBbYy5rZXldW2MudGltZV9kaWZmX2J1Y2tldF0gfHwgMCkgKyBjLnZpc2l0c1xuICByZXR1cm4gcFxufVxuZXhwb3J0IGNvbnN0IGJlZm9yZUFuZEFmdGVyVGFidWxhciA9IChiZWZvcmUsIGFmdGVyKSA9PiB7XG4gIGNvbnN0IGRvbWFpbl90aW1lID0ge31cblxuICBiZWZvcmUucmVkdWNlKHByZWZpeFJlZHVjZXIuYmluZChmYWxzZSxcIlwiKSxkb21haW5fdGltZSlcbiAgYWZ0ZXIucmVkdWNlKHByZWZpeFJlZHVjZXIuYmluZChmYWxzZSxcIi1cIiksZG9tYWluX3RpbWUpXG5cbiAgY29uc3Qgc29ydGVkID0gT2JqZWN0LmtleXMoZG9tYWluX3RpbWUpXG4gICAgLm1hcCgoaykgPT4geyByZXR1cm4gZG9tYWluX3RpbWVba10gfSlcblxuICByZXR1cm4gc29ydGVkXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQmVmb3JlQW5kQWZ0ZXIoYmVmb3JlX3VybHMsYWZ0ZXJfdXJscyxjYXRfc3VtbWFyeSxzb3J0X2J5KSB7XG5cbiAgdmFyIGJ1ID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnRpbWVfZGlmZl9idWNrZXQgfSlcbiAgICAuZW50cmllcyhiZWZvcmVfdXJscylcblxuICB2YXIgYXUgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgIC5lbnRyaWVzKGFmdGVyX3VybHMpXG5cbiAgdmFyIGJ1Y2tldHMgPSBbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geCo2MCB9KVxuICAgICwgcG9wX2NhdGVnb3JpZXMgPSBjYXRfc3VtbWFyeS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYzsgcmV0dXJuIHAgfSwge30pXG4gICAgLCBjYXRzID0gY2F0X3N1bW1hcnkubWFwKGZ1bmN0aW9uKHApIHsgcmV0dXJuIHAua2V5IH0pXG5cbiAgdmFyIGJlZm9yZV9jYXRlZ29yaWVzID0gYnVpbGREYXRhKGJlZm9yZV91cmxzLGJ1Y2tldHMscG9wX2NhdGVnb3JpZXMpXG4gICAgLCBhZnRlcl9jYXRlZ29yaWVzID0gYnVpbGREYXRhKGFmdGVyX3VybHMsYnVja2V0cyxwb3BfY2F0ZWdvcmllcylcblxuICB2YXIgc29ydGJ5ID0gc29ydF9ieVxuXG4gIGlmIChzb3J0YnkgPT0gXCJzY29yZVwiKSB7XG5cbiAgICBiZWZvcmVfY2F0ZWdvcmllcyA9IGJlZm9yZV9jYXRlZ29yaWVzLnNvcnQoZnVuY3Rpb24oYSxiKSB7IFxuICAgICAgdmFyIHAgPSAtMSwgcSA9IC0xO1xuICAgICAgdHJ5IHsgcCA9IGIudmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5ID09IFwiNjAwXCIgfSlbMF0uc2NvcmUgfSBjYXRjaChlKSB7fVxuICAgICAgdHJ5IHsgcSA9IGEudmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5ID09IFwiNjAwXCIgfSlbMF0uc2NvcmUgfSBjYXRjaChlKSB7fVxuICAgICAgcmV0dXJuIGQzLmFzY2VuZGluZyhwLCBxKVxuICAgIH0pXG4gICAgXG4gIH0gZWxzZSBpZiAoc29ydGJ5ID09IFwicG9wXCIpIHtcblxuICAgIGJlZm9yZV9jYXRlZ29yaWVzID0gYmVmb3JlX2NhdGVnb3JpZXMuc29ydChmdW5jdGlvbihhLGIpIHsgXG4gICAgICB2YXIgcCA9IGNhdHMuaW5kZXhPZihhLmtleSlcbiAgICAgICAgLCBxID0gY2F0cy5pbmRleE9mKGIua2V5KVxuICAgICAgcmV0dXJuIGQzLmFzY2VuZGluZyhwID4gLTEgPyBwIDogMTAwMDAsIHEgPiAtMSA/IHEgOiAxMDAwMClcbiAgICB9KVxuXG4gIH0gZWxzZSB7XG5cbiAgICBiZWZvcmVfY2F0ZWdvcmllcyA9IGJlZm9yZV9jYXRlZ29yaWVzLnNvcnQoZnVuY3Rpb24oYSxiKSB7IFxuICAgICAgdmFyIHAgPSAtMSwgcSA9IC0xO1xuICAgICAgdHJ5IHsgcCA9IGIudmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5ID09IFwiNjAwXCIgfSlbMF0ucGVyY2VudF9kaWZmIH0gY2F0Y2goZSkge31cbiAgICAgIHRyeSB7IHEgPSBhLnZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSA9PSBcIjYwMFwiIH0pWzBdLnBlcmNlbnRfZGlmZiB9IGNhdGNoKGUpIHt9XG4gICAgICByZXR1cm4gZDMuYXNjZW5kaW5nKHAsIHEpXG4gICAgfSlcblxuICAgIFxuICB9XG5cblxuICB2YXIgb3JkZXIgPSBiZWZvcmVfY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcblxuICBhZnRlcl9jYXRlZ29yaWVzID0gYWZ0ZXJfY2F0ZWdvcmllcy5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuIG9yZGVyLmluZGV4T2YoeC5rZXkpID4gLTF9KS5zb3J0KGZ1bmN0aW9uKGEsYikge1xuICAgIHJldHVybiBvcmRlci5pbmRleE9mKGEua2V5KSAtIG9yZGVyLmluZGV4T2YoYi5rZXkpXG4gIH0pXG5cbiAgcmV0dXJuIHtcbiAgICAgIFwiYWZ0ZXJcIjphZnRlcl91cmxzXG4gICAgLCBcImJlZm9yZVwiOmJlZm9yZV91cmxzXG4gICAgLCBcImNhdGVnb3J5XCI6Y2F0X3N1bW1hcnlcbiAgICAsIFwiYmVmb3JlX2NhdGVnb3JpZXNcIjpiZWZvcmVfY2F0ZWdvcmllc1xuICAgICwgXCJhZnRlcl9jYXRlZ29yaWVzXCI6YWZ0ZXJfY2F0ZWdvcmllc1xuICAgICwgXCJzb3J0YnlcIjpzb3J0X2J5XG4gIH1cbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBhZ2dyZWdhdGVVcmxzKHVybHMsY2F0ZWdvcmllcykge1xuICB2YXIgY2F0ZWdvcmllcyA9IGNhdGVnb3JpZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cbiAgdmFyIHZhbHVlcyA9IHVybHNcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHtcImtleVwiOngudXJsLFwidmFsdWVcIjp4LmNvdW50LCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWV9IH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMClcbiAgICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTEgfSlcblxuICByZXR1cm4gdmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB4LmtleVxuICAgICAgICAucmVwbGFjZShcImh0dHA6Ly9cIixcIlwiKVxuICAgICAgICAucmVwbGFjZShcImh0dHBzOi8vXCIsXCJcIilcbiAgICAgICAgLnJlcGxhY2UoXCJ3d3cuXCIsXCJcIikuc3BsaXQoXCIuXCIpLnNsaWNlKDEpLmpvaW4oXCIuXCIpLnNwbGl0KFwiL1wiKVsxXS5sZW5ndGggPiA1XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH0pLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnZhbHVlIC0gcC52YWx1ZSB9KVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFVybHNUYWIodXJscyxjYXRlZ29yaWVzKSB7XG5cbiAgY29uc3QgdmFsdWVzID0gYWdncmVnYXRlVXJscyh1cmxzLGNhdGVnb3JpZXMpXG4gIFxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIlRvcCBBcnRpY2xlc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5zbGljZSgwLDEwMClcbiAgfVxufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGFnZ3JlZ2F0ZURvbWFpbnModXJscyxjYXRlZ29yaWVzKSB7XG4gIHZhciBjYXRlZ29yaWVzID0gY2F0ZWdvcmllc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuICB2YXIgaWRmID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7cmV0dXJuIHguZG9tYWluIH0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7cmV0dXJuIHhbMF0uaWRmIH0pXG4gICAgLm1hcCh1cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IHVybHNcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwia2V5XCI6eC5kb21haW5cbiAgICAgICAgLCBcInZhbHVlXCI6eC5jb3VudFxuICAgICAgICAsIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAsIFwidW5pcXVlc1wiOiB4LnVuaXF1ZXMgXG4gICAgICAgICwgXCJ1cmxcIjogeC51cmxcbiAgICAgIH0gXG4gICAgfSlcblxuXG5cbiAgdmFsdWVzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5fSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB4WzBdLnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICAsIFwia2V5XCI6IHhbMF0ua2V5XG4gICAgICAgICAsIFwidmFsdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy52YWx1ZX0sMClcbiAgICAgICAgICwgXCJwZXJjZW50X3VuaXF1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnVuaXF1ZXMvYy52YWx1ZX0sMCkveC5sZW5ndGhcbiAgICAgICAgICwgXCJ1cmxzXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwLmluZGV4T2YoYy51cmwpID09IC0xID8gcC5wdXNoKGMudXJsKSA6IHA7IHJldHVybiBwIH0sW10pXG5cbiAgICAgICB9IFxuICAgIH0pXG4gICAgLmVudHJpZXModmFsdWVzKS5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB4LnZhbHVlcyB9KVxuXG4gIGlmIChjYXRlZ29yaWVzLmxlbmd0aCA+IDApXG4gICAgdmFsdWVzID0gdmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KSB7cmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZih4LnBhcmVudF9jYXRlZ29yeV9uYW1lKSA+IC0xIH0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC50Zl9pZGYgPSBnZXRJREYoeC5rZXkpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSBcbiAgICB4LmNvdW50ID0geC52YWx1ZVxuICAgIHguaW1wb3J0YW5jZSA9IE1hdGgubG9nKHgudGZfaWRmKVxuICB9KVxuICB2YWx1ZXMgPSB2YWx1ZXMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudGZfaWRmIC0gcC50Zl9pZGYgfSlcblxuXG4gIHZhciB0b3RhbCA9IGQzLnN1bSh2YWx1ZXMsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jb3VudCp4LnBlcmNlbnRfdW5pcXVlfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgeC5wb3BfcGVyY2VudCA9IDEuMDIvZ2V0SURGKHgua2V5KSoxMDBcbiAgICB4LnBvcF9wZXJjZW50ID0geC5wb3BfcGVyY2VudCA9PSBJbmZpbml0eSA/IDAgOiB4LnBvcF9wZXJjZW50XG5cbiAgICB4LnNhbXBsZV9wZXJjZW50ID0geC5jb3VudCp4LnBlcmNlbnRfdW5pcXVlL3RvdGFsKjEwMFxuICB9KVxuXG4gIHZhciBub3JtID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAucmFuZ2UoWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnBvcF9wZXJjZW50fSldKVxuICAgIC5kb21haW4oWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHguc2FtcGxlX3BlcmNlbnR9KV0pXG4gICAgLm5pY2UoKVxuXG4gIHZhciB0dCA9IGQzLnN1bSh2YWx1ZXMsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wb3BfcGVyY2VudCB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHguc2FtcGxlX3BlcmNlbnRfbm9ybSA9IG5vcm0oeC5zYW1wbGVfcGVyY2VudClcbiAgICB4LnJlYWxfcG9wX3BlcmNlbnQgPSB4LnBvcF9wZXJjZW50L3R0KjEwMFxuICAgIHgucmF0aW8gPSB4LnNhbXBsZV9wZXJjZW50L3gucmVhbF9wb3BfcGVyY2VudFxuXG4gIH0pXG5cbiAgcmV0dXJuIHZhbHVlc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGREb21haW5zVGFiKHVybHMsY2F0ZWdvcmllcykge1xuXG4gIGNvbnN0IHZhbHVlcyA9IGFnZ3JlZ2F0ZURvbWFpbnModXJscyxjYXRlZ29yaWVzKVxuXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiVG9wIERvbWFpbnNcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCw1MDApXG4gIH1cbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSc7XG5cbmltcG9ydCB7XG4gIGFnZ3JlZ2F0ZUNhdGVnb3J5LFxuICBhZ2dyZWdhdGVDYXRlZ29yeUhvdXIsXG4gIGNhdGVnb3J5U3VtbWFyeVxufSBmcm9tICcuLi9oZWxwZXJzL2RhdGFfaGVscGVycy9jYXRlZ29yeSdcblxuaW1wb3J0IHtcbiAgYnVpbGRCZWZvcmVBbmRBZnRlcixcbiAgYmVmb3JlQW5kQWZ0ZXJUYWJ1bGFyXG59IGZyb20gJy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2JlZm9yZV9hbmRfYWZ0ZXInXG5cbmltcG9ydCB7XG4gIGJ1aWxkS2V5d29yZHNcbn0gZnJvbSAnLi4vaGVscGVycy9kYXRhX2hlbHBlcnMva2V5d29yZHMnXG5cbmltcG9ydCB7XG4gIGJ1aWxkVGltaW5nLFxuICB0aW1pbmdUYWJ1bGFyXG59IGZyb20gJy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL3RpbWluZydcblxuaW1wb3J0IHtcbiAgYnVpbGRVcmxzVGFiXG59IGZyb20gJy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL3VybHMnXG5cbmltcG9ydCB7XG4gIGJ1aWxkRG9tYWluc1RhYlxufSBmcm9tICcuLi9oZWxwZXJzL2RhdGFfaGVscGVycy9kb21haW5zJ1xuXG5pbXBvcnQge1xuICBidWlsZFN1bW1hcnksXG4gIGRldGVybWluZUxvZ2ljLFxuICBwcmVwYXJlRmlsdGVycyxcbiAgZmlsdGVyVXJsc1xufSBmcm9tICcuLi9oZWxwZXJzJ1xuXG5jb25zdCBzID0gc3RhdGU7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG4gIGNvbnN0IHMgPSBzdGF0ZTtcblxuICBzdGF0ZVxuICAgIC5yZWdpc3RlckV2ZW50KFwiYWRkLWZpbHRlclwiLCBmdW5jdGlvbihmaWx0ZXIpIHsgXG4gICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIscy5zdGF0ZSgpLmZpbHRlcnMuY29uY2F0KGZpbHRlcikuZmlsdGVyKHggPT4geC52YWx1ZSkgKSBcbiAgICB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwibW9kaWZ5LWZpbHRlclwiLCBmdW5jdGlvbihmaWx0ZXIpIHsgXG4gICAgICB2YXIgZmlsdGVycyA9IHMuc3RhdGUoKS5maWx0ZXJzXG4gICAgICB2YXIgaGFzX2V4aXNpdGluZyA9IGZpbHRlcnMuZmlsdGVyKHggPT4gKHguZmllbGQgKyB4Lm9wKSA9PSAoZmlsdGVyLmZpZWxkICsgZmlsdGVyLm9wKSApXG4gICAgICBcbiAgICAgIGlmIChoYXNfZXhpc2l0aW5nLmxlbmd0aCkge1xuICAgICAgICB2YXIgbmV3X2ZpbHRlcnMgPSBmaWx0ZXJzLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGlmICgoeC5maWVsZCA9PSBmaWx0ZXIuZmllbGQpICYmICh4Lm9wID09IGZpbHRlci5vcCkpIHtcbiAgICAgICAgICAgIHgudmFsdWUgKz0gXCIsXCIgKyBmaWx0ZXIudmFsdWVcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHhcbiAgICAgICAgfSlcbiAgICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLG5ld19maWx0ZXJzLmZpbHRlcih4ID0+IHgudmFsdWUpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHMuc3RhdGUoKS5maWx0ZXJzLmNvbmNhdChmaWx0ZXIpLmZpbHRlcih4ID0+IHgudmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiLCBmdW5jdGlvbihzdHIpIHsgcy5wdWJsaXNoKFwic3RhZ2VkX2ZpbHRlclwiLHN0ciApIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJsb2dpYy5jaGFuZ2VcIiwgZnVuY3Rpb24obG9naWMpIHsgcy5wdWJsaXNoKFwibG9naWNfb3B0aW9uc1wiLGxvZ2ljKSB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwiZmlsdGVyLmNoYW5nZVwiLCBmdW5jdGlvbihmaWx0ZXJzKSB7IHMucHVibGlzaEJhdGNoKHsgXCJmaWx0ZXJzXCI6ZmlsdGVycyB9KSB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwidXBkYXRlRmlsdGVyXCIsIGZ1bmN0aW9uKGVycixfZmlsdGVycyxfc3RhdGUpIHtcblxuXG4gICAgICBpZiAoX3N0YXRlLmRhdGEgPT0gdW5kZWZpbmVkKSByZXR1cm4gXG5cbiAgICAgIGNvbnN0IGZpbHRlcnMgPSBwcmVwYXJlRmlsdGVycyhfc3RhdGUuZmlsdGVycylcbiAgICAgIGNvbnN0IGxvZ2ljID0gZGV0ZXJtaW5lTG9naWMoX3N0YXRlLmxvZ2ljX29wdGlvbnMpXG4gICAgICBjb25zdCBmdWxsX3VybHMgPSBmaWx0ZXJVcmxzKF9zdGF0ZS5kYXRhLm9yaWdpbmFsX3VybHMsbG9naWMsZmlsdGVycylcblxuICAgICAgaWYgKCAoX3N0YXRlLmRhdGEuZnVsbF91cmxzKSAmJiAoX3N0YXRlLmRhdGEuZnVsbF91cmxzLmxlbmd0aCA9PSBmdWxsX3VybHMubGVuZ3RoKSAmJiBcbiAgICAgICAgICAgKF9zdGF0ZS5zZWxlY3RlZF9jb21wYXJpc29uKSAmJiAoX3N0YXRlLmNvbXBhcmlzb25fZGF0YSA9PSB2YWx1ZS5jb21wYXJpc29uKSAmJiBcbiAgICAgICAgICAgKF9zdGF0ZS5zb3J0YnkgPT0gX3N0YXRlLmJlZm9yZV91cmxzLnNvcnRieSkpIHJldHVybiBcblxuXG5cbiAgICAgIC8vIEJBU0UgREFUQVNFVFNcbiAgICAgIGNvbnN0IHZhbHVlID0ge31cblxuICAgICAgdmFsdWUuZnVsbF91cmxzID0gZnVsbF91cmxzXG4gICAgICB2YWx1ZS5jb21wYXJpc29uID0gX3N0YXRlLmNvbXBhcmlzb25fZGF0YSA/ICBfc3RhdGUuY29tcGFyaXNvbl9kYXRhLm9yaWdpbmFsX3VybHMgOiBfc3RhdGUuZGF0YS5vcmlnaW5hbF91cmxzO1xuXG4gICAgICAvL3MucHVibGlzaFN0YXRpYyhcImZvcm1hdHRlZF9kYXRhXCIsdmFsdWUpXG4gICAgICBcblxuICAgICAgY29uc3QgY2F0X3N1bW1hcnkgPSBjYXRlZ29yeVN1bW1hcnkodmFsdWUuZnVsbF91cmxzLHZhbHVlLmNvbXBhcmlzb24pXG4gICAgICBjb25zdCBzdW1tYXJ5ID0gYnVpbGRTdW1tYXJ5KHZhbHVlLmZ1bGxfdXJscywgdmFsdWUuY29tcGFyaXNvbilcblxuICAgICAgcy5zZXRTdGF0aWMoXCJjYXRlZ29yeV9zdW1tYXJ5XCIsIGNhdF9zdW1tYXJ5KVxuICAgICAgcy5zZXRTdGF0aWMoXCJzdW1tYXJ5XCIsc3VtbWFyeSlcblxuXG5cblxuXG4gICAgICAvLyBNRURJQSBQTEFOXG5cbiAgICAgIFxuICAgICAgLy92YWx1ZS5kaXNwbGF5X2NhdGVnb3JpZXMgPSB7XCJrZXlcIjogXCJDYXRlZ29yaWVzXCIsIHZhbHVlczogYWdncmVnYXRlQ2F0ZWdvcnkoZnVsbF91cmxzKX1cbiAgICAgIC8vdmFsdWUuY2F0ZWdvcnlfaG91ciA9IGFnZ3JlZ2F0ZUNhdGVnb3J5SG91cihmdWxsX3VybHMpXG5cbiAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBhZ2dyZWdhdGVDYXRlZ29yeShmdWxsX3VybHMpXG5cbiAgICAgIGNvbnN0IG1lZGlhX3BsYW4gPSB7XG4gICAgICAgICAgZGlzcGxheV9jYXRlZ29yaWVzOiB7XCJrZXlcIjogXCJDYXRlZ29yaWVzXCIgLCB2YWx1ZXM6IGNhdGVnb3JpZXN9XG4gICAgICAgICwgY2F0ZWdvcnlfaG91cjogYWdncmVnYXRlQ2F0ZWdvcnlIb3VyKGZ1bGxfdXJscylcbiAgICAgIH1cblxuICAgICAgcy5zZXRTdGF0aWMoXCJtZWRpYV9wbGFuXCIsIG1lZGlhX3BsYW4pXG4gICAgICBcblxuXG5cblxuICAgICAgLy8gRVhQTE9SRSBUQUJTXG4gICAgICB2YXIgdGFicyA9IFtcbiAgICAgICAgICBidWlsZERvbWFpbnNUYWIoZnVsbF91cmxzLGNhdGVnb3JpZXMpXG4gICAgICAgICwge2tleTpcIlRvcCBDYXRlZ29yaWVzXCIsIHZhbHVlczogY2F0X3N1bW1hcnl9XG4gICAgICAgICwgYnVpbGRVcmxzVGFiKGZ1bGxfdXJscyxjYXRlZ29yaWVzKVxuICAgICAgXVxuXG4gICAgICBcblxuICAgICAgaWYgKF9zdGF0ZS50YWJfcG9zaXRpb24pIHtcbiAgICAgICAgdGFicy5tYXAoeCA9PiB4LnNlbGVjdGVkID0gKHgua2V5ID09IF9zdGF0ZS50YWJfcG9zaXRpb24pIClcbiAgICAgIH1cblxuICAgICAgcy5zZXRTdGF0aWMoXCJ0YWJzXCIsdGFicylcblxuXG5cblxuICAgICAgLy8gVElNSU5HXG4gICAgICBjb25zdCB0aW1pbmcgPSBidWlsZFRpbWluZyh2YWx1ZS5mdWxsX3VybHMsIHZhbHVlLmNvbXBhcmlzb24pXG4gICAgICBjb25zdCB0aW1pbmdfdGFidWxhciA9IHRpbWluZ1RhYnVsYXIoZnVsbF91cmxzKVxuICAgICAgY29uc3QgY2F0X3RpbWluZ190YWJ1bGFyID0gdGltaW5nVGFidWxhcihmdWxsX3VybHMsXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiKVxuICAgICAgY29uc3QgdGltaW5nX3RhYnMgPSBbXG4gICAgICAgICAge1wia2V5XCI6XCJUb3AgRG9tYWluc1wiLCBcInZhbHVlc1wiOiB0aW1pbmdfdGFidWxhcn1cbiAgICAgICAgLCB7XCJrZXlcIjpcIlRvcCBDYXRlZ29yaWVzXCIsIFwidmFsdWVzXCI6IGNhdF90aW1pbmdfdGFidWxhcn1cblxuICAgICAgXVxuXG4gICAgICBpZiAoX3N0YXRlLnRhYl9wb3NpdGlvbikge1xuICAgICAgICB0aW1pbmdfdGFicy5tYXAoeCA9PiB4LnNlbGVjdGVkID0gKHgua2V5ID09IF9zdGF0ZS50YWJfcG9zaXRpb24pIClcbiAgICAgIH1cblxuXG5cbiAgICAgIHMuc2V0U3RhdGljKFwidGltZV9zdW1tYXJ5XCIsIHRpbWluZylcbiAgICAgIHMuc2V0U3RhdGljKFwidGltZV90YWJzXCIsIHRpbWluZ190YWJzKVxuXG5cblxuXG4gICAgICAvLyBCRUZPUkUgQU5EIEFGVEVSXG4gICAgICBpZiAoX3N0YXRlLmRhdGEuYmVmb3JlKSB7XG5cbiAgICAgICAgY29uc3QgY2F0bWFwID0gKHgpID0+IE9iamVjdC5hc3NpZ24oeCx7a2V5OngucGFyZW50X2NhdGVnb3J5X25hbWV9KVxuXG4gICAgICAgIGNvbnN0IGJlZm9yZV91cmxzID0gZmlsdGVyVXJscyhfc3RhdGUuZGF0YS5iZWZvcmUsbG9naWMsZmlsdGVycykubWFwKHggPT4gT2JqZWN0LmFzc2lnbih7a2V5OnguZG9tYWlufSx4KSApXG4gICAgICAgICAgLCBhZnRlcl91cmxzID0gZmlsdGVyVXJscyhfc3RhdGUuZGF0YS5hZnRlcixsb2dpYyxmaWx0ZXJzKS5tYXAoeCA9PiBPYmplY3QuYXNzaWduKHtrZXk6eC5kb21haW59LHgpIClcbiAgICAgICAgICAsIGJlZm9yZV9hbmRfYWZ0ZXIgPSBidWlsZEJlZm9yZUFuZEFmdGVyKGJlZm9yZV91cmxzLGFmdGVyX3VybHMsY2F0X3N1bW1hcnksX3N0YXRlLnNvcnRieSlcbiAgICAgICAgICAsIGJlZm9yZV9hZnRlcl90YWJ1bGFyID0gYmVmb3JlQW5kQWZ0ZXJUYWJ1bGFyKGJlZm9yZV91cmxzLGFmdGVyX3VybHMpXG4gICAgICAgICAgLCBjYXRfYmVmb3JlX2FmdGVyX3RhYnVsYXIgPSBiZWZvcmVBbmRBZnRlclRhYnVsYXIoYmVmb3JlX3VybHMubWFwKGNhdG1hcCksYWZ0ZXJfdXJscy5tYXAoY2F0bWFwKSlcblxuICAgICAgICBjb25zdCBiZWZvcmVfdGFicyA9IFtcbiAgICAgICAgICAgIHtrZXk6XCJUb3AgRG9tYWluc1wiLHZhbHVlczpiZWZvcmVfYWZ0ZXJfdGFidWxhcn1cbiAgICAgICAgICAsIHtrZXk6XCJUb3AgQ2F0ZWdvcmllc1wiLHZhbHVlczpjYXRfYmVmb3JlX2FmdGVyX3RhYnVsYXJ9XG4gICAgICAgIF1cblxuICAgICAgaWYgKF9zdGF0ZS50YWJfcG9zaXRpb24pIHtcbiAgICAgICAgYmVmb3JlX3RhYnMubWFwKHggPT4geC5zZWxlY3RlZCA9ICh4LmtleSA9PSBfc3RhdGUudGFiX3Bvc2l0aW9uKSApXG4gICAgICB9XG5cblxuICAgICAgICBzLnNldFN0YXRpYyhcImJlZm9yZV91cmxzXCIsYmVmb3JlX2FuZF9hZnRlcikgXG4gICAgICAgIHMuc2V0U3RhdGljKFwiYmVmb3JlX3RhYnNcIixiZWZvcmVfdGFicylcblxuICAgICAgfVxuXG5cblxuICAgICAgLy8gS0VZV09SRFNcbiAgICAgIC8vcy5zZXRTdGF0aWMoXCJrZXl3b3JkX3N1bW1hcnlcIiwgYnVpbGRLZXl3b3Jkcyh2YWx1ZS5mdWxsX3VybHMsdmFsdWUuY29tcGFyaW9ucykpIFxuXG5cblxuXG4gICAgICBcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImZvcm1hdHRlZF9kYXRhXCIsdmFsdWUpXG4gICAgfSlcbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSc7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgY29uc3QgcyA9IHN0YXRlO1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhY3Rpb24uY2hhbmdlXCIsIGZ1bmN0aW9uKGFjdGlvbikgeyBzLnB1Ymxpc2goXCJzZWxlY3RlZF9hY3Rpb25cIixhY3Rpb24pIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIiwgZnVuY3Rpb24oZGF0ZSkgeyBzLnB1Ymxpc2goXCJhY3Rpb25fZGF0ZVwiLGRhdGUpIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIsIGZ1bmN0aW9uKGRhdGUpIHsgcy5wdWJsaXNoKFwiY29tcGFyaXNvbl9kYXRlXCIsZGF0ZSkgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImNvbXBhcmlzb24uY2hhbmdlXCIsIGZ1bmN0aW9uKGFjdGlvbikgeyBcbiAgICAgIGlmIChhY3Rpb24udmFsdWUgPT0gZmFsc2UpIHJldHVybiBzLnB1Ymxpc2goXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsZmFsc2UpXG4gICAgICBzLnB1Ymxpc2goXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsYWN0aW9uKVxuICAgIH0pXG5cblxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IGZpbHRlckluaXQgZnJvbSAnLi9ldmVudHMvZmlsdGVyX2V2ZW50cydcbmltcG9ydCBhY3Rpb25Jbml0IGZyb20gJy4vZXZlbnRzL2FjdGlvbl9ldmVudHMnXG5cblxuY29uc3QgcyA9IHN0YXRlO1xuXG5jb25zdCBkZWVwY29weSA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoeCkpXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgZmlsdGVySW5pdCgpXG4gIGFjdGlvbkluaXQoKVxuXG4gIC8vIE9USEVSIGV2ZW50c1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJzb3J0LmNoYW5nZVwiLCBmdW5jdGlvbih4KSB7XG4gICAgICBjb25zdCBfcyA9IHMuc3RhdGUoKVxuICAgICAgY29uc3QgYXNjID0gX3Muc29ydCA9PSB4LmtleVxuXG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIilcblxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwic29ydFwiLHgua2V5KVxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiYXNjZW5kaW5nXCIsYXNjICYmICFfcy5hc2NlbmRpbmcpXG5cbiAgICAgIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKGZhbHNlLHMuc3RhdGUoKS5maWx0ZXJzLHMuc3RhdGUoKSlcblxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ2aWV3LmNoYW5nZVwiLCBmdW5jdGlvbih4KSB7XG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIix0cnVlKVxuICAgICAgdmFyIENQID0gZGVlcGNvcHkocy5zdGF0ZSgpLmRhc2hib2FyZF9vcHRpb25zKS5tYXAoZnVuY3Rpb24oZCkgeyBkLnNlbGVjdGVkID0gKHgudmFsdWUgPT0gZC52YWx1ZSkgPyAxIDogMDsgcmV0dXJuIGQgfSlcbiAgICAgIHMucHVibGlzaChcImRhc2hib2FyZF9vcHRpb25zXCIsQ1ApXG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcInRhYi5jaGFuZ2VcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIsdHJ1ZSlcblxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwidGFiX3Bvc2l0aW9uXCIseC5rZXkpXG4gICAgICBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKShmYWxzZSxzLnN0YXRlKCkuZmlsdGVycyxzLnN0YXRlKCkpXG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImJhLnNvcnRcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgcy5wdWJsaXNoKFwic29ydGJ5XCIsIHgudmFsdWUpXG4gICAgICBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKShmYWxzZSxzLnN0YXRlKCkuZmlsdGVycyxzLnN0YXRlKCkpXG4gICAgfSlcbn1cbiIsImltcG9ydCB7cXN9IGZyb20gJ3N0YXRlJztcbmltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSc7XG5pbXBvcnQge2NvbXBhcmV9IGZyb20gJy4uL2hlbHBlcnMnXG5cbmZ1bmN0aW9uIHB1Ymxpc2hRU1VwZGF0ZXModXBkYXRlcyxxc19zdGF0ZSkge1xuICBpZiAoT2JqZWN0LmtleXModXBkYXRlcykubGVuZ3RoKSB7XG4gICAgdXBkYXRlc1tcInFzX3N0YXRlXCJdID0gcXNfc3RhdGVcbiAgICBzdGF0ZS5wdWJsaXNoQmF0Y2godXBkYXRlcylcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuXG4gIHdpbmRvdy5vbnBvcHN0YXRlID0gZnVuY3Rpb24oaSkge1xuXG4gICAgdmFyIHN0YXRlID0gcy5fc3RhdGVcbiAgICAgICwgcXNfc3RhdGUgPSBpLnN0YXRlXG5cbiAgICB2YXIgdXBkYXRlcyA9IGNvbXBhcmUocXNfc3RhdGUsc3RhdGUpXG4gICAgcHVibGlzaFFTVXBkYXRlcyh1cGRhdGVzLHFzX3N0YXRlKVxuICB9XG5cbiAgY29uc3QgcyA9IHN0YXRlO1xuXG4gIHN0YXRlXG4gICAgLnN1YnNjcmliZShcImhpc3RvcnlcIixmdW5jdGlvbihlcnJvcixfc3RhdGUpIHtcbiAgICAgIC8vY29uc29sZS5sb2coXG4gICAgICAvLyAgXCJjdXJyZW50OiBcIitKU09OLnN0cmluZ2lmeShfc3RhdGUucXNfc3RhdGUpLCBcbiAgICAgIC8vICBKU09OLnN0cmluZ2lmeShfc3RhdGUuZmlsdGVycyksIFxuICAgICAgLy8gIF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9uc1xuICAgICAgLy8pXG5cbiAgICAgIHZhciBmb3Jfc3RhdGUgPSBbXCJmaWx0ZXJzXCJdXG5cbiAgICAgIHZhciBxc19zdGF0ZSA9IGZvcl9zdGF0ZS5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBpZiAoX3N0YXRlW2NdKSBwW2NdID0gX3N0YXRlW2NdXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICBpZiAoX3N0YXRlLnNlbGVjdGVkX2FjdGlvbikgcXNfc3RhdGVbJ3NlbGVjdGVkX2FjdGlvbiddID0gX3N0YXRlLnNlbGVjdGVkX2FjdGlvbi5hY3Rpb25faWRcbiAgICAgIGlmIChfc3RhdGUuc2VsZWN0ZWRfY29tcGFyaXNvbikgcXNfc3RhdGVbJ3NlbGVjdGVkX2NvbXBhcmlzb24nXSA9IF9zdGF0ZS5zZWxlY3RlZF9jb21wYXJpc29uLmFjdGlvbl9pZFxuICAgICAgaWYgKF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9ucykgcXNfc3RhdGVbJ3NlbGVjdGVkX3ZpZXcnXSA9IF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZVxuICAgICAgaWYgKF9zdGF0ZS5hY3Rpb25fZGF0ZSkgcXNfc3RhdGVbJ2FjdGlvbl9kYXRlJ10gPSBfc3RhdGUuYWN0aW9uX2RhdGVcbiAgICAgIGlmIChfc3RhdGUuY29tcGFyaXNvbl9kYXRlKSBxc19zdGF0ZVsnY29tcGFyaXNvbl9kYXRlJ10gPSBfc3RhdGUuY29tcGFyaXNvbl9kYXRlXG4gICAgICBpZiAoX3N0YXRlLnRyYW5zZm9ybSkgcXNfc3RhdGVbJ3RyYW5zZm9ybSddID0gX3N0YXRlLnRyYW5zZm9ybVxuICAgICAgaWYgKF9zdGF0ZS50YWJfcG9zaXRpb24pIHFzX3N0YXRlWyd0YWJfcG9zaXRpb24nXSA9IF9zdGF0ZS50YWJfcG9zaXRpb25cbiAgICAgIGlmIChfc3RhdGUuc29ydCkgcXNfc3RhdGVbJ3NvcnQnXSA9IF9zdGF0ZS5zb3J0XG4gICAgICBpZiAoX3N0YXRlLmFzY2VuZGluZykgcXNfc3RhdGVbJ2FzY2VuZGluZyddID0gX3N0YXRlLmFzY2VuZGluZ1xuXG5cblxuXG4gICAgICBpZiAoX3N0YXRlLnNlbGVjdGVkX2FjdGlvbiAmJiBxcyhxc19zdGF0ZSkudG8ocXNfc3RhdGUpICE9IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpIHtcbiAgICAgICAgcy5wdWJsaXNoKFwicXNfc3RhdGVcIixxc19zdGF0ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJoaXN0b3J5LmFjdGlvbnNcIiwgZnVuY3Rpb24oZXJyb3IsdmFsdWUsX3N0YXRlKSB7XG4gICAgICB2YXIgcXNfc3RhdGUgPSBxcyh7fSkuZnJvbSh3aW5kb3cubG9jYXRpb24uc2VhcmNoKVxuICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gubGVuZ3RoICYmIE9iamVjdC5rZXlzKHFzX3N0YXRlKS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHVwZGF0ZXMgPSBjb21wYXJlKHFzX3N0YXRlLF9zdGF0ZSlcbiAgICAgICAgcmV0dXJuIHB1Ymxpc2hRU1VwZGF0ZXModXBkYXRlcyxxc19zdGF0ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMucHVibGlzaChcInNlbGVjdGVkX2FjdGlvblwiLHZhbHVlWzBdKVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImhpc3RvcnkucXNfc3RhdGVcIiwgZnVuY3Rpb24oZXJyb3IscXNfc3RhdGUsX3N0YXRlKSB7XG5cbiAgICAgIGlmIChKU09OLnN0cmluZ2lmeShoaXN0b3J5LnN0YXRlKSA9PSBKU09OLnN0cmluZ2lmeShxc19zdGF0ZSkpIHJldHVyblxuICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggPT0gXCJcIikgaGlzdG9yeS5yZXBsYWNlU3RhdGUocXNfc3RhdGUsXCJcIixxcyhxc19zdGF0ZSkudG8ocXNfc3RhdGUpKVxuICAgICAgZWxzZSBoaXN0b3J5LnB1c2hTdGF0ZShxc19zdGF0ZSxcIlwiLHFzKHFzX3N0YXRlKS50byhxc19zdGF0ZSkpXG5cbiAgICB9KVxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJ2FwaSdcblxuY29uc3QgcyA9IHN0YXRlO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuXG4gIC8vIFN1YnNjcmlwdGlvbnMgdGhhdCByZWNlaXZlIGRhdGEgLyBtb2RpZnkgLyBjaGFuZ2Ugd2hlcmUgaXQgaXMgc3RvcmVkXG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwicmVjZWl2ZS5kYXRhXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImxvZ2ljX2NhdGVnb3JpZXNcIix2YWx1ZS5jYXRlZ29yaWVzKVxuICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHN0YXRlLmZpbHRlcnMpXG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwicmVjZWl2ZS5jb21wYXJpc29uX2RhdGFcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHN0YXRlLmZpbHRlcnMpXG4gICAgfSlcblxuXG4gIC8vIFN1YnNjcmlwdGlvbnMgdGhhdCB3aWxsIGdldCBtb3JlIGRhdGFcblxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuYWN0aW9uX2RhdGVcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YShzdGF0ZS5zZWxlY3RlZF9hY3Rpb24sc3RhdGUuYWN0aW9uX2RhdGUpKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImdldC5jb21wYXJpc29uX2RhdGVcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGZhbHNlKVxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiY29tcGFyaXNvbl9kYXRhXCIsYXBpLmFjdGlvbi5nZXREYXRhKHN0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24sc3RhdGUuY29tcGFyaXNvbl9kYXRlKSlcbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuc2VsZWN0ZWRfYWN0aW9uXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImRhdGFcIixhcGkuYWN0aW9uLmdldERhdGEodmFsdWUsc3RhdGUuYWN0aW9uX2RhdGUpKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImdldC5zZWxlY3RlZF9jb21wYXJpc29uXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybiBzLnB1Ymxpc2hTdGF0aWMoXCJjb21wYXJpc29uX2RhdGFcIixmYWxzZSlcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YSh2YWx1ZSxzdGF0ZS5jb21wYXJpc29uX2RhdGUpKVxuICAgIH0pXG5cblxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IHtxc30gZnJvbSAnc3RhdGUnXG5pbXBvcnQgYnVpbGQgZnJvbSAnLi9idWlsZCdcbmltcG9ydCBoaXN0b3J5U3Vic2NyaXB0aW9ucyBmcm9tICcuL3N1YnNjcmlwdGlvbnMvaGlzdG9yeSdcbmltcG9ydCBhcGlTdWJzY3JpcHRpb25zIGZyb20gJy4vc3Vic2NyaXB0aW9ucy9hcGknXG5cblxuY29uc3QgcyA9IHN0YXRlO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgaGlzdG9yeVN1YnNjcmlwdGlvbnMoKVxuICBhcGlTdWJzY3JpcHRpb25zKClcblxuICBcbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLmxvYWRpbmdcIiwgZnVuY3Rpb24oZXJyb3IsbG9hZGluZyx2YWx1ZSkgeyBidWlsZCgpKCkgfSlcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLmRhc2hib2FyZF9vcHRpb25zXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKVxuICAgIC5zdWJzY3JpYmUoXCJjaGFuZ2UudGFic1wiLCBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKSkgXG4gICAgLnN1YnNjcmliZShcImNoYW5nZS5sb2dpY19vcHRpb25zXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpIClcbiAgICAuc3Vic2NyaWJlKFwidXBkYXRlLmZpbHRlcnNcIiwgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikpXG4gICAgXG5cbiAgLy8gUkVEUkFXOiB0aGlzIGlzIHdoZXJlIHRoZSBlbnRpcmUgYXBwIGdldHMgcmVkcmF3biAtIGlmIGZvcm1hdHRlZF9kYXRhIGNoYW5nZXMsIHJlZHJhdyB0aGUgYXBwXG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwicmVkcmF3LmZvcm1hdHRlZF9kYXRhXCIsIGZ1bmN0aW9uKGVycm9yLGZvcm1hdHRlZF9kYXRhLHZhbHVlKSB7IFxuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIsZmFsc2UpOyBcbiAgICAgIGJ1aWxkKCkoKSBcbiAgICB9KVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGQzIGZyb20gJ2QzJ1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJ2FwaSdcbmltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCB2aWV3IGZyb20gJy4vdmlldydcbmltcG9ydCBpbml0RXZlbnRzIGZyb20gJy4vZXZlbnRzJ1xuaW1wb3J0IGluaXRTdWJzY3JpcHRpb25zIGZyb20gJy4vc3Vic2NyaXB0aW9ucydcblxuXG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYnVpbGQodGFyZ2V0KSB7XG4gIGNvbnN0IGRiID0gbmV3IERhc2hib2FyZCh0YXJnZXQpXG4gIHJldHVybiBkYlxufVxuXG5jbGFzcyBEYXNoYm9hcmQge1xuXG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIGluaXRFdmVudHMoKVxuICAgIGluaXRTdWJzY3JpcHRpb25zKClcbiAgICB0aGlzLnRhcmdldCh0YXJnZXQpXG4gICAgdGhpcy5pbml0KClcblxuICAgIHJldHVybiB0aGlzLmNhbGwuYmluZCh0aGlzKVxuICB9XG5cbiAgdGFyZ2V0KHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldCB8fCBkM191cGRhdGVhYmxlKGQzLnNlbGVjdChcIi5jb250YWluZXJcIiksXCJkaXZcIixcImRpdlwiKVxuICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMDBweFwiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiYXV0b1wiKVxuICB9XG5cbiAgaW5pdCgpIHtcbiAgICBsZXQgcyA9IHN0YXRlO1xuICAgIGxldCB2YWx1ZSA9IHMuc3RhdGUoKVxuICAgIHRoaXMuZGVmYXVsdHMocylcbiAgfVxuXG4gIGRlZmF1bHRzKHMpIHtcblxuICAgIGlmICghIXMuc3RhdGUoKS5kYXNoYm9hcmRfb3B0aW9ucykgcmV0dXJuIC8vIGRvbid0IHJlbG9hZCBkZWZhdWx0cyBpZiBwcmVzZW50XG5cbiAgICBzLnB1Ymxpc2hTdGF0aWMoXCJhY3Rpb25zXCIsYXBpLmFjdGlvbi5nZXRBbGwpXG4gICAgcy5wdWJsaXNoU3RhdGljKFwic2F2ZWRcIixhcGkuZGFzaGJvYXJkLmdldEFsbClcbiAgICBzLnB1Ymxpc2hTdGF0aWMoXCJsaW5lX2l0ZW1zXCIsYXBpLmxpbmVfaXRlbS5nZXRBbGwpXG5cbiAgICB2YXIgREVGQVVMVFMgPSB7XG4gICAgICAgIGxvZ2ljX29wdGlvbnM6IFt7XCJrZXlcIjpcIkFsbFwiLFwidmFsdWVcIjpcImFuZFwifSx7XCJrZXlcIjpcIkFueVwiLFwidmFsdWVcIjpcIm9yXCJ9XVxuICAgICAgLCBsb2dpY19jYXRlZ29yaWVzOiBbXVxuICAgICAgLCBmaWx0ZXJzOiBbe31dIFxuICAgICAgLCBkYXNoYm9hcmRfb3B0aW9uczogW1xuICAgICAgICAgICAge1wia2V5XCI6XCJEYXRhIHN1bW1hcnlcIixcInZhbHVlXCI6XCJzdW1tYXJ5LXZpZXdcIixcInNlbGVjdGVkXCI6MX1cbiAgICAgICAgICAsIHtcImtleVwiOlwiRXhwbG9yZSBkYXRhXCIsXCJ2YWx1ZVwiOlwiZGF0YS12aWV3XCIsXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIkJlZm9yZSAmIEFmdGVyXCIsXCJ2YWx1ZVwiOlwiYmEtdmlld1wiLFwic2VsZWN0ZWRcIjowfVxuICAgICAgICAgICwge1wia2V5XCI6XCJUaW1pbmdcIixcInZhbHVlXCI6XCJ0aW1pbmctdmlld1wiLFwic2VsZWN0ZWRcIjowfVxuICAgICAgICAgICwge1wia2V5XCI6XCJNZWRpYSBQbGFuXCIsIFwidmFsdWVcIjpcIm1lZGlhLXZpZXdcIixcInNlbGVjdGVkXCI6MH1cblxuICAgICAgICBdXG4gICAgfVxuXG4gICAgcy51cGRhdGUoZmFsc2UsREVGQVVMVFMpXG4gIH1cblxuICBjYWxsKCkge1xuXG4gICBsZXQgcyA9IHN0YXRlO1xuICAgbGV0IHZhbHVlID0gcy5zdGF0ZSgpXG5cbiAgIGxldCBkYiA9IHZpZXcodGhpcy5fdGFyZ2V0KVxuICAgICAudHJhbnNmb3JtKHZhbHVlLnRyYW5zZm9ybSB8fCBcIlwiKVxuICAgICAuc3RhZ2VkX2ZpbHRlcnModmFsdWUuc3RhZ2VkX2ZpbHRlciB8fCBcIlwiKVxuICAgICAubWVkaWEodmFsdWUubWVkaWFfcGxhbiB8fCB7fSlcbiAgICAgLnNhdmVkKHZhbHVlLnNhdmVkIHx8IFtdKVxuICAgICAuZGF0YSh2YWx1ZS5mb3JtYXR0ZWRfZGF0YSB8fCB7fSlcbiAgICAgLmFjdGlvbnModmFsdWUuYWN0aW9ucyB8fCBbXSlcbiAgICAgLnNlbGVjdGVkX2FjdGlvbih2YWx1ZS5zZWxlY3RlZF9hY3Rpb24gfHwge30pXG4gICAgIC5zZWxlY3RlZF9jb21wYXJpc29uKHZhbHVlLnNlbGVjdGVkX2NvbXBhcmlzb24gfHwge30pXG4gICAgIC5hY3Rpb25fZGF0ZSh2YWx1ZS5hY3Rpb25fZGF0ZSB8fCAwKVxuICAgICAuY29tcGFyaXNvbl9kYXRlKHZhbHVlLmNvbXBhcmlzb25fZGF0ZSB8fCAwKVxuICAgICAubG9hZGluZyh2YWx1ZS5sb2FkaW5nIHx8IGZhbHNlKVxuICAgICAubGluZV9pdGVtcyh2YWx1ZS5saW5lX2l0ZW1zIHx8IGZhbHNlKVxuICAgICAuc3VtbWFyeSh2YWx1ZS5zdW1tYXJ5IHx8IGZhbHNlKVxuICAgICAudGltZV9zdW1tYXJ5KHZhbHVlLnRpbWVfc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLmNhdGVnb3J5X3N1bW1hcnkodmFsdWUuY2F0ZWdvcnlfc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLmtleXdvcmRfc3VtbWFyeSh2YWx1ZS5rZXl3b3JkX3N1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC5iZWZvcmUodmFsdWUuYmVmb3JlX3VybHMgfHwgW10pXG4gICAgIC5iZWZvcmVfdGFicyh2YWx1ZS5iZWZvcmVfdGFicyB8fCBbXSlcbiAgICAgLy8uYWZ0ZXIodmFsdWUuYWZ0ZXJfdXJscyB8fCBbXSlcbiAgICAgLmxvZ2ljX29wdGlvbnModmFsdWUubG9naWNfb3B0aW9ucyB8fCBmYWxzZSlcbiAgICAgLmxvZ2ljX2NhdGVnb3JpZXModmFsdWUubG9naWNfY2F0ZWdvcmllcyB8fCBmYWxzZSlcbiAgICAgLmZpbHRlcnModmFsdWUuZmlsdGVycyB8fCBmYWxzZSlcbiAgICAgLnZpZXdfb3B0aW9ucyh2YWx1ZS5kYXNoYm9hcmRfb3B0aW9ucyB8fCBmYWxzZSlcbiAgICAgLmV4cGxvcmVfdGFicyh2YWx1ZS50YWJzIHx8IGZhbHNlKVxuICAgICAudGltZV90YWJzKHZhbHVlLnRpbWVfdGFicyB8fCBmYWxzZSlcbiAgICAgLnNvcnQodmFsdWUuc29ydCB8fCBmYWxzZSlcbiAgICAgLmFzY2VuZGluZyh2YWx1ZS5hc2NlbmRpbmcgfHwgZmFsc2UpXG5cbiAgICAgLm9uKFwiYWRkLWZpbHRlclwiLCBzLnByZXBhcmVFdmVudChcImFkZC1maWx0ZXJcIikpXG4gICAgIC5vbihcIm1vZGlmeS1maWx0ZXJcIiwgcy5wcmVwYXJlRXZlbnQoXCJtb2RpZnktZmlsdGVyXCIpKVxuICAgICAub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKVxuICAgICAub24oXCJhY3Rpb24uY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwiYWN0aW9uLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIpKVxuICAgICAub24oXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJjb21wYXJpc29uLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwibG9naWMuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwibG9naWMuY2hhbmdlXCIpKVxuICAgICAub24oXCJmaWx0ZXIuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwiZmlsdGVyLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwidmlldy5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJ2aWV3LmNoYW5nZVwiKSlcbiAgICAgLm9uKFwidGFiLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcInRhYi5jaGFuZ2VcIikpXG4gICAgIC5vbihcImJhLnNvcnRcIiwgcy5wcmVwYXJlRXZlbnQoXCJiYS5zb3J0XCIpKVxuICAgICAub24oXCJzb3J0LmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcInNvcnQuY2hhbmdlXCIpKVxuICAgICAuZHJhdygpXG4gICBcbiAgfVxufVxuIiwidmFyIHZlcnNpb24gPSBcIjAuMC4xXCI7IGV4cG9ydCAqIGZyb20gXCIuLi9pbmRleFwiOyBleHBvcnQge3ZlcnNpb259OyJdLCJuYW1lcyI6WyJub29wIiwic3RhdGUiLCJkM191cGRhdGVhYmxlIiwiZDNfc3BsYXQiLCJhY2Nlc3NvciQxIiwic3RhdGUuY29tcF9ldmFsIiwic3RhdGUucXMiLCJhY2Nlc3NvciIsImlkZW50aXR5Iiwia2V5IiwiZDMiLCJ0YWJsZSIsInNlbGVjdCIsImZpbHRlciIsInByZXBEYXRhIiwicCIsIkVYQU1QTEVfREFUQSIsInRpbWVzZXJpZXNbJ2RlZmF1bHQnXSIsImJ1Y2tldHMiLCJTVE9QV09SRFMiLCJob3VyYnVja2V0cyIsInRpbWluZ0hlYWRlcnMiLCJjb21wdXRlU2NhbGUiLCJ0aW1lc2VyaWVzLnByZXBEYXRhIiwiZDNfY2xhc3MiLCJyZWxhdGl2ZV92aWV3IiwidGltaW5nX3ZpZXciLCJzdGFnZWRfZmlsdGVyX3ZpZXciLCJpbml0IiwicyIsImZpbHRlckluaXQiLCJhY3Rpb25Jbml0IiwiYXBpLmFjdGlvbiIsImhpc3RvcnlTdWJzY3JpcHRpb25zIiwiYXBpU3Vic2NyaXB0aW9ucyIsImluaXRFdmVudHMiLCJpbml0U3Vic2NyaXB0aW9ucyIsImFwaS5kYXNoYm9hcmQiLCJhcGkubGluZV9pdGVtIiwidmlldyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFPLE1BQU0sYUFBYSxHQUFHLFNBQVMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtFQUN0RSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksTUFBSztFQUN4QixJQUFJLFVBQVUsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUk7SUFDOUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xDOztFQUVELFVBQVUsQ0FBQyxLQUFLLEVBQUU7S0FDZixNQUFNLENBQUMsSUFBSSxFQUFDOztFQUVmLE9BQU8sVUFBVTtFQUNsQjs7QUFFRCxBQUFPLE1BQU0s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O0FBRUQsSUFBSSxHQUFHLEdBQUc7SUFDTixPQUFPLEVBQUUsU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFO1FBQzNCLE9BQU8sU0FBUyxDQUFDLEVBQUU7VUFDakIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUM7VUFDN0IsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDO1NBQzNHO09BQ0Y7SUFDSCxXQUFXLEVBQUUsU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFO1FBQy9CLE9BQU8sU0FBUyxDQUFDLEVBQUU7VUFDakIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUM7VUFDN0IsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDO1NBQzVHO09BQ0Y7RUFDTjs7QUFFRCxBQUFPLFNBQVMsY0FBYyxDQUFDLE9BQU8sRUFBRTtFQUN0QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQyxFQUFDO0VBQzNCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBQztFQUNsRSxPQUFPLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENB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R0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNsRCxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNwRCxPQUFPLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDOztJQUU3RCxJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRTtXQUMzQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7V0FDbkIsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRTtXQUN2QixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7V0FDZixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkIsTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFO1dBQ3ZCLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7V0FDdkIsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs7SUFFckMsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztPQUN0RSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxR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QyxDQUFDLEVBQUUsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO09BQzFELEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO09BQ3BCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDOzs7SUFHcEQsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO09BQ3BHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO09BQ3hCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztPQUN4QixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7T0FDM0QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7T0FDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFDOztJQUU3RCxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFFOztJQUVyQixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFFOztJQUVyQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFFO0lBQ3BCLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEdBQUU7O0lBRXhCLE9BQU8sSUFBSTtHQUNa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QUcsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxHQUFFO0FBQ2pFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBQztBQUN2QixJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUU7O0FBRXBELEFBQU8sTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7RUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFDO0VBQ25ELE9BQU8sQ0FBQztDQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQzs7QUFFTixBQUFPLFNBQVMsU0FBUyxDQUFDLE1BQU0sRUFBRTs7RUFFaEMsSUFBSSxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0lBQzVDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUM7SUFDYixPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0dBQ2xDLEVBQUM7O0VBRUYsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFNO0VBQ3pELElBQUksU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUM7O0VBRWpELElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7S0FDN0UsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7O0VBRWhCLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0tBQ3BGLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDOztFQUVoQixJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUU7O0VBRTNFLE9BQU8sTUFBTTtDQUNkOztBQUVELEFBQU8sU0FBUyxZQUFZLENBQUMsQ0FBQyxFQUFFO0VBQzlCLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxDQUFDLEVBQUM7RUFDekIsSUFBSSxHQUFHLEdBQUcsR0FBRTtFQUNaLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFDOztFQUVsRixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztDQUN0Qzs7QUFFRCxBQUFPLFNBQVMsWUFBWSxDQUFDLE1BQU0sRUFBRTtFQUNuQyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0lBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSTtNQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztLQUNiLEVBQUM7SUFDRixPQUFPLENBQUM7R0FDVCxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Q0FDNUQ7OztBQUdELEFBQU8sTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFJLEtBQUs7RUFDcEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7SUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtNQUMzRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQztLQUN4QixF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
