var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.funnel = (function(funnel) {

  var crusher = RB.crusher

  funnel.edit = function(funnels, actions) {

    var actions = funnels
      .selectAll(".action")
      .data(function(x){
        return x.actions.map(function(y){
          y.all = actions
          return y
        })
      })

    var newActions = actions
        .enter()
        .append("div").classed("action",true)

    newActions.append("div")
      .style("float","left")
      .text(function(x,i){return "Step " + (i+1) + ": "})

    var select = newActions.append("div")
      .append("select")
      .on("change",function(x){
        var selectedData = d3.selectAll(this.selectedOptions).datum()
        for (var i in x) {
          x[i] = i != "all" ? selectedData[i] : x[i]
        }

        var funnel = d3.select(this.parentNode.parentNode.parentNode) 
        crusher.controller.save_funnel(funnel.datum())

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
  }

  funnel.show = function() {
  
  }

  funnel.add_action = function(target,options) {

    var data = target.datum()
    data.actions = data.actions.concat([{
      "action_id":0,
      "action_name":"",
      "url_pattern":[]
    }])
    funnel.edit(target,options)

  }

  funnel.build = function(data, values, action_data) {
    var target = d3.selectAll(".funnel-wrapper")

    var funnels = target.selectAll(".funnel")
      .data(data)
        .enter()
        .append("div")
        .classed("funnel",true)

    funnels
      .append("h4")
      .text(function(x){return "Funnel: " + x.funnel_name})

    /*
    var actions = funnels
      .selectAll(".action")
      .data(function(x){
        return x.actions.map(function(y){y.values = values; return y})
      })
        .enter()
        .append("div").classed("action",true)

    actions.append("div")
      .style("float","left")
      .text(function(x,i){return "Step " + (i+1) + ": "})
    */
    //crusher.ui.action.show(actions)
    funnel.edit(funnels,action_data)
    
  }

  return funnel
})(RB.crusher.ui.funnel || {})   
