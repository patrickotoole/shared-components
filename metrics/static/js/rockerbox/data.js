var RB = RB || {}
RB.portal = RB.portal || {}

var range = function(n) { return Array.apply(null, Array(n)).map(function (_, i) {return i;});}

RB.portal.data = (function(data){

  var db = new Dexie("Rockerbox")
  db.version(1).stores({imps: "++id,imps,visible,campaign_id,visits,is_valid,bucket_name,media_cost,date,loaded,cpm_multiplier,clicks,campaign_buckets,dd,impressions,conversions,cost"})
  db.open()


  var REPORT_PREFIX = "reporting-"

  var dateString = function(){
    var date = new Date()
    return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate()
  }

  var API = RB.AJAX.rockerbox,
    reportingTransform = function(d) {
      var name = d.bucket_name == "default" ?  "Default Campaign" : d.bucket_name;
      name = name || "Default Campaign" 

      d.campaign_bucket = name.replace("Yoshi | ","");
      d.campaign_id = d.campaign_id;
      d.dd = new Date(d.date * 1000);
      d.imps = +d.imps;
      d.impressions = d.imps
      d.clicks = +d.clicks;
      d.conversions = +d.is_valid;
      d.cost = d.media_cost * d.cpm_multiplier;
      return d
    }

  var set_reporting = function(name,callback) {
    API.getReporting(function(json){

      var transformed = json.map(reportingTransform)

      transformed.map(function(i){ db.imps.add(i) })
      
      get_reporting(callback)
    })
  }

  var get_reporting = function(callback) {

    API.getAdvertiser(function(x) {
      var name = x[0].pixel_source_name

      db.imps.orderBy("dd").uniqueKeys(function(dd){
        var max_date = dd.map(function(y){ return +new Date(y)}).reduce(function(p,c){return Math.max(p,c)},0);
        var yesterday = +new Date(new Date() -86400000)

        if (yesterday > max_date) {
          console.log("HERE")
          set_reporting(name,callback)
        } else {
          db.imps.orderBy("date").toArray(function(data){
            callback(data)
          })
        }
      })

      
    })
    
  }

  data.reporting = function(callback) {
    get_reporting(callback)
  }

  return data

})(RB.portal.data || {})
