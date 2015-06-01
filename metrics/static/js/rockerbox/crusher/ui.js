var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui = (function(ui) {

  var crusher = RB.crusher

  ui.add_funnel = function() {

    var wrapper = d3.selectAll(".add-funnel-wrapper")
    var funnel_wrapper = d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")

    wrapper
      .append("div").classed("button-wrapper",true)
      .append("button")
      .classed("btn btn-xs",true)
      .text("New funnel")
      .on("click",function(x) {
        crusher.controller.new_funnel(funnel_wrapper)
      })
  }

  ui.build = function(dd){
    //ui.add_funnel()
    console.log("building crusher...")   
  } 

  return ui
})(RB.crusher.ui || {})

 

