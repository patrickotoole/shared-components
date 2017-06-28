import state from 'state';
import {filter_data} from 'filter';
import {
  buildCategories, 
  buildCategoryHour, 
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

    .registerEvent("updateFilter", function(err,filters,_state) {

      var filters = _state.filters
      var value = _state.data

      if (value == undefined) return // return early if there is no data...

      var filters = prepareFilters(filters)

      var logic = _state.logic_options.filter(function(x) { return x.selected })
      logic = logic.length > 0 ? logic[0] : _state.logic_options[0]

      var full_urls = filter_data(value.original_urls)
        .op("is in", ops["is in"])
        .op("is not in", ops["is not in"])
        .logic(logic.value)
        .by(filters)


      // should not filter if...
      //debugger

      if ( (value.full_urls) && 
           (value.full_urls.length == full_urls.length) && 
           (_state.selected_comparison && (_state.comparison_data == value.comparison))) return

      value.full_urls = full_urls

      var compareTo = _state.comparison_data ? _state.comparison_data.original_urls : value.original_urls;

      value.comparison = compareTo

      // all this logic should be move to the respective views...

      // ----- START : FOR MEDIA PLAN ----- //

      buildCategories(value)
      buildCategoryHour(value)

      // ----- END : FOR MEDIA PLAN ----- //

      var tabs = [
          buildDomains(value)
        , buildUrls(value)
        //, buildTopics(value)
      ]

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

      var cat_roll = d3.nest()
        .key(function(k) { return k.parent_category_name })
        .rollup(function(v) {
          return v.reduce(function(p,c) {
            p.views += c.count
            p.sessions += c.uniques
            return p
          },{ articles: {}, views: 0, sessions: 0})
        })
        .entries(value.full_urls)

      var pop_cat_roll = d3.nest()
        .key(function(k) { return k.parent_category_name })
        .rollup(function(v) {
          return v.reduce(function(p,c) {
            p.views += c.count
            p.sessions += c.uniques
            return p
          },{ articles: {}, views: 0, sessions: 0})
        })
        .entries(compareTo)

      var mapped_cat_roll = cat_roll.reduce(function(p,c) { p[c.key] = c; return p}, {})

      var cat_summary = pop_cat_roll.map(function(x) {
        return {
            key: x.key
          , pop: x.values.views
          , samp: mapped_cat_roll[x.key] ? mapped_cat_roll[x.key].values.views : 0
        }
      }).sort(function(a,b) { return b.pop - a.pop})
        .filter(function(x) { return x.key != "NA" })

      var parseWords = function(p,c) {
        var splitted = c.url.split(".com/")
        if (splitted.length > 1) {
          var last = splitted[1].split("/").slice(-1)[0].split("?")[0]
          var words = last.split("-").join("+").split("+").join("_").split("_").join(" ").split(" ")
          words.map(function(w) { 
            if ((w.length <= 4) || (String(parseInt(w[0])) == w[0] ) || (w.indexOf("asp") > -1) || (w.indexOf("php") > -1) || (w.indexOf("html") > -1) ) return
            p[w] = p[w] ? p[w] + 1 : 1
          })
        }
        return p
      }

      var pop_counts = compareTo.reduce(parseWords,{})
      var samp_counts = value.full_urls.reduce(parseWords,{})


      var entries = d3.entries(pop_counts).filter(function(x) { return x.value > 1})
        .map(function(x) {
          x.samp = samp_counts[x.key]
          x.pop = x.value
          return x
        })
        .sort(function(a,b) { return b.pop - a.pop})
        .slice(0,25)


      var modifyWithComparisons = function(ds) {

        var aggs = ds.reduce(function(p,c) {
          p.pop_max = (p.pop_max || 0) < c.pop ? c.pop : p.pop_max
          p.pop_total = (p.pop_total || 0) + c.pop

          if (c.samp) {
            p.samp_max = (p.samp_max || 0) > c.samp ? p.samp_max : c.samp
            p.samp_total = (p.samp_total || 0) + c.samp
          }

          return p
        },{})

        //console.log(aggs)

        ds.map(function(o) {
          o.normalized_pop = o.pop / aggs.pop_max
          o.percent_pop = o.pop / aggs.pop_total

          o.normalized_samp = o.samp / aggs.samp_max
          o.percent_samp = o.samp / aggs.samp_total

          o.normalized_diff = (o.normalized_samp - o.normalized_pop)/o.normalized_pop
          o.percent_diff = (o.percent_samp - o.percent_pop)/o.percent_pop
        })
      }

      modifyWithComparisons(cat_summary)
      modifyWithComparisons(entries)


      if (value.before) {
        var before_urls = filter_data(value.before)
          .op("is in", ops["is in"])
          .op("is not in", ops["is not in"])
          //.op("does not contain", ops["does not contain"])
          //.op("contains", ops["contains"])
          .logic(logic.value)
          .by(filters)

        var after_urls = filter_data(value.after)
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

      

      s.setStatic("keyword_summary", entries) 
      s.setStatic("time_summary", prepped)
      s.setStatic("category_summary", cat_summary)

      s.setStatic("summary",summary)
      s.setStatic("tabs",tabs)
      s.publishStatic("formatted_data",value)

    })
}
