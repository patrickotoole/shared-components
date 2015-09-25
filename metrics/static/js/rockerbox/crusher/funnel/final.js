var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

RB.crusher.ui.funnel.last = (function(last,funnel,crusher) {

  last.NAME = "funnel_last"
  last.SUBSCRIBE = ["funnel_rendered","avails_rendered","domains_rendered","tf_idf_funnel"]
  last.PUBLISH = []
  last.EVENTS = []

  last.subscription = function(data) {
    alert("HERE")
    RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)

  }

  return last

})(RB.crusher.ui.funnel.last || {}, RB.crusher.ui.funnel,RB.crusher)

RB.component.export(RB.crusher.ui.funnel.last, RB.crusher.ui.funnel)
