import {d3_class, d3_updateable, d3_splat, D3ComponentBase} from '@rockerbox/helpers'
import header from '../generic/header'
import {prepData} from '../generic/timeseries'
import data_selector from '../generic/data_selector'
import diff_bar from '../generic/diff_bar'

import {findBounds, streamData} from './summary/before_and_after'

import table from '@rockerbox/table'
import {domain_expanded} from '@rockerbox/component'
import {domain_bullet} from '@rockerbox/chart'

function countKey(data, key) {
  let counts = d3.nest()
    .key(x => x[key])
    .rollup(v => v.length)
    .entries(data)

  let total = d3.sum(counts,x => x.values)
  counts.map(x => x.percent = x.values/total)

  return counts

}

function diff(target, baseline) {
  let baselinePercent = baseline.reduce((p,c) => {
      p[c.key] = c.percent
      return p
    }, {})

  target.map(x => {
    if (x.percent > baselinePercent[x.key]) {
      x.diff = (x.percent - baselinePercent[x.key]) / baselinePercent[x.key]
    } else {
      x.diff = -(baselinePercent[x.key] - x.percent) / baselinePercent[x.key]
    }

    return x
  })

  return target
}

function desc(p,c) {
  return c.diff - p.diff
}

function rollStage(stage, key) {
  let rolled = d3.nest()
    .key(x => x[key])
    .rollup(v => {
      return {
          count: v.length
        , urls: v.map(x => x.url)
      }
    })
    .entries(stage)
    .map(x => Object.assign(x,x.values) )

  const total = d3.sum(rolled,x => x.count)

  rolled.map(x => x.percent = (x.count / total*100) || 0 )

  return rolled

}

export class WindowView extends D3ComponentBase {
  constructor(target) {
    super(target)
  }

  props() { return ["data", "options", "sort", "ascending", "top"] }

  draw() {

    var self = this

    var _explore = this._target
      , tabs = this.data()
      , filtered = tabs.filter(function(x){ return x.selected})
      , selected = filtered.length ? filtered[0] : tabs[0]
      , buckets = [0,10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })
      , b = selected.data.before_categories
      , a = selected.data.after_categories

    var {before_stacked, after_stacked} = streamData(b, a, buckets)
    var {before_line, after_line} = findBounds(before_stacked, after_stacked, buckets)

    var consideration = selected.data.before.filter(x => x.time_diff_bucket <= before_line)
    var validation = selected.data.after.filter(x => x.time_diff_bucket <= after_line)

    var baseline_before = selected.data.before.filter(x => x.time_diff_bucket > before_line)
      , baseline_after = selected.data.after.filter(x => x.time_diff_bucket > after_line)
      , baseline = baseline_before.concat(baseline_after)

    var category_baseline = countKey(baseline, "parent_category_name")
      , category_consideration = diff(countKey(consideration, "parent_category_name"),category_baseline).sort(desc)
      , category_validation = diff(countKey(validation, "parent_category_name"),category_baseline).sort(desc)


    var stages = d3_class(_explore,"wrap-stages")
      .style("margin-left","230px")
      .style("margin-right","-50px")
      .style("margin-top","-30px")


    var ccslice = Math.min(parseInt(category_consideration.length/2),5)
    var cvslice = Math.min(parseInt(category_validation.length/2),5)

 
    diff_bar(d3_class(stages,"consideration").style("display","inline-block"))
      .data( category_consideration.slice(0,ccslice).concat(category_consideration.slice(-ccslice)) )
      .value_accessor("diff")
      .bar_width(110)
      .show_labels(true)

      .title("Consideration Stage")
      .draw()

    diff_bar(d3_class(stages,"validation").style("display","inline-block"))
      .data( category_validation.slice(0,cvslice).concat(category_validation.slice(-cvslice)) )
      .value_accessor("diff")
      .bar_width(110)
      .show_labels(true)
      .title("Validation Stage")
      .draw()

    const headers = [
        {key:"key",value: "Domains",locked:true,width:"200px"}
      , {key:"consideration_percent",value: "Consideration",locked:true}
      , {key:"validation_percent",value: "Validation",locked:true}
      , {key:"baseline_percent",value: "Baseline",locked:true}
      , {key:"consideration_ratio",value: "Consideration Ratio",locked:true}
      , {key:"validation_ratio",value: "Validation Ratio",locked:true}




    ]
    const _default = "stage_percent"
    const s = this.sort() 
    const asc = this.ascending() 


    const selectedHeader = headers.filter(x => x.key == s)
    const sortby = selectedHeader.length ? selectedHeader[0].key : _default

    const stage_values = {
        consideration: rollStage(consideration,"domain")
      , validation: rollStage(validation,"domain")
      , baseline: rollStage(baseline,"domain")
    }

    const combined = Object.keys(stage_values).reduce((p,stage) => {

      stage_values[stage].reduce((r,s) => {
        r[s.key] = r[s.key] || {}
        r[s.key][stage + "_count"] = s.count
        r[s.key][stage + "_percent"] = isNaN(s.percent) ? 0 : s.percent
        r[s.key][stage + "_urls"] = s.urls
        return r
      },p)

      return p
    },{})

    const combined_formatted = Object.keys(combined).reduce((p,c) => {

      let values = combined[c]
      values.consideration_percent = values.consideration_percent || 0
      values.validation_percent = values.validation_percent || 0
      values.baseline_percent = values.baseline_percent || 0

      values.consideration_ratio = values.consideration_percent/values.baseline_percent
      values.validation_ratio = values.validation_percent/values.baseline_percent

      let cr = values.consideration_ratio
        , vr = values.validation_ratio

      values.consideration_ratio = isFinite(cr) ? cr : isNaN(cr) ? 0 : 10000
      values.validation_ratio = isFinite(vr) ? vr : isNaN(vr) ? 0 : 10000




      let totals = (values.consideration_percent || 0) + (values.validation_percent || 0)

      p.push( Object.assign({key:c, stage_percent: totals},values) )
      return p
    },[])





    var t = table(d3_class(_explore,"stage-table-wrap").style("margin-top","20px") )
      .top(this.top())
      .data({"values": combined_formatted})
      .headers( headers)
      .sort(sortby,asc)
      .on("sort", this.on("sort"))
      .option_text("&#65291;")
      .render("consideration_ratio", function(x) { 
        let value = this.parentElement.__data__.consideration_ratio
        this.innerText = value == 10000 ? "∞" : d3.format(".3r")(value)
      })
      .render("validation_ratio", function(x) { 
        let value = this.parentElement.__data__.validation_ratio
        this.innerText = value == 10000 ? "∞" : d3.format(".3r")(value)
      })

      .on("expand",function(d,td) {

        var dd = combined_formatted.filter(function(x) { return x.key == d.key})

        return // skip rendering expansion for now

        var rolled = prepData(dd)
        domain_expanded(td)
          .domain(d.key)
          .raw(dd)
          .data(rolled)
          .urls(dd[0].consideration_urls)
          .on("stage-filter", function(x) {
            self.on("stage-filter")(x)
          })
          .draw()


      })
      .hidden_fields(["urls","percent_unique","sample_percent_norm","pop_percent","tf_idf","parent_category_name","values"])
      
    t.draw()


    

    return this

  }

}

export default function window_view(target) {
  return new WindowView(target)
}

