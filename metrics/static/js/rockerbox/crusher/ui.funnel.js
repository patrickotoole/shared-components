var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.funnel = (function(funnel) {

  var crusher = RB.crusher

  funnel.edit = function(funnels, options) {

    var settings = funnels.append("div").classed("settings",true)

    funnel.edit.component.name(settings) 
    var actions = funnel.edit.component.actions(settings)
    var newAction = funnel.edit.component.action(actions, options)
      .append("div").classed("input-group input-group-sm",true)
    
    funnel.edit.component.step(newAction)
    funnel.edit.component.select(newAction) 
    funnel.edit.component.remove(newAction,options) 
    
    //funnel.edit.component.add_action(settings,options)
    funnel.edit.component.compute_funnel(settings,options) 
    //funnel.edit.component.remove_funnel(settings)  

  }

  funnel.show = function(funnels) {
    
    var reduced = funnel.show.component.steps(funnels)
    var domains_callback = funnel.show.component.domains.bind(false,funnels)

    crusher.controller.get_domains(reduced,domains_callback)

  }

  funnel.methods = {
    add_action: function(target,options) {

      var parentTarget = d3.select(target.node().parentNode.parentNode),
        data = target.datum()

      data.actions = data.actions.concat([{
        "action_id":0,
        "action_name":"",
        "url_pattern":[]
      }])
      funnel.edit(parentTarget,options)

    },
    add_funnel: function(target) {

      var action_data = target.data()[0]

      var data = target.selectAll(".funnel").data()
      data = data.concat([{"funnel_name":"named","actions":[]}])

      var newFunnel = target.selectAll(".funnel").data(data)
        .enter()
        .append("div").classed("funnel",true)

      newFunnel
        .append("h4")
        .text(function(x){return x.funnel_name})

      funnel.edit(newFunnel,action_data)

    },
    compute_uniques: function(actions) {
      return actions.reduce(function(p,c){
        
        var intersected = []

        if (p == false) { intersected = c.uids } 
        else {
          c.uids.map(function(x){
            if (p.indexOf(x) > -1) intersected.push(x)
          })
        }
        
        c.funnel_percent = p == false ? 1 : (intersected.length / p.length)
        c.funnel_uids = intersected
        c.funnel_count = c.funnel_uids.length

        return c.funnel_uids
      }, false)                   
    }
  } 

  funnel.edit.component = {
    name: function(funnels){

      var group = funnels.append("div")
        .classed("input-group input-group-sm",true)

      group.append("span").classed("input-group-addon",true).text("Funnel name")

      group.append("input").classed("form-control",true)
        .attr("value",function(x){return x.funnel_name})
    },
    compute_funnel: function(funnels){
      funnels.selectAll(".compute-funnel-wrapper")
        .data(function(x){return [x]})
        .enter()
          .append("div").classed("compute-funnel-wrapper",true)
          .append("button")
          .classed("btn btn-sm btn-success",true)
          .text("Compute Funnel")
          .on("click",function(){
            var funnels = d3.select(this.parentElement.parentElement.parentElement)
              .selectAll(".show")
              .data(function(x){return [x]})

            funnels.enter().append("div").classed("show",true)
            funnel.show(funnels)
          })
    },
    add_action: function(funnels,options) {

      funnels.selectAll(".button-wrapper")
        .data(function(x){return [x]})
        .enter()
          .append("div").classed("button-wrapper",true)
          .append("button")
          .classed("btn btn-xs",true)
          .text("Add funnel action")
          .on("click",function(x){
            crusher.controller.new_funnel_action(d3.select(this),options)
          }) 
         
    },
    remove_funnel: function(funnels){

      funnels.selectAll(".remove-funnel")
        .data(function(x){return [x]})
        .enter()
          .append("div").classed("remove-funnel",true)
          .append("button")
          .classed("btn btn-xs btn-danger",true)
          .text("remove")
          .on("click",function(x){
            var parent_data = d3.select(this.parentNode.parentNode.parentNode).selectAll(".funnel").data()
            var funnel = d3.select(this.parentNode.parentNode)
            crusher.controller.funnel.delete(x,parent_data,funnel)
          }) 
       
    },
    actions: function(funnels) {

      var funnel_actions = funnels
        .selectAll(".actions")
        .data(function(x){return [x]})
        
      funnel_actions
        .enter()
        .append("div").classed("actions action-steps row",true)

      return funnel_actions
    },
    action: function(actions,options) {
      var action = actions
        .selectAll(".action")
        .data(function(x){
          console.log(x)
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
        .append("div").classed("action col-md-12",true)
         
    },
    step: function(newAction) {
      newAction.append("span")
        .classed("step input-group-addon",true)
        .text(function(x,i){return "Step " + (i+1) + ": "})
    },
    select: function(newAction) {

      var select = newAction
        .append("select")
        .classed("form-control",true)
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
    remove: function(newAction,actions) {
      newAction.append("span")
        .classed("input-group-btn",true)
        .append("button")
        .classed("btn btn-xs btn-danger",true)
        .html("&ndash;")
        .on("click",function(x){
          var funnels = d3.select(this.parentNode.parentNode.parentNode.parentNode.parentNode)
          var funnel_datum = funnels.datum()
          var data = d3.select(this).datum()
          
          funnel_datum.actions = funnel_datum.actions.filter(function(x){return x != data})

          crusher.controller.save_funnel(funnel_datum) 
          funnel.edit(funnels,actions)

        })

      newAction.append("span")
        .classed("input-group-btn",true)
        .append("button")
        .classed("btn btn-xs btn-primary",true)
        .text("+")
        .on("click",function(x){
          var funnels = d3.select(this.parentNode.parentNode.parentNode.parentNode.parentNode)
          var funnel_datum = funnels.datum()
          var data = d3.select(this).datum()
          
          funnel_datum.actions = funnel_datum.actions.filter(function(x){return x != data})

          crusher.controller.save_funnel(funnel_datum) 
          funnel.edit(funnels,actions)

        }) 
    }
  } 

  

  funnel.show.component = {
    step_chart: function(funnels){
      
      var data = funnels.datum().actions

      var targetWidth = funnels.style("width").replace("px","")
      
      var margin = {top: 20, right: 20, bottom: 30, left: 40},
        width = targetWidth - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;
  
      var x = d3.scale.ordinal().rangeRoundBands([0, width], .1);
      var y = d3.scale.linear().range([height, 0]);
      var xAxis = d3.svg.axis().scale(x).orient("bottom");
  
      var yAxis = d3.svg.axis().scale(y).orient("left").ticks(10);

      var svg = funnels.selectAll("svg.steps")
        .data(function(x){return [x]})

      svg
        .enter()
          .append("svg")
            .attr("class","steps")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      x.domain(data.map(function(d) { return d.action_name; }));
      y.domain([0, d3.max(data, function(d) { return d.funnel_count; })]);

      xax = svg.selectAll(".x.axis")
        .data(function(x){return [x]})

      xax
        .enter()
        .append("g")

      xax
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("Users");

      var bar = svg.selectAll(".bar")
          .data(data,function(x){return x.action_name})

      bar
        .enter().append("rect")

      bar
          .attr("class", "bar")
          .attr("x", function(d) { return x(d.action_name); })
          .attr("width", x.rangeBand())
          .attr("y", function(d) { return y(d.funnel_count); })
          .attr("height", function(d) { return height - y(d.funnel_count); }); 

      var text = svg.selectAll("text")
          .data(data,function(x){return x.action_name})
 
      text
        .enter().append("text")

      text
        .attr("x", function(d) { return x(d.action_name) + x.rangeBand()/2 - 20 }) 
        .attr("y", function(d) { return y(d.funnel_count) + 13 } )
        .attr("dy", ".35em")
        .text(function(d) { return d3.format(",")(d.funnel_count) + " " + d3.format("%.2")(d.funnel_percent); });
      
      bar.exit().remove()

    },
    steps: function(funnels) {

      var data = funnels.datum(),
        reduced = funnel.methods.compute_uniques(data.actions)

      /*
      var steps = funnels.selectAll(".steps")
        .data(function(x){return [x]})

      steps.enter()
        .append("div").classed("steps",true)

      funnel.show.component.step(steps)
      */
      funnel.show.component.step_chart(funnels.append("div").classed("col-md-12 step-chart",true)) 

      return reduced
    },
    step: function(steps) {
      var step = steps.selectAll(".step")
        .data(function(x){return x.actions})

      step.enter()
        .append("div").classed("step",true)
        .text(function(x,i){return "Step " + (i+1) + ": " + x.funnel_count}) 

      step
        .text(function(x,i){return "Step " + (i+1) + ": " + x.funnel_count})   
    },
    domain_chart: function(funnels,data) {
      var targetWidth = funnels.style("width").replace("px","") 
      
      var width = targetWidth,
          barHeight = 15;
      
      var x = d3.scale.linear()
          .range([0, width-150]);
      
      var chart = funnels.selectAll("svg.domain-chart")
          .data([data])

      chart
          .enter()
            .append("svg")
            .attr("class","domain-chart")
            .attr("width", width);

      x.domain([0, d3.max(data, function(d) { return d.uid; })]);
    
      chart.attr("height", barHeight * data.length);
    
      var bar = chart.selectAll("g")
          .data(function(x){return x})
        .enter().append("g")
          .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; });
    
      bar.append("rect")
          .attr("class","bar")
          .attr("width", function(d) { return x(d.uid); })
          .attr("height", barHeight - 1);
    
      bar.append("text")
          .attr("x", function(d) { return x(d.uid) + 3; })
          .attr("y", barHeight / 2)
          .attr("dy", ".35em")
          .text(function(d) { return d.domain + " (" + d.uid + ")"; }); 

    },
    domains: function(funnels,data) {
      
      var data = data.map(function(x){
        var pop_domain = RB.crusher.pop_domains[x.domain] || {}
        var idf = pop_domain.idf || 12
        x.wuid =  idf * x.uid
        return x
      }).sort(function(x,y){
        return y.wuid - x.wuid
      }).slice(0,25)

      /*
      var domains = funnels.selectAll(".domains")
        .data([data])

      domains.enter()
        .append("div").classed("domains",true)

      funnel.show.component.domain(domains) 
      */
      var domain_chart = funnels.selectAll("domain-chart").data(function(x){return [x]})
      domain_chart.enter()
        .append("div").classed("col-md-12 domain-chart",true)
      funnel.show.component.domain_chart(domain_chart,data)
      
    },
    domain: function(domains) {
      var domain = domains.selectAll(".domain")
        .data(function(x){return x})

      domain.enter()
        .append("div")
        .classed("domain",true)
        .text(JSON.stringify)
      
      domain.text(JSON.stringify) 
        .sort(function(x,y){ return y.uid - x.uid})

      domain.exit().remove()
    }
  }

  funnel.showList = function(funnel_data,action_data) {
    var target = d3.selectAll(".funnel-list-wrapper")
    target.data([action_data])

    target.append("h5").text("Advertiser Funnels")

    var funnelWrapper = target.append("div")
      .classed("list-group funnel-wrapper",true)

    var funnels = funnelWrapper.selectAll(".funnel")
      .data(funnel_data)

    funnels
      .enter()
      .append("div")

    funnels
      .classed("funnel list-group-item",true)
      .text(function(x){return x.funnel_name})

    funnel.edit.component.remove_funnel(funnels)   
     
  }

  funnel.build = function(funnel_data, action_data) {
    var target = d3.selectAll(".funnel-wrapper")
    target.data([action_data])

    var funnels = target.selectAll(".funnel")
      .data(funnel_data)
        .enter()
        .append("div")
        .classed("funnel",true)

    funnels
      .append("h5")
      .text("Edit a funnel")
    
    funnel.edit(funnels,action_data)

    funnel.showList(funnel_data,action_data)
    
  }

  funnel.buildBase = function() {
   var funnelRow = d3.selectAll(".container")
      .append("div")
      .classed("row funnels",true)

    funnelRow
      .append("div")
      .classed("funnel-view-wrapper col-md-6",true)
      .append("div")
      .classed("funnel-wrapper ",true)

    funnelRow
      .append("div")
      .classed("funnel-list-wrapper col-md-6",true)
      
     
    funnelRow
      .append("div")
      .classed("add-funnel-wrapper col-md-12",true)
     
  }

  

  funnel.add_action = funnel.methods.add_action
  funnel.add_funnel = funnel.methods.add_funnel
   

  return funnel
})(RB.crusher.ui.funnel || {})   
