var RB = RB || {}
RB.AJAX = (function(obj){

  obj.constants = (function(constants) {
    var an_base = "http://ib.adnxs.com",
      rb_base = new URL(d3.selectAll("script").filter(function(x){return this.src.indexOf("ajax.js") > -1}).attr("src")).origin

    
    constants.AN_BASE = an_base
    constants.ANPXJ = an_base + "/pxj?bidder=222&action=setPageLoadID(12345);"  
    constants.ANSEG = an_base + "/seg?add=2487100"
    constants.GETUID = an_base + "/getuid?/cookie?uuid=$UID"
    constants.SELLERS = rb_base + "/sellers"
    constants.CAMPAIGN  = rb_base + "/campaign?format=json"
    constants.ADVERTISER = rb_base + "/advertiser?format=json&include="
    constants.USER = rb_base + "/login?format=json"
    constants.CREATIVE = rb_base + "/creative?format=json"
    constants.VIEWABLE = rb_base + "/viewability"
    constants.COUNTRY = rb_base + "/location/country" 
    constants.REGION = rb_base + "/location/region"  
    constants.CITY = rb_base + "/location/city"   

    constants.HOVERBOARD = rb_base + "/hoverboard?format=json&meta=domain&limit=12"


    return constants
  })(obj.constants || {})


  obj.helpers = (function(helpers) {
    helpers.GET = function(url,cb) {
      var callback = cb || function(){}, xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onreadystatechange = function() { 
        if (xhr.readyState == 4) callback(xhr.responseText,xhr)
      }
      xhr.send();
    }

    helpers.GETJSON = function(url,cb,fail) {
      var fail = fail || function(){}
      var callback = function(resp) { 
        try {
          cb(JSON.parse(resp))
        } catch(e){
          console.log(e)
          fail(resp)
        } 
      }
      helpers.GET(url,callback)
    }

    helpers.POSTJSON = function(url,data,cb) {
      var callback = cb || function(){}, xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-type", "application/json");
      xhr.onreadystatechange = function() { 
        if (xhr.readyState == 4) callback(xhr.responseText,xhr)
      }
      xhr.send(data);
    }

    helpers.PUTJSON = function(url,id,data,cb) {
      var callback = cb || function(){}, xhr = new XMLHttpRequest();
      xhr.open("PUT", url + id, true);
      xhr.setRequestHeader("Content-type", "application/json");
      xhr.onreadystatechange = function() { 
        if (xhr.readyState == 4) callback(xhr.responseText,xhr)
      }
      xhr.send(data);
    }

    helpers.parseSellers = function(cb,obj) {
      var sellerMap = {}
      obj.map(function(seller){ sellerMap[seller.id] = seller.name })
      cb(sellerMap) 
    }

    return helpers
  })(obj.helpers || {})


  obj.appnexus = (function(appnexus) {
    appnexus.setPagloadID = obj.helpers.GET.bind(false,obj.constants.ANPXJ)
    appnexus.setSegment = obj.helpers.GET.bind(false,obj.constants.ANSEG)
    appnexus.getUID = obj.helpers.GET.bind(false,obj.constants.GETUID)


    return appnexus

  })(obj.appnexus || {})

  obj.rockerbox = (function(rockerbox) {

    rockerbox.getSellers = function(cb) {
      return obj.helpers.GETJSON(
        obj.constants.SELLERS, 
        obj.helpers.parseSellers.bind(false,cb)
      )
    }
    rockerbox.getCampaigns = obj.helpers.GETJSON.bind(false,obj.constants.CAMPAIGN)
    rockerbox.postCampaign = obj.helpers.POSTJSON.bind(false,obj.constants.CAMPAIGN)
    rockerbox.putCampaign = obj.helpers.PUTJSON.bind(false,obj.constants.CAMPAIGN)
    rockerbox.getAdvertiser = obj.helpers.GETJSON.bind(false,obj.constants.ADVERTISER)
    rockerbox.getUser = obj.helpers.GETJSON.bind(false,obj.constants.USER)
    rockerbox.getCreatives = obj.helpers.GETJSON.bind(false,obj.constants.CREATIVE)
    rockerbox.getViewability = function(x,cb) { return obj.helpers.GETJSON(obj.constants.VIEWABLE + x,cb) }
    rockerbox.getCountries = obj.helpers.GETJSON.bind(false,obj.constants.COUNTRY) 
    rockerbox.getRegions = function(x,cb) { return obj.helpers.GETJSON(obj.constants.REGION+ x,cb) } 
    rockerbox.getCities = function(x,cb) { return obj.helpers.GETJSON(obj.constants.CITY+ x,cb) }  
    rockerbox.getHoverboard = obj.helpers.GETJSON.bind(false,obj.constants.HOVERBOARD)

    //rockerbox.getCreatives = creativeMock
    return rockerbox 

  })(obj.rockerbox|| {})



  return obj


})(RB.AJAX || {})

