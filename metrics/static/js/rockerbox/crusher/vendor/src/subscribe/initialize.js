function set_and_draw(segments) {
  this.datum(segments)
  this.draw()
  this.run_missing(this._data,true)
}

export default function() {

  if (this._data == this._wrapper.datum()) {
    // our current implementation never uses this
    return set_and_draw(this._data)
  }

  pubsub.subscriber("vendors-data",["vendors"])
    .run(set_and_draw.bind(this))
    .unpersist(true)
    .trigger()

  return this
}
