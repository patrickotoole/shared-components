import {
  prepData, 
} from '../../helpers'
import {
  aggregateCategory
} from './category'
import d3 from 'd3';

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

export const timingTabular = (data,key="domain") => {
  return d3.nest()
    .key(x => x[key])
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

      x.tabular["key"] = x.key
      x.tabular["total"] = d3.sum(x.buckets,x => x.views)
      
      return x.tabular
    })
    .filter(x => x.key != "NA")
}

export const timingRelative = (combined) => {
        const rolled = d3.nest()
          .key(x => x.time_diff_bucket)
          .key(x => x.hour)
          .rollup(v => {
            return {
                count: v.length
              , uniques: d3.sum(v,x => x.uniques)
              , visits: d3.sum(v,x => x.visits)
            }
          })
          .entries(combined)
          .sort((p,c) => d3.descending(parseInt(p.key),parseInt(c.key)) )

        const rows = rolled.map(r => {
          let mapped = d3.map(r.values, x => x.key)

          let row = hourbuckets.reduce((p,h) => {
            p[h] = mapped.get(h) || {values: {}}
            p[h] = p[h].values.visits || 0
            return p
          },{})

          return Object.assign({key: r.key}, row)
        })

        const flat = rolled
          .reduce((p,c) => {
            c.values.reduce((q,r) => {
              q.push(Object.assign({},r.values,{"bucket":c.key, "hour": r.key}) )
              return q
            },p)
            return p
          },[])

        const hourly = d3.nest()
          .key(x => x.hour)
          .rollup(v => d3.sum(v,x => x.visits))
          .entries(flat)

        const overall = d3.sum(hourly, x => x.values)

        hourly.map(x => {
          x.percent = x.values/overall
        })

        const hourlyMap = d3.map(hourly, x => x.key)

        const percentRows = rows.map(x => {
          const total = hourbuckets.reduce((p,k) => {
            p += x[k] || 0
            return p
          },0)

          const obj = {"key":x.key}
          hourbuckets.map(k => obj[k] = x[k]/total )

          return obj
        })

        const normalizedRows = percentRows.map(x => {
          const obj = {"key":x.key}

          hourbuckets.map(k => {
            const v = hourlyMap.get(k).percent
            console.log(v, x[k], parseInt(k), formatHour(k) )
            obj[formatHour(k)] = (x[k] > v) ? (v - x[k])/v : -(x[k] - v)/v
          })

          return obj
        })

        const formattedRows = rows.map(x => {
          const obj = {"key":x.key}
          hourbuckets.map(k => {
            obj[formatHour(k)] = x[k]
          })

          return obj
        }).sort((p,c) => {
          return d3.descending( parseInt(p.key),parseInt(c.key) )
        }).map((x,i) => {
          x.total = 100-i
          return x
        })

debugger

  return formattedRows //normalizedRows
}
