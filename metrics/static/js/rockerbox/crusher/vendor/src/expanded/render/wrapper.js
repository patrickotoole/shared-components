export default function(target) {

  // var controls = d3_updateable(target,'.page-header-controls','div')
  //   .classed('page-header-controls', true)
  //   .text('View as table')
  //   .on('click', function(x) { this._on.click(x) }.bind(this) )

  var vendors_list_card = d3_updateable(target, '.vendors-list-card', 'section', false, function(x){return 1})
    .classed('vendors-list-card col-md-12', true);

  var vendors_list = d3_updateable(vendors_list_card, '.vendors-list', 'ul',false, function(x){return 1})
    .classed('vendors-list', true);

  return vendors_list

}
