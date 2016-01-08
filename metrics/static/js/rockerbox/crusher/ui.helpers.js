function labelWithDottedLine(svg){

  var x = 0,
    width = 200,
    text = "",
    characterWidth = svg.style("font-size").replace("px","")/6*5,
    color = "grey",
    classname = "",
    textFunction = function(d) {return text},
    widthFunction = function(d) { return width },
    xPos = function(d) { return x }


  render.color = function(value) {
    if (!arguments.length) return color;
    color = value;
    return render
  }

  render.x = function(value) {
    if (!arguments.length) return x;
    if (typeof(value) == "function") xPos = value;
    else x = value
    return render
  }

  render.characterWidth = function(value) {
    if (!arguments.length) return characterWidth;
    characterWidth = value;
    return render;
  }

  render.width = function(value) {
    if (!arguments.length) return width;

    if (typeof(value) == "function") widthFunction = value;
    else width = value;

    return render;
  }

  render.text = function(value) {
    if (!arguments.length) return text;

    if (typeof(value) == "function") textFunction = value;
    else text = value;

    return render;
  }

  render.classname = function(value) {
    if (!arguments.length) return classname;
    classname = value;
    return render;
  }

  function render() {
    var g = d3_updateable(svg,classname ? "." + classname : "g", "g")
      .classed(classname,true)

    g.append("line")
      .attr("x1", function(d){ return xPos(d) + widthFunction(d)/2 - (text.length*characterWidth/3) })  
      .attr("y1", 0)
      .attr("x2", xPos)  
      .attr("y2", 0)
      .attr("stroke-dasharray","1, 5")
      .style("stroke-width", 1)
      .style("stroke", color)
      .style("fill", "none");

    g.append("text")
      .attr("transform", function(d) { return "translate(" + (xPos(d) + widthFunction(d)/2) + "," + 0 + ")"; })
      .attr("dy", ".35em")
      .style("text-anchor","middle")
      .text(textFunction)

    g.append("line")
      .attr("x1", function(d){ return xPos(d) + widthFunction(d) })  
      .attr("y1", 0)
      .attr("x2", function(d){ return xPos(d) + widthFunction(d)/2 + (text.length*characterWidth/3) })  
      .attr("y2", 0)
      .attr("stroke-dasharray","1, 5")
      .style("stroke-width", 1)
      .style("stroke", color)
      .style("fill", "none");

  }

  return render
}

function verticalLine(svg) {

  var x = 0,
    topText = "",
    bottomText = "",
    xPos = function(d){ return x}

  render.x = function(value) {
    if (!arguments.length) return x;
    if (typeof(value) == "function") xPos = value;
    else x = value;

    return render;
  }

  render.topText = function(value) {
    if (!arguments.length) return topText;
    topText = value;
    return render;
  }

  render.bottomText = function(value) {
    if (!arguments.length) return bottomText;
    bottomText = value;
    return render;
  }
 
  
  function render() {

  }

  return render

}
