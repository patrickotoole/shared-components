var RB = RB || {};
RB.crusher = RB.crusher || {};

RB.crusher.controller = (function(controller) {

  // requires: api.js, d3.js

  var crusher = RB.crusher
  var source = crusher.api.source

  controller.init = function(type,data) {
    crusher.subscribe.add_subscriber(["advertiser", "current_user"], function(advertiser_data, current_user) {
      setTimeout(function() {
        var user_type = document.cookie.split("user_type=")[1].split(";")[0];
        switch(user_type) {
          case 'rockerbox':
            heap.identify({
              handler: 'Rockerbox',
              name: 'Rockerbox',
              email: 'support@rockerbox.com'
            });

            window.intercomSettings = {app_id: "rvo8kuih",name: "Rockerbox",email: "support@rockerbox.com",created_at: 1312182000};
            (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',intercomSettings);}else{var d=document;var i=function(){i.c(arguments)};i.q=[];i.c=function(args){i.q.push(args)};w.Intercom=i;function l(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/kbtc5999';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);}if(w.attachEvent){w.attachEvent('onload',l);}else{l(false)}}})()
            break;
          case 'client':
            var user = {
              'id': current_user.advertiser_id,
              'name': advertiser_data.advertiser_name + ' (' + current_user.firstname + ' ' + current_user.last_name + ')',
              'email': current_user.user_email
            };

            heap.identify({
              handler: user.id,
              name: user.name,
              email: user.email
            });

            window.intercomSettings = {
              app_id: "o6ats3cn",
              user_id: user.id,
              name: user.name,
              email: user.email,
              created_at: 1312182000
            };
            (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',intercomSettings);}else{var d=document;var i=function(){i.c(arguments)};i.q=[];i.c=function(args){i.q.push(args)};w.Intercom=i;function l(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/xu33kr1z';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);}if(w.attachEvent){w.attachEvent('onload',l);}else{l(false)}}})()
            break;
        }

        Intercom('trackEvent', 'Page Load', {'url': window.location.href});
      }, 2000)
    }, 'advertiser-name-email', true, false);

    var id = type.split("id=")[1]
    if (id && id.length) {
      id = decodeURI(id)
    }

    var type = type.split("?")[0]
    var state = controller.states[type] || controller.states["/crusher/home"]

    state = JSON.parse(JSON.stringify(state))
    if (id) state.skipRender = true

    var callback = id ? function(data,x){
      var xx = data.filter(function(y){return y[x.values_key] == id })

      RB.routes.navigation.forward(xx[0])
    } : false


    RB.routes.navigation.forward(state,callback)

    // INIT RESIZE CALLBACK
    d3.select(window).on("resize",function(){
      crusher.subscribe.publishers["resize"]()
    })

  }

  var build_header = function(obj) {

    var target = d3.selectAll(".container")

    var funnelRow = d3_splat(target,".row","div",[obj],function(x){return x.id})
      .classed("row funnels",true)

    funnelRow.exit().remove()

    var heading = d3_updateable(funnelRow,".heading","h5")

    heading.text(function(x){return x.name})
      .attr("style","margin-top:-15px; padding-left:20px; height: 70px; line-height:70px; border-bottom:1px solid #f0f0f0; margin-left:-15px; margin-right:-15px; margin-bottom:30px;")
      .classed("heading heading",true)

    d3_updateable(funnelRow,".pixel-description","div")
      .classed("pixel-description",true)
      .style("margin-top","15px")
      .style("margin-bottom","15px")
      .html(function(x){return x.description})

    return funnelRow

  }

  controller.initializers = {

    "settings": function() {

      var funnelRow = build_header({
        "id":"settings",
        "name":"Account Overview",
        "description":"Below is a summary of the settings associated with your account."
      })

      var subscription = function (advertiser,actions,funnels) {
        crusher.ui.settings.main(funnelRow,advertiser,actions,funnels)
      }
      crusher.subscribe.add_subscriber(["advertiser","actions", "funnels"], subscription, "settings",true,true)

    },
    "settings/advertiser": function() {

      var funnelRow = build_header({"id":"settings/advertiser","name":"Manage Advertiser"})
      crusher.ui.settings.advertiser(funnelRow)

    },
    "settings/subscription": function() {

      var funnelRow = build_header({"id":"settings/subscription","name":"Manage Subscription"})
      crusher.ui.settings.subscription(funnelRow)

    },
    "settings/pixel/setup": function() {

      var funnelRow = build_header({"id":"setup","name":"Pixel Setup"})

      crusher.subscribe.add_subscriber(
        ["pixel_status","advertiser","an_uid"],
        function(status_data,advertiser_data,uid){
          crusher.ui.pixel.setup(funnelRow,status_data,advertiser_data,uid)
        },
        "pixel_settings",true,true
      )

    },
    "vendors": function(obj) {
      crusher.subscribe.add_subscriber(["actions"], function(segments) {
        var vendors = segments.filter(function(x) {
          return x.action_type == 'vendor';
        })

        var vendors_data = [
          {
            name: 'Facebook',
            visitors: {
              views: [],
              visits: [],
              uniques: []
            },
            pie_data: {}
          },
          {
            name: 'Google',
            visitors: {
              views: [],
              visits: [],
              uniques: []
            },
            pie_data: {}
          },
          {
            name: 'Twitter',
            visitors: {
              views: [],
              visits: [],
              uniques: []
            },
            pie_data: {}
          }
        ];

        var vendors_list = d3_updateable(vendors_list_card, '.vendors-list', 'ul')
          .classed('vendors-list', true)
        var vendors_list_items = d3_splat(vendors_list, '.vendors-list-item', 'li', vendors, function(x) {
          console.log('THIS, IS, X!!!', x);
          return x.action_name;
        })
          .classed('vendors-list-item', true)

        /*
          Each individual vendor
        */

        // vendor-status
        // vendor-name
        // vendor-visitor-graphs
        // vendor-domains-pie
        // vendor-expand


        var vendor_status = d3_updateable(vendors_list_items, '.vendor-status', 'div')
          .classed('vendor-status col-md-1', true)
          .html(function(x) {
            if(x.name != 'Twitter') {
              return '<i class="glyphicon status glyphicon-ok-circle green"/>'
            } else {
              return '<i class="glyphicon status glyphicon-ok-circle grey"/>'
            }
          });

        var vendor_name = d3_updateable(vendors_list_items, '.vendor-name', 'div')
          .classed('col-md-2 vendor-name', true)
          .html(function(x) {
            return '<h2>' + x.action_name + '</h2>';
          });

        var vendor_visitor_graphs = d3_updateable(vendors_list_items, '.vendor-visitor-graphs', 'div')
          .classed('col-md-4 vendor-visitor-graphs', true)

          var vendor_visitor_graphs_rows = d3_splat(vendor_visitor_graphs, '.vendor-visitor-graphs-row', 'div', ['views', 'visitor','uniques'], function(y) {
            return y;
          })
            .classed('vendor-visitor-graphs-row row', true)

          var vendor_visitor_graph_type = d3_updateable(vendor_visitor_graphs_rows, '.vendor-visitor-graph-type', 'div')
            .classed('col-md-3 vendor-visitor-graph-type', true)
            .html(function(y) {
              return '<span class="type-name">' + y + '</span><span class="type-amount">' + 1234 + '</span>';
            });

          var vendor_visitor_graph_chart = d3_updateable(vendor_visitor_graphs_rows, '.vendor-visitor-graph-chart', 'div')
            .classed('col-md-9 vendor-visitor-graph-chart', true)

          var visitor_chart = RB.rho.ui.buildTimeseries(
            vendor_visitor_graph_chart,visitor_data,"Views",["views"], undefined,true, 85
          )


        var vendor_domains_pie = d3_updateable(vendors_list_items, '.vendor-domains-pie', 'div')
          .classed('col-md-3 vendor-domains-pie', true)
          .html(function(x) {
            return 'Domains Pie';
          });

        var vendor_expand = d3_updateable(vendors_list_items, '.vendor-expand', 'div')
          .classed('col-md-1 vendor-expand', true)

        var vendor_expand_button = d3_updateable(vendor_expand, '.vendor-expand-button', 'div')
          .classed('vendor-expand-button btn btn-sm btn-default pull-right', true)
          .text('View More')

        console.log('Segments', vendors);
      }, "vendors-data", true, true);

      var visitor_data = [{
        "key": "2015-12-30 00:00:00",
        "values": {
          "views": 10700,
          "visits": 10100,
          "uniques": 4900
        },
        "date": "2015-12-30 00:00:00",
        "views": 10700,
        "visits": 10100,
        "uniques": 4900,
        "url_pattern": ["necklace"]
      }, {
        "key": "2015-12-31 00:00:00",
        "values": {
          "views": 14500,
          "visits": 13600,
          "uniques": 5400
        },
        "date": "2015-12-31 00:00:00",
        "views": 14500,
        "visits": 13600,
        "uniques": 5400,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-01 00:00:00",
        "values": {
          "views": 18500,
          "visits": 16000,
          "uniques": 6100
        },
        "date": "2016-01-01 00:00:00",
        "views": 18500,
        "visits": 16000,
        "uniques": 6100,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-02 00:00:00",
        "values": {
          "views": 15100,
          "visits": 14000,
          "uniques": 4700
        },
        "date": "2016-01-02 00:00:00",
        "views": 15100,
        "visits": 14000,
        "uniques": 4700,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-03 00:00:00",
        "values": {
          "views": 17100,
          "visits": 14200,
          "uniques": 4300
        },
        "date": "2016-01-03 00:00:00",
        "views": 17100,
        "visits": 14200,
        "uniques": 4300,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-04 00:00:00",
        "values": {
          "views": 35400,
          "visits": 29500,
          "uniques": 9300
        },
        "date": "2016-01-04 00:00:00",
        "views": 35400,
        "visits": 29500,
        "uniques": 9300,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-05 00:00:00",
        "values": {
          "views": 21600,
          "visits": 19000,
          "uniques": 6200
        },
        "date": "2016-01-05 00:00:00",
        "views": 21600,
        "visits": 19000,
        "uniques": 6200,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-06 00:00:00",
        "values": {
          "views": 16600,
          "visits": 15200,
          "uniques": 4300
        },
        "date": "2016-01-06 00:00:00",
        "views": 16600,
        "visits": 15200,
        "uniques": 4300,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-07 00:00:00",
        "values": {
          "views": 10100,
          "visits": 9100,
          "uniques": 3400
        },
        "date": "2016-01-07 00:00:00",
        "views": 10100,
        "visits": 9100,
        "uniques": 3400,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-08 00:00:00",
        "values": {
          "views": 16900,
          "visits": 14600,
          "uniques": 5400
        },
        "date": "2016-01-08 00:00:00",
        "views": 16900,
        "visits": 14600,
        "uniques": 5400,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-09 00:00:00",
        "values": {
          "views": 7600,
          "visits": 7500,
          "uniques": 3000
        },
        "date": "2016-01-09 00:00:00",
        "views": 7600,
        "visits": 7500,
        "uniques": 3000,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-10 00:00:00",
        "values": {
          "views": 11800,
          "visits": 11000,
          "uniques": 3600
        },
        "date": "2016-01-10 00:00:00",
        "views": 11800,
        "visits": 11000,
        "uniques": 3600,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-11 00:00:00",
        "values": {
          "views": 20300,
          "visits": 18200,
          "uniques": 6900
        },
        "date": "2016-01-11 00:00:00",
        "views": 20300,
        "visits": 18200,
        "uniques": 6900,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-12 00:00:00",
        "values": {
          "views": 23700,
          "visits": 21700,
          "uniques": 7200
        },
        "date": "2016-01-12 00:00:00",
        "views": 23700,
        "visits": 21700,
        "uniques": 7200,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-13 00:00:00",
        "values": {
          "views": 20900,
          "visits": 18600,
          "uniques": 5900
        },
        "date": "2016-01-13 00:00:00",
        "views": 20900,
        "visits": 18600,
        "uniques": 5900,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-14 00:00:00",
        "values": {
          "views": 19300,
          "visits": 18500,
          "uniques": 5200
        },
        "date": "2016-01-14 00:00:00",
        "views": 19300,
        "visits": 18500,
        "uniques": 5200,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-15 00:00:00",
        "values": {
          "views": 22500,
          "visits": 19700,
          "uniques": 6600
        },
        "date": "2016-01-15 00:00:00",
        "views": 22500,
        "visits": 19700,
        "uniques": 6600,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-16 00:00:00",
        "values": {
          "views": 12200,
          "visits": 11600,
          "uniques": 3800
        },
        "date": "2016-01-16 00:00:00",
        "views": 12200,
        "visits": 11600,
        "uniques": 3800,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-17 00:00:00",
        "values": {
          "views": 11400,
          "visits": 10100,
          "uniques": 3600
        },
        "date": "2016-01-17 00:00:00",
        "views": 11400,
        "visits": 10100,
        "uniques": 3600,
        "url_pattern": ["necklace"]
      }, {
        "key": "2016-01-18 00:00:00",
        "values": {
          "views": 18600,
          "visits": 16200,
          "uniques": 4400
        },
        "date": "2016-01-18 00:00:00",
        "views": 18600,
        "visits": 16200,
        "uniques": 4400,
        "url_pattern": ["necklace"]
      }];

      var target = d3.selectAll(".container")

      var main_wrapper = d3_splat(target,".row","div",[obj],function(x){return x.name})
        .classed("row funnels",true)
        .style('padding-top', '80px');

      main_wrapper.exit().remove()

      var page_header = d3_updateable(main_wrapper, '.page-header', 'h5')
        .classed('page-header', true)
        .text('Vendor Analysis')

      var vendors_list_card = d3_updateable(main_wrapper, '.vendors-list-card', 'section')
        .classed('vendors-list-card bar series col-md-12', true)

      var vendors_list_card_title = d3_updateable(vendors_list_card, '.vendors-list-card-title', 'header')
        .classed('vendors-list-card-title title', true)
        .text('Advertising Vendor Summary')
    },
    "comparison": function() {
      d3.select("body")
        .classed("hide-select", true)

      var segments = ['/wishlist', 'cart'];

      var main_wrapper = d3.selectAll('.container')
        .style('padding', '0');

      var heading = d3_updateable(main_wrapper, '.comparison-header', 'header')
        .classed('comparison-header', true)
        .style('background-color', '#FAFAFA')
        .style('border-bottom', '1px solid #f0f0f0')
        .style('padding', '40px')
        .style('min-height', '350px')

      /*
      **
      **  Display list of segments that are being compared
      **
      */

      var segments_list_wrapper = d3_updateable(heading, '.segments-list-wrapper', 'div')
        .style('display', 'inline-block')
        .classed('segments-list-wrapper', true)

      var segments_list = d3_updateable(segments_list_wrapper, '.segments-list', 'div')
        .style('display', 'inline-block')
        .classed('segments-list', true);

      var current_segment = d3_updateable(segments_list, '.segments-list-item', 'input')
        .classed('segments-list-item', true)
        .attr('value', segments[0])

      var current_segment_select = d3_updateable(segments_list, '.segments-list-item-select', 'select')
        .classed('segments-list-item-select', true)
        .attr('value', segments[0])
        .on('change', function() {
          segments[1] = this.value;
          renderComparison();
        });

      crusher.subscribe.add_subscriber(["actions"], function(all_segments) {
        var segments_list_items = d3_splat(current_segment_select, '.segment-list-item-select-option', 'option', all_segments, function(x, i) {
            return x.action_name;
          })
          .text(function(x) {
            if (x.action_name != '') {
              return x.action_name;
            } else {
              return 'All Pages';
            }
          });
      }, "comparison-data", true, false);

      var segments_list_save = d3_updateable(segments_list_wrapper, '.segments-list-save', 'a')
        .style('display', 'none')
        .text('Save')
        .classed('segments-list-save btn btn-success', true)


      /*
      **
      **  Draw intersection circles
      **
      */

      function drawIntersection(segmentA, segmentB, intersect) {
        var max_segment = Math.max(segmentA, segmentB);
        var r1 = Math.round(segmentA / max_segment * 175),
          r2 = Math.round(segmentB / max_segment * 175),
          x1 = r1,
          y1 = 175,
          x2 = 350,
          y2 = 175;

        var intersect_size = ((175 / max_segment) * intersect) * 2;
        if (intersect_size / x1 < 0.15) {
          intersect_size = 0.15 * x1;
        }
        x2 = ((r1 * 2) + r2) - intersect_size;

        var svg = d3_updateable(heading, '.comparison-svg', 'svg')
          .attr('style', 'width: calc(100% - 300px); height: 350px;')
          .classed('comparison-svg', true)

        svg.exit().remove()

          d3_updateable(svg, '.circleA', 'circle')
            .classed('circleA', true)
            .attr('cx', x1)
            .attr('cy', y1)
            .attr('r', r1)
            .style('fill', 'steelblue')
            .on('click', function() {
              alert('SEGMENT ONE');
            });

          d3_updateable(svg, '.circleB', 'circle')
            .classed('circleB', true)
            .attr('cx', x2)
            .attr('cy', y2)
            .attr('r', r2)
            .style('fill', 'orange')
            .on('click', function() {
              alert('SEGMENT TWO');
            });

        var interPoints = intersection(x1, y1, r1, x2, y2, r2);

        var intersection_object = d3_updateable(svg, '.intersection_object', 'g')
          .classed('intersection_object', true)

        var intersection_object_path = d3_updateable(svg, '.intersection_object_path', 'path')
          .classed('intersection_object_path', true)
          .attr("d", function() {
            return "M" + interPoints[0] + "," + interPoints[2] + "A" + r2 + "," + r2 +
              " 0 0,1 " + interPoints[1] + "," + interPoints[3] + "A" + r1 + "," + r1 +
              " 0 0,1 " + interPoints[0] + "," + interPoints[2];
          })
          .style('fill', 'red')
          .on('click', function() {
            alert('INTERSECTION');
          });

        function intersection(x0, y0, r0, x1, y1, r1) {
          var a, dx, dy, d, h, rx, ry;
          var x2, y2;

          /* dx and dy are the vertical and horizontal distances between
           * the circle centers.
           */
          dx = x1 - x0;
          dy = y1 - y0;

          /* Determine the straight-line distance between the centers. */
          d = Math.sqrt((dy * dy) + (dx * dx));

          /* Check for solvability. */
          if (d > (r0 + r1)) {
            /* no solution. circles do not intersect. */
            return false;
          }
          if (d < Math.abs(r0 - r1)) {
            /* no solution. one circle is contained in the other */
            return false;
          }

          /* 'point 2' is the point where the line through the circle
           * intersection points crosses the line between the circle
           * centers.
           */

          /* Determine the distance from point 0 to point 2. */
          a = ((r0 * r0) - (r1 * r1) + (d * d)) / (2.0 * d);

          /* Determine the coordinates of point 2. */
          x2 = x0 + (dx * a / d);
          y2 = y0 + (dy * a / d);

          /* Determine the distance from point 2 to either of the
           * intersection points.
           */
          h = Math.sqrt((r0 * r0) - (a * a));

          /* Now determine the offsets of the intersection points from
           * point 2.
           */
          rx = -dy * (h / d);
          ry = dx * (h / d);

          /* Determine the absolute intersection points. */
          var xi = x2 + rx;
          var xi_prime = x2 - rx;
          var yi = y2 + ry;
          var yi_prime = y2 - ry;

          return [xi, xi_prime, yi, yi_prime];
        }
      }

      var page_tabs_wrapper = d3_updateable(main_wrapper, '.page-tabs-wrapper', 'nav')
        .classed('page-tabs-wrapper', true)

      var page_tabs = [{
        id: 1,
        title: 'Domains'
      }, {
        id: 2,
        title: 'Categories'
      }];

      var page_tabs_items = d3_splat(page_tabs_wrapper, '.page_tabs_item', 'div', page_tabs, function(x, i) {
          return x.title;
        })
        .text(function(x) {
          return x.title;
        })
        .attr('class', function(x) {
          var classes = 'page_tabs_item';

          if (x.id === 1) {
            classes += ' active'
          }

          return classes;
        })
        .on('click', function(x, i) {
          d3.selectAll(".page_tabs_item.active").classed('active', false);
          d3.selectAll(".page_tabs_item:nth-child(" + (i + 1) + ")").classed('active', true);
          // this.classed('active', true);
        });

      var comparison_columns = d3_updateable(main_wrapper, '.comparison-columns', 'div')
        .classed('comparison-columns', true)

      var column1 = d3_updateable(comparison_columns, '.comparison-column1', 'div')
        .classed('comparison-column1 comparison-column', true)

      var column2 = d3_updateable(comparison_columns, '.comparison-column2', 'div')
        .classed('comparison-column2 comparison-column', true)


      function horizontalBarGraph(orientation, domains, hits, max_hits) {
        var column_width = 400;
        var colors = ['steelblue'];
        var grid = d3.range(25).map(function(i) {
          return {
            'x1': 0,
            'y1': 0,
            'x2': 0,
            'y2': 1000
          };
        });

        var xscale = d3.scale.linear()
          .domain([0, 10])
          .range([0, 10]);

        var yscale = d3.scale.linear()
          .domain([0, domains.length])
          .range([0, 900])

        var colorScale = d3.scale.quantize()
          .domain([0, domains.length])
          .range(colors);

        switch (orientation) {
          case 'left':
            var column = column1;
            var opposite_orientation = 'right';
            break;
          case 'right':
            var column = column2;
            var opposite_orientation = 'left';
            break;
        }

        var canvas = d3_updateable(column, '.bar-graph-' + orientation, 'svg')
          .classed('bar-graph-' + orientation, true)
          .attr({
            'width': '100%',
            'height': (domains.length * 24)
          });

        var xAxis = d3.svg.axis();
        xAxis
          .orient('bottom')
          .scale(xscale)

        var yAxis = d3.svg.axis();
        yAxis
          .orient(orientation)
          .scale(yscale)
          .tickSize(1)
          .tickFormat(function(d, i) {
            if(typeof hits[i-1] !== typeof undefined) {
              switch(orientation) {
                case 'left':
                  return domains[i] + ' - ' + hits[i-1];
                  break;
                case 'right':
                  return hits[i-1] + ' - ' + domains[i];
                  break;
              }
            }
          })
          .tickValues(d3.range(domains.length));

        switch(orientation) {
          case 'left':
            yAxis.tickSize(1)
            break;
          case 'right':
            yAxis.tickSize(0)
            break;
        }

        var y_xis = d3_updateable(canvas, '.y_xis-' + orientation, 'g')
          .style('fill', '#666')
          .attr("transform", function() {
            switch (orientation) {
              case 'left':
                return "translate(400,10)";
                break;
              case 'right':
                return "translate(0,10)";
                break;
            }
          })
          .attr('id', 'yaxis')
          .classed('y_xis-' + orientation, true)
          .call(yAxis);

        var chart = d3_updateable(canvas, '.chart-bars-' + orientation, 'g')
          .classed('chart-bars-' + orientation, true)
          .attr("transform", function() {
            if (orientation == 'right') {
              return "translate(200,0)";
            } else {
              return "translate(0,0)";
            }
          })
          // .selectAll('rect')
          // .data(hits)
          // .enter()

        var chart_rows = d3_splat(chart,".chart-row","rect",hits,function(x, i){return i})
          .classed("chart-row",true)
          .attr('height', 19)
          .attr({
            'x': function(d, i) {
              if (orientation == 'left') {
                // return ((d / Math.max.apply(Math, hits)) * 100)
                return 200 - (((d / max_hits) * 180) + 20);
              } else {
                return 0;
              }
            },
            'y': function(d, i) {
              return yscale(i) + 19;
            }
          })
          .style('fill', function(d, i) {
            return colorScale(i);
          })
          .attr('width', function(d) {
            return (d / max_hits * 180) + 20;
          });
      }

      function renderComparison() {
        var input_data = {
          segmentA: segments[0],
          segmentB: segments[1]
        };

        var segmentA = [''];
        var segmentA_hits = [];

        var segmentB = [''];
        var segmentB_hits = [];

        crusher.subscribe.add_subscriber(["comparison"], function(comparison_data) {
          comparison_data.segmentA.forEach(function(domain, i) {
            segmentA.push(domain.domain);
            segmentA_hits.push(domain.count);
          });

          comparison_data.segmentB.forEach(function(domain, i) {
            segmentB.push(domain.domain);
            segmentB_hits.push(domain.count);
          });

          // var max_hits = [Math.max.apply(segmentA_hits), Math.max(segmentB_hits)];
          var max_hits = Math.max(segmentA_hits[0], segmentB_hits[0])

          drawIntersection(comparison_data.intersection_data.segmentA, comparison_data.intersection_data.segmentB, comparison_data.intersection_data.intersection)
          horizontalBarGraph('left', segmentA, segmentA_hits, max_hits)
          horizontalBarGraph('right', segmentB, segmentB_hits, max_hits)
        }, "comparison-data", true, false, input_data);
      }

    },
    "gettingstarted": function() {
      d3.select("body")
        .classed("hide-select",true)

      var target = d3.selectAll(".container")
        .style("min-height", "100%")

      var row = d3_splat(target,".row","div",[{"id":"gettingstarted"}],function(x){return x.id})
        .classed("row gettingstarted",true)

      row.exit().remove()

      /* Header */
      var heading = d3_updateable(row,".welcome-heading","h5")

      heading.text("Welcome to Crusher, let's first set-up some things")
        .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("welcome-heading heading", true)
      RB.crusher.ui.gettingstarted.step1(row, {
        continue: RB.routes.navigation.forward.bind(false, RB.crusher.controller.states["/crusher/gettingstarted/step2"])
      });
    },
    "gettingstarted/step2": function() {
      d3.select("body")
        .classed("hide-select",true)

      var target = d3.selectAll(".container")
        .style("min-height", "100%")

      var row = d3_splat(target,".row","div",[{"id":"gettingstarted2"}],function(x){return x.id})
        .classed("row gettingstarted",true)

      row.exit().remove()

      /* Header */
      var heading = d3_updateable(row,".welcome-heading","h5")

      heading.text("Welcome to Crusher, let's first set-up some things")
        .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("welcome-heading heading", true)
      RB.crusher.ui.gettingstarted.step2(row, {
        continue: RB.routes.navigation.forward.bind(false, RB.crusher.controller.states["/crusher/gettingstarted/step3"])
      });
    },
    "gettingstarted/step3": function() {
      d3.select("body")
        .classed("hide-select",true)

      var target = d3.selectAll(".container")
        .style("min-height", "100%")

      var row = d3_splat(target,".row","div",[{"id":"gettingstarted3"}],function(x){return x.id})
        .classed("row gettingstarted",true)

      row.exit().remove()

      /* Header */
      var heading = d3_updateable(row,".welcome-heading","h5")

      heading.text("Welcome to Crusher, let's first set-up some things")
        .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("welcome-heading heading", true)
      RB.crusher.ui.gettingstarted.step3(row, {
        goToAction: RB.routes.navigation.forward.bind(false, RB.crusher.controller.states["/crusher/action/existing"]),
        goToFunnel: RB.routes.navigation.forward.bind(false, RB.crusher.controller.states["/crusher/funnel/new"])
      });
    },

    "home": function(){
      // Check if the getting started page needs to be shown
      var pixel_count = {
        allpages: 0,
        conversion: 0
      }

      crusher.subscribe.add_subscriber(["pixel_status", "actions"], function(status_data, actions) {
        status_data.forEach(function(pixel) {
          if(pixel.segment_name.indexOf("All Pages") >=0 ) {
            pixel_count.allpages++;
          } else if(pixel.segment_name.indexOf("Conversion") >=0 ) {
            pixel_count.conversion++;
          }
        });

        var no_actions = false;
        if(crusher.cache.actionData.length == 0) {
          no_actions = true;
        }

        if(!pixel_count.allpages) {
          RB.routes.navigation.forward(controller.states["/crusher/gettingstarted"])
        } else if (no_actions) {
          RB.routes.navigation.forward(controller.states["/crusher/gettingstarted/step2"])
        }
      },"gettingstarted",true,false)


      d3.select("body").classed("hide-select",true)

      var funnelRow = build_header({"id":"home","name":"Welcome to Crusher"})
      crusher.ui.home.main(funnelRow)

      var wrapper = funnelRow.selectAll(".tutorial-description")
      var subscription = crusher.ui.home.status.bind(false,wrapper)

      crusher.subscribe.add_subscriber(["pixel_status","advertiser","actions"],subscription,"home",true,false)

    },
    "analytics": function(){

      var funnelRow = build_header({"id":"analytics_overview","name":"Dashboard"})
      var subscription = crusher.ui.home.dashboard.bind(false,funnelRow)

      crusher.subscribe.add_subscriber(["dashboardStats"],subscription,"dashboard",true,true)

    },

    "funnel": function(funnel){

      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
      RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)


      var funnelRow = build_header({"id":"funnel_dashboard","name":"Funnel Dashboard"})
      var subscription = crusher.ui.home.dashboard.bind(false,funnelRow)

      var main_wrapper = d3_updateable(funnelRow,".main-wrapper","div")
        .classed("main-wrapper",true)


      var desc = "Funnels allow you to model the behavior between segments. " +
        "For instance, you can look at a user who comes to a landing page and then proceeds to checkout." +
        ""

      RB.rho.ui.buildWrappers(main_wrapper,"About Funnels","none",[{}],"col-md-6",desc)

      main_wrapper.selectAll(".value").style("height","1px")
        .style("line-height","1px")
        .style("padding","0px")


    },
    "funnel/existing": function(funnel) {

      var events = ["actions","funnels","campaigns","lookalikes","lookalikeCampaigns"]
      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
      RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)


      crusher.ui.funnel.buildBase()

      events.map(function(x){ crusher.subscribe.publishers[x]() })
      crusher.subscribe.publishers["funnel_all"](funnel)
    },
    "funnel/new": function(){
      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
      RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)


      crusher.ui.funnel.buildBase()
      var target = d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")

      RB.crusher.controller.funnel.new(target)
    },


    "action": function(){

      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
      RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)

      var funnelRow = build_header({"id":"action_about","name":"Action Dashboard"})
      var subscription = RB.crusher.ui.action.dashboard.show.bind(false,funnelRow)

      //crusher.subscribe.add_subscriber(["recommended_actions","actions"],subscription ,"actionDashboard",true,true)

    },
    "action/existing": function(action) {

      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
      RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)


      if (action.action_id) {

        // exisiting action...


        // Need a teardown when navigating from each page/section
        // this is a teardown from the dashboard...
        var e = "actionTimeseries"
        crusher.subscribe.publisher_raw[e].skip_callback = true
        crusher.subscribe.register_publisher(e,crusher.api.endpoints[e])
        RB.component.export(RB.crusher.ui.action.show_timeseries, RB.crusher.ui.action)


        // This should clear all the outstanding publishers so that it doesnt interfere
        // and trigger existing callbacks

        crusher.ui.action.buildBase()

        crusher.subscribe.publishers["action_show"]()
        crusher.subscribe.publishers["actions"]()
        crusher.subscribe.publishers["action_all"](action)

      } else {
        // existing dashboard...
        var funnelRow = build_header({"id":"action_about","name":"Segments Dashboard"})
        var subscription = RB.crusher.ui.action.dashboard.widgets.bind(false,funnelRow)
        crusher.subscribe.add_subscriber(["actions", "dashboard_cached"], subscription, 'dashboard_cached', true, true);
      }

    },
    "action/new": function(action) {
      crusher.ui.action.buildBase()

      var target = d3.selectAll(".action-view-wrapper")
      target.selectAll(".action-view").remove()

      crusher.subscribe.add_subscriber(["actions"], function(actionsw){

        var override = (action.action_name) ? action : false
        controller.action.new(target,crusher.cache.urls_wo_qs, override)
      }, "new",true,true)
    },
    "action/recommended": function(action) {

      crusher.ui.action.buildBase("action_recommended")

      var target = d3.selectAll(".action-view-wrapper")


      crusher.subscribe.add_subscriber(["actions"], function(actionsw){

        target.selectAll(".action-view").remove()
        var override = (action.action_name) ? action : false
        controller.action.new(target, crusher.cache.urls_wo_qs, override)
      }, "new",true,true)
    }
  }

  controller.get_bloodhound = function(cb) {

    var compare = function(a,b) {
      return (a.count < b.count) ? -1 : 1
    }

    controller.bloodhound = controller.bloodhound || new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.whitespace,
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      remote: {
        url: "/crusher/search/urls?advertiser=" + source + "&search=%QUERY&format=json&logic=and&timeout=4",
        wildcard: "%QUERY",
        transform: function(resp) {
          return resp.results
        },
        prepare: function(x,settings) {
          var q = x.split(" ").join(","),
            split = settings.url.split("%QUERY")

          settings.url = split[0] + q + split[1]
          return settings
        }
      },
      sorter:compare
    });

    cb(controller.bloodhound)

  }



  controller.routes = {
    roots: [
    {
      "name":"Vendors",
      "push_state": "/crusher/vendors",
      "class": "glyphicon glyphicon-th-large",
      "values_key": "action_name"

    },
    {
      "name":"Segments",
      "push_state": "/crusher/action/existing",
      "class": "glyphicon glyphicon-signal",
      "values_key": "action_name"

    },
    {
      "name":"Create Segment",
      "push_state": "/crusher/action/recommended",
      "class": "glyphicon glyphicon-plus",
      "values_key": "action_name",
      "hide_href": true
    },
    {
      "name":"Funnels (alpha)",
      "push_state": "/crusher/funnel",
      "class": "glyphicon glyphicon-filter"
    },
    /*{
      "name":"On-page Analytics",
      "push_state": "/crusher/analytics",
      "class": "glyphicon glyphicon-stats"
    },*/
    {
      "name":"Settings",
      "push_state": "/crusher/settings",
      "class": "glyphicon glyphicon-cog"
    }],
    renderers: controller.initializers,
    transforms: {
      "funnel/new": function(menu_obj){
        menu_obj.values = RB.crusher.cache.funnelData
        RB.menu.methods.transform(menu_obj,menu_obj.values_key)
      },
      "funnel/existing": function(menu_obj){
        menu_obj.values = RB.crusher.cache.funnelData
        RB.menu.methods.transform(menu_obj,menu_obj.values_key)
      },
      "action/existing": function(menu_obj){
        menu_obj.values = RB.crusher.cache.actionData
        RB.menu.methods.transform(menu_obj,menu_obj.values_key)
      },
      "action/recommended": function(menu_obj){

        crusher.cache.recommendedActionData = crusher.cache.recommendations
          .slice(0,20)
          .map(function(x){
            return {"action_name":x.first_word,"url_pattern":[x.first_word]}
          })
        menu_obj.name = "Recommended Segments";
        menu_obj.values = RB.crusher.cache.recommendedActionData
        RB.menu.methods.transform(menu_obj,menu_obj.values_key)
      }
    },
    apis: {
      "comparison": ['funnels'],
      "vendors": [],
      "funnel/new": [],
      "funnel/existing": ['funnels'],
      "action/existing": ['actions'],
      "action/new": [],
      "action/recommended": ["recommended_actions"],
      "analytics": [{
          "name":"Segments",
          "push_state":"/crusher/action",
        },
        {
          "name":"Funnels",
          "push_state":"/crusher/funnel",
        }],
      "settings": [
        {
          "name":"Pixel Setup",
          "push_state":"/crusher/settings/pixel/setup",
        },
        {
          "name":"Advertiser Setup",
          "push_state":"/crusher/settings/advertiser",
        },
        {
          "name":"Subscription",
          "push_state":"/crusher/settings/subscription",
        }
      ],
      "gettingstarted": [{
          "name":"Getting Started",
          "push_state":"/crusher/gettingstarted"
        }, {
          "name":"Getting Started Step 2",
          "push_state":"/crusher/gettingstarted/step2"
        }, {
          "name":"Getting Started Step 3",
          "push_state":"/crusher/gettingstarted/step3"
        }],
      "comparison": [{
          "name": "Comparison",
          "push_state": "/crusher/comparison"
        }],
      "vendors": [{
          "name": "Vendors",
          "push_state": "/crusher/vendors"
        }],
      "home": [{
          "name":"Home",
          "push_state":"/crusher/home"
        },
        {
          "name":"Segments",
          "push_state":"/crusher/action",
        },
        {
          "name":"Settings",
          "push_state":"/crusher/settings",
        }],
      "funnel": [{
          "name":"Create New Funnel",
          "push_state":"/crusher/funnel/new",
        },
        {
          "name": "View Existing Funnels",
          "push_state":"/crusher/funnel/existing",
          "skipRender": true,
          "values_key":"funnel_name"
        }],
      "action": [{
          "name": "Recommended Segments",
          "push_state":"/crusher/action/recommended",
          "values_key": "action_name",
          "hide_href": true
        },{
          "name": "View Existing Segments",
          "push_state":"/crusher/action/existing",
          //"skipRender": true,
          "values_key":"action_name"
        }
      ]
    }
  }

  controller.states = {}

  Object.keys(controller.routes.apis).map(function(k){
    if (controller.routes.apis[k].length > 0 && typeof(controller.routes.apis[k][0]) == "object") {
      controller.routes.apis[k].map(function(state) {
        controller.states[state.push_state] = state
      })
    }
  })

  RB.routes.register(controller.routes)



  return controller

})(RB.crusher.controller || {})
