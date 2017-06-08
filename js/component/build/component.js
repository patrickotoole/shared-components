(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define('component', ['exports'], factory) :
    factory((global.component = {}));
}(this, function (exports) { 'use strict';

    var DrawableIdentity = (function () {
        function DrawableIdentity(target) {
            this._target = target;
        }
        DrawableIdentity.prototype.data = function (d) {
            if (!d)
                return this._data;
            return this;
        };
        DrawableIdentity.prototype.draw = function () {
            return this;
        };
        return DrawableIdentity;
    }());
    function DrawableIdentityFunc(target) {
        return new DrawableIdentity(target);
    }

    function d3_updateable(target, selector, type, data, joiner) {
        var type = type || "div";
        var updateable = target.selectAll(selector).data(function (x) { return data ? [data] : [x]; }, joiner || function (x) { return [x]; });
        updateable.enter()
            .append(type);
        return updateable;
    }
    function d3_with_class(target, classname) {
        return d3_updateable(target, "." + classname)
            .classed(classname, true);
    }

    var Header = (function () {
        //_render_before = function() {}
        //_render_after = function() {}
        //_render_title = function() {}
        //_render_buttons = function() {}
        function Header(target) {
            this._target = target;
        }
        Header.prototype.draw = function () {
            var before = d3_with_class(this._target, "before"), main = d3_with_class(this._target, "main"), after = d3_with_class(this._target, "after");
            return this;
        };
        return Header;
    }());
    function header(target) {
        return new Header(target);
    }

    var Component = (function () {
        function Component(target) {
            this._render_header = header;
            this._render_body = DrawableIdentityFunc;
            this._render_footer = DrawableIdentityFunc;
            this._target = target;
        }
        Component.prototype.data = function (d) {
            if (!d)
                return this._data;
            this._data = d;
            return this;
        };
        Component.prototype.header_data = function (d) {
            if (!d)
                return this._header_data;
            this._header_data = d;
            return this;
        };
        Component.prototype.footer_data = function (d) {
            if (!d)
                return this._footer_data;
            this._footer_data = d;
            return this;
        };
        Component.prototype.header = function (draw) {
            if (!draw)
                return this._render_header;
            this._render_header = draw;
            return this;
        };
        Component.prototype.body = function (draw) {
            if (!draw)
                return this._render_body;
            this._render_body = draw;
            return this;
        };
        Component.prototype.footer = function (draw) {
            if (!draw)
                return this._render_footer;
            this._render_footer = draw;
            return this;
        };
        Component.prototype.draw = function () {
            var all_data = {
                data: this.data(),
                header: this.header_data(),
                footer: this.footer_data()
            };
            var section = d3_updateable(this._target, "section", "section", this.data(), function (x) { return 1; }), header = d3_with_class(section, "header").datum(function (d) { return d.header; }), body = d3_with_class(section, "body").datum(function (d) { return d.data; }), footer = d3_with_class(section, "footer").datum(function (d) { return d.footer; });
            this._render_header(header).draw();
            this._render_body(body).draw();
            this._render_footer(footer).draw();
            return this;
        };
        return Component;
    }());
    function component(target) {
        return new Component(target);
    }

    var version = "0.0.1";

    exports.version = version;
    exports.component = component;

}));