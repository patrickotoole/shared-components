
var test = require('tape'),
  jsdom = require('jsdom')

var d3 = require('d3');
var filter = require('../build/filter.js').filter;

test('test UI - wrapper creation', function (t) {
  t.plan(4)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = filter(selection)
    .data([1])
    .draw()
    
  t.equal(f._target.selectAll(".missing-div").size(),0)
  t.equal(f._target.selectAll(".filters-wrapper").size(),1)
  t.equal(f._target.selectAll(".filters").size(),1)
  t.equal(f._target.selectAll(".filter").size(),1)

});

test('test UI - filter creation (single)', function (t) {
  t.plan(3)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var FIELDS = ["yo"]

  var f = filter(selection)
    .fields(FIELDS)
    .ops([{"key":1}])
    .data([{"field":"yo","op":1,"value":1}])
    .draw()

    
  t.equal(f._target.selectAll(".filter").size(),1)
  //t.equal(f._target.selectAll(".op").selectAll("option").size(),1)
  t.equal(f._target.selectAll(".field").selectAll("option").size(),1)
  t.equal(f._target.selectAll(".value").property("value"),"1")

});

test('test UI - single filter creation with dropdowns', function (t) {
  t.plan(2)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var OPS = [ {"key": "yo"}, {"key":1}, {"key":3}, {"key":4} ]
    , FIELDS = [ "yo", 1, 3, 4 ]
    , VALUE = "BALLER"

  var f = filter(selection)
    .fields(FIELDS)
    .ops([OPS])
    .data([{"field":"1","op":"yo","value":VALUE}])
    .draw()
    
  //t.equal(f._target.selectAll(".op").selectAll("option").size(),OPS.length + 1)
  t.equal(f._target.selectAll(".field").selectAll("option").size(),FIELDS.length + 1)

  var selected_op = f._target.selectAll(".op > option:selected")
  var selected_field = f._target.selectAll(".field > option:selected")

  //t.equal(selected_op.datum(),OPS[0])
  t.equal(selected_field.datum(),1)

});

test('test UI - new filter button', function (t) {
  t.plan(2)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = filter(selection)
    .data([1])
    .draw()
    
  t.equal(f._target.selectAll(".filter-footer").size(),1)
  t.equal(f._target.selectAll(".add").size(),1)

});

test('test UI - add new filter', function (t) {
  t.plan(2)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = filter(selection)
    .data([1])
    .draw()

  //t.equal(f._target.selectAll(".op").size(),1)
  t.equal(f._target.selectAll(".field").size(),1)
    
  f._target.selectAll(".add")
    .on("click")()

  //t.equal(f._target.selectAll(".op").size(),2)
  t.equal(f._target.selectAll(".field").size(),1)

});

test('test UI - multi-filter selected', function (t) {
  t.plan(1)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var OPS = [ {"key": "yo"}, {"key":1}, {"key":3}, {"key":4} ]
    , FIELDS = [ "yo", 1, 3, 4 ]
    , VALUE = "BALLER"

  var f = filter(selection)
    .fields(FIELDS)
    .ops([OPS,OPS])
    .data([
        {"field":"1","op":"yo","value":VALUE}
      , {"field":"3","op":"1","value":VALUE}
    ])
    .draw()
    

  var selected_op = f._target.selectAll(".op > option:selected")
  var selected_field = f._target.selectAll(".field > option:selected")

  //t.equal(JSON.stringify(selected_op.data()) ,JSON.stringify(OPS.slice(0,2)) )
  t.equal(JSON.stringify(selected_field.data()) ,JSON.stringify(FIELDS.slice(1,3)) )

});
