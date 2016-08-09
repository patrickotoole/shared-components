(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('dashboard', ['exports'], factory) :
  factory((global.dashboard = {}));
}(this, function (exports) { 'use strict';

  function accessor(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  function topSection(section) {
    return d3_updateable(section,".top-section","div")
      .classed("top-section",true)
      .style("height","200px")
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

  function buildTimes(data) {

    var hour = data.current_hour

    var categories = data.display_categories.values
      .filter(function(a) { return a.selected })
      .map(function(a) { return a.key })

    if (categories.length > 0) {
      hour = data.category_hour.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1})
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
        }, {"hour":x.key}) } )
    }

    var values = hour
      .map(function(x) { return {"key": parseFloat(x.hour) + 1 + x.minute/60, "value": x.count } })

    return {
        key: "Browsing behavior by time"
      , values: values
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

    var values = data.url_only
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
      x.value = Math.log(x.tf_idf)
    })
    values = values.sort(function(p,c) { return c.tf_idf - p.tf_idf })


    var total = d3.sum(values,function(x) { return x.count*x.percent_unique})

    values.map(function(x) { 
      x.pop_percent = 1.02/getIDF(x.key)*100
      x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent

      x.percent = x.count*x.percent_unique/total*100
    })

    var norm = d3.scale.linear()
      .range([0, d3.max(values,function(x){ return x.pop_percent})])
      .domain([0, d3.max(values,function(x){return x.percent})])
      .nice()

    values.map(function(x) {
      x.percent_norm = norm(x.percent)
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

    var values = data.url_only
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
            , "value": data.url_only.reduce(function(p,c) {return p + c.uniques},0)
          }
        , {
              "key": "Unique pages"
            , "value": Object.keys(data.url_only.reduce(function(p,c) {p[c.url] = 0; return p },{})).length
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
          
          
            var label = d3_splat(svg,".name","text",false,labelAccessor)
                .classed("name",true)
                .attr("x",25)
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
          
            svg.append("g")
                .attr("class", "y axis")
              .append("line")
                .attr("x1", x(0))
                .attr("x2", x(0))
                .attr("y2", _sizes.height);

        })

      }
  }

  var EXAMPLE_DATA$2 = {
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
  }

  function TimeSelector(target) {
    this._target = target;
    this._data = EXAMPLE_DATA$2
  }

  function time_selector(target) {
    return new TimeSelector(target)
  }

  TimeSelector.prototype = {

      data: function(val) { return accessor.bind(this)("data",val) }
    , title: function(val) { return accessor.bind(this)("title",val) }
    , draw: function() {
        var wrap = this._target
        var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
          .classed("vendor-domains-bar-desc",true)
          .style("display","inherit")
          .style("height","100%")
          .datum(this._data)

        var wrapper = d3_updateable(desc,".w","div")
          .classed("w",true)
          .style("height","100%")

    
        

        wrapper.each(function(row){

          var data = row.values
            , count = data.length;

          d3_updateable(wrapper, "h3","h3")
            .text(function(x){return x.key})
            .style("margin-bottom","15px")

          var _sizes = autoSize(wrapper,function(d){return d -50}, function(d){return d - 40}),
            gridSize = Math.floor(_sizes.width / 24 / 3);

          var valueAccessor = function(x) { return x.value }
            , keyAccessor = function(x) { return x.key }

          var steps = Array.apply(null, Array(count)).map(function (_, i) {return i+1;})

          var _colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"]
          var colors = _colors

          var x = d3.scale.ordinal().range(steps)
            , y = d3.scale.linear().range([_sizes.height, 0 ]);

          var colorScale = d3.scale.quantile()
            .domain([0, d3.max(data, function (d) { return d.frequency; })])
            .range(colors);

          var svg_wrap = d3_updateable(wrapper,"svg","svg")
            .attr("width", _sizes.width + _sizes.margin.left + _sizes.margin.right)
            .attr("height", _sizes.height + _sizes.margin.top + _sizes.margin.bottom)

          var svg = d3_splat(svg_wrap,"g","g",function(x) {return [x.values]},function(_,i) {return i})
            .attr("transform", "translate(" + _sizes.margin.left + "," + 0 + ")")

          x.domain(data.map(function(d) { return keyAccessor(d) }));
          y.domain([0, d3.max(data, function(d) { return Math.sqrt(valueAccessor(d)); })]);

          var bars = d3_splat(svg, ".timing-bar", "rect", data, keyAccessor)
            .attr("class", "timing-bar")
           
          bars
            .attr("x", function(d) { return ((keyAccessor(d) - 1) * gridSize * 3); })
            .attr("width", gridSize - 2)
            .attr("y", function(d) { return y(Math.sqrt( valueAccessor(d) )); })
            .attr("fill","#aaa")
            .attr("fill",function(x) { return colorScale( valueAccessor(x) ) } )
            .attr("stroke","white")
            .attr("stroke-width","1px")
            .attr("height", function(d) { return _sizes.height - y(Math.sqrt( valueAccessor(d) )); })
            .style("opacity","1")
            .on("click",function(x){ return false })
      
        var z = d3.time.scale()
          .range([0, _sizes.width])
          .nice(d3.time.hour,24)
          
      
        var xAxis = d3.svg.axis()
          .scale(z)
          .ticks(3)
          .tickFormat(d3.time.format("%I %p"));
      
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + _sizes.height + ")")
            .call(xAxis);



          
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
          .style("line-height","30px")
          .style("height","30px")
          .style("overflow","hidden")
          .style("display","inline-block")
          .text(function(x) {return x.key})

        d3_updateable(row,".count","div")
          .classed("count",true)
          .style("width","25%")
          .style("display","inline-block")
          .text(function(x){return x.value})

    }
  }

  function table(target) {
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

  function Dashboard(target) {
    this._on = {}
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
    , render_center: function() {
        this._center = d3_updateable(this._target,".center","div")
          .classed("center col-md-6",true)

        var current =  this._center
          , _top = topSection(current)
          , _lower = remainingSection(current)

        time_selector(_top)
          .data(buildTimes(this._data))
          .draw()

        var head = d3_updateable(_lower, "h3","h3")
          .style("margin-bottom","15px")
          .style("margin-top","-5px")


        var tabs = [
            buildDomains(this._data)
          , buildUrls(this._data)
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

          var t = table(_lower)
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
    , render_right: function() {

        var self = this

        this._right = d3_updateable(this._target,".right","div")
          .classed("right col-md-3",true)

        var current = this._right
          , _top = topSection(current)
          , _lower = remainingSection(current)

        summary_box(_top)
          .data(buildOffsiteSummary(this._data))
          .draw()

        this._data.display_categories = this._data.display_categories || buildCategories(this._data)

        bar_selector(_lower)
          .data(this._data.display_categories)
          .on("click",function(x) {
            x.selected = !x.selected
            self.draw() 
          })
          .draw()
        

      }

  }

  var version = "0.0.1";

  exports.version = version;
  exports.dashboard = dashboard;

}));