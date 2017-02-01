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

      header(wrap)
        .text("Choose Segment")
        .draw()

      var body = d3_updateable(wrap,".body","div")
        .classed("body",true)
        .style("padding-left","10px")
        .style("padding-bottom","20px")


      var inner = d3_updateable(body,".inner","div")
        .classed("inner",true)

      select(inner)
        .options(this._segments)
        .on("select", this.on("change") )
        .draw()

      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}

