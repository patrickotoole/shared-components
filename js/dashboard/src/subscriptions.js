import state from 'state'
import {qs} from 'state'
import * as api from 'api'
import * as data from './data'
import build from './build'
import historySubscriptions from './subscriptions/history'
import apiSubscriptions from './subscriptions/api'


const s = state;


export default function init() {

  historySubscriptions()
  apiSubscriptions()

  
  state
    .subscribe("change.loading", function(error,loading,value) { build()() })
    .subscribe("change.dashboard_options", s.prepareEvent("updateFilter"))
    .subscribe("change.tabs", s.prepareEvent("updateFilter")) 
    .subscribe("change.logic_options", s.prepareEvent("updateFilter") )
    .subscribe("update.filters", s.prepareEvent("updateFilter"))
    

  // REDRAW: this is where the entire app gets redrawn - if formatted_data changes, redraw the app

  state
    .subscribe("redraw.formatted_data", function(error,formatted_data,value) { 
      s.update("loading",false); 
      build()() 
    })
}
