var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.funnel = (function(funnel) {

  var crusher = RB.crusher

  funnel.show = function(funnels) {

    d3_updateable(funnels,".waiting","div")
      .classed("hidden",true)

    funnel.show.component.steps(funnels)
    funnel.show.component.summary(funnels)
    //funnel.show.component.lookalike(funnels)
    

    //var actions = funnels.datum().actions
    //var reduced = actions[actions.length -1].funnel_uids
    //var domains_callback = funnel.show.component.domains.bind(false,funnels)

    //crusher.controller.funnel.show_domains(reduced,domains_callback)
    //funnel.show.component.lookalike(funnels)
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

    d3_updateable(funnels,".exchange-data","div")
      .classed("col-md-12 exchange-data",true)
      .classed("hidden",true)

    d3_updateable(funnels,".lookalike-table","div")
      .classed("col-md-12 lookalike-table",true)
      .classed("hidden",true)
  } 

  funnel.buildShow = function() {
    var target = d3.select(".funnel-view-wrapper")
      .selectAll(".funnel") 

    var f = d3_updateable(target,".show","div")
      .classed("show",true)

    return f
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

      //var bound = funnel.show.component.avails.bind(false,exchanges)
      //crusher.controller.funnel.show_avails(summary.datum(),bound)
            
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
      
      funnel.campaign.build(wrapper)
      
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
          .data(function(x){
            return [x.funnel_domains.sort(function(x,y){return y.wuid - x.wuid}).filter(function(x) {return x.domain != "NA"}).slice(0,20)]
          })

      chart
          .enter()
            .append("svg")
            .attr("class","domain-chart-svg")
            .attr("width", width);

      x.domain([0, d3.max(chart.datum(), function(d) { return d.uid; })]);
    
      chart.attr("height", barHeight * chart.data()[0].length);
    
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
          .text(function(d) { return d.domain + " (" + d.uid + ")" + d.idf }); 

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
      funnels.data(function(d) {
        d.funnel_domains = d.funnel_domains.sort(function(x,y) {
          return y.wuid - x.wuid
        })
        return [d]
      })
      
      var cat = d3.nest()
        .key(function(x) {
          return RB.crusher.cat_domains[x.domain] || "NA"
        })
        .rollup(function(x){return d3.sum(x.map(function(y){return y.uid})) })
        .entries(data)
        .sort(function(x,y){
          return y.values - x.values
        }).slice(0,15)

      var exchange_data = d3_updateable(funnels,".exchange-data","div",false,function(x){return x.funnel_id})
        .classed("exchange-data col-md-12",true)
        .classed("hidden",false)


      var h5 = d3_updateable(exchange_data,"h5","h5")
        .text("Convertor Off-site Activity")
            
      var domain_chart = d3_updateable(exchange_data,".domain-chart","div",false,function(x){
          return x.funnel_id
        })
        .classed("col-md-4 domain-chart",true)
        .classed("hidden",false)

      funnel.show.component.domain_chart(domain_chart,data)


      var category_chart = d3_updateable(exchange_data,".category-chart","div",false,function(x){
          return x.funnel_id
        })
        .classed("col-md-4 category-chart",true)
        .classed("hidden",false)

      funnel.show.component.category_chart(category_chart,cat)


      category_chart.exit().remove()
      domain_chart.exit().remove()

      var exchange_summary = d3_updateable(exchange_data,".exchange-data-summary","div",false,function(x){return x.funnel_id})
        .classed("exchange-data-summary col-md-4",true)
        .classed("hidden",false)

      var h5 = d3_updateable(exchange_summary,"h5","h5")
        .text("User Activity Summary")

      d3_updateable(exchange_summary,"div.user","div")
        .classed("user",true)
        .html(function(x){
          var last = x.actions[x.actions.length - 1]
          return "Num convertors: " + last.funnel_uids.length + "<br>" +
            ((last.avails_raw) ? "Num available: " + last.avails_raw.avails : "" ) + "<br><br>" 
        })

      d3_updateable(exchange_summary,"div.domains","div")
        .classed("domains",true)
        .html(function(x){
          return "Num domains: " + data.length  + "<br>" + 
            "Num Categories: " + cat.length
        })

      exchange_summary.exit().remove()

      
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
    },
    lookalike: function(funnels){
      var campaign = d3_updateable(funnels,".lookalike-table","div")
        .classed("col-md-12 lookalike-table",true)
        .classed("hidden",false)

      d3_updateable(campaign,"h5","h5")
        .text("Funnel Convertor Look-a-like Campaigns")

      var wrapper = d3_updateable(campaign,"div.wrapper","div")
        .classed("wrapper",true)

      funnel.campaign.lookalike.build(wrapper)
    },
  }


  return funnel
})(RB.crusher.ui.funnel || {})   
