var RB = RB || {}
RB.portal = RB.portal || {}

RB.portal.data = (function(data){

  var REPORT_PREFIX = "reporting-"

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
      localStorage.setItem(
        REPORT_PREFIXi + name,
        JSON.stringify(transformed)
      )
      get_reporting(callback)
    })
  }

  var get_reporting = function(callback) {

    API.getAdvertiser(function(x) {
      var name = x[0].pixel_source_name
      var cached = JSON.parse(localStorage.getItem(REPORT_PREFIX + name));

      (!cached) ? 
        set_reporting(name,callback) :
        callback(cached)
    })
    
  }

  data.reporting = function(callback) {
    get_reporting(callback)
  }

  return data

})(RB.portal.data || {})
