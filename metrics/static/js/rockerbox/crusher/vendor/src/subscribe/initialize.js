function set_and_draw(segments) {
  this.datum(segments)
  this.draw()
  this.run_missing(this.datum(),true)
}

export default function(subscribe_to) {

  var subscribe_to = subscribe_to || "vendors"
  if (typeof(subscribe_to) == "string") subscribe_to = [subscribe_to]


  if (this._data == this._wrapper.datum()) {
    return set_and_draw(this._data)
  }

  var self = this;

  pubsub.subscriber("vendors-data",subscribe_to)
    .run(set_and_draw.bind(self))
    .unpersist(true)
    .trigger()

  return this
}
