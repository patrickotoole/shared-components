import d3_wrapper_with_title from './helper';

export function Filter(target) {
  this._target = target
  this._on = {}
}

Filter.prototype = {
    draw: function() {
      var filter_wrap = d3_wrapper_with_title(this._target,"Filter","filter",this._data)


    }
  , summarize: function() {
      var items = []
      this._target.selectAll(".filter")
        .selectAll(".filter-item")
        .each(function(x) {
          var input = d3.select(this).selectAll("input")
          items.push({
              name: input[0][0].value
            , eval: input[0][1].value
          })

        })

      return items
        
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

function filter(target) {
  return new Filter(target)
}

filter.prototype = Filter.prototype

export default filter;
