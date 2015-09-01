var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

RB.crusher.ui.funnel.avails = (function(avails,funnel,crusher) {

  avails.NAME = "avails"
  avails.SUBSCRIBE = ["funnel_rendered","funnelAvails"]
  avails.PUBLISH = ["avails_rendered"]

  avails.subscription = function(data) {
    var funnel = crusher.ui.funnel.buildShow()
    var exchanges = funnel.selectAll(".exchange-summary .exchange")

    var funnel = crusher.ui.funnel.buildShow(),
      is_retargeting = crusher.permissions.bind(false,"retargeting"),
      render_retargeting = crusher.ui.funnel.show.component.campaign.bind(false,funnel)
    
    is_retargeting(render_retargeting)
    crusher.ui.funnel.show.component.avails(exchanges) 
    return data
  }

  funnel.components = (function(components) {
    return register(
      components,
      avails.NAME,
      avails.SUBSCRIBE, 
      avails.subscription,
      avails.PUBLISH
    )
  })(funnel.components || {})

})(RB.crusher.ui.funnel.avails || {}, RB.crusher.ui.funnel,RB.crusher)
