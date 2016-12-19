import ID3Selection from './d3.d';
import * as d3 from 'd3';

interface DataPoint {
  key: string,
  value: number
}

interface Row {
  key: string,
  value: Array<DataPoint>
}

interface BooleanHash {
  [key: string]: boolean;
}

function d3_updateable(target: ID3Selection, selector: string, type?: string, data?: any, joiner?: (x: any) => any): ID3Selection {
  var type = type || "div"
  var updateable = target.selectAll(selector).data(
    function(x){return data ? [data] : [x]},
    joiner || function(x){return [x]}
  )
  updateable.enter()
    .append(type)
  return updateable
}
function d3_splat (target,selector,type,data,joiner) {
  var type = type || "div"
  var updateable = target.selectAll(selector).data(
    data || function(x){return x},
    joiner || function(x){return x}
  )
  updateable.enter()
    .append(type)
  return updateable
}

function d3_with_class(target: ID3Selection, classname: string) {
  return d3_updateable(target,"."+classname)
    .classed(classname,true)
}


function computeHeaders(data: Array<Row>) : Array<string> {

  let headers: BooleanHash = {}

  data.map(function(row: Row) {
    return row.value.map(function(point: DataPoint) {
      headers[point.key] = true
    })
  })

  return Object.keys(headers)
}

class Tabular {

  _target: ID3Selection
  _data: Array<Row>
  _headers: Array<string>
  _render_item: (data: any) => void = function(data: any) {
    d3.select(this).text(JSON.stringify)
  }

  _render_header: (data: any) => void = function(data: any) {
    d3.select(this).text(JSON.stringify)
  }

  WRAPPER_CLASS: string = "tabular-wrapper"
  HEADER_WRAP_CLASS: string = "head-wrap"
  BODY_WRAP_CLASS: string = "body-wrap"

  constructor(target: ID3Selection) {
    this._target = target
  }

  renderWrapper(target: ID3Selection) : ID3Selection {
    return d3_with_class(target,this.WRAPPER_CLASS)
  }

  renderHeaders(target: ID3Selection) : ID3Selection {
    var head_wrap = d3_updateable(target,"." + this.HEADER_WRAP_CLASS,"div",this._headers,function(x) { return 1 })
      .classed(this.HEADER_WRAP_CLASS,true)

    var item = d3_splat(head_wrap,".item","div")
      .classed("item",true)
      .order()
      .each(this._render_header)

    return head_wrap
  }

  renderRows(target: ID3Selection) : ID3Selection {
    var body_wrap = d3_with_class(target,this.BODY_WRAP_CLASS)

    var rows = d3_splat(body_wrap,".row","div",row => row, row => row.key)
      .classed("row",true)

    var item = d3_splat(rows,".item","div", values => values.value.sort((p,q) => this._headers.indexOf(p.key) - this._headers.indexOf(q.key) ), x => x.key )
      .classed("item", true)
      .order()

    item.each(this._render_item)
    
    return body_wrap
  }


  data(d?: Array<Row>): Array<Row> | this {
    if (!d) return this._data

    this._headers = this._headers || computeHeaders(d)
    this._target.datum(d)
    this._data = d
    return this
  }

  headers(d?: Array<string>): Array<string> | this {

    if (!d) return this._headers;

    this._headers = d
    return this
  }

  render_header(fn: (data: any) => void): this {
    this._render_header = fn
    return this
  }

  render_item(fn: (data: any) => void): this {
    this._render_item = fn
    return this
  }

  draw() : this {

    var wrapper = this.renderWrapper(this._target)
      , headers = this.renderHeaders(wrapper)
      , rows = this.renderRows(wrapper)
    
    return this
  }
}

function tabular(target) {
  return new Tabular(target)
}

export default tabular;
