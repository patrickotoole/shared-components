import ID3Selection from './d3.d';
import {Drawable, DrawableFunc} from './drawable.d';
import DrawableIdentityFunc from './drawable_identity';
import {HeaderData} from './header';




class Component implements Drawable {

  _target: ID3Selection
  _data: Array<Object>

  _render_header: DrawableFunc = DrawableIdentityFunc
  _render_body: DrawableFunc = DrawableIdentityFunc
  _render_footer: DrawableFunc = DrawableIdentityFunc

  constructor(target: ID3Selection) {
    this._target = target
  }

  data(d?: Array<Object>) : Array<Object> | this {
    if (!d)
        return this._data;
    this._data = d;
    return this;
  }

  footer_data(d?: Array<Object>) : Array<Object> | this {
    if (!d)
        return this._data;
    this._data = d;
    return this;
  }

  header_data(d?: HeaderData) : HeaderData | this {
    if (!d)
        return this._data;
    this._data = d;
    return this;
  }

  body(draw?: DrawableFunc): DrawableFunc | this {
    if (!draw) return this._render_body;
    this._render_body = draw;
    return this;
  }

  footer(draw?: DrawableFunc): DrawableFunc | this {
    if (!draw) return this._render_footer;
    this._render_footer = draw;
    return this;
  }

  header(draw?: DrawableFunc): DrawableFunc | this {
    if (!draw) return this._render_header;
    this._render_header = draw;
    return this;
  }

  draw(): this {
    var all_data = {
        data: this.data()
      , header: this.header_data()
      , footer: this.footer_data()
    }

    var section = d3_updateable(this._target, "section", "section", all_data, function(x) {return 1})
      , header = d3_with_class(section, "header").datum(function(d) { return d.header })
      , body = d3_with_class(section, "body").datum(function(d) { return d.body })
      , footer = d3_with_class(section, "footer").datum(function(d) { return d.footer })

    this._render_header(header).draw()
    this._render_body(body).draw()
    this._render_footer(footer).draw()

    return this
  }

}

export function component(target: ID3Selection) : Component {
  return new Component(target)
}
