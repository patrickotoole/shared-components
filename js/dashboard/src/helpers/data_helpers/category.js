export function aggregateCategory(urls) {
  const categories = d3.nest()
    .key(function(x){ return x.parent_category_name})
    .rollup(function(v) { 
      return {
          "articles": v
        , "value": d3.sum(v,x => x.uniques)
      } 
    })
    .entries(urls)
    .map(function(v) { return Object.assign(v.values,{key: v.key}) })

  const total = d3.sum(categories,c => c.value)

  categories.map(function(x) {
    x.percent = x.value / total
  })

  return categories
}

export function aggregateCategoryHour(urls) {
  return d3.nest()
    .key(function(x){ return x.parent_category_name + x.hour + x.minute})
    .rollup(function(v) {
      return {
          "parent_category_name": v[0].parent_category_name
        , "hour": v[0].hour
        , "minute": v[0].minute 
        , "count": v.reduce(function(p,c) { return p + c.count },0)
        , "articles": v
      }
    })
    .entries(urls)
    .map(function(x) { return x.values })
}

export function categoryRelativeSize(urls) {
  return d3.nest()
    .key(x => x.parent_category_name)
    .rollup(v => v[0].category_idf ? 1/v[0].category_idf : 0)
    .map(urls) 
}

export function categoryPercent(urls) {

  const relative_size = categoryRelativeSize(urls)
  const total = d3.sum(Object.keys(categories).map(x => categories[x]))
  const percent = {}

  Object.keys(categories).map(x => {
    percent[x] = relative_size[x]/total
  })

  return percent
}

function categoryReducer(group) {
  return group.reduce(function(p,c) {
      p.views += c.count
      p.sessions += c.uniques
      return p
    },
    { 
        articles: {}
      , views: 0
      , sessions: 0
      , pop_size: group[0].category_idf ? 1/group[0].category_idf : 0
      , idf: group[0].category_idf
    })
}

export function categoryRoll(urls) {
  const rolled = d3.nest()
    .key(function(k) { return k.parent_category_name })
    .rollup(categoryReducer)
    .entries(urls)

  const pop_total = d3.sum(rolled,x => x.values.pop_size)
  const views_total = d3.sum(rolled,x => x.values.views)

  rolled.map(x => {
    x.values.real_pop_percent = x.values.pop_percent = (x.values.pop_size / pop_total * 100)
    x.values.percent = x.values.views/views_total

  })

  return rolled
}

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

export function categorySummary(samp_urls,pop_urls) {

  const samp_rolled = categoryRoll(samp_urls)
    , pop_rolled = categoryRoll(pop_urls)
    , mapped_cat_roll = samp_rolled.reduce(function(p,c) { 
        p[c.key] = c; 
        return p
      }, {})

  const cat_summary = pop_rolled.map(function(x) {

    [x.values].map(y => {
        y.key = x.key
        y.pop = y.views
        y.samp = mapped_cat_roll[x.key] ? mapped_cat_roll[x.key].values.views : 0

        y.sample_percent_norm = y.sample_percent = y.percent*100
        y.importance = Math.log((1/y.pop_size)*y.samp*y.samp)
        y.ratio = y.sample_percent/y.real_pop_percent
        y.value = y.samp
    })


    return x.values
  }).sort(function(a,b) { return b.pop - a.pop})
    .filter(function(x) { return x.key != "NA" })

  modifyWithComparisons(cat_summary)

  return cat_summary
}


export function buildCategories(value) {

  const categories = aggregateCategory(value.full_urls)
  value["display_categories"] = {
      "key":"Categories"
    , "values": categories.filter(function(x) { return x.key != "NA" })
  }

}

export function buildCategoryHour(value) {
  value["category_hour"] = aggregateCategoryHour(value.full_urls)
}
