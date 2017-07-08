import state from 'state';
import {filter_data} from 'filter';
import {
  aggregateCategory,
  aggregateCategoryHour,
  categorySummary
} from '../helpers/data_helpers/category'

import {
  buildData, 
  buildDomains, 
  buildUrls, 
  buildSummaryData, 
  buildSummaryAggregation, 
  prepData, 
  prepareFilters
} from '../helpers'

const s = state;






var ops = {
    "is in": function(field,value) {
        return function(x) {
          var values = value.split(",")
          return values.reduce(function(p,value) { return p + String(x[field]).indexOf(String(value)) > -1 }, 0) > 0
        } 
      }
  , "is not in": function(field,value) {
        return function(x) {
          var values = value.split(",")
          return values.reduce(function(p,value) { return p + String(x[field]).indexOf(String(value)) > -1 }, 0) == 0
        } 
      }
}

      function determineLogic(options) {
        const _default = options[0]
        const selected = options.filter(function(x) { return x.selected })
        return selected.length > 0 ? selected[0] : _default
      }

function filterUrls(urls,logic,filters) {
  return filter_data(urls)
    .op("is in", ops["is in"])
    .op("is not in", ops["is not in"])
    .logic(logic.value)
    .by(filters)
}

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


      // No change in filter, or comparison
      if ( (_state.data.full_urls) && (_state.data.full_urls.length == full_urls.length) && 
           (_state.selected_comparison && (_state.comparison_data == value.comparison))) return 



      const value = {}

      value.full_urls = full_urls

      var compareTo = _state.comparison_data ? 
        _state.comparison_data.original_urls : 
        _state.data.original_urls;

      value.comparison = compareTo



      // MEDIA PLAN

      value.display_categories = {"key": "Categories", values: aggregateCategory(full_urls)}
      value.category_hour = aggregateCategoryHour(full_urls)


      // EXPLORE TABS

      var cat_summary = categorySummary(value.full_urls,value.comparison)

      var tabs = [
          buildDomains(value)
        , buildUrls(value)
        , {key:"Top Categories", values: cat_summary}
      ]

      if (_state.tabs) {
        _state.tabs.map((x,i) => {
          tabs[i].selected = x.selected
        })
      }




      var summary_data = buildSummaryData(value.full_urls)
        , pop_summary_data = buildSummaryData(compareTo)

      var summary = buildSummaryAggregation(summary_data,pop_summary_data)

      var ts = prepData(value.full_urls)
        , pop_ts = prepData(compareTo)

      var mappedts = ts.reduce(function(p,c) { p[c.key] = c; return p}, {})

      var prepped = pop_ts.map(function(x) {
        return {
            key: x.key
          , hour: x.hour
          , minute: x.minute
          , value2: x.value
          , value: mappedts[x.key] ?  mappedts[x.key].value : 0
        }
      })


      

      //var parseWords = function(p,c) {
      //  var splitted = c.url.split(".com/")
      //  if (splitted.length > 1) {
      //    var last = splitted[1].split("/").slice(-1)[0].split("?")[0]
      //    var words = last.split("-").join("+").split("+").join("_").split("_").join(" ").split(" ")
      //    words.map(function(w) { 
      //      if ((w.length <= 4) || (String(parseInt(w[0])) == w[0] ) || (w.indexOf("asp") > -1) || (w.indexOf("php") > -1) || (w.indexOf("html") > -1) ) return
      //      p[w] = p[w] ? p[w] + 1 : 1
      //    })
      //  }
      //  return p
      //}

      //var pop_counts = compareTo.reduce(parseWords,{})
      //var samp_counts = value.full_urls.reduce(parseWords,{})


      //var entries = d3.entries(pop_counts).filter(function(x) { return x.value > 1})
      //  .map(function(x) {
      //    x.samp = samp_counts[x.key]
      //    x.pop = x.value
      //    return x
      //  })
      //  .sort(function(a,b) { return b.pop - a.pop})
      //  .slice(0,25)


      

      //modifyWithComparisons(cat_summary)
      //modifyWithComparisons(entries)


      if (_state.data.before) {
        var before_urls = filter_data(_state.data.before)
          .op("is in", ops["is in"])
          .op("is not in", ops["is not in"])
          //.op("does not contain", ops["does not contain"])
          //.op("contains", ops["contains"])
          .logic(logic.value)
          .by(filters)

        var after_urls = filter_data(_state.data.after)
          .op("is in", ops["is in"])
          .op("is not in", ops["is not in"])
          //.op("does not contain", ops["does not contain"])
          //.op("contains", ops["contains"])
          .logic(logic.value)
          .by(filters)


        var bu = d3.nest()
          .key(function(x) { return x.parent_category_name })
          .key(function(x) { return x.time_diff_bucket })
          .entries(before_urls)

        var au = d3.nest()
          .key(function(x) { return x.parent_category_name })
          .key(function(x) { return x.time_diff_bucket })
          .entries(after_urls)

        var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })
          , pop_categories = cat_summary.reduce(function(p,c) { p[c.key] = c; return p }, {})
          , cats = cat_summary.map(function(p) { return p.key })

        var before_categories = buildData(before_urls,buckets,pop_categories)
          , after_categories = buildData(after_urls,buckets,pop_categories)

        var sortby = _state.sortby

        if (sortby == "score") {

          before_categories = before_categories.sort(function(a,b) { 
            var p = -1, q = -1;
            try { p = b.values.filter(function(x){ return x.key == "600" })[0].score } catch(e) {}
            try { q = a.values.filter(function(x){ return x.key == "600" })[0].score } catch(e) {}
            return d3.ascending(p, q)
          })
          
        } else if (sortby == "pop") {

          before_categories = before_categories.sort(function(a,b) { 
            var p = cats.indexOf(a.key)
              , q = cats.indexOf(b.key)
            return d3.ascending(p > -1 ? p : 10000, q > -1 ? q : 10000)
          })

        } else {

          before_categories = before_categories.sort(function(a,b) { 
            var p = -1, q = -1;
            try { p = b.values.filter(function(x){ return x.key == "600" })[0].percent_diff } catch(e) {}
            try { q = a.values.filter(function(x){ return x.key == "600" })[0].percent_diff } catch(e) {}
            return d3.ascending(p, q)
          })

          
        }


        var order = before_categories.map(function(x) { return x.key })

        after_categories = after_categories.filter(function(x){return order.indexOf(x.key) > -1}).sort(function(a,b) {
          return order.indexOf(a.key) - order.indexOf(b.key)
        })

        s.setStatic("before_urls",{"after":after_urls,"before":before_urls,"category":cat_summary,"before_categories":before_categories,"after_categories":after_categories,"sortby":value.sortby}) 
        s.setStatic("after_urls", after_urls)

        


      }


      

      

      
      

      //s.setStatic("keyword_summary", entries) 
      s.setStatic("time_summary", prepped)
      s.setStatic("category_summary", cat_summary)

      s.setStatic("summary",summary)
      s.setStatic("tabs",tabs)


      s.publishStatic("formatted_data",value)

    })
}
