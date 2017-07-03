import {hourbuckets} from './timing_constants'

export function formatHour(h) {
  if (h == 0) return "12 am"
  if (h == 12) return "12 pm"
  if (h > 12) return (h-12) + " pm"
  return (h < 10 ? h[1] : h) + " am"
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

export const computeScale = (data) => {

  const max = 1000 // need to actually compute this from data

  return d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])
}
