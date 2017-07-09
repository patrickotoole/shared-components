import {
  prepData, 
} from '../../helpers'
import {
  aggregateCategory
} from './category'

export function formatHour(h) {
  if (h == 0) return "12 am"
  if (h == 12) return "12 pm"
  if (h > 12) return (h-12) + " pm"
  return (h < 10 ? h[1] : h) + " am"
}

export const hourbuckets = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x)

export function buildTiming(urls, comparison) {

  var ts = prepData(urls)
    , pop_ts = prepData(comparison)

  var mappedts = ts.reduce(function(p,c) { p[c.key] = c; return p}, {})

  var prepped = pop_ts.map(function(x) {
    return {
        key: x.key
      , hour: x.hour
      , minute: x.minute
      , value2: x.value
      , value: mappedts[x.key] ?  mappedts[x.key].value : 0
    }
  })

  return prepped
}

export const timingTabular = (data) => {
  return d3.nest()
    .key(x => x.domain)
    .key(x => x.hour)
    .entries(data)
    .map(x => {
      var obj = x.values.reduce((p,c) => {
        p[c.key] = c.values
        return p
      },{})

      x.buckets = hourbuckets.map(z => {
        var o = { values: obj[z], key: formatHour(z) }
        o.views = d3.sum(obj[z] || [], q => q.uniques)
        return o
      })

      x.tabular = x.buckets.reduce((p,c) => {
        p[c.key] = c.views || undefined
        return p
      },{})

      x.tabular["domain"] = x.key
      x.tabular["total"] = d3.sum(x.buckets,x => x.views)
      
      return x
    })
}
