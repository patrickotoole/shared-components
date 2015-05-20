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
        crusher.ui.action.showList(d3.select(".funnel-wrapper"),actions)
        crusher.ui.build(crusher.urls) 
      })

    })

  }

  controller.save_action = function(data) {
    var data = JSON.parse(JSON.stringify(data))
    delete data['values'];
    delete data['rows']
    data['advertiser'] = source
    d3.xhr(actionURL)
      .header("Content-Type", "application/json")
      .post(
        
        JSON.stringify(data),
        function(err, rawData){
          console.log("got response", rawData.response);
        }
      );
    actionURL
  }

  controller.new_action = function(target,options) {

    var defaultAction = [{"values":options}]

    crusher.actionData = crusher.actionData.concat(defaultAction) 
    crusher.ui.action.buildEdit(target,crusher.actionData,controller.save_action)

  }                 
  
  return controller

})(RB.crusher.controller || {}) 
