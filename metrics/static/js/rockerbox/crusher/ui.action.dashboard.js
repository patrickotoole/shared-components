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
      var odata = data

      var data = data.slice(0,10)
        .map(function(x){
          x.views = 0
          x.visits = 0
          x.uniques = 0
          return x
        }).map(function(x){
          obj = {
            "Action name": x.action_name,
            "views":x.views,
            "visits":x.visits,
            "uniques":x.uniques
          }
          return obj
        })

      var action = odata[0];
      action.action_string = action.url_pattern.map(function(x){return x.split(" ").join(",")}).join("|")


      crusher.subscribe.add_subscriber(["actionTimeseries"],function(data) { 
        debugger
        console.log(data)
      },"get_action")

      crusher.subscribe.publishers["actionTimeseries"](action)

      var title = "Top existing actions",
        description = "These are the keywords that are most popular on your site"

      var target = RB.rho.ui.buildSeriesWrapper(funnelRow, title, "current-actions", data, "col-md-6", description)
      var table = make_table(target,data)

      table.classed("table-condensed table-hover",true)
        .style("font-size","14px")
        .style("margin-top","15px")


    }

    dashboard.recommended = function(funnelRow,data) {
      var data = data.slice(0,10).map(function(x){
        x.create = ""
        return x
      })

      var title = "Recommended actions",
        description = "These are the keywords that are most popular on your site"

      var target = RB.rho.ui.buildSeriesWrapper(funnelRow, title, "actions", data, "col-md-6", description)
      var table = make_table(target,data)

      table.classed("table-condensed table-hover",true)
        .style("font-size","14px")
        .style("margin-top","15px")

      var button_td = table.selectAll("tr").selectAll("td").filter(function(x,i){return i == 2})
        .style("padding-top","3px")
        .style("padding-bottom","2px")

      d3_updateable(button_td,".btn","div")
        .classed("btn btn-default btn-xs btn-success",true)
        .text("Create")

    }

    return dashboard

})(RB.crusher.ui.action.dashboard || {}, RB.crusher)  
