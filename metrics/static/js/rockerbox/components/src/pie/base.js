import d3_updateable from '../d3_updateable'
import {default as dims} from '../dimensions'

function base(target) {

  var dimensions = dims.bind(this)(target);
  var width = dimensions.width,
    height = dimensions.height,
    radius = dimensions.radius,
    _pie = dimensions.pie,
    arc = dimensions.arc,
    outerArc = dimensions.outerArc

  var svg = d3_updateable(target,"svg","svg");
  svg.classed("",function(x){ x.dimensions = dimensions })


  var translateCenter = function(x) {
    return "translate(" + x.dimensions.width / 2 + "," + x.dimensions.height / 2 + ")"
  }

  svg.attr("transform", translateCenter);
  svg.style("margin-left","-15px")
    .attr("width",function(x){return x.dimensions.width})
    .attr("height",function(x){return x.dimensions.height})

  var slices = d3_updateable(svg,".slices","g").classed("slices",true),
    labels = d3_updateable(svg,".labels","g").classed("labels",true),
    lines = d3_updateable(svg,".lines","g").classed("lines",true),
    circles = d3_updateable(svg,".circles","g").classed("circles",true)


  slices.attr("transform", translateCenter);
  labels.attr("transform", translateCenter);
  lines.attr("transform", translateCenter);
  circles.attr("transform", translateCenter);


  

  return {
    svg: svg,
    pie: _pie,
    arc: arc,
    outerArc: arc
  }

}

export default base
