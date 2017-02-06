import accessor from '../helpers'
import header from '../generic/header'
import button_radio from '../generic/button_radio'
import select from '../generic/select'

import pie from '../generic/pie'
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

function drawCategoryDiff(target,data) {

  var w = d3_updateable(target,"div.category-diff","div",false,function() { return 1})
    .classed("category-diff",true)
    .style("width","50%")
    .style("display","inline-block")
    .style("background-color", "#e3ebf0")
    .style("padding-left", "10px")
    .style("min-height","580px")


  d3_updateable(w,"h3","h3")
    .text("Category indexing versus comp")
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

  var wrap = d3_updateable(w,".svg-wrap","div",data,function(x) { return 1 })
    .classed("svg-wrap",true)

  var categories = data.map(function(x) { return x.key })

  var max = d3.max(data,function(x) { return x.normalized_diff })
  var sampmax = d3.max(data,function(x) { return -x.normalized_diff})

  var xsampscale = d3.scale.linear()
    .domain([0,sampmax])
    .range([0,150]);

  var xscale = d3.scale.linear()
    .domain([0,max])
    .range([0,150]);

  var height = 20

  var yscale = d3.scale.linear()
    .domain([0,categories.length])
    .range([0,categories.length*height]);

  var canvas = d3_updateable(wrap,"svg","svg",false,function() { return 1})
    .attr({'width':450,'height':categories.length*height + 30});

  var xAxis = d3.svg.axis();
  xAxis
    .orient('bottom')
    .scale(xscale)

  var yAxis = d3.svg.axis();
  yAxis
    .orient('left')
    .scale(yscale)
    .tickSize(2)
    .tickFormat(function(d,i){ return categories[i]; })
    .tickValues(d3.range(categories.length));

  var y_xis = d3_updateable(canvas,'g.y','g')
    .attr("class","y axis")
    .attr("transform", "translate(225,15)")
    .attr('id','yaxis')
    .call(yAxis);

  y_xis.selectAll("text")
    .attr("style","text-anchor: middle;")


  var chart = d3_updateable(canvas,'g.chart','g')
    .attr("class","chart")
    .attr("transform", "translate(300,0)")
    .attr('id','bars')
  
  var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x) { return x.key })
    .attr("class","pop-bar")
    .attr('height',height-4)
    .attr({'x':0,'y':function(d,i){ return yscale(i) + 8.5; }})
    .style('fill','#388e3c')
    .attr("width",function(x) { return xscale(x.normalized_diff) })

  var chart2 = d3_updateable(canvas,'g.chart2','g')
    .attr("class","chart2")
    .attr("transform", "translate(0,0)")
    .attr('id','bars')


  var sampbars = d3_splat(chart2,".samp-bar","rect",function(x) { return x}, function(x) { return x.key })
    .attr("class","samp-bar")
    .attr('height',height-4)
    .attr({'x':function(x) { return 150 - xsampscale(-x.normalized_diff)},'y':function(d,i){ return yscale(i) + 8.5; }})
    .style('fill','#d32f2f')
    .attr("width",function(x) { return xsampscale(-x.normalized_diff) })

  y_xis.exit().remove()

  chart.exit().remove()

  bars.exit().remove()
  sampbars.exit().remove()

}

function drawCategory(target,data) {

  var w = d3_updateable(target,"div.category","div",false,function() { return 1})
    .classed("category",true)
    .style("width","50%")
    .style("display","inline-block")
    .style("background-color", "#e3ebf0")
    .style("padding-left", "10px")
    .style("min-height","580px")


  d3_updateable(w,"h3","h3")
    .text("Categories visited for filtered versus all views")
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

  var wrap = d3_updateable(w,".svg-wrap","div",data,function(x) { return 1 })
    .classed("svg-wrap",true)

  var categories = data.map(function(x) { return x.key })

  var max = d3.max(data,function(x) { return x.pop })
  var sampmax = d3.max(data,function(x) { return x.samp })


  var xsampscale = d3.scale.linear()
    .domain([0,sampmax])
    .range([0,300]);



  var xscale = d3.scale.linear()
    .domain([0,max])
    .range([0,300]);

  var height = 20

  var yscale = d3.scale.linear()
    .domain([0,categories.length])
    .range([0,categories.length*height]);

  var canvas = d3_updateable(wrap,"svg","svg",false,function() { return 1})
    .attr({'width':450,'height':categories.length*height + 30});

  var xAxis = d3.svg.axis();
  xAxis
    .orient('bottom')
    .scale(xscale)

  //  .tickValues(tickVals);

  var yAxis = d3.svg.axis();
  yAxis
    .orient('left')
    .scale(yscale)
    .tickSize(2)
    .tickFormat(function(d,i){ return categories[i]; })
    .tickValues(d3.range(categories.length));

  var y_xis = d3_updateable(canvas,'g.y','g')
    .attr("class","y axis")
    .attr("transform", "translate(150,15)")
    .attr('id','yaxis')
    .call(yAxis);

  var x_xis = d3_updateable(canvas,'g.x','g')
    .attr("class","x axis")
    .attr("transform", "translate(150," + categories.length*height+ ")")
    .attr('id','xaxis')
    .call(xAxis);

  var chart = d3_updateable(canvas,'g.chart','g')
    .attr("class","chart")
    .attr("transform", "translate(150,0)")
    .attr('id','bars')
  
  var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x) { return x.key })
    .attr("class","pop-bar")
    .attr('height',height-2)
    .attr({'x':0,'y':function(d,i){ return yscale(i) + 7.5; }})
    .style('fill','gray')
    .attr("width",function(x) { return xscale(x.pop) })

  var sampbars = d3_splat(chart,".samp-bar","rect",function(x) { return x}, function(x) { return x.key })
    .attr("class","samp-bar")
    .attr('height',height-10)
    .attr({'x':0,'y':function(d,i){ return yscale(i) + 11.5; }})
    .style('fill','#081d58')
    .attr("width",function(x) { return xsampscale(x.samp || 0) })

  y_xis.exit().remove()
  x_xis.exit().remove()
  chart.exit().remove()

  bars.exit().remove()
  sampbars.exit().remove()

}

function drawKeywords(target,data) {

  var w = d3_updateable(target,"div.keyword","div",false,function() { return 1})
    .classed("keyword",true)
    .style("width","50%")
    .style("display","inline-block")
    .style("background-color", "#e3ebf0")
    .style("padding-left", "10px")
    .style("min-height","580px")
    .style("vertical-align","top")



  d3_updateable(w,"h3","h3")
    .text("Keywords visited for filtered versus all views")
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

  var wrap = d3_updateable(w,".svg-wrap","div",data,function(x) { return 1 })
    .classed("svg-wrap",true)

  var categories = data.map(function(x) { return x.key })

  var max = d3.max(data,function(x) { return x.pop })
  var sampmax = d3.max(data,function(x) { return x.samp })

  var xsampscale = d3.scale.linear()
    .domain([0,sampmax])
    .range([0,300]);

  var xscale = d3.scale.linear()
    .domain([0,max])
    .range([0,300]);

  var height = 20

  var yscale = d3.scale.linear()
    .domain([0,categories.length])
    .range([0,categories.length*height]);

  var canvas = d3_updateable(wrap,"svg","svg")
    .attr({'width':450,'height':categories.length*height + 30});

  var xAxis = d3.svg.axis();
  xAxis
    .orient('bottom')
    .scale(xscale)

  //  .tickValues(tickVals);

  var yAxis = d3.svg.axis();
  yAxis
    .orient('left')
    .scale(yscale)
    .tickSize(2)
    .tickFormat(function(d,i){ return categories[i]; })
    .tickValues(d3.range(categories.length));

  var y_xis = d3_updateable(canvas,'g.y','g')
    .attr("class","y axis")
    .attr("transform", "translate(150,15)")
    .attr('id','yaxis')
    .call(yAxis);

  var x_xis = d3_updateable(canvas,'g.x','g')
    .attr("class","x axis")
    .attr("transform", "translate(150," + categories.length*height+ ")")
    .attr('id','xaxis')
    .call(xAxis);

  var chart = d3_updateable(canvas,'g.chart','g')
    .attr("class","chart")
    .attr("transform", "translate(150,0)")
    .attr('id','bars')
  
  var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x) { return x.key })
    .attr("class","pop-bar")
    .attr('height',height-2)
    .attr({'x':0,'y':function(d,i){ return yscale(i) + 7.5; }})
    .style('fill','gray')
    .attr("width",function(x) { return xscale(x.pop) })

  var sampbars = d3_splat(chart,".samp-bar","rect",function(x) { return x}, function(x) { return x.key })
    .attr("class","samp-bar")
    .attr('height',height-10)
    .attr({'x':0,'y':function(d,i){ return yscale(i) + 11.5; }})
    .style('fill','#081d58')
    .attr("width",function(x) { return xsampscale(x.samp || 0) })

  y_xis.exit().remove()
  x_xis.exit().remove()
  chart.exit().remove()

  bars.exit().remove()
  sampbars.exit().remove()





}

function drawKeywordDiff(target,data) {

  var w = d3_updateable(target,"div.keyword-diff","div",false,function() { return 1})
    .classed("keyword-diff",true)
    .style("width","50%")
    .style("display","inline-block")
    .style("background-color", "#e3ebf0")
    .style("padding-left", "10px")
    .style("min-height","580px")


  d3_updateable(w,"h3","h3")
    .text("Category indexing versus comp")
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

  var wrap = d3_updateable(w,".svg-wrap","div",data,function(x) { return 1 })
    .classed("svg-wrap",true)

  var categories = data.map(function(x) { return x.key })

  var max = d3.max(data,function(x) { return x.normalized_diff })
  var sampmax = d3.max(data,function(x) { return -x.normalized_diff})


  var xsampscale = d3.scale.linear()
    .domain([0,sampmax])
    .range([0,150]);

  var xscale = d3.scale.linear()
    .domain([0,max])
    .range([0,150]);

  var height = 20

  var yscale = d3.scale.linear()
    .domain([0,categories.length])
    .range([0,categories.length*height]);

  var canvas = d3_updateable(wrap,"svg","svg",false,function() { return 1})
    .attr({'width':450,'height':categories.length*height + 30});

  var xAxis = d3.svg.axis();
  xAxis
    .orient('bottom')
    .scale(xscale)

  var yAxis = d3.svg.axis();
  yAxis
    .orient('left')
    .scale(yscale)
    .tickSize(2)
    .tickFormat(function(d,i){ return categories[i]; })
    .tickValues(d3.range(categories.length));

  var y_xis = d3_updateable(canvas,'g.y','g')
    .attr("class","y axis")
    .attr("transform", "translate(225,15)")
    .attr('id','yaxis')
    .call(yAxis);

  y_xis.selectAll("text")
    .attr("style","text-anchor: middle;")


  var chart = d3_updateable(canvas,'g.chart','g')
    .attr("class","chart")
    .attr("transform", "translate(300,0)")
    .attr('id','bars')
  
  var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x) { return x.key })
    .attr("class","pop-bar")
    .attr('height',height-4)
    .attr({'x':0,'y':function(d,i){ return yscale(i) + 8.5; }})
    .style('fill','#388e3c')
    .attr("width",function(x) { return xscale(x.normalized_diff) })

  var chart2 = d3_updateable(canvas,'g.chart2','g')
    .attr("class","chart2")
    .attr("transform", "translate(0,0)")
    .attr('id','bars')


  var sampbars = d3_splat(chart2,".samp-bar","rect",function(x) { return x}, function(x) { return x.key })
    .attr("class","samp-bar")
    .attr('height',height-4)
    .attr({'x':function(x) { return 150 - xsampscale(-x.normalized_diff)},'y':function(d,i){ return yscale(i) + 8.5; }})
    .style('fill','#d32f2f')
    .attr("width",function(x) { return xsampscale(-x.normalized_diff) })

  y_xis.exit().remove()

  chart.exit().remove()

  bars.exit().remove()
  sampbars.exit().remove()

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
        .classed("cat-row",true)
        .style("padding-bottom","10px")

      var keywrap = d3_updateable(wrap,".key-row","div")
        .classed("key-row",true)
        .style("padding-bottom","10px")

      var bawrap = d3_updateable(wrap,".ba-row","div",false,function() { return 1})
        .classed("ba-row",true)
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

      var before = d3_updateable(bawrap,".before","div",this._before,function() { return 1})
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



      //drawStream(before,this._before)

      beforeBlocks(before,this._before)

      function buildData(data,buckets,pop_categories) {

       



        var times = d3.nest()
          .key(function(x) { return x.time_diff_bucket })
          .map(data.filter(function(x){ return x.parent_category_name != "" }) )

        var cats = d3.nest()
          .key(function(x) { return x.parent_category_name })
          .map(data.filter(function(x){ return x.parent_category_name != "" }) )




        var time_categories = buckets.reduce(function(p,c) { p[c] = {}; return p }, {})
        var category_times = Object.keys(cats).reduce(function(p,c) { p[c] = {}; return p }, {})


        var categories = d3.nest()
          .key(function(x) { return x.parent_category_name })
          .key(function(x) { return x.time_diff_bucket })
          .entries(data.filter(function(x){ return x.parent_category_name != "" }) )
          .map(function(row) {
            row.values.map(function(t) {
              t.percent = d3.sum(t.values,function(d){ return d.uniques})/ d3.sum(times[t.key],function(d) {return d.uniques}) 
              time_categories[t.key][row.key] = t.percent
              category_times[row.key][t.key] = t.percent

            })
            return row
          })
          .sort(function(a,b) { return ((pop_categories[b.key] || {}).normalized_pop || 0)- ((pop_categories[a.key] || {}).normalized_pop || 0) })


        var time_normalize_scales = {}

        d3.entries(time_categories).map(function(trow) {
          var values = d3.entries(trow.value).map(function(x) { return x.value })
          time_normalize_scales[trow.key] = d3.scale.linear()
            .domain([d3.min(values),d3.max(values)])
            .range([0,1])
        })

        var cat_normalize_scales = {}

        d3.entries(category_times).map(function(trow) {
          var values = d3.entries(trow.value).map(function(x) { return x.value })
          cat_normalize_scales[trow.key] = d3.scale.linear()
            .domain([d3.min(values),d3.max(values)])
            .range([0,1])
        })

        categories.map(function(p) {
          var cat = p.key
          p.values.map(function(q) {
            q.norm_cat = cat_normalize_scales[cat](q.percent)
            q.norm_time = time_normalize_scales[q.key](q.percent)

            q.score = 2*q.norm_cat/3 + q.norm_time/3
            q.score = q.norm_time

            var percent_pop = pop_categories[cat] ? pop_categories[cat].percent_pop : 0

            q.percent_diff = (q.percent - percent_pop)/percent_pop

          })
        })

        return [categories,time_normalize_scales,cat_normalize_scales]
      }

      function beforeBlocks(wrap,all_data,sortby) {

        var inner = d3_updateable(wrap,".inner","div")
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

        select(inner)
          .options([
              {"key":"Importance","value":"percent_diff"}
            , {"key":"Activity","value":"score"}
            , {"key":"Population","value":"pop"}

          ])
          .on("select", function(x){
            beforeBlocks(wrap,all_data,x.value)
          })
          .draw()

        inner.selectAll("select")
          .style("min-width","140px")
        
        var before = all_data.before
         , after = all_data.after
         , cats = all_data.category.map(function(p) { return p.key })
         , pop_categories = all_data.category.reduce(function(p,c) { p[c.key] = c; return p }, {})

        var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })

        var arr = buildData(before,buckets,pop_categories)
          , before_categories = arr[0]
          , before_time_normalize_scales = arr[1]
          , before_cat_normalize_scales = arr[2]



        var arr = buildData(after,buckets,pop_categories)
          , after_categories = arr[0]
          , after_time_normalize_scales = arr[1]


        if (sortby == "score") {

          before_categories = before_categories.sort(function(a,b) { 
            var p = -1, q = -1;
            try { p = b.values.filter(function(x){ return x.key == "600" })[0].score } catch(e) {}
            try { q = a.values.filter(function(x){ return x.key == "600" })[0].score } catch(e) {}
            return d3.ascending(p, q)
          })
          
        } else if (sortby == "pop") {

          before_categories = before_categories.sort(function(a,b) { 
            var p = cats.indexOf(a.key)
              , q = cats.indexOf(b.key)
            return d3.ascending(p > -1 ? p : 10000, q > -1 ? q : 10000)
          })

        } else {

          before_categories = before_categories.sort(function(a,b) { 
            var p = -1, q = -1;
            try { p = b.values.filter(function(x){ return x.key == "600" })[0].percent_diff } catch(e) {}
            try { q = a.values.filter(function(x){ return x.key == "600" })[0].percent_diff } catch(e) {}
            return d3.ascending(p, q)
          })

          
        }

        var order = before_categories.map(function(x) { return x.key })

        after_categories = after_categories.filter(function(x) { return order.indexOf(x.key) > -1 }).sort(function(a,b) {
          return order.indexOf(a.key) - order.indexOf(b.key)
        })

        console.log(after_categories.map(function(x) { return x.key }) )

        
        var height = 20 
        var space = 14 
        var middle = 180

        var yscale = d3.scale.linear()
          .domain([0,before_categories.length])
          .range([0,before_categories.length*height]);
      
        var svg = d3_updateable(wrap,"svg","svg",false,function() { return 1})
          .style("margin-left","10px")
          .style("margin-top","-5px")
          .attr({'width':buckets.length*(height+space)*2+middle,'height':before_categories.length*height + 165})
          .attr("xmlns", "http://www.w3.org/2000/svg")

        var canvas = d3_updateable(svg,".canvas","g")
          .attr("class","canvas")
          .attr("transform", "translate(0,140)")

        var xscale = d3.scale.ordinal()
          .domain(buckets)
          .range(d3.range(0,buckets.length*(height+space),(height+space)));

        var xscalereverse = d3.scale.ordinal()
          .domain(buckets.reverse())
          .range(d3.range(0,buckets.length*(height+space),(height+space)));



        var rscale = d3.scale.pow()
          .exponent(0.5)
          .domain([0,1])
          .range([.35,1])
      

        var oscale = d3.scale.quantize()
          .domain([-1,1])
          //.range(['#ffffd9','#edf8b1','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#253494','#081d58'])
          .range(['#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#08519c','#08306b'])
          //.range(['#d73027','#f46d43','#fdae61','#ffffbf','#d9ef8b','#91cf60','#1a9850'])

        var legendtw = 80


        var sort = d3_updateable(canvas,'g.sort','g')
          .attr("class","sort")
          .attr("transform","translate(0,-130)")



        
 


        var legend = d3_updateable(canvas,'g.legend','g')
          .attr("class","legend")
          .attr("transform","translate(" + (buckets.length*(height+space)*2+middle-310) + ",-130)")

        var size = d3_updateable(legend,'g.size','g')
          .attr("class","size")
          .attr("transform","translate(" + (legendtw+10) + ",0)")

        d3_updateable(size,"text.more","text")
          .attr("class","more axis")
          .attr("x",-legendtw)
          .html("more activity")
          .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")

          .attr("dominant-baseline", "central")

        d3_updateable(size,"text.more-arrow","text")
          .attr("class","more-arrow axis")
          .attr("x",-legendtw-10)
          .html("&#9664;")
          .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")

.style("font-size",".7em")
          .attr("dominant-baseline", "central")




        d3_updateable(size,"text.less","text")
          .attr("class","less axis")
          .attr("x",(height+4)*5+legendtw)
          .style("text-anchor","end")
          .html("less activity")
          .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")

          .attr("dominant-baseline", "central")

        d3_updateable(size,"text.less-arrow","text")
          .attr("class","less-arrow axis")
          .attr("x",(height+4)*5+legendtw+10)
          .html("&#9654;")
          .style("text-anchor","end")
          .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
.style("font-size",".7em")

          .attr("dominant-baseline", "central")


        d3_splat(size,"circle","circle",[1,.6,.3,.1,0])
          .attr("r",function(x) { return (height-2)/2*rscale(x) })
          .attr('cx', function(d,i) { return (height+4)*i+height/2})
          .attr('stroke', 'grey')
          .attr('fill', 'none')


        


        var size = d3_updateable(legend,'g.importance','g')
          .attr("class","importance")
          .attr("transform","translate("+ (legendtw+10) +",25)")

        d3_updateable(size,"text.more","text")
          .attr("class","more axis")
          .attr("x",-legendtw)
          .html("more important")
          .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
          .attr("dominant-baseline", "central")

        d3_updateable(size,"text.more-arrow","text")
          .attr("class","more-arrow axis")
          .attr("x",-legendtw-10)
          .html("&#9664;")
          .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
.style("font-size",".7em")

          .attr("dominant-baseline", "central")



        d3_updateable(size,"text.less","text")
          .attr("class","less axis")
          .attr("x",(height+4)*5+legendtw)
          .style("text-anchor","end")
          .html("less important")
          .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
          .attr("dominant-baseline", "central")

        d3_updateable(size,"text.less-arrow","text")
          .attr("class","less-arrow axis")
          .attr("x",(height+4)*5+legendtw+10)
          .html("&#9654;")
          .style("text-anchor","end")
          .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
          .style("font-size",".7em")
          .attr("dominant-baseline", "central")


        d3_splat(size,"circle","circle",[1,.75,.5,.25,0])
          .attr("r",height/2-2)
          .attr("fill",function(x) { return oscale(x) })
          .attr("opacity",function(x) { return rscale(x/2 + .2) })
          .attr('cx', function(d,i) { return (height+4)*i+height/2 })
        


        


      
        var xAxis = d3.svg.axis();
        xAxis
          .orient('top')
          .scale(xscalereverse)
          .tickFormat(function(x) { 
            if (x == 3600) return "1 hour"
            if (x < 3600) return x/60 + " mins" 

            if (x == 86400) return "1 day"
            if (x > 86400) return x/86400 + " days" 

            return x/3600 + " hours"
          })

        var x_xis = d3_updateable(canvas,'g.x.before','g')
          .attr("class","x axis before")
          .attr("transform", "translate(" + (height + space)+ ",-4)")
          .attr('id','xaxis')
          .call(xAxis);

              
        x_xis.selectAll("text")
          .attr("y", -8)
          .attr("x", -8)
          .attr("dy", ".35em")
          .attr("transform", "rotate(45)")
          .style("text-anchor", "end")

        x_xis.selectAll("line")
          .attr("style","stroke:black")

        x_xis.selectAll("path")
          .attr("style","stroke:black; display:inherit")

        d3_updateable(x_xis,"text.title","text")
          .attr("class","title")
          .attr("x",buckets.length*(height+space)/2 - height+space )
          .attr("y",-53)
          .attr("transform",undefined)
          .style("text-anchor", "middle")
          .style("text-transform", "uppercase")
          .style("font-weight", "bold")
          .text("before arriving")



        var xAxis = d3.svg.axis();
        xAxis
          .orient('top')
          .scale(xscale)
          .tickFormat(function(x) { 
            if (x == 3600) return "1 hour"
            if (x < 3600) return x/60 + " mins" 

            if (x == 86400) return "1 day"
            if (x > 86400) return x/86400 + " days" 

            return x/3600 + " hours"
          })

        var x_xis = d3_updateable(canvas,'g.x.after','g')
          .attr("class","x axis after")
          .attr("transform", "translate(" + (buckets.length*(height+space)+middle) + ",0)")
          .attr('id','xaxis')
          .call(xAxis);
      
        x_xis.selectAll("text")
          .attr("y", -8)
          .attr("x", 8)
          .attr("dy", ".35em")
          .attr("transform", "rotate(-45)")
          .style("text-anchor", "start")

        x_xis.selectAll("line")
          .attr("style","stroke:black")

        x_xis.selectAll("path")
          .attr("style","stroke:black; display:inherit")

        d3_updateable(x_xis,"text.title","text")
          .attr("class","title")
          .attr("x",buckets.length*(height+space)/2  )
          .attr("y",-53)
          .attr("transform",undefined)
          .style("text-anchor", "middle")
          .style("text-transform", "uppercase")
          .style("font-weight", "bold")
          .text("after leaving")






      
        var yAxis = d3.svg.axis();
        yAxis
          .orient('left')
          .scale(yscale)
          .tickSize(2)
          .tickFormat(function(d,i){ return before_categories[i].key; })
          .tickValues(d3.range(before_categories.length));


      
        var y_xis = d3_updateable(canvas,'g.y','g')
          .attr("class","y axis")
          .attr("transform", "translate(" + (buckets.length*(height+space)+0) + ",15)")
          .attr('id','yaxis')


        y_xis
          .call(yAxis);

        y_xis.selectAll("line")
          .attr("x2",18)
          .attr("x1",22)
          .style("stroke-dasharray","0")
          .remove()


        y_xis.selectAll("path")
          .attr("x2",18)
          .attr("transform","translate(18,0)") 
          //.style("stroke","black")



          //.remove()

      
        y_xis.selectAll("text")
          .attr("style","text-anchor: middle; font-weight:bold; fill: #333")
          .attr("x",middle/2)


        var chart_before = d3_updateable(canvas,'g.chart-before','g',before_categories,function() { return 1 })
          .attr("class","chart-before")
          .attr("transform", "translate(" + buckets.length*(height+space) + ",0)")
          .attr('id','bars')


        var rows = d3_splat(chart_before,".row","g",function(x) { return x }, function(x) { return x.key })
          .attr("class","row")
          .attr({'transform':function(d,i){ return "translate(0," + (yscale(i) + 7.5) + ")"; } })
          .attr({'label':function(d,i){ return d.key; } })

        rows.exit().remove()


        // COLOR: importance versus normal for that category
        // SIZE: % of time spent during time period

        
        var bars = d3_splat(rows,".pop-bar","circle",function(x) { return x.values }, function(x) { return x.key })
          .attr("class","pop-bar")
          .attr('cy',(height-2)/2)
          .attr({'cx':function(d,i) { return -xscale(d.key)}})

          .attr("opacity",function(x){
            var norm_cat = x.norm_cat

            return .8 //rscale(norm_cat)
          })
          .attr("r",function(x) {
            var norm_cat = x.norm_cat
            var norm_time = x.norm_time

            //console.log(norm_cat + norm_time)
            //return (height-2)/2 * rscale(norm_cat/3 + 2*norm_time/3)

            return (height)/2 * rscale(norm_time)
          })

          .style("fill",function(x) { 

            var d = this.parentNode.__data__

            var norm_time = before_time_normalize_scales[x.key](x.percent)
              , norm_pop = pop_categories[d.key] ? pop_categories[d.key].normalized_pop : 1

            var percent_pop = pop_categories[d.key] ? pop_categories[d.key].percent_pop : 0

            //var percent_diff = (norm_time - norm_pop)/norm_pop
            //console.log(norm_time, norm_pop,percent_diff)
            //var percent_diff = (x.percent - percent_pop)/percent_pop
            var percent_diff = x.percent_diff
            return oscale(percent_diff)
          })

        var chart_after = d3_updateable(canvas,'g.chart-after','g',after_categories,function() { return 1 })
          .attr("class","chart-after")
          .attr("transform", "translate(" + (buckets.length*(height+space)+middle) + ",0)")
          .attr('id','bars')


        var rows = d3_splat(chart_after,".row","g",function(x) { return x }, function(x) { return x.key })
          .attr("class","row")
          .attr({'transform':function(d,i){ return "translate(0," + (yscale(i) + 7.5) + ")"; } })
          .attr({'label':function(d,i){ return d.key; } })

        rows.exit().remove()


        
        var bars = d3_splat(rows,".pop-bar","circle",function(x) { return x.values }, function(x) { return x.key })
          .attr("class","pop-bar")
          .attr('cy',(height-2)/2)
          .attr({'cx':function(d,i) { return xscale(d.key)}})
          .attr("r",function(x) {
            return (height-2)/2 * rscale(after_time_normalize_scales[x.key](x.percent))
          })
          .style("fill",function(x) { 

            var d = this.parentNode.__data__

            var norm_time = after_time_normalize_scales[x.key](x.percent)
              , norm_pop = pop_categories[d.key] ? pop_categories[d.key].normalized_pop : 1

            var percent_pop = pop_categories[d.key] ? pop_categories[d.key].percent_pop : 0

            //var percent_diff = (norm_time - norm_pop)/norm_pop
            //console.log(norm_time, norm_pop,percent_diff)
            var percent_diff = (x.percent - percent_pop)/percent_pop
            return oscale(percent_diff)
          })
          .attr("opacity",".8")







      }

      function drawStream(target,data) {


        debugger

        var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })
        var units_in_bucket = buckets.map(function(x,i) { return x - (x[i-1]|| 0) })


        var stackable = data.map(function(d) { 
          var vmap = d.values.reduce(function(p,c) { p[c.key] = c.values; return p },{})

          var normalized_values = buckets.map(function(x,i) {
            return { x: parseInt(x), y: ((vmap[x] || []).length) / units_in_bucket[i] }
          })
          var extra = normalized_values.slice(0,1).map(function(x) { return {x:500,y:x.y} })

          return extra.concat(normalized_values)
        })

        
        var max = d3.max(buckets)

        var stack = d3.layout.stack().offset("silhouette")
        var stacked = stack(stackable)

        var width = 500
          , height = 300

        var color = d3.scale.category20()
          //.range(['#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3','#fdb462','#b3de69','#fccde5','#d9d9d9','#bc80bd','#ccebc5','#ffed6f']);

        var y = d3.scale.linear()
          .range([height,0])
          .domain([0,d3.max(stacked, function(layer) { return d3.max(layer,function(d) {return d.y0 + d.y })})])

        var x = d3.scale.linear()
          .domain([500,max])
          .range([0,width])

        var area = d3.svg.area()
.interpolate("cardinal")
          .x(function(d) { return width - x(d.x); })
          .y0(function(d) { return y(d.y0); })
          .y1(function(d) { return y(d.y0 + d.y); });

        var svg = target.append("svg")
          .attr("width", width)
          .attr("height", height + 30);
      
        svg.selectAll("path")
            .data(stacked)
          .enter().append("path")
            .attr("d", area)
            .style("fill", function(x,i) { return color(i); });

        

      }


      


      //var after = d3_updateable(bawrap,".after","div",this._after,function() { return 1})
      //  .classed("after",true)

      //d3_splat(after,".group","div",function(x){ return x }, function(x) { return x.key })
      //  .classed("group",true)
      //  .text(function(x) { return x.key + " : " + x.values.length })




      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}

