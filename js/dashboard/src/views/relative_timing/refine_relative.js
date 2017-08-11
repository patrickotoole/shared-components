import {d3_updateable, d3_splat, d3_class, noop, D3ComponentBase} from '@rockerbox/helpers'
import {table, summary_table} from '@rockerbox/table'
import {simpleTimeseries, before_after_timeseries} from '@rockerbox/chart'
import {tabular_timeseries, vertical_option} from '@rockerbox/component'

import {rollupBeforeAndAfter, processData, buckets} from './refine_relative_process'
import './refine_relative.css'


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


export default function refine_relative(target) {
  return new RefineRelative(target)
}

class RefineRelative extends D3ComponentBase {
  constructor(target) {
    super(target)
    this._options = [
        {"key":"All","value":"all", "selected":1}
      , {"key":"Consideration","value":"consideration", "selected":0}
      , {"key":"Validation","value":"validation", "selected":0}
    ]
    this._summary_headers = [
        {"key":"name","value":""}
      , {"key":"all","value":"All"}
      , {"key":"consideration","value":"Consideration"}
      , {"key":"validation","value":"Validation"}
    ]
  }

  props() { return ["data","domain","stages","before_urls","after_urls","summary_headers","options"] }

  draw() {

    var td = d3_class(this._target,"refine-relative")
    var before_urls = this._before_urls
      , after_urls = this._after_urls
      , d = this._data
      , stages = this._stages
      , summary_headers = this._summary_headers
      , options = this._options
      , is_domain = !!this._domain

    var before_pos, after_pos;

    buckets.map(function(x,i) {
       if (stages.consideration == x) before_pos = i
       if (stages.validation == x) after_pos = i
    })

    var overall_rollup = rollupBeforeAndAfter(before_urls, after_urls)
    var {
        url_summary
      , urls
      , urls_consid
      , urls_valid

      , kws_summary
      , kws
      , kws_consid
      , kws_valid 

    } = processData(before_urls,after_urls,before_pos,after_pos,this._domain)


    const summary_row = d3_class(td,"summary-row")

    d3_class(summary_row,"title")
      .text("Before and After: " + this._domain)

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




    //const tables = d3_class(td,"tables-row")

    //summary_table(d3_class(tables,"url"))
    //  .title("URL Summary")
    //  .data(url_summary)
    //  .headers(summary_headers)
    //  .draw()

    //summary_table(d3_class(tables,"kw"))
    //  .title("Keyword Summary")
    //  .data(kws_summary)
    //  .headers(summary_headers)
    //  .draw()




    const modify = d3_class(td,"modify-row")

    d3_class(modify,"action-header")
      .text("Explore and Refine")

    tabular_timeseries(d3_class(modify,"url-depth"))
      .headers(["Before","After"])
      .label(is_domain ? "URL" : "Domain")
      .data(urls) // need new dataset for here
      .split(this.domain())

      .on("stage-filter",this.on("stage-filter"))
      .draw()

    tabular_timeseries(d3_class(modify,"kw-depth"))
      .headers(["Before","After"])
      .label("Keywords")
      .data(kws)
      .on("stage-filter",this.on("stage-filter"))
      .draw()

  }

}


