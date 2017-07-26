import {simpleTimeseries} from '@rockerbox/chart'
import {d3_class, d3_updateable, d3_splat} from '@rockerbox/helpers'

import comp_bubble from '../../generic/comp_bubble'
import stream_plot from '../../generic/stream_plot'

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


export function drawStreamSkinny(target,before,after,filter) {

  function extractData(b,a,buckets,accessor) {
    var bvolume = {}, avolume = {}
  
    try { var bvolume = b[0].reduce(function(p,c) { p[c.x] = accessor(c); return p },{}) } catch(e) {}
    try { var avolume = a[0].reduce(function(p,c) { p[c.x] = accessor(c); return p },{}) } catch(e) {}
  
    var volume = buckets.slice().reverse().map(x => bvolume[x] || 0).concat(buckets.map(x => avolume[x] || 0))
  
    return volume
  }

  var buckets = [0,10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })

  var data = streamData(before,after,buckets)
    , before_stacked = data.before_stacked
    , after_stacked = data.after_stacked

  var before = d3_class(target,"before-stream")


  var inner = d3_updateable(before,".inner","div")
    .classed("inner",true)


  var stream = stream_plot(inner)
    .width(341)
    .middle(0)
    .skip_middle(true)
    .data(data)
    .on("category.hover",function(x,time) {
      filter(x)
      if (x === false) {
        d3.select(".details-wrap").html("")
        return 
      }
      var b = data.before_stacked.filter(y => y[0].key == x)
      var a = data.after_stacked.filter(y => y[0].key == x)

      var volume = extractData(b,a,buckets,function(c) { return c.values.length })
        , percent = extractData(b,a,buckets,function(c) { return c.percent })
        , importance = extractData(b,a,buckets,function(c) { return c.y })


      var wrap = d3.select(".details-wrap")
        , title = d3_updateable(wrap,"text.cat-title","text")
            .text(x)
            .attr("class","cat-title")
            .style("text-anchor","middle")
            .style("font-weight","bold")
            .attr("x",125)
            .attr("y",10)
        , vwrap = d3_updateable(wrap,".volume","g")
            .attr("class","volume")
            .attr("transform","translate(15,30)")


      d3_updateable(vwrap,"text","text").text("Visits: " + d3.sum(volume) )
        .attr("style","title")

      return
    })
    .draw()


  var before_agg = before_stacked.reduce((o,x) => { return x.reduce((p,c) => { p[c.x] = (p[c.x] || 0) + c.y; return p},o) },{})
    , after_agg = after_stacked.reduce((o,x) => { return x.reduce((p,c) => { p[c.x] = (p[c.x] || 0) + c.y; return p},o) },{})


  var local_before = Object.keys(before_agg).reduce((minarr,c) => {
      if (minarr[0] >= before_agg[c]) return [before_agg[c],c];
      if (minarr.length > 1) minarr[0] = -1;
      return minarr
    },[Infinity]
  )[1]

  var local_after = Object.keys(after_agg).reduce((minarr,c) => {
      if (minarr[0] >= after_agg[c]) return [after_agg[c],c];
      if (minarr.length > 1) minarr[0] = -1;
      return minarr
    },[Infinity]
  )[1]


  var before_line = buckets[buckets.indexOf(parseInt(local_before))]
    , after_line = buckets[buckets.indexOf(parseInt(local_after))]

  var svg = stream
    ._svg.style("margin","auto").style("display","block")

  var mline = d3_updateable(svg,"g.m-line-wrap","g")
    .attr("class","m-line-wrap")

  d3_updateable(mline,"line","line")
    .attr("stroke-width",30)
    .attr("stroke","white")
    .attr("y1", 60)
    .attr("y2", stream._height+60)
    .attr("x1", 341)
    .attr("x2", 341)

  var m = d3_updateable(mline,"g","g")
    .attr("writing-mode","tb-rl")
    .attr("transform","translate(341," + (stream._height/2 + 60) + ")")

  d3_updateable(m,"text","text")
    .text("User activity on your site")
    .style("text-anchor","middle")




  var title = d3_updateable(svg,".main-title","text")
    .attr("x","341")
    .attr("y","30")
    .style("text-anchor","middle")
    .style("font-weight","bold")
    .attr("class","main-title")
    .text("Category Importance of User's Journey to site (hover to explore, click to select)")

  var title = d3_updateable(svg,".second-title","text")
    .attr("x","341")
    .attr("y","345")
    .style("text-anchor","middle")
    .style("font-weight","bold")
    .attr("class","second-title")
    .text("Time weighted volume")




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
    .attr("y", 20)
    .attr("x", stream._before_scale(before_line) - 10)
    .style("text-anchor","end")
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
    .attr("y", 20)
    .attr("x", stream._after_scale(after_line) + 10)
    .style("text-anchor","start")
    .text("Validation / Research")



  return {
    "consideration": "" + before_line,
    "validation": "-" + after_line
  }
}


export function drawStream(target,before,after) {

  function extractData(b,a,buckets,accessor) {
    var bvolume = {}, avolume = {}
  
    try { var bvolume = b[0].reduce(function(p,c) { p[c.x] = accessor(c); return p },{}) } catch(e) {}
    try { var avolume = a[0].reduce(function(p,c) { p[c.x] = accessor(c); return p },{}) } catch(e) {}
  
    var volume = buckets.slice().reverse().map(x => bvolume[x] || 0).concat(buckets.map(x => avolume[x] || 0))
  
    return volume
  }

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
      if (minarr[0] >= before_agg[c]) return [before_agg[c],c];
      if (minarr.length > 1) minarr[0] = -1;
      return minarr
    },[Infinity]
  )[1]

  var local_after = Object.keys(after_agg).reduce((minarr,c) => {
      if (minarr[0] >= after_agg[c]) return [after_agg[c],c];
      if (minarr.length > 1) minarr[0] = -1;
      return minarr
    },[Infinity]
  )[1]


  var before_line = buckets[buckets.indexOf(parseInt(local_before))]
    , after_line = buckets[buckets.indexOf(parseInt(local_after))]

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
    .attr("x", stream._before_scale(before_line) + 10)
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



  return {
    "consideration": "" + before_line,
    "validation": "-" + after_line
  }
}

export function drawBeforeAndAfter(target,data) {

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
