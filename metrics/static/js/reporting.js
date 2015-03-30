function mixinMemoizedWithCheck(group, extensions, check) {

  function comparePrev(fn) {
    if (!fn) return false
    var pre = fn.preValue
    fn.preValue = fn()
    return pre != fn.preValue
  }

  function cacheRun(_run, _check, _cacheName) {
    var cacheName = _cacheName || "cache",
      _check = _check;

    if (_check()) this[cacheName] = _run()
    return this[cacheName]
  }

  for (var ext in extensions) {
    var fn = extensions[ext].bind(group),
      checkFn = comparePrev.bind(this,check ? check.bind(this): false),
      cachedFn = cacheRun.bind(group,fn,checkFn);
    group[ext] = cachedFn
  }
}

function toHash() {
  var h = {}
  this.all().forEach(function(grp){
    h[grp["key"]] = grp["value"]
  })
  return h
}

var crossfilterNS = function(crs,dc) {

	var dimensions = {
		datetime: crs.dimension(function(d){ return d.dd }),
		daily: crs.dimension(function(d) { return d3.time.day(d.dd) }),
		weekly: crs.dimension(function(d) { return d3.time.week(d.dd) }),
		monthly: crs.dimension(function(d) { return d3.time.month(d.dd) }),
		total_campaign_bucket: crs.dimension(function(d){ return d.campaign_bucket}),
		/*
		daily_campaign_bucket: crs.dimension(function(d){ return [d3.time.day(d.dd), d.campaign_bucket]}),
		weekly_campaign_bucket: crs.dimension(function(d){ return [d3.time.week(d.dd), d.campaign_bucket]}),
		monthly_campaign_bucket: crs.dimension(function(d){ return [d3.time.month(d.dd), d.campaign_bucket]}),		
		count: crs.dimension(function(d){ return 0 }),
		referrer: crs.dimension(function(d){ return d.referrer }),
		domain: crs.dimension(function(d){ return d.domain }),
		campaign: crs.dimension(function(d){ return d.campaign_id }),*/
		
	}

  var 
    groupAdd = function(p,v) {
      p.cost += v.cost
      p.conversions += v.conversions                                                                     
      p.imps += v.imps                                                                                   
      p.clicks += v.clicks                                                                               
      p.visible += v.visible
      p.loaded += v.loaded
      p.visits += v.visits
      p.views = (p.loaded ? p.imps*p.visible/p.loaded : 0) || 0
      p.dd = "1"
      return p 
    },
    groupReduce = function(p,v) {
			p.cost -= v.cost
			p.conversions -= v.conversions                                                                     
			p.imps -= v.imps
			p.clicks -= v.clicks                                                                               
      p.visible -= v.visible
      p.loaded -= v.loaded 
      p.visits -= v.visits
      p.views = (p.loaded ? p.imps*p.visible/p.loaded : 0) || 0
			p.dd = "1"
			return p                                                                                           
		},
    groupInit = function() {
			return {
				cost: 0,
				conversions: 0,                                                                                  
				clicks: 0,
				imps: 0,
        visible: 0,
        loaded: 0,
        visits: 0,
        views: 0,
				dd: ""                                                                                           
			}
		}

	var groups = {
		all: crs.groupAll().reduce(
			function(p, v){
				++p.count
				p.imps += v.imps
				p.clicks += v.clicks
				p.cost += v.cost
				p.conversions += v.conversions
        p.loaded += v.loaded
        p.visible += v.visible
        p.visits += v.visits
        p.percent_visible = p.visible/p.loaded
        p.views = p.imps*p.percent_visible

				return p
			},
			function(p, v){
				--p.count;
				p.imps -= v.imps
				p.clicks -= v.clicks
				p.cost -= v.cost
				p.conversions -= v.conversions
        p.loaded -= v.loaded 
        p.visible -= v.visible
        p.visits -= v.visits
        p.percent_visible = p.visible/p.loaded 
        p.views = p.imps*p.percent_visible

				return p 
			},
			function(){
				return {
					count: 0,
					imps: 0,
					clicks: 0,
					cost:0,
					conversions: 0,
          loaded: 0,
          visible: 0,
          visits: 0,
          views: 0
				}
			}
		),
		datetime: dimensions.datetime.group().reduce(
      groupAdd,
			groupReduce,
      groupInit 
		),
		daily: dimensions.daily.group().order(function(d){return d}).reduce(
      groupAdd,
			groupReduce,
      groupInit  
		),
		weekly: dimensions.weekly.group().order(function(d){return d}).reduce(
      groupAdd,
			groupReduce,
      groupInit     
		),
		monthly: dimensions.monthly.group().order(function(d){return d}).reduce(
      groupAdd,
			groupReduce,
      groupInit      
		),
		/*
		referrer: dimensions.referrer.group().reduce(
			function(p,v) {
				p.count += v.imps
				p.domain = v.domain
				return p
			},
			function(p,v) {
				p.count -= v.imps
				p.domain = v.domain
				return p
			},
			function() {
				return {
					"domain":"",
					"count":0
				}
			}
		),
		domain: dimensions.domain.group().reduce(
			function(p,v) { return p + v.imps },
			function(p,v) { return p - v.imps },
			function() { return 0 }
		),
		campaign: dimensions.campaign.group().reduce(
		  function(p,v) {
				p.cost += v.cost
				p.conversions += v.conversions                                                                     
				p.imps += v.imps                                                                                   
				p.clicks += v.clicks                                                                               
				p.dd = "1"
				return p 
			},
			function(p,v) {
				p.cost -= v.cost
				p.conversions -= v.conversions                                                                     
				p.imps -= v.imps
				p.clicks -= v.clicks                                                                               
				p.dd = "1"
				return p                                                                                           
			},
			function() {
				return {
					cost: 0,
					conversions: 0,                                                                                  
					clicks: 0,
					imps: 0,
					dd: ""                                                                                           
				}
			}
		),
		*/
		total_campaign_bucket: dimensions.total_campaign_bucket.group().reduce(
		  function(p,v) {
				p.cost += v.cost
				p.conversions += v.conversions                                                                     
				p.imps += v.imps                                                                                   
				p.clicks += v.clicks                                                                               
        p.visible += v.visible
        p.loaded += v.loaded
        p.visits += v.visits
				p.dd = "1"
				return p 
			},
			function(p,v) {
				p.cost -= v.cost
				p.conversions -= v.conversions                                                                     
				p.imps -= v.imps
				p.clicks -= v.clicks                                                                               
        p.visible -= v.visible
        p.loaded -= v.loaded 
        p.visits -= v.visits
				p.dd = "1"
				return p                                                                                           
			},
			function() {
				return {
					cost: 0,
					conversions: 0,                                                                                  
					clicks: 0,
					imps: 0,
          visible: 0,
          loaded: 0,
          visits: 0,
					dd: ""                                                                                           
				}
			}
		),
		// datetime_campaign_bucket: dimensions.datetime_campaign_bucket.group().order(function(d){return d}).reduce(
		  // function(p,v) {
				// p.cost += v.cost
				// p.conversions += v.conversions                                                                     
				// p.imps += v.imps                                                                                   
				// p.clicks += v.clicks                                                                               
				// p.dd = "1"
				// return p 
			// },
			// function(p,v) {
				// p.cost -= v.cost
				// p.conversions -= v.conversions                                                                     
				// p.imps -= v.imps
				// p.clicks -= v.clicks                                                                               
				// p.dd = "1"
				// return p                                                                                           
			// },
			// function() {
				// return {
					// cost: 0,
					// conversions: 0,                                                                                  
					// clicks: 0,
					// imps: 0,
					// dd: ""                                                                                           
				// }
			// }
		// ),
		// weekly_campaign_bucket: dimensions.weekly_campaign_bucket.group().reduce(
			// function(p,v) {
				// p.cost += v.cost
				// p.conversions += v.conversions                                                                     
				// p.imps += v.imps                                                                                   
				// p.clicks += v.clicks                                                                               
				// p.dd = "1"
				// return p 
			// },
			// function(p,v) {
				// p.cost -= v.cost
				// p.conversions -= v.conversions                                                                     
				// p.imps -= v.imps
				// p.clicks -= v.clicks                                                                               
				// p.dd = "1"
				// return p                                                                                           
			// },
			// function() {
				// return {
					// cost: 0,
					// conversions: 0,                                                                                  
					// clicks: 0,
					// imps: 0,
					// dd: ""                                                                                           
				// }
			// }
		// ),
		// monthly_campaign_bucket: dimensions.monthly_campaign_bucket.group().reduce(
			// function(p,v) {
				// p.cost += v.cost
				// p.conversions += v.conversions                                                                     
				// p.imps += v.imps                                                                                   
				// p.clicks += v.clicks                                                                               
				// p.dd = "1"
				// return p 
			// },
			// function(p,v) {
				// p.cost -= v.cost
				// p.conversions -= v.conversions                                                                     
				// p.imps -= v.imps
				// p.clicks -= v.clicks                                                                               
				// p.dd = "1"
				// return p                                                                                           
			// },
			// function() {
				// return {
					// cost: 0,
					// conversions: 0,                                                                                  
					// clicks: 0,
					// imps: 0,
					// dd: ""                                                                                           
				// }
			// }
		// )
	}

	var charts = {
	/*
		imps:function(id){
			
			charts.imps = dc.lineChart(id)
				.dimension(dimensions.datetime)
				.group(groups.datetime)
				.x(d3.time.scale().domain([
					dimensions.datetime.bottom(1)[0].dd,
					dimensions.datetime.top(1)[0].dd
				]))
				.valueAccessor(function(d){
					return d.value.imps
				})

			return charts.imps
		},
		impsBar:function(id){

			var dailyCutoff = 14*24*60*60*1000,
				daily = (dimensions.datetime.top(1)[0].dd - dimensions.datetime.bottom(1)[0].dd) > dailyCutoff,
				dimension = daily ? dimensions.daily: dimensions.datetime,
				group = daily ? groups.daily: groups.datetime

			charts.datetime = dc.barChart(id)
				.dimension(dimension)
				.group(group)
				.x(d3.time.scale().domain([
					dimensions.datetime.bottom(1)[0].dd,
					dimensions.datetime.top(1)[0].dd
				])) 
				.valueAccessor(function(d){
					return d.value.imps
				})

			return charts.datetime
		},
		domain:function(id){
			charts.domain = dc.dataTable(id)
				.dimension(aggregateDimensions.referrer)
				.group(function(d){return d.domain})
			
			return charts.domain
		}
		*/
	}

	/* 
	// would love to be able to do this via a plugin 
	// rather than checking against the all group
	*/

	
	var memoizedWithCheck = {
		/*
		domain: {
			exts: {
				toHash : toHash
			},
			check: function() {
				return groups.all.value().count
			}
		},
		*/
		all: {
			check: function() {
				return groups.all.value().count
			},
			exts: {
				summary: function () {
					return {
						/*
						"count": groups.all.value().count,
						*/
						"imps": groups.all.value().imps,
						"clicks": groups.all.value().clicks,
						"cost": groups.all.value().cost,
						"conversions": groups.all.value().conversions,
						/*
						"domains": groups.domain.all().filter(function(v){return v.value > 0}).length,
						"referrers": groups.referrer.all().filter(function(v){return v.value.count > 0}).length,
						*/
						"date_min": dimensions.datetime.bottom(1)[0].dd,
						"date_max": dimensions.datetime.top(1)[0].dd
					}
				}
			}
		}
	}

	for (var addition in memoizedWithCheck) {
		var _group = groups[addition]
		var _exts = memoizedWithCheck[addition]['exts']
		var _check = memoizedWithCheck[addition]['check']

		mixinMemoizedWithCheck(_group, _exts, _check)
	}

	var aggregateDimensions = {
		/*
		referrer: {
			top: function(x) {
				return groups.referrer.top(x).filter(function(grp){return grp.value.count}).map(function (grp) { 
					return {
						"domain": grp.value.domain,
						"imps": grp.value.count, 
						"referrer": grp.key,
						"domain_imps": groups.domain.toHash()[grp.value.domain],
					} 
				})
			}
		},
		campaign: {
			top: function(x) {
				var min_date = 0//dateFormatPretty(dateDimension.bottom(1)[0].dd)
				var max_date = 0//dateFormatPretty(dateDimension.top(1)[0].dd)
				return groups.campaign.top(x).filter(function(x){return x.value.imps}).map(function (grp) { 
					return {
						"campaign_id":grp.key, 
						"imps":grp.value.imps, 
						"clicks": grp.value.clicks,
						"conversions": grp.value.conversions,
						"cost": grp.value.cost,
						"date_min": groups.all.summary().date_min,
						"date_max": groups.all.summary().date_max,
						"dd": min_date + " until " + max_date
					} 
				});
			}
		},*/
		daily: {
			top: function(x) {
				var min_date = groups.all.summary().date_min
				var max_date = groups.all.summary().date_max
				return groups.daily.all().filter(function(x){return x.value.imps}).slice(0, x).map(function (grp) { 
					return {
						"date":grp.key,
						"imps":grp.value.imps, 
						"clicks": grp.value.clicks,
						"conversions": grp.value.conversions,
						"cost": grp.value.cost,
            "visible": grp.value.visible,
            "loaded": grp.value.loaded,
            "visits": grp.value.visits,
            "percent_visible": grp.value.visible/grp.value.loaded,
            "views": grp.value.imps*grp.value.visible/grp.value.loaded || 0,
						"date_min": groups.all.summary().date_min,
						"date_max": groups.all.summary().date_max,
            "type":"daily"
					} 
				});
			},
			bottom: function(x) {
				var min_date = groups.all.summary().date_min
				var max_date = groups.all.summary().date_max
				return groups.daily.all().filter(function(x){return x.value.imps}).slice(-x).map(function (grp) { 
					return {
						"date":grp.key,
						"imps":grp.value.imps, 
						"clicks": grp.value.clicks,
						"conversions": grp.value.conversions,
						"cost": grp.value.cost,
            "visible": grp.value.visible,
            "loaded": grp.value.loaded,
            "visits": grp.value.visits,
            "percent_visible": grp.value.visible/grp.value.loaded,
            "views": grp.value.imps*grp.value.visible/grp.value.loaded || 0,
						"date_min": groups.all.summary().date_min,
						"date_max": groups.all.summary().date_max,
            "type":"daily" 
					} 
				});
			},
		},
		weekly: {
			top: function(x) {
				var min_date = groups.all.summary().date_min
				var max_date = groups.all.summary().date_max
				return groups.weekly.all().filter(function(x){return x.value.imps}).slice(0, x).map(function (grp) { 
					return {
						"date":grp.key,
						"imps":grp.value.imps, 
						"clicks": grp.value.clicks,
						"conversions": grp.value.conversions,
						"cost": grp.value.cost,
            "visible": grp.value.visible,
            "loaded": grp.value.loaded,
            "visits": grp.value.visits,
            "percent_visible": grp.value.visible/grp.value.loaded,
            "views": grp.value.imps*grp.value.visible/grp.value.loaded || 0,
						"date_min": groups.all.summary().date_min,
						"date_max": groups.all.summary().date_max,
            "type":"weekly"
					} 
				});
			},
			bottom: function(x) {
				var min_date = groups.all.summary().date_min
				var max_date = groups.all.summary().date_max
				return groups.weekly.all().filter(function(x){return x.value.imps}).slice(-x).map(function (grp) { 
					return {
						"date":grp.key,
						"imps":grp.value.imps, 
						"clicks": grp.value.clicks,
						"conversions": grp.value.conversions,
						"cost": grp.value.cost,
            "visible": grp.value.visible,
            "loaded": grp.value.loaded,
            "visits": grp.value.visits,
            "percent_visible": grp.value.visible/grp.value.loaded,
            "views": grp.value.imps*grp.value.visible/grp.value.loaded || 0,
						"date_min": groups.all.summary().date_min,
						"date_max": groups.all.summary().date_max,
            "type":"weekly"                           								
					} 
				});
			},
		},
		monthly: {
			top: function(x) {
				var min_date = groups.all.summary().date_min
				var max_date = groups.all.summary().date_max
				return groups.monthly.all().filter(function(x){return x.value.imps}).slice(0, x).map(function (grp) { 
					return {
						"date":grp.key,
						"imps":grp.value.imps, 
						"clicks": grp.value.clicks,
						"conversions": grp.value.conversions,
						"cost": grp.value.cost,
            "visible": grp.value.visible,
            "loaded": grp.value.loaded,
            "visits": grp.value.visits,
            "percent_visible": grp.value.visible/grp.value.loaded,
            "views": grp.value.imps*grp.value.visible/grp.value.loaded || 0,
						"date_min": groups.all.summary().date_min,
						"date_max": groups.all.summary().date_max,
            "type":"monthly"                           								
					} 
				});
			},
			bottom: function(x) {
				var min_date = groups.all.summary().date_min
				var max_date = groups.all.summary().date_max
				return groups.monthly.all().filter(function(x){return x.value.imps}).slice(-x).map(function (grp) { 
					return {
						"date":grp.key,
						"imps":grp.value.imps, 
						"clicks": grp.value.clicks,
						"conversions": grp.value.conversions,
						"cost": grp.value.cost,
            "visible": grp.value.visible,
            "loaded": grp.value.loaded,
            "visits": grp.value.visits,
            "percent_visible": grp.value.visible/grp.value.loaded,
            "views": grp.value.imps*grp.value.visible/grp.value.loaded || 0,
						"date_min": groups.all.summary().date_min,
						"date_max": groups.all.summary().date_max,
            "type":"monthly"
					} 
				});
			},
		},
		total_campaign_bucket: {
			top: function(x) {
				var min_date = groups.all.summary().date_min
				var max_date = groups.all.summary().date_max
				return groups.total_campaign_bucket.top(x).filter(function(x){return x.value.imps}).map(function (grp) { 
					return {
						"campaign_bucket":grp.key, 
						"imps":grp.value.imps, 
						"clicks": grp.value.clicks,
						"conversions": grp.value.conversions,
						"cost": grp.value.cost,
            "visible": grp.value.visible,
            "loaded": grp.value.loaded,
            "visits": grp.value.visits,
            "percent_visible": grp.value.visible/grp.value.loaded,
            "views": grp.value.imps*grp.value.visible/grp.value.loaded || 0,
						"date_min": groups.all.summary().date_min,
						"date_max": groups.all.summary().date_max								
					} 
				});
			}
		},
		// datetime_campaign_bucket: {
			// top: function(x, y) {
				// var min_date = groups.all.summary().date_min
				// var max_date = groups.all.summary().date_max
				// return groups.datetime_campaign_bucket.top(x).filter(function(x){ return x.value.imps; }).map(function (grp) { 
					// return {
						// "date":grp.key[0],
						// "campaign_bucket":grp.key[1], 
						// "imps":grp.value.imps, 
						// "clicks": grp.value.clicks,
						// "conversions": grp.value.conversions,
						// "cost": grp.value.cost,
						// "date_min": groups.all.summary().date_min,
						// "date_max": groups.all.summary().date_max
					// } 
				// });
			// }
		// },
		// weekly_campaign_bucket: {
			// top: function(x, y) {
				// if(typeof y !== "undefined") var filterFunc = function(x){ return x.key[1] == y };
				// else var filterFunc = function(x){ return x.value.imps };
				// var min_date = groups.all.summary().date_min
				// var max_date = groups.all.summary().date_max
				// return groups.weekly_campaign_bucket.all().filter(function(x){ return filterFunc(x); }).map(function (grp) { 
					// return {
						// "date":grp.key[0],
						// "campaign_bucket":grp.key[1], 
						// "imps":grp.value.imps, 
						// "clicks": grp.value.clicks,
						// "conversions": grp.value.conversions,
						// "cost": grp.value.cost,
						// "date_min": groups.all.summary().date_min,
						// "date_max": groups.all.summary().date_max
					// } 
				// });
			// }
		// },
		// monthly_campaign_bucket: {
			// top: function(x, y) {
				// if(typeof y !== "undefined") var filterFunc = function(x){ return x.key[1] == y };
				// else var filterFunc = function(x){ return x.value.imps };
				// var min_date = groups.all.summary().date_min
				// var max_date = groups.all.summary().date_max
				// return groups.monthly_campaign_bucket.all().filter(function(x){ return filterFunc(x); }).map(function (grp) { 
					// return {
						// "date":grp.key[0],
						// "campaign_bucket":grp.key[1], 
						// "imps":grp.value.imps, 
						// "clicks": grp.value.clicks,
						// "conversions": grp.value.conversions,
						// "cost": grp.value.cost,
						// "date_min": groups.all.summary().date_min,
						// "date_max": groups.all.summary().date_max
					// } 
				// });
			// },
		// }
	}

	return {
		dimensions: dimensions,
		groups: groups,
		charts: charts,
		aggregateDimensions: aggregateDimensions
	}

}    
