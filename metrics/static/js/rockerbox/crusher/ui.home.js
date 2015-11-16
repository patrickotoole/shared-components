var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.home = (function(home, crusher) {

  home.main = function(funnelRow) {
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
  }

  home.status = function(tutDesc,status_data,advertiser_data,actions) {
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
  }

  home.dashboard = function(funnelRow,data) {
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

  }

  return home
})(RB.crusher.ui.home || {}, RB.crusher)  
