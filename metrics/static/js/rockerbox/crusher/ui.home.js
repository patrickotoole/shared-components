var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.home = (function(home, crusher) {

  home.validated = function(row,data) { }

  var stop = false;
  var content = [
        {
            "left": "<div class='codepeek_text'>Rockerbox uses the pixel to build an audience of your users<br><br>You can explore behavioral differences in your audience based on different on-site activities.</div>"
          , "right": "<div class='codepeek_text'>To see how your users differ based on on-site behavior, create a segment. <br><br>Need Help? Use our <a>Segment Creation</a> guide to get started.</div>" 
          , "center": "<img style='width:100%' src='/static/img/demos/search-products-crusher.png'></img>"
        }
      , {
            "center": "<img style='width:100%' src='/static/img/demos/before-crusher.png'></img>" 
          , "left": "<div class='codepeek_text'>Rockerbox goes beyond direct referrer, providing insights on the articles, sites, and keywords that your visitors engaged with along their way to your site.</div>"
          , "right": "<div class='codepeek_text'>With Rockerbox, you can finally visualize your visitor's entire journey.</div>"
        }
      , {
            "center": "<img style='width:100%' src='/static/img/demos/before-crusher.png'></img>" 
          , "left": "<div class='codepeek_text'></div>"
          , "right": "<div class='codepeek_text'></div>"
        }
    ]

  var validation = {
      success: function(row,data,next) {

        var desc = "Your implementation appears to be successful. <br><br>We detected " + 
          data.length + 
          " recent page views to the following pages on your site by your web browser:"

        start.envelope(row)
          .data(data)
          .description(desc)
          .title("congrats!")
          .button("next")
          .click(next)
          .draw()

        var to_hide = row.selectAll(".codepeek_content")
          , h = -to_hide.node().clientHeight;

        to_hide.transition()
          .style("margin-top",(h+20) + "px")
          .duration(500)
      }
    , failure: function(advertiser,all_pages) {

        var url = 'http://' + advertiser.client_sld
          , dims = "status=1,width=50,height=50,right=50,bottom=50," + 
              "titlebar=no,toolbar=no,menubar=no,location=no,directories=no,status=no"
          , validation_popup = window.open(url, "validation_popup", dims);
    
        if (!stop) {
          setTimeout(function(){
            stop = true
            all_pages.uuid = advertiser.uid;
            pubsub.publishers.segment_pixel_status(all_pages)
            validation_popup.close()
          },8000)
        } else {
          validation_popup.close()
        }
    
      }
  }

  home.codepeek_click = function(row,advertiser,uid,next) {

    advertiser.uid = uid

    var click = function(x){

      var all_pages = x.segments.filter(function(x){return x.segment_name.indexOf("All Pages") > -1})[0]
        , stop = false;

      all_pages.uuid = uid+"sdf"
      d3.select(this).property("value","validating...")

      pubsub.subscriber("validate", ["segment_pixel_status"])
        .run(function(data){
          if (!!data.length) validation.success(row,data,next)
          else validation.failure(advertiser,all_pages)
        })
        .data(all_pages)
        .unpersist(false)
        .trigger()
    }

    return click
 
  }

  home.main = function(funnelRow,advertiser,uid) {

    var slideshow = start.slideshow(funnelRow)
      .data([
          function slide1(){
            var d = d3.select(this)
            var stage = start.stage(d)
              .draw()

            var cp_row = stage._stage
            var click = home.codepeek_click(cp_row,advertiser,uid,slideshow.next.bind(slideshow))

            start.codepeek(cp_row)
              .data(advertiser)
              .button("check")
              .click(click)
              .draw()
          }
        , function slide2(){
            var d = d3.select(this)

            var stage = start.stage(d)
              .title("Getting Started")
              .subtitle("Rockerbox helps you understand your audience by understanding off-site activity and behavior.")
              .left("")
              .right("")
              .draw()

            var wrap = d3_updateable(stage._stage,".img","div")
              .classed("img pull-left",true)
              .style("width","50%")
              .style("border","10px solid white")
              .html("")

            var current = 0;
            var next = function() {
              stage
                .left(content[current].left)
                .right(content[current].right)
                .draw()

              wrap.html(content[current].center)
              current += 1;

              if (content[current] == undefined) d.selectAll(".codepeek_row").selectAll(".button").classed("hidden",true)
            }

            var bw = d3_updateable(d.selectAll(".codepeek_row"),".button-wrap","div")
              .classed("button-wrap",true)
              .style("width","50%")
              .style("float","left")


            start.button(bw)
              .button("next")
              .click(next)
              .draw()

            next()

            

          }
      ])
      .draw()

    window._show = slideshow;

    slideshow.slides().each(function(x,i){
      return x.bind(this)(x,i)
    })


    return
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
          .html("Implement your first segment")
          .on("click",function(){
            RB.routes.navigation.forward(controller.states["/crusher/action"])
          })
  }

  

  return home
})(RB.crusher.ui.home || {}, RB.crusher)
