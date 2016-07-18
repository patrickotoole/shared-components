import accessor from './helpers'
import {topSection as topSection} from './helpers'
import {remainingSection as remainingSection} from './helpers'
import summary_box from './summary_box'

import bar_selector from './bar_selector'
import time_selector from './time_selector'
import table from './table'


function buildCategories(data) {
  var values = data.category
        .map(function(x){ return {"key": x.parent_category_name, "value": x.count } })
        .sort(function(p,c) {return c.value - p.value }).slice(0,10)
    , total = values.reduce(function(p, x) {return p + x.value }, 0)

  return {
      key: "Categories"
    , values: values.map(function(x) { x.percent = x.value/total; return x})
  }
}

function buildTimes(data) {
  var values = data.current_hour
    .map(function(x) { return {"key": parseFloat(x.hour) + 1 + x.minute/60, "value": x.count } })

  return {
      key: "Browsing behavior by time"
    , values: values
  }
}

function buildUrls(data) {
  var values = data.url_only.map(function(x) { return {"key":x.url,"value":x.count} })
  
  return {
      key: "Top Articles"
    , values: values
  }
}

export function Dashboard(target) {
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
  , draw: function() {
      this._target
      this.render_lhs()
      this.render_center()
      this.render_right()

    }
  , render_lhs: function() {
      this._lhs = d3_updateable(this._target,".lhs","div")
        .classed("lhs col-md-3",true)

      var current = this._lhs

      var _top = topSection(current)

      summary_box(_top)
        .data({"key":"Off Site Visits","values":[]})
        .draw()

      var _lower = remainingSection(current)

      bar_selector(_lower)
        .data(buildCategories(this._data))
        .draw()

    }
  , render_center: function() {
      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-6",true)

      var current =  this._center

      var _top = topSection(current)

      time_selector(_top)
        .data(buildTimes(this._data))
        .draw()

      var _lower = remainingSection(current)

      table(_lower)
        .data(buildUrls(this._data))
        .draw()

    }
  , render_right: function() {
      this._right = d3_updateable(this._target,".right","div")
        .classed("right col-md-3",true)

      var current = this._right

      var _top = topSection(current)

      summary_box(_top)
        .data({"key":"On Site Visits","values":[]})
        .draw()

      var _lower = remainingSection(current)

      bar_selector(_lower)
        .data({"key":"Segments","values":[]})
        .draw()

    }

}
