import accessor from '../helpers'
import header from '../generic/header'
import table from 'table'

function d3_class(target,cls,type) {
  return d3_updateable(target,"." + cls, type || "div")
    .classed(cls,true)
}

export default function staged_filter(target) {
  return new StagedFilter(target)
}

class StagedFilter {
  constructor(target) {
    this._target = target
    this._on = {}
  }

  data(val) { return accessor.bind(this)("data",val) } 

  on(action, fn) {
    if (fn === undefined) return this._on[action] || noop;
    this._on[action] = fn;
    return this
  }


  draw() {
    var wrap = d3_class(this._target,"footer-wrap")
      .style("height","60px")
      .style("bottom","0px")
      .style("position","fixed")

    wrap.text("FOOTER WRAP")
  }
}
