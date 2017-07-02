import {d3_class, d3_updateable, d3_splat} from 'helpers'
import pie from '../../generic/pie'

export function buildSummaryBlock(data, target, radius_scale, x) {
  var data = data
    , dthis = d3.select(target)

  pie(dthis)
    .data(data)
    .radius(radius_scale(data.population))
    .draw()

  var fw = d3_updateable(dthis,".fw","div",false,function() { return 1 })
    .classed("fw",true)
    .style("width","50px")
    .style("display","inline-block")
    .style("vertical-align","top")
    .style("padding-top","3px")
    .style("text-align","center")
    .style("line-height","16px")

  var fw2 = d3_updateable(dthis,".fw2","div",false,function() { return 1 })
    .classed("fw2",true)
    .style("width","60px")
    .style("display","inline-block")
    .style("vertical-align","top")
    .style("padding-top","3px")
    .style("text-align","center")
    .style("font-size","22px")
    .style("font-weight","bold")
    .style("line-height","40px")
    .text(d3.format("%")(data.sample/data.population))



  d3_updateable(fw,".sample","span").text(d3.format(",")(data.sample))
    .classed("sample",true)
  d3_updateable(fw,".vs","span").html("<br> out of <br>").style("font-size",".88em")
    .classed("vs",true)
  d3_updateable(fw,".population","span").text(d3.format(",")(data.population))
    .classed("population",true)

}
