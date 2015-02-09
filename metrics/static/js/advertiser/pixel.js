var buildPixel = function(wrapped) {

  wrapped.append("div").classed("panel-body",true)
    .append("h4").text("On-site Activity Attribution (Pixels)")

  buildPixelReporting(wrapped)

  wrapped.append("div").classed("panel-body",true)
    .append("h4").text("Live Pixel Activity")
 
  buildPixelStreaming(wrapped)
     
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
  RB.websocket.connect()

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

var buildPixelReportingTables = function(pixel,data_key) {

  var wrapper = pixel.append("div").classed("row",true)
    .append("div").classed("col-md-12",true)


  RB.objects.timeseries.graphWithTable({
    "wrapper": wrapper.append("div").classed("col-md-6",true),
    "data_key": data_key,
    "graph_series": [
      {"name":"Rockerbox visits","key":"rbox_imps"},
      {"name":"All visits","key":"imps"}
    ],
    "table_series": [
      {"header":"Pixel","key":"name"},
      {"header":"Rockerbox","key":["rbox_imps"],"formatter":format},
      {"header":"Total","key":["imps"],"formatter":format} ,
      {"header":"%","key":["rbox_imps","imps"],"formatter":buildPercent}
    ],
    "title": "On-site visits"
  })

  RB.objects.timeseries.graphWithTable({
    "wrapper" : wrapper.append("div").classed("col-md-6",true),
    "data_key": data_key,
    "graph_series": [
      {"name":"Rockerbox Users","key":"rbox_users"},
      {"name":"All Users","key":"users"}
    ],
    "table_series": [
      {"header":"Pixel","key":"name"},
      {"header":"Rockerbox","key":["rbox_users"],"formatter":format},
      {"header":"Total","key":["users"],"formatter":format} ,
      {"header":"%","key":["rbox_users","users"],"formatter":buildPercent}  
    ],
    "title": "On-site uniques"
  })
 
}

var buildPixelReporting = function(obj) {

  var build = function(x) {
    var elem = d3.select(x),
      data = x.__data__,
      data_key = "pixel_reporting",
      advertiser = data.pixel_source_name

    var segments = d3.nest()
      .key(function(d) {return d.external_segment_id})
      .map(data.segments, d3.map)

    if (!data[data_key]) {

      RB.data.pixel_reporting(advertiser,function(data){

        data.map(function(e){
          var t = segments.get(e.key) || [{}]
          e.name = t[0]["segment_name"]
        })

        elem.text(function(x){ x[data_key] = data})
        buildPixelReportingTables(elem,data_key)
      })
 
    }
  }

  var pixel_group = obj.append("div")
    .classed("panel-sub-heading pixel-reporting list-group",true)

  pixel_group.append("div").classed("list-group-item",true)
    .text("Pixel Reporting")

  var pixels = obj.append("div")
    .classed("list-group pixel-reporting ", true) 

  pixels[0].map(build)

  pixel_group.on("click",function(x){
    if (!x['pixel_reporting']) build([this.nextSibling])
  })

}
 

