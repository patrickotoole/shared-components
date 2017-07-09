import {d3_updateable, d3_splat, d3_class, D3ComponentBase} from 'helpers'
import header from '../../generic/header'
import table from 'table'

import refine_relative from './refine_relative'
import {categoryWeights, computeScale} from './relative_timing_process'
import {timingHeaders} from './relative_timing_constants'

import {drawStream} from '../summary/before_and_after'
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
      , filtered = data.filter(function(x){ return x.selected})
      , selected = filtered.length ? filtered[0] : data[0]

    var wrap = d3_class(this._target,"summary-wrap")

    header(wrap)
      .text(selected.key)
      .options(data)
      .on("select", function(x) { this.on("select")(x) }.bind(this))
      .draw()


    var bawrap = d3_class(wrap,"ba-row")

    const sorted_tabular = selected.values.filter(x => x.key != "")
      .slice(0,1000)

    const oscale = computeScale(sorted_tabular)
    const headers = [{"key":"key", "value":selected.key.replace("Top ","")}].concat(timingHeaders)

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
