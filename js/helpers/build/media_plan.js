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

  var version = "0.0.1";

  exports.version = version;
  exports.d3_updateable = d3_updateable;
  exports.d3_splat = d3_splat;

}));