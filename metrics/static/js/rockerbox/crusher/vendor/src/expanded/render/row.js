
export default function(rows) {
  var vendors = this;

  vendors.render_nav(rows)

  var vendor_data_columns = d3_updateable(rows, '.vendor-data-column', 'div')
    .classed('vendor-data-column col-lg-10 col-md-12', true)

  var data_columns_without_data = vendor_data_columns.filter(function(x) { return !x.views_data })

  d3_updateable(data_columns_without_data, '.vendor-loading', 'div')
    .classed('vendor-loading loading-icon col-md-12', true)
    .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading vendor data...')

  rows.selectAll(".vendor-loading").filter(function(x){return x.timeseries_data || x.domains}).remove()

  var column = rows.selectAll('.vendor-data-column');
  vendors.render_visits(vendor_data_columns);
  vendors.render_pie(vendor_data_columns);
  vendors.render_onsite(vendor_data_columns);

}
