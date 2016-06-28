var jsdom = require("jsdom"),
  d3 = require('d3'),
  fs = require("fs");

function read(f) {
  return fs.readFileSync(f).toString();
}
function include(f) {
  eval.apply(global, [read(f)]);
}
include(__dirname + '/funcs.js');

var advertiser = process.argv.slice(2).join(" ");

process.stdin.resume();
process.stdin.setEncoding('utf8');

var document = jsdom.jsdom('<head> <meta charset="UTF-8"> </head><body></body>');
var classes = ["build_email_top_small","build_email_top_header","build_email_main_header","build_email_main_content","build_email_bottom_header","build_email_bottom_footer"];

var parent_0 = d3.select(document.body)
var full_chunk = ""

process.stdin.on('data', function(chunk) {
  full_chunk += chunk;
})
process.stdin.on('end', function() {

  classes.map(function(x){
    eval(x + '(parent_0,' + full_chunk +',"' + advertiser + '")')
  })
  console.log('<head> <meta charset="UTF-8"> </head>' + document.body.outerHTML)

});



