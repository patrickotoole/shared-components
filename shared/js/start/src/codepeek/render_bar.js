import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function render_bar() {

  var w = this._wrapper.selectAll(".window")

  var bar = d3_updateable(w,".window_bar","div")
    .classed("window_bar window_bar-dark",true)

  var buttons = d3_splat(bar,".window_bar_button","div",[{},{},{}],function(d,i){return i})
    .classed("window_bar_button window_bar_button-dark",true)

}
export default render_bar;
