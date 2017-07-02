export const categoryWeights = (categories) => {
  return categories.reduce((p,c) => {
      p[c.key] = (1 + c.values[0].percent_diff)
      return p
    },{})
}

function prefixDomainWeightsReducer(prefix,weights, p,c) {
      p[c.domain] = p[c.domain] || {}
      p[c.domain]['domain'] = c.domain
      p[c.domain]['weighted'] = c.visits * weights[c.parent_category_name]
      
      p[c.domain][prefix + c.time_diff_bucket] = (p[c.domain][c.time_diff_bucket] || 0) + c.visits
      return p
}
export const beforeAndAfterTabular = (before, after, weights) => {
  const domain_time = {}

  before.reduce(prefixDomainWeightsReducer.bind(false,"",weights),domain_time)
  after.reduce(prefixDomainWeightsReducer.bind(false,"-",weights),domain_time)

  const sorted = Object.keys(domain_time)
    .map((k) => { return domain_time[k] })
    .sort((p,c) => {
      return d3.descending(p['600']*p.weighted || -Infinity,c['600']*c.weighted || -Infinity)
    })

  return sorted
}

export const computeScale = (data) => {
  const max = data.reduce((p,c) => {
    Object.keys(c).filter(z => z != "domain" && z != "weighted").map(function(x) {
      p = c[x] > p ? c[x] : p
    })
  
    return p
  },0)

  return d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])
}
