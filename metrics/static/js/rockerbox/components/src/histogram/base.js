import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'


function base(target) {
  var svg = d3_updateable(target, '.vendor-histogram', 'svg')
    .classed('vendor-histogram', true)
    .style('width', '100%');

  svg.exit().remove()

  return {
    svg: svg
  };
}

export default base;
