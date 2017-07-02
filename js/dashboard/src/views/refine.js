import {d3_updateable, d3_splat, d3_class, noop, D3ComponentBase} from 'helpers'
import accessor from '../helpers'
import header from '../generic/header'
import {table, summary_table} from 'table'
import {simpleTimeseries, before_after_timeseries} from 'chart'
import {tabular_timeseries, vertical_option} from 'component'

import {rollupBeforeAndAfter, processData } from './refine_relative_process'

import './refine_relative.css'


var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) })
buckets = buckets.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }))

function selectOptionRect(td,options,before_pos,after_pos) {

  var subset = td.selectAll("svg").selectAll("rect")
    .attr("fill",undefined).filter((x,i) => {
      var value = options.filter(x => x.selected)[0].value
      if (value == "all") return false
      if (value == "consideration") return (i < before_pos) || (i > buckets.length/2 - 1 )
      if (value == "validation") return (i < buckets.length/2 ) || (i > after_pos)
    })

  subset.attr("fill","grey")
}


export default function refine(target) {
  return new Refine(target)
}

class Refine extends D3ComponentBase {
  constructor(target) {
    super(target)
  }

  props() { return ["data","domain","stages","before_urls","after_urls"] }

  draw() {

    var self = this

    var td = d3_class(this._target,"refine-relative")
    var before_urls = this._before_urls
      , after_urls = this._after_urls
      , d = this._data
      , stages = this._stages

    var before_pos, after_pos;

    buckets.map(function(x,i) {
       if (stages.consideration == x) before_pos = i
       if (stages.validation == x) after_pos = i
    })

    var overall_rollup = rollupBeforeAndAfter(before_urls, after_urls)
    var {
        url_summary
      , kws_summary
      , urls
      , urls_consid
      , urls_valid
      , kws
      , kws_consid
      , kws_valid 

    } = processData(before_urls,after_urls,before_pos,after_pos,d.domain)

    var summary_headers = [
          {"key":"name","value":""}
        , {"key":"all","value":"All"}
        , {"key":"consideration","value":"Consideration"}
        , {"key":"validation","value":"Validation"}
      ]

    var options = [
        {"key":"All","value":"all", "selected":1}
      , {"key":"Consideration","value":"consideration", "selected":0}
      , {"key":"Validation","value":"validation", "selected":0}
    ]




    const summary_row = d3_class(td,"summary-row")

    d3_class(summary_row,"title")
      .text("Before and After: " + d.domain)

    before_after_timeseries(summary_row)
      .data(overall_rollup)
      .before(before_pos)
      .after(after_pos)
      .draw()

    var voptions = vertical_option(summary_row)
      .options(options)
      .on("click",function(x) {

        options.map(z => z.selected = x.key == z.key ? 1: 0)
        voptions
          .options(options) 
          .draw()

        selectOptionRect(td,options,before_pos,after_pos)
      })
      .draw()

    d3_class(summary_row,"description")
      .text("Select domains and keywords to build and refine your global filter")




    const tables = d3_class(td,"tables-row")

    summary_table(d3_class(tables,"url"))
      .title("URL Summary")
      .data(url_summary)
      .headers(summary_headers)
      .draw()

    summary_table(d3_class(tables,"kw"))
      .title("Keyword Summary")
      .data(kws_summary)
      .headers(summary_headers)
      .draw()




    const modify = d3_class(td,"modify-row")

    d3_class(modify,"action-header")
      .text("Explore and Refine")

    tabular_timeseries(d3_class(modify,"url-depth"))
      .headers(["Before","After"])
      .label("URL")
      .data(urls)
      .split(self.domain())
      .draw()

    tabular_timeseries(d3_class(modify,"kw-depth"))
      .headers(["Before","After"])
      .label("Keywords")
      .data(kws)
      .draw()

  }

}
