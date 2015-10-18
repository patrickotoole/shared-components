RB = RB || {}
RB.menu = (function(menu) {

  menu.routes = RB.routes
  menu.navigation = RB.routes.navigation

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
  
  menu.render = function(target) {

    var aside = d3_splat(target,"aside","aside",[menu.routes.roots])

    var navbar_selectors = menu.navbar.render(aside)
    var bound_selectbar = menu.selectbar.render(aside,{"name":"","values":[]})

    navbar_selectors(bound_selectbar) 

  }

  return menu 

})(RB.menu || {})
