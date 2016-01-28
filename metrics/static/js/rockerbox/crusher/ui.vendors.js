var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.vendors = (function(vendors) {

  var crusher = RB.crusher
  var funnelRow;
  var pubsub = crusher.pubsub

  vendors.show = function(funnelRow) {
    funnelRow = funnelRow;
    var vendors_list_card = d3_updateable(funnelRow, '.vendors-list-card', 'section')
      .classed('vendors-list-card bar series col-md-12', true);

    crusher.subscribe.add_subscriber(["actions"], function(segments) {
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
    }, "vendors-data", true, true);
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

    var subscription = pubsub.subscriber("vendor-timeseries-domains-stuff",["actions"])
      .run(function(x){
        console.log(x);
        debugger
      })
      .data(vendor)
      .unpersist(true)
      .trigger()

    crusher.subscribe.add_subscriber(["actionTimeseriesOnly", "pattern_domains_cached"], function(timeseries_data, domains_data) {
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
          crusher.subscribe.add_subscriber(["resize"], function(output) {
            RB.crusher.ui.vendors.render_row(vendors_list_items);
          }, 'timeseries-resize' , true, false);
        }
      }, 1);
    }, 'vendor-timeseries-domains', true, true, vendor);
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
          var pp = pie.pie(target)
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
          var comma_formatter = d3.format(',')
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
