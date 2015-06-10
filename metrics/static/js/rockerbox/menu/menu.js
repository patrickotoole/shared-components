RB = RB || {}
RB.menu = (function(menu) {

  try {
    var source = "advertiser=" + window.location.search.split("source=")[1].split("&")[0]
  } catch(e) {
    var source = "advertiser=baublebar"
  }

  menu.create_new_funnel = function(){
    RB.crusher.controller.funnel.new(
      d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")
    )
  }

  menu.data = [{
    "name":"On-page Analytics",
    "push_state": "/crusher",
    "values": [
      {
        "name":"Actions",
        "push_state":"/crusher/funnel/action",
        "get_values_path":"/crusher/funnel/action?format=json&" + source,
        "values_key":"action_name"
      },
      {
        "name":"Funnels",
        "push_state":"/crusher/funnel",
        "values": [
          {
            "name":"Create New Funnel",
            "push_state":"/crusher/funnel/new",
          },
          {
            "name": "View Existing Funnels",
            "push_state":"/crusher/funnel/existing",
            "skipRender": true,
            "values_key":"funnel_name"    
          }
        ]
        
      }
    ]
  }]

  menu.routes = (function(routes) {

    routes.transforms = {}
    routes.apis = {}
    routes.renderers = {}

    routes.register = function(obj){
      Object.keys(obj).map(function(m){
        routes['register_' + m](obj[m])
      })
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
    
  })(menu.routes || {})

  var d3queue = (function(){return queue})()

  menu.queue = (function(queue){

    var __queue__ = []
    var __forward__ = []

    window.onpopstate = function(x) {
      
      if (x.state) {

        var previous = queue.get_previous()
        var next = queue.get_next()

        //console.debug("BEFORE: ", __queue__, __forward__, previous.name, x.state.name, next.name)

        if (previous.name == x.state.name) { // back in history
          __forward__.push(__queue__.pop())
          queue.selectbar(previous)
        } else if (next.name == x.state.name) { // forward in history
          __forward__.pop()
          __queue__.push(next)
          queue.forward(next)
        } else {
          console.debug("BAD", __queue__, __forward__, previous.name, x.state.name, next.name) 
        }

        //console.debug("AFTER: ", __queue__, __forward__, previous.name, x.state.name, next.name)

      }
    }

    queue.get_next = function() {
      return __forward__[__forward__.length - 1] || {"name":false}
    }

    queue.get_previous = function() {
      return __queue__[__queue__.length - 2] || {"name":false}
    }

    queue.get = function(){
      return __queue__
    }

    queue.register = function(bound) {
      queue.selectbar = bound
    }

    queue.reset = function() { 
      __queue__ = [] 
      __forward__ = []
    }

    queue.forward = function(x) {
      var path = window.location.pathname
      var shouldPush = (x.push_state) && (path != x.push_state)
      var emptyQueue = __queue__.length == 0

      if (shouldPush || emptyQueue) {
        var stateAction = emptyQueue ? "replaceState" : "pushState"
        var state = {
          "name": x["name"]
        }

        history[stateAction](state, x["name"],x.push_state + "?" + source)
        __queue__.push(x)
      }

      var page = x.push_state ? 
        x.push_state.replace("/crusher/","") : 
        path.replace("/crusher/","")

      var api = menu.routes.apis[page],
        transform = menu.routes.transforms[page],
        render = menu.routes.renderers[page]


      if (x.push_state && (api || render)) {
        if (api) {
          var q = api(false,d3queue())
          q.awaitAll(function(err) {
            if (transform) transform(x)
            queue.selectbar(x) 
          })
        }
        if (!x.skipRender && render) {
          render(x)
        }
      }
      else if (!x.skipRender && render) {
        render(x)
      }
      else if (x.values) queue.selectbar(x)

    }

    queue.back = function(x) {
      if (__queue__.length > 1) history.back()
    }

    return queue
  })(menu.queue || {})
  

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

    var aside = d3_splat(target,"aside","aside",[menu.data])
    menu.navbar.render(aside)

  }

  return menu 

})(RB.menu || {})
