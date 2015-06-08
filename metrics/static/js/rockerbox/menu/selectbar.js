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
      var h5 = d3_updateable(target,"h5","h5")
        .classed("heading",true)
        .html(function(x){
          var name = x ? x.name : ""
          return (has_back ? "&#65513; " : "") + name
        })

      if (has_back) h5.on("click",menu.queue.back)

      return h5
    },
    items: function(target) {
      var items = d3_splat(target, "a","a",
          function(x){return x ? x.values : []},
          function(x){return x.name + x.push_state}
        ).text(function(x){
          return x.name
        }).on("click", menu.queue.forward)

      items.exit().remove()

      return items
       
    }
  }

  selectbar.render = function(target,data){

    var wrapper = selectbar.components.wrapper(target,[data])
    var bound = selectbar.render.bind(this,target)
    var has_back = menu.queue.get().length > 1 

    menu.queue.register(bound)

    selectbar.components.heading(wrapper,has_back)
    selectbar.components.items(wrapper)

  }

  return selectbar

})(RB.menu.selectbar || {})
