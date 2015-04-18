var RB = RB || {}
RB.yoshi = RB.yoshi || {}
RB.yoshi.UI = RB.yoshi.UI || {}

RB.yoshi.UI.recommended = (function(recommended){

  var UI = RB.yoshi.UI
  var history = UI.history

  recommended.bar = function(target) {

    var max = target.data().reduce(function(p,c){return p > c.tf_idf ? p : c.tf_idf},0)

    var chart = target.append("svg") // creating the svg object inside the container div
      .attr("class", "chart")
      .attr("width", 80) // bar has a fixed width
      .attr("height", 20);
    
    var x = d3.scale.linear() // takes the fixed width and creates the percentage from the data values
      .domain([0, Math.log(max)])
      .range([0, 80]); 
    
    chart.selectAll("rect") // this is what actually creates the bars
      .data(function(x){
        return [max,x.tf_idf].map(function(x){return Math.log(x)})
      })
    .enter().append("rect")
      .attr("width", x)
      .attr("height", 10)
      .attr("y",5)
      .attr("rx", 5) // rounded corners
      .attr("ry", 5);
      
    chart.selectAll("text") // adding the text labels to the bar
      .data(function(x){
        return [max,x.tf_idf].map(function(x){return Math.log(x)}) 
      })
    .enter().append("text")
      .attr("x", x)
      .attr("y", 10) // y position of the text inside bar
      .attr("dx", -3) // padding-right
      .attr("dy", ".35em") // vertical-align: middle
      .attr("text-anchor", "end") // text-align: right
      //.text(String);
  }

  recommended.build = function(target) {
    console.log("HERE",target)
    recommended.heading(target)
    
    RB.AJAX.rockerbox.getHoverboard(function(data){
      var data = data.map(function(x){x.key = x.domain; return x})
        .filter(function(x){return !(x.domain.indexOf("anonymous.google") > -1)})

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

  recommended.table = function(target,data,name){

    var name = name || "Recommended Pages"

    var days = target.selectAll("div .list-group") 
      .data([{"key":name,"values":data}])

    var newDays = days
      .enter()
        .append("div")
        .classed("list-group",true)
        .attr("id",function(x){return x.key})

    var newGroupRows = recommended.addGroup(newDays) 
    var updates = recommended.updateGroup(days)  
    var newRows = updates[1]
    var existingRows = updates[0]

    days.selectAll(".list-group-item.entry")
      .sort(function(a,b){
        return d3.descending(a.tf_idf,b.tf_idf)
      })

    if (newGroupRows.length) recommended.buildPanelRow(newGroupRows) 
    if (newRows.length) recommended.buildPanelRow(newRows)  

    recommended.updatePanelRow(existingRows)

  }

  recommended.updatePanelRow = function(row) {
    var toUpdate = row.filter(function(x){
      var text = d3.select(this)
        .selectAll(".col-md-9")
        .text()

      return text != x.domain
    })

    toUpdate.html("")

    var rowUpdates = toUpdate
      .append("div")
      .classed("row",true)

    recommended.buildPanelRow(rowUpdates)
  }

  recommended.groupItem = function(group) {

    var items = group.selectAll(".list-group-item.entry")
      .data(function(d){return d.values})

    var newItems = items
      .enter()
        .append("div")
        .classed("list-group-item entry",true)
        .sort(function(a,b){return d3.descending(a.timestamp_epoch, b.timestamp_epoch)})
        .append("div").classed("row",true)

    items.exit()
      .remove()

    return [items,newItems]
  }

  recommended.addGroup = function(group){
    history.groupHeader(group)
    return recommended.updateGroup(group)[1]
  }

  recommended.updateGroup = function(group){
    var groupItems = recommended.groupItem(group) 
    return groupItems
  }


  recommended.buildPanelRow = function(row){
    var index = row.append("div")
      .classed("col-md-2",true)

    index.append("div")
      .style("float","left")
      .append("input")
      .attr("type","checkbox")
      .classed("recommended-selection",true)
      .on("click",function(){
        var isChecked = d3.select(this).property("checked")
        var parent = d3.select(this.parentNode.parentNode.parentNode)
        var childCheckboxes = parent.selectAll("table").selectAll("input")
        childCheckboxes.property('checked',isChecked)
        childCheckboxes.property('disabled',isChecked)

        RB.yoshi.actions.toggleCampaignVerification(true)
        //if (d3.event) d3.event.stopPropagation()
      })

    var barWrapper = index.append("div").style("float","left").style("margin-left","15px")
      .attr("data-toggle","tooltip")
      .attr("data-placement","top")
      .attr("title","Domain importance score determined from Rockerbox hoverboard data")

    recommended.bar(barWrapper)

      //.text(function(d) {return d.tf_idf})

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
      var domain = obj.data()[0]
      var d = d3.select(obj.node().parentNode.parentNode.parentNode).datum()
      d.domains = [domain]
      d.sizes = []
      d.placements = []
      RB.AJAX.rockerbox.getViewability("?domain=" + domain,function(data){
        var data = data.filter(function(x){

          if (x.num_loaded > 40) {

            if (d.sizes.indexOf(x.size) == -1) d.sizes.push(x.size)
            if (d.placements.indexOf(x.tag_id) == -1) d.placements.push(x.tag_id)
            x.sizes = [x.size]
            x.placements = [x.tag_id]

          }
          return x.num_loaded > 40 && x.percent_viewable > .5
        })

        d3.select(obj.node().parentNode.parentNode.parentNode).datum(d)

        build(obj,data) 
      })
      
    })
     
  }
 

  return recommended
})(RB.yoshi.UI.recommended || {})



 
