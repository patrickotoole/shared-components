import d3_updateable from '../d3_updateable'

function base(target) {
  var table = d3_updateable(target, '.table', 'table')
    .classed('table', true);

  table.exit().remove()

  return table;
}

export default base
