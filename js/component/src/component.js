"use strict";
var drawable_identity_1 = require("./drawable_identity");
var header_1 = require("./header");
var helper_1 = require("./helper");
var Component = (function () {
    function Component(target) {
        this._render_header = header_1.header;
        this._render_body = drawable_identity_1.DrawableIdentityFunc;
        this._render_footer = drawable_identity_1.DrawableIdentityFunc;
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
        var section = helper_1.d3_updateable(this._target, "section", "section", this.data(), function (x) { return 1; }), header = helper_1.d3_with_class(section, "header").datum(function (d) { return d.header; }), body = helper_1.d3_with_class(section, "body").datum(function (d) { return d.data; }), footer = helper_1.d3_with_class(section, "footer").datum(function (d) { return d.footer; });
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
exports.__esModule = true;
exports["default"] = component;
