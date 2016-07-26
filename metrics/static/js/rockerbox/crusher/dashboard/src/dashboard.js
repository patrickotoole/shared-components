import accessor from './helpers'
import summary_box from './summary_box'

import * as transform from './data_helpers'
import * as ui_helper from './helpers'

import bar_selector from './bar_selector'
import time_selector from './time_selector'
import table from './table'




export function Dashboard(target) {
  this._on = {}
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
  , render_center: function() {
      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-6",true)

      var current =  this._center
        , _top = ui_helper.topSection(current)
        , _lower = ui_helper.remainingSection(current)

      time_selector(_top)
        .data(transform.buildTimes(this._data))
        .draw()

      var head = d3_updateable(_lower, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","-5px")


      var tabs = [
          transform.buildDomains(this._data)
        , transform.buildUrls(this._data)
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
        d3_updateable(head,"span","span")
          .text(tabs.filter(function(x){ return x.selected})[0].key)

        table(_lower)
          .data(tabs.filter(function(x){ return x.selected})[0])
          .draw()
      }

      draw()

    }
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
  , render_right: function() {

      var self = this

      this._right = d3_updateable(this._target,".right","div")
        .classed("right col-md-3",true)

      var current = this._right
        , _top = ui_helper.topSection(current)
        , _lower = ui_helper.remainingSection(current)

      summary_box(_top)
        .data(transform.buildOffsiteSummary(this._data))
        .draw()

      this._data.display_categories = this._data.display_categories || transform.buildCategories(this._data)

      bar_selector(_lower)
        .data(this._data.display_categories)
        .on("click",function(x) {
          x.selected = !x.selected
          self.draw() 
        })
        .draw()
      

    }

}
