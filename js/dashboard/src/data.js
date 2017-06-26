//import * as d3 from 'd3'

export function buildCategories(value) {
  var categories = d3.nest()
    .key(function(x){ return x.parent_category_name})
    .rollup(function(v) {
      return v.reduce(function(p,c) { return p + c.uniques },0)
    })
    .entries(value.full_urls)

  var total = categories.reduce(function(p,c) { return p + c.values },0)

  categories.map(function(x) {
    x.value = x.values
    x.percent = x.value / total
  })

  value["display_categories"] = {
      "key":"Categories"
    , "values": categories.filter(function(x) { return x.key != "NA" })
  }
}

export function buildCategoryHour(value) {
  var category_hour = d3.nest()
    .key(function(x){ return x.parent_category_name + x.hour + x.minute})
    .rollup(function(v) {
      return {
          "parent_category_name": v[0].parent_category_name
        , "hour": v[0].hour
        , "minute": v[0].minute 
        , "count":v.reduce(function(p,c) { return p + c.count },0)
      }
    })
    .entries(value.full_urls)
    .map(function(x) { return x.values })

  value["category_hour"] = category_hour
 
}

export function buildData(data,buckets,pop_categories) {

  var times = d3.nest()
    .key(function(x) { return x.time_diff_bucket })
    .map(data.filter(function(x){ return x.parent_category_name != "" }) )

  var cats = d3.nest()
    .key(function(x) { return x.parent_category_name })
    .map(data.filter(function(x){ return x.parent_category_name != "" }) )




  var time_categories = buckets.reduce(function(p,c) { p[c] = {}; return p }, {})
  var category_times = Object.keys(cats).reduce(function(p,c) { p[c] = {}; return p }, {})


  var categories = d3.nest()
    .key(function(x) { return x.parent_category_name })
    .key(function(x) { return x.time_diff_bucket })
    .entries(data.filter(function(x){ return x.parent_category_name != "" }) )
    .map(function(row) {
      row.values.map(function(t) {
        t.percent = d3.sum(t.values,function(d){ return d.uniques})/ d3.sum(times[t.key],function(d) {return d.uniques}) 
        time_categories[t.key][row.key] = t.percent
        category_times[row.key][t.key] = t.percent

      })
      return row
    })
    .sort(function(a,b) { return ((pop_categories[b.key] || {}).normalized_pop || 0)- ((pop_categories[a.key] || {}).normalized_pop || 0) })


  var time_normalize_scales = {}

  d3.entries(time_categories).map(function(trow) {
    var values = d3.entries(trow.value).map(function(x) { return x.value })
    time_normalize_scales[trow.key] = d3.scale.linear()
      .domain([d3.min(values),d3.max(values)])
      .range([0,1])
  })

  var cat_normalize_scales = {}

  d3.entries(category_times).map(function(trow) {
    var values = d3.entries(trow.value).map(function(x) { return x.value })
    cat_normalize_scales[trow.key] = d3.scale.linear()
      .domain([d3.min(values),d3.max(values)])
      .range([0,1])
  })

  categories.map(function(p) {
    var cat = p.key
    p.values.map(function(q) {
      q.norm_cat = cat_normalize_scales[cat](q.percent)
      q.norm_time = time_normalize_scales[q.key](q.percent)

      q.score = 2*q.norm_cat/3 + q.norm_time/3
      q.score = q.norm_time

      var percent_pop = pop_categories[cat] ? pop_categories[cat].percent_pop : 0

      q.percent_diff = (q.percent - percent_pop)/percent_pop

    })
  })

  return categories
}
