var socketWrapper = function(params,on_init) {
  var self = this;
  this.id = Math.round(Math.random() * 10000000);

  this.createSocket = function(params){
    // should be window.location.host
    this.socket = new WebSocket("ws://portal.getrockerbox.com/websocket?id=" + this.id);

    this.socket.onopen = function() {
      self.sendMessage("initialize")
      self.sendJSON(sharedJson)
      
      if (on_init) on_init.bind(self)()
    }

    this.socket.onmessage = function(event) {
      var parsed = JSON.parse(event.data)
      self.onMessage(parsed,event)
    }
  }

  this.sendMessage = function(message){
    if (!this.socket) this.createSocket()
    this.socket.send(message)
  }

  this.sendJSON = function(object) {
    // console.log(window.location.pathname + "?" + $.param(object,true))
    window.history.pushState({},"",window.location.pathname + "?" + $.param(object,true))
    this.sendMessage(JSON.stringify(object))
  }

  this.onMessage = function(json,event) { }
  this.createSocket(params)

}
var sharedJson = {}

var socket = new socketWrapper({},function(){this.sendMessage("start")});

socket.onMessage = function(x){
  dataWrapper.add(x);
  dataWrapper.tracker++;
}

    var rawDataWrapper = function() {
    var THRESHOLD = 60
    var self = this
    this.tracker = 0
    this.crs = crossfilter([{"position":0,"result":{}}])

    this.dimensions = {
        position: this.crs.dimension(function(x){ return x.position }),
        data: this.crs.dimension(function(x){ return !$.isEmptyObject(x.result) ? x.result : 0 }),
        domain_data: this.crs.dimension(function(x){ return x.result.domain }),
        uniques_data: this.crs.dimension(function(x){ return x.result.uid }),
        campaign_data: this.crs.dimension(function(x){ return x.result.campaign_bucket }),
        location_data: this.crs.dimension(function(x){ return [x.result.city, x.result.state, x.result.country] }),
        latlong_location_data: this.crs.dimension(function(x){ return [x.result.city, x.result.state, x.result.country, x.result.latitude, x.result.longitude] }),
    }
  
    this.dimensions.data.filter(function(d){ return d == 0; })
    this.crs.remove()
    this.dimensions.data.filterAll()
    
    this.groups = {
        imps_data: this.dimensions.data.groupAll(),
        uniques_data: this.dimensions.uniques_data.group(),
        domain_data: this.dimensions.domain_data.group().reduce(
            function(p,v) { 
                ++p.imps;
                p.uids[v.result.uid] = p.uids[v.result.uid] + 1 || 1;
                p.uid_count = Object.keys(p.uids).length;
                return p 
            },
            function(p,v) { 
                --p.imps;
                p.uids[v.result.uid] = p.uids[v.result.uid] - 1;
                if (p.uids[v.result.uid] == 0) {
                  delete p.uids[v.result.uid];
                }
                p.uid_count = Object.keys(p.uids).length;
                return p 
            },
            function() {
                return { 
                    imps:0,
                    uids: {},
                    uid_count: 0
                }
            }
        ),
        campaign_data: this.dimensions.campaign_data.group().reduce(
            function(p,v) { 
                ++p.imps;
                p.uids[v.result.uid] = p.uids[v.result.uid] + 1 || 1;
                p.uid_count = Object.keys(p.uids).length;
                return p 
            },
            function(p,v) { 
                --p.imps;
                p.uids[v.result.uid] = p.uids[v.result.uid] - 1;
                if (p.uids[v.result.uid] == 0) {
                  delete p.uids[v.result.uid];
                }
                p.uid_count = Object.keys(p.uids).length;
                return p 
            },
            function() {
                return { 
                    imps:0,
                    uids: {},
                    uid_count: 0
                }
            }
        ),
        location_data: this.dimensions.location_data.group().reduce(
            function(p,v) { 
                ++p.imps;
                p.uids[v.result.uid] = p.uids[v.result.uid] + 1 || 1;
                p.uid_count = Object.keys(p.uids).length;
                return p 
            },
            function(p,v) { 
                --p.imps;
                 p.uids[v.result.uid] = p.uids[v.result.uid] - 1;
                 if (p.uids[v.result.uid] == 0) {
                  delete p.uids[v.result.uid];
                }
                p.uid_count = Object.keys(p.uids).length;
                return p 
            },
            function() {
                return { 
                    imps:0,
                    uids: {},
                    uid_count: 0
                }
            }
        ),
        latlong_location_data: this.dimensions.latlong_location_data.group().reduce(
            function(p,v) { 
                ++p.imps;
                p.uids[v.result.uid] = p.uids[v.result.uid] + 1 || 1;
                p.uid_count = Object.keys(p.uids).length;
                return p 
            },
            function(p,v) { 
                --p.imps;
                 p.uids[v.result.uid] = p.uids[v.result.uid] - 1;
                 if (p.uids[v.result.uid] == 0) {
                  delete p.uids[v.result.uid];
                }
                p.uid_count = Object.keys(p.uids).length;
                return p 
            },
            function() {
                return { 
                    imps:0,
                    uids: {},
                     uid_count: 0
                }
            }
        ),       
    }
   
   this.bubbleFillKey = "green";
   this.bubbleType = "imps";
   this.sortValueDomains = "imps";
   this.sortValueLocations = "imps";
   this.sortValueCampaigns = "imps";
   
   var domainSortFunction = function(a, b){
        if(self.sortValueDomains = "domain"){
            if(a.key< b.key){ return -1 } if (a.key > b.key){ return 1 } return 0;
        }
        else {
            if(a.value[self.sortValueDomains] < b.value[self.sortValueDomains]){ return -1 } if (a.value[self.sortValueDomains] > b.value[self.sortValueDomains]){ return 1 } return 0;
        }
   }
   
   var campaignSortFunction = function(a, b){
        if(self.sortValueCampaigns = "campaign"){
            if(a.key< b.key){ return -1 } if (a.key > b.key){ return 1 } return 0;
        }
        else {
            if(a.value[self.sortValueCampaigns] < b.value[self.sortValueCampaigns]){ return -1 } if (a.value[self.sortValueCampaigns] > b.value[self.sortValueCampaigns]){ return 1 } return 0;
        }
   }
   
   var locationSortFunction = function(a, b){
        if(self.sortValueDomains = "location"){
            if(a.key< b.key){ return -1 } if (a.key > b.key){ return 1 } return 0;
        }
        else {
            if(a.value[self.sortValueLocations] < b.value[self.sortValueLocations]){ return -1 } if (a.value[self.sortValueLocations] > b.value[self.sortValueLocations]){ return 1 } return 0;
        }
   }
   
   this.aggregateDimensions = {
        domain_data: {
			top: function(x) {
				return self.groups.domain_data.all().filter(function(x){return x.value.imps}).sort(domainSortFunction).slice(0, x).map(function (grp) { 
                    return {
						"domain":grp.key, 
						"imps":grp.value.imps,
						"uniques":grp.value.uid_count
					} 
				});
			},
            bottom: function(x) {
                return self.groups.domain_data.all().filter(function(x){return x.value.imps}).sort(domainSortFunction).slice(-x).map(function (grp) { 
                    return {
						"domain":grp.key, 
						"imps":grp.value.imps,
						"uniques":grp.value.uid_count
					} 
				});
			}
		},
        campaign_data: {
			top: function(x) {
				return self.groups.campaign_data.all().filter(function(x){return x.value.imps}).sort(campaignSortFunction).slice(0, x).map(function (grp) { 
                    return {
						"campaign":grp.key, 
						"imps":grp.value.imps,
						"uniques":grp.value.uid_count
					} 
				});
			},
            bottom: function(x) {
                return self.groups.campaign_data.all().filter(function(x){return x.value.imps}).sort(campaignSortFunction).slice(-x).map(function (grp) { 
                    return {
						"campaign":grp.key, 
						"imps":grp.value.imps,
						"uniques":grp.value.uid_count
					} 
				});
			}
		},
        campaign_bucket_data: {
            top: function(x){
                
            },
            bottom: function(x){
                
            }
        },
        location_data: {
			top: function(x) {
				return self.groups.location_data.all().filter(function(x){return x.value.imps}).sort(locationSortFunction).slice(0, x).map(function (grp) { 
                    return {
						"location":grp.key, 
						"imps":grp.value.imps,
						"uniques":grp.value.uid_count
					} 
				});
			},
            bottom: function(x) {
                return self.groups.location_data.all().filter(function(x){return x.value.imps}).sort(locationSortFunction).slice(-x).map(function (grp) { 
                    return {
						"location":grp.key, 
						"imps":grp.value.imps,
						"uniques":grp.value.uid_count
					} 
				});
			}
		},
        latlong_location_data: {
			top: function(x) {
                var locationData = self.groups.latlong_location_data.all();
                if(locationData.length){
                    if(self.bubbleType == "imps"){
                        var impsMax = 0;
                        $.each(locationData, function(key, data){
                            if(data.value.imps > impsMax) impsMax = data.value.imps;
                        });
                    }
                    else {
                         var uniquesMax = 0;
                        $.each(locationData, function(key, data){
                            if(data.value.uid_count > uniquesMax) uniquesMax = data.value.uid_count;
                        });
                    }
                }
                else impsMax = 0;
				return self.groups.latlong_location_data.all().filter(function(x){return x.value.imps && x.key[2] == "United States"}).slice(0, x).map(function (grp) { 
                    var radius = self.bubbleType == "imps" ? grp.value.imps / impsMax * 13 + 3 : grp.value.uid_count / uniquesMax * 13 + 5;
                   return {
						"location":grp.key, 
						"imps":grp.value.imps,
						"uniques":grp.value.uid_count,
                        "latitude":grp.key[3],
                        "longitude":grp.key[4],
                        "radius":radius,
                        "fillKey":self.bubbleFillKey
					} 
				});
			}
		},
   }
    
  
  this.check = function() {
    this.new_tracker = self.tracker
    var bool = (this.old_tracker != this.new_tracker) 
    this.old_tracker = this.new_tracker

    return bool
  }

  this.add = function(json) {
    var results = json['track']
    results = results.map(function(x) {
      x['position'] = self.tracker
      var campaignBucket = typeof buckets[x['result']['campaign_id']] !== "undefined" ? buckets[x['result']['campaign_id']] : "Default campaign";
      x['result']['campaign_bucket'] = campaignBucket;
       
      if(x['result']['domain'] != 0){
        x['result']['domain'] = x['result']['domain'].replace("www.", "");
      }
        
      return x
      
    })
    this.dimensions.position.filter(function(x,y){
      return x < self.tracker - THRESHOLD 
    })
    this.crs.remove()
    this.dimensions.position.filterAll()
    
    this.crs.add(results)
    dc.redrawAll();
    
  }
}
/*
function update_data(fn) {
  var imps_objects = $('.imps'),
    price_objects = $('.price'),
    domain_data = fn();
    // console.log(domain_data)

    
    imps_objects.each(function(x,e){
      var domain_name = imps_objects[x].id.split("imps-")[1]
      var imps = document.getElementById('imps-' + domain_name)

      try {
        var _data = domain_data[domain_name]
        imps.innerHTML = _data.imps
        document.getElementById('price-' + domain_name).innerHTML = _data.cpm
        imps.parentNode.parentNode.classList.remove("hide")
        imps.parentNode.parentNode.classList.remove("warning")

      } catch(e) {
        imps.innerHTML = ""
        //parent.removeClass("success")
        // console.log(domain_name)
      }
    })
 
    }   */

var dataWrapper = new rawDataWrapper()
