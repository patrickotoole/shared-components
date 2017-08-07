import {hourbuckets, timingHeaders} from './timing_constants'
import d3 from 'd3';

const timeHeaders = timingHeaders.map(x => x.key)

export function percentColumns(values) {

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

export function normalizeColumn(values) {

  var tb = timeHeaders.reduce((p,c) => { p[c] =0; return p}, {})

  var counts = {}
  var totals = values.reduce((tb,row) => {
    timeHeaders.map(b => {
      if (row[b]) {
        tb[b] += row[b] || 0
        counts[b] = (counts[b] || 0) + 1
      }
    })
    return tb
  },tb)

  var means = Object.keys(counts).reduce((p,c) => {
    p[c] = totals[c]/counts[c]
    return p
  },{})


  return function normalize(row) {
    timeHeaders.map(b => {

      var mean = means[b]


      if (row[b]) row[b] = row[b] > mean ? 
        Math.round((row[b] - mean)/mean*10)/10 : 
        Math.round(-(mean - row[b])/mean*10)/10
    })
    
    return row
  }

  
}

export function percentDiffColumn(values) {

  var totals = values.reduce((p,c) => {
    p[c.key] = d3.sum(timeHeaders.map(x => c[x]))
    return p
  },{})

  var total = d3.sum( Object.keys(totals).map(k => totals[k]) )

  var percents = Object.keys(totals).reduce((p,c) => {
    p[c] = totals[c] / total
    return p
  },{})

  var colToPercent = percentColumns(values)

  return function normalize(row) {
    var col_percents = colToPercent(row)
    timeHeaders.map(b => {
      var overall = percents[row.key]
        , local = col_percents[b]/100


      if (local) col_percents[b] = local > overall? 
        Math.round((local - overall)/overall*10)/10 : 
        Math.round(-(overall- local)/overall*10)/10

    })

    return col_percents
  }

  
}

export function percentDiffRow(values) {

  var tb = timeHeaders.reduce((p,c) => { p[c] =0; return p}, {})
  
  var totals = values.reduce((tb,row) => {
    timeHeaders.map(b => { tb[b] += row[b] || 0 })
    return tb
  },tb)

  var total = d3.sum(Object.keys(tb).map(x => tb[x]))

  var percents = timeHeaders.reduce((p,k) => {
    p[k] = tb[k]/ total
    return p
  },{})

  return function normalize(row) {

    var row_percents = percentRowSimple(row)

    timeHeaders.map(b => {
      var overall = percents[b]
        , local = row_percents[b]

      if (local) row_percents[b] = local > overall? 
        Math.round((local - overall)/overall*10)/10 : 
        Math.round(-(overall- local)/overall*10)/10

    })
    return row_percents
  }

}

export function percentRowSimple(row) {

  var items = 0

  var mean = timeHeaders.reduce((p,c) => {
    if (row[c] && row[c] != "") { p += row[c] || 0 }
    return p
  },0)

  timeHeaders.map(b => {
    if (row[b]) row[b] = row[b] / mean 
  })

  return row
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

  const max = _max || 10 // need to actually compute this from data

  return d3.scale.linear().range([0,1]).domain([0,Math.log(max+1)])
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
