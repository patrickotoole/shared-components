export default function(target) {

  var controls = d3_updateable(target, '.page-header-controls', 'div')
    .classed('page-header-controls', true)
    .text('View expanded')
    .on('click', function(x) {
      RB.crusher.controller.initializers.vendors(x,true)
    }.bind(this) )

    var vendors_list_card = d3_updateable(target, '.vendors-list-table', 'section')
      .classed('vendors-list-table bar series col-md-12 show-loading', true)

    vendors_list_card.exit().remove();

    var title = d3_updateable(vendors_list_card, '.vendor-card-title', 'div')
      .classed('vendor-card-title', true)
      .text('Vendor Audience Cohorts')
      .style('font-weight', 'bold')
      .style('font-size', '18px')
      .style('line-height', '22px')
      .style('color', '#5A5A5A');
  return vendors_list_card;

}
