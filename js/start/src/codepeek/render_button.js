import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function make_envelope(tab) {
  
  return d3_updateable(tab,".envelope.btn-evn","div")
    .classed("envelope btn-env",true)
    .style("margin","none")
    .style("background","none")
    .style("text-align","center")

}

function make_button(e,t) {
  var form_button = d3_updateable(e,".form_button","div")
    .classed("form_button",true)

  return d3_updateable(form_button,".button","input")
    .attr("type","button")
    .attr("value",t)
    .classed("w-button button button-blue",true)
}

function render_button() {

  var env = make_envelope(this._pane)
    , button = make_button(env,this._button || "validate")

  button.on("click",this._click)


}

export default render_button;
