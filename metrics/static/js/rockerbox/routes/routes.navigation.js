RB = window.RB || {}
RB.routes = RB.routes || {}
RB.routes.navigation = (function(navigation) {

  var routes = RB.routes
  var __back__ = []
  var __forward__ = []

  window.onpopstate = function(x) {
    /*
     * This handles all of the state changes when a person goes either forward or back.
     * When a person goes either forward or backwards, the state object is is found.
     * The state is then tested against the previous, or the next to determine which direction
     * and how the page should be updated
     */
    
    if (x.state) {

      var previous = navigation.get_previous()
      var next = navigation.get_next()

      //console.debug("BEFORE: ", __back__, __forward__, previous.name, x.state.name, next.name)

      if (previous.name == x.state.name) { // back in history
        __forward__.push(__back__.pop())
        navigation.subscribed(previous)
      } else if (next.name == x.state.name) { // forward in history
        __forward__.pop()
        __back__.push(next)
        navigation.forward(next)
      } else {
        console.debug("BAD", __back__, __forward__, previous.name, x.state.name, next.name) 
      }

      //console.debug("AFTER: ", __back__, __forward__, previous.name, x.state.name, next.name)

    }
  }

  navigation.get_next = function() {
    return __forward__[__forward__.length - 1] || {"name":false}
  }

  navigation.get_previous = function() {
    return __back__[__back__.length - 2] || {"name":false}
  }

  navigation.get = function(){
    return __back__
  }

  navigation.register = function(bound) {
    navigation.subscribed = bound
  }

  navigation.reset = function() { 
    __back__ = [] 
    __forward__ = []
  }

  var current = 0

  navigation.forward = function(x) {
    console.log("FORWARD",x)
    var path = window.location.pathname
    var shouldPush = (x.push_state) && (path != x.push_state)
    var emptyQueue = __back__.length == 0
    current += 1 

    if (shouldPush || emptyQueue) {
      var stateAction = emptyQueue ? "replaceState" : "pushState"
      var state = {
        "name": x["name"]
      }

      history[stateAction](state, x["name"],x.push_state )
      __back__.push(x)
    }

    var page = x.push_state ? 
      x.push_state.replace("/crusher/","") : 
      path.replace("/crusher/","")

    var api = routes.apis[page],
      transform = routes.transforms[page],
      render = routes.renderers[page]


    if (x.push_state && (api || render)) {
      if (api && (typeof(api) == "object") && (typeof(api[0]) == "string")) {
        
        var now = parseInt(String(current))
        x.values = x.values || [{"name":"Loading..."}] 
        navigation.subscribed(x)

        RB.crusher.subscribe.add_subscriber(api, function(err,cbs) {
          if (transform) transform(x)
          if (now == current) navigation.subscribed(x) 
        },"menu",true,false)

      } else if (api && (typeof(api) == "object")) {
        x.values = api
        navigation.subscribed(x)
      }
      if (!x.skipRender && render) {
        render(x)
      }
    }
    else if (!x.skipRender && render) {
      render(x)
    }
    else if (x.values) navigation.subscribed(x)

  }

  navigation.back = function(x) {
    if (__back__.length > 1) history.back()
  }

  return navigation 

})(RB.routes.navigation || {})


