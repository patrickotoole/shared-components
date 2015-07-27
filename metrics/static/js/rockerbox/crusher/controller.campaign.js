var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.controller = RB.crusher.controller || {}

RB.crusher.controller.campaign = (function(campaign) {

  // requires: api.js, d3.js

  var crusher = RB.crusher
  var source = crusher.api.source 

  campaign = {
    save: function(data,obj) {
      var type = obj['campaign'] ? "PUT" : "POST"
      var URL = ((type == "PUT") && (obj['campaign']['id'])) ? 
        "/crusher/funnel/campaign?format=json&id=" + obj['campaign']['id'] : 
        "/crusher/funnel/campaign?format=json"

      d3.xhr(URL)
        .header("Content-Type", "application/json")
        .send(type, JSON.stringify(data),function(err,raw){
          var json = JSON.parse(raw.response)
          if (json.error) console.log(json.error)
          obj.campaign = json.campaign
        });
    }
  }

  
  return campaign

})(RB.crusher.controller.campaign || {}) 
