export function buildCategories(data) {
  var values = data.category
        .map(function(x){ return {"key": x.parent_category_name, "value": x.count } })
        .sort(function(p,c) {return c.value - p.value }).slice(0,10)
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
  return {"key":"","values":[]}
}

export function buildOffsiteSummary(data) {
  return {"key":"","values":[]}
}

export function buildActions(data) {
  return {"key":"Segments","values": data.actions.map(function(x){ return {"key":x.action_name, "value":0} })}
}
