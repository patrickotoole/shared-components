"use strict";
function d3_updateable(target, selector, type, data, joiner) {
    var type = type || "div";
    var updateable = target.selectAll(selector).data(function (x) { return data ? [data] : [x]; }, joiner || function (x) { return [x]; });
    updateable.enter()
        .append(type);
    return updateable;
}
exports.d3_updateable = d3_updateable;
function d3_splat(target, selector, type, data, joiner) {
    var type = type || "div";
    var updateable = target.selectAll(selector).data(data || function (x) { return x; }, joiner || function (x) { return x; });
    updateable.enter()
        .append(type);
    return updateable;
}
exports.d3_splat = d3_splat;
function d3_with_class(target, classname) {
    return d3_updateable(target, "." + classname)
        .classed(classname, true);
}
exports.d3_with_class = d3_with_class;
