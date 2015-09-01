var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.component = (function(self,crusher) {
  self.export = function(component,object) {
  
    /*
      Takes a component and component backbone.
        - Adds events associated with component / events it will subscribe to
        - Adds the component to subscribe to events that hit the backbone
    */
  
    var default_field = function(object,field,default_value) {
      if (!object[field]) object[field] = default_value
    }
    default_field(component,"NAME","default")
    default_field(component,"SUBSCRIBE",[])
    default_field(component,"PUBLISH",[])
    default_field(component,"EVENTS",[])
    default_field(component,"subscription",function(x){return x})
  
    var register = function(components, name, subscriptions, callback, publish) {
      components[name] = {
        "name":name,
        "subscribe": subscriptions,
        "callback": callback,
        "publish": publish
      }
      return components
    }
  
    var define_event = function(events,name) {
      events[name] = true
      return events
    }
  
    object.components = register(
      object.components || {},
      component.NAME,
      component.SUBSCRIBE,
      component.subscription,
      component.PUBLISH
    )
  
    component.EVENTS.map(function(name) {
      object.events = define_event(
        object.events || {}, 
        name
      )
    })

    self.register_publishers(object)
    self.register_subscribers(object)
  
  }

  self.register_subscribers = function(object) {
    var subs = Object.keys(object.components).map(function(c){
      return object.components[c]
    })

    subs.map(function(subscription){

      var cb = function() {
        var response = subscription.callback.apply(false,arguments)
        if (subscription.publish) 
          subscription.publish.map(function(p) {
            crusher.subscribe.publishers[p](response)
          })
      }      

      crusher.subscribe.add_subscriber(
        subscription.subscribe,
        cb,
        subscription.name,
        false,false
      )
    })
  }

  self.register_publishers = function(object) {
    Object.keys(object.events).map(function(key){
      crusher.subscribe.register_dummy_publisher(key)
    })
  }

  return self 
})(RB.component || {}, RB.crusher)
