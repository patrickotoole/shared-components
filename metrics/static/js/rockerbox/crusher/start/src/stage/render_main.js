import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function render_row() {

  this._wrapper

  var cp_row = d3_updateable(this._wrapper,".codepeek_row","div")
    .classed("codepeek_row row col-md-10",true)
    .style("margin-left","8.3%")
    .style("margin-right","8.3%")
    .style("overflow","hidden")

  this._left_wrapper = d3_updateable(cp_row,".left","div")
    .classed("codepeek_aside left pull-left",true)
    .style("width","25%")
    .style("min-height","600px")
    .style("padding","25px")
    .html(this._left)

  this._right_wrapper = d3_updateable(cp_row,".right","div")
    .classed("codepeek_aside right pull-right",true)
    .style("width","25%")
    .style("padding","25px")
    .html(this._right)

  this._stage = cp_row

  return cp_row



  
}
export default render_row;
