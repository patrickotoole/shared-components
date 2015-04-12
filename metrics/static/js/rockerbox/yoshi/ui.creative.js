var RB = RB || {}
RB.yoshi = RB.yoshi || {}
RB.yoshi.UI = RB.yoshi.UI || {}

RB.yoshi.UI.creative = (function(creative){

  creative.table = function(wrapper) {
    var table = wrapper.append("table").classed("hidden",true)
      .style("margin-left","4.15%")
      .style("margin-top","10px")
      .style("background-color", "rgb(240, 240, 240)")

    var header = table.classed("table table-hover",true).append("thead").append("tr")
    
    header.append("th").text("Size")
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
      .attr("data-featherlight",function(x){return x.media_url_secure})
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

  creative.row = function(item) {

    var row = item.append("div").classed("row",true)

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

    return item_header
   
  }

  creative.build = function(target,data) {

    var d = d3.nest()
      .key(function(x){return x.folder.name || "Default"})
      .entries(data)

    var panel = target.selectAll(".panel")

    panel.append("div")
      .classed("panel-heading",true)
      .append("h3")
      .classed("panel-title",true)
      .text("Choose creatives for campaign")

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

    var item = group
      .append("div")
      .classed("list-group-item",true)

    var row = creative.row(item)
    creative.table(row)

  }

  return creative

})(RB.yoshi.UI.creative || {})
 
