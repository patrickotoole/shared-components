import accessor from '../helpers'
import header from '../generic/header'
import button_radio from '../generic/button_radio'
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

function drawCategory(target,data) {

  var w = d3_updateable(target,"div.category","div",false,function() { return 1})
    .classed("category",true)
    .style("width","50%")
    .style("display","inline-block")
    .style("background-color", "#e3ebf0")
    .style("padding-left", "10px")
    .style("min-height","325px")


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
    .style("min-height","325px")
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
      drawKeywords(catwrap,this._keywords)     


      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}

