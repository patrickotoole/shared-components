function missing(data) {

  var missing_data = data.filter(function(action){
    return (action.timeseries_data == undefined) || (action.domains == undefined)
  }) 

  return missing_data
}

function should_trigger(datum) {
  return ((!!datum.timeseries_data) && (!!datum.domains)) 
}

function trigger(datum) {
  setTimeout(function(){
    pubsub.publishers.actionTimeseriesOnly(datum)
    pubsub.publishers.pattern_domains_cached(datum)
  },1) 
}

export default function(data, force) {

  if (force) {
    this.draw(false,false,true)
    return trigger(data[0])
  }

  var missing_data = missing(data)

  if ((missing_data.length == 0) && !should_trigger(missing_data[0]) ) return draw(false,false,true)

  trigger(missing_data[0])

}
