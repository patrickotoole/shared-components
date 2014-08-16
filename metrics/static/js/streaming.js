var socketWrapper = function(params,on_init) {
  var self = this;
  this.id = Math.round(Math.random() * 10000000);

  this.createSocket = function(params){
    this.socket = new WebSocket("ws://" + window.location.host + "/websocket?id=" + this.id);

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
        // grouped_data: this.crs.dimension(function(x){ return [x.result.domain, x.result.uid] })
    }
  
    this.dimensions.data.filter(function(d){ return d == 0; })
    this.crs.remove()
    this.dimensions.data.filterAll()
    
    this.groups = {
        imps_data: this.dimensions.data.groupAll(),
        domain_data: this.dimensions.data.group(function(d){ return d.domain; }).order(function(d){return d}).reduce(
            function(p,v) { 
                ++p.imps;
                p.uids[v.result.uid] = p.uids[v.result.uid] + 1 || 1;
                return p 
            },
            function(p,v) { 
                --p.imps;
                p.uids[v.result.uid] = p.uids[v.result.uid] - 1;
                if (p.uids[v.result.uid] == 0) {
                  delete p.uids[v.result.uid];
                }
                return p 
            },
            function() {
                return { 
                    imps:0,
                    uids: {}
                }
            }
        ),
        location_data: this.dimensions.data.group(function(d){ return [d.city, d.state, d.country]; }).order(function(d){return d}).reduce(
            function(p,v) { 
                ++p.imps;
                p.uids[v.result.uid] = p.uids[v.result.uid] + 1 || 1;
                return p 
            },
            function(p,v) { 
                --p.imps;
                 p.uids[v.result.uid] = p.uids[v.result.uid] - 1;
                 if (p.uids[v.result.uid] == 0) {
                  delete p.uids[v.result.uid];
                }
                return p 
            },
            function() {
                return { 
                    imps:0,
                    uids: {}
                }
            }
        ),
        latlong_location_data: this.dimensions.data.group(function(d){ return [d.city, d.state, d.country, d.latitude, d.longitude]; }).order(function(d){return d}).reduce(
            function(p,v) { 
                ++p.imps;
                p.uids[v.result.uid] = p.uids[v.result.uid] + 1 || 1;
                return p 
            },
            function(p,v) { 
                --p.imps;
                 p.uids[v.result.uid] = p.uids[v.result.uid] - 1;
                 if (p.uids[v.result.uid] == 0) {
                  delete p.uids[v.result.uid];
                }
                return p 
            },
            function() {
                return { 
                    imps:0,
                    uids: {}
                }
            }
        ),
        uniques_data: this.dimensions.data.group(function(d){ return d.uid; })    
        // domain_data: this.dimensions.grouped_data.group(function(d){ return d[0]; }).reduce(
            // function(p,v) { 
                // ++p.imps;
                // return p 
            // },
            // function(p,v) { 
                // --p.imps;
                // return p 
            // },
            // function() {
                // return { 
                    // imps:0
                // }
            // }
        // )       
    }
   
   this.bubbleFillKey = "green";
   this.bubbleType = "imps";
   
   this.aggregateDimensions = {
        domain_data: {
			top: function(x) {
				return self.groups.domain_data.all().filter(function(x){return x.value.imps}).slice(0, x).map(function (grp) { 
                    return {
						"domain":grp.key, 
						"imps":grp.value.imps,
						"uniques":Object.keys(grp.value.uids).length
					} 
				});
			},
            bottom: function(x) {
				return self.groups.domain_data.all().filter(function(x){return x.value.imps}).slice(-x).map(function (grp) { 
                    return {
						"domain":grp.key, 
						"imps":grp.value.imps,
						"uniques":Object.keys(grp.value.uids).length
					} 
				});
			}
		},
        location_data: {
			top: function(x) {
				return self.groups.location_data.all().filter(function(x){return x.value.imps}).slice(0, x).map(function (grp) { 
                    return {
						"location":grp.key, 
						"imps":grp.value.imps,
						"uniques":Object.keys(grp.value.uids).length
					} 
				});
			},
            bottom: function(x) {
				return self.groups.location_data.all().filter(function(x){return x.value.imps}).slice(-x).map(function (grp) { 
                    return {
						"location":grp.key, 
						"imps":grp.value.imps,
						"uniques":Object.keys(grp.value.uids).length
					} 
				});
			}
		},
        latlong_location_data: {
			top: function(x) {
                var locationData = self.groups.location_data.all();
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
                            var uniqueCount = Object.keys(data.value.uids).length;
                            if(uniqueCount > uniquesMax) uniquesMax = uniqueCount;
                        });
                    }
                }
                else impsMax = 0;
				return self.groups.latlong_location_data.all().filter(function(x){return x.value.imps}).slice(0, x).map(function (grp) { 
                   var uniqueCount = Object.keys(grp.value.uids).length;
                    var radius = self.bubbleType == "imps" ? grp.value.imps / impsMax * 13 + 3 : uniqueCount / uniquesMax * 13 + 5;
                   return {
						"location":grp.key, 
						"imps":grp.value.imps,
						"uniques":uniqueCount,
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
      return x
    })
    this.dimensions.position.filter(function(x,y){
      return x < self.tracker - THRESHOLD 
    })
    this.crs.remove()
    this.dimensions.position.filterAll()
    
    this.crs.add(results)
    // console.log(results);
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
