export function buildCategories(data) {
  var values = data.category
        .map(function(x){ return {"key": x.parent_category_name, "value": x.count } })
        .sort(function(p,c) {return c.value - p.value }).slice(0,15)
    , total = values.reduce(function(p, x) {return p + x.value }, 0)

  return {
      key: "Categories"
    , values: values.map(function(x) { x.percent = x.value/total; return x})
  }
}

export function buildTimes(data) {

  var hour = data.current_hour

  var categories = data.display_categories.values
    .filter(function(a) { return a.selected })
    .map(function(a) { return a.key })

  if (categories.length > 0) {
    hour = data.category_hour.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1})
    hour = d3.nest()
      .key(function(x) { return x.hour })
      .key(function(x) { return x.minute })
      .rollup(function(v) {
        return v.reduce(function(p,c) { 
          p.uniques = (p.uniques || 0) + c.uniques; 
          p.count = (p.count || 0) + c.count;  
          return p },{})
      })
      .entries(hour)
      .map(function(x) { 
        console.log(x.values); 
        return x.values.reduce(function(p,k){ 
          p['minute'] = parseInt(k.key); 
          p['count'] = k.values.count; 
          p['uniques'] = k.values.uniques; 
          return p 
      }, {"hour":x.key}) } )
  }

  var values = hour
    .map(function(x) { return {"key": parseFloat(x.hour) + 1 + x.minute/60, "value": x.count } })

  return {
      key: "Browsing behavior by time"
    , values: values
  }
}

export function buildDomains(data) {

  var categories = data.display_categories.values
    .filter(function(a) { return a.selected })
    .map(function(a) { return a.key })

  var idf = d3.nest()
    .key(function(x) {return x.domain })
    .rollup(function(x) {return x[0].idf })
    .map(data.full_urls)

  var getIDF = function(x) {
    return idf[x] == "NA" ? 0 : idf[x]
  }

  var values = data.url_only
    .map(function(x) { 
      return {
          "key":x.domain
        , "value":x.count
        , "parent_category_name": x.parent_category_name
        , "uniques": x.uniques 
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

       } 
    })
    .entries(values).map(function(x){ return x.values })

  if (categories.length > 0)
    values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 })

  values = values.sort(function(p,c) { return getIDF(c.key) * (c.value) - getIDF(p.key) * (p.value) })

  var total = d3.sum(values,function(x) { return x.value*x.percent_unique})

  values.map(function(x) { 
    x.pop_percent = 1/getIDF(x.key)*100
    x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent

    x.percent = x.value*x.percent_unique/total*100
  })

  var norm = d3.scale.linear()
    .range([0, d3.max(values,function(x){ return x.pop_percent})])
    .domain([0, d3.max(values,function(x){return x.percent})])
    .nice()

  values.map(function(x) {
    x.percent_norm = norm(x.percent)
    //x.percent_norm = x.percent
  })



  
  return {
      key: "Top Domains"
    , values: values.slice(0,100)
  }
}

export function buildUrls(data) {

  var categories = data.display_categories.values
    .filter(function(a) { return a.selected })
    .map(function(a) { return a.key })

  var values = data.url_only
    .map(function(x) { return {"key":x.url,"value":x.count, "parent_category_name": x.parent_category_name} })

  if (categories.length > 0)
    values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 })

  values = values.filter(function(x) {
    try {
      return x.key
        .replace("http://","")
        .replace("https://","")
        .replace("www.","").split(".").slice(1).join(".").split("/")[1].length > 5
    } catch(e) {
      return false
    }
  }).sort(function(p,c) { return c.value - p.value })


  
  return {
      key: "Top Articles"
    , values: values.slice(0,100)
  }
}

export function buildOnsiteSummary(data) {
  var yesterday = data.timeseries_data[0]
  var values = [
        {
            "key": "Page Views"
          , "value": yesterday.views
        }
      , {
            "key": "Unique Visitors"
          , "value": yesterday.uniques

        }
    ]
  return {"key":"On-site Activity","values":values}
}

export function buildOffsiteSummary(data) {
  var values = [  
        {
            "key": "Off-site Views"
          , "value": data.url_only.reduce(function(p,c) {return p + c.uniques},0)
        }
      , {
            "key": "Unique pages"
          , "value": Object.keys(data.url_only.reduce(function(p,c) {p[c.url] = 0; return p },{})).length
        }
    ]
  return {"key":"Off-site Activity","values":values}
}

export function buildActions(data) {
  
  return {"key":"Segments","values": data.actions.map(function(x){ return {"key":x.action_name, "value":0, "selected": data.action_name == x.action_name } })}
}
