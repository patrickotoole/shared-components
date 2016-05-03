var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.settings = RB.crusher.ui.settings || {}


RB.crusher.ui.settings.subscription = (function(subscription,crusher) {

  var form_fields = [
        {
            "name":"Name on Card"
          , "stripe": "name"
        }
      , {
            "name":"Card Number"
          , "stripe": "number"
          , "width": "83%"
        }
      , {
            "name":"CVC"
          , "stripe": "cvc"
          , "width": "17%"
        }
      , {
            "name":"Expiration Date"
          , "stripe": "exp"
        }
      , {
            "name":"Billing Zipcode"
          , "stripe": "address_zip"
        }
    ]

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
          , price: "$3000"
          , button: "Get Started"
          , href: "#"
          , features: [
              {
                  "name":"Up to 25000 profiles/month"
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

  subscription.top_text = function(funnelRow,t1,t2,height) {

    var section_top = funnelRow.selectAll(".section-dark-top")
    var top_text = section_top.selectAll(".top-text")
    var top_subtext = section_top.selectAll(".top-subtext")

    if (height) section_top.style("height",height)
    if (t1) top_text.html(t1)
    if (t2) top_subtext.html(t2)

  }

  subscription.base = function(funnelRow) {
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

    return section
  }

  subscription.details = function(section_bottom) {
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



  }

  subscription.upgrade = function(funnelRow,section) {

    var section_bottom = funnelRow.selectAll(".section-bottom")

    var table = d3_updateable(section_bottom,".pricingtable.first","div")
      .classed("pricingtable first",true)

    var row = d3_updateable(table,".pricingtable_row","div")
      .classed("pricingtable_row row",true)

    

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
        if (x.button.indexOf("sales") > -1) {
          window.location.href = "mailto:sales@rockerbox.com"
          return 
        }

        section_bottom.selectAll(".pricingtable").classed("hidden",true) 
        subscription.form(section_bottom,funnelRow)

      })

    
    subscription.details(section_bottom)

    
  }

  subscription.billing = function(section_bottom,funnelRow,billing) {

    subscription.top_text(funnelRow,"Your Billing History"," ","230px")

    var envelope = d3_updateable(section_bottom,".envelope","div")
      .classed("envelope",true)
      .style("margin-top","-20px")
      .style("margin-bottom","100px")

    d3_updateable(envelope,".envelope_gradient","div")
      .classed("envelope_gradient",true)

    

    var form = d3_updateable(envelope,"div.w-form","div")
      .classed("w-form envelope_form",true)

    d3_updateable(form,".envelope_title","h3")
      .classed("envelope_title",true)
      .text("Billing Details")

    var row = d3_splat(form,".pricing_summary","div",billing.sort(function(p,c){return c.date - p.date}),function(x){ return x.date })
      .classed("pricing_summary row",true)
      .style("text-align","left")
      .style("font-size","14px")
      .style("font-weight","normal")
      .style("padding","0px")
      .style("margin","0px")
      .style("color","#ABABAB")


    d3_updateable(row,".date","div")
      .classed("pull-left date",true)
      .style("padding-right","20px")
      .text(function(x){return d3.time.format("%B %d, %Y")(new Date(x.date*1000))})

    d3_updateable(row,".amount","div")
      .classed("pull-right amount",true)
      .text(function(x){return d3.format("$")(x.amount_cents/100)})


    d3_updateable(row,".description","div")
      .classed("description",true)
      .text(function(x){return x.description})
    
    var button = d3_updateable(form,".form_button","div")
      .classed("form_button",true)

    d3_updateable(button,".button","input")
      .classed("w-button button button-blue",true)
      .attr("type","submit")
      .attr("value","unsubscribe")
      .text("Unsubscribe")
      .on("click",function(){
        d3.xhr("/subscription")
          .send("DELETE","",function(){
             location.reload()
           })
      })



  }

  subscription.form = function(section_bottom,funnelRow) {

    var section_top = funnelRow.selectAll(".section-dark-top")

    var text = section_top.selectAll(".top-text")
    var subtext = section_top.selectAll(".top-subtext")

    text.text("Monthly subscription")
    subtext.html("When you hit your limit for 25k profiles collected, <br/> you will be charged for the balance at the end of the month.")



    var envelope = d3_updateable(section_bottom,".envelope","div")
      .classed("envelope",true)
      .style("margin-top","-20px")
      .style("margin-bottom","100px")

    d3_updateable(envelope,".envelope_gradient","div")
      .classed("envelope_gradient",true)

    Stripe.setPublishableKey('pk_test_ewNJnIanw83VNJ6iDrkiGXL6');

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
        $form.find('#payment-errors').text("")

        Stripe.card.createToken($form,function(code,response){

          if (response.error) {
            // Show the errors on the form

            $form.find('#payment-errors').text(response.error.message);
            form.selectAll(".button")
              .property('disabled', undefined)
              .attr('disabled', undefined);

          } else {
            // response contains id and card, which contains additional card details
            var token = response.id;
            // Insert the token into the form so it gets submitted to the server
            $form.append($('<input type="hidden" name="stripeToken" />').val(token));
            $form.append($('<img src="/static/img/general/logo-small.gif">').val(token));

            form.selectAll("input").classed("hidden",true)

            // and submit
            var href = form.attr("action")

            d3.xhr(href)
              .post(JSON.stringify({"token":token,"amount_cents":49900}),function(d){
                location.reload() // HACK
                console.log(d)
              })
          }
          
        })

        d3.event.preventDefault()
        return false
      })


    

    d3_updateable(form,".envelope_title","h3")
      .classed("envelope_title",true)
      .text("Monthly Subscription")

    d3_updateable(form,".pricing_summary","div")
      .classed("pricing_summary",true)
      .text("$499")


    d3_splat(form,".form_input","input",form_fields,function(x){ return x.name })
      .style("width",function(x){ return x.width })
      .style("display",function(x){ return x.width ? "inline-block" : undefined })
      .classed("w-input form_input",true)
      .attr("name",function(x){ return x.stripe })
      .attr("data-name",function(x){ return x.stripe })
      .attr("data-stripe",function(x){ return x.stripe })
      .attr("required","required")
      .attr("placeholder",function(x){ return x.name })

    d3_updateable(form,"#payment-errors","span")
      .attr("id","payment-errors")
      
    var button = d3_updateable(form,".form_button","div")
      .classed("form_button",true)

    d3_updateable(button,".button","input")
      .classed("w-button button button-blue",true)
      .attr("type","submit")
      .text("Subscribe")

  }

  subscription.render = function(funnelRow,advertiser,permissions,billing) {

    var section = subscription.base(funnelRow)
    if (permissions.subscriptions.length == 0) {
      subscription.upgrade(funnelRow,section)
    } else {
      subscription.billing(funnelRow.selectAll(".section-bottom"),funnelRow,billing)
    }

    
  } 

  return subscription 
})(RB.crusher.ui.settings.subscription || {}, RB.crusher)  
