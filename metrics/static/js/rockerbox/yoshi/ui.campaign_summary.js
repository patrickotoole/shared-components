var RB = RB || {}
RB.yoshi = RB.yoshi || {}
RB.yoshi.UI = RB.yoshi.UI || {}

RB.yoshi.UI.campaign_summary = (function(campaign_summary){

  var UI = RB.yoshi.UI

  campaign_summary.heading = function(target) {
    target.append("div")
      .classed("panel-heading",true)
      .append("h3")
      .classed("panel-title",true)
      .text("Campaign Summary")
  } 

  campaign_summary.subheading = function(group,text) {
  
    group.append("div")
      .classed("list-group-item",true)
      .append("h5")
      .classed("list-group-item-heading",true)
      .text(text)
  }

  campaign_summary.domains = function(group) {

    campaign_summary.subheading(group,"Domains")

    group.selectAll(".domain-entry")
      .data(function(p){
        return p.profile.domain_targets
      })
      .enter()
      .append("div")
      .classed("list-group-item domain-entry campaign-entry",true)
      .text(function(x){return x.domain})
  }

  campaign_summary.sizes = function(group) {
    campaign_summary.subheading(group,"Sizes")

    group.selectAll(".size-entry")
      .data(function(p){
        return p.details.sizes
      })
      .enter()
      .append("div")
      .classed("list-group-item size-entry campaign-entry",true)
      .text(function(x){return x})
  }

  campaign_summary.tags = function(group) {
    campaign_summary.subheading(group,"Tags")

    group.selectAll(".placement-entry")
      .data(function(p){
        return p.profile.platform_placement_targets
      })
      .enter()
      .append("div")
      .classed("list-group-item placement-entry campaign-entry",true)
      .text(function(x){return x.id})
  }

  campaign_summary.creatives = function(group) {
    campaign_summary.subheading(group,"Creatives")

    group.append("div").classed("testt line-group-item campaign-entry",true)
      .selectAll("span")
      .data(function(p){
        return p.details.creative_folders.length ? p.details.creative_folders : ["No creatives attached"]
      })
      .enter()
      .append("span").style("margin-right","3px").style("display","inline-block")
      .text(function(x){return x})
  }

  campaign_summary.build = function(target,data) {

    target.html("")

    var bound = d3.select(target.node().parentNode)
      .selectAll(".panel").data([data])

    bound.enter().append("div").classed("panel panel-default",true)
    campaign_summary.heading(bound)

    var group = bound
      .append("div")
      .classed("list-group",true)
    
    campaign_summary.domains(group)
    campaign_summary.sizes(group)
    campaign_summary.tags(group)
    campaign_summary.creatives(group)

    setTimeout(function(){$("#campaign-wrapper").sticky({getWidthFrom:".campaign-verification"})},500)
  } 

  return campaign_summary

})(RB.yoshi.UI.campaign_summary || {})
 
