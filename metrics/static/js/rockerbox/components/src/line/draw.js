import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'
import {default as dims} from './dimensions'


function draw(target) {

  var canvas = target.selectAll(".canvas")

  var line = d3_updateable(canvas,".line","path")
    .attr("class","line")
    .attr("d",function(x) { return x.line(x.values) })

  var area = d3_updateable(canvas,".area","path")
    .attr("class","area")

    .attr("d",function(x) { return x.area(x.values) })

  var points= d3_updateable(canvas,".points","g")
    .attr("class","points")

  var point = d3_splat(points,".point","svg:circle",function(x){ return x.values},function(x){return x.key})
    .attr("class","point")
   
  point.exit().remove()

  point
    .attr("fill", function(d, i) { return d.action ? "red" : "steelblue" })
    .attr("cx", function(d, i) { 
      var x = this.parentNode.__data__.scales.x
      return x(d.key) 
    })
    .attr("cy", function(d, i) { 
      var y = this.parentNode.__data__.scales.y
      return y(d.value) 
    })
    .attr("r", function(d, i) { return 3 })

   
    

      
  if (false && hover) points.on("mouseover",hover)

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

export default draw;
