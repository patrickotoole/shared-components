var LOGGED_IN_ERROR = "You must log into <a href=\"http://portal.getrockerbox.com\" target=_blank>portal.getrockerbox.com</a> to create a campaign"
var SELLER_ERROR = "Please select at least one seller to target"


var RB = RB || {}
RB.yoshi = RB.yoshi || {}

RB.yoshi.actions = (function(actions){

  var mode = "CREATE"

  actions.setMode = function(m) { mode = m }
  actions.getMode = function() {return mode }
 

  var modeActions = {
    "EDIT": {
      creative: function() {

        var data = this.parentElement.parentElement.dataset
        var editGroups = d3.selectAll(".edit-group")

        editGroups
          .classed("hidden",function(){
            return !this.classList.contains(data.name+"-group")
          })
      },
      data: function() {
        var parent = d3.select(".campaign-edit")
        var current = d3.select("#campaign-wrapper .panel-default").datum()
        var new_settings = actions.buildTargetingSettings(parent)

        for (var key in new_settings){
          for (var s in new_settings[key]) {
            current[key][s] = new_settings[key][s]
          }
        }

        return current
      }
    },
    "CREATE": {
      creative: function() {
        var data = this.parentElement.parentElement.dataset
        if (data.name == "creatives") {
          actions.menu.select.bind(d3.select("#creative-button-div").node())()
        }
        if (data.name == "location") {
          actions.menu.select.bind(d3.select("#targeting-button-div").node())() 
        }
      },
      data: function() {
        return actions.buildCampaignData()       
      }
    }
  }

  actions.menu = {
    select: function(){
      var self = this
      var target = d3.select(this).attr("data-content-target")
  
      d3.selectAll(".content").classed("hidden",function(){ return !this.classList.contains(target) })
      d3.selectAll(".content-button").classed("selected",function(){ return self == this })
  
      if (self.dataset.mode != actions.getMode()) {
        actions.setMode(self.dataset.mode)
        actions.toggleCampaignVerification()
      }
      actions.setMode(self.dataset.mode)
  
      
    }
  }

  actions.editCreatives = function(){
    modeActions[mode]["creative"].bind(this)()
  }

  actions.validateCampaign = function(profile){

    var msg = (!profile.details.advertiser) ? 
      LOGGED_IN_ERROR : (!profile.profile.domain_targets.length) ? 
      SELLER_ERROR : false

    RB.yoshi.UI.flash(msg)
    return msg    
  }

  actions.buildTargetingSettings = function(parent){
    var p = parent || d3.select("body")

    var countries = p.selectAll(".country-select option").filter(function(x){return this.selected}).data()
    var regions = p.selectAll(".region-select option").filter(function(x){return this.selected}).data()
    var cities = p.selectAll(".city-select option").filter(function(x){return this.selected}).data()

    var campaign_parameters = p.selectAll(".campaign-parameter")[0].map(function(x){
      var h = {}
      h[x.name] = x.value
      return h
    })

    var profile = {
      country_targets: countries,
      city_targets: cities,
      region_targets: regions
    }

    var campaign = {}

    campaign_parameters.map(function(params){
      for (var key in params) {
        if (key.indexOf('imps' > -1)) profile[key] = params[key]
        campaign[key] = params[key]
      }
    })

    return {
      profile: profile,
      campaign: campaign
    }
     
  }

  actions.buildCampaignData = function(parent){

    var p = parent || d3.select(".build")
 
    var history = p.selectAll(".ad-history tbody > tr input:checked") 
    var creative = p.selectAll(".creative-selection tbody > tr input:checked")  
    var targeting = p.selectAll(".targeting-selection tbody > tr input:checked")   

    var countries = p.selectAll(".country-select option").filter(function(x){return this.selected}).data()
    var regions = p.selectAll(".region-select option").filter(function(x){return this.selected}).data()
    var cities = p.selectAll(".city-select option").filter(function(x){return this.selected}).data()

    var targets = RB.yoshi.selection.targets()

    var campaign_parameters = p.selectAll(".campaign-parameter")[0].map(function(x){
      var h = {}
      h[x.name] = x.value
      return h
    })


    var data = []

    data.push.apply(data,targets.auctions)
    data.push.apply(data,creative.data())
    data.push.apply(data,targeting.data())


    var profile = RB.yoshi.actions.buildCampaign(data)

    profile.profile.country_targets = countries
    profile.profile.region_targets = regions
    profile.profile.city_targets = cities

    campaign_parameters.map(function(params){
      for (var key in params) {
        if (key.indexOf('imps' > -1)) profile.profile[key] = params[key]
        profile.campaign[key] = params[key]
      }
    })

    return profile
  
  }

  actions.toggleCampaignVerification = function(keepVisible) {

    var profile = modeActions[mode]["data"](),
      hasTargets = profile.profile.domain_targets.length

    d3.select(".campaign-verification")
      .classed("hidden",!(keepVisible && hasTargets))

    d3.select("#validated-campaign-button-div")
      .classed("hidden",false) 

    if (hasTargets) {
      RB.yoshi.UI.campaign_summary.build(
        d3.select("#campaign-wrapper .panel-default"),
        profile
      )
    }

    $(window).trigger("resize")
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


