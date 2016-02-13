var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.vendors = (function(vendors) {

  var crusher = RB.crusher
  var funnelRow;
  var pubsub = crusher.pubsub
  var comma_formatter = d3.format(',');

  vendors.expanded_wrapper = function(funnelRow,obj) {
   var controls = d3_updateable(funnelRow,'.page-header-controls','div')
      .classed('page-header-controls', true)
      .text('View as table')
      .on('click', function() {
        RB.crusher.controller.initializers.vendors(obj,false)
      });

    var vendors_list_card = d3_updateable(funnelRow, '.vendors-list-card', 'section')
      .classed('vendors-list-card bar series col-md-12', true);

    var vendors_list = d3_updateable(vendors_list_card, '.vendors-list', 'ul')
      .classed('vendors-list', true);


    return vendors_list
  }


  return vendors
})(RB.crusher.ui.vendors || {})
