var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.vendors = (function(vendors) {

  var crusher = RB.crusher


  vendors.table = function(funnelRow, obj) {

    var xx = window.vendors.vendor_table(funnelRow)
      .subscribe()
      .initialize() // if you set .datum(DATA), there is no initial subscription
      .on('click',function() {
        RB.crusher.controller.initializers.vendors(obj,false)
      })

  }

  return vendors
})(RB.crusher.ui.vendors || {})
