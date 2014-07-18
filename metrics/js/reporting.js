var dateFormatPretty = d3.time.format("%b %d, %Y at %_I %p");

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

dc.dataCounts = function(parent, chartGroup) {
  var _formatNumber = d3.format(",d");
  var _chart = dc.baseMixin({});

  _chart._doRender = function() {
    var dim = _chart.group().summary()

    _chart.selectAll(".domains").text(_formatNumber(dim.domains))
    _chart.selectAll(".imps").text(_formatNumber(dim.imps))
    _chart.selectAll(".referrers").text(_formatNumber(dim.referrers))
		_chart.selectAll(".clicks").text(_formatNumber(dim.clicks))
    _chart.selectAll(".conversions").text(_formatNumber(dim.conversions))
		_chart.selectAll(".date-range").text( dateFormatPretty(dim.date_min) + " until " + dateFormatPretty(dim.date_max) )


    return _chart;
  };

  _chart._doRedraw = function(){
    return _chart._doRender();
  };

  return _chart.anchor(parent, chartGroup);
};

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
		count: crs.dimension(function(d){ return 0 }),
		referrer: crs.dimension(function(d){ return d.referrer }),
		domain: crs.dimension(function(d){ return d.domain }),
		campaign: crs.dimension(function(d){ return d.campaign_id }),
		campaign_bucket: crs.dimension(function(d){ return d.campaign_bucket}),
		daily_campaign_bucket: crs.dimension(function(d){ return [d3.time.day(d.dd), d.campaign_bucket]})
	}

	var groups = {
		all: crs.groupAll().reduce(
			function(p, v){
				++p.count
				p.imps += v.imps
				p.clicks += v.clicks
				p.conversions += v.conversions

				return p
			},
			function(p, v){
				--p.count;
				p.imps -= v.imps
				p.clicks -= v.clicks
				p.conversions -= v.conversions
				return p 
			},
			function(){
				return {
					count: 0,
					imps: 0,
					clicks: 0,
					conversions: 0
				}
			}
		),
		datetime: dimensions.datetime.group().reduce(
			function(p,v) {
				p.imps += v.imps
				p.clicks += v.clicks
				p.conversions += v.conversions
				p.cost += v.cost
	
				return p
			},
			function(p,v) {
				p.imps -= v.imps
				p.clicks -= v.clicks
				p.conversions -= v.conversions
				p.cost -= v.cost

				return p
			},
			function() {
				return {
					imps:0,
					clicks:0,
					conversions:0,
					cost:0
				}
			}
		),
		daily: dimensions.daily.group().reduce(
			function(p,v) {
				p.imps += v.imps
				p.clicks += v.clicks
				p.conversions += v.conversions
				p.cost += v.cost
	
				return p
			},
			function(p,v) {
				p.imps -= v.imps
				p.clicks -= v.clicks
				p.conversions -= v.conversions
				p.cost -= v.cost

				return p
			},
			function() {
				return {
					imps:0,
					clicks:0,
					conversions:0,
					cost:0
				}
			}
		),
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
		campaign_bucket: dimensions.campaign_bucket.group().reduce(
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
		daily_campaign_bucket: dimensions.daily_campaign_bucket.group().reduce(
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
		)
	}

	var charts = {
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
		
	}

	/* 
	// would love to be able to do this via a plugin 
	// rather than checking against the all group
	*/

	var memoizedWithCheck = {
		domain: {
			exts: {
				toHash : toHash
			},
			check: function() {
				return groups.all.value().count
			}
		},
		all: {
			check: function() {
				return groups.all.value().count
			},
			exts: {
				summary: function () {
					return {
						"count": groups.all.value().count,
						"imps": groups.all.value().imps,
						"clicks": groups.all.value().clicks,
						"conversions": groups.all.value().conversions,
						"domains": groups.domain.all().filter(function(v){return v.value > 0}).length,
						"referrers": groups.referrer.all().filter(function(v){return v.value.count > 0}).length,
						"date_min": dimensions.datetime.bottom(1)[0].dd,
						"date_max": dimensions.datetime.top(1)[0].dd,
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
		},
		campaign_bucket: {
			top: function(x) {
				var min_date = groups.all.summary().date_min
				var max_date = groups.all.summary().date_max//dateFormatPretty(dateDimension.top(1)[0].dd)
				return groups.campaign_bucket.top(x).filter(function(x){return x.value.imps}).map(function (grp) { 
					return {
						"campaign_bucket":grp.key, 
						"imps":grp.value.imps, 
						"clicks": grp.value.clicks,
						"conversions": grp.value.conversions,
						"cost": grp.value.cost,
						"date_min": groups.all.summary().date_min,
						"date_max": groups.all.summary().date_max

						
					} 
				});
			}
		},
		daily_campaign_bucket: {
			top: function(x) {
				var min_date = groups.all.summary().date_min
				var max_date = groups.all.summary().date_max//dateFormatPretty(dateDimension.top(1)[0].dd)
				return groups.daily_campaign_bucket.top(x).filter(function(x){return x.value.imps}).map(function (grp) { 
					return {
						"date":grp.key[0],
						"campaign_bucket":grp.key[1], 
						"imps":grp.value.imps, 
						"clicks": grp.value.clicks,
						"conversions": grp.value.conversions,
						"cost": grp.value.cost,
						"date_min": groups.all.summary().date_min,
						"date_max": groups.all.summary().date_max
					} 
				});
			}
		}
	}

	return {
		dimensions: dimensions,
		groups: groups,
		charts: charts,
		aggregateDimensions: aggregateDimensions
	}

}    
