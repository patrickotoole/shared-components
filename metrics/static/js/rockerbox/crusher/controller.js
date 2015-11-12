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
    "settings/advertiser": function() {
      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"advertiser"}],function(x){return x.id})
        .classed("row funnels",true)

      funnelRow.exit().remove()

      var heading = d3_updateable(funnelRow,".heading","h5")

      heading.text("Manage Advertiser")
        .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("heading heading",true)

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


      crusher.subscribe.add_subscriber(["advertiser","actions", "funnels"], function(advertiser_data,action_data,funnel_data){

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






      },"overview",true,false)



    },
    "settings/pixel/setup": function() {
      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"setup"}],function(x){return x.id})
        .classed("row funnels",true)

      funnelRow.exit().remove()

     // crusher.subscribe.add_subscriber(["advertiser","an_uid"], function(advertiser_data,uid){
      crusher.subscribe.add_subscriber(["pixel_status","advertiser","an_uid"], function(status_data,advertiser_data,uid){

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
          .html("For a custom conversion integration, click here to see advanced instructions for adding conversion pixels")
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


        
    /*

      },"setup",true,true)


    
    },
    "settings/pixel/status": function() {
      var target = d3.selectAll(".container")

      var funnelRow = d3_splat(target,".row","div",[{"id":"home"}],function(x){return x.id})
        .classed("row funnels",true)

      funnelRow.exit().remove()

    */
      

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
            crusher.subscribe.add_subscriber(["segment_pixel_status"], function(resp){
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


            },"specific_pixel",true,false,x)

          })



        d3_updateable(row,".segment-id","div")
          .classed("segment-id chart-description",true)
          .text(function(x){return "(" + x.external_segment_id + ")"})


                  
      },"settings",true,true)

    },
    "gettingstarted": function() {
      d3.select("body").classed("hide-select",true)

      var target = d3.selectAll(".container")

      var row = d3_splat(target,".row","div",[{"id":"gettingstarted"}],function(x){return x.id})
        .classed("row funnels",true)

      row.exit().remove()

      /* Header */
      var heading = d3_updateable(row,".welcome-heading","h5")

      heading.text("Welcome to Crusher, let's first set-up some things")
        .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-15px")
        .classed("welcome-heading heading", true)


      /* Progress Indicator */
      var progress_indicatorWrap = d3_updateable(row,".progress-indicator","section")
        .classed('progress-indicator', true)
        .style("width", "800px")
        .style("position", "relative")
        .style("margin", "0 auto")
        .style("margin-top", "80px")
        .style("margin-bottom", "40px")

      var hr = d3_updateable(progress_indicatorWrap,".progress-indicator-hr","hr")
        .style("margin", "0")
        .style("border-top", "solid 2px #CCC")
        .style("width", "66.66%")
        .style("margin-left", "16.66%")

      var progress_indicator = d3_updateable(progress_indicatorWrap,".progress-indicator","ol")
        .style("margin", "0")
        .style("padding", "0")


      /* Progress Steps */
      var progress_indicator_steps = [
        d3_updateable(progress_indicator,".progress-indicator-step1","li")
          .html("<span>Pixel Implementation</span>")
          .style("display", "inline-block")
          .style("width", "33.33333%")
          .style("text-align", "center")
          .style("padding-top", "10px")
          .style("color", "#777")
          .style("text-transform", "uppercase")
          .style("font-size", "10px")
          .style("color", "#AAA")
          .style("font-weight", "bold"),

        d3_updateable(progress_indicator,".progress-indicator-step2","li")
          .html("<span>Create Action</span>")
          .style("display", "inline-block")
          .style("width", "33.33333%")
          .style("text-align", "center")
          .style("padding-top", "10px")
          .style("color", "#777")
          .style("text-transform", "uppercase")
          .style("font-size", "10px")
          .style("color", "#AAA")
          .style("font-weight", "bold"),

        d3_updateable(progress_indicator,".progress-indicator-step3","li")
          .html("<span>Finish</span>")
          .style("display", "inline-block")
          .style("width", "33.33333%")
          .style("text-align", "center")
          .style("padding-top", "10px")
          .style("color", "#777")
          .style("text-transform", "uppercase")
          .style("font-size", "10px")
          .style("color", "#AAA")
          .style("font-weight", "bold")
      ];


      /* Progress Steps Bullets */
      var progress_indicator_bullets = [
        d3_updateable(progress_indicator_steps[0],".progress-indicator-bullet","div")
          .style("border", "solid 2px #CCC")
          .style("border-radius", "50%")
          .style("width", "10px")
          .style("height", "10px")
          .style("position", "absolute")
          .style("top", "-4px")
          .style("left", "calc(16.66% - 4px)")
          .style("background-color", "#CCC"),

        d3_updateable(progress_indicator_steps[1],".progress-indicator-bullet","div")
          .style("border", "solid 2px #CCC")
          .style("border-radius", "50%")
          .style("width", "10px")
          .style("height", "10px")
          .style("position", "absolute")
          .style("top", "-4px")
          .style("left", "calc(50% - 4px)")
          .style("background-color", "#f8f8f8"),

        d3_updateable(progress_indicator_steps[2],".progress-indicator-bullet","div")
          .style("border", "solid 2px #CCC")
          .style("border-radius", "50%")
          .style("width", "10px")
          .style("height", "10px")
          .style("position", "absolute")
          .style("top", "-4px")
          .style("right", "calc(16.66% - 4px)")
          .style("background-color", "#f8f8f8")
      ];


      /* Onboarding Steps Wrappers */
      var onboarding_steps_wrappers = [
        d3_updateable(row, ".onboarding-step1", "div")
          .classed("ct-chart col-md-6", true)
          .style("transform", "translate(-50%)")
          .style("left", "50%"),

        d3_updateable(row, ".onboarding-step2", "div")
          .classed("ct-chart col-md-6", true)
          .style("transform", "translate(-50%)")
          .style("left", "50%")
          .style("display", "none"),

        d3_updateable(row, ".onboarding-step3", "div")
          .classed("ct-chart col-md-3", true)
          .style("transform", "translate(-50%)")
          .style("left", "50%")
          .style("display", "none")
      ];

      /* Onboarding Step 1 */
      d3_updateable(onboarding_steps_wrappers[0], ".onboarding-step", "")
          .classed("chart-title", true)
          .style("padding-bottom", "15px")
          .html("Implement the RockerBox pixel on your website")

      var onboarding_step1 = d3_updateable(onboarding_steps_wrappers[0], ".onboarding-step", "div")
        .classed("chart-description pixel-code", true)
        .style("padding-bottom", "15px")
        .html(
          "<div id=\"all-pages-pixel-code\"><p>Paste the following snippet before the closing &lt;head&gt;-tag on every page.</p>" +
          "<pre class=\"language-markup\"><code class=\"language-markup\" style=\"overflow-x: scroll;\">"+
          "Loading..." +
          "</code></pre></div>" +
          "<div><span>Website URL:</span> <input type=\"text\" value=\"http://\" style=\"border: solid 1px #EEE; outline:none; padding: 5px; width: 300px;\"/></div><hr/>" +
          "<div><input type=\"checkbox\"/> Also set a conversion pixel</div>" +

          "<div id=\"conversion-pixel-code\" style=\"padding-top:10px;margin-top:10px; display:none;\"><p>Paste the following snippet before the closing &lt;head&gt;-tag on just the conversion page.</p>" +
          "<pre class=\"language-markup\"><code class=\"language-markup\" style=\"overflow-x: scroll;\">"+
          "Loading..." +
          "</code></pre><p>In order to validate the conversion pixel and continue to the next step, you have to place an order.</p></div>" +
          "<iframe style=\"border: none; height: 1px; width: 0px;\"></iframe>"
        )

        crusher.subscribe.add_subscriber(["advertiser"], function(advertiser_data){
          var all_pages_segments = advertiser_data.segments.filter(function(x){return x.segment_implemented != "" && x.segment_name.indexOf("All") > -1})
          var all_pages_segments_code = all_pages_segments[0].segment_implemented
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          var conversion_segments = advertiser_data.segments.filter(function(x){return x.segment_implemented != "" && x.segment_name.indexOf("Conversion") > -1})
          var conversion_segments_code = conversion_segments[0].segment_implemented
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          $("#all-pages-pixel-code code").html(all_pages_segments_code);
          $("#conversion-pixel-code code").html(conversion_segments_code);
          Prism.highlightAll();
        }, 'pixel-code-fetching', true, true);

        var onboarding_step1_check = d3_updateable(onboarding_step1,".about-check","a")
          .classed("btn btn-default btn-sm",true)
          .style("margin-right", "30px")
          .style("margin-top", "10px")
          .html("Continue to creating action")
          .on("click",function(x) {
            onboarding_step1_check.html("Validating...");

            // Checks existence of different pixels
            var pixel_count = {
              allpages: 0,
              conversion: 0
            }

            $('.pixel-code iframe').attr('src', $('.pixel-code input[type="text"]').val());
            $('.pixel-code iframe').on('load', function(e) {
              crusher.subscribe.add_subscriber(["pixel_status"], function(status_data) {
                status_data.forEach(function(pixel) {
                  // Check which pixels are active
                  if(pixel.segment_name.indexOf("All Pages") >=0 ) {
                    pixel_count.allpages++;
                  } else if(pixel.segment_name.indexOf("Conversion") >=0 ) {
                    pixel_count.conversion++;
                  }
                });

                var validated = true;
                if( $(".pixel-code input[type='checkbox']").is(':checked') ) {
                  if(!pixel_count.conversion) {
                    validated = false;
                  }
                }

                if(!pixel_count.allpages) {
                  validated = false;
                }

                if(validated) {
                  progress_indicator_bullets[1].style("background-color", "#CCC");
                  onboarding_steps_wrappers[0].style("display", "none");
                  onboarding_steps_wrappers[1].style("display", "block");
                } else {
                  onboarding_step1_check.html("Continue to creating action")
                  alert('Pixel has not been implemented yet');
                }
              },"gettingstarted",true,false)
            });
          });


        /* Onboarding Step 2 */
        d3_updateable(onboarding_steps_wrappers[1], ".onboarding-step", "")
          .classed("chart-title", true)
          .style("padding-bottom", "15px")
          .html("Create your first action")

        var onboarding_step2 = d3_updateable(onboarding_steps_wrappers[1], ".onboarding-step", "div")
          .classed("chart-description", true)
          .style("padding-bottom", "15px")
          .html(
            "<p>Some description will be shown right here.</p>"  +
            "<input class=\"bloodhound typeahead form-control tt-input first-action\" autocomplete=\"off\" spellcheck=\"false\" dir=\"auto\" style=\"position: relative; vertical-align: top; background-color: transparent;\" value=\"all pages\">"
          )

        $(".pixel-code input[type='checkbox']").on('change', function(e) {
          if($(this).is(':checked')) {
            $('div#conversion-pixel-code').fadeIn(100);
          } else {
            $('div#conversion-pixel-code').fadeOut(100);
          }
        });

        d3_updateable(onboarding_step2,".about-check","a")
          .classed("btn btn-default btn-sm",true)
          .style("margin-right", "30px")
          .style("margin-top", "10px")
          .html("Continue")
          .on("click",function(x) {
            var first_action = $('input.first-action').val();

            var data = {
              'action_id': undefined,
              'action_name': first_action,
              'action_string': first_action,
              'domains': undefined,
              'name': first_action,
              'operator': "or",
              'param_list': [],
              'rows': [{
                'url_pattern': first_action,
                'values': undefined
              }],
              'url_pattern': [
                first_action
              ],
              'urls': undefined,
              'values': undefined,
              'visits_data': []
            }

            RB.crusher.controller.action.save(data, false);

            progress_indicator_bullets[2].style("background-color", "#CCC");
            onboarding_steps_wrappers[1].style("display", "none");
            onboarding_steps_wrappers[2].style("display", "block");
          },"gettingstarted",true,false)


        /* Onboarding Step 3 */
        d3_updateable(onboarding_steps_wrappers[2], ".onboarding-step", "")
          .classed("chart-title", true)
          .style("padding-bottom", "15px")
          .html("Congratulations, you're ready to use RockerBox!")

        var onboarding_step3 = d3_updateable(onboarding_steps_wrappers[2], ".onboarding-step", "div")
          .classed("chart-description onboarding-step3", true)
          .style("padding-bottom", "15px")
          .html(
            "<p>You can now create your next action, or your first funnel.</p>"  +
            "<ol style=\"padding:0; margin-top: 20px;\">" +
              "<li class=\"create-action\" style=\"display: inline-block; text-align: center; width:50%; cursor: pointer;\">" +
                "<span class=\"icon glyphicon glyphicon-signal\" style=\"font-size: 32px;\"></span>" +
                "<span style=\"display: block; margin-top: 10px;\">Create Action</span>" +
              "</li>" +
              "<li class=\"create-funnel\" style=\"display: inline-block; text-align: center; width:50%; cursor: pointer;\">" +
                "<span class=\"icon glyphicon glyphicon-filter\" style=\"font-size: 32px;\"></span>" +
                "<span style=\"display: block; margin-top: 10px;\">Create Funnel</span>" +
              "</li>" +
            "<ol>"
          )

        $('li.create-action').on('click', function(e) {
          RB.routes.navigation.forward(controller.states["/crusher/action/new"])
        });

        $('li.create-funnel').on('click', function(e) {
          RB.routes.navigation.forward(controller.states["/crusher/funnel/new"])
        });

    },
    "home": function(){
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
          "<br><br>We built crusher because we believe that understanding what you audience does when they are not on your site is the is the best way to craft relevant, meaningful advertisements." +
          "<a href=\"/crusher/gettingstarted\">Go to onboarding</a>"
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

          // Pixel implementation
          var pixel_implementation = d3_updateable(funnelRow,".row","div")

          pixel_implementation.attr("style","padding-bottom:15px;padding-top:5px")
            .classed("row",true)

          var descriptionWrap = d3_updateable(pixel_implementation,".crusher-pixelcode","div")
            .classed("crusher-pixelcode col-md-12",true)

          var description = d3_updateable(descriptionWrap,".ct-chart","div")
            .classed("ct-chart",true)
            .style("padding-bottom","15px")

          d3_updateable(description,".about-heading","")
            .classed("about-heading chart-title",true)
            .text("Implement the Rockerbox pixel on your website")
          d3_updateable(description,".about-description","div")
            .classed("about-description chart-description",true)
            .html(
              "<p>Paste the following snippet before the closing &lt;/head&gt; tag on each page of your site.</p>" +
              "<pre class=\"language-markup\"><code class=\"language-markup\" style=\"overflow-x: scroll;\">"+
              "&lt;!-- Journelle All Pages Segment Pixel --&gt;<br/>" +
              "&lt;script src=\"https://getrockerbox.com/pixel?source=journelle&type=imp&an_seg=1358830\" type=\"text/javascript\">&lt;/script><br/>" +
              "&lt;!-- End of Segment Pixel --&gt;" +
              "</code></pre>")

            d3_updateable(description,".about-check","a")
              .classed("btn btn-default btn-sm",true)
              .style("margin-right", "30px")
              .style("margin-top", "10px")
              .html("Check")
              .on("click",function(x) {
                $("iframe#pixel-check-frame").attr("src", "http://nu.nl");
                $("iframe#pixel-check-frame").on("load", function(e) {
                  if(status_data.filter(function(x){return x.last_fired_seconds != undefined}).length) {
                    alert('Pixel has been succesfully implemented');
                  } else {
                    alert('Pixel has NOT been implemented yet');
                  }
                });
              });
        },"home",true,false)
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

 
      crusher.ui.action.buildBase()

      crusher.subscribe.publishers["actions"]()
      crusher.subscribe.publishers["action_all"](action)
       
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
      "push_state": "/crusher/action",
      "class": "glyphicon glyphicon-signal"
    },{
      "name":"Funnels",
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
