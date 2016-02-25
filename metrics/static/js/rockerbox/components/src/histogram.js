import d3 from 'd3'
import d3_updateable from 'd3_updateable'
import base from './histogram/base'
import draw from './histogram/draw'

export function Histogram(target) {
  this._target = target;
  this._base = this.base(target);
  this._dataFunc = function(x) { return x };
  this._keyFunc = function(x) { return x };
}

function data(cb, key) {
  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
  this._keyFunc = key ? key : function(x) {return x}

  return this;
}

Histogram.prototype = {
  base: base,
  data: data,
  draw: draw
}

function histogram(target) {
  return new Histogram(target);
}






  /*
  // Create SVG element and bind data to that element
  // var svg = d3_updateable(target, '.vendor-histogram', 'svg')
  //   .classed('vendor-histogram', true)
  //   .style('width', '100%');
  //
  // svg.datum(data);
  //
  // svg.exit().remove()

  var svg = base(target);

  // draw(svg);

  // Set color range and create a get function
  var colors = ['#9ecae1','#6baed6','#4292c6',
                '#2171b5','#08519c','#08306b'];
  var get_color = d3.scale.quantile()
    .domain([0, d3.max(data, function (d) { return d.value; })])
    .range(colors);


  // Set height and max width if necessary
  bar_height = bar_height || 20;
  max_width = max_width || 70;
  var bar_width = d3.scale.linear()
    .domain([0, d3.max(data, function(d) {
      return Math.sqrt(d.value);
    })])
    .range([0, max_width]);


  // Add bars to the svg
  svg.selectAll('.bar')
    .data(svg.datum(), function(x) {
      return x.key
    })
    .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', 75)
      .attr('width', function(d) {
        return bar_width(Math.sqrt(d.value));
      })
      .attr('y', function(d, i) {
        return bar_height * i;
      })
      .attr('fill',function(x) {
        return get_color(x.value);
      })
      .attr('stroke','white')
      .attr('stroke-width','2px')
      .attr('height', bar_height);

  svg.selectAll('.label')
    .data(svg.datum(), function(x) {
      return x.key;
    })
    .enter().append('text')
      .text(function (d) { return d.title; })
      .attr('x', '0px')
      .attr('y', function(d, i) {
        return 14 + (bar_height * i);
      })
      .attr('width', function(d) {
        return 75;
      })
      .attr('line-height', bar_height)
      .style('color', '#000');
}
// */
// function histogram(target, data, bar_height, max_width){
//   return new Histogram(target, data, bar_height, max_width)
// }


// Histogram.prototype = {
//   // dimensions: dimensions,
//   base: base,
//   // desc: desc,
//   // draw: draw,
//   // hover: hover,
//   // colors: colors,
//   // data: data
// }

export default histogram
