process.stdin.resume();
process.stdin.setEncoding('utf8');

var PYTHONPATH = process.env.PYTHONPATH
var PYTHONPATH = "/root/rockerbox-metrics/metrics"

var filter = require(PYTHONPATH + "/static/js/rockerbox/crusher/filter/build/filter.js")
  , custom_filter = require(PYTHONPATH + "/../campaign_studio/static/custom_filter.js")


var filter_params_json = process.argv.slice(2).join(" ")

var full_chunk = "";

process.stdin.on('data', function(chunk) {
  full_chunk += chunk;
});

process.stdin.on('end', function() {
  var data = JSON.parse(full_chunk)
    , filter_params = JSON.parse(filter_params_json)

  var d = custom_filter.buildModifiedFilter(data,filter_params,filter)
  console.log(JSON.stringify(d))

});
