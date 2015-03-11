var buildHoverboard = function(wrapper) {
  var bubble_wrapper = wrapper
    .append("div")
    .classed("bubble-wrapper",true)


  var width, height;

      
  var buildSVG = function(wrapper) {
    var w = wrapper.node().getBoundingClientRect().width
    var margin = {top: 20, right: 20, bottom: 30, left: 40}
        width = w - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;
    
    
    var svg = wrapper.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    return svg
     
  }

  var buildBubblePlot = function(svg) {

    var data = svg.data()[0]['bubble_data']

    data.forEach(function(d) {
      d.y = +d.num_users;
      d.x = +d.avg_min_before_conv;
      d.z = d.tf_idf;
    });

    var x = d3.scale.linear()
        .range([0, width]);
    
    var z = d3.scale.sqrt()
        .range([0, 25]);
    
    var y = d3.scale.linear()
        .range([height, 0]);
    
    var color = d3.scale.category10();
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
     
  
    x.domain([0,d3.max(data.map(function(d){return d.x}))+2]).nice();
    y.domain(d3.extent(data, function(d) { return d.y; })).nice();
    z.domain([-150+d3.min(data.map(function(d){return d.z})),d3.max(data.map(function(d){return d.z}))]).nice();
  
    var tooltip = d3.select("body")
        .append("div")
        .classed("custom-tooltip",true)
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .text("a simple tooltip");
  
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
      .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Time before conversion");
  
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Number of Convertors")
  
    svg.selectAll(".dot")
        .data(data)
      .enter().append("circle")
        .attr("class", "dot")
        .attr("r", function(d) { return z(d.z); })
        .attr("cx", function(d) { return x(d.x); })
        .attr("cy", function(d) { return y(d.y); })
        .style("fill", function(d) { return color(d.category); })
        .on("mouseover", function(d){tooltip.style("visibility", "visible"); tooltip.text(d.category); return})
        .on("mousemove", function(){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");});
  
    var legend = svg.selectAll(".legend")
        .data(color.domain())
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
  
    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);
  
    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });
  

  }

  var svg_wrapper = buildSVG(bubble_wrapper)
  buildBubblePlot(svg_wrapper)

  

} 
