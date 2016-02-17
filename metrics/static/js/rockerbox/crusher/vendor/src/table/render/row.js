export default function(list) {
  var row = d3_splat(list, '.vendors-row', 'div', function(vendors) {
      var vendors_with_data = vendors.filter(function(x) {
        return (x.timeseries_data != undefined) && (x.domains)
      })

      return vendors_with_data.map(function(vendor) {
        if ((vendor.total_domains) && (vendor.views || vendor.visits || vendor.uniques)) return vendor

        vendor.timeseries_data.forEach(function(data_point) {
          vendor.views = (
            (typeof vendor.views === typeof undefined) ?
            (data_point.views) :
            (vendor.views + data_point.views)
          );

          vendor.visits = (
            (typeof vendor.visits === typeof undefined) ?
            (data_point.visits) :
            (vendor.visits + data_point.visits)
          );

          vendor.uniques = (
            (typeof vendor.uniques === typeof undefined) ?
            (data_point.uniques) :
            (vendor.uniques + data_point.uniques)
          );
        });

        if (!vendor.vendor_domain_percentages && !!vendor.domains) {
          var vendor_domain_percentages = {};
          vendor.total_domains = 0;
          vendor.domains.forEach(function(domain) {
            if (typeof vendor_domain_percentages[domain.parent_category_name] === typeof undefined) {
              vendor_domain_percentages[domain.parent_category_name] = 0;
            }

            vendor_domain_percentages[domain.parent_category_name] += domain.count;
            vendor.total_domains += domain.count;
          });

          vendor.vendor_domain_percentages = vendor_domain_percentages;
        }
        return vendor;

      })
    }, function(x) {
      return x.action_id;
    })
    .classed('vendors-row', true);

  return row;
}
