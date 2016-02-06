import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'
import {default as dims} from './dimensions'


function draw(target) {

  var self = this;
  var canvas = target.selectAll(".canvas")

  this._series.map(function(series) {

    var bars = d3_updateable(canvas,".bars." + series,"g")
      .attr("class","bars " + series)

    var point = d3_splat(bars,".bar","rect",function(x){ return x.values},function(x){return x.key})
      .attr("class","bar")
      .attr("x", function(d, i) {
        var x = this.parentNode.__data__.scales.x
        var width = this.parentNode.__data__.unit_width

        return x(d.key) - width/2
      })
      .attr("y", function(d, i) {
        var y = this.parentNode.__data__.scales.y
        return Math.min(y(d[series]), y(0))
      })
      .attr("width",function(d){
        var width = this.parentNode.__data__.unit_width
        return Math.max(width,5)
      })
      .attr("height", function(d) { 
        var y = this.parentNode.__data__.scales.y
        return Math.abs(y(d[series]) - y(0)); 
      })
      

    //var points= d3_updateable(canvas,".points." + series,"g")
    //  .attr("class","points " + series)

    //var point = d3_splat(points,".point","svg:circle",function(x){ return x.values},function(x){return x.key})
    //  .attr("class","point")
    // 
    //point.exit().remove()

    //point
    //  .attr("fill", function(d, i) { return d.action ? "red" : "steelblue" })
    //  .attr("cx", function(d, i) { 
    //    var x = this.parentNode.__data__.scales.x
    //    return x(d.key) 
    //  })
    //  .attr("cy", function(d, i) { 
    //    var y = this.parentNode.__data__.scales.y
    //    return y(d[series]) 
    //  })
    //  .attr("r", function(d, i) { return 3 })
        
    if (self.hover()) point.on("mouseover", self.hover())


  })


}

export default draw;
