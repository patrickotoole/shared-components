import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function make_wrap(row,data) {
  
  return d3_updateable(row,".row","div",data)
    .attr("style","padding-bottom:15px;padding-top:5px")
    .classed("row",true)

}

function render_wrapper() {

  var row = this._target
  var data = this.data()

  this._wrapper = make_wrap(row,data)
  
}
export default render_wrapper;
