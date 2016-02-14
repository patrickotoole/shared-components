export default function() {

  pubsub.subscriber("vendor-timeseries-domains",["actionTimeseriesOnly", "pattern_domains_cached"])
    .run(this.draw.bind(this))
    .unpersist(false)

  return this
}
