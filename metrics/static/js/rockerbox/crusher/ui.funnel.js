var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.funnel = (function(funnel) {

  var crusher = RB.crusher

  funnel.showList = function(funnel_data, options, selected) {

    var target = d3.selectAll(".funnel-list-wrapper")

    funnel.list.outer_wrapper(target,options)
    funnel.list.header(target)

    var funnelWrapper = funnel.list.wrapper(target) 
    var funnels = funnel.list.funnel(funnelWrapper,funnel_data,selected)
      
    funnel.list.item(funnels) 
    funnel.list.remove(funnels)
    funnel.list.add(target)

    return funnels

  }

  funnel.edit = function(funnels, options) {

    funnel.edit.component.header(funnels)

    var settings = funnel.edit.component.settings(funnels) 

    funnel.edit.component.name(settings) 
    funnel.action.build(settings,options)
    funnel.edit.component.compute_funnel(settings,options) 

    if (funnels[0].length && funnels.datum().actions.length == 0) 
      funnel.methods.add_action(settings,options,{}) 

  }

  funnel.wait = function(funnels) {
    
    d3_updateable(funnels,".waiting","div")
      .classed("col-md-12 waiting",true)
      .classed("hidden",false)
      .text("loading... (replace with loading image)...")

    d3_updateable(funnels,".step-chart","div")
      .classed("col-md-9 step-chart",true)
      .classed("hidden",true)

    var stepDesc = d3_updateable(funnels,".summary","div")
      .classed("col-md-3 summary",true)
      .classed("hidden",true)

    d3_updateable(funnels,".campaign-table","div")
      .classed("col-md-12 campaign-table",true)
      .classed("hidden",true)
    
    d3_updateable(funnels,".domain-chart","div")
      .classed("col-md-9 domain-chart",true)
      .classed("hidden",true)

    d3_updateable(funnels,".category-chart","div")
      .classed("col-md-9 category-chart",true)
      .classed("hidden",true)



  } 

  funnel.buildShow = function() {
    var target = d3.select(".funnel-view-wrapper")
      .selectAll(".funnel") 

    var f = d3_updateable(target,".show","div")
      .classed("show",true)

    var wait = funnel.wait.bind(false,f),
      show = funnel.show.bind(false,f),
      data = f.datum()

    crusher.controller.funnel.show(data, show, wait)

    return f
  }

  funnel.show = function(funnels) {

    d3_updateable(funnels,".waiting","div")
      .classed("hidden",true)

    funnel.show.component.steps(funnels)
    funnel.show.component.summary(funnels)
    funnel.show.component.campaign(funnels)

    var actions = funnels.datum().actions
    var reduced = actions[actions.length -1].funnel_uids
    var domains_callback = funnel.show.component.domains.bind(false,funnels)

    crusher.controller.funnel.show_domains(reduced,domains_callback)

  }


  funnel.edit.component = {
    header: function(funnels) {
      return d3_updateable(funnels,"h5","h5").text(function(x){
        return x.funnel_id ? "Edit a funnel" : "Create a funnel"
      })
    },
    settings: function(funnels) {
      return d3_updateable(funnels,".settings","div")
        .classed("settings",true)
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

      funnels.selectAll(".compute-funnel-wrapper")
        .data(function(x){return [x]})
        .enter()
          .append("div").classed("compute-funnel-wrapper",true)
          .append("button")
          .classed("btn btn-sm btn-success",true)
          .text("Save Funnel")
          .on("click",funnel.methods.save_funnel)
    }
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

      var current = data.actions.indexOf(current) + 1
      data.actions.splice(current,0, {
        "action_id":0,
        "action_name":"",
        "url_pattern":[]
      })           

      data.actions.map(function(x,i){x.pos = i + 1})
      actions.datum(data)

      funnel.action.build(d3.select(actions.node().parentNode),options)
     
    },
    add_funnel: function(target,action_data) {
      var data = [{"funnel_name":"","actions":[]}]

      var newFunnel = d3_splat(target,".funnel","div",data,function(x){return x.funnel_id})
        .classed("funnel",true)

      newFunnel
        .exit().remove()

      funnel.edit(newFunnel,action_data)

    },
    save_funnel: function() {

      var action_data = d3.select('.funnel-list-wrapper').datum()
      var this_funnel = d3.select(this.parentElement.parentElement.parentElement)
      var data = this_funnel.datum()

      var show = d3_updateable(this_funnel,".show","div").classed("show",true)

      crusher.controller.funnel.show(
        show.datum(),
        funnel.show.bind(false,show),
        funnel.wait.bind(false,show)
      )

      data.funnel_name = this_funnel.selectAll("input.funnel-name").property("value")

      var onSave = function(funnel_data) {
        //funnel.showList(funnel_data,action_data,data)
      }

      crusher.controller.funnel.save(data,onSave)

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
    },
    select: function(x){
      var current = this
      var options = d3.select(this.parentNode).datum()
    
      d3.select(this.parentNode.parentNode).selectAll(".funnel")
        .classed("active",function(x){return this == current})
    
      var target = d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")

      var f = target.selectAll(".funnel").data([x],function(y){return y.funnel_id})
      f.enter().append("div").classed("funnel",true)
      f.exit().remove()
    
      funnel.edit(f,options)
      var show = funnel.buildShow()
    
      crusher.controller.funnel.show(
        f.datum(),
        funnel.show.bind(false,show),
        funnel.wait.bind(false,show)
      )
    
    }
  } 

  funnel.show.component = {

    summary: function(funnels) {
      var summary = d3_updateable(funnels,".summary","div")
        .classed("col-md-3 summary",true)
        .classed("hidden",false)

      d3_updateable(summary,"h5.details","h5")
        .classed("details",true)
        .text("Funnel Summary")

      d3_updateable(summary,".union-size","div")
        .classed("union-size",true)
        .text(function(x){

          var users = x.actions.reduce(function(p,c){
            c.uids.map(function(u){
              p[u] = true
            })
            return p
          },{})

          return "Union Size: " + d3.format(",")(Object.keys(users).length)
        })

      d3_updateable(summary,".intersection-size","div")
        .classed("intersection-size",true)
        .text(function(x){
          var last = x.actions[x.actions.length-1].funnel_uids.length
          return "Intersection Size: " + d3.format(",")(last)
        })

      d3_updateable(summary,".conversion-rate","div")
        .classed("conversion-rate",true)
        .html(function(x){
          var first = x.actions[0].uids.length 
          var last = x.actions[x.actions.length-1].funnel_uids.length
          return "<br>Conversion Rate: " + d3.format("%")(last/first) + "<br><br>"
        })


      d3_updateable(summary,"h5.methods","h5")
        .classed("methods",true)
        .text("Funnel Step versus Action")

      var step_summary = d3_updateable(summary,".step-summary","div")
        .classed("step-summary",true)

      var steps = d3_splat(step_summary,".step","div",function(x){console.log(x);return x.actions},function(x){return x.action_id + ":" + x.pos})
        .classed("step",true)
        .text(function(x){
          return d3.format("%")(x.funnel_uids.length/x.uids.length) + " of all \"" + x.action_name + "\" users (" + x.uids.length + ")"
        })

      steps.sort(function(x,y) {return x.pos - y.pos})

      steps.exit().remove()


      d3_updateable(summary,"h5.exchange","h5")
        .classed("exchange",true)
        .html("<br>Step Availability")

      var exchange_summary = d3_updateable(summary,".exchange-summary","div")
        .classed("exchange-summary",true)

      var exchanges = d3_splat(exchange_summary,".exchange","div",
          function(x){return x.actions},
          function(x){return x.action_id + ":" + x.pos}
        ).classed("exchange",true)

      exchanges.sort(function(x,y) {return x.pos - y.pos})
      exchanges.exit().remove()

      var bound = funnel.show.component.avails.bind(false,exchanges)

      crusher.controller.funnel.show_avails(summary.datum(),bound)

      
            
    },
    avails: function(exchanges) {
      d3_updateable(exchanges,"div","div")
        .text(function(x){
          if (x.avails_raw)
            return d3.format("%")(x.avails_raw.avails/x.avails_raw.total) + " of \"" + x.action_name + "\" users seen"
        })
    },
    campaign: function(funnels){
      var campaign = d3_updateable(funnels,".campaign-table","div")
        .classed("col-md-12 campaign-table",true)
        .classed("hidden",false)

      d3_updateable(campaign,"h5","h5")
        .text("Funnel campaigns")

      var wrapper = d3_updateable(campaign,"div.wrapper","div")
        .classed("wrapper",true)

      var camp = d3_splat(wrapper,"div.campaign","div",function(x){return x.actions},function(x){return x.action_id})
        .classed("campaign row",true)
        .style("padding-bottom","15px")
        .style("border-bottom","1px solid #f0f0f0")
        .style("margin-bottom","15px")

      var info = d3_updateable(camp,"div.step-info","div") 
        .classed("step-info col-md-2",true) 
        .style("line-height","30px")

      d3_updateable(info,"div.name","div")
        .classed("name",true)
        .style("font-size","13px")
        .style("weight","bold")
        .text(function(x,i){return "Step " + x.pos + ": " + x.action_name})

      var onoff = d3_updateable(info,"div.switch","div")
        .classed("switch", true)
        .style("height","30px")

      d3_updateable(onoff,"input","input")
        .attr("type","checkbox")

      $(".switch input[type='checkbox']").bootstrapSwitch();



      var settings = d3_updateable(camp,"div.settings","div")
        .classed("settings col-md-3",true)

      //d3_updateable(settings,"div","div").text("Settings")


      var estimates = d3_updateable(camp,"div.estimates","div")
        .classed("estimates col-md-3",true)

      //d3_updateable(estimates,"div","div").text("Estimates")


      var reporting = d3_updateable(camp,"div.reporting","div")
        .classed("reporting col-md-3",true)

      //d3_updateable(reporting,"div","div").text("Served")

      var targeted = d3_updateable(reporting,"div.served-users","div")
        .classed("served-users statistic",true)

      d3_updateable(targeted,"span.lab","span")
        .classed("lab",true)
        .text("Users Reached (Freq): ")

      d3_updateable(targeted,"span.value","span")
        .classed("value pull-right",true)
        .text(function(x){
          return 0 
        })


      var sfreq = d3_updateable(reporting,"div.avg-imps","div")
        .classed("avg-imps statistic",true)

      d3_updateable(sfreq,"span.lab","span")
        .classed("lab",true)
        .text("Imps Served (CPM): ")

      d3_updateable(sfreq,"span.value","span")
        .classed("value pull-right",true)
        .text(function(x){
          return 0  + " (0)"
        })


      var cost = d3_updateable(reporting,"div.cost","div")
        .classed("cost statistic",true)

      d3_updateable(cost,"span.lab","span")
        .classed("lab",true)
        .text("Total Cost: ")

      d3_updateable(cost,"span.value","span")
        .classed("value pull-right",true)
        .text(function(x){
          return 0 + " (0)"
        })



      var targetable = d3_updateable(estimates,"div.estimated-users","div")
        .classed("estimated-users estimate",true)

      d3_updateable(targetable,"span.lab","span")
        .classed("lab",true)
        .text("Reachable Users: ")

      d3_updateable(targetable,"span.value","span")
        .classed("value pull-right",true)
        .text(function(x){
          if (x.avails_raw) return x.avails_raw.avails
        })

      var imps = d3_updateable(estimates,"div.estimated-imps","div")
        .classed("estimated-imps estimate",true)


      d3_updateable(imps,"span.lab","span")
        .classed("lab",true)
        .text("Estimated Impressions: ")

      d3_updateable(imps,"span.value","span")
        .classed("value pull-right",true)
        .text("value")

      var cost = d3_updateable(estimates,"div.estimated-cost","div")
        .classed("estimated-cost estimate",true)


      d3_updateable(cost,"span.lab","span")
        .classed("lab",true)
        .text("Maximum Daily Cost: ")

      d3_updateable(cost,"span.value","span")
        .classed("value pull-right",true)
        .text("value")




      var onChange = function(x) {
        var id = x.action_id
        var campaign = camp.filter(function(y){return y.action_id == id})

        var f = campaign.selectAll("div.daily-freq input").property("value")
        var imps = f * (x.avails_raw.avails)

        var p = campaign.selectAll("div.bid-price input").property("value")

        campaign.selectAll("div.estimated-imps span.value").text(d3.format(",")(imps))
        campaign.selectAll("div.estimated-cost span.value").text(d3.format("$.2")(imps * p / 1000))

      }

      d3_updateable(estimates,"span.b1","span")
        .classed("b1",true)
        .text("{")
        .style("font-size","38px")
        .style("line-height","60px")
        .style("top","0px")
        .style("left","-5px")
        .style("position","absolute")
        .style("font-weight",100)
        .style("color","#ccc")

      d3_updateable(estimates,"span.b2","span")
        .classed("b2",true)
        .html("&#65515;")
        .style("font-size","24px")
        .style("line-height","30px")
        .style("top","60px")
        .style("left","-5px")
        .style("position","absolute")
        .style("font-weight",100)
        .style("color","#ccc")



      var dfreq = d3_updateable(settings,"div.daily-freq","div")
        .classed("daily-freq input-group input-group-sm",true)
        .style("margin-top","15px")
        .style("margin-bottom","15px")

      d3_updateable(dfreq,"span","span")
        .classed("input-group-addon",true)
        .text("Frequency cap")

      d3_updateable(dfreq,"input","input")
        .classed("form-control",true)
        .property("value","0")
        .on("input",onChange)


      


      var dfreq = d3_updateable(settings,"div.bid-price","div")
        .classed("bid-price input-group input-group-sm",true)

      d3_updateable(dfreq,"span","span")
        .classed("input-group-addon",true)
        .text("Max bid price")

      d3_updateable(dfreq,"input","input")
        .classed("form-control",true)
        .property("value","0")
        .on("input",onChange)


      



      camp.sort(function(x,y){return x.pos - y.pos})
      camp.exit().remove()
    },
    step_chart: function(funnels){

      var title = d3_updateable(funnels,"h5.steps","h5")
        .classed("steps",true)
        .text("Conversion funnel")
      
      var data = funnels.datum().actions

      var targetWidth = funnels.style("width").replace("px","")
      
      var margin = {top: 20, right: 20, bottom: 30, left: 40},
        width = targetWidth - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;
  
      var x = d3.scale.ordinal().rangeRoundBands([0, width], .1);
      var y = d3.scale.linear().range([height, 0]);
      var xAxis = d3.svg.axis().scale(x).orient("bottom");
  
      var yAxis = d3.svg.axis().scale(y).orient("left").ticks(10);

      var s = d3_updateable(funnels,"svg.steps","svg")
        .attr("class","steps")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)

      var svg = d3_updateable(s,"g.body","g")
        .attr("class","body")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      x.domain(data.map(function(d) { return d.action_name; }));
      y.domain([0, d3.max(data, function(d) { return d.funnel_count; })]);

      d3_updateable(svg,".x.axis","g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

      var yax = d3_updateable(svg,".y.axis","g")
          .attr("class", "y axis")
          .call(yAxis)

      d3_updateable(yax,"text","text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("Users");

      var bar = d3_splat(svg,".bar","rect",function(x){return x.actions},function(x){return x.action_name})
          .attr("class", "bar")
          .attr("x", function(d) { return x(d.action_name); })
          .attr("width", x.rangeBand())
          .attr("y", function(d) { return y(d.funnel_count); })
          .attr("height", function(d) { return height - y(d.funnel_count); }); 

      bar.exit().remove()


      var text = d3_splat(svg,"text.barlabel","text",function(x){return x.actions},function(x){return x.action_name})
        .attr("class","barlabel")
        .attr("x", function(d) { return x(d.action_name) + x.rangeBand()/2 - 20 }) 
        .attr("y", function(d) { return (height - y(d.funnel_count) > 30) ? y(d.funnel_count) + 13 : ( y(d.funnel_count) - 13) } )
        .attr("dy", ".35em")
        .text(function(d) { return d3.format(",")(d.funnel_count) + " " + d3.format("%.2")(d.funnel_percent); });

      text.exit().remove()
      
      

    },
    steps: function(funnels) {

      var data = funnels.datum()

      var stepsWrapper = d3_updateable(funnels,".step-chart","div")
        .classed("col-md-9 step-chart",true) 
        .classed("hidden",false)

      funnel.show.component.step_chart(stepsWrapper) 

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

      var title = d3_updateable(funnels,"h5.domains","h5")
        .classed("domains",true)
        .text("Popular sites of convertors")

      var targetWidth = funnels.style("width").replace("px",""),
        width = targetWidth,
        barHeight = 15;
      
      var x = d3.scale.linear().range([0, width-150]);
      
      var chart = funnels.selectAll("svg.domain-chart-svg")
          .data([data])

      chart
          .enter()
            .append("svg")
            .attr("class","domain-chart-svg")
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
          .attr("width", function(d) { return x(d.uid || 0); })
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
    category_chart: function(funnels,data) {

      var title = d3_updateable(funnels,"h5.categories","h5")
        .classed("categories",true)
        .text("Popular categories of convertors")

      var targetWidth = funnels.style("width").replace("px",""),
        width = targetWidth,
        barHeight = 15;
      
      var x = d3.scale.linear().range([0, width-150]);
      
      var chart = funnels.selectAll("svg.category-chart-svg")
          .data([data])

      chart
          .enter()
            .append("svg")
            .attr("class","category-chart-svg")
            .attr("width", width);

      x.domain([0, d3.max(data, function(d) { return d.values; })]);
    
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
          .attr("width", function(d) { return x(d.values || 0); })
          .attr("height", barHeight - 1);
    
      var text = bar.selectAll("text").data(function(x){return [x]})
      text.enter()
          .append("text")
      text
          .attr("x", function(d) { return x(d.values) + 3; })
          .attr("y", barHeight / 2)
          .attr("dy", ".35em")
          .text(function(d) { return d.key + " (" + d.values + ")"; }); 

    },
    domains: function(funnels,data) {
      
      var data = data.map(function(x){
        var pop_domain = RB.crusher.pop_domains[x.domain] || {}
        var idf = pop_domain.idf || 12
        x.wuid =  Math.exp(idf) * Math.log(x.uid)
        return x
      }).sort(function(x,y){
        return y.wuid - x.wuid
      }).slice(0,15)

      var cat = d3.nest()
        .key(function(x) {
          return RB.crusher.cat_domains[x.domain] || "NA"
        })
        .rollup(function(x){return d3.sum(x.map(function(y){return y.uid})) })
        .entries(data)
        .sort(function(x,y){
          return y.values - x.values
        }).slice(0,15)



      
      var domain_chart = d3_updateable(funnels,".domain-chart","div",false,function(x){
          return x.funnel_id
        })
        .classed("col-md-6 domain-chart",true)
        .classed("hidden",false)


      funnel.show.component.domain_chart(domain_chart,data)

      var category_chart = d3_updateable(funnels,".category-chart","div",false,function(x){
          return x.funnel_id
        })
        .classed("col-md-6 category-chart",true)
        .classed("hidden",false)


      funnel.show.component.category_chart(category_chart,cat)

      
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

  

  funnel.list = {
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

  

  funnel.build = function(funnel_data, action_data) {
    var target = d3.selectAll(".funnel-wrapper")
    
    var data = funnel_data[0] ? [funnel_data[0]] : []

    var funnels = target.selectAll(".funnel")
      .data(data)

      funnels
        .enter()
        .append("div")
        .classed("funnel",true)

    d3_updateable(funnels,"h5","h5")
      .text("Edit a funnel")

    funnel.edit(funnels,action_data)
          
  }

  funnel.buildBase = function() {

    var target = d3.selectAll(".container")

    var funnelRow = d3_splat(target,".row","div",[{"id":"funnel"}],function(x){return x.id})
      .classed("row funnels",true)

    var viewWrapper = d3_updateable(funnelRow,".funnel-view-wrapper","div")
      .classed("funnel-view-wrapper col-md-12",true)

    d3_updateable(viewWrapper,".funnel-wrapper","div")
      .classed("funnel-wrapper",true)

    d3_updateable(funnelRow,".funnel-list-wrapper","div")
      .classed("funnel-list-wrapper col-md-6",true)

    funnelRow
      .exit().remove()
    
  }

  

  funnel.add_action = funnel.methods.add_action
  funnel.add_funnel = funnel.methods.add_funnel
   

  return funnel
})(RB.crusher.ui.funnel || {})   
