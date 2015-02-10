var buildStreaming = function(wrapped,skip_title) {
  var live_summary = wrapped.append("div")
    .classed("panel-body",true)

  console.log(skip_title)

  if (!skip_title) live_summary.append("h4").text("Live Summary")

  buildPixelSummaryStreaming(live_summary)
  buildConversionSummaryStreaming(live_summary)
  buildServingSummaryStreaming(live_summary) 
  buildSpentSummaryStreaming(live_summary) 

  if (RB.QS.limited != "true") {
    buildCampaignStreaming(wrapped)
    buildPixelStreaming(wrapped)
    buildConversionStreaming(wrapped)
  }

  RB.websocket.connect()
 
}

var buildSpentSummaryStreaming = function(wrapped) {

  var group = wrapped.append("div")
    .classed("panel-sub-heading serving-summary-streaming ",true)

  rowFilter = function(d){ return [d] }

  var buffered_wrapper = RB.objects.streaming.buffered_block(
    "spent/min",                //title
    group,                      //obj
    rowFilter,                  //filter
    "advertiser_name",          //obj_name_key
    ["advertiser_id"],          //data_fields to recursively match obj_fields
    ["external_advertiser_id"], //obj_fields to recursively match data_fields
    function(){},
    function(to_count) {
      var price = to_count.map(function(x){ return parseFloat(x.price) }).reduce(function(c,n){return c+n},0)

      return {
        "count": to_count.length,
        "spend": price
      }
    },
    "spend"
  )

  RB.websocket.add_on_connected( function(){

    group.attr("id",function(x){

      if (!x.spent_summary_streaming) {
        
        var selection = d3.select(this),
          subscriptions = selection[0][0].__data__.subscriptions

        subscriptions = RB.helpers.buildSimpleSubscription(
          selection.data(),
          "served_imps",
          "advertiser_id",
          "external_advertiser_id",
          "spent_summary",
          function(x) {buffered_wrapper.add(x.served_imps)}
        )

      } 
      x.spent_summary_streaming = true
      RB.websocket.subscribe()
      return subscriptions

    })
  })
}

var buildServingSummaryStreaming = function(wrapped) {

  var group = wrapped.append("div")
    .classed("panel-sub-heading serving-summary-streaming ",true)

  rowFilter = function(d){ return [d] }

  var buffered_wrapper = RB.objects.streaming.buffered_block(
    "served/min", 
    group,
    rowFilter,
    "advertiser_name",
    ["advertiser_id"],
    ["external_advertiser_id"]
  )

  RB.websocket.add_on_connected( function(){

    group.attr("id",function(x){

      if (!x.served_summary_streaming) {
        
        var selection = d3.select(this),
          subscriptions = selection[0][0].__data__.subscriptions

        subscriptions = RB.helpers.buildSimpleSubscription(
          selection.data(),
          "served_imps",
          "advertiser_id",
          "external_advertiser_id",
          "serving_summary",
          function(x) {buffered_wrapper.add(x.served_imps)}
        )

      } 
      x.served_summary_streaming = true
      RB.websocket.subscribe()
      return subscriptions

    })
  })
}

var buildPixelSummaryStreaming = function(wrapped) {

  var pixel_group = wrapped.append("div")
    .classed("panel-sub-heading pixel-summary-streaming ",true)

  rowFilter = function(d){ return [d] }

  var buffered_wrapper = RB.objects.streaming.buffered_block(
    "visits/min",
    pixel_group,
    rowFilter,
    "advertiser_name",
    ["source"],
    ["pixel_source_name"]
  )

  RB.websocket.add_on_connected( function(){

    pixel_group.attr("id",function(x){

      if (!x.pixels_summary_streaming) {
        
        var selection = d3.select(this),
          subscriptions = selection[0][0].__data__.subscriptions

        subscriptions = RB.helpers.buildSimpleSubscription(
          selection.data(),
          "visit_events",
          "source",
          "pixel_source_name",
          "pixel_summary",
          function(x) {buffered_wrapper.add(x.visit_events)}
        )

      } 
      x.pixels_summary_streaming = true
      RB.websocket.subscribe()
      return subscriptions

    })
  })
}

var buildCampaignBufferedRow = function(row) {
  
  rowFilter = function(d){
    if (d.campaigns.length) {
      return d.campaigns.filter(function(x){
        return x.active
      })
    } else {
      return []
    }
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
    fields.object_fields,
    function(x,transform,rows) {
      var spent = rows.selectAll(".spent-value").data(function(d){
        var data = transform(x)(d)
        if (data)
          var v = data.reduce(function(p,n){ return p + n.value.spend },0),
            cpm = v/data.reduce(function(p,n){ return p + n.value.count},0)
        return data ? [v, cpm] : [0, 0]
      })

      var get_spend = function(x) {
        var rounded = parseInt(x*100)/100.0
        return format(rounded)
      }

      spent.enter()
        .append("div").classed("spent-value col-md-1",true)
        .text(get_spend)

      spent
        .text(get_spend)
    },
    function(to_count) {
      var price = to_count.map(function(x){ return parseFloat(x.price) }).reduce(function(c,n){return c+n},0)

      return {
        "count":to_count.length,
        "spend": price
      }
    }
  )

}

var buildCampaignStreaming = function(wrapped) {

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
            "callback":function(x,w){
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

var buildPixelBufferedRow = function(row) {
  
  rowFilter = function(d){
    return d.segments.filter(function(x){ 
      x.pixel_source_name = d.pixel_source_name
      return x.segment_implemented != 0 && x.segment_implemented.indexOf("type=conv") == -1 
    })
  }

   var fields = {
    name_field: "segment_name",
    data_fields: ["source","an_seg"],
    object_fields: ["pixel_source_name","external_segment_id"],
  }

  return RB.objects.streaming.buffered_row(
    row,
    rowFilter,
    fields.name_field,
    fields.data_fields,
    fields.object_fields
  )

}

var buildPixelStreaming = function(wrapped) {

 var pixel_group = wrapped.append("div")
    .classed("panel-sub-heading pixel-streaming list-group",true)

  pixel_group.append("div").classed("list-group-item",true)
    .text("Pixel Streaming")

  var pixels = wrapped.append("div")
    .classed("list-group pixel-streaming hidden", true) 

  var row = pixels.append("div").classed("row",true)
    .append("div").classed("col-md-12",true)

  var buffered_wrapper = buildPixelBufferedRow(row)



  pixel_group.on("click",function(x){

    if (!x.pixels_streaming) {
      x.pixels_streaming = true
      var selection = d3.select(this)

      selection[0][0].__data__.subscriptions = selection.data().map(function(a){
        return RB.websocket.addSubscription(
          "visit_events",
          {"name":"source","values":[a.pixel_source_name]},
          { 
            "name":"pixel",
            "callback":function(x){
              buffered_wrapper.add(x.visit_events)
            } 
          }
        )                             
      })

    } else {
      x.pixels_streaming = false
      var selection = d3.select(this).data() 
      console.log(selection)
      selection.map(function(sel){sel.subscriptions.map(RB.websocket.removeSubscription)})
    }
    RB.websocket.subscribe()

  })
}

var buildConversionStreaming = function(wrapped) {

  var pixel_group = wrapped.append("div")
    .classed("panel-sub-heading conversion-streaming list-group",true)

  pixel_group.append("div").classed("list-group-item",true)
    .text("Conversion Streaming")

  var pixels = wrapped.append("div")
    .classed("list-group conversion-streaming hidden", true) 

  var row = pixels.append("div").classed("row",true)
    .append("div").classed("col-md-12",true)


  var rowFilter = function(d){
    return d.segments.filter(function(x){ 
      x.pixel_source_name = d.pixel_source_name
      return x.segment_implemented != 0 && x.segment_implemented.indexOf("type=conv") > -1 
    })
  }

  var buffered_wrapper = RB.objects.streaming.buffered_row(
    row,                          //obj
    rowFilter,                    //filter
    "segment_name",               //obj_name_key
    ["source","seg"],          //data_fields to recursively match obj_fields
    ["pixel_source_name","external_segment_id"], //obj_fields to recursively match data_fields
    function(){},
    function(to_count) {
      var price = to_count.map(function(x){ return parseFloat(x.price) }).reduce(function(c,n){return c+n},0)

      return {
        "count": to_count.length,
        "spend": price
      }
    },
    "spend"
  )

  RB.websocket.add_on_connected( function(){

    pixel_group.attr("id",function(x){

      if (!x.conversion_streaming) {
        
        var selection = d3.select(this),
          subscriptions = selection[0][0].__data__.subscriptions

        subscriptions = RB.helpers.buildSimpleSubscription(
          selection.data(),             //data
          "conversion_events",          //stream
          "an_seg",                     //filter column (from data)
          "external_segment_id",        //filter value  (from object)
          "conversion_events",              //callback registered name
          function(x) {
            buffered_wrapper.add(x.conversion_events)
          } //callback
        )

      } 
      x.conversion_streaming = true
      RB.websocket.subscribe()
      return subscriptions

    })
  })
}

var buildConversionSummaryStreaming = function(wrapped) {

  var pixel_group = wrapped.append("div")
    .classed("panel-sub-heading conversion-summary-streaming ",true)

  rowFilter = function(d){ return [d] }

  var buffered_wrapper = RB.objects.streaming.buffered_block(
    "conv/min",
    pixel_group,
    rowFilter,
    "advertiser_name",
    ["source"],
    ["pixel_source_name"]
  )

  RB.websocket.add_on_connected( function(){

    pixel_group.attr("id",function(x){

      if (!x.conversion_summary_streaming) {
        
        var selection = d3.select(this),
          subscriptions = selection[0][0].__data__.subscriptions

        subscriptions = RB.helpers.buildSimpleSubscription(
          selection.data(),
          "conversion_events",
          "source",
          "pixel_source_name",
          "conversion_summary",
          function(x) {buffered_wrapper.add(x.conversion_events)}
        )

      } 
      x.conversion_summary_streaming = true
      RB.websocket.subscribe()
      return subscriptions

    })
  })
}
