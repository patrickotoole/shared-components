(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('vendors', ['exports'], factory) :
  factory((global.vendors = {}));
}(this, function (exports) { 'use strict';

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

  var navigation_items = [
      {
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
      }
    ]

  function render_nav(items) {

      var vendor_name_column = d3_updateable(items, '.vendor-name-column', 'div')
        .classed('vendor-name-column col-lg-2 col-md-6', true)

      var vendor_name = d3_updateable(vendor_name_column, '.vendor-name', 'div')
        .classed('col-md-12 vendor-name', true)
        .html(function(x) { return '<h2>' + x.action_name + '</h2>'; });

      // Vendor List Item : Expand Button
      var vendor_expand = d3_updateable(vendor_name_column, '.vendor-expand', 'div')
        .classed('col-md-12 vendor-expand', true)

      var vendor_navigation_list = d3_updateable(vendor_name_column, '.vendor-navigation-list', 'ul')
        .classed('col-md-12 vendor-navigation-list', true)

      var vendor_navigation_items = d3_splat(vendor_navigation_list, '.nav-list-item', 'li',
        navigation_items,
        function(x) { return x.title }
      )
      .classed('nav-list-item', true);

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

  }

  function render_row(rows) {
    var vendors = this;

    vendors.render_nav(rows)

    var vendor_data_columns = d3_updateable(rows, '.vendor-data-column', 'div')
      .classed('vendor-data-column col-lg-10 col-md-12', true)

    var data_columns_without_data = vendor_data_columns.filter(function(x) { return !x.views_data })

    d3_updateable(data_columns_without_data, '.vendor-loading', 'div')
      .classed('vendor-loading loading-icon col-md-12', true)
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading vendor data...')

    rows.selectAll(".vendor-loading").filter(function(x){return x.timeseries_data || x.domains}).remove()

    vendors.render_visits(rows.selectAll('.vendor-data-column'));
    vendors.render_pie(rows.selectAll('.vendor-data-column'));

    var vendor_onsite_column = d3_updateable(vendor_data_columns, '.vendor-onsite-column', 'div')
      .classed('vendor-onsite-column col-lg-4 col-md-6', true)
      .html(function(x) {
        if(typeof x.timeseries_data !== typeof undefined) {
          return '<h3>On-site</h3><div class="coming-soon-box">(coming soon)</div>';
        }
      });

  }

  function render_list(list) {

    var rows = d3_splat(list, '.vendors-list-item', 'li', false, function(x) { return x.action_name; })
      .classed('vendors-list-item', true);

    rows.exit().remove()
          
    return rows
  }

  function render_wrapper(target) {

    var controls = d3_updateable(target,'.page-header-controls','div')
      .classed('page-header-controls', true)
      .text('View as table')
      .on('click', function(x) { this._on.click(x) }.bind(this) )

    var vendors_list_card = d3_updateable(target, '.vendors-list-card', 'section')
      .classed('vendors-list-card bar series col-md-12', true);

    var vendors_list = d3_updateable(vendors_list_card, '.vendors-list', 'ul')
      .classed('vendors-list', true);


    return vendors_list

  }

  function render_button() {}

  function missing(data) {

    var missing_data = data.filter(function(action){
      return (action.timeseries_data == undefined) || (action.domains == undefined)
    }) 

    return missing_data
  }

  function should_trigger(datum) {
    return ((!datum.timeseries_data) && (!datum.domains)) 
  }

  function trigger(datum) {
    setTimeout(function(){
      pubsub.publishers.actionTimeseriesOnly(datum)
      pubsub.publishers.pattern_domains_cached(datum)
    },1) 
  }

  function run_missing(data, force) {

    if (force) {
      this.draw(false,false,true)
      return trigger(data[0])
    }

    var missing_data = missing(data)

    if ((missing_data.length == 0)) return this.draw(false,false,true)
    if (should_trigger(missing_data[0]) ) return trigger(missing_data[0])

    return

  }

  function unsubscribe() {}

  function subscribe() {

    pubsub.subscriber("vendor-timeseries-domains",["actionTimeseriesOnly", "pattern_domains_cached"])
      .run(this.draw.bind(this))
      .unpersist(false)

    pubsub.subscriber("vendor-timeseries-domains-resize",["resize"])
      .run(this.draw.bind(this))
      .unpersist(false)

    return this
  }

  function set_and_draw(segments) {
    this.datum(segments)
    this.draw()
    this.run_missing(this._data,true)
  }

  function initialize() {

    if (this._data == this._wrapper.datum()) {
      // our current implementation never uses this
      return set_and_draw(this._data)
    }

    pubsub.subscriber("vendors-data",["vendors"])
      .run(set_and_draw.bind(this))
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
      this._data = d
      this._wrapper.datum(d)
      return this
    }
    return this._wrapper.datum()

  }


  function draw(_d1, _d2, skip_missing) {

    if ( (this._wrapper.datum().length ) && 
         (this._data !== this._wrapper.datum()) ) return this

    var items = this.render_list(this._wrapper)
    this.render_row(items)

    if (!skip_missing) this.run_missing(items.data())

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

    render_button: render_button,
    render_wrapper: render_wrapper,
    render_list: render_list,
    render_row: render_row,
    render_nav: render_nav,
    render_pie: render_pie,
    render_visits: render_visits
    
  }

  var version = "0.0.1";

  exports.version = version;
  exports.vendor_expanded = vendor_expanded;

}));