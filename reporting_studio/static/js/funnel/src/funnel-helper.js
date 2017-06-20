import d3 from 'd3';


export function formatter(x){
    if( x.indexOf('cpa') > -1 || x.indexOf('media_cost') > -1  || x.indexOf('cpm') > -1 || x.indexOf('cpc') > -1){
        return d3.format("$,.2f")
    }
    else if (x.indexOf('ctr') > -1){
        return d3.format(",.4%")
    }
    else if (x.indexOf('roas') > -1){
        return d3.format(",.2f")
    }

    else{
        return d3.format(",.0f")
    }
}

export function calculateMetrics(metrics){
    metrics['cpc_total'] = metrics['media_cost_total']/ metrics['clicks_total']
    metrics['ctr_total'] = metrics['clicks_total']/ metrics['imps_total']

    metrics['cpc_30d'] = metrics['media_cost_30d']/ metrics['clicks_30d']
    metrics['ctr_30d'] = metrics['clicks_30d']/ metrics['imps_30d']

    metrics['cpc_7d'] = metrics['media_cost_7d']/ metrics['clicks_7d']
    metrics['ctr_7d'] = metrics['clicks_7d']/ metrics['imps_7d']

    metrics['cpc_yest'] = metrics['media_cost_yest']/ metrics['clicks_yest']
    metrics['ctr_yest'] = metrics['clicks_yest']/ metrics['imps_yest']

    metrics['cpa_total'] = metrics['media_cost_total']/ metrics['conv_total']
    metrics['cpa_30d'] = metrics['media_cost_30d']/ metrics['conv_30d']
    metrics['cpa_7d'] = metrics['media_cost_7d']/ metrics['conv_7d']
    metrics['cpa_yest'] = metrics['media_cost_yest']/ metrics['conv_yest']

    metrics['cpa_attr_total'] = metrics['media_cost_total']/ metrics['attr_conv_total']
    metrics['cpa_attr_30d'] = metrics['media_cost_30d']/ metrics['attr_conv_30d']
    metrics['cpa_attr_7d'] = metrics['media_cost_7d']/ metrics['attr_conv_7d']
    metrics['cpa_attr_yest'] = metrics['media_cost_yest']/ metrics['attr_conv_yest']

    metrics['roas_total'] = (metrics['attr_conv_total'] * 475. * .2*.35 )/ metrics['media_spend_total']
    metrics['roas_30d'] = (metrics['attr_conv_30d'] * 475. * .2*.35 )/ metrics['media_spend_30d']
    metrics['roas_7d'] = (metrics['attr_conv_7d'] * 475. * .2*.35 )/ metrics['media_spend_7d']
    metrics['roas_yest'] = (metrics['attr_conv_yest'] * 475. * .2*.35 )/ metrics['media_spend_yest']

    metrics['cpm'] = metrics['media_cost_yest']*1000./ metrics['imps_yest']

    return metrics
}

export function collectMetrics(d){

    var o = {'metrics':{}, 'campaigns':[], 'campaign_metrics':{}, 'level_campaigns':[]}

    for (var m in d[0].metrics){
        if (d[0].metrics.hasOwnProperty(m)){
            o['metrics'][m] = d3.sum(d, function(x){return x.metrics[m]})
            o['campaign_metrics'][m] = d3.sum(d, function(x){return x['campaign_metrics'][m]})
        }
    }
    o['metrics'] = calculateMetrics(o['metrics'])
    o['campaign_metrics'] = calculateMetrics(o['campaign_metrics'])

    for (var i = 0; i < d.length; i ++){
        o['campaigns'] = o['campaigns'].concat(d[i]['campaigns'])
    }

    for (var i = 0; i < d.length; i ++){
        o['level_campaigns'] = o['level_campaigns'].concat(d[i]['level_campaigns'])
    }

    o['metrics']['num_strategies'] = o['campaigns'].length
    o['campaign_metrics']['num_strategies'] = o['level_campaigns'].length
    return o
}


export function flatten(d){

    var f = []

    function flatten_inner(children){
        for( var i = 0; i < children.length; i++) {
            var child = children[i]
            if (!child.dummy){
                f.push(child)
            }
            if(child.children){
                flatten_inner(child.children)
            }
        }
    }
    flatten_inner(d)
    return f
}

export function levelLabel(level){
    if(level === "level0"){
        return ""
    } 
    else if (level == "total"){
        return "Total"
    }
    else if (level == "metrics"){
        return "Metrics"
    }
    else{
        return "Optimized " + (parseInt(level.replace("level","")) - 1)
    }
}

export function flatten_and_summarize( dd ){
    var flattenned = flatten(dd)
    var levelMetrics = d3.nest().key(function(d){return d.level}).rollup(function(d){
        return collectMetrics(d)
    }).entries(flattenned)
    levelMetrics.push({"key":"total", "values":collectMetrics(dd)})
    return levelMetrics
}

export function updateTreeValue(d, m){
    var leaves = []
    function updateInner(d){

      if (!d.dummy){
          d.value = d['metrics'][m]
          leaves.push(d)
      }
      if (d.children){
        d.children.forEach(function(child){
            updateInner(child)
        })
      }
    }
    updateInner(d)
    return leaves
}

export function pruneTree(d, metric, value, comparisonType){

    if (!value) return [d]

    var leaves = []
    function pruneInner(d, add){

        if(comparisonType && d.metrics && d.metrics[metric] <= value){
            if(add){
                leaves.push(d) 
                add = false
            }
            d.highlight = true
        } else if (!comparisonType && d.metrics && d.metrics[metric] >= value){
            if(add){
                leaves.push(d) 
                add = false
            }
            d.highlight = true
        } else {
            d.highlight = false
        }
        if (d.children){ d.children.forEach(function(child){ pruneInner(child, add) }) }
               
    }

    pruneInner(d, true)
    
    return leaves
}
