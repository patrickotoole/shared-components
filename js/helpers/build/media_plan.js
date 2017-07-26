(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('helpers', ['exports'], factory) :
  factory((global.media_plan = {}));
}(this, function (exports) { 'use strict';

  const d3_updateable = function(target,selector,type,data,joiner) {
    var type = type || "div"
    var updateable = target.selectAll(selector).data(
      function(x){return data ? [data] : [x]},
      joiner || function(x){return [x]}
    )

    updateable.enter()
      .append(type)

    return updateable
  }

  const d3_splat = function(target,selector,type,data,joiner) {
    var type = type || "div"
    var updateable = target.selectAll(selector).data(
      data || function(x){return x},
      joiner || function(x){return x}
    )

    updateable.enter()
      .append(type)

    return updateable
  }

  function d3_class(target,cls,type,data) {
    return d3_updateable(target,"." + cls, type || "div",data)
      .classed(cls,true)
  }

  function noop() {}
  function identity(x) { return x }
  function key(x) { return x.key }

  function accessor(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  class D3ComponentBase {
    constructor(target) {
      this._target = target
      this._on = {}
      this.props().map(x => {
        this[x] = accessor.bind(this,x)
      })
    }
    props() {
      return ["data"]
    }
    on(action,fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
  }

  var version = "0.0.1";

  exports.version = version;
  exports.d3_updateable = d3_updateable;
  exports.d3_splat = d3_splat;
  exports.d3_class = d3_class;
  exports.noop = noop;
  exports.identity = identity;
  exports.key = key;
  exports.accessor = accessor;
  exports.D3ComponentBase = D3ComponentBase;

}));