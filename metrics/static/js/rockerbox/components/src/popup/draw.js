import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function draw() {
  var popup_title = d3_updateable(this._base, '.info-popup-title', 'h3')
    .classed('info-popup-title', true)
    .text(this._title);

  var popup_content = d3_updateable(this._base, '.info-popup-content', 'p')
    .classed('info-popup-content', true)
    .text(this._content)

  var popup_close = d3_updateable(this._base, '.info-popup-close', 'div')
    .classed('info-popup-close', true)
    .text('Close')
    .on('click', function(e) {
      setTimeout(function() {
        d3.select('.info-popup').remove();
      }, 1);
    });
}

export default draw
