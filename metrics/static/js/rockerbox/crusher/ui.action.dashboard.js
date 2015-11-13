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
            "uniques":x.uniques
          }
          return obj
        })

      var missing_data = odata.slice(0,10).filter(function(x){return !x.visits_data})
      var action = missing_data[0];
      action.action_string = action.url_pattern.map(function(x){return x.split(" ").join(",")}).join("|") + "&num_days=2"


      
      var title = "Top existing actions",
        description = "These are the keywords that are most popular on your site"

      var target = RB.rho.ui.buildSeriesWrapper(funnelRow, title, "current-actions", data, "col-md-6", description)
      var table = make_table(target,data,["Action name"])

      table.classed("table-condensed table-hover",true)
        .style("font-size","14px")
        .style("margin-top","15px")

      crusher.subscribe.add_subscriber(["actionTimeseries"],function(d) { 
        var bool = funnelRow.datum().id == d3.select(".container div").datum().id
        if (!d.views && bool) {
          d.views = d.visits_data[0].views
          d.visits = d.visits_data[0].visits
          d.uniques = d.visits_data[0].uniques

          // should make sure were still on the right page...
          setTimeout(dashboard.current,1,funnelRow,odata)
        }

        console.log(d)
      },"get_action",true,true,action)

      table.select("tbody").selectAll("tr")
        .sort(function(x,y){
          return y.views - x.views
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

      var button_td = table.selectAll("tr").selectAll("td").filter(function(x,i){return i == 2})
        .style("padding-top","3px")
        .style("padding-bottom","2px")

      d3_updateable(button_td,".btn","div")
        .classed("btn btn-default btn-xs btn-success",true)
        .text("Create")

    }

    return dashboard

})(RB.crusher.ui.action.dashboard || {}, RB.crusher)  
