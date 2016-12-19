RB = RB || {}
RB.menu = (function(menu) {

  menu.routes = RB.routes
  menu.navigation = RB.routes.navigation

  menu.state = {"action":"All Segments"}

  menu.methods = {
    transform: function(obj,key) {
      obj.values.map(function(y){
        y.name = y[key]
      })
    },
    get_values: function(obj,callback) {
      var path = obj.get_values_path,
        key = obj.values_key

      d3.json(path,function(x){
        x.map(function(y){y.name = y[key]})
        obj.values = x
        callback(obj)
      })
    }
  }

  menu.topbar = {
    render: function(target,data, override, build_items) {

      if (override) return override.apply(menu,arguments)

      var topbar = d3_updateable(target,".topbar","div")
        .classed("topbar",true)
    }
  }
  
  menu.render = function(target,aside_only) {

    var skip_not_aside = (aside_only != true)
    if (aside_only) {
      target.classed("hide-top hide-select",true)
      RB.menu.navbar.methods.pushState = function(sb,x) {
        document.location.href = x.push_state
      }
    }
    

    var aside = d3_splat(target,"aside","aside",[menu.routes.roots])

    // Rendering the topbar here is a bit of a hack... should be better organized in the future
    if (skip_not_aside) menu.topbar.render(target)
    if (skip_not_aside) menu.bound_topbar = menu.topbar.render.bind(this,target)

    var navbar_selectors = menu.navbar.render(aside)
    if (skip_not_aside) var bound_selectbar = menu.selectbar.render(aside,{"name":"","values":[]})


    if (skip_not_aside) navbar_selectors(bound_selectbar) 

  }

  return menu 

})(RB.menu || {})
