import d3_updateable from './d3_updateable'

export default function (target,format,key,hover,colors) {

  var target = target ? target: this._target,
    format = format ? format: this._dataFunc,
    key = key ? key: this._keyFunc,
    colors = colors ? colors: this._colors;


  this._hover = hover ? hover: this._hover;

  var svg = d3_updateable(target,"svg","svg");
  var that = this;

  var innerCircle = d3_updateable(svg.select(".circles"),".inner-circle","circle")
    .classed("inner-circle",true)
    .style("fill", "none")
    .style("stroke", "black")
    .style("stroke-width", ".6")
    .style("stroke-opacity", function(x){return x.domains ? "0.25" : "0"})
    .attr("r", function(x){return x.dimensions.radius * 0.4 + .3});

  var outerCircle = d3_updateable(svg.select(".circles"),".outer-circle","circle")
    .classed("outer-circle",true)
    .style("fill", "none")
    .style("stroke", "black")
    .style("stroke-width", ".6")
    .style("stroke-opacity", function(x){return x.domains ? "0.25" : "0"})
    .attr("r", function(x){return x.dimensions.radius * 0.8 - .3});


  var slice = svg.select(".slices").selectAll("path.slice")
    .data(function(x){ return x.dimensions.pie(format(x)) }, key);

  slice.enter()
    .insert("path")
    .style("fill", function(d) { return d.data.label == "NA" ? "#f6f6f6" : colors(d.data.label); })
    .attr("class", "slice");

  slice    
    .transition().duration(1000)
    .attrTween("d", function(d) {
      this._current = this._current || d;
      var interpolate = d3.interpolate(this._current, d);
      this._current = interpolate(0);
      var arc = this.parentElement.__data__.dimensions.arc
      return function(t) {
        return arc(interpolate(t));
      };
    })
  slice
    .on("mouseover",function(x){
      text.classed("hidden",true)
      polyline.classed("hidden",true)

      text.filter(function(y) {return x.data.label == y.data.label}).classed("hidden",false)
      polyline.filter(function(y) {return x.data.label == y.data.label}).classed("hidden",false)
      that._hover(x)

    })

  slice.exit()
    .remove();

  /* ------- TEXT LABELS -------*/

  var text = svg.select(".labels").selectAll("text")
    .data(function(x){ return x.dimensions.pie(format(x)) }, key);

  text.enter()
    .append("text")
    .attr("dy", "-.35em")
    .style("fill", "#5a5a5a")
    .text(key);

  text
    .classed("hidden",true)
    
  
  function midAngle(d){
    return d.startAngle + (d.endAngle - d.startAngle)/2;
  }

  text.transition().duration(1000)
    .attrTween("transform", function(d) {
      this._current = this._current || d;
      var interpolate = d3.interpolate(this._current, d);
      this._current = interpolate(0);

      var outerArc = this.parentElement.__data__.dimensions.outerArc
      var radius = this.parentElement.__data__.dimensions.radius;
      var arc = this.parentElement.__data__.dimensions.arc;

      return function(t) {
        var d2 = interpolate(t);
        var pos = outerArc.centroid(d2);
        pos[0] = (radius-5) * (midAngle(d2) < Math.PI ? 1 : -1);
        return "translate("+ pos +")";
      };
    })
    .styleTween("text-anchor", function(d){
      this._current = this._current || d;
      var interpolate = d3.interpolate(this._current, d);
      this._current = interpolate(0);
      return function(t) {
        var d2 = interpolate(t);
        return midAngle(d2) > Math.PI ? "start":"end";
      };
    });


  text.exit()
    .remove();

  /* ------- SLICE TO TEXT POLYLINES -------*/

  var polyline = svg.select(".lines").selectAll("polyline")
    .data(function(x){ return x.dimensions.pie(format(x)) }, key);
  
  polyline.enter().append("polyline");
  polyline.classed("hidden",true)

  polyline.transition().duration(1000)
    .attrTween("points", function(d){
      this._current = this._current || d;
      var interpolate = d3.interpolate(this._current, d);
      this._current = interpolate(0);
      var outerArc = this.parentElement.__data__.dimensions.outerArc;
      var radius = this.parentElement.__data__.dimensions.radius;
      var arc = this.parentElement.__data__.dimensions.arc;

      return function(t) {
        var d2 = interpolate(t);
        var pos = outerArc.centroid(d2);
        pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
        return [arc.centroid(d2), outerArc.centroid(d2), pos];
      };      
    });
  
  polyline.exit()
    .remove();

  this._drawDesc()
}
