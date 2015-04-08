var RB = RB || {}
RB.yoshi = RB.yoshi || {}
RB.yoshi.UI = RB.yoshi.UI || {}

RB.yoshi.UI.recommended = (function(recommended){

  var UI = RB.yoshi.UI
  var history = UI.history

  recommended.build = function(target) {
    console.log("HERE",target)
    recommended.heading(target)
    
    RB.AJAX.rockerbox.getHoverboard(function(data){
      data.map(function(x){x.key = x.domain})
      recommended.table(target,data)
    })
  }


  recommended.heading = function(target) {
    var h = target.append("div")
      .classed("panel-heading",true)
      .append("h3")
      .classed("panel-title",true)

    h.append("a")
      .text("Select Placements ")
      .on("click", function(){
        d3.selectAll(".ad-selection .ad-selection-content")
          .classed("hidden",true)
        d3.selectAll(".ad-selection-content.ad-selection")
          .classed("hidden",false)
      })
       
    h.append("span")
      .html("&rsaquo; Rockerbox recommended placements")
  }

  recommended.table = function(target,data){
    var days = target.selectAll("div .list-group") 
      .data([{"key":"Recommended Pages","values":data}])

    var newDays = days
      .enter()
        .append("div")
        .classed("list-group",true)
        .attr("id",function(x){return x.key})
        .sort(function(a,b){
          return d3.descending(Date.parse(a.key), Date.parse(b.key))
        })

    var rows = recommended.addGroup(newDays) 
    recommended.buildPanelRow(rows) 

  }

  recommended.addGroup = function(group){
    history.groupHeader(group)
    var groupItems = history.groupItem(group) 

    return groupItems
  }


  recommended.buildPanelRow = function(row){
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
        if (d3.event) d3.event.stopPropagation()
      })

    index.append("span")
      .text(function(d) {return d.tf_idf})

    var urlWrap = row.append("div")
      .classed("col-md-9",true)

    var s = row.append("div")
      .classed("col-md-1",true)
      .style("cursor","pointer")
        .classed("expand-div",true)
        .text("+")

    var urlRow = urlWrap.selectAll(".url-with-details")
      .data(function(d){
        return [d.domain]
      })
      .enter()
        .append("div")
        .classed("url-with-details",true)

    urlRow.append("div")
      .classed("url-name",true)
      .text(function(x){return x})

    recommended.buildDetailsTable(urlRow)

    row.on("click",function(x,e,s){
      var self = d3.select(this)
      var cl = d3.event.srcElement.classList
      if (cl.contains("url-name") || cl.contains("expand-div")) {
        var table = self.selectAll(".table-wrapper")
        table.classed("hidden",function(x){ return !this.classList.contains("hidden") })
      }
    })
     
  }

  recommended.buildDetailsTable = function(row) {
    
    var build = function(r,data) {
      var wrapper = r.append("div").classed("table-wrapper hidden",true)

      wrapper.append("div")
        .html("<br>")

      var table = wrapper.append("table")
        .classed("table table-condensed",true)

      var columns = ["size","tag_id","percent_viewable","target"]
      var header = table.append("thead").append("tr")
      var tr = table.append("tbody").selectAll("tr")
        .data(function(d){return data})
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
   
    }

    row.map(function(r){
      var obj = d3.selectAll(r)
      var d = obj.data()[0]
      RB.AJAX.rockerbox.getViewability("?domain=" + d,function(data){
        var data = data.filter(function(x){
          x.sizes = [x.size]
          x.placements = [x.tag_id]
          return x.num_loaded > 40
        })
        build(obj,data) 
      })
      
    })
     
  }
 

  return recommended
})(RB.yoshi.UI.recommended || {})



 
