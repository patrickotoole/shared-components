export const categoryWeights = (categories) => {
  return categories.reduce((p,c) => {
      p[c.key] = (1 + c.values[0].percent_diff)
      return p
    },{})
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
