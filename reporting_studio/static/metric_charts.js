var drawMetrics = function(wrapper, data, group, name, metrics){
    wrapper.selectAll("svg").remove()

    function getSummedDates(data, startDate, endDate){

        var allDates = d3.time.scale().domain([new Date(startDate), new Date(endDate)])
                        .ticks(d3.time.days, 1)
                        .map(function(d){ return  d3.time.format('%Y-%m-%d 00:00:00')(d)})

        var summed =  d3.nest().key(function(d){return d['date']})
                        .rollup(function(byDate){
                            return {
                                'imps':  d3.sum(byDate, function(x) {return x['imps']}),
                                'media_cost':  d3.sum(byDate, function(x) {return x['media_cost']}),
                                'conv':  d3.sum(byDate, function(x) {return x['conv']}),
                                'attr_conv':  d3.sum(byDate, function(x) {return x['attr_conv']}),
                                'clicks':  d3.sum(byDate, function(x) {return x['clicks']})
                            }
                        })
                        .entries(data)

        var dates = summed.map(function(x){return x.key})
        allDates.map(function(d){

            if (dates.indexOf(d) <= -1){
                summed.push({'key':d, 'values':{'imps':0,'media_cost':0,'conv':0,'attr_conv':0, 'clicks':0} })
            }
        })
        summed = summed.sort(function(a,b){return d3.ascending(a.key, b.key)})

        summed = summed.map(function(d,i){
            d['values']['clicks_7d'] = d3.sum(summed.slice(Math.max(0,i-6),i+1), function(x) {return x.values['clicks']})
            d['values']['imps_7d'] = d3.sum(summed.slice(Math.max(0,i-6),i+1), function(x) {return x.values['imps']})
            d['values']['media_cost_7d'] = d3.sum(summed.slice(Math.max(0,i-6),i+1), function(x) {return x.values['media_cost']})
            d['values']['conv_7d'] = d3.sum(summed.slice(Math.max(0,i-6),i+1), function(x) {return x.values['conv']})  
            d['values']['attr_conv_7d'] = d3.sum(summed.slice(Math.max(0,i-6),i+1), function(x) {return x.values['attr_conv']})                
            return d
        })

        summed = summed.map(function(d){
            d['values']['CPA'] = d['values']['attr_conv'] >0 ? d['values']['media_cost'] / d['values']['attr_conv'] : NaN
            d['values']['CPM'] = d['values']['imps'] >0 ? d['values']['media_cost']*1000 / d['values']['imps'] : NaN
            d['values']['conv_rate_7d'] = d['values']['imps_7d'] >0 ? d['values']['attr_conv_7d'] / d['values']['imps_7d'] : NaN
            d['values']['CPA_7d'] = d['values']['attr_conv_7d'] >0 ? d['values']['media_cost_7d'] / d['values']['attr_conv_7d'] : NaN
            d['values']['CPA_proj'] = d['values']['conv_rate_7d'] >0 ? (d['values']['CPM']/1000) / d['values']['conv_rate_7d'] : NaN
            d['values']['CTR_7d'] = d['values']['imps_7d'] >0 ? d['values']['clicks_7d'] / d['values']['imps_7d'] : NaN
            d['values']['CPC_7d'] = d['values']['clicks_7d'] >0 ? d['values']['media_cost_7d'] / d['values']['clicks_7d'] : NaN
            return d
        })
        return summed
    }
    
    var [startDate, endDate] = d3.extent(data, function(d){return d.date})

    var grouped;

    if (group){

        var top = d3.nest().key(function(d){ return d[group] }).rollup(function(d){return d3.sum(d, function(x){return x['imps']})}).entries(data)
                        .sort(function(a,b){return d3.descending(a.values, b.values)}).slice(0,5).map(function(d){return d.key})

        var tranformed = data.map(function(d){
            if(top.indexOf(d[group]) <= -1  ){
                d[group] = "Other"
            }
            return d
        })

        grouped = d3.nest().key(function(d){ return d[group] })
                            .rollup(function(group){
                                return getSummedDates(group, startDate, endDate)
                            })
                            .entries(tranformed)            
    } else{
        grouped = getSummedDates(data, startDate, endDate)
        grouped = [{'key':name, 'values': grouped}]
    }

    var divs = wrapper.selectAll("div").data(metrics)
    divs.enter().append('div')
    divs.classed("chart",true)
    divs.exit().remove()

    divs.each(function(d){

        var self = d3.select(this)
        self.selectAll("*").remove()

        self.append("h2").text(d)

        var chart;
        if ( d.indexOf("media_cost") > -1 || d.indexOf("imps") > -1 || d == "conv" || d=="clicks"){
            chart = nv.models.stackedAreaChart()

        }
        else {
            chart = nv.models.lineChart()
                .interpolate("basis")
                .options({'strokeWidth':5})

        var valueMax = d3.max(grouped.map(function(i){   return d3.max(i.values, function(j){return j.values[d]}) }) , function(x){return x})
        chart.forceY(0, valueMax*1.1)

        }
        chart
            .x(function(x){return parseInt(new Date(x.key).getTime())})
            .y(function(x){return x.values[d]})
            .useInteractiveGuideline(true)
            .clipEdge(true)
        
        chart.xAxis
            .showMaxMin(false)
            .tickFormat(function(x) {  return d3.time.format('%x')(new Date(x)) });
        

        if(d.indexOf("media_cost") > -1 || d.indexOf('CPM')>-1 || d.indexOf('CPA') > -1){
            chart.yAxis.tickFormat(d3.format('$,.2f'));
        }
        else if (d.indexOf("rate") > -1){
            chart.yAxis.tickFormat(d3.format(".4%"));
        }
        else{
            chart.yAxis.tickFormat(d3.format(",.0f"));
        }

        self.append('svg').datum(grouped).classed("chart",true)
                .transition().duration(500).call(chart);

    })

}



