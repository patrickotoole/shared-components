import d3 from 'd3'
import {formatter, levelLabel} from './funnel-helper'


function summary(wrapper, levelMetrics, nodeColor, nodeSize){

    var metrics = [
        nodeSize, 
        nodeColor, 
        "attr_conv_total", 
        "num_strategies"
    ]

    var columns = ["metrics","total","level2","level3","level4","level5"]

    wrapper.selectAll("table").remove()
    var table = wrapper.append("table")

    var thead = table.append("thead")
    thead.selectAll("th").data(columns).enter().append('th').text(function(d){
        return levelLabel(d)
    })

    var tbody = table.append("tbody")
    var rows = tbody.selectAll("tr").data(metrics)
    rows.enter().append('tr')
    rows.exit().remove()

    var items = rows.selectAll("td").data(columns)
    items.enter().append('td')
    items.style("font-weight",function(d){
        if(d ==="level0"){
            return "bold"
        }
    })

    items.append("div").text(function(d){
        var metric = d3.select(this.parentNode.parentNode).datum()
        var col = d
        var level =  levelMetrics.filter(function(x){return x.key == col})[0]

        if(col === "metrics"){
            return metric
        }
        else if (col === "total"){
            return level ? formatter(metric)(level.values['metrics'][metric]) : NaN
        }
        else{
            return level ? formatter(metric)(level.values['campaign_metrics'][metric]) : NaN
        }
    })

    table.selectAll("td").style("width","150px")
    table.style({"margin-bottom":"5px", "margin-top":"5px"})
}

export default summary;
