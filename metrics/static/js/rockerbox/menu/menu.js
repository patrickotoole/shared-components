RB = RB || {}
RB.menu = (function(menu) {

  try {
    var source = "advertiser=" + window.location.search.split("source=")[1].split("&")[0]
  } catch(e) {
    var source = "advertiser=baublebar"
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
        "get_values_path":"/crusher/funnel?format=json&" + source,
        "values_key":"funnel_name"
      }
    ]
  }]

  menu.queue = (function(queue){

    var __queue__ = []

    window.onpopstate = function(x) {
      
      if (x.state) {

        if (queue.get_previous().name == x.state.name) {
          __queue__.pop()
          queue.selectbar(x.state)
        } else {
          __queue__.push(x.state)
          queue.forward(x.state)
        }

      }
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
    }

    queue.forward = function(x) {
      var path = window.location.pathname
      var shouldPush = (x.push_state) && (path != x.push_state)

      if (shouldPush) {
        history.pushState(x, x["name"],x.push_state + "?" + source) 
        __queue__.push(x)
      } else if (!__queue__.length) {
        history.replaceState(x, x["name"],x.push_state + "?" + source) 
        __queue__.push(x)
      }

      if (x.values) queue.selectbar(x)
      else if (x.get_values_path) menu.methods.get_values(x,queue.selectbar)
      else {
        var page = window.location.pathname.replace("/crusher/","")
        RB.crusher.controller.init(page,x) 
      } 

    }

    queue.back = function(x) {
      if (__queue__.length > 1) history.back()
    }

    return queue
  })(menu.queue || {})
  

  menu.methods = {
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
