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
    .html("<div class='codepeek_text'>Implementing Rockerbox is simple.<br><br><b>First,</b> place the pixel on all pages of your website.<br><br><b>Then,</b> click validate to ensure its collecting information from your site.</div>")

  this._right_wrapper = d3_updateable(cp_row,".right","div")
    .classed("codepeek_aside right pull-right",true)
    .style("width","25%")
    .style("padding","25px")
    .html("<div class='codepeek_text'>Create your first segment by following our <a >Quickstart Guide</a><br><br>" +
      "Take a tour of our <a>Insights Modules</a> and start crafting content.<br/><br/>" + 
      "Read through our <a>Implementation Guide</a> to track custom events and insights" + 
      "</div>"
    )

  this._stage = cp_row

  return cp_row



  
}
export default render_row;
