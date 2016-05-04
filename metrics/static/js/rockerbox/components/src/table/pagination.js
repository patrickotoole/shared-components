import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function draw_pagination() {
  var data = this._dataFunc();
  var pagination = this._pagination;

  var pagination_wrapper = d3.select('.table_pagination');

  var pages_total = Math.ceil(this._dataFunc().body.length / this._pagination) + 1;
  var pagination_current = this._pagination_current;

  var all_pages = d3.range(1, pages_total);

  if(pagination_current <= 3) {
    var pagination_start = [1,2,3];
  } else {
    var pagination_start = all_pages.slice(pagination_current - 4, pagination_current);
  }
  var pagination_end = all_pages.slice(pagination_current, pagination_current + 3);

  var pagination_items = pagination_start.concat(pagination_end);

  var self = this;

  pagination_wrapper.datum(pagination_items)

  d3.selectAll('.pagination_button').remove();

  var pagination_items_element = d3_splat(pagination_wrapper, '.pagination_button', 'div', pagination_wrapper.datum(), function(x){ return x })
    .classed('pagination_button', true)
    .html(function(x, i) {
      if(x == pagination_current)
        return '<strong>' + x + '</strong>';
      else
        return '<span>' + x + '</span>';
    })
    .on('click', function(x) {
      self.changePage(x);
      self.draw();
    });
}

export default draw_pagination
