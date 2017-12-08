import { filter_data } from '@rockerbox/filter';
import { buildData } from '../../helpers'
import d3 from 'd3'

function prefixReducer(prefix, p,c) {
  p[c.key] = p[c.key] || {}
  p[c.key]['key'] = c.key
  p[c.key]['parent_category_name'] = c.parent_category_name
  p[c.key]['idf'] = c.idf

  p[c.key]['total'] = (p[c.key]['total'] || 0) + c.visits

  
  p[c.key][prefix + c.time_diff_bucket] = (p[c.key][prefix + c.time_diff_bucket] || 0) + c.visits
  return p
}
export const beforeAndAfterTabular = (before, after) => {
  const domain_time = {}

  before.reduce(prefixReducer.bind(false,""),domain_time)
  after.reduce(prefixReducer.bind(false,"-"),domain_time)

  const sorted = Object.keys(domain_time)
    .map((k) => { return domain_time[k] })

  return sorted
}


export function buildBeforeAndAfter(before_urls,after_urls,cat_summary,sort_by) {

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

  try {
    var before_categories = buildData(before_urls,buckets,pop_categories)
      , after_categories = buildData(after_urls,buckets,pop_categories)
  } catch(e) {
    before_categories = before_categories || []
    after_categories = after_categories || []
  }

  var sortby = sort_by

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

  after_categories = after_categories
    .filter(function(x){return order.indexOf(x.key) > -1})
    .sort(function(a,b) {
      return order.indexOf(a.key) - order.indexOf(b.key)
    })

  return {
      "after":after_urls
    , "before":before_urls
    , "category":cat_summary
    , "before_categories":before_categories
    , "after_categories":after_categories
    , "sortby":sort_by
  }
}
