"use strict";
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
exports.DrawableIdentityFunc = DrawableIdentityFunc;
