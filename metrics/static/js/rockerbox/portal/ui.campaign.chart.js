var RB = RB || {}
RB.portal = RB.portal || {}
RB.portal.UI = RB.portal.UI || {}

RB.portal.UI.chart = (function(chart) {

  var UI = RB.portal.UI

  chart.build = function(id,CRS,range){
  
    var main_chart = dc.lineChart(id)

    main_chart
      .dimension(CRS.dimensions.datetime)
      .group(CRS.groups.datetime)
      .tooltipType("daily")
      .height(265)
      .width(function(x){
        return d3.select(".active-row").selectAll(".main-chart").node().getBoundingClientRect().width
      })
      .margins({top: 12, right: 12, bottom: 12, left: 50})
      .elasticY(true)
      .renderArea(true)
      .yAxisPadding("25%")
      .round(d3.time.day.round)
      .xUnits(d3.time.days)
      .valueAccessor(function(d){
         return d.value.imps
      })
      .x(d3.time.scale().domain([
          CRS.groups.all.summary().date_min,
          CRS.groups.all.summary().date_max
      ]))
      //.renderHorizontalGridLines(true)
      .brushOn(false)
      .renderTitle(true)
      .title(function(){return "Impressions by hour"})
      .rangeChart(range)
      .on("preRedraw", function(e){
        var intervalLength = UI.formatters.timeDifference(
          CRS.groups.all.summary().date_min, 
          CRS.groups.all.summary().date_max
        );

        var tooltipType = (intervalLength < 14) ? "hourly" : "daily",
          dimensionType = (intervalLength < 14) ? "datetime" : "daily",
          group = CRS.groups[dimensionType],
          dimension = CRS.dimensions[dimensionType],
          tickFormat = (intervalLength <= 1) ? d3.time.format("%I%p") : d3.time.format("%m/%d");

        var anchor = e.anchor();
        var campaign = d3.select(anchor).data()[0].campaign_bucket 

        campaign == "Campaign total" ?
          CRS.dimensions.total_campaign_bucket.filterAll() :
          CRS.dimensions.total_campaign_bucket.filter(function(f){return f == campaign});

      })
      .on("postRender", function(e) {
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
        
      });

    main_chart
      .xAxis()
      .tickFormat(d3.time.format("%m/%d"))
      .ticks(10)
      .tickSize(4, -1)
      .orient("top")

    console.log(main_chart)

    return main_chart
  }

  return chart

})(RB.portal.UI.chart || {})
