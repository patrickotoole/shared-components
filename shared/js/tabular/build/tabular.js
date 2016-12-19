(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
    typeof define === 'function' && define.amd ? define('tabular', ['exports', 'd3'], factory) :
    factory((global.tabular = {}),global.d3);
}(this, function (exports,d3) { 'use strict';

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
        var headers = {};
        data.map(function (row) {
            return row.value.map(function (point) {
                headers[point.key] = true;
            });
        });
        return Object.keys(headers);
    }
    var Tabular = (function () {
        function Tabular(target) {
            this._render_item = function (data) {
                d3.select(this).text(JSON.stringify);
            };
            this._render_header = function (data) {
                d3.select(this).text(JSON.stringify);
            };
            this.WRAPPER_CLASS = "tabular-wrapper";
            this.HEADER_WRAP_CLASS = "head-wrap";
            this.BODY_WRAP_CLASS = "body-wrap";
            this._target = target;
        }
        Tabular.prototype.renderWrapper = function (target) {
            return d3_with_class(target, this.WRAPPER_CLASS);
        };
        Tabular.prototype.renderHeaders = function (target) {
            var head_wrap = d3_updateable(target, "." + this.HEADER_WRAP_CLASS, "div", this._headers, function (x) { return 1; })
                .classed(this.HEADER_WRAP_CLASS, true);
            var item = d3_splat(head_wrap, ".item", "div")
                .classed("item", true)
                .order()
                .each(this._render_header);
            return head_wrap;
        };
        Tabular.prototype.renderRows = function (target) {
            var _this = this;
            var body_wrap = d3_with_class(target, this.BODY_WRAP_CLASS);
            var rows = d3_splat(body_wrap, ".row", "div", function (row) { return row; }, function (row) { return row.key; })
                .classed("row", true);
            var item = d3_splat(rows, ".item", "div", function (values) { return values.value.sort(function (p, q) { return _this._headers.indexOf(p.key) - _this._headers.indexOf(q.key); }); }, function (x) { return x.key; })
                .classed("item", true)
                .order();
            item.each(this._render_item);
            return body_wrap;
        };
        Tabular.prototype.data = function (d) {
            if (!d)
                return this._data;
            this._headers = this._headers || computeHeaders(d);
            this._target.datum(d);
            this._data = d;
            return this;
        };
        Tabular.prototype.headers = function (d) {
            if (!d)
                return this._headers;
            this._headers = d;
            return this;
        };
        Tabular.prototype.render_header = function (fn) {
            this._render_header = fn;
            return this;
        };
        Tabular.prototype.render_item = function (fn) {
            this._render_item = fn;
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

    var version = "0.0.1";

    exports.version = version;
    exports.square = square;
    exports.tabular = tabular;

}));