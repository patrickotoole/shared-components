var RB = RB || {}
RB.portal = RB.portal || {}
RB.portal.UI = RB.portal.UI || {}
 
RB.portal.UI.selector = (function(selector){

  var UI = RB.portal.UI

  selector.setMetricType = function(obj,x) {
    obj
      .classed("raw",function(d){return x == "Raw"})
      .classed("rate",function(d){return x == "Rate"})
      .classed("cost_rate",function(d){return x == "Cost"})  
  }

  selector.setMetricKey = function(obj,metric_name) {
    obj
      .classed("imps",function(d){return metric_name == "imps"})
      .classed("views",function(d){return metric_name == "views"}) 
      .classed("visits",function(d){return metric_name == "visits"}) 
      .classed("clicks",function(d){return metric_name == "clicks"}) 
      .classed("conversions",function(d){return metric_name == "conversions"}) 
      .classed("cost",function(d){return metric_name == "cost"}) 
  }

  selector.getMetricKey = function(obj) {
    return obj.classed("imps") ? "imps" :
      obj.classed("clicks") ? "clicks" : 
      obj.classed("conversions") ? "conversions" : 
      obj.classed("views") ? "views" : 
      obj.classed("visits") ? "visits" : 
      obj.classed("cost") ? "cost" : "" 
  }

  selector.getMetricType = function(obj) {
    return obj.classed("raw") ? "raw" :
      obj.classed("cost_rate") ? "cost_rate" :
      obj.classed("rate") ? "rate" : ""
  }

  selector.header = function(wrapper,selectMetric) {
    
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
             
            
            selector.setMetricType(metricSpan,x)
            selector.setMetricType(d3.selectAll(".details-table"),x)
            selector.setMetricType(d3.selectAll(".series-selector"),x)

            
            var metric_name = selector.getMetricKey(type_wrapper)
            var metric_type = selector.getMetricType(metricSpan)

            selectMetric(metric_name,metric_type)

          })   
  }

  selector.dateHeader = function(wrapper) {
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

  selector.series = function(wrapper,selectMetric) {
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
        var metric_type = selector.getMetricType(d3.select(this.parentNode))

        selectMetric(metric_name,metric_type)
      
      })
  }

  selector.build = function(wrapper,selectMetric) {
    wrapper.classed("selector-legend",true)
    selector.header(wrapper,selectMetric)
    selector.series(wrapper,selectMetric)
    selector.dateHeader(wrapper) 
    wrapper.append("div")
      .classed("col-md-12",true)
      .style("height","10px")              
    wrapper.append("div").classed("interval-chart dc-chart",true)
      .style("width","100%")
      .style("display","block")
      .style("padding-bottom","6px")
      .attr("id",function(x,i){return "interval-chart-"+i})
            
  
  }

  return selector

})(RB.portal.UI.selector || {}) 
