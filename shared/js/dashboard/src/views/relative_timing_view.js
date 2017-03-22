import header from '../generic/header'

export default function relative_timing(target) {
  return new RelativeTiming(target)
}

class RelativeTiming {
  constructor(target) {
    this._target = target
  }

  data(val) { return accessor.bind(this)("data",val) } 


  draw() {
    
  }
}
