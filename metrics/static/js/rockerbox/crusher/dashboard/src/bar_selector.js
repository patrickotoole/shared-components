import accessor from './helpers'
import {autoSize as autoSize} from './helpers'
import {autoScales as autoScales} from './helpers'


var EXAMPLE_DATA = {
    "key": "Categories"
  , "values": [
      {  
          "key":"cat1"
        , "value": 12344
        , "percent": .50

      }
    , {
          "key":"cat2"
        , "value": 12344
        , "percent": .50

      }
  ] 
}

export function BarSelector(target) {
  var nullfunc = function() {}
  this._target = target;
  this._data = EXAMPLE_DATA
  this._categories = {}
  this._on = {
      click: nullfunc
  }
  this._type = "checkbox"
}

export default function bar_selector(target) {
  return new BarSelector(target)
}

BarSelector.prototype = {

    data: function(val) { return accessor.bind(this)("data",val) }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action];
      this._on[action] = fn;
      return this
    }
  , type: function(val) { return accessor.bind(this)("type",val) }
  , title: function(val) { return accessor.bind(this)("title",val) }
  , draw: function() {

      var self = this
      var wrap = this._target
      var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
        .classed("vendor-domains-bar-desc",true)
        .style("display","inherit")
        .datum(this._data)


      var wrapper = d3_updateable(desc,".w","div")
        .classed("w",true)

      wrapper.each(function(row) {

          var data = row.values
  
          d3_updateable(wrapper, "h3","h3")
            .text(function(x){return x.key})
            .style("margin-bottom","15px")
    
          var _sizes = autoSize(wrapper,function(d){return d -50}, function(d){return 400})
          var len = data.length
    
          var scales = autoScales(_sizes,len),
            x = scales.x,
            y = scales.y,
            xAxis = scales.xAxis;
            
          var svg_wrap = d3_updateable(wrapper,"svg","svg")
            .attr("width", _sizes.width + _sizes.margin.left + _sizes.margin.right) 
            .attr("height", _sizes.height + _sizes.margin.top + _sizes.margin.bottom)
          
          var svg = d3_splat(svg_wrap,"g","g",function(x) { return [x.values]},function(x,i) {return i })
            .attr("transform", "translate(" + _sizes.margin.left + "," + 0 + ")")
        
          var valueAccessor = function(x){ return x.value }
            , labelAccessor = function(x) { return x.key }
    
          var values = data.map(valueAccessor)
        
          x.domain(
            d3.extent(
              [
                   d3.min(values)-.1,d3.max(values)+.1
                , -d3.min(values)+.1,-d3.max(values)-.1
              ],
              function(x) { return x}
            )
          ).nice();
        
          y.domain(data.map(labelAccessor));
        

          var bar = d3_splat(svg,".bar","rect",false,labelAccessor)
              .attr("class", function(d) { return valueAccessor(d) < 0 ? "bar negative" : "bar positive"; })
              .attr("x",_sizes.width/2 + 60)
              .attr("y", function(d) { return y(labelAccessor(d)); })
              .attr("width", function(d) { return Math.abs(x(valueAccessor(d)) - x(0)); })
              .attr("height", y.rangeBand())
              .style("cursor", "pointer")
              .on("click", function(x) {
                self._click.bind(this)(x,self)
              })
        
          bar.exit().remove()
        
        
          var checks = d3_splat(svg,".check","foreignObject",false,labelAccessor)
              .classed("check",true)
              .attr("x",2)
              .attr("y", function(d) { return y(labelAccessor(d)) })
              .html("<xhtml:tree></xhtml:tree>")
        
            svg.selectAll("foreignobject").each(function(z){
              var tree = d3.select(this.children[0])
              var z = z
              d3_updateable(tree,"input","input")
                .attr("type",self._type)
                .property("checked",function(y){
                  return z.selected ? "checked" : undefined
                })
                .on("click", function(x) {
                  self._on.click.bind(this)(z,self)
                })
            })
        
        
        
          checks.exit().remove()
        
        
          var label = d3_splat(svg,".name","text",false,labelAccessor)
              .classed("name",true)
              .attr("x",25)
              .attr("style", "text-anchor:start;dominant-baseline: middle;")
              .attr("y", function(d) { return y(labelAccessor(d)) + y.rangeBand()/2 + 1; })
              .text(labelAccessor)
        
          label.exit().remove()
        
          var percent = d3_splat(svg,".percent","text",false,labelAccessor)
              .classed("percent",true)
              .attr("x",_sizes.width/2 + 20)
              .attr("style", "text-anchor:start;dominant-baseline: middle;font-size:.9em")
              .attr("y", function(d) { return y(labelAccessor(d)) + y.rangeBand()/2 + 1; })
              .classed("hidden",function(d) {return d.percent === undefined })
              .text(function(d) {
                var v = d3.format("%")(d.percent);
                var x = (d.percent > 0) ?  "↑" : "↓"
                return "(" + v + x  + ")"
              })
        
          svg.append("g")
              .attr("class", "y axis")
            .append("line")
              .attr("x1", x(0))
              .attr("x2", x(0))
              .attr("y2", _sizes.height);

      })

    }
}
