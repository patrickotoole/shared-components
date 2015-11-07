var RB = RB || {}
RB.portal = RB.portal || {}

var range = function(n) { return Array.apply(null, Array(n)).map(function (_, i) {return i;});}

RB.portal.data = (function(data){

  var db;

  var getDB = function(name) {
    if (db) return db

    db = new Dexie(name)
    db.version(3).stores({imps: "&[bucket_name+date],imps,visible,campaign_id,visits,is_valid,bucket_name,media_cost,date,loaded,cpm_multiplier,clicks,campaign_buckets,dd,impressions,conversions,cost"})
    db.open()
  }


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
    getDB(name);

    API.getReporting(function(json){

      var transformed = json.map(reportingTransform)
      transformed.map(function(i){ db.imps.put(i) })
      
      callback(transformed)
    })
  }

  var get_reporting = function(callback) {

    API.getAdvertiser(function(x) {
      

      var name = x[0].pixel_source_name

      getDB(name);

      db.imps.orderBy("dd").uniqueKeys(function(dd){

        // REMOVING CACHE FOR NOW
        /*var max_date = dd.map(function(y){ return +new Date(y)}).reduce(function(p,c){return Math.max(p,c)},0);
        var yesterday = +new Date(new Date() - 8*600000)

        if (yesterday > max_date) {
        */
        if (true) {
          console.log("pulling data...")
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
