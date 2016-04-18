(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
	typeof define === 'function' && define.amd ? define('components', ['exports', 'd3'], factory) :
	factory((global.components = {}),global.d3);
}(this, function (exports,d3) { 'use strict';

	d3 = 'default' in d3 ? d3['default'] : d3;

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

	function desc(target) {

	  var dimensions = this.dimensions(target)
	  var width = dimensions.width,
	    height = dimensions.width,
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

	function parent_dimension(target) {

	  var width = target.style("width").replace("px","").split(".")[0],
	    height = target.style("height").replace("px","").split(".")[0],
	    radius = Math.min(height, width) / 2;

	  return {
	    width: width,
	    height: height,
	    radius: Math.min(height, width) / 2
	  }
	}

	function dims(target) {

	  var stddim = parent_dimension.bind(this)(target),
	    width = stddim.width,
	    height = stddim.width, 
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

	function base(target) {

	  var dimensions = dims.bind(this)(target);
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

	function hover$1(cb) {
	  this._hover = (cb !== undefined && cb) ? cb : this._drawDesc
	}

	function colors(cb) {
	  this._colors = cb
	}

	function data$1(cb, key) {
	  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
	  this._keyFunc = key ? key : function(x) {return x}
	}

	Pie.prototype = {
	  dimensions: parent_dimension,
	  base: base,
	  desc: desc,
	  draw: draw,
	  hover: hover$1,
	  colors: colors,
	  data: data$1
	}

	function d3_splat(target,selector,type,data,joiner) {
	  var type = type || "div"
	  var updateable = target.selectAll(selector).data(
	    data || function(x){return x},
	    joiner || function(x){return x}
	  )

	  updateable.enter()
	    .append(type)

	  return updateable
	}

	function dims$1(target) {
	  var dimensions = parent_dimension.bind(this)(target)
	  var margin = this.margins()

	  var canvasHeight = dimensions.height || undefined,
	      canvasWidth = dimensions.width || undefined;

	  var width = (dimensions.width|| 100) - margin.left - margin.right,
	      height = (dimensions.height|| 100) - margin.top - margin.bottom;

	  return {
	    svg: { width: canvasWidth, height: canvasHeight },
	    canvas: { width: width, height: height },
	    margin: margin
	  }
	  
	}

	function base$1(target) {

	    var margin = this.margins()
	    var dimensions = dims$1.bind(this)

	    var svg = d3_splat(target,"." + this._class, "svg",function(x){return x},function(x){return x.key ? x.key : x})
	      .classed(this._class,true)
	      .datum(function(x) {
	        if (typeof(x) !== "object") throw "wrong data type. requires object";
	        x.options = dimensions(d3.select(this.parentNode))
	        return x
	      })

	    svg
	      .attr("width", function(d){ return d.options.svg.width })
	      .attr("height", function(d){ return d.options.svg.height})

	    var g = d3_updateable(svg,"g.canvas","g")
	      .attr("class","canvas")
	      .attr("transform", function(x) {
	        return "translate(" + x.options.margin.left + "," + x.options.margin.top + ")"
	      });

	}

	function accessor(attr, val) {
	  if (val === undefined) return this["_" + attr]
	  this["_" + attr] = val
	  return this
	}

	function scales(target) {

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

	function axis(target) {

	  var canvas = target.selectAll("svg > g")

	  var xAxis = d3_updateable(canvas,".x.axis","g")
	    .attr("class", "x axis")
	    .attr("transform", function(x) { return "translate(0," + x.options.canvas.height + ")"})
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

	function draw$1(target) {

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
	      
	  if (this.hover()) point.on("mouseover",this.hover())


	  if(false && typeof hide_axis !== typeof undefined && hide_axis == true) {
	    svg.select(".x.axis").style('display', 'none')
	    svg.select(".y.axis").selectAll("text").style('display', 'none')
	  }

	}

	function Line(target) {
	  this._target = target
	  this._class = "timeseries"

	  this._dataFunc = function(x) { return x }
	  this._keyFunc = function(x) { return x }
	  this._margin = {top: 10, right: 50, bottom: 30, left: 50}

	  this._base = this.base(target)
	  scales(target)
	}

	function line(target){
	  return new Line(target)
	}

	function hover$2(cb) {
	  if ((cb == undefined) || (typeof(cb) == "function")) {
	    return accessor.bind(this)("hover",cb)
	  }
	}

	function data$2(cb, key) {
	  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
	  this._keyFunc = key ? key : function(x) {return x}
	}

	Line.prototype = {
	  draw: function() {
	    axis.bind(this)(this._target)
	    return draw$1.bind(this)(this._target)
	  },
	  dimensions: parent_dimension,
	  base: base$1,
	  hover: hover$2,
	  data: data$2,
	  margins: function(x) { 

	    var current = accessor.bind(this)("margin")
	    if (x === undefined) return current;
	    if ( (typeof(x) !== "object") && (x !== undefined) ) throw "wrong type";

	    Object.keys(current).map(function(k){
	      current[k] = x[k] || current[k]
	    })

	    return accessor.bind(this)("margin",current) 
	  }
	}

	function dims$2(target) {
	  var dimensions = parent_dimension.bind(this)(target)
	  var margin = this.margins()

	  var canvasHeight = dimensions.height || undefined,
	      canvasWidth = dimensions.width || undefined;

	  var width = (dimensions.width|| 100) - margin.left - margin.right,
	      height = (dimensions.height|| 100) - margin.top - margin.bottom;

	  return {
	    svg: { width: canvasWidth, height: canvasHeight },
	    canvas: { width: width, height: height },
	    margin: margin,
	    
	  }
	  
	}

	function base$2(target) {

	    var margin = this.margins()
	    var dimensions = dims$2.bind(this)

	    var svg = d3_splat(target,"." + this._class, "svg",function(x){return x},function(x){return x.key ? x.key : x})
	      .classed(this._class,true)
	      .datum(function(x) {
	        if (typeof(x) !== "object") throw "wrong data type. requires object";
	        x.options = dimensions(d3.select(this.parentNode))
	        return x
	      })

	    svg
	      .attr("width", function(d){ return d.options.svg.width })
	      .attr("height", function(d){ return d.options.svg.height})

	    var g = d3_updateable(svg,"g.canvas","g")
	      .attr("class","canvas")
	      .attr("transform", function(x) {
	        return "translate(" + x.options.margin.left + "," + (x.options.canvas.height/2 + x.options.margin.top) + ")"
	      });

	}

	function scales$1(target) {

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

	function axis$1(target) {

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

	function draw$2(target) {

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

	function Bar(target) {
	  this._target = target
	  this._class = "timeseries"

	  this._dataFunc = function(x) { return x }
	  this._keyFunc = function(x) { return x }
	  this._margin = {top: 10, right: 50, bottom: 30, left: 50}

	  this._series = ["value"]

	  this._base = this.base(target)
	}

	function bar(target){
	  return new Bar(target)
	}

	function hover$3(cb) {
	  if ((cb == undefined) || (typeof(cb) == "function")) {
	    return accessor.bind(this)("hover",cb)
	  }
	}

	function data$3(cb, key) {
	  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
	  this._keyFunc = key ? key : function(x) {return x}
	}

	Bar.prototype = {
	  draw: function() {

	    scales$1.bind(this)(this._target)
	    axis$1.bind(this)(this._target)
	    return draw$2.bind(this)(this._target)
	  },
	  series: function(x) {
	    return accessor.bind(this,"series")(x)
	  },
	  dimensions: parent_dimension,
	  base: base$2,
	  hover: hover$3,
	  data: data$3,
	  margins: function(x) { 

	    var current = accessor.bind(this)("margin")
	    if (x === undefined) return current;
	    if ( (typeof(x) !== "object") && (x !== undefined) ) throw "wrong type";

	    Object.keys(current).map(function(k){
	      current[k] = x[k] || current[k]
	    })

	    return accessor.bind(this)("margin",current) 
	  }
	}

	function draw$3() {
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

	        var a1 = 1;
	        var a2 = -25;
	        var b1 = 70;
	        var b2 = -25;
	        var c1 = 70;
	        var c2 = -5;
	        var d1 = 7;
	        var d2 = -5;
	        var e1 = 1;
	        var e2 = 2;

	        var a = (a1 + 75) + ',' + (a2 + (i * bar_height));
	        var b = (b1 + 75) + ',' + (b2 + (i * bar_height));
	        var c = (c1 + 75) + ',' + (c2 + (i * bar_height));
	        var d = (d1 + 75) + ',' + (d2 + (i * bar_height));
	        var e = (e1 + 75) + ',' + (e2 + (i * bar_height));

	        d3.select(d3.select(this)[0][0].parentElement).select('.histogram-tooltip polygon')
	          .attr('y', function() {
	            return -(bar_height + 5) + (i * bar_height);
	          })
	          .attr('points', a + ' ' + b + ' ' + c + ' ' + d + ' ' + e)


	        d3.select(d3.select(this)[0][0].parentElement).select('.histogram-tooltip text')
	          .attr('y', function() {
	            return -11 + (i * bar_height);
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
	      .append('polygon')
	      .attr('fill', '#fff')
	      .attr('width', '16')
	      .attr('height', '10')
	      .attr('fill-opacity', '.9')
	      .attr('style', 'stroke: black;')

	    tooltip
	      .append('text')
	      .attr('x', '110')
	      .attr('fill', '#000')
	      .attr('text-anchor', 'middle')
	      .text('4')
	  }
	}

	function base$3(target) {
	  var svg = d3_updateable(target, '.vendor-histogram', 'svg')
	    .classed('vendor-histogram', true)
	    .style('width', '100%');

	  svg.exit().remove()

	  return {
	    svg: svg
	  };
	}

	function Histogram(target) {
	  this._target = target;
	  this._base = this.base(target);
	  this._dataFunc = function(x) { return x };
	  this._keyFunc = function(x) { return x };
	}

	function data$4(cb, key) {
	  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
	  this._keyFunc = key ? key : function(x) {return x}

	  return this;
	}

	Histogram.prototype = {
	  base: base$3,
	  data: data$4,
	  draw: draw$3
	}

	function histogram(target) {
	  return new Histogram(target);
	}

	function draw$4() {
	  // Get data
	  var data = this._dataFunc();

	  /*
	    Draw head
	  */
	  var table_head_wrapper = d3_updateable(this._base, '.table_head', 'thead')
	    .classed('table_head', true);

	  var table_head_row = d3_updateable(table_head_wrapper, '.table_head_row', 'tr')
	    .classed('table_head_row', true);

	  var table_head_columns = d3_splat(table_head_row, '.table_head_column', 'th', data['header'], function(x){ return x.key })
	    .classed('table_head_column', true)
	    .text(function(x) {
	      return x.title;
	    })
	    .style('cursor', 'pointer')
	    .on('click', function(e) {
	      if (e.key == data.sortColumn) {
	        data.sortDirection = !data.sortDirection;
	      }

	      data.sortColumn = e.key;

	      table_body_rows
	        .sort(function(x,y) {
	          // debugger;
	          if(typeof x[data.sortColumn] == typeof 0) {
	            if(data.sortDirection) {
	              return x[data.sortColumn] - y[data.sortColumn];
	            } else {
	              return y[data.sortColumn] - x[data.sortColumn];
	            }
	          } else {
	            if(data.sortDirection) {
	              return d3.ascending(y[data.sortColumn], x[data.sortColumn]);
	            } else {
	              return d3.descending(y[data.sortColumn], x[data.sortColumn]);
	            }
	          }
	        })
	        .datum(function(x){
	          return x;
	        });
	      // draw();
	      // debugger;
	    })

	  /*
	    Draw body
	  */
	  var table_body_wrapper = d3_updateable(this._base, '.table_body', 'tbody')
	    .classed('table_body', true);

	  // Loop through rows
	  var table_body_rows = d3_splat(table_body_wrapper, '.table_body_row', 'tr', data['body'], function(x){ return x.key })
	    .classed('table_body_row', true)
	    .datum(function(x){
	      return x;
	    });

	  // Loop through columns
	  var table_body_columns = d3_splat(table_body_rows, '.table_body_column', 'td', data['header'], function(x){ return x.key })
	    .classed('table_body_column', true)
	    .html(function(x, i) {
	      var row_data = d3.select(this.parentElement).data()[0];
	      var column_value = row_data[x.key];

	      if(typeof x.href !== typeof undefined && x.href == true) {

	        var text = (row_data[x.key].length > 100) ? column_value.slice(0,100) : column_value;
	        if (row_data.title) {
	          text = row_data.title;
	        }
	        column_value = '<a href="' + column_value + '" target="_blank">' + text + '</a>';
	      }

	      return column_value;
	    });
	}

	function base$4(target) {
	  var table = d3_updateable(target, '.table', 'table')
	    .classed('table', true);

	  table.exit().remove()

	  return table;
	}

	function Table(target) {
	  this._target = target
	  this._base = this.base(target)

	  this._dataFunc = function(x) { return x }
	  this._keyFunc = function(x) { return x }
	}

	function table(target){
	  return new Table(target)
	}

	function data$5(cb, key) {
	  this._dataFunc = (typeof(cb) == "function") ? cb : function() {return cb};
	  this._keyFunc = key ? key : function(x) {return x}

	  return this;
	}

	Table.prototype = {
	  base: base$4,
	  draw: draw$4,
	  data: data$5
	}

	function draw$5() {
	  var popup_title = d3_updateable(this._base, '.info-popup-title', 'h3')
	    .classed('info-popup-title', true)
	    .text(this._title);

	  var popup_content = d3_updateable(this._base, '.info-popup-content', 'p')
	    .classed('info-popup-content', true)
	    .text(this._content)
	}

	function base$5(target) {
	  d3.select('.info-popup').remove();

	  var popup = d3_updateable(target, '.info-popup', 'div')
	    .classed('info-popup', true)
	    .style('margin-left', function(x) {
	      var margin = 100 - (x.title.length * 3)
	      return '-' + margin + 'px';
	    })

	  setTimeout(function() {
	    d3.select('body').on('click', function(e) {
	      if (d3.event.target.className !== 'info-popup' && d3.event.target.parentElement.className !== 'info-popup') {
	        d3.select('.info-popup').remove();
	        d3.select('body').on('click', null);
	      }
	    });
	  }, 10);

	  return popup;
	}

	function Popup(target) {
	  this._target = target
	  this._base = this.base(target)
	  this._title = '';
	  this._content = '';
	}

	function popup(target) {
	  if (d3.select('.info-popup')[0][0] == null) {
	    return new Popup(target)
	  }
	}

	function title(value) {
	  this._title = value;

	  return this;
	}

	function content(value) {
	  this._content = value;

	  return this;
	}

	Popup.prototype = {
	  base: base$5,
	  draw: draw$5,
	  title: title,
	  content: content
	}

	var version = "0.0.1";

	exports.version = version;
	exports.pie = pie;
	exports.line = line;
	exports.bar = bar;
	exports.histogram = histogram;
	exports.accessor = accessor;
	exports.table = table;
	exports.popup = popup;

}));