import {d3_class, d3_updateable, d3_splat} from '@rockerbox/helpers'
import accessor from '../helpers'
import select from './select'
import d3 from 'd3';

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }

function injectCss(css_string) {
  d3_updateable(d3.select("head"),"style#header-css","style")
    .attr("id","header-css")
    .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))
}

function buttonWrap(wrap) {
  var head = d3_updateable(wrap, ".buttons")
    .classed("buttons",true)
    .style("line-height","36px")
    .style("padding-top","10px")
    .style("color","black")



  var right_pull = d3_updateable(head,".pull-right","span")
    .classed("pull-right header-buttons", true)
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

  , navigation: function(val) {
      return accessor.bind(this)("navigation",val) 
    }

  , select_only: function(val) {
      return accessor.bind(this)("select_only",val) 
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
        .classed("header-wrap semantic-base",true)

      var expand_wrap = expansionWrap(wrap)
        , button_wrap = buttonWrap(wrap)
        , head_wrap = headWrap(wrap)

      if (this._select_only) {
        var bound = this.on("select").bind(this)

        

        var selectBox = select(head_wrap)
          .options(this._options)
          .on("select",function(x) { bound(x) })
          .draw()

        return
      }

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

        
        if (this._navigation) {

          head_wrap.remove()

          var nav = wrap.selectAll(".buttons")
            .style("font-family", "Lato, sans-serif")

          var breadcrumb = d3_class(nav,"breadcrumb")
            .classed("ui big breadcrumb",true)

          var crumb = d3_splat(breadcrumb,"span","span",this._navigation)
          d3_class(crumb,"section")
            .text(String)
          d3_class(crumb,"divider","i")
            .attr("aria-hidden","true")
            .classed("right angle icon divider",true)

          d3_class(nav,"nav_divider")
            .classed("ui divider",true)
            

        }

          

        var self = this;

        var a = d3_splat(button_wrap,"a","a",this._buttons, function(x) { return x.text })
          .html(x => "<span class='" + x.icon + "'></span><span style='padding-left:3px'>" + x.text + "</span>")
          .attr("class",x => x.class + " " + x.color)
          .classed("ui basic button",true)
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
