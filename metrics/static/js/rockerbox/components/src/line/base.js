import d3 from 'd3'
import dimensions from '../dimensions'

function buildTimeseries(target, hover) {

    var dimensions = dimensions.bind(this)(target)
    var margin = this.margin()

    var height = 80;

    var default_formatting = { "font_size": ".71em" }
    var formatting = typeof formatting !== "undefined" ? formatting: default_formatting;

    var targetWidth = 400//target.style("width").replace("px","")
    
    var margin = {top: 10, right: 50, bottom: 30, left: 50},
        width = targetWidth - margin.left - margin.right,
        height = height - margin.top - margin.bottom;


    var x = d3.time.scale().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);
    var xAxis = d3.svg.axis().scale(x).orient("bottom")
      .ticks(d3.time.days, width < 300 ? 5 : 2)

    var yAxis = d3.svg.axis().scale(y).orient("left")
      .tickSize(-width, 0, 0)
      .ticks(height < 200 ? 3 : 5)

    var data = target.datum()[0]
    
    var svg = target.selectAll("svg")
      .data(function(x){return x})

    var newSvg = svg
      .enter()
        .append("svg")
        .attr("class",title)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)


    x.domain(d3.extent(data, function(d) { return d.key; }));
    y.domain([0,d3.max(data, function(d) { return d.value; })]);

    newSvg.append("g")
      .attr("class", "x axis")

    svg.select(".x.axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.select(".x.axis").selectAll("text").filter(function(x){return this.innerHTML.length > 6})
      .attr("y",10)

    newSvg.append("g")
      .attr("class", "y axis")

    svg.select(".y.axis")
      .selectAll("text.y-label")
      .remove()

    svg.select(".y.axis")
      .call(yAxis)
        .append("text")
        .attr("y", -10)
        .attr("x", 0)
        .attr("dy", formatting.font_size)
        .style("text-anchor", "start")
        .classed("y-label",true)
      

    svg.select(".y.axis")
      .selectAll(".tick > text")
      .attr("x",-10)

	  var line = d3.svg.line()
	    .x(function(d) { return x(d.key); })
	    .y(function(d) { return y(d.value); });

	  var area = d3.svg.area()
	    .x(function(d) { return x(d.key); })
	    .y0(height)
	    .y1(function(d) { return y(d.value); });

	  newSvg.append("path")
	    .attr("class", " line")

	  svg.select(".line")
	    .datum(data)
	    .attr("d", line);

	  newSvg.append("path")
	    .attr("class", "area")

	  svg.select(".area")
	    .datum(data)

	    .attr("d", area);

	  var points = svg.selectAll(".point")
	    .data(data,function(d){return d.key})

	  points
	    .enter().append("svg:circle")
	    .attr("class","point")

	  points.exit().remove()

	  points
	     .attr("fill", function(d, i) { return d.action ? "red" : "steelblue" })
	     .attr("cx", function(d, i) { return x(d.key) + 50 })
	     .attr("cy", function(d, i) { return y(d.value) + 10})
	     .attr("r", function(d, i) { return 3 })
      
      if (hover) points.on("mouseover",hover)

	  if(false) {
	    points
	      .attr("cx", function(d, i) { return x(d.key) + 10 })
	      .attr("cy", function(d, i) { return y(d.value) + 10})
	  }

 

    if(false && typeof hide_axis !== typeof undefined && hide_axis == true) {
      svg.select(".x.axis").style('display', 'none')
      svg.select(".y.axis").selectAll("text").style('display', 'none')
    }

}

export default buildTimeseries;
