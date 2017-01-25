import d3_wrapper_with_title from './helper';

export function Load(target) {
  this._target = target
  this._on = {
      "click": function() {}
  }
}

Load.prototype = {
    draw: function() {

      var row = d3_wrapper_with_title(this._target,"Load Saved State","load")

      d3_updateable(row,"textarea","textarea")
        .attr("id","preload")
        .style("width","300px")
        .style("height","20px")
        .text(this._data)

      d3_updateable(row,"button","button")
        .attr("id","preload-action")
        .on("click",this._on["click"])
        .text("Load")

    }
  , data: function(d) {
      if (d === undefined) return this._data
      this._data = d
      return this
    }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
}

function load(target) {
  return new Load(target)
}

load.prototype = Load.prototype

export default load;
