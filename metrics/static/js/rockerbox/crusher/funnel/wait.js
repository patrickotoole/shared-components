var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

var register = function(components, name, subscriptions, callback, publish) {

  components[name] = {
    "name":name,
    "subscribe": subscriptions,
    "callback": callback,
    "publish": publish
  }
  return components

}

RB.crusher.ui.funnel.wait = (function(wait,funnel,crusher) {

  wait.NAME = "wait"
  wait.SUBSCRIBE = ["funnel_show"]
  wait.PUBLISH = ["funnelUIDs"]

  wait.subscription = function(data) {
    var funnel = crusher.ui.funnel.buildShow()
    crusher.ui.funnel.wait(funnel)
    return data
  }

  funnel.components = (function(components) {
    return register(
      components,
      wait.NAME,
      wait.SUBSCRIBE, 
      wait.subscription,
      wait.PUBLISH
    )
  })(funnel.components || {})

})(RB.crusher.ui.funnel.wait || {}, RB.crusher.ui.funnel,RB.crusher)
