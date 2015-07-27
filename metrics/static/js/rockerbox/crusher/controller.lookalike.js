var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.controller = RB.crusher.controller || {}

RB.crusher.controller.lookalike = (function(lookalike) {

  // requires: api.js, d3.js

  var crusher = RB.crusher
  var source = crusher.api.source 

  controller.lookalike = {
    save: function(data,obj) {
      var type = obj['campaign'] ? "PUT" : "POST"
      var URL = ((type == "PUT") && (obj['campaign']['id'])) ? 
        "/crusher/funnel/lookalike_campaign?format=json&id=" + obj['campaign']['id'] : 
        "/crusher/funnel/lookalike_campaign?format=json"

      d3.xhr(URL)
        .header("Content-Type", "application/json")
        .send(type, JSON.stringify(data),function(err,raw){
          var json = JSON.parse(raw.response)
          if (json.error) console.log(json.error)
          obj.campaign = json.campaign
        });
    }
  }

  return lookalike

})(RB.crusher.controller.lookalike || {}) 
