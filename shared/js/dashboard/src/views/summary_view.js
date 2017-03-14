import accessor from '../helpers'
import header from '../generic/header'
import button_radio from '../generic/button_radio'
import select from '../generic/select'

import pie from '../generic/pie'
import diff_bar from '../generic/diff_bar'
import comp_bar from '../generic/comp_bar'
import comp_bubble from '../generic/comp_bubble'
import stream_plot from '../generic/stream_plot'




import * as timeseries from '../timeseries'


import table from 'table'

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }


export function SummaryView(target) {
  this._on = {
    select: noop
  }
  this.target = target
}

function buildStreamData(data,buckets) {
  
  var units_in_bucket = buckets.map(function(x,i) { return x - (x[i-1]|| 0) })

  var stackable = data.map(function(d) { 
    var valuemap = d.values.reduce(function(p,c) { p[c.key] = c.values; return p },{})
    var percmap = d.values.reduce(function(p,c) { p[c.key] = c.percent; return p },{})

    var vmap = d.values.reduce(function(p,c) { p[c.key] = c.norm_cat; return p },{})


    var normalized_values = buckets.map(function(x,i) {
      if (x == 0) return {key: d.key, x: parseInt(x), y: (vmap["600"]||0), values: (valuemap["600"]||0), percent: (percmap["600"]||0)}
      return { key: d.key, x: parseInt(x), y: (vmap[x] || 0), values: (valuemap[x] || 0), percent: (percmap[x] || 0) }
    })


    return normalized_values
    //return e2.concat(normalized_values)//.concat(extra)
  })


  stackable = stackable.sort((p,c) => p[0].y - c[0].y).reverse().slice(0,12)

  return stackable

}

function streamData(before,after,buckets) {
  var stackable = buildStreamData(before,buckets)
  var stack = d3.layout.stack().offset("wiggle").order("reverse")
  var before_stacked = stack(stackable)

  var order = before_stacked.map(item => item[0].key)

  var stackable = buildStreamData(after,buckets)
    .sort(function(p,c) { return order.indexOf(c[0].key) - order.indexOf(p[0].key) })

  stackable = stackable.filter(x => order.indexOf(x[0].key) == -1).concat(stackable.filter(x => order.indexOf(x[0].key) > -1))

  var stack = d3.layout.stack().offset("wiggle").order("default")
  var after_stacked = stack(stackable)

  return {
      order: order
    , before_stacked: before_stacked
    , after_stacked: after_stacked
  }

}

function simpleTimeseries(target,data) {
  var width = 120
    , height = 30

  var x = d3.scale.ordinal().domain(d3.range(0,data.length)).range(d3.range(0,120,120/data.length))
  var y = d3.scale.linear().range([0,height]).domain([d3.min(data),d3.max(data)])

  var wrap = d3_updateable(target,"g","g",data,function(x,i) { return 1})

  d3_splat(wrap,"rect","rect",x => x, (x,i) => i)
    .attr("x",(z,i) => x(i))
    .attr("width", width/data.length -1.2)
    .attr("y", z => height - y(z) )
    .attr("height", z => y(z))

  return wrap
  
}

function extractData(b,a,buckets,accessor) {
  var bvolume = {}, avolume = {}

  try { var bvolume = b[0].reduce(function(p,c) { p[c.x] = accessor(c); return p },{}) } catch(e) {}
  try { var avolume = a[0].reduce(function(p,c) { p[c.x] = accessor(c); return p },{}) } catch(e) {}

  var volume = buckets.slice().reverse().map(x => bvolume[x] || 0).concat(buckets.map(x => avolume[x] || 0))

  return volume
}

function drawStream(target,before,after) {

  var buckets = [0,10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })

  var data = streamData(before,after,buckets)
    , before_stacked = data.before_stacked
    , after_stacked = data.after_stacked

  var before = d3_updateable(target,".before-stream","div",data,function() { return 1})
    .classed("before-stream",true)
    .style("padding","10px")
    .style("padding-top","0px")

    .style("background-color","rgb(227, 235, 240)")

  d3_updateable(before,"h3","h3")
    .text("Consideration and Research Phase Identification")
    .style("font-size","12px")
    .style("color","#333")
    .style("line-height","33px")
    .style("background-color","#e3ebf0")
    .style("margin-left","-10px")
    .style("margin-bottom","10px")
    .style("padding-left","10px")
    .style("margin-top","0px")
    .style("font-weight","bold")
    .style("text-transform","uppercase")

  var inner = d3_updateable(before,".inner","div")
    .classed("inner",true)

  

  var stream = stream_plot(inner)
    .data(data)
    .on("category.hover",function(x,time) { 
      console.log(time)
      var b = data.before_stacked.filter(y => y[0].key == x)
      var a = data.after_stacked.filter(y => y[0].key == x)

      var volume = extractData(b,a,buckets,function(c) { return c.values.length })
        , percent = extractData(b,a,buckets,function(c) { return c.percent })
        , importance = extractData(b,a,buckets,function(c) { return c.y })


      var wrap = d3.select(this)
        , vwrap = d3_updateable(wrap,".volume","g")
            .attr("class","volume")
            .attr("transform","translate(-60,30)")
        , pwrap = d3_updateable(wrap,".percent","g")
            .attr("class","percent")
            .attr("transform","translate(-60,90)")
        , iwrap = d3_updateable(wrap,".importance","g")
            .attr("class","importance")
            .attr("transform","translate(-60,150)")


      d3_updateable(vwrap,"text","text").text("Visits")
        .attr("style","title")
      simpleTimeseries(vwrap,volume)
        .attr("transform","translate(0,2)")


      d3_updateable(pwrap,"text","text").text("Share of time")
        .attr("class","title")

      simpleTimeseries(pwrap,percent)
        .attr("transform","translate(0,2)")


      d3_updateable(iwrap,"text","text").text("Importance")
        .attr("class","title")

      simpleTimeseries(iwrap,importance)
        .attr("transform","translate(0,2)")


      return 
    })
    .draw()

  var before_agg = before_stacked.reduce((o,x) => { return x.reduce((p,c) => { p[c.x] = (p[c.x] || 0) + c.y; return p},o) },{})
    , after_agg = after_stacked.reduce((o,x) => { return x.reduce((p,c) => { p[c.x] = (p[c.x] || 0) + c.y; return p},o) },{})

  var local_before = Object.keys(before_agg).reduce((minarr,c) => { 
      if (minarr[0] > before_agg[c]) {
        return [before_agg[c],c]
      }
      return minarr 
    },[Infinity]
  )[1]

  var local_after = Object.keys(after_agg).reduce((minarr,c) => { 
      if (minarr[0] > after_agg[c]) {
        return [after_agg[c],c]
      }
      return minarr 
    },[Infinity]
  )[1]

  
  var before_line = buckets[buckets.indexOf(parseInt(local_before)) -1]
    , after_line = buckets[buckets.indexOf(parseInt(local_after)) + 1]

  var svg = stream
    ._svg.style("margin","auto").style("display","block")


  var bline = d3_updateable(svg.selectAll(".before-canvas"),"g.line-wrap","g")
    .attr("class","line-wrap")

  d3_updateable(bline,"line","line")
    .style("stroke-dasharray", "1,5")
    .attr("stroke-width",1)
    .attr("stroke","black")
    .attr("y1", 0)
    .attr("y2", stream._height+20)
    .attr("x1", stream._before_scale(before_line))
    .attr("x2", stream._before_scale(before_line))

  d3_updateable(bline,"text","text")
    .attr("y", stream._height+20)
    .attr("x", stream._before_scale(after_line) + 10)
    .style("text-anchor","start")
    .text("Consideration Stage")


  var aline = d3_updateable(svg.selectAll(".after-canvas"),"g.line-wrap","g")
    .attr("class","line-wrap")

  d3_updateable(aline,"line","line")
    .style("stroke-dasharray", "1,5")
    .attr("stroke-width",1)
    .attr("stroke","black")
    .attr("y1", 0)
    .attr("y2", stream._height+20)
    .attr("x1", stream._after_scale(after_line))
    .attr("x2", stream._after_scale(after_line))

  d3_updateable(aline,"text","text")
    .attr("y", stream._height+20)
    .attr("x", stream._after_scale(after_line) - 10)
    .style("text-anchor","end")
    .text("Validation / Research")
   
    


}



function buildSummaryBlock(data, target, radius_scale, x) {
  var data = data
    , dthis = d3.select(target)

  pie(dthis)
    .data(data)
    .radius(radius_scale(data.population))
    .draw()

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

function drawBeforeAndAfter(target,data) {

  var before = d3_updateable(target,".before","div",data,function() { return 1})
    .classed("before",true)
    .style("padding","10px")
    .style("padding-top","0px")

    .style("background-color","rgb(227, 235, 240)")

  d3_updateable(before,"h3","h3")
    .text("Category activity before arriving and after leaving site")
    .style("font-size","12px")
    .style("color","#333")
    .style("line-height","33px")
    .style("background-color","#e3ebf0")
    .style("margin-left","-10px")
    .style("margin-bottom","10px")
    .style("padding-left","10px")
    .style("margin-top","0px")
    .style("font-weight","bold")
    .style("text-transform","uppercase")

  var inner = d3_updateable(before,".inner","div")
    .classed("inner",true)
    .style("position","absolute")

  d3_updateable(inner,"h3","h3")
    .text("Sort By")
    .style("margin","0px")
    .style("line-height","32px")
    .style("color","inherit")
    .style("font-size","inherit")
    .style("font-weight","bold")
    .style("text-transform","uppercase")
    .style("background","#e3ebf0")
    .style("padding-left","10px")
    .style("margin-right","10px")
    .style("margin-top","2px")
    .style("margin-bottom","2px")
    .style("display","inline-block")
    .style("width","140px")

  

  inner.selectAll("select")
    .style("min-width","140px")
  

  var cb = comp_bubble(before)
    .rows(data.before_categories)
    .after(data.after_categories)
    .draw()

  cb._svg.style("display","block")
    .style("margin-left","auto")
    .style("margin-right","auto")


  return inner

}

function drawCategoryDiff(target,data) {

  diff_bar(target)
    .data(data)
    .title("Category indexing versus comp")
    .value_accessor("normalized_diff")
    .draw()

}

function drawCategory(target,data) {

  comp_bar(target)
    .data(data)
    .title("Categories visited for filtered versus all views")
    .pop_value_accessor("pop")
    .samp_value_accessor("samp")
    .draw()

}

function drawKeywords(target,data) {

  comp_bar(target)
    .data(data)
    .title("Keywords visited for filtered versus all views")
    .pop_value_accessor("pop")
    .samp_value_accessor("samp")
    .draw()


}

function drawKeywordDiff(target,data) {

  diff_bar(target)
    .data(data)
    .title("Keyword indexing versus comp")
    .value_accessor("normalized_diff")
    .draw()

}

function drawTimeseries(target,data,radius_scale) {
  var w = d3_updateable(target,"div.timeseries","div")
    .classed("timeseries",true)
    .style("width","60%")
    .style("display","inline-block")
    .style("background-color", "#e3ebf0")
    .style("padding-left", "10px")
    .style("height","127px")



  var q = d3_updateable(target,"div.timeseries-details","div")
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
    .style("margin-top","0px")
    .style("font-weight","bold")
    .style("text-transform","uppercase")






  timeseries['default'](w)
    .data({"key":"y","values":data})
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
        .each(function(x) { 
          var data = Object.keys(x).map(function(k) { return x[k] })[0]
          buildSummaryBlock(data,this,radius_scale,x) 
        })
    })
    .draw()

}





export default function summary_view(target) {
  return new SummaryView(target)
}

SummaryView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , timing: function(val) {
      return accessor.bind(this)("timing",val) 
    }
  , category: function(val) {
      return accessor.bind(this)("category",val) 
    }
  , keywords: function(val) {
      return accessor.bind(this)("keywords",val) 
    }
  , before: function(val) {
      return accessor.bind(this)("before",val) 
    }
  , after: function(val) {
      return accessor.bind(this)("after",val) 
    }


  , draw: function() {


  var CSS_STRING = String(function() {/*
.summary-wrap .table-wrapper { background:#e3ebf0; padding-top:5px; padding-bottom:10px }
.summary-wrap .table-wrapper tr { border-bottom:none }
.summary-wrap .table-wrapper thead tr { background:none }
.summary-wrap .table-wrapper tbody tr:hover { background:none }
.summary-wrap .table-wrapper tr td { border-right:1px dotted #ccc;text-align:center } 
.summary-wrap .table-wrapper tr td:last-of-type { border-right:none } 
  */})

  d3_updateable(d3.select("head"),"style#custom-table-css","style")
    .attr("id","custom-table-css")
    .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))




      var wrap = d3_updateable(this.target,".summary-wrap","div")
        .classed("summary-wrap",true)

      header(wrap)
        .text("Summary")
        .draw()


      var tswrap = d3_updateable(wrap,".ts-row","div")
        .classed("ts-row",true)
        .style("padding-bottom","10px")

      var piewrap = d3_updateable(wrap,".pie-row","div")
        .classed("pie-row",true)
        .style("padding-bottom","10px")

      var catwrap = d3_updateable(wrap,".cat-row","div")
        .classed("cat-row dash-row",true)
        .style("padding-bottom","10px")

      var keywrap = d3_updateable(wrap,".key-row","div")
        .classed("key-row dash-row",true)
        .style("padding-bottom","10px")

      var bawrap = d3_updateable(wrap,".ba-row","div",false,function() { return 1})
        .classed("ba-row",true)
        .style("padding-bottom","10px")

      var streamwrap = d3_updateable(wrap,".stream-ba-row","div",false,function() { return 1})
        .classed("stream-ba-row",true)
        .style("padding-bottom","10px")
       









      var radius_scale = d3.scale.linear()
        .domain([this._data.domains.population,this._data.views.population])
        .range([20,35])

      

      table.table(piewrap)
        .data({"key":"T","values":[this.data()]})
        .skip_option(true)
        .render("domains",function(x) { 
          var data = d3.select(this.parentNode).datum()[x.key]; 
          buildSummaryBlock(data,this,radius_scale,x) 
        })
        .render("articles",function(x) { 
          var data = d3.select(this.parentNode).datum()[x.key]; 
          buildSummaryBlock(data,this,radius_scale,x) 
        })

        .render("sessions",function(x) { 
          var data = d3.select(this.parentNode).datum()[x.key]; 
          buildSummaryBlock(data,this,radius_scale,x) 
        })
        .render("views",function(x) { 
          var data = d3.select(this.parentNode).datum()[x.key]; 
          buildSummaryBlock(data,this,radius_scale,x) 
        })
        .draw()

      
      drawTimeseries(tswrap,this._timing,radius_scale)     


      drawCategory(catwrap,this._category)     
      drawCategoryDiff(catwrap,this._category)     

      drawKeywords(keywrap,this._keywords)     
      drawKeywordDiff(keywrap,this._keywords)     

      var inner = drawBeforeAndAfter(bawrap,this._before)

      select(inner)
        .options([
            {"key":"Importance","value":"percent_diff"}
          , {"key":"Activity","value":"score"}
          , {"key":"Population","value":"pop"}
        ])
        .selected(this._before.sortby || "")
        .on("select", this.on("ba.sort"))
        .draw()


      drawStream(streamwrap,this._before.before_categories,this._before.after_categories)
        

      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}

