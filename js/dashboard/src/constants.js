export let allbuckets = []
export const hourbuckets = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x)

var minutes = [0,20,40]
export const buckets = d3.range(0,24).reduce((p,c) => {
  minutes.map(x => {
    p[c + ":" + x] = 0
  })
  allbuckets = allbuckets.concat(minutes.map(z => c + ":" + z))
  return p
},{})


export const STOPWORDS = ["that","this","what","best","most","from","your","have","first","will","than","says","like","into","after","with"]
