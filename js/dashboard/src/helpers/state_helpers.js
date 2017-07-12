import * as state from 'state'

export function compare(qs_state,_state) {

  var updates = {}


  state.comp_eval(qs_state,_state,updates)
    .accessor(
        "selected_action"
      , (x,y) => y.actions.filter(z => z.action_id == x.selected_action)[0]
      , (x,y) => y.selected_action
    )
    .failure("selected_action", (_new,_old,obj) => { 
      Object.assign(obj,{
          "loading": true
        , "selected_action": _new
      })
    })
    .accessor(
        "tab_position"
      , (x,y) => x.tab_position
      , (_,y) => y.tab_position
    )
    .failure("tab_position", (_new,_old,obj) => {
      Object.assign(obj, { "tab_position": _new })
    })

    .accessor(
        "transform"
      , (x,y) => x.transform
      , (_,y) => y.transform
    )
    .failure("transform", (_new,_old,obj) => {
      Object.assign(obj, { "transform": _new })
    })



    .accessor(
        "sort"
      , (x,y) => x.sort
      , (_,y) => y.sort
    )
    .failure("sort", (_new,_old,obj) => {
      Object.assign(obj, { "sort": _new })
    })


    .accessor(
        "ascending"
      , (x,y) => x.ascending
      , (_,y) => y.ascending
    )
    .failure("ascending", (_new,_old,obj) => {
      Object.assign(obj, { "ascending": _new })
    })


    .accessor(
        "selected_view"
      , (x,y) => x.selected_view
      , (_,y) => y.dashboard_options.filter(x => x.selected)[0].value 
    )
    .failure("selected_view", (_new,_old,obj) => {
      // this should be redone so its not different like this
      Object.assign(obj, {
          "loading": true
        , "dashboard_options": JSON.parse(JSON.stringify(_state.dashboard_options)).map(x => { 
            x.selected = (x.value == _new); 
            return x 
          })
      })
    })
    .accessor(
        "selected_comparison"
      , (x,y) => y.actions.filter(z => z.action_id == x.selected_comparison)[0]
      , (x,y) => y.selected_comparison
    )
    .failure("selected_comparison", (_new,_old,obj) => { 
      Object.assign(obj,{
          "loading": true
        , "selected_comparison": _new
      })
    })
    .equal("filters", (x,y) => JSON.stringify(x) == JSON.stringify(y) )
    .failure("filters", (_new,_old,obj) => { 
      Object.assign(obj,{
          "loading": true
        , "filters": _new || [{}]
      })
    })
    .failure("action_date", (_new,_old,obj) => { 
      Object.assign(obj,{ loading: true, "action_date": _new })
    })
    .failure("comparison_date", (_new,_old,obj) => { 
      Object.assign(obj,{ loading: true, "comparison_date": _new })
    })

    .evaluate()

  var current = state.qs({}).to(_state.qs_state || {})
    , pop = state.qs({}).to(qs_state)

  if (Object.keys(updates).length && current != pop) {
    return updates
  }

  return {}
  
}
