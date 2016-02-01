import d3 from 'd3'

export default function(target,selector,type,data,joiner) {
  var type = type || "div"
  var updateable = target.selectAll(selector).data(
    data || function(x){return x},
    joiner || function(x){return x}
  )

  updateable.enter()
    .append(type)

  return updateable
}
