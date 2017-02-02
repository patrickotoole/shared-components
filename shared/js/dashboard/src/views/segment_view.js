import accessor from '../helpers'
import header from '../generic/header'
import button_radio from '../generic/button_radio'
import select from '../generic/select'

import table from 'table'

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }


export function SegmentView(target) {
  this._on = {
    select: noop
  }
  this.target = target
}



export default function segment_view(target) {
  return new SegmentView(target)
}

SegmentView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , segments: function(val) {
      return accessor.bind(this)("segments",val) 
    }
  , draw: function() {

      var wrap = d3_updateable(this.target,".segment-wrap","div")
        .classed("segment-wrap",true)

      header(wrap).text("Segment").draw()      

      var body = d3_updateable(wrap,".body","div")
        .classed("body",true)
        .style("display","flex")
        .style("flex-direction","column")
        .style("margin-top","-15px")
        .style("margin-bottom","30px")





      var row1 = d3_updateable(body,".row-1","div")
        .classed("row-1",true)
        .style("flex",1)
        .style("display","flex")
        .style("flex-direction","row")


      var row2 = d3_updateable(body,".row-2","div")
        .classed("row-2",true)
        .style("flex",1)
        .style("display","flex")
        .style("flex-direction","row")


      var inner = d3_updateable(row1,".action.inner","div")
        .classed("inner action",true)
        .style("flex","1")
        .style("display","flex")
        .style("padding","10px")
.style("padding-bottom","0px")

        .style("margin-bottom","0px")

      var inner_desc = d3_updateable(row1,".action.inner-desc","div")
        .classed("inner-desc action",true)
        .style("flex","1")
        .style("padding","10px")
.style("padding-bottom","0px")

        .style("display","flex")
        .style("margin-bottom","0px")


      d3_updateable(inner,"h3","h3")
        .text("Choose Base")
.style("margin","0px")
        .style("line-height","32px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("text-transform","uppercase")
        .style("flex","1")
.style("background","#e3ebf0")
.style("padding-left","10px")
.style("margin-right","10px")
.style("margin-top","2px")
.style("margin-bottom","2px")


d3_updateable(inner,"div.color","div")
  .classed("color",true)
  .style("background-color","#081d58")
  .style("width","10px")
  .style("height","32px")
  .style("margin-top","2px")
  .style("margin-right","10px")
  .style("margin-left","-10px")






      select(inner)
        .options(this._segments)
        .on("select", this.on("change") )
        .draw()


      var inner2 = d3_updateable(row2,".comparison.inner","div")
        .classed("inner comparison",true)
        .style("flex","1")
        .style("padding","10px")
.style("padding-bottom","0px")

        .style("display","flex")

      var inner_desc2 = d3_updateable(row2,".comparison-desc.inner","div")
        .classed("inner comparison-desc",true)
        .style("flex","1")
        .style("padding","10px")
.style("padding-bottom","0px")

        .style("display","flex")

      d3_updateable(inner_desc,"h3","h3")
        .text("(Filters applied to this segment)")
        .style("margin","10px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("text-transform","uppercase")
        .style("flex","1")





      d3_updateable(inner2,"h3","h3")
        .text("Compare To")
        .style("line-height","32px")
        .style("margin","0px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("flex","1")
        .style("text-transform","uppercase")
.style("background","#e3ebf0")
.style("padding-left","10px")
.style("margin-right","10px")
.style("margin-top","2px")
.style("margin-bottom","2px")


d3_updateable(inner2,"div.color","div")
  .classed("color",true)
  .style("background-color","grey")
  .style("width","10px")
  .style("height","32px")
  .style("margin-top","2px")
  .style("margin-right","10px")
  .style("margin-left","-10px")









      select(inner2)
        .options(this._segments)
        .on("select", this.on("comparison.change") )
        .draw()


      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}

