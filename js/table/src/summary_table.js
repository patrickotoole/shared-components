import {d3_class, D3ComponentBase} from 'helpers'
import './summary_table.css'
import {table} from './table'

export function summary_table(target) {
  return new SummaryTable(target)
}

class SummaryTable extends D3ComponentBase {
  constructor(target) {
    super(target)
    this._wrapper_class = "table-summary-wrapper"
  }

  props() { return ["title", "headers", "data", "wrapper_class"] }

  draw() {
    var urls_summary = d3_class(this._target,"summary-table")
      
    d3_class(urls_summary,"title")
      .text(this.title())

    var uwrap = d3_class(urls_summary,"wrap")


    table(uwrap)
      .wrapper_class(this.wrapper_class(),true)
      .data({"values":this.data()})
      .skip_option(true)
      .headers(this.headers())
      .draw()

  }
}
