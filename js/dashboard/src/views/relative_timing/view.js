import {noop, identity, d3_updateable, d3_splat, d3_class, D3ComponentBase} from '@rockerbox/helpers'
import header from '../../generic/header'
import select from '../../generic/select'
import data_selector from '../../generic/data_selector'
import object_selector from '../../generic/object_selector'



import table from '@rockerbox/table'

import refine_relative from './refine_relative'
import {categoryWeights, computeScale, normalizeRowSimple, normalizeRow, normalize, totalsByTime, normalizeByColumns, normalizeByCategory} from './relative_timing_process'
import {timingHeaders, timeBuckets} from './relative_timing_constants'
import {drawStream, drawStreamSkinny} from '../summary/before_and_after'
import {simpleTimeseries} from '@rockerbox/chart'

import timeseries from '../../generic/timeseries'


import './relative_timing.css'

export default function relative_timing(target) {
  return new RelativeTiming(target)
}

class RelativeTiming extends D3ComponentBase {
  constructor(target) {
    super(target)
  }

  props() { return ["data","transform", "sort", "ascending","top"] }

  draw() {

    var self = this
    var data = this._data
      , filtered = data.filter(function(x){ return x.selected})
      , selected = filtered.length ? filtered[0] : data[0]

    var wrap = d3_class(this._target,"summary-wrap")

    header(wrap)
      .text("Before and After")
      .draw()


    var totals_by_time= totalsByTime(selected.values)
    var values = normalize(totals_by_time)

    function toggleValues(x) {
      bawrap.classed("show-values",this.checked)
    }

    this.on("toggle.values",toggleValues)

    var ts = d3_class(wrap,"timeseries-row")
      .style("padding-bottom",selected.key == "Top Categories" ? "0px" : null)

    var OPTIONS = [
          {"key":"Activity","value":false}
        , {"key":"Intent Score","value":"normalize"}
        , {"key":"Importance","value":"importance"}
        , {"key":"Percentage","value":"percent"}
        , {"key":"Percent Diff","value":"percent_diff"}
      ]

    data_selector(ts)
      .datasets(data)
      .transforms(OPTIONS)
      .selected_transform(this.transform())
      .on("toggle.values", this.on("toggle.values") )
      .on("transform.change", this.on("transform.change") )
      .on("dataset.change", x => { this.on("select")(x) })
      .draw()

    var details = d3_class(ts.selectAll(".transform"),"details-wrap","svg")
      .style("width","255px")
      .style("height","150px")
      .style("display",selected.key == "Top Categories" ? "none" : "inline-block")
      .style("margin-top","20px")

    var stream_wrap = d3_class(ts,"stream-wrap")
      .style("width","682px")
      .style("height",selected.key == "Top Categories" ? "100px" : "390px")


    var stages = drawStreamSkinny(stream_wrap,selected.data.before_categories,selected.data.after_categories,noop)

    stream_wrap.selectAll(".before-stream")
      .style("display",selected.key == "Top Categories" ? "none" : null)


    var time_wrap = d3_class(stream_wrap,"time-wrap")

    object_selector(stream_wrap)
      .selectAll("path")
      .key((x,i) => { return x[0].key })
      .on("mouseout",function(key,selections) {
        stream_wrap
          .selectAll("path")
          .style("opacity","1")

        bawrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-category", false)

      })
      .on("click",function(key,selections) {

        stream_wrap
          .selectAll("path")
          .filter(x => {
            if (!x[0]) return false
            var k = x[0].key

            var bool = selections
              .filter(s => { return k == s})
              .map(x => x)

            return bool.length
          })
          .classed("selected",true)


      })
      .on("interact",function(key,selections) {

        stream_wrap.selectAll("path")
          .style("opacity","1")
          .filter(x => {
            if (!x[0]) return false

            var bool = selections
              .filter(s => { return x[0].key == s})
              .map(x => x)

            return !bool.length
          })
          .style("opacity",".6")

        bawrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-category", function(x) { 
            var bool =  selections.indexOf(x.parent_category_name) > -1
            return !bool
          })

        const cat_wrap = d3_class(details,"cat","g")
        d3_class(cat_wrap,"title","text").text("Categories Selected:")
          .style("font-weight","bold")
          .style("text-transform","uppercase")
          .attr("y", 15)


        var cats = d3_updateable(cat_wrap,".cats","g",selections,x => 1)
          .classed("cats",true)


        var cat = cats.selectAll(".cat")
          .data(x => x)

        cat
          .enter()
          .append("text")
          .classed("cat",true)
          .attr("x",15)
          .attr("y",(x,i) => 30 + (i+1)*15)

        cat
          .text(String)
        
        cat.exit().remove()

        


      })
      .draw()




    var svg = d3_updateable(time_wrap,"svg","svg")
      .attr("width",682).attr("height",80)
      .style("display","inline-block")
      .style("vertical-align","bottom")
      .style("margin-bottom","15px")



    var sts = simpleTimeseries(svg,values,682,80,-2)

    object_selector(sts)
      .selectAll("rect")
      .key((x,i) => timeBuckets[i])
      .on("mouseout",function(key,selections) {

        bawrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-time", false)

      })
      .on("interact",function(key,selections) {

        var tr = bawrap.selectAll("tbody")
          .selectAll("tr")
          .classed("hide-time", function(x) { 
            var bool = selections.filter(s => { return x[s] != undefined && x[s] != "" }) 
            return !bool.length 
          })

      })
      .draw()


    const categories = data[0].data.category.reduce((p,c) => {
      p[c.key] = c
      return p
    },{})

    var bawrap = d3_class(wrap,"ba-row")
      .style("min-height","600px")

    var normByCol = normalizeByColumns(selected.values)

    const sorted_tabular = selected.values.filter(x => x.key != "")
      .map(
        this.transform() == "normalize" ?  normalizeRow : 
        this.transform() == "percent" ? normByCol : 
        this.transform() == "percent_diff" ? row => normalizeRowSimple( normByCol(row) ) : 
        this.transform() == "importance" && selected.key.indexOf("Cat") == -1 ? normalizeByCategory(categories) : 
        identity
      )
      .slice(0,1000)

    const oscale = computeScale(sorted_tabular)
    const headers = [{"key":"key", "value":selected.key.replace("Top ","")}].concat(timingHeaders)


    const _default = "600"
    const s = this.sort() 
    const asc = this.ascending() 


    const selectedHeader = headers.filter(x => x.key == s)
    const sortby = selectedHeader.length ? selectedHeader[0].key : _default



    table(bawrap)
      .top(this.top())
      .headers(headers)
      .sort(sortby,asc)
      .on("sort", this.on("sort"))
      .on("expand",function(d,td) {

        let _data = data[0].data

        refine_relative(td)
          .data(d)
          .domain(d.key)
          .stages(stages)
          .before_urls(_data.before.filter(y => y.domain == d.key) )
          .after_urls(_data.after.filter(y => y.domain == d.key))
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

        var trs = this._target.selectAll("tr").selectAll("td:not(:first-child)")
          .style("border-right","1px solid white")
          .style("padding-left","0px")
          .style("text-align","center")
          .style("background-color",function(x) {

            var value = this.parentNode.__data__[x['key']] || 0
            var slug = value > 0 ? "rgba(70, 130, 180," : "rgba(244, 109, 67,"
            value = Math.abs(value)
            return slug + oscale(Math.log(value+1)) + ")"
          })     

        if (self.transform() == "percent") 
          trs.text(function(x) {
            if (this.classList.contains("option-header")) return ""

            var value = this.parentNode.__data__[x['key']] || 0
            var f = d3.format(".1%")(value/100)
            f = f.length > 4 ? f.slice(0,2) : f.slice(0,-1)
            return f + "%"

          })
      })
      .option_text("<div style='width:40px;text-align:center'>&#65291;</div>")
      .data({"values":sorted_tabular})
      .draw()

  }
}
