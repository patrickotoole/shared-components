var RB = RB || {};
RB.crusher = RB.crusher || {};

RB.crusher.controller = (function(controller) {

  // requires: api.js, d3.js

  var crusher = RB.crusher
  var source = crusher.api.source
  var pubsub = crusher.pubsub


  controller.init = function(type, data) {
    pubsub.subscriber("advertiser-name-email", ["advertiser", "current_user"])
      .run(function(advertiser_data, current_user) {
        setTimeout(function() {
          var user_type = document.cookie.split("user_type=")[1].split(";")[0];
          switch (user_type) {
            case 'rockerbox':
              heap.identify({
                handler: 'Rockerbox',
                name: 'Rockerbox',
                email: 'support@rockerbox.com'
              });

              window.intercomSettings = {
                app_id: "rvo8kuih",
                name: "Rockerbox",
                email: "support@rockerbox.com",
                created_at: 1312182000
              };
              (function() {
                var w = window;
                var ic = w.Intercom;
                if (typeof ic === "function") {
                  ic('reattach_activator');
                  ic('update', intercomSettings);
                } else {
                  var d = document;
                  var i = function() {
                    i.c(arguments)
                  };
                  i.q = [];
                  i.c = function(args) {
                    i.q.push(args)
                  };
                  w.Intercom = i;

                  function l() {
                    var s = d.createElement('script');
                    s.type = 'text/javascript';
                    s.async = true;
                    s.src = 'https://widget.intercom.io/widget/kbtc5999';
                    var x = d.getElementsByTagName('script')[0];
                    x.parentNode.insertBefore(s, x);
                  }
                  if (w.attachEvent) {
                    w.attachEvent('onload', l);
                  } else {
                    l(false)
                  }
                }
              })()
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
              (function() {
                var w = window;
                var ic = w.Intercom;
                if (typeof ic === "function") {
                  ic('reattach_activator');
                  ic('update', intercomSettings);
                } else {
                  var d = document;
                  var i = function() {
                    i.c(arguments)
                  };
                  i.q = [];
                  i.c = function(args) {
                    i.q.push(args)
                  };
                  w.Intercom = i;

                  function l() {
                    var s = d.createElement('script');
                    s.type = 'text/javascript';
                    s.async = true;
                    s.src = 'https://widget.intercom.io/widget/xu33kr1z';
                    var x = d.getElementsByTagName('script')[0];
                    x.parentNode.insertBefore(s, x);
                  }
                  if (w.attachEvent) {
                    w.attachEvent('onload', l);
                  } else {
                    l(false)
                  }
                }
              })()
              break;
          }

          Intercom('trackEvent', 'Page Load', {
            'url': window.location.href
          });
        }, 2000)
      })
      .unpersist(false)
      .trigger()

    var id = type.split("id=")[1]
    if (id && id.length) {
      id = decodeURI(id)
    }

    var type = type.split("?")[0]
    // debugger;
    var state = controller.states[type] || controller.states["/crusher/home"]

    // state = JSON.parse(JSON.stringify(state))
    if (id) state.skipRender = true

    var callback = id ? function(data, x) {
      var xx = data.filter(function(y) {
        return y[x.values_key] == id
      })

      RB.routes.navigation.forward(xx[0])
    } : false


    RB.routes.navigation.forward(state, callback)

    // INIT RESIZE CALLBACK
    var resize_last_ts = 0;
    var resize_publisher = pubsub.publisher("resize")
      .producer(function(cb) {
        var current = +new Date();
        var temp = resize_last_ts;
        resize_last_ts = +new Date();

        if (temp - current >= -100) {
          var fire_event = setTimeout(function() {
            cb(true);
          }, 100);
        } else {
          cb(true);
        }
      });
    d3.select(window).on("resize", function() {
      pubsub.publishers.resize();
    })

  }

  var build_header = function(obj) {

    var target = d3.selectAll('.container')

    var funnelRow = d3_splat(target, '.row', 'div', [obj], function(x) {
        return x.id
      })
      .classed('row funnels', true)

    funnelRow.exit().remove()

    var heading = d3_updateable(funnelRow, 'page-header', 'header')
      .text(function(x) {
        return x.name;
      })
      .attr('class', function(x) {
        var classes = ['page-header'];

        if (!d3.select('body')[0][0].classList.contains('hide-select')) {
          classes.push('with-sidebar')
        }

        return classes.join(' ')
      })

    d3_updateable(funnelRow, '.pixel-description', 'div')
      .classed('pixel-description', true)
      .style('margin-top', '15px')
      .style('margin-bottom', '15px')
      .html(function(x) {
        return x.description
      })

    return funnelRow

  }

  controller.initializers = {

    "settings": function() {

      var funnelRow = build_header({
        "id": "settings",
        "name": "Account Overview",
        "description": "Below is a summary of the settings associated with your account."
      })

      var subscription = function(advertiser, actions, funnels) {
        crusher.ui.settings.main(funnelRow, advertiser, actions, funnels)
      }

      pubsub.subscriber("settings", ["advertiser", "actions", "funnels"])
        .run(subscription)
        .unpersist(true)
        .trigger()

    },
    "settings/advertiser": function() {

      var funnelRow = build_header({
        "id": "settings/advertiser",
        "name": "Manage Advertiser"
      })
      crusher.ui.settings.advertiser(funnelRow)

    },
    "settings/subscription": function() {

      var funnelRow = build_header({
        "id": "settings/subscription",
        "name": "Manage Subscription"
      })
      crusher.ui.settings.subscription(funnelRow)

    },
    "settings/pixel/setup": function() {

      var funnelRow = build_header({
        "id": "setup",
        "name": "Pixel Setup"
      })

      pubsub.subscriber("pixel_settings", ["pixel_status", "advertiser", "an_uid"])
        .run(function(status_data, advertiser_data, uid) {
          crusher.ui.pixel.setup(funnelRow, status_data, advertiser_data, uid)
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

      if (not_table) {
        RB.crusher.ui.vendors.show(funnelRow, obj);
      } else {
        RB.crusher.ui.vendors.table(funnelRow, obj);
      }
    },
    "comparison": function() {},
    "gettingstarted": function() {
      d3.select("body")
        .classed("hide-select", true)

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
        .classed("hide-select", true)

      var target = d3.selectAll(".container")
        .style("min-height", "100%")

      var row = d3_splat(target, ".row", "div", [{
          "id": "gettingstarted2"
        }], function(x) {
          return x.id
        })
        .classed("row gettingstarted", true)

      row.exit().remove()

      /* Header */
      var heading = d3_updateable(row, ".welcome-heading", "h5")

      heading.text("Welcome to Crusher, let's first set-up some things")
        .attr("style", "margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("welcome-heading heading", true)
      RB.crusher.ui.gettingstarted.step2(row, {
        continue: RB.routes.navigation.forward.bind(false, RB.crusher.controller.states["/crusher/gettingstarted/step3"])
      });
    },
    "gettingstarted/step3": function() {
      d3.select("body")
        .classed("hide-select", true)

      var target = d3.selectAll(".container")
        .style("min-height", "100%")

      var row = d3_splat(target, ".row", "div", [{
          "id": "gettingstarted3"
        }], function(x) {
          return x.id
        })
        .classed("row gettingstarted", true)

      row.exit().remove()

      /* Header */
      var heading = d3_updateable(row, ".welcome-heading", "h5")

      heading.text("Welcome to Crusher, let's first set-up some things")
        .attr("style", "margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("welcome-heading heading", true)
      RB.crusher.ui.gettingstarted.step3(row, {
        goToAction: RB.routes.navigation.forward.bind(false, RB.crusher.controller.states["/crusher/action/existing"]),
        goToFunnel: RB.routes.navigation.forward.bind(false, RB.crusher.controller.states["/crusher/funnel/new"])
      });
    },

    "home": function() {
      // Check if the getting started page needs to be shown
      var pixel_count = {
        allpages: 0,
        conversion: 0
      }

      pubsub.subscriber("gettingstarted", ["pixel_status", "actions"])
        .run(function(status_data, actions) {
          status_data.forEach(function(pixel) {
            if (pixel.segment_name.indexOf("All Pages") >= 0) {
              pixel_count.allpages++;
            } else if (pixel.segment_name.indexOf("Conversion") >= 0) {
              pixel_count.conversion++;
            }
          });

          var no_actions = false;
          if (crusher.cache.actionData.length == 0) {
            no_actions = true;
          }

          if (!pixel_count.allpages) {
            RB.routes.navigation.forward(controller.states["/crusher/gettingstarted"])
          } else if (no_actions) {
            RB.routes.navigation.forward(controller.states["/crusher/gettingstarted/step2"])
          }
        })
        .unpersist(false)
        .trigger()

      d3.select("body").classed("hide-select", true)

      var funnelRow = build_header({
        "id": "home",
        "name": "Welcome to Crusher"
      })

      crusher.ui.home.main(funnelRow)

      var wrapper = funnelRow.selectAll(".tutorial-description")
      var subscription = crusher.ui.home.status.bind(false,wrapper)

      pubsub.subscriber("home",["pixel_status","advertiser","actions"])
        .run(subscription)
        .unpersist(false)
        .trigger()
    },
    "analytics": function() {

      var funnelRow = build_header({
        "id": "analytics_overview",
        "name": "Dashboard"
      })
      var subscription = crusher.ui.home.dashboard.bind(false, funnelRow)

      pubsub.subscriber("dashboard", ["dashboardStats"])
        .run(subscription)
        .unpersist(true)
        .trigger()
    },

    "funnel": function(funnel) {

      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
      RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)


      var funnelRow = build_header({
        "id": "funnel_dashboard",
        "name": "Funnel Dashboard"
      })
      var subscription = crusher.ui.home.dashboard.bind(false, funnelRow)

      var main_wrapper = d3_updateable(funnelRow, ".main-wrapper", "div")
        .classed("main-wrapper", true)


      var desc = "Funnels allow you to model the behavior between segments. " +
        "For instance, you can look at a user who comes to a landing page and then proceeds to checkout." +
        ""

      RB.rho.ui.buildWrappers(main_wrapper, "About Funnels", "none", [{}], "col-md-6", desc)

      main_wrapper.selectAll(".value").style("height", "1px")
        .style("line-height", "1px")
        .style("padding", "0px")


    },
    "funnel/existing": function(funnel) {

      var events = ["actions", "funnels", "campaigns", "lookalikes", "lookalikeCampaigns"]
      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
      RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)


      crusher.ui.funnel.buildBase()

      events.map(function(x) {
        crusher.subscribe.publishers[x]()
      })
      crusher.subscribe.publishers["funnel_all"](funnel)
    },
    "funnel/new": function() {
      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
      RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)


      crusher.ui.funnel.buildBase()
      var target = d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")

      RB.crusher.controller.funnel.new(target)
    },


    "action": function() {

      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
      RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)

      var funnelRow = build_header({
        "id": "action_about",
        "name": "Action Dashboard"
      })
      var subscription = RB.crusher.ui.action.dashboard.show.bind(false, funnelRow)

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
        crusher.subscribe.register_publisher(e, crusher.api.endpoints[e])
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
        var funnelRow = build_header({
          'id': 'vendors-expanded',
          'name': 'Vendor Analysis',
        });

        // var filter = action.filter || function(x) { return x.action_type == 'segment'; }

        RB.crusher.ui.vendors.show(funnelRow, action);


        // existing dashboard...
        // var funnelRow = build_header({
        //   "id": "action_about",
        //   "name": "Segments Dashboard"
        // })
        // var subscription = RB.crusher.ui.action.dashboard.widgets.bind(false, funnelRow)
        //
        // var loading_indicator = d3_updateable(funnelRow, '.loading-indicator', 'div')
        //   .classed('loading-indicator', true)
        //   .style('text-align', 'center')
        //   .style('margin', '80px 0 100px 0')
        //   .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading segment data...');
        //
        // pubsub.subscriber("dashboard_cached", ["actions", "dashboard_cached"])
        //   .run(subscription)
        //   .unpersist(true)
        //   .trigger()
      }

    },
    "action/new": function(action) {
      crusher.ui.action.buildBase()

      var target = d3.selectAll(".action-view-wrapper")
      target.selectAll(".action-view").remove()

      pubsub.subscriber("new", ["actions"])
        .run(function(actionsw) {
          var override = (action.action_name) ? action : false
          controller.action.new(target, crusher.cache.urls_wo_qs, override)
        })
        .unpersist(true)
        .trigger()
    },
    "action/recommended": function(action) {

      crusher.ui.action.buildBase("action_recommended")

      var target = d3.selectAll(".action-view-wrapper")

      pubsub.subscriber("new", ["actions"])
        .run(function(actionsw) {
          target.selectAll(".action-view").remove()
          var override = (action.action_name) ? action : false
          controller.action.new(target, crusher.cache.urls_wo_qs, override)
        })
        .unpersist(true)
        .trigger()
    }
  }

  controller.get_bloodhound = function(cb) {

    var compare = function(a, b) {
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
        prepare: function(x, settings) {
          var q = x.split(" ").join(","),
            split = settings.url.split("%QUERY")

          settings.url = split[0] + q + split[1]
          return settings
        }
      },
      sorter: compare
    });

    cb(controller.bloodhound)

  }



  controller.routes = {
    roots: [{
      "name": "Segments",
      "push_state": "/crusher/action/existing",
      "class": "fa fa-users",
      "selection": "All Segments",
      "values_key": "action_name"
    }, {
      "name": "Create Segment",
      "push_state": "/crusher/action/recommended",
      "class": "glyphicon glyphicon-plus",
      "values_key": "action_name",
      "hide_href": true
    }, {
      "name": "Settings",
      "push_state": "/crusher/settings",
      "class": "glyphicon glyphicon-cog"
    }],
    selectbar_renderers: {
      "action/existing": RB.menu.action
    },
    renderers: controller.initializers,
    transforms: {
      "funnel/new": function(menu_obj) {
        menu_obj.values = RB.crusher.cache.funnelData
        RB.menu.methods.transform(menu_obj, menu_obj.values_key)
      },
      "funnel/existing": function(menu_obj) {
        menu_obj.values = RB.crusher.cache.funnelData
        RB.menu.methods.transform(menu_obj, menu_obj.values_key)
      },
      "action/existing": function(menu_obj) {
        var data = d3.nest()
          .key(function(x) {
            return x.action_classification
          })
          .entries(RB.crusher.cache.actionData)


        menu_obj.values = data
        RB.menu.methods.transform(menu_obj,menu_obj.values_key)
      },
      "action/recommended": function(menu_obj) {

        crusher.cache.recommendedActionData = crusher.cache.recommendations
          .slice(0, 20)
          .map(function(x) {
            return {
              "action_name": x.first_word,
              "url_pattern": [x.first_word]
            }
          })
        menu_obj.name = "Recommended Segments";
        menu_obj.values = RB.crusher.cache.recommendedActionData
        RB.menu.methods.transform(menu_obj, menu_obj.values_key)
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
        "name": "Segments",
        "push_state": "/crusher/action",
      }, {
        "name": "Funnels",
        "push_state": "/crusher/funnel",
      }],
      "settings": [{
        "name": "Pixel Setup",
        "push_state": "/crusher/settings/pixel/setup",
      }, {
        "name": "Advertiser Setup",
        "push_state": "/crusher/settings/advertiser",
      }, {
        "name": "Subscription",
        "push_state": "/crusher/settings/subscription",
      }],
      "gettingstarted": [{
        "name": "Getting Started",
        "push_state": "/crusher/gettingstarted"
      }, {
        "name": "Getting Started Step 2",
        "push_state": "/crusher/gettingstarted/step2"
      }, {
        "name": "Getting Started Step 3",
        "push_state": "/crusher/gettingstarted/step3"
      }],
      "comparison": [{
        "name": "Comparison",
        "push_state": "/crusher/comparison"
      }],
      "vendors": [{
        "name": "Vendors",
        "push_state": "/crusher/vendors"
      }, {
        "name": "Vendors Table",
        "push_state": "/crusher/vendors/table"
      }],
      "full_url_ranking": [{
        "name": "Full URL Ranking",
        "push_state": "/crusher/full_url_ranking"
      }],
      "home": [{
        "name": "Home",
        "push_state": "/crusher/home"
      }, {
        "name": "Segments",
        "push_state": "/crusher/action",
      }, {
        "name": "Settings",
        "push_state": "/crusher/settings",
      }],
      "funnel": [{
        "name": "Create New Funnel",
        "push_state": "/crusher/funnel/new",
      }, {
        "name": "View Existing Funnels",
        "push_state": "/crusher/funnel/existing",
        "skipRender": true,
        "values_key": "funnel_name"
      }],
      "action": [{
        "name": "Recommended Segments",
        "push_state": "/crusher/action/recommended",
        "values_key": "action_name",
        "hide_href": true
      }, {
        "name": "View Existing Segments",
        "push_state": "/crusher/action/existing",
        //"skipRender": true,
        "values_key": "action_name",
        "selection": "All Segments"
      }]
    }
  }

  controller.states = {}

  Object.keys(controller.routes.apis).map(function(k) {
    if (controller.routes.apis[k].length > 0 && typeof(controller.routes.apis[k][0]) == "object") {
      controller.routes.apis[k].map(function(state) {
        console.log('STATE', state);
        controller.states[state.push_state] = state
      })
    }
  })

  RB.routes.register(controller.routes)



  return controller

})(RB.crusher.controller || {})
