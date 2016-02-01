import d3 from 'd3'

export default function(target) {

  var width = target.style("width").replace("px","").split(".")[0],
    height = target.style("height").replace("px","").split(".")[0],
    radius = Math.min(height, width) / 2;

  return {
    width: width,
    height: height,
    radius: Math.min(height, width) / 2
  }
}
