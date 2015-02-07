var buildViewable = function(wrapped) {
  wrapped.append("div")
    .classed("panel-body",true)
    .append("h4")
    .text("Viewability Reporting")

  //buildAdvertiserViewabilityReporting(wrapped)
  buildCampaignStreaming(wrapped)
  //buildCampaignViewabilityReporting(wrapped)
  //buildTagViewabilityReporting(wrapped) 
  //buildVenueViewabilityReporting(wrapped)  
  //buildDomainListViewabilityReporting(wrapped)   
   
}

var buildCampaignBufferedRow = function(row) {
  
  rowFilter = function(d){
    return d.campaigns.filter(function(x){
      return x.active
    })
  }

   var fields = {
    name_field: "campaign_name",
    data_fields: ["advertiser_id","campaign_id"],
    object_fields: ["external_advertiser_id","campaign_id"],
  }

  return RB.objects.streaming.buffered_row(
    row,
    rowFilter,
    fields.name_field,
    fields.data_fields,
    fields.object_fields
  )

}

var buildCampaignStreaming = function(wrapped) {
  //RB.websocket.connect()

 var campaign_group = wrapped.append("div")
    .classed("panel-sub-heading campaign-streaming list-group",true)

  campaign_group.append("div").classed("list-group-item",true)
    .text("Campaign Streaming")

  var campaigns = wrapped.append("div")
    .classed("list-group campaign-streaming hidden", true) 

  var row = campaigns.append("div").classed("row",true)
    .append("div").classed("col-md-12",true)

  var buffered_wrapper = buildCampaignBufferedRow(row)



  campaign_group.on("click",function(x){

    if (!x.campaigns_streaming) {
      x.campaigns_streaming = true
      var selection = d3.select(this)

      selection[0][0].__data__.subscriptions = selection.data().map(function(a){
        return RB.websocket.addSubscription(
          "served_imps",
          {"name":"advertiser_id","values":[new String(a.external_advertiser_id)]},
          { 
            "name":"campaign",
            "callback":function(x){
              buffered_wrapper.add(x["served_imps"])
            } 
          }
        )                             
      })

    } else {
      x.campaigns_streaming = false
      var selection = d3.select(this).data() 
      selection.map(function(sel){sel.subscriptions.map(RB.websocket.removeSubscription)})
    }
    RB.websocket.subscribe()

  })
}             

var buildAdvertiserViewabilityReportingTables = function(pixel,data_key) {

  var wrapper = pixel.append("div").classed("row",true)
    .append("div").classed("col-md-12",true)


  RB.objects.timeseries.graphWithTable({
    "wrapper": wrapper.append("div").classed("col-md-6",true),
    "data_key": data_key,
    "graph_series": [
      {"name":"Visible","key":"visible"}, 
      {"name":"Loaded","key":"loaded"},
      {"name":"Served","key":"served"} 
    ],
    "table_series": [
      {"header":"Visible","key":["visible"],"formatter":format}, 
      {"header":"Loaded","key":["loaded"],"formatter":format},
      {"header":"Served","key":["served"],"formatter":format},
      {"header":"% loaded","key":["loaded","served"],"formatter":buildPercent},
      {"header":"% visible","key":["visible","loaded"],"formatter":buildPercent} 
    ],
    "title": "Advertiser Viewability"
  })

}

var buildAdvertiserViewabilityReporting = function(obj) {

  var build = function(x) {
    var elem = d3.select(x),
      data = x.__data__,
      data_key = "advertiser_reporting",
      advertiser = data.pixel_source_name,
      advertiser_name = data.advertiser_name

    if (!data[data_key]) {

      RB.data.advertiser_reporting(advertiser,function(data){

        data.map(function(e){
          e.name = advertiser_name
        })

        elem.text(function(x){ x[data_key] = data})
        buildAdvertiserViewabilityReportingTables(elem,data_key)
      })
 
    }
  }


  var advertiser_group = obj.append("div")
    .classed("panel-sub-heading advertiser-reporting list-group",true)

  advertiser_group.append("div").classed("list-group-item",true)
    .text("Advertiser Viewability")

  var pixels = obj.append("div")
    .classed("list-group advertiser-reporting", true)

  pixels[0].map(build)

  advertiser_group.on("click",function(x){
    if (!x['advertiser_reporting']) build(this.nextSibling)
  })

}    
 

var buildCampaignViewabilityReportingTables = function(pixel,data_key) {

  var wrapper = pixel.append("div").classed("row",true)
    .append("div").classed("col-md-12",true)


  RB.objects.timeseries.graphWithTable({
    "wrapper": wrapper.append("div").classed("col-md-6",true),
    "data_key": data_key,
    "graph_series": [
      {"name":"Visible","key":"visible"}, 
      {"name":"Loaded","key":"loaded"},
      {"name":"Served","key":"served"} 
    ],
    "table_series": [
      {"header":"Campaign","key":"name"},
      {"header":"Visible","key":["visible"],"formatter":format}, 
      {"header":"Loaded","key":["loaded"],"formatter":format},
      {"header":"Served","key":["served"],"formatter":format},
      {"header":"% loaded","key":["loaded","served"],"formatter":buildPercent},
      {"header":"% visible","key":["visible","loaded"],"formatter":buildPercent} 
    ],
    "title": "Campaign Viewability"
  })

}

var buildCampaignViewabilityReporting = function(obj) {

  var build = function(x) {
    var elem = d3.select(x),
      data = x.__data__,
      data_key = "campaign_reporting",
      campaign = data.pixel_source_name,
      campaign_name = data.campaign_name,
      advertiser_name = data.advertiser_name

    var campaigns = d3.nest()
      .key(function(d) {return d.campaign_id})
      .map(data.campaigns, d3.map)
     

    if (!data[data_key]) {

      RB.data.campaign_reporting(campaign,function(data){
        

        data.map(function(e){
          var c = campaigns.get(e.key) || [{}]
          if (c[0]["campaign_name"].toLowerCase().indexOf(advertiser_name.toLowerCase()) == -1) {
            e.name = c[0]["campaign_name"]
          } else {
            e.name = c[0]["campaign_name"].split(" -- ")[1]
          }
          e.name =  e.key + " " //+ e.name
        })

        elem.text(function(x){ x[data_key] = data})
        buildCampaignViewabilityReportingTables(elem,data_key)
      })
 
    }
  }


  var campaign_group = obj.append("div")
    .classed("panel-sub-heading campaign-reporting list-group",true)

  campaign_group.append("div").classed("list-group-item",true)
    .text("Viewability by campaign")

  var pixels = obj.append("div")
    .classed("list-group campaign-reporting hidden", true)

  //pixels[0].map(build)

  campaign_group.on("click",function(x){
    if (!x['campaign_reporting']) build(this.nextSibling)
  })

}    
 

var buildTagViewabilityReportingTables = function(pixel,data_key) {

  var wrapper = pixel.append("div").classed("row",true)
    .append("div").classed("col-md-12",true)


  RB.objects.timeseries.graphWithTable({
    "wrapper": wrapper.append("div").classed("col-md-6",true),
    "data_key": data_key,
    "graph_series": [
      {"name":"Visible","key":"visible"}, 
      {"name":"Loaded","key":"loaded"},
      {"name":"Served","key":"served"} 
    ],
    "table_series": [
      {"header":"Tag","key":"name"},
      {"header":"Visible","key":["visible"],"formatter":format}, 
      {"header":"Loaded","key":["loaded"],"formatter":format},
      {"header":"Served","key":["served"],"formatter":format},
      {"header":"% loaded","key":["loaded","served"],"formatter":buildPercent},
      {"header":"% visible","key":["visible","loaded"],"formatter":buildPercent} 
    ],
    "title": "Tag Viewability"
  })

}

var buildTagViewabilityReporting = function(obj) {

  var build = function(x) {
    var elem = d3.select(x),
      data = x.__data__,
      data_key = "tag_reporting",
      tag = data.pixel_source_name,
      tag_name = data.tag_name,
      advertiser_name = data.advertiser_name

    if (!data[data_key]) {

      RB.data.tag_reporting(tag,function(data){
        

        data.map(function(e){
          e.name =  e.key 
        })

        elem.text(function(x){ 
          x[data_key] = data.filter(function(z){
            return z.values[0].served > 0
          })
        })
        buildTagViewabilityReportingTables(elem,data_key)
      })
 
    }
  }


  var tag_group = obj.append("div")
    .classed("panel-sub-heading tag-reporting list-group",true)

  tag_group.append("div").classed("list-group-item",true)
    .text("Viewability by tag")

  var pixels = obj.append("div")
    .classed("list-group tag-reporting hidden", true)

  //pixels[0].map(build)

  tag_group.on("click",function(x){
    if (!x['tag_reporting']) build(this.nextSibling)
  })

}    
 

var buildVenueViewabilityReportingTables = function(pixel,data_key) {

  var wrapper = pixel.append("div").classed("row",true)
    .append("div").classed("col-md-12",true)


  RB.objects.timeseries.graphWithTable({
    "wrapper": wrapper.append("div").classed("col-md-6",true),
    "data_key": data_key,
    "graph_series": [
      {"name":"Visible","key":"visible"}, 
      {"name":"Loaded","key":"loaded"},
      {"name":"Served","key":"served"} 
    ],
    "table_series": [
      {"header":"Venue","key":"name"},
      {"header":"Visible","key":["visible"],"formatter":format}, 
      {"header":"Loaded","key":["loaded"],"formatter":format},
      {"header":"Served","key":["served"],"formatter":format},
      {"header":"% loaded","key":["loaded","served"],"formatter":buildPercent},
      {"header":"% visible","key":["visible","loaded"],"formatter":buildPercent} 
    ],
    "title": "Venue Viewability"
  })

}

var buildVenueViewabilityReporting = function(obj) {

  var build = function(x) {
    var elem = d3.select(x),
      data = x.__data__,
      data_key = "venue_reporting",
      venue = data.pixel_source_name,
      venue_name = data.venue_name,
      advertiser_name = data.advertiser_name

    if (!data[data_key]) {

      RB.data.venue_reporting(venue,function(data){
        

        data.map(function(e){
          e.name =  e.key 
        })

        elem.text(function(x){ x[data_key] = data})
        buildVenueViewabilityReportingTables(elem,data_key)
      })
 
    }
  }


  var venue_group = obj.append("div")
    .classed("panel-sub-heading venue-reporting list-group",true)

  venue_group.append("div").classed("list-group-item",true)
    .text("Viewability by venue")

  var pixels = obj.append("div")
    .classed("list-group venue-reporting hidden", true)

  //pixels[0].map(build)

  venue_group.on("click",function(x){
    if (!x['venue_reporting']) build(this.nextSibling)
  })

}    
 
var buildDomainListViewabilityReportingTables = function(pixel,data_key) {

  var wrapper = pixel.append("div").classed("row",true)
    .append("div").classed("col-md-12",true)


  RB.objects.timeseries.graphWithTable({
    "wrapper": wrapper.append("div").classed("col-md-6",true),
    "data_key": data_key,
    "graph_series": [
      {"name":"Visible","key":"visible"}, 
      {"name":"Loaded","key":"loaded"},
      {"name":"Served","key":"served"} 
    ],
    "table_series": [
      {"header":"Domain List","key":"name"},
      {"header":"Visible","key":["visible"],"formatter":format}, 
      {"header":"Loaded","key":["loaded"],"formatter":format},
      {"header":"Served","key":["served"],"formatter":format},
      {"header":"% loaded","key":["loaded","served"],"formatter":buildPercent},
      {"header":"% visible","key":["visible","loaded"],"formatter":buildPercent} 
    ],
    "title": "Domain List Viewability"
  })

}

var buildDomainListViewabilityReporting = function(obj) {

  var build = function(x) {
    var elem = d3.select(x),
      data = x.__data__,
      data_key = "domain_list_reporting",
      domain_list = data.pixel_source_name,
      domain_list_name = data.domain_list_name,
      advertiser_name = data.advertiser_name

    if (!data[data_key]) {

      RB.data.domain_list_reporting(domain_list,function(data){
        

        data.map(function(e){
          e.name =  e.key 
        })

        elem.text(function(x){ x[data_key] = data})
        buildDomainListViewabilityReportingTables(elem,data_key)
      })
 
    }
  }


  var domain_list_group = obj.append("div")
    .classed("panel-sub-heading domain_list-reporting list-group",true)

  domain_list_group.append("div").classed("list-group-item",true)
    .text("Viewability by domain_list")

  var pixels = obj.append("div")
    .classed("list-group domain_list-reporting hidden", true)

  //pixels[0].map(build)

  domain_list_group.on("click",function(x){
    if (!x['domain_list_reporting']) build(this.nextSibling)
  })

}
