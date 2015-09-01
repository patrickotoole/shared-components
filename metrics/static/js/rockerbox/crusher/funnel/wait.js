var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}



RB.crusher.ui.funnel.wait = (function(wait,funnel,crusher) {

  wait.NAME = "wait"
  wait.SUBSCRIBE = ["funnel_initialized"]
  wait.PUBLISH = ["funnelUIDs"]
  wait.EVENTS = ["funnel_initialized"]

  wait.subscription = function(data) {
    var funnel = crusher.ui.funnel.buildShow()
    crusher.ui.funnel.wait(funnel)
    return data
  }

  return wait

})(RB.crusher.ui.funnel.wait || {}, RB.crusher.ui.funnel,RB.crusher)

RB.component.export(RB.crusher.ui.funnel.wait, RB.crusher.ui.funnel)
