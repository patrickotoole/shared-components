var RB = RB || {}
RB.portal = RB.portal || {}
RB.portal.UI = RB.portal.UI || {}

RB.portal.UI.slider_chart = (function(slider_chart) {

  slider_chart.build = function(id,CRS,target) {

    var target = target || d3.select(".active-row")

    return dc.lineChart(id, "slider-group") 
      .dimension(CRS.dimensions.daily)
      .group(CRS.groups.daily)
      .height(38)
      .width(function(x){
        return target.selectAll(".interval-chart").node().getBoundingClientRect().width
      })
      .renderArea(true)
      .elasticY(true)
      .margins({top: 0, right: 0, bottom: 0, left: 0})
      .yAxisPadding("25%")
      .round(d3.time.day.round)
      .xUnits(d3.time.days)
      .valueAccessor(function(d){					
        return d.value.imps;
      })
      .x(d3.time.scale().domain([
          CRS.groups.all.summary().date_min,
          CRS.groups.all.summary().date_max
      ]))
      .on("preRedraw", function(e){
        var anchor = e.anchor();
        var campaign = d3.select(anchor).data()[0].campaign_bucket

        campaign == "Campaign total" ?
          CRS.dimensions.total_campaign_bucket.filterAll() :
          CRS.dimensions.total_campaign_bucket.filter(function(f){return f == campaign});

        dc.redrawAll("interval-group")
         
        CRS.dimensions.datetime.filterAll();
        

      }) 
      .on("postRender",function(e){
        var anchor = d3.select(e.anchor())
        anchor.selectAll(".y.axis")
          .attr("class","y axis dc-axis placed")

        anchor.selectAll(".x.axis.dc-axis") 
          .attr("class","x axis dc-axis placed")
          .selectAll(".tick text")
            .style("text-anchor", "start")
            .style("font-size","8px")
            .attr("x", 6)
            .attr("y", 9)    
         
      })
      
      
  }

  return slider_chart

})(RB.portal.UI.slider_chart || {})
 
