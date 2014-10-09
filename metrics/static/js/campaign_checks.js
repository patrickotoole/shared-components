var buildPixels = function(obj) {
  var default_panel = obj

  default_panel
    .append("div")
    .classed("panel-sub-heading pixels list-group",true)
    .append("div")
    .classed("list-group-item",true)
    .text("Conversion Pixels")

  var pixel = default_panel
    .append("div")
    .classed("list-group pixel hidden", true)
    .selectAll("div")
    .data(function(x){
        return x.pixels || []
     })
    .enter()
      .append("div")
      .classed("list-group-item",true)
      .html(function(x){
        return '<h5 class="list-group-item-heading">' + x.pixel_name + '</h5>'
      })
      
  var pixel_details = pixel
    .selectAll(".row")
    .data(function(x){
      var y = [{
        "window":x.pc_window_hours,
        "revenue":x.pc_revenue,
        "type": "Post Click"
      },{
        "window":x.pv_window_hours,
        "revenue":x.pv_revenue,
        "type": "Post View"
      }]
      return y
    })
    .enter()
      .append("div")
      .classed("row",true)

  pixel_details 
    .append("div")
    .classed("col-md-4",true)
    .text(function(x){
      return x["type"] 
    })

  pixel_details 
    .append("div")
    .classed("col-md-4",true)
    .text(function(x){
      return format(x["window"]/24) + " days"
    })
   
  pixel_details 
    .append("div")
    .classed("col-md-4",true)
    .text(function(x){
      return "$" + x["revenue"] 
    })
}  
