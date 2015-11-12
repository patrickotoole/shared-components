var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.action = RB.crusher.ui.action || {}


RB.crusher.ui.action.dashboard = (function(dashboard,crusher) {

    dashboard.show = function(funnelRow,data) {

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

    }

    return dashboard

})(RB.crusher.ui.action.dashboard || {}, RB.crusher)  
