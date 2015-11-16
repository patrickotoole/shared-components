var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.action = RB.crusher.ui.action || {}


RB.crusher.ui.action.dashboard = (function(dashboard,crusher) {

    dashboard.show = function(funnelRow,data,existing) {

      var style = "margin:-15px;padding-left:20px;height:70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-right:0px;margin-bottom:20px"

      var heading = d3_updateable(funnelRow,".heading","h5")
      heading
        .attr("style",style)
        .text("On-page Actions")
        .classed("heading",true)


      dashboard.current(funnelRow,existing)
      dashboard.recommended(funnelRow,data)

    }

    dashboard.widgets = function(funnelRow,data) {

      var funnelRow = funnelRow
      var odata = data

      var data = data.slice(0,3)
        .map(function(x){
          x.views = x.views || ""
          return x
        }).map(function(x){
          obj = {
            "key": x.action_name,
            "Action name": x.action_name,
            "views":x.views,
            "visits":x.visits,
            "uniques":x.uniques,
            "__proto__": x
          }
          return obj
        })

      
      
      var title = "Top existing actions",
        description = "These are the keywords that are most popular on your site",
        button = {
          "class_name": "gear glyphicon-cog glyphicon",
          "name": "",
          "click": function(x){
            RB.routes.navigation.forward(x)
            d3.select(".edit").on("click")()
          }
        }

      var target = RB.rho.ui.buildWrappers(funnelRow, 
        function(x){return x['Action name']}, 
        "views", data, "col-md-4", 
        function(x){return x.description}, button
      )

      target.on("mouseover",function(x){
        d3.select(this).selectAll(".gear").classed("hidden",false)
      }).on("mouseout",function(x){
        d3.select(this).selectAll(".gear").classed("hidden",true)
      })
 
      target.selectAll(".gear")
        .classed("btn btn-sm btn-default",false)
        .classed("hidden",true)
        .style("color","#ccc")
        .style("text-decoration","none")
        .style("font-size","16px")
        .style("line-height","20px")


      target.selectAll(".value").html(function(x){
        return x.views ? d3.format(",")(x.views) + " <span style='font-size:.7em'>views</span>" : ""
      }).style("font-size","18px")

      target.selectAll(".title")
        .style("font-size","20px")
        .style("cursor","pointer")
        .style("border-bottom",function(x) {
          return x.views ? "1px solid #ccc" : undefined
        })
        .on("click",function(x){
          RB.routes.navigation.forward(x)
        })
        .html(function(x){
  
          function capitalize(s) {
            return s && s[0].toUpperCase() + s.slice(1);
          }
          // Doing this just to make it vimium friendly for nav :)
          var has_data = "<a style='color:#5a5a5a;text-decoration:none'>" + 
            this.innerText.replace(/\//g," ").split(" ").map(capitalize).join(" ") + 
            "</a>"

          var no_data = "<div style='height:30px;background-color:#f6f6f6'></div>"

          return x.views ? has_data : no_data
        })

      var missing_data = odata.slice(0,3).filter(function(x){return !x.visits_data})

      if (missing_data.length) {

        var action = missing_data[0];
        action.action_string = action.url_pattern.map(function(x){return x.split(" ").join(",")}).join("|") 
        action.action_string = action.action_string + "&num_days=2"

        crusher.subscribe.add_subscriber(["actionTimeseries"],function(d) { 

          crusher.subscribe.add_subscriber(["tf_idf_action"],function(d) { 

            // make sure were still on the same page otherwise it will break
            var bool = funnelRow.datum().id == d3.select(".container div").datum().id
            if (!d.views && bool) {
              d.views = d.visits_data[0].views
              d.visits = d.visits_data[0].visits
              d.uniques = d.visits_data[0].uniques

              setTimeout(dashboard.widgets,1,funnelRow,odata)
            }

            console.log(d)
          },"get_action_idf",true,true,action)

        },"get_action",true,true,action)


      }

      var ddd = [{"key":"NA","values":1}]

      var category_pie = target.selectAll(".pie")
        .classed("row",function(x){
          x.parentCategoryData = ddd
          if (x.domains) {
            var parentCategoryData = d3.nest()
              .key(function(x){return x.parent_category_name})
              .rollup(function(x){ return x.reduce(function(p,c){return p + c.count},0) })
              .entries(x.domains)
              .sort(function(x,y){return y.values - x.values})
              .filter(function(x){return x.key != "NA"})
              .slice(0,15)   

            x.parentCategoryData = parentCategoryData

          }
          return true
        })
        .style("margin-top","-10px")
        .style("margin-bottom","-20px")
        .style("font-size","11px")


    RB.crusher.ui.action.category_pie(
      category_pie, [], RB.crusher.ui.action.category_colors, "row col-md-12", 
      function(cb,x){ return cb(x) }
    )

    category_pie.selectAll(".table-title")
      //.text("Visitor off-site activity")
      .classed("hidden",true)


    }

    dashboard.current = function(funnelRow,data) {
      var funnelRow = funnelRow
      var odata = data

      var data = data.slice(0,10)
        .map(function(x){
          x.views = x.visits_data ? x.visits_data[0].views : 0
          x.visits = x.visits_data ? x.visits_data[0].visits : 0
          x.uniques = x.visits_data ? x.visits_data[0].uniques : 0
          return x
        }).map(function(x){
          obj = {
            "Action name": x.action_name,
            "views":x.views,
            "visits":x.visits,
            "uniques":x.uniques,
            "__proto__": x
          }
          return obj
        })

      
      
      var title = "Top existing actions",
        description = "These are the keywords that are most popular on your site"

      var target = RB.rho.ui.buildSeriesWrapper(funnelRow, title, "current-actions", data, "col-md-12", description)
      var table = make_table(target,data,["Action name"])

      table.classed("table-condensed table-hover",true)
        .style("font-size","14px")
        .style("margin-top","15px")
      
      var missing_data = odata.slice(0,10).filter(function(x){return !x.visits_data})

      if (missing_data.length) {

        var action = missing_data[0];
        action.action_string = action.url_pattern.map(function(x){return x.split(" ").join(",")}).join("|") 
        action.action_string = action.action_string + "&num_days=2"

        crusher.subscribe.add_subscriber(["actionTimeseries"],function(d) { 

          // make sure were still on the same page otherwise it will break
          var bool = funnelRow.datum().id == d3.select(".container div").datum().id
          if (!d.views && bool) {
            d.views = d.visits_data[0].views
            d.visits = d.visits_data[0].visits
            d.uniques = d.visits_data[0].uniques

            setTimeout(dashboard.current,1,funnelRow,odata)
          }

          console.log(d)
        },"get_action",true,true,action)


      }

      table.select("tbody").selectAll("tr")
        .sort(function(x,y){
          return y.views - x.views
        })
        .style("cursor","pointer")
        .on("click",function(x){
          var action = x.__proto__
          var xx = JSON.parse(JSON.stringify(RB.crusher.controller.states["/crusher/action/existing"]))
          RB.routes.navigation.forward(xx)
          RB.routes.navigation.forward(action)

        })

    }

    dashboard.recommended = function(funnelRow,data) {
      var data = data.slice(0,10).map(function(x){
        obj = {
          "Pattern": x.first_word,
          "views": x.views,
          "create":""
        }
        return obj
      })

      var title = "Recommended actions",
        description = "These are the keywords that are most popular on your site"

      var target = RB.rho.ui.buildSeriesWrapper(funnelRow, title, "actions", data, "col-md-12", description)
      var table = make_table(target,data)

      table.classed("table-condensed table-hover",true)
        .style("font-size","14px")
        .style("margin-top","15px")

      table.selectAll("tbody").selectAll("tr")
        .style("cursor","pointer")
        .on("mouseover",function(){
          d3.select(this).selectAll(".btn").classed("hidden",false)
        })
        .on("mouseout",function(){
          d3.select(this).selectAll(".btn").classed("hidden",true)
        })
        .on("click",function(x){
          obj = {
            action_name: x["Pattern"],
            url_pattern: [x["Pattern"]],
            name: x["Pattern"]
          }
          var xx = RB.crusher.controller.states["/crusher/action/recommended"]
          RB.routes.navigation.forward(xx)
          RB.routes.navigation.forward(obj)
        })
        

      table.selectAll("tr").filter(function(x,i){return i == 0 })
        .selectAll("th").filter(function(x,i){return i == 2 })
        .text("")


      var button_td = table.selectAll("tr").selectAll("td").filter(function(x,i){return i == 2})
        .style("padding-top","3px")
        .style("padding-bottom","2px")
        .style("width","80px")

      d3_updateable(button_td,".btn","div")
        .classed("hidden btn btn-default btn-xs btn-success",true)
        .text("Create")

    }

    return dashboard

})(RB.crusher.ui.action.dashboard || {}, RB.crusher)  
