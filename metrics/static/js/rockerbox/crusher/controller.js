var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.crusher.controller = (function(controller) {

  var crusher = RB.crusher

  var URL = window.location.pathname + window.location.search
  var qs = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
      var p=a[i].split('=', 2);
      if (p.length == 1)
        b[p[0]] = "";
      else
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
  })(window.location.search.substr(1).split('&'))

  var source = qs.source
  var actionURL = "/crusher/funnel/action?format=json&advertiser=" + source
  var visitURL = "/crusher/visit_urls?format=json&source=" + source
  var visitUID = "/crusher/visit_uids?format=json&url="
  var visitDomains = "/crusher/visit_domains?format=json&kind=domains"
  var funnelURL = "/crusher/funnel?format=json&advertiser=" + source

  var addParam = function(u,p) { 
    return u.indexOf("?") >= 0 ? u + "&" + p : u + "?" + p 
  }
  URL = addParam(URL,"format=json")

  controller.initializers = {
    "funnel": function() {
      controller.get_tf_idf()

      crusher.ui.funnel.buildBase() 

      d3.json(visitURL, function(dd){
        crusher.urlData = dd
        crusher.urls = dd.map(function(x){return x.url})
        crusher.actionData.map(function(x) { x.values = crusher.urls }) 
        // this could cause an async issue but it seems unlikely...

        var f = d3.select(".funnel-view-wrapper")
          .selectAll(".funnel")
          .selectAll(".show").data(function(x){return [x]})

        f.enter().append("div").classed("show",true)
        crusher.controller.funnel.show(
          f.datum(),
          crusher.ui.funnel.show.bind(false,f),
          crusher.ui.funnel.wait.bind(false,f)
        )

      })
        
      d3.json(actionURL,function(actions){
        crusher.actionData = actions

        d3.json(funnelURL, function(dd) {
          crusher.funnelData = dd
          crusher.ui.funnel.build(crusher.funnelData,crusher.actionData)
        })
 
      })

      
    },
    "funnel/action": function() {

      crusher.ui.action.buildBase()
    
      d3.json(visitURL, function(dd){
        crusher.urlData = dd
        crusher.urls = dd.map(function(x){return x.url})
        var no_qs = {}

        crusher.urls.map(function(x){
          var url = x.split("?")[0]
          no_qs[url] = no_qs[url] ? (no_qs[url] + 1) : 1  
        })
        crusher.urls_wo_qs = Object.keys(no_qs).sort(function(x,y){return no_qs[y] - no_qs[x]})
        controller.get_bloodhound(crusher.urls_wo_qs)
      })
        
        
      d3.json(actionURL,function(actions){
        crusher.actionData = actions
        crusher.actionData.map(function(x) { x.values = crusher.urls_wo_qs })

        crusher.ui.action.showAll(actions,controller.save_action,crusher.urls_wo_qs)
      }) 
      
    }
  }

  controller.get_bloodhound = function(pattern_values) {
    controller.bloodhound = controller.bloodhound || new Bloodhound({
      datumTokenizer: function(x){return x.split(/\/|-/)}, 
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      local: pattern_values 
    }); 

    return controller.bloodhound
 
  }

  controller.get_tf_idf = function() {

    d3.json("/admin/api?table=reporting.pop_domain&format=json", function(dd){
      crusher.pop_domains = {}
      dd.map(function(x){
        crusher.pop_domains[x.domain] = x.idf
      })
    })

  }


  controller.init = function(type){
     
    controller.initializers[type]()
    
  }

  controller.get_domains = function(uids,callback) {
    var data = { "uids":uids }
    if (uids.length) {
      d3.xhr(visitDomains)
        .header("Content-Type", "application/json")
        .post(
          JSON.stringify(data),
          function(err, rawData){
            var resp = JSON.parse(rawData.response)
            callback(resp)
          }
        );
    } else {
      callback([])
    }
     
  }

  


  controller.funnel = {
    new: function(target) {
      crusher.ui.funnel.add_funnel(target)
    },
    save: function(data,callback) {
     debugger
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
          crusher.funnelData.push(data)
          callback(crusher.funnelData)
        });
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

          crusher.funnelData = parent_data
          funnel.remove()
          console.log(rawData)
        }); 
    },
    show: function(data,callback,wait) {
      var q = queue(5)
      if (wait) wait() 
      var newSteps = data.actions.filter(function(action){

        if (!action.visits_data) {
          
          var fn = function(callback) {

            var domains = []
            crusher.urls && crusher.urls.map(function(d){
              if (action.url_pattern)
                action.url_pattern.map(function(x){
                  if (d.indexOf(x) > -1) domains.push(d)
                })
            })
            action.matches = domains 

            var obj = {"urls": action.matches}

            if (action.matches.length > 0) {
              d3.xhr(visitUID)
                .header("Content-Type", "application/json")
                .post(
                  JSON.stringify(obj),
                  function(err, rawData){
                    var dd = JSON.parse(rawData.response)
                    var uids = {} 
                    dd.map(function(x){uids[x.uid] = true})

                    action.visits_data = dd
                    action.uids = Object.keys(uids) 
                    action.count = dd.length 
                    if (callback) callback(null,action)
                  }
                );
            } else {
              if (!action.id) action.uids = []
              callback(null,action)
            }
          }
          q.defer(fn)
          return true
        }
        return false
      })

      if (newSteps.length > 0) {
        q.awaitAll(function(){
          crusher.ui.funnel.methods.compute_uniques(data.actions)
          callback()
        })
      } else {
        q.awaitAll(callback)
      }

    }
  }

  controller.action = {
    new: function(expandTarget,options) {
      var defaultAction = [{"values":options}]

      crusher.actionData = crusher.actionData.filter(function(x){return x.action_id}).concat(defaultAction) 
      expandTarget.datum(defaultAction[0])
      crusher.ui.action.edit(expandTarget,controller.save_action)
      crusher.ui.action.view(expandTarget)
      crusher.ui.action.select({})
    },
    delete: function(action){
      d3.xhr(actionURL + "&action_id=" + action.action_id)
        .header("Content-Type", "application/json")
        .send(
          "DELETE",
          function(err, rawData){
            crusher.actionData = crusher.actionData.filter(function(x){return x.action_id != action.action_id})
            /*
            var resp = JSON.parse(rawData.response)
            data['action_id'] = resp['response']['action_id']
            obj.filter(function(){return this}).datum(data)
            */
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

      cdata['advertiser'] = source

      d3.xhr(actionURL)
        .header("Content-Type", "application/json")
        .send(type,
          JSON.stringify(cdata),
          function(err, rawData){
            var resp = JSON.parse(rawData.response)
            data['action_id'] = resp['response']['action_id']
            obj.filter(function(){return this}).datum(data)
          }
        );                    
    },
    get: function(action,callback) {
      var domains = []
  
      action.all.length && crusher.urls_wo_qs && crusher.urls_wo_qs.map(function(d){
        if (action.url_pattern)
          action.url_pattern.map(function(x){
            if (d.indexOf(x) > -1) domains.push(d)
          })
      })
  
      var obj = {"urls": domains}
  
      if (domains.length && !action.visits_data)
        d3.xhr(visitUID)
          .header("Content-Type", "application/json")
          .post(
            JSON.stringify(obj),
            function(err, rawData){
              var dd = JSON.parse(rawData.response)
              action.visits_data = dd
              action.uids = dd.map(function(x){return x.uid})
              action.count = dd.length 
              if (callback) callback()
            }
          );

      return obj
    }
  }


  controller.new_funnel = controller.funnel.new 
  controller.save_funnel = controller.funnel.save
  
  controller.get_action_data = controller.action.get 
  controller.new_action = controller.action.new
  controller.save_action = controller.action.save 
  controller.delete_action = controller.action.delete

  controller.new_funnel_action = function(target,options) {
    crusher.ui.funnel.add_action(target,options)

  }  
  return controller

})(RB.crusher.controller || {}) 
