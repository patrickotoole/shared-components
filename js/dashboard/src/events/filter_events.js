import {s as state} from '@rockerbox/state';

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

      const domain_idfs = d3.nest()
        .key(x => x.domain)
        .rollup(x => x[0].idf)
        .map(full_urls)

      const category_idfs = d3.nest()
        .key(x => x.parent_category_name)
        .rollup(x => x[0].category_idf)
        .map(full_urls)

      s.setStatic("domain_idfs",domain_idfs)
      s.setStatic("category_idfs",category_idfs)

      





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
        //, buildUrlsTab(full_urls,categories)
      ]

      

      if (_state.tab_position) {
        tabs.map(x => x.selected = (x.key == _state.tab_position) )
      }

      s.setStatic("tabs",tabs)


      // EXECUTION PLAN
      const domains_rolled = d3.nest()
        .key(x => x.domain)
        .rollup(x => { return {"idf":x[0].idf,"count":x.length} })
        .entries(full_urls)

      const times_rolled = d3.nest()
        .key(x => parseInt(x.hour) -12 > 0 ? (parseInt(x.hour) - 12) + "pm" : parseInt(x.hour) +"am")
        .rollup(x => x.length)
        .entries(full_urls)


      const edomains = tabs[0].values.sort((p,c) => c.importance - p.importance).slice(0,10)


      s.setStatic("execution_plan", {
          "categories": tabs[1].values.sort((p,c) => c.importance - p.importance).slice(0,10)
        , "domains": edomains
        , "articles": edomains.map(x => { return {"key": x.urls[0]} }).slice(0,20)
        , "times": times_rolled.sort((p,c) => { return p.count - c.count }).slice(0,8)
        , "filters_used": _state.filters
      })
      s.setStatic("category_idfs",category_idfs)





      // TIMING
      const timing = buildTiming(value.full_urls, value.comparison)
      const timing_tabular = timingTabular(full_urls)
      const cat_timing_tabular = timingTabular(full_urls,"parent_category_name")
      const timing_tabs = [
          {"key":"Top Domains", "values": timing_tabular, "data": value.full_urls}
        , {"key":"Top Categories", "values": cat_timing_tabular}

      ]

      if (_state.tab_position) {
        timing_tabs.map(x => x.selected = (x.key == _state.tab_position) )
      }



      s.setStatic("time_summary", timing)
      s.setStatic("time_tabs", timing_tabs)




      // BEFORE AND AFTER
      if (_state.data.before) {

        

        const catmap = (x) => Object.assign(x,{key:x.parent_category_name})
        const urlmap = (x) => Object.assign({key:x.domain, idf: domain_idfs[x.domain]},x)

        const before_urls = filterUrls(_state.data.before,logic,filters).map(urlmap)
          , after_urls = filterUrls(_state.data.after,logic,filters).map(urlmap)
          , before_and_after = buildBeforeAndAfter(before_urls,after_urls,cat_summary,_state.sortby)
          , before_after_tabular = beforeAndAfterTabular(before_urls,after_urls)
          , cat_before_after_tabular = beforeAndAfterTabular(before_urls.map(catmap),after_urls.map(catmap))

        const before_tabs = [
            {key:"Top Domains",values:before_after_tabular,data:before_and_after}
          , {key:"Top Categories",values:cat_before_after_tabular,data:before_and_after}
        ]

        if (_state.tab_position) {
          before_tabs.map(x => x.selected = (x.key == _state.tab_position) )
        }


        s.setStatic("before_urls",before_and_after) 
        s.setStatic("before_tabs",before_tabs)

      }



      // KEYWORDS
      //s.setStatic("keyword_summary", buildKeywords(value.full_urls,value.comparions)) 




      
      s.publishStatic("formatted_data",value)
    })
}
