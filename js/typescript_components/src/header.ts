import ID3Selection from './d3.d';
import {Drawable, DrawableFunc} from './drawable.d';
import DrawableIdentityFunc from './drawable_identity';

interface HeaderData {
}

class Header implements Drawable {
  _target: ID3Selection
  constructor(target: ID3Selection) {
    this._target = target
  }

  draw(): this {
    return this
  }
  
}
