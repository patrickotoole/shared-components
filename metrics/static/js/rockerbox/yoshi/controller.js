var RB = RB || {}
RB.yoshi = RB.yoshi || {}

RB.yoshi.controller = (function(controller){

  controller.createCampaign = function(callback,failure){

    var callback = callback || function(){},
      failure = failure || function(){}

    var profile = RB.yoshi.actions.buildVerifiedCampaign(),
      invalid = RB.yoshi.actions.validateCampaign(profile)

    if (invalid) return failure(profile)

    RB.AJAX.rockerbox.getUser(function(x){
      profile.details.username = x.username 
      RB.AJAX.rockerbox.postCampaign(JSON.stringify(profile),callback)
    })

  }

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

  controller.updateCampaign = function(callback,failure){

    var callback = callback || function(){},
      failure = failure || function(){}

    var profile = RB.yoshi.actions.buildVerifiedCampaign(),
      invalid = RB.yoshi.actions.validateCampaign(profile)

    console.log("CAMPAING ON UPDATE", profile.campaign.creatives)

    if (invalid) return failure(profile)

    RB.AJAX.rockerbox.getUser(function(x){
      profile.details.username = x.username 
      var campaign = JSON.parse(JSON.stringify(profile.campaign))

      campaign.creatives = campaign.creatives
        .filter(function(x){ return x.attached })

      reformatCountries(profile.profile)
      reformatRegions(profile.profile)
      reformatCities(profile.profile)
      
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
