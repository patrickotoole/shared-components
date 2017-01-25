export function select(target,selected,option_key) {
  // {key: String, values: [{key: String, value: ?}...] }

  var option_key = option_key || "values"

  d3_updateable(target,"span","span").text(function(x) { return x.key })

  var select = d3_updateable(target,"select","select")

  d3_splat(select,"option","option",function(x){ return x[option_key] }, function(x) { return x.key})
    .text(function(x) { return x.key })
    .attr("value",function(x) { return x.value })
    .property("selected", function(x) { return x.value == selected })

  select.summarize = function() { 
    return select.property("value")
  }

  return select
}

export function fileInput(target) {
  // {key: String }

  d3_updateable(target,"span","span").text(function(x) { return x.key })

  var input = d3_updateable(target,"input","input")
    .attr("type","file")

  return input
}

export function input(target) {
  // {key: String, value: ? }

  d3_updateable(target,"span","span").text(function(x) { return x.key })

  var input = d3_updateable(target,"input","input")
    .property("value", function(x) { return x.value })

  input.summarize = function() { 
    return input.property("value")
  }

  return input
}
