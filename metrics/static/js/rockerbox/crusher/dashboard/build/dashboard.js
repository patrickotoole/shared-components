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
          .sort(function(p,c) {return c.value - p.value }).slice(0,10)
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
                .attr("x",0)
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
    , row: function(val) { return accessor.bind(this)("row",val) }
    
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

          d3_updateable(wrap, "h3","h3")
            .text(function(x){return x.key})
            .style("margin-bottom","15px")

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
        this.render_lhs()
        this.render_center()
        this.render_right()

      }
    , render_lhs: function() {
        this._lhs = d3_updateable(this._target,".lhs","div")
          .classed("lhs col-md-3",true)

        var current = this._lhs

        var _top = topSection(current)

        summary_box(_top)
          .data({
               "key":""
             , "values": [
  /*
                  {  
                      "key":"Off-site Views"
                    , "value": 12344
                  }
                , {
                      "key":"Off-site Uniques"
                    , "value": 12344
                  }
  */
                ]
           })
          .draw()

        var _lower = remainingSection(current)
        var self = this

        this._data.display_categories = this._data.display_categories || buildCategories(this._data)

        bar_selector(_lower)
          .data(this._data.display_categories)
          .on("click",function(x) {
            console.log(x)
            x.selected = !x.selected
            console.log(x)
            self.draw() 
          })
          .draw()

      }
    , render_center: function() {
        this._center = d3_updateable(this._target,".center","div")
          .classed("center col-md-6",true)

        var current =  this._center

        var _top = topSection(current)

        time_selector(_top)
          .data(buildTimes(this._data))
          .draw()

        var _lower = remainingSection(current)

        table(_lower)
          .data(buildUrls(this._data))
          .draw()

      }
    , render_right: function() {
        this._right = d3_updateable(this._target,".right","div")
          .classed("right col-md-3",true)

        var current = this._right

        var _top = topSection(current)

        summary_box(_top)
          .data({"key":"","values":[]})//{"key":"On-Site Visits","values":[]})
          .draw()

        var _lower = remainingSection(current)

        var self = this;
        this._data.display_actions = this._data.display_actions || {"key":"Segments","values":this._data.actions.map(function(x){ return {"key":x.action_name, "value":0} })}

        bar_selector(_lower)
          .type("radio")
          .data(this._data.display_actions)
          .on("click",function(x) {
            self._data.display_actions.values.map(function(v) {
              v.selected = 0
              if (v == x) v.selected = 1
            })
            console.log(x)
            self.draw()
          })
          .draw()

      }

  }

  var version = "0.0.1";

  exports.version = version;
  exports.dashboard = dashboard;

}));