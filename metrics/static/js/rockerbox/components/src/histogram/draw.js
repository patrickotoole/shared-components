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
      .attr('height', bar_height)
      .on('mouseenter', function(x, i, y, z) {
        // debugger;
        d3.select(d3.select(this)[0][0].parentElement).select('.histogram-tooltip')
          .attr('display', 'block')

        d3.select(d3.select(this)[0][0].parentElement).select('.histogram-tooltip rect')
          .attr('y', function() {
            return -(bar_height + 5) + (i * bar_height);
          })

        var a1 = 1;
        var a2 = -7;
        var b1 = 11;
        var b2 = -7;
        var c1 = 1;
        var c2 = 1;

        var a = (a1 + 75) + ',' + (a2 + (i * bar_height));
        var b = (b1 + 75) + ',' + (b2 + (i * bar_height));
        var c = (c1 + 75) + ',' + (c2 + (i * bar_height));

        d3.select(d3.select(this)[0][0].parentElement).select('.histogram-tooltip polygon')
          .attr('y', function() {
            return -(bar_height + 5) + (i * bar_height);
          })
          .attr('points', '75,75 91,75 83,85')
          .attr('points', a + ' ' + b + ' ' + c)


        d3.select(d3.select(this)[0][0].parentElement).select('.histogram-tooltip text')
          .attr('y', function() {
            return -12 + (i * bar_height);
          })
          .text(x.value)
      })
      .on('mouseleave', function() {
        d3.select(d3.select(this)[0][0].parentElement).select('.histogram-tooltip')
          .attr('display', 'none')
      });

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


    var tooltip = d3.select(this._base.svg)[0][0].append('g')
      .attr('display', 'none')
      .attr('class', 'histogram-tooltip');

    tooltip
      .append('rect')
      .attr('fill', '#000')
      .attr('width', '71')
      .attr('height', '18')
      .attr('x', '76')
      .attr('fill-opacity', '.9')
      .attr('y', function() {
        // return 0 + (x.key * 15);
        return 0;
      })

    tooltip
      .append('text')
      .attr('x', '110')
      .attr('fill', '#fff')
      .attr('text-anchor', 'middle')
      .text('4')

    tooltip
      .append('polygon')
      .attr('fill', '#000')
      .attr('width', '16')
      .attr('height', '10')
      .attr('fill-opacity', '.9')

      // <text x="70px" text-anchor="end" y="74" width="75" line-height="20" style="color: rgb(0, 0, 0);">5 - 6</text>
      // .attr('stroke', '#ccc')
      // .attr('stroke-width', '1px')
  }
}

export default draw;
