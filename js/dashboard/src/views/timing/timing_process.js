import {hourbuckets, timingHeaders} from './timing_constants'


export const computeScale = (data,_max) => {

  const max = _max || 1000 // need to actually compute this from data

  return d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])
}

export function normalizeRow(weights) {

  return function normalize(x,mult) {
    var keys = timingHeaders.map(t => t.key)
    var values = keys.map(k => x[k])

    var total = d3.sum(values)

    var estimates = Object.keys(weights).map(k => Math.sqrt(weights[k]*total) )

    var normalized = values.map((k,i) => (k/estimates[i]))
    var values = {}
    keys.map((k,i) => {
      values[k] = Math.round(normalized[i]*mult || 0) || ""
    })
    return values

  }
}
