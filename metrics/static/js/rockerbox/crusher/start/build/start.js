(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
  typeof define === 'function' && define.amd ? define('start', ['exports', 'd3'], factory) :
  factory((global.start = {}),global.d3$1);
}(this, function (exports,d3$1) { 'use strict';

  function d3_updateable$1(target,selector,type,data,joiner) {
    var type = type || "div"
    var updateable = target.selectAll(selector).data(
      function(x){return data ? [data] : [x]},
      joiner || function(x){return [x]}
    )

    updateable.enter()
      .append(type)

    return updateable
  }

  function d3_splat$1(target,selector,type,data,joiner) {
    var type = type || "div"
    var updateable = target.selectAll(selector).data(
      data || function(x){return x},
      joiner || function(x){return x}
    )

    updateable.enter()
      .append(type)

    return updateable
  }

  function make_envelope(tab) {
    
    return d3_updateable$1(tab,".envelope.btn-evn","div")
      .classed("envelope btn-env",true)
      .style("width","inherit")
      .style("margin","none")
      .style("background","none")
      .style("text-align","center")

  }

  function make_button(e,t) {
    var form_button = d3_updateable$1(e,".form_button","div")
      .classed("form_button",true)

    return d3_updateable$1(form_button,".button","input")
      .attr("type","button")
      .attr("value",t)
      .classed("w-button button button-blue",true)
  }

  function render_button() {

    var env = make_envelope(this._pane)
      , button = make_button(env,this._button || "validate")

    var click = this._click,
      pane = this._target;

    button.on("click",function(x){return click.bind(this)(x,pane) })


  }

  function make_wrap(row,data) {
    
    var cp = d3_updateable$1(row,".codepeek_content","div",data)
      .classed("w-tab-content codepeek_content",true)

    var tab = d3_updateable$1(cp,".w-tab-pane","div")
      .classed("w-tab-pane w--tab-active",true)

    var w = d3_updateable$1(tab,".window","div")
      .classed("window window-dark",true)

    return cp
  }

  function render_wrapper() {

    var row = this._target
    var data = this.data()

    this._wrapper = make_wrap(row,data)
    this._pane = this._wrapper.selectAll(".w-tab-pane")
    
  }

  function render_code() {

    var w = this._wrapper.selectAll(".window")

    var c = d3_updateable$1(w,".window_content","div")
      .classed("window_content",true)

    var demo = d3_updateable$1(c,".codedemo","div")
      .classed("codedemo row",true)

    var demo_text = d3_updateable$1(demo,".codedemo_text","div")
      .classed("codedemo_text",true)

    var pre = d3_updateable$1(demo_text,"pre","pre")
    var pre = d3_updateable$1(pre,"code","code")
      .text(function(x){
        var all_pages = x.segments.filter(function(x){return x.segment_name.indexOf("All Pages") > -1})[0]
        return all_pages.segment_implemented
      })

    hljs.initHighlighting.called = false;
    hljs.initHighlighting();
  }

  function render_bar() {

    var w = this._wrapper.selectAll(".window")

    var bar = d3_updateable$1(w,".window_bar","div")
      .classed("window_bar window_bar-dark",true)

    var buttons = d3_splat$1(bar,".window_bar_button","div",[{},{},{}],function(d,i){return i})
      .classed("window_bar_button window_bar_button-dark",true)

  }

  function accessor(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  function Codepeek(target) {
    this._target = target;
    this._wrapper = this._target;
    return 1
  }

  function codepeek(target) {
    return new Codepeek(target)
  }

  Codepeek.prototype = {
      draw: function() {
        this._target

        this.render_wrapper()
        this.render_bar()
        this.render_code()
        this.render_button()
        this.render_left()
        this.render_right()

        return this
      }
    , render_bar: render_bar
    , render_code: render_code
    , render_wrapper: render_wrapper
    , render_button: render_button
    , render_left: function(){}
    , render_right: function() {}

    , data: function(val) { return accessor.bind(this)("data",val) }
    , code: function(val) { return accessor.bind(this)("code",val) }
    , button: function(val) { return accessor.bind(this)("button",val) }
    , click: function(val) { return accessor.bind(this)("click",val) }


  }

  function render_rows() {

    var row = d3_splat$1(this._wrapper,".grey_row","div",this._data.reverse().slice(0,5),function(x){return x.timestamp})
      .classed("grey_row pricing_summary row",true)

    d3_updateable$1(row,".date","div")
      .classed("date pull-left ",true)
      .text(function(x){return x.timestamp})

    d3_updateable$1(row,".pull-right","div")
      .classed("pull-right",true)
      .text(function(x){return JSON.parse(x.json_body).referrer })



  }

  function render_description() {

    this._desc_wrapper = d3_updateable$1(this._wrapper,".envelope_description","div")
      .classed("envelope_description",true)
      .style("margin-bottom","30px")
      .html(this._description)

  }

  function render_title() {

    d3_updateable$1(this._wrapper,".envelope_title","h3")
      .classed("envelope_title",true)
      .text(this._title)

  }

  function make_wrap$1(row,data) {
    
    var e = d3_updateable$1(row,".validated.envelope","div",data)
      .classed("pull-left envelope validated",true)
      .style("width","50%")
      .style("margin-bottom","50px")
      .style("margin-left","auto")
      .style("margin-right","auto")

    d3_updateable$1(e,".envelope_gradient","div")
      .classed("envelope_gradient",true)

    var f = d3_updateable$1(e,".envelope_form","div")
      .classed("w-form envelope_form",true)

    return f
   
  }

  function render_wrapper$1() {

    var row = this._target
    var data = this.data()

    this._wrapper = make_wrap$1(row,data)
    var outer = d3_updateable$1(this._target,".btn-wrap","div") // for the button
      .classed("btn-wrap",true)
      .style("width","50%")
      .style("text-align","center")
      .style("margin-top","-50px")
      .style("margin-left","auto")
      .style("margin-right","auto")




    this._pane = d3_updateable$1(outer,".btn-wrap","div")
      .style("width","100%")
    
  }

  function accessor$1(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  function Envelope(target) {
    this._target = target;
    this._wrapper = this._target;
    return 1
  }

  function envelope(target) {
    return new Envelope(target)
  }

  Envelope.prototype = {
      draw: function() {
        this._target

        this.render_wrapper()
        this.render_title()
        this.render_description()
        this.render_rows()
        this.render_button()

        return this
      }

    , render_wrapper: render_wrapper$1
    , render_title: render_title
    , render_description: render_description
    , render_rows: render_rows
    , render_button: render_button

    , data: function(val) { return accessor$1.bind(this)("data",val) }
    , click: function(val) { return accessor$1.bind(this)("click",val) }
    , title: function(val) { return accessor$1.bind(this)("title",val) }
    , button: function(val) { return accessor$1.bind(this)("button",val) }
    , description: function(val) { return accessor$1.bind(this)("description",val) }

  }

  function render_row() {

    this._wrapper

    var cp_row = d3_updateable$1(this._wrapper,".codepeek_row","div")
      .classed("codepeek_row row col-md-10",true)
      .style("margin-left","8.3%")
      .style("margin-right","8.3%")
      .style("overflow","hidden")

    this._left_wrapper = d3_updateable$1(cp_row,".left","div")
      .classed("codepeek_aside left pull-left",true)
      .style("width","25%")
      .style("min-height","500px")
      .style("padding","25px")
      .html(this._left)

    this._right_wrapper = d3_updateable$1(cp_row,".right","div")
      .classed("codepeek_aside right pull-right",true)
      .style("width","25%")
      .style("padding","25px")
      .html(this._right)

    this._stage = cp_row

    return cp_row



    
  }

  function render_header() {

    d3_updateable$1(this._wrapper,".section_title","h2")
        .classed("section_title",true)
        .text(this._title)

    d3_updateable$1(this._wrapper,".section_sep","div")
      .classed("section_sep",true)

    d3_updateable$1(this._wrapper,".section_subtitle","div")
      .classed("section_subtitle",true)
      .text(this._subtitle)

    
  }

  function make_wrap$2(row,data) {
    
    return d3_updateable$1(row,".row","div",data)
      .attr("style","padding-bottom:15px;padding-top:5px")
      .classed("row",true)

  }

  function render_wrapper$2() {

    var row = this._target
    var data = this.data()

    this._wrapper = make_wrap$2(row,data)
    
  }

  function accessor$2(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  function Stage(target) {
    this._target = target;
    this._wrapper = this._target;
    this._title = "Welcome to Rockerbox"
    this._subtitle = "Getting started is easy. Copy and paste the pixel below to the <head> section of your website."
    this._left = "<div class='codepeek_text'>" + 
        "Implementing Rockerbox is simple.<br><br>" + 
        "<b>First,</b> place the pixel on all pages of your website.<br><br>" + 
        "<b>Then,</b> click validate to ensure its collecting information from your site." + 
      "</div>"
    this._right = "<div class='codepeek_text'>" + 
        "Create your first segment by following our <a >Quickstart Guide</a><br><br>" +
        "Take a tour of our <a>Insights Modules</a> and start crafting content.<br/><br/>" + 
        "Read through our <a>Implementation Guide</a> to track custom events and insights" + 
      "</div>"

    return 1
  }

  function stage(target) {
    return new Stage(target)
  }

  Stage.prototype = {
      draw: function() {
        this._target

        this.render_wrapper()
        this.render_header()
        this.render_main()


        return this
      }
    , render_wrapper: render_wrapper$2
    , render_header: render_header

    , render_main: render_row

    , data: function(val) { return accessor$2.bind(this)("data",val) }
    , title: function(val) { return accessor$2.bind(this)("title",val) }
    , subtitle: function(val) { return accessor$2.bind(this)("subtitle",val) }
    , left: function(val) { return accessor$2.bind(this)("left",val) }
    , right: function(val) { return accessor$2.bind(this)("right",val) }


  }

  function accessor$3(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  function Slideshow(target) {
    this._target = target;
    this._wrapper = this._target;

    this._viscount = 0

    return 1
  }

  function slideshow(target) {
    return new Slideshow(target)
  }

  Slideshow.prototype = {
      draw: function() {
        this._target

        this._wrapper = d3_updateable(this._target,".slideshow","div")
          .classed("slideshow",true)

        var self = this;

        this._slides = d3_splat(this._wrapper,".slide","div",this._data,function(x,i){ return i })
          .attr("class",function(x,i) {
            return (i == self._viscount) ? undefined : "hidden"
          })
          .classed("slide",true)

        return this
      }
    , next: function() {

        var self = this;

        var current = this._slides.filter(function(x){return !d3.select(this).classed("hidden")})
        var h = -current.node().clientHeight

        var t0 = current.transition()
          .duration(500)

        t0.style("margin-top",(h-15) + "px")
          .transition()
          .duration(500)

          .each("end",function(){
            current.style("margin-top",undefined)
            d3.select(this).classed("hidden",true)
          })


        self._viscount += 1;
        this._slides
          .attr("class",function(x,i) { 
            return (i == self._viscount) || ((i+1) == self._viscount) ? "slide" : "hidden slide" 
          })
          .classed("slide",true)
        
      }
    , previous: function() {

        var self = this;
        self._viscount -= 1;

        var previous = this._slides.filter(function(x,i){return i == self._viscount})
          .style("position","absolute")
          .style("top","-10000px")
          .classed("hidden",false)

        var h = -previous.node().clientHeight

        previous
          .style("position",undefined)
          .style("top",undefined)
          .classed("hidden",true)

        previous.style("margin-top",(h) + "px")
          .classed("hidden",false)

        var t0 = previous.transition()
          .duration(500)

        t0.style("margin-top",0 + "px")
          .each("end",function(){
            previous.style("margin-top",undefined)
            self._slides.filter(function(x,i){return (i-1) == self._viscount}).classed("hidden",true)
          })

        
      }
    , data: function(val) { return accessor$3.bind(this)("data",val) }
    , title: function(val) { return accessor$3.bind(this)("title",val) }
    , slides: function(val) { return accessor$3.bind(this)("slides",val) }

  }

  function accessor$4(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  function Button(target) {
    this._pane = target;
    return 1
  }

  function button(target) {
    return new Button(target)
  }

  Button.prototype = {
      draw: function() {
        this.render_button()

        return this
      }
    , render_button: render_button
    , button: function(val) { return accessor$4.bind(this)("button",val) }
    , click: function(val) { return accessor$4.bind(this)("click",val) }

  }

  var version = "0.0.1";

  exports.version = version;
  exports.codepeek = codepeek;
  exports.envelope = envelope;
  exports.stage = stage;
  exports.slideshow = slideshow;
  exports.button = button;

}));