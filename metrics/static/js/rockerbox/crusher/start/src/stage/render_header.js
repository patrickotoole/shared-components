import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function render_header() {

  d3_updateable(this._wrapper,".section_title","h2")
      .classed("section_title",true)
      .text(this._title)

  d3_updateable(this._wrapper,".section_sep","div")
    .classed("section_sep",true)

  d3_updateable(this._wrapper,".section_subtitle","div")
    .classed("section_subtitle",true)
    .text(this._subtitle)

  
}
export default render_header;
