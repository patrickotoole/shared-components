import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function render_description() {

  this._desc_wrapper = d3_updateable(this._wrapper,".envelope_description","div")
    .classed("envelope_description",true)
    .style("margin-bottom","30px")
    .html(this._description)

}
export default render_description;
