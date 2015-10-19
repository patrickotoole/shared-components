var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.crusher.controller = (function(controller) {

  // requires: api.js, d3.js

  var crusher = RB.crusher
  var source = crusher.api.source 

  controller.init = function(type,data) {

    //var type = (type == "/crusher") ? "" : type
    var id = data ? data.funnel_id : false
     
    var state = controller.states[type]
    if (state) {
      RB.routes.navigation.forward(state)
    } else {
      RB.routes.navigation.forward(controller.states["/crusher/home"])
    }
    
    //if (type.length) controller.initializers[type](id)


    // INIT RESIZE CALLBACK
    d3.select(window).on("resize",function(){
      crusher.subscribe.publishers["resize"]()
    })

    
    
  }

  controller.initializers = {
    "home": function(){
      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"home"}],function(x){return x.id})
        .classed("row funnels",true)

      funnelRow.exit().remove()



      var heading = d3_updateable(funnelRow,".heading","h5")

      heading.text("Welcome to Crusher")
        .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("heading",true)

      var info = d3_updateable(funnelRow,".col-md-12","div")

      info.attr("style","padding-bottom:15px;padding-top:5px")
        .classed("col-md-12 row",true)

      d3_updateable(info,".crusher-description","div")
        .classed("crusher-description",true)
        .text("Crusher is a tool to help advertisers understand the off-site interests and opportunities to advertise to users in your audience.")

      d3_updateable(info,".pixel-description","div")
        .classed("pixel-description",true)
        .style("margin-top","15px")
        .html("If this is your first time logging in, make sure that you have completed pixel implementation. Below we show the last time your pixel has fired: ")

      var pixelBox = d3_updateable(funnelRow,".pixel-box","div")
        .classed("pixel-box",true)

      

      crusher.subscribe.add_subscriber(["pixel_status","advertiser"], function(status_data,advertiser_data){

        var statusByID = d3.nest()
          .key(function(x){return x.segment_id})
          .map(status_data)
       
        var active_segments = advertiser_data.segments.filter(function(x){return x.segment_implemented != ""})

        active_segments.map(function(seg){
          var status = statusByID[seg.external_segment_id]
          seg.status = (status && status.length) ? status[0] : {}
        })

        var class_name = (active_segments.length > 2) ? "col-md-4" : "col-md-" + (12/active_segments.length) ;

        var wrapper = d3_splat(pixelBox,".pixel-wrapper","div",active_segments,function(x){return x.external_segment_id})
          .classed("pixel-wrapper " + class_name,true)

        var row = d3_updateable(wrapper,".pixel-row","div")
          .classed("pixel-row ct-chart",true)
          .style("padding-bottom","20px")

        d3_updateable(row,".time-ago-icon","span")
          .classed("glyphicon time-ago-icon chart-description pull-right",true)
          .classed("glyphicon-warning-sign",function(x){return x.status.last_fired_pretty === undefined })
          .classed("glyphicon-ok-circle",function(x){return x.status.last_fired_pretty !== undefined })
          .style("color",function(x){return (x.status.last_fired_pretty === undefined) ? "red" : "green" })
          .style("font-size","18px")
          .style("width","24px")
          .style("height","24px")
          .style("margin","-5px")



        d3_updateable(row,".name","div")
          .classed("name chart-title",true)
          .text(function(x){return x.segment_name })

        d3_updateable(row,".time-ago","div")
          .classed("time-ago chart-description",true)
          .text(function(x){return "Last fired: " + x.status.last_fired_pretty })

        

        d3_updateable(row,".segment-id","div")
          .classed("segment-id chart-description",true)
          .text(function(x){return "(" + x.external_segment_id + ")"})



          
      },"home",true,true)

      



    },
    "action": function(){

      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"action_about"}],function(x){return x.id})
        .classed("row funnels",true)

      funnelRow.exit().remove()


      crusher.subscribe.add_subscriber(["recommended_actions"],function(data) {

        var heading = d3_updateable(funnelRow,".heading","h5")
        heading
          .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
          .text("On-page Actions")
          .classed("heading",true)

        var info = d3_updateable(funnelRow,".col-md-12","div")

        info.attr("style","padding-bottom:15px;padding-top:5px")
          .classed("col-md-12 row",true)
          .text("High level stats about the actions you users take")

        var chart_options = [{
            "title":"Top actions",
            "field":"views",
            "description":"These are the actions that are most popular on your site",
            "type":"bar",
            "summary":"total",
            "format":false
          }
        ]

        var chart_wrappers = d3_splat(funnelRow,".col-md-12","div",chart_options,function(x){return x.field})
          .classed("col-md-12",true)

        var charts = d3_updateable(chart_wrappers,".ct-chart","div")
          .attr("id",function(x){return x.field})
          .classed("ct-chart",true)

        var data = data.slice(0,10).reverse()

        chart_wrappers.data().map(function(d) {
          RB.rho.ui.buildChart(
            ".ct-chart#" + d.field, data, "first_word", d.field, d.title, d.description, d.type, d.summary, d.format, 250, 100
          )
        })
        
      },"actionDashboard",true,true)

    },
    "": function(){
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

 
      crusher.ui.action.buildBase()

      crusher.subscribe.publishers["actions"]()
      crusher.subscribe.publishers["action_all"](action)
       
    },
    "action/new": function(action) {
      crusher.ui.action.buildBase()

      var target = d3.selectAll(".action-view-wrapper")

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
    roots: [{
      "name":"On-page Analytics",
      "push_state": "/crusher/"
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
      "": [{
          "name":"Overview",
          "push_state":"/crusher/",
        },{
          "name":"Actions",
          "push_state":"/crusher/action",
        },
        {
          "name":"Funnels",
          "push_state":"/crusher/funnel",
        }],
      "home": [{
          "name":"Quick Links",
          "push_state":"/crusher/home"
        },
        {
          "name":"Actions",
          "push_state":"/crusher/action",
        },
        {
          "name":"Pixel Settings",
          "push_state":"/crusher/pixel",
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
          "push_state":"/crusher/action/new",
          "values_key": "action_name"
        },
        {
          "name": "Recommmended Actions",
          "push_state":"/crusher/action/recommended",
          "values_key": "action_name"
        },
        {
          "name": "View Existing Actions",
          "push_state":"/crusher/action/existing",
          "skipRender": true,
          "values_key":"action_name"
        }]
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
