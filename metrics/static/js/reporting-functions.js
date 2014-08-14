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
			return formatMoney(d.cost / (d.imps / 1000));
		},
		function(d){
			return formatNumber(d.clicks);
		},
		function(d){
			return formatNumber(d.conversions);
		},
		function(d){
			return d.conversions > 0 ? formatMoney(d.cost / d.conversions) : '-';
		},
		function(d){
			return formatMoney(d.cost);
		},
	]);
}