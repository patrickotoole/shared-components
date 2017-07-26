import {d3_updateable, d3_splat} from '@rockerbox/helpers'
import {filter_data} from '@rockerbox/filter';

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

var ops = {
    "is in": function(field,value) {
        return function(x) {
          var values = value.split(",")
          return values.reduce(function(p,value) { return p + String(x[field]).indexOf(String(value)) > -1 }, 0) > 0
        } 
      }
  , "is not in": function(field,value) {
        return function(x) {
          var values = value.split(",")
          return values.reduce(function(p,value) { return p + String(x[field]).indexOf(String(value)) > -1 }, 0) == 0
        } 
      }
}

export function determineLogic(options) {
  const _default = options[0]
  const selected = options.filter(function(x) { return x.selected })
  return selected.length > 0 ? selected[0] : _default
}

export function filterUrls(urls,logic,filters) {
  return filter_data(urls)
    .op("is in", ops["is in"])
    .op("is not in", ops["is not in"])
    .logic(logic.value)
    .by(filters)
}
