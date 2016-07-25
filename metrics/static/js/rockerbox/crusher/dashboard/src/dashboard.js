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
      this.render_center()
      this.render_right()

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
  , render_center: function() {
      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-6",true)

      var current =  this._center
        , _top = ui_helper.topSection(current)
        , _lower = ui_helper.remainingSection(current)

      time_selector(_top)
        .data(transform.buildTimes(this._data))
        .draw()

      table(_lower)
        .data(transform.buildUrls(this._data))
        .draw()

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
        .data(transform.buildOnsiteSummary(this._data))
        .draw()

      this._data.display_actions = this._data.display_actions || transform.buildActions(this._data)

      bar_selector(_lower)
        .type("radio")
        .data(this._data.display_actions)
        .on("click",function(x) {
          self._data.display_actions.values.map(function(v) {
            v.selected = 0
            if (v == x) v.selected = 1
          })
          self.draw_loading()
          self.on("select")(x)
          //self.draw()
        })
        .draw()

    }

}
