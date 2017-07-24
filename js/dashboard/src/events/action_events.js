import {s as state} from 'state';
import * as api from 'api'



export default function init() {
  const s = state;

  state
    .registerEvent("actions.get", function() { s.publishStatic("actions",api.action.getAll) })
    .registerEvent("action.change", function(action) { s.publish("selected_action",action) })
    .registerEvent("action_date.change", function(date) { s.publish("action_date",date) })
    .registerEvent("comparison_date.change", function(date) { s.publish("comparison_date",date) })
    .registerEvent("comparison.change", function(action) { 
      if (action.value == false) return s.publish("selected_comparison",false)
      s.publish("selected_comparison",action)
    })


}
