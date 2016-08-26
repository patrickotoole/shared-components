var test = require('tape'),
  d3 = require('d3'),
  jsdom = require('jsdom');

var table  = require('../').table;

test('test UI - wrapper creation', function (t) {
  t.plan(4)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = table(selection)
    .draw()
    
  t.equal(f._target.selectAll(".table-wrapper").size(),1,"should create wrapper")
  t.equal(f._target.selectAll("table").size(),2, "should create two tables")
  t.equal(f._target.selectAll(".table-option").size(),1, "should create option selector")
  t.equal(f._target.selectAll("thead .tr").size(),0, "should be no header rows")

});

test('test UI - header creation', function (t) {
  t.plan(4)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = table(selection)
    .headers([{key:"1",value:"value"}])
    .draw()
    
  t.equal(f._target.selectAll("thead tr").size(),4, "should be no header rows")
  t.equal(f._target.selectAll("thead tr").size(),4, "should be no header rows")


});
