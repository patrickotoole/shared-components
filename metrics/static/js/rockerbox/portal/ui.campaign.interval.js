var RB = RB || {}
RB.portal = RB.portal || {}
RB.portal.UI = RB.portal.UI || {}

RB.portal.UI.intervalSelector = (function(intervalSelector) {

  var UI = RB.portal.UI

  intervalSelector.update_current = function(current){
    current.chart.redraw()
  }

  intervalSelector.build = function(wrapper,callback,only,current) {
 
    var chartHolder = {
      "chart":current,
      "value":"weekly"
    }
    var only = only || ["Day", "Week", "Month"]
    var options = UI.constants.INTERVAL_OPTIONS.filter(function(x){
      return only.indexOf(x.key) > -1
    })

    var buildCallbackWithCurrent = function() {

      return function(x,y) {
        wrapper.selectAll(".interval-select-span")
          .classed("datetime",x.value == "datetime") 
          .classed("daily",x.value == "daily")
          .classed("weekly",x.value == "weekly")
          .classed("monthly",x.value == "monthly")  
        callback.bind(this)(x,y,chartHolder)
        intervalSelector.update_current(chartHolder)
      }
    }
 
    wrapper.append("span")
      .classed("interval-select-span weekly",true)
        .style("font-size","11px") // TODO: move this to style sheet
        .style("font-weight","normal")
        .style("text-transform","uppercase")
        .style("line-height","35px")
        .style("float","right")
        .selectAll(".interval-type")
        .data(options)
        .enter()
          .append("span")
          .style("margin-left","15px")
          .attr("class",function(x,i){return "interval-type " + x.value + " " })
          .text(function(x){return x.key})
          .on("click",buildCallbackWithCurrent())

    return chartHolder
  
  }

  return intervalSelector
 

})(RB.portal.UI.intervalSelector || {})


 
