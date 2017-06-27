import state from 'state'
import {qs} from 'state'
import * as api from 'api'
import * as data from './data'
import build from './build'

const s = state;

 
var buildCategories = data.buildCategories
  , buildCategoryHour = data.buildCategoryHour
  , buildData = data.buildData
  , publishQSUpdates = function(updates,qs_state) {
      if (Object.keys(updates).length) {
        updates["qs_state"] = qs_state
        s.publishBatch(updates)
      }
    }



export default function init() {

  window.onpopstate = function(i) {

    var state = s._state
      , qs_state = i.state

    var updates = dashboard.state.compare(qs_state,state)

    publishQSUpdates(updates,qs_state)
  }

  state
    .subscribe("filter.tabs", function(error,dbo,state) { s.publishStatic("formatted_data",state.data) })
    .subscribe("filter.dashboard_options", function(error,dbo,state) { s.publishStatic("formatted_data",state.data) })
    .subscribe("filter.logic_options", function(error,filters,state) { s.publish("filters",state.filters) })
    
    .subscribe("raw.data",function(error,value,state) {

      value.actions = state.actions
      s.publishStatic("logic_categories",value.categories)
      s.publish("filters",state.filters)

    })
    .subscribe("raw.comparison_data",function(error,value,state) {
      s.publish("filters",state.filters)
    })
    .subscribe("raw.actions",function(error,value,_state) {
      var qs_state = qs({}).from(window.location.search)
      //s.update("selected_action",value[0])

      // TODO: Bugfix this... the from object should be empty and the updates should also be empty

      if (window.location.search.length && Object.keys(qs_state).length) {
        var updates = dashboard.state.compare(qs_state,_state)
        return publishQSUpdates(updates,qs_state)
      } else {
       s.publish("selected_action",value[0])
      }

    })
    .subscribe("raw.action_date",function(error,value,state) {
      s.publishStatic("data",api.action.getData(state.selected_action,state.action_date))
    })
    .subscribe("raw.comparison_date",function(error,value,state) {
      if (!value) return s.publishStatic("comparison_data",false)
      s.publishStatic("comparison_data",api.action.getData(state.selected_comparison,state.comparison_date))
    })
    .subscribe("raw.selected_action",function(error,value,state) {
      s.publishStatic("data",api.action.getData(value,state.action_date))
    })
    .subscribe("raw.selected_comparison",function(error,value,state) {
      if (!value) return s.publishStatic("comparison_data",false)
      s.publishStatic("comparison_data",api.action.getData(value,state.comparison_date))
    })
    .subscribe("history",function(error,state) {
      console.log("current: " + JSON.stringify(state.qs_state), JSON.stringify(state.filters), state.dashboard_options )
      var for_state = ["filters"]

      var qs_state = for_state.reduce((p,c) => {
        if (state[c]) p[c] = state[c]
        return p
      },{})

      if (state.selected_action) qs_state['selected_action'] = state.selected_action.action_id
      if (state.selected_comparison) qs_state['selected_comparison'] = state.selected_comparison.action_id
      if (state.dashboard_options) qs_state['selected_view'] = state.dashboard_options.filter(x => x.selected)[0].value
      if (state.action_date) qs_state['action_date'] = state.action_date
      if (state.comparison_date) qs_state['comparison_date'] = state.comparison_date


      if (state.selected_action && qs(qs_state).to(qs_state) != window.location.search) {
        s.publish("qs_state",qs_state)
      }
    })
    .subscribe("history.qs_state", function(error,qs_state,state) {

      if (JSON.stringify(history.state) == JSON.stringify(qs_state)) return

      if (window.location.search == "") history.replaceState(qs_state,"",qs(qs_state).to(qs_state))
      else history.pushState(qs_state,"",qs(qs_state).to(qs_state))

    })
    .subscribe("filter.loading", function(error,loading,value) {
      build()()
    })
    .subscribe("filter.formatted_data", function(error,formatted_data,value) {
      s.update("loading",false)
      build()()
    })
    .subscribe("filter.filters", state.s.prepareEvent("updateFilter"))



}
