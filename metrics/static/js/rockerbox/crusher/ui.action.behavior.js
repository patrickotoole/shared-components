var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  action.show_behavior = function(wrapper) {

    var title = "Before and After",
      series = ["before","after"],
      formatting = "col-md-12",
      description = "What happens to user activity before and after visiting this segment",
      ts = wrapper.selectAll(".ts")

    var target = RB.rho.ui.buildSeriesWrapper(ts, title, series, wrapper.data(), formatting, description)
    
  }

  return action

})(RB.crusher.ui.action || {})  
