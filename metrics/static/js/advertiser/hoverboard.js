var buildHoverboard = function(wrapper) {
  var bubble_wrapper = wrapper
    .append("div")
    .classed("bubble-wrapper",true)

  var width, height;
      
  var buildSVG = function(wrapper) {
    var w = wrapper.node().getBoundingClientRect().width
    var margin = {top: 30, right: 30, bottom: 30, left: 50}
        width = w - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;
    
    
    var svg = wrapper.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    return svg
     
  }

  var buildBubblePlot = function(svg) {

    var data = svg.data()[0]['bubble_data']

    data.forEach(function(d) {
      d.y = +d.num_users;
      d.x = +d.avg_min_before_conv;
      d.z = d.tf_idf;
    });

    var x = d3.scale.linear()
        .range([0, width]);
    
    var z = d3.scale.sqrt()
        .range([0, 25]);
    
    var y = d3.scale.linear()
        .range([height, 0]);
    
    var color = d3.scale.category10();
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
     
  
    x.domain([0,d3.max(data.map(function(d){return d.x}))+2]).nice();
    y.domain(d3.extent(data, function(d) { return d.y; })).nice();
    z.domain([-150+d3.min(data.map(function(d){return d.z})),d3.max(data.map(function(d){return d.z}))]).nice();
  
    var tooltip = d3.select("body")
        .append("div")
        .classed("custom-tooltip",true)
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .text("a simple tooltip");
  
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
      .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Time before conversion");
  
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Number of Convertors")
  
    svg.selectAll(".dot")
        .data(data)
      .enter().append("circle")
        .attr("class", "dot")
        .attr("r", function(d) { return z(d.z); })
        .attr("cx", function(d) { return x(d.x); })
        .attr("cy", function(d) { return y(d.y); })
        .style("fill", function(d) { return color(d.parent_category); })
        .on("mouseover", function(d){tooltip.style("visibility", "visible"); tooltip.text(d.category); return})
        .on("mousemove", function(){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");});
  
    var legend = svg.selectAll(".legend")
        .data(color.domain())
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
  
    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);
  
    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });
  

  }

  var svg_wrapper = buildSVG(bubble_wrapper)
  buildBubblePlot(svg_wrapper)

  var buildBarSVG = function(wrapper) {
    console.log(wrapper)
    var w = wrapper.node().getBoundingClientRect().width 

    var margin = {top: 10, right: 10, bottom: 10, left: 170},
      width = w - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    var svg = wrapper.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .attr("data-width",width)
      .attr("data-height",height) 

    var tooltip = wrapper
      .append("div") 
      .classed("custom-tooltip",true) 
      .style("position", "absolute") 
      .style("z-index", "10") 
      .style("bottom","5px")
      .style("right","3px")
      .style("visibility", "hidden") 
      .text("a simple tooltip");  


    return svg
  }

  var transformCategory = function(data,name) {
  

    return d3.nest()
      .key(function(d){return d[name]})
      .rollup(function(d){
  
        var values = d3.entries(d[0]).filter(function(x) {return x.key == "num_users" || x.key == "tf_idf" || x.key == "population"})
        return values.map(function(x){
          return x
        })
      })
      .entries(data);
  }


  var buildBars = function(svg,name) {
    var width = svg.attr("data-width")
    var height = svg.attr("data-height") 
    var x = d3.scale.linear().range([0, width])
    var z = d3.scale.linear().range([0, width])
    var w = d3.scale.linear().range([0, width]) 
    var y = d3.scale.ordinal().rangeRoundBands([0, height], .05);
    
    var xAxis = d3.svg.axis().scale(x).orient("top");
    var yAxis = d3.svg.axis().scale(y).orient("left");

    var color = d3.scale.category20c();   

    var datum = svg.data()[0]['values']

    var data = transformCategory(datum,name)  
                          
    x.domain([0,d3.max(datum.map(function(x){return x.num_users}))]).nice();                                                                     
    z.domain([0,d3.max(datum.map(function(x){return x.tf_idf}))]).nice(); 
    w.domain([0,d3.max(datum.map(function(x){return x.population}))]).nice(); 
                                                                                                                                                 
    var xcalc = { 
      "tf_idf":z, 
      "num_users":x, 
      "population":w 
        
    }                                                                                                                                            
    
    var tf_idf_sum = datum.map(function(x){return x.tf_idf}).reduce(function(p,c){return p+c}) 
   
    y.domain(data.map(function(d) { return d.key; })); 
   
    var group = svg.selectAll(".bar-group") 
        .data(data) 
      .enter() 
        .append("g") 
        .attr("class","bar-group") 
   
    group 
      .on("mouseover", function(d){ 
        var tooltip = d3.select(svg[0].parentNode).selectAll(".custom-tooltip") 
        
        tooltip.style("visibility", "visible");  
        var asmap = d3.nest() 
          .key(function(x){return x.key}) 
          .rollup(function(x){return x[0].value}) 
          .map(d.values) 
   
        tooltip.html( 
          "<div>Conversions: " + asmap.num_users + "</div>" + 
          "<div>Category Importance: " + d3.format("%")((asmap.tf_idf+tf_idf_sum/10)/tf_idf_sum) + "</div>" 
        ) 
   
        return 
      }) 
      .on("mouseout", function(){
        var tooltip = d3.select(svg[0].parentNode).selectAll(".custom-tooltip") 
        
        return tooltip.style("visibility", "hidden");
      }); 
   
   
    group 
      .selectAll(".bar") 
        .data(function(x){return x.values}) 
        .enter() 
        .append("rect") 
          .attr("class", "bar positive") 
          .attr("x", function(d,i) { return xcalc[d.key](Math.min(0, d.value)); }) 
          .attr("y", function(d,i) { return y(this.parentNode.__data__.key) + i*(y.rangeBand()/3) }) 
          .attr("width", function(d) { return Math.abs(xcalc[d.key](d.value) - xcalc[d.key](0)); }) 
          .attr("height", y.rangeBand()/3) 
          .style("fill", function(d) { return color(d.key); }) 
          .text(function(x){return x.key}) 
   
    svg.append("g") 
        .attr("class", "x axis") 
   
    svg.append("g") 
        .attr("class", "y axis") 
        .call(yAxis)
  
    
  
  }


  d3.json('/hoverboard?meta=category&limit=15&format=json',function(data) {
  
  var bar_wrapper = wrapper.selectAll(".category-bar-wrapper")
    .data([{"values":data}])
    .enter()
      .append("div")
      .classed("col-md-4 bar-wrapper category-bar-wrapper",true)
      .append("div").classed("col-md-12 row",true) 

    bar_wrapper.append("div")
      .style("margin-top","15px")
      .classed("panel-heading",true)
      .append("h4")
      .classed("panel-title",true)
      .text("What categories are important?")

    var svg_bar_wrapper = buildBarSVG(bar_wrapper)

    buildBars(svg_bar_wrapper,"category")
 
  })

  d3.json('/hoverboard?meta=domain&limit=15&format=json',function(data) {
  
  var bar_wrapper = wrapper.selectAll(".domain-bar-wrapper")
    .data([{"values":data}])
    .enter()
      .append("div")
      .classed("col-md-4 domain-bar-wrapper bar-wrapper",true)
      .append("div").classed("col-md-12 row",true)  

    bar_wrapper.append("div")
      .style("margin-top","15px")
      .classed("panel-heading",true)
      .append("h4")
      .classed("panel-title",true)
      .text("What domains are important?")

    var svg_bar_wrapper = buildBarSVG(bar_wrapper)

    buildBars(svg_bar_wrapper,"domain")
 
  })

  d3.json('/hoverboard?meta=keyword&limit=15&format=json',function(data) {
  
  var bar_wrapper = wrapper.selectAll(".keyword-bar-wrapper")
    .data([{"values":data}])
    .enter()
      .append("div")
      .classed("col-md-4 keyword-bar-wrapper bar-wrapper",true)
      .append("div").classed("cold-md-12 row",true)

    bar_wrapper.append("div")
      .style("margin-top","15px")
      .classed("panel-heading",true)
      .append("h4")
      .classed("panel-title",true)
      .text("What keywords are important?")

    var svg_bar_wrapper = buildBarSVG(bar_wrapper)

    buildBars(svg_bar_wrapper,"keyword")
 
  })
   
 

} 
