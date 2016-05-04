var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.settings = (function(settings,crusher) {

  settings.advertiser = function(funnelRow) {
      d3_updateable(funnelRow,".pixel-description","div")
        .classed("pixel-description",true)
        .style("margin-top","15px")
        .style("margin-bottom","15px")
        .html("Shown below are settings specific to your advertiser")

      var mainWrapper = d3_updateable(funnelRow,".advertiser-overview","div")
        .classed("advertiser-overview col-md-12",true)

      var row = d3_updateable(mainWrapper,".account-row","div")
        .classed("row account-row ct-chart",true)
        .style("padding-bottom","20px")

      d3_updateable(row,".name","div")
        .classed("name chart-title",true)
        .text("Advertiser Permissions")

      var desc = d3_updateable(row,".description","div")
        .classed("description chart-description",true)

      d3_updateable(desc,".segments","div")
        .style("margin-top","10px")
        .classed("segments",true)
        .text("All features enabled")

  }

  

  settings.subscription_old = function(funnelRow) {

      d3_updateable(funnelRow,".pixel-description","div")
        .classed("pixel-description",true)
        .style("margin-top","15px")
        .style("margin-bottom","15px")
        .html("Shown below is your current subscription plan")

      d3_updateable(funnelRow,".pixel-description","div")
        .classed("pixel-description",true)
        .style("margin-top","15px")
        .style("margin-bottom","15px")
        .html("Shown below is your current subscription plan")

      var mainWrapper = d3_updateable(funnelRow,".subscription-overview","div")
        .classed("subscription-overview col-md-12",true)

      var row = d3_updateable(mainWrapper,".account-row","div")
        .classed("row account-row ct-chart",true)
        .style("padding-bottom","20px")

      d3_updateable(row,".name","div")
        .classed("name chart-title",true)
        .text("Subscription Plan")

      var desc = d3_updateable(row,".description","div")
        .classed("description chart-description",true)

      d3_updateable(desc,".segments","div")
        .style("margin-top","10px")
        .classed("segments",true)
        .text("Type: Pilot Partner")
  }

  settings.main = function(funnelRow,advertiser_data,action_data,funnel_data) {

        var mainWrapper = d3_updateable(funnelRow,".advertiser-overview","div")
          .classed("advertiser-overview col-md-4",true)
          .datum(advertiser_data)

        var row = d3_updateable(mainWrapper,".account-row","div")
          .classed("row account-row ct-chart",true)
          .style("padding-bottom","20px")

        d3_updateable(row,".name","div")
          .classed("name chart-title",true)
          .text("Advertiser Summary")

        var desc = d3_updateable(row,".description","div")
          .classed("description chart-description",true)

        d3_updateable(desc,".status","div")
          .style("margin-top","10px")
          .classed("status",true)
          .text(function(x){ return "Status: " + (x.active ? "Active" : "Inactive" )})

        d3_updateable(desc,".name","div")
          .classed("name",true)
          .text(function(x){ return "Source name: " + x.pixel_source_name })


        d3_updateable(desc,".actions","div")
          .style("margin-top","10px")
          .classed("actions",true)
          .text(function(x){ return "Actions: " + crusher.cache.actionData.length })

        d3_updateable(desc,".funnels","div")
          .classed("funnels",true)
          .text(function(x){ return "Funnels: " + crusher.cache.funnelData.length })





        var mainWrapper = d3_updateable(funnelRow,".pixel-overview","div")
          .classed("pixel-overview col-md-4",true)
          .datum(advertiser_data)

        var row = d3_updateable(mainWrapper,".account-row","div")
          .classed("row account-row ct-chart",true)
          .style("padding-bottom","20px")

        d3_updateable(row,".name","div")
          .classed("name chart-title",true)
          .text("Pixel Summary")

        var desc = d3_updateable(row,".description","div")
          .classed("description chart-description",true)

        d3_updateable(desc,".segments","div")
          .style("margin-top","10px")
          .classed("segments",true)
          .text(function(x){ return "Segment pixels: " + x.segments.length})

        d3_updateable(desc,".implemented","div")
          .classed("implemented",true)
          .text(function(x){ return "Implemented pixels: " + x.segments.filter(function(x){return x.segment_implemented}).length})


        var mainWrapper = d3_updateable(funnelRow,".subscription-overview","div")
          .classed("subscription-overview col-md-4",true)
          .datum(advertiser_data)

        var row = d3_updateable(mainWrapper,".account-row","div")
          .classed("row account-row ct-chart",true)
          .style("padding-bottom","20px")

        d3_updateable(row,".name","div")
          .classed("name chart-title",true)
          .text("Subscription Plan")

        var desc = d3_updateable(row,".description","div")
          .classed("description chart-description",true)

        d3_updateable(desc,".segments","div")
          .style("margin-top","10px")
          .classed("segments",true)
          .text("Type: Beta Partner")





  }


  return settings
})(RB.crusher.ui.settings || {}, RB.crusher)  
