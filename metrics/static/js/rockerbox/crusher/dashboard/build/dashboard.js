(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('dashboard', ['exports'], factory) :
  factory((global.dashboard = {}));
}(this, function (exports) { 'use strict';

  function accessor$1(attr, val) {
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
    this._target = target;
    this._data = EXAMPLE_DATA$1
    this._categories = {}
  }

  function bar_selector(target) {
    return new BarSelector(target)
  }

  BarSelector.prototype = {

      data: function(val) { return accessor.bind(this)("data",val) }
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
            
            var svg = d3_updateable(svg_wrap,"g","g")
              .attr("transform", "translate(" + _sizes.margin.left + "," + 0 + ")")
              .datum(function(x) { return x.values })
          
            var valueAccessor = function(x){ return x.value }
              , labelAccessor = function(x) {return x.key }
      
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
          
              svg.selectAll("foreignobject").each(function(x){
                var tree = d3.select(this.children[0])
          
                d3_updateable(tree,"input","input")
                  .attr("type","checkbox")
                  .property("checked",function(y){
                    return self._categories[labelAccessor(x)] ? "checked" : undefined
                  })
                  .on("click", function() {
                    self._click.bind(this)(x,self)
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
      data: function(val) { return accessor$1.bind(this)("data",val) }
    , draw: function() {
        this._target
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
          .draw()

        var _lower = remainingSection(current)

        bar_selector(_lower)
          .draw()

      }
    , render_center: function() {
         this._center = d3_updateable(this._target,".center","div")
           .classed("center col-md-6",true)

         var current =  this._center

         topSection(current)
          .text("Yo")

        remainingSection(current)
          .text("Yo")

      }
    , render_right: function() {
        this._right = d3_updateable(this._target,".right","div")
          .classed("right col-md-3",true)

        var current = this._right

        topSection(current)
          .text("Yo")

        remainingSection(current)
          .text("Yo")

      }

  }

  var version = "0.0.1";

  exports.version = version;
  exports.dashboard = dashboard;

}));