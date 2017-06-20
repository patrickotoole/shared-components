import d3 from 'd3'
import summary from './summary'
import {formatter, calculateMetrics, collectMetrics, flatten, flatten_and_summarize, updateTreeValue, pruneTree} from './funnel-helper'

var drawFlame = function(data,nodeColor,nodeSize,comparisonValue,filterComparison,colors){

    var comparisonType = filterComparison == "less than" ? 1 : 0

    var comparisonValue = comparisonValue;
    var campaigns = updateTreeValue(data, nodeSize);

    var lessThan = campaigns.filter(function(d){ return d.metrics[nodeColor] < comparisonValue})
    var greaterThan = campaigns.filter(function(d){ return d.metrics[nodeColor] > comparisonValue})

    var transform = function(x) { return Math.log(x) }

    if (nodeColor.indexOf("roas") > -1 || nodeColor.indexOf("ctr") > -1) {
      colors = colors.reverse()
      transform = function(x) { return Math.log(Math.pow(x,2)) }
    }

    var colorScale = d3.scale.quantile()
        .domain( campaigns.map(function(d){return transform(d.metrics[nodeColor])}))
        .range(colors)

    var colorGood = d3.scale.quantile()
        .domain(lessThan.map(function(d){return transform(d.metrics[nodeColor])}))
        .range(colors.slice(0,5))

    var colorBad = d3.scale.quantile()
        .domain(greaterThan.map(function(d){return transform(d.metrics[nodeColor])}))
        .range(colors.slice(5))


    function colorMapper(d){
        if (d['metrics'] === undefined || d['metrics'][nodeColor] == 0 ){
            return "#df5952"
        }
        if (comparisonValue && comparisonValue.length > 0) {
            if (d['metrics'][nodeColor] > comparisonValue) return colorBad(transform(d['metrics'][nodeColor]))
            if (d['metrics'][nodeColor] < comparisonValue) return colorGood(transform(d['metrics'][nodeColor]))
        }
        return colorScale(Math.log(d['metrics'][nodeColor]))
    }

    var tip = d3.tip()
        .direction("s")
        .offset([8, 0])
        .attr('class', 'd3-flame-graph-tip')
        .html(function(d) { 
            var label = d['name']
            label = label + "<br>" + nodeSize + " : " +  formatter(nodeSize)(d['metrics'][nodeSize])

            label = label + " <br> " + nodeColor + " : " + formatter(nodeColor)(d['metrics'][nodeColor])
            return label
        });

    var flamegraph = d3.flameGraph()
        .width(800)
        .height(2000)
        .cellHeight(150)
        .tooltip(tip)
        .color(colorMapper)
        .onClick(function(d){
            updateFlame(d)
        })

    d3.select("#chart") // PASS THIS IN AS AN ARG
        .datum(data)
        .call(flamegraph);

    var updateFlame = function(d){

        var unfilteredWrapper = d3.select("#unfiltered-summary") // PASS THESE IN AS ARGS
        var filteredWrapper = d3.select("#filtered-summary") // PASS THESE IN AS ARGS

        var levelMetrics = flatten_and_summarize([d])
        summary(unfilteredWrapper, levelMetrics, nodeColor, nodeSize)

        d3.select("#chart").selectAll('rect').style("opacity",1)

        var _campaigns = pruneTree(d, nodeColor,comparisonValue, comparisonType)
        var levelMetricsFiltered = flatten_and_summarize( _campaigns)
        summary(filteredWrapper, levelMetricsFiltered, nodeColor, nodeSize)

        d3.selectAll('rect')
          .style("opacity",function(d){ return (!comparisonValue || d.highlight) ? 1 : .1 })
          .attr("fill",function(d) { return colorMapper(d) })

    }

    updateFlame(data)
}

export default drawFlame;
