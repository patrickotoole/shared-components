var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.crusher.subscribe = (function(subscribe) {

  var Publisher = function(request, callback, name) {

    /* 
       Arguments:
         request - function from which to get data
         callback - event to trigger with data
         name - name of the event (only used for logging)

       Description:
         This is a publisher object. We use this to request information multiple times, 
         but trigger the event only once. This is implements with the lock.  When our request 
         function is completed, we will trigger the bound event with the data to return.
    */

    this.lock = false

    this.callback = function(data) {
      console.log("publisher finished",name, data) 
      callback(data || true) 
      console.log("finished callback for",name)
      self.lock = false 
    }

    var self = this

    this.call = function(data) {
      if (self.lock == false) { 
        self.lock = true
        request(self.callback,data)
      }
    }
  }

  var Subscription = function(subscriptions,callback) {
    var sdata = {}
    subscriptions.map(function(s){return sdata[s] = null})

    this.add_data = function (name, data) {
      sdata[name] = data
    }

    this.has_data = function() {
      var keys = Object.keys(sdata)
      var num_present =  keys.filter(function(k) {return sdata[k] != null}).length 

      return num_present == subscriptions.length 
    }

    this.run_callback = function() {
      var arr = subscriptions.map(function(s){return sdata[s]})
      //try {
        // console.log(arr)
        callback.apply(false,arr)
      //} catch(e) {
      //  console.log(e)
      //}
    } 

    var self = this

    this.evaluate = function (name,data) {
      // console.log(name,data)    
      self.add_data(name,data)
      console.log("evaluating:" + name, data, sdata, subscriptions)
      if (self.has_data()) self.run_callback()
    }
  }

  subscribe.dispatchers = {}

  subscribe.publishers = {}

  subscribe.register_publisher = function(name,accessor) {

    // adds the data object to the
    subscribe.dispatchers[name] = d3.dispatch(name)

    // select the "push" event from the dispatcher
    var push = subscribe.dispatchers[name][name]

    // bind the dispatcher and the event name to the event
    var bound = push.bind(subscribe.dispatchers[name],name)

    // the accessor needs to pass back the requested data
    var publisher = new Publisher(accessor,bound,name)

    // make calling the publisher accesible
    subscribe.publishers[name] = publisher.call 
  }

  

  subscribe.add_subscriber = function(subscriptions,callback,name,trigger,unpersist,data) {

    /* subscriptions - things to subscribe to
       callback - to execute when all subscriptions reply with data
       name - for this subscriber
       trigger - to trigger the publisher on load
       unpersist - to keep this / let this fire for ever event of to remove it
    */ 

    // unpersist is jsut a wrapper on callback if it is set to true 
    // trigger will try to find publishers of the same names and trigger them


    var dispatchers = subscribe.dispatchers

    var cb = function () {
      console.log("running callback for " + name,arguments)

      callback.apply(false,arguments)

      if (unpersist) {
        subscriptions.map(function(dispatch_name){
          var dname =  dispatch_name + "." + name
          dispatchers[dispatch_name].on(dname,null)
        })  
      }
      
    }

    var subscription = new Subscription(subscriptions,cb)
    
    subscriptions.map(function(dispatch_name){
      var dname =  dispatch_name + "." + name
      dispatchers[dispatch_name].on(dname,subscription.evaluate) 
    })

    if (trigger) subscriptions.map(function(name){subscribe.publishers[name](data)}) 

  }

  return subscribe  
})(RB.crusher.subscribe || {})
