import ID3Selection from './d3.d';

interface Drawable {
  _target: ID3Selection

  data?<T>(d?: Array<T>): Array<T> | this
  header_data?<T>(d?: T): T | this
  footer_data?<T>(d?: T): T | this

  draw(): this
}

interface DrawableFunc {
  (target: ID3Selection): Drawable
}
