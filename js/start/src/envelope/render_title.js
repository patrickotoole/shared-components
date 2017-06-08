import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function render_title() {

  d3_updateable(this._wrapper,".envelope_title","h3")
    .classed("envelope_title",true)
    .text(this._title)

}
export default render_title;
