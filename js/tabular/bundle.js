(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    factory((global.tabular = {}));
}(this, function (exports) { 'use strict';

    function d3_updateable(target, selector, type, data, joiner) {
        var type = type || "div";
        var updateable = target.selectAll(selector).data(function (x) { return data ? [data] : [x]; }, joiner || function (x) { return [x]; });
        updateable.enter()
            .append(type);
        return updateable;
    }
    function d3_splat(target, selector, type, data, joiner) {
        var type = type || "div";
        var updateable = target.selectAll(selector).data(data || function (x) { return x; }, joiner || function (x) { return x; });
        updateable.enter()
            .append(type);
        return updateable;
    }
    function d3_with_class(target, classname) {
        return d3_updateable(target, "." + classname)
            .classed(classname, true);
    }
    function computeHeaders(data) {
        var headers;
        data.map(function (row) {
            return row.value.map(function (point) {
                headers[point.key] = true;
            });
        });
        return Object.keys(headers);
    }
    var Tabular = (function () {
        function Tabular(target) {
            this.WRAPPER_CLASS = "tabular-wrapper";
            this.HEADER_WRAP_CLASS = "head-wrap";
            this.BODY_WRAP_CLASS = "body-wrap";
            this._target = target;
        }
        Tabular.prototype.renderWrapper = function (target) {
            return d3_with_class(target, this.WRAPPER_CLASS);
        };
        Tabular.prototype.renderHeaders = function (target) {
            var head_wrap = d3_with_class(target, this.HEADER_WRAP_CLASS)
                .datum(this._headers);
            return head_wrap;
        };
        Tabular.prototype.renderRows = function (target) {
            var _this = this;
            var body_wrap = d3_with_class(target, this.BODY_WRAP_CLASS);
            var rows = d3_splat(body_wrap, ".row", "div", function (row) { return row.values; }, function (row) { return row.key; })
                .classed("row", true);
            var item = d3_updateable(rows, ".item", "div", function (values) { return values.sort(function (p, q) { return _this._headers.indexOf(p.key) - _this._headers.indexOf(q.key); }); })
                .classed("item", true);
            item.text(String);
            return body_wrap;
        };
        Tabular.prototype.data = function (d) {
            if (!d)
                return this._data;
            this._headers = this._headers || computeHeaders(d);
            this._target.data(d);
            this._data = d;
            return this;
        };
        Tabular.prototype.headers = function (d) {
            if (!d)
                return this._headers;
            this._headers = d;
            return this;
        };
        Tabular.prototype.draw = function () {
            var wrapper = this.renderWrapper(this._target), headers = this.renderHeaders(wrapper), rows = this.renderRows(wrapper);
            return this;
        };
        return Tabular;
    }());
    function tabular(target) {
        return new Tabular(target);
    }

    function square(x) {
        return x * x;
    }

    exports.square = square;
    exports.tabular = tabular;

}));