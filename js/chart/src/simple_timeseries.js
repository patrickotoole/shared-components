import {d3_updateable, d3_splat} from '@rockerbox/helpers'

export function simpleTimeseries(target,data,w,h,min) {
  var width = w || 120
    , height = h || 30

  var x = d3.scale.ordinal().domain(d3.range(0,data.length)).range(d3.range(0,width,width/data.length))
  var y = d3.scale.linear().range([4,height]).domain([min || d3.min(data),d3.max(data)])

  var wrap = d3_updateable(target,"g","g",data,function(x,i) { return 1})

  d3_splat(wrap,"rect","rect",x => x, (x,i) => i)
    .attr("x",(z,i) => x(i))
    .attr("width", width/data.length -1.2)
    .attr("y", z => height - y(z) )
    .attr("height", z => z ? y(z) : 0)

  return wrap

}
