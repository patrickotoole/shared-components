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

  campaign_summary.subheading = function(group,text,include_edit) {
  
    var g = group.append("div")
      .classed("list-group-item",true)

    var h = g
      .append("h5")
      .classed("list-group-item-heading",true)
      .text(text)
      .attr("data-name",text.toLowerCase())

    if (include_edit) {
      h.insert("span")
        .style("float","right")
        .append("a")
        .text("edit")
        .classed("summary-"+text.toLowerCase(),true)
        .on("click",RB.yoshi.actions.editCreatives)
    }

    return g
  }

  campaign_summary.domains = function(group) {

    campaign_summary.subheading(group,"Domains")

    var entries = group.append("div")
      .classed("list-group-item domain-entries",true)
      .append("select")
      .attr("multiple",true)
      .attr("data-placeholder","No domain targets selected...")
      .classed("selected-domains",true)

    entries.selectAll("option")
      .data(function(p){
        return p.profile.domain_targets
      })
      .enter()
        .append("option")
        .attr("selected",true)
        .text(function(x){return x.domain})

    $('.selected-domains').chosen({"width":"100%"}).change(function(x,y){
      var selected = d3.select(".selected-domains")
      var data = selected.data()[0]

      RB.yoshi.selection.domain_exclusions.push(y.deselected)

      data.profile.domain_targets = data.profile.domain_targets.filter(function(d){
        return !(d.domain == y.deselected)
      })

      var exclusions = RB.yoshi.selection.domain_exclusions

      var toUncheck = d3.selectAll(".ad-selection .list-group-item.entry .col-md-2 input:checked")
        .filter(function(x){
          var contained = RB.yoshi.selection.filterContains(exclusions,x.domains)
          return contained.length == x.domains.length
        })

      if (toUncheck[0].length) {
        toUncheck
          .map(function(obj){
            var selected = d3.selectAll(obj)
            selected.property("checked",false)
            selected.on("click").bind(selected.node())()
          })
      }

      var toUncheckMini = d3.selectAll(".ad-selection tbody > tr input:checked")
        .filter(function(x){return x.domain == y.deselected})

      if (toUncheckMini[0].length) {
        toUncheckMini
          .map(function(obj){
            var selected = d3.selectAll(obj)
            selected.property("checked",false)
            selected.on("click").bind(selected.node())()
          })    
      }

    })
  }

  campaign_summary.sizes = function(group) {
    campaign_summary.subheading(group,"Sizes")

    var entries = group.append("div")
      .classed("list-group-item size-entries",true)
      .append("select")
      .attr("multiple",true)
      .attr("data-placeholder","No sizes currently selected...") 
      .classed("selected-sizes",true)

    entries.selectAll("option")
      .data(function(p){
        return p.details.sizes
      })
      .enter()
      .append("option")
      .attr("selected",true)
      .text(function(x){return x})

    $('.selected-sizes').chosen({"width":"100%"}) 

    $('.selected-sizes').chosen({"width":"100%"}).change(function(x,y){
      var selected = d3.select(".selected-sizes")
      var data = selected.data()[0]

      RB.yoshi.selection.size_exclusions.push(y.deselected)

      data.details.sizes = data.details.sizes.filter(function(d){return !(d == y.deselected)})
      data.profile.size_targets = data.profile.size_targets.filter(function(d){
        return !((d.width == y.deselected.split("x")[0]) && (d.height == y.deselected.split("x")[1]))
      })

      var exclusions = RB.yoshi.selection.size_exclusions

      var toUncheck = d3.selectAll(".ad-selection .list-group-item.entry .col-md-2 input:checked")
        .filter(function(x){
          var contained = RB.yoshi.selection.filterContains(exclusions,x.sizes)
          return contained.length == x.sizes.length
        })

      if (toUncheck[0].length) {
        toUncheck
          .map(function(obj){
            var selected = d3.selectAll(obj)
            selected.property("checked",false)
            selected.on("click").bind(selected.node())()
          })
      }

      var toUncheckMini = d3.selectAll(".ad-selection tbody > tr input:checked")
        .filter(function(x){
          return RB.yoshi.selection.filterContains(exclusions,x.sizes).length == x.sizes.length
        })

      if (toUncheckMini[0].length) {
        toUncheckMini
          .map(function(obj){
            var selected = d3.selectAll(obj)
            selected.property("checked",false)
            selected.on("click").bind(selected.node())()
          })    
      }

    })
  }

  campaign_summary.tags = function(group) {
    campaign_summary.subheading(group,"Tags")

    var entries = group.append("div")
      .classed("list-group-item tag-entries",true)
      .append("select")
      .attr("multiple",true)
      .attr("data-placeholder","No tags currently selected...")
      .classed("selected-tags",true)
     
    entries.selectAll("option")
      .data(function(p){
        return p.profile.platform_placement_targets 
      })
      .enter()
      .append("option")
      .attr("selected",true)
      .text(function(x){return x.id})

    $('.selected-tags').chosen({"width":"100%"}).change(function(x,y) {
      var selected = d3.select('.selected-tags')
      var data = selected.data()[0]

      RB.yoshi.selection.placement_exclusions.push(parseInt(y.deselected))

      data.profile.platform_placement_targets = data.profile.platform_placement_targets.filter(function(d){
        return !(d.id == y.deselected)
      })

      var exclusions = RB.yoshi.selection.placement_exclusions

      var toUncheck = d3.selectAll(".ad-selection .list-group-item.entry .col-md-2 input:checked")
        .filter(function(x){
          var contained = RB.yoshi.selection.filterContains(exclusions,x.placements)

          return contained.length == x.placements.length
        })

      if (toUncheck[0].length) {
        toUncheck
          .map(function(obj){
            var selected = d3.selectAll(obj)
            selected.property("checked",false)
            selected.on("click").bind(selected.node())()
          })
      }

      var toUncheckMini = d3.selectAll(".ad-selection tbody > tr input:checked")
        .filter(function(x){
          return RB.yoshi.selection.filterContains(exclusions,x.placements).length == x.placements.length
        })

      if (toUncheckMini[0].length) {
        toUncheckMini
          .map(function(obj){
            var selected = d3.selectAll(obj)
            selected.property("checked",false)
            selected.on("click").bind(selected.node())()
          })    
      } 



    })
 
  }

  campaign_summary.location = function(group,data) {
    var heading = campaign_summary.subheading(group,"Location",true)
    heading
      .style("border-top", "15px solid rgb(240,240,240)")  
     // .style("border-top", "10px solid #f5f5f5") 

    if (data.profile.country_targets.length > 0) {

      group.append("div").classed("line-group-item campaign-entry",true)
        .selectAll("span.country")
        .data(function(p){
          return p.profile.country_targets
        })
        .enter()
        .append("span").style("margin-right","3px").style("display","inline-block")
        .classed("country",true)
        .text(function(x){return x.name}) 
    }

    if (data.profile.region_targets.length > 0) { 

      group.append("div").classed("line-group-item campaign-entry",true)
        .selectAll("span.region")
        .data(function(p){
          return p.profile.region_targets
        })
        .enter()
        .append("span").style("margin-right","3px").style("display","inline-block")
        .classed("region",true)
        .text(function(x){return x.name})  
    }

    if (data.profile.city_targets.length > 0) { 

      group.append("div").classed("line-group-item campaign-entry",true)
        .selectAll("span.city")
        .data(function(p){
          return p.profile.city_targets
        })
        .enter()
        .append("span").style("margin-right","3px").style("display","inline-block")
        .classed("city",true)
        .text(function(x){return x.name || x.city})  
    }
  }

  campaign_summary.frequency = function(group) {
    campaign_summary.subheading(group,"Frequency")

    group.append("div").classed("line-group-item campaign-entry",true)
      .selectAll("span")
      .data(function(p){
        return [p.profile.max_day_imps, p.profile.max_lifetime_imps]
      })
      .enter()
      .append("span").style("margin-right","3px").style("display","inline-block")
      .text(function(x,i){
        
        if ((x == "") && (i == 0)) return "5 imps per day,"
        if ((x == "") && (i == 1)) return "20 imps max"

        return x + (i == 0 ? " imps per day,": " imps max")
      })
  }

  campaign_summary.budget = function(group) {
    campaign_summary.subheading(group,"Budget")

    var g = group.append("div")

    g.classed("line-group-item campaign-entry",true)
      .selectAll("span.bid.campaign-setting")
      .data(function(p){
        return [p.campaign.base_bid]
      })
      .enter()
      .append("span").style("margin-right","3px").style("display","inline-block")
      .text(function(x,i){
        return "Bid Price: $" + (x == "" ? 1 : x)   
      })

    g.append("br")

    g.classed("line-group-item campaign-entry",true)
      .selectAll("span.daily.campaign-setting")
      .data(function(p){
        return [p.campaign.daily_budget]
      })
      .enter()
      .append("span").style("margin-right","3px").style("display","inline-block")
      .text(function(x,i){
        return "Daily budget: $" + (x == "" ? 10 : x)  
      }) 

    g.append("br") 

    g.classed("line-group-item campaign-entry",true)
      .selectAll("span.lifetime.campaign-setting")
      .data(function(p){
        return [p.campaign.lifetime_budget]
      })
      .enter()
      .append("span").style("margin-right","3px").style("display","inline-block")
      .text(function(x,i){
        return "Lifetime budget: $" + (x == "" ? 100 : x) 
      })  
  }

  campaign_summary.creatives = function(group) {
    campaign_summary.subheading(group,"Creatives",true)
      .style("border-top", "15px solid rgb(240,240,240)") 

    group.append("div").classed("line-group-item campaign-entry",true)
      .selectAll("span")
      .data(function(p){
        return p.details.creative_folders.length ? p.details.creative_folders : ["No creatives attached"]
      })
      .enter()
      .append("span").style("margin-right","3px").style("display","block")
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
    
    campaign_summary.location(group,data) 
    campaign_summary.frequency(group) 
    campaign_summary.budget(group)  

    setTimeout(function(){$("#campaign-wrapper").sticky({getWidthFrom:".campaign-verification"})},500)
  } 

  return campaign_summary

})(RB.yoshi.UI.campaign_summary || {})
 
