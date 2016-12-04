var test = require('tape'),
  d3 = require('d3'),
  filter_data = require('../').filter_data;

var FIXTURE_1 = [
    {
        "key": "K1"
      , "type": "T2"
      , "values": {"a":1,"b":2}
    }
  , {
        "key": "K2"
      , "type": "T2"
      , "values": {"a":1,"b":2}
    }
  , {
        "key": "K3"
      , "type": "T2"
      , "values": {"a":1,"b":2}
    }
  , {
        "type": "T2"
      , "values": {"a":3,"b":2}
    }

]

test('test data - equals filter', function (t) {
  t.plan(1);

  var f = filter_data(FIXTURE_1)
    .by([
        {
            "field":"key"
          , "value": "K2"
          , "op": "equals"
        }
    ]);
    
  t.equal(f.length,1);

})

test('test data - contains filter', function (t) {
  t.plan(1);

  var f = filter_data(FIXTURE_1)
    .by([
        {
            "field":"key"
          , "value": "K"
          , "op": "contains"
        }
    ]);

  t.equal(f.length,FIXTURE_1.length - 1);

});

test('test data - no equal filter', function (t) {
  t.plan(1);

  var f = filter_data(FIXTURE_1)
    .by([
        {
            "field":"key"
          , "value": "K2"
          , "op": "does not equal"
        }
    ]);

  t.equal(f.length,3);

});

test('test data - is set filter', function (t) {
  t.plan(1);

  var f = filter_data(FIXTURE_1)
    .by([
        {
            "field":"key"
          , "op": "is set"
        }
    ]);

  t.equal(f.length,3);

});

test('test data - is not set filter', function (t) {
  t.plan(1);

  var f = filter_data(FIXTURE_1)
    .by([
        {
            "field":"key"
          , "op": "is not set"
        }
    ]);

  t.equal(f.length,1);

});

test('test data - multi filters - full overlap', function (t) {
  t.plan(1);

  var f = filter_data(FIXTURE_1)
    .by([
        {
            "field":"key"
          , "op": "is not set"
        }
      , {
            "field":"key"
          , "op": "is set"
        }
    ]);

  t.equal(f.length,FIXTURE_1.length);

});


test('test data - multi filters - and', function (t) {
  t.plan(1);

  var f = filter_data(FIXTURE_1)
    .logic("and")
    .by([
        {
            "field":"key"
          , "op": "is not set"
        }
      , {
            "field":"type"
          , "op": "contains"
          , "value": "T"
        }
    ]);

  t.equal(f.length,1);

});

test('test data - deep filter', function (t) {
  t.plan(2);

  var f = filter_data(FIXTURE_1)
    .logic("and")
    .by([
        {
            "field":"values.a"
          , "op": "equals"
          , "value": "1"
        }
    ]);

  t.equal(f.length,3);

  var f = filter_data(FIXTURE_1)
    .logic("and")
    .by([
        {
            "field":"values.a"
          , "op": "equals"
          , "value": "3"
        }
    ]);

  t.equal(f.length,1);

});

test('test data - deep filter - or', function (t) {
  t.plan(1);

  var f = filter_data(FIXTURE_1)
    .logic("or")
    .by([
        {
            "field":"values.a"
          , "op": "equals"
          , "value": "1"
        }
      , {
            "field":"values.b"
          , "op": "equals"
          , "value": "2"
        }

    ]);

  t.equal(f.length,4);

});
