import d3 from 'd3'
import d3_updateable from '../d3_updateable'

function draw() {
  // Get data
  var data = this._dataFunc();

  /*
    Draw head
  */
  var table_head_wrapper = d3_updateable(this._base, '.table_head', 'thead')
    .classed('table_head', true);

  var table_head_columns = d3_splat(table_head_wrapper, '.table_head_column', 'th', data['header'], function(x){ return x.key })
    .classed('table_head_column', true)
    .text(function(x) {
      return x.title;
    })

  /*
    Draw body
  */
  var table_body_wrapper = d3_updateable(this._base, '.table_body', 'tbody')
    .classed('table_body', true);

  // Loop through rows
  var table_body_rows = d3_splat(table_body_wrapper, '.table_body_row', 'tr', data['body'], function(x){ return x.key })
    .classed('table_body_row', true)
    .datum(function(x){
      return x;
    });

  // Loop through columns
  var table_body_columns = d3_splat(table_body_rows, '.table_body_column', 'td', data['header'], function(x){ return x.key })
    .classed('table_body_column', true)
    .text(function(x, i) {
      var row_data = d3.select(this.parentElement).data()[0];
      return row_data[x.key]
      // TO DO: Can this be done cleaner?
      // var row_data = d3.select(this.parentElement).data()[0];
      // console.log('DATA OF THIS ROW', x, i, d3.select(this.parentElement).data()[0]);
  //     // return data['head'][y]['title'];
  //     console.log('HEAD', data['header'][y]['title']);
    });



  console.log('This is the data', this._dataFunc())
  // table_head_wrapper

  // Draw body

  // console.log('TARGETss', this._base);
  // var table = d3_updateable(target, '.table', 'table')
  //   .classed('table', true);
  //
  // return table;
}

export default draw
