var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.vendors = (function(vendors) {

  var crusher = RB.crusher
  var funnelRow;
  var pubsub = crusher.pubsub
  var comma_formatter = d3.format(',');

  vendors.table = function(funnelRow) {
    var vendors_list_card = d3_updateable(funnelRow, '.vendors-list-card', 'section')
      .classed('vendors-list-card bar series col-md-12', true);

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

      // table_categories = table_categories.concat({
      //   key: 'Uniques'
      // },
      // {
      //   key: 'Views'
      // },
      // {
      //   key: 'Visits'
      // })

      vendor_header = d3_updateable(vendors_list_table, '.vendors-header-row', 'div')
        .classed('vendors-header-row', true);

      var header_title = d3_updateable(vendor_header, '.vendor-title', 'div')
        .classed('vendor-title', true)
        .text('Vendor')

      d3_splat(vendor_header, '.vendor-category-header-item', 'div', table_categories, function(x) {
        return x.key;
      })
        .classed('vendor-category-header-item', true)
        .html(function(x) {
          return '<span>' + x.key + '</span>';
        })

      var timeseries_header = d3_updateable(vendor_header, '.timeseries-header', 'div')
        .classed('timeseries-header', true)

      d3_splat(timeseries_header, '.timeseries-header-item', 'div', ['Uniques', 'Views', 'Visits'], function(x) {
        return x;
      })
        .classed('timeseries-header-item', true)
        .text(function(x) {
          return x;
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
              unhandled_vendor.uniques = (
                (typeof unhandled_vendor.uniques === typeof undefined) ?
                  (data_point.uniques) :
                  (unhandled_vendor.uniques + data_point.uniques)
              );
              unhandled_vendor.visits = (
                (typeof unhandled_vendor.visits === typeof undefined) ?
                  (data_point.visits) :
                  (unhandled_vendor.visits + data_point.visits)
              );
              unhandled_vendor.views = (
                (typeof unhandled_vendor.views === typeof undefined) ?
                  (data_point.views) :
                  (unhandled_vendor.views + data_point.views)
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
              .classed('vendor-column', true)
              .text(unhandled_vendor.action_name);

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

              d3_updateable(row, '.vendor-' + unhandled_vendor.action_id + '-column-uniques', 'div')
                .classed('vendor-column', true)
                .text(unhandled_vendor.uniques);

              d3_updateable(row, '.vendor-' + unhandled_vendor.action_id + '-column-views', 'div')
                .classed('vendor-column', true)
                .text(unhandled_vendor.views);

              d3_updateable(row, '.vendor-' + unhandled_vendor.action_id + '-column-visits', 'div')
                .classed('vendor-column', true)
                .text(unhandled_vendor.visits);

            // Remove this vendor from the queue and move on
            vendors.unhandled.splice(0,1);
            if(vendors.unhandled.length > 0) {
              pubsub.publishers['vendors-add-row']();
            } else {
              vendor_loading.remove();
            }
          })
            .data(unhandled_vendor)
            .unpersist(true)
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

  vendors.show = function(funnelRow) {
    funnelRow = funnelRow;
    var vendors_list_card = d3_updateable(funnelRow, '.vendors-list-card', 'section')
      .classed('vendors-list-card bar series col-md-12', true);

    pubsub.subscriber("vendors-data",["actions"])
      .run(function(segments){
        var vendors = segments.filter(function(x) {
          return x.action_type == 'vendor';
        })

        /* Vendor List */
        var vendors_list = d3_updateable(vendors_list_card, '.vendors-list', 'ul')
          .classed('vendors-list', true);

        /* Vendor List Items */
        var vendors_list_items = d3_splat(vendors_list, '.vendors-list-item', 'li', vendors, function(x) {
          return x.action_name;
        })
          .datum(function(x) {
            return x;
          })
          .classed('vendors-list-item', true);

          var vendor_name_column = d3_updateable(vendors_list_items, '.vendor-name-column', 'div')
            .classed('vendor-name-column col-lg-2 col-md-6', true)

            var vendor_name = d3_updateable(vendor_name_column, '.vendor-name', 'div')
              .classed('col-md-12 vendor-name', true)
              .html(function(x) {
                return '<h2>' + x.action_name + '</h2>';
              });

            // Vendor List Item : Expand Button
            var vendor_expand = d3_updateable(vendor_name_column, '.vendor-expand', 'div')
              .classed('col-md-12 vendor-expand', true)


            var navigation_items = [{
                title: 'Opportunities',
                url: 'advertiser-opportunities'
              }, {
                title: 'Before and After',
                url: 'before-and-after'
              }, {
                title: 'Clusters',
                url: 'clusters'
              }, {
                title: 'Timing',
                url: 'timing'
              }, {
                title: 'Comparison',
                url: 'comparison'
              }]

            var vendor_navigation_list = d3_updateable(vendor_name_column, '.vendor-navigation-list', 'ul')
              .classed('col-md-12 vendor-navigation-list', true)
              .each(function(y) {
                y.navigation_items = JSON.parse(JSON.stringify(navigation_items)).map(function(x){
                  x.action_name = y.action_name
                  return x;
                })
                return y;
              })

            var vendor_navigation_items = d3_splat(vendor_navigation_list, '.vendors-list-item', 'li', function(x) {
              return x.navigation_items;
            },
            function(x) {
              return x.title;
            })
            .classed('vendors-list-item', true);

            d3_updateable(vendor_navigation_items, 'a', 'a')
              .attr('href', function(x) {
                return '/crusher/action/existing?id=/' + x.action_name + '#' + x.url;
              })
              .text(function(x) { return x.title; })
              .on('click', function(x) {
                RB.routes.navigation.forward({
                  "name": "View Existing Actions",
                  "push_state":"/crusher/action/existing",
                  "skipRender": true,
                  "values_key":"action_name"
                })
                RB.routes.navigation.forward(d3.select(this.parentElement.parentElement).datum())

                d3.event().preventDefault();
              })

          RB.crusher.ui.vendors.render_row(vendors_list_items);

      })
      .unpersist(true)
      .trigger()
  }

  vendors.render_row = function(vendors_list_items) {
    var vendor_data_columns = d3_updateable(vendors_list_items, '.vendor-data-column', 'div')
      .classed('vendor-data-column col-lg-10 col-md-12', true)

    var data_columns_without_data = vendor_data_columns.filter(function(x) {
      return typeof x.visits_data === typeof undefined;
    })
    var vendor_loading = d3_updateable(data_columns_without_data, '.vendor-loading', 'div')
      .classed('vendor-loading loading-icon col-md-12', true)
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading vendor data...')

    var vendors_filtered = vendors_list_items.filter(function(x) {
      return typeof x.visits_data === typeof undefined;
    });

    console.log('vendors_list_items', vendors_list_items);
    var vendor = vendors_list_items.data()
      .filter(function(x) {
        return typeof x.visits_data === typeof undefined;
      })[0];

    var vendor_not_missing_data = (typeof vendor === typeof undefined);

    if(vendor_not_missing_data) {
      vendor = vendors_list_items.datum();
    }

    pubsub.subscriber("vendor-timeseries-domains",["actionTimeseriesOnly", "pattern_domains_cached"])
      .run(function(timeseries_data, domains_data){
        var data_columns_with_data = vendor_data_columns.filter(function(x) {
          return typeof x.visits_data !== typeof undefined;
        })

        data_columns_with_data.select('.vendor-loading').remove();

        vendor.visits_data.forEach(function(vendor_timeseries_item) {
          vendor_timeseries_item.key = vendor_timeseries_item.date;
        });

        RB.crusher.ui.vendors.add_visits_chart(vendor, vendor_data_columns);

        RB.crusher.ui.vendors.add_domains_pie(vendor, vendor_data_columns);

        /*
        **  3rd Column
        */
        var vendor_onsite_column = d3_updateable(vendor_data_columns, '.vendor-onsite-column', 'div')
          .classed('vendor-onsite-column col-lg-4 col-md-6', true)
          .html(function(x) {
            if(typeof x.timeseries_data !== typeof undefined) {
              return '<h3>On-site</h3><div class="coming-soon-box">(coming soon)</div>';
            }
          });

        setTimeout(function() {
          if(!vendor_not_missing_data) {
            RB.crusher.ui.vendors.render_row(vendors_list_items);
            pubsub.subscriber("timeseries-resize",["resize"])
              .run(function(output){
                RB.crusher.ui.vendors.add_visits_chart(vendor, vendor_data_columns);
              })
              .unpersist(false)
              .trigger()
          }
        }, 1);
      })
      .data(vendor)
      .unpersist(true)
      .trigger()
    }

  vendors.add_domains_pie = function(vendor, vendor_data_columns) {
    // Vendor List Item : Domains Pie
    var vendor_domains_pie_column = d3_updateable(vendor_data_columns, '.vendor-domains-pie-column', 'div')
      .classed('vendor-domains-pie-column col-lg-4 col-md-6', true)
      .html(function(x) {
        if(typeof x.domains !== typeof undefined) {
          return '<h3>Off-site</h3><p class="chart-description">A category breakdown for off-site activity.</p>';
        }
      });

    var vendor_domains_pie = d3_updateable(vendor_domains_pie_column, '.vendor-domains-pie', 'div')
      .classed('col-md-12 row vendor-domains-pie', true)
      .style('width', '220px')
      .style('padding', '0px')

      var category_data = {};
      vendor.domains.forEach(function(domain) {
        if(typeof category_data[domain.parent_category_name] === typeof undefined) {
          category_data[domain.parent_category_name] = domain.count;
        } else {
          category_data[domain.parent_category_name] += domain.count;
        }
      })

      var parentCategoryData = d3.entries(category_data).map(function(x) {
        return {
          label: x.key,
          value: x.value
        }
      });

      vendor_domains_pie.datum(function(x) {
        if(vendor.action_id === x.action_id) {
          x.parentCategoryData = parentCategoryData;
        }
          return x;
      })

      vendor_domains_pie.each(function(y){
        if(typeof y.parentCategoryData !== typeof undefined) {
          var target = d3.select(this);
          var pp = components.pie(target)
          pp.colors(RB.crusher.ui.action.category_colors)
          // pp.width(150);
          pp.data(
            function(x){
              // debugger;
              x.parentCategoryData.filter(function(x){
                return x.label != 'NA';
              })

              x.parentCategoryData.sort(function(a,b){
                return b.value - a.value;
              })
              return x.parentCategoryData
            },
            function(d){ return d.data.label }
          )
          target.selectAll("svg").on("click",function(x){
            pp._hover()
            pp.draw()
          })
          pp.draw()
          d3.selectAll('svg g.desc')
            .style('font-size', '0.9em');
        }
      });
  }

  vendors.add_visits_chart = function(vendor, vendor_data_columns) {
    vendor.visits_sum = vendor.visits_data.reduce(function(p,c) {
      return p + c.visits;
    },0)

    var vendor_views_column = d3_updateable(vendor_data_columns, '.vendor-views-column', 'div')
      .classed('vendor-views-column col-lg-4 col-md-6', true)
      .html(function(x) {
        if(typeof x.visits_sum !== typeof undefined) {
          return '<h3>Visits</h3><h4>'+comma_formatter(x.visits_sum)+'</h4><p style="margin-bottom: 25px;">This is the number of page views per day.</p>'
        }
      });

    vendor_views_column.each(function(x){
      if(typeof x.visits_data !== typeof undefined) {
        var toDraw = d3.select(this);
        // console.log('x',JSON.serialize(x));
        x.visits_data.sort(function(a,b) {
          return (new Date(a.key) - new Date(b.key));
        });
        var visitor_chart = RB.rho.ui.buildTimeseries(toDraw, x.visits_data, "Views", ["visits"], undefined, false, 95);


      }
    });
  }
  return vendors
})(RB.crusher.ui.vendors || {})
