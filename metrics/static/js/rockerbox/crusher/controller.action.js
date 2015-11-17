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
      var obj = obj;
      
      
      var intermediate = {
        "action_name": data['action_name'],
        "operator": data['operator'],
        "action_id": data['action_id'],
        "url_pattern": data['url_pattern']
      }

      var cdata = JSON.parse(JSON.stringify(intermediate)),
        type = data['action_id'] ? "PUT" : "POST";

            
      if (cdata.action_name.length == 0) {
        cdata["action_name"] = cdata.url_pattern.join(" -> ") 
        data["action_name"] = cdata.url_pattern.join(" -> ") 
      } else {
        // 
      }

      cdata['advertiser'] = source

      d3.xhr(actionURL + "&id=" + data["action_id"])
        .header("Content-Type", "application/json")
        .send(type,
          JSON.stringify(cdata),
          function(err, rawData){
            var resp = JSON.parse(rawData.response)
            data['action_id'] = resp['response']['action_id']

            if(obj) {
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
          }
        );                    
      d3.select(".action-view").classed("hidden",false)
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
                action.domains = dd.domains

                action.param_list = []

                action.urls.map(function(x){
                  var split = x.url.split("?")
                  if (split.length > 1) {
                    split[1].split("&").map(function(y){ 
                      var splitted = y.split("=")
                      var name = splitted[0]
                      var value = splitted.slice(1,splitted.length).join("=")

                      action.param_list.push({"name":name,"value":value,"occurrence":x.occurrence})

                    })
                  }
                })
                
                console.log("PARAMETERS")

                action.param_rolled = d3.nest()
                  .key(function(x) {return x.name})
                  .key(function(x) {return x.value})
                  .rollup(function(x) { return x.reduce(function(p,c){return p + c.occurrence},0)})
                  .entries(action.param_list)
                  .map(function(x) {
                    x.occurrence = x.values.reduce(function(p,c){return p + c.values},0)
                    return x
                  }).sort(function(y,x) {return x.occurrence - y.occurrence })

                console.log(action.param_rolled)
                

                RB.crusher.api.tf_idf_action(callback,action)


                //if (callback) callback()
              }
            );
        }
       

      return obj
    }
  }

  return action

url})(RB.crusher.controller.action || {}) 
