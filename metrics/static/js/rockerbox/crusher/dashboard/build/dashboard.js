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

        remainingSection(current)
          .text("Yo")

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