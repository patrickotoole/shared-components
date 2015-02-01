var buildPixel = function(wrapped) {

  wrapped.append("div").classed("panel-body",true)
    .append("h4").text("On-site Activity Attribution (Pixels)")

  buildPixelReporting(wrapped)
     
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
 

