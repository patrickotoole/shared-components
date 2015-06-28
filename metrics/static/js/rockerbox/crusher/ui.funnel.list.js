var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

RB.crusher.ui.funnel.list = (function(list) {

  list = {
    showList: function(funnel_data, options, selected) {
  
      var target = d3.selectAll(".funnel-list-wrapper")
  
      funnel.list.outer_wrapper(target,options)
      funnel.list.header(target)
  
      var funnelWrapper = funnel.list.wrapper(target) 
      var funnels = funnel.list.funnel(funnelWrapper,funnel_data,selected)
        
      funnel.list.item(funnels) 
      funnel.list.remove(funnels)
      funnel.list.add(target)
  
      return funnels
    },
    outer_wrapper: function(target,data) {
      return target.data([data]) 
    },
    header: function(target) {
      return d3_updateable(target,"h5","h5")
        .text("Advertiser Funnels")
    },
    wrapper: function(target) {
      return d3_updateable(target,".funnel-wrapper","div")
        .classed("list-group funnel-wrapper",true)
    },
    funnel: function(target,data,selected_funnel) {
      return d3_splat(target,".funnel","div",data,function(x){return x.funnel_id})
        .classed("funnel list-group-item",true)
        .on("click",funnel.methods.select)
        .classed("active",function(x) {return x == selected_funnel})
    },
    item: function(target) {
      return d3_updateable(target,".name","span")
        .classed("name",true)
        .text(function(x){return x.funnel_name})
    },
    add: function(target) {
      var wrapper = d3_updateable(target,".add-funnel-wrapper","div")
        .classed("add-funnel-wrapper",true) 

      var funnel_wrapper = d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")

      var bw = d3_updateable(wrapper,".button-wrapper","div")
        .classed("button-wrapper",true)

      d3_updateable(bw,".btn","button")
        .classed("btn btn-xs",true)
        .text("New funnel")
        .on("click", crusher.controller.funnel.new.bind(this,funnel_wrapper))
      
      return wrapper
    },
    remove: function(target) {
      var wrapper = d3_updateable(target,".remove-funnel","div")
        .classed("remove-funnel",true)

      d3_updateable(wrapper,".btn","button")
        .classed("btn btn-xs btn-danger",true)
        .text("remove")
        .on("click",function(x){
          d3.event.stopPropagation()
          var funnel_wrapper = d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")
          var selected_funnel = funnel_wrapper.selectAll(".funnel").datum()
          
          var parent_data = d3.select(this.parentNode.parentNode.parentNode).selectAll(".funnel").data()
          var funnel = d3.select(this.parentNode.parentNode)
          crusher.controller.funnel.delete(x,parent_data,funnel)

          if (x == selected_funnel) crusher.controller.funnel.new(funnel_wrapper)

        })

      return wrapper
    }
  }

  return list
})(RB.crusher.ui.funnel.list || {})   
