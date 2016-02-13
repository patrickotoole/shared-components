var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.vendors = (function(vendors) {

  var crusher = RB.crusher
  var funnelRow;
  var pubsub = crusher.pubsub
  var comma_formatter = d3.format(',');


  var buildCategories = function(vendor) {
    var vendor_categories = {};
    vendor.domains.forEach(function(domain) {
      if(typeof vendor_categories[domain.parent_category_name] === typeof undefined) {
        vendor_categories[domain.parent_category_name] = 0;
      }
      vendor_categories[domain.parent_category_name] += domain.count;
    });

    return d3.entries(vendor_categories).sort(function(x, y) {
      return y.value - x.value;
    }).slice(0,13);
  }

  vendors.table_wrapper = function(funnelRow,obj) {

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


    var vendors_list_table = d3_updateable(vendors_list_card, '.vendors-list-table', 'section')
      .classed('vendors-list-table', true);

    var vendor_loading = d3_updateable(vendors_list_card, '.vendor-loading', 'div')
      .classed('vendor-loading loading-icon col-md-12', true)
      .style('text-align', 'center')
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader" width="16px"> Loading vendor data...'); 

    return vendors_list_table

  }

  vendors.table_header = function(vendors_list_table, table_categories) {

    vendor_header = d3_updateable(vendors_list_table, '.vendors-header-row', 'div')
      .classed('vendors-header-row', true);

    var header_title = d3_updateable(vendor_header, '.vendor-title', 'div')
      .classed('vendor-title', true)
      .text('Vendor')

    var timeseries_header = d3_updateable(vendor_header, '.timeseries-header', 'div')
      .classed('timeseries-header', true)

    var _ = ['Views', 'Visits', 'Uniques']

    d3_splat(timeseries_header, '.timeseries-header-item', 'div', _, function(x) { return x; })
      .classed('timeseries-header-item', true)
      .text(String)

    d3_splat(vendor_header, '.vendor-category-header-item', 'div', table_categories, function(x) { return x.key; })
      .classed('vendor-category-header-item', true)
      .html(function(x) {
        return '<span>' + x.key + '</span>';
      })
  }

  vendors.table_contents = function(tableWrapper,table_categories) {


    var row = d3_splat(tableWrapper, '.vendors-row', 'div', function(vendors) {
        var vendors_with_data = vendors.filter(function(x){ return x.timeseries_data != undefined })

        return vendors_with_data.map(function(vendor) {
          if ((vendor.vendor_domain_percentages) && (vendor.views || vendor.visits || vendor.uniques)) return vendor

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

          if (!vendor.vendor_domain_percentages && vendor.domains) {
            var vendor_domain_percentages = {};
            vendor.total_domains = 0;
            vendor.domains.forEach(function(domain) {
              if(typeof vendor_domain_percentages[domain.parent_category_name] === typeof undefined) {
                vendor_domain_percentages[domain.parent_category_name] = 0;
              }

              vendor_domain_percentages[domain.parent_category_name] += domain.count;
              vendor.total_domains += domain.count;
            });

            vendor.vendor_domain_percentages = vendor_domain_percentages;
          }
          return vendor;

        })
      },function(x){ return x.action_id })
      .classed('vendors-row', true);

    d3_updateable(row, '.vendor-column-title', 'div')
      .style('cursor', 'pointer')
      .classed('vendor-column vendor-column-title', true)
      .text(function(x){ return x.action_name })
      .on('click', function(x) {
        RB.routes.navigation.forward({
          "name": "View Existing Actions",
          "push_state":"/crusher/action/existing",
          "skipRender": true,
          "values_key":"action_name"
        })
        setTimeout(RB.routes.navigation.forward,1,x)
      });


    d3_updateable(row, '.vendor-column-views', 'div')
      .classed('vendor-column vendor-column-views', true)
      .text(function(x) { return comma_formatter(x.views) });

    d3_updateable(row, '.vendor-column-visits', 'div')
      .classed('vendor-column vendor-column-visits', true)
      .text(function(x) {return comma_formatter(x.visits) });

    d3_updateable(row, '.vendor-column-uniques', 'div')
      .classed('vendor-column vendor-column-uniques', true)
      .text(function(x){return comma_formatter(x.uniques) });



    d3_splat(row, '.vendor-column-item', 'div', table_categories, function(x) {
      return x.key;
    })
      .style('background-color', function(x) {

        var unhandled_vendor = this.parentNode.__data__
        var vendor_domain_percentages = unhandled_vendor.vendor_domain_percentages

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
        var unhandled_vendor = this.parentNode.__data__
        var vendor_domain_percentages = unhandled_vendor.vendor_domain_percentages


        if(typeof vendor_domain_percentages[x.key] !== typeof undefined) {
          return Math.round((vendor_domain_percentages[x.key]/unhandled_vendor.total_domains) * 1000)/10 + '%';
        } else {
          return '0%';
        }
        // return vendor_domain_percentages[x.key];
        // return '<span>' + x.key + '</span>';
      })


  }

  var module = vendors

  vendors.table = function(funnelRow, obj) {

    var tableWrapper = module.table_wrapper(funnelRow,obj)


    var draw = function(vendor_raw_data, domains_data, skip) {

      var headers = check_missing_header(tableWrapper)
      var contents = module.table_contents(tableWrapper,headers)

      if (!skip) run_missing_data(tableWrapper.datum())
    }
      
    var run_missing_data = function(filtered,force) {

      if (force) {
        draw(false,false,true)
        setTimeout(function(){
          pubsub.publishers.actionTimeseriesOnly(filtered[0])
          pubsub.publishers.pattern_domains_cached(filtered[0])
        },1)
      }

      var missing_data = filtered.filter(function(action){
        return (action.timeseries_data == undefined) || (action.domains == undefined)
      })

      if (missing_data.length == 0) return draw(false,false,true)

      if ((!!missing_data[0].timeseries_data) || (!!missing_data[0].domains)) {
        console.log("one is present", !!missing_data[0].timeseries_data, !!missing_data[0].domains)

        return
      } else {
        console.log("neither are present")
      }

      setTimeout(function(){
        pubsub.publishers.actionTimeseriesOnly(missing_data[0])
        pubsub.publishers.pattern_domains_cached(missing_data[0])
      },1)

      return missing_data.length
    }

    var check_missing_header = function(tableWrapper) {
      var has_header = tableWrapper.selectAll('.vendors-header-row')[0].length > 0

      var unhandled_vendor = tableWrapper.datum()[0]
      try {
        var table_categories = buildCategories(unhandled_vendor)
        if (!has_header) {
          module.table_header(tableWrapper, JSON.parse(JSON.stringify(table_categories)))
        }
      } catch(e) {}
      
      return table_categories

    }

    

    pubsub.subscriber("vendor-timeseries-domains",["actionTimeseriesOnly", "pattern_domains_cached"])
      .run(draw)
      .unpersist(false)

    pubsub.subscriber("vendors-data",["actions"])
      .run(function(actions) {
        var vs = actions.filter(function(x) { return (x.action_type === 'vendor') })
        tableWrapper.datum(vs)

        run_missing_data(vs,true)
      })
      .unpersist(true)
      .trigger();

    
  }

  return vendors
})(RB.crusher.ui.vendors || {})
