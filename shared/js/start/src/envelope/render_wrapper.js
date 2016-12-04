import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function make_wrap(row,data) {
  
  var e = d3_updateable(row,".validated.envelope","div",data)
    .classed("pull-left envelope validated",true)
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
  var outer = d3_updateable(this._target,".btn-wrap","div") // for the button
    .classed("btn-wrap",true)
    .style("text-align","center")
    .style("margin-top","-50px")
    .style("margin-left","auto")
    .style("margin-right","auto")




  this._pane = d3_updateable(outer,".btn-wrap-2","div")
    .classed("btn-wrap-2",true)
    .style("width","100%")
  
}
export default render_wrapper;
