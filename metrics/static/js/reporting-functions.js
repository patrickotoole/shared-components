var selectCampaign = function(campaign,target) {

  console.log(campaign,target)

  campaign == "Campaign total" ?
    CRS.dimensions.total_campaign_bucket.filterAll() :
    CRS.dimensions.total_campaign_bucket.filter(function(f){return f == campaign});

  dc.deregisterAllCharts("infocus-group")

  console.log("#" + target.select(".main-chart").attr("id"))

  dc.registerChart(main_charts["#" + target.select(".main-chart").attr("id")],"infocus-group")
  dc.registerChart(slider_charts["#" + target.select(".interval-chart").attr("id")],"infocus-group") 

  //sliderGraph.redraw()
  //mainGraph.redraw()
  dc.renderAll("infocus-group")

  updateCampaignReports(
    $('#campaign-reports-box .outer-interval-select .interval-select li.interval-active').text(),
    campaign 
  )

  campaignReportsTable.redraw()
}

var buildBucketReporting = function(CRS,target) {

  var CAMPAIGN_TOTAL = "Campaign total"

  var totalDimension = CRS.groups.all.value();
  totalDimension['campaign_bucket'] = CAMPAIGN_TOTAL;

  var topData = CRS.aggregateDimensions.total_campaign_bucket.top(100)
  topData.push(totalDimension)
  var last = topData.length -1


  target.append("br")

  var topCampaigns = target
    .append("div")
    .classed("campaign-table-new",true)

  var topHeader = topCampaigns.append("div").classed("header",true)
    .style("line-height","40px")
    .style("font-weight","500")
    .style("font-size","13px")
    .style("text-transform","uppercase")

  topHeader.append("div")
    .classed("col-md-3",true)
    .text("Campaign Name")

  names = ["Impressions","Views","Visits","Clicks","Conversions","Cost"]

  var colors = d3.scale.category10()

  var innerTopHeader = topHeader.append("div")
    .classed("col-md-8",true)

  names.map(function(name){
    innerTopHeader.append("div")
      .classed("col-md-2",true)
      .append("div")
      .style("border-top",function(x,i){
        return "5px solid " + colors(name)
      })
      //.style("border-left","5px solid white")
      .text(name)
  })

  var topBody = topCampaigns.append("div")
    .classed("campaigns-body",true)


  var row = topBody.selectAll(".campaign").data(topData)
    .enter()
    .append("div").classed("campaign",true)
    .style("line-height","35px") 
    .style("margin-bottom","10px")
    .classed("active-row",function(x,i){return i == last})
    .on('click',function(d){
      row.classed("active-row",false)    
      d3.select(this).classed("active-row",true)
      selectCampaign(d.campaign_bucket)
    })
    .sort(function(x,y){
      var a = x.campaign_bucket,
        b = y.campaign_bucket;

      if (x.campaign_bucket == CAMPAIGN_TOTAL) return 1
      if (y.campaign_bucket == CAMPAIGN_TOTAL) return 0
      
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    })
    .on('mouseover',function(x){
      d3.select(this).selectAll(".mini-metric").style("visibility","visible")
    })
   .on('mouseout',function(x){
      d3.select(this).selectAll(".mini-metric").style("visibility","hidden")
    })

  var metric = row.selectAll(".campaign-metric")
    .data(function(x){
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
    }).enter()
      .append("div")
      .classed("col-md-8",function(x,i){return (i == 1) })
      .classed("col-md-1",function(x,i){return (i == 2) }) 
      .classed("campaign-name-no-style col-md-3",function(x,i){return i == 0}) 
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
        .style("overflow","hidden")
        .style("height","35px")
        .style("font-size",function(x){return x.class == "name" ? "12px": ""})

  metric
    .append("span")
    .text(function(x){
      return (typeof(x) != "object") ? x : x.value
    })

  metric
    .append("span")
    .classed("mini-metric",true)
    .attr("style","font-size:.8em;margin-right:10px;float:right;color:grey;visibility:hidden")
    .text(function(x){
        return x.mini_value 
    })

}

function updateCampaignReports(currentReportView, currentCampaign, rowQty) {	

	if(typeof rowQty === "undefined") rowQty = 10;
	
	CRS.dimensions.daily.filterAll();
	
	var dateClass = null;
	var reportGroup = null;
	if(currentReportView == "day"){
		dateClass = 'date-day';
		reportGroup = CRS.aggregateDimensions.daily;
	}
	else if(currentReportView == "week"){
		dateClass = 'date-week';
		reportGroup = CRS.aggregateDimensions.weekly;
	}
	else if(currentReportView == "month"){	
		dateClass = 'date-month';
		reportGroup = CRS.aggregateDimensions.monthly;
	}
	
	if(currentCampaign == "Campaign total"){
		currentCampaign = undefined;
	}
	// else {
		// $('#campaign-reports-table #reports-header .reports-date').text("insertion order");
		// dateClass = 'date-io';
		// reportGroup = CRS.groups.io.all();
	// }
	
	if(reportGroup.top(rowQty + 1).length > rowQty){
		$('#campaign-reports-box .show-more').css("display", "inline-block");
	}
	else {
		$('#campaign-reports-box .show-more').hide();
	}
	
	campaignReportsTable.dimension(reportGroup)
	.group(function(d){ return d.date; })
	.sortBy(function(d){
		return d.date;					
	})
	.order(d3.descending)
	.size(rowQty)
    .dataSortBy(true)
	.sliceMode("bottom")
	.on("postRedraw", function(){ 
		if(typeof currentCampaign !== "undefined") $('#campaign-reports-box .box-title').text("Campaign reports | " + currentCampaign).attr("data-campaign-name", currentCampaign);
		else $('#campaign-reports-box .box-title').text("Campaign reports | Total").attr("data-campaign-name", "Campaign total");
		
		$('#campaign-reports-table #reports-header .reports-date').text(currentReportView);
		$('.reports-date').attr("class", "reports-date " + dateClass);
		$('#campaign-reports-table').fadeIn(200, "linear");	
		
		CRS.dimensions.total_campaign_bucket.filterAll();
	})
	.on("postRender", function(){
		if(typeof currentCampaign !== "undefined") $('#campaign-reports-box .box-title').text("Campaign reports | " + currentCampaign).attr("data-campaign-name", currentCampaign);
		else $('#campaign-reports-box .box-title').text("Campaign reports | Total").attr("data-campaign-name", "Campaign total");
		
		$('.reports-date').attr("class", "reports-date " + dateClass);
		$('#campaign-reports-table #reports-header .reports-date').text(currentReportView);
	})
	.rowClass("reports-row")
	.listClasses(["reports-date " + dateClass, "reports-impressions", "reports-thin-small", "reports-clicks", "reports-conversions", "reports-thin-small", "reports-cost"])
	.listItems([
		function(d){
			return '<span class="date-span">' + createDateValue(dateClass, d.date) + '</span>';
		},
		function(d){
			return formatNumber(d.imps);
		},
		function(d){
      return d.cost > 0 ? formatMoney(d.cost / (d.imps / 1000)): '-';
		},
		function(d){
			return formatNumber(d.clicks);
		},
		function(d){
			return formatNumber(d.conversions);
		},
		function(d){
			return d.conversions > 0 && d.cost > 0 ? formatMoney(d.cost / d.conversions) : '-';
		},
		function(d){
			return d.cost > 0 ? formatMoney(d.cost) : '-';
		},
	]);
}
