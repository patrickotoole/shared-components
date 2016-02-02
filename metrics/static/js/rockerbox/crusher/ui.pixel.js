var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

var crusher = RB.crusher
var pubsub = crusher.pubsub

RB.crusher.ui.pixel = (function(pixel, crusher) {

  pixel.setup = function(funnelRow,status_data,advertiser_data,uid) {
        var heading = d3_updateable(funnelRow,".heading","h5")

        heading.text(advertiser_data.advertiser_name + " Pixel Setup")
          .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
          .classed("heading heading",true)


        var implementPixel = pixelBox = d3_updateable(funnelRow,".pixel-box-wrapper","div")
          .classed("pixel-box-wrapper",true)

        d3_updateable(pixelBox,".pixel-description","div")
          .classed("pixel-description",true)
          .style("margin-top","15px")
          .style("margin-bottom","15px")
          .html("If this is your first time logging in, make sure that you have completed pixel implementation. Below we show the last time your pixel has fired: ")


        var all_pages_segments = advertiser_data.segments.filter(function(x){return x.segment_implemented != "" && x.segment_name.indexOf("All") > -1})
        var class_name = "col-md-12"

        var wrapper = d3_splat(pixelBox,".pixel-wrapper","div",all_pages_segments,function(x){return x.external_segment_id})
          .classed("pixel-wrapper " + class_name,true)

        var outerRow = d3_updateable(wrapper,".pixel-row","div")
          .classed("row pixel-row ct-chart",true)
          .style("padding-bottom","20px")

        var row = d3_updateable(outerRow,".pixel-row-inner","div")
          .classed("pixel-row-inner",true)

        d3_updateable(row,".gear","span")
          .classed("glyphicon glyphicon-cog gear chart-description pull-right",true)
          .style("color","lightgrey")
          .style("font-size","18px")
          .style("width","24px")
          .style("height","24px")
          .style("margin","-5px")

        d3_updateable(row,".name","div")
          .classed("name chart-title",true)
          .text(function(x){return x.segment_name })

        d3_updateable(row,".description","div")
          .classed("description",true)
          .style("text-align","left")
          .style("padding-top","10px")
          .style("padding-bottom","10px")
          .text("Paste the following snippet before the closing </head> tag on each page of your site.")
          //.html(function(x){ return x.segment_description})



        d3_updateable(row,".tag","div")
          .classed("tag well",true)
          .style("white-space","pre")
          .style("text-align","left")
          .text(function(x){return x.segment_implemented })

        var pixel_show_wrapper = d3_updateable(pixelBox,".pixel-show-wrapper","div")
          .style("text-align","center")
          .classed("pixel-show-wrapper",true)

        d3_updateable(pixel_show_wrapper,".pixel-show-more","a")
          .classed("btn btn-sm btn-default pixel-show-more",true)
          .style("margin-top","-15px")
          .style("margin-bottom","15px")
          .html("For a custom conversion integration, click here to see advanced instructions for adding conversion pixel pixelss")
          .on("click",function(x){
            implementPixel.select(".advanced-pixels").classed("hidden",false)
            pixel_show_wrapper.classed("hidden",true)
          })

        var active_segments = advertiser_data.segments.filter(function(x){return x.segment_implemented != "" && x.segment_name.indexOf("All") == -1})

        var advanced = d3_updateable(pixelBox,".advanced-pixels","div")
          .classed("row advanced-pixels hidden",true)

        var wrapper = d3_splat(advanced,".pixel-wrapper","div",active_segments,function(x){return x.external_segment_id})
          .classed("pixel-wrapper " + class_name,true)


        var outerRow = d3_updateable(wrapper,".pixel-row","div")
          .classed("row pixel-row ct-chart",true)
          .style("padding-bottom","20px")

        var row = d3_updateable(outerRow,".pixel-row-inner","div")
          .classed("pixel-row-inner",true)

        d3_updateable(row,".gear","span")
          .classed("glyphicon glyphicon-cog gear chart-description pull-right",true)
          .style("color","lightgrey")
          .style("font-size","18px")
          .style("width","24px")
          .style("height","24px")
          .style("margin","-5px")

        d3_updateable(row,".name","div")
          .classed("name chart-title",true)
          .text(function(x){return x.segment_name })

        d3_updateable(row,".description","div")
          .classed("description",true)
          .style("text-align","left")
          .style("padding-top","10px")
          .style("padding-bottom","10px")
          .html(function(x){ return x.segment_description})

        d3_updateable(row,".tag","div")
          .classed("tag well",true)
          .style("white-space","pre")
          .style("text-align","left")
          .text(function(x){return x.segment_implemented })


        var heading = d3_updateable(funnelRow,".pixel-heading","h5")

        heading.text(advertiser_data.advertiser_name + " Pixel Status")
          .attr("style","margin-top:45px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
          .classed("pixel-heading heading ",true)

        var pixelBox = d3_updateable(funnelRow,".pixel-box","div")
          .classed("pixel-box",true)

        d3_updateable(pixelBox,".pixel-description","div")
          .classed("pixel-description",true)
          .style("margin-top","15px")
          .style("margin-bottom","15px")

          .html("If this is your first time logging in, make sure that you have completed pixel implementation. Below we show the last time your pixel has fired: ")

        var statusByID = d3.nest()
          .key(function(x){return x.segment_id})
          .map(status_data)

        var active_segments = advertiser_data.segments.filter(function(x){return x.segment_implemented != ""})

        active_segments = active_segments.map(function(seg){
          var status = statusByID[seg.external_segment_id]
          seg.status = (status && status.length) ? status[0] : {}
          return seg
        }).sort(function(p,c){
          return (p.status.last_fired_seconds || 1000000) - (c.status.last_fired_seconds || 1000000)
        })

        var class_name = (active_segments.length > 2) ? "col-md-4" : "col-md-" + (12/active_segments.length) ;

        var wrapper = d3_splat(pixelBox,".pixel-wrapper","div",active_segments,function(x){return x.external_segment_id})
          .classed("pixel-wrapper " + class_name,true)

        var outerRow = d3_updateable(wrapper,".pixel-row","div")
          .classed("row pixel-row ct-chart",true)
          .style("padding-bottom","20px")

        var row = d3_updateable(outerRow,".pixel-row-inner","div")
          .classed("pixel-row-inner",true)

        d3_updateable(row,".time-ago-icon","span")
          .classed("glyphicon time-ago-icon chart-description pull-right",true)
          .classed("glyphicon-warning-sign",function(x){return x.status.last_fired_pretty === undefined })
          .classed("glyphicon-ok-circle",function(x){return x.status.last_fired_pretty !== undefined })
          .style("color",function(x){return (x.status.last_fired_pretty === undefined) ? "red" : "green" })
          .style("font-size","24px")
          .style("width","36px")
          .style("height","36px")
          .style("margin","-14px")
          .style("margin-top","-8px")




        d3_updateable(row,".name","div")
          .classed("name chart-title",true)
          .text(function(x){return x.segment_name })

        d3_updateable(row,".time-ago","div")
          .classed("time-ago chart-description",true)
          .text(function(x){return "Last fired: " + x.status.last_fired_pretty })

        d3_updateable(row,".gear","span")
          .classed("glyphicon glyphicon-cog gear chart-description pull-right",true)
          .style("color","lightgrey")
          .style("font-size","18px")
          .style("width","24px")
          .style("height","24px")
          .style("margin","-5px")
          .style("margin-top","5px")
          .on("click",function(x){
            x.uuid = uid
            var self = this
            pubsub.subscriber("specific_pixel",["segment_pixel_status"])
              .run(function(resp) {

                var current = wrapper.filter(function(y) {return x == y })
                current
                  .classed(class_name,false)
                  .classed("col-md-12",true)

                current.select(".pixel-row-inner").classed("col-md-4",true)
                  .style("padding-right","45px")
                  .style("padding-left","0px")

                var rightRow = d3_updateable(current.select(".pixel-row") ,".pixel-data","div")
                  .classed("pixel-data col-md-8 pull-right",true)
                  .style("white-space","pre")
                  .style("text-align","left")
                  .style("overflow","scroll")

                d3_updateable(rightRow,".chart-title","div")
                  .classed("name chart-title",true)
                  .text("Your users recent activity")

                d3_updateable(rightRow,".chart-total","div")
                  .classed("chart-total",true)
                  .text(resp.length + " events")

                d3_updateable(rightRow,".details","code")
                  .classed("details code",true)
                  .style("white-space","pre")
                  .text(JSON.stringify(resp.map(function(z){ return JSON.parse(z.json_body)}),null,2))
              })
            .data(x)
            .unpersist(false)
            .trigger()
          })



        d3_updateable(row,".segment-id","div")
          .classed("segment-id chart-description",true)
          .text(function(x){return "(" + x.external_segment_id + ")"})

  }

  return pixel
})(RB.crusher.ui.pixel || {}, RB.crusher)
