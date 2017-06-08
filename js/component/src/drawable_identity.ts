import ID3Selection from './d3.d';
import Drawable from './drawable';


class DrawableIdentity implements Drawable {
  _target: ID3Selection

  draw(): {
    return this
  }

}

function DrawableIdentityFunc(target: ID3Selection) : DrawableIdentity {
  return new DrawableIdentity(target)
}
