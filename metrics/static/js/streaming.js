var socketWrapper = function(params,on_init) {
  var self = this;
  this.id = Math.round(Math.random() * 10000000);

  this.createSocket = function(params){
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
        // grouped_data: this.crs.dimension(function(x){ return [x.result.domain, x.result.uid] })
    }
  
    this.dimensions.data.filter(function(d){ return d == 0; })
    this.crs.remove()
    this.dimensions.data.filterAll()
    
    this.groups = {
        imps_data: this.dimensions.data.groupAll(),
        domain_data: this.dimensions.data.group(function(d){ return d.domain; }).reduce(
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
        location_data: this.dimensions.data.group(function(d){ return d.city + ", " + d.state + ", " + d.country; }).reduce(
            function(p,v) { 
                ++p.imps;
                return p 
            },
            function(p,v) { 
                --p.imps;
                return p 
            },
            function() {
                return { 
                    imps:0
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
   
   this.aggregateDimensions = {
        domain_data: {
			top: function(x) {
				return self.groups.domain_data.top(x).filter(function(x){return x.value.imps}).map(function (grp) { 
                // self.dimensions.grouped_data.filter(function(d){ return (d[0] == grp.key)});
                // console.log(self.dimensions.grouped_data.group().all());
                    // console.log(grp.key, self.dimensions.grouped_data.group(function(d){return d[1]}).all());
                    // self.dimensions.grouped_data.filterAll();
                    var uniques_qty = Object.keys(grp.value.uids).length;
                    return {
						"domain":grp.key, 
						"imps":grp.value.imps,
						"uniques":uniques_qty
					} 
				});
			}
		},
        location_data: {
			top: function(x) {
				return self.groups.location_data.top(x).filter(function(x){return x.value.imps}).map(function (grp) { 
                // self.dimensions.grouped_data.filter(function(d){ return (d[0] == grp.key)});
                // console.log(self.dimensions.grouped_data.group().all());
                    // console.log(grp.key, self.dimensions.grouped_data.group(function(d){return d[1]}).all());
                    // self.dimensions.grouped_data.filterAll();
                    var uniques_qty = 0;
                    return {
						"location":grp.key, 
						"imps":grp.value.imps,
						"uniques":uniques_qty
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
