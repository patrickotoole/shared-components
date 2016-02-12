var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.vendors = (function(vendors) {

  var crusher = RB.crusher
  var funnelRow;
  var pubsub = crusher.pubsub
  var comma_formatter = d3.format(',');

  vendors.table = function(funnelRow, obj) {

    var vendors_list_card = d3_updateable(funnelRow, '.vendors-list-card', 'section')
      .classed('vendors-list-card bar series col-md-12', true);

    var controls = d3_updateable(vendors_list_card,'.page-header-controls','div')
      .classed('page-header-controls', true)
      .style("float","right")
      .text('View expanded')
      .on('click', function() {
        RB.crusher.controller.initializers.vendors(obj,true)
      });

    var controls = d3_updateable(vendors_list_card,'.title','div')
      .classed('title', true)
      .style("padding-bottom","30px")
      .text("Vendor Audience Categorization")


    var vendors_list_table = d3_updateable(vendors_list_card, '.vendors-list-card', 'section')
      .classed('vendors-list-table', true);

    var vendor_loading = d3_updateable(vendors_list_card, '.vendor-loading', 'div')
      .classed('vendor-loading loading-icon col-md-12', true)
      .style('text-align', 'center')
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader" width="16px"> Loading vendor data...');

    var table_categories,
        table_data;

    var vendors = {
      'all': [],
      'unhandled': []
    };

    pubsub.publisher("vendors-add-row")
      .producer(function(cb) {
        var next_unhandled_vendor = vendors.unhandled[0];
        render_row(next_unhandled_vendor);
        cb({})
      })

    var render_header = function(unhandled_vendor) {
      var vendor_categories = {};
      // debugger;
      unhandled_vendor.domains.forEach(function(domain) {
        if(typeof vendor_categories[domain.parent_category_name] === typeof undefined) {
          vendor_categories[domain.parent_category_name] = 0;
        }

        vendor_categories[domain.parent_category_name] += domain.count;
      });

      table_categories = d3.entries(vendor_categories).sort(function(x, y) {
        return y.value - x.value;
      }).slice(0,13);

      vendor_header = d3_updateable(vendors_list_table, '.vendors-header-row', 'div')
        .classed('vendors-header-row', true);

      var header_title = d3_updateable(vendor_header, '.vendor-title', 'div')
        .classed('vendor-title', true)
        .text('Vendor')

      var timeseries_header = d3_updateable(vendor_header, '.timeseries-header', 'div')
        .classed('timeseries-header', true)

      d3_splat(timeseries_header, '.timeseries-header-item', 'div', ['Views', 'Visits', 'Uniques'], function(x) {
        return x;
      })
        .classed('timeseries-header-item', true)
        .text(function(x) {
          return x;
        })

      d3_splat(vendor_header, '.vendor-category-header-item', 'div', table_categories, function(x) {
        return x.key;
      })
        .classed('vendor-category-header-item', true)
        .html(function(x) {
          return '<span>' + x.key + '</span>';
        })
    }

    var render_row = function(unhandled_vendor) {
      setTimeout(function() {
        pubsub.subscriber("vendor-timeseries-domains",["actionTimeseriesOnly", "pattern_domains_cached"])
          .run(function(vendor_raw_data, domains_data) {
            // Check if we first have to render a header
            if(vendors['all'].length === vendors['unhandled'].length) {
              render_header(unhandled_vendor)
            }

            unhandled_vendor.timeseries_data.forEach(function(data_point) {

              unhandled_vendor.views = (
                (typeof unhandled_vendor.views === typeof undefined) ?
                  (data_point.views) :
                  (unhandled_vendor.views + data_point.views)
              );
              unhandled_vendor.visits = (
                (typeof unhandled_vendor.visits === typeof undefined) ?
                  (data_point.visits) :
                  (unhandled_vendor.visits + data_point.visits)
              );

              unhandled_vendor.uniques = (
                (typeof unhandled_vendor.uniques === typeof undefined) ?
                  (data_point.uniques) :
                  (unhandled_vendor.uniques + data_point.uniques)
              );
            });

            var vendor_domain_percentages = {};
            unhandled_vendor.total_domains = 0;
            unhandled_vendor.domains.forEach(function(domain) {
              if(typeof vendor_domain_percentages[domain.parent_category_name] === typeof undefined) {
                vendor_domain_percentages[domain.parent_category_name] = 0;
              }

              vendor_domain_percentages[domain.parent_category_name] += domain.count;
              unhandled_vendor.total_domains += domain.count;
            });

            console.log('!!vendor_domain_percentages', vendor_domain_percentages);

            var row = d3_updateable(vendors_list_table, '.vendors-row-' + unhandled_vendor.action_id, 'div')
              .classed('vendors-row vendors-row-' + unhandled_vendor.action_id, true);

            d3_updateable(row, '.vendor-' + unhandled_vendor.action_id + '-column-title', 'div')
              .style('cursor', 'pointer')
              .classed('vendor-column', true)
              .text(unhandled_vendor.action_name)
              .on('click', function() {
                // debugger;
                var xx = RB.crusher.controller.states["/crusher/action/existing"]
                RB.routes.navigation.forward(xx)
                RB.routes.navigation.forward(unhandled_vendor);
              });


            d3_updateable(row, '.vendor-' + unhandled_vendor.action_id + '-column-views', 'div')
              .classed('vendor-column', true)
              .text(comma_formatter(unhandled_vendor.views));

            d3_updateable(row, '.vendor-' + unhandled_vendor.action_id + '-column-visits', 'div')
              .classed('vendor-column', true)
              .text(comma_formatter(unhandled_vendor.visits));

            d3_updateable(row, '.vendor-' + unhandled_vendor.action_id + '-column-uniques', 'div')
              .classed('vendor-column', true)
              .text(comma_formatter(unhandled_vendor.uniques));



            d3_splat(row, '.vendor-column-item', 'div', table_categories, function(x) {
              return x.key;
            })
              .style('background-color', function(x) {
                if(typeof vendor_domain_percentages[x.key] !== typeof undefined) {
                  var transparancy_ratio = Math.round((vendor_domain_percentages[x.key]/unhandled_vendor.total_domains) * 1000)/10;
                } else {
                  var transparancy_ratio = 0;
                }

                var color_ratio = d3.scale.log().domain([1,50]).range([0.05,0.8]);

                return 'rgba(70,130,180,' + color_ratio(transparancy_ratio) + ')';
              })
              .classed('vendor-column-item', true)
              .text(function(x) {
                if(typeof vendor_domain_percentages[x.key] !== typeof undefined) {
                  return Math.round((vendor_domain_percentages[x.key]/unhandled_vendor.total_domains) * 1000)/10 + '%';
                } else {
                  return '0%';
                }
                // return vendor_domain_percentages[x.key];
                // return '<span>' + x.key + '</span>';
              })

            // Remove this vendor from the queue and move on
            vendors.unhandled.splice(0,1);
            if(vendors.unhandled.length > 0) {
              pubsub.publishers['vendors-add-row']();
            } else {
              vendor_loading.remove();
            }
          })
            .data(unhandled_vendor)
            .unpersist(false)
            .trigger();
      }, 1);
    }

    pubsub.subscriber("vendors-data",["actions"])
      .run(function(segments) {
        var filtered_segments = segments.filter(function(x) {
          return (x.action_type === 'vendor');
        })

        // Save the filtered segments
        vendors['all'] = filtered_segments;
        vendors['unhandled'] = JSON.parse(JSON.stringify(filtered_segments));

        // Initiate vendor processing, or show message in case no vendors were found
        if(vendors.unhandled.length > 0) {
          pubsub.publishers['vendors-add-row']();
        } else {
          // Show "no vendor data" message
          console.log('No vendors were found');
        }
      })
      .unpersist(true)
      .trigger();
  }

  return vendors
})(RB.crusher.ui.vendors || {})
