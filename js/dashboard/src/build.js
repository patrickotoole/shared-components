import {d3_updateable} from 'helpers'
import d3 from 'd3'
import * as api from 'api'
import state from 'state'
import view from './view'
import initEvents from './events'
import initSubscriptions from './subscriptions'




export default function build(target) {
  const db = new Dashboard(target)
  return db
}

class Dashboard {

  constructor(target) {
    initEvents()
    initSubscriptions()
    this.target(target)
    this.init()

    return this.call.bind(this)
  }

  target(target) {
    this._target = target || d3_updateable(d3.select(".container"),"div","div")
      .style("width","1000px")
      .style("margin-left","auto")
      .style("margin-right","auto")
  }

  init() {
    let s = state;
    let value = s.state()
    this.defaults(s)
  }

  defaults(s) {

    if (!!s.state().dashboard_options) return // don't reload defaults if present

    s.publishStatic("actions",api.action.getAll)
    s.publishStatic("saved",api.dashboard.getAll)
    s.publishStatic("line_items",api.line_item.getAll)

    var DEFAULTS = {
        logic_options: [{"key":"All","value":"and"},{"key":"Any","value":"or"}]
      , logic_categories: []
      , filters: [{}] 
      , dashboard_options: [
            {"key":"Data summary","value":"summary-view","selected":1}
          , {"key":"Explore data","value":"data-view","selected":0}
          , {"key":"Before & After","value":"ba-view","selected":0}
          , {"key":"Timing","value":"timing-view","selected":0}
          , {"key":"Media Plan", "value":"media-view","selected":0}

        ]
    }

    s.update(false,DEFAULTS)
  }

  call() {

   let s = state;
   let value = s.state()

   let db = view(this._target)
     .staged_filters(value.staged_filter || "")
     .media(value.media_plan || {})
     .saved(value.saved || [])
     .data(value.formatted_data || {})
     .actions(value.actions || [])
     .selected_action(value.selected_action || {})
     .selected_comparison(value.selected_comparison || {})
     .action_date(value.action_date || 0)
     .comparison_date(value.comparison_date || 0)
     .loading(value.loading || false)
     .line_items(value.line_items || false)
     .summary(value.summary || false)
     .time_summary(value.time_summary || false)
     .category_summary(value.category_summary || false)
     .keyword_summary(value.keyword_summary || false)
     .before(value.before_urls || [])
     .after(value.after_urls || [])
     .logic_options(value.logic_options || false)
     .logic_categories(value.logic_categories || false)
     .filters(value.filters || false)
     .view_options(value.dashboard_options || false)
     .explore_tabs(value.tabs || false)
     .time_tabs(value.time_tabs || false)
     .on("add-filter", s.prepareEvent("add-filter"))
     .on("modify-filter", s.prepareEvent("modify-filter"))
     .on("staged-filter.change", s.prepareEvent("staged-filter.change"))
     .on("action.change", s.prepareEvent("action.change"))
     .on("action_date.change", s.prepareEvent("action_date.change"))
     .on("comparison_date.change", s.prepareEvent("comparison_date.change"))
     .on("comparison.change", s.prepareEvent("comparison.change"))
     .on("logic.change", s.prepareEvent("logic.change"))
     .on("filter.change", s.prepareEvent("filter.change"))
     .on("view.change", s.prepareEvent("view.change"))
     .on("tab.change", s.prepareEvent("tab.change"))
     .on("ba.sort", s.prepareEvent("ba.sort"))
     .draw()
   
  }
}
