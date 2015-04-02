var RB = RB || {}
RB.yoshi = RB.yoshi || {}
RB.yoshi.UI = RB.yoshi.UI || {}

RB.yoshi.UI.history = (function(history){

  var UI = RB.yoshi.UI

  history.buildCreative = UI.creative.build
  history.buildCampaignVerification = UI.campaign_summary.build

  history.build = function(target,data) {
    history.heading(target)
    history.table(target,data)
  }


  history.heading = function(target) {
    target.append("div")
      .classed("panel-heading",true)
      .append("h3")
      .classed("panel-title",true)
      .text("Ad placements that you have visited")
  }

  history.table = function(target,data){
    var days = target.selectAll("div .list-group") 
      .data(data)

    var newDays = days
      .enter()
        .append("div")
        .classed("list-group",true)
        .attr("id",function(x){return x.key})
        .sort(function(a,b){
          return d3.descending(Date.parse(a.key), Date.parse(b.key))
        })

    var rows = history.addGroup(newDays) 
    history.buildPanelRow(rows) 

    var newRows = history.modifyGroup(days)
    history.buildPanelRow(newRows)


    $(".ad-history .list-group-item-heading").parent().sticky({getWidthFrom:".entry"})

  }

  history.groupHeader = function(days) {
    days.append("div")
      .classed("list-group-item",true)
      .append("h5")
      .classed("list-group-item-heading",true)
      .text(function(x){return x.key})
  }

  history.groupItem = function(group) {

    var items = group.selectAll(".list-group-item.entry")
    var newItems = items.data(function(d){return d.values})
      .enter()
        .append("div")
        .classed("list-group-item entry",true)
        .sort(function(a,b){return d3.descending(a.timestamp_epoch, b.timestamp_epoch)})
        .append("div").classed("row",true)

    return newItems
  }

  history.modifyGroup = function(group) {

    var groupItems = history.groupItem(group)

    groupItems.style("color","red")
    groupItems.transition()
      .duration(3000)
      .style("color", "black");

    return groupItems
  }
  
  history.addGroup = function(group) {

    history.groupHeader(group)
    var groupItems = history.groupItem(group) 

    return groupItems
  }

  history.buildPanelRow = function(row){
    var index = row.append("div")
      .classed("col-md-2",true)

    index.append("span")
      .append("input")
      .attr("type","checkbox")
      .on("click",function(){
        var isChecked = d3.select(this).property("checked")
        var parent = d3.select(this.parentNode.parentNode.parentNode)
        var childCheckboxes = parent.selectAll("table").selectAll("input")
        childCheckboxes.property('checked',isChecked)
        childCheckboxes.property('disabled',isChecked)

        RB.yoshi.actions.toggleCampaignVerification(true)
        d3.event.stopPropagation()
      })

    index.append("span")
      .text(function(d) {return d.timestamp})

    var urlWrap = row.append("div")
      .classed("col-md-9",true)

    var s = row.append("div")
      .classed("col-md-1",true)
      .style("cursor","pointer")
        .classed("expand-div",true)
        .text("+")



    var urlRow = urlWrap.selectAll(".url-with-details")
      .data(function(d){
        return d.urls
      })
      .enter()
        .append("div")
        .classed("url-with-details",true)

    urlRow.append("div")
      .classed("url-name",true)
      .text(function(x){return x.key})

    history.buildDetailsTable(urlRow)

    row.on("click",function(x,e,s){
      var self = d3.select(this)
      var cl = d3.event.srcElement.classList
      if (cl.contains("url-name") || cl.contains("expand-div")) {
        var table = self.selectAll(".table-wrapper")
        table.classed("hidden",function(x){ return !this.classList.contains("hidden") })
      }
    })
     
  }

  history.buildDetailsTable = function(row) {

    var wrapper = row.append("div").classed("table-wrapper hidden",true)

    wrapper.append("div")
      .html("<br>")

    var table = wrapper.append("table")
      .classed("table table-condensed",true)

    //var columns = ["count","seller","sizes","tag_id","percent_viewable","historical_cpm","target"]
    var columns = ["count","seller","sizes","tag_id","percent_viewable","target"]
    var header = table.append("thead").append("tr")
    var tr = table.append("tbody").selectAll("tr")
      .data(function(d){return d.value})
      .enter()
        .append("tr")

    columns.map(function(col) {
      header.append("th").text(col.capitalize().split("_").join(" "))
      var td = tr.append("td")
      if (col == "target") {
        td.append("input").attr("type","checkbox")
          .classed("bottomLevelCheckbox",true)
          .on("click",function(x){
            RB.yoshi.actions.toggleCampaignVerification(true)
          })
      } else {
        td.html(function(d){ 
          if (col.indexOf("percent") > -1) return d[col] > 0 ? d3.format("%")(d[col]) : "<a class='no-viewability-data' title='We have not collected viewability information for this placement'>No data available</a>"
          if ((col.indexOf("cpm") > -1) && (d[col] > 0)) return parseInt(d[col]*100)/100
          return d[col] 
        })
      }
    })
   
    $('.no-viewability-data').tooltip()
  }

  

  return history
})(RB.yoshi.UI.history || {})




