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

      d3.json(actionURL,function(actions){

        crusher.actionData = actions

        d3.json(funnelURL, function(dd) {
          crusher.funnelData = dd

          crusher.ui.funnel.build(crusher.funnelData,crusher.actionData)
          crusher.ui.add_funnel()
        })
 
      })
    },
    "action": function() {
    
      d3.json(visitURL, function(dd){
        crusher.urlData = dd
        crusher.urls = dd.map(function(x){return x.url})
        
        d3.json(actionURL,function(actions){
          crusher.actionData = actions

          actions.map(function(x) { x.values = crusher.urls })

          crusher.ui.action.showAll(actions,controller.save_action,crusher.urls)
          //crusher.ui.action.showList(d3.select(".funnel-wrapper"),actions)
          //crusher.ui.build(crusher.urls) 
 
        }) 
      
      })
    }
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
    var data = {
      "uids":uids
    }
    d3.xhr(visitDomains)
      .header("Content-Type", "application/json")
      .post(
        JSON.stringify(data),
        function(err, rawData){
          var resp = JSON.parse(rawData.response)
          callback(resp)
        }
      );
     
  }

  


  controller.funnel = {
    new: function(target) {
      crusher.ui.funnel.add_funnel(target)
    },
    save: function(data) {
      data['advertiser'] = source
      data['owner'] = "owner"

      var cdata = JSON.parse(JSON.stringify(data)),
        type = data['funnel_id'] ? "PUT" : "POST";

      cdata.actions.map(function(action){ delete action['all'] })

      d3.xhr(funnelURL)
        .header("Content-Type", "application/json")
        .send(type, JSON.stringify(cdata), function(err, rawData){
          var resp = JSON.parse(rawData.response).response
          data['funnel_id'] = resp.funnel_id
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

          funnel.remove()
          console.log(rawData)
        }); 
    }
  }

  controller.action = {
    new: function(target,options) {
      var defaultAction = [{"values":options}]

      crusher.actionData = crusher.actionData.concat(defaultAction) 
      crusher.ui.action.buildEdit(target,crusher.actionData,controller.save_action)
    },
    delete: function(action){
      d3.xhr(actionURL + "&action_id=" + action.action_id)
        .header("Content-Type", "application/json")
        .send(
          "DELETE",
          function(err, rawData){
            var resp = JSON.parse(rawData.response)
            data['action_id'] = resp['response']['action_id']
            obj.filter(function(){return this}).datum(data)
          }
        ); 
    },
    save: function(data, obj) {
      var cdata = JSON.parse(JSON.stringify(data)),
        type = data['action_id'] ? "PUT" : "POST";

      delete cdata['values'];
      delete cdata['rows']

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
    get: function(action) {
      var domains = []
  
      action.all.length && action.all[0].values && action.all[0].values.map(function(d){
        action.url_pattern.map(function(x){
          if (d.indexOf(x) > -1) domains.push(d)
        })
      })
  
      var obj = {"urls": domains}
  
      d3.xhr(visitUID)
        .header("Content-Type", "application/json")
        .post(
          JSON.stringify(obj),
          function(err, rawData){
            var dd = JSON.parse(rawData.response)
            action.uids = dd.map(function(x){return x.uid})
            action.count = dd.length 
          }
        );
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
