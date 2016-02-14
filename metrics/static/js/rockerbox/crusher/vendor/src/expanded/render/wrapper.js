export default function(target) {

  var controls = d3_updateable(target,'.page-header-controls','div')
    .classed('page-header-controls', true)
    .text('View as table')
    .on('click', function() {
      RB.crusher.controller.initializers.vendors(obj,false)
    });

  var vendors_list_card = d3_updateable(target, '.vendors-list-card', 'section')
    .classed('vendors-list-card bar series col-md-12', true);

  var vendors_list = d3_updateable(vendors_list_card, '.vendors-list', 'ul')
    .classed('vendors-list', true);


  return vendors_list

}
