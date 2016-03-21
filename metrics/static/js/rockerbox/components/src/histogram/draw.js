import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function draw() {
  // Set color range and create a get function
  var colors = ['#9ecae1', '#6baed6', '#4292c6',
    '#2171b5', '#08519c', '#08306b'
  ];
  var get_color = d3.scale.quantile()
    .domain([0, d3.max(this._dataFunc(), function(d) {
      return d.value;
    })])
    .range(colors);

  var data = this._dataFunc().filter(function(x) {
    if (x.value) {
      return true;
    } else {
      return false;
    }
  });

  if (!data.length) {
    this._base.svg.enter().append('text').text('No data to display in histogram')
      .style('position', 'relative')
      .style('top', '-150px')
  } else {
    // Set height and max width if necessary
    var bar_height = bar_height || 20;
    var max_width = max_width || 70;
    var bar_width = d3.scale.linear()
      .domain([0, d3.max(data, function(d) {
        return Math.sqrt(d.value);
      })])
      .range([0, max_width]);

    // Add bars to the svg
    this._base.svg.selectAll('.bar')
      .data(data, function(x) {
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
      .attr('fill', function(x) {
        return get_color(x.value);
      })
      .attr('stroke', 'white')
      .attr('stroke-width', '2px')
      .attr('height', bar_height);

    this._base.svg.selectAll('.label')
      .data(data, function(x) {
        return x.key;
      })
      .enter().append('text')
      .text(function(d) {
        return d.title;
      })
      .attr('x', '70px')
      .attr('text-anchor', 'end')
      .attr('y', function(d, i) {
        return 14 + (bar_height * i);
      })
      .attr('width', function(d) {
        return 75;
      })
      .attr('line-height', bar_height)
      .style('color', '#000');
  }
}

export default draw;
