export default function() {

  pubsub.subscriber("vendor-timeseries-domains",["actionTimeseriesOnly", "cached_visitor_domains_only", "uids_only_cache"])
    .run(this.draw.bind(this))
    .unpersist(false)

  // pubsub.subscriber("vendor-timeseries-domains-resize",["resize"])
  //   .run(this.draw.bind(this))
  //   .unpersist(false)

  return this
}
