var test = require('tape'),
  jsdom = require('jsdom'),
  d3 = require('d3'),
  tabular = require('../');

test('test creation', function (t) {
  t.plan(6)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = tabular.tabular(selection)
    .data([{"key":1,"value":[{"key":"yo"},{"key":"hey"}] }])
    .draw()

  t.equal(f.headers().length,2)
  t.equal(f._target.selectAll(".row").size(),1)
  t.equal(f._target.selectAll(".item").size(),4)

  console.log(selection.node().outerHTML)

  t.equal(f._target.selectAll("." + f.WRAPPER_CLASS).size(), 1)
  t.equal(f._target.selectAll("." + f.HEADER_WRAP_CLASS).size(), 1)
  t.equal(f._target.selectAll("." + f.BODY_WRAP_CLASS).size(), 1)



});

test('test renderers', function (t) {
  t.plan(3)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = tabular.tabular(selection)
    .data([{"key":1,"value":[{"key":"yo"},{"key":"hey"}] }])
    .render_header(function(d) {d3.select(this).text("YO") })
    .render_item(function(d) { d3.select(this).text(d.value) })

    .draw()

  t.equal(f.headers().length,2)
  t.equal(f._target.selectAll(".row").selectAll(".item").node().innerHTML,"")
  t.equal(f._target.selectAll(".item").node().innerHTML,"YO")

  console.log(selection.node().outerHTML)




});

