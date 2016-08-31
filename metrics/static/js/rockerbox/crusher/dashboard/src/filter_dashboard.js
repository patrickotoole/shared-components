import accessor from './helpers'
import summary_box from './summary_box'

import * as transform from './data_helpers'
import * as ui_helper from './helpers'

import bar_selector from './bar_selector'
import time_selector from './time_selector'
//import table from './table'
import table from 'table'


import render_filter from './render_filter'
import state from './state'
import share from './share'
import time_series from './timeseries'





export function FilterDashboard(target) {
  this._on = {}
  this._state = state()

  this._target = target
    .append("ul")
    .classed("vendors-list",true)
      .append("li")
      .classed("vendors-list-item",true);
}

export default function filter_dashboard(target) {
  return new FilterDashboard(target)
}

FilterDashboard.prototype = {
    data: function(val) { return accessor.bind(this)("data",val) }
  , actions: function(val) { return accessor.bind(this)("actions",val) }
  , draw: function() {
      this._target
      this._categories = {}
      this.render_wrappers()
      this._target.selectAll(".loading").remove()
      this.render_lhs()
      this.render_right()

      this.render_center()

    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action];
      this._on[action] = fn;
      return this
    }
  , draw_loading: function() {
      this.render_wrappers()
      this.render_center_loading()
      return this
    }
  , render_wrappers: function() {

      this._lhs = d3_updateable(this._target,".lhs","div")
        .classed("lhs col-md-2",true)

      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-7",true)

      this._right = d3_updateable(this._target,".right","div")
        .classed("right col-md-3",true)

    }
  , render_lhs: function() {

      var self = this

      this._lhs = d3_updateable(this._target,".lhs","div")
        .classed("lhs col-md-2",true)
        .style("border-right","1px solid #ccc")

      var current = this._lhs
        //, _top = ui_helper.topSection(current)
        , _lower = ui_helper.remainingSection(current)

      //summary_box(_top)
      //  .data(transform.buildOnsiteSummary(this._data))
      //  .draw()

      this._data.display_actions = this._data.display_actions || transform.buildActions(this._data)
      _lower.classed("affix",true)
        .style("min-width","200px")

      bar_selector(_lower)
        .type("radio")
        .data(this._data.display_actions)
        .on("click",function(x) {
          var t = this;
          self._state.set("action_name",x.key)
          _lower.selectAll("input")
            .attr("checked",function() {
              this.checked = (t == this)
              return undefined
            })

          //self._data.display_actions.values.map(function(v) {
          //  v.selected = 0
          //  if (v == x) v.selected = 1
          //})
          self.draw_loading()

          self.on("select")(x)
        })
        .draw()

    }
  , render_view: function(_lower,data) {

      var head = d3_updateable(_lower, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","-5px")

      var self = this

      var tabs = [
          transform.buildDomains(data)
        , transform.buildUrls(data)
      ]

      if ((tabs[0].selected == undefined) && (!this._state.get("tabs")))  this._state.set("tabs",[1,0]) 

      this._state.get("tabs").map(function(x,i) { tabs[i].selected = x })

      d3_updateable(head,"span","span")
        .text(tabs.filter(function(x){ return x.selected})[0].key)

      var select = d3_updateable(head,"select","select")
        .style("width","19px")
        .style("margin-left","12px")
        .on("change", function(x) {
          tabs.map(function(y) { y.selected = 0 })

          this.selectedOptions[0].__data__.selected = 1
          self._state.set("tabs", tabs.map(function(y) {return y.selected }) )
          draw()
        })
      
      d3_splat(select,"option","option",tabs,function(x) {return x.key})
        .text(function(x){ return x.key })
        .style("color","#888")
        .style("min-width","100px")
        .style("text-align","center")
        .style("display","inline-block")
        .style("padding","5px")
        .style("border",function(x) {return x.selected ? "1px solid #888" : undefined})
        .style("opacity",function(x){ return x.selected ? 1 : .5})

      function draw() {
        var selected = tabs.filter(function(x){ return x.selected})[0]

        d3_updateable(head,"span","span")
          .text(selected.key)

        _lower.selectAll(".vendor-domains-bar-desc").remove()

        _lower.datum(data)

        var t = table.table(_lower)
          .data(selected)


        if (selected.key == "Top Domains") {

          var samp_max = d3.max(selected.values,function(x){return x.sample_percent_norm})
            , pop_max = d3.max(selected.values,function(x){return x.pop_percent})
            , max = Math.max(samp_max,pop_max);

          t.headers([
                {key:"key",value:"Domain",locked:true,width:"100px"}
              , {key:"value",value:"Sample versus Pop",locked:true}
              , {key:"count",value:"Views",selected:false}

            ])
            .option_text("&#65291;")
            .on("expand",function(d) {

              d3.select(this.parentNode).selectAll(".expanded").remove()
              var t = document.createElement('tr');
              this.parentNode.insertBefore(t, this.nextSibling);  

              var tr = d3.select(t).classed("expanded",true).datum({})
              var td = d3_updateable(tr,"td","td")
                .attr("colspan",this.children.length)
                .style("background","#f9f9fb")
                .style("padding-top","10px")
                .style("padding-bottom","10px")

              var dd = this.parentElement.__data__.full_urls.filter(function(x) { return x.domain == d.key})


              var p = []
              d3.range(0,24).map(function(t) {
                ["0","20","40"].map(function(m) {
                  if (t < 10) p.push("0" + String(t)+String(m))
                  else p.push(String(t)+String(m))

                })
              })

              var rolled = d3.nest()
                .key(function(k) { return k.hour + k.minute })
                .rollup(function(v) {
                  return v.reduce(function(p,c) {
                    p.articles[c.url] = true
                    p.views += c.count
                    p.sessions += c.uniques
                    return p
                  },{ articles: {}, views: 0, sessions: 0})
                })
                .entries(dd)
                .map(function(x) {
                  Object.keys(x.values).map(function(y) {
                    x[y] = x.values[y]
                  })
                  x.article_count = Object.keys(x.articles).length
                  x.hour = x.key.slice(0,2)
                  x.minute = x.key.slice(2)
                  x.value = x.article_count
                  x.key = p.indexOf(x.key)
                  //delete x['articles']
                  return x
                })

                

              var timing = d3_updateable(td,"div.timing","div",rolled)
                .classed("timing",true)
                .style("height","60px")
                .style("width","60%")
                .style("text-transform","uppercase")
                .style("font-weight","bold")
                .style("font-size",".9em")
                .style("margin-bottom","45px")
                .style("line-height","35px")
                .style("display","inline-block")
                .text("Articles Accessed")

              var details = d3_updateable(td,"div.details","div")
                .classed("details",true)
                .style("width","40%")
                .style("display","inline-block")
                .style("vertical-align","top")




              d3_updateable(details,"span","span")
                .style("text-transform","uppercase")
                .style("font-weight","bold")
                .style("font-size",".9em")
                .style("margin-bottom","10px")
                .style("line-height","35px")
                .text("Details")


              var articles = d3_updateable(td,"div.articles","div")
                .classed("articles",true)

              d3_updateable(articles,"span","span")
                .style("text-transform","uppercase")
                .style("font-weight","bold")
                .style("font-size",".9em")
                .style("margin-bottom","10px")
                .style("line-height","35px")
                .text("Top articles")
                
              var drawArticles = function(urls) {

                var a = d3_splat(articles,"div","div",urls)
                  .text(String)
                  .exit().remove()

              }

              var drawDetails = function(x) {

                var time = d3_updateable(details,".time","div",x)
                  .classed("time",true)
                  .text("Time: " + x.hour + ":" + (x.minute.length == 1 ? "0" + x.minute : x.minute ) )


                var button = d3_updateable(details,".button","a",false,function() { return 1})
                  .classed("button",true)
                  .style("padding","5px")
                  .style("border-radius","5px")
                  .style("border","1px solid #ccc")
                  .style("margin","auto")
                  .style("margin-top","10px")
                  .style("display","block")
                  .style("width","50px")
                  .style("text-align","center")

                  .text("Reset")
                  .on("click",reset)

              }

              var reset = function() {
                details.selectAll(".time").remove()
                details.selectAll(".button").remove()

                drawArticles(d.urls.slice(0,10))
              }
              reset() 

              time_series(timing)
                .data({"key":"y","values":timing.data()[0]})
                .on("hover",function(x) {
                  drawArticles(Object.keys(x.articles).slice(0,10))
                  drawDetails(x)

                })
                .draw()

               
               
                
            })
            .hidden_fields(["urls","percent_unique","sample_percent_norm"])
            .render("value",function(d) {
              var width = (d3.select(this).style("width").replace("px","") || this.offsetWidth) - 50
                , height = 28;

              var x = d3.scale.linear()
                .range([0, width])
                .domain([0, max])

              if (d3.select(this).text()) d3.select(this).text("")

              var bullet = d3_updateable(d3.select(this),".bullet","div",this.parentNode.__data__,function(x) { return 1 })
                .classed("bullet",true)
                .style("margin-top","3px")

              bullet.exit().remove()

              var svg = d3_updateable(bullet,"svg","svg",false,function(x) { return 1})
                .attr("width",width)
                .attr("height",height)
  
   
              d3_updateable(svg,".bar","rect",false,function(x) { return 1})
                .attr("x",0)
                .attr("width", function(d) {return x(d.pop_percent) })
                .attr("height", height)
                .attr("fill","#888")
  
              d3_updateable(svg,".bar","rect",false,function(x) { return 1})
                .attr("x",0)
                .attr("y",height/4)
                .attr("width", function(d) {return x(d.sample_percent_norm) })
                .attr("height", height/2)
                .attr("fill","rgb(8, 29, 88)")


            })
          
        }

        t.draw()
      }

      draw()      
    }
  , render_center: function() {

      var self = this;

      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-7",true)

      var current =  this._center
        , _top = ui_helper.topSection(current)
        , _lower = ui_helper.remainingSection(current)

      var head = d3_updateable(_top, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","-5px")
        .text("Filter activity")

      var right_pull = d3_updateable(head,".pull-right","a")
        .classed("pull-right fa-bookmark fa", true)
        .style("margin-right","17px")
        .style("line-height","22px")
        .style("text-decoration","none !important")

      d3_updateable(right_pull,".saved-search","a")
        .classed("saved-search",true)
        .style("vertical-align","middle")
        .style("font-size","12px")
        .style("font-family","ProximaNova, sans-serif")
        .style("font-weight","bold")
        .style("border-right","1px solid #ccc")
        .style("padding-right","10px")
        .style("display","inline-block")
        .style("line-height","22px")
        .style("text-decoration","none")
        .html("&nbsp; Saved Searches")
        .on("click",function() {
          self.render_saved(_top,_lower)
          var w = _top.selectAll(".filter-wrapper")
          //w.classed("hidden",function(x) { return !w.classed("hidden") })

        })

      d3_updateable(right_pull,".new-saved-search","a")
        .classed("new-saved-search",true)
        .style("font-size","14px")
        .style("font-family","ProximaNova, sans-serif")
        .style("font-weight","bold")
        .style("padding-left","10px")
        .style("display","inline-block")
        .style("line-height","22px")
        .style("text-decoration","none")
        .html("&#65291;")
        .on("click",function() {
          //self.render_saved(_top,_lower)
          var w = _top.selectAll(".save-subtitle-filter")
          w.classed("hidden",function(x) { return !w.classed("hidden") })
          
        })



      this.render_saved(_top,_lower)
      this.render_filter(_top,_lower)

      //this.render_view(_lower,this._data)

    }
  , render_saved: function(_top,_lower) {

      var self = this;

      var saved = d3_updateable(_top,".saved","div")
        .classed("saved",true)
        .classed("hidden",function() { return !d3.select(this).classed("hidden") })
        .style("padding-left","10px")

      var saved_searches = JSON.parse(localStorage.getItem("search.saved")) || []

      //var saved_searches = [
      //    {
      //        "key": "Saved 1"
      //      , "values": [{"field":"Time","op":"equals","value":"01"}]
      //    }
      //  , {
      //        "key": "Saved 2"
      //      , "values": [{"field":"Time","op":"equals","value":"02"}]
      //    }
      //]

      //localStorage.setItem("search.saved",JSON.stringify(saved_searches))


      var saved_items = d3_splat(saved,".item","a",saved_searches,function(x) { return x.key })
        .style("display","block")
        .style("font-weight","bold")
        .style("margin-left","auto")
        .style("width","240px")
        .classed("item",true)
        .style("line-height","24px")
        .text(function(x) {return x.key})
        .on("click", function(x) {
          self._state.set("filter",x.values)
          self.render_saved(_top,_lower)
          self.render_filter(_top,_lower)
        })

    }
  , render_filter: render_filter
  , render_center_loading: function() {
      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-7",true)

      this._center.html("")

      d3_updateable(this._center,"center","center")
        .style("text-align","center")
        .style("display","block")
        .classed("loading",true)
        .text("Loading...")


    }
  , render_right: function(data) {

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

}
