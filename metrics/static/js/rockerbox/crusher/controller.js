var RB = RB || {};
RB.crusher = RB.crusher || {};

RB.crusher.controller = (function(controller) {

  // requires: api.js, d3.js

  var crusher = RB.crusher
  var source = crusher.api.source

  controller.init = function(type,data) {
    window.heap=window.heap||[],heap.load=function(e,t){window.heap.appid=e,window.heap.config=t=t||{};var n=t.forceSSL||"https:"===document.location.protocol,a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=(n?"https:":"http:")+"//cdn.heapanalytics.com/js/heap-"+e+".js";var o=document.getElementsByTagName("script")[0];o.parentNode.insertBefore(a,o);for(var r=function(e){return function(){heap.push([e].concat(Array.prototype.slice.call(arguments,0)))}},p=["clearEventProperties","identify","setEventProperties","track","unsetEventProperty"],c=0;c<p.length;c++)heap[p[c]]=r(p[c])};

      crusher.subscribe.add_subscriber(["advertiser"], function(advertiser_data) {
        setTimeout(function() {
          var user_type = document.cookie.split("user_type=")[1].split(";")[0];
          switch(user_type) {
            case 'rockerbox':
              window.heap.load("3611187932");
              window.heap.identify({
                handler: 'Rockerbox',
                name: 'Rockerbox',
                email: 'support@rockerbox.com'
              });

              window.intercomSettings = {app_id: "rvo8kuih",name: "Rockerbox",email: "support@rockerbox.com",created_at: 1312182000};
              (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',intercomSettings);}else{var d=document;var i=function(){i.c(arguments)};i.q=[];i.c=function(args){i.q.push(args)};w.Intercom=i;function l(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/kbtc5999';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);}if(w.attachEvent){w.attachEvent('onload',l);}else{l(false)}}})()
              break;
            case 'client':
              console.log('ADVERTISER DATA', advertiser_data);
              var user = {
                'id': advertiser_data.external_advertiser_id,
                'name': advertiser_data.contact_name,
                'email': advertiser_data.email
              };

              window.heap.load("1793449886");
              window.heap.identify({
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
    "comparison": function(funnel) {
      d3.select("body")
        .classed("hide-select",true)
      var segments = ['/wishlist','cart'];

      var main_wrapper = d3.selectAll('.container')
        .style('padding', '0');

      var heading = d3_updateable(main_wrapper, '.comparison-header', 'header')
        .classed('comparison-header', true)
        .style('background-color', '#FAFAFA')
        .style('border-bottom', '1px solid #f0f0f0')
        .style('padding', '40px')
        .style('min-height', '350px')

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

        crusher.subscribe.add_subscriber(["actions"],function(all_segments) {
          console.log('ACTIONS', all_segments);
          var segments_list_items = d3_splat(current_segment_select, '.segment-list-item-select-option', 'option', all_segments, function(x, i) {
            return x.action_name;
          })
            .text(function(x) {
              console.log('X', x);
              if(x.action_name != '') {
                return x.action_name;
              } else {
                return 'All Pages';
              }
            });
        },"comparison-data",true,false);

      var segments_list_save = d3_updateable(segments_list_wrapper, '.segments-list-save', 'a')
        .style('display', 'none')
        .text('Save')
        .classed('segments-list-save btn btn-success', true)

        function drawIntersection(segmentA, segmentB, intersect) {

          // // var max_segment = Math.max(segmentA, segmentB);
          var max_segment = Math.max(segmentA, segmentB);
          console.log('MAX SEGMENT', segmentA, segmentB, max_segment, intersect);
          var x1 = 0,
            y1 = 175,
            x2 = 350,
            y2 = 175,
            r1 = Math.round(segmentA/max_segment * 175);
            r2 = Math.round(segmentB/max_segment * 175);

          x1 = r1;
          // x2 = ((r1*2) + r2 + (r1)) - ((intersect/r1) * r1)
          var intersect_size = ((175/max_segment)*intersect);
          if(intersect_size/x1 < 0.15) {
            intersect_size = 0.15 * x1;
          }
          x2 = ((r1 * 2) + r2) - intersect_size;
          console.log('INTERSECT SIZE', intersect_size, 'SEGMENT A', x1);

          var svg = d3_updateable(heading, '.comparison-svg', 'svg')
            .attr('style', 'width: calc(100% - 300px); height: 350px;')
            .classed('comparison-svg', true)

          svg.append('circle')
            .attr('cx', x1)
            .attr('cy', y1)
            .attr('r', r1)
            .style('fill', 'steelblue')
            .on('click', function(){
              alert('SEGMENT ONE');
            });

          svg.append('circle')
            .attr('cx', x2)
            .attr('cy', y2)
            .attr('r', r2)
            .style('fill', 'orange')
            .on('click', function(){
              alert('SEGMENT TWO');
            });

          var interPoints = intersection(x1, y1, r1, x2, y2, r2);

          svg.append("g")
            .append("path")
            .attr("d", function() {
              return "M" + interPoints[0] + "," + interPoints[2] + "A" + r2 + "," + r2 +
                " 0 0,1 " + interPoints[1] + "," + interPoints[3]+ "A" + r1 + "," + r1 +
                " 0 0,1 " + interPoints[0] + "," + interPoints[2];
            })
            .style('fill', 'red')
            .on('click', function(){
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

        var page_tabs = [
          {
            id: 1,
            title: 'Domains'
          },
          {
            id: 2,
            title: 'Categories'
          }
        ];

        var page_tabs_items = d3_splat(page_tabs_wrapper, '.page_tabs_item', 'div', page_tabs, function(x, i) {
          return x.title;
        })
          .text(function(x) {
            return x.title;
          })
          .attr('class', function(x) {
            var classes = 'page_tabs_item';

            if(x.id === 1) {
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

      // var domainsA = ['people.com', 'collective-exchange.com', 'pillsbury.com', 'youtube.com', 'msn.com', 'harpersbazaar.com',
      //                'overstock.com', 'yelp.com', 'food.com', 'foodnetwork.com', 'allrecipes.com', 'ebay.com', 'weather.com',
      //                'm.viralands.com', 'boredpanda.com', 'boxes.mysubscriptionaddiction.com', 'cars.com', 'cbssports.com',
      //                'celebritybabies.people.com', 'chinanews.com', 'chinatimes.com', 'chowhound.com', 'cn.dealmoon.com',
      //                'cnn.com', '163.com', 'cooks.com', 'cracked.com', 'cruisecritic.com', 'dailymail.co.uk', 'dealcatcher.com',
      //                'dealmoon.com', 'decorpad.com', 'denverpost.com', 'dropdeadgorgeousdaily.com', 'ebags.com', 'accuweather.com',
      //                'ehow.com', 'ent.163.com', 'ent.ifeng.com', 'eonline.com'];
      // var hitsA = [6,9,6,4,4,9,3,1,7,3,1,5,9,10,8,7,10,2,4,7,5,9,7,9,5,2,7,7,3,8,4,3,1,8,1,5,2,3,7,10];
      // var hitsB = [2,7,6,8,3,5,3,5,4,5,9,6,3,3,10,5,2,9,5,1,1,1,7,7,10,1,1,2,6,5,6,4,8,8,3,1,7,3,8,3];




      /*
        Create a function that adds bar graph
        function horizontalBarGraph(left/right, domains, hits)
      */

      function horizontalBarGraph(orientation, domains, hits, max_hits) {
        var column_width = 400;
        var colors = ['steelblue'];
        var grid = d3.range(25).map(function(i){
          return {'x1':0,'y1':0,'x2':0,'y2':1000};
        });

        var xscale = d3.scale.linear()
                .domain([0,10])
                .range([0,10]);

        var yscale = d3.scale.linear()
                .domain([0,domains.length])
                .range([0,900])

        var colorScale = d3.scale.quantize()
                .domain([0,domains.length])
                .range(colors);

        switch(orientation) {
          case 'left':
            var column = column1;
            var opposite_orientation = 'right';
            break;
          case 'right':
            var column = column2;
            var opposite_orientation = 'left';
            break;
        }
        var canvas = column
                .append('svg')
                .attr({'width':'100%','height': (domains.length * 24)});

          var xAxis = d3.svg.axis();
          xAxis
            .orient('bottom')
            .scale(xscale)

          var yAxis = d3.svg.axis();
          yAxis
            .orient(orientation)
            .scale(yscale)
            .tickSize(1)
            .tickFormat(function(d,i){ return domains[i]; })
            .tickValues(d3.range(domains.length));

        var y_xis = canvas.append('g')
          .style('fill', '#666')
          .attr("transform", function(){
            switch(orientation) {
              case 'left':
                return "translate(400,10)";
                break;
              case 'right':
                return "translate(0,10)";
                break;
            }
          })
          .attr('id','yaxis')
          .call(yAxis);

          var chart = canvas.append('g')
            .attr("transform", function() {
              if(orientation == 'right') {
                return "translate(200,0)";
              } else {
                return "translate('right',0)";
              }
            })
            .attr('id','bars')
            .selectAll('rect')
            .data(hits)
            .enter()
            .append('rect')
            .attr('height',19)
            .attr({
              'x': function(d, i) {
                if(orientation == 'left') {
                  // return ((d / Math.max.apply(Math, hits)) * 100)
                  return 200 - (((d/max_hits) * 180) + 20);
                } else {
                  return 0;
                }
              },
              'y': function(d,i) {
                return yscale(i)+19;
              }
            })
            .style('fill',function(d,i){ return colorScale(i); })
            .attr('width',function(d) {
              return (d / max_hits * 180) + 20;
            });
                  // .attr('width',function(d){ return (parseInt(d)/Math.max.apply(hits) * 100) + '%'; });

        switch(orientation) {
          case 'left':
            var transitext = d3.select('.comparison-column1 #bars')
              .selectAll('text')
              .data(hits)
              .enter()
              .append('text')
              .attr({'x': function(d) {
                return 185 - (d.toString().length * 4);
              },'y':function(d,i){ return yscale(i)+35; }})
              .text(function(d){ return d; }).style({'fill':'#000','font-size':'14px'})
            break;
          case 'right':
            var transitext = d3.select('.comparison-column2 #bars')
              .selectAll('text')
              .data(hits)
              .enter()
              .append('text')
              .attr({'x': 8,'y':function(d,i){ return yscale(i)+35; }})
              .text(function(d){ return d; }).style({'fill':'#000','font-size':'14px'})
            break;
        }
      }

      function renderComparison() {
        var input_data = {
          segmentA: segments[0],
          segmentB: segments[1]
        };

        var segmentA= [''];
        var segmentA_hits = [];

        var segmentB= [''];
        var segmentB_hits = [];

        crusher.subscribe.add_subscriber(["comparison"],function(comparison_data) {
          comparison_data.segmentA.forEach(function(domain, i){
            segmentA.push(domain.domain);
            segmentA_hits.push(domain.count);
          });

          comparison_data.segmentB.forEach(function(domain, i){
            segmentB.push(domain.domain);
            segmentB_hits.push(domain.count);
          });

          // var max_hits = [Math.max.apply(segmentA_hits), Math.max(segmentB_hits)];
          var max_hits = Math.max(segmentA_hits[0], segmentB_hits[0])

          drawIntersection(comparison_data.intersection_data.segmentA, comparison_data.intersection_data.segmentB, comparison_data.intersection_data.intersection)
          horizontalBarGraph('left', segmentA, segmentA_hits, max_hits)
          horizontalBarGraph('right', segmentB, segmentB_hits, max_hits)
        },"comparison-data",true,false, input_data);
      }







      // main_wrapper.exit().remove()







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

        crusher.subscribe.add_subscriber(["actions"],subscription ,"actionDashboard",true,true)

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
      "name":"Comparison",
      "push_state": "/crusher/comparison",
      "class": "glyphicon glyphicon-adjust",
      "values_key": "action_name"

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
