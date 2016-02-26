var test = require('tape'),
  histogram = require('../').histogram,
  jsdom = require("jsdom"),
  d3 = require('d3')

var test_data = [
  {
    key: 1,
    title: '1-5 views',
    value: 56
  }, {
    key: 2,
    title: '6-10 views',
    value: 21
  }, {
    key: 3,
    title: '11-20 views',
    value: 6
  }
];

var document = jsdom.jsdom('<div id="canvas"></div>'),
  canvas = document.querySelector("#canvas"),
  selection = d3.selectAll([canvas]);

  histogram(selection)
    .data(test_data)
    .draw();


test('Draw a base SVG', function(t) {
  t.plan(1)

  t.equal(selection.selectAll('svg').size(), 1);
});

test('Draw bars', function(t) {
  t.plan(3)

  var bar1 = d3.select(selection.selectAll('.bar')[0][0]);
  var bar2 = d3.select(selection.selectAll('.bar')[0][1]);
  var bar3 = d3.select(selection.selectAll('.bar')[0][2]);

  var sizeCheck1 = (bar1.attr('width') > bar2.attr('width'))
  var sizeCheck2 = (bar2.attr('width') > bar3.attr('width'))

  // Do the bars exist?
  t.equal(selection.selectAll('.bar').size(), 3);

  // Is bar 1 bigger than bar 2?
  t.equal(sizeCheck1, true);

  // Is bar 2 bigger than bar 3?
  t.equal(sizeCheck2, true);
});
