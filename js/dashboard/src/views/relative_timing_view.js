import accessor from '../helpers'
import header from '../generic/header'
import table from 'table'
import time_series from '../timeseries'
import refine from './refine'


import {drawStream} from './summary_view'
import {simpleTimeseries} from './summary_view'

function noop(){}

function d3_class(target,cls,type,data) {
  return d3_updateable(target,"." + cls, type || "div",data)
    .classed(cls,true)
}


export default function relative_timing(target) {
  return new RelativeTiming(target)
}

class RelativeTiming {
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
    var wrap = d3_class(this._target,"summary-wrap")

    header(wrap)
      .text("Before and After")
      .draw()

    var bawrap = d3_updateable(wrap,".ba-row","div",false,function() { return 1})
        .classed("ba-row",true)
        .style("padding-bottom","60px")

    try {
      var stages = drawStream(bawrap,this._data.before_categories,this._data.after_categories)
      bawrap.selectAll(".before-stream").remove() // HACK
    } catch(e) {
      bawrap.html("")
      return
    }

    var values = this._data.before_categories[0].values


    var category_multipliers = data.before_categories.reduce((p,c) => {
      p[c.key] = (1 + c.values[0].percent_diff)
      return p
    },{})


    var tabular_data = this._data.before.reduce((p,c) => {
      p[c.domain] = p[c.domain] || {}
      p[c.domain]['domain'] = c.domain
      p[c.domain]['weighted'] = c.visits * category_multipliers[c.parent_category_name]
      
      p[c.domain][c.time_diff_bucket] = (p[c.domain][c.time_diff_bucket] || 0) + c.visits
      return p
    },{})

    tabular_data = this._data.after.reduce((p,c) => {
      p[c.domain] = p[c.domain] || {} 
      p[c.domain]['domain'] = c.domain
      p[c.domain]["-" + c.time_diff_bucket] = (p[c.domain][c.time_diff_bucket] || 0) + c.visits

      return p
    },tabular_data)

    var sorted_tabular = Object.keys(tabular_data).map((k) => {
      return tabular_data[k]
    }).sort((p,c) => {
      
      return d3.descending(p['600']*p.weighted || -Infinity,c['600']*c.weighted || -Infinity)
    })




    var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) })
    buckets = buckets.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }))


    var formatName = function(x) {

      if (x < 0) x = -x

      if (x == 3600) return "1 hr"
      if (x < 3600) return x/60 + " mins" 

      if (x == 86400) return "1 day"
      if (x > 86400) return x/86400 + " days" 

      return x/3600 + " hrs"
    }

    bawrap.selectAll(".table-wrapper").html("")

    var table_obj = table(bawrap)
      .top(140)
      .headers(
        [{"key":"domain", "value":"Domain"}].concat(
          buckets.map(x => { return {"key":x, "value":formatName(x), "selected":true} })
        )
        
      )
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

          var before_urls = data.before.filter(y => y.domain == d.domain)
          var after_urls = data.after.filter(y => y.domain == d.domain)

          refine(td)
            .data(d)
            .stages(stages)
            .before_urls(before_urls)
            .after_urls(after_urls)
            .on("stage-filter",self.on("stage-filter"))
            .draw()

        })
      .option_text("<div style='width:40px;text-align:center'>&#65291;</div>")
      //.sort("600")
      .data({"values":sorted_tabular.slice(0,1000)})
      .draw()

    table_obj._target.selectAll("th")
      //.style("width",x => (parseInt(x.key) == x.key) ? "31px" : undefined )
      //.style("max-width",x => (parseInt(x.key) == x.key) ? "31px" : undefined )
      .style("border-right","1px rgba(0,0,0,.1)")
      .selectAll("span")
      .attr("style", function(x) { 
        if (parseInt(x.key) == x.key && x.key < 0) return "font-size:.9em;width:70px;transform:rotate(-45deg);display:inline-block;margin-left:-9px;margin-bottom: 12px"
        if (parseInt(x.key) == x.key && x.key > 0) return "font-size:.9em;width:70px;transform:rotate(45deg);text-align:right;display:inline-block;margin-left: -48px; margin-bottom: 12px;"

      })


    table_obj._target.selectAll(".table-option")
      .style("display","none")


    var max = sorted_tabular.reduce((p,c) => {
      Object.keys(c).filter(z => z != "domain" && z != "weighted").map(function(x) {
        p = c[x] > p ? c[x] : p
      })
    
      return p
    },0)

    var oscale = d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])

    table_obj._target.selectAll("tr").selectAll("td:not(:first-child)")
      .style("border-right","1px solid white")
      .style("padding-left","0px")
      .style("text-align","center")
      .style("background-color",function(x) {
        var value = this.parentNode.__data__[x['key']] || 0
        return "rgba(70, 130, 180," + oscale(Math.log(value+1)) + ")"
      })






      



    //var t = table.table(_explore)
    //  .data(selected)



    
  }
}
