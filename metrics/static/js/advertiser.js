var buildAdvertiserInfo = function(obj) {

  var panels = obj

  panels
    .append("div")
    .classed("panel-body summary",true)
    .selectAll("div")
    .data(function(x){
      var d = {
        "Pixel Source" : x['pixel_source_name'],
        "Contact Info": x['contact_name'],
        "Contact Email": x['email'],
        //"Goal": x['advertiser_goal'],
      }
      return d3.entries(d)
    })
    .enter()
      .append("div")
      .text(function(x){
        return x.key + " : " + x.value
      })
      .sort(function(x,y){
        return -x.key.localeCompare(y.key);
      })
      .sort(function(x,y){
        var w = (typeof x.value == "string") ? 2 : 0
        var z = (typeof x.value == "string") ? 2 : 0 
        return w - z
      })
}


var buildAdvertiserWrapper = function(data, id, width, show_id, internal) {
  var wrapper_width = width || 6,
    show_id = show_id || false

  var wrappers = d3.select(id).selectAll(".wrapper")
    .data(data).enter()
    .append("div")
      .classed("wrapper col-md-" + wrapper_width,true)
      .attr("id",function(x){return x.external_advertiser_id})


  var panels = wrappers
    .append("div")
    .classed("panel",true)
    .classed("panel-default",true)
    .classed("panel-warning", function(x) {
      return x.active && internal && !x.running
    })
    .classed("panel-success", function(x) {
      return x.active && x.running && internal
    })
    
     

  var headings = panels.append("div").classed("panel-heading",true);

  if (show_id) {
    headings.append("span")
      .classed("pull-right",true)
      .text(function(x){return x.external_advertiser_id})
  }

  var titles = headings.append("h3")
    .classed("panel-title",true)
    .text(function(x) {return x.advertiser_name})

  return panels

}
