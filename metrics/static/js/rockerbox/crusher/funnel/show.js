var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

RB.crusher.ui.funnel.show = (function(show,funnel,crusher) {

  show.NAME = "show"
  show.SUBSCRIBE = ["funnelUIDs"]
  show.PUBLISH = ["funnel_rendered","funnelAvails","funnelDomains"]

  show.subscription = function(data) {
    var funnel = crusher.ui.funnel.buildShow()
    crusher.ui.funnel.show(funnel)
    return data
  }

  funnel.events = (function(events) {
    events["funnel_rendered"] = true
    return events
  })(funnel.events || {})

  funnel.components = (function(components) {
    return register(
      components,
      show.NAME,
      show.SUBSCRIBE, 
      show.subscription,
      show.PUBLISH
    )
  })(funnel.components || {})

})(RB.crusher.ui.funnel.show || {}, RB.crusher.ui.funnel,RB.crusher)
