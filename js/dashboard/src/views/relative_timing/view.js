import {noop, identity, d3_updateable, d3_splat, d3_class, D3ComponentBase} from 'helpers'
import header from '../../generic/header'
import select from '../../generic/select'

import table from 'table'

import refine_relative from './refine_relative'
import {categoryWeights, computeScale, normalizeRowSimple, normalizeRow, normalize, totalsByTime, normalizeByColumns, normalizeByCategory} from './relative_timing_process'
import {timingHeaders, timeBuckets} from './relative_timing_constants'
import {drawStream, drawStreamSkinny} from '../summary/before_and_after'
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

  props() { return ["data","transform", "sort", "ascending"] }

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

    var ts = d3_class(wrap,"timeseries-row")
      .style("padding-bottom",selected.key == "Top Categories" ? "0px" : null)


    var transform_selector = d3_class(ts,"transform")

    select(d3_class(transform_selector,"header","span"))
      .options(data)
      .on("select", function(x) { this.on("select")(x) }.bind(this))
      .draw()

    var OPTIONS = [
          {"key":"Activity","value":false}
        , {"key":"Intent Score","value":"normalize"}
        , {"key":"Importance","value":"importance"}
        , {"key":"Percentage","value":"percent"}
        , {"key":"Percent Diff","value":"percent_diff"}
      ]



    select(d3_class(transform_selector,"trans","span"))
      .options(OPTIONS)
      .on("select", function(x){
        self.on("transform.change").bind(this)(x)
      })
      .selected(this.transform() )
      .draw()




    var toggle = d3_class(transform_selector,"show-values")

    d3_updateable(toggle,"span","span")
      .text("show values? ")

    d3_updateable(toggle,"input","input")
      .attr("type","checkbox")
      .on("change",function(x) {
        bawrap.classed("show-values",this.checked)
      })


    var toggle = d3_class(transform_selector,"filter-values")

    d3_updateable(toggle,"span","span")
      .text("live filter? ")

    d3_updateable(toggle,"input","input")
      .attr("type","checkbox")
      .attr("disabled",true)
      .attr("checked","checked")

    var toggle = d3_class(transform_selector,"reset-values")

    d3_updateable(toggle,"a","a")
      .style("display","none")
      .style("text-align","center")
      .text("Reset")






    var stream_wrap = d3_class(ts,"stream-wrap")
      .style("width","682px")
      .style("display",selected.key == "Top Categories" ? "none" : "inline-block")
      .style("vertical-align","bottom")

    var details = d3_class(ts,"details-wrap","svg")
      .style("width","255px")
      .style("height","200px")
      .style("display",selected.key == "Top Categories" ? "none" : "inline-block")


      .style("margin-top","-110px")
      .style("float","left")

    function filter(cat) {

      var tr = bawrap.selectAll("tbody").selectAll("tr")
        .classed("hide-category",false)

      if (cat === false) return 

      var filtered = tr.filter(function(x) { 
          return x.parent_category_name != cat
        })
        .classed("hide-category",true)
    }

    var stages = drawStreamSkinny(stream_wrap,selected.data.before_categories,selected.data.after_categories,filter)

    var time_wrap = d3_class(ts,"time-wrap")
      .style("text-align", "right")
      .style("margin-right", "63px")

    var svg = d3_updateable(time_wrap,"svg","svg").attr("width",682).attr("height",80)
      .style("display","inline-block")
      .style("vertical-align","bottom")
      .style("margin-bottom","15px")



    var sts = simpleTimeseries(svg,values,682,80,-2)

    var lock = false

    function filterTime(t,i) {
      var key = timeBuckets[i]

      if (lock) {
        clearTimeout(lock)
      }
      lock = setTimeout(function() {
        lock = false
        var tr = bawrap.selectAll("tbody").selectAll("tr")
          .classed("hide-time",false)

        if (i === false) return false

        var filtered = tr.filter(function(x) { 
            return x[key] == undefined || x[key] == ""
          })
          .classed("hide-time",true)
      },10)

    }


    sts.selectAll("rect")
      .on("mouseover",filterTime)
      .on("mouseout",function() { 
        filterTime(false,false)
      })
      .on("click",function() {
        lock = false
        var bool = (sts.selectAll("rect").on("mouseover") == filterTime)

        sts.selectAll("rect")
          .on("mouseover", bool ? noop : filterTime)
          .on("mouseout", bool ? noop : function() { filterTime(false,false) })

          .classed("selected",false)

        d3.select(this).classed("selected",bool)

        //d3.event.stopPropagation()
        return false

      })

    const categories = data[0].data.category.reduce((p,c) => {
      p[c.key] = c
      return p
    },{})

    var bawrap = d3_class(wrap,"ba-row")
      .style("min-height","600px")

    //TODO: fix this

    var normByCol = normalizeByColumns(selected.values)


    const sorted_tabular = selected.values.filter(x => x.key != "")
      .map(
        this.transform() == "normalize" ?  normalizeRow : 
        this.transform() == "percent" ? normalizeByColumns(selected.values) : 
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
            var slug = value > 0 ? "rgba(70, 130, 180," : "rgba(244, 109, 67,"
            value = Math.abs(value)
            return slug + oscale(Math.log(value+1)) + ")"
          })     
      })
      .option_text("<div style='width:40px;text-align:center'>&#65291;</div>")
      .data({"values":sorted_tabular})
      .draw()

  }
}
