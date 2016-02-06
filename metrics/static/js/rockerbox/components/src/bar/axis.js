import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'


export default function(target) {

  var canvas = target.selectAll("svg > g")

  var xAxis = d3_updateable(canvas,".x.axis","g")
    .attr("class", "x axis")
    .attr("transform", function(x) { return "translate(0," + x.scales.y(0) + ")"})
    .call(function(x){
      x.each(function(d) {
        d.axis.x.bind(this)(d3.select(this))
      })
    });

  xAxis.selectAll("text").filter(function(x){return this.innerHTML.length > 6})
    .attr("y",10)

  var yAxis = d3_updateable(canvas,".y.axis","g")
    .attr("class", "y axis")

  yAxis.selectAll("text.y-label").remove()

  yAxis
    .call(function(x){
      x.each(function(d) {
        d.axis.y.bind(this)(d3.select(this))
      })
    })
    .append("text")
    .attr("x",-10)
    .attr("x", 0)
    .attr("dy", ".71em")
    .style("text-anchor", "start")
    .classed("y-label",true)

  yAxis.selectAll(".tick > text")
    .attr("x",-10)

}

