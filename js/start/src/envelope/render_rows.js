import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function render_rows() {

  var row = d3_splat(this._wrapper,".grey_row","div",this._data.reverse().slice(0,5),function(x){return x.timestamp})
    .classed("grey_row pricing_summary row",true)

  d3_updateable(row,".date","div")
    .classed("date pull-left ",true)
    .text(function(x){return x.timestamp})

  d3_updateable(row,".pull-right","div")
    .classed("pull-right",true)
    .text(function(x){return JSON.parse(x.json_body).referrer })



}
export default render_rows;
