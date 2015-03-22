 var RB = RB || {}
RB.portal = RB.portal || {}

RB.portal.UI = (function(UI){

  UI.constants = {
    CAMPAIGN_TOTAL : "Campaign total",
    HEADERS : ["Impressions","Views","Visits","Clicks","Conversions","Cost"],
    HEADER_COLORS : d3.scale.category10()
  }

  UI.campaign_bucket = (function(campaign_bucket){

    var bucketDataFormatter = function(CRS) {

      var totalDimension = CRS.groups.all.value(),
        topData = CRS.aggregateDimensions.total_campaign_bucket.top(100)

      totalDimension['campaign_bucket'] = UI.constants.CAMPAIGN_TOTAL
      topData.push(totalDimension)

      return topData
    }

    var rowMetricTransform = function(rowData) {
      var x = rowData;
      return [
          [
            {"class":"name","value":x.campaign_bucket}
          ], 
          [
            {"class":"metric","value":formatNumber(x.imps)}, 
            {
              "class":"metric",
              "value":d3.format(",.0f")(x.imps*x.percent_visible),
              "mini_value":d3.format(".0%")((x.imps*x.percent_visible)/x.imps)
            },  
            {"class":"metric","value":formatNumber(x.visits || 0),"mini_value":d3.format(".2%")(x.visits/x.imps)}, 
            {"class":"metric","value":formatNumber(x.clicks),"mini_value":d3.format(".2%")(x.clicks/x.imps)}, 
            {"class":"metric","value":formatNumber(x.conversions),"mini_value":d3.format(".2%")(x.conversions/x.imps)},
            {"class":"metric","value":formatMoney(x.cost)}, 
          ],[
            {"class":"streaming"}
          ]
      ]
    }


    campaign_bucket.buildRowExpansion = function(row,CRS) { 


      var expansion = row.append("div")
          .classed("expansion col-md-12",true)

      expansion.append("h5")
        .style("padding-bottom","8px")
        .classed("col-md-12",true)
        .text(function(d){return "Explore " + d.campaign_bucket})

      var graphRow = expansion
          .append("div")
          .classed("row",true)


      expansion.append("div")
        .style("background","white")
        .style("min-height","100px")
        .style("margin-top","10px")
        .style("border","1px solid #ddd")


      var expansionLeft = graphRow.append("div")
        .classed("campaign-expansion col-md-3",true)
        .style("padding-right","0px")
        .append("div")
          .style("border","1px solid #ddd")
          .style("min-height","100px")
          .classed("col-md-12",true)

      expansionLeft.append("h5")
        .classed("row",true)
        .attr("style","border-bottom: 1px solid #ccc; line-height: 35px; margin-top: 0px; padding-left: 10px;")
        .text("Metrics")

      var series = expansionLeft.append("div")
        .classed("row",true)
        .style("padding","10px")
        .selectAll(".series-selction")
        .data(UI.constants.HEADERS)
        .enter()
          .append("div")

      var currentInterval = expansionLeft.append("h5")
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
        
       

      series
        .classed("col-md-6",true)
          .style("opacity",function(d,i){return i ? ".5" : ""})
          .style("border-left",function(d){return "5px solid" + UI.constants.HEADER_COLORS(d)})
          .style("padding-bottom","3px")
          .style("padding-left","5px")
          .style("font-size","11px")
          .style("font-weight","500")
          .style("line-height","25px")
          .style("margin-bottom","3px")
          .style("text-transform","uppercase")
          .text(function(d){return d})

      expansionLeft.append("div")
        .classed("col-md-12",true)
        .style("height","10px")

      

      var graphGroup = expansionLeft.append("div").classed("interval-chart dc-chart",true)
        .style("width","100%")
        .style("display","block")
        .attr("id",function(x,i){return "stuff-"+i})
       

      window.slider_charts = {}

      var sliders = expansionLeft.data().map(function(x,i){return "#stuff-" + i}).map(function(o){

        slider_charts[o] = dc.lineChart(o) 
          .dimension(CRS.dimensions.daily)
          .group(CRS.groups.daily)
          .height(38)
          .width(function(x){
            return d3.select(".active-row").selectAll(".interval-chart").node().getBoundingClientRect().width
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
             

            CRS.dimensions.datetime.filterAll();
            CRS.dimensions.total_campaign_bucket.filter(function(f){return f == campaign}); 
          })

        return slider_charts[o]

      })


      
      var expansionRight = graphRow.append("div")
        .classed("campaign-expansion col-md-9",true)
        .append("div")
          .style("border","1px solid #ddd")
          .style("min-height","100px")    

      var mainGraphGroup = expansionRight.append("div")
        .classed("main-chart dc-chart",true)
        .style("width","100%")
        .style("display","block")
        .attr("id",function(x,i){return "main-chart-" + i})


      window.main_charts = { }

      expansionRight.data().map(function(x,i){
        var main_chart_id = "#main-chart-" + i

        main_charts[main_chart_id] = dc.lineChart(main_chart_id)
          .dimension(CRS.dimensions.datetime)
          .group(CRS.groups.datetime)
          .tooltipType("daily")
          .height(328)
          .width(function(x){
            return d3.select(".active-row").selectAll(".main-chart").node().getBoundingClientRect().width
          })
          .margins({top: 0, right: 0, bottom: 0, left: 0})
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
          .renderHorizontalGridLines(true)
          .brushOn(false)
          .renderTitle(true)
          .rangeChart(slider_charts["#stuff-"+i])
          .on("preRedraw", function(e){
            var intervalLength = timeDifference(
              CRS.groups.all.summary().date_min, 
              CRS.groups.all.summary().date_max
            );

            var tooltipType = (intervalLength < 14) ? "hourly" : "daily",
              dimensionType = (intervalLength < 14) ? "datetime" : "daily",
              group = CRS.groups[dimensionType],
              dimension = CRS.dimensions[dimensionType],
              tickFormat = (intervalLength <= 1) ? d3.time.format("%I%p") : d3.time.format("%m/%d");

            //mainGraph.dimension(dimension).group(group).tooltipType(tooltipType)
            //mainGraph.xAxis().tickFormat(tickFormat)

            var anchor = e.anchor();
            var campaign = d3.select(anchor).data()[0].campaign_bucket 

            campaign == "Campaign total" ?
              CRS.dimensions.total_campaign_bucket.filterAll() :
              CRS.dimensions.total_campaign_bucket.filter(function(f){return f == campaign});
 

          });
      })

       


    }

    campaign_bucket.buildRowMetrics = function(row) {
      var metric = row.selectAll(".campaign-no-style")
        .data(rowMetricTransform)

      var innerMetric = metric.enter()
        .append("div")
        .on("click",function(d) {
          var bucket = this.parentNode.__data__.campaign_bucket
          row.classed("active-row",false)
          d3.select(this.parentNode).classed("active-row",true)
          selectCampaign(bucket,d3.select(this.parentNode))
        })
        .append("div")
        .classed("col-md-8",function(x,i){return (i == 1) })
        .classed("col-md-1",function(x,i){return (i == 2) }) 
        .classed("campaign-no-style col-md-3",function(x,i){return i == 0}) 
        .style("border-top", "1px solid #ddd")
        .selectAll(".campaign-metric")
        .data(function(x){
          return x
        })
        .enter()
          .append("div")
          .attr("class",function(x){
            return x.class == "metric" ? "col-md-2" : "col-md-12"
          })
          .classed("campaign-metric",true)
          .style("overflow","hidden")
          .style("height","35px")
          .style("font-size",function(x){return x.class == "name" ? "12px": ""})

      innerMetric
        .append("span")
        .text(function(x){ return (typeof(x) != "object") ? x : x.value })
    
      innerMetric
        .append("span")
        .classed("mini-metric",true)
        .attr("style","font-size:.8em;margin-right:10px;float:right;color:grey;visibility:hidden")
        .text(function(x){ return x.mini_value })
   
       
    }

    campaign_bucket.buildRows = function(data,body,CRS) {

      var last = data.length -1

      var row = body.selectAll(".campaign")
        .data(data)

      row
        .enter()
        .append("div").classed("campaign",true)
        .classed("active-row",function(x,i){return i == last})
          .style("line-height","35px") 
          .style("margin-bottom","10px") 

        
        .on('mouseover',function(x){
          d3.select(this).selectAll(".mini-metric").style("visibility","visible")
        })
        .on('mouseout',function(x){
          d3.select(this).selectAll(".mini-metric").style("visibility","hidden")
        })
        .sort(function(x,y){
          var a = x.campaign_bucket,
            b = y.campaign_bucket;

          if (x.campaign_bucket == UI.constants.CAMPAIGN_TOTAL) return 1
          if (y.campaign_bucket == UI.constants.CAMPAIGN_TOTAL) return 0
          
          return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
        })

      campaign_bucket.buildRowMetrics(row)
      campaign_bucket.buildRowExpansion( row,CRS)
    
    }

    campaign_bucket.buildPanel = function(CRS,wrapper) {

      var names = UI.constants.HEADERS,
        colors = UI.constants.HEADER_COLORS;

      var panel = wrapper.append("div")
        .classed("campaign-table-new",true)

      var header = panel.append("div").classed("header",true)
        .style("line-height","40px")
        .style("font-weight","500")
        .style("font-size","13px")
        .style("text-transform","uppercase")

      header.append("div")
        .classed("col-md-3",true)
        .text("Campaign Name")      

      var innerHeader = header.append("div")
        .classed("col-md-8",true)

      names.map(function(name){
        innerHeader.append("div")
          .classed("col-md-2",true)
          .append("div")
          .style("border-top",function(x,i){ return "5px solid " + colors(name) })
          .text(name)
      })

      var body = panel.append("div")
        .classed("campaigns-body",true)

      var data = bucketDataFormatter(CRS)

      campaign_bucket.buildRows(data,body,CRS)

      return body

    }
    

    return campaign_bucket

  })(UI.campaign_bucket || {})

  return UI

})(RB.portal.UI || {}) 
