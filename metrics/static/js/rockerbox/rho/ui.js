var RB = RB || {}
RB.rho = RB.rho || {}
RB.rho.ui = RB.rho.ui || {}

RB.rho.ui = (function(ui) {

  var rho = RB.rho
  
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

  ui.selectFilter = function(target,items) {
    var addFilter = target.selectAll(".new-filter")
      .data([items])

    var newAddFilter = addFilter.enter()
      .append("div")
      .classed("new-filter",true)

    var h5 = newAddFilter
      .append("h5")

    h5.append("span")
      .text("+ Add Filter ")

    h5.append("span").append("select")
      .classed("xxx",true)
      .on("change",function(x){
        rho.controller.add_filter(this.selectedOptions[0].value)
      })

    var select = addFilter.select("select")

    select
      .selectAll("option")
      .data(["Select filter..."].concat(items))
      .enter()
        .append("option")
        .text(String)
        .property("selected",function(x,i){return i == 0})
        .property("disabled",function(x,i){return i == 0}) 

  }
  
  ui.build = function(target,filters,data,callback,key){
    ui.filter.build(target,filters,callback,key)
    ui.selectFilter(target,['seller','tag','size'])
    ui.buildTimeseries(d3.select(".container"),data,"t")
  } 

  return ui
})(RB.rho.ui || {})


