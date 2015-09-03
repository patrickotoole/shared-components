var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

RB.crusher.ui.funnel.init = (function(init,funnel,crusher) {

  init.NAME = "init"
  init.SUBSCRIBE = ["funnel_all","actions","funnels","campaigns","lookalikes","lookalikeCampaigns"]
  init.PUBLISH = ["funnel_initialized"]
  init.EVENTS = ["funnel_all","funnel_initialized"]

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

  return init
  
})(RB.crusher.ui.funnel.init || {}, RB.crusher.ui.funnel,RB.crusher)

RB.component.export(RB.crusher.ui.funnel.init, RB.crusher.ui.funnel)
