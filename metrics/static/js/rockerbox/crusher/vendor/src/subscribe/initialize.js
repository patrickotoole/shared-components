function set_and_draw(segments) {
  this.datum(segments)
  this.draw()
  this.run_missing(this.datum(),true)
}

export default function(subscribe_to) {

  var subscribe_to = subscribe_to || "vendors"

  if (this._data == this._wrapper.datum()) {
    // our current implementation never uses this
    return set_and_draw(this._data)
  }

  pubsub.subscriber("vendors-data",[subscribe_to])
    .run(set_and_draw.bind(this))
    .unpersist(true)
    .trigger()

  return this
}
