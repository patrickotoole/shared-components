import {d3_class, d3_splat, d3_updateable, accessor, D3ComponentBase} from 'helpers'
import TabularHeader from './header'
import TabularBody from './body'

import './tabular_timeseries.css'

export function tabular_timeseries(target) {
  return new TabularTimeseries(target)
}

class TabularTimeseries extends D3ComponentBase {
  constructor(target) {
    super()
    this._target = target
    this._headers = ["12am","12pm","12am"]
  }

  props() { return ["data","label","split","headers"] }

  draw() {
    let td = this._target

    var title_row = d3_class(td,"title-row")
    var expansion_row = d3_class(td,"expansion-row")

    var header = (new TabularHeader(title_row))
      .label(this.label())
      .headers(this.headers())
      .draw()

    var body = (new TabularBody(expansion_row))
      .data(this.data())
      .split(this.split() || false)
      .draw()

  }
}
