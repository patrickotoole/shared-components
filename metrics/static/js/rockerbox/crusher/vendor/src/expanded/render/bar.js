function autoSize(wrap,adjustWidth,adjustHeight) {

  function elementToWidth(elem) {
    var num = wrap.style("width").split(".")[0].replace("px","")
    return parseInt(num)
  }

  function elementToHeight(elem) {
    var num = wrap.style("height").split(".")[0].replace("px","")
    return parseInt(num)
  }

  var w = elementToWidth(wrap) || 700,
    h = elementToHeight(wrap) || 340;

  w = adjustWidth(w)
  h = adjustHeight(h)

  var margin = {top: 40, right: 10, bottom: 30, left: 10},
      width  = w - margin.left - margin.right,
      height = h - margin.top - margin.bottom;

  return {
    margin: margin,
    width: width,
    height: height
  }
}

export default function(vendor_data_columns) {

  var all_vendor_domains_bar_column = d3_updateable(vendor_data_columns, '.vendor-domains-bar-column', 'div')
    .classed('vendor-domains-bar-column col-lg-3 col-md-6', true)

  var vendor_domains_bar_column = all_vendor_domains_bar_column.filter(function(x){return x.domains !== typeof undefined})


  var desc = d3_updateable(vendor_domains_bar_column,".vendor-domains-bar-desc","div")
    .classed("vendor-domains-bar-desc",true)
    .style("display","inherit")

  d3_updateable(desc, "h3","h3")
    .text("Categories")

  d3_updateable(desc, ".chart-description","p")
    .classed("chart-description",true)
    .text("A category breakdown for off-site activity.")

  var vendor_domains_bar = d3_updateable(vendor_domains_bar_column, '.vendor-domains-bar', 'div')
    .classed('col-md-12 row vendor-domains-bar', true)
    .style('padding', '0px')
    .style("text-align","center")

  vendor_domains_bar.datum(function(x) {

    if (x.parentCategoryData == undefined && x.domains) {

      var category_data = x.domains.reduce(function(p,domain){
        var category = domain.parent_category_name

        p[category] = p[category] || 0
        p[category] += domain.count

        return p
      },{})

      var parentCategoryData = d3.entries(category_data)
        .map(function(c) { return { label: c.key, value: c.value } })

      x.parentCategoryData = parentCategoryData

    }

    return x;
  })

  var self = this;

  vendor_domains_bar.each(function(y){

    var target = d3.select(this)
      .datum(y.parentCategoryData)


    if (target.datum()) {
      var wrapper = d3.select(target.node().parentNode)

      var summed = d3.sum(target.datum(),function(x){return x.value})
      target.datum(function(x){
        x.map(function(y){y.value = y.value/summed})
        return x.filter(function(y){return y.value > .02})
      })


      var data = target.datum();

      var _sizes = autoSize(wrapper,function(d){return d -50}, function(d){return 500}),
        margin = _sizes.margin,
        width = _sizes.width,
        height = _sizes.height
  
      var x = d3.scale.linear()
          .range([0, width]);
  
      var y = d3.scale.ordinal()
          .rangeRoundBands([0, height], .2);

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient("top");
  
      var svg = target.append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + 0 + ")");



      var values = target.datum().map(function(x){ return x.value })

      x.domain(d3.extent([
          d3.min(values)-.1,d3.max(values)+.1,-d3.min(values)+.1,-d3.max(values)-.1
        ],
        function(x) { return x}
      )).nice();

      y.domain(data.map(function(d) { return d.label; }));

      svg.selectAll(".bar")
          .data(function(x){return x})
        .enter().append("rect")
          .attr("class", function(d) { return d.value < 0 ? "bar negative" : "bar positive"; })
          .attr("x", function(d) { return x(Math.min(0, d.value)); })
          .attr("y", function(d) { return y(d.label); })
          .attr("width", function(d) { return Math.abs(x(d.value) - x(0)); })
          .attr("height", y.rangeBand())
          .style("cursor", "pointer")
          .on("click", function(x) {
            self._click.bind(this)(x,self)
          })

      svg.selectAll(".label")
          .data(function(x){return x})
        .enter().append("text")
          .attr("x", function(d) { return d.value < 0 ? x(0) + 6: x(0) -6; })
          .attr("style", function(d) { 
            return d.value < 0 ? 
              "text-anchor:start;dominant-baseline: middle;" : 
              "text-anchor:end;dominant-baseline: middle;"; 
          })
          .attr("y", function(d) { return y(d.label) + y.rangeBand()/2 + 1; })
          .text(function(d) { return d.label; })

      svg.selectAll(".label")
          .data(function(x){return x})
        .enter().append("text")
          .attr("x", function(d) { return d.value < 0 ?
            x(d.value) - 35:
            x(d.value) + 35;
          })
          .attr("style", function(d) { 
            return d.value < 0 ? 
              "text-anchor:start;dominant-baseline: middle;font-size:.9em" : 
              "text-anchor:end;dominant-baseline: middle;font-size:.9em"; 
          })
          .attr("y", function(d) { return y(d.label) + y.rangeBand()/2 + 1; })
          .text(function(d) {
            var v = d3.format("%")(d.value);
            var x = (d.value > 0) ?  "↑" : "↓"
            return "(" + v + x  + ")"
          })

      svg.append("g")
          .attr("class", "y axis")
        .append("line")
          .attr("x1", x(0))
          .attr("x2", x(0))
          .attr("y2", height);

      console.log("CAT",data)

      var button = d3_updateable(target,".button","div")
        .classed("button btn btn-success",true)
        .text("All Categories")
        .on("click",function(x) {
          self._click.bind(this)(x,self)
        })

    }

  });
}
