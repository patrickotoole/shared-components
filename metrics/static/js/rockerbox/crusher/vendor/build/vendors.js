(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('vendors', ['exports'], factory) :
  factory((global.vendors = {}));
}(this, function (exports) { 'use strict';

  function render_onsite(vendor_data_columns) {
    var vendor_onsite_column = d3_updateable(vendor_data_columns, '.vendor-onsite-column', 'div')
      .classed('vendor-onsite-column col-lg-4 col-md-6', true)
      .html('<h3 style="margin-bottom: 10px;">On-site</h3>')
      .style('display', 'none');

    var vendor_sessions_per_day = d3_updateable(vendor_onsite_column, '.vendor-sessions-per-day', 'div')
      .classed('vendor-sessions-per-day col-lg-6 col-md-6', true)
      .html('<h4># of sessions</h4>')
      .style('display', 'none');

    var vendor_visits_per_user = d3_updateable(vendor_onsite_column, '.vendor-visits-per-user', 'div')
      .classed('vendor-visits-per-user col-lg-6 col-md-6', true)
      .html('<h4># of views per user</h4>')
      .style('display', 'none');

    var slice_segments = function(items) {
      var items_chunk_size = Math.ceil(items.length / 10);

      // Segment chunk sizes 10%, 10%, 20%, 30%, 30%
      var views_segmented = [{
        items: items.slice(0, 1)
      }, {
        items: items.slice(1, items_chunk_size)
      }, {
        items: items.slice(items_chunk_size, (items_chunk_size * 2))
      }, {
        items: items.slice((items_chunk_size * 2), (items_chunk_size * 4))
      }, {
        items: items.slice((items_chunk_size * 4), (items_chunk_size * 7))
      }, {
        items: items.slice((items_chunk_size * 7), (items_chunk_size * 10))
      }];

      return views_segmented;
    }

    vendor_visits_per_user.each(function(row) {
      if (row.onsite != undefined) {
        d3.select(this).style('display', 'block');
        d3.select(d3.select(this).node().parentNode).style('display', 'block');

        var views = slice_segments(row.onsite.response.visits);

        views.map(function(x, i) {
          x.key = i;
          if(x.items[0]) {
            if(x.items[0].num_visits == 1) {
              x.title = '1 view'
            } else if(x.items[0].num_visits == x.items[x.items.length - 1].num_visits) {
              x.title = x.items[0].num_visits + ' views';
            } else {
              x.title = x.items[0].num_visits + ' - ' + x.items[x.items.length - 1].num_visits + ' views';
            }
          } else {
            x.title = '';
          }
          x.value = d3.sum(x.items, function(y) {
            return y.visit_user_count;
          });
          return x;
        });

        var histogram_visits = components.histogram(d3.select(this))
          .data(views)
          .draw();
      }
    });

    vendor_sessions_per_day.each(function(row) {
      if (row.onsite != undefined) {
        d3.select(this).style('display', 'block');
        d3.select(d3.select(this).node().parentNode).style('display', 'block');

        var sessions = slice_segments(row.onsite.response.sessions);
        sessions.map(function(x, i) {
          x.key = i;

          if(x.items[0]) {
            if(x.items[0].num_sessions == 1) {
              x.title = '1 time';
            } else if(x.items[0].num_sessions == x.items[x.items.length - 1].num_sessions) {
              x.title = x.items[0].num_sessions + ' times';
            } else {
              x.title = x.items[0].num_sessions + ' - ' + x.items[x.items.length - 1].num_sessions + ' times';
            }
          } else {
            x.title = '';
          }

          x.value = d3.sum(x.items, function(y) {
            return y.sessions_user_count;
          });
          return x;
        });

        var histogram_sessions = components.histogram(d3.select(this))
          .data(sessions)
          .draw();
      }
    });
  }

  var comma_formatter = d3.format(',');

  function render_visits(vendor_data_columns) {

    var vendor_views_column = d3_updateable(vendor_data_columns, '.vendor-views-column', 'div')
      .classed('vendor-views-column col-lg-4 col-md-6', true)
      .html(function(x) {

        if (!!x.visits_data) x.views_sum = x.visits_data.reduce(function(p,c) { return p + c.views },0)
        
        if(typeof x.views_sum !== typeof undefined) {
          var result = '<h3>Views</h3><h4>'
          result += comma_formatter(x.views_sum)
          result += '</h4><p style="margin-bottom: 25px;">This is the number of page views per day.</p>'

          return result
        }
      });

    vendor_views_column.each(function(x){
      if(typeof x.visits_data !== typeof undefined) {
        var toDraw = d3.select(this)

        x.visits_data.map(function(z){ z.key = z.date })
        // this isnt doing anything?
        x.visits_data.sort(function(a,b) { return (new Date(a.key) - new Date(b.key)) })
        var visitor_chart = RB.rho.ui.buildTimeseries(toDraw,x.visits_data,"Views",["views"],undefined,false,95)
      }
    });

  }

  function render_pie(vendor_data_columns) {

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

      

    vendor_domains_pie.datum(function(x) {

      if (x.parentCategoryData == undefined && x.domains) {

        var category_data = x.domains.reduce(function(p,domain){
          var category = domain.parent_category_name

          p[category] = p[category] || 0
          p[category] += domain.count

          return p
        },{})

        var parentCategoryData = d3.entries(category_data)
          .map(function(c) { return { label: c.key, value: c.value } })

        x.parentCategoryData = parentCategoryData

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

  function render_nav(items) {

      var vendor_name_column = d3_updateable(items, '.vendor-name-column', 'div')
        .classed('vendor-name-column col-lg-12 col-md-12', true)

      var vendor_name = d3_updateable(vendor_name_column, '.vendor-name', 'div')
        .classed('col-md-12 vendor-name', true)
        .html(function(x) { return '<h2>' + x.action_name + '</h2>'; })
        .on('click', function(e) {
          RB.routes.navigation.forward({
                "name": "View Existing Actions",
                "push_state":"/crusher/action/existing",
                "skipRender": true,
                "values_key":"action_name"
              })
              RB.routes.navigation.forward(d3.select(this.parentElement.parentElement).datum())

              d3.event().preventDefault();
        });

      // var vendor_navigation_items = d3_splat(vendor_navigation_list, '.nav-list-item', 'li',
      //   navigation_items,
      //   function(x) { return x.title }
      // )
      // .classed('nav-list-item', true);
      //
      // d3_updateable(vendor_navigation_items, 'a', 'a')
      //   .attr('href', function(x) {
      //     return '/crusher/action/existing?id=/' + x.action_name + '#' + x.url;
      //   })
      //   .text(function(x) { return x.title; })
      //   .on('click', function(x) {
      //     RB.routes.navigation.forward({
      //       "name": "View Existing Actions",
      //       "push_state":"/crusher/action/existing",
      //       "skipRender": true,
      //       "values_key":"action_name"
      //     })
      //     RB.routes.navigation.forward(d3.select(this.parentElement.parentElement).datum())
      //
      //     d3.event().preventDefault();
      //   })

  }

  function render_row(rows) {
    var vendors = this;

    vendors.render_nav(rows)

    var vendor_data_columns = d3_updateable(rows, '.vendor-data-column', 'div')
      .classed('vendor-data-column col-lg-12 col-md-12', true)

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

  function render_list(list) {

    var rows = d3_splat(list, '.vendors-list-item', 'li', false, function(x) { return x.action_name; })
      .classed('vendors-list-item  series', true);

    rows.exit().remove()


    return rows
  }

  function render_wrapper(target) {

    // var controls = d3_updateable(target,'.page-header-controls','div')
    //   .classed('page-header-controls', true)
    //   .text('View as table')
    //   .on('click', function(x) { this._on.click(x) }.bind(this) )


    var vendors_list_card = d3_updateable(target, '.vendors-list-card', 'section', false, function(x){return 1})
      .classed('vendors-list-card col-md-12', true);

    var vendors_list = d3_updateable(vendors_list_card, '.vendors-list', 'ul',false, function(x){return 1})
      .classed('vendors-list', true);


    return vendors_list

  }

  function render_button() {}

  function missing(data) {

    var missing_data = data.filter(function(action){
      return !action.timeseries_data || !action.domains || !action.onsite 
    })

    return missing_data
  }

  function should_trigger(datum) {
    return !datum.timeseries_data && !datum.domains && !datum.onsite
  }

  function trigger(datum) {
    setTimeout(function(){
      pubsub.publishers.actionTimeseriesOnly(datum)
      pubsub.publishers.pattern_domains_cached(datum)
      pubsub.publishers.uids_only_cache(datum)
    },1)
  }

  function run_missing(data, force) {

    if (force) {
      this.draw.bind(this)(false,false,false,true)
      return trigger(data[0])
    }

    var missing_data = missing(data)

    if ((missing_data.length == 0)) return this.draw.bind(this)(false,false,false,true)
    if (should_trigger(missing_data[0]) ) return trigger(missing_data[0])

    return

  }

  function unsubscribe() {}

  function subscribe() {

    pubsub.subscriber("vendor-timeseries-domains",["actionTimeseriesOnly", "pattern_domains_cached", "uids_only_cache"])
      .run(this.draw.bind(this))
      .unpersist(false)

    // pubsub.subscriber("vendor-timeseries-domains-resize",["resize"])
    //   .run(this.draw.bind(this))
    //   .unpersist(false)

    return this
  }

  function set_and_draw(segments) {
    this.datum(segments)
    this.draw()
    this.run_missing(this.datum(),true)
  }

  function initialize(subscribe_to) {

    var subscribe_to = subscribe_to || "vendors"

    if (this._data == this._wrapper.datum()) {
      return set_and_draw(this._data)
    }

    var self = this;

    pubsub.subscriber("vendors-data",[subscribe_to])
      .run(set_and_draw.bind(self))
      .unpersist(true)
      .trigger()

    return this
  }

  function Expanded(target) {
    this._target = target
    this._wrapper = this.render_wrapper(target)
    this._data = []
    this._on = {}
  }

  function datum(d) {
    if (d !== undefined) {

      if (this._filter) d = d.filter(this._filter)
      this._data = d

      this._wrapper.datum(d)
      return this
    }
    var d = this._wrapper.datum()
    if (this._filter) d = d.filter(this._filter)

    this._wrapper.datum(d)

    return d

  }

  function draw(_d1, _d2, _d3, skip_missing) {

    var data = this.datum() // bind the new, filtered data...

    console.log("DRAWING", skip_missing, data)
    //debugger

    //if ( (this._wrapper.datum().length ) && (this._data !== this._wrapper.datum()) ) return this


    var items = this.render_list(this._wrapper)
    this.render_row(items)


    if (!skip_missing) this.run_missing(data);

    


    return this
  }


  function vendor_expanded(target){
    return new Expanded(target)
  }

  Expanded.prototype = {
    initialize: initialize,
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    run_missing: run_missing,

    draw: draw,
    datum: datum,
    on: function(x,y) { this._on[x] = y; return this },
    filter: function(x) {
      this._filter = x
      return this
    },

    render_button: render_button,
    render_wrapper: render_wrapper,
    render_list: render_list,
    render_row: render_row,
    render_nav: render_nav,
    render_pie: render_pie,
    render_visits: render_visits,
    render_onsite: render_onsite
  }

  function render_categories(row, table_categories) {

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

  function render_views_metrics(row) {
    var comma_formatter = d3.format(',');

    d3_updateable(row, '.vendor-column-views', 'div')
      .classed('vendor-column vendor-column-views', true)
      .text(function(x) {
        return comma_formatter(x.views)
      });

    d3_updateable(row, '.vendor-column-visits', 'div')
      .classed('vendor-column vendor-column-visits', true)
      .text(function(x) {
        return comma_formatter(x.visits)
      });

    d3_updateable(row, '.vendor-column-uniques', 'div')
      .classed('vendor-column vendor-column-uniques', true)
      .text(function(x) {
        return comma_formatter(x.uniques)
      });
  }

  function render_title(row) {
    d3_updateable(row, '.vendor-column-title', 'div')
      .style('cursor', 'pointer')
      .classed('vendor-column vendor-column-title', true)
      .text(function(x){ return x.action_name })
      .on('click', function(x) {
        RB.routes.navigation.forward({
          "name": "View Existing Actions",
          "push_state": "/crusher/action/existing",
          "skipRender": true,
          "values_key": "action_name"
        })
        setTimeout(RB.routes.navigation.forward,1,x)
      });
  }

  function render_header(target, table_categories) {
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

  function render_rows(table_categories, list) {
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

  function render_row$1(list) {
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

  function render_wrapper$1(target) {

    var controls = d3_updateable(target, '.page-header-controls', 'div')
      .classed('page-header-controls', true)
      .text('View expanded')
      .on('click', function(x) {
        RB.crusher.controller.initializers.vendors(x,true)
      }.bind(this) )

      var vendors_list_card = d3_updateable(target, '.vendors-list-table', 'section')
        .classed('vendors-list-table bar series col-md-12 show-loading', true)

      vendors_list_card.exit().remove();
      var title = d3_updateable(vendors_list_card, '.vendor-card-title', 'div')
        .classed('vendor-card-title', true)
        .text(this._title)
        .style('font-weight', 'bold')
        .style('font-size', '18px')
        .style('line-height', '22px')
        .style('color', '#5A5A5A');

    return vendors_list_card;

  }

  function Table(target, title, cohort) {
    this._target = target;
    this._wrapper = this.render_wrapper(target);
    this._data = [];
    this._on = {};
    this._title;
    this._cohort;
  }

  function datum$1(d) {
    if (d !== undefined) {

      if (this._filter) d = d.filter(this._filter)
      this._data = d

      this._wrapper.datum(d)
      return this
    }
    var d = this._wrapper.datum()
    if (this._filter) d = d.filter(this._filter)
    return d

  }

  var buildCategories = function(vendor) {
    var vendor_categories = {};
    vendor.domains.forEach(function(domain) {
      if (typeof vendor_categories[domain.parent_category_name] === typeof undefined) {
        vendor_categories[domain.parent_category_name] = 0;
      }
      vendor_categories[domain.parent_category_name] += domain.count;
    });

    return d3.entries(vendor_categories).sort(function(x, y) {
      return y.value - x.value;
    }).slice(0, 13);
  }

  var check_missing_header = function(tableWrapper) {
    var has_header = tableWrapper.selectAll('.vendors-header-row')[0].length > 0

    var unhandled_vendor = tableWrapper.datum()[0]
    try {
      var table_categories = buildCategories(unhandled_vendor)
      if (!has_header) {
        this.render_header(tableWrapper, JSON.parse(JSON.stringify(table_categories)))
      }
    } catch (e) {
      console.log('ERROR', e);
    }

    return table_categories
  }

  function draw$1(_d1, _d2, _d3, skip_missing) {

    if ((this._wrapper.datum().length) &&
      (this._data !== this._wrapper.datum())) return this;

    var table_categories = this.check_missing_header(this._wrapper)


    var row = this.render_rows(table_categories, this._wrapper)
      // this.render_row(items)
    // this.render_categories(row, table_categories)

    var data = this.datum()

    if (!skip_missing) this.run_missing(data)

    return this

  }

  function title(value) {
    this._title = value;
    d3.select('.vendor-card-title').text(value);
    return this;
  }

  function cohort(value) {
    this._cohort = value;
    return this;
  }

  function vendor_table(target) {
    var table = new Table(target)
      .title('Vendor Audience Cohorts')
      .cohort('Vendor');

    return table;
  }

  Table.prototype = {
    initialize: initialize,
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    run_missing: run_missing,

    datum: datum$1,
    draw: draw$1,
    filter: function(x) {
      this._filter = x
      return this
    },
    on: function(x, y) {
      this._on[x] = y;
      return this
    },

    render_wrapper: render_wrapper$1,
    render_row: render_row$1,
    render_rows: render_rows,
    render_header: render_header,
    render_title: render_title,
    render_views_metrics: render_views_metrics,
    render_categories: render_categories,
    check_missing_header: check_missing_header,

    title: title,
    cohort: cohort
  }

  var version = "0.0.1";

  exports.version = version;
  exports.vendor_expanded = vendor_expanded;
  exports.vendor_table = vendor_table;

}));