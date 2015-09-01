var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

RB.crusher.ui.funnel.init = (function(init,funnel,crusher) {

  init.NAME = "init"
  init.SUBSCRIBE = ["funnel_all","actions","funnels","campaigns","lookalikes","lookalikeCampaigns"]
  init.PUBLISH = ["funnel_initialized"]

  init.subscription = function(funnel) {

    crusher.permissions("retargeting",crusher.api.helpers.attachCampaigns)
    crusher.permissions("lookalike",crusher.api.helpers.attachLookalikes)

    var data = crusher.cache.funnelData 
    if (funnel.funnel_id) {
      data = data.filter(function(x){return x.funnel_id == funnel.funnel_id})
    }

    crusher.ui.funnel.buildEdit(data,crusher.cache.actionData)
    var funnel = crusher.ui.funnel.buildShow()
    var data = funnel.datum()

    return data
  }

  funnel.events = (function(events){
    events["funnel_all"] = true
    events["funnel_initialized"] = true
    return events
  })(funnel.events || {})



  funnel.components = (function(components) {
    return register(
      components,
      init.NAME,
      init.SUBSCRIBE, 
      init.subscription,
      init.PUBLISH
    )
  })(funnel.components || {})

})(RB.crusher.ui.funnel.init || {}, RB.crusher.ui.funnel,RB.crusher)

