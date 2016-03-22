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

    setTimeout(function() {
      d3.select('body').on('click', function(e) {
        // debugger;
        if(d3.event.target.className !== 'info-popup' && d3.event.target.parentElement.className !== 'info-popup') {
          d3.select('.info-popup').remove();
          d3.select('body').on('click', null);
        }
      });
    }, 10);

  // d3.select('.info-popup').on('click', function(a,b,c,d) {
  //   alert('2')
  //   d3.event.preventDefault();
  // });

  return popup;
}

export default base
