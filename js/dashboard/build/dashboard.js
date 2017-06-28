(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
	typeof define === 'function' && define.amd ? define('dashboard', ['exports', 'd3'], factory) :
	(factory((global.dashboard = global.dashboard || {}),global.d3));
}(this, (function (exports,d3$1) { 'use strict';

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

function accessor$1(attr, val) {
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
      return accessor$1.bind(this)("options",val) 
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
      return accessor$1.bind(this)("selected",val)
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
      return accessor$1.bind(this)("text",val) 
    }
  , options: function(val) {
      return accessor$1.bind(this)("options",val) 
    }
  , buttons: function(val) {
      return accessor$1.bind(this)("buttons",val) 
    }
  , expansion: function(val) {
      return accessor$1.bind(this)("expansion",val) 
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

function accessor$2(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val;
  return this
}

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
    d3_updateable$2(d3$1.select("head"),"style#table-css","style")
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
      var headers = d3_updateable$2(d3$1.select(this),".headers","div")
        .classed("headers",true)
        .style("text-transform","uppercase")
        .style("font-weight","bold")
        .style("line-height","24px")
        .style("border-bottom","1px solid #ccc")
        .style("margin-bottom","10px");

      headers.html("");


      d3_updateable$2(headers,".url","div")
        .classed("url",true)
        .style("width","75%")
        .style("display","inline-block")
        .text("Article");

      d3_updateable$2(headers,".count","div")
        .classed("count",true)
        .style("width","25%")
        .style("display","inline-block")
        .text("Count");


    });

  };
  this._render_row = function(row) {

      d3_updateable$2(row,".url","div")
        .classed("url",true)
        .style("width","75%")
        .style("line-height","24px")
        .style("height","24px")
        .style("overflow","hidden")
        .style("display","inline-block")
        .text(function(x) {return x.key});

      d3_updateable$2(row,".count","div")
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
      var value = accessor$2.bind(this)("data",val); 
      if (val && val.values.length && this._headers == undefined) { 
        var headers = Object.keys(val.values[0]).map(function(x) { return {key:x,value:x} });
        this.headers(headers);
      }
      return value
    }
  , skip_option: function(val) { return accessor$2.bind(this)("skip_option",val) }

  , title: function(val) { return accessor$2.bind(this)("title",val) }
  , row: function(val) { return accessor$2.bind(this)("render_row",val) }
  , default_renderer: function(val) { return accessor$2.bind(this)("default_renderer",val) }
  , top: function(val) { return accessor$2.bind(this)("top",val) }

  , header: function(val) { return accessor$2.bind(this)("render_header",val) }
  , headers: function(val) { return accessor$2.bind(this)("headers",val) }
  , hidden_fields: function(val) { return accessor$2.bind(this)("hidden_fields",val) }
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

      var wrapper = d3_updateable$2(wrap,".table-wrapper","div")
        .classed("table-wrapper",true)
        .style("position","relative");


      var table = d3_updateable$2(wrapper,"table.main","table")
        .classed("main",true)
        .style("width","100%");

      this._table_main = table;

      var thead = d3_updateable$2(table,"thead","thead");
      d3_updateable$2(table,"tbody","tbody");



      if (!this._skip_option) {
      var table_fixed = d3_updateable$2(wrapper,"table.fixed","table")
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


      var thead = d3_updateable$2(table_fixed,"thead","thead");

      var table_button = d3_updateable$2(wrapper,".table-option","a")
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

      var options_thead = d3_updateable$2(thead,"tr.table-options","tr",this.all_headers(),function(x){ return 1})
        .classed("hidden", !this._show_options)
        .classed("table-options",true);

      var h = this._skip_option ? this.headers() : this.headers().concat([{key:"spacer", width:"70px"}]);
      var headers_thead = d3_updateable$2(thead,"tr.table-headers","tr",h,function(x){ return 1})
        .classed("table-headers",true);


      var th = d3_splat$2(headers_thead,"th","th",false,function(x,i) {return x.key + i })
        .style("width",function(x) { return x.width })
        .style("position","relative")
        .order();


      d3_updateable$2(th,"span","span")
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

      d3_updateable$2(th,"i","i")
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

      var draggable = d3_updateable$2(th,"b","b")
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
      var options = d3_updateable$2(options_thead,"th","th",false,function() { return 1})
        .attr("colspan",this.headers().length+1)
        .style("padding-top","10px")
        .style("padding-bottom","10px");
                
      var option = d3_splat$2(options,".option","div",false,function(x) { return x.key })
        .classed("option",true)
        .style("width","240px")
        .style("display","inline-block");


      option.exit().remove();

      var self = this;

      d3_updateable$2(option,"input","input")
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

      d3_updateable$2(option,"span","span")
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

      var rows = d3_splat$2(tbody,"tr","tr",data,function(x,i){ return String(sortby.key + x[sortby.key]) + i })
        .order()
        .on("click",function(x) {
          self.on("expand").bind(this)(x);
        });

      rows.exit().remove();

      var td = d3_splat$2(rows,"td","td",this.headers(),function(x,i) {return x.key + i })
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

      var o = d3_updateable$2(rows,"td.option-header","td",false,function() { return 1})
        .classed("option-header",true)
        .style("width","70px")
        .style("text-align","center");
 
      if (this._skip_option) o.classed("hidden",true); 


      d3_updateable$2(o,"a","a")
        .style("font-weight","bold")
        .html(self.option_text());
        



    }
  , option_text: function(val) { return accessor$2.bind(this)("option_text",val) }
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

function d3_updateable$3(target,selector,type,data,joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(
    function(x){return data ? [data] : [x]},
    joiner || function(x){return [x]}
  );

  updateable.enter()
    .append(type);

  return updateable
}

function d3_splat$3(target,selector,type,data,joiner) {
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

      var wrap = d3_updateable$3(this._target,".filters-wrapper","div",this.data(),function() { return 1})
        .classed("filters-wrapper",true)
        .style("padding-left", "10px")
        .style("padding-right", "20px");

      var filters = d3_updateable$3(wrap,".filters","div",false,function(x) { return 1})
        .classed("filters",true);
      
      var filter = d3_splat$3(filters,".filter","div",function(x) { return x },function(x,i) { return i + x.field })
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

      var remove = d3_updateable$3(_filter,".remove","a")
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

      var filter = d3_updateable$3(_filter,".inner","div")
        .classed("inner",true);

      var select = d3_updateable$3(filter,"select.field","select",fields)
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
      
      d3_updateable$3(select,"option","option")
        .property("disabled" ,true)
        .property("hidden", true)
        .text("Filter...");

      
      d3_splat$3(select,"option","option")
        .text(function(x) { return x })
        .attr("selected", function(x) { return x == value.field ? "selected" : undefined });

      if (value.op && value.field && value.value) {
        var pos = fields.indexOf(value.field);
        self.drawOps(filter, ops[pos], value, pos);
      }


    }
  , drawOps: function(filter, ops, value) {

      

      var self = this;

      var select = d3_updateable$3(filter,"select.op","select",false, function(x) {return 1})
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

      var ops = d3_splat$3(select,"option","option",new_ops,function(x){return x.key})
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

      d3_updateable$3(filter,"input.value","input")
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
      var footer = d3_updateable$3(wrap,".filter-footer","div",false,function(x) { return 1})
        .classed("filter-footer",true)
        .style("margin-bottom","15px")
        .style("margin-top","10px");


      var self = this;
      
      d3_updateable$3(footer,".add","a",false,function(x) { return 1})
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
      return accessor$1.bind(this)("data",val) 
    }
  , logic: function(val) {
      return accessor$1.bind(this)("logic",val) 
    }
  , categories: function(val) {
      return accessor$1.bind(this)("categories",val) 
    }
  , filters: function(val) {
      return accessor$1.bind(this)("filters",val) 
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
      return accessor$1.bind(this)("data",val) 
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
      return accessor$1.bind(this)("data",val) 
    }
  , options: function(val) {
      return accessor$1.bind(this)("options",val) 
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

    data: function(val) { return accessor$1.bind(this)("data",val) }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
  , title: function(val) { return accessor$1.bind(this)("title",val) }
  , height: function(val) { return accessor$1.bind(this)("height",val) }

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

function DomainExpanded(target) {
  this._on = {};
  this.target = target;
}

function domain_expanded(target) {
  return new DomainExpanded(target)
}


DomainExpanded.prototype = {
    data: function(val) {
      return accessor$1.bind(this)("data",val)
    }
  , raw: function(val) {
      return accessor$1.bind(this)("raw",val)
    }
  , urls: function(val) {
      return accessor$1.bind(this)("urls",val)
    }
  , draw: function() {

      var self = this;

      var data = this._raw;
      var d = { domain: data[0].domain };


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
            var values = STOPWORDS;
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
      if (fn === undefined) return this._on[action] || noop$2;
      this._on[action] = fn;
      return this
    }
};

function DomainBullet(target) {
  this._on = {};
  this.target = target;
}

function noop$10() {}
function domain_bullet(target) {
  return new DomainBullet(target)
}

DomainBullet.prototype = {
    data: function(val) {
      return accessor$1.bind(this)("data",val) 
    }
  , max: function(val) {
      return accessor$1.bind(this)("max",val) 
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
      if (fn === undefined) return this._on[action] || noop$10;
      this._on[action] = fn;
      return this
    }
};

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
      return accessor$1.bind(this)("data",val) 
    }
  , options: function(val) {
      return accessor$1.bind(this)("options",val) 
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
          var rolled = prepData$1(dd);
          
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
      if (fn === undefined) return this._on[action] || noop$9;
      this._on[action] = fn;
      return this
    }
};

function noop$11() {}
function SegmentView(target) {
  this._on = {
    select: noop$11
  };
  this.target = target;
}

function segment_view(target) {
  return new SegmentView(target)
}

SegmentView.prototype = {
    data: function(val) {
      return accessor$1.bind(this)("data",val) 
    }
  , segments: function(val) {
      return accessor$1.bind(this)("segments",val) 
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
      return accessor$1.bind(this)("action_date",val)
    }
  , action: function(val) {
      return accessor$1.bind(this)("action",val)
    }
  , comparison_date: function(val) {
      return accessor$1.bind(this)("comparison_date",val)
    }

  , comparison: function(val) {
      return accessor$1.bind(this)("comparison",val)
    }
  , is_loading: function(val) {
      return accessor$1.bind(this)("is_loading",val)
    }

  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop$11;
      this._on[action] = fn;
      return this
    }
};

function Pie(target) {
  this.target = target;
}

Pie.prototype = {
    radius: function(val) {
      return accessor$1.bind(this)("radius",val)
    }
  , data: function(val) {
      return accessor$1.bind(this)("data",val) 
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

  key_accessor(val) { return accessor$1.bind(this)("key_accessor",val) }
  value_accessor(val) { return accessor$1.bind(this)("value_accessor",val) }
  bar_height(val) { return accessor$1.bind(this)("bar_height",val) }
  bar_width(val) { return accessor$1.bind(this)("bar_width",val) }



  data(val) { return accessor$1.bind(this)("data",val) } 
  title(val) { return accessor$1.bind(this)("title",val) } 


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

  key_accessor(val) { return accessor$1.bind(this)("key_accessor",val) }
  pop_value_accessor(val) { return accessor$1.bind(this)("pop_value_accessor",val) }
  samp_value_accessor(val) { return accessor$1.bind(this)("samp_value_accessor",val) }

  bar_height(val) { return accessor$1.bind(this)("bar_height",val) }
  bar_width(val) { return accessor$1.bind(this)("bar_width",val) }



  data(val) { return accessor$1.bind(this)("data",val) } 
  title(val) { return accessor$1.bind(this)("title",val) } 


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

  key_accessor(val) { return accessor$1.bind(this)("key_accessor",val) }
  value_accessor(val) { return accessor$1.bind(this)("value_accessor",val) }

  height(val) { return accessor$1.bind(this)("height",val) }
  space(val) { return accessor$1.bind(this)("space",val) }
  middle(val) { return accessor$1.bind(this)("middle",val) }
  buckets(val) { return accessor$1.bind(this)("buckets",val) }

  rows(val) { return accessor$1.bind(this)("rows",val) }
  after(val) { return accessor$1.bind(this)("after",val) }




  data(val) { return accessor$1.bind(this)("data",val) } 
  title(val) { return accessor$1.bind(this)("title",val) } 

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

  key_accessor(val) { return accessor$1.bind(this)("key_accessor",val) }
  value_accessor(val) { return accessor$1.bind(this)("value_accessor",val) }
  height(val) { return accessor$1.bind(this)("height",val) }
  width(val) { return accessor$1.bind(this)("width",val) }


  data(val) { return accessor$1.bind(this)("data",val) } 
  title(val) { return accessor$1.bind(this)("title",val) } 


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

function noop$12() {}
function SummaryView(target) {
  this._on = {
    select: noop$12
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





function drawStream(target,before,after) {

function extractData(b,a,buckets,accessor) {
  var bvolume = {}, avolume = {};

  try { var bvolume = b[0].reduce(function(p,c) { p[c.x] = accessor(c); return p },{}); } catch(e) {}
  try { var avolume = a[0].reduce(function(p,c) { p[c.x] = accessor(c); return p },{}); } catch(e) {}

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
      return accessor$1.bind(this)("data",val)
    }
  , timing: function(val) {
      return accessor$1.bind(this)("timing",val)
    }
  , category: function(val) {
      return accessor$1.bind(this)("category",val)
    }
  , keywords: function(val) {
      return accessor$1.bind(this)("keywords",val)
    }
  , before: function(val) {
      return accessor$1.bind(this)("before",val)
    }
  , after: function(val) {
      return accessor$1.bind(this)("after",val)
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

  data(val) { return accessor$1.bind(this)("data",val) }
  stages(val) { return accessor$1.bind(this)("stages",val) }

  before_urls(val) { return accessor$1.bind(this)("before_urls",val) }
  after_urls(val) { return accessor$1.bind(this)("after_urls",val) }



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

  data(val) { return accessor$1.bind(this)("data",val) } 

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

  data(val) { return accessor$1.bind(this)("data",val) } 

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
          var rolled = prepData$1(dd);
          
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

  data(val) { return accessor$1.bind(this)("data",val) } 

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
      return accessor$1.bind(this)("data",val) 
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
      return accessor$1.bind(this)("data",val) 
    }
  , staged_filters: function(val) {
      return accessor$1.bind(this)("staged_filters",val) || ""
    }
  , saved: function(val) {
      return accessor$1.bind(this)("saved",val) 
    }
  , line_items: function(val) {
      return accessor$1.bind(this)("line_items",val) || []
    }
  , selected_action: function(val) {
      return accessor$1.bind(this)("selected_action",val) 
    }
  , selected_comparison: function(val) {
      return accessor$1.bind(this)("selected_comparison",val) 
    }
  , action_date: function(val) {
      return accessor$1.bind(this)("action_date",val) 
    }
  , comparison_date: function(val) {
      return accessor$1.bind(this)("comparison_date",val) 
    }

  , view_options: function(val) {
      return accessor$1.bind(this)("view_options",val) || []
    }
  , logic_options: function(val) {
      return accessor$1.bind(this)("logic_options",val) || []
    }
  , explore_tabs: function(val) {
      return accessor$1.bind(this)("explore_tabs",val) || []
    }
  , logic_categories: function(val) {
      return accessor$1.bind(this)("logic_categories",val) || []
    }
  , actions: function(val) {
      return accessor$1.bind(this)("actions",val) || []
    }
  , summary: function(val) {
      return accessor$1.bind(this)("summary",val) || []
    }
  , time_summary: function(val) {
      return accessor$1.bind(this)("time_summary",val) || []
    }
  , category_summary: function(val) {
      return accessor$1.bind(this)("category_summary",val) || []
    }
  , keyword_summary: function(val) {
      return accessor$1.bind(this)("keyword_summary",val) || []
    }
  , before: function(val) {
      return accessor$1.bind(this)("before",val) || []
    }
  , after: function(val) {
      return accessor$1.bind(this)("after",val) || []
    }
  , filters: function(val) {
      return accessor$1.bind(this)("filters",val) || []
    }
  , loading: function(val) {
      if (val !== undefined) this._segment_view && this._segment_view.is_loading(val).draw();
      return accessor$1.bind(this)("loading",val)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFzaGJvYXJkLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvaGVscGVycy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdGF0ZS9zcmMvc3RhdGUuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvc3JjL3FzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N0YXRlL3NyYy9jb21wX2V2YWwuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvbWVkaWFfcGxhbi9zcmMvbWVkaWFfcGxhbi5qcyIsIi4uL3NyYy9oZWxwZXJzL2RhdGFfaGVscGVycy5qcyIsIi4uL3NyYy9oZWxwZXJzL2dyYXBoX2hlbHBlcnMuanMiLCIuLi9zcmMvaGVscGVycy9zdGF0ZV9oZWxwZXJzLmpzIiwiLi4vc3JjL2hlbHBlcnMuanMiLCIuLi9zcmMvZ2VuZXJpYy9zZWxlY3QuanMiLCIuLi9zcmMvZ2VuZXJpYy9oZWFkZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvdGFibGUvYnVpbGQvdGFibGUuZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvZmlsdGVyL2J1aWxkL2ZpbHRlci5lcy5qcyIsIi4uL3NyYy92aWV3cy9maWx0ZXJfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2J1dHRvbl9yYWRpby5qcyIsIi4uL3NyYy92aWV3cy9vcHRpb25fdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL3RpbWVzZXJpZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvY2hhcnQvc3JjL3NpbXBsZV90aW1lc2VyaWVzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2NoYXJ0L3NyYy9zaW1wbGVfYmFyLmpzIiwiLi4vc3JjL2NvbnN0YW50cy5qcyIsIi4uL3NyYy92aWV3cy9kb21haW5fZXhwYW5kZWQuanMiLCIuLi9zcmMvdmlld3MvZG9tYWluX2J1bGxldC5qcyIsIi4uL3NyYy92aWV3cy9kb21haW5fdmlldy5qcyIsIi4uL3NyYy92aWV3cy9zZWdtZW50X3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy9waWUuanMiLCIuLi9zcmMvZ2VuZXJpYy9kaWZmX2Jhci5qcyIsIi4uL3NyYy9nZW5lcmljL2NvbXBfYmFyLmpzIiwiLi4vc3JjL2dlbmVyaWMvY29tcF9idWJibGUuanMiLCIuLi9zcmMvZ2VuZXJpYy9zdHJlYW1fcGxvdC5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5X3ZpZXcuanMiLCIuLi9zcmMvdmlld3MvcmVmaW5lLmpzIiwiLi4vc3JjL3ZpZXdzL3JlbGF0aXZlX3RpbWluZ192aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3RpbWluZ192aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3N0YWdlZF9maWx0ZXJfdmlldy5qcyIsIi4uL3NyYy9nZW5lcmljL2NvbmRpdGlvbmFsX3Nob3cuanMiLCIuLi9zcmMvZ2VuZXJpYy9zaGFyZS5qcyIsIi4uL3NyYy92aWV3LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2FwaS9zcmMvYWN0aW9uLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2FwaS9pbmRleC5qcyIsIi4uL3NyYy9ldmVudHMvZmlsdGVyX2V2ZW50cy5qcyIsIi4uL3NyYy9ldmVudHMvYWN0aW9uX2V2ZW50cy5qcyIsIi4uL3NyYy9ldmVudHMuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy9oaXN0b3J5LmpzIiwiLi4vc3JjL3N1YnNjcmlwdGlvbnMvYXBpLmpzIiwiLi4vc3JjL3N1YnNjcmlwdGlvbnMuanMiLCIuLi9zcmMvYnVpbGQuanMiLCJidW5kbGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IGQzX3VwZGF0ZWFibGUgPSBmdW5jdGlvbih0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIlxuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZnVuY3Rpb24oeCl7cmV0dXJuIGRhdGEgPyBbZGF0YV0gOiBbeF19LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4gW3hdfVxuICApXG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKVxuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmV4cG9ydCBjb25zdCBkM19zcGxhdCA9IGZ1bmN0aW9uKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSxkYXRhKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5cIiArIGNscywgdHlwZSB8fCBcImRpdlwiLGRhdGEpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub29wKCkge31cbmV4cG9ydCBmdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmV4cG9ydCBmdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbiIsImV4cG9ydCBmdW5jdGlvbiBTdGF0ZShfY3VycmVudCwgX3N0YXRpYykge1xuXG4gIHRoaXMuX25vb3AgPSBmdW5jdGlvbigpIHt9XG4gIHRoaXMuX2V2ZW50cyA9IHt9XG5cbiAgdGhpcy5fb24gPSB7XG4gICAgICBcImNoYW5nZVwiOiB0aGlzLl9ub29wXG4gICAgLCBcImJ1aWxkXCI6IHRoaXMuX25vb3BcbiAgICAsIFwiZm9yd2FyZFwiOiB0aGlzLl9ub29wXG4gICAgLCBcImJhY2tcIjogdGhpcy5fbm9vcFxuICB9XG5cbiAgdGhpcy5fc3RhdGljID0gX3N0YXRpYyB8fCB7fVxuXG4gIHRoaXMuX2N1cnJlbnQgPSBfY3VycmVudCB8fCB7fVxuICB0aGlzLl9wYXN0ID0gW11cbiAgdGhpcy5fZnV0dXJlID0gW11cblxuICB0aGlzLl9zdWJzY3JpcHRpb24gPSB7fVxuICB0aGlzLl9zdGF0ZSA9IHRoaXMuX2J1aWxkU3RhdGUoKVxuXG5cbn1cblxuU3RhdGUucHJvdG90eXBlID0ge1xuICAgIHN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBwdWJsaXNoOiBmdW5jdGlvbihuYW1lLGNiKSB7XG5cbiAgICAgICB2YXIgcHVzaF9jYiA9IGZ1bmN0aW9uKGVycm9yLHZhbHVlKSB7XG4gICAgICAgICBpZiAoZXJyb3IpIHJldHVybiBzdWJzY3JpYmVyKGVycm9yLG51bGwpXG4gICAgICAgICBcbiAgICAgICAgIHRoaXMudXBkYXRlKG5hbWUsIHZhbHVlKVxuICAgICAgICAgdGhpcy50cmlnZ2VyKG5hbWUsIHRoaXMuc3RhdGUoKVtuYW1lXSwgdGhpcy5zdGF0ZSgpKVxuXG4gICAgICAgfS5iaW5kKHRoaXMpXG5cbiAgICAgICBpZiAodHlwZW9mIGNiID09PSBcImZ1bmN0aW9uXCIpIGNiKHB1c2hfY2IpXG4gICAgICAgZWxzZSBwdXNoX2NiKGZhbHNlLGNiKVxuXG4gICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcHVibGlzaEJhdGNoOiBmdW5jdGlvbihvYmopIHtcbiAgICAgIE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdGhpcy51cGRhdGUoeCxvYmpbeF0pXG4gICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgIHRoaXMudHJpZ2dlckJhdGNoKG9iaix0aGlzLnN0YXRlKCkpXG4gICAgfVxuICAsIHB1c2g6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICB0aGlzLnB1Ymxpc2goZmFsc2Usc3RhdGUpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzdWJzY3JpYmU6IGZ1bmN0aW9uKCkge1xuXG4gICAgICAvLyB0aHJlZSBvcHRpb25zIGZvciB0aGUgYXJndW1lbnRzOlxuICAgICAgLy8gKGZuKSBcbiAgICAgIC8vIChpZCxmbilcbiAgICAgIC8vIChpZC50YXJnZXQsZm4pXG5cblxuICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHRoaXMuX2dsb2JhbF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdKVxuICAgICAgaWYgKGFyZ3VtZW50c1swXS5pbmRleE9mKFwiLlwiKSA9PSAtMSkgcmV0dXJuIHRoaXMuX25hbWVkX3N1YnNjcmliZShhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSlcbiAgICAgIGlmIChhcmd1bWVudHNbMF0uaW5kZXhPZihcIi5cIikgPiAtMSkgcmV0dXJuIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdLnNwbGl0KFwiLlwiKVswXSwgYXJndW1lbnRzWzBdLnNwbGl0KFwiLlwiKVsxXSwgYXJndW1lbnRzWzFdKVxuXG4gICAgfVxuICAsIHVuc3Vic2NyaWJlOiBmdW5jdGlvbihpZCkge1xuICAgICAgdGhpcy5zdWJzY3JpYmUoaWQsdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgLCBfZ2xvYmFsX3N1YnNjcmliZTogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHZhciBpZCA9ICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24oYykge1xuICAgICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKSoxNnwwLCB2ID0gYyA9PSAneCcgPyByIDogKHImMHgzfDB4OCk7XG4gICAgICAgICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICAgICAgICB9KVxuICAgICAgLCB0byA9IFwiKlwiO1xuICAgICBcbiAgICAgIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoaWQsdG8sZm4pXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIF9uYW1lZF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGlkLGZuKSB7XG4gICAgICB2YXIgdG8gPSBcIipcIlxuICAgICAgdGhpcy5fdGFyZ2V0dGVkX3N1YnNjcmliZShpZCx0byxmbilcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgX3RhcmdldHRlZF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGlkLHRvLGZuKSB7XG5cbiAgICAgIHZhciBzdWJzY3JpcHRpb25zID0gdGhpcy5nZXRfc3Vic2NyaWJlcnNfb2JqKHRvKVxuICAgICAgICAsIHRvX3N0YXRlID0gdGhpcy5fc3RhdGVbdG9dXG4gICAgICAgICwgc3RhdGUgPSB0aGlzLl9zdGF0ZTtcblxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIGZuID09PSB1bmRlZmluZWQpIHJldHVybiBzdWJzY3JpcHRpb25zW2lkXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVsZXRlIHN1YnNjcmlwdGlvbnNbaWRdXG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICB9XG4gICAgICBzdWJzY3JpcHRpb25zW2lkXSA9IGZuO1xuXG4gICAgICByZXR1cm4gdGhpcyAgICAgIFxuICAgIH1cbiAgXG4gICwgZ2V0X3N1YnNjcmliZXJzX29iajogZnVuY3Rpb24oaykge1xuICAgICAgdGhpcy5fc3Vic2NyaXB0aW9uW2tdID0gdGhpcy5fc3Vic2NyaXB0aW9uW2tdIHx8IHt9XG4gICAgICByZXR1cm4gdGhpcy5fc3Vic2NyaXB0aW9uW2tdXG4gICAgfVxuICAsIGdldF9zdWJzY3JpYmVyc19mbjogZnVuY3Rpb24oaykge1xuICAgICAgdmFyIGZucyA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX29iaihrKVxuICAgICAgICAsIGZ1bmNzID0gT2JqZWN0LmtleXMoZm5zKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gZm5zW3hdIH0pXG4gICAgICAgICwgZm4gPSBmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmNzLm1hcChmdW5jdGlvbihnKSB7IHJldHVybiBnKGVycm9yLHZhbHVlLHN0YXRlKSB9KVxuICAgICAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuXG4gICAgfVxuICAsIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUsIF92YWx1ZSwgX3N0YXRlKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlciA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuKG5hbWUpIHx8IGZ1bmN0aW9uKCkge31cbiAgICAgICAgLCBhbGwgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihcIipcIikgfHwgZnVuY3Rpb24oKSB7fTtcblxuICAgICAgdGhpcy5vbihcImNoYW5nZVwiKShuYW1lLF92YWx1ZSxfc3RhdGUpXG5cbiAgICAgIHN1YnNjcmliZXIoZmFsc2UsX3ZhbHVlLF9zdGF0ZSlcbiAgICAgIGFsbChmYWxzZSxfc3RhdGUpXG4gICAgfVxuICAsIHRyaWdnZXJCYXRjaDogZnVuY3Rpb24ob2JqLCBfc3RhdGUpIHtcblxuICAgICAgdmFyIGFsbCA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuKFwiKlwiKSB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICwgZm5zID0gT2JqZWN0LmtleXMob2JqKS5tYXAoZnVuY3Rpb24oaykgeyBcbiAgICAgICAgICAgIHZhciBmbiA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuIHx8IGZ1bmN0aW9uKCkge31cbiAgICAgICAgICAgIHJldHVybiBmbi5iaW5kKHRoaXMpKGspKGZhbHNlLG9ialtrXSxfc3RhdGUpICBcbiAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICBcbiAgICAgIGFsbChmYWxzZSxfc3RhdGUpXG5cbiAgICB9XG4gICwgX2J1aWxkU3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2N1cnJlbnQpXG5cbiAgICAgIE9iamVjdC5rZXlzKHRoaXMuX3N0YXRpYykubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgIHRoaXMuX3N0YXRlW2tdID0gdGhpcy5fc3RhdGljW2tdXG4gICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgIHRoaXMub24oXCJidWlsZFwiKSh0aGlzLl9zdGF0ZSwgdGhpcy5fY3VycmVudCwgdGhpcy5fc3RhdGljKVxuXG4gICAgICByZXR1cm4gdGhpcy5fc3RhdGVcbiAgICB9XG4gICwgdXBkYXRlOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgICAgdGhpcy5fcGFzdFB1c2godGhpcy5fY3VycmVudClcbiAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgIHZhciBvYmogPSB7fVxuICAgICAgICBvYmpbbmFtZV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2N1cnJlbnQgPSAobmFtZSkgPyBcbiAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5fY3VycmVudCwgb2JqKSA6XG4gICAgICAgIE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2N1cnJlbnQsIHZhbHVlIClcblxuICAgICAgdGhpcy5fYnVpbGRTdGF0ZSgpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHNldFN0YXRpYzogZnVuY3Rpb24oayx2KSB7XG4gICAgICBpZiAoayAhPSB1bmRlZmluZWQgJiYgdiAhPSB1bmRlZmluZWQpIHRoaXMuX3N0YXRpY1trXSA9IHZcbiAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBwdWJsaXNoU3RhdGljOiBmdW5jdGlvbihuYW1lLGNiKSB7XG5cbiAgICAgIHZhciBwdXNoX2NiID0gZnVuY3Rpb24oZXJyb3IsdmFsdWUpIHtcbiAgICAgICAgaWYgKGVycm9yKSByZXR1cm4gc3Vic2NyaWJlcihlcnJvcixudWxsKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5fc3RhdGljW25hbWVdID0gdmFsdWVcbiAgICAgICAgdGhpcy5fYnVpbGRTdGF0ZSgpXG4gICAgICAgIHRoaXMudHJpZ2dlcihuYW1lLCB0aGlzLnN0YXRlKClbbmFtZV0sIHRoaXMuc3RhdGUoKSlcblxuICAgICAgfS5iaW5kKHRoaXMpXG5cbiAgICAgIGlmICh0eXBlb2YgY2IgPT09IFwiZnVuY3Rpb25cIikgY2IocHVzaF9jYilcbiAgICAgIGVsc2UgcHVzaF9jYihmYWxzZSxjYilcblxuICAgICAgcmV0dXJuIHRoaXNcblxuICAgIH1cbiAgLCBfcGFzdFB1c2g6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHRoaXMuX3Bhc3QucHVzaCh2KVxuICAgIH1cbiAgLCBfZnV0dXJlUHVzaDogZnVuY3Rpb24odikge1xuICAgICAgdGhpcy5fZnV0dXJlLnB1c2godilcbiAgICB9XG4gICwgZm9yd2FyZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9wYXN0UHVzaCh0aGlzLl9jdXJyZW50KVxuICAgICAgdGhpcy5fY3VycmVudCA9IHRoaXMuX2Z1dHVyZS5wb3AoKVxuXG4gICAgICB0aGlzLm9uKFwiZm9yd2FyZFwiKSh0aGlzLl9jdXJyZW50LHRoaXMuX3Bhc3QsIHRoaXMuX2Z1dHVyZSlcblxuICAgICAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcbiAgICAgIHRoaXMudHJpZ2dlcihmYWxzZSwgdGhpcy5fc3RhdGUsIHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2Z1dHVyZVB1c2godGhpcy5fY3VycmVudClcbiAgICAgIHRoaXMuX2N1cnJlbnQgPSB0aGlzLl9wYXN0LnBvcCgpXG5cbiAgICAgIHRoaXMub24oXCJiYWNrXCIpKHRoaXMuX2N1cnJlbnQsdGhpcy5fZnV0dXJlLCB0aGlzLl9wYXN0KVxuXG4gICAgICB0aGlzLl9zdGF0ZSA9IHRoaXMuX2J1aWxkU3RhdGUoKVxuICAgICAgdGhpcy50cmlnZ2VyKGZhbHNlLCB0aGlzLl9zdGF0ZSwgdGhpcy5fc3RhdGUpXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCB0aGlzLl9ub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9IFxuICAsIHJlZ2lzdGVyRXZlbnQ6IGZ1bmN0aW9uKG5hbWUsZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZXZlbnRzW25hbWVdIHx8IHRoaXMuX25vb3A7XG4gICAgICB0aGlzLl9ldmVudHNbbmFtZV0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHByZXBhcmVFdmVudDogZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGZuID0gdGhpcy5fZXZlbnRzW25hbWVdIFxuICAgICAgcmV0dXJuIGZuLmJpbmQodGhpcylcbiAgICB9XG4gICwgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24obmFtZSxkYXRhKSB7XG4gICAgICB2YXIgZm4gPSB0aGlzLnByZXBhcmVFdmVudChuYW1lKVxuICAgICAgZm4oZGF0YSlcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG59XG5cbmZ1bmN0aW9uIHN0YXRlKF9jdXJyZW50LCBfc3RhdGljKSB7XG4gIHJldHVybiBuZXcgU3RhdGUoX2N1cnJlbnQsIF9zdGF0aWMpXG59XG5cbnN0YXRlLnByb3RvdHlwZSA9IFN0YXRlLnByb3RvdHlwZVxuXG5leHBvcnQgZGVmYXVsdCBzdGF0ZTtcbiIsImV4cG9ydCBmdW5jdGlvbiBRUyhzdGF0ZSkge1xuICAvL3RoaXMuc3RhdGUgPSBzdGF0ZVxuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy5fZW5jb2RlT2JqZWN0ID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvKVxuICB9XG5cbiAgdGhpcy5fZW5jb2RlQXJyYXkgPSBmdW5jdGlvbihvKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG8pXG4gIH1cbn1cblxuLy8gTFpXLWNvbXByZXNzIGEgc3RyaW5nXG5mdW5jdGlvbiBsendfZW5jb2RlKHMpIHtcbiAgICB2YXIgZGljdCA9IHt9O1xuICAgIHZhciBkYXRhID0gKHMgKyBcIlwiKS5zcGxpdChcIlwiKTtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgdmFyIGN1cnJDaGFyO1xuICAgIHZhciBwaHJhc2UgPSBkYXRhWzBdO1xuICAgIHZhciBjb2RlID0gMjU2O1xuICAgIGZvciAodmFyIGk9MTsgaTxkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN1cnJDaGFyPWRhdGFbaV07XG4gICAgICAgIGlmIChkaWN0W3BocmFzZSArIGN1cnJDaGFyXSAhPSBudWxsKSB7XG4gICAgICAgICAgICBwaHJhc2UgKz0gY3VyckNoYXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvdXQucHVzaChwaHJhc2UubGVuZ3RoID4gMSA/IGRpY3RbcGhyYXNlXSA6IHBocmFzZS5jaGFyQ29kZUF0KDApKTtcbiAgICAgICAgICAgIGRpY3RbcGhyYXNlICsgY3VyckNoYXJdID0gY29kZTtcbiAgICAgICAgICAgIGNvZGUrKztcbiAgICAgICAgICAgIHBocmFzZT1jdXJyQ2hhcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBvdXQucHVzaChwaHJhc2UubGVuZ3RoID4gMSA/IGRpY3RbcGhyYXNlXSA6IHBocmFzZS5jaGFyQ29kZUF0KDApKTtcbiAgICBmb3IgKHZhciBpPTA7IGk8b3V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dFtpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUob3V0W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKFwiXCIpO1xufVxuXG4vLyBEZWNvbXByZXNzIGFuIExaVy1lbmNvZGVkIHN0cmluZ1xuZnVuY3Rpb24gbHp3X2RlY29kZShzKSB7XG4gICAgdmFyIGRpY3QgPSB7fTtcbiAgICB2YXIgZGF0YSA9IChzICsgXCJcIikuc3BsaXQoXCJcIik7XG4gICAgdmFyIGN1cnJDaGFyID0gZGF0YVswXTtcbiAgICB2YXIgb2xkUGhyYXNlID0gY3VyckNoYXI7XG4gICAgdmFyIG91dCA9IFtjdXJyQ2hhcl07XG4gICAgdmFyIGNvZGUgPSAyNTY7XG4gICAgdmFyIHBocmFzZTtcbiAgICBmb3IgKHZhciBpPTE7IGk8ZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY3VyckNvZGUgPSBkYXRhW2ldLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIGlmIChjdXJyQ29kZSA8IDI1Nikge1xuICAgICAgICAgICAgcGhyYXNlID0gZGF0YVtpXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgcGhyYXNlID0gZGljdFtjdXJyQ29kZV0gPyBkaWN0W2N1cnJDb2RlXSA6IChvbGRQaHJhc2UgKyBjdXJyQ2hhcik7XG4gICAgICAgIH1cbiAgICAgICAgb3V0LnB1c2gocGhyYXNlKTtcbiAgICAgICAgY3VyckNoYXIgPSBwaHJhc2UuY2hhckF0KDApO1xuICAgICAgICBkaWN0W2NvZGVdID0gb2xkUGhyYXNlICsgY3VyckNoYXI7XG4gICAgICAgIGNvZGUrKztcbiAgICAgICAgb2xkUGhyYXNlID0gcGhyYXNlO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oXCJcIik7XG59XG5cblFTLnByb3RvdHlwZSA9IHtcbiAgICB0bzogZnVuY3Rpb24oc3RhdGUsZW5jb2RlKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdmFyIHBhcmFtcyA9IE9iamVjdC5rZXlzKHN0YXRlKS5tYXAoZnVuY3Rpb24oaykge1xuXG4gICAgICAgIHZhciB2YWx1ZSA9IHN0YXRlW2tdXG4gICAgICAgICAgLCBvID0gdmFsdWU7XG5cbiAgICAgICAgaWYgKHZhbHVlICYmICh0eXBlb2YodmFsdWUpID09IFwib2JqZWN0XCIpICYmICh2YWx1ZS5sZW5ndGggPiAwKSkge1xuICAgICAgICAgIG8gPSBzZWxmLl9lbmNvZGVBcnJheSh2YWx1ZSlcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YodmFsdWUpID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICBvID0gc2VsZi5fZW5jb2RlT2JqZWN0KHZhbHVlKVxuICAgICAgICB9IFxuXG4gICAgICAgIHJldHVybiBrICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQobykgXG5cbiAgICAgIH0pXG5cbiAgICAgIGlmIChlbmNvZGUpIHJldHVybiBcIj9cIiArIFwiZW5jb2RlZD1cIiArIGJ0b2EoZXNjYXBlKGx6d19lbmNvZGUocGFyYW1zLmpvaW4oXCImXCIpKSkpO1xuICAgICAgcmV0dXJuIFwiP1wiICsgcGFyYW1zLmpvaW4oXCImXCIpXG4gICAgICBcbiAgICB9XG4gICwgZnJvbTogZnVuY3Rpb24ocXMpIHtcbiAgICAgIHZhciBxdWVyeSA9IHt9O1xuICAgICAgaWYgKHFzLmluZGV4T2YoXCI/ZW5jb2RlZD1cIikgPT0gMCkgcXMgPSBsendfZGVjb2RlKHVuZXNjYXBlKGF0b2IocXMuc3BsaXQoXCI/ZW5jb2RlZD1cIilbMV0pKSlcbiAgICAgIHZhciBhID0gcXMuc3Vic3RyKDEpLnNwbGl0KCcmJyk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgYiA9IGFbaV0uc3BsaXQoJz0nKTtcbiAgICAgICAgICBcbiAgICAgICAgICBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldID0gKGRlY29kZVVSSUNvbXBvbmVudChiWzFdIHx8ICcnKSk7XG4gICAgICAgICAgdmFyIF9jaGFyID0gcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXVswXSBcbiAgICAgICAgICBpZiAoKF9jaGFyID09IFwie1wiKSB8fCAoX2NoYXIgPT0gXCJbXCIpKSBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldID0gSlNPTi5wYXJzZShxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHF1ZXJ5O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcXMoc3RhdGUpIHtcbiAgcmV0dXJuIG5ldyBRUyhzdGF0ZSlcbn1cblxucXMucHJvdG90eXBlID0gUVMucHJvdG90eXBlXG5cbmV4cG9ydCBkZWZhdWx0IHFzO1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcGFyaXNvbl9ldmFsKG9iajEsb2JqMixfZmluYWwpIHtcbiAgcmV0dXJuIG5ldyBDb21wYXJpc29uRXZhbChvYmoxLG9iajIsX2ZpbmFsKVxufVxuXG52YXIgbm9vcCA9ICh4KSA9PiB7fVxuICAsIGVxb3AgPSAoeCx5KSA9PiB4ID09IHlcbiAgLCBhY2MgPSAobmFtZSxzZWNvbmQpID0+IHtcbiAgICAgIHJldHVybiAoeCx5KSA9PiBzZWNvbmQgPyB5W25hbWVdIDogeFtuYW1lXSBcbiAgICB9XG5cbmNsYXNzIENvbXBhcmlzb25FdmFsIHtcbiAgY29uc3RydWN0b3Iob2JqMSxvYmoyLF9maW5hbCkge1xuICAgIHRoaXMuX29iajEgPSBvYmoxXG4gICAgdGhpcy5fb2JqMiA9IG9iajJcbiAgICB0aGlzLl9maW5hbCA9IF9maW5hbFxuICAgIHRoaXMuX2NvbXBhcmlzb25zID0ge31cbiAgfVxuXG4gIGFjY2Vzc29yKG5hbWUsYWNjMSxhY2MyKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgYWNjMTogYWNjMVxuICAgICAgLCBhY2MyOiBhY2MyXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3VjY2VzcyhuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgc3VjY2VzczogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBmYWlsdXJlKG5hbWUsZm4pIHtcbiAgICB0aGlzLl9jb21wYXJpc29uc1tuYW1lXSA9IE9iamVjdC5hc3NpZ24oe30sdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0se1xuICAgICAgICBmYWlsdXJlOiBmblxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGVxdWFsKG5hbWUsZm4pIHtcbiAgICB0aGlzLl9jb21wYXJpc29uc1tuYW1lXSA9IE9iamVjdC5hc3NpZ24oe30sdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0se1xuICAgICAgICBlcTogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBldmFsdWF0ZSgpIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLl9jb21wYXJpc29ucykubWFwKCBrID0+IHtcbiAgICAgIHRoaXMuX2V2YWwodGhpcy5fY29tcGFyaXNvbnNba10saylcbiAgICB9KVxuICAgIHJldHVybiB0aGlzLl9maW5hbFxuICB9XG4gIFxuXG4gIGNvbXBhcnNpb24obmFtZSxhY2MxLGFjYzIsZXEsc3VjY2VzcyxmYWlsdXJlKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSB7XG4gICAgICAgIGFjYzE6IGFjYzFcbiAgICAgICwgYWNjMjogYWNjMlxuICAgICAgLCBlcTogZXEgfHwgZXFvcFxuICAgICAgLCBzdWNjZXNzOiBzdWNjZXNzIHx8IG5vb3BcbiAgICAgICwgZmFpbHVyZTogZmFpbHVyZSB8fCBub29wXG4gICAgfVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBfZXZhbChjb21wYXJpc29uLG5hbWUpIHtcbiAgICB2YXIgYWNjMSA9IGNvbXBhcmlzb24uYWNjMSB8fCBhY2MobmFtZSlcbiAgICAgICwgYWNjMiA9IGNvbXBhcmlzb24uYWNjMiB8fCBhY2MobmFtZSx0cnVlKVxuICAgICAgLCB2YWwxID0gYWNjMSh0aGlzLl9vYmoxLHRoaXMuX29iajIpXG4gICAgICAsIHZhbDIgPSBhY2MyKHRoaXMuX29iajEsdGhpcy5fb2JqMilcbiAgICAgICwgZXEgPSBjb21wYXJpc29uLmVxIHx8IGVxb3BcbiAgICAgICwgc3VjYyA9IGNvbXBhcmlzb24uc3VjY2VzcyB8fCBub29wXG4gICAgICAsIGZhaWwgPSBjb21wYXJpc29uLmZhaWx1cmUgfHwgbm9vcFxuXG4gICAgdmFyIF9ldmFsZCA9IGVxKHZhbDEsIHZhbDIpXG5cbiAgICBfZXZhbGQgPyBcbiAgICAgIHN1Y2MuYmluZCh0aGlzKSh2YWwxLHZhbDIsdGhpcy5fZmluYWwpIDogXG4gICAgICBmYWlsLmJpbmQodGhpcykodmFsMSx2YWwyLHRoaXMuX2ZpbmFsKVxuICB9XG5cbiAgXG59XG4iLCJleHBvcnQge2RlZmF1bHQgYXMgc3RhdGV9IGZyb20gXCIuL3NyYy9zdGF0ZVwiO1xuZXhwb3J0IHtkZWZhdWx0IGFzIHFzfSBmcm9tIFwiLi9zcmMvcXNcIjtcbmV4cG9ydCB7ZGVmYXVsdCBhcyBjb21wX2V2YWx9IGZyb20gXCIuL3NyYy9jb21wX2V2YWxcIjtcblxuaW1wb3J0IHN0YXRlIGZyb20gXCIuL3NyYy9zdGF0ZVwiO1xuXG5kZWJ1Z2dlclxuZXhwb3J0IGNvbnN0IHMgPSB3aW5kb3cuX19zdGF0ZV9fIHx8IHN0YXRlKClcbndpbmRvdy5fX3N0YXRlX18gPSBzXG5cbmV4cG9ydCBkZWZhdWx0IHM7XG4iLCIvL2ltcG9ydCBkMyBmcm9tICdkMydcblxuLyogRlJPTSBPVEhFUiBGSUxFICovXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRG9tYWlucyhkYXRhKSB7XG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkYXRhLmRpc3BsYXlfY2F0ZWdvcmllcy52YWx1ZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cbiAgdmFyIGlkZiA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkge3JldHVybiB4LmRvbWFpbiB9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkge3JldHVybiB4WzBdLmlkZiB9KVxuICAgIC5tYXAoZGF0YS5mdWxsX3VybHMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIkludGVybmV0ICYgVGVsZWNvbVwifSkgKVxuXG4gIHZhciBnZXRJREYgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIChpZGZbeF0gPT0gXCJOQVwiKSB8fCAoaWRmW3hdID4gODY4NikgPyAwIDogaWRmW3hdXG4gIH1cblxuICB2YXIgdmFsdWVzID0gZGF0YS5mdWxsX3VybHNcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwia2V5XCI6eC5kb21haW5cbiAgICAgICAgLCBcInZhbHVlXCI6eC5jb3VudFxuICAgICAgICAsIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAsIFwidW5pcXVlc1wiOiB4LnVuaXF1ZXMgXG4gICAgICAgICwgXCJ1cmxcIjogeC51cmxcbiAgICAgIH0gXG4gICAgfSlcblxuXG5cbiAgdmFsdWVzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5fSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB4WzBdLnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICAsIFwia2V5XCI6IHhbMF0ua2V5XG4gICAgICAgICAsIFwidmFsdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy52YWx1ZX0sMClcbiAgICAgICAgICwgXCJwZXJjZW50X3VuaXF1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnVuaXF1ZXMvYy52YWx1ZX0sMCkveC5sZW5ndGhcbiAgICAgICAgICwgXCJ1cmxzXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwLmluZGV4T2YoYy51cmwpID09IC0xID8gcC5wdXNoKGMudXJsKSA6IHA7IHJldHVybiBwIH0sW10pXG5cbiAgICAgICB9IFxuICAgIH0pXG4gICAgLmVudHJpZXModmFsdWVzKS5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB4LnZhbHVlcyB9KVxuXG4gIGlmIChjYXRlZ29yaWVzLmxlbmd0aCA+IDApXG4gICAgdmFsdWVzID0gdmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KSB7cmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZih4LnBhcmVudF9jYXRlZ29yeV9uYW1lKSA+IC0xIH0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC50Zl9pZGYgPSBnZXRJREYoeC5rZXkpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSBcbiAgICB4LmNvdW50ID0geC52YWx1ZVxuICAgIHgudmFsdWUgPSBNYXRoLmxvZyh4LnRmX2lkZilcbiAgfSlcbiAgdmFsdWVzID0gdmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRmX2lkZiAtIHAudGZfaWRmIH0pXG5cblxuICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQqeC5wZXJjZW50X3VuaXF1ZX0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IFxuICAgIHgucG9wX3BlcmNlbnQgPSAxLjAyL2dldElERih4LmtleSkqMTAwXG4gICAgeC5wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQgPT0gSW5maW5pdHkgPyAwIDogeC5wb3BfcGVyY2VudFxuXG4gICAgeC5wZXJjZW50ID0geC5jb3VudCp4LnBlcmNlbnRfdW5pcXVlL3RvdGFsKjEwMFxuICB9KVxuXG4gIHZhciBub3JtID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAucmFuZ2UoWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnBvcF9wZXJjZW50fSldKVxuICAgIC5kb21haW4oWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHgucGVyY2VudH0pXSlcbiAgICAubmljZSgpXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5wZXJjZW50X25vcm0gPSBub3JtKHgucGVyY2VudClcbiAgICAvL3gucGVyY2VudF9ub3JtID0geC5wZXJjZW50XG4gIH0pXG5cblxuXG4gIFxuICByZXR1cm4gdmFsdWVzO1xuICAvL3tcbiAgLy8gICAga2V5OiBcIlRvcCBEb21haW5zXCJcbiAgLy8gICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCwxMDApXG4gIC8vfVxufVxuXG5cbi8qIEVORCBGUk9NIE9USEVSIEZJTEUgKi9cblxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGQzX3VwZGF0ZWFibGUodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCJcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGZ1bmN0aW9uKHgpe3JldHVybiBkYXRhID8gW2RhdGFdIDogW3hdfSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIFt4XX1cbiAgKVxuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSlcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZDNfc3BsYXQodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCJcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKVxuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSlcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gTWVkaWFQbGFuKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5fb24gPSB7fVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBtZWRpYV9wbGFuKHRhcmdldCkge1xuICByZXR1cm4gbmV3IE1lZGlhUGxhbih0YXJnZXQpXG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybURhdGEoZGF0YSkge1xuXG4gIHZhciBjaCA9IGRhdGEuY2F0ZWdvcnlfaG91ci5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIk5BXCIgfSlcblxuICB2YXIgY2F0ZWdvcnlfaG91ciA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSArIFwiLFwiICsgeC5ob3VyIH0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgIHAudW5pcXVlcyA9IChwLnVuaXF1ZXMgfHwgMCkgKyBjLnVuaXF1ZXNcbiAgICAgICAgcC5jb3VudCA9IChwLmNvdW50IHx8IDApICsgYy5jb3VudFxuICAgICBcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0se30pXG4gICAgfSlcbiAgICAuZW50cmllcyhjaClcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJjYXRlZ29yeVwiOiB4LmtleS5zcGxpdChcIixcIilbMF1cbiAgICAgICAgLCBcImhvdXJcIjogeC5rZXkuc3BsaXQoXCIsXCIpWzFdXG4gICAgICAgICwgXCJjb3VudFwiOiB4LnZhbHVlcy5jb3VudFxuICAgICAgICAsIFwidW5pcXVlc1wiOiB4LnZhbHVlcy51bmlxdWVzXG4gICAgICB9XG4gICAgfSlcblxuICB2YXIgc2NhbGVkID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LmNhdGVnb3J5IH0gKVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgdmFyIG1pbiA9IGQzLm1pbih2LGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQgfSlcbiAgICAgICAgLCBtYXggPSBkMy5tYXgodixmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50IH0pXG5cbiAgICAgICB2YXIgc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgLmRvbWFpbihbbWluLG1heF0pXG4gICAgICAgICAucmFuZ2UoWzAsMTAwXSlcbiAgICAgICBcbiAgICAgICB2YXIgaG91cnMgPSBkMy5yYW5nZSgwLDI0KVxuICAgICAgIGhvdXJzID0gaG91cnMuc2xpY2UoLTQsMjQpLmNvbmNhdChob3Vycy5zbGljZSgwLDIwKSkvLy5zbGljZSgzKS5jb25jYXQoaG91cnMuc2xpY2UoMCwzKSlcblxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwibm9ybWVkXCI6IGhvdXJzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiB2W2ldID8gc2NhbGUodltpXS5jb3VudCkgOiAwIH0pXG4gICAgICAgICAsIFwiY291bnRcIjogaG91cnMubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIHZbaV0gPyB2W2ldLmNvdW50IDogMCB9KVxuICAgICAgIH1cbiAgICAgICAvL3JldHVybiBob3VybHlcbiAgICB9KVxuICAgIC5lbnRyaWVzKGNhdGVnb3J5X2hvdXIpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IHgudG90YWwgPSBkMy5zdW0oeC52YWx1ZXMpOyByZXR1cm4geH0pXG4gICAgLy8uc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudG90YWwgLSBwLnRvdGFsfSlcblxuICByZXR1cm4gc2NhbGVkXG59XG5cbk1lZGlhUGxhbi5wcm90b3R5cGUgPSB7XG4gICAgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICAvL2RlYnVnZ2VyXG4gICAgICBpZiAodGhpcy5kYXRhKCkuY2F0ZWdvcnlfaG91ciA9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzXG5cbiAgICAgICAgICB2YXIgX2QgPSB0aGlzLmRhdGEoKVxuICAgICAgICAgIF9kLmRpc3BsYXlfY2F0ZWdvcmllcyA9IF9kLmRpc3BsYXlfY2F0ZWdvcmllcyB8fCB7XCJ2YWx1ZXNcIjpbXX1cbiAgICAgICAgICB2YXIgZGQgPSBidWlsZERvbWFpbnMoX2QpXG5cbiAgICAgIHZhciBzY2FsZWQgPSB0cmFuc2Zvcm1EYXRhKHRoaXMuZGF0YSgpKVxuXG4gICAgICBcbiAgICAgIHNjYWxlZC5tYXAoZnVuY3Rpb24oeCkge1xuXG4gICAgICAgIHguY291bnQgPSB4LnZhbHVlcy5jb3VudFxuICAgICAgICB4LnZhbHVlcz0geC52YWx1ZXMubm9ybWVkXG5cbiAgICAgIH0pXG5cblxuICAgICAgdGhpcy5yZW5kZXJfbGVmdChzY2FsZWQpXG4gICAgICB0aGlzLnJlbmRlcl9yaWdodChkZCxzY2FsZWQpXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcmVuZGVyX3JpZ2h0OiBmdW5jdGlvbihkLHJvd19kYXRhKSB7XG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIucmhzXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJyaHMgY29sLW1kLTRcIix0cnVlKVxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiQWJvdXQgdGhlIHBsYW5cIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIuZGVzY1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZGVzY1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnRleHQoXCJIaW5kc2lnaHQgaGFzIGF1dG9tYXRpY2FsbHkgZGV0ZXJtaW5lZCB0aGUgYmVzdCBzaXRlcyBhbmQgdGltZXMgd2hlcmUgeW91IHNob3VsZCBiZSB0YXJnZXRpbmcgdXNlcnMuIFRoZSBtZWRpYSBwbGFuIHByZXNlbnRlZCBiZWxvdyBkZXNjcmliZXMgdGhlIG9wdGltaXphdGlvbnMgdGhhdCBjYW4gYmUgbWFkZSB0byBhbnkgcHJvc3BlY3Rpbmcgb3IgcmV0YXJnZXRpbmcgY2FtcGFpZ24gdG8gbG93ZXIgQ1BBIGFuZCBzYXZlIG1vbmV5LlwiKVxuXG4gICAgICB2YXIgcGxhbl90YXJnZXQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIucGxhbi10YXJnZXRcIixcImRpdlwiLHJvd19kYXRhLGZ1bmN0aW9uKCl7cmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcInBsYW4tdGFyZ2V0XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiMTAwcHhcIilcblxuICAgICAgcGxhbl90YXJnZXQuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgICAgaWYgKHJvd19kYXRhLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdmFyIHJlbWFpbmRlcnMgPSByb3dfZGF0YS5tYXAoZnVuY3Rpb24ocikge1xuICAgICAgICBcbiAgICAgICAgICB2YXIgdG9fdGFyZ2V0ID0gZDMuc3VtKHIubWFzay5tYXAoZnVuY3Rpb24oeCxpKXsgcmV0dXJuIHggPyByLmNvdW50W2ldIDogMH0pKVxuICAgICAgICAgIHZhciB0b3RhbCA9IGQzLnN1bShyLmNvdW50KVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHRvdGFsOiB0b3RhbFxuICAgICAgICAgICAgLCB0b190YXJnZXQ6IHRvX3RhcmdldFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICB2YXIgY3V0ID0gZDMuc3VtKHJlbWFpbmRlcnMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnRvX3RhcmdldCoxLjAgfSlcbiAgICAgICAgdmFyIHRvdGFsID0gZDMuc3VtKHJlbWFpbmRlcnMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnRvdGFsIH0pIFxuICAgICAgICB2YXIgcGVyY2VudCA9IGN1dC90b3RhbFxuXG4gICAgICAgIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCwgXCJoMy5zdW1tYXJ5XCIsXCJoM1wiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFt4XX0gLCBmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgICAuY2xhc3NlZChcInN1bW1hcnlcIix0cnVlKVxuICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgICAgLnRleHQoXCJQbGFuIFN1bW1hcnlcIilcblxuXG5cbiAgICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi53aGF0XCIsXCJkaXZcIixmdW5jdGlvbih4KSB7IHJldHVybiBbeF19ICwgZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgICAgLmNsYXNzZWQoXCJ3aGF0XCIsdHJ1ZSlcbiAgICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gXCI8ZGl2IHN0eWxlPSdmb250LXdlaWdodDpib2xkO3dpZHRoOjIwMHB4O3BhZGRpbmctbGVmdDoxMHB4O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtkaXNwbGF5OmlubGluZS1ibG9jayc+UG90ZW50aWFsIEFkcyBTZXJ2ZWQ6PC9kaXY+XCIgKyBkMy5mb3JtYXQoXCIsXCIpKHRvdGFsKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi5hbW91bnRcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFt4XX0gLCBmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgICAuY2xhc3NlZChcImFtb3VudFwiLHRydWUpXG4gICAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0nZm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoyMDBweDtwYWRkaW5nLWxlZnQ6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPk9wdGltaXplZCBBZCBTZXJ2aW5nOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiLFwiKShjdXQpICsgXCIgKFwiICsgZDMuZm9ybWF0KFwiJVwiKShwZXJjZW50KSArIFwiKVwiXG4gICAgICAgICAgfSlcblxuICAgICAgICBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LFwiLmNwYVwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gW3hdfSAsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAgIC5jbGFzc2VkKFwiY3BhXCIsdHJ1ZSlcbiAgICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gXCI8ZGl2IHN0eWxlPSdmb250LXdlaWdodDpib2xkO3dpZHRoOjIwMHB4O3BhZGRpbmctbGVmdDoxMHB4O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtkaXNwbGF5OmlubGluZS1ibG9jayc+RXN0aW1hdGVkIENQQSByZWR1Y3Rpb246PC9kaXY+XCIgKyBkMy5mb3JtYXQoXCIlXCIpKDEtcGVyY2VudClcbiAgICAgICAgICB9KVxuXG5cblxuXG5cbiAgICAgICBcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHZhciBwbGFuX3RhcmdldCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcIi5wbGFuLWRldGFpbHNcIixcImRpdlwiLHJvd19kYXRhKVxuICAgICAgICAuY2xhc3NlZChcInBsYW4tZGV0YWlsc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjE2MHB4XCIpXG5cblxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsIFwiaDMuZGV0YWlsc1wiLFwiaDNcIilcbiAgICAgICAgLmNsYXNzZWQoXCJkZXRhaWxzXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiUGxhbiBEZXRhaWxzXCIpXG5cblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIud2hhdFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwid2hhdFwiLHRydWUpXG4gICAgICAgIC5odG1sKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICByZXR1cm4gXCI8ZGl2IHN0eWxlPSdwYWRkaW5nLWxlZnQ6MTBweDtmb250LXdlaWdodDpib2xkO3dpZHRoOjE0MHB4O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtkaXNwbGF5OmlubGluZS1ibG9jayc+Q2F0ZWdvcnk6PC9kaXY+XCIgKyB4LmtleVxuICAgICAgICB9KVxuXG4gICAgICBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LFwiLnNhdmluZ1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwic2F2aW5nXCIsdHJ1ZSlcbiAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGQuY291bnQpXG4gICAgICAgICAgdmFyIHBlcmNlbnQgPSBkMy5zdW0oeC5jb3VudCxmdW5jdGlvbih6LGkpIHsgcmV0dXJuIHgubWFza1tpXSA/IDAgOiB6fSkvZDMuc3VtKHguY291bnQsZnVuY3Rpb24oeixpKSB7IHJldHVybiB6IH0pXG4gICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0ncGFkZGluZy1sZWZ0OjEwcHg7Zm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoxNDBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPlN0cmF0ZWd5IHNhdmluZ3M6PC9kaXY+XCIgKyBkMy5mb3JtYXQoXCIlXCIpKHBlcmNlbnQpXG4gICAgICAgIH0pXG5cbiAgICAgIHZhciB3aGVuID0gZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi53aGVuXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpeyByZXR1cm4gMSB9KVxuICAgICAgICAuY2xhc3NlZChcIndoZW5cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjgwcHhcIilcbiAgICAgICAgLmh0bWwoXCI8ZGl2IHN0eWxlPSdwYWRkaW5nLWxlZnQ6MTBweDt3aWR0aDoxNDBweDtkaXNwbGF5OmlubGluZS1ibG9jazt2ZXJ0aWNhbC1hbGlnbjp0b3AnPldoZW4gdG8gc2VydmU6PC9kaXY+XCIpXG4gICAgICAgIC5kYXR1bShmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGJvb2wgPSBmYWxzZVxuICAgICAgICAgIHZhciBwb3MgPSAtMVxuICAgICAgICAgIHZhciBzdGFydF9lbmRzID0geC5tYXNrLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgXG4gICAgICAgICAgICAgIHBvcyArPSAxXG4gICAgICAgICAgICAgIGlmIChib29sICE9IGMpIHtcbiAgICAgICAgICAgICAgICBib29sID0gY1xuICAgICAgICAgICAgICAgIHAucHVzaChwb3MpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgICAgIH0sW10pXG4gICAgICAgICAgdmFyIHMgPSBcIlwiXG4gICAgICAgICAgc3RhcnRfZW5kcy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICBpZiAoKGkgIT0gMCkgJiYgKChpJTIpID09IDApKSBzICs9IFwiLCBcIlxuICAgICAgICAgICAgaWYgKGklMikgcyArPSBcIiAtIFwiXG5cbiAgICAgICAgICAgIGlmICh4ID09IDApIHMgKz0gXCIxMmFtXCJcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgbnVtID0gKHgrMSklMTJcbiAgICAgICAgICAgICAgbnVtID0gbnVtID09IDAgPyAxMiA6IG51bVxuICAgICAgICAgICAgICBzICs9IG51bSArICgoeCA+IDExKSA/IFwicG1cIiA6IFwiYW1cIilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgXG4gICAgICAgICAgfSlcbiAgICAgICAgICBpZiAoKHN0YXJ0X2VuZHMubGVuZ3RoKSAlIDIpIHMgKz0gXCIgLSAxMmFtXCJcblxuICAgICAgICAgIHJldHVybiBzLnNwbGl0KFwiLCBcIilcbiAgICAgICAgfSlcblxuICAgICAgIHZhciBpdGVtcyA9IGQzX3VwZGF0ZWFibGUod2hlbixcIi5pdGVtc1wiLFwiZGl2XCIpXG4gICAgICAgICAuY2xhc3NlZChcIml0ZW1zXCIsdHJ1ZSlcbiAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNDBweFwiKVxuICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cbiAgICAgICBkM19zcGxhdChpdGVtcyxcIi5pdGVtXCIsXCJkaXZcIilcbiAgICAgICAgIC5jbGFzc2VkKFwiaXRlbVwiLHRydWUpXG4gICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQwcHhcIilcbiAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcIm5vbmVcIilcbiAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJub3JtYWxcIilcbiAgICAgICAgIC50ZXh0KFN0cmluZylcblxuXG5cbiAgICAgIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLCBcImgzLmV4YW1wbGUtc2l0ZXNcIixcImgzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZXhhbXBsZS1zaXRlc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIkV4YW1wbGUgU2l0ZXNcIilcblxuXG4gICAgICAgdmFyIHJvd3MgPSBkM19zcGxhdCh3cmFwcGVyLFwiLnJvd1wiLFwiZGl2XCIsZC5zbGljZSgwLDE1KSxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgICAgLmNsYXNzZWQoXCJyb3dcIix0cnVlKVxuICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE4cHhcIilcbiAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMjBweFwiKVxuXG4gICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgIHJldHVybiB4LmtleVxuICAgICAgICAgfSlcblxuICAgICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgIH1cbiAgLCByZW5kZXJfbGVmdDogZnVuY3Rpb24oc2NhbGVkKSB7XG5cblxuICAgICAgdmFyIHdyYXBwZXIgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5saHNcIixcImRpdlwiLHNjYWxlZClcbiAgICAgICAgLmNsYXNzZWQoXCJsaHMgY29sLW1kLThcIix0cnVlKVxuXG4gICAgICB3cmFwcGVyLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiTWVkaWEgUGxhbiAoQ2F0ZWdvcnkgYW5kIFRpbWUgT3B0aW1pemF0aW9uKVwiKVxuXG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIuaGVhZFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGVhZFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjFweFwiKVxuXG4gICAgICB2YXIgbmFtZSA9IGQzX3VwZGF0ZWFibGUoaGVhZCxcIi5uYW1lXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICBkM19zcGxhdChoZWFkLFwiLmhvdXJcIixcImRpdlwiLGQzLnJhbmdlKDEsMjUpLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSlcbiAgICAgICAgLmNsYXNzZWQoXCJzcSBob3VyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi44NWVtXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKHggPT0gMSkgcmV0dXJuIFwiPGI+MWE8L2I+XCJcbiAgICAgICAgICBpZiAoeCA9PSAyNCkgcmV0dXJuIFwiPGI+MTJhPC9iPlwiXG4gICAgICAgICAgaWYgKHggPT0gMTIpIHJldHVybiBcIjxiPjEycDwvYj5cIlxuICAgICAgICAgIHJldHVybiB4ID4gMTEgPyB4JTEyIDogeFxuICAgICAgICB9KVxuXG5cbiAgICAgIHZhciByb3cgPSBkM19zcGxhdCh3cmFwcGVyLFwiLnJvd1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJyb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIxcHhcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSArIFwiIHJvd1wiIH0pXG4gICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgIHZhciBfZCA9IHNlbGYuZGF0YSgpXG4gICAgICAgICAgX2QuZGlzcGxheV9jYXRlZ29yaWVzID0gX2QuZGlzcGxheV9jYXRlZ29yaWVzIHx8IHtcInZhbHVlc1wiOltdfVxuICAgICAgICAgIHZhciBkZCA9IGJ1aWxkRG9tYWlucyhfZClcblxuICAgICAgICAgIHZhciBkID0gZGQuZmlsdGVyKGZ1bmN0aW9uKHopIHsgcmV0dXJuIHoucGFyZW50X2NhdGVnb3J5X25hbWUgPT0geC5rZXl9KVxuICAgICAgICAgIFxuXG4gICAgICAgICAgc2VsZi5yZW5kZXJfcmlnaHQoZCx4KVxuICAgICAgICB9KVxuXG4gICAgICB2YXIgTUFHSUMgPSAyNSBcblxuICAgICAgdmFyIG5hbWUgPSBkM191cGRhdGVhYmxlKHJvdyxcIi5uYW1lXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG5cbiAgICAgIHZhciBjb2xvcnMgPSBbXCIjYTFkOTliXCIsIFwiIzc0YzQ3NlwiLCBcIiM0MWFiNWRcIiwgXCIjMjM4YjQ1XCIsIFwiIzAwNmQyY1wiLCBcIiMwMDQ0MWJcIl1cbiAgICAgIHZhciBjb2xvcnMgPSBbXCIjMjM4YjQ1XCJdXG5cbiAgICAgIHZhciBvID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAgIC5kb21haW4oWy0yNSwxMDBdKVxuICAgICAgICAucmFuZ2UoY29sb3JzKTtcblxuICAgICAgdmFyIHNxdWFyZSA9IGQzX3NwbGF0KHJvdyxcIi5zcVwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpIH0pIFxuICAgICAgICAuY2xhc3NlZChcInNxXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsZnVuY3Rpb24oeCxpKSB7IFxuICAgICAgICAgIHZhciBwZCA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXzsgXG4gICAgICAgICAgcGQubWFzayA9IHBkLm1hc2sgfHwgW11cbiAgICAgICAgICBwZC5tYXNrW2ldID0gKCh4ID4gTUFHSUMpICYmICggKHBkLnZhbHVlc1tpLTFdID4gTUFHSUMgfHwgZmFsc2UpIHx8IChwZC52YWx1ZXNbaSsxXSA+IE1BR0lDfHwgZmFsc2UpICkpXG4gICAgICAgICAgLy9yZXR1cm4gcGQubWFza1tpXSA/IG8ocGQudmFsdWVzW2ldKSAgOiBcInJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoIDQ1ZGVnLCAjZmVlMGQyLCAjZmVlMGQyIDJweCwgI2ZjYmJhMSA1cHgsICNmY2JiYTEgMnB4KSBcIlxuICAgICAgICAgIHJldHVybiBwZC5tYXNrW2ldID8gXG4gICAgICAgICAgICBcInJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoIDEzNWRlZywgIzIzOGI0NSwgIzIzOGI0NSAycHgsICMwMDZkMmMgNXB4LCAjMDA2ZDJjIDJweCkgXCIgOiBcbiAgICAgICAgICAgIFwicmVwZWF0aW5nLWxpbmVhci1ncmFkaWVudCggNDVkZWcsICNmZWUwZDIsICNmZWUwZDIgMnB4LCAjZmNiYmExIDVweCwgI2ZjYmJhMSAycHgpIFwiXG5cbiAgICAgICAgfSlcblxuXG4gICAgfVxuICAsIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl90YXJnZXQuZGF0dW0oKVxuICAgICAgdGhpcy5fdGFyZ2V0LmRhdHVtKGQpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIHByZXBEYXRhKGRkKSB7XG4gIHZhciBwID0gW11cbiAgZDMucmFuZ2UoMCwyNCkubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICBbXCIwXCIsXCIyMFwiLFwiNDBcIl0ubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgIGlmICh0IDwgMTApIHAucHVzaChcIjBcIiArIFN0cmluZyh0KStTdHJpbmcobSkpXG4gICAgICBlbHNlIHAucHVzaChTdHJpbmcodCkrU3RyaW5nKG0pKVxuXG4gICAgfSlcbiAgfSlcbiAgdmFyIHJvbGxlZCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oaykgeyByZXR1cm4gay5ob3VyICsgay5taW51dGUgfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiB2LnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgcC5hcnRpY2xlc1tjLnVybF0gPSB0cnVlXG4gICAgICAgIHAudmlld3MgKz0gYy5jb3VudFxuICAgICAgICBwLnNlc3Npb25zICs9IGMudW5pcXVlc1xuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7IGFydGljbGVzOiB7fSwgdmlld3M6IDAsIHNlc3Npb25zOiAwfSlcbiAgICB9KVxuICAgIC5lbnRyaWVzKGRkKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgT2JqZWN0LmtleXMoeC52YWx1ZXMpLm1hcChmdW5jdGlvbih5KSB7XG4gICAgICAgIHhbeV0gPSB4LnZhbHVlc1t5XVxuICAgICAgfSlcbiAgICAgIHguYXJ0aWNsZV9jb3VudCA9IE9iamVjdC5rZXlzKHguYXJ0aWNsZXMpLmxlbmd0aFxuICAgICAgeC5ob3VyID0geC5rZXkuc2xpY2UoMCwyKVxuICAgICAgeC5taW51dGUgPSB4LmtleS5zbGljZSgyKVxuICAgICAgeC52YWx1ZSA9IHguYXJ0aWNsZV9jb3VudFxuICAgICAgeC5rZXkgPSBwLmluZGV4T2YoeC5rZXkpXG4gICAgICAvL2RlbGV0ZSB4WydhcnRpY2xlcyddXG4gICAgICByZXR1cm4geFxuICAgIH0pXG4gIHJldHVybiByb2xsZWRcbn1cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN1bW1hcnlEYXRhKGRhdGEpIHtcbiAgICAgIHZhciByZWR1Y2VkID0gZGF0YS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgICAgcC5kb21haW5zW2MuZG9tYWluXSA9IHRydWVcbiAgICAgICAgICBwLmFydGljbGVzW2MudXJsXSA9IHRydWVcbiAgICAgICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgICAgICBwLnNlc3Npb25zICs9IGMudW5pcXVlc1xuXG4gICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgfSx7XG4gICAgICAgICAgICBkb21haW5zOiB7fVxuICAgICAgICAgICwgYXJ0aWNsZXM6IHt9XG4gICAgICAgICAgLCBzZXNzaW9uczogMFxuICAgICAgICAgICwgdmlld3M6IDBcbiAgICAgICAgfSlcblxuICAgICAgcmVkdWNlZC5kb21haW5zID0gT2JqZWN0LmtleXMocmVkdWNlZC5kb21haW5zKS5sZW5ndGhcbiAgICAgIHJlZHVjZWQuYXJ0aWNsZXMgPSBPYmplY3Qua2V5cyhyZWR1Y2VkLmFydGljbGVzKS5sZW5ndGhcblxuICAgICAgcmV0dXJuIHJlZHVjZWRcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5QWdncmVnYXRpb24oc2FtcCxwb3ApIHtcbiAgICAgIHZhciBkYXRhX3N1bW1hcnkgPSB7fVxuICAgICAgT2JqZWN0LmtleXMoc2FtcCkubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgZGF0YV9zdW1tYXJ5W2tdID0ge1xuICAgICAgICAgICAgc2FtcGxlOiBzYW1wW2tdXG4gICAgICAgICAgLCBwb3B1bGF0aW9uOiBwb3Bba11cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGRhdGFfc3VtbWFyeVxuICBcbn1cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhdGVnb3JpZXNPbGQoZGF0YSkge1xuICB2YXIgdmFsdWVzID0gZGF0YS5jYXRlZ29yeVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4ge1wia2V5XCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWUsIFwidmFsdWVcIjogeC5jb3VudCB9IH0pXG4gICAgICAgIC5zb3J0KGZ1bmN0aW9uKHAsYykge3JldHVybiBjLnZhbHVlIC0gcC52YWx1ZSB9KS5zbGljZSgwLDE1KVxuICAgICwgdG90YWwgPSB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsIHgpIHtyZXR1cm4gcCArIHgudmFsdWUgfSwgMClcblxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIkNhdGVnb3JpZXNcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHsgeC5wZXJjZW50ID0geC52YWx1ZS90b3RhbDsgcmV0dXJuIHh9KVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFRpbWVzKGRhdGEpIHtcblxuICB2YXIgaG91ciA9IGRhdGEuY3VycmVudF9ob3VyXG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkYXRhLmRpc3BsYXlfY2F0ZWdvcmllcy52YWx1ZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMCkge1xuICAgIGhvdXIgPSBkYXRhLmNhdGVnb3J5X2hvdXIuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTF9KVxuICAgIGhvdXIgPSBkMy5uZXN0KClcbiAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5ob3VyIH0pXG4gICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubWludXRlIH0pXG4gICAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBcbiAgICAgICAgICBwLnVuaXF1ZXMgPSAocC51bmlxdWVzIHx8IDApICsgYy51bmlxdWVzOyBcbiAgICAgICAgICBwLmNvdW50ID0gKHAuY291bnQgfHwgMCkgKyBjLmNvdW50OyAgXG4gICAgICAgICAgcmV0dXJuIHAgfSx7fSlcbiAgICAgIH0pXG4gICAgICAuZW50cmllcyhob3VyKVxuICAgICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgICBjb25zb2xlLmxvZyh4LnZhbHVlcyk7IFxuICAgICAgICByZXR1cm4geC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsayl7IFxuICAgICAgICAgIHBbJ21pbnV0ZSddID0gcGFyc2VJbnQoay5rZXkpOyBcbiAgICAgICAgICBwWydjb3VudCddID0gay52YWx1ZXMuY291bnQ7IFxuICAgICAgICAgIHBbJ3VuaXF1ZXMnXSA9IGsudmFsdWVzLnVuaXF1ZXM7IFxuICAgICAgICAgIHJldHVybiBwIFxuICAgICAgfSwge1wiaG91clwiOngua2V5fSkgfSApXG4gIH1cblxuICB2YXIgdmFsdWVzID0gaG91clxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4ge1wia2V5XCI6IHBhcnNlRmxvYXQoeC5ob3VyKSArIDEgKyB4Lm1pbnV0ZS82MCwgXCJ2YWx1ZVwiOiB4LmNvdW50IH0gfSlcblxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIkJyb3dzaW5nIGJlaGF2aW9yIGJ5IHRpbWVcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXNcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUb3BpY3MoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG5cbiAgdmFyIGlkZiA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkge3JldHVybiB4LnRvcGljfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvcGljID8geC50b3BpYy50b0xvd2VyQ2FzZSgpICE9IFwibm8gdG9waWNcIiA6IHRydWUgfSlcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwia2V5XCI6eC50b3BpY1xuICAgICAgICAsIFwidmFsdWVcIjp4LmNvdW50XG4gICAgICAgICwgXCJ1bmlxdWVzXCI6IHgudW5pcXVlcyBcbiAgICAgICAgLCBcInVybFwiOiB4LnVybFxuICAgICAgfSBcbiAgICB9KVxuXG5cblxuICB2YWx1ZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXl9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LmltcG9ydGFuY2UgPSBNYXRoLmxvZyh4LnRmX2lkZilcbiAgfSlcbiAgdmFsdWVzID0gdmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRmX2lkZiAtIHAudGZfaWRmIH0pXG5cblxuICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQqeC5wZXJjZW50X3VuaXF1ZX0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IFxuICAgIHgucG9wX3BlcmNlbnQgPSAxLjAyL2dldElERih4LmtleSkqMTAwXG4gICAgeC5wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQgPT0gSW5maW5pdHkgPyAwIDogeC5wb3BfcGVyY2VudFxuXG4gICAgeC5zYW1wbGVfcGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnNhbXBsZV9wZXJjZW50fSldKVxuICAgIC5uaWNlKClcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnNhbXBsZV9wZXJjZW50X25vcm0gPSBub3JtKHguc2FtcGxlX3BlcmNlbnQpXG5cbiAgICB4LnJhdGlvID0geC5zYW1wbGVfcGVyY2VudC94LnBvcF9wZXJjZW50XG4gICAgLy94LnBlcmNlbnRfbm9ybSA9IHgucGVyY2VudFxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgVG9waWNzXCJcbiAgICAsIHZhbHVlczogdmFsdWVzLnNsaWNlKDAsMzAwKVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERvbWFpbnMoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5kb21haW4gfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImtleVwiOnguZG9tYWluXG4gICAgICAgICwgXCJ2YWx1ZVwiOnguY291bnRcbiAgICAgICAgLCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC51bmlxdWVzIFxuICAgICAgICAsIFwidXJsXCI6IHgudXJsXG4gICAgICB9IFxuICAgIH0pXG5cblxuXG4gIHZhbHVlcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7IFxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeFswXS5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAgLCBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LmltcG9ydGFuY2UgPSBNYXRoLmxvZyh4LnRmX2lkZilcbiAgfSlcbiAgdmFsdWVzID0gdmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRmX2lkZiAtIHAudGZfaWRmIH0pXG5cblxuICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQqeC5wZXJjZW50X3VuaXF1ZX0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IFxuICAgIHgucG9wX3BlcmNlbnQgPSAxLjAyL2dldElERih4LmtleSkqMTAwXG4gICAgeC5wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQgPT0gSW5maW5pdHkgPyAwIDogeC5wb3BfcGVyY2VudFxuXG4gICAgeC5zYW1wbGVfcGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnNhbXBsZV9wZXJjZW50fSldKVxuICAgIC5uaWNlKClcblxuICB2YXIgdHQgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucG9wX3BlcmNlbnQgfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnNhbXBsZV9wZXJjZW50X25vcm0gPSBub3JtKHguc2FtcGxlX3BlcmNlbnQpXG4gICAgeC5yZWFsX3BvcF9wZXJjZW50ID0geC5wb3BfcGVyY2VudC90dCoxMDBcbiAgICB4LnJhdGlvID0geC5zYW1wbGVfcGVyY2VudC94LnJlYWxfcG9wX3BlcmNlbnRcblxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgRG9tYWluc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5zbGljZSgwLDUwMClcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRVcmxzKGRhdGEpIHtcblxuICB2YXIgY2F0ZWdvcmllcyA9IGRhdGEuZGlzcGxheV9jYXRlZ29yaWVzLnZhbHVlc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuICB2YXIgdmFsdWVzID0gZGF0YS5mdWxsX3VybHNcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHtcImtleVwiOngudXJsLFwidmFsdWVcIjp4LmNvdW50LCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWV9IH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMClcbiAgICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTEgfSlcblxuICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHgua2V5XG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cDovL1wiLFwiXCIpXG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cHM6Ly9cIixcIlwiKVxuICAgICAgICAucmVwbGFjZShcInd3dy5cIixcIlwiKS5zcGxpdChcIi5cIikuc2xpY2UoMSkuam9pbihcIi5cIikuc3BsaXQoXCIvXCIpWzFdLmxlbmd0aCA+IDVcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfSkuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudmFsdWUgLSBwLnZhbHVlIH0pXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgQXJ0aWNsZXNcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCwxMDApXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkT25zaXRlU3VtbWFyeShkYXRhKSB7XG4gIHZhciB5ZXN0ZXJkYXkgPSBkYXRhLnRpbWVzZXJpZXNfZGF0YVswXVxuICB2YXIgdmFsdWVzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlBhZ2UgVmlld3NcIlxuICAgICAgICAgICwgXCJ2YWx1ZVwiOiB5ZXN0ZXJkYXkudmlld3NcbiAgICAgICAgfVxuICAgICAgLCB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlVuaXF1ZSBWaXNpdG9yc1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IHllc3RlcmRheS51bmlxdWVzXG5cbiAgICAgICAgfVxuICAgIF1cbiAgcmV0dXJuIHtcImtleVwiOlwiT24tc2l0ZSBBY3Rpdml0eVwiLFwidmFsdWVzXCI6dmFsdWVzfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRPZmZzaXRlU3VtbWFyeShkYXRhKSB7XG4gIHZhciB2YWx1ZXMgPSBbICBcbiAgICAgICAge1xuICAgICAgICAgICAgXCJrZXlcIjogXCJPZmYtc2l0ZSBWaWV3c1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IGRhdGEuZnVsbF91cmxzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtyZXR1cm4gcCArIGMudW5pcXVlc30sMClcbiAgICAgICAgfVxuICAgICAgLCB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlVuaXF1ZSBwYWdlc1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IE9iamVjdC5rZXlzKGRhdGEuZnVsbF91cmxzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtwW2MudXJsXSA9IDA7IHJldHVybiBwIH0se30pKS5sZW5ndGhcbiAgICAgICAgfVxuICAgIF1cbiAgcmV0dXJuIHtcImtleVwiOlwiT2ZmLXNpdGUgQWN0aXZpdHlcIixcInZhbHVlc1wiOnZhbHVlc31cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWN0aW9ucyhkYXRhKSB7XG4gIFxuICByZXR1cm4ge1wia2V5XCI6XCJTZWdtZW50c1wiLFwidmFsdWVzXCI6IGRhdGEuYWN0aW9ucy5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB7XCJrZXlcIjp4LmFjdGlvbl9uYW1lLCBcInZhbHVlXCI6MCwgXCJzZWxlY3RlZFwiOiBkYXRhLmFjdGlvbl9uYW1lID09IHguYWN0aW9uX25hbWUgfSB9KX1cbn1cblxuXG4vLyBmcm9tIGRhdGEuanNcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2F0ZWdvcmllcyh2YWx1ZSkge1xuICB2YXIgY2F0ZWdvcmllcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiB2LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnVuaXF1ZXMgfSwwKVxuICAgIH0pXG4gICAgLmVudHJpZXModmFsdWUuZnVsbF91cmxzKVxuXG4gIHZhciB0b3RhbCA9IGNhdGVnb3JpZXMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWVzIH0sMClcblxuICBjYXRlZ29yaWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC52YWx1ZSA9IHgudmFsdWVzXG4gICAgeC5wZXJjZW50ID0geC52YWx1ZSAvIHRvdGFsXG4gIH0pXG5cbiAgdmFsdWVbXCJkaXNwbGF5X2NhdGVnb3JpZXNcIl0gPSB7XG4gICAgICBcImtleVwiOlwiQ2F0ZWdvcmllc1wiXG4gICAgLCBcInZhbHVlc1wiOiBjYXRlZ29yaWVzLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSAhPSBcIk5BXCIgfSlcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXRlZ29yeUhvdXIodmFsdWUpIHtcbiAgdmFyIGNhdGVnb3J5X2hvdXIgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSArIHguaG91ciArIHgubWludXRlfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB2WzBdLnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICwgXCJob3VyXCI6IHZbMF0uaG91clxuICAgICAgICAsIFwibWludXRlXCI6IHZbMF0ubWludXRlIFxuICAgICAgICAsIFwiY291bnRcIjp2LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLmNvdW50IH0sMClcbiAgICAgIH1cbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlLmZ1bGxfdXJscylcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWVzIH0pXG5cbiAgdmFsdWVbXCJjYXRlZ29yeV9ob3VyXCJdID0gY2F0ZWdvcnlfaG91clxuIFxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGREYXRhKGRhdGEsYnVja2V0cyxwb3BfY2F0ZWdvcmllcykge1xuXG4gIHZhciB0aW1lcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgLm1hcChkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJcIiB9KSApXG5cbiAgdmFyIGNhdHMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAubWFwKGRhdGEuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIlwiIH0pIClcblxuXG5cblxuICB2YXIgdGltZV9jYXRlZ29yaWVzID0gYnVja2V0cy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbY10gPSB7fTsgcmV0dXJuIHAgfSwge30pXG4gIHZhciBjYXRlZ29yeV90aW1lcyA9IE9iamVjdC5rZXlzKGNhdHMpLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjXSA9IHt9OyByZXR1cm4gcCB9LCB7fSlcblxuXG4gIHZhciBjYXRlZ29yaWVzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnRpbWVfZGlmZl9idWNrZXQgfSlcbiAgICAuZW50cmllcyhkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJcIiB9KSApXG4gICAgLm1hcChmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJvdy52YWx1ZXMubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgdC5wZXJjZW50ID0gZDMuc3VtKHQudmFsdWVzLGZ1bmN0aW9uKGQpeyByZXR1cm4gZC51bmlxdWVzfSkvIGQzLnN1bSh0aW1lc1t0LmtleV0sZnVuY3Rpb24oZCkge3JldHVybiBkLnVuaXF1ZXN9KSBcbiAgICAgICAgdGltZV9jYXRlZ29yaWVzW3Qua2V5XVtyb3cua2V5XSA9IHQucGVyY2VudFxuICAgICAgICBjYXRlZ29yeV90aW1lc1tyb3cua2V5XVt0LmtleV0gPSB0LnBlcmNlbnRcblxuICAgICAgfSlcbiAgICAgIHJldHVybiByb3dcbiAgICB9KVxuICAgIC5zb3J0KGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gKChwb3BfY2F0ZWdvcmllc1tiLmtleV0gfHwge30pLm5vcm1hbGl6ZWRfcG9wIHx8IDApLSAoKHBvcF9jYXRlZ29yaWVzW2Eua2V5XSB8fCB7fSkubm9ybWFsaXplZF9wb3AgfHwgMCkgfSlcblxuXG4gIHZhciB0aW1lX25vcm1hbGl6ZV9zY2FsZXMgPSB7fVxuXG4gIGQzLmVudHJpZXModGltZV9jYXRlZ29yaWVzKS5tYXAoZnVuY3Rpb24odHJvdykge1xuICAgIHZhciB2YWx1ZXMgPSBkMy5lbnRyaWVzKHRyb3cudmFsdWUpLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH0pXG4gICAgdGltZV9ub3JtYWxpemVfc2NhbGVzW3Ryb3cua2V5XSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFtkMy5taW4odmFsdWVzKSxkMy5tYXgodmFsdWVzKV0pXG4gICAgICAucmFuZ2UoWzAsMV0pXG4gIH0pXG5cbiAgdmFyIGNhdF9ub3JtYWxpemVfc2NhbGVzID0ge31cblxuICBkMy5lbnRyaWVzKGNhdGVnb3J5X3RpbWVzKS5tYXAoZnVuY3Rpb24odHJvdykge1xuICAgIHZhciB2YWx1ZXMgPSBkMy5lbnRyaWVzKHRyb3cudmFsdWUpLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH0pXG4gICAgY2F0X25vcm1hbGl6ZV9zY2FsZXNbdHJvdy5rZXldID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oW2QzLm1pbih2YWx1ZXMpLGQzLm1heCh2YWx1ZXMpXSlcbiAgICAgIC5yYW5nZShbMCwxXSlcbiAgfSlcblxuICBjYXRlZ29yaWVzLm1hcChmdW5jdGlvbihwKSB7XG4gICAgdmFyIGNhdCA9IHAua2V5XG4gICAgcC52YWx1ZXMubWFwKGZ1bmN0aW9uKHEpIHtcbiAgICAgIHEubm9ybV9jYXQgPSBjYXRfbm9ybWFsaXplX3NjYWxlc1tjYXRdKHEucGVyY2VudClcbiAgICAgIHEubm9ybV90aW1lID0gdGltZV9ub3JtYWxpemVfc2NhbGVzW3Eua2V5XShxLnBlcmNlbnQpXG5cbiAgICAgIHEuc2NvcmUgPSAyKnEubm9ybV9jYXQvMyArIHEubm9ybV90aW1lLzNcbiAgICAgIHEuc2NvcmUgPSBxLm5vcm1fdGltZVxuXG4gICAgICB2YXIgcGVyY2VudF9wb3AgPSBwb3BfY2F0ZWdvcmllc1tjYXRdID8gcG9wX2NhdGVnb3JpZXNbY2F0XS5wZXJjZW50X3BvcCA6IDBcblxuICAgICAgcS5wZXJjZW50X2RpZmYgPSAocS5wZXJjZW50IC0gcGVyY2VudF9wb3ApL3BlcmNlbnRfcG9wXG5cbiAgICB9KVxuICB9KVxuXG4gIHJldHVybiBjYXRlZ29yaWVzXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmVwYXJlRmlsdGVycyhmaWx0ZXJzKSB7XG4gIHZhciBtYXBwaW5nID0ge1xuICAgICAgXCJDYXRlZ29yeVwiOiBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCJcbiAgICAsIFwiVGl0bGVcIjogXCJ1cmxcIlxuICAgICwgXCJUaW1lXCI6IFwiaG91clwiXG4gIH1cblxuICB2YXIgZmlsdGVycyA9IGZpbHRlcnMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE9iamVjdC5rZXlzKHgpLmxlbmd0aCAmJiB4LnZhbHVlIH0pLm1hcChmdW5jdGlvbih6KSB7XG4gICAgcmV0dXJuIHsgXG4gICAgICAgIFwiZmllbGRcIjogbWFwcGluZ1t6LmZpZWxkXVxuICAgICAgLCBcIm9wXCI6IHoub3BcbiAgICAgICwgXCJ2YWx1ZVwiOiB6LnZhbHVlXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBmaWx0ZXJzXG59XG4iLCJleHBvcnQgZnVuY3Rpb24gYXV0b1NpemUod3JhcCxhZGp1c3RXaWR0aCxhZGp1c3RIZWlnaHQpIHtcblxuICBmdW5jdGlvbiBlbGVtZW50VG9XaWR0aChlbGVtKSB7XG5cbiAgICB2YXIgX3cgPSB3cmFwLm5vZGUoKS5vZmZzZXRXaWR0aCB8fCB3cmFwLm5vZGUoKS5wYXJlbnROb2RlLm9mZnNldFdpZHRoIHx8IHdyYXAubm9kZSgpLnBhcmVudE5vZGUucGFyZW50Tm9kZS5vZmZzZXRXaWR0aFxuICAgIHZhciBudW0gPSBfdyB8fCB3cmFwLnN0eWxlKFwid2lkdGhcIikuc3BsaXQoXCIuXCIpWzBdLnJlcGxhY2UoXCJweFwiLFwiXCIpIFxuICAgIHJldHVybiBwYXJzZUludChudW0pXG4gIH1cblxuICBmdW5jdGlvbiBlbGVtZW50VG9IZWlnaHQoZWxlbSkge1xuICAgIHZhciBudW0gPSB3cmFwLnN0eWxlKFwiaGVpZ2h0XCIpLnNwbGl0KFwiLlwiKVswXS5yZXBsYWNlKFwicHhcIixcIlwiKVxuICAgIHJldHVybiBwYXJzZUludChudW0pXG4gIH1cblxuICB2YXIgdyA9IGVsZW1lbnRUb1dpZHRoKHdyYXApIHx8IDcwMCxcbiAgICBoID0gZWxlbWVudFRvSGVpZ2h0KHdyYXApIHx8IDM0MDtcblxuICB3ID0gYWRqdXN0V2lkdGgodylcbiAgaCA9IGFkanVzdEhlaWdodChoKVxuXG5cbiAgdmFyIG1hcmdpbiA9IHt0b3A6IDEwLCByaWdodDogMTUsIGJvdHRvbTogMTAsIGxlZnQ6IDE1fSxcbiAgICAgIHdpZHRoICA9IHcgLSBtYXJnaW4ubGVmdCAtIG1hcmdpbi5yaWdodCxcbiAgICAgIGhlaWdodCA9IGggLSBtYXJnaW4udG9wIC0gbWFyZ2luLmJvdHRvbTtcblxuICByZXR1cm4ge1xuICAgIG1hcmdpbjogbWFyZ2luLFxuICAgIHdpZHRoOiB3aWR0aCxcbiAgICBoZWlnaHQ6IGhlaWdodFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdXRvU2NhbGVzKF9zaXplcywgbGVuKSB7XG5cbiAgdmFyIG1hcmdpbiA9IF9zaXplcy5tYXJnaW4sXG4gICAgd2lkdGggPSBfc2l6ZXMud2lkdGgsXG4gICAgaGVpZ2h0ID0gX3NpemVzLmhlaWdodDtcblxuICBoZWlnaHQgPSBsZW4gKiAyNlxuICBcbiAgdmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLnJhbmdlKFt3aWR0aC8yLCB3aWR0aC0yMF0pO1xuICBcbiAgdmFyIHkgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5yYW5nZVJvdW5kQmFuZHMoWzAsIGhlaWdodF0sIC4yKTtcblxuICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoeClcbiAgICAgIC5vcmllbnQoXCJ0b3BcIik7XG5cblxuICByZXR1cm4ge1xuICAgICAgeDogeFxuICAgICwgeTogeVxuICAgICwgeEF4aXM6IHhBeGlzXG4gIH1cbn1cbiIsImltcG9ydCAqIGFzIHN0YXRlIGZyb20gJ3N0YXRlJ1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZShxc19zdGF0ZSxfc3RhdGUpIHtcblxuICB2YXIgdXBkYXRlcyA9IHt9XG5cblxuICBzdGF0ZS5jb21wX2V2YWwocXNfc3RhdGUsX3N0YXRlLHVwZGF0ZXMpXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInNlbGVjdGVkX2FjdGlvblwiXG4gICAgICAsICh4LHkpID0+IHkuYWN0aW9ucy5maWx0ZXIoeiA9PiB6LmFjdGlvbl9pZCA9PSB4LnNlbGVjdGVkX2FjdGlvbilbMF1cbiAgICAgICwgKHgseSkgPT4geS5zZWxlY3RlZF9hY3Rpb25cbiAgICApXG4gICAgLmZhaWx1cmUoXCJzZWxlY3RlZF9hY3Rpb25cIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcInNlbGVjdGVkX2FjdGlvblwiOiBfbmV3XG4gICAgICB9KVxuICAgIH0pXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInNlbGVjdGVkX3ZpZXdcIlxuICAgICAgLCAoeCx5KSA9PiB4LnNlbGVjdGVkX3ZpZXdcbiAgICAgICwgKF8seSkgPT4geS5kYXNoYm9hcmRfb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZSBcbiAgICApXG4gICAgLmZhaWx1cmUoXCJzZWxlY3RlZF92aWV3XCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7XG4gICAgICAvLyB0aGlzIHNob3VsZCBiZSByZWRvbmUgc28gaXRzIG5vdCBkaWZmZXJlbnQgbGlrZSB0aGlzXG4gICAgICBPYmplY3QuYXNzaWduKG9iaiwge1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJkYXNoYm9hcmRfb3B0aW9uc1wiOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9ucykpLm1hcCh4ID0+IHsgXG4gICAgICAgICAgICB4LnNlbGVjdGVkID0gKHgudmFsdWUgPT0gX25ldyk7IFxuICAgICAgICAgICAgcmV0dXJuIHggXG4gICAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgICAuYWNjZXNzb3IoXG4gICAgICAgIFwic2VsZWN0ZWRfY29tcGFyaXNvblwiXG4gICAgICAsICh4LHkpID0+IHkuYWN0aW9ucy5maWx0ZXIoeiA9PiB6LmFjdGlvbl9pZCA9PSB4LnNlbGVjdGVkX2NvbXBhcmlzb24pWzBdXG4gICAgICAsICh4LHkpID0+IHkuc2VsZWN0ZWRfY29tcGFyaXNvblxuICAgIClcbiAgICAuZmFpbHVyZShcInNlbGVjdGVkX2NvbXBhcmlzb25cIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcInNlbGVjdGVkX2NvbXBhcmlzb25cIjogX25ld1xuICAgICAgfSlcbiAgICB9KVxuICAgIC5lcXVhbChcImZpbHRlcnNcIiwgKHgseSkgPT4gSlNPTi5zdHJpbmdpZnkoeCkgPT0gSlNPTi5zdHJpbmdpZnkoeSkgKVxuICAgIC5mYWlsdXJlKFwiZmlsdGVyc1wiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHtcbiAgICAgICAgICBcImxvYWRpbmdcIjogdHJ1ZVxuICAgICAgICAsIFwiZmlsdGVyc1wiOiBfbmV3IHx8IFt7fV1cbiAgICAgIH0pXG4gICAgfSlcbiAgICAuZmFpbHVyZShcImFjdGlvbl9kYXRlXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmoseyBsb2FkaW5nOiB0cnVlLCBcImFjdGlvbl9kYXRlXCI6IF9uZXcgfSlcbiAgICB9KVxuICAgIC5mYWlsdXJlKFwiY29tcGFyaXNvbl9kYXRlXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmoseyBsb2FkaW5nOiB0cnVlLCBcImNvbXBhcmlzb25fZGF0ZVwiOiBfbmV3IH0pXG4gICAgfSlcblxuICAgIC5ldmFsdWF0ZSgpXG5cbiAgdmFyIGN1cnJlbnQgPSBzdGF0ZS5xcyh7fSkudG8oX3N0YXRlLnFzX3N0YXRlIHx8IHt9KVxuICAgICwgcG9wID0gc3RhdGUucXMoe30pLnRvKHFzX3N0YXRlKVxuXG4gIGlmIChPYmplY3Qua2V5cyh1cGRhdGVzKS5sZW5ndGggJiYgY3VycmVudCAhPSBwb3ApIHtcbiAgICByZXR1cm4gdXBkYXRlc1xuICB9XG5cbiAgcmV0dXJuIHt9XG4gIFxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmV4cG9ydCAqIGZyb20gJy4vaGVscGVycy9kYXRhX2hlbHBlcnMnXG5leHBvcnQgKiBmcm9tICcuL2hlbHBlcnMvZ3JhcGhfaGVscGVycydcbmV4cG9ydCAqIGZyb20gJy4vaGVscGVycy9zdGF0ZV9oZWxwZXJzJ1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGFjY2Vzc29yKGF0dHIsIHZhbCkge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzW1wiX1wiICsgYXR0cl1cbiAgdGhpc1tcIl9cIiArIGF0dHJdID0gdmFsXG4gIHJldHVybiB0aGlzXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b3BTZWN0aW9uKHNlY3Rpb24pIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUoc2VjdGlvbixcIi50b3Atc2VjdGlvblwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJ0b3Atc2VjdGlvblwiLHRydWUpXG4gICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiMTYwcHhcIilcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbWFpbmluZ1NlY3Rpb24oc2VjdGlvbikge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZShzZWN0aW9uLFwiLnJlbWFpbmluZy1zZWN0aW9uXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInJlbWFpbmluZy1zZWN0aW9uXCIsdHJ1ZSlcbn1cblxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gU2VsZWN0KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNlbGVjdCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3QodGFyZ2V0KVxufVxuXG5TZWxlY3QucHJvdG90eXBlID0ge1xuICAgIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHRoaXMuX3NlbGVjdCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCJzZWxlY3RcIixcInNlbGVjdFwiLHRoaXMuX29wdGlvbnMpXG5cbiAgICAgIHZhciBib3VuZCA9IHRoaXMub24oXCJzZWxlY3RcIikuYmluZCh0aGlzKVxuXG4gICAgICB0aGlzLl9zZWxlY3RcbiAgICAgICAgLm9uKFwiY2hhbmdlXCIsZnVuY3Rpb24oeCkgeyBib3VuZCh0aGlzLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXykgfSlcblxuICAgICAgdGhpcy5fb3B0aW9ucyA9IGQzX3NwbGF0KHRoaXMuX3NlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIsaWRlbnRpdHksa2V5KVxuICAgICAgICAudGV4dChrZXkpXG4gICAgICAgIC5wcm9wZXJ0eShcInNlbGVjdGVkXCIsICh4KSA9PiB4LnZhbHVlID09IHRoaXMuX3NlbGVjdGVkID8gXCJzZWxlY3RlZFwiIDogbnVsbClcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgc2VsZWN0ZWQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWxlY3RlZFwiLHZhbClcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4vc2VsZWN0J1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZnVuY3Rpb24gaW5qZWN0Q3NzKGNzc19zdHJpbmcpIHtcbiAgZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QoXCJoZWFkXCIpLFwic3R5bGUjaGVhZGVyLWNzc1wiLFwic3R5bGVcIilcbiAgICAuYXR0cihcImlkXCIsXCJoZWFkZXItY3NzXCIpXG4gICAgLnRleHQoQ1NTX1NUUklORy5yZXBsYWNlKFwiZnVuY3Rpb24gKCkgey8qXCIsXCJcIikucmVwbGFjZShcIiovfVwiLFwiXCIpKVxufVxuXG5mdW5jdGlvbiBidXR0b25XcmFwKHdyYXApIHtcbiAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXAsIFwiaDMuYnV0dG9uc1wiLFwiaDNcIilcbiAgICAuY2xhc3NlZChcImJ1dHRvbnNcIix0cnVlKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCItNXB4XCIpXG5cbiAgdmFyIHJpZ2h0X3B1bGwgPSBkM191cGRhdGVhYmxlKGhlYWQsXCIucHVsbC1yaWdodFwiLFwic3BhblwiKVxuICAgIC5jbGFzc2VkKFwicHVsbC1yaWdodCBoZWFkZXItYnV0dG9uc1wiLCB0cnVlKVxuICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTdweFwiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMnB4XCIpXG4gICAgLnN0eWxlKFwidGV4dC1kZWNvcmF0aW9uXCIsXCJub25lICFpbXBvcnRhbnRcIilcblxuICByZXR1cm4gcmlnaHRfcHVsbFxufVxuXG5mdW5jdGlvbiBleHBhbnNpb25XcmFwKHdyYXApIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUod3JhcCxcImRpdi5oZWFkZXItYm9keVwiLFwiZGl2XCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxM3B4XCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcIm5vbmVcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzMzM1wiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJub3JtYWxcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMTc1cHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIyNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMjVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTc1cHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJ3aGl0ZVwiKVxuICAgIC5jbGFzc2VkKFwiaGVhZGVyLWJvZHkgaGlkZGVuXCIsdHJ1ZSlcbn1cblxuZnVuY3Rpb24gaGVhZFdyYXAod3JhcCkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh3cmFwLCBcImgzLmRhdGEtaGVhZGVyXCIsXCJoM1wiKVxuICAgIC5jbGFzc2VkKFwiZGF0YS1oZWFkZXJcIix0cnVlKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCItNXB4XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcIiBib2xkXCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIgMTRweFwiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIgMjJweFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCIgdXBwZXJjYXNlXCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiAjODg4XCIpXG4gICAgLnN0eWxlKFwibGV0dGVyLXNwYWNpbmdcIixcIiAuMDVlbVwiKVxuXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIEhlYWRlcih0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7fVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxuXG4gIHZhciBDU1NfU1RSSU5HID0gU3RyaW5nKGZ1bmN0aW9uKCkgey8qXG4gICAgLmhlYWRlci1idXR0b25zIGEgc3Bhbi5ob3Zlci1zaG93IHsgZGlzcGxheTpub25lIH1cbiAgICAuaGVhZGVyLWJ1dHRvbnMgYTpob3ZlciBzcGFuLmhvdmVyLXNob3cgeyBkaXNwbGF5OmlubGluZTsgcGFkZGluZy1sZWZ0OjNweCB9XG4gICovfSlcbiAgXG59XG5cbmZ1bmN0aW9uIGhlYWRlcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBIZWFkZXIodGFyZ2V0KVxufVxuXG5IZWFkZXIucHJvdG90eXBlID0ge1xuICAgIHRleHQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0ZXh0XCIsdmFsKSBcbiAgICB9XG4gICwgb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm9wdGlvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBidXR0b25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYnV0dG9uc1wiLHZhbCkgXG4gICAgfVxuICAsIGV4cGFuc2lvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImV4cGFuc2lvblwiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LCBcIi5oZWFkZXItd3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGVhZGVyLXdyYXBcIix0cnVlKVxuXG4gICAgICB2YXIgZXhwYW5kX3dyYXAgPSBleHBhbnNpb25XcmFwKHdyYXApXG4gICAgICAgICwgYnV0dG9uX3dyYXAgPSBidXR0b25XcmFwKHdyYXApXG4gICAgICAgICwgaGVhZF93cmFwID0gaGVhZFdyYXAod3JhcClcblxuICAgICAgZDNfdXBkYXRlYWJsZShoZWFkX3dyYXAsXCJzcGFuLnRpdGxlXCIsXCJzcGFuXCIpXG4gICAgICAgIC5jbGFzc2VkKFwidGl0bGVcIix0cnVlKVxuICAgICAgICAudGV4dCh0aGlzLl90ZXh0KVxuXG4gICAgICBpZiAodGhpcy5fb3B0aW9ucykge1xuXG4gICAgICAgIHZhciBib3VuZCA9IHRoaXMub24oXCJzZWxlY3RcIikuYmluZCh0aGlzKVxuXG4gICAgICAgIHZhciBzZWxlY3RCb3ggPSBzZWxlY3QoaGVhZF93cmFwKVxuICAgICAgICAgIC5vcHRpb25zKHRoaXMuX29wdGlvbnMpXG4gICAgICAgICAgLm9uKFwic2VsZWN0XCIsZnVuY3Rpb24oeCkgeyBib3VuZCh4KSB9KVxuICAgICAgICAgIC5kcmF3KClcblxuICAgICAgICBzZWxlY3RCb3guX3NlbGVjdFxuICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOXB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEycHhcIilcbiAgICAgICAgICBcbiAgICAgICAgc2VsZWN0Qm94Ll9vcHRpb25zXG4gICAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcIiM4ODhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEwMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiNXB4XCIpXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9idXR0b25zKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBhID0gZDNfc3BsYXQoYnV0dG9uX3dyYXAsXCJhXCIsXCJhXCIsdGhpcy5fYnV0dG9ucywgZnVuY3Rpb24oeCkgeyByZXR1cm4geC50ZXh0IH0pXG4gICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcIm1pZGRsZVwiKVxuICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJpZ2h0XCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjJweFwiKVxuICAgICAgICAgIC5zdHlsZShcInRleHQtZGVjb3JhdGlvblwiLFwibm9uZVwiKVxuICAgICAgICAgIC5odG1sKHggPT4gXCI8c3BhbiBjbGFzcz0nXCIgKyB4Lmljb24gKyBcIic+PC9zcGFuPjxzcGFuIHN0eWxlPSdwYWRkaW5nLWxlZnQ6M3B4Jz5cIiArIHgudGV4dCArIFwiPC9zcGFuPlwiKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIix4ID0+IHguY2xhc3MpXG4gICAgICAgICAgLm9uKFwiY2xpY2tcIix4ID0+IHRoaXMub24oeC5jbGFzcyArIFwiLmNsaWNrXCIpKHgpKVxuXG5cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG5leHBvcnQgZGVmYXVsdCBoZWFkZXI7XG4iLCJpbXBvcnQgZDMgZnJvbSAnZDMnO1xuXG5mdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbDtcbiAgcmV0dXJuIHRoaXNcbn1cblxuZnVuY3Rpb24gZDNfdXBkYXRlYWJsZSh0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIjtcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGZ1bmN0aW9uKHgpe3JldHVybiBkYXRhID8gW2RhdGFdIDogW3hdfSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIFt4XX1cbiAgKTtcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpO1xuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmZ1bmN0aW9uIGQzX3NwbGF0KHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiO1xuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZGF0YSB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fVxuICApO1xuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSk7XG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZnVuY3Rpb24gVGFibGUodGFyZ2V0KSB7XG4gIHZhciBDU1NfU1RSSU5HID0gU3RyaW5nKGZ1bmN0aW9uKCkgey8qXG4udGFibGUtd3JhcHBlciB0ciB7IGhlaWdodDozM3B4fVxuLnRhYmxlLXdyYXBwZXIgdHIgdGggeyBib3JkZXItcmlnaHQ6MXB4IGRvdHRlZCAjY2NjIH0gXG4udGFibGUtd3JhcHBlciB0ciB0aDpsYXN0LW9mLXR5cGUgeyBib3JkZXItcmlnaHQ6bm9uZSB9IFxuXG4udGFibGUtd3JhcHBlciB0ciB7IGJvcmRlci1ib3R0b206MXB4IHNvbGlkICNkZGQgfVxuLnRhYmxlLXdyYXBwZXIgdHIgdGgsIC50YWJsZS13cmFwcGVyIHRyIHRkIHsgXG4gIHBhZGRpbmctbGVmdDoxMHB4O1xuICBtYXgtd2lkdGg6MjAwcHhcbn1cblxuLnRhYmxlLXdyYXBwZXIgdGhlYWQgdHIgeyBcbiAgYmFja2dyb3VuZC1jb2xvcjojZTNlYmYwO1xufVxuLnRhYmxlLXdyYXBwZXIgdGhlYWQgdHIgdGggLnRpdGxlIHsgXG4gIHRleHQtdHJhbnNmb3JtOnVwcGVyY2FzZVxufVxuLnRhYmxlLXdyYXBwZXIgdGJvZHkgdHIgeyBcbn1cbi50YWJsZS13cmFwcGVyIHRib2R5IHRyOmhvdmVyIHsgXG4gIGJhY2tncm91bmQtY29sb3I6d2hpdGU7XG4gIGJhY2tncm91bmQtY29sb3I6I2Y5ZjlmYlxufVxuICAqL30pO1xuXG4gIHRyeSB7XG4gICAgZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QoXCJoZWFkXCIpLFwic3R5bGUjdGFibGUtY3NzXCIsXCJzdHlsZVwiKVxuICAgICAgLmF0dHIoXCJpZFwiLFwidGFibGUtY3NzXCIpXG4gICAgICAudGV4dChDU1NfU1RSSU5HLnJlcGxhY2UoXCJmdW5jdGlvbiAoKSB7LypcIixcIlwiKS5yZXBsYWNlKFwiKi99XCIsXCJcIikpO1xuICB9IGNhdGNoKGUpIHtcbiAgfVxuXG4gIHRoaXMuX3RhcmdldCA9IHRhcmdldDtcbiAgdGhpcy5fZGF0YSA9IHt9Oy8vRVhBTVBMRV9EQVRBXG4gIHRoaXMuX3NvcnQgPSB7fTtcbiAgdGhpcy5fcmVuZGVyZXJzID0ge307XG4gIHRoaXMuX3RvcCA9IDA7XG5cbiAgdGhpcy5fZGVmYXVsdF9yZW5kZXJlciA9IGZ1bmN0aW9uICh4KSB7XG4gICAgaWYgKHgua2V5LmluZGV4T2YoXCJwZXJjZW50XCIpID4gLTEpIHJldHVybiBkMy5zZWxlY3QodGhpcykudGV4dChmdW5jdGlvbih4KSB7IFxuICAgICAgICB2YXIgcGQgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX187XG4gICAgICAgIHJldHVybiBkMy5mb3JtYXQoXCIuMiVcIikocGRbeC5rZXldLzEwMClcbiAgICAgIH0pXG4gICBcbiAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLnRleHQoZnVuY3Rpb24oeCkgeyBcbiAgICAgIHZhciBwZCA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXztcbiAgICAgIHJldHVybiBwZFt4LmtleV0gPiAwID8gZDMuZm9ybWF0KFwiLC4yZlwiKShwZFt4LmtleV0pLnJlcGxhY2UoXCIuMDBcIixcIlwiKSA6IHBkW3gua2V5XVxuICAgIH0pXG4gIH07XG5cbiAgdGhpcy5faGlkZGVuX2ZpZWxkcyA9IFtdO1xuICB0aGlzLl9vbiA9IHt9O1xuICB0aGlzLl9yZW5kZXJfaGVhZGVyID0gZnVuY3Rpb24od3JhcCkge1xuXG5cbiAgICB3cmFwLmVhY2goZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIGhlYWRlcnMgPSBkM191cGRhdGVhYmxlKGQzLnNlbGVjdCh0aGlzKSxcIi5oZWFkZXJzXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoZWFkZXJzXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItYm90dG9tXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpO1xuXG4gICAgICBoZWFkZXJzLmh0bWwoXCJcIik7XG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShoZWFkZXJzLFwiLnVybFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidXJsXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjc1JVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoXCJBcnRpY2xlXCIpO1xuXG4gICAgICBkM191cGRhdGVhYmxlKGhlYWRlcnMsXCIuY291bnRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImNvdW50XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI1JVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoXCJDb3VudFwiKTtcblxuXG4gICAgfSk7XG5cbiAgfTtcbiAgdGhpcy5fcmVuZGVyX3JvdyA9IGZ1bmN0aW9uKHJvdykge1xuXG4gICAgICBkM191cGRhdGVhYmxlKHJvdyxcIi51cmxcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInVybFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3NSVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm92ZXJmbG93XCIsXCJoaWRkZW5cIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5rZXl9KTtcblxuICAgICAgZDNfdXBkYXRlYWJsZShyb3csXCIuY291bnRcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImNvdW50XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI1JVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KXtyZXR1cm4geC52YWx1ZX0pO1xuXG4gIH07XG59XG5cbmZ1bmN0aW9uIHRhYmxlKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFRhYmxlKHRhcmdldClcbn1cblxuVGFibGUucHJvdG90eXBlID0ge1xuXG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7IFxuICAgICAgdmFyIHZhbHVlID0gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpOyBcbiAgICAgIGlmICh2YWwgJiYgdmFsLnZhbHVlcy5sZW5ndGggJiYgdGhpcy5faGVhZGVycyA9PSB1bmRlZmluZWQpIHsgXG4gICAgICAgIHZhciBoZWFkZXJzID0gT2JqZWN0LmtleXModmFsLnZhbHVlc1swXSkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHtrZXk6eCx2YWx1ZTp4fSB9KTtcbiAgICAgICAgdGhpcy5oZWFkZXJzKGhlYWRlcnMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlXG4gICAgfVxuICAsIHNraXBfb3B0aW9uOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJza2lwX29wdGlvblwiLHZhbCkgfVxuXG4gICwgdGl0bGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9XG4gICwgcm93OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyZW5kZXJfcm93XCIsdmFsKSB9XG4gICwgZGVmYXVsdF9yZW5kZXJlcjogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGVmYXVsdF9yZW5kZXJlclwiLHZhbCkgfVxuICAsIHRvcDogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidG9wXCIsdmFsKSB9XG5cbiAgLCBoZWFkZXI6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInJlbmRlcl9oZWFkZXJcIix2YWwpIH1cbiAgLCBoZWFkZXJzOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWFkZXJzXCIsdmFsKSB9XG4gICwgaGlkZGVuX2ZpZWxkczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGlkZGVuX2ZpZWxkc1wiLHZhbCkgfVxuICAsIGFsbF9oZWFkZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBoZWFkZXJzID0gdGhpcy5oZWFkZXJzKCkucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMudmFsdWU7IHJldHVybiBwfSx7fSlcbiAgICAgICAgLCBpc19sb2NrZWQgPSB0aGlzLmhlYWRlcnMoKS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4gISF4LmxvY2tlZCB9KS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSk7XG5cbiAgICAgIGlmICh0aGlzLl9kYXRhLnZhbHVlcyAmJiB0aGlzLl9kYXRhLnZhbHVlcy5sZW5ndGgpIHtcbiAgICAgICAgXG4gICAgICAgIHZhciBhbGxfaGVhZHMgPSBPYmplY3Qua2V5cyh0aGlzLl9kYXRhLnZhbHVlc1swXSkubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgaWYgKHRoaXMuX2hpZGRlbl9maWVsZHMgJiYgdGhpcy5faGlkZGVuX2ZpZWxkcy5pbmRleE9mKHgpID4gLTEpIHJldHVybiBmYWxzZVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGtleTp4XG4gICAgICAgICAgICAsIHZhbHVlOmhlYWRlcnNbeF0gfHwgeFxuICAgICAgICAgICAgLCBzZWxlY3RlZDogISFoZWFkZXJzW3hdXG4gICAgICAgICAgICAsIGxvY2tlZDogKGlzX2xvY2tlZC5pbmRleE9mKHgpID4gLTEgPyB0cnVlIDogdW5kZWZpbmVkKSBcbiAgICAgICAgICB9IFxuICAgICAgICB9LmJpbmQodGhpcykpLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4IH0pO1xuICAgICAgICB2YXIgZ2V0SW5kZXggPSBmdW5jdGlvbihrKSB7XG4gICAgICAgICAgcmV0dXJuIGlzX2xvY2tlZC5pbmRleE9mKGspID4gLTEgPyBpc19sb2NrZWQuaW5kZXhPZihrKSArIDEwIDogMFxuICAgICAgICB9O1xuXG4gICAgICAgIGFsbF9oZWFkcyA9IGFsbF9oZWFkcy5zb3J0KGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gZ2V0SW5kZXgoYy5rZXkgfHwgLUluZmluaXR5KSAtIGdldEluZGV4KHAua2V5IHx8IC1JbmZpbml0eSkgfSk7XG4gICAgICAgIHJldHVybiBhbGxfaGVhZHNcbiAgICAgIH1cbiAgICAgIGVsc2UgcmV0dXJuIHRoaXMuaGVhZGVycygpXG4gICAgfVxuICAsIHNvcnQ6IGZ1bmN0aW9uKGtleSxhc2NlbmRpbmcpIHtcbiAgICAgIGlmICgha2V5KSByZXR1cm4gdGhpcy5fc29ydFxuICAgICAgdGhpcy5fc29ydCA9IHtcbiAgICAgICAgICBrZXk6IGtleVxuICAgICAgICAsIHZhbHVlOiAhIWFzY2VuZGluZ1xuICAgICAgfTtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICwgcmVuZGVyX3dyYXBwZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHdyYXAgPSB0aGlzLl90YXJnZXQ7XG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnRhYmxlLXdyYXBwZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInRhYmxlLXdyYXBwZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwicmVsYXRpdmVcIik7XG5cblxuICAgICAgdmFyIHRhYmxlID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwidGFibGUubWFpblwiLFwidGFibGVcIilcbiAgICAgICAgLmNsYXNzZWQoXCJtYWluXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMCVcIik7XG5cbiAgICAgIHRoaXMuX3RhYmxlX21haW4gPSB0YWJsZTtcblxuICAgICAgdmFyIHRoZWFkID0gZDNfdXBkYXRlYWJsZSh0YWJsZSxcInRoZWFkXCIsXCJ0aGVhZFwiKTtcbiAgICAgIGQzX3VwZGF0ZWFibGUodGFibGUsXCJ0Ym9keVwiLFwidGJvZHlcIik7XG5cblxuXG4gICAgICBpZiAoIXRoaXMuX3NraXBfb3B0aW9uKSB7XG4gICAgICB2YXIgdGFibGVfZml4ZWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCJ0YWJsZS5maXhlZFwiLFwidGFibGVcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwgdHJ1ZSkgLy8gVE9ETzogbWFrZSB0aGlzIHZpc2libGUgd2hlbiBtYWluIGlzIG5vdCBpbiB2aWV3XG4gICAgICAgIC5jbGFzc2VkKFwiZml4ZWRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLHdyYXBwZXIuc3R5bGUoXCJ3aWR0aFwiKSlcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsdGhpcy5fdG9wICsgXCJweFwiKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIik7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHRyeSB7XG4gICAgICBkMy5zZWxlY3Qod2luZG93KS5vbignc2Nyb2xsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHRhYmxlLm5vZGUoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AsIHNlbGYuX3RvcCk7XG4gICAgICAgIGlmICh0YWJsZS5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wIDwgc2VsZi5fdG9wKSB0YWJsZV9maXhlZC5jbGFzc2VkKFwiaGlkZGVuXCIsZmFsc2UpO1xuICAgICAgICBlbHNlIHRhYmxlX2ZpeGVkLmNsYXNzZWQoXCJoaWRkZW5cIix0cnVlKTtcblxuICAgICAgICB2YXIgd2lkdGhzID0gW107XG5cbiAgICAgICAgd3JhcC5zZWxlY3RBbGwoXCIubWFpblwiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCIudGFibGUtaGVhZGVyc1wiKVxuICAgICAgICAgIC5zZWxlY3RBbGwoXCJ0aFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgICAgd2lkdGhzLnB1c2godGhpcy5vZmZzZXRXaWR0aCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgd3JhcC5zZWxlY3RBbGwoXCIuZml4ZWRcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwiLnRhYmxlLWhlYWRlcnNcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwidGhcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcIndpZHRoXCIsd2lkdGhzW2ldICsgXCJweFwiKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICB9KTtcbiAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICBcblxuICAgICAgdGhpcy5fdGFibGVfZml4ZWQgPSB0YWJsZV9maXhlZDtcblxuXG4gICAgICB2YXIgdGhlYWQgPSBkM191cGRhdGVhYmxlKHRhYmxlX2ZpeGVkLFwidGhlYWRcIixcInRoZWFkXCIpO1xuXG4gICAgICB2YXIgdGFibGVfYnV0dG9uID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwiLnRhYmxlLW9wdGlvblwiLFwiYVwiKVxuICAgICAgICAuY2xhc3NlZChcInRhYmxlLW9wdGlvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJhYnNvbHV0ZVwiKVxuICAgICAgICAuc3R5bGUoXCJ0b3BcIixcIi0xcHhcIilcbiAgICAgICAgLnN0eWxlKFwicmlnaHRcIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIixcInBvaW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMzcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1yaWdodFwiLFwiOHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiOHB4XCIpXG4gICAgICAgIC50ZXh0KFwiT1BUSU9OU1wiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZTNlYmYwXCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHRoaXMuX29wdGlvbnNfaGVhZGVyLmNsYXNzZWQoXCJoaWRkZW5cIiwhdGhpcy5fb3B0aW9uc19oZWFkZXIuY2xhc3NlZChcImhpZGRlblwiKSk7XG4gICAgICAgICAgdGhpcy5fc2hvd19vcHRpb25zID0gIXRoaXMuX29wdGlvbnNfaGVhZGVyLmNsYXNzZWQoXCJoaWRkZW5cIik7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB3cmFwcGVyXG4gICAgfSAgXG4gICwgcmVuZGVyX2hlYWRlcjogZnVuY3Rpb24odGFibGUpIHtcblxuICAgICAgdmFyIHRoZWFkID0gdGFibGUuc2VsZWN0QWxsKFwidGhlYWRcIilcbiAgICAgICAgLCB0Ym9keSA9IHRhYmxlLnNlbGVjdEFsbChcInRib2R5XCIpO1xuXG4gICAgICBpZiAodGhpcy5oZWFkZXJzKCkgPT0gdW5kZWZpbmVkKSByZXR1cm5cblxuICAgICAgdmFyIG9wdGlvbnNfdGhlYWQgPSBkM191cGRhdGVhYmxlKHRoZWFkLFwidHIudGFibGUtb3B0aW9uc1wiLFwidHJcIix0aGlzLmFsbF9oZWFkZXJzKCksZnVuY3Rpb24oeCl7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwgIXRoaXMuX3Nob3dfb3B0aW9ucylcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS1vcHRpb25zXCIsdHJ1ZSk7XG5cbiAgICAgIHZhciBoID0gdGhpcy5fc2tpcF9vcHRpb24gPyB0aGlzLmhlYWRlcnMoKSA6IHRoaXMuaGVhZGVycygpLmNvbmNhdChbe2tleTpcInNwYWNlclwiLCB3aWR0aDpcIjcwcHhcIn1dKTtcbiAgICAgIHZhciBoZWFkZXJzX3RoZWFkID0gZDNfdXBkYXRlYWJsZSh0aGVhZCxcInRyLnRhYmxlLWhlYWRlcnNcIixcInRyXCIsaCxmdW5jdGlvbih4KXsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcInRhYmxlLWhlYWRlcnNcIix0cnVlKTtcblxuXG4gICAgICB2YXIgdGggPSBkM19zcGxhdChoZWFkZXJzX3RoZWFkLFwidGhcIixcInRoXCIsZmFsc2UsZnVuY3Rpb24oeCxpKSB7cmV0dXJuIHgua2V5ICsgaSB9KVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgud2lkdGggfSlcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcInJlbGF0aXZlXCIpXG4gICAgICAgIC5vcmRlcigpO1xuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodGgsXCJzcGFuXCIsXCJzcGFuXCIpXG4gICAgICAgIC5jbGFzc2VkKFwidGl0bGVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIixcInBvaW50ZXJcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBpZiAoeC5zb3J0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgZGVsZXRlIHhbJ3NvcnQnXTtcbiAgICAgICAgICAgIHRoaXMuX3NvcnQgPSB7fTtcbiAgICAgICAgICAgIHRoaXMuZHJhdygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4LnNvcnQgPSAhIXguc29ydDtcblxuICAgICAgICAgICAgdGhpcy5zb3J0KHgua2V5LHguc29ydCk7XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodGgsXCJpXCIsXCJpXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZmFcIix0cnVlKVxuICAgICAgICAuY2xhc3NlZChcImZhLXNvcnQtYXNjXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuICh4LmtleSA9PSB0aGlzLl9zb3J0LmtleSkgPyB0aGlzLl9zb3J0LnZhbHVlID09PSB0cnVlIDogdW5kZWZpbmVkIH0uYmluZCh0aGlzKSlcbiAgICAgICAgLmNsYXNzZWQoXCJmYS1zb3J0LWRlc2NcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4gKHgua2V5ID09IHRoaXMuX3NvcnQua2V5KSA/IHRoaXMuX3NvcnQudmFsdWUgPT09IGZhbHNlIDogdW5kZWZpbmVkIH0uYmluZCh0aGlzKSk7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBjYW5fcmVkcmF3ID0gdHJ1ZTtcblxuICAgICAgdmFyIGRyYWcgPSBkMy5iZWhhdmlvci5kcmFnKClcbiAgICAgICAgLm9uKFwiZHJhZ1wiLCBmdW5jdGlvbihkLGkpIHtcbiAgICAgICAgICAgIHZhciB4ID0gZDMuZXZlbnQuZHg7XG4gICAgICAgICAgICB2YXIgdyA9IHBhcnNlSW50KGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnN0eWxlKFwid2lkdGhcIikucmVwbGFjZShcInB4XCIpKTtcbiAgICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXy53aWR0aCA9ICh3K3gpK1wicHhcIjtcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnN0eWxlKFwid2lkdGhcIiwgKHcreCkrXCJweFwiKTtcblxuICAgICAgICAgICAgdmFyIGluZGV4ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW4sMCkuaW5kZXhPZih0aGlzLnBhcmVudE5vZGUpICsgMTtcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbltpbmRleF0pLnN0eWxlKFwid2lkdGhcIix1bmRlZmluZWQpO1xuXG4gICAgICAgICAgICBpZiAoY2FuX3JlZHJhdykge1xuICAgICAgICAgICAgICBjYW5fcmVkcmF3ID0gZmFsc2U7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY2FuX3JlZHJhdyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGJvZHkuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bnRoLW9mLXR5cGUoXCIgKyBpbmRleCArIFwiKVwiKS5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICAgIHZhciByZW5kZXIgPSBzZWxmLl9yZW5kZXJlcnNbeC5rZXldO1xuICAgICAgICAgICAgICAgICAgaWYgKHJlbmRlcikgcmVuZGVyLmJpbmQodGhpcykoeCk7XG4gICAgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgfSwxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcblxuICAgICAgdmFyIGRyYWdnYWJsZSA9IGQzX3VwZGF0ZWFibGUodGgsXCJiXCIsXCJiXCIpXG4gICAgICAgIC5zdHlsZShcImN1cnNvclwiLCBcImV3LXJlc2l6ZVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIiwgXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLCBcIjEwMCVcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIiwgXCJhYnNvbHV0ZVwiKVxuICAgICAgICAuc3R5bGUoXCJyaWdodFwiLCBcIi04cHhcIilcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsIFwiMFwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLCBcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiei1pbmRleFwiLCAxKVxuICAgICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbigpe1xuICAgICAgICAgICB2YXIgaW5kZXggPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbiwwKS5pbmRleE9mKHRoaXMucGFyZW50Tm9kZSkgKyAxO1xuICAgICAgICAgICB0Ym9keS5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpudGgtb2YtdHlwZShcIiArIGluZGV4ICsgXCIpXCIpLnN0eWxlKFwiYm9yZGVyLXJpZ2h0XCIsXCIxcHggZG90dGVkICNjY2NcIik7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcIm1vdXNlb3V0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgdmFyIGluZGV4ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW4sMCkuaW5kZXhPZih0aGlzLnBhcmVudE5vZGUpICsgMTtcbiAgICAgICAgICAgdGJvZHkuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bnRoLW9mLXR5cGUoXCIgKyBpbmRleCArIFwiKVwiKS5zdHlsZShcImJvcmRlci1yaWdodFwiLHVuZGVmaW5lZCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYWxsKGRyYWcpO1xuXG4gICAgICB0aC5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICAgIGlmICghdGhpcy5fc2tpcF9vcHRpb24pIHtcbiAgICAgIHZhciBvcHRpb25zID0gZDNfdXBkYXRlYWJsZShvcHRpb25zX3RoZWFkLFwidGhcIixcInRoXCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsdGhpcy5oZWFkZXJzKCkubGVuZ3RoKzEpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgdmFyIG9wdGlvbiA9IGQzX3NwbGF0KG9wdGlvbnMsXCIub3B0aW9uXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgICAuY2xhc3NlZChcIm9wdGlvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIik7XG5cblxuICAgICAgb3B0aW9uLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBkM191cGRhdGVhYmxlKG9wdGlvbixcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgICAuYXR0cihcInR5cGVcIixcImNoZWNrYm94XCIpXG4gICAgICAgIC5wcm9wZXJ0eShcImNoZWNrZWRcIixmdW5jdGlvbih4KSB7IFxuICAgICAgICAgIHRoaXMuY2hlY2tlZCA9IHguc2VsZWN0ZWQ7XG4gICAgICAgICAgcmV0dXJuIHguc2VsZWN0ZWQgPyBcImNoZWNrZWRcIiA6IHVuZGVmaW5lZCBcbiAgICAgICAgfSlcbiAgICAgICAgLmF0dHIoXCJkaXNhYmxlZFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubG9ja2VkIH0pXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB4LnNlbGVjdGVkID0gdGhpcy5jaGVja2VkO1xuICAgICAgICAgIGlmICh4LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICBzZWxmLmhlYWRlcnMoKS5wdXNoKHgpO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuZHJhdygpXG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBpbmRpY2VzID0gc2VsZi5oZWFkZXJzKCkubWFwKGZ1bmN0aW9uKHosaSkgeyByZXR1cm4gei5rZXkgPT0geC5rZXkgPyBpIDogdW5kZWZpbmVkICB9KSBcbiAgICAgICAgICAgICwgaW5kZXggPSBpbmRpY2VzLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6IH0pIHx8IDA7XG5cbiAgICAgICAgICBzZWxmLmhlYWRlcnMoKS5zcGxpY2UoaW5kZXgsMSk7XG4gICAgICAgICAgc2VsZi5kcmF3KCk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUob3B0aW9uLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiBcIiBcIiArIHgudmFsdWUgfSk7XG5cbiAgICAgfVxuXG5cbiAgICAgdGhpcy5fb3B0aW9uc19oZWFkZXIgPSB0aGlzLl90YXJnZXQuc2VsZWN0QWxsKFwiLnRhYmxlLW9wdGlvbnNcIik7XG4gICAgfVxuICBcbiAgLCByZW5kZXJfcm93czogZnVuY3Rpb24odGFibGUpIHtcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHRib2R5ID0gdGFibGUuc2VsZWN0QWxsKFwidGJvZHlcIik7XG5cbiAgICAgIGlmICh0aGlzLmhlYWRlcnMoKSA9PSB1bmRlZmluZWQpIHJldHVyblxuICAgICAgaWYgKCEodGhpcy5fZGF0YSAmJiB0aGlzLl9kYXRhLnZhbHVlcyAmJiB0aGlzLl9kYXRhLnZhbHVlcy5sZW5ndGgpKSByZXR1cm5cblxuICAgICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhLnZhbHVlc1xuICAgICAgICAsIHNvcnRieSA9IHRoaXMuX3NvcnQgfHwge307XG5cbiAgICAgIGRhdGEgPSBkYXRhLnNvcnQoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgIHZhciBhID0gcFtzb3J0Ynkua2V5XSB8fCAtSW5maW5pdHlcbiAgICAgICAgICAsIGIgPSBjW3NvcnRieS5rZXldIHx8IC1JbmZpbml0eTtcblxuICAgICAgICByZXR1cm4gc29ydGJ5LnZhbHVlID8gZDMuYXNjZW5kaW5nKGEsYikgOiBkMy5kZXNjZW5kaW5nKGEsYilcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgcm93cyA9IGQzX3NwbGF0KHRib2R5LFwidHJcIixcInRyXCIsZGF0YSxmdW5jdGlvbih4LGkpeyByZXR1cm4gU3RyaW5nKHNvcnRieS5rZXkgKyB4W3NvcnRieS5rZXldKSArIGkgfSlcbiAgICAgICAgLm9yZGVyKClcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgc2VsZi5vbihcImV4cGFuZFwiKS5iaW5kKHRoaXMpKHgpO1xuICAgICAgICB9KTtcblxuICAgICAgcm93cy5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICAgIHZhciB0ZCA9IGQzX3NwbGF0KHJvd3MsXCJ0ZFwiLFwidGRcIix0aGlzLmhlYWRlcnMoKSxmdW5jdGlvbih4LGkpIHtyZXR1cm4geC5rZXkgKyBpIH0pXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcyk7XG5cbiAgICAgICAgICB2YXIgcmVuZGVyZXIgPSBzZWxmLl9yZW5kZXJlcnNbeC5rZXldO1xuXG4gICAgICAgICAgaWYgKCFyZW5kZXJlcikgeyBcbiAgICAgICAgICAgIHJlbmRlcmVyID0gc2VsZi5fZGVmYXVsdF9yZW5kZXJlci5iaW5kKHRoaXMpKHgpOyBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHJlbmRlcmVyLmJpbmQodGhpcykoeClcbiAgICAgICAgICB9XG5cblxuICAgICAgICB9KTtcblxuICAgICAgICBcblxuICAgICAgdGQuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICB2YXIgbyA9IGQzX3VwZGF0ZWFibGUocm93cyxcInRkLm9wdGlvbi1oZWFkZXJcIixcInRkXCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJvcHRpb24taGVhZGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjcwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpO1xuIFxuICAgICAgaWYgKHRoaXMuX3NraXBfb3B0aW9uKSBvLmNsYXNzZWQoXCJoaWRkZW5cIix0cnVlKTsgXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShvLFwiYVwiLFwiYVwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuaHRtbChzZWxmLm9wdGlvbl90ZXh0KCkpO1xuICAgICAgICBcblxuXG5cbiAgICB9XG4gICwgb3B0aW9uX3RleHQ6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm9wdGlvbl90ZXh0XCIsdmFsKSB9XG4gICwgcmVuZGVyOiBmdW5jdGlvbihrLGZuKSB7XG4gICAgICBpZiAoZm4gPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fcmVuZGVyZXJzW2tdIHx8IGZhbHNlXG4gICAgICB0aGlzLl9yZW5kZXJlcnNba10gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHdyYXBwZXIgPSB0aGlzLnJlbmRlcl93cmFwcGVyKCk7XG5cbiAgICAgIHdyYXBwZXIuc2VsZWN0QWxsKFwidGFibGVcIilcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgICBzZWxmLnJlbmRlcl9oZWFkZXIoZDMuc2VsZWN0KHRoaXMpKTsgXG4gICAgICAgIH0pO1xuXG4gICAgICB0aGlzLnJlbmRlcl9yb3dzKHRoaXMuX3RhYmxlX21haW4pO1xuXG4gICAgICByZXR1cm4gdGhpc1xuXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGQzOiBkM1xufTtcblxuZXhwb3J0IHsgdGFibGUsIHRhYmxlIGFzIHQgfTtleHBvcnQgZGVmYXVsdCB0YWJsZTtcbiIsIi8vaW1wb3J0IGQzIGZyb20gJ2QzJ1xuXG5mdW5jdGlvbiBkM191cGRhdGVhYmxlKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiO1xuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZnVuY3Rpb24oeCl7cmV0dXJuIGRhdGEgPyBbZGF0YV0gOiBbeF19LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4gW3hdfVxuICApO1xuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSk7XG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZnVuY3Rpb24gZDNfc3BsYXQodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCI7XG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gICk7XG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKTtcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5cbnZhciB0eXBld2F0Y2ggPSAoZnVuY3Rpb24oKXtcbiAgdmFyIHRpbWVyID0gMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNhbGxiYWNrLCBtcyl7XG4gICAgY2xlYXJUaW1lb3V0ICh0aW1lcik7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGNhbGxiYWNrLCBtcyk7XG4gIH07XG59KSgpO1xuXG5cblxuZnVuY3Rpb24gRmlsdGVyKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMuX2RhdGEgPSBmYWxzZTtcbiAgdGhpcy5fb24gPSB7fTtcbiAgdGhpcy5fcmVuZGVyX29wID0ge307XG59XG5cbmZ1bmN0aW9uIGZpbHRlciQyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEZpbHRlcih0YXJnZXQpXG59XG5cbkZpbHRlci5wcm90b3R5cGUgPSB7XG4gICAgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIuZmlsdGVycy13cmFwcGVyXCIsXCJkaXZcIix0aGlzLmRhdGEoKSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlcnMtd3JhcHBlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLCBcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1yaWdodFwiLCBcIjIwcHhcIik7XG5cbiAgICAgIHZhciBmaWx0ZXJzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmZpbHRlcnNcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlcnNcIix0cnVlKTtcbiAgICAgIFxuICAgICAgdmFyIGZpbHRlciA9IGQzX3NwbGF0KGZpbHRlcnMsXCIuZmlsdGVyXCIsXCJkaXZcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpICsgeC5maWVsZCB9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpO1xuXG4gICAgICBmaWx0ZXIuZXhpdCgpLnJlbW92ZSgpO1xuICAgICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBmaWx0ZXIuZWFjaChmdW5jdGlvbih2LHBvcykge1xuICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgIHNlbGYuZmlsdGVyUm93KGR0aGlzLCBzZWxmLl9maWVsZHMsIHNlbGYuX29wcywgdik7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgdGhpcy5maWx0ZXJGb290ZXIod3JhcCk7XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgICBcbiAgICB9XG4gICwgb3BzOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb3BzXG4gICAgICB0aGlzLl9vcHMgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZmllbGRzOiBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZmllbGRzXG4gICAgICB0aGlzLl9maWVsZHMgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgXHR9XG4gICwgZGF0YTogZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2RhdGFcbiAgICAgIHRoaXMuX2RhdGEgPSBkO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgXHR9XG4gICwgdGV4dDogZnVuY3Rpb24oZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZm4gfHwgZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSB9XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcmVuZGVyX29wOiBmdW5jdGlvbihvcCxmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9yZW5kZXJfb3Bbb3BdIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9yZW5kZXJfb3Bbb3BdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgYnVpbGRPcDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICB2YXIgb3AgPSBvYmoub3BcbiAgICAgICAgLCBmaWVsZCA9IG9iai5maWVsZFxuICAgICAgICAsIHZhbHVlID0gb2JqLnZhbHVlO1xuICAgIFxuICAgICAgaWYgKCBbb3AsZmllbGQsdmFsdWVdLmluZGV4T2YodW5kZWZpbmVkKSA+IC0xKSByZXR1cm4gZnVuY3Rpb24oKSB7cmV0dXJuIHRydWV9XG4gICAgXG4gICAgICByZXR1cm4gdGhpcy5fb3BzW29wXShmaWVsZCwgdmFsdWUpXG4gICAgfVxuICAsIGZpbHRlclJvdzogZnVuY3Rpb24oX2ZpbHRlciwgZmllbGRzLCBvcHMsIHZhbHVlKSB7XG4gICAgXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciByZW1vdmUgPSBkM191cGRhdGVhYmxlKF9maWx0ZXIsXCIucmVtb3ZlXCIsXCJhXCIpXG4gICAgICAgIC5jbGFzc2VkKFwicmVtb3ZlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5odG1sKFwiJiMxMDAwNTtcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIG5ld19kYXRhID0gc2VsZi5kYXRhKCkuZmlsdGVyKGZ1bmN0aW9uKGYpIHsgcmV0dXJuIGYgIT09IHggfSk7XG4gICAgICAgICAgc2VsZi5kYXRhKG5ld19kYXRhKTtcbiAgICAgICAgICBzZWxmLmRyYXcoKTtcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcblxuICAgICAgICB9KTtcblxuICAgICAgdmFyIGZpbHRlciA9IGQzX3VwZGF0ZWFibGUoX2ZpbHRlcixcIi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXJcIix0cnVlKTtcblxuICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic2VsZWN0LmZpZWxkXCIsXCJzZWxlY3RcIixmaWVsZHMpXG4gICAgICAgIC5jbGFzc2VkKFwiZmllbGRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTY1cHhcIilcbiAgICAgICAgLm9uKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKHgsaSkge1xuICAgICAgICAgIHZhbHVlLmZpZWxkID0gdGhpcy5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX187XG4gICAgICAgICAgXG4gICAgICAgICAgdmFyIHBvcyA9IDA7XG4gICAgICAgICAgZmllbGRzLm1hcChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgIGlmICh4ID09IHZhbHVlLmZpZWxkKSBwb3MgPSBpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdmFyIHNlbGVjdGVkID0gb3BzW3Bvc10uZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5ID09IHZhbHVlLm9wIH0pO1xuICAgICAgICAgIGlmIChzZWxlY3RlZC5sZW5ndGggPT0gMCkgdmFsdWUub3AgPSBvcHNbcG9zXVswXS5rZXk7XG4gICAgICAgICAgLy92YWx1ZS5mbiA9IHNlbGYuYnVpbGRPcCh2YWx1ZSlcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcblxuICAgICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICAgIHNlbGYuZHJhd09wcyhmaWx0ZXIsIG9wc1twb3NdLCB2YWx1ZSwgcG9zKTtcbiAgICAgICAgfSk7XG4gICAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIilcbiAgICAgICAgLnByb3BlcnR5KFwiZGlzYWJsZWRcIiAsdHJ1ZSlcbiAgICAgICAgLnByb3BlcnR5KFwiaGlkZGVuXCIsIHRydWUpXG4gICAgICAgIC50ZXh0KFwiRmlsdGVyLi4uXCIpO1xuXG4gICAgICBcbiAgICAgIGQzX3NwbGF0KHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSlcbiAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4ID09IHZhbHVlLmZpZWxkID8gXCJzZWxlY3RlZFwiIDogdW5kZWZpbmVkIH0pO1xuXG4gICAgICBpZiAodmFsdWUub3AgJiYgdmFsdWUuZmllbGQgJiYgdmFsdWUudmFsdWUpIHtcbiAgICAgICAgdmFyIHBvcyA9IGZpZWxkcy5pbmRleE9mKHZhbHVlLmZpZWxkKTtcbiAgICAgICAgc2VsZi5kcmF3T3BzKGZpbHRlciwgb3BzW3Bvc10sIHZhbHVlLCBwb3MpO1xuICAgICAgfVxuXG5cbiAgICB9XG4gICwgZHJhd09wczogZnVuY3Rpb24oZmlsdGVyLCBvcHMsIHZhbHVlKSB7XG5cbiAgICAgIFxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcInNlbGVjdC5vcFwiLFwic2VsZWN0XCIsZmFsc2UsIGZ1bmN0aW9uKHgpIHtyZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwib3BcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5vbihcImNoYW5nZVwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICB2YWx1ZS5vcCA9IHRoaXMuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleTtcbiAgICAgICAgICAvL3ZhbHVlLmZuID0gc2VsZi5idWlsZE9wKHZhbHVlKVxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpO1xuICAgICAgICAgIHNlbGYuZHJhd0lucHV0KGZpbHRlciwgdmFsdWUsIHZhbHVlLm9wKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIC8vdmFyIGRmbHQgPSBbe1wia2V5XCI6XCJTZWxlY3QgT3BlcmF0aW9uLi4uXCIsXCJkaXNhYmxlZFwiOnRydWUsXCJoaWRkZW5cIjp0cnVlfV1cblxuICAgICAgdmFyIG5ld19vcHMgPSBvcHM7IC8vZGZsdC5jb25jYXQob3BzKVxuXG4gICAgICB2YWx1ZS5vcCA9IHZhbHVlLm9wIHx8IG5ld19vcHNbMF0ua2V5O1xuXG4gICAgICB2YXIgb3BzID0gZDNfc3BsYXQoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIixuZXdfb3BzLGZ1bmN0aW9uKHgpe3JldHVybiB4LmtleX0pXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5LnNwbGl0KFwiLlwiKVswXSB9KSBcbiAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSA9PSB2YWx1ZS5vcCA/IFwic2VsZWN0ZWRcIiA6IHVuZGVmaW5lZCB9KTtcblxuICAgICAgb3BzLmV4aXQoKS5yZW1vdmUoKTtcbiAgICAgIHNlbGYuZHJhd0lucHV0KGZpbHRlciwgdmFsdWUsIHZhbHVlLm9wKTtcblxuICAgIH1cbiAgLCBkcmF3SW5wdXQ6IGZ1bmN0aW9uKGZpbHRlciwgdmFsdWUsIG9wKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi52YWx1ZVwiKS5yZW1vdmUoKTtcbiAgICAgIHZhciByID0gdGhpcy5fcmVuZGVyX29wW29wXTtcblxuICAgICAgaWYgKHIpIHtcbiAgICAgICAgcmV0dXJuIHIuYmluZCh0aGlzKShmaWx0ZXIsdmFsdWUpXG4gICAgICB9XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwiaW5wdXQudmFsdWVcIixcImlucHV0XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidmFsdWVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE1MHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxZW1cIilcblxuICAgICAgICAuYXR0cihcInZhbHVlXCIsIHZhbHVlLnZhbHVlKVxuICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICB2YXIgdCA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAgIHR5cGV3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdC52YWx1ZTtcbiAgICAgICAgICAgIC8vdmFsdWUuZm4gPSBzZWxmLmJ1aWxkT3AodmFsdWUpXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcbiAgICAgICAgICB9LDEwMDApO1xuICAgICAgICB9KTtcbiAgICBcbiAgICB9XG4gICwgZmlsdGVyRm9vdGVyOiBmdW5jdGlvbih3cmFwKSB7XG4gICAgICB2YXIgZm9vdGVyID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmZpbHRlci1mb290ZXJcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImZpbHRlci1mb290ZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjEwcHhcIik7XG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgXG4gICAgICBkM191cGRhdGVhYmxlKGZvb3RlcixcIi5hZGRcIixcImFcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJhZGRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuaHRtbChcIiYjNjUyOTE7XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLXJhZGl1c1wiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjEuNXB4IHNvbGlkICM0MjhCQ0NcIilcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICBcbiAgICAgICAgICB2YXIgZCA9IHNlbGYuX2RhdGE7XG4gICAgICAgICAgaWYgKGQubGVuZ3RoID09IDAgfHwgT2JqZWN0LmtleXMoZC5zbGljZSgtMSkpLmxlbmd0aCA+IDApIGQucHVzaCh7fSk7XG4gICAgICAgICAgc2VsZi5kcmF3KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAsIHR5cGV3YXRjaDogdHlwZXdhdGNoXG59O1xuXG5mdW5jdGlvbiBhY2Nlc3NvciQxKGF0dHIsIHZhbCkge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzW1wiX1wiICsgYXR0cl1cbiAgdGhpc1tcIl9cIiArIGF0dHJdID0gdmFsO1xuICByZXR1cm4gdGhpc1xufVxuXG5mdW5jdGlvbiBGaWx0ZXJEYXRhKGRhdGEpIHtcbiAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gIHRoaXMuX2wgPSBcIm9yXCI7XG59XG5cbmZ1bmN0aW9uIGZpbHRlcl9kYXRhKGRhdGEpIHtcbiAgcmV0dXJuIG5ldyBGaWx0ZXJEYXRhKGRhdGEpXG59XG5cbkZpbHRlckRhdGEucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IkMS5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfVxuICAsIGxvZ2ljOiBmdW5jdGlvbihsKSB7XG4gICAgICBpZiAobCA9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9sXG4gICAgICB0aGlzLl9sID0gKGwgPT0gXCJhbmRcIikgPyBcImFuZFwiIDogXCJvclwiO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb3A6IGZ1bmN0aW9uKG9wLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vcHNbb3BdIHx8IHRoaXMuX29wc1tcImVxdWFsc1wiXTtcbiAgICAgIHRoaXMuX29wc1tvcF0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG5cbiAgICB9XG4gICwgYnk6IGZ1bmN0aW9uKGIpIHtcbiAgICAgIFxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICAgICwgZmlsdGVyID0gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgaWYgKGIubGVuZ3RoID09IDApIHJldHVybiB0cnVlXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBtYXNrID0gYi5tYXAoZnVuY3Rpb24oeikge1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgdmFyIHNwbGl0ID0gei5maWVsZC5zcGxpdChcIi5cIiksIGZpZWxkID0gc3BsaXQuc2xpY2UoLTEpWzBdXG4gICAgICAgICAgICAgICAgLCBvYmogPSBzcGxpdC5zbGljZSgwLC0xKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwW2NdIH0seClcbiAgICAgICAgICAgICAgICAsIG9zcGxpdCA9IHoub3Auc3BsaXQoXCIuXCIpLCBvcCA9IG9zcGxpdFswXTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHJldHVybiBzZWxmLm9wKG9wKShmaWVsZCx6LnZhbHVlKShvYmopXG4gICAgICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4IH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2VsZi5fbCA9PSBcImFuZFwiKSByZXR1cm4gbWFzay5sZW5ndGggPT0gYi5sZW5ndGhcbiAgICAgICAgICAgIHJldHVybiBtYXNrLmxlbmd0aCA+IDBcbiAgICAgICAgICB9O1xuICAgICAgXG4gICAgICByZXR1cm4gdGhpcy5fZGF0YS5maWx0ZXIoZmlsdGVyKVxuXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl07XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBfb3BzOiB7XG4gICAgICAgIFwiZXF1YWxzXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKSA9PSBTdHJpbmcodmFsdWUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4vLyAgICAgICwgXCJjb250YWluc1wiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbi8vICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4vLyAgICAgICAgICAgIHJldHVybiBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMVxuLy8gICAgICAgICAgfVxuLy8gICAgICAgIH1cbiAgICAgICwgXCJzdGFydHMgd2l0aFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA9PSAwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiZW5kcyB3aXRoXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gKFN0cmluZyh4W2ZpZWxkXSkubGVuZ3RoIC0gU3RyaW5nKHZhbHVlKS5sZW5ndGgpID09IFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImRvZXMgbm90IGVxdWFsXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKSAhPSBTdHJpbmcodmFsdWUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgc2V0XCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHhbZmllbGRdICE9IHVuZGVmaW5lZCkgJiYgKHhbZmllbGRdICE9IFwiXCIpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgbm90IHNldFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIHhbZmllbGRdID09IHVuZGVmaW5lZFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImJldHdlZW5cIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh4W2ZpZWxkXSkgPj0gdmFsdWVbMF0gJiYgcGFyc2VJbnQoeFtmaWVsZF0pIDw9IHZhbHVlWzFdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAsIFwiaXMgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMSB9LCAwKSA+IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAsIFwiaXMgbm90IGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPT0gMFxuICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICAgICwgXCJkb2VzIG5vdCBjb250YWluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKS50b0xvd2VyQ2FzZSgpKSA+IC0xIH0sIDApID09IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAsIFwiY29udGFpbnNcIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnRvTG93ZXJDYXNlKCkuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpLnRvTG93ZXJDYXNlKCkpID4gLTEgfSwgMCkgPiAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciB2ZXJzaW9uID0gXCIwLjAuMVwiO1xuXG5leHBvcnQgeyB2ZXJzaW9uLCBmaWx0ZXIkMiBhcyBmaWx0ZXIsIGZpbHRlcl9kYXRhIH07XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQge2ZpbHRlcn0gZnJvbSAnZmlsdGVyJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIEZpbHRlclZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG5cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5fZmlsdGVyX29wdGlvbnMgPSB7XG4gICAgICBcIkNhdGVnb3J5XCI6IFwicGFyZW50X2NhdGVnb3J5X25hbWVcIlxuICAgICwgXCJUaXRsZVwiOiBcInVybFwiXG4gICAgLCBcIlRpbWVcIjogXCJob3VyXCJcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmaWx0ZXJfdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBGaWx0ZXJWaWV3KHRhcmdldClcbn1cblxuRmlsdGVyVmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBsb2dpYzogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljXCIsdmFsKSBcbiAgICB9XG4gICwgY2F0ZWdvcmllczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNhdGVnb3JpZXNcIix2YWwpIFxuICAgIH1cbiAgLCBmaWx0ZXJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZmlsdGVyc1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuZmlsdGVyLXdyYXBcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCl7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXItd3JhcFwiLHRydWUpXG5cbiAgICAgIGhlYWRlcih3cmFwcGVyKVxuICAgICAgICAudGV4dChcIkZpbHRlclwiKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIHZhciBzdWJ0aXRsZSA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCIuc3VidGl0bGUtZmlsdGVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzdWJ0aXRsZS1maWx0ZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcIiB1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcIiBib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIgMzNweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIgI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgXG4gICAgICBkM191cGRhdGVhYmxlKHN1YnRpdGxlLFwic3Bhbi5maXJzdFwiLFwic3BhblwiKVxuICAgICAgICAudGV4dChcIlVzZXJzIG1hdGNoaW5nIFwiIClcbiAgICAgICAgLmNsYXNzZWQoXCJmaXJzdFwiLHRydWUpXG4gICAgXG4gICAgICB2YXIgZmlsdGVyX3R5cGUgID0gZDNfdXBkYXRlYWJsZShzdWJ0aXRsZSxcInNwYW4ubWlkZGxlXCIsXCJzcGFuXCIpXG4gICAgICAgIC5jbGFzc2VkKFwibWlkZGxlXCIsdHJ1ZSlcbiAgICBcbiAgICAgIHNlbGVjdChmaWx0ZXJfdHlwZSlcbiAgICAgICAgLm9wdGlvbnModGhpcy5sb2dpYygpKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHRoaXMubG9naWMoKS5tYXAoZnVuY3Rpb24oeSkgeyBcbiAgICAgICAgICAgIHkuc2VsZWN0ZWQgPSAoeS5rZXkgPT0geC5rZXkpXG4gICAgICAgICAgfSlcbiAgICAgICAgICB0aGlzLm9uKFwibG9naWMuY2hhbmdlXCIpKHRoaXMubG9naWMoKSlcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAuZHJhdygpXG4gICAgICBcbiAgICAgIGQzX3VwZGF0ZWFibGUoc3VidGl0bGUsXCJzcGFuLmxhc3RcIixcInNwYW5cIilcbiAgICAgICAgLnRleHQoXCIgb2YgdGhlIGZvbGxvd2luZzpcIilcbiAgICAgICAgLmNsYXNzZWQoXCJsYXN0XCIsdHJ1ZSlcblxuXG4gICAgICAvLyAtLS0tLS0tLSBDQVRFR09SSUVTIC0tLS0tLS0tLSAvL1xuXG4gICAgICB2YXIgY2F0ZWdvcmllcyA9IHRoaXMuY2F0ZWdvcmllcygpXG4gICAgICB2YXIgZmlsdGVyX2NoYW5nZSA9IHRoaXMub24oXCJmaWx0ZXIuY2hhbmdlXCIpLmJpbmQodGhpcylcblxuICAgICAgZnVuY3Rpb24gc2VsZWN0aXplSW5wdXQoZmlsdGVyLHZhbHVlKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAgIC5wcm9wZXJ0eShcInZhbHVlXCIsdmFsdWUudmFsdWUpXG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciBkZXN0cm95ID0gZDMuc2VsZWN0KHRoaXMpLm9uKFwiZGVzdHJveVwiKVxuICAgICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICAgIH0pXG5cblxuICAgICAgICB2YXIgcyA9ICQoc2VsZWN0Lm5vZGUoKSkuc2VsZWN0aXplKHtcbiAgICAgICAgICBwZXJzaXN0OiBmYWxzZSxcbiAgICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSAodmFsdWUudmFsdWUgPyB2YWx1ZS52YWx1ZSArIFwiLFwiIDogXCJcIikgKyB4XG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uRGVsZXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdmFsdWUudmFsdWUuc3BsaXQoXCIsXCIpLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6ICE9IHhbMF19KS5qb2luKFwiLFwiKVxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHZhbHVlOiB4LCB0ZXh0OiB4XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAub24oXCJkZXN0cm95XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzWzBdLnNlbGVjdGl6ZS5kZXN0cm95KClcbiAgICAgICAgICB9KVxuXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHNlbGVjdGl6ZVNlbGVjdChmaWx0ZXIsdmFsdWUpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIikucmVtb3ZlKClcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFyIGRlc3Ryb3kgPSBkMy5zZWxlY3QodGhpcykub24oXCJkZXN0cm95XCIpXG4gICAgICAgICAgICBpZiAoZGVzdHJveSkgZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuXG5cbiAgICBcbiAgICAgICAgdmFyIHNlbGVjdCA9IGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwic2VsZWN0LnZhbHVlXCIsXCJzZWxlY3RcIilcbiAgICAgICAgICAuY2xhc3NlZChcInZhbHVlXCIsdHJ1ZSlcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1heC13aWR0aFwiLFwiNTAwcHhcIilcbiAgICAgICAgICAuYXR0cihcIm11bHRpcGxlXCIsdHJ1ZSlcbiAgICAgICAgICAub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHRoaXMudmFsdWVcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgfSlcbiAgICBcbiAgICAgICAgZDNfc3BsYXQoc2VsZWN0LFwib3B0aW9uXCIsXCJvcHRpb25cIixjYXRlZ29yaWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgICAgLmF0dHIoXCJzZWxlY3RlZFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHZhbHVlLnZhbHVlICYmIHZhbHVlLnZhbHVlLmluZGV4T2YoeC5rZXkpID4gLTEgPyBcInNlbGVjdGVkXCIgOiB1bmRlZmluZWQgfSlcbiAgICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICAgIHZhciBzID0gJChzZWxlY3Qubm9kZSgpKS5zZWxlY3RpemUoe1xuICAgICAgICAgIHBlcnNpc3Q6IGZhbHNlLFxuICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHguam9pbihcIixcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAub24oXCJkZXN0cm95XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzWzBdLnNlbGVjdGl6ZS5kZXN0cm95KClcbiAgICAgICAgICB9KVxuXG5cblxuICAgIFxuICAgICAgfVxuICAgIFxuICAgICAgdGhpcy5fbG9naWNfZmlsdGVyID0gZmlsdGVyKHdyYXBwZXIpXG4gICAgICAgIC5maWVsZHMoT2JqZWN0LmtleXModGhpcy5fZmlsdGVyX29wdGlvbnMpKVxuICAgICAgICAub3BzKFtcbiAgICAgICAgICAgIFt7XCJrZXlcIjogXCJpcyBpbi5jYXRlZ29yeVwifSx7XCJrZXlcIjogXCJpcyBub3QgaW4uY2F0ZWdvcnlcIn1dXG4gICAgICAgICAgLCBbe1wia2V5XCI6IFwiY29udGFpbnMuc2VsZWN0aXplXCJ9LCB7XCJrZXlcIjpcImRvZXMgbm90IGNvbnRhaW4uc2VsZWN0aXplXCJ9XVxuICAgICAgICAgICwgW3tcImtleVwiOiBcImVxdWFsc1wifSwge1wia2V5XCI6XCJiZXR3ZWVuXCIsXCJpbnB1dFwiOjJ9XVxuICAgICAgICBdKVxuICAgICAgICAuZGF0YSh0aGlzLmZpbHRlcnMoKSlcbiAgICAgICAgLnJlbmRlcl9vcChcImNvbnRhaW5zLnNlbGVjdGl6ZVwiLHNlbGVjdGl6ZUlucHV0KVxuICAgICAgICAucmVuZGVyX29wKFwiZG9lcyBub3QgY29udGFpbi5zZWxlY3RpemVcIixzZWxlY3RpemVJbnB1dClcbiAgICAgICAgLnJlbmRlcl9vcChcImlzIGluLmNhdGVnb3J5XCIsc2VsZWN0aXplU2VsZWN0KVxuICAgICAgICAucmVuZGVyX29wKFwiaXMgbm90IGluLmNhdGVnb3J5XCIsc2VsZWN0aXplU2VsZWN0KVxuICAgICAgICAucmVuZGVyX29wKFwiYmV0d2VlblwiLGZ1bmN0aW9uKGZpbHRlcix2YWx1ZSkge1xuICAgICAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgIFxuICAgICAgICAgIHZhbHVlLnZhbHVlID0gdHlwZW9mKHZhbHVlLnZhbHVlKSA9PSBcIm9iamVjdFwiID8gdmFsdWUudmFsdWUgOiBbMCwyNF1cbiAgICBcbiAgICAgICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0LnZhbHVlLmxvd1wiLFwiaW5wdXRcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidmFsdWUgbG93XCIsdHJ1ZSlcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjkwcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwidmFsdWVcIiwgdmFsdWUudmFsdWVbMF0pXG4gICAgICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgdmFyIHQgPSB0aGlzXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgc2VsZi50eXBld2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWVbMF0gPSB0LnZhbHVlXG4gICAgICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgICAgfSwxMDAwKVxuICAgICAgICAgICAgfSlcbiAgICBcbiAgICAgICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcInNwYW4udmFsdWUtYW5kXCIsXCJzcGFuXCIpXG4gICAgICAgICAgICAuY2xhc3NlZChcInZhbHVlLWFuZFwiLHRydWUpXG4gICAgICAgICAgICAudGV4dChcIiBhbmQgXCIpXG4gICAgXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dC52YWx1ZS5oaWdoXCIsXCJpbnB1dFwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZSBoaWdoXCIsdHJ1ZSlcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjkwcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwidmFsdWVcIiwgdmFsdWUudmFsdWVbMV0pXG4gICAgICAgICAgICAub24oXCJrZXl1cFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgdmFyIHQgPSB0aGlzXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgc2VsZi50eXBld2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWVbMV0gPSB0LnZhbHVlXG4gICAgICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgICAgfSwxMDAwKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKFwidXBkYXRlXCIsZnVuY3Rpb24oZmlsdGVycyl7XG4gICAgICAgICAgZmlsdGVyX2NoYW5nZShmaWx0ZXJzKVxuICAgICAgICB9KVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIC8vZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5maWx0ZXItd3JhcC1zcGFjZXJcIixcImRpdlwiKVxuICAgICAgLy8gIC5jbGFzc2VkKFwiZmlsdGVyLXdyYXAtc3BhY2VyXCIsdHJ1ZSlcbiAgICAgIC8vICAuc3R5bGUoXCJoZWlnaHRcIix3cmFwcGVyLnN0eWxlKFwiaGVpZ2h0XCIpKVxuXG4gICAgICAvL3dyYXBwZXJcbiAgICAgIC8vICAuc3R5bGUoXCJ3aWR0aFwiLHRoaXMudGFyZ2V0LnN0eWxlKFwid2lkdGhcIikpXG4gICAgICAvLyAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiei1pbmRleFwiLFwiMzAwXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2YwZjRmN1wiKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuL2hlYWRlcidcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBCdXR0b25SYWRpbyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7fVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBidXR0b25fcmFkaW8odGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQnV0dG9uUmFkaW8odGFyZ2V0KVxufVxuXG5CdXR0b25SYWRpby5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbiAoKSB7XG4gIFxuICAgIHZhciBDU1NfU1RSSU5HID0gU3RyaW5nKGZ1bmN0aW9uKCkgey8qXG4gICAgICAub3B0aW9ucy12aWV3IHsgdGV4dC1hbGlnbjpyaWdodCB9XG4gICAgICAuc2hvdy1idXR0b24ge1xuICAgICAgd2lkdGg6IDE1MHB4O1xuICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xuICAgICAgbGluZS1oZWlnaHQ6IDQwcHg7XG4gICAgICBib3JkZXItcmFkaXVzOiAxNXB4O1xuICAgICAgYm9yZGVyOiAxcHggc29saWQgI2NjYztcbiAgICAgIGZvbnQtc2l6ZTogMTJweDtcbiAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG4gICAgICBmb250LXdlaWdodDogYm9sZDtcbiAgICAgIGRpc3BsYXk6aW5saW5lLWJsb2NrO1xuICAgICAgbWFyZ2luLXJpZ2h0OjE1cHg7XG4gICAgICAgIH1cbiAgICAgIC5zaG93LWJ1dHRvbjpob3ZlciB7IHRleHQtZGVjb3JhdGlvbjpub25lOyBjb2xvcjojNTU1IH1cbiAgICAgIC5zaG93LWJ1dHRvbi5zZWxlY3RlZCB7XG4gICAgICAgIGJhY2tncm91bmQ6ICNlM2ViZjA7XG4gICAgICAgIGNvbG9yOiAjNTU1O1xuICAgICAgfVxuICAgICovfSlcbiAgXG4gICAgZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QoXCJoZWFkXCIpLFwic3R5bGUjc2hvdy1jc3NcIixcInN0eWxlXCIpXG4gICAgICAuYXR0cihcImlkXCIsXCJoZWFkZXItY3NzXCIpXG4gICAgICAudGV4dChDU1NfU1RSSU5HLnJlcGxhY2UoXCJmdW5jdGlvbiAoKSB7LypcIixcIlwiKS5yZXBsYWNlKFwiKi99XCIsXCJcIikpXG4gIFxuICAgIHZhciBvcHRpb25zID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5idXR0b24tcmFkaW8tcm93XCIsXCJkaXZcIilcbiAgICAgIC5jbGFzc2VkKFwiYnV0dG9uLXJhZGlvLXJvd1wiLHRydWUpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIzNXB4XCIpXG4gIFxuICBcbiAgICB2YXIgYnV0dG9uX3JvdyA9IGQzX3VwZGF0ZWFibGUob3B0aW9ucyxcIi5vcHRpb25zLXZpZXdcIixcImRpdlwiLHRoaXMuZGF0YSgpKVxuICAgICAgLmNsYXNzZWQoXCJvcHRpb25zLXZpZXdcIix0cnVlKVxuXG4gICAgdmFyIGJvdW5kID0gdGhpcy5vbihcImNsaWNrXCIpLmJpbmQodGhpcylcbiAgXG4gICAgZDNfc3BsYXQoYnV0dG9uX3JvdyxcIi5zaG93LWJ1dHRvblwiLFwiYVwiLGlkZW50aXR5LCBrZXkpXG4gICAgICAuY2xhc3NlZChcInNob3ctYnV0dG9uXCIsdHJ1ZSlcbiAgICAgIC5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5zZWxlY3RlZCB9KVxuICAgICAgLnRleHQoa2V5KVxuICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkgeyBib3VuZCh4KSB9KVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgXG4gICAgfVxuICBcbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgYnV0dG9uX3JhZGlvIGZyb20gJy4uL2dlbmVyaWMvYnV0dG9uX3JhZGlvJ1xuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBPcHRpb25WaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gb3B0aW9uX3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgT3B0aW9uVmlldyh0YXJnZXQpXG59XG5cbk9wdGlvblZpZXcucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm9wdGlvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcblxuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIub3B0aW9uLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcIm9wdGlvbi13cmFwXCIsdHJ1ZSlcblxuICAgICAgLy9oZWFkZXIod3JhcClcbiAgICAgIC8vICAudGV4dChcIkNob29zZSBWaWV3XCIpXG4gICAgICAvLyAgLmRyYXcoKVxuXG4gICAgICBidXR0b25fcmFkaW8od3JhcClcbiAgICAgICAgLm9uKFwiY2xpY2tcIiwgdGhpcy5vbihcInNlbGVjdFwiKSApXG4gICAgICAgIC5kYXRhKHRoaXMuZGF0YSgpKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuXG4iLCJpbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQge2F1dG9TaXplIGFzIGF1dG9TaXplfSBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHtwcmVwRGF0YSBhcyBwfSBmcm9tICcuLi9oZWxwZXJzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHByZXBEYXRhKCkge1xuICByZXR1cm4gcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59O1xuXG52YXIgRVhBTVBMRV9EQVRBID0ge1xuICAgIFwia2V5XCI6IFwiQnJvd3NpbmcgYmVoYXZpb3IgYnkgdGltZVwiXG4gICwgXCJ2YWx1ZXNcIjogW1xuICAgICAgeyAgXG4gICAgICAgICAgXCJrZXlcIjogMVxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAyXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDIuMjVcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogMi41XG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDNcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzRcbiAgICAgIH1cblxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDRcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG5cblxuICBdIFxufVxuXG5leHBvcnQgZnVuY3Rpb24gVGltZVNlcmllcyh0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLl9kYXRhID0gRVhBTVBMRV9EQVRBXG4gIHRoaXMuX29uID0ge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdGltZV9zZXJpZXModGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGltZVNlcmllcyh0YXJnZXQpXG59XG5cblRpbWVTZXJpZXMucHJvdG90eXBlID0ge1xuXG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgdGl0bGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpdGxlXCIsdmFsKSB9XG4gICwgaGVpZ2h0OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cblxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHdyYXAgPSB0aGlzLl90YXJnZXRcbiAgICAgIHZhciBkZXNjID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnZlbmRvci1kb21haW5zLWJhci1kZXNjXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ2ZW5kb3ItZG9tYWlucy1iYXItZGVzY1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG4gICAgICAgIC5kYXR1bSh0aGlzLl9kYXRhKVxuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUoZGVzYyxcIi53XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ3XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG5cblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICBcbiAgICAgIFxuXG4gICAgICB3cmFwcGVyLmVhY2goZnVuY3Rpb24ocm93KXtcblxuICAgICAgICB2YXIgZGF0YSA9IHJvdy52YWx1ZXMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMua2V5IC0gcC5rZXl9KVxuICAgICAgICAgICwgY291bnQgPSBkYXRhLmxlbmd0aDtcblxuXG4gICAgICAgIHZhciBfc2l6ZXMgPSBhdXRvU2l6ZSh3cmFwcGVyLGZ1bmN0aW9uKGQpe3JldHVybiBkIC0xMH0sIGZ1bmN0aW9uKGQpe3JldHVybiBzZWxmLl9oZWlnaHQgfHwgNjAgfSksXG4gICAgICAgICAgZ3JpZFNpemUgPSBNYXRoLmZsb29yKF9zaXplcy53aWR0aCAvIDI0IC8gMyk7XG5cbiAgICAgICAgdmFyIHZhbHVlQWNjZXNzb3IgPSBmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH1cbiAgICAgICAgICAsIHZhbHVlQWNjZXNzb3IyID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZTIgfVxuICAgICAgICAgICwga2V5QWNjZXNzb3IgPSBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9XG5cbiAgICAgICAgdmFyIHN0ZXBzID0gQXJyYXkuYXBwbHkobnVsbCwgQXJyYXkoY291bnQpKS5tYXAoZnVuY3Rpb24gKF8sIGkpIHtyZXR1cm4gaSsxO30pXG5cbiAgICAgICAgdmFyIF9jb2xvcnMgPSBbXCIjZmZmZmQ5XCIsXCIjZWRmOGIxXCIsXCIjYzdlOWI0XCIsXCIjN2ZjZGJiXCIsXCIjNDFiNmM0XCIsXCIjMWQ5MWMwXCIsXCIjMjI1ZWE4XCIsXCIjMjUzNDk0XCIsXCIjMDgxZDU4XCJdXG4gICAgICAgIHZhciBjb2xvcnMgPSBfY29sb3JzXG5cbiAgICAgICAgdmFyIHggPSBkMy5zY2FsZS5vcmRpbmFsKCkucmFuZ2Uoc3RlcHMpXG4gICAgICAgICAgLCB5ID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoW19zaXplcy5oZWlnaHQsIDAgXSlcblxuXG4gICAgICAgIHZhciBjb2xvclNjYWxlID0gZDMuc2NhbGUucXVhbnRpbGUoKVxuICAgICAgICAgIC5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbiAoZCkgeyByZXR1cm4gZC5mcmVxdWVuY3k7IH0pXSlcbiAgICAgICAgICAucmFuZ2UoY29sb3JzKTtcblxuICAgICAgICB2YXIgc3ZnX3dyYXAgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCJzdmdcIixcInN2Z1wiKVxuICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgX3NpemVzLndpZHRoICsgX3NpemVzLm1hcmdpbi5sZWZ0ICsgX3NpemVzLm1hcmdpbi5yaWdodClcbiAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBfc2l6ZXMuaGVpZ2h0ICsgX3NpemVzLm1hcmdpbi50b3AgKyBfc2l6ZXMubWFyZ2luLmJvdHRvbSlcblxuICAgICAgICB2YXIgc3ZnID0gZDNfc3BsYXQoc3ZnX3dyYXAsXCJnXCIsXCJnXCIsZnVuY3Rpb24oeCkge3JldHVybiBbeC52YWx1ZXNdfSxmdW5jdGlvbihfLGkpIHtyZXR1cm4gaX0pXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBfc2l6ZXMubWFyZ2luLmxlZnQgKyBcIixcIiArIDAgKyBcIilcIilcblxuICAgICAgICB4LmRvbWFpbihbMCw3Ml0pO1xuICAgICAgICB5LmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIE1hdGguc3FydCh2YWx1ZUFjY2Vzc29yKGQpKTsgfSldKTtcblxuICAgICAgICB2YXIgYnVpbGRCYXJzID0gZnVuY3Rpb24oZGF0YSxrZXlBY2Nlc3Nvcix2YWx1ZUFjY2Vzc29yLHksYykge1xuXG4gICAgICAgICAgdmFyIGJhcnMgPSBkM19zcGxhdChzdmcsIFwiLnRpbWluZy1iYXJcIiArIGMsIFwicmVjdFwiLCBkYXRhLCBrZXlBY2Nlc3NvcilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0aW1pbmctYmFyXCIgKyBjKVxuICAgICAgICAgICBcbiAgICAgICAgICBiYXJzXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gKChrZXlBY2Nlc3NvcihkKSAtIDEpICogZ3JpZFNpemUgKTsgfSlcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZ3JpZFNpemUgLSAxKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uKGQpIHsgXG4gICAgICAgICAgICAgIHJldHVybiB5KE1hdGguc3FydCggdmFsdWVBY2Nlc3NvcihkKSApKTsgXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsXCIjYWFhXCIpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBjb2xvclNjYWxlKCBrZXlBY2Nlc3Nvcih4KSArIGMgKSB8fCBcImdyZXlcIiB9IClcbiAgICAgICAgICAgIC8vLmF0dHIoXCJzdHJva2VcIixcIndoaXRlXCIpXG4gICAgICAgICAgICAvLy5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsXCIxcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIF9zaXplcy5oZWlnaHQgLSB5KE1hdGguc3FydCggdmFsdWVBY2Nlc3NvcihkKSApKTsgfSlcbiAgICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIjFcIilcbiAgICAgICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLGZ1bmN0aW9uKHgpeyBcbiAgICAgICAgICAgICAgc2VsZi5vbihcImhvdmVyXCIpLmJpbmQodGhpcykoeClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgfVxuICAgICAgICBcblxuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLmxlbmd0aCAmJiBkYXRhWzBdLnZhbHVlMikge1xuICAgICAgICAgIHZhciAgeTIgPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbX3NpemVzLmhlaWdodCwgMCBdKVxuICAgICAgICAgIHkyLmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIE1hdGguc3FydCh2YWx1ZUFjY2Vzc29yMihkKSk7IH0pXSk7XG4gICAgICAgICAgYnVpbGRCYXJzKGRhdGEsa2V5QWNjZXNzb3IsdmFsdWVBY2Nlc3NvcjIseTIsXCItMlwiKVxuICAgICAgICB9XG5cblxuICAgICAgICBidWlsZEJhcnMoZGF0YSxrZXlBY2Nlc3Nvcix2YWx1ZUFjY2Vzc29yLHksXCJcIilcbiAgICAgIFxuICAgIFxuICAgICAgdmFyIHogPSBkMy50aW1lLnNjYWxlKClcbiAgICAgICAgLnJhbmdlKFswLCBncmlkU2l6ZSoyNCozXSlcbiAgICAgICAgLm5pY2UoZDMudGltZS5ob3VyLDI0KVxuICAgICAgICBcbiAgICBcbiAgICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKClcbiAgICAgICAgLnNjYWxlKHopXG4gICAgICAgIC50aWNrcygzKVxuICAgICAgICAudGlja0Zvcm1hdChkMy50aW1lLmZvcm1hdChcIiVJICVwXCIpKTtcbiAgICBcbiAgICAgIHN2Zy5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInggYXhpc1wiKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsXCIgKyBfc2l6ZXMuaGVpZ2h0ICsgXCIpXCIpXG4gICAgICAgICAgLmNhbGwoeEF4aXMpO1xuXG5cblxuICAgICAgICBcbiAgICAgIH0pXG5cblxuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBzaW1wbGVUaW1lc2VyaWVzKHRhcmdldCxkYXRhLHcsaCkge1xuICB2YXIgd2lkdGggPSB3IHx8IDEyMFxuICAgICwgaGVpZ2h0ID0gaCB8fCAzMFxuXG4gIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpLmRvbWFpbihkMy5yYW5nZSgwLGRhdGEubGVuZ3RoKSkucmFuZ2UoZDMucmFuZ2UoMCx3aWR0aCx3aWR0aC9kYXRhLmxlbmd0aCkpXG4gIHZhciB5ID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoWzQsaGVpZ2h0XSkuZG9tYWluKFtkMy5taW4oZGF0YSksZDMubWF4KGRhdGEpXSlcblxuICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZ1wiLFwiZ1wiLGRhdGEsZnVuY3Rpb24oeCxpKSB7IHJldHVybiAxfSlcblxuICBkM19zcGxhdCh3cmFwLFwicmVjdFwiLFwicmVjdFwiLHggPT4geCwgKHgsaSkgPT4gaSlcbiAgICAuYXR0cihcInhcIiwoeixpKSA9PiB4KGkpKVxuICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgvZGF0YS5sZW5ndGggLTEuMilcbiAgICAuYXR0cihcInlcIiwgeiA9PiBoZWlnaHQgLSB5KHopIClcbiAgICAuYXR0cihcImhlaWdodFwiLCB6ID0+IHogPyB5KHopIDogMClcblxuICByZXR1cm4gd3JhcFxuXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gc2ltcGxlQmFyKHdyYXAsdmFsdWUsc2NhbGUsY29sb3IpIHtcblxuICB2YXIgaGVpZ2h0ID0gMjBcbiAgICAsIHdpZHRoID0gd3JhcC5zdHlsZShcIndpZHRoXCIpLnJlcGxhY2UoXCJweFwiLFwiXCIpXG5cbiAgdmFyIGNhbnZhcyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcInN2Z1wiLFwic3ZnXCIsW3ZhbHVlXSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgIC5zdHlsZShcIndpZHRoXCIsd2lkdGgrXCJweFwiKVxuICAgIC5zdHlsZShcImhlaWdodFwiLGhlaWdodCtcInB4XCIpXG5cbiAgdmFyIGNoYXJ0ID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQnLCdnJyxmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICBcbiAgdmFyIGJhcnMgPSBkM19zcGxhdChjaGFydCxcIi5wb3AtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSB9KVxuICAgIC5hdHRyKFwiY2xhc3NcIixcInBvcC1iYXJcIilcbiAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtNClcbiAgICAuYXR0cih7J3gnOjAsJ3knOjB9KVxuICAgIC5zdHlsZSgnZmlsbCcsY29sb3IpXG4gICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHNjYWxlKHgpIH0pXG5cbn1cbiIsImV4cG9ydCBsZXQgYWxsYnVja2V0cyA9IFtdXG5leHBvcnQgY29uc3QgaG91cmJ1Y2tldHMgPSBkMy5yYW5nZSgwLDI0KS5tYXAoeCA9PiBTdHJpbmcoeCkubGVuZ3RoID4gMSA/IFN0cmluZyh4KSA6IFwiMFwiICsgeClcblxudmFyIG1pbnV0ZXMgPSBbMCwyMCw0MF1cbmV4cG9ydCBjb25zdCBidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkucmVkdWNlKChwLGMpID0+IHtcbiAgbWludXRlcy5tYXAoeCA9PiB7XG4gICAgcFtjICsgXCI6XCIgKyB4XSA9IDBcbiAgfSlcbiAgYWxsYnVja2V0cyA9IGFsbGJ1Y2tldHMuY29uY2F0KG1pbnV0ZXMubWFwKHogPT4gYyArIFwiOlwiICsgeikpXG4gIHJldHVybiBwXG59LHt9KVxuXG5cbmV4cG9ydCBjb25zdCBTVE9QV09SRFMgPSBbXCJ0aGF0XCIsXCJ0aGlzXCIsXCJ3aGF0XCIsXCJiZXN0XCIsXCJtb3N0XCIsXCJmcm9tXCIsXCJ5b3VyXCIsXCJoYXZlXCIsXCJmaXJzdFwiLFwid2lsbFwiLFwidGhhblwiLFwic2F5c1wiLFwibGlrZVwiLFwiaW50b1wiLFwiYWZ0ZXJcIixcIndpdGhcIl1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXQsIGQzX2NsYXNzLCBub29wLCBpZGVudGl0eSwga2V5fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuaW1wb3J0IHtTVE9QV09SRFMsIGhvdXJidWNrZXRzLCBidWNrZXRzfSBmcm9tICcuLi9jb25zdGFudHMnXG5cbmV4cG9ydCBmdW5jdGlvbiBEb21haW5FeHBhbmRlZCh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7fVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5mdW5jdGlvbiBkb21haW5fZXhwYW5kZWQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRG9tYWluRXhwYW5kZWQodGFyZ2V0KVxufVxuXG5cbkRvbWFpbkV4cGFuZGVkLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbClcbiAgICB9XG4gICwgcmF3OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmF3XCIsdmFsKVxuICAgIH1cbiAgLCB1cmxzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidXJsc1wiLHZhbClcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuX3Jhd1xuICAgICAgdmFyIGQgPSB7IGRvbWFpbjogZGF0YVswXS5kb21haW4gfVxuXG5cbiAgICAgIHZhciBhcnRpY2xlcyA9IGRhdGEucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgcFtjLnVybF0gPSBwW2MudXJsXSB8fCBPYmplY3QuYXNzaWduKHt9LGJ1Y2tldHMpXG4gICAgICAgIHBbYy51cmxdW2MuaG91cl0gPSAocFtjLnVybF1bYy5ob3VyXSB8fCAwKSArIGMuY291bnRcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0se30pXG5cblxuICAgICAgT2JqZWN0LmtleXMoYXJ0aWNsZXMpLm1hcChrID0+IHtcbiAgICAgICAgYXJ0aWNsZXNba10gPSBob3VyYnVja2V0cy5tYXAoYiA9PiBhcnRpY2xlc1trXVtiXSB8fCAwKVxuICAgICAgfSlcblxuICAgICAgdmFyIHRvX2RyYXcgPSBkMy5lbnRyaWVzKGFydGljbGVzKVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHguZG9tYWluID0gZC5kb21haW5cbiAgICAgICAgICB4LnVybCA9IHgua2V5XG4gICAgICAgICAgeC50b3RhbCA9IGQzLnN1bSh4LnZhbHVlKVxuICAgICAgICAgIHJldHVybiB4XG4gICAgICAgIH0pXG5cbiAgICAgIHZhciBrd190b19kcmF3ID0gdG9fZHJhd1xuICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKHAsYyl7XG4gICAgICAgICAgYy5rZXkudG9Mb3dlckNhc2UoKS5zcGxpdChkLmRvbWFpbilbMV0uc3BsaXQoXCIvXCIpLnJldmVyc2UoKVswXS5yZXBsYWNlKFwiX1wiLFwiLVwiKS5zcGxpdChcIi1cIikubWFwKHggPT4ge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IFNUT1BXT1JEU1xuICAgICAgICAgICAgaWYgKHgubWF0Y2goL1xcZCsvZykgPT0gbnVsbCAmJiB2YWx1ZXMuaW5kZXhPZih4KSA9PSAtMSAmJiB4LmluZGV4T2YoXCIsXCIpID09IC0xICYmIHguaW5kZXhPZihcIj9cIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiLlwiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCI6XCIpID09IC0xICYmIHBhcnNlSW50KHgpICE9IHggJiYgeC5sZW5ndGggPiAzKSB7XG4gICAgICAgICAgICAgIHBbeF0gPSBwW3hdIHx8IHt9XG4gICAgICAgICAgICAgIE9iamVjdC5rZXlzKGMudmFsdWUpLm1hcChxID0+IHtcbiAgICAgICAgICAgICAgICBwW3hdW3FdID0gKHBbeF1bcV0gfHwgMCkgKyAoYy52YWx1ZVtxXSB8fCAwKVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICByZXR1cm4gcFxuICAgICAgICB9LHt9KVxuXG4gICAgICBrd190b19kcmF3ID0gZDMuZW50cmllcyhrd190b19kcmF3KVxuICAgICAgICAubWFwKHggPT4ge1xuICAgICAgICAgIHgudmFsdWVzID0gT2JqZWN0LmtleXMoeC52YWx1ZSkubWFwKHogPT4geC52YWx1ZVt6XSB8fCAwKVxuICAgICAgICAgIHgudG90YWwgPSBkMy5zdW0oeC52YWx1ZXMpXG4gICAgICAgICAgcmV0dXJuIHhcbiAgICAgICAgfSlcblxuXG5cbiAgICAgIHZhciB0ZCA9IHRoaXMudGFyZ2V0XG5cbiAgICAgIGQzX2NsYXNzKHRkLFwiYWN0aW9uLWhlYWRlclwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnRleHQoXCJFeHBsb3JlIGFuZCBSZWZpbmVcIilcblxuICAgICAgdmFyIHRpdGxlX3JvdyA9IGQzX2NsYXNzKHRkLFwidGl0bGUtcm93XCIpXG4gICAgICB2YXIgZXhwYW5zaW9uX3JvdyA9IGQzX2NsYXNzKHRkLFwiZXhwYW5zaW9uLXJvd1wiKVxuXG5cblxuICAgICAgdmFyIGV1aCA9IGQzX2NsYXNzKHRpdGxlX3JvdyxcImV4cGFuc2lvbi11cmxzLXRpdGxlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgIGQzX2NsYXNzKGV1aCxcInRpdGxlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAudGV4dChcIlVSTFwiKVxuXG4gICAgICBkM19jbGFzcyhldWgsXCJ2aWV3XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAudGV4dChcIlZpZXdzXCIpXG5cbiAgICAgICAgICB2YXIgc3ZnX2xlZ2VuZCA9IGQzX2NsYXNzKGV1aCxcImxlZ2VuZFwiLFwic3ZnXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQ0cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcInRleHQub25lXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjBcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJzdGFydFwiKVxuICAgICAgICAgICAgLnRleHQoXCIxMiBhbVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwidGV4dC50d29cIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLFwiNzJcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC50ZXh0KFwiMTIgcG1cIilcblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcInRleHQudGhyZWVcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLFwiMTQ0XCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAgICAgICAudGV4dChcIjEyIGFtXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJsaW5lLm9uZVwiLFwibGluZVwiKVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwib25lXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMjUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNSlcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCAwKVxuXG5kM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJsaW5lLnR3b1wiLFwibGluZVwiKVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidHdvXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMjUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNSlcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDcyKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNzIpXG5cblxuZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS50aHJlZVwiLFwibGluZVwiKVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidGhyZWVcIix0cnVlKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCAyNSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIDM1KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgMTQ0KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgMTQ0KVxuXG5cblxuICAgICAgdmFyIGVraCA9IGQzX2NsYXNzKHRpdGxlX3JvdyxcImV4cGFuc2lvbi1rd3MtdGl0bGVcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuICAgICAgZDNfY2xhc3MoZWtoLFwidGl0bGVcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI2NXB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChcIktleXdvcmRzXCIpXG5cbiAgICAgIGQzX2NsYXNzKGVraCxcInZpZXdcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChcIlZpZXdzXCIpXG5cbiAgICAgICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhla2gsXCJsZWdlbmRcIixcInN2Z1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0NHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0Lm9uZVwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsXCIwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwic3RhcnRcIilcbiAgICAgICAgICAgIC50ZXh0KFwiMTIgYW1cIilcblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcInRleHQudHdvXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjcyXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIjEyIHBtXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0LnRocmVlXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjE0NFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsXCIyMFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgICAgICAgLnRleHQoXCIxMiBhbVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS5vbmVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm9uZVwiLHRydWUpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDI1KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgMzUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCAwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgMClcblxuICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS50d29cIixcImxpbmVcIilcbiAgICAgICAgICAgLmNsYXNzZWQoXCJ0d29cIix0cnVlKVxuICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgIC5hdHRyKFwieTFcIiwgMjUpXG4gICAgICAgICAgIC5hdHRyKFwieTJcIiwgMzUpXG4gICAgICAgICAgIC5hdHRyKFwieDFcIiwgNzIpXG4gICAgICAgICAgIC5hdHRyKFwieDJcIiwgNzIpXG5cblxuICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS50aHJlZVwiLFwibGluZVwiKVxuICAgICAgICAgICAuY2xhc3NlZChcInRocmVlXCIsdHJ1ZSlcbiAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAuYXR0cihcInkxXCIsIDI1KVxuICAgICAgICAgICAuYXR0cihcInkyXCIsIDM1KVxuICAgICAgICAgICAuYXR0cihcIngxXCIsIDE0NClcbiAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCAxNDQpXG5cblxuXG5cblxuXG4gICAgICB2YXIgZXhwYW5zaW9uID0gZDNfY2xhc3MoZXhwYW5zaW9uX3JvdyxcImV4cGFuc2lvbi11cmxzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwic2Nyb2xsYm94XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cbiAgICAgICAgLnN0eWxlKFwibWF4LWhlaWdodFwiLFwiMjUwcHhcIilcbiAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcInNjcm9sbFwiKVxuXG4gICAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG4gICAgICB2YXIgdXJsX3JvdyA9IGQzX3NwbGF0KGV4cGFuc2lvbixcIi51cmwtcm93XCIsXCJkaXZcIix0b19kcmF3LnNsaWNlKDAsNTAwKSxmdW5jdGlvbih4KSB7IHJldHVybiB4LnVybCB9KVxuICAgICAgICAuY2xhc3NlZChcInVybC1yb3dcIix0cnVlKVxuXG4gICAgICB2YXIgdXJsX25hbWUgPSBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubmFtZVwiLFwiZGl2XCIpLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI2MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm92ZXJmbG93XCIsXCJoaWRkZW5cIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG5cbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodXJsX25hbWUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgfSlcblxuICAgICAgZDNfY2xhc3ModXJsX25hbWUsXCJ1cmxcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtb3ZlcmZsb3dcIixcImVsbGlwc2lzXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMDVweFwiKVxuICAgICAgICAudGV4dCh4ID0+IHtcbiAgICAgICAgICByZXR1cm4geC51cmwuc3BsaXQoZC5kb21haW4pWzFdIHx8IHgudXJsXG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKFwiaHJlZlwiLCB4ID0+IHgudXJsIClcbiAgICAgICAgLmF0dHIoXCJ0YXJnZXRcIiwgXCJfYmxhbmtcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm51bWJlclwiLFwiZGl2XCIpLmNsYXNzZWQoXCJudW1iZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxM3B4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b3RhbCB9KVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5wbG90XCIsXCJzdmdcIikuY2xhc3NlZChcInBsb3RcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQ0cHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgdmFyIHZhbHVlcyA9IHgudmFsdWVcbiAgICAgICAgICBzaW1wbGVUaW1lc2VyaWVzKGR0aGlzLHZhbHVlcywxNDQsMjApXG5cbiAgICAgICAgfSlcblxuXG4gICAgICB2YXIgZXhwYW5zaW9uID0gZDNfY2xhc3MoZXhwYW5zaW9uX3JvdyxcImV4cGFuc2lvbi1rd3NcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzY3JvbGxib3hcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cblxuICAgICAgICAuc3R5bGUoXCJtYXgtaGVpZ2h0XCIsXCIyNTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwic2Nyb2xsXCIpXG5cbiAgICAgIGV4cGFuc2lvbi5odG1sKFwiXCIpXG5cblxuICAgICAgdmFyIHVybF9yb3cgPSBkM19zcGxhdChleHBhbnNpb24sXCIudXJsLXJvd1wiLFwiZGl2XCIsa3dfdG9fZHJhdy5zbGljZSgwLDUwMCksZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ1cmwtcm93XCIsdHJ1ZSlcblxuICAgICAgdmFyIHVybF9uYW1lID0gZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm5hbWVcIixcImRpdlwiKS5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwiaGlkZGVuXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKHVybF9uYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAuYXR0cihcInR5cGVcIixcImNoZWNrYm94XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgIH0pXG5cbiAgICAgIGQzX2NsYXNzKHVybF9uYW1lLFwidXJsXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LW92ZXJmbG93XCIsXCJlbGxpcHNpc1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjA1cHhcIilcbiAgICAgICAgLnRleHQoeCA9PiB7XG4gICAgICAgICAgcmV0dXJuIHgua2V5XG4gICAgICAgIH0pXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5udW1iZXJcIixcImRpdlwiKS5jbGFzc2VkKFwibnVtYmVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTNweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG90YWwgfSlcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIucGxvdFwiLFwic3ZnXCIpLmNsYXNzZWQoXCJwbG90XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0NHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAgIHZhciB2YWx1ZXMgPSB4LnZhbHVlc1xuICAgICAgICAgIHNpbXBsZVRpbWVzZXJpZXMoZHRoaXMsdmFsdWVzLDE0NCwyMClcblxuICAgICAgICB9KVxuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuZXhwb3J0IGRlZmF1bHQgZG9tYWluX2V4cGFuZGVkO1xuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gRG9tYWluQnVsbGV0KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRvbWFpbl9idWxsZXQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRG9tYWluQnVsbGV0KHRhcmdldClcbn1cblxuRG9tYWluQnVsbGV0LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG1heDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm1heFwiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgd2lkdGggPSAodGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKS5yZXBsYWNlKFwicHhcIixcIlwiKSB8fCB0aGlzLm9mZnNldFdpZHRoKSAtIDUwXG4gICAgICAgICwgaGVpZ2h0ID0gMjg7XG5cbiAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgLnJhbmdlKFswLCB3aWR0aF0pXG4gICAgICAgIC5kb21haW4oWzAsIHRoaXMubWF4KCldKVxuXG4gICAgICBpZiAodGhpcy50YXJnZXQudGV4dCgpKSB0aGlzLnRhcmdldC50ZXh0KFwiXCIpXG5cbiAgICAgIHZhciBidWxsZXQgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmJ1bGxldFwiLFwiZGl2XCIsdGhpcy5kYXRhKCksZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgICAuY2xhc3NlZChcImJ1bGxldFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjNweFwiKVxuXG4gICAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZShidWxsZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsd2lkdGgpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsaGVpZ2h0KVxuICBcbiAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTFcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItMVwiLHRydWUpXG4gICAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24oZCkge3JldHVybiB4KGQucG9wX3BlcmNlbnQpIH0pXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsXCIjODg4XCIpXG4gIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTJcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItMlwiLHRydWUpXG4gICAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAgIC5hdHRyKFwieVwiLGhlaWdodC80KVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uKGQpIHtyZXR1cm4geChkLnNhbXBsZV9wZXJjZW50X25vcm0pIH0pXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodC8yKVxuICAgICAgICAuYXR0cihcImZpbGxcIixcInJnYig4LCAyOSwgODgpXCIpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCAqIGFzIHRpbWVzZXJpZXMgZnJvbSAnLi4vZ2VuZXJpYy90aW1lc2VyaWVzJ1xuXG5pbXBvcnQgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQgZG9tYWluX2V4cGFuZGVkIGZyb20gJy4vZG9tYWluX2V4cGFuZGVkJ1xuaW1wb3J0IGRvbWFpbl9idWxsZXQgZnJvbSAnLi9kb21haW5fYnVsbGV0J1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZnVuY3Rpb24gRG9tYWluVmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRvbWFpbl92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IERvbWFpblZpZXcodGFyZ2V0KVxufVxuXG5Eb21haW5WaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICB2YXIgX2V4cGxvcmUgPSB0aGlzLnRhcmdldFxuICAgICAgICAsIHRhYnMgPSB0aGlzLm9wdGlvbnMoKVxuICAgICAgICAsIGRhdGEgPSB0aGlzLmRhdGEoKVxuICAgICAgICAsIGZpbHRlcmVkID0gdGFicy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnNlbGVjdGVkfSlcbiAgICAgICAgLCBzZWxlY3RlZCA9IGZpbHRlcmVkLmxlbmd0aCA/IGZpbHRlcmVkWzBdIDogdGFic1swXVxuXG4gICAgICBoZWFkZXIoX2V4cGxvcmUpXG4gICAgICAgIC50ZXh0KHNlbGVjdGVkLmtleSApXG4gICAgICAgIC5vcHRpb25zKHRhYnMpXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KSB7IHRoaXMub24oXCJzZWxlY3RcIikoeCkgfS5iaW5kKHRoaXMpKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIFxuXG4gICAgICBfZXhwbG9yZS5zZWxlY3RBbGwoXCIudmVuZG9yLWRvbWFpbnMtYmFyLWRlc2NcIikucmVtb3ZlKClcbiAgICAgIF9leHBsb3JlLmRhdHVtKGRhdGEpXG5cbiAgICAgIHZhciB0ID0gdGFibGUoX2V4cGxvcmUpXG4gICAgICAgIC5kYXRhKHNlbGVjdGVkKVxuXG5cblxuICAgICAgdmFyIHNhbXBfbWF4ID0gZDMubWF4KHNlbGVjdGVkLnZhbHVlcyxmdW5jdGlvbih4KXtyZXR1cm4geC5zYW1wbGVfcGVyY2VudF9ub3JtfSlcbiAgICAgICAgLCBwb3BfbWF4ID0gZDMubWF4KHNlbGVjdGVkLnZhbHVlcyxmdW5jdGlvbih4KXtyZXR1cm4geC5wb3BfcGVyY2VudH0pXG4gICAgICAgICwgbWF4ID0gTWF0aC5tYXgoc2FtcF9tYXgscG9wX21heCk7XG5cbiAgICAgIHQuaGVhZGVycyhbXG4gICAgICAgICAgICB7a2V5Olwia2V5XCIsdmFsdWU6XCJEb21haW5cIixsb2NrZWQ6dHJ1ZSx3aWR0aDpcIjEwMHB4XCJ9XG4gICAgICAgICAgLCB7a2V5Olwic2FtcGxlX3BlcmNlbnRcIix2YWx1ZTpcIlNlZ21lbnRcIixzZWxlY3RlZDpmYWxzZX1cbiAgICAgICAgICAsIHtrZXk6XCJyZWFsX3BvcF9wZXJjZW50XCIsdmFsdWU6XCJCYXNlbGluZVwiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAgICwge2tleTpcInJhdGlvXCIsdmFsdWU6XCJSYXRpb1wiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAgICwge2tleTpcImltcG9ydGFuY2VcIix2YWx1ZTpcIkltcG9ydGFuY2VcIixzZWxlY3RlZDpmYWxzZX1cbiAgICAgICAgICAsIHtrZXk6XCJ2YWx1ZVwiLHZhbHVlOlwiU2VnbWVudCB2ZXJzdXMgQmFzZWxpbmVcIixsb2NrZWQ6dHJ1ZX1cbiAgICAgICAgXSlcbiAgICAgICAgLnNvcnQoXCJpbXBvcnRhbmNlXCIpXG4gICAgICAgIC5vcHRpb25fdGV4dChcIiYjNjUyOTE7XCIpXG4gICAgICAgIC5vbihcImV4cGFuZFwiLGZ1bmN0aW9uKGQpIHtcblxuICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImbmRhc2g7XCIpXG4gICAgICAgICAgaWYgKHRoaXMubmV4dFNpYmxpbmcgJiYgZDMuc2VsZWN0KHRoaXMubmV4dFNpYmxpbmcpLmNsYXNzZWQoXCJleHBhbmRlZFwiKSA9PSB0cnVlKSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKFwidGQub3B0aW9uLWhlYWRlclwiKS5odG1sKFwiJiM2NTI5MTtcIilcbiAgICAgICAgICAgIHJldHVybiBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zZWxlY3RBbGwoXCIuZXhwYW5kZWRcIikucmVtb3ZlKClcbiAgICAgICAgICB2YXIgdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG4gICAgICAgICAgdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0LCB0aGlzLm5leHRTaWJsaW5nKTsgIFxuXG4gICAgICAgICAgdmFyIHRyID0gZDMuc2VsZWN0KHQpLmNsYXNzZWQoXCJleHBhbmRlZFwiLHRydWUpLmRhdHVtKHt9KVxuICAgICAgICAgIHZhciB0ZCA9IGQzX3VwZGF0ZWFibGUodHIsXCJ0ZFwiLFwidGRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY29sc3BhblwiLHRoaXMuY2hpbGRyZW4ubGVuZ3RoKVxuICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2Y5ZjlmYlwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgICAgICB2YXIgZGQgPSB0aGlzLnBhcmVudEVsZW1lbnQuX19kYXRhX18uZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmRvbWFpbiA9PSBkLmtleX0pXG4gICAgICAgICAgdmFyIHJvbGxlZCA9IHRpbWVzZXJpZXMucHJlcERhdGEoZGQpXG4gICAgICAgICAgXG4gICAgICAgICAgZG9tYWluX2V4cGFuZGVkKHRkKVxuICAgICAgICAgICAgLnJhdyhkZClcbiAgICAgICAgICAgIC5kYXRhKHJvbGxlZClcbiAgICAgICAgICAgIC51cmxzKGQudXJscylcbiAgICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgfSlcbiAgICAgICAgLmhpZGRlbl9maWVsZHMoW1widXJsc1wiLFwicGVyY2VudF91bmlxdWVcIixcInNhbXBsZV9wZXJjZW50X25vcm1cIixcInBvcF9wZXJjZW50XCIsXCJ0Zl9pZGZcIixcInBhcmVudF9jYXRlZ29yeV9uYW1lXCJdKVxuICAgICAgICAucmVuZGVyKFwicmF0aW9cIixmdW5jdGlvbihkKSB7XG4gICAgICAgICAgdGhpcy5pbm5lclRleHQgPSBNYXRoLnRydW5jKHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXy5yYXRpbyoxMDApLzEwMCArIFwieFwiXG4gICAgICAgIH0pXG4gICAgICAgIC5yZW5kZXIoXCJ2YWx1ZVwiLGZ1bmN0aW9uKGQpIHtcblxuICAgICAgICAgIGRvbWFpbl9idWxsZXQoZDMuc2VsZWN0KHRoaXMpKVxuICAgICAgICAgICAgLm1heChtYXgpXG4gICAgICAgICAgICAuZGF0YSh0aGlzLnBhcmVudE5vZGUuX19kYXRhX18pXG4gICAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICB0LmRyYXcoKVxuICAgICBcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXMsIHNpbXBsZUJhcn0gZnJvbSAnY2hhcnQnXG5cbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIFNlZ21lbnRWaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzZWdtZW50X3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU2VnbWVudFZpZXcodGFyZ2V0KVxufVxuXG5TZWdtZW50Vmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBzZWdtZW50czogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlZ21lbnRzXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5zZWdtZW50LXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNlZ21lbnQtd3JhcFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIix0aGlzLnRhcmdldC5zdHlsZShcIndpZHRoXCIpKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcbiAgICAgICAgLnN0eWxlKFwiei1pbmRleFwiLFwiMzAwXCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmMGY0ZjdcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLnNlZ21lbnQtd3JhcC1zcGFjZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNlZ21lbnQtd3JhcC1zcGFjZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIix3cmFwLnN0eWxlKFwiaGVpZ2h0XCIpKVxuXG5cbiAgICAgIGhlYWRlcih3cmFwKVxuICAgICAgICAuYnV0dG9ucyhbXG4gICAgICAgICAgICB7Y2xhc3M6IFwic2F2ZWQtc2VhcmNoXCIsIGljb246IFwiZmEtZm9sZGVyLW9wZW4tbyBmYVwiLCB0ZXh0OiBcIk9wZW4gU2F2ZWRcIn1cbiAgICAgICAgICAsIHtjbGFzczogXCJuZXctc2F2ZWQtc2VhcmNoXCIsIGljb246IFwiZmEtYm9va21hcmsgZmFcIiwgdGV4dDogXCJTYXZlXCJ9XG4gICAgICAgICAgLCB7Y2xhc3M6IFwiY3JlYXRlXCIsIGljb246IFwiZmEtcGx1cy1jaXJjbGUgZmFcIiwgdGV4dDogXCJOZXcgU2VnbWVudFwifVxuICAgICAgICAgICwge2NsYXNzOiBcImxvZ291dFwiLCBpY29uOiBcImZhLXNpZ24tb3V0IGZhXCIsIHRleHQ6IFwiTG9nb3V0XCJ9XG4gICAgICAgIF0pXG4gICAgICAgIC5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiLCB0aGlzLm9uKFwic2F2ZWQtc2VhcmNoLmNsaWNrXCIpKVxuICAgICAgICAub24oXCJsb2dvdXQuY2xpY2tcIiwgZnVuY3Rpb24oKSB7IHdpbmRvdy5sb2NhdGlvbiA9IFwiL2xvZ291dFwiIH0pXG4gICAgICAgIC5vbihcImNyZWF0ZS5jbGlja1wiLCBmdW5jdGlvbigpIHsgd2luZG93LmxvY2F0aW9uID0gXCIvc2VnbWVudHNcIiB9KVxuICAgICAgICAub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIsIHRoaXMub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIpKVxuICAgICAgICAudGV4dChcIlNlZ21lbnRcIikuZHJhdygpICAgICAgXG5cblxuICAgICAgd3JhcC5zZWxlY3RBbGwoXCIuaGVhZGVyLWJvZHlcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwhdGhpcy5faXNfbG9hZGluZylcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIi00MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIm5vbmVcIilcbiAgICAgICAgLmh0bWwoXCI8aW1nIHNyYz0nL3N0YXRpYy9pbWcvZ2VuZXJhbC9sb2dvLXNtYWxsLmdpZicgc3R5bGU9J2hlaWdodDoxNXB4Jy8+IGxvYWRpbmcuLi5cIilcblxuXG4gICAgICBpZiAodGhpcy5fZGF0YSA9PSBmYWxzZSkgcmV0dXJuXG5cbiAgICAgIHZhciBib2R5ID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmJvZHlcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJvZHlcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJjbGVhclwiLFwiYm90aFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcImZsZXgtZGlyZWN0aW9uXCIsXCJjb2x1bW5cIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMzBweFwiKVxuICAgICAgICBcblxuICAgICAgdmFyIHJvdzEgPSBkM191cGRhdGVhYmxlKGJvZHksXCIucm93LTFcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInJvdy0xXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLDEpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleC1kaXJlY3Rpb25cIixcInJvd1wiKVxuXG4gICAgICB2YXIgcm93MiA9IGQzX3VwZGF0ZWFibGUoYm9keSxcIi5yb3ctMlwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicm93LTJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsMSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4LWRpcmVjdGlvblwiLFwicm93XCIpXG5cblxuICAgICAgdmFyIGlubmVyID0gZDNfdXBkYXRlYWJsZShyb3cxLFwiLmFjdGlvbi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgYWN0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICB2YXIgaW5uZXJfZGVzYyA9IGQzX3VwZGF0ZWFibGUocm93MSxcIi5hY3Rpb24uaW5uZXItZGVzY1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXItZGVzYyBhY3Rpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMHB4XCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcixcImgzXCIsXCJoM1wiKVxuICAgICAgICAudGV4dChcIkNob29zZSBTZWdtZW50XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyLFwiZGl2LmNvbG9yXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb2xvclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiMwODFkNThcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG5cblxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgc2VsZWN0KGlubmVyKVxuICAgICAgICAub3B0aW9ucyh0aGlzLl9zZWdtZW50cylcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGYub24oXCJjaGFuZ2VcIikuYmluZCh0aGlzKSh4KVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fYWN0aW9uLnZhbHVlIHx8IDApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgXG5cblxuXG4gICAgICB2YXIgY2FsID0gZDNfdXBkYXRlYWJsZShpbm5lcixcImEuZmEtY2FsZW5kYXJcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgICAgLmNsYXNzZWQoXCJmYSBmYS1jYWxlbmRhclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjYWxzZWwubm9kZSgpXG4gICAgICAgIH0pXG5cbiAgICAgIFxuICAgICAgdmFyIGNhbHNlbCA9IHNlbGVjdChjYWwpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIlRvZGF5XCIsXCJ2YWx1ZVwiOjB9LHtcImtleVwiOlwiWWVzdGVyZGF5XCIsXCJ2YWx1ZVwiOjF9LHtcImtleVwiOlwiNyBkYXlzIGFnb1wiLFwidmFsdWVcIjo3fV0pXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIpLmJpbmQodGhpcykoeC52YWx1ZSlcbiAgICAgICAgfSlcbiAgICAgICAgLnNlbGVjdGVkKHRoaXMuX2FjdGlvbl9kYXRlIHx8IDApXG4gICAgICAgIC5kcmF3KClcbiAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIuMDFcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwibm9uZVwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIm5vbmVcIilcblxuICAgICAgXG5cbiAgICAgIHZhciBpbm5lcjIgPSBkM191cGRhdGVhYmxlKHJvdzIsXCIuY29tcGFyaXNvbi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgY29tcGFyaXNvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMHB4XCIpXG5cbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuXG4gICAgICB2YXIgaW5uZXJfZGVzYzIgPSBkM191cGRhdGVhYmxlKHJvdzIsXCIuY29tcGFyaXNvbi1kZXNjLmlubmVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJpbm5lciBjb21wYXJpc29uLWRlc2NcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcblxuICAgICAgLy9kM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCJoM1wiLFwiaDNcIilcbiAgICAgIC8vICAudGV4dChcIihGaWx0ZXJzIGFwcGxpZWQgdG8gdGhpcyBzZWdtZW50KVwiKVxuICAgICAgLy8gIC5zdHlsZShcIm1hcmdpblwiLFwiMTBweFwiKVxuICAgICAgLy8gIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC8vICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCIuYmFyLXdyYXAtdGl0bGVcIixcImgzXCIpLmNsYXNzZWQoXCJiYXItd3JhcC10aXRsZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG5cblxuICAgICAgICAudGV4dChcInZpZXdzXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCIuYmFyLXdyYXAtdGl0bGVcIixcImgzXCIpLmNsYXNzZWQoXCJiYXItd3JhcC10aXRsZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG5cblxuXG4gICAgICAgIC50ZXh0KFwidmlld3NcIilcblxuXG5cbiAgICAgIHZhciBiYXJfc2FtcCA9IGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcImRpdi5iYXItd3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiYmFyLXdyYXBcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiOHB4XCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcIi5iYXItd3JhcC1zcGFjZVwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1zcGFjZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnRleHQoZDMuZm9ybWF0KFwiLFwiKSh0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSkpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiLmJhci13cmFwLW9wdFwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1vcHRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLy8udGV4dChcImFwcGx5IGZpbHRlcnM/XCIpXG5cblxuXG4gICAgICB2YXIgeHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgLmRvbWFpbihbMCxNYXRoLm1heCh0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSwgdGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uKV0pXG4gICAgICAgIC5yYW5nZShbMCxiYXJfc2FtcC5zdHlsZShcIndpZHRoXCIpXSlcblxuXG4gICAgICB2YXIgYmFyX3BvcCA9IGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCJkaXYuYmFyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJhci13cmFwXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjhweFwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCIuYmFyLXdyYXAtc3BhY2VcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtc3BhY2VcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KGQzLmZvcm1hdChcIixcIikodGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uKSlcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLW9wdFwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1vcHRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG4gICAgICAgIC5odG1sKFwiYXBwbHkgZmlsdGVycz8gPGlucHV0IHR5cGU9J2NoZWNrYm94Jz48L2lucHV0PlwiKVxuXG5cblxuICAgICAgc2ltcGxlQmFyKGJhcl9zYW1wLHRoaXMuX2RhdGEudmlld3Muc2FtcGxlLHhzY2FsZSxcIiMwODFkNThcIilcbiAgICAgIHNpbXBsZUJhcihiYXJfcG9wLHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbix4c2NhbGUsXCJncmV5XCIpXG5cblxuXG5cblxuXG5cblxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcjIsXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnRleHQoXCJDb21wYXJlIEFnYWluc3RcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZTNlYmYwXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIyLFwiZGl2LmNvbG9yXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb2xvclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcImdyZXlcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG5cblxuXG5cblxuXG5cblxuICAgICAgc2VsZWN0KGlubmVyMilcbiAgICAgICAgLm9wdGlvbnMoW3tcImtleVwiOlwiQ3VycmVudCBTZWdtZW50ICh3aXRob3V0IGZpbHRlcnMpXCIsXCJ2YWx1ZVwiOmZhbHNlfV0uY29uY2F0KHRoaXMuX3NlZ21lbnRzKSApXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcblxuICAgICAgICAgIHNlbGYub24oXCJjb21wYXJpc29uLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9jb21wYXJpc29uLnZhbHVlIHx8IDApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgdmFyIGNhbDIgPSBkM191cGRhdGVhYmxlKGlubmVyMixcImEuZmEtY2FsZW5kYXJcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgICAgLmNsYXNzZWQoXCJmYSBmYS1jYWxlbmRhclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjYWxzZWwyLm5vZGUoKVxuICAgICAgICB9KVxuXG4gICAgICBcbiAgICAgIHZhciBjYWxzZWwyID0gc2VsZWN0KGNhbDIpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIlRvZGF5XCIsXCJ2YWx1ZVwiOjB9LHtcImtleVwiOlwiWWVzdGVyZGF5XCIsXCJ2YWx1ZVwiOjF9LHtcImtleVwiOlwiNyBkYXlzIGFnb1wiLFwidmFsdWVcIjo3fV0pXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgudmFsdWUpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9jb21wYXJpc29uX2RhdGUgfHwgMClcbiAgICAgICAgLmRyYXcoKVxuICAgICAgICAuX3NlbGVjdFxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIi4wMVwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCJub25lXCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwibm9uZVwiKVxuXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgYWN0aW9uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25fZGF0ZVwiLHZhbClcbiAgICB9XG4gICwgYWN0aW9uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uXCIsdmFsKVxuICAgIH1cbiAgLCBjb21wYXJpc29uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uX2RhdGVcIix2YWwpXG4gICAgfVxuXG4gICwgY29tcGFyaXNvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNvbXBhcmlzb25cIix2YWwpXG4gICAgfVxuICAsIGlzX2xvYWRpbmc6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJpc19sb2FkaW5nXCIsdmFsKVxuICAgIH1cblxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuXG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBQaWUodGFyZ2V0KSB7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cblBpZS5wcm90b3R5cGUgPSB7XG4gICAgcmFkaXVzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmFkaXVzXCIsdmFsKVxuICAgIH1cbiAgLCBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICBcbiAgICB2YXIgZCA9IGQzLmVudHJpZXMoe1xuICAgICAgICBzYW1wbGU6IHRoaXMuX2RhdGEuc2FtcGxlXG4gICAgICAsIHBvcHVsYXRpb246IHRoaXMuX2RhdGEucG9wdWxhdGlvbiAtIHRoaXMuX2RhdGEuc2FtcGxlXG4gICAgfSlcbiAgICBcbiAgICB2YXIgY29sb3IgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgICAgLnJhbmdlKFtcIiM5OGFiYzVcIiwgXCIjOGE4OWE2XCIsIFwiIzdiNjg4OFwiLCBcIiM2YjQ4NmJcIiwgXCIjYTA1ZDU2XCIsIFwiI2QwNzQzY1wiLCBcIiNmZjhjMDBcIl0pO1xuICAgIFxuICAgIHZhciBhcmMgPSBkMy5zdmcuYXJjKClcbiAgICAgICAgLm91dGVyUmFkaXVzKHRoaXMuX3JhZGl1cyAtIDEwKVxuICAgICAgICAuaW5uZXJSYWRpdXMoMCk7XG4gICAgXG4gICAgdmFyIHBpZSA9IGQzLmxheW91dC5waWUoKVxuICAgICAgICAuc29ydChudWxsKVxuICAgICAgICAudmFsdWUoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSk7XG4gICAgXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKHgpe3JldHVybiAxfSlcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCA1MClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgNTIpXG4gIFxuICAgIHN2ZyA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiZ1wiLFwiZ1wiKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIDI1ICsgXCIsXCIgKyAyNiArIFwiKVwiKTtcbiAgICBcbiAgICB2YXIgZyA9IGQzX3NwbGF0KHN2ZyxcIi5hcmNcIixcImdcIixwaWUoZCksZnVuY3Rpb24oeCl7IHJldHVybiB4LmRhdGEua2V5IH0pXG4gICAgICAuY2xhc3NlZChcImFyY1wiLHRydWUpXG4gIFxuICAgIGQzX3VwZGF0ZWFibGUoZyxcInBhdGhcIixcInBhdGhcIilcbiAgICAgIC5hdHRyKFwiZFwiLCBhcmMpXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGNvbG9yKGQuZGF0YS5rZXkpIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHBpZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBQaWUodGFyZ2V0KVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkaWZmX2Jhcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEaWZmQmFyKHRhcmdldClcbn1cblxuLy8gZGF0YSBmb3JtYXQ6IFt7a2V5LCBub3JtYWxpemVkX2RpZmZ9LCAuLi4gXVxuXG5jbGFzcyBEaWZmQmFyIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICB0aGlzLl9rZXlfYWNjZXNzb3IgPSBcImtleVwiXG4gICAgdGhpcy5fdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcbiAgICB0aGlzLl9iYXJfaGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9iYXJfd2lkdGggPSAxNTBcbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGJhcl9oZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX2hlaWdodFwiLHZhbCkgfVxuICBiYXJfd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX3dpZHRoXCIsdmFsKSB9XG5cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHcgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5kaWZmLXdyYXBcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkge3JldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiZGlmZi13cmFwXCIsdHJ1ZSlcblxuICAgIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKS50ZXh0KHRoaXMuX3RpdGxlKVxuXG4gICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHcsXCIuc3ZnLXdyYXBcIixcImRpdlwiLHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmNsYXNzZWQoXCJzdmctd3JhcFwiLHRydWUpXG5cbiAgICB2YXIgayA9IHRoaXMua2V5X2FjY2Vzc29yKClcbiAgICAgICwgdiA9IHRoaXMudmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmJhcl9oZWlnaHQoKVxuICAgICAgLCBiYXJfd2lkdGggPSB0aGlzLmJhcl93aWR0aCgpXG5cbiAgICB2YXIga2V5cyA9IHRoaXMuX2RhdGEubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhba10gfSlcbiAgICAgICwgbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFt2XSB9KVxuICAgICAgLCBzYW1wbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gLXhbdl0gfSlcblxuICAgIHZhciB4c2FtcHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLHNhbXBtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB4c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLGtleXMubGVuZ3RoXSlcbiAgICAgICAgICAucmFuZ2UoWzAsa2V5cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoe1wid2lkdGhcIjpiYXJfd2lkdGgqMywgXCJoZWlnaHRcIjoga2V5cy5sZW5ndGgqaGVpZ2h0ICsgMTB9KTtcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ2JvdHRvbScpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4ga2V5c1tpXTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKGtleXMubGVuZ3RoKSk7XG5cbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aCArIGJhcl93aWR0aC8yKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGV4dC1hbmNob3I6IG1pZGRsZTtcIilcblxuICAgIFxuICAgIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoKjIpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuICAgIFxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTQpXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA4LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnIzM4OGUzYycpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNjYWxlKHhbdl0pIH0pXG5cbiAgICB2YXIgY2hhcnQyID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQyJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydDJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgc2FtcGJhcnMgPSBkM19zcGxhdChjaGFydDIsXCIuc2FtcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNhbXAtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtNClcbiAgICAgIC5hdHRyKHsneCc6ZnVuY3Rpb24oeCkgeyByZXR1cm4gYmFyX3dpZHRoIC0geHNhbXBzY2FsZSgteFt2XSl9LCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgOC41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJyNkMzJmMmYnKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzYW1wc2NhbGUoLXhbdl0pIH0pXG5cbiAgICB5X3hpcy5leGl0KCkucmVtb3ZlKClcblxuICAgIGNoYXJ0LmV4aXQoKS5yZW1vdmUoKVxuICAgIGNoYXJ0Mi5leGl0KCkucmVtb3ZlKClcblxuICAgIGJhcnMuZXhpdCgpLnJlbW92ZSgpXG4gICAgc2FtcGJhcnMuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgIFxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBfYmFyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IENvbXBCYXIodGFyZ2V0KVxufVxuXG4vLyBkYXRhIGZvcm1hdDogW3trZXksIG5vcm1hbGl6ZWRfZGlmZn0sIC4uLiBdXG5cbmNsYXNzIENvbXBCYXIge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcblxuICAgIHRoaXMuX2tleV9hY2Nlc3NvciA9IFwia2V5XCJcbiAgICB0aGlzLl9wb3BfdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcbiAgICB0aGlzLl9zYW1wX3ZhbHVlX2FjY2Vzc29yID0gXCJ2YWx1ZVwiXG5cbiAgICB0aGlzLl9iYXJfaGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9iYXJfd2lkdGggPSAzMDBcbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHBvcF92YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJwb3BfdmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cbiAgc2FtcF92YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzYW1wX3ZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG5cbiAgYmFyX2hlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfaGVpZ2h0XCIsdmFsKSB9XG4gIGJhcl93aWR0aCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfd2lkdGhcIix2YWwpIH1cblxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgdyA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLmNvbXAtd3JhcFwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7cmV0dXJuIDF9KVxuICAgICAgLmNsYXNzZWQoXCJjb21wLXdyYXBcIix0cnVlKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh3LFwiaDNcIixcImgzXCIpLnRleHQodGhpcy5fdGl0bGUpXG5cbiAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodyxcIi5zdmctd3JhcFwiLFwiZGl2XCIsdGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiAxIH0pXG4gICAgICAuY2xhc3NlZChcInN2Zy13cmFwXCIsdHJ1ZSlcblxuICAgIHZhciBrID0gdGhpcy5rZXlfYWNjZXNzb3IoKVxuICAgICAgLCBwID0gdGhpcy5wb3BfdmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBzID0gdGhpcy5zYW1wX3ZhbHVlX2FjY2Vzc29yKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5iYXJfaGVpZ2h0KClcbiAgICAgICwgYmFyX3dpZHRoID0gdGhpcy5iYXJfd2lkdGgoKVxuXG4gICAgdmFyIGtleXMgPSB0aGlzLl9kYXRhLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4W2tdIH0pXG4gICAgICAsIG1heCA9IGQzLm1heCh0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbcF0gfSlcbiAgICAgICwgc2FtcG1heCA9IGQzLm1heCh0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbc10gfSlcblxuICAgIHZhciB4c2FtcHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLHNhbXBtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB4c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLGtleXMubGVuZ3RoXSlcbiAgICAgICAgICAucmFuZ2UoWzAsa2V5cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoe1wid2lkdGhcIjpiYXJfd2lkdGgrYmFyX3dpZHRoLzIsIFwiaGVpZ2h0XCI6IGtleXMubGVuZ3RoKmhlaWdodCArIDEwfSk7XG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCdib3R0b20nKVxuICAgICAgLnNjYWxlKHhzY2FsZSlcblxuICAgIHZhciB5QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeUF4aXNcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLnNjYWxlKHlzY2FsZSlcbiAgICAgIC50aWNrU2l6ZSgyKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oZCxpKXsgcmV0dXJuIGtleXNbaV07IH0pXG4gICAgICAudGlja1ZhbHVlcyhkMy5yYW5nZShrZXlzLmxlbmd0aCkpO1xuXG4gICAgdmFyIHlfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieSBheGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChiYXJfd2lkdGgvMikgKyBcIiwxNSlcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3lheGlzJylcbiAgICAgIC5jYWxsKHlBeGlzKTtcblxuICAgIHlfeGlzLnNlbGVjdEFsbChcInRleHRcIilcblxuICAgIFxuICAgIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoLzIpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuICAgIFxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTIpXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA3LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnZ3JheScpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNjYWxlKHhbcF0pIH0pXG5cblxuICAgIHZhciBzYW1wYmFycyA9IGQzX3NwbGF0KGNoYXJ0LFwiLnNhbXAtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJzYW1wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTEwKVxuICAgICAgLmF0dHIoeyd4JzowLCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgMTEuNTsgfX0pXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCcjMDgxZDU4JylcbiAgICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4c2FtcHNjYWxlKHhbc10gfHwgMCkgfSlcblxuICAgIHlfeGlzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgY2hhcnQuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICBiYXJzLmV4aXQoKS5yZW1vdmUoKVxuICAgIHNhbXBiYXJzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb21wX2J1YmJsZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBDb21wQnViYmxlKHRhcmdldClcbn1cblxuLy8gZGF0YSBmb3JtYXQ6IFt7a2V5LCBub3JtYWxpemVkX2RpZmZ9LCAuLi4gXVxuXG5jbGFzcyBDb21wQnViYmxlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICB0aGlzLl9rZXlfYWNjZXNzb3IgPSBcImtleVwiXG5cbiAgICB0aGlzLl9oZWlnaHQgPSAyMFxuICAgIHRoaXMuX3NwYWNlID0gMTRcbiAgICB0aGlzLl9taWRkbGUgPSAxODBcbiAgICB0aGlzLl9sZWdlbmRfd2lkdGggPSA4MFxuXG4gICAgdGhpcy5fYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG4gICAgdGhpcy5fcm93cyA9IFtdXG5cblxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgdmFsdWVfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cblxuICBoZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVpZ2h0XCIsdmFsKSB9XG4gIHNwYWNlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNwYWNlXCIsdmFsKSB9XG4gIG1pZGRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJtaWRkbGVcIix2YWwpIH1cbiAgYnVja2V0cyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJidWNrZXRzXCIsdmFsKSB9XG5cbiAgcm93cyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyb3dzXCIsdmFsKSB9XG4gIGFmdGVyKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFmdGVyXCIsdmFsKSB9XG5cblxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuICBidWlsZFNjYWxlcygpIHtcblxuICAgIHZhciByb3dzID0gdGhpcy5yb3dzKClcbiAgICAgICwgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpXG5cbiAgICB0aGlzLl95c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbMCxyb3dzLmxlbmd0aF0pXG4gICAgICAucmFuZ2UoWzAscm93cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB0aGlzLl94c2NhbGUgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cylcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLChoZWlnaHQrc3BhY2UpKSk7XG5cbiAgICB0aGlzLl94c2NhbGVyZXZlcnNlID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMucmV2ZXJzZSgpKVxuICAgICAgLnJhbmdlKGQzLnJhbmdlKDAsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSksKGhlaWdodCtzcGFjZSkpKTtcblxuICAgIHRoaXMuX3JzY2FsZSA9IGQzLnNjYWxlLnBvdygpXG4gICAgICAuZXhwb25lbnQoMC41KVxuICAgICAgLmRvbWFpbihbMCwxXSlcbiAgICAgIC5yYW5nZShbLjM1LDFdKVxuICAgIFxuICAgIHRoaXMuX29zY2FsZSA9IGQzLnNjYWxlLnF1YW50aXplKClcbiAgICAgIC5kb21haW4oWy0xLDFdKVxuICAgICAgLnJhbmdlKFsnI2Y3ZmJmZicsJyNkZWViZjcnLCcjYzZkYmVmJywnIzllY2FlMScsJyM2YmFlZDYnLCcjNDI5MmM2JywnIzIxNzFiNScsJyMwODUxOWMnLCcjMDgzMDZiJ10pXG4gICAgXG4gIH1cblxuICBkcmF3TGVnZW5kKCkge1xuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNcbiAgICAgICwgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpLCBtaWRkbGUgPSB0aGlzLm1pZGRsZSgpLCBsZWdlbmR0dyA9IHRoaXMuX2xlZ2VuZF93aWR0aFxuICAgICAgLCByc2NhbGUgPSB0aGlzLl9yc2NhbGUsIG9zY2FsZSA9IHRoaXMuX29zY2FsZTtcblxuICAgIHZhciBsZWdlbmQgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5sZWdlbmQnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlZ2VuZFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSoyK21pZGRsZS0zMTApICsgXCIsLTEzMClcIilcblxuICAgIHZhciBzaXplID0gZDNfdXBkYXRlYWJsZShsZWdlbmQsJ2cuc2l6ZScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwic2l6ZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArIChsZWdlbmR0dysxMCkgKyBcIiwwKVwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlIGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dylcbiAgICAgIC5odG1sKFwibW9yZSBhY3Rpdml0eVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpIFxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZS1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZS1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHctMTApXG4gICAgICAuaHRtbChcIiYjOTY2NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKSBcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG5cblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzc1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuaHRtbChcImxlc3MgYWN0aXZpdHlcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5sZXNzLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZXNzLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLChoZWlnaHQrNCkqNStsZWdlbmR0dysxMClcbiAgICAgIC5odG1sKFwiJiM5NjU0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIikgXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cbiAgICBkM19zcGxhdChzaXplLFwiY2lyY2xlXCIsXCJjaXJjbGVcIixbMSwuNiwuMywuMSwwXSlcbiAgICAgIC5hdHRyKFwiclwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIChoZWlnaHQtMikvMipyc2NhbGUoeCkgfSlcbiAgICAgIC5hdHRyKCdjeCcsIGZ1bmN0aW9uKGQsaSkgeyByZXR1cm4gKGhlaWdodCs0KSppK2hlaWdodC8yfSlcbiAgICAgIC5hdHRyKCdzdHJva2UnLCAnZ3JleScpXG4gICAgICAuYXR0cignZmlsbCcsICdub25lJylcblxuXG4gICAgXG5cblxuICAgIHZhciBzaXplID0gZDNfdXBkYXRlYWJsZShsZWdlbmQsJ2cuaW1wb3J0YW5jZScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiaW1wb3J0YW5jZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIisgKGxlZ2VuZHR3KzEwKSArXCIsMjUpXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lm1vcmVcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1vcmUgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsLWxlZ2VuZHR3KVxuICAgICAgLmh0bWwoXCJtb3JlIGltcG9ydGFudFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dy0xMClcbiAgICAgIC5odG1sKFwiJiM5NjY0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIikgXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzc1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuaHRtbChcImxlc3MgaW1wb3J0YW50XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3MtYXJyb3dcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MtYXJyb3cgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KzEwKVxuICAgICAgLmh0bWwoXCImIzk2NTQ7XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG4gICAgZDNfc3BsYXQoc2l6ZSxcImNpcmNsZVwiLFwiY2lyY2xlXCIsWzEsLjc1LC41LC4yNSwwXSlcbiAgICAgIC5hdHRyKFwiclwiLGhlaWdodC8yLTIpXG4gICAgICAuYXR0cihcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBvc2NhbGUoeCkgfSlcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHJzY2FsZSh4LzIgKyAuMikgfSlcbiAgICAgIC5hdHRyKCdjeCcsIGZ1bmN0aW9uKGQsaSkgeyByZXR1cm4gKGhlaWdodCs0KSppK2hlaWdodC8yIH0pXG4gXG4gIH1cblxuICBkcmF3QXhlcygpIHtcbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKSwgbWlkZGxlID0gdGhpcy5taWRkbGUoKSwgbGVnZW5kdHcgPSB0aGlzLl9sZWdlbmRfd2lkdGhcbiAgICAgICwgcnNjYWxlID0gdGhpcy5fcnNjYWxlLCBvc2NhbGUgPSB0aGlzLl9vc2NhbGUgXG4gICAgICAsIHhzY2FsZSA9IHRoaXMuX3hzY2FsZSwgeXNjYWxlID0gdGhpcy5feXNjYWxlXG4gICAgICAsIHhzY2FsZXJldmVyc2UgPSB0aGlzLl94c2NhbGVyZXZlcnNlXG4gICAgICAsIHJvd3MgPSB0aGlzLl9yb3dzXG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCd0b3AnKVxuICAgICAgLnNjYWxlKHhzY2FsZXJldmVyc2UpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbih4KSB7IFxuICAgICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgICBpZiAoeCA8IDM2MDApIHJldHVybiB4LzYwICsgXCIgbWluc1wiIFxuXG4gICAgICAgIGlmICh4ID09IDg2NDAwKSByZXR1cm4gXCIxIGRheVwiXG4gICAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICAgIHJldHVybiB4LzM2MDAgKyBcIiBob3Vyc1wiXG4gICAgICB9KVxuXG4gICAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueC5iZWZvcmUnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInggYXhpcyBiZWZvcmVcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGhlaWdodCArIHNwYWNlKSsgXCIsLTQpXCIpXG4gICAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgICAuY2FsbCh4QXhpcyk7XG5cbiAgICAgICAgICBcbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInlcIiwgLTgpXG4gICAgICAuYXR0cihcInhcIiwgLTgpXG4gICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKDQ1KVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFja1wiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrOyBkaXNwbGF5OmluaGVyaXRcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoeF94aXMsXCJ0ZXh0LnRpdGxlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgICAgLmF0dHIoXCJ4XCIsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkvMiAtIGhlaWdodCtzcGFjZSApXG4gICAgICAuYXR0cihcInlcIiwtNTMpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLHVuZGVmaW5lZClcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLCBcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXG4gICAgICAudGV4dChcImJlZm9yZSBhcnJpdmluZ1wiKVxuXG5cblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgaWYgKHggPT0gMzYwMCkgcmV0dXJuIFwiMSBob3VyXCJcbiAgICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgICBpZiAoeCA9PSA4NjQwMCkgcmV0dXJuIFwiMSBkYXlcIlxuICAgICAgICBpZiAoeCA+IDg2NDAwKSByZXR1cm4geC84NjQwMCArIFwiIGRheXNcIiBcblxuICAgICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgICAgfSlcblxuICAgIHZhciB4X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnguYWZ0ZXInLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInggYXhpcyBhZnRlclwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkrbWlkZGxlKSArIFwiLDApXCIpXG4gICAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgICAuY2FsbCh4QXhpcyk7XG4gICAgXG4gICAgeF94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ5XCIsIC04KVxuICAgICAgLmF0dHIoXCJ4XCIsIDgpXG4gICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKC00NSlcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwic3RhcnRcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFja1wiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrOyBkaXNwbGF5OmluaGVyaXRcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoeF94aXMsXCJ0ZXh0LnRpdGxlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgICAgLmF0dHIoXCJ4XCIsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkvMiAgKVxuICAgICAgLmF0dHIoXCJ5XCIsLTUzKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIix1bmRlZmluZWQpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgLnRleHQoXCJhZnRlciBsZWF2aW5nXCIpXG5cblxuICAgIHZhciB5QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeUF4aXNcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLnNjYWxlKHlzY2FsZSlcbiAgICAgIC50aWNrU2l6ZSgyKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHJvd3NbaV0ua2V5OyB9KVxuICAgICAgLnRpY2tWYWx1ZXMoZDMucmFuZ2Uocm93cy5sZW5ndGgpKTtcblxuXG4gICAgXG4gICAgdmFyIHlfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieSBheGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSswKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuXG5cbiAgICB5X3hpc1xuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwibGluZVwiKVxuICAgICAgLmF0dHIoXCJ4MlwiLDE4KVxuICAgICAgLmF0dHIoXCJ4MVwiLDIyKVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLFwiMFwiKVxuICAgICAgLnJlbW92ZSgpXG5cblxuICAgIHlfeGlzLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAgIC5hdHRyKFwieDJcIiwxOClcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMTgsMClcIikgXG4gICAgICAvLy5zdHlsZShcInN0cm9rZVwiLFwiYmxhY2tcIilcblxuXG5cbiAgICAgIC8vLnJlbW92ZSgpXG5cbiAgICBcbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJ0ZXh0LWFuY2hvcjogbWlkZGxlOyBmb250LXdlaWdodDpib2xkOyBmaWxsOiAjMzMzXCIpXG4gICAgICAuYXR0cihcInhcIixtaWRkbGUvMilcblxuXG5cblxuICB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBidWNrZXRzID0gdGhpcy5idWNrZXRzKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5oZWlnaHQoKSwgc3BhY2UgPSB0aGlzLnNwYWNlKCksIG1pZGRsZSA9IHRoaXMubWlkZGxlKCksIGxlZ2VuZHR3ID0gdGhpcy5fbGVnZW5kX3dpZHRoXG4gICAgICAsIHJvd3MgPSB0aGlzLnJvd3MoKVxuXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi01cHhcIilcbiAgICAgIC5hdHRyKHsnd2lkdGgnOmJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpKjIrbWlkZGxlLCdoZWlnaHQnOnJvd3MubGVuZ3RoKmhlaWdodCArIDE2NX0pXG4gICAgICAuYXR0cihcInhtbG5zXCIsIFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIilcblxuICAgIHRoaXMuX3N2ZyA9IHN2Z1xuXG4gICAgdGhpcy5fY2FudmFzID0gZDNfdXBkYXRlYWJsZShzdmcsXCIuY2FudmFzXCIsXCJnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMTQwKVwiKVxuXG5cblxuICAgIHRoaXMuYnVpbGRTY2FsZXMoKVxuICAgIHRoaXMuZHJhd0xlZ2VuZCgpXG4gICAgdGhpcy5kcmF3QXhlcygpXG5cbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzXG4gICAgICAsIHJzY2FsZSA9IHRoaXMuX3JzY2FsZSwgb3NjYWxlID0gdGhpcy5fb3NjYWxlIFxuICAgICAgLCB4c2NhbGUgPSB0aGlzLl94c2NhbGUsIHlzY2FsZSA9IHRoaXMuX3lzY2FsZVxuICAgICAgLCB4c2NhbGVyZXZlcnNlID0gdGhpcy5feHNjYWxlcmV2ZXJzZVxuICAgICAgLCByb3dzID0gdGhpcy5yb3dzKClcblxuXG4gICAgdmFyIGNoYXJ0X2JlZm9yZSA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0LWJlZm9yZScsJ2cnLHRoaXMucm93cygpLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnQtYmVmb3JlXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgcm93cyA9IGQzX3NwbGF0KGNoYXJ0X2JlZm9yZSxcIi5yb3dcIixcImdcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJyb3dcIilcbiAgICAgIC5hdHRyKHsndHJhbnNmb3JtJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gXCJ0cmFuc2xhdGUoMCxcIiArICh5c2NhbGUoaSkgKyA3LjUpICsgXCIpXCI7IH0gfSlcbiAgICAgIC5hdHRyKHsnbGFiZWwnOmZ1bmN0aW9uKGQsaSl7IHJldHVybiBkLmtleTsgfSB9KVxuXG4gICAgcm93cy5leGl0KCkucmVtb3ZlKClcblxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQocm93cyxcIi5wb3AtYmFyXCIsXCJjaXJjbGVcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlcyB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2N5JywoaGVpZ2h0LTIpLzIpXG4gICAgICAuYXR0cih7J2N4JzpmdW5jdGlvbihkLGkpIHsgcmV0dXJuIC14c2NhbGUoZC5rZXkpfX0pXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIixcIi44XCIpXG4gICAgICAuYXR0cihcInJcIixmdW5jdGlvbih4KSB7IHJldHVybiAoaGVpZ2h0KS8yICogcnNjYWxlKHgubm9ybV90aW1lKSB9KSBcbiAgICAgIC5zdHlsZShcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBvc2NhbGUoeC5wZXJjZW50X2RpZmYpIH0pXG5cbiAgICB2YXIgY2hhcnRfYWZ0ZXIgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydC1hZnRlcicsJ2cnLHRoaXMuX2FmdGVyLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnQtYWZ0ZXJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpK21pZGRsZSkgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG5cblxuICAgIHZhciByb3dzID0gZDNfc3BsYXQoY2hhcnRfYWZ0ZXIsXCIucm93XCIsXCJnXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicm93XCIpXG4gICAgICAuYXR0cih7J3RyYW5zZm9ybSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIFwidHJhbnNsYXRlKDAsXCIgKyAoeXNjYWxlKGkpICsgNy41KSArIFwiKVwiOyB9IH0pXG4gICAgICAuYXR0cih7J2xhYmVsJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gZC5rZXk7IH0gfSlcblxuICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYmFycyA9IGQzX3NwbGF0KHJvd3MsXCIucG9wLWJhclwiLFwiY2lyY2xlXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBvcC1iYXJcIilcbiAgICAgIC5hdHRyKCdjeScsKGhlaWdodC0yKS8yKVxuICAgICAgLmF0dHIoeydjeCc6ZnVuY3Rpb24oZCxpKSB7IHJldHVybiB4c2NhbGUoZC5rZXkpfX0pXG4gICAgICAuYXR0cihcInJcIixmdW5jdGlvbih4KSB7IHJldHVybiAoaGVpZ2h0LTIpLzIgKiByc2NhbGUoeC5ub3JtX3RpbWUpIH0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gb3NjYWxlKHgucGVyY2VudF9kaWZmKSB9KVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsXCIuOFwiKVxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN0cmVhbV9wbG90KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN0cmVhbVBsb3QodGFyZ2V0KVxufVxuXG5mdW5jdGlvbiBkcmF3QXhpcyh0YXJnZXQsc2NhbGUsdGV4dCx3aWR0aCkge1xuICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICB4QXhpc1xuICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgLnNjYWxlKHNjYWxlKVxuICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgIH0pXG5cbiAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsJ2cueC5iZWZvcmUnLCdnJylcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYmVmb3JlXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwtNSlcIilcbiAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgICAgIFxuICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIC0yNSlcbiAgICAuYXR0cihcInhcIiwgMTUpXG4gICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoNDUpXCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcblxuICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrXCIpXG5cbiAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgZDNfdXBkYXRlYWJsZSh4X3hpcyxcInRleHQudGl0bGVcIixcInRleHRcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgIC5hdHRyKFwieFwiLHdpZHRoLzIpXG4gICAgLmF0dHIoXCJ5XCIsLTQ2KVxuICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsdW5kZWZpbmVkKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAudGV4dCh0ZXh0ICsgXCIgXCIpXG5cbiAgcmV0dXJuIHhfeGlzXG5cbn1cblxuXG5jbGFzcyBTdHJlYW1QbG90IHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICAgIHRoaXMuX2J1Y2tldHMgPSBbMCwxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG5cbiAgICB0aGlzLl93aWR0aCA9IDM3MFxuICAgIHRoaXMuX2hlaWdodCA9IDI1MFxuICAgIHRoaXMuX2NvbG9yID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAucmFuZ2UoXG5bJyM5OTknLCcjYWFhJywnI2JiYicsJyNjY2MnLCcjZGRkJywnI2RlZWJmNycsJyNjNmRiZWYnLCcjOWVjYWUxJywnIzZiYWVkNicsJyM0MjkyYzYnLCcjMjE3MWI1JywncmdiYSgzMywgMTEzLCAxODEsLjkpJywncmdiYSg4LCA4MSwgMTU2LC45MSknLCcjMDg1MTljJywncmdiYSg4LCA0OCwgMTA3LC45KScsJyMwODMwNmInXS5yZXZlcnNlKCkpXG5cbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGhlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cbiAgd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwid2lkdGhcIix2YWwpIH1cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgICAsIG9yZGVyID0gZGF0YS5vcmRlclxuICAgICAgLCBidWNrZXRzID0gdGhpcy5fYnVja2V0c1xuICAgICAgLCBiZWZvcmVfc3RhY2tlZCA9IGRhdGEuYmVmb3JlX3N0YWNrZWRcbiAgICAgICwgYWZ0ZXJfc3RhY2tlZCA9IGRhdGEuYWZ0ZXJfc3RhY2tlZFxuICAgICAgLCBoZWlnaHQgPSB0aGlzLl9oZWlnaHRcbiAgICAgICwgd2lkdGggPSB0aGlzLl93aWR0aFxuICAgICAgLCB0YXJnZXQgPSB0aGlzLl90YXJnZXRcbiAgICAgICwgY29sb3IgPSB0aGlzLl9jb2xvclxuICAgICAgLCBzZWxmID0gdGhpc1xuXG4gICAgY29sb3IuZG9tYWluKG9yZGVyKVxuXG4gICAgdmFyIHkgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLnJhbmdlKFtoZWlnaHQsMF0pXG4gICAgICAuZG9tYWluKFswLGQzLm1heChiZWZvcmVfc3RhY2tlZCwgZnVuY3Rpb24obGF5ZXIpIHsgcmV0dXJuIGQzLm1heChsYXllcixmdW5jdGlvbihkKSB7cmV0dXJuIGQueTAgKyBkLnkgfSl9KV0pXG4gIFxuICAgIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCx3aWR0aCx3aWR0aC8oYnVja2V0cy5sZW5ndGgtMSkpKVxuICBcbiAgICB2YXIgeHJldmVyc2UgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKSlcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLHdpZHRoKzEwLHdpZHRoLyhidWNrZXRzLmxlbmd0aC0xKSkpXG5cbiAgICB0aGlzLl9iZWZvcmVfc2NhbGUgPSB4cmV2ZXJzZVxuICAgIHRoaXMuX2FmdGVyX3NjYWxlID0geFxuICBcbiAgICB2YXIgYmFyZWEgPSBkMy5zdmcuYXJlYSgpXG4gICAgICAuaW50ZXJwb2xhdGUoXCJ6ZXJvXCIpXG4gICAgICAueChmdW5jdGlvbihkKSB7IHJldHVybiB4cmV2ZXJzZShkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICAgIHZhciBhYXJlYSA9IGQzLnN2Zy5hcmVhKClcbiAgICAgIC5pbnRlcnBvbGF0ZShcImxpbmVhclwiKVxuICAgICAgLngoZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICBcbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJzdmdcIixcInN2Z1wiKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCoyKzE4MClcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCArIDEwMCk7XG5cbiAgICB0aGlzLl9zdmcgPSBzdmdcbiAgXG4gICAgdmFyIGJlZm9yZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmJlZm9yZS1jYW52YXNcIixcImdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImJlZm9yZS1jYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsNjApXCIpXG5cbiAgICBmdW5jdGlvbiBob3ZlckNhdGVnb3J5KGNhdCx0aW1lKSB7XG4gICAgICBhcGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsXCIuNVwiKVxuICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLFwiLjVcIilcbiAgICAgIGFwYXRocy5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSBjYXQpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIGJwYXRocy5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSBjYXQpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUobWlkZGxlLFwidGV4dFwiLFwidGV4dFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiLjY1XCIpXG4gICAgICAgIC50ZXh0KGNhdClcblxuICAgICAgdmFyIG13cmFwID0gZDNfdXBkYXRlYWJsZShtaWRkbGUsXCJnXCIsXCJnXCIpXG5cbiAgICAgIHNlbGYub24oXCJjYXRlZ29yeS5ob3ZlclwiKS5iaW5kKG13cmFwLm5vZGUoKSkoY2F0LHRpbWUpXG4gICAgfVxuICBcbiAgICB2YXIgYiA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiZ1wiLFwiZ1wiKVxuXG4gICAgdmFyIGJwYXRocyA9IGQzX3NwbGF0KGIsXCJwYXRoXCIsXCJwYXRoXCIsIGJlZm9yZV9zdGFja2VkLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLmF0dHIoXCJkXCIsIGJhcmVhKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gY29sb3IoeFswXS5rZXkpOyB9KVxuICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZGQgPSBkMy5ldmVudFxuICAgICAgICB2YXIgcG9zID0gcGFyc2VJbnQoZGQub2Zmc2V0WC8od2lkdGgvYnVja2V0cy5sZW5ndGgpKVxuICAgICAgICBcbiAgICAgICAgaG92ZXJDYXRlZ29yeS5iaW5kKHRoaXMpKHhbMF0ua2V5LGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKClbcG9zXSlcbiAgICAgIH0pXG4gICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgYXBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIH0pXG5cbiAgICBicGF0aHMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYnJlY3QgPSBkM19zcGxhdChiLFwicmVjdFwiLFwicmVjdFwiLGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKCksKHgsaSkgPT4gaSlcbiAgICAgIC5hdHRyKFwieFwiLHogPT4geHJldmVyc2UoeikpXG4gICAgICAuYXR0cihcIndpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsaGVpZ2h0KVxuICAgICAgLmF0dHIoXCJ5XCIsMClcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLFwiMFwiKVxuXG5cblxuICAgICAgXG5cbiAgICB2YXIgbWlkZGxlID0gZDNfdXBkYXRlYWJsZShzdmcsXCIubWlkZGxlLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibWlkZGxlLWNhbnZhc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArICh3aWR0aCArIDE4MC8yKSArIFwiLDYwKVwiKVxuICBcbiAgXG4gIFxuICAgIHZhciBhZnRlciA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmFmdGVyLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiYWZ0ZXItY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArICh3aWR0aCArIDE4MCkgKyBcIiw2MClcIilcblxuICAgIHZhciBhID0gZDNfdXBkYXRlYWJsZShhZnRlcixcImdcIixcImdcIilcblxuICBcbiAgICB2YXIgYXBhdGhzID0gZDNfc3BsYXQoYSxcInBhdGhcIixcInBhdGhcIixhZnRlcl9zdGFja2VkLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLmF0dHIoXCJkXCIsIGFhcmVhKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gY29sb3IoeFswXS5rZXkpOyB9KVxuICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICBob3ZlckNhdGVnb3J5LmJpbmQodGhpcykoeFswXS5rZXkpXG4gICAgICB9KVxuICAgICAgLm9uKFwibW91c2VvdXRcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIGFwYXRocy5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICAgIGJwYXRocy5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICB9KVxuXG4gICAgYXBhdGhzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIF94X3hpcyA9IGRyYXdBeGlzKGJlZm9yZSx4cmV2ZXJzZSxcImJlZm9yZSBhcnJpdmluZ1wiLHdpZHRoKVxuXG4gICAgX3hfeGlzLnNlbGVjdEFsbChcInRleHRcIikuZmlsdGVyKGZ1bmN0aW9uKHkpeyByZXR1cm4geSA9PSAwIH0pLnJlbW92ZSgpXG5cbiAgICB2YXIgX3hfeGlzID0gZHJhd0F4aXMoYWZ0ZXIseCxcImFmdGVyIGxlYXZpbmdcIix3aWR0aClcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0Om5vdCgudGl0bGUpXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSgtNDUpXCIpXG4gICAgICAuYXR0cihcInhcIiwyMClcbiAgICAgIC5hdHRyKFwieVwiLC0yNSlcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpLmZpbHRlcihmdW5jdGlvbih5KXsgcmV0dXJuIHkgPT0gMCB9KS5yZW1vdmUoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIG9uKGFjdGlvbixmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICdjaGFydCdcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBidXR0b25fcmFkaW8gZnJvbSAnLi4vZ2VuZXJpYy9idXR0b25fcmFkaW8nXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4uL2dlbmVyaWMvc2VsZWN0J1xuXG5pbXBvcnQgcGllIGZyb20gJy4uL2dlbmVyaWMvcGllJ1xuaW1wb3J0IGRpZmZfYmFyIGZyb20gJy4uL2dlbmVyaWMvZGlmZl9iYXInXG5pbXBvcnQgY29tcF9iYXIgZnJvbSAnLi4vZ2VuZXJpYy9jb21wX2JhcidcbmltcG9ydCBjb21wX2J1YmJsZSBmcm9tICcuLi9nZW5lcmljL2NvbXBfYnViYmxlJ1xuaW1wb3J0IHN0cmVhbV9wbG90IGZyb20gJy4uL2dlbmVyaWMvc3RyZWFtX3Bsb3QnXG5cblxuXG5cbmltcG9ydCAqIGFzIHRpbWVzZXJpZXMgZnJvbSAnLi4vZ2VuZXJpYy90aW1lc2VyaWVzJ1xuXG5cbmltcG9ydCB0YWJsZSBmcm9tICd0YWJsZSdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cblxuZXhwb3J0IGZ1bmN0aW9uIFN1bW1hcnlWaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5mdW5jdGlvbiBidWlsZFN0cmVhbURhdGEoZGF0YSxidWNrZXRzKSB7XG5cbiAgdmFyIHVuaXRzX2luX2J1Y2tldCA9IGJ1Y2tldHMubWFwKGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geCAtICh4W2ktMV18fCAwKSB9KVxuXG4gIHZhciBzdGFja2FibGUgPSBkYXRhLm1hcChmdW5jdGlvbihkKSB7XG4gICAgdmFyIHZhbHVlbWFwID0gZC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMudmFsdWVzOyByZXR1cm4gcCB9LHt9KVxuICAgIHZhciBwZXJjbWFwID0gZC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMucGVyY2VudDsgcmV0dXJuIHAgfSx7fSlcblxuICAgIHZhciB2bWFwID0gZC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMubm9ybV9jYXQ7IHJldHVybiBwIH0se30pXG5cblxuICAgIHZhciBub3JtYWxpemVkX3ZhbHVlcyA9IGJ1Y2tldHMubWFwKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgaWYgKHggPT0gMCkgcmV0dXJuIHtrZXk6IGQua2V5LCB4OiBwYXJzZUludCh4KSwgeTogKHZtYXBbXCI2MDBcIl18fDApLCB2YWx1ZXM6ICh2YWx1ZW1hcFtcIjYwMFwiXXx8MCksIHBlcmNlbnQ6IChwZXJjbWFwW1wiNjAwXCJdfHwwKX1cbiAgICAgIHJldHVybiB7IGtleTogZC5rZXksIHg6IHBhcnNlSW50KHgpLCB5OiAodm1hcFt4XSB8fCAwKSwgdmFsdWVzOiAodmFsdWVtYXBbeF0gfHwgMCksIHBlcmNlbnQ6IChwZXJjbWFwW3hdIHx8IDApIH1cbiAgICB9KVxuXG5cbiAgICByZXR1cm4gbm9ybWFsaXplZF92YWx1ZXNcbiAgICAvL3JldHVybiBlMi5jb25jYXQobm9ybWFsaXplZF92YWx1ZXMpLy8uY29uY2F0KGV4dHJhKVxuICB9KVxuXG5cbiAgc3RhY2thYmxlID0gc3RhY2thYmxlLnNvcnQoKHAsYykgPT4gcFswXS55IC0gY1swXS55KS5yZXZlcnNlKCkuc2xpY2UoMCwxMilcblxuICByZXR1cm4gc3RhY2thYmxlXG5cbn1cblxuZnVuY3Rpb24gc3RyZWFtRGF0YShiZWZvcmUsYWZ0ZXIsYnVja2V0cykge1xuICB2YXIgc3RhY2thYmxlID0gYnVpbGRTdHJlYW1EYXRhKGJlZm9yZSxidWNrZXRzKVxuICB2YXIgc3RhY2sgPSBkMy5sYXlvdXQuc3RhY2soKS5vZmZzZXQoXCJ3aWdnbGVcIikub3JkZXIoXCJyZXZlcnNlXCIpXG4gIHZhciBiZWZvcmVfc3RhY2tlZCA9IHN0YWNrKHN0YWNrYWJsZSlcblxuICB2YXIgb3JkZXIgPSBiZWZvcmVfc3RhY2tlZC5tYXAoaXRlbSA9PiBpdGVtWzBdLmtleSlcblxuICB2YXIgc3RhY2thYmxlID0gYnVpbGRTdHJlYW1EYXRhKGFmdGVyLGJ1Y2tldHMpXG4gICAgLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBvcmRlci5pbmRleE9mKGNbMF0ua2V5KSAtIG9yZGVyLmluZGV4T2YocFswXS5rZXkpIH0pXG5cbiAgc3RhY2thYmxlID0gc3RhY2thYmxlLmZpbHRlcih4ID0+IG9yZGVyLmluZGV4T2YoeFswXS5rZXkpID09IC0xKS5jb25jYXQoc3RhY2thYmxlLmZpbHRlcih4ID0+IG9yZGVyLmluZGV4T2YoeFswXS5rZXkpID4gLTEpKVxuXG4gIHZhciBzdGFjayA9IGQzLmxheW91dC5zdGFjaygpLm9mZnNldChcIndpZ2dsZVwiKS5vcmRlcihcImRlZmF1bHRcIilcbiAgdmFyIGFmdGVyX3N0YWNrZWQgPSBzdGFjayhzdGFja2FibGUpXG5cbiAgcmV0dXJuIHtcbiAgICAgIG9yZGVyOiBvcmRlclxuICAgICwgYmVmb3JlX3N0YWNrZWQ6IGJlZm9yZV9zdGFja2VkXG4gICAgLCBhZnRlcl9zdGFja2VkOiBhZnRlcl9zdGFja2VkXG4gIH1cblxufVxuXG5cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3U3RyZWFtKHRhcmdldCxiZWZvcmUsYWZ0ZXIpIHtcblxuZnVuY3Rpb24gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsYWNjZXNzb3IpIHtcbiAgdmFyIGJ2b2x1bWUgPSB7fSwgYXZvbHVtZSA9IHt9XG5cbiAgdHJ5IHsgdmFyIGJ2b2x1bWUgPSBiWzBdLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLnhdID0gYWNjZXNzb3IoYyk7IHJldHVybiBwIH0se30pIH0gY2F0Y2goZSkge31cbiAgdHJ5IHsgdmFyIGF2b2x1bWUgPSBhWzBdLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLnhdID0gYWNjZXNzb3IoYyk7IHJldHVybiBwIH0se30pIH0gY2F0Y2goZSkge31cblxuICB2YXIgdm9sdW1lID0gYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKS5tYXAoeCA9PiBidm9sdW1lW3hdIHx8IDApLmNvbmNhdChidWNrZXRzLm1hcCh4ID0+IGF2b2x1bWVbeF0gfHwgMCkpXG5cbiAgcmV0dXJuIHZvbHVtZVxufVxuXG4gIHZhciBidWNrZXRzID0gWzAsMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geCo2MCB9KVxuXG4gIHZhciBkYXRhID0gc3RyZWFtRGF0YShiZWZvcmUsYWZ0ZXIsYnVja2V0cylcbiAgICAsIGJlZm9yZV9zdGFja2VkID0gZGF0YS5iZWZvcmVfc3RhY2tlZFxuICAgICwgYWZ0ZXJfc3RhY2tlZCA9IGRhdGEuYWZ0ZXJfc3RhY2tlZFxuXG4gIHZhciBiZWZvcmUgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5iZWZvcmUtc3RyZWFtXCIsXCJkaXZcIixkYXRhLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgLmNsYXNzZWQoXCJiZWZvcmUtc3RyZWFtXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjBweFwiKVxuXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwicmdiKDIyNywgMjM1LCAyNDApXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShiZWZvcmUsXCJoM1wiLFwiaDNcIilcbiAgICAudGV4dChcIkNvbnNpZGVyYXRpb24gYW5kIFJlc2VhcmNoIFBoYXNlIElkZW50aWZpY2F0aW9uXCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMHB4XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG5cbiAgdmFyIGlubmVyID0gZDNfdXBkYXRlYWJsZShiZWZvcmUsXCIuaW5uZXJcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwiaW5uZXJcIix0cnVlKVxuXG5cblxuICB2YXIgc3RyZWFtID0gc3RyZWFtX3Bsb3QoaW5uZXIpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAub24oXCJjYXRlZ29yeS5ob3ZlclwiLGZ1bmN0aW9uKHgsdGltZSkge1xuICAgICAgY29uc29sZS5sb2codGltZSlcbiAgICAgIHZhciBiID0gZGF0YS5iZWZvcmVfc3RhY2tlZC5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSB4KVxuICAgICAgdmFyIGEgPSBkYXRhLmFmdGVyX3N0YWNrZWQuZmlsdGVyKHkgPT4geVswXS5rZXkgPT0geClcblxuICAgICAgdmFyIHZvbHVtZSA9IGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMudmFsdWVzLmxlbmd0aCB9KVxuICAgICAgICAsIHBlcmNlbnQgPSBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxmdW5jdGlvbihjKSB7IHJldHVybiBjLnBlcmNlbnQgfSlcbiAgICAgICAgLCBpbXBvcnRhbmNlID0gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsZnVuY3Rpb24oYykgeyByZXR1cm4gYy55IH0pXG5cblxuICAgICAgdmFyIHdyYXAgPSBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgLCB2d3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi52b2x1bWVcIixcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInZvbHVtZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgtNjAsMzApXCIpXG4gICAgICAgICwgcHdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIucGVyY2VudFwiLFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicGVyY2VudFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgtNjAsOTApXCIpXG4gICAgICAgICwgaXdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuaW1wb3J0YW5jZVwiLFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiaW1wb3J0YW5jZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgtNjAsMTUwKVwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodndyYXAsXCJ0ZXh0XCIsXCJ0ZXh0XCIpLnRleHQoXCJWaXNpdHNcIilcbiAgICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGl0bGVcIilcbiAgICAgIHNpbXBsZVRpbWVzZXJpZXModndyYXAsdm9sdW1lKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDAsMilcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHB3cmFwLFwidGV4dFwiLFwidGV4dFwiKS50ZXh0KFwiU2hhcmUgb2YgdGltZVwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuXG4gICAgICBzaW1wbGVUaW1lc2VyaWVzKHB3cmFwLHBlcmNlbnQpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMCwyKVwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaXdyYXAsXCJ0ZXh0XCIsXCJ0ZXh0XCIpLnRleHQoXCJJbXBvcnRhbmNlXCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInRpdGxlXCIpXG5cbiAgICAgIHNpbXBsZVRpbWVzZXJpZXMoaXdyYXAsaW1wb3J0YW5jZSlcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgwLDIpXCIpXG5cblxuICAgICAgcmV0dXJuXG4gICAgfSlcbiAgICAuZHJhdygpXG5cbiAgdmFyIGJlZm9yZV9hZ2cgPSBiZWZvcmVfc3RhY2tlZC5yZWR1Y2UoKG8seCkgPT4geyByZXR1cm4geC5yZWR1Y2UoKHAsYykgPT4geyBwW2MueF0gPSAocFtjLnhdIHx8IDApICsgYy55OyByZXR1cm4gcH0sbykgfSx7fSlcbiAgICAsIGFmdGVyX2FnZyA9IGFmdGVyX3N0YWNrZWQucmVkdWNlKChvLHgpID0+IHsgcmV0dXJuIHgucmVkdWNlKChwLGMpID0+IHsgcFtjLnhdID0gKHBbYy54XSB8fCAwKSArIGMueTsgcmV0dXJuIHB9LG8pIH0se30pXG5cblxuICB2YXIgbG9jYWxfYmVmb3JlID0gT2JqZWN0LmtleXMoYmVmb3JlX2FnZykucmVkdWNlKChtaW5hcnIsYykgPT4ge1xuICAgICAgaWYgKG1pbmFyclswXSA+PSBiZWZvcmVfYWdnW2NdKSByZXR1cm4gW2JlZm9yZV9hZ2dbY10sY107XG4gICAgICBpZiAobWluYXJyLmxlbmd0aCA+IDEpIG1pbmFyclswXSA9IC0xO1xuICAgICAgcmV0dXJuIG1pbmFyclxuICAgIH0sW0luZmluaXR5XVxuICApWzFdXG5cbiAgdmFyIGxvY2FsX2FmdGVyID0gT2JqZWN0LmtleXMoYWZ0ZXJfYWdnKS5yZWR1Y2UoKG1pbmFycixjKSA9PiB7XG4gICAgICBpZiAobWluYXJyWzBdID49IGFmdGVyX2FnZ1tjXSkgcmV0dXJuIFthZnRlcl9hZ2dbY10sY107XG4gICAgICBpZiAobWluYXJyLmxlbmd0aCA+IDEpIG1pbmFyclswXSA9IC0xO1xuICAgICAgcmV0dXJuIG1pbmFyclxuICAgIH0sW0luZmluaXR5XVxuICApWzFdXG5cblxuICB2YXIgYmVmb3JlX2xpbmUgPSBidWNrZXRzW2J1Y2tldHMuaW5kZXhPZihwYXJzZUludChsb2NhbF9iZWZvcmUpKV1cbiAgICAsIGFmdGVyX2xpbmUgPSBidWNrZXRzW2J1Y2tldHMuaW5kZXhPZihwYXJzZUludChsb2NhbF9hZnRlcikpXVxuXG4gIHZhciBzdmcgPSBzdHJlYW1cbiAgICAuX3N2Zy5zdHlsZShcIm1hcmdpblwiLFwiYXV0b1wiKS5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG5cblxuICB2YXIgYmxpbmUgPSBkM191cGRhdGVhYmxlKHN2Zy5zZWxlY3RBbGwoXCIuYmVmb3JlLWNhbnZhc1wiKSxcImcubGluZS13cmFwXCIsXCJnXCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwibGluZS13cmFwXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShibGluZSxcImxpbmVcIixcImxpbmVcIilcbiAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAuYXR0cihcInkyXCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieDFcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpKVxuICAgIC5hdHRyKFwieDJcIiwgc3RyZWFtLl9iZWZvcmVfc2NhbGUoYmVmb3JlX2xpbmUpKVxuXG4gIGQzX3VwZGF0ZWFibGUoYmxpbmUsXCJ0ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieFwiLCBzdHJlYW0uX2JlZm9yZV9zY2FsZShiZWZvcmVfbGluZSkgKyAxMClcbiAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwic3RhcnRcIilcbiAgICAudGV4dChcIkNvbnNpZGVyYXRpb24gU3RhZ2VcIilcblxuXG4gIHZhciBhbGluZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLnNlbGVjdEFsbChcIi5hZnRlci1jYW52YXNcIiksXCJnLmxpbmUtd3JhcFwiLFwiZ1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIixcImxpbmUtd3JhcFwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoYWxpbmUsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAuYXR0cihcInkxXCIsIDApXG4gICAgLmF0dHIoXCJ5MlwiLCBzdHJlYW0uX2hlaWdodCsyMClcbiAgICAuYXR0cihcIngxXCIsIHN0cmVhbS5fYWZ0ZXJfc2NhbGUoYWZ0ZXJfbGluZSkpXG4gICAgLmF0dHIoXCJ4MlwiLCBzdHJlYW0uX2FmdGVyX3NjYWxlKGFmdGVyX2xpbmUpKVxuXG4gIGQzX3VwZGF0ZWFibGUoYWxpbmUsXCJ0ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieFwiLCBzdHJlYW0uX2FmdGVyX3NjYWxlKGFmdGVyX2xpbmUpIC0gMTApXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgIC50ZXh0KFwiVmFsaWRhdGlvbiAvIFJlc2VhcmNoXCIpXG5cblxuXG4gIHJldHVybiB7XG4gICAgXCJjb25zaWRlcmF0aW9uXCI6IFwiXCIgKyBiZWZvcmVfbGluZSxcbiAgICBcInZhbGlkYXRpb25cIjogXCItXCIgKyBhZnRlcl9saW5lXG4gIH1cbn1cblxuXG5cbmZ1bmN0aW9uIGJ1aWxkU3VtbWFyeUJsb2NrKGRhdGEsIHRhcmdldCwgcmFkaXVzX3NjYWxlLCB4KSB7XG4gIHZhciBkYXRhID0gZGF0YVxuICAgICwgZHRoaXMgPSBkMy5zZWxlY3QodGFyZ2V0KVxuXG4gIHBpZShkdGhpcylcbiAgICAuZGF0YShkYXRhKVxuICAgIC5yYWRpdXMocmFkaXVzX3NjYWxlKGRhdGEucG9wdWxhdGlvbikpXG4gICAgLmRyYXcoKVxuXG4gIHZhciBmdyA9IGQzX3VwZGF0ZWFibGUoZHRoaXMsXCIuZndcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgIC5jbGFzc2VkKFwiZndcIix0cnVlKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MHB4XCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIzcHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMTZweFwiKVxuXG4gIHZhciBmdzIgPSBkM191cGRhdGVhYmxlKGR0aGlzLFwiLmZ3MlwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxIH0pXG4gICAgLmNsYXNzZWQoXCJmdzJcIix0cnVlKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCI2MHB4XCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIzcHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjIycHhcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCI0MHB4XCIpXG4gICAgLnRleHQoZDMuZm9ybWF0KFwiJVwiKShkYXRhLnNhbXBsZS9kYXRhLnBvcHVsYXRpb24pKVxuXG5cblxuICBkM191cGRhdGVhYmxlKGZ3LFwiLnNhbXBsZVwiLFwic3BhblwiKS50ZXh0KGQzLmZvcm1hdChcIixcIikoZGF0YS5zYW1wbGUpKVxuICAgIC5jbGFzc2VkKFwic2FtcGxlXCIsdHJ1ZSlcbiAgZDNfdXBkYXRlYWJsZShmdyxcIi52c1wiLFwic3BhblwiKS5odG1sKFwiPGJyPiBvdXQgb2YgPGJyPlwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjg4ZW1cIilcbiAgICAuY2xhc3NlZChcInZzXCIsdHJ1ZSlcbiAgZDNfdXBkYXRlYWJsZShmdyxcIi5wb3B1bGF0aW9uXCIsXCJzcGFuXCIpLnRleHQoZDMuZm9ybWF0KFwiLFwiKShkYXRhLnBvcHVsYXRpb24pKVxuICAgIC5jbGFzc2VkKFwicG9wdWxhdGlvblwiLHRydWUpXG5cbn1cblxuZnVuY3Rpb24gZHJhd0JlZm9yZUFuZEFmdGVyKHRhcmdldCxkYXRhKSB7XG5cbiAgdmFyIGJlZm9yZSA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLmJlZm9yZVwiLFwiZGl2XCIsZGF0YSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgIC5jbGFzc2VkKFwiYmVmb3JlXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjBweFwiKVxuXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwicmdiKDIyNywgMjM1LCAyNDApXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShiZWZvcmUsXCJoM1wiLFwiaDNcIilcbiAgICAudGV4dChcIkNhdGVnb3J5IGFjdGl2aXR5IGJlZm9yZSBhcnJpdmluZyBhbmQgYWZ0ZXIgbGVhdmluZyBzaXRlXCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMHB4XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG5cbiAgdmFyIGlubmVyID0gZDNfdXBkYXRlYWJsZShiZWZvcmUsXCIuaW5uZXJcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwiaW5uZXJcIix0cnVlKVxuICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJhYnNvbHV0ZVwiKVxuXG4gIGQzX3VwZGF0ZWFibGUoaW5uZXIsXCJoM1wiLFwiaDNcIilcbiAgICAudGV4dChcIlNvcnQgQnlcIilcbiAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMnB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMnB4XCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjE0MHB4XCIpXG5cblxuXG4gIGlubmVyLnNlbGVjdEFsbChcInNlbGVjdFwiKVxuICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLFwiMTQwcHhcIilcblxuXG4gIHZhciBjYiA9IGNvbXBfYnViYmxlKGJlZm9yZSlcbiAgICAucm93cyhkYXRhLmJlZm9yZV9jYXRlZ29yaWVzKVxuICAgIC5hZnRlcihkYXRhLmFmdGVyX2NhdGVnb3JpZXMpXG4gICAgLmRyYXcoKVxuXG4gIGNiLl9zdmcuc3R5bGUoXCJkaXNwbGF5XCIsXCJibG9ja1wiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCJhdXRvXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCJhdXRvXCIpXG5cblxuICByZXR1cm4gaW5uZXJcblxufVxuXG5mdW5jdGlvbiBkcmF3Q2F0ZWdvcnlEaWZmKHRhcmdldCxkYXRhKSB7XG5cbiAgZGlmZl9iYXIodGFyZ2V0KVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLnRpdGxlKFwiQ2F0ZWdvcnkgaW5kZXhpbmcgdmVyc3VzIGNvbXBcIilcbiAgICAudmFsdWVfYWNjZXNzb3IoXCJub3JtYWxpemVkX2RpZmZcIilcbiAgICAuZHJhdygpXG5cbn1cblxuZnVuY3Rpb24gZHJhd0NhdGVnb3J5KHRhcmdldCxkYXRhKSB7XG5cbiAgY29tcF9iYXIodGFyZ2V0KVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLnRpdGxlKFwiQ2F0ZWdvcmllcyB2aXNpdGVkIGZvciBmaWx0ZXJlZCB2ZXJzdXMgYWxsIHZpZXdzXCIpXG4gICAgLnBvcF92YWx1ZV9hY2Nlc3NvcihcInBvcFwiKVxuICAgIC5zYW1wX3ZhbHVlX2FjY2Vzc29yKFwic2FtcFwiKVxuICAgIC5kcmF3KClcblxufVxuXG5mdW5jdGlvbiBkcmF3S2V5d29yZHModGFyZ2V0LGRhdGEpIHtcblxuICBjb21wX2Jhcih0YXJnZXQpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAudGl0bGUoXCJLZXl3b3JkcyB2aXNpdGVkIGZvciBmaWx0ZXJlZCB2ZXJzdXMgYWxsIHZpZXdzXCIpXG4gICAgLnBvcF92YWx1ZV9hY2Nlc3NvcihcInBvcFwiKVxuICAgIC5zYW1wX3ZhbHVlX2FjY2Vzc29yKFwic2FtcFwiKVxuICAgIC5kcmF3KClcblxuXG59XG5cbmZ1bmN0aW9uIGRyYXdLZXl3b3JkRGlmZih0YXJnZXQsZGF0YSkge1xuXG4gIGRpZmZfYmFyKHRhcmdldClcbiAgICAuZGF0YShkYXRhKVxuICAgIC50aXRsZShcIktleXdvcmQgaW5kZXhpbmcgdmVyc3VzIGNvbXBcIilcbiAgICAudmFsdWVfYWNjZXNzb3IoXCJub3JtYWxpemVkX2RpZmZcIilcbiAgICAuZHJhdygpXG5cbn1cblxuZnVuY3Rpb24gZHJhd1RpbWVzZXJpZXModGFyZ2V0LGRhdGEscmFkaXVzX3NjYWxlKSB7XG4gIHZhciB3ID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJkaXYudGltZXNlcmllc1wiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJ0aW1lc2VyaWVzXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNjAlXCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIiwgXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMjdweFwiKVxuXG5cblxuICB2YXIgcSA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZGl2LnRpbWVzZXJpZXMtZGV0YWlsc1wiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJ0aW1lc2VyaWVzLWRldGFpbHNcIix0cnVlKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCI0MCVcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTVweFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiNTdweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgXCIjZTNlYmYwXCIpXG4gICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMjdweFwiKVxuXG5cblxuXG5cbiAgdmFyIHBvcCA9IGQzX3VwZGF0ZWFibGUocSxcIi5wb3BcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwicG9wXCIsdHJ1ZSlcblxuICBkM191cGRhdGVhYmxlKHBvcCxcIi5leFwiLFwic3BhblwiKVxuICAgIC5jbGFzc2VkKFwiZXhcIix0cnVlKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMHB4XCIpXG4gICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiZ3JleVwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG5cbiAgZDNfdXBkYXRlYWJsZShwb3AsXCIudGl0bGVcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIzcHhcIilcbiAgICAudGV4dChcImFsbFwiKVxuXG5cblxuICB2YXIgc2FtcCA9IGQzX3VwZGF0ZWFibGUocSxcIi5zYW1wXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInNhbXBcIix0cnVlKVxuXG4gIGQzX3VwZGF0ZWFibGUoc2FtcCxcIi5leFwiLFwic3BhblwiKVxuICAgIC5jbGFzc2VkKFwiZXhcIix0cnVlKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMHB4XCIpXG4gICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiIzA4MWQ1OFwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG5cblxuICBkM191cGRhdGVhYmxlKHNhbXAsXCIudGl0bGVcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIzcHhcIilcbiAgICAudGV4dChcImZpbHRlcmVkXCIpXG5cblxuICB2YXIgZGV0YWlscyA9IGQzX3VwZGF0ZWFibGUocSxcIi5kZWV0c1wiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJkZWV0c1wiLHRydWUpXG5cblxuXG5cbiAgZDNfdXBkYXRlYWJsZSh3LFwiaDNcIixcImgzXCIpXG4gICAgLnRleHQoXCJGaWx0ZXJlZCB2ZXJzdXMgQWxsIFZpZXdzXCIpXG4gICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMHB4XCIpXG4gICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG5cblxuXG5cblxuXG4gIHRpbWVzZXJpZXNbJ2RlZmF1bHQnXSh3KVxuICAgIC5kYXRhKHtcImtleVwiOlwieVwiLFwidmFsdWVzXCI6ZGF0YX0pXG4gICAgLmhlaWdodCg4MClcbiAgICAub24oXCJob3ZlclwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgIHZhciB4eCA9IHt9XG4gICAgICB4eFt4LmtleV0gPSB7c2FtcGxlOiB4LnZhbHVlLCBwb3B1bGF0aW9uOiB4LnZhbHVlMiB9XG4gICAgICBkZXRhaWxzLmRhdHVtKHh4KVxuXG4gICAgICBkM191cGRhdGVhYmxlKGRldGFpbHMsXCIudGV4dFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidGV4dFwiLHRydWUpXG4gICAgICAgIC50ZXh0KFwiQCBcIiArIHguaG91ciArIFwiOlwiICsgKHgubWludXRlLmxlbmd0aCA+IDEgPyB4Lm1pbnV0ZSA6IFwiMFwiICsgeC5taW51dGUpIClcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCI0OXB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxNXB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctcmlnaHRcIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIyMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKGRldGFpbHMsXCIucGllXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJwaWVcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjE1cHhcIilcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkYXRhID0gT2JqZWN0LmtleXMoeCkubWFwKGZ1bmN0aW9uKGspIHsgcmV0dXJuIHhba10gfSlbMF1cbiAgICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICAgIH0pXG4gICAgfSlcbiAgICAuZHJhdygpXG5cbn1cblxuXG5cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzdW1tYXJ5X3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU3VtbWFyeVZpZXcodGFyZ2V0KVxufVxuXG5TdW1tYXJ5Vmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpXG4gICAgfVxuICAsIHRpbWluZzogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRpbWluZ1wiLHZhbClcbiAgICB9XG4gICwgY2F0ZWdvcnk6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjYXRlZ29yeVwiLHZhbClcbiAgICB9XG4gICwga2V5d29yZHM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXl3b3Jkc1wiLHZhbClcbiAgICB9XG4gICwgYmVmb3JlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmVmb3JlXCIsdmFsKVxuICAgIH1cbiAgLCBhZnRlcjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFmdGVyXCIsdmFsKVxuICAgIH1cblxuXG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cblxuICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuLnN1bW1hcnktd3JhcCAudGFibGUtd3JhcHBlciB7IGJhY2tncm91bmQ6I2UzZWJmMDsgcGFkZGluZy10b3A6NXB4OyBwYWRkaW5nLWJvdHRvbToxMHB4IH1cbi5zdW1tYXJ5LXdyYXAgLnRhYmxlLXdyYXBwZXIgdHIgeyBib3JkZXItYm90dG9tOm5vbmUgfVxuLnN1bW1hcnktd3JhcCAudGFibGUtd3JhcHBlciB0aGVhZCB0ciB7IGJhY2tncm91bmQ6bm9uZSB9XG4uc3VtbWFyeS13cmFwIC50YWJsZS13cmFwcGVyIHRib2R5IHRyOmhvdmVyIHsgYmFja2dyb3VuZDpub25lIH1cbi5zdW1tYXJ5LXdyYXAgLnRhYmxlLXdyYXBwZXIgdHIgdGQgeyBib3JkZXItcmlnaHQ6MXB4IGRvdHRlZCAjY2NjO3RleHQtYWxpZ246Y2VudGVyIH1cbi5zdW1tYXJ5LXdyYXAgLnRhYmxlLXdyYXBwZXIgdHIgdGQ6bGFzdC1vZi10eXBlIHsgYm9yZGVyLXJpZ2h0Om5vbmUgfVxuICAqL30pXG5cbiAgZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QoXCJoZWFkXCIpLFwic3R5bGUjY3VzdG9tLXRhYmxlLWNzc1wiLFwic3R5bGVcIilcbiAgICAuYXR0cihcImlkXCIsXCJjdXN0b20tdGFibGUtY3NzXCIpXG4gICAgLnRleHQoQ1NTX1NUUklORy5yZXBsYWNlKFwiZnVuY3Rpb24gKCkgey8qXCIsXCJcIikucmVwbGFjZShcIiovfVwiLFwiXCIpKVxuXG5cblxuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuc3VtbWFyeS13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzdW1tYXJ5LXdyYXBcIix0cnVlKVxuXG4gICAgICBoZWFkZXIod3JhcClcbiAgICAgICAgLnRleHQoXCJTdW1tYXJ5XCIpXG4gICAgICAgIC5kcmF3KClcblxuXG4gICAgICB2YXIgdHN3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnRzLXJvd1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidHMtcm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgdmFyIHBpZXdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIucGllLXJvd1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicGllLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgIHZhciBjYXR3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmNhdC1yb3dcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImNhdC1yb3cgZGFzaC1yb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgICB2YXIga2V5d3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5rZXktcm93XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJrZXktcm93IGRhc2gtcm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgdmFyIGJhd3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5iYS1yb3dcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiYmEtcm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgdmFyIHN0cmVhbXdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuc3RyZWFtLWJhLXJvd1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJzdHJlYW0tYmEtcm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuXG5cblxuXG5cblxuXG4gICAgICB2YXIgcmFkaXVzX3NjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgLmRvbWFpbihbdGhpcy5fZGF0YS5kb21haW5zLnBvcHVsYXRpb24sdGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uXSlcbiAgICAgICAgLnJhbmdlKFsyMCwzNV0pXG5cblxuXG4gICAgICB0YWJsZShwaWV3cmFwKVxuICAgICAgICAuZGF0YSh7XCJrZXlcIjpcIlRcIixcInZhbHVlc1wiOlt0aGlzLmRhdGEoKV19KVxuICAgICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgICAgLnJlbmRlcihcImRvbWFpbnNcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICAgIH0pXG4gICAgICAgIC5yZW5kZXIoXCJhcnRpY2xlc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLmRhdHVtKClbeC5rZXldO1xuICAgICAgICAgIGJ1aWxkU3VtbWFyeUJsb2NrKGRhdGEsdGhpcyxyYWRpdXNfc2NhbGUseClcbiAgICAgICAgfSlcblxuICAgICAgICAucmVuZGVyKFwic2Vzc2lvbnNcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5kYXR1bSgpW3gua2V5XTtcbiAgICAgICAgICBidWlsZFN1bW1hcnlCbG9jayhkYXRhLHRoaXMscmFkaXVzX3NjYWxlLHgpXG4gICAgICAgIH0pXG4gICAgICAgIC5yZW5kZXIoXCJ2aWV3c1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLmRhdHVtKClbeC5rZXldO1xuICAgICAgICAgIGJ1aWxkU3VtbWFyeUJsb2NrKGRhdGEsdGhpcyxyYWRpdXNfc2NhbGUseClcbiAgICAgICAgfSlcbiAgICAgICAgLmRyYXcoKVxuXG5cbiAgICAgIGRyYXdUaW1lc2VyaWVzKHRzd3JhcCx0aGlzLl90aW1pbmcscmFkaXVzX3NjYWxlKVxuXG5cbiAgICAgIHRyeSB7XG4gICAgICBkcmF3Q2F0ZWdvcnkoY2F0d3JhcCx0aGlzLl9jYXRlZ29yeSlcbiAgICAgIGRyYXdDYXRlZ29yeURpZmYoY2F0d3JhcCx0aGlzLl9jYXRlZ29yeSlcbiAgICAgIH0gY2F0Y2goZSkge31cblxuICAgICAgLy9kcmF3S2V5d29yZHMoa2V5d3JhcCx0aGlzLl9rZXl3b3JkcylcbiAgICAgIC8vZHJhd0tleXdvcmREaWZmKGtleXdyYXAsdGhpcy5fa2V5d29yZHMpXG5cbiAgICAgIHZhciBpbm5lciA9IGRyYXdCZWZvcmVBbmRBZnRlcihiYXdyYXAsdGhpcy5fYmVmb3JlKVxuXG4gICAgICBzZWxlY3QoaW5uZXIpXG4gICAgICAgIC5vcHRpb25zKFtcbiAgICAgICAgICAgIHtcImtleVwiOlwiSW1wb3J0YW5jZVwiLFwidmFsdWVcIjpcInBlcmNlbnRfZGlmZlwifVxuICAgICAgICAgICwge1wia2V5XCI6XCJBY3Rpdml0eVwiLFwidmFsdWVcIjpcInNjb3JlXCJ9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIlBvcHVsYXRpb25cIixcInZhbHVlXCI6XCJwb3BcIn1cbiAgICAgICAgXSlcbiAgICAgICAgLnNlbGVjdGVkKHRoaXMuX2JlZm9yZS5zb3J0YnkgfHwgXCJcIilcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIHRoaXMub24oXCJiYS5zb3J0XCIpKVxuICAgICAgICAuZHJhdygpXG5cblxuICAgICAgZHJhd1N0cmVhbShzdHJlYW13cmFwLHRoaXMuX2JlZm9yZS5iZWZvcmVfY2F0ZWdvcmllcyx0aGlzLl9iZWZvcmUuYWZ0ZXJfY2F0ZWdvcmllcylcblxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuXG52YXIgYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKHgqNjApIH0pXG5idWNrZXRzID0gYnVja2V0cy5jb25jYXQoWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZygteCo2MCkgfSkpXG5cblxuZnVuY3Rpb24gbm9vcCgpe31cblxuZnVuY3Rpb24gZDNfY2xhc3ModGFyZ2V0LGNscyx0eXBlLGRhdGEpIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLlwiICsgY2xzLCB0eXBlIHx8IFwiZGl2XCIsZGF0YSlcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZnVuY3Rpb24gY2FsY0NhdGVnb3J5KGJlZm9yZV91cmxzLGFmdGVyX3VybHMpIHtcbiAgdmFyIHVybF9jYXRlZ29yeSA9IGJlZm9yZV91cmxzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgcFtjLnVybF0gPSBjLnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgcmV0dXJuIHBcbiAgfSx7fSlcblxuICB1cmxfY2F0ZWdvcnkgPSBhZnRlcl91cmxzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgcFtjLnVybF0gPSBjLnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgcmV0dXJuIHBcbiAgfSx1cmxfY2F0ZWdvcnkpXG5cbiAgcmV0dXJuIHVybF9jYXRlZ29yeVxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlZmluZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBSZWZpbmUodGFyZ2V0KVxufVxuXG5jbGFzcyBSZWZpbmUge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vbiA9IHt9XG4gIH1cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH1cbiAgc3RhZ2VzKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInN0YWdlc1wiLHZhbCkgfVxuXG4gIGJlZm9yZV91cmxzKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJlZm9yZV91cmxzXCIsdmFsKSB9XG4gIGFmdGVyX3VybHModmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWZ0ZXJfdXJsc1wiLHZhbCkgfVxuXG5cblxuICBvbihhY3Rpb24sIGZuKSB7XG4gICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICB2YXIgdGQgPSB0aGlzLl90YXJnZXRcbiAgICB2YXIgYmVmb3JlX3VybHMgPSB0aGlzLl9iZWZvcmVfdXJsc1xuICAgICAgLCBhZnRlcl91cmxzID0gdGhpcy5fYWZ0ZXJfdXJsc1xuICAgICAgLCBkID0gdGhpcy5fZGF0YVxuICAgICAgLCBzdGFnZXMgPSB0aGlzLl9zdGFnZXNcblxuXG4gICAgdmFyIHVybF9jYXRlZ29yeSA9IGNhbGNDYXRlZ29yeShiZWZvcmVfdXJscyxhZnRlcl91cmxzKVxuXG5cbiAgICAgICAgICB2YXIgdXJsX3ZvbHVtZSA9IGJlZm9yZV91cmxzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgICAgICBwW2MudXJsXSA9IChwW2MudXJsXSB8fCAwKSArIGMudmlzaXRzXG4gICAgICAgICAgICByZXR1cm4gcFxuICAgICAgICAgIH0se30pXG5cbiAgICAgICAgICB1cmxfdm9sdW1lID0gYWZ0ZXJfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICAgICAgcFtjLnVybF0gPSAocFtjLnVybF0gfHwgMCkgKyBjLnZpc2l0c1xuICAgICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgICB9LHVybF92b2x1bWUpXG5cblxuXG4gICAgICAgICAgdmFyIHNvcnRlZF91cmxzID0gZDMuZW50cmllcyh1cmxfdm9sdW1lKS5zb3J0KChwLGMpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBkMy5kZXNjZW5kaW5nKHAudmFsdWUsYy52YWx1ZSlcbiAgICAgICAgICB9KVxuXG5cbiAgICAgICAgICB2YXIgYmVmb3JlX3VybF90cyA9IGJlZm9yZV91cmxzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgICAgICBwW2MudXJsXSA9IHBbYy51cmxdIHx8IHt9XG4gICAgICAgICAgICBwW2MudXJsXVtcInVybFwiXSA9IGMudXJsXG5cbiAgICAgICAgICAgIHBbYy51cmxdW2MudGltZV9kaWZmX2J1Y2tldF0gPSBjLnZpc2l0c1xuICAgICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgICB9LHt9KVxuXG4gICAgICAgICAgdmFyIGFmdGVyX3VybF90cyA9IGFmdGVyX3VybHMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgICAgIHBbYy51cmxdID0gcFtjLnVybF0gfHwge31cbiAgICAgICAgICAgIHBbYy51cmxdW1widXJsXCJdID0gYy51cmxcblxuICAgICAgICAgICAgcFtjLnVybF1bXCItXCIgKyBjLnRpbWVfZGlmZl9idWNrZXRdID0gYy52aXNpdHNcbiAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgfSxiZWZvcmVfdXJsX3RzKVxuXG5cblxuICAgICAgICAgIHZhciB0b19kcmF3ID0gc29ydGVkX3VybHMuc2xpY2UoMCwxMDAwKS5tYXAoeCA9PiBhZnRlcl91cmxfdHNbeC5rZXldKVxuLm1hcChmdW5jdGlvbih4KXtcbiAgeC50b3RhbCA9IGQzLnN1bShidWNrZXRzLm1hcChmdW5jdGlvbihiKSB7IHJldHVybiB4W2JdIHx8IDAgfSkpXG4gIHJldHVybiB4XG59KVxuXG52YXIga3dfdG9fZHJhdyA9IGQzLmVudHJpZXMoYWZ0ZXJfdXJsX3RzKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG5cbiAgYy5rZXkudG9Mb3dlckNhc2UoKS5zcGxpdChkLmRvbWFpbilbMV0uc3BsaXQoXCIvXCIpLnJldmVyc2UoKVswXS5yZXBsYWNlKFwiX1wiLFwiLVwiKS5zcGxpdChcIi1cIikubWFwKHggPT4ge1xuICAgIHZhciB2YWx1ZXMgPSBbXCJ0aGF0XCIsXCJ0aGlzXCIsXCJ3aGF0XCIsXCJiZXN0XCIsXCJtb3N0XCIsXCJmcm9tXCIsXCJ5b3VyXCIsXCJoYXZlXCIsXCJmaXJzdFwiLFwid2lsbFwiLFwidGhhblwiLFwic2F5c1wiLFwibGlrZVwiLFwiaW50b1wiLFwiYWZ0ZXJcIixcIndpdGhcIl1cbiAgICBpZiAoeC5tYXRjaCgvXFxkKy9nKSA9PSBudWxsICYmIHZhbHVlcy5pbmRleE9mKHgpID09IC0xICYmIHguaW5kZXhPZihcIixcIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiP1wiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCIuXCIpID09IC0xICYmIHguaW5kZXhPZihcIjpcIikgPT0gLTEgJiYgcGFyc2VJbnQoeCkgIT0geCAmJiB4Lmxlbmd0aCA+IDMpIHtcbiAgICAgIHBbeF0gPSBwW3hdIHx8IHt9XG4gICAgICBwW3hdLmtleSA9IHhcbiAgICAgIE9iamVjdC5rZXlzKGMudmFsdWUpLm1hcChxID0+IHtcbiAgICAgICAgcFt4XVtxXSA9IChwW3hdW3FdIHx8IDApICsgYy52YWx1ZVtxXVxuICAgICAgfSlcbiAgICB9XG4gICAgcmV0dXJuIHBcbiAgfSlcbiAgcmV0dXJuIHBcbn0se30pXG5cblxua3dfdG9fZHJhdyA9IE9iamVjdC5rZXlzKGt3X3RvX2RyYXcpLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiBrd190b19kcmF3W2tdIH0pLm1hcChmdW5jdGlvbih4KXtcbiAgeC50b3RhbCA9IGQzLnN1bShidWNrZXRzLm1hcChmdW5jdGlvbihiKSB7IHJldHVybiB4W2JdIHx8IDAgfSkpXG4gIHJldHVybiB4XG59KS5zb3J0KChwLGMpID0+IHtcbiAgcmV0dXJuIGMudG90YWwgLSBwLnRvdGFsXG59KVxuXG5cblxuXG4gICAgICAgICAgdmFyIHN1bW1hcnlfcm93ID0gZDNfY2xhc3ModGQsXCJzdW1tYXJ5LXJvd1wiKS5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJyZWxhdGl2ZVwiKVxuICAgICAgICAgIGQzX2NsYXNzKHRkLFwiYWN0aW9uLWhlYWRlclwiKS5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTZweFwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpLnRleHQoXCJFeHBsb3JlIGFuZCBSZWZpbmVcIikuc3R5bGUoXCJwYWRkaW5nXCIsXCIxMHB4XCIpXG4gICAgICAgICAgdmFyIHRpdGxlX3JvdyA9IGQzX2NsYXNzKHRkLFwidGl0bGUtcm93XCIpXG5cbiAgICAgICAgICB2YXIgZXhwYW5zaW9uX3JvdyA9IGQzX2NsYXNzKHRkLFwiZXhwYW5zaW9uLXJvd1wiKVxuICAgICAgICAgIHZhciBmb290ZXJfcm93ID0gZDNfY2xhc3ModGQsXCJmb290ZXItcm93XCIpLnN0eWxlKFwibWluLWhlaWdodFwiLFwiMTBweFwiKS5zdHlsZShcIm1hcmdpbi10b3BcIixcIjE1cHhcIilcblxuICAgICAgICAgIGZ1bmN0aW9uIGJ1aWxkRmlsdGVySW5wdXQoeCkge1xuICAgICAgICAgICAgICB0aGlzLm9uKFwic29tZXRoaW5nXCIpKHgpXG4gICAgICAgICAgICAgIC8vc2VsZWN0X3ZhbHVlLnZhbHVlICs9IChzZWxlY3RfdmFsdWUudmFsdWUgPyBcIixcIiA6IFwiXCIpICsgeC5rZXlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkM19jbGFzcyhzdW1tYXJ5X3JvdyxcInRpdGxlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjE2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCI0MHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCI1cHhcIilcbiAgICAgICAgICAgIC50ZXh0KFwiQmVmb3JlIGFuZCBBZnRlcjogXCIgKyBkLmRvbWFpbilcblxuICAgICAgICAgIHZhciBvcHRpb25zID0gW1xuICAgICAgICAgICAgICB7XCJrZXlcIjpcIkFsbFwiLFwidmFsdWVcIjpcImFsbFwiLCBcInNlbGVjdGVkXCI6MX1cbiAgICAgICAgICAgICwge1wia2V5XCI6XCJDb25zaWRlcmF0aW9uXCIsXCJ2YWx1ZVwiOlwiY29uc2lkZXJhdGlvblwiLCBcInNlbGVjdGVkXCI6MH1cbiAgICAgICAgICAgICwge1wia2V5XCI6XCJWYWxpZGF0aW9uXCIsXCJ2YWx1ZVwiOlwidmFsaWRhdGlvblwiLCBcInNlbGVjdGVkXCI6MH1cbiAgICAgICAgICBdXG5cbiAgICAgICAgICB2YXIgdHN3ID0gMjUwO1xuXG4gICAgICAgICAgdmFyIHRpbWVzZXJpZXMgPSBkM19jbGFzcyhzdW1tYXJ5X3JvdyxcInRpbWVzZXJpZXNcIixcInN2Z1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiYmxvY2tcIilcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiYXV0b1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMzBweFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLHRzdyArIFwicHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsXCI3MHB4XCIpXG5cblxuXG4gICAgICAgICAgdmFyIGJlZm9yZV9yb2xsdXAgPSBkMy5uZXN0KClcbiAgICAgICAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0fSlcbiAgICAgICAgICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gZDMuc3VtKHgseSA9PiB5LnZpc2l0cykgfSlcbiAgICAgICAgICAgIC5tYXAoYmVmb3JlX3VybHMpXG5cbiAgICAgICAgICB2YXIgYWZ0ZXJfcm9sbHVwID0gZDMubmVzdCgpXG4gICAgICAgICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFwiLVwiICsgeC50aW1lX2RpZmZfYnVja2V0fSlcbiAgICAgICAgICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gZDMuc3VtKHgseSA9PiB5LnZpc2l0cykgfSlcbiAgICAgICAgICAgIC5tYXAoYWZ0ZXJfdXJscylcblxuICAgICAgICAgIHZhciBvdmVyYWxsX3JvbGx1cCA9IGJ1Y2tldHMubWFwKHggPT4gYmVmb3JlX3JvbGx1cFt4XSB8fCBhZnRlcl9yb2xsdXBbeF0gfHwgMClcblxuXG5cbiAgICAgICAgICBzaW1wbGVUaW1lc2VyaWVzKHRpbWVzZXJpZXMsb3ZlcmFsbF9yb2xsdXAsdHN3KVxuICAgICAgICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJtaWRkbGVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIDU1KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgdHN3LzIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCB0c3cvMilcblxuICAgICAgICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJtaWRkbGUtdGV4dFwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHRzdy8yKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIDY3KVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcIm1pZGRsZVwiKVxuICAgICAgICAgICAgLnRleHQoXCJPbi1zaXRlXCIpXG5cblxuICAgICAgICAgIHZhciBiZWZvcmVfcG9zLCBhZnRlcl9wb3M7XG5cbiAgICAgICAgICBidWNrZXRzLm1hcChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgICBpZiAoc3RhZ2VzLmNvbnNpZGVyYXRpb24gPT0geCkgYmVmb3JlX3BvcyA9IGlcbiAgICAgICAgICAgICBpZiAoc3RhZ2VzLnZhbGlkYXRpb24gPT0geCkgYWZ0ZXJfcG9zID0gaVxuXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIHZhciB1bml0X3NpemUgPSB0c3cvYnVja2V0cy5sZW5ndGhcblxuICAgICAgICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJiZWZvcmVcIixcImxpbmVcIilcbiAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCAzOSlcbiAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgNDUpXG4gICAgICAgICAgICAuYXR0cihcIngxXCIsIHVuaXRfc2l6ZSpiZWZvcmVfcG9zKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCB1bml0X3NpemUqYmVmb3JlX3BvcylcblxuICAgICAgICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJiZWZvcmUtdGV4dFwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHVuaXRfc2l6ZSpiZWZvcmVfcG9zIC0gOClcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCA0OClcblxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgICAgICAgLnRleHQoXCJDb25zaWRlcmF0aW9uXCIpXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwid2luZG93XCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgNDUpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIDQ1KVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCB1bml0X3NpemUqKGJlZm9yZV9wb3MpKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCB1bml0X3NpemUqKGFmdGVyX3BvcysxKSsxKVxuXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYWZ0ZXJcIixcImxpbmVcIilcbiAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCAzOSlcbiAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgNDUpXG4gICAgICAgICAgICAuYXR0cihcIngxXCIsIHVuaXRfc2l6ZSooYWZ0ZXJfcG9zKzEpKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCB1bml0X3NpemUqKGFmdGVyX3BvcysxKSlcblxuICAgICAgICAgIGQzX2NsYXNzKHRpbWVzZXJpZXMsXCJhZnRlci10ZXh0XCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkgKyA4KVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIDQ4KVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcInN0YXJ0XCIpXG4gICAgICAgICAgICAudGV4dChcIlZhbGlkYXRpb25cIilcblxuXG5cbiAgICAgICAgICBmdW5jdGlvbiBzZWxlY3RPcHRpb25SZWN0KG9wdGlvbnMpIHtcblxuICAgICAgICAgICAgdmFyIHN1YnNldCA9IHRkLnNlbGVjdEFsbChcInN2Z1wiKS5zZWxlY3RBbGwoXCJyZWN0XCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLHVuZGVmaW5lZCkuZmlsdGVyKCh4LGkpID0+IHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBvcHRpb25zLmZpbHRlcih4ID0+IHguc2VsZWN0ZWQpWzBdLnZhbHVlXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiYWxsXCIpIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcImNvbnNpZGVyYXRpb25cIikgcmV0dXJuIChpIDwgYmVmb3JlX3BvcykgfHwgKGkgPiBidWNrZXRzLmxlbmd0aC8yIC0gMSApXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwidmFsaWRhdGlvblwiKSByZXR1cm4gKGkgPCBidWNrZXRzLmxlbmd0aC8yICkgfHwgKGkgPiBhZnRlcl9wb3MpXG4gICAgICAgICAgICAgIH0pXG5cblxuICAgICAgICAgICAgc3Vic2V0LmF0dHIoXCJmaWxsXCIsXCJncmV5XCIpXG4gICAgICAgICAgfVxuXG5cblxuICAgICAgICAgIHNlbGVjdE9wdGlvblJlY3Qob3B0aW9ucylcblxuICAgICAgICAgIHZhciBvcHRzID0gZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJvcHRpb25zXCIsXCJkaXZcIixvcHRpb25zKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMjBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidG9wXCIsXCIzNXB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJsZWZ0XCIsXCIyMDBweFwiKVxuXG5cbiAgICAgICAgICBmdW5jdGlvbiBidWlsZE9wdGlvbnMob3B0aW9ucykge1xuXG5cbiAgICAgICAgICAgIGQzX3NwbGF0KG9wdHMsXCIuc2hvdy1idXR0b25cIixcImFcIixvcHRpb25zLHggPT4geC5rZXkpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwic2hvdy1idXR0b25cIix0cnVlKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInNlbGVjdGVkXCIseCA9PiB4LnNlbGVjdGVkKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMThweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjVweFwiKVxuICAgICAgICAgICAgICAudGV4dCh4ID0+IHgua2V5KVxuICAgICAgICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuX19kYXRhX18ubWFwKHogPT4gei5zZWxlY3RlZCA9IDApXG4gICAgICAgICAgICAgICAgeC5zZWxlY3RlZCA9IDFcbiAgICAgICAgICAgICAgICBidWlsZE9wdGlvbnModGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fKVxuICAgICAgICAgICAgICAgIGlmICh4LnZhbHVlID09IFwiY29uc2lkZXJhdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICBidWlsZFVybFNlbGVjdGlvbihjb25zaWRlcmF0aW9uX3RvX2RyYXcpXG4gICAgICAgICAgICAgICAgICBidWlsZEtleXdvcmRTZWxlY3Rpb24oY29uc2lkZXJhdGlvbl9rd190b19kcmF3KVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoeC52YWx1ZSA9PSBcInZhbGlkYXRpb25cIikge1xuICAgICAgICAgICAgICAgICAgYnVpbGRVcmxTZWxlY3Rpb24odmFsaWRhdGlvbl90b19kcmF3KVxuICAgICAgICAgICAgICAgICAgYnVpbGRLZXl3b3JkU2VsZWN0aW9uKHZhbGlkYXRpb25fa3dfdG9fZHJhdylcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgYnVpbGRVcmxTZWxlY3Rpb24odG9fZHJhdylcbiAgICAgICAgICAgICAgICAgIGJ1aWxkS2V5d29yZFNlbGVjdGlvbihrd190b19kcmF3KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNlbGVjdE9wdGlvblJlY3QodGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fKVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYnVpbGRPcHRpb25zKG9wdGlvbnMpXG5cbiAgICAgICAgICBkM19jbGFzcyhzdW1tYXJ5X3JvdyxcImRlc2NyaXB0aW9uXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJhYnNvbHV0ZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0b3BcIixcIjM1cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInJpZ2h0XCIsXCIyMDBweFwiKVxuICAgICAgICAgICAgLnRleHQoXCJTZWxlY3QgZG9tYWlucyBhbmQga2V5d29yZHMgdG8gYnVpbGQgYW5kIHJlZmluZSB5b3VyIGdsb2JhbCBmaWx0ZXJcIilcblxuXG5cblxuXG4gICAgICAgICAgdmFyIHVybHNfc3VtbWFyeSA9IGQzX2NsYXNzKHN1bW1hcnlfcm93LFwidXJscy1zdW1tYXJ5XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuICAgICAgICAgIHZhciBrd3Nfc3VtbWFyeSA9IGQzX2NsYXNzKHN1bW1hcnlfcm93LFwia3dzLXN1bW1hcnlcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cblxuICAgICAgICAgIGQzX2NsYXNzKHVybHNfc3VtbWFyeSxcInRpdGxlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxNHB4XCIpXG4gICAgICAgICAgICAudGV4dChcIlVSTCBTdW1tYXJ5XCIpXG5cbiAgICAgICAgICBkM19jbGFzcyhrd3Nfc3VtbWFyeSxcInRpdGxlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxNHB4XCIpXG4gICAgICAgICAgICAudGV4dChcIktleXdvcmQgU3VtbWFyeVwiKVxuXG5cblxuICAgICAgICAgIHZhciBjb25zaWRlcmF0aW9uX2J1Y2tldHMgPSBidWNrZXRzLmZpbHRlcigoeCxpKSA9PiAhKChpIDwgYmVmb3JlX3BvcykgfHwgKGkgPiBidWNrZXRzLmxlbmd0aC8yIC0gMSApKSApXG4gICAgICAgICAgICAsIHZhbGlkYXRpb25fYnVja2V0cyA9IGJ1Y2tldHMuZmlsdGVyKCh4LGkpID0+ICEoKGkgPCBidWNrZXRzLmxlbmd0aC8yICkgfHwgKGkgPiBhZnRlcl9wb3MpKSApXG5cbiAgICAgICAgICB2YXIgY29uc2lkZXJhdGlvbl90b19kcmF3ID0gdG9fZHJhdy5maWx0ZXIoeCA9PiBjb25zaWRlcmF0aW9uX2J1Y2tldHMucmVkdWNlKChwLGMpID0+IHsgcCArPSB4W2NdIHx8IDA7IHJldHVybiBwfSwwKSApXG4gICAgICAgICAgICAsIHZhbGlkYXRpb25fdG9fZHJhdyA9IHRvX2RyYXcuZmlsdGVyKHggPT4gdmFsaWRhdGlvbl9idWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7IHAgKz0geFtjXSB8fCAwOyByZXR1cm4gcH0sMCkgKVxuXG4gICAgICAgICAgZnVuY3Rpb24gYXZnVmlld3ModG9fZHJhdykge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHRvX2RyYXcucmVkdWNlKChwLGMpID0+IHAgKyBjLnRvdGFsLDApL3RvX2RyYXcubGVuZ3RoKVxuICAgICAgICAgIH1cbiAgICAgICAgICBmdW5jdGlvbiBtZWRpYW5WaWV3cyh0b19kcmF3KSB7XG4gICAgICAgICAgICByZXR1cm4gKHRvX2RyYXdbcGFyc2VJbnQodG9fZHJhdy5sZW5ndGgvMildIHx8IHt9KS50b3RhbCB8fCAwXG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgICB2YXIgdXJsX3N1bW1hcnlfZGF0YSA9IFtcbiAgICAgICAgICAgICAge1wibmFtZVwiOlwiRGlzdGluY3QgVVJMc1wiLCBcImFsbFwiOiB0b19kcmF3Lmxlbmd0aCwgXCJjb25zaWRlcmF0aW9uXCI6IGNvbnNpZGVyYXRpb25fdG9fZHJhdy5sZW5ndGgsIFwidmFsaWRhdGlvblwiOiB2YWxpZGF0aW9uX3RvX2RyYXcubGVuZ3RoIH1cbiAgICAgICAgICAgICwge1wibmFtZVwiOlwiQXZlcmFnZSBWaWV3c1wiLCBcImFsbFwiOiBhdmdWaWV3cyh0b19kcmF3KSwgXCJjb25zaWRlcmF0aW9uXCI6IGF2Z1ZpZXdzKGNvbnNpZGVyYXRpb25fdG9fZHJhdyksIFwidmFsaWRhdGlvblwiOiBhdmdWaWV3cyh2YWxpZGF0aW9uX3RvX2RyYXcpICB9XG4gICAgICAgICAgICAsIHtcIm5hbWVcIjpcIk1lZGlhbiBWaWV3c1wiLCBcImFsbFwiOiBtZWRpYW5WaWV3cyh0b19kcmF3KSwgXCJjb25zaWRlcmF0aW9uXCI6IG1lZGlhblZpZXdzKGNvbnNpZGVyYXRpb25fdG9fZHJhdyksIFwidmFsaWRhdGlvblwiOiBtZWRpYW5WaWV3cyh2YWxpZGF0aW9uX3RvX2RyYXcpICB9XG4gICAgICAgICAgXVxuXG4gICAgICAgICAgdmFyIHV3cmFwID0gZDNfY2xhc3ModXJsc19zdW1tYXJ5LFwid3JhcFwiKS5zdHlsZShcIndpZHRoXCIsXCI5MCVcIilcblxuXG4gICAgICAgICAgdGFibGUodXdyYXApXG4gICAgICAgICAgICAuZGF0YSh7XCJ2YWx1ZXNcIjp1cmxfc3VtbWFyeV9kYXRhfSlcbiAgICAgICAgICAgIC5za2lwX29wdGlvbih0cnVlKVxuICAgICAgICAgICAgLmhlYWRlcnMoW1xuICAgICAgICAgICAgICAgIHtcImtleVwiOlwibmFtZVwiLFwidmFsdWVcIjpcIlwifVxuICAgICAgICAgICAgICAsIHtcImtleVwiOlwiYWxsXCIsXCJ2YWx1ZVwiOlwiQWxsXCJ9XG4gICAgICAgICAgICAgICwge1wia2V5XCI6XCJjb25zaWRlcmF0aW9uXCIsXCJ2YWx1ZVwiOlwiQ29uc2lkZXJhdGlvblwifVxuICAgICAgICAgICAgICAsIHtcImtleVwiOlwidmFsaWRhdGlvblwiLFwidmFsdWVcIjpcIlZhbGlkYXRpb25cIn1cbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgICAuX3RhcmdldC5zZWxlY3RBbGwoXCIudGFibGUtd3JhcHBlclwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS13cmFwcGVyXCIsZmFsc2UpXG5cblxuICAgICAgICAgIHZhciBjb25zaWRlcmF0aW9uX2t3X3RvX2RyYXcgPSBrd190b19kcmF3LmZpbHRlcih4ID0+IGNvbnNpZGVyYXRpb25fYnVja2V0cy5yZWR1Y2UoKHAsYykgPT4geyBwICs9IHhbY10gfHwgMDsgcmV0dXJuIHB9LDApIClcbiAgICAgICAgICAgICwgdmFsaWRhdGlvbl9rd190b19kcmF3ID0ga3dfdG9fZHJhdy5maWx0ZXIoeCA9PiB2YWxpZGF0aW9uX2J1Y2tldHMucmVkdWNlKChwLGMpID0+IHsgcCArPSB4W2NdIHx8IDA7IHJldHVybiBwfSwwKSApXG5cblxuICAgICAgICAgIHZhciBrd3Nfc3VtbWFyeV9kYXRhID0gW1xuICAgICAgICAgICAgICB7XCJuYW1lXCI6XCJEaXN0aW5jdCBLZXl3b3Jkc1wiLCBcImFsbFwiOiBrd190b19kcmF3Lmxlbmd0aCwgXCJjb25zaWRlcmF0aW9uXCI6IGNvbnNpZGVyYXRpb25fa3dfdG9fZHJhdy5sZW5ndGgsIFwidmFsaWRhdGlvblwiOiB2YWxpZGF0aW9uX2t3X3RvX2RyYXcubGVuZ3RoIH1cbiAgICAgICAgICAgICwge1wibmFtZVwiOlwiQXZlcmFnZSBWaWV3c1wiLCBcImFsbFwiOiBhdmdWaWV3cyhrd190b19kcmF3KSwgXCJjb25zaWRlcmF0aW9uXCI6IGF2Z1ZpZXdzKGNvbnNpZGVyYXRpb25fa3dfdG9fZHJhdyksIFwidmFsaWRhdGlvblwiOiBhdmdWaWV3cyh2YWxpZGF0aW9uX2t3X3RvX2RyYXcpICB9XG4gICAgICAgICAgICAsIHtcIm5hbWVcIjpcIk1lZGlhbiBWaWV3c1wiLCBcImFsbFwiOiBtZWRpYW5WaWV3cyhrd190b19kcmF3KSwgXCJjb25zaWRlcmF0aW9uXCI6IG1lZGlhblZpZXdzKGNvbnNpZGVyYXRpb25fa3dfdG9fZHJhdyksIFwidmFsaWRhdGlvblwiOiBtZWRpYW5WaWV3cyh2YWxpZGF0aW9uX2t3X3RvX2RyYXcpICB9XG4gICAgICAgICAgXVxuXG4gICAgICAgICAgdmFyIGt3cmFwID0gZDNfY2xhc3Moa3dzX3N1bW1hcnksXCJ3cmFwXCIpLnN0eWxlKFwid2lkdGhcIixcIjkwJVwiKVxuXG4gICAgICAgICAgdGFibGUoa3dyYXApXG4gICAgICAgICAgICAuZGF0YSh7XCJ2YWx1ZXNcIjprd3Nfc3VtbWFyeV9kYXRhfSlcbiAgICAgICAgICAgIC5za2lwX29wdGlvbih0cnVlKVxuICAgICAgICAgICAgLmhlYWRlcnMoW1xuICAgICAgICAgICAgICAgIHtcImtleVwiOlwibmFtZVwiLFwidmFsdWVcIjpcIlwifVxuICAgICAgICAgICAgICAsIHtcImtleVwiOlwiYWxsXCIsXCJ2YWx1ZVwiOlwiQWxsXCJ9XG4gICAgICAgICAgICAgICwge1wia2V5XCI6XCJjb25zaWRlcmF0aW9uXCIsXCJ2YWx1ZVwiOlwiQ29uc2lkZXJhdGlvblwifVxuICAgICAgICAgICAgICAsIHtcImtleVwiOlwidmFsaWRhdGlvblwiLFwidmFsdWVcIjpcIlZhbGlkYXRpb25cIn1cbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgICAuX3RhcmdldC5zZWxlY3RBbGwoXCIudGFibGUtd3JhcHBlclwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS13cmFwcGVyXCIsZmFsc2UpXG5cblxuXG5cblxuICAgICAgICAgIHZhciBldWggPSBkM19jbGFzcyh0aXRsZV9yb3csXCJleHBhbnNpb24tdXJscy10aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICBkM19jbGFzcyhldWgsXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI2NXB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICAgIC50ZXh0KFwiVVJMXCIpXG5cbiAgICAgICAgICBkM19jbGFzcyhldWgsXCJ2aWV3XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICAgICAgICAudGV4dChcIlZpZXdzXCIpXG5cbiAgICAgICAgICB2YXIgc3ZnX2xlZ2VuZCA9IGQzX2NsYXNzKGV1aCxcImxlZ2VuZFwiLFwic3ZnXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcIi5iZWZvcmVcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLFwiMzBcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC50ZXh0KFwiQmVmb3JlXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCIuYWZ0ZXJcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLFwiOTBcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC50ZXh0KFwiQWZ0ZXJcIilcblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIDM2KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgNjApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCA2MClcblxuXG5cblxuICAgICAgICAgIHZhciBla2ggPSBkM19jbGFzcyh0aXRsZV9yb3csXCJleHBhbnNpb24ta3dzLXRpdGxlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuICAgICAgICAgIGQzX2NsYXNzKGVraCxcInRpdGxlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjY1cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgIC50ZXh0KFwiS2V5d29yZHNcIilcblxuICAgICAgICAgIGQzX2NsYXNzKGVraCxcInZpZXdcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAudGV4dChcIlZpZXdzXCIpXG5cbiAgICAgICAgICB2YXIgc3ZnX2xlZ2VuZCA9IGQzX2NsYXNzKGVraCxcImxlZ2VuZFwiLFwic3ZnXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcIi5iZWZvcmVcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLFwiMzBcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC50ZXh0KFwiQmVmb3JlXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCIuYWZ0ZXJcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLFwiOTBcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC50ZXh0KFwiQWZ0ZXJcIilcblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIDM2KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgNjApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCA2MClcblxuXG5cblxuXG5cblxuICAgICAgICAgIGZ1bmN0aW9uIGJ1aWxkVXJsU2VsZWN0aW9uKHRvX2RyYXcpIHtcbiAgICAgICAgICAgIHZhciBleHBhbnNpb24gPSBkM19jbGFzcyhleHBhbnNpb25fcm93LFwiZXhwYW5zaW9uLXVybHNcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzY3JvbGxib3hcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cblxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXgtaGVpZ2h0XCIsXCIyNTBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwic2Nyb2xsXCIpXG5cbiAgICAgICAgICAgIGV4cGFuc2lvbi5odG1sKFwiXCIpXG5cbiAgICAgICAgICAgIHZhciB1cmxfcm93ID0gZDNfc3BsYXQoZXhwYW5zaW9uLFwiLnVybC1yb3dcIixcImRpdlwiLHRvX2RyYXcuc2xpY2UoMCw1MDApLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudXJsIH0pXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwidXJsLXJvd1wiLHRydWUpXG5cbiAgICAgICAgICAgIHZhciB1cmxfbmFtZSA9IGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5uYW1lXCIsXCJkaXZcIikuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjYwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcImhpZGRlblwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcblxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZSh1cmxfbmFtZSxcImlucHV0XCIsXCJpbnB1dFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSh4KVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBkM19jbGFzcyh1cmxfbmFtZSxcInVybFwiLCBcImFcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtb3ZlcmZsb3dcIixcImVsbGlwc2lzXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMzVweFwiKVxuICAgICAgICAgICAgICAudGV4dCh4ID0+IHgudXJsLnNwbGl0KGQuZG9tYWluKVsxXSB8fCB4LnVybCApXG4gICAgICAgICAgICAgIC5hdHRyKFwiaHJlZlwiLCB4ID0+IHgudXJsKVxuICAgICAgICAgICAgICAuYXR0cihcInRhcmdldFwiLCBcIl9ibGFua1wiKVxuXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubnVtYmVyXCIsXCJkaXZcIikuY2xhc3NlZChcIm51bWJlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEzcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKSB9KVxuXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5wbG90XCIsXCJzdmdcIikuY2xhc3NlZChcInBsb3RcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlcyA9IGJ1Y2tldHMubWFwKGZ1bmN0aW9uKGIpIHsgcmV0dXJuIHhbYl0gfHwgMCB9KVxuICAgICAgICAgICAgICAgIHNpbXBsZVRpbWVzZXJpZXMoZHRoaXMsdmFsdWVzLDEyMCwyMClcbiAgICAgICAgICAgICAgICBkM191cGRhdGVhYmxlKGR0aGlzLFwibGluZVwiLFwibGluZVwiKVxuICAgICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIDIwKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCA2MClcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNjApXG5cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG5cblxuICAgICAgICAgIGZ1bmN0aW9uIGJ1aWxkS2V5d29yZFNlbGVjdGlvbihrd190b19kcmF3KSB7XG4gICAgICAgICAgICB2YXIgZXhwYW5zaW9uID0gZDNfY2xhc3MoZXhwYW5zaW9uX3JvdyxcImV4cGFuc2lvbi1rZXl3b3Jkc1wiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInNjcm9sbGJveFwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXgtaGVpZ2h0XCIsXCIyNTBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwic2Nyb2xsXCIpXG5cbiAgICAgICAgICAgIGV4cGFuc2lvbi5odG1sKFwiXCIpXG5cbiAgICAgICAgICAgIHZhciB1cmxfcm93ID0gZDNfc3BsYXQoZXhwYW5zaW9uLFwiLnVybC1yb3dcIixcImRpdlwiLGt3X3RvX2RyYXcuc2xpY2UoMCw1MDApLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwidXJsLXJvd1wiLHRydWUpXG5cbiAgICAgICAgICAgIHZhciBrd19uYW1lID0gZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm5hbWVcIixcImRpdlwiKS5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwiaGlkZGVuXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKGt3X25hbWUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSh4KVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBkM19jbGFzcyhrd19uYW1lLFwidXJsXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtb3ZlcmZsb3dcIixcImVsbGlwc2lzXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjM1cHhcIilcbiAgICAgICAgICAgICAgLnRleHQoeCA9PiB4LmtleSApXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5udW1iZXJcIixcImRpdlwiKS5jbGFzc2VkKFwibnVtYmVyXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTNweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGQzLnN1bShidWNrZXRzLm1hcChmdW5jdGlvbihiKSB7IHJldHVybiB4W2JdIHx8IDAgfSkpIH0pXG5cblxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLnBsb3RcIixcInN2Z1wiKS5jbGFzc2VkKFwicGxvdFwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWVzID0gYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pXG4gICAgICAgICAgICAgICAgc2ltcGxlVGltZXNlcmllcyhkdGhpcyx2YWx1ZXMsMTIwLDIwKVxuICAgICAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUoZHRoaXMsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgMjApXG4gICAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDYwKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCA2MClcblxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGJ1aWxkVXJsU2VsZWN0aW9uKHRvX2RyYXcpXG4gICAgICAgICAgYnVpbGRLZXl3b3JkU2VsZWN0aW9uKGt3X3RvX2RyYXcpXG5cblxuXG5cblxuICB9XG5cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgdGFibGUgZnJvbSAndGFibGUnXG5pbXBvcnQgdGltZV9zZXJpZXMgZnJvbSAnLi4vZ2VuZXJpYy90aW1lc2VyaWVzJ1xuaW1wb3J0IHJlZmluZSBmcm9tICcuL3JlZmluZSdcblxuXG5pbXBvcnQge2RyYXdTdHJlYW19IGZyb20gJy4vc3VtbWFyeV92aWV3J1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICdjaGFydCdcblxuZnVuY3Rpb24gbm9vcCgpe31cblxuZnVuY3Rpb24gZDNfY2xhc3ModGFyZ2V0LGNscyx0eXBlLGRhdGEpIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLlwiICsgY2xzLCB0eXBlIHx8IFwiZGl2XCIsZGF0YSlcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZWxhdGl2ZV90aW1pbmcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgUmVsYXRpdmVUaW1pbmcodGFyZ2V0KVxufVxuXG5jbGFzcyBSZWxhdGl2ZVRpbWluZyB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuX29uID0ge31cbiAgfVxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcblxuICBvbihhY3Rpb24sIGZuKSB7XG4gICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuXG4gIGRyYXcoKSB7XG5cblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGFcbiAgICB2YXIgd3JhcCA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcInN1bW1hcnktd3JhcFwiKVxuXG4gICAgaGVhZGVyKHdyYXApXG4gICAgICAudGV4dChcIkJlZm9yZSBhbmQgQWZ0ZXJcIilcbiAgICAgIC5kcmF3KClcblxuICAgIHZhciBiYXdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuYmEtcm93XCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcImJhLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCI2MHB4XCIpXG5cbiAgICB0cnkge1xuICAgICAgdmFyIHN0YWdlcyA9IGRyYXdTdHJlYW0oYmF3cmFwLHRoaXMuX2RhdGEuYmVmb3JlX2NhdGVnb3JpZXMsdGhpcy5fZGF0YS5hZnRlcl9jYXRlZ29yaWVzKVxuICAgICAgYmF3cmFwLnNlbGVjdEFsbChcIi5iZWZvcmUtc3RyZWFtXCIpLnJlbW92ZSgpIC8vIEhBQ0tcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIGJhd3JhcC5odG1sKFwiXCIpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fZGF0YS5iZWZvcmVfY2F0ZWdvcmllc1swXS52YWx1ZXNcblxuXG4gICAgdmFyIGNhdGVnb3J5X211bHRpcGxpZXJzID0gZGF0YS5iZWZvcmVfY2F0ZWdvcmllcy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgcFtjLmtleV0gPSAoMSArIGMudmFsdWVzWzBdLnBlcmNlbnRfZGlmZilcbiAgICAgIHJldHVybiBwXG4gICAgfSx7fSlcblxuXG4gICAgdmFyIHRhYnVsYXJfZGF0YSA9IHRoaXMuX2RhdGEuYmVmb3JlLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICBwW2MuZG9tYWluXSA9IHBbYy5kb21haW5dIHx8IHt9XG4gICAgICBwW2MuZG9tYWluXVsnZG9tYWluJ10gPSBjLmRvbWFpblxuICAgICAgcFtjLmRvbWFpbl1bJ3dlaWdodGVkJ10gPSBjLnZpc2l0cyAqIGNhdGVnb3J5X211bHRpcGxpZXJzW2MucGFyZW50X2NhdGVnb3J5X25hbWVdXG4gICAgICBcbiAgICAgIHBbYy5kb21haW5dW2MudGltZV9kaWZmX2J1Y2tldF0gPSAocFtjLmRvbWFpbl1bYy50aW1lX2RpZmZfYnVja2V0XSB8fCAwKSArIGMudmlzaXRzXG4gICAgICByZXR1cm4gcFxuICAgIH0se30pXG5cbiAgICB0YWJ1bGFyX2RhdGEgPSB0aGlzLl9kYXRhLmFmdGVyLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICBwW2MuZG9tYWluXSA9IHBbYy5kb21haW5dIHx8IHt9IFxuICAgICAgcFtjLmRvbWFpbl1bJ2RvbWFpbiddID0gYy5kb21haW5cbiAgICAgIHBbYy5kb21haW5dW1wiLVwiICsgYy50aW1lX2RpZmZfYnVja2V0XSA9IChwW2MuZG9tYWluXVtjLnRpbWVfZGlmZl9idWNrZXRdIHx8IDApICsgYy52aXNpdHNcblxuICAgICAgcmV0dXJuIHBcbiAgICB9LHRhYnVsYXJfZGF0YSlcblxuICAgIHZhciBzb3J0ZWRfdGFidWxhciA9IE9iamVjdC5rZXlzKHRhYnVsYXJfZGF0YSkubWFwKChrKSA9PiB7XG4gICAgICByZXR1cm4gdGFidWxhcl9kYXRhW2tdXG4gICAgfSkuc29ydCgocCxjKSA9PiB7XG4gICAgICBcbiAgICAgIHJldHVybiBkMy5kZXNjZW5kaW5nKHBbJzYwMCddKnAud2VpZ2h0ZWQgfHwgLUluZmluaXR5LGNbJzYwMCddKmMud2VpZ2h0ZWQgfHwgLUluZmluaXR5KVxuICAgIH0pXG5cblxuXG5cbiAgICB2YXIgYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gU3RyaW5nKHgqNjApIH0pXG4gICAgYnVja2V0cyA9IGJ1Y2tldHMuY29uY2F0KFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiBTdHJpbmcoLXgqNjApIH0pKVxuXG5cbiAgICB2YXIgZm9ybWF0TmFtZSA9IGZ1bmN0aW9uKHgpIHtcblxuICAgICAgaWYgKHggPCAwKSB4ID0gLXhcblxuICAgICAgaWYgKHggPT0gMzYwMCkgcmV0dXJuIFwiMSBoclwiXG4gICAgICBpZiAoeCA8IDM2MDApIHJldHVybiB4LzYwICsgXCIgbWluc1wiIFxuXG4gICAgICBpZiAoeCA9PSA4NjQwMCkgcmV0dXJuIFwiMSBkYXlcIlxuICAgICAgaWYgKHggPiA4NjQwMCkgcmV0dXJuIHgvODY0MDAgKyBcIiBkYXlzXCIgXG5cbiAgICAgIHJldHVybiB4LzM2MDAgKyBcIiBocnNcIlxuICAgIH1cblxuICAgIGJhd3JhcC5zZWxlY3RBbGwoXCIudGFibGUtd3JhcHBlclwiKS5odG1sKFwiXCIpXG5cbiAgICB2YXIgdGFibGVfb2JqID0gdGFibGUoYmF3cmFwKVxuICAgICAgLnRvcCgxNDApXG4gICAgICAuaGVhZGVycyhcbiAgICAgICAgW3tcImtleVwiOlwiZG9tYWluXCIsIFwidmFsdWVcIjpcIkRvbWFpblwifV0uY29uY2F0KFxuICAgICAgICAgIGJ1Y2tldHMubWFwKHggPT4geyByZXR1cm4ge1wia2V5XCI6eCwgXCJ2YWx1ZVwiOmZvcm1hdE5hbWUoeCksIFwic2VsZWN0ZWRcIjp0cnVlfSB9KVxuICAgICAgICApXG4gICAgICAgIFxuICAgICAgKVxuICAgICAgLm9uKFwiZXhwYW5kXCIsZnVuY3Rpb24oZCkge1xuXG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInRkLm9wdGlvbi1oZWFkZXJcIikuaHRtbChcIiZuZGFzaDtcIilcbiAgICAgICAgICBpZiAodGhpcy5uZXh0U2libGluZyAmJiBkMy5zZWxlY3QodGhpcy5uZXh0U2libGluZykuY2xhc3NlZChcImV4cGFuZGVkXCIpID09IHRydWUpIHtcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImIzY1MjkxO1wiKVxuICAgICAgICAgICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgICAgICAgIHZhciB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcbiAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHQsIHRoaXMubmV4dFNpYmxpbmcpOyAgXG5cblxuICAgICAgICAgIHZhciB0ciA9IGQzLnNlbGVjdCh0KS5jbGFzc2VkKFwiZXhwYW5kZWRcIix0cnVlKS5kYXR1bSh7fSlcbiAgICAgICAgICB2YXIgdGQgPSBkM191cGRhdGVhYmxlKHRyLFwidGRcIixcInRkXCIpXG4gICAgICAgICAgICAuYXR0cihcImNvbHNwYW5cIix0aGlzLmNoaWxkcmVuLmxlbmd0aClcbiAgICAgICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmOWY5ZmJcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgICAgICAgdmFyIGJlZm9yZV91cmxzID0gZGF0YS5iZWZvcmUuZmlsdGVyKHkgPT4geS5kb21haW4gPT0gZC5kb21haW4pXG4gICAgICAgICAgdmFyIGFmdGVyX3VybHMgPSBkYXRhLmFmdGVyLmZpbHRlcih5ID0+IHkuZG9tYWluID09IGQuZG9tYWluKVxuXG4gICAgICAgICAgcmVmaW5lKHRkKVxuICAgICAgICAgICAgLmRhdGEoZClcbiAgICAgICAgICAgIC5zdGFnZXMoc3RhZ2VzKVxuICAgICAgICAgICAgLmJlZm9yZV91cmxzKGJlZm9yZV91cmxzKVxuICAgICAgICAgICAgLmFmdGVyX3VybHMoYWZ0ZXJfdXJscylcbiAgICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikpXG4gICAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgfSlcbiAgICAgIC5vcHRpb25fdGV4dChcIjxkaXYgc3R5bGU9J3dpZHRoOjQwcHg7dGV4dC1hbGlnbjpjZW50ZXInPiYjNjUyOTE7PC9kaXY+XCIpXG4gICAgICAvLy5zb3J0KFwiNjAwXCIpXG4gICAgICAuZGF0YSh7XCJ2YWx1ZXNcIjpzb3J0ZWRfdGFidWxhci5zbGljZSgwLDEwMDApfSlcbiAgICAgIC5kcmF3KClcblxuICAgIHRhYmxlX29iai5fdGFyZ2V0LnNlbGVjdEFsbChcInRoXCIpXG4gICAgICAvLy5zdHlsZShcIndpZHRoXCIseCA9PiAocGFyc2VJbnQoeC5rZXkpID09IHgua2V5KSA/IFwiMzFweFwiIDogdW5kZWZpbmVkIClcbiAgICAgIC8vLnN0eWxlKFwibWF4LXdpZHRoXCIseCA9PiAocGFyc2VJbnQoeC5rZXkpID09IHgua2V5KSA/IFwiMzFweFwiIDogdW5kZWZpbmVkIClcbiAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHJnYmEoMCwwLDAsLjEpXCIpXG4gICAgICAuc2VsZWN0QWxsKFwic3BhblwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLCBmdW5jdGlvbih4KSB7IFxuICAgICAgICBpZiAocGFyc2VJbnQoeC5rZXkpID09IHgua2V5ICYmIHgua2V5IDwgMCkgcmV0dXJuIFwiZm9udC1zaXplOi45ZW07d2lkdGg6NzBweDt0cmFuc2Zvcm06cm90YXRlKC00NWRlZyk7ZGlzcGxheTppbmxpbmUtYmxvY2s7bWFyZ2luLWxlZnQ6LTlweDttYXJnaW4tYm90dG9tOiAxMnB4XCJcbiAgICAgICAgaWYgKHBhcnNlSW50KHgua2V5KSA9PSB4LmtleSAmJiB4LmtleSA+IDApIHJldHVybiBcImZvbnQtc2l6ZTouOWVtO3dpZHRoOjcwcHg7dHJhbnNmb3JtOnJvdGF0ZSg0NWRlZyk7dGV4dC1hbGlnbjpyaWdodDtkaXNwbGF5OmlubGluZS1ibG9jazttYXJnaW4tbGVmdDogLTQ4cHg7IG1hcmdpbi1ib3R0b206IDEycHg7XCJcblxuICAgICAgfSlcblxuXG4gICAgdGFibGVfb2JqLl90YXJnZXQuc2VsZWN0QWxsKFwiLnRhYmxlLW9wdGlvblwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwibm9uZVwiKVxuXG5cbiAgICB2YXIgbWF4ID0gc29ydGVkX3RhYnVsYXIucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKGMpLmZpbHRlcih6ID0+IHogIT0gXCJkb21haW5cIiAmJiB6ICE9IFwid2VpZ2h0ZWRcIikubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcCA9IGNbeF0gPiBwID8gY1t4XSA6IHBcbiAgICAgIH0pXG4gICAgXG4gICAgICByZXR1cm4gcFxuICAgIH0sMClcblxuICAgIHZhciBvc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbMCwuOF0pLmRvbWFpbihbMCxNYXRoLmxvZyhtYXgpXSlcblxuICAgIHRhYmxlX29iai5fdGFyZ2V0LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm5vdCg6Zmlyc3QtY2hpbGQpXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmlnaHRcIixcIjFweCBzb2xpZCB3aGl0ZVwiKVxuICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIwcHhcIilcbiAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fW3hbJ2tleSddXSB8fCAwXG4gICAgICAgIHJldHVybiBcInJnYmEoNzAsIDEzMCwgMTgwLFwiICsgb3NjYWxlKE1hdGgubG9nKHZhbHVlKzEpKSArIFwiKVwiXG4gICAgICB9KVxuXG5cblxuXG5cblxuICAgICAgXG5cblxuXG4gICAgLy92YXIgdCA9IHRhYmxlLnRhYmxlKF9leHBsb3JlKVxuICAgIC8vICAuZGF0YShzZWxlY3RlZClcblxuXG5cbiAgICBcbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCB0YWJsZSBmcm9tICd0YWJsZSdcbmltcG9ydCByZWZpbmUgZnJvbSAnLi9yZWZpbmUnXG5pbXBvcnQgKiBhcyB0aW1lc2VyaWVzIGZyb20gJy4uL2dlbmVyaWMvdGltZXNlcmllcydcbmltcG9ydCBkb21haW5fZXhwYW5kZWQgZnJvbSAnLi9kb21haW5fZXhwYW5kZWQnXG5cblxuXG5cbmltcG9ydCB7ZHJhd1N0cmVhbX0gZnJvbSAnLi9zdW1tYXJ5X3ZpZXcnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJ2NoYXJ0J1xuXG5mdW5jdGlvbiBub29wKCl7fVxuXG5mdW5jdGlvbiBkM19jbGFzcyh0YXJnZXQsY2xzLHR5cGUsZGF0YSkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuXCIgKyBjbHMsIHR5cGUgfHwgXCJkaXZcIixkYXRhKVxuICAgIC5jbGFzc2VkKGNscyx0cnVlKVxufVxuXG5mdW5jdGlvbiBmb3JtYXRIb3VyKGgpIHtcbiAgaWYgKGggPT0gMCkgcmV0dXJuIFwiMTIgYW1cIlxuICBpZiAoaCA9PSAxMikgcmV0dXJuIFwiMTIgcG1cIlxuICBpZiAoaCA+IDEyKSByZXR1cm4gKGgtMTIpICsgXCIgcG1cIlxuICByZXR1cm4gKGggPCAxMCA/IGhbMV0gOiBoKSArIFwiIGFtXCJcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0aW1pbmcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGltaW5nKHRhcmdldClcbn1cblxuY2xhc3MgVGltaW5nIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICB9XG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuXG4gIG9uKGFjdGlvbiwgZm4pIHtcbiAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG5cbiAgZHJhdygpIHtcblxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgdmFyIHdyYXAgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJ0aW1pbmctd3JhcFwiKVxuXG4gICAgaGVhZGVyKHdyYXApXG4gICAgICAudGV4dChcIlRpbWluZ1wiKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIHRpbWluZ3dyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudGltaW5nLXJvd1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ0aW1pbmctcm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjYwcHhcIilcblxuICAgIC8vIERBVEFcbiAgICB2YXIgaG91cmJ1Y2tldHMgPSBkMy5yYW5nZSgwLDI0KS5tYXAoeCA9PiBTdHJpbmcoeCkubGVuZ3RoID4gMSA/IFN0cmluZyh4KSA6IFwiMFwiICsgeClcblxuXG4gICAgdmFyIGQgPSBkMy5uZXN0KClcbiAgICAgIC5rZXkoeCA9PiB4LmRvbWFpbilcbiAgICAgIC5rZXkoeCA9PiB4LmhvdXIpXG4gICAgICAuZW50cmllcyhkYXRhLmZ1bGxfdXJscylcblxuICAgIHZhciBtYXggPSAwXG5cbiAgICBkLm1hcCh4ID0+IHtcbiAgICAgIHZhciBvYmogPSB4LnZhbHVlcy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBwW2Mua2V5XSA9IGMudmFsdWVzXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICB4LmJ1Y2tldHMgPSBob3VyYnVja2V0cy5tYXAoeiA9PiB7XG4gICAgICAgXG4gICAgICAgIHZhciBvID0ge1xuICAgICAgICAgIHZhbHVlczogb2JqW3pdLFxuICAgICAgICAgIGtleTogZm9ybWF0SG91cih6KVxuICAgICAgICB9XG4gICAgICAgIG8udmlld3MgPSBkMy5zdW0ob2JqW3pdIHx8IFtdLCBxID0+IHEudW5pcXVlcylcblxuICAgICAgICBtYXggPSBtYXggPiBvLnZpZXdzID8gbWF4IDogby52aWV3c1xuICAgICAgICByZXR1cm4gb1xuICAgICAgfSlcblxuICAgICAgeC50YWJ1bGFyID0geC5idWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgIHBbYy5rZXldID0gYy52aWV3cyB8fCB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0se30pXG5cbiAgICAgIHgudGFidWxhcltcImRvbWFpblwiXSA9IHgua2V5XG4gICAgICB4LnRhYnVsYXJbXCJ0b3RhbFwiXSA9IGQzLnN1bSh4LmJ1Y2tldHMseCA9PiB4LnZpZXdzKVxuXG4gICAgICBcbiAgICAgIHgudmFsdWVzXG4gICAgfSlcblxuICAgIHZhciBoZWFkZXJzID0gW1xuICAgICAge2tleTpcImRvbWFpblwiLHZhbHVlOlwiRG9tYWluXCJ9XG4gICAgXVxuXG4gICAgaGVhZGVycyA9IGhlYWRlcnMuY29uY2F0KGhvdXJidWNrZXRzLm1hcChmb3JtYXRIb3VyKS5tYXAoeCA9PiB7IHJldHVybiB7a2V5OiB4LCB2YWx1ZTogeH0gfSkgKVxuICAgIFxuICAgIHZhciBvc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbMCwuOF0pLmRvbWFpbihbMCxNYXRoLmxvZyhtYXgpXSlcblxuXG4gICAgdmFyIHRhYmxlX29iaiA9IHRhYmxlKHRpbWluZ3dyYXApXG4gICAgICAuaGVhZGVycyhoZWFkZXJzKVxuICAgICAgLmRhdGEoe1wia2V5XCI6XCJcIiwgXCJ2YWx1ZXNcIjpkLm1hcCh4ID0+IHgudGFidWxhcikgfSlcbiAgICAgIC5zb3J0KFwidG90YWxcIilcbiAgICAgIC5za2lwX29wdGlvbih0cnVlKVxuICAgICAgLm9uKFwiZXhwYW5kXCIsZnVuY3Rpb24oZCkge1xuXG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInRkLm9wdGlvbi1oZWFkZXJcIikuaHRtbChcIiZuZGFzaDtcIilcbiAgICAgICAgICBpZiAodGhpcy5uZXh0U2libGluZyAmJiBkMy5zZWxlY3QodGhpcy5uZXh0U2libGluZykuY2xhc3NlZChcImV4cGFuZGVkXCIpID09IHRydWUpIHtcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImIzY1MjkxO1wiKVxuICAgICAgICAgICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgICAgICAgIHZhciB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcbiAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHQsIHRoaXMubmV4dFNpYmxpbmcpOyAgXG5cbiAgICAgICAgICB2YXIgdHIgPSBkMy5zZWxlY3QodCkuY2xhc3NlZChcImV4cGFuZGVkXCIsdHJ1ZSkuZGF0dW0oe30pXG4gICAgICAgICAgdmFyIHRkID0gZDNfdXBkYXRlYWJsZSh0cixcInRkXCIsXCJ0ZFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsdGhpcy5jaGlsZHJlbi5sZW5ndGgpXG4gICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgICAgIHZhciBkZCA9IGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmRvbWFpbiA9PSBkLmRvbWFpbiB9KVxuICAgICAgICAgIHZhciByb2xsZWQgPSB0aW1lc2VyaWVzLnByZXBEYXRhKGRkKVxuICAgICAgICAgIFxuICAgICAgICAgIGRvbWFpbl9leHBhbmRlZCh0ZClcbiAgICAgICAgICAgIC5yYXcoZGQpXG4gICAgICAgICAgICAuZGF0YShyb2xsZWQpXG4gICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmRyYXcoKVxuXG4gICAgICAgIH0pXG4gICAgICAuZHJhdygpXG5cbiAgICB0YWJsZV9vYmouX3RhcmdldC5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpub3QoOmZpcnN0LWNoaWxkKVwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJpZ2h0XCIsXCIxcHggc29saWQgd2hpdGVcIilcbiAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMHB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfX1t4WydrZXknXV0gfHwgMFxuICAgICAgICByZXR1cm4gXCJyZ2JhKDcwLCAxMzAsIDE4MCxcIiArIG9zY2FsZShNYXRoLmxvZyh2YWx1ZSsxKSkgKyBcIilcIlxuICAgICAgfSlcblxuXG5cblxuICAgIFxuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5cbmZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuXCIgKyBjbHMsIHR5cGUgfHwgXCJkaXZcIilcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3RhZ2VkX2ZpbHRlcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTdGFnZWRGaWx0ZXIodGFyZ2V0KVxufVxuXG5jbGFzcyBTdGFnZWRGaWx0ZXIge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vbiA9IHt9XG4gIH1cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG5cbiAgb24oYWN0aW9uLCBmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICBkcmF3KCkge1xuICAgIHZhciBvd3JhcCA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcImZvb3Rlci13cmFwXCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCI2MHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3R0b21cIixcIjBweFwiKVxuICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwMHB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjRjBGNEY3XCIpXG5cbiAgICB2YXIgd3JhcCA9IGQzX2NsYXNzKG93cmFwLFwiaW5uZXItd3JhcFwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXRvcFwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCI1cHhcIilcblxuICAgIGQzX2NsYXNzKHdyYXAsXCJoZWFkZXItbGFiZWxcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjE0cHhcIilcbiAgICAgIC5zdHlsZShcImNvbG9yXCIsXCIjODg4ODg4XCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC50ZXh0KFwiQnVpbGQgRmlsdGVyc1wiKVxuXG4gICAgZDNfY2xhc3Mod3JhcCxcInRleHQtbGFiZWxcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI2MHB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJub25lXCIpXG4gICAgICAudGV4dChcIlRpdGxlXCIpXG5cbiAgICB2YXIgc2VsZWN0X2JveCA9IHNlbGVjdCh3cmFwKVxuICAgICAgLm9wdGlvbnMoW1xuICAgICAgICAgIHtcImtleVwiOlwiY29udGFpbnNcIixcInZhbHVlXCI6XCJjb250YWluc1wifVxuICAgICAgICAsIHtcImtleVwiOlwiZG9lcyBub3QgY29udGFpblwiLFwidmFsdWVcIjpcImRvZXMgbm90IGNvbnRhaW5cIn1cbiAgICAgIF0pXG4gICAgICAuZHJhdygpXG4gICAgICAuX3NlbGVjdFxuICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cblxuXG5cbiAgICB2YXIgZm9vdGVyX3JvdyA9IGQzX2NsYXNzKHdyYXAsXCJmb290ZXItcm93XCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG4gICAgdmFyIHNlbGVjdF92YWx1ZSA9IHRoaXMuZGF0YSgpXG5cbiAgICBmdW5jdGlvbiBidWlsZEZpbHRlcklucHV0KCkge1xuXG4gICAgICBmb290ZXJfcm93LnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRlc3Ryb3kgPSBkMy5zZWxlY3QodGhpcykub24oXCJkZXN0cm95XCIpXG4gICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICB9KVxuXG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZvb3Rlcl9yb3csXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAuYXR0cihcInZhbHVlXCIsc2VsZWN0X3ZhbHVlKVxuICAgICAgICAucHJvcGVydHkoXCJ2YWx1ZVwiLHNlbGVjdF92YWx1ZSlcblxuICAgICAgXG5cblxuICAgICAgdmFyIHMgPSAkKHNlbGVjdC5ub2RlKCkpLnNlbGVjdGl6ZSh7XG4gICAgICAgIHBlcnNpc3Q6IGZhbHNlLFxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGVjdF92YWx1ZSA9IChzZWxlY3RfdmFsdWUubGVuZ3RoID8gc2VsZWN0X3ZhbHVlICsgXCIsXCIgOiBcIlwiKSArIHhcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGVjdF92YWx1ZSlcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9uRGVsZXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxlY3RfdmFsdWUgPSBzZWxlY3RfdmFsdWUuc3BsaXQoXCIsXCIpLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6ICE9IHhbMF19KS5qb2luKFwiLFwiKVxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZWN0X3ZhbHVlKVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogeCwgdGV4dDogeFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgLm9uKFwiZGVzdHJveVwiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNbMF0uc2VsZWN0aXplLmRlc3Ryb3koKVxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgYnVpbGRGaWx0ZXJJbnB1dCgpXG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBkM19jbGFzcyh3cmFwLFwiaW5jbHVkZS1zdWJtaXRcIixcImJ1dHRvblwiKVxuICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyOXB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwic3VibWl0XCIpXG4gICAgICAudGV4dChcIk1vZGlmeSBGaWx0ZXJzXCIpXG4gICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBmb290ZXJfcm93LnNlbGVjdEFsbChcImlucHV0XCIpLnByb3BlcnR5KFwidmFsdWVcIilcbiAgICAgICAgdmFyIG9wID0gIHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXkgKyBcIi5zZWxlY3RpemVcIlxuICAgICAgICBcbiAgICAgICAgc2VsZi5vbihcIm1vZGlmeVwiKSh7XCJmaWVsZFwiOlwiVGl0bGVcIixcIm9wXCI6b3AsXCJ2YWx1ZVwiOnZhbHVlfSlcbiAgICAgIH0pXG5cbiAgICBkM19jbGFzcyh3cmFwLFwiZXhjbHVkZS1zdWJtaXRcIixcImJ1dHRvblwiKVxuICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyOXB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwic3VibWl0XCIpXG4gICAgICAudGV4dChcIk5ldyBGaWx0ZXJcIilcbiAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGZvb3Rlcl9yb3cuc2VsZWN0QWxsKFwiaW5wdXRcIikucHJvcGVydHkoXCJ2YWx1ZVwiKVxuICAgICAgICB2YXIgb3AgPSAgc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleSArIFwiLnNlbGVjdGl6ZVwiXG5cbiAgICAgICAgc2VsZi5vbihcImFkZFwiKSh7XCJmaWVsZFwiOlwiVGl0bGVcIixcIm9wXCI6b3AsXCJ2YWx1ZVwiOnZhbHVlfSlcbiAgICAgIH0pXG5cblxuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4vaGVhZGVyJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIENvbmRpdGlvbmFsU2hvdyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7fVxuICB0aGlzLl9jbGFzc2VzID0ge31cbiAgdGhpcy5fb2JqZWN0cyA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbmRpdGlvbmFsX3Nob3codGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQ29uZGl0aW9uYWxTaG93KHRhcmdldClcbn1cblxuQ29uZGl0aW9uYWxTaG93LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIGNsYXNzZWQ6IGZ1bmN0aW9uKGssIHYpIHtcbiAgICAgIGlmIChrID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9jbGFzc2VzXG4gICAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fY2xhc3Nlc1trXSBcbiAgICAgIHRoaXMuX2NsYXNzZXNba10gPSB2O1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9ICBcbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIHZhciBjbGFzc2VzID0gdGhpcy5jbGFzc2VkKClcblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmNvbmRpdGlvbmFsLXdyYXBcIixcImRpdlwiLHRoaXMuZGF0YSgpKVxuICAgICAgICAuY2xhc3NlZChcImNvbmRpdGlvbmFsLXdyYXBcIix0cnVlKVxuXG4gICAgICB2YXIgb2JqZWN0cyA9IGQzX3NwbGF0KHdyYXAsXCIuY29uZGl0aW9uYWxcIixcImRpdlwiLGlkZW50aXR5LCBmdW5jdGlvbih4LGkpIHsgcmV0dXJuIGkgfSlcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH0pXG4gICAgICAgIC5jbGFzc2VkKFwiY29uZGl0aW9uYWxcIix0cnVlKVxuICAgICAgICAuY2xhc3NlZChcImhpZGRlblwiLCBmdW5jdGlvbih4KSB7IHJldHVybiAheC5zZWxlY3RlZCB9KVxuXG5cbiAgICAgIE9iamVjdC5rZXlzKGNsYXNzZXMpLm1hcChmdW5jdGlvbihrKSB7IFxuICAgICAgICBvYmplY3RzLmNsYXNzZWQoayxjbGFzc2VzW2tdKVxuICAgICAgfSlcblxuICAgICAgdGhpcy5fb2JqZWN0cyA9IG9iamVjdHNcblxuXG4gICAgICByZXR1cm4gdGhpc1xuICBcbiAgICB9XG4gICwgZWFjaDogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHRoaXMuZHJhdygpXG4gICAgICB0aGlzLl9vYmplY3RzLmVhY2goZm4pXG4gICAgICBcbiAgICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gU2hhcmUodGFyZ2V0KSB7XG4gIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICB0aGlzLl9pbm5lciA9IGZ1bmN0aW9uKCkge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2hhcmUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU2hhcmUodGFyZ2V0KVxufVxuXG5TaGFyZS5wcm90b3R5cGUgPSB7XG4gICAgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciBvdmVybGF5ID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIub3ZlcmxheVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwib3ZlcmxheVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwicmdiYSgwLDAsMCwuNSlcIilcbiAgICAgICAgLnN0eWxlKFwiei1pbmRleFwiLFwiMzAxXCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgb3ZlcmxheS5yZW1vdmUoKVxuICAgICAgICB9KVxuXG4gICAgICB0aGlzLl9vdmVybGF5ID0gb3ZlcmxheTtcblxuICAgICAgdmFyIGNlbnRlciA9IGQzX3VwZGF0ZWFibGUob3ZlcmxheSxcIi5wb3B1cFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicG9wdXAgY29sLW1kLTUgY29sLXNtLThcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiYXV0b1wiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcImF1dG9cIilcbiAgICAgICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiMzAwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMTUwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwid2hpdGVcIilcbiAgICAgICAgLnN0eWxlKFwiZmxvYXRcIixcIm5vbmVcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpIHtcbiAgICAgICAgICBkMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKVxuICAgICAgICB9KVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgc2VsZi5faW5uZXIoZDMuc2VsZWN0KHRoaXMpKVxuICAgICAgICB9KVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBpbm5lcjogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHRoaXMuX2lubmVyID0gZm4uYmluZCh0aGlzKVxuICAgICAgdGhpcy5kcmF3KClcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fb3ZlcmxheS5yZW1vdmUoKVxuICAgICAgcmV0dXJuIHRoaXMgXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCAqIGFzIHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IHttZWRpYV9wbGFufSBmcm9tICdtZWRpYV9wbGFuJ1xuaW1wb3J0IGZpbHRlcl92aWV3IGZyb20gJy4vdmlld3MvZmlsdGVyX3ZpZXcnXG5pbXBvcnQgb3B0aW9uX3ZpZXcgZnJvbSAnLi92aWV3cy9vcHRpb25fdmlldydcbmltcG9ydCBkb21haW5fdmlldyBmcm9tICcuL3ZpZXdzL2RvbWFpbl92aWV3J1xuaW1wb3J0IHNlZ21lbnRfdmlldyBmcm9tICcuL3ZpZXdzL3NlZ21lbnRfdmlldydcbmltcG9ydCBzdW1tYXJ5X3ZpZXcgZnJvbSAnLi92aWV3cy9zdW1tYXJ5X3ZpZXcnXG5pbXBvcnQgcmVsYXRpdmVfdmlldyBmcm9tICcuL3ZpZXdzL3JlbGF0aXZlX3RpbWluZ192aWV3J1xuaW1wb3J0IHRpbWluZ192aWV3IGZyb20gJy4vdmlld3MvdGltaW5nX3ZpZXcnXG5pbXBvcnQgc3RhZ2VkX2ZpbHRlcl92aWV3IGZyb20gJy4vdmlld3Mvc3RhZ2VkX2ZpbHRlcl92aWV3J1xuXG5cblxuXG5cbmltcG9ydCBjb25kaXRpb25hbF9zaG93IGZyb20gJy4vZ2VuZXJpYy9jb25kaXRpb25hbF9zaG93J1xuXG5pbXBvcnQgc2hhcmUgZnJvbSAnLi9nZW5lcmljL3NoYXJlJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuL2dlbmVyaWMvc2VsZWN0J1xuXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi9oZWxwZXJzJ1xuaW1wb3J0ICogYXMgdHJhbnNmb3JtIGZyb20gJy4vaGVscGVycydcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbmV4cG9ydCBmdW5jdGlvbiBOZXdEYXNoYm9hcmQodGFyZ2V0KSB7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG4gIHRoaXMuX29uID0ge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbmV3X2Rhc2hib2FyZCh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBOZXdEYXNoYm9hcmQodGFyZ2V0KVxufVxuXG5OZXdEYXNoYm9hcmQucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgc3RhZ2VkX2ZpbHRlcnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzdGFnZWRfZmlsdGVyc1wiLHZhbCkgfHwgXCJcIlxuICAgIH1cbiAgLCBzYXZlZDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNhdmVkXCIsdmFsKSBcbiAgICB9XG4gICwgbGluZV9pdGVtczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxpbmVfaXRlbXNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIHNlbGVjdGVkX2FjdGlvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlbGVjdGVkX2FjdGlvblwiLHZhbCkgXG4gICAgfVxuICAsIHNlbGVjdGVkX2NvbXBhcmlzb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsdmFsKSBcbiAgICB9XG4gICwgYWN0aW9uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25fZGF0ZVwiLHZhbCkgXG4gICAgfVxuICAsIGNvbXBhcmlzb25fZGF0ZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNvbXBhcmlzb25fZGF0ZVwiLHZhbCkgXG4gICAgfVxuXG4gICwgdmlld19vcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidmlld19vcHRpb25zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBsb2dpY19vcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibG9naWNfb3B0aW9uc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgZXhwbG9yZV90YWJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZXhwbG9yZV90YWJzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBsb2dpY19jYXRlZ29yaWVzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibG9naWNfY2F0ZWdvcmllc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgYWN0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFjdGlvbnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIHN1bW1hcnk6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCB0aW1lX3N1bW1hcnk6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aW1lX3N1bW1hcnlcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGNhdGVnb3J5X3N1bW1hcnk6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjYXRlZ29yeV9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBrZXl3b3JkX3N1bW1hcnk6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXl3b3JkX3N1bW1hcnlcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGJlZm9yZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJlZm9yZVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgYWZ0ZXI6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhZnRlclwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgZmlsdGVyczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImZpbHRlcnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGxvYWRpbmc6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkKSB0aGlzLl9zZWdtZW50X3ZpZXcgJiYgdGhpcy5fc2VnbWVudF92aWV3LmlzX2xvYWRpbmcodmFsKS5kcmF3KClcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwibG9hZGluZ1wiLHZhbClcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhKClcblxuICAgICAgdmFyIG9wdGlvbnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMudmlld19vcHRpb25zKCkpKVxuICAgICAgdmFyIHRhYnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuZXhwbG9yZV90YWJzKCkpKVxuXG5cbiAgICAgIHZhciBsb2dpYyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5sb2dpY19vcHRpb25zKCkpKVxuICAgICAgICAsIGNhdGVnb3JpZXMgPSB0aGlzLmxvZ2ljX2NhdGVnb3JpZXMoKVxuICAgICAgICAsIGZpbHRlcnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuZmlsdGVycygpKSlcbiAgICAgICAgLCBhY3Rpb25zID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmFjdGlvbnMoKSkpXG4gICAgICAgICwgc3RhZ2VkX2ZpbHRlcnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuc3RhZ2VkX2ZpbHRlcnMoKSkpXG5cblxuXG4gICAgICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXRcbiAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICB0aGlzLl9zZWdtZW50X3ZpZXcgPSBzZWdtZW50X3ZpZXcodGFyZ2V0KVxuICAgICAgICAuaXNfbG9hZGluZyhzZWxmLmxvYWRpbmcoKSB8fCBmYWxzZSlcbiAgICAgICAgLnNlZ21lbnRzKGFjdGlvbnMpXG4gICAgICAgIC5kYXRhKHNlbGYuc3VtbWFyeSgpKVxuICAgICAgICAuYWN0aW9uKHNlbGYuc2VsZWN0ZWRfYWN0aW9uKCkgfHwge30pXG4gICAgICAgIC5hY3Rpb25fZGF0ZShzZWxmLmFjdGlvbl9kYXRlKCkgfHwgXCJcIilcbiAgICAgICAgLmNvbXBhcmlzb25fZGF0ZShzZWxmLmNvbXBhcmlzb25fZGF0ZSgpIHx8IFwiXCIpXG5cbiAgICAgICAgLmNvbXBhcmlzb24oc2VsZi5zZWxlY3RlZF9jb21wYXJpc29uKCkgfHwge30pXG4gICAgICAgIC5vbihcImNoYW5nZVwiLCB0aGlzLm9uKFwiYWN0aW9uLmNoYW5nZVwiKSlcbiAgICAgICAgLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIsIHRoaXMub24oXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImNvbXBhcmlzb24uY2hhbmdlXCIsIHRoaXMub24oXCJjb21wYXJpc29uLmNoYW5nZVwiKSlcbiAgICAgICAgLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiLCB0aGlzLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiKSlcbiAgICAgICAgLm9uKFwic2F2ZWQtc2VhcmNoLmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyAgXG4gICAgICAgICAgdmFyIHNzID0gc2hhcmUoZDMuc2VsZWN0KFwiYm9keVwiKSkuZHJhdygpXG4gICAgICAgICAgc3MuaW5uZXIoZnVuY3Rpb24odGFyZ2V0KSB7XG5cbiAgICAgICAgICAgIHZhciBoZWFkZXIgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5oZWFkZXJcIixcImg0XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwiaGVhZGVyXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMzBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMzBweFwiKVxuICAgICAgICAgICAgICAudGV4dChcIk9wZW4gYSBzYXZlZCBkYXNoYm9hcmRcIilcblxuICAgICAgICAgICAgdmFyIGZvcm0gPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdlwiLFwiZGl2XCIsc2VsZi5zYXZlZCgpKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMjUlXCIpXG5cbiAgICAgICAgICAgIGlmICghc2VsZi5zYXZlZCgpIHx8IHNlbGYuc2F2ZWQoKS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICBkM191cGRhdGVhYmxlKGZvcm0sXCJzcGFuXCIsXCJzcGFuXCIpXG4gICAgICAgICAgICAgICAgLnRleHQoXCJZb3UgY3VycmVudGx5IGhhdmUgbm8gc2F2ZWQgZGFzaGJvYXJkc1wiKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZDNfc3BsYXQoZm9ybSxcIi5yb3dcIixcImFcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sZnVuY3Rpb24oeCkgeyByZXR1cm4geC5uYW1lIH0pXG4gICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJyb3dcIix0cnVlKVxuICAgICAgICAgICAgICAgIC8vLmF0dHIoXCJocmVmXCIsIHggPT4geC5lbmRwb2ludClcbiAgICAgICAgICAgICAgICAudGV4dCh4ID0+IHgubmFtZSlcbiAgICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgICAvLyBIQUNLOiBUSElTIGlzIGhhY2t5Li4uXG4gICAgICAgICAgICAgICAgICB2YXIgX3N0YXRlID0gc3RhdGUucXMoe30pLmZyb20oXCI/XCIgKyB4LmVuZHBvaW50LnNwbGl0KFwiP1wiKVsxXSlcblxuICAgICAgICAgICAgICAgICAgc3MuaGlkZSgpXG4gICAgICAgICAgICAgICAgICB3aW5kb3cub25wb3BzdGF0ZSh7c3RhdGU6IF9zdGF0ZX0pXG4gICAgICAgICAgICAgICAgICBkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcIm5ldy1zYXZlZC1zZWFyY2guY2xpY2tcIiwgZnVuY3Rpb24oKSB7IFxuICAgICAgICAgIHZhciBzcyA9IHNoYXJlKGQzLnNlbGVjdChcImJvZHlcIikpLmRyYXcoKVxuICAgICAgICAgIHNzLmlubmVyKGZ1bmN0aW9uKHRhcmdldCkge1xuXG4gICAgICAgICAgICB2YXIgaGVhZGVyID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuaGVhZGVyXCIsXCJoNFwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImhlYWRlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJTYXZlIHRoaXMgZGFzaGJvYXJkOlwiKVxuXG4gICAgICAgICAgICB2YXIgZm9ybSA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiZGl2XCIsXCJkaXZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG5cbiAgICAgICAgICAgIHZhciBuYW1lID0gZDNfdXBkYXRlYWJsZShmb3JtLCBcIi5uYW1lXCIsIFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUobmFtZSxcIi5sYWJlbFwiLFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMzBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LWZhbWlseVwiLFwiUHJveGltYU5vdmEsIHNhbnMtc2VyaWZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImxlZnRcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJEYXNoYm9hcmQgTmFtZTpcIilcblxuICAgICAgICAgICAgdmFyIG5hbWVfaW5wdXQgPSBkM191cGRhdGVhYmxlKG5hbWUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI3MHB4XCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwicGxhY2Vob2xkZXJcIixcIk15IGF3ZXNvbWUgc2VhcmNoXCIpXG5cbiAgICAgICAgICAgIHZhciBhZHZhbmNlZCA9IGQzX3VwZGF0ZWFibGUoZm9ybSwgXCIuYWR2YW5jZWRcIiwgXCJkZXRhaWxzXCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwiYWR2YW5jZWRcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDAwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIilcblxuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUoYWR2YW5jZWQsXCIubGFiZWxcIixcImRpdlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiTGluZSBJdGVtOlwiKVxuXG4gICAgICAgICAgICB2YXIgc2VsZWN0X2JveCA9IHNlbGVjdChhZHZhbmNlZClcbiAgICAgICAgICAgICAgLm9wdGlvbnMoc2VsZi5saW5lX2l0ZW1zKCkubWFwKHggPT4geyByZXR1cm4ge2tleTp4LmxpbmVfaXRlbV9uYW1lLCB2YWx1ZTogeC5saW5lX2l0ZW1faWR9IH0pIClcbiAgICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgICAgICAuX3NlbGVjdFxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjcwcHhcIilcblxuXG5cblxuICAgICAgICAgICAgdmFyIHNlbmQgPSBkM191cGRhdGVhYmxlKGZvcm0sIFwiLnNlbmRcIiwgXCJkaXZcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZW5kXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG5cblxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShzZW5kLFwiYnV0dG9uXCIsXCJidXR0b25cIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE2cHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgICAudGV4dChcIlNlbmRcIilcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBuYW1lX2lucHV0LnByb3BlcnR5KFwidmFsdWVcIikgXG4gICAgICAgICAgICAgICAgdmFyIGxpbmVfaXRlbSA9IHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9ucy5sZW5ndGggPyBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18ua2V5IDogZmFsc2VcblxuICAgICAgICAgICAgICAgIGQzLnhocihcIi9jcnVzaGVyL3NhdmVkX2Rhc2hib2FyZFwiKVxuICAgICAgICAgICAgICAgICAgLnBvc3QoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IG5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAsIFwiZW5kcG9pbnRcIjogd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgd2luZG93LmxvY2F0aW9uLnNlYXJjaFxuICAgICAgICAgICAgICAgICAgICAgICwgXCJsaW5lX2l0ZW1cIjogbGluZV9pdGVtXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICApXG5cbiAgICAgICAgICAgICAgICBzcy5oaWRlKClcblxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAudGV4dChcIlNhdmVcIilcblxuXG5cbiAgICAgICAgICB9KVxuXG5cbiAgICAgICAgfSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICBpZiAodGhpcy5zdW1tYXJ5KCkgPT0gZmFsc2UpIHJldHVybiBmYWxzZVxuXG4gICAgICBmaWx0ZXJfdmlldyh0YXJnZXQpXG4gICAgICAgIC5sb2dpYyhsb2dpYylcbiAgICAgICAgLmNhdGVnb3JpZXMoY2F0ZWdvcmllcylcbiAgICAgICAgLmZpbHRlcnMoZmlsdGVycylcbiAgICAgICAgLmRhdGEoZGF0YSlcbiAgICAgICAgLm9uKFwibG9naWMuY2hhbmdlXCIsIHRoaXMub24oXCJsb2dpYy5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImZpbHRlci5jaGFuZ2VcIiwgdGhpcy5vbihcImZpbHRlci5jaGFuZ2VcIikpXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgb3B0aW9uX3ZpZXcodGFyZ2V0KVxuICAgICAgICAuZGF0YShvcHRpb25zKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgdGhpcy5vbihcInZpZXcuY2hhbmdlXCIpIClcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICBjb25kaXRpb25hbF9zaG93KHRhcmdldClcbiAgICAgICAgLmRhdGEob3B0aW9ucylcbiAgICAgICAgLmNsYXNzZWQoXCJ2aWV3LW9wdGlvblwiLHRydWUpXG4gICAgICAgIC5kcmF3KClcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgaWYgKCF4LnNlbGVjdGVkKSByZXR1cm5cblxuICAgICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJkYXRhLXZpZXdcIikge1xuICAgICAgICAgICAgdmFyIGR2ID0gZG9tYWluX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgIC5vcHRpb25zKHRhYnMpXG4gICAgICAgICAgICAgIC5kYXRhKGRhdGEpXG4gICAgICAgICAgICAgIC5vbihcInNlbGVjdFwiLCBzZWxmLm9uKFwidGFiLmNoYW5nZVwiKSApXG4gICAgICAgICAgICAgIC5vbihcInN0YWdlLWZpbHRlclwiLGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgICAgICAgc3RhZ2VkX2ZpbHRlcnMgPSBzdGFnZWRfZmlsdGVycy5zcGxpdChcIixcIikuY29uY2F0KHgua2V5IHx8IHgudXJsKS5maWx0ZXIoeCA9PiB4Lmxlbmd0aCkuam9pbihcIixcIilcbiAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKShzdGFnZWRfZmlsdGVycylcbiAgICAgICAgICAgICAgIEhBQ0tidWlsZFN0YWdlZEZpbHRlcihzdGFnZWRfZmlsdGVycylcbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcIm1lZGlhLXZpZXdcIikge1xuICAgICAgICAgICAgbWVkaWFfcGxhbihkdGhpcy5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTVweFwiKS5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiLTE1cHhcIikpXG4gICAgICAgICAgICAgLmRhdGEoZGF0YSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJiYS12aWV3XCIpIHtcbiAgICAgICAgICAgIHJlbGF0aXZlX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi5iZWZvcmUoKSlcbiAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcInN1bW1hcnktdmlld1wiKSB7XG4gICAgICAgICAgICBzdW1tYXJ5X3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi5zdW1tYXJ5KCkpXG4gICAgICAgICAgICAgLnRpbWluZyhzZWxmLnRpbWVfc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC5jYXRlZ29yeShzZWxmLmNhdGVnb3J5X3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAuYmVmb3JlKHNlbGYuYmVmb3JlKCkpXG4gICAgICAgICAgICAgLmFmdGVyKHNlbGYuYWZ0ZXIoKSlcbiAgICAgICAgICAgICAua2V5d29yZHMoc2VsZi5rZXl3b3JkX3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAub24oXCJiYS5zb3J0XCIsc2VsZi5vbihcImJhLnNvcnRcIikpXG4gICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwidGltaW5nLXZpZXdcIikge1xuICAgICAgICAgICAgdGltaW5nX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgICAgICBzdGFnZWRfZmlsdGVycyA9IHN0YWdlZF9maWx0ZXJzLnNwbGl0KFwiLFwiKS5jb25jYXQoeC5rZXkgfHwgeC51cmwpLmZpbHRlcih4ID0+IHgubGVuZ3RoKS5qb2luKFwiLFwiKVxuICAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKHN0YWdlZF9maWx0ZXJzKVxuICAgICAgICAgICAgICAgSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZF9maWx0ZXJzKVxuXG4gICAgXG4gICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pXG5cbiAgICAgIGZ1bmN0aW9uIEhBQ0tidWlsZFN0YWdlZEZpbHRlcihzdGFnZWQpIHtcblxuICAgICAgICBzdGFnZWRfZmlsdGVyX3ZpZXcodGFyZ2V0KVxuICAgICAgICAgIC5kYXRhKHN0YWdlZClcbiAgICAgICAgICAub24oXCJ1cGRhdGVcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoeClcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vbihcIm1vZGlmeVwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKShcIlwiKVxuICAgICAgICAgICAgc2VsZi5vbihcIm1vZGlmeS1maWx0ZXJcIikoeClcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgLm9uKFwiYWRkXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKFwiXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwiYWRkLWZpbHRlclwiKSh4KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmRyYXcoKVxuICAgICAgfVxuICAgICAgSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZF9maWx0ZXJzKVxuXG4gICAgICByZXR1cm4gdGhpc1xuXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG59XG4iLCJleHBvcnQgZnVuY3Rpb24gZ2V0RGF0YShhY3Rpb24sZGF5c19hZ28pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNiKXtcbiAgICBjb25zb2xlLmxvZyhkYXlzX2FnbylcblxuICAgIHZhciBVUkwgPSBcIi9jcnVzaGVyL3YyL3Zpc2l0b3IvZG9tYWluc19mdWxsX3RpbWVfbWludXRlL2NhY2hlP3VybF9wYXR0ZXJuPVwiICsgYWN0aW9uLnVybF9wYXR0ZXJuWzBdICsgXCImZmlsdGVyX2lkPVwiICsgYWN0aW9uLmFjdGlvbl9pZFxuXG4gICAgdmFyIGRhdGVfYWdvID0gbmV3IERhdGUoK25ldyBEYXRlKCktMjQqNjAqNjAqMTAwMCpkYXlzX2FnbylcbiAgICAgICwgZGF0ZSA9IGQzLnRpbWUuZm9ybWF0KFwiJVktJW0tJWRcIikoZGF0ZV9hZ28pXG5cbiAgICBpZiAoZGF5c19hZ28pIFVSTCArPSBcIiZkYXRlPVwiICsgZGF0ZVxuXG5cbiAgICBkMy5qc29uKFVSTCxmdW5jdGlvbih2YWx1ZSkge1xuXG4gICAgICB2YXIgY2F0ZWdvcmllcyA9IHZhbHVlLnN1bW1hcnkuY2F0ZWdvcnkubWFwKGZ1bmN0aW9uKHgpIHt4LmtleSA9IHgucGFyZW50X2NhdGVnb3J5X25hbWU7IHJldHVybiB4fSlcbiAgICAgIHZhbHVlLmNhdGVnb3JpZXMgPSBjYXRlZ29yaWVzXG4gICAgICB2YWx1ZS5jYXRlZ29yeSA9IHZhbHVlLnN1bW1hcnkuY2F0ZWdvcnlcbiAgICAgIHZhbHVlLmN1cnJlbnRfaG91ciA9IHZhbHVlLnN1bW1hcnkuaG91clxuICAgICAgdmFsdWUuY2F0ZWdvcnlfaG91ciA9IHZhbHVlLnN1bW1hcnkuY3Jvc3Nfc2VjdGlvblxuXG4gICAgICB2YWx1ZS5vcmlnaW5hbF91cmxzID0gdmFsdWUucmVzcG9uc2VcblxuICAgICAgY2IoZmFsc2UsdmFsdWUpXG4gICAgfSlcbiAgfVxuXG59XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlKGRhdGEsY2IpIHtcbiAgZDMueGhyKFwiL2NydXNoZXIvZnVubmVsL2FjdGlvbj9mb3JtYXQ9anNvblwiKVxuICAgIC5oZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpXG4gICAgLnBvc3QoSlNPTi5zdHJpbmdpZnkoZGF0YSksZnVuY3Rpb24oZXJyLGRhdGEpIHtcbiAgICAgIGNiKGVycixKU09OLnBhcnNlKGRhdGEucmVzcG9uc2UpLnJlc3BvbnNlKVxuICAgIH0pXG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbChjYikge1xuICBkMy5qc29uKFwiL2NydXNoZXIvZnVubmVsL2FjdGlvbj9mb3JtYXQ9anNvblwiLGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFsdWUucmVzcG9uc2UubWFwKGZ1bmN0aW9uKHgpIHsgeC5rZXkgPSB4LmFjdGlvbl9uYW1lOyB4LnZhbHVlID0geC5hY3Rpb25faWQgfSlcbiAgICBjYihmYWxzZSx2YWx1ZS5yZXNwb25zZSlcbiAgfSlcblxufVxuIiwiaW1wb3J0ICogYXMgYSBmcm9tICcuL3NyYy9hY3Rpb24uanMnO1xuXG5leHBvcnQgbGV0IGFjdGlvbiA9IGE7XG5leHBvcnQgbGV0IGRhc2hib2FyZCA9IHtcbiAgICBnZXRBbGw6IGZ1bmN0aW9uKGNiKSB7XG4gICAgICBkMy5qc29uKFwiL2NydXNoZXIvc2F2ZWRfZGFzaGJvYXJkXCIsZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2IoZmFsc2UsdmFsdWUucmVzcG9uc2UpXG4gICAgICB9KVxuICAgIH1cbn1cbmV4cG9ydCBsZXQgbGluZV9pdGVtID0ge1xuICAgIGdldEFsbDogZnVuY3Rpb24oY2IpIHtcbiAgICAgIGQzLmpzb24oXCIvbGluZV9pdGVtXCIsZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2IoZmFsc2UsdmFsdWUucmVzcG9uc2UpXG4gICAgICB9KVxuICAgIH1cbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSc7XG5pbXBvcnQge2ZpbHRlcl9kYXRhfSBmcm9tICdmaWx0ZXInO1xuaW1wb3J0IHtcbiAgYnVpbGRDYXRlZ29yaWVzLCBcbiAgYnVpbGRDYXRlZ29yeUhvdXIsIFxuICBidWlsZERhdGEsIFxuICBidWlsZERvbWFpbnMsIFxuICBidWlsZFVybHMsIFxuICBidWlsZFN1bW1hcnlEYXRhLCBcbiAgYnVpbGRTdW1tYXJ5QWdncmVnYXRpb24sIFxuICBwcmVwRGF0YSwgXG4gIHByZXBhcmVGaWx0ZXJzXG59IGZyb20gJy4uL2hlbHBlcnMnXG5cbmNvbnN0IHMgPSBzdGF0ZTtcblxuXG5cblxuXG5cbnZhciBvcHMgPSB7XG4gICAgXCJpcyBpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIilcbiAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPiAwXG4gICAgICAgIH0gXG4gICAgICB9XG4gICwgXCJpcyBub3QgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUuc3BsaXQoXCIsXCIpXG4gICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xIH0sIDApID09IDBcbiAgICAgICAgfSBcbiAgICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgY29uc3QgcyA9IHN0YXRlO1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhZGQtZmlsdGVyXCIsIGZ1bmN0aW9uKGZpbHRlcikgeyBcbiAgICAgIHMucHVibGlzaChcImZpbHRlcnNcIixzLnN0YXRlKCkuZmlsdGVycy5jb25jYXQoZmlsdGVyKS5maWx0ZXIoeCA9PiB4LnZhbHVlKSApIFxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJtb2RpZnktZmlsdGVyXCIsIGZ1bmN0aW9uKGZpbHRlcikgeyBcbiAgICAgIHZhciBmaWx0ZXJzID0gcy5zdGF0ZSgpLmZpbHRlcnNcbiAgICAgIHZhciBoYXNfZXhpc2l0aW5nID0gZmlsdGVycy5maWx0ZXIoeCA9PiAoeC5maWVsZCArIHgub3ApID09IChmaWx0ZXIuZmllbGQgKyBmaWx0ZXIub3ApIClcbiAgICAgIFxuICAgICAgaWYgKGhhc19leGlzaXRpbmcubGVuZ3RoKSB7XG4gICAgICAgIHZhciBuZXdfZmlsdGVycyA9IGZpbHRlcnMucmV2ZXJzZSgpLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKCh4LmZpZWxkID09IGZpbHRlci5maWVsZCkgJiYgKHgub3AgPT0gZmlsdGVyLm9wKSkge1xuICAgICAgICAgICAgeC52YWx1ZSArPSBcIixcIiArIGZpbHRlci52YWx1ZVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4geFxuICAgICAgICB9KVxuICAgICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIsbmV3X2ZpbHRlcnMuZmlsdGVyKHggPT4geC52YWx1ZSkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIscy5zdGF0ZSgpLmZpbHRlcnMuY29uY2F0KGZpbHRlcikuZmlsdGVyKHggPT4geC52YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIsIGZ1bmN0aW9uKHN0cikgeyBzLnB1Ymxpc2goXCJzdGFnZWRfZmlsdGVyXCIsc3RyICkgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImxvZ2ljLmNoYW5nZVwiLCBmdW5jdGlvbihsb2dpYykgeyBzLnB1Ymxpc2goXCJsb2dpY19vcHRpb25zXCIsbG9naWMpIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJmaWx0ZXIuY2hhbmdlXCIsIGZ1bmN0aW9uKGZpbHRlcnMpIHsgcy5wdWJsaXNoQmF0Y2goeyBcImZpbHRlcnNcIjpmaWx0ZXJzIH0pIH0pXG5cbiAgICAucmVnaXN0ZXJFdmVudChcInVwZGF0ZUZpbHRlclwiLCBmdW5jdGlvbihlcnIsZmlsdGVycyxfc3RhdGUpIHtcblxuICAgICAgdmFyIGZpbHRlcnMgPSBfc3RhdGUuZmlsdGVyc1xuICAgICAgdmFyIHZhbHVlID0gX3N0YXRlLmRhdGFcblxuICAgICAgaWYgKHZhbHVlID09IHVuZGVmaW5lZCkgcmV0dXJuIC8vIHJldHVybiBlYXJseSBpZiB0aGVyZSBpcyBubyBkYXRhLi4uXG5cbiAgICAgIHZhciBmaWx0ZXJzID0gcHJlcGFyZUZpbHRlcnMoZmlsdGVycylcblxuICAgICAgdmFyIGxvZ2ljID0gX3N0YXRlLmxvZ2ljX29wdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguc2VsZWN0ZWQgfSlcbiAgICAgIGxvZ2ljID0gbG9naWMubGVuZ3RoID4gMCA/IGxvZ2ljWzBdIDogX3N0YXRlLmxvZ2ljX29wdGlvbnNbMF1cblxuICAgICAgdmFyIGZ1bGxfdXJscyA9IGZpbHRlcl9kYXRhKHZhbHVlLm9yaWdpbmFsX3VybHMpXG4gICAgICAgIC5vcChcImlzIGluXCIsIG9wc1tcImlzIGluXCJdKVxuICAgICAgICAub3AoXCJpcyBub3QgaW5cIiwgb3BzW1wiaXMgbm90IGluXCJdKVxuICAgICAgICAubG9naWMobG9naWMudmFsdWUpXG4gICAgICAgIC5ieShmaWx0ZXJzKVxuXG5cbiAgICAgIC8vIHNob3VsZCBub3QgZmlsdGVyIGlmLi4uXG4gICAgICAvL2RlYnVnZ2VyXG5cbiAgICAgIGlmICggKHZhbHVlLmZ1bGxfdXJscykgJiYgXG4gICAgICAgICAgICh2YWx1ZS5mdWxsX3VybHMubGVuZ3RoID09IGZ1bGxfdXJscy5sZW5ndGgpICYmIFxuICAgICAgICAgICAoX3N0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24gJiYgKF9zdGF0ZS5jb21wYXJpc29uX2RhdGEgPT0gdmFsdWUuY29tcGFyaXNvbikpKSByZXR1cm5cblxuICAgICAgdmFsdWUuZnVsbF91cmxzID0gZnVsbF91cmxzXG5cbiAgICAgIHZhciBjb21wYXJlVG8gPSBfc3RhdGUuY29tcGFyaXNvbl9kYXRhID8gX3N0YXRlLmNvbXBhcmlzb25fZGF0YS5vcmlnaW5hbF91cmxzIDogdmFsdWUub3JpZ2luYWxfdXJscztcblxuICAgICAgdmFsdWUuY29tcGFyaXNvbiA9IGNvbXBhcmVUb1xuXG4gICAgICAvLyBhbGwgdGhpcyBsb2dpYyBzaG91bGQgYmUgbW92ZSB0byB0aGUgcmVzcGVjdGl2ZSB2aWV3cy4uLlxuXG4gICAgICAvLyAtLS0tLSBTVEFSVCA6IEZPUiBNRURJQSBQTEFOIC0tLS0tIC8vXG5cbiAgICAgIGJ1aWxkQ2F0ZWdvcmllcyh2YWx1ZSlcbiAgICAgIGJ1aWxkQ2F0ZWdvcnlIb3VyKHZhbHVlKVxuXG4gICAgICAvLyAtLS0tLSBFTkQgOiBGT1IgTUVESUEgUExBTiAtLS0tLSAvL1xuXG4gICAgICB2YXIgdGFicyA9IFtcbiAgICAgICAgICBidWlsZERvbWFpbnModmFsdWUpXG4gICAgICAgICwgYnVpbGRVcmxzKHZhbHVlKVxuICAgICAgICAvLywgYnVpbGRUb3BpY3ModmFsdWUpXG4gICAgICBdXG5cbiAgICAgIHZhciBzdW1tYXJ5X2RhdGEgPSBidWlsZFN1bW1hcnlEYXRhKHZhbHVlLmZ1bGxfdXJscylcbiAgICAgICAgLCBwb3Bfc3VtbWFyeV9kYXRhID0gYnVpbGRTdW1tYXJ5RGF0YShjb21wYXJlVG8pXG5cbiAgICAgIHZhciBzdW1tYXJ5ID0gYnVpbGRTdW1tYXJ5QWdncmVnYXRpb24oc3VtbWFyeV9kYXRhLHBvcF9zdW1tYXJ5X2RhdGEpXG5cbiAgICAgIHZhciB0cyA9IHByZXBEYXRhKHZhbHVlLmZ1bGxfdXJscylcbiAgICAgICAgLCBwb3BfdHMgPSBwcmVwRGF0YShjb21wYXJlVG8pXG5cbiAgICAgIHZhciBtYXBwZWR0cyA9IHRzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjOyByZXR1cm4gcH0sIHt9KVxuXG4gICAgICB2YXIgcHJlcHBlZCA9IHBvcF90cy5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAga2V5OiB4LmtleVxuICAgICAgICAgICwgaG91cjogeC5ob3VyXG4gICAgICAgICAgLCBtaW51dGU6IHgubWludXRlXG4gICAgICAgICAgLCB2YWx1ZTI6IHgudmFsdWVcbiAgICAgICAgICAsIHZhbHVlOiBtYXBwZWR0c1t4LmtleV0gPyAgbWFwcGVkdHNbeC5rZXldLnZhbHVlIDogMFxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICB2YXIgY2F0X3JvbGwgPSBkMy5uZXN0KClcbiAgICAgICAgLmtleShmdW5jdGlvbihrKSB7IHJldHVybiBrLnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgICAgIHJldHVybiB2LnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgICAgIHAudmlld3MgKz0gYy5jb3VudFxuICAgICAgICAgICAgcC5zZXNzaW9ucyArPSBjLnVuaXF1ZXNcbiAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgfSx7IGFydGljbGVzOiB7fSwgdmlld3M6IDAsIHNlc3Npb25zOiAwfSlcbiAgICAgICAgfSlcbiAgICAgICAgLmVudHJpZXModmFsdWUuZnVsbF91cmxzKVxuXG4gICAgICB2YXIgcG9wX2NhdF9yb2xsID0gZDMubmVzdCgpXG4gICAgICAgIC5rZXkoZnVuY3Rpb24oaykgeyByZXR1cm4gay5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgICAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgICAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG4gICAgICAgICAgICByZXR1cm4gcFxuICAgICAgICAgIH0seyBhcnRpY2xlczoge30sIHZpZXdzOiAwLCBzZXNzaW9uczogMH0pXG4gICAgICAgIH0pXG4gICAgICAgIC5lbnRyaWVzKGNvbXBhcmVUbylcblxuICAgICAgdmFyIG1hcHBlZF9jYXRfcm9sbCA9IGNhdF9yb2xsLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjOyByZXR1cm4gcH0sIHt9KVxuXG4gICAgICB2YXIgY2F0X3N1bW1hcnkgPSBwb3BfY2F0X3JvbGwubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGtleTogeC5rZXlcbiAgICAgICAgICAsIHBvcDogeC52YWx1ZXMudmlld3NcbiAgICAgICAgICAsIHNhbXA6IG1hcHBlZF9jYXRfcm9sbFt4LmtleV0gPyBtYXBwZWRfY2F0X3JvbGxbeC5rZXldLnZhbHVlcy52aWV3cyA6IDBcbiAgICAgICAgfVxuICAgICAgfSkuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGIucG9wIC0gYS5wb3B9KVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5ICE9IFwiTkFcIiB9KVxuXG4gICAgICB2YXIgcGFyc2VXb3JkcyA9IGZ1bmN0aW9uKHAsYykge1xuICAgICAgICB2YXIgc3BsaXR0ZWQgPSBjLnVybC5zcGxpdChcIi5jb20vXCIpXG4gICAgICAgIGlmIChzcGxpdHRlZC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgdmFyIGxhc3QgPSBzcGxpdHRlZFsxXS5zcGxpdChcIi9cIikuc2xpY2UoLTEpWzBdLnNwbGl0KFwiP1wiKVswXVxuICAgICAgICAgIHZhciB3b3JkcyA9IGxhc3Quc3BsaXQoXCItXCIpLmpvaW4oXCIrXCIpLnNwbGl0KFwiK1wiKS5qb2luKFwiX1wiKS5zcGxpdChcIl9cIikuam9pbihcIiBcIikuc3BsaXQoXCIgXCIpXG4gICAgICAgICAgd29yZHMubWFwKGZ1bmN0aW9uKHcpIHsgXG4gICAgICAgICAgICBpZiAoKHcubGVuZ3RoIDw9IDQpIHx8IChTdHJpbmcocGFyc2VJbnQod1swXSkpID09IHdbMF0gKSB8fCAody5pbmRleE9mKFwiYXNwXCIpID4gLTEpIHx8ICh3LmluZGV4T2YoXCJwaHBcIikgPiAtMSkgfHwgKHcuaW5kZXhPZihcImh0bWxcIikgPiAtMSkgKSByZXR1cm5cbiAgICAgICAgICAgIHBbd10gPSBwW3ddID8gcFt3XSArIDEgOiAxXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcFxuICAgICAgfVxuXG4gICAgICB2YXIgcG9wX2NvdW50cyA9IGNvbXBhcmVUby5yZWR1Y2UocGFyc2VXb3Jkcyx7fSlcbiAgICAgIHZhciBzYW1wX2NvdW50cyA9IHZhbHVlLmZ1bGxfdXJscy5yZWR1Y2UocGFyc2VXb3Jkcyx7fSlcblxuXG4gICAgICB2YXIgZW50cmllcyA9IGQzLmVudHJpZXMocG9wX2NvdW50cykuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgPiAxfSlcbiAgICAgICAgLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgeC5zYW1wID0gc2FtcF9jb3VudHNbeC5rZXldXG4gICAgICAgICAgeC5wb3AgPSB4LnZhbHVlXG4gICAgICAgICAgcmV0dXJuIHhcbiAgICAgICAgfSlcbiAgICAgICAgLnNvcnQoZnVuY3Rpb24oYSxiKSB7IHJldHVybiBiLnBvcCAtIGEucG9wfSlcbiAgICAgICAgLnNsaWNlKDAsMjUpXG5cblxuICAgICAgdmFyIG1vZGlmeVdpdGhDb21wYXJpc29ucyA9IGZ1bmN0aW9uKGRzKSB7XG5cbiAgICAgICAgdmFyIGFnZ3MgPSBkcy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgICAgcC5wb3BfbWF4ID0gKHAucG9wX21heCB8fCAwKSA8IGMucG9wID8gYy5wb3AgOiBwLnBvcF9tYXhcbiAgICAgICAgICBwLnBvcF90b3RhbCA9IChwLnBvcF90b3RhbCB8fCAwKSArIGMucG9wXG5cbiAgICAgICAgICBpZiAoYy5zYW1wKSB7XG4gICAgICAgICAgICBwLnNhbXBfbWF4ID0gKHAuc2FtcF9tYXggfHwgMCkgPiBjLnNhbXAgPyBwLnNhbXBfbWF4IDogYy5zYW1wXG4gICAgICAgICAgICBwLnNhbXBfdG90YWwgPSAocC5zYW1wX3RvdGFsIHx8IDApICsgYy5zYW1wXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgfSx7fSlcblxuICAgICAgICAvL2NvbnNvbGUubG9nKGFnZ3MpXG5cbiAgICAgICAgZHMubWFwKGZ1bmN0aW9uKG8pIHtcbiAgICAgICAgICBvLm5vcm1hbGl6ZWRfcG9wID0gby5wb3AgLyBhZ2dzLnBvcF9tYXhcbiAgICAgICAgICBvLnBlcmNlbnRfcG9wID0gby5wb3AgLyBhZ2dzLnBvcF90b3RhbFxuXG4gICAgICAgICAgby5ub3JtYWxpemVkX3NhbXAgPSBvLnNhbXAgLyBhZ2dzLnNhbXBfbWF4XG4gICAgICAgICAgby5wZXJjZW50X3NhbXAgPSBvLnNhbXAgLyBhZ2dzLnNhbXBfdG90YWxcblxuICAgICAgICAgIG8ubm9ybWFsaXplZF9kaWZmID0gKG8ubm9ybWFsaXplZF9zYW1wIC0gby5ub3JtYWxpemVkX3BvcCkvby5ub3JtYWxpemVkX3BvcFxuICAgICAgICAgIG8ucGVyY2VudF9kaWZmID0gKG8ucGVyY2VudF9zYW1wIC0gby5wZXJjZW50X3BvcCkvby5wZXJjZW50X3BvcFxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICBtb2RpZnlXaXRoQ29tcGFyaXNvbnMoY2F0X3N1bW1hcnkpXG4gICAgICBtb2RpZnlXaXRoQ29tcGFyaXNvbnMoZW50cmllcylcblxuXG4gICAgICBpZiAodmFsdWUuYmVmb3JlKSB7XG4gICAgICAgIHZhciBiZWZvcmVfdXJscyA9IGZpbHRlcl9kYXRhKHZhbHVlLmJlZm9yZSlcbiAgICAgICAgICAub3AoXCJpcyBpblwiLCBvcHNbXCJpcyBpblwiXSlcbiAgICAgICAgICAub3AoXCJpcyBub3QgaW5cIiwgb3BzW1wiaXMgbm90IGluXCJdKVxuICAgICAgICAgIC8vLm9wKFwiZG9lcyBub3QgY29udGFpblwiLCBvcHNbXCJkb2VzIG5vdCBjb250YWluXCJdKVxuICAgICAgICAgIC8vLm9wKFwiY29udGFpbnNcIiwgb3BzW1wiY29udGFpbnNcIl0pXG4gICAgICAgICAgLmxvZ2ljKGxvZ2ljLnZhbHVlKVxuICAgICAgICAgIC5ieShmaWx0ZXJzKVxuXG4gICAgICAgIHZhciBhZnRlcl91cmxzID0gZmlsdGVyX2RhdGEodmFsdWUuYWZ0ZXIpXG4gICAgICAgICAgLm9wKFwiaXMgaW5cIiwgb3BzW1wiaXMgaW5cIl0pXG4gICAgICAgICAgLm9wKFwiaXMgbm90IGluXCIsIG9wc1tcImlzIG5vdCBpblwiXSlcbiAgICAgICAgICAvLy5vcChcImRvZXMgbm90IGNvbnRhaW5cIiwgb3BzW1wiZG9lcyBub3QgY29udGFpblwiXSlcbiAgICAgICAgICAvLy5vcChcImNvbnRhaW5zXCIsIG9wc1tcImNvbnRhaW5zXCJdKVxuICAgICAgICAgIC5sb2dpYyhsb2dpYy52YWx1ZSlcbiAgICAgICAgICAuYnkoZmlsdGVycylcblxuXG4gICAgICAgIHZhciBidSA9IGQzLm5lc3QoKVxuICAgICAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgICAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgICAgICAgLmVudHJpZXMoYmVmb3JlX3VybHMpXG5cbiAgICAgICAgdmFyIGF1ID0gZDMubmVzdCgpXG4gICAgICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnRpbWVfZGlmZl9idWNrZXQgfSlcbiAgICAgICAgICAuZW50cmllcyhhZnRlcl91cmxzKVxuXG4gICAgICAgIHZhciBidWNrZXRzID0gWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgqNjAgfSlcbiAgICAgICAgICAsIHBvcF9jYXRlZ29yaWVzID0gY2F0X3N1bW1hcnkucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGM7IHJldHVybiBwIH0sIHt9KVxuICAgICAgICAgICwgY2F0cyA9IGNhdF9zdW1tYXJ5Lm1hcChmdW5jdGlvbihwKSB7IHJldHVybiBwLmtleSB9KVxuXG4gICAgICAgIHZhciBiZWZvcmVfY2F0ZWdvcmllcyA9IGJ1aWxkRGF0YShiZWZvcmVfdXJscyxidWNrZXRzLHBvcF9jYXRlZ29yaWVzKVxuICAgICAgICAgICwgYWZ0ZXJfY2F0ZWdvcmllcyA9IGJ1aWxkRGF0YShhZnRlcl91cmxzLGJ1Y2tldHMscG9wX2NhdGVnb3JpZXMpXG5cbiAgICAgICAgdmFyIHNvcnRieSA9IF9zdGF0ZS5zb3J0YnlcblxuICAgICAgICBpZiAoc29ydGJ5ID09IFwic2NvcmVcIikge1xuXG4gICAgICAgICAgYmVmb3JlX2NhdGVnb3JpZXMgPSBiZWZvcmVfY2F0ZWdvcmllcy5zb3J0KGZ1bmN0aW9uKGEsYikgeyBcbiAgICAgICAgICAgIHZhciBwID0gLTEsIHEgPSAtMTtcbiAgICAgICAgICAgIHRyeSB7IHAgPSBiLnZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSA9PSBcIjYwMFwiIH0pWzBdLnNjb3JlIH0gY2F0Y2goZSkge31cbiAgICAgICAgICAgIHRyeSB7IHEgPSBhLnZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSA9PSBcIjYwMFwiIH0pWzBdLnNjb3JlIH0gY2F0Y2goZSkge31cbiAgICAgICAgICAgIHJldHVybiBkMy5hc2NlbmRpbmcocCwgcSlcbiAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICB9IGVsc2UgaWYgKHNvcnRieSA9PSBcInBvcFwiKSB7XG5cbiAgICAgICAgICBiZWZvcmVfY2F0ZWdvcmllcyA9IGJlZm9yZV9jYXRlZ29yaWVzLnNvcnQoZnVuY3Rpb24oYSxiKSB7IFxuICAgICAgICAgICAgdmFyIHAgPSBjYXRzLmluZGV4T2YoYS5rZXkpXG4gICAgICAgICAgICAgICwgcSA9IGNhdHMuaW5kZXhPZihiLmtleSlcbiAgICAgICAgICAgIHJldHVybiBkMy5hc2NlbmRpbmcocCA+IC0xID8gcCA6IDEwMDAwLCBxID4gLTEgPyBxIDogMTAwMDApXG4gICAgICAgICAgfSlcblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgYmVmb3JlX2NhdGVnb3JpZXMgPSBiZWZvcmVfY2F0ZWdvcmllcy5zb3J0KGZ1bmN0aW9uKGEsYikgeyBcbiAgICAgICAgICAgIHZhciBwID0gLTEsIHEgPSAtMTtcbiAgICAgICAgICAgIHRyeSB7IHAgPSBiLnZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleSA9PSBcIjYwMFwiIH0pWzBdLnBlcmNlbnRfZGlmZiB9IGNhdGNoKGUpIHt9XG4gICAgICAgICAgICB0cnkgeyBxID0gYS52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5wZXJjZW50X2RpZmYgfSBjYXRjaChlKSB7fVxuICAgICAgICAgICAgcmV0dXJuIGQzLmFzY2VuZGluZyhwLCBxKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICBcbiAgICAgICAgfVxuXG5cbiAgICAgICAgdmFyIG9yZGVyID0gYmVmb3JlX2NhdGVnb3JpZXMubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG5cbiAgICAgICAgYWZ0ZXJfY2F0ZWdvcmllcyA9IGFmdGVyX2NhdGVnb3JpZXMuZmlsdGVyKGZ1bmN0aW9uKHgpe3JldHVybiBvcmRlci5pbmRleE9mKHgua2V5KSA+IC0xfSkuc29ydChmdW5jdGlvbihhLGIpIHtcbiAgICAgICAgICByZXR1cm4gb3JkZXIuaW5kZXhPZihhLmtleSkgLSBvcmRlci5pbmRleE9mKGIua2V5KVxuICAgICAgICB9KVxuXG4gICAgICAgIHMuc2V0U3RhdGljKFwiYmVmb3JlX3VybHNcIix7XCJhZnRlclwiOmFmdGVyX3VybHMsXCJiZWZvcmVcIjpiZWZvcmVfdXJscyxcImNhdGVnb3J5XCI6Y2F0X3N1bW1hcnksXCJiZWZvcmVfY2F0ZWdvcmllc1wiOmJlZm9yZV9jYXRlZ29yaWVzLFwiYWZ0ZXJfY2F0ZWdvcmllc1wiOmFmdGVyX2NhdGVnb3JpZXMsXCJzb3J0YnlcIjp2YWx1ZS5zb3J0Ynl9KSBcbiAgICAgICAgcy5zZXRTdGF0aWMoXCJhZnRlcl91cmxzXCIsIGFmdGVyX3VybHMpXG5cbiAgICAgICAgXG5cblxuICAgICAgfVxuXG4gICAgICBcblxuICAgICAgcy5zZXRTdGF0aWMoXCJrZXl3b3JkX3N1bW1hcnlcIiwgZW50cmllcykgXG4gICAgICBzLnNldFN0YXRpYyhcInRpbWVfc3VtbWFyeVwiLCBwcmVwcGVkKVxuICAgICAgcy5zZXRTdGF0aWMoXCJjYXRlZ29yeV9zdW1tYXJ5XCIsIGNhdF9zdW1tYXJ5KVxuXG4gICAgICBzLnNldFN0YXRpYyhcInN1bW1hcnlcIixzdW1tYXJ5KVxuICAgICAgcy5zZXRTdGF0aWMoXCJ0YWJzXCIsdGFicylcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImZvcm1hdHRlZF9kYXRhXCIsdmFsdWUpXG5cbiAgICB9KVxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJztcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuICBjb25zdCBzID0gc3RhdGU7XG5cbiAgc3RhdGVcbiAgICAucmVnaXN0ZXJFdmVudChcImFjdGlvbi5jaGFuZ2VcIiwgZnVuY3Rpb24oYWN0aW9uKSB7IHMucHVibGlzaChcInNlbGVjdGVkX2FjdGlvblwiLGFjdGlvbikgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImFjdGlvbl9kYXRlLmNoYW5nZVwiLCBmdW5jdGlvbihkYXRlKSB7IHMucHVibGlzaChcImFjdGlvbl9kYXRlXCIsZGF0ZSkgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIiwgZnVuY3Rpb24oZGF0ZSkgeyBzLnB1Ymxpc2goXCJjb21wYXJpc29uX2RhdGVcIixkYXRlKSB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwiY29tcGFyaXNvbi5jaGFuZ2VcIiwgZnVuY3Rpb24oYWN0aW9uKSB7IFxuICAgICAgaWYgKGFjdGlvbi52YWx1ZSA9PSBmYWxzZSkgcmV0dXJuIHMucHVibGlzaChcInNlbGVjdGVkX2NvbXBhcmlzb25cIixmYWxzZSlcbiAgICAgIHMucHVibGlzaChcInNlbGVjdGVkX2NvbXBhcmlzb25cIixhY3Rpb24pXG4gICAgfSlcblxuXG59XG4iLCJpbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnXG5pbXBvcnQgZmlsdGVySW5pdCBmcm9tICcuL2V2ZW50cy9maWx0ZXJfZXZlbnRzJ1xuaW1wb3J0IGFjdGlvbkluaXQgZnJvbSAnLi9ldmVudHMvYWN0aW9uX2V2ZW50cydcblxuXG5jb25zdCBzID0gc3RhdGU7XG5cbmNvbnN0IGRlZXBjb3B5ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh4KSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcblxuICBmaWx0ZXJJbml0KClcbiAgYWN0aW9uSW5pdCgpXG5cbiAgLy8gT1RIRVIgZXZlbnRzXG5cbiAgc3RhdGVcbiAgICAucmVnaXN0ZXJFdmVudChcInZpZXcuY2hhbmdlXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHMudXBkYXRlKFwibG9hZGluZ1wiLHRydWUpXG4gICAgICB2YXIgQ1AgPSBkZWVwY29weShzLnN0YXRlKCkuZGFzaGJvYXJkX29wdGlvbnMpLm1hcChmdW5jdGlvbihkKSB7IGQuc2VsZWN0ZWQgPSAoeC52YWx1ZSA9PSBkLnZhbHVlKSA/IDEgOiAwOyByZXR1cm4gZCB9KVxuICAgICAgcy5wdWJsaXNoKFwiZGFzaGJvYXJkX29wdGlvbnNcIixDUClcbiAgICB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwidGFiLmNoYW5nZVwiLCBmdW5jdGlvbih4KSB7XG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIix0cnVlKVxuICAgICAgY29uc3QgdmFsdWUgPSBzLnN0YXRlKClcbiAgICAgIHZhbHVlLnRhYnMubWFwKGZ1bmN0aW9uKHQpIHsgdC5zZWxlY3RlZCA9ICh0LmtleSA9PSB4LmtleSkgPyAxIDogMCB9KVxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwidGFic1wiLHZhbHVlLnRhYnMpXG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImJhLnNvcnRcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgcy5wdWJsaXNoQmF0Y2goeyBcInNvcnRieVwiOiB4LnZhbHVlLCBcImZpbHRlcnNcIjp2YWx1ZS5maWx0ZXJzIH0pXG4gICAgfSlcbn1cbiIsImltcG9ydCB7cXN9IGZyb20gJ3N0YXRlJztcbmltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSc7XG5pbXBvcnQge2NvbXBhcmV9IGZyb20gJy4uL2hlbHBlcnMnXG5cbmZ1bmN0aW9uIHB1Ymxpc2hRU1VwZGF0ZXModXBkYXRlcyxxc19zdGF0ZSkge1xuICBpZiAoT2JqZWN0LmtleXModXBkYXRlcykubGVuZ3RoKSB7XG4gICAgdXBkYXRlc1tcInFzX3N0YXRlXCJdID0gcXNfc3RhdGVcbiAgICBzdGF0ZS5wdWJsaXNoQmF0Y2godXBkYXRlcylcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuXG4gIHdpbmRvdy5vbnBvcHN0YXRlID0gZnVuY3Rpb24oaSkge1xuXG4gICAgdmFyIHN0YXRlID0gcy5fc3RhdGVcbiAgICAgICwgcXNfc3RhdGUgPSBpLnN0YXRlXG5cbiAgICB2YXIgdXBkYXRlcyA9IGNvbXBhcmUocXNfc3RhdGUsc3RhdGUpXG4gICAgcHVibGlzaFFTVXBkYXRlcyh1cGRhdGVzLHFzX3N0YXRlKVxuICB9XG5cbiAgY29uc3QgcyA9IHN0YXRlO1xuXG4gIHN0YXRlXG4gICAgLnN1YnNjcmliZShcImhpc3RvcnlcIixmdW5jdGlvbihlcnJvcixfc3RhdGUpIHtcbiAgICAgIC8vY29uc29sZS5sb2coXG4gICAgICAvLyAgXCJjdXJyZW50OiBcIitKU09OLnN0cmluZ2lmeShfc3RhdGUucXNfc3RhdGUpLCBcbiAgICAgIC8vICBKU09OLnN0cmluZ2lmeShfc3RhdGUuZmlsdGVycyksIFxuICAgICAgLy8gIF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9uc1xuICAgICAgLy8pXG5cbiAgICAgIHZhciBmb3Jfc3RhdGUgPSBbXCJmaWx0ZXJzXCJdXG5cbiAgICAgIHZhciBxc19zdGF0ZSA9IGZvcl9zdGF0ZS5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBpZiAoX3N0YXRlW2NdKSBwW2NdID0gX3N0YXRlW2NdXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICBpZiAoX3N0YXRlLnNlbGVjdGVkX2FjdGlvbikgcXNfc3RhdGVbJ3NlbGVjdGVkX2FjdGlvbiddID0gX3N0YXRlLnNlbGVjdGVkX2FjdGlvbi5hY3Rpb25faWRcbiAgICAgIGlmIChfc3RhdGUuc2VsZWN0ZWRfY29tcGFyaXNvbikgcXNfc3RhdGVbJ3NlbGVjdGVkX2NvbXBhcmlzb24nXSA9IF9zdGF0ZS5zZWxlY3RlZF9jb21wYXJpc29uLmFjdGlvbl9pZFxuICAgICAgaWYgKF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9ucykgcXNfc3RhdGVbJ3NlbGVjdGVkX3ZpZXcnXSA9IF9zdGF0ZS5kYXNoYm9hcmRfb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZVxuICAgICAgaWYgKF9zdGF0ZS5hY3Rpb25fZGF0ZSkgcXNfc3RhdGVbJ2FjdGlvbl9kYXRlJ10gPSBfc3RhdGUuYWN0aW9uX2RhdGVcbiAgICAgIGlmIChfc3RhdGUuY29tcGFyaXNvbl9kYXRlKSBxc19zdGF0ZVsnY29tcGFyaXNvbl9kYXRlJ10gPSBfc3RhdGUuY29tcGFyaXNvbl9kYXRlXG5cblxuICAgICAgaWYgKF9zdGF0ZS5zZWxlY3RlZF9hY3Rpb24gJiYgcXMocXNfc3RhdGUpLnRvKHFzX3N0YXRlKSAhPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoKSB7XG4gICAgICAgIHMucHVibGlzaChcInFzX3N0YXRlXCIscXNfc3RhdGUpXG4gICAgICB9XG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwiaGlzdG9yeS5hY3Rpb25zXCIsIGZ1bmN0aW9uKGVycm9yLHZhbHVlLF9zdGF0ZSkge1xuICAgICAgdmFyIHFzX3N0YXRlID0gcXMoe30pLmZyb20od2luZG93LmxvY2F0aW9uLnNlYXJjaClcbiAgICAgIGlmICh3aW5kb3cubG9jYXRpb24uc2VhcmNoLmxlbmd0aCAmJiBPYmplY3Qua2V5cyhxc19zdGF0ZSkubGVuZ3RoKSB7XG4gICAgICAgIHZhciB1cGRhdGVzID0gY29tcGFyZShxc19zdGF0ZSxfc3RhdGUpXG4gICAgICAgIHJldHVybiBwdWJsaXNoUVNVcGRhdGVzKHVwZGF0ZXMscXNfc3RhdGUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzLnB1Ymxpc2goXCJzZWxlY3RlZF9hY3Rpb25cIix2YWx1ZVswXSlcbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJoaXN0b3J5LnFzX3N0YXRlXCIsIGZ1bmN0aW9uKGVycm9yLHFzX3N0YXRlLF9zdGF0ZSkge1xuXG4gICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoaGlzdG9yeS5zdGF0ZSkgPT0gSlNPTi5zdHJpbmdpZnkocXNfc3RhdGUpKSByZXR1cm5cbiAgICAgIGlmICh3aW5kb3cubG9jYXRpb24uc2VhcmNoID09IFwiXCIpIGhpc3RvcnkucmVwbGFjZVN0YXRlKHFzX3N0YXRlLFwiXCIscXMocXNfc3RhdGUpLnRvKHFzX3N0YXRlKSlcbiAgICAgIGVsc2UgaGlzdG9yeS5wdXNoU3RhdGUocXNfc3RhdGUsXCJcIixxcyhxc19zdGF0ZSkudG8ocXNfc3RhdGUpKVxuXG4gICAgfSlcbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCAqIGFzIGFwaSBmcm9tICdhcGknXG5cbmNvbnN0IHMgPSBzdGF0ZTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcblxuICAvLyBTdWJzY3JpcHRpb25zIHRoYXQgcmVjZWl2ZSBkYXRhIC8gbW9kaWZ5IC8gY2hhbmdlIHdoZXJlIGl0IGlzIHN0b3JlZFxuXG4gIHN0YXRlXG4gICAgLnN1YnNjcmliZShcInJlY2VpdmUuZGF0YVwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJsb2dpY19jYXRlZ29yaWVzXCIsdmFsdWUuY2F0ZWdvcmllcylcbiAgICAgIHMucHVibGlzaChcImZpbHRlcnNcIixzdGF0ZS5maWx0ZXJzKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcInJlY2VpdmUuY29tcGFyaXNvbl9kYXRhXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaChcImZpbHRlcnNcIixzdGF0ZS5maWx0ZXJzKVxuICAgIH0pXG5cblxuICAvLyBTdWJzY3JpcHRpb25zIHRoYXQgd2lsbCBnZXQgbW9yZSBkYXRhXG5cbiAgc3RhdGVcbiAgICAuc3Vic2NyaWJlKFwiZ2V0LmFjdGlvbl9kYXRlXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImRhdGFcIixhcGkuYWN0aW9uLmdldERhdGEoc3RhdGUuc2VsZWN0ZWRfYWN0aW9uLHN0YXRlLmFjdGlvbl9kYXRlKSlcbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuY29tcGFyaXNvbl9kYXRlXCIsZnVuY3Rpb24oZXJyb3IsdmFsdWUsc3RhdGUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybiBzLnB1Ymxpc2hTdGF0aWMoXCJjb21wYXJpc29uX2RhdGFcIixmYWxzZSlcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YShzdGF0ZS5zZWxlY3RlZF9jb21wYXJpc29uLHN0YXRlLmNvbXBhcmlzb25fZGF0ZSkpXG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwiZ2V0LnNlbGVjdGVkX2FjdGlvblwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJkYXRhXCIsYXBpLmFjdGlvbi5nZXREYXRhKHZhbHVlLHN0YXRlLmFjdGlvbl9kYXRlKSlcbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJnZXQuc2VsZWN0ZWRfY29tcGFyaXNvblwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBpZiAoIXZhbHVlKSByZXR1cm4gcy5wdWJsaXNoU3RhdGljKFwiY29tcGFyaXNvbl9kYXRhXCIsZmFsc2UpXG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJjb21wYXJpc29uX2RhdGFcIixhcGkuYWN0aW9uLmdldERhdGEodmFsdWUsc3RhdGUuY29tcGFyaXNvbl9kYXRlKSlcbiAgICB9KVxuXG5cbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSdcbmltcG9ydCB7cXN9IGZyb20gJ3N0YXRlJ1xuaW1wb3J0IGJ1aWxkIGZyb20gJy4vYnVpbGQnXG5pbXBvcnQgaGlzdG9yeVN1YnNjcmlwdGlvbnMgZnJvbSAnLi9zdWJzY3JpcHRpb25zL2hpc3RvcnknXG5pbXBvcnQgYXBpU3Vic2NyaXB0aW9ucyBmcm9tICcuL3N1YnNjcmlwdGlvbnMvYXBpJ1xuXG5cbmNvbnN0IHMgPSBzdGF0ZTtcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0KCkge1xuXG4gIGhpc3RvcnlTdWJzY3JpcHRpb25zKClcbiAgYXBpU3Vic2NyaXB0aW9ucygpXG5cbiAgXG4gIHN0YXRlXG4gICAgLnN1YnNjcmliZShcImNoYW5nZS5sb2FkaW5nXCIsIGZ1bmN0aW9uKGVycm9yLGxvYWRpbmcsdmFsdWUpIHsgYnVpbGQoKSgpIH0pXG4gICAgLnN1YnNjcmliZShcImNoYW5nZS5kYXNoYm9hcmRfb3B0aW9uc1wiLCBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKSlcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLnRhYnNcIiwgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikpIFxuICAgIC5zdWJzY3JpYmUoXCJjaGFuZ2UubG9naWNfb3B0aW9uc1wiLCBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKSApXG4gICAgLnN1YnNjcmliZShcInVwZGF0ZS5maWx0ZXJzXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKVxuICAgIFxuXG4gIC8vIFJFRFJBVzogdGhpcyBpcyB3aGVyZSB0aGUgZW50aXJlIGFwcCBnZXRzIHJlZHJhd24gLSBpZiBmb3JtYXR0ZWRfZGF0YSBjaGFuZ2VzLCByZWRyYXcgdGhlIGFwcFxuXG4gIHN0YXRlXG4gICAgLnN1YnNjcmliZShcInJlZHJhdy5mb3JtYXR0ZWRfZGF0YVwiLCBmdW5jdGlvbihlcnJvcixmb3JtYXR0ZWRfZGF0YSx2YWx1ZSkgeyBcbiAgICAgIHMudXBkYXRlKFwibG9hZGluZ1wiLGZhbHNlKTsgXG4gICAgICBidWlsZCgpKCkgXG4gICAgfSlcbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCBkMyBmcm9tICdkMydcbmltcG9ydCAqIGFzIGFwaSBmcm9tICdhcGknXG5pbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnXG5pbXBvcnQgdmlldyBmcm9tICcuL3ZpZXcnXG5pbXBvcnQgaW5pdEV2ZW50cyBmcm9tICcuL2V2ZW50cydcbmltcG9ydCBpbml0U3Vic2NyaXB0aW9ucyBmcm9tICcuL3N1YnNjcmlwdGlvbnMnXG5cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGJ1aWxkKHRhcmdldCkge1xuICBjb25zdCBkYiA9IG5ldyBEYXNoYm9hcmQodGFyZ2V0KVxuICByZXR1cm4gZGJcbn1cblxuY2xhc3MgRGFzaGJvYXJkIHtcblxuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBpbml0RXZlbnRzKClcbiAgICBpbml0U3Vic2NyaXB0aW9ucygpXG4gICAgdGhpcy50YXJnZXQodGFyZ2V0KVxuICAgIHRoaXMuaW5pdCgpXG5cbiAgICByZXR1cm4gdGhpcy5jYWxsLmJpbmQodGhpcylcbiAgfVxuXG4gIHRhcmdldCh0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXQgfHwgZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QoXCIuY29udGFpbmVyXCIpLFwiZGl2XCIsXCJkaXZcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAwcHhcIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCJhdXRvXCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcImF1dG9cIilcbiAgfVxuXG4gIGluaXQoKSB7XG4gICAgbGV0IHMgPSBzdGF0ZTtcbiAgICBsZXQgdmFsdWUgPSBzLnN0YXRlKClcbiAgICB0aGlzLmRlZmF1bHRzKHMpXG4gIH1cblxuICBkZWZhdWx0cyhzKSB7XG5cbiAgICBpZiAoISFzLnN0YXRlKCkuZGFzaGJvYXJkX29wdGlvbnMpIHJldHVybiAvLyBkb24ndCByZWxvYWQgZGVmYXVsdHMgaWYgcHJlc2VudFxuXG4gICAgcy5wdWJsaXNoU3RhdGljKFwiYWN0aW9uc1wiLGFwaS5hY3Rpb24uZ2V0QWxsKVxuICAgIHMucHVibGlzaFN0YXRpYyhcInNhdmVkXCIsYXBpLmRhc2hib2FyZC5nZXRBbGwpXG4gICAgcy5wdWJsaXNoU3RhdGljKFwibGluZV9pdGVtc1wiLGFwaS5saW5lX2l0ZW0uZ2V0QWxsKVxuXG4gICAgdmFyIERFRkFVTFRTID0ge1xuICAgICAgICBsb2dpY19vcHRpb25zOiBbe1wia2V5XCI6XCJBbGxcIixcInZhbHVlXCI6XCJhbmRcIn0se1wia2V5XCI6XCJBbnlcIixcInZhbHVlXCI6XCJvclwifV1cbiAgICAgICwgbG9naWNfY2F0ZWdvcmllczogW11cbiAgICAgICwgZmlsdGVyczogW3t9XSBcbiAgICAgICwgZGFzaGJvYXJkX29wdGlvbnM6IFtcbiAgICAgICAgICAgIHtcImtleVwiOlwiRGF0YSBzdW1tYXJ5XCIsXCJ2YWx1ZVwiOlwic3VtbWFyeS12aWV3XCIsXCJzZWxlY3RlZFwiOjF9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIkV4cGxvcmUgZGF0YVwiLFwidmFsdWVcIjpcImRhdGEtdmlld1wiLFwic2VsZWN0ZWRcIjowfVxuICAgICAgICAgICwge1wia2V5XCI6XCJCZWZvcmUgJiBBZnRlclwiLFwidmFsdWVcIjpcImJhLXZpZXdcIixcInNlbGVjdGVkXCI6MH1cbiAgICAgICAgICAsIHtcImtleVwiOlwiVGltaW5nXCIsXCJ2YWx1ZVwiOlwidGltaW5nLXZpZXdcIixcInNlbGVjdGVkXCI6MH1cbiAgICAgICAgICAsIHtcImtleVwiOlwiTWVkaWEgUGxhblwiLCBcInZhbHVlXCI6XCJtZWRpYS12aWV3XCIsXCJzZWxlY3RlZFwiOjB9XG5cbiAgICAgICAgXVxuICAgIH1cblxuICAgIHMudXBkYXRlKGZhbHNlLERFRkFVTFRTKVxuICB9XG5cbiAgY2FsbCgpIHtcblxuICAgbGV0IHMgPSBzdGF0ZTtcbiAgIGxldCB2YWx1ZSA9IHMuc3RhdGUoKVxuXG4gICBsZXQgZGIgPSB2aWV3KHRoaXMuX3RhcmdldClcbiAgICAgLnN0YWdlZF9maWx0ZXJzKHZhbHVlLnN0YWdlZF9maWx0ZXIgfHwgXCJcIilcbiAgICAgLnNhdmVkKHZhbHVlLnNhdmVkIHx8IFtdKVxuICAgICAuZGF0YSh2YWx1ZS5mb3JtYXR0ZWRfZGF0YSB8fCB7fSlcbiAgICAgLmFjdGlvbnModmFsdWUuYWN0aW9ucyB8fCBbXSlcbiAgICAgLnNlbGVjdGVkX2FjdGlvbih2YWx1ZS5zZWxlY3RlZF9hY3Rpb24gfHwge30pXG4gICAgIC5zZWxlY3RlZF9jb21wYXJpc29uKHZhbHVlLnNlbGVjdGVkX2NvbXBhcmlzb24gfHwge30pXG4gICAgIC5hY3Rpb25fZGF0ZSh2YWx1ZS5hY3Rpb25fZGF0ZSB8fCAwKVxuICAgICAuY29tcGFyaXNvbl9kYXRlKHZhbHVlLmNvbXBhcmlzb25fZGF0ZSB8fCAwKVxuICAgICAubG9hZGluZyh2YWx1ZS5sb2FkaW5nIHx8IGZhbHNlKVxuICAgICAubGluZV9pdGVtcyh2YWx1ZS5saW5lX2l0ZW1zIHx8IGZhbHNlKVxuICAgICAuc3VtbWFyeSh2YWx1ZS5zdW1tYXJ5IHx8IGZhbHNlKVxuICAgICAudGltZV9zdW1tYXJ5KHZhbHVlLnRpbWVfc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLmNhdGVnb3J5X3N1bW1hcnkodmFsdWUuY2F0ZWdvcnlfc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLmtleXdvcmRfc3VtbWFyeSh2YWx1ZS5rZXl3b3JkX3N1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC5iZWZvcmUodmFsdWUuYmVmb3JlX3VybHMgfHwgW10pXG4gICAgIC5hZnRlcih2YWx1ZS5hZnRlcl91cmxzIHx8IFtdKVxuICAgICAubG9naWNfb3B0aW9ucyh2YWx1ZS5sb2dpY19vcHRpb25zIHx8IGZhbHNlKVxuICAgICAubG9naWNfY2F0ZWdvcmllcyh2YWx1ZS5sb2dpY19jYXRlZ29yaWVzIHx8IGZhbHNlKVxuICAgICAuZmlsdGVycyh2YWx1ZS5maWx0ZXJzIHx8IGZhbHNlKVxuICAgICAudmlld19vcHRpb25zKHZhbHVlLmRhc2hib2FyZF9vcHRpb25zIHx8IGZhbHNlKVxuICAgICAuZXhwbG9yZV90YWJzKHZhbHVlLnRhYnMgfHwgZmFsc2UpXG4gICAgIC5vbihcImFkZC1maWx0ZXJcIiwgcy5wcmVwYXJlRXZlbnQoXCJhZGQtZmlsdGVyXCIpKVxuICAgICAub24oXCJtb2RpZnktZmlsdGVyXCIsIHMucHJlcGFyZUV2ZW50KFwibW9kaWZ5LWZpbHRlclwiKSlcbiAgICAgLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiYWN0aW9uLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImFjdGlvbi5jaGFuZ2VcIikpXG4gICAgIC5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImFjdGlvbl9kYXRlLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgIC5vbihcImNvbXBhcmlzb24uY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwiY29tcGFyaXNvbi5jaGFuZ2VcIikpXG4gICAgIC5vbihcImxvZ2ljLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImxvZ2ljLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiZmlsdGVyLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImZpbHRlci5jaGFuZ2VcIikpXG4gICAgIC5vbihcInZpZXcuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwidmlldy5jaGFuZ2VcIikpXG4gICAgIC5vbihcInRhYi5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJ0YWIuY2hhbmdlXCIpKVxuICAgICAub24oXCJiYS5zb3J0XCIsIHMucHJlcGFyZUV2ZW50KFwiYmEuc29ydFwiKSlcbiAgICAgLmRyYXcoKVxuICAgXG4gIH1cbn1cbiIsInZhciB2ZXJzaW9uID0gXCIwLjAuMVwiOyBleHBvcnQgKiBmcm9tIFwiLi4vaW5kZXhcIjsgZXhwb3J0IHt2ZXJzaW9ufTsiXSwibmFtZXMiOlsibm9vcCIsInN0YXRlIiwiZDNfdXBkYXRlYWJsZSIsImQzX3NwbGF0IiwiYnVpbGREb21haW5zIiwic3RhdGUuY29tcF9ldmFsIiwic3RhdGUucXMiLCJhY2Nlc3NvciIsImlkZW50aXR5Iiwia2V5IiwiZDMiLCJhY2Nlc3NvciQxIiwiZmlsdGVyIiwic2VsZWN0IiwidCIsInByZXBEYXRhIiwicCIsInRpbWVzZXJpZXMucHJlcERhdGEiLCJ0aW1lc2VyaWVzWydkZWZhdWx0J10iLCJidWNrZXRzIiwiZDNfY2xhc3MiLCJyZWxhdGl2ZV92aWV3IiwidGltaW5nX3ZpZXciLCJzdGFnZWRfZmlsdGVyX3ZpZXciLCJpbml0IiwicyIsImZpbHRlckluaXQiLCJhY3Rpb25Jbml0IiwiYXBpLmFjdGlvbiIsImhpc3RvcnlTdWJzY3JpcHRpb25zIiwiYXBpU3Vic2NyaXB0aW9ucyIsImluaXRFdmVudHMiLCJpbml0U3Vic2NyaXB0aW9ucyIsImFwaS5kYXNoYm9hcmQiLCJhcGkubGluZV9pdGVtIiwidmlldyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBTyxNQUFNLGFBQWEsR0FBRyxTQUFTLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7RUFDdEUsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEtBQUssQ0FBQTtFQUN4QixJQUFJLFVBQVUsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUk7SUFDOUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ2xDLENBQUE7O0VBRUQsVUFBVSxDQUFDLEtBQUssRUFBRTtLQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTs7RUFFZixPQUFPLFVBQVU7Q0FDbEIsQ0FBQTs7QUFFRCxBQUFPLE1BQU0sUUFBUSxHQUFHLFNBQVMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtFQUNqRSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksS0FBSyxDQUFBO0VBQ3hCLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSTtJQUM5QyxJQUFJLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3QixNQUFNLElBQUksU0FBUyxDQUFD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QyxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssS0FBSyxHQUFHLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOztNQUVqSSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7TUFDaEIsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDOztNQUV0QixJQUFJLElBQUksR0FBR1EsSUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUU7U0FDMUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEIsSUFBSSxDQUFDLEdBQUdBLElBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQ0EsSUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzFFLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO1lBQzVDQSxJQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzs7WUFFdEQsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMzR0EsSUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMs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QUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdkIsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1dBQy9CLENBQUMsQ0FBQzs7VUFFSCxJQUFJLFFBQVEsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1VBQ3pFLElBQUksUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDOztVQUVyRCxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDOzs7O1VBSS9CLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDNUMsQ0FBQyxDQUFDOztNQUVMQSxlQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7U0FDcEMsUUFBUSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUM7U0FDMUIsUUFBUSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUM7U0FDeEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDOzs7TUFHckJDLFVBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztTQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO1NBQzlCLElBQUksQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxHQUFHLFVBQVUsR0FBRyxTQUFTLEVBQUUsQ0FBQyxDQUFDOztNQUV0RixJQUFJLEtB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LENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1NBQzVELENBQUM7U0FDRCxJQUFJLENBQUMsWUFBWSxDQUFDO1NBQ2xCLFdBQVcsQ0FBQyxVQUFVLENBQUM7U0FDdkIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTs7VUFFdkIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7VUFDN0QsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFDL0UsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUQsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFO1dBQ2xFOztVQUVELEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtVQUMxRCxJQUFJQSxJQUFDLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztVQUNyQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQ0EsSUFBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzs7VUFFbEQsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQ0EsSUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7VUFDeEQs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RCxBQUFPLFNBQVMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFOztBQUVoRCxTQUFTLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUU7RUFDekMsSUFBSSxPQUFPLEdBQUcsRUFBRSxFQUFFLE9BQU8sR0FBRyxFQUFFLENBQUE7O0VBRTlCLElBQUksRUFBRSxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRTtFQUNsRyxJQUFJLEVBQUUsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUEsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7O0VBRWxHLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7O0VBRTFHLE9BQU8sTUFBTTtDQUNkOztFQUVDLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENB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QUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtFQUMvRCxPQUFPLENBQUM7Q0FDVCxDQUFDLENBQUE7O0FBRUYsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFOztFQUU3RCxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUk7SUFDbEcsSUFBSSxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxH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QyxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7OztJQUd0RSxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDO09BQzlCLE9BQU8sQ0FBQyxPQUFPLENBQUM7T0FDaEIsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7T0FDakQsSUFBSSxDQUFDLE9BQU8sQ0FBQztPQUNiLFdBQVcsQ0FBQyxJQUFJLENBQUM7T0FDakIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTs7VUFFckIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7VUFDN0QsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFDL0UsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUQsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFO1dBQ2xFOztVQUVELEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtVQUMxRCxJQUFJ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
