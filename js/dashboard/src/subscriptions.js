import state from '@rockerbox/state'
import {qs} from '@rockerbox/state'
import build from './build'
import historySubscriptions from './subscriptions/history'
import apiSubscriptions from './subscriptions/api'


const s = state;


export default function init(target) {

  historySubscriptions()
  apiSubscriptions()

  
  state
    .subscribe("change.loading", function(error,loading,value) { build(target,value.is_comparison)() })
    .subscribe("change.dashboard_options", s.prepareEvent("updateFilter"))
    .subscribe("change.tabs", s.prepareEvent("updateFilter")) 
    .subscribe("change.logic_options", s.prepareEvent("updateFilter") )
    .subscribe("update.filters", s.prepareEvent("updateFilter"))

    

  // REDRAW: this is where the entire app gets redrawn - if formatted_data changes, redraw the app

  state
    .subscribe("redraw.formatted_data", function(error,formatted_data,value) { 
      s.update("loading",false); 
      build(target,value.is_comparison)() 
    })
}
