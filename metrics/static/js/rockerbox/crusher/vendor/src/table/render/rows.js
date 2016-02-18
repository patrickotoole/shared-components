export default function render_rows(table_categories, list) {
  var row = this.render_row(list);

  this.render_title(row);
  this.render_views_metrics(row);
  this.render_categories(row, table_categories);

  var rows_with_data = list.datum()
    .filter(function(x) {
      return ((!!x.timeseries_data) && (!!x.domains));
    });

  var rows_without_data = list.datum()
    .filter(function(x) {
      return !((!!x.timeseries_data) && (!!x.domains));
    });

  if (rows_without_data.length > 0) {
    var vendor_loading = d3_updateable(list, '.vendor-loading', 'div')
      .classed('vendor-loading loading-icon col-md-12', true)
      .style('text-align', 'center')
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader" width="16px"> Loading vendor data...');
  } else {
    d3.select('.vendor-loading').remove();
  }

  if (rows_with_data.length === 0 && rows_without_data.length === 0) {
    d3_updateable(list, '.vendor-empty', 'div')
      .classed('vendor-empty col-md-12', true)
      .style('text-align', 'center')
      .text('No vendor data could be found.')
  }
  return row;
}
