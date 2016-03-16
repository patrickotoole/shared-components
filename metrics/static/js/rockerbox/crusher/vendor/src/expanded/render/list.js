export default function render_list(list) {

  var rows = d3_splat(list, '.vendors-list-item', 'li', false, function(x) { return x.action_name; })
    .classed('vendors-list-item  series', true);

  rows.exit().remove()


  return rows
}
