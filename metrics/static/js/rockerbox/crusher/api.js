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
    },
    set: function(list,fn) {
      var h = {},
        fn = fn || function(x) {return x}

      list.map(function(x){
        var v = fn(x)
        h[v] = h[v] ? (h[v] + 1) : 1
      })
      
      return Object.keys(h).sort(function(x,y){return h[y] - h[x]})
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
            cache.urls_wo_qs = api.helpers.set(cache.urls)

            
            cache.uris = d3.nest()
              .key(function(x){return x.url.split("?")[0].split(".com")[1]})
              .rollup(function(x){
                return d3.sum(x,function(y){ return y.visits})
              })
              .entries(dd)
              .sort(function(x,y){return y.values -  x.values })
 
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
            if (cache.urls_wo_qs) cache.actionData.map(function(x) { x.values = cache.urls_wo_qs })
            deferred_cb(null,cb)
          })
        } else {
          if (cache.urls_wo_qs) cache.actionData.map(function(x) { x.values = cache.urls_wo_qs })
          deferred_cb(null,cb)
        }
      }),
      recommended_actions: function(cb,extq) {

        var filterRecommended = function(x){
          var actions = cache.actionData.filter(function(z){
            if (!z.url_pattern) return false
            var matched = z.url_pattern.filter(function(q){
              return (q.indexOf(x.key) > -1) || (x.key.indexOf(q) > -1
            )})
            return matched.length
          })
          return actions.length == 0 
        }

        var q = extq || queue(2)

        endpoints.actions(function(){},q)
        endpoints.visits(function(){},q)

        if (extq) return extq
        else q.awaitAll(cb) 

      },
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



