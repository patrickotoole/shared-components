import accessor from '../helpers'
import time_series from '../timeseries'


function noop() {}


export function DomainExpanded(target) {
  this._on = {}
  this.target = target
}

function identity(x) { return x }
function key(x) { return x.key }


function domain_expanded(target) {
  return new DomainExpanded(target)
}

DomainExpanded.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , urls: function(val) {
      return accessor.bind(this)("urls",val) 
    }
  , draw: function() {

      var timing = d3_updateable(this.target,"div.timing","div",this.data())
        .classed("timing",true)
        .style("height","60px")
        .style("width","60%")
        .style("text-transform","uppercase")
        .style("font-weight","bold")
        .style("font-size",".9em")
        .style("margin-bottom","45px")
        .style("line-height","35px")
        .style("display","inline-block")
        .text("Articles Accessed")

      var details = d3_updateable(this.target,"div.details","div")
        .classed("details",true)
        .style("width","40%")
        .style("display","inline-block")
        .style("vertical-align","top")

      d3_updateable(details,"span","span")
        .style("text-transform","uppercase")
        .style("font-weight","bold")
        .style("font-size",".9em")
        .style("margin-bottom","10px")
        .style("line-height","35px")
        .text("Details")

      var articles = d3_updateable(this.target,"div.articles","div")
        .classed("articles",true)

      d3_updateable(articles,"span","span")
        .style("text-transform","uppercase")
        .style("font-weight","bold")
        .style("font-size",".9em")
        .style("margin-bottom","10px")
        .style("line-height","35px")
        .text("Top articles")
        
      var drawArticles = function(urls) {

        var a = d3_splat(articles,"div","div",urls)
          .text(String)
          .exit().remove()

      }

      var drawDetails = function(x) {

        var time = d3_updateable(details,".time","div",x)
          .classed("time",true)
          .text("Time: " + x.hour + ":" + (x.minute.length == 1 ? "0" + x.minute : x.minute ) )

        var button = d3_updateable(details,".button","a",false,function() { return 1})
          .classed("button",true)
          .style("padding","5px")
          .style("border-radius","5px")
          .style("border","1px solid #ccc")
          .style("margin","auto")
          .style("margin-top","10px")
          .style("display","block")
          .style("width","50px")
          .style("text-align","center")
          .text("Reset")
          .on("click",reset)

      }

      var reset = function() {
        details.selectAll(".time").remove()
        details.selectAll(".button").remove()

        drawArticles(this._urls.slice(0,10))
      }.bind(this)

      reset() 

      time_series(timing)
        .data({"key":"y","values":timing.data()[0]})
        .on("hover",function(x) {
          drawArticles(Object.keys(x.articles).slice(0,10))
          drawDetails(x)

        })
        .draw()

      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}
export default domain_expanded;
