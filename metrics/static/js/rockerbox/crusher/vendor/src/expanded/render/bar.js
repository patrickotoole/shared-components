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

  var margin = {top: 40, right: 10, bottom: 30, left: 0},
      width  = w - margin.left - margin.right,
      height = h - margin.top - margin.bottom;

  return {
    margin: margin,
    width: width,
    height: height
  }
}

function drawDesc(wrap) {

  var desc = d3_updateable(wrap,".desc","div")
    .classed("desc",true)
    .style("display","inherit")

  d3_updateable(desc,"h3","h3")
    .text("Categories")

  d3_updateable(desc, ".chart-description","p")
    .classed("chart-description",true)
    .text("A category breakdown for off-site activity.")

  return desc

}

function drawBar(target,self) {

    target.datum(function(x){
    if (x.parentCategoryData == undefined && x.domains) {

      var category_data = x.domains.reduce(function(p,domain){

        if (domain.parent_category_name != 0) {
          var category = domain.parent_category_name

          p[category] = p[category] || 0
          p[category] += domain.count
        }
        return p
      },{})

      var parentCategoryData = d3.entries(category_data)
        .map(function(c) { return { label: c.key, value: c.value } })


      x.parentCategoryData = parentCategoryData

      var summed = d3.sum(x.parentCategoryData, function(x){ return x.value })
      x.parentCategoryData.map(function(y){y.percent = y.value/summed})

    }


    return x.parentCategoryData
      .filter(function(y){return y.percent > .01})
      .sort(function(p,c){
        return c.percent - p.percent
      })
  })

  var wrapper = d3.select(target.node().parentNode)
  var data = target.datum();


  var _sizes = autoSize(wrapper,function(d){return d -50}, function(d){return 400}),
    margin = _sizes.margin,
    width = _sizes.width,
    height = _sizes.height;

  height = data.length * 26
  
  var x = d3.scale.linear()
      .range([width/2, width-20]);
  
  var y = d3.scale.ordinal()
      .rangeRoundBands([0, height], .2);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("top");

  var svg_wrap = d3_updateable(target,"svg","svg")
    .attr("width", width + margin.left + margin.right) 
    .attr("height", height + margin.top + margin.bottom)
  
  var svg = d3_updateable(svg_wrap,"g","g")
    .attr("transform", "translate(" + margin.left + "," + 0 + ")");


  var values = data.map(function(x){ return x.value })

  x.domain(d3.extent([
      d3.min(values)-.1,d3.max(values)+.1,-d3.min(values)+.1,-d3.max(values)-.1
    ],
    function(x) { return x}
  )).nice();

  y.domain(data.map(function(d) { return d.label; }));

  var bar = d3_splat(svg,".bar","rect",false,function(x){return x.label})
      .attr("class", function(d) { return d.value < 0 ? "bar negative" : "bar positive"; })
      .attr("x",width/2 + 60)
      .attr("y", function(d) { return y(d.label); })
      .attr("width", function(d) { return Math.abs(x(d.value) - x(0)); })
      .attr("height", y.rangeBand())
      .style("cursor", "pointer")
      .on("click", function(x) {
        self._click.bind(this)(x,self)
      })

  bar.exit().remove()


  var checks = d3_splat(svg,".check","foreignObject",false,function(x){return x.label})
      .classed("check",true)
      .attr("x",0)
      .attr("y", function(d) { return y(d.label) })
      .html("<xhtml:tree></xhtml:tree>")

    svg.selectAll("foreignobject").each(function(x){
      var tree = d3.select(this.children[0])

      d3_updateable(tree,"input","input")
        .attr("type","checkbox")
        .property("checked",function(y){
          return self._categories[x.label] ? "checked" : undefined
        })
        .on("click", function() {
          self._click.bind(this)(x,self)
        })
    })



  checks.exit().remove()


  var label = d3_splat(svg,".name","text",false,function(x){return x.label})
      .classed("name",true)
      .attr("x",25)
      .attr("style", "text-anchor:start;dominant-baseline: middle;")
      .attr("y", function(d) { return y(d.label) + y.rangeBand()/2 + 1; })
      .text(function(d) { return d.label; })

  label.exit().remove()

  var percent = d3_splat(svg,".percent","text",false,function(x){return x.label})
      .classed("percent",true)
      .attr("x",width/2 + 20)
      .attr("style", "text-anchor:start;dominant-baseline: middle;font-size:.9em")
      .attr("y", function(d) { return y(d.label) + y.rangeBand()/2 + 1; })
      .text(function(d) {
        var v = d3.format("%")(d.percent);
        var x = (d.percent > 0) ?  "↑" : "↓"
        return "(" + v + x  + ")"
      })

  svg.append("g")
      .attr("class", "y axis")
    .append("line")
      .attr("x1", x(0))
      .attr("x2", x(0))
      .attr("y2", height);




}

export default function(target) {

  var wrap = d3_updateable(target,".bar-wrapper","div",false,function(x,i){return i})
    .classed("bar-wrapper",true) 

  wrap
    .classed("col-lg-3 col-md-6",!wrap.classed("col-lg-4"))

  drawDesc(wrap)

  var barWrap = d3_updateable(wrap,".bar-wrap","div",false,function(x,i){return i})
    .classed("col-md-12 row bar-wrap",true)
    .style("padding","0px")

  if (target.datum().domains) drawBar(barWrap,this)

}
