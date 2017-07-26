import table from '@rockerbox/table'
import * as timeseries from '../generic/timeseries'

function buildSummaryData(data) {
      var reduced = data.full_urls.reduce(function(p,c) {
          p.domains[c.domain] = true
          p.articles[c.url] = true
          p.views += c.count
          p.sessions += c.uniques

          return p
        },{
            domains: {}
          , articles: {}
          , sessions: 0
          , views: 0
        })

      reduced.domains = Object.keys(reduced.domains).length
      reduced.articles = Object.keys(reduced.articles).length

      return reduced

}

function buildSummaryAggregation(samp,pop) {
      var data_summary = {}
      Object.keys(samp).map(function(k) {
        data_summary[k] = {
            sample: samp[k]
          , population: pop[k]
        }
      })

      return data_summary
  
}

var drawPie = function(data,radius,target) {

  var d = d3.entries({
      sample: data.sample
    , population: data.population - data.sample
  })
  
  var color = d3.scale.ordinal()
      .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
  
  var arc = d3.svg.arc()
      .outerRadius(radius - 10)
      .innerRadius(0);
  
  var pie = d3.layout.pie()
      .sort(null)
      .value(function(d) { return d.value; });
  
  var svg = d3_updateable(target,"svg","svg",false,function(x){return 1})
      .attr("width", 50)
      .attr("height", 52)

  svg = d3_updateable(svg,"g","g")
      .attr("transform", "translate(" + 25 + "," + 26 + ")");
  
  var g = d3_splat(svg,".arc","g",pie(d),function(x){ return x.data.key })
    .classed("arc",true)

  d3_updateable(g,"path","path")
    .attr("d", arc)
    .style("fill", function(d) { return color(d.data.key) });
}

var buildSummaryBlock = function(radius_scale,x) {
  var data = this.parentNode.__data__[x.key]
    , dthis = d3.select(this)

  drawPie(data,radius_scale(data.population),dthis)

  var fw = d3_updateable(dthis,".fw","div",false,function() { return 1 })
    .classed("fw",true)
    .style("width","50px")
    .style("display","inline-block")
    .style("vertical-align","top")
    .style("padding-top","3px")
    .style("text-align","center")
    .style("line-height","16px")

  var fw2 = d3_updateable(dthis,".fw2","div",false,function() { return 1 })
    .classed("fw2",true)
    .style("width","60px")
    .style("display","inline-block")
    .style("vertical-align","top")
    .style("padding-top","3px")
    .style("text-align","center")
    .style("font-size","22px")
    .style("font-weight","bold")
    .style("line-height","40px")
    .text(d3.format("%")(data.sample/data.population))



  d3_updateable(fw,".sample","span").text(d3.format(",")(data.sample))
    .classed("sample",true)
  d3_updateable(fw,".vs","span").html("<br> out of <br>").style("font-size",".88em")
    .classed("vs",true)
  d3_updateable(fw,".population","span").text(d3.format(",")(data.population))
    .classed("population",true)

}


export default function(_top,data) {

  var CSS_STRING = String(function() {/*
.search-summary { padding-left:10px; padding-right:10px }
.search-summary .table-wrapper { background:#e3ebf0; padding-top:5px; padding-bottom:10px }
.search-summary .table-wrapper tr { border-bottom:none }
.search-summary .table-wrapper thead tr { background:none }
.search-summary .table-wrapper tbody tr:hover { background:none }
.search-summary .table-wrapper tr td { border-right:1px dotted #ccc;text-align:center } 
.search-summary .table-wrapper tr td:last-of-type { border-right:none } 
  */})

  d3_updateable(d3.select("head"),"style#custom-table-css","style")
    .attr("id","custom-table-css")
    .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))



  var head = d3_updateable(_top, "h3.summary-head","h3")
    .classed("summary-head",true)
    .style("margin-bottom","15px")
    .style("margin-top","-5px")
    .text("")

  var summary = d3_updateable(_top,".search-summary","div",false, function(x) { return 1})
    .classed("search-summary",true)
    .style("min-height","145px")

  var reduced = buildSummaryData(data)
  this._reduced = this._reduced ? this._reduced : buildSummaryData(this._data)
  this._timeseries = this._timeseries ? this._timeseries : timeseries.prepData(this._data.full_urls)


  var data_summary = buildSummaryAggregation(reduced,this._reduced)

  var draw_summary = function() {

    summary.html("")

    var radius_scale = d3.scale.linear()
      .domain([data_summary.domains.population,data_summary.views.population])
      .range([20,35])
  
    table.table(summary)
      .data({"key":"T","values":[data_summary]})
      .skip_option(true)
      .render("domains",function(x) { buildSummaryBlock.bind(this)(radius_scale,x) })
      .render("articles",function(x) { buildSummaryBlock.bind(this)(radius_scale,x) })
      .render("sessions",function(x) { buildSummaryBlock.bind(this)(radius_scale,x) })
      .render("views",function(x) { buildSummaryBlock.bind(this)(radius_scale,x) })
      .draw()

  }

  var ts = this._timeseries

  var tabs = [
      {"key":"Summary", "values": data_summary, "draw":draw_summary}
    , {"key": "Timing Overview", "values":[], "draw":function(d) {
      var prepped = timeseries.prepData(d.full_urls)

      summary.html("")



      var w = d3_updateable(summary,"div.timeseries","div")
        .classed("timeseries",true)
        .style("width","60%")
        .style("display","inline-block")
        .style("background-color", "#e3ebf0")
        .style("padding-left", "10px")
        .style("height","127px")



      var q = d3_updateable(summary,"div.timeseries-details","div")
        .classed("timeseries-details",true)
        .style("width","40%")
        .style("display","inline-block")
        .style("vertical-align","top")
        .style("padding","15px")
        .style("padding-left","57px")
        .style("background-color", "#e3ebf0")
        .style("height","127px")

        



      var pop = d3_updateable(q,".pop","div")
        .classed("pop",true)

      d3_updateable(pop,".ex","span")
        .classed("ex",true)
        .style("width","20px")
        .style("height","10px")
        .style("background-color","grey")
        .style("display","inline-block")


      d3_updateable(pop,".title","span")
        .classed("title",true)
        .style("text-transform","uppercase")
        .style("padding-left","3px")
        .text("all")


      
      var samp = d3_updateable(q,".samp","div")
        .classed("samp",true)

      d3_updateable(samp,".ex","span")
        .classed("ex",true)
        .style("width","20px")
        .style("height","10px")
        .style("background-color","#081d58")
        .style("display","inline-block")



      d3_updateable(samp,".title","span")
        .classed("title",true)
        .style("text-transform","uppercase")
        .style("padding-left","3px")
        .text("filtered")


      var details = d3_updateable(q,".deets","div")
        .classed("deets",true)
      



      d3_updateable(w,"h3","h3")
        .text("Filtered versus All Views")
        .style("font-size","12px")
        .style("color","#333")
        .style("line-height","33px")
        .style("background-color","#e3ebf0")
        .style("margin-left","-10px")
        .style("margin-bottom","10px")
        .style("padding-left","10px")



      var mappedts = prepped.reduce(function(p,c) { p[c.key] = c; return p}, {})

      var prepped = ts.map(function(x) {
        return {
            key: x.key
          , hour: x.hour
          , minute: x.minute
          , value2: x.value
          , value: mappedts[x.key] ?  mappedts[x.key].value : 0
        }
      })




      timeseries['default'](w)
        .data({"key":"y","values":prepped})
        .height(80)
        .on("hover",function(x) {
          var xx = {}
          xx[x.key] = {sample: x.value, population: x.value2 }
          details.datum(xx)

          d3_updateable(details,".text","div")
            .classed("text",true)
            .text("@ " + x.hour + ":" + (x.minute.length > 1 ? x.minute : "0" + x.minute) )
            .style("display","inline-block")
            .style("line-height","49px")
            .style("padding-top","15px")
            .style("padding-right","15px")
            .style("font-size","22px")
            .style("font-weight","bold")
            .style("width","110px")
            .style("vertical-align","top")
            .style("text-align","center")




          d3_updateable(details,".pie","div")
            .classed("pie",true)
            .style("display","inline-block")
            .style("padding-top","15px")
            .each(function(z) { buildSummaryBlock.bind(this)(function() { return 35 }, x) })
        })
        .draw()



      
}}
  ]  

  if ((tabs[0].selected == undefined) && (!this._state.get("summary")))  this._state.set("summary",[1,0]) 

  this._state.get("summary").map(function(x,i) { tabs[i].selected = x })

  d3_updateable(head,"span","span")
    .text(tabs.filter(function(x){ return x.selected})[0].key)

  var self = this

  var select = d3_updateable(head,"select","select")
    .style("width","19px")
    .style("margin-left","12px")
    .on("change", function(x) {
      tabs.map(function(y) { y.selected = 0 })

      this.selectedOptions[0].__data__.selected = 1
      self._state.set("summary", tabs.map(function(y) {return y.selected }) )
      head.selectAll("span").text(this.selectedOptions[0].__data__.key)
      this.selectedOptions[0].__data__.draw(data)

      //draw()
    })
  
  d3_splat(select,"option","option",tabs,function(x) {return x.key})
    .text(function(x){ return x.key })
    .style("color","#888")
    .style("min-width","100px")
    .style("text-align","center")
    .style("display","inline-block")
    .style("padding","5px")
    .style("border",function(x) {return x.selected ? "1px solid #888" : undefined})
    .style("opacity",function(x){ return x.selected ? 1 : .5})


  tabs.filter(function(x) {
    return x.selected
  }).pop().draw(data)

  


}
