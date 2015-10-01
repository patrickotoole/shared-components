var RB = RB || {}
RB.portal = RB.portal || {}

RB.portal.UI = (function(UI){

  UI.formatters = {

    cost: function(field){
      return function(x) {
        return formatMoney(x[field] || 0)
      }
    },
    raw: function(field){
      return function(x) {
        return formatNumber(x[field] || 0)
      }
    },
    cost_rate: function(field){
      return function(x) {
        return formatMoney(x.cost ? x.cost/x[field] : 0)
      }
    },
    cpmRate: function(field){
      return function(x) {
        return formatMoney(x.cost ? x.cost/x[field]*1000 : 0)
      }
    },
    rate: function(field){
      return function(x) {
        return d3.format(".2%")(x[field]/x.imps)
      }
    },

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
        {"key":"rate","value":"Impressions", "id":"imps","formatter":UI.formatters.raw("imps")}, 
        {"key":"cost_rate","value":"CPM", "id":"imps","formatter":UI.formatters.cpmRate("imps")}  
      ]},
      {"key":"views","values":[
        {"key":"raw","value":"Views", "id":"views"},
        {"key":"rate","value":"% Viewable", "id":"views"}, 
        {"key":"cost_rate","value":"CPM (Viewable)", "id":"views","formatter":UI.formatters.cpmRate("views")}  
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
        {"key":"raw","value":"Cost", "id":"cost","formatter":UI.formatters.cost("cost")},
        {"key":"rate","value":"CPM", "id":"cost","formatter":UI.formatters.cpmRate("imps")}, 
        {"key":"cost_rate","value":"Cost", "id":"cost","formatter":UI.formatters.cost("cost")}  
      ]}
    ]
  }

  UI.campaign_bucket = (function(campaign_bucket){

    var main_charts = {}, 
      slider_charts = {}, 
      detail_tables = UI.campaign_selector.detail_tables, 
      campaignHeader;

    campaign_bucket.selectCampaign = function(campaign,target) {

      target.data([{"campaign_bucket":campaign}])
      d3.select(main_charts["#main-chart-0"].anchor()).data([{"campaign_bucket":campaign}])
      d3.select(slider_charts["#interval-chart-0"].anchor()).data([{"campaign_bucket":campaign}]) 
    
      campaign == "Campaign total" ?
        CRS.dimensions.total_campaign_bucket.filterAll() :
        CRS.dimensions.total_campaign_bucket.filter(function(f){return f == campaign});
    
      dc.deregisterAllCharts("infocus-group")
    
      dc.registerChart(main_charts["#main-chart-0"],"infocus-group")
      dc.registerChart(slider_charts["#interval-chart-0"],"infocus-group") 
      dc.registerChart(detail_tables["#" + target.select(".details-table").attr("id")],"infocus-group")  
    
      dc.renderAll("infocus-group")
    }

    campaign_bucket.selectMetric = function(metric_name, metric_type) {
      var accessor = function(d) {
        var costMultiplier = (
            (metric_name == "visits") || 
            (metric_name == "clicks") || 
            (metric_name == "conversions")
          ) ? 1 : 1000;

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

        return ((val == Infinity) || isNaN(val) || (val == -Infinity)) ? 0 : val
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
    
      UI.selector.setMetricKey(d3.selectAll(".details-table"),metric_name)
      UI.selector.setMetricKey(d3.selectAll(".series-selector"),metric_name)
      UI.selector.setMetricType2(d3.selectAll(".campaign-table-new"),metric_type) 
        
    
      dc.redrawAll("infocus-group") 
    }

    campaign_bucket.selectGraphInterval = function(x) {

      var current = "#" + this.parentNode.parentNode.nextSibling.id
      var selected = x.value

      for (var cid in main_charts) {
        main_charts[cid]
          .dimension(CRS.dimensions[selected])
          .group(CRS.groups[selected])
      }

      main_charts[current].redraw()   
    }

    campaign_bucket.buildGraphRow = function(CRS,graphRow) {
    
      var expansionLeft = graphRow.append("div")
        .classed("campaign-expansion col-md-3",true)
        .style("padding-right","0px")
        .append("div")
          .style("background","white")
          .style("border","1px solid #ddd")
          .style("min-height","100px")
          .classed("col-md-12",true)

      var expansionRight = graphRow.append("div")
        .classed("campaign-expansion col-md-9",true)
        .append("div")
          .style("background","white")
          .style("border","1px solid #ddd")
          .style("min-height","100px")    

      var graphHeader = expansionRight.append("h5")
        .attr("style","position:absolute;right:30px;margin:0px")

      var mainGraphGroup = expansionRight.append("div")
        .classed("main-chart dc-chart",true)
        .style("width","100%")
        .style("display","block")
        .style("line-height","0px")
        .attr("id",function(x,i){return "main-chart-" + i})

      UI.intervalSelector.build(
        graphHeader,
        campaign_bucket.selectGraphInterval,
        ["Hour","Day","Week"]
      )
      var interval = graphHeader.select(".interval-select-span")
        .attr("class","interval-select-span daily")

      UI.selector.build(
        expansionLeft,
        UI.campaign_bucket.selectMetric
      )

      slider_charts["#interval-chart-0"] = UI.slider_chart.build(
        "#interval-chart-0",
        CRS,
        graphRow
      )

      main_charts["#main-chart-0"] = UI.chart.build(
        "#main-chart-0",
        CRS,
        slider_charts["#interval-chart-0"],
        graphRow
      ) 

    }


    campaign_bucket.buildPanel = function(CRS,wrapper) {

      var graphPanel = wrapper.append("div")
        .style("position","relative")
        .style("width","100%")
        .append("div")
        .style("position","absolute")
        .style("width","inherit")

      var h5 = graphPanel.append("h5")
        .style("padding-top","18px")
        .style("padding-bottom","8px")
        .classed("col-md-12 main-header",true)
        .text(function(d){return "Campaign Performance" })

      h5.append("a")
        .classed("pull-right btn btn-default btn-sm",true)
        .style("margin-top","-10px")
        .style("margin-right","-10px")
        .text("Export CSV")
        .property("href","/reporting?format=csv&export=true")
        

      var graphRow = graphPanel.append("div")
        .classed("graph-row row",true)
        .style("top","300px")

      var tableRow = wrapper.append("div")
        .classed("row campaign-selection-body",true)
        .append("div")
          .classed("col-md-12 campaign-table-new",true) 

      UI.campaign_bucket.buildGraphRow(CRS,graphRow)
      UI.campaign_selector.build(CRS,tableRow)
        
      var path = d3.select(".metric.raw.imps")
      path.on("click").call(path.node(), path.datum());

    }
    

    return campaign_bucket

  })(UI.campaign_bucket || {})

  return UI

})(RB.portal.UI || {})  
