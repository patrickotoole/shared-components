(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.helpers = global.helpers || {})));
}(this, (function (exports) {

function __$styleInject(css, returnValue) {
  if (typeof document === 'undefined') {
    return returnValue;
  }
  css = css || '';
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';
  head.appendChild(style);
  
  if (style.styleSheet){
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  return returnValue;
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var d3_updateable = function d3_updateable(target, selector, type, data, joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(function (x) {
    return data ? [data] : [x];
  }, joiner || function (x) {
    return [x];
  });

  updateable.enter().append(type);

  return updateable;
};

var d3_splat = function d3_splat(target, selector, type, data, joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(data || function (x) {
    return x;
  }, joiner || function (x) {
    return x;
  });

  updateable.enter().append(type);

  return updateable;
};

function d3_class(target, cls, type, data) {
  return d3_updateable(target, "." + cls, type || "div", data).classed(cls, true);
}

function noop() {}
function identity(x) {
  return x;
}
function key(x) {
  return x.key;
}

function accessor(attr, val) {
  if (val === undefined) return this["_" + attr];
  this["_" + attr] = val;
  return this;
}

var D3ComponentBase = function () {
  function D3ComponentBase(target) {
    var _this = this;

    classCallCheck(this, D3ComponentBase);

    this._target = target;
    this._on = {};
    this.props().map(function (x) {
      _this[x] = accessor.bind(_this, x);
    });
  }

  createClass(D3ComponentBase, [{
    key: "props",
    value: function props() {
      return ["data"];
    }
  }, {
    key: "on",
    value: function on(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this;
    }
  }]);
  return D3ComponentBase;
}();

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

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZXMiOlsiLi4vaW5kZXguanMiLCJidW5kbGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IGQzX3VwZGF0ZWFibGUgPSBmdW5jdGlvbih0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIlxuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZnVuY3Rpb24oeCl7cmV0dXJuIGRhdGEgPyBbZGF0YV0gOiBbeF19LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4gW3hdfVxuICApXG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKVxuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmV4cG9ydCBjb25zdCBkM19zcGxhdCA9IGZ1bmN0aW9uKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSxkYXRhKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5cIiArIGNscywgdHlwZSB8fCBcImRpdlwiLGRhdGEpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub29wKCkge31cbmV4cG9ydCBmdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmV4cG9ydCBmdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5leHBvcnQgZnVuY3Rpb24gYWNjZXNzb3IoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWxcbiAgcmV0dXJuIHRoaXNcbn1cblxuZXhwb3J0IGNsYXNzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuX29uID0ge31cbiAgICB0aGlzLnByb3BzKCkubWFwKHggPT4ge1xuICAgICAgdGhpc1t4XSA9IGFjY2Vzc29yLmJpbmQodGhpcyx4KVxuICAgIH0pXG4gIH1cbiAgcHJvcHMoKSB7XG4gICAgcmV0dXJuIFtcImRhdGFcIl1cbiAgfVxuICBvbihhY3Rpb24sZm4pIHtcbiAgICBpZiAoZm4gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX29uW2FjdGlvbl0gfHwgbm9vcDtcbiAgICB0aGlzLl9vblthY3Rpb25dID0gZm47XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuIiwidmFyIHZlcnNpb24gPSBcIjAuMC4xXCI7IGV4cG9ydCAqIGZyb20gXCIuLi9pbmRleFwiOyBleHBvcnQge3ZlcnNpb259OyJdLCJuYW1lcyI6WyJkM191cGRhdGVhYmxlIiwidGFyZ2V0Iiwic2VsZWN0b3IiLCJ0eXBlIiwiZGF0YSIsImpvaW5lciIsInVwZGF0ZWFibGUiLCJzZWxlY3RBbGwiLCJ4IiwiZW50ZXIiLCJhcHBlbmQiLCJkM19zcGxhdCIsImQzX2NsYXNzIiwiY2xzIiwiY2xhc3NlZCIsIm5vb3AiLCJpZGVudGl0eSIsImtleSIsImFjY2Vzc29yIiwiYXR0ciIsInZhbCIsInVuZGVmaW5lZCIsIkQzQ29tcG9uZW50QmFzZSIsIl90YXJnZXQiLCJfb24iLCJwcm9wcyIsIm1hcCIs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
