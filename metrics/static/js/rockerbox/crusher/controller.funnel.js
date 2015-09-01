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
      crusher.subscribe.add_subscriber(["funnels","tf_idf_funnel"], function(){ 
        var d = {
          "advertiser": source,
          "owner": "owner",
          "funnel_id":data.funnel_id,
          "funnel_name": data.funnel_name,
          "actions":data.actions.map(function(x){return {"action_id":x.action_id}})
        }

        var cdata = JSON.parse(JSON.stringify(d)),
          type = data['funnel_id'] ? "PUT" : "POST";

        d3.xhr(funnelURL + "&id=" + data.funnel_id)
          .header("Content-Type", "application/json")
          .send(type, JSON.stringify(cdata), function(err, rawData){
            var resp = JSON.parse(rawData.response).response
            data['funnel_name'] = resp.funnel_name
            data['funnel_id'] = resp.funnel_id
            crusher.cache.funnelData.push(data)
            callback(crusher.cache.funnelData,type)
          });
      },"save_funnel",true,true)
    },
    delete: function(data,parent_data,funnel) {
      d3.xhr(funnelURL + "&id=" + data.funnel_id)
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
      crusher.subscribe.publishers["funnel_show"](data)

    },
    //show_domains: function(data,callback) {
    //  crusher.subscribe.add_subscriber(["UIDsToDomains"], callback, "show_domains",true,true,data)
    //},
    //show_avails: function(data,callback) {
    //  var q = queue(5)
    //  data.actions.map(function(action) { 
    //    crusher.api.actionToAvails(function(){},action,q)
    //  })
    //  q.awaitAll(callback)
    //  
    //}
  }

  
  return funnel

})(RB.crusher.controller.funnel || {}) 
