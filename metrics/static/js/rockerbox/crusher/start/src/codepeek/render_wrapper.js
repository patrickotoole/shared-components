import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function make_wrap(row,data) {
  
  var cp = d3_updateable(row,".codepeek_content","div",data)
    .classed("w-tab-content codepeek_content",true)

  var tab = d3_updateable(cp,".w-tab-pane","div")
    .classed("w-tab-pane w--tab-active",true)

  var w = d3_updateable(tab,".window","div")
    .classed("window window-dark",true)

  return cp
}

function render_wrapper() {

  var row = this._target
  var data = this.data()

  this._wrapper = make_wrap(row,data)
  
}
export default render_wrapper;
