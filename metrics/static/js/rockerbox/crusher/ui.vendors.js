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
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader" width="16px"> Loading vendor data...')

    var unhandled_vendors,
        vendor_header;

    /*
      Publisher for adding a row
    */
    pubsub.publisher("vendors-add-row")
      .producer(function(cb) {
        var next_unhandled_vendor = unhandled_vendors[0];
        render_row(next_unhandled_vendor);
        cb({})
      })

    var render_row = function(vendor) {
      unhandled_vendors.splice(0,1);

      if(unhandled_vendors.length > 0) {
        setTimeout(function() {
          // debugger;


          pubsub.subscriber("vendor-timeseries-domains",["actionTimeseriesOnly", "pattern_domains_cached"])
            .run(function(vendor_raw_data, domains_data) {

              var vendor_data = {
                uniques: 0,
                views: 0,
                visits: 0,
                domains: []
              }

              var category_data = {};
              vendor.domains.forEach(function(domain) {
                if(typeof category_data[domain.parent_category_name] === typeof undefined) {
                  category_data[domain.parent_category_name] = domain.count;
                } else {
                  category_data[domain.parent_category_name] += domain.count;
                }
              })

              // Create the header titles while we're here anyway
              Object.keys(category_data).forEach(function(x, y) {
                vendor_data.domains.push({
                  category: x,
                  count: category_data[x]
                });
              });






              if(vendor_header == null) {
                  vendor_header = d3_updateable(vendors_list_table, '.vendors-header-row', 'div')
                    .classed('vendors-header-row', true)
                    .style('text-align', 'right')
                    .style('height', '150px');

                  var header_title = d3_updateable(vendor_header, '.vendor-title', 'div')
                    .classed('vendor-title', true)
                    .text('Vendor')

                  var header_metrics = d3_updateable(vendor_header, '.vendor-metrics', 'div')
                    .classed('vendor-metrics', true)


                var metrics_header_splat = d3_splat(header_metrics, '.vendor-metrics-header-item', 'div', vendor_data.domains, function(x) {
                  return x.category;
                })
                  .classed('vendor-metrics-header-item', true)
                  .html(function(x) {
                    return '<span>' + x.category + '</span>';
                  })

                // console.log('!!!! THIS', category_data)
              }






              console.log(vendor_data);

              JSON.parse(JSON.stringify(vendor_raw_data.visits_data)).forEach(function(x) {
                vendor_data.uniques += x.uniques;
                vendor_data.views += x.views;
                vendor_data.visits += x.visits;
              });
              console.log(vendor_data);

              // JSON.parse(JSON.stringify(vendor_raw_data.visits_data)).foreach(function(x) {
              //   debugger;
              //   vendor_data.uniques += x.uniques;
              //   vendor_data.views += x.views;
              //   vendor_data.visits += x.visits;
              // });

              var vendor_row = d3_updateable(vendors_list_table, '.vendors-row-' + vendor.action_id, 'div')
                .classed('vendors-row vendors-row-'+vendor.action_id, true)

              var vendor_title = d3_updateable(vendor_row, '.vendor-title', 'div')
                .classed('vendor-title', true)
                .text(vendor.action_name);

              var vendor_domain_categories = d3_updateable(vendor_row, '.vendor-domain-categories', 'div')
                .classed('vendor-domain-categories', true)

              var visit_data_splat = d3_splat(vendor_domain_categories, '.vendors-list-item', 'div', ['uniques', 'views', 'visits'], function(x) {
                return x;
              })
                .text(function(x) {
                  return comma_formatter(vendor_data[x]);
                })

              // var vendor_domain_category = d3_updateable(vendor_domain_categories, '.vendor-domain-category', 'div')
              //   .classed('vendor-domain-category', true)
              //   .text('2')
              // debugger;
              pubsub.publishers['vendors-add-row']();
            })
            .data(vendor)
            .unpersist(true)
            .trigger();

        }, 1)
      } else {
        vendor_loading.remove()
      }
    }

    /*
      Fetch list of vendors
    */
    pubsub.subscriber("vendors-data",["actions"])
      .run(function(segments) {
        unhandled_vendors = segments.filter(function(x) {
          return (x.action_type === 'vendor');
        })

        pubsub.publishers['vendors-add-row']();
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
