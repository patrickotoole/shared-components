import state from 'state'
import filterInit from './events/filter_events'
import actionInit from './events/action_events'


const s = state;

const deepcopy = function(x) {
  return JSON.parse(JSON.stringify(x))
}

export default function init() {

  filterInit()
  actionInit()

  // OTHER events

  state
    .registerEvent("view.change", function(x) {
      s.update("loading",true)
      var CP = deepcopy(s.state().dashboard_options).map(function(d) { d.selected = (x.value == d.value) ? 1 : 0; return d })
      s.publish("dashboard_options",CP)
    })
    .registerEvent("tab.change", function(x) {
      s.update("loading",true)
      const value = s.state()
      value.tabs.map(function(t) { t.selected = (t.key == x.key) ? 1 : 0 })
      s.publishStatic("tabs",value.tabs)
      s.prepareEvent("updateFilter")
    })
    .registerEvent("ba.sort", function(x) {
      s.publish("sortby", x.value)
      s.prepareEvent("updateFilter")(false,s.state().filters,s.state())
    })
}
