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

          crusher.controller.get_action_data(y) 

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
