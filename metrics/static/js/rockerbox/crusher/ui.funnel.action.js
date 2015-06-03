var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

RB.crusher.ui.funnel.action = (function(action){
  var funnel = RB.crusher.ui.funnel,
    crusher = RB.crusher;
  
  action.build = function(settings,options){

    var actions_wrapper = action.wrapper(settings)
    var group = action.row(actions_wrapper)
    
    action.step(group,options)
    action.select(group,options)
    action.add(group,options)
    action.remove(group,options)
  }

  action.wrapper = function(settings) {
    var actions_wrapper = settings.selectAll(".actions-wrapper").data(function(d){return [d]})
    actions_wrapper.enter().append("div").classed("actions-wrapper",true)

    return actions_wrapper
  }

  action.row = function(actions_wrapper) {
    var a = actions_wrapper.selectAll(".action")
      .data(
        function(x){ 
          x.actions.map(function(ac,i){ac.pos = i})
          return x.actions 
        },
        function(x){ return x.action_id} 
      )

    a.enter().append("div").classed("action col-md-12",true)
    a.exit().remove()
    a.sort(function(x,y){return x.pos - y.pos})

    var group = a.selectAll(".input-group")
      .data(function(x){return [x]},function(x){ return x.action_id})

    group.enter()
      .append("div").classed("input-group input-group-sm",true)

    return group
  }

  action.step = function(newAction){
    var steps = newAction.selectAll("span.step")
      .data(function(d){return [d]})

    steps.enter()
      .append("span").classed("step input-group-addon",true)

    steps.text(function(x,i){return "Step " + (x.pos) + ": "})
  }

  action.select = function(newAction,options){

    var onUpdate = function(x){
      var selectedData = d3.selectAll(this.selectedOptions).datum()
      for (var i in x) { x[i] = i != "all" ? selectedData[i] : x[i] }
    } 

    var select = newAction.selectAll("select").data(function(x){return [x]})


    select.enter()
      .append("select")
      .attr("data-width","100%")
      .attr("data-live-search","true")
      .attr("title","Choose an action for this step..")
      .on("change",onUpdate)

    select.selectAll("option")
      .data(options)
      .enter()
        .append("option")
        .attr("value",function(x){return x.id})
        .text(function(x){return x.action_name})
        .attr("selected", function(x){
          var data = d3.select(this.parentNode).datum()
          return x.action_name == data.action_name ? "selected" : null
        })

    var pickers = select.map(function(x){return x[0]}) 
    $(pickers).selectpicker()
  }

  action.add = function(newAction,options) {

    var add = newAction.selectAll("span.add").data(function(x){return [x]})

    add.enter()
      .append("span")
      .classed("add input-group-btn",true)
      .append("button")
      .classed("btn btn-xs btn-primary",true)
      .text("+")
      .on("click",function(x){
        var actions = d3.select(this.parentElement.parentElement.parentElement.parentElement)
        funnel.methods.add_action(actions,options,x)
      }) 
  }
  
  action.remove = function(newAction,actions) {

    var remove = newAction.selectAll("span.remove").data(function(x){return [x]})

    remove.enter()
      .append("span")
      .classed("remove input-group-btn",true)
      .append("button")
      .classed("btn btn-xs btn-danger",true)
      .html("&ndash;")
      .on("click",function(x){
        var actions = d3.select(this.parentElement.parentElement.parentElement.parentElement)
        funnel.methods.remove_action(actions,x) 
      })
  }


  return action

})(RB.crusher.ui.funnel.action || {})

