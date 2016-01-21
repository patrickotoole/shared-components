(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('pie', ['exports'], factory) :
  factory((global.pie = {}));
}(this, function (exports) { 'use strict';

  function d3_updateable(target,selector,type,data,joiner) {
    var type = type || "div"
    var updateable = target.selectAll(selector).data(
      function(x){return data ? [data] : [x]},
      joiner || function(x){return [x]}
    )

    updateable.enter()
      .append(type)

    return updateable
  }

  function draw (target,format,key,hover,colors) {

    var target = target ? target: this._target,
      format = format ? format: this._dataFunc,
      key = key ? key: this._keyFunc,
      hover = hover ? hover: this._hover,
      colors = colors ? colors: this._colors;

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
      .text(key)

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

  function desc(target) {

    var dimensions = this.dimensions(target)
    var width = dimensions.width,
      height = dimensions.height,
      radius = dimensions.radius

    var svg = d3_updateable(target,"svg","svg");
    var desc = d3_updateable(svg,".desc","g").classed("desc",true)

    desc.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
      .style("fill","#5A5A5A")

    var drawDesc = function(y) {

      d3_updateable(desc,".num-domains","text")
        .classed("num-domains",true)
        .attr("dy","-.35em")
        .style("text-anchor","middle")
        .style("font-size","2.3em")
        .style("font-weight","bold")
        .text(function(x) {
          var selected = y ? y.data.label : true
          var domains = x.domains ? x.domains.filter(function(z){
            return selected === true ? true : z.parent_category_name == selected
          }) : []
          return domains.length ? d3.format(",")(domains.length) : ""
        })

      d3_updateable(desc,".domain-desc","text")
        .classed("domain-desc",true)
        .attr("dy",".35em")
        .style("text-anchor","middle")
        .style("font-weight","500")
        .text(function(x) {return x.domains ? "domains" : ""})

      var num_users = d3_updateable(desc,".num-users","g")
        .classed("num-users",true)
        .attr("dy","1.35em")
        .style("text-anchor","middle")
        .style("font-size","1.75em")
        .style("font-weight","bold")
        

      d3_updateable(num_users,".num","text")
        .classed("num",true)
        .attr("dy","1.35em")
        .text(function(x) {
          var selected = y ? y.data.label : true
          var domains = x.domains ? x.domains.filter(function(z){
            return selected === true ? true : z.parent_category_name == selected
          }) : []
          return domains.length ? d3.format(",")(domains.reduce(function(p,c){return p + c.count},0)) : ""
        })

      var user_text = d3_updateable(num_users,".desc","text")
        .classed("desc",true)
        .attr("dy","1.85em")
        .style("font-weight","normal")
        .style("padding-left","5px")

      d3_updateable(user_text,"tspan","tspan")
        .style("font-size","0.5em")
        .text(function(x) {return x.domains ? "uniques" : ""})
    }

    

    return drawDesc

  }

  function base(target) {

    var dimensions = this.dimensions(target);
    var width = dimensions.width,
      height = dimensions.height,
      radius = dimensions.radius,
      _pie = dimensions.pie,
      arc = dimensions.arc,
      outerArc = dimensions.outerArc

    var svg = d3_updateable(target,"svg","svg");
    svg.classed("",function(x){ x.dimensions = dimensions })


    var translateCenter = function(x) {
      return "translate(" + x.dimensions.width / 2 + "," + x.dimensions.height / 2 + ")"
    }

    svg.attr("transform", translateCenter);
    svg.style("margin-left","-15px")
      .attr("width",function(x){return x.dimensions.width})
      .attr("height",function(x){return x.dimensions.height})

    var slices = d3_updateable(svg,".slices","g").classed("slices",true),
      labels = d3_updateable(svg,".labels","g").classed("labels",true),
      lines = d3_updateable(svg,".lines","g").classed("lines",true),
      circles = d3_updateable(svg,".circles","g").classed("circles",true)


    slices.attr("transform", translateCenter);
    labels.attr("transform", translateCenter);
    lines.attr("transform", translateCenter);
    circles.attr("transform", translateCenter);


    

    return {
      svg: svg,
      pie: _pie,
      arc: arc,
      outerArc: arc
    }

  }

  function dimensions(target) {
    var width = target.style("width").replace("px","").split(".")[0],
      height = width,
      radius = Math.min(height, width) / 2;

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

  function Pie(target) {
    this._target = target
    this._base = this.base(target)
    this._drawDesc = this.desc(target)

    this._hover = this._drawDesc
    this._colors = function() {return "grey" }
    this._dataFunc = function(x) { return x }
    this._keyFunc = function(x) { return x }

  }

  function pie(target){
    return new Pie(target)
  }

  function hover(cb) {
    this._hover = (cb !== undefined && cb) ? cb : this._drawDesc
  }

  function colors(cb) {
    this._colors = cb
  }

  function data(cb, key) {
    this._dataFunc = cb
    this._keyFunc = key ? key : function(x) {return x}
  }

  Pie.prototype = {
    dimensions: dimensions,
    base: base,
    desc: desc,
    draw: draw,
    hover: hover,
    colors: colors,
    data: data
  }

  var version = "0.0.1";

  exports.version = version;
  exports.pie = pie;

}));
