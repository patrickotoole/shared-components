(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('component', ['exports'], factory) :
  (factory((global.components = global.components || {})));
}(this, (function (exports) { 'use strict';

function __$styleInject(css, returnValue) {
  if (typeof document === 'undefined') {
    return returnValue;
  }
  css = css || '';
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';
  if (style.styleSheet){
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  head.appendChild(style);
  return returnValue;
}

const d3_updateable = function(target,selector,type,data,joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(
    function(x){return data ? [data] : [x]},
    joiner || function(x){return [x]}
  );

  updateable.enter()
    .append(type);

  return updateable
};



function d3_class(target,cls,type,data) {
  return d3_updateable(target,"." + cls, type || "div",data)
    .classed(cls,true)
}





function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val;
  return this
}

class D3ComponentBase {
  constructor(target) {
    this._target = target;
    this.props().map(x => {
      this["_" + x] = accessor.bind(this,x);
    });
  }
  props() {
    return ["data"]
  }
}

class TabularHeader extends D3ComponentBase {
  constructor(target) {
    super();
    this._target = target;
    this._label = "URL";
  }

  props() { return ["label"] }

  draw() {
    var euh = d3_class(title_row,"expansion-urls-title");

    d3_class(euh,"title").text(this.label());
    d3_class(euh,"view").text("Views");

    var svg_legend = d3_class(euh,"legend","svg");

    d3_updateable(svg_legend,"text.one","text")
      .attr("class","one")
      .attr("x","0")
      .attr("y","20")
      .style("text-anchor","start")
      .text("12 am");

    d3_updateable(svg_legend,"text.two","text")
      .attr("class","two")
      .attr("x","72")
      .attr("y","20")
      .style("text-anchor","middle")
      .text("12 pm");

    d3_updateable(svg_legend,"text.three","text")
      .attr("class","three")
      .attr("x","144")
      .attr("y","20")
      .style("text-anchor","end")
      .text("12 am");

    d3_updateable(svg_legend,"line.one","line")
      .classed("one",true)
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 25)
      .attr("y2", 35)
      .attr("x1", 0)
      .attr("x2", 0);

    d3_updateable(svg_legend,"line.two","line")
      .classed("two",true)
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 25)
      .attr("y2", 35)
      .attr("x1", 72)
      .attr("x2", 72);

    d3_updateable(svg_legend,"line.three","line")
      .classed("three",true)
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 25)
      .attr("y2", 35)
      .attr("x1", 144)
      .attr("x2", 144);


  }
}

__$styleInject(".expansion-urls-title {\n  width:50%;\n  height:36px;\n  line-height:36px;\n  display:inline-block;\n  vertical-align:top;\n}\n.expansion-urls-title .title {\n  width:265px;\n  font-weight:bold;\n  display:inline-block;\n  vertical-align:top;\n}\n\n.expansion-urls-titl .view {\n  width:40px;\n  margin-left:20px;\n  margin-right:20px;\n  font-weight:bold;\n  display:inline-block;\n  vertical-align:top;\n}\n.legend {\n  width:144px;\n  height:36px;\n  vertical-align:top;\n}\n\n",undefined);

function tabular_timeseries(target) {
  return new TabularTimeseries(target)
}

class TabularTimeseries extends D3ComponentBase {
  constructor(target) {
    super();
    this._target = target;
  }

  props() { return ["data","label"] }

  draw() {
    let td = this._target;

    var title_row = d3_class(td,"title-row");
    var expansion_row = d3_class(td,"expansion-row");

    var header = (new TabularHeader(expansion_row))
      .label(this.label())
      .draw();
    
  }
}

var version = "0.0.1";

exports.version = version;
exports.tabular_timeseries = tabular_timeseries;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50cy5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL2hlbHBlcnMvaW5kZXguanMiLCIuLi9zcmMvdGFidWxhcl90aW1lc2VyaWVzL2hlYWRlci5qcyIsIi4uL3NyYy90YWJ1bGFyX3RpbWVzZXJpZXMvaW5kZXguanMiLCJidW5kbGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IGQzX3VwZGF0ZWFibGUgPSBmdW5jdGlvbih0YXJnZXQsc2VsZWN0b3IsdHlwZSxkYXRhLGpvaW5lcikge1xuICB2YXIgdHlwZSA9IHR5cGUgfHwgXCJkaXZcIlxuICB2YXIgdXBkYXRlYWJsZSA9IHRhcmdldC5zZWxlY3RBbGwoc2VsZWN0b3IpLmRhdGEoXG4gICAgZnVuY3Rpb24oeCl7cmV0dXJuIGRhdGEgPyBbZGF0YV0gOiBbeF19LFxuICAgIGpvaW5lciB8fCBmdW5jdGlvbih4KXtyZXR1cm4gW3hdfVxuICApXG5cbiAgdXBkYXRlYWJsZS5lbnRlcigpXG4gICAgLmFwcGVuZCh0eXBlKVxuXG4gIHJldHVybiB1cGRhdGVhYmxlXG59XG5cbmV4cG9ydCBjb25zdCBkM19zcGxhdCA9IGZ1bmN0aW9uKHRhcmdldCxzZWxlY3Rvcix0eXBlLGRhdGEsam9pbmVyKSB7XG4gIHZhciB0eXBlID0gdHlwZSB8fCBcImRpdlwiXG4gIHZhciB1cGRhdGVhYmxlID0gdGFyZ2V0LnNlbGVjdEFsbChzZWxlY3RvcikuZGF0YShcbiAgICBkYXRhIHx8IGZ1bmN0aW9uKHgpe3JldHVybiB4fSxcbiAgICBqb2luZXIgfHwgZnVuY3Rpb24oeCl7cmV0dXJuIHh9XG4gIClcblxuICB1cGRhdGVhYmxlLmVudGVyKClcbiAgICAuYXBwZW5kKHR5cGUpXG5cbiAgcmV0dXJuIHVwZGF0ZWFibGVcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGQzX2NsYXNzKHRhcmdldCxjbHMsdHlwZSxkYXRhKSB7XG4gIHJldHVybiBkM191cGRhdGVhYmxlKHRhcmdldCxcIi5cIiArIGNscywgdHlwZSB8fCBcImRpdlwiLGRhdGEpXG4gICAgLmNsYXNzZWQoY2xzLHRydWUpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub29wKCkge31cbmV4cG9ydCBmdW5jdGlvbiBpZGVudGl0eSh4KSB7IHJldHVybiB4IH1cbmV4cG9ydCBmdW5jdGlvbiBrZXkoeCkgeyByZXR1cm4geC5rZXkgfVxuXG5leHBvcnQgZnVuY3Rpb24gYWNjZXNzb3IoYXR0ciwgdmFsKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXNbXCJfXCIgKyBhdHRyXVxuICB0aGlzW1wiX1wiICsgYXR0cl0gPSB2YWxcbiAgcmV0dXJuIHRoaXNcbn1cblxuZXhwb3J0IGNsYXNzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHRoaXMuX3RhcmdldCA9IHRhcmdldFxuICAgIHRoaXMucHJvcHMoKS5tYXAoeCA9PiB7XG4gICAgICB0aGlzW1wiX1wiICsgeF0gPSBhY2Nlc3Nvci5iaW5kKHRoaXMseClcbiAgICB9KVxuICB9XG4gIHByb3BzKCkge1xuICAgIHJldHVybiBbXCJkYXRhXCJdXG4gIH1cbn1cbiIsImltcG9ydCB7ZDNfY2xhc3MsIGQzX3NwbGF0LCBkM191cGRhdGVhYmxlLCBEM0NvbXBvbmVudEJhc2V9IGZyb20gJ2hlbHBlcnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRhYnVsYXJIZWFkZXIgZXh0ZW5kcyBEM0NvbXBvbmVudEJhc2Uge1xuICBjb25zdHJ1Y3Rvcih0YXJnZXQpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5fbGFiZWwgPSBcIlVSTFwiXG4gIH1cblxuICBwcm9wcygpIHsgcmV0dXJuIFtcImxhYmVsXCJdIH1cblxuICBkcmF3KCkge1xuICAgIHZhciBldWggPSBkM19jbGFzcyh0aXRsZV9yb3csXCJleHBhbnNpb24tdXJscy10aXRsZVwiKVxuXG4gICAgZDNfY2xhc3MoZXVoLFwidGl0bGVcIikudGV4dCh0aGlzLmxhYmVsKCkpXG4gICAgZDNfY2xhc3MoZXVoLFwidmlld1wiKS50ZXh0KFwiVmlld3NcIilcblxuICAgIHZhciBzdmdfbGVnZW5kID0gZDNfY2xhc3MoZXVoLFwibGVnZW5kXCIsXCJzdmdcIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcInRleHQub25lXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJvbmVcIilcbiAgICAgIC5hdHRyKFwieFwiLFwiMFwiKVxuICAgICAgLmF0dHIoXCJ5XCIsXCIyMFwiKVxuICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIixcInN0YXJ0XCIpXG4gICAgICAudGV4dChcIjEyIGFtXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0LnR3b1wiLFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLFwidHdvXCIpXG4gICAgICAuYXR0cihcInhcIixcIjcyXCIpXG4gICAgICAuYXR0cihcInlcIixcIjIwXCIpXG4gICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLFwibWlkZGxlXCIpXG4gICAgICAudGV4dChcIjEyIHBtXCIpXG5cbiAgICBkM191cGRhdGVhYmxlKHN2Z19sZWdlbmQsXCJ0ZXh0LnRocmVlXCIsXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsXCJ0aHJlZVwiKVxuICAgICAgLmF0dHIoXCJ4XCIsXCIxNDRcIilcbiAgICAgIC5hdHRyKFwieVwiLFwiMjBcIilcbiAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsXCJlbmRcIilcbiAgICAgIC50ZXh0KFwiMTIgYW1cIilcblxuICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmUub25lXCIsXCJsaW5lXCIpXG4gICAgICAuY2xhc3NlZChcIm9uZVwiLHRydWUpXG4gICAgICAuc3R5bGUoXCJzdHJva2UtZGFzaGFycmF5XCIsIFwiMSw1XCIpXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLDEpXG4gICAgICAuYXR0cihcInN0cm9rZVwiLFwiYmxhY2tcIilcbiAgICAgIC5hdHRyKFwieTFcIiwgMjUpXG4gICAgICAuYXR0cihcInkyXCIsIDM1KVxuICAgICAgLmF0dHIoXCJ4MVwiLCAwKVxuICAgICAgLmF0dHIoXCJ4MlwiLCAwKVxuXG4gICAgZDNfdXBkYXRlYWJsZShzdmdfbGVnZW5kLFwibGluZS50d29cIixcImxpbmVcIilcbiAgICAgIC5jbGFzc2VkKFwidHdvXCIsdHJ1ZSlcbiAgICAgIC5zdHlsZShcInN0cm9rZS1kYXNoYXJyYXlcIiwgXCIxLDVcIilcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsMSlcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsXCJibGFja1wiKVxuICAgICAgLmF0dHIoXCJ5MVwiLCAyNSlcbiAgICAgIC5hdHRyKFwieTJcIiwgMzUpXG4gICAgICAuYXR0cihcIngxXCIsIDcyKVxuICAgICAgLmF0dHIoXCJ4MlwiLCA3MilcblxuICAgIGQzX3VwZGF0ZWFibGUoc3ZnX2xlZ2VuZCxcImxpbmUudGhyZWVcIixcImxpbmVcIilcbiAgICAgIC5jbGFzc2VkKFwidGhyZWVcIix0cnVlKVxuICAgICAgLnN0eWxlKFwic3Ryb2tlLWRhc2hhcnJheVwiLCBcIjEsNVwiKVxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwxKVxuICAgICAgLmF0dHIoXCJzdHJva2VcIixcImJsYWNrXCIpXG4gICAgICAuYXR0cihcInkxXCIsIDI1KVxuICAgICAgLmF0dHIoXCJ5MlwiLCAzNSlcbiAgICAgIC5hdHRyKFwieDFcIiwgMTQ0KVxuICAgICAgLmF0dHIoXCJ4MlwiLCAxNDQpXG5cblxuICB9XG59XG4iLCJpbXBvcnQge2QzX2NsYXNzLCBkM19zcGxhdCwgZDNfdXBkYXRlYWJsZSwgYWNjZXNzb3IsIEQzQ29tcG9uZW50QmFzZX0gZnJvbSAnaGVscGVycydcbmltcG9ydCBUYWJ1bGFySGVhZGVyIGZyb20gJy4vaGVhZGVyJ1xuaW1wb3J0ICcuL3RhYnVsYXJfdGltZXNlcmllcy5jc3MnXG5cbmV4cG9ydCBmdW5jdGlvbiB0YWJ1bGFyX3RpbWVzZXJpZXModGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgVGFidWxhclRpbWVzZXJpZXModGFyZ2V0KVxufVxuXG5jbGFzcyBUYWJ1bGFyVGltZXNlcmllcyBleHRlbmRzIEQzQ29tcG9uZW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKHRhcmdldCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLl90YXJnZXQgPSB0YXJnZXRcbiAgfVxuXG4gIHByb3BzKCkgeyByZXR1cm4gW1wiZGF0YVwiLFwibGFiZWxcIl0gfVxuXG4gIGRyYXcoKSB7XG4gICAgbGV0IHRkID0gdGhpcy5fdGFyZ2V0XG5cbiAgICB2YXIgdGl0bGVfcm93ID0gZDNfY2xhc3ModGQsXCJ0aXRsZS1yb3dcIilcbiAgICB2YXIgZXhwYW5zaW9uX3JvdyA9IGQzX2NsYXNzKHRkLFwiZXhwYW5zaW9uLXJvd1wiKVxuXG4gICAgdmFyIGhlYWRlciA9IChuZXcgVGFidWxhckhlYWRlcihleHBhbnNpb25fcm93KSlcbiAgICAgIC5sYWJlbCh0aGlzLmxhYmVsKCkpXG4gICAgICAuZHJhdygpXG4gICAgXG4gIH1cbn1cbiIsInZhciB2ZXJzaW9uID0gXCIwLjAuMVwiOyBleHBvcnQgKiBmcm9tIFwiLi4vaW5kZXhcIjsgZXhwb3J0IHt2ZXJzaW9ufTsiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBTyxNQUFNLGFBQWEsR0FBRyxTQUFTLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7RUFDdEUsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEtBQUssQ0FBQTtFQUN4QixJQUFJLFVBQVUsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUk7SUFDOUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMs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
