var RB = RB || {};
RB.crusher = RB.crusher || {};

RB.crusher.controller = (function(controller) {

  // requires: api.js, d3.js

  var crusher = RB.crusher
  var source = crusher.api.source
  var pubsub = crusher.pubsub


  controller.init = function(type,data) {
    pubsub.subscriber("advertiser-name-email",["advertiser", "current_user"])
      .run(function(advertiser_data, current_user) {
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
                'id': current_user.id,
                'advertiser': advertiser_data.advertiser_name,
                'name': '(' + current_user.first_name + ' ' + current_user.last_name + ')',
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
      })
        .unpersist(false)
        .trigger()

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
    var resize_last_ts = 0;
    var resize_publisher = pubsub.publisher("resize")
      .producer(function(cb){
        var current = + new Date();
        var temp = resize_last_ts;
        resize_last_ts = + new Date();

        if(temp - current >= -100) {
          var fire_event = setTimeout(function(){
            cb(true);
          }, 100);
        } else {
          cb(true);
        }
      });
    d3.select(window).on("resize",function(){
      pubsub.publishers.resize();
    })

  }

  var build_header = function(obj) {

    var target = d3.selectAll('.container')

    var funnelRow = d3_splat(target,'.row','div',[obj],function(x){return x.id})
      .classed('row funnels',true)

    funnelRow.exit().remove()

    var heading = d3_updateable(funnelRow,'page-header','header')
      .text(function(x) {
        return x.name;
      })
      .attr('class', function(x) {
        var classes = ['page-header'];

        if(!d3.select('body')[0][0].classList.contains('hide-select')) {
          classes.push('with-sidebar')
        }

        return classes.join(' ')
      })

    d3_updateable(funnelRow,'.pixel-description','div')
      .classed('pixel-description',true)
      .style('margin-top','15px')
      .style('margin-bottom','15px')
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

      pubsub.subscriber("settings",["advertiser", "actions", "funnels"])
        .run(subscription)
          .unpersist(true)
          .trigger()

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

      pubsub.subscriber("pixel_settings",["pixel_status","advertiser","an_uid"])
        .run(function(status_data,advertiser_data,uid){
          crusher.ui.pixel.setup(funnelRow,status_data,advertiser_data,uid)
        })
          .unpersist(true)
          .trigger()

    },
    "vendors": function(obj, not_table) {
      d3.select('body').classed('hide-select', true);

      var funnelRow = build_header({
        'id': 'vendors-' + (not_table ? 'expanded' : 'table'),
        'name': 'Vendor Analysis',
      });


      if(not_table) {
        RB.crusher.ui.vendors.show(funnelRow, obj);
      } else {
        RB.crusher.ui.vendors.table(funnelRow, obj);
      }
    },
    "vendors/table": function(obj) {
      d3.select('body').classed('hide-select', true);

      var funnelRow = build_header({
        'id': 'vendors',
        'name': 'Vendor Analysis'
      });

      RB.crusher.ui.vendors.table(funnelRow);
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

      pubsub.subscriber("comparison-data",["actions"])
        .run(function(all_segments) {
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
        })
          .unpersist(false)
          .trigger();

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


        pubsub.subscriber("comparison-data",["comparison"])
          .run(function(comparison_data){
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
          })
          .data(input_data)
          .unpersist(false)
          .trigger();
      }

    },
    "gettingstarted": function() {
      d3.select("body")
        .classed("hide-select",true)

      var target = d3.selectAll(".container")
        .style("min-height", "100%")

      var row = build_header({
        'id': 'gettingstarted',
        'name': 'Welcome to Crusher, let\'s first set-up some things'
      });

      row.exit().remove()

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

      pubsub.subscriber("gettingstarted",["pixel_status", "actions"])
        .run(function(status_data, actions){
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
        })
        .unpersist(false)
        .trigger()

      d3.select("body").classed("hide-select",true)

      var funnelRow = build_header({"id":"home","name":"Welcome to Crusher"})
      crusher.ui.home.main(funnelRow)

      var wrapper = funnelRow.selectAll(".tutorial-description")
      var subscription = crusher.ui.home.status.bind(false,wrapper)

      pubsub.subscriber("home",["pixel_status","advertiser","actions"])
        .run(subscription)
        .unpersist(false)
        .trigger()
    },
    "analytics": function(){

      var funnelRow = build_header({"id":"analytics_overview","name":"Dashboard"})
      var subscription = crusher.ui.home.dashboard.bind(false,funnelRow)

      pubsub.subscriber("dashboard",["dashboardStats"])
        .run(subscription)
        .unpersist(true)
        .trigger()
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
        RB.component.export(RB.crusher.ui.action.clusters, RB.crusher.ui.action)
        RB.component.export(RB.crusher.ui.action.clusters, RB.crusher.ui.action)
        RB.component.export(RB.crusher.ui.action.behavior, RB.crusher.ui.action)  


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

        var loading_indicator = d3_updateable(funnelRow, '.loading-indicator', 'div')
          .classed('loading-indicator', true)
          .style('text-align', 'center')
          .style('margin', '80px 0 100px 0')
          .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading segment data...');

        pubsub.subscriber("dashboard_cached",["actions", "dashboard_cached"])
          .run(subscription)
          .unpersist(true)
          .trigger()
      }

    },
    "action/new": function(action) {
      crusher.ui.action.buildBase()

      var target = d3.selectAll(".action-view-wrapper")
      target.selectAll(".action-view").remove()

      pubsub.subscriber("new",["actions"])
        .run(function(actionsw){
          var override = (action.action_name) ? action : false
          controller.action.new(target,crusher.cache.urls_wo_qs, override)
        })
        .unpersist(true)
        .trigger()
    },
    "action/recommended": function(action) {

      crusher.ui.action.buildBase("action_recommended")

      var target = d3.selectAll(".action-view-wrapper")

      pubsub.subscriber("new",["actions"])
        .run(function(actionsw){
          target.selectAll(".action-view").remove()
          var override = (action.action_name) ? action : false
          controller.action.new(target, crusher.cache.urls_wo_qs, override)
        })
        .unpersist(true)
        .trigger()
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
    /*{
      "name":"Funnels (alpha)",
      "push_state": "/crusher/funnel",
      "class": "glyphicon glyphicon-filter"
    },
    {
      "name":"On-page Analytics",
      "push_state": "/crusher/analytics",
      "class": "glyphicon glyphicon-stats"
    },*/
    {
      "name":"Settings",
      "push_state": "/crusher/settings",
      "class": "glyphicon glyphicon-cog"
    }],
    selectbar_renderers: {
      "action/existing": {
        "heading": function(){},
        "items": function(target,has_back){
          
          var classname = (target.datum().values_key),
            should_show = (!!target.datum().values_key && !target.datum().hide_href )

          if (!target.datum().values[0].action_classification) return

          target.datum(function(d) {
            return d3.nest()
              .key(function(x){return x.action_classification})
              .entries(d.values)
          })

          var section = d3_splat(target,".menu-section","section",false,function(x){return x.key})
            .classed("menu-section",true)

          d3_updateable(section,".heading","div")
            .classed("heading",true)
            .text(function(x){ return x.key })
        

          var dfn = function(x) { return x ? x.values : [] }
          var kfn = function(x) { return x.name + x.push_state }

          var menu = this;
          debugger

          var items = d3_splat(section, "a.item","a",dfn,kfn)
            .classed("item item-" + classname,true)
            .attr("href",function(x){
              return should_show ? 
                window.location.pathname + "?id=" + x[classname] : 
                undefined 
            })
            .text(function(x){
              return x.name
            })
            .on("click", function(x){

              d3.event.preventDefault()
              d3.select(this.parentNode).selectAll(".item").classed("active",false)
              d3.select(this).classed("active",true)
              debugger
              
              menu.navigation.forward.bind(this)(x)
            })
  
          items.exit().remove()

        } 
      }
    },
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
      "vendors/table": [],
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
        },
        {
          "name": "Vendors Table",
          "push_state": "/crusher/vendors/table"
        }],
      "full_url_ranking": [{
          "name": "Full URL Ranking",
          "push_state": "/crusher/full_url_ranking"
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
