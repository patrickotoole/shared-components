var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.controller = RB.crusher.controller || {}

RB.crusher.controller.funnel = (function(funnel) {

  // requires: api.js, d3.js

  var crusher = RB.crusher
  
  var source = crusher.api.source 
  var funnelURL = "/crusher/funnel?format=json&advertiser=" + source

  funnel = {
    new: function(target) {
      crusher.subscribe.add_subscriber(["actions"],function(actions){
        var actions = crusher.cache.actionData
        crusher.ui.funnel.add_funnel(target,actions)
      },"new_funnel",true,true)
    },
    save: function(data,callback) {
      crusher.subscribe.add_subscriber(["funnels","tf_idf"], function(){ 
        var d = {
          "advertiser": source,
          "owner": "owner",
          "funnel_id":data.funnel_id,
          "funnel_name": data.funnel_name,
          "actions":data.actions.map(function(x){return {"action_id":x.action_id}})
        }

        var cdata = JSON.parse(JSON.stringify(d)),
          type = data['funnel_id'] ? "PUT" : "POST";

        d3.xhr(funnelURL)
          .header("Content-Type", "application/json")
          .send(type, JSON.stringify(cdata), function(err, rawData){
            var resp = JSON.parse(rawData.response).response
            data['funnel_name'] = resp.funnel_name
            data['funnel_id'] = resp.funnel_id
            crusher.cache.funnelData.push(data)
            callback(crusher.cache.funnelData)
          });
      },"save_funnel",true,true)
    },
    delete: function(data,parent_data,funnel) {
      d3.xhr(funnelURL + "&funnel_id=" + data.funnel_id)
        .header("Content-Type", "application/json")
        .send("DELETE", function(err, rawData){

          var funnel_ids = parent_data
            .filter(function(x,i){
              x.pos = i; 
              return x.funnel_id == data.funnel_id 
            })

          parent_data.splice(funnel_ids[0].pos,1)

          crusher.cache.funnelData = parent_data
          funnel.remove()
          console.log(rawData)
        }); 
    },
    show: function() {
     
      var funnel = crusher.ui.funnel.buildShow()
      var data = funnel.datum()

      var uids = "uids_" + data.funnel_id,
        avails = "avails_" + data.funnel_id,
        domains = "domains_" + data.funnel_id

      crusher.ui.funnel.wait(funnel)

      crusher.subscribe.add_subscriber([uids],function(){

        crusher.ui.funnel.show(funnel)

        crusher.subscribe.add_subscriber([domains], function(x) {
          data.funnel_domains = x
          crusher.subscribe.add_subscriber(["tf_idf_funnel"], function(x) {
            crusher.ui.funnel.show.component.domains.bind(false,funnel)(x)
            crusher.ui.funnel.show.component.lookalike(funnel)
          },"idf",true,true,data)
        },"domains",true,true, data)
        
        crusher.subscribe.add_subscriber([avails], function(x) {
          var exchanges = funnel.selectAll(".exchange-summary .exchange")
        
          crusher.ui.funnel.show.component.avails(exchanges)
          crusher.ui.funnel.show.component.campaign(funnel)
        },"show_me_the_money",true,true, data)

      },"show",true,true,data)


    },
    show_domains: function(data,callback) {
      crusher.subscribe.add_subscriber(["UIDsToDomains"], callback, "show_domains",true,true,data)
    },
    show_avails: function(data,callback) {
      var q = queue(5)
      data.actions.map(function(action) { 
        crusher.api.actionToAvails(function(){},action,q)
      })
      q.awaitAll(callback)
      
    }
  }

  
  return funnel

})(RB.crusher.controller.funnel || {}) 