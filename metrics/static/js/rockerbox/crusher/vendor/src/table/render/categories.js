export default function(row, table_categories) {

  d3_splat(row, '.vendor-column-item', 'div', table_categories, function(x) {
      return x.key;
    })
    .style('background-color', function(x) {

      var unhandled_vendor = this.parentNode.__data__
      var vendor_domain_percentages = unhandled_vendor.vendor_domain_percentages

      if (typeof vendor_domain_percentages[x.key] !== typeof undefined) {
        var transparancy_ratio = Math.round((vendor_domain_percentages[x.key] / unhandled_vendor.total_domains) * 1000) / 10;
      } else {
        var transparancy_ratio = 0;
      }

      var color_ratio = d3.scale.log().domain([1, 50]).range([0.05, 0.8]);

      return 'rgba(70,130,180,' + color_ratio(transparancy_ratio) + ')';
    })
    .classed('vendor-column-item', true)
    .text(function(x) {
      var unhandled_vendor = this.parentNode.__data__
      var vendor_domain_percentages = unhandled_vendor.vendor_domain_percentages


      if (typeof vendor_domain_percentages[x.key] !== typeof undefined) {
        return Math.round((vendor_domain_percentages[x.key] / unhandled_vendor.total_domains) * 1000) / 10 + '%';
      } else {
        return '0%';
      }
    });

}
