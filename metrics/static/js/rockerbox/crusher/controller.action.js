var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.controller = RB.crusher.controller || {}

RB.crusher.controller.action = (function(action) {

  // requires: api.js, d3.js

  var crusher = RB.crusher

  var source = crusher.api.source 
  var actionURL = "/crusher/funnel/action?format=json"
  var visitUID = "/crusher/visit_uids?format=json&url="

  action = {
    new: function(expandTarget,options,override) {
      var defaultAction = [{"values":options}]

      crusher.cache.actionData = crusher.cache.actionData.filter(function(x){return x.action_id})
      expandTarget.datum(override || defaultAction[0])
      crusher.ui.action.edit(expandTarget,action.save)
      crusher.ui.action.view(expandTarget)
      crusher.ui.action.select({})
    },
    delete: function(action){
      d3.xhr(actionURL + "&id=" + action.action_id)
        .header("Content-Type", "application/json")
        .send(
          "DELETE",
          function(err, rawData){
            crusher.cache.actionData = crusher.cache.actionData.filter(function(x){
              return x.action_id != action.action_id
            })
          }
        ); 
    },
    save: function(data, obj) {
      var cdata = JSON.parse(JSON.stringify(data)),
        type = data['action_id'] ? "PUT" : "POST";

      delete cdata['values'];
      delete cdata['rows']
      delete cdata['count']
      delete cdata['uids']
      delete cdata['visits_data']
      delete cdata['name']

      cdata['advertiser'] = source

      d3.xhr(actionURL + "&id=" + data["action_id"])
        .header("Content-Type", "application/json")
        .send(type,
          JSON.stringify(cdata),
          function(err, rawData){
            var resp = JSON.parse(rawData.response)
            data['action_id'] = resp['response']['action_id']
            obj.filter(function(){return this}).datum(data)

            RB.routes.navigation.back()
            setTimeout(function(){
              RB.routes.navigation.forward({
                "name": "View Existing Actions",
                "push_state":"/crusher/action/existing",
                "skipRender": true,
                "values_key":"action_name"
              })
              RB.routes.navigation.forward(data)
            },1)

          }
        );                    
    },
    get: function(action,callback) {
      // this is getting all of the data associated with the pattern
      var domains = []
  
      action.all.length && crusher.cache.urls_wo_qs && crusher.cache.urls_wo_qs.map(function(d){
        if (action.url_pattern)
          action.url_pattern.map(function(x){
            if (d.indexOf(x) > -1) domains.push(d)
          })
      })
  
      var obj = {"urls": domains}
  
      if (domains.length && !action.visits_data)
        var URL = visitUID
        if (action.url_pattern) {
          var actionPatterns = action.url_pattern.map(function(x){return x.split(" ").join(",")}).join("|")
          URL = "/crusher/pattern_search/timeseries?advertiser=" + source + 
            "&search=" + actionPatterns + 
            "&format=json&logic=or" 

          // NOTE:
          // action.operator // removed from the UI since UX use case covered
            
          //URL = URL.replace("timeseries","urls")

          d3.xhr(URL)
            .header("Content-Type", "application/json")
            .get(
              function(err, rawData){
                var dd = JSON.parse(rawData.response)
                action.visits_data = dd.results
                action.urls = dd.urls

                if (callback) callback()
              }
            );
        }
       

      return obj
    }
  }

  return action

})(RB.crusher.controller.action || {}) 
