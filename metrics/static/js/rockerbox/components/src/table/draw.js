import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'

function head() {
  this._headers

  var thead = d3_updateable(this._base, '.table_head', 'thead')
    .classed('table_head', true);

  var row = d3_updateable(thead, '.table_head_row', 'tr')
    .classed('table_head_row', true);

  var self = this;

  var th = d3_splat(row, '.table_head_column', 'th', this._headers, function(x){ return x.key })
    .classed('table_head_column', true)
    .text(function(x) { return x.title; })
    .style('cursor', 'pointer')
    .on('click', function(e) {

      self._pagination_current = 1

      this._ascending = !this._ascending

      var func = this._ascending ? d3.ascending : d3.descending
      var data = self._dataFunc()

      data.body = data.body.sort(function(p,c){ return func(p[e.key],c[e.key]) })

      self.draw()

    })
}

function get_page() {
  console.log(this._pagination)

}

function draw() {

  var data = this._dataFunc();
  this._headers = data.header

  head.bind(this)()

  /*
    Draw body
  */
  var table_body_wrapper = d3_updateable(this._base, '.table_body', 'tbody')
    .classed('table_body', true);

  this._body = data.body
  get_page.bind(this)()
  // Loop through rows
  if(this._pagination) {
    var data_slice_start = (this._pagination_current * this._pagination) - this._pagination;
    var data_slice_end = (this._pagination_current * this._pagination);
    var table_data = data['body'].slice(data_slice_start, data_slice_end);
  } else {
    var table_data = data['body'];
  }

  // d3.selectAll('.table_body_row').remove();

  var table_body_rows = d3_splat(table_body_wrapper, '.table_body_row', 'tr', table_data, function(x,i){ return i })
    .classed('table_body_row', true)
    .datum(function(x){
      return x;
    });

  // Loop through columns
  var table_body_columns = d3_splat(table_body_rows, '.table_body_column', 'td', data['header'], function(x){ return x.key })
    .classed('table_body_column', true)
    .html(function(x, i) {
      var row_data = d3.select(this.parentElement).data()[0];
      var column_value = row_data[x.key];

      if(typeof x.href !== typeof undefined && x.href == true) {

        var text = (row_data[x.key].length > 100) ? column_value.slice(0,100) : column_value;
        if (row_data.title) {
          text = row_data.title;
        }
        column_value = '<a href="' + column_value + '" target="_blank">' + text + '</a>';
      }

      return column_value;
    });

  if (this._pagination) {

    var pagination_current = this._pagination_current;
    var self = this

    var max = Math.ceil(self._dataFunc().body.length / self._pagination)

    var wrapper = d3_updateable(this._target, ".table_page_wrapper","div")
      .classed("table_page_wrapper",true)
      .style("text-align","center")

    var left = d3_updateable(wrapper, '.table_pagination_left', 'div',false,function(x,i){return i})
      .classed('table_pagination_left no-select', true)
      .style('display', "inline-block")

    d3_updateable(left, ".pagination_button_first","div")
      .classed("pagination_button_first pagination_button",true)
      .attr("style", "display: inline-block; padding: 0 20px; min-width: 50px; line-height: 50px; text-align: center; cursor: pointer; color: #777;")
      .on("click",function(x){
        self.changePage(1)
        self.draw()
      })
      .text("<<")

    d3_updateable(left, ".pagination_button_prev","div")
      .classed("pagination_button_prev pagination_button",true)
      .attr("style", "display: inline-block; padding: 0 20px; min-width: 50px; line-height: 50px; text-align: center; cursor: pointer; color: #777;")
      .on("click",function(x){
        self.changePage(Math.max(1,pagination_current-1))
        self.draw()
      })
      .text("<")







    var pagination_wrapper = d3_updateable(wrapper, '.table_pagination', 'div',false,function(x,i){return i})
      .classed('table_pagination no-select', true)
      .style('display', "inline-block")

    var right = d3_updateable(wrapper, '.table_pagination_right', 'div',false,function(x,i){return i})
      .classed('table_pagination_right no-select', true)
      .style('display', "inline-block")

    d3_updateable(right,".pagination_button_next","div")
      .classed("pagination_button_next pagination_button",true)
      .attr("style","display: inline-block; padding: 0 20px; min-width: 50px; line-height: 50px; text-align: center; cursor: pointer; color: #777;")
      .on("click",function(x){
        self.changePage(Math.min(max,pagination_current+1))
        self.draw()
      })
      .text(">")


    d3_updateable(right,".pagination_button_last","div")
      .classed("pagination_button_last pagination_button",true)
      .attr("style","display: inline-block; padding: 0 20px; min-width: 50px; line-height: 50px; text-align: center; cursor: pointer; color: #777;")
      .on("click",function(x){
        self.changePage(max)
        self.draw()
      })
      .text(">>")


    this.draw_pagination();
  }

  return this;
}

export default draw
