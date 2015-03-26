var RB = RB || {}
RB.portal = RB.portal || {}
RB.portal.UI = RB.portal.UI || {}
 
RB.portal.UI.selectorLegend = (function(selectorLegend){

  var UI = RB.portal.UI

  selectorLegend.setMetricType = function(obj,x) {
    obj
      .classed("raw",function(d){return x == "Raw"})
      .classed("rate",function(d){return x == "Rate"})
      .classed("cost_rate",function(d){return x == "Cost"})  
  }

  selectorLegend.getMetricKey = function(obj) {
    return obj.classed("imps") ? "imps" :
      obj.classed("clicks") ? "clicks" : 
      obj.classed("conversions") ? "conversions" : 
      obj.classed("views") ? "views" : 
      obj.classed("visits") ? "visits" : 
      obj.classed("cost") ? "cost" : "" 
  }

  selectorLegend.getMetricType = function(obj) {
    return obj.classed("raw") ? "raw" :
      obj.classed("cost_rate") ? "cost_rate" :
      obj.classed("rate") ? "rate" : ""
  }

  selectorLegend.header = function(wrapper) {
    
    var metric = wrapper.append("h5")   
      .classed("row header",true)                    
    
    metric.append("span")
      .text("Metrics")

    var metricSpan = metric.append("span") 
      .classed("metric-span raw",true) 

    var metricTypes = metricSpan
      .selectAll(".metric-type")
      .data(["Raw","Rate","Cost"])
        .enter()
          .append("span")
          .attr("class",function(x) { 
            return "metric-type " + 
              ((x != "Cost") ? x.toLowerCase() : "cost_rate") 
          })
          .text(function(x){return x})
          .on("click",function(x){
            var current = d3.select(this)
            var type_wrapper = d3.select(this.parentNode.parentNode.parentNode)
              .select(".series-selector")
             
            
            selectorLegend.setMetricType(metricSpan,x)
            selectorLegend.setMetricType(d3.selectAll(".details-table"),x)
            selectorLegend.setMetricType(d3.selectAll(".series-selector"),x)

            
            var metric_name = selectorLegend.getMetricKey(type_wrapper)
            var metric_type = selectorLegend.getMetricType(metricSpan)

            selectMetric(metric_name,metric_type)

          })   
  }

  selectorLegend.dateHeader = function(wrapper) {
    var currentInterval = wrapper.append("h5")
      .classed("row",true)
      .attr("style","border-bottom: 1px solid #ccc; line-height: 35px; margin-top: 0px; padding-left: 10px;")

    currentInterval.append("span")
      .text("Date Range: ")

    currentInterval.append("span") 
      .classed("interval-span",true)
        .style("font-size","11px")
        .style("font-weight","normal")
        .style("line-height","25px")
        .style("padding-left","12px")
  }

  selectorLegend.series = function(wrapper) {
    var series = wrapper.append("div")
      .classed("row raw series-selector",true)
      .style("padding","10px")
      .selectAll(".series-selction")
      .data(function(x){
        var flat = []  
        UI.constants.HEADINGS.map(function(y){y.values.map(function(z){flat.push(z)})})
        return flat
      })
      .enter().append("div")

    series
      .classed("col-md-6",true)
        .attr("class",function(d){
          return "col-md-6 metric " + d.key + " " + d.id
        })
        .style("border-left",function(d){return "5px solid" + UI.constants.HEADER_COLORS(d.id)})
        .style("padding-bottom","3px")
        .style("padding-left","5px")
        .style("font-size","11px")
        .style("font-weight","500")
        .style("line-height","25px")
        .style("margin-bottom","3px")
        .style("text-transform","uppercase")
        .text(function(d){return d.value})
        .on("click",function(x){

          var metric_name = x.id;
          var metric_type = selectorLegend.getMetricType(d3.select(this.parentNode))

          selectMetric(metric_name,metric_type)
        
        })
      }

      selectorLegend.build = function(wrapper) {
        wrapper.classed("selector-legend",true)
        selectorLegend.header(wrapper)
        selectorLegend.series(wrapper)
        selectorLegend.dateHeader(wrapper) 
        wrapper.append("div")
          .classed("col-md-12",true)
          .style("height","10px")              
        wrapper.append("div").classed("interval-chart dc-chart",true)
          .style("width","100%")
          .style("display","block")
          .attr("id",function(x,i){return "interval-chart-"+i})
                
      
      }

  return selectorLegend

})(RB.portal.UI.selectorLegend || {}) 
