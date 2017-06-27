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

function accessor$1(attr, val) {
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
      return accessor$1.bind(this)("options",val) 
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
      return accessor$1.bind(this)("selected",val)
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
      if (fn === undefined) return this._on[action] || noop$4;
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
      return accessor$1.bind(this)("data",val) 
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

      buildCategories$1(value);
      buildCategoryHour$$1(value);

      // ----- END : FOR MEDIA PLAN ----- //

      var tabs = [
          buildDomains$1(value)
        , buildUrls(value)
        //, buildTopics(value)
      ];

      var summary_data = buildSummaryData(value.full_urls)
        , pop_summary_data = buildSummaryData(compareTo);

      var summary = buildSummaryAggregation(summary_data,pop_summary_data);

      var ts = prepData$1(value.full_urls)
        , pop_ts = prepData$1(compareTo);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFzaGJvYXJkLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvaGVscGVycy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdGF0ZS9zcmMvc3RhdGUuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvc3JjL3FzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N0YXRlL3NyYy9jb21wX2V2YWwuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RhdGUvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvbWVkaWFfcGxhbi9zcmMvbWVkaWFfcGxhbi5qcyIsIi4uL3NyYy9oZWxwZXJzLmpzIiwiLi4vc3JjL2dlbmVyaWMvc2VsZWN0LmpzIiwiLi4vc3JjL2dlbmVyaWMvaGVhZGVyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3RhYmxlL2J1aWxkL3RhYmxlLmVzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2ZpbHRlci9idWlsZC9maWx0ZXIuZXMuanMiLCIuLi9zcmMvdmlld3MvZmlsdGVyX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy9idXR0b25fcmFkaW8uanMiLCIuLi9zcmMvdmlld3Mvb3B0aW9uX3ZpZXcuanMiLCIuLi9zcmMvZGF0YV9oZWxwZXJzLmpzIiwiLi4vc3JjL3RpbWVzZXJpZXMuanMiLCIuLi9zcmMvZ2VuZXJpYy9waWUuanMiLCIuLi9zcmMvZ2VuZXJpYy9kaWZmX2Jhci5qcyIsIi4uL3NyYy9nZW5lcmljL2NvbXBfYmFyLmpzIiwiLi4vc3JjL2dlbmVyaWMvY29tcF9idWJibGUuanMiLCIuLi9zcmMvZ2VuZXJpYy9zdHJlYW1fcGxvdC5qcyIsIi4uL3NyYy92aWV3cy9zdW1tYXJ5X3ZpZXcuanMiLCIuLi9zcmMvdmlld3MvZG9tYWluX2V4cGFuZGVkLmpzIiwiLi4vc3JjL3ZpZXdzL2RvbWFpbl9idWxsZXQuanMiLCIuLi9zcmMvdmlld3MvZG9tYWluX3ZpZXcuanMiLCIuLi9zcmMvdmlld3Mvc2VnbWVudF92aWV3LmpzIiwiLi4vc3JjL3ZpZXdzL3JlZmluZS5qcyIsIi4uL3NyYy92aWV3cy9yZWxhdGl2ZV90aW1pbmdfdmlldy5qcyIsIi4uL3NyYy92aWV3cy90aW1pbmdfdmlldy5qcyIsIi4uL3NyYy92aWV3cy9zdGFnZWRfZmlsdGVyX3ZpZXcuanMiLCIuLi9zcmMvZ2VuZXJpYy9jb25kaXRpb25hbF9zaG93LmpzIiwiLi4vc3JjL2dlbmVyaWMvc2hhcmUuanMiLCIuLi9zcmMvdmlldy5qcyIsIi4uL25vZGVfbW9kdWxlcy9hcGkvc3JjL2FjdGlvbi5qcyIsIi4uL25vZGVfbW9kdWxlcy9hcGkvaW5kZXguanMiLCIuLi9zcmMvZGF0YS5qcyIsIi4uL3NyYy9ldmVudHMvZmlsdGVyX2V2ZW50cy5qcyIsIi4uL3NyYy9ldmVudHMvYWN0aW9uX2V2ZW50cy5qcyIsIi4uL3NyYy9ldmVudHMuanMiLCIuLi9zcmMvc3RhdGUuanMiLCIuLi9zcmMvc3Vic2NyaXB0aW9ucy9oaXN0b3J5LmpzIiwiLi4vc3JjL3N1YnNjcmlwdGlvbnMvYXBpLmpzIiwiLi4vc3JjL3N1YnNjcmlwdGlvbnMuanMiLCIuLi9zcmMvYnVpbGQuanMiLCJidW5kbGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IGQzX3VwZGF0ZWFibGUgPSBmdW5jdGlvbih0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIlxuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZnVuY3Rpb24oeCl7cmV0dXJuIGRhdGEgPyBbZGF0YV0gOiBbeF19LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4gW3hdfVxuICApXG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKVxuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmV4cG9ydCBjb25zdCBkM19zcGxhdCA9IGZ1bmN0aW9uKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBTdGF0ZShfY3VycmVudCwgX3N0YXRpYykge1xuXG4gIHRoaXMuX25vb3AgPSBmdW5jdGlvbigpIHt9XG4gIHRoaXMuX2V2ZW50cyA9IHt9XG5cbiAgdGhpcy5fb24gPSB7XG4gICAgICBcImNoYW5nZVwiOiB0aGlzLl9ub29wXG4gICAgLCBcImJ1aWxkXCI6IHRoaXMuX25vb3BcbiAgICAsIFwiZm9yd2FyZFwiOiB0aGlzLl9ub29wXG4gICAgLCBcImJhY2tcIjogdGhpcy5fbm9vcFxuICB9XG5cbiAgdGhpcy5fc3RhdGljID0gX3N0YXRpYyB8fCB7fVxuXG4gIHRoaXMuX2N1cnJlbnQgPSBfY3VycmVudCB8fCB7fVxuICB0aGlzLl9wYXN0ID0gW11cbiAgdGhpcy5fZnV0dXJlID0gW11cblxuICB0aGlzLl9zdWJzY3JpcHRpb24gPSB7fVxuICB0aGlzLl9zdGF0ZSA9IHRoaXMuX2J1aWxkU3RhdGUoKVxuXG5cbn1cblxuU3RhdGUucHJvdG90eXBlID0ge1xuICAgIHN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBwdWJsaXNoOiBmdW5jdGlvbihuYW1lLGNiKSB7XG5cbiAgICAgICB2YXIgcHVzaF9jYiA9IGZ1bmN0aW9uKGVycm9yLHZhbHVlKSB7XG4gICAgICAgICBpZiAoZXJyb3IpIHJldHVybiBzdWJzY3JpYmVyKGVycm9yLG51bGwpXG4gICAgICAgICBcbiAgICAgICAgIHRoaXMudXBkYXRlKG5hbWUsIHZhbHVlKVxuICAgICAgICAgdGhpcy50cmlnZ2VyKG5hbWUsIHRoaXMuc3RhdGUoKVtuYW1lXSwgdGhpcy5zdGF0ZSgpKVxuXG4gICAgICAgfS5iaW5kKHRoaXMpXG5cbiAgICAgICBpZiAodHlwZW9mIGNiID09PSBcImZ1bmN0aW9uXCIpIGNiKHB1c2hfY2IpXG4gICAgICAgZWxzZSBwdXNoX2NiKGZhbHNlLGNiKVxuXG4gICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcHVibGlzaEJhdGNoOiBmdW5jdGlvbihvYmopIHtcbiAgICAgIE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdGhpcy51cGRhdGUoeCxvYmpbeF0pXG4gICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgIHRoaXMudHJpZ2dlckJhdGNoKG9iaix0aGlzLnN0YXRlKCkpXG4gICAgfVxuICAsIHB1c2g6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICB0aGlzLnB1Ymxpc2goZmFsc2Usc3RhdGUpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBzdWJzY3JpYmU6IGZ1bmN0aW9uKCkge1xuXG4gICAgICAvLyB0aHJlZSBvcHRpb25zIGZvciB0aGUgYXJndW1lbnRzOlxuICAgICAgLy8gKGZuKSBcbiAgICAgIC8vIChpZCxmbilcbiAgICAgIC8vIChpZC50YXJnZXQsZm4pXG5cblxuICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHRoaXMuX2dsb2JhbF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdKVxuICAgICAgaWYgKGFyZ3VtZW50c1swXS5pbmRleE9mKFwiLlwiKSA9PSAtMSkgcmV0dXJuIHRoaXMuX25hbWVkX3N1YnNjcmliZShhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSlcbiAgICAgIGlmIChhcmd1bWVudHNbMF0uaW5kZXhPZihcIi5cIikgPiAtMSkgcmV0dXJuIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoYXJndW1lbnRzWzBdLnNwbGl0KFwiLlwiKVswXSwgYXJndW1lbnRzWzBdLnNwbGl0KFwiLlwiKVsxXSwgYXJndW1lbnRzWzFdKVxuXG4gICAgfVxuICAsIHVuc3Vic2NyaWJlOiBmdW5jdGlvbihpZCkge1xuICAgICAgdGhpcy5zdWJzY3JpYmUoaWQsdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgLCBfZ2xvYmFsX3N1YnNjcmliZTogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHZhciBpZCA9ICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24oYykge1xuICAgICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKSoxNnwwLCB2ID0gYyA9PSAneCcgPyByIDogKHImMHgzfDB4OCk7XG4gICAgICAgICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICAgICAgICB9KVxuICAgICAgLCB0byA9IFwiKlwiO1xuICAgICBcbiAgICAgIHRoaXMuX3RhcmdldHRlZF9zdWJzY3JpYmUoaWQsdG8sZm4pXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIF9uYW1lZF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGlkLGZuKSB7XG4gICAgICB2YXIgdG8gPSBcIipcIlxuICAgICAgdGhpcy5fdGFyZ2V0dGVkX3N1YnNjcmliZShpZCx0byxmbilcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgX3RhcmdldHRlZF9zdWJzY3JpYmU6IGZ1bmN0aW9uKGlkLHRvLGZuKSB7XG5cbiAgICAgIHZhciBzdWJzY3JpcHRpb25zID0gdGhpcy5nZXRfc3Vic2NyaWJlcnNfb2JqKHRvKVxuICAgICAgICAsIHRvX3N0YXRlID0gdGhpcy5fc3RhdGVbdG9dXG4gICAgICAgICwgc3RhdGUgPSB0aGlzLl9zdGF0ZTtcblxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIGZuID09PSB1bmRlZmluZWQpIHJldHVybiBzdWJzY3JpcHRpb25zW2lkXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVsZXRlIHN1YnNjcmlwdGlvbnNbaWRdXG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICB9XG4gICAgICBzdWJzY3JpcHRpb25zW2lkXSA9IGZuO1xuXG4gICAgICByZXR1cm4gdGhpcyAgICAgIFxuICAgIH1cbiAgXG4gICwgZ2V0X3N1YnNjcmliZXJzX29iajogZnVuY3Rpb24oaykge1xuICAgICAgdGhpcy5fc3Vic2NyaXB0aW9uW2tdID0gdGhpcy5fc3Vic2NyaXB0aW9uW2tdIHx8IHt9XG4gICAgICByZXR1cm4gdGhpcy5fc3Vic2NyaXB0aW9uW2tdXG4gICAgfVxuICAsIGdldF9zdWJzY3JpYmVyc19mbjogZnVuY3Rpb24oaykge1xuICAgICAgdmFyIGZucyA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX29iaihrKVxuICAgICAgICAsIGZ1bmNzID0gT2JqZWN0LmtleXMoZm5zKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4gZm5zW3hdIH0pXG4gICAgICAgICwgZm4gPSBmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmNzLm1hcChmdW5jdGlvbihnKSB7IHJldHVybiBnKGVycm9yLHZhbHVlLHN0YXRlKSB9KVxuICAgICAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuXG4gICAgfVxuICAsIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUsIF92YWx1ZSwgX3N0YXRlKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlciA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuKG5hbWUpIHx8IGZ1bmN0aW9uKCkge31cbiAgICAgICAgLCBhbGwgPSB0aGlzLmdldF9zdWJzY3JpYmVyc19mbihcIipcIikgfHwgZnVuY3Rpb24oKSB7fTtcblxuICAgICAgdGhpcy5vbihcImNoYW5nZVwiKShuYW1lLF92YWx1ZSxfc3RhdGUpXG5cbiAgICAgIHN1YnNjcmliZXIoZmFsc2UsX3ZhbHVlLF9zdGF0ZSlcbiAgICAgIGFsbChmYWxzZSxfc3RhdGUpXG4gICAgfVxuICAsIHRyaWdnZXJCYXRjaDogZnVuY3Rpb24ob2JqLCBfc3RhdGUpIHtcblxuICAgICAgdmFyIGFsbCA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuKFwiKlwiKSB8fCBmdW5jdGlvbigpIHt9XG4gICAgICAgICwgZm5zID0gT2JqZWN0LmtleXMob2JqKS5tYXAoZnVuY3Rpb24oaykgeyBcbiAgICAgICAgICAgIHZhciBmbiA9IHRoaXMuZ2V0X3N1YnNjcmliZXJzX2ZuIHx8IGZ1bmN0aW9uKCkge31cbiAgICAgICAgICAgIHJldHVybiBmbi5iaW5kKHRoaXMpKGspKGZhbHNlLG9ialtrXSxfc3RhdGUpICBcbiAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICBcbiAgICAgIGFsbChmYWxzZSxfc3RhdGUpXG5cbiAgICB9XG4gICwgX2J1aWxkU3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2N1cnJlbnQpXG5cbiAgICAgIE9iamVjdC5rZXlzKHRoaXMuX3N0YXRpYykubWFwKGZ1bmN0aW9uKGspIHsgXG4gICAgICAgIHRoaXMuX3N0YXRlW2tdID0gdGhpcy5fc3RhdGljW2tdXG4gICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgIHRoaXMub24oXCJidWlsZFwiKSh0aGlzLl9zdGF0ZSwgdGhpcy5fY3VycmVudCwgdGhpcy5fc3RhdGljKVxuXG4gICAgICByZXR1cm4gdGhpcy5fc3RhdGVcbiAgICB9XG4gICwgdXBkYXRlOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgICAgdGhpcy5fcGFzdFB1c2godGhpcy5fY3VycmVudClcbiAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgIHZhciBvYmogPSB7fVxuICAgICAgICBvYmpbbmFtZV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2N1cnJlbnQgPSAobmFtZSkgPyBcbiAgICAgICAgT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5fY3VycmVudCwgb2JqKSA6XG4gICAgICAgIE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2N1cnJlbnQsIHZhbHVlIClcblxuICAgICAgdGhpcy5fYnVpbGRTdGF0ZSgpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHNldFN0YXRpYzogZnVuY3Rpb24oayx2KSB7XG4gICAgICBpZiAoayAhPSB1bmRlZmluZWQgJiYgdiAhPSB1bmRlZmluZWQpIHRoaXMuX3N0YXRpY1trXSA9IHZcbiAgICAgIHRoaXMuX2J1aWxkU3RhdGUoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBwdWJsaXNoU3RhdGljOiBmdW5jdGlvbihuYW1lLGNiKSB7XG5cbiAgICAgIHZhciBwdXNoX2NiID0gZnVuY3Rpb24oZXJyb3IsdmFsdWUpIHtcbiAgICAgICAgaWYgKGVycm9yKSByZXR1cm4gc3Vic2NyaWJlcihlcnJvcixudWxsKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5fc3RhdGljW25hbWVdID0gdmFsdWVcbiAgICAgICAgdGhpcy5fYnVpbGRTdGF0ZSgpXG4gICAgICAgIHRoaXMudHJpZ2dlcihuYW1lLCB0aGlzLnN0YXRlKClbbmFtZV0sIHRoaXMuc3RhdGUoKSlcblxuICAgICAgfS5iaW5kKHRoaXMpXG5cbiAgICAgIGlmICh0eXBlb2YgY2IgPT09IFwiZnVuY3Rpb25cIikgY2IocHVzaF9jYilcbiAgICAgIGVsc2UgcHVzaF9jYihmYWxzZSxjYilcblxuICAgICAgcmV0dXJuIHRoaXNcblxuICAgIH1cbiAgLCBfcGFzdFB1c2g6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHRoaXMuX3Bhc3QucHVzaCh2KVxuICAgIH1cbiAgLCBfZnV0dXJlUHVzaDogZnVuY3Rpb24odikge1xuICAgICAgdGhpcy5fZnV0dXJlLnB1c2godilcbiAgICB9XG4gICwgZm9yd2FyZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9wYXN0UHVzaCh0aGlzLl9jdXJyZW50KVxuICAgICAgdGhpcy5fY3VycmVudCA9IHRoaXMuX2Z1dHVyZS5wb3AoKVxuXG4gICAgICB0aGlzLm9uKFwiZm9yd2FyZFwiKSh0aGlzLl9jdXJyZW50LHRoaXMuX3Bhc3QsIHRoaXMuX2Z1dHVyZSlcblxuICAgICAgdGhpcy5fc3RhdGUgPSB0aGlzLl9idWlsZFN0YXRlKClcbiAgICAgIHRoaXMudHJpZ2dlcihmYWxzZSwgdGhpcy5fc3RhdGUsIHRoaXMuX3N0YXRlKVxuICAgIH1cbiAgLCBiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2Z1dHVyZVB1c2godGhpcy5fY3VycmVudClcbiAgICAgIHRoaXMuX2N1cnJlbnQgPSB0aGlzLl9wYXN0LnBvcCgpXG5cbiAgICAgIHRoaXMub24oXCJiYWNrXCIpKHRoaXMuX2N1cnJlbnQsdGhpcy5fZnV0dXJlLCB0aGlzLl9wYXN0KVxuXG4gICAgICB0aGlzLl9zdGF0ZSA9IHRoaXMuX2J1aWxkU3RhdGUoKVxuICAgICAgdGhpcy50cmlnZ2VyKGZhbHNlLCB0aGlzLl9zdGF0ZSwgdGhpcy5fc3RhdGUpXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCB0aGlzLl9ub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9IFxuICAsIHJlZ2lzdGVyRXZlbnQ6IGZ1bmN0aW9uKG5hbWUsZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZXZlbnRzW25hbWVdIHx8IHRoaXMuX25vb3A7XG4gICAgICB0aGlzLl9ldmVudHNbbmFtZV0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHByZXBhcmVFdmVudDogZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGZuID0gdGhpcy5fZXZlbnRzW25hbWVdIFxuICAgICAgcmV0dXJuIGZuLmJpbmQodGhpcylcbiAgICB9XG4gICwgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24obmFtZSxkYXRhKSB7XG4gICAgICB2YXIgZm4gPSB0aGlzLnByZXBhcmVFdmVudChuYW1lKVxuICAgICAgZm4oZGF0YSlcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG59XG5cbmZ1bmN0aW9uIHN0YXRlKF9jdXJyZW50LCBfc3RhdGljKSB7XG4gIHJldHVybiBuZXcgU3RhdGUoX2N1cnJlbnQsIF9zdGF0aWMpXG59XG5cbnN0YXRlLnByb3RvdHlwZSA9IFN0YXRlLnByb3RvdHlwZVxuXG5leHBvcnQgZGVmYXVsdCBzdGF0ZTtcbiIsImV4cG9ydCBmdW5jdGlvbiBRUyhzdGF0ZSkge1xuICAvL3RoaXMuc3RhdGUgPSBzdGF0ZVxuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy5fZW5jb2RlT2JqZWN0ID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvKVxuICB9XG5cbiAgdGhpcy5fZW5jb2RlQXJyYXkgPSBmdW5jdGlvbihvKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG8pXG4gIH1cbn1cblxuLy8gTFpXLWNvbXByZXNzIGEgc3RyaW5nXG5mdW5jdGlvbiBsendfZW5jb2RlKHMpIHtcbiAgICB2YXIgZGljdCA9IHt9O1xuICAgIHZhciBkYXRhID0gKHMgKyBcIlwiKS5zcGxpdChcIlwiKTtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgdmFyIGN1cnJDaGFyO1xuICAgIHZhciBwaHJhc2UgPSBkYXRhWzBdO1xuICAgIHZhciBjb2RlID0gMjU2O1xuICAgIGZvciAodmFyIGk9MTsgaTxkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN1cnJDaGFyPWRhdGFbaV07XG4gICAgICAgIGlmIChkaWN0W3BocmFzZSArIGN1cnJDaGFyXSAhPSBudWxsKSB7XG4gICAgICAgICAgICBwaHJhc2UgKz0gY3VyckNoYXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvdXQucHVzaChwaHJhc2UubGVuZ3RoID4gMSA/IGRpY3RbcGhyYXNlXSA6IHBocmFzZS5jaGFyQ29kZUF0KDApKTtcbiAgICAgICAgICAgIGRpY3RbcGhyYXNlICsgY3VyckNoYXJdID0gY29kZTtcbiAgICAgICAgICAgIGNvZGUrKztcbiAgICAgICAgICAgIHBocmFzZT1jdXJyQ2hhcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBvdXQucHVzaChwaHJhc2UubGVuZ3RoID4gMSA/IGRpY3RbcGhyYXNlXSA6IHBocmFzZS5jaGFyQ29kZUF0KDApKTtcbiAgICBmb3IgKHZhciBpPTA7IGk8b3V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dFtpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUob3V0W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKFwiXCIpO1xufVxuXG4vLyBEZWNvbXByZXNzIGFuIExaVy1lbmNvZGVkIHN0cmluZ1xuZnVuY3Rpb24gbHp3X2RlY29kZShzKSB7XG4gICAgdmFyIGRpY3QgPSB7fTtcbiAgICB2YXIgZGF0YSA9IChzICsgXCJcIikuc3BsaXQoXCJcIik7XG4gICAgdmFyIGN1cnJDaGFyID0gZGF0YVswXTtcbiAgICB2YXIgb2xkUGhyYXNlID0gY3VyckNoYXI7XG4gICAgdmFyIG91dCA9IFtjdXJyQ2hhcl07XG4gICAgdmFyIGNvZGUgPSAyNTY7XG4gICAgdmFyIHBocmFzZTtcbiAgICBmb3IgKHZhciBpPTE7IGk8ZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY3VyckNvZGUgPSBkYXRhW2ldLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIGlmIChjdXJyQ29kZSA8IDI1Nikge1xuICAgICAgICAgICAgcGhyYXNlID0gZGF0YVtpXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgcGhyYXNlID0gZGljdFtjdXJyQ29kZV0gPyBkaWN0W2N1cnJDb2RlXSA6IChvbGRQaHJhc2UgKyBjdXJyQ2hhcik7XG4gICAgICAgIH1cbiAgICAgICAgb3V0LnB1c2gocGhyYXNlKTtcbiAgICAgICAgY3VyckNoYXIgPSBwaHJhc2UuY2hhckF0KDApO1xuICAgICAgICBkaWN0W2NvZGVdID0gb2xkUGhyYXNlICsgY3VyckNoYXI7XG4gICAgICAgIGNvZGUrKztcbiAgICAgICAgb2xkUGhyYXNlID0gcGhyYXNlO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oXCJcIik7XG59XG5cblFTLnByb3RvdHlwZSA9IHtcbiAgICB0bzogZnVuY3Rpb24oc3RhdGUsZW5jb2RlKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdmFyIHBhcmFtcyA9IE9iamVjdC5rZXlzKHN0YXRlKS5tYXAoZnVuY3Rpb24oaykge1xuXG4gICAgICAgIHZhciB2YWx1ZSA9IHN0YXRlW2tdXG4gICAgICAgICAgLCBvID0gdmFsdWU7XG5cbiAgICAgICAgaWYgKHZhbHVlICYmICh0eXBlb2YodmFsdWUpID09IFwib2JqZWN0XCIpICYmICh2YWx1ZS5sZW5ndGggPiAwKSkge1xuICAgICAgICAgIG8gPSBzZWxmLl9lbmNvZGVBcnJheSh2YWx1ZSlcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YodmFsdWUpID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICBvID0gc2VsZi5fZW5jb2RlT2JqZWN0KHZhbHVlKVxuICAgICAgICB9IFxuXG4gICAgICAgIHJldHVybiBrICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQobykgXG5cbiAgICAgIH0pXG5cbiAgICAgIGlmIChlbmNvZGUpIHJldHVybiBcIj9cIiArIFwiZW5jb2RlZD1cIiArIGJ0b2EoZXNjYXBlKGx6d19lbmNvZGUocGFyYW1zLmpvaW4oXCImXCIpKSkpO1xuICAgICAgcmV0dXJuIFwiP1wiICsgcGFyYW1zLmpvaW4oXCImXCIpXG4gICAgICBcbiAgICB9XG4gICwgZnJvbTogZnVuY3Rpb24ocXMpIHtcbiAgICAgIHZhciBxdWVyeSA9IHt9O1xuICAgICAgaWYgKHFzLmluZGV4T2YoXCI/ZW5jb2RlZD1cIikgPT0gMCkgcXMgPSBsendfZGVjb2RlKHVuZXNjYXBlKGF0b2IocXMuc3BsaXQoXCI/ZW5jb2RlZD1cIilbMV0pKSlcbiAgICAgIHZhciBhID0gcXMuc3Vic3RyKDEpLnNwbGl0KCcmJyk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgYiA9IGFbaV0uc3BsaXQoJz0nKTtcbiAgICAgICAgICBcbiAgICAgICAgICBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldID0gKGRlY29kZVVSSUNvbXBvbmVudChiWzFdIHx8ICcnKSk7XG4gICAgICAgICAgdmFyIF9jaGFyID0gcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXVswXSBcbiAgICAgICAgICBpZiAoKF9jaGFyID09IFwie1wiKSB8fCAoX2NoYXIgPT0gXCJbXCIpKSBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldID0gSlNPTi5wYXJzZShxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoYlswXSldKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHF1ZXJ5O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcXMoc3RhdGUpIHtcbiAgcmV0dXJuIG5ldyBRUyhzdGF0ZSlcbn1cblxucXMucHJvdG90eXBlID0gUVMucHJvdG90eXBlXG5cbmV4cG9ydCBkZWZhdWx0IHFzO1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tcGFyaXNvbl9ldmFsKG9iajEsb2JqMixfZmluYWwpIHtcbiAgcmV0dXJuIG5ldyBDb21wYXJpc29uRXZhbChvYmoxLG9iajIsX2ZpbmFsKVxufVxuXG52YXIgbm9vcCA9ICh4KSA9PiB7fVxuICAsIGVxb3AgPSAoeCx5KSA9PiB4ID09IHlcbiAgLCBhY2MgPSAobmFtZSxzZWNvbmQpID0+IHtcbiAgICAgIHJldHVybiAoeCx5KSA9PiBzZWNvbmQgPyB5W25hbWVdIDogeFtuYW1lXSBcbiAgICB9XG5cbmNsYXNzIENvbXBhcmlzb25FdmFsIHtcbiAgY29uc3RydWN0b3Iob2JqMSxvYmoyLF9maW5hbCkge1xuICAgIHRoaXMuX29iajEgPSBvYmoxXG4gICAgdGhpcy5fb2JqMiA9IG9iajJcbiAgICB0aGlzLl9maW5hbCA9IF9maW5hbFxuICAgIHRoaXMuX2NvbXBhcmlzb25zID0ge31cbiAgfVxuXG4gIGFjY2Vzc29yKG5hbWUsYWNjMSxhY2MyKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgYWNjMTogYWNjMVxuICAgICAgLCBhY2MyOiBhY2MyXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3VjY2VzcyhuYW1lLGZuKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LHRoaXMuX2NvbXBhcmlzb25zW25hbWVdLHtcbiAgICAgICAgc3VjY2VzczogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBmYWlsdXJlKG5hbWUsZm4pIHtcbiAgICB0aGlzLl9jb21wYXJpc29uc1tuYW1lXSA9IE9iamVjdC5hc3NpZ24oe30sdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0se1xuICAgICAgICBmYWlsdXJlOiBmblxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGVxdWFsKG5hbWUsZm4pIHtcbiAgICB0aGlzLl9jb21wYXJpc29uc1tuYW1lXSA9IE9iamVjdC5hc3NpZ24oe30sdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0se1xuICAgICAgICBlcTogZm5cbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBldmFsdWF0ZSgpIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLl9jb21wYXJpc29ucykubWFwKCBrID0+IHtcbiAgICAgIHRoaXMuX2V2YWwodGhpcy5fY29tcGFyaXNvbnNba10saylcbiAgICB9KVxuICAgIHJldHVybiB0aGlzLl9maW5hbFxuICB9XG4gIFxuXG4gIGNvbXBhcnNpb24obmFtZSxhY2MxLGFjYzIsZXEsc3VjY2VzcyxmYWlsdXJlKSB7XG4gICAgdGhpcy5fY29tcGFyaXNvbnNbbmFtZV0gPSB7XG4gICAgICAgIGFjYzE6IGFjYzFcbiAgICAgICwgYWNjMjogYWNjMlxuICAgICAgLCBlcTogZXEgfHwgZXFvcFxuICAgICAgLCBzdWNjZXNzOiBzdWNjZXNzIHx8IG5vb3BcbiAgICAgICwgZmFpbHVyZTogZmFpbHVyZSB8fCBub29wXG4gICAgfVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBfZXZhbChjb21wYXJpc29uLG5hbWUpIHtcbiAgICB2YXIgYWNjMSA9IGNvbXBhcmlzb24uYWNjMSB8fCBhY2MobmFtZSlcbiAgICAgICwgYWNjMiA9IGNvbXBhcmlzb24uYWNjMiB8fCBhY2MobmFtZSx0cnVlKVxuICAgICAgLCB2YWwxID0gYWNjMSh0aGlzLl9vYmoxLHRoaXMuX29iajIpXG4gICAgICAsIHZhbDIgPSBhY2MyKHRoaXMuX29iajEsdGhpcy5fb2JqMilcbiAgICAgICwgZXEgPSBjb21wYXJpc29uLmVxIHx8IGVxb3BcbiAgICAgICwgc3VjYyA9IGNvbXBhcmlzb24uc3VjY2VzcyB8fCBub29wXG4gICAgICAsIGZhaWwgPSBjb21wYXJpc29uLmZhaWx1cmUgfHwgbm9vcFxuXG4gICAgdmFyIF9ldmFsZCA9IGVxKHZhbDEsIHZhbDIpXG5cbiAgICBfZXZhbGQgPyBcbiAgICAgIHN1Y2MuYmluZCh0aGlzKSh2YWwxLHZhbDIsdGhpcy5fZmluYWwpIDogXG4gICAgICBmYWlsLmJpbmQodGhpcykodmFsMSx2YWwyLHRoaXMuX2ZpbmFsKVxuICB9XG5cbiAgXG59XG4iLCJleHBvcnQge2RlZmF1bHQgYXMgc3RhdGV9IGZyb20gXCIuL3NyYy9zdGF0ZVwiO1xuZXhwb3J0IHtkZWZhdWx0IGFzIHFzfSBmcm9tIFwiLi9zcmMvcXNcIjtcbmV4cG9ydCB7ZGVmYXVsdCBhcyBjb21wX2V2YWx9IGZyb20gXCIuL3NyYy9jb21wX2V2YWxcIjtcblxuaW1wb3J0IHN0YXRlIGZyb20gXCIuL3NyYy9zdGF0ZVwiO1xuXG5kZWJ1Z2dlclxuZXhwb3J0IGNvbnN0IHMgPSB3aW5kb3cuX19zdGF0ZV9fIHx8IHN0YXRlKClcbndpbmRvdy5fX3N0YXRlX18gPSBzXG5cbmV4cG9ydCBkZWZhdWx0IHM7XG4iLCIvL2ltcG9ydCBkMyBmcm9tICdkMydcblxuLyogRlJPTSBPVEhFUiBGSUxFICovXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRG9tYWlucyhkYXRhKSB7XG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkYXRhLmRpc3BsYXlfY2F0ZWdvcmllcy52YWx1ZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cbiAgdmFyIGlkZiA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkge3JldHVybiB4LmRvbWFpbiB9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkge3JldHVybiB4WzBdLmlkZiB9KVxuICAgIC5tYXAoZGF0YS5mdWxsX3VybHMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIkludGVybmV0ICYgVGVsZWNvbVwifSkgKVxuXG4gIHZhciBnZXRJREYgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIChpZGZbeF0gPT0gXCJOQVwiKSB8fCAoaWRmW3hdID4gODY4NikgPyAwIDogaWRmW3hdXG4gIH1cblxuICB2YXIgdmFsdWVzID0gZGF0YS5mdWxsX3VybHNcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwia2V5XCI6eC5kb21haW5cbiAgICAgICAgLCBcInZhbHVlXCI6eC5jb3VudFxuICAgICAgICAsIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAsIFwidW5pcXVlc1wiOiB4LnVuaXF1ZXMgXG4gICAgICAgICwgXCJ1cmxcIjogeC51cmxcbiAgICAgIH0gXG4gICAgfSlcblxuXG5cbiAgdmFsdWVzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5fSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgXCJwYXJlbnRfY2F0ZWdvcnlfbmFtZVwiOiB4WzBdLnBhcmVudF9jYXRlZ29yeV9uYW1lXG4gICAgICAgICAsIFwia2V5XCI6IHhbMF0ua2V5XG4gICAgICAgICAsIFwidmFsdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy52YWx1ZX0sMClcbiAgICAgICAgICwgXCJwZXJjZW50X3VuaXF1ZVwiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnVuaXF1ZXMvYy52YWx1ZX0sMCkveC5sZW5ndGhcbiAgICAgICAgICwgXCJ1cmxzXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwLmluZGV4T2YoYy51cmwpID09IC0xID8gcC5wdXNoKGMudXJsKSA6IHA7IHJldHVybiBwIH0sW10pXG5cbiAgICAgICB9IFxuICAgIH0pXG4gICAgLmVudHJpZXModmFsdWVzKS5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB4LnZhbHVlcyB9KVxuXG4gIGlmIChjYXRlZ29yaWVzLmxlbmd0aCA+IDApXG4gICAgdmFsdWVzID0gdmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KSB7cmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZih4LnBhcmVudF9jYXRlZ29yeV9uYW1lKSA+IC0xIH0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC50Zl9pZGYgPSBnZXRJREYoeC5rZXkpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgKiAoeC52YWx1ZSp4LnBlcmNlbnRfdW5pcXVlKSBcbiAgICB4LmNvdW50ID0geC52YWx1ZVxuICAgIHgudmFsdWUgPSBNYXRoLmxvZyh4LnRmX2lkZilcbiAgfSlcbiAgdmFsdWVzID0gdmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRmX2lkZiAtIHAudGZfaWRmIH0pXG5cblxuICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQqeC5wZXJjZW50X3VuaXF1ZX0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IFxuICAgIHgucG9wX3BlcmNlbnQgPSAxLjAyL2dldElERih4LmtleSkqMTAwXG4gICAgeC5wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQgPT0gSW5maW5pdHkgPyAwIDogeC5wb3BfcGVyY2VudFxuXG4gICAgeC5wZXJjZW50ID0geC5jb3VudCp4LnBlcmNlbnRfdW5pcXVlL3RvdGFsKjEwMFxuICB9KVxuXG4gIHZhciBub3JtID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAucmFuZ2UoWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnBvcF9wZXJjZW50fSldKVxuICAgIC5kb21haW4oWzAsIGQzLm1heCh2YWx1ZXMsZnVuY3Rpb24oeCl7cmV0dXJuIHgucGVyY2VudH0pXSlcbiAgICAubmljZSgpXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgeC5wZXJjZW50X25vcm0gPSBub3JtKHgucGVyY2VudClcbiAgICAvL3gucGVyY2VudF9ub3JtID0geC5wZXJjZW50XG4gIH0pXG5cblxuXG4gIFxuICByZXR1cm4gdmFsdWVzO1xuICAvL3tcbiAgLy8gICAga2V5OiBcIlRvcCBEb21haW5zXCJcbiAgLy8gICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCwxMDApXG4gIC8vfVxufVxuXG5cbi8qIEVORCBGUk9NIE9USEVSIEZJTEUgKi9cblxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGQzX3VwZGF0ZWFibGUodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCJcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGZ1bmN0aW9uKHgpe3JldHVybiBkYXRhID8gW2RhdGFdIDogW3hdfSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIFt4XX1cbiAgKVxuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSlcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZDNfc3BsYXQodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCJcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKVxuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSlcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhY2Nlc3NvcihhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG5leHBvcnQgZnVuY3Rpb24gTWVkaWFQbGFuKHRhcmdldCkge1xuICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgdGhpcy5fb24gPSB7fVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBtZWRpYV9wbGFuKHRhcmdldCkge1xuICByZXR1cm4gbmV3IE1lZGlhUGxhbih0YXJnZXQpXG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybURhdGEoZGF0YSkge1xuXG4gIHZhciBjaCA9IGRhdGEuY2F0ZWdvcnlfaG91ci5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSAhPSBcIk5BXCIgfSlcblxuICB2YXIgY2F0ZWdvcnlfaG91ciA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSArIFwiLFwiICsgeC5ob3VyIH0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgIHAudW5pcXVlcyA9IChwLnVuaXF1ZXMgfHwgMCkgKyBjLnVuaXF1ZXNcbiAgICAgICAgcC5jb3VudCA9IChwLmNvdW50IHx8IDApICsgYy5jb3VudFxuICAgICBcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0se30pXG4gICAgfSlcbiAgICAuZW50cmllcyhjaClcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgXCJjYXRlZ29yeVwiOiB4LmtleS5zcGxpdChcIixcIilbMF1cbiAgICAgICAgLCBcImhvdXJcIjogeC5rZXkuc3BsaXQoXCIsXCIpWzFdXG4gICAgICAgICwgXCJjb3VudFwiOiB4LnZhbHVlcy5jb3VudFxuICAgICAgICAsIFwidW5pcXVlc1wiOiB4LnZhbHVlcy51bmlxdWVzXG4gICAgICB9XG4gICAgfSlcblxuICB2YXIgc2NhbGVkID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LmNhdGVnb3J5IH0gKVxuICAgIC5yb2xsdXAoZnVuY3Rpb24odikge1xuICAgICAgdmFyIG1pbiA9IGQzLm1pbih2LGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQgfSlcbiAgICAgICAgLCBtYXggPSBkMy5tYXgodixmdW5jdGlvbih4KSB7IHJldHVybiB4LmNvdW50IH0pXG5cbiAgICAgICB2YXIgc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgLmRvbWFpbihbbWluLG1heF0pXG4gICAgICAgICAucmFuZ2UoWzAsMTAwXSlcbiAgICAgICBcbiAgICAgICB2YXIgaG91cnMgPSBkMy5yYW5nZSgwLDI0KVxuICAgICAgIGhvdXJzID0gaG91cnMuc2xpY2UoLTQsMjQpLmNvbmNhdChob3Vycy5zbGljZSgwLDIwKSkvLy5zbGljZSgzKS5jb25jYXQoaG91cnMuc2xpY2UoMCwzKSlcblxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwibm9ybWVkXCI6IGhvdXJzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiB2W2ldID8gc2NhbGUodltpXS5jb3VudCkgOiAwIH0pXG4gICAgICAgICAsIFwiY291bnRcIjogaG91cnMubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIHZbaV0gPyB2W2ldLmNvdW50IDogMCB9KVxuICAgICAgIH1cbiAgICAgICAvL3JldHVybiBob3VybHlcbiAgICB9KVxuICAgIC5lbnRyaWVzKGNhdGVnb3J5X2hvdXIpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IHgudG90YWwgPSBkMy5zdW0oeC52YWx1ZXMpOyByZXR1cm4geH0pXG4gICAgLy8uc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudG90YWwgLSBwLnRvdGFsfSlcblxuICByZXR1cm4gc2NhbGVkXG59XG5cbk1lZGlhUGxhbi5wcm90b3R5cGUgPSB7XG4gICAgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICAvL2RlYnVnZ2VyXG4gICAgICBpZiAodGhpcy5kYXRhKCkuY2F0ZWdvcnlfaG91ciA9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzXG5cbiAgICAgICAgICB2YXIgX2QgPSB0aGlzLmRhdGEoKVxuICAgICAgICAgIF9kLmRpc3BsYXlfY2F0ZWdvcmllcyA9IF9kLmRpc3BsYXlfY2F0ZWdvcmllcyB8fCB7XCJ2YWx1ZXNcIjpbXX1cbiAgICAgICAgICB2YXIgZGQgPSBidWlsZERvbWFpbnMoX2QpXG5cbiAgICAgIHZhciBzY2FsZWQgPSB0cmFuc2Zvcm1EYXRhKHRoaXMuZGF0YSgpKVxuXG4gICAgICBcbiAgICAgIHNjYWxlZC5tYXAoZnVuY3Rpb24oeCkge1xuXG4gICAgICAgIHguY291bnQgPSB4LnZhbHVlcy5jb3VudFxuICAgICAgICB4LnZhbHVlcz0geC52YWx1ZXMubm9ybWVkXG5cbiAgICAgIH0pXG5cblxuICAgICAgdGhpcy5yZW5kZXJfbGVmdChzY2FsZWQpXG4gICAgICB0aGlzLnJlbmRlcl9yaWdodChkZCxzY2FsZWQpXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgcmVuZGVyX3JpZ2h0OiBmdW5jdGlvbihkLHJvd19kYXRhKSB7XG5cbiAgICAgIHZhciB3cmFwcGVyID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIucmhzXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJyaHMgY29sLW1kLTRcIix0cnVlKVxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiQWJvdXQgdGhlIHBsYW5cIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIuZGVzY1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZGVzY1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnRleHQoXCJIaW5kc2lnaHQgaGFzIGF1dG9tYXRpY2FsbHkgZGV0ZXJtaW5lZCB0aGUgYmVzdCBzaXRlcyBhbmQgdGltZXMgd2hlcmUgeW91IHNob3VsZCBiZSB0YXJnZXRpbmcgdXNlcnMuIFRoZSBtZWRpYSBwbGFuIHByZXNlbnRlZCBiZWxvdyBkZXNjcmliZXMgdGhlIG9wdGltaXphdGlvbnMgdGhhdCBjYW4gYmUgbWFkZSB0byBhbnkgcHJvc3BlY3Rpbmcgb3IgcmV0YXJnZXRpbmcgY2FtcGFpZ24gdG8gbG93ZXIgQ1BBIGFuZCBzYXZlIG1vbmV5LlwiKVxuXG4gICAgICB2YXIgcGxhbl90YXJnZXQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIucGxhbi10YXJnZXRcIixcImRpdlwiLHJvd19kYXRhLGZ1bmN0aW9uKCl7cmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcInBsYW4tdGFyZ2V0XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiMTAwcHhcIilcblxuICAgICAgcGxhbl90YXJnZXQuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgICAgaWYgKHJvd19kYXRhLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdmFyIHJlbWFpbmRlcnMgPSByb3dfZGF0YS5tYXAoZnVuY3Rpb24ocikge1xuICAgICAgICBcbiAgICAgICAgICB2YXIgdG9fdGFyZ2V0ID0gZDMuc3VtKHIubWFzay5tYXAoZnVuY3Rpb24oeCxpKXsgcmV0dXJuIHggPyByLmNvdW50W2ldIDogMH0pKVxuICAgICAgICAgIHZhciB0b3RhbCA9IGQzLnN1bShyLmNvdW50KVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHRvdGFsOiB0b3RhbFxuICAgICAgICAgICAgLCB0b190YXJnZXQ6IHRvX3RhcmdldFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICB2YXIgY3V0ID0gZDMuc3VtKHJlbWFpbmRlcnMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnRvX3RhcmdldCoxLjAgfSlcbiAgICAgICAgdmFyIHRvdGFsID0gZDMuc3VtKHJlbWFpbmRlcnMsZnVuY3Rpb24oeCl7IHJldHVybiB4LnRvdGFsIH0pIFxuICAgICAgICB2YXIgcGVyY2VudCA9IGN1dC90b3RhbFxuXG4gICAgICAgIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCwgXCJoMy5zdW1tYXJ5XCIsXCJoM1wiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFt4XX0gLCBmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgICAuY2xhc3NlZChcInN1bW1hcnlcIix0cnVlKVxuICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgICAgLnRleHQoXCJQbGFuIFN1bW1hcnlcIilcblxuXG5cbiAgICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi53aGF0XCIsXCJkaXZcIixmdW5jdGlvbih4KSB7IHJldHVybiBbeF19ICwgZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgICAgLmNsYXNzZWQoXCJ3aGF0XCIsdHJ1ZSlcbiAgICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gXCI8ZGl2IHN0eWxlPSdmb250LXdlaWdodDpib2xkO3dpZHRoOjIwMHB4O3BhZGRpbmctbGVmdDoxMHB4O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtkaXNwbGF5OmlubGluZS1ibG9jayc+UG90ZW50aWFsIEFkcyBTZXJ2ZWQ6PC9kaXY+XCIgKyBkMy5mb3JtYXQoXCIsXCIpKHRvdGFsKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi5hbW91bnRcIixcImRpdlwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFt4XX0gLCBmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgICAuY2xhc3NlZChcImFtb3VudFwiLHRydWUpXG4gICAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0nZm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoyMDBweDtwYWRkaW5nLWxlZnQ6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPk9wdGltaXplZCBBZCBTZXJ2aW5nOjwvZGl2PlwiICsgZDMuZm9ybWF0KFwiLFwiKShjdXQpICsgXCIgKFwiICsgZDMuZm9ybWF0KFwiJVwiKShwZXJjZW50KSArIFwiKVwiXG4gICAgICAgICAgfSlcblxuICAgICAgICBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LFwiLmNwYVwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gW3hdfSAsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAgIC5jbGFzc2VkKFwiY3BhXCIsdHJ1ZSlcbiAgICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gXCI8ZGl2IHN0eWxlPSdmb250LXdlaWdodDpib2xkO3dpZHRoOjIwMHB4O3BhZGRpbmctbGVmdDoxMHB4O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtkaXNwbGF5OmlubGluZS1ibG9jayc+RXN0aW1hdGVkIENQQSByZWR1Y3Rpb246PC9kaXY+XCIgKyBkMy5mb3JtYXQoXCIlXCIpKDEtcGVyY2VudClcbiAgICAgICAgICB9KVxuXG5cblxuXG5cbiAgICAgICBcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHZhciBwbGFuX3RhcmdldCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcIi5wbGFuLWRldGFpbHNcIixcImRpdlwiLHJvd19kYXRhKVxuICAgICAgICAuY2xhc3NlZChcInBsYW4tZGV0YWlsc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjE2MHB4XCIpXG5cblxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsIFwiaDMuZGV0YWlsc1wiLFwiaDNcIilcbiAgICAgICAgLmNsYXNzZWQoXCJkZXRhaWxzXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiUGxhbiBEZXRhaWxzXCIpXG5cblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUocGxhbl90YXJnZXQsXCIud2hhdFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwid2hhdFwiLHRydWUpXG4gICAgICAgIC5odG1sKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICByZXR1cm4gXCI8ZGl2IHN0eWxlPSdwYWRkaW5nLWxlZnQ6MTBweDtmb250LXdlaWdodDpib2xkO3dpZHRoOjE0MHB4O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtkaXNwbGF5OmlubGluZS1ibG9jayc+Q2F0ZWdvcnk6PC9kaXY+XCIgKyB4LmtleVxuICAgICAgICB9KVxuXG4gICAgICBkM191cGRhdGVhYmxlKHBsYW5fdGFyZ2V0LFwiLnNhdmluZ1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwic2F2aW5nXCIsdHJ1ZSlcbiAgICAgICAgLmh0bWwoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGQuY291bnQpXG4gICAgICAgICAgdmFyIHBlcmNlbnQgPSBkMy5zdW0oeC5jb3VudCxmdW5jdGlvbih6LGkpIHsgcmV0dXJuIHgubWFza1tpXSA/IDAgOiB6fSkvZDMuc3VtKHguY291bnQsZnVuY3Rpb24oeixpKSB7IHJldHVybiB6IH0pXG4gICAgICAgICAgcmV0dXJuIFwiPGRpdiBzdHlsZT0ncGFkZGluZy1sZWZ0OjEwcHg7Zm9udC13ZWlnaHQ6Ym9sZDt3aWR0aDoxNDBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7ZGlzcGxheTppbmxpbmUtYmxvY2snPlN0cmF0ZWd5IHNhdmluZ3M6PC9kaXY+XCIgKyBkMy5mb3JtYXQoXCIlXCIpKHBlcmNlbnQpXG4gICAgICAgIH0pXG5cbiAgICAgIHZhciB3aGVuID0gZDNfdXBkYXRlYWJsZShwbGFuX3RhcmdldCxcIi53aGVuXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpeyByZXR1cm4gMSB9KVxuICAgICAgICAuY2xhc3NlZChcIndoZW5cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjgwcHhcIilcbiAgICAgICAgLmh0bWwoXCI8ZGl2IHN0eWxlPSdwYWRkaW5nLWxlZnQ6MTBweDt3aWR0aDoxNDBweDtkaXNwbGF5OmlubGluZS1ibG9jazt2ZXJ0aWNhbC1hbGlnbjp0b3AnPldoZW4gdG8gc2VydmU6PC9kaXY+XCIpXG4gICAgICAgIC5kYXR1bShmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGJvb2wgPSBmYWxzZVxuICAgICAgICAgIHZhciBwb3MgPSAtMVxuICAgICAgICAgIHZhciBzdGFydF9lbmRzID0geC5tYXNrLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgXG4gICAgICAgICAgICAgIHBvcyArPSAxXG4gICAgICAgICAgICAgIGlmIChib29sICE9IGMpIHtcbiAgICAgICAgICAgICAgICBib29sID0gY1xuICAgICAgICAgICAgICAgIHAucHVzaChwb3MpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgICAgIH0sW10pXG4gICAgICAgICAgdmFyIHMgPSBcIlwiXG4gICAgICAgICAgc3RhcnRfZW5kcy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICBpZiAoKGkgIT0gMCkgJiYgKChpJTIpID09IDApKSBzICs9IFwiLCBcIlxuICAgICAgICAgICAgaWYgKGklMikgcyArPSBcIiAtIFwiXG5cbiAgICAgICAgICAgIGlmICh4ID09IDApIHMgKz0gXCIxMmFtXCJcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgbnVtID0gKHgrMSklMTJcbiAgICAgICAgICAgICAgbnVtID0gbnVtID09IDAgPyAxMiA6IG51bVxuICAgICAgICAgICAgICBzICs9IG51bSArICgoeCA+IDExKSA/IFwicG1cIiA6IFwiYW1cIilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgXG4gICAgICAgICAgfSlcbiAgICAgICAgICBpZiAoKHN0YXJ0X2VuZHMubGVuZ3RoKSAlIDIpIHMgKz0gXCIgLSAxMmFtXCJcblxuICAgICAgICAgIHJldHVybiBzLnNwbGl0KFwiLCBcIilcbiAgICAgICAgfSlcblxuICAgICAgIHZhciBpdGVtcyA9IGQzX3VwZGF0ZWFibGUod2hlbixcIi5pdGVtc1wiLFwiZGl2XCIpXG4gICAgICAgICAuY2xhc3NlZChcIml0ZW1zXCIsdHJ1ZSlcbiAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNDBweFwiKVxuICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cbiAgICAgICBkM19zcGxhdChpdGVtcyxcIi5pdGVtXCIsXCJkaXZcIilcbiAgICAgICAgIC5jbGFzc2VkKFwiaXRlbVwiLHRydWUpXG4gICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQwcHhcIilcbiAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcIm5vbmVcIilcbiAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJub3JtYWxcIilcbiAgICAgICAgIC50ZXh0KFN0cmluZylcblxuXG5cbiAgICAgIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLCBcImgzLmV4YW1wbGUtc2l0ZXNcIixcImgzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZXhhbXBsZS1zaXRlc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMjBweFwiKVxuICAgICAgICAudGV4dChcIkV4YW1wbGUgU2l0ZXNcIilcblxuXG4gICAgICAgdmFyIHJvd3MgPSBkM19zcGxhdCh3cmFwcGVyLFwiLnJvd1wiLFwiZGl2XCIsZC5zbGljZSgwLDE1KSxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgICAgLmNsYXNzZWQoXCJyb3dcIix0cnVlKVxuICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE4cHhcIilcbiAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMjBweFwiKVxuXG4gICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgIHJldHVybiB4LmtleVxuICAgICAgICAgfSlcblxuICAgICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgIH1cbiAgLCByZW5kZXJfbGVmdDogZnVuY3Rpb24oc2NhbGVkKSB7XG5cblxuICAgICAgdmFyIHdyYXBwZXIgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5saHNcIixcImRpdlwiLHNjYWxlZClcbiAgICAgICAgLmNsYXNzZWQoXCJsaHMgY29sLW1kLThcIix0cnVlKVxuXG4gICAgICB3cmFwcGVyLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgICB2YXIgaGVhZCA9IGQzX3VwZGF0ZWFibGUod3JhcHBlciwgXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIyMHB4XCIpXG4gICAgICAgIC50ZXh0KFwiTWVkaWEgUGxhbiAoQ2F0ZWdvcnkgYW5kIFRpbWUgT3B0aW1pemF0aW9uKVwiKVxuXG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIGhlYWQgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsXCIuaGVhZFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGVhZFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjFweFwiKVxuXG4gICAgICB2YXIgbmFtZSA9IGQzX3VwZGF0ZWFibGUoaGVhZCxcIi5uYW1lXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICBkM19zcGxhdChoZWFkLFwiLmhvdXJcIixcImRpdlwiLGQzLnJhbmdlKDEsMjUpLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfSlcbiAgICAgICAgLmNsYXNzZWQoXCJzcSBob3VyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi44NWVtXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuaHRtbChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKHggPT0gMSkgcmV0dXJuIFwiPGI+MWE8L2I+XCJcbiAgICAgICAgICBpZiAoeCA9PSAyNCkgcmV0dXJuIFwiPGI+MTJhPC9iPlwiXG4gICAgICAgICAgaWYgKHggPT0gMTIpIHJldHVybiBcIjxiPjEycDwvYj5cIlxuICAgICAgICAgIHJldHVybiB4ID4gMTEgPyB4JTEyIDogeFxuICAgICAgICB9KVxuXG5cbiAgICAgIHZhciByb3cgPSBkM19zcGxhdCh3cmFwcGVyLFwiLnJvd1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJyb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIxcHhcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSArIFwiIHJvd1wiIH0pXG4gICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgIHZhciBfZCA9IHNlbGYuZGF0YSgpXG4gICAgICAgICAgX2QuZGlzcGxheV9jYXRlZ29yaWVzID0gX2QuZGlzcGxheV9jYXRlZ29yaWVzIHx8IHtcInZhbHVlc1wiOltdfVxuICAgICAgICAgIHZhciBkZCA9IGJ1aWxkRG9tYWlucyhfZClcblxuICAgICAgICAgIHZhciBkID0gZGQuZmlsdGVyKGZ1bmN0aW9uKHopIHsgcmV0dXJuIHoucGFyZW50X2NhdGVnb3J5X25hbWUgPT0geC5rZXl9KVxuICAgICAgICAgIFxuXG4gICAgICAgICAgc2VsZi5yZW5kZXJfcmlnaHQoZCx4KVxuICAgICAgICB9KVxuXG4gICAgICB2YXIgTUFHSUMgPSAyNSBcblxuICAgICAgdmFyIG5hbWUgPSBkM191cGRhdGVhYmxlKHJvdyxcIi5uYW1lXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG5cbiAgICAgIHZhciBjb2xvcnMgPSBbXCIjYTFkOTliXCIsIFwiIzc0YzQ3NlwiLCBcIiM0MWFiNWRcIiwgXCIjMjM4YjQ1XCIsIFwiIzAwNmQyY1wiLCBcIiMwMDQ0MWJcIl1cbiAgICAgIHZhciBjb2xvcnMgPSBbXCIjMjM4YjQ1XCJdXG5cbiAgICAgIHZhciBvID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAgIC5kb21haW4oWy0yNSwxMDBdKVxuICAgICAgICAucmFuZ2UoY29sb3JzKTtcblxuICAgICAgdmFyIHNxdWFyZSA9IGQzX3NwbGF0KHJvdyxcIi5zcVwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSwgZnVuY3Rpb24oeCxpKSB7IHJldHVybiBpIH0pIFxuICAgICAgICAuY2xhc3NlZChcInNxXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsZnVuY3Rpb24oeCxpKSB7IFxuICAgICAgICAgIHZhciBwZCA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXzsgXG4gICAgICAgICAgcGQubWFzayA9IHBkLm1hc2sgfHwgW11cbiAgICAgICAgICBwZC5tYXNrW2ldID0gKCh4ID4gTUFHSUMpICYmICggKHBkLnZhbHVlc1tpLTFdID4gTUFHSUMgfHwgZmFsc2UpIHx8IChwZC52YWx1ZXNbaSsxXSA+IE1BR0lDfHwgZmFsc2UpICkpXG4gICAgICAgICAgLy9yZXR1cm4gcGQubWFza1tpXSA/IG8ocGQudmFsdWVzW2ldKSAgOiBcInJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoIDQ1ZGVnLCAjZmVlMGQyLCAjZmVlMGQyIDJweCwgI2ZjYmJhMSA1cHgsICNmY2JiYTEgMnB4KSBcIlxuICAgICAgICAgIHJldHVybiBwZC5tYXNrW2ldID8gXG4gICAgICAgICAgICBcInJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoIDEzNWRlZywgIzIzOGI0NSwgIzIzOGI0NSAycHgsICMwMDZkMmMgNXB4LCAjMDA2ZDJjIDJweCkgXCIgOiBcbiAgICAgICAgICAgIFwicmVwZWF0aW5nLWxpbmVhci1ncmFkaWVudCggNDVkZWcsICNmZWUwZDIsICNmZWUwZDIgMnB4LCAjZmNiYmExIDVweCwgI2ZjYmJhMSAycHgpIFwiXG5cbiAgICAgICAgfSlcblxuXG4gICAgfVxuICAsIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl90YXJnZXQuZGF0dW0oKVxuICAgICAgdGhpcy5fdGFyZ2V0LmRhdHVtKGQpXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYWNjZXNzb3IoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWxcbiAgcmV0dXJuIHRoaXNcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvcFNlY3Rpb24oc2VjdGlvbikge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZShzZWN0aW9uLFwiLnRvcC1zZWN0aW9uXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInRvcC1zZWN0aW9uXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCIxNjBweFwiKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVtYWluaW5nU2VjdGlvbihzZWN0aW9uKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHNlY3Rpb24sXCIucmVtYWluaW5nLXNlY3Rpb25cIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwicmVtYWluaW5nLXNlY3Rpb25cIix0cnVlKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXV0b1NpemUod3JhcCxhZGp1c3RXaWR0aCxhZGp1c3RIZWlnaHQpIHtcblxuICBmdW5jdGlvbiBlbGVtZW50VG9XaWR0aChlbGVtKSB7XG5cbiAgICB2YXIgX3cgPSB3cmFwLm5vZGUoKS5vZmZzZXRXaWR0aCB8fCB3cmFwLm5vZGUoKS5wYXJlbnROb2RlLm9mZnNldFdpZHRoIHx8IHdyYXAubm9kZSgpLnBhcmVudE5vZGUucGFyZW50Tm9kZS5vZmZzZXRXaWR0aFxuICAgIHZhciBudW0gPSBfdyB8fCB3cmFwLnN0eWxlKFwid2lkdGhcIikuc3BsaXQoXCIuXCIpWzBdLnJlcGxhY2UoXCJweFwiLFwiXCIpIFxuICAgIHJldHVybiBwYXJzZUludChudW0pXG4gIH1cblxuICBmdW5jdGlvbiBlbGVtZW50VG9IZWlnaHQoZWxlbSkge1xuICAgIHZhciBudW0gPSB3cmFwLnN0eWxlKFwiaGVpZ2h0XCIpLnNwbGl0KFwiLlwiKVswXS5yZXBsYWNlKFwicHhcIixcIlwiKVxuICAgIHJldHVybiBwYXJzZUludChudW0pXG4gIH1cblxuICB2YXIgdyA9IGVsZW1lbnRUb1dpZHRoKHdyYXApIHx8IDcwMCxcbiAgICBoID0gZWxlbWVudFRvSGVpZ2h0KHdyYXApIHx8IDM0MDtcblxuICB3ID0gYWRqdXN0V2lkdGgodylcbiAgaCA9IGFkanVzdEhlaWdodChoKVxuXG5cbiAgdmFyIG1hcmdpbiA9IHt0b3A6IDEwLCByaWdodDogMTUsIGJvdHRvbTogMTAsIGxlZnQ6IDE1fSxcbiAgICAgIHdpZHRoICA9IHcgLSBtYXJnaW4ubGVmdCAtIG1hcmdpbi5yaWdodCxcbiAgICAgIGhlaWdodCA9IGggLSBtYXJnaW4udG9wIC0gbWFyZ2luLmJvdHRvbTtcblxuICByZXR1cm4ge1xuICAgIG1hcmdpbjogbWFyZ2luLFxuICAgIHdpZHRoOiB3aWR0aCxcbiAgICBoZWlnaHQ6IGhlaWdodFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdXRvU2NhbGVzKF9zaXplcywgbGVuKSB7XG5cbiAgdmFyIG1hcmdpbiA9IF9zaXplcy5tYXJnaW4sXG4gICAgd2lkdGggPSBfc2l6ZXMud2lkdGgsXG4gICAgaGVpZ2h0ID0gX3NpemVzLmhlaWdodDtcblxuICBoZWlnaHQgPSBsZW4gKiAyNlxuICBcbiAgdmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLnJhbmdlKFt3aWR0aC8yLCB3aWR0aC0yMF0pO1xuICBcbiAgdmFyIHkgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5yYW5nZVJvdW5kQmFuZHMoWzAsIGhlaWdodF0sIC4yKTtcblxuICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoeClcbiAgICAgIC5vcmllbnQoXCJ0b3BcIik7XG5cblxuICByZXR1cm4ge1xuICAgICAgeDogeFxuICAgICwgeTogeVxuICAgICwgeEF4aXM6IHhBeGlzXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcblxuZXhwb3J0IGZ1bmN0aW9uIFNlbGVjdCh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7fVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzZWxlY3QodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU2VsZWN0KHRhcmdldClcbn1cblxuU2VsZWN0LnByb3RvdHlwZSA9IHtcbiAgICBvcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwib3B0aW9uc1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB0aGlzLl9zZWxlY3QgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwic2VsZWN0XCIsXCJzZWxlY3RcIix0aGlzLl9vcHRpb25zKVxuXG4gICAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwic2VsZWN0XCIpLmJpbmQodGhpcylcblxuICAgICAgdGhpcy5fc2VsZWN0XG4gICAgICAgIC5vbihcImNoYW5nZVwiLGZ1bmN0aW9uKHgpIHsgYm91bmQodGhpcy5zZWxlY3RlZE9wdGlvbnNbMF0uX19kYXRhX18pIH0pXG5cbiAgICAgIHRoaXMuX29wdGlvbnMgPSBkM19zcGxhdCh0aGlzLl9zZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiLGlkZW50aXR5LGtleSlcbiAgICAgICAgLnRleHQoa2V5KVxuICAgICAgICAucHJvcGVydHkoXCJzZWxlY3RlZFwiLCAoeCkgPT4geC52YWx1ZSA9PSB0aGlzLl9zZWxlY3RlZCA/IFwic2VsZWN0ZWRcIiA6IG51bGwpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHNlbGVjdGVkOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2VsZWN0ZWRcIix2YWwpXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuL3NlbGVjdCdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmZ1bmN0aW9uIGluamVjdENzcyhjc3Nfc3RyaW5nKSB7XG4gIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI2hlYWRlci1jc3NcIixcInN0eWxlXCIpXG4gICAgLmF0dHIoXCJpZFwiLFwiaGVhZGVyLWNzc1wiKVxuICAgIC50ZXh0KENTU19TVFJJTkcucmVwbGFjZShcImZ1bmN0aW9uICgpIHsvKlwiLFwiXCIpLnJlcGxhY2UoXCIqL31cIixcIlwiKSlcbn1cblxuZnVuY3Rpb24gYnV0dG9uV3JhcCh3cmFwKSB7XG4gIHZhciBoZWFkID0gZDNfdXBkYXRlYWJsZSh3cmFwLCBcImgzLmJ1dHRvbnNcIixcImgzXCIpXG4gICAgLmNsYXNzZWQoXCJidXR0b25zXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuXG4gIHZhciByaWdodF9wdWxsID0gZDNfdXBkYXRlYWJsZShoZWFkLFwiLnB1bGwtcmlnaHRcIixcInNwYW5cIilcbiAgICAuY2xhc3NlZChcInB1bGwtcmlnaHQgaGVhZGVyLWJ1dHRvbnNcIiwgdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjE3cHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjJweFwiKVxuICAgIC5zdHlsZShcInRleHQtZGVjb3JhdGlvblwiLFwibm9uZSAhaW1wb3J0YW50XCIpXG5cbiAgcmV0dXJuIHJpZ2h0X3B1bGxcbn1cblxuZnVuY3Rpb24gZXhwYW5zaW9uV3JhcCh3cmFwKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHdyYXAsXCJkaXYuaGVhZGVyLWJvZHlcIixcImRpdlwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTNweFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJub25lXCIpXG4gICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwibm9ybWFsXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjE3NXB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMjVweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjI1cHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjE3NXB4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwid2hpdGVcIilcbiAgICAuY2xhc3NlZChcImhlYWRlci1ib2R5IGhpZGRlblwiLHRydWUpXG59XG5cbmZ1bmN0aW9uIGhlYWRXcmFwKHdyYXApIHtcbiAgcmV0dXJuIGQzX3VwZGF0ZWFibGUod3JhcCwgXCJoMy5kYXRhLWhlYWRlclwiLFwiaDNcIilcbiAgICAuY2xhc3NlZChcImRhdGEtaGVhZGVyXCIsdHJ1ZSlcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTVweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCIgYm9sZFwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiIDE0cHhcIilcbiAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiIDIycHhcIilcbiAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwiIHVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcImNvbG9yXCIsXCIgIzg4OFwiKVxuICAgIC5zdHlsZShcImxldHRlci1zcGFjaW5nXCIsXCIgLjA1ZW1cIilcblxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBIZWFkZXIodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcblxuICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuICAgIC5oZWFkZXItYnV0dG9ucyBhIHNwYW4uaG92ZXItc2hvdyB7IGRpc3BsYXk6bm9uZSB9XG4gICAgLmhlYWRlci1idXR0b25zIGE6aG92ZXIgc3Bhbi5ob3Zlci1zaG93IHsgZGlzcGxheTppbmxpbmU7IHBhZGRpbmctbGVmdDozcHggfVxuICAqL30pXG4gIFxufVxuXG5mdW5jdGlvbiBoZWFkZXIodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgSGVhZGVyKHRhcmdldClcbn1cblxuSGVhZGVyLnByb3RvdHlwZSA9IHtcbiAgICB0ZXh0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGV4dFwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgYnV0dG9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImJ1dHRvbnNcIix2YWwpIFxuICAgIH1cbiAgLCBleHBhbnNpb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJleHBhbnNpb25cIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCwgXCIuaGVhZGVyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImhlYWRlci13cmFwXCIsdHJ1ZSlcblxuICAgICAgdmFyIGV4cGFuZF93cmFwID0gZXhwYW5zaW9uV3JhcCh3cmFwKVxuICAgICAgICAsIGJ1dHRvbl93cmFwID0gYnV0dG9uV3JhcCh3cmFwKVxuICAgICAgICAsIGhlYWRfd3JhcCA9IGhlYWRXcmFwKHdyYXApXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaGVhZF93cmFwLFwic3Bhbi50aXRsZVwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAgICAgLnRleHQodGhpcy5fdGV4dClcblxuICAgICAgaWYgKHRoaXMuX29wdGlvbnMpIHtcblxuICAgICAgICB2YXIgYm91bmQgPSB0aGlzLm9uKFwic2VsZWN0XCIpLmJpbmQodGhpcylcblxuICAgICAgICB2YXIgc2VsZWN0Qm94ID0gc2VsZWN0KGhlYWRfd3JhcClcbiAgICAgICAgICAub3B0aW9ucyh0aGlzLl9vcHRpb25zKVxuICAgICAgICAgIC5vbihcInNlbGVjdFwiLGZ1bmN0aW9uKHgpIHsgYm91bmQoeCkgfSlcbiAgICAgICAgICAuZHJhdygpXG5cbiAgICAgICAgc2VsZWN0Qm94Ll9zZWxlY3RcbiAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTlweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMnB4XCIpXG4gICAgICAgICAgXG4gICAgICAgIHNlbGVjdEJveC5fb3B0aW9uc1xuICAgICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCIjODg4XCIpXG4gICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxMDBweFwiKVxuICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjVweFwiKVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYnV0dG9ucykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgYSA9IGQzX3NwbGF0KGJ1dHRvbl93cmFwLFwiYVwiLFwiYVwiLHRoaXMuX2J1dHRvbnMsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGV4dCB9KVxuICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIycHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWRlY29yYXRpb25cIixcIm5vbmVcIilcbiAgICAgICAgICAuaHRtbCh4ID0+IFwiPHNwYW4gY2xhc3M9J1wiICsgeC5pY29uICsgXCInPjwvc3Bhbj48c3BhbiBzdHlsZT0ncGFkZGluZy1sZWZ0OjNweCc+XCIgKyB4LnRleHQgKyBcIjwvc3Bhbj5cIilcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIseCA9PiB4LmNsYXNzKVxuICAgICAgICAgIC5vbihcImNsaWNrXCIseCA9PiB0aGlzLm9uKHguY2xhc3MgKyBcIi5jbGlja1wiKSh4KSlcblxuXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuZXhwb3J0IGRlZmF1bHQgaGVhZGVyO1xuIiwiaW1wb3J0IGQzIGZyb20gJ2QzJztcblxuZnVuY3Rpb24gYWNjZXNzb3IoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWw7XG4gIHJldHVybiB0aGlzXG59XG5cbmZ1bmN0aW9uIGQzX3VwZGF0ZWFibGUodGFyZ2V0LHNlbGVjdG9yLHR5cGUsZGF0YSxqb2luZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlIHx8IFwiZGl2XCI7XG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBmdW5jdGlvbih4KXtyZXR1cm4gZGF0YSA/IFtkYXRhXSA6IFt4XX0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiBbeF19XG4gICk7XG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKTtcblxuICByZXR1cm4gdXBkYXRlYWJsZVxufVxuXG5mdW5jdGlvbiBkM19zcGxhdCh0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIjtcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGRhdGEgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH1cbiAgKTtcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpO1xuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmZ1bmN0aW9uIFRhYmxlKHRhcmdldCkge1xuICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuLnRhYmxlLXdyYXBwZXIgdHIgeyBoZWlnaHQ6MzNweH1cbi50YWJsZS13cmFwcGVyIHRyIHRoIHsgYm9yZGVyLXJpZ2h0OjFweCBkb3R0ZWQgI2NjYyB9IFxuLnRhYmxlLXdyYXBwZXIgdHIgdGg6bGFzdC1vZi10eXBlIHsgYm9yZGVyLXJpZ2h0Om5vbmUgfSBcblxuLnRhYmxlLXdyYXBwZXIgdHIgeyBib3JkZXItYm90dG9tOjFweCBzb2xpZCAjZGRkIH1cbi50YWJsZS13cmFwcGVyIHRyIHRoLCAudGFibGUtd3JhcHBlciB0ciB0ZCB7IFxuICBwYWRkaW5nLWxlZnQ6MTBweDtcbiAgbWF4LXdpZHRoOjIwMHB4XG59XG5cbi50YWJsZS13cmFwcGVyIHRoZWFkIHRyIHsgXG4gIGJhY2tncm91bmQtY29sb3I6I2UzZWJmMDtcbn1cbi50YWJsZS13cmFwcGVyIHRoZWFkIHRyIHRoIC50aXRsZSB7IFxuICB0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2Vcbn1cbi50YWJsZS13cmFwcGVyIHRib2R5IHRyIHsgXG59XG4udGFibGUtd3JhcHBlciB0Ym9keSB0cjpob3ZlciB7IFxuICBiYWNrZ3JvdW5kLWNvbG9yOndoaXRlO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiNmOWY5ZmJcbn1cbiAgKi99KTtcblxuICB0cnkge1xuICAgIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI3RhYmxlLWNzc1wiLFwic3R5bGVcIilcbiAgICAgIC5hdHRyKFwiaWRcIixcInRhYmxlLWNzc1wiKVxuICAgICAgLnRleHQoQ1NTX1NUUklORy5yZXBsYWNlKFwiZnVuY3Rpb24gKCkgey8qXCIsXCJcIikucmVwbGFjZShcIiovfVwiLFwiXCIpKTtcbiAgfSBjYXRjaChlKSB7XG4gIH1cblxuICB0aGlzLl90YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMuX2RhdGEgPSB7fTsvL0VYQU1QTEVfREFUQVxuICB0aGlzLl9zb3J0ID0ge307XG4gIHRoaXMuX3JlbmRlcmVycyA9IHt9O1xuICB0aGlzLl90b3AgPSAwO1xuXG4gIHRoaXMuX2RlZmF1bHRfcmVuZGVyZXIgPSBmdW5jdGlvbiAoeCkge1xuICAgIGlmICh4LmtleS5pbmRleE9mKFwicGVyY2VudFwiKSA+IC0xKSByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLnRleHQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgdmFyIHBkID0gdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fO1xuICAgICAgICByZXR1cm4gZDMuZm9ybWF0KFwiLjIlXCIpKHBkW3gua2V5XS8xMDApXG4gICAgICB9KVxuICAgXG4gICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzKS50ZXh0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICB2YXIgcGQgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX187XG4gICAgICByZXR1cm4gcGRbeC5rZXldID4gMCA/IGQzLmZvcm1hdChcIiwuMmZcIikocGRbeC5rZXldKS5yZXBsYWNlKFwiLjAwXCIsXCJcIikgOiBwZFt4LmtleV1cbiAgICB9KVxuICB9O1xuXG4gIHRoaXMuX2hpZGRlbl9maWVsZHMgPSBbXTtcbiAgdGhpcy5fb24gPSB7fTtcbiAgdGhpcy5fcmVuZGVyX2hlYWRlciA9IGZ1bmN0aW9uKHdyYXApIHtcblxuXG4gICAgd3JhcC5lYWNoKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHZhciBoZWFkZXJzID0gZDNfdXBkYXRlYWJsZShkMy5zZWxlY3QodGhpcyksXCIuaGVhZGVyc1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGVhZGVyc1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyLWJvdHRvbVwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKTtcblxuICAgICAgaGVhZGVycy5odG1sKFwiXCIpO1xuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaGVhZGVycyxcIi51cmxcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInVybFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3NSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KFwiQXJ0aWNsZVwiKTtcblxuICAgICAgZDNfdXBkYXRlYWJsZShoZWFkZXJzLFwiLmNvdW50XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb3VudFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KFwiQ291bnRcIik7XG5cblxuICAgIH0pO1xuXG4gIH07XG4gIHRoaXMuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihyb3cpIHtcblxuICAgICAgZDNfdXBkYXRlYWJsZShyb3csXCIudXJsXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ1cmxcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNzUlXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyNHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwiaGlkZGVuXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7cmV0dXJuIHgua2V5fSk7XG5cbiAgICAgIGQzX3VwZGF0ZWFibGUocm93LFwiLmNvdW50XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb3VudFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNSVcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCl7cmV0dXJuIHgudmFsdWV9KTtcblxuICB9O1xufVxuXG5mdW5jdGlvbiB0YWJsZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBUYWJsZSh0YXJnZXQpXG59XG5cblRhYmxlLnByb3RvdHlwZSA9IHtcblxuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkgeyBcbiAgICAgIHZhciB2YWx1ZSA9IGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKTsgXG4gICAgICBpZiAodmFsICYmIHZhbC52YWx1ZXMubGVuZ3RoICYmIHRoaXMuX2hlYWRlcnMgPT0gdW5kZWZpbmVkKSB7IFxuICAgICAgICB2YXIgaGVhZGVycyA9IE9iamVjdC5rZXlzKHZhbC52YWx1ZXNbMF0pLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB7a2V5OngsdmFsdWU6eH0gfSk7XG4gICAgICAgIHRoaXMuaGVhZGVycyhoZWFkZXJzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH1cbiAgLCBza2lwX29wdGlvbjogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2tpcF9vcHRpb25cIix2YWwpIH1cblxuICAsIHRpdGxlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfVxuICAsIHJvdzogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmVuZGVyX3Jvd1wiLHZhbCkgfVxuICAsIGRlZmF1bHRfcmVuZGVyZXI6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRlZmF1bHRfcmVuZGVyZXJcIix2YWwpIH1cbiAgLCB0b3A6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInRvcFwiLHZhbCkgfVxuXG4gICwgaGVhZGVyOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyZW5kZXJfaGVhZGVyXCIsdmFsKSB9XG4gICwgaGVhZGVyczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVhZGVyc1wiLHZhbCkgfVxuICAsIGhpZGRlbl9maWVsZHM6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImhpZGRlbl9maWVsZHNcIix2YWwpIH1cbiAgLCBhbGxfaGVhZGVyczogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaGVhZGVycyA9IHRoaXMuaGVhZGVycygpLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjLnZhbHVlOyByZXR1cm4gcH0se30pXG4gICAgICAgICwgaXNfbG9ja2VkID0gdGhpcy5oZWFkZXJzKCkuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuICEheC5sb2NrZWQgfSkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pO1xuXG4gICAgICBpZiAodGhpcy5fZGF0YS52YWx1ZXMgJiYgdGhpcy5fZGF0YS52YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgIFxuICAgICAgICB2YXIgYWxsX2hlYWRzID0gT2JqZWN0LmtleXModGhpcy5fZGF0YS52YWx1ZXNbMF0pLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgICAgIGlmICh0aGlzLl9oaWRkZW5fZmllbGRzICYmIHRoaXMuX2hpZGRlbl9maWVsZHMuaW5kZXhPZih4KSA+IC0xKSByZXR1cm4gZmFsc2VcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBrZXk6eFxuICAgICAgICAgICAgLCB2YWx1ZTpoZWFkZXJzW3hdIHx8IHhcbiAgICAgICAgICAgICwgc2VsZWN0ZWQ6ICEhaGVhZGVyc1t4XVxuICAgICAgICAgICAgLCBsb2NrZWQ6IChpc19sb2NrZWQuaW5kZXhPZih4KSA+IC0xID8gdHJ1ZSA6IHVuZGVmaW5lZCkgXG4gICAgICAgICAgfSBcbiAgICAgICAgfS5iaW5kKHRoaXMpKS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9KTtcbiAgICAgICAgdmFyIGdldEluZGV4ID0gZnVuY3Rpb24oaykge1xuICAgICAgICAgIHJldHVybiBpc19sb2NrZWQuaW5kZXhPZihrKSA+IC0xID8gaXNfbG9ja2VkLmluZGV4T2YoaykgKyAxMCA6IDBcbiAgICAgICAgfTtcblxuICAgICAgICBhbGxfaGVhZHMgPSBhbGxfaGVhZHMuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGdldEluZGV4KGMua2V5IHx8IC1JbmZpbml0eSkgLSBnZXRJbmRleChwLmtleSB8fCAtSW5maW5pdHkpIH0pO1xuICAgICAgICByZXR1cm4gYWxsX2hlYWRzXG4gICAgICB9XG4gICAgICBlbHNlIHJldHVybiB0aGlzLmhlYWRlcnMoKVxuICAgIH1cbiAgLCBzb3J0OiBmdW5jdGlvbihrZXksYXNjZW5kaW5nKSB7XG4gICAgICBpZiAoIWtleSkgcmV0dXJuIHRoaXMuX3NvcnRcbiAgICAgIHRoaXMuX3NvcnQgPSB7XG4gICAgICAgICAga2V5OiBrZXlcbiAgICAgICAgLCB2YWx1ZTogISFhc2NlbmRpbmdcbiAgICAgIH07XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAsIHJlbmRlcl93cmFwcGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gdGhpcy5fdGFyZ2V0O1xuXG4gICAgICB2YXIgd3JhcHBlciA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi50YWJsZS13cmFwcGVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS13cmFwcGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcInJlbGF0aXZlXCIpO1xuXG5cbiAgICAgIHZhciB0YWJsZSA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcInRhYmxlLm1haW5cIixcInRhYmxlXCIpXG4gICAgICAgIC5jbGFzc2VkKFwibWFpblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpO1xuXG4gICAgICB0aGlzLl90YWJsZV9tYWluID0gdGFibGU7XG5cbiAgICAgIHZhciB0aGVhZCA9IGQzX3VwZGF0ZWFibGUodGFibGUsXCJ0aGVhZFwiLFwidGhlYWRcIik7XG4gICAgICBkM191cGRhdGVhYmxlKHRhYmxlLFwidGJvZHlcIixcInRib2R5XCIpO1xuXG5cblxuICAgICAgaWYgKCF0aGlzLl9za2lwX29wdGlvbikge1xuICAgICAgdmFyIHRhYmxlX2ZpeGVkID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwidGFibGUuZml4ZWRcIixcInRhYmxlXCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsIHRydWUpIC8vIFRPRE86IG1ha2UgdGhpcyB2aXNpYmxlIHdoZW4gbWFpbiBpcyBub3QgaW4gdmlld1xuICAgICAgICAuY2xhc3NlZChcImZpeGVkXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIix3cmFwcGVyLnN0eWxlKFwid2lkdGhcIikpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLHRoaXMuX3RvcCArIFwicHhcIilcbiAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpO1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB0cnkge1xuICAgICAgZDMuc2VsZWN0KHdpbmRvdykub24oJ3Njcm9sbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyh0YWJsZS5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wLCBzZWxmLl90b3ApO1xuICAgICAgICBpZiAodGFibGUubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCA8IHNlbGYuX3RvcCkgdGFibGVfZml4ZWQuY2xhc3NlZChcImhpZGRlblwiLGZhbHNlKTtcbiAgICAgICAgZWxzZSB0YWJsZV9maXhlZC5jbGFzc2VkKFwiaGlkZGVuXCIsdHJ1ZSk7XG5cbiAgICAgICAgdmFyIHdpZHRocyA9IFtdO1xuXG4gICAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLm1haW5cIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwiLnRhYmxlLWhlYWRlcnNcIilcbiAgICAgICAgICAuc2VsZWN0QWxsKFwidGhcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICAgIHdpZHRocy5wdXNoKHRoaXMub2Zmc2V0V2lkdGgpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIHdyYXAuc2VsZWN0QWxsKFwiLmZpeGVkXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcIi50YWJsZS1oZWFkZXJzXCIpXG4gICAgICAgICAgLnNlbGVjdEFsbChcInRoXCIpXG4gICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoXCJ3aWR0aFwiLHdpZHRoc1tpXSArIFwicHhcIik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgfSk7XG4gICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgXG5cbiAgICAgIHRoaXMuX3RhYmxlX2ZpeGVkID0gdGFibGVfZml4ZWQ7XG5cblxuICAgICAgdmFyIHRoZWFkID0gZDNfdXBkYXRlYWJsZSh0YWJsZV9maXhlZCxcInRoZWFkXCIsXCJ0aGVhZFwiKTtcblxuICAgICAgdmFyIHRhYmxlX2J1dHRvbiA9IGQzX3VwZGF0ZWFibGUod3JhcHBlcixcIi50YWJsZS1vcHRpb25cIixcImFcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS1vcHRpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsXCItMXB4XCIpXG4gICAgICAgIC5zdHlsZShcInJpZ2h0XCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctcmlnaHRcIixcIjhweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjhweFwiKVxuICAgICAgICAudGV4dChcIk9QVElPTlNcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIsIXRoaXMuX29wdGlvbnNfaGVhZGVyLmNsYXNzZWQoXCJoaWRkZW5cIikpO1xuICAgICAgICAgIHRoaXMuX3Nob3dfb3B0aW9ucyA9ICF0aGlzLl9vcHRpb25zX2hlYWRlci5jbGFzc2VkKFwiaGlkZGVuXCIpO1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gd3JhcHBlclxuICAgIH0gIFxuICAsIHJlbmRlcl9oZWFkZXI6IGZ1bmN0aW9uKHRhYmxlKSB7XG5cbiAgICAgIHZhciB0aGVhZCA9IHRhYmxlLnNlbGVjdEFsbChcInRoZWFkXCIpXG4gICAgICAgICwgdGJvZHkgPSB0YWJsZS5zZWxlY3RBbGwoXCJ0Ym9keVwiKTtcblxuICAgICAgaWYgKHRoaXMuaGVhZGVycygpID09IHVuZGVmaW5lZCkgcmV0dXJuXG5cbiAgICAgIHZhciBvcHRpb25zX3RoZWFkID0gZDNfdXBkYXRlYWJsZSh0aGVhZCxcInRyLnRhYmxlLW9wdGlvbnNcIixcInRyXCIsdGhpcy5hbGxfaGVhZGVycygpLGZ1bmN0aW9uKHgpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiaGlkZGVuXCIsICF0aGlzLl9zaG93X29wdGlvbnMpXG4gICAgICAgIC5jbGFzc2VkKFwidGFibGUtb3B0aW9uc1wiLHRydWUpO1xuXG4gICAgICB2YXIgaCA9IHRoaXMuX3NraXBfb3B0aW9uID8gdGhpcy5oZWFkZXJzKCkgOiB0aGlzLmhlYWRlcnMoKS5jb25jYXQoW3trZXk6XCJzcGFjZXJcIiwgd2lkdGg6XCI3MHB4XCJ9XSk7XG4gICAgICB2YXIgaGVhZGVyc190aGVhZCA9IGQzX3VwZGF0ZWFibGUodGhlYWQsXCJ0ci50YWJsZS1oZWFkZXJzXCIsXCJ0clwiLGgsZnVuY3Rpb24oeCl7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ0YWJsZS1oZWFkZXJzXCIsdHJ1ZSk7XG5cblxuICAgICAgdmFyIHRoID0gZDNfc3BsYXQoaGVhZGVyc190aGVhZCxcInRoXCIsXCJ0aFwiLGZhbHNlLGZ1bmN0aW9uKHgsaSkge3JldHVybiB4LmtleSArIGkgfSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LndpZHRoIH0pXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsXCJyZWxhdGl2ZVwiKVxuICAgICAgICAub3JkZXIoKTtcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHRoLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcInRpdGxlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUgfSlcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgaWYgKHguc29ydCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB4Wydzb3J0J107XG4gICAgICAgICAgICB0aGlzLl9zb3J0ID0ge307XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeC5zb3J0ID0gISF4LnNvcnQ7XG5cbiAgICAgICAgICAgIHRoaXMuc29ydCh4LmtleSx4LnNvcnQpO1xuICAgICAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgICBkM191cGRhdGVhYmxlKHRoLFwiaVwiLFwiaVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjVweFwiKVxuICAgICAgICAuY2xhc3NlZChcImZhXCIsdHJ1ZSlcbiAgICAgICAgLmNsYXNzZWQoXCJmYS1zb3J0LWFzY1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiAoeC5rZXkgPT0gdGhpcy5fc29ydC5rZXkpID8gdGhpcy5fc29ydC52YWx1ZSA9PT0gdHJ1ZSA6IHVuZGVmaW5lZCB9LmJpbmQodGhpcykpXG4gICAgICAgIC5jbGFzc2VkKFwiZmEtc29ydC1kZXNjXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuICh4LmtleSA9PSB0aGlzLl9zb3J0LmtleSkgPyB0aGlzLl9zb3J0LnZhbHVlID09PSBmYWxzZSA6IHVuZGVmaW5lZCB9LmJpbmQodGhpcykpO1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2FuX3JlZHJhdyA9IHRydWU7XG5cbiAgICAgIHZhciBkcmFnID0gZDMuYmVoYXZpb3IuZHJhZygpXG4gICAgICAgIC5vbihcImRyYWdcIiwgZnVuY3Rpb24oZCxpKSB7XG4gICAgICAgICAgICB2YXIgeCA9IGQzLmV2ZW50LmR4O1xuICAgICAgICAgICAgdmFyIHcgPSBwYXJzZUludChkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zdHlsZShcIndpZHRoXCIpLnJlcGxhY2UoXCJweFwiKSk7XG4gICAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuX19kYXRhX18ud2lkdGggPSAodyt4KStcInB4XCI7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zdHlsZShcIndpZHRoXCIsICh3K3gpK1wicHhcIik7XG5cbiAgICAgICAgICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLDApLmluZGV4T2YodGhpcy5wYXJlbnROb2RlKSArIDE7XG4gICAgICAgICAgICBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW5baW5kZXhdKS5zdHlsZShcIndpZHRoXCIsdW5kZWZpbmVkKTtcblxuICAgICAgICAgICAgaWYgKGNhbl9yZWRyYXcpIHtcbiAgICAgICAgICAgICAgY2FuX3JlZHJhdyA9IGZhbHNlO1xuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNhbl9yZWRyYXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgICB2YXIgcmVuZGVyID0gc2VsZi5fcmVuZGVyZXJzW3gua2V5XTtcbiAgICAgICAgICAgICAgICAgIGlmIChyZW5kZXIpIHJlbmRlci5iaW5kKHRoaXMpKHgpO1xuICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgIH0sMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG5cbiAgICAgIHZhciBkcmFnZ2FibGUgPSBkM191cGRhdGVhYmxlKHRoLFwiYlwiLFwiYlwiKVxuICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIiwgXCJldy1yZXNpemVcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsIFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIiwgXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInBvc2l0aW9uXCIsIFwiYWJzb2x1dGVcIilcbiAgICAgICAgLnN0eWxlKFwicmlnaHRcIiwgXCItOHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRvcFwiLCBcIjBcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIiwgXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInotaW5kZXhcIiwgMSlcbiAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgdmFyIGluZGV4ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGRyZW4sMCkuaW5kZXhPZih0aGlzLnBhcmVudE5vZGUpICsgMTtcbiAgICAgICAgICAgdGJvZHkuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bnRoLW9mLXR5cGUoXCIgKyBpbmRleCArIFwiKVwiKS5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IGRvdHRlZCAjY2NjXCIpO1xuICAgICAgICB9KVxuICAgICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLDApLmluZGV4T2YodGhpcy5wYXJlbnROb2RlKSArIDE7XG4gICAgICAgICAgIHRib2R5LnNlbGVjdEFsbChcInRyXCIpLnNlbGVjdEFsbChcInRkOm50aC1vZi10eXBlKFwiICsgaW5kZXggKyBcIilcIikuc3R5bGUoXCJib3JkZXItcmlnaHRcIix1bmRlZmluZWQpO1xuICAgICAgICB9KVxuICAgICAgICAuY2FsbChkcmFnKTtcblxuICAgICAgdGguZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICBpZiAoIXRoaXMuX3NraXBfb3B0aW9uKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IGQzX3VwZGF0ZWFibGUob3B0aW9uc190aGVhZCxcInRoXCIsXCJ0aFwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5hdHRyKFwiY29sc3BhblwiLHRoaXMuaGVhZGVycygpLmxlbmd0aCsxKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgIHZhciBvcHRpb24gPSBkM19zcGxhdChvcHRpb25zLFwiLm9wdGlvblwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJvcHRpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpO1xuXG5cbiAgICAgIG9wdGlvbi5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgZDNfdXBkYXRlYWJsZShvcHRpb24sXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgLmF0dHIoXCJ0eXBlXCIsXCJjaGVja2JveFwiKVxuICAgICAgICAucHJvcGVydHkoXCJjaGVja2VkXCIsZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgICB0aGlzLmNoZWNrZWQgPSB4LnNlbGVjdGVkO1xuICAgICAgICAgIHJldHVybiB4LnNlbGVjdGVkID8gXCJjaGVja2VkXCIgOiB1bmRlZmluZWQgXG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKFwiZGlzYWJsZWRcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LmxvY2tlZCB9KVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgeC5zZWxlY3RlZCA9IHRoaXMuY2hlY2tlZDtcbiAgICAgICAgICBpZiAoeC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgc2VsZi5oZWFkZXJzKCkucHVzaCh4KTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmRyYXcoKVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgaW5kaWNlcyA9IHNlbGYuaGVhZGVycygpLm1hcChmdW5jdGlvbih6LGkpIHsgcmV0dXJuIHoua2V5ID09IHgua2V5ID8gaSA6IHVuZGVmaW5lZCAgfSkgXG4gICAgICAgICAgICAsIGluZGV4ID0gaW5kaWNlcy5maWx0ZXIoZnVuY3Rpb24oeikgeyByZXR1cm4geiB9KSB8fCAwO1xuXG4gICAgICAgICAgc2VsZi5oZWFkZXJzKCkuc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICAgIHNlbGYuZHJhdygpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICBkM191cGRhdGVhYmxlKG9wdGlvbixcInNwYW5cIixcInNwYW5cIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4gXCIgXCIgKyB4LnZhbHVlIH0pO1xuXG4gICAgIH1cblxuXG4gICAgIHRoaXMuX29wdGlvbnNfaGVhZGVyID0gdGhpcy5fdGFyZ2V0LnNlbGVjdEFsbChcIi50YWJsZS1vcHRpb25zXCIpO1xuICAgIH1cbiAgXG4gICwgcmVuZGVyX3Jvd3M6IGZ1bmN0aW9uKHRhYmxlKSB7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciB0Ym9keSA9IHRhYmxlLnNlbGVjdEFsbChcInRib2R5XCIpO1xuXG4gICAgICBpZiAodGhpcy5oZWFkZXJzKCkgPT0gdW5kZWZpbmVkKSByZXR1cm5cbiAgICAgIGlmICghKHRoaXMuX2RhdGEgJiYgdGhpcy5fZGF0YS52YWx1ZXMgJiYgdGhpcy5fZGF0YS52YWx1ZXMubGVuZ3RoKSkgcmV0dXJuXG5cbiAgICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YS52YWx1ZXNcbiAgICAgICAgLCBzb3J0YnkgPSB0aGlzLl9zb3J0IHx8IHt9O1xuXG4gICAgICBkYXRhID0gZGF0YS5zb3J0KGZ1bmN0aW9uKHAsYykge1xuICAgICAgICB2YXIgYSA9IHBbc29ydGJ5LmtleV0gfHwgLUluZmluaXR5XG4gICAgICAgICAgLCBiID0gY1tzb3J0Ynkua2V5XSB8fCAtSW5maW5pdHk7XG5cbiAgICAgICAgcmV0dXJuIHNvcnRieS52YWx1ZSA/IGQzLmFzY2VuZGluZyhhLGIpIDogZDMuZGVzY2VuZGluZyhhLGIpXG4gICAgICB9KTtcblxuICAgICAgdmFyIHJvd3MgPSBkM19zcGxhdCh0Ym9keSxcInRyXCIsXCJ0clwiLGRhdGEsZnVuY3Rpb24oeCxpKXsgcmV0dXJuIFN0cmluZyhzb3J0Ynkua2V5ICsgeFtzb3J0Ynkua2V5XSkgKyBpIH0pXG4gICAgICAgIC5vcmRlcigpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHNlbGYub24oXCJleHBhbmRcIikuYmluZCh0aGlzKSh4KTtcbiAgICAgICAgfSk7XG5cbiAgICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICB2YXIgdGQgPSBkM19zcGxhdChyb3dzLFwidGRcIixcInRkXCIsdGhpcy5oZWFkZXJzKCksZnVuY3Rpb24oeCxpKSB7cmV0dXJuIHgua2V5ICsgaSB9KVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpO1xuXG4gICAgICAgICAgdmFyIHJlbmRlcmVyID0gc2VsZi5fcmVuZGVyZXJzW3gua2V5XTtcblxuICAgICAgICAgIGlmICghcmVuZGVyZXIpIHsgXG4gICAgICAgICAgICByZW5kZXJlciA9IHNlbGYuX2RlZmF1bHRfcmVuZGVyZXIuYmluZCh0aGlzKSh4KTsgXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiByZW5kZXJlci5iaW5kKHRoaXMpKHgpXG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgXG5cbiAgICAgIHRkLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgICAgdmFyIG8gPSBkM191cGRhdGVhYmxlKHJvd3MsXCJ0ZC5vcHRpb24taGVhZGVyXCIsXCJ0ZFwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwib3B0aW9uLWhlYWRlclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI3MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKTtcbiBcbiAgICAgIGlmICh0aGlzLl9za2lwX29wdGlvbikgby5jbGFzc2VkKFwiaGlkZGVuXCIsdHJ1ZSk7IFxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUobyxcImFcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLmh0bWwoc2VsZi5vcHRpb25fdGV4dCgpKTtcbiAgICAgICAgXG5cblxuXG4gICAgfVxuICAsIG9wdGlvbl90ZXh0OiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25fdGV4dFwiLHZhbCkgfVxuICAsIHJlbmRlcjogZnVuY3Rpb24oayxmbikge1xuICAgICAgaWYgKGZuID09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX3JlbmRlcmVyc1trXSB8fCBmYWxzZVxuICAgICAgdGhpcy5fcmVuZGVyZXJzW2tdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciB3cmFwcGVyID0gdGhpcy5yZW5kZXJfd3JhcHBlcigpO1xuXG4gICAgICB3cmFwcGVyLnNlbGVjdEFsbChcInRhYmxlXCIpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgICAgc2VsZi5yZW5kZXJfaGVhZGVyKGQzLnNlbGVjdCh0aGlzKSk7IFxuICAgICAgICB9KTtcblxuICAgICAgdGhpcy5yZW5kZXJfcm93cyh0aGlzLl90YWJsZV9tYWluKTtcblxuICAgICAgcmV0dXJuIHRoaXNcblxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkMzogZDNcbn07XG5cbmV4cG9ydCB7IHRhYmxlLCB0YWJsZSBhcyB0IH07ZXhwb3J0IGRlZmF1bHQgdGFibGU7XG4iLCIvL2ltcG9ydCBkMyBmcm9tICdkMydcblxuZnVuY3Rpb24gZDNfdXBkYXRlYWJsZSh0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIjtcbiAgdmFyIHVwZGF0ZWFibGUgPSB0YXJnZXQuc2VsZWN0QWxsKHNlbGVjdG9yKS5kYXRhKFxuICAgIGZ1bmN0aW9uKHgpe3JldHVybiBkYXRhID8gW2RhdGFdIDogW3hdfSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIFt4XX1cbiAgKTtcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpO1xuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmZ1bmN0aW9uIGQzX3NwbGF0KHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiO1xuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZGF0YSB8fCBmdW5jdGlvbih4KXtyZXR1cm4geH0sXG4gICAgam9pbmVyIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fVxuICApO1xuXG4gIHVwZGF0ZWFibGUuZW50ZXIoKVxuICAgIC5hcHBlbmQodHlwZSk7XG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuXG52YXIgdHlwZXdhdGNoID0gKGZ1bmN0aW9uKCl7XG4gIHZhciB0aW1lciA9IDA7XG4gIHJldHVybiBmdW5jdGlvbihjYWxsYmFjaywgbXMpe1xuICAgIGNsZWFyVGltZW91dCAodGltZXIpO1xuICAgIHRpbWVyID0gc2V0VGltZW91dChjYWxsYmFjaywgbXMpO1xuICB9O1xufSkoKTtcblxuXG5cbmZ1bmN0aW9uIEZpbHRlcih0YXJnZXQpIHtcbiAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLl9kYXRhID0gZmFsc2U7XG4gIHRoaXMuX29uID0ge307XG4gIHRoaXMuX3JlbmRlcl9vcCA9IHt9O1xufVxuXG5mdW5jdGlvbiBmaWx0ZXIkMih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBGaWx0ZXIodGFyZ2V0KVxufVxuXG5GaWx0ZXIucHJvdG90eXBlID0ge1xuICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLmZpbHRlcnMtd3JhcHBlclwiLFwiZGl2XCIsdGhpcy5kYXRhKCksZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXJzLXdyYXBwZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIiwgXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctcmlnaHRcIiwgXCIyMHB4XCIpO1xuXG4gICAgICB2YXIgZmlsdGVycyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5maWx0ZXJzXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXJzXCIsdHJ1ZSk7XG4gICAgICBcbiAgICAgIHZhciBmaWx0ZXIgPSBkM19zcGxhdChmaWx0ZXJzLFwiLmZpbHRlclwiLFwiZGl2XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gaSArIHguZmllbGQgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzNweFwiKTtcblxuICAgICAgZmlsdGVyLmV4aXQoKS5yZW1vdmUoKTtcbiAgICAgIFxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgZmlsdGVyLmVhY2goZnVuY3Rpb24odixwb3MpIHtcbiAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgICBzZWxmLmZpbHRlclJvdyhkdGhpcywgc2VsZi5fZmllbGRzLCBzZWxmLl9vcHMsIHYpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHRoaXMuZmlsdGVyRm9vdGVyKHdyYXApO1xuXG4gICAgICByZXR1cm4gdGhpc1xuICAgICAgXG4gICAgfVxuICAsIG9wczogZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29wc1xuICAgICAgdGhpcy5fb3BzID0gZDtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGZpZWxkczogZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2ZpZWxkc1xuICAgICAgdGhpcy5fZmllbGRzID0gZDtcbiAgICAgIHJldHVybiB0aGlzXG4gIFx0fVxuICAsIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9kYXRhXG4gICAgICB0aGlzLl9kYXRhID0gZDtcbiAgICAgIHJldHVybiB0aGlzXG4gIFx0fVxuICAsIHRleHQ6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2ZuIHx8IGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgfVxuICAgICAgdGhpcy5fZm4gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHJlbmRlcl9vcDogZnVuY3Rpb24ob3AsZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fcmVuZGVyX29wW29wXSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgdGhpcy5fcmVuZGVyX29wW29wXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGJ1aWxkT3A6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgdmFyIG9wID0gb2JqLm9wXG4gICAgICAgICwgZmllbGQgPSBvYmouZmllbGRcbiAgICAgICAgLCB2YWx1ZSA9IG9iai52YWx1ZTtcbiAgICBcbiAgICAgIGlmICggW29wLGZpZWxkLHZhbHVlXS5pbmRleE9mKHVuZGVmaW5lZCkgPiAtMSkgcmV0dXJuIGZ1bmN0aW9uKCkge3JldHVybiB0cnVlfVxuICAgIFxuICAgICAgcmV0dXJuIHRoaXMuX29wc1tvcF0oZmllbGQsIHZhbHVlKVxuICAgIH1cbiAgLCBmaWx0ZXJSb3c6IGZ1bmN0aW9uKF9maWx0ZXIsIGZpZWxkcywgb3BzLCB2YWx1ZSkge1xuICAgIFxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgcmVtb3ZlID0gZDNfdXBkYXRlYWJsZShfZmlsdGVyLFwiLnJlbW92ZVwiLFwiYVwiKVxuICAgICAgICAuY2xhc3NlZChcInJlbW92ZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsb2F0XCIsXCJyaWdodFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuaHRtbChcIiYjMTAwMDU7XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBuZXdfZGF0YSA9IHNlbGYuZGF0YSgpLmZpbHRlcihmdW5jdGlvbihmKSB7IHJldHVybiBmICE9PSB4IH0pO1xuICAgICAgICAgIHNlbGYuZGF0YShuZXdfZGF0YSk7XG4gICAgICAgICAgc2VsZi5kcmF3KCk7XG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgIHZhciBmaWx0ZXIgPSBkM191cGRhdGVhYmxlKF9maWx0ZXIsXCIuaW5uZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImlubmVyXCIsdHJ1ZSk7XG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcInNlbGVjdC5maWVsZFwiLFwic2VsZWN0XCIsZmllbGRzKVxuICAgICAgICAuY2xhc3NlZChcImZpZWxkXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE2NXB4XCIpXG4gICAgICAgIC5vbihcImNoYW5nZVwiLCBmdW5jdGlvbih4LGkpIHtcbiAgICAgICAgICB2YWx1ZS5maWVsZCA9IHRoaXMuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhciBwb3MgPSAwO1xuICAgICAgICAgIGZpZWxkcy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICBpZiAoeCA9PSB2YWx1ZS5maWVsZCkgcG9zID0gaTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBzZWxlY3RlZCA9IG9wc1twb3NdLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSA9PSB2YWx1ZS5vcCB9KTtcbiAgICAgICAgICBpZiAoc2VsZWN0ZWQubGVuZ3RoID09IDApIHZhbHVlLm9wID0gb3BzW3Bvc11bMF0ua2V5O1xuICAgICAgICAgIC8vdmFsdWUuZm4gPSBzZWxmLmJ1aWxkT3AodmFsdWUpXG4gICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSk7XG5cbiAgICAgICAgICBcbiAgICAgICAgICBcbiAgICAgICAgICBzZWxmLmRyYXdPcHMoZmlsdGVyLCBvcHNbcG9zXSwgdmFsdWUsIHBvcyk7XG4gICAgICAgIH0pO1xuICAgICAgXG4gICAgICBkM191cGRhdGVhYmxlKHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIpXG4gICAgICAgIC5wcm9wZXJ0eShcImRpc2FibGVkXCIgLHRydWUpXG4gICAgICAgIC5wcm9wZXJ0eShcImhpZGRlblwiLCB0cnVlKVxuICAgICAgICAudGV4dChcIkZpbHRlci4uLlwiKTtcblxuICAgICAgXG4gICAgICBkM19zcGxhdChzZWxlY3QsXCJvcHRpb25cIixcIm9wdGlvblwiKVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4IH0pXG4gICAgICAgIC5hdHRyKFwic2VsZWN0ZWRcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geCA9PSB2YWx1ZS5maWVsZCA/IFwic2VsZWN0ZWRcIiA6IHVuZGVmaW5lZCB9KTtcblxuICAgICAgaWYgKHZhbHVlLm9wICYmIHZhbHVlLmZpZWxkICYmIHZhbHVlLnZhbHVlKSB7XG4gICAgICAgIHZhciBwb3MgPSBmaWVsZHMuaW5kZXhPZih2YWx1ZS5maWVsZCk7XG4gICAgICAgIHNlbGYuZHJhd09wcyhmaWx0ZXIsIG9wc1twb3NdLCB2YWx1ZSwgcG9zKTtcbiAgICAgIH1cblxuXG4gICAgfVxuICAsIGRyYXdPcHM6IGZ1bmN0aW9uKGZpbHRlciwgb3BzLCB2YWx1ZSkge1xuXG4gICAgICBcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJzZWxlY3Qub3BcIixcInNlbGVjdFwiLGZhbHNlLCBmdW5jdGlvbih4KSB7cmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcIm9wXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgdmFsdWUub3AgPSB0aGlzLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXk7XG4gICAgICAgICAgLy92YWx1ZS5mbiA9IHNlbGYuYnVpbGRPcCh2YWx1ZSlcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKTtcbiAgICAgICAgICBzZWxmLmRyYXdJbnB1dChmaWx0ZXIsIHZhbHVlLCB2YWx1ZS5vcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAvL3ZhciBkZmx0ID0gW3tcImtleVwiOlwiU2VsZWN0IE9wZXJhdGlvbi4uLlwiLFwiZGlzYWJsZWRcIjp0cnVlLFwiaGlkZGVuXCI6dHJ1ZX1dXG5cbiAgICAgIHZhciBuZXdfb3BzID0gb3BzOyAvL2RmbHQuY29uY2F0KG9wcylcblxuICAgICAgdmFsdWUub3AgPSB2YWx1ZS5vcCB8fCBuZXdfb3BzWzBdLmtleTtcblxuICAgICAgdmFyIG9wcyA9IGQzX3NwbGF0KHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIsbmV3X29wcyxmdW5jdGlvbih4KXtyZXR1cm4geC5rZXl9KVxuICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleS5zcGxpdChcIi5cIilbMF0gfSkgXG4gICAgICAgIC5hdHRyKFwic2VsZWN0ZWRcIiwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgPT0gdmFsdWUub3AgPyBcInNlbGVjdGVkXCIgOiB1bmRlZmluZWQgfSk7XG5cbiAgICAgIG9wcy5leGl0KCkucmVtb3ZlKCk7XG4gICAgICBzZWxmLmRyYXdJbnB1dChmaWx0ZXIsIHZhbHVlLCB2YWx1ZS5vcCk7XG5cbiAgICB9XG4gICwgZHJhd0lucHV0OiBmdW5jdGlvbihmaWx0ZXIsIHZhbHVlLCBvcCkge1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIudmFsdWVcIikucmVtb3ZlKCk7XG4gICAgICB2YXIgciA9IHRoaXMuX3JlbmRlcl9vcFtvcF07XG5cbiAgICAgIGlmIChyKSB7XG4gICAgICAgIHJldHVybiByLmJpbmQodGhpcykoZmlsdGVyLHZhbHVlKVxuICAgICAgfVxuXG4gICAgICBkM191cGRhdGVhYmxlKGZpbHRlcixcImlucHV0LnZhbHVlXCIsXCJpbnB1dFwiKVxuICAgICAgICAuY2xhc3NlZChcInZhbHVlXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxNTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMWVtXCIpXG5cbiAgICAgICAgLmF0dHIoXCJ2YWx1ZVwiLCB2YWx1ZS52YWx1ZSlcbiAgICAgICAgLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgdmFyIHQgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgICB0eXBld2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHQudmFsdWU7XG4gICAgICAgICAgICAvL3ZhbHVlLmZuID0gc2VsZi5idWlsZE9wKHZhbHVlKVxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSk7XG4gICAgICAgICAgfSwxMDAwKTtcbiAgICAgICAgfSk7XG4gICAgXG4gICAgfVxuICAsIGZpbHRlckZvb3RlcjogZnVuY3Rpb24od3JhcCkge1xuICAgICAgdmFyIGZvb3RlciA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5maWx0ZXItZm9vdGVyXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJmaWx0ZXItZm9vdGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIxMHB4XCIpO1xuXG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShmb290ZXIsXCIuYWRkXCIsXCJhXCIsZmFsc2UsZnVuY3Rpb24oeCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiYWRkXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLmh0bWwoXCImIzY1MjkxO1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjRweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjI0cHhcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlci1yYWRpdXNcIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxLjVweCBzb2xpZCAjNDI4QkNDXCIpXG4gICAgICAgIC5zdHlsZShcImN1cnNvclwiLFwicG9pbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuICAgICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgXG4gICAgICAgICAgdmFyIGQgPSBzZWxmLl9kYXRhO1xuICAgICAgICAgIGlmIChkLmxlbmd0aCA9PSAwIHx8IE9iamVjdC5rZXlzKGQuc2xpY2UoLTEpKS5sZW5ndGggPiAwKSBkLnB1c2goe30pO1xuICAgICAgICAgIHNlbGYuZHJhdygpO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgLCB0eXBld2F0Y2g6IHR5cGV3YXRjaFxufTtcblxuZnVuY3Rpb24gYWNjZXNzb3IkMShhdHRyLCB2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpc1tcIl9cIiArIGF0dHJdXG4gIHRoaXNbXCJfXCIgKyBhdHRyXSA9IHZhbDtcbiAgcmV0dXJuIHRoaXNcbn1cblxuZnVuY3Rpb24gRmlsdGVyRGF0YShkYXRhKSB7XG4gIHRoaXMuX2RhdGEgPSBkYXRhO1xuICB0aGlzLl9sID0gXCJvclwiO1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJfZGF0YShkYXRhKSB7XG4gIHJldHVybiBuZXcgRmlsdGVyRGF0YShkYXRhKVxufVxuXG5GaWx0ZXJEYXRhLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yJDEuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH1cbiAgLCBsb2dpYzogZnVuY3Rpb24obCkge1xuICAgICAgaWYgKGwgPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fbFxuICAgICAgdGhpcy5fbCA9IChsID09IFwiYW5kXCIpID8gXCJhbmRcIiA6IFwib3JcIjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9wOiBmdW5jdGlvbihvcCwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb3BzW29wXSB8fCB0aGlzLl9vcHNbXCJlcXVhbHNcIl07XG4gICAgICB0aGlzLl9vcHNbb3BdID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuXG4gICAgfVxuICAsIGJ5OiBmdW5jdGlvbihiKSB7XG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgICAsIGZpbHRlciA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIGlmIChiLmxlbmd0aCA9PSAwKSByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbWFzayA9IGIubWFwKGZ1bmN0aW9uKHopIHtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHZhciBzcGxpdCA9IHouZmllbGQuc3BsaXQoXCIuXCIpLCBmaWVsZCA9IHNwbGl0LnNsaWNlKC0xKVswXVxuICAgICAgICAgICAgICAgICwgb2JqID0gc3BsaXQuc2xpY2UoMCwtMSkucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcFtjXSB9LHgpXG4gICAgICAgICAgICAgICAgLCBvc3BsaXQgPSB6Lm9wLnNwbGl0KFwiLlwiKSwgb3AgPSBvc3BsaXRbMF07XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICByZXR1cm4gc2VsZi5vcChvcCkoZmllbGQsei52YWx1ZSkob2JqKVxuICAgICAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geCB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNlbGYuX2wgPT0gXCJhbmRcIikgcmV0dXJuIG1hc2subGVuZ3RoID09IGIubGVuZ3RoXG4gICAgICAgICAgICByZXR1cm4gbWFzay5sZW5ndGggPiAwXG4gICAgICAgICAgfTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHRoaXMuX2RhdGEuZmlsdGVyKGZpbHRlcilcblxuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgX29wczoge1xuICAgICAgICBcImVxdWFsc1wiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkgPT0gU3RyaW5nKHZhbHVlKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuLy8gICAgICAsIFwiY29udGFpbnNcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4vLyAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuLy8gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTFcbi8vICAgICAgICAgIH1cbi8vICAgICAgICB9XG4gICAgICAsIFwic3RhcnRzIHdpdGhcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPT0gMFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImVuZHMgd2l0aFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIChTdHJpbmcoeFtmaWVsZF0pLmxlbmd0aCAtIFN0cmluZyh2YWx1ZSkubGVuZ3RoKSA9PSBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJkb2VzIG5vdCBlcXVhbFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4W2ZpZWxkXSkgIT0gU3RyaW5nKHZhbHVlKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImlzIHNldFwiIDogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4W2ZpZWxkXSAhPSB1bmRlZmluZWQpICYmICh4W2ZpZWxkXSAhPSBcIlwiKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImlzIG5vdCBzZXRcIiA6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4W2ZpZWxkXSA9PSB1bmRlZmluZWRcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICwgXCJiZXR3ZWVuXCIgOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeFtmaWVsZF0pID49IHZhbHVlWzBdICYmIHBhcnNlSW50KHhbZmllbGRdKSA8PSB2YWx1ZVsxXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgLCBcImlzIGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkpID4gLTEgfSwgMCkgPiAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgICAgLCBcImlzIG5vdCBpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xIH0sIDApID09IDBcbiAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAsIFwiZG9lcyBub3QgY29udGFpblwiOiBmdW5jdGlvbihmaWVsZCx2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUudG9Mb3dlckNhc2UoKS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihwLHZhbHVlKSB7IHJldHVybiBwICsgU3RyaW5nKHhbZmllbGRdKS5pbmRleE9mKFN0cmluZyh2YWx1ZSkudG9Mb3dlckNhc2UoKSkgPiAtMSB9LCAwKSA9PSAwXG4gICAgICAgICAgfSBcbiAgICAgICAgfVxuICAgICAgLCBcImNvbnRhaW5zXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKS50b0xvd2VyQ2FzZSgpKSA+IC0xIH0sIDApID4gMFxuICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgdmVyc2lvbiA9IFwiMC4wLjFcIjtcblxuZXhwb3J0IHsgdmVyc2lvbiwgZmlsdGVyJDIgYXMgZmlsdGVyLCBmaWx0ZXJfZGF0YSB9O1xuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtmaWx0ZXJ9IGZyb20gJ2ZpbHRlcidcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cbmV4cG9ydCBmdW5jdGlvbiBGaWx0ZXJWaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuXG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG4gIHRoaXMuX2ZpbHRlcl9vcHRpb25zID0ge1xuICAgICAgXCJDYXRlZ29yeVwiOiBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCJcbiAgICAsIFwiVGl0bGVcIjogXCJ1cmxcIlxuICAgICwgXCJUaW1lXCI6IFwiaG91clwiXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZmlsdGVyX3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRmlsdGVyVmlldyh0YXJnZXQpXG59XG5cbkZpbHRlclZpZXcucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgbG9naWM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsb2dpY1wiLHZhbCkgXG4gICAgfVxuICAsIGNhdGVnb3JpZXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjYXRlZ29yaWVzXCIsdmFsKSBcbiAgICB9XG4gICwgZmlsdGVyczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImZpbHRlcnNcIix2YWwpIFxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIFxuICAgICAgdmFyIHdyYXBwZXIgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmZpbHRlci13cmFwXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiZmlsdGVyLXdyYXBcIix0cnVlKVxuXG4gICAgICBoZWFkZXIod3JhcHBlcilcbiAgICAgICAgLnRleHQoXCJGaWx0ZXJcIilcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICB2YXIgc3VidGl0bGUgPSBkM191cGRhdGVhYmxlKHdyYXBwZXIsIFwiLnN1YnRpdGxlLWZpbHRlclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwic3VidGl0bGUtZmlsdGVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCIgdXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCIgYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiIDMzcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiICNlM2ViZjBcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdWJ0aXRsZSxcInNwYW4uZmlyc3RcIixcInNwYW5cIilcbiAgICAgICAgLnRleHQoXCJVc2VycyBtYXRjaGluZyBcIiApXG4gICAgICAgIC5jbGFzc2VkKFwiZmlyc3RcIix0cnVlKVxuICAgIFxuICAgICAgdmFyIGZpbHRlcl90eXBlICA9IGQzX3VwZGF0ZWFibGUoc3VidGl0bGUsXCJzcGFuLm1pZGRsZVwiLFwic3BhblwiKVxuICAgICAgICAuY2xhc3NlZChcIm1pZGRsZVwiLHRydWUpXG4gICAgXG4gICAgICBzZWxlY3QoZmlsdGVyX3R5cGUpXG4gICAgICAgIC5vcHRpb25zKHRoaXMubG9naWMoKSlcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB0aGlzLmxvZ2ljKCkubWFwKGZ1bmN0aW9uKHkpIHsgXG4gICAgICAgICAgICB5LnNlbGVjdGVkID0gKHkua2V5ID09IHgua2V5KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgdGhpcy5vbihcImxvZ2ljLmNoYW5nZVwiKSh0aGlzLmxvZ2ljKCkpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgLmRyYXcoKVxuICAgICAgXG4gICAgICBkM191cGRhdGVhYmxlKHN1YnRpdGxlLFwic3Bhbi5sYXN0XCIsXCJzcGFuXCIpXG4gICAgICAgIC50ZXh0KFwiIG9mIHRoZSBmb2xsb3dpbmc6XCIpXG4gICAgICAgIC5jbGFzc2VkKFwibGFzdFwiLHRydWUpXG5cblxuICAgICAgLy8gLS0tLS0tLS0gQ0FURUdPUklFUyAtLS0tLS0tLS0gLy9cblxuICAgICAgdmFyIGNhdGVnb3JpZXMgPSB0aGlzLmNhdGVnb3JpZXMoKVxuICAgICAgdmFyIGZpbHRlcl9jaGFuZ2UgPSB0aGlzLm9uKFwiZmlsdGVyLmNoYW5nZVwiKS5iaW5kKHRoaXMpXG5cbiAgICAgIGZ1bmN0aW9uIHNlbGVjdGl6ZUlucHV0KGZpbHRlcix2YWx1ZSkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICB2YXIgc2VsZWN0ID0gZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgICAgICAucHJvcGVydHkoXCJ2YWx1ZVwiLHZhbHVlLnZhbHVlKVxuXG4gICAgICAgIGZpbHRlci5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICB2YXIgZGVzdHJveSA9IGQzLnNlbGVjdCh0aGlzKS5vbihcImRlc3Ryb3lcIilcbiAgICAgICAgICAgIGlmIChkZXN0cm95KSBkZXN0cm95KClcbiAgICAgICAgICB9KVxuXG5cbiAgICAgICAgdmFyIHMgPSAkKHNlbGVjdC5ub2RlKCkpLnNlbGVjdGl6ZSh7XG4gICAgICAgICAgcGVyc2lzdDogZmFsc2UsXG4gICAgICAgICAgY3JlYXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gKHZhbHVlLnZhbHVlID8gdmFsdWUudmFsdWUgKyBcIixcIiA6IFwiXCIpICsgeFxuICAgICAgICAgICAgc2VsZi5vbihcInVwZGF0ZVwiKShzZWxmLmRhdGEoKSlcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHZhbHVlOiB4LCB0ZXh0OiB4XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkRlbGV0ZTogZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHZhbHVlLnZhbHVlLnNwbGl0KFwiLFwiKS5maWx0ZXIoZnVuY3Rpb24oeikgeyByZXR1cm4geiAhPSB4WzBdfSkuam9pbihcIixcIilcbiAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB2YWx1ZTogeCwgdGV4dDogeFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLm9uKFwiZGVzdHJveVwiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc1swXS5zZWxlY3RpemUuZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBzZWxlY3RpemVTZWxlY3QoZmlsdGVyLHZhbHVlKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpLnJlbW92ZSgpXG5cbiAgICAgICAgZmlsdGVyLnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHZhciBkZXN0cm95ID0gZDMuc2VsZWN0KHRoaXMpLm9uKFwiZGVzdHJveVwiKVxuICAgICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICAgIH0pXG5cblxuXG4gICAgXG4gICAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZpbHRlcixcInNlbGVjdC52YWx1ZVwiLFwic2VsZWN0XCIpXG4gICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZVwiLHRydWUpXG4gICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMTBweFwiKVxuICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgICAgICAuc3R5bGUoXCJtYXgtd2lkdGhcIixcIjUwMHB4XCIpXG4gICAgICAgICAgLmF0dHIoXCJtdWx0aXBsZVwiLHRydWUpXG4gICAgICAgICAgLm9uKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSB0aGlzLnZhbHVlXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgIH0pXG4gICAgXG4gICAgICAgIGQzX3NwbGF0KHNlbGVjdCxcIm9wdGlvblwiLFwib3B0aW9uXCIsY2F0ZWdvcmllcyxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgICAgIC5hdHRyKFwic2VsZWN0ZWRcIixmdW5jdGlvbih4KSB7IHJldHVybiB2YWx1ZS52YWx1ZSAmJiB2YWx1ZS52YWx1ZS5pbmRleE9mKHgua2V5KSA+IC0xID8gXCJzZWxlY3RlZFwiIDogdW5kZWZpbmVkIH0pXG4gICAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcblxuICAgICAgICB2YXIgcyA9ICQoc2VsZWN0Lm5vZGUoKSkuc2VsZWN0aXplKHtcbiAgICAgICAgICBwZXJzaXN0OiBmYWxzZSxcbiAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgdmFsdWUudmFsdWUgPSB4LmpvaW4oXCIsXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGYuZGF0YSgpKVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBmaWx0ZXIuc2VsZWN0QWxsKFwiLnNlbGVjdGl6ZS1jb250cm9sXCIpXG4gICAgICAgICAgLm9uKFwiZGVzdHJveVwiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc1swXS5zZWxlY3RpemUuZGVzdHJveSgpXG4gICAgICAgICAgfSlcblxuXG5cbiAgICBcbiAgICAgIH1cbiAgICBcbiAgICAgIHRoaXMuX2xvZ2ljX2ZpbHRlciA9IGZpbHRlcih3cmFwcGVyKVxuICAgICAgICAuZmllbGRzKE9iamVjdC5rZXlzKHRoaXMuX2ZpbHRlcl9vcHRpb25zKSlcbiAgICAgICAgLm9wcyhbXG4gICAgICAgICAgICBbe1wia2V5XCI6IFwiaXMgaW4uY2F0ZWdvcnlcIn0se1wia2V5XCI6IFwiaXMgbm90IGluLmNhdGVnb3J5XCJ9XVxuICAgICAgICAgICwgW3tcImtleVwiOiBcImNvbnRhaW5zLnNlbGVjdGl6ZVwifSwge1wia2V5XCI6XCJkb2VzIG5vdCBjb250YWluLnNlbGVjdGl6ZVwifV1cbiAgICAgICAgICAsIFt7XCJrZXlcIjogXCJlcXVhbHNcIn0sIHtcImtleVwiOlwiYmV0d2VlblwiLFwiaW5wdXRcIjoyfV1cbiAgICAgICAgXSlcbiAgICAgICAgLmRhdGEodGhpcy5maWx0ZXJzKCkpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJjb250YWlucy5zZWxlY3RpemVcIixzZWxlY3RpemVJbnB1dClcbiAgICAgICAgLnJlbmRlcl9vcChcImRvZXMgbm90IGNvbnRhaW4uc2VsZWN0aXplXCIsc2VsZWN0aXplSW5wdXQpXG4gICAgICAgIC5yZW5kZXJfb3AoXCJpcyBpbi5jYXRlZ29yeVwiLHNlbGVjdGl6ZVNlbGVjdClcbiAgICAgICAgLnJlbmRlcl9vcChcImlzIG5vdCBpbi5jYXRlZ29yeVwiLHNlbGVjdGl6ZVNlbGVjdClcbiAgICAgICAgLnJlbmRlcl9vcChcImJldHdlZW5cIixmdW5jdGlvbihmaWx0ZXIsdmFsdWUpIHtcbiAgICAgICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBcbiAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHR5cGVvZih2YWx1ZS52YWx1ZSkgPT0gXCJvYmplY3RcIiA/IHZhbHVlLnZhbHVlIDogWzAsMjRdXG4gICAgXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJpbnB1dC52YWx1ZS5sb3dcIixcImlucHV0XCIpXG4gICAgICAgICAgICAuY2xhc3NlZChcInZhbHVlIGxvd1wiLHRydWUpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI5MHB4XCIpXG4gICAgICAgICAgICAuYXR0cihcInZhbHVlXCIsIHZhbHVlLnZhbHVlWzBdKVxuICAgICAgICAgICAgLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgIHZhciB0ID0gdGhpc1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHNlbGYudHlwZXdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlWzBdID0gdC52YWx1ZVxuICAgICAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICAgIH0sMTAwMClcbiAgICAgICAgICAgIH0pXG4gICAgXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShmaWx0ZXIsXCJzcGFuLnZhbHVlLWFuZFwiLFwic3BhblwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2YWx1ZS1hbmRcIix0cnVlKVxuICAgICAgICAgICAgLnRleHQoXCIgYW5kIFwiKVxuICAgIFxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoZmlsdGVyLFwiaW5wdXQudmFsdWUuaGlnaFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidmFsdWUgaGlnaFwiLHRydWUpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI5MHB4XCIpXG4gICAgICAgICAgICAuYXR0cihcInZhbHVlXCIsIHZhbHVlLnZhbHVlWzFdKVxuICAgICAgICAgICAgLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgIHZhciB0ID0gdGhpc1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHNlbGYudHlwZXdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlWzFdID0gdC52YWx1ZVxuICAgICAgICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICAgIH0sMTAwMClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcInVwZGF0ZVwiLGZ1bmN0aW9uKGZpbHRlcnMpe1xuICAgICAgICAgIGZpbHRlcl9jaGFuZ2UoZmlsdGVycylcbiAgICAgICAgfSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICAvL2QzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuZmlsdGVyLXdyYXAtc3BhY2VyXCIsXCJkaXZcIilcbiAgICAgIC8vICAuY2xhc3NlZChcImZpbHRlci13cmFwLXNwYWNlclwiLHRydWUpXG4gICAgICAvLyAgLnN0eWxlKFwiaGVpZ2h0XCIsd3JhcHBlci5zdHlsZShcImhlaWdodFwiKSlcblxuICAgICAgLy93cmFwcGVyXG4gICAgICAvLyAgLnN0eWxlKFwid2lkdGhcIix0aGlzLnRhcmdldC5zdHlsZShcIndpZHRoXCIpKVxuICAgICAgLy8gIC5zdHlsZShcInBvc2l0aW9uXCIsXCJmaXhlZFwiKVxuICAgICAgLy8gIC5zdHlsZShcInotaW5kZXhcIixcIjMwMFwiKVxuICAgICAgLy8gIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmMGY0ZjdcIilcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG5cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi9oZWFkZXInXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5leHBvcnQgZnVuY3Rpb24gQnV0dG9uUmFkaW8odGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge31cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYnV0dG9uX3JhZGlvKHRhcmdldCkge1xuICByZXR1cm4gbmV3IEJ1dHRvblJhZGlvKHRhcmdldClcbn1cblxuQnV0dG9uUmFkaW8ucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSBcbiAgICB9XG4gICwgb246IGZ1bmN0aW9uKGFjdGlvbiwgZm4pIHtcbiAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgICAgdGhpcy5fb25bYWN0aW9uXSA9IGZuO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24gKCkge1xuICBcbiAgICB2YXIgQ1NTX1NUUklORyA9IFN0cmluZyhmdW5jdGlvbigpIHsvKlxuICAgICAgLm9wdGlvbnMtdmlldyB7IHRleHQtYWxpZ246cmlnaHQgfVxuICAgICAgLnNob3ctYnV0dG9uIHtcbiAgICAgIHdpZHRoOiAxNTBweDtcbiAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICAgIGxpbmUtaGVpZ2h0OiA0MHB4O1xuICAgICAgYm9yZGVyLXJhZGl1czogMTVweDtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNjY2M7XG4gICAgICBmb250LXNpemU6IDEycHg7XG4gICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xuICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7XG4gICAgICBkaXNwbGF5OmlubGluZS1ibG9jaztcbiAgICAgIG1hcmdpbi1yaWdodDoxNXB4O1xuICAgICAgICB9XG4gICAgICAuc2hvdy1idXR0b246aG92ZXIgeyB0ZXh0LWRlY29yYXRpb246bm9uZTsgY29sb3I6IzU1NSB9XG4gICAgICAuc2hvdy1idXR0b24uc2VsZWN0ZWQge1xuICAgICAgICBiYWNrZ3JvdW5kOiAjZTNlYmYwO1xuICAgICAgICBjb2xvcjogIzU1NTtcbiAgICAgIH1cbiAgICAqL30pXG4gIFxuICAgIGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiaGVhZFwiKSxcInN0eWxlI3Nob3ctY3NzXCIsXCJzdHlsZVwiKVxuICAgICAgLmF0dHIoXCJpZFwiLFwiaGVhZGVyLWNzc1wiKVxuICAgICAgLnRleHQoQ1NTX1NUUklORy5yZXBsYWNlKFwiZnVuY3Rpb24gKCkgey8qXCIsXCJcIikucmVwbGFjZShcIiovfVwiLFwiXCIpKVxuICBcbiAgICB2YXIgb3B0aW9ucyA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCIuYnV0dG9uLXJhZGlvLXJvd1wiLFwiZGl2XCIpXG4gICAgICAuY2xhc3NlZChcImJ1dHRvbi1yYWRpby1yb3dcIix0cnVlKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMzVweFwiKVxuICBcbiAgXG4gICAgdmFyIGJ1dHRvbl9yb3cgPSBkM191cGRhdGVhYmxlKG9wdGlvbnMsXCIub3B0aW9ucy12aWV3XCIsXCJkaXZcIix0aGlzLmRhdGEoKSlcbiAgICAgIC5jbGFzc2VkKFwib3B0aW9ucy12aWV3XCIsdHJ1ZSlcblxuICAgIHZhciBib3VuZCA9IHRoaXMub24oXCJjbGlja1wiKS5iaW5kKHRoaXMpXG4gIFxuICAgIGQzX3NwbGF0KGJ1dHRvbl9yb3csXCIuc2hvdy1idXR0b25cIixcImFcIixpZGVudGl0eSwga2V5KVxuICAgICAgLmNsYXNzZWQoXCJzaG93LWJ1dHRvblwiLHRydWUpXG4gICAgICAuY2xhc3NlZChcInNlbGVjdGVkXCIsIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguc2VsZWN0ZWQgfSlcbiAgICAgIC50ZXh0KGtleSlcbiAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHsgYm91bmQoeCkgfSlcblxuICAgIHJldHVybiB0aGlzXG4gIFxuICAgIH1cbiAgXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcbmltcG9ydCAqIGFzIHRhYmxlIGZyb20gJ3RhYmxlJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuXG5leHBvcnQgZnVuY3Rpb24gT3B0aW9uVmlldyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7XG4gICAgc2VsZWN0OiBub29wXG4gIH1cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXRcbn1cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG9wdGlvbl92aWV3KHRhcmdldCkge1xuICByZXR1cm4gbmV3IE9wdGlvblZpZXcodGFyZ2V0KVxufVxuXG5PcHRpb25WaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9wdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJvcHRpb25zXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLm9wdGlvbi13cmFwXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJvcHRpb24td3JhcFwiLHRydWUpXG5cbiAgICAgIC8vaGVhZGVyKHdyYXApXG4gICAgICAvLyAgLnRleHQoXCJDaG9vc2UgVmlld1wiKVxuICAgICAgLy8gIC5kcmF3KClcblxuICAgICAgYnV0dG9uX3JhZGlvKHdyYXApXG4gICAgICAgIC5vbihcImNsaWNrXCIsIHRoaXMub24oXCJzZWxlY3RcIikgKVxuICAgICAgICAuZGF0YSh0aGlzLmRhdGEoKSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cblxuIiwiZXhwb3J0IGZ1bmN0aW9uIHByZXBEYXRhKGRkKSB7XG4gIHZhciBwID0gW11cbiAgZDMucmFuZ2UoMCwyNCkubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICBbXCIwXCIsXCIyMFwiLFwiNDBcIl0ubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgIGlmICh0IDwgMTApIHAucHVzaChcIjBcIiArIFN0cmluZyh0KStTdHJpbmcobSkpXG4gICAgICBlbHNlIHAucHVzaChTdHJpbmcodCkrU3RyaW5nKG0pKVxuXG4gICAgfSlcbiAgfSlcbiAgdmFyIHJvbGxlZCA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oaykgeyByZXR1cm4gay5ob3VyICsgay5taW51dGUgfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiB2LnJlZHVjZShmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgcC5hcnRpY2xlc1tjLnVybF0gPSB0cnVlXG4gICAgICAgIHAudmlld3MgKz0gYy5jb3VudFxuICAgICAgICBwLnNlc3Npb25zICs9IGMudW5pcXVlc1xuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7IGFydGljbGVzOiB7fSwgdmlld3M6IDAsIHNlc3Npb25zOiAwfSlcbiAgICB9KVxuICAgIC5lbnRyaWVzKGRkKVxuICAgIC5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgT2JqZWN0LmtleXMoeC52YWx1ZXMpLm1hcChmdW5jdGlvbih5KSB7XG4gICAgICAgIHhbeV0gPSB4LnZhbHVlc1t5XVxuICAgICAgfSlcbiAgICAgIHguYXJ0aWNsZV9jb3VudCA9IE9iamVjdC5rZXlzKHguYXJ0aWNsZXMpLmxlbmd0aFxuICAgICAgeC5ob3VyID0geC5rZXkuc2xpY2UoMCwyKVxuICAgICAgeC5taW51dGUgPSB4LmtleS5zbGljZSgyKVxuICAgICAgeC52YWx1ZSA9IHguYXJ0aWNsZV9jb3VudFxuICAgICAgeC5rZXkgPSBwLmluZGV4T2YoeC5rZXkpXG4gICAgICAvL2RlbGV0ZSB4WydhcnRpY2xlcyddXG4gICAgICByZXR1cm4geFxuICAgIH0pXG4gIHJldHVybiByb2xsZWRcbn1cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN1bW1hcnlEYXRhKGRhdGEpIHtcbiAgICAgIHZhciByZWR1Y2VkID0gZGF0YS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgICAgcC5kb21haW5zW2MuZG9tYWluXSA9IHRydWVcbiAgICAgICAgICBwLmFydGljbGVzW2MudXJsXSA9IHRydWVcbiAgICAgICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgICAgICBwLnNlc3Npb25zICs9IGMudW5pcXVlc1xuXG4gICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgfSx7XG4gICAgICAgICAgICBkb21haW5zOiB7fVxuICAgICAgICAgICwgYXJ0aWNsZXM6IHt9XG4gICAgICAgICAgLCBzZXNzaW9uczogMFxuICAgICAgICAgICwgdmlld3M6IDBcbiAgICAgICAgfSlcblxuICAgICAgcmVkdWNlZC5kb21haW5zID0gT2JqZWN0LmtleXMocmVkdWNlZC5kb21haW5zKS5sZW5ndGhcbiAgICAgIHJlZHVjZWQuYXJ0aWNsZXMgPSBPYmplY3Qua2V5cyhyZWR1Y2VkLmFydGljbGVzKS5sZW5ndGhcblxuICAgICAgcmV0dXJuIHJlZHVjZWRcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTdW1tYXJ5QWdncmVnYXRpb24oc2FtcCxwb3ApIHtcbiAgICAgIHZhciBkYXRhX3N1bW1hcnkgPSB7fVxuICAgICAgT2JqZWN0LmtleXMoc2FtcCkubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgZGF0YV9zdW1tYXJ5W2tdID0ge1xuICAgICAgICAgICAgc2FtcGxlOiBzYW1wW2tdXG4gICAgICAgICAgLCBwb3B1bGF0aW9uOiBwb3Bba11cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGRhdGFfc3VtbWFyeVxuICBcbn1cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhdGVnb3JpZXMoZGF0YSkge1xuICB2YXIgdmFsdWVzID0gZGF0YS5jYXRlZ29yeVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4ge1wia2V5XCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWUsIFwidmFsdWVcIjogeC5jb3VudCB9IH0pXG4gICAgICAgIC5zb3J0KGZ1bmN0aW9uKHAsYykge3JldHVybiBjLnZhbHVlIC0gcC52YWx1ZSB9KS5zbGljZSgwLDE1KVxuICAgICwgdG90YWwgPSB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsIHgpIHtyZXR1cm4gcCArIHgudmFsdWUgfSwgMClcblxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIkNhdGVnb3JpZXNcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHsgeC5wZXJjZW50ID0geC52YWx1ZS90b3RhbDsgcmV0dXJuIHh9KVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFRpbWVzKGRhdGEpIHtcblxuICB2YXIgaG91ciA9IGRhdGEuY3VycmVudF9ob3VyXG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBkYXRhLmRpc3BsYXlfY2F0ZWdvcmllcy52YWx1ZXNcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEuc2VsZWN0ZWQgfSlcbiAgICAubWFwKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEua2V5IH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMCkge1xuICAgIGhvdXIgPSBkYXRhLmNhdGVnb3J5X2hvdXIuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTF9KVxuICAgIGhvdXIgPSBkMy5uZXN0KClcbiAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5ob3VyIH0pXG4gICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubWludXRlIH0pXG4gICAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBcbiAgICAgICAgICBwLnVuaXF1ZXMgPSAocC51bmlxdWVzIHx8IDApICsgYy51bmlxdWVzOyBcbiAgICAgICAgICBwLmNvdW50ID0gKHAuY291bnQgfHwgMCkgKyBjLmNvdW50OyAgXG4gICAgICAgICAgcmV0dXJuIHAgfSx7fSlcbiAgICAgIH0pXG4gICAgICAuZW50cmllcyhob3VyKVxuICAgICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgICBjb25zb2xlLmxvZyh4LnZhbHVlcyk7IFxuICAgICAgICByZXR1cm4geC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsayl7IFxuICAgICAgICAgIHBbJ21pbnV0ZSddID0gcGFyc2VJbnQoay5rZXkpOyBcbiAgICAgICAgICBwWydjb3VudCddID0gay52YWx1ZXMuY291bnQ7IFxuICAgICAgICAgIHBbJ3VuaXF1ZXMnXSA9IGsudmFsdWVzLnVuaXF1ZXM7IFxuICAgICAgICAgIHJldHVybiBwIFxuICAgICAgfSwge1wiaG91clwiOngua2V5fSkgfSApXG4gIH1cblxuICB2YXIgdmFsdWVzID0gaG91clxuICAgIC5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4ge1wia2V5XCI6IHBhcnNlRmxvYXQoeC5ob3VyKSArIDEgKyB4Lm1pbnV0ZS82MCwgXCJ2YWx1ZVwiOiB4LmNvdW50IH0gfSlcblxuICByZXR1cm4ge1xuICAgICAga2V5OiBcIkJyb3dzaW5nIGJlaGF2aW9yIGJ5IHRpbWVcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXNcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUb3BpY3MoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG5cbiAgdmFyIGlkZiA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkge3JldHVybiB4LnRvcGljfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvcGljID8geC50b3BpYy50b0xvd2VyQ2FzZSgpICE9IFwibm8gdG9waWNcIiA6IHRydWUgfSlcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwia2V5XCI6eC50b3BpY1xuICAgICAgICAsIFwidmFsdWVcIjp4LmNvdW50XG4gICAgICAgICwgXCJ1bmlxdWVzXCI6IHgudW5pcXVlcyBcbiAgICAgICAgLCBcInVybFwiOiB4LnVybFxuICAgICAgfSBcbiAgICB9KVxuXG5cblxuICB2YWx1ZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXl9KVxuICAgIC5yb2xsdXAoZnVuY3Rpb24oeCkgeyBcbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LmltcG9ydGFuY2UgPSBNYXRoLmxvZyh4LnRmX2lkZilcbiAgfSlcbiAgdmFsdWVzID0gdmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRmX2lkZiAtIHAudGZfaWRmIH0pXG5cblxuICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQqeC5wZXJjZW50X3VuaXF1ZX0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IFxuICAgIHgucG9wX3BlcmNlbnQgPSAxLjAyL2dldElERih4LmtleSkqMTAwXG4gICAgeC5wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQgPT0gSW5maW5pdHkgPyAwIDogeC5wb3BfcGVyY2VudFxuXG4gICAgeC5zYW1wbGVfcGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnNhbXBsZV9wZXJjZW50fSldKVxuICAgIC5uaWNlKClcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnNhbXBsZV9wZXJjZW50X25vcm0gPSBub3JtKHguc2FtcGxlX3BlcmNlbnQpXG5cbiAgICB4LnJhdGlvID0geC5zYW1wbGVfcGVyY2VudC94LnBvcF9wZXJjZW50XG4gICAgLy94LnBlcmNlbnRfbm9ybSA9IHgucGVyY2VudFxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgVG9waWNzXCJcbiAgICAsIHZhbHVlczogdmFsdWVzLnNsaWNlKDAsMzAwKVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZERvbWFpbnMoZGF0YSkge1xuXG4gIHZhciBjYXRlZ29yaWVzID0gZGF0YS5kaXNwbGF5X2NhdGVnb3JpZXMudmFsdWVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnNlbGVjdGVkIH0pXG4gICAgLm1hcChmdW5jdGlvbihhKSB7IHJldHVybiBhLmtleSB9KVxuXG4gIHZhciBpZGYgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHtyZXR1cm4geC5kb21haW4gfSlcbiAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXS5pZGYgfSlcbiAgICAubWFwKGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJJbnRlcm5ldCAmIFRlbGVjb21cIn0pIClcblxuICB2YXIgZ2V0SURGID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoaWRmW3hdID09IFwiTkFcIikgfHwgKGlkZlt4XSA+IDg2ODYpID8gMCA6IGlkZlt4XVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGRhdGEuZnVsbF91cmxzXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBcImtleVwiOnguZG9tYWluXG4gICAgICAgICwgXCJ2YWx1ZVwiOnguY291bnRcbiAgICAgICAgLCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWVcbiAgICAgICAgLCBcInVuaXF1ZXNcIjogeC51bmlxdWVzIFxuICAgICAgICAsIFwidXJsXCI6IHgudXJsXG4gICAgICB9IFxuICAgIH0pXG5cblxuXG4gIHZhbHVlcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCl7IHJldHVybiB4LmtleX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih4KSB7IFxuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogeFswXS5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAgLCBcImtleVwiOiB4WzBdLmtleVxuICAgICAgICAgLCBcInZhbHVlXCI6IHgucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyByZXR1cm4gcCArIGMudmFsdWV9LDApXG4gICAgICAgICAsIFwicGVyY2VudF91bmlxdWVcIjogeC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzL2MudmFsdWV9LDApL3gubGVuZ3RoXG4gICAgICAgICAsIFwidXJsc1wiOiB4LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcC5pbmRleE9mKGMudXJsKSA9PSAtMSA/IHAucHVzaChjLnVybCkgOiBwOyByZXR1cm4gcCB9LFtdKVxuXG4gICAgICAgfSBcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlcykubWFwKGZ1bmN0aW9uKHgpeyByZXR1cm4geC52YWx1ZXMgfSlcblxuICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKVxuICAgIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24oeCkge3JldHVybiBjYXRlZ29yaWVzLmluZGV4T2YoeC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSkgPiAtMSB9KVxuXG4gIHZhbHVlcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudGZfaWRmID0gZ2V0SURGKHgua2V5KSAqICh4LnZhbHVlKngucGVyY2VudF91bmlxdWUpICogKHgudmFsdWUqeC5wZXJjZW50X3VuaXF1ZSkgXG4gICAgeC5jb3VudCA9IHgudmFsdWVcbiAgICB4LmltcG9ydGFuY2UgPSBNYXRoLmxvZyh4LnRmX2lkZilcbiAgfSlcbiAgdmFsdWVzID0gdmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLnRmX2lkZiAtIHAudGZfaWRmIH0pXG5cblxuICB2YXIgdG90YWwgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguY291bnQqeC5wZXJjZW50X3VuaXF1ZX0pXG5cbiAgdmFsdWVzLm1hcChmdW5jdGlvbih4KSB7IFxuICAgIHgucG9wX3BlcmNlbnQgPSAxLjAyL2dldElERih4LmtleSkqMTAwXG4gICAgeC5wb3BfcGVyY2VudCA9IHgucG9wX3BlcmNlbnQgPT0gSW5maW5pdHkgPyAwIDogeC5wb3BfcGVyY2VudFxuXG4gICAgeC5zYW1wbGVfcGVyY2VudCA9IHguY291bnQqeC5wZXJjZW50X3VuaXF1ZS90b3RhbCoxMDBcbiAgfSlcblxuICB2YXIgbm9ybSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgLnJhbmdlKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wb3BfcGVyY2VudH0pXSlcbiAgICAuZG9tYWluKFswLCBkMy5tYXgodmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnNhbXBsZV9wZXJjZW50fSldKVxuICAgIC5uaWNlKClcblxuICB2YXIgdHQgPSBkMy5zdW0odmFsdWVzLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucG9wX3BlcmNlbnQgfSlcblxuICB2YWx1ZXMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICB4LnNhbXBsZV9wZXJjZW50X25vcm0gPSBub3JtKHguc2FtcGxlX3BlcmNlbnQpXG4gICAgeC5yZWFsX3BvcF9wZXJjZW50ID0geC5wb3BfcGVyY2VudC90dCoxMDBcbiAgICB4LnJhdGlvID0geC5zYW1wbGVfcGVyY2VudC94LnJlYWxfcG9wX3BlcmNlbnRcblxuICB9KVxuXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgRG9tYWluc1wiXG4gICAgLCB2YWx1ZXM6IHZhbHVlcy5zbGljZSgwLDUwMClcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRVcmxzKGRhdGEpIHtcblxuICB2YXIgY2F0ZWdvcmllcyA9IGRhdGEuZGlzcGxheV9jYXRlZ29yaWVzLnZhbHVlc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5zZWxlY3RlZCB9KVxuICAgIC5tYXAoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS5rZXkgfSlcblxuICB2YXIgdmFsdWVzID0gZGF0YS5mdWxsX3VybHNcbiAgICAubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHtcImtleVwiOngudXJsLFwidmFsdWVcIjp4LmNvdW50LCBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCI6IHgucGFyZW50X2NhdGVnb3J5X25hbWV9IH0pXG5cbiAgaWYgKGNhdGVnb3JpZXMubGVuZ3RoID4gMClcbiAgICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKHgucGFyZW50X2NhdGVnb3J5X25hbWUpID4gLTEgfSlcblxuICB2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHgua2V5XG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cDovL1wiLFwiXCIpXG4gICAgICAgIC5yZXBsYWNlKFwiaHR0cHM6Ly9cIixcIlwiKVxuICAgICAgICAucmVwbGFjZShcInd3dy5cIixcIlwiKS5zcGxpdChcIi5cIikuc2xpY2UoMSkuam9pbihcIi5cIikuc3BsaXQoXCIvXCIpWzFdLmxlbmd0aCA+IDVcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfSkuc29ydChmdW5jdGlvbihwLGMpIHsgcmV0dXJuIGMudmFsdWUgLSBwLnZhbHVlIH0pXG5cblxuICBcbiAgcmV0dXJuIHtcbiAgICAgIGtleTogXCJUb3AgQXJ0aWNsZXNcIlxuICAgICwgdmFsdWVzOiB2YWx1ZXMuc2xpY2UoMCwxMDApXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkT25zaXRlU3VtbWFyeShkYXRhKSB7XG4gIHZhciB5ZXN0ZXJkYXkgPSBkYXRhLnRpbWVzZXJpZXNfZGF0YVswXVxuICB2YXIgdmFsdWVzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlBhZ2UgVmlld3NcIlxuICAgICAgICAgICwgXCJ2YWx1ZVwiOiB5ZXN0ZXJkYXkudmlld3NcbiAgICAgICAgfVxuICAgICAgLCB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlVuaXF1ZSBWaXNpdG9yc1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IHllc3RlcmRheS51bmlxdWVzXG5cbiAgICAgICAgfVxuICAgIF1cbiAgcmV0dXJuIHtcImtleVwiOlwiT24tc2l0ZSBBY3Rpdml0eVwiLFwidmFsdWVzXCI6dmFsdWVzfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRPZmZzaXRlU3VtbWFyeShkYXRhKSB7XG4gIHZhciB2YWx1ZXMgPSBbICBcbiAgICAgICAge1xuICAgICAgICAgICAgXCJrZXlcIjogXCJPZmYtc2l0ZSBWaWV3c1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IGRhdGEuZnVsbF91cmxzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtyZXR1cm4gcCArIGMudW5pcXVlc30sMClcbiAgICAgICAgfVxuICAgICAgLCB7XG4gICAgICAgICAgICBcImtleVwiOiBcIlVuaXF1ZSBwYWdlc1wiXG4gICAgICAgICAgLCBcInZhbHVlXCI6IE9iamVjdC5rZXlzKGRhdGEuZnVsbF91cmxzLnJlZHVjZShmdW5jdGlvbihwLGMpIHtwW2MudXJsXSA9IDA7IHJldHVybiBwIH0se30pKS5sZW5ndGhcbiAgICAgICAgfVxuICAgIF1cbiAgcmV0dXJuIHtcImtleVwiOlwiT2ZmLXNpdGUgQWN0aXZpdHlcIixcInZhbHVlc1wiOnZhbHVlc31cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWN0aW9ucyhkYXRhKSB7XG4gIFxuICByZXR1cm4ge1wia2V5XCI6XCJTZWdtZW50c1wiLFwidmFsdWVzXCI6IGRhdGEuYWN0aW9ucy5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB7XCJrZXlcIjp4LmFjdGlvbl9uYW1lLCBcInZhbHVlXCI6MCwgXCJzZWxlY3RlZFwiOiBkYXRhLmFjdGlvbl9uYW1lID09IHguYWN0aW9uX25hbWUgfSB9KX1cbn1cbiIsImltcG9ydCBhY2Nlc3NvciBmcm9tICcuL2hlbHBlcnMnXG5pbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IHthdXRvU2l6ZSBhcyBhdXRvU2l6ZX0gZnJvbSAnLi9oZWxwZXJzJ1xuaW1wb3J0IHtwcmVwRGF0YSBhcyBwfSBmcm9tICcuL2RhdGFfaGVscGVycyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmVwRGF0YSgpIHtcbiAgcmV0dXJuIHAuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufTtcblxudmFyIEVYQU1QTEVfREFUQSA9IHtcbiAgICBcImtleVwiOiBcIkJyb3dzaW5nIGJlaGF2aW9yIGJ5IHRpbWVcIlxuICAsIFwidmFsdWVzXCI6IFtcbiAgICAgIHsgIFxuICAgICAgICAgIFwia2V5XCI6IDFcbiAgICAgICAgLCBcInZhbHVlXCI6IDEyMzQ0XG4gICAgICB9XG4gICAgLCB7XG4gICAgICAgICAgXCJrZXlcIjogMlxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAyLjI1XG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuICAgICwge1xuICAgICAgICAgIFwia2V5XCI6IDIuNVxuICAgICAgICAsIFwidmFsdWVcIjogMTIzNDRcbiAgICAgIH1cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiAzXG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0XG4gICAgICB9XG5cbiAgICAsIHtcbiAgICAgICAgICBcImtleVwiOiA0XG4gICAgICAgICwgXCJ2YWx1ZVwiOiAxMjM0NFxuICAgICAgfVxuXG5cbiAgXSBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFRpbWVTZXJpZXModGFyZ2V0KSB7XG4gIHRoaXMuX3RhcmdldCA9IHRhcmdldDtcbiAgdGhpcy5fZGF0YSA9IEVYQU1QTEVfREFUQVxuICB0aGlzLl9vbiA9IHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRpbWVfc2VyaWVzKHRhcmdldCkge1xuICByZXR1cm4gbmV3IFRpbWVTZXJpZXModGFyZ2V0KVxufVxuXG5UaW1lU2VyaWVzLnByb3RvdHlwZSA9IHtcblxuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIHRpdGxlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfVxuICAsIGhlaWdodDogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVpZ2h0XCIsdmFsKSB9XG5cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3cmFwID0gdGhpcy5fdGFyZ2V0XG4gICAgICB2YXIgZGVzYyA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi52ZW5kb3ItZG9tYWlucy1iYXItZGVzY1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwidmVuZG9yLWRvbWFpbnMtYmFyLWRlc2NcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuICAgICAgICAuZGF0dW0odGhpcy5fZGF0YSlcblxuICAgICAgdmFyIHdyYXBwZXIgPSBkM191cGRhdGVhYmxlKGRlc2MsXCIud1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwid1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwJVwiKVxuXG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgXG4gICAgICBcblxuICAgICAgd3JhcHBlci5lYWNoKGZ1bmN0aW9uKHJvdyl7XG5cbiAgICAgICAgdmFyIGRhdGEgPSByb3cudmFsdWVzLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBjLmtleSAtIHAua2V5fSlcbiAgICAgICAgICAsIGNvdW50ID0gZGF0YS5sZW5ndGg7XG5cblxuICAgICAgICB2YXIgX3NpemVzID0gYXV0b1NpemUod3JhcHBlcixmdW5jdGlvbihkKXtyZXR1cm4gZCAtMTB9LCBmdW5jdGlvbihkKXtyZXR1cm4gc2VsZi5faGVpZ2h0IHx8IDYwIH0pLFxuICAgICAgICAgIGdyaWRTaXplID0gTWF0aC5mbG9vcihfc2l6ZXMud2lkdGggLyAyNCAvIDMpO1xuXG4gICAgICAgIHZhciB2YWx1ZUFjY2Vzc29yID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9XG4gICAgICAgICAgLCB2YWx1ZUFjY2Vzc29yMiA9IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudmFsdWUyIH1cbiAgICAgICAgICAsIGtleUFjY2Vzc29yID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfVxuXG4gICAgICAgIHZhciBzdGVwcyA9IEFycmF5LmFwcGx5KG51bGwsIEFycmF5KGNvdW50KSkubWFwKGZ1bmN0aW9uIChfLCBpKSB7cmV0dXJuIGkrMTt9KVxuXG4gICAgICAgIHZhciBfY29sb3JzID0gW1wiI2ZmZmZkOVwiLFwiI2VkZjhiMVwiLFwiI2M3ZTliNFwiLFwiIzdmY2RiYlwiLFwiIzQxYjZjNFwiLFwiIzFkOTFjMFwiLFwiIzIyNWVhOFwiLFwiIzI1MzQ5NFwiLFwiIzA4MWQ1OFwiXVxuICAgICAgICB2YXIgY29sb3JzID0gX2NvbG9yc1xuXG4gICAgICAgIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpLnJhbmdlKHN0ZXBzKVxuICAgICAgICAgICwgeSA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFtfc2l6ZXMuaGVpZ2h0LCAwIF0pXG5cblxuICAgICAgICB2YXIgY29sb3JTY2FsZSA9IGQzLnNjYWxlLnF1YW50aWxlKClcbiAgICAgICAgICAuZG9tYWluKFswLCBkMy5tYXgoZGF0YSwgZnVuY3Rpb24gKGQpIHsgcmV0dXJuIGQuZnJlcXVlbmN5OyB9KV0pXG4gICAgICAgICAgLnJhbmdlKGNvbG9ycyk7XG5cbiAgICAgICAgdmFyIHN2Z193cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwcGVyLFwic3ZnXCIsXCJzdmdcIilcbiAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIF9zaXplcy53aWR0aCArIF9zaXplcy5tYXJnaW4ubGVmdCArIF9zaXplcy5tYXJnaW4ucmlnaHQpXG4gICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgX3NpemVzLmhlaWdodCArIF9zaXplcy5tYXJnaW4udG9wICsgX3NpemVzLm1hcmdpbi5ib3R0b20pXG5cbiAgICAgICAgdmFyIHN2ZyA9IGQzX3NwbGF0KHN2Z193cmFwLFwiZ1wiLFwiZ1wiLGZ1bmN0aW9uKHgpIHtyZXR1cm4gW3gudmFsdWVzXX0sZnVuY3Rpb24oXyxpKSB7cmV0dXJuIGl9KVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgX3NpemVzLm1hcmdpbi5sZWZ0ICsgXCIsXCIgKyAwICsgXCIpXCIpXG5cbiAgICAgICAgeC5kb21haW4oWzAsNzJdKTtcbiAgICAgICAgeS5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBNYXRoLnNxcnQodmFsdWVBY2Nlc3NvcihkKSk7IH0pXSk7XG5cbiAgICAgICAgdmFyIGJ1aWxkQmFycyA9IGZ1bmN0aW9uKGRhdGEsa2V5QWNjZXNzb3IsdmFsdWVBY2Nlc3Nvcix5LGMpIHtcblxuICAgICAgICAgIHZhciBiYXJzID0gZDNfc3BsYXQoc3ZnLCBcIi50aW1pbmctYmFyXCIgKyBjLCBcInJlY3RcIiwgZGF0YSwga2V5QWNjZXNzb3IpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidGltaW5nLWJhclwiICsgYylcbiAgICAgICAgICAgXG4gICAgICAgICAgYmFyc1xuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuICgoa2V5QWNjZXNzb3IoZCkgLSAxKSAqIGdyaWRTaXplICk7IH0pXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGdyaWRTaXplIC0gMSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7IFxuICAgICAgICAgICAgICByZXR1cm4geShNYXRoLnNxcnQoIHZhbHVlQWNjZXNzb3IoZCkgKSk7IFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLFwiI2FhYVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gY29sb3JTY2FsZSgga2V5QWNjZXNzb3IoeCkgKyBjICkgfHwgXCJncmV5XCIgfSApXG4gICAgICAgICAgICAvLy5hdHRyKFwic3Ryb2tlXCIsXCJ3aGl0ZVwiKVxuICAgICAgICAgICAgLy8uYXR0cihcInN0cm9rZS13aWR0aFwiLFwiMXB4XCIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBfc2l6ZXMuaGVpZ2h0IC0geShNYXRoLnNxcnQoIHZhbHVlQWNjZXNzb3IoZCkgKSk7IH0pXG4gICAgICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIxXCIpXG4gICAgICAgICAgICAub24oXCJtb3VzZW92ZXJcIixmdW5jdGlvbih4KXsgXG4gICAgICAgICAgICAgIHNlbGYub24oXCJob3ZlclwiKS5iaW5kKHRoaXMpKHgpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIH1cbiAgICAgICAgXG5cbiAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5sZW5ndGggJiYgZGF0YVswXS52YWx1ZTIpIHtcbiAgICAgICAgICB2YXIgIHkyID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoW19zaXplcy5oZWlnaHQsIDAgXSlcbiAgICAgICAgICB5Mi5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBNYXRoLnNxcnQodmFsdWVBY2Nlc3NvcjIoZCkpOyB9KV0pO1xuICAgICAgICAgIGJ1aWxkQmFycyhkYXRhLGtleUFjY2Vzc29yLHZhbHVlQWNjZXNzb3IyLHkyLFwiLTJcIilcbiAgICAgICAgfVxuXG5cbiAgICAgICAgYnVpbGRCYXJzKGRhdGEsa2V5QWNjZXNzb3IsdmFsdWVBY2Nlc3Nvcix5LFwiXCIpXG4gICAgICBcbiAgICBcbiAgICAgIHZhciB6ID0gZDMudGltZS5zY2FsZSgpXG4gICAgICAgIC5yYW5nZShbMCwgZ3JpZFNpemUqMjQqM10pXG4gICAgICAgIC5uaWNlKGQzLnRpbWUuaG91ciwyNClcbiAgICAgICAgXG4gICAgXG4gICAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpXG4gICAgICAgIC5zY2FsZSh6KVxuICAgICAgICAudGlja3MoMylcbiAgICAgICAgLnRpY2tGb3JtYXQoZDMudGltZS5mb3JtYXQoXCIlSSAlcFwiKSk7XG4gICAgXG4gICAgICBzdmcuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ4IGF4aXNcIilcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLFwiICsgX3NpemVzLmhlaWdodCArIFwiKVwiKVxuICAgICAgICAgIC5jYWxsKHhBeGlzKTtcblxuXG5cbiAgICAgICAgXG4gICAgICB9KVxuXG5cbiAgICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBmdW5jdGlvbiBQaWUodGFyZ2V0KSB7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cblBpZS5wcm90b3R5cGUgPSB7XG4gICAgcmFkaXVzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwicmFkaXVzXCIsdmFsKVxuICAgIH1cbiAgLCBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuICBcbiAgICB2YXIgZCA9IGQzLmVudHJpZXMoe1xuICAgICAgICBzYW1wbGU6IHRoaXMuX2RhdGEuc2FtcGxlXG4gICAgICAsIHBvcHVsYXRpb246IHRoaXMuX2RhdGEucG9wdWxhdGlvbiAtIHRoaXMuX2RhdGEuc2FtcGxlXG4gICAgfSlcbiAgICBcbiAgICB2YXIgY29sb3IgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgICAgLnJhbmdlKFtcIiM5OGFiYzVcIiwgXCIjOGE4OWE2XCIsIFwiIzdiNjg4OFwiLCBcIiM2YjQ4NmJcIiwgXCIjYTA1ZDU2XCIsIFwiI2QwNzQzY1wiLCBcIiNmZjhjMDBcIl0pO1xuICAgIFxuICAgIHZhciBhcmMgPSBkMy5zdmcuYXJjKClcbiAgICAgICAgLm91dGVyUmFkaXVzKHRoaXMuX3JhZGl1cyAtIDEwKVxuICAgICAgICAuaW5uZXJSYWRpdXMoMCk7XG4gICAgXG4gICAgdmFyIHBpZSA9IGQzLmxheW91dC5waWUoKVxuICAgICAgICAuc29ydChudWxsKVxuICAgICAgICAudmFsdWUoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSk7XG4gICAgXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodGhpcy50YXJnZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKHgpe3JldHVybiAxfSlcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCA1MClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgNTIpXG4gIFxuICAgIHN2ZyA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiZ1wiLFwiZ1wiKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIDI1ICsgXCIsXCIgKyAyNiArIFwiKVwiKTtcbiAgICBcbiAgICB2YXIgZyA9IGQzX3NwbGF0KHN2ZyxcIi5hcmNcIixcImdcIixwaWUoZCksZnVuY3Rpb24oeCl7IHJldHVybiB4LmRhdGEua2V5IH0pXG4gICAgICAuY2xhc3NlZChcImFyY1wiLHRydWUpXG4gIFxuICAgIGQzX3VwZGF0ZWFibGUoZyxcInBhdGhcIixcInBhdGhcIilcbiAgICAgIC5hdHRyKFwiZFwiLCBhcmMpXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGNvbG9yKGQuZGF0YS5rZXkpIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHBpZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBQaWUodGFyZ2V0KVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkaWZmX2Jhcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEaWZmQmFyKHRhcmdldClcbn1cblxuLy8gZGF0YSBmb3JtYXQ6IFt7a2V5LCBub3JtYWxpemVkX2RpZmZ9LCAuLi4gXVxuXG5jbGFzcyBEaWZmQmFyIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICB0aGlzLl9rZXlfYWNjZXNzb3IgPSBcImtleVwiXG4gICAgdGhpcy5fdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcbiAgICB0aGlzLl9iYXJfaGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9iYXJfd2lkdGggPSAxNTBcbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGJhcl9oZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX2hlaWdodFwiLHZhbCkgfVxuICBiYXJfd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYmFyX3dpZHRoXCIsdmFsKSB9XG5cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIHcgPSBkM191cGRhdGVhYmxlKHRoaXMuX3RhcmdldCxcIi5kaWZmLXdyYXBcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkge3JldHVybiAxfSlcbiAgICAgIC5jbGFzc2VkKFwiZGlmZi13cmFwXCIsdHJ1ZSlcblxuICAgIGQzX3VwZGF0ZWFibGUodyxcImgzXCIsXCJoM1wiKS50ZXh0KHRoaXMuX3RpdGxlKVxuXG4gICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHcsXCIuc3ZnLXdyYXBcIixcImRpdlwiLHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmNsYXNzZWQoXCJzdmctd3JhcFwiLHRydWUpXG5cbiAgICB2YXIgayA9IHRoaXMua2V5X2FjY2Vzc29yKClcbiAgICAgICwgdiA9IHRoaXMudmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmJhcl9oZWlnaHQoKVxuICAgICAgLCBiYXJfd2lkdGggPSB0aGlzLmJhcl93aWR0aCgpXG5cbiAgICB2YXIga2V5cyA9IHRoaXMuX2RhdGEubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhba10gfSlcbiAgICAgICwgbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4geFt2XSB9KVxuICAgICAgLCBzYW1wbWF4ID0gZDMubWF4KHRoaXMuX2RhdGEsZnVuY3Rpb24oeCkgeyByZXR1cm4gLXhbdl0gfSlcblxuICAgIHZhciB4c2FtcHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLHNhbXBtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB4c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLGtleXMubGVuZ3RoXSlcbiAgICAgICAgICAucmFuZ2UoWzAsa2V5cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoe1wid2lkdGhcIjpiYXJfd2lkdGgqMywgXCJoZWlnaHRcIjoga2V5cy5sZW5ndGgqaGVpZ2h0ICsgMTB9KTtcblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ2JvdHRvbScpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuXG4gICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKTtcbiAgICB5QXhpc1xuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAuc2NhbGUoeXNjYWxlKVxuICAgICAgLnRpY2tTaXplKDIpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbihkLGkpeyByZXR1cm4ga2V5c1tpXTsgfSlcbiAgICAgIC50aWNrVmFsdWVzKGQzLnJhbmdlKGtleXMubGVuZ3RoKSk7XG5cbiAgICB2YXIgeV94aXMgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy55JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ5IGF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJhcl93aWR0aCArIGJhcl93aWR0aC8yKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwidGV4dC1hbmNob3I6IG1pZGRsZTtcIilcblxuICAgIFxuICAgIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoKjIpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuICAgIFxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTQpXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA4LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnIzM4OGUzYycpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNjYWxlKHhbdl0pIH0pXG5cbiAgICB2YXIgY2hhcnQyID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cuY2hhcnQyJywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydDJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgc2FtcGJhcnMgPSBkM19zcGxhdChjaGFydDIsXCIuc2FtcC1iYXJcIixcInJlY3RcIixmdW5jdGlvbih4KSB7IHJldHVybiB4fSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInNhbXAtYmFyXCIpXG4gICAgICAuYXR0cignaGVpZ2h0JyxoZWlnaHQtNClcbiAgICAgIC5hdHRyKHsneCc6ZnVuY3Rpb24oeCkgeyByZXR1cm4gYmFyX3dpZHRoIC0geHNhbXBzY2FsZSgteFt2XSl9LCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgOC41OyB9fSlcbiAgICAgIC5zdHlsZSgnZmlsbCcsJyNkMzJmMmYnKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhzYW1wc2NhbGUoLXhbdl0pIH0pXG5cbiAgICB5X3hpcy5leGl0KCkucmVtb3ZlKClcblxuICAgIGNoYXJ0LmV4aXQoKS5yZW1vdmUoKVxuICAgIGNoYXJ0Mi5leGl0KCkucmVtb3ZlKClcblxuICAgIGJhcnMuZXhpdCgpLnJlbW92ZSgpXG4gICAgc2FtcGJhcnMuZXhpdCgpLnJlbW92ZSgpXG5cblxuICAgIFxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBfYmFyKHRhcmdldCkge1xuICByZXR1cm4gbmV3IENvbXBCYXIodGFyZ2V0KVxufVxuXG4vLyBkYXRhIGZvcm1hdDogW3trZXksIG5vcm1hbGl6ZWRfZGlmZn0sIC4uLiBdXG5cbmNsYXNzIENvbXBCYXIge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcblxuICAgIHRoaXMuX2tleV9hY2Nlc3NvciA9IFwia2V5XCJcbiAgICB0aGlzLl9wb3BfdmFsdWVfYWNjZXNzb3IgPSBcInZhbHVlXCJcbiAgICB0aGlzLl9zYW1wX3ZhbHVlX2FjY2Vzc29yID0gXCJ2YWx1ZVwiXG5cbiAgICB0aGlzLl9iYXJfaGVpZ2h0ID0gMjBcbiAgICB0aGlzLl9iYXJfd2lkdGggPSAzMDBcbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHBvcF92YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJwb3BfdmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cbiAgc2FtcF92YWx1ZV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzYW1wX3ZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG5cbiAgYmFyX2hlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfaGVpZ2h0XCIsdmFsKSB9XG4gIGJhcl93aWR0aCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiYXJfd2lkdGhcIix2YWwpIH1cblxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuXG4gIGRyYXcoKSB7XG5cbiAgICB2YXIgdyA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwiLmNvbXAtd3JhcFwiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7cmV0dXJuIDF9KVxuICAgICAgLmNsYXNzZWQoXCJjb21wLXdyYXBcIix0cnVlKVxuXG4gICAgZDNfdXBkYXRlYWJsZSh3LFwiaDNcIixcImgzXCIpLnRleHQodGhpcy5fdGl0bGUpXG5cbiAgICB2YXIgd3JhcCA9IGQzX3VwZGF0ZWFibGUodyxcIi5zdmctd3JhcFwiLFwiZGl2XCIsdGhpcy5fZGF0YSxmdW5jdGlvbih4KSB7IHJldHVybiAxIH0pXG4gICAgICAuY2xhc3NlZChcInN2Zy13cmFwXCIsdHJ1ZSlcblxuICAgIHZhciBrID0gdGhpcy5rZXlfYWNjZXNzb3IoKVxuICAgICAgLCBwID0gdGhpcy5wb3BfdmFsdWVfYWNjZXNzb3IoKVxuICAgICAgLCBzID0gdGhpcy5zYW1wX3ZhbHVlX2FjY2Vzc29yKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5iYXJfaGVpZ2h0KClcbiAgICAgICwgYmFyX3dpZHRoID0gdGhpcy5iYXJfd2lkdGgoKVxuXG4gICAgdmFyIGtleXMgPSB0aGlzLl9kYXRhLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4W2tdIH0pXG4gICAgICAsIG1heCA9IGQzLm1heCh0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbcF0gfSlcbiAgICAgICwgc2FtcG1heCA9IGQzLm1heCh0aGlzLl9kYXRhLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHhbc10gfSlcblxuICAgIHZhciB4c2FtcHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLHNhbXBtYXhdKVxuICAgICAgICAgIC5yYW5nZShbMCxiYXJfd2lkdGhdKVxuICAgICAgLCB4c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgIC5kb21haW4oWzAsbWF4XSlcbiAgICAgICAgICAucmFuZ2UoWzAsYmFyX3dpZHRoXSlcbiAgICAgICwgeXNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAuZG9tYWluKFswLGtleXMubGVuZ3RoXSlcbiAgICAgICAgICAucmFuZ2UoWzAsa2V5cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLmF0dHIoe1wid2lkdGhcIjpiYXJfd2lkdGgrYmFyX3dpZHRoLzIsIFwiaGVpZ2h0XCI6IGtleXMubGVuZ3RoKmhlaWdodCArIDEwfSk7XG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCdib3R0b20nKVxuICAgICAgLnNjYWxlKHhzY2FsZSlcblxuICAgIHZhciB5QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeUF4aXNcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLnNjYWxlKHlzY2FsZSlcbiAgICAgIC50aWNrU2l6ZSgyKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oZCxpKXsgcmV0dXJuIGtleXNbaV07IH0pXG4gICAgICAudGlja1ZhbHVlcyhkMy5yYW5nZShrZXlzLmxlbmd0aCkpO1xuXG4gICAgdmFyIHlfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieSBheGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChiYXJfd2lkdGgvMikgKyBcIiwxNSlcIilcbiAgICAgIC5hdHRyKCdpZCcsJ3lheGlzJylcbiAgICAgIC5jYWxsKHlBeGlzKTtcblxuICAgIHlfeGlzLnNlbGVjdEFsbChcInRleHRcIilcblxuICAgIFxuICAgIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjaGFydFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYmFyX3dpZHRoLzIpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuICAgIFxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTIpXG4gICAgICAuYXR0cih7J3gnOjAsJ3knOmZ1bmN0aW9uKGQsaSl7IHJldHVybiB5c2NhbGUoaSkgKyA3LjU7IH19KVxuICAgICAgLnN0eWxlKCdmaWxsJywnZ3JheScpXG4gICAgICAuYXR0cihcIndpZHRoXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geHNjYWxlKHhbcF0pIH0pXG5cblxuICAgIHZhciBzYW1wYmFycyA9IGQzX3NwbGF0KGNoYXJ0LFwiLnNhbXAtYmFyXCIsXCJyZWN0XCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJzYW1wLWJhclwiKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTEwKVxuICAgICAgLmF0dHIoeyd4JzowLCd5JzpmdW5jdGlvbihkLGkpeyByZXR1cm4geXNjYWxlKGkpICsgMTEuNTsgfX0pXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCcjMDgxZDU4JylcbiAgICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiB4c2FtcHNjYWxlKHhbc10gfHwgMCkgfSlcblxuICAgIHlfeGlzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgY2hhcnQuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICBiYXJzLmV4aXQoKS5yZW1vdmUoKVxuICAgIHNhbXBiYXJzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb21wX2J1YmJsZSh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBDb21wQnViYmxlKHRhcmdldClcbn1cblxuLy8gZGF0YSBmb3JtYXQ6IFt7a2V5LCBub3JtYWxpemVkX2RpZmZ9LCAuLi4gXVxuXG5jbGFzcyBDb21wQnViYmxlIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICB0aGlzLl9rZXlfYWNjZXNzb3IgPSBcImtleVwiXG5cbiAgICB0aGlzLl9oZWlnaHQgPSAyMFxuICAgIHRoaXMuX3NwYWNlID0gMTRcbiAgICB0aGlzLl9taWRkbGUgPSAxODBcbiAgICB0aGlzLl9sZWdlbmRfd2lkdGggPSA4MFxuXG4gICAgdGhpcy5fYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG4gICAgdGhpcy5fcm93cyA9IFtdXG5cblxuICB9IFxuXG4gIGtleV9hY2Nlc3Nvcih2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJrZXlfYWNjZXNzb3JcIix2YWwpIH1cbiAgdmFsdWVfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidmFsdWVfYWNjZXNzb3JcIix2YWwpIH1cblxuICBoZWlnaHQodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiaGVpZ2h0XCIsdmFsKSB9XG4gIHNwYWNlKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNwYWNlXCIsdmFsKSB9XG4gIG1pZGRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJtaWRkbGVcIix2YWwpIH1cbiAgYnVja2V0cyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJidWNrZXRzXCIsdmFsKSB9XG5cbiAgcm93cyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyb3dzXCIsdmFsKSB9XG4gIGFmdGVyKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFmdGVyXCIsdmFsKSB9XG5cblxuXG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuICB0aXRsZSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ0aXRsZVwiLHZhbCkgfSBcblxuICBidWlsZFNjYWxlcygpIHtcblxuICAgIHZhciByb3dzID0gdGhpcy5yb3dzKClcbiAgICAgICwgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpXG5cbiAgICB0aGlzLl95c2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbMCxyb3dzLmxlbmd0aF0pXG4gICAgICAucmFuZ2UoWzAscm93cy5sZW5ndGgqaGVpZ2h0XSk7XG5cbiAgICB0aGlzLl94c2NhbGUgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cylcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpLChoZWlnaHQrc3BhY2UpKSk7XG5cbiAgICB0aGlzLl94c2NhbGVyZXZlcnNlID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMucmV2ZXJzZSgpKVxuICAgICAgLnJhbmdlKGQzLnJhbmdlKDAsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSksKGhlaWdodCtzcGFjZSkpKTtcblxuICAgIHRoaXMuX3JzY2FsZSA9IGQzLnNjYWxlLnBvdygpXG4gICAgICAuZXhwb25lbnQoMC41KVxuICAgICAgLmRvbWFpbihbMCwxXSlcbiAgICAgIC5yYW5nZShbLjM1LDFdKVxuICAgIFxuICAgIHRoaXMuX29zY2FsZSA9IGQzLnNjYWxlLnF1YW50aXplKClcbiAgICAgIC5kb21haW4oWy0xLDFdKVxuICAgICAgLnJhbmdlKFsnI2Y3ZmJmZicsJyNkZWViZjcnLCcjYzZkYmVmJywnIzllY2FlMScsJyM2YmFlZDYnLCcjNDI5MmM2JywnIzIxNzFiNScsJyMwODUxOWMnLCcjMDgzMDZiJ10pXG4gICAgXG4gIH1cblxuICBkcmF3TGVnZW5kKCkge1xuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNcbiAgICAgICwgYnVja2V0cyA9IHRoaXMuYnVja2V0cygpXG4gICAgICAsIGhlaWdodCA9IHRoaXMuaGVpZ2h0KCksIHNwYWNlID0gdGhpcy5zcGFjZSgpLCBtaWRkbGUgPSB0aGlzLm1pZGRsZSgpLCBsZWdlbmR0dyA9IHRoaXMuX2xlZ2VuZF93aWR0aFxuICAgICAgLCByc2NhbGUgPSB0aGlzLl9yc2NhbGUsIG9zY2FsZSA9IHRoaXMuX29zY2FsZTtcblxuICAgIHZhciBsZWdlbmQgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5sZWdlbmQnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlZ2VuZFwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSoyK21pZGRsZS0zMTApICsgXCIsLTEzMClcIilcblxuICAgIHZhciBzaXplID0gZDNfdXBkYXRlYWJsZShsZWdlbmQsJ2cuc2l6ZScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwic2l6ZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArIChsZWdlbmR0dysxMCkgKyBcIiwwKVwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlIGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dylcbiAgICAgIC5odG1sKFwibW9yZSBhY3Rpdml0eVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpIFxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubW9yZS1hcnJvd1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibW9yZS1hcnJvdyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwtbGVnZW5kdHctMTApXG4gICAgICAuaHRtbChcIiYjOTY2NDtcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKSBcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG5cblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzc1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuaHRtbChcImxlc3MgYWN0aXZpdHlcIilcbiAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIikuc3R5bGUoXCJmb250LXNpemVcIixcIi42ZW1cIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5sZXNzLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJsZXNzLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLChoZWlnaHQrNCkqNStsZWdlbmR0dysxMClcbiAgICAgIC5odG1sKFwiJiM5NjU0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIikgXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cbiAgICBkM19zcGxhdChzaXplLFwiY2lyY2xlXCIsXCJjaXJjbGVcIixbMSwuNiwuMywuMSwwXSlcbiAgICAgIC5hdHRyKFwiclwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIChoZWlnaHQtMikvMipyc2NhbGUoeCkgfSlcbiAgICAgIC5hdHRyKCdjeCcsIGZ1bmN0aW9uKGQsaSkgeyByZXR1cm4gKGhlaWdodCs0KSppK2hlaWdodC8yfSlcbiAgICAgIC5hdHRyKCdzdHJva2UnLCAnZ3JleScpXG4gICAgICAuYXR0cignZmlsbCcsICdub25lJylcblxuXG4gICAgXG5cblxuICAgIHZhciBzaXplID0gZDNfdXBkYXRlYWJsZShsZWdlbmQsJ2cuaW1wb3J0YW5jZScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiaW1wb3J0YW5jZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIisgKGxlZ2VuZHR3KzEwKSArXCIsMjUpXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lm1vcmVcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcIm1vcmUgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsLWxlZ2VuZHR3KVxuICAgICAgLmh0bWwoXCJtb3JlIGltcG9ydGFudFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzaXplLFwidGV4dC5tb3JlLWFycm93XCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJtb3JlLWFycm93IGF4aXNcIilcbiAgICAgIC5hdHRyKFwieFwiLC1sZWdlbmR0dy0xMClcbiAgICAgIC5odG1sKFwiJiM5NjY0O1wiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKS5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjZlbVwiKS5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIi43ZW1cIikgXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIFwiY2VudHJhbFwiKVxuXG5cblxuICAgIGQzX3VwZGF0ZWFibGUoc2l6ZSxcInRleHQubGVzc1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibGVzcyBheGlzXCIpXG4gICAgICAuYXR0cihcInhcIiwoaGVpZ2h0KzQpKjUrbGVnZW5kdHcpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuaHRtbChcImxlc3MgaW1wb3J0YW50XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHNpemUsXCJ0ZXh0Lmxlc3MtYXJyb3dcIixcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImxlc3MtYXJyb3cgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ4XCIsKGhlaWdodCs0KSo1K2xlZ2VuZHR3KzEwKVxuICAgICAgLmh0bWwoXCImIzk2NTQ7XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuNmVtXCIpLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiLjdlbVwiKVxuICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcblxuXG4gICAgZDNfc3BsYXQoc2l6ZSxcImNpcmNsZVwiLFwiY2lyY2xlXCIsWzEsLjc1LC41LC4yNSwwXSlcbiAgICAgIC5hdHRyKFwiclwiLGhlaWdodC8yLTIpXG4gICAgICAuYXR0cihcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBvc2NhbGUoeCkgfSlcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHJzY2FsZSh4LzIgKyAuMikgfSlcbiAgICAgIC5hdHRyKCdjeCcsIGZ1bmN0aW9uKGQsaSkgeyByZXR1cm4gKGhlaWdodCs0KSppK2hlaWdodC8yIH0pXG4gXG4gIH1cblxuICBkcmF3QXhlcygpIHtcbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzXG4gICAgICAsIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMoKVxuICAgICAgLCBoZWlnaHQgPSB0aGlzLmhlaWdodCgpLCBzcGFjZSA9IHRoaXMuc3BhY2UoKSwgbWlkZGxlID0gdGhpcy5taWRkbGUoKSwgbGVnZW5kdHcgPSB0aGlzLl9sZWdlbmRfd2lkdGhcbiAgICAgICwgcnNjYWxlID0gdGhpcy5fcnNjYWxlLCBvc2NhbGUgPSB0aGlzLl9vc2NhbGUgXG4gICAgICAsIHhzY2FsZSA9IHRoaXMuX3hzY2FsZSwgeXNjYWxlID0gdGhpcy5feXNjYWxlXG4gICAgICAsIHhzY2FsZXJldmVyc2UgPSB0aGlzLl94c2NhbGVyZXZlcnNlXG4gICAgICAsIHJvd3MgPSB0aGlzLl9yb3dzXG5cbiAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICAgIHhBeGlzXG4gICAgICAub3JpZW50KCd0b3AnKVxuICAgICAgLnNjYWxlKHhzY2FsZXJldmVyc2UpXG4gICAgICAudGlja0Zvcm1hdChmdW5jdGlvbih4KSB7IFxuICAgICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgICBpZiAoeCA8IDM2MDApIHJldHVybiB4LzYwICsgXCIgbWluc1wiIFxuXG4gICAgICAgIGlmICh4ID09IDg2NDAwKSByZXR1cm4gXCIxIGRheVwiXG4gICAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICAgIHJldHVybiB4LzM2MDAgKyBcIiBob3Vyc1wiXG4gICAgICB9KVxuXG4gICAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueC5iZWZvcmUnLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInggYXhpcyBiZWZvcmVcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGhlaWdodCArIHNwYWNlKSsgXCIsLTQpXCIpXG4gICAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgICAuY2FsbCh4QXhpcyk7XG5cbiAgICAgICAgICBcbiAgICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInlcIiwgLTgpXG4gICAgICAuYXR0cihcInhcIiwgLTgpXG4gICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKDQ1KVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFja1wiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrOyBkaXNwbGF5OmluaGVyaXRcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoeF94aXMsXCJ0ZXh0LnRpdGxlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgICAgLmF0dHIoXCJ4XCIsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkvMiAtIGhlaWdodCtzcGFjZSApXG4gICAgICAuYXR0cihcInlcIiwtNTMpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLHVuZGVmaW5lZClcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLCBcInVwcGVyY2FzZVwiKVxuICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXG4gICAgICAudGV4dChcImJlZm9yZSBhcnJpdmluZ1wiKVxuXG5cblxuICAgIHZhciB4QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeEF4aXNcbiAgICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgICAuc2NhbGUoeHNjYWxlKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oeCkgeyBcbiAgICAgICAgaWYgKHggPT0gMzYwMCkgcmV0dXJuIFwiMSBob3VyXCJcbiAgICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgICBpZiAoeCA9PSA4NjQwMCkgcmV0dXJuIFwiMSBkYXlcIlxuICAgICAgICBpZiAoeCA+IDg2NDAwKSByZXR1cm4geC84NjQwMCArIFwiIGRheXNcIiBcblxuICAgICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgICAgfSlcblxuICAgIHZhciB4X3hpcyA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLnguYWZ0ZXInLCdnJylcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInggYXhpcyBhZnRlclwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkrbWlkZGxlKSArIFwiLDApXCIpXG4gICAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgICAuY2FsbCh4QXhpcyk7XG4gICAgXG4gICAgeF94aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJ5XCIsIC04KVxuICAgICAgLmF0dHIoXCJ4XCIsIDgpXG4gICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKC00NSlcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwic3RhcnRcIilcblxuICAgIHhfeGlzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFja1wiKVxuXG4gICAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrOyBkaXNwbGF5OmluaGVyaXRcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoeF94aXMsXCJ0ZXh0LnRpdGxlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgICAgLmF0dHIoXCJ4XCIsYnVja2V0cy5sZW5ndGgqKGhlaWdodCtzcGFjZSkvMiAgKVxuICAgICAgLmF0dHIoXCJ5XCIsLTUzKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIix1bmRlZmluZWQpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgLnRleHQoXCJhZnRlciBsZWF2aW5nXCIpXG5cblxuICAgIHZhciB5QXhpcyA9IGQzLnN2Zy5heGlzKCk7XG4gICAgeUF4aXNcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLnNjYWxlKHlzY2FsZSlcbiAgICAgIC50aWNrU2l6ZSgyKVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oZCxpKXsgcmV0dXJuIHJvd3NbaV0ua2V5OyB9KVxuICAgICAgLnRpY2tWYWx1ZXMoZDMucmFuZ2Uocm93cy5sZW5ndGgpKTtcblxuXG4gICAgXG4gICAgdmFyIHlfeGlzID0gZDNfdXBkYXRlYWJsZShjYW52YXMsJ2cueScsJ2cnKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwieSBheGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChidWNrZXRzLmxlbmd0aCooaGVpZ2h0K3NwYWNlKSswKSArIFwiLDE1KVwiKVxuICAgICAgLmF0dHIoJ2lkJywneWF4aXMnKVxuXG5cbiAgICB5X3hpc1xuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgeV94aXMuc2VsZWN0QWxsKFwibGluZVwiKVxuICAgICAgLmF0dHIoXCJ4MlwiLDE4KVxuICAgICAgLmF0dHIoXCJ4MVwiLDIyKVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLFwiMFwiKVxuICAgICAgLnJlbW92ZSgpXG5cblxuICAgIHlfeGlzLnNlbGVjdEFsbChcInBhdGhcIilcbiAgICAgIC5hdHRyKFwieDJcIiwxOClcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMTgsMClcIikgXG4gICAgICAvLy5zdHlsZShcInN0cm9rZVwiLFwiYmxhY2tcIilcblxuXG5cbiAgICAgIC8vLnJlbW92ZSgpXG5cbiAgICBcbiAgICB5X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsXCJ0ZXh0LWFuY2hvcjogbWlkZGxlOyBmb250LXdlaWdodDpib2xkOyBmaWxsOiAjMzMzXCIpXG4gICAgICAuYXR0cihcInhcIixtaWRkbGUvMilcblxuXG5cblxuICB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBidWNrZXRzID0gdGhpcy5idWNrZXRzKClcbiAgICAgICwgaGVpZ2h0ID0gdGhpcy5oZWlnaHQoKSwgc3BhY2UgPSB0aGlzLnNwYWNlKCksIG1pZGRsZSA9IHRoaXMubWlkZGxlKCksIGxlZ2VuZHR3ID0gdGhpcy5fbGVnZW5kX3dpZHRoXG4gICAgICAsIHJvd3MgPSB0aGlzLnJvd3MoKVxuXG4gICAgdmFyIHN2ZyA9IGQzX3VwZGF0ZWFibGUodGhpcy5fdGFyZ2V0LFwic3ZnXCIsXCJzdmdcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIi01cHhcIilcbiAgICAgIC5hdHRyKHsnd2lkdGgnOmJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpKjIrbWlkZGxlLCdoZWlnaHQnOnJvd3MubGVuZ3RoKmhlaWdodCArIDE2NX0pXG4gICAgICAuYXR0cihcInhtbG5zXCIsIFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIilcblxuICAgIHRoaXMuX3N2ZyA9IHN2Z1xuXG4gICAgdGhpcy5fY2FudmFzID0gZDNfdXBkYXRlYWJsZShzdmcsXCIuY2FudmFzXCIsXCJnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJjYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMTQwKVwiKVxuXG5cblxuICAgIHRoaXMuYnVpbGRTY2FsZXMoKVxuICAgIHRoaXMuZHJhd0xlZ2VuZCgpXG4gICAgdGhpcy5kcmF3QXhlcygpXG5cbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzXG4gICAgICAsIHJzY2FsZSA9IHRoaXMuX3JzY2FsZSwgb3NjYWxlID0gdGhpcy5fb3NjYWxlIFxuICAgICAgLCB4c2NhbGUgPSB0aGlzLl94c2NhbGUsIHlzY2FsZSA9IHRoaXMuX3lzY2FsZVxuICAgICAgLCB4c2NhbGVyZXZlcnNlID0gdGhpcy5feHNjYWxlcmV2ZXJzZVxuICAgICAgLCByb3dzID0gdGhpcy5yb3dzKClcblxuXG4gICAgdmFyIGNoYXJ0X2JlZm9yZSA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0LWJlZm9yZScsJ2cnLHRoaXMucm93cygpLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnQtYmVmb3JlXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpICsgXCIsMClcIilcbiAgICAgIC5hdHRyKCdpZCcsJ2JhcnMnKVxuXG5cbiAgICB2YXIgcm93cyA9IGQzX3NwbGF0KGNoYXJ0X2JlZm9yZSxcIi5yb3dcIixcImdcIixmdW5jdGlvbih4KSB7IHJldHVybiB4IH0sIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5IH0pXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJyb3dcIilcbiAgICAgIC5hdHRyKHsndHJhbnNmb3JtJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gXCJ0cmFuc2xhdGUoMCxcIiArICh5c2NhbGUoaSkgKyA3LjUpICsgXCIpXCI7IH0gfSlcbiAgICAgIC5hdHRyKHsnbGFiZWwnOmZ1bmN0aW9uKGQsaSl7IHJldHVybiBkLmtleTsgfSB9KVxuXG4gICAgcm93cy5leGl0KCkucmVtb3ZlKClcblxuICAgIHZhciBiYXJzID0gZDNfc3BsYXQocm93cyxcIi5wb3AtYmFyXCIsXCJjaXJjbGVcIixmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlcyB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicG9wLWJhclwiKVxuICAgICAgLmF0dHIoJ2N5JywoaGVpZ2h0LTIpLzIpXG4gICAgICAuYXR0cih7J2N4JzpmdW5jdGlvbihkLGkpIHsgcmV0dXJuIC14c2NhbGUoZC5rZXkpfX0pXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIixcIi44XCIpXG4gICAgICAuYXR0cihcInJcIixmdW5jdGlvbih4KSB7IHJldHVybiAoaGVpZ2h0KS8yICogcnNjYWxlKHgubm9ybV90aW1lKSB9KSBcbiAgICAgIC5zdHlsZShcImZpbGxcIixmdW5jdGlvbih4KSB7IHJldHVybiBvc2NhbGUoeC5wZXJjZW50X2RpZmYpIH0pXG5cbiAgICB2YXIgY2hhcnRfYWZ0ZXIgPSBkM191cGRhdGVhYmxlKGNhbnZhcywnZy5jaGFydC1hZnRlcicsJ2cnLHRoaXMuX2FmdGVyLGZ1bmN0aW9uKCkgeyByZXR1cm4gMSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnQtYWZ0ZXJcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGJ1Y2tldHMubGVuZ3RoKihoZWlnaHQrc3BhY2UpK21pZGRsZSkgKyBcIiwwKVwiKVxuICAgICAgLmF0dHIoJ2lkJywnYmFycycpXG5cblxuICAgIHZhciByb3dzID0gZDNfc3BsYXQoY2hhcnRfYWZ0ZXIsXCIucm93XCIsXCJnXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LCBmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwicm93XCIpXG4gICAgICAuYXR0cih7J3RyYW5zZm9ybSc6ZnVuY3Rpb24oZCxpKXsgcmV0dXJuIFwidHJhbnNsYXRlKDAsXCIgKyAoeXNjYWxlKGkpICsgNy41KSArIFwiKVwiOyB9IH0pXG4gICAgICAuYXR0cih7J2xhYmVsJzpmdW5jdGlvbihkLGkpeyByZXR1cm4gZC5rZXk7IH0gfSlcblxuICAgIHJvd3MuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYmFycyA9IGQzX3NwbGF0KHJvd3MsXCIucG9wLWJhclwiLFwiY2lyY2xlXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZXMgfSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcInBvcC1iYXJcIilcbiAgICAgIC5hdHRyKCdjeScsKGhlaWdodC0yKS8yKVxuICAgICAgLmF0dHIoeydjeCc6ZnVuY3Rpb24oZCxpKSB7IHJldHVybiB4c2NhbGUoZC5rZXkpfX0pXG4gICAgICAuYXR0cihcInJcIixmdW5jdGlvbih4KSB7IHJldHVybiAoaGVpZ2h0LTIpLzIgKiByc2NhbGUoeC5ub3JtX3RpbWUpIH0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4gb3NjYWxlKHgucGVyY2VudF9kaWZmKSB9KVxuICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsXCIuOFwiKVxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN0cmVhbV9wbG90KHRhcmdldCkge1xuICByZXR1cm4gbmV3IFN0cmVhbVBsb3QodGFyZ2V0KVxufVxuXG5mdW5jdGlvbiBkcmF3QXhpcyh0YXJnZXQsc2NhbGUsdGV4dCx3aWR0aCkge1xuICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpO1xuICB4QXhpc1xuICAgIC5vcmllbnQoJ3RvcCcpXG4gICAgLnNjYWxlKHNjYWxlKVxuICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKHgpIHsgXG4gICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhvdXJcIlxuICAgICAgaWYgKHggPCAzNjAwKSByZXR1cm4geC82MCArIFwiIG1pbnNcIiBcblxuICAgICAgaWYgKHggPT0gODY0MDApIHJldHVybiBcIjEgZGF5XCJcbiAgICAgIGlmICh4ID4gODY0MDApIHJldHVybiB4Lzg2NDAwICsgXCIgZGF5c1wiIFxuXG4gICAgICByZXR1cm4geC8zNjAwICsgXCIgaG91cnNcIlxuICAgIH0pXG5cbiAgdmFyIHhfeGlzID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsJ2cueC5iZWZvcmUnLCdnJylcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ4IGF4aXMgYmVmb3JlXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwtNSlcIilcbiAgICAuYXR0cignaWQnLCd4YXhpcycpXG4gICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgICAgIFxuICB4X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgLmF0dHIoXCJ5XCIsIC0yNSlcbiAgICAuYXR0cihcInhcIiwgMTUpXG4gICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoNDUpXCIpXG4gICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcblxuICB4X3hpcy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgLmF0dHIoXCJzdHlsZVwiLFwic3Ryb2tlOmJsYWNrXCIpXG5cbiAgeF94aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgIC5hdHRyKFwic3R5bGVcIixcInN0cm9rZTpibGFjazsgZGlzcGxheTppbmhlcml0XCIpXG5cbiAgZDNfdXBkYXRlYWJsZSh4X3hpcyxcInRleHQudGl0bGVcIixcInRleHRcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJ0aXRsZVwiKVxuICAgIC5hdHRyKFwieFwiLHdpZHRoLzIpXG4gICAgLmF0dHIoXCJ5XCIsLTQ2KVxuICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsdW5kZWZpbmVkKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIiwgXCJ1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcbiAgICAudGV4dCh0ZXh0ICsgXCIgXCIpXG5cbiAgcmV0dXJuIHhfeGlzXG5cbn1cblxuXG5jbGFzcyBTdHJlYW1QbG90IHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICAgIHRoaXMuX2J1Y2tldHMgPSBbMCwxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG5cbiAgICB0aGlzLl93aWR0aCA9IDM3MFxuICAgIHRoaXMuX2hlaWdodCA9IDI1MFxuICAgIHRoaXMuX2NvbG9yID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAucmFuZ2UoXG5bJyM5OTknLCcjYWFhJywnI2JiYicsJyNjY2MnLCcjZGRkJywnI2RlZWJmNycsJyNjNmRiZWYnLCcjOWVjYWUxJywnIzZiYWVkNicsJyM0MjkyYzYnLCcjMjE3MWI1JywncmdiYSgzMywgMTEzLCAxODEsLjkpJywncmdiYSg4LCA4MSwgMTU2LC45MSknLCcjMDg1MTljJywncmdiYSg4LCA0OCwgMTA3LC45KScsJyMwODMwNmInXS5yZXZlcnNlKCkpXG5cbiAgfSBcblxuICBrZXlfYWNjZXNzb3IodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5X2FjY2Vzc29yXCIsdmFsKSB9XG4gIHZhbHVlX2FjY2Vzc29yKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZhbHVlX2FjY2Vzc29yXCIsdmFsKSB9XG4gIGhlaWdodCh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJoZWlnaHRcIix2YWwpIH1cbiAgd2lkdGgodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwid2lkdGhcIix2YWwpIH1cblxuXG4gIGRhdGEodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgfSBcbiAgdGl0bGUodmFsKSB7IHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGl0bGVcIix2YWwpIH0gXG5cblxuICBkcmF3KCkge1xuXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgICAsIG9yZGVyID0gZGF0YS5vcmRlclxuICAgICAgLCBidWNrZXRzID0gdGhpcy5fYnVja2V0c1xuICAgICAgLCBiZWZvcmVfc3RhY2tlZCA9IGRhdGEuYmVmb3JlX3N0YWNrZWRcbiAgICAgICwgYWZ0ZXJfc3RhY2tlZCA9IGRhdGEuYWZ0ZXJfc3RhY2tlZFxuICAgICAgLCBoZWlnaHQgPSB0aGlzLl9oZWlnaHRcbiAgICAgICwgd2lkdGggPSB0aGlzLl93aWR0aFxuICAgICAgLCB0YXJnZXQgPSB0aGlzLl90YXJnZXRcbiAgICAgICwgY29sb3IgPSB0aGlzLl9jb2xvclxuICAgICAgLCBzZWxmID0gdGhpc1xuXG4gICAgY29sb3IuZG9tYWluKG9yZGVyKVxuXG4gICAgdmFyIHkgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLnJhbmdlKFtoZWlnaHQsMF0pXG4gICAgICAuZG9tYWluKFswLGQzLm1heChiZWZvcmVfc3RhY2tlZCwgZnVuY3Rpb24obGF5ZXIpIHsgcmV0dXJuIGQzLm1heChsYXllcixmdW5jdGlvbihkKSB7cmV0dXJuIGQueTAgKyBkLnkgfSl9KV0pXG4gIFxuICAgIHZhciB4ID0gZDMuc2NhbGUub3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGJ1Y2tldHMpXG4gICAgICAucmFuZ2UoZDMucmFuZ2UoMCx3aWR0aCx3aWR0aC8oYnVja2V0cy5sZW5ndGgtMSkpKVxuICBcbiAgICB2YXIgeHJldmVyc2UgPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgIC5kb21haW4oYnVja2V0cy5zbGljZSgpLnJldmVyc2UoKSlcbiAgICAgIC5yYW5nZShkMy5yYW5nZSgwLHdpZHRoKzEwLHdpZHRoLyhidWNrZXRzLmxlbmd0aC0xKSkpXG5cbiAgICB0aGlzLl9iZWZvcmVfc2NhbGUgPSB4cmV2ZXJzZVxuICAgIHRoaXMuX2FmdGVyX3NjYWxlID0geFxuICBcbiAgICB2YXIgYmFyZWEgPSBkMy5zdmcuYXJlYSgpXG4gICAgICAuaW50ZXJwb2xhdGUoXCJ6ZXJvXCIpXG4gICAgICAueChmdW5jdGlvbihkKSB7IHJldHVybiB4cmV2ZXJzZShkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICAgIHZhciBhYXJlYSA9IGQzLnN2Zy5hcmVhKClcbiAgICAgIC5pbnRlcnBvbGF0ZShcImxpbmVhclwiKVxuICAgICAgLngoZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLngpOyB9KVxuICAgICAgLnkwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55MCk7IH0pXG4gICAgICAueTEoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkwICsgZC55KTsgfSk7XG4gIFxuICBcbiAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJzdmdcIixcInN2Z1wiKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCoyKzE4MClcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCArIDEwMCk7XG5cbiAgICB0aGlzLl9zdmcgPSBzdmdcbiAgXG4gICAgdmFyIGJlZm9yZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmJlZm9yZS1jYW52YXNcIixcImdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIixcImJlZm9yZS1jYW52YXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsNjApXCIpXG5cbiAgICBmdW5jdGlvbiBob3ZlckNhdGVnb3J5KGNhdCx0aW1lKSB7XG4gICAgICBhcGF0aHMuc3R5bGUoXCJvcGFjaXR5XCIsXCIuNVwiKVxuICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLFwiLjVcIilcbiAgICAgIGFwYXRocy5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSBjYXQpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIGJwYXRocy5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSBjYXQpLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUobWlkZGxlLFwidGV4dFwiLFwidGV4dFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcIiMzMzNcIilcbiAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiLjY1XCIpXG4gICAgICAgIC50ZXh0KGNhdClcblxuICAgICAgdmFyIG13cmFwID0gZDNfdXBkYXRlYWJsZShtaWRkbGUsXCJnXCIsXCJnXCIpXG5cbiAgICAgIHNlbGYub24oXCJjYXRlZ29yeS5ob3ZlclwiKS5iaW5kKG13cmFwLm5vZGUoKSkoY2F0LHRpbWUpXG4gICAgfVxuICBcbiAgICB2YXIgYiA9IGQzX3VwZGF0ZWFibGUoYmVmb3JlLFwiZ1wiLFwiZ1wiKVxuXG4gICAgdmFyIGJwYXRocyA9IGQzX3NwbGF0KGIsXCJwYXRoXCIsXCJwYXRoXCIsIGJlZm9yZV9zdGFja2VkLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLmF0dHIoXCJkXCIsIGJhcmVhKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gY29sb3IoeFswXS5rZXkpOyB9KVxuICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgZGQgPSBkMy5ldmVudFxuICAgICAgICB2YXIgcG9zID0gcGFyc2VJbnQoZGQub2Zmc2V0WC8od2lkdGgvYnVja2V0cy5sZW5ndGgpKVxuICAgICAgICBcbiAgICAgICAgaG92ZXJDYXRlZ29yeS5iaW5kKHRoaXMpKHhbMF0ua2V5LGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKClbcG9zXSlcbiAgICAgIH0pXG4gICAgICAub24oXCJtb3VzZW91dFwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgYXBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgICAgYnBhdGhzLnN0eWxlKFwib3BhY2l0eVwiLHVuZGVmaW5lZClcbiAgICAgIH0pXG5cbiAgICBicGF0aHMuZXhpdCgpLnJlbW92ZSgpXG5cbiAgICB2YXIgYnJlY3QgPSBkM19zcGxhdChiLFwicmVjdFwiLFwicmVjdFwiLGJ1Y2tldHMuc2xpY2UoKS5yZXZlcnNlKCksKHgsaSkgPT4gaSlcbiAgICAgIC5hdHRyKFwieFwiLHogPT4geHJldmVyc2UoeikpXG4gICAgICAuYXR0cihcIndpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsaGVpZ2h0KVxuICAgICAgLmF0dHIoXCJ5XCIsMClcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLFwiMFwiKVxuXG5cblxuICAgICAgXG5cbiAgICB2YXIgbWlkZGxlID0gZDNfdXBkYXRlYWJsZShzdmcsXCIubWlkZGxlLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwibWlkZGxlLWNhbnZhc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArICh3aWR0aCArIDE4MC8yKSArIFwiLDYwKVwiKVxuICBcbiAgXG4gIFxuICAgIHZhciBhZnRlciA9IGQzX3VwZGF0ZWFibGUoc3ZnLFwiLmFmdGVyLWNhbnZhc1wiLFwiZ1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwiYWZ0ZXItY2FudmFzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArICh3aWR0aCArIDE4MCkgKyBcIiw2MClcIilcblxuICAgIHZhciBhID0gZDNfdXBkYXRlYWJsZShhZnRlcixcImdcIixcImdcIilcblxuICBcbiAgICB2YXIgYXBhdGhzID0gZDNfc3BsYXQoYSxcInBhdGhcIixcInBhdGhcIixhZnRlcl9zdGFja2VkLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geFswXS5rZXl9KVxuICAgICAgLmF0dHIoXCJkXCIsIGFhcmVhKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4WzBdLmtleX0pXG4gICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gY29sb3IoeFswXS5rZXkpOyB9KVxuICAgICAgLm9uKFwibW91c2VvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICBob3ZlckNhdGVnb3J5LmJpbmQodGhpcykoeFswXS5rZXkpXG4gICAgICB9KVxuICAgICAgLm9uKFwibW91c2VvdXRcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIGFwYXRocy5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICAgIGJwYXRocy5zdHlsZShcIm9wYWNpdHlcIix1bmRlZmluZWQpXG4gICAgICB9KVxuXG4gICAgYXBhdGhzLmV4aXQoKS5yZW1vdmUoKVxuXG4gICAgdmFyIF94X3hpcyA9IGRyYXdBeGlzKGJlZm9yZSx4cmV2ZXJzZSxcImJlZm9yZSBhcnJpdmluZ1wiLHdpZHRoKVxuXG4gICAgX3hfeGlzLnNlbGVjdEFsbChcInRleHRcIikuZmlsdGVyKGZ1bmN0aW9uKHkpeyByZXR1cm4geSA9PSAwIH0pLnJlbW92ZSgpXG5cbiAgICB2YXIgX3hfeGlzID0gZHJhd0F4aXMoYWZ0ZXIseCxcImFmdGVyIGxlYXZpbmdcIix3aWR0aClcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0Om5vdCgudGl0bGUpXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSgtNDUpXCIpXG4gICAgICAuYXR0cihcInhcIiwyMClcbiAgICAgIC5hdHRyKFwieVwiLC0yNSlcblxuICAgIF94X3hpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpLmZpbHRlcihmdW5jdGlvbih5KXsgcmV0dXJuIHkgPT0gMCB9KS5yZW1vdmUoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIG9uKGFjdGlvbixmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IGJ1dHRvbl9yYWRpbyBmcm9tICcuLi9nZW5lcmljL2J1dHRvbl9yYWRpbydcbmltcG9ydCBzZWxlY3QgZnJvbSAnLi4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCBwaWUgZnJvbSAnLi4vZ2VuZXJpYy9waWUnXG5pbXBvcnQgZGlmZl9iYXIgZnJvbSAnLi4vZ2VuZXJpYy9kaWZmX2JhcidcbmltcG9ydCBjb21wX2JhciBmcm9tICcuLi9nZW5lcmljL2NvbXBfYmFyJ1xuaW1wb3J0IGNvbXBfYnViYmxlIGZyb20gJy4uL2dlbmVyaWMvY29tcF9idWJibGUnXG5pbXBvcnQgc3RyZWFtX3Bsb3QgZnJvbSAnLi4vZ2VuZXJpYy9zdHJlYW1fcGxvdCdcblxuXG5cblxuaW1wb3J0ICogYXMgdGltZXNlcmllcyBmcm9tICcuLi90aW1lc2VyaWVzJ1xuXG5cbmltcG9ydCB0YWJsZSBmcm9tICd0YWJsZSdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cblxuZXhwb3J0IGZ1bmN0aW9uIFN1bW1hcnlWaWV3KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHtcbiAgICBzZWxlY3Q6IG5vb3BcbiAgfVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5mdW5jdGlvbiBidWlsZFN0cmVhbURhdGEoZGF0YSxidWNrZXRzKSB7XG5cbiAgdmFyIHVuaXRzX2luX2J1Y2tldCA9IGJ1Y2tldHMubWFwKGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4geCAtICh4W2ktMV18fCAwKSB9KVxuXG4gIHZhciBzdGFja2FibGUgPSBkYXRhLm1hcChmdW5jdGlvbihkKSB7XG4gICAgdmFyIHZhbHVlbWFwID0gZC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMudmFsdWVzOyByZXR1cm4gcCB9LHt9KVxuICAgIHZhciBwZXJjbWFwID0gZC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMucGVyY2VudDsgcmV0dXJuIHAgfSx7fSlcblxuICAgIHZhciB2bWFwID0gZC52YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2Mua2V5XSA9IGMubm9ybV9jYXQ7IHJldHVybiBwIH0se30pXG5cblxuICAgIHZhciBub3JtYWxpemVkX3ZhbHVlcyA9IGJ1Y2tldHMubWFwKGZ1bmN0aW9uKHgsaSkge1xuICAgICAgaWYgKHggPT0gMCkgcmV0dXJuIHtrZXk6IGQua2V5LCB4OiBwYXJzZUludCh4KSwgeTogKHZtYXBbXCI2MDBcIl18fDApLCB2YWx1ZXM6ICh2YWx1ZW1hcFtcIjYwMFwiXXx8MCksIHBlcmNlbnQ6IChwZXJjbWFwW1wiNjAwXCJdfHwwKX1cbiAgICAgIHJldHVybiB7IGtleTogZC5rZXksIHg6IHBhcnNlSW50KHgpLCB5OiAodm1hcFt4XSB8fCAwKSwgdmFsdWVzOiAodmFsdWVtYXBbeF0gfHwgMCksIHBlcmNlbnQ6IChwZXJjbWFwW3hdIHx8IDApIH1cbiAgICB9KVxuXG5cbiAgICByZXR1cm4gbm9ybWFsaXplZF92YWx1ZXNcbiAgICAvL3JldHVybiBlMi5jb25jYXQobm9ybWFsaXplZF92YWx1ZXMpLy8uY29uY2F0KGV4dHJhKVxuICB9KVxuXG5cbiAgc3RhY2thYmxlID0gc3RhY2thYmxlLnNvcnQoKHAsYykgPT4gcFswXS55IC0gY1swXS55KS5yZXZlcnNlKCkuc2xpY2UoMCwxMilcblxuICByZXR1cm4gc3RhY2thYmxlXG5cbn1cblxuZnVuY3Rpb24gc3RyZWFtRGF0YShiZWZvcmUsYWZ0ZXIsYnVja2V0cykge1xuICB2YXIgc3RhY2thYmxlID0gYnVpbGRTdHJlYW1EYXRhKGJlZm9yZSxidWNrZXRzKVxuICB2YXIgc3RhY2sgPSBkMy5sYXlvdXQuc3RhY2soKS5vZmZzZXQoXCJ3aWdnbGVcIikub3JkZXIoXCJyZXZlcnNlXCIpXG4gIHZhciBiZWZvcmVfc3RhY2tlZCA9IHN0YWNrKHN0YWNrYWJsZSlcblxuICB2YXIgb3JkZXIgPSBiZWZvcmVfc3RhY2tlZC5tYXAoaXRlbSA9PiBpdGVtWzBdLmtleSlcblxuICB2YXIgc3RhY2thYmxlID0gYnVpbGRTdHJlYW1EYXRhKGFmdGVyLGJ1Y2tldHMpXG4gICAgLnNvcnQoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBvcmRlci5pbmRleE9mKGNbMF0ua2V5KSAtIG9yZGVyLmluZGV4T2YocFswXS5rZXkpIH0pXG5cbiAgc3RhY2thYmxlID0gc3RhY2thYmxlLmZpbHRlcih4ID0+IG9yZGVyLmluZGV4T2YoeFswXS5rZXkpID09IC0xKS5jb25jYXQoc3RhY2thYmxlLmZpbHRlcih4ID0+IG9yZGVyLmluZGV4T2YoeFswXS5rZXkpID4gLTEpKVxuXG4gIHZhciBzdGFjayA9IGQzLmxheW91dC5zdGFjaygpLm9mZnNldChcIndpZ2dsZVwiKS5vcmRlcihcImRlZmF1bHRcIilcbiAgdmFyIGFmdGVyX3N0YWNrZWQgPSBzdGFjayhzdGFja2FibGUpXG5cbiAgcmV0dXJuIHtcbiAgICAgIG9yZGVyOiBvcmRlclxuICAgICwgYmVmb3JlX3N0YWNrZWQ6IGJlZm9yZV9zdGFja2VkXG4gICAgLCBhZnRlcl9zdGFja2VkOiBhZnRlcl9zdGFja2VkXG4gIH1cblxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2ltcGxlVGltZXNlcmllcyh0YXJnZXQsZGF0YSx3LGgpIHtcbiAgdmFyIHdpZHRoID0gdyB8fCAxMjBcbiAgICAsIGhlaWdodCA9IGggfHwgMzBcblxuICB2YXIgeCA9IGQzLnNjYWxlLm9yZGluYWwoKS5kb21haW4oZDMucmFuZ2UoMCxkYXRhLmxlbmd0aCkpLnJhbmdlKGQzLnJhbmdlKDAsd2lkdGgsd2lkdGgvZGF0YS5sZW5ndGgpKVxuICB2YXIgeSA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFs0LGhlaWdodF0pLmRvbWFpbihbZDMubWluKGRhdGEpLGQzLm1heChkYXRhKV0pXG5cbiAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImdcIixcImdcIixkYXRhLGZ1bmN0aW9uKHgsaSkgeyByZXR1cm4gMX0pXG5cbiAgZDNfc3BsYXQod3JhcCxcInJlY3RcIixcInJlY3RcIix4ID0+IHgsICh4LGkpID0+IGkpXG4gICAgLmF0dHIoXCJ4XCIsKHosaSkgPT4geChpKSlcbiAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoL2RhdGEubGVuZ3RoIC0xLjIpXG4gICAgLmF0dHIoXCJ5XCIsIHogPT4gaGVpZ2h0IC0geSh6KSApXG4gICAgLmF0dHIoXCJoZWlnaHRcIiwgeiA9PiB6ID8geSh6KSA6IDApXG5cbiAgcmV0dXJuIHdyYXBcblxufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdTdHJlYW0odGFyZ2V0LGJlZm9yZSxhZnRlcikge1xuXG5mdW5jdGlvbiBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxhY2Nlc3Nvcikge1xuICB2YXIgYnZvbHVtZSA9IHt9LCBhdm9sdW1lID0ge31cblxuICB0cnkgeyB2YXIgYnZvbHVtZSA9IGJbMF0ucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2MueF0gPSBhY2Nlc3NvcihjKTsgcmV0dXJuIHAgfSx7fSkgfSBjYXRjaChlKSB7fVxuICB0cnkgeyB2YXIgYXZvbHVtZSA9IGFbMF0ucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2MueF0gPSBhY2Nlc3NvcihjKTsgcmV0dXJuIHAgfSx7fSkgfSBjYXRjaChlKSB7fVxuXG4gIHZhciB2b2x1bWUgPSBidWNrZXRzLnNsaWNlKCkucmV2ZXJzZSgpLm1hcCh4ID0+IGJ2b2x1bWVbeF0gfHwgMCkuY29uY2F0KGJ1Y2tldHMubWFwKHggPT4gYXZvbHVtZVt4XSB8fCAwKSlcblxuICByZXR1cm4gdm9sdW1lXG59XG5cbiAgdmFyIGJ1Y2tldHMgPSBbMCwxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG5cbiAgdmFyIGRhdGEgPSBzdHJlYW1EYXRhKGJlZm9yZSxhZnRlcixidWNrZXRzKVxuICAgICwgYmVmb3JlX3N0YWNrZWQgPSBkYXRhLmJlZm9yZV9zdGFja2VkXG4gICAgLCBhZnRlcl9zdGFja2VkID0gZGF0YS5hZnRlcl9zdGFja2VkXG5cbiAgdmFyIGJlZm9yZSA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLmJlZm9yZS1zdHJlYW1cIixcImRpdlwiLGRhdGEsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAuY2xhc3NlZChcImJlZm9yZS1zdHJlYW1cIix0cnVlKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMHB4XCIpXG5cbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJyZ2IoMjI3LCAyMzUsIDI0MClcIilcblxuICBkM191cGRhdGVhYmxlKGJlZm9yZSxcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiQ29uc2lkZXJhdGlvbiBhbmQgUmVzZWFyY2ggUGhhc2UgSWRlbnRpZmljYXRpb25cIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzMzM1wiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIwcHhcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcblxuICB2YXIgaW5uZXIgPSBkM191cGRhdGVhYmxlKGJlZm9yZSxcIi5pbm5lclwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJpbm5lclwiLHRydWUpXG5cblxuXG4gIHZhciBzdHJlYW0gPSBzdHJlYW1fcGxvdChpbm5lcilcbiAgICAuZGF0YShkYXRhKVxuICAgIC5vbihcImNhdGVnb3J5LmhvdmVyXCIsZnVuY3Rpb24oeCx0aW1lKSB7XG4gICAgICBjb25zb2xlLmxvZyh0aW1lKVxuICAgICAgdmFyIGIgPSBkYXRhLmJlZm9yZV9zdGFja2VkLmZpbHRlcih5ID0+IHlbMF0ua2V5ID09IHgpXG4gICAgICB2YXIgYSA9IGRhdGEuYWZ0ZXJfc3RhY2tlZC5maWx0ZXIoeSA9PiB5WzBdLmtleSA9PSB4KVxuXG4gICAgICB2YXIgdm9sdW1lID0gZXh0cmFjdERhdGEoYixhLGJ1Y2tldHMsZnVuY3Rpb24oYykgeyByZXR1cm4gYy52YWx1ZXMubGVuZ3RoIH0pXG4gICAgICAgICwgcGVyY2VudCA9IGV4dHJhY3REYXRhKGIsYSxidWNrZXRzLGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMucGVyY2VudCB9KVxuICAgICAgICAsIGltcG9ydGFuY2UgPSBleHRyYWN0RGF0YShiLGEsYnVja2V0cyxmdW5jdGlvbihjKSB7IHJldHVybiBjLnkgfSlcblxuXG4gICAgICB2YXIgd3JhcCA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAsIHZ3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLnZvbHVtZVwiLFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidm9sdW1lXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKC02MCwzMClcIilcbiAgICAgICAgLCBwd3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5wZXJjZW50XCIsXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJwZXJjZW50XCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKC02MCw5MClcIilcbiAgICAgICAgLCBpd3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5pbXBvcnRhbmNlXCIsXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsXCJpbXBvcnRhbmNlXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKC02MCwxNTApXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZSh2d3JhcCxcInRleHRcIixcInRleHRcIikudGV4dChcIlZpc2l0c1wiKVxuICAgICAgICAuYXR0cihcInN0eWxlXCIsXCJ0aXRsZVwiKVxuICAgICAgc2ltcGxlVGltZXNlcmllcyh2d3JhcCx2b2x1bWUpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsXCJ0cmFuc2xhdGUoMCwyKVwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUocHdyYXAsXCJ0ZXh0XCIsXCJ0ZXh0XCIpLnRleHQoXCJTaGFyZSBvZiB0aW1lXCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIixcInRpdGxlXCIpXG5cbiAgICAgIHNpbXBsZVRpbWVzZXJpZXMocHdyYXAscGVyY2VudClcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZSgwLDIpXCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpd3JhcCxcInRleHRcIixcInRleHRcIikudGV4dChcIkltcG9ydGFuY2VcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidGl0bGVcIilcblxuICAgICAgc2ltcGxlVGltZXNlcmllcyhpd3JhcCxpbXBvcnRhbmNlKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLFwidHJhbnNsYXRlKDAsMilcIilcblxuXG4gICAgICByZXR1cm5cbiAgICB9KVxuICAgIC5kcmF3KClcblxuICB2YXIgYmVmb3JlX2FnZyA9IGJlZm9yZV9zdGFja2VkLnJlZHVjZSgobyx4KSA9PiB7IHJldHVybiB4LnJlZHVjZSgocCxjKSA9PiB7IHBbYy54XSA9IChwW2MueF0gfHwgMCkgKyBjLnk7IHJldHVybiBwfSxvKSB9LHt9KVxuICAgICwgYWZ0ZXJfYWdnID0gYWZ0ZXJfc3RhY2tlZC5yZWR1Y2UoKG8seCkgPT4geyByZXR1cm4geC5yZWR1Y2UoKHAsYykgPT4geyBwW2MueF0gPSAocFtjLnhdIHx8IDApICsgYy55OyByZXR1cm4gcH0sbykgfSx7fSlcblxuXG4gIHZhciBsb2NhbF9iZWZvcmUgPSBPYmplY3Qua2V5cyhiZWZvcmVfYWdnKS5yZWR1Y2UoKG1pbmFycixjKSA9PiB7XG4gICAgICBpZiAobWluYXJyWzBdID49IGJlZm9yZV9hZ2dbY10pIHJldHVybiBbYmVmb3JlX2FnZ1tjXSxjXTtcbiAgICAgIGlmIChtaW5hcnIubGVuZ3RoID4gMSkgbWluYXJyWzBdID0gLTE7XG4gICAgICByZXR1cm4gbWluYXJyXG4gICAgfSxbSW5maW5pdHldXG4gIClbMV1cblxuICB2YXIgbG9jYWxfYWZ0ZXIgPSBPYmplY3Qua2V5cyhhZnRlcl9hZ2cpLnJlZHVjZSgobWluYXJyLGMpID0+IHtcbiAgICAgIGlmIChtaW5hcnJbMF0gPj0gYWZ0ZXJfYWdnW2NdKSByZXR1cm4gW2FmdGVyX2FnZ1tjXSxjXTtcbiAgICAgIGlmIChtaW5hcnIubGVuZ3RoID4gMSkgbWluYXJyWzBdID0gLTE7XG4gICAgICByZXR1cm4gbWluYXJyXG4gICAgfSxbSW5maW5pdHldXG4gIClbMV1cblxuXG4gIHZhciBiZWZvcmVfbGluZSA9IGJ1Y2tldHNbYnVja2V0cy5pbmRleE9mKHBhcnNlSW50KGxvY2FsX2JlZm9yZSkpXVxuICAgICwgYWZ0ZXJfbGluZSA9IGJ1Y2tldHNbYnVja2V0cy5pbmRleE9mKHBhcnNlSW50KGxvY2FsX2FmdGVyKSldXG5cbiAgdmFyIHN2ZyA9IHN0cmVhbVxuICAgIC5fc3ZnLnN0eWxlKFwibWFyZ2luXCIsXCJhdXRvXCIpLnN0eWxlKFwiZGlzcGxheVwiLFwiYmxvY2tcIilcblxuXG4gIHZhciBibGluZSA9IGQzX3VwZGF0ZWFibGUoc3ZnLnNlbGVjdEFsbChcIi5iZWZvcmUtY2FudmFzXCIpLFwiZy5saW5lLXdyYXBcIixcImdcIilcbiAgICAuYXR0cihcImNsYXNzXCIsXCJsaW5lLXdyYXBcIilcblxuICBkM191cGRhdGVhYmxlKGJsaW5lLFwibGluZVwiLFwibGluZVwiKVxuICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgIC5hdHRyKFwieTJcIiwgc3RyZWFtLl9oZWlnaHQrMjApXG4gICAgLmF0dHIoXCJ4MVwiLCBzdHJlYW0uX2JlZm9yZV9zY2FsZShiZWZvcmVfbGluZSkpXG4gICAgLmF0dHIoXCJ4MlwiLCBzdHJlYW0uX2JlZm9yZV9zY2FsZShiZWZvcmVfbGluZSkpXG5cbiAgZDNfdXBkYXRlYWJsZShibGluZSxcInRleHRcIixcInRleHRcIilcbiAgICAuYXR0cihcInlcIiwgc3RyZWFtLl9oZWlnaHQrMjApXG4gICAgLmF0dHIoXCJ4XCIsIHN0cmVhbS5fYmVmb3JlX3NjYWxlKGJlZm9yZV9saW5lKSArIDEwKVxuICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJzdGFydFwiKVxuICAgIC50ZXh0KFwiQ29uc2lkZXJhdGlvbiBTdGFnZVwiKVxuXG5cbiAgdmFyIGFsaW5lID0gZDNfdXBkYXRlYWJsZShzdmcuc2VsZWN0QWxsKFwiLmFmdGVyLWNhbnZhc1wiKSxcImcubGluZS13cmFwXCIsXCJnXCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwibGluZS13cmFwXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShhbGluZSxcImxpbmVcIixcImxpbmVcIilcbiAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICAuYXR0cihcInkyXCIsIHN0cmVhbS5faGVpZ2h0KzIwKVxuICAgIC5hdHRyKFwieDFcIiwgc3RyZWFtLl9hZnRlcl9zY2FsZShhZnRlcl9saW5lKSlcbiAgICAuYXR0cihcIngyXCIsIHN0cmVhbS5fYWZ0ZXJfc2NhbGUoYWZ0ZXJfbGluZSkpXG5cbiAgZDNfdXBkYXRlYWJsZShhbGluZSxcInRleHRcIixcInRleHRcIilcbiAgICAuYXR0cihcInlcIiwgc3RyZWFtLl9oZWlnaHQrMjApXG4gICAgLmF0dHIoXCJ4XCIsIHN0cmVhbS5fYWZ0ZXJfc2NhbGUoYWZ0ZXJfbGluZSkgLSAxMClcbiAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgLnRleHQoXCJWYWxpZGF0aW9uIC8gUmVzZWFyY2hcIilcblxuXG5cbiAgcmV0dXJuIHtcbiAgICBcImNvbnNpZGVyYXRpb25cIjogXCJcIiArIGJlZm9yZV9saW5lLFxuICAgIFwidmFsaWRhdGlvblwiOiBcIi1cIiArIGFmdGVyX2xpbmVcbiAgfVxufVxuXG5cblxuZnVuY3Rpb24gYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSwgdGFyZ2V0LCByYWRpdXNfc2NhbGUsIHgpIHtcbiAgdmFyIGRhdGEgPSBkYXRhXG4gICAgLCBkdGhpcyA9IGQzLnNlbGVjdCh0YXJnZXQpXG5cbiAgcGllKGR0aGlzKVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLnJhZGl1cyhyYWRpdXNfc2NhbGUoZGF0YS5wb3B1bGF0aW9uKSlcbiAgICAuZHJhdygpXG5cbiAgdmFyIGZ3ID0gZDNfdXBkYXRlYWJsZShkdGhpcyxcIi5md1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxIH0pXG4gICAgLmNsYXNzZWQoXCJmd1wiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjUwcHhcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjNweFwiKVxuICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxNnB4XCIpXG5cbiAgdmFyIGZ3MiA9IGQzX3VwZGF0ZWFibGUoZHRoaXMsXCIuZncyXCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDEgfSlcbiAgICAuY2xhc3NlZChcImZ3MlwiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjYwcHhcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjNweFwiKVxuICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMjJweFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjQwcHhcIilcbiAgICAudGV4dChkMy5mb3JtYXQoXCIlXCIpKGRhdGEuc2FtcGxlL2RhdGEucG9wdWxhdGlvbikpXG5cblxuXG4gIGQzX3VwZGF0ZWFibGUoZncsXCIuc2FtcGxlXCIsXCJzcGFuXCIpLnRleHQoZDMuZm9ybWF0KFwiLFwiKShkYXRhLnNhbXBsZSkpXG4gICAgLmNsYXNzZWQoXCJzYW1wbGVcIix0cnVlKVxuICBkM191cGRhdGVhYmxlKGZ3LFwiLnZzXCIsXCJzcGFuXCIpLmh0bWwoXCI8YnI+IG91dCBvZiA8YnI+XCIpLnN0eWxlKFwiZm9udC1zaXplXCIsXCIuODhlbVwiKVxuICAgIC5jbGFzc2VkKFwidnNcIix0cnVlKVxuICBkM191cGRhdGVhYmxlKGZ3LFwiLnBvcHVsYXRpb25cIixcInNwYW5cIikudGV4dChkMy5mb3JtYXQoXCIsXCIpKGRhdGEucG9wdWxhdGlvbikpXG4gICAgLmNsYXNzZWQoXCJwb3B1bGF0aW9uXCIsdHJ1ZSlcblxufVxuXG5mdW5jdGlvbiBkcmF3QmVmb3JlQW5kQWZ0ZXIodGFyZ2V0LGRhdGEpIHtcblxuICB2YXIgYmVmb3JlID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuYmVmb3JlXCIsXCJkaXZcIixkYXRhLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgLmNsYXNzZWQoXCJiZWZvcmVcIix0cnVlKVxuICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMHB4XCIpXG5cbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJyZ2IoMjI3LCAyMzUsIDI0MClcIilcblxuICBkM191cGRhdGVhYmxlKGJlZm9yZSxcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiQ2F0ZWdvcnkgYWN0aXZpdHkgYmVmb3JlIGFycml2aW5nIGFuZCBhZnRlciBsZWF2aW5nIHNpdGVcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzMzM1wiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIwcHhcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcblxuICB2YXIgaW5uZXIgPSBkM191cGRhdGVhYmxlKGJlZm9yZSxcIi5pbm5lclwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJpbm5lclwiLHRydWUpXG4gICAgLnN0eWxlKFwicG9zaXRpb25cIixcImFic29sdXRlXCIpXG5cbiAgZDNfdXBkYXRlYWJsZShpbm5lcixcImgzXCIsXCJoM1wiKVxuICAgIC50ZXh0KFwiU29ydCBCeVwiKVxuICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIycHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQwcHhcIilcblxuXG5cbiAgaW5uZXIuc2VsZWN0QWxsKFwic2VsZWN0XCIpXG4gICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIxNDBweFwiKVxuXG5cbiAgdmFyIGNiID0gY29tcF9idWJibGUoYmVmb3JlKVxuICAgIC5yb3dzKGRhdGEuYmVmb3JlX2NhdGVnb3JpZXMpXG4gICAgLmFmdGVyKGRhdGEuYWZ0ZXJfY2F0ZWdvcmllcylcbiAgICAuZHJhdygpXG5cbiAgY2IuX3N2Zy5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG4gICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcImF1dG9cIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcImF1dG9cIilcblxuXG4gIHJldHVybiBpbm5lclxuXG59XG5cbmZ1bmN0aW9uIGRyYXdDYXRlZ29yeURpZmYodGFyZ2V0LGRhdGEpIHtcblxuICBkaWZmX2Jhcih0YXJnZXQpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAudGl0bGUoXCJDYXRlZ29yeSBpbmRleGluZyB2ZXJzdXMgY29tcFwiKVxuICAgIC52YWx1ZV9hY2Nlc3NvcihcIm5vcm1hbGl6ZWRfZGlmZlwiKVxuICAgIC5kcmF3KClcblxufVxuXG5mdW5jdGlvbiBkcmF3Q2F0ZWdvcnkodGFyZ2V0LGRhdGEpIHtcblxuICBjb21wX2Jhcih0YXJnZXQpXG4gICAgLmRhdGEoZGF0YSlcbiAgICAudGl0bGUoXCJDYXRlZ29yaWVzIHZpc2l0ZWQgZm9yIGZpbHRlcmVkIHZlcnN1cyBhbGwgdmlld3NcIilcbiAgICAucG9wX3ZhbHVlX2FjY2Vzc29yKFwicG9wXCIpXG4gICAgLnNhbXBfdmFsdWVfYWNjZXNzb3IoXCJzYW1wXCIpXG4gICAgLmRyYXcoKVxuXG59XG5cbmZ1bmN0aW9uIGRyYXdLZXl3b3Jkcyh0YXJnZXQsZGF0YSkge1xuXG4gIGNvbXBfYmFyKHRhcmdldClcbiAgICAuZGF0YShkYXRhKVxuICAgIC50aXRsZShcIktleXdvcmRzIHZpc2l0ZWQgZm9yIGZpbHRlcmVkIHZlcnN1cyBhbGwgdmlld3NcIilcbiAgICAucG9wX3ZhbHVlX2FjY2Vzc29yKFwicG9wXCIpXG4gICAgLnNhbXBfdmFsdWVfYWNjZXNzb3IoXCJzYW1wXCIpXG4gICAgLmRyYXcoKVxuXG5cbn1cblxuZnVuY3Rpb24gZHJhd0tleXdvcmREaWZmKHRhcmdldCxkYXRhKSB7XG5cbiAgZGlmZl9iYXIodGFyZ2V0KVxuICAgIC5kYXRhKGRhdGEpXG4gICAgLnRpdGxlKFwiS2V5d29yZCBpbmRleGluZyB2ZXJzdXMgY29tcFwiKVxuICAgIC52YWx1ZV9hY2Nlc3NvcihcIm5vcm1hbGl6ZWRfZGlmZlwiKVxuICAgIC5kcmF3KClcblxufVxuXG5mdW5jdGlvbiBkcmF3VGltZXNlcmllcyh0YXJnZXQsZGF0YSxyYWRpdXNfc2NhbGUpIHtcbiAgdmFyIHcgPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdi50aW1lc2VyaWVzXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInRpbWVzZXJpZXNcIix0cnVlKVxuICAgIC5zdHlsZShcIndpZHRoXCIsXCI2MCVcIilcbiAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLCBcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEyN3B4XCIpXG5cblxuXG4gIHZhciBxID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJkaXYudGltZXNlcmllcy1kZXRhaWxzXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcInRpbWVzZXJpZXMtZGV0YWlsc1wiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjQwJVwiKVxuICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nXCIsXCIxNXB4XCIpXG4gICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCI1N3B4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBcIiNlM2ViZjBcIilcbiAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEyN3B4XCIpXG5cblxuXG5cblxuICB2YXIgcG9wID0gZDNfdXBkYXRlYWJsZShxLFwiLnBvcFwiLFwiZGl2XCIpXG4gICAgLmNsYXNzZWQoXCJwb3BcIix0cnVlKVxuXG4gIGQzX3VwZGF0ZWFibGUocG9wLFwiLmV4XCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJleFwiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjIwcHhcIilcbiAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCJncmV5XCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cblxuICBkM191cGRhdGVhYmxlKHBvcCxcIi50aXRsZVwiLFwic3BhblwiKVxuICAgIC5jbGFzc2VkKFwidGl0bGVcIix0cnVlKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjNweFwiKVxuICAgIC50ZXh0KFwiYWxsXCIpXG5cblxuXG4gIHZhciBzYW1wID0gZDNfdXBkYXRlYWJsZShxLFwiLnNhbXBcIixcImRpdlwiKVxuICAgIC5jbGFzc2VkKFwic2FtcFwiLHRydWUpXG5cbiAgZDNfdXBkYXRlYWJsZShzYW1wLFwiLmV4XCIsXCJzcGFuXCIpXG4gICAgLmNsYXNzZWQoXCJleFwiLHRydWUpXG4gICAgLnN0eWxlKFwid2lkdGhcIixcIjIwcHhcIilcbiAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsXCIjMDgxZDU4XCIpXG4gICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cblxuXG4gIGQzX3VwZGF0ZWFibGUoc2FtcCxcIi50aXRsZVwiLFwic3BhblwiKVxuICAgIC5jbGFzc2VkKFwidGl0bGVcIix0cnVlKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjNweFwiKVxuICAgIC50ZXh0KFwiZmlsdGVyZWRcIilcblxuXG4gIHZhciBkZXRhaWxzID0gZDNfdXBkYXRlYWJsZShxLFwiLmRlZXRzXCIsXCJkaXZcIilcbiAgICAuY2xhc3NlZChcImRlZXRzXCIsdHJ1ZSlcblxuXG5cblxuICBkM191cGRhdGVhYmxlKHcsXCJoM1wiLFwiaDNcIilcbiAgICAudGV4dChcIkZpbHRlcmVkIHZlcnN1cyBBbGwgVmlld3NcIilcbiAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAuc3R5bGUoXCJjb2xvclwiLFwiIzMzM1wiKVxuICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzM3B4XCIpXG4gICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwiI2UzZWJmMFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTBweFwiKVxuICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIwcHhcIilcbiAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcblxuXG5cblxuXG5cbiAgdGltZXNlcmllc1snZGVmYXVsdCddKHcpXG4gICAgLmRhdGEoe1wia2V5XCI6XCJ5XCIsXCJ2YWx1ZXNcIjpkYXRhfSlcbiAgICAuaGVpZ2h0KDgwKVxuICAgIC5vbihcImhvdmVyXCIsZnVuY3Rpb24oeCkge1xuICAgICAgdmFyIHh4ID0ge31cbiAgICAgIHh4W3gua2V5XSA9IHtzYW1wbGU6IHgudmFsdWUsIHBvcHVsYXRpb246IHgudmFsdWUyIH1cbiAgICAgIGRldGFpbHMuZGF0dW0oeHgpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoZGV0YWlscyxcIi50ZXh0XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0ZXh0XCIsdHJ1ZSlcbiAgICAgICAgLnRleHQoXCJAIFwiICsgeC5ob3VyICsgXCI6XCIgKyAoeC5taW51dGUubGVuZ3RoID4gMSA/IHgubWludXRlIDogXCIwXCIgKyB4Lm1pbnV0ZSkgKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjQ5cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1yaWdodFwiLFwiMTVweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjExMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG5cblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoZGV0YWlscyxcIi5waWVcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInBpZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTVweFwiKVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBPYmplY3Qua2V5cyh4KS5tYXAoZnVuY3Rpb24oaykgeyByZXR1cm4geFtrXSB9KVswXVxuICAgICAgICAgIGJ1aWxkU3VtbWFyeUJsb2NrKGRhdGEsdGhpcyxyYWRpdXNfc2NhbGUseClcbiAgICAgICAgfSlcbiAgICB9KVxuICAgIC5kcmF3KClcblxufVxuXG5cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN1bW1hcnlfdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTdW1tYXJ5Vmlldyh0YXJnZXQpXG59XG5cblN1bW1hcnlWaWV3LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbClcbiAgICB9XG4gICwgdGltaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGltaW5nXCIsdmFsKVxuICAgIH1cbiAgLCBjYXRlZ29yeTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNhdGVnb3J5XCIsdmFsKVxuICAgIH1cbiAgLCBrZXl3b3JkczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImtleXdvcmRzXCIsdmFsKVxuICAgIH1cbiAgLCBiZWZvcmU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiZWZvcmVcIix2YWwpXG4gICAgfVxuICAsIGFmdGVyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWZ0ZXJcIix2YWwpXG4gICAgfVxuXG5cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcblxuXG4gIHZhciBDU1NfU1RSSU5HID0gU3RyaW5nKGZ1bmN0aW9uKCkgey8qXG4uc3VtbWFyeS13cmFwIC50YWJsZS13cmFwcGVyIHsgYmFja2dyb3VuZDojZTNlYmYwOyBwYWRkaW5nLXRvcDo1cHg7IHBhZGRpbmctYm90dG9tOjEwcHggfVxuLnN1bW1hcnktd3JhcCAudGFibGUtd3JhcHBlciB0ciB7IGJvcmRlci1ib3R0b206bm9uZSB9XG4uc3VtbWFyeS13cmFwIC50YWJsZS13cmFwcGVyIHRoZWFkIHRyIHsgYmFja2dyb3VuZDpub25lIH1cbi5zdW1tYXJ5LXdyYXAgLnRhYmxlLXdyYXBwZXIgdGJvZHkgdHI6aG92ZXIgeyBiYWNrZ3JvdW5kOm5vbmUgfVxuLnN1bW1hcnktd3JhcCAudGFibGUtd3JhcHBlciB0ciB0ZCB7IGJvcmRlci1yaWdodDoxcHggZG90dGVkICNjY2M7dGV4dC1hbGlnbjpjZW50ZXIgfVxuLnN1bW1hcnktd3JhcCAudGFibGUtd3JhcHBlciB0ciB0ZDpsYXN0LW9mLXR5cGUgeyBib3JkZXItcmlnaHQ6bm9uZSB9XG4gICovfSlcblxuICBkM191cGRhdGVhYmxlKGQzLnNlbGVjdChcImhlYWRcIiksXCJzdHlsZSNjdXN0b20tdGFibGUtY3NzXCIsXCJzdHlsZVwiKVxuICAgIC5hdHRyKFwiaWRcIixcImN1c3RvbS10YWJsZS1jc3NcIilcbiAgICAudGV4dChDU1NfU1RSSU5HLnJlcGxhY2UoXCJmdW5jdGlvbiAoKSB7LypcIixcIlwiKS5yZXBsYWNlKFwiKi99XCIsXCJcIikpXG5cblxuXG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5zdW1tYXJ5LXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInN1bW1hcnktd3JhcFwiLHRydWUpXG5cbiAgICAgIGhlYWRlcih3cmFwKVxuICAgICAgICAudGV4dChcIlN1bW1hcnlcIilcbiAgICAgICAgLmRyYXcoKVxuXG5cbiAgICAgIHZhciB0c3dyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudHMtcm93XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJ0cy1yb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgICB2YXIgcGlld3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5waWUtcm93XCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJwaWUtcm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgdmFyIGNhdHdyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIuY2F0LXJvd1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiY2F0LXJvdyBkYXNoLXJvd1wiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgIHZhciBrZXl3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmtleS1yb3dcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImtleS1yb3cgZGFzaC1yb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgICB2YXIgYmF3cmFwID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmJhLXJvd1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJiYS1yb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuXG4gICAgICB2YXIgc3RyZWFtd3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5zdHJlYW0tYmEtcm93XCIsXCJkaXZcIixmYWxzZSxmdW5jdGlvbigpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuY2xhc3NlZChcInN0cmVhbS1iYS1yb3dcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMTBweFwiKVxuXG5cblxuXG5cblxuXG5cbiAgICAgIHZhciByYWRpdXNfc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAuZG9tYWluKFt0aGlzLl9kYXRhLmRvbWFpbnMucG9wdWxhdGlvbix0aGlzLl9kYXRhLnZpZXdzLnBvcHVsYXRpb25dKVxuICAgICAgICAucmFuZ2UoWzIwLDM1XSlcblxuXG5cbiAgICAgIHRhYmxlKHBpZXdyYXApXG4gICAgICAgIC5kYXRhKHtcImtleVwiOlwiVFwiLFwidmFsdWVzXCI6W3RoaXMuZGF0YSgpXX0pXG4gICAgICAgIC5za2lwX29wdGlvbih0cnVlKVxuICAgICAgICAucmVuZGVyKFwiZG9tYWluc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLmRhdHVtKClbeC5rZXldO1xuICAgICAgICAgIGJ1aWxkU3VtbWFyeUJsb2NrKGRhdGEsdGhpcyxyYWRpdXNfc2NhbGUseClcbiAgICAgICAgfSlcbiAgICAgICAgLnJlbmRlcihcImFydGljbGVzXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkYXRhID0gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuZGF0dW0oKVt4LmtleV07XG4gICAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgICB9KVxuXG4gICAgICAgIC5yZW5kZXIoXCJzZXNzaW9uc1wiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLmRhdHVtKClbeC5rZXldO1xuICAgICAgICAgIGJ1aWxkU3VtbWFyeUJsb2NrKGRhdGEsdGhpcyxyYWRpdXNfc2NhbGUseClcbiAgICAgICAgfSlcbiAgICAgICAgLnJlbmRlcihcInZpZXdzXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkYXRhID0gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuZGF0dW0oKVt4LmtleV07XG4gICAgICAgICAgYnVpbGRTdW1tYXJ5QmxvY2soZGF0YSx0aGlzLHJhZGl1c19zY2FsZSx4KVxuICAgICAgICB9KVxuICAgICAgICAuZHJhdygpXG5cblxuICAgICAgZHJhd1RpbWVzZXJpZXModHN3cmFwLHRoaXMuX3RpbWluZyxyYWRpdXNfc2NhbGUpXG5cblxuICAgICAgdHJ5IHtcbiAgICAgIGRyYXdDYXRlZ29yeShjYXR3cmFwLHRoaXMuX2NhdGVnb3J5KVxuICAgICAgZHJhd0NhdGVnb3J5RGlmZihjYXR3cmFwLHRoaXMuX2NhdGVnb3J5KVxuICAgICAgfSBjYXRjaChlKSB7fVxuXG4gICAgICAvL2RyYXdLZXl3b3JkcyhrZXl3cmFwLHRoaXMuX2tleXdvcmRzKVxuICAgICAgLy9kcmF3S2V5d29yZERpZmYoa2V5d3JhcCx0aGlzLl9rZXl3b3JkcylcblxuICAgICAgdmFyIGlubmVyID0gZHJhd0JlZm9yZUFuZEFmdGVyKGJhd3JhcCx0aGlzLl9iZWZvcmUpXG5cbiAgICAgIHNlbGVjdChpbm5lcilcbiAgICAgICAgLm9wdGlvbnMoW1xuICAgICAgICAgICAge1wia2V5XCI6XCJJbXBvcnRhbmNlXCIsXCJ2YWx1ZVwiOlwicGVyY2VudF9kaWZmXCJ9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIkFjdGl2aXR5XCIsXCJ2YWx1ZVwiOlwic2NvcmVcIn1cbiAgICAgICAgICAsIHtcImtleVwiOlwiUG9wdWxhdGlvblwiLFwidmFsdWVcIjpcInBvcFwifVxuICAgICAgICBdKVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fYmVmb3JlLnNvcnRieSB8fCBcIlwiKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgdGhpcy5vbihcImJhLnNvcnRcIikpXG4gICAgICAgIC5kcmF3KClcblxuXG4gICAgICBkcmF3U3RyZWFtKHN0cmVhbXdyYXAsdGhpcy5fYmVmb3JlLmJlZm9yZV9jYXRlZ29yaWVzLHRoaXMuX2JlZm9yZS5hZnRlcl9jYXRlZ29yaWVzKVxuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHRpbWVfc2VyaWVzIGZyb20gJy4uL3RpbWVzZXJpZXMnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJy4vc3VtbWFyeV92aWV3J1xuXG5cbmZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSxkYXRhKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5cIiArIGNscywgdHlwZSB8fCBcImRpdlwiLGRhdGEpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBEb21haW5FeHBhbmRlZCh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7fVxuICB0aGlzLnRhcmdldCA9IHRhcmdldFxufVxuXG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cblxuZnVuY3Rpb24gZG9tYWluX2V4cGFuZGVkKHRhcmdldCkge1xuICByZXR1cm4gbmV3IERvbWFpbkV4cGFuZGVkKHRhcmdldClcbn1cblxudmFyIGFsbGJ1Y2tldHMgPSBbXVxudmFyIGhvdXJidWNrZXRzID0gZDMucmFuZ2UoMCwyNCkubWFwKHggPT4gU3RyaW5nKHgpLmxlbmd0aCA+IDEgPyBTdHJpbmcoeCkgOiBcIjBcIiArIHgpXG5cbnZhciBob3VycyA9IFswLDIwLDQwXVxudmFyIGJ1Y2tldHMgPSBkMy5yYW5nZSgwLDI0KS5yZWR1Y2UoKHAsYykgPT4ge1xuICBob3Vycy5tYXAoeCA9PiB7XG4gICAgcFtjICsgXCI6XCIgKyB4XSA9IDBcbiAgfSlcbiAgYWxsYnVja2V0cyA9IGFsbGJ1Y2tldHMuY29uY2F0KGhvdXJzLm1hcCh6ID0+IGMgKyBcIjpcIiArIHopKVxuICByZXR1cm4gcFxufSx7fSlcblxuRG9tYWluRXhwYW5kZWQucHJvdG90eXBlID0ge1xuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKVxuICAgIH1cbiAgLCByYXc6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJyYXdcIix2YWwpXG4gICAgfVxuICAsIHVybHM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJ1cmxzXCIsdmFsKVxuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbigpIHtcblxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIHZhciBkYXRhID0gdGhpcy5fcmF3XG4gICAgICB2YXIgZCA9IHsgZG9tYWluOiBkYXRhWzBdLmRvbWFpbiB9XG5cbiAgICAgIC8vdmFyIGFydGljbGVzID0gZGF0YS5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgLy8gIHBbYy51cmxdID0gcFtjLnVybF0gfHwgT2JqZWN0LmFzc2lnbih7fSxidWNrZXRzKVxuICAgICAgLy8gIHBbYy51cmxdW2MuaG91ciArIFwiOlwiICsgYy5taW51dGVdID0gYy5jb3VudFxuICAgICAgLy8gIHJldHVybiBwXG4gICAgICAvL30se30pXG5cbiAgICAgIC8vT2JqZWN0LmtleXMoYXJ0aWNsZXMpLm1hcChrID0+IHtcbiAgICAgIC8vICBhcnRpY2xlc1trXSA9IGFsbGJ1Y2tldHMubWFwKGIgPT4gYXJ0aWNsZXNba11bYl0pXG4gICAgICAvL30pXG5cbiAgICAgIHZhciBhcnRpY2xlcyA9IGRhdGEucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgcFtjLnVybF0gPSBwW2MudXJsXSB8fCBPYmplY3QuYXNzaWduKHt9LGJ1Y2tldHMpXG4gICAgICAgIHBbYy51cmxdW2MuaG91cl0gPSAocFtjLnVybF1bYy5ob3VyXSB8fCAwKSArIGMuY291bnRcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0se30pXG5cblxuICAgICAgT2JqZWN0LmtleXMoYXJ0aWNsZXMpLm1hcChrID0+IHtcbiAgICAgICAgYXJ0aWNsZXNba10gPSBob3VyYnVja2V0cy5tYXAoYiA9PiBhcnRpY2xlc1trXVtiXSB8fCAwKVxuICAgICAgfSlcblxuICAgICAgdmFyIHRvX2RyYXcgPSBkMy5lbnRyaWVzKGFydGljbGVzKVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHguZG9tYWluID0gZC5kb21haW5cbiAgICAgICAgICB4LnVybCA9IHgua2V5XG4gICAgICAgICAgeC50b3RhbCA9IGQzLnN1bSh4LnZhbHVlKVxuICAgICAgICAgIHJldHVybiB4XG4gICAgICAgIH0pXG5cbiAgICAgIHZhciBrd190b19kcmF3ID0gdG9fZHJhd1xuICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKHAsYyl7XG4gICAgICAgICAgYy5rZXkudG9Mb3dlckNhc2UoKS5zcGxpdChkLmRvbWFpbilbMV0uc3BsaXQoXCIvXCIpLnJldmVyc2UoKVswXS5yZXBsYWNlKFwiX1wiLFwiLVwiKS5zcGxpdChcIi1cIikubWFwKHggPT4ge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IFtcInRoYXRcIixcInRoaXNcIixcIndoYXRcIixcImJlc3RcIixcIm1vc3RcIixcImZyb21cIixcInlvdXJcIixcImhhdmVcIixcImZpcnN0XCIsXCJ3aWxsXCIsXCJ0aGFuXCIsXCJzYXlzXCIsXCJsaWtlXCIsXCJpbnRvXCIsXCJhZnRlclwiLFwid2l0aFwiXVxuICAgICAgICAgICAgaWYgKHgubWF0Y2goL1xcZCsvZykgPT0gbnVsbCAmJiB2YWx1ZXMuaW5kZXhPZih4KSA9PSAtMSAmJiB4LmluZGV4T2YoXCIsXCIpID09IC0xICYmIHguaW5kZXhPZihcIj9cIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiLlwiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCI6XCIpID09IC0xICYmIHBhcnNlSW50KHgpICE9IHggJiYgeC5sZW5ndGggPiAzKSB7XG4gICAgICAgICAgICAgIHBbeF0gPSBwW3hdIHx8IHt9XG4gICAgICAgICAgICAgIE9iamVjdC5rZXlzKGMudmFsdWUpLm1hcChxID0+IHtcbiAgICAgICAgICAgICAgICBwW3hdW3FdID0gKHBbeF1bcV0gfHwgMCkgKyAoYy52YWx1ZVtxXSB8fCAwKVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICByZXR1cm4gcFxuICAgICAgICB9LHt9KVxuXG4gICAgICBrd190b19kcmF3ID0gZDMuZW50cmllcyhrd190b19kcmF3KVxuICAgICAgICAubWFwKHggPT4ge1xuICAgICAgICAgIHgudmFsdWVzID0gT2JqZWN0LmtleXMoeC52YWx1ZSkubWFwKHogPT4geC52YWx1ZVt6XSB8fCAwKVxuICAgICAgICAgIHgudG90YWwgPSBkMy5zdW0oeC52YWx1ZXMpXG4gICAgICAgICAgcmV0dXJuIHhcbiAgICAgICAgfSlcblxuXG5cbiAgICAgIHZhciB0ZCA9IHRoaXMudGFyZ2V0XG5cbiAgICAgIGQzX2NsYXNzKHRkLFwiYWN0aW9uLWhlYWRlclwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnRleHQoXCJFeHBsb3JlIGFuZCBSZWZpbmVcIilcblxuICAgICAgdmFyIHRpdGxlX3JvdyA9IGQzX2NsYXNzKHRkLFwidGl0bGUtcm93XCIpXG4gICAgICB2YXIgZXhwYW5zaW9uX3JvdyA9IGQzX2NsYXNzKHRkLFwiZXhwYW5zaW9uLXJvd1wiKVxuXG5cblxuICAgICAgdmFyIGV1aCA9IGQzX2NsYXNzKHRpdGxlX3JvdyxcImV4cGFuc2lvbi11cmxzLXRpdGxlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgIGQzX2NsYXNzKGV1aCxcInRpdGxlXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjVweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAudGV4dChcIlVSTFwiKVxuXG4gICAgICBkM19jbGFzcyhldWgsXCJ2aWV3XCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI0MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAudGV4dChcIlZpZXdzXCIpXG5cbiAgICAgICAgICB2YXIgc3ZnX2xlZ2VuZCA9IGQzX2NsYXNzKGV1aCxcImxlZ2VuZFwiLFwic3ZnXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQ0cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcInRleHQub25lXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjBcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJzdGFydFwiKVxuICAgICAgICAgICAgLnRleHQoXCIxMiBhbVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwidGV4dC50d29cIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLFwiNzJcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC50ZXh0KFwiMTIgcG1cIilcblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcInRleHQudGhyZWVcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLFwiMTQ0XCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwiZW5kXCIpXG4gICAgICAgICAgICAudGV4dChcIjEyIGFtXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJsaW5lLm9uZVwiLFwibGluZVwiKVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwib25lXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMjUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNSlcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCAwKVxuXG5kM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJsaW5lLnR3b1wiLFwibGluZVwiKVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidHdvXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMjUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNSlcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDcyKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNzIpXG5cblxuZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS50aHJlZVwiLFwibGluZVwiKVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidGhyZWVcIix0cnVlKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCAyNSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIDM1KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgMTQ0KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgMTQ0KVxuXG5cblxuICAgICAgdmFyIGVraCA9IGQzX2NsYXNzKHRpdGxlX3JvdyxcImV4cGFuc2lvbi1rd3MtdGl0bGVcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuICAgICAgZDNfY2xhc3MoZWtoLFwidGl0bGVcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI2NXB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChcIktleXdvcmRzXCIpXG5cbiAgICAgIGQzX2NsYXNzKGVraCxcInZpZXdcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAudGV4dChcIlZpZXdzXCIpXG5cbiAgICAgICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhla2gsXCJsZWdlbmRcIixcInN2Z1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0NHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0Lm9uZVwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsXCIwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwic3RhcnRcIilcbiAgICAgICAgICAgIC50ZXh0KFwiMTIgYW1cIilcblxuICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcInRleHQudHdvXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjcyXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIjEyIHBtXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0LnRocmVlXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjE0NFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsXCIyMFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcImVuZFwiKVxuICAgICAgICAgICAgLnRleHQoXCIxMiBhbVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS5vbmVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm9uZVwiLHRydWUpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDI1KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgMzUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCAwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgMClcblxuICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS50d29cIixcImxpbmVcIilcbiAgICAgICAgICAgLmNsYXNzZWQoXCJ0d29cIix0cnVlKVxuICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgIC5hdHRyKFwieTFcIiwgMjUpXG4gICAgICAgICAgIC5hdHRyKFwieTJcIiwgMzUpXG4gICAgICAgICAgIC5hdHRyKFwieDFcIiwgNzIpXG4gICAgICAgICAgIC5hdHRyKFwieDJcIiwgNzIpXG5cblxuICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS50aHJlZVwiLFwibGluZVwiKVxuICAgICAgICAgICAuY2xhc3NlZChcInRocmVlXCIsdHJ1ZSlcbiAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAuYXR0cihcInkxXCIsIDI1KVxuICAgICAgICAgICAuYXR0cihcInkyXCIsIDM1KVxuICAgICAgICAgICAuYXR0cihcIngxXCIsIDE0NClcbiAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCAxNDQpXG5cblxuXG5cblxuXG4gICAgICB2YXIgZXhwYW5zaW9uID0gZDNfY2xhc3MoZXhwYW5zaW9uX3JvdyxcImV4cGFuc2lvbi11cmxzXCIpXG4gICAgICAgIC5jbGFzc2VkKFwic2Nyb2xsYm94XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cbiAgICAgICAgLnN0eWxlKFwibWF4LWhlaWdodFwiLFwiMjUwcHhcIilcbiAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcInNjcm9sbFwiKVxuXG4gICAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG4gICAgICB2YXIgdXJsX3JvdyA9IGQzX3NwbGF0KGV4cGFuc2lvbixcIi51cmwtcm93XCIsXCJkaXZcIix0b19kcmF3LnNsaWNlKDAsNTAwKSxmdW5jdGlvbih4KSB7IHJldHVybiB4LnVybCB9KVxuICAgICAgICAuY2xhc3NlZChcInVybC1yb3dcIix0cnVlKVxuXG4gICAgICB2YXIgdXJsX25hbWUgPSBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubmFtZVwiLFwiZGl2XCIpLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI2MHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm92ZXJmbG93XCIsXCJoaWRkZW5cIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG5cbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodXJsX25hbWUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgfSlcblxuICAgICAgZDNfY2xhc3ModXJsX25hbWUsXCJ1cmxcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtb3ZlcmZsb3dcIixcImVsbGlwc2lzXCIpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyMDVweFwiKVxuICAgICAgICAudGV4dCh4ID0+IHtcbiAgICAgICAgICByZXR1cm4geC51cmwuc3BsaXQoZC5kb21haW4pWzFdIHx8IHgudXJsXG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKFwiaHJlZlwiLCB4ID0+IHgudXJsIClcbiAgICAgICAgLmF0dHIoXCJ0YXJnZXRcIiwgXCJfYmxhbmtcIilcblxuICAgICAgZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm51bWJlclwiLFwiZGl2XCIpLmNsYXNzZWQoXCJudW1iZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNDBweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxM3B4XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b3RhbCB9KVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5wbG90XCIsXCJzdmdcIikuY2xhc3NlZChcInBsb3RcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTQ0cHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgdmFyIHZhbHVlcyA9IHgudmFsdWVcbiAgICAgICAgICBzaW1wbGVUaW1lc2VyaWVzKGR0aGlzLHZhbHVlcywxNDQsMjApXG5cbiAgICAgICAgfSlcblxuXG4gICAgICB2YXIgZXhwYW5zaW9uID0gZDNfY2xhc3MoZXhwYW5zaW9uX3JvdyxcImV4cGFuc2lvbi1rd3NcIilcbiAgICAgICAgLmNsYXNzZWQoXCJzY3JvbGxib3hcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cblxuICAgICAgICAuc3R5bGUoXCJtYXgtaGVpZ2h0XCIsXCIyNTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwic2Nyb2xsXCIpXG5cbiAgICAgIGV4cGFuc2lvbi5odG1sKFwiXCIpXG5cblxuICAgICAgdmFyIHVybF9yb3cgPSBkM19zcGxhdChleHBhbnNpb24sXCIudXJsLXJvd1wiLFwiZGl2XCIsa3dfdG9fZHJhdy5zbGljZSgwLDUwMCksZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ1cmwtcm93XCIsdHJ1ZSlcblxuICAgICAgdmFyIHVybF9uYW1lID0gZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm5hbWVcIixcImRpdlwiKS5jbGFzc2VkKFwibmFtZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJvdmVyZmxvd1wiLFwiaGlkZGVuXCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKHVybF9uYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAuYXR0cihcInR5cGVcIixcImNoZWNrYm94XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgIH0pXG5cbiAgICAgIGQzX2NsYXNzKHVybF9uYW1lLFwidXJsXCIpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LW92ZXJmbG93XCIsXCJlbGxpcHNpc1wiKVxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjA1cHhcIilcbiAgICAgICAgLnRleHQoeCA9PiB7XG4gICAgICAgICAgcmV0dXJuIHgua2V5XG4gICAgICAgIH0pXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5udW1iZXJcIixcImRpdlwiKS5jbGFzc2VkKFwibnVtYmVyXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTNweFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG90YWwgfSlcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIucGxvdFwiLFwic3ZnXCIpLmNsYXNzZWQoXCJwbG90XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE0NHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAgIHZhciB2YWx1ZXMgPSB4LnZhbHVlc1xuICAgICAgICAgIHNpbXBsZVRpbWVzZXJpZXMoZHRoaXMsdmFsdWVzLDE0NCwyMClcblxuICAgICAgICB9KVxuXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuZXhwb3J0IGRlZmF1bHQgZG9tYWluX2V4cGFuZGVkO1xuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gRG9tYWluQnVsbGV0KHRhcmdldCkge1xuICB0aGlzLl9vbiA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRvbWFpbl9idWxsZXQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRG9tYWluQnVsbGV0KHRhcmdldClcbn1cblxuRG9tYWluQnVsbGV0LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIG1heDogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcIm1heFwiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgd2lkdGggPSAodGhpcy50YXJnZXQuc3R5bGUoXCJ3aWR0aFwiKS5yZXBsYWNlKFwicHhcIixcIlwiKSB8fCB0aGlzLm9mZnNldFdpZHRoKSAtIDUwXG4gICAgICAgICwgaGVpZ2h0ID0gMjg7XG5cbiAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgLnJhbmdlKFswLCB3aWR0aF0pXG4gICAgICAgIC5kb21haW4oWzAsIHRoaXMubWF4KCldKVxuXG4gICAgICBpZiAodGhpcy50YXJnZXQudGV4dCgpKSB0aGlzLnRhcmdldC50ZXh0KFwiXCIpXG5cbiAgICAgIHZhciBidWxsZXQgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmJ1bGxldFwiLFwiZGl2XCIsdGhpcy5kYXRhKCksZnVuY3Rpb24oeCkgeyByZXR1cm4gMSB9KVxuICAgICAgICAuY2xhc3NlZChcImJ1bGxldFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjNweFwiKVxuXG4gICAgICB2YXIgc3ZnID0gZDNfdXBkYXRlYWJsZShidWxsZXQsXCJzdmdcIixcInN2Z1wiLGZhbHNlLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIDF9KVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsd2lkdGgpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsaGVpZ2h0KVxuICBcbiAgIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTFcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItMVwiLHRydWUpXG4gICAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24oZCkge3JldHVybiB4KGQucG9wX3BlcmNlbnQpIH0pXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsXCIjODg4XCIpXG4gIFxuICAgICAgZDNfdXBkYXRlYWJsZShzdmcsXCIuYmFyLTJcIixcInJlY3RcIixmYWxzZSxmdW5jdGlvbih4KSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJiYXItMlwiLHRydWUpXG4gICAgICAgIC5hdHRyKFwieFwiLDApXG4gICAgICAgIC5hdHRyKFwieVwiLGhlaWdodC80KVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uKGQpIHtyZXR1cm4geChkLnNhbXBsZV9wZXJjZW50X25vcm0pIH0pXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodC8yKVxuICAgICAgICAuYXR0cihcImZpbGxcIixcInJnYig4LCAyOSwgODgpXCIpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IGhlYWRlciBmcm9tICcuLi9nZW5lcmljL2hlYWRlcidcbmltcG9ydCAqIGFzIHRpbWVzZXJpZXMgZnJvbSAnLi4vdGltZXNlcmllcydcblxuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0IGRvbWFpbl9leHBhbmRlZCBmcm9tICcuL2RvbWFpbl9leHBhbmRlZCdcbmltcG9ydCBkb21haW5fYnVsbGV0IGZyb20gJy4vZG9tYWluX2J1bGxldCdcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5mdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmZ1bmN0aW9uIGtleSh4KSB7IHJldHVybiB4LmtleSB9XG5cblxuZXhwb3J0IGZ1bmN0aW9uIERvbWFpblZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkb21haW5fdmlldyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBEb21haW5WaWV3KHRhcmdldClcbn1cblxuRG9tYWluVmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBvcHRpb25zOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwib3B0aW9uc1wiLHZhbCkgXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdmFyIF9leHBsb3JlID0gdGhpcy50YXJnZXRcbiAgICAgICAgLCB0YWJzID0gdGhpcy5vcHRpb25zKClcbiAgICAgICAgLCBkYXRhID0gdGhpcy5kYXRhKClcbiAgICAgICAgLCBmaWx0ZXJlZCA9IHRhYnMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5zZWxlY3RlZH0pXG4gICAgICAgICwgc2VsZWN0ZWQgPSBmaWx0ZXJlZC5sZW5ndGggPyBmaWx0ZXJlZFswXSA6IHRhYnNbMF1cblxuICAgICAgaGVhZGVyKF9leHBsb3JlKVxuICAgICAgICAudGV4dChzZWxlY3RlZC5rZXkgKVxuICAgICAgICAub3B0aW9ucyh0YWJzKVxuICAgICAgICAub24oXCJzZWxlY3RcIiwgZnVuY3Rpb24oeCkgeyB0aGlzLm9uKFwic2VsZWN0XCIpKHgpIH0uYmluZCh0aGlzKSlcbiAgICAgICAgLmRyYXcoKVxuXG4gICAgICBcblxuICAgICAgX2V4cGxvcmUuc2VsZWN0QWxsKFwiLnZlbmRvci1kb21haW5zLWJhci1kZXNjXCIpLnJlbW92ZSgpXG4gICAgICBfZXhwbG9yZS5kYXR1bShkYXRhKVxuXG4gICAgICB2YXIgdCA9IHRhYmxlKF9leHBsb3JlKVxuICAgICAgICAuZGF0YShzZWxlY3RlZClcblxuXG4gICAgICB2YXIgc2FtcF9tYXggPSBkMy5tYXgoc2VsZWN0ZWQudmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnNhbXBsZV9wZXJjZW50X25vcm19KVxuICAgICAgICAsIHBvcF9tYXggPSBkMy5tYXgoc2VsZWN0ZWQudmFsdWVzLGZ1bmN0aW9uKHgpe3JldHVybiB4LnBvcF9wZXJjZW50fSlcbiAgICAgICAgLCBtYXggPSBNYXRoLm1heChzYW1wX21heCxwb3BfbWF4KTtcblxuICAgICAgdC5oZWFkZXJzKFtcbiAgICAgICAgICAgIHtrZXk6XCJrZXlcIix2YWx1ZTpcIkRvbWFpblwiLGxvY2tlZDp0cnVlLHdpZHRoOlwiMTAwcHhcIn1cbiAgICAgICAgICAsIHtrZXk6XCJzYW1wbGVfcGVyY2VudFwiLHZhbHVlOlwiU2VnbWVudFwiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAgICwge2tleTpcInJlYWxfcG9wX3BlcmNlbnRcIix2YWx1ZTpcIkJhc2VsaW5lXCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICAgLCB7a2V5OlwicmF0aW9cIix2YWx1ZTpcIlJhdGlvXCIsc2VsZWN0ZWQ6ZmFsc2V9XG4gICAgICAgICAgLCB7a2V5OlwiaW1wb3J0YW5jZVwiLHZhbHVlOlwiSW1wb3J0YW5jZVwiLHNlbGVjdGVkOmZhbHNlfVxuICAgICAgICAgICwge2tleTpcInZhbHVlXCIsdmFsdWU6XCJTZWdtZW50IHZlcnN1cyBCYXNlbGluZVwiLGxvY2tlZDp0cnVlfVxuICAgICAgICBdKVxuICAgICAgICAuc29ydChcImltcG9ydGFuY2VcIilcbiAgICAgICAgLm9wdGlvbl90ZXh0KFwiJiM2NTI5MTtcIilcbiAgICAgICAgLm9uKFwiZXhwYW5kXCIsZnVuY3Rpb24oZCkge1xuXG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInRkLm9wdGlvbi1oZWFkZXJcIikuaHRtbChcIiZuZGFzaDtcIilcbiAgICAgICAgICBpZiAodGhpcy5uZXh0U2libGluZyAmJiBkMy5zZWxlY3QodGhpcy5uZXh0U2libGluZykuY2xhc3NlZChcImV4cGFuZGVkXCIpID09IHRydWUpIHtcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImIzY1MjkxO1wiKVxuICAgICAgICAgICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgICAgICAgIHZhciB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcbiAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHQsIHRoaXMubmV4dFNpYmxpbmcpOyAgXG5cbiAgICAgICAgICB2YXIgdHIgPSBkMy5zZWxlY3QodCkuY2xhc3NlZChcImV4cGFuZGVkXCIsdHJ1ZSkuZGF0dW0oe30pXG4gICAgICAgICAgdmFyIHRkID0gZDNfdXBkYXRlYWJsZSh0cixcInRkXCIsXCJ0ZFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsdGhpcy5jaGlsZHJlbi5sZW5ndGgpXG4gICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgICAgIHZhciBkZCA9IHRoaXMucGFyZW50RWxlbWVudC5fX2RhdGFfXy5mdWxsX3VybHMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHguZG9tYWluID09IGQua2V5fSlcbiAgICAgICAgICB2YXIgcm9sbGVkID0gdGltZXNlcmllcy5wcmVwRGF0YShkZClcbiAgICAgICAgICBcbiAgICAgICAgICBkb21haW5fZXhwYW5kZWQodGQpXG4gICAgICAgICAgICAucmF3KGRkKVxuICAgICAgICAgICAgLmRhdGEocm9sbGVkKVxuICAgICAgICAgICAgLnVybHMoZC51cmxzKVxuICAgICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSh4KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5kcmF3KClcblxuICAgICAgICB9KVxuICAgICAgICAuaGlkZGVuX2ZpZWxkcyhbXCJ1cmxzXCIsXCJwZXJjZW50X3VuaXF1ZVwiLFwic2FtcGxlX3BlcmNlbnRfbm9ybVwiLFwicG9wX3BlcmNlbnRcIixcInRmX2lkZlwiLFwicGFyZW50X2NhdGVnb3J5X25hbWVcIl0pXG4gICAgICAgIC5yZW5kZXIoXCJyYXRpb1wiLGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICB0aGlzLmlubmVyVGV4dCA9IE1hdGgudHJ1bmModGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fLnJhdGlvKjEwMCkvMTAwICsgXCJ4XCJcbiAgICAgICAgfSlcbiAgICAgICAgLnJlbmRlcihcInZhbHVlXCIsZnVuY3Rpb24oZCkge1xuXG4gICAgICAgICAgZG9tYWluX2J1bGxldChkMy5zZWxlY3QodGhpcykpXG4gICAgICAgICAgICAubWF4KG1heClcbiAgICAgICAgICAgIC5kYXRhKHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXylcbiAgICAgICAgICAgIC5kcmF3KClcblxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgIHQuZHJhdygpXG4gICAgIFxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn1cbiIsImltcG9ydCB7ZDNfdXBkYXRlYWJsZSwgZDNfc3BsYXR9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgYWNjZXNzb3IgZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCBoZWFkZXIgZnJvbSAnLi4vZ2VuZXJpYy9oZWFkZXInXG5pbXBvcnQgYnV0dG9uX3JhZGlvIGZyb20gJy4uL2dlbmVyaWMvYnV0dG9uX3JhZGlvJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuZnVuY3Rpb24gaWRlbnRpdHkoeCkgeyByZXR1cm4geCB9XG5mdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5mdW5jdGlvbiBzaW1wbGVCYXIod3JhcCx2YWx1ZSxzY2FsZSxjb2xvcikge1xuXG4gIHZhciBoZWlnaHQgPSAyMFxuICAgICwgd2lkdGggPSB3cmFwLnN0eWxlKFwid2lkdGhcIikucmVwbGFjZShcInB4XCIsXCJcIilcblxuICB2YXIgY2FudmFzID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwic3ZnXCIsXCJzdmdcIixbdmFsdWVdLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgLnN0eWxlKFwid2lkdGhcIix3aWR0aCtcInB4XCIpXG4gICAgLnN0eWxlKFwiaGVpZ2h0XCIsaGVpZ2h0K1wicHhcIilcblxuXG4gIHZhciBjaGFydCA9IGQzX3VwZGF0ZWFibGUoY2FudmFzLCdnLmNoYXJ0JywnZycsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxIH0pXG4gICAgLmF0dHIoXCJjbGFzc1wiLFwiY2hhcnRcIilcbiAgXG4gIHZhciBiYXJzID0gZDNfc3BsYXQoY2hhcnQsXCIucG9wLWJhclwiLFwicmVjdFwiLGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHh9LCBmdW5jdGlvbih4LGkpIHsgcmV0dXJuIGkgfSlcbiAgICAuYXR0cihcImNsYXNzXCIsXCJwb3AtYmFyXCIpXG4gICAgLmF0dHIoJ2hlaWdodCcsaGVpZ2h0LTQpXG4gICAgLmF0dHIoeyd4JzowLCd5JzowfSlcbiAgICAuc3R5bGUoJ2ZpbGwnLGNvbG9yKVxuICAgIC5hdHRyKFwid2lkdGhcIixmdW5jdGlvbih4KSB7IHJldHVybiBzY2FsZSh4KSB9KVxuXG5cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gU2VnbWVudFZpZXcodGFyZ2V0KSB7XG4gIHRoaXMuX29uID0ge1xuICAgIHNlbGVjdDogbm9vcFxuICB9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzZWdtZW50X3ZpZXcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU2VnbWVudFZpZXcodGFyZ2V0KVxufVxuXG5TZWdtZW50Vmlldy5wcm90b3R5cGUgPSB7XG4gICAgZGF0YTogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIFxuICAgIH1cbiAgLCBzZWdtZW50czogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInNlZ21lbnRzXCIsdmFsKSBcbiAgICB9XG4gICwgZHJhdzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciB3cmFwID0gZDNfdXBkYXRlYWJsZSh0aGlzLnRhcmdldCxcIi5zZWdtZW50LXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNlZ21lbnQtd3JhcFwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTQwcHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIix0aGlzLnRhcmdldC5zdHlsZShcIndpZHRoXCIpKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcbiAgICAgICAgLnN0eWxlKFwiei1pbmRleFwiLFwiMzAwXCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIiNmMGY0ZjdcIilcblxuXG4gICAgICBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLnNlZ21lbnQtd3JhcC1zcGFjZXJcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInNlZ21lbnQtd3JhcC1zcGFjZXJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIix3cmFwLnN0eWxlKFwiaGVpZ2h0XCIpKVxuXG5cbiAgICAgIGhlYWRlcih3cmFwKVxuICAgICAgICAuYnV0dG9ucyhbXG4gICAgICAgICAgICB7Y2xhc3M6IFwic2F2ZWQtc2VhcmNoXCIsIGljb246IFwiZmEtZm9sZGVyLW9wZW4tbyBmYVwiLCB0ZXh0OiBcIk9wZW4gU2F2ZWRcIn1cbiAgICAgICAgICAsIHtjbGFzczogXCJuZXctc2F2ZWQtc2VhcmNoXCIsIGljb246IFwiZmEtYm9va21hcmsgZmFcIiwgdGV4dDogXCJTYXZlXCJ9XG4gICAgICAgICAgLCB7Y2xhc3M6IFwiY3JlYXRlXCIsIGljb246IFwiZmEtcGx1cy1jaXJjbGUgZmFcIiwgdGV4dDogXCJOZXcgU2VnbWVudFwifVxuICAgICAgICAgICwge2NsYXNzOiBcImxvZ291dFwiLCBpY29uOiBcImZhLXNpZ24tb3V0IGZhXCIsIHRleHQ6IFwiTG9nb3V0XCJ9XG4gICAgICAgIF0pXG4gICAgICAgIC5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiLCB0aGlzLm9uKFwic2F2ZWQtc2VhcmNoLmNsaWNrXCIpKVxuICAgICAgICAub24oXCJsb2dvdXQuY2xpY2tcIiwgZnVuY3Rpb24oKSB7IHdpbmRvdy5sb2NhdGlvbiA9IFwiL2xvZ291dFwiIH0pXG4gICAgICAgIC5vbihcImNyZWF0ZS5jbGlja1wiLCBmdW5jdGlvbigpIHsgd2luZG93LmxvY2F0aW9uID0gXCIvc2VnbWVudHNcIiB9KVxuICAgICAgICAub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIsIHRoaXMub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIpKVxuICAgICAgICAudGV4dChcIlNlZ21lbnRcIikuZHJhdygpICAgICAgXG5cblxuICAgICAgd3JhcC5zZWxlY3RBbGwoXCIuaGVhZGVyLWJvZHlcIilcbiAgICAgICAgLmNsYXNzZWQoXCJoaWRkZW5cIiwhdGhpcy5faXNfbG9hZGluZylcbiAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIi00MHB4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmRcIixcIm5vbmVcIilcbiAgICAgICAgLmh0bWwoXCI8aW1nIHNyYz0nL3N0YXRpYy9pbWcvZ2VuZXJhbC9sb2dvLXNtYWxsLmdpZicgc3R5bGU9J2hlaWdodDoxNXB4Jy8+IGxvYWRpbmcuLi5cIilcblxuXG4gICAgICBpZiAodGhpcy5fZGF0YSA9PSBmYWxzZSkgcmV0dXJuXG5cbiAgICAgIHZhciBib2R5ID0gZDNfdXBkYXRlYWJsZSh3cmFwLFwiLmJvZHlcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJvZHlcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJjbGVhclwiLFwiYm90aFwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcImZsZXgtZGlyZWN0aW9uXCIsXCJjb2x1bW5cIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiLTE1cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMzBweFwiKVxuICAgICAgICBcblxuICAgICAgdmFyIHJvdzEgPSBkM191cGRhdGVhYmxlKGJvZHksXCIucm93LTFcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcInJvdy0xXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLDEpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleC1kaXJlY3Rpb25cIixcInJvd1wiKVxuXG4gICAgICB2YXIgcm93MiA9IGQzX3VwZGF0ZWFibGUoYm9keSxcIi5yb3ctMlwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicm93LTJcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsMSlcbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4LWRpcmVjdGlvblwiLFwicm93XCIpXG5cblxuICAgICAgdmFyIGlubmVyID0gZDNfdXBkYXRlYWJsZShyb3cxLFwiLmFjdGlvbi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgYWN0aW9uXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJmbGV4XCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICB2YXIgaW5uZXJfZGVzYyA9IGQzX3VwZGF0ZWFibGUocm93MSxcIi5hY3Rpb24uaW5uZXItZGVzY1wiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXItZGVzYyBhY3Rpb25cIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiMHB4XCIpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcixcImgzXCIsXCJoM1wiKVxuICAgICAgICAudGV4dChcIkNob29zZSBTZWdtZW50XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpblwiLFwiMHB4XCIpXG4gICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2UzZWJmMFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG5cblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyLFwiZGl2LmNvbG9yXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb2xvclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcIiMwODFkNThcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG5cblxuXG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgc2VsZWN0KGlubmVyKVxuICAgICAgICAub3B0aW9ucyh0aGlzLl9zZWdtZW50cylcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGYub24oXCJjaGFuZ2VcIikuYmluZCh0aGlzKSh4KVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0ZWQodGhpcy5fYWN0aW9uLnZhbHVlIHx8IDApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgXG5cblxuXG4gICAgICB2YXIgY2FsID0gZDNfdXBkYXRlYWJsZShpbm5lcixcImEuZmEtY2FsZW5kYXJcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgICAgLmNsYXNzZWQoXCJmYSBmYS1jYWxlbmRhclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjYWxzZWwubm9kZSgpXG4gICAgICAgIH0pXG5cbiAgICAgIFxuICAgICAgdmFyIGNhbHNlbCA9IHNlbGVjdChjYWwpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIlRvZGF5XCIsXCJ2YWx1ZVwiOjB9LHtcImtleVwiOlwiWWVzdGVyZGF5XCIsXCJ2YWx1ZVwiOjF9LHtcImtleVwiOlwiNyBkYXlzIGFnb1wiLFwidmFsdWVcIjo3fV0pXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIpLmJpbmQodGhpcykoeC52YWx1ZSlcbiAgICAgICAgfSlcbiAgICAgICAgLnNlbGVjdGVkKHRoaXMuX2FjdGlvbl9kYXRlIHx8IDApXG4gICAgICAgIC5kcmF3KClcbiAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xOHB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzRweFwiKVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsXCIuMDFcIilcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwibm9uZVwiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXJcIixcIm5vbmVcIilcblxuICAgICAgXG5cbiAgICAgIHZhciBpbm5lcjIgPSBkM191cGRhdGVhYmxlKHJvdzIsXCIuY29tcGFyaXNvbi5pbm5lclwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiaW5uZXIgY29tcGFyaXNvblwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWJvdHRvbVwiLFwiMHB4XCIpXG5cbiAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiZmxleFwiKVxuXG4gICAgICB2YXIgaW5uZXJfZGVzYzIgPSBkM191cGRhdGVhYmxlKHJvdzIsXCIuY29tcGFyaXNvbi1kZXNjLmlubmVyXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJpbm5lciBjb21wYXJpc29uLWRlc2NcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmdcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjBweFwiKVxuXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImZsZXhcIilcblxuICAgICAgLy9kM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCJoM1wiLFwiaDNcIilcbiAgICAgIC8vICAudGV4dChcIihGaWx0ZXJzIGFwcGxpZWQgdG8gdGhpcyBzZWdtZW50KVwiKVxuICAgICAgLy8gIC5zdHlsZShcIm1hcmdpblwiLFwiMTBweFwiKVxuICAgICAgLy8gIC5zdHlsZShcImNvbG9yXCIsXCJpbmhlcml0XCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgIC8vICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAvLyAgLnN0eWxlKFwiZmxleFwiLFwiMVwiKVxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MsXCIuYmFyLXdyYXAtdGl0bGVcIixcImgzXCIpLmNsYXNzZWQoXCJiYXItd3JhcC10aXRsZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG5cblxuICAgICAgICAudGV4dChcInZpZXdzXCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCIuYmFyLXdyYXAtdGl0bGVcIixcImgzXCIpLmNsYXNzZWQoXCJiYXItd3JhcC10aXRsZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcIjBweFwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzJweFwiKVxuICAgICAgICAuc3R5bGUoXCJjb2xvclwiLFwiaW5oZXJpdFwiKVxuICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIycHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG5cblxuXG4gICAgICAgIC50ZXh0KFwidmlld3NcIilcblxuXG5cbiAgICAgIHZhciBiYXJfc2FtcCA9IGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcImRpdi5iYXItd3JhcFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiYmFyLXdyYXBcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiOHB4XCIpXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYyxcIi5iYXItd3JhcC1zcGFjZVwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1zcGFjZVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjEgMSAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnRleHQoZDMuZm9ybWF0KFwiLFwiKSh0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSkpXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcl9kZXNjLFwiLmJhci13cmFwLW9wdFwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1vcHRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLy8udGV4dChcImFwcGx5IGZpbHRlcnM/XCIpXG5cblxuXG4gICAgICB2YXIgeHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgLmRvbWFpbihbMCxNYXRoLm1heCh0aGlzLl9kYXRhLnZpZXdzLnNhbXBsZSwgdGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uKV0pXG4gICAgICAgIC5yYW5nZShbMCxiYXJfc2FtcC5zdHlsZShcIndpZHRoXCIpXSlcblxuXG4gICAgICB2YXIgYmFyX3BvcCA9IGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCJkaXYuYmFyLXdyYXBcIixcImRpdlwiKVxuICAgICAgICAuY2xhc3NlZChcImJhci13cmFwXCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwiZmxleFwiLFwiMiAxIDAlXCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjhweFwiKVxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXJfZGVzYzIsXCIuYmFyLXdyYXAtc3BhY2VcIixcImRpdlwiKS5jbGFzc2VkKFwiYmFyLXdyYXAtc3BhY2VcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIxIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1sZWZ0XCIsXCIxMHB4XCIpXG4gICAgICAgIC50ZXh0KGQzLmZvcm1hdChcIixcIikodGhpcy5fZGF0YS52aWV3cy5wb3B1bGF0aW9uKSlcblxuXG4gICAgICBkM191cGRhdGVhYmxlKGlubmVyX2Rlc2MyLFwiLmJhci13cmFwLW9wdFwiLFwiZGl2XCIpLmNsYXNzZWQoXCJiYXItd3JhcC1vcHRcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCIyIDEgMCVcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcInJpZ2h0XCIpXG4gICAgICAgIC5odG1sKFwiYXBwbHkgZmlsdGVycz8gPGlucHV0IHR5cGU9J2NoZWNrYm94Jz48L2lucHV0PlwiKVxuXG5cblxuICAgICAgc2ltcGxlQmFyKGJhcl9zYW1wLHRoaXMuX2RhdGEudmlld3Muc2FtcGxlLHhzY2FsZSxcIiMwODFkNThcIilcbiAgICAgIHNpbXBsZUJhcihiYXJfcG9wLHRoaXMuX2RhdGEudmlld3MucG9wdWxhdGlvbix4c2NhbGUsXCJncmV5XCIpXG5cblxuXG5cblxuXG5cblxuXG5cblxuICAgICAgZDNfdXBkYXRlYWJsZShpbm5lcjIsXCJoM1wiLFwiaDNcIilcbiAgICAgICAgLnRleHQoXCJDb21wYXJlIEFnYWluc3RcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjMycHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiY29sb3JcIixcImluaGVyaXRcIilcbiAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCJpbmhlcml0XCIpXG4gICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgIC5zdHlsZShcImZsZXhcIixcIjFcIilcbiAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZTNlYmYwXCIpXG4gICAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMTBweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjEwMCVcIilcblxuXG5cbiAgICAgIGQzX3VwZGF0ZWFibGUoaW5uZXIyLFwiZGl2LmNvbG9yXCIsXCJkaXZcIilcbiAgICAgICAgLmNsYXNzZWQoXCJjb2xvclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixcImdyZXlcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzMnB4XCIpXG4gICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjJweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIi0xMHB4XCIpXG5cblxuXG5cblxuXG5cblxuICAgICAgc2VsZWN0KGlubmVyMilcbiAgICAgICAgLm9wdGlvbnMoW3tcImtleVwiOlwiQ3VycmVudCBTZWdtZW50ICh3aXRob3V0IGZpbHRlcnMpXCIsXCJ2YWx1ZVwiOmZhbHNlfV0uY29uY2F0KHRoaXMuX3NlZ21lbnRzKSApXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcblxuICAgICAgICAgIHNlbGYub24oXCJjb21wYXJpc29uLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9jb21wYXJpc29uLnZhbHVlIHx8IDApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgdmFyIGNhbDIgPSBkM191cGRhdGVhYmxlKGlubmVyMixcImEuZmEtY2FsZW5kYXJcIixcImFcIilcbiAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM0cHhcIilcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjM2cHhcIilcbiAgICAgICAgLnN0eWxlKFwiYm9yZGVyXCIsXCIxcHggc29saWQgI2NjY1wiKVxuICAgICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgICAgLmNsYXNzZWQoXCJmYSBmYS1jYWxlbmRhclwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiNXB4XCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBjYWxzZWwyLm5vZGUoKVxuICAgICAgICB9KVxuXG4gICAgICBcbiAgICAgIHZhciBjYWxzZWwyID0gc2VsZWN0KGNhbDIpXG4gICAgICAgIC5vcHRpb25zKFt7XCJrZXlcIjpcIlRvZGF5XCIsXCJ2YWx1ZVwiOjB9LHtcImtleVwiOlwiWWVzdGVyZGF5XCIsXCJ2YWx1ZVwiOjF9LHtcImtleVwiOlwiNyBkYXlzIGFnb1wiLFwidmFsdWVcIjo3fV0pXG4gICAgICAgIC5vbihcInNlbGVjdFwiLCBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxmLm9uKFwiY29tcGFyaXNvbl9kYXRlLmNoYW5nZVwiKS5iaW5kKHRoaXMpKHgudmFsdWUpXG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RlZCh0aGlzLl9jb21wYXJpc29uX2RhdGUgfHwgMClcbiAgICAgICAgLmRyYXcoKVxuICAgICAgICAuX3NlbGVjdFxuICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMThweFwiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiLTE4cHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNHB4XCIpXG4gICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIixcIi4wMVwiKVxuICAgICAgICAuc3R5bGUoXCJmbGV4XCIsXCJub25lXCIpXG4gICAgICAgIC5zdHlsZShcImJvcmRlclwiLFwibm9uZVwiKVxuXG5cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICwgYWN0aW9uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25fZGF0ZVwiLHZhbClcbiAgICB9XG4gICwgYWN0aW9uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uXCIsdmFsKVxuICAgIH1cbiAgLCBjb21wYXJpc29uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uX2RhdGVcIix2YWwpXG4gICAgfVxuXG4gICwgY29tcGFyaXNvbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImNvbXBhcmlzb25cIix2YWwpXG4gICAgfVxuICAsIGlzX2xvYWRpbmc6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJpc19sb2FkaW5nXCIsdmFsKVxuICAgIH1cblxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxufVxuXG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHtzaW1wbGVUaW1lc2VyaWVzfSBmcm9tICcuL3N1bW1hcnlfdmlldydcblxudmFyIGJ1Y2tldHMgPSBbMTAsMzAsNjAsMTIwLDE4MCwzNjAsNzIwLDE0NDAsMjg4MCw1NzYwLDEwMDgwXS5yZXZlcnNlKCkubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZyh4KjYwKSB9KVxuYnVja2V0cyA9IGJ1Y2tldHMuY29uY2F0KFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiBTdHJpbmcoLXgqNjApIH0pKVxuXG5cbmZ1bmN0aW9uIG5vb3AoKXt9XG5cbmZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSxkYXRhKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5cIiArIGNscywgdHlwZSB8fCBcImRpdlwiLGRhdGEpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cbmZ1bmN0aW9uIGNhbGNDYXRlZ29yeShiZWZvcmVfdXJscyxhZnRlcl91cmxzKSB7XG4gIHZhciB1cmxfY2F0ZWdvcnkgPSBiZWZvcmVfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgIHBbYy51cmxdID0gYy5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgIHJldHVybiBwXG4gIH0se30pXG5cbiAgdXJsX2NhdGVnb3J5ID0gYWZ0ZXJfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgIHBbYy51cmxdID0gYy5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgIHJldHVybiBwXG4gIH0sdXJsX2NhdGVnb3J5KVxuXG4gIHJldHVybiB1cmxfY2F0ZWdvcnlcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZWZpbmUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgUmVmaW5lKHRhcmdldClcbn1cblxuY2xhc3MgUmVmaW5lIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICB9XG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9XG4gIHN0YWdlcyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzdGFnZXNcIix2YWwpIH1cblxuICBiZWZvcmVfdXJscyh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiZWZvcmVfdXJsc1wiLHZhbCkgfVxuICBhZnRlcl91cmxzKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImFmdGVyX3VybHNcIix2YWwpIH1cblxuXG5cbiAgb24oYWN0aW9uLCBmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZHJhdygpIHtcblxuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgdmFyIHRkID0gdGhpcy5fdGFyZ2V0XG4gICAgdmFyIGJlZm9yZV91cmxzID0gdGhpcy5fYmVmb3JlX3VybHNcbiAgICAgICwgYWZ0ZXJfdXJscyA9IHRoaXMuX2FmdGVyX3VybHNcbiAgICAgICwgZCA9IHRoaXMuX2RhdGFcbiAgICAgICwgc3RhZ2VzID0gdGhpcy5fc3RhZ2VzXG5cblxuICAgIHZhciB1cmxfY2F0ZWdvcnkgPSBjYWxjQ2F0ZWdvcnkoYmVmb3JlX3VybHMsYWZ0ZXJfdXJscylcblxuXG4gICAgICAgICAgdmFyIHVybF92b2x1bWUgPSBiZWZvcmVfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICAgICAgcFtjLnVybF0gPSAocFtjLnVybF0gfHwgMCkgKyBjLnZpc2l0c1xuICAgICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgICB9LHt9KVxuXG4gICAgICAgICAgdXJsX3ZvbHVtZSA9IGFmdGVyX3VybHMucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgICAgIHBbYy51cmxdID0gKHBbYy51cmxdIHx8IDApICsgYy52aXNpdHNcbiAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgfSx1cmxfdm9sdW1lKVxuXG5cblxuICAgICAgICAgIHZhciBzb3J0ZWRfdXJscyA9IGQzLmVudHJpZXModXJsX3ZvbHVtZSkuc29ydCgocCxjKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZDMuZGVzY2VuZGluZyhwLnZhbHVlLGMudmFsdWUpXG4gICAgICAgICAgfSlcblxuXG4gICAgICAgICAgdmFyIGJlZm9yZV91cmxfdHMgPSBiZWZvcmVfdXJscy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICAgICAgcFtjLnVybF0gPSBwW2MudXJsXSB8fCB7fVxuICAgICAgICAgICAgcFtjLnVybF1bXCJ1cmxcIl0gPSBjLnVybFxuXG4gICAgICAgICAgICBwW2MudXJsXVtjLnRpbWVfZGlmZl9idWNrZXRdID0gYy52aXNpdHNcbiAgICAgICAgICAgIHJldHVybiBwXG4gICAgICAgICAgfSx7fSlcblxuICAgICAgICAgIHZhciBhZnRlcl91cmxfdHMgPSBhZnRlcl91cmxzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgICAgICBwW2MudXJsXSA9IHBbYy51cmxdIHx8IHt9XG4gICAgICAgICAgICBwW2MudXJsXVtcInVybFwiXSA9IGMudXJsXG5cbiAgICAgICAgICAgIHBbYy51cmxdW1wiLVwiICsgYy50aW1lX2RpZmZfYnVja2V0XSA9IGMudmlzaXRzXG4gICAgICAgICAgICByZXR1cm4gcFxuICAgICAgICAgIH0sYmVmb3JlX3VybF90cylcblxuXG5cbiAgICAgICAgICB2YXIgdG9fZHJhdyA9IHNvcnRlZF91cmxzLnNsaWNlKDAsMTAwMCkubWFwKHggPT4gYWZ0ZXJfdXJsX3RzW3gua2V5XSlcbi5tYXAoZnVuY3Rpb24oeCl7XG4gIHgudG90YWwgPSBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKVxuICByZXR1cm4geFxufSlcblxudmFyIGt3X3RvX2RyYXcgPSBkMy5lbnRyaWVzKGFmdGVyX3VybF90cykucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuXG4gIGMua2V5LnRvTG93ZXJDYXNlKCkuc3BsaXQoZC5kb21haW4pWzFdLnNwbGl0KFwiL1wiKS5yZXZlcnNlKClbMF0ucmVwbGFjZShcIl9cIixcIi1cIikuc3BsaXQoXCItXCIpLm1hcCh4ID0+IHtcbiAgICB2YXIgdmFsdWVzID0gW1widGhhdFwiLFwidGhpc1wiLFwid2hhdFwiLFwiYmVzdFwiLFwibW9zdFwiLFwiZnJvbVwiLFwieW91clwiLFwiaGF2ZVwiLFwiZmlyc3RcIixcIndpbGxcIixcInRoYW5cIixcInNheXNcIixcImxpa2VcIixcImludG9cIixcImFmdGVyXCIsXCJ3aXRoXCJdXG4gICAgaWYgKHgubWF0Y2goL1xcZCsvZykgPT0gbnVsbCAmJiB2YWx1ZXMuaW5kZXhPZih4KSA9PSAtMSAmJiB4LmluZGV4T2YoXCIsXCIpID09IC0xICYmIHguaW5kZXhPZihcIj9cIikgPT0gLTEgJiYgeC5pbmRleE9mKFwiLlwiKSA9PSAtMSAmJiB4LmluZGV4T2YoXCI6XCIpID09IC0xICYmIHBhcnNlSW50KHgpICE9IHggJiYgeC5sZW5ndGggPiAzKSB7XG4gICAgICBwW3hdID0gcFt4XSB8fCB7fVxuICAgICAgcFt4XS5rZXkgPSB4XG4gICAgICBPYmplY3Qua2V5cyhjLnZhbHVlKS5tYXAocSA9PiB7XG4gICAgICAgIHBbeF1bcV0gPSAocFt4XVtxXSB8fCAwKSArIGMudmFsdWVbcV1cbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiBwXG4gIH0pXG4gIHJldHVybiBwXG59LHt9KVxuXG5cbmt3X3RvX2RyYXcgPSBPYmplY3Qua2V5cyhrd190b19kcmF3KS5tYXAoZnVuY3Rpb24oaykgeyByZXR1cm4ga3dfdG9fZHJhd1trXSB9KS5tYXAoZnVuY3Rpb24oeCl7XG4gIHgudG90YWwgPSBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKVxuICByZXR1cm4geFxufSkuc29ydCgocCxjKSA9PiB7XG4gIHJldHVybiBjLnRvdGFsIC0gcC50b3RhbFxufSlcblxuXG5cblxuICAgICAgICAgIHZhciBzdW1tYXJ5X3JvdyA9IGQzX2NsYXNzKHRkLFwic3VtbWFyeS1yb3dcIikuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCIxNXB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwicmVsYXRpdmVcIilcbiAgICAgICAgICBkM19jbGFzcyh0ZCxcImFjdGlvbi1oZWFkZXJcIikuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIikuc3R5bGUoXCJmb250LXNpemVcIixcIjE2cHhcIikuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKS50ZXh0KFwiRXhwbG9yZSBhbmQgUmVmaW5lXCIpLnN0eWxlKFwicGFkZGluZ1wiLFwiMTBweFwiKVxuICAgICAgICAgIHZhciB0aXRsZV9yb3cgPSBkM19jbGFzcyh0ZCxcInRpdGxlLXJvd1wiKVxuXG4gICAgICAgICAgdmFyIGV4cGFuc2lvbl9yb3cgPSBkM19jbGFzcyh0ZCxcImV4cGFuc2lvbi1yb3dcIilcbiAgICAgICAgICB2YXIgZm9vdGVyX3JvdyA9IGQzX2NsYXNzKHRkLFwiZm9vdGVyLXJvd1wiKS5zdHlsZShcIm1pbi1oZWlnaHRcIixcIjEwcHhcIikuc3R5bGUoXCJtYXJnaW4tdG9wXCIsXCIxNXB4XCIpXG5cbiAgICAgICAgICBmdW5jdGlvbiBidWlsZEZpbHRlcklucHV0KHgpIHtcbiAgICAgICAgICAgICAgdGhpcy5vbihcInNvbWV0aGluZ1wiKSh4KVxuICAgICAgICAgICAgICAvL3NlbGVjdF92YWx1ZS52YWx1ZSArPSAoc2VsZWN0X3ZhbHVlLnZhbHVlID8gXCIsXCIgOiBcIlwiKSArIHgua2V5XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxNnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiNDBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWJvdHRvbVwiLFwiNXB4XCIpXG4gICAgICAgICAgICAudGV4dChcIkJlZm9yZSBhbmQgQWZ0ZXI6IFwiICsgZC5kb21haW4pXG5cbiAgICAgICAgICB2YXIgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgICAge1wia2V5XCI6XCJBbGxcIixcInZhbHVlXCI6XCJhbGxcIiwgXCJzZWxlY3RlZFwiOjF9XG4gICAgICAgICAgICAsIHtcImtleVwiOlwiQ29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcImNvbnNpZGVyYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgICAsIHtcImtleVwiOlwiVmFsaWRhdGlvblwiLFwidmFsdWVcIjpcInZhbGlkYXRpb25cIiwgXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgXVxuXG4gICAgICAgICAgdmFyIHRzdyA9IDI1MDtcblxuICAgICAgICAgIHZhciB0aW1lc2VyaWVzID0gZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJ0aW1lc2VyaWVzXCIsXCJzdmdcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImJsb2NrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW5cIixcImF1dG9cIilcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIix0c3cgKyBcInB4XCIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLFwiNzBweFwiKVxuXG5cblxuICAgICAgICAgIHZhciBiZWZvcmVfcm9sbHVwID0gZDMubmVzdCgpXG4gICAgICAgICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldH0pXG4gICAgICAgICAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGQzLnN1bSh4LHkgPT4geS52aXNpdHMpIH0pXG4gICAgICAgICAgICAubWFwKGJlZm9yZV91cmxzKVxuXG4gICAgICAgICAgdmFyIGFmdGVyX3JvbGx1cCA9IGQzLm5lc3QoKVxuICAgICAgICAgICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiBcIi1cIiArIHgudGltZV9kaWZmX2J1Y2tldH0pXG4gICAgICAgICAgICAucm9sbHVwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIGQzLnN1bSh4LHkgPT4geS52aXNpdHMpIH0pXG4gICAgICAgICAgICAubWFwKGFmdGVyX3VybHMpXG5cbiAgICAgICAgICB2YXIgb3ZlcmFsbF9yb2xsdXAgPSBidWNrZXRzLm1hcCh4ID0+IGJlZm9yZV9yb2xsdXBbeF0gfHwgYWZ0ZXJfcm9sbHVwW3hdIHx8IDApXG5cblxuXG4gICAgICAgICAgc2ltcGxlVGltZXNlcmllcyh0aW1lc2VyaWVzLG92ZXJhbGxfcm9sbHVwLHRzdylcbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwibWlkZGxlXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCA1NSlcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIHRzdy8yKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdHN3LzIpXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwibWlkZGxlLXRleHRcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCB0c3cvMilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCA2NylcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC50ZXh0KFwiT24tc2l0ZVwiKVxuXG5cbiAgICAgICAgICB2YXIgYmVmb3JlX3BvcywgYWZ0ZXJfcG9zO1xuXG4gICAgICAgICAgYnVja2V0cy5tYXAoZnVuY3Rpb24oeCxpKSB7XG4gICAgICAgICAgICAgaWYgKHN0YWdlcy5jb25zaWRlcmF0aW9uID09IHgpIGJlZm9yZV9wb3MgPSBpXG4gICAgICAgICAgICAgaWYgKHN0YWdlcy52YWxpZGF0aW9uID09IHgpIGFmdGVyX3BvcyA9IGlcblxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICB2YXIgdW5pdF9zaXplID0gdHN3L2J1Y2tldHMubGVuZ3RoXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYmVmb3JlXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMzkpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIDQ1KVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCB1bml0X3NpemUqYmVmb3JlX3BvcylcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKmJlZm9yZV9wb3MpXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYmVmb3JlLXRleHRcIixcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCB1bml0X3NpemUqYmVmb3JlX3BvcyAtIDgpXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgNDgpXG5cbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgICAgICAgIC50ZXh0KFwiQ29uc2lkZXJhdGlvblwiKVxuXG4gICAgICAgICAgZDNfY2xhc3ModGltZXNlcmllcyxcIndpbmRvd1wiLFwibGluZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgICAuYXR0cihcInkxXCIsIDQ1KVxuICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCA0NSlcbiAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgdW5pdF9zaXplKihiZWZvcmVfcG9zKSlcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkrMSlcblxuXG4gICAgICAgICAgZDNfY2xhc3ModGltZXNlcmllcyxcImFmdGVyXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgMzkpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIDQ1KVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCB1bml0X3NpemUqKGFmdGVyX3BvcysxKSlcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdW5pdF9zaXplKihhZnRlcl9wb3MrMSkpXG5cbiAgICAgICAgICBkM19jbGFzcyh0aW1lc2VyaWVzLFwiYWZ0ZXItdGV4dFwiLFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHVuaXRfc2l6ZSooYWZ0ZXJfcG9zKzEpICsgOClcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCA0OClcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJzdGFydFwiKVxuICAgICAgICAgICAgLnRleHQoXCJWYWxpZGF0aW9uXCIpXG5cblxuXG4gICAgICAgICAgZnVuY3Rpb24gc2VsZWN0T3B0aW9uUmVjdChvcHRpb25zKSB7XG5cbiAgICAgICAgICAgIHZhciBzdWJzZXQgPSB0ZC5zZWxlY3RBbGwoXCJzdmdcIikuc2VsZWN0QWxsKFwicmVjdFwiKVxuICAgICAgICAgICAgICAuYXR0cihcImZpbGxcIix1bmRlZmluZWQpLmZpbHRlcigoeCxpKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gb3B0aW9ucy5maWx0ZXIoeCA9PiB4LnNlbGVjdGVkKVswXS52YWx1ZVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcImFsbFwiKSByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJjb25zaWRlcmF0aW9uXCIpIHJldHVybiAoaSA8IGJlZm9yZV9wb3MpIHx8IChpID4gYnVja2V0cy5sZW5ndGgvMiAtIDEgKVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcInZhbGlkYXRpb25cIikgcmV0dXJuIChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKVxuICAgICAgICAgICAgICB9KVxuXG5cbiAgICAgICAgICAgIHN1YnNldC5hdHRyKFwiZmlsbFwiLFwiZ3JleVwiKVxuICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICBzZWxlY3RPcHRpb25SZWN0KG9wdGlvbnMpXG5cbiAgICAgICAgICB2YXIgb3B0cyA9IGQzX2NsYXNzKHN1bW1hcnlfcm93LFwib3B0aW9uc1wiLFwiZGl2XCIsb3B0aW9ucylcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImFic29sdXRlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRvcFwiLFwiMzVweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibGVmdFwiLFwiMjAwcHhcIilcblxuXG4gICAgICAgICAgZnVuY3Rpb24gYnVpbGRPcHRpb25zKG9wdGlvbnMpIHtcblxuXG4gICAgICAgICAgICBkM19zcGxhdChvcHRzLFwiLnNob3ctYnV0dG9uXCIsXCJhXCIsb3B0aW9ucyx4ID0+IHgua2V5KVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInNob3ctYnV0dG9uXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLHggPT4geC5zZWxlY3RlZClcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjE4cHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEwMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tYm90dG9tXCIsXCI1cHhcIilcbiAgICAgICAgICAgICAgLnRleHQoeCA9PiB4LmtleSlcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJlbnROb2RlLl9fZGF0YV9fLm1hcCh6ID0+IHouc2VsZWN0ZWQgPSAwKVxuICAgICAgICAgICAgICAgIHguc2VsZWN0ZWQgPSAxXG4gICAgICAgICAgICAgICAgYnVpbGRPcHRpb25zKHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXylcbiAgICAgICAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcImNvbnNpZGVyYXRpb25cIikge1xuICAgICAgICAgICAgICAgICAgYnVpbGRVcmxTZWxlY3Rpb24oY29uc2lkZXJhdGlvbl90b19kcmF3KVxuICAgICAgICAgICAgICAgICAgYnVpbGRLZXl3b3JkU2VsZWN0aW9uKGNvbnNpZGVyYXRpb25fa3dfdG9fZHJhdylcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHgudmFsdWUgPT0gXCJ2YWxpZGF0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgIGJ1aWxkVXJsU2VsZWN0aW9uKHZhbGlkYXRpb25fdG9fZHJhdylcbiAgICAgICAgICAgICAgICAgIGJ1aWxkS2V5d29yZFNlbGVjdGlvbih2YWxpZGF0aW9uX2t3X3RvX2RyYXcpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGJ1aWxkVXJsU2VsZWN0aW9uKHRvX2RyYXcpXG4gICAgICAgICAgICAgICAgICBidWlsZEtleXdvcmRTZWxlY3Rpb24oa3dfdG9fZHJhdylcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZWxlY3RPcHRpb25SZWN0KHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfXylcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgIH1cblxuICAgICAgICAgIGJ1aWxkT3B0aW9ucyhvcHRpb25zKVxuXG4gICAgICAgICAgZDNfY2xhc3Moc3VtbWFyeV9yb3csXCJkZXNjcmlwdGlvblwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiYWJzb2x1dGVcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMjBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidG9wXCIsXCIzNXB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJyaWdodFwiLFwiMjAwcHhcIilcbiAgICAgICAgICAgIC50ZXh0KFwiU2VsZWN0IGRvbWFpbnMgYW5kIGtleXdvcmRzIHRvIGJ1aWxkIGFuZCByZWZpbmUgeW91ciBnbG9iYWwgZmlsdGVyXCIpXG5cblxuXG5cblxuICAgICAgICAgIHZhciB1cmxzX3N1bW1hcnkgPSBkM19jbGFzcyhzdW1tYXJ5X3JvdyxcInVybHMtc3VtbWFyeVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICB2YXIga3dzX3N1bW1hcnkgPSBkM19jbGFzcyhzdW1tYXJ5X3JvdyxcImt3cy1zdW1tYXJ5XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM19jbGFzcyh1cmxzX3N1bW1hcnksXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTRweFwiKVxuICAgICAgICAgICAgLnRleHQoXCJVUkwgU3VtbWFyeVwiKVxuXG4gICAgICAgICAgZDNfY2xhc3Moa3dzX3N1bW1hcnksXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTRweFwiKVxuICAgICAgICAgICAgLnRleHQoXCJLZXl3b3JkIFN1bW1hcnlcIilcblxuXG5cbiAgICAgICAgICB2YXIgY29uc2lkZXJhdGlvbl9idWNrZXRzID0gYnVja2V0cy5maWx0ZXIoKHgsaSkgPT4gISgoaSA8IGJlZm9yZV9wb3MpIHx8IChpID4gYnVja2V0cy5sZW5ndGgvMiAtIDEgKSkgKVxuICAgICAgICAgICAgLCB2YWxpZGF0aW9uX2J1Y2tldHMgPSBidWNrZXRzLmZpbHRlcigoeCxpKSA9PiAhKChpIDwgYnVja2V0cy5sZW5ndGgvMiApIHx8IChpID4gYWZ0ZXJfcG9zKSkgKVxuXG4gICAgICAgICAgdmFyIGNvbnNpZGVyYXRpb25fdG9fZHJhdyA9IHRvX2RyYXcuZmlsdGVyKHggPT4gY29uc2lkZXJhdGlvbl9idWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7IHAgKz0geFtjXSB8fCAwOyByZXR1cm4gcH0sMCkgKVxuICAgICAgICAgICAgLCB2YWxpZGF0aW9uX3RvX2RyYXcgPSB0b19kcmF3LmZpbHRlcih4ID0+IHZhbGlkYXRpb25fYnVja2V0cy5yZWR1Y2UoKHAsYykgPT4geyBwICs9IHhbY10gfHwgMDsgcmV0dXJuIHB9LDApIClcblxuICAgICAgICAgIGZ1bmN0aW9uIGF2Z1ZpZXdzKHRvX2RyYXcpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh0b19kcmF3LnJlZHVjZSgocCxjKSA9PiBwICsgYy50b3RhbCwwKS90b19kcmF3Lmxlbmd0aClcbiAgICAgICAgICB9XG4gICAgICAgICAgZnVuY3Rpb24gbWVkaWFuVmlld3ModG9fZHJhdykge1xuICAgICAgICAgICAgcmV0dXJuICh0b19kcmF3W3BhcnNlSW50KHRvX2RyYXcubGVuZ3RoLzIpXSB8fCB7fSkudG90YWwgfHwgMFxuICAgICAgICAgIH1cblxuXG4gICAgICAgICAgdmFyIHVybF9zdW1tYXJ5X2RhdGEgPSBbXG4gICAgICAgICAgICAgIHtcIm5hbWVcIjpcIkRpc3RpbmN0IFVSTHNcIiwgXCJhbGxcIjogdG9fZHJhdy5sZW5ndGgsIFwiY29uc2lkZXJhdGlvblwiOiBjb25zaWRlcmF0aW9uX3RvX2RyYXcubGVuZ3RoLCBcInZhbGlkYXRpb25cIjogdmFsaWRhdGlvbl90b19kcmF3Lmxlbmd0aCB9XG4gICAgICAgICAgICAsIHtcIm5hbWVcIjpcIkF2ZXJhZ2UgVmlld3NcIiwgXCJhbGxcIjogYXZnVmlld3ModG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBhdmdWaWV3cyhjb25zaWRlcmF0aW9uX3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogYXZnVmlld3ModmFsaWRhdGlvbl90b19kcmF3KSAgfVxuICAgICAgICAgICAgLCB7XCJuYW1lXCI6XCJNZWRpYW4gVmlld3NcIiwgXCJhbGxcIjogbWVkaWFuVmlld3ModG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBtZWRpYW5WaWV3cyhjb25zaWRlcmF0aW9uX3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogbWVkaWFuVmlld3ModmFsaWRhdGlvbl90b19kcmF3KSAgfVxuICAgICAgICAgIF1cblxuICAgICAgICAgIHZhciB1d3JhcCA9IGQzX2NsYXNzKHVybHNfc3VtbWFyeSxcIndyYXBcIikuc3R5bGUoXCJ3aWR0aFwiLFwiOTAlXCIpXG5cblxuICAgICAgICAgIHRhYmxlKHV3cmFwKVxuICAgICAgICAgICAgLmRhdGEoe1widmFsdWVzXCI6dXJsX3N1bW1hcnlfZGF0YX0pXG4gICAgICAgICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgICAgICAgIC5oZWFkZXJzKFtcbiAgICAgICAgICAgICAgICB7XCJrZXlcIjpcIm5hbWVcIixcInZhbHVlXCI6XCJcIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcImFsbFwiLFwidmFsdWVcIjpcIkFsbFwifVxuICAgICAgICAgICAgICAsIHtcImtleVwiOlwiY29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcIkNvbnNpZGVyYXRpb25cIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcInZhbGlkYXRpb25cIixcInZhbHVlXCI6XCJWYWxpZGF0aW9uXCJ9XG4gICAgICAgICAgICBdKVxuICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgICAgLl90YXJnZXQuc2VsZWN0QWxsKFwiLnRhYmxlLXdyYXBwZXJcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidGFibGUtd3JhcHBlclwiLGZhbHNlKVxuXG5cbiAgICAgICAgICB2YXIgY29uc2lkZXJhdGlvbl9rd190b19kcmF3ID0ga3dfdG9fZHJhdy5maWx0ZXIoeCA9PiBjb25zaWRlcmF0aW9uX2J1Y2tldHMucmVkdWNlKChwLGMpID0+IHsgcCArPSB4W2NdIHx8IDA7IHJldHVybiBwfSwwKSApXG4gICAgICAgICAgICAsIHZhbGlkYXRpb25fa3dfdG9fZHJhdyA9IGt3X3RvX2RyYXcuZmlsdGVyKHggPT4gdmFsaWRhdGlvbl9idWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7IHAgKz0geFtjXSB8fCAwOyByZXR1cm4gcH0sMCkgKVxuXG5cbiAgICAgICAgICB2YXIga3dzX3N1bW1hcnlfZGF0YSA9IFtcbiAgICAgICAgICAgICAge1wibmFtZVwiOlwiRGlzdGluY3QgS2V5d29yZHNcIiwgXCJhbGxcIjoga3dfdG9fZHJhdy5sZW5ndGgsIFwiY29uc2lkZXJhdGlvblwiOiBjb25zaWRlcmF0aW9uX2t3X3RvX2RyYXcubGVuZ3RoLCBcInZhbGlkYXRpb25cIjogdmFsaWRhdGlvbl9rd190b19kcmF3Lmxlbmd0aCB9XG4gICAgICAgICAgICAsIHtcIm5hbWVcIjpcIkF2ZXJhZ2UgVmlld3NcIiwgXCJhbGxcIjogYXZnVmlld3Moa3dfdG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBhdmdWaWV3cyhjb25zaWRlcmF0aW9uX2t3X3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogYXZnVmlld3ModmFsaWRhdGlvbl9rd190b19kcmF3KSAgfVxuICAgICAgICAgICAgLCB7XCJuYW1lXCI6XCJNZWRpYW4gVmlld3NcIiwgXCJhbGxcIjogbWVkaWFuVmlld3Moa3dfdG9fZHJhdyksIFwiY29uc2lkZXJhdGlvblwiOiBtZWRpYW5WaWV3cyhjb25zaWRlcmF0aW9uX2t3X3RvX2RyYXcpLCBcInZhbGlkYXRpb25cIjogbWVkaWFuVmlld3ModmFsaWRhdGlvbl9rd190b19kcmF3KSAgfVxuICAgICAgICAgIF1cblxuICAgICAgICAgIHZhciBrd3JhcCA9IGQzX2NsYXNzKGt3c19zdW1tYXJ5LFwid3JhcFwiKS5zdHlsZShcIndpZHRoXCIsXCI5MCVcIilcblxuICAgICAgICAgIHRhYmxlKGt3cmFwKVxuICAgICAgICAgICAgLmRhdGEoe1widmFsdWVzXCI6a3dzX3N1bW1hcnlfZGF0YX0pXG4gICAgICAgICAgICAuc2tpcF9vcHRpb24odHJ1ZSlcbiAgICAgICAgICAgIC5oZWFkZXJzKFtcbiAgICAgICAgICAgICAgICB7XCJrZXlcIjpcIm5hbWVcIixcInZhbHVlXCI6XCJcIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcImFsbFwiLFwidmFsdWVcIjpcIkFsbFwifVxuICAgICAgICAgICAgICAsIHtcImtleVwiOlwiY29uc2lkZXJhdGlvblwiLFwidmFsdWVcIjpcIkNvbnNpZGVyYXRpb25cIn1cbiAgICAgICAgICAgICAgLCB7XCJrZXlcIjpcInZhbGlkYXRpb25cIixcInZhbHVlXCI6XCJWYWxpZGF0aW9uXCJ9XG4gICAgICAgICAgICBdKVxuICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgICAgLl90YXJnZXQuc2VsZWN0QWxsKFwiLnRhYmxlLXdyYXBwZXJcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidGFibGUtd3JhcHBlclwiLGZhbHNlKVxuXG5cblxuXG5cbiAgICAgICAgICB2YXIgZXVoID0gZDNfY2xhc3ModGl0bGVfcm93LFwiZXhwYW5zaW9uLXVybHMtdGl0bGVcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MCVcIilcbiAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICAgICAgZDNfY2xhc3MoZXVoLFwidGl0bGVcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNjVweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG4gICAgICAgICAgICAudGV4dChcIlVSTFwiKVxuXG4gICAgICAgICAgZDNfY2xhc3MoZXVoLFwidmlld1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuICAgICAgICAgICAgLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgICAgICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhldWgsXCJsZWdlbmRcIixcInN2Z1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCIuYmVmb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjMwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkJlZm9yZVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwiLmFmdGVyXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjkwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkFmdGVyXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNilcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDYwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNjApXG5cblxuXG5cbiAgICAgICAgICB2YXIgZWtoID0gZDNfY2xhc3ModGl0bGVfcm93LFwiZXhwYW5zaW9uLWt3cy10aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMzZweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICBkM19jbGFzcyhla2gsXCJ0aXRsZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI2NXB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAudGV4dChcIktleXdvcmRzXCIpXG5cbiAgICAgICAgICBkM19jbGFzcyhla2gsXCJ2aWV3XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgLnRleHQoXCJWaWV3c1wiKVxuXG4gICAgICAgICAgdmFyIHN2Z19sZWdlbmQgPSBkM19jbGFzcyhla2gsXCJsZWdlbmRcIixcInN2Z1wiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjM2cHhcIilcbi5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcblxuXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCIuYmVmb3JlXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjMwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkJlZm9yZVwiKVxuXG4gICAgICAgICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwiLmFmdGVyXCIsXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIixcIjkwXCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChcIkFmdGVyXCIpXG5cbiAgICAgICAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJsaW5lXCIsXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAzNilcbiAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIDYwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNjApXG5cblxuXG5cblxuXG5cbiAgICAgICAgICBmdW5jdGlvbiBidWlsZFVybFNlbGVjdGlvbih0b19kcmF3KSB7XG4gICAgICAgICAgICB2YXIgZXhwYW5zaW9uID0gZDNfY2xhc3MoZXhwYW5zaW9uX3JvdyxcImV4cGFuc2lvbi11cmxzXCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwic2Nyb2xsYm94XCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjUwJVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwibWF4LWhlaWdodFwiLFwiMjUwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcInNjcm9sbFwiKVxuXG4gICAgICAgICAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG4gICAgICAgICAgICB2YXIgdXJsX3JvdyA9IGQzX3NwbGF0KGV4cGFuc2lvbixcIi51cmwtcm93XCIsXCJkaXZcIix0b19kcmF3LnNsaWNlKDAsNTAwKSxmdW5jdGlvbih4KSB7IHJldHVybiB4LnVybCB9KVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInVybC1yb3dcIix0cnVlKVxuXG4gICAgICAgICAgICB2YXIgdXJsX25hbWUgPSBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubmFtZVwiLFwiZGl2XCIpLmNsYXNzZWQoXCJuYW1lXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI2MHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm92ZXJmbG93XCIsXCJoaWRkZW5cIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUodXJsX25hbWUsXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZDNfY2xhc3ModXJsX25hbWUsXCJ1cmxcIiwgXCJhXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LW92ZXJmbG93XCIsXCJlbGxpcHNpc1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjM1cHhcIilcbiAgICAgICAgICAgICAgLnRleHQoeCA9PiB4LnVybC5zcGxpdChkLmRvbWFpbilbMV0gfHwgeC51cmwgKVxuICAgICAgICAgICAgICAuYXR0cihcImhyZWZcIiwgeCA9PiB4LnVybClcbiAgICAgICAgICAgICAgLmF0dHIoXCJ0YXJnZXRcIiwgXCJfYmxhbmtcIilcblxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZSh1cmxfcm93LFwiLm51bWJlclwiLFwiZGl2XCIpLmNsYXNzZWQoXCJudW1iZXJcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibGluZS1oZWlnaHRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidmVydGljYWwtYWxpZ25cIixcInRvcFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxM3B4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oeCkgeyByZXR1cm4gZDMuc3VtKGJ1Y2tldHMubWFwKGZ1bmN0aW9uKGIpIHsgcmV0dXJuIHhbYl0gfHwgMCB9KSkgfSlcblxuXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIucGxvdFwiLFwic3ZnXCIpLmNsYXNzZWQoXCJwbG90XCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHZhciBkdGhpcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBidWNrZXRzLm1hcChmdW5jdGlvbihiKSB7IHJldHVybiB4W2JdIHx8IDAgfSlcbiAgICAgICAgICAgICAgICBzaW1wbGVUaW1lc2VyaWVzKGR0aGlzLHZhbHVlcywxMjAsMjApXG4gICAgICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShkdGhpcyxcImxpbmVcIixcImxpbmVcIilcbiAgICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAyMClcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgNjApXG4gICAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIDYwKVxuXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgICBmdW5jdGlvbiBidWlsZEtleXdvcmRTZWxlY3Rpb24oa3dfdG9fZHJhdykge1xuICAgICAgICAgICAgdmFyIGV4cGFuc2lvbiA9IGQzX2NsYXNzKGV4cGFuc2lvbl9yb3csXCJleHBhbnNpb24ta2V5d29yZHNcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzY3JvbGxib3hcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiNTAlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwibWF4LWhlaWdodFwiLFwiMjUwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcInNjcm9sbFwiKVxuXG4gICAgICAgICAgICBleHBhbnNpb24uaHRtbChcIlwiKVxuXG4gICAgICAgICAgICB2YXIgdXJsX3JvdyA9IGQzX3NwbGF0KGV4cGFuc2lvbixcIi51cmwtcm93XCIsXCJkaXZcIixrd190b19kcmF3LnNsaWNlKDAsNTAwKSxmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuICAgICAgICAgICAgICAuY2xhc3NlZChcInVybC1yb3dcIix0cnVlKVxuXG4gICAgICAgICAgICB2YXIga3dfbmFtZSA9IGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5uYW1lXCIsXCJkaXZcIikuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjYwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwib3ZlcmZsb3dcIixcImhpZGRlblwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJoZWlnaHRcIixcIjIwcHhcIilcblxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShrd19uYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIxMHB4XCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwidHlwZVwiLFwiY2hlY2tib3hcIilcbiAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZS1maWx0ZXJcIikoeClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZDNfY2xhc3Moa3dfbmFtZSxcInVybFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LW92ZXJmbG93XCIsXCJlbGxpcHNpc1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjIzNXB4XCIpXG4gICAgICAgICAgICAgIC50ZXh0KHggPT4geC5rZXkgKVxuXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKHVybF9yb3csXCIubnVtYmVyXCIsXCJkaXZcIikuY2xhc3NlZChcIm51bWJlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI1MHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJsaW5lLWhlaWdodFwiLFwiMjBweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEzcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbih4KSB7IHJldHVybiBkMy5zdW0oYnVja2V0cy5tYXAoZnVuY3Rpb24oYikgeyByZXR1cm4geFtiXSB8fCAwIH0pKSB9KVxuXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUodXJsX3JvdyxcIi5wbG90XCIsXCJzdmdcIikuY2xhc3NlZChcInBsb3RcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTIwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIyMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGR0aGlzID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlcyA9IGJ1Y2tldHMubWFwKGZ1bmN0aW9uKGIpIHsgcmV0dXJuIHhbYl0gfHwgMCB9KVxuICAgICAgICAgICAgICAgIHNpbXBsZVRpbWVzZXJpZXMoZHRoaXMsdmFsdWVzLDEyMCwyMClcbiAgICAgICAgICAgICAgICBkM191cGRhdGVhYmxlKGR0aGlzLFwibGluZVwiLFwibGluZVwiKVxuICAgICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIDIwKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCA2MClcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgNjApXG5cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBidWlsZFVybFNlbGVjdGlvbih0b19kcmF3KVxuICAgICAgICAgIGJ1aWxkS2V5d29yZFNlbGVjdGlvbihrd190b19kcmF3KVxuXG5cblxuXG5cbiAgfVxuXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHRpbWVfc2VyaWVzIGZyb20gJy4uL3RpbWVzZXJpZXMnXG5pbXBvcnQgcmVmaW5lIGZyb20gJy4vcmVmaW5lJ1xuXG5cbmltcG9ydCB7ZHJhd1N0cmVhbX0gZnJvbSAnLi9zdW1tYXJ5X3ZpZXcnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJy4vc3VtbWFyeV92aWV3J1xuXG5mdW5jdGlvbiBub29wKCl7fVxuXG5mdW5jdGlvbiBkM19jbGFzcyh0YXJnZXQsY2xzLHR5cGUsZGF0YSkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuXCIgKyBjbHMsIHR5cGUgfHwgXCJkaXZcIixkYXRhKVxuICAgIC5jbGFzc2VkKGNscyx0cnVlKVxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlbGF0aXZlX3RpbWluZyh0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBSZWxhdGl2ZVRpbWluZyh0YXJnZXQpXG59XG5cbmNsYXNzIFJlbGF0aXZlVGltaW5nIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICB9XG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuXG4gIG9uKGFjdGlvbiwgZm4pIHtcbiAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG5cbiAgZHJhdygpIHtcblxuXG4gICAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YVxuICAgIHZhciB3cmFwID0gZDNfY2xhc3ModGhpcy5fdGFyZ2V0LFwic3VtbWFyeS13cmFwXCIpXG5cbiAgICBoZWFkZXIod3JhcClcbiAgICAgIC50ZXh0KFwiQmVmb3JlIGFuZCBBZnRlclwiKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIGJhd3JhcCA9IGQzX3VwZGF0ZWFibGUod3JhcCxcIi5iYS1yb3dcIixcImRpdlwiLGZhbHNlLGZ1bmN0aW9uKCkgeyByZXR1cm4gMX0pXG4gICAgICAgIC5jbGFzc2VkKFwiYmEtcm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjYwcHhcIilcblxuICAgIHRyeSB7XG4gICAgICB2YXIgc3RhZ2VzID0gZHJhd1N0cmVhbShiYXdyYXAsdGhpcy5fZGF0YS5iZWZvcmVfY2F0ZWdvcmllcyx0aGlzLl9kYXRhLmFmdGVyX2NhdGVnb3JpZXMpXG4gICAgICBiYXdyYXAuc2VsZWN0QWxsKFwiLmJlZm9yZS1zdHJlYW1cIikucmVtb3ZlKCkgLy8gSEFDS1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgYmF3cmFwLmh0bWwoXCJcIilcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl9kYXRhLmJlZm9yZV9jYXRlZ29yaWVzWzBdLnZhbHVlc1xuXG5cbiAgICB2YXIgY2F0ZWdvcnlfbXVsdGlwbGllcnMgPSBkYXRhLmJlZm9yZV9jYXRlZ29yaWVzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICBwW2Mua2V5XSA9ICgxICsgYy52YWx1ZXNbMF0ucGVyY2VudF9kaWZmKVxuICAgICAgcmV0dXJuIHBcbiAgICB9LHt9KVxuXG5cbiAgICB2YXIgdGFidWxhcl9kYXRhID0gdGhpcy5fZGF0YS5iZWZvcmUucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIHBbYy5kb21haW5dID0gcFtjLmRvbWFpbl0gfHwge31cbiAgICAgIHBbYy5kb21haW5dWydkb21haW4nXSA9IGMuZG9tYWluXG4gICAgICBwW2MuZG9tYWluXVsnd2VpZ2h0ZWQnXSA9IGMudmlzaXRzICogY2F0ZWdvcnlfbXVsdGlwbGllcnNbYy5wYXJlbnRfY2F0ZWdvcnlfbmFtZV1cbiAgICAgIFxuICAgICAgcFtjLmRvbWFpbl1bYy50aW1lX2RpZmZfYnVja2V0XSA9IChwW2MuZG9tYWluXVtjLnRpbWVfZGlmZl9idWNrZXRdIHx8IDApICsgYy52aXNpdHNcbiAgICAgIHJldHVybiBwXG4gICAgfSx7fSlcblxuICAgIHRhYnVsYXJfZGF0YSA9IHRoaXMuX2RhdGEuYWZ0ZXIucmVkdWNlKChwLGMpID0+IHtcbiAgICAgIHBbYy5kb21haW5dID0gcFtjLmRvbWFpbl0gfHwge30gXG4gICAgICBwW2MuZG9tYWluXVsnZG9tYWluJ10gPSBjLmRvbWFpblxuICAgICAgcFtjLmRvbWFpbl1bXCItXCIgKyBjLnRpbWVfZGlmZl9idWNrZXRdID0gKHBbYy5kb21haW5dW2MudGltZV9kaWZmX2J1Y2tldF0gfHwgMCkgKyBjLnZpc2l0c1xuXG4gICAgICByZXR1cm4gcFxuICAgIH0sdGFidWxhcl9kYXRhKVxuXG4gICAgdmFyIHNvcnRlZF90YWJ1bGFyID0gT2JqZWN0LmtleXModGFidWxhcl9kYXRhKS5tYXAoKGspID0+IHtcbiAgICAgIHJldHVybiB0YWJ1bGFyX2RhdGFba11cbiAgICB9KS5zb3J0KChwLGMpID0+IHtcbiAgICAgIFxuICAgICAgcmV0dXJuIGQzLmRlc2NlbmRpbmcocFsnNjAwJ10qcC53ZWlnaHRlZCB8fCAtSW5maW5pdHksY1snNjAwJ10qYy53ZWlnaHRlZCB8fCAtSW5maW5pdHkpXG4gICAgfSlcblxuXG5cblxuICAgIHZhciBidWNrZXRzID0gWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ucmV2ZXJzZSgpLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiBTdHJpbmcoeCo2MCkgfSlcbiAgICBidWNrZXRzID0gYnVja2V0cy5jb25jYXQoWzEwLDMwLDYwLDEyMCwxODAsMzYwLDcyMCwxNDQwLDI4ODAsNTc2MCwxMDA4MF0ubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIFN0cmluZygteCo2MCkgfSkpXG5cblxuICAgIHZhciBmb3JtYXROYW1lID0gZnVuY3Rpb24oeCkge1xuXG4gICAgICBpZiAoeCA8IDApIHggPSAteFxuXG4gICAgICBpZiAoeCA9PSAzNjAwKSByZXR1cm4gXCIxIGhyXCJcbiAgICAgIGlmICh4IDwgMzYwMCkgcmV0dXJuIHgvNjAgKyBcIiBtaW5zXCIgXG5cbiAgICAgIGlmICh4ID09IDg2NDAwKSByZXR1cm4gXCIxIGRheVwiXG4gICAgICBpZiAoeCA+IDg2NDAwKSByZXR1cm4geC84NjQwMCArIFwiIGRheXNcIiBcblxuICAgICAgcmV0dXJuIHgvMzYwMCArIFwiIGhyc1wiXG4gICAgfVxuXG4gICAgYmF3cmFwLnNlbGVjdEFsbChcIi50YWJsZS13cmFwcGVyXCIpLmh0bWwoXCJcIilcblxuICAgIHZhciB0YWJsZV9vYmogPSB0YWJsZShiYXdyYXApXG4gICAgICAudG9wKDE0MClcbiAgICAgIC5oZWFkZXJzKFxuICAgICAgICBbe1wia2V5XCI6XCJkb21haW5cIiwgXCJ2YWx1ZVwiOlwiRG9tYWluXCJ9XS5jb25jYXQoXG4gICAgICAgICAgYnVja2V0cy5tYXAoeCA9PiB7IHJldHVybiB7XCJrZXlcIjp4LCBcInZhbHVlXCI6Zm9ybWF0TmFtZSh4KSwgXCJzZWxlY3RlZFwiOnRydWV9IH0pXG4gICAgICAgIClcbiAgICAgICAgXG4gICAgICApXG4gICAgICAub24oXCJleHBhbmRcIixmdW5jdGlvbihkKSB7XG5cbiAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKFwidGQub3B0aW9uLWhlYWRlclwiKS5odG1sKFwiJm5kYXNoO1wiKVxuICAgICAgICAgIGlmICh0aGlzLm5leHRTaWJsaW5nICYmIGQzLnNlbGVjdCh0aGlzLm5leHRTaWJsaW5nKS5jbGFzc2VkKFwiZXhwYW5kZWRcIikgPT0gdHJ1ZSkge1xuICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInRkLm9wdGlvbi1oZWFkZXJcIikuaHRtbChcIiYjNjUyOTE7XCIpXG4gICAgICAgICAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc2VsZWN0QWxsKFwiLmV4cGFuZGVkXCIpLnJlbW92ZSgpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuc2VsZWN0QWxsKFwiLmV4cGFuZGVkXCIpLnJlbW92ZSgpXG4gICAgICAgICAgdmFyIHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodCwgdGhpcy5uZXh0U2libGluZyk7ICBcblxuXG4gICAgICAgICAgdmFyIHRyID0gZDMuc2VsZWN0KHQpLmNsYXNzZWQoXCJleHBhbmRlZFwiLHRydWUpLmRhdHVtKHt9KVxuICAgICAgICAgIHZhciB0ZCA9IGQzX3VwZGF0ZWFibGUodHIsXCJ0ZFwiLFwidGRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY29sc3BhblwiLHRoaXMuY2hpbGRyZW4ubGVuZ3RoKVxuICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwiI2Y5ZjlmYlwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjEwcHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIxMHB4XCIpXG5cbiAgICAgICAgICB2YXIgYmVmb3JlX3VybHMgPSBkYXRhLmJlZm9yZS5maWx0ZXIoeSA9PiB5LmRvbWFpbiA9PSBkLmRvbWFpbilcbiAgICAgICAgICB2YXIgYWZ0ZXJfdXJscyA9IGRhdGEuYWZ0ZXIuZmlsdGVyKHkgPT4geS5kb21haW4gPT0gZC5kb21haW4pXG5cbiAgICAgICAgICByZWZpbmUodGQpXG4gICAgICAgICAgICAuZGF0YShkKVxuICAgICAgICAgICAgLnN0YWdlcyhzdGFnZXMpXG4gICAgICAgICAgICAuYmVmb3JlX3VybHMoYmVmb3JlX3VybHMpXG4gICAgICAgICAgICAuYWZ0ZXJfdXJscyhhZnRlcl91cmxzKVxuICAgICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsc2VsZi5vbihcInN0YWdlLWZpbHRlclwiKSlcbiAgICAgICAgICAgIC5kcmF3KClcblxuICAgICAgICB9KVxuICAgICAgLm9wdGlvbl90ZXh0KFwiPGRpdiBzdHlsZT0nd2lkdGg6NDBweDt0ZXh0LWFsaWduOmNlbnRlcic+JiM2NTI5MTs8L2Rpdj5cIilcbiAgICAgIC8vLnNvcnQoXCI2MDBcIilcbiAgICAgIC5kYXRhKHtcInZhbHVlc1wiOnNvcnRlZF90YWJ1bGFyLnNsaWNlKDAsMTAwMCl9KVxuICAgICAgLmRyYXcoKVxuXG4gICAgdGFibGVfb2JqLl90YXJnZXQuc2VsZWN0QWxsKFwidGhcIilcbiAgICAgIC8vLnN0eWxlKFwid2lkdGhcIix4ID0+IChwYXJzZUludCh4LmtleSkgPT0geC5rZXkpID8gXCIzMXB4XCIgOiB1bmRlZmluZWQgKVxuICAgICAgLy8uc3R5bGUoXCJtYXgtd2lkdGhcIix4ID0+IChwYXJzZUludCh4LmtleSkgPT0geC5rZXkpID8gXCIzMXB4XCIgOiB1bmRlZmluZWQgKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJpZ2h0XCIsXCIxcHggcmdiYSgwLDAsMCwuMSlcIilcbiAgICAgIC5zZWxlY3RBbGwoXCJzcGFuXCIpXG4gICAgICAuYXR0cihcInN0eWxlXCIsIGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIGlmIChwYXJzZUludCh4LmtleSkgPT0geC5rZXkgJiYgeC5rZXkgPCAwKSByZXR1cm4gXCJmb250LXNpemU6LjllbTt3aWR0aDo3MHB4O3RyYW5zZm9ybTpyb3RhdGUoLTQ1ZGVnKTtkaXNwbGF5OmlubGluZS1ibG9jazttYXJnaW4tbGVmdDotOXB4O21hcmdpbi1ib3R0b206IDEycHhcIlxuICAgICAgICBpZiAocGFyc2VJbnQoeC5rZXkpID09IHgua2V5ICYmIHgua2V5ID4gMCkgcmV0dXJuIFwiZm9udC1zaXplOi45ZW07d2lkdGg6NzBweDt0cmFuc2Zvcm06cm90YXRlKDQ1ZGVnKTt0ZXh0LWFsaWduOnJpZ2h0O2Rpc3BsYXk6aW5saW5lLWJsb2NrO21hcmdpbi1sZWZ0OiAtNDhweDsgbWFyZ2luLWJvdHRvbTogMTJweDtcIlxuXG4gICAgICB9KVxuXG5cbiAgICB0YWJsZV9vYmouX3RhcmdldC5zZWxlY3RBbGwoXCIudGFibGUtb3B0aW9uXCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJub25lXCIpXG5cblxuICAgIHZhciBtYXggPSBzb3J0ZWRfdGFidWxhci5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgT2JqZWN0LmtleXMoYykuZmlsdGVyKHogPT4geiAhPSBcImRvbWFpblwiICYmIHogIT0gXCJ3ZWlnaHRlZFwiKS5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICBwID0gY1t4XSA+IHAgPyBjW3hdIDogcFxuICAgICAgfSlcbiAgICBcbiAgICAgIHJldHVybiBwXG4gICAgfSwwKVxuXG4gICAgdmFyIG9zY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFswLC44XSkuZG9tYWluKFswLE1hdGgubG9nKG1heCldKVxuXG4gICAgdGFibGVfb2JqLl90YXJnZXQuc2VsZWN0QWxsKFwidHJcIikuc2VsZWN0QWxsKFwidGQ6bm90KDpmaXJzdC1jaGlsZClcIilcbiAgICAgIC5zdHlsZShcImJvcmRlci1yaWdodFwiLFwiMXB4IHNvbGlkIHdoaXRlXCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjBweFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwiY2VudGVyXCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnBhcmVudE5vZGUuX19kYXRhX19beFsna2V5J11dIHx8IDBcbiAgICAgICAgcmV0dXJuIFwicmdiYSg3MCwgMTMwLCAxODAsXCIgKyBvc2NhbGUoTWF0aC5sb2codmFsdWUrMSkpICsgXCIpXCJcbiAgICAgIH0pXG5cblxuXG5cblxuXG4gICAgICBcblxuXG5cbiAgICAvL3ZhciB0ID0gdGFibGUudGFibGUoX2V4cGxvcmUpXG4gICAgLy8gIC5kYXRhKHNlbGVjdGVkKVxuXG5cblxuICAgIFxuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHRhYmxlIGZyb20gJ3RhYmxlJ1xuaW1wb3J0IHJlZmluZSBmcm9tICcuL3JlZmluZSdcbmltcG9ydCAqIGFzIHRpbWVzZXJpZXMgZnJvbSAnLi4vdGltZXNlcmllcydcbmltcG9ydCBkb21haW5fZXhwYW5kZWQgZnJvbSAnLi9kb21haW5fZXhwYW5kZWQnXG5cblxuXG5cbmltcG9ydCB7ZHJhd1N0cmVhbX0gZnJvbSAnLi9zdW1tYXJ5X3ZpZXcnXG5pbXBvcnQge3NpbXBsZVRpbWVzZXJpZXN9IGZyb20gJy4vc3VtbWFyeV92aWV3J1xuXG5mdW5jdGlvbiBub29wKCl7fVxuXG5mdW5jdGlvbiBkM19jbGFzcyh0YXJnZXQsY2xzLHR5cGUsZGF0YSkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuXCIgKyBjbHMsIHR5cGUgfHwgXCJkaXZcIixkYXRhKVxuICAgIC5jbGFzc2VkKGNscyx0cnVlKVxufVxuXG5mdW5jdGlvbiBmb3JtYXRIb3VyKGgpIHtcbiAgaWYgKGggPT0gMCkgcmV0dXJuIFwiMTIgYW1cIlxuICBpZiAoaCA9PSAxMikgcmV0dXJuIFwiMTIgcG1cIlxuICBpZiAoaCA+IDEyKSByZXR1cm4gKGgtMTIpICsgXCIgcG1cIlxuICByZXR1cm4gKGggPCAxMCA/IGhbMV0gOiBoKSArIFwiIGFtXCJcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0aW1pbmcodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGltaW5nKHRhcmdldClcbn1cblxuY2xhc3MgVGltaW5nIHtcbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fb24gPSB7fVxuICB9XG5cbiAgZGF0YSh2YWwpIHsgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJkYXRhXCIsdmFsKSB9IFxuXG4gIG9uKGFjdGlvbiwgZm4pIHtcbiAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG5cbiAgZHJhdygpIHtcblxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhXG4gICAgdmFyIHdyYXAgPSBkM19jbGFzcyh0aGlzLl90YXJnZXQsXCJ0aW1pbmctd3JhcFwiKVxuXG4gICAgaGVhZGVyKHdyYXApXG4gICAgICAudGV4dChcIlRpbWluZ1wiKVxuICAgICAgLmRyYXcoKVxuXG4gICAgdmFyIHRpbWluZ3dyYXAgPSBkM191cGRhdGVhYmxlKHdyYXAsXCIudGltaW5nLXJvd1wiLFwiZGl2XCIsZmFsc2UsZnVuY3Rpb24oKSB7IHJldHVybiAxfSlcbiAgICAgICAgLmNsYXNzZWQoXCJ0aW1pbmctcm93XCIsdHJ1ZSlcbiAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjYwcHhcIilcblxuICAgIC8vIERBVEFcbiAgICB2YXIgaG91cmJ1Y2tldHMgPSBkMy5yYW5nZSgwLDI0KS5tYXAoeCA9PiBTdHJpbmcoeCkubGVuZ3RoID4gMSA/IFN0cmluZyh4KSA6IFwiMFwiICsgeClcblxuXG4gICAgdmFyIGQgPSBkMy5uZXN0KClcbiAgICAgIC5rZXkoeCA9PiB4LmRvbWFpbilcbiAgICAgIC5rZXkoeCA9PiB4LmhvdXIpXG4gICAgICAuZW50cmllcyhkYXRhLmZ1bGxfdXJscylcblxuICAgIHZhciBtYXggPSAwXG5cbiAgICBkLm1hcCh4ID0+IHtcbiAgICAgIHZhciBvYmogPSB4LnZhbHVlcy5yZWR1Y2UoKHAsYykgPT4ge1xuICAgICAgICBwW2Mua2V5XSA9IGMudmFsdWVzXG4gICAgICAgIHJldHVybiBwXG4gICAgICB9LHt9KVxuXG4gICAgICB4LmJ1Y2tldHMgPSBob3VyYnVja2V0cy5tYXAoeiA9PiB7XG4gICAgICAgXG4gICAgICAgIHZhciBvID0ge1xuICAgICAgICAgIHZhbHVlczogb2JqW3pdLFxuICAgICAgICAgIGtleTogZm9ybWF0SG91cih6KVxuICAgICAgICB9XG4gICAgICAgIG8udmlld3MgPSBkMy5zdW0ob2JqW3pdIHx8IFtdLCBxID0+IHEudW5pcXVlcylcblxuICAgICAgICBtYXggPSBtYXggPiBvLnZpZXdzID8gbWF4IDogby52aWV3c1xuICAgICAgICByZXR1cm4gb1xuICAgICAgfSlcblxuICAgICAgeC50YWJ1bGFyID0geC5idWNrZXRzLnJlZHVjZSgocCxjKSA9PiB7XG4gICAgICAgIHBbYy5rZXldID0gYy52aWV3cyB8fCB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH0se30pXG5cbiAgICAgIHgudGFidWxhcltcImRvbWFpblwiXSA9IHgua2V5XG4gICAgICB4LnRhYnVsYXJbXCJ0b3RhbFwiXSA9IGQzLnN1bSh4LmJ1Y2tldHMseCA9PiB4LnZpZXdzKVxuXG4gICAgICBcbiAgICAgIHgudmFsdWVzXG4gICAgfSlcblxuICAgIHZhciBoZWFkZXJzID0gW1xuICAgICAge2tleTpcImRvbWFpblwiLHZhbHVlOlwiRG9tYWluXCJ9XG4gICAgXVxuXG4gICAgaGVhZGVycyA9IGhlYWRlcnMuY29uY2F0KGhvdXJidWNrZXRzLm1hcChmb3JtYXRIb3VyKS5tYXAoeCA9PiB7IHJldHVybiB7a2V5OiB4LCB2YWx1ZTogeH0gfSkgKVxuICAgIFxuICAgIHZhciBvc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbMCwuOF0pLmRvbWFpbihbMCxNYXRoLmxvZyhtYXgpXSlcblxuXG4gICAgdmFyIHRhYmxlX29iaiA9IHRhYmxlKHRpbWluZ3dyYXApXG4gICAgICAuaGVhZGVycyhoZWFkZXJzKVxuICAgICAgLmRhdGEoe1wia2V5XCI6XCJcIiwgXCJ2YWx1ZXNcIjpkLm1hcCh4ID0+IHgudGFidWxhcikgfSlcbiAgICAgIC5zb3J0KFwidG90YWxcIilcbiAgICAgIC5za2lwX29wdGlvbih0cnVlKVxuICAgICAgLm9uKFwiZXhwYW5kXCIsZnVuY3Rpb24oZCkge1xuXG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInRkLm9wdGlvbi1oZWFkZXJcIikuaHRtbChcIiZuZGFzaDtcIilcbiAgICAgICAgICBpZiAodGhpcy5uZXh0U2libGluZyAmJiBkMy5zZWxlY3QodGhpcy5uZXh0U2libGluZykuY2xhc3NlZChcImV4cGFuZGVkXCIpID09IHRydWUpIHtcbiAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zZWxlY3RBbGwoXCJ0ZC5vcHRpb24taGVhZGVyXCIpLmh0bWwoXCImIzY1MjkxO1wiKVxuICAgICAgICAgICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdEFsbChcIi5leHBhbmRlZFwiKS5yZW1vdmUoKVxuICAgICAgICAgIHZhciB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcbiAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHQsIHRoaXMubmV4dFNpYmxpbmcpOyAgXG5cbiAgICAgICAgICB2YXIgdHIgPSBkMy5zZWxlY3QodCkuY2xhc3NlZChcImV4cGFuZGVkXCIsdHJ1ZSkuZGF0dW0oe30pXG4gICAgICAgICAgdmFyIHRkID0gZDNfdXBkYXRlYWJsZSh0cixcInRkXCIsXCJ0ZFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsdGhpcy5jaGlsZHJlbi5sZW5ndGgpXG4gICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiMTBweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjEwcHhcIilcblxuICAgICAgICAgIHZhciBkZCA9IGRhdGEuZnVsbF91cmxzLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmRvbWFpbiA9PSBkLmRvbWFpbiB9KVxuICAgICAgICAgIHZhciByb2xsZWQgPSB0aW1lc2VyaWVzLnByZXBEYXRhKGRkKVxuICAgICAgICAgIFxuICAgICAgICAgIGRvbWFpbl9leHBhbmRlZCh0ZClcbiAgICAgICAgICAgIC5yYXcoZGQpXG4gICAgICAgICAgICAuZGF0YShyb2xsZWQpXG4gICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2UtZmlsdGVyXCIpKHgpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmRyYXcoKVxuXG4gICAgICAgIH0pXG4gICAgICAuZHJhdygpXG5cbiAgICB0YWJsZV9vYmouX3RhcmdldC5zZWxlY3RBbGwoXCJ0clwiKS5zZWxlY3RBbGwoXCJ0ZDpub3QoOmZpcnN0LWNoaWxkKVwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXJpZ2h0XCIsXCIxcHggc29saWQgd2hpdGVcIilcbiAgICAgIC5zdHlsZShcInBhZGRpbmctbGVmdFwiLFwiMHB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIixmdW5jdGlvbih4KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMucGFyZW50Tm9kZS5fX2RhdGFfX1t4WydrZXknXV0gfHwgMFxuICAgICAgICByZXR1cm4gXCJyZ2JhKDcwLCAxMzAsIDE4MCxcIiArIG9zY2FsZShNYXRoLmxvZyh2YWx1ZSsxKSkgKyBcIilcIlxuICAgICAgfSlcblxuXG5cblxuICAgIFxuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4uL2dlbmVyaWMvaGVhZGVyJ1xuaW1wb3J0IHNlbGVjdCBmcm9tICcuLi9nZW5lcmljL3NlbGVjdCdcblxuaW1wb3J0ICogYXMgdGFibGUgZnJvbSAndGFibGUnXG5cbmZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSkge1xuICByZXR1cm4gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuXCIgKyBjbHMsIHR5cGUgfHwgXCJkaXZcIilcbiAgICAuY2xhc3NlZChjbHMsdHJ1ZSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3RhZ2VkX2ZpbHRlcih0YXJnZXQpIHtcbiAgcmV0dXJuIG5ldyBTdGFnZWRGaWx0ZXIodGFyZ2V0KVxufVxuXG5jbGFzcyBTdGFnZWRGaWx0ZXIge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLl9vbiA9IHt9XG4gIH1cblxuICBkYXRhKHZhbCkgeyByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImRhdGFcIix2YWwpIH0gXG5cbiAgb24oYWN0aW9uLCBmbikge1xuICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fb25bYWN0aW9uXSB8fCBub29wO1xuICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICBkcmF3KCkge1xuICAgIHZhciBvd3JhcCA9IGQzX2NsYXNzKHRoaXMuX3RhcmdldCxcImZvb3Rlci13cmFwXCIpXG4gICAgICAuc3R5bGUoXCJwYWRkaW5nLXRvcFwiLFwiNXB4XCIpXG4gICAgICAuc3R5bGUoXCJtaW4taGVpZ2h0XCIsXCI2MHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3R0b21cIixcIjBweFwiKVxuICAgICAgLnN0eWxlKFwicG9zaXRpb25cIixcImZpeGVkXCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwMHB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjRjBGNEY3XCIpXG5cbiAgICB2YXIgd3JhcCA9IGQzX2NsYXNzKG93cmFwLFwiaW5uZXItd3JhcFwiKVxuICAgICAgLnN0eWxlKFwiYm9yZGVyLXRvcFwiLFwiMXB4IHNvbGlkICNjY2NcIilcbiAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCI1cHhcIilcblxuICAgIGQzX2NsYXNzKHdyYXAsXCJoZWFkZXItbGFiZWxcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjE0cHhcIilcbiAgICAgIC5zdHlsZShcImNvbG9yXCIsXCIjODg4ODg4XCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMjAwcHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC50ZXh0KFwiQnVpbGQgRmlsdGVyc1wiKVxuXG4gICAgZDNfY2xhc3Mod3JhcCxcInRleHQtbGFiZWxcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIzNXB4XCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgIC5zdHlsZShcIndpZHRoXCIsXCI2MHB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJub25lXCIpXG4gICAgICAudGV4dChcIlRpdGxlXCIpXG5cbiAgICB2YXIgc2VsZWN0X2JveCA9IHNlbGVjdCh3cmFwKVxuICAgICAgLm9wdGlvbnMoW1xuICAgICAgICAgIHtcImtleVwiOlwiY29udGFpbnNcIixcInZhbHVlXCI6XCJjb250YWluc1wifVxuICAgICAgICAsIHtcImtleVwiOlwiZG9lcyBub3QgY29udGFpblwiLFwidmFsdWVcIjpcImRvZXMgbm90IGNvbnRhaW5cIn1cbiAgICAgIF0pXG4gICAgICAuZHJhdygpXG4gICAgICAuX3NlbGVjdFxuICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsXCIzNnB4XCIpXG4gICAgICAuc3R5bGUoXCJ2ZXJ0aWNhbC1hbGlnblwiLFwidG9wXCIpXG5cblxuXG5cbiAgICB2YXIgZm9vdGVyX3JvdyA9IGQzX2NsYXNzKHdyYXAsXCJmb290ZXItcm93XCIpXG4gICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmxpbmUtYmxvY2tcIilcblxuXG4gICAgdmFyIHNlbGVjdF92YWx1ZSA9IHRoaXMuZGF0YSgpXG5cbiAgICBmdW5jdGlvbiBidWlsZEZpbHRlcklucHV0KCkge1xuXG4gICAgICBmb290ZXJfcm93LnNlbGVjdEFsbChcIi5zZWxlY3RpemUtY29udHJvbFwiKVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIGRlc3Ryb3kgPSBkMy5zZWxlY3QodGhpcykub24oXCJkZXN0cm95XCIpXG4gICAgICAgICAgaWYgKGRlc3Ryb3kpIGRlc3Ryb3koKVxuICAgICAgICB9KVxuXG5cbiAgICAgIHZhciBzZWxlY3QgPSBkM191cGRhdGVhYmxlKGZvb3Rlcl9yb3csXCJpbnB1dFwiLFwiaW5wdXRcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLWxlZnRcIixcIjEwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsXCIyMDBweFwiKVxuICAgICAgICAuYXR0cihcInZhbHVlXCIsc2VsZWN0X3ZhbHVlKVxuICAgICAgICAucHJvcGVydHkoXCJ2YWx1ZVwiLHNlbGVjdF92YWx1ZSlcblxuICAgICAgXG5cblxuICAgICAgdmFyIHMgPSAkKHNlbGVjdC5ub2RlKCkpLnNlbGVjdGl6ZSh7XG4gICAgICAgIHBlcnNpc3Q6IGZhbHNlLFxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHNlbGVjdF92YWx1ZSA9IChzZWxlY3RfdmFsdWUubGVuZ3RoID8gc2VsZWN0X3ZhbHVlICsgXCIsXCIgOiBcIlwiKSArIHhcbiAgICAgICAgICBzZWxmLm9uKFwidXBkYXRlXCIpKHNlbGVjdF92YWx1ZSlcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHgsIHRleHQ6IHhcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9uRGVsZXRlOiBmdW5jdGlvbih4KXtcbiAgICAgICAgICBzZWxlY3RfdmFsdWUgPSBzZWxlY3RfdmFsdWUuc3BsaXQoXCIsXCIpLmZpbHRlcihmdW5jdGlvbih6KSB7IHJldHVybiB6ICE9IHhbMF19KS5qb2luKFwiLFwiKVxuICAgICAgICAgIHNlbGYub24oXCJ1cGRhdGVcIikoc2VsZWN0X3ZhbHVlKVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogeCwgdGV4dDogeFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgZm9vdGVyX3Jvdy5zZWxlY3RBbGwoXCIuc2VsZWN0aXplLWNvbnRyb2xcIilcbiAgICAgICAgLm9uKFwiZGVzdHJveVwiLGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNbMF0uc2VsZWN0aXplLmRlc3Ryb3koKVxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgYnVpbGRGaWx0ZXJJbnB1dCgpXG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBkM19jbGFzcyh3cmFwLFwiaW5jbHVkZS1zdWJtaXRcIixcImJ1dHRvblwiKVxuICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyOXB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwic3VibWl0XCIpXG4gICAgICAudGV4dChcIk1vZGlmeSBGaWx0ZXJzXCIpXG4gICAgICAub24oXCJjbGlja1wiLGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBmb290ZXJfcm93LnNlbGVjdEFsbChcImlucHV0XCIpLnByb3BlcnR5KFwidmFsdWVcIilcbiAgICAgICAgdmFyIG9wID0gIHNlbGVjdF9ib3gubm9kZSgpLnNlbGVjdGVkT3B0aW9uc1swXS5fX2RhdGFfXy5rZXkgKyBcIi5zZWxlY3RpemVcIlxuICAgICAgICBcbiAgICAgICAgc2VsZi5vbihcIm1vZGlmeVwiKSh7XCJmaWVsZFwiOlwiVGl0bGVcIixcIm9wXCI6b3AsXCJ2YWx1ZVwiOnZhbHVlfSlcbiAgICAgIH0pXG5cbiAgICBkM19jbGFzcyh3cmFwLFwiZXhjbHVkZS1zdWJtaXRcIixcImJ1dHRvblwiKVxuICAgICAgLnN0eWxlKFwiZmxvYXRcIixcInJpZ2h0XCIpXG4gICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIixcIjEyMHB4XCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIyOXB4XCIpXG4gICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsXCIjZjlmOWZiXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXJcIixcIjFweCBzb2xpZCAjY2NjXCIpXG4gICAgICAuc3R5bGUoXCJib3JkZXItcmFkaXVzXCIsXCI1cHhcIilcbiAgICAgIC5zdHlsZShcInZlcnRpY2FsLWFsaWduXCIsXCJ0b3BcIilcbiAgICAgIC5hdHRyKFwidHlwZVwiLFwic3VibWl0XCIpXG4gICAgICAudGV4dChcIk5ldyBGaWx0ZXJcIilcbiAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGZvb3Rlcl9yb3cuc2VsZWN0QWxsKFwiaW5wdXRcIikucHJvcGVydHkoXCJ2YWx1ZVwiKVxuICAgICAgICB2YXIgb3AgPSAgc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleSArIFwiLnNlbGVjdGl6ZVwiXG5cbiAgICAgICAgc2VsZi5vbihcImFkZFwiKSh7XCJmaWVsZFwiOlwiVGl0bGVcIixcIm9wXCI6b3AsXCJ2YWx1ZVwiOnZhbHVlfSlcbiAgICAgIH0pXG5cblxuICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuaW1wb3J0IGFjY2Vzc29yIGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQgaGVhZGVyIGZyb20gJy4vaGVhZGVyJ1xuXG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGlkZW50aXR5KHgpIHsgcmV0dXJuIHggfVxuZnVuY3Rpb24ga2V5KHgpIHsgcmV0dXJuIHgua2V5IH1cblxuZXhwb3J0IGZ1bmN0aW9uIENvbmRpdGlvbmFsU2hvdyh0YXJnZXQpIHtcbiAgdGhpcy5fb24gPSB7fVxuICB0aGlzLl9jbGFzc2VzID0ge31cbiAgdGhpcy5fb2JqZWN0cyA9IHt9XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbmRpdGlvbmFsX3Nob3codGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgQ29uZGl0aW9uYWxTaG93KHRhcmdldClcbn1cblxuQ29uZGl0aW9uYWxTaG93LnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIGNsYXNzZWQ6IGZ1bmN0aW9uKGssIHYpIHtcbiAgICAgIGlmIChrID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9jbGFzc2VzXG4gICAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fY2xhc3Nlc1trXSBcbiAgICAgIHRoaXMuX2NsYXNzZXNba10gPSB2O1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9ICBcbiAgLCBvbjogZnVuY3Rpb24oYWN0aW9uLCBmbikge1xuICAgICAgaWYgKGZuID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9vblthY3Rpb25dIHx8IG5vb3A7XG4gICAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBkcmF3OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIHZhciBjbGFzc2VzID0gdGhpcy5jbGFzc2VkKClcblxuICAgICAgdmFyIHdyYXAgPSBkM191cGRhdGVhYmxlKHRoaXMudGFyZ2V0LFwiLmNvbmRpdGlvbmFsLXdyYXBcIixcImRpdlwiLHRoaXMuZGF0YSgpKVxuICAgICAgICAuY2xhc3NlZChcImNvbmRpdGlvbmFsLXdyYXBcIix0cnVlKVxuXG4gICAgICB2YXIgb2JqZWN0cyA9IGQzX3NwbGF0KHdyYXAsXCIuY29uZGl0aW9uYWxcIixcImRpdlwiLGlkZW50aXR5LCBmdW5jdGlvbih4LGkpIHsgcmV0dXJuIGkgfSlcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlIH0pXG4gICAgICAgIC5jbGFzc2VkKFwiY29uZGl0aW9uYWxcIix0cnVlKVxuICAgICAgICAuY2xhc3NlZChcImhpZGRlblwiLCBmdW5jdGlvbih4KSB7IHJldHVybiAheC5zZWxlY3RlZCB9KVxuXG5cbiAgICAgIE9iamVjdC5rZXlzKGNsYXNzZXMpLm1hcChmdW5jdGlvbihrKSB7IFxuICAgICAgICBvYmplY3RzLmNsYXNzZWQoayxjbGFzc2VzW2tdKVxuICAgICAgfSlcblxuICAgICAgdGhpcy5fb2JqZWN0cyA9IG9iamVjdHNcblxuXG4gICAgICByZXR1cm4gdGhpc1xuICBcbiAgICB9XG4gICwgZWFjaDogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHRoaXMuZHJhdygpXG4gICAgICB0aGlzLl9vYmplY3RzLmVhY2goZm4pXG4gICAgICBcbiAgICB9XG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGUsIGQzX3NwbGF0fSBmcm9tICdoZWxwZXJzJ1xuXG5leHBvcnQgZnVuY3Rpb24gU2hhcmUodGFyZ2V0KSB7XG4gIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICB0aGlzLl9pbm5lciA9IGZ1bmN0aW9uKCkge31cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2hhcmUodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgU2hhcmUodGFyZ2V0KVxufVxuXG5TaGFyZS5wcm90b3R5cGUgPSB7XG4gICAgZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciBvdmVybGF5ID0gZDNfdXBkYXRlYWJsZSh0aGlzLl90YXJnZXQsXCIub3ZlcmxheVwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwib3ZlcmxheVwiLHRydWUpXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIxMDAlXCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLFwiMTAwJVwiKVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLFwiZml4ZWRcIilcbiAgICAgICAgLnN0eWxlKFwidG9wXCIsXCIwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZFwiLFwicmdiYSgwLDAsMCwuNSlcIilcbiAgICAgICAgLnN0eWxlKFwiei1pbmRleFwiLFwiMzAxXCIpXG4gICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgb3ZlcmxheS5yZW1vdmUoKVxuICAgICAgICB9KVxuXG4gICAgICB0aGlzLl9vdmVybGF5ID0gb3ZlcmxheTtcblxuICAgICAgdmFyIGNlbnRlciA9IGQzX3VwZGF0ZWFibGUob3ZlcmxheSxcIi5wb3B1cFwiLFwiZGl2XCIpXG4gICAgICAgIC5jbGFzc2VkKFwicG9wdXAgY29sLW1kLTUgY29sLXNtLThcIix0cnVlKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiYXV0b1wiKVxuICAgICAgICAuc3R5bGUoXCJtYXJnaW4tcmlnaHRcIixcImF1dG9cIilcbiAgICAgICAgLnN0eWxlKFwibWluLWhlaWdodFwiLFwiMzAwcHhcIilcbiAgICAgICAgLnN0eWxlKFwibWFyZ2luLXRvcFwiLFwiMTUwcHhcIilcbiAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLFwid2hpdGVcIilcbiAgICAgICAgLnN0eWxlKFwiZmxvYXRcIixcIm5vbmVcIilcbiAgICAgICAgLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpIHtcbiAgICAgICAgICBkMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKVxuICAgICAgICB9KVxuICAgICAgICAuZWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgc2VsZi5faW5uZXIoZDMuc2VsZWN0KHRoaXMpKVxuICAgICAgICB9KVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCBpbm5lcjogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHRoaXMuX2lubmVyID0gZm4uYmluZCh0aGlzKVxuICAgICAgdGhpcy5kcmF3KClcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fb3ZlcmxheS5yZW1vdmUoKVxuICAgICAgcmV0dXJuIHRoaXMgXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkM191cGRhdGVhYmxlLCBkM19zcGxhdH0gZnJvbSAnaGVscGVycydcbmltcG9ydCAqIGFzIHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IHttZWRpYV9wbGFufSBmcm9tICdtZWRpYV9wbGFuJ1xuaW1wb3J0IGZpbHRlcl92aWV3IGZyb20gJy4vdmlld3MvZmlsdGVyX3ZpZXcnXG5pbXBvcnQgb3B0aW9uX3ZpZXcgZnJvbSAnLi92aWV3cy9vcHRpb25fdmlldydcbmltcG9ydCBkb21haW5fdmlldyBmcm9tICcuL3ZpZXdzL2RvbWFpbl92aWV3J1xuaW1wb3J0IHNlZ21lbnRfdmlldyBmcm9tICcuL3ZpZXdzL3NlZ21lbnRfdmlldydcbmltcG9ydCBzdW1tYXJ5X3ZpZXcgZnJvbSAnLi92aWV3cy9zdW1tYXJ5X3ZpZXcnXG5pbXBvcnQgcmVsYXRpdmVfdmlldyBmcm9tICcuL3ZpZXdzL3JlbGF0aXZlX3RpbWluZ192aWV3J1xuaW1wb3J0IHRpbWluZ192aWV3IGZyb20gJy4vdmlld3MvdGltaW5nX3ZpZXcnXG5cbmltcG9ydCBzdGFnZWRfZmlsdGVyX3ZpZXcgZnJvbSAnLi92aWV3cy9zdGFnZWRfZmlsdGVyX3ZpZXcnXG5cblxuXG5cblxuaW1wb3J0IGNvbmRpdGlvbmFsX3Nob3cgZnJvbSAnLi9nZW5lcmljL2NvbmRpdGlvbmFsX3Nob3cnXG5cbmltcG9ydCBzaGFyZSBmcm9tICcuL2dlbmVyaWMvc2hhcmUnXG5pbXBvcnQgc2VsZWN0IGZyb20gJy4vZ2VuZXJpYy9zZWxlY3QnXG5cbmltcG9ydCBhY2Nlc3NvciBmcm9tICcuL2hlbHBlcnMnXG5pbXBvcnQgKiBhcyB0cmFuc2Zvcm0gZnJvbSAnLi9kYXRhX2hlbHBlcnMnXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5leHBvcnQgZnVuY3Rpb24gTmV3RGFzaGJvYXJkKHRhcmdldCkge1xuICB0aGlzLnRhcmdldCA9IHRhcmdldFxuICB0aGlzLl9vbiA9IHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG5ld19kYXNoYm9hcmQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgTmV3RGFzaGJvYXJkKHRhcmdldClcbn1cblxuTmV3RGFzaGJvYXJkLnByb3RvdHlwZSA9IHtcbiAgICBkYXRhOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiZGF0YVwiLHZhbCkgXG4gICAgfVxuICAsIHN0YWdlZF9maWx0ZXJzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3RhZ2VkX2ZpbHRlcnNcIix2YWwpIHx8IFwiXCJcbiAgICB9XG4gICwgc2F2ZWQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzYXZlZFwiLHZhbCkgXG4gICAgfVxuICAsIGxpbmVfaXRlbXM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJsaW5lX2l0ZW1zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBzZWxlY3RlZF9hY3Rpb246IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJzZWxlY3RlZF9hY3Rpb25cIix2YWwpIFxuICAgIH1cbiAgLCBzZWxlY3RlZF9jb21wYXJpc29uOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic2VsZWN0ZWRfY29tcGFyaXNvblwiLHZhbCkgXG4gICAgfVxuICAsIGFjdGlvbl9kYXRlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWN0aW9uX2RhdGVcIix2YWwpIFxuICAgIH1cbiAgLCBjb21wYXJpc29uX2RhdGU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJjb21wYXJpc29uX2RhdGVcIix2YWwpIFxuICAgIH1cblxuICAsIHZpZXdfb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcInZpZXdfb3B0aW9uc1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgbG9naWNfb3B0aW9uczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljX29wdGlvbnNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGV4cGxvcmVfdGFiczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImV4cGxvcmVfdGFic1wiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgbG9naWNfY2F0ZWdvcmllczogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvZ2ljX2NhdGVnb3JpZXNcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGFjdGlvbnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJhY3Rpb25zXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBzdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwic3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwgdGltZV9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwidGltZV9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBjYXRlZ29yeV9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiY2F0ZWdvcnlfc3VtbWFyeVwiLHZhbCkgfHwgW11cbiAgICB9XG4gICwga2V5d29yZF9zdW1tYXJ5OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwia2V5d29yZF9zdW1tYXJ5XCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBiZWZvcmU6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJiZWZvcmVcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGFmdGVyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBhY2Nlc3Nvci5iaW5kKHRoaXMpKFwiYWZ0ZXJcIix2YWwpIHx8IFtdXG4gICAgfVxuICAsIGZpbHRlcnM6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yLmJpbmQodGhpcykoXCJmaWx0ZXJzXCIsdmFsKSB8fCBbXVxuICAgIH1cbiAgLCBsb2FkaW5nOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCkgdGhpcy5fc2VnbWVudF92aWV3ICYmIHRoaXMuX3NlZ21lbnRfdmlldy5pc19sb2FkaW5nKHZhbCkuZHJhdygpXG4gICAgICByZXR1cm4gYWNjZXNzb3IuYmluZCh0aGlzKShcImxvYWRpbmdcIix2YWwpXG4gICAgfVxuICAsIGRyYXc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YSgpXG5cbiAgICAgIHZhciBvcHRpb25zID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnZpZXdfb3B0aW9ucygpKSlcbiAgICAgIHZhciB0YWJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmV4cGxvcmVfdGFicygpKSlcblxuXG4gICAgICB2YXIgbG9naWMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMubG9naWNfb3B0aW9ucygpKSlcbiAgICAgICAgLCBjYXRlZ29yaWVzID0gdGhpcy5sb2dpY19jYXRlZ29yaWVzKClcbiAgICAgICAgLCBmaWx0ZXJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmZpbHRlcnMoKSkpXG4gICAgICAgICwgYWN0aW9ucyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5hY3Rpb25zKCkpKVxuICAgICAgICAsIHN0YWdlZF9maWx0ZXJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnN0YWdlZF9maWx0ZXJzKCkpKVxuXG5cblxuICAgICAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdGhpcy5fc2VnbWVudF92aWV3ID0gc2VnbWVudF92aWV3KHRhcmdldClcbiAgICAgICAgLmlzX2xvYWRpbmcoc2VsZi5sb2FkaW5nKCkgfHwgZmFsc2UpXG4gICAgICAgIC5zZWdtZW50cyhhY3Rpb25zKVxuICAgICAgICAuZGF0YShzZWxmLnN1bW1hcnkoKSlcbiAgICAgICAgLmFjdGlvbihzZWxmLnNlbGVjdGVkX2FjdGlvbigpIHx8IHt9KVxuICAgICAgICAuYWN0aW9uX2RhdGUoc2VsZi5hY3Rpb25fZGF0ZSgpIHx8IFwiXCIpXG4gICAgICAgIC5jb21wYXJpc29uX2RhdGUoc2VsZi5jb21wYXJpc29uX2RhdGUoKSB8fCBcIlwiKVxuXG4gICAgICAgIC5jb21wYXJpc29uKHNlbGYuc2VsZWN0ZWRfY29tcGFyaXNvbigpIHx8IHt9KVxuICAgICAgICAub24oXCJjaGFuZ2VcIiwgdGhpcy5vbihcImFjdGlvbi5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImFjdGlvbl9kYXRlLmNoYW5nZVwiLCB0aGlzLm9uKFwiYWN0aW9uX2RhdGUuY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJjb21wYXJpc29uLmNoYW5nZVwiLCB0aGlzLm9uKFwiY29tcGFyaXNvbi5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIiwgdGhpcy5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgICAgIC5vbihcInNhdmVkLXNlYXJjaC5jbGlja1wiLCBmdW5jdGlvbigpIHsgIFxuICAgICAgICAgIHZhciBzcyA9IHNoYXJlKGQzLnNlbGVjdChcImJvZHlcIikpLmRyYXcoKVxuICAgICAgICAgIHNzLmlubmVyKGZ1bmN0aW9uKHRhcmdldCkge1xuXG4gICAgICAgICAgICB2YXIgaGVhZGVyID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCIuaGVhZGVyXCIsXCJoNFwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImhlYWRlclwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy10b3BcIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwicGFkZGluZy1ib3R0b21cIixcIjMwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJPcGVuIGEgc2F2ZWQgZGFzaGJvYXJkXCIpXG5cbiAgICAgICAgICAgIHZhciBmb3JtID0gZDNfdXBkYXRlYWJsZSh0YXJnZXQsXCJkaXZcIixcImRpdlwiLHNlbGYuc2F2ZWQoKSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJwYWRkaW5nLWxlZnRcIixcIjI1JVwiKVxuXG4gICAgICAgICAgICBpZiAoIXNlbGYuc2F2ZWQoKSB8fCBzZWxmLnNhdmVkKCkubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgZDNfdXBkYXRlYWJsZShmb3JtLFwic3BhblwiLFwic3BhblwiKVxuICAgICAgICAgICAgICAgIC50ZXh0KFwiWW91IGN1cnJlbnRseSBoYXZlIG5vIHNhdmVkIGRhc2hib2FyZHNcIilcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGQzX3NwbGF0KGZvcm0sXCIucm93XCIsXCJhXCIsZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9LGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubmFtZSB9KVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwicm93XCIsdHJ1ZSlcbiAgICAgICAgICAgICAgICAvLy5hdHRyKFwiaHJlZlwiLCB4ID0+IHguZW5kcG9pbnQpXG4gICAgICAgICAgICAgICAgLnRleHQoeCA9PiB4Lm5hbWUpXG4gICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgICAgLy8gSEFDSzogVEhJUyBpcyBoYWNreS4uLlxuICAgICAgICAgICAgICAgICAgdmFyIF9zdGF0ZSA9IHN0YXRlLnFzKHt9KS5mcm9tKFwiP1wiICsgeC5lbmRwb2ludC5zcGxpdChcIj9cIilbMV0pXG5cbiAgICAgICAgICAgICAgICAgIHNzLmhpZGUoKVxuICAgICAgICAgICAgICAgICAgd2luZG93Lm9ucG9wc3RhdGUoe3N0YXRlOiBfc3RhdGV9KVxuICAgICAgICAgICAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgICAgICAub24oXCJuZXctc2F2ZWQtc2VhcmNoLmNsaWNrXCIsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgICB2YXIgc3MgPSBzaGFyZShkMy5zZWxlY3QoXCJib2R5XCIpKS5kcmF3KClcbiAgICAgICAgICBzcy5pbm5lcihmdW5jdGlvbih0YXJnZXQpIHtcblxuICAgICAgICAgICAgdmFyIGhlYWRlciA9IGQzX3VwZGF0ZWFibGUodGFyZ2V0LFwiLmhlYWRlclwiLFwiaDRcIilcbiAgICAgICAgICAgICAgLmNsYXNzZWQoXCJoZWFkZXJcIix0cnVlKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJjZW50ZXJcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC10cmFuc2Zvcm1cIixcInVwcGVyY2FzZVwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LWZhbWlseVwiLFwiUHJveGltYU5vdmEsIHNhbnMtc2VyaWZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsXCIxMnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsXCJib2xkXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctdG9wXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInBhZGRpbmctYm90dG9tXCIsXCIzMHB4XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiU2F2ZSB0aGlzIGRhc2hib2FyZDpcIilcblxuICAgICAgICAgICAgdmFyIGZvcm0gPSBkM191cGRhdGVhYmxlKHRhcmdldCxcImRpdlwiLFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG4gICAgICAgICAgICB2YXIgbmFtZSA9IGQzX3VwZGF0ZWFibGUoZm9ybSwgXCIubmFtZVwiLCBcImRpdlwiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcIm5hbWVcIix0cnVlKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKG5hbWUsXCIubGFiZWxcIixcImRpdlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTMwcHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLFwiaW5saW5lLWJsb2NrXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtdHJhbnNmb3JtXCIsXCJ1cHBlcmNhc2VcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIixcIlByb3hpbWFOb3ZhLCBzYW5zLXNlcmlmXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLFwiYm9sZFwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsXCJsZWZ0XCIpXG4gICAgICAgICAgICAgIC50ZXh0KFwiRGFzaGJvYXJkIE5hbWU6XCIpXG5cbiAgICAgICAgICAgIHZhciBuYW1lX2lucHV0ID0gZDNfdXBkYXRlYWJsZShuYW1lLFwiaW5wdXRcIixcImlucHV0XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsXCIyNzBweFwiKVxuICAgICAgICAgICAgICAuYXR0cihcInBsYWNlaG9sZGVyXCIsXCJNeSBhd2Vzb21lIHNlYXJjaFwiKVxuXG4gICAgICAgICAgICB2YXIgYWR2YW5jZWQgPSBkM191cGRhdGVhYmxlKGZvcm0sIFwiLmFkdmFuY2VkXCIsIFwiZGV0YWlsc1wiKVxuICAgICAgICAgICAgICAuY2xhc3NlZChcImFkdmFuY2VkXCIsdHJ1ZSlcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjQwMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImxlZnRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsXCJhdXRvXCIpXG5cblxuICAgICAgICAgICAgXG4gICAgICAgICAgICBkM191cGRhdGVhYmxlKGFkdmFuY2VkLFwiLmxhYmVsXCIsXCJkaXZcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjEzMHB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIixcImlubGluZS1ibG9ja1wiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LXRyYW5zZm9ybVwiLFwidXBwZXJjYXNlXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsXCJQcm94aW1hTm92YSwgc2Fucy1zZXJpZlwiKVxuICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIixcImJvbGRcIilcbiAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLFwibGVmdFwiKVxuICAgICAgICAgICAgICAudGV4dChcIkxpbmUgSXRlbTpcIilcblxuICAgICAgICAgICAgdmFyIHNlbGVjdF9ib3ggPSBzZWxlY3QoYWR2YW5jZWQpXG4gICAgICAgICAgICAgIC5vcHRpb25zKHNlbGYubGluZV9pdGVtcygpLm1hcCh4ID0+IHsgcmV0dXJuIHtrZXk6eC5saW5lX2l0ZW1fbmFtZSwgdmFsdWU6IHgubGluZV9pdGVtX2lkfSB9KSApXG4gICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICAgICAgLl9zZWxlY3RcbiAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIixcIjI3MHB4XCIpXG5cblxuXG5cbiAgICAgICAgICAgIHZhciBzZW5kID0gZDNfdXBkYXRlYWJsZShmb3JtLCBcIi5zZW5kXCIsIFwiZGl2XCIpXG4gICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VuZFwiLHRydWUpXG4gICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIixcImNlbnRlclwiKVxuXG5cbiAgICAgICAgICAgIGQzX3VwZGF0ZWFibGUoc2VuZCxcImJ1dHRvblwiLFwiYnV0dG9uXCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcImxpbmUtaGVpZ2h0XCIsXCIxNnB4XCIpXG4gICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpbi10b3BcIixcIjEwcHhcIilcbiAgICAgICAgICAgICAgLnRleHQoXCJTZW5kXCIpXG4gICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gbmFtZV9pbnB1dC5wcm9wZXJ0eShcInZhbHVlXCIpIFxuICAgICAgICAgICAgICAgIHZhciBsaW5lX2l0ZW0gPSBzZWxlY3RfYm94Lm5vZGUoKS5zZWxlY3RlZE9wdGlvbnMubGVuZ3RoID8gc2VsZWN0X2JveC5ub2RlKCkuc2VsZWN0ZWRPcHRpb25zWzBdLl9fZGF0YV9fLmtleSA6IGZhbHNlXG5cbiAgICAgICAgICAgICAgICBkMy54aHIoXCIvY3J1c2hlci9zYXZlZF9kYXNoYm9hcmRcIilcbiAgICAgICAgICAgICAgICAgIC5wb3N0KEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBuYW1lXG4gICAgICAgICAgICAgICAgICAgICAgLCBcImVuZHBvaW50XCI6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAsIFwibGluZV9pdGVtXCI6IGxpbmVfaXRlbVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgKVxuXG4gICAgICAgICAgICAgICAgc3MuaGlkZSgpXG5cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLnRleHQoXCJTYXZlXCIpXG5cblxuXG4gICAgICAgICAgfSlcblxuXG4gICAgICAgIH0pXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgaWYgKHRoaXMuc3VtbWFyeSgpID09IGZhbHNlKSByZXR1cm4gZmFsc2VcblxuICAgICAgZmlsdGVyX3ZpZXcodGFyZ2V0KVxuICAgICAgICAubG9naWMobG9naWMpXG4gICAgICAgIC5jYXRlZ29yaWVzKGNhdGVnb3JpZXMpXG4gICAgICAgIC5maWx0ZXJzKGZpbHRlcnMpXG4gICAgICAgIC5kYXRhKGRhdGEpXG4gICAgICAgIC5vbihcImxvZ2ljLmNoYW5nZVwiLCB0aGlzLm9uKFwibG9naWMuY2hhbmdlXCIpKVxuICAgICAgICAub24oXCJmaWx0ZXIuY2hhbmdlXCIsIHRoaXMub24oXCJmaWx0ZXIuY2hhbmdlXCIpKVxuICAgICAgICAuZHJhdygpXG5cbiAgICAgIG9wdGlvbl92aWV3KHRhcmdldClcbiAgICAgICAgLmRhdGEob3B0aW9ucylcbiAgICAgICAgLm9uKFwic2VsZWN0XCIsIHRoaXMub24oXCJ2aWV3LmNoYW5nZVwiKSApXG4gICAgICAgIC5kcmF3KClcblxuICAgICAgY29uZGl0aW9uYWxfc2hvdyh0YXJnZXQpXG4gICAgICAgIC5kYXRhKG9wdGlvbnMpXG4gICAgICAgIC5jbGFzc2VkKFwidmlldy1vcHRpb25cIix0cnVlKVxuICAgICAgICAuZHJhdygpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHgpIHtcblxuICAgICAgICAgIGlmICgheC5zZWxlY3RlZCkgcmV0dXJuXG5cbiAgICAgICAgICB2YXIgZHRoaXMgPSBkMy5zZWxlY3QodGhpcylcblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwiZGF0YS12aWV3XCIpIHtcbiAgICAgICAgICAgIHZhciBkdiA9IGRvbWFpbl92aWV3KGR0aGlzKVxuICAgICAgICAgICAgICAub3B0aW9ucyh0YWJzKVxuICAgICAgICAgICAgICAuZGF0YShkYXRhKVxuICAgICAgICAgICAgICAub24oXCJzZWxlY3RcIiwgc2VsZi5vbihcInRhYi5jaGFuZ2VcIikgKVxuICAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcIm1lZGlhLXZpZXdcIikge1xuICAgICAgICAgICAgbWVkaWFfcGxhbihkdGhpcy5zdHlsZShcIm1hcmdpbi1sZWZ0XCIsXCItMTVweFwiKS5zdHlsZShcIm1hcmdpbi1yaWdodFwiLFwiLTE1cHhcIikpXG4gICAgICAgICAgICAgLmRhdGEoZGF0YSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHgudmFsdWUgPT0gXCJiYS12aWV3XCIpIHtcbiAgICAgICAgICAgIHJlbGF0aXZlX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi5iZWZvcmUoKSlcbiAgICAgICAgICAgICAub24oXCJzdGFnZS1maWx0ZXJcIixmdW5jdGlvbih4KSB7XG5cbiAgICAgICAgICAgICAgIHN0YWdlZF9maWx0ZXJzID0gc3RhZ2VkX2ZpbHRlcnMuc3BsaXQoXCIsXCIpLmNvbmNhdCh4LmtleSB8fCB4LnVybCkuZmlsdGVyKHggPT4geC5sZW5ndGgpLmpvaW4oXCIsXCIpXG4gICAgICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoc3RhZ2VkX2ZpbHRlcnMpXG4gICAgICAgICAgICAgICBIQUNLYnVpbGRTdGFnZWRGaWx0ZXIoc3RhZ2VkX2ZpbHRlcnMpXG5cbiAgICBcbiAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIC5kcmF3KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeC52YWx1ZSA9PSBcInN1bW1hcnktdmlld1wiKSB7XG4gICAgICAgICAgICBzdW1tYXJ5X3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi5zdW1tYXJ5KCkpXG4gICAgICAgICAgICAgLnRpbWluZyhzZWxmLnRpbWVfc3VtbWFyeSgpKVxuICAgICAgICAgICAgIC5jYXRlZ29yeShzZWxmLmNhdGVnb3J5X3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAuYmVmb3JlKHNlbGYuYmVmb3JlKCkpXG4gICAgICAgICAgICAgLmFmdGVyKHNlbGYuYWZ0ZXIoKSlcbiAgICAgICAgICAgICAua2V5d29yZHMoc2VsZi5rZXl3b3JkX3N1bW1hcnkoKSlcbiAgICAgICAgICAgICAub24oXCJiYS5zb3J0XCIsc2VsZi5vbihcImJhLnNvcnRcIikpXG4gICAgICAgICAgICAgLmRyYXcoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh4LnZhbHVlID09IFwidGltaW5nLXZpZXdcIikge1xuICAgICAgICAgICAgdGltaW5nX3ZpZXcoZHRoaXMpXG4gICAgICAgICAgICAgLmRhdGEoc2VsZi5kYXRhKCkpXG4gICAgICAgICAgICAgLm9uKFwic3RhZ2UtZmlsdGVyXCIsZnVuY3Rpb24oeCkge1xuXG4gICAgICAgICAgICAgICBzdGFnZWRfZmlsdGVycyA9IHN0YWdlZF9maWx0ZXJzLnNwbGl0KFwiLFwiKS5jb25jYXQoeC5rZXkgfHwgeC51cmwpLmZpbHRlcih4ID0+IHgubGVuZ3RoKS5qb2luKFwiLFwiKVxuICAgICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKHN0YWdlZF9maWx0ZXJzKVxuICAgICAgICAgICAgICAgSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZF9maWx0ZXJzKVxuXG4gICAgXG4gICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAuZHJhdygpXG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pXG5cbiAgICAgIGZ1bmN0aW9uIEhBQ0tidWlsZFN0YWdlZEZpbHRlcihzdGFnZWQpIHtcblxuICAgICAgICBzdGFnZWRfZmlsdGVyX3ZpZXcodGFyZ2V0KVxuICAgICAgICAgIC5kYXRhKHN0YWdlZClcbiAgICAgICAgICAub24oXCJ1cGRhdGVcIixmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBzZWxmLm9uKFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikoeClcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vbihcIm1vZGlmeVwiLGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHNlbGYub24oXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiKShcIlwiKVxuICAgICAgICAgICAgc2VsZi5vbihcIm1vZGlmeS1maWx0ZXJcIikoeClcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgLm9uKFwiYWRkXCIsZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgc2VsZi5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIpKFwiXCIpXG4gICAgICAgICAgICBzZWxmLm9uKFwiYWRkLWZpbHRlclwiKSh4KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmRyYXcoKVxuICAgICAgfVxuICAgICAgSEFDS2J1aWxkU3RhZ2VkRmlsdGVyKHN0YWdlZF9maWx0ZXJzKVxuXG4gICAgICByZXR1cm4gdGhpc1xuXG4gICAgfVxuICAsIG9uOiBmdW5jdGlvbihhY3Rpb24sIGZuKSB7XG4gICAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICAgIHRoaXMuX29uW2FjdGlvbl0gPSBmbjtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG59XG4iLCJleHBvcnQgZnVuY3Rpb24gZ2V0RGF0YShhY3Rpb24sZGF5c19hZ28pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNiKXtcbiAgICBjb25zb2xlLmxvZyhkYXlzX2FnbylcblxuICAgIHZhciBVUkwgPSBcIi9jcnVzaGVyL3YyL3Zpc2l0b3IvZG9tYWluc19mdWxsX3RpbWVfbWludXRlL2NhY2hlP3VybF9wYXR0ZXJuPVwiICsgYWN0aW9uLnVybF9wYXR0ZXJuWzBdICsgXCImZmlsdGVyX2lkPVwiICsgYWN0aW9uLmFjdGlvbl9pZFxuXG4gICAgdmFyIGRhdGVfYWdvID0gbmV3IERhdGUoK25ldyBEYXRlKCktMjQqNjAqNjAqMTAwMCpkYXlzX2FnbylcbiAgICAgICwgZGF0ZSA9IGQzLnRpbWUuZm9ybWF0KFwiJVktJW0tJWRcIikoZGF0ZV9hZ28pXG5cbiAgICBpZiAoZGF5c19hZ28pIFVSTCArPSBcIiZkYXRlPVwiICsgZGF0ZVxuXG5cbiAgICBkMy5qc29uKFVSTCxmdW5jdGlvbih2YWx1ZSkge1xuXG4gICAgICB2YXIgY2F0ZWdvcmllcyA9IHZhbHVlLnN1bW1hcnkuY2F0ZWdvcnkubWFwKGZ1bmN0aW9uKHgpIHt4LmtleSA9IHgucGFyZW50X2NhdGVnb3J5X25hbWU7IHJldHVybiB4fSlcbiAgICAgIHZhbHVlLmNhdGVnb3JpZXMgPSBjYXRlZ29yaWVzXG4gICAgICB2YWx1ZS5jYXRlZ29yeSA9IHZhbHVlLnN1bW1hcnkuY2F0ZWdvcnlcbiAgICAgIHZhbHVlLmN1cnJlbnRfaG91ciA9IHZhbHVlLnN1bW1hcnkuaG91clxuICAgICAgdmFsdWUuY2F0ZWdvcnlfaG91ciA9IHZhbHVlLnN1bW1hcnkuY3Jvc3Nfc2VjdGlvblxuXG4gICAgICB2YWx1ZS5vcmlnaW5hbF91cmxzID0gdmFsdWUucmVzcG9uc2VcblxuICAgICAgY2IoZmFsc2UsdmFsdWUpXG4gICAgfSlcbiAgfVxuXG59XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlKGRhdGEsY2IpIHtcbiAgZDMueGhyKFwiL2NydXNoZXIvZnVubmVsL2FjdGlvbj9mb3JtYXQ9anNvblwiKVxuICAgIC5oZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpXG4gICAgLnBvc3QoSlNPTi5zdHJpbmdpZnkoZGF0YSksZnVuY3Rpb24oZXJyLGRhdGEpIHtcbiAgICAgIGNiKGVycixKU09OLnBhcnNlKGRhdGEucmVzcG9uc2UpLnJlc3BvbnNlKVxuICAgIH0pXG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbChjYikge1xuICBkMy5qc29uKFwiL2NydXNoZXIvZnVubmVsL2FjdGlvbj9mb3JtYXQ9anNvblwiLGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFsdWUucmVzcG9uc2UubWFwKGZ1bmN0aW9uKHgpIHsgeC5rZXkgPSB4LmFjdGlvbl9uYW1lOyB4LnZhbHVlID0geC5hY3Rpb25faWQgfSlcbiAgICBjYihmYWxzZSx2YWx1ZS5yZXNwb25zZSlcbiAgfSlcblxufVxuIiwiaW1wb3J0ICogYXMgYSBmcm9tICcuL3NyYy9hY3Rpb24uanMnO1xuXG5leHBvcnQgbGV0IGFjdGlvbiA9IGE7XG5leHBvcnQgbGV0IGRhc2hib2FyZCA9IHtcbiAgICBnZXRBbGw6IGZ1bmN0aW9uKGNiKSB7XG4gICAgICBkMy5qc29uKFwiL2NydXNoZXIvc2F2ZWRfZGFzaGJvYXJkXCIsZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2IoZmFsc2UsdmFsdWUucmVzcG9uc2UpXG4gICAgICB9KVxuICAgIH1cbn1cbmV4cG9ydCBsZXQgbGluZV9pdGVtID0ge1xuICAgIGdldEFsbDogZnVuY3Rpb24oY2IpIHtcbiAgICAgIGQzLmpzb24oXCIvbGluZV9pdGVtXCIsZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2IoZmFsc2UsdmFsdWUucmVzcG9uc2UpXG4gICAgICB9KVxuICAgIH1cbn1cbiIsIi8vaW1wb3J0ICogYXMgZDMgZnJvbSAnZDMnXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhdGVnb3JpZXModmFsdWUpIHtcbiAgdmFyIGNhdGVnb3JpZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy51bmlxdWVzIH0sMClcbiAgICB9KVxuICAgIC5lbnRyaWVzKHZhbHVlLmZ1bGxfdXJscylcblxuICB2YXIgdG90YWwgPSBjYXRlZ29yaWVzLnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcmV0dXJuIHAgKyBjLnZhbHVlcyB9LDApXG5cbiAgY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgIHgudmFsdWUgPSB4LnZhbHVlc1xuICAgIHgucGVyY2VudCA9IHgudmFsdWUgLyB0b3RhbFxuICB9KVxuXG4gIHZhbHVlW1wiZGlzcGxheV9jYXRlZ29yaWVzXCJdID0ge1xuICAgICAgXCJrZXlcIjpcIkNhdGVnb3JpZXNcIlxuICAgICwgXCJ2YWx1ZXNcIjogY2F0ZWdvcmllcy5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXkgIT0gXCJOQVwiIH0pXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2F0ZWdvcnlIb3VyKHZhbHVlKSB7XG4gIHZhciBjYXRlZ29yeV9ob3VyID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgKyB4LmhvdXIgKyB4Lm1pbnV0ZX0pXG4gICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIFwicGFyZW50X2NhdGVnb3J5X25hbWVcIjogdlswXS5wYXJlbnRfY2F0ZWdvcnlfbmFtZVxuICAgICAgICAsIFwiaG91clwiOiB2WzBdLmhvdXJcbiAgICAgICAgLCBcIm1pbnV0ZVwiOiB2WzBdLm1pbnV0ZSBcbiAgICAgICAgLCBcImNvdW50XCI6di5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHJldHVybiBwICsgYy5jb3VudCB9LDApXG4gICAgICB9XG4gICAgfSlcbiAgICAuZW50cmllcyh2YWx1ZS5mdWxsX3VybHMpXG4gICAgLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlcyB9KVxuXG4gIHZhbHVlW1wiY2F0ZWdvcnlfaG91clwiXSA9IGNhdGVnb3J5X2hvdXJcbiBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRGF0YShkYXRhLGJ1Y2tldHMscG9wX2NhdGVnb3JpZXMpIHtcblxuICB2YXIgdGltZXMgPSBkMy5uZXN0KClcbiAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgIC5tYXAoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuXG4gIHZhciBjYXRzID0gZDMubmVzdCgpXG4gICAgLmtleShmdW5jdGlvbih4KSB7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lIH0pXG4gICAgLm1hcChkYXRhLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgIT0gXCJcIiB9KSApXG5cblxuXG5cbiAgdmFyIHRpbWVfY2F0ZWdvcmllcyA9IGJ1Y2tldHMucmVkdWNlKGZ1bmN0aW9uKHAsYykgeyBwW2NdID0ge307IHJldHVybiBwIH0sIHt9KVxuICB2YXIgY2F0ZWdvcnlfdGltZXMgPSBPYmplY3Qua2V5cyhjYXRzKS5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbY10gPSB7fTsgcmV0dXJuIHAgfSwge30pXG5cblxuICB2YXIgY2F0ZWdvcmllcyA9IGQzLm5lc3QoKVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgLmVudHJpZXMoZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCl7IHJldHVybiB4LnBhcmVudF9jYXRlZ29yeV9uYW1lICE9IFwiXCIgfSkgKVxuICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7XG4gICAgICByb3cudmFsdWVzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICAgIHQucGVyY2VudCA9IGQzLnN1bSh0LnZhbHVlcyxmdW5jdGlvbihkKXsgcmV0dXJuIGQudW5pcXVlc30pLyBkMy5zdW0odGltZXNbdC5rZXldLGZ1bmN0aW9uKGQpIHtyZXR1cm4gZC51bmlxdWVzfSkgXG4gICAgICAgIHRpbWVfY2F0ZWdvcmllc1t0LmtleV1bcm93LmtleV0gPSB0LnBlcmNlbnRcbiAgICAgICAgY2F0ZWdvcnlfdGltZXNbcm93LmtleV1bdC5rZXldID0gdC5wZXJjZW50XG5cbiAgICAgIH0pXG4gICAgICByZXR1cm4gcm93XG4gICAgfSlcbiAgICAuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuICgocG9wX2NhdGVnb3JpZXNbYi5rZXldIHx8IHt9KS5ub3JtYWxpemVkX3BvcCB8fCAwKS0gKChwb3BfY2F0ZWdvcmllc1thLmtleV0gfHwge30pLm5vcm1hbGl6ZWRfcG9wIHx8IDApIH0pXG5cblxuICB2YXIgdGltZV9ub3JtYWxpemVfc2NhbGVzID0ge31cblxuICBkMy5lbnRyaWVzKHRpbWVfY2F0ZWdvcmllcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIHRpbWVfbm9ybWFsaXplX3NjYWxlc1t0cm93LmtleV0gPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbZDMubWluKHZhbHVlcyksZDMubWF4KHZhbHVlcyldKVxuICAgICAgLnJhbmdlKFswLDFdKVxuICB9KVxuXG4gIHZhciBjYXRfbm9ybWFsaXplX3NjYWxlcyA9IHt9XG5cbiAgZDMuZW50cmllcyhjYXRlZ29yeV90aW1lcykubWFwKGZ1bmN0aW9uKHRyb3cpIHtcbiAgICB2YXIgdmFsdWVzID0gZDMuZW50cmllcyh0cm93LnZhbHVlKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC52YWx1ZSB9KVxuICAgIGNhdF9ub3JtYWxpemVfc2NhbGVzW3Ryb3cua2V5XSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFtkMy5taW4odmFsdWVzKSxkMy5tYXgodmFsdWVzKV0pXG4gICAgICAucmFuZ2UoWzAsMV0pXG4gIH0pXG5cbiAgY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24ocCkge1xuICAgIHZhciBjYXQgPSBwLmtleVxuICAgIHAudmFsdWVzLm1hcChmdW5jdGlvbihxKSB7XG4gICAgICBxLm5vcm1fY2F0ID0gY2F0X25vcm1hbGl6ZV9zY2FsZXNbY2F0XShxLnBlcmNlbnQpXG4gICAgICBxLm5vcm1fdGltZSA9IHRpbWVfbm9ybWFsaXplX3NjYWxlc1txLmtleV0ocS5wZXJjZW50KVxuXG4gICAgICBxLnNjb3JlID0gMipxLm5vcm1fY2F0LzMgKyBxLm5vcm1fdGltZS8zXG4gICAgICBxLnNjb3JlID0gcS5ub3JtX3RpbWVcblxuICAgICAgdmFyIHBlcmNlbnRfcG9wID0gcG9wX2NhdGVnb3JpZXNbY2F0XSA/IHBvcF9jYXRlZ29yaWVzW2NhdF0ucGVyY2VudF9wb3AgOiAwXG5cbiAgICAgIHEucGVyY2VudF9kaWZmID0gKHEucGVyY2VudCAtIHBlcmNlbnRfcG9wKS9wZXJjZW50X3BvcFxuXG4gICAgfSlcbiAgfSlcblxuICByZXR1cm4gY2F0ZWdvcmllc1xufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJztcbmltcG9ydCB7ZmlsdGVyX2RhdGF9IGZyb20gJ2ZpbHRlcic7XG5pbXBvcnQgKiBhcyBkYXRhIGZyb20gJy4uL2RhdGEnXG5pbXBvcnQge2J1aWxkRG9tYWlucywgYnVpbGRVcmxzLCBidWlsZFN1bW1hcnlEYXRhLCBidWlsZFN1bW1hcnlBZ2dyZWdhdGlvbiwgcHJlcERhdGF9IGZyb20gJy4uL2RhdGFfaGVscGVycydcblxuY29uc3QgcyA9IHN0YXRlO1xuXG52YXIgYnVpbGRDYXRlZ29yaWVzID0gZGF0YS5idWlsZENhdGVnb3JpZXNcbiAgLCBidWlsZENhdGVnb3J5SG91ciA9IGRhdGEuYnVpbGRDYXRlZ29yeUhvdXJcbiAgLCBidWlsZERhdGEgPSBkYXRhLmJ1aWxkRGF0YTtcblxuXG5mdW5jdGlvbiBwcmVwYXJlRmlsdGVycyhmaWx0ZXJzKSB7XG4gIHZhciBtYXBwaW5nID0ge1xuICAgICAgXCJDYXRlZ29yeVwiOiBcInBhcmVudF9jYXRlZ29yeV9uYW1lXCJcbiAgICAsIFwiVGl0bGVcIjogXCJ1cmxcIlxuICAgICwgXCJUaW1lXCI6IFwiaG91clwiXG4gIH1cblxuICB2YXIgZmlsdGVycyA9IGZpbHRlcnMuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE9iamVjdC5rZXlzKHgpLmxlbmd0aCAmJiB4LnZhbHVlIH0pLm1hcChmdW5jdGlvbih6KSB7XG4gICAgcmV0dXJuIHsgXG4gICAgICAgIFwiZmllbGRcIjogbWFwcGluZ1t6LmZpZWxkXVxuICAgICAgLCBcIm9wXCI6IHoub3BcbiAgICAgICwgXCJ2YWx1ZVwiOiB6LnZhbHVlXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBmaWx0ZXJzXG59XG5cblxuXG52YXIgb3BzID0ge1xuICAgIFwiaXMgaW5cIjogZnVuY3Rpb24oZmllbGQsdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgdmFsdWVzID0gdmFsdWUuc3BsaXQoXCIsXCIpXG4gICAgICAgICAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24ocCx2YWx1ZSkgeyByZXR1cm4gcCArIFN0cmluZyh4W2ZpZWxkXSkuaW5kZXhPZihTdHJpbmcodmFsdWUpKSA+IC0xIH0sIDApID4gMFxuICAgICAgICB9IFxuICAgICAgfVxuICAsIFwiaXMgbm90IGluXCI6IGZ1bmN0aW9uKGZpZWxkLHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKVxuICAgICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHAsdmFsdWUpIHsgcmV0dXJuIHAgKyBTdHJpbmcoeFtmaWVsZF0pLmluZGV4T2YoU3RyaW5nKHZhbHVlKSkgPiAtMSB9LCAwKSA9PSAwXG4gICAgICAgIH0gXG4gICAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG4gIGNvbnN0IHMgPSBzdGF0ZTtcblxuICBzdGF0ZVxuICAgIC5yZWdpc3RlckV2ZW50KFwiYWRkLWZpbHRlclwiLCBmdW5jdGlvbihmaWx0ZXIpIHsgXG4gICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIscy5zdGF0ZSgpLmZpbHRlcnMuY29uY2F0KGZpbHRlcikuZmlsdGVyKHggPT4geC52YWx1ZSkgKSBcbiAgICB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwibW9kaWZ5LWZpbHRlclwiLCBmdW5jdGlvbihmaWx0ZXIpIHsgXG4gICAgICB2YXIgZmlsdGVycyA9IHMuc3RhdGUoKS5maWx0ZXJzXG4gICAgICB2YXIgaGFzX2V4aXNpdGluZyA9IGZpbHRlcnMuZmlsdGVyKHggPT4gKHguZmllbGQgKyB4Lm9wKSA9PSAoZmlsdGVyLmZpZWxkICsgZmlsdGVyLm9wKSApXG4gICAgICBcbiAgICAgIGlmIChoYXNfZXhpc2l0aW5nLmxlbmd0aCkge1xuICAgICAgICB2YXIgbmV3X2ZpbHRlcnMgPSBmaWx0ZXJzLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIGlmICgoeC5maWVsZCA9PSBmaWx0ZXIuZmllbGQpICYmICh4Lm9wID09IGZpbHRlci5vcCkpIHtcbiAgICAgICAgICAgIHgudmFsdWUgKz0gXCIsXCIgKyBmaWx0ZXIudmFsdWVcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHhcbiAgICAgICAgfSlcbiAgICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLG5ld19maWx0ZXJzLmZpbHRlcih4ID0+IHgudmFsdWUpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcy5wdWJsaXNoKFwiZmlsdGVyc1wiLHMuc3RhdGUoKS5maWx0ZXJzLmNvbmNhdChmaWx0ZXIpLmZpbHRlcih4ID0+IHgudmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJzdGFnZWQtZmlsdGVyLmNoYW5nZVwiLCBmdW5jdGlvbihzdHIpIHsgcy5wdWJsaXNoKFwic3RhZ2VkX2ZpbHRlclwiLHN0ciApIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJsb2dpYy5jaGFuZ2VcIiwgZnVuY3Rpb24obG9naWMpIHsgcy5wdWJsaXNoKFwibG9naWNfb3B0aW9uc1wiLGxvZ2ljKSB9KVxuICAgIC5yZWdpc3RlckV2ZW50KFwiZmlsdGVyLmNoYW5nZVwiLCBmdW5jdGlvbihmaWx0ZXJzKSB7IHMucHVibGlzaEJhdGNoKHsgXCJmaWx0ZXJzXCI6ZmlsdGVycyB9KSB9KVxuXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIiwgZnVuY3Rpb24oZXJyLGZpbHRlcnMsX3N0YXRlKSB7XG5cbiAgICAgIHZhciBmaWx0ZXJzID0gX3N0YXRlLmZpbHRlcnNcbiAgICAgIHZhciB2YWx1ZSA9IF9zdGF0ZS5kYXRhXG5cbiAgICAgIGlmICh2YWx1ZSA9PSB1bmRlZmluZWQpIHJldHVybiAvLyByZXR1cm4gZWFybHkgaWYgdGhlcmUgaXMgbm8gZGF0YS4uLlxuXG4gICAgICB2YXIgZmlsdGVycyA9IHByZXBhcmVGaWx0ZXJzKGZpbHRlcnMpXG5cbiAgICAgIHZhciBsb2dpYyA9IF9zdGF0ZS5sb2dpY19vcHRpb25zLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LnNlbGVjdGVkIH0pXG4gICAgICBsb2dpYyA9IGxvZ2ljLmxlbmd0aCA+IDAgPyBsb2dpY1swXSA6IF9zdGF0ZS5sb2dpY19vcHRpb25zWzBdXG5cbiAgICAgIHZhciBmdWxsX3VybHMgPSBmaWx0ZXJfZGF0YSh2YWx1ZS5vcmlnaW5hbF91cmxzKVxuICAgICAgICAub3AoXCJpcyBpblwiLCBvcHNbXCJpcyBpblwiXSlcbiAgICAgICAgLm9wKFwiaXMgbm90IGluXCIsIG9wc1tcImlzIG5vdCBpblwiXSlcbiAgICAgICAgLmxvZ2ljKGxvZ2ljLnZhbHVlKVxuICAgICAgICAuYnkoZmlsdGVycylcblxuXG4gICAgICAvLyBzaG91bGQgbm90IGZpbHRlciBpZi4uLlxuICAgICAgLy9kZWJ1Z2dlclxuXG4gICAgICBpZiAoICh2YWx1ZS5mdWxsX3VybHMpICYmIFxuICAgICAgICAgICAodmFsdWUuZnVsbF91cmxzLmxlbmd0aCA9PSBmdWxsX3VybHMubGVuZ3RoKSAmJiBcbiAgICAgICAgICAgKF9zdGF0ZS5zZWxlY3RlZF9jb21wYXJpc29uICYmIChfc3RhdGUuY29tcGFyaXNvbl9kYXRhID09IHZhbHVlLmNvbXBhcmlzb24pKSkgcmV0dXJuXG5cbiAgICAgIHZhbHVlLmZ1bGxfdXJscyA9IGZ1bGxfdXJsc1xuXG4gICAgICB2YXIgY29tcGFyZVRvID0gX3N0YXRlLmNvbXBhcmlzb25fZGF0YSA/IF9zdGF0ZS5jb21wYXJpc29uX2RhdGEub3JpZ2luYWxfdXJscyA6IHZhbHVlLm9yaWdpbmFsX3VybHM7XG5cbiAgICAgIHZhbHVlLmNvbXBhcmlzb24gPSBjb21wYXJlVG9cblxuICAgICAgLy8gYWxsIHRoaXMgbG9naWMgc2hvdWxkIGJlIG1vdmUgdG8gdGhlIHJlc3BlY3RpdmUgdmlld3MuLi5cblxuICAgICAgLy8gLS0tLS0gU1RBUlQgOiBGT1IgTUVESUEgUExBTiAtLS0tLSAvL1xuXG4gICAgICBidWlsZENhdGVnb3JpZXModmFsdWUpXG4gICAgICBidWlsZENhdGVnb3J5SG91cih2YWx1ZSlcblxuICAgICAgLy8gLS0tLS0gRU5EIDogRk9SIE1FRElBIFBMQU4gLS0tLS0gLy9cblxuICAgICAgdmFyIHRhYnMgPSBbXG4gICAgICAgICAgYnVpbGREb21haW5zKHZhbHVlKVxuICAgICAgICAsIGJ1aWxkVXJscyh2YWx1ZSlcbiAgICAgICAgLy8sIGJ1aWxkVG9waWNzKHZhbHVlKVxuICAgICAgXVxuXG4gICAgICB2YXIgc3VtbWFyeV9kYXRhID0gYnVpbGRTdW1tYXJ5RGF0YSh2YWx1ZS5mdWxsX3VybHMpXG4gICAgICAgICwgcG9wX3N1bW1hcnlfZGF0YSA9IGJ1aWxkU3VtbWFyeURhdGEoY29tcGFyZVRvKVxuXG4gICAgICB2YXIgc3VtbWFyeSA9IGJ1aWxkU3VtbWFyeUFnZ3JlZ2F0aW9uKHN1bW1hcnlfZGF0YSxwb3Bfc3VtbWFyeV9kYXRhKVxuXG4gICAgICB2YXIgdHMgPSBwcmVwRGF0YSh2YWx1ZS5mdWxsX3VybHMpXG4gICAgICAgICwgcG9wX3RzID0gcHJlcERhdGEoY29tcGFyZVRvKVxuXG4gICAgICB2YXIgbWFwcGVkdHMgPSB0cy5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYzsgcmV0dXJuIHB9LCB7fSlcblxuICAgICAgdmFyIHByZXBwZWQgPSBwb3BfdHMubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGtleTogeC5rZXlcbiAgICAgICAgICAsIGhvdXI6IHguaG91clxuICAgICAgICAgICwgbWludXRlOiB4Lm1pbnV0ZVxuICAgICAgICAgICwgdmFsdWUyOiB4LnZhbHVlXG4gICAgICAgICAgLCB2YWx1ZTogbWFwcGVkdHNbeC5rZXldID8gIG1hcHBlZHRzW3gua2V5XS52YWx1ZSA6IDBcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgdmFyIGNhdF9yb2xsID0gZDMubmVzdCgpXG4gICAgICAgIC5rZXkoZnVuY3Rpb24oaykgeyByZXR1cm4gay5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgICAgICAucm9sbHVwKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICByZXR1cm4gdi5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7XG4gICAgICAgICAgICBwLnZpZXdzICs9IGMuY291bnRcbiAgICAgICAgICAgIHAuc2Vzc2lvbnMgKz0gYy51bmlxdWVzXG4gICAgICAgICAgICByZXR1cm4gcFxuICAgICAgICAgIH0seyBhcnRpY2xlczoge30sIHZpZXdzOiAwLCBzZXNzaW9uczogMH0pXG4gICAgICAgIH0pXG4gICAgICAgIC5lbnRyaWVzKHZhbHVlLmZ1bGxfdXJscylcblxuICAgICAgdmFyIHBvcF9jYXRfcm9sbCA9IGQzLm5lc3QoKVxuICAgICAgICAua2V5KGZ1bmN0aW9uKGspIHsgcmV0dXJuIGsucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAgICAgLnJvbGx1cChmdW5jdGlvbih2KSB7XG4gICAgICAgICAgcmV0dXJuIHYucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICAgICAgcC52aWV3cyArPSBjLmNvdW50XG4gICAgICAgICAgICBwLnNlc3Npb25zICs9IGMudW5pcXVlc1xuICAgICAgICAgICAgcmV0dXJuIHBcbiAgICAgICAgICB9LHsgYXJ0aWNsZXM6IHt9LCB2aWV3czogMCwgc2Vzc2lvbnM6IDB9KVxuICAgICAgICB9KVxuICAgICAgICAuZW50cmllcyhjb21wYXJlVG8pXG5cbiAgICAgIHZhciBtYXBwZWRfY2F0X3JvbGwgPSBjYXRfcm9sbC5yZWR1Y2UoZnVuY3Rpb24ocCxjKSB7IHBbYy5rZXldID0gYzsgcmV0dXJuIHB9LCB7fSlcblxuICAgICAgdmFyIGNhdF9zdW1tYXJ5ID0gcG9wX2NhdF9yb2xsLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBrZXk6IHgua2V5XG4gICAgICAgICAgLCBwb3A6IHgudmFsdWVzLnZpZXdzXG4gICAgICAgICAgLCBzYW1wOiBtYXBwZWRfY2F0X3JvbGxbeC5rZXldID8gbWFwcGVkX2NhdF9yb2xsW3gua2V5XS52YWx1ZXMudmlld3MgOiAwXG4gICAgICAgIH1cbiAgICAgIH0pLnNvcnQoZnVuY3Rpb24oYSxiKSB7IHJldHVybiBiLnBvcCAtIGEucG9wfSlcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSAhPSBcIk5BXCIgfSlcblxuICAgICAgdmFyIHBhcnNlV29yZHMgPSBmdW5jdGlvbihwLGMpIHtcbiAgICAgICAgdmFyIHNwbGl0dGVkID0gYy51cmwuc3BsaXQoXCIuY29tL1wiKVxuICAgICAgICBpZiAoc3BsaXR0ZWQubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHZhciBsYXN0ID0gc3BsaXR0ZWRbMV0uc3BsaXQoXCIvXCIpLnNsaWNlKC0xKVswXS5zcGxpdChcIj9cIilbMF1cbiAgICAgICAgICB2YXIgd29yZHMgPSBsYXN0LnNwbGl0KFwiLVwiKS5qb2luKFwiK1wiKS5zcGxpdChcIitcIikuam9pbihcIl9cIikuc3BsaXQoXCJfXCIpLmpvaW4oXCIgXCIpLnNwbGl0KFwiIFwiKVxuICAgICAgICAgIHdvcmRzLm1hcChmdW5jdGlvbih3KSB7IFxuICAgICAgICAgICAgaWYgKCh3Lmxlbmd0aCA8PSA0KSB8fCAoU3RyaW5nKHBhcnNlSW50KHdbMF0pKSA9PSB3WzBdICkgfHwgKHcuaW5kZXhPZihcImFzcFwiKSA+IC0xKSB8fCAody5pbmRleE9mKFwicGhwXCIpID4gLTEpIHx8ICh3LmluZGV4T2YoXCJodG1sXCIpID4gLTEpICkgcmV0dXJuXG4gICAgICAgICAgICBwW3ddID0gcFt3XSA/IHBbd10gKyAxIDogMVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBcbiAgICAgIH1cblxuICAgICAgdmFyIHBvcF9jb3VudHMgPSBjb21wYXJlVG8ucmVkdWNlKHBhcnNlV29yZHMse30pXG4gICAgICB2YXIgc2FtcF9jb3VudHMgPSB2YWx1ZS5mdWxsX3VybHMucmVkdWNlKHBhcnNlV29yZHMse30pXG5cblxuICAgICAgdmFyIGVudHJpZXMgPSBkMy5lbnRyaWVzKHBvcF9jb3VudHMpLmZpbHRlcihmdW5jdGlvbih4KSB7IHJldHVybiB4LnZhbHVlID4gMX0pXG4gICAgICAgIC5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHguc2FtcCA9IHNhbXBfY291bnRzW3gua2V5XVxuICAgICAgICAgIHgucG9wID0geC52YWx1ZVxuICAgICAgICAgIHJldHVybiB4XG4gICAgICAgIH0pXG4gICAgICAgIC5zb3J0KGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYi5wb3AgLSBhLnBvcH0pXG4gICAgICAgIC5zbGljZSgwLDI1KVxuXG5cbiAgICAgIHZhciBtb2RpZnlXaXRoQ29tcGFyaXNvbnMgPSBmdW5jdGlvbihkcykge1xuXG4gICAgICAgIHZhciBhZ2dzID0gZHMucmVkdWNlKGZ1bmN0aW9uKHAsYykge1xuICAgICAgICAgIHAucG9wX21heCA9IChwLnBvcF9tYXggfHwgMCkgPCBjLnBvcCA/IGMucG9wIDogcC5wb3BfbWF4XG4gICAgICAgICAgcC5wb3BfdG90YWwgPSAocC5wb3BfdG90YWwgfHwgMCkgKyBjLnBvcFxuXG4gICAgICAgICAgaWYgKGMuc2FtcCkge1xuICAgICAgICAgICAgcC5zYW1wX21heCA9IChwLnNhbXBfbWF4IHx8IDApID4gYy5zYW1wID8gcC5zYW1wX21heCA6IGMuc2FtcFxuICAgICAgICAgICAgcC5zYW1wX3RvdGFsID0gKHAuc2FtcF90b3RhbCB8fCAwKSArIGMuc2FtcFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBwXG4gICAgICAgIH0se30pXG5cbiAgICAgICAgLy9jb25zb2xlLmxvZyhhZ2dzKVxuXG4gICAgICAgIGRzLm1hcChmdW5jdGlvbihvKSB7XG4gICAgICAgICAgby5ub3JtYWxpemVkX3BvcCA9IG8ucG9wIC8gYWdncy5wb3BfbWF4XG4gICAgICAgICAgby5wZXJjZW50X3BvcCA9IG8ucG9wIC8gYWdncy5wb3BfdG90YWxcblxuICAgICAgICAgIG8ubm9ybWFsaXplZF9zYW1wID0gby5zYW1wIC8gYWdncy5zYW1wX21heFxuICAgICAgICAgIG8ucGVyY2VudF9zYW1wID0gby5zYW1wIC8gYWdncy5zYW1wX3RvdGFsXG5cbiAgICAgICAgICBvLm5vcm1hbGl6ZWRfZGlmZiA9IChvLm5vcm1hbGl6ZWRfc2FtcCAtIG8ubm9ybWFsaXplZF9wb3ApL28ubm9ybWFsaXplZF9wb3BcbiAgICAgICAgICBvLnBlcmNlbnRfZGlmZiA9IChvLnBlcmNlbnRfc2FtcCAtIG8ucGVyY2VudF9wb3ApL28ucGVyY2VudF9wb3BcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgbW9kaWZ5V2l0aENvbXBhcmlzb25zKGNhdF9zdW1tYXJ5KVxuICAgICAgbW9kaWZ5V2l0aENvbXBhcmlzb25zKGVudHJpZXMpXG5cblxuICAgICAgaWYgKHZhbHVlLmJlZm9yZSkge1xuICAgICAgICB2YXIgYmVmb3JlX3VybHMgPSBmaWx0ZXJfZGF0YSh2YWx1ZS5iZWZvcmUpXG4gICAgICAgICAgLm9wKFwiaXMgaW5cIiwgb3BzW1wiaXMgaW5cIl0pXG4gICAgICAgICAgLm9wKFwiaXMgbm90IGluXCIsIG9wc1tcImlzIG5vdCBpblwiXSlcbiAgICAgICAgICAvLy5vcChcImRvZXMgbm90IGNvbnRhaW5cIiwgb3BzW1wiZG9lcyBub3QgY29udGFpblwiXSlcbiAgICAgICAgICAvLy5vcChcImNvbnRhaW5zXCIsIG9wc1tcImNvbnRhaW5zXCJdKVxuICAgICAgICAgIC5sb2dpYyhsb2dpYy52YWx1ZSlcbiAgICAgICAgICAuYnkoZmlsdGVycylcblxuICAgICAgICB2YXIgYWZ0ZXJfdXJscyA9IGZpbHRlcl9kYXRhKHZhbHVlLmFmdGVyKVxuICAgICAgICAgIC5vcChcImlzIGluXCIsIG9wc1tcImlzIGluXCJdKVxuICAgICAgICAgIC5vcChcImlzIG5vdCBpblwiLCBvcHNbXCJpcyBub3QgaW5cIl0pXG4gICAgICAgICAgLy8ub3AoXCJkb2VzIG5vdCBjb250YWluXCIsIG9wc1tcImRvZXMgbm90IGNvbnRhaW5cIl0pXG4gICAgICAgICAgLy8ub3AoXCJjb250YWluc1wiLCBvcHNbXCJjb250YWluc1wiXSlcbiAgICAgICAgICAubG9naWMobG9naWMudmFsdWUpXG4gICAgICAgICAgLmJ5KGZpbHRlcnMpXG5cblxuICAgICAgICB2YXIgYnUgPSBkMy5uZXN0KClcbiAgICAgICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgucGFyZW50X2NhdGVnb3J5X25hbWUgfSlcbiAgICAgICAgICAua2V5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudGltZV9kaWZmX2J1Y2tldCB9KVxuICAgICAgICAgIC5lbnRyaWVzKGJlZm9yZV91cmxzKVxuXG4gICAgICAgIHZhciBhdSA9IGQzLm5lc3QoKVxuICAgICAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5wYXJlbnRfY2F0ZWdvcnlfbmFtZSB9KVxuICAgICAgICAgIC5rZXkoZnVuY3Rpb24oeCkgeyByZXR1cm4geC50aW1lX2RpZmZfYnVja2V0IH0pXG4gICAgICAgICAgLmVudHJpZXMoYWZ0ZXJfdXJscylcblxuICAgICAgICB2YXIgYnVja2V0cyA9IFsxMCwzMCw2MCwxMjAsMTgwLDM2MCw3MjAsMTQ0MCwyODgwLDU3NjAsMTAwODBdLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4KjYwIH0pXG4gICAgICAgICAgLCBwb3BfY2F0ZWdvcmllcyA9IGNhdF9zdW1tYXJ5LnJlZHVjZShmdW5jdGlvbihwLGMpIHsgcFtjLmtleV0gPSBjOyByZXR1cm4gcCB9LCB7fSlcbiAgICAgICAgICAsIGNhdHMgPSBjYXRfc3VtbWFyeS5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC5rZXkgfSlcblxuICAgICAgICB2YXIgYmVmb3JlX2NhdGVnb3JpZXMgPSBidWlsZERhdGEoYmVmb3JlX3VybHMsYnVja2V0cyxwb3BfY2F0ZWdvcmllcylcbiAgICAgICAgICAsIGFmdGVyX2NhdGVnb3JpZXMgPSBidWlsZERhdGEoYWZ0ZXJfdXJscyxidWNrZXRzLHBvcF9jYXRlZ29yaWVzKVxuXG4gICAgICAgIHZhciBzb3J0YnkgPSBfc3RhdGUuc29ydGJ5XG5cbiAgICAgICAgaWYgKHNvcnRieSA9PSBcInNjb3JlXCIpIHtcblxuICAgICAgICAgIGJlZm9yZV9jYXRlZ29yaWVzID0gYmVmb3JlX2NhdGVnb3JpZXMuc29ydChmdW5jdGlvbihhLGIpIHsgXG4gICAgICAgICAgICB2YXIgcCA9IC0xLCBxID0gLTE7XG4gICAgICAgICAgICB0cnkgeyBwID0gYi52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5zY29yZSB9IGNhdGNoKGUpIHt9XG4gICAgICAgICAgICB0cnkgeyBxID0gYS52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5zY29yZSB9IGNhdGNoKGUpIHt9XG4gICAgICAgICAgICByZXR1cm4gZDMuYXNjZW5kaW5nKHAsIHEpXG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgfSBlbHNlIGlmIChzb3J0YnkgPT0gXCJwb3BcIikge1xuXG4gICAgICAgICAgYmVmb3JlX2NhdGVnb3JpZXMgPSBiZWZvcmVfY2F0ZWdvcmllcy5zb3J0KGZ1bmN0aW9uKGEsYikgeyBcbiAgICAgICAgICAgIHZhciBwID0gY2F0cy5pbmRleE9mKGEua2V5KVxuICAgICAgICAgICAgICAsIHEgPSBjYXRzLmluZGV4T2YoYi5rZXkpXG4gICAgICAgICAgICByZXR1cm4gZDMuYXNjZW5kaW5nKHAgPiAtMSA/IHAgOiAxMDAwMCwgcSA+IC0xID8gcSA6IDEwMDAwKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgIGJlZm9yZV9jYXRlZ29yaWVzID0gYmVmb3JlX2NhdGVnb3JpZXMuc29ydChmdW5jdGlvbihhLGIpIHsgXG4gICAgICAgICAgICB2YXIgcCA9IC0xLCBxID0gLTE7XG4gICAgICAgICAgICB0cnkgeyBwID0gYi52YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHgpeyByZXR1cm4geC5rZXkgPT0gXCI2MDBcIiB9KVswXS5wZXJjZW50X2RpZmYgfSBjYXRjaChlKSB7fVxuICAgICAgICAgICAgdHJ5IHsgcSA9IGEudmFsdWVzLmZpbHRlcihmdW5jdGlvbih4KXsgcmV0dXJuIHgua2V5ID09IFwiNjAwXCIgfSlbMF0ucGVyY2VudF9kaWZmIH0gY2F0Y2goZSkge31cbiAgICAgICAgICAgIHJldHVybiBkMy5hc2NlbmRpbmcocCwgcSlcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgXG4gICAgICAgIH1cblxuXG4gICAgICAgIHZhciBvcmRlciA9IGJlZm9yZV9jYXRlZ29yaWVzLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4LmtleSB9KVxuXG4gICAgICAgIGFmdGVyX2NhdGVnb3JpZXMgPSBhZnRlcl9jYXRlZ29yaWVzLmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4gb3JkZXIuaW5kZXhPZih4LmtleSkgPiAtMX0pLnNvcnQoZnVuY3Rpb24oYSxiKSB7XG4gICAgICAgICAgcmV0dXJuIG9yZGVyLmluZGV4T2YoYS5rZXkpIC0gb3JkZXIuaW5kZXhPZihiLmtleSlcbiAgICAgICAgfSlcblxuICAgICAgICBzLnNldFN0YXRpYyhcImJlZm9yZV91cmxzXCIse1wiYWZ0ZXJcIjphZnRlcl91cmxzLFwiYmVmb3JlXCI6YmVmb3JlX3VybHMsXCJjYXRlZ29yeVwiOmNhdF9zdW1tYXJ5LFwiYmVmb3JlX2NhdGVnb3JpZXNcIjpiZWZvcmVfY2F0ZWdvcmllcyxcImFmdGVyX2NhdGVnb3JpZXNcIjphZnRlcl9jYXRlZ29yaWVzLFwic29ydGJ5XCI6dmFsdWUuc29ydGJ5fSkgXG4gICAgICAgIHMuc2V0U3RhdGljKFwiYWZ0ZXJfdXJsc1wiLCBhZnRlcl91cmxzKVxuXG4gICAgICAgIFxuXG5cbiAgICAgIH1cblxuICAgICAgXG5cbiAgICAgIHMuc2V0U3RhdGljKFwia2V5d29yZF9zdW1tYXJ5XCIsIGVudHJpZXMpIFxuICAgICAgcy5zZXRTdGF0aWMoXCJ0aW1lX3N1bW1hcnlcIiwgcHJlcHBlZClcbiAgICAgIHMuc2V0U3RhdGljKFwiY2F0ZWdvcnlfc3VtbWFyeVwiLCBjYXRfc3VtbWFyeSlcblxuICAgICAgcy5zZXRTdGF0aWMoXCJzdW1tYXJ5XCIsc3VtbWFyeSlcbiAgICAgIHMuc2V0U3RhdGljKFwidGFic1wiLHRhYnMpXG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJmb3JtYXR0ZWRfZGF0YVwiLHZhbHVlKVxuXG4gICAgfSlcbn1cbiIsImltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSc7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgY29uc3QgcyA9IHN0YXRlO1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhY3Rpb24uY2hhbmdlXCIsIGZ1bmN0aW9uKGFjdGlvbikgeyBzLnB1Ymxpc2goXCJzZWxlY3RlZF9hY3Rpb25cIixhY3Rpb24pIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIiwgZnVuY3Rpb24oZGF0ZSkgeyBzLnB1Ymxpc2goXCJhY3Rpb25fZGF0ZVwiLGRhdGUpIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIsIGZ1bmN0aW9uKGRhdGUpIHsgcy5wdWJsaXNoKFwiY29tcGFyaXNvbl9kYXRlXCIsZGF0ZSkgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcImNvbXBhcmlzb24uY2hhbmdlXCIsIGZ1bmN0aW9uKGFjdGlvbikgeyBcbiAgICAgIGlmIChhY3Rpb24udmFsdWUgPT0gZmFsc2UpIHJldHVybiBzLnB1Ymxpc2goXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsZmFsc2UpXG4gICAgICBzLnB1Ymxpc2goXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsYWN0aW9uKVxuICAgIH0pXG5cblxufVxuIiwiaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IGZpbHRlckluaXQgZnJvbSAnLi9ldmVudHMvZmlsdGVyX2V2ZW50cydcbmltcG9ydCBhY3Rpb25Jbml0IGZyb20gJy4vZXZlbnRzL2FjdGlvbl9ldmVudHMnXG5cblxuY29uc3QgcyA9IHN0YXRlO1xuXG5jb25zdCBkZWVwY29weSA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoeCkpXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgZmlsdGVySW5pdCgpXG4gIGFjdGlvbkluaXQoKVxuXG4gIC8vIE9USEVSIGV2ZW50c1xuXG4gIHN0YXRlXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJ2aWV3LmNoYW5nZVwiLCBmdW5jdGlvbih4KSB7XG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIix0cnVlKVxuICAgICAgdmFyIENQID0gZGVlcGNvcHkocy5zdGF0ZSgpLmRhc2hib2FyZF9vcHRpb25zKS5tYXAoZnVuY3Rpb24oZCkgeyBkLnNlbGVjdGVkID0gKHgudmFsdWUgPT0gZC52YWx1ZSkgPyAxIDogMDsgcmV0dXJuIGQgfSlcbiAgICAgIHMucHVibGlzaChcImRhc2hib2FyZF9vcHRpb25zXCIsQ1ApXG4gICAgfSlcbiAgICAucmVnaXN0ZXJFdmVudChcInRhYi5jaGFuZ2VcIiwgZnVuY3Rpb24oeCkge1xuICAgICAgcy51cGRhdGUoXCJsb2FkaW5nXCIsdHJ1ZSlcbiAgICAgIGNvbnN0IHZhbHVlID0gcy5zdGF0ZSgpXG4gICAgICB2YWx1ZS50YWJzLm1hcChmdW5jdGlvbih0KSB7IHQuc2VsZWN0ZWQgPSAodC5rZXkgPT0geC5rZXkpID8gMSA6IDAgfSlcbiAgICAgIHMucHVibGlzaFN0YXRpYyhcInRhYnNcIix2YWx1ZS50YWJzKVxuICAgIH0pXG4gICAgLnJlZ2lzdGVyRXZlbnQoXCJiYS5zb3J0XCIsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHMucHVibGlzaEJhdGNoKHsgXCJzb3J0YnlcIjogeC52YWx1ZSwgXCJmaWx0ZXJzXCI6dmFsdWUuZmlsdGVycyB9KVxuICAgIH0pXG59XG4iLCJpbXBvcnQgKiBhcyBzdGF0ZSBmcm9tICdzdGF0ZSdcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmUocXNfc3RhdGUsX3N0YXRlKSB7XG5cbiAgdmFyIHVwZGF0ZXMgPSB7fVxuXG5cbiAgc3RhdGUuY29tcF9ldmFsKHFzX3N0YXRlLF9zdGF0ZSx1cGRhdGVzKVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzZWxlY3RlZF9hY3Rpb25cIlxuICAgICAgLCAoeCx5KSA9PiB5LmFjdGlvbnMuZmlsdGVyKHogPT4gei5hY3Rpb25faWQgPT0geC5zZWxlY3RlZF9hY3Rpb24pWzBdXG4gICAgICAsICh4LHkpID0+IHkuc2VsZWN0ZWRfYWN0aW9uXG4gICAgKVxuICAgIC5mYWlsdXJlKFwic2VsZWN0ZWRfYWN0aW9uXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmose1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJzZWxlY3RlZF9hY3Rpb25cIjogX25ld1xuICAgICAgfSlcbiAgICB9KVxuICAgIC5hY2Nlc3NvcihcbiAgICAgICAgXCJzZWxlY3RlZF92aWV3XCJcbiAgICAgICwgKHgseSkgPT4geC5zZWxlY3RlZF92aWV3XG4gICAgICAsIChfLHkpID0+IHkuZGFzaGJvYXJkX29wdGlvbnMuZmlsdGVyKHggPT4geC5zZWxlY3RlZClbMF0udmFsdWUgXG4gICAgKVxuICAgIC5mYWlsdXJlKFwic2VsZWN0ZWRfdmlld1wiLCAoX25ldyxfb2xkLG9iaikgPT4ge1xuICAgICAgLy8gdGhpcyBzaG91bGQgYmUgcmVkb25lIHNvIGl0cyBub3QgZGlmZmVyZW50IGxpa2UgdGhpc1xuICAgICAgT2JqZWN0LmFzc2lnbihvYmosIHtcbiAgICAgICAgICBcImxvYWRpbmdcIjogdHJ1ZVxuICAgICAgICAsIFwiZGFzaGJvYXJkX29wdGlvbnNcIjogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMpKS5tYXAoeCA9PiB7IFxuICAgICAgICAgICAgeC5zZWxlY3RlZCA9ICh4LnZhbHVlID09IF9uZXcpOyBcbiAgICAgICAgICAgIHJldHVybiB4IFxuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gICAgLmFjY2Vzc29yKFxuICAgICAgICBcInNlbGVjdGVkX2NvbXBhcmlzb25cIlxuICAgICAgLCAoeCx5KSA9PiB5LmFjdGlvbnMuZmlsdGVyKHogPT4gei5hY3Rpb25faWQgPT0geC5zZWxlY3RlZF9jb21wYXJpc29uKVswXVxuICAgICAgLCAoeCx5KSA9PiB5LnNlbGVjdGVkX2NvbXBhcmlzb25cbiAgICApXG4gICAgLmZhaWx1cmUoXCJzZWxlY3RlZF9jb21wYXJpc29uXCIsIChfbmV3LF9vbGQsb2JqKSA9PiB7IFxuICAgICAgT2JqZWN0LmFzc2lnbihvYmose1xuICAgICAgICAgIFwibG9hZGluZ1wiOiB0cnVlXG4gICAgICAgICwgXCJzZWxlY3RlZF9jb21wYXJpc29uXCI6IF9uZXdcbiAgICAgIH0pXG4gICAgfSlcbiAgICAuZXF1YWwoXCJmaWx0ZXJzXCIsICh4LHkpID0+IEpTT04uc3RyaW5naWZ5KHgpID09IEpTT04uc3RyaW5naWZ5KHkpIClcbiAgICAuZmFpbHVyZShcImZpbHRlcnNcIiwgKF9uZXcsX29sZCxvYmopID0+IHsgXG4gICAgICBPYmplY3QuYXNzaWduKG9iaix7XG4gICAgICAgICAgXCJsb2FkaW5nXCI6IHRydWVcbiAgICAgICAgLCBcImZpbHRlcnNcIjogX25ldyB8fCBbe31dXG4gICAgICB9KVxuICAgIH0pXG4gICAgLmZhaWx1cmUoXCJhY3Rpb25fZGF0ZVwiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHsgbG9hZGluZzogdHJ1ZSwgXCJhY3Rpb25fZGF0ZVwiOiBfbmV3IH0pXG4gICAgfSlcbiAgICAuZmFpbHVyZShcImNvbXBhcmlzb25fZGF0ZVwiLCAoX25ldyxfb2xkLG9iaikgPT4geyBcbiAgICAgIE9iamVjdC5hc3NpZ24ob2JqLHsgbG9hZGluZzogdHJ1ZSwgXCJjb21wYXJpc29uX2RhdGVcIjogX25ldyB9KVxuICAgIH0pXG5cbiAgICAuZXZhbHVhdGUoKVxuXG4gIHZhciBjdXJyZW50ID0gc3RhdGUucXMoe30pLnRvKF9zdGF0ZS5xc19zdGF0ZSB8fCB7fSlcbiAgICAsIHBvcCA9IHN0YXRlLnFzKHt9KS50byhxc19zdGF0ZSlcblxuICBpZiAoT2JqZWN0LmtleXModXBkYXRlcykubGVuZ3RoICYmIGN1cnJlbnQgIT0gcG9wKSB7XG4gICAgcmV0dXJuIHVwZGF0ZXNcbiAgfVxuXG4gIHJldHVybiB7fVxuICBcbn1cbiIsImltcG9ydCB7cXN9IGZyb20gJ3N0YXRlJztcbmltcG9ydCBzdGF0ZSBmcm9tICdzdGF0ZSc7XG5pbXBvcnQge2NvbXBhcmV9IGZyb20gJy4uL3N0YXRlJ1xuXG5mdW5jdGlvbiBwdWJsaXNoUVNVcGRhdGVzKHVwZGF0ZXMscXNfc3RhdGUpIHtcbiAgaWYgKE9iamVjdC5rZXlzKHVwZGF0ZXMpLmxlbmd0aCkge1xuICAgIHVwZGF0ZXNbXCJxc19zdGF0ZVwiXSA9IHFzX3N0YXRlXG4gICAgc3RhdGUucHVibGlzaEJhdGNoKHVwZGF0ZXMpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcblxuICB3aW5kb3cub25wb3BzdGF0ZSA9IGZ1bmN0aW9uKGkpIHtcblxuICAgIHZhciBzdGF0ZSA9IHMuX3N0YXRlXG4gICAgICAsIHFzX3N0YXRlID0gaS5zdGF0ZVxuXG4gICAgdmFyIHVwZGF0ZXMgPSBjb21wYXJlKHFzX3N0YXRlLHN0YXRlKVxuICAgIHB1Ymxpc2hRU1VwZGF0ZXModXBkYXRlcyxxc19zdGF0ZSlcbiAgfVxuXG4gIGNvbnN0IHMgPSBzdGF0ZTtcblxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJoaXN0b3J5XCIsZnVuY3Rpb24oZXJyb3IsX3N0YXRlKSB7XG4gICAgICAvL2NvbnNvbGUubG9nKFxuICAgICAgLy8gIFwiY3VycmVudDogXCIrSlNPTi5zdHJpbmdpZnkoX3N0YXRlLnFzX3N0YXRlKSwgXG4gICAgICAvLyAgSlNPTi5zdHJpbmdpZnkoX3N0YXRlLmZpbHRlcnMpLCBcbiAgICAgIC8vICBfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnNcbiAgICAgIC8vKVxuXG4gICAgICB2YXIgZm9yX3N0YXRlID0gW1wiZmlsdGVyc1wiXVxuXG4gICAgICB2YXIgcXNfc3RhdGUgPSBmb3Jfc3RhdGUucmVkdWNlKChwLGMpID0+IHtcbiAgICAgICAgaWYgKF9zdGF0ZVtjXSkgcFtjXSA9IF9zdGF0ZVtjXVxuICAgICAgICByZXR1cm4gcFxuICAgICAgfSx7fSlcblxuICAgICAgaWYgKF9zdGF0ZS5zZWxlY3RlZF9hY3Rpb24pIHFzX3N0YXRlWydzZWxlY3RlZF9hY3Rpb24nXSA9IF9zdGF0ZS5zZWxlY3RlZF9hY3Rpb24uYWN0aW9uX2lkXG4gICAgICBpZiAoX3N0YXRlLnNlbGVjdGVkX2NvbXBhcmlzb24pIHFzX3N0YXRlWydzZWxlY3RlZF9jb21wYXJpc29uJ10gPSBfc3RhdGUuc2VsZWN0ZWRfY29tcGFyaXNvbi5hY3Rpb25faWRcbiAgICAgIGlmIChfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMpIHFzX3N0YXRlWydzZWxlY3RlZF92aWV3J10gPSBfc3RhdGUuZGFzaGJvYXJkX29wdGlvbnMuZmlsdGVyKHggPT4geC5zZWxlY3RlZClbMF0udmFsdWVcbiAgICAgIGlmIChfc3RhdGUuYWN0aW9uX2RhdGUpIHFzX3N0YXRlWydhY3Rpb25fZGF0ZSddID0gX3N0YXRlLmFjdGlvbl9kYXRlXG4gICAgICBpZiAoX3N0YXRlLmNvbXBhcmlzb25fZGF0ZSkgcXNfc3RhdGVbJ2NvbXBhcmlzb25fZGF0ZSddID0gX3N0YXRlLmNvbXBhcmlzb25fZGF0ZVxuXG5cbiAgICAgIGlmIChfc3RhdGUuc2VsZWN0ZWRfYWN0aW9uICYmIHFzKHFzX3N0YXRlKS50byhxc19zdGF0ZSkgIT0gd2luZG93LmxvY2F0aW9uLnNlYXJjaCkge1xuICAgICAgICBzLnB1Ymxpc2goXCJxc19zdGF0ZVwiLHFzX3N0YXRlKVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImhpc3RvcnkuYWN0aW9uc1wiLCBmdW5jdGlvbihlcnJvcix2YWx1ZSxfc3RhdGUpIHtcbiAgICAgIHZhciBxc19zdGF0ZSA9IHFzKHt9KS5mcm9tKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpXG4gICAgICBpZiAod2luZG93LmxvY2F0aW9uLnNlYXJjaC5sZW5ndGggJiYgT2JqZWN0LmtleXMocXNfc3RhdGUpLmxlbmd0aCkge1xuICAgICAgICB2YXIgdXBkYXRlcyA9IGNvbXBhcmUocXNfc3RhdGUsX3N0YXRlKVxuICAgICAgICByZXR1cm4gcHVibGlzaFFTVXBkYXRlcyh1cGRhdGVzLHFzX3N0YXRlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcy5wdWJsaXNoKFwic2VsZWN0ZWRfYWN0aW9uXCIsdmFsdWVbMF0pXG4gICAgICB9XG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwiaGlzdG9yeS5xc19zdGF0ZVwiLCBmdW5jdGlvbihlcnJvcixxc19zdGF0ZSxfc3RhdGUpIHtcblxuICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGhpc3Rvcnkuc3RhdGUpID09IEpTT04uc3RyaW5naWZ5KHFzX3N0YXRlKSkgcmV0dXJuXG4gICAgICBpZiAod2luZG93LmxvY2F0aW9uLnNlYXJjaCA9PSBcIlwiKSBoaXN0b3J5LnJlcGxhY2VTdGF0ZShxc19zdGF0ZSxcIlwiLHFzKHFzX3N0YXRlKS50byhxc19zdGF0ZSkpXG4gICAgICBlbHNlIGhpc3RvcnkucHVzaFN0YXRlKHFzX3N0YXRlLFwiXCIscXMocXNfc3RhdGUpLnRvKHFzX3N0YXRlKSlcblxuICAgIH0pXG59XG4iLCJpbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnXG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnYXBpJ1xuXG5jb25zdCBzID0gc3RhdGU7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGluaXQoKSB7XG5cbiAgLy8gU3Vic2NyaXB0aW9ucyB0aGF0IHJlY2VpdmUgZGF0YSAvIG1vZGlmeSAvIGNoYW5nZSB3aGVyZSBpdCBpcyBzdG9yZWRcblxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJyZWNlaXZlLmRhdGFcIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoU3RhdGljKFwibG9naWNfY2F0ZWdvcmllc1wiLHZhbHVlLmNhdGVnb3JpZXMpXG4gICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIsc3RhdGUuZmlsdGVycylcbiAgICB9KVxuICAgIC5zdWJzY3JpYmUoXCJyZWNlaXZlLmNvbXBhcmlzb25fZGF0YVwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBzLnB1Ymxpc2goXCJmaWx0ZXJzXCIsc3RhdGUuZmlsdGVycylcbiAgICB9KVxuXG5cbiAgLy8gU3Vic2NyaXB0aW9ucyB0aGF0IHdpbGwgZ2V0IG1vcmUgZGF0YVxuXG4gIHN0YXRlXG4gICAgLnN1YnNjcmliZShcImdldC5hY3Rpb25fZGF0ZVwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJkYXRhXCIsYXBpLmFjdGlvbi5nZXREYXRhKHN0YXRlLnNlbGVjdGVkX2FjdGlvbixzdGF0ZS5hY3Rpb25fZGF0ZSkpXG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwiZ2V0LmNvbXBhcmlzb25fZGF0ZVwiLGZ1bmN0aW9uKGVycm9yLHZhbHVlLHN0YXRlKSB7XG4gICAgICBpZiAoIXZhbHVlKSByZXR1cm4gcy5wdWJsaXNoU3RhdGljKFwiY29tcGFyaXNvbl9kYXRhXCIsZmFsc2UpXG4gICAgICBzLnB1Ymxpc2hTdGF0aWMoXCJjb21wYXJpc29uX2RhdGFcIixhcGkuYWN0aW9uLmdldERhdGEoc3RhdGUuc2VsZWN0ZWRfY29tcGFyaXNvbixzdGF0ZS5jb21wYXJpc29uX2RhdGUpKVxuICAgIH0pXG4gICAgLnN1YnNjcmliZShcImdldC5zZWxlY3RlZF9hY3Rpb25cIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiZGF0YVwiLGFwaS5hY3Rpb24uZ2V0RGF0YSh2YWx1ZSxzdGF0ZS5hY3Rpb25fZGF0ZSkpXG4gICAgfSlcbiAgICAuc3Vic2NyaWJlKFwiZ2V0LnNlbGVjdGVkX2NvbXBhcmlzb25cIixmdW5jdGlvbihlcnJvcix2YWx1ZSxzdGF0ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIHMucHVibGlzaFN0YXRpYyhcImNvbXBhcmlzb25fZGF0YVwiLGZhbHNlKVxuICAgICAgcy5wdWJsaXNoU3RhdGljKFwiY29tcGFyaXNvbl9kYXRhXCIsYXBpLmFjdGlvbi5nZXREYXRhKHZhbHVlLHN0YXRlLmNvbXBhcmlzb25fZGF0ZSkpXG4gICAgfSlcblxuXG59XG4iLCJpbXBvcnQgc3RhdGUgZnJvbSAnc3RhdGUnXG5pbXBvcnQge3FzfSBmcm9tICdzdGF0ZSdcbmltcG9ydCBidWlsZCBmcm9tICcuL2J1aWxkJ1xuaW1wb3J0IGhpc3RvcnlTdWJzY3JpcHRpb25zIGZyb20gJy4vc3Vic2NyaXB0aW9ucy9oaXN0b3J5J1xuaW1wb3J0IGFwaVN1YnNjcmlwdGlvbnMgZnJvbSAnLi9zdWJzY3JpcHRpb25zL2FwaSdcblxuXG5jb25zdCBzID0gc3RhdGU7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdCgpIHtcblxuICBoaXN0b3J5U3Vic2NyaXB0aW9ucygpXG4gIGFwaVN1YnNjcmlwdGlvbnMoKVxuXG4gIFxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJjaGFuZ2UubG9hZGluZ1wiLCBmdW5jdGlvbihlcnJvcixsb2FkaW5nLHZhbHVlKSB7IGJ1aWxkKCkoKSB9KVxuICAgIC5zdWJzY3JpYmUoXCJjaGFuZ2UuZGFzaGJvYXJkX29wdGlvbnNcIiwgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikpXG4gICAgLnN1YnNjcmliZShcImNoYW5nZS50YWJzXCIsIHMucHJlcGFyZUV2ZW50KFwidXBkYXRlRmlsdGVyXCIpKSBcbiAgICAuc3Vic2NyaWJlKFwiY2hhbmdlLmxvZ2ljX29wdGlvbnNcIiwgcy5wcmVwYXJlRXZlbnQoXCJ1cGRhdGVGaWx0ZXJcIikgKVxuICAgIC5zdWJzY3JpYmUoXCJ1cGRhdGUuZmlsdGVyc1wiLCBzLnByZXBhcmVFdmVudChcInVwZGF0ZUZpbHRlclwiKSlcbiAgICBcblxuICAvLyBSRURSQVc6IHRoaXMgaXMgd2hlcmUgdGhlIGVudGlyZSBhcHAgZ2V0cyByZWRyYXduIC0gaWYgZm9ybWF0dGVkX2RhdGEgY2hhbmdlcywgcmVkcmF3IHRoZSBhcHBcblxuICBzdGF0ZVxuICAgIC5zdWJzY3JpYmUoXCJyZWRyYXcuZm9ybWF0dGVkX2RhdGFcIiwgZnVuY3Rpb24oZXJyb3IsZm9ybWF0dGVkX2RhdGEsdmFsdWUpIHsgXG4gICAgICBzLnVwZGF0ZShcImxvYWRpbmdcIixmYWxzZSk7IFxuICAgICAgYnVpbGQoKSgpIFxuICAgIH0pXG59XG4iLCJpbXBvcnQge2QzX3VwZGF0ZWFibGV9IGZyb20gJ2hlbHBlcnMnXG5pbXBvcnQgZDMgZnJvbSAnZDMnXG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnYXBpJ1xuaW1wb3J0IHN0YXRlIGZyb20gJ3N0YXRlJ1xuaW1wb3J0IHZpZXcgZnJvbSAnLi92aWV3J1xuaW1wb3J0IGluaXRFdmVudHMgZnJvbSAnLi9ldmVudHMnXG5pbXBvcnQgaW5pdFN1YnNjcmlwdGlvbnMgZnJvbSAnLi9zdWJzY3JpcHRpb25zJ1xuXG5cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBidWlsZCh0YXJnZXQpIHtcbiAgY29uc3QgZGIgPSBuZXcgRGFzaGJvYXJkKHRhcmdldClcbiAgcmV0dXJuIGRiXG59XG5cbmNsYXNzIERhc2hib2FyZCB7XG5cbiAgY29uc3RydWN0b3IodGFyZ2V0KSB7XG4gICAgaW5pdEV2ZW50cygpXG4gICAgaW5pdFN1YnNjcmlwdGlvbnMoKVxuICAgIHRoaXMudGFyZ2V0KHRhcmdldClcbiAgICB0aGlzLmluaXQoKVxuXG4gICAgcmV0dXJuIHRoaXMuY2FsbC5iaW5kKHRoaXMpXG4gIH1cblxuICB0YXJnZXQodGFyZ2V0KSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0IHx8IGQzX3VwZGF0ZWFibGUoZDMuc2VsZWN0KFwiLmNvbnRhaW5lclwiKSxcImRpdlwiLFwiZGl2XCIpXG4gICAgICAuc3R5bGUoXCJ3aWR0aFwiLFwiMTAwMHB4XCIpXG4gICAgICAuc3R5bGUoXCJtYXJnaW4tbGVmdFwiLFwiYXV0b1wiKVxuICAgICAgLnN0eWxlKFwibWFyZ2luLXJpZ2h0XCIsXCJhdXRvXCIpXG4gIH1cblxuICBpbml0KCkge1xuICAgIGxldCBzID0gc3RhdGU7XG4gICAgbGV0IHZhbHVlID0gcy5zdGF0ZSgpXG4gICAgdGhpcy5kZWZhdWx0cyhzKVxuICB9XG5cbiAgZGVmYXVsdHMocykge1xuXG4gICAgaWYgKCEhcy5zdGF0ZSgpLmRhc2hib2FyZF9vcHRpb25zKSByZXR1cm4gLy8gZG9uJ3QgcmVsb2FkIGRlZmF1bHRzIGlmIHByZXNlbnRcblxuICAgIHMucHVibGlzaFN0YXRpYyhcImFjdGlvbnNcIixhcGkuYWN0aW9uLmdldEFsbClcbiAgICBzLnB1Ymxpc2hTdGF0aWMoXCJzYXZlZFwiLGFwaS5kYXNoYm9hcmQuZ2V0QWxsKVxuICAgIHMucHVibGlzaFN0YXRpYyhcImxpbmVfaXRlbXNcIixhcGkubGluZV9pdGVtLmdldEFsbClcblxuICAgIHZhciBERUZBVUxUUyA9IHtcbiAgICAgICAgbG9naWNfb3B0aW9uczogW3tcImtleVwiOlwiQWxsXCIsXCJ2YWx1ZVwiOlwiYW5kXCJ9LHtcImtleVwiOlwiQW55XCIsXCJ2YWx1ZVwiOlwib3JcIn1dXG4gICAgICAsIGxvZ2ljX2NhdGVnb3JpZXM6IFtdXG4gICAgICAsIGZpbHRlcnM6IFt7fV0gXG4gICAgICAsIGRhc2hib2FyZF9vcHRpb25zOiBbXG4gICAgICAgICAgICB7XCJrZXlcIjpcIkRhdGEgc3VtbWFyeVwiLFwidmFsdWVcIjpcInN1bW1hcnktdmlld1wiLFwic2VsZWN0ZWRcIjoxfVxuICAgICAgICAgICwge1wia2V5XCI6XCJFeHBsb3JlIGRhdGFcIixcInZhbHVlXCI6XCJkYXRhLXZpZXdcIixcInNlbGVjdGVkXCI6MH1cbiAgICAgICAgICAsIHtcImtleVwiOlwiQmVmb3JlICYgQWZ0ZXJcIixcInZhbHVlXCI6XCJiYS12aWV3XCIsXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIlRpbWluZ1wiLFwidmFsdWVcIjpcInRpbWluZy12aWV3XCIsXCJzZWxlY3RlZFwiOjB9XG4gICAgICAgICAgLCB7XCJrZXlcIjpcIk1lZGlhIFBsYW5cIiwgXCJ2YWx1ZVwiOlwibWVkaWEtdmlld1wiLFwic2VsZWN0ZWRcIjowfVxuXG4gICAgICAgIF1cbiAgICB9XG5cbiAgICBzLnVwZGF0ZShmYWxzZSxERUZBVUxUUylcbiAgfVxuXG4gIGNhbGwoKSB7XG5cbiAgIGxldCBzID0gc3RhdGU7XG4gICBsZXQgdmFsdWUgPSBzLnN0YXRlKClcblxuICAgbGV0IGRiID0gdmlldyh0aGlzLl90YXJnZXQpXG4gICAgIC5zdGFnZWRfZmlsdGVycyh2YWx1ZS5zdGFnZWRfZmlsdGVyIHx8IFwiXCIpXG4gICAgIC5zYXZlZCh2YWx1ZS5zYXZlZCB8fCBbXSlcbiAgICAgLmRhdGEodmFsdWUuZm9ybWF0dGVkX2RhdGEgfHwge30pXG4gICAgIC5hY3Rpb25zKHZhbHVlLmFjdGlvbnMgfHwgW10pXG4gICAgIC5zZWxlY3RlZF9hY3Rpb24odmFsdWUuc2VsZWN0ZWRfYWN0aW9uIHx8IHt9KVxuICAgICAuc2VsZWN0ZWRfY29tcGFyaXNvbih2YWx1ZS5zZWxlY3RlZF9jb21wYXJpc29uIHx8IHt9KVxuICAgICAuYWN0aW9uX2RhdGUodmFsdWUuYWN0aW9uX2RhdGUgfHwgMClcbiAgICAgLmNvbXBhcmlzb25fZGF0ZSh2YWx1ZS5jb21wYXJpc29uX2RhdGUgfHwgMClcbiAgICAgLmxvYWRpbmcodmFsdWUubG9hZGluZyB8fCBmYWxzZSlcbiAgICAgLmxpbmVfaXRlbXModmFsdWUubGluZV9pdGVtcyB8fCBmYWxzZSlcbiAgICAgLnN1bW1hcnkodmFsdWUuc3VtbWFyeSB8fCBmYWxzZSlcbiAgICAgLnRpbWVfc3VtbWFyeSh2YWx1ZS50aW1lX3N1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC5jYXRlZ29yeV9zdW1tYXJ5KHZhbHVlLmNhdGVnb3J5X3N1bW1hcnkgfHwgZmFsc2UpXG4gICAgIC5rZXl3b3JkX3N1bW1hcnkodmFsdWUua2V5d29yZF9zdW1tYXJ5IHx8IGZhbHNlKVxuICAgICAuYmVmb3JlKHZhbHVlLmJlZm9yZV91cmxzIHx8IFtdKVxuICAgICAuYWZ0ZXIodmFsdWUuYWZ0ZXJfdXJscyB8fCBbXSlcbiAgICAgLmxvZ2ljX29wdGlvbnModmFsdWUubG9naWNfb3B0aW9ucyB8fCBmYWxzZSlcbiAgICAgLmxvZ2ljX2NhdGVnb3JpZXModmFsdWUubG9naWNfY2F0ZWdvcmllcyB8fCBmYWxzZSlcbiAgICAgLmZpbHRlcnModmFsdWUuZmlsdGVycyB8fCBmYWxzZSlcbiAgICAgLnZpZXdfb3B0aW9ucyh2YWx1ZS5kYXNoYm9hcmRfb3B0aW9ucyB8fCBmYWxzZSlcbiAgICAgLmV4cGxvcmVfdGFicyh2YWx1ZS50YWJzIHx8IGZhbHNlKVxuICAgICAub24oXCJhZGQtZmlsdGVyXCIsIHMucHJlcGFyZUV2ZW50KFwiYWRkLWZpbHRlclwiKSlcbiAgICAgLm9uKFwibW9kaWZ5LWZpbHRlclwiLCBzLnByZXBhcmVFdmVudChcIm1vZGlmeS1maWx0ZXJcIikpXG4gICAgIC5vbihcInN0YWdlZC1maWx0ZXIuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwic3RhZ2VkLWZpbHRlci5jaGFuZ2VcIikpXG4gICAgIC5vbihcImFjdGlvbi5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJhY3Rpb24uY2hhbmdlXCIpKVxuICAgICAub24oXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJhY3Rpb25fZGF0ZS5jaGFuZ2VcIikpXG4gICAgIC5vbihcImNvbXBhcmlzb25fZGF0ZS5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJjb21wYXJpc29uX2RhdGUuY2hhbmdlXCIpKVxuICAgICAub24oXCJjb21wYXJpc29uLmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcImNvbXBhcmlzb24uY2hhbmdlXCIpKVxuICAgICAub24oXCJsb2dpYy5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJsb2dpYy5jaGFuZ2VcIikpXG4gICAgIC5vbihcImZpbHRlci5jaGFuZ2VcIiwgcy5wcmVwYXJlRXZlbnQoXCJmaWx0ZXIuY2hhbmdlXCIpKVxuICAgICAub24oXCJ2aWV3LmNoYW5nZVwiLCBzLnByZXBhcmVFdmVudChcInZpZXcuY2hhbmdlXCIpKVxuICAgICAub24oXCJ0YWIuY2hhbmdlXCIsIHMucHJlcGFyZUV2ZW50KFwidGFiLmNoYW5nZVwiKSlcbiAgICAgLm9uKFwiYmEuc29ydFwiLCBzLnByZXBhcmVFdmVudChcImJhLnNvcnRcIikpXG4gICAgIC5kcmF3KClcbiAgIFxuICB9XG59XG4iLCJ2YXIgdmVyc2lvbiA9IFwiMC4wLjFcIjsgZXhwb3J0ICogZnJvbSBcIi4uL2luZGV4XCI7IGV4cG9ydCB7dmVyc2lvbn07Il0sIm5hbWVzIjpbInN0YXRlIiwibm9vcCIsImQzX3VwZGF0ZWFibGUiLCJkM19zcGxhdCIsImFjY2Vzc29yIiwiaWRlbnRpdHkiLCJrZXkiLCJkMyIsImFjY2Vzc29yJDEiLCJmaWx0ZXIiLCJzZWxlY3QiLCJ0IiwicHJlcERhdGEiLCJidWlsZERvbWFpbnMiLCJwIiwidGltZXNlcmllc1snZGVmYXVsdCddIiwidGltZXNlcmllcy5wcmVwRGF0YSIsImJ1Y2tldHMiLCJkM19jbGFzcyIsInN0YXRlLnFzIiwicmVsYXRpdmVfdmlldyIsInRpbWluZ192aWV3Iiwic3RhZ2VkX2ZpbHRlcl92aWV3IiwiYnVpbGRDYXRlZ29yaWVzIiwiYnVpbGRDYXRlZ29yeUhvdXIiLCJidWlsZERhdGEiLCJkYXRhLmJ1aWxkQ2F0ZWdvcmllcyIsImRhdGEuYnVpbGRDYXRlZ29yeUhvdXIiLCJkYXRhLmJ1aWxkRGF0YSIsImluaXQiLCJzIiwiZmlsdGVySW5pdCIsImFjdGlvbkluaXQiLCJzdGF0ZS5jb21wX2V2YWwiLCJhcGkuYWN0aW9uIiwiaGlzdG9yeVN1YnNjcmlwdGlvbnMiLCJhcGlTdWJzY3JpcHRpb25zIiwiaW5pdEV2ZW50cyIsImluaXRTdWJzY3JpcHRpb25zIiwiYXBpLmRhc2hib2FyZCIsImFwaS5saW5lX2l0ZW0iLCJ2aWV3Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFPLE1BQU0sYUFBYSxHQUFHLFNBQVMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtFQUN0RSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksS0FBSyxDQUFBO0VBQ3hCLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSTtJQUM5QyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QyxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDbEMsQ0FBQTs7RUFFRCxVQUFVLENBQUMsS0FBSyxFQUFFO0tBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBOztFQUVmLE9BQU8sVUFBVTtDQUNsQixDQUFBOztBQUVELEFBQU8sTUFBTSxRQUFRLEdBQUcsU0FBUyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0VBQ2pFLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxLQUFLLENBQUE7RUFDeEIsSUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJO0lBQzlDLElBQUksSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdCLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ2hDLENBQUE7O0VBRUQsVUFBVSxDQUFDLEtBQUssRUFBRTtLQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTs7RUFFZixPQUFPLFVBQVU7Q0FDbEIsQ0FBQTs7QUN4Qk0sU0FB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LEdBQUcsQ0FBQyxDQUFDO1dBQy9CLENBQUMsQ0FBQzs7VUFFSCxJQUFJLFFBQVEsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1VBQ3pFLElBQUksUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDOztVQUVyRCxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDOzs7O1VBSS9CLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDNUMsQ0FBQyxDQUFDOztNQUVMQSxlQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7U0FDcEMsUUFBUSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUM7U0FDMUIsUUFBUSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUM7U0FDeEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDOzs7TUFHckJDLFVBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztTQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO1NBQzlCLElBQUksQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxHQUFHLFVBQVUsR0FBRyxTQUFTLEVBQUUsQ0FBQyxDQUFDOztNQUV0RixJQUFJLEtBQUssQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFO1FBQzFDLElBQUks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LEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTs7RUFFL0UsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7O0VBRXZFLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDNUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDO0tBQ3JDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7S0FDOUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTs7RUFFcEMsT0FBTyxJQUFJOztDQUVaOzs7O0FBSUQsQUFBTyxTQUFTLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRTs7QUFFaEQsU0FBUyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFO0VBQ3pDLElBQUksT0FBTyxHQUFHLEVBQUUsRUFBRSxPQUFPLEdBQUcsRUFBRSxDQUFBOztFQUU5QixJQUFJLEVBQUUsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMs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QyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7TUFDMUwsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7TUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7TUFDWixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJO1FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUN0QyxDQUFDLENBQUE7S0FDSDtJQUNELE9BQU8sQ0FBQztHQUNULENBQUMsQ0FBQTtFQUNGLE9BQU8sQ0FBQztDQUNULENBQUMsRUFBRSxDQUFDLENBQUE7OztBQUdMLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENB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QUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtVQUMxRixLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3BCLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTTtZQUNuSixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1dBQzNCLENBQUMsQ0FBQTtTQUNIO1FBQ0QsT0FBTyxDQUFDO09BQ1QsQ0FBQTs7TUFFRCxJQUFJLFVBQVUsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtNQUNoRCxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7OztNQUd2RCxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEtB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
