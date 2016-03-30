import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function make_wrap(row,data) {
  
  var e = d3_updateable(row,".validated.envelope","div",data)
    .classed("pull-left envelope validated",true)
    .style("width","50%")
    .style("margin-bottom","50px")
    .style("margin-left","auto")
    .style("margin-right","auto")

  d3_updateable(e,".envelope_gradient","div")
    .classed("envelope_gradient",true)

  var f = d3_updateable(e,".envelope_form","div")
    .classed("w-form envelope_form",true)

  return f
 
}

function render_wrapper() {

  var row = this._target
  var data = this.data()

  this._wrapper = make_wrap(row,data)
  var outer = d3_updateable(this._target,".btn-outer-wrap","div") // for the button
    .classed("btn-wrap",true)
    .style("width","50%")
    .style("text-align","center")
    .style("float","left")
    .style("margin-top","-50px")


  this._pane = d3_updateable(outer,".btn-wrap","div")
    .style("width","100%")
  
}
export default render_wrapper;
