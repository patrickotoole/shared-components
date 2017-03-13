import accessor from '../helpers'
import header from '../generic/header'
import button_radio from '../generic/button_radio'
import select from '../generic/select'

import pie from '../generic/pie'
import diff_bar from '../generic/diff_bar'
import comp_bar from '../generic/comp_bar'
import comp_bubble from '../generic/comp_bubble'



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
    var vmap = d.values.reduce(function(p,c) { p[c.key] = c.values; return p },{})
    var vmap = d.values.reduce(function(p,c) { p[c.key] = c.norm_cat; return p },{})


    var normalized_values = buckets.map(function(x,i) {
      if (x == 0) return { key: d.key, x: parseInt(x), y: (vmap["600"] || 0) }
      return { key: d.key, x: parseInt(x), y: (vmap[x] || 0) }
    })


    return normalized_values
    //return e2.concat(normalized_values)//.concat(extra)
  })


  stackable = stackable.sort((p,c) => p[0].y - c[0].y).reverse().slice(0,12)

  return stackable

}

function drawStream(target,before,after) {

  var buckets = [0,10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })

  var stackable = buildStreamData(before,buckets)
  var stack = d3.layout.stack().offset("wiggle").order("reverse")
  var before_stacked = stack(stackable)

  var order = before_stacked.map(item => item[0].key)

  var stackable = buildStreamData(after,buckets)
    .sort(function(p,c) { return order.indexOf(c[0].key) - order.indexOf(p[0].key) })

  stackable = stackable.filter(x => order.indexOf(x[0].key) == -1).concat(stackable.filter(x => order.indexOf(x[0].key) > -1))

  var stack = d3.layout.stack().offset("wiggle").order("default")
  var after_stacked = stack(stackable)

  var width = 370
    , height = 250

  var color = d3.scale.ordinal()
    .domain(order)
    .range(
['#999','#aaa','#bbb','#ccc','#ddd','#eee','#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','rgba(33, 113, 181,.9)','rgba(8, 81, 156,.91)','#08519c','rgba(8, 48, 107,.9)','#08306b'].reverse())

  var y = d3.scale.linear()
    .range([height,0])
    .domain([0,d3.max(before_stacked, function(layer) { return d3.max(layer,function(d) {return d.y0 + d.y })})])

  var x = d3.scale.ordinal()
    .domain(buckets)
    .range(d3.range(0,width,width/(buckets.length-1)))

  var xreverse = d3.scale.ordinal()
    .domain(buckets.reverse())
    .range(d3.range(0,width+10,width/(buckets.length-1)))

  var barea = d3.svg.area()
    .interpolate("zero")
    .x(function(d) { return xreverse(d.x); })
    .y0(function(d) { return y(d.y0); })
    .y1(function(d) { return y(d.y0 + d.y); });

  var aarea = d3.svg.area()
    .interpolate("linear")
    .x(function(d) { return x(d.x); })
    .y0(function(d) { return y(d.y0); })
    .y1(function(d) { return y(d.y0 + d.y); });


  var svg = d3_updateable(target,"svg","svg")
    .attr("width", width*2+180)
    .attr("height", height + 70);

  var before = d3_updateable(svg,".before-canvas","g")
    .attr("class","before-canvas")
    .attr("transform", "translate(0,60)")

  var bpaths = d3_splat(before,"path","path", before_stacked,function(x,i) { return i})
    .attr("d", barea)
    .attr("class", function(x) { return x[0].key})
    .style("fill", function(x,i) { return color(x[0].key); })
    .on("mouseover",function(x) {
      apaths.style("opacity",".5")
      bpaths.style("opacity",".5")
      apaths.filter(y => y[0].key == x[0].key).style("opacity",undefined)
      d3.select(this).style("opacity",undefined)
    })
    .on("mouseout",function(x) {
      apaths.style("opacity",undefined)
      bpaths.style("opacity",undefined)
    })



  var after = d3_updateable(svg,".after-canvas","g")
    .attr("class","after-canvas")
    .attr("transform", "translate(" + (width + 180) + ",60)")

  var apaths = d3_splat(after,"path","path",after_stacked,function(x,i) { return i})
    .attr("d", aarea)
    .attr("class", function(x) { return x[0].key})
    .style("fill", function(x,i) { return color(x[0].key); })
    .on("mouseover",function(x) {
      apaths.style("opacity",".5")
      bpaths.style("opacity",".5")
      bpaths.filter(y => y[0].key == x[0].key).style("opacity",undefined)
      d3.select(this).style("opacity",undefined)
    })
    .on("mouseout",function(x) {
      apaths.style("opacity",undefined)
      bpaths.style("opacity",undefined)
    })



  function drawAxis(target,scale,text) {
    var xAxis = d3.svg.axis();
    xAxis
      .orient('top')
      .scale(scale)
      .tickFormat(function(x) { 
        if (x == 3600) return "1 hour"
        if (x < 3600) return x/60 + " mins" 

        if (x == 86400) return "1 day"
        if (x > 86400) return x/86400 + " days" 

        return x/3600 + " hours"
      })

    var x_xis = d3_updateable(target,'g.x.before','g')
      .attr("class","x axis before")
      .attr("transform", "translate(0,-5)")
      .attr('id','xaxis')
      .call(xAxis);

          
    x_xis.selectAll("text")
      .attr("y", -25)
      .attr("x", 15)
      .attr("dy", ".35em")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "end")

    x_xis.selectAll("line")
      .attr("style","stroke:black")

    x_xis.selectAll("path")
      .attr("style","stroke:black; display:inherit")

    d3_updateable(x_xis,"text.title","text")
      .attr("class","title")
      .attr("x",width/2)
      .attr("y",-46)
      .attr("transform",undefined)
      .style("text-anchor", "middle")
      .style("text-transform", "uppercase")
      .style("font-weight", "bold")
      .text(text + " ")

    return x_xis

  }

  var _x_xis = drawAxis(before,xreverse,"before arriving")

  _x_xis.selectAll("text").filter(function(y){
    return y == 0
  }).remove()

  var _x_xis = drawAxis(after,x,"after leaving")

  _x_xis.selectAll("text:not(.title)")
    .attr("transform", "rotate(-45)")
    .attr("x",20)
    .attr("y",-25)

  _x_xis.selectAll("text").filter(function(y){
    return y == 0
  }).remove()


  

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
        .classed("cat-row",true)
        .style("padding-bottom","10px")

      var keywrap = d3_updateable(wrap,".key-row","div")
        .classed("key-row",true)
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


      //drawCategory(catwrap,this._category)     
      //drawCategoryDiff(catwrap,this._category)     

      //drawKeywords(keywrap,this._keywords)     
      //drawKeywordDiff(keywrap,this._keywords)     

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

