import {d3_updateable, d3_splat} from 'helpers'
import accessor from '../helpers'
import header from '../generic/header'
import table from 'table'
import refine from './refine'
import * as timeseries from '../generic/timeseries'
import {domain_expanded} from 'component'




import {drawStream} from './summary_view'
import {simpleTimeseries} from 'chart'

function noop(){}

function d3_class(target,cls,type,data) {
  return d3_updateable(target,"." + cls, type || "div",data)
    .classed(cls,true)
}

function formatHour(h) {
  if (h == 0) return "12 am"
  if (h == 12) return "12 pm"
  if (h > 12) return (h-12) + " pm"
  return (h < 10 ? h[1] : h) + " am"
}


export default function timing(target) {
  return new Timing(target)
}

class Timing {
  constructor(target) {
    this._target = target
    this._on = {}
  }

  data(val) { return accessor.bind(this)("data",val) } 

  on(action, fn) {
    if (fn === undefined) return this._on[action] || noop;
    this._on[action] = fn;
    return this
  }


  draw() {


    var self = this
    var data = this._data
    var wrap = d3_class(this._target,"timing-wrap")

    header(wrap)
      .text("Timing")
      .draw()

    var timingwrap = d3_updateable(wrap,".timing-row","div",false,function() { return 1})
        .classed("timing-row",true)
        .style("padding-bottom","60px")

    // DATA
    var hourbuckets = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x)


    var d = d3.nest()
      .key(x => x.domain)
      .key(x => x.hour)
      .entries(data.full_urls)

    var max = 0

    d.map(x => {
      var obj = x.values.reduce((p,c) => {
        p[c.key] = c.values
        return p
      },{})

      x.buckets = hourbuckets.map(z => {
       
        var o = {
          values: obj[z],
          key: formatHour(z)
        }
        o.views = d3.sum(obj[z] || [], q => q.uniques)

        max = max > o.views ? max : o.views
        return o
      })

      x.tabular = x.buckets.reduce((p,c) => {
        p[c.key] = c.views || undefined
        return p
      },{})

      x.tabular["domain"] = x.key
      x.tabular["total"] = d3.sum(x.buckets,x => x.views)

      
      x.values
    })

    var headers = [
      {key:"domain",value:"Domain"}
    ]

    headers = headers.concat(hourbuckets.map(formatHour).map(x => { return {key: x, value: x} }) )
    
    var oscale = d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])


    var table_obj = table(timingwrap)
      .headers(headers)
      .data({"key":"", "values":d.map(x => x.tabular) })
      .sort("total")
      .skip_option(true)
      .on("expand",function(d) {

          d3.select(this).selectAll("td.option-header").html("&ndash;")
          if (this.nextSibling && d3.select(this.nextSibling).classed("expanded") == true) {
            d3.select(this).selectAll("td.option-header").html("&#65291;")
            return d3.select(this.parentNode).selectAll(".expanded").remove()
          }

          d3.select(this.parentNode).selectAll(".expanded").remove()
          var t = document.createElement('tr');
          this.parentNode.insertBefore(t, this.nextSibling);  

          var tr = d3.select(t).classed("expanded",true).datum({})
          var td = d3_updateable(tr,"td","td")
            .attr("colspan",this.children.length)
            .style("background","#f9f9fb")
            .style("padding-top","10px")
            .style("padding-bottom","10px")

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
      .draw()

    table_obj._target.selectAll("tr").selectAll("td:not(:first-child)")
      .style("border-right","1px solid white")
      .style("padding-left","0px")
      .style("text-align","center")
      .style("background-color",function(x) {
        var value = this.parentNode.__data__[x['key']] || 0
        return "rgba(70, 130, 180," + oscale(Math.log(value+1)) + ")"
      })




    
  }
}
