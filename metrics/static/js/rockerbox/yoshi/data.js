var RB = RB || {}
RB.yoshi = RB.yoshi || {}

var parseDomain = function(url) {
  var url = url.split("//")[1] || url
  url = url.split("www.")[1] || url
  return url.split("/")[0].toLowerCase()
}

var getSeller = function(id){
  return RB.yoshi.GLOBALS.SELLERS[id]
}
RB.yoshi.data = (function(data){

  data.push = function(ts, data) {
    var total = Object.keys(data[ts]).reduce(function(p,x){return p + data[ts][x].length},0)
  
    chrome.runtime.sendMessage({"action":"PUSH_AD_DATA",content:data})
    chrome.runtime.sendMessage({"action":"PUSH_BADGE_DATA", content: total, ts: ts})
  
    chrome.storage.local.set(data);
  }

  data.push_viewable = function(imps,ts) {
    var tags = "tag_id=" + d3.set(imps.map(function(x){return x.placements[0] })).values().join("&tag_id="),
      domains = "domain=" + d3.set(imps.map(function(x){return x.domain })).values().join("&domain="), 
      sizes = "size=" + d3.set(imps.map(function(x){return x.sizes[0] })).values().join("&size="), 
      params = "?include_default=true&" + tags + "&" + domains + "&" + sizes

    RB.AJAX.rockerbox.getViewability(params,function(resp){
      var asMap = d3.nest()
        .key(function(x){return x.tag_id})
        .key(function(x){return x.domain})
        .key(function(x){return x.size})
        .map(resp)

      imps.map(function(imp){
        try {
          imp.percent_viewable = asMap[imp.placements[0]][imp.domain][imp.sizes[0]][0].percent_viewable
          imp.historical_cpm = asMap[imp.placements[0]][imp.domain][imp.sizes[0]][0].spent/asMap[imp.placements[0]][imp.domain][imp.sizes[0]][0].num_served
        } catch(e) {
          try {
            //imp.percent_viewable = asMap[imp.placements[0]][imp.domain]["default"][0].percent_viewable
          } catch(e) { }
     
        }
        return imp
      })
      var grouped = d3.nest()
        .key(function(x){ return x.urlLowered })
        .map(imps)
   
      var wrapped = {}
      wrapped[ts] = grouped

      data.push(ts,wrapped)
    })

  }

  data.record = function(parsed) {
    var imps = parsed.filtered_imps,
      ts = parseInt(+new Date/1000);

    if (imps.length) { 
      imps.map(function(imp){ 
        imp.domain = parseDomain(imp.url)
        imp.seller_id = imp.selling_member_id
        imp.seller = getSeller(imp.seller_id)
        imp.prices = [{"tag_id":imp.tag_id, "ecp":imp.estimated_clear_price, "eap":imp.estimated_average_price}]
        imp.placements = [imp.tag_id]
        imp.urlLowered = imp.url.toLowerCase();
        imp.timestamp = ts;
        imp.pageLoadID = ts;
      })

      data.push_viewable(imps,ts)
       
    }
  }

  data.flatten_records = function(data) {

    var objmap = function(obj,cb) {
      var arr = Object.keys(obj)
      return arr.map(function(k){
        return cb(k,obj[k])
      })
    }

    var flatobjmap = function(obj,cb) {
      return [].concat.apply([],objmap(obj.cb))
    }

    var flattened = [].concat.apply([],objmap(data,
      function(ts,b){
        return [].concat.apply([],objmap(b,
          function(url,d){ 
            return d.map(function(x) {
              return x
            })
          }
        ))
      })
    )

    return flattened

  }

  data.popup_reshape = function(data) {
    var flat = RB.yoshi.data.flatten_records(data)
  
    return d3.nest().key(function(x){return x.domain + x.seller}).rollup(function(x){
      return {
        count: x.length,
        seller: x[0].seller,
        domain: x[0].domain,
        timestamp: x[0].timestamp,
        viewability: d3.format("%")(x.map(function(y){ return y.percent_viewable || 0}).reduce(function(p,c){return p+c},0)/x.length),
        sizes: d3.set(x.map(function(y){return y.sizes})).values(),
        prices: x.map(function(y){return y.prices}),
        placements: d3.set(x.map(function(y){return y.placements})).values()
      }
    }).entries(flat).map(function(x){return x.values})
  }

  data.history_reshape = function(data) {

    var formatDate = function(epoch){ 
      var formatter = d3.time.format("%A, %B %d, %Y")
      return formatter(new Date(epoch*1000))
    }

    var formatTime = function(epoch){ 
      var formatter = d3.time.format("%I:%M:%S %p")
      return formatter(new Date(epoch*1000))
    }
  
    var entries = d3.nest().key(function(x){return x.key }).rollup(function(x){
      
      return { 
        timestamp: formatTime(x[0].key),
        timestamp_epoch: x[0].key,
        urls: d3.entries(x[0].value).map(function(url){
          return { 
            "key": url.key,
            "value": d3.nest().key(function(x){return x.seller + x.sizes + x.tag_id})
              .rollup(function(d){
                var x = d[0]
                x.count = d.length
                return x
              }).entries(url.value).map(function(x){return x.values})
          }
        })
      }
    }).entries(d3.map(data).entries()).map(function(x){return x.values})

    var grouped = d3.nest()
      .key(function(x){ return formatDate(x.timestamp_epoch) })
      .entries(entries)

    console.log(grouped)

    return grouped 
  }

  

  return data

})(RB.yoshi.data || {})
