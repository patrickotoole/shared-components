var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui = (function(ui) {

  var crusher = RB.crusher

  ui.build = function(){
    var targets = d3.selectAll(".action-wrapper").selectAll(".action")
      .data([{"values":["a","b","c"]}])
      .enter()
        .append("div")
        .classed("action",true) 

    ui.action.build(targets)
    console.log("building crusher...")   
  } 

  return ui
})(RB.crusher.ui || {})

 

