(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('table'), require('filter')) :
  typeof define === 'function' && define.amd ? define('dashboard', ['exports', 'table', 'filter'], factory) :
  factory((global.dashboard = {}),global.table,global.filter);
}(this, function (exports,table,filter) { 'use strict';

  table = 'default' in table ? table['default'] : table;
  filter = 'default' in filter ? filter['default'] : filter;

  function render_filter(_top,_lower) {
    var self = this
      , data = self._data;

    var _top = d3_updateable(_top,".filter-wrapper","div",false, function(x) { return 1})
      .classed("filter-wrapper",true)
      .classed("hidden",false)

    var save = d3_updateable(_top, ".save-subtitle-filter","div")
      .classed("save-subtitle-filter",true)
      .classed("hidden",true)
      .attr("style","padding-left:10px; text-transform: uppercase; font-weight: bold; line-height: 24px; margin-bottom: 10px;")
      .style("text-align","right")


    d3_updateable(save,"span","span")
      .text("Save filter as:")

    var save_input = d3_updateable(save,"input","input")
      .style("margin-left","10px")
      .style("padding-left","8px")
      .style("font-weight","normal")
      .style("line-height","12px")
      .attr("placeholder","Filter name...")

    d3_updateable(save,"br","br")


    d3_updateable(save,"button","button")
      .style("margin-left","10px")
      .style("padding-left","8px")
      .style("font-weight","normal")
      .style("height","20px")
      .style("line-height","12px")
      .text("Save")
      .on("click", function(x) {
        var value = save_input.property("value")

        var filters = self._state.get("filter")
        var saved_searches = JSON.parse(localStorage.getItem("search.saved")) || []

        saved_searches.push({
            "key": value
          , "values": filters
        })

        localStorage.setItem("search.saved",JSON.stringify(saved_searches))

        save.classed("hidden",true)
      })






    var subtitle = d3_updateable(_top, ".subtitle-filter","div")
      .classed("subtitle-filter",true)
      .attr("style","padding-left:10px; text-transform: uppercase; font-weight: bold; line-height: 24px; margin-bottom: 10px;")

    d3_updateable(subtitle,"span.first","span")
      .text("Users matching " )
      .classed("first",true)

    var filter_type  = d3_updateable(subtitle,"span.middle","span")
      .classed("middle",true)


    var select = d3_updateable(filter_type,"select","select")
      .style("font-size","10")
      .style("width","45px")
      .on("change",function() {
        var d = this.selectedOptions[0].__data__
        s.text(d + " ")
      })

    d3_splat(select,"option","option",["All","Any"])
      .text(String)
    


    d3_updateable(subtitle,"span.last","span")
      .text(" of the following:")
      .classed("last",true)

    var mapping = {
        "Category": "parent_category_name"
      , "Title": "url"
      , "Time": "hour"
    }

    var hours = d3.range(0,24).map(function(x) { return x < 10 ? "0" + String(x) : String(x) })
      , minutes = d3.range(0,40,20).map(String);


    var hourSelected = function() {}

    var filters = self._state.get("filter",[{}])

    //if (document.location.search.indexOf("filter") > -1) {
    //
    //  filters = document.location.search.split("filter=")[1]
    //  filters = JSON.parse(decodeURIComponent(filters.split("&")[0]))
    //  this._state.filters
    //}

    //debugger
    var categories = this._data.category.map(function(x) {x.key = x.parent_category_name; return x})

    filter.filter(_top)
      .fields(Object.keys(mapping))
      .ops([
          [{"key": "equals.category"}]
        , [{"key":"contains"},{"key":"starts with"},{"key":"ends with"}]
        , [{"key":"equals"}, {"key":"between","input":2}]
      ])
      .data(filters)
      .render_op("equals.category",function(filter,value) {
        var self = this;

        var select = d3_updateable(filter,"select.value","select")
          .classed("value",true)
          .style("margin-bottom","10px")
          .style("padding-left","10px")
          .style("width","150px")
          .attr("value", value.value)
          .on("change", function(x){
            value.value = this.value
            self.on("update")(self.data())
          })

        d3_splat(select,"option","option",categories,function(x) { return x.key })
          .attr("selected",function(x) { return x.key == value.value ? "selected" : undefined })
          .text(function(x) { return x.key })

      })
      .render_op("between",function(filter,value) {
        var self = this

        value.value = typeof(value.value) == "object" ? value.value : [0,24]

        d3_updateable(filter,"input.value.low","input")
          .classed("value low",true)
          .style("margin-bottom","10px")
          .style("padding-left","10px")
          .style("width","90px")
          .attr("value", value.value[0])
          .on("keyup", function(x){
            var t = this
          
            self.typewatch(function() {
              value.value[0] = t.value
              //value.fn = self.buildOp(value)
              self.on("update")(self.data())
            },1000)
          })

        d3_updateable(filter,"span.value-and","span")
          .classed("value-and",true)
          .text(" and ")

        d3_updateable(filter,"input.value.high","input")
          .classed("value high",true)
          .style("margin-bottom","10px")
          .style("padding-left","10px")
          .style("width","90px")
          .attr("value", value.value[1])
          .on("keyup", function(x){
            var t = this
          
            self.typewatch(function() {
              value.value[1] = t.value
              //value.fn = self.buildOp(value)
              self.on("update")(self.data())
            },1000)
          })


      })
      .on("update",function(x){

        self._state.set("filter",x)


        var y = x.map(function(z) {
          return { 
              "field": mapping[z.field]
            , "op": z.op
            , "value": z.value
          }
        })

        if (y.length > 0 && y[0].value) {
          
          var data = {
              "full_urls": filter.filter_data(self._data.full_urls).logic("and").by(y)
            //, "url_only": filter.filter_data(self._data.url_only).logic("and").by(y)
          }

          var categories = d3.nest()
            .key(function(x){ return x.parent_category_name})
            .rollup(function(v) {
              return v.reduce(function(p,c) { return p + c.uniques },0)
            })
            .entries(data.full_urls)

          var total = categories.reduce(function(p,c) { return p + c.values },0)

          categories.map(function(x) {
            x.value = x.values
            x.percent = x.value / total
          })

          data["display_categories"] = {
              "key":"Categories"
            , "values": categories.filter(function(x) { return x.key != "NA" })
          }

          self._data.display_categories = data.display_categories

          self.render_right(data)
          self.render_view(_lower,data)
        } else {
          self.render_right(data)
          self.render_view(_lower,self._data)
        }
      })
      .draw()
      .on("update")(filters)
      //._target.selectAll(".filters-wrapper").style("padding-left","10px")
  }

  function accessor(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  function topSection(section) {
    return d3_updateable(section,".top-section","div")
      .classed("top-section",true)
      .style("min-height","160px")
  }

  function remainingSection(section) {
    return d3_updateable(section,".remaining-section","div")
      .classed("remaining-section",true)
  }

  function autoSize(wrap,adjustWidth,adjustHeight) {

    function elementToWidth(elem) {
      var num = wrap.style("width").split(".")[0].replace("px","")
      return parseInt(num)
    }

    function elementToHeight(elem) {
      var num = wrap.style("height").split(".")[0].replace("px","")
      return parseInt(num)
    }

    var w = elementToWidth(wrap) || 700,
      h = elementToHeight(wrap) || 340;

    w = adjustWidth(w)
    h = adjustHeight(h)


    var margin = {top: 40, right: 10, bottom: 30, left: 0},
        width  = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;

    return {
      margin: margin,
      width: width,
      height: height
    }
  }

  function autoScales(_sizes, len) {

    var margin = _sizes.margin,
      width = _sizes.width,
      height = _sizes.height;

    height = len * 26
    
    var x = d3.scale.linear()
        .range([width/2, width-20]);
    
    var y = d3.scale.ordinal()
        .rangeRoundBands([0, height], .2);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("top");


    return {
        x: x
      , y: y
      , xAxis: xAxis
    }
  }

  var EXAMPLE_DATA = {
      "key": "User Visits"
    , "values": [
        {  
            "key":"Off-site Views"
          , "value": 12344
        }
      , {
            "key":"Off-site Uniques"
          , "value": 12344
        }
    ] 
  }

  function SummaryBox(target) {
    this._target = target;
    this._data = EXAMPLE_DATA
  }

  function summary_box(target) {
    return new SummaryBox(target)
  }

  SummaryBox.prototype = {

      data: function(val) { return accessor.bind(this)("data",val) }
    , title: function(val) { return accessor.bind(this)("title",val) }
    , draw: function() {
        var wrap = this._target
        var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
          .classed("vendor-domains-bar-desc",true)
          .style("display","inherit")
          .datum(this._data)

        var w = d3_updateable(desc,".w","div")
          .classed("w",true)
    
        d3_updateable(w, "h3","h3")
          .text(function(x){return x.key})
          .style("margin-bottom","15px")

        var ww = d3_splat(desc,".ww","div",function(x){ return x.values},function(x){ return x.key})
          .classed("ww",true)
          .style("text-align","center")
          .style("display","inline-block")
          .style("width","45%")
    
        var views = d3_updateable(ww,".views","div")
          .classed("views",true)
          .style("text-align","left")
          .style("display","inline-block")
    
        d3_updateable(views,"div","div")
          .text(function(x){return x.key})
    
        d3_updateable(views,".number","div")
          .classed("number",true)
          .text(function(x){ return d3.format(",")(x.value)})
          .style("font-size","32px")
          .style("font-weight","bold")

      }
  }

  function buildCategories(data) {
    var values = data.category
          .map(function(x){ return {"key": x.parent_category_name, "value": x.count } })
          .sort(function(p,c) {return c.value - p.value }).slice(0,15)
      , total = values.reduce(function(p, x) {return p + x.value }, 0)

    return {
        key: "Categories"
      , values: values.map(function(x) { x.percent = x.value/total; return x})
    }
  }

  function buildDomains(data) {

    var categories = data.display_categories.values
      .filter(function(a) { return a.selected })
      .map(function(a) { return a.key })

    var idf = d3.nest()
      .key(function(x) {return x.domain })
      .rollup(function(x) {return x[0].idf })
      .map(data.full_urls.filter(function(x){ return x.parent_category_name != "Internet & Telecom"}) )

    var getIDF = function(x) {
      return (idf[x] == "NA") || (idf[x] > 8686) ? 0 : idf[x]
    }

    var values = data.full_urls
      .map(function(x) { 
        return {
            "key":x.domain
          , "value":x.count
          , "parent_category_name": x.parent_category_name
          , "uniques": x.uniques 
          , "url": x.url
        } 
      })



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
      .entries(values).map(function(x){ return x.values })

    if (categories.length > 0)
      values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 })

    values.map(function(x) {
      x.tf_idf = getIDF(x.key) * (x.value*x.percent_unique) * (x.value*x.percent_unique) 
      x.count = x.value
      x.importance = Math.log(x.tf_idf)
    })
    values = values.sort(function(p,c) { return c.tf_idf - p.tf_idf })


    var total = d3.sum(values,function(x) { return x.count*x.percent_unique})

    values.map(function(x) { 
      x.pop_percent = 1.02/getIDF(x.key)*100
      x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent

      x.sample_percent = x.count*x.percent_unique/total*100
    })

    var norm = d3.scale.linear()
      .range([0, d3.max(values,function(x){ return x.pop_percent})])
      .domain([0, d3.max(values,function(x){return x.sample_percent})])
      .nice()

    values.map(function(x) {
      x.sample_percent_norm = norm(x.sample_percent)
      //x.percent_norm = x.percent
    })



    
    return {
        key: "Top Domains"
      , values: values.slice(0,100)
    }
  }

  function buildUrls(data) {

    var categories = data.display_categories.values
      .filter(function(a) { return a.selected })
      .map(function(a) { return a.key })

    var values = data.full_urls
      .map(function(x) { return {"key":x.url,"value":x.count, "parent_category_name": x.parent_category_name} })

    if (categories.length > 0)
      values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 })

    values = values.filter(function(x) {
      try {
        return x.key
          .replace("http://","")
          .replace("https://","")
          .replace("www.","").split(".").slice(1).join(".").split("/")[1].length > 5
      } catch(e) {
        return false
      }
    }).sort(function(p,c) { return c.value - p.value })


    
    return {
        key: "Top Articles"
      , values: values.slice(0,100)
    }
  }

  function buildOnsiteSummary(data) {
    var yesterday = data.timeseries_data[0]
    var values = [
          {
              "key": "Page Views"
            , "value": yesterday.views
          }
        , {
              "key": "Unique Visitors"
            , "value": yesterday.uniques

          }
      ]
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
      ]
    return {"key":"Off-site Activity","values":values}
  }

  function buildActions(data) {
    
    return {"key":"Segments","values": data.actions.map(function(x){ return {"key":x.action_name, "value":0, "selected": data.action_name == x.action_name } })}
  }

  var EXAMPLE_DATA$1 = {
      "key": "Categories"
    , "values": [
        {  
            "key":"cat1"
          , "value": 12344
          , "percent": .50

        }
      , {
            "key":"cat2"
          , "value": 12344
          , "percent": .50

        }
    ] 
  }

  function BarSelector(target) {
    var nullfunc = function() {}
    this._target = target;
    this._data = EXAMPLE_DATA$1
    this._categories = {}
    this._on = {
        click: nullfunc
    }
    this._type = "checkbox"
  }

  function bar_selector(target) {
    return new BarSelector(target)
  }

  BarSelector.prototype = {

      data: function(val) { return accessor.bind(this)("data",val) }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action];
        this._on[action] = fn;
        return this
      }
    , type: function(val) { return accessor.bind(this)("type",val) }
    , title: function(val) { return accessor.bind(this)("title",val) }
    , skip_check: function(val) { return accessor.bind(this)("skip_check",val) }

    , draw: function() {

        var self = this
        var wrap = this._target
        var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
          .classed("vendor-domains-bar-desc",true)
          .style("display","inherit")
          .datum(this._data)


        var wrapper = d3_updateable(desc,".w","div")
          .classed("w",true)

        wrapper.each(function(row) {

            var data = row.values
    
            d3_updateable(wrapper, "h3","h3")
              .text(function(x){return x.key})
              .style("margin-bottom","15px")
      
            var _sizes = autoSize(wrapper,function(d){return d -50}, function(d){return 400})
            var len = data.length
      
            var scales = autoScales(_sizes,len),
              x = scales.x,
              y = scales.y,
              xAxis = scales.xAxis;
              
            var svg_wrap = d3_updateable(wrapper,"svg","svg")
              .attr("width", _sizes.width + _sizes.margin.left + _sizes.margin.right) 
              .attr("height", _sizes.height + _sizes.margin.top + _sizes.margin.bottom)
            
            var svg = d3_splat(svg_wrap,"g","g",function(x) { return [x.values]},function(x,i) {return i })
              .attr("transform", "translate(" + _sizes.margin.left + "," + 0 + ")")
          
            var valueAccessor = function(x){ return x.value }
              , labelAccessor = function(x) { return x.key }
      
            var values = data.map(valueAccessor)
          
            x.domain(
              d3.extent(
                [
                     d3.min(values)-.1,d3.max(values)+.1
                  , -d3.min(values)+.1,-d3.max(values)-.1
                ],
                function(x) { return x}
              )
            ).nice();
          
            y.domain(data.map(labelAccessor));
          

            var bar = d3_splat(svg,".bar","rect",false,labelAccessor)
                .attr("class", function(d) { return valueAccessor(d) < 0 ? "bar negative" : "bar positive"; })
                .attr("x",_sizes.width/2 + 60)
                .attr("y", function(d) { return y(labelAccessor(d)); })
                .attr("width", function(d) { return Math.abs(x(valueAccessor(d)) - x(0)); })
                .attr("height", y.rangeBand())
                .style("cursor", "pointer")
                .on("click", function(x) {
                  self._click.bind(this)(x,self)
                })
          
            bar.exit().remove()

            if (!self._skip_check) { 
              var checks = d3_splat(svg,".check","foreignObject",false,labelAccessor)
                  .classed("check",true)
                  .attr("x",2)
                  .attr("y", function(d) { return y(labelAccessor(d)) })
                  .html("<xhtml:tree></xhtml:tree>")
          
              svg.selectAll("foreignobject").each(function(z){
                var tree = d3.select(this.children[0])
                var z = z
                d3_updateable(tree,"input","input")
                  .attr("type",self._type)
                  .property("checked",function(y){
                    return z.selected ? "checked" : undefined
                  })
                  .on("click", function(x) {
                    self._on.click.bind(this)(z,self)
                  })
              })
          
              checks.exit().remove()
            }
          
          
            var label = d3_splat(svg,".name","text",false,labelAccessor)
                .classed("name",true)
                .attr("x", self._skip_check ? 5 : 25 )
                .attr("style", "text-anchor:start;dominant-baseline: middle;")
                .attr("y", function(d) { return y(labelAccessor(d)) + y.rangeBand()/2 + 1; })
                .text(labelAccessor)
          
            label.exit().remove()
          
            var percent = d3_splat(svg,".percent","text",false,labelAccessor)
                .classed("percent",true)
                .attr("x",_sizes.width/2 + 20)
                .attr("style", "text-anchor:start;dominant-baseline: middle;font-size:.9em")
                .attr("y", function(d) { return y(labelAccessor(d)) + y.rangeBand()/2 + 1; })
                .classed("hidden",function(d) {return d.percent === undefined })
                .text(function(d) {
                  var v = d3.format("%")(d.percent);
                  var x = (d.percent > 0) ?  "↑" : "↓"
                  return "(" + v + x  + ")"
                })

            percent.exit().remove()
          
            svg.append("g")
                .attr("class", "y axis")
              .append("line")
                .attr("x1", x(0))
                .attr("x2", x(0))
                .attr("y2", _sizes.height);

        })

      }
  }

  var EXAMPLE_DATA$3 = {
      "key": "Top Sites"
    , "values": [
        {  
            "key":"URL.com"
          , "value": 12344
        }
      , {
            "key":"aol.com"
          , "value": 12344
        }
    ] 
  }

  function Table(target) {
    this._target = target;
    this._data = EXAMPLE_DATA$3
    this._render_header = function(wrap) {

      wrap.each(function(data) {
        var headers = d3_updateable(d3.select(this),".headers","div")
          .classed("headers",true)
          .style("text-transform","uppercase")
          .style("font-weight","bold")
          .style("line-height","24px")
          .style("border-bottom","1px solid #ccc")
          .style("margin-bottom","10px")

        headers.html("")


        d3_updateable(headers,".url","div")
          .classed("url",true)
          .style("width","75%")
          .style("display","inline-block")
          .text("Article")

        d3_updateable(headers,".count","div")
          .classed("count",true)
          .style("width","25%")
          .style("display","inline-block")
          .text("Count")


      })

    }
    this._render_row = function(row) {

        d3_updateable(row,".url","div")
          .classed("url",true)
          .style("width","75%")
          .style("line-height","24px")
          .style("height","24px")
          .style("overflow","hidden")
          .style("display","inline-block")
          .text(function(x) {return x.key})

        d3_updateable(row,".count","div")
          .classed("count",true)
          .style("width","25%")
          .style("display","inline-block")
          .style("vertical-align","top")
          .text(function(x){return x.value})

    }
  }

  function table$1(target) {
    return new Table(target)
  }

  Table.prototype = {

      data: function(val) { return accessor.bind(this)("data",val) }
    , title: function(val) { return accessor.bind(this)("title",val) }
    , row: function(val) { return accessor.bind(this)("render_row",val) }
    , header: function(val) { return accessor.bind(this)("render_header",val) }

    
    , draw: function() {
        var wrap = this._target
        var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
          .classed("vendor-domains-bar-desc",true)
          .style("display","inherit")
          .style("padding-left","10px")
          .datum(this._data)

        var wrapper = d3_updateable(desc,".w","div")
          .classed("w",true)
          
        var self = this

        wrapper.each(function(row) {

          var wrap = d3.select(this)

          //d3_updateable(wrap, "h3","h3")
          //  .text(function(x){return x.key})
          //  .style("margin-bottom","15px")

          self._render_header(wrap)
          var row = d3_splat(wrap,".row","div",function(x) {return x.values}, function(x) {return x.key})
            .classed("row",true)
            .style("line-height","24px")
            .each(function() {
              self._render_row(d3.select(this))
            })

          row.exit().remove()

          row.sort(function(p,c) {return c.value - p.value})

        })
      }
  }

  // TODO: unit tests

  function State(loc) {
    this._loc = loc
    this._parse = function parseQuery(qstr) {
          var query = {};
          var a = qstr.substr(1).split('&');
          for (var i = 0; i < a.length; i++) {
              var b = a[i].split('=');
              query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
          }
          return query;
      }
  }

  function state(loc) {
    return new State(loc)
  }

  State.prototype = {

      get: function(key,_default) { 
        var loc = this._loc || document.location.search
          , _default = _default || false;

        if (loc.indexOf(key) == -1) return _default


        var f = this._parse(loc)[key]

        try {
          return JSON.parse(f)
        } catch(e) {
          return f
        }
      }
    , set: function(key,val) {
        var loc = this._loc || document.location.search

        var parsed = this._parse(loc)

        parsed[key] = val

        var s = "?"
        Object.keys(parsed).map(function(k) {
          if (typeof(parsed[k]) == "object") {

            var o = parsed[k]
            if (o.length == undefined) {
              var o2 = {}
    
              Object.keys(o).map(function(x) { o2[x] = encodeURIComponent(o[x]) })
              s += k + "=" + JSON.stringify(o2) + "&"
            } else {
              var o1 = []
    
              o.map(function(i) {
                if (typeof(i) == "number") return o1.push(i)
                if (typeof(i) == "string") return o1.push(encodeURIComponent(i))

                var o2 = {}
                Object.keys(i).map(function(x) { o2[x] = encodeURIComponent(i[x]) })
                o1.push(o2)
              })
    
              s += k + "=" + JSON.stringify(o1) + "&"
            }
          }
          else s += k + "=" + parsed[k] + "&"
        })
        
        history.pushState({}, "", document.location.pathname + s.slice(0,-1))

      }
  }

  function Dashboard(target) {
    this._on = {}
    this._state = state()
    this._target = target
      .append("ul")
      .classed("vendors-list",true)
        .append("li")
        .classed("vendors-list-item",true);
  }

  function dashboard(target) {
    return new Dashboard(target)
  }

  Dashboard.prototype = {
      data: function(val) { return accessor.bind(this)("data",val) }
    , actions: function(val) { return accessor.bind(this)("actions",val) }
    , draw: function() {
        this._target
        this._categories = {}
        this.render_wrappers()
        this._target.selectAll(".loading").remove()
        this.render_lhs()
        this.render_right()

        this.render_center()

      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action];
        this._on[action] = fn;
        return this
      }
    , draw_loading: function() {
        this.render_wrappers()
        this.render_center_loading()
        return this
      }
    , render_wrappers: function() {

        this._lhs = d3_updateable(this._target,".lhs","div")
          .classed("lhs col-md-3",true)

        this._center = d3_updateable(this._target,".center","div")
          .classed("center col-md-6",true)

        this._right = d3_updateable(this._target,".right","div")
          .classed("right col-md-3",true)

      }
    , render_lhs: function() {

        var self = this

        this._lhs = d3_updateable(this._target,".lhs","div")
          .classed("lhs col-md-3",true)

        var current = this._lhs
          , _top = topSection(current)
          , _lower = remainingSection(current)

        summary_box(_top)
          .data(buildOnsiteSummary(this._data))
          .draw()

        this._data.display_actions = this._data.display_actions || buildActions(this._data)

        bar_selector(_lower)
          .type("radio")
          .data(this._data.display_actions)
          .on("click",function(x) {
            var t = this;

            _lower.selectAll("input")
              .attr("checked",function() {
                this.checked = (t == this)
                return undefined
              })

            //self._data.display_actions.values.map(function(v) {
            //  v.selected = 0
            //  if (v == x) v.selected = 1
            //})
            self.draw_loading()

            self.on("select")(x)
          })
          .draw()

      }
    , render_view: function(_lower,data) {

        var head = d3_updateable(_lower, "h3","h3")
          .style("margin-bottom","15px")
          .style("margin-top","-5px")

        var tabs = [
            buildDomains(data)
          , buildUrls(data)
        ]
        tabs[0].selected = 1

        d3_updateable(head,"span","span")
          .text(tabs.filter(function(x){ return x.selected})[0].key)

        var select = d3_updateable(head,"select","select")
          .style("width","19px")
          .style("margin-left","12px")
          .on("change", function(x) {
            tabs.map(function(y) { y.selected = 0 })

            this.selectedOptions[0].__data__.selected = 1
            draw()
          })
        
        d3_splat(select,"option","option",tabs,function(x) {return x.key})
          .text(function(x){ return x.key })
          .style("color","#888")
          .style("min-width","100px")
          .style("text-align","center")
          .style("display","inline-block")
          .style("padding","5px")
          .style("border",function(x) {return x.selected ? "1px solid #888" : undefined})
          .style("opacity",function(x){ return x.selected ? 1 : .5})

        function draw() {
          var selected = tabs.filter(function(x){ return x.selected})[0]

          d3_updateable(head,"span","span")
            .text(selected.key)

          _lower.selectAll(".vendor-domains-bar-desc").remove()

          var t = table$1(_lower)
            .data(selected)


          if (selected.key == "Top Domains") {
            var samp_max = d3.max(selected.values,function(x){return x.percent_norm})
              , pop_max = d3.max(selected.values,function(x){return x.pop_percent})
              , max = Math.max(samp_max,pop_max);

            var width = _lower.style("width").split(".")[0].replace("px","")/2 - 10
              , height = 20

            var x = d3.scale.linear()
              .range([0, width])
              .domain([0, max])

            t.header(function(wrap) {
              var headers = d3_updateable(wrap,".headers","div")
                .classed("headers",true)
                .style("text-transform","uppercase")
                .style("font-weight","bold")
                .style("line-height","24px")
                .style("border-bottom","1px solid #ccc")
                .style("margin-bottom","10px")

              headers.html("")

              d3_updateable(headers,".url","div")
                .classed("url",true)
                .style("width","30%")
                .style("display","inline-block")
                .text("Domain")

              d3_updateable(headers,".bullet","div")
                .classed("bullet",true)
                .style("width","50%")
                .style("display","inline-block")
                .text("Likelihood Versus Population")

              d3_updateable(headers,".percent","div")
                .classed("percent",true)
                .style("width","20%")
                .style("display","inline-block")
                .text("Percent Diff")



            })

            t.row(function(row) {
              d3_updateable(row,".url","div")
                .classed("url",true)
                .style("width","30%")
                .style("display","inline-block")
                .style("vertical-align","top")
                .text(function(x) {return x.key})

              var bullet = d3_updateable(row,".bullet","div")
                .classed("bullet",true)
                .style("width","50%")
                .style("display","inline-block")

              var diff = d3_updateable(row,".diff","div")
                .classed("diff",true)
                .style("width","15%")
                .style("display","inline-block")
                .style("vertical-align","top")
                .text(function(x) {return d3.format("%")((x.percent_norm-x.pop_percent)/x.pop_percent) })

              var plus = d3_updateable(row,".plus","a")
                .classed("plus",true)
                .style("width","5%")
                .style("display","inline-block")
                .style("font-weight","bold")
                .style("vertical-align","top")
                .text("+")
                .on("click",function(x) {

                  var d3_this = d3.select(this)
                  var d3_parent = d3.select(this.parentNode)
                  var target = d3_parent.selectAll(".expanded")

                  if (target.classed("hidden")) {
                    d3_this.html("&ndash;")
                    target.classed("hidden", false)

                    d3_splat(target,".row","div",x.urls.filter(function(x){
                        var sp = x.replace("http://","")
                          .replace("https://","")
                          .replace("www.","")
                          .split("/");

                        if ((sp.length > 1) && (sp.slice(1).join("/").length > 7)) return true


                        return false
                      }).slice(0,10))
                      .classed("row",true)
                      .style("overflow","hidden")
                      .style("height","30px")
                      .style("line-height","30px")
                      .text(String)

                    return x
                  }
                  d3_this.html("+")
                  target.classed("hidden",true).html("")
                })
                 

              var expanded = d3_updateable(row,".expanded","div")
                .classed("expanded hidden",true)
                .style("width","100%")
                .style("vertical-align","top")
                .style("padding-right","30px")
                .style("padding-left","10px")
                .style("margin-left","10px")
                .style("margin-bottom","30px")
                .style("border-left","1px solid grey")





              var svg = d3_updateable(bullet,"svg","svg")
                .attr("width",width)
                .attr("height",height)

   
              d3_updateable(svg,".bar","rect")
                .attr("x",0)
                .attr("width", function(d) {return x(d.pop_percent) })
                .attr("height", height)
                .attr("fill","#888")

              d3_updateable(svg,".bar","rect")
                .attr("x",0)
                .attr("y",height/4)
                .attr("width", function(d) {return x(d.percent_norm) })
                .attr("height", height/2)
                .attr("fill","rgb(8, 29, 88)")


            })
          }

          t.draw()
        }

        draw()      
      }
    , render_center: function() {
        this._center = d3_updateable(this._target,".center","div")
          .classed("center col-md-6",true)

        var current =  this._center
          , _top = topSection(current)
          , _lower = remainingSection(current)

        var head = d3_updateable(_top, "h3","h3")
          .style("margin-bottom","15px")
          .style("margin-top","-5px")
          .text("Filter off-site activity")

        



        //time_selector(_top)
        //  .data(transform.buildTimes(this._data))
        //  .draw()

        var self = this
          , data = self._data;

        this.render_filter(_top,_lower)
        this.render_view(_lower,this._data)

      }
    , render_filter: render_filter
    , render_center_loading: function() {
        this._center = d3_updateable(this._target,".center","div")
          .classed("center col-md-6",true)

        this._center.html("")

        d3_updateable(this._center,"center","center")
          .style("text-align","center")
          .style("display","block")
          .classed("loading",true)
          .text("Loading...")


      }
    , render_right: function(data) {

        var self = this
          , data = data || this._data

        this._right = d3_updateable(this._target,".right","div")
          .classed("right col-md-3",true)

        var current = this._right
          , _top = topSection(current)
          , _lower = remainingSection(current)

        summary_box(_top)
          .data(buildOffsiteSummary(data))
          .draw()

        this._data.display_categories = data.display_categories || buildCategories(data)

        bar_selector(_lower)
          .skip_check(true)
          .data(data.display_categories)
          .on("click",function(x) {
            x.selected = !x.selected
            self.draw() 
          })
          .draw()
        

      }

  }

  function Share(target) {
    this._target = target
    this._inner = function() {}
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
          .on("click",function() {
            overlay.remove()
          })

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
            d3.event.stopPropagation()
          })
          .each(function(x) {
            self._inner(d3.select(this))
          })

        return this
      }
    , inner: function(fn) {
        this._inner = fn.bind(this)
        this.draw()
        return this
      }
    , hide: function() {
        this._overlay.remove()
        return this 
      }
  }

  function FilterDashboard(target) {
    this._on = {}
    this._state = state()

    this._target = target
      .append("ul")
      .classed("vendors-list",true)
        .append("li")
        .classed("vendors-list-item",true);
  }

  function filter_dashboard(target) {
    return new FilterDashboard(target)
  }

  FilterDashboard.prototype = {
      data: function(val) { return accessor.bind(this)("data",val) }
    , actions: function(val) { return accessor.bind(this)("actions",val) }
    , draw: function() {
        this._target
        this._categories = {}
        this.render_wrappers()
        this._target.selectAll(".loading").remove()
        this.render_lhs()
        this.render_right()

        this.render_center()

      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action];
        this._on[action] = fn;
        return this
      }
    , draw_loading: function() {
        this.render_wrappers()
        this.render_center_loading()
        return this
      }
    , render_wrappers: function() {

        this._lhs = d3_updateable(this._target,".lhs","div")
          .classed("lhs col-md-2",true)

        this._center = d3_updateable(this._target,".center","div")
          .classed("center col-md-7",true)

        this._right = d3_updateable(this._target,".right","div")
          .classed("right col-md-3",true)

      }
    , render_lhs: function() {

        var self = this

        this._lhs = d3_updateable(this._target,".lhs","div")
          .classed("lhs col-md-2",true)
          .style("border-right","1px solid #ccc")

        var current = this._lhs
          //, _top = ui_helper.topSection(current)
          , _lower = remainingSection(current)

        //summary_box(_top)
        //  .data(transform.buildOnsiteSummary(this._data))
        //  .draw()

        this._data.display_actions = this._data.display_actions || buildActions(this._data)
        _lower.classed("affix",true)
          .style("min-width","200px")

        bar_selector(_lower)
          .type("radio")
          .data(this._data.display_actions)
          .on("click",function(x) {
            var t = this;
            self._state.set("action_name",x.key)
            _lower.selectAll("input")
              .attr("checked",function() {
                this.checked = (t == this)
                return undefined
              })

            //self._data.display_actions.values.map(function(v) {
            //  v.selected = 0
            //  if (v == x) v.selected = 1
            //})
            self.draw_loading()

            self.on("select")(x)
          })
          .draw()

      }
    , render_view: function(_lower,data) {

        var head = d3_updateable(_lower, "h3","h3")
          .style("margin-bottom","15px")
          .style("margin-top","-5px")

        var self = this

        var tabs = [
            buildDomains(data)
          , buildUrls(data)
        ]

        if ((tabs[0].selected == undefined) && (!this._state.get("tabs")))  this._state.set("tabs",[1,0]) 

        this._state.get("tabs").map(function(x,i) { tabs[i].selected = x })

        d3_updateable(head,"span","span")
          .text(tabs.filter(function(x){ return x.selected})[0].key)

        var select = d3_updateable(head,"select","select")
          .style("width","19px")
          .style("margin-left","12px")
          .on("change", function(x) {
            tabs.map(function(y) { y.selected = 0 })

            this.selectedOptions[0].__data__.selected = 1
            self._state.set("tabs", tabs.map(function(y) {return y.selected }) )
            draw()
          })
        
        d3_splat(select,"option","option",tabs,function(x) {return x.key})
          .text(function(x){ return x.key })
          .style("color","#888")
          .style("min-width","100px")
          .style("text-align","center")
          .style("display","inline-block")
          .style("padding","5px")
          .style("border",function(x) {return x.selected ? "1px solid #888" : undefined})
          .style("opacity",function(x){ return x.selected ? 1 : .5})

        function draw() {
          var selected = tabs.filter(function(x){ return x.selected})[0]

          d3_updateable(head,"span","span")
            .text(selected.key)

          _lower.selectAll(".vendor-domains-bar-desc").remove()



          var t = table.table(_lower)
            .data(selected)


          if (selected.key == "Top Domains") {

            var samp_max = d3.max(selected.values,function(x){return x.sample_percent_norm})
              , pop_max = d3.max(selected.values,function(x){return x.pop_percent})
              , max = Math.max(samp_max,pop_max);

            t.headers([
                  {key:"key",value:"Domain",locked:true,width:"100px"}
                , {key:"value",value:"Sample versus Pop",locked:true}
                , {key:"count",value:"Views",selected:false}

              ])
              .hidden_fields(["urls","percent_unique","sample_percent_norm"])
              .render("value",function(d) {
                var width = (d3.select(this).style("width").replace("px","") || this.offsetWidth) - 50
                  , height = 28;

                var x = d3.scale.linear()
                  .range([0, width])
                  .domain([0, max])

                var bullet = d3_updateable(d3.select(this),".bullet","div",this.parentNode.__data__,function(x) { return 1 })
                  .classed("bullet",true)
                  .style("margin-top","3px")

                bullet.exit().remove()

                var svg = d3_updateable(bullet,"svg","svg",false,function(x) { return 1})
                  .attr("width",width)
                  .attr("height",height)
    
     
                d3_updateable(svg,".bar","rect",false,function(x) { return 1})
                  .attr("x",0)
                  .attr("width", function(d) {return x(d.pop_percent) })
                  .attr("height", height)
                  .attr("fill","#888")
    
                d3_updateable(svg,".bar","rect",false,function(x) { return 1})
                  .attr("x",0)
                  .attr("y",height/4)
                  .attr("width", function(d) {return x(d.sample_percent_norm) })
                  .attr("height", height/2)
                  .attr("fill","rgb(8, 29, 88)")


              })
            
          }

          t.draw()
        }

        draw()      
      }
    , render_center: function() {

        var self = this;

        this._center = d3_updateable(this._target,".center","div")
          .classed("center col-md-7",true)

        var current =  this._center
          , _top = topSection(current)
          , _lower = remainingSection(current)

        var head = d3_updateable(_top, "h3","h3")
          .style("margin-bottom","15px")
          .style("margin-top","-5px")
          .text("Filter activity")

        var right_pull = d3_updateable(head,".pull-right","a")
          .classed("pull-right fa-bookmark fa", true)
          .style("margin-right","17px")
          .style("line-height","22px")
          .style("text-decoration","none !important")

        d3_updateable(right_pull,".saved-search","a")
          .classed("saved-search",true)
          .style("vertical-align","middle")
          .style("font-size","12px")
          .style("font-family","ProximaNova, sans-serif")
          .style("font-weight","bold")
          .style("border-right","1px solid #ccc")
          .style("padding-right","10px")
          .style("display","inline-block")
          .style("line-height","22px")
          .style("text-decoration","none")
          .html("&nbsp; Saved Searches")
          .on("click",function() {
            self.render_saved(_top,_lower)
            var w = _top.selectAll(".filter-wrapper")
            //w.classed("hidden",function(x) { return !w.classed("hidden") })

          })

        d3_updateable(right_pull,".new-saved-search","a")
          .classed("new-saved-search",true)
          .style("font-size","14px")
          .style("font-family","ProximaNova, sans-serif")
          .style("font-weight","bold")
          .style("padding-left","10px")
          .style("display","inline-block")
          .style("line-height","22px")
          .style("text-decoration","none")
          .html("&#65291;")
          .on("click",function() {
            //self.render_saved(_top,_lower)
            var w = _top.selectAll(".save-subtitle-filter")
            w.classed("hidden",function(x) { return !w.classed("hidden") })
            
          })



        this.render_saved(_top,_lower)
        this.render_filter(_top,_lower)

        //this.render_view(_lower,this._data)

      }
    , render_saved: function(_top,_lower) {

        var self = this;

        var saved = d3_updateable(_top,".saved","div")
          .classed("saved",true)
          .classed("hidden",function() { return !d3.select(this).classed("hidden") })
          .style("padding-left","10px")

        var saved_searches = JSON.parse(localStorage.getItem("search.saved")) || []

        //var saved_searches = [
        //    {
        //        "key": "Saved 1"
        //      , "values": [{"field":"Time","op":"equals","value":"01"}]
        //    }
        //  , {
        //        "key": "Saved 2"
        //      , "values": [{"field":"Time","op":"equals","value":"02"}]
        //    }
        //]

        //localStorage.setItem("search.saved",JSON.stringify(saved_searches))


        var saved_items = d3_splat(saved,".item","a",saved_searches,function(x) { return x.key })
          .style("display","block")
          .style("font-weight","bold")
          .style("margin-left","auto")
          .style("width","240px")
          .classed("item",true)
          .style("line-height","24px")
          .text(function(x) {return x.key})
          .on("click", function(x) {
            self._state.set("filter",x.values)
            self.render_saved(_top,_lower)
            self.render_filter(_top,_lower)
          })

      }
    , render_filter: render_filter
    , render_center_loading: function() {
        this._center = d3_updateable(this._target,".center","div")
          .classed("center col-md-7",true)

        this._center.html("")

        d3_updateable(this._center,"center","center")
          .style("text-align","center")
          .style("display","block")
          .classed("loading",true)
          .text("Loading...")


      }
    , render_right: function(data) {

        var self = this
          , data = data || this._data

        this._right = d3_updateable(this._target,".right","div")
          .classed("right col-md-3",true)

        var current = this._right
          , _top = topSection(current)
          , _lower = remainingSection(current)

        var head = d3_updateable(_top, "h3","h3")
          .style("margin-bottom","15px")
          .style("margin-top","-5px")
          .text("")

        _top.classed("affix",true)
          .style("right","0px")
          .style("width","inherit")


        

        var funcs = {
            "Build Media Plan": function(x) {
              document.location = "/crusher/media_plan"
            }
          , "Share Search": function(x) {
              var x = x
              var ss = share(d3.select("body"))
                .draw()

              ss.inner(function(target) {

                var self = this;

                  var header = d3_updateable(target,".header","h4")
                    .classed("header",true)
                    .style("text-align","center")
                    .style("text-transform","uppercase")
                    .style("font-family","ProximaNova, sans-serif")
                    .style("font-size","12px")
                    .style("font-weight","bold")
                    .style("padding-top","30px")
                    .style("padding-bottom","30px")
                    .text("Share search results via:")

                  var email_form = d3_updateable(target,".email-share-form","div")
                    .classed("email-share-form hidden",true)
                    .style("text-align","center")

                  var to = d3_updateable(email_form, ".to", "div")
                    .classed("to",true)
                  
                  d3_updateable(to,".label","div")
                    .style("width","100px")
                    .style("display","inline-block")
                    .style("text-transform","uppercase")
                    .style("font-family","ProximaNova, sans-serif")
                    .style("font-size","12px")
                    .style("font-weight","bold")
                    .style("text-align","left")
                    .text("To:")

                  var to_input = d3_updateable(to,"input","input")
                    .style("width","300px")
                    .attr("placeholder","elonmusk@example.com")

                  var name = d3_updateable(email_form, ".name", "div")
                    .classed("name",true)
                  
                  d3_updateable(name,".label","div")
                    .style("width","100px")
                    .style("display","inline-block")
                    .style("text-transform","uppercase")
                    .style("font-family","ProximaNova, sans-serif")
                    .style("font-size","12px")
                    .style("font-weight","bold")
                    .style("text-align","left")
                    .text("Report Name:")

                  var name_input = d3_updateable(name,"input","input")
                    .style("width","300px")
                    .attr("placeholder","My awesome search")



                  


                  var message = d3_updateable(email_form, ".message", "div")
                    .classed("message",true)
                  
                  d3_updateable(message,".label","div")
                    .style("display","inline-block")
                    .style("width","100px")
                    .style("text-transform","uppercase")
                    .style("font-family","ProximaNova, sans-serif")
                    .style("font-size","12px")
                    .style("font-weight","bold")
                    .style("text-align","left")
                    .text("Message:")

                  var message_input = d3_updateable(message,"textarea","textarea")
                    .style("width","300px")
                    .style("height","100px")
                    .style("border","1px solid #ccc")
                    .attr("placeholder","Hey Elon - Thought you might be interested in this...")


                  var send = d3_updateable(email_form, ".send", "div")
                    .classed("send",true)
                    .style("text-align","center")

                  var data = x;

                  d3_updateable(send,"button","button")
                    .style("line-height","16px")
                    .style("margin-top","10px")
                    .text("Send")
                    .on("click",function(x) {
                      console.log(message_input.value, to_input.value)
                      var msg = message_input.property("value")
                        , email = to_input.property("value")
                        , name = name_input.property("value")


                      var URLS = [
                          "/crusher/funnel/action?format=json" 
                        , "/crusher/v2/visitor/domains_full_time_minute/cache?format=json&top=20000&url_pattern=" + data.url_pattern[0] + "&filter_id=" + data.action_id
                        , "/crusher/pattern_search/timeseries_only?search=" + data.url_pattern[0] 
                        , location.pathname + decodeURIComponent(location.search)
                      ]

                      d3.xhr("/share")
                        .post(JSON.stringify({
                              "email": email
                            , "msg": msg
                            , "name": name
                            , "urls": URLS
                          })
                        )

                      self.hide()

                    })


             
                  

                  var slack_form = d3_updateable(target,".slack-share-form","div")
                    .classed("slack-share-form hidden",true)
                    .style("text-align","center")
                    .text("Slack integration coming soon...")


                  var email = d3_updateable(target,".email-wrap","div")
                    .classed("btn-wrap email-wrap col-md-6",true)
                    .style("text-align","center")

                  d3_updateable(email,"a","a")
                    .attr("style","text-transform: uppercase; font-weight: bold; line-height: 24px; padding: 10px; width: 180px; text-align: center; border-radius: 10px; border: 1px solid rgb(204, 204, 204); margin: auto auto 10px; cursor: pointer; display: block;")
                    .text("email")
                    .on("click",function() {
                      header.text("Share results via email")
                      target.selectAll(".btn-wrap").classed("hidden",true)
                      email_form.classed("hidden",false)

                    })


                  var slack = d3_updateable(target,".slack-wrap","div")
                    .classed("btn-wrap slack-wrap col-md-6",true)
                    .style("text-align","center")

                  d3_updateable(slack,"a","a")
                    .attr("style","text-transform: uppercase; font-weight: bold; line-height: 24px; padding: 10px; width: 180px; text-align: center; border-radius: 10px; border: 1px solid rgb(204, 204, 204); margin: auto auto 10px; cursor: pointer; display: block;")
                    .text("slack")
                    .on("click",function() {
                      target.selectAll(".btn-wrap").classed("hidden",true)
                      slack_form.classed("hidden",false)

                    })







                })
            }
          , "Schedule Report": function(x) {

              var ss = share(d3.select("body"))
                .draw()

              ss.inner(function(target) {

                var self = this;

                  var header = d3_updateable(target,".header","h4")
                    .classed("header",true)
                    .style("text-align","center")
                    .style("text-transform","uppercase")
                    .style("font-family","ProximaNova, sans-serif")
                    .style("font-size","12px")
                    .style("font-weight","bold")
                    .style("padding-top","30px")
                    .style("padding-bottom","30px")
                    .text("Schedule search results:")

                  var email_form = d3_updateable(target,"div","div")
                    .style("text-align","center")

                  var to = d3_updateable(email_form, ".to", "div")
                    .classed("to",true)
                  
                  d3_updateable(to,".label","div")
                    .style("width","100px")
                    .style("display","inline-block")
                    .style("text-transform","uppercase")
                    .style("font-family","ProximaNova, sans-serif")
                    .style("font-size","12px")
                    .style("font-weight","bold")
                    .style("text-align","left")
                    .text("To:")

                  var to_input = d3_updateable(to,"input","input")
                    .style("width","300px")
                    .attr("placeholder","elonmusk@example.com")

                  var name = d3_updateable(email_form, ".name", "div")
                    .classed("name",true)
                  
                  d3_updateable(name,".label","div")
                    .style("width","100px")
                    .style("display","inline-block")
                    .style("text-transform","uppercase")
                    .style("font-family","ProximaNova, sans-serif")
                    .style("font-size","12px")
                    .style("font-weight","bold")
                    .style("text-align","left")
                    .text("Report Name:")

                  var name_input = d3_updateable(name,"input","input")
                    .style("width","300px")
                    .attr("placeholder","My awesome search")


                  var schedule = d3_updateable(email_form, ".schedule", "div")
                    .classed("schedule",true)


                  d3_updateable(schedule,".label","div")
                    .style("width","100px")
                    .style("display","inline-block")
                    .style("text-transform","uppercase")
                    .style("font-family","ProximaNova, sans-serif")
                    .style("font-size","12px")
                    .style("font-weight","bold")
                    .style("text-align","left")
                    .text("Schedule:")

                  var schedule_input = d3_updateable(schedule,"select","select",["Mon","Tues","Wed","Thurs","Fri","Sat","Sun"])
                    .style("width","300px")
                    .attr("multiple",true)

                  d3_splat(schedule_input,"option","option")
                    .text(String)

                  var time = d3_updateable(email_form, ".time", "div")
                    .classed("time",true)


                  d3_updateable(time,".label","div")
                    .style("width","100px")
                    .style("display","inline-block")
                    .style("text-transform","uppercase")
                    .style("font-family","ProximaNova, sans-serif")
                    .style("font-size","12px")
                    .style("font-weight","bold")
                    .style("text-align","left")
                    .text("Time:")

                  var time_input = d3_updateable(time,"select","select",d3.range(0,23).map(function(x) { return (x%12 + 1) + (x +1 > 11 ? " pm" : " am") }) )
                    .style("width","300px")

                  d3_splat(time_input,"option","option")
                    .attr("selected",function(x) { return x == "12 pm" ? "selected" : undefined })
                    .text(String)


                  var send = d3_updateable(email_form, ".send", "div")
                    .classed("send",true)
                    .style("text-align","center")

                  var data = x;

                  d3_updateable(send,"button","button")
                    .style("line-height","16px")
                    .style("margin-top","10px")
                    .text("Send")
                    .on("click",function(x) {
                      var email = to_input.property("value")
                        , name = name_input.property("value") 
                        , time = time_input.property("value")
                        , days = d3.selectAll(schedule_input.node().selectedOptions).data().join(",")

                      var URLS = [
                          "/crusher/funnel/action?format=json" 
                        , "/crusher/v2/visitor/domains_full_time_minute/cache?format=json&top=20000&url_pattern=" + data.url_pattern[0] + "&filter_id=" + data.action_id
                        , "/crusher/pattern_search/timeseries_only?search=" + data.url_pattern[0] 
                        , location.pathname + decodeURIComponent(location.search)
                      ]

                      d3.xhr("/share")
                        .post(JSON.stringify({
                              "email": email
                            , "name": name
                            , "days": days
                            , "time": time
                            , "urls": URLS
                          })
                        )

                      self.hide()

                    })
                    .text("Schedule")


              })


            }
        }

        //var f = d3_splat(_top,".subtitle-filter","a",["Save Results","Share Results","Schedule Results","Build Content Brief","Build Media Plan" ])

        var f = d3_splat(_top,".subtitle-filter","a",["Share Search","Schedule Report", "", "Build Media Plan"])
          .classed("subtitle-filter",true)
          .style("text-transform","uppercase")
          .style("font-weight","bold")
          .style("line-height", "24px")
          .style("padding","16px")
          .style("width"," 180px")
          .style("text-align"," center")
          .style("border-radius"," 10px")
          .style("border",function(x) { return x == "" ? "none" : "1px solid #ccc" } )
          .style("padding"," 10px")
          .style("margin"," auto")
          .style("margin-bottom","10px")
          .style("cursor","pointer")
          .style("display","block")
          .text(String)
          .on("click", function(x) {
            funcs[x].bind(self)(self._data)

          })

       

        this._data.display_categories = data.display_categories || buildCategories(data)


      }

  }

  var version = "0.0.1";

  exports.version = version;
  exports.dashboard = dashboard;
  exports.filter_dashboard = filter_dashboard;
  exports.state = state;

}));