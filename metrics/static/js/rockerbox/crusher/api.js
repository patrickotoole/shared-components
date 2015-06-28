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
    return function(cb,data,extq) {
      var q = extq || queue()
      var bound = fn.bind(false,data,cb)
      var d =  q.defer(bound)

      return (!extq) ?  q.await(function(err,cb1){ cb1() }) : q
    }
  }

  /*var genericQueuedAPI = function(fn) {

    var serviceQueue = function() {
      this.callback_queue = []
      this.get_queue = function() {
        if (!this.__queue__) this.__queue__ = queue()
        return this.__queue__ 
      }
      this.set_queue = function(q) {
        this.__queue__ = this.__queue__ || q
        return this.__queue__
      }
      this.remove_queue = function() { 
        this.__queue__ = undefined
      }

      this.run_callbacks = function() {
        var args = arguments
        this.callback_queue.map(function(cb){
          if (typeof(cb) == "function") cb.apply(null,args)
        })
        this.remove_queue()
        this.clear_callbacks()
      }

      this.clear_callbacks = function() {
        this.callback_queue = []
      }
    } 

    var self = new serviceQueue()

    return function(cb,extq) {
      
      var q = (extq) ? self.set_queue(extq) : self.get_queue()   
      self.callback_queue.push(cb)

      console.log(self.callback_queue,q)

      if (self.callback_queue.length == 1) { 
        var bound = fn.bind(false,self.run_callbacks)
        var d =  q.defer(bound)   
      } 

      if (!extq) return q.await(function(err,cb1){ cb1() })
      else return q

    }
  }  
  */

  api.helpers = {
    attachCampaigns: function(){
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
    },
    attachLookalikes: function(){
      crusher.cache.funnelData.map(function(x){
        var t = crusher.cache.lookalikeFunnel[x.funnel_id] || [{}]
        x.lookalikes = t[0].branches || []
        x.lookalikes.map(function(x){
          var campaign = crusher.cache.lookalikeCampaignsByIdentifier[x.identifier] || [null]
          x.campaign = campaign[0]
        })
      })
    },
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
    visitAvails: "/crusher/visit_avails?format=json",

    campaigns: "/crusher/funnel/campaign?advertiser=" + source,
    lookalikeCampaigns: "/crusher/funnel/lookalike_campaign?advertiser=" + source,
    lookalikes: "/crusher/funnel/lookalike?format=json&advertiser=" + source,

    funnelURL: "/crusher/funnel?format=json&advertiser=" + source,
    current: addParam(window.location.pathname + window.location.search,"format=json")
  }




  var endpoints = (function(cache) {

    
    var apis = {
      tf_idf: new genericQueuedAPI(function(cb,deferred_cb) {
        if (!crusher.pop_domains) {
          d3.json("/admin/api?table=reporting.pop_domain_with_category&format=json", function(dd){
            crusher.pop_domains = {}
            crusher.cat_domains = {}
            dd.map(function(x){
              crusher.pop_domains[x.domain] = x.idf
              crusher.cat_domains[x.domain] = x.category_name

            })
            deferred_cb(null,cb)
          }) 
        } else {
          deferred_cb(null,cb)
        }
      }),
      visits: new genericQueuedAPI(function(cb,deferred_cb) {

        if (!cache.urlData) {
          d3.json(api.URL.visitURL, function(dd){
            cache.urlData = dd
            cache.urls = dd.map(function(x){return x.url})
            cache.urls_wo_qs = api.helpers.set(cache.urls)
            if (cache.actionData) cache.actionData.map(function(x) { x.values = cache.urls_wo_qs })

            
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
          if (cache.actionData) cache.actionData.map(function(x) { x.values = cache.urls_wo_qs })
          deferred_cb(null,cb)
        }
      }),
      campaigns: new genericQueuedAPI(function(cb,deferred_cb) {

        if (!cache.actionData) {
          d3.json(api.URL.campaigns,function(campaigns){
            cache.campaigns = campaigns 
            cache.campaign_map = d3.nest()
              .key(function(x){return x.funnel_id})
              .key(function(x){return x.order})
              .map(campaigns)

            deferred_cb(null,cb)
          })
        } else {
          if (cache.urls_wo_qs) cache.actionData.map(function(x) { x.values = cache.urls_wo_qs })
          deferred_cb(null,cb)
        }
      }),
      actions: new genericQueuedAPI(function(cb,deferred_cb) {

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
        console.log("in reccommended")
        var q = extq || queue(2)

        endpoints.actions(function(){},q)
        endpoints.visits(function(){},q)

        console.log("just put two items on the queue")

        if (extq) return extq
        else q.awaitAll(function(err,cbs) {
          cbs.map(function(fn){if (typeof(fn) == "function") fn()})
          cb()
        }) 

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
      lookalikes: genericQueuedAPI(function(cb,deferred_cb) {

        if (!cache.lookalikeData) {
          d3.json(api.URL.lookalikes,function(dd){
            cache.lookalikeData = dd 
            cache.lookalikeFunnel = d3.nest()
              .key(function(x){return x.funnel_id})
              .rollup(function(x){return x})
              .map(dd)
            deferred_cb(null,cb)
          })
        } else {
          deferred_cb(null,cb)
        }
      }),
      lookalikeCampaigns: genericQueuedAPI(function(cb,deferred_cb) {

        if (!cache.lookalikeCampaigns) {
          d3.json(api.URL.lookalikeCampaigns,function(dd){
            cache.lookalikeCampaigns = dd 
            cache.lookalikeCampaignsByIdentifier = d3.nest()
              .key(function(x){return x.identifier})
              .rollup(function(x){return x})
              .map(dd)
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

          console.debug("GETTING DATA FOR: ", action)
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
                deferred_cb(null,resp)
              }
            );
        } else {
          deferred_cb(null,[])
        } 
      }),
      UIDsToDomainsNoQueue: function(cb,uids) {
        var data = { "uids":uids }

        if (uids.length) {
          d3.xhr(api.URL.visitDomains)
            .header("Content-Type", "application/json")
            .post(
              JSON.stringify(data),
              function(err, rawData){
                var resp = JSON.parse(rawData.response)
                cb(resp)
              }
            );
        } else {
          cb([])
        } 
      },
      actionToAvails: genericQueuedAPIWithData(function(action,cb,deferred_cb) {
        var data = { "uids":action.funnel_uids }
        if (action.funnel_uids.length && (!action.avails)) {
          d3.xhr(api.URL.visitAvails)
            .header("Content-Type", "application/json")
            .post(
              JSON.stringify(data),
              function(err, rawData){
                var resp = JSON.parse(rawData.response)
                action.avails_raw = resp[0]
                deferred_cb(null,action)
              }
            );
        } else {
          deferred_cb(null,action)
        } 
      })
    } 

    return apis

  })(crusher.cache || {})

   


  Object.keys(endpoints).map(function(e) {
    crusher.subscribe.register_publisher(e,endpoints[e])
    api[e] = endpoints[e]
  })

  return api

})(RB.crusher.api || {})



