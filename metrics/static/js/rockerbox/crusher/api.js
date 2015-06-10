var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.crusher.cache = (function(cache) {
  return cache
})(RB.crusher.cache || {})



RB.crusher.api = (function(api) {

  // requires: queue.js, d3.js

  var crusher = RB.crusher

  var addParam = function(u,p) { 
    return u.indexOf("?") >= 0 ? 
      u + "&" + p:
      u + "?" + p 
  }

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

  api.source = qs.advertiser

  var source = api.source
  var genericQueuedAPI = function(fn){
    return function(cb,extq) {
      var q = extq || queue()
      var bound = fn.bind(false,cb)
      var d =  q.defer(bound)

      return (!extq) ?  q.await(function(err,cb1){ cb1() }) : q
    }
  }

  var genericQueuedAPIWithData = function(fn){
    return function(data,cb,extq) {
      var q = extq || queue()
      var bound = fn.bind(false,data,cb)
      var d =  q.defer(bound)

      return (!extq) ?  q.await(function(err,cb1){ cb1() }) : q
    }
  }

  api.helpers = {
    matchDomains: function(url_pattern) {

      var domains = []
      crusher.cache.urls && crusher.cache.urls.map(function(d){
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


  api.URL = {
    source: qs.advertiser,
    actionURL: "/crusher/funnel/action?format=json&advertiser=" + source,
    visitURL: "/crusher/visit_urls?format=json&source=" + source,
    visitUID: "/crusher/visit_uids?format=json&url=",
    visitDomains: "/crusher/visit_domains?format=json&kind=domains",
    funnelURL: "/crusher/funnel?format=json&advertiser=" + source,
    current: addParam(window.location.pathname + window.location.search,"format=json")
  }

  var endpoints = (function(cache) {
    var apis = {
      visits: genericQueuedAPI(function(cb,deferred_cb) {

        if (!cache.urlData) {
          d3.json(api.URL.visitURL, function(dd){
            cache.urlData = dd
            cache.urls = dd.map(function(x){return x.url})
            cache.actionData.map(function(x) { x.values = cache.urls }) 

            deferred_cb(null,cb)
          })
        } else {
          deferred_cb(null,cb)
        }
      }),
      actions: genericQueuedAPI(function(cb,deferred_cb) {

        if (!cache.actionData) {
          d3.json(api.URL.actionURL,function(actions){
            cache.actionData = actions
            deferred_cb(null,cb)
          })
        } else {
          deferred_cb(null,cb)
        }
      }),
      funnels: genericQueuedAPI(function(cb,deferred_cb) {

        if (!cache.funnelData) {
          d3.json(api.URL.funnelURL,function(dd){
            cache.funnelData = dd 
            deferred_cb(null,cb)
          })
        } else {
          deferred_cb(null,cb)
        }
      }),
      actionToUIDs: genericQueuedAPI(function(action,deferred_cb) {

        var helpers = api.helpers
        var obj = {}
        obj.urls = helpers.matchDomains(action.url_pattern)

        if ((obj.urls.length) > 0 && (!action.visits_data)) {

          d3.xhr(api.URL.visitUID)
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
      }),
      UIDsToDomains: genericQueuedAPIWithData(function(uids,cb,deferred_cb) {
        var data = { "uids":uids }
        if (uids.length) {
          d3.xhr(api.URL.visitDomains)
            .header("Content-Type", "application/json")
            .post(
              JSON.stringify(data),
              function(err, rawData){
                var resp = JSON.parse(rawData.response)
                deferred_cb(null,cb.bind(false,resp))
              }
            );
        } else {
          deferred_cb(null,cb.bind(false,[]))
        } 
      })

    } 

    return apis

  })(crusher.cache || {})


  Object.keys(endpoints).map(function(e) {
    api[e] = endpoints[e]
  })

  return api

})(RB.crusher.api || {})



