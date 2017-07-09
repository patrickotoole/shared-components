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


      d3_updateable(th,"span","span")
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

  props() { return ["data", "options"] }

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
      .sort("importance")
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

const categoryWeights = (categories) => {
  return categories.reduce((p,c) => {
      p[c.key] = (1 + c.values[0].percent_diff);
      return p
    },{})
};

function prefixDomainWeightsReducer(prefix,weights, p,c) {
      p[c.domain] = p[c.domain] || {};
      p[c.domain]['domain'] = c.domain;
      p[c.domain]['weighted'] = c.visits * weights[c.parent_category_name];
      
      p[c.domain][prefix + c.time_diff_bucket] = (p[c.domain][c.time_diff_bucket] || 0) + c.visits;
      return p
}
const beforeAndAfterTabular = (before, after, weights) => {
  const domain_time = {};

  before.reduce(prefixDomainWeightsReducer.bind(false,"",weights),domain_time);
  after.reduce(prefixDomainWeightsReducer.bind(false,"-",weights),domain_time);

  const sorted = Object.keys(domain_time)
    .map((k) => { return domain_time[k] })
    .sort((p,c) => {
      return d3.descending(p['600']*p.weighted || -Infinity,c['600']*c.weighted || -Infinity)
    });

  return sorted
};

const computeScale = (data) => {
  const max = data.reduce((p,c) => {
    Object.keys(c).filter(z => z != "domain" && z != "weighted").map(function(x) {
      p = c[x] > p ? c[x] : p;
    });
  
    return p
  },0);

  return d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])
};

var buckets$2 = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) });
buckets$2 = buckets$2.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }));


const formatName = function(x) {

  if (x < 0) x = -x;

  if (x == 3600) return "1 hr"
  if (x < 3600) return x/60 + " mins" 

  if (x == 86400) return "1 day"
  if (x > 86400) return x/86400 + " days" 

  return x/3600 + " hrs"
};

const timingHeaders = buckets$2.map(x => { return {"key":x, "value":formatName(x), "selected":true} });

__$styleInject(".ba-row {\n        padding-bottom:60px;\n}\n\n.ba-row .expanded td {\nbackground:#f9f9fb;\n            padding-top:10px;\n            padding-bottom:10px;\n}\n\n.ba-row th {\n  border-right:1px rgba(0,0,0,.1);\n}\n\n.ba-row th span.greater-than {\nfont-size:.9em;\nwidth:70px;\ntransform:rotate(45deg);\ntext-align:right;\ndisplay:inline-block;\nmargin-left: -48px;\nmargin-bottom: 12px;\n\n}\n.ba-row th span.less-than {\nfont-size:.9em;\nwidth:70px;\ntransform:rotate(-45deg);\ndisplay:inline-block;\nmargin-left:-9px;\nmargin-bottom: 12px\n}\n.ba-row .table-wrapper tr th {\n  border:0px\n}\n",undefined);

function relative_timing(target) {
  return new RelativeTiming(target)
}

class RelativeTiming extends D3ComponentBase {
  constructor(target) {
    super(target);
  }

  props() { return ["data"] }

  draw() {

    var self = this;
    var data = this._data;
    var wrap = d3_class(this._target,"summary-wrap");

    header(wrap)
      .text("Before and After")
      .draw();

    var bawrap = d3_class(wrap,"ba-row");

    try {
      var stages = drawStream(bawrap,this._data.before_categories,this._data.after_categories);
      //bawrap.selectAll(".before-stream").remove() // HACK
    } catch(e) {
      bawrap.html("");
      return
    }

    const weights = categoryWeights(data.before_categories);
    const sorted_tabular = beforeAndAfterTabular(data.before,data.after,weights)
      .slice(0,1000);

    const oscale = computeScale(sorted_tabular);
    const headers = [{"key":"domain", "value":"Domain"}].concat(timingHeaders);

    table$1(bawrap)
      .top(140)
      .headers(headers)
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

const timingTabular = (data) => {
  return d3.nest()
    .key(x => x.domain)
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

      x.tabular["domain"] = x.key;
      x.tabular["total"] = d3.sum(x.buckets,x => x.views);
      
      return x
    })
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

  draw() {

    var self = this;
    var data = this._data;
    var wrap = d3_class(this._target,"timing-wrap");

    const headers = [{key:"domain",value:"Domain"}].concat(timingHeaders$1);
    const d = data[0].values;//timingTabular(data.full_urls)
    const oscale = computeScale$1(d);


    header(wrap)
      .text("Timing")
      .draw();

    var timingwrap = d3_class(wrap,"timing-row");

    var table_obj = table$1(timingwrap)
      .top(140)
      .headers(headers)
      .data({"key":"", "values":d.map(x => x.tabular) })
      .sort("total")
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
              .on("select", self.on("tab.change") )
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
             .data(self.time_tabs())
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
        , buildUrlsTab(full_urls,categories)
        , {key:"Top Categories", values: cat_summary}
      ];

      if (_state.tabs) {
        _state.tabs.map((x,i) => {
          tabs[i].selected = x.selected;
        });
      }

      s$$1.setStatic("tabs",tabs);




      // TIMING
      const timing = buildTiming(value.full_urls, value.comparison);
      const timing_tabular = timingTabular(full_urls);

      s$$1.setStatic("time_summary", timing);
      s$$1.setStatic("time_tabs", [{"key":"Top Domains", "values": timing_tabular}]);




      // BEFORE AND AFTER
      if (_state.data.before) {

        const before_urls = filterUrls(_state.data.before,logic,filters)
          , after_urls = filterUrls(_state.data.after,logic,filters)
          , before_and_after = buildBeforeAndAfter(before_urls,after_urls,cat_summary,_state.sortby);

        s$$1.setStatic("before_urls",before_and_after); 
        s$$1.setStatic("after_urls", before_and_after.after_urls);

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
      s$1.prepareEvent("updateFilter");
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
     .after(value.after_urls || [])
     .logic_options(value.logic_options || false)
     .logic_categories(value.logic_categories || false)
     .filters(value.filters || false)
     .view_options(value.dashboard_options || false)
     .explore_tabs(value.tabs || false)
     .time_tabs(value.time_tabs || false)
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

var version = "0.0.1";

exports.version = version;
exports.view = new_dashboard;
exports.build = build;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFzaGJvYXJkLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvaGVscGVycy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdGF0ZS9zcmMvc3RhdGUuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvc3JjL3FzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N0YXRlL3NyYy9jb21wX2V2YWwuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvbWVkaWFfcGxhbi9zcmMvbWVkaWFfcGxhbi5qcyIsIi4uL25vZGVfbW9kdWxlcy9maWx0ZXIvYnVpbGQvZmlsdGVyLmVzLmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzLmpzIiwiLi4vc3JjL2hlbHBlcnMvZ3JhcGhfaGVscGVycy5qcyIsIi4uL3NyYy9oZWxwZXJzL3N0YXRlX2hlbHBlcnMuanMiLCIuLi9zcmMvaGVscGVycy5qcyIsIi4uL3NyYy9nZW5lcmljL3NlbGVjdC5qcyIsIi4uL3NyYy9nZW5lcmljL2hlYWRlci5qcyIsIi4uL25vZGVfbW9kdWxlcy90YWJsZS9zcmMvdGFibGUuanMiLCIuLi9ub2RlX21vZHVsZXMvdGFibGUvc3JjL3N1bW1hcnlfdGFibGUuanMiLCIuLi9zcmMvdmlld3MvZmlsdGVyX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy9idXR0b25fcmFkaW8uanMiLCIuLi9zcmMvdmlld3Mvb3B0aW9uX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy90aW1lc2VyaWVzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdGFidWxhcl90aW1lc2VyaWVzL2hlYWRlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9jaGFydC9zcmMvc2ltcGxlX3RpbWVzZXJpZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL2JhX3RpbWVzZXJpZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL3NpbXBsZV9iYXIuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL2J1bGxldC5qcyIsIi4uL25vZGVfbW9kdWxlcy9jb21wb25lbnQvc3JjL3RhYnVsYXJfdGltZXNlcmllcy9ib2R5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdGFidWxhcl90aW1lc2VyaWVzL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvZG9tYWluX2V4cGFuZGVkLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdmVydGljYWxfb3B0aW9uLmpzIiwiLi4vc3JjL3ZpZXdzL2RvbWFpbl92aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3NlZ21lbnRfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2RpZmZfYmFyLmpzIiwiLi4vc3JjL2dlbmVyaWMvY29tcF9iYXIuanMiLCIuLi9zcmMvdmlld3Mvc3VtbWFyeS9jYXRlZ29yeS5qcyIsIi4uL3NyYy9nZW5lcmljL2NvbXBfYnViYmxlLmpzIiwiLi4vc3JjL2dlbmVyaWMvc3RyZWFtX3Bsb3QuanMiLCIuLi9zcmMvdmlld3Mvc3VtbWFyeS9iZWZvcmVfYW5kX2FmdGVyLmpzIiwiLi4vc3JjL2dlbmVyaWMvcGllLmpzIiwiLi4vc3JjL3ZpZXdzL3N1bW1hcnkvc2FtcGxlX3ZzX3BvcC5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5L3RpbWluZy5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5L3ZpZXcuanMiLCIuLi9zcmMvdmlld3MvcmVsYXRpdmVfdGltaW5nL3JlZmluZV9yZWxhdGl2ZV9wcm9jZXNzLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy9yZWZpbmVfcmVsYXRpdmUuanMiLCIuLi9zcmMvdmlld3MvcmVsYXRpdmVfdGltaW5nL3JlbGF0aXZlX3RpbWluZ19wcm9jZXNzLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy9yZWxhdGl2ZV90aW1pbmdfY29uc3RhbnRzLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy92aWV3LmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2NhdGVnb3J5LmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzL3RpbWluZy5qcyIsIi4uL3NyYy92aWV3cy90aW1pbmcvdGltaW5nX2NvbnN0YW50cy5qcyIsIi4uL3NyYy92aWV3cy90aW1pbmcvdGltaW5nX3Byb2Nlc3MuanMiLCIuLi9zcmMvdmlld3MvdGltaW5nL3ZpZXcuanMiLCIuLi9zcmMvdmlld3Mvc3RhZ2VkX2ZpbHRlcl92aWV3LmpzIiwiLi4vc3JjL2dlbmVyaWMvY29uZGl0aW9uYWxfc2hvdy5qcyIsIi4uL3NyYy9nZW5lcmljL3NoYXJlLmpzIiwiLi4vc3JjL3ZpZXcuanMiLCIuLi9ub2RlX21vZHVsZXMvYXBpL3NyYy9hY3Rpb24uanMiLCIuLi9ub2RlX21vZHVsZXMvYXBpL2luZGV4LmpzIiwiLi4vc3JjL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2JlZm9yZV9hbmRfYWZ0ZXIuanMiLCIuLi9zcmMvaGVscGVycy9kYXRhX2hlbHBlcnMvdXJscy5qcyIsIi4uL3NyYy9oZWxwZXJzL2RhdGFfaGVscGVycy9kb21haW5zLmpzIiwiLi4vc3JjL2V2ZW50cy9maWx0ZXJfZXZlbnRzLmpzIiwiLi4vc3JjL2V2ZW50cy9hY3Rpb25fZXZlbnRzLmpzIiwiLi4vc3JjL2V2ZW50cy5qcyIsIi4uL3NyYy9zdWJzY3JpcHRpb25zL2hpc3RvcnkuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy9hcGkuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy5qcyIsIi4uL3NyYy9idWlsZC5qcyIsImJ1bmRsZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgZDNfdXBkYXRlYWJsZSA9IGZ1bmN0aW9uKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZXhwb3J0IGNvbnN0IGQzX3NwbGF0ID0gZnVuY3Rpb24odGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCJcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKVxuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSlcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZDNfY2xhc3ModGFyZ2V0LGNscyx0eXBlLGRhdGEpIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLlwiICsgY2xzLCB0eXBlIHx8IFwiZGl2XCIsZGF0YSlcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vb3AoKSB7fVxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZXhwb3J0IGZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgY2xhc3MgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICAgIHRoaXMucHJvcHMoKS5tYXAoeCA9PiB7XG4gICAgICB0aGlzW3hdID0gYWNjZXNzb3IuYmluZCh0aGlzLHgpXG4gICAgfSlcbiAgfVxuICBwcm9wcygpIHtcbiAgICByZXR1cm4gW1wiZGF0YVwiXVxuICB9XG4gIG9uKGFjdGlvbixmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gU3RhdGUoX2N1cnJlbnQsIF9zdGF0aWMpIHtcblxuICB0aGlzLl9ub29wID0gZnVuY3Rpb24oKSB7fVxuICB0aGlzLl9ldmVudHMgPSB7fVxuXG4gIHRoaXMuX29uID0ge1xuICAgICAgXCJjaGFuZ2VcIjogdGhpcy5fbm9vcFxuICAgICwgXCJidWlsZFwiOiB0aGlzLl9ub29wXG4gICAgLCBcImZvcndhcmRcIjogdGhpcy5fbm9vcFxuICAgICwgXCJiYWNrXCI6IHRoaXMuX25vb3BcbiAgfVxuXG4gIHRoaXMuX3N0YXRpYyA9IF9zdGF0aWMgfHwge31cblxuICB0aGlzLl9jdXJyZW50ID0gX2N1cnJlbnQgfHwge31cbiAgdGhpcy5fcGFzdCA9IFtdXG4gIHRoaXMuX2Z1dHVyZSA9IFtdXG5cbiAgdGhpcy5fc3Vic2NyaXB0aW9uID0ge31cbiAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcblxuXG59XG5cblN0YXRlLnByb3RvdHlwZSA9IHtcbiAgICBzdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9zdGF0ZSlcbiAgICB9XG4gICwgcHVibGlzaDogZnVuY3Rpb24obmFtZSxjYikge1xuXG4gICAgICAgdmFyIHB1c2hfY2IgPSBmdW5jdGlvbihlcnJvcix2YWx1ZSkge1xuICAgICAgICAgaWYgKGVycm9yKSByZXR1cm4gc3Vic2NyaWJlcihlcnJvcixudWxsKVxuICAgICAgICAgXG4gICAgICAgICB0aGlzLnVwZGF0ZShuYW1lLCB2YWx1ZSlcbiAgICAgICAgIHRoaXMudHJpZ2dlcihuYW1lLCB0aGlzLnN0YXRlKClbbmFtZV0sIHRoaXMuc3RhdGUoKSlcblxuICAgICAgIH0uYmluZCh0aGlzKVxuXG4gICAgICAgaWYgKHR5cGVvZiBjYiA9PT0gXCJmdW5jdGlvblwiKSBjYihwdXNoX2NiKVxuICAgICAgIGVsc2UgcHVzaF9jYihmYWxzZSxjYilcblxuICAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHB1Ymxpc2hCYXRjaDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICBPYmplY3Qua2V5cyhvYmopLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHRoaXMudXBkYXRlKHgsb2JqW3hdKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB0aGlzLnRyaWdnZXJCYXRjaChvYmosdGhpcy5zdGF0ZSgpKVxuICAgIH1cbiAgLCBwdXNoOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgdGhpcy5wdWJsaXNoKGZhbHNlLHN0YXRlKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgc3Vic2NyaWJlOiBmdW5jdGlvbigpIHtcblxuICAgICAgLy8gdGhyZWUgb3B0aW9ucyBmb3IgdGhlIGFyZ3VtZW50czpcbiAgICAgIC8vIChmbikgXG4gICAgICAvLyAoaWQsZm4pXG4gICAgICAvLyAoaWQudGFyZ2V0LGZuKVxuXG5cbiAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB0aGlzLl9nbG9iYWxfc3Vic2NyaWJlKGFyZ3VtZW50c1swXSlcbiAgICAgIGlmIChhcmd1bWVudHNbMF0uaW5kZXhPZihcIi5cIikgPT0gLTEpIHJldHVybiB0aGlzLl9uYW1lZF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pXG4gICAgICBpZiAoYXJndW1lbnRzWzBdLmluZGV4T2YoXCIuXCIpID4gLTEpIHJldHVybiB0aGlzLl90YXJnZXR0ZWRfc3Vic2NyaWJlKGFyZ3VtZW50c1swXS5zcGxpdChcIi5cIilbMF0sIGFyZ3VtZW50c1swXS5zcGxpdChcIi5cIilbMV0sIGFyZ3VtZW50c1sxXSlcblxuICAgIH1cbiAgLCB1bnN1YnNjcmliZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgIHRoaXMuc3Vic2NyaWJlKGlkLHVuZGVmaW5lZClcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICwgX2dsb2JhbF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB2YXIgaWQgPSAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgICB2YXIgciA9IE1hdGgucmFuZG9tKCkqMTZ8MCwgdiA9IGMgPT0gJ3gnID8gciA6IChyJjB4M3wweDgpO1xuICAgICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICAgICAgfSlcbiAgICAgICwgdG8gPSBcIipcIjtcbiAgICAgXG4gICAgICB0aGlzLl90YXJnZXR0ZWRfc3Vic2NyaWJlKGlkLHRvLGZuKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBfbmFtZWRfc3Vic2NyaWJlOiBmdW5jdGlvbihpZCxmbikge1xuICAgICAgdmFyIHRvID0gXCIqXCJcbiAgICAgIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoaWQsdG8sZm4pXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIF90YXJnZXR0ZWRfc3Vic2NyaWJlOiBmdW5jdGlvbihpZCx0byxmbikge1xuXG4gICAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX29iaih0bylcbiAgICAgICAgLCB0b19zdGF0ZSA9IHRoaXMuX3N0YXRlW3RvXVxuICAgICAgICAsIHN0YXRlID0gdGhpcy5fc3RhdGU7XG5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiAmJiBmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gc3Vic2NyaXB0aW9uc1tpZF0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlbGV0ZSBzdWJzY3JpcHRpb25zW2lkXVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgfVxuICAgICAgc3Vic2NyaXB0aW9uc1tpZF0gPSBmbjtcblxuICAgICAgcmV0dXJuIHRoaXMgICAgICBcbiAgICB9XG4gIFxuICAsIGdldF9zdWJzY3JpYmVyc19vYmo6IGZ1bmN0aW9uKGspIHtcbiAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbltrXSA9IHRoaXMuX3N1YnNjcmlwdGlvbltrXSB8fCB7fVxuICAgICAgcmV0dXJuIHRoaXMuX3N1YnNjcmlwdGlvbltrXVxuICAgIH1cbiAgLCBnZXRfc3Vic2NyaWJlcnNfZm46IGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBmbnMgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19vYmooaylcbiAgICAgICAgLCBmdW5jcyA9IE9iamVjdC5rZXlzKGZucykubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGZuc1t4XSB9KVxuICAgICAgICAsIGZuID0gZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jcy5tYXAoZnVuY3Rpb24oZykgeyByZXR1cm4gZyhlcnJvcix2YWx1ZSxzdGF0ZSkgfSlcbiAgICAgICAgICB9XG5cbiAgICAgIHJldHVybiBmblxuICAgIH1cbiAgLCB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lLCBfdmFsdWUsIF9zdGF0ZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXIgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihuYW1lKSB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICwgYWxsID0gdGhpcy5nZXRfc3Vic2NyaWJlcnNfZm4oXCIqXCIpIHx8IGZ1bmN0aW9uKCkge307XG5cbiAgICAgIHRoaXMub24oXCJjaGFuZ2VcIikobmFtZSxfdmFsdWUsX3N0YXRlKVxuXG4gICAgICBzdWJzY3JpYmVyKGZhbHNlLF92YWx1ZSxfc3RhdGUpXG4gICAgICBhbGwoZmFsc2UsX3N0YXRlKVxuICAgIH1cbiAgLCB0cmlnZ2VyQmF0Y2g6IGZ1bmN0aW9uKG9iaiwgX3N0YXRlKSB7XG5cbiAgICAgIHZhciBhbGwgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihcIipcIikgfHwgZnVuY3Rpb24oKSB7fVxuICAgICAgICAsIGZucyA9IE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgICAgICB2YXIgZm4gPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbiB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICAgICByZXR1cm4gZm4uYmluZCh0aGlzKShrKShmYWxzZSxvYmpba10sX3N0YXRlKSAgXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgXG4gICAgICBhbGwoZmFsc2UsX3N0YXRlKVxuXG4gICAgfVxuICAsIF9idWlsZFN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jdXJyZW50KVxuXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLl9zdGF0aWMpLm1hcChmdW5jdGlvbihrKSB7IFxuICAgICAgICB0aGlzLl9zdGF0ZVtrXSA9IHRoaXMuX3N0YXRpY1trXVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB0aGlzLm9uKFwiYnVpbGRcIikodGhpcy5fc3RhdGUsIHRoaXMuX2N1cnJlbnQsIHRoaXMuX3N0YXRpYylcblxuICAgICAgcmV0dXJuIHRoaXMuX3N0YXRlXG4gICAgfVxuICAsIHVwZGF0ZTogZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgIHRoaXMuX3Bhc3RQdXNoKHRoaXMuX2N1cnJlbnQpXG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICB2YXIgb2JqID0ge31cbiAgICAgICAgb2JqW25hbWVdID0gdmFsdWU7XG4gICAgICB9XG4gICAgICB0aGlzLl9jdXJyZW50ID0gKG5hbWUpID8gXG4gICAgICAgIE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2N1cnJlbnQsIG9iaikgOlxuICAgICAgICBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9jdXJyZW50LCB2YWx1ZSApXG5cbiAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzZXRTdGF0aWM6IGZ1bmN0aW9uKGssdikge1xuICAgICAgaWYgKGsgIT0gdW5kZWZpbmVkICYmIHYgIT0gdW5kZWZpbmVkKSB0aGlzLl9zdGF0aWNba10gPSB2XG4gICAgICB0aGlzLl9idWlsZFN0YXRlKClcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcHVibGlzaFN0YXRpYzogZnVuY3Rpb24obmFtZSxjYikge1xuXG4gICAgICB2YXIgcHVzaF9jYiA9IGZ1bmN0aW9uKGVycm9yLHZhbHVlKSB7XG4gICAgICAgIGlmIChlcnJvcikgcmV0dXJuIHN1YnNjcmliZXIoZXJyb3IsbnVsbClcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX3N0YXRpY1tuYW1lXSA9IHZhbHVlXG4gICAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuICAgICAgICB0aGlzLnRyaWdnZXIobmFtZSwgdGhpcy5zdGF0ZSgpW25hbWVdLCB0aGlzLnN0YXRlKCkpXG5cbiAgICAgIH0uYmluZCh0aGlzKVxuXG4gICAgICBpZiAodHlwZW9mIGNiID09PSBcImZ1bmN0aW9uXCIpIGNiKHB1c2hfY2IpXG4gICAgICBlbHNlIHB1c2hfY2IoZmFsc2UsY2IpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgX3Bhc3RQdXNoOiBmdW5jdGlvbih2KSB7XG4gICAgICB0aGlzLl9wYXN0LnB1c2godilcbiAgICB9XG4gICwgX2Z1dHVyZVB1c2g6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHRoaXMuX2Z1dHVyZS5wdXNoKHYpXG4gICAgfVxuICAsIGZvcndhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fcGFzdFB1c2godGhpcy5fY3VycmVudClcbiAgICAgIHRoaXMuX2N1cnJlbnQgPSB0aGlzLl9mdXR1cmUucG9wKClcblxuICAgICAgdGhpcy5vbihcImZvcndhcmRcIikodGhpcy5fY3VycmVudCx0aGlzLl9wYXN0LCB0aGlzLl9mdXR1cmUpXG5cbiAgICAgIHRoaXMuX3N0YXRlID0gdGhpcy5fYnVpbGRTdGF0ZSgpXG4gICAgICB0aGlzLnRyaWdnZXIoZmFsc2UsIHRoaXMuX3N0YXRlLCB0aGlzLl9zdGF0ZSlcbiAgICB9XG4gICwgYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9mdXR1cmVQdXNoKHRoaXMuX2N1cnJlbnQpXG4gICAgICB0aGlzLl9jdXJyZW50ID0gdGhpcy5fcGFzdC5wb3AoKVxuXG4gICAgICB0aGlzLm9uKFwiYmFja1wiKSh0aGlzLl9jdXJyZW50LHRoaXMuX2Z1dHVyZSwgdGhpcy5fcGFzdClcblxuICAgICAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcbiAgICAgIHRoaXMudHJpZ2dlcihmYWxzZSwgdGhpcy5fc3RhdGUsIHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgdGhpcy5fbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSBcbiAgLCByZWdpc3RlckV2ZW50OiBmdW5jdGlvbihuYW1lLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2V2ZW50c1tuYW1lXSB8fCB0aGlzLl9ub29wO1xuICAgICAgdGhpcy5fZXZlbnRzW25hbWVdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBwcmVwYXJlRXZlbnQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmbiA9IHRoaXMuX2V2ZW50c1tuYW1lXSBcbiAgICAgIHJldHVybiBmbi5iaW5kKHRoaXMpXG4gICAgfVxuICAsIGRpc3BhdGNoRXZlbnQ6IGZ1bmN0aW9uKG5hbWUsZGF0YSkge1xuICAgICAgdmFyIGZuID0gdGhpcy5wcmVwYXJlRXZlbnQobmFtZSlcbiAgICAgIGZuKGRhdGEpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxufVxuXG5mdW5jdGlvbiBzdGF0ZShfY3VycmVudCwgX3N0YXRpYykge1xuICByZXR1cm4gbmV3IFN0YXRlKF9jdXJyZW50LCBfc3RhdGljKVxufVxuXG5zdGF0ZS5wcm90b3R5cGUgPSBTdGF0ZS5wcm90b3R5cGVcblxuZXhwb3J0IGRlZmF1bHQgc3RhdGU7XG4iLCJleHBvcnQgZnVuY3Rpb24gUVMoc3RhdGUpIHtcbiAgLy90aGlzLnN0YXRlID0gc3RhdGVcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRoaXMuX2VuY29kZU9iamVjdCA9IGZ1bmN0aW9uKG8pIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkobylcbiAgfVxuXG4gIHRoaXMuX2VuY29kZUFycmF5ID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvKVxuICB9XG59XG5cbi8vIExaVy1jb21wcmVzcyBhIHN0cmluZ1xuZnVuY3Rpb24gbHp3X2VuY29kZShzKSB7XG4gICAgdmFyIGRpY3QgPSB7fTtcbiAgICB2YXIgZGF0YSA9IChzICsgXCJcIikuc3BsaXQoXCJcIik7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIHZhciBjdXJyQ2hhcjtcbiAgICB2YXIgcGhyYXNlID0gZGF0YVswXTtcbiAgICB2YXIgY29kZSA9IDI1NjtcbiAgICBmb3IgKHZhciBpPTE7IGk8ZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJyQ2hhcj1kYXRhW2ldO1xuICAgICAgICBpZiAoZGljdFtwaHJhc2UgKyBjdXJyQ2hhcl0gIT0gbnVsbCkge1xuICAgICAgICAgICAgcGhyYXNlICs9IGN1cnJDaGFyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb3V0LnB1c2gocGhyYXNlLmxlbmd0aCA+IDEgPyBkaWN0W3BocmFzZV0gOiBwaHJhc2UuY2hhckNvZGVBdCgwKSk7XG4gICAgICAgICAgICBkaWN0W3BocmFzZSArIGN1cnJDaGFyXSA9IGNvZGU7XG4gICAgICAgICAgICBjb2RlKys7XG4gICAgICAgICAgICBwaHJhc2U9Y3VyckNoYXI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgb3V0LnB1c2gocGhyYXNlLmxlbmd0aCA+IDEgPyBkaWN0W3BocmFzZV0gOiBwaHJhc2UuY2hhckNvZGVBdCgwKSk7XG4gICAgZm9yICh2YXIgaT0wOyBpPG91dC5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXRbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG91dFtpXSk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbihcIlwiKTtcbn1cblxuLy8gRGVjb21wcmVzcyBhbiBMWlctZW5jb2RlZCBzdHJpbmdcbmZ1bmN0aW9uIGx6d19kZWNvZGUocykge1xuICAgIHZhciBkaWN0ID0ge307XG4gICAgdmFyIGRhdGEgPSAocyArIFwiXCIpLnNwbGl0KFwiXCIpO1xuICAgIHZhciBjdXJyQ2hhciA9IGRhdGFbMF07XG4gICAgdmFyIG9sZFBocmFzZSA9IGN1cnJDaGFyO1xuICAgIHZhciBvdXQgPSBbY3VyckNoYXJdO1xuICAgIHZhciBjb2RlID0gMjU2O1xuICAgIHZhciBwaHJhc2U7XG4gICAgZm9yICh2YXIgaT0xOyBpPGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGN1cnJDb2RlID0gZGF0YVtpXS5jaGFyQ29kZUF0KDApO1xuICAgICAgICBpZiAoY3VyckNvZGUgPCAyNTYpIHtcbiAgICAgICAgICAgIHBocmFzZSA9IGRhdGFbaV07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgIHBocmFzZSA9IGRpY3RbY3VyckNvZGVdID8gZGljdFtjdXJyQ29kZV0gOiAob2xkUGhyYXNlICsgY3VyckNoYXIpO1xuICAgICAgICB9XG4gICAgICAgIG91dC5wdXNoKHBocmFzZSk7XG4gICAgICAgIGN1cnJDaGFyID0gcGhyYXNlLmNoYXJBdCgwKTtcbiAgICAgICAgZGljdFtjb2RlXSA9IG9sZFBocmFzZSArIGN1cnJDaGFyO1xuICAgICAgICBjb2RlKys7XG4gICAgICAgIG9sZFBocmFzZSA9IHBocmFzZTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKFwiXCIpO1xufVxuXG5RUy5wcm90b3R5cGUgPSB7XG4gICAgdG86IGZ1bmN0aW9uKHN0YXRlLGVuY29kZSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIHZhciBwYXJhbXMgPSBPYmplY3Qua2V5cyhzdGF0ZSkubWFwKGZ1bmN0aW9uKGspIHtcblxuICAgICAgICB2YXIgdmFsdWUgPSBzdGF0ZVtrXVxuICAgICAgICAgICwgbyA9IHZhbHVlO1xuXG4gICAgICAgIGlmICh2YWx1ZSAmJiAodHlwZW9mKHZhbHVlKSA9PSBcIm9iamVjdFwiKSAmJiAodmFsdWUubGVuZ3RoID4gMCkpIHtcbiAgICAgICAgICBvID0gc2VsZi5fZW5jb2RlQXJyYXkodmFsdWUpXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mKHZhbHVlKSA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgbyA9IHNlbGYuX2VuY29kZU9iamVjdCh2YWx1ZSlcbiAgICAgICAgfSBcblxuICAgICAgICByZXR1cm4gayArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG8pIFxuXG4gICAgICB9KVxuXG4gICAgICBpZiAoZW5jb2RlKSByZXR1cm4gXCI/XCIgKyBcImVuY29kZWQ9XCIgKyBidG9hKGVzY2FwZShsendfZW5jb2RlKHBhcmFtcy5qb2luKFwiJlwiKSkpKTtcbiAgICAgIHJldHVybiBcIj9cIiArIHBhcmFtcy5qb2luKFwiJlwiKVxuICAgICAgXG4gICAgfVxuICAsIGZyb206IGZ1bmN0aW9uKHFzKSB7XG4gICAgICB2YXIgcXVlcnkgPSB7fTtcbiAgICAgIGlmIChxcy5pbmRleE9mKFwiP2VuY29kZWQ9XCIpID09IDApIHFzID0gbHp3X2RlY29kZSh1bmVzY2FwZShhdG9iKHFzLnNwbGl0KFwiP2VuY29kZWQ9XCIpWzFdKSkpXG4gICAgICB2YXIgYSA9IHFzLnN1YnN0cigxKS5zcGxpdCgnJicpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGIgPSBhW2ldLnNwbGl0KCc9Jyk7XG4gICAgICAgICAgXG4gICAgICAgICAgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSA9IChkZWNvZGVVUklDb21wb25lbnQoYlsxXSB8fCAnJykpO1xuICAgICAgICAgIHZhciBfY2hhciA9IHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChiWzBdKV1bMF0gXG4gICAgICAgICAgaWYgKChfY2hhciA9PSBcIntcIikgfHwgKF9jaGFyID09IFwiW1wiKSkgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSA9IEpTT04ucGFyc2UocXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBxdWVyeTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHFzKHN0YXRlKSB7XG4gIHJldHVybiBuZXcgUVMoc3RhdGUpXG59XG5cbnFzLnByb3RvdHlwZSA9IFFTLnByb3RvdHlwZVxuXG5leHBvcnQgZGVmYXVsdCBxcztcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBhcmlzb25fZXZhbChvYmoxLG9iajIsX2ZpbmFsKSB7XG4gIHJldHVybiBuZXcgQ29tcGFyaXNvbkV2YWwob2JqMSxvYmoyLF9maW5hbClcbn1cblxudmFyIG5vb3AgPSAoeCkgPT4ge31cbiAgLCBlcW9wID0gKHgseSkgPT4geCA9PSB5XG4gICwgYWNjID0gKG5hbWUsc2Vjb25kKSA9PiB7XG4gICAgICByZXR1cm4gKHgseSkgPT4gc2Vjb25kID8geVtuYW1lXSA6IHhbbmFtZV0gXG4gICAgfVxuXG5jbGFzcyBDb21wYXJpc29uRXZhbCB7XG4gIGNvbnN0cnVjdG9yKG9iajEsb2JqMixfZmluYWwpIHtcbiAgICB0aGlzLl9vYmoxID0gb2JqMVxuICAgIHRoaXMuX29iajIgPSBvYmoyXG4gICAgdGhpcy5fZmluYWwgPSBfZmluYWxcbiAgICB0aGlzLl9jb21wYXJpc29ucyA9IHt9XG4gIH1cblxuICBhY2Nlc3NvcihuYW1lLGFjYzEsYWNjMikge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jb21wYXJpc29uc1tuYW1lXSx7XG4gICAgICAgIGFjYzE6IGFjYzFcbiAgICAgICwgYWNjMjogYWNjMlxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN1Y2Nlc3MobmFtZSxmbikge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jb21wYXJpc29uc1tuYW1lXSx7XG4gICAgICAgIHN1Y2Nlc3M6IGZuXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZmFpbHVyZShuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgZmFpbHVyZTogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBlcXVhbChuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgZXE6IGZuXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZXZhbHVhdGUoKSB7XG4gICAgT2JqZWN0LmtleXModGhpcy5fY29tcGFyaXNvbnMpLm1hcCggayA9PiB7XG4gICAgICB0aGlzLl9ldmFsKHRoaXMuX2NvbXBhcmlzb25zW2tdLGspXG4gICAgfSlcbiAgICByZXR1cm4gdGhpcy5fZmluYWxcbiAgfVxuICBcblxuICBjb21wYXJzaW9uKG5hbWUsYWNjMSxhY2MyLGVxLHN1Y2Nlc3MsZmFpbHVyZSkge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0ge1xuICAgICAgICBhY2MxOiBhY2MxXG4gICAgICAsIGFjYzI6IGFjYzJcbiAgICAgICwgZXE6IGVxIHx8IGVxb3BcbiAgICAgICwgc3VjY2Vzczogc3VjY2VzcyB8fCBub29wXG4gICAgICAsIGZhaWx1cmU6IGZhaWx1cmUgfHwgbm9vcFxuICAgIH1cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgX2V2YWwoY29tcGFyaXNvbixuYW1lKSB7XG4gICAgdmFyIGFjYzEgPSBjb21wYXJpc29uLmFjYzEgfHwgYWNjKG5hbWUpXG4gICAgICAsIGFjYzIgPSBjb21wYXJpc29uLmFjYzIgfHwgYWNjKG5hbWUsdHJ1ZSlcbiAgICAgICwgdmFsMSA9IGFjYzEodGhpcy5fb2JqMSx0aGlzLl9vYmoyKVxuICAgICAgLCB2YWwyID0gYWNjMih0aGlzLl9vYmoxLHRoaXMuX29iajIpXG4gICAgICAsIGVxID0gY29tcGFyaXNvbi5lcSB8fCBlcW9wXG4gICAgICAsIHN1Y2MgPSBjb21wYXJpc29uLnN1Y2Nlc3MgfHwgbm9vcFxuICAgICAgLCBmYWlsID0gY29tcGFyaXNvbi5mYWlsdXJlIHx8IG5vb3BcblxuICAgIHZhciBfZXZhbGQgPSBlcSh2YWwxLCB2YWwyKVxuXG4gICAgX2V2YWxkID8gXG4gICAgICBzdWNjLmJpbmQodGhpcykodmFsMSx2YWwyLHRoaXMuX2ZpbmFsKSA6IFxuICAgICAgZmFpbC5iaW5kKHRoaXMpKHZhbDEsdmFsMix0aGlzLl9maW5hbClcbiAgfVxuXG4gIFxufVxuIiwiZXhwb3J0IHtkZWZhdWx0IGFzIHN0YXRlfSBmcm9tIFwiLi9zcmMvc3RhdGVcIjtcbmV4cG9ydCB7ZGVmYXVsdCBhcyBxc30gZnJvbSBcIi4vc3JjL3FzXCI7XG5leHBvcnQge2RlZmF1bHQgYXMgY29tcF9ldmFsfSBmcm9tIFwiLi9zcmMvY29tcF9ldmFsXCI7XG5cbmltcG9ydCBzdGF0ZSBmcm9tIFwiLi9zcmMvc3RhdGVcIjtcblxuZGVidWdnZXJcbmV4cG9ydCBjb25zdCBzID0gd2luZG93Ll9fc3RhdGVfXyB8fCBzdGF0ZSgpXG53aW5kb3cuX19zdGF0ZV9fID0gc1xuXG5leHBvcnQgZGVmYXVsdCBzO1xuIiwiLy9pbXBvcnQgZDMgZnJvbSAnZDMnXG5cbi8qIEZST00gT1RIRVIgRklMRSAqL1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERvbWFpbnMoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5kb21haW4gfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImtleVwiOnguZG9tYWluXG4gICAgICAgICwgXCJ2YWx1ZVwiOnguY291bnRcbiAgICAgICAgLCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC51bmlxdWVzIFxuICAgICAgICAsIFwidXJsXCI6IHgudXJsXG4gICAgICB9IFxuICAgIH0pXG5cblxuXG4gIHZhbHVlcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7IFxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeFswXS5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAgLCBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LnZhbHVlID0gTWF0aC5sb2coeC50Zl9pZGYpXG4gIH0pXG4gIHZhbHVlcyA9IHZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy50Zl9pZGYgLSBwLnRmX2lkZiB9KVxuXG5cbiAgdmFyIHRvdGFsID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50KngucGVyY2VudF91bmlxdWV9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICB4LnBvcF9wZXJjZW50ID0gMS4wMi9nZXRJREYoeC5rZXkpKjEwMFxuICAgIHgucG9wX3BlcmNlbnQgPSB4LnBvcF9wZXJjZW50ID09IEluZmluaXR5ID8gMCA6IHgucG9wX3BlcmNlbnRcblxuICAgIHgucGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnBlcmNlbnR9KV0pXG4gICAgLm5pY2UoKVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgucGVyY2VudF9ub3JtID0gbm9ybSh4LnBlcmNlbnQpXG4gICAgLy94LnBlcmNlbnRfbm9ybSA9IHgucGVyY2VudFxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHZhbHVlcztcbiAgLy97XG4gIC8vICAgIGtleTogXCJUb3AgRG9tYWluc1wiXG4gIC8vICAsIHZhbHVlczogdmFsdWVzLnNsaWNlKDAsMTAwKVxuICAvL31cbn1cblxuXG4vKiBFTkQgRlJPTSBPVEhFUiBGSUxFICovXG5cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkM191cGRhdGVhYmxlKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGQzX3NwbGF0KHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYWNjZXNzb3IoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWxcbiAgcmV0dXJuIHRoaXNcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIE1lZGlhUGxhbih0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gIHRoaXMuX29uID0ge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbWVkaWFfcGxhbih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBNZWRpYVBsYW4odGFyZ2V0KVxufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1EYXRhKGRhdGEpIHtcblxuICB2YXIgY2ggPSBkYXRhLmNhdGVnb3J5X2hvdXIuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJOQVwiIH0pXG5cbiAgdmFyIGNhdGVnb3J5X2hvdXIgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgKyBcIixcIiArIHguaG91ciB9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICBwLnVuaXF1ZXMgPSAocC51bmlxdWVzIHx8IDApICsgYy51bmlxdWVzXG4gICAgICAgIHAuY291bnQgPSAocC5jb3VudCB8fCAwKSArIGMuY291bnRcbiAgICAgXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuICAgIH0pXG4gICAgLmVudHJpZXMoY2gpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwiY2F0ZWdvcnlcIjogeC5rZXkuc3BsaXQoXCIsXCIpWzBdXG4gICAgICAgICwgXCJob3VyXCI6IHgua2V5LnNwbGl0KFwiLFwiKVsxXVxuICAgICAgICAsIFwiY291bnRcIjogeC52YWx1ZXMuY291bnRcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC52YWx1ZXMudW5pcXVlc1xuICAgICAgfVxuICAgIH0pXG5cbiAgdmFyIHNjYWxlZCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jYXRlZ29yeSB9IClcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHZhciBtaW4gPSBkMy5taW4odixmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50IH0pXG4gICAgICAgICwgbWF4ID0gZDMubWF4KHYsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jb3VudCB9KVxuXG4gICAgICAgdmFyIHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgIC5kb21haW4oW21pbixtYXhdKVxuICAgICAgICAgLnJhbmdlKFswLDEwMF0pXG4gICAgICAgXG4gICAgICAgdmFyIGhvdXJzID0gZDMucmFuZ2UoMCwyNClcbiAgICAgICBob3VycyA9IGhvdXJzLnNsaWNlKC00LDI0KS5jb25jYXQoaG91cnMuc2xpY2UoMCwyMCkpLy8uc2xpY2UoMykuY29uY2F0KGhvdXJzLnNsaWNlKDAsMykpXG5cbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcIm5vcm1lZFwiOiBob3Vycy5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gdltpXSA/IHNjYWxlKHZbaV0uY291bnQpIDogMCB9KVxuICAgICAgICAgLCBcImNvdW50XCI6IGhvdXJzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiB2W2ldID8gdltpXS5jb3VudCA6IDAgfSlcbiAgICAgICB9XG4gICAgICAgLy9yZXR1cm4gaG91cmx5XG4gICAgfSlcbiAgICAuZW50cmllcyhjYXRlZ29yeV9ob3VyKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyB4LnRvdGFsID0gZDMuc3VtKHgudmFsdWVzKTsgcmV0dXJuIHh9KVxuICAgIC8vLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRvdGFsIC0gcC50b3RhbH0pXG5cbiAgcmV0dXJuIHNjYWxlZFxufVxuXG5NZWRpYVBsYW4ucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgLy9kZWJ1Z2dlclxuICAgICAgaWYgKHRoaXMuZGF0YSgpLmNhdGVnb3J5X2hvdXIgPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1xuXG4gICAgICAgICAgdmFyIF9kID0gdGhpcy5kYXRhKClcbiAgICAgICAgICBfZC5kaXNwbGF5X2NhdGVnb3JpZXMgPSBfZC5kaXNwbGF5X2NhdGVnb3JpZXMgfHwge1widmFsdWVzXCI6W119XG4gICAgICAgICAgdmFyIGRkID0gYnVpbGREb21haW5zKF9kKVxuXG4gICAgICB2YXIgc2NhbGVkID0gdHJhbnNmb3JtRGF0YSh0aGlzLmRhdGEoKSlcblxuICAgICAgXG4gICAgICBzY2FsZWQubWFwKGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICB4LmNvdW50ID0geC52YWx1ZXMuY291bnRcbiAgICAgICAgeC52YWx1ZXM9IHgudmFsdWVzLm5vcm1lZFxuXG4gICAgICB9KVxuXG5cbiAgICAgIHRoaXMucmVuZGVyX2xlZnQoc2NhbGVkKVxuICAgICAgdGhpcy5yZW5kZXJfcmlnaHQoZGQsc2NhbGVkKVxuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHJlbmRlcl9yaWdodDogZnVuY3Rpb24oZCxyb3dfZGF0YSkge1xuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLnJoc1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicmhzIGNvbC1tZC00XCIsdHJ1ZSlcblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsIFwiaDNcIixcImgzXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIkFib3V0IHRoZSBwbGFuXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLmRlc2NcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImRlc2NcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiSGluZHNpZ2h0IGhhcyBhdXRvbWF0aWNhbGx5IGRldGVybWluZWQgdGhlIGJlc3Qgc2l0ZXMgYW5kIHRpbWVzIHdoZXJlIHlvdSBzaG91bGQgYmUgdGFyZ2V0aW5nIHVzZXJzLiBUaGUgbWVkaWEgcGxhbiBwcmVzZW50ZWQgYmVsb3cgZGVzY3JpYmVzIHRoZSBvcHRpbWl6YXRpb25zIHRoYXQgY2FuIGJlIG1hZGUgdG8gYW55IHByb3NwZWN0aW5nIG9yIHJldGFyZ2V0aW5nIGNhbXBhaWduIHRvIGxvd2VyIENQQSBhbmQgc2F2ZSBtb25leS5cIilcblxuICAgICAgdmFyIHBsYW5fdGFyZ2V0ID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLnBsYW4tdGFyZ2V0XCIsXCJkaXZcIixyb3dfZGF0YSxmdW5jdGlvbigpe3JldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJwbGFuLXRhcmdldFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjEwMHB4XCIpXG5cbiAgICAgIHBsYW5fdGFyZ2V0LmV4aXQoKS5yZW1vdmUoKVxuXG5cbiAgICAgIGlmIChyb3dfZGF0YS5sZW5ndGggPiAxKSB7XG4gICAgICAgIHZhciByZW1haW5kZXJzID0gcm93X2RhdGEubWFwKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgXG4gICAgICAgICAgdmFyIHRvX3RhcmdldCA9IGQzLnN1bShyLm1hc2subWFwKGZ1bmN0aW9uKHgsaSl7IHJldHVybiB4ID8gci5jb3VudFtpXSA6IDB9KSlcbiAgICAgICAgICB2YXIgdG90YWwgPSBkMy5zdW0oci5jb3VudClcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0b3RhbDogdG90YWxcbiAgICAgICAgICAgICwgdG9fdGFyZ2V0OiB0b190YXJnZXRcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdmFyIGN1dCA9IGQzLnN1bShyZW1haW5kZXJzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC50b190YXJnZXQqMS4wIH0pXG4gICAgICAgIHZhciB0b3RhbCA9IGQzLnN1bShyZW1haW5kZXJzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC50b3RhbCB9KSBcbiAgICAgICAgdmFyIHBlcmNlbnQgPSBjdXQvdG90YWxcblxuICAgICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsIFwiaDMuc3VtbWFyeVwiLFwiaDNcIixmdW5jdGlvbih4KSB7IHJldHVybiBbeF19ICwgZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgICAgLmNsYXNzZWQoXCJzdW1tYXJ5XCIsdHJ1ZSlcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAgIC50ZXh0KFwiUGxhbiBTdW1tYXJ5XCIpXG5cblxuXG4gICAgICAgIGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIud2hhdFwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gW3hdfSAsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAgIC5jbGFzc2VkKFwid2hhdFwiLHRydWUpXG4gICAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0nZm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoyMDBweDtwYWRkaW5nLWxlZnQ6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPlBvdGVudGlhbCBBZHMgU2VydmVkOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiLFwiKSh0b3RhbClcbiAgICAgICAgICB9KVxuXG4gICAgICAgIGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIuYW1vdW50XCIsXCJkaXZcIixmdW5jdGlvbih4KSB7IHJldHVybiBbeF19ICwgZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgICAgLmNsYXNzZWQoXCJhbW91bnRcIix0cnVlKVxuICAgICAgICAgIC5odG1sKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIjxkaXYgc3R5bGU9J2ZvbnQtd2VpZ2h0OmJvbGQ7d2lkdGg6MjAwcHg7cGFkZGluZy1sZWZ0OjEwcHg7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2Rpc3BsYXk6aW5saW5lLWJsb2NrJz5PcHRpbWl6ZWQgQWQgU2VydmluZzo8L2Rpdj5cIiArIGQzLmZvcm1hdChcIixcIikoY3V0KSArIFwiIChcIiArIGQzLmZvcm1hdChcIiVcIikocGVyY2VudCkgKyBcIilcIlxuICAgICAgICAgIH0pXG5cbiAgICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi5jcGFcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFt4XX0gLCBmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgICAuY2xhc3NlZChcImNwYVwiLHRydWUpXG4gICAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0nZm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoyMDBweDtwYWRkaW5nLWxlZnQ6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPkVzdGltYXRlZCBDUEEgcmVkdWN0aW9uOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiJVwiKSgxLXBlcmNlbnQpXG4gICAgICAgICAgfSlcblxuXG5cblxuXG4gICAgICAgXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB2YXIgcGxhbl90YXJnZXQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIucGxhbi1kZXRhaWxzXCIsXCJkaXZcIixyb3dfZGF0YSlcbiAgICAgICAgLmNsYXNzZWQoXCJwbGFuLWRldGFpbHNcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCIxNjBweFwiKVxuXG5cblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LCBcImgzLmRldGFpbHNcIixcImgzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZGV0YWlsc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIlBsYW4gRGV0YWlsc1wiKVxuXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LFwiLndoYXRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIndoYXRcIix0cnVlKVxuICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0ncGFkZGluZy1sZWZ0OjEwcHg7Zm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoxNDBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPkNhdGVnb3J5OjwvZGl2PlwiICsgeC5rZXlcbiAgICAgICAgfSlcblxuICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi5zYXZpbmdcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNhdmluZ1wiLHRydWUpXG4gICAgICAgIC5odG1sKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkLmNvdW50KVxuICAgICAgICAgIHZhciBwZXJjZW50ID0gZDMuc3VtKHguY291bnQsZnVuY3Rpb24oeixpKSB7IHJldHVybiB4Lm1hc2tbaV0gPyAwIDogen0pL2QzLnN1bSh4LmNvdW50LGZ1bmN0aW9uKHosaSkgeyByZXR1cm4geiB9KVxuICAgICAgICAgIHJldHVybiBcIjxkaXYgc3R5bGU9J3BhZGRpbmctbGVmdDoxMHB4O2ZvbnQtd2VpZ2h0OmJvbGQ7d2lkdGg6MTQwcHg7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2Rpc3BsYXk6aW5saW5lLWJsb2NrJz5TdHJhdGVneSBzYXZpbmdzOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiJVwiKShwZXJjZW50KVxuICAgICAgICB9KVxuXG4gICAgICB2YXIgd2hlbiA9IGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIud2hlblwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKXsgcmV0dXJuIDEgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ3aGVuXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI4MHB4XCIpXG4gICAgICAgIC5odG1sKFwiPGRpdiBzdHlsZT0ncGFkZGluZy1sZWZ0OjEwcHg7d2lkdGg6MTQwcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7dmVydGljYWwtYWxpZ246dG9wJz5XaGVuIHRvIHNlcnZlOjwvZGl2PlwiKVxuICAgICAgICAuZGF0dW0oZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBib29sID0gZmFsc2VcbiAgICAgICAgICB2YXIgcG9zID0gLTFcbiAgICAgICAgICB2YXIgc3RhcnRfZW5kcyA9IHgubWFzay5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IFxuICAgICAgICAgICAgICBwb3MgKz0gMVxuICAgICAgICAgICAgICBpZiAoYm9vbCAhPSBjKSB7XG4gICAgICAgICAgICAgICAgYm9vbCA9IGNcbiAgICAgICAgICAgICAgICBwLnB1c2gocG9zKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgICB9LFtdKVxuICAgICAgICAgIHZhciBzID0gXCJcIlxuICAgICAgICAgIHN0YXJ0X2VuZHMubWFwKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgICAgaWYgKChpICE9IDApICYmICgoaSUyKSA9PSAwKSkgcyArPSBcIiwgXCJcbiAgICAgICAgICAgIGlmIChpJTIpIHMgKz0gXCIgLSBcIlxuXG4gICAgICAgICAgICBpZiAoeCA9PSAwKSBzICs9IFwiMTJhbVwiXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIG51bSA9ICh4KzEpJTEyXG4gICAgICAgICAgICAgIG51bSA9IG51bSA9PSAwID8gMTIgOiBudW1cbiAgICAgICAgICAgICAgcyArPSBudW0gKyAoKHggPiAxMSkgPyBcInBtXCIgOiBcImFtXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgIFxuICAgICAgICAgIH0pXG4gICAgICAgICAgaWYgKChzdGFydF9lbmRzLmxlbmd0aCkgJSAyKSBzICs9IFwiIC0gMTJhbVwiXG5cbiAgICAgICAgICByZXR1cm4gcy5zcGxpdChcIiwgXCIpXG4gICAgICAgIH0pXG5cbiAgICAgICB2YXIgaXRlbXMgPSBkM191cGRhdGVhYmxlKHdoZW4sXCIuaXRlbXNcIixcImRpdlwiKVxuICAgICAgICAgLmNsYXNzZWQoXCJpdGVtc1wiLHRydWUpXG4gICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQwcHhcIilcbiAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICAgZDNfc3BsYXQoaXRlbXMsXCIuaXRlbVwiLFwiZGl2XCIpXG4gICAgICAgICAuY2xhc3NlZChcIml0ZW1cIix0cnVlKVxuICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0MHB4XCIpXG4gICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJub25lXCIpXG4gICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwibm9ybWFsXCIpXG4gICAgICAgICAudGV4dChTdHJpbmcpXG5cblxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCJoMy5leGFtcGxlLXNpdGVzXCIsXCJoM1wiKVxuICAgICAgICAuY2xhc3NlZChcImV4YW1wbGUtc2l0ZXNcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjIwcHhcIilcbiAgICAgICAgLnRleHQoXCJFeGFtcGxlIFNpdGVzXCIpXG5cblxuICAgICAgIHZhciByb3dzID0gZDNfc3BsYXQod3JhcHBlcixcIi5yb3dcIixcImRpdlwiLGQuc2xpY2UoMCwxNSksZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxOHB4XCIpXG4gICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjIwcHhcIilcblxuICAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICByZXR1cm4geC5rZXlcbiAgICAgICAgIH0pXG5cbiAgICAgICByb3dzLmV4aXQoKS5yZW1vdmUoKVxuXG5cbiAgICB9XG4gICwgcmVuZGVyX2xlZnQ6IGZ1bmN0aW9uKHNjYWxlZCkge1xuXG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIubGhzXCIsXCJkaXZcIixzY2FsZWQpXG4gICAgICAgIC5jbGFzc2VkKFwibGhzIGNvbC1tZC04XCIsdHJ1ZSlcblxuICAgICAgd3JhcHBlci5leGl0KCkucmVtb3ZlKClcblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsIFwiaDNcIixcImgzXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIk1lZGlhIFBsYW4gKENhdGVnb3J5IGFuZCBUaW1lIE9wdGltaXphdGlvbilcIilcblxuICAgICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLmhlYWRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImhlYWRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIxcHhcIilcblxuICAgICAgdmFyIG5hbWUgPSBkM191cGRhdGVhYmxlKGhlYWQsXCIubmFtZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNzBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICAgZDNfc3BsYXQoaGVhZCxcIi5ob3VyXCIsXCJkaXZcIixkMy5yYW5nZSgxLDI1KSxmdW5jdGlvbih4KSB7IHJldHVybiB4IH0pXG4gICAgICAgIC5jbGFzc2VkKFwic3EgaG91clwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuODVlbVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGlmICh4ID09IDEpIHJldHVybiBcIjxiPjFhPC9iPlwiXG4gICAgICAgICAgaWYgKHggPT0gMjQpIHJldHVybiBcIjxiPjEyYTwvYj5cIlxuICAgICAgICAgIGlmICh4ID09IDEyKSByZXR1cm4gXCI8Yj4xMnA8L2I+XCJcbiAgICAgICAgICByZXR1cm4geCA+IDExID8geCUxMiA6IHhcbiAgICAgICAgfSlcblxuXG4gICAgICB2YXIgcm93ID0gZDNfc3BsYXQod3JhcHBlcixcIi5yb3dcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMXB4XCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgKyBcIiByb3dcIiB9KVxuICAgICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICB2YXIgX2QgPSBzZWxmLmRhdGEoKVxuICAgICAgICAgIF9kLmRpc3BsYXlfY2F0ZWdvcmllcyA9IF9kLmRpc3BsYXlfY2F0ZWdvcmllcyB8fCB7XCJ2YWx1ZXNcIjpbXX1cbiAgICAgICAgICB2YXIgZGQgPSBidWlsZERvbWFpbnMoX2QpXG5cbiAgICAgICAgICB2YXIgZCA9IGRkLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6LnBhcmVudF9jYXRlZ29yeV9uYW1lID09IHgua2V5fSlcbiAgICAgICAgICBcblxuICAgICAgICAgIHNlbGYucmVuZGVyX3JpZ2h0KGQseClcbiAgICAgICAgfSlcblxuICAgICAgdmFyIE1BR0lDID0gMjUgXG5cbiAgICAgIHZhciBuYW1lID0gZDNfdXBkYXRlYWJsZShyb3csXCIubmFtZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNzBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICB2YXIgY29sb3JzID0gW1wiI2ExZDk5YlwiLCBcIiM3NGM0NzZcIiwgXCIjNDFhYjVkXCIsIFwiIzIzOGI0NVwiLCBcIiMwMDZkMmNcIiwgXCIjMDA0NDFiXCJdXG4gICAgICB2YXIgY29sb3JzID0gW1wiIzIzOGI0NVwiXVxuXG4gICAgICB2YXIgbyA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgICAuZG9tYWluKFstMjUsMTAwXSlcbiAgICAgICAgLnJhbmdlKGNvbG9ycyk7XG5cbiAgICAgIHZhciBzcXVhcmUgPSBkM19zcGxhdChyb3csXCIuc3FcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWVzIH0sIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSB9KSBcbiAgICAgICAgLmNsYXNzZWQoXCJzcVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLGZ1bmN0aW9uKHgsaSkgeyBcbiAgICAgICAgICB2YXIgcGQgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX187IFxuICAgICAgICAgIHBkLm1hc2sgPSBwZC5tYXNrIHx8IFtdXG4gICAgICAgICAgcGQubWFza1tpXSA9ICgoeCA+IE1BR0lDKSAmJiAoIChwZC52YWx1ZXNbaS0xXSA+IE1BR0lDIHx8IGZhbHNlKSB8fCAocGQudmFsdWVzW2krMV0gPiBNQUdJQ3x8IGZhbHNlKSApKVxuICAgICAgICAgIC8vcmV0dXJuIHBkLm1hc2tbaV0gPyBvKHBkLnZhbHVlc1tpXSkgIDogXCJyZXBlYXRpbmctbGluZWFyLWdyYWRpZW50KCA0NWRlZywgI2ZlZTBkMiwgI2ZlZTBkMiAycHgsICNmY2JiYTEgNXB4LCAjZmNiYmExIDJweCkgXCJcbiAgICAgICAgICByZXR1cm4gcGQubWFza1tpXSA/IFxuICAgICAgICAgICAgXCJyZXBlYXRpbmctbGluZWFyLWdyYWRpZW50KCAxMzVkZWcsICMyMzhiNDUsICMyMzhiNDUgMnB4LCAjMDA2ZDJjIDVweCwgIzAwNmQyYyAycHgpIFwiIDogXG4gICAgICAgICAgICBcInJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoIDQ1ZGVnLCAjZmVlMGQyLCAjZmVlMGQyIDJweCwgI2ZjYmJhMSA1cHgsICNmY2JiYTEgMnB4KSBcIlxuXG4gICAgICAgIH0pXG5cblxuICAgIH1cbiAgLCBkYXRhOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fdGFyZ2V0LmRhdHVtKClcbiAgICAgIHRoaXMuX3RhcmdldC5kYXR1bShkKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbixmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbiIsIi8vaW1wb3J0IGQzIGZyb20gJ2QzJ1xuXG5mdW5jdGlvbiBkM191cGRhdGVhYmxlKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiO1xuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZnVuY3Rpb24oeCl7cmV0dXJuIGRhdGEgPyBbZGF0YV0gOiBbeF19LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4gW3hdfVxuICApO1xuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSk7XG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZnVuY3Rpb24gZDNfc3BsYXQodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCI7XG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gICk7XG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKTtcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5cbnZhciB0eXBld2F0Y2ggPSAoZnVuY3Rpb24oKXtcbiAgdmFyIHRpbWVyID0gMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNhbGxiYWNrLCBtcyl7XG4gICAgY2xlYXJUaW1lb3V0ICh0aW1lcik7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGNhbGxiYWNrLCBtcyk7XG4gIH07XG59KSgpO1xuXG5cblxuZnVuY3Rpb24gRmlsdGVyKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMuX2RhdGEgPSBmYWxzZTtcbiAgdGhpcy5fb24gPSB7fTtcbiAgdGhpcy5fcmVuZGVyX29wID0ge307XG59XG5cbmZ1bmN0aW9uIGZpbHRlciQyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEZpbHRlcih0YXJnZXQpXG59XG5cbkZpbHRlci5wcm90b3R5cGUgPSB7XG4gICAgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIuZmlsdGVycy13cmFwcGVyXCIsXCJkaXZcIix0aGlzLmRhdGEoKSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlcnMtd3JhcHBlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLCBcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1yaWdodFwiLCBcIjIwcHhcIik7XG5cbiAgICAgIHZhciBmaWx0ZXJzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmZpbHRlcnNcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlcnNcIix0cnVlKTtcbiAgICAgIFxuICAgICAgdmFyIGZpbHRlciA9IGQzX3NwbGF0KGZpbHRlcnMsXCIuZmlsdGVyXCIsXCJkaXZcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpICsgeC5maWVsZCB9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpO1xuXG4gICAgICBmaWx0ZXIuZXhpdCgpLnJlbW92ZSgpO1xuICAgICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBmaWx0ZXIuZWFjaChmdW5jdGlvbih2LHBvcykge1xuICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgIHNlbGYuZmlsdGVyUm93KGR0aGlzLCBzZWxmLl9maWVsZHMsIHNlbGYuX29wcywgdik7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgdGhpcy5maWx0ZXJGb290ZXIod3JhcCk7XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgICBcbiAgICB9XG4gICwgb3BzOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb3BzXG4gICAgICB0aGlzLl9vcHMgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZmllbGRzOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZmllbGRzXG4gICAgICB0aGlzLl9maWVsZHMgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgXHR9XG4gICwgZGF0YTogZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2RhdGFcbiAgICAgIHRoaXMuX2RhdGEgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgXHR9XG4gICwgdGV4dDogZnVuY3Rpb24oZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZm4gfHwgZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSB9XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcmVuZGVyX29wOiBmdW5jdGlvbihvcCxmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9yZW5kZXJfb3Bbb3BdIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9yZW5kZXJfb3Bbb3BdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgYnVpbGRPcDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICB2YXIgb3AgPSBvYmoub3BcbiAgICAgICAgLCBmaWVsZCA9IG9iai5maWVsZFxuICAgICAgICAsIHZhbHVlID0gb2JqLnZhbHVlO1xuICAgIFxuICAgICAgaWYgKCBbb3AsZmllbGQsdmFsdWVdLmluZGV4T2YodW5kZWZpbmVkKSA+IC0xKSByZXR1cm4gZnVuY3Rpb24oKSB7cmV0dXJuIHRydWV9XG4gICAgXG4gICAgICByZXR1cm4gdGhpcy5fb3BzW29wXShmaWVsZCwgdmFsdWUpXG4gICAgfVxuICAsIGZpbHRlclJvdzogZnVuY3Rpb24oX2ZpbHRlciwgZmllbGRzLCBvcHMsIHZhbHVlKSB7XG4gICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciByZW1vdmUgPSBkM191cGRhdGVhYmxlKF9maWx0ZXIsXCIucmVtb3ZlXCIsXCJhXCIpXG4gICAgICAgIC5jbGFzc2VkKFwicmVtb3ZlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5odG1sKFwiJiMxMDAwNTtcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIG5ld19kYXRhID0gc2VsZi5kYXRhKCkuZmlsdGVyKGZ1bmN0aW9uKGYpIHsgcmV0dXJuIGYgIT09IHggfSk7XG4gICAgICAgICAgc2VsZi5kYXRhKG5ld19kYXRhKTtcbiAgICAgICAgICBzZWxmLmRyYXcoKTtcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcblxuICAgICAgICB9KTtcblxuICAgICAgdmFyIGZpbHRlciA9IGQzX3VwZGF0ZWFibGUoX2ZpbHRlcixcIi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXJcIix0cnVlKTtcblxuICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic2VsZWN0LmZpZWxkXCIsXCJzZWxlY3RcIixmaWVsZHMpXG4gICAgICAgIC5jbGFzc2VkKFwiZmllbGRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTY1cHhcIilcbiAgICAgICAgLm9uKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgIHZhbHVlLmZpZWxkID0gdGhpcy5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX187XG4gICAgICAgICAgXG4gICAgICAgICAgdmFyIHBvcyA9IDA7XG4gICAgICAgICAgZmllbGRzLm1hcChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgIGlmICh4ID09IHZhbHVlLmZpZWxkKSBwb3MgPSBpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdmFyIHNlbGVjdGVkID0gb3BzW3Bvc10uZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5ID09IHZhbHVlLm9wIH0pO1xuICAgICAgICAgIGlmIChzZWxlY3RlZC5sZW5ndGggPT0gMCkgdmFsdWUub3AgPSBvcHNbcG9zXVswXS5rZXk7XG4gICAgICAgICAgLy92YWx1ZS5mbiA9IHNlbGYuYnVpbGRPcCh2YWx1ZSlcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcblxuICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAgIHNlbGYuZHJhd09wcyhmaWx0ZXIsIG9wc1twb3NdLCB2YWx1ZSwgcG9zKTtcbiAgICAgICAgfSk7XG4gICAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIilcbiAgICAgICAgLnByb3BlcnR5KFwiZGlzYWJsZWRcIiAsdHJ1ZSlcbiAgICAgICAgLnByb3BlcnR5KFwiaGlkZGVuXCIsIHRydWUpXG4gICAgICAgIC50ZXh0KFwiRmlsdGVyLi4uXCIpO1xuXG4gICAgICBcbiAgICAgIGQzX3NwbGF0KHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSlcbiAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4ID09IHZhbHVlLmZpZWxkID8gXCJzZWxlY3RlZFwiIDogdW5kZWZpbmVkIH0pO1xuXG4gICAgICBpZiAodmFsdWUub3AgJiYgdmFsdWUuZmllbGQgJiYgdmFsdWUudmFsdWUpIHtcbiAgICAgICAgdmFyIHBvcyA9IGZpZWxkcy5pbmRleE9mKHZhbHVlLmZpZWxkKTtcbiAgICAgICAgc2VsZi5kcmF3T3BzKGZpbHRlciwgb3BzW3Bvc10sIHZhbHVlLCBwb3MpO1xuICAgICAgfVxuXG5cbiAgICB9XG4gICwgZHJhd09wczogZnVuY3Rpb24oZmlsdGVyLCBvcHMsIHZhbHVlKSB7XG5cbiAgICAgIFxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcInNlbGVjdC5vcFwiLFwic2VsZWN0XCIsZmFsc2UsIGZ1bmN0aW9uKHgpIHtyZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwib3BcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5vbihcImNoYW5nZVwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICB2YWx1ZS5vcCA9IHRoaXMuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleTtcbiAgICAgICAgICAvL3ZhbHVlLmZuID0gc2VsZi5idWlsZE9wKHZhbHVlKVxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpO1xuICAgICAgICAgIHNlbGYuZHJhd0lucHV0KGZpbHRlciwgdmFsdWUsIHZhbHVlLm9wKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIC8vdmFyIGRmbHQgPSBbe1wia2V5XCI6XCJTZWxlY3QgT3BlcmF0aW9uLi4uXCIsXCJkaXNhYmxlZFwiOnRydWUsXCJoaWRkZW5cIjp0cnVlfV1cblxuICAgICAgdmFyIG5ld19vcHMgPSBvcHM7IC8vZGZsdC5jb25jYXQob3BzKVxuXG4gICAgICB2YWx1ZS5vcCA9IHZhbHVlLm9wIHx8IG5ld19vcHNbMF0ua2V5O1xuXG4gICAgICB2YXIgb3BzID0gZDNfc3BsYXQoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIixuZXdfb3BzLGZ1bmN0aW9uKHgpe3JldHVybiB4LmtleX0pXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5LnNwbGl0KFwiLlwiKVswXSB9KSBcbiAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSA9PSB2YWx1ZS5vcCA/IFwic2VsZWN0ZWRcIiA6IHVuZGVmaW5lZCB9KTtcblxuICAgICAgb3BzLmV4aXQoKS5yZW1vdmUoKTtcbiAgICAgIHNlbGYuZHJhd0lucHV0KGZpbHRlciwgdmFsdWUsIHZhbHVlLm9wKTtcblxuICAgIH1cbiAgLCBkcmF3SW5wdXQ6IGZ1bmN0aW9uKGZpbHRlciwgdmFsdWUsIG9wKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi52YWx1ZVwiKS5yZW1vdmUoKTtcbiAgICAgIHZhciByID0gdGhpcy5fcmVuZGVyX29wW29wXTtcblxuICAgICAgaWYgKHIpIHtcbiAgICAgICAgcmV0dXJuIHIuYmluZCh0aGlzKShmaWx0ZXIsdmFsdWUpXG4gICAgICB9XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwiaW5wdXQudmFsdWVcIixcImlucHV0XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidmFsdWVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE1MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxZW1cIilcblxuICAgICAgICAuYXR0cihcInZhbHVlXCIsIHZhbHVlLnZhbHVlKVxuICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICB2YXIgdCA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAgIHR5cGV3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdC52YWx1ZTtcbiAgICAgICAgICAgIC8vdmFsdWUuZm4gPSBzZWxmLmJ1aWxkT3AodmFsdWUpXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcbiAgICAgICAgICB9LDEwMDApO1xuICAgICAgICB9KTtcbiAgICBcbiAgICB9XG4gICwgZmlsdGVyRm9vdGVyOiBmdW5jdGlvbih3cmFwKSB7XG4gICAgICB2YXIgZm9vdGVyID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmZpbHRlci1mb290ZXJcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlci1mb290ZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjEwcHhcIik7XG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgXG4gICAgICBkM191cGRhdGVhYmxlKGZvb3RlcixcIi5hZGRcIixcImFcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJhZGRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuaHRtbChcIiYjNjUyOTE7XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjEuNXB4IHNvbGlkICM0MjhCQ0NcIilcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICBcbiAgICAgICAgICB2YXIgZCA9IHNlbGYuX2RhdGE7XG4gICAgICAgICAgaWYgKGQubGVuZ3RoID09IDAgfHwgT2JqZWN0LmtleXMoZC5zbGljZSgtMSkpLmxlbmd0aCA+IDApIGQucHVzaCh7fSk7XG4gICAgICAgICAgc2VsZi5kcmF3KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAsIHR5cGV3YXRjaDogdHlwZXdhdGNoXG59O1xuXG5mdW5jdGlvbiBhY2Nlc3NvciQxKGF0dHIsIHZhbCkge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzW1wiX1wiICsgYXR0cl1cbiAgdGhpc1tcIl9cIiArIGF0dHJdID0gdmFsO1xuICByZXR1cm4gdGhpc1xufVxuXG5mdW5jdGlvbiBGaWx0ZXJEYXRhKGRhdGEpIHtcbiAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gIHRoaXMuX2wgPSBcIm9yXCI7XG59XG5cbmZ1bmN0aW9uIGZpbHRlcl9kYXRhKGRhdGEpIHtcbiAgcmV0dXJuIG5ldyBGaWx0ZXJEYXRhKGRhdGEpXG59XG5cbkZpbHRlckRhdGEucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IkMS5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfVxuICAsIGxvZ2ljOiBmdW5jdGlvbihsKSB7XG4gICAgICBpZiAobCA9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9sXG4gICAgICB0aGlzLl9sID0gKGwgPT0gXCJhbmRcIikgPyBcImFuZFwiIDogXCJvclwiO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb3A6IGZ1bmN0aW9uKG9wLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vcHNbb3BdIHx8IHRoaXMuX29wc1tcImVxdWFsc1wiXTtcbiAgICAgIHRoaXMuX29wc1tvcF0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgYnk6IGZ1bmN0aW9uKGIpIHtcbiAgICAgIFxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICAgICwgZmlsdGVyID0gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgaWYgKGIubGVuZ3RoID09IDApIHJldHVybiB0cnVlXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBtYXNrID0gYi5tYXAoZnVuY3Rpb24oeikge1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgdmFyIHNwbGl0ID0gei5maWVsZC5zcGxpdChcIi5cIiksIGZpZWxkID0gc3BsaXQuc2xpY2UoLTEpWzBdXG4gICAgICAgICAgICAgICAgLCBvYmogPSBzcGxpdC5zbGljZSgwLC0xKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwW2NdIH0seClcbiAgICAgICAgICAgICAgICAsIG9zcGxpdCA9IHoub3Auc3BsaXQoXCIuXCIpLCBvcCA9IG9zcGxpdFswXTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHJldHVybiBzZWxmLm9wKG9wKShmaWVsZCx6LnZhbHVlKShvYmopXG4gICAgICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4IH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2VsZi5fbCA9PSBcImFuZFwiKSByZXR1cm4gbWFzay5sZW5ndGggPT0gYi5sZW5ndGhcbiAgICAgICAgICAgIHJldHVybiBtYXNrLmxlbmd0aCA+IDBcbiAgICAgICAgICB9O1xuICAgICAgXG4gICAgICByZXR1cm4gdGhpcy5fZGF0YS5maWx0ZXIoZmlsdGVyKVxuXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl07XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBfb3BzOiB7XG4gICAgICAgIFwiZXF1YWxzXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKSA9PSBTdHJpbmcodmFsdWUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4vLyAgICAgICwgXCJjb250YWluc1wiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbi8vICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4vLyAgICAgICAgICAgIHJldHVybiBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMVxuLy8gICAgICAgICAgfVxuLy8gICAgICAgIH1cbiAgICAgICwgXCJzdGFydHMgd2l0aFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA9PSAwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiZW5kcyB3aXRoXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gKFN0cmluZyh4W2ZpZWxkXSkubGVuZ3RoIC0gU3RyaW5nKHZhbHVlKS5sZW5ndGgpID09IFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImRvZXMgbm90IGVxdWFsXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKSAhPSBTdHJpbmcodmFsdWUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgc2V0XCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHhbZmllbGRdICE9IHVuZGVmaW5lZCkgJiYgKHhbZmllbGRdICE9IFwiXCIpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgbm90IHNldFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIHhbZmllbGRdID09IHVuZGVmaW5lZFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImJldHdlZW5cIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh4W2ZpZWxkXSkgPj0gdmFsdWVbMF0gJiYgcGFyc2VJbnQoeFtmaWVsZF0pIDw9IHZhbHVlWzFdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMSB9LCAwKSA+IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAsIFwiaXMgbm90IGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPT0gMFxuICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICAgICwgXCJkb2VzIG5vdCBjb250YWluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKS50b0xvd2VyQ2FzZSgpKSA+IC0xIH0sIDApID09IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAsIFwiY29udGFpbnNcIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnRvTG93ZXJDYXNlKCkuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpLnRvTG93ZXJDYXNlKCkpID4gLTEgfSwgMCkgPiAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciB2ZXJzaW9uID0gXCIwLjAuMVwiO1xuXG5leHBvcnQgeyB2ZXJzaW9uLCBmaWx0ZXIkMiBhcyBmaWx0ZXIsIGZpbHRlcl9kYXRhIH07XG4iLCJleHBvcnQgZnVuY3Rpb24gcHJlcERhdGEoZGQpIHtcbiAgdmFyIHAgPSBbXVxuICBkMy5yYW5nZSgwLDI0KS5tYXAoZnVuY3Rpb24odCkge1xuICAgIFtcIjBcIixcIjIwXCIsXCI0MFwiXS5tYXAoZnVuY3Rpb24obSkge1xuICAgICAgaWYgKHQgPCAxMCkgcC5wdXNoKFwiMFwiICsgU3RyaW5nKHQpK1N0cmluZyhtKSlcbiAgICAgIGVsc2UgcC5wdXNoKFN0cmluZyh0KStTdHJpbmcobSkpXG5cbiAgICB9KVxuICB9KVxuICB2YXIgcm9sbGVkID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbihrKSB7IHJldHVybiBrLmhvdXIgKyBrLm1pbnV0ZSB9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICBwLmFydGljbGVzW2MudXJsXSA9IHRydWVcbiAgICAgICAgcC52aWV3cyArPSBjLmNvdW50XG4gICAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHsgYXJ0aWNsZXM6IHt9LCB2aWV3czogMCwgc2Vzc2lvbnM6IDB9KVxuICAgIH0pXG4gICAgLmVudHJpZXMoZGQpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICBPYmplY3Qua2V5cyh4LnZhbHVlcykubWFwKGZ1bmN0aW9uKHkpIHtcbiAgICAgICAgeFt5XSA9IHgudmFsdWVzW3ldXG4gICAgICB9KVxuICAgICAgeC5hcnRpY2xlX2NvdW50ID0gT2JqZWN0LmtleXMoeC5hcnRpY2xlcykubGVuZ3RoXG4gICAgICB4LmhvdXIgPSB4LmtleS5zbGljZSgwLDIpXG4gICAgICB4Lm1pbnV0ZSA9IHgua2V5LnNsaWNlKDIpXG4gICAgICB4LnZhbHVlID0geC5hcnRpY2xlX2NvdW50XG4gICAgICB4LmtleSA9IHAuaW5kZXhPZih4LmtleSlcbiAgICAgIC8vZGVsZXRlIHhbJ2FydGljbGVzJ11cbiAgICAgIHJldHVybiB4XG4gICAgfSlcbiAgcmV0dXJuIHJvbGxlZFxufVxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU3VtbWFyeSh1cmxzLGNvbXBhcmlzb24pIHtcbiAgdmFyIHN1bW1hcnlfZGF0YSA9IGJ1aWxkU3VtbWFyeURhdGEodXJscylcbiAgICAsIHBvcF9zdW1tYXJ5X2RhdGEgPSBidWlsZFN1bW1hcnlEYXRhKGNvbXBhcmlzb24pXG5cbiAgcmV0dXJuIGJ1aWxkU3VtbWFyeUFnZ3JlZ2F0aW9uKHN1bW1hcnlfZGF0YSxwb3Bfc3VtbWFyeV9kYXRhKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5RGF0YShkYXRhKSB7XG4gIHZhciByZWR1Y2VkID0gZGF0YS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICBwLmRvbWFpbnNbYy5kb21haW5dID0gdHJ1ZVxuICAgICAgcC5hcnRpY2xlc1tjLnVybF0gPSB0cnVlXG4gICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG5cbiAgICAgIHJldHVybiBwXG4gICAgfSx7XG4gICAgICAgIGRvbWFpbnM6IHt9XG4gICAgICAsIGFydGljbGVzOiB7fVxuICAgICAgLCBzZXNzaW9uczogMFxuICAgICAgLCB2aWV3czogMFxuICAgIH0pXG5cbiAgcmVkdWNlZC5kb21haW5zID0gT2JqZWN0LmtleXMocmVkdWNlZC5kb21haW5zKS5sZW5ndGhcbiAgcmVkdWNlZC5hcnRpY2xlcyA9IE9iamVjdC5rZXlzKHJlZHVjZWQuYXJ0aWNsZXMpLmxlbmd0aFxuXG4gIHJldHVybiByZWR1Y2VkXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN1bW1hcnlBZ2dyZWdhdGlvbihzYW1wLHBvcCkge1xuICAgICAgdmFyIGRhdGFfc3VtbWFyeSA9IHt9XG4gICAgICBPYmplY3Qua2V5cyhzYW1wKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgICBkYXRhX3N1bW1hcnlba10gPSB7XG4gICAgICAgICAgICBzYW1wbGU6IHNhbXBba11cbiAgICAgICAgICAsIHBvcHVsYXRpb246IHBvcFtrXVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gZGF0YV9zdW1tYXJ5XG4gIFxufVxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2F0ZWdvcmllc09sZChkYXRhKSB7XG4gIHZhciB2YWx1ZXMgPSBkYXRhLmNhdGVnb3J5XG4gICAgICAgIC5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB7XCJrZXlcIjogeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSwgXCJ2YWx1ZVwiOiB4LmNvdW50IH0gfSlcbiAgICAgICAgLnNvcnQoZnVuY3Rpb24ocCxjKSB7cmV0dXJuIGMudmFsdWUgLSBwLnZhbHVlIH0pLnNsaWNlKDAsMTUpXG4gICAgLCB0b3RhbCA9IHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCwgeCkge3JldHVybiBwICsgeC52YWx1ZSB9LCAwKVxuXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiQ2F0ZWdvcmllc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyB4LnBlcmNlbnQgPSB4LnZhbHVlL3RvdGFsOyByZXR1cm4geH0pXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVGltZXMoZGF0YSkge1xuXG4gIHZhciBob3VyID0gZGF0YS5jdXJyZW50X2hvdXJcblxuICB2YXIgY2F0ZWdvcmllcyA9IGRhdGEuZGlzcGxheV9jYXRlZ29yaWVzLnZhbHVlc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKSB7XG4gICAgaG91ciA9IGRhdGEuY2F0ZWdvcnlfaG91ci5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMX0pXG4gICAgaG91ciA9IGQzLm5lc3QoKVxuICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LmhvdXIgfSlcbiAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5taW51dGUgfSlcbiAgICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IFxuICAgICAgICAgIHAudW5pcXVlcyA9IChwLnVuaXF1ZXMgfHwgMCkgKyBjLnVuaXF1ZXM7IFxuICAgICAgICAgIHAuY291bnQgPSAocC5jb3VudCB8fCAwKSArIGMuY291bnQ7ICBcbiAgICAgICAgICByZXR1cm4gcCB9LHt9KVxuICAgICAgfSlcbiAgICAgIC5lbnRyaWVzKGhvdXIpXG4gICAgICAubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIGNvbnNvbGUubG9nKHgudmFsdWVzKTsgXG4gICAgICAgIHJldHVybiB4LnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxrKXsgXG4gICAgICAgICAgcFsnbWludXRlJ10gPSBwYXJzZUludChrLmtleSk7IFxuICAgICAgICAgIHBbJ2NvdW50J10gPSBrLnZhbHVlcy5jb3VudDsgXG4gICAgICAgICAgcFsndW5pcXVlcyddID0gay52YWx1ZXMudW5pcXVlczsgXG4gICAgICAgICAgcmV0dXJuIHAgXG4gICAgICB9LCB7XCJob3VyXCI6eC5rZXl9KSB9IClcbiAgfVxuXG4gIHZhciB2YWx1ZXMgPSBob3VyXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB7XCJrZXlcIjogcGFyc2VGbG9hdCh4LmhvdXIpICsgMSArIHgubWludXRlLzYwLCBcInZhbHVlXCI6IHguY291bnQgfSB9KVxuXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiQnJvd3NpbmcgYmVoYXZpb3IgYnkgdGltZVwiXG4gICAgLCB2YWx1ZXM6IHZhbHVlc1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFRvcGljcyhkYXRhKSB7XG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkYXRhLmRpc3BsYXlfY2F0ZWdvcmllcy52YWx1ZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cblxuICB2YXIgaWRmID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7cmV0dXJuIHgudG9waWN9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkge3JldHVybiB4WzBdLmlkZiB9KVxuICAgIC5tYXAoZGF0YS5mdWxsX3VybHMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIkludGVybmV0ICYgVGVsZWNvbVwifSkgKVxuXG4gIHZhciBnZXRJREYgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIChpZGZbeF0gPT0gXCJOQVwiKSB8fCAoaWRmW3hdID4gODY4NikgPyAwIDogaWRmW3hdXG4gIH1cblxuICB2YXIgdmFsdWVzID0gZGF0YS5mdWxsX3VybHNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG9waWMgPyB4LnRvcGljLnRvTG93ZXJDYXNlKCkgIT0gXCJubyB0b3BpY1wiIDogdHJ1ZSB9KVxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJrZXlcIjp4LnRvcGljXG4gICAgICAgICwgXCJ2YWx1ZVwiOnguY291bnRcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC51bmlxdWVzIFxuICAgICAgICAsIFwidXJsXCI6IHgudXJsXG4gICAgICB9IFxuICAgIH0pXG5cblxuXG4gIHZhbHVlcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7IFxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwia2V5XCI6IHhbMF0ua2V5XG4gICAgICAgICAsIFwidmFsdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy52YWx1ZX0sMClcbiAgICAgICAgICwgXCJwZXJjZW50X3VuaXF1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnVuaXF1ZXMvYy52YWx1ZX0sMCkveC5sZW5ndGhcbiAgICAgICAgICwgXCJ1cmxzXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwLmluZGV4T2YoYy51cmwpID09IC0xID8gcC5wdXNoKGMudXJsKSA6IHA7IHJldHVybiBwIH0sW10pXG5cbiAgICAgICB9IFxuICAgIH0pXG4gICAgLmVudHJpZXModmFsdWVzKS5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB4LnZhbHVlcyB9KVxuXG4gIGlmIChjYXRlZ29yaWVzLmxlbmd0aCA+IDApXG4gICAgdmFsdWVzID0gdmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KSB7cmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZih4LnBhcmVudF9jYXRlZ29yeV9uYW1lKSA+IC0xIH0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC50Zl9pZGYgPSBnZXRJREYoeC5rZXkpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSBcbiAgICB4LmNvdW50ID0geC52YWx1ZVxuICAgIHguaW1wb3J0YW5jZSA9IE1hdGgubG9nKHgudGZfaWRmKVxuICB9KVxuICB2YWx1ZXMgPSB2YWx1ZXMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudGZfaWRmIC0gcC50Zl9pZGYgfSlcblxuXG4gIHZhciB0b3RhbCA9IGQzLnN1bSh2YWx1ZXMsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jb3VudCp4LnBlcmNlbnRfdW5pcXVlfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgeC5wb3BfcGVyY2VudCA9IDEuMDIvZ2V0SURGKHgua2V5KSoxMDBcbiAgICB4LnBvcF9wZXJjZW50ID0geC5wb3BfcGVyY2VudCA9PSBJbmZpbml0eSA/IDAgOiB4LnBvcF9wZXJjZW50XG5cbiAgICB4LnNhbXBsZV9wZXJjZW50ID0geC5jb3VudCp4LnBlcmNlbnRfdW5pcXVlL3RvdGFsKjEwMFxuICB9KVxuXG4gIHZhciBub3JtID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAucmFuZ2UoWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnBvcF9wZXJjZW50fSldKVxuICAgIC5kb21haW4oWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHguc2FtcGxlX3BlcmNlbnR9KV0pXG4gICAgLm5pY2UoKVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHguc2FtcGxlX3BlcmNlbnRfbm9ybSA9IG5vcm0oeC5zYW1wbGVfcGVyY2VudClcblxuICAgIHgucmF0aW8gPSB4LnNhbXBsZV9wZXJjZW50L3gucG9wX3BlcmNlbnRcbiAgICAvL3gucGVyY2VudF9ub3JtID0geC5wZXJjZW50XG4gIH0pXG5cblxuXG4gIFxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIlRvcCBUb3BpY3NcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCwzMDApXG4gIH1cbn1cblxuXG5cblxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRPbnNpdGVTdW1tYXJ5KGRhdGEpIHtcbiAgdmFyIHllc3RlcmRheSA9IGRhdGEudGltZXNlcmllc19kYXRhWzBdXG4gIHZhciB2YWx1ZXMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwia2V5XCI6IFwiUGFnZSBWaWV3c1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IHllc3RlcmRheS52aWV3c1xuICAgICAgICB9XG4gICAgICAsIHtcbiAgICAgICAgICAgIFwia2V5XCI6IFwiVW5pcXVlIFZpc2l0b3JzXCJcbiAgICAgICAgICAsIFwidmFsdWVcIjogeWVzdGVyZGF5LnVuaXF1ZXNcblxuICAgICAgICB9XG4gICAgXVxuICByZXR1cm4ge1wia2V5XCI6XCJPbi1zaXRlIEFjdGl2aXR5XCIsXCJ2YWx1ZXNcIjp2YWx1ZXN9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZE9mZnNpdGVTdW1tYXJ5KGRhdGEpIHtcbiAgdmFyIHZhbHVlcyA9IFsgIFxuICAgICAgICB7XG4gICAgICAgICAgICBcImtleVwiOiBcIk9mZi1zaXRlIFZpZXdzXCJcbiAgICAgICAgICAsIFwidmFsdWVcIjogZGF0YS5mdWxsX3VybHMucmVkdWNlKGZ1bmN0aW9uKHAsYykge3JldHVybiBwICsgYy51bmlxdWVzfSwwKVxuICAgICAgICB9XG4gICAgICAsIHtcbiAgICAgICAgICAgIFwia2V5XCI6IFwiVW5pcXVlIHBhZ2VzXCJcbiAgICAgICAgICAsIFwidmFsdWVcIjogT2JqZWN0LmtleXMoZGF0YS5mdWxsX3VybHMucmVkdWNlKGZ1bmN0aW9uKHAsYykge3BbYy51cmxdID0gMDsgcmV0dXJuIHAgfSx7fSkpLmxlbmd0aFxuICAgICAgICB9XG4gICAgXVxuICByZXR1cm4ge1wia2V5XCI6XCJPZmYtc2l0ZSBBY3Rpdml0eVwiLFwidmFsdWVzXCI6dmFsdWVzfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBY3Rpb25zKGRhdGEpIHtcbiAgXG4gIHJldHVybiB7XCJrZXlcIjpcIlNlZ21lbnRzXCIsXCJ2YWx1ZXNcIjogZGF0YS5hY3Rpb25zLm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHtcImtleVwiOnguYWN0aW9uX25hbWUsIFwidmFsdWVcIjowLCBcInNlbGVjdGVkXCI6IGRhdGEuYWN0aW9uX25hbWUgPT0geC5hY3Rpb25fbmFtZSB9IH0pfVxufVxuXG5cbi8vIGZyb20gZGF0YS5qc1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRGF0YShkYXRhLGJ1Y2tldHMscG9wX2NhdGVnb3JpZXMpIHtcblxuICB2YXIgdGltZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgIC5tYXAoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuXG4gIHZhciBjYXRzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLm1hcChkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJcIiB9KSApXG5cblxuXG5cbiAgdmFyIHRpbWVfY2F0ZWdvcmllcyA9IGJ1Y2tldHMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2NdID0ge307IHJldHVybiBwIH0sIHt9KVxuICB2YXIgY2F0ZWdvcnlfdGltZXMgPSBPYmplY3Qua2V5cyhjYXRzKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbY10gPSB7fTsgcmV0dXJuIHAgfSwge30pXG5cblxuICB2YXIgY2F0ZWdvcmllcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgLmVudHJpZXMoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7XG4gICAgICByb3cudmFsdWVzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICAgIHQucGVyY2VudCA9IGQzLnN1bSh0LnZhbHVlcyxmdW5jdGlvbihkKXsgcmV0dXJuIGQudW5pcXVlc30pLyBkMy5zdW0odGltZXNbdC5rZXldLGZ1bmN0aW9uKGQpIHtyZXR1cm4gZC51bmlxdWVzfSkgXG4gICAgICAgIHRpbWVfY2F0ZWdvcmllc1t0LmtleV1bcm93LmtleV0gPSB0LnBlcmNlbnRcbiAgICAgICAgY2F0ZWdvcnlfdGltZXNbcm93LmtleV1bdC5rZXldID0gdC5wZXJjZW50XG5cbiAgICAgIH0pXG4gICAgICByZXR1cm4gcm93XG4gICAgfSlcbiAgICAuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuICgocG9wX2NhdGVnb3JpZXNbYi5rZXldIHx8IHt9KS5ub3JtYWxpemVkX3BvcCB8fCAwKS0gKChwb3BfY2F0ZWdvcmllc1thLmtleV0gfHwge30pLm5vcm1hbGl6ZWRfcG9wIHx8IDApIH0pXG5cblxuICB2YXIgdGltZV9ub3JtYWxpemVfc2NhbGVzID0ge31cblxuICBkMy5lbnRyaWVzKHRpbWVfY2F0ZWdvcmllcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIHRpbWVfbm9ybWFsaXplX3NjYWxlc1t0cm93LmtleV0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbZDMubWluKHZhbHVlcyksZDMubWF4KHZhbHVlcyldKVxuICAgICAgLnJhbmdlKFswLDFdKVxuICB9KVxuXG4gIHZhciBjYXRfbm9ybWFsaXplX3NjYWxlcyA9IHt9XG5cbiAgZDMuZW50cmllcyhjYXRlZ29yeV90aW1lcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIGNhdF9ub3JtYWxpemVfc2NhbGVzW3Ryb3cua2V5XSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFtkMy5taW4odmFsdWVzKSxkMy5tYXgodmFsdWVzKV0pXG4gICAgICAucmFuZ2UoWzAsMV0pXG4gIH0pXG5cbiAgY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24ocCkge1xuICAgIHZhciBjYXQgPSBwLmtleVxuICAgIHAudmFsdWVzLm1hcChmdW5jdGlvbihxKSB7XG4gICAgICBxLm5vcm1fY2F0ID0gY2F0X25vcm1hbGl6ZV9zY2FsZXNbY2F0XShxLnBlcmNlbnQpXG4gICAgICBxLm5vcm1fdGltZSA9IHRpbWVfbm9ybWFsaXplX3NjYWxlc1txLmtleV0ocS5wZXJjZW50KVxuXG4gICAgICBxLnNjb3JlID0gMipxLm5vcm1fY2F0LzMgKyBxLm5vcm1fdGltZS8zXG4gICAgICBxLnNjb3JlID0gcS5ub3JtX3RpbWVcblxuICAgICAgdmFyIHBlcmNlbnRfcG9wID0gcG9wX2NhdGVnb3JpZXNbY2F0XSA/IHBvcF9jYXRlZ29yaWVzW2NhdF0ucGVyY2VudF9wb3AgOiAwXG5cbiAgICAgIHEucGVyY2VudF9kaWZmID0gKHEucGVyY2VudCAtIHBlcmNlbnRfcG9wKS9wZXJjZW50X3BvcFxuXG4gICAgfSlcbiAgfSlcblxuICByZXR1cm4gY2F0ZWdvcmllc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJlcGFyZUZpbHRlcnMoZmlsdGVycykge1xuICB2YXIgbWFwcGluZyA9IHtcbiAgICAgIFwiQ2F0ZWdvcnlcIjogXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiXG4gICAgLCBcIlRpdGxlXCI6IFwidXJsXCJcbiAgICAsIFwiVGltZVwiOiBcImhvdXJcIlxuICB9XG5cbiAgdmFyIGZpbHRlcnMgPSBmaWx0ZXJzLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiBPYmplY3Qua2V5cyh4KS5sZW5ndGggJiYgeC52YWx1ZSB9KS5tYXAoZnVuY3Rpb24oeikge1xuICAgIHJldHVybiB7IFxuICAgICAgICBcImZpZWxkXCI6IG1hcHBpbmdbei5maWVsZF1cbiAgICAgICwgXCJvcFwiOiB6Lm9wXG4gICAgICAsIFwidmFsdWVcIjogei52YWx1ZVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gZmlsdGVyc1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGF1dG9TaXplKHdyYXAsYWRqdXN0V2lkdGgsYWRqdXN0SGVpZ2h0KSB7XG5cbiAgZnVuY3Rpb24gZWxlbWVudFRvV2lkdGgoZWxlbSkge1xuXG4gICAgdmFyIF93ID0gd3JhcC5ub2RlKCkub2Zmc2V0V2lkdGggfHwgd3JhcC5ub2RlKCkucGFyZW50Tm9kZS5vZmZzZXRXaWR0aCB8fCB3cmFwLm5vZGUoKS5wYXJlbnROb2RlLnBhcmVudE5vZGUub2Zmc2V0V2lkdGhcbiAgICB2YXIgbnVtID0gX3cgfHwgd3JhcC5zdHlsZShcIndpZHRoXCIpLnNwbGl0KFwiLlwiKVswXS5yZXBsYWNlKFwicHhcIixcIlwiKSBcbiAgICByZXR1cm4gcGFyc2VJbnQobnVtKVxuICB9XG5cbiAgZnVuY3Rpb24gZWxlbWVudFRvSGVpZ2h0KGVsZW0pIHtcbiAgICB2YXIgbnVtID0gd3JhcC5zdHlsZShcImhlaWdodFwiKS5zcGxpdChcIi5cIilbMF0ucmVwbGFjZShcInB4XCIsXCJcIilcbiAgICByZXR1cm4gcGFyc2VJbnQobnVtKVxuICB9XG5cbiAgdmFyIHcgPSBlbGVtZW50VG9XaWR0aCh3cmFwKSB8fCA3MDAsXG4gICAgaCA9IGVsZW1lbnRUb0hlaWdodCh3cmFwKSB8fCAzNDA7XG5cbiAgdyA9IGFkanVzdFdpZHRoKHcpXG4gIGggPSBhZGp1c3RIZWlnaHQoaClcblxuXG4gIHZhciBtYXJnaW4gPSB7dG9wOiAxMCwgcmlnaHQ6IDE1LCBib3R0b206IDEwLCBsZWZ0OiAxNX0sXG4gICAgICB3aWR0aCAgPSB3IC0gbWFyZ2luLmxlZnQgLSBtYXJnaW4ucmlnaHQsXG4gICAgICBoZWlnaHQgPSBoIC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b207XG5cbiAgcmV0dXJuIHtcbiAgICBtYXJnaW46IG1hcmdpbixcbiAgICB3aWR0aDogd2lkdGgsXG4gICAgaGVpZ2h0OiBoZWlnaHRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXV0b1NjYWxlcyhfc2l6ZXMsIGxlbikge1xuXG4gIHZhciBtYXJnaW4gPSBfc2l6ZXMubWFyZ2luLFxuICAgIHdpZHRoID0gX3NpemVzLndpZHRoLFxuICAgIGhlaWdodCA9IF9zaXplcy5oZWlnaHQ7XG5cbiAgaGVpZ2h0ID0gbGVuICogMjZcbiAgXG4gIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5yYW5nZShbd2lkdGgvMiwgd2lkdGgtMjBdKTtcbiAgXG4gIHZhciB5ID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAucmFuZ2VSb3VuZEJhbmRzKFswLCBoZWlnaHRdLCAuMik7XG5cbiAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHgpXG4gICAgICAub3JpZW50KFwidG9wXCIpO1xuXG5cbiAgcmV0dXJuIHtcbiAgICAgIHg6IHhcbiAgICAsIHk6IHlcbiAgICAsIHhBeGlzOiB4QXhpc1xuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBzdGF0ZSBmcm9tICdzdGF0ZSdcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmUocXNfc3RhdGUsX3N0YXRlKSB7XG5cbiAgdmFyIHVwZGF0ZXMgPSB7fVxuXG5cbiAgc3RhdGUuY29tcF9ldmFsKHFzX3N0YXRlLF9zdGF0ZSx1cGRhdGVzKVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzZWxlY3RlZF9hY3Rpb25cIlxuICAgICAgLCAoeCx5KSA9PiB5LmFjdGlvbnMuZmlsdGVyKHogPT4gei5hY3Rpb25faWQgPT0geC5zZWxlY3RlZF9hY3Rpb24pWzBdXG4gICAgICAsICh4LHkpID0+IHkuc2VsZWN0ZWRfYWN0aW9uXG4gICAgKVxuICAgIC5mYWlsdXJlKFwic2VsZWN0ZWRfYWN0aW9uXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmose1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJzZWxlY3RlZF9hY3Rpb25cIjogX25ld1xuICAgICAgfSlcbiAgICB9KVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzZWxlY3RlZF92aWV3XCJcbiAgICAgICwgKHgseSkgPT4geC5zZWxlY3RlZF92aWV3XG4gICAgICAsIChfLHkpID0+IHkuZGFzaGJvYXJkX29wdGlvbnMuZmlsdGVyKHggPT4geC5zZWxlY3RlZClbMF0udmFsdWUgXG4gICAgKVxuICAgIC5mYWlsdXJlKFwic2VsZWN0ZWRfdmlld1wiLCAoX25ldyxfb2xkLG9iaikgPT4ge1xuICAgICAgLy8gdGhpcyBzaG91bGQgYmUgcmVkb25lIHNvIGl0cyBub3QgZGlmZmVyZW50IGxpa2UgdGhpc1xuICAgICAgT2JqZWN0LmFzc2lnbihvYmosIHtcbiAgICAgICAgICBcImxvYWRpbmdcIjogdHJ1ZVxuICAgICAgICAsIFwiZGFzaGJvYXJkX29wdGlvbnNcIjogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMpKS5tYXAoeCA9PiB7IFxuICAgICAgICAgICAgeC5zZWxlY3RlZCA9ICh4LnZhbHVlID09IF9uZXcpOyBcbiAgICAgICAgICAgIHJldHVybiB4IFxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInNlbGVjdGVkX2NvbXBhcmlzb25cIlxuICAgICAgLCAoeCx5KSA9PiB5LmFjdGlvbnMuZmlsdGVyKHogPT4gei5hY3Rpb25faWQgPT0geC5zZWxlY3RlZF9jb21wYXJpc29uKVswXVxuICAgICAgLCAoeCx5KSA9PiB5LnNlbGVjdGVkX2NvbXBhcmlzb25cbiAgICApXG4gICAgLmZhaWx1cmUoXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmose1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJzZWxlY3RlZF9jb21wYXJpc29uXCI6IF9uZXdcbiAgICAgIH0pXG4gICAgfSlcbiAgICAuZXF1YWwoXCJmaWx0ZXJzXCIsICh4LHkpID0+IEpTT04uc3RyaW5naWZ5KHgpID09IEpTT04uc3RyaW5naWZ5KHkpIClcbiAgICAuZmFpbHVyZShcImZpbHRlcnNcIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcImZpbHRlcnNcIjogX25ldyB8fCBbe31dXG4gICAgICB9KVxuICAgIH0pXG4gICAgLmZhaWx1cmUoXCJhY3Rpb25fZGF0ZVwiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHsgbG9hZGluZzogdHJ1ZSwgXCJhY3Rpb25fZGF0ZVwiOiBfbmV3IH0pXG4gICAgfSlcbiAgICAuZmFpbHVyZShcImNvbXBhcmlzb25fZGF0ZVwiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHsgbG9hZGluZzogdHJ1ZSwgXCJjb21wYXJpc29uX2RhdGVcIjogX25ldyB9KVxuICAgIH0pXG5cbiAgICAuZXZhbHVhdGUoKVxuXG4gIHZhciBjdXJyZW50ID0gc3RhdGUucXMoe30pLnRvKF9zdGF0ZS5xc19zdGF0ZSB8fCB7fSlcbiAgICAsIHBvcCA9IHN0YXRlLnFzKHt9KS50byhxc19zdGF0ZSlcblxuICBpZiAoT2JqZWN0LmtleXModXBkYXRlcykubGVuZ3RoICYmIGN1cnJlbnQgIT0gcG9wKSB7XG4gICAgcmV0dXJuIHVwZGF0ZXNcbiAgfVxuXG4gIHJldHVybiB7fVxuICBcbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQge2ZpbHRlcl9kYXRhfSBmcm9tICdmaWx0ZXInO1xuXG5leHBvcnQgKiBmcm9tICcuL2hlbHBlcnMvZGF0YV9oZWxwZXJzJ1xuZXhwb3J0ICogZnJvbSAnLi9oZWxwZXJzL2dyYXBoX2hlbHBlcnMnXG5leHBvcnQgKiBmcm9tICcuL2hlbHBlcnMvc3RhdGVfaGVscGVycydcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9wU2VjdGlvbihzZWN0aW9uKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHNlY3Rpb24sXCIudG9wLXNlY3Rpb25cIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidG9wLXNlY3Rpb25cIix0cnVlKVxuICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjE2MHB4XCIpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1haW5pbmdTZWN0aW9uKHNlY3Rpb24pIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUoc2VjdGlvbixcIi5yZW1haW5pbmctc2VjdGlvblwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJyZW1haW5pbmctc2VjdGlvblwiLHRydWUpXG59XG5cbnZhciBvcHMgPSB7XG4gICAgXCJpcyBpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIilcbiAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPiAwXG4gICAgICAgIH0gXG4gICAgICB9XG4gICwgXCJpcyBub3QgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUuc3BsaXQoXCIsXCIpXG4gICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xIH0sIDApID09IDBcbiAgICAgICAgfSBcbiAgICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVybWluZUxvZ2ljKG9wdGlvbnMpIHtcbiAgY29uc3QgX2RlZmF1bHQgPSBvcHRpb25zWzBdXG4gIGNvbnN0IHNlbGVjdGVkID0gb3B0aW9ucy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5zZWxlY3RlZCB9KVxuICByZXR1cm4gc2VsZWN0ZWQubGVuZ3RoID4gMCA/IHNlbGVjdGVkWzBdIDogX2RlZmF1bHRcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclVybHModXJscyxsb2dpYyxmaWx0ZXJzKSB7XG4gIHJldHVybiBmaWx0ZXJfZGF0YSh1cmxzKVxuICAgIC5vcChcImlzIGluXCIsIG9wc1tcImlzIGluXCJdKVxuICAgIC5vcChcImlzIG5vdCBpblwiLCBvcHNbXCJpcyBub3QgaW5cIl0pXG4gICAgLmxvZ2ljKGxvZ2ljLnZhbHVlKVxuICAgIC5ieShmaWx0ZXJzKVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gU2VsZWN0KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNlbGVjdCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3QodGFyZ2V0KVxufVxuXG5TZWxlY3QucHJvdG90eXBlID0ge1xuICAgIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHRoaXMuX3NlbGVjdCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCJzZWxlY3RcIixcInNlbGVjdFwiLHRoaXMuX29wdGlvbnMpXG5cbiAgICAgIHZhciBib3VuZCA9IHRoaXMub24oXCJzZWxlY3RcIikuYmluZCh0aGlzKVxuXG4gICAgICB0aGlzLl9zZWxlY3RcbiAgICAgICAgLm9uKFwiY2hhbmdlXCIsZnVuY3Rpb24oeCkgeyBib3VuZCh0aGlzLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXykgfSlcblxuICAgICAgdGhpcy5fb3B0aW9ucyA9IGQzX3NwbGF0KHRoaXMuX3NlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIsaWRlbnRpdHksa2V5KVxuICAgICAgICAudGV4dChrZXkpXG4gICAgICAgIC5wcm9wZXJ0eShcInNlbGVjdGVkXCIsICh4KSA9PiB7XG4gICAgICAgICAgcmV0dXJuICh4LnZhbHVlICYmIHgudmFsdWUgPT0gdGhpcy5fc2VsZWN0ZWQpID8gXG4gICAgICAgICAgICBcInNlbGVjdGVkXCIgOiB4LnNlbGVjdGVkID09IDEgPyBcbiAgICAgICAgICAgIFwic2VsZWN0ZWRcIiA6IG51bGxcbiAgICAgICAgIFxuICAgICAgICB9KVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzZWxlY3RlZDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlbGVjdGVkXCIsdmFsKVxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi9zZWxlY3QnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5mdW5jdGlvbiBpbmplY3RDc3MoY3NzX3N0cmluZykge1xuICBkM191cGRhdGVhYmxlKGQzLnNlbGVjdChcImhlYWRcIiksXCJzdHlsZSNoZWFkZXItY3NzXCIsXCJzdHlsZVwiKVxuICAgIC5hdHRyKFwiaWRcIixcImhlYWRlci1jc3NcIilcbiAgICAudGV4dChDU1NfU1RSSU5HLnJlcGxhY2UoXCJmdW5jdGlvbiAoKSB7LypcIixcIlwiKS5yZXBsYWNlKFwiKi99XCIsXCJcIikpXG59XG5cbmZ1bmN0aW9uIGJ1dHRvbldyYXAod3JhcCkge1xuICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcCwgXCJoMy5idXR0b25zXCIsXCJoM1wiKVxuICAgIC5jbGFzc2VkKFwiYnV0dG9uc1wiLHRydWUpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi01cHhcIilcblxuICB2YXIgcmlnaHRfcHVsbCA9IGQzX3VwZGF0ZWFibGUoaGVhZCxcIi5wdWxsLXJpZ2h0XCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJwdWxsLXJpZ2h0IGhlYWRlci1idXR0b25zXCIsIHRydWUpXG4gICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxN3B4XCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIycHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LWRlY29yYXRpb25cIixcIm5vbmUgIWltcG9ydGFudFwiKVxuXG4gIHJldHVybiByaWdodF9wdWxsXG59XG5cbmZ1bmN0aW9uIGV4cGFuc2lvbldyYXAod3JhcCkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh3cmFwLFwiZGl2LmhlYWRlci1ib2R5XCIsXCJkaXZcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEzcHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwibm9uZVwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcIm5vcm1hbFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxNzVweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjI1cHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIyNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxNzVweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIndoaXRlXCIpXG4gICAgLmNsYXNzZWQoXCJoZWFkZXItYm9keSBoaWRkZW5cIix0cnVlKVxufVxuXG5mdW5jdGlvbiBoZWFkV3JhcCh3cmFwKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHdyYXAsIFwiaDMuZGF0YS1oZWFkZXJcIixcImgzXCIpXG4gICAgLmNsYXNzZWQoXCJkYXRhLWhlYWRlclwiLHRydWUpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi01cHhcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiIGJvbGRcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIiAxNHB4XCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIiAyMnB4XCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcIiB1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiICM4ODhcIilcbiAgICAuc3R5bGUoXCJsZXR0ZXItc3BhY2luZ1wiLFwiIC4wNWVtXCIpXG5cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gSGVhZGVyKHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG5cbiAgdmFyIENTU19TVFJJTkcgPSBTdHJpbmcoZnVuY3Rpb24oKSB7LypcbiAgICAuaGVhZGVyLWJ1dHRvbnMgYSBzcGFuLmhvdmVyLXNob3cgeyBkaXNwbGF5Om5vbmUgfVxuICAgIC5oZWFkZXItYnV0dG9ucyBhOmhvdmVyIHNwYW4uaG92ZXItc2hvdyB7IGRpc3BsYXk6aW5saW5lOyBwYWRkaW5nLWxlZnQ6M3B4IH1cbiAgKi99KVxuICBcbn1cblxuZnVuY3Rpb24gaGVhZGVyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEhlYWRlcih0YXJnZXQpXG59XG5cbkhlYWRlci5wcm90b3R5cGUgPSB7XG4gICAgdGV4dDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRleHRcIix2YWwpIFxuICAgIH1cbiAgLCBvcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwib3B0aW9uc1wiLHZhbCkgXG4gICAgfVxuICAsIGJ1dHRvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJidXR0b25zXCIsdmFsKSBcbiAgICB9XG4gICwgZXhwYW5zaW9uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZXhwYW5zaW9uXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsIFwiLmhlYWRlci13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoZWFkZXItd3JhcFwiLHRydWUpXG5cbiAgICAgIHZhciBleHBhbmRfd3JhcCA9IGV4cGFuc2lvbldyYXAod3JhcClcbiAgICAgICAgLCBidXR0b25fd3JhcCA9IGJ1dHRvbldyYXAod3JhcClcbiAgICAgICAgLCBoZWFkX3dyYXAgPSBoZWFkV3JhcCh3cmFwKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGhlYWRfd3JhcCxcInNwYW4udGl0bGVcIixcInNwYW5cIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgICAgIC50ZXh0KHRoaXMuX3RleHQpXG5cbiAgICAgIGlmICh0aGlzLl9vcHRpb25zKSB7XG5cbiAgICAgICAgdmFyIGJvdW5kID0gdGhpcy5vbihcInNlbGVjdFwiKS5iaW5kKHRoaXMpXG5cbiAgICAgICAgdmFyIHNlbGVjdEJveCA9IHNlbGVjdChoZWFkX3dyYXApXG4gICAgICAgICAgLm9wdGlvbnModGhpcy5fb3B0aW9ucylcbiAgICAgICAgICAub24oXCJzZWxlY3RcIixmdW5jdGlvbih4KSB7IGJvdW5kKHgpIH0pXG4gICAgICAgICAgLmRyYXcoKVxuXG4gICAgICAgIHNlbGVjdEJveC5fc2VsZWN0XG4gICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE5cHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMTJweFwiKVxuICAgICAgICAgIFxuICAgICAgICBzZWxlY3RCb3guX29wdGlvbnNcbiAgICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzg4OFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLFwiMTAwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCI1cHhcIilcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2J1dHRvbnMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGEgPSBkM19zcGxhdChidXR0b25fd3JhcCxcImFcIixcImFcIix0aGlzLl9idXR0b25zLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRleHQgfSlcbiAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAuc3R5bGUoXCJib3JkZXItcmlnaHRcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMnB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwidGV4dC1kZWNvcmF0aW9uXCIsXCJub25lXCIpXG4gICAgICAgICAgLmh0bWwoeCA9PiBcIjxzcGFuIGNsYXNzPSdcIiArIHguaWNvbiArIFwiJz48L3NwYW4+PHNwYW4gc3R5bGU9J3BhZGRpbmctbGVmdDozcHgnPlwiICsgeC50ZXh0ICsgXCI8L3NwYW4+XCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLHggPT4geC5jbGFzcylcbiAgICAgICAgICAub24oXCJjbGlja1wiLHggPT4gdGhpcy5vbih4LmNsYXNzICsgXCIuY2xpY2tcIikoeCkpXG5cblxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbmV4cG9ydCBkZWZhdWx0IGhlYWRlcjtcbiIsImltcG9ydCB7YWNjZXNzb3IsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBub29wfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGQzIGZyb20gJ2QzJztcbmltcG9ydCAnLi90YWJsZS5jc3MnXG5cblxudmFyIEVYQU1QTEVfREFUQSA9IHtcbiAgICBcImtleVwiOiBcIlRvcCBTaXRlc1wiXG4gICwgXCJ2YWx1ZXNcIjogW1xuICAgICAgeyAgXG4gICAgICAgICAgXCJrZXlcIjpcIlVSTC5jb21cIlxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOlwiYW9sLmNvbVwiXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICBdIFxufVxuXG5mdW5jdGlvbiBUYWJsZSh0YXJnZXQpIHtcbiAgdGhpcy5fd3JhcHBlcl9jbGFzcyA9IFwidGFibGUtd3JhcHBlclwiXG4gIHRoaXMuX3RhcmdldCA9IHRhcmdldDtcbiAgdGhpcy5fZGF0YSA9IHt9Ly9FWEFNUExFX0RBVEFcbiAgdGhpcy5fc29ydCA9IHt9XG4gIHRoaXMuX3JlbmRlcmVycyA9IHt9XG4gIHRoaXMuX3RvcCA9IDBcblxuICB0aGlzLl9kZWZhdWx0X3JlbmRlcmVyID0gZnVuY3Rpb24gKHgpIHtcbiAgICBpZiAoeC5rZXkuaW5kZXhPZihcInBlcmNlbnRcIikgPiAtMSkgcmV0dXJuIGQzLnNlbGVjdCh0aGlzKS50ZXh0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIHZhciBwZCA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfX1xuICAgICAgICByZXR1cm4gZDMuZm9ybWF0KFwiLjIlXCIpKHBkW3gua2V5XS8xMDApXG4gICAgICB9KVxuICAgXG4gICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzKS50ZXh0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICB2YXIgcGQgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX19cbiAgICAgIHJldHVybiBwZFt4LmtleV0gPiAwID8gZDMuZm9ybWF0KFwiLC4yZlwiKShwZFt4LmtleV0pLnJlcGxhY2UoXCIuMDBcIixcIlwiKSA6IHBkW3gua2V5XVxuICAgIH0pXG4gIH1cblxuICB0aGlzLl9oaWRkZW5fZmllbGRzID0gW11cbiAgdGhpcy5fb24gPSB7fVxuXG4gIHRoaXMuX3JlbmRlcl9leHBhbmQgPSBmdW5jdGlvbihkKSB7XG4gICAgZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInRkLm9wdGlvbi1oZWFkZXJcIikuaHRtbChcIiZuZGFzaDtcIilcbiAgICBpZiAodGhpcy5uZXh0U2libGluZyAmJiBkMy5zZWxlY3QodGhpcy5uZXh0U2libGluZykuY2xhc3NlZChcImV4cGFuZGVkXCIpID09IHRydWUpIHtcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImIzY1MjkxO1wiKVxuICAgICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgIH1cblxuICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgIHZhciB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcbiAgICB0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHQsIHRoaXMubmV4dFNpYmxpbmcpOyAgXG5cblxuICAgIHZhciB0ciA9IGQzLnNlbGVjdCh0KS5jbGFzc2VkKFwiZXhwYW5kZWRcIix0cnVlKS5kYXR1bSh7fSlcbiAgICB2YXIgdGQgPSBkM191cGRhdGVhYmxlKHRyLFwidGRcIixcInRkXCIpXG4gICAgICAuYXR0cihcImNvbHNwYW5cIix0aGlzLmNoaWxkcmVuLmxlbmd0aClcblxuICAgIHJldHVybiB0ZFxuICB9XG4gIHRoaXMuX3JlbmRlcl9oZWFkZXIgPSBmdW5jdGlvbih3cmFwKSB7XG5cblxuICAgIHdyYXAuZWFjaChmdW5jdGlvbihkYXRhKSB7XG4gICAgICB2YXIgaGVhZGVycyA9IGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KHRoaXMpLFwiLmhlYWRlcnNcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImhlYWRlcnNcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlci1ib3R0b21cIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgaGVhZGVycy5odG1sKFwiXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShoZWFkZXJzLFwiLnVybFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidXJsXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjc1JVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoXCJBcnRpY2xlXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaGVhZGVycyxcIi5jb3VudFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY291bnRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjUlXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChcIkNvdW50XCIpXG5cblxuICAgIH0pXG5cbiAgfVxuICB0aGlzLl9yZW5kZXJfcm93ID0gZnVuY3Rpb24ocm93KSB7XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUocm93LFwiLnVybFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidXJsXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjc1JVwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcImhpZGRlblwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkge3JldHVybiB4LmtleX0pXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUocm93LFwiLmNvdW50XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb3VudFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCl7cmV0dXJuIHgudmFsdWV9KVxuXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRhYmxlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFRhYmxlKHRhcmdldClcbn1cblxuVGFibGUucHJvdG90eXBlID0ge1xuXG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7IFxuICAgICAgdmFyIHZhbHVlID0gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgICAgaWYgKHZhbCAmJiB2YWwudmFsdWVzLmxlbmd0aCAmJiB0aGlzLl9oZWFkZXJzID09IHVuZGVmaW5lZCkgeyBcbiAgICAgICAgdmFyIGhlYWRlcnMgPSBPYmplY3Qua2V5cyh2YWwudmFsdWVzWzBdKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4ge2tleTp4LHZhbHVlOnh9IH0pXG4gICAgICAgIHRoaXMuaGVhZGVycyhoZWFkZXJzKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlXG4gICAgfVxuICAsIHNraXBfb3B0aW9uOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJza2lwX29wdGlvblwiLHZhbCkgfVxuICAsIHdyYXBwZXJfY2xhc3M6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIndyYXBwZXJfY2xhc3NcIix2YWwpIH1cblxuXG4gICwgdGl0bGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9XG4gICwgcm93OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyZW5kZXJfcm93XCIsdmFsKSB9XG4gICwgZGVmYXVsdF9yZW5kZXJlcjogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGVmYXVsdF9yZW5kZXJlclwiLHZhbCkgfVxuICAsIHRvcDogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidG9wXCIsdmFsKSB9XG5cbiAgLCBoZWFkZXI6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInJlbmRlcl9oZWFkZXJcIix2YWwpIH1cbiAgLCBoZWFkZXJzOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWFkZXJzXCIsdmFsKSB9XG4gICwgaGlkZGVuX2ZpZWxkczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGlkZGVuX2ZpZWxkc1wiLHZhbCkgfVxuICAsIGFsbF9oZWFkZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBoZWFkZXJzID0gdGhpcy5oZWFkZXJzKCkucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMudmFsdWU7IHJldHVybiBwfSx7fSlcbiAgICAgICAgLCBpc19sb2NrZWQgPSB0aGlzLmhlYWRlcnMoKS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4gISF4LmxvY2tlZCB9KS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcblxuICAgICAgaWYgKHRoaXMuX2RhdGEudmFsdWVzICYmIHRoaXMuX2RhdGEudmFsdWVzLmxlbmd0aCkge1xuICAgICAgICBcbiAgICAgICAgdmFyIGFsbF9oZWFkcyA9IE9iamVjdC5rZXlzKHRoaXMuX2RhdGEudmFsdWVzWzBdKS5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgICBpZiAodGhpcy5faGlkZGVuX2ZpZWxkcyAmJiB0aGlzLl9oaWRkZW5fZmllbGRzLmluZGV4T2YoeCkgPiAtMSkgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAga2V5OnhcbiAgICAgICAgICAgICwgdmFsdWU6aGVhZGVyc1t4XSB8fCB4XG4gICAgICAgICAgICAsIHNlbGVjdGVkOiAhIWhlYWRlcnNbeF1cbiAgICAgICAgICAgICwgbG9ja2VkOiAoaXNfbG9ja2VkLmluZGV4T2YoeCkgPiAtMSA/IHRydWUgOiB1bmRlZmluZWQpIFxuICAgICAgICAgIH0gXG4gICAgICAgIH0uYmluZCh0aGlzKSkuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSlcbiAgICAgICAgdmFyIGdldEluZGV4ID0gZnVuY3Rpb24oaykge1xuICAgICAgICAgIHJldHVybiBpc19sb2NrZWQuaW5kZXhPZihrKSA+IC0xID8gaXNfbG9ja2VkLmluZGV4T2YoaykgKyAxMCA6IDBcbiAgICAgICAgfVxuXG4gICAgICAgIGFsbF9oZWFkcyA9IGFsbF9oZWFkcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gZ2V0SW5kZXgoYy5rZXkgfHwgLUluZmluaXR5KSAtIGdldEluZGV4KHAua2V5IHx8IC1JbmZpbml0eSkgfSlcbiAgICAgICAgcmV0dXJuIGFsbF9oZWFkc1xuICAgICAgfVxuICAgICAgZWxzZSByZXR1cm4gdGhpcy5oZWFkZXJzKClcbiAgICB9XG4gICwgc29ydDogZnVuY3Rpb24oa2V5LGFzY2VuZGluZykge1xuICAgICAgaWYgKCFrZXkpIHJldHVybiB0aGlzLl9zb3J0XG4gICAgICB0aGlzLl9zb3J0ID0ge1xuICAgICAgICAgIGtleToga2V5XG4gICAgICAgICwgdmFsdWU6ICEhYXNjZW5kaW5nXG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAsIHJlbmRlcl93cmFwcGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gdGhpcy5fdGFyZ2V0XG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLlwiK3RoaXMuX3dyYXBwZXJfY2xhc3MsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQodGhpcy5fd3JhcHBlcl9jbGFzcyx0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwicmVsYXRpdmVcIilcblxuXG4gICAgICB2YXIgdGFibGUgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCJ0YWJsZS5tYWluXCIsXCJ0YWJsZVwiKVxuICAgICAgICAuY2xhc3NlZChcIm1haW5cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuXG4gICAgICB0aGlzLl90YWJsZV9tYWluID0gdGFibGVcblxuICAgICAgdmFyIHRoZWFkID0gZDNfdXBkYXRlYWJsZSh0YWJsZSxcInRoZWFkXCIsXCJ0aGVhZFwiKVxuICAgICAgZDNfdXBkYXRlYWJsZSh0YWJsZSxcInRib2R5XCIsXCJ0Ym9keVwiKVxuXG5cblxuICAgICAgdmFyIHRhYmxlX2ZpeGVkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwidGFibGUuZml4ZWRcIixcInRhYmxlXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIHRydWUpIC8vIFRPRE86IG1ha2UgdGhpcyB2aXNpYmxlIHdoZW4gbWFpbiBpcyBub3QgaW4gdmlld1xuICAgICAgICAuY2xhc3NlZChcImZpeGVkXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIix3cmFwcGVyLnN0eWxlKFwid2lkdGhcIikpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLHRoaXMuX3RvcCArIFwicHhcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG5cbiAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgdHJ5IHtcbiAgICAgIGQzLnNlbGVjdCh3aW5kb3cpLm9uKCdzY3JvbGwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2codGFibGUubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCwgc2VsZi5fdG9wKVxuICAgICAgICBpZiAodGFibGUubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCA8IHNlbGYuX3RvcCkgdGFibGVfZml4ZWQuY2xhc3NlZChcImhpZGRlblwiLGZhbHNlKVxuICAgICAgICBlbHNlIHRhYmxlX2ZpeGVkLmNsYXNzZWQoXCJoaWRkZW5cIix0cnVlKVxuXG4gICAgICAgIHZhciB3aWR0aHMgPSBbXVxuXG4gICAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLm1haW5cIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwiLnRhYmxlLWhlYWRlcnNcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwidGhcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgIHdpZHRocy5wdXNoKHRoaXMub2Zmc2V0V2lkdGgpXG4gICAgICAgICAgfSlcblxuICAgICAgICB3cmFwLnNlbGVjdEFsbChcIi5maXhlZFwiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCIudGFibGUtaGVhZGVyc1wiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCJ0aFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwid2lkdGhcIix3aWR0aHNbaV0gKyBcInB4XCIpXG4gICAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICB9KVxuICAgICAgfSBjYXRjaChlKSB7fVxuICAgICAgIFxuXG4gICAgICB0aGlzLl90YWJsZV9maXhlZCA9IHRhYmxlX2ZpeGVkXG5cblxuICAgICAgdmFyIHRoZWFkID0gZDNfdXBkYXRlYWJsZSh0YWJsZV9maXhlZCxcInRoZWFkXCIsXCJ0aGVhZFwiKVxuXG4gICAgICBpZiAoIXRoaXMuX3NraXBfb3B0aW9uKSB7XG4gICAgICAgIHZhciB0YWJsZV9idXR0b24gPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIudGFibGUtb3B0aW9uXCIsXCJhXCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS1vcHRpb25cIix0cnVlKVxuICAgICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJhYnNvbHV0ZVwiKVxuICAgICAgICAgIC5zdHlsZShcInRvcFwiLFwiLTFweFwiKVxuICAgICAgICAgIC5zdHlsZShcInJpZ2h0XCIsXCIwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIixcInBvaW50ZXJcIilcbiAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKVxuICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1yaWdodFwiLFwiOHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCI4cHhcIilcbiAgICAgICAgICAudGV4dChcIk9QVElPTlNcIilcbiAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZTNlYmYwXCIpXG4gICAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIsIXRoaXMuX29wdGlvbnNfaGVhZGVyLmNsYXNzZWQoXCJoaWRkZW5cIikpXG4gICAgICAgICAgICB0aGlzLl9zaG93X29wdGlvbnMgPSAhdGhpcy5fb3B0aW9uc19oZWFkZXIuY2xhc3NlZChcImhpZGRlblwiKVxuICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHdyYXBwZXJcbiAgICB9ICBcbiAgLCByZW5kZXJfaGVhZGVyOiBmdW5jdGlvbih0YWJsZSkge1xuXG4gICAgICB2YXIgdGhlYWQgPSB0YWJsZS5zZWxlY3RBbGwoXCJ0aGVhZFwiKVxuICAgICAgICAsIHRib2R5ID0gdGFibGUuc2VsZWN0QWxsKFwidGJvZHlcIilcblxuICAgICAgaWYgKHRoaXMuaGVhZGVycygpID09IHVuZGVmaW5lZCkgcmV0dXJuXG5cbiAgICAgIHZhciBvcHRpb25zX3RoZWFkID0gZDNfdXBkYXRlYWJsZSh0aGVhZCxcInRyLnRhYmxlLW9wdGlvbnNcIixcInRyXCIsdGhpcy5hbGxfaGVhZGVycygpLGZ1bmN0aW9uKHgpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsICF0aGlzLl9zaG93X29wdGlvbnMpXG4gICAgICAgIC5jbGFzc2VkKFwidGFibGUtb3B0aW9uc1wiLHRydWUpXG5cbiAgICAgIHZhciBoID0gdGhpcy5fc2tpcF9vcHRpb24gPyB0aGlzLmhlYWRlcnMoKSA6IHRoaXMuaGVhZGVycygpLmNvbmNhdChbe2tleTpcInNwYWNlclwiLCB3aWR0aDpcIjcwcHhcIn1dKVxuICAgICAgdmFyIGhlYWRlcnNfdGhlYWQgPSBkM191cGRhdGVhYmxlKHRoZWFkLFwidHIudGFibGUtaGVhZGVyc1wiLFwidHJcIixoLGZ1bmN0aW9uKHgpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwidGFibGUtaGVhZGVyc1wiLHRydWUpXG5cblxuICAgICAgdmFyIHRoID0gZDNfc3BsYXQoaGVhZGVyc190aGVhZCxcInRoXCIsXCJ0aFwiLGZhbHNlLGZ1bmN0aW9uKHgsaSkge3JldHVybiB4LmtleSArIGkgfSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LndpZHRoIH0pXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJyZWxhdGl2ZVwiKVxuICAgICAgICAub3JkZXIoKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodGgsXCJzcGFuXCIsXCJzcGFuXCIpXG4gICAgICAgIC5jbGFzc2VkKFwidGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIixcInBvaW50ZXJcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBpZiAoeC5zb3J0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgZGVsZXRlIHhbJ3NvcnQnXVxuICAgICAgICAgICAgdGhpcy5fc29ydCA9IHt9XG4gICAgICAgICAgICB0aGlzLmRyYXcoKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4LnNvcnQgPSAhIXguc29ydFxuXG4gICAgICAgICAgICB0aGlzLnNvcnQoeC5rZXkseC5zb3J0KVxuICAgICAgICAgICAgdGhpcy5kcmF3KClcbiAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKSlcblxuICAgICAgZDNfdXBkYXRlYWJsZSh0aCxcImlcIixcImlcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCI1cHhcIilcbiAgICAgICAgLmNsYXNzZWQoXCJmYVwiLHRydWUpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEtc29ydC1hc2NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4gKHgua2V5ID09IHRoaXMuX3NvcnQua2V5KSA/IHRoaXMuX3NvcnQudmFsdWUgPT09IHRydWUgOiB1bmRlZmluZWQgfS5iaW5kKHRoaXMpKVxuICAgICAgICAuY2xhc3NlZChcImZhLXNvcnQtZGVzY1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiAoeC5rZXkgPT0gdGhpcy5fc29ydC5rZXkpID8gdGhpcy5fc29ydC52YWx1ZSA9PT0gZmFsc2UgOiB1bmRlZmluZWQgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2FuX3JlZHJhdyA9IHRydWVcblxuICAgICAgdmFyIGRyYWcgPSBkMy5iZWhhdmlvci5kcmFnKClcbiAgICAgICAgLm9uKFwiZHJhZ1wiLCBmdW5jdGlvbihkLGkpIHtcbiAgICAgICAgICAgIHZhciB4ID0gZDMuZXZlbnQuZHhcbiAgICAgICAgICAgIHZhciB3ID0gcGFyc2VJbnQoZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc3R5bGUoXCJ3aWR0aFwiKS5yZXBsYWNlKFwicHhcIikpXG4gICAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuX19kYXRhX18ud2lkdGggPSAodyt4KStcInB4XCJcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnN0eWxlKFwid2lkdGhcIiwgKHcreCkrXCJweFwiKVxuXG4gICAgICAgICAgICB2YXIgaW5kZXggPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbiwwKS5pbmRleE9mKHRoaXMucGFyZW50Tm9kZSkgKyAxXG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW5baW5kZXhdKS5zdHlsZShcIndpZHRoXCIsdW5kZWZpbmVkKVxuXG4gICAgICAgICAgICBpZiAoY2FuX3JlZHJhdykge1xuICAgICAgICAgICAgICBjYW5fcmVkcmF3ID0gZmFsc2VcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjYW5fcmVkcmF3ID0gdHJ1ZVxuICAgICAgICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgICB2YXIgcmVuZGVyID0gc2VsZi5fcmVuZGVyZXJzW3gua2V5XVxuICAgICAgICAgICAgICAgICAgaWYgKHJlbmRlcikgcmVuZGVyLmJpbmQodGhpcykoeClcbiAgICBcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgIH0sMSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcblxuICAgICAgdmFyIGRyYWdnYWJsZSA9IGQzX3VwZGF0ZWFibGUodGgsXCJiXCIsXCJiXCIpXG4gICAgICAgIC5zdHlsZShcImN1cnNvclwiLCBcImV3LXJlc2l6ZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIiwgXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLCBcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIiwgXCJhYnNvbHV0ZVwiKVxuICAgICAgICAuc3R5bGUoXCJyaWdodFwiLCBcIi04cHhcIilcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsIFwiMFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLCBcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiei1pbmRleFwiLCAxKVxuICAgICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbigpe1xuICAgICAgICAgICB2YXIgaW5kZXggPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbiwwKS5pbmRleE9mKHRoaXMucGFyZW50Tm9kZSkgKyAxXG4gICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuc3R5bGUoXCJib3JkZXItcmlnaHRcIixcIjFweCBkb3R0ZWQgI2NjY1wiKVxuICAgICAgICB9KVxuICAgICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLDApLmluZGV4T2YodGhpcy5wYXJlbnROb2RlKSArIDFcbiAgICAgICAgICAgdGJvZHkuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bnRoLW9mLXR5cGUoXCIgKyBpbmRleCArIFwiKVwiKS5zdHlsZShcImJvcmRlci1yaWdodFwiLHVuZGVmaW5lZClcbiAgICAgICAgfSlcbiAgICAgICAgLmNhbGwoZHJhZylcblxuICAgICAgdGguZXhpdCgpLnJlbW92ZSgpXG5cbiAgICAgIGlmICghdGhpcy5fc2tpcF9vcHRpb24pIHtcbiAgICAgIHZhciBvcHRpb25zID0gZDNfdXBkYXRlYWJsZShvcHRpb25zX3RoZWFkLFwidGhcIixcInRoXCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsdGhpcy5oZWFkZXJzKCkubGVuZ3RoKzEpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAgICAgXG4gICAgICB2YXIgb3B0aW9uID0gZDNfc3BsYXQob3B0aW9ucyxcIi5vcHRpb25cIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgIC5jbGFzc2VkKFwib3B0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG5cbiAgICAgIG9wdGlvbi5leGl0KCkucmVtb3ZlKClcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUob3B0aW9uLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgICAgLnByb3BlcnR5KFwiY2hlY2tlZFwiLGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgdGhpcy5jaGVja2VkID0geC5zZWxlY3RlZFxuICAgICAgICAgIHJldHVybiB4LnNlbGVjdGVkID8gXCJjaGVja2VkXCIgOiB1bmRlZmluZWQgXG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKFwiZGlzYWJsZWRcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LmxvY2tlZCB9KVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgeC5zZWxlY3RlZCA9IHRoaXMuY2hlY2tlZFxuICAgICAgICAgIGlmICh4LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICBzZWxmLmhlYWRlcnMoKS5wdXNoKHgpXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5kcmF3KClcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGluZGljZXMgPSBzZWxmLmhlYWRlcnMoKS5tYXAoZnVuY3Rpb24oeixpKSB7IHJldHVybiB6LmtleSA9PSB4LmtleSA/IGkgOiB1bmRlZmluZWQgIH0pIFxuICAgICAgICAgICAgLCBpbmRleCA9IGluZGljZXMuZmlsdGVyKGZ1bmN0aW9uKHopIHsgcmV0dXJuIHogfSkgfHwgMDtcblxuICAgICAgICAgIHNlbGYuaGVhZGVycygpLnNwbGljZShpbmRleCwxKVxuICAgICAgICAgIHNlbGYuZHJhdygpXG5cbiAgICAgICAgfSlcblxuICAgICAgZDNfdXBkYXRlYWJsZShvcHRpb24sXCJzcGFuXCIsXCJzcGFuXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFwiIFwiICsgeC52YWx1ZSB9KVxuXG4gICAgIH1cblxuXG4gICAgIHRoaXMuX29wdGlvbnNfaGVhZGVyID0gdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcIi50YWJsZS1vcHRpb25zXCIpXG4gICAgfVxuICBcbiAgLCByZW5kZXJfcm93czogZnVuY3Rpb24odGFibGUpIHtcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHRib2R5ID0gdGFibGUuc2VsZWN0QWxsKFwidGJvZHlcIilcblxuICAgICAgaWYgKHRoaXMuaGVhZGVycygpID09IHVuZGVmaW5lZCkgcmV0dXJuXG4gICAgICBpZiAoISh0aGlzLl9kYXRhICYmIHRoaXMuX2RhdGEudmFsdWVzICYmIHRoaXMuX2RhdGEudmFsdWVzLmxlbmd0aCkpIHJldHVyblxuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGEudmFsdWVzXG4gICAgICAgICwgc29ydGJ5ID0gdGhpcy5fc29ydCB8fCB7fTtcblxuICAgICAgZGF0YSA9IGRhdGEuc29ydChmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgdmFyIGEgPSBwW3NvcnRieS5rZXldIHx8IC1JbmZpbml0eVxuICAgICAgICAgICwgYiA9IGNbc29ydGJ5LmtleV0gfHwgLUluZmluaXR5XG5cbiAgICAgICAgcmV0dXJuIHNvcnRieS52YWx1ZSA/IGQzLmFzY2VuZGluZyhhLGIpIDogZDMuZGVzY2VuZGluZyhhLGIpXG4gICAgICB9KVxuXG4gICAgICB2YXIgcm93cyA9IGQzX3NwbGF0KHRib2R5LFwidHJcIixcInRyXCIsZGF0YSxmdW5jdGlvbih4LGkpeyByZXR1cm4gU3RyaW5nKHNvcnRieS5rZXkgKyB4W3NvcnRieS5rZXldKSArIGkgfSlcbiAgICAgICAgLm9yZGVyKClcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKHNlbGYub24oXCJleHBhbmRcIikgIT0gbm9vcCkge1xuICAgICAgICAgICAgdmFyIHRkID0gc2VsZi5fcmVuZGVyX2V4cGFuZC5iaW5kKHRoaXMpKHgpXG4gICAgICAgICAgICBzZWxmLm9uKFwiZXhwYW5kXCIpLmJpbmQodGhpcykoeCx0ZClcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICAgIHZhciB0ZCA9IGQzX3NwbGF0KHJvd3MsXCJ0ZFwiLFwidGRcIix0aGlzLmhlYWRlcnMoKSxmdW5jdGlvbih4LGkpIHtyZXR1cm4geC5rZXkgKyBpIH0pXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcblxuICAgICAgICAgIHZhciByZW5kZXJlciA9IHNlbGYuX3JlbmRlcmVyc1t4LmtleV1cblxuICAgICAgICAgIGlmICghcmVuZGVyZXIpIHsgXG4gICAgICAgICAgICByZW5kZXJlciA9IHNlbGYuX2RlZmF1bHRfcmVuZGVyZXIuYmluZCh0aGlzKSh4KSBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHJlbmRlcmVyLmJpbmQodGhpcykoeClcbiAgICAgICAgICB9XG5cblxuICAgICAgICB9KVxuXG4gICAgICAgIFxuXG4gICAgICB0ZC5leGl0KCkucmVtb3ZlKClcblxuICAgICAgdmFyIG8gPSBkM191cGRhdGVhYmxlKHJvd3MsXCJ0ZC5vcHRpb24taGVhZGVyXCIsXCJ0ZFwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwib3B0aW9uLWhlYWRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuIFxuICAgICAgaWYgKHRoaXMuX3NraXBfb3B0aW9uKSBvLmNsYXNzZWQoXCJoaWRkZW5cIix0cnVlKSBcblxuXG4gICAgICBkM191cGRhdGVhYmxlKG8sXCJhXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5odG1sKHNlbGYub3B0aW9uX3RleHQoKSlcbiAgICAgICAgXG5cblxuXG4gICAgfVxuICAsIG9wdGlvbl90ZXh0OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25fdGV4dFwiLHZhbCkgfVxuICAsIHJlbmRlcjogZnVuY3Rpb24oayxmbikge1xuICAgICAgaWYgKGZuID09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX3JlbmRlcmVyc1trXSB8fCBmYWxzZVxuICAgICAgdGhpcy5fcmVuZGVyZXJzW2tdID0gZm5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICB2YXIgd3JhcHBlciA9IHRoaXMucmVuZGVyX3dyYXBwZXIoKVxuXG4gICAgICB3cmFwcGVyLnNlbGVjdEFsbChcInRhYmxlXCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgc2VsZi5yZW5kZXJfaGVhZGVyKGQzLnNlbGVjdCh0aGlzKSkgXG4gICAgICAgIH0pXG5cbiAgICAgIHRoaXMucmVuZGVyX3Jvd3ModGhpcy5fdGFibGVfbWFpbilcblxuICAgICAgdGhpcy5vbihcImRyYXdcIikuYmluZCh0aGlzKSgpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZDM6IGQzXG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgJy4vc3VtbWFyeV90YWJsZS5jc3MnXG5pbXBvcnQge3RhYmxlfSBmcm9tICcuL3RhYmxlJ1xuXG5leHBvcnQgZnVuY3Rpb24gc3VtbWFyeV90YWJsZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTdW1tYXJ5VGFibGUodGFyZ2V0KVxufVxuXG5jbGFzcyBTdW1tYXJ5VGFibGUgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gICAgdGhpcy5fd3JhcHBlcl9jbGFzcyA9IFwidGFibGUtc3VtbWFyeS13cmFwcGVyXCJcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1widGl0bGVcIiwgXCJoZWFkZXJzXCIsIFwiZGF0YVwiLCBcIndyYXBwZXJfY2xhc3NcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgdmFyIHVybHNfc3VtbWFyeSA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcInN1bW1hcnktdGFibGVcIilcbiAgICAgIFxuICAgIGQzX2NsYXNzKHVybHNfc3VtbWFyeSxcInRpdGxlXCIpXG4gICAgICAudGV4dCh0aGlzLnRpdGxlKCkpXG5cbiAgICB2YXIgdXdyYXAgPSBkM19jbGFzcyh1cmxzX3N1bW1hcnksXCJ3cmFwXCIpXG5cblxuICAgIHRhYmxlKHV3cmFwKVxuICAgICAgLndyYXBwZXJfY2xhc3ModGhpcy53cmFwcGVyX2NsYXNzKCksdHJ1ZSlcbiAgICAgIC5kYXRhKHtcInZhbHVlc1wiOnRoaXMuZGF0YSgpfSlcbiAgICAgIC5za2lwX29wdGlvbih0cnVlKVxuICAgICAgLmhlYWRlcnModGhpcy5oZWFkZXJzKCkpXG4gICAgICAuZHJhdygpXG5cbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtmaWx0ZXJ9IGZyb20gJ2ZpbHRlcidcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBGaWx0ZXJWaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuXG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG4gIHRoaXMuX2ZpbHRlcl9vcHRpb25zID0ge1xuICAgICAgXCJDYXRlZ29yeVwiOiBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCJcbiAgICAsIFwiVGl0bGVcIjogXCJ1cmxcIlxuICAgICwgXCJUaW1lXCI6IFwiaG91clwiXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZmlsdGVyX3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRmlsdGVyVmlldyh0YXJnZXQpXG59XG5cbkZpbHRlclZpZXcucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgbG9naWM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsb2dpY1wiLHZhbCkgXG4gICAgfVxuICAsIGNhdGVnb3JpZXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjYXRlZ29yaWVzXCIsdmFsKSBcbiAgICB9XG4gICwgZmlsdGVyczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImZpbHRlcnNcIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIFxuICAgICAgdmFyIHdyYXBwZXIgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmZpbHRlci13cmFwXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiZmlsdGVyLXdyYXBcIix0cnVlKVxuXG4gICAgICBoZWFkZXIod3JhcHBlcilcbiAgICAgICAgLnRleHQoXCJGaWx0ZXJcIilcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICB2YXIgc3VidGl0bGUgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsIFwiLnN1YnRpdGxlLWZpbHRlclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwic3VidGl0bGUtZmlsdGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCIgdXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCIgYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiIDMzcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiICNlM2ViZjBcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdWJ0aXRsZSxcInNwYW4uZmlyc3RcIixcInNwYW5cIilcbiAgICAgICAgLnRleHQoXCJVc2VycyBtYXRjaGluZyBcIiApXG4gICAgICAgIC5jbGFzc2VkKFwiZmlyc3RcIix0cnVlKVxuICAgIFxuICAgICAgdmFyIGZpbHRlcl90eXBlICA9IGQzX3VwZGF0ZWFibGUoc3VidGl0bGUsXCJzcGFuLm1pZGRsZVwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcIm1pZGRsZVwiLHRydWUpXG4gICAgXG4gICAgICBzZWxlY3QoZmlsdGVyX3R5cGUpXG4gICAgICAgIC5vcHRpb25zKHRoaXMubG9naWMoKSlcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB0aGlzLmxvZ2ljKCkubWFwKGZ1bmN0aW9uKHkpIHsgXG4gICAgICAgICAgICB5LnNlbGVjdGVkID0gKHkua2V5ID09IHgua2V5KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgdGhpcy5vbihcImxvZ2ljLmNoYW5nZVwiKSh0aGlzLmxvZ2ljKCkpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgLmRyYXcoKVxuICAgICAgXG4gICAgICBkM191cGRhdGVhYmxlKHN1YnRpdGxlLFwic3Bhbi5sYXN0XCIsXCJzcGFuXCIpXG4gICAgICAgIC50ZXh0KFwiIG9mIHRoZSBmb2xsb3dpbmc6XCIpXG4gICAgICAgIC5jbGFzc2VkKFwibGFzdFwiLHRydWUpXG5cblxuICAgICAgLy8gLS0tLS0tLS0gQ0FURUdPUklFUyAtLS0tLS0tLS0gLy9cblxuICAgICAgdmFyIGNhdGVnb3JpZXMgPSB0aGlzLmNhdGVnb3JpZXMoKVxuICAgICAgdmFyIGZpbHRlcl9jaGFuZ2UgPSB0aGlzLm9uKFwiZmlsdGVyLmNoYW5nZVwiKS5iaW5kKHRoaXMpXG5cbiAgICAgIGZ1bmN0aW9uIHNlbGVjdGl6ZUlucHV0KGZpbHRlcix2YWx1ZSkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgICAgICAucHJvcGVydHkoXCJ2YWx1ZVwiLHZhbHVlLnZhbHVlKVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgZGVzdHJveSA9IGQzLnNlbGVjdCh0aGlzKS5vbihcImRlc3Ryb3lcIilcbiAgICAgICAgICAgIGlmIChkZXN0cm95KSBkZXN0cm95KClcbiAgICAgICAgICB9KVxuXG5cbiAgICAgICAgdmFyIHMgPSAkKHNlbGVjdC5ub2RlKCkpLnNlbGVjdGl6ZSh7XG4gICAgICAgICAgcGVyc2lzdDogZmFsc2UsXG4gICAgICAgICAgY3JlYXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gKHZhbHVlLnZhbHVlID8gdmFsdWUudmFsdWUgKyBcIixcIiA6IFwiXCIpICsgeFxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHZhbHVlOiB4LCB0ZXh0OiB4XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkRlbGV0ZTogZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHZhbHVlLnZhbHVlLnNwbGl0KFwiLFwiKS5maWx0ZXIoZnVuY3Rpb24oeikgeyByZXR1cm4geiAhPSB4WzBdfSkuam9pbihcIixcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB2YWx1ZTogeCwgdGV4dDogeFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLm9uKFwiZGVzdHJveVwiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc1swXS5zZWxlY3RpemUuZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBzZWxlY3RpemVTZWxlY3QoZmlsdGVyLHZhbHVlKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpLnJlbW92ZSgpXG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciBkZXN0cm95ID0gZDMuc2VsZWN0KHRoaXMpLm9uKFwiZGVzdHJveVwiKVxuICAgICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICAgIH0pXG5cblxuXG4gICAgXG4gICAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcInNlbGVjdC52YWx1ZVwiLFwic2VsZWN0XCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZVwiLHRydWUpXG4gICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtYXgtd2lkdGhcIixcIjUwMHB4XCIpXG4gICAgICAgICAgLmF0dHIoXCJtdWx0aXBsZVwiLHRydWUpXG4gICAgICAgICAgLm9uKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSB0aGlzLnZhbHVlXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgIH0pXG4gICAgXG4gICAgICAgIGQzX3NwbGF0KHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIsY2F0ZWdvcmllcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgICAgIC5hdHRyKFwic2VsZWN0ZWRcIixmdW5jdGlvbih4KSB7IHJldHVybiB2YWx1ZS52YWx1ZSAmJiB2YWx1ZS52YWx1ZS5pbmRleE9mKHgua2V5KSA+IC0xID8gXCJzZWxlY3RlZFwiIDogdW5kZWZpbmVkIH0pXG4gICAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcblxuICAgICAgICB2YXIgcyA9ICQoc2VsZWN0Lm5vZGUoKSkuc2VsZWN0aXplKHtcbiAgICAgICAgICBwZXJzaXN0OiBmYWxzZSxcbiAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSB4LmpvaW4oXCIsXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLm9uKFwiZGVzdHJveVwiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc1swXS5zZWxlY3RpemUuZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuXG5cbiAgICBcbiAgICAgIH1cbiAgICBcbiAgICAgIHRoaXMuX2xvZ2ljX2ZpbHRlciA9IGZpbHRlcih3cmFwcGVyKVxuICAgICAgICAuZmllbGRzKE9iamVjdC5rZXlzKHRoaXMuX2ZpbHRlcl9vcHRpb25zKSlcbiAgICAgICAgLm9wcyhbXG4gICAgICAgICAgICBbe1wia2V5XCI6IFwiaXMgaW4uY2F0ZWdvcnlcIn0se1wia2V5XCI6IFwiaXMgbm90IGluLmNhdGVnb3J5XCJ9XVxuICAgICAgICAgICwgW3tcImtleVwiOiBcImNvbnRhaW5zLnNlbGVjdGl6ZVwifSwge1wia2V5XCI6XCJkb2VzIG5vdCBjb250YWluLnNlbGVjdGl6ZVwifV1cbiAgICAgICAgICAsIFt7XCJrZXlcIjogXCJlcXVhbHNcIn0sIHtcImtleVwiOlwiYmV0d2VlblwiLFwiaW5wdXRcIjoyfV1cbiAgICAgICAgXSlcbiAgICAgICAgLmRhdGEodGhpcy5maWx0ZXJzKCkpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJjb250YWlucy5zZWxlY3RpemVcIixzZWxlY3RpemVJbnB1dClcbiAgICAgICAgLnJlbmRlcl9vcChcImRvZXMgbm90IGNvbnRhaW4uc2VsZWN0aXplXCIsc2VsZWN0aXplSW5wdXQpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJpcyBpbi5jYXRlZ29yeVwiLHNlbGVjdGl6ZVNlbGVjdClcbiAgICAgICAgLnJlbmRlcl9vcChcImlzIG5vdCBpbi5jYXRlZ29yeVwiLHNlbGVjdGl6ZVNlbGVjdClcbiAgICAgICAgLnJlbmRlcl9vcChcImJldHdlZW5cIixmdW5jdGlvbihmaWx0ZXIsdmFsdWUpIHtcbiAgICAgICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBcbiAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHR5cGVvZih2YWx1ZS52YWx1ZSkgPT0gXCJvYmplY3RcIiA/IHZhbHVlLnZhbHVlIDogWzAsMjRdXG4gICAgXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dC52YWx1ZS5sb3dcIixcImlucHV0XCIpXG4gICAgICAgICAgICAuY2xhc3NlZChcInZhbHVlIGxvd1wiLHRydWUpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI5MHB4XCIpXG4gICAgICAgICAgICAuYXR0cihcInZhbHVlXCIsIHZhbHVlLnZhbHVlWzBdKVxuICAgICAgICAgICAgLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgIHZhciB0ID0gdGhpc1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHNlbGYudHlwZXdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlWzBdID0gdC52YWx1ZVxuICAgICAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICAgIH0sMTAwMClcbiAgICAgICAgICAgIH0pXG4gICAgXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJzcGFuLnZhbHVlLWFuZFwiLFwic3BhblwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZS1hbmRcIix0cnVlKVxuICAgICAgICAgICAgLnRleHQoXCIgYW5kIFwiKVxuICAgIFxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwiaW5wdXQudmFsdWUuaGlnaFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidmFsdWUgaGlnaFwiLHRydWUpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI5MHB4XCIpXG4gICAgICAgICAgICAuYXR0cihcInZhbHVlXCIsIHZhbHVlLnZhbHVlWzFdKVxuICAgICAgICAgICAgLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgIHZhciB0ID0gdGhpc1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHNlbGYudHlwZXdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlWzFdID0gdC52YWx1ZVxuICAgICAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICAgIH0sMTAwMClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcInVwZGF0ZVwiLGZ1bmN0aW9uKGZpbHRlcnMpe1xuICAgICAgICAgIGZpbHRlcl9jaGFuZ2UoZmlsdGVycylcbiAgICAgICAgfSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICAvL2QzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuZmlsdGVyLXdyYXAtc3BhY2VyXCIsXCJkaXZcIilcbiAgICAgIC8vICAuY2xhc3NlZChcImZpbHRlci13cmFwLXNwYWNlclwiLHRydWUpXG4gICAgICAvLyAgLnN0eWxlKFwiaGVpZ2h0XCIsd3JhcHBlci5zdHlsZShcImhlaWdodFwiKSlcblxuICAgICAgLy93cmFwcGVyXG4gICAgICAvLyAgLnN0eWxlKFwid2lkdGhcIix0aGlzLnRhcmdldC5zdHlsZShcIndpZHRoXCIpKVxuICAgICAgLy8gIC5zdHlsZShcInBvc2l0aW9uXCIsXCJmaXhlZFwiKVxuICAgICAgLy8gIC5zdHlsZShcInotaW5kZXhcIixcIjMwMFwiKVxuICAgICAgLy8gIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmMGY0ZjdcIilcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG5cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi9oZWFkZXInXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5leHBvcnQgZnVuY3Rpb24gQnV0dG9uUmFkaW8odGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYnV0dG9uX3JhZGlvKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEJ1dHRvblJhZGlvKHRhcmdldClcbn1cblxuQnV0dG9uUmFkaW8ucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24gKCkge1xuICBcbiAgICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuICAgICAgLm9wdGlvbnMtdmlldyB7IHRleHQtYWxpZ246cmlnaHQgfVxuICAgICAgLnNob3ctYnV0dG9uIHtcbiAgICAgIHdpZHRoOiAxNTBweDtcbiAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICAgIGxpbmUtaGVpZ2h0OiA0MHB4O1xuICAgICAgYm9yZGVyLXJhZGl1czogMTVweDtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNjY2M7XG4gICAgICBmb250LXNpemU6IDEycHg7XG4gICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xuICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7XG4gICAgICBkaXNwbGF5OmlubGluZS1ibG9jaztcbiAgICAgIG1hcmdpbi1yaWdodDoxNXB4O1xuICAgICAgICB9XG4gICAgICAuc2hvdy1idXR0b246aG92ZXIgeyB0ZXh0LWRlY29yYXRpb246bm9uZTsgY29sb3I6IzU1NSB9XG4gICAgICAuc2hvdy1idXR0b24uc2VsZWN0ZWQge1xuICAgICAgICBiYWNrZ3JvdW5kOiAjZTNlYmYwO1xuICAgICAgICBjb2xvcjogIzU1NTtcbiAgICAgIH1cbiAgICAqL30pXG4gIFxuICAgIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI3Nob3ctY3NzXCIsXCJzdHlsZVwiKVxuICAgICAgLmF0dHIoXCJpZFwiLFwiaGVhZGVyLWNzc1wiKVxuICAgICAgLnRleHQoQ1NTX1NUUklORy5yZXBsYWNlKFwiZnVuY3Rpb24gKCkgey8qXCIsXCJcIikucmVwbGFjZShcIiovfVwiLFwiXCIpKVxuICBcbiAgICB2YXIgb3B0aW9ucyA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuYnV0dG9uLXJhZGlvLXJvd1wiLFwiZGl2XCIpXG4gICAgICAuY2xhc3NlZChcImJ1dHRvbi1yYWRpby1yb3dcIix0cnVlKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMzVweFwiKVxuICBcbiAgXG4gICAgdmFyIGJ1dHRvbl9yb3cgPSBkM191cGRhdGVhYmxlKG9wdGlvbnMsXCIub3B0aW9ucy12aWV3XCIsXCJkaXZcIix0aGlzLmRhdGEoKSlcbiAgICAgIC5jbGFzc2VkKFwib3B0aW9ucy12aWV3XCIsdHJ1ZSlcblxuICAgIHZhciBib3VuZCA9IHRoaXMub24oXCJjbGlja1wiKS5iaW5kKHRoaXMpXG4gIFxuICAgIGQzX3NwbGF0KGJ1dHRvbl9yb3csXCIuc2hvdy1idXR0b25cIixcImFcIixpZGVudGl0eSwga2V5KVxuICAgICAgLmNsYXNzZWQoXCJzaG93LWJ1dHRvblwiLHRydWUpXG4gICAgICAuY2xhc3NlZChcInNlbGVjdGVkXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguc2VsZWN0ZWQgfSlcbiAgICAgIC50ZXh0KGtleSlcbiAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHsgYm91bmQoeCkgfSlcblxuICAgIHJldHVybiB0aGlzXG4gIFxuICAgIH1cbiAgXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZnVuY3Rpb24gT3B0aW9uVmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG9wdGlvbl92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IE9wdGlvblZpZXcodGFyZ2V0KVxufVxuXG5PcHRpb25WaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLm9wdGlvbi13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJvcHRpb24td3JhcFwiLHRydWUpXG5cbiAgICAgIC8vaGVhZGVyKHdyYXApXG4gICAgICAvLyAgLnRleHQoXCJDaG9vc2UgVmlld1wiKVxuICAgICAgLy8gIC5kcmF3KClcblxuICAgICAgYnV0dG9uX3JhZGlvKHdyYXApXG4gICAgICAgIC5vbihcImNsaWNrXCIsIHRoaXMub24oXCJzZWxlY3RcIikgKVxuICAgICAgICAuZGF0YSh0aGlzLmRhdGEoKSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IHthdXRvU2l6ZSBhcyBhdXRvU2l6ZX0gZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCB7cHJlcERhdGEgYXMgcH0gZnJvbSAnLi4vaGVscGVycyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmVwRGF0YSgpIHtcbiAgcmV0dXJuIHAuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufTtcblxudmFyIEVYQU1QTEVfREFUQSA9IHtcbiAgICBcImtleVwiOiBcIkJyb3dzaW5nIGJlaGF2aW9yIGJ5IHRpbWVcIlxuICAsIFwidmFsdWVzXCI6IFtcbiAgICAgIHsgIFxuICAgICAgICAgIFwia2V5XCI6IDFcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogMlxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAyLjI1XG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDIuNVxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAzXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0XG4gICAgICB9XG5cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiA0XG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuXG5cbiAgXSBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFRpbWVTZXJpZXModGFyZ2V0KSB7XG4gIHRoaXMuX3RhcmdldCA9IHRhcmdldDtcbiAgdGhpcy5fZGF0YSA9IEVYQU1QTEVfREFUQVxuICB0aGlzLl9vbiA9IHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRpbWVfc2VyaWVzKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFRpbWVTZXJpZXModGFyZ2V0KVxufVxuXG5UaW1lU2VyaWVzLnByb3RvdHlwZSA9IHtcblxuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHRpdGxlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfVxuICAsIGhlaWdodDogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVpZ2h0XCIsdmFsKSB9XG5cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gdGhpcy5fdGFyZ2V0XG4gICAgICB2YXIgZGVzYyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi52ZW5kb3ItZG9tYWlucy1iYXItZGVzY1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidmVuZG9yLWRvbWFpbnMtYmFyLWRlc2NcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuICAgICAgICAuZGF0dW0odGhpcy5fZGF0YSlcblxuICAgICAgdmFyIHdyYXBwZXIgPSBkM191cGRhdGVhYmxlKGRlc2MsXCIud1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwid1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuXG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgXG4gICAgICBcblxuICAgICAgd3JhcHBlci5lYWNoKGZ1bmN0aW9uKHJvdyl7XG5cbiAgICAgICAgdmFyIGRhdGEgPSByb3cudmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLmtleSAtIHAua2V5fSlcbiAgICAgICAgICAsIGNvdW50ID0gZGF0YS5sZW5ndGg7XG5cblxuICAgICAgICB2YXIgX3NpemVzID0gYXV0b1NpemUod3JhcHBlcixmdW5jdGlvbihkKXtyZXR1cm4gZCAtMTB9LCBmdW5jdGlvbihkKXtyZXR1cm4gc2VsZi5faGVpZ2h0IHx8IDYwIH0pLFxuICAgICAgICAgIGdyaWRTaXplID0gTWF0aC5mbG9vcihfc2l6ZXMud2lkdGggLyAyNCAvIDMpO1xuXG4gICAgICAgIHZhciB2YWx1ZUFjY2Vzc29yID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9XG4gICAgICAgICAgLCB2YWx1ZUFjY2Vzc29yMiA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUyIH1cbiAgICAgICAgICAsIGtleUFjY2Vzc29yID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfVxuXG4gICAgICAgIHZhciBzdGVwcyA9IEFycmF5LmFwcGx5KG51bGwsIEFycmF5KGNvdW50KSkubWFwKGZ1bmN0aW9uIChfLCBpKSB7cmV0dXJuIGkrMTt9KVxuXG4gICAgICAgIHZhciBfY29sb3JzID0gW1wiI2ZmZmZkOVwiLFwiI2VkZjhiMVwiLFwiI2M3ZTliNFwiLFwiIzdmY2RiYlwiLFwiIzQxYjZjNFwiLFwiIzFkOTFjMFwiLFwiIzIyNWVhOFwiLFwiIzI1MzQ5NFwiLFwiIzA4MWQ1OFwiXVxuICAgICAgICB2YXIgY29sb3JzID0gX2NvbG9yc1xuXG4gICAgICAgIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpLnJhbmdlKHN0ZXBzKVxuICAgICAgICAgICwgeSA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFtfc2l6ZXMuaGVpZ2h0LCAwIF0pXG5cblxuICAgICAgICB2YXIgY29sb3JTY2FsZSA9IGQzLnNjYWxlLnF1YW50aWxlKClcbiAgICAgICAgICAuZG9tYWluKFswLCBkMy5tYXgoZGF0YSwgZnVuY3Rpb24gKGQpIHsgcmV0dXJuIGQuZnJlcXVlbmN5OyB9KV0pXG4gICAgICAgICAgLnJhbmdlKGNvbG9ycyk7XG5cbiAgICAgICAgdmFyIHN2Z193cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwic3ZnXCIsXCJzdmdcIilcbiAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIF9zaXplcy53aWR0aCArIF9zaXplcy5tYXJnaW4ubGVmdCArIF9zaXplcy5tYXJnaW4ucmlnaHQpXG4gICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgX3NpemVzLmhlaWdodCArIF9zaXplcy5tYXJnaW4udG9wICsgX3NpemVzLm1hcmdpbi5ib3R0b20pXG5cbiAgICAgICAgdmFyIHN2ZyA9IGQzX3NwbGF0KHN2Z193cmFwLFwiZ1wiLFwiZ1wiLGZ1bmN0aW9uKHgpIHtyZXR1cm4gW3gudmFsdWVzXX0sZnVuY3Rpb24oXyxpKSB7cmV0dXJuIGl9KVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgX3NpemVzLm1hcmdpbi5sZWZ0ICsgXCIsXCIgKyAwICsgXCIpXCIpXG5cbiAgICAgICAgeC5kb21haW4oWzAsNzJdKTtcbiAgICAgICAgeS5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBNYXRoLnNxcnQodmFsdWVBY2Nlc3NvcihkKSk7IH0pXSk7XG5cbiAgICAgICAgdmFyIGJ1aWxkQmFycyA9IGZ1bmN0aW9uKGRhdGEsa2V5QWNjZXNzb3IsdmFsdWVBY2Nlc3Nvcix5LGMpIHtcblxuICAgICAgICAgIHZhciBiYXJzID0gZDNfc3BsYXQoc3ZnLCBcIi50aW1pbmctYmFyXCIgKyBjLCBcInJlY3RcIiwgZGF0YSwga2V5QWNjZXNzb3IpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidGltaW5nLWJhclwiICsgYylcbiAgICAgICAgICAgXG4gICAgICAgICAgYmFyc1xuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuICgoa2V5QWNjZXNzb3IoZCkgLSAxKSAqIGdyaWRTaXplICk7IH0pXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGdyaWRTaXplIC0gMSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7IFxuICAgICAgICAgICAgICByZXR1cm4geShNYXRoLnNxcnQoIHZhbHVlQWNjZXNzb3IoZCkgKSk7IFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLFwiI2FhYVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gY29sb3JTY2FsZSgga2V5QWNjZXNzb3IoeCkgKyBjICkgfHwgXCJncmV5XCIgfSApXG4gICAgICAgICAgICAvLy5hdHRyKFwic3Ryb2tlXCIsXCJ3aGl0ZVwiKVxuICAgICAgICAgICAgLy8uYXR0cihcInN0cm9rZS13aWR0aFwiLFwiMXB4XCIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBfc2l6ZXMuaGVpZ2h0IC0geShNYXRoLnNxcnQoIHZhbHVlQWNjZXNzb3IoZCkgKSk7IH0pXG4gICAgICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIxXCIpXG4gICAgICAgICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbih4KXsgXG4gICAgICAgICAgICAgIHNlbGYub24oXCJob3ZlclwiKS5iaW5kKHRoaXMpKHgpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIH1cbiAgICAgICAgXG5cbiAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5sZW5ndGggJiYgZGF0YVswXS52YWx1ZTIpIHtcbiAgICAgICAgICB2YXIgIHkyID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoW19zaXplcy5oZWlnaHQsIDAgXSlcbiAgICAgICAgICB5Mi5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBNYXRoLnNxcnQodmFsdWVBY2Nlc3NvcjIoZCkpOyB9KV0pO1xuICAgICAgICAgIGJ1aWxkQmFycyhkYXRhLGtleUFjY2Vzc29yLHZhbHVlQWNjZXNzb3IyLHkyLFwiLTJcIilcbiAgICAgICAgfVxuXG5cbiAgICAgICAgYnVpbGRCYXJzKGRhdGEsa2V5QWNjZXNzb3IsdmFsdWVBY2Nlc3Nvcix5LFwiXCIpXG4gICAgICBcbiAgICBcbiAgICAgIHZhciB6ID0gZDMudGltZS5zY2FsZSgpXG4gICAgICAgIC5yYW5nZShbMCwgZ3JpZFNpemUqMjQqM10pXG4gICAgICAgIC5uaWNlKGQzLnRpbWUuaG91ciwyNClcbiAgICAgICAgXG4gICAgXG4gICAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpXG4gICAgICAgIC5zY2FsZSh6KVxuICAgICAgICAudGlja3MoMylcbiAgICAgICAgLnRpY2tGb3JtYXQoZDMudGltZS5mb3JtYXQoXCIlSSAlcFwiKSk7XG4gICAgXG4gICAgICBzdmcuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ4IGF4aXNcIilcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLFwiICsgX3NpemVzLmhlaWdodCArIFwiKVwiKVxuICAgICAgICAgIC5jYWxsKHhBeGlzKTtcblxuXG5cbiAgICAgICAgXG4gICAgICB9KVxuXG5cbiAgICB9XG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM19zcGxhdCwgZDNfdXBkYXRlYWJsZSwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUYWJ1bGFySGVhZGVyIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuV0lEVEggPSAxNDRcbiAgICB0aGlzLl9sYWJlbCA9IFwiVVJMXCJcbiAgICB0aGlzLl9oZWFkZXJzID0gW1wiMTJhbVwiLCBcIjEycG1cIiwgXCIxMmFtXCJdXG4gICAgdGhpcy5feHMgPSBbMCx0aGlzLldJRFRILzIsdGhpcy5XSURUSF1cbiAgICB0aGlzLl9hbmNob3JzID0gW1wic3RhcnRcIixcIm1pZGRsZVwiLFwiZW5kXCJdXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImxhYmVsXCIsXCJoZWFkZXJzXCJdIH1cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIGV1aCA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcImV4cGFuc2lvbi11cmxzLXRpdGxlXCIpXG5cbiAgICBkM19jbGFzcyhldWgsXCJ0aXRsZVwiKS50ZXh0KHRoaXMubGFiZWwoKSlcbiAgICBkM19jbGFzcyhldWgsXCJ2aWV3XCIpLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhldWgsXCJsZWdlbmRcIixcInN2Z1wiKVxuXG4gICAgaWYgKHRoaXMuaGVhZGVycygpLmxlbmd0aCA9PSAyKSB7XG4gICAgICB0aGlzLl94cyA9IFt0aGlzLldJRFRILzItdGhpcy5XSURUSC80LHRoaXMuV0lEVEgvMit0aGlzLldJRFRILzRdXG4gICAgICB0aGlzLl9hbmNob3JzID0gW1wibWlkZGxlXCIsXCJtaWRkbGVcIl1cbiAgICB9XG5cbiAgICBkM19zcGxhdChzdmdfbGVnZW5kLFwidGV4dFwiLFwidGV4dFwiLHRoaXMuaGVhZGVycygpLCh4LGkpID0+IHsgcmV0dXJuIGkgfSlcbiAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgIC5hdHRyKFwieFwiLCh4LGkpID0+IHRoaXMuX3hzW2ldKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwoeCxpKSA9PiB0aGlzLl9hbmNob3JzW2ldKVxuICAgICAgLnRleHQoU3RyaW5nKVxuXG4gICAgZDNfc3BsYXQoc3ZnX2xlZ2VuZCxcImxpbmVcIixcImxpbmVcIix0aGlzLmhlYWRlcnMoKSwoeCxpKSA9PiB7IHJldHVybiBpIH0pXG4gICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgIC5hdHRyKFwieTFcIiwgdGhpcy5oZWFkZXJzKCkubGVuZ3RoID09IDIgPyAwIDogMjUpXG4gICAgICAuYXR0cihcInkyXCIsIDM1KVxuICAgICAgLmF0dHIoXCJ4MVwiLCh4LGkpID0+IHRoaXMuaGVhZGVycygpLmxlbmd0aCA9PSAyID8gdGhpcy5XSURUSC8yIDogdGhpcy5feHNbaV0pXG4gICAgICAuYXR0cihcIngyXCIsKHgsaSkgPT4gdGhpcy5oZWFkZXJzKCkubGVuZ3RoID09IDIgPyB0aGlzLldJRFRILzIgOiB0aGlzLl94c1tpXSlcblxuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gc2ltcGxlVGltZXNlcmllcyh0YXJnZXQsZGF0YSx3LGgpIHtcbiAgdmFyIHdpZHRoID0gdyB8fCAxMjBcbiAgICAsIGhlaWdodCA9IGggfHwgMzBcblxuICB2YXIgeCA9IGQzLnNjYWxlLm9yZGluYWwoKS5kb21haW4oZDMucmFuZ2UoMCxkYXRhLmxlbmd0aCkpLnJhbmdlKGQzLnJhbmdlKDAsd2lkdGgsd2lkdGgvZGF0YS5sZW5ndGgpKVxuICB2YXIgeSA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFs0LGhlaWdodF0pLmRvbWFpbihbZDMubWluKGRhdGEpLGQzLm1heChkYXRhKV0pXG5cbiAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImdcIixcImdcIixkYXRhLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gMX0pXG5cbiAgZDNfc3BsYXQod3JhcCxcInJlY3RcIixcInJlY3RcIix4ID0+IHgsICh4LGkpID0+IGkpXG4gICAgLmF0dHIoXCJ4XCIsKHosaSkgPT4geChpKSlcbiAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoL2RhdGEubGVuZ3RoIC0xLjIpXG4gICAgLmF0dHIoXCJ5XCIsIHogPT4gaGVpZ2h0IC0geSh6KSApXG4gICAgLmF0dHIoXCJoZWlnaHRcIiwgeiA9PiB6ID8geSh6KSA6IDApXG5cbiAgcmV0dXJuIHdyYXBcblxufVxuIiwiaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICcuL3NpbXBsZV90aW1lc2VyaWVzJ1xuaW1wb3J0IHtkM19jbGFzcywgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gYmVmb3JlX2FmdGVyX3RpbWVzZXJpZXModGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQmVmb3JlQWZ0ZXJUaW1lc2VyaWVzKHRhcmdldClcbn1cblxuY2xhc3MgQmVmb3JlQWZ0ZXJUaW1lc2VyaWVzIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcblxuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gICAgdGhpcy5fd3JhcHBlcl9jbGFzcyA9IFwiYmEtdGltZXNlcmllcy13cmFwXCJcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiLFwiYmVmb3JlXCIsXCJhZnRlclwiLFwid3JhcHBlcl9jbGFzc1wiXSB9XG5cbiAgZHJhdygpIHtcblxuICAgIGNvbnN0IHRzdyA9IDI1MFxuICAgICAgLCB1bml0X3NpemUgPSB0c3cvdGhpcy5kYXRhKCkubGVuZ3RoXG4gICAgICAsIGJlZm9yZV9wb3MgPSB0aGlzLmJlZm9yZSgpXG4gICAgICAsIGFmdGVyX3BvcyA9IHRoaXMuYWZ0ZXIoKVxuXG5cbiAgICBjb25zdCB0aW1lc2VyaWVzID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LHRoaXMud3JhcHBlcl9jbGFzcygpLFwic3ZnXCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJibG9ja1wiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCJhdXRvXCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIzMHB4XCIpXG4gICAgICAuYXR0cihcIndpZHRoXCIsdHN3ICsgXCJweFwiKVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIixcIjcwcHhcIilcblxuICAgIHNpbXBsZVRpbWVzZXJpZXModGltZXNlcmllcyx0aGlzLmRhdGEoKSx0c3cpXG5cbiAgICAvLyBhZGQgZGVjb3JhdGlvbnNcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJtaWRkbGVcIixcImxpbmVcIilcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgICAgLmF0dHIoXCJ5MlwiLCA1NSlcbiAgICAgIC5hdHRyKFwieDFcIiwgdHN3LzIpXG4gICAgICAuYXR0cihcIngyXCIsIHRzdy8yKVxuXG4gICAgZDNfY2xhc3ModGltZXNlcmllcyxcIm1pZGRsZS10ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInhcIiwgdHN3LzIpXG4gICAgICAuYXR0cihcInlcIiwgNjcpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAudGV4dChcIk9uLXNpdGVcIilcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJiZWZvcmVcIixcImxpbmVcIilcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgLmF0dHIoXCJ5MVwiLCAzOSlcbiAgICAgIC5hdHRyKFwieTJcIiwgNDUpXG4gICAgICAuYXR0cihcIngxXCIsIHVuaXRfc2l6ZSpiZWZvcmVfcG9zKVxuICAgICAgLmF0dHIoXCJ4MlwiLCB1bml0X3NpemUqYmVmb3JlX3BvcylcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJiZWZvcmUtdGV4dFwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ4XCIsIHVuaXRfc2l6ZSpiZWZvcmVfcG9zIC0gOClcbiAgICAgIC5hdHRyKFwieVwiLCA0OClcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC50ZXh0KFwiQ29uc2lkZXJhdGlvblwiKVxuXG4gICAgZDNfY2xhc3ModGltZXNlcmllcyxcIndpbmRvd1wiLFwibGluZVwiKVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAuYXR0cihcInkxXCIsIDQ1KVxuICAgICAgLmF0dHIoXCJ5MlwiLCA0NSlcbiAgICAgIC5hdHRyKFwieDFcIiwgdW5pdF9zaXplKihiZWZvcmVfcG9zKSlcbiAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkrMSlcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJhZnRlclwiLFwibGluZVwiKVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAuYXR0cihcInkxXCIsIDM5KVxuICAgICAgLmF0dHIoXCJ5MlwiLCA0NSlcbiAgICAgIC5hdHRyKFwieDFcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkpXG4gICAgICAuYXR0cihcIngyXCIsIHVuaXRfc2l6ZSooYWZ0ZXJfcG9zKzEpKVxuXG4gICAgZDNfY2xhc3ModGltZXNlcmllcyxcImFmdGVyLXRleHRcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwieFwiLCB1bml0X3NpemUqKGFmdGVyX3BvcysxKSArIDgpXG4gICAgICAuYXR0cihcInlcIiwgNDgpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwic3RhcnRcIilcbiAgICAgIC50ZXh0KFwiVmFsaWRhdGlvblwiKVxuXG5cblxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG59XG5cblxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIHNpbXBsZUJhcih3cmFwLHZhbHVlLHNjYWxlLGNvbG9yKSB7XG5cbiAgdmFyIGhlaWdodCA9IDIwXG4gICAgLCB3aWR0aCA9IHdyYXAuc3R5bGUoXCJ3aWR0aFwiKS5yZXBsYWNlKFwicHhcIixcIlwiKVxuXG4gIHZhciBjYW52YXMgPSBkM191cGRhdGVhYmxlKHdyYXAsXCJzdmdcIixcInN2Z1wiLFt2YWx1ZV0sZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLHdpZHRoK1wicHhcIilcbiAgICAuc3R5bGUoXCJoZWlnaHRcIixoZWlnaHQrXCJweFwiKVxuXG4gIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxIH0pXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnRcIilcbiAgXG4gIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4LGkpIHsgcmV0dXJuIGkgfSlcbiAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTQpXG4gICAgLmF0dHIoeyd4JzowLCd5JzowfSlcbiAgICAuc3R5bGUoJ2ZpbGwnLGNvbG9yKVxuICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiBzY2FsZSh4KSB9KVxuXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBkb21haW5fYnVsbGV0KHRhcmdldCkge1xuICByZXR1cm4gbmV3IERvbWFpbkJ1bGxldCh0YXJnZXQpXG59XG5cbi8vIGRhdGEgc2NoZW1hOiBbe3BvcF9wZXJjZW50LCBzYW1wbGVfcGVyY2VudF9ub3JtfVxuXG5jbGFzcyBEb21haW5CdWxsZXQgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbiAgfVxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIixcIm1heFwiXSB9XG5cbiAgZHJhdygpIHtcbiAgICB2YXIgd2lkdGggPSAodGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKS5yZXBsYWNlKFwicHhcIixcIlwiKSB8fCB0aGlzLm9mZnNldFdpZHRoKSAtIDUwXG4gICAgICAsIGhlaWdodCA9IDI4O1xuXG4gICAgdmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLnJhbmdlKFswLCB3aWR0aF0pXG4gICAgICAuZG9tYWluKFswLCB0aGlzLm1heCgpXSlcblxuICAgIGlmICh0aGlzLnRhcmdldC50ZXh0KCkpIHRoaXMudGFyZ2V0LnRleHQoXCJcIilcblxuICAgIHZhciBidWxsZXQgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmJ1bGxldFwiLFwiZGl2XCIsdGhpcy5kYXRhKCksZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmNsYXNzZWQoXCJidWxsZXRcIix0cnVlKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiM3B4XCIpXG5cbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZShidWxsZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLHdpZHRoKVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIixoZWlnaHQpXG4gIFxuICAgXG4gICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTFcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiYmFyLTFcIix0cnVlKVxuICAgICAgLmF0dHIoXCJ4XCIsMClcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24oZCkge3JldHVybiB4KGQucG9wX3BlcmNlbnQpIH0pXG4gICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG4gICAgICAuYXR0cihcImZpbGxcIixcIiM4ODhcIilcbiAgXG4gICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTJcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiYmFyLTJcIix0cnVlKVxuICAgICAgLmF0dHIoXCJ4XCIsMClcbiAgICAgIC5hdHRyKFwieVwiLGhlaWdodC80KVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbihkKSB7cmV0dXJuIHgoZC5zYW1wbGVfcGVyY2VudF9ub3JtKSB9KVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0LzIpXG4gICAgICAuYXR0cihcImZpbGxcIixcInJnYig4LCAyOSwgODgpXCIpXG5cbiAgICByZXR1cm4gdGhpcyBcbiAgfVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfc3BsYXQsIGQzX3VwZGF0ZWFibGUsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnY2hhcnQnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRhYnVsYXJCb2R5IGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJzcGxpdFwiXSB9XG5cbiAgZHJhdygpIHtcbiAgICBsZXQgZXhwYW5zaW9uX3JvdyA9IHRoaXMuX3RhcmdldFxuXG4gICAgdmFyIGV4cGFuc2lvbiA9IGQzX2NsYXNzKGV4cGFuc2lvbl9yb3csXCJleHBhbnNpb24tdXJsc1wiKVxuICAgICAgICAuY2xhc3NlZChcInNjcm9sbGJveFwiLHRydWUpXG5cbiAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG4gICAgdmFyIHVybF9yb3cgPSBkM19zcGxhdChleHBhbnNpb24sXCIudXJsLXJvd1wiLFwiZGl2XCIsdGhpcy5kYXRhKCkuc2xpY2UoMCw1MDApLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuY2xhc3NlZChcInVybC1yb3dcIix0cnVlKVxuXG4gICAgdmFyIHVybF9uYW1lID0gZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm5hbWVcIixcImRpdlwiKS5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG5cbiAgICBkM191cGRhdGVhYmxlKHVybF9uYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAuYXR0cihcInR5cGVcIixcImNoZWNrYm94XCIpXG4gICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgIH0pXG5cbiAgICBkM19jbGFzcyh1cmxfbmFtZSxcInVybFwiLFwiYVwiKVxuICAgICAgLnRleHQoeCA9PiB7IHJldHVybiB0aGlzLnNwbGl0KCkgPyB4LmtleS5zcGxpdCh0aGlzLnNwbGl0KCkpWzFdIHx8IHgua2V5IDogeC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiaHJlZlwiLCB4ID0+IHgudXJsID8geC51cmwgOiB1bmRlZmluZWQgKVxuICAgICAgLmF0dHIoXCJ0YXJnZXRcIiwgXCJfYmxhbmtcIilcblxuICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5udW1iZXJcIixcImRpdlwiKS5jbGFzc2VkKFwibnVtYmVyXCIsdHJ1ZSlcbiAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG90YWwgfSlcblxuXG4gICAgZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLnBsb3RcIixcInN2Z1wiKS5jbGFzc2VkKFwicGxvdFwiLHRydWUpXG4gICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICB2YXIgdmFsdWVzID0geC52YWx1ZXMgfHwgeC52YWx1ZVxuICAgICAgICBzaW1wbGVUaW1lc2VyaWVzKGR0aGlzLHZhbHVlcywxNDQsMjApXG4gICAgICB9KVxuXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3NwbGF0LCBkM191cGRhdGVhYmxlLCBhY2Nlc3NvciwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IFRhYnVsYXJIZWFkZXIgZnJvbSAnLi9oZWFkZXInXG5pbXBvcnQgVGFidWxhckJvZHkgZnJvbSAnLi9ib2R5J1xuXG5pbXBvcnQgJy4vdGFidWxhcl90aW1lc2VyaWVzLmNzcydcblxuZXhwb3J0IGZ1bmN0aW9uIHRhYnVsYXJfdGltZXNlcmllcyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBUYWJ1bGFyVGltZXNlcmllcyh0YXJnZXQpXG59XG5cbmNsYXNzIFRhYnVsYXJUaW1lc2VyaWVzIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuX2hlYWRlcnMgPSBbXCIxMmFtXCIsXCIxMnBtXCIsXCIxMmFtXCJdXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIixcImxhYmVsXCIsXCJzcGxpdFwiLFwiaGVhZGVyc1wiXSB9XG5cbiAgZHJhdygpIHtcbiAgICBsZXQgdGQgPSB0aGlzLl90YXJnZXRcblxuICAgIHZhciB0aXRsZV9yb3cgPSBkM19jbGFzcyh0ZCxcInRpdGxlLXJvd1wiKVxuICAgIHZhciBleHBhbnNpb25fcm93ID0gZDNfY2xhc3ModGQsXCJleHBhbnNpb24tcm93XCIpXG5cbiAgICB2YXIgaGVhZGVyID0gKG5ldyBUYWJ1bGFySGVhZGVyKHRpdGxlX3JvdykpXG4gICAgICAubGFiZWwodGhpcy5sYWJlbCgpKVxuICAgICAgLmhlYWRlcnModGhpcy5oZWFkZXJzKCkpXG4gICAgICAuZHJhdygpXG5cbiAgICB2YXIgYm9keSA9IChuZXcgVGFidWxhckJvZHkoZXhwYW5zaW9uX3JvdykpXG4gICAgICAuZGF0YSh0aGlzLmRhdGEoKSlcbiAgICAgIC5zcGxpdCh0aGlzLnNwbGl0KCkgfHwgZmFsc2UpXG4gICAgICAuZHJhdygpXG5cbiAgfVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfc3BsYXQsIGQzX3VwZGF0ZWFibGUsIGFjY2Vzc29yLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgJy4vZG9tYWluX2V4cGFuZGVkLmNzcydcblxuaW1wb3J0IHt0YWJ1bGFyX3RpbWVzZXJpZXN9IGZyb20gJy4vdGFidWxhcl90aW1lc2VyaWVzL2luZGV4J1xuXG5leHBvcnQgbGV0IGFsbGJ1Y2tldHMgPSBbXVxuZXhwb3J0IGNvbnN0IGhvdXJidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkubWFwKHggPT4gU3RyaW5nKHgpLmxlbmd0aCA+IDEgPyBTdHJpbmcoeCkgOiBcIjBcIiArIHgpXG5cbnZhciBtaW51dGVzID0gWzAsMjAsNDBdXG5leHBvcnQgY29uc3QgYnVja2V0cyA9IGQzLnJhbmdlKDAsMjQpLnJlZHVjZSgocCxjKSA9PiB7XG4gIG1pbnV0ZXMubWFwKHggPT4ge1xuICAgIHBbYyArIFwiOlwiICsgeF0gPSAwXG4gIH0pXG4gIGFsbGJ1Y2tldHMgPSBhbGxidWNrZXRzLmNvbmNhdChtaW51dGVzLm1hcCh6ID0+IGMgKyBcIjpcIiArIHopKVxuICByZXR1cm4gcFxufSx7fSlcblxuXG5leHBvcnQgY29uc3QgU1RPUFdPUkRTID0gW1widGhhdFwiLFwidGhpc1wiLFwid2hhdFwiLFwiYmVzdFwiLFwibW9zdFwiLFwiZnJvbVwiLFwieW91clwiLFwiaGF2ZVwiLFwiZmlyc3RcIixcIndpbGxcIixcInRoYW5cIixcInNheXNcIixcImxpa2VcIixcImludG9cIixcImFmdGVyXCIsXCJ3aXRoXCJdXG5cbmZ1bmN0aW9uIHJhd1RvVXJsKGRhdGEpIHtcbiAgcmV0dXJuIGRhdGEucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIHBbYy51cmxdID0gcFtjLnVybF0gfHwgT2JqZWN0LmFzc2lnbih7fSxidWNrZXRzKVxuICAgICAgcFtjLnVybF1bYy5ob3VyXSA9IChwW2MudXJsXVtjLmhvdXJdIHx8IDApICsgYy5jb3VudFxuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KVxufVxuXG5mdW5jdGlvbiB1cmxUb0RyYXcodXJscykge1xuICB2YXIgb2JqID0ge31cbiAgT2JqZWN0LmtleXModXJscykubWFwKGsgPT4ge1xuICAgIG9ialtrXSA9IGhvdXJidWNrZXRzLm1hcChiID0+IHVybHNba11bYl0gfHwgMClcbiAgfSlcblxuICByZXR1cm4gZDMuZW50cmllcyhvYmopXG4gICAgLm1hcChmdW5jdGlvbih4KXtcbiAgICAgIHgudXJsID0geC5rZXlcbiAgICAgIHgudG90YWwgPSBkMy5zdW0oeC52YWx1ZSlcbiAgICAgIHJldHVybiB4XG4gICAgfSkgXG59XG5cbmZ1bmN0aW9uIGRyYXdUb0tleXdvcmQoZHJhdyxzcGxpdCkge1xuICBsZXQgb2JqID0gZHJhd1xuICAgIC5yZWR1Y2UoZnVuY3Rpb24ocCxjKXtcbiAgICAgIGMua2V5LnRvTG93ZXJDYXNlKCkuc3BsaXQoc3BsaXQpWzFdLnNwbGl0KFwiL1wiKS5yZXZlcnNlKClbMF0ucmVwbGFjZShcIl9cIixcIi1cIikuc3BsaXQoXCItXCIpLm1hcCh4ID0+IHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IFNUT1BXT1JEU1xuICAgICAgICBpZiAoeC5tYXRjaCgvXFxkKy9nKSA9PSBudWxsICYmIHZhbHVlcy5pbmRleE9mKHgpID09IC0xICYmIHguaW5kZXhPZihcIixcIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiP1wiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCIuXCIpID09IC0xICYmIHguaW5kZXhPZihcIjpcIikgPT0gLTEgJiYgcGFyc2VJbnQoeCkgIT0geCAmJiB4Lmxlbmd0aCA+IDMpIHtcbiAgICAgICAgICBwW3hdID0gcFt4XSB8fCB7fVxuICAgICAgICAgIE9iamVjdC5rZXlzKGMudmFsdWUpLm1hcChxID0+IHsgcFt4XVtxXSA9IChwW3hdW3FdIHx8IDApICsgKGMudmFsdWVbcV0gfHwgMCkgfSlcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KSBcblxuICByZXR1cm4gZDMuZW50cmllcyhvYmopXG4gICAgLm1hcCh4ID0+IHtcbiAgICAgIHgudmFsdWVzID0gT2JqZWN0LmtleXMoeC52YWx1ZSkubWFwKHogPT4geC52YWx1ZVt6XSB8fCAwKVxuICAgICAgeC50b3RhbCA9IGQzLnN1bSh4LnZhbHVlcylcbiAgICAgIHJldHVybiB4XG4gICAgfSlcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gZG9tYWluX2V4cGFuZGVkKHRhcmdldCkge1xuICByZXR1cm4gbmV3IERvbWFpbkV4cGFuZGVkKHRhcmdldClcbn1cblxuY2xhc3MgRG9tYWluRXhwYW5kZWQgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcInJhd1wiLFwiZGF0YVwiLFwidXJsc1wiLFwiZG9tYWluXCJdIH1cblxuICBkcmF3KCkge1xuICAgIGxldCB0ZCA9IHRoaXMuX3RhcmdldFxuXG4gICAgZDNfY2xhc3ModGQsXCJhY3Rpb24taGVhZGVyXCIpXG4gICAgICAudGV4dChcIkV4cGxvcmUgYW5kIFJlZmluZVwiKVxuXG4gICAgbGV0IHVybERhdGEgPSByYXdUb1VybCh0aGlzLnJhdygpKVxuICAgIGxldCB0b19kcmF3ID0gdXJsVG9EcmF3KHVybERhdGEpXG4gICAgbGV0IGt3X3RvX2RyYXcgPSBkcmF3VG9LZXl3b3JkKHRvX2RyYXcsdGhpcy5kb21haW4oKSlcblxuICAgIHRhYnVsYXJfdGltZXNlcmllcyhkM19jbGFzcyh0ZCxcInVybC1kZXB0aFwiKSlcbiAgICAgIC5sYWJlbChcIlVSTFwiKVxuICAgICAgLmRhdGEodG9fZHJhdylcbiAgICAgIC5zcGxpdCh0aGlzLmRvbWFpbigpKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdGFidWxhcl90aW1lc2VyaWVzKGQzX2NsYXNzKHRkLFwia3ctZGVwdGhcIikpXG4gICAgICAubGFiZWwoXCJLZXl3b3Jkc1wiKVxuICAgICAgLmRhdGEoa3dfdG9fZHJhdylcbiAgICAgIC5kcmF3KClcbiAgICAgICAgXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3NwbGF0LCBkM191cGRhdGVhYmxlLCBhY2Nlc3NvciwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0ICcuL3ZlcnRpY2FsX29wdGlvbi5jc3MnXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHZlcnRpY2FsX29wdGlvbih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBWZXJ0aWNhbE9wdGlvbih0YXJnZXQpXG59XG5cbi8vW3trZXksIHZhbHVlLCBzZWxlY3RlZH0sLi4uXVxuXG5jbGFzcyBWZXJ0aWNhbE9wdGlvbiBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vcHRpb25zID0gW11cbiAgICB0aGlzLl93cmFwcGVyX2NsYXNzID0gXCJ2ZXJ0aWNhbC1vcHRpb25zXCJcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wib3B0aW9uc1wiLFwid3JhcHBlcl9jbGFzc1wiXSB9XG5cbiAgZHJhdygpIHtcbiAgICB2YXIgb3B0cyA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCx0aGlzLndyYXBwZXJfY2xhc3MoKSxcImRpdlwiLHRoaXMub3B0aW9ucygpKVxuICAgICAgXG4gICAgIGQzX3NwbGF0KG9wdHMsXCIuc2hvdy1idXR0b25cIixcImFcIix0aGlzLm9wdGlvbnMoKSx4ID0+IHgua2V5KVxuICAgICAgLmNsYXNzZWQoXCJzaG93LWJ1dHRvblwiLHRydWUpXG4gICAgICAuY2xhc3NlZChcInNlbGVjdGVkXCIseCA9PiB4LnNlbGVjdGVkKVxuICAgICAgLnRleHQoeCA9PiB4LmtleSlcbiAgICAgIC5vbihcImNsaWNrXCIsdGhpcy5vbihcImNsaWNrXCIpICkgXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCB7cHJlcERhdGF9IGZyb20gJy4uL2dlbmVyaWMvdGltZXNlcmllcydcblxuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtkb21haW5fZXhwYW5kZWR9IGZyb20gJ2NvbXBvbmVudCdcbmltcG9ydCB7ZG9tYWluX2J1bGxldH0gZnJvbSAnY2hhcnQnXG5cblxuZXhwb3J0IGNsYXNzIERvbWFpblZpZXcgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIiwgXCJvcHRpb25zXCJdIH1cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICB2YXIgX2V4cGxvcmUgPSB0aGlzLl90YXJnZXRcbiAgICAgICwgdGFicyA9IHRoaXMub3B0aW9ucygpXG4gICAgICAsIGRhdGEgPSB0aGlzLmRhdGEoKVxuICAgICAgLCBmaWx0ZXJlZCA9IHRhYnMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5zZWxlY3RlZH0pXG4gICAgICAsIHNlbGVjdGVkID0gZmlsdGVyZWQubGVuZ3RoID8gZmlsdGVyZWRbMF0gOiB0YWJzWzBdXG5cbiAgICBjb25zdCBoZWFkZXJzID0gW1xuICAgICAgICAgIHtrZXk6XCJrZXlcIix2YWx1ZTogc2VsZWN0ZWQua2V5LnJlcGxhY2UoXCJUb3AgXCIsXCJcIiksbG9ja2VkOnRydWUsd2lkdGg6XCIyMDBweFwifVxuICAgICAgICAsIHtrZXk6XCJzYW1wbGVfcGVyY2VudFwiLHZhbHVlOlwiU2VnbWVudFwiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAsIHtrZXk6XCJyZWFsX3BvcF9wZXJjZW50XCIsdmFsdWU6XCJCYXNlbGluZVwiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAsIHtrZXk6XCJyYXRpb1wiLHZhbHVlOlwiUmF0aW9cIixzZWxlY3RlZDpmYWxzZX1cbiAgICAgICAgLCB7a2V5OlwiaW1wb3J0YW5jZVwiLHZhbHVlOlwiSW1wb3J0YW5jZVwiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAsIHtrZXk6XCJ2YWx1ZVwiLHZhbHVlOlwiU2VnbWVudCB2ZXJzdXMgQmFzZWxpbmVcIixsb2NrZWQ6dHJ1ZX1cbiAgICAgIF0vLy5maWx0ZXIoKHgpID0+ICEhc2VsZWN0ZWQudmFsdWVzWzBdW3gua2V5XSlcblxuICAgIGNvbnN0IHNhbXBfbWF4ID0gZDMubWF4KHNlbGVjdGVkLnZhbHVlcyxmdW5jdGlvbih4KXtyZXR1cm4geC5zYW1wbGVfcGVyY2VudF9ub3JtfSlcbiAgICAgICwgcG9wX21heCA9IGQzLm1heChzZWxlY3RlZC52YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHgucG9wX3BlcmNlbnR9KVxuICAgICAgLCBtYXggPSBNYXRoLm1heChzYW1wX21heCxwb3BfbWF4KTtcblxuXG4gICAgaGVhZGVyKF9leHBsb3JlKVxuICAgICAgLnRleHQoc2VsZWN0ZWQua2V5IClcbiAgICAgIC5vcHRpb25zKHRhYnMpXG4gICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCkgeyB0aGlzLm9uKFwic2VsZWN0XCIpKHgpIH0uYmluZCh0aGlzKSlcbiAgICAgIC5kcmF3KClcblxuICAgIF9leHBsb3JlLnNlbGVjdEFsbChcIi52ZW5kb3ItZG9tYWlucy1iYXItZGVzY1wiKS5yZW1vdmUoKVxuICAgIF9leHBsb3JlLmRhdHVtKGRhdGEpXG5cbiAgICB2YXIgdCA9IHRhYmxlKF9leHBsb3JlKVxuICAgICAgLnRvcCgxNDApXG4gICAgICAuZGF0YShzZWxlY3RlZClcbiAgICAgIC5oZWFkZXJzKCBoZWFkZXJzKVxuICAgICAgLnNvcnQoXCJpbXBvcnRhbmNlXCIpXG4gICAgICAub3B0aW9uX3RleHQoXCImIzY1MjkxO1wiKVxuICAgICAgLm9uKFwiZXhwYW5kXCIsZnVuY3Rpb24oZCx0ZCkge1xuXG4gICAgICAgIHZhciBkZCA9IHRoaXMucGFyZW50RWxlbWVudC5fX2RhdGFfXy5mdWxsX3VybHMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguZG9tYWluID09IGQua2V5fSlcbiAgICAgICAgdmFyIHJvbGxlZCA9IHByZXBEYXRhKGRkKVxuICAgICAgICBcbiAgICAgICAgZG9tYWluX2V4cGFuZGVkKHRkKVxuICAgICAgICAgIC5kb21haW4oZGRbMF0uZG9tYWluKVxuICAgICAgICAgIC5yYXcoZGQpXG4gICAgICAgICAgLmRhdGEocm9sbGVkKVxuICAgICAgICAgIC51cmxzKGQudXJscylcbiAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSh4KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmRyYXcoKVxuXG4gICAgICB9KVxuICAgICAgLmhpZGRlbl9maWVsZHMoW1widXJsc1wiLFwicGVyY2VudF91bmlxdWVcIixcInNhbXBsZV9wZXJjZW50X25vcm1cIixcInBvcF9wZXJjZW50XCIsXCJ0Zl9pZGZcIixcInBhcmVudF9jYXRlZ29yeV9uYW1lXCJdKVxuICAgICAgLnJlbmRlcihcInJhdGlvXCIsZnVuY3Rpb24oZCkge1xuICAgICAgICB0aGlzLmlubmVyVGV4dCA9IE1hdGgudHJ1bmModGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fLnJhdGlvKjEwMCkvMTAwICsgXCJ4XCJcbiAgICAgIH0pXG4gICAgICAucmVuZGVyKFwidmFsdWVcIixmdW5jdGlvbihkKSB7XG5cbiAgICAgICAgZG9tYWluX2J1bGxldChkMy5zZWxlY3QodGhpcykpXG4gICAgICAgICAgLm1heChtYXgpXG4gICAgICAgICAgLmRhdGEodGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fKVxuICAgICAgICAgIC5kcmF3KClcblxuICAgICAgfSlcbiAgICAgIFxuICAgIHQuZHJhdygpXG4gICAgXG5cbiAgICByZXR1cm4gdGhpc1xuXG4gIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkb21haW5fdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEb21haW5WaWV3KHRhcmdldClcbn1cblxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBidXR0b25fcmFkaW8gZnJvbSAnLi4vZ2VuZXJpYy9idXR0b25fcmFkaW8nXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4uL2dlbmVyaWMvc2VsZWN0J1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzLCBzaW1wbGVCYXJ9IGZyb20gJ2NoYXJ0J1xuXG5pbXBvcnQgKiBhcyB0YWJsZSBmcm9tICd0YWJsZSdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBTZWdtZW50Vmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2VnbWVudF92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNlZ21lbnRWaWV3KHRhcmdldClcbn1cblxuU2VnbWVudFZpZXcucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgc2VnbWVudHM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWdtZW50c1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuc2VnbWVudC13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzZWdtZW50LXdyYXBcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjE0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsdGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKSlcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIixcIjMwMFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjBmNGY3XCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5zZWdtZW50LXdyYXAtc3BhY2VyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzZWdtZW50LXdyYXAtc3BhY2VyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsd3JhcC5zdHlsZShcImhlaWdodFwiKSlcblxuXG4gICAgICBoZWFkZXIod3JhcClcbiAgICAgICAgLmJ1dHRvbnMoW1xuICAgICAgICAgICAge2NsYXNzOiBcInNhdmVkLXNlYXJjaFwiLCBpY29uOiBcImZhLWZvbGRlci1vcGVuLW8gZmFcIiwgdGV4dDogXCJPcGVuIFNhdmVkXCJ9XG4gICAgICAgICAgLCB7Y2xhc3M6IFwibmV3LXNhdmVkLXNlYXJjaFwiLCBpY29uOiBcImZhLWJvb2ttYXJrIGZhXCIsIHRleHQ6IFwiU2F2ZVwifVxuICAgICAgICAgICwge2NsYXNzOiBcImNyZWF0ZVwiLCBpY29uOiBcImZhLXBsdXMtY2lyY2xlIGZhXCIsIHRleHQ6IFwiTmV3IFNlZ21lbnRcIn1cbiAgICAgICAgICAsIHtjbGFzczogXCJsb2dvdXRcIiwgaWNvbjogXCJmYS1zaWduLW91dCBmYVwiLCB0ZXh0OiBcIkxvZ291dFwifVxuICAgICAgICBdKVxuICAgICAgICAub24oXCJzYXZlZC1zZWFyY2guY2xpY2tcIiwgdGhpcy5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiKSlcbiAgICAgICAgLm9uKFwibG9nb3V0LmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyB3aW5kb3cubG9jYXRpb24gPSBcIi9sb2dvdXRcIiB9KVxuICAgICAgICAub24oXCJjcmVhdGUuY2xpY2tcIiwgZnVuY3Rpb24oKSB7IHdpbmRvdy5sb2NhdGlvbiA9IFwiL3NlZ21lbnRzXCIgfSlcbiAgICAgICAgLm9uKFwibmV3LXNhdmVkLXNlYXJjaC5jbGlja1wiLCB0aGlzLm9uKFwibmV3LXNhdmVkLXNlYXJjaC5jbGlja1wiKSlcbiAgICAgICAgLnRleHQoXCJTZWdtZW50XCIpLmRyYXcoKSAgICAgIFxuXG5cbiAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLmhlYWRlci1ib2R5XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIXRoaXMuX2lzX2xvYWRpbmcpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCItNDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCJub25lXCIpXG4gICAgICAgIC5odG1sKFwiPGltZyBzcmM9Jy9zdGF0aWMvaW1nL2dlbmVyYWwvbG9nby1zbWFsbC5naWYnIHN0eWxlPSdoZWlnaHQ6MTVweCcvPiBsb2FkaW5nLi4uXCIpXG5cblxuICAgICAgaWYgKHRoaXMuX2RhdGEgPT0gZmFsc2UpIHJldHVyblxuXG4gICAgICB2YXIgYm9keSA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5ib2R5XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJib2R5XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiY2xlYXJcIixcImJvdGhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4LWRpcmVjdGlvblwiLFwiY29sdW1uXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi0xNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgXG5cbiAgICAgIHZhciByb3cxID0gZDNfdXBkYXRlYWJsZShib2R5LFwiLnJvdy0xXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJyb3ctMVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIiwxKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcImZsZXgtZGlyZWN0aW9uXCIsXCJyb3dcIilcblxuICAgICAgdmFyIHJvdzIgPSBkM191cGRhdGVhYmxlKGJvZHksXCIucm93LTJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInJvdy0yXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLDEpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleC1kaXJlY3Rpb25cIixcInJvd1wiKVxuXG5cbiAgICAgIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUocm93MSxcIi5hY3Rpb24uaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyIGFjdGlvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgdmFyIGlubmVyX2Rlc2MgPSBkM191cGRhdGVhYmxlKHJvdzEsXCIuYWN0aW9uLmlubmVyLWRlc2NcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyLWRlc2MgYWN0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjBweFwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIsXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnRleHQoXCJDaG9vc2UgU2VnbWVudFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNlM2ViZjBcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcixcImRpdi5jb2xvclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY29sb3JcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjMDgxZDU4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuXG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIHNlbGVjdChpbm5lcilcbiAgICAgICAgLm9wdGlvbnModGhpcy5fc2VnbWVudHMpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiY2hhbmdlXCIpLmJpbmQodGhpcykoeClcbiAgICAgICAgfSlcbiAgICAgICAgLnNlbGVjdGVkKHRoaXMuX2FjdGlvbi52YWx1ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIFxuXG5cblxuICAgICAgdmFyIGNhbCA9IGQzX3VwZGF0ZWFibGUoaW5uZXIsXCJhLmZhLWNhbGVuZGFyXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEgZmEtY2FsZW5kYXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgY2Fsc2VsLm5vZGUoKVxuICAgICAgICB9KVxuXG4gICAgICBcbiAgICAgIHZhciBjYWxzZWwgPSBzZWxlY3QoY2FsKVxuICAgICAgICAub3B0aW9ucyhbe1wia2V5XCI6XCJUb2RheVwiLFwidmFsdWVcIjowfSx7XCJrZXlcIjpcIlllc3RlcmRheVwiLFwidmFsdWVcIjoxfSx7XCJrZXlcIjpcIjcgZGF5cyBhZ29cIixcInZhbHVlXCI6N31dKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZi5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgudmFsdWUpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9hY3Rpb25fZGF0ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG4gICAgICAgIC5fc2VsZWN0XG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiLjAxXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIm5vbmVcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCJub25lXCIpXG5cbiAgICAgIFxuXG4gICAgICB2YXIgaW5uZXIyID0gZDNfdXBkYXRlYWJsZShyb3cyLFwiLmNvbXBhcmlzb24uaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyIGNvbXBhcmlzb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcblxuICAgICAgdmFyIGlubmVyX2Rlc2MyID0gZDNfdXBkYXRlYWJsZShyb3cyLFwiLmNvbXBhcmlzb24tZGVzYy5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgY29tcGFyaXNvbi1kZXNjXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIwcHhcIilcblxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG5cbiAgICAgIC8vZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiaDNcIixcImgzXCIpXG4gICAgICAvLyAgLnRleHQoXCIoRmlsdGVycyBhcHBsaWVkIHRvIHRoaXMgc2VnbWVudClcIilcbiAgICAgIC8vICAuc3R5bGUoXCJtYXJnaW5cIixcIjEwcHhcIilcbiAgICAgIC8vICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgLy8gIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgLy8gIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAvLyAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgLy8gIC5zdHlsZShcImZsZXhcIixcIjFcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiLmJhci13cmFwLXRpdGxlXCIsXCJoM1wiKS5jbGFzc2VkKFwiYmFyLXdyYXAtdGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuXG5cbiAgICAgICAgLnRleHQoXCJ2aWV3c1wiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLXRpdGxlXCIsXCJoM1wiKS5jbGFzc2VkKFwiYmFyLXdyYXAtdGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuXG5cblxuICAgICAgICAudGV4dChcInZpZXdzXCIpXG5cblxuXG4gICAgICB2YXIgYmFyX3NhbXAgPSBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCJkaXYuYmFyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJhci13cmFwXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjhweFwiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCIuYmFyLXdyYXAtc3BhY2VcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtc3BhY2VcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KGQzLmZvcm1hdChcIixcIikodGhpcy5fZGF0YS52aWV3cy5zYW1wbGUpKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcIi5iYXItd3JhcC1vcHRcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtb3B0XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC8vLnRleHQoXCJhcHBseSBmaWx0ZXJzP1wiKVxuXG5cblxuICAgICAgdmFyIHhzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgIC5kb21haW4oWzAsTWF0aC5tYXgodGhpcy5fZGF0YS52aWV3cy5zYW1wbGUsIHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbildKVxuICAgICAgICAucmFuZ2UoWzAsYmFyX3NhbXAuc3R5bGUoXCJ3aWR0aFwiKV0pXG5cblxuICAgICAgdmFyIGJhcl9wb3AgPSBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiZGl2LmJhci13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItd3JhcFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjIgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCI4cHhcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLXNwYWNlXCIsXCJkaXZcIikuY2xhc3NlZChcImJhci13cmFwLXNwYWNlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMSAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAudGV4dChkMy5mb3JtYXQoXCIsXCIpKHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbikpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjMixcIi5iYXItd3JhcC1vcHRcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtb3B0XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJyaWdodFwiKVxuICAgICAgICAuaHRtbChcImFwcGx5IGZpbHRlcnM/IDxpbnB1dCB0eXBlPSdjaGVja2JveCc+PC9pbnB1dD5cIilcblxuXG5cbiAgICAgIHNpbXBsZUJhcihiYXJfc2FtcCx0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSx4c2NhbGUsXCIjMDgxZDU4XCIpXG4gICAgICBzaW1wbGVCYXIoYmFyX3BvcCx0aGlzLl9kYXRhLnZpZXdzLnBvcHVsYXRpb24seHNjYWxlLFwiZ3JleVwiKVxuXG5cblxuXG5cblxuXG5cblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIyLFwiaDNcIixcImgzXCIpXG4gICAgICAgIC50ZXh0KFwiQ29tcGFyZSBBZ2FpbnN0XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyMixcImRpdi5jb2xvclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY29sb3JcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJncmV5XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuXG5cblxuXG5cblxuXG5cbiAgICAgIHNlbGVjdChpbm5lcjIpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIkN1cnJlbnQgU2VnbWVudCAod2l0aG91dCBmaWx0ZXJzKVwiLFwidmFsdWVcIjpmYWxzZX1dLmNvbmNhdCh0aGlzLl9zZWdtZW50cykgKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG5cbiAgICAgICAgICBzZWxmLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIikuYmluZCh0aGlzKSh4KVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fY29tcGFyaXNvbi52YWx1ZSB8fCAwKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIHZhciBjYWwyID0gZDNfdXBkYXRlYWJsZShpbm5lcjIsXCJhLmZhLWNhbGVuZGFyXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEgZmEtY2FsZW5kYXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgY2Fsc2VsMi5ub2RlKClcbiAgICAgICAgfSlcblxuICAgICAgXG4gICAgICB2YXIgY2Fsc2VsMiA9IHNlbGVjdChjYWwyKVxuICAgICAgICAub3B0aW9ucyhbe1wia2V5XCI6XCJUb2RheVwiLFwidmFsdWVcIjowfSx7XCJrZXlcIjpcIlllc3RlcmRheVwiLFwidmFsdWVcIjoxfSx7XCJrZXlcIjpcIjcgZGF5cyBhZ29cIixcInZhbHVlXCI6N31dKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZi5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikuYmluZCh0aGlzKSh4LnZhbHVlKVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fY29tcGFyaXNvbl9kYXRlIHx8IDApXG4gICAgICAgIC5kcmF3KClcbiAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIuMDFcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwibm9uZVwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIm5vbmVcIilcblxuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGFjdGlvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uX2RhdGVcIix2YWwpXG4gICAgfVxuICAsIGFjdGlvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFjdGlvblwiLHZhbClcbiAgICB9XG4gICwgY29tcGFyaXNvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY29tcGFyaXNvbl9kYXRlXCIsdmFsKVxuICAgIH1cblxuICAsIGNvbXBhcmlzb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uXCIsdmFsKVxuICAgIH1cbiAgLCBpc19sb2FkaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaXNfbG9hZGluZ1wiLHZhbClcbiAgICB9XG5cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkaWZmX2Jhcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEaWZmQmFyKHRhcmdldClcbn1cblxuLy8gZGF0YSBmb3JtYXQ6IFt7a2V5LCBub3JtYWxpemVkX2RpZmZ9LCAuLi4gXVxuXG5jbGFzcyBEaWZmQmFyIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICB0aGlzLl9rZXlfYWNjZXNzb3IgPSBcImtleVwiXG4gICAgdGhpcy5fdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcbiAgICB0aGlzLl9iYXJfaGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9iYXJfd2lkdGggPSAxNTBcbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGJhcl9oZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX2hlaWdodFwiLHZhbCkgfVxuICBiYXJfd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX3dpZHRoXCIsdmFsKSB9XG5cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHcgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5kaWZmLXdyYXBcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkge3JldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiZGlmZi13cmFwXCIsdHJ1ZSlcblxuICAgIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKS50ZXh0KHRoaXMuX3RpdGxlKVxuXG4gICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHcsXCIuc3ZnLXdyYXBcIixcImRpdlwiLHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmNsYXNzZWQoXCJzdmctd3JhcFwiLHRydWUpXG5cbiAgICB2YXIgayA9IHRoaXMua2V5X2FjY2Vzc29yKClcbiAgICAgICwgdiA9IHRoaXMudmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmJhcl9oZWlnaHQoKVxuICAgICAgLCBiYXJfd2lkdGggPSB0aGlzLmJhcl93aWR0aCgpXG5cbiAgICB2YXIga2V5cyA9IHRoaXMuX2RhdGEubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhba10gfSlcbiAgICAgICwgbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFt2XSB9KVxuICAgICAgLCBzYW1wbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gLXhbdl0gfSlcblxuICAgIHZhciB4c2FtcHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLHNhbXBtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB4c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLGtleXMubGVuZ3RoXSlcbiAgICAgICAgICAucmFuZ2UoWzAsa2V5cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoe1wid2lkdGhcIjpiYXJfd2lkdGgqMywgXCJoZWlnaHRcIjoga2V5cy5sZW5ndGgqaGVpZ2h0ICsgMTB9KTtcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ2JvdHRvbScpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4ga2V5c1tpXTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKGtleXMubGVuZ3RoKSk7XG5cbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aCArIGJhcl93aWR0aC8yKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGV4dC1hbmNob3I6IG1pZGRsZTtcIilcblxuICAgIFxuICAgIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoKjIpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuICAgIFxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTQpXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA4LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnIzM4OGUzYycpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNjYWxlKHhbdl0pIH0pXG5cbiAgICB2YXIgY2hhcnQyID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQyJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydDJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgc2FtcGJhcnMgPSBkM19zcGxhdChjaGFydDIsXCIuc2FtcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNhbXAtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtNClcbiAgICAgIC5hdHRyKHsneCc6ZnVuY3Rpb24oeCkgeyByZXR1cm4gYmFyX3dpZHRoIC0geHNhbXBzY2FsZSgteFt2XSl9LCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgOC41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJyNkMzJmMmYnKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzYW1wc2NhbGUoLXhbdl0pIH0pXG5cbiAgICB5X3hpcy5leGl0KCkucmVtb3ZlKClcblxuICAgIGNoYXJ0LmV4aXQoKS5yZW1vdmUoKVxuICAgIGNoYXJ0Mi5leGl0KCkucmVtb3ZlKClcblxuICAgIGJhcnMuZXhpdCgpLnJlbW92ZSgpXG4gICAgc2FtcGJhcnMuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgIFxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBfYmFyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IENvbXBCYXIodGFyZ2V0KVxufVxuXG4vLyBkYXRhIGZvcm1hdDogW3trZXksIG5vcm1hbGl6ZWRfZGlmZn0sIC4uLiBdXG5cbmNsYXNzIENvbXBCYXIge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcblxuICAgIHRoaXMuX2tleV9hY2Nlc3NvciA9IFwia2V5XCJcbiAgICB0aGlzLl9wb3BfdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcbiAgICB0aGlzLl9zYW1wX3ZhbHVlX2FjY2Vzc29yID0gXCJ2YWx1ZVwiXG5cbiAgICB0aGlzLl9iYXJfaGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9iYXJfd2lkdGggPSAzMDBcbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHBvcF92YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJwb3BfdmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cbiAgc2FtcF92YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzYW1wX3ZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG5cbiAgYmFyX2hlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfaGVpZ2h0XCIsdmFsKSB9XG4gIGJhcl93aWR0aCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfd2lkdGhcIix2YWwpIH1cblxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgdyA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLmNvbXAtd3JhcFwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7cmV0dXJuIDF9KVxuICAgICAgLmNsYXNzZWQoXCJjb21wLXdyYXBcIix0cnVlKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh3LFwiaDNcIixcImgzXCIpLnRleHQodGhpcy5fdGl0bGUpXG5cbiAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodyxcIi5zdmctd3JhcFwiLFwiZGl2XCIsdGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiAxIH0pXG4gICAgICAuY2xhc3NlZChcInN2Zy13cmFwXCIsdHJ1ZSlcblxuICAgIHZhciBrID0gdGhpcy5rZXlfYWNjZXNzb3IoKVxuICAgICAgLCBwID0gdGhpcy5wb3BfdmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBzID0gdGhpcy5zYW1wX3ZhbHVlX2FjY2Vzc29yKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5iYXJfaGVpZ2h0KClcbiAgICAgICwgYmFyX3dpZHRoID0gdGhpcy5iYXJfd2lkdGgoKVxuXG4gICAgdmFyIGtleXMgPSB0aGlzLl9kYXRhLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4W2tdIH0pXG4gICAgICAsIG1heCA9IGQzLm1heCh0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbcF0gfSlcbiAgICAgICwgc2FtcG1heCA9IGQzLm1heCh0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbc10gfSlcblxuICAgIHZhciB4c2FtcHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLHNhbXBtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB4c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLGtleXMubGVuZ3RoXSlcbiAgICAgICAgICAucmFuZ2UoWzAsa2V5cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoe1wid2lkdGhcIjpiYXJfd2lkdGgrYmFyX3dpZHRoLzIsIFwiaGVpZ2h0XCI6IGtleXMubGVuZ3RoKmhlaWdodCArIDEwfSk7XG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCdib3R0b20nKVxuICAgICAgLnNjYWxlKHhzY2FsZSlcblxuICAgIHZhciB5QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeUF4aXNcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLnNjYWxlKHlzY2FsZSlcbiAgICAgIC50aWNrU2l6ZSgyKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oZCxpKXsgcmV0dXJuIGtleXNbaV07IH0pXG4gICAgICAudGlja1ZhbHVlcyhkMy5yYW5nZShrZXlzLmxlbmd0aCkpO1xuXG4gICAgdmFyIHlfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieSBheGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChiYXJfd2lkdGgvMikgKyBcIiwxNSlcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3lheGlzJylcbiAgICAgIC5jYWxsKHlBeGlzKTtcblxuICAgIHlfeGlzLnNlbGVjdEFsbChcInRleHRcIilcblxuICAgIFxuICAgIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoLzIpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuICAgIFxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTIpXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA3LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnZ3JheScpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNjYWxlKHhbcF0pIH0pXG5cblxuICAgIHZhciBzYW1wYmFycyA9IGQzX3NwbGF0KGNoYXJ0LFwiLnNhbXAtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJzYW1wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTEwKVxuICAgICAgLmF0dHIoeyd4JzowLCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgMTEuNTsgfX0pXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCcjMDgxZDU4JylcbiAgICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4c2FtcHNjYWxlKHhbc10gfHwgMCkgfSlcblxuICAgIHlfeGlzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgY2hhcnQuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICBiYXJzLmV4aXQoKS5yZW1vdmUoKVxuICAgIHNhbXBiYXJzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwiaW1wb3J0IGRpZmZfYmFyIGZyb20gJy4uLy4uL2dlbmVyaWMvZGlmZl9iYXInXG5pbXBvcnQgY29tcF9iYXIgZnJvbSAnLi4vLi4vZ2VuZXJpYy9jb21wX2JhcidcblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdDYXRlZ29yeURpZmYodGFyZ2V0LGRhdGEpIHtcblxuICBkaWZmX2Jhcih0YXJnZXQpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAudGl0bGUoXCJDYXRlZ29yeSBpbmRleGluZyB2ZXJzdXMgY29tcFwiKVxuICAgIC52YWx1ZV9hY2Nlc3NvcihcIm5vcm1hbGl6ZWRfZGlmZlwiKVxuICAgIC5kcmF3KClcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJhd0NhdGVnb3J5KHRhcmdldCxkYXRhKSB7XG5cbiAgY29tcF9iYXIodGFyZ2V0KVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLnRpdGxlKFwiQ2F0ZWdvcmllcyB2aXNpdGVkIGZvciBmaWx0ZXJlZCB2ZXJzdXMgYWxsIHZpZXdzXCIpXG4gICAgLnBvcF92YWx1ZV9hY2Nlc3NvcihcInBvcFwiKVxuICAgIC5zYW1wX3ZhbHVlX2FjY2Vzc29yKFwic2FtcFwiKVxuICAgIC5kcmF3KClcblxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb21wX2J1YmJsZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBDb21wQnViYmxlKHRhcmdldClcbn1cblxuLy8gZGF0YSBmb3JtYXQ6IFt7a2V5LCBub3JtYWxpemVkX2RpZmZ9LCAuLi4gXVxuXG5jbGFzcyBDb21wQnViYmxlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICB0aGlzLl9rZXlfYWNjZXNzb3IgPSBcImtleVwiXG5cbiAgICB0aGlzLl9oZWlnaHQgPSAyMFxuICAgIHRoaXMuX3NwYWNlID0gMTRcbiAgICB0aGlzLl9taWRkbGUgPSAxODBcbiAgICB0aGlzLl9sZWdlbmRfd2lkdGggPSA4MFxuXG4gICAgdGhpcy5fYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG4gICAgdGhpcy5fcm93cyA9IFtdXG5cblxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgdmFsdWVfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cblxuICBoZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVpZ2h0XCIsdmFsKSB9XG4gIHNwYWNlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNwYWNlXCIsdmFsKSB9XG4gIG1pZGRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJtaWRkbGVcIix2YWwpIH1cbiAgYnVja2V0cyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJidWNrZXRzXCIsdmFsKSB9XG5cbiAgcm93cyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyb3dzXCIsdmFsKSB9XG4gIGFmdGVyKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFmdGVyXCIsdmFsKSB9XG5cblxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuICBidWlsZFNjYWxlcygpIHtcblxuICAgIHZhciByb3dzID0gdGhpcy5yb3dzKClcbiAgICAgICwgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpXG5cbiAgICB0aGlzLl95c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbMCxyb3dzLmxlbmd0aF0pXG4gICAgICAucmFuZ2UoWzAscm93cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB0aGlzLl94c2NhbGUgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cylcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLChoZWlnaHQrc3BhY2UpKSk7XG5cbiAgICB0aGlzLl94c2NhbGVyZXZlcnNlID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMucmV2ZXJzZSgpKVxuICAgICAgLnJhbmdlKGQzLnJhbmdlKDAsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSksKGhlaWdodCtzcGFjZSkpKTtcblxuICAgIHRoaXMuX3JzY2FsZSA9IGQzLnNjYWxlLnBvdygpXG4gICAgICAuZXhwb25lbnQoMC41KVxuICAgICAgLmRvbWFpbihbMCwxXSlcbiAgICAgIC5yYW5nZShbLjM1LDFdKVxuICAgIFxuICAgIHRoaXMuX29zY2FsZSA9IGQzLnNjYWxlLnF1YW50aXplKClcbiAgICAgIC5kb21haW4oWy0xLDFdKVxuICAgICAgLnJhbmdlKFsnI2Y3ZmJmZicsJyNkZWViZjcnLCcjYzZkYmVmJywnIzllY2FlMScsJyM2YmFlZDYnLCcjNDI5MmM2JywnIzIxNzFiNScsJyMwODUxOWMnLCcjMDgzMDZiJ10pXG4gICAgXG4gIH1cblxuICBkcmF3TGVnZW5kKCkge1xuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNcbiAgICAgICwgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpLCBtaWRkbGUgPSB0aGlzLm1pZGRsZSgpLCBsZWdlbmR0dyA9IHRoaXMuX2xlZ2VuZF93aWR0aFxuICAgICAgLCByc2NhbGUgPSB0aGlzLl9yc2NhbGUsIG9zY2FsZSA9IHRoaXMuX29zY2FsZTtcblxuICAgIHZhciBsZWdlbmQgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5sZWdlbmQnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlZ2VuZFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSoyK21pZGRsZS0zMTApICsgXCIsLTEzMClcIilcblxuICAgIHZhciBzaXplID0gZDNfdXBkYXRlYWJsZShsZWdlbmQsJ2cuc2l6ZScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwic2l6ZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArIChsZWdlbmR0dysxMCkgKyBcIiwwKVwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlIGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dylcbiAgICAgIC5odG1sKFwibW9yZSBhY3Rpdml0eVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpIFxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZS1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZS1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHctMTApXG4gICAgICAuaHRtbChcIiYjOTY2NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKSBcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG5cblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzc1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuaHRtbChcImxlc3MgYWN0aXZpdHlcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5sZXNzLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZXNzLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLChoZWlnaHQrNCkqNStsZWdlbmR0dysxMClcbiAgICAgIC5odG1sKFwiJiM5NjU0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIikgXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cbiAgICBkM19zcGxhdChzaXplLFwiY2lyY2xlXCIsXCJjaXJjbGVcIixbMSwuNiwuMywuMSwwXSlcbiAgICAgIC5hdHRyKFwiclwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIChoZWlnaHQtMikvMipyc2NhbGUoeCkgfSlcbiAgICAgIC5hdHRyKCdjeCcsIGZ1bmN0aW9uKGQsaSkgeyByZXR1cm4gKGhlaWdodCs0KSppK2hlaWdodC8yfSlcbiAgICAgIC5hdHRyKCdzdHJva2UnLCAnZ3JleScpXG4gICAgICAuYXR0cignZmlsbCcsICdub25lJylcblxuXG4gICAgXG5cblxuICAgIHZhciBzaXplID0gZDNfdXBkYXRlYWJsZShsZWdlbmQsJ2cuaW1wb3J0YW5jZScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiaW1wb3J0YW5jZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIisgKGxlZ2VuZHR3KzEwKSArXCIsMjUpXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lm1vcmVcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1vcmUgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsLWxlZ2VuZHR3KVxuICAgICAgLmh0bWwoXCJtb3JlIGltcG9ydGFudFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dy0xMClcbiAgICAgIC5odG1sKFwiJiM5NjY0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIikgXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzc1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuaHRtbChcImxlc3MgaW1wb3J0YW50XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3MtYXJyb3dcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MtYXJyb3cgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KzEwKVxuICAgICAgLmh0bWwoXCImIzk2NTQ7XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG4gICAgZDNfc3BsYXQoc2l6ZSxcImNpcmNsZVwiLFwiY2lyY2xlXCIsWzEsLjc1LC41LC4yNSwwXSlcbiAgICAgIC5hdHRyKFwiclwiLGhlaWdodC8yLTIpXG4gICAgICAuYXR0cihcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBvc2NhbGUoeCkgfSlcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHJzY2FsZSh4LzIgKyAuMikgfSlcbiAgICAgIC5hdHRyKCdjeCcsIGZ1bmN0aW9uKGQsaSkgeyByZXR1cm4gKGhlaWdodCs0KSppK2hlaWdodC8yIH0pXG4gXG4gIH1cblxuICBkcmF3QXhlcygpIHtcbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKSwgbWlkZGxlID0gdGhpcy5taWRkbGUoKSwgbGVnZW5kdHcgPSB0aGlzLl9sZWdlbmRfd2lkdGhcbiAgICAgICwgcnNjYWxlID0gdGhpcy5fcnNjYWxlLCBvc2NhbGUgPSB0aGlzLl9vc2NhbGUgXG4gICAgICAsIHhzY2FsZSA9IHRoaXMuX3hzY2FsZSwgeXNjYWxlID0gdGhpcy5feXNjYWxlXG4gICAgICAsIHhzY2FsZXJldmVyc2UgPSB0aGlzLl94c2NhbGVyZXZlcnNlXG4gICAgICAsIHJvd3MgPSB0aGlzLl9yb3dzXG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCd0b3AnKVxuICAgICAgLnNjYWxlKHhzY2FsZXJldmVyc2UpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbih4KSB7IFxuICAgICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgICBpZiAoeCA8IDM2MDApIHJldHVybiB4LzYwICsgXCIgbWluc1wiIFxuXG4gICAgICAgIGlmICh4ID09IDg2NDAwKSByZXR1cm4gXCIxIGRheVwiXG4gICAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICAgIHJldHVybiB4LzM2MDAgKyBcIiBob3Vyc1wiXG4gICAgICB9KVxuXG4gICAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueC5iZWZvcmUnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInggYXhpcyBiZWZvcmVcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGhlaWdodCArIHNwYWNlKSsgXCIsLTQpXCIpXG4gICAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgICAuY2FsbCh4QXhpcyk7XG5cbiAgICAgICAgICBcbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInlcIiwgLTgpXG4gICAgICAuYXR0cihcInhcIiwgLTgpXG4gICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKDQ1KVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFja1wiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrOyBkaXNwbGF5OmluaGVyaXRcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoeF94aXMsXCJ0ZXh0LnRpdGxlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgICAgLmF0dHIoXCJ4XCIsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkvMiAtIGhlaWdodCtzcGFjZSApXG4gICAgICAuYXR0cihcInlcIiwtNTMpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLHVuZGVmaW5lZClcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLCBcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXG4gICAgICAudGV4dChcImJlZm9yZSBhcnJpdmluZ1wiKVxuXG5cblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgaWYgKHggPT0gMzYwMCkgcmV0dXJuIFwiMSBob3VyXCJcbiAgICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgICBpZiAoeCA9PSA4NjQwMCkgcmV0dXJuIFwiMSBkYXlcIlxuICAgICAgICBpZiAoeCA+IDg2NDAwKSByZXR1cm4geC84NjQwMCArIFwiIGRheXNcIiBcblxuICAgICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgICAgfSlcblxuICAgIHZhciB4X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnguYWZ0ZXInLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInggYXhpcyBhZnRlclwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkrbWlkZGxlKSArIFwiLDApXCIpXG4gICAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgICAuY2FsbCh4QXhpcyk7XG4gICAgXG4gICAgeF94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ5XCIsIC04KVxuICAgICAgLmF0dHIoXCJ4XCIsIDgpXG4gICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKC00NSlcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwic3RhcnRcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFja1wiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrOyBkaXNwbGF5OmluaGVyaXRcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoeF94aXMsXCJ0ZXh0LnRpdGxlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgICAgLmF0dHIoXCJ4XCIsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkvMiAgKVxuICAgICAgLmF0dHIoXCJ5XCIsLTUzKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIix1bmRlZmluZWQpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgLnRleHQoXCJhZnRlciBsZWF2aW5nXCIpXG5cblxuICAgIHZhciB5QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeUF4aXNcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLnNjYWxlKHlzY2FsZSlcbiAgICAgIC50aWNrU2l6ZSgyKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHJvd3NbaV0ua2V5OyB9KVxuICAgICAgLnRpY2tWYWx1ZXMoZDMucmFuZ2Uocm93cy5sZW5ndGgpKTtcblxuXG4gICAgXG4gICAgdmFyIHlfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieSBheGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSswKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuXG5cbiAgICB5X3hpc1xuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwibGluZVwiKVxuICAgICAgLmF0dHIoXCJ4MlwiLDE4KVxuICAgICAgLmF0dHIoXCJ4MVwiLDIyKVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLFwiMFwiKVxuICAgICAgLnJlbW92ZSgpXG5cblxuICAgIHlfeGlzLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAgIC5hdHRyKFwieDJcIiwxOClcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMTgsMClcIikgXG4gICAgICAvLy5zdHlsZShcInN0cm9rZVwiLFwiYmxhY2tcIilcblxuXG5cbiAgICAgIC8vLnJlbW92ZSgpXG5cbiAgICBcbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJ0ZXh0LWFuY2hvcjogbWlkZGxlOyBmb250LXdlaWdodDpib2xkOyBmaWxsOiAjMzMzXCIpXG4gICAgICAuYXR0cihcInhcIixtaWRkbGUvMilcblxuXG5cblxuICB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBidWNrZXRzID0gdGhpcy5idWNrZXRzKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5oZWlnaHQoKSwgc3BhY2UgPSB0aGlzLnNwYWNlKCksIG1pZGRsZSA9IHRoaXMubWlkZGxlKCksIGxlZ2VuZHR3ID0gdGhpcy5fbGVnZW5kX3dpZHRoXG4gICAgICAsIHJvd3MgPSB0aGlzLnJvd3MoKVxuXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi01cHhcIilcbiAgICAgIC5hdHRyKHsnd2lkdGgnOmJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpKjIrbWlkZGxlLCdoZWlnaHQnOnJvd3MubGVuZ3RoKmhlaWdodCArIDE2NX0pXG4gICAgICAuYXR0cihcInhtbG5zXCIsIFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIilcblxuICAgIHRoaXMuX3N2ZyA9IHN2Z1xuXG4gICAgdGhpcy5fY2FudmFzID0gZDNfdXBkYXRlYWJsZShzdmcsXCIuY2FudmFzXCIsXCJnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMTQwKVwiKVxuXG5cblxuICAgIHRoaXMuYnVpbGRTY2FsZXMoKVxuICAgIHRoaXMuZHJhd0xlZ2VuZCgpXG4gICAgdGhpcy5kcmF3QXhlcygpXG5cbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzXG4gICAgICAsIHJzY2FsZSA9IHRoaXMuX3JzY2FsZSwgb3NjYWxlID0gdGhpcy5fb3NjYWxlIFxuICAgICAgLCB4c2NhbGUgPSB0aGlzLl94c2NhbGUsIHlzY2FsZSA9IHRoaXMuX3lzY2FsZVxuICAgICAgLCB4c2NhbGVyZXZlcnNlID0gdGhpcy5feHNjYWxlcmV2ZXJzZVxuICAgICAgLCByb3dzID0gdGhpcy5yb3dzKClcblxuXG4gICAgdmFyIGNoYXJ0X2JlZm9yZSA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0LWJlZm9yZScsJ2cnLHRoaXMucm93cygpLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnQtYmVmb3JlXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgcm93cyA9IGQzX3NwbGF0KGNoYXJ0X2JlZm9yZSxcIi5yb3dcIixcImdcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJyb3dcIilcbiAgICAgIC5hdHRyKHsndHJhbnNmb3JtJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gXCJ0cmFuc2xhdGUoMCxcIiArICh5c2NhbGUoaSkgKyA3LjUpICsgXCIpXCI7IH0gfSlcbiAgICAgIC5hdHRyKHsnbGFiZWwnOmZ1bmN0aW9uKGQsaSl7IHJldHVybiBkLmtleTsgfSB9KVxuXG4gICAgcm93cy5leGl0KCkucmVtb3ZlKClcblxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQocm93cyxcIi5wb3AtYmFyXCIsXCJjaXJjbGVcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlcyB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2N5JywoaGVpZ2h0LTIpLzIpXG4gICAgICAuYXR0cih7J2N4JzpmdW5jdGlvbihkLGkpIHsgcmV0dXJuIC14c2NhbGUoZC5rZXkpfX0pXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIixcIi44XCIpXG4gICAgICAuYXR0cihcInJcIixmdW5jdGlvbih4KSB7IHJldHVybiAoaGVpZ2h0KS8yICogcnNjYWxlKHgubm9ybV90aW1lKSB9KSBcbiAgICAgIC5zdHlsZShcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBvc2NhbGUoeC5wZXJjZW50X2RpZmYpIH0pXG5cbiAgICB2YXIgY2hhcnRfYWZ0ZXIgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydC1hZnRlcicsJ2cnLHRoaXMuX2FmdGVyLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnQtYWZ0ZXJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpK21pZGRsZSkgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG5cblxuICAgIHZhciByb3dzID0gZDNfc3BsYXQoY2hhcnRfYWZ0ZXIsXCIucm93XCIsXCJnXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicm93XCIpXG4gICAgICAuYXR0cih7J3RyYW5zZm9ybSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIFwidHJhbnNsYXRlKDAsXCIgKyAoeXNjYWxlKGkpICsgNy41KSArIFwiKVwiOyB9IH0pXG4gICAgICAuYXR0cih7J2xhYmVsJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gZC5rZXk7IH0gfSlcblxuICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYmFycyA9IGQzX3NwbGF0KHJvd3MsXCIucG9wLWJhclwiLFwiY2lyY2xlXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBvcC1iYXJcIilcbiAgICAgIC5hdHRyKCdjeScsKGhlaWdodC0yKS8yKVxuICAgICAgLmF0dHIoeydjeCc6ZnVuY3Rpb24oZCxpKSB7IHJldHVybiB4c2NhbGUoZC5rZXkpfX0pXG4gICAgICAuYXR0cihcInJcIixmdW5jdGlvbih4KSB7IHJldHVybiAoaGVpZ2h0LTIpLzIgKiByc2NhbGUoeC5ub3JtX3RpbWUpIH0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gb3NjYWxlKHgucGVyY2VudF9kaWZmKSB9KVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsXCIuOFwiKVxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN0cmVhbV9wbG90KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN0cmVhbVBsb3QodGFyZ2V0KVxufVxuXG5mdW5jdGlvbiBkcmF3QXhpcyh0YXJnZXQsc2NhbGUsdGV4dCx3aWR0aCkge1xuICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICB4QXhpc1xuICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgLnNjYWxlKHNjYWxlKVxuICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgIH0pXG5cbiAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsJ2cueC5iZWZvcmUnLCdnJylcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYmVmb3JlXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwtNSlcIilcbiAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgICAgIFxuICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIC0yNSlcbiAgICAuYXR0cihcInhcIiwgMTUpXG4gICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoNDUpXCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcblxuICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrXCIpXG5cbiAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgZDNfdXBkYXRlYWJsZSh4X3hpcyxcInRleHQudGl0bGVcIixcInRleHRcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgIC5hdHRyKFwieFwiLHdpZHRoLzIpXG4gICAgLmF0dHIoXCJ5XCIsLTQ2KVxuICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsdW5kZWZpbmVkKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAudGV4dCh0ZXh0ICsgXCIgXCIpXG5cbiAgcmV0dXJuIHhfeGlzXG5cbn1cblxuXG5jbGFzcyBTdHJlYW1QbG90IHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICAgIHRoaXMuX2J1Y2tldHMgPSBbMCwxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG5cbiAgICB0aGlzLl93aWR0aCA9IDM3MFxuICAgIHRoaXMuX2hlaWdodCA9IDI1MFxuICAgIHRoaXMuX2NvbG9yID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAucmFuZ2UoXG5bJyM5OTknLCcjYWFhJywnI2JiYicsJyNjY2MnLCcjZGRkJywnI2RlZWJmNycsJyNjNmRiZWYnLCcjOWVjYWUxJywnIzZiYWVkNicsJyM0MjkyYzYnLCcjMjE3MWI1JywncmdiYSgzMywgMTEzLCAxODEsLjkpJywncmdiYSg4LCA4MSwgMTU2LC45MSknLCcjMDg1MTljJywncmdiYSg4LCA0OCwgMTA3LC45KScsJyMwODMwNmInXS5yZXZlcnNlKCkpXG5cbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGhlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cbiAgd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwid2lkdGhcIix2YWwpIH1cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgICAsIG9yZGVyID0gZGF0YS5vcmRlclxuICAgICAgLCBidWNrZXRzID0gdGhpcy5fYnVja2V0c1xuICAgICAgLCBiZWZvcmVfc3RhY2tlZCA9IGRhdGEuYmVmb3JlX3N0YWNrZWRcbiAgICAgICwgYWZ0ZXJfc3RhY2tlZCA9IGRhdGEuYWZ0ZXJfc3RhY2tlZFxuICAgICAgLCBoZWlnaHQgPSB0aGlzLl9oZWlnaHRcbiAgICAgICwgd2lkdGggPSB0aGlzLl93aWR0aFxuICAgICAgLCB0YXJnZXQgPSB0aGlzLl90YXJnZXRcbiAgICAgICwgY29sb3IgPSB0aGlzLl9jb2xvclxuICAgICAgLCBzZWxmID0gdGhpc1xuXG4gICAgY29sb3IuZG9tYWluKG9yZGVyKVxuXG4gICAgdmFyIHkgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLnJhbmdlKFtoZWlnaHQsMF0pXG4gICAgICAuZG9tYWluKFswLGQzLm1heChiZWZvcmVfc3RhY2tlZCwgZnVuY3Rpb24obGF5ZXIpIHsgcmV0dXJuIGQzLm1heChsYXllcixmdW5jdGlvbihkKSB7cmV0dXJuIGQueTAgKyBkLnkgfSl9KV0pXG4gIFxuICAgIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCx3aWR0aCx3aWR0aC8oYnVja2V0cy5sZW5ndGgtMSkpKVxuICBcbiAgICB2YXIgeHJldmVyc2UgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKSlcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLHdpZHRoKzEwLHdpZHRoLyhidWNrZXRzLmxlbmd0aC0xKSkpXG5cbiAgICB0aGlzLl9iZWZvcmVfc2NhbGUgPSB4cmV2ZXJzZVxuICAgIHRoaXMuX2FmdGVyX3NjYWxlID0geFxuICBcbiAgICB2YXIgYmFyZWEgPSBkMy5zdmcuYXJlYSgpXG4gICAgICAuaW50ZXJwb2xhdGUoXCJ6ZXJvXCIpXG4gICAgICAueChmdW5jdGlvbihkKSB7IHJldHVybiB4cmV2ZXJzZShkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICAgIHZhciBhYXJlYSA9IGQzLnN2Zy5hcmVhKClcbiAgICAgIC5pbnRlcnBvbGF0ZShcImxpbmVhclwiKVxuICAgICAgLngoZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICBcbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJzdmdcIixcInN2Z1wiKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCoyKzE4MClcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCArIDEwMCk7XG5cbiAgICB0aGlzLl9zdmcgPSBzdmdcbiAgXG4gICAgdmFyIGJlZm9yZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmJlZm9yZS1jYW52YXNcIixcImdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImJlZm9yZS1jYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsNjApXCIpXG5cbiAgICBmdW5jdGlvbiBob3ZlckNhdGVnb3J5KGNhdCx0aW1lKSB7XG4gICAgICBhcGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsXCIuNVwiKVxuICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLFwiLjVcIilcbiAgICAgIGFwYXRocy5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSBjYXQpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIGJwYXRocy5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSBjYXQpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUobWlkZGxlLFwidGV4dFwiLFwidGV4dFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiLjY1XCIpXG4gICAgICAgIC50ZXh0KGNhdClcblxuICAgICAgdmFyIG13cmFwID0gZDNfdXBkYXRlYWJsZShtaWRkbGUsXCJnXCIsXCJnXCIpXG5cbiAgICAgIHNlbGYub24oXCJjYXRlZ29yeS5ob3ZlclwiKS5iaW5kKG13cmFwLm5vZGUoKSkoY2F0LHRpbWUpXG4gICAgfVxuICBcbiAgICB2YXIgYiA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiZ1wiLFwiZ1wiKVxuXG4gICAgdmFyIGJwYXRocyA9IGQzX3NwbGF0KGIsXCJwYXRoXCIsXCJwYXRoXCIsIGJlZm9yZV9zdGFja2VkLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLmF0dHIoXCJkXCIsIGJhcmVhKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gY29sb3IoeFswXS5rZXkpOyB9KVxuICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZGQgPSBkMy5ldmVudFxuICAgICAgICB2YXIgcG9zID0gcGFyc2VJbnQoZGQub2Zmc2V0WC8od2lkdGgvYnVja2V0cy5sZW5ndGgpKVxuICAgICAgICBcbiAgICAgICAgaG92ZXJDYXRlZ29yeS5iaW5kKHRoaXMpKHhbMF0ua2V5LGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKClbcG9zXSlcbiAgICAgIH0pXG4gICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgYXBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIH0pXG5cbiAgICBicGF0aHMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYnJlY3QgPSBkM19zcGxhdChiLFwicmVjdFwiLFwicmVjdFwiLGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKCksKHgsaSkgPT4gaSlcbiAgICAgIC5hdHRyKFwieFwiLHogPT4geHJldmVyc2UoeikpXG4gICAgICAuYXR0cihcIndpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsaGVpZ2h0KVxuICAgICAgLmF0dHIoXCJ5XCIsMClcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLFwiMFwiKVxuXG5cblxuICAgICAgXG5cbiAgICB2YXIgbWlkZGxlID0gZDNfdXBkYXRlYWJsZShzdmcsXCIubWlkZGxlLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibWlkZGxlLWNhbnZhc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArICh3aWR0aCArIDE4MC8yKSArIFwiLDYwKVwiKVxuICBcbiAgXG4gIFxuICAgIHZhciBhZnRlciA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmFmdGVyLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiYWZ0ZXItY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArICh3aWR0aCArIDE4MCkgKyBcIiw2MClcIilcblxuICAgIHZhciBhID0gZDNfdXBkYXRlYWJsZShhZnRlcixcImdcIixcImdcIilcblxuICBcbiAgICB2YXIgYXBhdGhzID0gZDNfc3BsYXQoYSxcInBhdGhcIixcInBhdGhcIixhZnRlcl9zdGFja2VkLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLmF0dHIoXCJkXCIsIGFhcmVhKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gY29sb3IoeFswXS5rZXkpOyB9KVxuICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICBob3ZlckNhdGVnb3J5LmJpbmQodGhpcykoeFswXS5rZXkpXG4gICAgICB9KVxuICAgICAgLm9uKFwibW91c2VvdXRcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIGFwYXRocy5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICAgIGJwYXRocy5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICB9KVxuXG4gICAgYXBhdGhzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIF94X3hpcyA9IGRyYXdBeGlzKGJlZm9yZSx4cmV2ZXJzZSxcImJlZm9yZSBhcnJpdmluZ1wiLHdpZHRoKVxuXG4gICAgX3hfeGlzLnNlbGVjdEFsbChcInRleHRcIikuZmlsdGVyKGZ1bmN0aW9uKHkpeyByZXR1cm4geSA9PSAwIH0pLnJlbW92ZSgpXG5cbiAgICB2YXIgX3hfeGlzID0gZHJhd0F4aXMoYWZ0ZXIseCxcImFmdGVyIGxlYXZpbmdcIix3aWR0aClcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0Om5vdCgudGl0bGUpXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSgtNDUpXCIpXG4gICAgICAuYXR0cihcInhcIiwyMClcbiAgICAgIC5hdHRyKFwieVwiLC0yNSlcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpLmZpbHRlcihmdW5jdGlvbih5KXsgcmV0dXJuIHkgPT0gMCB9KS5yZW1vdmUoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIG9uKGFjdGlvbixmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuaW1wb3J0IHtkM19jbGFzcywgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5cbmltcG9ydCBjb21wX2J1YmJsZSBmcm9tICcuLi8uLi9nZW5lcmljL2NvbXBfYnViYmxlJ1xuaW1wb3J0IHN0cmVhbV9wbG90IGZyb20gJy4uLy4uL2dlbmVyaWMvc3RyZWFtX3Bsb3QnXG5cbmZ1bmN0aW9uIGJ1aWxkU3RyZWFtRGF0YShkYXRhLGJ1Y2tldHMpIHtcblxuICB2YXIgdW5pdHNfaW5fYnVja2V0ID0gYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7IHJldHVybiB4IC0gKHhbaS0xXXx8IDApIH0pXG5cbiAgdmFyIHN0YWNrYWJsZSA9IGRhdGEubWFwKGZ1bmN0aW9uKGQpIHtcbiAgICB2YXIgdmFsdWVtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy52YWx1ZXM7IHJldHVybiBwIH0se30pXG4gICAgdmFyIHBlcmNtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy5wZXJjZW50OyByZXR1cm4gcCB9LHt9KVxuXG4gICAgdmFyIHZtYXAgPSBkLnZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy5ub3JtX2NhdDsgcmV0dXJuIHAgfSx7fSlcblxuXG4gICAgdmFyIG5vcm1hbGl6ZWRfdmFsdWVzID0gYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICBpZiAoeCA9PSAwKSByZXR1cm4ge2tleTogZC5rZXksIHg6IHBhcnNlSW50KHgpLCB5OiAodm1hcFtcIjYwMFwiXXx8MCksIHZhbHVlczogKHZhbHVlbWFwW1wiNjAwXCJdfHwwKSwgcGVyY2VudDogKHBlcmNtYXBbXCI2MDBcIl18fDApfVxuICAgICAgcmV0dXJuIHsga2V5OiBkLmtleSwgeDogcGFyc2VJbnQoeCksIHk6ICh2bWFwW3hdIHx8IDApLCB2YWx1ZXM6ICh2YWx1ZW1hcFt4XSB8fCAwKSwgcGVyY2VudDogKHBlcmNtYXBbeF0gfHwgMCkgfVxuICAgIH0pXG5cblxuICAgIHJldHVybiBub3JtYWxpemVkX3ZhbHVlc1xuICAgIC8vcmV0dXJuIGUyLmNvbmNhdChub3JtYWxpemVkX3ZhbHVlcykvLy5jb25jYXQoZXh0cmEpXG4gIH0pXG5cblxuICBzdGFja2FibGUgPSBzdGFja2FibGUuc29ydCgocCxjKSA9PiBwWzBdLnkgLSBjWzBdLnkpLnJldmVyc2UoKS5zbGljZSgwLDEyKVxuXG4gIHJldHVybiBzdGFja2FibGVcblxufVxuXG5mdW5jdGlvbiBzdHJlYW1EYXRhKGJlZm9yZSxhZnRlcixidWNrZXRzKSB7XG4gIHZhciBzdGFja2FibGUgPSBidWlsZFN0cmVhbURhdGEoYmVmb3JlLGJ1Y2tldHMpXG4gIHZhciBzdGFjayA9IGQzLmxheW91dC5zdGFjaygpLm9mZnNldChcIndpZ2dsZVwiKS5vcmRlcihcInJldmVyc2VcIilcbiAgdmFyIGJlZm9yZV9zdGFja2VkID0gc3RhY2soc3RhY2thYmxlKVxuXG4gIHZhciBvcmRlciA9IGJlZm9yZV9zdGFja2VkLm1hcChpdGVtID0+IGl0ZW1bMF0ua2V5KVxuXG4gIHZhciBzdGFja2FibGUgPSBidWlsZFN0cmVhbURhdGEoYWZ0ZXIsYnVja2V0cylcbiAgICAuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIG9yZGVyLmluZGV4T2YoY1swXS5rZXkpIC0gb3JkZXIuaW5kZXhPZihwWzBdLmtleSkgfSlcblxuICBzdGFja2FibGUgPSBzdGFja2FibGUuZmlsdGVyKHggPT4gb3JkZXIuaW5kZXhPZih4WzBdLmtleSkgPT0gLTEpLmNvbmNhdChzdGFja2FibGUuZmlsdGVyKHggPT4gb3JkZXIuaW5kZXhPZih4WzBdLmtleSkgPiAtMSkpXG5cbiAgdmFyIHN0YWNrID0gZDMubGF5b3V0LnN0YWNrKCkub2Zmc2V0KFwid2lnZ2xlXCIpLm9yZGVyKFwiZGVmYXVsdFwiKVxuICB2YXIgYWZ0ZXJfc3RhY2tlZCA9IHN0YWNrKHN0YWNrYWJsZSlcblxuICByZXR1cm4ge1xuICAgICAgb3JkZXI6IG9yZGVyXG4gICAgLCBiZWZvcmVfc3RhY2tlZDogYmVmb3JlX3N0YWNrZWRcbiAgICAsIGFmdGVyX3N0YWNrZWQ6IGFmdGVyX3N0YWNrZWRcbiAgfVxuXG59XG5cblxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdTdHJlYW0odGFyZ2V0LGJlZm9yZSxhZnRlcikge1xuXG4gIGZ1bmN0aW9uIGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGFjY2Vzc29yKSB7XG4gICAgdmFyIGJ2b2x1bWUgPSB7fSwgYXZvbHVtZSA9IHt9XG4gIFxuICAgIHRyeSB7IHZhciBidm9sdW1lID0gYlswXS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy54XSA9IGFjY2Vzc29yKGMpOyByZXR1cm4gcCB9LHt9KSB9IGNhdGNoKGUpIHt9XG4gICAgdHJ5IHsgdmFyIGF2b2x1bWUgPSBhWzBdLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLnhdID0gYWNjZXNzb3IoYyk7IHJldHVybiBwIH0se30pIH0gY2F0Y2goZSkge31cbiAgXG4gICAgdmFyIHZvbHVtZSA9IGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKCkubWFwKHggPT4gYnZvbHVtZVt4XSB8fCAwKS5jb25jYXQoYnVja2V0cy5tYXAoeCA9PiBhdm9sdW1lW3hdIHx8IDApKVxuICBcbiAgICByZXR1cm4gdm9sdW1lXG4gIH1cblxuICB2YXIgYnVja2V0cyA9IFswLDEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcblxuICB2YXIgZGF0YSA9IHN0cmVhbURhdGEoYmVmb3JlLGFmdGVyLGJ1Y2tldHMpXG4gICAgLCBiZWZvcmVfc3RhY2tlZCA9IGRhdGEuYmVmb3JlX3N0YWNrZWRcbiAgICAsIGFmdGVyX3N0YWNrZWQgPSBkYXRhLmFmdGVyX3N0YWNrZWRcblxuICB2YXIgYmVmb3JlID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuYmVmb3JlLXN0cmVhbVwiLFwiZGl2XCIsZGF0YSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgIC5jbGFzc2VkKFwiYmVmb3JlLXN0cmVhbVwiLHRydWUpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIwcHhcIilcblxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcInJnYigyMjcsIDIzNSwgMjQwKVwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJDb25zaWRlcmF0aW9uIGFuZCBSZXNlYXJjaCBQaGFzZSBJZGVudGlmaWNhdGlvblwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG4gIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSlcblxuXG5cbiAgdmFyIHN0cmVhbSA9IHN0cmVhbV9wbG90KGlubmVyKVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLm9uKFwiY2F0ZWdvcnkuaG92ZXJcIixmdW5jdGlvbih4LHRpbWUpIHtcbiAgICAgIGNvbnNvbGUubG9nKHRpbWUpXG4gICAgICB2YXIgYiA9IGRhdGEuYmVmb3JlX3N0YWNrZWQuZmlsdGVyKHkgPT4geVswXS5rZXkgPT0geClcbiAgICAgIHZhciBhID0gZGF0YS5hZnRlcl9zdGFja2VkLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IHgpXG5cbiAgICAgIHZhciB2b2x1bWUgPSBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxmdW5jdGlvbihjKSB7IHJldHVybiBjLnZhbHVlcy5sZW5ndGggfSlcbiAgICAgICAgLCBwZXJjZW50ID0gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsZnVuY3Rpb24oYykgeyByZXR1cm4gYy5wZXJjZW50IH0pXG4gICAgICAgICwgaW1wb3J0YW5jZSA9IGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMueSB9KVxuXG5cbiAgICAgIHZhciB3cmFwID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICwgdndyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudm9sdW1lXCIsXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ2b2x1bWVcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDMwKVwiKVxuICAgICAgICAsIHB3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnBlcmNlbnRcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBlcmNlbnRcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDkwKVwiKVxuICAgICAgICAsIGl3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmltcG9ydGFuY2VcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcImltcG9ydGFuY2VcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoLTYwLDE1MClcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHZ3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiVmlzaXRzXCIpXG4gICAgICAgIC5hdHRyKFwic3R5bGVcIixcInRpdGxlXCIpXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKHZ3cmFwLHZvbHVtZSlcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgwLDIpXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShwd3JhcCxcInRleHRcIixcInRleHRcIikudGV4dChcIlNoYXJlIG9mIHRpbWVcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcblxuICAgICAgc2ltcGxlVGltZXNlcmllcyhwd3JhcCxwZXJjZW50KVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDAsMilcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGl3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiSW1wb3J0YW5jZVwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKGl3cmFwLGltcG9ydGFuY2UpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMCwyKVwiKVxuXG5cbiAgICAgIHJldHVyblxuICAgIH0pXG4gICAgLmRyYXcoKVxuXG4gIHZhciBiZWZvcmVfYWdnID0gYmVmb3JlX3N0YWNrZWQucmVkdWNlKChvLHgpID0+IHsgcmV0dXJuIHgucmVkdWNlKChwLGMpID0+IHsgcFtjLnhdID0gKHBbYy54XSB8fCAwKSArIGMueTsgcmV0dXJuIHB9LG8pIH0se30pXG4gICAgLCBhZnRlcl9hZ2cgPSBhZnRlcl9zdGFja2VkLnJlZHVjZSgobyx4KSA9PiB7IHJldHVybiB4LnJlZHVjZSgocCxjKSA9PiB7IHBbYy54XSA9IChwW2MueF0gfHwgMCkgKyBjLnk7IHJldHVybiBwfSxvKSB9LHt9KVxuXG5cbiAgdmFyIGxvY2FsX2JlZm9yZSA9IE9iamVjdC5rZXlzKGJlZm9yZV9hZ2cpLnJlZHVjZSgobWluYXJyLGMpID0+IHtcbiAgICAgIGlmIChtaW5hcnJbMF0gPj0gYmVmb3JlX2FnZ1tjXSkgcmV0dXJuIFtiZWZvcmVfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG4gIHZhciBsb2NhbF9hZnRlciA9IE9iamVjdC5rZXlzKGFmdGVyX2FnZykucmVkdWNlKChtaW5hcnIsYykgPT4ge1xuICAgICAgaWYgKG1pbmFyclswXSA+PSBhZnRlcl9hZ2dbY10pIHJldHVybiBbYWZ0ZXJfYWdnW2NdLGNdO1xuICAgICAgaWYgKG1pbmFyci5sZW5ndGggPiAxKSBtaW5hcnJbMF0gPSAtMTtcbiAgICAgIHJldHVybiBtaW5hcnJcbiAgICB9LFtJbmZpbml0eV1cbiAgKVsxXVxuXG5cbiAgdmFyIGJlZm9yZV9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYmVmb3JlKSldXG4gICAgLCBhZnRlcl9saW5lID0gYnVja2V0c1tidWNrZXRzLmluZGV4T2YocGFyc2VJbnQobG9jYWxfYWZ0ZXIpKV1cblxuICB2YXIgc3ZnID0gc3RyZWFtXG4gICAgLl9zdmcuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIikuc3R5bGUoXCJkaXNwbGF5XCIsXCJibG9ja1wiKVxuXG5cbiAgdmFyIGJsaW5lID0gZDNfdXBkYXRlYWJsZShzdmcuc2VsZWN0QWxsKFwiLmJlZm9yZS1jYW52YXNcIiksXCJnLmxpbmUtd3JhcFwiLFwiZ1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImxpbmUtd3JhcFwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmxpbmUsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAuYXR0cihcInkxXCIsIDApXG4gICAgLmF0dHIoXCJ5MlwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcIngxXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcbiAgICAuYXR0cihcIngyXCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGJsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpICsgMTApXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcInN0YXJ0XCIpXG4gICAgLnRleHQoXCJDb25zaWRlcmF0aW9uIFN0YWdlXCIpXG5cblxuICB2YXIgYWxpbmUgPSBkM191cGRhdGVhYmxlKHN2Zy5zZWxlY3RBbGwoXCIuYWZ0ZXItY2FudmFzXCIpLFwiZy5saW5lLXdyYXBcIixcImdcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJsaW5lLXdyYXBcIilcblxuICBkM191cGRhdGVhYmxlKGFsaW5lLFwibGluZVwiLFwibGluZVwiKVxuICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgIC5hdHRyKFwieTJcIiwgc3RyZWFtLl9oZWlnaHQrMjApXG4gICAgLmF0dHIoXCJ4MVwiLCBzdHJlYW0uX2FmdGVyX3NjYWxlKGFmdGVyX2xpbmUpKVxuICAgIC5hdHRyKFwieDJcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSlcblxuICBkM191cGRhdGVhYmxlKGFsaW5lLFwidGV4dFwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwieVwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcInhcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSAtIDEwKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAudGV4dChcIlZhbGlkYXRpb24gLyBSZXNlYXJjaFwiKVxuXG5cblxuICByZXR1cm4ge1xuICAgIFwiY29uc2lkZXJhdGlvblwiOiBcIlwiICsgYmVmb3JlX2xpbmUsXG4gICAgXCJ2YWxpZGF0aW9uXCI6IFwiLVwiICsgYWZ0ZXJfbGluZVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3QmVmb3JlQW5kQWZ0ZXIodGFyZ2V0LGRhdGEpIHtcblxuICB2YXIgYmVmb3JlID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuYmVmb3JlXCIsXCJkaXZcIixkYXRhLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgLmNsYXNzZWQoXCJiZWZvcmVcIix0cnVlKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMHB4XCIpXG5cbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJyZ2IoMjI3LCAyMzUsIDI0MClcIilcblxuICBkM191cGRhdGVhYmxlKGJlZm9yZSxcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiQ2F0ZWdvcnkgYWN0aXZpdHkgYmVmb3JlIGFycml2aW5nIGFuZCBhZnRlciBsZWF2aW5nIHNpdGVcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzMzM1wiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIwcHhcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcblxuICB2YXIgaW5uZXIgPSBkM191cGRhdGVhYmxlKGJlZm9yZSxcIi5pbm5lclwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJpbm5lclwiLHRydWUpXG4gICAgLnN0eWxlKFwicG9zaXRpb25cIixcImFic29sdXRlXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShpbm5lcixcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiU29ydCBCeVwiKVxuICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQwcHhcIilcblxuXG5cbiAgaW5uZXIuc2VsZWN0QWxsKFwic2VsZWN0XCIpXG4gICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxNDBweFwiKVxuXG5cbiAgdmFyIGNiID0gY29tcF9idWJibGUoYmVmb3JlKVxuICAgIC5yb3dzKGRhdGEuYmVmb3JlX2NhdGVnb3JpZXMpXG4gICAgLmFmdGVyKGRhdGEuYWZ0ZXJfY2F0ZWdvcmllcylcbiAgICAuZHJhdygpXG5cbiAgY2IuX3N2Zy5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcImF1dG9cIilcblxuXG4gIHJldHVybiBpbm5lclxuXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBQaWUodGFyZ2V0KSB7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cblBpZS5wcm90b3R5cGUgPSB7XG4gICAgcmFkaXVzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmFkaXVzXCIsdmFsKVxuICAgIH1cbiAgLCBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICBcbiAgICB2YXIgZCA9IGQzLmVudHJpZXMoe1xuICAgICAgICBzYW1wbGU6IHRoaXMuX2RhdGEuc2FtcGxlXG4gICAgICAsIHBvcHVsYXRpb246IHRoaXMuX2RhdGEucG9wdWxhdGlvbiAtIHRoaXMuX2RhdGEuc2FtcGxlXG4gICAgfSlcbiAgICBcbiAgICB2YXIgY29sb3IgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgICAgLnJhbmdlKFtcIiM5OGFiYzVcIiwgXCIjOGE4OWE2XCIsIFwiIzdiNjg4OFwiLCBcIiM2YjQ4NmJcIiwgXCIjYTA1ZDU2XCIsIFwiI2QwNzQzY1wiLCBcIiNmZjhjMDBcIl0pO1xuICAgIFxuICAgIHZhciBhcmMgPSBkMy5zdmcuYXJjKClcbiAgICAgICAgLm91dGVyUmFkaXVzKHRoaXMuX3JhZGl1cyAtIDEwKVxuICAgICAgICAuaW5uZXJSYWRpdXMoMCk7XG4gICAgXG4gICAgdmFyIHBpZSA9IGQzLmxheW91dC5waWUoKVxuICAgICAgICAuc29ydChudWxsKVxuICAgICAgICAudmFsdWUoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSk7XG4gICAgXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKHgpe3JldHVybiAxfSlcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCA1MClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgNTIpXG4gIFxuICAgIHN2ZyA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiZ1wiLFwiZ1wiKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIDI1ICsgXCIsXCIgKyAyNiArIFwiKVwiKTtcbiAgICBcbiAgICB2YXIgZyA9IGQzX3NwbGF0KHN2ZyxcIi5hcmNcIixcImdcIixwaWUoZCksZnVuY3Rpb24oeCl7IHJldHVybiB4LmRhdGEua2V5IH0pXG4gICAgICAuY2xhc3NlZChcImFyY1wiLHRydWUpXG4gIFxuICAgIGQzX3VwZGF0ZWFibGUoZyxcInBhdGhcIixcInBhdGhcIilcbiAgICAgIC5hdHRyKFwiZFwiLCBhcmMpXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGNvbG9yKGQuZGF0YS5rZXkpIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHBpZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBQaWUodGFyZ2V0KVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgcGllIGZyb20gJy4uLy4uL2dlbmVyaWMvcGllJ1xuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSwgdGFyZ2V0LCByYWRpdXNfc2NhbGUsIHgpIHtcbiAgdmFyIGRhdGEgPSBkYXRhXG4gICAgLCBkdGhpcyA9IGQzX2NsYXNzKGQzLnNlbGVjdCh0YXJnZXQpLFwicGllLXN1bW1hcnktYmxvY2tcIilcblxuICBwaWUoZHRoaXMpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAucmFkaXVzKHJhZGl1c19zY2FsZShkYXRhLnBvcHVsYXRpb24pKVxuICAgIC5kcmF3KClcblxuICB2YXIgZncgPSBkM19jbGFzcyhkdGhpcyxcImZ3XCIpXG4gICAgLmNsYXNzZWQoXCJmd1wiLHRydWUpXG5cbiAgdmFyIGZ3MiA9IGQzX2NsYXNzKGR0aGlzLFwiZncyXCIpXG4gICAgLnRleHQoZDMuZm9ybWF0KFwiJVwiKShkYXRhLnNhbXBsZS9kYXRhLnBvcHVsYXRpb24pKVxuXG4gIGQzX2NsYXNzKGZ3LFwic2FtcGxlXCIsXCJzcGFuXCIpXG4gICAgLnRleHQoZDMuZm9ybWF0KFwiLFwiKShkYXRhLnNhbXBsZSkpXG5cbiAgZDNfY2xhc3MoZncsXCJ2c1wiLFwic3BhblwiKVxuICAgIC5odG1sKFwiPGJyPiBvdXQgb2YgPGJyPlwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjg4ZW1cIilcblxuICBkM19jbGFzcyhmdyxcInBvcHVsYXRpb25cIixcInNwYW5cIilcbiAgICAudGV4dChkMy5mb3JtYXQoXCIsXCIpKGRhdGEucG9wdWxhdGlvbikpXG5cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IHtidWlsZFN1bW1hcnlCbG9ja30gZnJvbSAnLi9zYW1wbGVfdnNfcG9wJ1xuXG5pbXBvcnQgKiBhcyB0aW1lc2VyaWVzIGZyb20gJy4uLy4uL2dlbmVyaWMvdGltZXNlcmllcydcblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdUaW1lc2VyaWVzKHRhcmdldCxkYXRhLHJhZGl1c19zY2FsZSkge1xuICB2YXIgdyA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZGl2LnRpbWVzZXJpZXNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidGltZXNlcmllc1wiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjYwJVwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsIFwiMTBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTI3cHhcIilcblxuXG5cbiAgdmFyIHEgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdi50aW1lc2VyaWVzLWRldGFpbHNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidGltZXNlcmllcy1kZXRhaWxzXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDAlXCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjE1cHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjU3cHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTI3cHhcIilcblxuXG5cblxuXG4gIHZhciBwb3AgPSBkM191cGRhdGVhYmxlKHEsXCIucG9wXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInBvcFwiLHRydWUpXG5cbiAgZDNfdXBkYXRlYWJsZShwb3AsXCIuZXhcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcImV4XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcImdyZXlcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG4gIGQzX3VwZGF0ZWFibGUocG9wLFwiLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiM3B4XCIpXG4gICAgLnRleHQoXCJhbGxcIilcblxuXG5cbiAgdmFyIHNhbXAgPSBkM191cGRhdGVhYmxlKHEsXCIuc2FtcFwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJzYW1wXCIsdHJ1ZSlcblxuICBkM191cGRhdGVhYmxlKHNhbXAsXCIuZXhcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcImV4XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjBweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiMwODFkNThcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG5cbiAgZDNfdXBkYXRlYWJsZShzYW1wLFwiLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJ0aXRsZVwiLHRydWUpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiM3B4XCIpXG4gICAgLnRleHQoXCJmaWx0ZXJlZFwiKVxuXG5cbiAgdmFyIGRldGFpbHMgPSBkM191cGRhdGVhYmxlKHEsXCIuZGVldHNcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwiZGVldHNcIix0cnVlKVxuXG5cblxuXG4gIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiRmlsdGVyZWQgdmVyc3VzIEFsbCBWaWV3c1wiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG5cblxuXG5cblxuICB0aW1lc2VyaWVzWydkZWZhdWx0J10odylcbiAgICAuZGF0YSh7XCJrZXlcIjpcInlcIixcInZhbHVlc1wiOmRhdGF9KVxuICAgIC5oZWlnaHQoODApXG4gICAgLm9uKFwiaG92ZXJcIixmdW5jdGlvbih4KSB7XG4gICAgICB2YXIgeHggPSB7fVxuICAgICAgeHhbeC5rZXldID0ge3NhbXBsZTogeC52YWx1ZSwgcG9wdWxhdGlvbjogeC52YWx1ZTIgfVxuICAgICAgZGV0YWlscy5kYXR1bSh4eClcblxuICAgICAgZDNfdXBkYXRlYWJsZShkZXRhaWxzLFwiLnRleHRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInRleHRcIix0cnVlKVxuICAgICAgICAudGV4dChcIkAgXCIgKyB4LmhvdXIgKyBcIjpcIiArICh4Lm1pbnV0ZS5sZW5ndGggPiAxID8geC5taW51dGUgOiBcIjBcIiArIHgubWludXRlKSApXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiNDlweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZShkZXRhaWxzLFwiLnBpZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicGllXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxNXB4XCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IE9iamVjdC5rZXlzKHgpLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiB4W2tdIH0pWzBdXG4gICAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgICB9KVxuICAgIH0pXG4gICAgLmRyYXcoKVxuXG59XG4iLCJpbXBvcnQge3RhYmxlfSBmcm9tICd0YWJsZSdcbmltcG9ydCB7ZDNfY2xhc3MsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5cbmltcG9ydCB7ZHJhd0NhdGVnb3J5LCBkcmF3Q2F0ZWdvcnlEaWZmfSBmcm9tICcuL2NhdGVnb3J5J1xuaW1wb3J0IHtkcmF3U3RyZWFtLCBkcmF3QmVmb3JlQW5kQWZ0ZXJ9IGZyb20gJy4vYmVmb3JlX2FuZF9hZnRlcidcbmltcG9ydCB7YnVpbGRTdW1tYXJ5QmxvY2t9IGZyb20gJy4vc2FtcGxlX3ZzX3BvcCdcbmltcG9ydCB7ZHJhd1RpbWVzZXJpZXN9IGZyb20gJy4vdGltaW5nJ1xuaW1wb3J0IHtkcmF3S2V5d29yZHMsIGRyYXdLZXl3b3JkRGlmZn0gZnJvbSAnLi9rZXl3b3JkcydcblxuaW1wb3J0IGhlYWRlciBmcm9tICcuLi8uLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCAnLi9zdW1tYXJ5LmNzcydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3VtbWFyeV92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN1bW1hcnlWaWV3KHRhcmdldClcbn1cblxuZXhwb3J0IGNsYXNzIFN1bW1hcnlWaWV3IGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsIFwidGltaW5nXCIsIFwiY2F0ZWdvcnlcIiwgXCJrZXl3b3Jkc1wiLCBcImJlZm9yZVwiLCBcImFmdGVyXCJdIH1cblxuICBkcmF3KCkge1xuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwic3VtbWFyeS12aWV3XCIpXG5cbiAgICBoZWFkZXIod3JhcClcbiAgICAgIC50ZXh0KFwiU3VtbWFyeVwiKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIHRzd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJ0cy1yb3dcIilcbiAgICAgICwgcGlld3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJwaWUtcm93XCIpXG4gICAgICAsIGNhdHdyYXAgPSBkM19jbGFzcyh3cmFwLFwiY2F0LXJvd1wiKS5jbGFzc2VkKFwiZGFzaC1yb3dcIix0cnVlKVxuICAgICAgLCBrZXl3cmFwID0gZDNfY2xhc3Mod3JhcCxcImtleS1yb3dcIilcbiAgICAgICwgYmF3cmFwID0gZDNfY2xhc3Mod3JhcCxcImJhLXJvd1wiKSBcbiAgICAgICwgc3RyZWFtd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJzdHJlYW0tYmEtcm93XCIpIFxuXG5cbiAgICB2YXIgcmFkaXVzX3NjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oW3RoaXMuX2RhdGEuZG9tYWlucy5wb3B1bGF0aW9uLHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbl0pXG4gICAgICAucmFuZ2UoWzIwLDM1XSlcblxuICAgIHRhYmxlKHBpZXdyYXApXG4gICAgICAuZGF0YSh7XCJrZXlcIjpcIlRcIixcInZhbHVlc1wiOlt0aGlzLmRhdGEoKV19KVxuICAgICAgLnNraXBfb3B0aW9uKHRydWUpXG4gICAgICAucmVuZGVyKFwiZG9tYWluc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5yZW5kZXIoXCJhcnRpY2xlc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5yZW5kZXIoXCJzZXNzaW9uc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5yZW5kZXIoXCJ2aWV3c1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcblxuXG4gICAgZHJhd1RpbWVzZXJpZXModHN3cmFwLHRoaXMuX3RpbWluZyxyYWRpdXNfc2NhbGUpXG5cblxuICAgIHRyeSB7XG4gICAgZHJhd0NhdGVnb3J5KGNhdHdyYXAsdGhpcy5fY2F0ZWdvcnkpXG4gICAgZHJhd0NhdGVnb3J5RGlmZihjYXR3cmFwLHRoaXMuX2NhdGVnb3J5KVxuICAgIH0gY2F0Y2goZSkge31cblxuICAgIC8vZHJhd0tleXdvcmRzKGtleXdyYXAsdGhpcy5fa2V5d29yZHMpXG4gICAgLy9kcmF3S2V5d29yZERpZmYoa2V5d3JhcCx0aGlzLl9rZXl3b3JkcylcblxuICAgIHZhciBpbm5lciA9IGRyYXdCZWZvcmVBbmRBZnRlcihiYXdyYXAsdGhpcy5fYmVmb3JlKVxuXG4gICAgc2VsZWN0KGlubmVyKVxuICAgICAgLm9wdGlvbnMoW1xuICAgICAgICAgIHtcImtleVwiOlwiSW1wb3J0YW5jZVwiLFwidmFsdWVcIjpcInBlcmNlbnRfZGlmZlwifVxuICAgICAgICAsIHtcImtleVwiOlwiQWN0aXZpdHlcIixcInZhbHVlXCI6XCJzY29yZVwifVxuICAgICAgICAsIHtcImtleVwiOlwiUG9wdWxhdGlvblwiLFwidmFsdWVcIjpcInBvcFwifVxuICAgICAgXSlcbiAgICAgIC5zZWxlY3RlZCh0aGlzLl9iZWZvcmUuc29ydGJ5IHx8IFwiXCIpXG4gICAgICAub24oXCJzZWxlY3RcIiwgdGhpcy5vbihcImJhLnNvcnRcIikpXG4gICAgICAuZHJhdygpXG5cblxuICAgIGRyYXdTdHJlYW0oc3RyZWFtd3JhcCx0aGlzLl9iZWZvcmUuYmVmb3JlX2NhdGVnb3JpZXMsdGhpcy5fYmVmb3JlLmFmdGVyX2NhdGVnb3JpZXMpXG5cblxuICAgIHJldHVybiB0aGlzXG4gIH1cbn0gICAgICAgICAgICAgICBcbiIsImV4cG9ydCB2YXIgYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKHgqNjApIH0pXG5idWNrZXRzID0gYnVja2V0cy5jb25jYXQoWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZygteCo2MCkgfSkpXG5cbiBcblxuLy8gUm9sbHVwIG92ZXJhbGwgYmVmb3JlIGFuZCBhZnRlciBkYXRhXG5cbmNvbnN0IGJ1Y2tldFdpdGhQcmVmaXggPSAocHJlZml4LHgpID0+IHByZWZpeCArIHgudGltZV9kaWZmX2J1Y2tldFxuY29uc3Qgc3VtVmlzaXRzID0gKHgpID0+IGQzLnN1bSh4LHkgPT4geS52aXNpdHMpIFxuXG5leHBvcnQgZnVuY3Rpb24gcm9sbHVwQmVmb3JlQW5kQWZ0ZXIoYmVmb3JlX3VybHMsIGFmdGVyX3VybHMpIHtcblxuICBjb25zdCBiZWZvcmVfcm9sbHVwID0gZDMubmVzdCgpXG4gICAgLmtleShidWNrZXRXaXRoUHJlZml4LmJpbmQodGhpcyxcIlwiKSlcbiAgICAucm9sbHVwKHN1bVZpc2l0cylcbiAgICAubWFwKGJlZm9yZV91cmxzKVxuXG4gIGNvbnN0IGFmdGVyX3JvbGx1cCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoYnVja2V0V2l0aFByZWZpeC5iaW5kKHRoaXMsXCItXCIpKVxuICAgIC5yb2xsdXAoc3VtVmlzaXRzKVxuICAgIC5tYXAoYWZ0ZXJfdXJscylcblxuICByZXR1cm4gYnVja2V0cy5tYXAoeCA9PiBiZWZvcmVfcm9sbHVwW3hdIHx8IGFmdGVyX3JvbGx1cFt4XSB8fCAwKVxufVxuXG5cblxuXG4vLyBLZXl3b3JkIHByb2Nlc3NpbmcgaGVscGVyc1xuXG5jb25zdCBTVE9QV09SRFMgPVtcbiAgICBcInRoYXRcIixcInRoaXNcIixcIndoYXRcIixcImJlc3RcIixcIm1vc3RcIixcImZyb21cIixcInlvdXJcIlxuICAsIFwiaGF2ZVwiLFwiZmlyc3RcIixcIndpbGxcIixcInRoYW5cIixcInNheXNcIixcImxpa2VcIixcImludG9cIixcImFmdGVyXCIsXCJ3aXRoXCJcbl1cbmNvbnN0IGNsZWFuQW5kU3BsaXRVUkwgPSAoZG9tYWluLHVybCkgPT4ge1xuICByZXR1cm4gdXJsLnRvTG93ZXJDYXNlKCkuc3BsaXQoZG9tYWluKVsxXS5zcGxpdChcIi9cIikucmV2ZXJzZSgpWzBdLnJlcGxhY2UoXCJfXCIsXCItXCIpLnNwbGl0KFwiLVwiKVxufVxuY29uc3QgaXNXb3JkID0gKHgpID0+IHtcbiAgcmV0dXJuIHgubWF0Y2goL1xcZCsvZykgPT0gbnVsbCAmJiBcbiAgICB4LmluZGV4T2YoXCIsXCIpID09IC0xICYmIFxuICAgIHguaW5kZXhPZihcIj9cIikgPT0gLTEgJiYgXG4gICAgeC5pbmRleE9mKFwiLlwiKSA9PSAtMSAmJiBcbiAgICB4LmluZGV4T2YoXCI6XCIpID09IC0xICYmIFxuICAgIHBhcnNlSW50KHgpICE9IHggJiYgXG4gICAgeC5sZW5ndGggPiAzXG59XG5cblxuY29uc3QgdXJsUmVkdWNlciA9IChwLGMpID0+IHtcbiAgcFtjLnVybF0gPSAocFtjLnVybF0gfHwgMCkgKyBjLnZpc2l0c1xuICByZXR1cm4gcFxufVxuY29uc3QgdXJsQnVja2V0UmVkdWNlciA9IChwcmVmaXgsIHAsYykgPT4ge1xuICBwW2MudXJsXSA9IHBbYy51cmxdIHx8IHt9XG4gIHBbYy51cmxdW1widXJsXCJdID0gYy51cmxcblxuICBwW2MudXJsXVtwcmVmaXggKyBjLnRpbWVfZGlmZl9idWNrZXRdID0gYy52aXNpdHNcbiAgcmV0dXJuIHBcbn1cbmNvbnN0IHVybFRvS2V5d29yZHNPYmpSZWR1Y2VyID0gKGRvbWFpbiwgcCxjKSA9PiB7XG4gIGNsZWFuQW5kU3BsaXRVUkwoZG9tYWluLGMua2V5KS5tYXAoeCA9PiB7XG4gICAgaWYgKGlzV29yZCh4KSAmJiBTVE9QV09SRFMuaW5kZXhPZih4KSA9PSAtMSkge1xuICAgICAgcFt4XSA9IHBbeF0gfHwge31cbiAgICAgIHBbeF0ua2V5ID0geFxuICAgICAgT2JqZWN0LmtleXMoYy52YWx1ZSkubWFwKHEgPT4ge1xuICAgICAgICBwW3hdW3FdID0gKHBbeF1bcV0gfHwgMCkgKyBjLnZhbHVlW3FdXG4gICAgICB9KVxuICAgIH1cbiAgfSlcbiAgcmV0dXJuIHBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVybHNBbmRLZXl3b3JkcyhiZWZvcmVfdXJscywgYWZ0ZXJfdXJscywgZG9tYWluKSB7XG5cbiAgICBjb25zdCB1cmxfdm9sdW1lID0ge31cbiAgICBiZWZvcmVfdXJscy5yZWR1Y2UodXJsUmVkdWNlcix1cmxfdm9sdW1lKVxuICAgIGFmdGVyX3VybHMucmVkdWNlKHVybFJlZHVjZXIsdXJsX3ZvbHVtZSlcblxuICAgIGNvbnN0IHVybF90cyA9IHt9XG4gICAgYmVmb3JlX3VybHMucmVkdWNlKHVybEJ1Y2tldFJlZHVjZXIuYmluZCh0aGlzLFwiXCIpLHVybF90cylcbiAgICBhZnRlcl91cmxzLnJlZHVjZSh1cmxCdWNrZXRSZWR1Y2VyLmJpbmQodGhpcyxcIi1cIiksdXJsX3RzKVxuXG4gICAgY29uc3QgdXJscyA9IGQzLmVudHJpZXModXJsX3ZvbHVtZSlcbiAgICAgIC5zb3J0KChwLGMpID0+IHsgcmV0dXJuIGQzLmRlc2NlbmRpbmcocC52YWx1ZSxjLnZhbHVlKSB9KVxuICAgICAgLnNsaWNlKDAsMTAwMClcbiAgICAgIC5tYXAoeCA9PiB1cmxfdHNbeC5rZXldKVxuICAgICAgLm1hcChmdW5jdGlvbih4KXsgXG4gICAgICAgIHgua2V5ID0geC51cmxcbiAgICAgICAgeC52YWx1ZXMgPSBidWNrZXRzLm1hcCh5ID0+IHhbeV0gfHwgMClcbiAgICAgICAgeC50b3RhbCA9IGQzLnN1bShidWNrZXRzLm1hcChmdW5jdGlvbihiKSB7IHJldHVybiB4W2JdIHx8IDAgfSkpXG4gICAgICAgIHJldHVybiB4XG4gICAgICB9KVxuXG4gICAgY29uc3Qga2V5d29yZHMgPSB7fVxuICAgIGQzLmVudHJpZXModXJsX3RzKVxuICAgICAgLnJlZHVjZSh1cmxUb0tleXdvcmRzT2JqUmVkdWNlci5iaW5kKGZhbHNlLGRvbWFpbiksa2V5d29yZHMpXG4gICAgXG4gICAgXG4gICAgY29uc3Qga3dzID0gT2JqZWN0LmtleXMoa2V5d29yZHMpXG4gICAgICAubWFwKGZ1bmN0aW9uKGspIHsgcmV0dXJuIE9iamVjdC5hc3NpZ24oa2V5d29yZHNba10se2tleTprfSkgfSlcbiAgICAgIC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgIHgudmFsdWVzID0gYnVja2V0cy5tYXAoeSA9PiB4W3ldIHx8IDApXG4gICAgICAgIHgudG90YWwgPSBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKVxuICAgICAgICByZXR1cm4geFxuICAgICAgfSkuc29ydCgocCxjKSA9PiB7XG4gICAgICAgIHJldHVybiBjLnRvdGFsIC0gcC50b3RhbFxuICAgICAgfSlcblxuICAgIHJldHVybiB7XG4gICAgICB1cmxzLFxuICAgICAga3dzXG4gICAgfVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZENvbnNpZChzb3J0ZWRfdXJscywgc29ydGVkX2t3cywgYmVmb3JlX3BvcywgYWZ0ZXJfcG9zKSB7XG4gICAgY29uc3QgY29uc2lkX2J1Y2tldHMgPSBidWNrZXRzLmZpbHRlcigoeCxpKSA9PiAhKChpIDwgYmVmb3JlX3BvcykgfHwgKGkgPiBidWNrZXRzLmxlbmd0aC8yIC0gMSApKSApXG4gICAgY29uc3QgdmFsaWRfYnVja2V0cyAgPSBidWNrZXRzLmZpbHRlcigoeCxpKSA9PiAhKChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKSkgKVxuICAgIGZ1bmN0aW9uIGNvbnRhaW5zUmVkdWNlcih4LHAsYykge1xuICAgICAgcCArPSB4W2NdIHx8IDA7XG4gICAgICByZXR1cm4gcFxuICAgIH1cbiAgICBmdW5jdGlvbiBmaWx0ZXJCeUJ1Y2tldHMoX2J1Y2tldHMseCkge1xuICAgICAgcmV0dXJuIF9idWNrZXRzLnJlZHVjZShjb250YWluc1JlZHVjZXIuYmluZChmYWxzZSx4KSwwKVxuICAgIH1cbiAgICB2YXIgdXJsc19jb25zaWQgPSBzb3J0ZWRfdXJscy5maWx0ZXIoIGZpbHRlckJ5QnVja2V0cy5iaW5kKGZhbHNlLGNvbnNpZF9idWNrZXRzKSApXG4gICAgICAsIGt3c19jb25zaWQgPSBzb3J0ZWRfa3dzLmZpbHRlciggZmlsdGVyQnlCdWNrZXRzLmJpbmQoZmFsc2UsY29uc2lkX2J1Y2tldHMpIClcblxuICAgIHZhciB1cmxzX3ZhbGlkID0gc29ydGVkX3VybHMuZmlsdGVyKCBmaWx0ZXJCeUJ1Y2tldHMuYmluZChmYWxzZSx2YWxpZF9idWNrZXRzKSApXG4gICAgICAsIGt3c192YWxpZCA9IHNvcnRlZF9rd3MuZmlsdGVyKCBmaWx0ZXJCeUJ1Y2tldHMuYmluZChmYWxzZSx2YWxpZF9idWNrZXRzKSApXG5cbiAgICByZXR1cm4ge1xuICAgICAgICB1cmxzX2NvbnNpZFxuICAgICAgLCB1cmxzX3ZhbGlkXG4gICAgICAsIGt3c19jb25zaWRcbiAgICAgICwga3dzX3ZhbGlkXG4gICAgfVxufVxuXG5cblxuXG4vLyBCdWlsZCBkYXRhIGZvciBzdW1tYXJ5XG5cbmZ1bmN0aW9uIG51bVZpZXdzKGRhdGEpIHsgXG4gIHJldHVybiBkYXRhLmxlbmd0aCBcbn1cbmZ1bmN0aW9uIGF2Z1ZpZXdzKGRhdGEpIHtcbiAgcmV0dXJuIHBhcnNlSW50KGRhdGEucmVkdWNlKChwLGMpID0+IHAgKyBjLnRvdGFsLDApL2RhdGEubGVuZ3RoKVxufVxuZnVuY3Rpb24gbWVkaWFuVmlld3MoZGF0YSkge1xuICByZXR1cm4gKGRhdGFbcGFyc2VJbnQoZGF0YS5sZW5ndGgvMildIHx8IHt9KS50b3RhbCB8fCAwXG59XG5mdW5jdGlvbiBzdW1tYXJpemVWaWV3cyhuYW1lLCBmbiwgYWxsLCBjb25zaWQsIHZhbGlkKSB7XG4gIHJldHVybiB7bmFtZTogbmFtZSwgYWxsOiBmbihhbGwpLCBjb25zaWRlcmF0aW9uOiBmbihjb25zaWQpLCB2YWxpZGF0aW9uOiBmbih2YWxpZCl9XG59XG5leHBvcnQgZnVuY3Rpb24gc3VtbWFyaXplRGF0YShhbGwsY29uc2lkLHZhbGlkKSB7XG4gIHJldHVybiBbXG4gICAgICBzdW1tYXJpemVWaWV3cyhcIkRpc3RpbmN0IFVSTHNcIixudW1WaWV3cyxhbGwsY29uc2lkLHZhbGlkKVxuICAgICwgc3VtbWFyaXplVmlld3MoXCJBdmVyYWdlIFZpZXdzXCIsYXZnVmlld3MsYWxsLGNvbnNpZCx2YWxpZClcbiAgICAsIHN1bW1hcml6ZVZpZXdzKFwiTWVkaWFuIFZpZXdzXCIsbWVkaWFuVmlld3MsYWxsLGNvbnNpZCx2YWxpZClcbiAgXVxufVxuXG5cblxuLy8gUHJvY2VzcyByZWxhdGl2ZSB0aW1pbmcgZGF0YVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvY2Vzc0RhdGEoYmVmb3JlX3VybHMsIGFmdGVyX3VybHMsIGJlZm9yZV9wb3MsIGFmdGVyX3BvcywgZG9tYWluKSB7XG5cbiAgICBjb25zdCB7IHVybHMgLCBrd3MgfSA9IHVybHNBbmRLZXl3b3JkcyhiZWZvcmVfdXJscywgYWZ0ZXJfdXJscywgZG9tYWluKVxuICAgIGNvbnN0IHsgdXJsc19jb25zaWQgLCB1cmxzX3ZhbGlkICwga3dzX2NvbnNpZCAsIGt3c192YWxpZCB9ID0gdmFsaWRDb25zaWQodXJscywga3dzLCBiZWZvcmVfcG9zLCBhZnRlcl9wb3MpXG5cbiAgICBjb25zdCB1cmxfc3VtbWFyeSA9IHN1bW1hcml6ZURhdGEodXJscywgdXJsc19jb25zaWQsIHVybHNfdmFsaWQpXG4gICAgY29uc3Qga3dzX3N1bW1hcnkgPSBzdW1tYXJpemVEYXRhKGt3cywga3dzX2NvbnNpZCwga3dzX3ZhbGlkIClcblxuICAgIHJldHVybiB7XG4gICAgICB1cmxfc3VtbWFyeSxcbiAgICAgIGt3c19zdW1tYXJ5LFxuICAgICAgdXJscyxcbiAgICAgIHVybHNfY29uc2lkICxcbiAgICAgIHVybHNfdmFsaWQgLFxuICAgICAga3dzLFxuICAgICAga3dzX2NvbnNpZCAsXG4gICAgICBrd3NfdmFsaWQgXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgZDNfY2xhc3MsIG5vb3AsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCB7dGFibGUsIHN1bW1hcnlfdGFibGV9IGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzLCBiZWZvcmVfYWZ0ZXJfdGltZXNlcmllc30gZnJvbSAnY2hhcnQnXG5pbXBvcnQge3RhYnVsYXJfdGltZXNlcmllcywgdmVydGljYWxfb3B0aW9ufSBmcm9tICdjb21wb25lbnQnXG5cbmltcG9ydCB7cm9sbHVwQmVmb3JlQW5kQWZ0ZXIsIHByb2Nlc3NEYXRhLCBidWNrZXRzfSBmcm9tICcuL3JlZmluZV9yZWxhdGl2ZV9wcm9jZXNzJ1xuaW1wb3J0ICcuL3JlZmluZV9yZWxhdGl2ZS5jc3MnXG5cblxuZnVuY3Rpb24gc2VsZWN0T3B0aW9uUmVjdCh0ZCxvcHRpb25zLGJlZm9yZV9wb3MsYWZ0ZXJfcG9zKSB7XG5cbiAgdmFyIHN1YnNldCA9IHRkLnNlbGVjdEFsbChcInN2Z1wiKS5zZWxlY3RBbGwoXCJyZWN0XCIpXG4gICAgLmF0dHIoXCJmaWxsXCIsdW5kZWZpbmVkKS5maWx0ZXIoKHgsaSkgPT4ge1xuICAgICAgdmFyIHZhbHVlID0gb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZVxuICAgICAgaWYgKHZhbHVlID09IFwiYWxsXCIpIHJldHVybiBmYWxzZVxuICAgICAgaWYgKHZhbHVlID09IFwiY29uc2lkZXJhdGlvblwiKSByZXR1cm4gKGkgPCBiZWZvcmVfcG9zKSB8fCAoaSA+IGJ1Y2tldHMubGVuZ3RoLzIgLSAxIClcbiAgICAgIGlmICh2YWx1ZSA9PSBcInZhbGlkYXRpb25cIikgcmV0dXJuIChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKVxuICAgIH0pXG5cbiAgc3Vic2V0LmF0dHIoXCJmaWxsXCIsXCJncmV5XCIpXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVmaW5lX3JlbGF0aXZlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFJlZmluZVJlbGF0aXZlKHRhcmdldClcbn1cblxuY2xhc3MgUmVmaW5lUmVsYXRpdmUgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gICAgdGhpcy5fb3B0aW9ucyA9IFtcbiAgICAgICAge1wia2V5XCI6XCJBbGxcIixcInZhbHVlXCI6XCJhbGxcIiwgXCJzZWxlY3RlZFwiOjF9XG4gICAgICAsIHtcImtleVwiOlwiQ29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcImNvbnNpZGVyYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgICAsIHtcImtleVwiOlwiVmFsaWRhdGlvblwiLFwidmFsdWVcIjpcInZhbGlkYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgXVxuICAgIHRoaXMuX3N1bW1hcnlfaGVhZGVycyA9IFtcbiAgICAgICAge1wia2V5XCI6XCJuYW1lXCIsXCJ2YWx1ZVwiOlwiXCJ9XG4gICAgICAsIHtcImtleVwiOlwiYWxsXCIsXCJ2YWx1ZVwiOlwiQWxsXCJ9XG4gICAgICAsIHtcImtleVwiOlwiY29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcIkNvbnNpZGVyYXRpb25cIn1cbiAgICAgICwge1wia2V5XCI6XCJ2YWxpZGF0aW9uXCIsXCJ2YWx1ZVwiOlwiVmFsaWRhdGlvblwifVxuICAgIF1cbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiLFwiZG9tYWluXCIsXCJzdGFnZXNcIixcImJlZm9yZV91cmxzXCIsXCJhZnRlcl91cmxzXCIsXCJzdW1tYXJ5X2hlYWRlcnNcIixcIm9wdGlvbnNcIl0gfVxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgdGQgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJyZWZpbmUtcmVsYXRpdmVcIilcbiAgICB2YXIgYmVmb3JlX3VybHMgPSB0aGlzLl9iZWZvcmVfdXJsc1xuICAgICAgLCBhZnRlcl91cmxzID0gdGhpcy5fYWZ0ZXJfdXJsc1xuICAgICAgLCBkID0gdGhpcy5fZGF0YVxuICAgICAgLCBzdGFnZXMgPSB0aGlzLl9zdGFnZXNcbiAgICAgICwgc3VtbWFyeV9oZWFkZXJzID0gdGhpcy5fc3VtbWFyeV9oZWFkZXJzXG4gICAgICAsIG9wdGlvbnMgPSB0aGlzLl9vcHRpb25zXG5cbiAgICB2YXIgYmVmb3JlX3BvcywgYWZ0ZXJfcG9zO1xuXG4gICAgYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgaWYgKHN0YWdlcy5jb25zaWRlcmF0aW9uID09IHgpIGJlZm9yZV9wb3MgPSBpXG4gICAgICAgaWYgKHN0YWdlcy52YWxpZGF0aW9uID09IHgpIGFmdGVyX3BvcyA9IGlcbiAgICB9KVxuXG4gICAgdmFyIG92ZXJhbGxfcm9sbHVwID0gcm9sbHVwQmVmb3JlQW5kQWZ0ZXIoYmVmb3JlX3VybHMsIGFmdGVyX3VybHMpXG4gICAgdmFyIHtcbiAgICAgICAgdXJsX3N1bW1hcnlcbiAgICAgICwgdXJsc1xuICAgICAgLCB1cmxzX2NvbnNpZFxuICAgICAgLCB1cmxzX3ZhbGlkXG5cbiAgICAgICwga3dzX3N1bW1hcnlcbiAgICAgICwga3dzXG4gICAgICAsIGt3c19jb25zaWRcbiAgICAgICwga3dzX3ZhbGlkIFxuXG4gICAgfSA9IHByb2Nlc3NEYXRhKGJlZm9yZV91cmxzLGFmdGVyX3VybHMsYmVmb3JlX3BvcyxhZnRlcl9wb3MsZC5kb21haW4pXG5cblxuXG5cbiAgICBjb25zdCBzdW1tYXJ5X3JvdyA9IGQzX2NsYXNzKHRkLFwic3VtbWFyeS1yb3dcIilcblxuICAgIGQzX2NsYXNzKHN1bW1hcnlfcm93LFwidGl0bGVcIilcbiAgICAgIC50ZXh0KFwiQmVmb3JlIGFuZCBBZnRlcjogXCIgKyBkLmRvbWFpbilcblxuICAgIGJlZm9yZV9hZnRlcl90aW1lc2VyaWVzKHN1bW1hcnlfcm93KVxuICAgICAgLmRhdGEob3ZlcmFsbF9yb2xsdXApXG4gICAgICAuYmVmb3JlKGJlZm9yZV9wb3MpXG4gICAgICAuYWZ0ZXIoYWZ0ZXJfcG9zKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIHZvcHRpb25zID0gdmVydGljYWxfb3B0aW9uKHN1bW1hcnlfcm93KVxuICAgICAgLm9wdGlvbnMob3B0aW9ucylcbiAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgIG9wdGlvbnMubWFwKHogPT4gei5zZWxlY3RlZCA9IHgua2V5ID09IHoua2V5ID8gMTogMClcbiAgICAgICAgdm9wdGlvbnNcbiAgICAgICAgICAub3B0aW9ucyhvcHRpb25zKSBcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgc2VsZWN0T3B0aW9uUmVjdCh0ZCxvcHRpb25zLGJlZm9yZV9wb3MsYWZ0ZXJfcG9zKVxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcblxuICAgIGQzX2NsYXNzKHN1bW1hcnlfcm93LFwiZGVzY3JpcHRpb25cIilcbiAgICAgIC50ZXh0KFwiU2VsZWN0IGRvbWFpbnMgYW5kIGtleXdvcmRzIHRvIGJ1aWxkIGFuZCByZWZpbmUgeW91ciBnbG9iYWwgZmlsdGVyXCIpXG5cblxuXG5cbiAgICBjb25zdCB0YWJsZXMgPSBkM19jbGFzcyh0ZCxcInRhYmxlcy1yb3dcIilcblxuICAgIHN1bW1hcnlfdGFibGUoZDNfY2xhc3ModGFibGVzLFwidXJsXCIpKVxuICAgICAgLnRpdGxlKFwiVVJMIFN1bW1hcnlcIilcbiAgICAgIC5kYXRhKHVybF9zdW1tYXJ5KVxuICAgICAgLmhlYWRlcnMoc3VtbWFyeV9oZWFkZXJzKVxuICAgICAgLmRyYXcoKVxuXG4gICAgc3VtbWFyeV90YWJsZShkM19jbGFzcyh0YWJsZXMsXCJrd1wiKSlcbiAgICAgIC50aXRsZShcIktleXdvcmQgU3VtbWFyeVwiKVxuICAgICAgLmRhdGEoa3dzX3N1bW1hcnkpXG4gICAgICAuaGVhZGVycyhzdW1tYXJ5X2hlYWRlcnMpXG4gICAgICAuZHJhdygpXG5cblxuXG5cbiAgICBjb25zdCBtb2RpZnkgPSBkM19jbGFzcyh0ZCxcIm1vZGlmeS1yb3dcIilcblxuICAgIGQzX2NsYXNzKG1vZGlmeSxcImFjdGlvbi1oZWFkZXJcIilcbiAgICAgIC50ZXh0KFwiRXhwbG9yZSBhbmQgUmVmaW5lXCIpXG5cbiAgICB0YWJ1bGFyX3RpbWVzZXJpZXMoZDNfY2xhc3MobW9kaWZ5LFwidXJsLWRlcHRoXCIpKVxuICAgICAgLmhlYWRlcnMoW1wiQmVmb3JlXCIsXCJBZnRlclwiXSlcbiAgICAgIC5sYWJlbChcIlVSTFwiKVxuICAgICAgLmRhdGEodXJscylcbiAgICAgIC5zcGxpdCh0aGlzLmRvbWFpbigpKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdGFidWxhcl90aW1lc2VyaWVzKGQzX2NsYXNzKG1vZGlmeSxcImt3LWRlcHRoXCIpKVxuICAgICAgLmhlYWRlcnMoW1wiQmVmb3JlXCIsXCJBZnRlclwiXSlcbiAgICAgIC5sYWJlbChcIktleXdvcmRzXCIpXG4gICAgICAuZGF0YShrd3MpXG4gICAgICAuZHJhdygpXG5cbiAgfVxuXG59XG5cblxuIiwiZXhwb3J0IGNvbnN0IGNhdGVnb3J5V2VpZ2h0cyA9IChjYXRlZ29yaWVzKSA9PiB7XG4gIHJldHVybiBjYXRlZ29yaWVzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICBwW2Mua2V5XSA9ICgxICsgYy52YWx1ZXNbMF0ucGVyY2VudF9kaWZmKVxuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KVxufVxuXG5mdW5jdGlvbiBwcmVmaXhEb21haW5XZWlnaHRzUmVkdWNlcihwcmVmaXgsd2VpZ2h0cywgcCxjKSB7XG4gICAgICBwW2MuZG9tYWluXSA9IHBbYy5kb21haW5dIHx8IHt9XG4gICAgICBwW2MuZG9tYWluXVsnZG9tYWluJ10gPSBjLmRvbWFpblxuICAgICAgcFtjLmRvbWFpbl1bJ3dlaWdodGVkJ10gPSBjLnZpc2l0cyAqIHdlaWdodHNbYy5wYXJlbnRfY2F0ZWdvcnlfbmFtZV1cbiAgICAgIFxuICAgICAgcFtjLmRvbWFpbl1bcHJlZml4ICsgYy50aW1lX2RpZmZfYnVja2V0XSA9IChwW2MuZG9tYWluXVtjLnRpbWVfZGlmZl9idWNrZXRdIHx8IDApICsgYy52aXNpdHNcbiAgICAgIHJldHVybiBwXG59XG5leHBvcnQgY29uc3QgYmVmb3JlQW5kQWZ0ZXJUYWJ1bGFyID0gKGJlZm9yZSwgYWZ0ZXIsIHdlaWdodHMpID0+IHtcbiAgY29uc3QgZG9tYWluX3RpbWUgPSB7fVxuXG4gIGJlZm9yZS5yZWR1Y2UocHJlZml4RG9tYWluV2VpZ2h0c1JlZHVjZXIuYmluZChmYWxzZSxcIlwiLHdlaWdodHMpLGRvbWFpbl90aW1lKVxuICBhZnRlci5yZWR1Y2UocHJlZml4RG9tYWluV2VpZ2h0c1JlZHVjZXIuYmluZChmYWxzZSxcIi1cIix3ZWlnaHRzKSxkb21haW5fdGltZSlcblxuICBjb25zdCBzb3J0ZWQgPSBPYmplY3Qua2V5cyhkb21haW5fdGltZSlcbiAgICAubWFwKChrKSA9PiB7IHJldHVybiBkb21haW5fdGltZVtrXSB9KVxuICAgIC5zb3J0KChwLGMpID0+IHtcbiAgICAgIHJldHVybiBkMy5kZXNjZW5kaW5nKHBbJzYwMCddKnAud2VpZ2h0ZWQgfHwgLUluZmluaXR5LGNbJzYwMCddKmMud2VpZ2h0ZWQgfHwgLUluZmluaXR5KVxuICAgIH0pXG5cbiAgcmV0dXJuIHNvcnRlZFxufVxuXG5leHBvcnQgY29uc3QgY29tcHV0ZVNjYWxlID0gKGRhdGEpID0+IHtcbiAgY29uc3QgbWF4ID0gZGF0YS5yZWR1Y2UoKHAsYykgPT4ge1xuICAgIE9iamVjdC5rZXlzKGMpLmZpbHRlcih6ID0+IHogIT0gXCJkb21haW5cIiAmJiB6ICE9IFwid2VpZ2h0ZWRcIikubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHAgPSBjW3hdID4gcCA/IGNbeF0gOiBwXG4gICAgfSlcbiAgXG4gICAgcmV0dXJuIHBcbiAgfSwwKVxuXG4gIHJldHVybiBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbMCwuOF0pLmRvbWFpbihbMCxNYXRoLmxvZyhtYXgpXSlcbn1cbiIsInZhciBidWNrZXRzID0gWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ucmV2ZXJzZSgpLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiBTdHJpbmcoeCo2MCkgfSlcbmJ1Y2tldHMgPSBidWNrZXRzLmNvbmNhdChbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKC14KjYwKSB9KSlcblxuXG5jb25zdCBmb3JtYXROYW1lID0gZnVuY3Rpb24oeCkge1xuXG4gIGlmICh4IDwgMCkgeCA9IC14XG5cbiAgaWYgKHggPT0gMzYwMCkgcmV0dXJuIFwiMSBoclwiXG4gIGlmICh4IDwgMzYwMCkgcmV0dXJuIHgvNjAgKyBcIiBtaW5zXCIgXG5cbiAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgaWYgKHggPiA4NjQwMCkgcmV0dXJuIHgvODY0MDAgKyBcIiBkYXlzXCIgXG5cbiAgcmV0dXJuIHgvMzYwMCArIFwiIGhyc1wiXG59XG5cbmV4cG9ydCBjb25zdCB0aW1pbmdIZWFkZXJzID0gYnVja2V0cy5tYXAoeCA9PiB7IHJldHVybiB7XCJrZXlcIjp4LCBcInZhbHVlXCI6Zm9ybWF0TmFtZSh4KSwgXCJzZWxlY3RlZFwiOnRydWV9IH0pXG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBkM19jbGFzcywgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi8uLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCB0YWJsZSBmcm9tICd0YWJsZSdcblxuaW1wb3J0IHJlZmluZV9yZWxhdGl2ZSBmcm9tICcuL3JlZmluZV9yZWxhdGl2ZSdcbmltcG9ydCB7Y2F0ZWdvcnlXZWlnaHRzLCBiZWZvcmVBbmRBZnRlclRhYnVsYXIsIGNvbXB1dGVTY2FsZX0gZnJvbSAnLi9yZWxhdGl2ZV90aW1pbmdfcHJvY2VzcydcbmltcG9ydCB7dGltaW5nSGVhZGVyc30gZnJvbSAnLi9yZWxhdGl2ZV90aW1pbmdfY29uc3RhbnRzJ1xuXG5pbXBvcnQge2RyYXdTdHJlYW19IGZyb20gJy4uL3N1bW1hcnkvYmVmb3JlX2FuZF9hZnRlcidcbmltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnY2hhcnQnXG5cbmltcG9ydCAnLi9yZWxhdGl2ZV90aW1pbmcuY3NzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZWxhdGl2ZV90aW1pbmcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgUmVsYXRpdmVUaW1pbmcodGFyZ2V0KVxufVxuXG5jbGFzcyBSZWxhdGl2ZVRpbWluZyBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKHRhcmdldClcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiXSB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YVxuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwic3VtbWFyeS13cmFwXCIpXG5cbiAgICBoZWFkZXIod3JhcClcbiAgICAgIC50ZXh0KFwiQmVmb3JlIGFuZCBBZnRlclwiKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIGJhd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJiYS1yb3dcIilcblxuICAgIHRyeSB7XG4gICAgICB2YXIgc3RhZ2VzID0gZHJhd1N0cmVhbShiYXdyYXAsdGhpcy5fZGF0YS5iZWZvcmVfY2F0ZWdvcmllcyx0aGlzLl9kYXRhLmFmdGVyX2NhdGVnb3JpZXMpXG4gICAgICAvL2Jhd3JhcC5zZWxlY3RBbGwoXCIuYmVmb3JlLXN0cmVhbVwiKS5yZW1vdmUoKSAvLyBIQUNLXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBiYXdyYXAuaHRtbChcIlwiKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc3Qgd2VpZ2h0cyA9IGNhdGVnb3J5V2VpZ2h0cyhkYXRhLmJlZm9yZV9jYXRlZ29yaWVzKVxuICAgIGNvbnN0IHNvcnRlZF90YWJ1bGFyID0gYmVmb3JlQW5kQWZ0ZXJUYWJ1bGFyKGRhdGEuYmVmb3JlLGRhdGEuYWZ0ZXIsd2VpZ2h0cylcbiAgICAgIC5zbGljZSgwLDEwMDApXG5cbiAgICBjb25zdCBvc2NhbGUgPSBjb21wdXRlU2NhbGUoc29ydGVkX3RhYnVsYXIpXG4gICAgY29uc3QgaGVhZGVycyA9IFt7XCJrZXlcIjpcImRvbWFpblwiLCBcInZhbHVlXCI6XCJEb21haW5cIn1dLmNvbmNhdCh0aW1pbmdIZWFkZXJzKVxuXG4gICAgdGFibGUoYmF3cmFwKVxuICAgICAgLnRvcCgxNDApXG4gICAgICAuaGVhZGVycyhoZWFkZXJzKVxuICAgICAgLm9uKFwiZXhwYW5kXCIsZnVuY3Rpb24oZCx0ZCkge1xuXG4gICAgICAgIHJlZmluZV9yZWxhdGl2ZSh0ZClcbiAgICAgICAgICAuZGF0YShkKVxuICAgICAgICAgIC5kb21haW4oZC5kb21haW4pXG4gICAgICAgICAgLnN0YWdlcyhzdGFnZXMpXG4gICAgICAgICAgLmJlZm9yZV91cmxzKGRhdGEuYmVmb3JlLmZpbHRlcih5ID0+IHkuZG9tYWluID09IGQuZG9tYWluKSApXG4gICAgICAgICAgLmFmdGVyX3VybHMoZGF0YS5hZnRlci5maWx0ZXIoeSA9PiB5LmRvbWFpbiA9PSBkLmRvbWFpbikpXG4gICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgIH0pXG4gICAgICAub24oXCJkcmF3XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCJ0aFwiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCJzcGFuXCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJsZXNzLXRoYW5cIiwgKHgpID0+IHsgcmV0dXJuIHBhcnNlSW50KHgua2V5KSA9PSB4LmtleSAmJiB4LmtleSA8IDAgfSlcbiAgICAgICAgICAuY2xhc3NlZChcImdyZWF0ZXItdGhhblwiLCAoeCkgPT4geyByZXR1cm4gcGFyc2VJbnQoeC5rZXkpID09IHgua2V5ICYmIHgua2V5ID4gMCB9KVxuXG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCIudGFibGUtb3B0aW9uXCIpXG4gICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwibm9uZVwiKVxuXG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpub3QoOmZpcnN0LWNoaWxkKVwiKVxuICAgICAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkIHdoaXRlXCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fW3hbJ2tleSddXSB8fCAwXG4gICAgICAgICAgICByZXR1cm4gXCJyZ2JhKDcwLCAxMzAsIDE4MCxcIiArIG9zY2FsZShNYXRoLmxvZyh2YWx1ZSsxKSkgKyBcIilcIlxuICAgICAgICAgIH0pICAgICBcbiAgICAgIH0pXG4gICAgICAub3B0aW9uX3RleHQoXCI8ZGl2IHN0eWxlPSd3aWR0aDo0MHB4O3RleHQtYWxpZ246Y2VudGVyJz4mIzY1MjkxOzwvZGl2PlwiKVxuICAgICAgLmRhdGEoe1widmFsdWVzXCI6c29ydGVkX3RhYnVsYXJ9KVxuICAgICAgLmRyYXcoKVxuXG4gIH1cbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBhZ2dyZWdhdGVDYXRlZ29yeSh1cmxzKSB7XG4gIGNvbnN0IGNhdGVnb3JpZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImFydGljbGVzXCI6IHZcbiAgICAgICAgLCBcInZhbHVlXCI6IGQzLnN1bSh2LHggPT4geC51bmlxdWVzKVxuICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHVybHMpXG4gICAgLm1hcChmdW5jdGlvbih2KSB7IHJldHVybiBPYmplY3QuYXNzaWduKHYudmFsdWVzLHtrZXk6IHYua2V5fSkgfSlcblxuICBjb25zdCB0b3RhbCA9IGQzLnN1bShjYXRlZ29yaWVzLGMgPT4gYy52YWx1ZSlcblxuICBjYXRlZ29yaWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5wZXJjZW50ID0geC52YWx1ZSAvIHRvdGFsXG4gIH0pXG5cbiAgcmV0dXJuIGNhdGVnb3JpZXNcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFnZ3JlZ2F0ZUNhdGVnb3J5SG91cih1cmxzKSB7XG4gIHJldHVybiBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSArIHguaG91ciArIHgubWludXRlfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB2WzBdLnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICwgXCJob3VyXCI6IHZbMF0uaG91clxuICAgICAgICAsIFwibWludXRlXCI6IHZbMF0ubWludXRlIFxuICAgICAgICAsIFwiY291bnRcIjogdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy5jb3VudCB9LDApXG4gICAgICAgICwgXCJhcnRpY2xlc1wiOiB2XG4gICAgICB9XG4gICAgfSlcbiAgICAuZW50cmllcyh1cmxzKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3J5UmVsYXRpdmVTaXplKHVybHMpIHtcbiAgcmV0dXJuIGQzLm5lc3QoKVxuICAgIC5rZXkoeCA9PiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lKVxuICAgIC5yb2xsdXAodiA9PiB2WzBdLmNhdGVnb3J5X2lkZiA/IDEvdlswXS5jYXRlZ29yeV9pZGYgOiAwKVxuICAgIC5tYXAodXJscykgXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yeVBlcmNlbnQodXJscykge1xuXG4gIGNvbnN0IHJlbGF0aXZlX3NpemUgPSBjYXRlZ29yeVJlbGF0aXZlU2l6ZSh1cmxzKVxuICBjb25zdCB0b3RhbCA9IGQzLnN1bShPYmplY3Qua2V5cyhjYXRlZ29yaWVzKS5tYXAoeCA9PiBjYXRlZ29yaWVzW3hdKSlcbiAgY29uc3QgcGVyY2VudCA9IHt9XG5cbiAgT2JqZWN0LmtleXMoY2F0ZWdvcmllcykubWFwKHggPT4ge1xuICAgIHBlcmNlbnRbeF0gPSByZWxhdGl2ZV9zaXplW3hdL3RvdGFsXG4gIH0pXG5cbiAgcmV0dXJuIHBlcmNlbnRcbn1cblxuZnVuY3Rpb24gY2F0ZWdvcnlSZWR1Y2VyKGdyb3VwKSB7XG4gIHJldHVybiBncm91cC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG4gICAgICByZXR1cm4gcFxuICAgIH0sXG4gICAgeyBcbiAgICAgICAgYXJ0aWNsZXM6IHt9XG4gICAgICAsIHZpZXdzOiAwXG4gICAgICAsIHNlc3Npb25zOiAwXG4gICAgICAsIHBvcF9zaXplOiBncm91cFswXS5jYXRlZ29yeV9pZGYgPyAxL2dyb3VwWzBdLmNhdGVnb3J5X2lkZiA6IDBcbiAgICB9KVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcnlSb2xsKHVybHMpIHtcbiAgY29uc3Qgcm9sbGVkID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbihrKSB7IHJldHVybiBrLnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLnJvbGx1cChjYXRlZ29yeVJlZHVjZXIpXG4gICAgLmVudHJpZXModXJscylcblxuICBjb25zdCBwb3BfdG90YWwgPSBkMy5zdW0ocm9sbGVkLHggPT4geC52YWx1ZXMucG9wX3NpemUpXG4gIGNvbnN0IHZpZXdzX3RvdGFsID0gZDMuc3VtKHJvbGxlZCx4ID0+IHgudmFsdWVzLnZpZXdzKVxuXG4gIHJvbGxlZC5tYXAoeCA9PiB7XG4gICAgeC52YWx1ZXMucmVhbF9wb3BfcGVyY2VudCA9IHgudmFsdWVzLnBvcF9wZXJjZW50ID0gKHgudmFsdWVzLnBvcF9zaXplIC8gcG9wX3RvdGFsICogMTAwKVxuICAgIHgudmFsdWVzLnBlcmNlbnQgPSB4LnZhbHVlcy52aWV3cy92aWV3c190b3RhbFxuXG4gIH0pXG5cbiAgcmV0dXJuIHJvbGxlZFxufVxuXG52YXIgbW9kaWZ5V2l0aENvbXBhcmlzb25zID0gZnVuY3Rpb24oZHMpIHtcblxuICB2YXIgYWdncyA9IGRzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICBwLnBvcF9tYXggPSAocC5wb3BfbWF4IHx8IDApIDwgYy5wb3AgPyBjLnBvcCA6IHAucG9wX21heFxuICAgIHAucG9wX3RvdGFsID0gKHAucG9wX3RvdGFsIHx8IDApICsgYy5wb3BcblxuICAgIGlmIChjLnNhbXApIHtcbiAgICAgIHAuc2FtcF9tYXggPSAocC5zYW1wX21heCB8fCAwKSA+IGMuc2FtcCA/IHAuc2FtcF9tYXggOiBjLnNhbXBcbiAgICAgIHAuc2FtcF90b3RhbCA9IChwLnNhbXBfdG90YWwgfHwgMCkgKyBjLnNhbXBcbiAgICB9XG5cbiAgICByZXR1cm4gcFxuICB9LHt9KVxuXG4gIC8vY29uc29sZS5sb2coYWdncylcblxuICBkcy5tYXAoZnVuY3Rpb24obykge1xuICAgIG8ubm9ybWFsaXplZF9wb3AgPSBvLnBvcCAvIGFnZ3MucG9wX21heFxuICAgIG8ucGVyY2VudF9wb3AgPSBvLnBvcCAvIGFnZ3MucG9wX3RvdGFsXG5cbiAgICBvLm5vcm1hbGl6ZWRfc2FtcCA9IG8uc2FtcCAvIGFnZ3Muc2FtcF9tYXhcbiAgICBvLnBlcmNlbnRfc2FtcCA9IG8uc2FtcCAvIGFnZ3Muc2FtcF90b3RhbFxuXG4gICAgby5ub3JtYWxpemVkX2RpZmYgPSAoby5ub3JtYWxpemVkX3NhbXAgLSBvLm5vcm1hbGl6ZWRfcG9wKS9vLm5vcm1hbGl6ZWRfcG9wXG4gICAgby5wZXJjZW50X2RpZmYgPSAoby5wZXJjZW50X3NhbXAgLSBvLnBlcmNlbnRfcG9wKS9vLnBlcmNlbnRfcG9wXG4gIH0pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yeVN1bW1hcnkoc2FtcF91cmxzLHBvcF91cmxzKSB7XG5cbiAgY29uc3Qgc2FtcF9yb2xsZWQgPSBjYXRlZ29yeVJvbGwoc2FtcF91cmxzKVxuICAgICwgcG9wX3JvbGxlZCA9IGNhdGVnb3J5Um9sbChwb3BfdXJscylcbiAgICAsIG1hcHBlZF9jYXRfcm9sbCA9IHNhbXBfcm9sbGVkLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgXG4gICAgICAgIHBbYy5rZXldID0gYzsgXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LCB7fSlcblxuICBjb25zdCBjYXRfc3VtbWFyeSA9IHBvcF9yb2xsZWQubWFwKGZ1bmN0aW9uKHgpIHtcblxuICAgIFt4LnZhbHVlc10ubWFwKHkgPT4ge1xuICAgICAgICB5LmtleSA9IHgua2V5XG4gICAgICAgIHkucG9wID0geS52aWV3c1xuICAgICAgICB5LnNhbXAgPSBtYXBwZWRfY2F0X3JvbGxbeC5rZXldID8gbWFwcGVkX2NhdF9yb2xsW3gua2V5XS52YWx1ZXMudmlld3MgOiAwXG5cbiAgICAgICAgeS5zYW1wbGVfcGVyY2VudF9ub3JtID0geS5zYW1wbGVfcGVyY2VudCA9IHkucGVyY2VudCoxMDBcbiAgICAgICAgeS5pbXBvcnRhbmNlID0gTWF0aC5sb2coKDEveS5wb3Bfc2l6ZSkqeS5zYW1wKnkuc2FtcClcbiAgICAgICAgeS5yYXRpbyA9IHkuc2FtcGxlX3BlcmNlbnQveS5yZWFsX3BvcF9wZXJjZW50XG4gICAgICAgIHkudmFsdWUgPSB5LnNhbXBcbiAgICB9KVxuXG5cbiAgICByZXR1cm4geC52YWx1ZXNcbiAgfSkuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGIucG9wIC0gYS5wb3B9KVxuICAgIC5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgIT0gXCJOQVwiIH0pXG5cbiAgbW9kaWZ5V2l0aENvbXBhcmlzb25zKGNhdF9zdW1tYXJ5KVxuXG4gIHJldHVybiBjYXRfc3VtbWFyeVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhdGVnb3JpZXModmFsdWUpIHtcblxuICBjb25zdCBjYXRlZ29yaWVzID0gYWdncmVnYXRlQ2F0ZWdvcnkodmFsdWUuZnVsbF91cmxzKVxuICB2YWx1ZVtcImRpc3BsYXlfY2F0ZWdvcmllc1wiXSA9IHtcbiAgICAgIFwia2V5XCI6XCJDYXRlZ29yaWVzXCJcbiAgICAsIFwidmFsdWVzXCI6IGNhdGVnb3JpZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5ICE9IFwiTkFcIiB9KVxuICB9XG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2F0ZWdvcnlIb3VyKHZhbHVlKSB7XG4gIHZhbHVlW1wiY2F0ZWdvcnlfaG91clwiXSA9IGFnZ3JlZ2F0ZUNhdGVnb3J5SG91cih2YWx1ZS5mdWxsX3VybHMpXG59XG4iLCJpbXBvcnQge1xuICBwcmVwRGF0YSwgXG59IGZyb20gJy4uLy4uL2hlbHBlcnMnXG5pbXBvcnQge1xuICBhZ2dyZWdhdGVDYXRlZ29yeVxufSBmcm9tICcuL2NhdGVnb3J5J1xuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0SG91cihoKSB7XG4gIGlmIChoID09IDApIHJldHVybiBcIjEyIGFtXCJcbiAgaWYgKGggPT0gMTIpIHJldHVybiBcIjEyIHBtXCJcbiAgaWYgKGggPiAxMikgcmV0dXJuIChoLTEyKSArIFwiIHBtXCJcbiAgcmV0dXJuIChoIDwgMTAgPyBoWzFdIDogaCkgKyBcIiBhbVwiXG59XG5cbmV4cG9ydCBjb25zdCBob3VyYnVja2V0cyA9IGQzLnJhbmdlKDAsMjQpLm1hcCh4ID0+IFN0cmluZyh4KS5sZW5ndGggPiAxID8gU3RyaW5nKHgpIDogXCIwXCIgKyB4KVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUaW1pbmcodXJscywgY29tcGFyaXNvbikge1xuXG4gIHZhciB0cyA9IHByZXBEYXRhKHVybHMpXG4gICAgLCBwb3BfdHMgPSBwcmVwRGF0YShjb21wYXJpc29uKVxuXG4gIHZhciBtYXBwZWR0cyA9IHRzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjOyByZXR1cm4gcH0sIHt9KVxuXG4gIHZhciBwcmVwcGVkID0gcG9wX3RzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAga2V5OiB4LmtleVxuICAgICAgLCBob3VyOiB4LmhvdXJcbiAgICAgICwgbWludXRlOiB4Lm1pbnV0ZVxuICAgICAgLCB2YWx1ZTI6IHgudmFsdWVcbiAgICAgICwgdmFsdWU6IG1hcHBlZHRzW3gua2V5XSA/ICBtYXBwZWR0c1t4LmtleV0udmFsdWUgOiAwXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBwcmVwcGVkXG59XG5cbmV4cG9ydCBjb25zdCB0aW1pbmdUYWJ1bGFyID0gKGRhdGEpID0+IHtcbiAgcmV0dXJuIGQzLm5lc3QoKVxuICAgIC5rZXkoeCA9PiB4LmRvbWFpbilcbiAgICAua2V5KHggPT4geC5ob3VyKVxuICAgIC5lbnRyaWVzKGRhdGEpXG4gICAgLm1hcCh4ID0+IHtcbiAgICAgIHZhciBvYmogPSB4LnZhbHVlcy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBwW2Mua2V5XSA9IGMudmFsdWVzXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICB4LmJ1Y2tldHMgPSBob3VyYnVja2V0cy5tYXAoeiA9PiB7XG4gICAgICAgIHZhciBvID0geyB2YWx1ZXM6IG9ialt6XSwga2V5OiBmb3JtYXRIb3VyKHopIH1cbiAgICAgICAgby52aWV3cyA9IGQzLnN1bShvYmpbel0gfHwgW10sIHEgPT4gcS51bmlxdWVzKVxuICAgICAgICByZXR1cm4gb1xuICAgICAgfSlcblxuICAgICAgeC50YWJ1bGFyID0geC5idWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgIHBbYy5rZXldID0gYy52aWV3cyB8fCB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0se30pXG5cbiAgICAgIHgudGFidWxhcltcImRvbWFpblwiXSA9IHgua2V5XG4gICAgICB4LnRhYnVsYXJbXCJ0b3RhbFwiXSA9IGQzLnN1bSh4LmJ1Y2tldHMseCA9PiB4LnZpZXdzKVxuICAgICAgXG4gICAgICByZXR1cm4geFxuICAgIH0pXG59XG4iLCJpbXBvcnQge2Zvcm1hdEhvdXJ9IGZyb20gJy4uLy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL3RpbWluZydcblxuZXhwb3J0IGNvbnN0IGhvdXJidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkubWFwKHggPT4gU3RyaW5nKHgpLmxlbmd0aCA+IDEgPyBTdHJpbmcoeCkgOiBcIjBcIiArIHgpXG5cbmV4cG9ydCBjb25zdCB0aW1pbmdIZWFkZXJzID0gaG91cmJ1Y2tldHMubWFwKGZvcm1hdEhvdXIpLm1hcCh4ID0+IHsgcmV0dXJuIHtrZXk6IHgsIHZhbHVlOiB4fSB9KVxuIiwiaW1wb3J0IHtob3VyYnVja2V0c30gZnJvbSAnLi90aW1pbmdfY29uc3RhbnRzJ1xuXG5cbmV4cG9ydCBjb25zdCBjb21wdXRlU2NhbGUgPSAoZGF0YSkgPT4ge1xuXG4gIGNvbnN0IG1heCA9IDEwMDAgLy8gbmVlZCB0byBhY3R1YWxseSBjb21wdXRlIHRoaXMgZnJvbSBkYXRhXG5cbiAgcmV0dXJuIGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFswLC44XSkuZG9tYWluKFswLE1hdGgubG9nKG1heCldKVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgZDNfY2xhc3MsIEQzQ29tcG9uZW50QmFzZSwgbm9vcH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQgKiBhcyB0aW1lc2VyaWVzIGZyb20gJy4uLy4uL2dlbmVyaWMvdGltZXNlcmllcydcbmltcG9ydCB7ZG9tYWluX2V4cGFuZGVkfSBmcm9tICdjb21wb25lbnQnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuXG5pbXBvcnQge2hvdXJidWNrZXRzLCB0aW1pbmdIZWFkZXJzfSBmcm9tICcuL3RpbWluZ19jb25zdGFudHMnXG5pbXBvcnQge2NvbXB1dGVTY2FsZX0gZnJvbSAnLi90aW1pbmdfcHJvY2VzcydcblxuXG5cbmltcG9ydCAnLi90aW1pbmcuY3NzJ1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRpbWluZyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBUaW1pbmcodGFyZ2V0KVxufVxuXG5jbGFzcyBUaW1pbmcgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gIH1cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgdmFyIHdyYXAgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJ0aW1pbmctd3JhcFwiKVxuXG4gICAgY29uc3QgaGVhZGVycyA9IFt7a2V5OlwiZG9tYWluXCIsdmFsdWU6XCJEb21haW5cIn1dLmNvbmNhdCh0aW1pbmdIZWFkZXJzKVxuICAgIGNvbnN0IGQgPSBkYXRhWzBdLnZhbHVlcy8vdGltaW5nVGFidWxhcihkYXRhLmZ1bGxfdXJscylcbiAgICBjb25zdCBvc2NhbGUgPSBjb21wdXRlU2NhbGUoZClcblxuXG4gICAgaGVhZGVyKHdyYXApXG4gICAgICAudGV4dChcIlRpbWluZ1wiKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIHRpbWluZ3dyYXAgPSBkM19jbGFzcyh3cmFwLFwidGltaW5nLXJvd1wiKVxuXG4gICAgdmFyIHRhYmxlX29iaiA9IHRhYmxlKHRpbWluZ3dyYXApXG4gICAgICAudG9wKDE0MClcbiAgICAgIC5oZWFkZXJzKGhlYWRlcnMpXG4gICAgICAuZGF0YSh7XCJrZXlcIjpcIlwiLCBcInZhbHVlc1wiOmQubWFwKHggPT4geC50YWJ1bGFyKSB9KVxuICAgICAgLnNvcnQoXCJ0b3RhbFwiKVxuICAgICAgLnNraXBfb3B0aW9uKHRydWUpXG4gICAgICAub24oXCJleHBhbmRcIixmdW5jdGlvbihkLHRkKSB7XG5cbiAgICAgICAgdmFyIGRkID0gZGF0YS5mdWxsX3VybHMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguZG9tYWluID09IGQuZG9tYWluIH0pXG4gICAgICAgIHZhciByb2xsZWQgPSB0aW1lc2VyaWVzLnByZXBEYXRhKGRkKVxuICAgICAgICBcbiAgICAgICAgZG9tYWluX2V4cGFuZGVkKHRkKVxuICAgICAgICAgIC5kb21haW4oZGRbMF0uZG9tYWluKVxuICAgICAgICAgIC5yYXcoZGQpXG4gICAgICAgICAgLmRhdGEocm9sbGVkKVxuICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgIH0pXG4gICAgICAub24oXCJkcmF3XCIsZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm5vdCg6Zmlyc3QtY2hpbGQpXCIpXG4gICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfX1t4WydrZXknXV0gfHwgMFxuICAgICAgICAgICAgcmV0dXJuIFwicmdiYSg3MCwgMTMwLCAxODAsXCIgKyBvc2NhbGUoTWF0aC5sb2codmFsdWUrMSkpICsgXCIpXCJcbiAgICAgICAgICB9KVxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcbiAgICBcbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBkM19jbGFzcyh0YXJnZXQsY2xzLHR5cGUpIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLlwiICsgY2xzLCB0eXBlIHx8IFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN0YWdlZF9maWx0ZXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU3RhZ2VkRmlsdGVyKHRhcmdldClcbn1cblxuY2xhc3MgU3RhZ2VkRmlsdGVyIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICB9XG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuXG4gIG9uKGFjdGlvbiwgZm4pIHtcbiAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG5cbiAgZHJhdygpIHtcbiAgICB2YXIgb3dyYXAgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJmb290ZXItd3JhcFwiKVxuICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjVweFwiKVxuICAgICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiNjBweFwiKVxuICAgICAgLnN0eWxlKFwiYm90dG9tXCIsXCIwcHhcIilcbiAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJmaXhlZFwiKVxuICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMDBweFwiKVxuICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI0YwRjRGN1wiKVxuXG4gICAgdmFyIHdyYXAgPSBkM19jbGFzcyhvd3JhcCxcImlubmVyLXdyYXBcIilcbiAgICAgIC5zdHlsZShcImJvcmRlci10b3BcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiNXB4XCIpXG5cbiAgICBkM19jbGFzcyh3cmFwLFwiaGVhZGVyLWxhYmVsXCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzVweFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxNHB4XCIpXG4gICAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzg4ODg4OFwiKVxuICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjIwMHB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAudGV4dChcIkJ1aWxkIEZpbHRlcnNcIilcblxuICAgIGQzX2NsYXNzKHdyYXAsXCJ0ZXh0LWxhYmVsXCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzVweFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNjBweFwiKVxuICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwibm9uZVwiKVxuICAgICAgLnRleHQoXCJUaXRsZVwiKVxuXG4gICAgdmFyIHNlbGVjdF9ib3ggPSBzZWxlY3Qod3JhcClcbiAgICAgIC5vcHRpb25zKFtcbiAgICAgICAgICB7XCJrZXlcIjpcImNvbnRhaW5zXCIsXCJ2YWx1ZVwiOlwiY29udGFpbnNcIn1cbiAgICAgICAgLCB7XCJrZXlcIjpcImRvZXMgbm90IGNvbnRhaW5cIixcInZhbHVlXCI6XCJkb2VzIG5vdCBjb250YWluXCJ9XG4gICAgICBdKVxuICAgICAgLmRyYXcoKVxuICAgICAgLl9zZWxlY3RcbiAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cblxuXG4gICAgdmFyIGZvb3Rlcl9yb3cgPSBkM19jbGFzcyh3cmFwLFwiZm9vdGVyLXJvd1wiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cblxuICAgIHZhciBzZWxlY3RfdmFsdWUgPSB0aGlzLmRhdGEoKVxuXG4gICAgZnVuY3Rpb24gYnVpbGRGaWx0ZXJJbnB1dCgpIHtcblxuICAgICAgZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkZXN0cm95ID0gZDMuc2VsZWN0KHRoaXMpLm9uKFwiZGVzdHJveVwiKVxuICAgICAgICAgIGlmIChkZXN0cm95KSBkZXN0cm95KClcbiAgICAgICAgfSlcblxuXG4gICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmb290ZXJfcm93LFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgICAgLmF0dHIoXCJ2YWx1ZVwiLHNlbGVjdF92YWx1ZSlcbiAgICAgICAgLnByb3BlcnR5KFwidmFsdWVcIixzZWxlY3RfdmFsdWUpXG5cbiAgICAgIFxuXG5cbiAgICAgIHZhciBzID0gJChzZWxlY3Qubm9kZSgpKS5zZWxlY3RpemUoe1xuICAgICAgICBwZXJzaXN0OiBmYWxzZSxcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxlY3RfdmFsdWUgPSAoc2VsZWN0X3ZhbHVlLmxlbmd0aCA/IHNlbGVjdF92YWx1ZSArIFwiLFwiIDogXCJcIikgKyB4XG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxlY3RfdmFsdWUpXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHZhbHVlOiB4LCB0ZXh0OiB4XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvbkRlbGV0ZTogZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZWN0X3ZhbHVlID0gc2VsZWN0X3ZhbHVlLnNwbGl0KFwiLFwiKS5maWx0ZXIoZnVuY3Rpb24oeikgeyByZXR1cm4geiAhPSB4WzBdfSkuam9pbihcIixcIilcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGVjdF92YWx1ZSlcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGZvb3Rlcl9yb3cuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgIC5vbihcImRlc3Ryb3lcIixmdW5jdGlvbigpIHtcbiAgICAgICAgICBzWzBdLnNlbGVjdGl6ZS5kZXN0cm95KClcbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIGJ1aWxkRmlsdGVySW5wdXQoKVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgZDNfY2xhc3Mod3JhcCxcImluY2x1ZGUtc3VibWl0XCIsXCJidXR0b25cIilcbiAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJyaWdodFwiKVxuICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxMjBweFwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjlweFwiKVxuICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2Y5ZjlmYlwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAuYXR0cihcInR5cGVcIixcInN1Ym1pdFwiKVxuICAgICAgLnRleHQoXCJNb2RpZnkgRmlsdGVyc1wiKVxuICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCJpbnB1dFwiKS5wcm9wZXJ0eShcInZhbHVlXCIpXG4gICAgICAgIHZhciBvcCA9ICBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18ua2V5ICsgXCIuc2VsZWN0aXplXCJcbiAgICAgICAgXG4gICAgICAgIHNlbGYub24oXCJtb2RpZnlcIikoe1wiZmllbGRcIjpcIlRpdGxlXCIsXCJvcFwiOm9wLFwidmFsdWVcIjp2YWx1ZX0pXG4gICAgICB9KVxuXG4gICAgZDNfY2xhc3Mod3JhcCxcImV4Y2x1ZGUtc3VibWl0XCIsXCJidXR0b25cIilcbiAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJyaWdodFwiKVxuICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxMjBweFwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjlweFwiKVxuICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2Y5ZjlmYlwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAuYXR0cihcInR5cGVcIixcInN1Ym1pdFwiKVxuICAgICAgLnRleHQoXCJOZXcgRmlsdGVyXCIpXG4gICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBmb290ZXJfcm93LnNlbGVjdEFsbChcImlucHV0XCIpLnByb3BlcnR5KFwidmFsdWVcIilcbiAgICAgICAgdmFyIG9wID0gIHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXkgKyBcIi5zZWxlY3RpemVcIlxuXG4gICAgICAgIHNlbGYub24oXCJhZGRcIikoe1wiZmllbGRcIjpcIlRpdGxlXCIsXCJvcFwiOm9wLFwidmFsdWVcIjp2YWx1ZX0pXG4gICAgICB9KVxuXG5cbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuL2hlYWRlcidcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBDb25kaXRpb25hbFNob3codGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy5fY2xhc3NlcyA9IHt9XG4gIHRoaXMuX29iamVjdHMgPSB7fVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb25kaXRpb25hbF9zaG93KHRhcmdldCkge1xuICByZXR1cm4gbmV3IENvbmRpdGlvbmFsU2hvdyh0YXJnZXQpXG59XG5cbkNvbmRpdGlvbmFsU2hvdy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBjbGFzc2VkOiBmdW5jdGlvbihrLCB2KSB7XG4gICAgICBpZiAoayA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fY2xhc3Nlc1xuICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2NsYXNzZXNba10gXG4gICAgICB0aGlzLl9jbGFzc2VzW2tdID0gdjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSAgXG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24gKCkge1xuXG4gICAgICB2YXIgY2xhc3NlcyA9IHRoaXMuY2xhc3NlZCgpXG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5jb25kaXRpb25hbC13cmFwXCIsXCJkaXZcIix0aGlzLmRhdGEoKSlcbiAgICAgICAgLmNsYXNzZWQoXCJjb25kaXRpb25hbC13cmFwXCIsdHJ1ZSlcblxuICAgICAgdmFyIG9iamVjdHMgPSBkM19zcGxhdCh3cmFwLFwiLmNvbmRpdGlvbmFsXCIsXCJkaXZcIixpZGVudGl0eSwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpIH0pXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgICAgICAuY2xhc3NlZChcImNvbmRpdGlvbmFsXCIsdHJ1ZSlcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4gIXguc2VsZWN0ZWQgfSlcblxuXG4gICAgICBPYmplY3Qua2V5cyhjbGFzc2VzKS5tYXAoZnVuY3Rpb24oaykgeyBcbiAgICAgICAgb2JqZWN0cy5jbGFzc2VkKGssY2xhc3Nlc1trXSlcbiAgICAgIH0pXG5cbiAgICAgIHRoaXMuX29iamVjdHMgPSBvYmplY3RzXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgXG4gICAgfVxuICAsIGVhY2g6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB0aGlzLmRyYXcoKVxuICAgICAgdGhpcy5fb2JqZWN0cy5lYWNoKGZuKVxuICAgICAgXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIFNoYXJlKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5faW5uZXIgPSBmdW5jdGlvbigpIHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNoYXJlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNoYXJlKHRhcmdldClcbn1cblxuU2hhcmUucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgb3ZlcmxheSA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLm92ZXJsYXlcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIm92ZXJsYXlcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcInJnYmEoMCwwLDAsLjUpXCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIixcIjMwMVwiKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG92ZXJsYXkucmVtb3ZlKClcbiAgICAgICAgfSlcblxuICAgICAgdGhpcy5fb3ZlcmxheSA9IG92ZXJsYXk7XG5cbiAgICAgIHZhciBjZW50ZXIgPSBkM191cGRhdGVhYmxlKG92ZXJsYXksXCIucG9wdXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInBvcHVwIGNvbC1tZC01IGNvbC1zbS04XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCJhdXRvXCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjMwMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjE1MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIndoaXRlXCIpXG4gICAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJub25lXCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgICAgfSlcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHNlbGYuX2lubmVyKGQzLnNlbGVjdCh0aGlzKSlcbiAgICAgICAgfSlcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgaW5uZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB0aGlzLl9pbm5lciA9IGZuLmJpbmQodGhpcylcbiAgICAgIHRoaXMuZHJhdygpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX292ZXJsYXkucmVtb3ZlKClcbiAgICAgIHJldHVybiB0aGlzIFxuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgKiBhcyBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCB7bWVkaWFfcGxhbn0gZnJvbSAnbWVkaWFfcGxhbidcbmltcG9ydCBmaWx0ZXJfdmlldyBmcm9tICcuL3ZpZXdzL2ZpbHRlcl92aWV3J1xuaW1wb3J0IG9wdGlvbl92aWV3IGZyb20gJy4vdmlld3Mvb3B0aW9uX3ZpZXcnXG5pbXBvcnQgZG9tYWluX3ZpZXcgZnJvbSAnLi92aWV3cy9kb21haW5fdmlldydcbmltcG9ydCBzZWdtZW50X3ZpZXcgZnJvbSAnLi92aWV3cy9zZWdtZW50X3ZpZXcnXG5pbXBvcnQgc3VtbWFyeV92aWV3IGZyb20gJy4vdmlld3Mvc3VtbWFyeS92aWV3J1xuaW1wb3J0IHJlbGF0aXZlX3ZpZXcgZnJvbSAnLi92aWV3cy9yZWxhdGl2ZV90aW1pbmcvdmlldydcbmltcG9ydCB0aW1pbmdfdmlldyBmcm9tICcuL3ZpZXdzL3RpbWluZy92aWV3J1xuaW1wb3J0IHN0YWdlZF9maWx0ZXJfdmlldyBmcm9tICcuL3ZpZXdzL3N0YWdlZF9maWx0ZXJfdmlldydcblxuXG5cblxuXG5pbXBvcnQgY29uZGl0aW9uYWxfc2hvdyBmcm9tICcuL2dlbmVyaWMvY29uZGl0aW9uYWxfc2hvdydcblxuaW1wb3J0IHNoYXJlIGZyb20gJy4vZ2VuZXJpYy9zaGFyZSdcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4vaGVscGVycydcbmltcG9ydCAqIGFzIHRyYW5zZm9ybSBmcm9tICcuL2hlbHBlcnMnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5leHBvcnQgZnVuY3Rpb24gTmV3RGFzaGJvYXJkKHRhcmdldCkge1xuICB0aGlzLnRhcmdldCA9IHRhcmdldFxuICB0aGlzLl9vbiA9IHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG5ld19kYXNoYm9hcmQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgTmV3RGFzaGJvYXJkKHRhcmdldClcbn1cblxuTmV3RGFzaGJvYXJkLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIHN0YWdlZF9maWx0ZXJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3RhZ2VkX2ZpbHRlcnNcIix2YWwpIHx8IFwiXCJcbiAgICB9XG4gICwgbWVkaWE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJtZWRpYVwiLHZhbCkgXG4gICAgfVxuICAsIHNhdmVkOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2F2ZWRcIix2YWwpIFxuICAgIH1cbiAgLCBsaW5lX2l0ZW1zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibGluZV9pdGVtc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgc2VsZWN0ZWRfYWN0aW9uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2VsZWN0ZWRfYWN0aW9uXCIsdmFsKSBcbiAgICB9XG4gICwgc2VsZWN0ZWRfY29tcGFyaXNvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlbGVjdGVkX2NvbXBhcmlzb25cIix2YWwpIFxuICAgIH1cbiAgLCBhY3Rpb25fZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFjdGlvbl9kYXRlXCIsdmFsKSBcbiAgICB9XG4gICwgY29tcGFyaXNvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY29tcGFyaXNvbl9kYXRlXCIsdmFsKSBcbiAgICB9XG5cbiAgLCB2aWV3X29wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ2aWV3X29wdGlvbnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGxvZ2ljX29wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsb2dpY19vcHRpb25zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBleHBsb3JlX3RhYnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJleHBsb3JlX3RhYnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGxvZ2ljX2NhdGVnb3JpZXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsb2dpY19jYXRlZ29yaWVzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBhY3Rpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgc3VtbWFyeTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInN1bW1hcnlcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIHRpbWVfc3VtbWFyeTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpbWVfc3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgdGltZV90YWJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGltZV90YWJzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBjYXRlZ29yeV9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY2F0ZWdvcnlfc3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwga2V5d29yZF9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5d29yZF9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBiZWZvcmU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiZWZvcmVcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGFmdGVyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWZ0ZXJcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGZpbHRlcnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJmaWx0ZXJzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBsb2FkaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCkgdGhpcy5fc2VnbWVudF92aWV3ICYmIHRoaXMuX3NlZ21lbnRfdmlldy5pc19sb2FkaW5nKHZhbCkuZHJhdygpXG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvYWRpbmdcIix2YWwpXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YSgpXG4gICAgICB2YXIgbWVkaWEgPSB0aGlzLm1lZGlhKClcblxuICAgICAgdmFyIG9wdGlvbnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMudmlld19vcHRpb25zKCkpKVxuICAgICAgdmFyIHRhYnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuZXhwbG9yZV90YWJzKCkpKVxuXG5cbiAgICAgIHZhciBsb2dpYyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5sb2dpY19vcHRpb25zKCkpKVxuICAgICAgICAsIGNhdGVnb3JpZXMgPSB0aGlzLmxvZ2ljX2NhdGVnb3JpZXMoKVxuICAgICAgICAsIGZpbHRlcnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuZmlsdGVycygpKSlcbiAgICAgICAgLCBhY3Rpb25zID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmFjdGlvbnMoKSkpXG4gICAgICAgICwgc3RhZ2VkX2ZpbHRlcnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuc3RhZ2VkX2ZpbHRlcnMoKSkpXG5cblxuXG4gICAgICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXRcbiAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICB0aGlzLl9zZWdtZW50X3ZpZXcgPSBzZWdtZW50X3ZpZXcodGFyZ2V0KVxuICAgICAgICAuaXNfbG9hZGluZyhzZWxmLmxvYWRpbmcoKSB8fCBmYWxzZSlcbiAgICAgICAgLnNlZ21lbnRzKGFjdGlvbnMpXG4gICAgICAgIC5kYXRhKHNlbGYuc3VtbWFyeSgpKVxuICAgICAgICAuYWN0aW9uKHNlbGYuc2VsZWN0ZWRfYWN0aW9uKCkgfHwge30pXG4gICAgICAgIC5hY3Rpb25fZGF0ZShzZWxmLmFjdGlvbl9kYXRlKCkgfHwgXCJcIilcbiAgICAgICAgLmNvbXBhcmlzb25fZGF0ZShzZWxmLmNvbXBhcmlzb25fZGF0ZSgpIHx8IFwiXCIpXG5cbiAgICAgICAgLmNvbXBhcmlzb24oc2VsZi5zZWxlY3RlZF9jb21wYXJpc29uKCkgfHwge30pXG4gICAgICAgIC5vbihcImNoYW5nZVwiLCB0aGlzLm9uKFwiYWN0aW9uLmNoYW5nZVwiKSlcbiAgICAgICAgLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIsIHRoaXMub24oXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImNvbXBhcmlzb24uY2hhbmdlXCIsIHRoaXMub24oXCJjb21wYXJpc29uLmNoYW5nZVwiKSlcbiAgICAgICAgLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiLCB0aGlzLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiKSlcbiAgICAgICAgLm9uKFwic2F2ZWQtc2VhcmNoLmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyAgXG4gICAgICAgICAgdmFyIHNzID0gc2hhcmUoZDMuc2VsZWN0KFwiYm9keVwiKSkuZHJhdygpXG4gICAgICAgICAgc3MuaW5uZXIoZnVuY3Rpb24odGFyZ2V0KSB7XG5cbiAgICAgICAgICAgIHZhciBoZWFkZXIgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5oZWFkZXJcIixcImg0XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwiaGVhZGVyXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMzBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMzBweFwiKVxuICAgICAgICAgICAgICAudGV4dChcIk9wZW4gYSBzYXZlZCBkYXNoYm9hcmRcIilcblxuICAgICAgICAgICAgdmFyIGZvcm0gPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdlwiLFwiZGl2XCIsc2VsZi5zYXZlZCgpKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMjUlXCIpXG5cbiAgICAgICAgICAgIGlmICghc2VsZi5zYXZlZCgpIHx8IHNlbGYuc2F2ZWQoKS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICBkM191cGRhdGVhYmxlKGZvcm0sXCJzcGFuXCIsXCJzcGFuXCIpXG4gICAgICAgICAgICAgICAgLnRleHQoXCJZb3UgY3VycmVudGx5IGhhdmUgbm8gc2F2ZWQgZGFzaGJvYXJkc1wiKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZDNfc3BsYXQoZm9ybSxcIi5yb3dcIixcImFcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sZnVuY3Rpb24oeCkgeyByZXR1cm4geC5uYW1lIH0pXG4gICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJyb3dcIix0cnVlKVxuICAgICAgICAgICAgICAgIC8vLmF0dHIoXCJocmVmXCIsIHggPT4geC5lbmRwb2ludClcbiAgICAgICAgICAgICAgICAudGV4dCh4ID0+IHgubmFtZSlcbiAgICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgICAvLyBIQUNLOiBUSElTIGlzIGhhY2t5Li4uXG4gICAgICAgICAgICAgICAgICB2YXIgX3N0YXRlID0gc3RhdGUucXMoe30pLmZyb20oXCI/XCIgKyB4LmVuZHBvaW50LnNwbGl0KFwiP1wiKVsxXSlcblxuICAgICAgICAgICAgICAgICAgc3MuaGlkZSgpXG4gICAgICAgICAgICAgICAgICB3aW5kb3cub25wb3BzdGF0ZSh7c3RhdGU6IF9zdGF0ZX0pXG4gICAgICAgICAgICAgICAgICBkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcIm5ldy1zYXZlZC1zZWFyY2guY2xpY2tcIiwgZnVuY3Rpb24oKSB7IFxuICAgICAgICAgIHZhciBzcyA9IHNoYXJlKGQzLnNlbGVjdChcImJvZHlcIikpLmRyYXcoKVxuICAgICAgICAgIHNzLmlubmVyKGZ1bmN0aW9uKHRhcmdldCkge1xuXG4gICAgICAgICAgICB2YXIgaGVhZGVyID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuaGVhZGVyXCIsXCJoNFwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImhlYWRlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJTYXZlIHRoaXMgZGFzaGJvYXJkOlwiKVxuXG4gICAgICAgICAgICB2YXIgZm9ybSA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZGl2XCIsXCJkaXZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG5cbiAgICAgICAgICAgIHZhciBuYW1lID0gZDNfdXBkYXRlYWJsZShmb3JtLCBcIi5uYW1lXCIsIFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUobmFtZSxcIi5sYWJlbFwiLFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMzBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LWZhbWlseVwiLFwiUHJveGltYU5vdmEsIHNhbnMtc2VyaWZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImxlZnRcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJEYXNoYm9hcmQgTmFtZTpcIilcblxuICAgICAgICAgICAgdmFyIG5hbWVfaW5wdXQgPSBkM191cGRhdGVhYmxlKG5hbWUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI3MHB4XCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwicGxhY2Vob2xkZXJcIixcIk15IGF3ZXNvbWUgc2VhcmNoXCIpXG5cbiAgICAgICAgICAgIHZhciBhZHZhbmNlZCA9IGQzX3VwZGF0ZWFibGUoZm9ybSwgXCIuYWR2YW5jZWRcIiwgXCJkZXRhaWxzXCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwiYWR2YW5jZWRcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDAwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIilcblxuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUoYWR2YW5jZWQsXCIubGFiZWxcIixcImRpdlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiTGluZSBJdGVtOlwiKVxuXG4gICAgICAgICAgICB2YXIgc2VsZWN0X2JveCA9IHNlbGVjdChhZHZhbmNlZClcbiAgICAgICAgICAgICAgLm9wdGlvbnMoc2VsZi5saW5lX2l0ZW1zKCkubWFwKHggPT4geyByZXR1cm4ge2tleTp4LmxpbmVfaXRlbV9uYW1lLCB2YWx1ZTogeC5saW5lX2l0ZW1faWR9IH0pIClcbiAgICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgICAgICAuX3NlbGVjdFxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjcwcHhcIilcblxuXG5cblxuICAgICAgICAgICAgdmFyIHNlbmQgPSBkM191cGRhdGVhYmxlKGZvcm0sIFwiLnNlbmRcIiwgXCJkaXZcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZW5kXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG5cblxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShzZW5kLFwiYnV0dG9uXCIsXCJidXR0b25cIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE2cHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgICAudGV4dChcIlNlbmRcIilcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBuYW1lX2lucHV0LnByb3BlcnR5KFwidmFsdWVcIikgXG4gICAgICAgICAgICAgICAgdmFyIGxpbmVfaXRlbSA9IHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9ucy5sZW5ndGggPyBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18ua2V5IDogZmFsc2VcblxuICAgICAgICAgICAgICAgIGQzLnhocihcIi9jcnVzaGVyL3NhdmVkX2Rhc2hib2FyZFwiKVxuICAgICAgICAgICAgICAgICAgLnBvc3QoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IG5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAsIFwiZW5kcG9pbnRcIjogd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgd2luZG93LmxvY2F0aW9uLnNlYXJjaFxuICAgICAgICAgICAgICAgICAgICAgICwgXCJsaW5lX2l0ZW1cIjogbGluZV9pdGVtXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICApXG5cbiAgICAgICAgICAgICAgICBzcy5oaWRlKClcblxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAudGV4dChcIlNhdmVcIilcblxuXG5cbiAgICAgICAgICB9KVxuXG5cbiAgICAgICAgfSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICBpZiAodGhpcy5zdW1tYXJ5KCkgPT0gZmFsc2UpIHJldHVybiBmYWxzZVxuXG4gICAgICBmaWx0ZXJfdmlldyh0YXJnZXQpXG4gICAgICAgIC5sb2dpYyhsb2dpYylcbiAgICAgICAgLmNhdGVnb3JpZXMoY2F0ZWdvcmllcylcbiAgICAgICAgLmZpbHRlcnMoZmlsdGVycylcbiAgICAgICAgLmRhdGEoZGF0YSlcbiAgICAgICAgLm9uKFwibG9naWMuY2hhbmdlXCIsIHRoaXMub24oXCJsb2dpYy5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImZpbHRlci5jaGFuZ2VcIiwgdGhpcy5vbihcImZpbHRlci5jaGFuZ2VcIikpXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgb3B0aW9uX3ZpZXcodGFyZ2V0KVxuICAgICAgICAuZGF0YShvcHRpb25zKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgdGhpcy5vbihcInZpZXcuY2hhbmdlXCIpIClcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICBjb25kaXRpb25hbF9zaG93KHRhcmdldClcbiAgICAgICAgLmRhdGEob3B0aW9ucylcbiAgICAgICAgLmNsYXNzZWQoXCJ2aWV3LW9wdGlvblwiLHRydWUpXG4gICAgICAgIC5kcmF3KClcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgaWYgKCF4LnNlbGVjdGVkKSByZXR1cm5cblxuICAgICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJkYXRhLXZpZXdcIikge1xuICAgICAgICAgICAgdmFyIGR2ID0gZG9tYWluX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgIC5vcHRpb25zKHRhYnMpXG4gICAgICAgICAgICAgIC5kYXRhKGRhdGEpXG4gICAgICAgICAgICAgIC5vbihcInNlbGVjdFwiLCBzZWxmLm9uKFwidGFiLmNoYW5nZVwiKSApXG4gICAgICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgICAgICAgc3RhZ2VkX2ZpbHRlcnMgPSBzdGFnZWRfZmlsdGVycy5zcGxpdChcIixcIikuY29uY2F0KHgua2V5IHx8IHgudXJsKS5maWx0ZXIoeCA9PiB4Lmxlbmd0aCkuam9pbihcIixcIilcbiAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKShzdGFnZWRfZmlsdGVycylcbiAgICAgICAgICAgICAgIEhBQ0tidWlsZFN0YWdlZEZpbHRlcihzdGFnZWRfZmlsdGVycylcbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcIm1lZGlhLXZpZXdcIikge1xuICAgICAgICAgICAgbWVkaWFfcGxhbihkdGhpcy5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTVweFwiKS5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiLTE1cHhcIikpXG4gICAgICAgICAgICAgLmRhdGEoZGF0YSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJiYS12aWV3XCIpIHtcbiAgICAgICAgICAgIHJlbGF0aXZlX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi5iZWZvcmUoKSlcbiAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcInN1bW1hcnktdmlld1wiKSB7XG4gICAgICAgICAgICBzdW1tYXJ5X3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi5zdW1tYXJ5KCkpXG4gICAgICAgICAgICAgLnRpbWluZyhzZWxmLnRpbWVfc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC5jYXRlZ29yeShzZWxmLmNhdGVnb3J5X3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAuYmVmb3JlKHNlbGYuYmVmb3JlKCkpXG4gICAgICAgICAgICAgLmFmdGVyKHNlbGYuYWZ0ZXIoKSlcbiAgICAgICAgICAgICAua2V5d29yZHMoc2VsZi5rZXl3b3JkX3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAub24oXCJiYS5zb3J0XCIsc2VsZi5vbihcImJhLnNvcnRcIikpXG4gICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwidGltaW5nLXZpZXdcIikge1xuICAgICAgICAgICAgdGltaW5nX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi50aW1lX3RhYnMoKSlcbiAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuICAgICAgZnVuY3Rpb24gSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZCkge1xuXG4gICAgICAgIHN0YWdlZF9maWx0ZXJfdmlldyh0YXJnZXQpXG4gICAgICAgICAgLmRhdGEoc3RhZ2VkKVxuICAgICAgICAgIC5vbihcInVwZGF0ZVwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKSh4KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9uKFwibW9kaWZ5XCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKFwiXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwibW9kaWZ5LWZpbHRlclwiKSh4KVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAub24oXCJhZGRcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoXCJcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJhZGQtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZHJhdygpXG4gICAgICB9XG4gICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBnZXREYXRhKGFjdGlvbixkYXlzX2Fnbykge1xuICByZXR1cm4gZnVuY3Rpb24oY2Ipe1xuICAgIGNvbnNvbGUubG9nKGRheXNfYWdvKVxuXG4gICAgdmFyIFVSTCA9IFwiL2NydXNoZXIvdjIvdmlzaXRvci9kb21haW5zX2Z1bGxfdGltZV9taW51dGUvY2FjaGU/dXJsX3BhdHRlcm49XCIgKyBhY3Rpb24udXJsX3BhdHRlcm5bMF0gKyBcIiZmaWx0ZXJfaWQ9XCIgKyBhY3Rpb24uYWN0aW9uX2lkXG5cbiAgICB2YXIgZGF0ZV9hZ28gPSBuZXcgRGF0ZSgrbmV3IERhdGUoKS0yNCo2MCo2MCoxMDAwKmRheXNfYWdvKVxuICAgICAgLCBkYXRlID0gZDMudGltZS5mb3JtYXQoXCIlWS0lbS0lZFwiKShkYXRlX2FnbylcblxuICAgIGlmIChkYXlzX2FnbykgVVJMICs9IFwiJmRhdGU9XCIgKyBkYXRlXG5cblxuICAgIGQzLmpzb24oVVJMLGZ1bmN0aW9uKHZhbHVlKSB7XG5cbiAgICAgIHZhciBjYXRlZ29yaWVzID0gdmFsdWUuc3VtbWFyeS5jYXRlZ29yeS5tYXAoZnVuY3Rpb24oeCkge3gua2V5ID0geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZTsgcmV0dXJuIHh9KVxuICAgICAgdmFsdWUuY2F0ZWdvcmllcyA9IGNhdGVnb3JpZXNcbiAgICAgIHZhbHVlLmNhdGVnb3J5ID0gdmFsdWUuc3VtbWFyeS5jYXRlZ29yeVxuICAgICAgdmFsdWUuY3VycmVudF9ob3VyID0gdmFsdWUuc3VtbWFyeS5ob3VyXG4gICAgICB2YWx1ZS5jYXRlZ29yeV9ob3VyID0gdmFsdWUuc3VtbWFyeS5jcm9zc19zZWN0aW9uXG5cbiAgICAgIHZhbHVlLm9yaWdpbmFsX3VybHMgPSB2YWx1ZS5yZXNwb25zZVxuXG4gICAgICBjYihmYWxzZSx2YWx1ZSlcbiAgICB9KVxuICB9XG5cbn1cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGUoZGF0YSxjYikge1xuICBkMy54aHIoXCIvY3J1c2hlci9mdW5uZWwvYWN0aW9uP2Zvcm1hdD1qc29uXCIpXG4gICAgLmhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIilcbiAgICAucG9zdChKU09OLnN0cmluZ2lmeShkYXRhKSxmdW5jdGlvbihlcnIsZGF0YSkge1xuICAgICAgY2IoZXJyLEpTT04ucGFyc2UoZGF0YS5yZXNwb25zZSkucmVzcG9uc2UpXG4gICAgfSlcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsKGNiKSB7XG4gIGQzLmpzb24oXCIvY3J1c2hlci9mdW5uZWwvYWN0aW9uP2Zvcm1hdD1qc29uXCIsZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YWx1ZS5yZXNwb25zZS5tYXAoZnVuY3Rpb24oeCkgeyB4LmtleSA9IHguYWN0aW9uX25hbWU7IHguYWN0aW9uX2lkID0geC5maWx0ZXJfaWQ7IHgudmFsdWUgPSB4LmFjdGlvbl9pZCB9KVxuICAgIGNiKGZhbHNlLHZhbHVlLnJlc3BvbnNlKVxuICB9KVxuXG59XG4iLCJpbXBvcnQgKiBhcyBhIGZyb20gJy4vc3JjL2FjdGlvbi5qcyc7XG5cbmV4cG9ydCBsZXQgYWN0aW9uID0gYTtcbmV4cG9ydCBsZXQgZGFzaGJvYXJkID0ge1xuICAgIGdldEFsbDogZnVuY3Rpb24oY2IpIHtcbiAgICAgIGQzLmpzb24oXCIvY3J1c2hlci9zYXZlZF9kYXNoYm9hcmRcIixmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjYihmYWxzZSx2YWx1ZS5yZXNwb25zZSlcbiAgICAgIH0pXG4gICAgfVxufVxuZXhwb3J0IGxldCBsaW5lX2l0ZW0gPSB7XG4gICAgZ2V0QWxsOiBmdW5jdGlvbihjYikge1xuICAgICAgZDMuanNvbihcIi9saW5lX2l0ZW1cIixmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjYihmYWxzZSx2YWx1ZS5yZXNwb25zZSlcbiAgICAgIH0pXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgZmlsdGVyX2RhdGEgfSBmcm9tICdmaWx0ZXInO1xuaW1wb3J0IHsgYnVpbGREYXRhIH0gZnJvbSAnLi4vLi4vaGVscGVycydcblxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRCZWZvcmVBbmRBZnRlcihiZWZvcmVfdXJscyxhZnRlcl91cmxzLGNhdF9zdW1tYXJ5LHNvcnRfYnkpIHtcblxuICB2YXIgYnUgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgIC5lbnRyaWVzKGJlZm9yZV91cmxzKVxuXG4gIHZhciBhdSA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgLmVudHJpZXMoYWZ0ZXJfdXJscylcblxuICB2YXIgYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG4gICAgLCBwb3BfY2F0ZWdvcmllcyA9IGNhdF9zdW1tYXJ5LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjOyByZXR1cm4gcCB9LCB7fSlcbiAgICAsIGNhdHMgPSBjYXRfc3VtbWFyeS5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC5rZXkgfSlcblxuICB2YXIgYmVmb3JlX2NhdGVnb3JpZXMgPSBidWlsZERhdGEoYmVmb3JlX3VybHMsYnVja2V0cyxwb3BfY2F0ZWdvcmllcylcbiAgICAsIGFmdGVyX2NhdGVnb3JpZXMgPSBidWlsZERhdGEoYWZ0ZXJfdXJscyxidWNrZXRzLHBvcF9jYXRlZ29yaWVzKVxuXG4gIHZhciBzb3J0YnkgPSBzb3J0X2J5XG5cbiAgaWYgKHNvcnRieSA9PSBcInNjb3JlXCIpIHtcblxuICAgIGJlZm9yZV9jYXRlZ29yaWVzID0gYmVmb3JlX2NhdGVnb3JpZXMuc29ydChmdW5jdGlvbihhLGIpIHsgXG4gICAgICB2YXIgcCA9IC0xLCBxID0gLTE7XG4gICAgICB0cnkgeyBwID0gYi52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5zY29yZSB9IGNhdGNoKGUpIHt9XG4gICAgICB0cnkgeyBxID0gYS52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5zY29yZSB9IGNhdGNoKGUpIHt9XG4gICAgICByZXR1cm4gZDMuYXNjZW5kaW5nKHAsIHEpXG4gICAgfSlcbiAgICBcbiAgfSBlbHNlIGlmIChzb3J0YnkgPT0gXCJwb3BcIikge1xuXG4gICAgYmVmb3JlX2NhdGVnb3JpZXMgPSBiZWZvcmVfY2F0ZWdvcmllcy5zb3J0KGZ1bmN0aW9uKGEsYikgeyBcbiAgICAgIHZhciBwID0gY2F0cy5pbmRleE9mKGEua2V5KVxuICAgICAgICAsIHEgPSBjYXRzLmluZGV4T2YoYi5rZXkpXG4gICAgICByZXR1cm4gZDMuYXNjZW5kaW5nKHAgPiAtMSA/IHAgOiAxMDAwMCwgcSA+IC0xID8gcSA6IDEwMDAwKVxuICAgIH0pXG5cbiAgfSBlbHNlIHtcblxuICAgIGJlZm9yZV9jYXRlZ29yaWVzID0gYmVmb3JlX2NhdGVnb3JpZXMuc29ydChmdW5jdGlvbihhLGIpIHsgXG4gICAgICB2YXIgcCA9IC0xLCBxID0gLTE7XG4gICAgICB0cnkgeyBwID0gYi52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5wZXJjZW50X2RpZmYgfSBjYXRjaChlKSB7fVxuICAgICAgdHJ5IHsgcSA9IGEudmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5ID09IFwiNjAwXCIgfSlbMF0ucGVyY2VudF9kaWZmIH0gY2F0Y2goZSkge31cbiAgICAgIHJldHVybiBkMy5hc2NlbmRpbmcocCwgcSlcbiAgICB9KVxuXG4gICAgXG4gIH1cblxuXG4gIHZhciBvcmRlciA9IGJlZm9yZV9jYXRlZ29yaWVzLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gIGFmdGVyX2NhdGVnb3JpZXMgPSBhZnRlcl9jYXRlZ29yaWVzLmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4gb3JkZXIuaW5kZXhPZih4LmtleSkgPiAtMX0pLnNvcnQoZnVuY3Rpb24oYSxiKSB7XG4gICAgcmV0dXJuIG9yZGVyLmluZGV4T2YoYS5rZXkpIC0gb3JkZXIuaW5kZXhPZihiLmtleSlcbiAgfSlcblxuICByZXR1cm4ge1xuICAgICAgXCJhZnRlclwiOmFmdGVyX3VybHNcbiAgICAsIFwiYmVmb3JlXCI6YmVmb3JlX3VybHNcbiAgICAsIFwiY2F0ZWdvcnlcIjpjYXRfc3VtbWFyeVxuICAgICwgXCJiZWZvcmVfY2F0ZWdvcmllc1wiOmJlZm9yZV9jYXRlZ29yaWVzXG4gICAgLCBcImFmdGVyX2NhdGVnb3JpZXNcIjphZnRlcl9jYXRlZ29yaWVzXG4gICAgLCBcInNvcnRieVwiOnNvcnRfYnlcbiAgfVxufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGFnZ3JlZ2F0ZVVybHModXJscyxjYXRlZ29yaWVzKSB7XG4gIHZhciBjYXRlZ29yaWVzID0gY2F0ZWdvcmllc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuICB2YXIgdmFsdWVzID0gdXJsc1xuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4ge1wia2V5XCI6eC51cmwsXCJ2YWx1ZVwiOnguY291bnQsIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZX0gfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHJldHVybiB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHgua2V5XG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cDovL1wiLFwiXCIpXG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cHM6Ly9cIixcIlwiKVxuICAgICAgICAucmVwbGFjZShcInd3dy5cIixcIlwiKS5zcGxpdChcIi5cIikuc2xpY2UoMSkuam9pbihcIi5cIikuc3BsaXQoXCIvXCIpWzFdLmxlbmd0aCA+IDVcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfSkuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudmFsdWUgLSBwLnZhbHVlIH0pXG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVXJsc1RhYih1cmxzLGNhdGVnb3JpZXMpIHtcblxuICBjb25zdCB2YWx1ZXMgPSBhZ2dyZWdhdGVVcmxzKHVybHMsY2F0ZWdvcmllcylcbiAgXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiVG9wIEFydGljbGVzXCJcbiAgICAsIHZhbHVlczogdmFsdWVzLnNsaWNlKDAsMTAwKVxuICB9XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gYWdncmVnYXRlRG9tYWlucyh1cmxzLGNhdGVnb3JpZXMpIHtcbiAgdmFyIGNhdGVnb3JpZXMgPSBjYXRlZ29yaWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5kb21haW4gfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKHVybHMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIkludGVybmV0ICYgVGVsZWNvbVwifSkgKVxuXG4gIHZhciBnZXRJREYgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIChpZGZbeF0gPT0gXCJOQVwiKSB8fCAoaWRmW3hdID4gODY4NikgPyAwIDogaWRmW3hdXG4gIH1cblxuICB2YXIgdmFsdWVzID0gdXJsc1xuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJrZXlcIjp4LmRvbWFpblxuICAgICAgICAsIFwidmFsdWVcIjp4LmNvdW50XG4gICAgICAgICwgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICwgXCJ1bmlxdWVzXCI6IHgudW5pcXVlcyBcbiAgICAgICAgLCBcInVybFwiOiB4LnVybFxuICAgICAgfSBcbiAgICB9KVxuXG5cblxuICB2YWx1ZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXl9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHhbMF0ucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgICwgXCJrZXlcIjogeFswXS5rZXlcbiAgICAgICAgICwgXCJ2YWx1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnZhbHVlfSwwKVxuICAgICAgICAgLCBcInBlcmNlbnRfdW5pcXVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudW5pcXVlcy9jLnZhbHVlfSwwKS94Lmxlbmd0aFxuICAgICAgICAgLCBcInVybHNcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHAuaW5kZXhPZihjLnVybCkgPT0gLTEgPyBwLnB1c2goYy51cmwpIDogcDsgcmV0dXJuIHAgfSxbXSlcblxuICAgICAgIH0gXG4gICAgfSlcbiAgICAuZW50cmllcyh2YWx1ZXMpLm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHgudmFsdWVzIH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMClcbiAgICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTEgfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnRmX2lkZiA9IGdldElERih4LmtleSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpIFxuICAgIHguY291bnQgPSB4LnZhbHVlXG4gICAgeC5pbXBvcnRhbmNlID0gTWF0aC5sb2coeC50Zl9pZGYpXG4gIH0pXG4gIHZhbHVlcyA9IHZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy50Zl9pZGYgLSBwLnRmX2lkZiB9KVxuXG5cbiAgdmFyIHRvdGFsID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50KngucGVyY2VudF91bmlxdWV9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICB4LnBvcF9wZXJjZW50ID0gMS4wMi9nZXRJREYoeC5rZXkpKjEwMFxuICAgIHgucG9wX3BlcmNlbnQgPSB4LnBvcF9wZXJjZW50ID09IEluZmluaXR5ID8gMCA6IHgucG9wX3BlcmNlbnRcblxuICAgIHguc2FtcGxlX3BlcmNlbnQgPSB4LmNvdW50KngucGVyY2VudF91bmlxdWUvdG90YWwqMTAwXG4gIH0pXG5cbiAgdmFyIG5vcm0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgIC5yYW5nZShbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXsgcmV0dXJuIHgucG9wX3BlcmNlbnR9KV0pXG4gICAgLmRvbWFpbihbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXtyZXR1cm4geC5zYW1wbGVfcGVyY2VudH0pXSlcbiAgICAubmljZSgpXG5cbiAgdmFyIHR0ID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LnBvcF9wZXJjZW50IH0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5zYW1wbGVfcGVyY2VudF9ub3JtID0gbm9ybSh4LnNhbXBsZV9wZXJjZW50KVxuICAgIHgucmVhbF9wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQvdHQqMTAwXG4gICAgeC5yYXRpbyA9IHguc2FtcGxlX3BlcmNlbnQveC5yZWFsX3BvcF9wZXJjZW50XG5cbiAgfSlcblxuICByZXR1cm4gdmFsdWVzXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERvbWFpbnNUYWIodXJscyxjYXRlZ29yaWVzKSB7XG5cbiAgY29uc3QgdmFsdWVzID0gYWdncmVnYXRlRG9tYWlucyh1cmxzLGNhdGVnb3JpZXMpXG5cbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgRG9tYWluc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5zbGljZSgwLDUwMClcbiAgfVxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJztcblxuaW1wb3J0IHtcbiAgYWdncmVnYXRlQ2F0ZWdvcnksXG4gIGFnZ3JlZ2F0ZUNhdGVnb3J5SG91cixcbiAgY2F0ZWdvcnlTdW1tYXJ5XG59IGZyb20gJy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2NhdGVnb3J5J1xuXG5pbXBvcnQge1xuICBidWlsZEJlZm9yZUFuZEFmdGVyXG59IGZyb20gJy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL2JlZm9yZV9hbmRfYWZ0ZXInXG5cbmltcG9ydCB7XG4gIGJ1aWxkS2V5d29yZHNcbn0gZnJvbSAnLi4vaGVscGVycy9kYXRhX2hlbHBlcnMva2V5d29yZHMnXG5cbmltcG9ydCB7XG4gIGJ1aWxkVGltaW5nLFxuICB0aW1pbmdUYWJ1bGFyXG59IGZyb20gJy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL3RpbWluZydcblxuaW1wb3J0IHtcbiAgYnVpbGRVcmxzVGFiXG59IGZyb20gJy4uL2hlbHBlcnMvZGF0YV9oZWxwZXJzL3VybHMnXG5cbmltcG9ydCB7XG4gIGJ1aWxkRG9tYWluc1RhYlxufSBmcm9tICcuLi9oZWxwZXJzL2RhdGFfaGVscGVycy9kb21haW5zJ1xuXG5pbXBvcnQge1xuICBidWlsZFN1bW1hcnksXG4gIGRldGVybWluZUxvZ2ljLFxuICBwcmVwYXJlRmlsdGVycyxcbiAgZmlsdGVyVXJsc1xufSBmcm9tICcuLi9oZWxwZXJzJ1xuXG5jb25zdCBzID0gc3RhdGU7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG4gIGNvbnN0IHMgPSBzdGF0ZTtcblxuICBzdGF0ZVxuICAgIC5yZWdpc3RlckV2ZW50KFwiYWRkLWZpbHRlclwiLCBmdW5jdGlvbihmaWx0ZXIpIHsgXG4gICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIscy5zdGF0ZSgpLmZpbHRlcnMuY29uY2F0KGZpbHRlcikuZmlsdGVyKHggPT4geC52YWx1ZSkgKSBcbiAgICB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwibW9kaWZ5LWZpbHRlclwiLCBmdW5jdGlvbihmaWx0ZXIpIHsgXG4gICAgICB2YXIgZmlsdGVycyA9IHMuc3RhdGUoKS5maWx0ZXJzXG4gICAgICB2YXIgaGFzX2V4aXNpdGluZyA9IGZpbHRlcnMuZmlsdGVyKHggPT4gKHguZmllbGQgKyB4Lm9wKSA9PSAoZmlsdGVyLmZpZWxkICsgZmlsdGVyLm9wKSApXG4gICAgICBcbiAgICAgIGlmIChoYXNfZXhpc2l0aW5nLmxlbmd0aCkge1xuICAgICAgICB2YXIgbmV3X2ZpbHRlcnMgPSBmaWx0ZXJzLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGlmICgoeC5maWVsZCA9PSBmaWx0ZXIuZmllbGQpICYmICh4Lm9wID09IGZpbHRlci5vcCkpIHtcbiAgICAgICAgICAgIHgudmFsdWUgKz0gXCIsXCIgKyBmaWx0ZXIudmFsdWVcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHhcbiAgICAgICAgfSlcbiAgICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLG5ld19maWx0ZXJzLmZpbHRlcih4ID0+IHgudmFsdWUpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHMuc3RhdGUoKS5maWx0ZXJzLmNvbmNhdChmaWx0ZXIpLmZpbHRlcih4ID0+IHgudmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiLCBmdW5jdGlvbihzdHIpIHsgcy5wdWJsaXNoKFwic3RhZ2VkX2ZpbHRlclwiLHN0ciApIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJsb2dpYy5jaGFuZ2VcIiwgZnVuY3Rpb24obG9naWMpIHsgcy5wdWJsaXNoKFwibG9naWNfb3B0aW9uc1wiLGxvZ2ljKSB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwiZmlsdGVyLmNoYW5nZVwiLCBmdW5jdGlvbihmaWx0ZXJzKSB7IHMucHVibGlzaEJhdGNoKHsgXCJmaWx0ZXJzXCI6ZmlsdGVycyB9KSB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwidXBkYXRlRmlsdGVyXCIsIGZ1bmN0aW9uKGVycixfZmlsdGVycyxfc3RhdGUpIHtcblxuXG4gICAgICBpZiAoX3N0YXRlLmRhdGEgPT0gdW5kZWZpbmVkKSByZXR1cm4gXG5cbiAgICAgIGNvbnN0IGZpbHRlcnMgPSBwcmVwYXJlRmlsdGVycyhfc3RhdGUuZmlsdGVycylcbiAgICAgIGNvbnN0IGxvZ2ljID0gZGV0ZXJtaW5lTG9naWMoX3N0YXRlLmxvZ2ljX29wdGlvbnMpXG4gICAgICBjb25zdCBmdWxsX3VybHMgPSBmaWx0ZXJVcmxzKF9zdGF0ZS5kYXRhLm9yaWdpbmFsX3VybHMsbG9naWMsZmlsdGVycylcblxuICAgICAgaWYgKCAoX3N0YXRlLmRhdGEuZnVsbF91cmxzKSAmJiAoX3N0YXRlLmRhdGEuZnVsbF91cmxzLmxlbmd0aCA9PSBmdWxsX3VybHMubGVuZ3RoKSAmJiBcbiAgICAgICAgICAgKF9zdGF0ZS5zZWxlY3RlZF9jb21wYXJpc29uKSAmJiAoX3N0YXRlLmNvbXBhcmlzb25fZGF0YSA9PSB2YWx1ZS5jb21wYXJpc29uKSAmJiBcbiAgICAgICAgICAgKF9zdGF0ZS5zb3J0YnkgPT0gX3N0YXRlLmJlZm9yZV91cmxzLnNvcnRieSkpIHJldHVybiBcblxuXG5cbiAgICAgIC8vIEJBU0UgREFUQVNFVFNcbiAgICAgIGNvbnN0IHZhbHVlID0ge31cblxuICAgICAgdmFsdWUuZnVsbF91cmxzID0gZnVsbF91cmxzXG4gICAgICB2YWx1ZS5jb21wYXJpc29uID0gX3N0YXRlLmNvbXBhcmlzb25fZGF0YSA/ICBfc3RhdGUuY29tcGFyaXNvbl9kYXRhLm9yaWdpbmFsX3VybHMgOiBfc3RhdGUuZGF0YS5vcmlnaW5hbF91cmxzO1xuXG4gICAgICAvL3MucHVibGlzaFN0YXRpYyhcImZvcm1hdHRlZF9kYXRhXCIsdmFsdWUpXG4gICAgICBcblxuICAgICAgY29uc3QgY2F0X3N1bW1hcnkgPSBjYXRlZ29yeVN1bW1hcnkodmFsdWUuZnVsbF91cmxzLHZhbHVlLmNvbXBhcmlzb24pXG4gICAgICBjb25zdCBzdW1tYXJ5ID0gYnVpbGRTdW1tYXJ5KHZhbHVlLmZ1bGxfdXJscywgdmFsdWUuY29tcGFyaXNvbilcblxuICAgICAgcy5zZXRTdGF0aWMoXCJjYXRlZ29yeV9zdW1tYXJ5XCIsIGNhdF9zdW1tYXJ5KVxuICAgICAgcy5zZXRTdGF0aWMoXCJzdW1tYXJ5XCIsc3VtbWFyeSlcblxuXG5cblxuXG4gICAgICAvLyBNRURJQSBQTEFOXG5cbiAgICAgIFxuICAgICAgLy92YWx1ZS5kaXNwbGF5X2NhdGVnb3JpZXMgPSB7XCJrZXlcIjogXCJDYXRlZ29yaWVzXCIsIHZhbHVlczogYWdncmVnYXRlQ2F0ZWdvcnkoZnVsbF91cmxzKX1cbiAgICAgIC8vdmFsdWUuY2F0ZWdvcnlfaG91ciA9IGFnZ3JlZ2F0ZUNhdGVnb3J5SG91cihmdWxsX3VybHMpXG5cbiAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBhZ2dyZWdhdGVDYXRlZ29yeShmdWxsX3VybHMpXG5cbiAgICAgIGNvbnN0IG1lZGlhX3BsYW4gPSB7XG4gICAgICAgICAgZGlzcGxheV9jYXRlZ29yaWVzOiB7XCJrZXlcIjogXCJDYXRlZ29yaWVzXCIgLCB2YWx1ZXM6IGNhdGVnb3JpZXN9XG4gICAgICAgICwgY2F0ZWdvcnlfaG91cjogYWdncmVnYXRlQ2F0ZWdvcnlIb3VyKGZ1bGxfdXJscylcbiAgICAgIH1cblxuICAgICAgcy5zZXRTdGF0aWMoXCJtZWRpYV9wbGFuXCIsIG1lZGlhX3BsYW4pXG4gICAgICBcblxuXG5cblxuICAgICAgLy8gRVhQTE9SRSBUQUJTXG4gICAgICB2YXIgdGFicyA9IFtcbiAgICAgICAgICBidWlsZERvbWFpbnNUYWIoZnVsbF91cmxzLGNhdGVnb3JpZXMpXG4gICAgICAgICwgYnVpbGRVcmxzVGFiKGZ1bGxfdXJscyxjYXRlZ29yaWVzKVxuICAgICAgICAsIHtrZXk6XCJUb3AgQ2F0ZWdvcmllc1wiLCB2YWx1ZXM6IGNhdF9zdW1tYXJ5fVxuICAgICAgXVxuXG4gICAgICBpZiAoX3N0YXRlLnRhYnMpIHtcbiAgICAgICAgX3N0YXRlLnRhYnMubWFwKCh4LGkpID0+IHtcbiAgICAgICAgICB0YWJzW2ldLnNlbGVjdGVkID0geC5zZWxlY3RlZFxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICBzLnNldFN0YXRpYyhcInRhYnNcIix0YWJzKVxuXG5cblxuXG4gICAgICAvLyBUSU1JTkdcbiAgICAgIGNvbnN0IHRpbWluZyA9IGJ1aWxkVGltaW5nKHZhbHVlLmZ1bGxfdXJscywgdmFsdWUuY29tcGFyaXNvbilcbiAgICAgIGNvbnN0IHRpbWluZ190YWJ1bGFyID0gdGltaW5nVGFidWxhcihmdWxsX3VybHMpXG5cbiAgICAgIHMuc2V0U3RhdGljKFwidGltZV9zdW1tYXJ5XCIsIHRpbWluZylcbiAgICAgIHMuc2V0U3RhdGljKFwidGltZV90YWJzXCIsIFt7XCJrZXlcIjpcIlRvcCBEb21haW5zXCIsIFwidmFsdWVzXCI6IHRpbWluZ190YWJ1bGFyfV0pXG5cblxuXG5cbiAgICAgIC8vIEJFRk9SRSBBTkQgQUZURVJcbiAgICAgIGlmIChfc3RhdGUuZGF0YS5iZWZvcmUpIHtcblxuICAgICAgICBjb25zdCBiZWZvcmVfdXJscyA9IGZpbHRlclVybHMoX3N0YXRlLmRhdGEuYmVmb3JlLGxvZ2ljLGZpbHRlcnMpXG4gICAgICAgICAgLCBhZnRlcl91cmxzID0gZmlsdGVyVXJscyhfc3RhdGUuZGF0YS5hZnRlcixsb2dpYyxmaWx0ZXJzKVxuICAgICAgICAgICwgYmVmb3JlX2FuZF9hZnRlciA9IGJ1aWxkQmVmb3JlQW5kQWZ0ZXIoYmVmb3JlX3VybHMsYWZ0ZXJfdXJscyxjYXRfc3VtbWFyeSxfc3RhdGUuc29ydGJ5KVxuXG4gICAgICAgIHMuc2V0U3RhdGljKFwiYmVmb3JlX3VybHNcIixiZWZvcmVfYW5kX2FmdGVyKSBcbiAgICAgICAgcy5zZXRTdGF0aWMoXCJhZnRlcl91cmxzXCIsIGJlZm9yZV9hbmRfYWZ0ZXIuYWZ0ZXJfdXJscylcblxuICAgICAgfVxuXG5cblxuICAgICAgLy8gS0VZV09SRFNcbiAgICAgIC8vcy5zZXRTdGF0aWMoXCJrZXl3b3JkX3N1bW1hcnlcIiwgYnVpbGRLZXl3b3Jkcyh2YWx1ZS5mdWxsX3VybHMsdmFsdWUuY29tcGFyaW9ucykpIFxuXG5cblxuXG4gICAgICBcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImZvcm1hdHRlZF9kYXRhXCIsdmFsdWUpXG4gICAgfSlcbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSc7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgY29uc3QgcyA9IHN0YXRlO1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhY3Rpb24uY2hhbmdlXCIsIGZ1bmN0aW9uKGFjdGlvbikgeyBzLnB1Ymxpc2goXCJzZWxlY3RlZF9hY3Rpb25cIixhY3Rpb24pIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIiwgZnVuY3Rpb24oZGF0ZSkgeyBzLnB1Ymxpc2goXCJhY3Rpb25fZGF0ZVwiLGRhdGUpIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIsIGZ1bmN0aW9uKGRhdGUpIHsgcy5wdWJsaXNoKFwiY29tcGFyaXNvbl9kYXRlXCIsZGF0ZSkgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImNvbXBhcmlzb24uY2hhbmdlXCIsIGZ1bmN0aW9uKGFjdGlvbikgeyBcbiAgICAgIGlmIChhY3Rpb24udmFsdWUgPT0gZmFsc2UpIHJldHVybiBzLnB1Ymxpc2goXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsZmFsc2UpXG4gICAgICBzLnB1Ymxpc2goXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsYWN0aW9uKVxuICAgIH0pXG5cblxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IGZpbHRlckluaXQgZnJvbSAnLi9ldmVudHMvZmlsdGVyX2V2ZW50cydcbmltcG9ydCBhY3Rpb25Jbml0IGZyb20gJy4vZXZlbnRzL2FjdGlvbl9ldmVudHMnXG5cblxuY29uc3QgcyA9IHN0YXRlO1xuXG5jb25zdCBkZWVwY29weSA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoeCkpXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgZmlsdGVySW5pdCgpXG4gIGFjdGlvbkluaXQoKVxuXG4gIC8vIE9USEVSIGV2ZW50c1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ2aWV3LmNoYW5nZVwiLCBmdW5jdGlvbih4KSB7XG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIix0cnVlKVxuICAgICAgdmFyIENQID0gZGVlcGNvcHkocy5zdGF0ZSgpLmRhc2hib2FyZF9vcHRpb25zKS5tYXAoZnVuY3Rpb24oZCkgeyBkLnNlbGVjdGVkID0gKHgudmFsdWUgPT0gZC52YWx1ZSkgPyAxIDogMDsgcmV0dXJuIGQgfSlcbiAgICAgIHMucHVibGlzaChcImRhc2hib2FyZF9vcHRpb25zXCIsQ1ApXG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcInRhYi5jaGFuZ2VcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIsdHJ1ZSlcbiAgICAgIGNvbnN0IHZhbHVlID0gcy5zdGF0ZSgpXG4gICAgICB2YWx1ZS50YWJzLm1hcChmdW5jdGlvbih0KSB7IHQuc2VsZWN0ZWQgPSAodC5rZXkgPT0geC5rZXkpID8gMSA6IDAgfSlcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcInRhYnNcIix2YWx1ZS50YWJzKVxuICAgICAgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIilcbiAgICB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwiYmEuc29ydFwiLCBmdW5jdGlvbih4KSB7XG4gICAgICBzLnB1Ymxpc2goXCJzb3J0YnlcIiwgeC52YWx1ZSlcbiAgICAgIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKGZhbHNlLHMuc3RhdGUoKS5maWx0ZXJzLHMuc3RhdGUoKSlcbiAgICB9KVxufVxuIiwiaW1wb3J0IHtxc30gZnJvbSAnc3RhdGUnO1xuaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJztcbmltcG9ydCB7Y29tcGFyZX0gZnJvbSAnLi4vaGVscGVycydcblxuZnVuY3Rpb24gcHVibGlzaFFTVXBkYXRlcyh1cGRhdGVzLHFzX3N0YXRlKSB7XG4gIGlmIChPYmplY3Qua2V5cyh1cGRhdGVzKS5sZW5ndGgpIHtcbiAgICB1cGRhdGVzW1wicXNfc3RhdGVcIl0gPSBxc19zdGF0ZVxuICAgIHN0YXRlLnB1Ymxpc2hCYXRjaCh1cGRhdGVzKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgd2luZG93Lm9ucG9wc3RhdGUgPSBmdW5jdGlvbihpKSB7XG5cbiAgICB2YXIgc3RhdGUgPSBzLl9zdGF0ZVxuICAgICAgLCBxc19zdGF0ZSA9IGkuc3RhdGVcblxuICAgIHZhciB1cGRhdGVzID0gY29tcGFyZShxc19zdGF0ZSxzdGF0ZSlcbiAgICBwdWJsaXNoUVNVcGRhdGVzKHVwZGF0ZXMscXNfc3RhdGUpXG4gIH1cblxuICBjb25zdCBzID0gc3RhdGU7XG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwiaGlzdG9yeVwiLGZ1bmN0aW9uKGVycm9yLF9zdGF0ZSkge1xuICAgICAgLy9jb25zb2xlLmxvZyhcbiAgICAgIC8vICBcImN1cnJlbnQ6IFwiK0pTT04uc3RyaW5naWZ5KF9zdGF0ZS5xc19zdGF0ZSksIFxuICAgICAgLy8gIEpTT04uc3RyaW5naWZ5KF9zdGF0ZS5maWx0ZXJzKSwgXG4gICAgICAvLyAgX3N0YXRlLmRhc2hib2FyZF9vcHRpb25zXG4gICAgICAvLylcblxuICAgICAgdmFyIGZvcl9zdGF0ZSA9IFtcImZpbHRlcnNcIl1cblxuICAgICAgdmFyIHFzX3N0YXRlID0gZm9yX3N0YXRlLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgIGlmIChfc3RhdGVbY10pIHBbY10gPSBfc3RhdGVbY11cbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0se30pXG5cbiAgICAgIGlmIChfc3RhdGUuc2VsZWN0ZWRfYWN0aW9uKSBxc19zdGF0ZVsnc2VsZWN0ZWRfYWN0aW9uJ10gPSBfc3RhdGUuc2VsZWN0ZWRfYWN0aW9uLmFjdGlvbl9pZFxuICAgICAgaWYgKF9zdGF0ZS5zZWxlY3RlZF9jb21wYXJpc29uKSBxc19zdGF0ZVsnc2VsZWN0ZWRfY29tcGFyaXNvbiddID0gX3N0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24uYWN0aW9uX2lkXG4gICAgICBpZiAoX3N0YXRlLmRhc2hib2FyZF9vcHRpb25zKSBxc19zdGF0ZVsnc2VsZWN0ZWRfdmlldyddID0gX3N0YXRlLmRhc2hib2FyZF9vcHRpb25zLmZpbHRlcih4ID0+IHguc2VsZWN0ZWQpWzBdLnZhbHVlXG4gICAgICBpZiAoX3N0YXRlLmFjdGlvbl9kYXRlKSBxc19zdGF0ZVsnYWN0aW9uX2RhdGUnXSA9IF9zdGF0ZS5hY3Rpb25fZGF0ZVxuICAgICAgaWYgKF9zdGF0ZS5jb21wYXJpc29uX2RhdGUpIHFzX3N0YXRlWydjb21wYXJpc29uX2RhdGUnXSA9IF9zdGF0ZS5jb21wYXJpc29uX2RhdGVcblxuXG4gICAgICBpZiAoX3N0YXRlLnNlbGVjdGVkX2FjdGlvbiAmJiBxcyhxc19zdGF0ZSkudG8ocXNfc3RhdGUpICE9IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpIHtcbiAgICAgICAgcy5wdWJsaXNoKFwicXNfc3RhdGVcIixxc19zdGF0ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJoaXN0b3J5LmFjdGlvbnNcIiwgZnVuY3Rpb24oZXJyb3IsdmFsdWUsX3N0YXRlKSB7XG4gICAgICB2YXIgcXNfc3RhdGUgPSBxcyh7fSkuZnJvbSh3aW5kb3cubG9jYXRpb24uc2VhcmNoKVxuICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gubGVuZ3RoICYmIE9iamVjdC5rZXlzKHFzX3N0YXRlKS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHVwZGF0ZXMgPSBjb21wYXJlKHFzX3N0YXRlLF9zdGF0ZSlcbiAgICAgICAgcmV0dXJuIHB1Ymxpc2hRU1VwZGF0ZXModXBkYXRlcyxxc19zdGF0ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMucHVibGlzaChcInNlbGVjdGVkX2FjdGlvblwiLHZhbHVlWzBdKVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImhpc3RvcnkucXNfc3RhdGVcIiwgZnVuY3Rpb24oZXJyb3IscXNfc3RhdGUsX3N0YXRlKSB7XG5cbiAgICAgIGlmIChKU09OLnN0cmluZ2lmeShoaXN0b3J5LnN0YXRlKSA9PSBKU09OLnN0cmluZ2lmeShxc19zdGF0ZSkpIHJldHVyblxuICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggPT0gXCJcIikgaGlzdG9yeS5yZXBsYWNlU3RhdGUocXNfc3RhdGUsXCJcIixxcyhxc19zdGF0ZSkudG8ocXNfc3RhdGUpKVxuICAgICAgZWxzZSBoaXN0b3J5LnB1c2hTdGF0ZShxc19zdGF0ZSxcIlwiLHFzKHFzX3N0YXRlKS50byhxc19zdGF0ZSkpXG5cbiAgICB9KVxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJ2FwaSdcblxuY29uc3QgcyA9IHN0YXRlO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuXG4gIC8vIFN1YnNjcmlwdGlvbnMgdGhhdCByZWNlaXZlIGRhdGEgLyBtb2RpZnkgLyBjaGFuZ2Ugd2hlcmUgaXQgaXMgc3RvcmVkXG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwicmVjZWl2ZS5kYXRhXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImxvZ2ljX2NhdGVnb3JpZXNcIix2YWx1ZS5jYXRlZ29yaWVzKVxuICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHN0YXRlLmZpbHRlcnMpXG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwicmVjZWl2ZS5jb21wYXJpc29uX2RhdGFcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHN0YXRlLmZpbHRlcnMpXG4gICAgfSlcblxuXG4gIC8vIFN1YnNjcmlwdGlvbnMgdGhhdCB3aWxsIGdldCBtb3JlIGRhdGFcblxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuYWN0aW9uX2RhdGVcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YShzdGF0ZS5zZWxlY3RlZF9hY3Rpb24sc3RhdGUuYWN0aW9uX2RhdGUpKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImdldC5jb21wYXJpc29uX2RhdGVcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGZhbHNlKVxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiY29tcGFyaXNvbl9kYXRhXCIsYXBpLmFjdGlvbi5nZXREYXRhKHN0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24sc3RhdGUuY29tcGFyaXNvbl9kYXRlKSlcbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuc2VsZWN0ZWRfYWN0aW9uXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImRhdGFcIixhcGkuYWN0aW9uLmdldERhdGEodmFsdWUsc3RhdGUuYWN0aW9uX2RhdGUpKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImdldC5zZWxlY3RlZF9jb21wYXJpc29uXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybiBzLnB1Ymxpc2hTdGF0aWMoXCJjb21wYXJpc29uX2RhdGFcIixmYWxzZSlcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YSh2YWx1ZSxzdGF0ZS5jb21wYXJpc29uX2RhdGUpKVxuICAgIH0pXG5cblxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IHtxc30gZnJvbSAnc3RhdGUnXG5pbXBvcnQgYnVpbGQgZnJvbSAnLi9idWlsZCdcbmltcG9ydCBoaXN0b3J5U3Vic2NyaXB0aW9ucyBmcm9tICcuL3N1YnNjcmlwdGlvbnMvaGlzdG9yeSdcbmltcG9ydCBhcGlTdWJzY3JpcHRpb25zIGZyb20gJy4vc3Vic2NyaXB0aW9ucy9hcGknXG5cblxuY29uc3QgcyA9IHN0YXRlO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgaGlzdG9yeVN1YnNjcmlwdGlvbnMoKVxuICBhcGlTdWJzY3JpcHRpb25zKClcblxuICBcbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLmxvYWRpbmdcIiwgZnVuY3Rpb24oZXJyb3IsbG9hZGluZyx2YWx1ZSkgeyBidWlsZCgpKCkgfSlcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLmRhc2hib2FyZF9vcHRpb25zXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKVxuICAgIC5zdWJzY3JpYmUoXCJjaGFuZ2UudGFic1wiLCBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKSkgXG4gICAgLnN1YnNjcmliZShcImNoYW5nZS5sb2dpY19vcHRpb25zXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpIClcbiAgICAuc3Vic2NyaWJlKFwidXBkYXRlLmZpbHRlcnNcIiwgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikpXG4gICAgXG5cbiAgLy8gUkVEUkFXOiB0aGlzIGlzIHdoZXJlIHRoZSBlbnRpcmUgYXBwIGdldHMgcmVkcmF3biAtIGlmIGZvcm1hdHRlZF9kYXRhIGNoYW5nZXMsIHJlZHJhdyB0aGUgYXBwXG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwicmVkcmF3LmZvcm1hdHRlZF9kYXRhXCIsIGZ1bmN0aW9uKGVycm9yLGZvcm1hdHRlZF9kYXRhLHZhbHVlKSB7IFxuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIsZmFsc2UpOyBcbiAgICAgIGJ1aWxkKCkoKSBcbiAgICB9KVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGQzIGZyb20gJ2QzJ1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJ2FwaSdcbmltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCB2aWV3IGZyb20gJy4vdmlldydcbmltcG9ydCBpbml0RXZlbnRzIGZyb20gJy4vZXZlbnRzJ1xuaW1wb3J0IGluaXRTdWJzY3JpcHRpb25zIGZyb20gJy4vc3Vic2NyaXB0aW9ucydcblxuXG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYnVpbGQodGFyZ2V0KSB7XG4gIGNvbnN0IGRiID0gbmV3IERhc2hib2FyZCh0YXJnZXQpXG4gIHJldHVybiBkYlxufVxuXG5jbGFzcyBEYXNoYm9hcmQge1xuXG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIGluaXRFdmVudHMoKVxuICAgIGluaXRTdWJzY3JpcHRpb25zKClcbiAgICB0aGlzLnRhcmdldCh0YXJnZXQpXG4gICAgdGhpcy5pbml0KClcblxuICAgIHJldHVybiB0aGlzLmNhbGwuYmluZCh0aGlzKVxuICB9XG5cbiAgdGFyZ2V0KHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldCB8fCBkM191cGRhdGVhYmxlKGQzLnNlbGVjdChcIi5jb250YWluZXJcIiksXCJkaXZcIixcImRpdlwiKVxuICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMDBweFwiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiYXV0b1wiKVxuICB9XG5cbiAgaW5pdCgpIHtcbiAgICBsZXQgcyA9IHN0YXRlO1xuICAgIGxldCB2YWx1ZSA9IHMuc3RhdGUoKVxuICAgIHRoaXMuZGVmYXVsdHMocylcbiAgfVxuXG4gIGRlZmF1bHRzKHMpIHtcblxuICAgIGlmICghIXMuc3RhdGUoKS5kYXNoYm9hcmRfb3B0aW9ucykgcmV0dXJuIC8vIGRvbid0IHJlbG9hZCBkZWZhdWx0cyBpZiBwcmVzZW50XG5cbiAgICBzLnB1Ymxpc2hTdGF0aWMoXCJhY3Rpb25zXCIsYXBpLmFjdGlvbi5nZXRBbGwpXG4gICAgcy5wdWJsaXNoU3RhdGljKFwic2F2ZWRcIixhcGkuZGFzaGJvYXJkLmdldEFsbClcbiAgICBzLnB1Ymxpc2hTdGF0aWMoXCJsaW5lX2l0ZW1zXCIsYXBpLmxpbmVfaXRlbS5nZXRBbGwpXG5cbiAgICB2YXIgREVGQVVMVFMgPSB7XG4gICAgICAgIGxvZ2ljX29wdGlvbnM6IFt7XCJrZXlcIjpcIkFsbFwiLFwidmFsdWVcIjpcImFuZFwifSx7XCJrZXlcIjpcIkFueVwiLFwidmFsdWVcIjpcIm9yXCJ9XVxuICAgICAgLCBsb2dpY19jYXRlZ29yaWVzOiBbXVxuICAgICAgLCBmaWx0ZXJzOiBbe31dIFxuICAgICAgLCBkYXNoYm9hcmRfb3B0aW9uczogW1xuICAgICAgICAgICAge1wia2V5XCI6XCJEYXRhIHN1bW1hcnlcIixcInZhbHVlXCI6XCJzdW1tYXJ5LXZpZXdcIixcInNlbGVjdGVkXCI6MX1cbiAgICAgICAgICAsIHtcImtleVwiOlwiRXhwbG9yZSBkYXRhXCIsXCJ2YWx1ZVwiOlwiZGF0YS12aWV3XCIsXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIkJlZm9yZSAmIEFmdGVyXCIsXCJ2YWx1ZVwiOlwiYmEtdmlld1wiLFwic2VsZWN0ZWRcIjowfVxuICAgICAgICAgICwge1wia2V5XCI6XCJUaW1pbmdcIixcInZhbHVlXCI6XCJ0aW1pbmctdmlld1wiLFwic2VsZWN0ZWRcIjowfVxuICAgICAgICAgICwge1wia2V5XCI6XCJNZWRpYSBQbGFuXCIsIFwidmFsdWVcIjpcIm1lZGlhLXZpZXdcIixcInNlbGVjdGVkXCI6MH1cblxuICAgICAgICBdXG4gICAgfVxuXG4gICAgcy51cGRhdGUoZmFsc2UsREVGQVVMVFMpXG4gIH1cblxuICBjYWxsKCkge1xuXG4gICBsZXQgcyA9IHN0YXRlO1xuICAgbGV0IHZhbHVlID0gcy5zdGF0ZSgpXG5cbiAgIGxldCBkYiA9IHZpZXcodGhpcy5fdGFyZ2V0KVxuICAgICAuc3RhZ2VkX2ZpbHRlcnModmFsdWUuc3RhZ2VkX2ZpbHRlciB8fCBcIlwiKVxuICAgICAubWVkaWEodmFsdWUubWVkaWFfcGxhbiB8fCB7fSlcbiAgICAgLnNhdmVkKHZhbHVlLnNhdmVkIHx8IFtdKVxuICAgICAuZGF0YSh2YWx1ZS5mb3JtYXR0ZWRfZGF0YSB8fCB7fSlcbiAgICAgLmFjdGlvbnModmFsdWUuYWN0aW9ucyB8fCBbXSlcbiAgICAgLnNlbGVjdGVkX2FjdGlvbih2YWx1ZS5zZWxlY3RlZF9hY3Rpb24gfHwge30pXG4gICAgIC5zZWxlY3RlZF9jb21wYXJpc29uKHZhbHVlLnNlbGVjdGVkX2NvbXBhcmlzb24gfHwge30pXG4gICAgIC5hY3Rpb25fZGF0ZSh2YWx1ZS5hY3Rpb25fZGF0ZSB8fCAwKVxuICAgICAuY29tcGFyaXNvbl9kYXRlKHZhbHVlLmNvbXBhcmlzb25fZGF0ZSB8fCAwKVxuICAgICAubG9hZGluZyh2YWx1ZS5sb2FkaW5nIHx8IGZhbHNlKVxuICAgICAubGluZV9pdGVtcyh2YWx1ZS5saW5lX2l0ZW1zIHx8IGZhbHNlKVxuICAgICAuc3VtbWFyeSh2YWx1ZS5zdW1tYXJ5IHx8IGZhbHNlKVxuICAgICAudGltZV9zdW1tYXJ5KHZhbHVlLnRpbWVfc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLmNhdGVnb3J5X3N1bW1hcnkodmFsdWUuY2F0ZWdvcnlfc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLmtleXdvcmRfc3VtbWFyeSh2YWx1ZS5rZXl3b3JkX3N1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC5iZWZvcmUodmFsdWUuYmVmb3JlX3VybHMgfHwgW10pXG4gICAgIC5hZnRlcih2YWx1ZS5hZnRlcl91cmxzIHx8IFtdKVxuICAgICAubG9naWNfb3B0aW9ucyh2YWx1ZS5sb2dpY19vcHRpb25zIHx8IGZhbHNlKVxuICAgICAubG9naWNfY2F0ZWdvcmllcyh2YWx1ZS5sb2dpY19jYXRlZ29yaWVzIHx8IGZhbHNlKVxuICAgICAuZmlsdGVycyh2YWx1ZS5maWx0ZXJzIHx8IGZhbHNlKVxuICAgICAudmlld19vcHRpb25zKHZhbHVlLmRhc2hib2FyZF9vcHRpb25zIHx8IGZhbHNlKVxuICAgICAuZXhwbG9yZV90YWJzKHZhbHVlLnRhYnMgfHwgZmFsc2UpXG4gICAgIC50aW1lX3RhYnModmFsdWUudGltZV90YWJzIHx8IGZhbHNlKVxuICAgICAub24oXCJhZGQtZmlsdGVyXCIsIHMucHJlcGFyZUV2ZW50KFwiYWRkLWZpbHRlclwiKSlcbiAgICAgLm9uKFwibW9kaWZ5LWZpbHRlclwiLCBzLnByZXBhcmVFdmVudChcIm1vZGlmeS1maWx0ZXJcIikpXG4gICAgIC5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikpXG4gICAgIC5vbihcImFjdGlvbi5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJhY3Rpb24uY2hhbmdlXCIpKVxuICAgICAub24oXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgIC5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIpKVxuICAgICAub24oXCJjb21wYXJpc29uLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImNvbXBhcmlzb24uY2hhbmdlXCIpKVxuICAgICAub24oXCJsb2dpYy5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJsb2dpYy5jaGFuZ2VcIikpXG4gICAgIC5vbihcImZpbHRlci5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJmaWx0ZXIuY2hhbmdlXCIpKVxuICAgICAub24oXCJ2aWV3LmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcInZpZXcuY2hhbmdlXCIpKVxuICAgICAub24oXCJ0YWIuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwidGFiLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiYmEuc29ydFwiLCBzLnByZXBhcmVFdmVudChcImJhLnNvcnRcIikpXG4gICAgIC5kcmF3KClcbiAgIFxuICB9XG59XG4iLCJ2YXIgdmVyc2lvbiA9IFwiMC4wLjFcIjsgZXhwb3J0ICogZnJvbSBcIi4uL2luZGV4XCI7IGV4cG9ydCB7dmVyc2lvbn07Il0sIm5hbWVzIjpbIm5vb3AiLCJzdGF0ZSIsImQzX3VwZGF0ZWFibGUiLCJkM19zcGxhdCIsImFjY2Vzc29yJDEiLCJzdGF0ZS5jb21wX2V2YWwiLCJzdGF0ZS5xcyIsImFjY2Vzc29yIiwiaWRlbnRpdHkiLCJrZXkiLCJkMyIsInRhYmxlIiwic2VsZWN0IiwiZmlsdGVyIiwicHJlcERhdGEiLCJwIiwiRVhBTVBMRV9EQVRBIiwidGltZXNlcmllc1snZGVmYXVsdCddIiwiYnVja2V0cyIsIlNUT1BXT1JEUyIsImhvdXJidWNrZXRzIiwidGltaW5nSGVhZGVycyIsImNvbXB1dGVTY2FsZSIsInRpbWVzZXJpZXMucHJlcERhdGEiLCJkM19jbGFzcyIsInJlbGF0aXZlX3ZpZXciLCJ0aW1pbmdfdmlldyIsInN0YWdlZF9maWx0ZXJfdmlldyIsImluaXQiLCJzIiwiZmlsdGVySW5pdCIsImFjdGlvbkluaXQiLCJhcGkuYWN0aW9uIiwiaGlzdG9yeVN1YnNjcmlwdGlvbnMiLCJhcGlTdWJzY3JpcHRpb25zIiwiaW5pdEV2ZW50cyIsImluaXRTdWJzY3JpcHRpb25zIiwiYXBpLmRhc2hib2FyZCIsImFwaS5saW5lX2l0ZW0iLCJ2aWV3Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQU8sTUFBTSxhQUFhLEdBQUcsU0FBUyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0VBQ3RFLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxNQUFLO0VBQ3hCLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSTtJQUM5QyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QyxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEM7O0VBRUQsVUFBVSxDQUFDLEtBQUssRUFBRTtLQUNmLE1BQU0sQ0FBQyxJQUFJLEVBQUM7O0VBRWYsT0FBTyxVQUFV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QUFDLEdBQUcsR0FBRyxJQUFJLENBQUM7RUFDOUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFHO0VBQ3RCLE9BQU8sSUFBSTtDQUNaOztBQUVELEFBSUM7O0FBRUQsQUFHQzs7QUFFRCxJQUFJLEdBQUcsR0FBRztJQUNOLE9BQU8sRUFBRSxTQUFTLEtBQUssQ0FBQyxLQUFLLEVBQUU7UUFDM0IsT0FBTyxTQUFTLENBQUMsRUFBRTtVQUNqQixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBQztVQUM3QixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUM7U0FDM0c7T0FDRjtJQUNILFdBQVcsRUFBRSxTQUFTLEtBQUssQ0FBQyxLQUFLLEVBQUU7UUFDL0IsT0FBTyxTQUFTLENBQUMsRUFBRTtVQUNqQixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBQztVQUM3QixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUM7U0FDNUc7T0FDRjtFQUNOOztBQUVELEFBQU8sU0FBUyxjQUFjLENBQUMsT0FBTyxFQUFFO0VBQ3RDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDLEVBQUM7RUFDM0IsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE1BQU0s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Q0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUM7TUFDekIsT0FBTyxDQUFDO0tBQ1QsQ0FBQztDQUNMOztBQUVELFNBQVMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDakMsSUFBSSxHQUFHLEdBQUcsSUFBSTtLQUNYLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDbkIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUk7UUFDL0YsSUFBSSxNQUFNLEdBQUcsVUFBUztRQUN0QixJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1VBQzFMLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRTtVQUNqQixNQUFNLENBQUMsSUFBSSxDQUFDLENB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QUFDLEtBQUssRUFBRTs7RUFFOUMsU0FBUyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUNBLFdBQVEsRUFBRTtJQUN6QyxJQUFJLE9BQU8sR0FBRyxFQUFFLEVBQUUsT0FBTyxHQUFHLEdBQUU7O0lBRTlCLElBQUksRUFBRSxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUdBLFdBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFO0lBQ2xHLElBQUksRUFBRSxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUdBLFdBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFOztJQUVsRyxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQzs7SUFFMUcsT0FBTyxNQUFNO0dBQ2Q7O0VBRUQsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElB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RUFDdkMsT0FBTyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7RUFDOUY7QUFDRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSztFQUNwQixPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSTtJQUM1QixDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQixRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNoQixDQUFDLENBQUMsTUFBTSxHQUFHLENBQUM7RUFDZjs7O0FBR0QsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0VBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTTtFQUNyQyxPQUFPLENBQUM7RUFDVDtBQUNELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSztFQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRTtFQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FB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
