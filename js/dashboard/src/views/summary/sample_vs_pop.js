import {d3_class, d3_updateable, d3_splat} from 'helpers'
import pie from '../../generic/pie'

export function buildSummaryBlock(data, target, radius_scale, x) {
  var data = data
    , dthis = d3_class(d3.select(target),"pie-summary-block")

  pie(dthis)
    .data(data)
    .radius(radius_scale(data.population))
    .draw()

  var fw = d3_class(dthis,"fw")
    .classed("fw",true)

  var fw2 = d3_class(dthis,"fw2")
    .text(d3.format("%")(data.sample/data.population))

  d3_class(fw,"sample","span")
    .text(d3.format(",")(data.sample))

  d3_class(fw,"vs","span")
    .html("<br> out of <br>")
    .style("font-size",".88em")

  d3_class(fw,"population","span")
    .text(d3.format(",")(data.population))

}
