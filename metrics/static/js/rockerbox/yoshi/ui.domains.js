var RB = RB || {}
RB.yoshi = RB.yoshi || {}
RB.yoshi.UI = RB.yoshi.UI || {}

RB.yoshi.UI.domains = (function(domains){

  var UI = RB.yoshi.UI 

  domains.heading = function(panel) {
    
    var h = panel.append("div")
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
      .html("&rsaquo; Find placements for specific domains") 
  }           

  domains.processList = function(panel) {
    var group = panel.append("div")
      .classed("",true)
    
    var inputHeader = group
      .append("div")
      .classed("list-group-item",true)
      .append("h5")
      .append("div").classed("row",true)

    inputHeader.append("div")
      .classed("col-md-4 list-group-item-heading",true)
      .text("Search for domain targets")

    var resultGroup = panel.append("div")
      .style("margin-top","15px")

    inputHeader.append("div").classed("col-md-8",true)
      .append("input").classed("campaign-parameter form-control",true).style("width","95%") 
      .attr("placeholder","enter a comman seperated list of domains you would like to target")
      .attr("name","domains")
      .on("blur",function(x){
        var domains = this.value.replace(" ","").split(",").map(function(x) {
          return {"domain":x, "key": x, "tf_idf":1}
        })
  
        UI.recommended.table(resultGroup,domains,"Domain target results")

      })

  }


  domains.build = function(target) {
    var panel = target.style("background-color","transparent")
    domains.heading(panel)
    domains.processList(panel)
  }

  return domains
})(RB.yoshi.UI.domains || {})



 
