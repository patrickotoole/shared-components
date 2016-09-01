import table from 'table'
import * as timeseries from '../timeseries'

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
    .style("min-height","90px")

  var reduced = buildSummaryData(data)
  this._reduced = this._reduced ? this._reduced : buildSummaryData(this._data)

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


  var tabs = [
      {"key":"Summary", "values": data_summary, "draw":draw_summary}
    , {"key": "Timeseries", "values":[], "draw":function(d) {
      var prepped = timeseries.prepData(d.full_urls)

      summary.html("")
      var w = d3_updateable(summary,"div","div")
        .style("width","50%")

      timeseries['default'](w)
        .data({"key":"y","values":prepped})
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
