import * as transform from '../data_helpers'
import * as ui_helper from '../helpers'
import share from '../share'

export default function render_rhs(data) {

      var self = this
        , data = data || this._data

      this._right = d3_updateable(this._target,".right","div")
        .classed("right col-md-3",true)

      var current = this._right
        , _top = ui_helper.topSection(current)
        , _lower = ui_helper.remainingSection(current)

      var head = d3_updateable(_top, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","-5px")
        .text("")

      _top.classed("affix",true)
        .style("right","0px")
        .style("width","inherit")


      

      var funcs = {
          "Build Media Plan": function(x) {
            document.location = "/crusher/media_plan"
          }
        , "Share Search": function(x) {
            var x = x
            var ss = share(d3.select("body"))
              .draw()

            ss.inner(function(target) {

              var self = this;

                var header = d3_updateable(target,".header","h4")
                  .classed("header",true)
                  .style("text-align","center")
                  .style("text-transform","uppercase")
                  .style("font-family","ProximaNova, sans-serif")
                  .style("font-size","12px")
                  .style("font-weight","bold")
                  .style("padding-top","30px")
                  .style("padding-bottom","30px")
                  .text("Share search results via:")

                var email_form = d3_updateable(target,".email-share-form","div")
                  .classed("email-share-form hidden",true)
                  .style("text-align","center")

                var to = d3_updateable(email_form, ".to", "div")
                  .classed("to",true)
                
                d3_updateable(to,".label","div")
                  .style("width","100px")
                  .style("display","inline-block")
                  .style("text-transform","uppercase")
                  .style("font-family","ProximaNova, sans-serif")
                  .style("font-size","12px")
                  .style("font-weight","bold")
                  .style("text-align","left")
                  .text("To:")

                var to_input = d3_updateable(to,"input","input")
                  .style("width","300px")
                  .attr("placeholder","elonmusk@example.com")

                var name = d3_updateable(email_form, ".name", "div")
                  .classed("name",true)
                
                d3_updateable(name,".label","div")
                  .style("width","100px")
                  .style("display","inline-block")
                  .style("text-transform","uppercase")
                  .style("font-family","ProximaNova, sans-serif")
                  .style("font-size","12px")
                  .style("font-weight","bold")
                  .style("text-align","left")
                  .text("Report Name:")

                var name_input = d3_updateable(name,"input","input")
                  .style("width","300px")
                  .attr("placeholder","My awesome search")



                


                var message = d3_updateable(email_form, ".message", "div")
                  .classed("message",true)
                
                d3_updateable(message,".label","div")
                  .style("display","inline-block")
                  .style("width","100px")
                  .style("text-transform","uppercase")
                  .style("font-family","ProximaNova, sans-serif")
                  .style("font-size","12px")
                  .style("font-weight","bold")
                  .style("text-align","left")
                  .text("Message:")

                var message_input = d3_updateable(message,"textarea","textarea")
                  .style("width","300px")
                  .style("height","100px")
                  .style("border","1px solid #ccc")
                  .attr("placeholder","Hey Elon - Thought you might be interested in this...")


                var send = d3_updateable(email_form, ".send", "div")
                  .classed("send",true)
                  .style("text-align","center")

                var data = x;

                d3_updateable(send,"button","button")
                  .style("line-height","16px")
                  .style("margin-top","10px")
                  .text("Send")
                  .on("click",function(x) {
                    console.log(message_input.value, to_input.value)
                    var msg = message_input.property("value")
                      , email = to_input.property("value")
                      , name = name_input.property("value")


                    var URLS = [
                        "/crusher/funnel/action?format=json" 
                      , "/crusher/v2/visitor/domains_full_time_minute/cache?format=json&top=20000&url_pattern=" + data.url_pattern[0] + "&filter_id=" + data.action_id
                      , "/crusher/pattern_search/timeseries_only?search=" + data.url_pattern[0] 
                      , location.pathname + decodeURIComponent(location.search)
                    ]

                    d3.xhr("/share")
                      .post(JSON.stringify({
                            "email": email
                          , "msg": msg
                          , "name": name
                          , "urls": URLS
                        })
                      )

                    self.hide()

                  })


           
                

                var slack_form = d3_updateable(target,".slack-share-form","div")
                  .classed("slack-share-form hidden",true)
                  .style("text-align","center")
                  .text("Slack integration coming soon...")


                var email = d3_updateable(target,".email-wrap","div")
                  .classed("btn-wrap email-wrap col-md-6",true)
                  .style("text-align","center")

                d3_updateable(email,"a","a")
                  .attr("style","text-transform: uppercase; font-weight: bold; line-height: 24px; padding: 10px; width: 180px; text-align: center; border-radius: 10px; border: 1px solid rgb(204, 204, 204); margin: auto auto 10px; cursor: pointer; display: block;")
                  .text("email")
                  .on("click",function() {
                    header.text("Share results via email")
                    target.selectAll(".btn-wrap").classed("hidden",true)
                    email_form.classed("hidden",false)

                  })


                var slack = d3_updateable(target,".slack-wrap","div")
                  .classed("btn-wrap slack-wrap col-md-6",true)
                  .style("text-align","center")

                d3_updateable(slack,"a","a")
                  .attr("style","text-transform: uppercase; font-weight: bold; line-height: 24px; padding: 10px; width: 180px; text-align: center; border-radius: 10px; border: 1px solid rgb(204, 204, 204); margin: auto auto 10px; cursor: pointer; display: block;")
                  .text("slack")
                  .on("click",function() {
                    target.selectAll(".btn-wrap").classed("hidden",true)
                    slack_form.classed("hidden",false)

                  })







              })
          }
        , "Schedule Report": function(x) {

            var ss = share(d3.select("body"))
              .draw()

            ss.inner(function(target) {

              var self = this;

                var header = d3_updateable(target,".header","h4")
                  .classed("header",true)
                  .style("text-align","center")
                  .style("text-transform","uppercase")
                  .style("font-family","ProximaNova, sans-serif")
                  .style("font-size","12px")
                  .style("font-weight","bold")
                  .style("padding-top","30px")
                  .style("padding-bottom","30px")
                  .text("Schedule search results:")

                var email_form = d3_updateable(target,"div","div")
                  .style("text-align","center")

                var to = d3_updateable(email_form, ".to", "div")
                  .classed("to",true)
                
                d3_updateable(to,".label","div")
                  .style("width","100px")
                  .style("display","inline-block")
                  .style("text-transform","uppercase")
                  .style("font-family","ProximaNova, sans-serif")
                  .style("font-size","12px")
                  .style("font-weight","bold")
                  .style("text-align","left")
                  .text("To:")

                var to_input = d3_updateable(to,"input","input")
                  .style("width","300px")
                  .attr("placeholder","elonmusk@example.com")

                var name = d3_updateable(email_form, ".name", "div")
                  .classed("name",true)
                
                d3_updateable(name,".label","div")
                  .style("width","100px")
                  .style("display","inline-block")
                  .style("text-transform","uppercase")
                  .style("font-family","ProximaNova, sans-serif")
                  .style("font-size","12px")
                  .style("font-weight","bold")
                  .style("text-align","left")
                  .text("Report Name:")

                var name_input = d3_updateable(name,"input","input")
                  .style("width","300px")
                  .attr("placeholder","My awesome search")


                var schedule = d3_updateable(email_form, ".schedule", "div")
                  .classed("schedule",true)


                d3_updateable(schedule,".label","div")
                  .style("width","100px")
                  .style("display","inline-block")
                  .style("text-transform","uppercase")
                  .style("font-family","ProximaNova, sans-serif")
                  .style("font-size","12px")
                  .style("font-weight","bold")
                  .style("text-align","left")
                  .text("Schedule:")

                var schedule_input = d3_updateable(schedule,"select","select",["Mon","Tues","Wed","Thurs","Fri","Sat","Sun"])
                  .style("width","300px")
                  .attr("multiple",true)

                d3_splat(schedule_input,"option","option")
                  .text(String)

                var time = d3_updateable(email_form, ".time", "div")
                  .classed("time",true)


                d3_updateable(time,".label","div")
                  .style("width","100px")
                  .style("display","inline-block")
                  .style("text-transform","uppercase")
                  .style("font-family","ProximaNova, sans-serif")
                  .style("font-size","12px")
                  .style("font-weight","bold")
                  .style("text-align","left")
                  .text("Time:")

                var time_input = d3_updateable(time,"select","select",d3.range(0,23).map(function(x) { return (x%12 + 1) + (x +1 > 11 ? " pm" : " am") }) )
                  .style("width","300px")

                d3_splat(time_input,"option","option")
                  .attr("selected",function(x) { return x == "12 pm" ? "selected" : undefined })
                  .text(String)


                var send = d3_updateable(email_form, ".send", "div")
                  .classed("send",true)
                  .style("text-align","center")

                var data = x;

                d3_updateable(send,"button","button")
                  .style("line-height","16px")
                  .style("margin-top","10px")
                  .text("Send")
                  .on("click",function(x) {
                    var email = to_input.property("value")
                      , name = name_input.property("value") 
                      , time = time_input.property("value")
                      , days = d3.selectAll(schedule_input.node().selectedOptions).data().join(",")

                    var URLS = [
                        "/crusher/funnel/action?format=json" 
                      , "/crusher/v2/visitor/domains_full_time_minute/cache?format=json&top=20000&url_pattern=" + data.url_pattern[0] + "&filter_id=" + data.action_id
                      , "/crusher/pattern_search/timeseries_only?search=" + data.url_pattern[0] 
                      , location.pathname + decodeURIComponent(location.search)
                    ]

                    d3.xhr("/share")
                      .post(JSON.stringify({
                            "email": email
                          , "name": name
                          , "days": days
                          , "time": time
                          , "urls": URLS
                        })
                      )

                    self.hide()

                  })
                  .text("Schedule")


            })


          }
      }

      //var f = d3_splat(_top,".subtitle-filter","a",["Save Results","Share Results","Schedule Results","Build Content Brief","Build Media Plan" ])

      var f = d3_splat(_top,".subtitle-filter","a",["Share Search","Schedule Report", "", "Build Media Plan"])
        .classed("subtitle-filter",true)
        .style("text-transform","uppercase")
        .style("font-weight","bold")
        .style("line-height", "24px")
        .style("padding","16px")
        .style("width"," 180px")
        .style("text-align"," center")
        .style("border-radius"," 10px")
        .style("border",function(x) { return x == "" ? "none" : "1px solid #ccc" } )
        .style("padding"," 10px")
        .style("margin"," auto")
        .style("margin-bottom","10px")
        .style("cursor","pointer")
        .style("display","block")
        .text(String)
        .on("click", function(x) {
          funcs[x].bind(self)(self._data)

        })

     

      this._data.display_categories = data.display_categories || transform.buildCategories(data)


    }
