function missing(data) {

  var missing_data = data.filter(function(action){
    return (action.timeseries_data == undefined) || (action.domains == undefined) || (action.onsite == undefined)
  })

  return missing_data
}

function should_trigger(datum) {
  return !datum.timeseries_data && !datum.domains && !datum.onsite
}

function trigger(datum) {
  setTimeout(function(){
    pubsub.publishers.actionTimeseriesOnly(datum)
    pubsub.publishers.pattern_domains_cached(datum)
    pubsub.publishers.uids_only_cache(datum)
  },1)
}

export default function(data, force) {

  if (force) {
    this.draw(false,false,false,true)
    return trigger(data[0])
  }

  var missing_data = missing(data)

  if ((missing_data.length == 0)) return this.draw(false,false,false,true)
  if (should_trigger(missing_data[0]) ) return trigger(missing_data[0])

  return

}
