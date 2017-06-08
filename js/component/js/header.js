"use strict";
var helper_1 = require("./helper");
var Header = (function () {
    //_render_before = function() {}
    //_render_after = function() {}
    //_render_title = function() {}
    //_render_buttons = function() {}
    function Header(target) {
        this._target = target;
    }
    Header.prototype.draw = function () {
        var before = helper_1.d3_with_class(this._target, "before"), main = helper_1.d3_with_class(this._target, "main"), after = helper_1.d3_with_class(this._target, "after");
        return this;
    };
    return Header;
}());
function header(target) {
    return new Header(target);
}
exports.header = header;
