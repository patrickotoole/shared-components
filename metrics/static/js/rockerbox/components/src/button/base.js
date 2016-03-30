import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'


function base(target) {
  var button = d3_updateable(target, '.btn', 'div')
    .classed('btn pull-right', true)
    .style('color', '#fff')
    .style('font-size', '11px')
    .style('padding', '8px 10px')
    .style('margin', '11px 10px 0px 0px')
    .style('text-transform', 'uppercase')
    .style('font-weight', 'bold')
    .style('line-height', 1);

  button.exit().remove()

  return button;
}

export default base;
