(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
	typeof define === 'function' && define.amd ? define('dashboard', ['exports', 'd3'], factory) :
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

d3$1 = 'default' in d3$1 ? d3$1['default'] : d3$1;

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






function buildDomains$1(data) {

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








// from data.js

function buildCategories(value) {
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
        .property("selected", (x) => x.value == this._selected ? "selected" : null);

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



      if (!this._skip_option) {
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

function noop$9() {}
function DomainView(target) {
  this._on = {
    select: noop$9
  };
  this.target = target;
}



function domain_view(target) {
  return new DomainView(target)
}

DomainView.prototype = {
    data: function(val) {
      return accessor$2.bind(this)("data",val) 
    }
  , options: function(val) {
      return accessor$2.bind(this)("options",val) 
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

      var t$$1 = table$1(_explore)
        .top(140)
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
        
      t$$1.draw();
     

      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$9;
      this._on[action] = fn;
      return this
    }
};

function noop$10() {}
function SegmentView(target) {
  this._on = {
    select: noop$10
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
      if (fn === undefined) return this._on[action] || noop$10;
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

class SummaryView extends D3ComponentBase {
  constructor(target) {
    super(target);
  }

  props() { return ["data", "timing", "category", "keywords", "before", "after"] }

  draw() {
    var wrap = d3_updateable(this._target,".summary-wrap","div")
      .classed("summary-view",true);

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

__$styleInject(".summary-view .table-wrapper { background:#e3ebf0; padding-top:5px; padding-bottom:10px }\n.summary-view .table-wrapper tr { border-bottom:none }\n.summary-view .table-wrapper thead tr { background:none }\n.summary-view .table-wrapper tbody tr:hover { background:none }\n.summary-view .table-wrapper tr td { border-right:1px dotted #ccc;text-align:center }\n.summary-view .table-wrapper tr td:last-of-type { border-right:none }\n\n",undefined);

function summary_view(target) {
  return new SummaryView(target)
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

__$styleInject(".ba-row {\n        padding-bottom:60px;\n}\n\n.ba-row .expanded td {\nbackground:#f9f9fb;\n            padding-top:10px;\n            padding-bottom:10px;\n}\n\n.ba-row th {\n  border-right:1px rgba(0,0,0,.1);\n}\n\n.ba-row th span.greater-than {\nfont-size:.9em;\nwidth:70px;\ntransform:rotate(45deg);\ntext-align:right;\ndisplay:inline-block;\nmargin-left: -48px;\nmargin-bottom: 12px;\n\n}\n.ba-row th span.less-than {\nfont-size:.9em;\nwidth:70px;\ntransform:rotate(-45deg);\ndisplay:inline-block;\nmargin-left:-9px;\nmargin-bottom: 12px\n}\n",undefined);

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

function formatHour(h) {
  if (h == 0) return "12 am"
  if (h == 12) return "12 pm"
  if (h > 12) return (h-12) + " pm"
  return (h < 10 ? h[1] : h) + " am"
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

      x.buckets = hourbuckets$1.map(z => {
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

const computeScale$1 = (data) => {

  const max = 1000; // need to actually compute this from data

  return d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])
};

const hourbuckets$1 = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x);

const timingHeaders$1 = hourbuckets$1.map(formatHour).map(x => { return {key: x, value: x} });

__$styleInject(".timing-row {\n        padding-bottom:60px;\n}\n\n.timing-row .expanded {\n  background:white;\n  padding:20px\n}\n\n.timing-row tr td:not(:first-child) {\n          border-right:1px solid white;\n          padding-left:0px;\n          text-align:center;\n\n}\n",undefined);

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
    const d = timingTabular(data.full_urls);
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

function noop$11() {}
function identity$8(x) { return x }
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
      if (fn === undefined) return this._on[action] || noop$11;
      this._on[action] = fn;
      return this
    }
  , draw: function () {

      var classes = this.classed();

      var wrap = d3_updateable(this.target,".conditional-wrap","div",this.data())
        .classed("conditional-wrap",true);

      var objects = d3_splat(wrap,".conditional","div",identity$8, function(x,i) { return i })
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
    value.response.map(function(x) { x.key = x.action_name; x.value = x.action_id; });
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
    .registerEvent("add-filter", function(filter$$1) { 
      s$$1.publish("filters",s$$1.state().filters.concat(filter$$1).filter(x => x.value) ); 
    })
    .registerEvent("modify-filter", function(filter$$1) { 
      var filters = s$$1.state().filters;
      var has_exisiting = filters.filter(x => (x.field + x.op) == (filter$$1.field + filter$$1.op) );
      
      if (has_exisiting.length) {
        var new_filters = filters.reverse().map(function(x) {
          if ((x.field == filter$$1.field) && (x.op == filter$$1.op)) {
            x.value += "," + filter$$1.value;
          }
          return x
        });
        s$$1.publish("filters",new_filters.filter(x => x.value));
      } else {
        s$$1.publish("filters",s$$1.state().filters.concat(filter$$1).filter(x => x.value));
      }
    })
    .registerEvent("staged-filter.change", function(str) { s$$1.publish("staged_filter",str ); })
    .registerEvent("logic.change", function(logic) { s$$1.publish("logic_options",logic); })
    .registerEvent("filter.change", function(filters) { s$$1.publishBatch({ "filters":filters }); })

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

      buildCategories(value);
      buildCategoryHour(value);

      // ----- END : FOR MEDIA PLAN ----- //

      var tabs = [
          buildDomains$1(value)
        , buildUrls(value)
        //, buildTopics(value)
      ];

      var summary_data = buildSummaryData(value.full_urls)
        , pop_summary_data = buildSummaryData(compareTo);

      var summary = buildSummaryAggregation(summary_data,pop_summary_data);

      var ts = prepData(value.full_urls)
        , pop_ts = prepData(compareTo);

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

        var before_categories = buildData(before_urls,buckets,pop_categories)
          , after_categories = buildData(after_urls,buckets,pop_categories);

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
    })
    .registerEvent("ba.sort", function(x) {
      s$1.publishBatch({ "sortby": x.value, "filters":value.filters });
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

    var state$$1 = s$$1._state
      , qs_state = i.state;

    var updates = compare(qs_state,state$$1);
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
    .subscribe("receive.data",function(error,value,state$$1) {
      s$4.publishStatic("logic_categories",value.categories);
      s$4.publish("filters",state$$1.filters);
    })
    .subscribe("receive.comparison_data",function(error,value,state$$1) {
      s$4.publish("filters",state$$1.filters);
    });


  // Subscriptions that will get more data

  s
    .subscribe("get.action_date",function(error,value,state$$1) {
      s$4.publishStatic("data",action.getData(state$$1.selected_action,state$$1.action_date));
    })
    .subscribe("get.comparison_date",function(error,value,state$$1) {
      if (!value) return s$4.publishStatic("comparison_data",false)
      s$4.publishStatic("comparison_data",action.getData(state$$1.selected_comparison,state$$1.comparison_date));
    })
    .subscribe("get.selected_action",function(error,value,state$$1) {
      s$4.publishStatic("data",action.getData(value,state$$1.action_date));
    })
    .subscribe("get.selected_comparison",function(error,value,state$$1) {
      if (!value) return s$4.publishStatic("comparison_data",false)
      s$4.publishStatic("comparison_data",action.getData(value,state$$1.comparison_date));
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

var version = "0.0.1";

exports.version = version;
exports.view = new_dashboard;
exports.build = build;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFzaGJvYXJkLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvaGVscGVycy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdGF0ZS9zcmMvc3RhdGUuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvc3JjL3FzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N0YXRlL3NyYy9jb21wX2V2YWwuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvbWVkaWFfcGxhbi9zcmMvbWVkaWFfcGxhbi5qcyIsIi4uL3NyYy9oZWxwZXJzL2RhdGFfaGVscGVycy5qcyIsIi4uL3NyYy9oZWxwZXJzL2dyYXBoX2hlbHBlcnMuanMiLCIuLi9zcmMvaGVscGVycy9zdGF0ZV9oZWxwZXJzLmpzIiwiLi4vc3JjL2hlbHBlcnMuanMiLCIuLi9zcmMvZ2VuZXJpYy9zZWxlY3QuanMiLCIuLi9zcmMvZ2VuZXJpYy9oZWFkZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvdGFibGUvc3JjL3RhYmxlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3RhYmxlL3NyYy9zdW1tYXJ5X3RhYmxlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2ZpbHRlci9idWlsZC9maWx0ZXIuZXMuanMiLCIuLi9zcmMvdmlld3MvZmlsdGVyX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy9idXR0b25fcmFkaW8uanMiLCIuLi9zcmMvdmlld3Mvb3B0aW9uX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy90aW1lc2VyaWVzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdGFidWxhcl90aW1lc2VyaWVzL2hlYWRlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9jaGFydC9zcmMvc2ltcGxlX3RpbWVzZXJpZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL2JhX3RpbWVzZXJpZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL3NpbXBsZV9iYXIuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL2J1bGxldC5qcyIsIi4uL25vZGVfbW9kdWxlcy9jb21wb25lbnQvc3JjL3RhYnVsYXJfdGltZXNlcmllcy9ib2R5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdGFidWxhcl90aW1lc2VyaWVzL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvZG9tYWluX2V4cGFuZGVkLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC9zcmMvdmVydGljYWxfb3B0aW9uLmpzIiwiLi4vc3JjL3ZpZXdzL2RvbWFpbl92aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3NlZ21lbnRfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2RpZmZfYmFyLmpzIiwiLi4vc3JjL2dlbmVyaWMvY29tcF9iYXIuanMiLCIuLi9zcmMvdmlld3Mvc3VtbWFyeS9jYXRlZ29yeS5qcyIsIi4uL3NyYy9nZW5lcmljL2NvbXBfYnViYmxlLmpzIiwiLi4vc3JjL2dlbmVyaWMvc3RyZWFtX3Bsb3QuanMiLCIuLi9zcmMvdmlld3Mvc3VtbWFyeS9iZWZvcmVfYW5kX2FmdGVyLmpzIiwiLi4vc3JjL2dlbmVyaWMvcGllLmpzIiwiLi4vc3JjL3ZpZXdzL3N1bW1hcnkvc2FtcGxlX3ZzX3BvcC5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5L3RpbWluZy5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5L3ZpZXcuanMiLCIuLi9zcmMvdmlld3Mvc3VtbWFyeV92aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy9yZWZpbmVfcmVsYXRpdmVfcHJvY2Vzcy5qcyIsIi4uL3NyYy92aWV3cy9yZWxhdGl2ZV90aW1pbmcvcmVmaW5lX3JlbGF0aXZlLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZy9yZWxhdGl2ZV90aW1pbmdfcHJvY2Vzcy5qcyIsIi4uL3NyYy92aWV3cy9yZWxhdGl2ZV90aW1pbmcvcmVsYXRpdmVfdGltaW5nX2NvbnN0YW50cy5qcyIsIi4uL3NyYy92aWV3cy9yZWxhdGl2ZV90aW1pbmcvdmlldy5qcyIsIi4uL3NyYy92aWV3cy90aW1pbmcvdGltaW5nX3Byb2Nlc3MuanMiLCIuLi9zcmMvdmlld3MvdGltaW5nL3RpbWluZ19jb25zdGFudHMuanMiLCIuLi9zcmMvdmlld3MvdGltaW5nL3ZpZXcuanMiLCIuLi9zcmMvdmlld3Mvc3RhZ2VkX2ZpbHRlcl92aWV3LmpzIiwiLi4vc3JjL2dlbmVyaWMvY29uZGl0aW9uYWxfc2hvdy5qcyIsIi4uL3NyYy9nZW5lcmljL3NoYXJlLmpzIiwiLi4vc3JjL3ZpZXcuanMiLCIuLi9ub2RlX21vZHVsZXMvYXBpL3NyYy9hY3Rpb24uanMiLCIuLi9ub2RlX21vZHVsZXMvYXBpL2luZGV4LmpzIiwiLi4vc3JjL2V2ZW50cy9maWx0ZXJfZXZlbnRzLmpzIiwiLi4vc3JjL2V2ZW50cy9hY3Rpb25fZXZlbnRzLmpzIiwiLi4vc3JjL2V2ZW50cy5qcyIsIi4uL3NyYy9zdWJzY3JpcHRpb25zL2hpc3RvcnkuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy9hcGkuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy5qcyIsIi4uL3NyYy9idWlsZC5qcyIsImJ1bmRsZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgZDNfdXBkYXRlYWJsZSA9IGZ1bmN0aW9uKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZXhwb3J0IGNvbnN0IGQzX3NwbGF0ID0gZnVuY3Rpb24odGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCJcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKVxuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSlcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZDNfY2xhc3ModGFyZ2V0LGNscyx0eXBlLGRhdGEpIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLlwiICsgY2xzLCB0eXBlIHx8IFwiZGl2XCIsZGF0YSlcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vb3AoKSB7fVxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZXhwb3J0IGZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgY2xhc3MgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICAgIHRoaXMucHJvcHMoKS5tYXAoeCA9PiB7XG4gICAgICB0aGlzW3hdID0gYWNjZXNzb3IuYmluZCh0aGlzLHgpXG4gICAgfSlcbiAgfVxuICBwcm9wcygpIHtcbiAgICByZXR1cm4gW1wiZGF0YVwiXVxuICB9XG4gIG9uKGFjdGlvbixmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gU3RhdGUoX2N1cnJlbnQsIF9zdGF0aWMpIHtcblxuICB0aGlzLl9ub29wID0gZnVuY3Rpb24oKSB7fVxuICB0aGlzLl9ldmVudHMgPSB7fVxuXG4gIHRoaXMuX29uID0ge1xuICAgICAgXCJjaGFuZ2VcIjogdGhpcy5fbm9vcFxuICAgICwgXCJidWlsZFwiOiB0aGlzLl9ub29wXG4gICAgLCBcImZvcndhcmRcIjogdGhpcy5fbm9vcFxuICAgICwgXCJiYWNrXCI6IHRoaXMuX25vb3BcbiAgfVxuXG4gIHRoaXMuX3N0YXRpYyA9IF9zdGF0aWMgfHwge31cblxuICB0aGlzLl9jdXJyZW50ID0gX2N1cnJlbnQgfHwge31cbiAgdGhpcy5fcGFzdCA9IFtdXG4gIHRoaXMuX2Z1dHVyZSA9IFtdXG5cbiAgdGhpcy5fc3Vic2NyaXB0aW9uID0ge31cbiAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcblxuXG59XG5cblN0YXRlLnByb3RvdHlwZSA9IHtcbiAgICBzdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9zdGF0ZSlcbiAgICB9XG4gICwgcHVibGlzaDogZnVuY3Rpb24obmFtZSxjYikge1xuXG4gICAgICAgdmFyIHB1c2hfY2IgPSBmdW5jdGlvbihlcnJvcix2YWx1ZSkge1xuICAgICAgICAgaWYgKGVycm9yKSByZXR1cm4gc3Vic2NyaWJlcihlcnJvcixudWxsKVxuICAgICAgICAgXG4gICAgICAgICB0aGlzLnVwZGF0ZShuYW1lLCB2YWx1ZSlcbiAgICAgICAgIHRoaXMudHJpZ2dlcihuYW1lLCB0aGlzLnN0YXRlKClbbmFtZV0sIHRoaXMuc3RhdGUoKSlcblxuICAgICAgIH0uYmluZCh0aGlzKVxuXG4gICAgICAgaWYgKHR5cGVvZiBjYiA9PT0gXCJmdW5jdGlvblwiKSBjYihwdXNoX2NiKVxuICAgICAgIGVsc2UgcHVzaF9jYihmYWxzZSxjYilcblxuICAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHB1Ymxpc2hCYXRjaDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICBPYmplY3Qua2V5cyhvYmopLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHRoaXMudXBkYXRlKHgsb2JqW3hdKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB0aGlzLnRyaWdnZXJCYXRjaChvYmosdGhpcy5zdGF0ZSgpKVxuICAgIH1cbiAgLCBwdXNoOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgdGhpcy5wdWJsaXNoKGZhbHNlLHN0YXRlKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgc3Vic2NyaWJlOiBmdW5jdGlvbigpIHtcblxuICAgICAgLy8gdGhyZWUgb3B0aW9ucyBmb3IgdGhlIGFyZ3VtZW50czpcbiAgICAgIC8vIChmbikgXG4gICAgICAvLyAoaWQsZm4pXG4gICAgICAvLyAoaWQudGFyZ2V0LGZuKVxuXG5cbiAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB0aGlzLl9nbG9iYWxfc3Vic2NyaWJlKGFyZ3VtZW50c1swXSlcbiAgICAgIGlmIChhcmd1bWVudHNbMF0uaW5kZXhPZihcIi5cIikgPT0gLTEpIHJldHVybiB0aGlzLl9uYW1lZF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pXG4gICAgICBpZiAoYXJndW1lbnRzWzBdLmluZGV4T2YoXCIuXCIpID4gLTEpIHJldHVybiB0aGlzLl90YXJnZXR0ZWRfc3Vic2NyaWJlKGFyZ3VtZW50c1swXS5zcGxpdChcIi5cIilbMF0sIGFyZ3VtZW50c1swXS5zcGxpdChcIi5cIilbMV0sIGFyZ3VtZW50c1sxXSlcblxuICAgIH1cbiAgLCB1bnN1YnNjcmliZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgIHRoaXMuc3Vic2NyaWJlKGlkLHVuZGVmaW5lZClcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICwgX2dsb2JhbF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB2YXIgaWQgPSAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgICB2YXIgciA9IE1hdGgucmFuZG9tKCkqMTZ8MCwgdiA9IGMgPT0gJ3gnID8gciA6IChyJjB4M3wweDgpO1xuICAgICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICAgICAgfSlcbiAgICAgICwgdG8gPSBcIipcIjtcbiAgICAgXG4gICAgICB0aGlzLl90YXJnZXR0ZWRfc3Vic2NyaWJlKGlkLHRvLGZuKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBfbmFtZWRfc3Vic2NyaWJlOiBmdW5jdGlvbihpZCxmbikge1xuICAgICAgdmFyIHRvID0gXCIqXCJcbiAgICAgIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoaWQsdG8sZm4pXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIF90YXJnZXR0ZWRfc3Vic2NyaWJlOiBmdW5jdGlvbihpZCx0byxmbikge1xuXG4gICAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX29iaih0bylcbiAgICAgICAgLCB0b19zdGF0ZSA9IHRoaXMuX3N0YXRlW3RvXVxuICAgICAgICAsIHN0YXRlID0gdGhpcy5fc3RhdGU7XG5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiAmJiBmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gc3Vic2NyaXB0aW9uc1tpZF0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlbGV0ZSBzdWJzY3JpcHRpb25zW2lkXVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgfVxuICAgICAgc3Vic2NyaXB0aW9uc1tpZF0gPSBmbjtcblxuICAgICAgcmV0dXJuIHRoaXMgICAgICBcbiAgICB9XG4gIFxuICAsIGdldF9zdWJzY3JpYmVyc19vYmo6IGZ1bmN0aW9uKGspIHtcbiAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbltrXSA9IHRoaXMuX3N1YnNjcmlwdGlvbltrXSB8fCB7fVxuICAgICAgcmV0dXJuIHRoaXMuX3N1YnNjcmlwdGlvbltrXVxuICAgIH1cbiAgLCBnZXRfc3Vic2NyaWJlcnNfZm46IGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBmbnMgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19vYmooaylcbiAgICAgICAgLCBmdW5jcyA9IE9iamVjdC5rZXlzKGZucykubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGZuc1t4XSB9KVxuICAgICAgICAsIGZuID0gZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jcy5tYXAoZnVuY3Rpb24oZykgeyByZXR1cm4gZyhlcnJvcix2YWx1ZSxzdGF0ZSkgfSlcbiAgICAgICAgICB9XG5cbiAgICAgIHJldHVybiBmblxuICAgIH1cbiAgLCB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lLCBfdmFsdWUsIF9zdGF0ZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXIgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihuYW1lKSB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICwgYWxsID0gdGhpcy5nZXRfc3Vic2NyaWJlcnNfZm4oXCIqXCIpIHx8IGZ1bmN0aW9uKCkge307XG5cbiAgICAgIHRoaXMub24oXCJjaGFuZ2VcIikobmFtZSxfdmFsdWUsX3N0YXRlKVxuXG4gICAgICBzdWJzY3JpYmVyKGZhbHNlLF92YWx1ZSxfc3RhdGUpXG4gICAgICBhbGwoZmFsc2UsX3N0YXRlKVxuICAgIH1cbiAgLCB0cmlnZ2VyQmF0Y2g6IGZ1bmN0aW9uKG9iaiwgX3N0YXRlKSB7XG5cbiAgICAgIHZhciBhbGwgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihcIipcIikgfHwgZnVuY3Rpb24oKSB7fVxuICAgICAgICAsIGZucyA9IE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgICAgICB2YXIgZm4gPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbiB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICAgICByZXR1cm4gZm4uYmluZCh0aGlzKShrKShmYWxzZSxvYmpba10sX3N0YXRlKSAgXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgXG4gICAgICBhbGwoZmFsc2UsX3N0YXRlKVxuXG4gICAgfVxuICAsIF9idWlsZFN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jdXJyZW50KVxuXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLl9zdGF0aWMpLm1hcChmdW5jdGlvbihrKSB7IFxuICAgICAgICB0aGlzLl9zdGF0ZVtrXSA9IHRoaXMuX3N0YXRpY1trXVxuICAgICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB0aGlzLm9uKFwiYnVpbGRcIikodGhpcy5fc3RhdGUsIHRoaXMuX2N1cnJlbnQsIHRoaXMuX3N0YXRpYylcblxuICAgICAgcmV0dXJuIHRoaXMuX3N0YXRlXG4gICAgfVxuICAsIHVwZGF0ZTogZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgIHRoaXMuX3Bhc3RQdXNoKHRoaXMuX2N1cnJlbnQpXG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICB2YXIgb2JqID0ge31cbiAgICAgICAgb2JqW25hbWVdID0gdmFsdWU7XG4gICAgICB9XG4gICAgICB0aGlzLl9jdXJyZW50ID0gKG5hbWUpID8gXG4gICAgICAgIE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2N1cnJlbnQsIG9iaikgOlxuICAgICAgICBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9jdXJyZW50LCB2YWx1ZSApXG5cbiAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzZXRTdGF0aWM6IGZ1bmN0aW9uKGssdikge1xuICAgICAgaWYgKGsgIT0gdW5kZWZpbmVkICYmIHYgIT0gdW5kZWZpbmVkKSB0aGlzLl9zdGF0aWNba10gPSB2XG4gICAgICB0aGlzLl9idWlsZFN0YXRlKClcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcHVibGlzaFN0YXRpYzogZnVuY3Rpb24obmFtZSxjYikge1xuXG4gICAgICB2YXIgcHVzaF9jYiA9IGZ1bmN0aW9uKGVycm9yLHZhbHVlKSB7XG4gICAgICAgIGlmIChlcnJvcikgcmV0dXJuIHN1YnNjcmliZXIoZXJyb3IsbnVsbClcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX3N0YXRpY1tuYW1lXSA9IHZhbHVlXG4gICAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuICAgICAgICB0aGlzLnRyaWdnZXIobmFtZSwgdGhpcy5zdGF0ZSgpW25hbWVdLCB0aGlzLnN0YXRlKCkpXG5cbiAgICAgIH0uYmluZCh0aGlzKVxuXG4gICAgICBpZiAodHlwZW9mIGNiID09PSBcImZ1bmN0aW9uXCIpIGNiKHB1c2hfY2IpXG4gICAgICBlbHNlIHB1c2hfY2IoZmFsc2UsY2IpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgX3Bhc3RQdXNoOiBmdW5jdGlvbih2KSB7XG4gICAgICB0aGlzLl9wYXN0LnB1c2godilcbiAgICB9XG4gICwgX2Z1dHVyZVB1c2g6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHRoaXMuX2Z1dHVyZS5wdXNoKHYpXG4gICAgfVxuICAsIGZvcndhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fcGFzdFB1c2godGhpcy5fY3VycmVudClcbiAgICAgIHRoaXMuX2N1cnJlbnQgPSB0aGlzLl9mdXR1cmUucG9wKClcblxuICAgICAgdGhpcy5vbihcImZvcndhcmRcIikodGhpcy5fY3VycmVudCx0aGlzLl9wYXN0LCB0aGlzLl9mdXR1cmUpXG5cbiAgICAgIHRoaXMuX3N0YXRlID0gdGhpcy5fYnVpbGRTdGF0ZSgpXG4gICAgICB0aGlzLnRyaWdnZXIoZmFsc2UsIHRoaXMuX3N0YXRlLCB0aGlzLl9zdGF0ZSlcbiAgICB9XG4gICwgYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9mdXR1cmVQdXNoKHRoaXMuX2N1cnJlbnQpXG4gICAgICB0aGlzLl9jdXJyZW50ID0gdGhpcy5fcGFzdC5wb3AoKVxuXG4gICAgICB0aGlzLm9uKFwiYmFja1wiKSh0aGlzLl9jdXJyZW50LHRoaXMuX2Z1dHVyZSwgdGhpcy5fcGFzdClcblxuICAgICAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcbiAgICAgIHRoaXMudHJpZ2dlcihmYWxzZSwgdGhpcy5fc3RhdGUsIHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgdGhpcy5fbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSBcbiAgLCByZWdpc3RlckV2ZW50OiBmdW5jdGlvbihuYW1lLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2V2ZW50c1tuYW1lXSB8fCB0aGlzLl9ub29wO1xuICAgICAgdGhpcy5fZXZlbnRzW25hbWVdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBwcmVwYXJlRXZlbnQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmbiA9IHRoaXMuX2V2ZW50c1tuYW1lXSBcbiAgICAgIHJldHVybiBmbi5iaW5kKHRoaXMpXG4gICAgfVxuICAsIGRpc3BhdGNoRXZlbnQ6IGZ1bmN0aW9uKG5hbWUsZGF0YSkge1xuICAgICAgdmFyIGZuID0gdGhpcy5wcmVwYXJlRXZlbnQobmFtZSlcbiAgICAgIGZuKGRhdGEpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxufVxuXG5mdW5jdGlvbiBzdGF0ZShfY3VycmVudCwgX3N0YXRpYykge1xuICByZXR1cm4gbmV3IFN0YXRlKF9jdXJyZW50LCBfc3RhdGljKVxufVxuXG5zdGF0ZS5wcm90b3R5cGUgPSBTdGF0ZS5wcm90b3R5cGVcblxuZXhwb3J0IGRlZmF1bHQgc3RhdGU7XG4iLCJleHBvcnQgZnVuY3Rpb24gUVMoc3RhdGUpIHtcbiAgLy90aGlzLnN0YXRlID0gc3RhdGVcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRoaXMuX2VuY29kZU9iamVjdCA9IGZ1bmN0aW9uKG8pIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkobylcbiAgfVxuXG4gIHRoaXMuX2VuY29kZUFycmF5ID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvKVxuICB9XG59XG5cbi8vIExaVy1jb21wcmVzcyBhIHN0cmluZ1xuZnVuY3Rpb24gbHp3X2VuY29kZShzKSB7XG4gICAgdmFyIGRpY3QgPSB7fTtcbiAgICB2YXIgZGF0YSA9IChzICsgXCJcIikuc3BsaXQoXCJcIik7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIHZhciBjdXJyQ2hhcjtcbiAgICB2YXIgcGhyYXNlID0gZGF0YVswXTtcbiAgICB2YXIgY29kZSA9IDI1NjtcbiAgICBmb3IgKHZhciBpPTE7IGk8ZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJyQ2hhcj1kYXRhW2ldO1xuICAgICAgICBpZiAoZGljdFtwaHJhc2UgKyBjdXJyQ2hhcl0gIT0gbnVsbCkge1xuICAgICAgICAgICAgcGhyYXNlICs9IGN1cnJDaGFyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb3V0LnB1c2gocGhyYXNlLmxlbmd0aCA+IDEgPyBkaWN0W3BocmFzZV0gOiBwaHJhc2UuY2hhckNvZGVBdCgwKSk7XG4gICAgICAgICAgICBkaWN0W3BocmFzZSArIGN1cnJDaGFyXSA9IGNvZGU7XG4gICAgICAgICAgICBjb2RlKys7XG4gICAgICAgICAgICBwaHJhc2U9Y3VyckNoYXI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgb3V0LnB1c2gocGhyYXNlLmxlbmd0aCA+IDEgPyBkaWN0W3BocmFzZV0gOiBwaHJhc2UuY2hhckNvZGVBdCgwKSk7XG4gICAgZm9yICh2YXIgaT0wOyBpPG91dC5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXRbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG91dFtpXSk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbihcIlwiKTtcbn1cblxuLy8gRGVjb21wcmVzcyBhbiBMWlctZW5jb2RlZCBzdHJpbmdcbmZ1bmN0aW9uIGx6d19kZWNvZGUocykge1xuICAgIHZhciBkaWN0ID0ge307XG4gICAgdmFyIGRhdGEgPSAocyArIFwiXCIpLnNwbGl0KFwiXCIpO1xuICAgIHZhciBjdXJyQ2hhciA9IGRhdGFbMF07XG4gICAgdmFyIG9sZFBocmFzZSA9IGN1cnJDaGFyO1xuICAgIHZhciBvdXQgPSBbY3VyckNoYXJdO1xuICAgIHZhciBjb2RlID0gMjU2O1xuICAgIHZhciBwaHJhc2U7XG4gICAgZm9yICh2YXIgaT0xOyBpPGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGN1cnJDb2RlID0gZGF0YVtpXS5jaGFyQ29kZUF0KDApO1xuICAgICAgICBpZiAoY3VyckNvZGUgPCAyNTYpIHtcbiAgICAgICAgICAgIHBocmFzZSA9IGRhdGFbaV07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgIHBocmFzZSA9IGRpY3RbY3VyckNvZGVdID8gZGljdFtjdXJyQ29kZV0gOiAob2xkUGhyYXNlICsgY3VyckNoYXIpO1xuICAgICAgICB9XG4gICAgICAgIG91dC5wdXNoKHBocmFzZSk7XG4gICAgICAgIGN1cnJDaGFyID0gcGhyYXNlLmNoYXJBdCgwKTtcbiAgICAgICAgZGljdFtjb2RlXSA9IG9sZFBocmFzZSArIGN1cnJDaGFyO1xuICAgICAgICBjb2RlKys7XG4gICAgICAgIG9sZFBocmFzZSA9IHBocmFzZTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKFwiXCIpO1xufVxuXG5RUy5wcm90b3R5cGUgPSB7XG4gICAgdG86IGZ1bmN0aW9uKHN0YXRlLGVuY29kZSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIHZhciBwYXJhbXMgPSBPYmplY3Qua2V5cyhzdGF0ZSkubWFwKGZ1bmN0aW9uKGspIHtcblxuICAgICAgICB2YXIgdmFsdWUgPSBzdGF0ZVtrXVxuICAgICAgICAgICwgbyA9IHZhbHVlO1xuXG4gICAgICAgIGlmICh2YWx1ZSAmJiAodHlwZW9mKHZhbHVlKSA9PSBcIm9iamVjdFwiKSAmJiAodmFsdWUubGVuZ3RoID4gMCkpIHtcbiAgICAgICAgICBvID0gc2VsZi5fZW5jb2RlQXJyYXkodmFsdWUpXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mKHZhbHVlKSA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgbyA9IHNlbGYuX2VuY29kZU9iamVjdCh2YWx1ZSlcbiAgICAgICAgfSBcblxuICAgICAgICByZXR1cm4gayArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG8pIFxuXG4gICAgICB9KVxuXG4gICAgICBpZiAoZW5jb2RlKSByZXR1cm4gXCI/XCIgKyBcImVuY29kZWQ9XCIgKyBidG9hKGVzY2FwZShsendfZW5jb2RlKHBhcmFtcy5qb2luKFwiJlwiKSkpKTtcbiAgICAgIHJldHVybiBcIj9cIiArIHBhcmFtcy5qb2luKFwiJlwiKVxuICAgICAgXG4gICAgfVxuICAsIGZyb206IGZ1bmN0aW9uKHFzKSB7XG4gICAgICB2YXIgcXVlcnkgPSB7fTtcbiAgICAgIGlmIChxcy5pbmRleE9mKFwiP2VuY29kZWQ9XCIpID09IDApIHFzID0gbHp3X2RlY29kZSh1bmVzY2FwZShhdG9iKHFzLnNwbGl0KFwiP2VuY29kZWQ9XCIpWzFdKSkpXG4gICAgICB2YXIgYSA9IHFzLnN1YnN0cigxKS5zcGxpdCgnJicpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGIgPSBhW2ldLnNwbGl0KCc9Jyk7XG4gICAgICAgICAgXG4gICAgICAgICAgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSA9IChkZWNvZGVVUklDb21wb25lbnQoYlsxXSB8fCAnJykpO1xuICAgICAgICAgIHZhciBfY2hhciA9IHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChiWzBdKV1bMF0gXG4gICAgICAgICAgaWYgKChfY2hhciA9PSBcIntcIikgfHwgKF9jaGFyID09IFwiW1wiKSkgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSA9IEpTT04ucGFyc2UocXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBxdWVyeTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHFzKHN0YXRlKSB7XG4gIHJldHVybiBuZXcgUVMoc3RhdGUpXG59XG5cbnFzLnByb3RvdHlwZSA9IFFTLnByb3RvdHlwZVxuXG5leHBvcnQgZGVmYXVsdCBxcztcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBhcmlzb25fZXZhbChvYmoxLG9iajIsX2ZpbmFsKSB7XG4gIHJldHVybiBuZXcgQ29tcGFyaXNvbkV2YWwob2JqMSxvYmoyLF9maW5hbClcbn1cblxudmFyIG5vb3AgPSAoeCkgPT4ge31cbiAgLCBlcW9wID0gKHgseSkgPT4geCA9PSB5XG4gICwgYWNjID0gKG5hbWUsc2Vjb25kKSA9PiB7XG4gICAgICByZXR1cm4gKHgseSkgPT4gc2Vjb25kID8geVtuYW1lXSA6IHhbbmFtZV0gXG4gICAgfVxuXG5jbGFzcyBDb21wYXJpc29uRXZhbCB7XG4gIGNvbnN0cnVjdG9yKG9iajEsb2JqMixfZmluYWwpIHtcbiAgICB0aGlzLl9vYmoxID0gb2JqMVxuICAgIHRoaXMuX29iajIgPSBvYmoyXG4gICAgdGhpcy5fZmluYWwgPSBfZmluYWxcbiAgICB0aGlzLl9jb21wYXJpc29ucyA9IHt9XG4gIH1cblxuICBhY2Nlc3NvcihuYW1lLGFjYzEsYWNjMikge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jb21wYXJpc29uc1tuYW1lXSx7XG4gICAgICAgIGFjYzE6IGFjYzFcbiAgICAgICwgYWNjMjogYWNjMlxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN1Y2Nlc3MobmFtZSxmbikge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLl9jb21wYXJpc29uc1tuYW1lXSx7XG4gICAgICAgIHN1Y2Nlc3M6IGZuXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZmFpbHVyZShuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgZmFpbHVyZTogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBlcXVhbChuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgZXE6IGZuXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZXZhbHVhdGUoKSB7XG4gICAgT2JqZWN0LmtleXModGhpcy5fY29tcGFyaXNvbnMpLm1hcCggayA9PiB7XG4gICAgICB0aGlzLl9ldmFsKHRoaXMuX2NvbXBhcmlzb25zW2tdLGspXG4gICAgfSlcbiAgICByZXR1cm4gdGhpcy5fZmluYWxcbiAgfVxuICBcblxuICBjb21wYXJzaW9uKG5hbWUsYWNjMSxhY2MyLGVxLHN1Y2Nlc3MsZmFpbHVyZSkge1xuICAgIHRoaXMuX2NvbXBhcmlzb25zW25hbWVdID0ge1xuICAgICAgICBhY2MxOiBhY2MxXG4gICAgICAsIGFjYzI6IGFjYzJcbiAgICAgICwgZXE6IGVxIHx8IGVxb3BcbiAgICAgICwgc3VjY2Vzczogc3VjY2VzcyB8fCBub29wXG4gICAgICAsIGZhaWx1cmU6IGZhaWx1cmUgfHwgbm9vcFxuICAgIH1cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgX2V2YWwoY29tcGFyaXNvbixuYW1lKSB7XG4gICAgdmFyIGFjYzEgPSBjb21wYXJpc29uLmFjYzEgfHwgYWNjKG5hbWUpXG4gICAgICAsIGFjYzIgPSBjb21wYXJpc29uLmFjYzIgfHwgYWNjKG5hbWUsdHJ1ZSlcbiAgICAgICwgdmFsMSA9IGFjYzEodGhpcy5fb2JqMSx0aGlzLl9vYmoyKVxuICAgICAgLCB2YWwyID0gYWNjMih0aGlzLl9vYmoxLHRoaXMuX29iajIpXG4gICAgICAsIGVxID0gY29tcGFyaXNvbi5lcSB8fCBlcW9wXG4gICAgICAsIHN1Y2MgPSBjb21wYXJpc29uLnN1Y2Nlc3MgfHwgbm9vcFxuICAgICAgLCBmYWlsID0gY29tcGFyaXNvbi5mYWlsdXJlIHx8IG5vb3BcblxuICAgIHZhciBfZXZhbGQgPSBlcSh2YWwxLCB2YWwyKVxuXG4gICAgX2V2YWxkID8gXG4gICAgICBzdWNjLmJpbmQodGhpcykodmFsMSx2YWwyLHRoaXMuX2ZpbmFsKSA6IFxuICAgICAgZmFpbC5iaW5kKHRoaXMpKHZhbDEsdmFsMix0aGlzLl9maW5hbClcbiAgfVxuXG4gIFxufVxuIiwiZXhwb3J0IHtkZWZhdWx0IGFzIHN0YXRlfSBmcm9tIFwiLi9zcmMvc3RhdGVcIjtcbmV4cG9ydCB7ZGVmYXVsdCBhcyBxc30gZnJvbSBcIi4vc3JjL3FzXCI7XG5leHBvcnQge2RlZmF1bHQgYXMgY29tcF9ldmFsfSBmcm9tIFwiLi9zcmMvY29tcF9ldmFsXCI7XG5cbmltcG9ydCBzdGF0ZSBmcm9tIFwiLi9zcmMvc3RhdGVcIjtcblxuZGVidWdnZXJcbmV4cG9ydCBjb25zdCBzID0gd2luZG93Ll9fc3RhdGVfXyB8fCBzdGF0ZSgpXG53aW5kb3cuX19zdGF0ZV9fID0gc1xuXG5leHBvcnQgZGVmYXVsdCBzO1xuIiwiLy9pbXBvcnQgZDMgZnJvbSAnZDMnXG5cbi8qIEZST00gT1RIRVIgRklMRSAqL1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERvbWFpbnMoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5kb21haW4gfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImtleVwiOnguZG9tYWluXG4gICAgICAgICwgXCJ2YWx1ZVwiOnguY291bnRcbiAgICAgICAgLCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC51bmlxdWVzIFxuICAgICAgICAsIFwidXJsXCI6IHgudXJsXG4gICAgICB9IFxuICAgIH0pXG5cblxuXG4gIHZhbHVlcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7IFxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeFswXS5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAgLCBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LnZhbHVlID0gTWF0aC5sb2coeC50Zl9pZGYpXG4gIH0pXG4gIHZhbHVlcyA9IHZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy50Zl9pZGYgLSBwLnRmX2lkZiB9KVxuXG5cbiAgdmFyIHRvdGFsID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50KngucGVyY2VudF91bmlxdWV9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICB4LnBvcF9wZXJjZW50ID0gMS4wMi9nZXRJREYoeC5rZXkpKjEwMFxuICAgIHgucG9wX3BlcmNlbnQgPSB4LnBvcF9wZXJjZW50ID09IEluZmluaXR5ID8gMCA6IHgucG9wX3BlcmNlbnRcblxuICAgIHgucGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnBlcmNlbnR9KV0pXG4gICAgLm5pY2UoKVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgucGVyY2VudF9ub3JtID0gbm9ybSh4LnBlcmNlbnQpXG4gICAgLy94LnBlcmNlbnRfbm9ybSA9IHgucGVyY2VudFxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHZhbHVlcztcbiAgLy97XG4gIC8vICAgIGtleTogXCJUb3AgRG9tYWluc1wiXG4gIC8vICAsIHZhbHVlczogdmFsdWVzLnNsaWNlKDAsMTAwKVxuICAvL31cbn1cblxuXG4vKiBFTkQgRlJPTSBPVEhFUiBGSUxFICovXG5cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkM191cGRhdGVhYmxlKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGQzX3NwbGF0KHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYWNjZXNzb3IoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWxcbiAgcmV0dXJuIHRoaXNcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIE1lZGlhUGxhbih0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gIHRoaXMuX29uID0ge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbWVkaWFfcGxhbih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBNZWRpYVBsYW4odGFyZ2V0KVxufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1EYXRhKGRhdGEpIHtcblxuICB2YXIgY2ggPSBkYXRhLmNhdGVnb3J5X2hvdXIuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJOQVwiIH0pXG5cbiAgdmFyIGNhdGVnb3J5X2hvdXIgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgKyBcIixcIiArIHguaG91ciB9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICBwLnVuaXF1ZXMgPSAocC51bmlxdWVzIHx8IDApICsgYy51bmlxdWVzXG4gICAgICAgIHAuY291bnQgPSAocC5jb3VudCB8fCAwKSArIGMuY291bnRcbiAgICAgXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuICAgIH0pXG4gICAgLmVudHJpZXMoY2gpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwiY2F0ZWdvcnlcIjogeC5rZXkuc3BsaXQoXCIsXCIpWzBdXG4gICAgICAgICwgXCJob3VyXCI6IHgua2V5LnNwbGl0KFwiLFwiKVsxXVxuICAgICAgICAsIFwiY291bnRcIjogeC52YWx1ZXMuY291bnRcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC52YWx1ZXMudW5pcXVlc1xuICAgICAgfVxuICAgIH0pXG5cbiAgdmFyIHNjYWxlZCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jYXRlZ29yeSB9IClcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHZhciBtaW4gPSBkMy5taW4odixmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50IH0pXG4gICAgICAgICwgbWF4ID0gZDMubWF4KHYsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5jb3VudCB9KVxuXG4gICAgICAgdmFyIHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgIC5kb21haW4oW21pbixtYXhdKVxuICAgICAgICAgLnJhbmdlKFswLDEwMF0pXG4gICAgICAgXG4gICAgICAgdmFyIGhvdXJzID0gZDMucmFuZ2UoMCwyNClcbiAgICAgICBob3VycyA9IGhvdXJzLnNsaWNlKC00LDI0KS5jb25jYXQoaG91cnMuc2xpY2UoMCwyMCkpLy8uc2xpY2UoMykuY29uY2F0KGhvdXJzLnNsaWNlKDAsMykpXG5cbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcIm5vcm1lZFwiOiBob3Vycy5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gdltpXSA/IHNjYWxlKHZbaV0uY291bnQpIDogMCB9KVxuICAgICAgICAgLCBcImNvdW50XCI6IGhvdXJzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiB2W2ldID8gdltpXS5jb3VudCA6IDAgfSlcbiAgICAgICB9XG4gICAgICAgLy9yZXR1cm4gaG91cmx5XG4gICAgfSlcbiAgICAuZW50cmllcyhjYXRlZ29yeV9ob3VyKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyB4LnRvdGFsID0gZDMuc3VtKHgudmFsdWVzKTsgcmV0dXJuIHh9KVxuICAgIC8vLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRvdGFsIC0gcC50b3RhbH0pXG5cbiAgcmV0dXJuIHNjYWxlZFxufVxuXG5NZWRpYVBsYW4ucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgLy9kZWJ1Z2dlclxuICAgICAgaWYgKHRoaXMuZGF0YSgpLmNhdGVnb3J5X2hvdXIgPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1xuXG4gICAgICAgICAgdmFyIF9kID0gdGhpcy5kYXRhKClcbiAgICAgICAgICBfZC5kaXNwbGF5X2NhdGVnb3JpZXMgPSBfZC5kaXNwbGF5X2NhdGVnb3JpZXMgfHwge1widmFsdWVzXCI6W119XG4gICAgICAgICAgdmFyIGRkID0gYnVpbGREb21haW5zKF9kKVxuXG4gICAgICB2YXIgc2NhbGVkID0gdHJhbnNmb3JtRGF0YSh0aGlzLmRhdGEoKSlcblxuICAgICAgXG4gICAgICBzY2FsZWQubWFwKGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICB4LmNvdW50ID0geC52YWx1ZXMuY291bnRcbiAgICAgICAgeC52YWx1ZXM9IHgudmFsdWVzLm5vcm1lZFxuXG4gICAgICB9KVxuXG5cbiAgICAgIHRoaXMucmVuZGVyX2xlZnQoc2NhbGVkKVxuICAgICAgdGhpcy5yZW5kZXJfcmlnaHQoZGQsc2NhbGVkKVxuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHJlbmRlcl9yaWdodDogZnVuY3Rpb24oZCxyb3dfZGF0YSkge1xuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLnJoc1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicmhzIGNvbC1tZC00XCIsdHJ1ZSlcblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsIFwiaDNcIixcImgzXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIkFib3V0IHRoZSBwbGFuXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLmRlc2NcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImRlc2NcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiSGluZHNpZ2h0IGhhcyBhdXRvbWF0aWNhbGx5IGRldGVybWluZWQgdGhlIGJlc3Qgc2l0ZXMgYW5kIHRpbWVzIHdoZXJlIHlvdSBzaG91bGQgYmUgdGFyZ2V0aW5nIHVzZXJzLiBUaGUgbWVkaWEgcGxhbiBwcmVzZW50ZWQgYmVsb3cgZGVzY3JpYmVzIHRoZSBvcHRpbWl6YXRpb25zIHRoYXQgY2FuIGJlIG1hZGUgdG8gYW55IHByb3NwZWN0aW5nIG9yIHJldGFyZ2V0aW5nIGNhbXBhaWduIHRvIGxvd2VyIENQQSBhbmQgc2F2ZSBtb25leS5cIilcblxuICAgICAgdmFyIHBsYW5fdGFyZ2V0ID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLnBsYW4tdGFyZ2V0XCIsXCJkaXZcIixyb3dfZGF0YSxmdW5jdGlvbigpe3JldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJwbGFuLXRhcmdldFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjEwMHB4XCIpXG5cbiAgICAgIHBsYW5fdGFyZ2V0LmV4aXQoKS5yZW1vdmUoKVxuXG5cbiAgICAgIGlmIChyb3dfZGF0YS5sZW5ndGggPiAxKSB7XG4gICAgICAgIHZhciByZW1haW5kZXJzID0gcm93X2RhdGEubWFwKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgXG4gICAgICAgICAgdmFyIHRvX3RhcmdldCA9IGQzLnN1bShyLm1hc2subWFwKGZ1bmN0aW9uKHgsaSl7IHJldHVybiB4ID8gci5jb3VudFtpXSA6IDB9KSlcbiAgICAgICAgICB2YXIgdG90YWwgPSBkMy5zdW0oci5jb3VudClcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0b3RhbDogdG90YWxcbiAgICAgICAgICAgICwgdG9fdGFyZ2V0OiB0b190YXJnZXRcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdmFyIGN1dCA9IGQzLnN1bShyZW1haW5kZXJzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC50b190YXJnZXQqMS4wIH0pXG4gICAgICAgIHZhciB0b3RhbCA9IGQzLnN1bShyZW1haW5kZXJzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC50b3RhbCB9KSBcbiAgICAgICAgdmFyIHBlcmNlbnQgPSBjdXQvdG90YWxcblxuICAgICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsIFwiaDMuc3VtbWFyeVwiLFwiaDNcIixmdW5jdGlvbih4KSB7IHJldHVybiBbeF19ICwgZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgICAgLmNsYXNzZWQoXCJzdW1tYXJ5XCIsdHJ1ZSlcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAgIC50ZXh0KFwiUGxhbiBTdW1tYXJ5XCIpXG5cblxuXG4gICAgICAgIGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIud2hhdFwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gW3hdfSAsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAgIC5jbGFzc2VkKFwid2hhdFwiLHRydWUpXG4gICAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0nZm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoyMDBweDtwYWRkaW5nLWxlZnQ6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPlBvdGVudGlhbCBBZHMgU2VydmVkOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiLFwiKSh0b3RhbClcbiAgICAgICAgICB9KVxuXG4gICAgICAgIGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIuYW1vdW50XCIsXCJkaXZcIixmdW5jdGlvbih4KSB7IHJldHVybiBbeF19ICwgZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgICAgLmNsYXNzZWQoXCJhbW91bnRcIix0cnVlKVxuICAgICAgICAgIC5odG1sKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIjxkaXYgc3R5bGU9J2ZvbnQtd2VpZ2h0OmJvbGQ7d2lkdGg6MjAwcHg7cGFkZGluZy1sZWZ0OjEwcHg7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2Rpc3BsYXk6aW5saW5lLWJsb2NrJz5PcHRpbWl6ZWQgQWQgU2VydmluZzo8L2Rpdj5cIiArIGQzLmZvcm1hdChcIixcIikoY3V0KSArIFwiIChcIiArIGQzLmZvcm1hdChcIiVcIikocGVyY2VudCkgKyBcIilcIlxuICAgICAgICAgIH0pXG5cbiAgICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi5jcGFcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFt4XX0gLCBmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgICAuY2xhc3NlZChcImNwYVwiLHRydWUpXG4gICAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0nZm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoyMDBweDtwYWRkaW5nLWxlZnQ6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPkVzdGltYXRlZCBDUEEgcmVkdWN0aW9uOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiJVwiKSgxLXBlcmNlbnQpXG4gICAgICAgICAgfSlcblxuXG5cblxuXG4gICAgICAgXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB2YXIgcGxhbl90YXJnZXQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIucGxhbi1kZXRhaWxzXCIsXCJkaXZcIixyb3dfZGF0YSlcbiAgICAgICAgLmNsYXNzZWQoXCJwbGFuLWRldGFpbHNcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCIxNjBweFwiKVxuXG5cblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LCBcImgzLmRldGFpbHNcIixcImgzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZGV0YWlsc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIlBsYW4gRGV0YWlsc1wiKVxuXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LFwiLndoYXRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIndoYXRcIix0cnVlKVxuICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0ncGFkZGluZy1sZWZ0OjEwcHg7Zm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoxNDBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPkNhdGVnb3J5OjwvZGl2PlwiICsgeC5rZXlcbiAgICAgICAgfSlcblxuICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi5zYXZpbmdcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNhdmluZ1wiLHRydWUpXG4gICAgICAgIC5odG1sKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkLmNvdW50KVxuICAgICAgICAgIHZhciBwZXJjZW50ID0gZDMuc3VtKHguY291bnQsZnVuY3Rpb24oeixpKSB7IHJldHVybiB4Lm1hc2tbaV0gPyAwIDogen0pL2QzLnN1bSh4LmNvdW50LGZ1bmN0aW9uKHosaSkgeyByZXR1cm4geiB9KVxuICAgICAgICAgIHJldHVybiBcIjxkaXYgc3R5bGU9J3BhZGRpbmctbGVmdDoxMHB4O2ZvbnQtd2VpZ2h0OmJvbGQ7d2lkdGg6MTQwcHg7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2Rpc3BsYXk6aW5saW5lLWJsb2NrJz5TdHJhdGVneSBzYXZpbmdzOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiJVwiKShwZXJjZW50KVxuICAgICAgICB9KVxuXG4gICAgICB2YXIgd2hlbiA9IGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIud2hlblwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKXsgcmV0dXJuIDEgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ3aGVuXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI4MHB4XCIpXG4gICAgICAgIC5odG1sKFwiPGRpdiBzdHlsZT0ncGFkZGluZy1sZWZ0OjEwcHg7d2lkdGg6MTQwcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7dmVydGljYWwtYWxpZ246dG9wJz5XaGVuIHRvIHNlcnZlOjwvZGl2PlwiKVxuICAgICAgICAuZGF0dW0oZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBib29sID0gZmFsc2VcbiAgICAgICAgICB2YXIgcG9zID0gLTFcbiAgICAgICAgICB2YXIgc3RhcnRfZW5kcyA9IHgubWFzay5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IFxuICAgICAgICAgICAgICBwb3MgKz0gMVxuICAgICAgICAgICAgICBpZiAoYm9vbCAhPSBjKSB7XG4gICAgICAgICAgICAgICAgYm9vbCA9IGNcbiAgICAgICAgICAgICAgICBwLnB1c2gocG9zKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgICB9LFtdKVxuICAgICAgICAgIHZhciBzID0gXCJcIlxuICAgICAgICAgIHN0YXJ0X2VuZHMubWFwKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgICAgaWYgKChpICE9IDApICYmICgoaSUyKSA9PSAwKSkgcyArPSBcIiwgXCJcbiAgICAgICAgICAgIGlmIChpJTIpIHMgKz0gXCIgLSBcIlxuXG4gICAgICAgICAgICBpZiAoeCA9PSAwKSBzICs9IFwiMTJhbVwiXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIG51bSA9ICh4KzEpJTEyXG4gICAgICAgICAgICAgIG51bSA9IG51bSA9PSAwID8gMTIgOiBudW1cbiAgICAgICAgICAgICAgcyArPSBudW0gKyAoKHggPiAxMSkgPyBcInBtXCIgOiBcImFtXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgIFxuICAgICAgICAgIH0pXG4gICAgICAgICAgaWYgKChzdGFydF9lbmRzLmxlbmd0aCkgJSAyKSBzICs9IFwiIC0gMTJhbVwiXG5cbiAgICAgICAgICByZXR1cm4gcy5zcGxpdChcIiwgXCIpXG4gICAgICAgIH0pXG5cbiAgICAgICB2YXIgaXRlbXMgPSBkM191cGRhdGVhYmxlKHdoZW4sXCIuaXRlbXNcIixcImRpdlwiKVxuICAgICAgICAgLmNsYXNzZWQoXCJpdGVtc1wiLHRydWUpXG4gICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQwcHhcIilcbiAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICAgZDNfc3BsYXQoaXRlbXMsXCIuaXRlbVwiLFwiZGl2XCIpXG4gICAgICAgICAuY2xhc3NlZChcIml0ZW1cIix0cnVlKVxuICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0MHB4XCIpXG4gICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJub25lXCIpXG4gICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwibm9ybWFsXCIpXG4gICAgICAgICAudGV4dChTdHJpbmcpXG5cblxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCJoMy5leGFtcGxlLXNpdGVzXCIsXCJoM1wiKVxuICAgICAgICAuY2xhc3NlZChcImV4YW1wbGUtc2l0ZXNcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjIwcHhcIilcbiAgICAgICAgLnRleHQoXCJFeGFtcGxlIFNpdGVzXCIpXG5cblxuICAgICAgIHZhciByb3dzID0gZDNfc3BsYXQod3JhcHBlcixcIi5yb3dcIixcImRpdlwiLGQuc2xpY2UoMCwxNSksZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxOHB4XCIpXG4gICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjIwcHhcIilcblxuICAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICByZXR1cm4geC5rZXlcbiAgICAgICAgIH0pXG5cbiAgICAgICByb3dzLmV4aXQoKS5yZW1vdmUoKVxuXG5cbiAgICB9XG4gICwgcmVuZGVyX2xlZnQ6IGZ1bmN0aW9uKHNjYWxlZCkge1xuXG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIubGhzXCIsXCJkaXZcIixzY2FsZWQpXG4gICAgICAgIC5jbGFzc2VkKFwibGhzIGNvbC1tZC04XCIsdHJ1ZSlcblxuICAgICAgd3JhcHBlci5leGl0KCkucmVtb3ZlKClcblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsIFwiaDNcIixcImgzXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIk1lZGlhIFBsYW4gKENhdGVnb3J5IGFuZCBUaW1lIE9wdGltaXphdGlvbilcIilcblxuICAgICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLmhlYWRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImhlYWRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIxcHhcIilcblxuICAgICAgdmFyIG5hbWUgPSBkM191cGRhdGVhYmxlKGhlYWQsXCIubmFtZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNzBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICAgZDNfc3BsYXQoaGVhZCxcIi5ob3VyXCIsXCJkaXZcIixkMy5yYW5nZSgxLDI1KSxmdW5jdGlvbih4KSB7IHJldHVybiB4IH0pXG4gICAgICAgIC5jbGFzc2VkKFwic3EgaG91clwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuODVlbVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGlmICh4ID09IDEpIHJldHVybiBcIjxiPjFhPC9iPlwiXG4gICAgICAgICAgaWYgKHggPT0gMjQpIHJldHVybiBcIjxiPjEyYTwvYj5cIlxuICAgICAgICAgIGlmICh4ID09IDEyKSByZXR1cm4gXCI8Yj4xMnA8L2I+XCJcbiAgICAgICAgICByZXR1cm4geCA+IDExID8geCUxMiA6IHhcbiAgICAgICAgfSlcblxuXG4gICAgICB2YXIgcm93ID0gZDNfc3BsYXQod3JhcHBlcixcIi5yb3dcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMXB4XCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgKyBcIiByb3dcIiB9KVxuICAgICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICB2YXIgX2QgPSBzZWxmLmRhdGEoKVxuICAgICAgICAgIF9kLmRpc3BsYXlfY2F0ZWdvcmllcyA9IF9kLmRpc3BsYXlfY2F0ZWdvcmllcyB8fCB7XCJ2YWx1ZXNcIjpbXX1cbiAgICAgICAgICB2YXIgZGQgPSBidWlsZERvbWFpbnMoX2QpXG5cbiAgICAgICAgICB2YXIgZCA9IGRkLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6LnBhcmVudF9jYXRlZ29yeV9uYW1lID09IHgua2V5fSlcbiAgICAgICAgICBcblxuICAgICAgICAgIHNlbGYucmVuZGVyX3JpZ2h0KGQseClcbiAgICAgICAgfSlcblxuICAgICAgdmFyIE1BR0lDID0gMjUgXG5cbiAgICAgIHZhciBuYW1lID0gZDNfdXBkYXRlYWJsZShyb3csXCIubmFtZVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNzBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICB2YXIgY29sb3JzID0gW1wiI2ExZDk5YlwiLCBcIiM3NGM0NzZcIiwgXCIjNDFhYjVkXCIsIFwiIzIzOGI0NVwiLCBcIiMwMDZkMmNcIiwgXCIjMDA0NDFiXCJdXG4gICAgICB2YXIgY29sb3JzID0gW1wiIzIzOGI0NVwiXVxuXG4gICAgICB2YXIgbyA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgICAuZG9tYWluKFstMjUsMTAwXSlcbiAgICAgICAgLnJhbmdlKGNvbG9ycyk7XG5cbiAgICAgIHZhciBzcXVhcmUgPSBkM19zcGxhdChyb3csXCIuc3FcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWVzIH0sIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSB9KSBcbiAgICAgICAgLmNsYXNzZWQoXCJzcVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLGZ1bmN0aW9uKHgsaSkgeyBcbiAgICAgICAgICB2YXIgcGQgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX187IFxuICAgICAgICAgIHBkLm1hc2sgPSBwZC5tYXNrIHx8IFtdXG4gICAgICAgICAgcGQubWFza1tpXSA9ICgoeCA+IE1BR0lDKSAmJiAoIChwZC52YWx1ZXNbaS0xXSA+IE1BR0lDIHx8IGZhbHNlKSB8fCAocGQudmFsdWVzW2krMV0gPiBNQUdJQ3x8IGZhbHNlKSApKVxuICAgICAgICAgIC8vcmV0dXJuIHBkLm1hc2tbaV0gPyBvKHBkLnZhbHVlc1tpXSkgIDogXCJyZXBlYXRpbmctbGluZWFyLWdyYWRpZW50KCA0NWRlZywgI2ZlZTBkMiwgI2ZlZTBkMiAycHgsICNmY2JiYTEgNXB4LCAjZmNiYmExIDJweCkgXCJcbiAgICAgICAgICByZXR1cm4gcGQubWFza1tpXSA/IFxuICAgICAgICAgICAgXCJyZXBlYXRpbmctbGluZWFyLWdyYWRpZW50KCAxMzVkZWcsICMyMzhiNDUsICMyMzhiNDUgMnB4LCAjMDA2ZDJjIDVweCwgIzAwNmQyYyAycHgpIFwiIDogXG4gICAgICAgICAgICBcInJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoIDQ1ZGVnLCAjZmVlMGQyLCAjZmVlMGQyIDJweCwgI2ZjYmJhMSA1cHgsICNmY2JiYTEgMnB4KSBcIlxuXG4gICAgICAgIH0pXG5cblxuICAgIH1cbiAgLCBkYXRhOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fdGFyZ2V0LmRhdHVtKClcbiAgICAgIHRoaXMuX3RhcmdldC5kYXR1bShkKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbixmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBwcmVwRGF0YShkZCkge1xuICB2YXIgcCA9IFtdXG4gIGQzLnJhbmdlKDAsMjQpLm1hcChmdW5jdGlvbih0KSB7XG4gICAgW1wiMFwiLFwiMjBcIixcIjQwXCJdLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICBpZiAodCA8IDEwKSBwLnB1c2goXCIwXCIgKyBTdHJpbmcodCkrU3RyaW5nKG0pKVxuICAgICAgZWxzZSBwLnB1c2goU3RyaW5nKHQpK1N0cmluZyhtKSlcblxuICAgIH0pXG4gIH0pXG4gIHZhciByb2xsZWQgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKGspIHsgcmV0dXJuIGsuaG91ciArIGsubWludXRlIH0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgIHAuYXJ0aWNsZXNbYy51cmxdID0gdHJ1ZVxuICAgICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgICAgcC5zZXNzaW9ucyArPSBjLnVuaXF1ZXNcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0seyBhcnRpY2xlczoge30sIHZpZXdzOiAwLCBzZXNzaW9uczogMH0pXG4gICAgfSlcbiAgICAuZW50cmllcyhkZClcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgIE9iamVjdC5rZXlzKHgudmFsdWVzKS5tYXAoZnVuY3Rpb24oeSkge1xuICAgICAgICB4W3ldID0geC52YWx1ZXNbeV1cbiAgICAgIH0pXG4gICAgICB4LmFydGljbGVfY291bnQgPSBPYmplY3Qua2V5cyh4LmFydGljbGVzKS5sZW5ndGhcbiAgICAgIHguaG91ciA9IHgua2V5LnNsaWNlKDAsMilcbiAgICAgIHgubWludXRlID0geC5rZXkuc2xpY2UoMilcbiAgICAgIHgudmFsdWUgPSB4LmFydGljbGVfY291bnRcbiAgICAgIHgua2V5ID0gcC5pbmRleE9mKHgua2V5KVxuICAgICAgLy9kZWxldGUgeFsnYXJ0aWNsZXMnXVxuICAgICAgcmV0dXJuIHhcbiAgICB9KVxuICByZXR1cm4gcm9sbGVkXG59XG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5RGF0YShkYXRhKSB7XG4gICAgICB2YXIgcmVkdWNlZCA9IGRhdGEucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICAgIHAuZG9tYWluc1tjLmRvbWFpbl0gPSB0cnVlXG4gICAgICAgICAgcC5hcnRpY2xlc1tjLnVybF0gPSB0cnVlXG4gICAgICAgICAgcC52aWV3cyArPSBjLmNvdW50XG4gICAgICAgICAgcC5zZXNzaW9ucyArPSBjLnVuaXF1ZXNcblxuICAgICAgICAgIHJldHVybiBwXG4gICAgICAgIH0se1xuICAgICAgICAgICAgZG9tYWluczoge31cbiAgICAgICAgICAsIGFydGljbGVzOiB7fVxuICAgICAgICAgICwgc2Vzc2lvbnM6IDBcbiAgICAgICAgICAsIHZpZXdzOiAwXG4gICAgICAgIH0pXG5cbiAgICAgIHJlZHVjZWQuZG9tYWlucyA9IE9iamVjdC5rZXlzKHJlZHVjZWQuZG9tYWlucykubGVuZ3RoXG4gICAgICByZWR1Y2VkLmFydGljbGVzID0gT2JqZWN0LmtleXMocmVkdWNlZC5hcnRpY2xlcykubGVuZ3RoXG5cbiAgICAgIHJldHVybiByZWR1Y2VkXG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU3VtbWFyeUFnZ3JlZ2F0aW9uKHNhbXAscG9wKSB7XG4gICAgICB2YXIgZGF0YV9zdW1tYXJ5ID0ge31cbiAgICAgIE9iamVjdC5rZXlzKHNhbXApLm1hcChmdW5jdGlvbihrKSB7XG4gICAgICAgIGRhdGFfc3VtbWFyeVtrXSA9IHtcbiAgICAgICAgICAgIHNhbXBsZTogc2FtcFtrXVxuICAgICAgICAgICwgcG9wdWxhdGlvbjogcG9wW2tdXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBkYXRhX3N1bW1hcnlcbiAgXG59XG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXRlZ29yaWVzT2xkKGRhdGEpIHtcbiAgdmFyIHZhbHVlcyA9IGRhdGEuY2F0ZWdvcnlcbiAgICAgICAgLm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHtcImtleVwiOiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lLCBcInZhbHVlXCI6IHguY291bnQgfSB9KVxuICAgICAgICAuc29ydChmdW5jdGlvbihwLGMpIHtyZXR1cm4gYy52YWx1ZSAtIHAudmFsdWUgfSkuc2xpY2UoMCwxNSlcbiAgICAsIHRvdGFsID0gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLCB4KSB7cmV0dXJuIHAgKyB4LnZhbHVlIH0sIDApXG5cbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJDYXRlZ29yaWVzXCJcbiAgICAsIHZhbHVlczogdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IHgucGVyY2VudCA9IHgudmFsdWUvdG90YWw7IHJldHVybiB4fSlcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUaW1lcyhkYXRhKSB7XG5cbiAgdmFyIGhvdXIgPSBkYXRhLmN1cnJlbnRfaG91clxuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIGlmIChjYXRlZ29yaWVzLmxlbmd0aCA+IDApIHtcbiAgICBob3VyID0gZGF0YS5jYXRlZ29yeV9ob3VyLmZpbHRlcihmdW5jdGlvbih4KSB7cmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZih4LnBhcmVudF9jYXRlZ29yeV9uYW1lKSA+IC0xfSlcbiAgICBob3VyID0gZDMubmVzdCgpXG4gICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguaG91ciB9KVxuICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4Lm1pbnV0ZSB9KVxuICAgICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICAgIHJldHVybiB2LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgXG4gICAgICAgICAgcC51bmlxdWVzID0gKHAudW5pcXVlcyB8fCAwKSArIGMudW5pcXVlczsgXG4gICAgICAgICAgcC5jb3VudCA9IChwLmNvdW50IHx8IDApICsgYy5jb3VudDsgIFxuICAgICAgICAgIHJldHVybiBwIH0se30pXG4gICAgICB9KVxuICAgICAgLmVudHJpZXMoaG91cilcbiAgICAgIC5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgY29uc29sZS5sb2coeC52YWx1ZXMpOyBcbiAgICAgICAgcmV0dXJuIHgudmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLGspeyBcbiAgICAgICAgICBwWydtaW51dGUnXSA9IHBhcnNlSW50KGsua2V5KTsgXG4gICAgICAgICAgcFsnY291bnQnXSA9IGsudmFsdWVzLmNvdW50OyBcbiAgICAgICAgICBwWyd1bmlxdWVzJ10gPSBrLnZhbHVlcy51bmlxdWVzOyBcbiAgICAgICAgICByZXR1cm4gcCBcbiAgICAgIH0sIHtcImhvdXJcIjp4LmtleX0pIH0gKVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGhvdXJcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHtcImtleVwiOiBwYXJzZUZsb2F0KHguaG91cikgKyAxICsgeC5taW51dGUvNjAsIFwidmFsdWVcIjogeC5jb3VudCB9IH0pXG5cbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJCcm93c2luZyBiZWhhdmlvciBieSB0aW1lXCJcbiAgICAsIHZhbHVlczogdmFsdWVzXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVG9waWNzKGRhdGEpIHtcblxuICB2YXIgY2F0ZWdvcmllcyA9IGRhdGEuZGlzcGxheV9jYXRlZ29yaWVzLnZhbHVlc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC50b3BpY30pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7cmV0dXJuIHhbMF0uaWRmIH0pXG4gICAgLm1hcChkYXRhLmZ1bGxfdXJscy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiSW50ZXJuZXQgJiBUZWxlY29tXCJ9KSApXG5cbiAgdmFyIGdldElERiA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gKGlkZlt4XSA9PSBcIk5BXCIpIHx8IChpZGZbeF0gPiA4Njg2KSA/IDAgOiBpZGZbeF1cbiAgfVxuXG4gIHZhciB2YWx1ZXMgPSBkYXRhLmZ1bGxfdXJsc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b3BpYyA/IHgudG9waWMudG9Mb3dlckNhc2UoKSAhPSBcIm5vIHRvcGljXCIgOiB0cnVlIH0pXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImtleVwiOngudG9waWNcbiAgICAgICAgLCBcInZhbHVlXCI6eC5jb3VudFxuICAgICAgICAsIFwidW5pcXVlc1wiOiB4LnVuaXF1ZXMgXG4gICAgICAgICwgXCJ1cmxcIjogeC51cmxcbiAgICAgIH0gXG4gICAgfSlcblxuXG5cbiAgdmFsdWVzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5fSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgXCJrZXlcIjogeFswXS5rZXlcbiAgICAgICAgICwgXCJ2YWx1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnZhbHVlfSwwKVxuICAgICAgICAgLCBcInBlcmNlbnRfdW5pcXVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudW5pcXVlcy9jLnZhbHVlfSwwKS94Lmxlbmd0aFxuICAgICAgICAgLCBcInVybHNcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHAuaW5kZXhPZihjLnVybCkgPT0gLTEgPyBwLnB1c2goYy51cmwpIDogcDsgcmV0dXJuIHAgfSxbXSlcblxuICAgICAgIH0gXG4gICAgfSlcbiAgICAuZW50cmllcyh2YWx1ZXMpLm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHgudmFsdWVzIH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMClcbiAgICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTEgfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnRmX2lkZiA9IGdldElERih4LmtleSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpIFxuICAgIHguY291bnQgPSB4LnZhbHVlXG4gICAgeC5pbXBvcnRhbmNlID0gTWF0aC5sb2coeC50Zl9pZGYpXG4gIH0pXG4gIHZhbHVlcyA9IHZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy50Zl9pZGYgLSBwLnRmX2lkZiB9KVxuXG5cbiAgdmFyIHRvdGFsID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50KngucGVyY2VudF91bmlxdWV9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICB4LnBvcF9wZXJjZW50ID0gMS4wMi9nZXRJREYoeC5rZXkpKjEwMFxuICAgIHgucG9wX3BlcmNlbnQgPSB4LnBvcF9wZXJjZW50ID09IEluZmluaXR5ID8gMCA6IHgucG9wX3BlcmNlbnRcblxuICAgIHguc2FtcGxlX3BlcmNlbnQgPSB4LmNvdW50KngucGVyY2VudF91bmlxdWUvdG90YWwqMTAwXG4gIH0pXG5cbiAgdmFyIG5vcm0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgIC5yYW5nZShbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXsgcmV0dXJuIHgucG9wX3BlcmNlbnR9KV0pXG4gICAgLmRvbWFpbihbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXtyZXR1cm4geC5zYW1wbGVfcGVyY2VudH0pXSlcbiAgICAubmljZSgpXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5zYW1wbGVfcGVyY2VudF9ub3JtID0gbm9ybSh4LnNhbXBsZV9wZXJjZW50KVxuXG4gICAgeC5yYXRpbyA9IHguc2FtcGxlX3BlcmNlbnQveC5wb3BfcGVyY2VudFxuICAgIC8veC5wZXJjZW50X25vcm0gPSB4LnBlcmNlbnRcbiAgfSlcblxuXG5cbiAgXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiVG9wIFRvcGljc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5zbGljZSgwLDMwMClcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGREb21haW5zKGRhdGEpIHtcblxuICB2YXIgY2F0ZWdvcmllcyA9IGRhdGEuZGlzcGxheV9jYXRlZ29yaWVzLnZhbHVlc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuICB2YXIgaWRmID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7cmV0dXJuIHguZG9tYWluIH0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7cmV0dXJuIHhbMF0uaWRmIH0pXG4gICAgLm1hcChkYXRhLmZ1bGxfdXJscy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiSW50ZXJuZXQgJiBUZWxlY29tXCJ9KSApXG5cbiAgdmFyIGdldElERiA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gKGlkZlt4XSA9PSBcIk5BXCIpIHx8IChpZGZbeF0gPiA4Njg2KSA/IDAgOiBpZGZbeF1cbiAgfVxuXG4gIHZhciB2YWx1ZXMgPSBkYXRhLmZ1bGxfdXJsc1xuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJrZXlcIjp4LmRvbWFpblxuICAgICAgICAsIFwidmFsdWVcIjp4LmNvdW50XG4gICAgICAgICwgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICwgXCJ1bmlxdWVzXCI6IHgudW5pcXVlcyBcbiAgICAgICAgLCBcInVybFwiOiB4LnVybFxuICAgICAgfSBcbiAgICB9KVxuXG5cblxuICB2YWx1ZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXl9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHhbMF0ucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgICwgXCJrZXlcIjogeFswXS5rZXlcbiAgICAgICAgICwgXCJ2YWx1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnZhbHVlfSwwKVxuICAgICAgICAgLCBcInBlcmNlbnRfdW5pcXVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudW5pcXVlcy9jLnZhbHVlfSwwKS94Lmxlbmd0aFxuICAgICAgICAgLCBcInVybHNcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHAuaW5kZXhPZihjLnVybCkgPT0gLTEgPyBwLnB1c2goYy51cmwpIDogcDsgcmV0dXJuIHAgfSxbXSlcblxuICAgICAgIH0gXG4gICAgfSlcbiAgICAuZW50cmllcyh2YWx1ZXMpLm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHgudmFsdWVzIH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMClcbiAgICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTEgfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnRmX2lkZiA9IGdldElERih4LmtleSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpIFxuICAgIHguY291bnQgPSB4LnZhbHVlXG4gICAgeC5pbXBvcnRhbmNlID0gTWF0aC5sb2coeC50Zl9pZGYpXG4gIH0pXG4gIHZhbHVlcyA9IHZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy50Zl9pZGYgLSBwLnRmX2lkZiB9KVxuXG5cbiAgdmFyIHRvdGFsID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50KngucGVyY2VudF91bmlxdWV9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkgeyBcbiAgICB4LnBvcF9wZXJjZW50ID0gMS4wMi9nZXRJREYoeC5rZXkpKjEwMFxuICAgIHgucG9wX3BlcmNlbnQgPSB4LnBvcF9wZXJjZW50ID09IEluZmluaXR5ID8gMCA6IHgucG9wX3BlcmNlbnRcblxuICAgIHguc2FtcGxlX3BlcmNlbnQgPSB4LmNvdW50KngucGVyY2VudF91bmlxdWUvdG90YWwqMTAwXG4gIH0pXG5cbiAgdmFyIG5vcm0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgIC5yYW5nZShbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXsgcmV0dXJuIHgucG9wX3BlcmNlbnR9KV0pXG4gICAgLmRvbWFpbihbMCwgZDMubWF4KHZhbHVlcyxmdW5jdGlvbih4KXtyZXR1cm4geC5zYW1wbGVfcGVyY2VudH0pXSlcbiAgICAubmljZSgpXG5cbiAgdmFyIHR0ID0gZDMuc3VtKHZhbHVlcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LnBvcF9wZXJjZW50IH0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5zYW1wbGVfcGVyY2VudF9ub3JtID0gbm9ybSh4LnNhbXBsZV9wZXJjZW50KVxuICAgIHgucmVhbF9wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQvdHQqMTAwXG4gICAgeC5yYXRpbyA9IHguc2FtcGxlX3BlcmNlbnQveC5yZWFsX3BvcF9wZXJjZW50XG5cbiAgfSlcblxuXG5cbiAgXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiVG9wIERvbWFpbnNcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCw1MDApXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVXJscyhkYXRhKSB7XG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkYXRhLmRpc3BsYXlfY2F0ZWdvcmllcy52YWx1ZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB7XCJrZXlcIjp4LnVybCxcInZhbHVlXCI6eC5jb3VudCwgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lfSB9KVxuXG4gIGlmIChjYXRlZ29yaWVzLmxlbmd0aCA+IDApXG4gICAgdmFsdWVzID0gdmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KSB7cmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZih4LnBhcmVudF9jYXRlZ29yeV9uYW1lKSA+IC0xIH0pXG5cbiAgdmFsdWVzID0gdmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB4LmtleVxuICAgICAgICAucmVwbGFjZShcImh0dHA6Ly9cIixcIlwiKVxuICAgICAgICAucmVwbGFjZShcImh0dHBzOi8vXCIsXCJcIilcbiAgICAgICAgLnJlcGxhY2UoXCJ3d3cuXCIsXCJcIikuc3BsaXQoXCIuXCIpLnNsaWNlKDEpLmpvaW4oXCIuXCIpLnNwbGl0KFwiL1wiKVsxXS5sZW5ndGggPiA1XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH0pLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnZhbHVlIC0gcC52YWx1ZSB9KVxuXG5cbiAgXG4gIHJldHVybiB7XG4gICAgICBrZXk6IFwiVG9wIEFydGljbGVzXCJcbiAgICAsIHZhbHVlczogdmFsdWVzLnNsaWNlKDAsMTAwKVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZE9uc2l0ZVN1bW1hcnkoZGF0YSkge1xuICB2YXIgeWVzdGVyZGF5ID0gZGF0YS50aW1lc2VyaWVzX2RhdGFbMF1cbiAgdmFyIHZhbHVlcyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJrZXlcIjogXCJQYWdlIFZpZXdzXCJcbiAgICAgICAgICAsIFwidmFsdWVcIjogeWVzdGVyZGF5LnZpZXdzXG4gICAgICAgIH1cbiAgICAgICwge1xuICAgICAgICAgICAgXCJrZXlcIjogXCJVbmlxdWUgVmlzaXRvcnNcIlxuICAgICAgICAgICwgXCJ2YWx1ZVwiOiB5ZXN0ZXJkYXkudW5pcXVlc1xuXG4gICAgICAgIH1cbiAgICBdXG4gIHJldHVybiB7XCJrZXlcIjpcIk9uLXNpdGUgQWN0aXZpdHlcIixcInZhbHVlc1wiOnZhbHVlc31cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkT2Zmc2l0ZVN1bW1hcnkoZGF0YSkge1xuICB2YXIgdmFsdWVzID0gWyAgXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwia2V5XCI6IFwiT2ZmLXNpdGUgVmlld3NcIlxuICAgICAgICAgICwgXCJ2YWx1ZVwiOiBkYXRhLmZ1bGxfdXJscy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7cmV0dXJuIHAgKyBjLnVuaXF1ZXN9LDApXG4gICAgICAgIH1cbiAgICAgICwge1xuICAgICAgICAgICAgXCJrZXlcIjogXCJVbmlxdWUgcGFnZXNcIlxuICAgICAgICAgICwgXCJ2YWx1ZVwiOiBPYmplY3Qua2V5cyhkYXRhLmZ1bGxfdXJscy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7cFtjLnVybF0gPSAwOyByZXR1cm4gcCB9LHt9KSkubGVuZ3RoXG4gICAgICAgIH1cbiAgICBdXG4gIHJldHVybiB7XCJrZXlcIjpcIk9mZi1zaXRlIEFjdGl2aXR5XCIsXCJ2YWx1ZXNcIjp2YWx1ZXN9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFjdGlvbnMoZGF0YSkge1xuICBcbiAgcmV0dXJuIHtcImtleVwiOlwiU2VnbWVudHNcIixcInZhbHVlc1wiOiBkYXRhLmFjdGlvbnMubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4ge1wia2V5XCI6eC5hY3Rpb25fbmFtZSwgXCJ2YWx1ZVwiOjAsIFwic2VsZWN0ZWRcIjogZGF0YS5hY3Rpb25fbmFtZSA9PSB4LmFjdGlvbl9uYW1lIH0gfSl9XG59XG5cblxuLy8gZnJvbSBkYXRhLmpzXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhdGVnb3JpZXModmFsdWUpIHtcbiAgdmFyIGNhdGVnb3JpZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzIH0sMClcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlLmZ1bGxfdXJscylcblxuICB2YXIgdG90YWwgPSBjYXRlZ29yaWVzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnZhbHVlcyB9LDApXG5cbiAgY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudmFsdWUgPSB4LnZhbHVlc1xuICAgIHgucGVyY2VudCA9IHgudmFsdWUgLyB0b3RhbFxuICB9KVxuXG4gIHZhbHVlW1wiZGlzcGxheV9jYXRlZ29yaWVzXCJdID0ge1xuICAgICAgXCJrZXlcIjpcIkNhdGVnb3JpZXNcIlxuICAgICwgXCJ2YWx1ZXNcIjogY2F0ZWdvcmllcy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgIT0gXCJOQVwiIH0pXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2F0ZWdvcnlIb3VyKHZhbHVlKSB7XG4gIHZhciBjYXRlZ29yeV9ob3VyID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgKyB4LmhvdXIgKyB4Lm1pbnV0ZX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogdlswXS5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAsIFwiaG91clwiOiB2WzBdLmhvdXJcbiAgICAgICAgLCBcIm1pbnV0ZVwiOiB2WzBdLm1pbnV0ZSBcbiAgICAgICAgLCBcImNvdW50XCI6di5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy5jb3VudCB9LDApXG4gICAgICB9XG4gICAgfSlcbiAgICAuZW50cmllcyh2YWx1ZS5mdWxsX3VybHMpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlcyB9KVxuXG4gIHZhbHVlW1wiY2F0ZWdvcnlfaG91clwiXSA9IGNhdGVnb3J5X2hvdXJcbiBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRGF0YShkYXRhLGJ1Y2tldHMscG9wX2NhdGVnb3JpZXMpIHtcblxuICB2YXIgdGltZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgIC5tYXAoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuXG4gIHZhciBjYXRzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLm1hcChkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJcIiB9KSApXG5cblxuXG5cbiAgdmFyIHRpbWVfY2F0ZWdvcmllcyA9IGJ1Y2tldHMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2NdID0ge307IHJldHVybiBwIH0sIHt9KVxuICB2YXIgY2F0ZWdvcnlfdGltZXMgPSBPYmplY3Qua2V5cyhjYXRzKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbY10gPSB7fTsgcmV0dXJuIHAgfSwge30pXG5cblxuICB2YXIgY2F0ZWdvcmllcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgLmVudHJpZXMoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7XG4gICAgICByb3cudmFsdWVzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICAgIHQucGVyY2VudCA9IGQzLnN1bSh0LnZhbHVlcyxmdW5jdGlvbihkKXsgcmV0dXJuIGQudW5pcXVlc30pLyBkMy5zdW0odGltZXNbdC5rZXldLGZ1bmN0aW9uKGQpIHtyZXR1cm4gZC51bmlxdWVzfSkgXG4gICAgICAgIHRpbWVfY2F0ZWdvcmllc1t0LmtleV1bcm93LmtleV0gPSB0LnBlcmNlbnRcbiAgICAgICAgY2F0ZWdvcnlfdGltZXNbcm93LmtleV1bdC5rZXldID0gdC5wZXJjZW50XG5cbiAgICAgIH0pXG4gICAgICByZXR1cm4gcm93XG4gICAgfSlcbiAgICAuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuICgocG9wX2NhdGVnb3JpZXNbYi5rZXldIHx8IHt9KS5ub3JtYWxpemVkX3BvcCB8fCAwKS0gKChwb3BfY2F0ZWdvcmllc1thLmtleV0gfHwge30pLm5vcm1hbGl6ZWRfcG9wIHx8IDApIH0pXG5cblxuICB2YXIgdGltZV9ub3JtYWxpemVfc2NhbGVzID0ge31cblxuICBkMy5lbnRyaWVzKHRpbWVfY2F0ZWdvcmllcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIHRpbWVfbm9ybWFsaXplX3NjYWxlc1t0cm93LmtleV0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbZDMubWluKHZhbHVlcyksZDMubWF4KHZhbHVlcyldKVxuICAgICAgLnJhbmdlKFswLDFdKVxuICB9KVxuXG4gIHZhciBjYXRfbm9ybWFsaXplX3NjYWxlcyA9IHt9XG5cbiAgZDMuZW50cmllcyhjYXRlZ29yeV90aW1lcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIGNhdF9ub3JtYWxpemVfc2NhbGVzW3Ryb3cua2V5XSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFtkMy5taW4odmFsdWVzKSxkMy5tYXgodmFsdWVzKV0pXG4gICAgICAucmFuZ2UoWzAsMV0pXG4gIH0pXG5cbiAgY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24ocCkge1xuICAgIHZhciBjYXQgPSBwLmtleVxuICAgIHAudmFsdWVzLm1hcChmdW5jdGlvbihxKSB7XG4gICAgICBxLm5vcm1fY2F0ID0gY2F0X25vcm1hbGl6ZV9zY2FsZXNbY2F0XShxLnBlcmNlbnQpXG4gICAgICBxLm5vcm1fdGltZSA9IHRpbWVfbm9ybWFsaXplX3NjYWxlc1txLmtleV0ocS5wZXJjZW50KVxuXG4gICAgICBxLnNjb3JlID0gMipxLm5vcm1fY2F0LzMgKyBxLm5vcm1fdGltZS8zXG4gICAgICBxLnNjb3JlID0gcS5ub3JtX3RpbWVcblxuICAgICAgdmFyIHBlcmNlbnRfcG9wID0gcG9wX2NhdGVnb3JpZXNbY2F0XSA/IHBvcF9jYXRlZ29yaWVzW2NhdF0ucGVyY2VudF9wb3AgOiAwXG5cbiAgICAgIHEucGVyY2VudF9kaWZmID0gKHEucGVyY2VudCAtIHBlcmNlbnRfcG9wKS9wZXJjZW50X3BvcFxuXG4gICAgfSlcbiAgfSlcblxuICByZXR1cm4gY2F0ZWdvcmllc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJlcGFyZUZpbHRlcnMoZmlsdGVycykge1xuICB2YXIgbWFwcGluZyA9IHtcbiAgICAgIFwiQ2F0ZWdvcnlcIjogXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiXG4gICAgLCBcIlRpdGxlXCI6IFwidXJsXCJcbiAgICAsIFwiVGltZVwiOiBcImhvdXJcIlxuICB9XG5cbiAgdmFyIGZpbHRlcnMgPSBmaWx0ZXJzLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiBPYmplY3Qua2V5cyh4KS5sZW5ndGggJiYgeC52YWx1ZSB9KS5tYXAoZnVuY3Rpb24oeikge1xuICAgIHJldHVybiB7IFxuICAgICAgICBcImZpZWxkXCI6IG1hcHBpbmdbei5maWVsZF1cbiAgICAgICwgXCJvcFwiOiB6Lm9wXG4gICAgICAsIFwidmFsdWVcIjogei52YWx1ZVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gZmlsdGVyc1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGF1dG9TaXplKHdyYXAsYWRqdXN0V2lkdGgsYWRqdXN0SGVpZ2h0KSB7XG5cbiAgZnVuY3Rpb24gZWxlbWVudFRvV2lkdGgoZWxlbSkge1xuXG4gICAgdmFyIF93ID0gd3JhcC5ub2RlKCkub2Zmc2V0V2lkdGggfHwgd3JhcC5ub2RlKCkucGFyZW50Tm9kZS5vZmZzZXRXaWR0aCB8fCB3cmFwLm5vZGUoKS5wYXJlbnROb2RlLnBhcmVudE5vZGUub2Zmc2V0V2lkdGhcbiAgICB2YXIgbnVtID0gX3cgfHwgd3JhcC5zdHlsZShcIndpZHRoXCIpLnNwbGl0KFwiLlwiKVswXS5yZXBsYWNlKFwicHhcIixcIlwiKSBcbiAgICByZXR1cm4gcGFyc2VJbnQobnVtKVxuICB9XG5cbiAgZnVuY3Rpb24gZWxlbWVudFRvSGVpZ2h0KGVsZW0pIHtcbiAgICB2YXIgbnVtID0gd3JhcC5zdHlsZShcImhlaWdodFwiKS5zcGxpdChcIi5cIilbMF0ucmVwbGFjZShcInB4XCIsXCJcIilcbiAgICByZXR1cm4gcGFyc2VJbnQobnVtKVxuICB9XG5cbiAgdmFyIHcgPSBlbGVtZW50VG9XaWR0aCh3cmFwKSB8fCA3MDAsXG4gICAgaCA9IGVsZW1lbnRUb0hlaWdodCh3cmFwKSB8fCAzNDA7XG5cbiAgdyA9IGFkanVzdFdpZHRoKHcpXG4gIGggPSBhZGp1c3RIZWlnaHQoaClcblxuXG4gIHZhciBtYXJnaW4gPSB7dG9wOiAxMCwgcmlnaHQ6IDE1LCBib3R0b206IDEwLCBsZWZ0OiAxNX0sXG4gICAgICB3aWR0aCAgPSB3IC0gbWFyZ2luLmxlZnQgLSBtYXJnaW4ucmlnaHQsXG4gICAgICBoZWlnaHQgPSBoIC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b207XG5cbiAgcmV0dXJuIHtcbiAgICBtYXJnaW46IG1hcmdpbixcbiAgICB3aWR0aDogd2lkdGgsXG4gICAgaGVpZ2h0OiBoZWlnaHRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXV0b1NjYWxlcyhfc2l6ZXMsIGxlbikge1xuXG4gIHZhciBtYXJnaW4gPSBfc2l6ZXMubWFyZ2luLFxuICAgIHdpZHRoID0gX3NpemVzLndpZHRoLFxuICAgIGhlaWdodCA9IF9zaXplcy5oZWlnaHQ7XG5cbiAgaGVpZ2h0ID0gbGVuICogMjZcbiAgXG4gIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5yYW5nZShbd2lkdGgvMiwgd2lkdGgtMjBdKTtcbiAgXG4gIHZhciB5ID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAucmFuZ2VSb3VuZEJhbmRzKFswLCBoZWlnaHRdLCAuMik7XG5cbiAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHgpXG4gICAgICAub3JpZW50KFwidG9wXCIpO1xuXG5cbiAgcmV0dXJuIHtcbiAgICAgIHg6IHhcbiAgICAsIHk6IHlcbiAgICAsIHhBeGlzOiB4QXhpc1xuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBzdGF0ZSBmcm9tICdzdGF0ZSdcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmUocXNfc3RhdGUsX3N0YXRlKSB7XG5cbiAgdmFyIHVwZGF0ZXMgPSB7fVxuXG5cbiAgc3RhdGUuY29tcF9ldmFsKHFzX3N0YXRlLF9zdGF0ZSx1cGRhdGVzKVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzZWxlY3RlZF9hY3Rpb25cIlxuICAgICAgLCAoeCx5KSA9PiB5LmFjdGlvbnMuZmlsdGVyKHogPT4gei5hY3Rpb25faWQgPT0geC5zZWxlY3RlZF9hY3Rpb24pWzBdXG4gICAgICAsICh4LHkpID0+IHkuc2VsZWN0ZWRfYWN0aW9uXG4gICAgKVxuICAgIC5mYWlsdXJlKFwic2VsZWN0ZWRfYWN0aW9uXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmose1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJzZWxlY3RlZF9hY3Rpb25cIjogX25ld1xuICAgICAgfSlcbiAgICB9KVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzZWxlY3RlZF92aWV3XCJcbiAgICAgICwgKHgseSkgPT4geC5zZWxlY3RlZF92aWV3XG4gICAgICAsIChfLHkpID0+IHkuZGFzaGJvYXJkX29wdGlvbnMuZmlsdGVyKHggPT4geC5zZWxlY3RlZClbMF0udmFsdWUgXG4gICAgKVxuICAgIC5mYWlsdXJlKFwic2VsZWN0ZWRfdmlld1wiLCAoX25ldyxfb2xkLG9iaikgPT4ge1xuICAgICAgLy8gdGhpcyBzaG91bGQgYmUgcmVkb25lIHNvIGl0cyBub3QgZGlmZmVyZW50IGxpa2UgdGhpc1xuICAgICAgT2JqZWN0LmFzc2lnbihvYmosIHtcbiAgICAgICAgICBcImxvYWRpbmdcIjogdHJ1ZVxuICAgICAgICAsIFwiZGFzaGJvYXJkX29wdGlvbnNcIjogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMpKS5tYXAoeCA9PiB7IFxuICAgICAgICAgICAgeC5zZWxlY3RlZCA9ICh4LnZhbHVlID09IF9uZXcpOyBcbiAgICAgICAgICAgIHJldHVybiB4IFxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInNlbGVjdGVkX2NvbXBhcmlzb25cIlxuICAgICAgLCAoeCx5KSA9PiB5LmFjdGlvbnMuZmlsdGVyKHogPT4gei5hY3Rpb25faWQgPT0geC5zZWxlY3RlZF9jb21wYXJpc29uKVswXVxuICAgICAgLCAoeCx5KSA9PiB5LnNlbGVjdGVkX2NvbXBhcmlzb25cbiAgICApXG4gICAgLmZhaWx1cmUoXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmose1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJzZWxlY3RlZF9jb21wYXJpc29uXCI6IF9uZXdcbiAgICAgIH0pXG4gICAgfSlcbiAgICAuZXF1YWwoXCJmaWx0ZXJzXCIsICh4LHkpID0+IEpTT04uc3RyaW5naWZ5KHgpID09IEpTT04uc3RyaW5naWZ5KHkpIClcbiAgICAuZmFpbHVyZShcImZpbHRlcnNcIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcImZpbHRlcnNcIjogX25ldyB8fCBbe31dXG4gICAgICB9KVxuICAgIH0pXG4gICAgLmZhaWx1cmUoXCJhY3Rpb25fZGF0ZVwiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHsgbG9hZGluZzogdHJ1ZSwgXCJhY3Rpb25fZGF0ZVwiOiBfbmV3IH0pXG4gICAgfSlcbiAgICAuZmFpbHVyZShcImNvbXBhcmlzb25fZGF0ZVwiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHsgbG9hZGluZzogdHJ1ZSwgXCJjb21wYXJpc29uX2RhdGVcIjogX25ldyB9KVxuICAgIH0pXG5cbiAgICAuZXZhbHVhdGUoKVxuXG4gIHZhciBjdXJyZW50ID0gc3RhdGUucXMoe30pLnRvKF9zdGF0ZS5xc19zdGF0ZSB8fCB7fSlcbiAgICAsIHBvcCA9IHN0YXRlLnFzKHt9KS50byhxc19zdGF0ZSlcblxuICBpZiAoT2JqZWN0LmtleXModXBkYXRlcykubGVuZ3RoICYmIGN1cnJlbnQgIT0gcG9wKSB7XG4gICAgcmV0dXJuIHVwZGF0ZXNcbiAgfVxuXG4gIHJldHVybiB7fVxuICBcbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5leHBvcnQgKiBmcm9tICcuL2hlbHBlcnMvZGF0YV9oZWxwZXJzJ1xuZXhwb3J0ICogZnJvbSAnLi9oZWxwZXJzL2dyYXBoX2hlbHBlcnMnXG5leHBvcnQgKiBmcm9tICcuL2hlbHBlcnMvc3RhdGVfaGVscGVycydcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9wU2VjdGlvbihzZWN0aW9uKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHNlY3Rpb24sXCIudG9wLXNlY3Rpb25cIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwidG9wLXNlY3Rpb25cIix0cnVlKVxuICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjE2MHB4XCIpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1haW5pbmdTZWN0aW9uKHNlY3Rpb24pIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUoc2VjdGlvbixcIi5yZW1haW5pbmctc2VjdGlvblwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJyZW1haW5pbmctc2VjdGlvblwiLHRydWUpXG59XG5cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIFNlbGVjdCh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7fVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzZWxlY3QodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU2VsZWN0KHRhcmdldClcbn1cblxuU2VsZWN0LnByb3RvdHlwZSA9IHtcbiAgICBvcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwib3B0aW9uc1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB0aGlzLl9zZWxlY3QgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwic2VsZWN0XCIsXCJzZWxlY3RcIix0aGlzLl9vcHRpb25zKVxuXG4gICAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwic2VsZWN0XCIpLmJpbmQodGhpcylcblxuICAgICAgdGhpcy5fc2VsZWN0XG4gICAgICAgIC5vbihcImNoYW5nZVwiLGZ1bmN0aW9uKHgpIHsgYm91bmQodGhpcy5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18pIH0pXG5cbiAgICAgIHRoaXMuX29wdGlvbnMgPSBkM19zcGxhdCh0aGlzLl9zZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiLGlkZW50aXR5LGtleSlcbiAgICAgICAgLnRleHQoa2V5KVxuICAgICAgICAucHJvcGVydHkoXCJzZWxlY3RlZFwiLCAoeCkgPT4geC52YWx1ZSA9PSB0aGlzLl9zZWxlY3RlZCA/IFwic2VsZWN0ZWRcIiA6IG51bGwpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHNlbGVjdGVkOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2VsZWN0ZWRcIix2YWwpXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuL3NlbGVjdCdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmZ1bmN0aW9uIGluamVjdENzcyhjc3Nfc3RyaW5nKSB7XG4gIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI2hlYWRlci1jc3NcIixcInN0eWxlXCIpXG4gICAgLmF0dHIoXCJpZFwiLFwiaGVhZGVyLWNzc1wiKVxuICAgIC50ZXh0KENTU19TVFJJTkcucmVwbGFjZShcImZ1bmN0aW9uICgpIHsvKlwiLFwiXCIpLnJlcGxhY2UoXCIqL31cIixcIlwiKSlcbn1cblxuZnVuY3Rpb24gYnV0dG9uV3JhcCh3cmFwKSB7XG4gIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwLCBcImgzLmJ1dHRvbnNcIixcImgzXCIpXG4gICAgLmNsYXNzZWQoXCJidXR0b25zXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuXG4gIHZhciByaWdodF9wdWxsID0gZDNfdXBkYXRlYWJsZShoZWFkLFwiLnB1bGwtcmlnaHRcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcInB1bGwtcmlnaHQgaGVhZGVyLWJ1dHRvbnNcIiwgdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjE3cHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjJweFwiKVxuICAgIC5zdHlsZShcInRleHQtZGVjb3JhdGlvblwiLFwibm9uZSAhaW1wb3J0YW50XCIpXG5cbiAgcmV0dXJuIHJpZ2h0X3B1bGxcbn1cblxuZnVuY3Rpb24gZXhwYW5zaW9uV3JhcCh3cmFwKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHdyYXAsXCJkaXYuaGVhZGVyLWJvZHlcIixcImRpdlwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTNweFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJub25lXCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwibm9ybWFsXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjE3NXB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMjVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjI1cHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjE3NXB4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwid2hpdGVcIilcbiAgICAuY2xhc3NlZChcImhlYWRlci1ib2R5IGhpZGRlblwiLHRydWUpXG59XG5cbmZ1bmN0aW9uIGhlYWRXcmFwKHdyYXApIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUod3JhcCwgXCJoMy5kYXRhLWhlYWRlclwiLFwiaDNcIilcbiAgICAuY2xhc3NlZChcImRhdGEtaGVhZGVyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCIgYm9sZFwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiIDE0cHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiIDIycHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwiIHVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIgIzg4OFwiKVxuICAgIC5zdHlsZShcImxldHRlci1zcGFjaW5nXCIsXCIgLjA1ZW1cIilcblxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBIZWFkZXIodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcblxuICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuICAgIC5oZWFkZXItYnV0dG9ucyBhIHNwYW4uaG92ZXItc2hvdyB7IGRpc3BsYXk6bm9uZSB9XG4gICAgLmhlYWRlci1idXR0b25zIGE6aG92ZXIgc3Bhbi5ob3Zlci1zaG93IHsgZGlzcGxheTppbmxpbmU7IHBhZGRpbmctbGVmdDozcHggfVxuICAqL30pXG4gIFxufVxuXG5mdW5jdGlvbiBoZWFkZXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgSGVhZGVyKHRhcmdldClcbn1cblxuSGVhZGVyLnByb3RvdHlwZSA9IHtcbiAgICB0ZXh0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGV4dFwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgYnV0dG9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJ1dHRvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBleHBhbnNpb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJleHBhbnNpb25cIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCwgXCIuaGVhZGVyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImhlYWRlci13cmFwXCIsdHJ1ZSlcblxuICAgICAgdmFyIGV4cGFuZF93cmFwID0gZXhwYW5zaW9uV3JhcCh3cmFwKVxuICAgICAgICAsIGJ1dHRvbl93cmFwID0gYnV0dG9uV3JhcCh3cmFwKVxuICAgICAgICAsIGhlYWRfd3JhcCA9IGhlYWRXcmFwKHdyYXApXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaGVhZF93cmFwLFwic3Bhbi50aXRsZVwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAgICAgLnRleHQodGhpcy5fdGV4dClcblxuICAgICAgaWYgKHRoaXMuX29wdGlvbnMpIHtcblxuICAgICAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwic2VsZWN0XCIpLmJpbmQodGhpcylcblxuICAgICAgICB2YXIgc2VsZWN0Qm94ID0gc2VsZWN0KGhlYWRfd3JhcClcbiAgICAgICAgICAub3B0aW9ucyh0aGlzLl9vcHRpb25zKVxuICAgICAgICAgIC5vbihcInNlbGVjdFwiLGZ1bmN0aW9uKHgpIHsgYm91bmQoeCkgfSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgc2VsZWN0Qm94Ll9zZWxlY3RcbiAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTlweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMnB4XCIpXG4gICAgICAgICAgXG4gICAgICAgIHNlbGVjdEJveC5fb3B0aW9uc1xuICAgICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCIjODg4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxMDBweFwiKVxuICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjVweFwiKVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYnV0dG9ucykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgYSA9IGQzX3NwbGF0KGJ1dHRvbl93cmFwLFwiYVwiLFwiYVwiLHRoaXMuX2J1dHRvbnMsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGV4dCB9KVxuICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIycHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWRlY29yYXRpb25cIixcIm5vbmVcIilcbiAgICAgICAgICAuaHRtbCh4ID0+IFwiPHNwYW4gY2xhc3M9J1wiICsgeC5pY29uICsgXCInPjwvc3Bhbj48c3BhbiBzdHlsZT0ncGFkZGluZy1sZWZ0OjNweCc+XCIgKyB4LnRleHQgKyBcIjwvc3Bhbj5cIilcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIseCA9PiB4LmNsYXNzKVxuICAgICAgICAgIC5vbihcImNsaWNrXCIseCA9PiB0aGlzLm9uKHguY2xhc3MgKyBcIi5jbGlja1wiKSh4KSlcblxuXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuZXhwb3J0IGRlZmF1bHQgaGVhZGVyO1xuIiwiaW1wb3J0IHthY2Nlc3NvciwgZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIG5vb3B9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgZDMgZnJvbSAnZDMnO1xuaW1wb3J0ICcuL3RhYmxlLmNzcydcblxuXG52YXIgRVhBTVBMRV9EQVRBID0ge1xuICAgIFwia2V5XCI6IFwiVG9wIFNpdGVzXCJcbiAgLCBcInZhbHVlc1wiOiBbXG4gICAgICB7ICBcbiAgICAgICAgICBcImtleVwiOlwiVVJMLmNvbVwiXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6XCJhb2wuY29tXCJcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gIF0gXG59XG5cbmZ1bmN0aW9uIFRhYmxlKHRhcmdldCkge1xuICB0aGlzLl93cmFwcGVyX2NsYXNzID0gXCJ0YWJsZS13cmFwcGVyXCJcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLl9kYXRhID0ge30vL0VYQU1QTEVfREFUQVxuICB0aGlzLl9zb3J0ID0ge31cbiAgdGhpcy5fcmVuZGVyZXJzID0ge31cbiAgdGhpcy5fdG9wID0gMFxuXG4gIHRoaXMuX2RlZmF1bHRfcmVuZGVyZXIgPSBmdW5jdGlvbiAoeCkge1xuICAgIGlmICh4LmtleS5pbmRleE9mKFwicGVyY2VudFwiKSA+IC0xKSByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLnRleHQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgdmFyIHBkID0gdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fXG4gICAgICAgIHJldHVybiBkMy5mb3JtYXQoXCIuMiVcIikocGRbeC5rZXldLzEwMClcbiAgICAgIH0pXG4gICBcbiAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLnRleHQoZnVuY3Rpb24oeCkgeyBcbiAgICAgIHZhciBwZCA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfX1xuICAgICAgcmV0dXJuIHBkW3gua2V5XSA+IDAgPyBkMy5mb3JtYXQoXCIsLjJmXCIpKHBkW3gua2V5XSkucmVwbGFjZShcIi4wMFwiLFwiXCIpIDogcGRbeC5rZXldXG4gICAgfSlcbiAgfVxuXG4gIHRoaXMuX2hpZGRlbl9maWVsZHMgPSBbXVxuICB0aGlzLl9vbiA9IHt9XG5cbiAgdGhpcy5fcmVuZGVyX2V4cGFuZCA9IGZ1bmN0aW9uKGQpIHtcbiAgICBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKFwidGQub3B0aW9uLWhlYWRlclwiKS5odG1sKFwiJm5kYXNoO1wiKVxuICAgIGlmICh0aGlzLm5leHRTaWJsaW5nICYmIGQzLnNlbGVjdCh0aGlzLm5leHRTaWJsaW5nKS5jbGFzc2VkKFwiZXhwYW5kZWRcIikgPT0gdHJ1ZSkge1xuICAgICAgZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInRkLm9wdGlvbi1oZWFkZXJcIikuaHRtbChcIiYjNjUyOTE7XCIpXG4gICAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc2VsZWN0QWxsKFwiLmV4cGFuZGVkXCIpLnJlbW92ZSgpXG4gICAgfVxuXG4gICAgZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc2VsZWN0QWxsKFwiLmV4cGFuZGVkXCIpLnJlbW92ZSgpXG4gICAgdmFyIHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICAgIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodCwgdGhpcy5uZXh0U2libGluZyk7ICBcblxuXG4gICAgdmFyIHRyID0gZDMuc2VsZWN0KHQpLmNsYXNzZWQoXCJleHBhbmRlZFwiLHRydWUpLmRhdHVtKHt9KVxuICAgIHZhciB0ZCA9IGQzX3VwZGF0ZWFibGUodHIsXCJ0ZFwiLFwidGRcIilcbiAgICAgIC5hdHRyKFwiY29sc3BhblwiLHRoaXMuY2hpbGRyZW4ubGVuZ3RoKVxuXG4gICAgcmV0dXJuIHRkXG4gIH1cbiAgdGhpcy5fcmVuZGVyX2hlYWRlciA9IGZ1bmN0aW9uKHdyYXApIHtcblxuXG4gICAgd3JhcC5lYWNoKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHZhciBoZWFkZXJzID0gZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QodGhpcyksXCIuaGVhZGVyc1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGVhZGVyc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLWJvdHRvbVwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgICBoZWFkZXJzLmh0bWwoXCJcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGhlYWRlcnMsXCIudXJsXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ1cmxcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNzUlXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChcIkFydGljbGVcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZShoZWFkZXJzLFwiLmNvdW50XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb3VudFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KFwiQ291bnRcIilcblxuXG4gICAgfSlcblxuICB9XG4gIHRoaXMuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihyb3cpIHtcblxuICAgICAgZDNfdXBkYXRlYWJsZShyb3csXCIudXJsXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ1cmxcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNzUlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwiaGlkZGVuXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7cmV0dXJuIHgua2V5fSlcblxuICAgICAgZDNfdXBkYXRlYWJsZShyb3csXCIuY291bnRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImNvdW50XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI1JVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KXtyZXR1cm4geC52YWx1ZX0pXG5cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdGFibGUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGFibGUodGFyZ2V0KVxufVxuXG5UYWJsZS5wcm90b3R5cGUgPSB7XG5cbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHsgXG4gICAgICB2YXIgdmFsdWUgPSBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgICBpZiAodmFsICYmIHZhbC52YWx1ZXMubGVuZ3RoICYmIHRoaXMuX2hlYWRlcnMgPT0gdW5kZWZpbmVkKSB7IFxuICAgICAgICB2YXIgaGVhZGVycyA9IE9iamVjdC5rZXlzKHZhbC52YWx1ZXNbMF0pLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB7a2V5OngsdmFsdWU6eH0gfSlcbiAgICAgICAgdGhpcy5oZWFkZXJzKGhlYWRlcnMpXG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9XG4gICwgc2tpcF9vcHRpb246IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNraXBfb3B0aW9uXCIsdmFsKSB9XG4gICwgd3JhcHBlcl9jbGFzczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwid3JhcHBlcl9jbGFzc1wiLHZhbCkgfVxuXG5cbiAgLCB0aXRsZTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH1cbiAgLCByb3c6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInJlbmRlcl9yb3dcIix2YWwpIH1cbiAgLCBkZWZhdWx0X3JlbmRlcmVyOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkZWZhdWx0X3JlbmRlcmVyXCIsdmFsKSB9XG4gICwgdG9wOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0b3BcIix2YWwpIH1cblxuICAsIGhlYWRlcjogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmVuZGVyX2hlYWRlclwiLHZhbCkgfVxuICAsIGhlYWRlcnM6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhlYWRlcnNcIix2YWwpIH1cbiAgLCBoaWRkZW5fZmllbGRzOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoaWRkZW5fZmllbGRzXCIsdmFsKSB9XG4gICwgYWxsX2hlYWRlcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhlYWRlcnMgPSB0aGlzLmhlYWRlcnMoKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYy52YWx1ZTsgcmV0dXJuIHB9LHt9KVxuICAgICAgICAsIGlzX2xvY2tlZCA9IHRoaXMuaGVhZGVycygpLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiAhIXgubG9ja2VkIH0pLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICBpZiAodGhpcy5fZGF0YS52YWx1ZXMgJiYgdGhpcy5fZGF0YS52YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgIFxuICAgICAgICB2YXIgYWxsX2hlYWRzID0gT2JqZWN0LmtleXModGhpcy5fZGF0YS52YWx1ZXNbMF0pLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgICAgIGlmICh0aGlzLl9oaWRkZW5fZmllbGRzICYmIHRoaXMuX2hpZGRlbl9maWVsZHMuaW5kZXhPZih4KSA+IC0xKSByZXR1cm4gZmFsc2VcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBrZXk6eFxuICAgICAgICAgICAgLCB2YWx1ZTpoZWFkZXJzW3hdIHx8IHhcbiAgICAgICAgICAgICwgc2VsZWN0ZWQ6ICEhaGVhZGVyc1t4XVxuICAgICAgICAgICAgLCBsb2NrZWQ6IChpc19sb2NrZWQuaW5kZXhPZih4KSA+IC0xID8gdHJ1ZSA6IHVuZGVmaW5lZCkgXG4gICAgICAgICAgfSBcbiAgICAgICAgfS5iaW5kKHRoaXMpKS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9KVxuICAgICAgICB2YXIgZ2V0SW5kZXggPSBmdW5jdGlvbihrKSB7XG4gICAgICAgICAgcmV0dXJuIGlzX2xvY2tlZC5pbmRleE9mKGspID4gLTEgPyBpc19sb2NrZWQuaW5kZXhPZihrKSArIDEwIDogMFxuICAgICAgICB9XG5cbiAgICAgICAgYWxsX2hlYWRzID0gYWxsX2hlYWRzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBnZXRJbmRleChjLmtleSB8fCAtSW5maW5pdHkpIC0gZ2V0SW5kZXgocC5rZXkgfHwgLUluZmluaXR5KSB9KVxuICAgICAgICByZXR1cm4gYWxsX2hlYWRzXG4gICAgICB9XG4gICAgICBlbHNlIHJldHVybiB0aGlzLmhlYWRlcnMoKVxuICAgIH1cbiAgLCBzb3J0OiBmdW5jdGlvbihrZXksYXNjZW5kaW5nKSB7XG4gICAgICBpZiAoIWtleSkgcmV0dXJuIHRoaXMuX3NvcnRcbiAgICAgIHRoaXMuX3NvcnQgPSB7XG4gICAgICAgICAga2V5OiBrZXlcbiAgICAgICAgLCB2YWx1ZTogISFhc2NlbmRpbmdcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICwgcmVuZGVyX3dyYXBwZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHdyYXAgPSB0aGlzLl90YXJnZXRcblxuICAgICAgdmFyIHdyYXBwZXIgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuXCIrdGhpcy5fd3JhcHBlcl9jbGFzcyxcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZCh0aGlzLl93cmFwcGVyX2NsYXNzLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJyZWxhdGl2ZVwiKVxuXG5cbiAgICAgIHZhciB0YWJsZSA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcInRhYmxlLm1haW5cIixcInRhYmxlXCIpXG4gICAgICAgIC5jbGFzc2VkKFwibWFpblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG5cbiAgICAgIHRoaXMuX3RhYmxlX21haW4gPSB0YWJsZVxuXG4gICAgICB2YXIgdGhlYWQgPSBkM191cGRhdGVhYmxlKHRhYmxlLFwidGhlYWRcIixcInRoZWFkXCIpXG4gICAgICBkM191cGRhdGVhYmxlKHRhYmxlLFwidGJvZHlcIixcInRib2R5XCIpXG5cblxuXG4gICAgICBpZiAoIXRoaXMuX3NraXBfb3B0aW9uKSB7XG4gICAgICB2YXIgdGFibGVfZml4ZWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCJ0YWJsZS5maXhlZFwiLFwidGFibGVcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwgdHJ1ZSkgLy8gVE9ETzogbWFrZSB0aGlzIHZpc2libGUgd2hlbiBtYWluIGlzIG5vdCBpbiB2aWV3XG4gICAgICAgIC5jbGFzc2VkKFwiZml4ZWRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLHdyYXBwZXIuc3R5bGUoXCJ3aWR0aFwiKSlcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsdGhpcy5fdG9wICsgXCJweFwiKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICB0cnkge1xuICAgICAgZDMuc2VsZWN0KHdpbmRvdykub24oJ3Njcm9sbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyh0YWJsZS5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wLCBzZWxmLl90b3ApXG4gICAgICAgIGlmICh0YWJsZS5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wIDwgc2VsZi5fdG9wKSB0YWJsZV9maXhlZC5jbGFzc2VkKFwiaGlkZGVuXCIsZmFsc2UpXG4gICAgICAgIGVsc2UgdGFibGVfZml4ZWQuY2xhc3NlZChcImhpZGRlblwiLHRydWUpXG5cbiAgICAgICAgdmFyIHdpZHRocyA9IFtdXG5cbiAgICAgICAgd3JhcC5zZWxlY3RBbGwoXCIubWFpblwiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCIudGFibGUtaGVhZGVyc1wiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCJ0aFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgICAgd2lkdGhzLnB1c2godGhpcy5vZmZzZXRXaWR0aClcbiAgICAgICAgICB9KVxuXG4gICAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLmZpeGVkXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcIi50YWJsZS1oZWFkZXJzXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcInRoXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoXCJ3aWR0aFwiLHdpZHRoc1tpXSArIFwicHhcIilcbiAgICAgICAgICB9KVxuICAgICAgICBcbiAgICAgIH0pXG4gICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgXG5cbiAgICAgIHRoaXMuX3RhYmxlX2ZpeGVkID0gdGFibGVfZml4ZWRcblxuXG4gICAgICB2YXIgdGhlYWQgPSBkM191cGRhdGVhYmxlKHRhYmxlX2ZpeGVkLFwidGhlYWRcIixcInRoZWFkXCIpXG5cbiAgICAgIHZhciB0YWJsZV9idXR0b24gPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIudGFibGUtb3B0aW9uXCIsXCJhXCIpXG4gICAgICAgIC5jbGFzc2VkKFwidGFibGUtb3B0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImFic29sdXRlXCIpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLFwiLTFweFwiKVxuICAgICAgICAuc3R5bGUoXCJyaWdodFwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImN1cnNvclwiLFwicG9pbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCI4cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCI4cHhcIilcbiAgICAgICAgLnRleHQoXCJPUFRJT05TXCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNlM2ViZjBcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdGhpcy5fb3B0aW9uc19oZWFkZXIuY2xhc3NlZChcImhpZGRlblwiLCF0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIpKVxuICAgICAgICAgIHRoaXMuX3Nob3dfb3B0aW9ucyA9ICF0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHdyYXBwZXJcbiAgICB9ICBcbiAgLCByZW5kZXJfaGVhZGVyOiBmdW5jdGlvbih0YWJsZSkge1xuXG4gICAgICB2YXIgdGhlYWQgPSB0YWJsZS5zZWxlY3RBbGwoXCJ0aGVhZFwiKVxuICAgICAgICAsIHRib2R5ID0gdGFibGUuc2VsZWN0QWxsKFwidGJvZHlcIilcblxuICAgICAgaWYgKHRoaXMuaGVhZGVycygpID09IHVuZGVmaW5lZCkgcmV0dXJuXG5cbiAgICAgIHZhciBvcHRpb25zX3RoZWFkID0gZDNfdXBkYXRlYWJsZSh0aGVhZCxcInRyLnRhYmxlLW9wdGlvbnNcIixcInRyXCIsdGhpcy5hbGxfaGVhZGVycygpLGZ1bmN0aW9uKHgpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsICF0aGlzLl9zaG93X29wdGlvbnMpXG4gICAgICAgIC5jbGFzc2VkKFwidGFibGUtb3B0aW9uc1wiLHRydWUpXG5cbiAgICAgIHZhciBoID0gdGhpcy5fc2tpcF9vcHRpb24gPyB0aGlzLmhlYWRlcnMoKSA6IHRoaXMuaGVhZGVycygpLmNvbmNhdChbe2tleTpcInNwYWNlclwiLCB3aWR0aDpcIjcwcHhcIn1dKVxuICAgICAgdmFyIGhlYWRlcnNfdGhlYWQgPSBkM191cGRhdGVhYmxlKHRoZWFkLFwidHIudGFibGUtaGVhZGVyc1wiLFwidHJcIixoLGZ1bmN0aW9uKHgpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwidGFibGUtaGVhZGVyc1wiLHRydWUpXG5cblxuICAgICAgdmFyIHRoID0gZDNfc3BsYXQoaGVhZGVyc190aGVhZCxcInRoXCIsXCJ0aFwiLGZhbHNlLGZ1bmN0aW9uKHgsaSkge3JldHVybiB4LmtleSArIGkgfSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LndpZHRoIH0pXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJyZWxhdGl2ZVwiKVxuICAgICAgICAub3JkZXIoKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodGgsXCJzcGFuXCIsXCJzcGFuXCIpXG4gICAgICAgIC5jbGFzc2VkKFwidGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIixcInBvaW50ZXJcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBpZiAoeC5zb3J0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgZGVsZXRlIHhbJ3NvcnQnXVxuICAgICAgICAgICAgdGhpcy5fc29ydCA9IHt9XG4gICAgICAgICAgICB0aGlzLmRyYXcoKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4LnNvcnQgPSAhIXguc29ydFxuXG4gICAgICAgICAgICB0aGlzLnNvcnQoeC5rZXkseC5zb3J0KVxuICAgICAgICAgICAgdGhpcy5kcmF3KClcbiAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKSlcblxuICAgICAgZDNfdXBkYXRlYWJsZSh0aCxcImlcIixcImlcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCI1cHhcIilcbiAgICAgICAgLmNsYXNzZWQoXCJmYVwiLHRydWUpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEtc29ydC1hc2NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4gKHgua2V5ID09IHRoaXMuX3NvcnQua2V5KSA/IHRoaXMuX3NvcnQudmFsdWUgPT09IHRydWUgOiB1bmRlZmluZWQgfS5iaW5kKHRoaXMpKVxuICAgICAgICAuY2xhc3NlZChcImZhLXNvcnQtZGVzY1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiAoeC5rZXkgPT0gdGhpcy5fc29ydC5rZXkpID8gdGhpcy5fc29ydC52YWx1ZSA9PT0gZmFsc2UgOiB1bmRlZmluZWQgfS5iaW5kKHRoaXMpKVxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2FuX3JlZHJhdyA9IHRydWVcblxuICAgICAgdmFyIGRyYWcgPSBkMy5iZWhhdmlvci5kcmFnKClcbiAgICAgICAgLm9uKFwiZHJhZ1wiLCBmdW5jdGlvbihkLGkpIHtcbiAgICAgICAgICAgIHZhciB4ID0gZDMuZXZlbnQuZHhcbiAgICAgICAgICAgIHZhciB3ID0gcGFyc2VJbnQoZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc3R5bGUoXCJ3aWR0aFwiKS5yZXBsYWNlKFwicHhcIikpXG4gICAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuX19kYXRhX18ud2lkdGggPSAodyt4KStcInB4XCJcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnN0eWxlKFwid2lkdGhcIiwgKHcreCkrXCJweFwiKVxuXG4gICAgICAgICAgICB2YXIgaW5kZXggPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbiwwKS5pbmRleE9mKHRoaXMucGFyZW50Tm9kZSkgKyAxXG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW5baW5kZXhdKS5zdHlsZShcIndpZHRoXCIsdW5kZWZpbmVkKVxuXG4gICAgICAgICAgICBpZiAoY2FuX3JlZHJhdykge1xuICAgICAgICAgICAgICBjYW5fcmVkcmF3ID0gZmFsc2VcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjYW5fcmVkcmF3ID0gdHJ1ZVxuICAgICAgICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgICB2YXIgcmVuZGVyID0gc2VsZi5fcmVuZGVyZXJzW3gua2V5XVxuICAgICAgICAgICAgICAgICAgaWYgKHJlbmRlcikgcmVuZGVyLmJpbmQodGhpcykoeClcbiAgICBcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgIH0sMSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcblxuICAgICAgdmFyIGRyYWdnYWJsZSA9IGQzX3VwZGF0ZWFibGUodGgsXCJiXCIsXCJiXCIpXG4gICAgICAgIC5zdHlsZShcImN1cnNvclwiLCBcImV3LXJlc2l6ZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIiwgXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLCBcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIiwgXCJhYnNvbHV0ZVwiKVxuICAgICAgICAuc3R5bGUoXCJyaWdodFwiLCBcIi04cHhcIilcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsIFwiMFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLCBcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiei1pbmRleFwiLCAxKVxuICAgICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbigpe1xuICAgICAgICAgICB2YXIgaW5kZXggPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbiwwKS5pbmRleE9mKHRoaXMucGFyZW50Tm9kZSkgKyAxXG4gICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuc3R5bGUoXCJib3JkZXItcmlnaHRcIixcIjFweCBkb3R0ZWQgI2NjY1wiKVxuICAgICAgICB9KVxuICAgICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLDApLmluZGV4T2YodGhpcy5wYXJlbnROb2RlKSArIDFcbiAgICAgICAgICAgdGJvZHkuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bnRoLW9mLXR5cGUoXCIgKyBpbmRleCArIFwiKVwiKS5zdHlsZShcImJvcmRlci1yaWdodFwiLHVuZGVmaW5lZClcbiAgICAgICAgfSlcbiAgICAgICAgLmNhbGwoZHJhZylcblxuICAgICAgdGguZXhpdCgpLnJlbW92ZSgpXG5cbiAgICAgIGlmICghdGhpcy5fc2tpcF9vcHRpb24pIHtcbiAgICAgIHZhciBvcHRpb25zID0gZDNfdXBkYXRlYWJsZShvcHRpb25zX3RoZWFkLFwidGhcIixcInRoXCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsdGhpcy5oZWFkZXJzKCkubGVuZ3RoKzEpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAgICAgXG4gICAgICB2YXIgb3B0aW9uID0gZDNfc3BsYXQob3B0aW9ucyxcIi5vcHRpb25cIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgIC5jbGFzc2VkKFwib3B0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG5cbiAgICAgIG9wdGlvbi5leGl0KCkucmVtb3ZlKClcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUob3B0aW9uLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgICAgLnByb3BlcnR5KFwiY2hlY2tlZFwiLGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgdGhpcy5jaGVja2VkID0geC5zZWxlY3RlZFxuICAgICAgICAgIHJldHVybiB4LnNlbGVjdGVkID8gXCJjaGVja2VkXCIgOiB1bmRlZmluZWQgXG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKFwiZGlzYWJsZWRcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LmxvY2tlZCB9KVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgeC5zZWxlY3RlZCA9IHRoaXMuY2hlY2tlZFxuICAgICAgICAgIGlmICh4LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICBzZWxmLmhlYWRlcnMoKS5wdXNoKHgpXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5kcmF3KClcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGluZGljZXMgPSBzZWxmLmhlYWRlcnMoKS5tYXAoZnVuY3Rpb24oeixpKSB7IHJldHVybiB6LmtleSA9PSB4LmtleSA/IGkgOiB1bmRlZmluZWQgIH0pIFxuICAgICAgICAgICAgLCBpbmRleCA9IGluZGljZXMuZmlsdGVyKGZ1bmN0aW9uKHopIHsgcmV0dXJuIHogfSkgfHwgMDtcblxuICAgICAgICAgIHNlbGYuaGVhZGVycygpLnNwbGljZShpbmRleCwxKVxuICAgICAgICAgIHNlbGYuZHJhdygpXG5cbiAgICAgICAgfSlcblxuICAgICAgZDNfdXBkYXRlYWJsZShvcHRpb24sXCJzcGFuXCIsXCJzcGFuXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFwiIFwiICsgeC52YWx1ZSB9KVxuXG4gICAgIH1cblxuXG4gICAgIHRoaXMuX29wdGlvbnNfaGVhZGVyID0gdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcIi50YWJsZS1vcHRpb25zXCIpXG4gICAgfVxuICBcbiAgLCByZW5kZXJfcm93czogZnVuY3Rpb24odGFibGUpIHtcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHRib2R5ID0gdGFibGUuc2VsZWN0QWxsKFwidGJvZHlcIilcblxuICAgICAgaWYgKHRoaXMuaGVhZGVycygpID09IHVuZGVmaW5lZCkgcmV0dXJuXG4gICAgICBpZiAoISh0aGlzLl9kYXRhICYmIHRoaXMuX2RhdGEudmFsdWVzICYmIHRoaXMuX2RhdGEudmFsdWVzLmxlbmd0aCkpIHJldHVyblxuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGEudmFsdWVzXG4gICAgICAgICwgc29ydGJ5ID0gdGhpcy5fc29ydCB8fCB7fTtcblxuICAgICAgZGF0YSA9IGRhdGEuc29ydChmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgdmFyIGEgPSBwW3NvcnRieS5rZXldIHx8IC1JbmZpbml0eVxuICAgICAgICAgICwgYiA9IGNbc29ydGJ5LmtleV0gfHwgLUluZmluaXR5XG5cbiAgICAgICAgcmV0dXJuIHNvcnRieS52YWx1ZSA/IGQzLmFzY2VuZGluZyhhLGIpIDogZDMuZGVzY2VuZGluZyhhLGIpXG4gICAgICB9KVxuXG4gICAgICB2YXIgcm93cyA9IGQzX3NwbGF0KHRib2R5LFwidHJcIixcInRyXCIsZGF0YSxmdW5jdGlvbih4LGkpeyByZXR1cm4gU3RyaW5nKHNvcnRieS5rZXkgKyB4W3NvcnRieS5rZXldKSArIGkgfSlcbiAgICAgICAgLm9yZGVyKClcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKHNlbGYub24oXCJleHBhbmRcIikgIT0gbm9vcCkge1xuICAgICAgICAgICAgdmFyIHRkID0gc2VsZi5fcmVuZGVyX2V4cGFuZC5iaW5kKHRoaXMpKHgpXG4gICAgICAgICAgICBzZWxmLm9uKFwiZXhwYW5kXCIpLmJpbmQodGhpcykoeCx0ZClcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICAgIHZhciB0ZCA9IGQzX3NwbGF0KHJvd3MsXCJ0ZFwiLFwidGRcIix0aGlzLmhlYWRlcnMoKSxmdW5jdGlvbih4LGkpIHtyZXR1cm4geC5rZXkgKyBpIH0pXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcblxuICAgICAgICAgIHZhciByZW5kZXJlciA9IHNlbGYuX3JlbmRlcmVyc1t4LmtleV1cblxuICAgICAgICAgIGlmICghcmVuZGVyZXIpIHsgXG4gICAgICAgICAgICByZW5kZXJlciA9IHNlbGYuX2RlZmF1bHRfcmVuZGVyZXIuYmluZCh0aGlzKSh4KSBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHJlbmRlcmVyLmJpbmQodGhpcykoeClcbiAgICAgICAgICB9XG5cblxuICAgICAgICB9KVxuXG4gICAgICAgIFxuXG4gICAgICB0ZC5leGl0KCkucmVtb3ZlKClcblxuICAgICAgdmFyIG8gPSBkM191cGRhdGVhYmxlKHJvd3MsXCJ0ZC5vcHRpb24taGVhZGVyXCIsXCJ0ZFwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwib3B0aW9uLWhlYWRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuIFxuICAgICAgaWYgKHRoaXMuX3NraXBfb3B0aW9uKSBvLmNsYXNzZWQoXCJoaWRkZW5cIix0cnVlKSBcblxuXG4gICAgICBkM191cGRhdGVhYmxlKG8sXCJhXCIsXCJhXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5odG1sKHNlbGYub3B0aW9uX3RleHQoKSlcbiAgICAgICAgXG5cblxuXG4gICAgfVxuICAsIG9wdGlvbl90ZXh0OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25fdGV4dFwiLHZhbCkgfVxuICAsIHJlbmRlcjogZnVuY3Rpb24oayxmbikge1xuICAgICAgaWYgKGZuID09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX3JlbmRlcmVyc1trXSB8fCBmYWxzZVxuICAgICAgdGhpcy5fcmVuZGVyZXJzW2tdID0gZm5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICB2YXIgd3JhcHBlciA9IHRoaXMucmVuZGVyX3dyYXBwZXIoKVxuXG4gICAgICB3cmFwcGVyLnNlbGVjdEFsbChcInRhYmxlXCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgc2VsZi5yZW5kZXJfaGVhZGVyKGQzLnNlbGVjdCh0aGlzKSkgXG4gICAgICAgIH0pXG5cbiAgICAgIHRoaXMucmVuZGVyX3Jvd3ModGhpcy5fdGFibGVfbWFpbilcblxuICAgICAgdGhpcy5vbihcImRyYXdcIikuYmluZCh0aGlzKSgpXG5cbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZDM6IGQzXG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgJy4vc3VtbWFyeV90YWJsZS5jc3MnXG5pbXBvcnQge3RhYmxlfSBmcm9tICcuL3RhYmxlJ1xuXG5leHBvcnQgZnVuY3Rpb24gc3VtbWFyeV90YWJsZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTdW1tYXJ5VGFibGUodGFyZ2V0KVxufVxuXG5jbGFzcyBTdW1tYXJ5VGFibGUgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gICAgdGhpcy5fd3JhcHBlcl9jbGFzcyA9IFwidGFibGUtc3VtbWFyeS13cmFwcGVyXCJcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1widGl0bGVcIiwgXCJoZWFkZXJzXCIsIFwiZGF0YVwiLCBcIndyYXBwZXJfY2xhc3NcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgdmFyIHVybHNfc3VtbWFyeSA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcInN1bW1hcnktdGFibGVcIilcbiAgICAgIFxuICAgIGQzX2NsYXNzKHVybHNfc3VtbWFyeSxcInRpdGxlXCIpXG4gICAgICAudGV4dCh0aGlzLnRpdGxlKCkpXG5cbiAgICB2YXIgdXdyYXAgPSBkM19jbGFzcyh1cmxzX3N1bW1hcnksXCJ3cmFwXCIpXG5cblxuICAgIHRhYmxlKHV3cmFwKVxuICAgICAgLndyYXBwZXJfY2xhc3ModGhpcy53cmFwcGVyX2NsYXNzKCksdHJ1ZSlcbiAgICAgIC5kYXRhKHtcInZhbHVlc1wiOnRoaXMuZGF0YSgpfSlcbiAgICAgIC5za2lwX29wdGlvbih0cnVlKVxuICAgICAgLmhlYWRlcnModGhpcy5oZWFkZXJzKCkpXG4gICAgICAuZHJhdygpXG5cbiAgfVxufVxuIiwiLy9pbXBvcnQgZDMgZnJvbSAnZDMnXG5cbmZ1bmN0aW9uIGQzX3VwZGF0ZWFibGUodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCI7XG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gICk7XG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKTtcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5mdW5jdGlvbiBkM19zcGxhdCh0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIjtcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKTtcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpO1xuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cblxudmFyIHR5cGV3YXRjaCA9IChmdW5jdGlvbigpe1xuICB2YXIgdGltZXIgPSAwO1xuICByZXR1cm4gZnVuY3Rpb24oY2FsbGJhY2ssIG1zKXtcbiAgICBjbGVhclRpbWVvdXQgKHRpbWVyKTtcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoY2FsbGJhY2ssIG1zKTtcbiAgfTtcbn0pKCk7XG5cblxuXG5mdW5jdGlvbiBGaWx0ZXIodGFyZ2V0KSB7XG4gIHRoaXMuX3RhcmdldCA9IHRhcmdldDtcbiAgdGhpcy5fZGF0YSA9IGZhbHNlO1xuICB0aGlzLl9vbiA9IHt9O1xuICB0aGlzLl9yZW5kZXJfb3AgPSB7fTtcbn1cblxuZnVuY3Rpb24gZmlsdGVyJDIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRmlsdGVyKHRhcmdldClcbn1cblxuRmlsdGVyLnByb3RvdHlwZSA9IHtcbiAgICBkcmF3OiBmdW5jdGlvbigpIHtcblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5maWx0ZXJzLXdyYXBwZXJcIixcImRpdlwiLHRoaXMuZGF0YSgpLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiZmlsdGVycy13cmFwcGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsIFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsIFwiMjBweFwiKTtcblxuICAgICAgdmFyIGZpbHRlcnMgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuZmlsdGVyc1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiZmlsdGVyc1wiLHRydWUpO1xuICAgICAgXG4gICAgICB2YXIgZmlsdGVyID0gZDNfc3BsYXQoZmlsdGVycyxcIi5maWx0ZXJcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSxmdW5jdGlvbih4LGkpIHsgcmV0dXJuIGkgKyB4LmZpZWxkIH0pXG4gICAgICAgIC5jbGFzc2VkKFwiZmlsdGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIik7XG5cbiAgICAgIGZpbHRlci5leGl0KCkucmVtb3ZlKCk7XG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIGZpbHRlci5lYWNoKGZ1bmN0aW9uKHYscG9zKSB7XG4gICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAgICAgc2VsZi5maWx0ZXJSb3coZHRoaXMsIHNlbGYuX2ZpZWxkcywgc2VsZi5fb3BzLCB2KTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICB0aGlzLmZpbHRlckZvb3Rlcih3cmFwKTtcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICAgIFxuICAgIH1cbiAgLCBvcHM6IGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vcHNcbiAgICAgIHRoaXMuX29wcyA9IGQ7XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBmaWVsZHM6IGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9maWVsZHNcbiAgICAgIHRoaXMuX2ZpZWxkcyA9IGQ7XG4gICAgICByZXR1cm4gdGhpc1xuICBcdH1cbiAgLCBkYXRhOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZGF0YVxuICAgICAgdGhpcy5fZGF0YSA9IGQ7XG4gICAgICByZXR1cm4gdGhpc1xuICBcdH1cbiAgLCB0ZXh0OiBmdW5jdGlvbihmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9mbiB8fCBmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5IH1cbiAgICAgIHRoaXMuX2ZuID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCByZW5kZXJfb3A6IGZ1bmN0aW9uKG9wLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX3JlbmRlcl9vcFtvcF0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX3JlbmRlcl9vcFtvcF0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbixmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBidWlsZE9wOiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHZhciBvcCA9IG9iai5vcFxuICAgICAgICAsIGZpZWxkID0gb2JqLmZpZWxkXG4gICAgICAgICwgdmFsdWUgPSBvYmoudmFsdWU7XG4gICAgXG4gICAgICBpZiAoIFtvcCxmaWVsZCx2YWx1ZV0uaW5kZXhPZih1bmRlZmluZWQpID4gLTEpIHJldHVybiBmdW5jdGlvbigpIHtyZXR1cm4gdHJ1ZX1cbiAgICBcbiAgICAgIHJldHVybiB0aGlzLl9vcHNbb3BdKGZpZWxkLCB2YWx1ZSlcbiAgICB9XG4gICwgZmlsdGVyUm93OiBmdW5jdGlvbihfZmlsdGVyLCBmaWVsZHMsIG9wcywgdmFsdWUpIHtcbiAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIHJlbW92ZSA9IGQzX3VwZGF0ZWFibGUoX2ZpbHRlcixcIi5yZW1vdmVcIixcImFcIilcbiAgICAgICAgLmNsYXNzZWQoXCJyZW1vdmVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbG9hdFwiLFwicmlnaHRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLmh0bWwoXCImIzEwMDA1O1wiKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgbmV3X2RhdGEgPSBzZWxmLmRhdGEoKS5maWx0ZXIoZnVuY3Rpb24oZikgeyByZXR1cm4gZiAhPT0geCB9KTtcbiAgICAgICAgICBzZWxmLmRhdGEobmV3X2RhdGEpO1xuICAgICAgICAgIHNlbGYuZHJhdygpO1xuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICB2YXIgZmlsdGVyID0gZDNfdXBkYXRlYWJsZShfZmlsdGVyLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJpbm5lclwiLHRydWUpO1xuXG4gICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJzZWxlY3QuZmllbGRcIixcInNlbGVjdFwiLGZpZWxkcylcbiAgICAgICAgLmNsYXNzZWQoXCJmaWVsZFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNjVweFwiKVxuICAgICAgICAub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgdmFsdWUuZmllbGQgPSB0aGlzLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXztcbiAgICAgICAgICBcbiAgICAgICAgICB2YXIgcG9zID0gMDtcbiAgICAgICAgICBmaWVsZHMubWFwKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgICAgaWYgKHggPT0gdmFsdWUuZmllbGQpIHBvcyA9IGk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgc2VsZWN0ZWQgPSBvcHNbcG9zXS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgPT0gdmFsdWUub3AgfSk7XG4gICAgICAgICAgaWYgKHNlbGVjdGVkLmxlbmd0aCA9PSAwKSB2YWx1ZS5vcCA9IG9wc1twb3NdWzBdLmtleTtcbiAgICAgICAgICAvL3ZhbHVlLmZuID0gc2VsZi5idWlsZE9wKHZhbHVlKVxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpO1xuXG4gICAgICAgICAgXG4gICAgICAgICAgXG4gICAgICAgICAgc2VsZi5kcmF3T3BzKGZpbHRlciwgb3BzW3Bvc10sIHZhbHVlLCBwb3MpO1xuICAgICAgICB9KTtcbiAgICAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShzZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiKVxuICAgICAgICAucHJvcGVydHkoXCJkaXNhYmxlZFwiICx0cnVlKVxuICAgICAgICAucHJvcGVydHkoXCJoaWRkZW5cIiwgdHJ1ZSlcbiAgICAgICAgLnRleHQoXCJGaWx0ZXIuLi5cIik7XG5cbiAgICAgIFxuICAgICAgZDNfc3BsYXQoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9KVxuICAgICAgICAuYXR0cihcInNlbGVjdGVkXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggPT0gdmFsdWUuZmllbGQgPyBcInNlbGVjdGVkXCIgOiB1bmRlZmluZWQgfSk7XG5cbiAgICAgIGlmICh2YWx1ZS5vcCAmJiB2YWx1ZS5maWVsZCAmJiB2YWx1ZS52YWx1ZSkge1xuICAgICAgICB2YXIgcG9zID0gZmllbGRzLmluZGV4T2YodmFsdWUuZmllbGQpO1xuICAgICAgICBzZWxmLmRyYXdPcHMoZmlsdGVyLCBvcHNbcG9zXSwgdmFsdWUsIHBvcyk7XG4gICAgICB9XG5cblxuICAgIH1cbiAgLCBkcmF3T3BzOiBmdW5jdGlvbihmaWx0ZXIsIG9wcywgdmFsdWUpIHtcblxuICAgICAgXG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic2VsZWN0Lm9wXCIsXCJzZWxlY3RcIixmYWxzZSwgZnVuY3Rpb24oeCkge3JldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJvcFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLm9uKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHZhbHVlLm9wID0gdGhpcy5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18ua2V5O1xuICAgICAgICAgIC8vdmFsdWUuZm4gPSBzZWxmLmJ1aWxkT3AodmFsdWUpXG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSk7XG4gICAgICAgICAgc2VsZi5kcmF3SW5wdXQoZmlsdGVyLCB2YWx1ZSwgdmFsdWUub3ApO1xuICAgICAgICB9KTtcblxuICAgICAgLy92YXIgZGZsdCA9IFt7XCJrZXlcIjpcIlNlbGVjdCBPcGVyYXRpb24uLi5cIixcImRpc2FibGVkXCI6dHJ1ZSxcImhpZGRlblwiOnRydWV9XVxuXG4gICAgICB2YXIgbmV3X29wcyA9IG9wczsgLy9kZmx0LmNvbmNhdChvcHMpXG5cbiAgICAgIHZhbHVlLm9wID0gdmFsdWUub3AgfHwgbmV3X29wc1swXS5rZXk7XG5cbiAgICAgIHZhciBvcHMgPSBkM19zcGxhdChzZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiLG5ld19vcHMsZnVuY3Rpb24oeCl7cmV0dXJuIHgua2V5fSlcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkuc3BsaXQoXCIuXCIpWzBdIH0pIFxuICAgICAgICAuYXR0cihcInNlbGVjdGVkXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5ID09IHZhbHVlLm9wID8gXCJzZWxlY3RlZFwiIDogdW5kZWZpbmVkIH0pO1xuXG4gICAgICBvcHMuZXhpdCgpLnJlbW92ZSgpO1xuICAgICAgc2VsZi5kcmF3SW5wdXQoZmlsdGVyLCB2YWx1ZSwgdmFsdWUub3ApO1xuXG4gICAgfVxuICAsIGRyYXdJbnB1dDogZnVuY3Rpb24oZmlsdGVyLCB2YWx1ZSwgb3ApIHtcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnZhbHVlXCIpLnJlbW92ZSgpO1xuICAgICAgdmFyIHIgPSB0aGlzLl9yZW5kZXJfb3Bbb3BdO1xuXG4gICAgICBpZiAocikge1xuICAgICAgICByZXR1cm4gci5iaW5kKHRoaXMpKGZpbHRlcix2YWx1ZSlcbiAgICAgIH1cblxuICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dC52YWx1ZVwiLFwiaW5wdXRcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTUwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjFlbVwiKVxuXG4gICAgICAgIC5hdHRyKFwidmFsdWVcIiwgdmFsdWUudmFsdWUpXG4gICAgICAgIC5vbihcImtleXVwXCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHZhciB0ID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgICAgdHlwZXdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSB0LnZhbHVlO1xuICAgICAgICAgICAgLy92YWx1ZS5mbiA9IHNlbGYuYnVpbGRPcCh2YWx1ZSlcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpO1xuICAgICAgICAgIH0sMTAwMCk7XG4gICAgICAgIH0pO1xuICAgIFxuICAgIH1cbiAgLCBmaWx0ZXJGb290ZXI6IGZ1bmN0aW9uKHdyYXApIHtcbiAgICAgIHZhciBmb290ZXIgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuZmlsdGVyLWZvb3RlclwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiZmlsdGVyLWZvb3RlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMTBweFwiKTtcblxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoZm9vdGVyLFwiLmFkZFwiLFwiYVwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImFkZFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5odG1sKFwiJiM2NTI5MTtcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwiMS41cHggc29saWQgIzQyOEJDQ1wiKVxuICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIixcInBvaW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIFxuICAgICAgICAgIHZhciBkID0gc2VsZi5fZGF0YTtcbiAgICAgICAgICBpZiAoZC5sZW5ndGggPT0gMCB8fCBPYmplY3Qua2V5cyhkLnNsaWNlKC0xKSkubGVuZ3RoID4gMCkgZC5wdXNoKHt9KTtcbiAgICAgICAgICBzZWxmLmRyYXcoKTtcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICwgdHlwZXdhdGNoOiB0eXBld2F0Y2hcbn07XG5cbmZ1bmN0aW9uIGFjY2Vzc29yJDEoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWw7XG4gIHJldHVybiB0aGlzXG59XG5cbmZ1bmN0aW9uIEZpbHRlckRhdGEoZGF0YSkge1xuICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgdGhpcy5fbCA9IFwib3JcIjtcbn1cblxuZnVuY3Rpb24gZmlsdGVyX2RhdGEoZGF0YSkge1xuICByZXR1cm4gbmV3IEZpbHRlckRhdGEoZGF0YSlcbn1cblxuRmlsdGVyRGF0YS5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3NvciQxLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9XG4gICwgbG9naWM6IGZ1bmN0aW9uKGwpIHtcbiAgICAgIGlmIChsID09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2xcbiAgICAgIHRoaXMuX2wgPSAobCA9PSBcImFuZFwiKSA/IFwiYW5kXCIgOiBcIm9yXCI7XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvcDogZnVuY3Rpb24ob3AsIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29wc1tvcF0gfHwgdGhpcy5fb3BzW1wiZXF1YWxzXCJdO1xuICAgICAgdGhpcy5fb3BzW29wXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcblxuICAgIH1cbiAgLCBieTogZnVuY3Rpb24oYikge1xuICAgICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICAgLCBmaWx0ZXIgPSBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBpZiAoYi5sZW5ndGggPT0gMCkgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG1hc2sgPSBiLm1hcChmdW5jdGlvbih6KSB7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICB2YXIgc3BsaXQgPSB6LmZpZWxkLnNwbGl0KFwiLlwiKSwgZmllbGQgPSBzcGxpdC5zbGljZSgtMSlbMF1cbiAgICAgICAgICAgICAgICAsIG9iaiA9IHNwbGl0LnNsaWNlKDAsLTEpLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHBbY10gfSx4KVxuICAgICAgICAgICAgICAgICwgb3NwbGl0ID0gei5vcC5zcGxpdChcIi5cIiksIG9wID0gb3NwbGl0WzBdO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgcmV0dXJuIHNlbGYub3Aob3ApKGZpZWxkLHoudmFsdWUpKG9iailcbiAgICAgICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHggfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzZWxmLl9sID09IFwiYW5kXCIpIHJldHVybiBtYXNrLmxlbmd0aCA9PSBiLmxlbmd0aFxuICAgICAgICAgICAgcmV0dXJuIG1hc2subGVuZ3RoID4gMFxuICAgICAgICAgIH07XG4gICAgICBcbiAgICAgIHJldHVybiB0aGlzLl9kYXRhLmZpbHRlcihmaWx0ZXIpXG5cbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIF9vcHM6IHtcbiAgICAgICAgXCJlcXVhbHNcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcoeFtmaWVsZF0pID09IFN0cmluZyh2YWx1ZSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbi8vICAgICAgLCBcImNvbnRhaW5zXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuLy8gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbi8vICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xXG4vLyAgICAgICAgICB9XG4vLyAgICAgICAgfVxuICAgICAgLCBcInN0YXJ0cyB3aXRoXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID09IDBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJlbmRzIHdpdGhcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoU3RyaW5nKHhbZmllbGRdKS5sZW5ndGggLSBTdHJpbmcodmFsdWUpLmxlbmd0aCkgPT0gU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiZG9lcyBub3QgZXF1YWxcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcoeFtmaWVsZF0pICE9IFN0cmluZyh2YWx1ZSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJpcyBzZXRcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeFtmaWVsZF0gIT0gdW5kZWZpbmVkKSAmJiAoeFtmaWVsZF0gIT0gXCJcIilcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJpcyBub3Qgc2V0XCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4geFtmaWVsZF0gPT0gdW5kZWZpbmVkXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiYmV0d2VlblwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHhbZmllbGRdKSA+PSB2YWx1ZVswXSAmJiBwYXJzZUludCh4W2ZpZWxkXSkgPD0gdmFsdWVbMV1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJpcyBpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xIH0sIDApID4gMFxuICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICAgICwgXCJpcyBub3QgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMSB9LCAwKSA9PSAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgICAgLCBcImRvZXMgbm90IGNvbnRhaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnRvTG93ZXJDYXNlKCkuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpLnRvTG93ZXJDYXNlKCkpID4gLTEgfSwgMCkgPT0gMFxuICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICAgICwgXCJjb250YWluc1wiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUudG9Mb3dlckNhc2UoKS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkudG9Mb3dlckNhc2UoKSkgPiAtMSB9LCAwKSA+IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIHZlcnNpb24gPSBcIjAuMC4xXCI7XG5cbmV4cG9ydCB7IHZlcnNpb24sIGZpbHRlciQyIGFzIGZpbHRlciwgZmlsdGVyX2RhdGEgfTtcbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4uL2dlbmVyaWMvc2VsZWN0J1xuXG5pbXBvcnQgKiBhcyB0YWJsZSBmcm9tICd0YWJsZSdcbmltcG9ydCB7ZmlsdGVyfSBmcm9tICdmaWx0ZXInXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5leHBvcnQgZnVuY3Rpb24gRmlsdGVyVmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cblxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxuICB0aGlzLl9maWx0ZXJfb3B0aW9ucyA9IHtcbiAgICAgIFwiQ2F0ZWdvcnlcIjogXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiXG4gICAgLCBcIlRpdGxlXCI6IFwidXJsXCJcbiAgICAsIFwiVGltZVwiOiBcImhvdXJcIlxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGZpbHRlcl92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IEZpbHRlclZpZXcodGFyZ2V0KVxufVxuXG5GaWx0ZXJWaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIGxvZ2ljOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibG9naWNcIix2YWwpIFxuICAgIH1cbiAgLCBjYXRlZ29yaWVzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY2F0ZWdvcmllc1wiLHZhbCkgXG4gICAgfVxuICAsIGZpbHRlcnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJmaWx0ZXJzXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICBcbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5maWx0ZXItd3JhcFwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKXsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlci13cmFwXCIsdHJ1ZSlcblxuICAgICAgaGVhZGVyKHdyYXBwZXIpXG4gICAgICAgIC50ZXh0KFwiRmlsdGVyXCIpXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgdmFyIHN1YnRpdGxlID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLCBcIi5zdWJ0aXRsZS1maWx0ZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInN1YnRpdGxlLWZpbHRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwiIHVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiIGJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIiAzM3B4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiAjZTNlYmYwXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoc3VidGl0bGUsXCJzcGFuLmZpcnN0XCIsXCJzcGFuXCIpXG4gICAgICAgIC50ZXh0KFwiVXNlcnMgbWF0Y2hpbmcgXCIgKVxuICAgICAgICAuY2xhc3NlZChcImZpcnN0XCIsdHJ1ZSlcbiAgICBcbiAgICAgIHZhciBmaWx0ZXJfdHlwZSAgPSBkM191cGRhdGVhYmxlKHN1YnRpdGxlLFwic3Bhbi5taWRkbGVcIixcInNwYW5cIilcbiAgICAgICAgLmNsYXNzZWQoXCJtaWRkbGVcIix0cnVlKVxuICAgIFxuICAgICAgc2VsZWN0KGZpbHRlcl90eXBlKVxuICAgICAgICAub3B0aW9ucyh0aGlzLmxvZ2ljKCkpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdGhpcy5sb2dpYygpLm1hcChmdW5jdGlvbih5KSB7IFxuICAgICAgICAgICAgeS5zZWxlY3RlZCA9ICh5LmtleSA9PSB4LmtleSlcbiAgICAgICAgICB9KVxuICAgICAgICAgIHRoaXMub24oXCJsb2dpYy5jaGFuZ2VcIikodGhpcy5sb2dpYygpKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIC5kcmF3KClcbiAgICAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdWJ0aXRsZSxcInNwYW4ubGFzdFwiLFwic3BhblwiKVxuICAgICAgICAudGV4dChcIiBvZiB0aGUgZm9sbG93aW5nOlwiKVxuICAgICAgICAuY2xhc3NlZChcImxhc3RcIix0cnVlKVxuXG5cbiAgICAgIC8vIC0tLS0tLS0tIENBVEVHT1JJRVMgLS0tLS0tLS0tIC8vXG5cbiAgICAgIHZhciBjYXRlZ29yaWVzID0gdGhpcy5jYXRlZ29yaWVzKClcbiAgICAgIHZhciBmaWx0ZXJfY2hhbmdlID0gdGhpcy5vbihcImZpbHRlci5jaGFuZ2VcIikuYmluZCh0aGlzKVxuXG4gICAgICBmdW5jdGlvbiBzZWxlY3RpemVJbnB1dChmaWx0ZXIsdmFsdWUpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjIwMHB4XCIpXG4gICAgICAgICAgLnByb3BlcnR5KFwidmFsdWVcIix2YWx1ZS52YWx1ZSlcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIGRlc3Ryb3kgPSBkMy5zZWxlY3QodGhpcykub24oXCJkZXN0cm95XCIpXG4gICAgICAgICAgICBpZiAoZGVzdHJveSkgZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuXG4gICAgICAgIHZhciBzID0gJChzZWxlY3Qubm9kZSgpKS5zZWxlY3RpemUoe1xuICAgICAgICAgIHBlcnNpc3Q6IGZhbHNlLFxuICAgICAgICAgIGNyZWF0ZTogZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9ICh2YWx1ZS52YWx1ZSA/IHZhbHVlLnZhbHVlICsgXCIsXCIgOiBcIlwiKSArIHhcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB2YWx1ZTogeCwgdGV4dDogeFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgb25EZWxldGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSB2YWx1ZS52YWx1ZS5zcGxpdChcIixcIikuZmlsdGVyKGZ1bmN0aW9uKHopIHsgcmV0dXJuIHogIT0geFswXX0pLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAgIC5vbihcImRlc3Ryb3lcIixmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNbMF0uc2VsZWN0aXplLmRlc3Ryb3koKVxuICAgICAgICAgIH0pXG5cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gc2VsZWN0aXplU2VsZWN0KGZpbHRlcix2YWx1ZSkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKS5yZW1vdmUoKVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgZGVzdHJveSA9IGQzLnNlbGVjdCh0aGlzKS5vbihcImRlc3Ryb3lcIilcbiAgICAgICAgICAgIGlmIChkZXN0cm95KSBkZXN0cm95KClcbiAgICAgICAgICB9KVxuXG5cblxuICAgIFxuICAgICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJzZWxlY3QudmFsdWVcIixcInNlbGVjdFwiKVxuICAgICAgICAgIC5jbGFzc2VkKFwidmFsdWVcIix0cnVlKVxuICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjIwMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWF4LXdpZHRoXCIsXCI1MDBweFwiKVxuICAgICAgICAgIC5hdHRyKFwibXVsdGlwbGVcIix0cnVlKVxuICAgICAgICAgIC5vbihcImNoYW5nZVwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdGhpcy52YWx1ZVxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICB9KVxuICAgIFxuICAgICAgICBkM19zcGxhdChzZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiLGNhdGVnb3JpZXMsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgICAuYXR0cihcInNlbGVjdGVkXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gdmFsdWUudmFsdWUgJiYgdmFsdWUudmFsdWUuaW5kZXhPZih4LmtleSkgPiAtMSA/IFwic2VsZWN0ZWRcIiA6IHVuZGVmaW5lZCB9KVxuICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG5cbiAgICAgICAgdmFyIHMgPSAkKHNlbGVjdC5ub2RlKCkpLnNlbGVjdGl6ZSh7XG4gICAgICAgICAgcGVyc2lzdDogZmFsc2UsXG4gICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0geC5qb2luKFwiLFwiKVxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAgIC5vbihcImRlc3Ryb3lcIixmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNbMF0uc2VsZWN0aXplLmRlc3Ryb3koKVxuICAgICAgICAgIH0pXG5cblxuXG4gICAgXG4gICAgICB9XG4gICAgXG4gICAgICB0aGlzLl9sb2dpY19maWx0ZXIgPSBmaWx0ZXIod3JhcHBlcilcbiAgICAgICAgLmZpZWxkcyhPYmplY3Qua2V5cyh0aGlzLl9maWx0ZXJfb3B0aW9ucykpXG4gICAgICAgIC5vcHMoW1xuICAgICAgICAgICAgW3tcImtleVwiOiBcImlzIGluLmNhdGVnb3J5XCJ9LHtcImtleVwiOiBcImlzIG5vdCBpbi5jYXRlZ29yeVwifV1cbiAgICAgICAgICAsIFt7XCJrZXlcIjogXCJjb250YWlucy5zZWxlY3RpemVcIn0sIHtcImtleVwiOlwiZG9lcyBub3QgY29udGFpbi5zZWxlY3RpemVcIn1dXG4gICAgICAgICAgLCBbe1wia2V5XCI6IFwiZXF1YWxzXCJ9LCB7XCJrZXlcIjpcImJldHdlZW5cIixcImlucHV0XCI6Mn1dXG4gICAgICAgIF0pXG4gICAgICAgIC5kYXRhKHRoaXMuZmlsdGVycygpKVxuICAgICAgICAucmVuZGVyX29wKFwiY29udGFpbnMuc2VsZWN0aXplXCIsc2VsZWN0aXplSW5wdXQpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJkb2VzIG5vdCBjb250YWluLnNlbGVjdGl6ZVwiLHNlbGVjdGl6ZUlucHV0KVxuICAgICAgICAucmVuZGVyX29wKFwiaXMgaW4uY2F0ZWdvcnlcIixzZWxlY3RpemVTZWxlY3QpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJpcyBub3QgaW4uY2F0ZWdvcnlcIixzZWxlY3RpemVTZWxlY3QpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJiZXR3ZWVuXCIsZnVuY3Rpb24oZmlsdGVyLHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgXG4gICAgICAgICAgdmFsdWUudmFsdWUgPSB0eXBlb2YodmFsdWUudmFsdWUpID09IFwib2JqZWN0XCIgPyB2YWx1ZS52YWx1ZSA6IFswLDI0XVxuICAgIFxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwiaW5wdXQudmFsdWUubG93XCIsXCJpbnB1dFwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZSBsb3dcIix0cnVlKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiOTBweFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ2YWx1ZVwiLCB2YWx1ZS52YWx1ZVswXSlcbiAgICAgICAgICAgIC5vbihcImtleXVwXCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICB2YXIgdCA9IHRoaXNcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgICBzZWxmLnR5cGV3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZS52YWx1ZVswXSA9IHQudmFsdWVcbiAgICAgICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgICAgICB9LDEwMDApXG4gICAgICAgICAgICB9KVxuICAgIFxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic3Bhbi52YWx1ZS1hbmRcIixcInNwYW5cIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidmFsdWUtYW5kXCIsdHJ1ZSlcbiAgICAgICAgICAgIC50ZXh0KFwiIGFuZCBcIilcbiAgICBcbiAgICAgICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0LnZhbHVlLmhpZ2hcIixcImlucHV0XCIpXG4gICAgICAgICAgICAuY2xhc3NlZChcInZhbHVlIGhpZ2hcIix0cnVlKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiOTBweFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ2YWx1ZVwiLCB2YWx1ZS52YWx1ZVsxXSlcbiAgICAgICAgICAgIC5vbihcImtleXVwXCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICB2YXIgdCA9IHRoaXNcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgICBzZWxmLnR5cGV3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZS52YWx1ZVsxXSA9IHQudmFsdWVcbiAgICAgICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgICAgICB9LDEwMDApXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICAub24oXCJ1cGRhdGVcIixmdW5jdGlvbihmaWx0ZXJzKXtcbiAgICAgICAgICBmaWx0ZXJfY2hhbmdlKGZpbHRlcnMpXG4gICAgICAgIH0pXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgLy9kM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmZpbHRlci13cmFwLXNwYWNlclwiLFwiZGl2XCIpXG4gICAgICAvLyAgLmNsYXNzZWQoXCJmaWx0ZXItd3JhcC1zcGFjZXJcIix0cnVlKVxuICAgICAgLy8gIC5zdHlsZShcImhlaWdodFwiLHdyYXBwZXIuc3R5bGUoXCJoZWlnaHRcIikpXG5cbiAgICAgIC8vd3JhcHBlclxuICAgICAgLy8gIC5zdHlsZShcIndpZHRoXCIsdGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKSlcbiAgICAgIC8vICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcbiAgICAgIC8vICAuc3R5bGUoXCJ6LWluZGV4XCIsXCIzMDBcIilcbiAgICAgIC8vICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjBmNGY3XCIpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuXG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4vaGVhZGVyJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIEJ1dHRvblJhZGlvKHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGJ1dHRvbl9yYWRpbyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBCdXR0b25SYWRpbyh0YXJnZXQpXG59XG5cbkJ1dHRvblJhZGlvLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uICgpIHtcbiAgXG4gICAgdmFyIENTU19TVFJJTkcgPSBTdHJpbmcoZnVuY3Rpb24oKSB7LypcbiAgICAgIC5vcHRpb25zLXZpZXcgeyB0ZXh0LWFsaWduOnJpZ2h0IH1cbiAgICAgIC5zaG93LWJ1dHRvbiB7XG4gICAgICB3aWR0aDogMTUwcHg7XG4gICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgICBsaW5lLWhlaWdodDogNDBweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDE1cHg7XG4gICAgICBib3JkZXI6IDFweCBzb2xpZCAjY2NjO1xuICAgICAgZm9udC1zaXplOiAxMnB4O1xuICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbiAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgICAgZGlzcGxheTppbmxpbmUtYmxvY2s7XG4gICAgICBtYXJnaW4tcmlnaHQ6MTVweDtcbiAgICAgICAgfVxuICAgICAgLnNob3ctYnV0dG9uOmhvdmVyIHsgdGV4dC1kZWNvcmF0aW9uOm5vbmU7IGNvbG9yOiM1NTUgfVxuICAgICAgLnNob3ctYnV0dG9uLnNlbGVjdGVkIHtcbiAgICAgICAgYmFja2dyb3VuZDogI2UzZWJmMDtcbiAgICAgICAgY29sb3I6ICM1NTU7XG4gICAgICB9XG4gICAgKi99KVxuICBcbiAgICBkM191cGRhdGVhYmxlKGQzLnNlbGVjdChcImhlYWRcIiksXCJzdHlsZSNzaG93LWNzc1wiLFwic3R5bGVcIilcbiAgICAgIC5hdHRyKFwiaWRcIixcImhlYWRlci1jc3NcIilcbiAgICAgIC50ZXh0KENTU19TVFJJTkcucmVwbGFjZShcImZ1bmN0aW9uICgpIHsvKlwiLFwiXCIpLnJlcGxhY2UoXCIqL31cIixcIlwiKSlcbiAgXG4gICAgdmFyIG9wdGlvbnMgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmJ1dHRvbi1yYWRpby1yb3dcIixcImRpdlwiKVxuICAgICAgLmNsYXNzZWQoXCJidXR0b24tcmFkaW8tcm93XCIsdHJ1ZSlcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjM1cHhcIilcbiAgXG4gIFxuICAgIHZhciBidXR0b25fcm93ID0gZDNfdXBkYXRlYWJsZShvcHRpb25zLFwiLm9wdGlvbnMtdmlld1wiLFwiZGl2XCIsdGhpcy5kYXRhKCkpXG4gICAgICAuY2xhc3NlZChcIm9wdGlvbnMtdmlld1wiLHRydWUpXG5cbiAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwiY2xpY2tcIikuYmluZCh0aGlzKVxuICBcbiAgICBkM19zcGxhdChidXR0b25fcm93LFwiLnNob3ctYnV0dG9uXCIsXCJhXCIsaWRlbnRpdHksIGtleSlcbiAgICAgIC5jbGFzc2VkKFwic2hvdy1idXR0b25cIix0cnVlKVxuICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LnNlbGVjdGVkIH0pXG4gICAgICAudGV4dChrZXkpXG4gICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7IGJvdW5kKHgpIH0pXG5cbiAgICByZXR1cm4gdGhpc1xuICBcbiAgICB9XG4gIFxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBidXR0b25fcmFkaW8gZnJvbSAnLi4vZ2VuZXJpYy9idXR0b25fcmFkaW8nXG5pbXBvcnQgKiBhcyB0YWJsZSBmcm9tICd0YWJsZSdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cblxuZXhwb3J0IGZ1bmN0aW9uIE9wdGlvblZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBvcHRpb25fdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBPcHRpb25WaWV3KHRhcmdldClcbn1cblxuT3B0aW9uVmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBvcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwib3B0aW9uc1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5vcHRpb24td3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwib3B0aW9uLXdyYXBcIix0cnVlKVxuXG4gICAgICAvL2hlYWRlcih3cmFwKVxuICAgICAgLy8gIC50ZXh0KFwiQ2hvb3NlIFZpZXdcIilcbiAgICAgIC8vICAuZHJhdygpXG5cbiAgICAgIGJ1dHRvbl9yYWRpbyh3cmFwKVxuICAgICAgICAub24oXCJjbGlja1wiLCB0aGlzLm9uKFwic2VsZWN0XCIpIClcbiAgICAgICAgLmRhdGEodGhpcy5kYXRhKCkpXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG5cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCB7YXV0b1NpemUgYXMgYXV0b1NpemV9IGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQge3ByZXBEYXRhIGFzIHB9IGZyb20gJy4uL2hlbHBlcnMnO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJlcERhdGEoKSB7XG4gIHJldHVybiBwLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn07XG5cbnZhciBFWEFNUExFX0RBVEEgPSB7XG4gICAgXCJrZXlcIjogXCJCcm93c2luZyBiZWhhdmlvciBieSB0aW1lXCJcbiAgLCBcInZhbHVlc1wiOiBbXG4gICAgICB7ICBcbiAgICAgICAgICBcImtleVwiOiAxXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDJcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogMi4yNVxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAyLjVcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogM1xuICAgICAgICAsIFwidmFsdWVcIjogMTIzNFxuICAgICAgfVxuXG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogNFxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cblxuXG4gIF0gXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBUaW1lU2VyaWVzKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMuX2RhdGEgPSBFWEFNUExFX0RBVEFcbiAgdGhpcy5fb24gPSB7fVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0aW1lX3Nlcmllcyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBUaW1lU2VyaWVzKHRhcmdldClcbn1cblxuVGltZVNlcmllcy5wcm90b3R5cGUgPSB7XG5cbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbixmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCB0aXRsZTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH1cbiAgLCBoZWlnaHQ6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhlaWdodFwiLHZhbCkgfVxuXG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgd3JhcCA9IHRoaXMuX3RhcmdldFxuICAgICAgdmFyIGRlc2MgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudmVuZG9yLWRvbWFpbnMtYmFyLWRlc2NcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInZlbmRvci1kb21haW5zLWJhci1kZXNjXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMCVcIilcbiAgICAgICAgLmRhdHVtKHRoaXMuX2RhdGEpXG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZShkZXNjLFwiLndcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIndcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMCVcIilcblxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gIFxuICAgICAgXG5cbiAgICAgIHdyYXBwZXIuZWFjaChmdW5jdGlvbihyb3cpe1xuXG4gICAgICAgIHZhciBkYXRhID0gcm93LnZhbHVlcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gYy5rZXkgLSBwLmtleX0pXG4gICAgICAgICAgLCBjb3VudCA9IGRhdGEubGVuZ3RoO1xuXG5cbiAgICAgICAgdmFyIF9zaXplcyA9IGF1dG9TaXplKHdyYXBwZXIsZnVuY3Rpb24oZCl7cmV0dXJuIGQgLTEwfSwgZnVuY3Rpb24oZCl7cmV0dXJuIHNlbGYuX2hlaWdodCB8fCA2MCB9KSxcbiAgICAgICAgICBncmlkU2l6ZSA9IE1hdGguZmxvb3IoX3NpemVzLndpZHRoIC8gMjQgLyAzKTtcblxuICAgICAgICB2YXIgdmFsdWVBY2Nlc3NvciA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgfVxuICAgICAgICAgICwgdmFsdWVBY2Nlc3NvcjIgPSBmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlMiB9XG4gICAgICAgICAgLCBrZXlBY2Nlc3NvciA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH1cblxuICAgICAgICB2YXIgc3RlcHMgPSBBcnJheS5hcHBseShudWxsLCBBcnJheShjb3VudCkpLm1hcChmdW5jdGlvbiAoXywgaSkge3JldHVybiBpKzE7fSlcblxuICAgICAgICB2YXIgX2NvbG9ycyA9IFtcIiNmZmZmZDlcIixcIiNlZGY4YjFcIixcIiNjN2U5YjRcIixcIiM3ZmNkYmJcIixcIiM0MWI2YzRcIixcIiMxZDkxYzBcIixcIiMyMjVlYThcIixcIiMyNTM0OTRcIixcIiMwODFkNThcIl1cbiAgICAgICAgdmFyIGNvbG9ycyA9IF9jb2xvcnNcblxuICAgICAgICB2YXIgeCA9IGQzLnNjYWxlLm9yZGluYWwoKS5yYW5nZShzdGVwcylcbiAgICAgICAgICAsIHkgPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbX3NpemVzLmhlaWdodCwgMCBdKVxuXG5cbiAgICAgICAgdmFyIGNvbG9yU2NhbGUgPSBkMy5zY2FsZS5xdWFudGlsZSgpXG4gICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uIChkKSB7IHJldHVybiBkLmZyZXF1ZW5jeTsgfSldKVxuICAgICAgICAgIC5yYW5nZShjb2xvcnMpO1xuXG4gICAgICAgIHZhciBzdmdfd3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcInN2Z1wiLFwic3ZnXCIpXG4gICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBfc2l6ZXMud2lkdGggKyBfc2l6ZXMubWFyZ2luLmxlZnQgKyBfc2l6ZXMubWFyZ2luLnJpZ2h0KVxuICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIF9zaXplcy5oZWlnaHQgKyBfc2l6ZXMubWFyZ2luLnRvcCArIF9zaXplcy5tYXJnaW4uYm90dG9tKVxuXG4gICAgICAgIHZhciBzdmcgPSBkM19zcGxhdChzdmdfd3JhcCxcImdcIixcImdcIixmdW5jdGlvbih4KSB7cmV0dXJuIFt4LnZhbHVlc119LGZ1bmN0aW9uKF8saSkge3JldHVybiBpfSlcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIF9zaXplcy5tYXJnaW4ubGVmdCArIFwiLFwiICsgMCArIFwiKVwiKVxuXG4gICAgICAgIHguZG9tYWluKFswLDcyXSk7XG4gICAgICAgIHkuZG9tYWluKFswLCBkMy5tYXgoZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gTWF0aC5zcXJ0KHZhbHVlQWNjZXNzb3IoZCkpOyB9KV0pO1xuXG4gICAgICAgIHZhciBidWlsZEJhcnMgPSBmdW5jdGlvbihkYXRhLGtleUFjY2Vzc29yLHZhbHVlQWNjZXNzb3IseSxjKSB7XG5cbiAgICAgICAgICB2YXIgYmFycyA9IGQzX3NwbGF0KHN2ZywgXCIudGltaW5nLWJhclwiICsgYywgXCJyZWN0XCIsIGRhdGEsIGtleUFjY2Vzc29yKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRpbWluZy1iYXJcIiArIGMpXG4gICAgICAgICAgIFxuICAgICAgICAgIGJhcnNcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiAoKGtleUFjY2Vzc29yKGQpIC0gMSkgKiBncmlkU2l6ZSApOyB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBncmlkU2l6ZSAtIDEpXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24oZCkgeyBcbiAgICAgICAgICAgICAgcmV0dXJuIHkoTWF0aC5zcXJ0KCB2YWx1ZUFjY2Vzc29yKGQpICkpOyBcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIixcIiNhYWFcIilcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGNvbG9yU2NhbGUoIGtleUFjY2Vzc29yKHgpICsgYyApIHx8IFwiZ3JleVwiIH0gKVxuICAgICAgICAgICAgLy8uYXR0cihcInN0cm9rZVwiLFwid2hpdGVcIilcbiAgICAgICAgICAgIC8vLmF0dHIoXCJzdHJva2Utd2lkdGhcIixcIjFweFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gX3NpemVzLmhlaWdodCAtIHkoTWF0aC5zcXJ0KCB2YWx1ZUFjY2Vzc29yKGQpICkpOyB9KVxuICAgICAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiMVwiKVxuICAgICAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCl7IFxuICAgICAgICAgICAgICBzZWxmLm9uKFwiaG92ZXJcIikuYmluZCh0aGlzKSh4KVxuICAgICAgICAgICAgfSlcblxuICAgICAgICB9XG4gICAgICAgIFxuXG4gICAgICAgIGlmIChkYXRhICYmIGRhdGEubGVuZ3RoICYmIGRhdGFbMF0udmFsdWUyKSB7XG4gICAgICAgICAgdmFyICB5MiA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFtfc2l6ZXMuaGVpZ2h0LCAwIF0pXG4gICAgICAgICAgeTIuZG9tYWluKFswLCBkMy5tYXgoZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gTWF0aC5zcXJ0KHZhbHVlQWNjZXNzb3IyKGQpKTsgfSldKTtcbiAgICAgICAgICBidWlsZEJhcnMoZGF0YSxrZXlBY2Nlc3Nvcix2YWx1ZUFjY2Vzc29yMix5MixcIi0yXCIpXG4gICAgICAgIH1cblxuXG4gICAgICAgIGJ1aWxkQmFycyhkYXRhLGtleUFjY2Vzc29yLHZhbHVlQWNjZXNzb3IseSxcIlwiKVxuICAgICAgXG4gICAgXG4gICAgICB2YXIgeiA9IGQzLnRpbWUuc2NhbGUoKVxuICAgICAgICAucmFuZ2UoWzAsIGdyaWRTaXplKjI0KjNdKVxuICAgICAgICAubmljZShkMy50aW1lLmhvdXIsMjQpXG4gICAgICAgIFxuICAgIFxuICAgICAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKVxuICAgICAgICAuc2NhbGUoeilcbiAgICAgICAgLnRpY2tzKDMpXG4gICAgICAgIC50aWNrRm9ybWF0KGQzLnRpbWUuZm9ybWF0KFwiJUkgJXBcIikpO1xuICAgIFxuICAgICAgc3ZnLmFwcGVuZChcImdcIilcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwieCBheGlzXCIpXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCxcIiArIF9zaXplcy5oZWlnaHQgKyBcIilcIilcbiAgICAgICAgICAuY2FsbCh4QXhpcyk7XG5cblxuXG4gICAgICAgIFxuICAgICAgfSlcblxuXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM19jbGFzcywgZDNfc3BsYXQsIGQzX3VwZGF0ZWFibGUsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGFidWxhckhlYWRlciBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLldJRFRIID0gMTQ0XG4gICAgdGhpcy5fbGFiZWwgPSBcIlVSTFwiXG4gICAgdGhpcy5faGVhZGVycyA9IFtcIjEyYW1cIiwgXCIxMnBtXCIsIFwiMTJhbVwiXVxuICAgIHRoaXMuX3hzID0gWzAsdGhpcy5XSURUSC8yLHRoaXMuV0lEVEhdXG4gICAgdGhpcy5fYW5jaG9ycyA9IFtcInN0YXJ0XCIsXCJtaWRkbGVcIixcImVuZFwiXVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJsYWJlbFwiLFwiaGVhZGVyc1wiXSB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBldWggPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJleHBhbnNpb24tdXJscy10aXRsZVwiKVxuXG4gICAgZDNfY2xhc3MoZXVoLFwidGl0bGVcIikudGV4dCh0aGlzLmxhYmVsKCkpXG4gICAgZDNfY2xhc3MoZXVoLFwidmlld1wiKS50ZXh0KFwiVmlld3NcIilcblxuICAgIHZhciBzdmdfbGVnZW5kID0gZDNfY2xhc3MoZXVoLFwibGVnZW5kXCIsXCJzdmdcIilcblxuICAgIGlmICh0aGlzLmhlYWRlcnMoKS5sZW5ndGggPT0gMikge1xuICAgICAgdGhpcy5feHMgPSBbdGhpcy5XSURUSC8yLXRoaXMuV0lEVEgvNCx0aGlzLldJRFRILzIrdGhpcy5XSURUSC80XVxuICAgICAgdGhpcy5fYW5jaG9ycyA9IFtcIm1pZGRsZVwiLFwibWlkZGxlXCJdXG4gICAgfVxuXG4gICAgZDNfc3BsYXQoc3ZnX2xlZ2VuZCxcInRleHRcIixcInRleHRcIix0aGlzLmhlYWRlcnMoKSwoeCxpKSA9PiB7IHJldHVybiBpIH0pXG4gICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAuYXR0cihcInhcIiwoeCxpKSA9PiB0aGlzLl94c1tpXSlcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsKHgsaSkgPT4gdGhpcy5fYW5jaG9yc1tpXSlcbiAgICAgIC50ZXh0KFN0cmluZylcblxuICAgIGQzX3NwbGF0KHN2Z19sZWdlbmQsXCJsaW5lXCIsXCJsaW5lXCIsdGhpcy5oZWFkZXJzKCksKHgsaSkgPT4geyByZXR1cm4gaSB9KVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAuYXR0cihcInkxXCIsIHRoaXMuaGVhZGVycygpLmxlbmd0aCA9PSAyID8gMCA6IDI1KVxuICAgICAgLmF0dHIoXCJ5MlwiLCAzNSlcbiAgICAgIC5hdHRyKFwieDFcIiwoeCxpKSA9PiB0aGlzLmhlYWRlcnMoKS5sZW5ndGggPT0gMiA/IHRoaXMuV0lEVEgvMiA6IHRoaXMuX3hzW2ldKVxuICAgICAgLmF0dHIoXCJ4MlwiLCh4LGkpID0+IHRoaXMuaGVhZGVycygpLmxlbmd0aCA9PSAyID8gdGhpcy5XSURUSC8yIDogdGhpcy5feHNbaV0pXG5cbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIHNpbXBsZVRpbWVzZXJpZXModGFyZ2V0LGRhdGEsdyxoKSB7XG4gIHZhciB3aWR0aCA9IHcgfHwgMTIwXG4gICAgLCBoZWlnaHQgPSBoIHx8IDMwXG5cbiAgdmFyIHggPSBkMy5zY2FsZS5vcmRpbmFsKCkuZG9tYWluKGQzLnJhbmdlKDAsZGF0YS5sZW5ndGgpKS5yYW5nZShkMy5yYW5nZSgwLHdpZHRoLHdpZHRoL2RhdGEubGVuZ3RoKSlcbiAgdmFyIHkgPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbNCxoZWlnaHRdKS5kb21haW4oW2QzLm1pbihkYXRhKSxkMy5tYXgoZGF0YSldKVxuXG4gIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJnXCIsXCJnXCIsZGF0YSxmdW5jdGlvbih4LGkpIHsgcmV0dXJuIDF9KVxuXG4gIGQzX3NwbGF0KHdyYXAsXCJyZWN0XCIsXCJyZWN0XCIseCA9PiB4LCAoeCxpKSA9PiBpKVxuICAgIC5hdHRyKFwieFwiLCh6LGkpID0+IHgoaSkpXG4gICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aC9kYXRhLmxlbmd0aCAtMS4yKVxuICAgIC5hdHRyKFwieVwiLCB6ID0+IGhlaWdodCAtIHkoeikgKVxuICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHogPT4geiA/IHkoeikgOiAwKVxuXG4gIHJldHVybiB3cmFwXG5cbn1cbiIsImltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnLi9zaW1wbGVfdGltZXNlcmllcydcbmltcG9ydCB7ZDNfY2xhc3MsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIGJlZm9yZV9hZnRlcl90aW1lc2VyaWVzKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEJlZm9yZUFmdGVyVGltZXNlcmllcyh0YXJnZXQpXG59XG5cbmNsYXNzIEJlZm9yZUFmdGVyVGltZXNlcmllcyBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG5cbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICAgIHRoaXMuX3dyYXBwZXJfY2xhc3MgPSBcImJhLXRpbWVzZXJpZXMtd3JhcFwiXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImRhdGFcIixcImJlZm9yZVwiLFwiYWZ0ZXJcIixcIndyYXBwZXJfY2xhc3NcIl0gfVxuXG4gIGRyYXcoKSB7XG5cbiAgICBjb25zdCB0c3cgPSAyNTBcbiAgICAgICwgdW5pdF9zaXplID0gdHN3L3RoaXMuZGF0YSgpLmxlbmd0aFxuICAgICAgLCBiZWZvcmVfcG9zID0gdGhpcy5iZWZvcmUoKVxuICAgICAgLCBhZnRlcl9wb3MgPSB0aGlzLmFmdGVyKClcblxuXG4gICAgY29uc3QgdGltZXNlcmllcyA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCx0aGlzLndyYXBwZXJfY2xhc3MoKSxcInN2Z1wiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiYmxvY2tcIilcbiAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiYXV0b1wiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMzBweFwiKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLHRzdyArIFwicHhcIilcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsXCI3MHB4XCIpXG5cbiAgICBzaW1wbGVUaW1lc2VyaWVzKHRpbWVzZXJpZXMsdGhpcy5kYXRhKCksdHN3KVxuXG4gICAgLy8gYWRkIGRlY29yYXRpb25zXG5cbiAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwibWlkZGxlXCIsXCJsaW5lXCIpXG4gICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAgIC5hdHRyKFwieTJcIiwgNTUpXG4gICAgICAuYXR0cihcIngxXCIsIHRzdy8yKVxuICAgICAgLmF0dHIoXCJ4MlwiLCB0c3cvMilcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJtaWRkbGUtdGV4dFwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ4XCIsIHRzdy8yKVxuICAgICAgLmF0dHIoXCJ5XCIsIDY3KVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcIm1pZGRsZVwiKVxuICAgICAgLnRleHQoXCJPbi1zaXRlXCIpXG5cbiAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYmVmb3JlXCIsXCJsaW5lXCIpXG4gICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgIC5hdHRyKFwieTFcIiwgMzkpXG4gICAgICAuYXR0cihcInkyXCIsIDQ1KVxuICAgICAgLmF0dHIoXCJ4MVwiLCB1bml0X3NpemUqYmVmb3JlX3BvcylcbiAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKmJlZm9yZV9wb3MpXG5cbiAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYmVmb3JlLXRleHRcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwieFwiLCB1bml0X3NpemUqYmVmb3JlX3BvcyAtIDgpXG4gICAgICAuYXR0cihcInlcIiwgNDgpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAudGV4dChcIkNvbnNpZGVyYXRpb25cIilcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJ3aW5kb3dcIixcImxpbmVcIilcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgLmF0dHIoXCJ5MVwiLCA0NSlcbiAgICAgIC5hdHRyKFwieTJcIiwgNDUpXG4gICAgICAuYXR0cihcIngxXCIsIHVuaXRfc2l6ZSooYmVmb3JlX3BvcykpXG4gICAgICAuYXR0cihcIngyXCIsIHVuaXRfc2l6ZSooYWZ0ZXJfcG9zKzEpKzEpXG5cbiAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYWZ0ZXJcIixcImxpbmVcIilcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgLmF0dHIoXCJ5MVwiLCAzOSlcbiAgICAgIC5hdHRyKFwieTJcIiwgNDUpXG4gICAgICAuYXR0cihcIngxXCIsIHVuaXRfc2l6ZSooYWZ0ZXJfcG9zKzEpKVxuICAgICAgLmF0dHIoXCJ4MlwiLCB1bml0X3NpemUqKGFmdGVyX3BvcysxKSlcblxuICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJhZnRlci10ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInhcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkgKyA4KVxuICAgICAgLmF0dHIoXCJ5XCIsIDQ4KVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcInN0YXJ0XCIpXG4gICAgICAudGV4dChcIlZhbGlkYXRpb25cIilcblxuXG5cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxufVxuXG5cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBzaW1wbGVCYXIod3JhcCx2YWx1ZSxzY2FsZSxjb2xvcikge1xuXG4gIHZhciBoZWlnaHQgPSAyMFxuICAgICwgd2lkdGggPSB3cmFwLnN0eWxlKFwid2lkdGhcIikucmVwbGFjZShcInB4XCIsXCJcIilcblxuICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixbdmFsdWVdLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgLnN0eWxlKFwid2lkdGhcIix3aWR0aCtcInB4XCIpXG4gICAgLnN0eWxlKFwiaGVpZ2h0XCIsaGVpZ2h0K1wicHhcIilcblxuICB2YXIgY2hhcnQgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydCcsJ2cnLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0XCIpXG4gIFxuICB2YXIgYmFycyA9IGQzX3NwbGF0KGNoYXJ0LFwiLnBvcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpIH0pXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgIC5hdHRyKCdoZWlnaHQnLGhlaWdodC00KVxuICAgIC5hdHRyKHsneCc6MCwneSc6MH0pXG4gICAgLnN0eWxlKCdmaWxsJyxjb2xvcilcbiAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gc2NhbGUoeCkgfSlcblxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gZG9tYWluX2J1bGxldCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEb21haW5CdWxsZXQodGFyZ2V0KVxufVxuXG4vLyBkYXRhIHNjaGVtYTogW3twb3BfcGVyY2VudCwgc2FtcGxlX3BlcmNlbnRfbm9ybX1cblxuY2xhc3MgRG9tYWluQnVsbGV0IGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG4gIH1cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJtYXhcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgdmFyIHdpZHRoID0gKHRoaXMudGFyZ2V0LnN0eWxlKFwid2lkdGhcIikucmVwbGFjZShcInB4XCIsXCJcIikgfHwgdGhpcy5vZmZzZXRXaWR0aCkgLSA1MFxuICAgICAgLCBoZWlnaHQgPSAyODtcblxuICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5yYW5nZShbMCwgd2lkdGhdKVxuICAgICAgLmRvbWFpbihbMCwgdGhpcy5tYXgoKV0pXG5cbiAgICBpZiAodGhpcy50YXJnZXQudGV4dCgpKSB0aGlzLnRhcmdldC50ZXh0KFwiXCIpXG5cbiAgICB2YXIgYnVsbGV0ID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5idWxsZXRcIixcImRpdlwiLHRoaXMuZGF0YSgpLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5jbGFzc2VkKFwiYnVsbGV0XCIsdHJ1ZSlcbiAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjNweFwiKVxuXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUoYnVsbGV0LFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgIC5hdHRyKFwid2lkdGhcIix3aWR0aClcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsaGVpZ2h0KVxuICBcbiAgIFxuICAgIGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmJhci0xXCIsXCJyZWN0XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAuY2xhc3NlZChcImJhci0xXCIsdHJ1ZSlcbiAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uKGQpIHtyZXR1cm4geChkLnBvcF9wZXJjZW50KSB9KVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgICAgLmF0dHIoXCJmaWxsXCIsXCIjODg4XCIpXG4gIFxuICAgIGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmJhci0yXCIsXCJyZWN0XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAuY2xhc3NlZChcImJhci0yXCIsdHJ1ZSlcbiAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAuYXR0cihcInlcIixoZWlnaHQvNClcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24oZCkge3JldHVybiB4KGQuc2FtcGxlX3BlcmNlbnRfbm9ybSkgfSlcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodC8yKVxuICAgICAgLmF0dHIoXCJmaWxsXCIsXCJyZ2IoOCwgMjksIDg4KVwiKVxuXG4gICAgcmV0dXJuIHRoaXMgXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3NwbGF0LCBkM191cGRhdGVhYmxlLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUYWJ1bGFyQm9keSBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiLFwic3BsaXRcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgbGV0IGV4cGFuc2lvbl9yb3cgPSB0aGlzLl90YXJnZXRcblxuICAgIHZhciBleHBhbnNpb24gPSBkM19jbGFzcyhleHBhbnNpb25fcm93LFwiZXhwYW5zaW9uLXVybHNcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzY3JvbGxib3hcIix0cnVlKVxuXG4gICAgZXhwYW5zaW9uLmh0bWwoXCJcIilcblxuICAgIHZhciB1cmxfcm93ID0gZDNfc3BsYXQoZXhwYW5zaW9uLFwiLnVybC1yb3dcIixcImRpdlwiLHRoaXMuZGF0YSgpLnNsaWNlKDAsNTAwKSxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmNsYXNzZWQoXCJ1cmwtcm93XCIsdHJ1ZSlcblxuICAgIHZhciB1cmxfbmFtZSA9IGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5uYW1lXCIsXCJkaXZcIikuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh1cmxfbmFtZSxcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICB9KVxuXG4gICAgZDNfY2xhc3ModXJsX25hbWUsXCJ1cmxcIixcImFcIilcbiAgICAgIC50ZXh0KHggPT4geyByZXR1cm4gdGhpcy5zcGxpdCgpID8geC5rZXkuc3BsaXQodGhpcy5zcGxpdCgpKVsxXSB8fCB4LmtleSA6IHgua2V5IH0pXG4gICAgICAuYXR0cihcImhyZWZcIiwgeCA9PiB4LnVybCA/IHgudXJsIDogdW5kZWZpbmVkIClcbiAgICAgIC5hdHRyKFwidGFyZ2V0XCIsIFwiX2JsYW5rXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubnVtYmVyXCIsXCJkaXZcIikuY2xhc3NlZChcIm51bWJlclwiLHRydWUpXG4gICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvdGFsIH0pXG5cblxuICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5wbG90XCIsXCJzdmdcIikuY2xhc3NlZChcInBsb3RcIix0cnVlKVxuICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgdmFyIHZhbHVlcyA9IHgudmFsdWVzIHx8IHgudmFsdWVcbiAgICAgICAgc2ltcGxlVGltZXNlcmllcyhkdGhpcyx2YWx1ZXMsMTQ0LDIwKVxuICAgICAgfSlcblxuICB9XG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM19zcGxhdCwgZDNfdXBkYXRlYWJsZSwgYWNjZXNzb3IsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCBUYWJ1bGFySGVhZGVyIGZyb20gJy4vaGVhZGVyJ1xuaW1wb3J0IFRhYnVsYXJCb2R5IGZyb20gJy4vYm9keSdcblxuaW1wb3J0ICcuL3RhYnVsYXJfdGltZXNlcmllcy5jc3MnXG5cbmV4cG9ydCBmdW5jdGlvbiB0YWJ1bGFyX3RpbWVzZXJpZXModGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGFidWxhclRpbWVzZXJpZXModGFyZ2V0KVxufVxuXG5jbGFzcyBUYWJ1bGFyVGltZXNlcmllcyBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9oZWFkZXJzID0gW1wiMTJhbVwiLFwiMTJwbVwiLFwiMTJhbVwiXVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsXCJsYWJlbFwiLFwic3BsaXRcIixcImhlYWRlcnNcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgbGV0IHRkID0gdGhpcy5fdGFyZ2V0XG5cbiAgICB2YXIgdGl0bGVfcm93ID0gZDNfY2xhc3ModGQsXCJ0aXRsZS1yb3dcIilcbiAgICB2YXIgZXhwYW5zaW9uX3JvdyA9IGQzX2NsYXNzKHRkLFwiZXhwYW5zaW9uLXJvd1wiKVxuXG4gICAgdmFyIGhlYWRlciA9IChuZXcgVGFidWxhckhlYWRlcih0aXRsZV9yb3cpKVxuICAgICAgLmxhYmVsKHRoaXMubGFiZWwoKSlcbiAgICAgIC5oZWFkZXJzKHRoaXMuaGVhZGVycygpKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIGJvZHkgPSAobmV3IFRhYnVsYXJCb2R5KGV4cGFuc2lvbl9yb3cpKVxuICAgICAgLmRhdGEodGhpcy5kYXRhKCkpXG4gICAgICAuc3BsaXQodGhpcy5zcGxpdCgpIHx8IGZhbHNlKVxuICAgICAgLmRyYXcoKVxuXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3NwbGF0LCBkM191cGRhdGVhYmxlLCBhY2Nlc3NvciwgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0ICcuL2RvbWFpbl9leHBhbmRlZC5jc3MnXG5cbmltcG9ydCB7dGFidWxhcl90aW1lc2VyaWVzfSBmcm9tICcuL3RhYnVsYXJfdGltZXNlcmllcy9pbmRleCdcblxuZXhwb3J0IGxldCBhbGxidWNrZXRzID0gW11cbmV4cG9ydCBjb25zdCBob3VyYnVja2V0cyA9IGQzLnJhbmdlKDAsMjQpLm1hcCh4ID0+IFN0cmluZyh4KS5sZW5ndGggPiAxID8gU3RyaW5nKHgpIDogXCIwXCIgKyB4KVxuXG52YXIgbWludXRlcyA9IFswLDIwLDQwXVxuZXhwb3J0IGNvbnN0IGJ1Y2tldHMgPSBkMy5yYW5nZSgwLDI0KS5yZWR1Y2UoKHAsYykgPT4ge1xuICBtaW51dGVzLm1hcCh4ID0+IHtcbiAgICBwW2MgKyBcIjpcIiArIHhdID0gMFxuICB9KVxuICBhbGxidWNrZXRzID0gYWxsYnVja2V0cy5jb25jYXQobWludXRlcy5tYXAoeiA9PiBjICsgXCI6XCIgKyB6KSlcbiAgcmV0dXJuIHBcbn0se30pXG5cblxuZXhwb3J0IGNvbnN0IFNUT1BXT1JEUyA9IFtcInRoYXRcIixcInRoaXNcIixcIndoYXRcIixcImJlc3RcIixcIm1vc3RcIixcImZyb21cIixcInlvdXJcIixcImhhdmVcIixcImZpcnN0XCIsXCJ3aWxsXCIsXCJ0aGFuXCIsXCJzYXlzXCIsXCJsaWtlXCIsXCJpbnRvXCIsXCJhZnRlclwiLFwid2l0aFwiXVxuXG5mdW5jdGlvbiByYXdUb1VybChkYXRhKSB7XG4gIHJldHVybiBkYXRhLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICBwW2MudXJsXSA9IHBbYy51cmxdIHx8IE9iamVjdC5hc3NpZ24oe30sYnVja2V0cylcbiAgICAgIHBbYy51cmxdW2MuaG91cl0gPSAocFtjLnVybF1bYy5ob3VyXSB8fCAwKSArIGMuY291bnRcbiAgICAgIHJldHVybiBwXG4gICAgfSx7fSlcbn1cblxuZnVuY3Rpb24gdXJsVG9EcmF3KHVybHMpIHtcbiAgdmFyIG9iaiA9IHt9XG4gIE9iamVjdC5rZXlzKHVybHMpLm1hcChrID0+IHtcbiAgICBvYmpba10gPSBob3VyYnVja2V0cy5tYXAoYiA9PiB1cmxzW2tdW2JdIHx8IDApXG4gIH0pXG5cbiAgcmV0dXJuIGQzLmVudHJpZXMob2JqKVxuICAgIC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICB4LnVybCA9IHgua2V5XG4gICAgICB4LnRvdGFsID0gZDMuc3VtKHgudmFsdWUpXG4gICAgICByZXR1cm4geFxuICAgIH0pIFxufVxuXG5mdW5jdGlvbiBkcmF3VG9LZXl3b3JkKGRyYXcsc3BsaXQpIHtcbiAgbGV0IG9iaiA9IGRyYXdcbiAgICAucmVkdWNlKGZ1bmN0aW9uKHAsYyl7XG4gICAgICBjLmtleS50b0xvd2VyQ2FzZSgpLnNwbGl0KHNwbGl0KVsxXS5zcGxpdChcIi9cIikucmV2ZXJzZSgpWzBdLnJlcGxhY2UoXCJfXCIsXCItXCIpLnNwbGl0KFwiLVwiKS5tYXAoeCA9PiB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSBTVE9QV09SRFNcbiAgICAgICAgaWYgKHgubWF0Y2goL1xcZCsvZykgPT0gbnVsbCAmJiB2YWx1ZXMuaW5kZXhPZih4KSA9PSAtMSAmJiB4LmluZGV4T2YoXCIsXCIpID09IC0xICYmIHguaW5kZXhPZihcIj9cIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiLlwiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCI6XCIpID09IC0xICYmIHBhcnNlSW50KHgpICE9IHggJiYgeC5sZW5ndGggPiAzKSB7XG4gICAgICAgICAgcFt4XSA9IHBbeF0gfHwge31cbiAgICAgICAgICBPYmplY3Qua2V5cyhjLnZhbHVlKS5tYXAocSA9PiB7IHBbeF1bcV0gPSAocFt4XVtxXSB8fCAwKSArIChjLnZhbHVlW3FdIHx8IDApIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBwXG4gICAgfSx7fSkgXG5cbiAgcmV0dXJuIGQzLmVudHJpZXMob2JqKVxuICAgIC5tYXAoeCA9PiB7XG4gICAgICB4LnZhbHVlcyA9IE9iamVjdC5rZXlzKHgudmFsdWUpLm1hcCh6ID0+IHgudmFsdWVbel0gfHwgMClcbiAgICAgIHgudG90YWwgPSBkMy5zdW0oeC52YWx1ZXMpXG4gICAgICByZXR1cm4geFxuICAgIH0pXG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRvbWFpbl9leHBhbmRlZCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEb21haW5FeHBhbmRlZCh0YXJnZXQpXG59XG5cbmNsYXNzIERvbWFpbkV4cGFuZGVkIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJyYXdcIixcImRhdGFcIixcInVybHNcIixcImRvbWFpblwiXSB9XG5cbiAgZHJhdygpIHtcbiAgICBsZXQgdGQgPSB0aGlzLl90YXJnZXRcblxuICAgIGQzX2NsYXNzKHRkLFwiYWN0aW9uLWhlYWRlclwiKVxuICAgICAgLnRleHQoXCJFeHBsb3JlIGFuZCBSZWZpbmVcIilcblxuICAgIGxldCB1cmxEYXRhID0gcmF3VG9VcmwodGhpcy5yYXcoKSlcbiAgICBsZXQgdG9fZHJhdyA9IHVybFRvRHJhdyh1cmxEYXRhKVxuICAgIGxldCBrd190b19kcmF3ID0gZHJhd1RvS2V5d29yZCh0b19kcmF3LHRoaXMuZG9tYWluKCkpXG5cbiAgICB0YWJ1bGFyX3RpbWVzZXJpZXMoZDNfY2xhc3ModGQsXCJ1cmwtZGVwdGhcIikpXG4gICAgICAubGFiZWwoXCJVUkxcIilcbiAgICAgIC5kYXRhKHRvX2RyYXcpXG4gICAgICAuc3BsaXQodGhpcy5kb21haW4oKSlcbiAgICAgIC5kcmF3KClcblxuICAgIHRhYnVsYXJfdGltZXNlcmllcyhkM19jbGFzcyh0ZCxcImt3LWRlcHRoXCIpKVxuICAgICAgLmxhYmVsKFwiS2V5d29yZHNcIilcbiAgICAgIC5kYXRhKGt3X3RvX2RyYXcpXG4gICAgICAuZHJhdygpXG4gICAgICAgIFxuICB9XG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM19zcGxhdCwgZDNfdXBkYXRlYWJsZSwgYWNjZXNzb3IsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCAnLi92ZXJ0aWNhbF9vcHRpb24uY3NzJ1xuXG5cbmV4cG9ydCBmdW5jdGlvbiB2ZXJ0aWNhbF9vcHRpb24odGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVmVydGljYWxPcHRpb24odGFyZ2V0KVxufVxuXG4vL1t7a2V5LCB2YWx1ZSwgc2VsZWN0ZWR9LC4uLl1cblxuY2xhc3MgVmVydGljYWxPcHRpb24gZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb3B0aW9ucyA9IFtdXG4gICAgdGhpcy5fd3JhcHBlcl9jbGFzcyA9IFwidmVydGljYWwtb3B0aW9uc1wiXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcIm9wdGlvbnNcIixcIndyYXBwZXJfY2xhc3NcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgdmFyIG9wdHMgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsdGhpcy53cmFwcGVyX2NsYXNzKCksXCJkaXZcIix0aGlzLm9wdGlvbnMoKSlcbiAgICAgIFxuICAgICBkM19zcGxhdChvcHRzLFwiLnNob3ctYnV0dG9uXCIsXCJhXCIsdGhpcy5vcHRpb25zKCkseCA9PiB4LmtleSlcbiAgICAgIC5jbGFzc2VkKFwic2hvdy1idXR0b25cIix0cnVlKVxuICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLHggPT4geC5zZWxlY3RlZClcbiAgICAgIC50ZXh0KHggPT4geC5rZXkpXG4gICAgICAub24oXCJjbGlja1wiLHRoaXMub24oXCJjbGlja1wiKSApIFxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCAqIGFzIHRpbWVzZXJpZXMgZnJvbSAnLi4vZ2VuZXJpYy90aW1lc2VyaWVzJ1xuXG5pbXBvcnQgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQge2RvbWFpbl9leHBhbmRlZH0gZnJvbSAnY29tcG9uZW50J1xuaW1wb3J0IHtkb21haW5fYnVsbGV0fSBmcm9tICdjaGFydCdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cblxuZXhwb3J0IGZ1bmN0aW9uIERvbWFpblZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkb21haW5fdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEb21haW5WaWV3KHRhcmdldClcbn1cblxuRG9tYWluVmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBvcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwib3B0aW9uc1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdmFyIF9leHBsb3JlID0gdGhpcy50YXJnZXRcbiAgICAgICAgLCB0YWJzID0gdGhpcy5vcHRpb25zKClcbiAgICAgICAgLCBkYXRhID0gdGhpcy5kYXRhKClcbiAgICAgICAgLCBmaWx0ZXJlZCA9IHRhYnMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5zZWxlY3RlZH0pXG4gICAgICAgICwgc2VsZWN0ZWQgPSBmaWx0ZXJlZC5sZW5ndGggPyBmaWx0ZXJlZFswXSA6IHRhYnNbMF1cblxuICAgICAgaGVhZGVyKF9leHBsb3JlKVxuICAgICAgICAudGV4dChzZWxlY3RlZC5rZXkgKVxuICAgICAgICAub3B0aW9ucyh0YWJzKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCkgeyB0aGlzLm9uKFwic2VsZWN0XCIpKHgpIH0uYmluZCh0aGlzKSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICBcblxuICAgICAgX2V4cGxvcmUuc2VsZWN0QWxsKFwiLnZlbmRvci1kb21haW5zLWJhci1kZXNjXCIpLnJlbW92ZSgpXG4gICAgICBfZXhwbG9yZS5kYXR1bShkYXRhKVxuXG4gICAgICB2YXIgdCA9IHRhYmxlKF9leHBsb3JlKVxuICAgICAgICAudG9wKDE0MClcbiAgICAgICAgLmRhdGEoc2VsZWN0ZWQpXG5cblxuXG4gICAgICB2YXIgc2FtcF9tYXggPSBkMy5tYXgoc2VsZWN0ZWQudmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnNhbXBsZV9wZXJjZW50X25vcm19KVxuICAgICAgICAsIHBvcF9tYXggPSBkMy5tYXgoc2VsZWN0ZWQudmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnBvcF9wZXJjZW50fSlcbiAgICAgICAgLCBtYXggPSBNYXRoLm1heChzYW1wX21heCxwb3BfbWF4KTtcblxuICAgICAgdC5oZWFkZXJzKFtcbiAgICAgICAgICAgIHtrZXk6XCJrZXlcIix2YWx1ZTpcIkRvbWFpblwiLGxvY2tlZDp0cnVlLHdpZHRoOlwiMTAwcHhcIn1cbiAgICAgICAgICAsIHtrZXk6XCJzYW1wbGVfcGVyY2VudFwiLHZhbHVlOlwiU2VnbWVudFwiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAgICwge2tleTpcInJlYWxfcG9wX3BlcmNlbnRcIix2YWx1ZTpcIkJhc2VsaW5lXCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICAgLCB7a2V5OlwicmF0aW9cIix2YWx1ZTpcIlJhdGlvXCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICAgLCB7a2V5OlwiaW1wb3J0YW5jZVwiLHZhbHVlOlwiSW1wb3J0YW5jZVwiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAgICwge2tleTpcInZhbHVlXCIsdmFsdWU6XCJTZWdtZW50IHZlcnN1cyBCYXNlbGluZVwiLGxvY2tlZDp0cnVlfVxuICAgICAgICBdKVxuICAgICAgICAuc29ydChcImltcG9ydGFuY2VcIilcbiAgICAgICAgLm9wdGlvbl90ZXh0KFwiJiM2NTI5MTtcIilcbiAgICAgICAgLm9uKFwiZXhwYW5kXCIsZnVuY3Rpb24oZCx0ZCkge1xuXG4gICAgICAgICAgdmFyIGRkID0gdGhpcy5wYXJlbnRFbGVtZW50Ll9fZGF0YV9fLmZ1bGxfdXJscy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5kb21haW4gPT0gZC5rZXl9KVxuICAgICAgICAgIHZhciByb2xsZWQgPSB0aW1lc2VyaWVzLnByZXBEYXRhKGRkKVxuICAgICAgICAgIFxuICAgICAgICAgIGRvbWFpbl9leHBhbmRlZCh0ZClcbiAgICAgICAgICAgIC5kb21haW4oZGRbMF0uZG9tYWluKVxuICAgICAgICAgICAgLnJhdyhkZClcbiAgICAgICAgICAgIC5kYXRhKHJvbGxlZClcbiAgICAgICAgICAgIC51cmxzKGQudXJscylcbiAgICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgfSlcbiAgICAgICAgLmhpZGRlbl9maWVsZHMoW1widXJsc1wiLFwicGVyY2VudF91bmlxdWVcIixcInNhbXBsZV9wZXJjZW50X25vcm1cIixcInBvcF9wZXJjZW50XCIsXCJ0Zl9pZGZcIixcInBhcmVudF9jYXRlZ29yeV9uYW1lXCJdKVxuICAgICAgICAucmVuZGVyKFwicmF0aW9cIixmdW5jdGlvbihkKSB7XG4gICAgICAgICAgdGhpcy5pbm5lclRleHQgPSBNYXRoLnRydW5jKHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXy5yYXRpbyoxMDApLzEwMCArIFwieFwiXG4gICAgICAgIH0pXG4gICAgICAgIC5yZW5kZXIoXCJ2YWx1ZVwiLGZ1bmN0aW9uKGQpIHtcblxuICAgICAgICAgIGRvbWFpbl9idWxsZXQoZDMuc2VsZWN0KHRoaXMpKVxuICAgICAgICAgICAgLm1heChtYXgpXG4gICAgICAgICAgICAuZGF0YSh0aGlzLnBhcmVudE5vZGUuX19kYXRhX18pXG4gICAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICB0LmRyYXcoKVxuICAgICBcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXMsIHNpbXBsZUJhcn0gZnJvbSAnY2hhcnQnXG5cbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIFNlZ21lbnRWaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzZWdtZW50X3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU2VnbWVudFZpZXcodGFyZ2V0KVxufVxuXG5TZWdtZW50Vmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBzZWdtZW50czogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlZ21lbnRzXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5zZWdtZW50LXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNlZ21lbnQtd3JhcFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIix0aGlzLnRhcmdldC5zdHlsZShcIndpZHRoXCIpKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcbiAgICAgICAgLnN0eWxlKFwiei1pbmRleFwiLFwiMzAwXCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmMGY0ZjdcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLnNlZ21lbnQtd3JhcC1zcGFjZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNlZ21lbnQtd3JhcC1zcGFjZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIix3cmFwLnN0eWxlKFwiaGVpZ2h0XCIpKVxuXG5cbiAgICAgIGhlYWRlcih3cmFwKVxuICAgICAgICAuYnV0dG9ucyhbXG4gICAgICAgICAgICB7Y2xhc3M6IFwic2F2ZWQtc2VhcmNoXCIsIGljb246IFwiZmEtZm9sZGVyLW9wZW4tbyBmYVwiLCB0ZXh0OiBcIk9wZW4gU2F2ZWRcIn1cbiAgICAgICAgICAsIHtjbGFzczogXCJuZXctc2F2ZWQtc2VhcmNoXCIsIGljb246IFwiZmEtYm9va21hcmsgZmFcIiwgdGV4dDogXCJTYXZlXCJ9XG4gICAgICAgICAgLCB7Y2xhc3M6IFwiY3JlYXRlXCIsIGljb246IFwiZmEtcGx1cy1jaXJjbGUgZmFcIiwgdGV4dDogXCJOZXcgU2VnbWVudFwifVxuICAgICAgICAgICwge2NsYXNzOiBcImxvZ291dFwiLCBpY29uOiBcImZhLXNpZ24tb3V0IGZhXCIsIHRleHQ6IFwiTG9nb3V0XCJ9XG4gICAgICAgIF0pXG4gICAgICAgIC5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiLCB0aGlzLm9uKFwic2F2ZWQtc2VhcmNoLmNsaWNrXCIpKVxuICAgICAgICAub24oXCJsb2dvdXQuY2xpY2tcIiwgZnVuY3Rpb24oKSB7IHdpbmRvdy5sb2NhdGlvbiA9IFwiL2xvZ291dFwiIH0pXG4gICAgICAgIC5vbihcImNyZWF0ZS5jbGlja1wiLCBmdW5jdGlvbigpIHsgd2luZG93LmxvY2F0aW9uID0gXCIvc2VnbWVudHNcIiB9KVxuICAgICAgICAub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIsIHRoaXMub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIpKVxuICAgICAgICAudGV4dChcIlNlZ21lbnRcIikuZHJhdygpICAgICAgXG5cblxuICAgICAgd3JhcC5zZWxlY3RBbGwoXCIuaGVhZGVyLWJvZHlcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwhdGhpcy5faXNfbG9hZGluZylcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIi00MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIm5vbmVcIilcbiAgICAgICAgLmh0bWwoXCI8aW1nIHNyYz0nL3N0YXRpYy9pbWcvZ2VuZXJhbC9sb2dvLXNtYWxsLmdpZicgc3R5bGU9J2hlaWdodDoxNXB4Jy8+IGxvYWRpbmcuLi5cIilcblxuXG4gICAgICBpZiAodGhpcy5fZGF0YSA9PSBmYWxzZSkgcmV0dXJuXG5cbiAgICAgIHZhciBib2R5ID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmJvZHlcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJvZHlcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJjbGVhclwiLFwiYm90aFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcImZsZXgtZGlyZWN0aW9uXCIsXCJjb2x1bW5cIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMzBweFwiKVxuICAgICAgICBcblxuICAgICAgdmFyIHJvdzEgPSBkM191cGRhdGVhYmxlKGJvZHksXCIucm93LTFcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInJvdy0xXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLDEpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleC1kaXJlY3Rpb25cIixcInJvd1wiKVxuXG4gICAgICB2YXIgcm93MiA9IGQzX3VwZGF0ZWFibGUoYm9keSxcIi5yb3ctMlwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicm93LTJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsMSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4LWRpcmVjdGlvblwiLFwicm93XCIpXG5cblxuICAgICAgdmFyIGlubmVyID0gZDNfdXBkYXRlYWJsZShyb3cxLFwiLmFjdGlvbi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgYWN0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICB2YXIgaW5uZXJfZGVzYyA9IGQzX3VwZGF0ZWFibGUocm93MSxcIi5hY3Rpb24uaW5uZXItZGVzY1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXItZGVzYyBhY3Rpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMHB4XCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcixcImgzXCIsXCJoM1wiKVxuICAgICAgICAudGV4dChcIkNob29zZSBTZWdtZW50XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyLFwiZGl2LmNvbG9yXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb2xvclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiMwODFkNThcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG5cblxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgc2VsZWN0KGlubmVyKVxuICAgICAgICAub3B0aW9ucyh0aGlzLl9zZWdtZW50cylcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGYub24oXCJjaGFuZ2VcIikuYmluZCh0aGlzKSh4KVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fYWN0aW9uLnZhbHVlIHx8IDApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgXG5cblxuXG4gICAgICB2YXIgY2FsID0gZDNfdXBkYXRlYWJsZShpbm5lcixcImEuZmEtY2FsZW5kYXJcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgICAgLmNsYXNzZWQoXCJmYSBmYS1jYWxlbmRhclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjYWxzZWwubm9kZSgpXG4gICAgICAgIH0pXG5cbiAgICAgIFxuICAgICAgdmFyIGNhbHNlbCA9IHNlbGVjdChjYWwpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIlRvZGF5XCIsXCJ2YWx1ZVwiOjB9LHtcImtleVwiOlwiWWVzdGVyZGF5XCIsXCJ2YWx1ZVwiOjF9LHtcImtleVwiOlwiNyBkYXlzIGFnb1wiLFwidmFsdWVcIjo3fV0pXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIpLmJpbmQodGhpcykoeC52YWx1ZSlcbiAgICAgICAgfSlcbiAgICAgICAgLnNlbGVjdGVkKHRoaXMuX2FjdGlvbl9kYXRlIHx8IDApXG4gICAgICAgIC5kcmF3KClcbiAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIuMDFcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwibm9uZVwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIm5vbmVcIilcblxuICAgICAgXG5cbiAgICAgIHZhciBpbm5lcjIgPSBkM191cGRhdGVhYmxlKHJvdzIsXCIuY29tcGFyaXNvbi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgY29tcGFyaXNvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMHB4XCIpXG5cbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuXG4gICAgICB2YXIgaW5uZXJfZGVzYzIgPSBkM191cGRhdGVhYmxlKHJvdzIsXCIuY29tcGFyaXNvbi1kZXNjLmlubmVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJpbm5lciBjb21wYXJpc29uLWRlc2NcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcblxuICAgICAgLy9kM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCJoM1wiLFwiaDNcIilcbiAgICAgIC8vICAudGV4dChcIihGaWx0ZXJzIGFwcGxpZWQgdG8gdGhpcyBzZWdtZW50KVwiKVxuICAgICAgLy8gIC5zdHlsZShcIm1hcmdpblwiLFwiMTBweFwiKVxuICAgICAgLy8gIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC8vICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCIuYmFyLXdyYXAtdGl0bGVcIixcImgzXCIpLmNsYXNzZWQoXCJiYXItd3JhcC10aXRsZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG5cblxuICAgICAgICAudGV4dChcInZpZXdzXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCIuYmFyLXdyYXAtdGl0bGVcIixcImgzXCIpLmNsYXNzZWQoXCJiYXItd3JhcC10aXRsZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG5cblxuXG4gICAgICAgIC50ZXh0KFwidmlld3NcIilcblxuXG5cbiAgICAgIHZhciBiYXJfc2FtcCA9IGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcImRpdi5iYXItd3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiYmFyLXdyYXBcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiOHB4XCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcIi5iYXItd3JhcC1zcGFjZVwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1zcGFjZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnRleHQoZDMuZm9ybWF0KFwiLFwiKSh0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSkpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiLmJhci13cmFwLW9wdFwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1vcHRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLy8udGV4dChcImFwcGx5IGZpbHRlcnM/XCIpXG5cblxuXG4gICAgICB2YXIgeHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgLmRvbWFpbihbMCxNYXRoLm1heCh0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSwgdGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uKV0pXG4gICAgICAgIC5yYW5nZShbMCxiYXJfc2FtcC5zdHlsZShcIndpZHRoXCIpXSlcblxuXG4gICAgICB2YXIgYmFyX3BvcCA9IGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCJkaXYuYmFyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJhci13cmFwXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjhweFwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCIuYmFyLXdyYXAtc3BhY2VcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtc3BhY2VcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KGQzLmZvcm1hdChcIixcIikodGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uKSlcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLW9wdFwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1vcHRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG4gICAgICAgIC5odG1sKFwiYXBwbHkgZmlsdGVycz8gPGlucHV0IHR5cGU9J2NoZWNrYm94Jz48L2lucHV0PlwiKVxuXG5cblxuICAgICAgc2ltcGxlQmFyKGJhcl9zYW1wLHRoaXMuX2RhdGEudmlld3Muc2FtcGxlLHhzY2FsZSxcIiMwODFkNThcIilcbiAgICAgIHNpbXBsZUJhcihiYXJfcG9wLHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbix4c2NhbGUsXCJncmV5XCIpXG5cblxuXG5cblxuXG5cblxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcjIsXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnRleHQoXCJDb21wYXJlIEFnYWluc3RcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZTNlYmYwXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIyLFwiZGl2LmNvbG9yXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb2xvclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcImdyZXlcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG5cblxuXG5cblxuXG5cblxuICAgICAgc2VsZWN0KGlubmVyMilcbiAgICAgICAgLm9wdGlvbnMoW3tcImtleVwiOlwiQ3VycmVudCBTZWdtZW50ICh3aXRob3V0IGZpbHRlcnMpXCIsXCJ2YWx1ZVwiOmZhbHNlfV0uY29uY2F0KHRoaXMuX3NlZ21lbnRzKSApXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcblxuICAgICAgICAgIHNlbGYub24oXCJjb21wYXJpc29uLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9jb21wYXJpc29uLnZhbHVlIHx8IDApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgdmFyIGNhbDIgPSBkM191cGRhdGVhYmxlKGlubmVyMixcImEuZmEtY2FsZW5kYXJcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgICAgLmNsYXNzZWQoXCJmYSBmYS1jYWxlbmRhclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjYWxzZWwyLm5vZGUoKVxuICAgICAgICB9KVxuXG4gICAgICBcbiAgICAgIHZhciBjYWxzZWwyID0gc2VsZWN0KGNhbDIpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIlRvZGF5XCIsXCJ2YWx1ZVwiOjB9LHtcImtleVwiOlwiWWVzdGVyZGF5XCIsXCJ2YWx1ZVwiOjF9LHtcImtleVwiOlwiNyBkYXlzIGFnb1wiLFwidmFsdWVcIjo3fV0pXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgudmFsdWUpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9jb21wYXJpc29uX2RhdGUgfHwgMClcbiAgICAgICAgLmRyYXcoKVxuICAgICAgICAuX3NlbGVjdFxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIi4wMVwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCJub25lXCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwibm9uZVwiKVxuXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgYWN0aW9uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25fZGF0ZVwiLHZhbClcbiAgICB9XG4gICwgYWN0aW9uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uXCIsdmFsKVxuICAgIH1cbiAgLCBjb21wYXJpc29uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uX2RhdGVcIix2YWwpXG4gICAgfVxuXG4gICwgY29tcGFyaXNvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNvbXBhcmlzb25cIix2YWwpXG4gICAgfVxuICAsIGlzX2xvYWRpbmc6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJpc19sb2FkaW5nXCIsdmFsKVxuICAgIH1cblxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuXG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRpZmZfYmFyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IERpZmZCYXIodGFyZ2V0KVxufVxuXG4vLyBkYXRhIGZvcm1hdDogW3trZXksIG5vcm1hbGl6ZWRfZGlmZn0sIC4uLiBdXG5cbmNsYXNzIERpZmZCYXIge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcblxuICAgIHRoaXMuX2tleV9hY2Nlc3NvciA9IFwia2V5XCJcbiAgICB0aGlzLl92YWx1ZV9hY2Nlc3NvciA9IFwidmFsdWVcIlxuICAgIHRoaXMuX2Jhcl9oZWlnaHQgPSAyMFxuICAgIHRoaXMuX2Jhcl93aWR0aCA9IDE1MFxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgdmFsdWVfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cbiAgYmFyX2hlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfaGVpZ2h0XCIsdmFsKSB9XG4gIGJhcl93aWR0aCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfd2lkdGhcIix2YWwpIH1cblxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgdyA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLmRpZmYtd3JhcFwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7cmV0dXJuIDF9KVxuICAgICAgLmNsYXNzZWQoXCJkaWZmLXdyYXBcIix0cnVlKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh3LFwiaDNcIixcImgzXCIpLnRleHQodGhpcy5fdGl0bGUpXG5cbiAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodyxcIi5zdmctd3JhcFwiLFwiZGl2XCIsdGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiAxIH0pXG4gICAgICAuY2xhc3NlZChcInN2Zy13cmFwXCIsdHJ1ZSlcblxuICAgIHZhciBrID0gdGhpcy5rZXlfYWNjZXNzb3IoKVxuICAgICAgLCB2ID0gdGhpcy52YWx1ZV9hY2Nlc3NvcigpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuYmFyX2hlaWdodCgpXG4gICAgICAsIGJhcl93aWR0aCA9IHRoaXMuYmFyX3dpZHRoKClcblxuICAgIHZhciBrZXlzID0gdGhpcy5fZGF0YS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geFtrXSB9KVxuICAgICAgLCBtYXggPSBkMy5tYXgodGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiB4W3ZdIH0pXG4gICAgICAsIHNhbXBtYXggPSBkMy5tYXgodGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiAteFt2XSB9KVxuXG4gICAgdmFyIHhzYW1wc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsc2FtcG1heF0pXG4gICAgICAgICAgLnJhbmdlKFswLGJhcl93aWR0aF0pXG4gICAgICAsIHhzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgLmRvbWFpbihbMCxtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB5c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsa2V5cy5sZW5ndGhdKVxuICAgICAgICAgIC5yYW5nZShbMCxrZXlzLmxlbmd0aCpoZWlnaHRdKTtcblxuICAgIHZhciBjYW52YXMgPSBkM191cGRhdGVhYmxlKHdyYXAsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAuYXR0cih7XCJ3aWR0aFwiOmJhcl93aWR0aCozLCBcImhlaWdodFwiOiBrZXlzLmxlbmd0aCpoZWlnaHQgKyAxMH0pO1xuXG4gICAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB4QXhpc1xuICAgICAgLm9yaWVudCgnYm90dG9tJylcbiAgICAgIC5zY2FsZSh4c2NhbGUpXG5cbiAgICB2YXIgeUF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHlBeGlzXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5zY2FsZSh5c2NhbGUpXG4gICAgICAudGlja1NpemUoMilcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKGQsaSl7IHJldHVybiBrZXlzW2ldOyB9KVxuICAgICAgLnRpY2tWYWx1ZXMoZDMucmFuZ2Uoa2V5cy5sZW5ndGgpKTtcblxuICAgIHZhciB5X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnknLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInkgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoICsgYmFyX3dpZHRoLzIpICsgXCIsMTUpXCIpXG4gICAgICAuYXR0cignaWQnLCd5YXhpcycpXG4gICAgICAuY2FsbCh5QXhpcyk7XG5cbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJ0ZXh0LWFuY2hvcjogbWlkZGxlO1wiKVxuXG4gICAgXG4gICAgdmFyIGNoYXJ0ID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0XCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChiYXJfd2lkdGgqMikgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG4gICAgXG4gICAgdmFyIGJhcnMgPSBkM19zcGxhdChjaGFydCxcIi5wb3AtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtNClcbiAgICAgIC5hdHRyKHsneCc6MCwneSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHlzY2FsZShpKSArIDguNTsgfX0pXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCcjMzg4ZTNjJylcbiAgICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4c2NhbGUoeFt2XSkgfSlcblxuICAgIHZhciBjaGFydDIgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydDInLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0MlwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG5cblxuICAgIHZhciBzYW1wYmFycyA9IGQzX3NwbGF0KGNoYXJ0MixcIi5zYW1wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwic2FtcC1iYXJcIilcbiAgICAgIC5hdHRyKCdoZWlnaHQnLGhlaWdodC00KVxuICAgICAgLmF0dHIoeyd4JzpmdW5jdGlvbih4KSB7IHJldHVybiBiYXJfd2lkdGggLSB4c2FtcHNjYWxlKC14W3ZdKX0sJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA4LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnI2QzMmYyZicpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNhbXBzY2FsZSgteFt2XSkgfSlcblxuICAgIHlfeGlzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgY2hhcnQuZXhpdCgpLnJlbW92ZSgpXG4gICAgY2hhcnQyLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgYmFycy5leGl0KCkucmVtb3ZlKClcbiAgICBzYW1wYmFycy5leGl0KCkucmVtb3ZlKClcblxuXG4gICAgXG5cblxuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcF9iYXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQ29tcEJhcih0YXJnZXQpXG59XG5cbi8vIGRhdGEgZm9ybWF0OiBbe2tleSwgbm9ybWFsaXplZF9kaWZmfSwgLi4uIF1cblxuY2xhc3MgQ29tcEJhciB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuXG4gICAgdGhpcy5fa2V5X2FjY2Vzc29yID0gXCJrZXlcIlxuICAgIHRoaXMuX3BvcF92YWx1ZV9hY2Nlc3NvciA9IFwidmFsdWVcIlxuICAgIHRoaXMuX3NhbXBfdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcblxuICAgIHRoaXMuX2Jhcl9oZWlnaHQgPSAyMFxuICAgIHRoaXMuX2Jhcl93aWR0aCA9IDMwMFxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgcG9wX3ZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInBvcF92YWx1ZV9hY2Nlc3NvclwiLHZhbCkgfVxuICBzYW1wX3ZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNhbXBfdmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cblxuICBiYXJfaGVpZ2h0KHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJhcl9oZWlnaHRcIix2YWwpIH1cbiAgYmFyX3dpZHRoKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJhcl93aWR0aFwiLHZhbCkgfVxuXG5cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG4gIHRpdGxlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9IFxuXG5cbiAgZHJhdygpIHtcblxuICAgIHZhciB3ID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIuY29tcC13cmFwXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHtyZXR1cm4gMX0pXG4gICAgICAuY2xhc3NlZChcImNvbXAtd3JhcFwiLHRydWUpXG5cbiAgICBkM191cGRhdGVhYmxlKHcsXCJoM1wiLFwiaDNcIikudGV4dCh0aGlzLl90aXRsZSlcblxuICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh3LFwiLnN2Zy13cmFwXCIsXCJkaXZcIix0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDEgfSlcbiAgICAgIC5jbGFzc2VkKFwic3ZnLXdyYXBcIix0cnVlKVxuXG4gICAgdmFyIGsgPSB0aGlzLmtleV9hY2Nlc3NvcigpXG4gICAgICAsIHAgPSB0aGlzLnBvcF92YWx1ZV9hY2Nlc3NvcigpXG4gICAgICAsIHMgPSB0aGlzLnNhbXBfdmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmJhcl9oZWlnaHQoKVxuICAgICAgLCBiYXJfd2lkdGggPSB0aGlzLmJhcl93aWR0aCgpXG5cbiAgICB2YXIga2V5cyA9IHRoaXMuX2RhdGEubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhba10gfSlcbiAgICAgICwgbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFtwXSB9KVxuICAgICAgLCBzYW1wbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFtzXSB9KVxuXG4gICAgdmFyIHhzYW1wc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsc2FtcG1heF0pXG4gICAgICAgICAgLnJhbmdlKFswLGJhcl93aWR0aF0pXG4gICAgICAsIHhzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgLmRvbWFpbihbMCxtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB5c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsa2V5cy5sZW5ndGhdKVxuICAgICAgICAgIC5yYW5nZShbMCxrZXlzLmxlbmd0aCpoZWlnaHRdKTtcblxuICAgIHZhciBjYW52YXMgPSBkM191cGRhdGVhYmxlKHdyYXAsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAuYXR0cih7XCJ3aWR0aFwiOmJhcl93aWR0aCtiYXJfd2lkdGgvMiwgXCJoZWlnaHRcIjoga2V5cy5sZW5ndGgqaGVpZ2h0ICsgMTB9KTtcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ2JvdHRvbScpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4ga2V5c1tpXTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKGtleXMubGVuZ3RoKSk7XG5cbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aC8yKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuXG4gICAgXG4gICAgdmFyIGNoYXJ0ID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNoYXJ0XCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChiYXJfd2lkdGgvMikgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG4gICAgXG4gICAgdmFyIGJhcnMgPSBkM19zcGxhdChjaGFydCxcIi5wb3AtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtMilcbiAgICAgIC5hdHRyKHsneCc6MCwneSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHlzY2FsZShpKSArIDcuNTsgfX0pXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCdncmF5JylcbiAgICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4c2NhbGUoeFtwXSkgfSlcblxuXG4gICAgdmFyIHNhbXBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIuc2FtcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNhbXAtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtMTApXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyAxMS41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJyMwODFkNTgnKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzYW1wc2NhbGUoeFtzXSB8fCAwKSB9KVxuXG4gICAgeV94aXMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICBjaGFydC5leGl0KCkucmVtb3ZlKClcblxuICAgIGJhcnMuZXhpdCgpLnJlbW92ZSgpXG4gICAgc2FtcGJhcnMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQgZGlmZl9iYXIgZnJvbSAnLi4vLi4vZ2VuZXJpYy9kaWZmX2JhcidcbmltcG9ydCBjb21wX2JhciBmcm9tICcuLi8uLi9nZW5lcmljL2NvbXBfYmFyJ1xuXG5leHBvcnQgZnVuY3Rpb24gZHJhd0NhdGVnb3J5RGlmZih0YXJnZXQsZGF0YSkge1xuXG4gIGRpZmZfYmFyKHRhcmdldClcbiAgICAuZGF0YShkYXRhKVxuICAgIC50aXRsZShcIkNhdGVnb3J5IGluZGV4aW5nIHZlcnN1cyBjb21wXCIpXG4gICAgLnZhbHVlX2FjY2Vzc29yKFwibm9ybWFsaXplZF9kaWZmXCIpXG4gICAgLmRyYXcoKVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3Q2F0ZWdvcnkodGFyZ2V0LGRhdGEpIHtcblxuICBjb21wX2Jhcih0YXJnZXQpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAudGl0bGUoXCJDYXRlZ29yaWVzIHZpc2l0ZWQgZm9yIGZpbHRlcmVkIHZlcnN1cyBhbGwgdmlld3NcIilcbiAgICAucG9wX3ZhbHVlX2FjY2Vzc29yKFwicG9wXCIpXG4gICAgLnNhbXBfdmFsdWVfYWNjZXNzb3IoXCJzYW1wXCIpXG4gICAgLmRyYXcoKVxuXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBfYnViYmxlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IENvbXBCdWJibGUodGFyZ2V0KVxufVxuXG4vLyBkYXRhIGZvcm1hdDogW3trZXksIG5vcm1hbGl6ZWRfZGlmZn0sIC4uLiBdXG5cbmNsYXNzIENvbXBCdWJibGUge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcblxuICAgIHRoaXMuX2tleV9hY2Nlc3NvciA9IFwia2V5XCJcblxuICAgIHRoaXMuX2hlaWdodCA9IDIwXG4gICAgdGhpcy5fc3BhY2UgPSAxNFxuICAgIHRoaXMuX21pZGRsZSA9IDE4MFxuICAgIHRoaXMuX2xlZ2VuZF93aWR0aCA9IDgwXG5cbiAgICB0aGlzLl9idWNrZXRzID0gWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcbiAgICB0aGlzLl9yb3dzID0gW11cblxuXG4gIH0gXG5cbiAga2V5X2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImtleV9hY2Nlc3NvclwiLHZhbCkgfVxuICB2YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ2YWx1ZV9hY2Nlc3NvclwiLHZhbCkgfVxuXG4gIGhlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cbiAgc3BhY2UodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3BhY2VcIix2YWwpIH1cbiAgbWlkZGxlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm1pZGRsZVwiLHZhbCkgfVxuICBidWNrZXRzKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJ1Y2tldHNcIix2YWwpIH1cblxuICByb3dzKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInJvd3NcIix2YWwpIH1cbiAgYWZ0ZXIodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWZ0ZXJcIix2YWwpIH1cblxuXG5cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG4gIHRpdGxlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9IFxuXG4gIGJ1aWxkU2NhbGVzKCkge1xuXG4gICAgdmFyIHJvd3MgPSB0aGlzLnJvd3MoKVxuICAgICAgLCBidWNrZXRzID0gdGhpcy5idWNrZXRzKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5oZWlnaHQoKSwgc3BhY2UgPSB0aGlzLnNwYWNlKClcblxuICAgIHRoaXMuX3lzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFswLHJvd3MubGVuZ3RoXSlcbiAgICAgIC5yYW5nZShbMCxyb3dzLmxlbmd0aCpoZWlnaHRdKTtcblxuICAgIHRoaXMuX3hzY2FsZSA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgLmRvbWFpbihidWNrZXRzKVxuICAgICAgLnJhbmdlKGQzLnJhbmdlKDAsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSksKGhlaWdodCtzcGFjZSkpKTtcblxuICAgIHRoaXMuX3hzY2FsZXJldmVyc2UgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cy5yZXZlcnNlKCkpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCxidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSwoaGVpZ2h0K3NwYWNlKSkpO1xuXG4gICAgdGhpcy5fcnNjYWxlID0gZDMuc2NhbGUucG93KClcbiAgICAgIC5leHBvbmVudCgwLjUpXG4gICAgICAuZG9tYWluKFswLDFdKVxuICAgICAgLnJhbmdlKFsuMzUsMV0pXG4gICAgXG4gICAgdGhpcy5fb3NjYWxlID0gZDMuc2NhbGUucXVhbnRpemUoKVxuICAgICAgLmRvbWFpbihbLTEsMV0pXG4gICAgICAucmFuZ2UoWycjZjdmYmZmJywnI2RlZWJmNycsJyNjNmRiZWYnLCcjOWVjYWUxJywnIzZiYWVkNicsJyM0MjkyYzYnLCcjMjE3MWI1JywnIzA4NTE5YycsJyMwODMwNmInXSlcbiAgICBcbiAgfVxuXG4gIGRyYXdMZWdlbmQoKSB7XG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1xuICAgICAgLCBidWNrZXRzID0gdGhpcy5idWNrZXRzKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5oZWlnaHQoKSwgc3BhY2UgPSB0aGlzLnNwYWNlKCksIG1pZGRsZSA9IHRoaXMubWlkZGxlKCksIGxlZ2VuZHR3ID0gdGhpcy5fbGVnZW5kX3dpZHRoXG4gICAgICAsIHJzY2FsZSA9IHRoaXMuX3JzY2FsZSwgb3NjYWxlID0gdGhpcy5fb3NjYWxlO1xuXG4gICAgdmFyIGxlZ2VuZCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmxlZ2VuZCcsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVnZW5kXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKFwiICsgKGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpKjIrbWlkZGxlLTMxMCkgKyBcIiwtMTMwKVwiKVxuXG4gICAgdmFyIHNpemUgPSBkM191cGRhdGVhYmxlKGxlZ2VuZCwnZy5zaXplJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJzaXplXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKFwiICsgKGxlZ2VuZHR3KzEwKSArIFwiLDApXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lm1vcmVcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1vcmUgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsLWxlZ2VuZHR3KVxuICAgICAgLmh0bWwoXCJtb3JlIGFjdGl2aXR5XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIikgXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dy0xMClcbiAgICAgIC5odG1sKFwiJiM5NjY0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpIFxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuN2VtXCIpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cblxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5sZXNzXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZXNzIGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLChoZWlnaHQrNCkqNStsZWdlbmR0dylcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC5odG1sKFwibGVzcyBhY3Rpdml0eVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG5cbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3MtYXJyb3dcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MtYXJyb3cgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KzEwKVxuICAgICAgLmh0bWwoXCImIzk2NTQ7XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKSBcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cblxuICAgIGQzX3NwbGF0KHNpemUsXCJjaXJjbGVcIixcImNpcmNsZVwiLFsxLC42LC4zLC4xLDBdKVxuICAgICAgLmF0dHIoXCJyXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gKGhlaWdodC0yKS8yKnJzY2FsZSh4KSB9KVxuICAgICAgLmF0dHIoJ2N4JywgZnVuY3Rpb24oZCxpKSB7IHJldHVybiAoaGVpZ2h0KzQpKmkraGVpZ2h0LzJ9KVxuICAgICAgLmF0dHIoJ3N0cm9rZScsICdncmV5JylcbiAgICAgIC5hdHRyKCdmaWxsJywgJ25vbmUnKVxuXG5cbiAgICBcblxuXG4gICAgdmFyIHNpemUgPSBkM191cGRhdGVhYmxlKGxlZ2VuZCwnZy5pbXBvcnRhbmNlJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJpbXBvcnRhbmNlXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKFwiKyAobGVnZW5kdHcrMTApICtcIiwyNSlcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZVwiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZSBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHcpXG4gICAgICAuaHRtbChcIm1vcmUgaW1wb3J0YW50XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lm1vcmUtYXJyb3dcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1vcmUtYXJyb3cgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsLWxlZ2VuZHR3LTEwKVxuICAgICAgLmh0bWwoXCImIzk2NjQ7XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKSBcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cblxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5sZXNzXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZXNzIGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLChoZWlnaHQrNCkqNStsZWdlbmR0dylcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC5odG1sKFwibGVzcyBpbXBvcnRhbnRcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzcy1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcy1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcrMTApXG4gICAgICAuaHRtbChcIiYjOTY1NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuN2VtXCIpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cbiAgICBkM19zcGxhdChzaXplLFwiY2lyY2xlXCIsXCJjaXJjbGVcIixbMSwuNzUsLjUsLjI1LDBdKVxuICAgICAgLmF0dHIoXCJyXCIsaGVpZ2h0LzItMilcbiAgICAgIC5hdHRyKFwiZmlsbFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG9zY2FsZSh4KSB9KVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gcnNjYWxlKHgvMiArIC4yKSB9KVxuICAgICAgLmF0dHIoJ2N4JywgZnVuY3Rpb24oZCxpKSB7IHJldHVybiAoaGVpZ2h0KzQpKmkraGVpZ2h0LzIgfSlcbiBcbiAgfVxuXG4gIGRyYXdBeGVzKCkge1xuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNcbiAgICAgICwgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpLCBtaWRkbGUgPSB0aGlzLm1pZGRsZSgpLCBsZWdlbmR0dyA9IHRoaXMuX2xlZ2VuZF93aWR0aFxuICAgICAgLCByc2NhbGUgPSB0aGlzLl9yc2NhbGUsIG9zY2FsZSA9IHRoaXMuX29zY2FsZSBcbiAgICAgICwgeHNjYWxlID0gdGhpcy5feHNjYWxlLCB5c2NhbGUgPSB0aGlzLl95c2NhbGVcbiAgICAgICwgeHNjYWxlcmV2ZXJzZSA9IHRoaXMuX3hzY2FsZXJldmVyc2VcbiAgICAgICwgcm93cyA9IHRoaXMuX3Jvd3NcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgICAuc2NhbGUoeHNjYWxlcmV2ZXJzZSlcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIGlmICh4ID09IDM2MDApIHJldHVybiBcIjEgaG91clwiXG4gICAgICAgIGlmICh4IDwgMzYwMCkgcmV0dXJuIHgvNjAgKyBcIiBtaW5zXCIgXG5cbiAgICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgICAgaWYgKHggPiA4NjQwMCkgcmV0dXJuIHgvODY0MDAgKyBcIiBkYXlzXCIgXG5cbiAgICAgICAgcmV0dXJuIHgvMzYwMCArIFwiIGhvdXJzXCJcbiAgICAgIH0pXG5cbiAgICB2YXIgeF94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy54LmJlZm9yZScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieCBheGlzIGJlZm9yZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoaGVpZ2h0ICsgc3BhY2UpKyBcIiwtNClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3hheGlzJylcbiAgICAgIC5jYWxsKHhBeGlzKTtcblxuICAgICAgICAgIFxuICAgIHhfeGlzLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAgIC5hdHRyKFwieVwiLCAtOClcbiAgICAgIC5hdHRyKFwieFwiLCAtOClcbiAgICAgIC5hdHRyKFwiZHlcIiwgXCIuMzVlbVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoNDUpXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcImVuZFwiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwibGluZVwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrXCIpXG5cbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJwYXRoXCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2s7IGRpc3BsYXk6aW5oZXJpdFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh4X3hpcyxcInRleHQudGl0bGVcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInRpdGxlXCIpXG4gICAgICAuYXR0cihcInhcIixidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKS8yIC0gaGVpZ2h0K3NwYWNlIClcbiAgICAgIC5hdHRyKFwieVwiLC01MylcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsdW5kZWZpbmVkKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsIFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAgIC50ZXh0KFwiYmVmb3JlIGFycml2aW5nXCIpXG5cblxuXG4gICAgdmFyIHhBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB4QXhpc1xuICAgICAgLm9yaWVudCgndG9wJylcbiAgICAgIC5zY2FsZSh4c2NhbGUpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbih4KSB7IFxuICAgICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgICBpZiAoeCA8IDM2MDApIHJldHVybiB4LzYwICsgXCIgbWluc1wiIFxuXG4gICAgICAgIGlmICh4ID09IDg2NDAwKSByZXR1cm4gXCIxIGRheVwiXG4gICAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICAgIHJldHVybiB4LzM2MDAgKyBcIiBob3Vyc1wiXG4gICAgICB9KVxuXG4gICAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueC5hZnRlcicsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieCBheGlzIGFmdGVyXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSttaWRkbGUpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3hheGlzJylcbiAgICAgIC5jYWxsKHhBeGlzKTtcbiAgICBcbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInlcIiwgLTgpXG4gICAgICAuYXR0cihcInhcIiwgOClcbiAgICAgIC5hdHRyKFwiZHlcIiwgXCIuMzVlbVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoLTQ1KVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJzdGFydFwiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwibGluZVwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrXCIpXG5cbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJwYXRoXCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2s7IGRpc3BsYXk6aW5oZXJpdFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh4X3hpcyxcInRleHQudGl0bGVcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInRpdGxlXCIpXG4gICAgICAuYXR0cihcInhcIixidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKS8yICApXG4gICAgICAuYXR0cihcInlcIiwtNTMpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLHVuZGVmaW5lZClcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLCBcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXG4gICAgICAudGV4dChcImFmdGVyIGxlYXZpbmdcIilcblxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4gcm93c1tpXS5rZXk7IH0pXG4gICAgICAudGlja1ZhbHVlcyhkMy5yYW5nZShyb3dzLmxlbmd0aCkpO1xuXG5cbiAgICBcbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpKzApICsgXCIsMTUpXCIpXG4gICAgICAuYXR0cignaWQnLCd5YXhpcycpXG5cblxuICAgIHlfeGlzXG4gICAgICAuY2FsbCh5QXhpcyk7XG5cbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgICAuYXR0cihcIngyXCIsMTgpXG4gICAgICAuYXR0cihcIngxXCIsMjIpXG4gICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsXCIwXCIpXG4gICAgICAucmVtb3ZlKClcblxuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJ4MlwiLDE4KVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgxOCwwKVwiKSBcbiAgICAgIC8vLnN0eWxlKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuXG5cblxuICAgICAgLy8ucmVtb3ZlKClcblxuICAgIFxuICAgIHlfeGlzLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInRleHQtYW5jaG9yOiBtaWRkbGU7IGZvbnQtd2VpZ2h0OmJvbGQ7IGZpbGw6ICMzMzNcIilcbiAgICAgIC5hdHRyKFwieFwiLG1pZGRsZS8yKVxuXG5cblxuXG4gIH1cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKSwgbWlkZGxlID0gdGhpcy5taWRkbGUoKSwgbGVnZW5kdHcgPSB0aGlzLl9sZWdlbmRfd2lkdGhcbiAgICAgICwgcm93cyA9IHRoaXMucm93cygpXG5cbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMTBweFwiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuICAgICAgLmF0dHIoeyd3aWR0aCc6YnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkqMittaWRkbGUsJ2hlaWdodCc6cm93cy5sZW5ndGgqaGVpZ2h0ICsgMTY1fSlcbiAgICAgIC5hdHRyKFwieG1sbnNcIiwgXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiKVxuXG4gICAgdGhpcy5fc3ZnID0gc3ZnXG5cbiAgICB0aGlzLl9jYW52YXMgPSBkM191cGRhdGVhYmxlKHN2ZyxcIi5jYW52YXNcIixcImdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImNhbnZhc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwxNDApXCIpXG5cblxuXG4gICAgdGhpcy5idWlsZFNjYWxlcygpXG4gICAgdGhpcy5kcmF3TGVnZW5kKClcbiAgICB0aGlzLmRyYXdBeGVzKClcblxuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNcbiAgICAgICwgcnNjYWxlID0gdGhpcy5fcnNjYWxlLCBvc2NhbGUgPSB0aGlzLl9vc2NhbGUgXG4gICAgICAsIHhzY2FsZSA9IHRoaXMuX3hzY2FsZSwgeXNjYWxlID0gdGhpcy5feXNjYWxlXG4gICAgICAsIHhzY2FsZXJldmVyc2UgPSB0aGlzLl94c2NhbGVyZXZlcnNlXG4gICAgICAsIHJvd3MgPSB0aGlzLnJvd3MoKVxuXG5cbiAgICB2YXIgY2hhcnRfYmVmb3JlID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQtYmVmb3JlJywnZycsdGhpcy5yb3dzKCksZnVuY3Rpb24oKSB7IHJldHVybiAxIH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydC1iZWZvcmVcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG5cblxuICAgIHZhciByb3dzID0gZDNfc3BsYXQoY2hhcnRfYmVmb3JlLFwiLnJvd1wiLFwiZ1wiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInJvd1wiKVxuICAgICAgLmF0dHIoeyd0cmFuc2Zvcm0nOmZ1bmN0aW9uKGQsaSl7IHJldHVybiBcInRyYW5zbGF0ZSgwLFwiICsgKHlzY2FsZShpKSArIDcuNSkgKyBcIilcIjsgfSB9KVxuICAgICAgLmF0dHIoeydsYWJlbCc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIGQua2V5OyB9IH0pXG5cbiAgICByb3dzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIGJhcnMgPSBkM19zcGxhdChyb3dzLFwiLnBvcC1iYXJcIixcImNpcmNsZVwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWVzIH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgICAuYXR0cignY3knLChoZWlnaHQtMikvMilcbiAgICAgIC5hdHRyKHsnY3gnOmZ1bmN0aW9uKGQsaSkgeyByZXR1cm4gLXhzY2FsZShkLmtleSl9fSlcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLFwiLjhcIilcbiAgICAgIC5hdHRyKFwiclwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIChoZWlnaHQpLzIgKiByc2NhbGUoeC5ub3JtX3RpbWUpIH0pIFxuICAgICAgLnN0eWxlKFwiZmlsbFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG9zY2FsZSh4LnBlcmNlbnRfZGlmZikgfSlcblxuICAgIHZhciBjaGFydF9hZnRlciA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0LWFmdGVyJywnZycsdGhpcy5fYWZ0ZXIsZnVuY3Rpb24oKSB7IHJldHVybiAxIH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydC1hZnRlclwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkrbWlkZGxlKSArIFwiLDApXCIpXG4gICAgICAuYXR0cignaWQnLCdiYXJzJylcblxuXG4gICAgdmFyIHJvd3MgPSBkM19zcGxhdChjaGFydF9hZnRlcixcIi5yb3dcIixcImdcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJyb3dcIilcbiAgICAgIC5hdHRyKHsndHJhbnNmb3JtJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gXCJ0cmFuc2xhdGUoMCxcIiArICh5c2NhbGUoaSkgKyA3LjUpICsgXCIpXCI7IH0gfSlcbiAgICAgIC5hdHRyKHsnbGFiZWwnOmZ1bmN0aW9uKGQsaSl7IHJldHVybiBkLmtleTsgfSB9KVxuXG4gICAgcm93cy5leGl0KCkucmVtb3ZlKClcblxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQocm93cyxcIi5wb3AtYmFyXCIsXCJjaXJjbGVcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlcyB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2N5JywoaGVpZ2h0LTIpLzIpXG4gICAgICAuYXR0cih7J2N4JzpmdW5jdGlvbihkLGkpIHsgcmV0dXJuIHhzY2FsZShkLmtleSl9fSlcbiAgICAgIC5hdHRyKFwiclwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIChoZWlnaHQtMikvMiAqIHJzY2FsZSh4Lm5vcm1fdGltZSkgfSlcbiAgICAgIC5zdHlsZShcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBvc2NhbGUoeC5wZXJjZW50X2RpZmYpIH0pXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIixcIi44XCIpXG5cblxuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3RyZWFtX3Bsb3QodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU3RyZWFtUGxvdCh0YXJnZXQpXG59XG5cbmZ1bmN0aW9uIGRyYXdBeGlzKHRhcmdldCxzY2FsZSx0ZXh0LHdpZHRoKSB7XG4gIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gIHhBeGlzXG4gICAgLm9yaWVudCgndG9wJylcbiAgICAuc2NhbGUoc2NhbGUpXG4gICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oeCkgeyBcbiAgICAgIGlmICh4ID09IDM2MDApIHJldHVybiBcIjEgaG91clwiXG4gICAgICBpZiAoeCA8IDM2MDApIHJldHVybiB4LzYwICsgXCIgbWluc1wiIFxuXG4gICAgICBpZiAoeCA9PSA4NjQwMCkgcmV0dXJuIFwiMSBkYXlcIlxuICAgICAgaWYgKHggPiA4NjQwMCkgcmV0dXJuIHgvODY0MDAgKyBcIiBkYXlzXCIgXG5cbiAgICAgIHJldHVybiB4LzM2MDAgKyBcIiBob3Vyc1wiXG4gICAgfSlcblxuICB2YXIgeF94aXMgPSBkM191cGRhdGVhYmxlKHRhcmdldCwnZy54LmJlZm9yZScsJ2cnKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcInggYXhpcyBiZWZvcmVcIilcbiAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLC01KVwiKVxuICAgIC5hdHRyKCdpZCcsJ3hheGlzJylcbiAgICAuY2FsbCh4QXhpcyk7XG5cbiAgICAgICAgXG4gIHhfeGlzLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAuYXR0cihcInlcIiwgLTI1KVxuICAgIC5hdHRyKFwieFwiLCAxNSlcbiAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSg0NSlcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcImVuZFwiKVxuXG4gIHhfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAuYXR0cihcInN0eWxlXCIsXCJzdHJva2U6YmxhY2tcIilcblxuICB4X3hpcy5zZWxlY3RBbGwoXCJwYXRoXCIpXG4gICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrOyBkaXNwbGF5OmluaGVyaXRcIilcblxuICBkM191cGRhdGVhYmxlKHhfeGlzLFwidGV4dC50aXRsZVwiLFwidGV4dFwiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcInRpdGxlXCIpXG4gICAgLmF0dHIoXCJ4XCIsd2lkdGgvMilcbiAgICAuYXR0cihcInlcIiwtNDYpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIix1bmRlZmluZWQpXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLCBcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgIC50ZXh0KHRleHQgKyBcIiBcIilcblxuICByZXR1cm4geF94aXNcblxufVxuXG5cbmNsYXNzIFN0cmVhbVBsb3Qge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vbiA9IHt9XG4gICAgdGhpcy5fYnVja2V0cyA9IFswLDEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcblxuICAgIHRoaXMuX3dpZHRoID0gMzcwXG4gICAgdGhpcy5faGVpZ2h0ID0gMjUwXG4gICAgdGhpcy5fY29sb3IgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5yYW5nZShcblsnIzk5OScsJyNhYWEnLCcjYmJiJywnI2NjYycsJyNkZGQnLCcjZGVlYmY3JywnI2M2ZGJlZicsJyM5ZWNhZTEnLCcjNmJhZWQ2JywnIzQyOTJjNicsJyMyMTcxYjUnLCdyZ2JhKDMzLCAxMTMsIDE4MSwuOSknLCdyZ2JhKDgsIDgxLCAxNTYsLjkxKScsJyMwODUxOWMnLCdyZ2JhKDgsIDQ4LCAxMDcsLjkpJywnIzA4MzA2YiddLnJldmVyc2UoKSlcblxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgdmFsdWVfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cbiAgaGVpZ2h0KHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhlaWdodFwiLHZhbCkgfVxuICB3aWR0aCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ3aWR0aFwiLHZhbCkgfVxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGFcbiAgICAgICwgb3JkZXIgPSBkYXRhLm9yZGVyXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLl9idWNrZXRzXG4gICAgICAsIGJlZm9yZV9zdGFja2VkID0gZGF0YS5iZWZvcmVfc3RhY2tlZFxuICAgICAgLCBhZnRlcl9zdGFja2VkID0gZGF0YS5hZnRlcl9zdGFja2VkXG4gICAgICAsIGhlaWdodCA9IHRoaXMuX2hlaWdodFxuICAgICAgLCB3aWR0aCA9IHRoaXMuX3dpZHRoXG4gICAgICAsIHRhcmdldCA9IHRoaXMuX3RhcmdldFxuICAgICAgLCBjb2xvciA9IHRoaXMuX2NvbG9yXG4gICAgICAsIHNlbGYgPSB0aGlzXG5cbiAgICBjb2xvci5kb21haW4ob3JkZXIpXG5cbiAgICB2YXIgeSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAucmFuZ2UoW2hlaWdodCwwXSlcbiAgICAgIC5kb21haW4oWzAsZDMubWF4KGJlZm9yZV9zdGFja2VkLCBmdW5jdGlvbihsYXllcikgeyByZXR1cm4gZDMubWF4KGxheWVyLGZ1bmN0aW9uKGQpIHtyZXR1cm4gZC55MCArIGQueSB9KX0pXSlcbiAgXG4gICAgdmFyIHggPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cylcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLHdpZHRoLHdpZHRoLyhidWNrZXRzLmxlbmd0aC0xKSkpXG4gIFxuICAgIHZhciB4cmV2ZXJzZSA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgLmRvbWFpbihidWNrZXRzLnNsaWNlKCkucmV2ZXJzZSgpKVxuICAgICAgLnJhbmdlKGQzLnJhbmdlKDAsd2lkdGgrMTAsd2lkdGgvKGJ1Y2tldHMubGVuZ3RoLTEpKSlcblxuICAgIHRoaXMuX2JlZm9yZV9zY2FsZSA9IHhyZXZlcnNlXG4gICAgdGhpcy5fYWZ0ZXJfc2NhbGUgPSB4XG4gIFxuICAgIHZhciBiYXJlYSA9IGQzLnN2Zy5hcmVhKClcbiAgICAgIC5pbnRlcnBvbGF0ZShcInplcm9cIilcbiAgICAgIC54KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHhyZXZlcnNlKGQueCk7IH0pXG4gICAgICAueTAoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwKTsgfSlcbiAgICAgIC55MShmdW5jdGlvbihkKSB7IHJldHVybiB5KGQueTAgKyBkLnkpOyB9KTtcbiAgXG4gICAgdmFyIGFhcmVhID0gZDMuc3ZnLmFyZWEoKVxuICAgICAgLmludGVycG9sYXRlKFwibGluZWFyXCIpXG4gICAgICAueChmdW5jdGlvbihkKSB7IHJldHVybiB4KGQueCk7IH0pXG4gICAgICAueTAoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwKTsgfSlcbiAgICAgIC55MShmdW5jdGlvbihkKSB7IHJldHVybiB5KGQueTAgKyBkLnkpOyB9KTtcbiAgXG4gIFxuICAgIHZhciBzdmcgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcInN2Z1wiLFwic3ZnXCIpXG4gICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKjIrMTgwKVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0ICsgMTAwKTtcblxuICAgIHRoaXMuX3N2ZyA9IHN2Z1xuICBcbiAgICB2YXIgYmVmb3JlID0gZDNfdXBkYXRlYWJsZShzdmcsXCIuYmVmb3JlLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiYmVmb3JlLWNhbnZhc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCw2MClcIilcblxuICAgIGZ1bmN0aW9uIGhvdmVyQ2F0ZWdvcnkoY2F0LHRpbWUpIHtcbiAgICAgIGFwYXRocy5zdHlsZShcIm9wYWNpdHlcIixcIi41XCIpXG4gICAgICBicGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsXCIuNVwiKVxuICAgICAgYXBhdGhzLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IGNhdCkuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuICAgICAgYnBhdGhzLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IGNhdCkuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuICAgICAgZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcblxuICAgICAgZDNfdXBkYXRlYWJsZShtaWRkbGUsXCJ0ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzMzM1wiKVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIuNjVcIilcbiAgICAgICAgLnRleHQoY2F0KVxuXG4gICAgICB2YXIgbXdyYXAgPSBkM191cGRhdGVhYmxlKG1pZGRsZSxcImdcIixcImdcIilcblxuICAgICAgc2VsZi5vbihcImNhdGVnb3J5LmhvdmVyXCIpLmJpbmQobXdyYXAubm9kZSgpKShjYXQsdGltZSlcbiAgICB9XG4gIFxuICAgIHZhciBiID0gZDNfdXBkYXRlYWJsZShiZWZvcmUsXCJnXCIsXCJnXCIpXG5cbiAgICB2YXIgYnBhdGhzID0gZDNfc3BsYXQoYixcInBhdGhcIixcInBhdGhcIiwgYmVmb3JlX3N0YWNrZWQsZnVuY3Rpb24oeCxpKSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuYXR0cihcImRcIiwgYmFyZWEpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbMF0ua2V5fSlcbiAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBjb2xvcih4WzBdLmtleSk7IH0pXG4gICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIHZhciBkZCA9IGQzLmV2ZW50XG4gICAgICAgIHZhciBwb3MgPSBwYXJzZUludChkZC5vZmZzZXRYLyh3aWR0aC9idWNrZXRzLmxlbmd0aCkpXG4gICAgICAgIFxuICAgICAgICBob3ZlckNhdGVnb3J5LmJpbmQodGhpcykoeFswXS5rZXksYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKVtwb3NdKVxuICAgICAgfSlcbiAgICAgIC5vbihcIm1vdXNlb3V0XCIsZnVuY3Rpb24oeCkge1xuICAgICAgICBhcGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuICAgICAgICBicGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsdW5kZWZpbmVkKVxuICAgICAgfSlcblxuICAgIGJwYXRocy5leGl0KCkucmVtb3ZlKClcblxuICAgIHZhciBicmVjdCA9IGQzX3NwbGF0KGIsXCJyZWN0XCIsXCJyZWN0XCIsYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKSwoeCxpKSA9PiBpKVxuICAgICAgLmF0dHIoXCJ4XCIseiA9PiB4cmV2ZXJzZSh6KSlcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIixoZWlnaHQpXG4gICAgICAuYXR0cihcInlcIiwwKVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsXCIwXCIpXG5cblxuXG4gICAgICBcblxuICAgIHZhciBtaWRkbGUgPSBkM191cGRhdGVhYmxlKHN2ZyxcIi5taWRkbGUtY2FudmFzXCIsXCJnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtaWRkbGUtY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKFwiICsgKHdpZHRoICsgMTgwLzIpICsgXCIsNjApXCIpXG4gIFxuICBcbiAgXG4gICAgdmFyIGFmdGVyID0gZDNfdXBkYXRlYWJsZShzdmcsXCIuYWZ0ZXItY2FudmFzXCIsXCJnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJhZnRlci1jYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKHdpZHRoICsgMTgwKSArIFwiLDYwKVwiKVxuXG4gICAgdmFyIGEgPSBkM191cGRhdGVhYmxlKGFmdGVyLFwiZ1wiLFwiZ1wiKVxuXG4gIFxuICAgIHZhciBhcGF0aHMgPSBkM19zcGxhdChhLFwicGF0aFwiLFwicGF0aFwiLGFmdGVyX3N0YWNrZWQsZnVuY3Rpb24oeCxpKSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuYXR0cihcImRcIiwgYWFyZWEpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbMF0ua2V5fSlcbiAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBjb2xvcih4WzBdLmtleSk7IH0pXG4gICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIGhvdmVyQ2F0ZWdvcnkuYmluZCh0aGlzKSh4WzBdLmtleSlcbiAgICAgIH0pXG4gICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgYXBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIH0pXG5cbiAgICBhcGF0aHMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgX3hfeGlzID0gZHJhd0F4aXMoYmVmb3JlLHhyZXZlcnNlLFwiYmVmb3JlIGFycml2aW5nXCIsd2lkdGgpXG5cbiAgICBfeF94aXMuc2VsZWN0QWxsKFwidGV4dFwiKS5maWx0ZXIoZnVuY3Rpb24oeSl7IHJldHVybiB5ID09IDAgfSkucmVtb3ZlKClcblxuICAgIHZhciBfeF94aXMgPSBkcmF3QXhpcyhhZnRlcix4LFwiYWZ0ZXIgbGVhdmluZ1wiLHdpZHRoKVxuXG4gICAgX3hfeGlzLnNlbGVjdEFsbChcInRleHQ6bm90KC50aXRsZSlcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKC00NSlcIilcbiAgICAgIC5hdHRyKFwieFwiLDIwKVxuICAgICAgLmF0dHIoXCJ5XCIsLTI1KVxuXG4gICAgX3hfeGlzLnNlbGVjdEFsbChcInRleHRcIikuZmlsdGVyKGZ1bmN0aW9uKHkpeyByZXR1cm4geSA9PSAwIH0pLnJlbW92ZSgpXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgb24oYWN0aW9uLGZuKSB7XG4gICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cbiIsImltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnY2hhcnQnXG5pbXBvcnQge2QzX2NsYXNzLCBkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcblxuaW1wb3J0IGNvbXBfYnViYmxlIGZyb20gJy4uLy4uL2dlbmVyaWMvY29tcF9idWJibGUnXG5pbXBvcnQgc3RyZWFtX3Bsb3QgZnJvbSAnLi4vLi4vZ2VuZXJpYy9zdHJlYW1fcGxvdCdcblxuZnVuY3Rpb24gYnVpbGRTdHJlYW1EYXRhKGRhdGEsYnVja2V0cykge1xuXG4gIHZhciB1bml0c19pbl9idWNrZXQgPSBidWNrZXRzLm1hcChmdW5jdGlvbih4LGkpIHsgcmV0dXJuIHggLSAoeFtpLTFdfHwgMCkgfSlcblxuICB2YXIgc3RhY2thYmxlID0gZGF0YS5tYXAoZnVuY3Rpb24oZCkge1xuICAgIHZhciB2YWx1ZW1hcCA9IGQudmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjLnZhbHVlczsgcmV0dXJuIHAgfSx7fSlcbiAgICB2YXIgcGVyY21hcCA9IGQudmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjLnBlcmNlbnQ7IHJldHVybiBwIH0se30pXG5cbiAgICB2YXIgdm1hcCA9IGQudmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjLm5vcm1fY2F0OyByZXR1cm4gcCB9LHt9KVxuXG5cbiAgICB2YXIgbm9ybWFsaXplZF92YWx1ZXMgPSBidWNrZXRzLm1hcChmdW5jdGlvbih4LGkpIHtcbiAgICAgIGlmICh4ID09IDApIHJldHVybiB7a2V5OiBkLmtleSwgeDogcGFyc2VJbnQoeCksIHk6ICh2bWFwW1wiNjAwXCJdfHwwKSwgdmFsdWVzOiAodmFsdWVtYXBbXCI2MDBcIl18fDApLCBwZXJjZW50OiAocGVyY21hcFtcIjYwMFwiXXx8MCl9XG4gICAgICByZXR1cm4geyBrZXk6IGQua2V5LCB4OiBwYXJzZUludCh4KSwgeTogKHZtYXBbeF0gfHwgMCksIHZhbHVlczogKHZhbHVlbWFwW3hdIHx8IDApLCBwZXJjZW50OiAocGVyY21hcFt4XSB8fCAwKSB9XG4gICAgfSlcblxuXG4gICAgcmV0dXJuIG5vcm1hbGl6ZWRfdmFsdWVzXG4gICAgLy9yZXR1cm4gZTIuY29uY2F0KG5vcm1hbGl6ZWRfdmFsdWVzKS8vLmNvbmNhdChleHRyYSlcbiAgfSlcblxuXG4gIHN0YWNrYWJsZSA9IHN0YWNrYWJsZS5zb3J0KChwLGMpID0+IHBbMF0ueSAtIGNbMF0ueSkucmV2ZXJzZSgpLnNsaWNlKDAsMTIpXG5cbiAgcmV0dXJuIHN0YWNrYWJsZVxuXG59XG5cbmZ1bmN0aW9uIHN0cmVhbURhdGEoYmVmb3JlLGFmdGVyLGJ1Y2tldHMpIHtcbiAgdmFyIHN0YWNrYWJsZSA9IGJ1aWxkU3RyZWFtRGF0YShiZWZvcmUsYnVja2V0cylcbiAgdmFyIHN0YWNrID0gZDMubGF5b3V0LnN0YWNrKCkub2Zmc2V0KFwid2lnZ2xlXCIpLm9yZGVyKFwicmV2ZXJzZVwiKVxuICB2YXIgYmVmb3JlX3N0YWNrZWQgPSBzdGFjayhzdGFja2FibGUpXG5cbiAgdmFyIG9yZGVyID0gYmVmb3JlX3N0YWNrZWQubWFwKGl0ZW0gPT4gaXRlbVswXS5rZXkpXG5cbiAgdmFyIHN0YWNrYWJsZSA9IGJ1aWxkU3RyZWFtRGF0YShhZnRlcixidWNrZXRzKVxuICAgIC5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gb3JkZXIuaW5kZXhPZihjWzBdLmtleSkgLSBvcmRlci5pbmRleE9mKHBbMF0ua2V5KSB9KVxuXG4gIHN0YWNrYWJsZSA9IHN0YWNrYWJsZS5maWx0ZXIoeCA9PiBvcmRlci5pbmRleE9mKHhbMF0ua2V5KSA9PSAtMSkuY29uY2F0KHN0YWNrYWJsZS5maWx0ZXIoeCA9PiBvcmRlci5pbmRleE9mKHhbMF0ua2V5KSA+IC0xKSlcblxuICB2YXIgc3RhY2sgPSBkMy5sYXlvdXQuc3RhY2soKS5vZmZzZXQoXCJ3aWdnbGVcIikub3JkZXIoXCJkZWZhdWx0XCIpXG4gIHZhciBhZnRlcl9zdGFja2VkID0gc3RhY2soc3RhY2thYmxlKVxuXG4gIHJldHVybiB7XG4gICAgICBvcmRlcjogb3JkZXJcbiAgICAsIGJlZm9yZV9zdGFja2VkOiBiZWZvcmVfc3RhY2tlZFxuICAgICwgYWZ0ZXJfc3RhY2tlZDogYWZ0ZXJfc3RhY2tlZFxuICB9XG5cbn1cblxuXG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZHJhd1N0cmVhbSh0YXJnZXQsYmVmb3JlLGFmdGVyKSB7XG5cbiAgZnVuY3Rpb24gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsYWNjZXNzb3IpIHtcbiAgICB2YXIgYnZvbHVtZSA9IHt9LCBhdm9sdW1lID0ge31cbiAgXG4gICAgdHJ5IHsgdmFyIGJ2b2x1bWUgPSBiWzBdLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLnhdID0gYWNjZXNzb3IoYyk7IHJldHVybiBwIH0se30pIH0gY2F0Y2goZSkge31cbiAgICB0cnkgeyB2YXIgYXZvbHVtZSA9IGFbMF0ucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2MueF0gPSBhY2Nlc3NvcihjKTsgcmV0dXJuIHAgfSx7fSkgfSBjYXRjaChlKSB7fVxuICBcbiAgICB2YXIgdm9sdW1lID0gYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKS5tYXAoeCA9PiBidm9sdW1lW3hdIHx8IDApLmNvbmNhdChidWNrZXRzLm1hcCh4ID0+IGF2b2x1bWVbeF0gfHwgMCkpXG4gIFxuICAgIHJldHVybiB2b2x1bWVcbiAgfVxuXG4gIHZhciBidWNrZXRzID0gWzAsMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geCo2MCB9KVxuXG4gIHZhciBkYXRhID0gc3RyZWFtRGF0YShiZWZvcmUsYWZ0ZXIsYnVja2V0cylcbiAgICAsIGJlZm9yZV9zdGFja2VkID0gZGF0YS5iZWZvcmVfc3RhY2tlZFxuICAgICwgYWZ0ZXJfc3RhY2tlZCA9IGRhdGEuYWZ0ZXJfc3RhY2tlZFxuXG4gIHZhciBiZWZvcmUgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5iZWZvcmUtc3RyZWFtXCIsXCJkaXZcIixkYXRhLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgLmNsYXNzZWQoXCJiZWZvcmUtc3RyZWFtXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjBweFwiKVxuXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwicmdiKDIyNywgMjM1LCAyNDApXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShiZWZvcmUsXCJoM1wiLFwiaDNcIilcbiAgICAudGV4dChcIkNvbnNpZGVyYXRpb24gYW5kIFJlc2VhcmNoIFBoYXNlIElkZW50aWZpY2F0aW9uXCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMHB4XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG5cbiAgdmFyIGlubmVyID0gZDNfdXBkYXRlYWJsZShiZWZvcmUsXCIuaW5uZXJcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwiaW5uZXJcIix0cnVlKVxuXG5cblxuICB2YXIgc3RyZWFtID0gc3RyZWFtX3Bsb3QoaW5uZXIpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAub24oXCJjYXRlZ29yeS5ob3ZlclwiLGZ1bmN0aW9uKHgsdGltZSkge1xuICAgICAgY29uc29sZS5sb2codGltZSlcbiAgICAgIHZhciBiID0gZGF0YS5iZWZvcmVfc3RhY2tlZC5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSB4KVxuICAgICAgdmFyIGEgPSBkYXRhLmFmdGVyX3N0YWNrZWQuZmlsdGVyKHkgPT4geVswXS5rZXkgPT0geClcblxuICAgICAgdmFyIHZvbHVtZSA9IGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMudmFsdWVzLmxlbmd0aCB9KVxuICAgICAgICAsIHBlcmNlbnQgPSBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxmdW5jdGlvbihjKSB7IHJldHVybiBjLnBlcmNlbnQgfSlcbiAgICAgICAgLCBpbXBvcnRhbmNlID0gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsZnVuY3Rpb24oYykgeyByZXR1cm4gYy55IH0pXG5cblxuICAgICAgdmFyIHdyYXAgPSBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgLCB2d3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi52b2x1bWVcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInZvbHVtZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgtNjAsMzApXCIpXG4gICAgICAgICwgcHdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIucGVyY2VudFwiLFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicGVyY2VudFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgtNjAsOTApXCIpXG4gICAgICAgICwgaXdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuaW1wb3J0YW5jZVwiLFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiaW1wb3J0YW5jZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgtNjAsMTUwKVwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodndyYXAsXCJ0ZXh0XCIsXCJ0ZXh0XCIpLnRleHQoXCJWaXNpdHNcIilcbiAgICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGl0bGVcIilcbiAgICAgIHNpbXBsZVRpbWVzZXJpZXModndyYXAsdm9sdW1lKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDAsMilcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHB3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiU2hhcmUgb2YgdGltZVwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKHB3cmFwLHBlcmNlbnQpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMCwyKVwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaXdyYXAsXCJ0ZXh0XCIsXCJ0ZXh0XCIpLnRleHQoXCJJbXBvcnRhbmNlXCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInRpdGxlXCIpXG5cbiAgICAgIHNpbXBsZVRpbWVzZXJpZXMoaXdyYXAsaW1wb3J0YW5jZSlcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgwLDIpXCIpXG5cblxuICAgICAgcmV0dXJuXG4gICAgfSlcbiAgICAuZHJhdygpXG5cbiAgdmFyIGJlZm9yZV9hZ2cgPSBiZWZvcmVfc3RhY2tlZC5yZWR1Y2UoKG8seCkgPT4geyByZXR1cm4geC5yZWR1Y2UoKHAsYykgPT4geyBwW2MueF0gPSAocFtjLnhdIHx8IDApICsgYy55OyByZXR1cm4gcH0sbykgfSx7fSlcbiAgICAsIGFmdGVyX2FnZyA9IGFmdGVyX3N0YWNrZWQucmVkdWNlKChvLHgpID0+IHsgcmV0dXJuIHgucmVkdWNlKChwLGMpID0+IHsgcFtjLnhdID0gKHBbYy54XSB8fCAwKSArIGMueTsgcmV0dXJuIHB9LG8pIH0se30pXG5cblxuICB2YXIgbG9jYWxfYmVmb3JlID0gT2JqZWN0LmtleXMoYmVmb3JlX2FnZykucmVkdWNlKChtaW5hcnIsYykgPT4ge1xuICAgICAgaWYgKG1pbmFyclswXSA+PSBiZWZvcmVfYWdnW2NdKSByZXR1cm4gW2JlZm9yZV9hZ2dbY10sY107XG4gICAgICBpZiAobWluYXJyLmxlbmd0aCA+IDEpIG1pbmFyclswXSA9IC0xO1xuICAgICAgcmV0dXJuIG1pbmFyclxuICAgIH0sW0luZmluaXR5XVxuICApWzFdXG5cbiAgdmFyIGxvY2FsX2FmdGVyID0gT2JqZWN0LmtleXMoYWZ0ZXJfYWdnKS5yZWR1Y2UoKG1pbmFycixjKSA9PiB7XG4gICAgICBpZiAobWluYXJyWzBdID49IGFmdGVyX2FnZ1tjXSkgcmV0dXJuIFthZnRlcl9hZ2dbY10sY107XG4gICAgICBpZiAobWluYXJyLmxlbmd0aCA+IDEpIG1pbmFyclswXSA9IC0xO1xuICAgICAgcmV0dXJuIG1pbmFyclxuICAgIH0sW0luZmluaXR5XVxuICApWzFdXG5cblxuICB2YXIgYmVmb3JlX2xpbmUgPSBidWNrZXRzW2J1Y2tldHMuaW5kZXhPZihwYXJzZUludChsb2NhbF9iZWZvcmUpKV1cbiAgICAsIGFmdGVyX2xpbmUgPSBidWNrZXRzW2J1Y2tldHMuaW5kZXhPZihwYXJzZUludChsb2NhbF9hZnRlcikpXVxuXG4gIHZhciBzdmcgPSBzdHJlYW1cbiAgICAuX3N2Zy5zdHlsZShcIm1hcmdpblwiLFwiYXV0b1wiKS5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG5cblxuICB2YXIgYmxpbmUgPSBkM191cGRhdGVhYmxlKHN2Zy5zZWxlY3RBbGwoXCIuYmVmb3JlLWNhbnZhc1wiKSxcImcubGluZS13cmFwXCIsXCJnXCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwibGluZS13cmFwXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShibGluZSxcImxpbmVcIixcImxpbmVcIilcbiAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAuYXR0cihcInkyXCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieDFcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpKVxuICAgIC5hdHRyKFwieDJcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmxpbmUsXCJ0ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieFwiLCBzdHJlYW0uX2JlZm9yZV9zY2FsZShiZWZvcmVfbGluZSkgKyAxMClcbiAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwic3RhcnRcIilcbiAgICAudGV4dChcIkNvbnNpZGVyYXRpb24gU3RhZ2VcIilcblxuXG4gIHZhciBhbGluZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLnNlbGVjdEFsbChcIi5hZnRlci1jYW52YXNcIiksXCJnLmxpbmUtd3JhcFwiLFwiZ1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImxpbmUtd3JhcFwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYWxpbmUsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAuYXR0cihcInkxXCIsIDApXG4gICAgLmF0dHIoXCJ5MlwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcIngxXCIsIHN0cmVhbS5fYWZ0ZXJfc2NhbGUoYWZ0ZXJfbGluZSkpXG4gICAgLmF0dHIoXCJ4MlwiLCBzdHJlYW0uX2FmdGVyX3NjYWxlKGFmdGVyX2xpbmUpKVxuXG4gIGQzX3VwZGF0ZWFibGUoYWxpbmUsXCJ0ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieFwiLCBzdHJlYW0uX2FmdGVyX3NjYWxlKGFmdGVyX2xpbmUpIC0gMTApXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgIC50ZXh0KFwiVmFsaWRhdGlvbiAvIFJlc2VhcmNoXCIpXG5cblxuXG4gIHJldHVybiB7XG4gICAgXCJjb25zaWRlcmF0aW9uXCI6IFwiXCIgKyBiZWZvcmVfbGluZSxcbiAgICBcInZhbGlkYXRpb25cIjogXCItXCIgKyBhZnRlcl9saW5lXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdCZWZvcmVBbmRBZnRlcih0YXJnZXQsZGF0YSkge1xuXG4gIHZhciBiZWZvcmUgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5iZWZvcmVcIixcImRpdlwiLGRhdGEsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAuY2xhc3NlZChcImJlZm9yZVwiLHRydWUpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIwcHhcIilcblxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcInJnYigyMjcsIDIzNSwgMjQwKVwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJDYXRlZ29yeSBhY3Rpdml0eSBiZWZvcmUgYXJyaXZpbmcgYW5kIGFmdGVyIGxlYXZpbmcgc2l0ZVwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIjMzMzXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjBweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuXG4gIHZhciBpbm5lciA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiLmlubmVyXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcblxuICBkM191cGRhdGVhYmxlKGlubmVyLFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJTb3J0IEJ5XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjJweFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNDBweFwiKVxuXG5cblxuICBpbm5lci5zZWxlY3RBbGwoXCJzZWxlY3RcIilcbiAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjE0MHB4XCIpXG5cblxuICB2YXIgY2IgPSBjb21wX2J1YmJsZShiZWZvcmUpXG4gICAgLnJvd3MoZGF0YS5iZWZvcmVfY2F0ZWdvcmllcylcbiAgICAuYWZ0ZXIoZGF0YS5hZnRlcl9jYXRlZ29yaWVzKVxuICAgIC5kcmF3KClcblxuICBjYi5fc3ZnLnN0eWxlKFwiZGlzcGxheVwiLFwiYmxvY2tcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiYXV0b1wiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiYXV0b1wiKVxuXG5cbiAgcmV0dXJuIGlubmVyXG5cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIFBpZSh0YXJnZXQpIHtcbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuUGllLnByb3RvdHlwZSA9IHtcbiAgICByYWRpdXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyYWRpdXNcIix2YWwpXG4gICAgfVxuICAsIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG4gIFxuICAgIHZhciBkID0gZDMuZW50cmllcyh7XG4gICAgICAgIHNhbXBsZTogdGhpcy5fZGF0YS5zYW1wbGVcbiAgICAgICwgcG9wdWxhdGlvbjogdGhpcy5fZGF0YS5wb3B1bGF0aW9uIC0gdGhpcy5fZGF0YS5zYW1wbGVcbiAgICB9KVxuICAgIFxuICAgIHZhciBjb2xvciA9IGQzLnNjYWxlLm9yZGluYWwoKVxuICAgICAgICAucmFuZ2UoW1wiIzk4YWJjNVwiLCBcIiM4YTg5YTZcIiwgXCIjN2I2ODg4XCIsIFwiIzZiNDg2YlwiLCBcIiNhMDVkNTZcIiwgXCIjZDA3NDNjXCIsIFwiI2ZmOGMwMFwiXSk7XG4gICAgXG4gICAgdmFyIGFyYyA9IGQzLnN2Zy5hcmMoKVxuICAgICAgICAub3V0ZXJSYWRpdXModGhpcy5fcmFkaXVzIC0gMTApXG4gICAgICAgIC5pbm5lclJhZGl1cygwKTtcbiAgICBcbiAgICB2YXIgcGllID0gZDMubGF5b3V0LnBpZSgpXG4gICAgICAgIC5zb3J0KG51bGwpXG4gICAgICAgIC52YWx1ZShmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KTtcbiAgICBcbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcInN2Z1wiLFwic3ZnXCIsZmFsc2UsZnVuY3Rpb24oeCl7cmV0dXJuIDF9KVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIDUwKVxuICAgICAgICAuYXR0cihcImhlaWdodFwiLCA1MilcbiAgXG4gICAgc3ZnID0gZDNfdXBkYXRlYWJsZShzdmcsXCJnXCIsXCJnXCIpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgMjUgKyBcIixcIiArIDI2ICsgXCIpXCIpO1xuICAgIFxuICAgIHZhciBnID0gZDNfc3BsYXQoc3ZnLFwiLmFyY1wiLFwiZ1wiLHBpZShkKSxmdW5jdGlvbih4KXsgcmV0dXJuIHguZGF0YS5rZXkgfSlcbiAgICAgIC5jbGFzc2VkKFwiYXJjXCIsdHJ1ZSlcbiAgXG4gICAgZDNfdXBkYXRlYWJsZShnLFwicGF0aFwiLFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJkXCIsIGFyYylcbiAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gY29sb3IoZC5kYXRhLmtleSkgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcGllKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFBpZSh0YXJnZXQpXG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBwaWUgZnJvbSAnLi4vLi4vZ2VuZXJpYy9waWUnXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN1bW1hcnlCbG9jayhkYXRhLCB0YXJnZXQsIHJhZGl1c19zY2FsZSwgeCkge1xuICB2YXIgZGF0YSA9IGRhdGFcbiAgICAsIGR0aGlzID0gZDMuc2VsZWN0KHRhcmdldClcblxuICBwaWUoZHRoaXMpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAucmFkaXVzKHJhZGl1c19zY2FsZShkYXRhLnBvcHVsYXRpb24pKVxuICAgIC5kcmF3KClcblxuICB2YXIgZncgPSBkM191cGRhdGVhYmxlKGR0aGlzLFwiLmZ3XCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAuY2xhc3NlZChcImZ3XCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTBweFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiM3B4XCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE2cHhcIilcblxuICB2YXIgZncyID0gZDNfdXBkYXRlYWJsZShkdGhpcyxcIi5mdzJcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgIC5jbGFzc2VkKFwiZncyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNjBweFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiM3B4XCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIyMnB4XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiNDBweFwiKVxuICAgIC50ZXh0KGQzLmZvcm1hdChcIiVcIikoZGF0YS5zYW1wbGUvZGF0YS5wb3B1bGF0aW9uKSlcblxuXG5cbiAgZDNfdXBkYXRlYWJsZShmdyxcIi5zYW1wbGVcIixcInNwYW5cIikudGV4dChkMy5mb3JtYXQoXCIsXCIpKGRhdGEuc2FtcGxlKSlcbiAgICAuY2xhc3NlZChcInNhbXBsZVwiLHRydWUpXG4gIGQzX3VwZGF0ZWFibGUoZncsXCIudnNcIixcInNwYW5cIikuaHRtbChcIjxicj4gb3V0IG9mIDxicj5cIikuc3R5bGUoXCJmb250LXNpemVcIixcIi44OGVtXCIpXG4gICAgLmNsYXNzZWQoXCJ2c1wiLHRydWUpXG4gIGQzX3VwZGF0ZWFibGUoZncsXCIucG9wdWxhdGlvblwiLFwic3BhblwiKS50ZXh0KGQzLmZvcm1hdChcIixcIikoZGF0YS5wb3B1bGF0aW9uKSlcbiAgICAuY2xhc3NlZChcInBvcHVsYXRpb25cIix0cnVlKVxuXG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCB7YnVpbGRTdW1tYXJ5QmxvY2t9IGZyb20gJy4vc2FtcGxlX3ZzX3BvcCdcblxuaW1wb3J0ICogYXMgdGltZXNlcmllcyBmcm9tICcuLi8uLi9nZW5lcmljL3RpbWVzZXJpZXMnXG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3VGltZXNlcmllcyh0YXJnZXQsZGF0YSxyYWRpdXNfc2NhbGUpIHtcbiAgdmFyIHcgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdi50aW1lc2VyaWVzXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInRpbWVzZXJpZXNcIix0cnVlKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCI2MCVcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLCBcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEyN3B4XCIpXG5cblxuXG4gIHZhciBxID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJkaXYudGltZXNlcmllcy1kZXRhaWxzXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInRpbWVzZXJpZXMtZGV0YWlsc1wiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjQwJVwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCI1N3B4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEyN3B4XCIpXG5cblxuXG5cblxuICB2YXIgcG9wID0gZDNfdXBkYXRlYWJsZShxLFwiLnBvcFwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJwb3BcIix0cnVlKVxuXG4gIGQzX3VwZGF0ZWFibGUocG9wLFwiLmV4XCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJleFwiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjIwcHhcIilcbiAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJncmV5XCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cblxuICBkM191cGRhdGVhYmxlKHBvcCxcIi50aXRsZVwiLFwic3BhblwiKVxuICAgIC5jbGFzc2VkKFwidGl0bGVcIix0cnVlKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjNweFwiKVxuICAgIC50ZXh0KFwiYWxsXCIpXG5cblxuXG4gIHZhciBzYW1wID0gZDNfdXBkYXRlYWJsZShxLFwiLnNhbXBcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwic2FtcFwiLHRydWUpXG5cbiAgZDNfdXBkYXRlYWJsZShzYW1wLFwiLmV4XCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJleFwiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjIwcHhcIilcbiAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjMDgxZDU4XCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cblxuXG4gIGQzX3VwZGF0ZWFibGUoc2FtcCxcIi50aXRsZVwiLFwic3BhblwiKVxuICAgIC5jbGFzc2VkKFwidGl0bGVcIix0cnVlKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjNweFwiKVxuICAgIC50ZXh0KFwiZmlsdGVyZWRcIilcblxuXG4gIHZhciBkZXRhaWxzID0gZDNfdXBkYXRlYWJsZShxLFwiLmRlZXRzXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImRlZXRzXCIsdHJ1ZSlcblxuXG5cblxuICBkM191cGRhdGVhYmxlKHcsXCJoM1wiLFwiaDNcIilcbiAgICAudGV4dChcIkZpbHRlcmVkIHZlcnN1cyBBbGwgVmlld3NcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzMzM1wiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIwcHhcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcblxuXG5cblxuXG5cbiAgdGltZXNlcmllc1snZGVmYXVsdCddKHcpXG4gICAgLmRhdGEoe1wia2V5XCI6XCJ5XCIsXCJ2YWx1ZXNcIjpkYXRhfSlcbiAgICAuaGVpZ2h0KDgwKVxuICAgIC5vbihcImhvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgdmFyIHh4ID0ge31cbiAgICAgIHh4W3gua2V5XSA9IHtzYW1wbGU6IHgudmFsdWUsIHBvcHVsYXRpb246IHgudmFsdWUyIH1cbiAgICAgIGRldGFpbHMuZGF0dW0oeHgpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoZGV0YWlscyxcIi50ZXh0XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0ZXh0XCIsdHJ1ZSlcbiAgICAgICAgLnRleHQoXCJAIFwiICsgeC5ob3VyICsgXCI6XCIgKyAoeC5taW51dGUubGVuZ3RoID4gMSA/IHgubWludXRlIDogXCIwXCIgKyB4Lm1pbnV0ZSkgKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjQ5cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1yaWdodFwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjExMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoZGV0YWlscyxcIi5waWVcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInBpZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTVweFwiKVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBPYmplY3Qua2V5cyh4KS5tYXAoZnVuY3Rpb24oaykgeyByZXR1cm4geFtrXSB9KVswXVxuICAgICAgICAgIGJ1aWxkU3VtbWFyeUJsb2NrKGRhdGEsdGhpcyxyYWRpdXNfc2NhbGUseClcbiAgICAgICAgfSlcbiAgICB9KVxuICAgIC5kcmF3KClcblxufVxuIiwiaW1wb3J0IHt0YWJsZX0gZnJvbSAndGFibGUnXG5cbmltcG9ydCB7ZDNfY2xhc3MsIGQzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQge2RyYXdDYXRlZ29yeSwgZHJhd0NhdGVnb3J5RGlmZn0gZnJvbSAnLi9jYXRlZ29yeSdcbmltcG9ydCB7ZHJhd1N0cmVhbSwgZHJhd0JlZm9yZUFuZEFmdGVyfSBmcm9tICcuL2JlZm9yZV9hbmRfYWZ0ZXInXG5pbXBvcnQge2J1aWxkU3VtbWFyeUJsb2NrfSBmcm9tICcuL3NhbXBsZV92c19wb3AnXG5pbXBvcnQge2RyYXdUaW1lc2VyaWVzfSBmcm9tICcuL3RpbWluZydcbmltcG9ydCB7ZHJhd0tleXdvcmRzLCBkcmF3S2V5d29yZERpZmZ9IGZyb20gJy4va2V5d29yZHMnXG5cbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4uLy4uL2dlbmVyaWMvc2VsZWN0J1xuXG5cblxuZXhwb3J0IGNsYXNzIFN1bW1hcnlWaWV3IGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICB9XG5cbiAgcHJvcHMoKSB7IHJldHVybiBbXCJkYXRhXCIsIFwidGltaW5nXCIsIFwiY2F0ZWdvcnlcIiwgXCJrZXl3b3Jkc1wiLCBcImJlZm9yZVwiLCBcImFmdGVyXCJdIH1cblxuICBkcmF3KCkge1xuICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIuc3VtbWFyeS13cmFwXCIsXCJkaXZcIilcbiAgICAgIC5jbGFzc2VkKFwic3VtbWFyeS12aWV3XCIsdHJ1ZSlcblxuICAgIGhlYWRlcih3cmFwKVxuICAgICAgLnRleHQoXCJTdW1tYXJ5XCIpXG4gICAgICAuZHJhdygpXG5cblxuICAgIHZhciB0c3dyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudHMtcm93XCIsXCJkaXZcIilcbiAgICAgIC5jbGFzc2VkKFwidHMtcm93XCIsdHJ1ZSlcbiAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICB2YXIgcGlld3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5waWUtcm93XCIsXCJkaXZcIilcbiAgICAgIC5jbGFzc2VkKFwicGllLXJvd1wiLHRydWUpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgdmFyIGNhdHdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuY2F0LXJvd1wiLFwiZGl2XCIpXG4gICAgICAuY2xhc3NlZChcImNhdC1yb3cgZGFzaC1yb3dcIix0cnVlKVxuICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgIHZhciBrZXl3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmtleS1yb3dcIixcImRpdlwiKVxuICAgICAgLmNsYXNzZWQoXCJrZXktcm93IGRhc2gtcm93XCIsdHJ1ZSlcbiAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICB2YXIgYmF3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmJhLXJvd1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiYmEtcm93XCIsdHJ1ZSlcbiAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICB2YXIgc3RyZWFtd3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5zdHJlYW0tYmEtcm93XCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLmNsYXNzZWQoXCJzdHJlYW0tYmEtcm93XCIsdHJ1ZSlcbiAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cblxuXG5cblxuXG5cblxuICAgIHZhciByYWRpdXNfc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbdGhpcy5fZGF0YS5kb21haW5zLnBvcHVsYXRpb24sdGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uXSlcbiAgICAgIC5yYW5nZShbMjAsMzVdKVxuXG5cblxuICAgIHRhYmxlKHBpZXdyYXApXG4gICAgICAuZGF0YSh7XCJrZXlcIjpcIlRcIixcInZhbHVlc1wiOlt0aGlzLmRhdGEoKV19KVxuICAgICAgLnNraXBfb3B0aW9uKHRydWUpXG4gICAgICAucmVuZGVyKFwiZG9tYWluc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcbiAgICAgIC5yZW5kZXIoXCJhcnRpY2xlc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgfSlcblxuICAgICAgLnJlbmRlcihcInNlc3Npb25zXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZGF0YSA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLmRhdHVtKClbeC5rZXldO1xuICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICB9KVxuICAgICAgLnJlbmRlcihcInZpZXdzXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZGF0YSA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLmRhdHVtKClbeC5rZXldO1xuICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICB9KVxuICAgICAgLmRyYXcoKVxuXG5cbiAgICBkcmF3VGltZXNlcmllcyh0c3dyYXAsdGhpcy5fdGltaW5nLHJhZGl1c19zY2FsZSlcblxuXG4gICAgdHJ5IHtcbiAgICBkcmF3Q2F0ZWdvcnkoY2F0d3JhcCx0aGlzLl9jYXRlZ29yeSlcbiAgICBkcmF3Q2F0ZWdvcnlEaWZmKGNhdHdyYXAsdGhpcy5fY2F0ZWdvcnkpXG4gICAgfSBjYXRjaChlKSB7fVxuXG4gICAgLy9kcmF3S2V5d29yZHMoa2V5d3JhcCx0aGlzLl9rZXl3b3JkcylcbiAgICAvL2RyYXdLZXl3b3JkRGlmZihrZXl3cmFwLHRoaXMuX2tleXdvcmRzKVxuXG4gICAgdmFyIGlubmVyID0gZHJhd0JlZm9yZUFuZEFmdGVyKGJhd3JhcCx0aGlzLl9iZWZvcmUpXG5cbiAgICBzZWxlY3QoaW5uZXIpXG4gICAgICAub3B0aW9ucyhbXG4gICAgICAgICAge1wia2V5XCI6XCJJbXBvcnRhbmNlXCIsXCJ2YWx1ZVwiOlwicGVyY2VudF9kaWZmXCJ9XG4gICAgICAgICwge1wia2V5XCI6XCJBY3Rpdml0eVwiLFwidmFsdWVcIjpcInNjb3JlXCJ9XG4gICAgICAgICwge1wia2V5XCI6XCJQb3B1bGF0aW9uXCIsXCJ2YWx1ZVwiOlwicG9wXCJ9XG4gICAgICBdKVxuICAgICAgLnNlbGVjdGVkKHRoaXMuX2JlZm9yZS5zb3J0YnkgfHwgXCJcIilcbiAgICAgIC5vbihcInNlbGVjdFwiLCB0aGlzLm9uKFwiYmEuc29ydFwiKSlcbiAgICAgIC5kcmF3KClcblxuXG4gICAgZHJhd1N0cmVhbShzdHJlYW13cmFwLHRoaXMuX2JlZm9yZS5iZWZvcmVfY2F0ZWdvcmllcyx0aGlzLl9iZWZvcmUuYWZ0ZXJfY2F0ZWdvcmllcylcblxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufSAgICAgICAgICAgICAgIFxuIiwiaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcblxuaW1wb3J0IHtTdW1tYXJ5Vmlld30gZnJvbSAnLi9zdW1tYXJ5L3ZpZXcnXG5cblxuaW1wb3J0ICcuL3N1bW1hcnkuY3NzJ1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN1bW1hcnlfdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTdW1tYXJ5Vmlldyh0YXJnZXQpXG59XG5cbiIsImV4cG9ydCB2YXIgYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKHgqNjApIH0pXG5idWNrZXRzID0gYnVja2V0cy5jb25jYXQoWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZygteCo2MCkgfSkpXG5cbiBcblxuLy8gUm9sbHVwIG92ZXJhbGwgYmVmb3JlIGFuZCBhZnRlciBkYXRhXG5cbmNvbnN0IGJ1Y2tldFdpdGhQcmVmaXggPSAocHJlZml4LHgpID0+IHByZWZpeCArIHgudGltZV9kaWZmX2J1Y2tldFxuY29uc3Qgc3VtVmlzaXRzID0gKHgpID0+IGQzLnN1bSh4LHkgPT4geS52aXNpdHMpIFxuXG5leHBvcnQgZnVuY3Rpb24gcm9sbHVwQmVmb3JlQW5kQWZ0ZXIoYmVmb3JlX3VybHMsIGFmdGVyX3VybHMpIHtcblxuICBjb25zdCBiZWZvcmVfcm9sbHVwID0gZDMubmVzdCgpXG4gICAgLmtleShidWNrZXRXaXRoUHJlZml4LmJpbmQodGhpcyxcIlwiKSlcbiAgICAucm9sbHVwKHN1bVZpc2l0cylcbiAgICAubWFwKGJlZm9yZV91cmxzKVxuXG4gIGNvbnN0IGFmdGVyX3JvbGx1cCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoYnVja2V0V2l0aFByZWZpeC5iaW5kKHRoaXMsXCItXCIpKVxuICAgIC5yb2xsdXAoc3VtVmlzaXRzKVxuICAgIC5tYXAoYWZ0ZXJfdXJscylcblxuICByZXR1cm4gYnVja2V0cy5tYXAoeCA9PiBiZWZvcmVfcm9sbHVwW3hdIHx8IGFmdGVyX3JvbGx1cFt4XSB8fCAwKVxufVxuXG5cblxuXG4vLyBLZXl3b3JkIHByb2Nlc3NpbmcgaGVscGVyc1xuXG5jb25zdCBTVE9QV09SRFMgPVtcbiAgICBcInRoYXRcIixcInRoaXNcIixcIndoYXRcIixcImJlc3RcIixcIm1vc3RcIixcImZyb21cIixcInlvdXJcIlxuICAsIFwiaGF2ZVwiLFwiZmlyc3RcIixcIndpbGxcIixcInRoYW5cIixcInNheXNcIixcImxpa2VcIixcImludG9cIixcImFmdGVyXCIsXCJ3aXRoXCJcbl1cbmNvbnN0IGNsZWFuQW5kU3BsaXRVUkwgPSAoZG9tYWluLHVybCkgPT4ge1xuICByZXR1cm4gdXJsLnRvTG93ZXJDYXNlKCkuc3BsaXQoZG9tYWluKVsxXS5zcGxpdChcIi9cIikucmV2ZXJzZSgpWzBdLnJlcGxhY2UoXCJfXCIsXCItXCIpLnNwbGl0KFwiLVwiKVxufVxuY29uc3QgaXNXb3JkID0gKHgpID0+IHtcbiAgcmV0dXJuIHgubWF0Y2goL1xcZCsvZykgPT0gbnVsbCAmJiBcbiAgICB4LmluZGV4T2YoXCIsXCIpID09IC0xICYmIFxuICAgIHguaW5kZXhPZihcIj9cIikgPT0gLTEgJiYgXG4gICAgeC5pbmRleE9mKFwiLlwiKSA9PSAtMSAmJiBcbiAgICB4LmluZGV4T2YoXCI6XCIpID09IC0xICYmIFxuICAgIHBhcnNlSW50KHgpICE9IHggJiYgXG4gICAgeC5sZW5ndGggPiAzXG59XG5cblxuY29uc3QgdXJsUmVkdWNlciA9IChwLGMpID0+IHtcbiAgcFtjLnVybF0gPSAocFtjLnVybF0gfHwgMCkgKyBjLnZpc2l0c1xuICByZXR1cm4gcFxufVxuY29uc3QgdXJsQnVja2V0UmVkdWNlciA9IChwcmVmaXgsIHAsYykgPT4ge1xuICBwW2MudXJsXSA9IHBbYy51cmxdIHx8IHt9XG4gIHBbYy51cmxdW1widXJsXCJdID0gYy51cmxcblxuICBwW2MudXJsXVtwcmVmaXggKyBjLnRpbWVfZGlmZl9idWNrZXRdID0gYy52aXNpdHNcbiAgcmV0dXJuIHBcbn1cbmNvbnN0IHVybFRvS2V5d29yZHNPYmpSZWR1Y2VyID0gKGRvbWFpbiwgcCxjKSA9PiB7XG4gIGNsZWFuQW5kU3BsaXRVUkwoZG9tYWluLGMua2V5KS5tYXAoeCA9PiB7XG4gICAgaWYgKGlzV29yZCh4KSAmJiBTVE9QV09SRFMuaW5kZXhPZih4KSA9PSAtMSkge1xuICAgICAgcFt4XSA9IHBbeF0gfHwge31cbiAgICAgIHBbeF0ua2V5ID0geFxuICAgICAgT2JqZWN0LmtleXMoYy52YWx1ZSkubWFwKHEgPT4ge1xuICAgICAgICBwW3hdW3FdID0gKHBbeF1bcV0gfHwgMCkgKyBjLnZhbHVlW3FdXG4gICAgICB9KVxuICAgIH1cbiAgfSlcbiAgcmV0dXJuIHBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVybHNBbmRLZXl3b3JkcyhiZWZvcmVfdXJscywgYWZ0ZXJfdXJscywgZG9tYWluKSB7XG5cbiAgICBjb25zdCB1cmxfdm9sdW1lID0ge31cbiAgICBiZWZvcmVfdXJscy5yZWR1Y2UodXJsUmVkdWNlcix1cmxfdm9sdW1lKVxuICAgIGFmdGVyX3VybHMucmVkdWNlKHVybFJlZHVjZXIsdXJsX3ZvbHVtZSlcblxuICAgIGNvbnN0IHVybF90cyA9IHt9XG4gICAgYmVmb3JlX3VybHMucmVkdWNlKHVybEJ1Y2tldFJlZHVjZXIuYmluZCh0aGlzLFwiXCIpLHVybF90cylcbiAgICBhZnRlcl91cmxzLnJlZHVjZSh1cmxCdWNrZXRSZWR1Y2VyLmJpbmQodGhpcyxcIi1cIiksdXJsX3RzKVxuXG4gICAgY29uc3QgdXJscyA9IGQzLmVudHJpZXModXJsX3ZvbHVtZSlcbiAgICAgIC5zb3J0KChwLGMpID0+IHsgcmV0dXJuIGQzLmRlc2NlbmRpbmcocC52YWx1ZSxjLnZhbHVlKSB9KVxuICAgICAgLnNsaWNlKDAsMTAwMClcbiAgICAgIC5tYXAoeCA9PiB1cmxfdHNbeC5rZXldKVxuICAgICAgLm1hcChmdW5jdGlvbih4KXsgXG4gICAgICAgIHgua2V5ID0geC51cmxcbiAgICAgICAgeC52YWx1ZXMgPSBidWNrZXRzLm1hcCh5ID0+IHhbeV0gfHwgMClcbiAgICAgICAgeC50b3RhbCA9IGQzLnN1bShidWNrZXRzLm1hcChmdW5jdGlvbihiKSB7IHJldHVybiB4W2JdIHx8IDAgfSkpXG4gICAgICAgIHJldHVybiB4XG4gICAgICB9KVxuXG4gICAgY29uc3Qga2V5d29yZHMgPSB7fVxuICAgIGQzLmVudHJpZXModXJsX3RzKVxuICAgICAgLnJlZHVjZSh1cmxUb0tleXdvcmRzT2JqUmVkdWNlci5iaW5kKGZhbHNlLGRvbWFpbiksa2V5d29yZHMpXG4gICAgXG4gICAgXG4gICAgY29uc3Qga3dzID0gT2JqZWN0LmtleXMoa2V5d29yZHMpXG4gICAgICAubWFwKGZ1bmN0aW9uKGspIHsgcmV0dXJuIE9iamVjdC5hc3NpZ24oa2V5d29yZHNba10se2tleTprfSkgfSlcbiAgICAgIC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgIHgudmFsdWVzID0gYnVja2V0cy5tYXAoeSA9PiB4W3ldIHx8IDApXG4gICAgICAgIHgudG90YWwgPSBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKVxuICAgICAgICByZXR1cm4geFxuICAgICAgfSkuc29ydCgocCxjKSA9PiB7XG4gICAgICAgIHJldHVybiBjLnRvdGFsIC0gcC50b3RhbFxuICAgICAgfSlcblxuICAgIHJldHVybiB7XG4gICAgICB1cmxzLFxuICAgICAga3dzXG4gICAgfVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZENvbnNpZChzb3J0ZWRfdXJscywgc29ydGVkX2t3cywgYmVmb3JlX3BvcywgYWZ0ZXJfcG9zKSB7XG4gICAgY29uc3QgY29uc2lkX2J1Y2tldHMgPSBidWNrZXRzLmZpbHRlcigoeCxpKSA9PiAhKChpIDwgYmVmb3JlX3BvcykgfHwgKGkgPiBidWNrZXRzLmxlbmd0aC8yIC0gMSApKSApXG4gICAgY29uc3QgdmFsaWRfYnVja2V0cyAgPSBidWNrZXRzLmZpbHRlcigoeCxpKSA9PiAhKChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKSkgKVxuICAgIGZ1bmN0aW9uIGNvbnRhaW5zUmVkdWNlcih4LHAsYykge1xuICAgICAgcCArPSB4W2NdIHx8IDA7XG4gICAgICByZXR1cm4gcFxuICAgIH1cbiAgICBmdW5jdGlvbiBmaWx0ZXJCeUJ1Y2tldHMoX2J1Y2tldHMseCkge1xuICAgICAgcmV0dXJuIF9idWNrZXRzLnJlZHVjZShjb250YWluc1JlZHVjZXIuYmluZChmYWxzZSx4KSwwKVxuICAgIH1cbiAgICB2YXIgdXJsc19jb25zaWQgPSBzb3J0ZWRfdXJscy5maWx0ZXIoIGZpbHRlckJ5QnVja2V0cy5iaW5kKGZhbHNlLGNvbnNpZF9idWNrZXRzKSApXG4gICAgICAsIGt3c19jb25zaWQgPSBzb3J0ZWRfa3dzLmZpbHRlciggZmlsdGVyQnlCdWNrZXRzLmJpbmQoZmFsc2UsY29uc2lkX2J1Y2tldHMpIClcblxuICAgIHZhciB1cmxzX3ZhbGlkID0gc29ydGVkX3VybHMuZmlsdGVyKCBmaWx0ZXJCeUJ1Y2tldHMuYmluZChmYWxzZSx2YWxpZF9idWNrZXRzKSApXG4gICAgICAsIGt3c192YWxpZCA9IHNvcnRlZF9rd3MuZmlsdGVyKCBmaWx0ZXJCeUJ1Y2tldHMuYmluZChmYWxzZSx2YWxpZF9idWNrZXRzKSApXG5cbiAgICByZXR1cm4ge1xuICAgICAgICB1cmxzX2NvbnNpZFxuICAgICAgLCB1cmxzX3ZhbGlkXG4gICAgICAsIGt3c19jb25zaWRcbiAgICAgICwga3dzX3ZhbGlkXG4gICAgfVxufVxuXG5cblxuXG4vLyBCdWlsZCBkYXRhIGZvciBzdW1tYXJ5XG5cbmZ1bmN0aW9uIG51bVZpZXdzKGRhdGEpIHsgXG4gIHJldHVybiBkYXRhLmxlbmd0aCBcbn1cbmZ1bmN0aW9uIGF2Z1ZpZXdzKGRhdGEpIHtcbiAgcmV0dXJuIHBhcnNlSW50KGRhdGEucmVkdWNlKChwLGMpID0+IHAgKyBjLnRvdGFsLDApL2RhdGEubGVuZ3RoKVxufVxuZnVuY3Rpb24gbWVkaWFuVmlld3MoZGF0YSkge1xuICByZXR1cm4gKGRhdGFbcGFyc2VJbnQoZGF0YS5sZW5ndGgvMildIHx8IHt9KS50b3RhbCB8fCAwXG59XG5mdW5jdGlvbiBzdW1tYXJpemVWaWV3cyhuYW1lLCBmbiwgYWxsLCBjb25zaWQsIHZhbGlkKSB7XG4gIHJldHVybiB7bmFtZTogbmFtZSwgYWxsOiBmbihhbGwpLCBjb25zaWRlcmF0aW9uOiBmbihjb25zaWQpLCB2YWxpZGF0aW9uOiBmbih2YWxpZCl9XG59XG5leHBvcnQgZnVuY3Rpb24gc3VtbWFyaXplRGF0YShhbGwsY29uc2lkLHZhbGlkKSB7XG4gIHJldHVybiBbXG4gICAgICBzdW1tYXJpemVWaWV3cyhcIkRpc3RpbmN0IFVSTHNcIixudW1WaWV3cyxhbGwsY29uc2lkLHZhbGlkKVxuICAgICwgc3VtbWFyaXplVmlld3MoXCJBdmVyYWdlIFZpZXdzXCIsYXZnVmlld3MsYWxsLGNvbnNpZCx2YWxpZClcbiAgICAsIHN1bW1hcml6ZVZpZXdzKFwiTWVkaWFuIFZpZXdzXCIsbWVkaWFuVmlld3MsYWxsLGNvbnNpZCx2YWxpZClcbiAgXVxufVxuXG5cblxuLy8gUHJvY2VzcyByZWxhdGl2ZSB0aW1pbmcgZGF0YVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvY2Vzc0RhdGEoYmVmb3JlX3VybHMsIGFmdGVyX3VybHMsIGJlZm9yZV9wb3MsIGFmdGVyX3BvcywgZG9tYWluKSB7XG5cbiAgICBjb25zdCB7IHVybHMgLCBrd3MgfSA9IHVybHNBbmRLZXl3b3JkcyhiZWZvcmVfdXJscywgYWZ0ZXJfdXJscywgZG9tYWluKVxuICAgIGNvbnN0IHsgdXJsc19jb25zaWQgLCB1cmxzX3ZhbGlkICwga3dzX2NvbnNpZCAsIGt3c192YWxpZCB9ID0gdmFsaWRDb25zaWQodXJscywga3dzLCBiZWZvcmVfcG9zLCBhZnRlcl9wb3MpXG5cbiAgICBjb25zdCB1cmxfc3VtbWFyeSA9IHN1bW1hcml6ZURhdGEodXJscywgdXJsc19jb25zaWQsIHVybHNfdmFsaWQpXG4gICAgY29uc3Qga3dzX3N1bW1hcnkgPSBzdW1tYXJpemVEYXRhKGt3cywga3dzX2NvbnNpZCwga3dzX3ZhbGlkIClcblxuICAgIHJldHVybiB7XG4gICAgICB1cmxfc3VtbWFyeSxcbiAgICAgIGt3c19zdW1tYXJ5LFxuICAgICAgdXJscyxcbiAgICAgIHVybHNfY29uc2lkICxcbiAgICAgIHVybHNfdmFsaWQgLFxuICAgICAga3dzLFxuICAgICAga3dzX2NvbnNpZCAsXG4gICAgICBrd3NfdmFsaWQgXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgZDNfY2xhc3MsIG5vb3AsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCB7dGFibGUsIHN1bW1hcnlfdGFibGV9IGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzLCBiZWZvcmVfYWZ0ZXJfdGltZXNlcmllc30gZnJvbSAnY2hhcnQnXG5pbXBvcnQge3RhYnVsYXJfdGltZXNlcmllcywgdmVydGljYWxfb3B0aW9ufSBmcm9tICdjb21wb25lbnQnXG5cbmltcG9ydCB7cm9sbHVwQmVmb3JlQW5kQWZ0ZXIsIHByb2Nlc3NEYXRhLCBidWNrZXRzfSBmcm9tICcuL3JlZmluZV9yZWxhdGl2ZV9wcm9jZXNzJ1xuaW1wb3J0ICcuL3JlZmluZV9yZWxhdGl2ZS5jc3MnXG5cblxuZnVuY3Rpb24gc2VsZWN0T3B0aW9uUmVjdCh0ZCxvcHRpb25zLGJlZm9yZV9wb3MsYWZ0ZXJfcG9zKSB7XG5cbiAgdmFyIHN1YnNldCA9IHRkLnNlbGVjdEFsbChcInN2Z1wiKS5zZWxlY3RBbGwoXCJyZWN0XCIpXG4gICAgLmF0dHIoXCJmaWxsXCIsdW5kZWZpbmVkKS5maWx0ZXIoKHgsaSkgPT4ge1xuICAgICAgdmFyIHZhbHVlID0gb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZVxuICAgICAgaWYgKHZhbHVlID09IFwiYWxsXCIpIHJldHVybiBmYWxzZVxuICAgICAgaWYgKHZhbHVlID09IFwiY29uc2lkZXJhdGlvblwiKSByZXR1cm4gKGkgPCBiZWZvcmVfcG9zKSB8fCAoaSA+IGJ1Y2tldHMubGVuZ3RoLzIgLSAxIClcbiAgICAgIGlmICh2YWx1ZSA9PSBcInZhbGlkYXRpb25cIikgcmV0dXJuIChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKVxuICAgIH0pXG5cbiAgc3Vic2V0LmF0dHIoXCJmaWxsXCIsXCJncmV5XCIpXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVmaW5lX3JlbGF0aXZlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFJlZmluZVJlbGF0aXZlKHRhcmdldClcbn1cblxuY2xhc3MgUmVmaW5lUmVsYXRpdmUgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcih0YXJnZXQpXG4gICAgdGhpcy5fb3B0aW9ucyA9IFtcbiAgICAgICAge1wia2V5XCI6XCJBbGxcIixcInZhbHVlXCI6XCJhbGxcIiwgXCJzZWxlY3RlZFwiOjF9XG4gICAgICAsIHtcImtleVwiOlwiQ29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcImNvbnNpZGVyYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgICAsIHtcImtleVwiOlwiVmFsaWRhdGlvblwiLFwidmFsdWVcIjpcInZhbGlkYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgXVxuICAgIHRoaXMuX3N1bW1hcnlfaGVhZGVycyA9IFtcbiAgICAgICAge1wia2V5XCI6XCJuYW1lXCIsXCJ2YWx1ZVwiOlwiXCJ9XG4gICAgICAsIHtcImtleVwiOlwiYWxsXCIsXCJ2YWx1ZVwiOlwiQWxsXCJ9XG4gICAgICAsIHtcImtleVwiOlwiY29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcIkNvbnNpZGVyYXRpb25cIn1cbiAgICAgICwge1wia2V5XCI6XCJ2YWxpZGF0aW9uXCIsXCJ2YWx1ZVwiOlwiVmFsaWRhdGlvblwifVxuICAgIF1cbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiLFwiZG9tYWluXCIsXCJzdGFnZXNcIixcImJlZm9yZV91cmxzXCIsXCJhZnRlcl91cmxzXCIsXCJzdW1tYXJ5X2hlYWRlcnNcIixcIm9wdGlvbnNcIl0gfVxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgdGQgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJyZWZpbmUtcmVsYXRpdmVcIilcbiAgICB2YXIgYmVmb3JlX3VybHMgPSB0aGlzLl9iZWZvcmVfdXJsc1xuICAgICAgLCBhZnRlcl91cmxzID0gdGhpcy5fYWZ0ZXJfdXJsc1xuICAgICAgLCBkID0gdGhpcy5fZGF0YVxuICAgICAgLCBzdGFnZXMgPSB0aGlzLl9zdGFnZXNcbiAgICAgICwgc3VtbWFyeV9oZWFkZXJzID0gdGhpcy5fc3VtbWFyeV9oZWFkZXJzXG4gICAgICAsIG9wdGlvbnMgPSB0aGlzLl9vcHRpb25zXG5cbiAgICB2YXIgYmVmb3JlX3BvcywgYWZ0ZXJfcG9zO1xuXG4gICAgYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgaWYgKHN0YWdlcy5jb25zaWRlcmF0aW9uID09IHgpIGJlZm9yZV9wb3MgPSBpXG4gICAgICAgaWYgKHN0YWdlcy52YWxpZGF0aW9uID09IHgpIGFmdGVyX3BvcyA9IGlcbiAgICB9KVxuXG4gICAgdmFyIG92ZXJhbGxfcm9sbHVwID0gcm9sbHVwQmVmb3JlQW5kQWZ0ZXIoYmVmb3JlX3VybHMsIGFmdGVyX3VybHMpXG4gICAgdmFyIHtcbiAgICAgICAgdXJsX3N1bW1hcnlcbiAgICAgICwgdXJsc1xuICAgICAgLCB1cmxzX2NvbnNpZFxuICAgICAgLCB1cmxzX3ZhbGlkXG5cbiAgICAgICwga3dzX3N1bW1hcnlcbiAgICAgICwga3dzXG4gICAgICAsIGt3c19jb25zaWRcbiAgICAgICwga3dzX3ZhbGlkIFxuXG4gICAgfSA9IHByb2Nlc3NEYXRhKGJlZm9yZV91cmxzLGFmdGVyX3VybHMsYmVmb3JlX3BvcyxhZnRlcl9wb3MsZC5kb21haW4pXG5cblxuXG5cbiAgICBjb25zdCBzdW1tYXJ5X3JvdyA9IGQzX2NsYXNzKHRkLFwic3VtbWFyeS1yb3dcIilcblxuICAgIGQzX2NsYXNzKHN1bW1hcnlfcm93LFwidGl0bGVcIilcbiAgICAgIC50ZXh0KFwiQmVmb3JlIGFuZCBBZnRlcjogXCIgKyBkLmRvbWFpbilcblxuICAgIGJlZm9yZV9hZnRlcl90aW1lc2VyaWVzKHN1bW1hcnlfcm93KVxuICAgICAgLmRhdGEob3ZlcmFsbF9yb2xsdXApXG4gICAgICAuYmVmb3JlKGJlZm9yZV9wb3MpXG4gICAgICAuYWZ0ZXIoYWZ0ZXJfcG9zKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIHZvcHRpb25zID0gdmVydGljYWxfb3B0aW9uKHN1bW1hcnlfcm93KVxuICAgICAgLm9wdGlvbnMob3B0aW9ucylcbiAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgIG9wdGlvbnMubWFwKHogPT4gei5zZWxlY3RlZCA9IHgua2V5ID09IHoua2V5ID8gMTogMClcbiAgICAgICAgdm9wdGlvbnNcbiAgICAgICAgICAub3B0aW9ucyhvcHRpb25zKSBcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgc2VsZWN0T3B0aW9uUmVjdCh0ZCxvcHRpb25zLGJlZm9yZV9wb3MsYWZ0ZXJfcG9zKVxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcblxuICAgIGQzX2NsYXNzKHN1bW1hcnlfcm93LFwiZGVzY3JpcHRpb25cIilcbiAgICAgIC50ZXh0KFwiU2VsZWN0IGRvbWFpbnMgYW5kIGtleXdvcmRzIHRvIGJ1aWxkIGFuZCByZWZpbmUgeW91ciBnbG9iYWwgZmlsdGVyXCIpXG5cblxuXG5cbiAgICBjb25zdCB0YWJsZXMgPSBkM19jbGFzcyh0ZCxcInRhYmxlcy1yb3dcIilcblxuICAgIHN1bW1hcnlfdGFibGUoZDNfY2xhc3ModGFibGVzLFwidXJsXCIpKVxuICAgICAgLnRpdGxlKFwiVVJMIFN1bW1hcnlcIilcbiAgICAgIC5kYXRhKHVybF9zdW1tYXJ5KVxuICAgICAgLmhlYWRlcnMoc3VtbWFyeV9oZWFkZXJzKVxuICAgICAgLmRyYXcoKVxuXG4gICAgc3VtbWFyeV90YWJsZShkM19jbGFzcyh0YWJsZXMsXCJrd1wiKSlcbiAgICAgIC50aXRsZShcIktleXdvcmQgU3VtbWFyeVwiKVxuICAgICAgLmRhdGEoa3dzX3N1bW1hcnkpXG4gICAgICAuaGVhZGVycyhzdW1tYXJ5X2hlYWRlcnMpXG4gICAgICAuZHJhdygpXG5cblxuXG5cbiAgICBjb25zdCBtb2RpZnkgPSBkM19jbGFzcyh0ZCxcIm1vZGlmeS1yb3dcIilcblxuICAgIGQzX2NsYXNzKG1vZGlmeSxcImFjdGlvbi1oZWFkZXJcIilcbiAgICAgIC50ZXh0KFwiRXhwbG9yZSBhbmQgUmVmaW5lXCIpXG5cbiAgICB0YWJ1bGFyX3RpbWVzZXJpZXMoZDNfY2xhc3MobW9kaWZ5LFwidXJsLWRlcHRoXCIpKVxuICAgICAgLmhlYWRlcnMoW1wiQmVmb3JlXCIsXCJBZnRlclwiXSlcbiAgICAgIC5sYWJlbChcIlVSTFwiKVxuICAgICAgLmRhdGEodXJscylcbiAgICAgIC5zcGxpdCh0aGlzLmRvbWFpbigpKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdGFidWxhcl90aW1lc2VyaWVzKGQzX2NsYXNzKG1vZGlmeSxcImt3LWRlcHRoXCIpKVxuICAgICAgLmhlYWRlcnMoW1wiQmVmb3JlXCIsXCJBZnRlclwiXSlcbiAgICAgIC5sYWJlbChcIktleXdvcmRzXCIpXG4gICAgICAuZGF0YShrd3MpXG4gICAgICAuZHJhdygpXG5cbiAgfVxuXG59XG5cblxuIiwiZXhwb3J0IGNvbnN0IGNhdGVnb3J5V2VpZ2h0cyA9IChjYXRlZ29yaWVzKSA9PiB7XG4gIHJldHVybiBjYXRlZ29yaWVzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICBwW2Mua2V5XSA9ICgxICsgYy52YWx1ZXNbMF0ucGVyY2VudF9kaWZmKVxuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KVxufVxuXG5mdW5jdGlvbiBwcmVmaXhEb21haW5XZWlnaHRzUmVkdWNlcihwcmVmaXgsd2VpZ2h0cywgcCxjKSB7XG4gICAgICBwW2MuZG9tYWluXSA9IHBbYy5kb21haW5dIHx8IHt9XG4gICAgICBwW2MuZG9tYWluXVsnZG9tYWluJ10gPSBjLmRvbWFpblxuICAgICAgcFtjLmRvbWFpbl1bJ3dlaWdodGVkJ10gPSBjLnZpc2l0cyAqIHdlaWdodHNbYy5wYXJlbnRfY2F0ZWdvcnlfbmFtZV1cbiAgICAgIFxuICAgICAgcFtjLmRvbWFpbl1bcHJlZml4ICsgYy50aW1lX2RpZmZfYnVja2V0XSA9IChwW2MuZG9tYWluXVtjLnRpbWVfZGlmZl9idWNrZXRdIHx8IDApICsgYy52aXNpdHNcbiAgICAgIHJldHVybiBwXG59XG5leHBvcnQgY29uc3QgYmVmb3JlQW5kQWZ0ZXJUYWJ1bGFyID0gKGJlZm9yZSwgYWZ0ZXIsIHdlaWdodHMpID0+IHtcbiAgY29uc3QgZG9tYWluX3RpbWUgPSB7fVxuXG4gIGJlZm9yZS5yZWR1Y2UocHJlZml4RG9tYWluV2VpZ2h0c1JlZHVjZXIuYmluZChmYWxzZSxcIlwiLHdlaWdodHMpLGRvbWFpbl90aW1lKVxuICBhZnRlci5yZWR1Y2UocHJlZml4RG9tYWluV2VpZ2h0c1JlZHVjZXIuYmluZChmYWxzZSxcIi1cIix3ZWlnaHRzKSxkb21haW5fdGltZSlcblxuICBjb25zdCBzb3J0ZWQgPSBPYmplY3Qua2V5cyhkb21haW5fdGltZSlcbiAgICAubWFwKChrKSA9PiB7IHJldHVybiBkb21haW5fdGltZVtrXSB9KVxuICAgIC5zb3J0KChwLGMpID0+IHtcbiAgICAgIHJldHVybiBkMy5kZXNjZW5kaW5nKHBbJzYwMCddKnAud2VpZ2h0ZWQgfHwgLUluZmluaXR5LGNbJzYwMCddKmMud2VpZ2h0ZWQgfHwgLUluZmluaXR5KVxuICAgIH0pXG5cbiAgcmV0dXJuIHNvcnRlZFxufVxuXG5leHBvcnQgY29uc3QgY29tcHV0ZVNjYWxlID0gKGRhdGEpID0+IHtcbiAgY29uc3QgbWF4ID0gZGF0YS5yZWR1Y2UoKHAsYykgPT4ge1xuICAgIE9iamVjdC5rZXlzKGMpLmZpbHRlcih6ID0+IHogIT0gXCJkb21haW5cIiAmJiB6ICE9IFwid2VpZ2h0ZWRcIikubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHAgPSBjW3hdID4gcCA/IGNbeF0gOiBwXG4gICAgfSlcbiAgXG4gICAgcmV0dXJuIHBcbiAgfSwwKVxuXG4gIHJldHVybiBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbMCwuOF0pLmRvbWFpbihbMCxNYXRoLmxvZyhtYXgpXSlcbn1cbiIsInZhciBidWNrZXRzID0gWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ucmV2ZXJzZSgpLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiBTdHJpbmcoeCo2MCkgfSlcbmJ1Y2tldHMgPSBidWNrZXRzLmNvbmNhdChbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKC14KjYwKSB9KSlcblxuXG5jb25zdCBmb3JtYXROYW1lID0gZnVuY3Rpb24oeCkge1xuXG4gIGlmICh4IDwgMCkgeCA9IC14XG5cbiAgaWYgKHggPT0gMzYwMCkgcmV0dXJuIFwiMSBoclwiXG4gIGlmICh4IDwgMzYwMCkgcmV0dXJuIHgvNjAgKyBcIiBtaW5zXCIgXG5cbiAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgaWYgKHggPiA4NjQwMCkgcmV0dXJuIHgvODY0MDAgKyBcIiBkYXlzXCIgXG5cbiAgcmV0dXJuIHgvMzYwMCArIFwiIGhyc1wiXG59XG5cbmV4cG9ydCBjb25zdCB0aW1pbmdIZWFkZXJzID0gYnVja2V0cy5tYXAoeCA9PiB7IHJldHVybiB7XCJrZXlcIjp4LCBcInZhbHVlXCI6Zm9ybWF0TmFtZSh4KSwgXCJzZWxlY3RlZFwiOnRydWV9IH0pXG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0LCBkM19jbGFzcywgRDNDb21wb25lbnRCYXNlfSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi8uLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCB0YWJsZSBmcm9tICd0YWJsZSdcblxuaW1wb3J0IHJlZmluZV9yZWxhdGl2ZSBmcm9tICcuL3JlZmluZV9yZWxhdGl2ZSdcbmltcG9ydCB7Y2F0ZWdvcnlXZWlnaHRzLCBiZWZvcmVBbmRBZnRlclRhYnVsYXIsIGNvbXB1dGVTY2FsZX0gZnJvbSAnLi9yZWxhdGl2ZV90aW1pbmdfcHJvY2VzcydcbmltcG9ydCB7dGltaW5nSGVhZGVyc30gZnJvbSAnLi9yZWxhdGl2ZV90aW1pbmdfY29uc3RhbnRzJ1xuXG5pbXBvcnQge2RyYXdTdHJlYW19IGZyb20gJy4uL3N1bW1hcnkvYmVmb3JlX2FuZF9hZnRlcidcbmltcG9ydCB7c2ltcGxlVGltZXNlcmllc30gZnJvbSAnY2hhcnQnXG5cbmltcG9ydCAnLi9yZWxhdGl2ZV90aW1pbmcuY3NzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZWxhdGl2ZV90aW1pbmcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgUmVsYXRpdmVUaW1pbmcodGFyZ2V0KVxufVxuXG5jbGFzcyBSZWxhdGl2ZVRpbWluZyBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKHRhcmdldClcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiXSB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YVxuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwic3VtbWFyeS13cmFwXCIpXG5cbiAgICBoZWFkZXIod3JhcClcbiAgICAgIC50ZXh0KFwiQmVmb3JlIGFuZCBBZnRlclwiKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIGJhd3JhcCA9IGQzX2NsYXNzKHdyYXAsXCJiYS1yb3dcIilcblxuICAgIHRyeSB7XG4gICAgICB2YXIgc3RhZ2VzID0gZHJhd1N0cmVhbShiYXdyYXAsdGhpcy5fZGF0YS5iZWZvcmVfY2F0ZWdvcmllcyx0aGlzLl9kYXRhLmFmdGVyX2NhdGVnb3JpZXMpXG4gICAgICAvL2Jhd3JhcC5zZWxlY3RBbGwoXCIuYmVmb3JlLXN0cmVhbVwiKS5yZW1vdmUoKSAvLyBIQUNLXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBiYXdyYXAuaHRtbChcIlwiKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc3Qgd2VpZ2h0cyA9IGNhdGVnb3J5V2VpZ2h0cyhkYXRhLmJlZm9yZV9jYXRlZ29yaWVzKVxuICAgIGNvbnN0IHNvcnRlZF90YWJ1bGFyID0gYmVmb3JlQW5kQWZ0ZXJUYWJ1bGFyKGRhdGEuYmVmb3JlLGRhdGEuYWZ0ZXIsd2VpZ2h0cylcbiAgICAgIC5zbGljZSgwLDEwMDApXG5cbiAgICBjb25zdCBvc2NhbGUgPSBjb21wdXRlU2NhbGUoc29ydGVkX3RhYnVsYXIpXG4gICAgY29uc3QgaGVhZGVycyA9IFt7XCJrZXlcIjpcImRvbWFpblwiLCBcInZhbHVlXCI6XCJEb21haW5cIn1dLmNvbmNhdCh0aW1pbmdIZWFkZXJzKVxuXG4gICAgdGFibGUoYmF3cmFwKVxuICAgICAgLnRvcCgxNDApXG4gICAgICAuaGVhZGVycyhoZWFkZXJzKVxuICAgICAgLm9uKFwiZXhwYW5kXCIsZnVuY3Rpb24oZCx0ZCkge1xuXG4gICAgICAgIHJlZmluZV9yZWxhdGl2ZSh0ZClcbiAgICAgICAgICAuZGF0YShkKVxuICAgICAgICAgIC5kb21haW4oZC5kb21haW4pXG4gICAgICAgICAgLnN0YWdlcyhzdGFnZXMpXG4gICAgICAgICAgLmJlZm9yZV91cmxzKGRhdGEuYmVmb3JlLmZpbHRlcih5ID0+IHkuZG9tYWluID09IGQuZG9tYWluKSApXG4gICAgICAgICAgLmFmdGVyX3VybHMoZGF0YS5hZnRlci5maWx0ZXIoeSA9PiB5LmRvbWFpbiA9PSBkLmRvbWFpbikpXG4gICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgIH0pXG4gICAgICAub24oXCJkcmF3XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCJ0aFwiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCJzcGFuXCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJsZXNzLXRoYW5cIiwgKHgpID0+IHsgcmV0dXJuIHBhcnNlSW50KHgua2V5KSA9PSB4LmtleSAmJiB4LmtleSA8IDAgfSlcbiAgICAgICAgICAuY2xhc3NlZChcImdyZWF0ZXItdGhhblwiLCAoeCkgPT4geyByZXR1cm4gcGFyc2VJbnQoeC5rZXkpID09IHgua2V5ICYmIHgua2V5ID4gMCB9KVxuXG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCIudGFibGUtb3B0aW9uXCIpXG4gICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwibm9uZVwiKVxuXG4gICAgICAgIHRoaXMuX3RhcmdldC5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpub3QoOmZpcnN0LWNoaWxkKVwiKVxuICAgICAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkIHdoaXRlXCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fW3hbJ2tleSddXSB8fCAwXG4gICAgICAgICAgICByZXR1cm4gXCJyZ2JhKDcwLCAxMzAsIDE4MCxcIiArIG9zY2FsZShNYXRoLmxvZyh2YWx1ZSsxKSkgKyBcIilcIlxuICAgICAgICAgIH0pICAgICBcbiAgICAgIH0pXG4gICAgICAub3B0aW9uX3RleHQoXCI8ZGl2IHN0eWxlPSd3aWR0aDo0MHB4O3RleHQtYWxpZ246Y2VudGVyJz4mIzY1MjkxOzwvZGl2PlwiKVxuICAgICAgLmRhdGEoe1widmFsdWVzXCI6c29ydGVkX3RhYnVsYXJ9KVxuICAgICAgLmRyYXcoKVxuXG4gIH1cbn1cbiIsImltcG9ydCB7aG91cmJ1Y2tldHN9IGZyb20gJy4vdGltaW5nX2NvbnN0YW50cydcblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEhvdXIoaCkge1xuICBpZiAoaCA9PSAwKSByZXR1cm4gXCIxMiBhbVwiXG4gIGlmIChoID09IDEyKSByZXR1cm4gXCIxMiBwbVwiXG4gIGlmIChoID4gMTIpIHJldHVybiAoaC0xMikgKyBcIiBwbVwiXG4gIHJldHVybiAoaCA8IDEwID8gaFsxXSA6IGgpICsgXCIgYW1cIlxufVxuXG5leHBvcnQgY29uc3QgdGltaW5nVGFidWxhciA9IChkYXRhKSA9PiB7XG4gIHJldHVybiBkMy5uZXN0KClcbiAgICAua2V5KHggPT4geC5kb21haW4pXG4gICAgLmtleSh4ID0+IHguaG91cilcbiAgICAuZW50cmllcyhkYXRhKVxuICAgIC5tYXAoeCA9PiB7XG4gICAgICB2YXIgb2JqID0geC52YWx1ZXMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgcFtjLmtleV0gPSBjLnZhbHVlc1xuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7fSlcblxuICAgICAgeC5idWNrZXRzID0gaG91cmJ1Y2tldHMubWFwKHogPT4ge1xuICAgICAgICB2YXIgbyA9IHsgdmFsdWVzOiBvYmpbel0sIGtleTogZm9ybWF0SG91cih6KSB9XG4gICAgICAgIG8udmlld3MgPSBkMy5zdW0ob2JqW3pdIHx8IFtdLCBxID0+IHEudW5pcXVlcylcbiAgICAgICAgcmV0dXJuIG9cbiAgICAgIH0pXG5cbiAgICAgIHgudGFidWxhciA9IHguYnVja2V0cy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBwW2Mua2V5XSA9IGMudmlld3MgfHwgdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICB4LnRhYnVsYXJbXCJkb21haW5cIl0gPSB4LmtleVxuICAgICAgeC50YWJ1bGFyW1widG90YWxcIl0gPSBkMy5zdW0oeC5idWNrZXRzLHggPT4geC52aWV3cylcbiAgICAgIFxuICAgICAgcmV0dXJuIHhcbiAgICB9KVxufVxuXG5leHBvcnQgY29uc3QgY29tcHV0ZVNjYWxlID0gKGRhdGEpID0+IHtcblxuICBjb25zdCBtYXggPSAxMDAwIC8vIG5lZWQgdG8gYWN0dWFsbHkgY29tcHV0ZSB0aGlzIGZyb20gZGF0YVxuXG4gIHJldHVybiBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbMCwuOF0pLmRvbWFpbihbMCxNYXRoLmxvZyhtYXgpXSlcbn1cbiIsImltcG9ydCB7Zm9ybWF0SG91cn0gZnJvbSAnLi90aW1pbmdfcHJvY2VzcydcblxuZXhwb3J0IGNvbnN0IGhvdXJidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkubWFwKHggPT4gU3RyaW5nKHgpLmxlbmd0aCA+IDEgPyBTdHJpbmcoeCkgOiBcIjBcIiArIHgpXG5cbmV4cG9ydCBjb25zdCB0aW1pbmdIZWFkZXJzID0gaG91cmJ1Y2tldHMubWFwKGZvcm1hdEhvdXIpLm1hcCh4ID0+IHsgcmV0dXJuIHtrZXk6IHgsIHZhbHVlOiB4fSB9KVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdCwgZDNfY2xhc3MsIEQzQ29tcG9uZW50QmFzZSwgbm9vcH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQgKiBhcyB0aW1lc2VyaWVzIGZyb20gJy4uLy4uL2dlbmVyaWMvdGltZXNlcmllcydcbmltcG9ydCB7ZG9tYWluX2V4cGFuZGVkfSBmcm9tICdjb21wb25lbnQnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuXG5pbXBvcnQge2hvdXJidWNrZXRzLCB0aW1pbmdIZWFkZXJzfSBmcm9tICcuL3RpbWluZ19jb25zdGFudHMnXG5pbXBvcnQge3RpbWluZ1RhYnVsYXIsIGNvbXB1dGVTY2FsZX0gZnJvbSAnLi90aW1pbmdfcHJvY2VzcydcblxuXG5pbXBvcnQgJy4vdGltaW5nLmNzcydcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0aW1pbmcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGltaW5nKHRhcmdldClcbn1cblxuY2xhc3MgVGltaW5nIGV4dGVuZHMgRDNDb21wb25lbnRCYXNlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgc3VwZXIodGFyZ2V0KVxuICB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YVxuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwidGltaW5nLXdyYXBcIilcblxuICAgIGNvbnN0IGhlYWRlcnMgPSBbe2tleTpcImRvbWFpblwiLHZhbHVlOlwiRG9tYWluXCJ9XS5jb25jYXQodGltaW5nSGVhZGVycylcbiAgICBjb25zdCBkID0gdGltaW5nVGFidWxhcihkYXRhLmZ1bGxfdXJscylcbiAgICBjb25zdCBvc2NhbGUgPSBjb21wdXRlU2NhbGUoZClcblxuXG4gICAgaGVhZGVyKHdyYXApXG4gICAgICAudGV4dChcIlRpbWluZ1wiKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIHRpbWluZ3dyYXAgPSBkM19jbGFzcyh3cmFwLFwidGltaW5nLXJvd1wiKVxuXG4gICAgdmFyIHRhYmxlX29iaiA9IHRhYmxlKHRpbWluZ3dyYXApXG4gICAgICAudG9wKDE0MClcbiAgICAgIC5oZWFkZXJzKGhlYWRlcnMpXG4gICAgICAuZGF0YSh7XCJrZXlcIjpcIlwiLCBcInZhbHVlc1wiOmQubWFwKHggPT4geC50YWJ1bGFyKSB9KVxuICAgICAgLnNvcnQoXCJ0b3RhbFwiKVxuICAgICAgLnNraXBfb3B0aW9uKHRydWUpXG4gICAgICAub24oXCJleHBhbmRcIixmdW5jdGlvbihkLHRkKSB7XG5cbiAgICAgICAgdmFyIGRkID0gZGF0YS5mdWxsX3VybHMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguZG9tYWluID09IGQuZG9tYWluIH0pXG4gICAgICAgIHZhciByb2xsZWQgPSB0aW1lc2VyaWVzLnByZXBEYXRhKGRkKVxuICAgICAgICBcbiAgICAgICAgZG9tYWluX2V4cGFuZGVkKHRkKVxuICAgICAgICAgIC5kb21haW4oZGRbMF0uZG9tYWluKVxuICAgICAgICAgIC5yYXcoZGQpXG4gICAgICAgICAgLmRhdGEocm9sbGVkKVxuICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgIH0pXG4gICAgICAub24oXCJkcmF3XCIsZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm5vdCg6Zmlyc3QtY2hpbGQpXCIpXG4gICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfX1t4WydrZXknXV0gfHwgMFxuICAgICAgICAgICAgcmV0dXJuIFwicmdiYSg3MCwgMTMwLCAxODAsXCIgKyBvc2NhbGUoTWF0aC5sb2codmFsdWUrMSkpICsgXCIpXCJcbiAgICAgICAgICB9KVxuICAgICAgfSlcbiAgICAgIC5kcmF3KClcbiAgICBcbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBkM19jbGFzcyh0YXJnZXQsY2xzLHR5cGUpIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLlwiICsgY2xzLCB0eXBlIHx8IFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN0YWdlZF9maWx0ZXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU3RhZ2VkRmlsdGVyKHRhcmdldClcbn1cblxuY2xhc3MgU3RhZ2VkRmlsdGVyIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICB9XG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuXG4gIG9uKGFjdGlvbiwgZm4pIHtcbiAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG5cbiAgZHJhdygpIHtcbiAgICB2YXIgb3dyYXAgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJmb290ZXItd3JhcFwiKVxuICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjVweFwiKVxuICAgICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiNjBweFwiKVxuICAgICAgLnN0eWxlKFwiYm90dG9tXCIsXCIwcHhcIilcbiAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJmaXhlZFwiKVxuICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMDBweFwiKVxuICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI0YwRjRGN1wiKVxuXG4gICAgdmFyIHdyYXAgPSBkM19jbGFzcyhvd3JhcCxcImlubmVyLXdyYXBcIilcbiAgICAgIC5zdHlsZShcImJvcmRlci10b3BcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiNXB4XCIpXG5cbiAgICBkM19jbGFzcyh3cmFwLFwiaGVhZGVyLWxhYmVsXCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzVweFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxNHB4XCIpXG4gICAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzg4ODg4OFwiKVxuICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjIwMHB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAudGV4dChcIkJ1aWxkIEZpbHRlcnNcIilcblxuICAgIGQzX2NsYXNzKHdyYXAsXCJ0ZXh0LWxhYmVsXCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzVweFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNjBweFwiKVxuICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwibm9uZVwiKVxuICAgICAgLnRleHQoXCJUaXRsZVwiKVxuXG4gICAgdmFyIHNlbGVjdF9ib3ggPSBzZWxlY3Qod3JhcClcbiAgICAgIC5vcHRpb25zKFtcbiAgICAgICAgICB7XCJrZXlcIjpcImNvbnRhaW5zXCIsXCJ2YWx1ZVwiOlwiY29udGFpbnNcIn1cbiAgICAgICAgLCB7XCJrZXlcIjpcImRvZXMgbm90IGNvbnRhaW5cIixcInZhbHVlXCI6XCJkb2VzIG5vdCBjb250YWluXCJ9XG4gICAgICBdKVxuICAgICAgLmRyYXcoKVxuICAgICAgLl9zZWxlY3RcbiAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cblxuXG4gICAgdmFyIGZvb3Rlcl9yb3cgPSBkM19jbGFzcyh3cmFwLFwiZm9vdGVyLXJvd1wiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cblxuICAgIHZhciBzZWxlY3RfdmFsdWUgPSB0aGlzLmRhdGEoKVxuXG4gICAgZnVuY3Rpb24gYnVpbGRGaWx0ZXJJbnB1dCgpIHtcblxuICAgICAgZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkZXN0cm95ID0gZDMuc2VsZWN0KHRoaXMpLm9uKFwiZGVzdHJveVwiKVxuICAgICAgICAgIGlmIChkZXN0cm95KSBkZXN0cm95KClcbiAgICAgICAgfSlcblxuXG4gICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmb290ZXJfcm93LFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgICAgLmF0dHIoXCJ2YWx1ZVwiLHNlbGVjdF92YWx1ZSlcbiAgICAgICAgLnByb3BlcnR5KFwidmFsdWVcIixzZWxlY3RfdmFsdWUpXG5cbiAgICAgIFxuXG5cbiAgICAgIHZhciBzID0gJChzZWxlY3Qubm9kZSgpKS5zZWxlY3RpemUoe1xuICAgICAgICBwZXJzaXN0OiBmYWxzZSxcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxlY3RfdmFsdWUgPSAoc2VsZWN0X3ZhbHVlLmxlbmd0aCA/IHNlbGVjdF92YWx1ZSArIFwiLFwiIDogXCJcIikgKyB4XG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxlY3RfdmFsdWUpXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHZhbHVlOiB4LCB0ZXh0OiB4XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvbkRlbGV0ZTogZnVuY3Rpb24oeCl7XG4gICAgICAgICAgc2VsZWN0X3ZhbHVlID0gc2VsZWN0X3ZhbHVlLnNwbGl0KFwiLFwiKS5maWx0ZXIoZnVuY3Rpb24oeikgeyByZXR1cm4geiAhPSB4WzBdfSkuam9pbihcIixcIilcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGVjdF92YWx1ZSlcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGZvb3Rlcl9yb3cuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgIC5vbihcImRlc3Ryb3lcIixmdW5jdGlvbigpIHtcbiAgICAgICAgICBzWzBdLnNlbGVjdGl6ZS5kZXN0cm95KClcbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIGJ1aWxkRmlsdGVySW5wdXQoKVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgZDNfY2xhc3Mod3JhcCxcImluY2x1ZGUtc3VibWl0XCIsXCJidXR0b25cIilcbiAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJyaWdodFwiKVxuICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxMjBweFwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjlweFwiKVxuICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2Y5ZjlmYlwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAuYXR0cihcInR5cGVcIixcInN1Ym1pdFwiKVxuICAgICAgLnRleHQoXCJNb2RpZnkgRmlsdGVyc1wiKVxuICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCJpbnB1dFwiKS5wcm9wZXJ0eShcInZhbHVlXCIpXG4gICAgICAgIHZhciBvcCA9ICBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18ua2V5ICsgXCIuc2VsZWN0aXplXCJcbiAgICAgICAgXG4gICAgICAgIHNlbGYub24oXCJtb2RpZnlcIikoe1wiZmllbGRcIjpcIlRpdGxlXCIsXCJvcFwiOm9wLFwidmFsdWVcIjp2YWx1ZX0pXG4gICAgICB9KVxuXG4gICAgZDNfY2xhc3Mod3JhcCxcImV4Y2x1ZGUtc3VibWl0XCIsXCJidXR0b25cIilcbiAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJyaWdodFwiKVxuICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxMjBweFwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjlweFwiKVxuICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2Y5ZjlmYlwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAuYXR0cihcInR5cGVcIixcInN1Ym1pdFwiKVxuICAgICAgLnRleHQoXCJOZXcgRmlsdGVyXCIpXG4gICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBmb290ZXJfcm93LnNlbGVjdEFsbChcImlucHV0XCIpLnByb3BlcnR5KFwidmFsdWVcIilcbiAgICAgICAgdmFyIG9wID0gIHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXkgKyBcIi5zZWxlY3RpemVcIlxuXG4gICAgICAgIHNlbGYub24oXCJhZGRcIikoe1wiZmllbGRcIjpcIlRpdGxlXCIsXCJvcFwiOm9wLFwidmFsdWVcIjp2YWx1ZX0pXG4gICAgICB9KVxuXG5cbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuL2hlYWRlcidcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBDb25kaXRpb25hbFNob3codGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy5fY2xhc3NlcyA9IHt9XG4gIHRoaXMuX29iamVjdHMgPSB7fVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb25kaXRpb25hbF9zaG93KHRhcmdldCkge1xuICByZXR1cm4gbmV3IENvbmRpdGlvbmFsU2hvdyh0YXJnZXQpXG59XG5cbkNvbmRpdGlvbmFsU2hvdy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBjbGFzc2VkOiBmdW5jdGlvbihrLCB2KSB7XG4gICAgICBpZiAoayA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fY2xhc3Nlc1xuICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2NsYXNzZXNba10gXG4gICAgICB0aGlzLl9jbGFzc2VzW2tdID0gdjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSAgXG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24gKCkge1xuXG4gICAgICB2YXIgY2xhc3NlcyA9IHRoaXMuY2xhc3NlZCgpXG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5jb25kaXRpb25hbC13cmFwXCIsXCJkaXZcIix0aGlzLmRhdGEoKSlcbiAgICAgICAgLmNsYXNzZWQoXCJjb25kaXRpb25hbC13cmFwXCIsdHJ1ZSlcblxuICAgICAgdmFyIG9iamVjdHMgPSBkM19zcGxhdCh3cmFwLFwiLmNvbmRpdGlvbmFsXCIsXCJkaXZcIixpZGVudGl0eSwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpIH0pXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgICAgICAuY2xhc3NlZChcImNvbmRpdGlvbmFsXCIsdHJ1ZSlcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4gIXguc2VsZWN0ZWQgfSlcblxuXG4gICAgICBPYmplY3Qua2V5cyhjbGFzc2VzKS5tYXAoZnVuY3Rpb24oaykgeyBcbiAgICAgICAgb2JqZWN0cy5jbGFzc2VkKGssY2xhc3Nlc1trXSlcbiAgICAgIH0pXG5cbiAgICAgIHRoaXMuX29iamVjdHMgPSBvYmplY3RzXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgXG4gICAgfVxuICAsIGVhY2g6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB0aGlzLmRyYXcoKVxuICAgICAgdGhpcy5fb2JqZWN0cy5lYWNoKGZuKVxuICAgICAgXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIFNoYXJlKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5faW5uZXIgPSBmdW5jdGlvbigpIHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNoYXJlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFNoYXJlKHRhcmdldClcbn1cblxuU2hhcmUucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgb3ZlcmxheSA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLm92ZXJsYXlcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIm92ZXJsYXlcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcInJnYmEoMCwwLDAsLjUpXCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIixcIjMwMVwiKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG92ZXJsYXkucmVtb3ZlKClcbiAgICAgICAgfSlcblxuICAgICAgdGhpcy5fb3ZlcmxheSA9IG92ZXJsYXk7XG5cbiAgICAgIHZhciBjZW50ZXIgPSBkM191cGRhdGVhYmxlKG92ZXJsYXksXCIucG9wdXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInBvcHVwIGNvbC1tZC01IGNvbC1zbS04XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCJhdXRvXCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjMwMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjE1MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIndoaXRlXCIpXG4gICAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJub25lXCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgICAgfSlcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHNlbGYuX2lubmVyKGQzLnNlbGVjdCh0aGlzKSlcbiAgICAgICAgfSlcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgaW5uZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB0aGlzLl9pbm5lciA9IGZuLmJpbmQodGhpcylcbiAgICAgIHRoaXMuZHJhdygpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX292ZXJsYXkucmVtb3ZlKClcbiAgICAgIHJldHVybiB0aGlzIFxuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgKiBhcyBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCB7bWVkaWFfcGxhbn0gZnJvbSAnbWVkaWFfcGxhbidcbmltcG9ydCBmaWx0ZXJfdmlldyBmcm9tICcuL3ZpZXdzL2ZpbHRlcl92aWV3J1xuaW1wb3J0IG9wdGlvbl92aWV3IGZyb20gJy4vdmlld3Mvb3B0aW9uX3ZpZXcnXG5pbXBvcnQgZG9tYWluX3ZpZXcgZnJvbSAnLi92aWV3cy9kb21haW5fdmlldydcbmltcG9ydCBzZWdtZW50X3ZpZXcgZnJvbSAnLi92aWV3cy9zZWdtZW50X3ZpZXcnXG5pbXBvcnQgc3VtbWFyeV92aWV3IGZyb20gJy4vdmlld3Mvc3VtbWFyeV92aWV3J1xuaW1wb3J0IHJlbGF0aXZlX3ZpZXcgZnJvbSAnLi92aWV3cy9yZWxhdGl2ZV90aW1pbmcvdmlldydcbmltcG9ydCB0aW1pbmdfdmlldyBmcm9tICcuL3ZpZXdzL3RpbWluZy92aWV3J1xuaW1wb3J0IHN0YWdlZF9maWx0ZXJfdmlldyBmcm9tICcuL3ZpZXdzL3N0YWdlZF9maWx0ZXJfdmlldydcblxuXG5cblxuXG5pbXBvcnQgY29uZGl0aW9uYWxfc2hvdyBmcm9tICcuL2dlbmVyaWMvY29uZGl0aW9uYWxfc2hvdydcblxuaW1wb3J0IHNoYXJlIGZyb20gJy4vZ2VuZXJpYy9zaGFyZSdcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4vaGVscGVycydcbmltcG9ydCAqIGFzIHRyYW5zZm9ybSBmcm9tICcuL2hlbHBlcnMnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5leHBvcnQgZnVuY3Rpb24gTmV3RGFzaGJvYXJkKHRhcmdldCkge1xuICB0aGlzLnRhcmdldCA9IHRhcmdldFxuICB0aGlzLl9vbiA9IHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG5ld19kYXNoYm9hcmQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgTmV3RGFzaGJvYXJkKHRhcmdldClcbn1cblxuTmV3RGFzaGJvYXJkLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIHN0YWdlZF9maWx0ZXJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3RhZ2VkX2ZpbHRlcnNcIix2YWwpIHx8IFwiXCJcbiAgICB9XG4gICwgc2F2ZWQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzYXZlZFwiLHZhbCkgXG4gICAgfVxuICAsIGxpbmVfaXRlbXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsaW5lX2l0ZW1zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBzZWxlY3RlZF9hY3Rpb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWxlY3RlZF9hY3Rpb25cIix2YWwpIFxuICAgIH1cbiAgLCBzZWxlY3RlZF9jb21wYXJpc29uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2VsZWN0ZWRfY29tcGFyaXNvblwiLHZhbCkgXG4gICAgfVxuICAsIGFjdGlvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uX2RhdGVcIix2YWwpIFxuICAgIH1cbiAgLCBjb21wYXJpc29uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uX2RhdGVcIix2YWwpIFxuICAgIH1cblxuICAsIHZpZXdfb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZpZXdfb3B0aW9uc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgbG9naWNfb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljX29wdGlvbnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGV4cGxvcmVfdGFiczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImV4cGxvcmVfdGFic1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgbG9naWNfY2F0ZWdvcmllczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljX2NhdGVnb3JpZXNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGFjdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBzdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgdGltZV9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGltZV9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBjYXRlZ29yeV9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY2F0ZWdvcnlfc3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwga2V5d29yZF9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5d29yZF9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBiZWZvcmU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiZWZvcmVcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGFmdGVyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWZ0ZXJcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGZpbHRlcnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJmaWx0ZXJzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBsb2FkaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCkgdGhpcy5fc2VnbWVudF92aWV3ICYmIHRoaXMuX3NlZ21lbnRfdmlldy5pc19sb2FkaW5nKHZhbCkuZHJhdygpXG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvYWRpbmdcIix2YWwpXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YSgpXG5cbiAgICAgIHZhciBvcHRpb25zID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnZpZXdfb3B0aW9ucygpKSlcbiAgICAgIHZhciB0YWJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmV4cGxvcmVfdGFicygpKSlcblxuXG4gICAgICB2YXIgbG9naWMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMubG9naWNfb3B0aW9ucygpKSlcbiAgICAgICAgLCBjYXRlZ29yaWVzID0gdGhpcy5sb2dpY19jYXRlZ29yaWVzKClcbiAgICAgICAgLCBmaWx0ZXJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmZpbHRlcnMoKSkpXG4gICAgICAgICwgYWN0aW9ucyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5hY3Rpb25zKCkpKVxuICAgICAgICAsIHN0YWdlZF9maWx0ZXJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnN0YWdlZF9maWx0ZXJzKCkpKVxuXG5cblxuICAgICAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdGhpcy5fc2VnbWVudF92aWV3ID0gc2VnbWVudF92aWV3KHRhcmdldClcbiAgICAgICAgLmlzX2xvYWRpbmcoc2VsZi5sb2FkaW5nKCkgfHwgZmFsc2UpXG4gICAgICAgIC5zZWdtZW50cyhhY3Rpb25zKVxuICAgICAgICAuZGF0YShzZWxmLnN1bW1hcnkoKSlcbiAgICAgICAgLmFjdGlvbihzZWxmLnNlbGVjdGVkX2FjdGlvbigpIHx8IHt9KVxuICAgICAgICAuYWN0aW9uX2RhdGUoc2VsZi5hY3Rpb25fZGF0ZSgpIHx8IFwiXCIpXG4gICAgICAgIC5jb21wYXJpc29uX2RhdGUoc2VsZi5jb21wYXJpc29uX2RhdGUoKSB8fCBcIlwiKVxuXG4gICAgICAgIC5jb21wYXJpc29uKHNlbGYuc2VsZWN0ZWRfY29tcGFyaXNvbigpIHx8IHt9KVxuICAgICAgICAub24oXCJjaGFuZ2VcIiwgdGhpcy5vbihcImFjdGlvbi5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiLCB0aGlzLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJjb21wYXJpc29uLmNoYW5nZVwiLCB0aGlzLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIiwgdGhpcy5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiLCBmdW5jdGlvbigpIHsgIFxuICAgICAgICAgIHZhciBzcyA9IHNoYXJlKGQzLnNlbGVjdChcImJvZHlcIikpLmRyYXcoKVxuICAgICAgICAgIHNzLmlubmVyKGZ1bmN0aW9uKHRhcmdldCkge1xuXG4gICAgICAgICAgICB2YXIgaGVhZGVyID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuaGVhZGVyXCIsXCJoNFwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImhlYWRlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJPcGVuIGEgc2F2ZWQgZGFzaGJvYXJkXCIpXG5cbiAgICAgICAgICAgIHZhciBmb3JtID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJkaXZcIixcImRpdlwiLHNlbGYuc2F2ZWQoKSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjI1JVwiKVxuXG4gICAgICAgICAgICBpZiAoIXNlbGYuc2F2ZWQoKSB8fCBzZWxmLnNhdmVkKCkubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShmb3JtLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgICAgICAgICAgIC50ZXh0KFwiWW91IGN1cnJlbnRseSBoYXZlIG5vIHNhdmVkIGRhc2hib2FyZHNcIilcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGQzX3NwbGF0KGZvcm0sXCIucm93XCIsXCJhXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubmFtZSB9KVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgICAgICAgICAvLy5hdHRyKFwiaHJlZlwiLCB4ID0+IHguZW5kcG9pbnQpXG4gICAgICAgICAgICAgICAgLnRleHQoeCA9PiB4Lm5hbWUpXG4gICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgICAgLy8gSEFDSzogVEhJUyBpcyBoYWNreS4uLlxuICAgICAgICAgICAgICAgICAgdmFyIF9zdGF0ZSA9IHN0YXRlLnFzKHt9KS5mcm9tKFwiP1wiICsgeC5lbmRwb2ludC5zcGxpdChcIj9cIilbMV0pXG5cbiAgICAgICAgICAgICAgICAgIHNzLmhpZGUoKVxuICAgICAgICAgICAgICAgICAgd2luZG93Lm9ucG9wc3RhdGUoe3N0YXRlOiBfc3RhdGV9KVxuICAgICAgICAgICAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgICAub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgICB2YXIgc3MgPSBzaGFyZShkMy5zZWxlY3QoXCJib2R5XCIpKS5kcmF3KClcbiAgICAgICAgICBzcy5pbm5lcihmdW5jdGlvbih0YXJnZXQpIHtcblxuICAgICAgICAgICAgdmFyIGhlYWRlciA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLmhlYWRlclwiLFwiaDRcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJoZWFkZXJcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LWZhbWlseVwiLFwiUHJveGltYU5vdmEsIHNhbnMtc2VyaWZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiU2F2ZSB0aGlzIGRhc2hib2FyZDpcIilcblxuICAgICAgICAgICAgdmFyIGZvcm0gPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdlwiLFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG4gICAgICAgICAgICB2YXIgbmFtZSA9IGQzX3VwZGF0ZWFibGUoZm9ybSwgXCIubmFtZVwiLCBcImRpdlwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKG5hbWUsXCIubGFiZWxcIixcImRpdlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiRGFzaGJvYXJkIE5hbWU6XCIpXG5cbiAgICAgICAgICAgIHZhciBuYW1lX2lucHV0ID0gZDNfdXBkYXRlYWJsZShuYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNzBweFwiKVxuICAgICAgICAgICAgICAuYXR0cihcInBsYWNlaG9sZGVyXCIsXCJNeSBhd2Vzb21lIHNlYXJjaFwiKVxuXG4gICAgICAgICAgICB2YXIgYWR2YW5jZWQgPSBkM191cGRhdGVhYmxlKGZvcm0sIFwiLmFkdmFuY2VkXCIsIFwiZGV0YWlsc1wiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImFkdmFuY2VkXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjQwMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImxlZnRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCJhdXRvXCIpXG5cblxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKGFkdmFuY2VkLFwiLmxhYmVsXCIsXCJkaXZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAudGV4dChcIkxpbmUgSXRlbTpcIilcblxuICAgICAgICAgICAgdmFyIHNlbGVjdF9ib3ggPSBzZWxlY3QoYWR2YW5jZWQpXG4gICAgICAgICAgICAgIC5vcHRpb25zKHNlbGYubGluZV9pdGVtcygpLm1hcCh4ID0+IHsgcmV0dXJuIHtrZXk6eC5saW5lX2l0ZW1fbmFtZSwgdmFsdWU6IHgubGluZV9pdGVtX2lkfSB9KSApXG4gICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI3MHB4XCIpXG5cblxuXG5cbiAgICAgICAgICAgIHZhciBzZW5kID0gZDNfdXBkYXRlYWJsZShmb3JtLCBcIi5zZW5kXCIsIFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VuZFwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc2VuZCxcImJ1dHRvblwiLFwiYnV0dG9uXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxNnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjEwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJTZW5kXCIpXG4gICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gbmFtZV9pbnB1dC5wcm9wZXJ0eShcInZhbHVlXCIpIFxuICAgICAgICAgICAgICAgIHZhciBsaW5lX2l0ZW0gPSBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnMubGVuZ3RoID8gc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleSA6IGZhbHNlXG5cbiAgICAgICAgICAgICAgICBkMy54aHIoXCIvY3J1c2hlci9zYXZlZF9kYXNoYm9hcmRcIilcbiAgICAgICAgICAgICAgICAgIC5wb3N0KEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBuYW1lXG4gICAgICAgICAgICAgICAgICAgICAgLCBcImVuZHBvaW50XCI6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAsIFwibGluZV9pdGVtXCI6IGxpbmVfaXRlbVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgKVxuXG4gICAgICAgICAgICAgICAgc3MuaGlkZSgpXG5cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLnRleHQoXCJTYXZlXCIpXG5cblxuXG4gICAgICAgICAgfSlcblxuXG4gICAgICAgIH0pXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgaWYgKHRoaXMuc3VtbWFyeSgpID09IGZhbHNlKSByZXR1cm4gZmFsc2VcblxuICAgICAgZmlsdGVyX3ZpZXcodGFyZ2V0KVxuICAgICAgICAubG9naWMobG9naWMpXG4gICAgICAgIC5jYXRlZ29yaWVzKGNhdGVnb3JpZXMpXG4gICAgICAgIC5maWx0ZXJzKGZpbHRlcnMpXG4gICAgICAgIC5kYXRhKGRhdGEpXG4gICAgICAgIC5vbihcImxvZ2ljLmNoYW5nZVwiLCB0aGlzLm9uKFwibG9naWMuY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJmaWx0ZXIuY2hhbmdlXCIsIHRoaXMub24oXCJmaWx0ZXIuY2hhbmdlXCIpKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIG9wdGlvbl92aWV3KHRhcmdldClcbiAgICAgICAgLmRhdGEob3B0aW9ucylcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIHRoaXMub24oXCJ2aWV3LmNoYW5nZVwiKSApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgY29uZGl0aW9uYWxfc2hvdyh0YXJnZXQpXG4gICAgICAgIC5kYXRhKG9wdGlvbnMpXG4gICAgICAgIC5jbGFzc2VkKFwidmlldy1vcHRpb25cIix0cnVlKVxuICAgICAgICAuZHJhdygpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgIGlmICgheC5zZWxlY3RlZCkgcmV0dXJuXG5cbiAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwiZGF0YS12aWV3XCIpIHtcbiAgICAgICAgICAgIHZhciBkdiA9IGRvbWFpbl92aWV3KGR0aGlzKVxuICAgICAgICAgICAgICAub3B0aW9ucyh0YWJzKVxuICAgICAgICAgICAgICAuZGF0YShkYXRhKVxuICAgICAgICAgICAgICAub24oXCJzZWxlY3RcIiwgc2VsZi5vbihcInRhYi5jaGFuZ2VcIikgKVxuICAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgXG4gICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJtZWRpYS12aWV3XCIpIHtcbiAgICAgICAgICAgIG1lZGlhX3BsYW4oZHRoaXMuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTE1cHhcIikuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIi0xNXB4XCIpKVxuICAgICAgICAgICAgIC5kYXRhKGRhdGEpXG4gICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwiYmEtdmlld1wiKSB7XG4gICAgICAgICAgICByZWxhdGl2ZV92aWV3KGR0aGlzKVxuICAgICAgICAgICAgIC5kYXRhKHNlbGYuYmVmb3JlKCkpXG4gICAgICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgICAgICBzdGFnZWRfZmlsdGVycyA9IHN0YWdlZF9maWx0ZXJzLnNwbGl0KFwiLFwiKS5jb25jYXQoeC5rZXkgfHwgeC51cmwpLmZpbHRlcih4ID0+IHgubGVuZ3RoKS5qb2luKFwiLFwiKVxuICAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKHN0YWdlZF9maWx0ZXJzKVxuICAgICAgICAgICAgICAgSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZF9maWx0ZXJzKVxuXG4gICAgXG4gICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJzdW1tYXJ5LXZpZXdcIikge1xuICAgICAgICAgICAgc3VtbWFyeV92aWV3KGR0aGlzKVxuICAgICAgICAgICAgIC5kYXRhKHNlbGYuc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC50aW1pbmcoc2VsZi50aW1lX3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAuY2F0ZWdvcnkoc2VsZi5jYXRlZ29yeV9zdW1tYXJ5KCkpXG4gICAgICAgICAgICAgLmJlZm9yZShzZWxmLmJlZm9yZSgpKVxuICAgICAgICAgICAgIC5hZnRlcihzZWxmLmFmdGVyKCkpXG4gICAgICAgICAgICAgLmtleXdvcmRzKHNlbGYua2V5d29yZF9zdW1tYXJ5KCkpXG4gICAgICAgICAgICAgLm9uKFwiYmEuc29ydFwiLHNlbGYub24oXCJiYS5zb3J0XCIpKVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcInRpbWluZy12aWV3XCIpIHtcbiAgICAgICAgICAgIHRpbWluZ192aWV3KGR0aGlzKVxuICAgICAgICAgICAgIC5kYXRhKHNlbGYuZGF0YSgpKVxuICAgICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgICAgICAgc3RhZ2VkX2ZpbHRlcnMgPSBzdGFnZWRfZmlsdGVycy5zcGxpdChcIixcIikuY29uY2F0KHgua2V5IHx8IHgudXJsKS5maWx0ZXIoeCA9PiB4Lmxlbmd0aCkuam9pbihcIixcIilcbiAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKShzdGFnZWRfZmlsdGVycylcbiAgICAgICAgICAgICAgIEhBQ0tidWlsZFN0YWdlZEZpbHRlcihzdGFnZWRfZmlsdGVycylcblxuICAgIFxuICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgIH1cblxuICAgICAgICB9KVxuXG4gICAgICBmdW5jdGlvbiBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkKSB7XG5cbiAgICAgICAgc3RhZ2VkX2ZpbHRlcl92aWV3KHRhcmdldClcbiAgICAgICAgICAuZGF0YShzdGFnZWQpXG4gICAgICAgICAgLm9uKFwidXBkYXRlXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKHgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub24oXCJtb2RpZnlcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoXCJcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJtb2RpZnktZmlsdGVyXCIpKHgpXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIC5vbihcImFkZFwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKShcIlwiKVxuICAgICAgICAgICAgc2VsZi5vbihcImFkZC1maWx0ZXJcIikoeClcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5kcmF3KClcbiAgICAgIH1cbiAgICAgIEhBQ0tidWlsZFN0YWdlZEZpbHRlcihzdGFnZWRfZmlsdGVycylcblxuICAgICAgcmV0dXJuIHRoaXNcblxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGdldERhdGEoYWN0aW9uLGRheXNfYWdvKSB7XG4gIHJldHVybiBmdW5jdGlvbihjYil7XG4gICAgY29uc29sZS5sb2coZGF5c19hZ28pXG5cbiAgICB2YXIgVVJMID0gXCIvY3J1c2hlci92Mi92aXNpdG9yL2RvbWFpbnNfZnVsbF90aW1lX21pbnV0ZS9jYWNoZT91cmxfcGF0dGVybj1cIiArIGFjdGlvbi51cmxfcGF0dGVyblswXSArIFwiJmZpbHRlcl9pZD1cIiArIGFjdGlvbi5hY3Rpb25faWRcblxuICAgIHZhciBkYXRlX2FnbyA9IG5ldyBEYXRlKCtuZXcgRGF0ZSgpLTI0KjYwKjYwKjEwMDAqZGF5c19hZ28pXG4gICAgICAsIGRhdGUgPSBkMy50aW1lLmZvcm1hdChcIiVZLSVtLSVkXCIpKGRhdGVfYWdvKVxuXG4gICAgaWYgKGRheXNfYWdvKSBVUkwgKz0gXCImZGF0ZT1cIiArIGRhdGVcblxuXG4gICAgZDMuanNvbihVUkwsZnVuY3Rpb24odmFsdWUpIHtcblxuICAgICAgdmFyIGNhdGVnb3JpZXMgPSB2YWx1ZS5zdW1tYXJ5LmNhdGVnb3J5Lm1hcChmdW5jdGlvbih4KSB7eC5rZXkgPSB4LnBhcmVudF9jYXRlZ29yeV9uYW1lOyByZXR1cm4geH0pXG4gICAgICB2YWx1ZS5jYXRlZ29yaWVzID0gY2F0ZWdvcmllc1xuICAgICAgdmFsdWUuY2F0ZWdvcnkgPSB2YWx1ZS5zdW1tYXJ5LmNhdGVnb3J5XG4gICAgICB2YWx1ZS5jdXJyZW50X2hvdXIgPSB2YWx1ZS5zdW1tYXJ5LmhvdXJcbiAgICAgIHZhbHVlLmNhdGVnb3J5X2hvdXIgPSB2YWx1ZS5zdW1tYXJ5LmNyb3NzX3NlY3Rpb25cblxuICAgICAgdmFsdWUub3JpZ2luYWxfdXJscyA9IHZhbHVlLnJlc3BvbnNlXG5cbiAgICAgIGNiKGZhbHNlLHZhbHVlKVxuICAgIH0pXG4gIH1cblxufVxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZShkYXRhLGNiKSB7XG4gIGQzLnhocihcIi9jcnVzaGVyL2Z1bm5lbC9hY3Rpb24/Zm9ybWF0PWpzb25cIilcbiAgICAuaGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKVxuICAgIC5wb3N0KEpTT04uc3RyaW5naWZ5KGRhdGEpLGZ1bmN0aW9uKGVycixkYXRhKSB7XG4gICAgICBjYihlcnIsSlNPTi5wYXJzZShkYXRhLnJlc3BvbnNlKS5yZXNwb25zZSlcbiAgICB9KVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBbGwoY2IpIHtcbiAgZDMuanNvbihcIi9jcnVzaGVyL2Z1bm5lbC9hY3Rpb24/Zm9ybWF0PWpzb25cIixmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhbHVlLnJlc3BvbnNlLm1hcChmdW5jdGlvbih4KSB7IHgua2V5ID0geC5hY3Rpb25fbmFtZTsgeC52YWx1ZSA9IHguYWN0aW9uX2lkIH0pXG4gICAgY2IoZmFsc2UsdmFsdWUucmVzcG9uc2UpXG4gIH0pXG5cbn1cbiIsImltcG9ydCAqIGFzIGEgZnJvbSAnLi9zcmMvYWN0aW9uLmpzJztcblxuZXhwb3J0IGxldCBhY3Rpb24gPSBhO1xuZXhwb3J0IGxldCBkYXNoYm9hcmQgPSB7XG4gICAgZ2V0QWxsOiBmdW5jdGlvbihjYikge1xuICAgICAgZDMuanNvbihcIi9jcnVzaGVyL3NhdmVkX2Rhc2hib2FyZFwiLGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGNiKGZhbHNlLHZhbHVlLnJlc3BvbnNlKVxuICAgICAgfSlcbiAgICB9XG59XG5leHBvcnQgbGV0IGxpbmVfaXRlbSA9IHtcbiAgICBnZXRBbGw6IGZ1bmN0aW9uKGNiKSB7XG4gICAgICBkMy5qc29uKFwiL2xpbmVfaXRlbVwiLGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGNiKGZhbHNlLHZhbHVlLnJlc3BvbnNlKVxuICAgICAgfSlcbiAgICB9XG59XG4iLCJpbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnO1xuaW1wb3J0IHtmaWx0ZXJfZGF0YX0gZnJvbSAnZmlsdGVyJztcbmltcG9ydCB7XG4gIGJ1aWxkQ2F0ZWdvcmllcywgXG4gIGJ1aWxkQ2F0ZWdvcnlIb3VyLCBcbiAgYnVpbGREYXRhLCBcbiAgYnVpbGREb21haW5zLCBcbiAgYnVpbGRVcmxzLCBcbiAgYnVpbGRTdW1tYXJ5RGF0YSwgXG4gIGJ1aWxkU3VtbWFyeUFnZ3JlZ2F0aW9uLCBcbiAgcHJlcERhdGEsIFxuICBwcmVwYXJlRmlsdGVyc1xufSBmcm9tICcuLi9oZWxwZXJzJ1xuXG5jb25zdCBzID0gc3RhdGU7XG5cblxuXG5cblxuXG52YXIgb3BzID0ge1xuICAgIFwiaXMgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUuc3BsaXQoXCIsXCIpXG4gICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xIH0sIDApID4gMFxuICAgICAgICB9IFxuICAgICAgfVxuICAsIFwiaXMgbm90IGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKVxuICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMSB9LCAwKSA9PSAwXG4gICAgICAgIH0gXG4gICAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG4gIGNvbnN0IHMgPSBzdGF0ZTtcblxuICBzdGF0ZVxuICAgIC5yZWdpc3RlckV2ZW50KFwiYWRkLWZpbHRlclwiLCBmdW5jdGlvbihmaWx0ZXIpIHsgXG4gICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIscy5zdGF0ZSgpLmZpbHRlcnMuY29uY2F0KGZpbHRlcikuZmlsdGVyKHggPT4geC52YWx1ZSkgKSBcbiAgICB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwibW9kaWZ5LWZpbHRlclwiLCBmdW5jdGlvbihmaWx0ZXIpIHsgXG4gICAgICB2YXIgZmlsdGVycyA9IHMuc3RhdGUoKS5maWx0ZXJzXG4gICAgICB2YXIgaGFzX2V4aXNpdGluZyA9IGZpbHRlcnMuZmlsdGVyKHggPT4gKHguZmllbGQgKyB4Lm9wKSA9PSAoZmlsdGVyLmZpZWxkICsgZmlsdGVyLm9wKSApXG4gICAgICBcbiAgICAgIGlmIChoYXNfZXhpc2l0aW5nLmxlbmd0aCkge1xuICAgICAgICB2YXIgbmV3X2ZpbHRlcnMgPSBmaWx0ZXJzLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGlmICgoeC5maWVsZCA9PSBmaWx0ZXIuZmllbGQpICYmICh4Lm9wID09IGZpbHRlci5vcCkpIHtcbiAgICAgICAgICAgIHgudmFsdWUgKz0gXCIsXCIgKyBmaWx0ZXIudmFsdWVcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHhcbiAgICAgICAgfSlcbiAgICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLG5ld19maWx0ZXJzLmZpbHRlcih4ID0+IHgudmFsdWUpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHMuc3RhdGUoKS5maWx0ZXJzLmNvbmNhdChmaWx0ZXIpLmZpbHRlcih4ID0+IHgudmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiLCBmdW5jdGlvbihzdHIpIHsgcy5wdWJsaXNoKFwic3RhZ2VkX2ZpbHRlclwiLHN0ciApIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJsb2dpYy5jaGFuZ2VcIiwgZnVuY3Rpb24obG9naWMpIHsgcy5wdWJsaXNoKFwibG9naWNfb3B0aW9uc1wiLGxvZ2ljKSB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwiZmlsdGVyLmNoYW5nZVwiLCBmdW5jdGlvbihmaWx0ZXJzKSB7IHMucHVibGlzaEJhdGNoKHsgXCJmaWx0ZXJzXCI6ZmlsdGVycyB9KSB9KVxuXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIiwgZnVuY3Rpb24oZXJyLGZpbHRlcnMsX3N0YXRlKSB7XG5cbiAgICAgIHZhciBmaWx0ZXJzID0gX3N0YXRlLmZpbHRlcnNcbiAgICAgIHZhciB2YWx1ZSA9IF9zdGF0ZS5kYXRhXG5cbiAgICAgIGlmICh2YWx1ZSA9PSB1bmRlZmluZWQpIHJldHVybiAvLyByZXR1cm4gZWFybHkgaWYgdGhlcmUgaXMgbm8gZGF0YS4uLlxuXG4gICAgICB2YXIgZmlsdGVycyA9IHByZXBhcmVGaWx0ZXJzKGZpbHRlcnMpXG5cbiAgICAgIHZhciBsb2dpYyA9IF9zdGF0ZS5sb2dpY19vcHRpb25zLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LnNlbGVjdGVkIH0pXG4gICAgICBsb2dpYyA9IGxvZ2ljLmxlbmd0aCA+IDAgPyBsb2dpY1swXSA6IF9zdGF0ZS5sb2dpY19vcHRpb25zWzBdXG5cbiAgICAgIHZhciBmdWxsX3VybHMgPSBmaWx0ZXJfZGF0YSh2YWx1ZS5vcmlnaW5hbF91cmxzKVxuICAgICAgICAub3AoXCJpcyBpblwiLCBvcHNbXCJpcyBpblwiXSlcbiAgICAgICAgLm9wKFwiaXMgbm90IGluXCIsIG9wc1tcImlzIG5vdCBpblwiXSlcbiAgICAgICAgLmxvZ2ljKGxvZ2ljLnZhbHVlKVxuICAgICAgICAuYnkoZmlsdGVycylcblxuXG4gICAgICAvLyBzaG91bGQgbm90IGZpbHRlciBpZi4uLlxuICAgICAgLy9kZWJ1Z2dlclxuXG4gICAgICBpZiAoICh2YWx1ZS5mdWxsX3VybHMpICYmIFxuICAgICAgICAgICAodmFsdWUuZnVsbF91cmxzLmxlbmd0aCA9PSBmdWxsX3VybHMubGVuZ3RoKSAmJiBcbiAgICAgICAgICAgKF9zdGF0ZS5zZWxlY3RlZF9jb21wYXJpc29uICYmIChfc3RhdGUuY29tcGFyaXNvbl9kYXRhID09IHZhbHVlLmNvbXBhcmlzb24pKSkgcmV0dXJuXG5cbiAgICAgIHZhbHVlLmZ1bGxfdXJscyA9IGZ1bGxfdXJsc1xuXG4gICAgICB2YXIgY29tcGFyZVRvID0gX3N0YXRlLmNvbXBhcmlzb25fZGF0YSA/IF9zdGF0ZS5jb21wYXJpc29uX2RhdGEub3JpZ2luYWxfdXJscyA6IHZhbHVlLm9yaWdpbmFsX3VybHM7XG5cbiAgICAgIHZhbHVlLmNvbXBhcmlzb24gPSBjb21wYXJlVG9cblxuICAgICAgLy8gYWxsIHRoaXMgbG9naWMgc2hvdWxkIGJlIG1vdmUgdG8gdGhlIHJlc3BlY3RpdmUgdmlld3MuLi5cblxuICAgICAgLy8gLS0tLS0gU1RBUlQgOiBGT1IgTUVESUEgUExBTiAtLS0tLSAvL1xuXG4gICAgICBidWlsZENhdGVnb3JpZXModmFsdWUpXG4gICAgICBidWlsZENhdGVnb3J5SG91cih2YWx1ZSlcblxuICAgICAgLy8gLS0tLS0gRU5EIDogRk9SIE1FRElBIFBMQU4gLS0tLS0gLy9cblxuICAgICAgdmFyIHRhYnMgPSBbXG4gICAgICAgICAgYnVpbGREb21haW5zKHZhbHVlKVxuICAgICAgICAsIGJ1aWxkVXJscyh2YWx1ZSlcbiAgICAgICAgLy8sIGJ1aWxkVG9waWNzKHZhbHVlKVxuICAgICAgXVxuXG4gICAgICB2YXIgc3VtbWFyeV9kYXRhID0gYnVpbGRTdW1tYXJ5RGF0YSh2YWx1ZS5mdWxsX3VybHMpXG4gICAgICAgICwgcG9wX3N1bW1hcnlfZGF0YSA9IGJ1aWxkU3VtbWFyeURhdGEoY29tcGFyZVRvKVxuXG4gICAgICB2YXIgc3VtbWFyeSA9IGJ1aWxkU3VtbWFyeUFnZ3JlZ2F0aW9uKHN1bW1hcnlfZGF0YSxwb3Bfc3VtbWFyeV9kYXRhKVxuXG4gICAgICB2YXIgdHMgPSBwcmVwRGF0YSh2YWx1ZS5mdWxsX3VybHMpXG4gICAgICAgICwgcG9wX3RzID0gcHJlcERhdGEoY29tcGFyZVRvKVxuXG4gICAgICB2YXIgbWFwcGVkdHMgPSB0cy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYzsgcmV0dXJuIHB9LCB7fSlcblxuICAgICAgdmFyIHByZXBwZWQgPSBwb3BfdHMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGtleTogeC5rZXlcbiAgICAgICAgICAsIGhvdXI6IHguaG91clxuICAgICAgICAgICwgbWludXRlOiB4Lm1pbnV0ZVxuICAgICAgICAgICwgdmFsdWUyOiB4LnZhbHVlXG4gICAgICAgICAgLCB2YWx1ZTogbWFwcGVkdHNbeC5rZXldID8gIG1hcHBlZHRzW3gua2V5XS52YWx1ZSA6IDBcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgdmFyIGNhdF9yb2xsID0gZDMubmVzdCgpXG4gICAgICAgIC5rZXkoZnVuY3Rpb24oaykgeyByZXR1cm4gay5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgICAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgICAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG4gICAgICAgICAgICByZXR1cm4gcFxuICAgICAgICAgIH0seyBhcnRpY2xlczoge30sIHZpZXdzOiAwLCBzZXNzaW9uczogMH0pXG4gICAgICAgIH0pXG4gICAgICAgIC5lbnRyaWVzKHZhbHVlLmZ1bGxfdXJscylcblxuICAgICAgdmFyIHBvcF9jYXRfcm9sbCA9IGQzLm5lc3QoKVxuICAgICAgICAua2V5KGZ1bmN0aW9uKGspIHsgcmV0dXJuIGsucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAgICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICAgICAgcC52aWV3cyArPSBjLmNvdW50XG4gICAgICAgICAgICBwLnNlc3Npb25zICs9IGMudW5pcXVlc1xuICAgICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgICB9LHsgYXJ0aWNsZXM6IHt9LCB2aWV3czogMCwgc2Vzc2lvbnM6IDB9KVxuICAgICAgICB9KVxuICAgICAgICAuZW50cmllcyhjb21wYXJlVG8pXG5cbiAgICAgIHZhciBtYXBwZWRfY2F0X3JvbGwgPSBjYXRfcm9sbC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYzsgcmV0dXJuIHB9LCB7fSlcblxuICAgICAgdmFyIGNhdF9zdW1tYXJ5ID0gcG9wX2NhdF9yb2xsLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBrZXk6IHgua2V5XG4gICAgICAgICAgLCBwb3A6IHgudmFsdWVzLnZpZXdzXG4gICAgICAgICAgLCBzYW1wOiBtYXBwZWRfY2F0X3JvbGxbeC5rZXldID8gbWFwcGVkX2NhdF9yb2xsW3gua2V5XS52YWx1ZXMudmlld3MgOiAwXG4gICAgICAgIH1cbiAgICAgIH0pLnNvcnQoZnVuY3Rpb24oYSxiKSB7IHJldHVybiBiLnBvcCAtIGEucG9wfSlcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSAhPSBcIk5BXCIgfSlcblxuICAgICAgdmFyIHBhcnNlV29yZHMgPSBmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgdmFyIHNwbGl0dGVkID0gYy51cmwuc3BsaXQoXCIuY29tL1wiKVxuICAgICAgICBpZiAoc3BsaXR0ZWQubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHZhciBsYXN0ID0gc3BsaXR0ZWRbMV0uc3BsaXQoXCIvXCIpLnNsaWNlKC0xKVswXS5zcGxpdChcIj9cIilbMF1cbiAgICAgICAgICB2YXIgd29yZHMgPSBsYXN0LnNwbGl0KFwiLVwiKS5qb2luKFwiK1wiKS5zcGxpdChcIitcIikuam9pbihcIl9cIikuc3BsaXQoXCJfXCIpLmpvaW4oXCIgXCIpLnNwbGl0KFwiIFwiKVxuICAgICAgICAgIHdvcmRzLm1hcChmdW5jdGlvbih3KSB7IFxuICAgICAgICAgICAgaWYgKCh3Lmxlbmd0aCA8PSA0KSB8fCAoU3RyaW5nKHBhcnNlSW50KHdbMF0pKSA9PSB3WzBdICkgfHwgKHcuaW5kZXhPZihcImFzcFwiKSA+IC0xKSB8fCAody5pbmRleE9mKFwicGhwXCIpID4gLTEpIHx8ICh3LmluZGV4T2YoXCJodG1sXCIpID4gLTEpICkgcmV0dXJuXG4gICAgICAgICAgICBwW3ddID0gcFt3XSA/IHBbd10gKyAxIDogMVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH1cblxuICAgICAgdmFyIHBvcF9jb3VudHMgPSBjb21wYXJlVG8ucmVkdWNlKHBhcnNlV29yZHMse30pXG4gICAgICB2YXIgc2FtcF9jb3VudHMgPSB2YWx1ZS5mdWxsX3VybHMucmVkdWNlKHBhcnNlV29yZHMse30pXG5cblxuICAgICAgdmFyIGVudHJpZXMgPSBkMy5lbnRyaWVzKHBvcF9jb3VudHMpLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlID4gMX0pXG4gICAgICAgIC5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHguc2FtcCA9IHNhbXBfY291bnRzW3gua2V5XVxuICAgICAgICAgIHgucG9wID0geC52YWx1ZVxuICAgICAgICAgIHJldHVybiB4XG4gICAgICAgIH0pXG4gICAgICAgIC5zb3J0KGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYi5wb3AgLSBhLnBvcH0pXG4gICAgICAgIC5zbGljZSgwLDI1KVxuXG5cbiAgICAgIHZhciBtb2RpZnlXaXRoQ29tcGFyaXNvbnMgPSBmdW5jdGlvbihkcykge1xuXG4gICAgICAgIHZhciBhZ2dzID0gZHMucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICAgIHAucG9wX21heCA9IChwLnBvcF9tYXggfHwgMCkgPCBjLnBvcCA/IGMucG9wIDogcC5wb3BfbWF4XG4gICAgICAgICAgcC5wb3BfdG90YWwgPSAocC5wb3BfdG90YWwgfHwgMCkgKyBjLnBvcFxuXG4gICAgICAgICAgaWYgKGMuc2FtcCkge1xuICAgICAgICAgICAgcC5zYW1wX21heCA9IChwLnNhbXBfbWF4IHx8IDApID4gYy5zYW1wID8gcC5zYW1wX21heCA6IGMuc2FtcFxuICAgICAgICAgICAgcC5zYW1wX3RvdGFsID0gKHAuc2FtcF90b3RhbCB8fCAwKSArIGMuc2FtcFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBwXG4gICAgICAgIH0se30pXG5cbiAgICAgICAgLy9jb25zb2xlLmxvZyhhZ2dzKVxuXG4gICAgICAgIGRzLm1hcChmdW5jdGlvbihvKSB7XG4gICAgICAgICAgby5ub3JtYWxpemVkX3BvcCA9IG8ucG9wIC8gYWdncy5wb3BfbWF4XG4gICAgICAgICAgby5wZXJjZW50X3BvcCA9IG8ucG9wIC8gYWdncy5wb3BfdG90YWxcblxuICAgICAgICAgIG8ubm9ybWFsaXplZF9zYW1wID0gby5zYW1wIC8gYWdncy5zYW1wX21heFxuICAgICAgICAgIG8ucGVyY2VudF9zYW1wID0gby5zYW1wIC8gYWdncy5zYW1wX3RvdGFsXG5cbiAgICAgICAgICBvLm5vcm1hbGl6ZWRfZGlmZiA9IChvLm5vcm1hbGl6ZWRfc2FtcCAtIG8ubm9ybWFsaXplZF9wb3ApL28ubm9ybWFsaXplZF9wb3BcbiAgICAgICAgICBvLnBlcmNlbnRfZGlmZiA9IChvLnBlcmNlbnRfc2FtcCAtIG8ucGVyY2VudF9wb3ApL28ucGVyY2VudF9wb3BcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgbW9kaWZ5V2l0aENvbXBhcmlzb25zKGNhdF9zdW1tYXJ5KVxuICAgICAgbW9kaWZ5V2l0aENvbXBhcmlzb25zKGVudHJpZXMpXG5cblxuICAgICAgaWYgKHZhbHVlLmJlZm9yZSkge1xuICAgICAgICB2YXIgYmVmb3JlX3VybHMgPSBmaWx0ZXJfZGF0YSh2YWx1ZS5iZWZvcmUpXG4gICAgICAgICAgLm9wKFwiaXMgaW5cIiwgb3BzW1wiaXMgaW5cIl0pXG4gICAgICAgICAgLm9wKFwiaXMgbm90IGluXCIsIG9wc1tcImlzIG5vdCBpblwiXSlcbiAgICAgICAgICAvLy5vcChcImRvZXMgbm90IGNvbnRhaW5cIiwgb3BzW1wiZG9lcyBub3QgY29udGFpblwiXSlcbiAgICAgICAgICAvLy5vcChcImNvbnRhaW5zXCIsIG9wc1tcImNvbnRhaW5zXCJdKVxuICAgICAgICAgIC5sb2dpYyhsb2dpYy52YWx1ZSlcbiAgICAgICAgICAuYnkoZmlsdGVycylcblxuICAgICAgICB2YXIgYWZ0ZXJfdXJscyA9IGZpbHRlcl9kYXRhKHZhbHVlLmFmdGVyKVxuICAgICAgICAgIC5vcChcImlzIGluXCIsIG9wc1tcImlzIGluXCJdKVxuICAgICAgICAgIC5vcChcImlzIG5vdCBpblwiLCBvcHNbXCJpcyBub3QgaW5cIl0pXG4gICAgICAgICAgLy8ub3AoXCJkb2VzIG5vdCBjb250YWluXCIsIG9wc1tcImRvZXMgbm90IGNvbnRhaW5cIl0pXG4gICAgICAgICAgLy8ub3AoXCJjb250YWluc1wiLCBvcHNbXCJjb250YWluc1wiXSlcbiAgICAgICAgICAubG9naWMobG9naWMudmFsdWUpXG4gICAgICAgICAgLmJ5KGZpbHRlcnMpXG5cblxuICAgICAgICB2YXIgYnUgPSBkMy5uZXN0KClcbiAgICAgICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAgICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgICAgICAgIC5lbnRyaWVzKGJlZm9yZV91cmxzKVxuXG4gICAgICAgIHZhciBhdSA9IGQzLm5lc3QoKVxuICAgICAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgICAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgICAgICAgLmVudHJpZXMoYWZ0ZXJfdXJscylcblxuICAgICAgICB2YXIgYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG4gICAgICAgICAgLCBwb3BfY2F0ZWdvcmllcyA9IGNhdF9zdW1tYXJ5LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjOyByZXR1cm4gcCB9LCB7fSlcbiAgICAgICAgICAsIGNhdHMgPSBjYXRfc3VtbWFyeS5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC5rZXkgfSlcblxuICAgICAgICB2YXIgYmVmb3JlX2NhdGVnb3JpZXMgPSBidWlsZERhdGEoYmVmb3JlX3VybHMsYnVja2V0cyxwb3BfY2F0ZWdvcmllcylcbiAgICAgICAgICAsIGFmdGVyX2NhdGVnb3JpZXMgPSBidWlsZERhdGEoYWZ0ZXJfdXJscyxidWNrZXRzLHBvcF9jYXRlZ29yaWVzKVxuXG4gICAgICAgIHZhciBzb3J0YnkgPSBfc3RhdGUuc29ydGJ5XG5cbiAgICAgICAgaWYgKHNvcnRieSA9PSBcInNjb3JlXCIpIHtcblxuICAgICAgICAgIGJlZm9yZV9jYXRlZ29yaWVzID0gYmVmb3JlX2NhdGVnb3JpZXMuc29ydChmdW5jdGlvbihhLGIpIHsgXG4gICAgICAgICAgICB2YXIgcCA9IC0xLCBxID0gLTE7XG4gICAgICAgICAgICB0cnkgeyBwID0gYi52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5zY29yZSB9IGNhdGNoKGUpIHt9XG4gICAgICAgICAgICB0cnkgeyBxID0gYS52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5zY29yZSB9IGNhdGNoKGUpIHt9XG4gICAgICAgICAgICByZXR1cm4gZDMuYXNjZW5kaW5nKHAsIHEpXG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgfSBlbHNlIGlmIChzb3J0YnkgPT0gXCJwb3BcIikge1xuXG4gICAgICAgICAgYmVmb3JlX2NhdGVnb3JpZXMgPSBiZWZvcmVfY2F0ZWdvcmllcy5zb3J0KGZ1bmN0aW9uKGEsYikgeyBcbiAgICAgICAgICAgIHZhciBwID0gY2F0cy5pbmRleE9mKGEua2V5KVxuICAgICAgICAgICAgICAsIHEgPSBjYXRzLmluZGV4T2YoYi5rZXkpXG4gICAgICAgICAgICByZXR1cm4gZDMuYXNjZW5kaW5nKHAgPiAtMSA/IHAgOiAxMDAwMCwgcSA+IC0xID8gcSA6IDEwMDAwKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgIGJlZm9yZV9jYXRlZ29yaWVzID0gYmVmb3JlX2NhdGVnb3JpZXMuc29ydChmdW5jdGlvbihhLGIpIHsgXG4gICAgICAgICAgICB2YXIgcCA9IC0xLCBxID0gLTE7XG4gICAgICAgICAgICB0cnkgeyBwID0gYi52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5wZXJjZW50X2RpZmYgfSBjYXRjaChlKSB7fVxuICAgICAgICAgICAgdHJ5IHsgcSA9IGEudmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5ID09IFwiNjAwXCIgfSlbMF0ucGVyY2VudF9kaWZmIH0gY2F0Y2goZSkge31cbiAgICAgICAgICAgIHJldHVybiBkMy5hc2NlbmRpbmcocCwgcSlcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgXG4gICAgICAgIH1cblxuXG4gICAgICAgIHZhciBvcmRlciA9IGJlZm9yZV9jYXRlZ29yaWVzLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICAgIGFmdGVyX2NhdGVnb3JpZXMgPSBhZnRlcl9jYXRlZ29yaWVzLmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4gb3JkZXIuaW5kZXhPZih4LmtleSkgPiAtMX0pLnNvcnQoZnVuY3Rpb24oYSxiKSB7XG4gICAgICAgICAgcmV0dXJuIG9yZGVyLmluZGV4T2YoYS5rZXkpIC0gb3JkZXIuaW5kZXhPZihiLmtleSlcbiAgICAgICAgfSlcblxuICAgICAgICBzLnNldFN0YXRpYyhcImJlZm9yZV91cmxzXCIse1wiYWZ0ZXJcIjphZnRlcl91cmxzLFwiYmVmb3JlXCI6YmVmb3JlX3VybHMsXCJjYXRlZ29yeVwiOmNhdF9zdW1tYXJ5LFwiYmVmb3JlX2NhdGVnb3JpZXNcIjpiZWZvcmVfY2F0ZWdvcmllcyxcImFmdGVyX2NhdGVnb3JpZXNcIjphZnRlcl9jYXRlZ29yaWVzLFwic29ydGJ5XCI6dmFsdWUuc29ydGJ5fSkgXG4gICAgICAgIHMuc2V0U3RhdGljKFwiYWZ0ZXJfdXJsc1wiLCBhZnRlcl91cmxzKVxuXG4gICAgICAgIFxuXG5cbiAgICAgIH1cblxuICAgICAgXG5cbiAgICAgIHMuc2V0U3RhdGljKFwia2V5d29yZF9zdW1tYXJ5XCIsIGVudHJpZXMpIFxuICAgICAgcy5zZXRTdGF0aWMoXCJ0aW1lX3N1bW1hcnlcIiwgcHJlcHBlZClcbiAgICAgIHMuc2V0U3RhdGljKFwiY2F0ZWdvcnlfc3VtbWFyeVwiLCBjYXRfc3VtbWFyeSlcblxuICAgICAgcy5zZXRTdGF0aWMoXCJzdW1tYXJ5XCIsc3VtbWFyeSlcbiAgICAgIHMuc2V0U3RhdGljKFwidGFic1wiLHRhYnMpXG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJmb3JtYXR0ZWRfZGF0YVwiLHZhbHVlKVxuXG4gICAgfSlcbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSc7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgY29uc3QgcyA9IHN0YXRlO1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhY3Rpb24uY2hhbmdlXCIsIGZ1bmN0aW9uKGFjdGlvbikgeyBzLnB1Ymxpc2goXCJzZWxlY3RlZF9hY3Rpb25cIixhY3Rpb24pIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIiwgZnVuY3Rpb24oZGF0ZSkgeyBzLnB1Ymxpc2goXCJhY3Rpb25fZGF0ZVwiLGRhdGUpIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIsIGZ1bmN0aW9uKGRhdGUpIHsgcy5wdWJsaXNoKFwiY29tcGFyaXNvbl9kYXRlXCIsZGF0ZSkgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImNvbXBhcmlzb24uY2hhbmdlXCIsIGZ1bmN0aW9uKGFjdGlvbikgeyBcbiAgICAgIGlmIChhY3Rpb24udmFsdWUgPT0gZmFsc2UpIHJldHVybiBzLnB1Ymxpc2goXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsZmFsc2UpXG4gICAgICBzLnB1Ymxpc2goXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsYWN0aW9uKVxuICAgIH0pXG5cblxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IGZpbHRlckluaXQgZnJvbSAnLi9ldmVudHMvZmlsdGVyX2V2ZW50cydcbmltcG9ydCBhY3Rpb25Jbml0IGZyb20gJy4vZXZlbnRzL2FjdGlvbl9ldmVudHMnXG5cblxuY29uc3QgcyA9IHN0YXRlO1xuXG5jb25zdCBkZWVwY29weSA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoeCkpXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgZmlsdGVySW5pdCgpXG4gIGFjdGlvbkluaXQoKVxuXG4gIC8vIE9USEVSIGV2ZW50c1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ2aWV3LmNoYW5nZVwiLCBmdW5jdGlvbih4KSB7XG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIix0cnVlKVxuICAgICAgdmFyIENQID0gZGVlcGNvcHkocy5zdGF0ZSgpLmRhc2hib2FyZF9vcHRpb25zKS5tYXAoZnVuY3Rpb24oZCkgeyBkLnNlbGVjdGVkID0gKHgudmFsdWUgPT0gZC52YWx1ZSkgPyAxIDogMDsgcmV0dXJuIGQgfSlcbiAgICAgIHMucHVibGlzaChcImRhc2hib2FyZF9vcHRpb25zXCIsQ1ApXG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcInRhYi5jaGFuZ2VcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIsdHJ1ZSlcbiAgICAgIGNvbnN0IHZhbHVlID0gcy5zdGF0ZSgpXG4gICAgICB2YWx1ZS50YWJzLm1hcChmdW5jdGlvbih0KSB7IHQuc2VsZWN0ZWQgPSAodC5rZXkgPT0geC5rZXkpID8gMSA6IDAgfSlcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcInRhYnNcIix2YWx1ZS50YWJzKVxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJiYS5zb3J0XCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHMucHVibGlzaEJhdGNoKHsgXCJzb3J0YnlcIjogeC52YWx1ZSwgXCJmaWx0ZXJzXCI6dmFsdWUuZmlsdGVycyB9KVxuICAgIH0pXG59XG4iLCJpbXBvcnQge3FzfSBmcm9tICdzdGF0ZSc7XG5pbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnO1xuaW1wb3J0IHtjb21wYXJlfSBmcm9tICcuLi9oZWxwZXJzJ1xuXG5mdW5jdGlvbiBwdWJsaXNoUVNVcGRhdGVzKHVwZGF0ZXMscXNfc3RhdGUpIHtcbiAgaWYgKE9iamVjdC5rZXlzKHVwZGF0ZXMpLmxlbmd0aCkge1xuICAgIHVwZGF0ZXNbXCJxc19zdGF0ZVwiXSA9IHFzX3N0YXRlXG4gICAgc3RhdGUucHVibGlzaEJhdGNoKHVwZGF0ZXMpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcblxuICB3aW5kb3cub25wb3BzdGF0ZSA9IGZ1bmN0aW9uKGkpIHtcblxuICAgIHZhciBzdGF0ZSA9IHMuX3N0YXRlXG4gICAgICAsIHFzX3N0YXRlID0gaS5zdGF0ZVxuXG4gICAgdmFyIHVwZGF0ZXMgPSBjb21wYXJlKHFzX3N0YXRlLHN0YXRlKVxuICAgIHB1Ymxpc2hRU1VwZGF0ZXModXBkYXRlcyxxc19zdGF0ZSlcbiAgfVxuXG4gIGNvbnN0IHMgPSBzdGF0ZTtcblxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJoaXN0b3J5XCIsZnVuY3Rpb24oZXJyb3IsX3N0YXRlKSB7XG4gICAgICAvL2NvbnNvbGUubG9nKFxuICAgICAgLy8gIFwiY3VycmVudDogXCIrSlNPTi5zdHJpbmdpZnkoX3N0YXRlLnFzX3N0YXRlKSwgXG4gICAgICAvLyAgSlNPTi5zdHJpbmdpZnkoX3N0YXRlLmZpbHRlcnMpLCBcbiAgICAgIC8vICBfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnNcbiAgICAgIC8vKVxuXG4gICAgICB2YXIgZm9yX3N0YXRlID0gW1wiZmlsdGVyc1wiXVxuXG4gICAgICB2YXIgcXNfc3RhdGUgPSBmb3Jfc3RhdGUucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgaWYgKF9zdGF0ZVtjXSkgcFtjXSA9IF9zdGF0ZVtjXVxuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7fSlcblxuICAgICAgaWYgKF9zdGF0ZS5zZWxlY3RlZF9hY3Rpb24pIHFzX3N0YXRlWydzZWxlY3RlZF9hY3Rpb24nXSA9IF9zdGF0ZS5zZWxlY3RlZF9hY3Rpb24uYWN0aW9uX2lkXG4gICAgICBpZiAoX3N0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24pIHFzX3N0YXRlWydzZWxlY3RlZF9jb21wYXJpc29uJ10gPSBfc3RhdGUuc2VsZWN0ZWRfY29tcGFyaXNvbi5hY3Rpb25faWRcbiAgICAgIGlmIChfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMpIHFzX3N0YXRlWydzZWxlY3RlZF92aWV3J10gPSBfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMuZmlsdGVyKHggPT4geC5zZWxlY3RlZClbMF0udmFsdWVcbiAgICAgIGlmIChfc3RhdGUuYWN0aW9uX2RhdGUpIHFzX3N0YXRlWydhY3Rpb25fZGF0ZSddID0gX3N0YXRlLmFjdGlvbl9kYXRlXG4gICAgICBpZiAoX3N0YXRlLmNvbXBhcmlzb25fZGF0ZSkgcXNfc3RhdGVbJ2NvbXBhcmlzb25fZGF0ZSddID0gX3N0YXRlLmNvbXBhcmlzb25fZGF0ZVxuXG5cbiAgICAgIGlmIChfc3RhdGUuc2VsZWN0ZWRfYWN0aW9uICYmIHFzKHFzX3N0YXRlKS50byhxc19zdGF0ZSkgIT0gd2luZG93LmxvY2F0aW9uLnNlYXJjaCkge1xuICAgICAgICBzLnB1Ymxpc2goXCJxc19zdGF0ZVwiLHFzX3N0YXRlKVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImhpc3RvcnkuYWN0aW9uc1wiLCBmdW5jdGlvbihlcnJvcix2YWx1ZSxfc3RhdGUpIHtcbiAgICAgIHZhciBxc19zdGF0ZSA9IHFzKHt9KS5mcm9tKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpXG4gICAgICBpZiAod2luZG93LmxvY2F0aW9uLnNlYXJjaC5sZW5ndGggJiYgT2JqZWN0LmtleXMocXNfc3RhdGUpLmxlbmd0aCkge1xuICAgICAgICB2YXIgdXBkYXRlcyA9IGNvbXBhcmUocXNfc3RhdGUsX3N0YXRlKVxuICAgICAgICByZXR1cm4gcHVibGlzaFFTVXBkYXRlcyh1cGRhdGVzLHFzX3N0YXRlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcy5wdWJsaXNoKFwic2VsZWN0ZWRfYWN0aW9uXCIsdmFsdWVbMF0pXG4gICAgICB9XG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwiaGlzdG9yeS5xc19zdGF0ZVwiLCBmdW5jdGlvbihlcnJvcixxc19zdGF0ZSxfc3RhdGUpIHtcblxuICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGhpc3Rvcnkuc3RhdGUpID09IEpTT04uc3RyaW5naWZ5KHFzX3N0YXRlKSkgcmV0dXJuXG4gICAgICBpZiAod2luZG93LmxvY2F0aW9uLnNlYXJjaCA9PSBcIlwiKSBoaXN0b3J5LnJlcGxhY2VTdGF0ZShxc19zdGF0ZSxcIlwiLHFzKHFzX3N0YXRlKS50byhxc19zdGF0ZSkpXG4gICAgICBlbHNlIGhpc3RvcnkucHVzaFN0YXRlKHFzX3N0YXRlLFwiXCIscXMocXNfc3RhdGUpLnRvKHFzX3N0YXRlKSlcblxuICAgIH0pXG59XG4iLCJpbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnXG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnYXBpJ1xuXG5jb25zdCBzID0gc3RhdGU7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgLy8gU3Vic2NyaXB0aW9ucyB0aGF0IHJlY2VpdmUgZGF0YSAvIG1vZGlmeSAvIGNoYW5nZSB3aGVyZSBpdCBpcyBzdG9yZWRcblxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJyZWNlaXZlLmRhdGFcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoU3RhdGljKFwibG9naWNfY2F0ZWdvcmllc1wiLHZhbHVlLmNhdGVnb3JpZXMpXG4gICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIsc3RhdGUuZmlsdGVycylcbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJyZWNlaXZlLmNvbXBhcmlzb25fZGF0YVwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIsc3RhdGUuZmlsdGVycylcbiAgICB9KVxuXG5cbiAgLy8gU3Vic2NyaXB0aW9ucyB0aGF0IHdpbGwgZ2V0IG1vcmUgZGF0YVxuXG4gIHN0YXRlXG4gICAgLnN1YnNjcmliZShcImdldC5hY3Rpb25fZGF0ZVwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJkYXRhXCIsYXBpLmFjdGlvbi5nZXREYXRhKHN0YXRlLnNlbGVjdGVkX2FjdGlvbixzdGF0ZS5hY3Rpb25fZGF0ZSkpXG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwiZ2V0LmNvbXBhcmlzb25fZGF0ZVwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBpZiAoIXZhbHVlKSByZXR1cm4gcy5wdWJsaXNoU3RhdGljKFwiY29tcGFyaXNvbl9kYXRhXCIsZmFsc2UpXG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJjb21wYXJpc29uX2RhdGFcIixhcGkuYWN0aW9uLmdldERhdGEoc3RhdGUuc2VsZWN0ZWRfY29tcGFyaXNvbixzdGF0ZS5jb21wYXJpc29uX2RhdGUpKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImdldC5zZWxlY3RlZF9hY3Rpb25cIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YSh2YWx1ZSxzdGF0ZS5hY3Rpb25fZGF0ZSkpXG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwiZ2V0LnNlbGVjdGVkX2NvbXBhcmlzb25cIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGZhbHNlKVxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiY29tcGFyaXNvbl9kYXRhXCIsYXBpLmFjdGlvbi5nZXREYXRhKHZhbHVlLHN0YXRlLmNvbXBhcmlzb25fZGF0ZSkpXG4gICAgfSlcblxuXG59XG4iLCJpbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnXG5pbXBvcnQge3FzfSBmcm9tICdzdGF0ZSdcbmltcG9ydCBidWlsZCBmcm9tICcuL2J1aWxkJ1xuaW1wb3J0IGhpc3RvcnlTdWJzY3JpcHRpb25zIGZyb20gJy4vc3Vic2NyaXB0aW9ucy9oaXN0b3J5J1xuaW1wb3J0IGFwaVN1YnNjcmlwdGlvbnMgZnJvbSAnLi9zdWJzY3JpcHRpb25zL2FwaSdcblxuXG5jb25zdCBzID0gc3RhdGU7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcblxuICBoaXN0b3J5U3Vic2NyaXB0aW9ucygpXG4gIGFwaVN1YnNjcmlwdGlvbnMoKVxuXG4gIFxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJjaGFuZ2UubG9hZGluZ1wiLCBmdW5jdGlvbihlcnJvcixsb2FkaW5nLHZhbHVlKSB7IGJ1aWxkKCkoKSB9KVxuICAgIC5zdWJzY3JpYmUoXCJjaGFuZ2UuZGFzaGJvYXJkX29wdGlvbnNcIiwgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikpXG4gICAgLnN1YnNjcmliZShcImNoYW5nZS50YWJzXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKSBcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLmxvZ2ljX29wdGlvbnNcIiwgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikgKVxuICAgIC5zdWJzY3JpYmUoXCJ1cGRhdGUuZmlsdGVyc1wiLCBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKSlcbiAgICBcblxuICAvLyBSRURSQVc6IHRoaXMgaXMgd2hlcmUgdGhlIGVudGlyZSBhcHAgZ2V0cyByZWRyYXduIC0gaWYgZm9ybWF0dGVkX2RhdGEgY2hhbmdlcywgcmVkcmF3IHRoZSBhcHBcblxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJyZWRyYXcuZm9ybWF0dGVkX2RhdGFcIiwgZnVuY3Rpb24oZXJyb3IsZm9ybWF0dGVkX2RhdGEsdmFsdWUpIHsgXG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIixmYWxzZSk7IFxuICAgICAgYnVpbGQoKSgpIFxuICAgIH0pXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGV9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgZDMgZnJvbSAnZDMnXG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnYXBpJ1xuaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IHZpZXcgZnJvbSAnLi92aWV3J1xuaW1wb3J0IGluaXRFdmVudHMgZnJvbSAnLi9ldmVudHMnXG5pbXBvcnQgaW5pdFN1YnNjcmlwdGlvbnMgZnJvbSAnLi9zdWJzY3JpcHRpb25zJ1xuXG5cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBidWlsZCh0YXJnZXQpIHtcbiAgY29uc3QgZGIgPSBuZXcgRGFzaGJvYXJkKHRhcmdldClcbiAgcmV0dXJuIGRiXG59XG5cbmNsYXNzIERhc2hib2FyZCB7XG5cbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgaW5pdEV2ZW50cygpXG4gICAgaW5pdFN1YnNjcmlwdGlvbnMoKVxuICAgIHRoaXMudGFyZ2V0KHRhcmdldClcbiAgICB0aGlzLmluaXQoKVxuXG4gICAgcmV0dXJuIHRoaXMuY2FsbC5iaW5kKHRoaXMpXG4gIH1cblxuICB0YXJnZXQodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0IHx8IGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiLmNvbnRhaW5lclwiKSxcImRpdlwiLFwiZGl2XCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwMHB4XCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiYXV0b1wiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCJhdXRvXCIpXG4gIH1cblxuICBpbml0KCkge1xuICAgIGxldCBzID0gc3RhdGU7XG4gICAgbGV0IHZhbHVlID0gcy5zdGF0ZSgpXG4gICAgdGhpcy5kZWZhdWx0cyhzKVxuICB9XG5cbiAgZGVmYXVsdHMocykge1xuXG4gICAgaWYgKCEhcy5zdGF0ZSgpLmRhc2hib2FyZF9vcHRpb25zKSByZXR1cm4gLy8gZG9uJ3QgcmVsb2FkIGRlZmF1bHRzIGlmIHByZXNlbnRcblxuICAgIHMucHVibGlzaFN0YXRpYyhcImFjdGlvbnNcIixhcGkuYWN0aW9uLmdldEFsbClcbiAgICBzLnB1Ymxpc2hTdGF0aWMoXCJzYXZlZFwiLGFwaS5kYXNoYm9hcmQuZ2V0QWxsKVxuICAgIHMucHVibGlzaFN0YXRpYyhcImxpbmVfaXRlbXNcIixhcGkubGluZV9pdGVtLmdldEFsbClcblxuICAgIHZhciBERUZBVUxUUyA9IHtcbiAgICAgICAgbG9naWNfb3B0aW9uczogW3tcImtleVwiOlwiQWxsXCIsXCJ2YWx1ZVwiOlwiYW5kXCJ9LHtcImtleVwiOlwiQW55XCIsXCJ2YWx1ZVwiOlwib3JcIn1dXG4gICAgICAsIGxvZ2ljX2NhdGVnb3JpZXM6IFtdXG4gICAgICAsIGZpbHRlcnM6IFt7fV0gXG4gICAgICAsIGRhc2hib2FyZF9vcHRpb25zOiBbXG4gICAgICAgICAgICB7XCJrZXlcIjpcIkRhdGEgc3VtbWFyeVwiLFwidmFsdWVcIjpcInN1bW1hcnktdmlld1wiLFwic2VsZWN0ZWRcIjoxfVxuICAgICAgICAgICwge1wia2V5XCI6XCJFeHBsb3JlIGRhdGFcIixcInZhbHVlXCI6XCJkYXRhLXZpZXdcIixcInNlbGVjdGVkXCI6MH1cbiAgICAgICAgICAsIHtcImtleVwiOlwiQmVmb3JlICYgQWZ0ZXJcIixcInZhbHVlXCI6XCJiYS12aWV3XCIsXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIlRpbWluZ1wiLFwidmFsdWVcIjpcInRpbWluZy12aWV3XCIsXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIk1lZGlhIFBsYW5cIiwgXCJ2YWx1ZVwiOlwibWVkaWEtdmlld1wiLFwic2VsZWN0ZWRcIjowfVxuXG4gICAgICAgIF1cbiAgICB9XG5cbiAgICBzLnVwZGF0ZShmYWxzZSxERUZBVUxUUylcbiAgfVxuXG4gIGNhbGwoKSB7XG5cbiAgIGxldCBzID0gc3RhdGU7XG4gICBsZXQgdmFsdWUgPSBzLnN0YXRlKClcblxuICAgbGV0IGRiID0gdmlldyh0aGlzLl90YXJnZXQpXG4gICAgIC5zdGFnZWRfZmlsdGVycyh2YWx1ZS5zdGFnZWRfZmlsdGVyIHx8IFwiXCIpXG4gICAgIC5zYXZlZCh2YWx1ZS5zYXZlZCB8fCBbXSlcbiAgICAgLmRhdGEodmFsdWUuZm9ybWF0dGVkX2RhdGEgfHwge30pXG4gICAgIC5hY3Rpb25zKHZhbHVlLmFjdGlvbnMgfHwgW10pXG4gICAgIC5zZWxlY3RlZF9hY3Rpb24odmFsdWUuc2VsZWN0ZWRfYWN0aW9uIHx8IHt9KVxuICAgICAuc2VsZWN0ZWRfY29tcGFyaXNvbih2YWx1ZS5zZWxlY3RlZF9jb21wYXJpc29uIHx8IHt9KVxuICAgICAuYWN0aW9uX2RhdGUodmFsdWUuYWN0aW9uX2RhdGUgfHwgMClcbiAgICAgLmNvbXBhcmlzb25fZGF0ZSh2YWx1ZS5jb21wYXJpc29uX2RhdGUgfHwgMClcbiAgICAgLmxvYWRpbmcodmFsdWUubG9hZGluZyB8fCBmYWxzZSlcbiAgICAgLmxpbmVfaXRlbXModmFsdWUubGluZV9pdGVtcyB8fCBmYWxzZSlcbiAgICAgLnN1bW1hcnkodmFsdWUuc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLnRpbWVfc3VtbWFyeSh2YWx1ZS50aW1lX3N1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC5jYXRlZ29yeV9zdW1tYXJ5KHZhbHVlLmNhdGVnb3J5X3N1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC5rZXl3b3JkX3N1bW1hcnkodmFsdWUua2V5d29yZF9zdW1tYXJ5IHx8IGZhbHNlKVxuICAgICAuYmVmb3JlKHZhbHVlLmJlZm9yZV91cmxzIHx8IFtdKVxuICAgICAuYWZ0ZXIodmFsdWUuYWZ0ZXJfdXJscyB8fCBbXSlcbiAgICAgLmxvZ2ljX29wdGlvbnModmFsdWUubG9naWNfb3B0aW9ucyB8fCBmYWxzZSlcbiAgICAgLmxvZ2ljX2NhdGVnb3JpZXModmFsdWUubG9naWNfY2F0ZWdvcmllcyB8fCBmYWxzZSlcbiAgICAgLmZpbHRlcnModmFsdWUuZmlsdGVycyB8fCBmYWxzZSlcbiAgICAgLnZpZXdfb3B0aW9ucyh2YWx1ZS5kYXNoYm9hcmRfb3B0aW9ucyB8fCBmYWxzZSlcbiAgICAgLmV4cGxvcmVfdGFicyh2YWx1ZS50YWJzIHx8IGZhbHNlKVxuICAgICAub24oXCJhZGQtZmlsdGVyXCIsIHMucHJlcGFyZUV2ZW50KFwiYWRkLWZpbHRlclwiKSlcbiAgICAgLm9uKFwibW9kaWZ5LWZpbHRlclwiLCBzLnByZXBhcmVFdmVudChcIm1vZGlmeS1maWx0ZXJcIikpXG4gICAgIC5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikpXG4gICAgIC5vbihcImFjdGlvbi5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJhY3Rpb24uY2hhbmdlXCIpKVxuICAgICAub24oXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgIC5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIpKVxuICAgICAub24oXCJjb21wYXJpc29uLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImNvbXBhcmlzb24uY2hhbmdlXCIpKVxuICAgICAub24oXCJsb2dpYy5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJsb2dpYy5jaGFuZ2VcIikpXG4gICAgIC5vbihcImZpbHRlci5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJmaWx0ZXIuY2hhbmdlXCIpKVxuICAgICAub24oXCJ2aWV3LmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcInZpZXcuY2hhbmdlXCIpKVxuICAgICAub24oXCJ0YWIuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwidGFiLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiYmEuc29ydFwiLCBzLnByZXBhcmVFdmVudChcImJhLnNvcnRcIikpXG4gICAgIC5kcmF3KClcbiAgIFxuICB9XG59XG4iLCJ2YXIgdmVyc2lvbiA9IFwiMC4wLjFcIjsgZXhwb3J0ICogZnJvbSBcIi4uL2luZGV4XCI7IGV4cG9ydCB7dmVyc2lvbn07Il0sIm5hbWVzIjpbIm5vb3AiLCJzdGF0ZSIsImQzX3VwZGF0ZWFibGUiLCJkM19zcGxhdCIsImJ1aWxkRG9tYWlucyIsInN0YXRlLmNvbXBfZXZhbCIsInN0YXRlLnFzIiwiYWNjZXNzb3IiLCJpZGVudGl0eSIsImtleSIsImQzIiwidGFibGUiLCJhY2Nlc3NvciQxIiwiZmlsdGVyIiwic2VsZWN0IiwidCIsInByZXBEYXRhIiwicCIsIkVYQU1QTEVfREFUQSIsInRpbWVzZXJpZXMucHJlcERhdGEiLCJ0aW1lc2VyaWVzWydkZWZhdWx0J10iLCJidWNrZXRzIiwiU1RPUFdPUkRTIiwiaG91cmJ1Y2tldHMiLCJjb21wdXRlU2NhbGUiLCJ0aW1pbmdIZWFkZXJzIiwiZDNfY2xhc3MiLCJyZWxhdGl2ZV92aWV3IiwidGltaW5nX3ZpZXciLCJzdGFnZWRfZmlsdGVyX3ZpZXciLCJpbml0IiwicyIsImZpbHRlckluaXQiLCJhY3Rpb25Jbml0IiwiYXBpLmFjdGlvbiIsImhpc3RvcnlTdWJzY3JpcHRpb25zIiwiYXBpU3Vic2NyaXB0aW9ucyIsImluaXRFdmVudHMiLCJpbml0U3Vic2NyaXB0aW9ucyIsImFwaS5kYXNoYm9hcmQiLCJhcGkubGluZV9pdGVtIiwidmlldyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFPLE1BQU0sYUFBYSxHQUFHLFNBQVMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtFQUN0RSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksS0FBSyxDQUFBO0VBQ3hCLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSTtJQUM5QyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QyxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDbEMsQ0FBQTs7RUFFRCxVQUFVLENBQUMsS0FBSyxFQUFFO0tBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBOztFQUVmLE9BQU8sVUFBVTtDQUNsQixDQUFBOztBQUVELEFBQU8sTUFBTSxRQUFRLEdBQUcsU0FBUyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0VBQ2pFLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxLQUFLLENBQUE7RUFDeEIsSUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJO0lBQzlDLElBQUksSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdCLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ2hDLENBQUE7O0VBRUQsVUFBVSxDQUFDLEtBQUssRUFBRTtLQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTs7RUFFZixPQUFPLFVBQVU7Q0FDbEIsQ0FBQTs7QUFF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QixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7RUFDVixFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7SUFDN0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtNQUM5QixJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1dBQ3hDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBOztLQUVqQyxDQUFDLENBQUE7R0FDSCxDQUFDLENBQUE7RUFDRixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFO0tBQ25CLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7S0FDN0MsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFO01BQ2xCLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDNUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFBO1FBQ3hCLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUNsQixDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUE7UUFDdkIsT0FBTyxDQUFDO09BQ1QsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDMUMsQ0FBQztLQUNELE9BQU8sQ0FBQyxFQUFFLENBQUM7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QixJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7TUFDaEIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQTs7TUFFcEMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksU0FBUyxFQUFFLE1BQU07TUFDdkMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTTs7TUFFMUUsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNO1VBQ3hCLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQzs7TUFFOUIsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQzdCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRO1lBQzlCLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFBOztRQUVsQyxPQUFPLE1BQU0sQ0FBQyxLQUFLLEdBQUdBLElBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHQSxJQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDN0QsQ0FBQyxDQUFBOztNQUVGLElBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7U0FDckcsS0FBSyxFQUFFO1NBQ1AsRUFBRSxDQUFDLE9BQU8s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QUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDM0UsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBOztHQUUvRTtDQUNGOztBQzNDTSxTQUFTLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNoRCxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksR0FBRztNQUNoQixNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTs7RUFFcEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7RUFDckcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBOztFQUUvRSxJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsTUFB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RSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztFQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSTtJQUNmLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtHQUNuQixDQUFDLENBQUE7RUFDRixVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7RUFDN0QsT0FBTyxDQUFDO0NBQ1QsQ0FBQyxFQUFFLENBQUMsQ0FBQTs7O0FBR0wsQUFBTyxNQUFNLFNBQVMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBOztBQUU1SSxTQUFTLFFBQVEsQ0FBQyxJQUFJLEVBQUU7RUFDdEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztNQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUE7TUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQTtNQUNwRCxPQUFPLENBQUM7S0FDVCxDQUFDLEVBQUUsQ0FBQztDQUNSOztBQUVELFNBQVMsU0FBUyxDQUFDLElBQUksRUFBRTtFQUN2QixJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUE7RUFDWixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUk7SUFDekIsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtHQUMvQyxDQUFDLENBQUE7O0VBRUYsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztLQUNuQixHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7TUFDZCxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUE7TUFDYixDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO01BQ3pCLE9BQU8sQ0FBQztLQUNULENBQUM7Q0FDTDs7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0VBQ2pDLElBQUksR0FBRyxHQUFHLElBQUk7S0FDWCxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQ25CLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJO1FBQy9GLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQTtRQUN0QixJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1VBQzFMLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1VBQ2pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUEsRUFBRSxDQUFDLENBQUE7U0FDaEY7T0FDRixDQUFDLENBQUE7O01BRUYsT0FBTyxDQUFDO0tBQ1QsQ0FBQyxFQUFFLENBQUMsQ0FBQTs7RUFFUCxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO0tBQ25CLEdBQUcsQ0FBQyxDQUFDLElBQUk7TUFDUixDQUFDLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFD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QUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTs7O0VBRzNILElBQUksWUFBWSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSztNQUM1RCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUN6RCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztNQUN0QyxPQUFPLE1BQU07S0FDZCxDQUFDLENBQUMsUUFBUSxDQUFDO0dBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQTs7RUFFSixJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUs7TUFDMUQsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDdkQsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7TUFDdEMsT0FBTyxNQUFNO0tBQ2QsQ0FBQyxDQUFDLFFBQVEsQ0FBQztHQUNiLENBQUMsQ0FBQyxDQUFDLENBQUE7OztFQUdKLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO01BQzlELFVBQVUsR0FB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SyxHQUFHLENBQUM7U0FDekU7T0FDRixDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDM0MsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUE7O01BRS9DLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUM3QixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNuQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1VBQ3ZCLElBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBQzVELElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7VUFDMUYsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNwQixJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FB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
