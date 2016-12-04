import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function render_code() {

  var w = this._wrapper.selectAll(".window")

  var c = d3_updateable(w,".window_content","div")
    .classed("window_content",true)

  var demo = d3_updateable(c,".codedemo","div")
    .classed("codedemo row",true)

  var demo_text = d3_updateable(demo,".codedemo_text","div")
    .classed("codedemo_text",true)

  var pre = d3_updateable(demo_text,"pre","pre")
  var pre = d3_updateable(pre,"code","code")
    .text(function(x){
      var all_pages = x.segments.filter(function(x){return x.segment_name.indexOf("All Pages") > -1})[0]
      return all_pages.segment_implemented
    })

  hljs.initHighlighting.called = false;
  hljs.initHighlighting();
}

export default render_code;
