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
  var actionURL = "/admin/funnel/action?advertiser=" + source
  var visitURL = "/visit_urls?format=json&source=" + source
  var visitUID = "/visit_uids?format=json&url="
  var funnelURL = "/admin/funnel?advertiser=" + source

  var addParam = function(u,p) { 
    return u.indexOf("?") >= 0 ? u + "&" + p : u + "?" + p 
  }
  URL = addParam(URL,"format=json")

  controller.init = function(){
    
    d3.json(visitURL, function(dd){
      crusher.urlData = dd
      crusher.urls = dd.map(function(x){return x.url})
      
      d3.json(actionURL,function(actions){
        crusher.actionData = actions

        actions.map(function(x) {
          x.values = crusher.urls
          return x
        })

        crusher.ui.action.showAll(actions,controller.save_action)
        //crusher.ui.action.showList(d3.select(".funnel-wrapper"),actions)
        crusher.ui.build(crusher.urls) 
        

        d3.json(funnelURL, function(dd) {
          crusher.funnelData = dd

          console.log(crusher.funnelData)
          crusher.ui.funnel.build(crusher.funnelData,crusher.urls,crusher.actionData)
          crusher.ui.add_funnel_action(actions) 
          crusher.ui.compute_funnel()
        })
 
      })
    
    })
  }

  controller.get_action_data = function(action) {

    var domains = []

    action.all[0].values.map(function(d){
      action.url_pattern.map(function(x){
        if (d.indexOf(x) > -1) domains.push(d)
      })
    })

    var domain_str = domains.join(",")

    d3.json(visitUID + domain_str,function(dd){
      action.uids = dd.map(function(x){return x.uid})
      action.count = dd.length
    })
  }

  controller.save_funnel = function(data) {
    var cdata = JSON.parse(JSON.stringify(data))
    cdata.actions.map(function(action){
      delete action['all']
      return action
    })

    d3.xhr(funnelURL)
      .header("Content-Type", "application/json")
      .send(
        data['funnel_id'] ? "PUT" : "POST",
        JSON.stringify(cdata),
        function(err, rawData){
          var resp = JSON.parse(rawData.response)
        }
      );
     
  }

  controller.save_action = function(data, obj) {
    var cdata = JSON.parse(JSON.stringify(data))
    delete cdata['values'];
    delete cdata['rows']
    cdata['advertiser'] = source

    d3.xhr(actionURL)
      .header("Content-Type", "application/json")
      .send(
        data['action_id'] ? "PUT" : "POST",
        JSON.stringify(cdata),
        function(err, rawData){
          var resp = JSON.parse(rawData.response)
          data['action_id'] = resp['response']['action_id']
          obj.filter(function(){return this}).datum(data)
        }
      );
    //actionURL
  }

  controller.new_action = function(target,options) {

    var defaultAction = [{"values":options}]

    crusher.actionData = crusher.actionData.concat(defaultAction) 
    crusher.ui.action.buildEdit(target,crusher.actionData,controller.save_action)

  }                 

  controller.new_funnel_action = function(target,options) {
    
    crusher.ui.funnel.add_action(target,options)

  }  
  return controller

})(RB.crusher.controller || {}) 
