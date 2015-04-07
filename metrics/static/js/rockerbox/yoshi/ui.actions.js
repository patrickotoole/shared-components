var LOGGED_IN_ERROR = "You must log into <a href=\"http://portal.getrockerbox.com\" target=_blank>portal.getrockerbox.com</a> to create a campaign"
var SELLER_ERROR = "Please select at least one seller to target"


var RB = RB || {}
RB.yoshi = RB.yoshi || {}

RB.yoshi.actions = (function(actions){

  actions.validateCampaign = function(profile){

    var msg = (!profile.details.advertiser) ? 
      LOGGED_IN_ERROR : (!profile.profile.domain_targets.length) ? 
      SELLER_ERROR : false

    RB.yoshi.UI.flash(msg)
    return msg    
  }

  actions.toggleCampaignVerification = function(keepVisible) {

    var history = d3.selectAll(".ad-history tbody > tr input:checked") 
    var creative = d3.selectAll(".creative-selection tbody > tr input:checked")  
    var targeting = d3.selectAll(".targeting-selection tbody > tr input:checked")   

    var countries = d3.selectAll(".country-select option").filter(function(x){return this.selected}).data()
    var regions = d3.selectAll(".region-select option").filter(function(x){return this.selected}).data()
    var cities = d3.selectAll(".city-select option").filter(function(x){return this.selected}).data()

    var targets = RB.yoshi.selection.targets()

    var campaign_parameters = d3.selectAll(".campaign-parameter")[0].map(function(x){
      var h = {}
      h[x.name] = x.value
      return h
    })

    console.log(campaign_parameters)

    console.log("HERE",targets)

    var data = []
    //data.push.apply(data,history.data())
    data.push.apply(data,targets.auctions)
    data.push.apply(data,creative.data())
    data.push.apply(data,targeting.data())


    var profile = RB.yoshi.actions.buildCampaign(data)

    profile.profile.country_targets = countries
    profile.profile.region_targets = regions
    profile.profile.city_targets = cities

    campaign_parameters.map(function(params){
      for (var key in params) {
        profile.campaign[key] = params[key]
      }
    })

    var hasTargets = profile.profile.domain_targets.length

    d3.select(".campaign-verification")
      .classed("hidden",!(keepVisible && hasTargets))

    if (hasTargets) {
      RB.yoshi.UI.campaign_summary.build(
        d3.select("#campaign-wrapper .panel-default"),
        profile,
        targets
      )
    }

    $(window).trigger("resize")

    return 
  }

  actions.buildVerifiedCampaign = function(data) {
    var profile = d3.select("#campaign-wrapper .panel-default").data()

    return profile[0]
  }

  actions.buildCampaign = function(data) {

    var reduceToProfile = function(h,d){

      if (d.advertiser_id) {
        h.details.creatives = d3.set(h.details.creatives.concat(d.id)).values()
        h.details.creative_folders = d3.set(h.details.creative_folders.concat(d.folder.name)).values()
        h.campaign.creatives = h.details.creatives.map(function(cr){return {"id":cr}}) 
        return h 
      }

      var placements = h.profile.platform_placement_targets.map(function(p){return p.id}),
        domains = h.profile.domain_targets.map(function(d){return d.domain}),
        sizes = h.profile.size_targets.map(function(s){return s.width + "x" + s.height}),
        prices = h.details.prices,
        dsizes = h.details.sizes

      h.profile.platform_placement_targets = d3.set(placements.concat(d.placements)).values().map(function(p){return {"id":p,"action":"include"} })
      h.profile.domain_targets = d3.set(domains.concat(d.domain)).values().map(function(d){return {"domain":d}})
      
      h.details.prices = prices.concat(d.prices)
      h.details.sizes = d3.set(sizes.concat(d.sizes)).values()
      h.profile.size_targets = h.details.sizes.map(function(s){ 
        var sp = s.split("x"); 
        return {"width":sp[0],"height":sp[1]} 
      })

      return h
    }

    var base_profile = {
      "profile":{"platform_placement_targets":[],"domain_targets":[],"domain_action":"include","size_targets":[]},
      "details": { "prices":[], "advertiser": RB.yoshi.GLOBALS.ADVERTISER.advertiserID, "creative_folders": [], "creatives": [] },
      "campaign": { "creatives":[] }
    }

    var reduced = data.reduce(reduceToProfile,base_profile)

    return reduced
  }

  return actions
})(RB.yoshi.actions || {})


