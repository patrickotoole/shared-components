var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.crusher.controller = (function(controller) {

  // requires: api.js, d3.js

  var crusher = RB.crusher
  var source = crusher.api.source 

  controller.init = function(type,data) {

    var id = data ? data.funnel_id : false
    var state = controller.states[type] || controller.states["/crusher/home"]

    RB.routes.navigation.forward(state)
    
    // INIT RESIZE CALLBACK
    d3.select(window).on("resize",function(){
      crusher.subscribe.publishers["resize"]()
    })
    
  }

  controller.initializers = {
    "settings/advertiser": function() {
      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"advertiser"}],function(x){return x.id})
        .classed("row funnels",true)

      funnelRow.exit().remove()

      var heading = d3_updateable(funnelRow,".heading","h5")

      heading.text("Manage Advertiser")
        .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("heading heading",true)

      crusher.ui.settings.advertiser(funnelRow)
    },

    "settings/subscription": function() {
      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"subscription"}],function(x){return x.id})
        .classed("row funnels",true)

      funnelRow.exit().remove()

      var heading = d3_updateable(funnelRow,".heading","h5")

      heading.text("Manage Subscription")
        .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("heading heading",true)

      crusher.ui.settings.subscription(funnelRow)

    },
    "settings": function() {
      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"settings"}],function(x){return x.id})
        .classed("row funnels",true)

      funnelRow.exit().remove()

      var heading = d3_updateable(funnelRow,".heading","h5")

      heading.text("Account Overview")
        .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("heading heading",true)

      d3_updateable(funnelRow,".pixel-description","div")
        .classed("pixel-description",true)
        .style("margin-top","15px")
        .style("margin-bottom","15px")
        .html("Below is a summary of the settings associated with your account.")


      crusher.subscribe.add_subscriber(
        ["advertiser","actions", "funnels"], 
        function(advertiser_data,action_data,funnel_data){

          crusher.ui.settings.main(funnelRow,advertiser_data,action_data,funnel_data)

        },
        "overview",true,false
      )



    },
    "settings/pixel/setup": function() {
      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"setup"}],function(x){return x.id})
        .classed("row funnels",true)

      funnelRow.exit().remove()

      crusher.subscribe.add_subscriber(
        ["pixel_status","advertiser","an_uid"], 
        function(status_data,advertiser_data,uid){
          crusher.ui.pixel.setup(funnelRow,status_data,advertiser_data,uid)
        },
        "settings",true,true
      )

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
        goToAction: RB.routes.navigation.forward.bind(false, RB.crusher.controller.states["/crusher/action/new"]),
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

      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"home"}],function(x){return x.id})
        .classed("row funnels",true)

      funnelRow.exit().remove()



      var heading = d3_updateable(funnelRow,".welcome-heading","h5")

      heading.text("Welcome to Crusher")
        .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("welcome-heading heading",true)

      var info = d3_updateable(funnelRow,".row","div")

      info.attr("style","padding-bottom:15px;padding-top:5px")
        .classed("row",true)

      var descriptionWrap = d3_updateable(info,".crusher-about","div")
        .classed("crusher-about col-md-6",true)

      var description = d3_updateable(descriptionWrap,".ct-chart","div")
        .classed("ct-chart",true)
        .style("padding-bottom","15px")

      d3_updateable(description,".about-heading","")
        .classed("about-heading chart-title",true)
        .text("What is Crusher?")

      d3_updateable(description,".about-description","div")
        .classed("about-description chart-description",true)
        .html(
          "<br>Crusher is a tool to help you understand the off-site interests and opportunities to advertise to users in your audience based on differences in on-site user activity." + 
          "<br><br>We built crusher because we believe that understanding what you audience does when they are not on your site is the is the best way to craft relevant, meaningful advertisements."
        )

      var descriptionWrap = d3_updateable(info,".crusher-how","div")
        .classed("crusher-how col-md-6",true)

      var description = d3_updateable(descriptionWrap,".ct-chart","div")
        .classed("ct-chart",true)
        .style("padding-bottom","15px")

      d3_updateable(description,".about-heading","")
        .classed("about-heading chart-title",true)
        .text("How to use Crusher")

      d3_updateable(description,".about-description","div")
        .classed("about-description chart-description",true)
        .html(
          "<br>Crusher data provides a better understanding of your audience which can be used to: <br><br>" +
          "<ul><li>provide demographic insight about your audience</li><li>influence creative development</li><li>recommend topics for content marketing</li><li>highlight opportunities for direct advertising deals</li><li>make programmatic buys similar to your current audience</li></ul>"
        )

      var descriptionWrap = d3_updateable(info,".crusher-tutorial","div")
        .classed("crusher-tutorial col-md-12",true)

      var description = d3_updateable(descriptionWrap,".ct-chart","div")

        .classed("crusher-tutorial ct-chart",true)
        .style("padding-bottom","15px")

      d3_updateable(description,".tutorial-heading","")
        .classed("tutorial-heading chart-title",true)
        .text("Getting started with Crusher")

      var tutDesc = d3_updateable(description,".tutorial-description","div")
        .classed("tutorial-description chart-description",true)

      crusher.subscribe.add_subscriber(["pixel_status","advertiser","actions"], function(status_data,advertiser_data,actions){

        var item1 = d3_updateable(tutDesc,".item-1","div")
          .classed("item-1",true)
          .style("margin-top","10px")

        d3_updateable(item1,".status","span")
          .classed("glyphicon status",true)
          .style("font-size","24px")
          .style("float","left")
          .classed("glyphicon-ok-circle green",function(x) {
            return status_data.filter(function(x){return x.last_fired_seconds != undefined}).length 
          })
          .classed("glyphicon-remove-circle red",function(x) {
            return status_data.filter(function(x){return x.last_fired_seconds != undefined}).length == 0 
          })

        d3_updateable(item1,".desc","a")
          .classed("desc",true)
          .style("line-height","24px")
          .style("text-align","center")
          .style("color","rgb(90, 90, 90)")
          .style("padding-left","10px")
          .html("Implement the Rockerbox pixel on your website. ")
          .on("click",function(){
            RB.routes.navigation.forward(controller.states["/crusher/settings/pixel_setup"])  
          })

        var item2 = d3_updateable(tutDesc,".item-2","div")
          .classed("item-2",true)
          .style("margin-top","10px")

        d3_updateable(item2,".status","span")
          .classed("glyphicon status",true)
          .style("font-size","24px")
          .style("float","left")
          .classed("glyphicon-ok-circle green",function(x) {
            return crusher.cache.actionData.length 
          })
          .classed("glyphicon-remove-circle red",function(x) {
            return crusher.cache.actionData.length == 0 
          })

        d3_updateable(item2,".desc","a")
          .classed("desc",true)
          .style("line-height","24px")
          .style("text-align","center")
          .style("color","rgb(90, 90, 90)")
          .style("padding-left","10px")
          .html("Implement your first action")
          .on("click",function(){
            RB.routes.navigation.forward(controller.states["/crusher/action"])  
          })
         
      },"home",true,false)

    },
    "action": function(){

      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
      RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)

      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"action_about"}],function(x){return x.id})
        .classed("row funnels",true)

      funnelRow.exit().remove()

      crusher.subscribe.add_subscriber(["recommended_actions","actions"],function(reccomended,existing) {

        RB.crusher.ui.action.dashboard.show(funnelRow,reccomended,existing)
        
      },"actionDashboard",true,true)

    },
    "analytics": function(){
      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"analytics_overview"}],function(x){return x.id})
        .classed("row funnels",true)

      crusher.subscribe.add_subscriber(["dashboardStats"],function(data) {

        var heading = d3_updateable(funnelRow,".heading","h5")
        heading
          .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
          .text("On-page Analytics Overview")
          .classed("heading",true)

        var info = d3_updateable(funnelRow,".col-md-12","div")

        info.attr("style","padding-bottom:15px;padding-top:5px")
          .classed("col-md-12",true)
          .text("High level stats about on-page activity")

        var chart_options = [{
            "title":"Views",
            "field":"views",
            "description":"Number of pageviews per day generated by visitors to your site",
            "type":"line",
            "summary":"total",
            "format":false
          },{
            "title":"Engaged",
            "field":"engaged",
            "description":"Number of engaged users (visited 5 or more pages) on your site",
            "type":"line",
            "summary":"total",
            "format":false
          },{
            "title":"Visitors",
            "field":"visitors",
            "description":"Number of distinct users visiting your site per day",
            "type":"line",
            "summary":"total",
            "format":false
          },{
            "title":"Engagement",
            "field":"engagement",
            "description":"Ratio of visitors who are considered to be engaged users",
            "type":"line",
            "summary":"average",
            "format":d3.format(".1%")
          },{
            "title":"Ad opportunities",
            "field":"advertising_ops",
            "description":"Number of advertising opportunities Rockerbox has seen for your users",
            "type":"line",
            "summary":"total",
            "format":false
          },{
            "title":"Views per user",
            "field":"views_per_user",
            "description":"This is the average number of pageviews per visitor to your site",
            "type":"line",
            "summary":"average",
            "format":d3.format(".3r")
          }
        ]

        var chart_wrappers = d3_splat(funnelRow,".col-md-4","div",chart_options,function(x){return x.field})
          .classed("col-md-4",true)

        var charts = d3_updateable(chart_wrappers,".ct-chart","div")
          .attr("id",function(x){return x.field})
          .classed("ct-chart",true)

        chart_wrappers.data().map(function(d) {
          RB.rho.ui.buildChart(
            ".ct-chart#" + d.field, data, "date", d.field, d.title, d.description, d.type, d.summary, d.format
          )
        })

        
      },"dashboard",true,true)


      funnelRow.exit().remove()
    },
    "funnel/existing": function(funnel) {

      var events = ["actions","funnels","campaigns","lookalikes","lookalikeCampaigns"]
      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)

      crusher.ui.funnel.buildBase() 

      events.map(function(x){ crusher.subscribe.publishers[x]() })
      crusher.subscribe.publishers["funnel_all"](funnel)
    },
    "funnel/new": function(){
      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)

      crusher.ui.funnel.buildBase()
      var target = d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")

      RB.crusher.controller.funnel.new(target)
    },
    "action/existing": function(action) {

      RB.component.export(RB.crusher.ui.funnel.show, RB.crusher.ui.funnel)
      RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)

      if (action) {

        crusher.ui.action.buildBase()

        crusher.subscribe.publishers["action_show"]()

        crusher.subscribe.publishers["actions"]()
        crusher.subscribe.publishers["action_all"](action)
      } else {
        
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

      crusher.ui.action.buildBase()

      var target = d3.selectAll(".action-view-wrapper")

      crusher.subscribe.add_subscriber(["actions"], function(actionsw){

        var override = (action.action_name) ? action : false
        controller.action.new(target,crusher.cache.urls_wo_qs, override)
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
      "name":"Actions",
      "push_state": "/crusher/action/existing",
      "class": "glyphicon glyphicon-signal",
      "values_key": "action_name"

    },{
      "name":"Create Action",
      "push_state": "/crusher/action/recommended",
      "class": "glyphicon glyphicon-plus",
      "values_key": "action_name"

    },{
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

        menu_obj.values = RB.crusher.cache.recommendedActionData
        RB.menu.methods.transform(menu_obj,menu_obj.values_key)
      }
    },
    apis: {
      "funnel/new": [],
      "funnel/existing": ['funnels'],
      "action/existing": ['actions'],
      "action/new": [],
      "action/recommended": ["recommended_actions"],
      "analytics": [{
          "name":"Actions",
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
      "home": [{
          "name":"Home",
          "push_state":"/crusher/home"
        },
        {
          "name":"Actions",
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
          "name": "Create New Action",
          "push_state":"/crusher/action/recommended",
          "values_key": "action_name"
        },{
          "name": "Recommmended Actions",
          "push_state":"/crusher/action/recommended",
          "values_key": "action_name"
        },{
          "name": "View Existing Actions",
          "push_state":"/crusher/action/existing",
          "skipRender": true,
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
