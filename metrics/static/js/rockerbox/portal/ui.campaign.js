var RB = RB || {}
RB.portal = RB.portal || {}

RB.portal.UI = (function(UI){

  UI.formatters = {
    createDateValue: function(dateMode, firstDate) {
      var formatted = formatDate(firstDate)
	  	if (dateMode == "weekly") {
        var endOfWeek = addDays(firstDate, 6)
        if (endOfWeek > CRS.groups.all.summary().date_max) 
          endOfWeek.setTime(CRS.groups.all.summary().date_max.getTime());
	  		formatted += " - " + formatDate(endOfWeek);
	  	} else if (dateMode == "monthly") {
	  		formatted = formatMonth(firstDate);
	  	}
      return formatted
	  },
    timeDifference: function(startDate, endDate){
      return (endDate.getTime() - startDate.getTime()) / 1000 / 60 / 60 / 24;
    }                       
  }

  UI.constants = {
    INTERVAL_OPTIONS : [
        {"key":"Hour","value":"datetime"}, 
        {"key":"Day","value":"daily"},
        {"key":"Week","value":"weekly"},
        {"key":"Month","value":"monthly"} 
      ],
    CAMPAIGN_TOTAL : "Campaign total",
    HEADERS : ["Impressions","Views","Visits","Clicks","Conversions","Cost"],
    HEADER_COLORS : d3.scale.category10(),
    HEADINGS : [
      {"key":"imps","values":[
        {"key":"raw","value":"Impressions", "id":"imps"},
        {"key":"rate","value":"Impressions", "id":"imps"}, 
        {"key":"cost_rate","value":"CPM", "id":"imps"}  
      ]},
      {"key":"views","values":[
        {"key":"raw","value":"Views", "id":"views"},
        {"key":"rate","value":"% Viewable", "id":"views"}, 
        {"key":"cost_rate","value":"CPM (Viewable)", "id":"views"}  
      ]},
      {"key":"visits","values":[
        {"key":"raw","value":"Visits", "id":"visits"},
        {"key":"rate","value":"Visit Rate", "id":"visits"}, 
        {"key":"cost_rate","value":"Cost/Visit", "id":"visits"}  
      ]},
      {"key":"clicks","values":[
        {"key":"raw","value":"Clicks", "id":"clicks"},
        {"key":"rate","value":"CTR", "id":"clicks"}, 
        {"key":"cost_rate","value":"CPC", "id":"clicks"}  
      ]},
      {"key":"conversions","values":[
        {"key":"raw","value":"Conversions", "id":"conversions"},
        {"key":"rate","value":"Conv Rate", "id":"conversions"}, 
        {"key":"cost_rate","value":"CPA", "id":"conversions"}  
      ]},
      {"key":"cost","values":[
        {"key":"raw","value":"Cost", "id":"cost"},
        {"key":"rate","value":"CPM", "id":"cost"}, 
        {"key":"cost_rate","value":"Cost", "id":"cost"}  
      ]}
    ]
  }

  UI.campaign_bucket = (function(campaign_bucket){

    var main_charts, slider_charts, detail_tables;

    var selectCampaign = function(campaign,target) {
    
      campaign == "Campaign total" ?
        CRS.dimensions.total_campaign_bucket.filterAll() :
        CRS.dimensions.total_campaign_bucket.filter(function(f){return f == campaign});
    
      dc.deregisterAllCharts("infocus-group")
    
      dc.registerChart(main_charts["#" + target.select(".main-chart").attr("id")],"infocus-group")
      dc.registerChart(slider_charts["#" + target.select(".interval-chart").attr("id")],"infocus-group") 
      dc.registerChart(detail_tables["#" + target.select(".details-table").attr("id")],"infocus-group")  
    
      dc.renderAll("infocus-group")
    
      updateCampaignReports(
        $('#campaign-reports-box .outer-interval-select .interval-select li.interval-active').text(),
        campaign 
      )
    
      campaignReportsTable.redraw()
    }

    var bucketDataFormatter = function(CRS) {

      var totalDimension = CRS.groups.all.value(),
        topData = CRS.aggregateDimensions.total_campaign_bucket.top(100)

      totalDimension['campaign_bucket'] = UI.constants.CAMPAIGN_TOTAL
      topData.push(totalDimension)

      return topData
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

      innerHeader.selectAll("div")
        .data(UI.constants.HEADINGS)
        .enter()
          .append("div")
          .classed("col-md-2",true)
          .append("div")
          .style("border-top",function(x){ console.log(x.key); return "5px solid " + colors(x.key) })
          .text(function(x){return x.values[0].value })

      var body = panel.append("div")
        .classed("campaigns-body",true)

      var data = bucketDataFormatter(CRS)

      campaign_bucket.buildRows(data,body,CRS)

      return body

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

          if (x.campaign_bucket == UI.constants.CAMPAIGN_TOTAL) return -1
          if (y.campaign_bucket == UI.constants.CAMPAIGN_TOTAL) return 1
          
          return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
        })

      campaign_bucket.buildRowMetrics(row)
      campaign_bucket.buildRowExpansion( row,CRS)
    
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


    campaign_bucket.intervalSelector = UI.intervalSelector
    campaign_bucket.detailsTable = UI.detailsTable
    

    campaign_bucket.buildDetailsTables = function(wrapper,CRS) { 
      detail_tables = {}
      var colors = UI.constants.HEADER_COLORS; 

      wrapper.data().map(function(x,i){
        var o ="#details-table-" + i
        detail_tables[o] = campaign_bucket.detailsTable.build(o,CRS)
      })

    }

    campaign_bucket.buildSliderChart = function(wrapper,CRS) {
      slider_charts = {}

      wrapper.data().map(function(x,i){return "#interval-chart-" + i}).map(function(o){
        slider_charts[o] = UI.slider_chart.build(o,CRS)
        return slider_charts[o]
      })
 
    }

    

    campaign_bucket.buildRowExpansion = function(row,CRS) { 

      var expansion = row.append("div")
          .classed("shadow expansion col-md-12",function(d,i){
            d.index = i
            return true
          })

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
        .text(function(d){return "Detailed reporting for " + d.campaign_bucket })

      var detailsRow = expansion.append("div")
        .classed("row",true)
        .append("div")
        .classed("col-md-12",true)
        .style("margin-top","10px")

      expansion.append("div")
        .style("height","40px")

      var expansionLeft = graphRow.append("div")
        .classed("campaign-expansion col-md-3",true)
        .style("padding-right","0px")
        .append("div")
          .style("border","1px solid #ddd")
          .style("min-height","100px")
          .classed("col-md-12",true)

      


      var selectMetric = function(metric_name, metric_type) {
        var accessor = function(d) {
          var costMultiplier = 
            ((metric_name == "visits") || (metric_name == "clicks") || (metric_name == "conversions")) ? 1 : 1000
    
          var val;
    
          if (metric_type == "rate") {
            val = (metric_name == "imps") ? d.value[metric_name] : 
              (metric_name == "cost") ? d.value[metric_name]/d.value.imps*costMultiplier : 
                d.value[metric_name]/d.value.imps
    
          } else if (metric_type == "cost_rate") {
            
            val = (metric_name == "cost") ? d.value.cost : 
                d.value.cost/d.value[metric_name]*costMultiplier
              
          } else {
            val = d.value[metric_name]
          }
    
          return ((val == Infinity) || isNaN(val)) ? 0 : val
        }
    
    
        for (var cid in main_charts) {
          main_charts[cid]
            .valueAccessor(accessor)
            .colorCalculator(function(){return UI.constants.HEADER_COLORS(metric_name)})
        }
    
        for (var sid in slider_charts) {
          slider_charts[sid]
            .valueAccessor(function(d){ return d.value[metric_name] })
            .colorCalculator(function(){return UI.constants.HEADER_COLORS(metric_name)})
        }
    
        campaign_bucket.selectorLegend.setMetricKey(d3.selectAll(".details-table"),metric_name)
        campaign_bucket.selectorLegend.setMetricKey(d3.selectAll(".series-selector"),metric_name)
          
    
        dc.redrawAll("infocus-group") 
      }

      campaign_bucket.selectorLegend = RB.portal.UI.selector
      campaign_bucket.selectorLegend.build(expansionLeft,selectMetric)

      var expansionRight = graphRow.append("div")
        .classed("campaign-expansion col-md-9",true)
        .append("div")
          .style("border","1px solid #ddd")
          .style("min-height","100px")    

      var graphHeader = expansionRight.append("h5")
        .classed("graph-interval-selector",true)
        .attr("style","position:absolute;right:30px;margin:0px")

      campaign_bucket.intervalSelector.build(graphHeader,function(x){

        var current = "#" + this.parentNode.parentNode.nextSibling.id

        var selected = x.value

        graphHeader.selectAll(".interval-select-span")
          .classed("datetime",selected == "datetime") 
          .classed("daily",selected == "daily")
          .classed("weekly",selected == "weekly") 
          .classed("monthly",selected == "monthly")  


        for (var cid in main_charts) {
          console.log(selected)
          console.log(CRS.dimensions)
          main_charts[cid].dimension(CRS.dimensions[selected])
            .group(CRS.groups[selected])
        }

        main_charts[current].redraw()
      
      },["Hour","Day","Week"])
      
       
      var mainGraphGroup = expansionRight.append("div")
        .classed("main-chart dc-chart",true)
        .style("width","100%")
        .style("display","block")
        .style("line-height","0px")
        .attr("id",function(x,i){return "main-chart-" + i})

      var detailsGroup = detailsRow.append("table")
        .classed("raw details-table imps",true)
        .style("font-weight","normal")
        .style("background-color","white")
        .style("border","1px solid #ddd")
        .style("min-height","100px") 
        .style("width","100%")
        .attr("id",function(x,i){return "details-table-" + i}) 
       

      campaign_bucket.buildSliderChart(mainGraphGroup,CRS) 

      campaign_bucket.buildMainCharts = function(wrapper,CRS) {
        main_charts = {}
        wrapper.data().map(function(x,i){
          var main_chart_id = "#main-chart-" + i
          var range = slider_charts["#interval-chart-"+i]
          main_charts[main_chart_id] = UI.chart.build(main_chart_id,CRS,range)
        })    
      }
      campaign_bucket.buildMainCharts(mainGraphGroup,CRS)
      campaign_bucket.buildDetailsTables(detailsGroup,CRS)


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

          d3.select(this.parentNode).select(".expansion")
            /*.style("z-index","0")
            .style("height", 0)
            .transition().duration(400).style("height","400px")
              */
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

    

    
    

    return campaign_bucket

  })(UI.campaign_bucket || {})

  return UI

})(RB.portal.UI || {})  
