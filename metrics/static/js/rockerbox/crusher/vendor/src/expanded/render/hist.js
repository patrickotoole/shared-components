export default function histogram(target,title,frequency_func,times_func) {

  var self = this;
  var data = target.datum()
  var _colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"]
  var colors = _colors


  data.map(function(x) {
    x.timeunit = ( (parseInt(x.hour)  - 4) % 24 ) 
    x.timeunit = x.timeunit < 0 ? 24 + x.timeunit : x.timeunit
    x.timeunit += 1
    x.timeunit = (x.timeunit*60 + x.minute)/60
    x.frequency = frequency_func(x)
  })

  var times = data.map(times_func)
  var maxWidth = 600

  var margin = {top: 20, right: 10, bottom: 20, left: 10},
      width = maxWidth - margin.left - margin.right,
      height = 140 - margin.top - margin.bottom,
      gridSize = Math.floor(width / 24 / 3);

  var l = Array.apply(null, Array(Object.keys(times).length)).map(function (_, i) {return i+1;});
  var x = d3.scale.ordinal().range(l);
  var y = d3.scale.linear().range([height, 0]);

  var colorScale = d3.scale.quantile()
    .domain([0, d3.max(data, function (d) { return d.frequency; })])
    .range(colors);

  //colorScale = _colors || colorScale

  var desc = d3_updateable(target,".vendor-domains-bar-desc","div")
    .classed("vendor-domains-bar-desc",true)
    .style("display","inherit")

  d3_updateable(desc, "h3","h3")
    .text(title)



  var _base = target

  var _svg = _base.selectAll(".bar-top").data([0],function(x){ return x })

  _svg.enter().append("svg")
    .attr("class","bar-top")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    

  _svg.exit().remove()

  var svg = _svg.selectAll("g.bar-top").data([data],function(x){ return JSON.stringify(x) })

  svg.enter()
      .append("g")
      .attr("class","bar-top")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.exit().remove()

  _svg.on("click",function(){
      d3.event.target
      self._timing = undefined;
      var cats = self._categories;

      var check_categories = (Object.keys(cats).length) ? 
        function(y) {return cats[y.parent_category_name] > -1 } :
        function() {return true};

      var check_time = self._timing ? 
        function(y) {return self._timing == ((y.hour*60 + y.minute)/60) } :
        function(){return true}

      self._table_filter = function(y) {
        return check_categories(y) && check_time(y)
      } 
      self._data
      self.draw()      
    })

  

  x.domain(data.map(function(d) { return d.timeunit }));
  y.domain([0, d3.max(data, function(d) { return Math.sqrt(d.frequency); })]);

  svg.selectAll(".timing-bar")
      .data(data)
    .enter().append("rect")
      .attr("class", "timing-bar")
      .attr("x", function(d) { return ((d.timeunit - 1) * gridSize * 3); })
      .attr("width", gridSize)
      .attr("y", function(d) { return y(Math.sqrt(d.frequency)); })
      .attr("fill","#aaa")
      .attr("fill",function(x) { return colorScale(x.frequency) } )
      .attr("stroke","white")
      .attr("stroke-width","1px")
      .attr("height", function(d) { return height - y(Math.sqrt(d.frequency)); })
      .style("opacity","1")
      .on("click",function(x){
        d3.event.stopPropagation()
        var cats = self._categories;

        self._timing = x.timeunit

        var check_categories = (Object.keys(cats).length) ? 
          function(y) {return cats[y.parent_category_name] > -1 } :
          function() {return true};

        var check_time = self._timing ? 
          function(y) {debugger; return self._timing == ((y.hour*60 + y.minute)/60) } :
          function(){return true}

        self._table_filter = function(y) { return check_categories(y) && check_time(y) } 
        self.draw()
        var that = this

        self._wrapper.selectAll(".timing-bar")
          .style("opacity",".7")
          .filter(function(d){ return d == x})
          .attr("fill",function(x) { return colorScale(x.frequency) } )
          .style("opacity","1")

        return false
      })

  var z = d3.time.scale()
    .range([0, width])
    .nice(d3.time.hour,24)
    

  var xAxis = d3.svg.axis()
    .scale(z)
    .ticks(3)
    .tickFormat(d3.time.format("%I %p"));

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

}
