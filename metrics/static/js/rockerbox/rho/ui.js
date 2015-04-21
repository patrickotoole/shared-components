var RB = RB || {}
RB.rho = RB.rho || {}

RB.rho.ui = (function(ui) {

  var rho = RB.rho

  ui.buildFilter = function(filter){
    filter.append("h5").text(function(x){return x.key})
  
    var select = filter.append("select")
      .attr("multiple",true)
      .classed("filter-select",true)
  
    select.selectAll("option")
      .data(function(x){return x.values})
      .enter()
        .append("option")
        .text(function(x){return x})
  
    $(".filter-select")
      .chosen({width: "100%"})
      .change(rho.controller.select)
  
  }
  
  ui.buildFilters = function(target,options){
  
    var filterWrapper = target.append("div")
      .classed("filter-wrapper row",true)
  
    var w = filterWrapper.append("div")
      .classed("col-md-12",true)
  
    var filters = w.selectAll(".filter")
      .data(options)
      .enter()
        .append("div").classed("filter",true)
  
    ui.buildFilter(filters)
  
  }
  
  ui.buildTimeseries = function(target,data,title) {

    data.map(function(x){
      x.date = new Date(x.key)
      for (var i in x.value) 
        x[i] = x.value[i]
    })
    var margin = {top: 20, right: 20, bottom: 30, left: 50},
      width = 960 - margin.left - margin.right,
      height = 200 - margin.top - margin.bottom;
  
    var parseDate = d3.time.format("%D-%b-%y %H:%M").parse;
  
    var x = d3.time.scale().range([0, width]); 
    var y = d3.scale.linear().range([height, 0]); 
    var xAxis = d3.svg.axis().scale(x).orient("bottom"); 
    var yAxis = d3.svg.axis().scale(y).orient("left");
  
    var line = d3.svg.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.ecp); });
  
    var line2 = d3.svg.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.eap); });
  
    target.selectAll("h2")
      .data([data])
      .enter()
        .append("h2")
        .text(title)
  
    var svg = target.selectAll("svg")
      .data([data])

    var newSvg = svg
      .enter()
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain([0,d3.max(data, function(d) { return d.ecp; })]);
  
    newSvg.append("g")
      .attr("class", "x axis")

    d3.select(".x.axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  
    newSvg.append("g")
      .attr("class", "y axis")

    d3.select(".y.axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("ECP");
  
    newSvg.append("path")
      .attr("class", "line1 line")

    d3.select(".line1")
      .datum(data)
      .attr("d", line);
  
    newSvg.append("path")
      .attr("class", "line2 line") 

    d3.select(".line2")
      .datum(data)
      .attr("d", line2);  
  }
  
  ui.build = function(target,filters,data){
    if (filters) ui.buildFilters(target,filters)
    ui.buildTimeseries(d3.select(".container"),data,"t")
  } 

  return ui
})(RB.rho.ui || {})
