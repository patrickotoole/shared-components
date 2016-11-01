window.d3_updateable = function(target,selector,type,data,joiner) {
  var type = type || "div"
  var updateable = target.selectAll(selector).data(
    function(x){return data ? [data] : [x]},
    joiner || function(x){return [x]}
  )

  updateable.enter()
    .append(type)

  return updateable
}

window.d3_splat = function(target,selector,type,data,joiner) {
  var type = type || "div"
  var updateable = target.selectAll(selector).data(
    data || function(x){return x},
    joiner || function(x){return x}
  )

  updateable.enter()
    .append(type)

  return updateable
}
 
