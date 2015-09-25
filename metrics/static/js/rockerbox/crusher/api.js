var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.crusher.cache = (function(cache) {
  return cache
})(RB.crusher.cache || {})


RB.crusher.api = (function(api, crusher) {

  var addParam = function(u,p) { 
    return u.indexOf("?") >= 0 ? 
      u + "&" + p:
      u + "?" + p 
  }

  var source = ""



  api.URL = {
    //source: qs.advertiser,
    userPermissions: "/account/permissions",
    actionURL: "/crusher/funnel/action?format=json",
    actionUIDs: "/crusher/pattern_search/uids?search=",
    actionTimeseries: "/crusher/pattern_search/timeseries?search=",

    funnelUIDs: "/crusher/multi_search/uids?search=",
    funnelAvails: "/crusher/multi_search/avails?search=",
    funnelDomains: "/crusher/multi_search/domains?search=",
    recommendedActions: "/crusher/funnel/action/recommended",

    statsURL: "/crusher/stats?format=json",

    //visitURL: "/crusher/visit_urls?format=json&source=" + source, // TODO: TEST IF THIS BEING USED
    //visitUID: "/crusher/visit_uids?format=json&url=",
    //visitDomains: "/crusher/visit_domains?format=json&kind=domains",
    //visitAvails: "/crusher/visit_avails?format=json",

    campaigns: "/crusher/funnel/campaign?advertiser=" + source,
    lookalikeCampaigns: "/crusher/funnel/lookalike_campaign?advertiser=" + source,
    lookalikes: "/crusher/funnel/lookalike?format=json&advertiser=" + source,

    funnelURL: "/crusher/funnel?format=json",
    current: addParam(window.location.pathname + window.location.search,"format=json")
  }

  var endpoints = api.endpoints

  Object.keys(endpoints).map(function(e) {
    crusher.subscribe.register_publisher(e,endpoints[e])
    api[e] = endpoints[e]
  })

  return api

})(RB.crusher.api || {}, RB.crusher)



