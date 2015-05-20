var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui = (function(ui) {

  var crusher = RB.crusher

  ui.add_action = function(dd) {
    var wrapper = d3.selectAll(".action-wrapper")

    d3.select(wrapper.node().parentNode)
      .append("div").classed("button-wrapper",true)
      .append("button")
      .classed("btn btn-xs",true)
      .text("New action")
      .on("click",crusher.controller.new_action.bind(this,wrapper,dd))
  }

  ui.build = function(dd){
    ui.add_action(dd)
    console.log("building crusher...")   
  } 

  return ui
})(RB.crusher.ui || {})

 

