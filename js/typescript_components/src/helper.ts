import ID3Selection from './d3.d';


export function d3_updateable(target: ID3Selection, selector: string, type: string, data? : array<any>, joiner?: any): ID3Selection {
    var type = type || "div";
    var updateable = target.selectAll(selector).data(function (x) { return data ? [data] : [x]; }, joiner || function (x) { return [x]; });
    updateable.enter()
        .append(type);
    return updateable;
}

export function d3_splat(target: ID3Selection, selector: string, type: string, data?, joiner?) :ID3Selection {
    var type = type || "div";
    var updateable = target.selectAll(selector).data(data || function (x) { return x; }, joiner || function (x) { return x; });
    updateable.enter()
        .append(type);
    return updateable;
}

export function d3_with_class(target: ID3Selection, classname: string) {
    return d3_updateable(target, "." + classname)
        .classed(classname, true);
}
