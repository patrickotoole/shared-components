var RB = RB || {}
RB.yoshi = RB.yoshi || {}
RB.yoshi.ports = (function(ports){

  var getValidData = function(data,port) {
    var validKeys = Object.keys(data).filter(function(key){
        return (port.tabBirthdate < parseInt(key)) && 
          (parseInt(key) < port.tabDeathdate)
      }),
      validData = {}

    validKeys.map(function(x){
      validData[x] = data[x]
    })

    //TODO: fixthis shit and move to yoshi/ui.js
    if (validKeys.length) { 
      document.getElementById("waiting").style.display = "none";
      document.getElementById("no-ads").style.display = "none";
      document.getElementById("content-table").style.visibility = "visible";
      document.getElementById("campaign-button-div").style.display = "inline-block";

    } else if ((+new Date)/1000 < port.tabDeathdate) {
      document.getElementById("waiting").style.display = "block";
      if ("" == document.getElementById("yoshi-state").innerText)
      document.getElementById("yoshi-state").innerText = "Searching for targettable ads"
    } 

    return validData
  }

  ports.page = (function(page){
    
    var message_cases = {
      "AD_DATA_FULL": function(port,request) {
        var data = request.content
        port.received.FULL(data)
      },
      "AD_DATA_SINGLE": function(port,request) {
        var data = request.content
        port.received.SINGLE(data, request.type) 
      },
      "SELLER_DATA": function(msg) {
        console.log("SELLER_DATA received.")
      },
      "TAB_BIRTHDATE": function(port,request) {
        port.received.BIRTHDATE(request.content)
      }
    }

    page.onMessage = function(request,sender) {
        message_cases[request.action](this,request)
    }
    
    return page
  })(ports.page || {})

  ports.initialize = function(name,validate,draw) {
    console.log("Creating port on page")
    var port = chrome.runtime.connect({"name": name})

    port.postMessage({action: "GET_TAB_BIRTHDATE"})      

    port.received = {
      "BIRTHDATE": function(ts) {
        port.tabBirthdate = ts
        port.tabDeathdate = port.tabBirthdate + 15
        port.postMessage({action: "GET_AD_DATA"})
      },
      "FULL": function(data) {
        var validData = validate(data,port)   
        draw(validData,false,port.tabDeathdate)
      },
      "SINGLE": function(data) {
        var validData = validate(data,port)   
        draw(validData,true) 
      }
    }

    Object.keys(ports.page).map(function(k){
      port[k].addListener(ports.page[k].bind(port))
    })

    return port
  }

  ports.popup ={
    initialize: function() {
      var name = "popup_page_" + (+new Date).toString()
      var draw = function(data,isNewData,deathDate) {
        console.log("received data on popup page")
        if (!isNewData && (deathDate < (+new Date)/1000)) {
          document.getElementById("yoshi-state").innerText = "No targettable ads found"
        }
        var data = RB.yoshi.data.popup_reshape(data)
        RB.yoshi.UI.popup.buildTable(d3.select("#content-table"),data,isNewData) 
      }     

      return ports.initialize(name, getValidData, draw)
    }
  }

  ports.history = {
    initialize: function() {
      var name = "history_page_" + (+new Date).toString()
      var nofilter = function(x){return x}

        heap.load("2497956600");

        
        RB.AJAX.appnexus.getUID(function(resp,xhr){
          var uuid = xhr.responseURL.split("cookie?uuid=")[1];
          window.intercomSettings.name = "Not logged in: " + uuid
          window.intercomSettings.email = uuid
          window.intercomSettings.uuid = uuid

          startIntercom()
          window.Intercom('update',window.intercomSettings)
          RB.AJAX.rockerbox.getUser(function(x) {

            setTimeout(function() {
              window.intercomSettings.name = x.username
              window.intercomSettings.user_id = x.id
              window.Intercom('update',window.intercomSettings)
              window.Intercom('reattach_activator')

              setTimeout(function() {
                window.intercomSettings.name = x.username
                window.intercomSettings.email = x.email 
                window.intercomSettings.user_id = x.id 
                window.Intercom('update',window.intercomSettings)
              },200)

            },200)

          })
        })
        

        

      var draw = function(data,isNewData) {
        console.log("received data on history page")
        var data = RB.yoshi.data.history_reshape(data)
        RB.yoshi.UI.history.build(d3.select("#content-wrapper .panel"),data,isNewData)
      }
      return ports.initialize(name, nofilter, draw)
    }
  }
 
    

  return ports
})(RB.yoshi.ports || {})


