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

      campaign.creatives = campaign.creatives.filter(function(x){ return x.attached })

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
