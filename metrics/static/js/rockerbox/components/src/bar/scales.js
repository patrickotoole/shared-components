import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'


export default function(target) {

    var series = this._series;

    var canvas = target.selectAll("svg").selectAll("g.canvas")

    canvas
      .datum(function(x) {
        if (x.values) {
          var data = x.values 

          x.unit_size = 1
          var min_key = d3.min(data, function(d) { return d.key; })
          var max_key = d3.max(data, function(d) { return d.key; })

          var units = (max_key - min_key)/x.unit_size
          x.unit_width = (x.options.canvas.width/(units+1))

          x.scales = {
            x: d3.time.scale()
                 .range([x.unit_width/2, x.options.canvas.width - x.unit_width/2 ])
                 .domain(d3.extent(data, function(d) { return d.key; })),
            x_left: d3.time.scale()
                 .range([0, x.options.canvas.width - x.unit_width ])
                 .domain(d3.extent(data, function(d) { return d.key; })),

            y: d3.scale.linear()
                 .range([x.options.canvas.height/2,-x.options.canvas.height/2])
                 .domain([
                   d3.min(data, function(d) { return d3.min(series,function(q){return d[q]}) }),
                   d3.max(data, function(d) { return d3.max(series,function(q){return d[q]}) })
                 ])
          }
          
          x.axis = {
            x: d3.svg.axis().scale(x.scales.x).orient("bottom")
                 .ticks(d3.time.days, x.options.canvas.width < 300 ? 5 : 2),
            y: d3.svg.axis().scale(x.scales.y).orient("left")
                 .tickSize(-x.options.canvas.width, 0, 0)
                 .ticks(x.options.canvas.height < 200 ? 3 : 5)
                 .tickFormat(d3.format(",.0f"))
          }

        }
        return x
      })

}

