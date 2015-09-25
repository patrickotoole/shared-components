var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.subscribe = RB.crusher.subscribe || {}

RB.component = (function(self,subscribe) {

  // this is dependent on the subscription module (pub/sub)
  // note the inclusion of subscribe as an argument

  self.export = function(component,container) {
  
    /*
      Arguments:
        component - this the component to register. it needs to contain specific fields in order 
          to register itself as shown in the default fields below.
        container - this is the container which will be assigned the component. it can be an empty
          object but for organization it is recommend to have a standard container for components
          of a similar type.
      Description:
        This function takes a component and an container on which to register the components
        and adds these as subscriptions to the publisher subscribe backbone
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
  
    container.components = register(
      container.components || {},
      component.NAME,
      component.SUBSCRIBE,
      component.subscription,
      component.PUBLISH
    )
  
    component.EVENTS.map(function(name) {
      container.events = define_event(
        container.events || {}, 
        name
      )
    })

    self.register_publishers(container)
    self.register_subscribers(container)
  
  }

  self.register_subscribers = function(container) {

    Object.keys(container.components).map(function(c){

      var subscription = container.components[c]
      var cb = function() {
        var response = subscription.callback.apply(false,arguments)
        if (subscription.publish) 
          subscription.publish.map(function(p) {
            subscribe.publishers[p](response)
          })
      }      

      subscribe.add_subscriber(
        subscription.subscribe,
        cb,
        subscription.name,
        false,false
      )
    })
  }

  self.register_publishers = function(container) {
    Object.keys(container.events).map(function(key){
      subscribe.register_dummy_publisher(key)
    })
  }

  return self 
})(RB.component || {}, RB.crusher.subscribe)
