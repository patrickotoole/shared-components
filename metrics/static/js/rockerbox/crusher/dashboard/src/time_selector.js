import accessor from './helpers'
import {autoSize as autoSize} from './helpers'


var EXAMPLE_DATA = {
    "key": "Browsing behavior by time"
  , "values": [
      {  
          "key": 1
        , "value": 12344
      }
    , {
          "key": 2
        , "value": 12344
      }
    , {
          "key": 2.25
        , "value": 12344
      }
    , {
          "key": 2.5
        , "value": 12344
      }
    , {
          "key": 3
        , "value": 1234
      }

    , {
          "key": 4
        , "value": 12344
      }


  ] 
}

export function TimeSelector(target) {
  this._target = target;
  this._data = EXAMPLE_DATA
}

export default function time_selector(target) {
  return new TimeSelector(target)
}

TimeSelector.prototype = {

    data: function(val) { return accessor.bind(this)("data",val) }
  , title: function(val) { return accessor.bind(this)("title",val) }
  , draw: function() {
      var wrap = this._target
      var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
        .classed("vendor-domains-bar-desc",true)
        .style("display","inherit")
        .style("height","100%")
        .datum(this._data)

      var wrapper = d3_updateable(desc,".w","div")
        .classed("w",true)
        .style("height","100%")

  
      

      wrapper.each(function(row){

        var data = row.values
          , count = data.length;

        d3_updateable(wrapper, "h3","h3")
          .text(function(x){return x.key})
          .style("margin-bottom","15px")

        var _sizes = autoSize(wrapper,function(d){return d -50}, function(d){return d - 40}),
          gridSize = Math.floor(_sizes.width / 24 / 3);

        var valueAccessor = function(x) { return x.value }
          , keyAccessor = function(x) { return x.key }

        var steps = Array.apply(null, Array(count)).map(function (_, i) {return i+1;})

        var _colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"]
        var colors = _colors

        var x = d3.scale.ordinal().range(steps)
          , y = d3.scale.linear().range([_sizes.height, 0 ]);

        var colorScale = d3.scale.quantile()
          .domain([0, d3.max(data, function (d) { return d.frequency; })])
          .range(colors);

        var svg_wrap = d3_updateable(wrapper,"svg","svg")
          .attr("width", _sizes.width + _sizes.margin.left + _sizes.margin.right)
          .attr("height", _sizes.height + _sizes.margin.top + _sizes.margin.bottom)

        var svg = d3_updateable(svg_wrap,"g","g")
          .attr("transform", "translate(" + _sizes.margin.left + "," + 0 + ")")
          .datum(function(x) { return x.values })

        x.domain(data.map(function(d) { return keyAccessor(d) }));
        y.domain([0, d3.max(data, function(d) { return Math.sqrt(valueAccessor(d)); })]);

        svg.selectAll(".timing-bar")
          .data(data)
        .enter().append("rect")
          .attr("class", "timing-bar")
          .attr("x", function(d) { return ((keyAccessor(d) - 1) * gridSize * 3); })
          .attr("width", gridSize - 2)
          .attr("y", function(d) { return y(Math.sqrt( valueAccessor(d) )); })
          .attr("fill","#aaa")
          .attr("fill",function(x) { return colorScale( valueAccessor(x) ) } )
          .attr("stroke","white")
          .attr("stroke-width","1px")
          .attr("height", function(d) { return _sizes.height - y(Math.sqrt( valueAccessor(d) )); })
          .style("opacity","1")
          .on("click",function(x){ return false })
    
      var z = d3.time.scale()
        .range([0, _sizes.width])
        .nice(d3.time.hour,24)
        
    
      var xAxis = d3.svg.axis()
        .scale(z)
        .ticks(3)
        .tickFormat(d3.time.format("%I %p"));
    
      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + _sizes.height + ")")
          .call(xAxis);



        
      })


    }
}
