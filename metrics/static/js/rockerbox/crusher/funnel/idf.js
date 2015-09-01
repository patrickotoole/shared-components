var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

RB.crusher.ui.funnel.idf = (function(idf,funnel,crusher) {

  idf.NAME = "idf"
  idf.SUBSCRIBE = ["domains_rendered","tf_idf_funnel"]
  idf.PUBLISH = []
  idf.EVENTS = []

  idf.subscription = function(data) {
    var funnel = crusher.ui.funnel.buildShow()
    crusher.ui.funnel.show.component.domains.bind(false,funnel)(data)

    return data
  }

  return idf

})(
  RB.crusher.ui.funnel.idf || {}, 
  RB.crusher.ui.funnel,
  RB.crusher
)

RB.component.export(RB.crusher.ui.funnel.idf, RB.crusher.ui.funnel)
