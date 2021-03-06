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
    
  t.equal(f._target.selectAll("thead tr").size(),4, "should have header rows")
  t.equal(f._target.selectAll(".main .table-options .option").size(),1, "should have main.table options")
  t.equal(f._target.selectAll(".fixed .table-options .option").size(),1, "should have fixed.table options")
  t.equal(f._target.selectAll("thead tr.table-options").classed("hidden"),true, "should have header rows")
})

test('test UI - header options expose', function (t) {
  t.plan(3)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = table(selection)
    .headers([{key:"1",value:"value"}])
    .draw()
 
  t.equal(f._target.selectAll("thead tr.table-options").classed("hidden"),true, "should start hidden")

  f._target.selectAll(".table-option").on("click")()
  t.equal(f._target.selectAll("thead tr.table-options").classed("hidden"),false, "should unhide")

  f._target.selectAll(".table-option").on("click")()
  t.equal(f._target.selectAll("thead tr.table-options").classed("hidden"),true, "should hide")

});

test('test UI - with data', function (t) {
  t.plan(3)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = table(selection)
    .data({"key":"title","values":[{"x1":4,"x2":2,"c3":1}]})
    .draw()
 
  t.equal(f.headers().length,3,"automatically detect headers")

  f.headers([{"key":"x1","value":"CUSTOM"}])
    .draw()

  t.equal(f.headers().length,1,"only one header visible")
  t.equal(f.headers()[0].value,f._target.selectAll(".table-headers th").text(),"first header matches")

});


test('test UI - select headers', function (t) {
  t.plan(6)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = table(selection)
    .data({"key":"title","values":[{"x1":4,"x2":2,"c3":1}]})
    .headers([{"key":"x1","value":"CUSTOM"}])
    .skip_option(true)
    .draw()

  t.equal(f.headers().length,1,"only one header visible")
  t.equal(f.headers()[0].value,f._target.selectAll(".table-headers th").text(),"first header matches")
  selection.selectAll(".main").selectAll("input").each(function(x) { 
    this.checked = false
    d3.select(this).on("click").bind(this)(x)
  })

  t.equal(f.headers().length,1,"no headers exposed")

  selection.selectAll(".main").selectAll("input").each(function(x) { 
    this.checked = !this.checked
    d3.select(this).on("click").bind(this)(x)
  })

  t.equal(f.headers().length,1,"all headers selected")
  t.equal(f._target.selectAll(".main .table-headers th").data().length, f.headers().length, "headers displaying")
  t.equal(f._target.selectAll(".fixed .table-headers th").data().length, f.headers().length, "headers displaying")

});

test('test UI - render rows', function (t) {
  t.plan(6)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = table(selection)
    .data({"key":"title","values":[{"x1":4,"x2":2,"c3":1}]})
    .headers([{"key":"x1","value":"CUSTOM",selected:true}])
    .skip_option(true)
    .draw()

  t.equal(selection.selectAll("tbody").size(),1,"body")
  t.equal(selection.selectAll("tbody tr").size(),1,"rows")
  //t.equal(selection.selectAll("tbody tr td").size(),1,"tds")
  t.equal(selection.selectAll("tbody tr td").text(),"4","value")

  f.headers([
        {"key":"x2","value":"CUSTOM2",selected:true}
      , {"key":"x1","value":"CUSTOM",selected:true}
    ])
    .draw()

  //t.equal(selection.selectAll("tbody tr td").size(),2,"len")
  t.equal(selection.selectAll("tbody tr td").text(),"2","value")

  f.data({"key":"title","values":[
        {"x1":4,"x2":2,"c3":1}
      , {"x1":4,"x2":2,"c3":1}
      , {"x1":4,"x2":2,"c3":1}
    ]})
    .draw()

  t.equal(selection.selectAll("tbody tr").size(),3)
  t.equal(selection.selectAll("tbody tr td").size(),9)

});

test('test UI - custom column width', function (t) {
  t.plan(1)

  var document = jsdom.jsdom('<div id="canvas"></div>'),
    canvas = document.querySelector("#canvas"),
    selection = d3.selectAll([canvas]);

  var f = table(selection)
    .data({"key":"title","values":[{"x1":4,"x2":2,"c3":1}]})
    .headers([
          {"key":"x1","value":"CUSTOM", "width":"100px"}
        , {"key":"x2","value":"CUSTOM2"}

    ])
    .draw()

  t.equal(selection.selectAll(".main thead tr.table-headers th:first-of-type").style("width"),"100px")

  // without using pahntom, the following cannot be implemented but should work...
  //t.equal(selection.selectAll(".main tbody tr:first-of-type td:first-of-type").node().offsetWidth,"100px")

  //f.headers([
  //        {"key":"x1","value":"CUSTOM", "width":"100px"}
  //      , {"key":"x2","value":"CUSTOM2"}
  //  ])
  //  .draw()



});

