var socketWrapper = function(params,on_init) {
  var self = this;
  this.id = Math.round(Math.random() * 10000000);

  this.createSocket = function(params){
    this.socket = new WebSocket("ws://" + 
      window.location.host + 
      "/admin/websocket?id=" + 
      this.id
    );

    this.socket.onopen = function() {
      self.sendMessage("initialize")
      self.sendJSON(sharedJson)
      $("#start").trigger("click")

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
    console.log(window.location.pathname + "?" + $.param(object,true))
    window.history.pushState({},"",window.location.pathname + "?" + $.param(object,true))
    this.sendMessage(JSON.stringify(object))
  }

  this.onMessage = function(json,event) { }
  this.createSocket(params)

}
var sharedJson = {}

var socket = new socketWrapper({},function(){this.sendMessage("start")});
socket.onMessage = function(x){
  dataWrapper.add(x)
  dataWrapper.tracker ++;
}

var rawDataWrapper = function(steps) {
  var THRESHOLD = 60
  var self = this
  this.tracker = 0
  this.crs = crossfilter([{"position":0,"result":{}}])
  this.dim = this.crs.dimension(function(x){return x.position})
  this.domain_dim = this.crs.dimension(function(x){
    if (x.result) {
      return x.result.domain
    } else {
      return 0
    }
  })

  this.domain_group = this.domain_dim.group().reduce(
    function(p,v) { 
      p.imps++; 
      p.price += parseFloat(v.result.price)
      p.cpm = d3.round(p.price/p.imps,2)
      return p 
    },
    function(p,v) { 
      p.imps--; 
      p.price -= parseFloat(v.result.price)
      p.cpm = d3.round(p.price/p.imps,2)
      return p 
    },
    function() {
      return {"imps":0,"price":0,"cpm":0}
    }
  )

  this.check = function() {
    this.new_tracker = self.tracker
    var bool = (this.old_tracker != this.new_tracker) 
    this.old_tracker = this.new_tracker

    return bool
  }

  mixinMemoizedWithCheck(this.domain_group,{"toHash":toHash},this.check)
  this.domains = self.domain_group.toHash

  
  this.add = function(json) {
    var results = json['track']
    results = results.map(function(x) {
      x['position'] = self.tracker
      return x
    })
    this.dim.filter(function(x,y){
      return x < self.tracker - THRESHOLD 
    })
    this.crs.remove()
    this.dim.filterAll()
    this.crs.add(results)

    var d = self.domain_group.toHash()
    update_data(self.domain_group.toHash)
    
  }

}



function update_data(fn) {
  var imps_objects = $('.imps'),
    price_objects = $('.price'),
    domain_data = fn();
    //console.log(domain_data)

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
        //console.log(domain_name)
      }
    })
}

var dataWrapper = new rawDataWrapper(60)
