var RB = RB || {}
RB.portal = RB.portal || {}
RB.portal.UI = RB.portal.UI || {}

RB.portal.UI.detailsTable = (function(detailsTable) {

  var UI = RB.portal.UI

  detailsTable.build_interval = function(date,callback,fields,_chart) {
    UI.intervalSelector.build(date, callback, fields, _chart)
  }

  detailsTable.row = function(wrapped){

    wrapped.append("div")
      .classed("col-md-3 with-border date detail",true)
      .style("padding-left","20px")
      .style("font-size","13px")
      .html(function(d){
        return UI.formatters.createDateValue(d.type,d.date)
      })

    var details = wrapped.append("div")
      .classed("col-md-8 with-border",true)

    // TODO: move this to constants
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

          // TODO: move this logic to constants
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
    
  }

  detailsTable.onIntervalSelection = function(x,i,current) {
    var selected = x.value
    
    current.dimension(current.data().aggregateDimensions[selected])

    current.on("postRedraw",function(e){
      var anchor = d3.select(e.anchor())
      anchor.selectAll(".interval-select-span")
        .classed("daily",selected == "daily")
        .classed("weekly",selected == "weekly")
        .classed("monthly",selected == "monthly") 
    })

  }

  detailsTable.header = function(wrapped,_chart){
    var row = wrapped.append("div").classed("row details-header",true),
      date = row.append("div").classed("col-md-3 table-interval-selector",true)

    date.append("span").text("Date Interval")

    detailsTable.build_interval(
      date,
      detailsTable.onIntervalSelection,
      false,
      _chart
    )
    

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
        .style("border-top",function(x){ return "5px solid " + UI.constants.HEADER_COLORS(x.id) })
        .text(function(x){return x.value})
  }

  detailsTable.build = function(selector,CRS){
    return dc.dataGrid(selector,"table-group")
      .dimension(CRS.aggregateDimensions.weekly) 
      .group(function(d){return d.campaign_bucket})
      .d3Group(detailsTable.header)
      .d3(detailsTable.row)
      .sortBy(function(x){return x.date})
      .order(d3.descending)
      .sliceMode("bottom")
      .size(10)
      .data(CRS)
  }

  return detailsTable
})(RB.portal.UI.detailsTable || {})


 
