var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) })
buckets = buckets.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }))


const formatName = function(x) {

  if (x < 0) x = -x

  if (x == 3600) return "1 hr"
  if (x < 3600) return x/60 + " mins" 

  if (x == 86400) return "1 day"
  if (x > 86400) return x/86400 + " days" 

  return x/3600 + " hrs"
}

export const timingHeaders = buckets.map(x => { return {"key":x, "value":formatName(x), "selected":true} })
