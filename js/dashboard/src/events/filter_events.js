import state from 'state';

import {
  aggregateCategory,
  aggregateCategoryHour,
  categorySummary
} from '../helpers/data_helpers/category'

import {
  buildBeforeAndAfter,
  beforeAndAfterTabular
} from '../helpers/data_helpers/before_and_after'

import {
  buildKeywords
} from '../helpers/data_helpers/keywords'

import {
  buildTiming,
  timingTabular
} from '../helpers/data_helpers/timing'

import {
  buildUrlsTab
} from '../helpers/data_helpers/urls'

import {
  buildDomainsTab
} from '../helpers/data_helpers/domains'

import {
  buildSummary,
  determineLogic,
  prepareFilters,
  filterUrls
} from '../helpers'

const s = state;

export default function init() {
  const s = state;

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
    .registerEvent("logic.change", function(logic) { s.publish("logic_options",logic) })
    .registerEvent("filter.change", function(filters) { s.publishBatch({ "filters":filters }) })
    .registerEvent("updateFilter", function(err,_filters,_state) {


      if (_state.data == undefined) return 

      const filters = prepareFilters(_state.filters)
      const logic = determineLogic(_state.logic_options)
      const full_urls = filterUrls(_state.data.original_urls,logic,filters)

      if ( (_state.data.full_urls) && (_state.data.full_urls.length == full_urls.length) && 
           (_state.selected_comparison) && (_state.comparison_data == value.comparison) && 
           (_state.sortby == _state.before_urls.sortby)) return 



      // BASE DATASETS
      const value = {}

      value.full_urls = full_urls
      value.comparison = _state.comparison_data ?  _state.comparison_data.original_urls : _state.data.original_urls;

      //s.publishStatic("formatted_data",value)
      

      const cat_summary = categorySummary(value.full_urls,value.comparison)
      const summary = buildSummary(value.full_urls, value.comparison)

      s.setStatic("category_summary", cat_summary)
      s.setStatic("summary",summary)





      // MEDIA PLAN

      
      //value.display_categories = {"key": "Categories", values: aggregateCategory(full_urls)}
      //value.category_hour = aggregateCategoryHour(full_urls)

      const categories = aggregateCategory(full_urls)

      const media_plan = {
          display_categories: {"key": "Categories" , values: categories}
        , category_hour: aggregateCategoryHour(full_urls)
      }

      s.setStatic("media_plan", media_plan)
      




      // EXPLORE TABS
      var tabs = [
          buildDomainsTab(full_urls,categories)
        , {key:"Top Categories", values: cat_summary}
        , buildUrlsTab(full_urls,categories)
      ]

      if (_state.tabs) {
        _state.tabs.map((x,i) => {
          tabs[i].selected = x.selected
        })
      }

      s.setStatic("tabs",tabs)




      // TIMING
      const timing = buildTiming(value.full_urls, value.comparison)
      const timing_tabular = timingTabular(full_urls)
      const cat_timing_tabular = timingTabular(full_urls,"parent_category_name")
      const timing_tabs = [
          {"key":"Top Domains", "values": timing_tabular}
        , {"key":"Top Categories", "values": cat_timing_tabular}

      ]

      if (_state.tabs) {
        _state.tabs.map((x,i) => {
          if (timing_tabs[i]) timing_tabs[i].selected = x.selected
        })
      }



      s.setStatic("time_summary", timing)
      s.setStatic("time_tabs", timing_tabs)




      // BEFORE AND AFTER
      if (_state.data.before) {

        const catmap = (x) => Object.assign(x,{key:x.parent_category_name})

        const before_urls = filterUrls(_state.data.before,logic,filters).map(x => Object.assign({key:x.domain},x) )
          , after_urls = filterUrls(_state.data.after,logic,filters).map(x => Object.assign({key:x.domain},x) )
          , before_and_after = buildBeforeAndAfter(before_urls,after_urls,cat_summary,_state.sortby)
          , before_after_tabular = beforeAndAfterTabular(before_urls,after_urls)
          , cat_before_after_tabular = beforeAndAfterTabular(before_urls.map(catmap),after_urls.map(catmap))

        const before_tabs = [
            {key:"Top Domains",values:before_after_tabular}
          , {key:"Top Categories",values:cat_before_after_tabular}
        ]

      if (_state.tabs) {
        _state.tabs.map((x,i) => {
          if (before_tabs[i]) before_tabs[i].selected = x.selected
        })
      }

        s.setStatic("before_urls",before_and_after) 
        s.setStatic("before_tabs",before_tabs)

      }



      // KEYWORDS
      //s.setStatic("keyword_summary", buildKeywords(value.full_urls,value.comparions)) 




      
      s.publishStatic("formatted_data",value)
    })
}
