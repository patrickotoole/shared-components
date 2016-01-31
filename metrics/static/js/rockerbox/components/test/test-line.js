var test = require('tape'),
  line = require('../').line,
  jsdom = require("jsdom"),
  d3 = require('d3')

test('test draw', function (t) {
    t.plan(4)

    var document = jsdom.jsdom("<h1 id='one'></h1>"),
      one = document.querySelector("#one"),
      selection = d3.selectAll([one]);

    selection.style("width","100px")
    selection.style("height","100px")

    selection.datum([{"key":"1","values":[{"key":1,"value":10},{"key":2,"value":1},{"key":3,"value":5}]}])

    var l = line(selection)
    l.draw()

    t.equal(selection.selectAll(".canvas").selectAll(".line").size(),1)
    t.equal(selection.selectAll(".canvas").selectAll(".area").size(),1)
    t.equal(selection.selectAll(".canvas").selectAll(".points").size(),1)
    t.equal(selection.selectAll(".canvas").selectAll(".points").selectAll(".point").size(),3)

});

test('test setting up the base', function (t) {
    t.plan(3)

    var document = jsdom.jsdom("<h1 id='one'></h1>"),
      one = document.querySelector("#one"),
      selection = d3.selectAll([one]);

    selection.style("width","100px")
    selection.style("height","100px")
    selection.datum([{}])

    var l = line(selection)

    var svg = selection.selectAll("svg")

    t.equal(svg.attr("width"),'100')
    t.equal(svg.attr("height"),'100')

    var g = svg.selectAll("g")
    var margins = l.margins()
    t.equal(g.attr("transform"),"translate(" + margins.left + "," + margins.top + ")")

});

test('test setting up multiple bases', function (t) {
    t.plan(4)

    var document = jsdom.jsdom("<h1 id='one'></h1>"),
      one = document.querySelector("#one"),
      selection = d3.selectAll([one]);

    selection.datum([{key:"1"},{key:"2"}])

    var l = line(selection)

    var svg = selection.selectAll("svg")
    var g = svg.selectAll("g")

    t.equal(svg.size(),2)
    t.equal(g.size(),2)

    t.equal(svg.attr("width"),null)
    t.equal(svg.attr("height"),null)

});

test('test wrong base data', function (t) {
    t.plan(1)

    var document = jsdom.jsdom("<h1 id='one'></h1>"),
      one = document.querySelector("#one"),
      selection = d3.selectAll([one]);

    selection.datum(["WRONG"])

    t.throws(function() {
      var l = line(selection)
    })

});

test('test scale creation', function (t) {
    t.plan(7)

    var document = jsdom.jsdom("<h1 id='one'></h1>"),
      one = document.querySelector("#one"),
      selection = d3.selectAll([one]);

    selection.style("width","100px")
    selection.style("height","100px")

    selection.datum([{"key":"1","values":[{"key":1,"value":10},{"key":2,"value":1},{"key":3,"value":5}]}])

    var l = line(selection)
    var d = selection.datum()

    t.equal(typeof(d[0].scales),"object")

    t.equal(d[0].scales.y(0),0)
    t.equal(d[0].scales.y(1),6)
    t.equal(d[0].scales.y(10),d[0].options.canvas.height)

    t.equal(d[0].scales.x(1),0)
    t.equal(d[0].scales.x(2),d[0].options.canvas.width/2)
    t.equal(d[0].scales.x(3),d[0].options.canvas.width)

});


