var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.vendors = (function(vendors) {

  var crusher = RB.crusher;

  vendors.show = function(funnelRow, obj) {

    var subscribe_to = (obj.selection) ? "actions" : undefined;
    var subscriptions = obj.subscriptions || undefined;
 
    var xx = window.vendors.vendor_expanded(funnelRow)
      .subscribe(subscriptions)
      .filter(obj.filter)
      .initialize(subscribe_to) // if you set .datum(DATA), there is no initial subscription
      .on('click',function() {
        RB.crusher.controller.initializers.vendors(obj,false)
      })

  }

  return vendors
})(RB.crusher.ui.vendors || {})
