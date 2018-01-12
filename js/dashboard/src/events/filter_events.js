import {s as state} from '@rockerbox/state';
import d3 from 'd3';


// TODO: move these helpers to a better place
import {
  findBounds, 
  streamData
} from '../views/summary/before_and_after' 


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
  timingTabular,
  timingRelative,
  timingRelativeRows,
  formatHour,
  hourbuckets
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


// TODO: move these objects
function countKey(data, key) {
  let counts = d3.nest()
    .key(x => x[key])
    .rollup(v => v.length)
    .entries(data)

  let total = d3.sum(counts,x => x.values)
  counts.map(x => x.percent = x.values/total)

  return counts

}

function diff(target, baseline) {
  let baselinePercent = baseline.reduce((p,c) => {
      p[c.key] = c.percent
      return p
    }, {})

  target.map(x => {
    if (x.percent > baselinePercent[x.key]) {
      x.diff = (x.percent - baselinePercent[x.key]) / baselinePercent[x.key]
    } else {
      x.diff = -(baselinePercent[x.key] - x.percent) / baselinePercent[x.key]
    }

    return x
  })

  return target
}

function desc(p,c) {
  return c.diff - p.diff
}

export function updateFilter(s) {
  return function(err,_filters,_state) {
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
      , {key:"Top Categories", values: cat_summary.filter(x => x.samp > 0)}
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

    const urls_rolled = d3.nest()
      .key(x => x.url)
      .rollup(x => { return {"idf":x[0].idf,"count":x.length, "importance":x.length*x[0].idf, "parent_category_name": x[0].parent_category_name, "url":x[0].url } })
      .entries(full_urls)
      .map(x => x.values)
      .sort((a,b) => b.count - a.count)
      


    const times_rolled = d3.nest()
      .key(x => formatHour(x.hour))
      .rollup(x => x.length)
      .entries(full_urls)


    const edomains = tabs[0].values.sort((p,c) => c.importance - p.importance)


    s.setStatic("execution_plan", {
        "categories": tabs[1].values.sort((p,c) => c.importance - p.importance).slice(0,10000)
      , "urls": urls_rolled.slice(0,100000)
      , "domains": edomains.slice(0,1000)
      , "articles": edomains.map(x => { return {"key": x.urls[0]} }).slice(0,20)
      , "times": times_rolled.sort((p,c) => { return p.count - c.count }).slice(0,8)
      , "filters_used": _state.filters
    })
    s.setStatic("category_idfs",category_idfs)






    




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


      // STAGES: CONSIDERATION, VALIDATION, BASELINE
  
      let a = before_and_after.after_categories
        , b = before_and_after.before_categories
        , buckets = [0,10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })

      var {before_stacked, after_stacked} = streamData(b, a, buckets)
      var {before_line, after_line} = findBounds(before_stacked, after_stacked, buckets)

      var consideration = before_and_after.before.filter(x => x.time_diff_bucket <= before_line)
      var validation = before_and_after.after.filter(x => x.time_diff_bucket <= after_line)

      var baseline_before = before_and_after.before.filter(x => x.time_diff_bucket > before_line)
        , baseline_after = before_and_after.after.filter(x => x.time_diff_bucket > after_line)
        , baseline = baseline_before.concat(baseline_after)

      var category_baseline = countKey(baseline, "parent_category_name")
        , category_consideration = diff(countKey(consideration,"parent_category_name"),category_baseline).sort(desc)
        , category_validation = diff(countKey(validation, "parent_category_name"),category_baseline).sort(desc)

      var stage_values = {
          consideration: consideration
        , validation: validation
        , baseline: baseline
      }

      var stage_categories = {
          consideration: category_consideration
        , validation: category_validation
        , baseline: category_baseline
      }

      const stage_tabs = [
        { "key":"Top Domains", "values": stage_values, "category": stage_categories  }
      ]

      s.setStatic("stage_tabs",stage_tabs)

      
  
  
      // TIMING AND BA

      _state.data.before_hour.map(x => { 
        x.stage = Math.abs(x.time_diff_bucket) <= before_line ? "Consideration" : "Baseline" 
      })

      _state.data.after_hour.map(x => { 
        x.stage = Math.abs(x.time_diff_bucket) <= after_line ? "Evaluation" : "Baseline"
        x.time_diff_bucket = (x.time_diff_bucket > 0) ? -x.time_diff_bucket : x.time_diff_bucket
      })
      
      //const full_urls = filterUrls(_state.data.original_urls,logic,filters)

      const before = filterUrls(_state.data.before_hour, logic, filters)
        , after = filterUrls(_state.data.after_hour, logic, filters)
        , combined = before.concat(after)
  
      const percentRelativeTabular = timingRelative(combined)
      const stageRelativeTabular = timingRelative(combined,"stage")

      const nonbaseline_total = stageRelativeTabular.reduce((p,row) => {
        if (row.key !== "Baseline") {
          const keys = Object.keys(row)
          p = Math.max(p,d3.sum(keys.map(k => { if (k !== "total" && k !== "key") return row[k] })) )
        }
        return p
      },0)
     
      stageRelativeTabular.map(row => {

        if (row.key == "Baseline") {
          const keys = Object.keys(row)
          const total = d3.sum(keys.map(k => { if (k !== "total" && k !== "key") return row[k] }))
          keys.map(k => { if (k !== "total" && k !== "key") row[k] = row[k]/total*nonbaseline_total })
          return row
        }

      })

      const considerationRow = stageRelativeTabular.filter(x => x.key == "Consideration" )[0] || {}

      let considerationItems = 0
      let considerationSum = 0


      const considerationArray = hourbuckets.map(formatHour).map(x => {
        if (considerationRow[x]) {
          considerationItems ++
          considerationSum += considerationRow[x]
        }

        return {"key":x, "values": considerationRow[x] || 0 }
      })

      considerationMean = considerationSum/considerationItems

      considerationArray.map(x => {
        x.values = (x.values - considerationMean)/considerationMean
      })

      const online = times_rolled.sort((p,c) => { return p.values - c.values})
        , exposure = times_rolled.sort((p,c) => { return c.values - p.values}).slice(0,8)
        , exposureMap = d3.map(exposure,x => x.key)
        , correlation = considerationArray
            .filter(x => x.values > 0)
            .sort((p,c) => { return c.values - p.values})
        , engagement = considerationArray
            .filter((x,i) => x.values > 0 )
            .filter((x,i) => !!exposureMap.get(x.key) )
            .sort((p,c) => { return c.values - p.values})
            .slice(0,6)
        , engagementMap = d3.map(engagement,x => x.key)


      const [rolled, rows] = timingRelativeRows(before,"stage")

      const rawEngagement = rolled.filter(x => x.key =="Consideration|Consideration")
        .reduce((p,x) => x.values, [])
        .filter(x => !!engagementMap.get(formatHour(x.key)) )
        .reduce((p,c) => {
          const _p = p.concat(c.values.values)
          return _p
        },[])

      const engagement_domains = d3.nest()
        .key(x => x.domain)
        .rollup(v => {
          return {
              urls: v.map(x => x.url)
            , count: v.length
            , tf_idf: v.length*domain_idfs[v[0].domain]
          }
        })
        .entries(rawEngagement)
        .sort((p,c) => c.values.tf_idf - p.values.tf_idf)
        .slice(0,20)
     


      s.setStatic("distribution_plan", {
          "times": online
        , "exposure_times": exposure
        , "correlation_times": correlation
        , "engagement_times": engagement
        , "engagement_sites": engagement_domains
        , "engagement_articles": engagement_domains.filter(x => x.values.count).map(x => { return {"key": x.values.urls[0]} }).slice(0,20)

        , "filters_used": _state.filters
        , "action_used": _state.selected_action
      })




      // TIMING
      const timing = buildTiming(value.full_urls, value.comparison)
      const timing_tabular = timingTabular(full_urls)
      const cat_timing_tabular = timingTabular(full_urls,"parent_category_name")
      const timing_tabs = [
          {"key":"Top Domains", "values": timing_tabular, "data": value.full_urls}
        , {"key":"Top Categories", "values": cat_timing_tabular}
        , {"key":"Time to Site", "values": percentRelativeTabular}
        , {"key":"Stages", "values": stageRelativeTabular}



      ]

      if (_state.tab_position) {
        timing_tabs.map(x => x.selected = (x.key == _state.tab_position) )
      }



      s.setStatic("time_summary", timing)
      s.setStatic("time_tabs", timing_tabs)


    }



    // KEYWORDS
    //s.setStatic("keyword_summary", buildKeywords(value.full_urls,value.comparions)) 




    
    s.publishStatic("formatted_data",value)
  }
}

export default function init() {

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
    .registerEvent("updateFilter", updateFilter(state))

}
