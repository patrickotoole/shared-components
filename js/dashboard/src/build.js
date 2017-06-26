import state from 'state'
import new_dashboard from './new_dashboard'

var deepcopy = function(x) {
  return JSON.parse(JSON.stringify(x))
}

export default function build(target) {
  return new Dashboard(target)
}

class Dashboard {

  constructor(target) {
    this._target = target
    return this.call.bind(this)
  }

  call() {
   let s = state;
   let value = s.state()

   let db = new_dashboard(this._target)
     .staged_filters(value.staged_filter || "")
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
     .on("add-filter", function(filter) { 
       s.publish("filters",s.state().filters.concat(filter).filter(x => x.value) ) 
     })
     .on("modify-filter", function(filter) { 
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

     .on("staged-filter.change", function(str) { s.publish("staged_filter",str ) })
     .on("action.change", function(action) { s.publish("selected_action",action) })
     .on("action_date.change", function(date) { s.publish("action_date",date) })
     .on("comparison_date.change", function(date) { s.publish("comparison_date",date) })
     .on("comparison.change", function(action) { 
       if (action.value == false) return s.publish("selected_comparison",false)
       s.publish("selected_comparison",action)
     })
     .on("logic.change", function(logic) {
       s.publish("logic_options",logic)
     })
     .on("filter.change", function(filters) {

       s.publishBatch({
           "filters":filters
       })
     })
     .on("view.change", function(x) {
       db.loading(true)
       var CP = deepcopy(value.dashboard_options)
       CP.map(function(d) {
         if (x.value == d.value) return d.selected = 1
         d.selected = 0
       })
       s.publish("dashboard_options",CP)
     })
     .on("tab.change", function(x) {
       db.loading(true)
       value.tabs.map(function(t) {
         if (t.key == x.key) return t.selected = 1
         t.selected = 0
       })
       s.publishStatic("tabs",value.tabs)
     })
     .on("ba.sort", function(x) {
       s.publish("sortby",x.value)
       s.publish("filters",value.filters)
   
     })
     .draw()
   
  }
}
