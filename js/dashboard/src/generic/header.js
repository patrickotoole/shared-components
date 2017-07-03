import {d3_updateable, d3_splat} from 'helpers'
import accessor from '../helpers'
import select from './select'

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }

function injectCss(css_string) {
  d3_updateable(d3.select("head"),"style#header-css","style")
    .attr("id","header-css")
    .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))
}

function buttonWrap(wrap) {
  var head = d3_updateable(wrap, "h3.buttons","h3")
    .classed("buttons",true)
    .style("margin-bottom","15px")
    .style("margin-top","-5px")

  var right_pull = d3_updateable(head,".pull-right","span")
    .classed("pull-right header-buttons", true)
    .style("margin-right","17px")
    .style("line-height","22px")
    .style("text-decoration","none !important")

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


export function Header(target) {
  this._on = {}
  this.target = target

  var CSS_STRING = String(function() {/*
    .header-buttons a span.hover-show { display:none }
    .header-buttons a:hover span.hover-show { display:inline; padding-left:3px }
  */})
  
}

function header(target) {
  return new Header(target)
}

Header.prototype = {
    text: function(val) {
      return accessor.bind(this)("text",val) 
    }
  , options: function(val) {
      return accessor.bind(this)("options",val) 
    }
  , buttons: function(val) {
      return accessor.bind(this)("buttons",val) 
    }
  , expansion: function(val) {
      return accessor.bind(this)("expansion",val) 
    }
  , draw: function() {
      var wrap = d3_updateable(this.target, ".header-wrap","div")
        .classed("header-wrap",true)

      var expand_wrap = expansionWrap(wrap)
        , button_wrap = buttonWrap(wrap)
        , head_wrap = headWrap(wrap)

      d3_updateable(head_wrap,"span.title","span")
        .classed("title",true)
        .text(this._text)

      if (this._options) {

        var bound = this.on("select").bind(this)

        var selectBox = select(head_wrap)
          .options(this._options)
          .on("select",function(x) { bound(x) })
          .draw()

        selectBox._select
          .style("width","19px")
          .style("margin-left","12px")
          
        selectBox._options
          .style("color","#888")
          .style("min-width","100px")
          .style("text-align","center")
          .style("display","inline-block")
          .style("padding","5px")
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
          .on("click",x => this.on(x.class + ".click")(x))


      }

      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}
export default header;
