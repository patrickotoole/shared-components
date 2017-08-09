import d3 from 'd3'
export function buildKeywords(urls,comparison) {
  var parseWords = function(p,c) {
    var splitted = c.url.split(".com/")
    if (splitted.length > 1) {
      var last = splitted[1].split("/").slice(-1)[0].split("?")[0]
      var words = last.split("-").join("+").split("+").join("_").split("_").join(" ").split(" ")
      words.map(function(w) { 
        if ((w.length <= 4) || (String(parseInt(w[0])) == w[0] ) || (w.indexOf("asp") > -1) || (w.indexOf("php") > -1) || (w.indexOf("html") > -1) ) return
        p[w] = p[w] ? p[w] + 1 : 1
      })
    }
    return p
  }

  const pop_counts = comparison.reduce(parseWords,{})
  const samp_counts = full_urls.reduce(parseWords,{})

  return d3.entries(pop_counts).filter(function(x) { return x.value > 1})
    .map(function(x) {
      x.samp = samp_counts[x.key]
      x.pop = x.value
      return x
    })
    .sort(function(a,b) { return b.pop - a.pop})
    .slice(0,25)

}
