export default function(subs) {
  
  if (subs) this._subs = subs;

  var _subscriptions = ["actionTimeseriesOnly", "cached_visitor_domains_only", "uids_only_cache"];
  var subscriptions = (this._subs && this._subs.length) ? _subscriptions.concat(subs) : _subscriptions;

  this._to_trigger = subscriptions

  pubsub.subscriber("vendor-timeseries-domains",subscriptions)
    .run(this.draw.bind(this))
    .unpersist(false)

  return this
}
