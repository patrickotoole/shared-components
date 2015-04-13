var RB = RB || {}
RB.yoshi = RB.yoshi || {}
RB.yoshi.handlers = (function(handlers){

  handlers.ports = {}
  handlers.tabs = {}

  handlers.page_port = (function(page_port){

    var build_message = {
      "AD_DATA_FULL" : function(items) {
        return {action: "AD_DATA_FULL", content: items}
      },
      "SELLER_DATA": function() {
        return {action: "SELLER_DATA", content: {}}
      }
    }

    var message_cases = {
      "GET_AD_DATA": function(port) { 
        RB.yoshi.websocket.ensureConnected()
        chrome.storage.local.get(null, function(items) {
          var message = build_message.AD_DATA_FULL(items)
          port.postMessage(message)
        });  
      },
      "CLEAR_AD_DATA": function(port){ // TODO: change name to CLEAR_AD_DATA
        chrome.storage.local.clear()
      },
      "GET_SELLER_DATA" : function(port){ // TODO: change name to GET_SELLERS
        var message = build_message.SELLER_DATA()
        port.postMessage(message)
      },
      "GET_TAB_BIRTHDATE" : function(port){
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          var birthdate = handlers.tabs[tabs[0].id]
          port.postMessage({"action":"TAB_BIRTHDATE","content": birthdate})
        })
      },
      "START_HISTORY": function() {
        console.log("ASKED TO START HISTORY")
        chrome.tabs.create({'url': 'history.html'}, function(tab) {})
      }
      
    }

    page_port.onMessage = function(request) {
      message_cases[request.action](this) 
    }
    page_port.onDisconnect = function(page_port) {
      delete handlers.ports[this.name];
      console.log("page_port closed")
    }

    return page_port
  })(handlers.page_port || {})


  handlers.background = (function(background){

    var registerPagePort = function(port) { handlers.ports[port.name] = port }

    var buildPagePortHandler = function(port) {
      Object.keys(handlers.page_port).map(function(name){
        port[name].addListener(handlers.page_port[name].bind(port))        
      }) 
      return true
    }

    

    var message_cases = {
      "set_tab_timestamp": function(request, sender, sendResponse) {
        if (sender.tab.id) chrome.browserAction.setBadgeText({text: "0", tabId: sender.tab.id})
        handlers.tabs[sender.tab.id] = request.timestamp;
      },
      "PUSH_AD_DATA": function(request) {
        Object.keys(handlers.ports).map(function(name){
          var port = handlers.ports[name]
          port.postMessage({action: "AD_DATA_SINGLE", content: request.content, type: "SINGLE"})
        })
      },
      "PUSH_BADGE_DATA": function(request) {
        var count = request.content,
          ts = request.ts;
        
        Object.keys(handlers.tabs).map(function(tab){
          if (ts - handlers.tabs[tab] < 15) {
            chrome.browserAction.getBadgeText({tabId: parseInt(tab)}, function(result) {
              var newValue = parseInt(result) + count
              chrome.browserAction.setBadgeText({text: String(newValue), tabId: parseInt(tab)});
            });
          }
        })
      }
      
    }

    var portsBuilt = false
    
    background.onConnect = function(port) {
      console.log("REG")
      registerPagePort(port)
      if (!portsBuilt) buildPagePortHandler(port)
    }

    background.onMessage = function(request, sender, sendResponse) {
      console.log("MSG")
      message_cases[request.action].bind(sendResponse)(request,sender)
    }

    return background

  })(handlers.background || {})

  

  handlers.tab = (function(tab){
    tab.onRemoved = function(id) {
      if (handlers.tabs[id]) delete handlers.tabs[id]
    }

    return tab   
  })(handlers.tab || {})

  Object.keys(handlers.background).map(function(name){
    console.log("ADDING " + name)
    chrome.runtime[name].addListener(handlers.background[name])
  })

  Object.keys(handlers.tab).map(function(name){
    chrome.tabs[name].addListener(handlers.tab[name])
  })

  console.log("INITIALIZIING HANDLERS HERE")

  return handlers

})(RB.yoshi.handlers || {})


