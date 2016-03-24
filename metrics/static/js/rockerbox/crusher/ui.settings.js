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

  settings.subscription = function(funnelRow) {

    d3.select("body").classed("hide-select hide-top dark",true)

    var node = d3.select(funnelRow.node().parentNode)

    var section = d3_updateable(funnelRow,".section-dark-top","div")
      .classed("section-dark-top",true)
      .style("height","330px")
      .style("margin-left","-15px")
      .style("margin-right","-15px")
      .style("margin-top","-30px")

    d3_updateable(section,".top-space","section")
      .classed("top-space",true)
      .style("height","20px") // IF WE WANT THIS IN THE FUTURE
      //.style("box-shadow", "0 1px rgba(255,255,255,0.08),0 -1px rgba(0,0,0,0.55) inset")

    d3_updateable(section,".top-text","div")
      .classed("top-text",true)
      .text("Pricing Plans")

    d3_updateable(section,".top-subtext","div")
      .classed("top-subtext",true)
      .html("Start integrating and developing with Rockerbox for free. <br> Upgrade when you're ready to engage and grow your audience.")

    var section_bottom = d3_updateable(funnelRow,".section-bottom","div")
      .classed("row section-bottom",true)

    var table = d3_updateable(section_bottom,".pricingtable.first","div")
      .classed("pricingtable first",true)

    var row = d3_updateable(table,".pricingtable_row","div")
      .classed("pricingtable_row row",true)

    var data = [
        {
            title: "Startup"
          , html: "<strong>Low-traffic</strong><br>Get started integrating<br>without breaking the bank."
          , price: "Free"
          , button: "Get Started"
          , href: "#"
          , features: [
              {
                  "name":"Up to 1000 profiles/month"
                , "active":true 
                , "bold":true 
              }
            , {
                  "name":"Unlimited segment creation"
                , "active":true 
              }
            , {
                  "name":"Audience Overview"
                , "active":true 
              }
            , {
                  "name":"Before and After"
                , "active":false 
              }
            , {
                  "name":"Audience Cohorts"
                , "active":false 
              }
            , {
                  "name":"On-site to off-site Timing"
                , "active":false 
              }
            , {
                  "name":"Audience Articles"
                , "active":false 
              }
            , {
                  "name":"Audience Keywords"
                , "active":false 
              }
            , {
                  "name":"Audience Summaries"
                , "active":false 
              }
            , {
                  "name":"Standard support"
                , "active":true 
                , "bold":true 

              }
          ]
        }
      , {
            title: "Business"
          , html: "<strong>Expand your audience</strong><br>Unlock unique insights to<br>produce content that engages<br>your audience."
          , price: "$499"
          , button: "Get Started"
          , href: "#"
          , features: [
              {
                  "name":"Up to 1000 profiles/month"
                , "active":true 
                , "bold":true 

              }
            , {
                  "name":"$2 per 100 profiles after 25k"
                , "active":true 
              }
            , {
                  "name":"Unlimited segment creation"
                , "active":true 
              }
            , {
                  "name":"Audience Overview"
                , "active":true 
              }
            , {
                  "name":"Before and After"
                , "active":true 
              }
            , {
                  "name":"Audience Cohorts"
                , "active":true 
              }
            , {
                  "name":"On-site to off-site Timing"
                , "active":true 
              }
            , {
                  "name":"Audience Articles"
                , "active":true 
              }
            , {
                  "name":"Audience Keywords"
                , "active":true 
              }
            , {
                  "name":"Audience Summaries"
                , "active":false 
              }
            , {
                  "name":"Custom integrations"
                , "active":false 
              }
            , {
                  "name":"Custom reporting"
                , "active":false 
              }
            , {
                  "name":"Standard support"
                , "active":true 
                , "bold":true 

              }
          ]
        }
      , {
            title: "Enterprise"
          , html: "<strong>Unlimited profiles</strong><br>For growing businesses with<br>custom needs. Get in touch."
          , price: "Get a quote"
          , button: "Contact sales"
          , href: "#"
          , features: [
              {
                  "name":"Unlimited profiles & segments"
                , "active":true 
              }
            , {
                  "name":"Audience Overview"
                , "active":true 
              }
            , {
                  "name":"Before and After"
                , "active":true 
              }
            , {
                  "name":"Audience Cohorts"
                , "active":true 
              }
            , {
                  "name":"On-site to off-site Timing"
                , "active":true 
              }
            , {
                  "name":"Audience Articles"
                , "active":true 
              }
            , {
                  "name":"Audience Keywords"
                , "active":true 
              }
            , {
                  "name":"Audience Summaries"
                , "active":true 
              }
            , {
                  "name":"Implementation consultant"
                , "active":true 
              }
            , {
                  "name":"Custom DMP integrations"
                , "active":true 
              }
            , {
                  "name":"Custom CRM integrations"
                , "active":true 
              }
            , {
                  "name":"Custom feature development"
                , "active":true 
              }
            , {
                  "name":"Standard support"
                , "active":true 
                , "bold":true 

              }
          ]
        }
    ]

    var columns = d3_splat(row,".pricingtable_column","div",data,function(x,i){return x.title })
      .classed("col-md-4 pricingtable_column",true)
 
    var center = columns.filter(function(x,i){return i == 1})
      .classed("pricingtable_column-center",true)

    d3_updateable(center,".pricing_ribbon_pre","div")
      .classed("pricingtable_ribbon_pre",true)
      .attr("style","opacity: 1; transform: rotateX(0deg) rotateY(0deg) rotateZ(40deg); transition: opacity 700ms, transform 700ms;")
      .html("BETA")
    


    d3_updateable(center,".pricing_ribbon","div")
      .classed("pricingtable_ribbon",true)
      .attr("style","opacity: 1; transform: translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(40deg); transition: opacity 500ms, transform 700ms")
      .html("<div>Limited Space</div>")
    
    d3_updateable(columns,".pricingtable_title","h2")
      .classed("pricingtable_title",true)
      .text(function(x){return x.title})

    d3_updateable(columns,".pricingtable_text","p")
      .classed("pricingtable_text",true)
      .html(function(x){return x.html})

    d3_updateable(center,".teaser","p")
      .classed("pricingtable_trialtext teaser",true)
      .text("starting at")

    d3_updateable(columns,".pricingtable_price","div")
      .classed("pricingtable_price",true)
      .html(function(x){return x.price})

    d3_updateable(columns,".pricingtable_trialtext.original","div")
      .classed("pricingtable_trialtext original",true)
      .html("&nbsp;")

    center.selectAll(".pricingtable_price")
      .classed("pricingtable_price-bold",true)

    center.selectAll(".pricingtable_trialtext.original")
      .classed("pricingtable_trialtext",true)
      .text("per month")




    d3_updateable(columns,".button","a")
      .classed("w-button button button-blue pricingtable_button",true)
      .attr("href","#")
      .text(function(x){return x.button})



    d3_updateable(columns,".button","a")
      .classed("w-button button button-blue pricingtable_button",true)
      .attr("href","#")
      .text(function(x){return x.button})
      .on("click",function(x){
        console.log(x)
        return x
      })

    var details_table = d3_updateable(section_bottom,".pricingtable.details","div")
      .classed("pricingtable details",true)



    var features = d3_updateable(details_table,".pricingfeatures_row","div")
      .classed("pricingfeatures_row row",true)

    var columns = d3_splat(features,".pricingfeatures_column","div",data,function(x,i){return x.title })
      .classed("col-md-4 pricingfeatures_column",true)
 
    var lists = d3_updateable(columns,".pricingfeatures_list","ul")
      .classed("pricingfeatures_list",true)

    var li = d3_splat(lists,".pricingfeatures_item","li",function(x){return x.features},function(x){return x.name})
      .classed("pricingfeatures_item",true)

    var check = d3_updateable(li.filter(function(x){return x.active}),".pricingfeatures_checkmark","img")
      .classed("pricingfeatures_checkmark",true)
      .attr("src","https://daks2k3a4ib2z.cloudfront.net/55b166a378d4b45545b92c1f/56b8a67406817e9a2bbb7a60_pricingfeatures_checkmark_icon_blue.svg")

    var text = d3_updateable(li,".pricingfeatures_text","div")
      .classed("pricingfeatures_text",true)
      .text(function(x){return x.name})
      .style("font-weight",function(x){ return x.bold ? "bold" : undefined })

    text.filter(function(x){ return !x.active})
      .classed("pricingfeatures_text-unavailable",true)



    var envelope = d3_updateable(section_bottom,".envelope","div")
      .classed("envelope",true)
      .style("margin-top","50px")
      .style("margin-bottom","100px")

    d3_updateable(envelope,".envelope_gradient","div")
      .classed("envelope_gradient",true)

    var form = d3_updateable(envelope,"form","form")
      .classed("w-form envelope_form",true)
      .attr("method","POST")
      .attr("action","/subscription")

      .attr("id","payment-form")
      .on("submit",function(x){

        d3.select(this)
          .selectAll(".button")
          .property('disabled', true);

        var $form = $(this);

        Stripe.card.createToken($form,function(code,response){

          if (response.error) {
            // Show the errors on the form
            $form.find('.payment-errors').text(response.error.message);
            $form.find('button').prop('disabled', false);
          } else {
            // response contains id and card, which contains additional card details
            var token = response.id;
            // Insert the token into the form so it gets submitted to the server
            $form.append($('<input type="hidden" name="stripeToken" />').val(token));
            // and submit
            var href = form.attr("action")

            d3.xhr(href)
              .post(JSON.stringify({"token":token}),function(d){
                console.log(d)
                debugger
              })
          }
          
        })

        d3.event.preventDefault()
        return false
      })

    d3_updateable(form,"#payment-errors","span")
      .attr("id","payment-errors")

    var form_fields = [
        {
            "name":"Card Number"
          , "stripe": "number"
        }
      , {
            "name":"CVC"
          , "stripe": "cvc"
        }
      , {
            "name":"Expiration Month"
          , "stripe": "exp-month"
        }
      , {
            "name":"Expiration Year"
          , "stripe": "exp-year"
        }
    ]

    d3_updateable(form,".envelope_title","h3")
      .classed("envelope_title",true)
      .text("Monthly Subscription")

    d3_updateable(form,".pricing_summary","div")
      .classed("pricing_summary",true)
      .text("$499")

    Stripe.setPublishableKey('pk_test_ewNJnIanw83VNJ6iDrkiGXL6');

    d3_splat(form,".form_input","input",form_fields,function(x){ return x.name })
      .classed("w-input form_input",true)
      .attr("name",function(x){ return x.stripe })
      .attr("data-name",function(x){ return x.stripe })
      .attr("data-stripe",function(x){ return x.stripe })
      .attr("required","required")
      .attr("placeholder",function(x){ return x.name })

    var button = d3_updateable(form,".form_button","div")
      .classed("form_button",true)

    d3_updateable(button,".button","input")
      .classed("w-button button button-blue",true)
      .attr("type","submit")
      .text("Subscribe")

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
