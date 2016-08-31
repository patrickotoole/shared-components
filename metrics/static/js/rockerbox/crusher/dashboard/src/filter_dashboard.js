import accessor from './helpers'
import summary_box from './summary_box'

import * as transform from './data_helpers'
import * as ui_helper from './helpers'

import bar_selector from './bar_selector'
import time_selector from './time_selector'
//import table from './table'
import table from 'table'


import render_filter from './render/filter'
import render_rhs from './render/rhs'

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

              d3.select(this).selectAll("td.option-header").html("&ndash;")
              if (d3.select(this.nextSibling).classed("expanded") == true) {
                d3.select(this).selectAll("td.option-header").html("&#65291;")
                return d3.select(this.parentNode).selectAll(".expanded").remove()
              }

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

  , render_filter: render_filter
  , render_right: render_rhs

}
