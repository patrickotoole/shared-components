var buildChecksWrapper = function(data, id, key, width, show_id) {
  var wrapper_width = width || 6,
    show_id = show_id || false,
    key = key || "fixture_name"

  var wrappers = d3.select(id).selectAll(".wrapper")
    .data(data).enter()
    .append("div")
      .classed("wrapper col-md-" + wrapper_width,true)
      .attr("id",function(x){return x[key]})


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
    .text(function(x) {return x[key]})

  return panels

}

var addSuiteFixture = function(obj,d) {
  var form_group = obj.append("div")
    .classed("panel-body",true)
    .append("form")
    .classed("form-group",true)

  form_group
    .append("select")
    .classed("form-control",true)
    .selectAll("option")
    .data(function(x){
      return d
    })
      .enter()
      .append("option")
      .text(function(x){
        return x.fixture_name
      })
      .attr("value",function(x){
        return x.fixture_id
      })

  form_group
    .append("div")
    .classed("pull-right btn btn-sm btn-success",true)
    .text("add")
    .on("click",function(x){
      var sel = d3.select(this.parentNode).select("select")[0][0]
      var suite_id = x.id
      var fixture_id = sel.options[sel.selectedIndex].value
      var _o = {
          "suite_id":suite_id,
          "fixture_id":fixture_id
      }
      $.post("/admin/campaign_check/relation",JSON.stringify(_o))
    })
    


}

var buildSuiteInfo = function(obj) {

  var panels = obj

  var objs = panels
    .append("div")
    .classed("panel-body summary",true)
    .append("form").classed("form-group",true)
    .selectAll("div")
    .data(function(x){
      var d = d3.entries(x).filter(function(y){return  y.key != "id" && y.key != "fixtures"})
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
      console.log(this.parentNode.parentNode.parentNode.parentNode.parentNode)
      console.log(data)
      
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
      console.log(this.parentNode.parentNode.parentNode)
      console.log(data)
      $.ajax("/admin/campaign_check/suites",{"type":"put","data":JSON.stringify(data)})
      d3.select(this.parentNode.parentNode.parentNode.parentNode)
        .selectAll(".input-option")                  
        .classed("hidden",function(x){               
          return !this.classList.contains("hidden")
        })

    })

  panels
    .append("div").classed("panel-heading",true)
    .append("h4").classed("panel-title",true)
    .text("Associated Fixtures")
   

  var groups = panels
    .append("div")
    .classed("list-group",true)

  
  var fixtures = groups
    .selectAll("div")
    .data(function(x){
      return x.fixtures
    })
    .enter()
      .append("div")
      .classed("list-group-item",true)

 fixtures
    .append("a")
    .classed("btn-xs btn btn-danger pull-right",true)
    .text("remove")
    .on("click",function(x){
      var r = confirm("are you sure?")
      if (r) {
        $.ajax("/admin/campaign_check/relation?fixture_id=" + x.fixture_id + 
          "&suite_id=" + x.suite_id,
          {"type":"delete"}
        )
        d3.select(this.parentNode).remove()
      }
    })
   

  fixtures
    .append("h5")
    .classed("list-group-item-heading",true)

    .text(function(x){
      return x.fixture_name
    })
    .on("click",function(x){
      d3.select(this.parentNode).select(".fixture-body").classed("hidden",function(y){
        return !this.classList.contains("hidden")
      })
    })

  
  var bodies = fixtures
    .append("div")
    .classed("fixture-body hidden",true)

  return bodies



}

var buildFixtureInfo = function(obj,exclude_edit) {

  var exclude_edit = exclude_edit || false


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

  if (exclude_edit) {

    objs
      .append("div")
      .classed("col-md-8 input-option",true)
      .text(function(x){
        return x.value
      })

  } else {

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
}
