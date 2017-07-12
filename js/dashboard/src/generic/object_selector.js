import {d3_class, d3_updateable, d3_splat, D3ComponentBase} from 'helpers'

class ObjectSelector extends D3ComponentBase {
  constructor(target) {
    super(target)
    this._selections = []
  }

  props() { return ["selectAll","key"] }

  add(x) {
    this._selections.push(x)
    this.on("add")(this._selections)
  }
  remove(x) {
    var index = this._selections.indexOf(x)
    this._selections.splice(index,1)
    this.on("remove")(this._selections)
  }

  draw() {

    const self = this

    function click(x,i,skip) {

      var bool = d3.select(this).classed("selected")

      if (!skip) {
        if (bool == false) self.add(self.key()(x,i))
        if (bool == true) self.remove(self.key()(x,i))

        d3.select(this).classed("selected",!bool)
      }


      self.on("click").bind(this)(self.key()(x,i),skip ? [self.key()(x,i)] : self._selections)

    }

    this._target
      .selectAll(this._selectAll)
      .on("mouseover", function(x,i) {
        if (self._selections.length == 0) click.bind(this)(x,i,true)
      })
      .on("mouseout", function(x,i) {
        if (self._selections.length == 0) click.bind(this)(x,i,true)
      })
      .on("click", click)


    return this
  }
}               

export default function object_selector(target) {
  return new ObjectSelector(target)
}
