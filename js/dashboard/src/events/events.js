import state from 'state'
import filterInit from './filter_events'

const s = state;

const deepcopy = function(x) {
  return JSON.parse(JSON.stringify(x))
}

export default function init() {
  filterInit()
  state
    .registerEvent("add-filter", function(filter) { 
      s.publish("filters",s.state().filters.concat(filter).filter(x => x.value) ) 
    })
    .registerEvent("modify-filter", function(filter) { 
      var filters = s.state().filters
      var has_exisiting = filters.filter(x => (x.field + x.op) == (filter.field + filter.op) )
      
      if (has_exisiting.length) {
        var new_filters = filters.reverse().map(function(x) {
          if ((x.field == filter.field) && (x.op == filter.op)) {
            x.value += "," + filter.value
          }
          return x
        })
        s.publish("filters",new_filters.filter(x => x.value))
      } else {
        s.publish("filters",s.state().filters.concat(filter).filter(x => x.value))
      }
    })
    .registerEvent("staged-filter.change", function(str) { s.publish("staged_filter",str ) })
    .registerEvent("action.change", function(action) { s.publish("selected_action",action) })
    .registerEvent("action_date.change", function(date) { s.publish("action_date",date) })
    .registerEvent("comparison_date.change", function(date) { s.publish("comparison_date",date) })
    .registerEvent("comparison.change", function(action) { 
      if (action.value == false) return s.publish("selected_comparison",false)
      s.publish("selected_comparison",action)
    })
    .registerEvent("logic.change", function(logic) { s.publish("logic_options",logic) })
    .registerEvent("filter.change", function(filters) { s.publishBatch({ "filters":filters }) })
    .registerEvent("view.change", function(x) {
      s.update("loading",true)
      var CP = deepcopy(s.state().dashboard_options).map(function(d) { d.selected = (x.value == d.value) ? 1 : 0; return d })
      s.publish("dashboard_options",CP)
    })
    .registerEvent("tab.change", function(x) {
      s.update("loading",true)
      value.tabs.map(function(t) { t.selected = (t.key == x.key) ? 1 : 0 })
      s.publishStatic("tabs",value.tabs)
    })
    .registerEvent("ba.sort", function(x) {
      s.publishBatch({
        "sortby": x.value,
        "filters":value.filters
      })
    })
}
