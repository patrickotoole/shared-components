export function aggregateDomains(urls,categories) {
  var categories = categories
    .filter(function(a) { return a.selected })
    .map(function(a) { return a.key })

  var idf = d3.nest()
    .key(function(x) {return x.domain })
    .rollup(function(x) {return x[0].idf })
    .map(urls.filter(function(x){ return x.parent_category_name != "Internet & Telecom"}) )

  var getIDF = function(x) {
    return (idf[x] == "NA") || (idf[x] > 8686) ? 0 : idf[x]
  }

  var values = urls
    .map(function(x) { 
      return {
          "key":x.domain
        , "value":x.count
        , "parent_category_name": x.parent_category_name
        , "uniques": x.uniques 
        , "url": x.url
      } 
    })



  values = d3.nest()
    .key(function(x){ return x.key})
    .rollup(function(x) { 
       return {
           "parent_category_name": x[0].parent_category_name
         , "key": x[0].key
         , "value": x.reduce(function(p,c) { return p + c.value},0)
         , "percent_unique": x.reduce(function(p,c) { return p + c.uniques/c.value},0)/x.length
         , "urls": x.reduce(function(p,c) { p.indexOf(c.url) == -1 ? p.push(c.url) : p; return p },[])

       } 
    })
    .entries(values).map(function(x){ return x.values })

  if (categories.length > 0)
    values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 })

  values.map(function(x) {
    x.tf_idf = getIDF(x.key) * (x.value*x.percent_unique) * (x.value*x.percent_unique) 
    x.count = x.value
    x.importance = Math.log(x.tf_idf)
  })
  values = values.sort(function(p,c) { return c.tf_idf - p.tf_idf })


  var total = d3.sum(values,function(x) { return x.count*x.percent_unique})

  values.map(function(x) { 
    x.pop_percent = 1.02/getIDF(x.key)*100
    x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent

    x.sample_percent = x.count*x.percent_unique/total*100
  })

  var norm = d3.scale.linear()
    .range([0, d3.max(values,function(x){ return x.pop_percent})])
    .domain([0, d3.max(values,function(x){return x.sample_percent})])
    .nice()

  var tt = d3.sum(values,function(x) { return x.pop_percent })

  values.map(function(x) {
    x.sample_percent_norm = norm(x.sample_percent)
    x.real_pop_percent = x.pop_percent/tt*100
    x.ratio = x.sample_percent/x.real_pop_percent

  })

  return values
}

export function buildDomainsTab(urls,categories) {

  const values = aggregateDomains(urls,categories)

  return {
      key: "Top Domains"
    , values: values.slice(0,500)
  }
}
