import {s as state} from '@rockerbox/state'
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
    .registerEvent("transform.change", function(x) {
      s.update("loading")
      s.publishStatic("transform",x.value)
      s.prepareEvent("updateFilter")(false,s.state().filters,s.state())
    })

    .registerEvent("sort.change", function(x) {
      const _s = s.state()
      const asc = _s.sort == x.key

      s.update("loading")

      s.publishStatic("sort",x.key)
      s.publishStatic("ascending",asc && !_s.ascending)

      s.prepareEvent("updateFilter")(false,s.state().filters,s.state())

    })
    .registerEvent("view.change", function(x) {
      s.update("loading")
      var CP = deepcopy(s.state().dashboard_options).map(function(d) { d.selected = (x.value == d.value) ? 1 : 0; return d })
      s.publish("dashboard_options",CP)
    })
    .registerEvent("tab.change", function(x) {
      s.update("loading")

      s.publishStatic("tab_position",x.key)
      s.prepareEvent("updateFilter")(false,s.state().filters,s.state())
    })
    .registerEvent("ba.sort", function(x) {
      s.publish("sortby", x.value)
      s.prepareEvent("updateFilter")(false,s.state().filters,s.state())
    })
}
