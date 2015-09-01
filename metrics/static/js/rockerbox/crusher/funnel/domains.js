var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

RB.crusher.ui.funnel.domains = (function(domains,funnel,crusher) {

  domains.NAME = "domains"
  domains.SUBSCRIBE = ["funnel_rendered","funnelDomains"]
  domains.PUBLISH = ["domains_rendered","tf_idf_funnel"]

  domains.subscription = function(data) {
    data.funnel_domains = data.actions[data.actions.length-1].funnel_domains

    var funnel = crusher.ui.funnel.buildShow(),
      is_lookalike = crusher.permissions.bind(false,"lookalike"),
      render_lookalike = crusher.ui.funnel.show.component.lookalike.bind(false,funnel)

    is_lookalike(render_lookalike)
    return data
  }

  funnel.events = (function(events) {
    events["domains_rendered"] = true
    return events
  })(funnel.events || {})


  funnel.components = (function(components) {
    return register(
      components,
      domains.NAME,
      domains.SUBSCRIBE, 
      domains.subscription,
      domains.PUBLISH
    )
  })(funnel.components || {})

})(RB.crusher.ui.funnel.domains || {}, RB.crusher.ui.funnel,RB.crusher)
