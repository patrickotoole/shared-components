export default function(target) {

  var vendors_list_card = d3_updateable(target, '.vendors-list-table', 'section')
    .classed('vendors-list-table bar series col-md-12 show-loading', true);

  var controls = d3_updateable(vendors_list_card, '.page-header-controls', 'div')
    .classed('page-header-controls', true)
    .text('View expanded')
    .on('click', function(x) {
      RB.crusher.controller.initializers.vendors(x,true)
    }.bind(this) )

  return vendors_list_card;

}
