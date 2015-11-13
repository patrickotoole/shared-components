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

      var target = RB.rho.ui.buildSeriesWrapper(funnelRow, title, "current-actions", data, "col-md-6", description)
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

      var target = RB.rho.ui.buildSeriesWrapper(funnelRow, title, "actions", data, "col-md-6", description)
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
          var xx = JSON.parse(JSON.stringify(RB.crusher.controller.states["/crusher/action/recommended"]))
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
