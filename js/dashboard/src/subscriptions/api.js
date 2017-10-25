import state from '@rockerbox/state'
import * as api from '@rockerbox/d3-api'

const s = state;

export default function init() {

  // Subscriptions that receive data / modify / change where it is stored

  state
    .subscribe("receive.data",function(error,value,state) {
      s.publishStatic("logic_categories",value.categories)
      s.prepareEvent("updateFilter")(false, state.filters, state)
      s.publish("filters",state.filters)
    })
    .subscribe("receive.comparison_data",function(error,value,state) {
      s.publish("filters",state.filters)
    })
    .subscribe("update.data", function(error,data,state) {
      

    })


  // Subscriptions that will get more data

  state
    .subscribe("get.action_date",function(error,value,state) {
      //s.publishStatic("data",api.action.getData(state.selected_action,state.action_date)) 
      // got rid of this because it is being used too often
    })
    .subscribe("get.comparison_date",function(error,value,state) {
      if (!value) return s.publishStatic("comparison_data",false)
      s.publishStatic("comparison_data",api.action.getData(state.selected_comparison,state.comparison_date))
    })
    .subscribe("get.selected_action",function(error,value,state) {
      s.publishStatic("data",api.action.getData(value,state.action_date))
    })
    .subscribe("get.selected_comparison",function(error,value,state) {
      if (!value) return s.publishStatic("comparison_data",false)
      s.publishStatic("comparison_data",api.action.getData(value,state.comparison_date))
    })


}
