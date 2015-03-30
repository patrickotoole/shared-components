var RB = RB || {}
RB.yoshi = RB.yoshi || {}
RB.yoshi.UI = (function(UI){

  UI.popup = (function(popup){

    var runCheckboxAction = function(data) { }

    popup.buildTable = function(target,data,isNew) {

      var newData = data
      if (isNew) {
        var oldData = d3.select("#content-table")
          .select("tbody")
          .selectAll("tr")
          .data() || [] 
        var newData = data.concat(oldData)
      } 

      var count = newData.reduce(function(p,d){return p+ d.count},0)
      if (count > 0)
         document.getElementById("yoshi-state").innerText = "There are " + count + " targettable ads" 
 
      var rows = d3.select("#content-table")
        .select("tbody")
        .selectAll("tr")
        .data(newData,function(d){return d.seller})

      var newRows = rows.enter()
        .insert("tr", ":first-child")
        .sort(function(a, b) {
          return d3.descending(a.timestamp, b.timestamp)
        })
        .style("color", function(){return isNew ? "red" : "black" })

      popup.buildRow(newRows)
      rows.exit().remove()
    } 

    popup.buildRow = function(rows) {


      rows
        .classed("seller-target",true)
        .transition()
        .duration(1000)
        .style("color", "black");
        
     
      var td = rows.append("td")
        
      var checkboxes = td
        .append("input")
        .style("float","right")
        .attr("type",function(x) {
          return "checkbox"
        })
        .classed("midLevelCheckbox",true)
        .on("click", runCheckboxAction) 

      td.append("div").classed("count",true)
        .html(function(x){return x.count + "<div>ad calls</div>"})

      td.append("div").classed("seller",true)
        .text(function(x){return x.seller})

      td.append("div").classed("domain",true)
        .text(function(x){return x.domain})
        //.text(function(x){return x.domain + " (" + x.viewability + " viewable)"})

      td.append("div").classed("sizes",true)
        .text(function(x){return x.sizes})
          

      d3.select("#topLevelCheckbox")
        .on("click", function(d) {
          var isChecked = d3.select(this).property("checked")
          checkboxes 
            .property('checked', isChecked)
            .property('disabled', isChecked)
            .each(runCheckboxAction)
        })

    }

    return popup
  })(UI.popup || {})

  return UI
})(RB.yoshi.UI || {})
