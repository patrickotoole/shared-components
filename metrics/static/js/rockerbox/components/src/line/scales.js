import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'


export default function(target) {

    var canvas = target.selectAll("svg").selectAll("g.canvas")

    canvas
      .datum(function(x) {
        if (x.values) {
          var data = x.values 

          x.scales = {
            x: d3.time.scale()
                  .range([0, x.options.canvas.width])
                 .domain(d3.extent(data, function(d) { return d.key; })),
            y: d3.time.scale()
                 .range([x.options.canvas.height, 0])
                 .domain([0,d3.max(data, function(d) { return d.value; })])
          }
          x.axis = {
            x: d3.svg.axis().scale(x.scales.x).orient("bottom")
                 .ticks(d3.time.days, x.options.canvas.width < 300 ? 5 : 2),
            y: d3.svg.axis().scale(x.scales.y).orient("left")
                 .tickSize(-x.options.canvas.width, 0, 0)
                 .ticks(x.options.canvas.height < 200 ? 3 : 5)
                 .tickFormat(d3.format(",.0f"))
          }
          x.line = d3.svg.line()
	    .x(function(d) { return x.scales.x(d.key); })
	    .y(function(d) { return x.scales.y(d.value); });

          x.area = d3.svg.area()
	    .x(function(d) { return x.scales.x(d.key); })
	    .y0(x.options.canvas.height)
	    .y1(function(d) { return x.scales.y(d.value); });

        }
        return x
      })

}

