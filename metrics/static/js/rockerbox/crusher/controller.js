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

  var source = qs.advertiser
  var actionURL = "/crusher/funnel/action?format=json&advertiser=" + source
  var visitURL = "/crusher/visit_urls?format=json&source=" + source
  var visitUID = "/crusher/visit_uids?format=json&url="
  var visitDomains = "/crusher/visit_domains?format=json&kind=domains"
  var funnelURL = "/crusher/funnel?format=json&advertiser=" + source

  var addParam = function(u,p) { 
    return u.indexOf("?") >= 0 ? u + "&" + p : u + "?" + p 
  }
  URL = addParam(URL,"format=json")


  controller.getUrls = function(callback) {
    if (!crusher.urlData) {
      
    } else {
      callback()
    }
  }

  var genericQueuedAPI = function(fn){
    return function(cb,extq) {
      var q = extq || queue()
      var bound = fn.bind(false,cb)
      var d =  q.defer(bound)

      return (!extq) ?  q.await(function(err,cb1){ cb1() }) : q
    }
  }

  controller.helpers = {
    matchDomains: function(url_pattern) {

      var domains = []
      crusher.urls && crusher.urls.map(function(d){
        if (url_pattern)
          url_pattern.map(function(x){
            if (d.indexOf(x) > -1) domains.push(d)
          })
      })

      return domains
    },
    visitsToUIDs: function(visits) {
      var uids = {}
      visits.map(function(x){uids[x.uid] = true})
      return Object.keys(uids)
    }
  }

  

  
  controller.api = {

    visits: genericQueuedAPI(function(cb,deferred_cb) {

      if (!crusher.urlData) {
        d3.json(visitURL, function(dd){
          crusher.urlData = dd
          crusher.urls = dd.map(function(x){return x.url})
          crusher.actionData.map(function(x) { x.values = crusher.urls }) 

          deferred_cb(null,cb)
        })
      } else {
        deferred_cb(null,cb)
      }
    }),
    actions: genericQueuedAPI(function(cb,deferred_cb) {

      if (!crusher.actionData) {
        d3.json(actionURL,function(actions){
          crusher.actionData = actions
          deferred_cb(null,cb)
        })
      } else {
        deferred_cb(null,cb)
      }
    }),
    funnels: genericQueuedAPI(function(cb,deferred_cb) {

      if (!crusher.funnelData) {
        d3.json(funnelURL,function(dd){
          crusher.funnelData = dd 
          deferred_cb(null,cb)
        })
      } else {
        deferred_cb(null,cb)
      }
    }),
    actionToUIDs: genericQueuedAPI(function(action,deferred_cb) {

      var helpers = controller.helpers
      var obj = {}
      obj.urls = helpers.matchDomains(action.url_pattern)

      if ((obj.urls.length) > 0 && (!action.visits_data)) {

        d3.xhr(visitUID)
          .header("Content-Type", "application/json")
          .post(
            JSON.stringify(obj),
            function(err, rawData){
              var dd = JSON.parse(rawData.response)
              action.visits_data = dd
              action.matches = obj.urls

              action.uids = helpers.visitsToUIDs(action.visits_data) 
              action.count = dd.length 
              deferred_cb(null,action)
            }
          );
      } else {
        if (!action.action_id) action.uids = []
        deferred_cb(null,action)
      }
    })

  }

  controller.initializers = {
    "":function(){},
    "funnel/existing": function(funnel) {
      controller.initializers.__funnel(funnel.funnel_id)
    },
    "funnel/new": function(){
      var target = d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")
      RB.crusher.controller.funnel.new(target)
    },
    "__funnel": function(id) {

      controller.get_tf_idf()
      crusher.ui.funnel.buildBase() 

      var q = queue(5)

      controller.api.actions(function(){},q)
      controller.api.funnels(function(){},q)

      q.awaitAll(function(err,callbacks){
        //callbacks.map(function(f){f()})

        var data = (id) ? 
          crusher.funnelData.filter(function(x){return x.funnel_id == id}) : 
          crusher.funnelData

        crusher.ui.funnel.build(data,crusher.actionData)
        crusher.ui.funnel.buildShow()
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

        var uris = dd.map(function(x){ return {"url":x.url.split("?")[0].split(".com")[1], "visits":x.visits }})

        crusher.sorted_uris = d3.nest()
          .key(function(x){return x.url})
          .rollup(function(x){
            return d3.sum(x,function(y){ return y.visits})
          })
          .entries(uris)
          .sort(function(x,y){return y.values -  x.values })

        var rec = crusher.sorted_uris
          .filter(function(x){
            var actions = crusher.actionData.filter(function(z){
              if (!z.url_pattern) return false
              var matched = z.url_pattern.filter(function(q){
                return (q.indexOf(x.key) > -1) || (x.key.indexOf(q) > -1
              )})
              return matched.length
            })
            return actions.length == 0 
          })
          .slice(0,10)
          .map(function(x){
            return {"action_name":x.key,"url_pattern":[x.key]}
          })
        
        crusher.ui.action.showRecommended(rec,controller.save_action,crusher.urls_wo_qs) 
        
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


  controller.init = function(type,data){
    var type = (type == "/crusher") ? "" : type
    var id = data ? data.funnel_id : false
     
    controller.initializers[type](id)
    
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
     
      if (wait) wait()

      controller.api.visits(function(){
        var q = queue(5)
         
        var newSteps = data.actions.filter(function(action){
          controller.api.actionToUIDs(action,q)
          return !action.visits_data
        })

        if (newSteps.length > 0) {
          q.awaitAll(function(){
            crusher.ui.funnel.methods.compute_uniques(data.actions)
            callback()
          })
        } else {
          q.awaitAll(callback)
        }
      })
    }
  }

  controller.action = {
    new: function(expandTarget,options) {
      var defaultAction = [{"values":options}]

      crusher.actionData = crusher.actionData.filter(function(x){return x.action_id})
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

  controller.menu = {}

  controller.menu.renderers = controller.initializers

  controller.menu.transforms = {
    "funnel/new": function(menu_obj){
      menu_obj.values = RB.crusher.funnelData
      RB.menu.methods.transform(menu_obj,menu_obj.values_key)
    },
    "funnel/existing": function(menu_obj){
      menu_obj.values = RB.crusher.funnelData
      RB.menu.methods.transform(menu_obj,menu_obj.values_key)
    }
  }

  controller.menu.apis = {
    "funnel/new": controller.api.funnels,
    "funnel/existing": controller.api.funnels
  }

  setTimeout(function(){
    RB.menu.routes.register(controller.menu)
  },1)



  return controller

})(RB.crusher.controller || {}) 
