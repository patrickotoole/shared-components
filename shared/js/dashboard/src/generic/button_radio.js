import accessor from '../helpers'
import header from './header'

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }

export function ButtonRadio(target) {
  this._on = {}
  this.target = target
}

export default function button_radio(target) {
  return new ButtonRadio(target)
}

ButtonRadio.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
  , draw: function () {
  
    var CSS_STRING = String(function() {/*
      .options-view { text-align:right }
      .show-button {
      width: 150px;
      text-align: center;
      line-height: 40px;
      border-radius: 15px;
      border: 1px solid #ccc;
      font-size: 12px;
      text-transform: uppercase;
      font-weight: bold;
      display:inline-block;
      margin-right:15px;
        }
      .show-button:hover { text-decoration:none; color:#555 }
      .show-button.selected {
        background: #e3ebf0;
        color: #555;
      }
    */})
  
    d3_updateable(d3.select("head"),"style#show-css","style")
      .attr("id","header-css")
      .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))
  
    var options = d3_updateable(this.target,".button-radio-row","div")
      .classed("button-radio-row",true)
      .style("margin-bottom","35px")
  
  
    var button_row = d3_updateable(options,".options-view","div",this.data())
      .classed("options-view",true)

    var bound = this.on("click").bind(this)
  
    d3_splat(button_row,".show-button","a",identity, key)
      .classed("show-button",true)
      .classed("selected", function(x) { return x.selected })
      .text(key)
      .on("click", function(x) { bound(x) })

    return this
  
    }
  
}
