import d3_updateable from '../d3_updateable'
import d3 from 'd3'

function base(target) {
  d3.select('.info-popup').remove();

  var popup = d3_updateable(target, '.info-popup', 'div')
    .classed('info-popup', true)
    .style('margin-left', function(x) {
      var margin = 100 - (x.title.length * 3)
      return '-' + margin + 'px';
    })

  return popup;
}

export default base
