export default function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function topSection(section) {
  return d3_updateable(section,".top-section","div")
    .classed("top-section",true)
    .style("min-height","160px")
}

export function remainingSection(section) {
  return d3_updateable(section,".remaining-section","div")
    .classed("remaining-section",true)
}

export function autoSize(wrap,adjustWidth,adjustHeight) {

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

export function autoScales(_sizes, len) {

  var margin = _sizes.margin,
    width = _sizes.width,
    height = _sizes.height;

  height = len * 26
  
  var x = d3.scale.linear()
      .range([width/2, width-20]);
  
  var y = d3.scale.ordinal()
      .rangeRoundBands([0, height], .2);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("top");


  return {
      x: x
    , y: y
    , xAxis: xAxis
  }
}
