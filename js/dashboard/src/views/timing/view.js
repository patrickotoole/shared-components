import d3 from 'd3'
import {d3_updateable, d3_splat, d3_class, D3ComponentBase, noop} from '@rockerbox/helpers'
import header from '../../generic/header'
import select from '../../generic/select'
import data_selector from '../../generic/data_selector'

import object_selector from '../../generic/object_selector'


import table from '@rockerbox/table'
import * as timeseries from '../../generic/timeseries'
import {domain_expanded} from '@rockerbox/component'
import {simpleTimeseries} from '@rockerbox/chart'

import {hourbuckets, timingHeaders} from './timing_constants'
import {
  percentColumns, 
  percentDiffColumn, 
  normalizeColumn, 
  normalizeRowSimple, 
  percentRowSimple, 
  percentDiffRow, 
  computeScale, 
  normalizeRow
} from './timing_process'



import './timing.css'

const formatName = function(x) {

  if (x < 0) x = -x

  if (x == 3600) return "1 hr"
  if (x < 3600) return x/60 + " mins" 

  if (x == 86400) return "1 day"
  if (x > 86400) return x/86400 + " days" 

  return x/3600 + " hrs"
}

export default function timing(target) {
  return new Timing(target)
}

class Timing extends D3ComponentBase {
  constructor(target) {
    super(target)
  }

  props() { return ["data","transform", "sort", "ascending", "top"] }


  draw() {

    var self = this
    var data = this._data
      , filtered = data.filter(function(x){ return x.selected})
      , selected = filtered.length ? filtered[0] : data[0]


    var wrap = d3_class(this._target,"timing-wrap")



    const headers = [{key:"key",value:selected.key.replace("Top ","")}].concat(timingHeaders)
    const d = data[0].values//timingTabular(data.full_urls)

    const _default = "total"
    const s = this.sort() 
    const asc = this.ascending() 


    const selectedHeader = headers.filter(x => x.key == s)
    const sortby = selectedHeader.length ? selectedHeader[0].key : _default

    const hourlyTotals = selected.values.reduce((p,c) => {
      timingHeaders.map(k => {
        var h = k.key
        p[h] = (p[h] || 0) + (c[h] || 0)
      })
      return p
    },{})

    const overallTotal = d3.sum(Object.keys(hourlyTotals).map(k => hourlyTotals[k]))
    const percentTotals = Object.keys(hourlyTotals).reduce((p,k) => {
      p[k] = hourlyTotals[k]/overallTotal
      return p
    },{})

    const rowValue = selected.values.map(x => Math.sqrt(1 + x.total) )
    const normalizer = normalizeRow(percentTotals)

    const percentCol = percentColumns(selected.values)
    //const diffCol = percentDiffColumn(selected.values)
    const normCol = normalizeColumn(selected.values)


    const diffRow = percentDiffRow(selected.values)


    var max = 0
      , min = Infinity 

    const values = selected.values.map((row,i) => {
      
      const normed = 
        this.transform() == "normalize" ? normalizer(row,rowValue[i]) : 
        this.transform() == "percent_h" ? percentRowSimple(row): 
        this.transform() == "percent_diff_h" ? normalizeRowSimple(row): 
        this.transform() == "percent_v" ? percentCol(row): 
        this.transform() == "percent_diff_v" ? normCol(row) : 
        this.transform() == "percent_diff_pop" ? diffRow(row) : 

        //this.transform() == "percent_diff_pop_v" ? diffCol(row) : 
        //this.transform() == "percent_diff_pop_h" ? diffRow(row): 
        row


      const local_max = d3.max(timingHeaders.map(x => x.key).map(k => normed[k]))
      max = local_max > max ? local_max : max

      const local_min = d3.min(timingHeaders.map(x => x.key).map(k => normed[k]))
      min = local_min < min ? local_min : min

      return Object.assign(normed,{"key":row.key})
    })

    console.log("MAX",max)
    const oscale = computeScale(values,max)
    const noscale = computeScale(values,Math.abs(min))



    //header(wrap)
    //  .text("Timing")
    //  .draw()


    var ts = d3_class(wrap,"timeseries-row")

    var OPTIONS = [
          {"key":"Activity","value":false}
        , {"key":"Scored","value":"normalize"}
        , {"key":"Percent (column)","value":"percent_v"}
        , {"key":"Percent (row)","value":"percent_h"}

        , {"key":"Mean Diff Percent (column)","value":"percent_diff_v"}
        , {"key":"Mean Diff Percent (row)","value":"percent_diff_h"}

        , {"key":"Percent Diff","value":"percent_diff_pop"}
        //, {"key":"Percent Diff (column)","value":"percent_diff_pop_v"}
        //, {"key":"Percent Diff (row)","value":"percent_diff_pop_h"}

      ]

      function toggleValues(x) {
        timingwrap.classed("show-values",this.checked)
      }

    data_selector(ts)
      .datasets(data)
      .transforms(OPTIONS)
      .selected_transform(this.transform())
      .on("toggle.values", toggleValues )
      .on("transform.change", this.on("transform.change") )
      .on("dataset.change", x => { this.on("select")(x) })
      .draw()


    var svg = d3_updateable(ts,"svg","svg").attr("width",744).attr("height",80)

    var totals = timingHeaders.map(h => {
      return hourlyTotals[h.key]
    })

    var sts = simpleTimeseries(svg,totals,744,80,-1)

    object_selector(sts)
      .selectAll("rect")
      .key((x,i) => timingHeaders[i].key)
      .on("mouseout",function(key,selections) {

        timingwrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-time", false)

      })
      .on("interact",function(key,selections) {

        var tr = timingwrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-time", function(x) { 
            var bool = selections.filter(s => { return x[s] != undefined && x[s] != "" }) 
            return !bool.length 
          })

      })
      .draw()


    var timingwrap = d3_class(wrap,"timing-row")
    var selectedKey = selected.key == "Top Domains" ? "domain" : "parent_category_name"


    var table_obj = table(timingwrap)
      .top(this.top())
      .headers(headers)
      .render("key", selected.key != "Time to Site" ? false : function(x){ 
        var k = this.parentNode.__data__.key
        var stage = this.parentNode.__data__.stage
        stage = stage == "Baseline" ? "" : " (" + stage + ") "

        this.innerText = formatName(k) + ((k < 0) ? " after" : " before") + stage
      })
      .sort(sortby,asc)
      .on("sort", this.on("sort"))
      .data({"values":values.slice(0,500)})
      .skip_option(true)
      .on("expand",function(d,td) {

        var dd = data[0].data.filter(function(x) { return x[selectedKey] == d.key })
        var rolled = timeseries.prepData(dd)
        

        if (selectedKey == "domain") {

          domain_expanded(td)
            .domain(dd[0].domain)
            .raw(dd)
            .data(rolled)
            .on("stage-filter", self.on("stage-filter") )
            .draw()

        }

        if (selectedKey == "parent_category_name") {
          domain_expanded(td)
            .domain("/")
            .use_domain(true)
            .raw(dd)
            .data(rolled)
            .on("stage-filter", self.on("stage-filter") )
            .draw()
        }

      })
      .on("draw",function() {



        var trs = this._target.selectAll("tr").selectAll("td:not(:first-child)")
          .style("background-color",function(x) {
            var value = this.parentNode.__data__[x['key']] || 0
            var slug = value > 0 ? "rgba(70, 130, 180," : "rgba(244, 109, 67,"
            if (value > 0) {
              value = Math.abs(value)
              return slug + oscale(Math.log(value+1)) + ")"
            } else {
              value = Math.abs(value)
              return slug + (noscale(Math.log(value+1))*.8) + ")"
            }
          })
        if (self.transform() == "percent") 
          trs.text(function(x) {
            var value = this.parentNode.__data__[x['key']] || 0
            var f = d3.format(".1%")(value/100)

            f = f.length > 4 ? f.slice(0,2) : f.slice(0,-1)
            return f + "%"
          })
      })
      .draw()
    
  }
}
