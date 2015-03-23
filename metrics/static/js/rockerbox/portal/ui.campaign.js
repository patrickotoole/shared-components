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

    campaign_bucket.buildDetailsTable = function(wrapper,CRS) { 
      window.detail_tables = {}

      wrapper.data().map(function(x,i){
        var o ="#details-table-" + i

        detail_tables[o] = dc.dataGrid(o,"table-group")
          .dimension(CRS.aggregateDimensions.daily) 
          .group(function(d){console.log(d); return x.campaign_bucket})
          .groupHtml(function(x){
            return "<div class='row' style='font-size:13px;font-weight:500;text-transform:uppercase;margin:0px;margin-top:10px'><div class='col-md-3'>" + 
              "Date Interval" + "</div>" +
              '<div style="" class="col-md-8"><div class="col-md-2"><div style="border-top-width: 5px; border-top-style: solid; border-top-color: rgb(31, 119, 180);">Impressions</div></div><div class="col-md-2"><div style="border-top-width: 5px; border-top-style: solid; border-top-color: rgb(255, 127, 14);">Views</div></div><div class="col-md-2"><div style="border-top-width: 5px; border-top-style: solid; border-top-color: rgb(44, 160, 44);">Visits</div></div><div class="col-md-2"><div style="border-top-width: 5px; border-top-style: solid; border-top-color: rgb(214, 39, 40);">Clicks</div></div><div class="col-md-2"><div style="border-top-width: 5px; border-top-style: solid; border-top-color: rgb(148, 103, 189);">Conversions</div></div><div class="col-md-2"><div style="border-top-width: 5px; border-top-style: solid; border-top-color: rgb(140, 86, 75);">Cost</div></div></div><div class="col-md-1"></div></div>'
          })
	        .html(function(d,i){
            var date = "<div class='col-md-3 with-border date detail' style='padding-left:20px;font-size:13px'>" + 
              createDateValue("date-day",d.date) + "</div>"

            var imps = "<div class='col-md-2 imps detail'>" + formatNumber(d.imps) + "</div>"
            var views = "<div class='col-md-2 views detail'>" + d.views + "</div>"
            var visits = "<div class='col-md-2 visits detail'>" + d.visits + "</div>"
            var clicks = "<div class='col-md-2 clicks detail'>" + formatNumber(d.clicks) + "</div>"  
            var conversions = "<div class='col-md-2 conversions detail'>" + formatNumber(d.conversions) + "</div>"  
            var cost = "<div class='col-md-2 cost detail'>" + formatMoney(d.cost) + "</div>" 

            var wrap = "<div class='col-md-8 with-border'>" + 
              imps + views + visits + clicks + conversions + cost
              "</div>"

            // Something seems screwy here.. guesing its in the date function
            return date + wrap + "</div><div class='col-md-1 with-border'></div>"
          })
          .sortBy(function(x){return x.date})
          .order(d3.descending)
          .sliceMode("bottom")
          .size(10)
      })

      /*wrapper.selectAll(".detail-row").data(function(x){
        //CRS.dimensions.total_campaign_bucket.filterAll()
        CRS.dimensions.total_campaign_bucket.filter(function(d){ 
          return d == x.campaign_bucket
        })
        var data = JSON.parse(JSON.stringify(CRS.groups.weekly.all()))
        CRS.dimensions.total_campaign_bucket.filterAll()
        //console.log(data)
        console.log("here")
        
        return data
      }).enter()
          .append("div")
          .classed("detail-row",true)
          .text(function(x){return JSON.stringify(x)})
      console.log(wrapper)
      */
    }

    campaign_bucket.buildSliderChart = function(wrapper,CRS) {
      window.slider_charts = {}

      wrapper.data().map(function(x,i){return "#stuff-" + i}).map(function(o){

        slider_charts[o] = dc.lineChart(o, "slider-group") 
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

            dc.redrawAll("interval-group")
             
            CRS.dimensions.datetime.filterAll();
            

          })

        return slider_charts[o]

      })
 
    }

    campaign_bucket.buildMainChart = function(wrapper,CRS) {
      var expansionRight = wrapper;

      window.main_charts = { }

      expansionRight.data().map(function(x,i){
        var main_chart_id = "#main-chart-" + i

        main_charts[main_chart_id] = dc.lineChart(main_chart_id)
          .dimension(CRS.dimensions.datetime)
          .group(CRS.groups.datetime)
          .tooltipType("daily")
          .height(250)
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

      expansion.append("h5")
        .style("padding-top","8px")
        .classed("col-md-12",true)
        .text(function(d){return d.campaign_bucket + " details"})
 


      var detailsRow = expansion.append("div")
        .classed("row",true)
        .append("div")
        .classed("col-md-12",true)
        .style("margin-top","10px")

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

      var expansionRight = graphRow.append("div")
        .classed("campaign-expansion col-md-9",true)
        .append("div")
          .style("border","1px solid #ddd")
          .style("min-height","100px")    
       
      var sliderGroup = expansionLeft.append("div").classed("interval-chart dc-chart",true)
        .style("width","100%")
        .style("display","block")
        .attr("id",function(x,i){return "stuff-"+i})
       
      var mainGraphGroup = expansionRight.append("div")
        .classed("main-chart dc-chart",true)
        .style("width","100%")
        .style("display","block")
        .attr("id",function(x,i){return "main-chart-" + i})

      var detailsGroup = detailsRow.append("table")
        .classed("details-table",true)
        .style("font-weight","normal")
        .style("background-color","white")
        .style("border","1px solid #ddd")
        .style("min-height","100px") 
        .style("width","100%")
        .attr("id",function(x,i){return "details-table-" + i}) 
       

      campaign_bucket.buildSliderChart(mainGraphGroup,CRS) 
      campaign_bucket.buildMainChart(mainGraphGroup,CRS)
      campaign_bucket.buildDetailsTable(detailsGroup,CRS)


    }

    campaign_bucket.buildRowMetrics = function(row) {
      var metric = row.selectAll(".campaign-no-style")
        .data(rowMetricTransform)

      var innerMetric = metric.enter()
        .append("div")
        .on("click",function(d) {

          var active = row.filter(function(x){ 
            return this.classList.contains("active-row")
          })

          var bucket = this.parentNode.__data__.campaign_bucket
          row.classed("active-row",false)
          d3.select(this.parentNode).classed("active-row",true)
          selectCampaign(bucket,d3.select(this.parentNode))
          //d3.event().preventDefault()
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
