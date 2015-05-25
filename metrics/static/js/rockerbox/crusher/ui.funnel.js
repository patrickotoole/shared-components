var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.funnel = (function(funnel) {

  var crusher = RB.crusher

  funnel.edit = function(funnels, options) {

    var actions = funnel.edit.component.actions(funnels)
    var newAction = funnel.edit.component.action(actions, options)
    
    funnel.edit.component.step(newAction)
    funnel.edit.component.select(newAction) 
    funnel.edit.component.remove(newAction) 

  }

  funnel.edit.component = {
    actions: function(funnels) {

      var funnel_actions = funnels
        .selectAll(".actions")
        .data(function(x){return [x]})
        
      funnel_actions
        .enter()
        .append("div").classed("actions",true)

      return funnel_actions
    },
    action: function(actions,options) {
      var action = actions
        .selectAll(".action")
        .data(function(x){
          return x.actions.map(function(y){
            y.all = options
            crusher.controller.get_action_data(y) 
            return y
          })
        },function(x){return x.action_id})

      action.exit().remove()

      action.select(".step")
        .text(function(x,i){return "Step " + (i+1) + ": "}) 

      return action
        .enter()
        .append("div").classed("action",true)
         
    },
    step: function(newAction) {
      newAction.append("div")
        .classed("step",true)
        .style("float","left")
        .text(function(x,i){return "Step " + (i+1) + ": "})
    },
    select: function(newAction) {

      var select = newAction.append("div")
        .append("select")
        .on("change",function(x){
          var selectedData = d3.selectAll(this.selectedOptions).datum()
          for (var i in x) {
            x[i] = i != "all" ? selectedData[i] : x[i]
          }

          crusher.controller.get_action_data(x)

          var funnel = d3.select(this.parentNode.parentNode.parentNode) 
          var funnel_datum = funnel.datum()
          crusher.controller.save_funnel(funnel_datum)
        })
      
      select.selectAll("option")
        .data(function(x){return x.all})
        .enter()
          .append("option")
          .attr("value",function(x){return x.id})
          .text(function(x){return x.action_name})
          .attr("selected", function(x){
            var data = d3.select(this.parentNode).datum()
            return x.action_name == data.action_name ? "selected" : null
          })
       
    },
    remove: function(newAction) {
      newAction.append("div")
        .text("remove")
        .on("click",function(x){
          var funnel_datum = d3.select(this.parentNode.parentNode).datum()
          var data = d3.select(this).datum()
          
          funnel_datum.actions = funnel_datum.actions.filter(function(x){return x != data})

          crusher.controller.save_funnel(funnel_datum) 
          funnel.edit(funnels,actions)

        })
    }
  } 

  funnel.show = function() {
    var f = d3.selectAll(".funnel-wrapper").selectAll(".funnel") 
    var data = f.datum()

    var reduced = data.actions.reduce(function(p,c){
      
      var intersected = []

      if (p == false) {
        intersected = c.uids
      } else {
        c.uids.map(function(x){
          if (p.indexOf(x) > -1) intersected.push(x)
        })
      }
      
      c.funnel_uids = intersected
      c.funnel_count = c.funnel_uids.length

      return c.funnel_uids
    }, false)

    var display = d3.selectAll(".funnel-display").selectAll(".step")
      .data(data.actions)

    display
      .enter()
        .append("div")
        .classed("step",true)
        .text(function(x,i){return "Step " + (i+1) + ": " + x.funnel_count})

    display
      .text(function(x,i){return "Step " + (i+1) + ": " + x.funnel_count})

    crusher.controller.get_domains(reduced,funnel.show_domains)
    
  }

  funnel.show_domains = function(domains) {
    var domains = d3.selectAll(".funnel-domain-display").selectAll(".domain")
      .data(domains)

    domains.enter()
      .append("div")
      .classed("domain",true)
      .text(JSON.stringify)
      //.text(function(x){return x.domain})
    
    domains
      .text(JSON.stringify) 
      .sort(function(x,y){ return y.uid - x.uid})

    domains.exit()
      .remove()
     
  }

  funnel.add_action = function(target,options) {

    var parentTarget = d3.select(target.node().parentNode.parentNode)

    var data = target.datum()
    data.actions = data.actions.concat([{
      "action_id":0,
      "action_name":"",
      "url_pattern":[]
    }])
    funnel.edit(parentTarget,options)

  }

  funnel.add_action_button = function(funnel,dd) {

    funnel.selectAll(".button-wrapper")
      .data(function(x){return [x]})
      .enter()
        .append("div").classed("button-wrapper",true)
        .append("button")
        .classed("btn btn-xs",true)
        .text("New funnel action")
        .on("click",function(x){
          crusher.controller.new_funnel_action(d3.select(this),dd)
        }) 
    
  }

  funnel.add_funnel = function(target) {

    var action_data = target.data()[0]

    var data = target.selectAll(".funnel").data()
    data = data.concat([{"funnel_name":"named","actions":[]}])

    var newFunnel = target.selectAll(".funnel").data(data)
      .enter()
      .append("div").classed("funnel",true)

    newFunnel
      .append("h4")
      .text(function(x){return x.funnel_name})

    funnel.edit(newFunnel,[{"actions":[]}])
    funnel.add_action_button(newFunnel,action_data)

  }


  funnel.build = function(data, values, action_data) {
    var target = d3.selectAll(".funnel-wrapper")
    target.data([action_data])

    var funnels = target.selectAll(".funnel")
      .data(data)
        .enter()
        .append("div")
        .classed("funnel",true)

    funnels
      .append("h4")
      .text(function(x){return "Funnel: " + x.funnel_name})
    
    funnel.edit(funnels,action_data)
    funnel.add_action_button(funnels,action_data)
    
  }

  return funnel
})(RB.crusher.ui.funnel || {})   
