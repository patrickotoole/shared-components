 var RB = RB || {}
RB.portal = RB.portal || {}

RB.portal.UI = (function(UI){

  UI.constants = {
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
      var colors = UI.constants.HEADER_COLORS; 

      wrapper.data().map(function(x,i){
        var o ="#details-table-" + i

        detail_tables[o] = dc.dataGrid(o,"table-group")
          .dimension(CRS.aggregateDimensions.weekly) 
          .group(function(d){console.log(d); return x.campaign_bucket})
          .d3Group(function(wrapped){

            var row = wrapped.append("div")
              .classed("row",true)
              .attr("style","font-size:13px;font-weight:500;text-transform:uppercase;margin:0px;margin-top:10px")

            row.append("div")
              .classed("col-md-3",true)
              .text("Date Interval")

            var inner = row.append("div")
              .classed("col-md-8",true)

            var innerHeading = inner.selectAll(".metric")
              .data(UI.constants.HEADINGS)
              .enter()
                .append("div")
                .classed("col-md-2",true)
                .attr("class",function(x) {return "col-md-2 " + x.key})

              innerHeading.selectAll(".metric")
                .data(function(d){return d.values})
                .enter()
                  .append("div")
                  .attr("class",function(x){return x.key + " metric"})
                  .style("border-top",function(x){ return "5px solid " + colors(x.id) })
                  .text(function(x){return x.value})
              
          })
          .d3(function(wrapped){

              wrapped.append("div")
                .classed("col-md-3 with-border date detail",true)
                .style("padding-left","20px")
                .style("font-size","13px")
                .html(function(d){
                  return createDateValue("date-week",d.date)
                })

              var details = wrapped.append("div")
                .classed("col-md-8 with-border",true)

              var series = [
                {"key":"imps","formatter":formatNumber},
                {"key":"views","formatter":d3.format(",.0f")}, 
                {"key":"visits","formatter":formatNumber}, 
                {"key":"clicks","formatter":formatNumber}, 
                {"key":"conversions","formatter":formatNumber}, 
                {"key":"cost","formatter":formatMoney}, 
              ]

              var metric = details.selectAll(".detail")
                .data(function(d) {
                  var data = []

                  series.map(function(x){
                    data.push({
                      "key":x.key,
                      "formatter":x.formatter,
                      "value":d[x.key],
                      "imps":d.imps,
                      "cost":d.cost
                    })
                  })

                  return data
                }).enter()
                  .append("div")
                  .attr("class",function(d){ return d.key + " col-md-2 detail"})

                metric.selectAll(".metric")
                  .data(function(d){

                    var costMultiplier = 
                      ((d.key == "visits") || (d.key == "clicks") || (d.key == "conversions")) ? 1 : 1000

                    return [
                      { "key":"raw","value": d.formatter(d.value)},
                      { "key":"rate","value":
                        (d.key == "imps") ? d.formatter(d.value) : 
                        (d.key == "cost") ? formatMoney(d.value/d.imps*costMultiplier) : 
                          d3.format(".2%")(d.value/d.imps)
                      },
                      { "key":"cost_rate","value":
                        (d.key == "cost") ? formatMoney(d.cost) : 
                          formatMoney(d.cost/d.value*costMultiplier)}
                    ]
                  })
                  .enter()
                    .append("div")
                    .attr("class",function(d){return "metric " + d.key })
                    .text(function(x){return x.value})

              

              
          })
          .sortBy(function(x){return x.date})
          .order(d3.descending)
          .sliceMode("bottom")
          .size(10)
      })

    }

    campaign_bucket.buildSliderChart = function(wrapper,CRS) {
      window.slider_charts = {}

      wrapper.data().map(function(x,i){return "#interval-chart-" + i}).map(function(o){

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
          .height(253)
          .width(function(x){
            return d3.select(".active-row").selectAll(".main-chart").node().getBoundingClientRect().width
          })
          .margins({top: 12, right: 12, bottom: 0, left: 50})
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
          .rangeChart(slider_charts["#interval-chart-"+i])
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

      var metric = expansionLeft.append("h5")
        .classed("row",true)
        .attr("style","border-bottom: 1px solid #ccc; line-height: 35px; margin-top: 0px; padding-left: 10px;")

      metric.append("span")
        .text("Metrics")

      var metricTypes = metric.append("span") 
        .classed("metric-span",true)
          .style("font-size","11px")
          .style("font-weight","normal")
          .style("text-transform","uppercase")
          .style("line-height","35px")
          .style("padding-right","12px")
          .style("float","right")
          .selectAll(".metric-type")
          .data(["Raw","Rate","Cost"])
          .enter()
            .append("span")
            .style("margin-left","15px")
            .classed("metric-type",true)
            .text(function(x){return x})
            .style("font-weight",function(x,i){return i == 0 ? "bold" : ""})
            .style("opacity",function(x,i){return i ? ".5" : ""})
            .on("click",function(x){
              var current = d3.select(this)
              metricTypes.style("font-weight","")
              metricTypes.style("opacity",".5")

              d3.selectAll(".details-table")
                .classed("raw",function(d){return x == "Raw"})
                .classed("rate",function(d){return x == "Rate"})
                .classed("cost_rate",function(d){return x == "Cost"})

              d3.selectAll(".series-selector")
                .classed("raw",function(d){return x == "Raw"})
                .classed("rate",function(d){return x == "Rate"})
                .classed("cost_rate",function(d){return x == "Cost"})

              current.style("font-weight","bold")
              current.style("opacity","") 



            })

       

      var series = expansionLeft.append("div")
        .classed("row raw series-selector",true)
        .style("padding","10px")
        .selectAll(".series-selction")
        .data(function(x){
          var flat = []  
          UI.constants.HEADINGS.map(function(y){y.values.map(function(z){flat.push(z)})})
          return flat
        })
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

            var i = this.parentNode.parentNode.__data__.index
            var metric_type = 
              d3.select(this.parentNode).classed("cost_rate") ? "cost_rate" :
              d3.select(this.parentNode).classed("rate") ? "rate" : "raw"

            var accessor = function(d) {
              var costMultiplier = 
                ((x.id == "visits") || (x.id == "clicks") || (x.id == "conversions")) ? 1 : 1000

              var val;

              if (metric_type == "rate") {
                val = (x.id == "imps") ? d.value[x.id] : 
                  (x.id == "cost") ? d.value[x.id]/d.value.imps*costMultiplier : 
                    d.value[x.id]/d.value.imps

              } else if (metric_type == "cost_rate") {
                
                val = (x.id == "cost") ? d.value.cost : 
                    d.value.cost/d.value[x.id]*costMultiplier
                  
              } else {
                val = d.value[x.id]
              }

              return ((val == Infinity) || isNaN(val)) ? 0 : val
            }


            for (var cid in main_charts) {
              main_charts[cid]
                .valueAccessor(accessor)
                .colorCalculator(function(){return UI.constants.HEADER_COLORS(x.id)})
            }

            for (var sid in slider_charts) {
              slider_charts[sid]
                .valueAccessor(function(d){ return d.value[x.id] })
                .colorCalculator(function(){return UI.constants.HEADER_COLORS(x.id)})
            }

            var current_class = d3.selectAll(".details-table")
              .classed("imps",function(d){return x.id == "imps"})
              .classed("views",function(d){return x.id == "views"}) 
              .classed("visits",function(d){return x.id == "visits"}) 
              .classed("clicks",function(d){return x.id == "clicks"}) 
              .classed("conversions",function(d){return x.id == "conversions"}) 
              .classed("cost",function(d){return x.id == "cost"}) 

            var current_class = d3.selectAll(".series-selector")
              .classed("imps",function(d){return x.id == "imps"})
              .classed("views",function(d){return x.id == "views"}) 
              .classed("visits",function(d){return x.id == "visits"}) 
              .classed("clicks",function(d){return x.id == "clicks"}) 
              .classed("conversions",function(d){return x.id == "conversions"}) 
              .classed("cost",function(d){return x.id == "cost"}) 
             

            dc.redrawAll("infocus-group")

          
          })

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
        .attr("id",function(x,i){return "interval-chart-"+i})
       
      var mainGraphGroup = expansionRight.append("div")
        .classed("main-chart dc-chart",true)
        .style("width","100%")
        .style("display","block")
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
    

    return campaign_bucket

  })(UI.campaign_bucket || {})

  return UI

})(RB.portal.UI || {}) 
