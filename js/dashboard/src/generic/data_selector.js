import {d3_class, d3_updateable, d3_splat, D3ComponentBase} from 'helpers'
import select from './select'


class DataSelector extends D3ComponentBase {
  constructor(target) {
    super(target)
  }

  props() { return ["transforms","datasets","selected_transform"] }

  draw() {
    var transform_selector = d3_class(this._target,"transform")

    select(d3_class(transform_selector,"header","span"))
      .options(this.datasets())
      .on("select", this.on("dataset.change") )
      .draw()

    select(d3_class(transform_selector,"trans","span"))
      .options(this.transforms())
      .on("select", this.on("transform.change") )//function(x){ self.on("transform.change").bind(this)(x) })
      .selected(this.selected_transform() )
      .draw()

    var toggle = d3_class(transform_selector,"show-values")

    d3_updateable(toggle,"span","span")
      .text("show values? ")

    d3_updateable(toggle,"input","input")
      .attr("type","checkbox")
      .on("change",this.on("toggle.values"))

    var toggle = d3_class(transform_selector,"filter-values")

    d3_updateable(toggle,"span","span")
      .text("live filter? ")

    d3_updateable(toggle,"input","input")
      .attr("type","checkbox")
      .attr("disabled",true)
      .attr("checked","checked")

    return this
  }
}               

export default function data_selector(target) {
  return new DataSelector(target)
}
