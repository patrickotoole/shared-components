RB.yoshi = (function(yoshi){

  var WSPATH = "ws://portal.getrockerbox.com/websocket?id="

  yoshi.websocket = (function(websocket){

    websocket.onopen = function(uuid) {
      websocket.ws.send("initialize");
      websocket.ws.send("start");
      websocket.ws.send('{"user_id":["' + uuid + '"],"streams":["filtered_imps"]}')
    }

    websocket.onclose = function() {
      
    }

    websocket.increment = 0

    websocket.onmessage = function(event) {
      var parsedJson = JSON.parse(event.data)
      websocket.increment += 1
      websocket.message_handlers.map(function(fn){ fn(parsedJson) })
    }

    websocket.message_handlers = []

    websocket.connect = function(uuid) {
      var id = Math.round(Math.random() * 10000000);
      websocket.ws = new WebSocket(WSPATH + id);

      websocket.ws.onopen = websocket.onopen.bind(websocket,uuid)
      websocket.ws.onclose = websocket.onclose
      websocket.ws.onmessage = websocket.onmessage
    }

    websocket.init = RB.AJAX.appnexus.getUID.bind(this,function(resp,xhr) {
      var uuid = xhr.responseURL.split("cookie?uuid=")[1],
        isNew = ((uuid != 0) && (!isNaN(parseFloat(uuid))) && (isFinite(uuid)));
    
      if (isNew) {
        RB.AJAX.appnexus.setPagloadID()
        RB.AJAX.appnexus.setSegment()
        RB.AJAX.rockerbox.getSellers(function(x){ RB.yoshi.GLOBALS.SELLERS = x })
        RB.AJAX.rockerbox.getUser(function(x){

        })
    
        RB.yoshi.websocket.connect(uuid)
      }
    })

    websocket.ensureConnected = function() {
      if (websocket.ws.readyState == websocket.ws.CLOSED) websocket.init()
      websocket.check_increment()
    }

    websocket.check_increment = function() {
      if (websocket.increment == 0) websocket.init()
      websocket.increment = 0
    }

    setInterval(websocket.check_increment,60000)

    return websocket
  })(yoshi.websocket || {})

  return yoshi

})(RB.yoshi || {})


