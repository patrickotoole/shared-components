import {qs} from 'state';
import state from 'state';
import {compare} from '../state'

function publishQSUpdates(updates,qs_state) {
  if (Object.keys(updates).length) {
    updates["qs_state"] = qs_state
    state.publishBatch(updates)
  }
}

export default function init() {

  window.onpopstate = function(i) {

    var state = s._state
      , qs_state = i.state

    var updates = compare(qs_state,state)
    publishQSUpdates(updates,qs_state)
  }

  const s = state;

  state
    .subscribe("history",function(error,_state) {
      //console.log(
      //  "current: "+JSON.stringify(_state.qs_state), 
      //  JSON.stringify(_state.filters), 
      //  _state.dashboard_options
      //)

      var for_state = ["filters"]

      var qs_state = for_state.reduce((p,c) => {
        if (_state[c]) p[c] = _state[c]
        return p
      },{})

      if (_state.selected_action) qs_state['selected_action'] = _state.selected_action.action_id
      if (_state.selected_comparison) qs_state['selected_comparison'] = _state.selected_comparison.action_id
      if (_state.dashboard_options) qs_state['selected_view'] = _state.dashboard_options.filter(x => x.selected)[0].value
      if (_state.action_date) qs_state['action_date'] = _state.action_date
      if (_state.comparison_date) qs_state['comparison_date'] = _state.comparison_date


      if (_state.selected_action && qs(qs_state).to(qs_state) != window.location.search) {
        s.publish("qs_state",qs_state)
      }
    })
    .subscribe("history.actions", function(error,value,_state) {
      var qs_state = qs({}).from(window.location.search)
      if (window.location.search.length && Object.keys(qs_state).length) {
        var updates = compare(qs_state,_state)
        return publishQSUpdates(updates,qs_state)
      } else {
        s.publish("selected_action",value[0])
      }
    })
    .subscribe("history.qs_state", function(error,qs_state,_state) {

      if (JSON.stringify(history.state) == JSON.stringify(qs_state)) return
      if (window.location.search == "") history.replaceState(qs_state,"",qs(qs_state).to(qs_state))
      else history.pushState(qs_state,"",qs(qs_state).to(qs_state))

    })
}
