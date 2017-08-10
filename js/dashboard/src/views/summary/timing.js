import {d3_class, d3_updateable, d3_splat} from '@rockerbox/helpers'
import {buildSummaryBlock} from './sample_vs_pop'

import * as timeseries from '../../generic/timeseries'

export function drawTimeseries(target,data,radius_scale) {
  var w = d3_updateable(target,"div.timeseries","div")
    .classed("timeseries",true)
    .style("width","60%")
    .style("display","inline-block")
    //.style("background-color", "#e3ebf0")
    .style("padding-left", "10px")
    .style("height","127px")



  var q = d3_updateable(target,"div.timeseries-details","div")
    .classed("timeseries-details",true)
    .style("width","40%")
    .style("display","inline-block")
    .style("vertical-align","top")
    .style("padding","15px")
    .style("padding-left","57px")
    //.style("background-color", "#e3ebf0")
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
    .text("Timing of segment versus baseline")
    .style("font-size","12px")
    .style("color","#333")
    .style("line-height","33px")
    .style("background-color","#f0f4f7")
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
