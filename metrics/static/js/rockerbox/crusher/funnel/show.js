var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

RB.crusher.ui.funnel.show = (function(show,funnel,crusher) {

  show.NAME = "show"
  show.SUBSCRIBE = ["funnelUIDs"]
  show.PUBLISH = ["funnel_rendered","funnelAvails","funnelDomains"]
  show.EVENTS = ["funnel_rendered"]

  show.subscription = function(data) {
    console.log("S:",data.funnel_name) 
    var funnel = crusher.ui.funnel.buildShow()
    crusher.ui.funnel.show(funnel)
    return data
  }

  return show
  
})(RB.crusher.ui.funnel.show || {}, RB.crusher.ui.funnel,RB.crusher)

RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
