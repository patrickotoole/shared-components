import {identity, d3_updateable, d3_splat, d3_class, D3ComponentBase} from 'helpers'
import header from '../../generic/header'
import select from '../../generic/select'

import table from 'table'

import refine_relative from './refine_relative'
import {categoryWeights, computeScale, normalizeRow, normalize, totalsByTime} from './relative_timing_process'
import {timingHeaders, timeBuckets} from './relative_timing_constants'

import {drawStream} from '../summary/before_and_after'
import {simpleTimeseries} from 'chart'

import timeseries from '../../generic/timeseries'


import './relative_timing.css'

export default function relative_timing(target) {
  return new RelativeTiming(target)
}

class RelativeTiming extends D3ComponentBase {
  constructor(target) {
    super(target)
  }

  props() { return ["data","normalize", "sort", "ascending"] }

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

    var totals_by_time= totalsByTime(selected.values)
    var values = normalize(totals_by_time)

    var ts = d3_class(wrap,"timeseries-row")

    var transform_selector = d3_class(ts,"transform")

    select(transform_selector)
      .options([{"key":"Activity","value":false},{"key":"Normalized","value":"normalize"}])
      .on("select", function(x){
        self.on("transform.change").bind(this)(x)
      })
      .draw()

    var toggle = d3_class(transform_selector,"show-values")



    d3_updateable(toggle,"span","span")
      .text("show values? ")

    d3_updateable(toggle,"input","input")
      .attr("type","checkbox")
      .on("change",function(x) {
        bawrap.classed("show-values",this.checked)
      })


    

    var svg = d3_updateable(ts,"svg","svg").attr("width",682).attr("height",80)
      .style("display","inline-block")

    simpleTimeseries(svg,values,682,80,-2)




    var bawrap = d3_class(wrap,"ba-row")


    const sorted_tabular = selected.values.filter(x => x.key != "")
      .map(this.normalize() ? normalizeRow : identity)
      .slice(0,1000)

    const oscale = computeScale(sorted_tabular)
    const headers = [{"key":"key", "value":selected.key.replace("Top ","")}].concat(timingHeaders)


    const _default = "600"
    const s = this.sort() 
    const asc = this.ascending() 


    const selectedHeader = headers.filter(x => x.key == s)
    const sortby = selectedHeader.length ? selectedHeader[0].key : _default

    table(bawrap)
      .top(140)
      .headers(headers)
      .sort(sortby,asc)
      .on("sort", this.on("sort"))
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
