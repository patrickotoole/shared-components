import accessor from './helpers'
var EXAMPLE_DATA = {
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

export function Table(target) {
  this._target = target;
  this._data = EXAMPLE_DATA
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

export default function table(target) {
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
