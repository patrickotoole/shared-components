import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'
import {default as dims} from './dimensions'


function base(target) {

    var margin = this.margins()
    var dimensions = dims.bind(this)

    var svg = d3_splat(target,"." + this._class, "svg",function(x){return x},function(x){return x.key ? x.key : x})
      .classed(this._class,true)
      .datum(function(x) {
        if (typeof(x) !== "object") throw "wrong data type. requires object";
        x.options = dimensions(d3.select(this.parentNode))
        return x
      })

    svg
      .attr("width", function(d){ return d.options.svg.width })
      .attr("height", function(d){ return d.options.svg.height})

    var g = d3_updateable(svg,"g.canvas","g")
      .attr("class","canvas")
      .attr("transform", function(x) {
        return "translate(" + x.options.margin.left + "," + x.options.margin.top + ")"
      });

}

function other() {



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

export default base;
