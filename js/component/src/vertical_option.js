import {d3_class, d3_splat, d3_updateable, accessor, D3ComponentBase} from 'helpers'
import './vertical_option.css'


export function vertical_option(target) {
  return new VerticalOption(target)
}

//[{key, value, selected},...]

class VerticalOption extends D3ComponentBase {
  constructor(target) {
    super()
    this._target = target
    this._options = []
    this._wrapper_class = "vertical-options"
  }

  props() { return ["options","wrapper_class"] }

  draw() {
    var opts = d3_class(this._target,this.wrapper_class(),"div",this.options())
      
     d3_splat(opts,".show-button","a",this.options(),x => x.key)
      .classed("show-button",true)
      .classed("selected",x => x.selected)
      .text(x => x.key)
      .on("click",this.on("click") ) 

    return this
  }
}
