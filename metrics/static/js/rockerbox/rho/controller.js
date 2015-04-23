var RB = RB || {}
RB.rho = RB.rho || {}

RB.rho.controller = (function(controller) {

  var rho = RB.rho;

  var URL = window.location.pathname + window.location.search
  var addParam = function(u,p) { 
    return u.indexOf("?") >= 0 ? u + "&" + p : u + "?" + p 
  }
  URL = addParam(URL,"format=json")

  controller.init = function(){

    d3.json(URL, function(dd){
      rho.data.build(dd) 
      controller.render([])
      //controller.add_filter("seller")
      //controller.add_filter("size") 
    });  
  }

  controller.add_filter = function(item) {
    rho.data.add_filter(item)
    controller.render(rho.data.get_filters())
  }

  controller.remove_filter = function(item) {
    rho.data.remove_filter(item)

    var index = 0
    var toRemove = d3.selectAll(".filter").filter(function(x,i){
      if (x.key == item) index = i 
      return x.key == item
    })

    toRemove.selectAll("option")
      .property("selected",null)
      .attr("selected",false)

    var key = d3.select(d3.selectAll(".filter")[0][index]).datum().key
    var t = toRemove.select("select").node()

    controller.select.apply(t)

    toRemove.remove()
  }

  controller.render = function(filter_array,key) {

    var target = d3.select("#filterable"); 
    var data = rho.data.CRS.groups.date.all();
    var o = rho.data.options()

    var selected_filters = filter_array.reduce(function(p,x){
      p.push({"key":x, "value":o[x]})
      return p
    },[])

    var total = rho.data.CRS.groups.all.value()
    var summary = ""
    
    for (var k in total) {
      summary += k + " " + total[k] + " -- "
    }

    rho.ui.build(target,selected_filters,data,controller.select,key,summary)  
  }

  controller.select = function(x) {
    var special = 1

    var key = d3.select(this.parentElement).datum().key
    var data = d3.selectAll(this.selectedOptions).data()

     
    if (special) {

      // get what is currently selected
      var selectors = d3.select(this.parentElement.parentElement)
      var key_order = selectors.selectAll("select")[0].map(function(x){
        return d3.select(x).datum().key
      })

      var current_selections = selectors.selectAll("select")[0].reduce(function(p,x){
        var key = d3.select(x).datum().key
        p[key] = d3.selectAll(x.selectedOptions).data()
        return p
      },{})

      // reset dimensions which come after current selections
      rho.data.CRS.dimensions['seller_tag_size'].filterAll() 
      rho.data.CRS.dimensions['seller'].filterAll()  
      rho.data.CRS.dimensions['tag'].filterAll()  
      rho.data.CRS.dimensions['size'].filterAll()  

      // apply new selection parameters
      var firstKey = key_order.indexOf(key) 
      var items = key_order//.slice(firstKey,key_order.length)

      // need to reapply current selections sequentially
      items.map(function(item){
        var data = current_selections[item]
        rho.data.CRS.dimensions[item].filterFunction(function(x){
          return data.indexOf(x) > -1 || data.length == 0
        })

        var pos = key_order.indexOf(item)

        if (pos >= firstKey) {
          controller.render(
            key_order.slice(pos,key_order.length),
            key
          )
        }
      })
      
    }

    
    
    //controller.render(rho.data.get_filters(),key) 
  }  

  return controller

})(RB.rho.controller || {})
