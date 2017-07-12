import {timeBuckets} from './relative_timing_constants';

export function normalizeRowSimple(row) {

  var items = 0

  var mean = timeBuckets.reduce((p,c) => {
    if (row[c] && row[c] != "") {
      items ++ 
      p += row[c] || 0
    }
    return p
  },0)/items

  timeBuckets.map(b => {
    if (row[b]) row[b] = row[b] > mean ? 
      Math.round((row[b] - mean)/mean*10)/10 : 
      Math.round(-(mean - row[b])/mean*10)/10
  })

  return row
}

export function normalizeByCategory(categories) {

  return function normalize(row) {
    const cat_idf = ((categories[row.parent_category_name] && categories[row.parent_category_name].idf)  || 0.032) * 100000
    let idf = row.idf == "NA" ? 14345/100 : row.idf
    idf = (row.key.split(".")).length > 2 ? idf*.1 : idf

    timeBuckets.map(b => {

      if (row[b]) row[b] = Math.log(1 + (row[b]/Math.sqrt(row.total))*(row[b]*row[b])*(idf)*(1/cat_idf))
    })
    return row
  }
}

export function normalizeByColumns(values) {

  var tb = timeBuckets.reduce((p,c) => { p[c] =0; return p}, {})
  
  var totals = values.reduce((tb,row) => {
    timeBuckets.map(b => {
      tb[b] += row[b] || 0
    })
    return tb
  },tb)

  return function normalize(row) {
    timeBuckets.map(b => {
      if (row[b]) row[b] = Math.round(row[b]/totals[b]*1000)/10 
    })
    return row
  }
}


export const categoryWeights = (categories) => {
  return categories.reduce((p,c) => {
      p[c.key] = (1 + c.values[0].percent_diff)
      return p
    },{})
}

var t1 = timeBuckets.slice(0,11).map(x => parseInt(x) ).reverse()
var t2 = [0].concat(t1)
var t3 = t1.map((v,i) => i ? (v - t2[i])/t2[i] : 1 )

export const normalizers = t3.reduce((p,c) => {
  p[p.length] = p[p.length-1]*c
  p[p.length] = p[p.length-1]*c*(1+((p.length-1)/10))
  return p
},[1])

export function normalize(totals) {

  var normd = normalizers.slice(1).map((x,i) => {
    var k = t1[i]
    return (totals[String(k)] || 0)/x
  })

  var baseValue = d3.sum(normd)/normd.filter(x => x).length
  var estimates = normalizers.map(x => x*baseValue)

  var normalized = t1.map((k,i) => 1 + ((totals[String(k)] || 0) / estimates[i]) )
    .map(Math.log)

  var normalized2 = t1.map((k,i) => 1 + ((totals["-" + String(k)] || 0) / estimates[i]) )
    .map(Math.log)

  var values = normalized.reverse().concat(normalized2).map(x => x ? x : "" )

  return values
}

export function normalizeRow(x) {
  var normed = normalize(x)
  var obj = {}
  t1.slice().reverse().concat(t1.map(x => "-" + x)).map((x,i) => obj[x] = normed[i])

  return Object.assign({key:x.key},obj)
}

export function totalsByTime(values) {
  return values.reduce((p,c) => {
    Object.keys(c).map(k => {
      p[k] += c[k]
    })
    return p
  }, timeBuckets.reduce((p,c) => { p[c] = 0; return p }, {}))
}


export const computeScale = (data) => {
  const max = data.reduce((p,c) => {
    timeBuckets.map(x => {
      p = Math.abs(c[x]) > p ? Math.abs(c[x]) : p
    })
  
    return p
  },0)

  return d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])
}
