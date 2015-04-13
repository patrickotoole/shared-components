var RB = RB || {}
RB.yoshi = RB.yoshi || {}

RB.yoshi.controller = (function(controller){

  var reformatCountries = function(profile) {
    if (profile.country_targets) 
      profile.country_targets = profile.country_targets
        .map(function(x){
          return {"country": x.code}
        })
   
    profile.country_action = "include"
  }

  var reformatRegions = function(profile) {
    if (profile.region_targets)
      profile.region_targets = profile.region_targets
        .map(function(x){
          return {"region": x.country_code + ":" + x.code}
        })

    profile.region_action = "include"    
  }

  var reformatCities = function(profile) {
    profile.city_action = profile.city_targets.length ? 
      "include" : "exclude"
  }

  var reformatBudget = function(campaign) {
    campaign.daily_budget = parseFloat(campaign.daily_budget)
    campaign.lifetime_budget = parseFloat(campaign.lifetime_budget)
    campaign.base_bid = parseFloat(campaign.base_bid) 
  }


  /* INTERCOM -- probably want to move to its own namespace */

  var intercomSingleFire = {}
  var intercomTitle = false
  var onShowInitialized = false

  

  controller.intercomEvent = function(event,title){

    /*if (onShowInitialized == false) {
      Intercom("update");
      Intercom("onShow",function() {

        if (intercomTitle) {
          var models = this.conversations.models,
            chosen = models.filter(function(x){return x.attributes.conversation_message.body.indexOf(intercomTitle) > -1})[0]

          if (chosen) this.view.showConversationById(chosen.attributes.id)
        }
      })

      onShowInitialized = true
    } */

    intercomTitle = title

    if (intercomSingleFire[event] == undefined) {

      Intercom("trackEvent",event)
      setTimeout(function(){ Intercom("update")},1500)

      intercomSingleFire[event] = true
    }
    
  }

  /* END INTERCOM */


  controller.createCampaign = function(callback,failure){

    var callback = callback || function(){},
      failure = failure || function(){}

    var profile = JSON.parse(JSON.stringify(RB.yoshi.actions.buildVerifiedCampaign())),
      invalid = RB.yoshi.actions.validateCampaign(profile)

    if (invalid) return failure(profile)

    RB.AJAX.rockerbox.getUser(function(x){

      reformatCountries(profile.profile)
      reformatRegions(profile.profile)
      reformatCities(profile.profile)

      reformatBudget(profile.campaign)
 
      profile.details.username = x.username.split("a_")[1]
      RB.AJAX.rockerbox.postCampaign(JSON.stringify(profile),callback)
    })

  }

  controller.updateCampaign = function(callback,failure){

    var callback = callback || function(){},
      failure = failure || function(){}

    var profile = RB.yoshi.actions.buildVerifiedCampaign(),
      invalid = RB.yoshi.actions.validateCampaign(profile)

    if (invalid) return failure(profile)

    RB.AJAX.rockerbox.getUser(function(x){
      profile.details.username = x.username 
      var campaign = JSON.parse(JSON.stringify(profile.campaign))

      campaign.creatives = campaign.creatives
        .filter(function(x){ return x.attached })

      reformatCountries(profile.profile)
      reformatRegions(profile.profile)
      reformatCities(profile.profile)

      reformatBudget(profile.campaign) 
      
      profile.profile.domain_action = "include"  

      var cb = function(){
        RB.AJAX.rockerbox.putProfile(
          "&id=" + profile.profile.id,
          JSON.stringify({"profile":profile.profile}), 
          callback
        )  
      }

      RB.AJAX.rockerbox.putCampaign("&id=" + campaign.id,JSON.stringify({"campaign":campaign}), cb) 
    })

  }

  controller.updateProfile = function(){
  
  }
 
  return controller
})(RB.yoshi.controller || {})
