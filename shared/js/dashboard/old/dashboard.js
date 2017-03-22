import accessor from './helpers'
import summary_box from './summary_box'

import * as transform from './data_helpers'
import * as ui_helper from './helpers'

import bar_selector from './bar_selector'
import time_selector from './time_selector'
import table from './table'

import render_filter from './render/filter'
import state from './state'





export function Dashboard(target) {
  this._on = {}
  this._state = state()
  this._target = target
    .append("ul")
    .classed("vendors-list",true)
      .append("li")
      .classed("vendors-list-item",true);
}

export default function dashboard(target) {
  return new Dashboard(target)
}

Dashboard.prototype = {
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
        .classed("lhs col-md-3",true)

      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-6",true)

      this._right = d3_updateable(this._target,".right","div")
        .classed("right col-md-3",true)

    }
  , render_lhs: function() {

      var self = this

      this._lhs = d3_updateable(this._target,".lhs","div")
        .classed("lhs col-md-3",true)

      var current = this._lhs
        , _top = ui_helper.topSection(current)
        , _lower = ui_helper.remainingSection(current)

      summary_box(_top)
        .data(transform.buildOnsiteSummary(this._data))
        .draw()

      this._data.display_actions = this._data.display_actions || transform.buildActions(this._data)

      bar_selector(_lower)
        .type("radio")
        .data(this._data.display_actions)
        .on("click",function(x) {
          var t = this;

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

      var tabs = [
          transform.buildDomains(data)
        , transform.buildUrls(data)
      ]
      tabs[0].selected = 1

      d3_updateable(head,"span","span")
        .text(tabs.filter(function(x){ return x.selected})[0].key)

      var select = d3_updateable(head,"select","select")
        .style("width","19px")
        .style("margin-left","12px")
        .on("change", function(x) {
          tabs.map(function(y) { y.selected = 0 })

          this.selectedOptions[0].__data__.selected = 1
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

        var t = table(_lower)
          .data(selected)


        if (selected.key == "Top Domains") {
          var samp_max = d3.max(selected.values,function(x){return x.percent_norm})
            , pop_max = d3.max(selected.values,function(x){return x.pop_percent})
            , max = Math.max(samp_max,pop_max);

          var width = _lower.style("width").split(".")[0].replace("px","")/2 - 10
            , height = 20

          var x = d3.scale.linear()
            .range([0, width])
            .domain([0, max])

          t.header(function(wrap) {
            var headers = d3_updateable(wrap,".headers","div")
              .classed("headers",true)
              .style("text-transform","uppercase")
              .style("font-weight","bold")
              .style("line-height","24px")
              .style("border-bottom","1px solid #ccc")
              .style("margin-bottom","10px")

            headers.html("")

            d3_updateable(headers,".url","div")
              .classed("url",true)
              .style("width","30%")
              .style("display","inline-block")
              .text("Domain")

            d3_updateable(headers,".bullet","div")
              .classed("bullet",true)
              .style("width","50%")
              .style("display","inline-block")
              .text("Likelihood Versus Population")

            d3_updateable(headers,".percent","div")
              .classed("percent",true)
              .style("width","20%")
              .style("display","inline-block")
              .text("Percent Diff")



          })

          t.row(function(row) {
            d3_updateable(row,".url","div")
              .classed("url",true)
              .style("width","30%")
              .style("display","inline-block")
              .style("vertical-align","top")
              .text(function(x) {return x.key})

            var bullet = d3_updateable(row,".bullet","div")
              .classed("bullet",true)
              .style("width","50%")
              .style("display","inline-block")

            var diff = d3_updateable(row,".diff","div")
              .classed("diff",true)
              .style("width","15%")
              .style("display","inline-block")
              .style("vertical-align","top")
              .text(function(x) {return d3.format("%")((x.percent_norm-x.pop_percent)/x.pop_percent) })

            var plus = d3_updateable(row,".plus","a")
              .classed("plus",true)
              .style("width","5%")
              .style("display","inline-block")
              .style("font-weight","bold")
              .style("vertical-align","top")
              .text("+")
              .on("click",function(x) {

                var d3_this = d3.select(this)
                var d3_parent = d3.select(this.parentNode)
                var target = d3_parent.selectAll(".expanded")

                if (target.classed("hidden")) {
                  d3_this.html("&ndash;")
                  target.classed("hidden", false)

                  d3_splat(target,".row","div",x.urls.filter(function(x){
                      var sp = x.replace("http://","")
                        .replace("https://","")
                        .replace("www.","")
                        .split("/");

                      if ((sp.length > 1) && (sp.slice(1).join("/").length > 7)) return true


                      return false
                    }).slice(0,10))
                    .classed("row",true)
                    .style("overflow","hidden")
                    .style("height","30px")
                    .style("line-height","30px")
                    .text(String)

                  return x
                }
                d3_this.html("+")
                target.classed("hidden",true).html("")
              })
               

            var expanded = d3_updateable(row,".expanded","div")
              .classed("expanded hidden",true)
              .style("width","100%")
              .style("vertical-align","top")
              .style("padding-right","30px")
              .style("padding-left","10px")
              .style("margin-left","10px")
              .style("margin-bottom","30px")
              .style("border-left","1px solid grey")





            var svg = d3_updateable(bullet,"svg","svg")
              .attr("width",width)
              .attr("height",height)

 
            d3_updateable(svg,".bar","rect")
              .attr("x",0)
              .attr("width", function(d) {return x(d.pop_percent) })
              .attr("height", height)
              .attr("fill","#888")

            d3_updateable(svg,".bar","rect")
              .attr("x",0)
              .attr("y",height/4)
              .attr("width", function(d) {return x(d.percent_norm) })
              .attr("height", height/2)
              .attr("fill","rgb(8, 29, 88)")


          })
        }

        t.draw()
      }

      draw()      
    }
  , render_center: function() {
      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-6",true)

      var current =  this._center
        , _top = ui_helper.topSection(current)
        , _lower = ui_helper.remainingSection(current)

      var head = d3_updateable(_top, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","-5px")
        .text("Filter off-site activity")

      



      //time_selector(_top)
      //  .data(transform.buildTimes(this._data))
      //  .draw()

      var self = this
        , data = self._data;

      this.render_filter(_top,_lower)
      this.render_view(_lower,this._data)

    }
  , render_filter: render_filter
  , render_center_loading: function() {
      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-6",true)

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

      summary_box(_top)
        .data(transform.buildOffsiteSummary(data))
        .draw()

      this._data.display_categories = data.display_categories || transform.buildCategories(data)

      bar_selector(_lower)
        .skip_check(true)
        .data(data.display_categories)
        .on("click",function(x) {
          x.selected = !x.selected
          self.draw() 
        })
        .draw()
      

    }

}
