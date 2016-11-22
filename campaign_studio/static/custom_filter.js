function buildModifiedFilter(data,filters,filter) {
  var filter = filter
  try {
    filter = window.filter 
  } catch(e) { }

  var mod_filter = filter.filter_data(data)
  mod_filter._ops['between'] = function(field,value) {
    return function(x) {
      return parseFloat(x[field]) >= value[0] && parseFloat(x[field]) <= value[1]
    }
  }  
  mod_filter._ops['does not equal'] = function(field,value) {
    return function(x) {
      return String(x[field]) != String(value)
    }
  }
  mod_filter._ops['does not contain'] = function(field,value) {
    return function(x) {
      return String(x[field]).indexOf(String(value)) == -1
    }
  }
  mod_filter._ops['greater than'] = function(field,value) {
    return function(x) {
      return parseFloat(x[field]) > parseFloat(value)
    }
  }
  mod_filter._ops['less than'] = function(field,value) {
    return function(x) {
      return parseFloat(x[field]) < parseFloat(value)
    }
  }
  var filtered_data = mod_filter
    .logic("and")
    .by(filters) 

  return filtered_data
}

try {
  window.module = window.module || {}
} catch(e) {}

module.exports = {
 buildModifiedFilter: buildModifiedFilter 
}
