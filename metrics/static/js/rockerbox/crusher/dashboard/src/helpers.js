export default function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function topSection(section) {
  return d3_updateable(section,".top-section","div")
    .classed("top-section",true)
    .style("height","200px")
}

export function remainingSection(section) {
  return d3_updateable(section,".remaining-section","div")
    .classed("remaining-section",true)
}
