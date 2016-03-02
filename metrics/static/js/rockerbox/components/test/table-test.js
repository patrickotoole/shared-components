var test = require('tape'),
  table = require('../').table,
  jsdom = require("jsdom"),
  d3 = require('d3')

var test_data = {
  header: [
    {
      key: 'key',
      title: 'Rank'
    },
    {
      key: 'url',
      title: 'URL'
    },
    {
      key: 'uniques',
      title: 'Uniques'
    },
    {
      key: 'count',
      title: 'Count'
    }
  ],
  body: [
    {
      key: 1,
      url: 'http://testurl.com/test/test',
      uniques: 103,
      count: 501
    },
    {
      key: 2,
      url: '//kiplinger.com/slideshow/business/T019-S010-states-with-the-fastest-job-growth/index.html',
      uniques: 103,
      count: 501
    },
    {
      key: 3,
      url: '//kiplinger.com/slideshow/business/T019-S010-states-with-the-fastest-job-growth/index.html',
      uniques: 103,
      count: 501
    },
    {
      key: 4,
      url: '//kiplinger.com/slideshow/business/T019-S010-states-with-the-fastest-job-growth/index.html',
      uniques: 103,
      count: 501
    },
    {
      key: 5,
      url: '//kiplinger.com/slideshow/business/T019-S010-states-with-the-fastest-job-growth/index.html',
      uniques: 103,
      count: 501
    },
    {
      key: 6,
      url: '//kiplinger.com/slideshow/business/T019-S010-states-with-the-fastest-job-growth/index.html',
      uniques: 103,
      count: 501
    }
  ]
};


var document = jsdom.jsdom('<div id="canvas"></div>'),
  canvas = document.querySelector("#canvas"),
  selection = d3.selectAll([canvas]);

  table(selection)
    .data(test_data)
    .draw();

  test('Draw a base table element', function(t) {
    t.plan(1)

    t.equal(selection.selectAll('table.table').size(), 1);
  });

  test('Draw rows with segmented dataset', function(t) {
    t.plan(1)

    t.equal(selection.selectAll('tr').size(), 7);
  });

  test('Draw header with correct header content', function(t) {
    t.plan(4)

    t.equal(selection.selectAll('th.table_head_column')[0][0].innerHTML, 'Rank');
    t.equal(selection.selectAll('th.table_head_column')[0][1].innerHTML, 'URL');
    t.equal(selection.selectAll('th.table_head_column')[0][2].innerHTML, 'Uniques');
    t.equal(selection.selectAll('th.table_head_column')[0][3].innerHTML, 'Count');
  });

  test('Draw rows with correct rows content', function(t) {
    t.plan(4)

    t.equal(selection.selectAll('tr:nth-child(1) td')[0][0].innerHTML, '1');
    t.equal(selection.selectAll('tr:nth-child(1) td')[0][1].innerHTML, 'http://testurl.com/test/test');
    t.equal(selection.selectAll('tr:nth-child(1) td')[0][2].innerHTML, '103');
    t.equal(selection.selectAll('tr:nth-child(1) td')[0][3].innerHTML, '501');
  });
