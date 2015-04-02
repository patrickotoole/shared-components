var RB = RB || {}
RB.portal = RB.portal || {}
RB.portal.UI = RB.portal.UI || {}
 
RB.portal.UI.campaign_selector = (function(campaign_selector){

  var UI = RB.portal.UI

  var campaignHeader;

  var rowMetricTransform = function(rowData) {
    var x = rowData;
    return [
        [
          {"class":"name","value":x.campaign_bucket}
        ], 
        JSON.parse(JSON.stringify(UI.constants.HEADINGS)).map(function(y){y.data = x; return y}),
        [
          {"class":"streaming"}
        ]
    ]
  } 

  var bucketDataFormatter = function(CRS) {

    var totalDimension = CRS.groups.all.value(),
      topData = CRS.aggregateDimensions.total_campaign_bucket.top(100)

    totalDimension['campaign_bucket'] = UI.constants.CAMPAIGN_TOTAL

    if (topData.length == 1) return [totalDimension]
    
    topData.push(totalDimension)
    return topData
  }

  campaign_selector.detail_tables = {}

  campaign_selector.build_metrics = function(row) {
    var metric = row.selectAll(".campaign-no-style")
      .data(rowMetricTransform)

    var innerMetric = metric.enter()
      .append("div")
      .on("click",function(d,i) {
        var currentParent = this.parentNode;
        var current_select = d3.select(currentParent)

        row.filter(function(){return this != currentParent})
          .selectAll(".expansion")
          .transition()
          .style("max-height","0px")
             
        current_select.classed("active-row",true)

        current_select.select(".expansion")
          .style("max-height","0px")
          .transition()
          .style("max-height","500px")
          .each("end",function(){

            d3.select(currentParent.parentNode)
              .transition()
              .tween("",function() { 
                var i = d3.interpolateNumber(this.scrollTop, currentParent.offsetTop); 
                return function(t) { this.scrollTop = i(t); }; 
              }).each("end",function(){
                row.classed("active-row",false)
                current_select.classed("active-row",true)
                   
              })
          })
         
       
        var bucket = this.parentNode.__data__.campaign_bucket
        
        UI.campaign_bucket.selectCampaign(bucket,d3.select(this.parentNode))
        d3parent = d3.select(currentParent)

        d3.select(".main-header").text("Campaign Performance > " + d3parent.datum().campaign_bucket)



        interval.chart = campaign_selector.detail_tables["#" +current_select.select(".details-table").attr("id")]
        var dim = (interval.value == "daily") ? "daily_grouped" : interval.value
        interval.chart.dimension(interval.chart.data().aggregateDimensions[dim])
        interval.chart.redraw()

         
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
          return x.key ? "col-md-2" : "col-md-12"
        })
        .classed("campaign-metric",true)
        .style("overflow","hidden")
        .style("height","35px")
        .style("font-size",function(x){return x.class == "name" ? "12px": ""})

    innerMetric
      .selectAll("span")
      .data(function(x){
        var series = x.key,
          data = x.data,
          values = x.values;

        return values ? values.map(function(v){
            var func = UI.formatters[v.key](series)
            value = v.formatter ? v.formatter(data) : func(data)
            return {
              "value": value,
              "key": v.key
            }
          }) : [{"value":x.value}]
      })
      .enter()
        .append("span")
        .attr("class",function(x){return "metric " + (x.key || "")})
        .text(function(x){ return x.value })
     
  }

  campaign_selector.build_expansion = function(row,CRS) { 

    var expansion = row.append("div")
        .classed("expansion col-md-12",function(d,i){
          d.index = i
          return true
        })
        .style("padding","0px")

    var detailsRow = expansion
      .append("div")

    var detailsGroup = detailsRow.append("table")
      .classed("raw details-table imps",true)
      .style("font-weight","normal")
      .style("min-height","100px") 
      .style("width","100%")
      .attr("id",function(x,i){return "details-table-" + i}) 

    var buildDetailsTables = function(wrapper,CRS) { 
      wrapper.data().map(function(x,i){
        var o ="#details-table-" + i
        campaign_selector.detail_tables[o] = UI.detailsTable.build(o,CRS)
      })
    }
    
    buildDetailsTables(detailsGroup,CRS)

  }

  campaign_selector.build_rows = function(data,body,CRS) {
    var row = body.selectAll(".campaign").data(data)

    row
      .enter()
      .append("div").classed("row campaign",true)
      .classed("active-row",function(x,i){return i == (data.length - 1)})
      .style("line-height","35px") 
      .style("min-height","35px")
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

    return row
  }

  campaign_selector.build = function(CRS,campaignTable) {

    var header = campaignTable.append("div")
      .classed("header",true)
      
    campaignHeader = header.append("div")
      .classed("col-md-3 table-interval-selector",true)
      .style("border-top","5px solid white")

    campaignHeader.append("span")
      .text("Campaign Name")      
    
    var inner = header.append("div")
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
        .style("border-top",function(x){ return "5px solid " + UI.constants.HEADER_COLORS(x.id) })
        .text(function(x){return x.value})

    var body = campaignTable.append("div")
      .classed("campaigns-body col-md-12",true)

    var data = bucketDataFormatter(CRS)

    var row = campaign_selector.build_rows(data,body,CRS)
    campaign_selector.build_metrics(row)
    campaign_selector.build_expansion(row,CRS) 

    interval = UI.intervalSelector.build(
      campaignHeader,
      UI.detailsTable.onIntervalSelection,
      false,
      false
    )

    var initalSelection = "#" + d3.select(".active-row").select(".details-table").attr("id")
    interval.chart = campaign_selector.detail_tables[initalSelection] 

    UI.campaign_bucket.selectCampaign("Campaign total",d3.select(".active-row"))

    return body
  
  }

  return campaign_selector

})(RB.portal.UI.campaign_selector || {})  
