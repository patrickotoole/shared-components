process.stdin.resume();
process.stdin.setEncoding('utf8');

var PYTHONPATH = "/root/rockerbox-metrics/metrics"
var custom_transform = require(PYTHONPATH + "/../campaign_studio/static/custom_transform.js")

var transform_params_json = process.argv.slice(2).join(" ")

var full_chunk = "";

process.stdin.on('data', function(chunk) {
  full_chunk += chunk;
});

process.stdin.on('end', function() {
  var d = JSON.parse(full_chunk)
    , data = d['data']
    , transform_params = d['transforms']

  var d = custom_transform.runTransforms(transform_params,d)
  console.log(JSON.stringify(d))

});
