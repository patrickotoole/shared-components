import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function make_envelope(tab) {
  
  return d3_updateable(tab,".envelope","div")
    .classed("envelope",true)
    .style("width","inherit")
    .style("margin","none")
    .style("background","none")
    .style("text-align","center")

}

function make_button(e) {
  var form_button = d3_updateable(e,".form_button","div")
    .classed("form_button",true)

  return d3_updateable(form_button,".button","input")
    .attr("type","button")
    .attr("value","validate")
    .classed("w-button button button-blue",true)
}

function render_button() {

  var tab = this._wrapper.selectAll(".w-tab-pane")
    , env = make_envelope(tab)
    , button = make_button(env)

  button.on("click",this._click)


}

export default render_button;
