export var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) })
buckets = buckets.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }))

 

// Rollup overall before and after data

const bucketWithPrefix = (prefix,x) => prefix + x.time_diff_bucket
const sumVisits = (x) => d3.sum(x,y => y.visits) 

export function rollupBeforeAndAfter(before_urls, after_urls) {

  const before_rollup = d3.nest()
    .key(bucketWithPrefix.bind(this,""))
    .rollup(sumVisits)
    .map(before_urls)

  const after_rollup = d3.nest()
    .key(bucketWithPrefix.bind(this,"-"))
    .rollup(sumVisits)
    .map(after_urls)

  return buckets.map(x => before_rollup[x] || after_rollup[x] || 0)
}




// Keyword processing helpers

const STOPWORDS =[
    "that","this","what","best","most","from","your"
  , "have","first","will","than","says","like","into","after","with"
]
const cleanAndSplitURL = (domain,url) => {
  return url.toLowerCase().split(domain)[1].split("/").reverse()[0].replace("_","-").split("-")
}
const isWord = (x) => {
  return x.match(/\d+/g) == null && 
    x.indexOf(",") == -1 && 
    x.indexOf("?") == -1 && 
    x.indexOf(".") == -1 && 
    x.indexOf(":") == -1 && 
    parseInt(x) != x && 
    x.length > 3
}


const urlReducer = (p,c) => {
  p[c.url] = (p[c.url] || 0) + c.visits
  return p
}
const urlBucketReducer = (prefix, p,c) => {
  p[c.url] = p[c.url] || {}
  p[c.url]["url"] = c.url

  p[c.url][prefix + c.time_diff_bucket] = c.visits
  return p
}
const urlToKeywordsObjReducer = (domain, p,c) => {
  cleanAndSplitURL(domain,c.key).map(x => {
    if (isWord(x) && STOPWORDS.indexOf(x) == -1) {
      p[x] = p[x] || {}
      p[x].key = x
      Object.keys(c.value).map(q => {
        p[x][q] = (p[x][q] || 0) + c.value[q]
      })
    }
  })
  return p
}

export function urlsAndKeywords(before_urls, after_urls, domain) {

    const url_volume = {}
    before_urls.reduce(urlReducer,url_volume)
    after_urls.reduce(urlReducer,url_volume)

    const url_ts = {}
    before_urls.reduce(urlBucketReducer.bind(this,""),url_ts)
    after_urls.reduce(urlBucketReducer.bind(this,"-"),url_ts)

    const urls = d3.entries(url_volume)
      .sort((p,c) => { return d3.descending(p.value,c.value) })
      .slice(0,1000)
      .map(x => url_ts[x.key])
      .map(function(x){ 
        x.key = x.url
        x.values = buckets.map(y => x[y] || 0)
        x.total = d3.sum(buckets.map(function(b) { return x[b] || 0 }))
        return x
      })

    const keywords = {}
    d3.entries(url_ts)
      .reduce(urlToKeywordsObjReducer.bind(false,domain),keywords)
    
    
    const kws = Object.keys(keywords)
      .map(function(k) { return Object.assign(keywords[k],{key:k}) })
      .map(function(x){
        x.values = buckets.map(y => x[y] || 0)
        x.total = d3.sum(buckets.map(function(b) { return x[b] || 0 }))
        return x
      }).sort((p,c) => {
        return c.total - p.total
      })

    return {
      urls,
      kws
    }

}

export function validConsid(sorted_urls, sorted_kws, before_pos, after_pos) {
    const consid_buckets = buckets.filter((x,i) => !((i < before_pos) || (i > buckets.length/2 - 1 )) )
    const valid_buckets  = buckets.filter((x,i) => !((i < buckets.length/2 ) || (i > after_pos)) )
    function containsReducer(x,p,c) {
      p += x[c] || 0;
      return p
    }
    function filterByBuckets(_buckets,x) {
      return _buckets.reduce(containsReducer.bind(false,x),0)
    }
    var urls_consid = sorted_urls.filter( filterByBuckets.bind(false,consid_buckets) )
      , kws_consid = sorted_kws.filter( filterByBuckets.bind(false,consid_buckets) )

    var urls_valid = sorted_urls.filter( filterByBuckets.bind(false,valid_buckets) )
      , kws_valid = sorted_kws.filter( filterByBuckets.bind(false,valid_buckets) )

    return {
        urls_consid
      , urls_valid
      , kws_consid
      , kws_valid
    }
}




// Build data for summary

function numViews(data) { 
  return data.length 
}
function avgViews(data) {
  return parseInt(data.reduce((p,c) => p + c.total,0)/data.length)
}
function medianViews(data) {
  return (data[parseInt(data.length/2)] || {}).total || 0
}
function summarizeViews(name, fn, all, consid, valid) {
  return {name: name, all: fn(all), consideration: fn(consid), validation: fn(valid)}
}
export function summarizeData(all,consid,valid) {
  return [
      summarizeViews("Distinct URLs",numViews,all,consid,valid)
    , summarizeViews("Average Views",avgViews,all,consid,valid)
    , summarizeViews("Median Views",medianViews,all,consid,valid)
  ]
}



// Process relative timing data

export function processData(before_urls, after_urls, before_pos, after_pos, domain) {

    const { urls , kws } = urlsAndKeywords(before_urls, after_urls, domain)
    const { urls_consid , urls_valid , kws_consid , kws_valid } = validConsid(urls, kws, before_pos, after_pos)

    const url_summary = summarizeData(urls, urls_consid, urls_valid)
    const kws_summary = summarizeData(kws, kws_consid, kws_valid )

    return {
      url_summary,
      kws_summary,
      urls,
      urls_consid ,
      urls_valid ,
      kws,
      kws_consid ,
      kws_valid 
    }
}
