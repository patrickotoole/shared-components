import {hourbuckets, timingHeaders} from './timing_constants'

const timeHeaders = timingHeaders.map(x => x.key)

export function normalizeByColumns(values) {

  var tb = timeHeaders.reduce((p,c) => { p[c] =0; return p}, {})
  
  var totals = values.reduce((tb,row) => {
    timeHeaders.map(b => {
      tb[b] += row[b] || 0
    })
    return tb
  },tb)

  return function normalize(row) {
    timeHeaders.map(b => {
      if (row[b]) row[b] = Math.round(row[b]/totals[b]*1000)/10 
    })
    return row
  }
}

export function normalizeRowSimple(row) {

  var items = 0

  var mean = timeHeaders.reduce((p,c) => {
    if (row[c] && row[c] != "") {
      items ++ 
      p += row[c] || 0
    }
    return p
  },0)/items

  timeHeaders.map(b => {
    if (row[b]) row[b] = row[b] > mean ? 
      Math.round((row[b] - mean)/mean*10)/10 : 
      Math.round(-(mean - row[b])/mean*10)/10
  })



  return row
}


export const computeScale = (data,_max) => {

  const max = _max || 1000 // need to actually compute this from data

  return d3.scale.linear().range([0,1]).domain([0,Math.log(max)])
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
