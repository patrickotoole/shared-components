RB = RB || {}
RB.menu = RB.menu || {}
RB.menu.selectbar = (function(selectbar) {

  var menu = RB.menu

  selectbar.components = {
    wrapper: function(target,data) {
      return d3_splat(target,".selectbar","div",data)
        .classed("selectbar",true)
    },
    heading: function(target,has_back) {
      var h5 = d3_updateable(target,".heading","h5")
        .classed("heading",true)

      var a = d3_updateable(h5,"a","a")
        .html(function(x){
          var name = x ? x.name : ""
          var backarr = (has_back ? "&#65513; " : "") 
          return backarr + name 
        })

      if (has_back) a.on("click",menu.navigation.back)

      return h5
    },
    items: function(target) {
      var items = d3_splat(target, "a.item","a",
          function(x){return x ? x.values : []},
          function(x){return x.name + x.push_state}
        )
        .classed("item",true)
        .text(function(x){
          return x.name
        })
        .on("click", menu.navigation.forward)

      items.exit().remove()

      return items
       
    }
  }

  selectbar.render = function(target,data){

    var wrapper = selectbar.components.wrapper(target,[data])
    var bound = selectbar.render.bind(this,target)
    var has_back = menu.navigation.get().length > 1 

    menu.navigation.register(bound)

    selectbar.components.heading(wrapper,has_back)
    selectbar.components.items(wrapper)

    return selectbar.render.bind(false,target)

  }

  return selectbar

})(RB.menu.selectbar || {})
