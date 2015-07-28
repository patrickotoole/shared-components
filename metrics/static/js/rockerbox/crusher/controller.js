var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.crusher.controller = (function(controller) {

  // requires: api.js, d3.js

  var crusher = RB.crusher
  var source = crusher.api.source 

  controller.init = function(type,data) {

    var type = (type == "/crusher") ? "" : type
    var id = data ? data.funnel_id : false
     
    if (type.length) controller.initializers[type](id)
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
      debugger
      console.log(funnel)
      throw "asdf";
      var id = funnel ? funnel.funnel_id : false

      crusher.ui.funnel.buildBase() 

      var to_subscribe = ["actions","funnels","campaigns","lookalikes","lookalikeCampaigns"]
      crusher.subscribe.add_subscriber(to_subscribe, function(){

        crusher.api.helpers.attachCampaigns()
        crusher.api.helpers.attachLookalikes()


        var data = (id) ? 
          crusher.cache.funnelData.filter(function(x){return x.funnel_id == id}) : 
          crusher.cache.funnelData

        crusher.ui.funnel.build(data,crusher.cache.actionData)
        controller.funnel.show()

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

      crusher.subscribe.add_subscriber(["actions"] , function() {
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

    var compare = function(a,b) {
      return (a.count < b.count) ? -1 : 1
    }

    controller.bloodhound = controller.bloodhound || new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.whitespace,
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      remote: { 
        url: "/crusher/api/urls?advertiser=" + source + "&search=%QUERY&format=json&logic=must&timeout=4",
        wildcard: "%QUERY",
        prepare: function(x,settings) {
          var q = x.split(" ").join(","),
            split = settings.url.split("%QUERY")

          settings.url = split[0] + q + split[1]
          return settings
        }
      },
      sorter:compare
    }); 

    cb(controller.bloodhound)
 
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
      "action/new": [],//['visits','actions'],
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
