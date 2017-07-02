import {d3_updateable, d3_splat, d3_class, D3ComponentBase} from 'helpers'
import header from '../generic/header'
import table from 'table'

import refine_relative from './refine_relative'
import {categoryWeights, beforeAndAfterTabular} from './relative_timing_process'
import {timingHeaders} from './relative_timing_constants'

import {drawStream} from './summary_view'
import {simpleTimeseries} from 'chart'

import './relative_timing.css'

export default function relative_timing(target) {
  return new RelativeTiming(target)
}

class RelativeTiming extends D3ComponentBase {
  constructor(target) {
    super(target)
  }

  props() { return ["data"] }

  draw() {

    var self = this
    var data = this._data
    var wrap = d3_class(this._target,"summary-wrap")

    header(wrap)
      .text("Before and After")
      .draw()

    var bawrap = d3_class(wrap,"ba-row")

    try {
      var stages = drawStream(bawrap,this._data.before_categories,this._data.after_categories)
      //bawrap.selectAll(".before-stream").remove() // HACK
    } catch(e) {
      bawrap.html("")
      return
    }

    const weights = categoryWeights(data.before_categories)
    const sorted_tabular = beforeAndAfterTabular(data.before,data.after,weights)
      .slice(0,1000)

    const oscale = computeScale(sorted_tabular)
    const headers = [{"key":"domain", "value":"Domain"}].concat(timingHeaders)

    table(bawrap)
      .top(140)
      .headers(headers)
      .on("expand",function(d,td) {

        refine_relative(td)
          .data(d)
          .domain(d.domain)
          .stages(stages)
          .before_urls(data.before.filter(y => y.domain == d.domain) )
          .after_urls(data.after.filter(y => y.domain == d.domain))
          .on("stage-filter",self.on("stage-filter"))
          .draw()

      })
      .on("draw",function() {
        this._target.selectAll("th")
          .selectAll("span")
          .classed("less-than", (x) => { return parseInt(x.key) == x.key && x.key < 0 })
          .classed("greater-than", (x) => { return parseInt(x.key) == x.key && x.key > 0 })

        this._target.selectAll(".table-option")
          .style("display","none")

        this._target.selectAll("tr").selectAll("td:not(:first-child)")
          .style("border-right","1px solid white")
          .style("padding-left","0px")
          .style("text-align","center")
          .style("background-color",function(x) {
            var value = this.parentNode.__data__[x['key']] || 0
            return "rgba(70, 130, 180," + oscale(Math.log(value+1)) + ")"
          })     
      })
      .option_text("<div style='width:40px;text-align:center'>&#65291;</div>")
      .data({"values":sorted_tabular})
      .draw()

  }
}
