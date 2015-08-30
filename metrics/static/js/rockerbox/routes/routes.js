RB = window.RB || {}

RB.routes = (function(routes) {

  routes.transforms = {}
  routes.apis = {}
  routes.renderers = {}

  routes.roots = []

  routes.register = function(obj){
    Object.keys(obj).map(function(m){
      routes['register_' + m](obj[m])
    })
  }

  routes.register_roots = function(arr) {
    routes.roots = routes.roots.concat(arr)
  }

  routes.register_renderers = function(obj){
    Object.keys(obj).map(function(k) {
      routes.renderers[k] = obj[k]
    })
  }

  routes.register_transforms = function(obj){
    Object.keys(obj).map(function(k) {
      routes.transforms[k] = obj[k]
    })
  }

  routes.register_apis = function(obj){
    Object.keys(obj).map(function(k) {
      routes.apis[k] = obj[k]
    })
  }

  

  return routes
  
})(RB.routes || {})


