import {d3_updateable, d3_splat} from 'helpers'
export * from './helpers/data_helpers'
export * from './helpers/graph_helpers'
export * from './helpers/state_helpers'


export default function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function topSection(section) {
  return d3_updateable(section,".top-section","div")
    .classed("top-section",true)
    .style("min-height","160px")
}

export function remainingSection(section) {
  return d3_updateable(section,".remaining-section","div")
    .classed("remaining-section",true)
}

