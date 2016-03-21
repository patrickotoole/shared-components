import base from './popup/base'
import draw from './popup/draw'

export function Popup(target) {
  this._target = target
  this._base = this.base(target)
  this._title = '';
  this._content = '';
}

function popup(target){
  return new Popup(target)
}

function title(value) {
  this._title = value;

  return this;
}

function content(value) {
  this._content = value;

  return this;
}

Popup.prototype = {
  base: base,
  draw: draw,
  title: title,
  content: content
}

export default popup
