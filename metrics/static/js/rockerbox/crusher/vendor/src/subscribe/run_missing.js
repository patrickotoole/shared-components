function missing(data) {

  var missing_data = data.filter(function(action){
    return !action.timeseries_data || !action.domains || !action.onsite 
  })

  return missing_data
}

function should_trigger(datum) {
  return !datum.timeseries_data && !datum.domains && !datum.onsite
}

function trigger(datum) {
  var self = this;
  setTimeout(function(){
    self._to_trigger.map(function(t) {
      pubsub.publishers[t](datum)
      pubsub.publishers[t](datum)
      pubsub.publishers[t](datum)
    })
  },1)
}

export default function(data, force) {

  if (force) {
    this.draw.bind(this)(false,false,false,true)
    return trigger.bind(this)(data[0])
  }

  var missing_data = missing(data)

  if ((missing_data.length == 0)) return this.draw.bind(this)(false,false,false,true)
  if (should_trigger(missing_data[0]) ) return trigger.bind(this)(missing_data[0])

  return

}
