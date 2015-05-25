var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui = (function(ui) {

  var crusher = RB.crusher

  ui.add_funnel = function(dd) {

    var wrapper = d3.selectAll(".add-funnel-wrapper")
    var funnel_wrapper = d3.selectAll(".funnel-wrapper")

    wrapper
      .append("div").classed("button-wrapper",true)
      .append("button")
      .classed("btn btn-xs",true)
      .text("New funnel")
      .on("click",function(x) {
        crusher.controller.new_funnel(funnel_wrapper)
      })
  }

  

  ui.compute_funnel = function(){

    var funnel_wrapper = d3.selectAll(".funnel-wrapper") 

    funnel_wrapper
      .append("div").classed("button-wrapper",true)
      .append("button")
      .classed("btn btn-xs",true)
      .text("Compute Funnel")
      .on("click",crusher.ui.funnel.show)
  }
 

  ui.add_action = function(dd) {
    var wrapper = d3.selectAll(".add-action-wrapper")
    var action_wrapper = d3.selectAll(".action-wrapper") 

    wrapper
      .append("div").classed("button-wrapper",true)
      .append("button")
      .classed("btn btn-xs",true)
      .text("New action")
      .on("click",crusher.controller.new_action.bind(this,action_wrapper,dd))
  }

  ui.build = function(dd){
    ui.add_action(dd)
    ui.add_funnel()
    console.log("building crusher...")   
  } 

  return ui
})(RB.crusher.ui || {})

 

