import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function pages(num_pages,current_page) {

  var all_pages = d3.range(1, num_pages);
  var min = Math.max(0,current_page - 3)
  var max = Math.min(current_page + 2,num_pages)

  var start = all_pages.slice(min, current_page);
  var end   = all_pages.slice(current_page, max);

  return start.concat(end);
  
}

function draw_pagination() {
  var data = this._dataFunc();

  var pagination_wrapper = d3.select(this._base.node().parentNode).selectAll('.table_pagination');

  var pages_total = Math.ceil(this._dataFunc().body.length / this._pagination) ;
  var pagination_current = this._pagination_current;

  var pagination_items = pages(pages_total,pagination_current)

  var self = this;

  pagination_wrapper.datum(pagination_items)


  var pagination_items_element = d3_splat(pagination_wrapper, '.pagination_button', 'div',false, function(x){return x})
    .classed('pagination_button', true)
    .text(String)
    .style("font-weight",function(x) {return (x == pagination_current) ? "bold" : undefined})
    .on('click', function(x) {
      self.changePage(x);
      self.draw();
    });

  pagination_items_element.exit().remove()
  pagination_items_element.order(function(p,c){
    return c - p
  })
}

export default draw_pagination
