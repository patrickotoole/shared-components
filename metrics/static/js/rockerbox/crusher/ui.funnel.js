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
    funnel.edit.component.add(newAction,options) 
     
    funnel.edit.component.compute_funnel(settings,options) 

  }

  funnel.show = function(funnels) {
    
    var summary = funnels.selectAll(".summary").data(function(x){return [x]})
    summary.enter().append("div").classed("col-md-12 summary",true)

    var reduced = funnel.show.component.steps(funnels)
    funnel.show.component.summary(funnels)

    var domains_callback = funnel.show.component.domains.bind(false,funnels)

    crusher.controller.get_domains(reduced,domains_callback)

  }

  funnel.methods = {
    remove_action: function(actions,action) {
      var data = actions.datum()

      data.actions = data.actions.filter(function(x){
        return x.action_id != action.action_id
      })

      actions.selectAll(".action").filter(function(x){
        return x.action_id == action.action_id
      }).remove()

      actions.selectAll("span.step")
        .text(function(x,i){return "Step " + (i+1) + ": "}) 
    },
    add_action: function(actions,options,current) {


      var data = actions.datum()
      data.actions = data.actions.filter(function(x){return x.action_id != 0})
      actions.selectAll(".action").data(data.actions,function(x){return x.action_id}).exit().remove()

      var current = data.actions.indexOf(current) + 1
      data.actions.splice(current,0, {
        "action_id":0,
        "action_name":"",
        "url_pattern":[]
      })           

      data.actions.map(function(x,i){x.pos = i})

      actions.datum(data)
      var newAction = funnel.edit.component.action(actions, options)
        .append("div").classed("input-group input-group-sm",true)
      
      funnel.edit.component.step(newAction)
      funnel.edit.component.select(newAction) 
      funnel.edit.component.remove(newAction,options) 
      funnel.edit.component.add(newAction,options) 

      actions.selectAll(".action").sort(function(x,y){return x.pos - y.pos})
     
    },
    add_funnel: function(target) {

      var action_data = target.selectAll(".funnel").datum().actions[0].all
      var data = [{"funnel_name":"named","actions":[]}]

      var newFunnel = target.selectAll(".funnel").data(data,function(x){return x.funnel_id})

      newFunnel
        .enter()
        .append("div").classed("funnel",true)

      newFunnel
        .append("h4")
        .text(function(x){return x.funnel_name})

      newFunnel.exit().remove()

      funnel.edit(newFunnel,action_data)
      funnel.methods.add_action(newFunnel.selectAll(".actions"),action_data,{})

    },
    save_funnel: function(target) {
      var name = target.selectAll("input.funnel-name").property("value")
      var data = target.datum()

      data.funnel_name = name

      d3.selectAll(".funnel-list-wrapper")
        .selectAll(".funnel.list-group-item")
        .selectAll(".name")
        .text(function(x){return x.funnel_name})

      return data
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

      group.append("input").classed("form-control funnel-name",true)
        .attr("value",function(x){return x.funnel_name})
    },
    compute_funnel: function(funnels){
      funnels.selectAll(".compute-funnel-wrapper")
        .data(function(x){return [x]})
        .enter()
          .append("div").classed("compute-funnel-wrapper",true)
          .append("button")
          .classed("btn btn-sm btn-success",true)
          .text("Save Funnel")
          .on("click",function(){
            var this_funnel = d3.select(this.parentElement.parentElement.parentElement)
            var funnels = this_funnel 
              .selectAll(".show")
              .data(function(x){return [x]})

            funnels.enter().append("div").classed("show",true)
            crusher.controller.funnel.show(funnels.datum(),funnel.show.bind(false,funnels))

            var funnel_datum = funnel.methods.save_funnel(this_funnel)
            crusher.controller.save_funnel(funnel_datum)

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
            //crusher.controller.get_action_data(y) 
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
        //.classed("form-control",true)
        .attr("data-width","100%")
        .attr("data-live-search","true")
        .attr("title","Choose an action for this step..")
        .on("change",function(x){
          var selectedData = d3.selectAll(this.selectedOptions).datum()

          for (var i in x) { x[i] = i != "all" ? selectedData[i] : x[i] }

          //var this_funnel = d3.select(this.parentNode.parentNode.parentNode.parentNode.parentNode) 
          //var funnel_datum = funnel.methods.save_funnel(this_funnel)
          //crusher.controller.save_funnel(funnel_datum)

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

      $("select").selectpicker()
       
    },
    remove: function(newAction,actions) {
      newAction.append("span")
        .classed("input-group-btn",true)
        .append("button")
        .classed("btn btn-xs btn-danger",true)
        .html("&ndash;")
        .on("click",function(x){
          var f = d3.select(this.parentNode.parentNode.parentNode.parentNode.parentNode) 
          var funnel_datum = funnel.methods.save_funnel(f)

          var actions = d3.select(this.parentElement.parentElement.parentElement.parentElement)
          funnel.methods.remove_action(actions,x) 
          
          crusher.controller.save_funnel(funnel_datum)

        })
    },
    add: function(newAction,options) {

      newAction.append("span")
        .classed("input-group-btn",true)
        .append("button")
        .classed("btn btn-xs btn-primary",true)
        .text("+")
        .on("click",function(x){
          var actions = d3.select(this.parentElement.parentElement.parentElement.parentElement)
          funnel.methods.add_action(actions,options,x)
        }) 
    }
  } 

  

  funnel.show.component = {

    summary: function(funnels) {
      var funnels = funnels.selectAll(".summary").data(function(x){return [x]})
      funnels.enter().append("div").classed("summary",true)

      var h5 = funnels.selectAll("h5").data(function(x){return [x]})
      h5.enter().append("h5")
      h5.text("Funnel details")

      var summary = funnels.selectAll(".summary").data(function(x){return [x]})
      summary.enter().append("div").classed("summary",true)
      
      var conversion_rate = summary.selectAll(".conversion-rate").data(function(x){return [x]})
      conversion_rate.enter().append("div").classed("conversion-rate",true)
      conversion_rate.text(function(x){
        var first = x.actions[0].uids.length 
        var last = x.actions[x.actions.length-1].funnel_uids.length
        return "Conversion Rate: " + d3.format("%")(last/first) 
      })
      
    },
    step_chart: function(funnels){

      var title = funnels.selectAll("h5.steps")
        .data(function(x){return [x]})
      title.enter().append("h5").classed("steps",true)
      title.text("Conversion funnel")
      
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

      var stepsWrapper = funnels.selectAll(".step-chart").data(function(x){return [x]})

      stepsWrapper.enter()
        .append("div").classed("col-md-12 step-chart",true) 

      funnel.show.component.step_chart(stepsWrapper) 

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

      var title = funnels.selectAll("h5.domains")
        .data(function(x){return [x]})
      title.enter().append("h5").classed("domains",true)
      title.text("Popular sites of convertors")
      

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

      bar
        .enter().append("g")
          .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; });

      bar.exit().remove()
    
      var rect = bar.selectAll("rect.bar").data(function(x){return [x]})
      rect.enter()
          .append("rect")
      rect
          .attr("class","bar")
          .attr("width", function(d) { return x(d.uid); })
          .attr("height", barHeight - 1);
    
      var text = bar.selectAll("text").data(function(x){return [x]})
      text.enter()
          .append("text")
      text
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

      
      var domain_chart = funnels.selectAll(".domain-chart").data(function(x){return [x]})
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
      .classed("active",function(x,i){return !i})

    var item = funnels
      .classed("funnel list-group-item",true)
      .on("click",function(x){

        d3.select(this.parentNode.parentNode).selectAll(".funnel")
          .classed("active",false)

        d3.select(this)
          .classed("active",true)

        var target = d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")
        var f = target.selectAll(".funnel").data([x],function(y){return y.funnel_id})

        f.enter()
          .append("div")
          .classed("funnel",true)

        f
         .append("h5")
         .text("Edit a funnel")
 
        f.exit().remove()

        funnel.edit(f,action_data)
        var show = f.selectAll(".show").data(function(x){return [x]})
        show.enter().append("div").classed("show",true)

        crusher.controller.funnel.show(f.datum(),funnel.show.bind(false,show))

      })

    item.append("span")
      .classed("name",true)
      .text(function(x){return x.funnel_name})

    funnel.edit.component.remove_funnel(funnels)   

    target.append("div")
      .classed("add-funnel-wrapper col-md-12",true)

    crusher.ui.add_funnel()

     
  }

  funnel.build = function(funnel_data, action_data) {
    var target = d3.selectAll(".funnel-wrapper")

    var funnels = target.selectAll(".funnel")
      .data([funnel_data[0]])
        .enter()
        .append("div")
        .classed("funnel",true)

    funnels
      .append("h5")
      .text("Edit a funnel")
    
    funnel.edit(funnels,action_data)
    funnel.showList(funnel_data,action_data)

    //funnel.show(funnels)
          
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
    
  }

  

  funnel.add_action = funnel.methods.add_action
  funnel.add_funnel = funnel.methods.add_funnel
   

  return funnel
})(RB.crusher.ui.funnel || {})   
