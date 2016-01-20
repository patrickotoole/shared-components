var d3_updateable = function(target,selector,type,data,joiner) {
  var type = type || "div"
  var updateable = target.selectAll(selector).data(
    function(x){return data ? [data] : [x]},
    joiner || function(x){return [x]}
  )

  updateable.enter()
    .append(type)

  return updateable
}

var d3_splat = function(target,selector,type,data,joiner) {
  var type = type || "div"
  var updateable = target.selectAll(selector).data(
    data || function(x){return x},
    joiner || function(x){return x}
  )

  updateable.enter()
    .append(type)

  return updateable
}

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
}

var make_table = function(target,data,index) {

  var headers = Object.keys(data[0]).map(function(x){return {name: x} })
  var wrapper = target.data([data])

  var table = d3_updateable(wrapper,".table","table")
    .classed("table",true)

  table.exit().remove()

  var thead = d3_updateable(table,"thead","thead")
  var heads = d3_splat(thead,"tr","tr",[headers])


  var ths = d3_splat(heads,"th","th",
        function(x){return x},
        function(x){return x.name}
  )

  ths.text(function(x){
    return x.name
  })

  var tbody = d3_updateable(table,"tbody","tbody")
  var rows = d3_splat(tbody,"tr","tr",
    function(x){return x},
    function(x,i){return index ? index.map(function(z){return x[z]}).join("-") : JSON.stringify(x)}
  )

  var item = d3_splat(rows,"td","td",function(x){
      var values = headers.map(function(y){
        return {"key":y.name,"value":x[y.name]}
      })
      return values
    },function(x){return x.key})

  var fields = item.text(function(x) {return x.value})

  return table
}
