var RB = RB || {}
RB.yoshi = RB.yoshi || {}

RB.yoshi.UI = (function(UI){

  UI.history = (function(history){

    history.buildCreative = function(target,data) {
      var panel = target.selectAll(".panel")

      panel.append("div")
        .classed("panel-heading",true)
        .append("h3")
        .classed("panel-title",true)
        .text("Creative targeting")


      var d = d3.nest().key(function(x){return x.folder.name || "Default"})
        .entries(data)

      panel.append("div")
        .classed("list-group",true)
        .append("div")
        .classed("list-group-item",true)
        .append("h5")
        .classed("list-group-item-heading",true)
        .text("Select Creatives to Use for Campaign")
       

      var group = panel.selectAll(".list-group .creative-group")
        .data(d)
        .enter()
          .append("div").classed("list-group creative-group",true)

      

      var row = group
        .append("div")
        .classed("list-group-item",true)
        .append("div").classed("row",true)


      var item_header = row
        .append("div").classed("col-md-11",true)

      row.append("div").classed("col-md-1",true)
        .text("+")

      item_header
        .append("span")
        .append("input").attr("type","checkbox")
        .style("float","left")
        .style("margin-right","5px")
        .on("click",function(x) {
          var isChecked = d3.select(this).property("checked")
          d3.select(this.parentNode.parentNode).select("table")
            .selectAll("input")
              .property("checked",isChecked)
              .property("disabled",isChecked)

          RB.yoshi.actions.toggleCampaignVerification(true)
        })
        .property("checked",true)

      item_header
        .append("div")
        .style("display","block")
        .style("cursor","pointer")
        .text(function(x){return x.key })
        .attr("id",function(x){return x.key.toLowerCase().replace(/ /g,"_")})
        .on("click",function(x) {
          d3.select(this.parentNode).select("table")
            .classed("hidden",function(){return !this.classList.contains("hidden")})
        })

       

      var table = item_header.append("table").classed("hidden",true)
        .style("margin-left","4.15%")

      var header = table.classed("table table-hover",true).append("thead").append("tr")
      
      header.append("th").text("Creative size")
      header.append("th").text("Name")
      header.append("th").text("Sample")
      header.append("th").text("Include?")

      var entry = table.append("tbody")
        .attr("id",function(x){return "entry-group-" + x.key.toLowerCase().replace(/ /g,"_")})
        .selectAll(".tr")
        .data(function(x){return x.values})
        .enter()
          .append("tr")

      entry.append("td")
        .text(function(x){return x.width + "x" + x.height})
      

      entry.append("td")
        .text(function(x){return x.name})

      entry.append("td")
        .append("img")
        .attr("src",function(x){return x.media_url_secure})
        .style("max-height","50px")
        .style("max-width","100%")

      entry.append("td")
        .append("input").attr("type","checkbox")
        .property("checked",true)
        .on("click",function(x){
          RB.yoshi.actions.toggleCampaignVerification(true)

          d3.event.stopPropagation()
        })


      
    }

    history.buildCampaignVerification = function(target,data) {

      target.html("")

      var bound = d3.select(target[0][0].parentNode).selectAll(".panel")
        .data([data])

      bound.enter().append("div").classed("panel panel-default",true)

      history.buildCampaignHeading(bound)

      var group = bound.append("div")
        .classed("list-group",true)
      
      group.append("div")
        .classed("list-group-item",true)
        .append("h5")
        .classed("list-group-item-heading",true)
        .text("Domains")

      group.selectAll(".domain-entry")
        .data(function(p){
          return p.profile.domain_targets
        })
        .enter()
        .append("div")
        .classed("list-group-item domain-entry campaign-entry",true)
        .text(function(x){return x.domain})

      group.append("div")
        .classed("list-group-item",true)
        .append("h5")
        .classed("list-group-item-heading",true)
        .text("Sizes")

      group.selectAll(".size-entry")
        .data(function(p){
          return p.details.sizes
        })
        .enter()
        .append("div")
        .classed("list-group-item size-entry campaign-entry",true)
        .text(function(x){return x})

      group.append("div")
        .classed("list-group-item",true)
        .append("h5")
        .classed("list-group-item-heading",true)
        .text("Tags")

      group.selectAll(".placement-entry")
        .data(function(p){
          return p.profile.platform_placement_targets
        })
        .enter()
        .append("div")
        .classed("list-group-item placement-entry campaign-entry",true)
        .text(function(x){return x.id})

      group.append("div")
        .classed("list-group-item",true)
        .append("h5")
        .classed("list-group-item-heading",true)
        .text("Creatives")

      group.append("div").classed("testt line-group-item campaign-entry",true)
        .selectAll("span")
        .data(function(p){
          return p.details.creative_folders.length ? p.details.creative_folders : ["No creatives attached"]
        })
        .enter()
        .append("span").style("margin-right","3px").style("display","inline-block")
        .text(function(x){return x})



      setTimeout(function(){$("#campaign-wrapper").sticky({getWidthFrom:".campaign-verification"})},500)
    }

    history.buildCampaignHeading = function(target) {
      target.append("div")
        .classed("panel-heading",true)
        .append("h3")
        .classed("panel-title",true)
        .text("Campaign Summary")
    }

    history.buildHeading = function(target) {
      target.append("div")
        .classed("panel-heading",true)
        .append("h3")
        .classed("panel-title",true)
        .text("Ad history")
    }

    history.buildTable = function(target,data,newData){
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

      history.buildGroup(newDays) 
      history.addToGroup(days)

      $(".ad-history .list-group-item-heading").parent().sticky({getWidthFrom:".entry"})

    }

    history.addToGroup = function(days) {

      var rows = days.selectAll(".list-group-item.entry")
      var newRows = rows
        .data(function(d){return d.values},function(d){return d.timestamp })
	.enter()
          .append("div")
          .classed("list-group-item entry",true)
          .sort(function(a,b){return d3.ascending(a.timestamp_epoch, b.timestamp_epoch)})
          .append("div").classed("row",true)
          .style("color","red")

      newRows
        .transition()
          .duration(3000)
          .style("color", "black");

      days.selectAll(".list-group-item.entry")
        .sort(function(a,b){return d3.descending(a.timestamp_epoch, b.timestamp_epoch)})


      history.buildPanelRow(newRows)
    }
    
    history.buildGroup = function(days) {
      days.append("div")
        .classed("list-group-item",true)
        .append("h5")
        .classed("list-group-item-heading",true)
        .text(function(x){return x.key})
      
      var rows = days.selectAll(".list-group-item.entry")
        .data(function(d){return d.values})
	.enter()
          .append("div")
          .classed("list-group-item entry",true)
          .sort(function(a,b){return d3.descending(a.timestamp_epoch, b.timestamp_epoch)})
          .append("div").classed("row",true)

      history.buildPanelRow(rows)
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
  })(UI.history || {})

  return UI

})(RB.yoshi.UI || {})


