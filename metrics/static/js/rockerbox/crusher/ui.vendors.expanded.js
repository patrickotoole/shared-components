var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.vendors = (function(vendors) {

  var crusher = RB.crusher
  var funnelRow;
  var pubsub = crusher.pubsub
  var comma_formatter = d3.format(',');

  vendors.first = true


  vendors.show = function(funnelRow, obj) {

    var xx = window.vendors.vendor_expanded(funnelRow)
      .subscribe()
      .initialize() // if you set .datum(DATA), there is no initial subscription
    
  }



  return vendors
})(RB.crusher.ui.vendors || {})
