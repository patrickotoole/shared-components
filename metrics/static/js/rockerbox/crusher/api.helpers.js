var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.api = RB.crusher.api || {}

RB.crusher.api.helpers = (function(helpers, api, crusher) {

  helpers.genericQueuedAPI = function(fn){
    return function(cb,extq) {
      var q = extq || queue()
      var bound = fn.bind(false,cb)
      var d =  q.defer(bound)

      return (!extq) ?  q.await(function(err,cb1){ cb1() }) : q
    }
  }

  helpers.genericQueuedAPIWithData = function(fn){
    return function(cb,data,extq) {
      var q = extq || queue()
      var bound = fn.bind(false,data,cb)
      var d =  q.defer(bound)

      return (!extq) ?  q.await(function(err,cb1){ cb1() }) : q
    }
  }
  
  helpers.attachCampaigns =  function(){
    crusher.cache.funnelData.map(function(x){
      x.actions.map(function(y){
        var f = crusher.cache.campaign_map[x.funnel_id]
        if (f) {
          var c = f[y.order]
          if (c) {
            y.campaign = c[0]
          }
        }
      })
    })
  }

  helpers.attachLookalikes =  function(){
    crusher.cache.funnelData.map(function(x){
      var t = crusher.cache.lookalikeFunnel[x.funnel_id] || [{}]
      x.lookalikes = t[0].branches || []
      x.lookalikes.map(function(x){
        var campaign = crusher.cache.lookalikeCampaignsByIdentifier[x.identifier] || [null]
        x.campaign = campaign[0]
      })
    })
  }

  helpers.matchDomains = function(url_pattern) {

    var domains = []
    crusher.cache.urls && crusher.cache.urls.map(function(d){
      if (url_pattern)
        url_pattern.map(function(x){
          if (d.indexOf(x) > -1) domains.push(d)
        })
    })

    return domains
  }

  helpers.visitsToUIDs = function(visits) {
    var uids = {}
    visits.map(function(x){uids[x.uid] = true})
    return Object.keys(uids)
  }

  helpers.set = function(list,fn) {
    var h = {},
      fn = fn || function(x) {return x}

    list.map(function(x){
      var v = fn(x)
      h[v] = h[v] ? (h[v] + 1) : 1
    })
    
    return Object.keys(h).sort(function(x,y){return h[y] - h[x]})
  }

  return helpers

})(RB.crusher.api.helpers || {}, RB.crusher.api, RB.crusher)



