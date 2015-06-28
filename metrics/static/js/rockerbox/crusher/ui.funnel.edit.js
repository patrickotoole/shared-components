var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.funnel = (function(funnel) {

  var crusher = RB.crusher

  funnel.edit = function(funnels, options) {

    funnel.edit.component.header(funnels)

    var settings = funnel.edit.component.settings(funnels) 

    funnel.edit.component.name(settings) 
    funnel.action.build(settings,options)
    funnel.edit.component.compute_funnel(settings,options) 

    if (funnels[0].length && funnels.datum().actions.length == 0) 
      funnel.methods.add_action(settings,options,{}) 

  }

  funnel.edit.component = {
    header: function(funnels) {
      return d3_updateable(funnels,"h5","h5").text(function(x){
        return x.funnel_id ? "Edit a funnel" : "Create a funnel"
      })
    },
    settings: function(funnels) {
      return d3_updateable(funnels,".settings","div")
        .classed("settings col-md-12",true)
    },
    name: function(funnels){
      var newGroup = d3_updateable(funnels,".funnel-name")
        .classed("funnel-name input-group input-group-sm",true)

      d3_updateable(newGroup,".input-group-addon","span")
        .classed("input-group-addon",true).text("Funnel name")

      d3_updateable(newGroup,".form-control.funnel-name","input")
        .classed("form-control funnel-name",true)
        .property("value",function(x){return x.funnel_name})
    },
    compute_funnel: function(funnels){

      wrapper = funnels.selectAll(".compute-funnel-wrapper")
        .data(function(x){return [x]},function(x){console.log(x); return x.funnel_id})

      wrapper
        .enter()
          .append("div").classed("compute-funnel-wrapper",true)

      d3_updateable(wrapper,".btn-success","button")
        .classed("btn btn-sm btn-success",true)
        .text("Save Funnel")
        .on("click",funnel.methods.save_funnel)

      d3_updateable(wrapper,".btn-danger","button")
        .classed("btn btn-sm btn-danger pull-right",true)
        .text("DELETE Funnel")
        .on("click",function(x){
          var parent_data = crusher.cache.funnelData 
          crusher.controller.funnel.delete(x,parent_data,d3.select(funnels.node().parentNode))
          
          RB.routes.navigation.back()
        })

      wrapper.exit().remove()
     

    }
  } 
 
  return funnel
})(RB.crusher.ui.funnel || {})   
