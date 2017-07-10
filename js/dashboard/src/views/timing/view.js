import {d3_updateable, d3_splat, d3_class, D3ComponentBase, noop} from 'helpers'
import header from '../../generic/header'
import table from 'table'
import * as timeseries from '../../generic/timeseries'
import {domain_expanded} from 'component'
import {simpleTimeseries} from 'chart'

import {hourbuckets, timingHeaders} from './timing_constants'
import {computeScale} from './timing_process'



import './timing.css'


export default function timing(target) {
  return new Timing(target)
}

class Timing extends D3ComponentBase {
  constructor(target) {
    super(target)
  }

  props() { return ["data","normalize", "sort", "ascending"] }


  draw() {

    var self = this
    var data = this._data
      , filtered = data.filter(function(x){ return x.selected})
      , selected = filtered.length ? filtered[0] : data[0]


    var wrap = d3_class(this._target,"timing-wrap")

    const headers = [{key:"key",value:selected.key.replace("Top ","")}].concat(timingHeaders)
    const d = data[0].values//timingTabular(data.full_urls)
    const oscale = computeScale(d)

    const _default = "total"
    const s = this.sort() 
    const asc = this.ascending() 


    const selectedHeader = headers.filter(x => x.key == s)
    const sortby = selectedHeader.length ? selectedHeader[0].key : _default



    header(wrap)
      .text(selected.key)
      .options(data)
      .on("select", function(x) { this.on("select")(x) }.bind(this))
      .draw()

    var timingwrap = d3_class(wrap,"timing-row")

    var table_obj = table(timingwrap)
      .top(140)
      .headers(headers)
      .sort(sortby,asc)
      .on("sort", this.on("sort"))
      .data(selected)
      .skip_option(true)
      .on("expand",function(d,td) {

        var dd = data.full_urls.filter(function(x) { return x.domain == d.domain })
        var rolled = timeseries.prepData(dd)
        
        domain_expanded(td)
          .domain(dd[0].domain)
          .raw(dd)
          .data(rolled)
          .on("stage-filter", function(x) {
            self.on("stage-filter")(x)
          })
          .draw()

      })
      .on("draw",function() {

        this._target.selectAll("tr").selectAll("td:not(:first-child)")
          .style("background-color",function(x) {
            var value = this.parentNode.__data__[x['key']] || 0
            return "rgba(70, 130, 180," + oscale(Math.log(value+1)) + ")"
          })
      })
      .draw()
    
  }
}
