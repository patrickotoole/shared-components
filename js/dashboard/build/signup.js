(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('dashboard', ['exports'], factory) :
  factory((global.signup = {}));
}(this, function (exports) { 'use strict';

  function accessor(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  function Dashboard(target) {
    this._target = target;
  }

  function dashboard(target) {
    return new Dashboard(target)
  }

  Dashboard.prototype = {
      draw: function() {
        this._target
        debugger
      }
    , data: function(val) { return accessor.bind(this)("data",val) }
    , update: function(val) {
        this.text(val)
        this.draw()
      }
  }

  var version = "0.0.1";

  exports.version = version;
  exports.dashboard = dashboard;

}));