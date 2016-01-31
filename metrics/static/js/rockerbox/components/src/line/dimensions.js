import {default as parent_dimension} from '../dimensions'

export default function(target) {
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
