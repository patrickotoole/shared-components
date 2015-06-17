var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.crusher.controller = (function(controller) {

  // requires: api.js, d3.js

  var crusher = RB.crusher
  

  var source = crusher.api.source 
  var actionURL = "/crusher/funnel/action?format=json&advertiser=" + source
  var visitURL = "/crusher/visit_urls?format=json&source=" + source
  var visitUID = "/crusher/visit_uids?format=json&url="
  var visitDomains = "/crusher/visit_domains?format=json&kind=domains"
  var funnelURL = "/crusher/funnel?format=json&advertiser=" + source
  
  var filterRecommended = function(x){
    var actions = crusher.cache.actionData.filter(function(z){
      if (!z.url_pattern) return false
      var matched = z.url_pattern.filter(function(q){
        return (q.indexOf(x.key) > -1) || (x.key.indexOf(q) > -1
      )})
      return matched.length
    })
    return actions.length == 0 
  }

  controller.initializers = {
    "": function(){
      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"about"}],function(x){return x.id})
        .classed("row funnels",true)

      d3_updateable(funnelRow,"h5","h5").text("about this page and why its here")
      funnelRow.exit().remove()

 
    },
    "funnel/existing": function(funnel) {
      var id = funnel ? funnel.funnel_id : false

      crusher.ui.funnel.buildBase() 

      crusher.subscribe.add_subscriber(["actions","funnels","campaigns"], function(){

        console.log(crusher.cache.campaigns)

        crusher.cache.funnelData.map(function(x){
          x.actions.map(function(y){
            var f = crusher.cache.campaign_map[x.funnel_id]
            if (f) {
              console.log(f,y.order)
              var c = f[y.order]
              if (c) {
                console.log(c)
                y.campaign = c[0]
              }
            }
          })
        })

        var data = (id) ? 
          crusher.cache.funnelData.filter(function(x){return x.funnel_id == id}) : 
          crusher.cache.funnelData

        crusher.ui.funnel.build(data,crusher.cache.actionData)

        crusher.subscribe.add_subscriber(["tf_idf"], function(){
          crusher.ui.funnel.buildShow()
        },"funnel_view_show",true,true)

      },"funnel_view",true,true)
    },
    "funnel/new": function(){
      crusher.ui.funnel.buildBase()
      var target = d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")

      RB.crusher.controller.funnel.new(target)
    },
    "action/existing": function(action) {

      crusher.ui.action.buildBase()

      var target = d3.selectAll(".action-view-wrapper")
      target.datum(action)
      
      crusher.subscribe.add_subscriber(["actions"], function(){
        crusher.ui.action.edit(target,controller.action.save)
      },"existing_edit",true,true)   

      crusher.subscribe.add_subscriber(["actions","visits"] , function() {
        crusher.cache.actionData.map(function(x) { x.values = crusher.cache.urls_wo_qs })
        crusher.ui.action.view(target)
      },"existing_view",true,true)
         
    },
    "action/new": function(action) {
      crusher.ui.action.buildBase()

      var target = d3.selectAll(".action-view-wrapper")

      crusher.subscribe.add_subscriber(["actions"], function(actionsw){

        var override = (action.action_name) ? action : false
        controller.action.new(target,crusher.cache.urls_wo_qs, override)
      }, "new",true,true)
    }
  }

  controller.get_bloodhound = function(cb) {

    crusher.subscribe.add_subscriber(["visits"], function(visits){

      controller.bloodhound = controller.bloodhound || new Bloodhound({
        datumTokenizer: function(x){return x.split(/\/|-/)}, 
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: crusher.cache.urls_wo_qs 
      }); 

      cb(controller.bloodhound)

    },"bloodhound",true,true)
 
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
     
    if (type.length) controller.initializers[type](id)
  }

  controller.funnel = {
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
    show: function(data,callback,wait) {
     
      if (wait) wait()

      crusher.api.visits(function(){
        var q = queue(5)
         
        var newSteps = data.actions.filter(function(action){
          crusher.api.actionToUIDs(action,q)
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

  controller.action = {
    new: function(expandTarget,options,override) {
      var defaultAction = [{"values":options}]

      crusher.cache.actionData = crusher.cache.actionData.filter(function(x){return x.action_id})
      expandTarget.datum(override || defaultAction[0])
      crusher.ui.action.edit(expandTarget,controller.action.save)
      crusher.ui.action.view(expandTarget)
      crusher.ui.action.select({})
    },
    delete: function(action){
      d3.xhr(actionURL + "&action_id=" + action.action_id)
        .header("Content-Type", "application/json")
        .send(
          "DELETE",
          function(err, rawData){
            crusher.cache.actionData = crusher.cache.actionData.filter(function(x){return x.action_id != action.action_id})
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
      delete cdata['name']

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
  
      action.all.length && crusher.cache.urls_wo_qs && crusher.cache.urls_wo_qs.map(function(d){
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

  controller.routes = {
    roots: [{
      "name":"On-page Analytics",
      "push_state": "/crusher/"
    }],
    renderers: controller.initializers,
    transforms: {
      "funnel/new": function(menu_obj){
        menu_obj.values = RB.crusher.cache.funnelData
        RB.menu.methods.transform(menu_obj,menu_obj.values_key)
      },
      "funnel/existing": function(menu_obj){
        menu_obj.values = RB.crusher.cache.funnelData
        RB.menu.methods.transform(menu_obj,menu_obj.values_key)
      },
      "action/existing": function(menu_obj){
        menu_obj.values = RB.crusher.cache.actionData
        RB.menu.methods.transform(menu_obj,menu_obj.values_key)
      },
      "action/new": function(menu_obj){

        crusher.cache.actionData.map(function(x) { x.values = crusher.cache.urls_wo_qs })
        crusher.cache.recommendedActionData = crusher.cache.uris.filter(filterRecommended)
          .slice(0,10)
          .map(function(x){
            return {"action_name":x.key,"url_pattern":[x.key]}
          })

        menu_obj.values = RB.crusher.cache.recommendedActionData
        RB.menu.methods.transform(menu_obj,menu_obj.values_key)
      }
    },
    apis: {
      "funnel/new": [],
      "funnel/existing": ['funnels'],
      "action/existing": ['actions'],
      "action/new": ['visits','actions'],
      "": [{
          "name":"Actions",
          "push_state":"/crusher/action",
        },
        {
          "name":"Funnels",
          "push_state":"/crusher/funnel",
        }] ,
      "funnel": [{
          "name":"Create New Funnel",
          "push_state":"/crusher/funnel/new",
        },
        {
          "name": "View Existing Funnels",
          "push_state":"/crusher/funnel/existing",
          "skipRender": true,
          "values_key":"funnel_name"    
        }],
      "action": [{
          "name": "Create New Action",
          "push_state":"/crusher/action/new",
          "values_key": "action_name"
        },
        {
          "name": "View Existing Actions",
          "push_state":"/crusher/action/existing",
          "skipRender": true,
          "values_key":"action_name"
        }]
    }
  }

  RB.routes.register(controller.routes)



  return controller

})(RB.crusher.controller || {}) 
