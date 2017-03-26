export function getData(action,days_ago) {
  return function(cb){
    console.log(days_ago)

    var URL = "/crusher/v2/visitor/domains_full_time_minute/cache?url_pattern=" + action.url_pattern[0] + "&filter_id=" + action.action_id

    var date_ago = new Date(+new Date()-24*60*60*1000*days_ago)
      , date = d3.time.format("%Y-%m-%d")(date_ago)

    if (days_ago) URL += "&date=" + date


    d3.json(URL,function(value) {

      var categories = value.summary.category.map(function(x) {x.key = x.parent_category_name; return x})
      value.categories = categories
      value.category = value.summary.category
      value.current_hour = value.summary.hour
      value.category_hour = value.summary.cross_section

      value.original_urls = value.response

      cb(false,value)
    })
  }

}
export function getAll(cb) {
  d3.json("/crusher/funnel/action?format=json",function(value) {
    value.response.map(function(x) { x.key = x.action_name; x.value = x.action_id })
    cb(false,value.response)
  })

}
