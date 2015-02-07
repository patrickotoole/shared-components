var buildPixel = function(wrapped) {

  wrapped.append("div").classed("panel-body",true)
    .append("h4").text("On-site Activity Attribution (Pixels)")

  //buildPixelReporting(wrapped)

  wrapped.append("div").classed("panel-body",true)
    .append("h4").text("Live Pixel Activity")
 
  buildPixelStreaming(wrapped)
     
}

var buildBufferedRow = function(row,rowFilter,name_key,data_fields,object_data_fields) {

  /*
  var fields = {
    name_field: name_key,
    data_fields: data_fields,
    object_data_fields: object_data_fields,
    data_field: data_fields[data_fields.length-1],
    object_data_field: object_data_fields[object_data_fields-1]
  }*/

  var fields = {
    name_field: "segment_name",
    data_fields: ["source","an_seg"],
    data_field: "an_seg",
    object_fields: ["pixel_source_name","external_segment_id"],
    object_field: "external_segment_id"
  }

  var pixel_bars = row
    .append("div")
    .classed("col-md-6 pixel-row-wrapper",true)

  var rows = pixel_bars.append("div").classed("row",true).selectAll("div")
    .data(rowFilter)
    .enter()
      .append("div")
      .attr("id",function(x){return x[fields.name_field] })

  var col = rows.append("div").classed("col-md-6 pixel-row-name",true)

  col.append("div")
    .style("font-size","13px").style("height","13px")
    .style("padding","6px").style("vertical-align","bottom")
    .text(function(x){return x[fields.name_field] })

  bar_wrapper   = rows.append("div").classed("col-md-3 min-height",true)
  count_wrapper = rows.append("div").classed("col-md-1",true)
   
  

  var axisTransform = function(obj) {

    return function(data) {
      var filtered = data.value.filter(function(x){ 
        return x[fields.data_fields[0]] == obj[fields.object_fields[0]]
      })
      return {"time":data.time,"value":filtered.length}
    }   
  }

  var STEPS = 60,
    BAR_WIDTH = 2,
    HEIGHT = 22;


  var buffered_wrapper = RB.websocket.buildBufferedWrapper(STEPS);
  var graph = RB.objects.streaming.graph(
    bar_wrapper,
    BAR_WIDTH,
    HEIGHT,
    buffered_wrapper.buffer,
    RB.helpers.nestedDataSelector(fields),
    axisTransform
  )

  buffered_wrapper.callbacks.push(function(x){

    var flattened = [].concat.apply([],x.map(function(x){ 
      x.value.map( function(y) { y.time = x.time }); 
      return x.value
    }))

    var m = d3.nest()
      .key(function(x){return x.source})
      .key(function(x){return x.an_seg})
      .key(function(x){return x.time})
      .map(flattened) 

    var times = x.map(function(y){return y.time})

    RB.helpers.recursiveMapBuffer(m,times)


    graph(m)
  })

  return buffered_wrapper
}


var buildPixelBufferedRow = function(row) {
  /*var pixel_bars = row
    .append("div")
    .classed("col-md-6",true)
  */

  rowFilter = function(d){
    return d.segments.filter(function(x){ 
      x.pixel_source_name = d.pixel_source_name
      return x.segment_implemented != 0 && x.segment_implemented.indexOf("type=conv") == -1 
    })
  }

  return buildBufferedRow(row,rowFilter)
  /*
  var rows = pixel_bars.append("div").classed("row",true).selectAll("div")
    .data(rowFilter)
    .enter()
      .append("div")
      .attr("id",function(x){return x.segment_name})


  col = rows.append("div").classed("col-md-6 ",true)

  col.append("div")
    .style("font-size","13px").style("height","13px").style("padding","6px").style("vertical-align","bottom")
    .text(function(x){return x.segment_name})

  bar_wrapper = rows.append("div").classed("col-md-3 min-height",true)
  count_wrapper = rows.append("div").classed("col-md-1",true)


  var formatter = function(data) {
    var data = data;
    return function(segment) {
      var source = data[segment.pixel_source_name] || {}
      var datum = source[segment.external_segment_id] 
      return datum ? d3.map(datum).entries().map(function(x){x.time = x.key;return x}) : false;
    }
  }

  var groupFormatter = function(w) {
    return function(obj) {
      // im not certain this is a good long term solution but it works for now
      var data = obj.value.filter(function(x){ return x.source == w.pixel_source_name})
      return {"time":obj.time,"value":data.length}
    }
  }
 
  var buffered_wrapper = RB.websocket.buildBufferedWrapper(60);
  var graph = RB.objects.streaming.graph(bar_wrapper,2,22,buffered_wrapper.buffer,formatter,groupFormatter)
  buffered_wrapper.callbacks.push(function(x){

    var flattened = [].concat.apply([],x.map(function(x){ 
      x.value.map( function(y) { y.time = x.time }); 
      return x.value
    }))

    var m = d3.nest()
      .key(function(x){return x.source})
      .key(function(x){return x.an_seg})
      .key(function(x){return x.time})
      .map(flattened) 

    var times = x.map(function(y){return y.time})

    RB.helpers.recursiveMapBuffer(m,times)

    graph(m)
  })
 
  return buffered_wrapper

  */
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
    console.log(bar_wrapper.node().getBoundingClientRect())

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
 

