var buildChecksWrapper = function(data, id, width, show_id) {
  var wrapper_width = width || 6,
    show_id = show_id || false

  var wrappers = d3.select(id).selectAll(".wrapper")
    .data(data).enter()
    .append("div")
      .classed("wrapper col-md-" + wrapper_width,true)
      .attr("id",function(x){return x.fixture_name})


  var panels = wrappers
    .append("div")
    .classed("panel",true)
    .classed("panel-default",function(x) {
      return !x.active || wrapper_width != 6
    })
    .classed("panel-success", function(x) {
      return x.active && wrapper_width == 6
    })

  var headings = panels.append("div").classed("panel-heading",true);

  var titles = headings.append("h3")
    .classed("panel-title",true)
    .text(function(x) {return x.fixture_name})

  return panels

}

var buildFixtureInfo = function(obj) {

  var panels = obj

  var objs = panels
    .append("div")
    .classed("panel-body summary",true)
    .append("form").classed("form-group",true)
    .selectAll("div")
    .data(function(x){
      var d = d3.entries(x).filter(function(y){return  y.key != "id"})
      return d
    })
    .enter()
      .append("div")
      .classed("row",true)
      .attr("id",function(x){return x.key})
      .sort(function(x,y){
        var w = (typeof x.value == "string") ? 2 : 0
        var z = (typeof x.value == "string") ? 2 : 0 
        return w - z
      })

  objs
    .append("label")
    .classed("col-md-4",true)
    .text(function(x){
      return x.key
    })

  objs
    .append("a")
    .classed("col-md-8 input-option",true)
    .text(function(x){
      return x.value
    })
    .on("click",function(x){
      d3.select(this.parentNode.parentNode.parentNode.parentNode)
        .selectAll(".input-option")
        .classed("hidden",function(x){
          return !this.classList.contains("hidden") 
        })
    })

   

  objs
    .append("div")
    .classed("col-md-8 hidden input-option",true)
    .append("input")
    .classed("form-control",true)
    .attr("value",function(x){
      return x.value
    })
    .on("change",function(x){
      
      var value = this.value,
        data = d3.select(this.parentNode.parentNode.parentNode.parentNode).data()[0],
        attr = x.key

      data[attr] = value  
      this.parentNode.parentNode.parentNode.parentNode.parentNode.__data__ = data
      
      d3.select(this.parentNode.previousSibling).text(value)
    })

  panels
    .append("div")
    .classed("row hidden input-option",true)
    .append("div")
    .classed("col-md-12",true)
    .append("div")
    .classed("btn btn-success btn-sm",true)
    .text("click put")
    .on("click",function(x){
      var data = d3.select(this.parentNode.parentNode.parentNode).data()[0]
      $.ajax("/admin/campaign_check/fixtures",{"type":"put","data":JSON.stringify(data)})
      d3.select(this.parentNode.parentNode.parentNode.parentNode)
        .selectAll(".input-option")                  
        .classed("hidden",function(x){               
          return !this.classList.contains("hidden")
        })

    })

}
