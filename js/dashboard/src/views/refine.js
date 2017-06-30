import {d3_updateable, d3_splat, d3_class, noop} from 'helpers'
import accessor from '../helpers'
import header from '../generic/header'
import {table, summary_table} from 'table'
import {simpleTimeseries} from 'chart'
import {tabular_timeseries} from 'component'


var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) })
buckets = buckets.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }))



function calcCategory(before_urls,after_urls) {
  var url_category = before_urls.reduce((p,c) => {
    p[c.url] = c.parent_category_name
    return p
  },{})

  url_category = after_urls.reduce((p,c) => {
    p[c.url] = c.parent_category_name
    return p
  },url_category)

  return url_category
}

function buildUrlSelection(td,to_draw,domain) {
   to_draw.map(x => {
     x.values = buckets.map(y => x[y] || 0)
     x.key = x.url
   })

   tabular_timeseries(d3_class(td,"url-depth"))
     .headers(["Before","After"])
     .label("URL")
     .data(to_draw)
     .split(domain)
     .draw()
}


function buildKeywordSelection(td,kw_to_draw) {
   kw_to_draw.map(x => {
     x.values = buckets.map(y => x[y] || 0)
   })

  tabular_timeseries(d3_class(td,"kw-depth"))
    .headers(["Before","After"])
    .label("Keywords")
    .data(kw_to_draw)
    .draw()
}


export default function refine(target) {
  return new Refine(target)
}

class Refine {
  constructor(target) {
    this._target = target
    this._on = {}
  }

  data(val) { return accessor.bind(this)("data",val) }
  domain(val) { return accessor.bind(this)("domain",val) }

  stages(val) { return accessor.bind(this)("stages",val) }

  before_urls(val) { return accessor.bind(this)("before_urls",val) }
  after_urls(val) { return accessor.bind(this)("after_urls",val) }



  on(action, fn) {
    if (fn === undefined) return this._on[action] || noop;
    this._on[action] = fn;
    return this
  }

  draw() {

    var self = this

    var td = this._target
    var before_urls = this._before_urls
      , after_urls = this._after_urls
      , d = this._data
      , stages = this._stages


    var url_category = calcCategory(before_urls,after_urls)


          var url_volume = before_urls.reduce((p,c) => {
            p[c.url] = (p[c.url] || 0) + c.visits
            return p
          },{})

          url_volume = after_urls.reduce((p,c) => {
            p[c.url] = (p[c.url] || 0) + c.visits
            return p
          },url_volume)



          var sorted_urls = d3.entries(url_volume).sort((p,c) => {
            return d3.descending(p.value,c.value)
          })


          var before_url_ts = before_urls.reduce((p,c) => {
            p[c.url] = p[c.url] || {}
            p[c.url]["url"] = c.url

            p[c.url][c.time_diff_bucket] = c.visits
            return p
          },{})

          var after_url_ts = after_urls.reduce((p,c) => {
            p[c.url] = p[c.url] || {}
            p[c.url]["url"] = c.url

            p[c.url]["-" + c.time_diff_bucket] = c.visits
            return p
          },before_url_ts)



          var to_draw = sorted_urls.slice(0,1000).map(x => after_url_ts[x.key])
.map(function(x){
  x.total = d3.sum(buckets.map(function(b) { return x[b] || 0 }))
  return x
})

var kw_to_draw = d3.entries(after_url_ts).reduce(function(p,c) {

  c.key.toLowerCase().split(d.domain)[1].split("/").reverse()[0].replace("_","-").split("-").map(x => {
    var values = ["that","this","what","best","most","from","your","have","first","will","than","says","like","into","after","with"]
    if (x.match(/\d+/g) == null && values.indexOf(x) == -1 && x.indexOf(",") == -1 && x.indexOf("?") == -1 && x.indexOf(".") == -1 && x.indexOf(":") == -1 && parseInt(x) != x && x.length > 3) {
      p[x] = p[x] || {}
      p[x].key = x
      Object.keys(c.value).map(q => {
        p[x][q] = (p[x][q] || 0) + c.value[q]
      })
    }
    return p
  })
  return p
},{})


kw_to_draw = Object.keys(kw_to_draw).map(function(k) { return kw_to_draw[k] }).map(function(x){
  x.total = d3.sum(buckets.map(function(b) { return x[b] || 0 }))
  return x
}).sort((p,c) => {
  return c.total - p.total
})




          var summary_row = d3_class(td,"summary-row").style("margin-bottom","15px")
            .style("position","relative")
          d3_class(td,"action-header").style("text-align","center").style("font-size","16px").style("font-weight","bold").text("Explore and Refine").style("padding","10px")
          var title_row = d3_class(td,"title-row")

          var expansion_row = d3_class(td,"expansion-row")
          var footer_row = d3_class(td,"footer-row").style("min-height","10px").style("margin-top","15px")

          function buildFilterInput(x) {
              this.on("something")(x)
              //select_value.value += (select_value.value ? "," : "") + x.key
          }

          d3_class(summary_row,"title")
            .style("font-size","16px")
            .style("font-weight","bold")
            .style("text-align","center")
            .style("line-height","40px")
            .style("margin-bottom","5px")
            .text("Before and After: " + d.domain)

          var options = [
              {"key":"All","value":"all", "selected":1}
            , {"key":"Consideration","value":"consideration", "selected":0}
            , {"key":"Validation","value":"validation", "selected":0}
          ]

          var tsw = 250;

          var timeseries = d3_class(summary_row,"timeseries","svg")
            .style("display","block")
            .style("margin","auto")
            .style("margin-bottom","30px")
            .attr("width",tsw + "px")
            .attr("height","70px")



          var before_rollup = d3.nest()
            .key(function(x) { return x.time_diff_bucket})
            .rollup(function(x) { return d3.sum(x,y => y.visits) })
            .map(before_urls)

          var after_rollup = d3.nest()
            .key(function(x) { return "-" + x.time_diff_bucket})
            .rollup(function(x) { return d3.sum(x,y => y.visits) })
            .map(after_urls)

          var overall_rollup = buckets.map(x => before_rollup[x] || after_rollup[x] || 0)



          simpleTimeseries(timeseries,overall_rollup,tsw)
          d3_class(timeseries,"middle","line")
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 0)
                .attr("y2", 55)
                .attr("x1", tsw/2)
                .attr("x2", tsw/2)

          d3_class(timeseries,"middle-text","text")
            .attr("x", tsw/2)
            .attr("y", 67)
            .style("text-anchor","middle")
            .text("On-site")


          var before_pos, after_pos;

          buckets.map(function(x,i) {
             if (stages.consideration == x) before_pos = i
             if (stages.validation == x) after_pos = i

          })

          var unit_size = tsw/buckets.length

          d3_class(timeseries,"before","line")
            .style("stroke-dasharray", "1,5")
            .attr("stroke-width",1)
            .attr("stroke","black")
            .attr("y1", 39)
            .attr("y2", 45)
            .attr("x1", unit_size*before_pos)
            .attr("x2", unit_size*before_pos)

          d3_class(timeseries,"before-text","text")
            .attr("x", unit_size*before_pos - 8)
            .attr("y", 48)

            .style("text-anchor","end")
            .text("Consideration")

          d3_class(timeseries,"window","line")
            .style("stroke-dasharray", "1,5")
            .attr("stroke-width",1)
            .attr("stroke","black")
            .attr("y1", 45)
            .attr("y2", 45)
            .attr("x1", unit_size*(before_pos))
            .attr("x2", unit_size*(after_pos+1)+1)


          d3_class(timeseries,"after","line")
            .style("stroke-dasharray", "1,5")
            .attr("stroke-width",1)
            .attr("stroke","black")
            .attr("y1", 39)
            .attr("y2", 45)
            .attr("x1", unit_size*(after_pos+1))
            .attr("x2", unit_size*(after_pos+1))

          d3_class(timeseries,"after-text","text")
            .attr("x", unit_size*(after_pos+1) + 8)
            .attr("y", 48)
            .style("text-anchor","start")
            .text("Validation")



          function selectOptionRect(options) {

            var subset = td.selectAll("svg").selectAll("rect")
              .attr("fill",undefined).filter((x,i) => {
                var value = options.filter(x => x.selected)[0].value
                if (value == "all") return false
                if (value == "consideration") return (i < before_pos) || (i > buckets.length/2 - 1 )
                if (value == "validation") return (i < buckets.length/2 ) || (i > after_pos)
              })


            subset.attr("fill","grey")
          }



          selectOptionRect(options)

          var opts = d3_class(summary_row,"options","div",options)
            .style("text-align","center")
            .style("position","absolute")
            .style("width","120px")
            .style("top","35px")
            .style("left","200px")


          function buildOptions(options) {


            d3_splat(opts,".show-button","a",options,x => x.key)
              .classed("show-button",true)
              .classed("selected",x => x.selected)
              .style("line-height","18px")
              .style("width","100px")
              .style("font-size","10px")
              .style("margin-bottom","5px")
              .text(x => x.key)
              .on("click",function(x) {
                this.parentNode.__data__.map(z => z.selected = 0)
                x.selected = 1
                buildOptions(this.parentNode.__data__)
                if (x.value == "consideration") {
                  buildUrlSelection(td,consideration_to_draw,self.domain())
                  buildKeywordSelection(td,consideration_kw_to_draw)
                } else if (x.value == "validation") {
                  buildUrlSelection(td,validation_to_draw,self.domain())
                  buildKeywordSelection(td,validation_kw_to_draw)
                } else {
                  buildUrlSelection(td,to_draw,self.domain())
                  buildKeywordSelection(td,kw_to_draw)
                }

                selectOptionRect(this.parentNode.__data__)
              })

          }

          buildOptions(options)

          d3_class(summary_row,"description")
            .style("font-size","12px")
            .style("position","absolute")
            .style("width","120px")
            .style("top","35px")
            .style("right","200px")
            .text("Select domains and keywords to build and refine your global filter")




          var consideration_buckets = buckets.filter((x,i) => !((i < before_pos) || (i > buckets.length/2 - 1 )) )
            , validation_buckets = buckets.filter((x,i) => !((i < buckets.length/2 ) || (i > after_pos)) )
            , consideration_to_draw = to_draw.filter(x => consideration_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) )
            , validation_to_draw = to_draw.filter(x => validation_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) )
            , consideration_kw_to_draw = kw_to_draw.filter(x => consideration_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) )
            , validation_kw_to_draw = kw_to_draw.filter(x => validation_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) )



          function avgViews(to_draw) {
            return parseInt(to_draw.reduce((p,c) => p + c.total,0)/to_draw.length)
          }
          function medianViews(to_draw) {
            return (to_draw[parseInt(to_draw.length/2)] || {}).total || 0
          }


          var url_summary_data = [
              {"name":"Distinct URLs", "all": to_draw.length, "consideration": consideration_to_draw.length, "validation": validation_to_draw.length }
            , {"name":"Average Views", "all": avgViews(to_draw), "consideration": avgViews(consideration_to_draw), "validation": avgViews(validation_to_draw)  }
            , {"name":"Median Views", "all": medianViews(to_draw), "consideration": medianViews(consideration_to_draw), "validation": medianViews(validation_to_draw)  }
          ]

          var kws_summary_data = [
              {"name":"Distinct Keywords", "all": kw_to_draw.length, "consideration": consideration_kw_to_draw.length, "validation": validation_kw_to_draw.length }
            , {"name":"Average Views", "all": avgViews(kw_to_draw), "consideration": avgViews(consideration_kw_to_draw), "validation": avgViews(validation_kw_to_draw)  }
            , {"name":"Median Views", "all": medianViews(kw_to_draw), "consideration": medianViews(consideration_kw_to_draw), "validation": medianViews(validation_kw_to_draw)  }
          ]




          summary_table(summary_row)
            .title("URL Summary")
            .data(url_summary_data)
            .headers([
                {"key":"name","value":""}
              , {"key":"all","value":"All"}
              , {"key":"consideration","value":"Consideration"}
              , {"key":"validation","value":"Validation"}
            ])
            .draw()

          summary_table(summary_row)
            .title("Keyword Summary")
            .data(kws_summary_data)
            .headers([
                {"key":"name","value":""}
              , {"key":"all","value":"All"}
              , {"key":"consideration","value":"Consideration"}
              , {"key":"validation","value":"Validation"}
            ])
            .draw()







          buildUrlSelection(td,to_draw,self.domain())
          buildKeywordSelection(td,kw_to_draw)





  }

}
