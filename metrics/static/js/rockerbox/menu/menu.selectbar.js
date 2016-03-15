RB = RB || {}
RB.menu = RB.menu || {}
RB.menu.selectbar = (function(selectbar) {

  var menu = RB.menu

  selectbar.components = {
    wrapper: function(target,data) {
      var bars = d3_splat(target,".selectbar","div",data)
        .classed("selectbar",true)

      bars.exit().remove()

      return bars
    },
    heading: function(target,data,has_back,override) {
      
      if (override) return override.apply(menu,arguments)

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
    items: function(target,data,override) {

      if (override) return override.apply(menu,arguments) 

      var items = d3_splat(target, "a.item","a",
          function(x){return x ? x.values : []},
          function(x){return x.name + x.push_state}
        )
        .classed("item item-" + (target.datum().values_key || target.datum().name.toLowerCase()),true)
        .attr("href",function(x){
          var should_show = (!!target.datum().values_key && !target.datum().hide_href )

          return should_show ? 
            window.location.pathname + "?id=" + x[target.datum().values_key] : 
            undefined 
        })
        .text(function(x){
          return x.name
        })
        .on("click", function(x){
          d3.select(this.parentNode).selectAll(".item").classed("active",false)

          d3.select(this).classed("active",true)
          menu.navigation.forward.bind(this)(x)
        })

      items.exit().remove()

      return items
       
    }
  }

  selectbar.render = function(target,data,transforms){

    var transforms = transforms || {}

    var wrapper = selectbar.components.wrapper(target,[data])
    var bound = selectbar.render.bind(this,target)
    var has_back = menu.navigation.get().length > 1 

    menu.navigation.register(bound)

    var build_items = {
      render: selectbar.components.items,
      wrapper: wrapper,
      transform: transforms.items
    }

    selectbar.components.heading(target.datum(data),data,has_back,transforms.heading,build_items)
    selectbar.components.items(wrapper,data,transforms.items)

    menu.bound_topbar(data,transforms.topbar,build_items)

    return selectbar.render.bind(false,target)

  }

  return selectbar

})(RB.menu.selectbar || {})
