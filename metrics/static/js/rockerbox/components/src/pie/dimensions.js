import dimensions from '../dimensions'
import d3 from 'd3'

export default function(target) {

  var stddim = dimensions.bind(this)(target),
    width = stddim.width,
    height = stddim.height, 
    radius = stddim.radius;

  var _pie = d3.layout.pie()
    .sort(null)
    .value(function(d) { return d.value; });

  var arc = d3.svg.arc()
  	.outerRadius(radius * 0.8)
  	.innerRadius(radius * 0.4);
  
  var outerArc = d3.svg.arc()
  	.innerRadius(radius * 0.9)
  	.outerRadius(radius * 0.9);

  return {
    width: width,
    height: height,
    radius: Math.min(height, width) / 2,
    pie: _pie,
    arc: arc,
    outerArc: outerArc 
  }
}
