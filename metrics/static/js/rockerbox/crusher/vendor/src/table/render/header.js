export default function(target, table_categories) {
  var vendor_header = d3_updateable(target, '.vendors-header-row', 'div')
    .classed('vendors-header-row', true);

  var header_title = d3_updateable(vendor_header, '.vendor-title', 'div')
    .classed('vendor-title', true)
    .text(this._cohort)

  // var timeseries_header = d3_updateable(vendor_header, '.timeseries-header', 'div')
  //   .classed('timeseries-header', true)

  var _ = ['Views', 'Visits', 'Uniques']

  d3_splat(vendor_header, '.timeseries-header-item', 'div', _, function(x) {
      return x;
    })
    .classed('timeseries-header-item', true)
    .text(String)

  d3_splat(vendor_header, '.vendor-category-header-item', 'div', table_categories, function(x) {
      return x.key;
    })
    .classed('vendor-category-header-item', true)
    .html(function(x) {
      return '<span>' + x.key + '</span>';
    })
}
