import {hourbuckets} from './timing_constants'


export const computeScale = (data) => {

  const max = 1000 // need to actually compute this from data

  return d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])
}
