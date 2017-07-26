(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('helpers')) :
  typeof define === 'function' && define.amd ? define('chart', ['exports', 'helpers'], factory) :
  factory((global.media_plan = {}),global.helpers);
}(this, function (exports,helpers) { 'use strict';

  function simpleTimeseries(target,data,w,h,min) {
    var width = w || 120
      , height = h || 30

    var x = d3.scale.ordinal().domain(d3.range(0,data.length)).range(d3.range(0,width,width/data.length))
    var y = d3.scale.linear().range([4,height]).domain([min || d3.min(data),d3.max(data)])

    var wrap = helpers.d3_updateable(target,"g","g",data,function(x,i) { return 1})

    helpers.d3_splat(wrap,"rect","rect",x => x, (x,i) => i)
      .attr("x",(z,i) => x(i))
      .attr("width", width/data.length -1.2)
      .attr("y", z => height - y(z) )
      .attr("height", z => z ? y(z) : 0)

    return wrap

  }

  function before_after_timeseries(target) {
    return new BeforeAfterTimeseries(target)
  }

  class BeforeAfterTimeseries extends helpers.D3ComponentBase {

    constructor(target) {
      super(target)
      this._wrapper_class = "ba-timeseries-wrap"
    }

    props() { return ["data","before","after","wrapper_class"] }

    draw() {

      const tsw = 250
        , unit_size = tsw/this.data().length
        , before_pos = this.before()
        , after_pos = this.after()


      const timeseries = helpers.d3_class(this._target,this.wrapper_class(),"svg")
        .style("display","block")
        .style("margin","auto")
        .style("margin-bottom","30px")
        .attr("width",tsw + "px")
        .attr("height","70px")

      simpleTimeseries(timeseries,this.data(),tsw)

      // add decorations

      helpers.d3_class(timeseries,"middle","line")
        .style("stroke-dasharray", "1,5")
        .attr("stroke-width",1)
        .attr("stroke","black")
        .attr("y1", 0)
        .attr("y2", 55)
        .attr("x1", tsw/2)
        .attr("x2", tsw/2)

      helpers.d3_class(timeseries,"middle-text","text")
        .attr("x", tsw/2)
        .attr("y", 67)
        .style("text-anchor","middle")
        .text("On-site")

      helpers.d3_class(timeseries,"before","line")
        .style("stroke-dasharray", "1,5")
        .attr("stroke-width",1)
        .attr("stroke","black")
        .attr("y1", 39)
        .attr("y2", 45)
        .attr("x1", unit_size*before_pos)
        .attr("x2", unit_size*before_pos)

      helpers.d3_class(timeseries,"before-text","text")
        .attr("x", unit_size*before_pos - 8)
        .attr("y", 48)
        .style("text-anchor","end")
        .text("Consideration")

      helpers.d3_class(timeseries,"window","line")
        .style("stroke-dasharray", "1,5")
        .attr("stroke-width",1)
        .attr("stroke","black")
        .attr("y1", 45)
        .attr("y2", 45)
        .attr("x1", unit_size*(before_pos))
        .attr("x2", unit_size*(after_pos+1)+1)

      helpers.d3_class(timeseries,"after","line")
        .style("stroke-dasharray", "1,5")
        .attr("stroke-width",1)
        .attr("stroke","black")
        .attr("y1", 39)
        .attr("y2", 45)
        .attr("x1", unit_size*(after_pos+1))
        .attr("x2", unit_size*(after_pos+1))

      helpers.d3_class(timeseries,"after-text","text")
        .attr("x", unit_size*(after_pos+1) + 8)
        .attr("y", 48)
        .style("text-anchor","start")
        .text("Validation")




      return this
    }

  }

  function simpleBar(wrap,value,scale,color) {

    var height = 20
      , width = wrap.style("width").replace("px","")

    var canvas = helpers.d3_updateable(wrap,"svg","svg",[value],function() { return 1})
      .style("width",width+"px")
      .style("height",height+"px")

    var chart = helpers.d3_updateable(canvas,'g.chart','g',false,function() { return 1 })
      .attr("class","chart")
    
    var bars = helpers.d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x,i) { return i })
      .attr("class","pop-bar")
      .attr('height',height-4)
      .attr({'x':0,'y':0})
      .style('fill',color)
      .attr("width",function(x) { return scale(x) })

  }

  function domain_bullet(target) {
    return new DomainBullet(target)
  }

  // data schema: [{pop_percent, sample_percent_norm}

  class DomainBullet extends helpers.D3ComponentBase {
    constructor(target) {
      super()
      this.target = target
    }
    props() { return ["data","max"] }

    draw() {
      var width = (this.target.style("width").replace("px","") || this.offsetWidth) - 50
        , height = 28;

      var x = d3.scale.linear()
        .range([0, width])
        .domain([0, this.max()])

      if (this.target.text()) this.target.text("")

      var bullet = helpers.d3_updateable(this.target,".bullet","div",this.data(),function(x) { return 1 })
        .classed("bullet",true)
        .style("margin-top","3px")

      var svg = helpers.d3_updateable(bullet,"svg","svg",false,function(x) { return 1})
        .attr("width",width)
        .attr("height",height)
    
     
      helpers.d3_updateable(svg,".bar-1","rect",false,function(x) { return 1})
        .classed("bar-1",true)
        .attr("x",0)
        .attr("width", function(d) {return x(d.pop_percent) })
        .attr("height", height)
        .attr("fill","#888")
    
      helpers.d3_updateable(svg,".bar-2","rect",false,function(x) { return 1})
        .classed("bar-2",true)
        .attr("x",0)
        .attr("y",height/4)
        .attr("width", function(d) {return x(d.sample_percent_norm) })
        .attr("height", height/2)
        .attr("fill","rgb(8, 29, 88)")

      return this 
    }
  }

  var version = "0.0.1";

  exports.version = version;
  exports.before_after_timeseries = before_after_timeseries;
  exports.simpleTimeseries = simpleTimeseries;
  exports.simpleBar = simpleBar;
  exports.domain_bullet = domain_bullet;

}));