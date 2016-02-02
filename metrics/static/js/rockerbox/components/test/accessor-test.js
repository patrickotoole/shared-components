var test = require('tape'),
  accessor = require('../').accessor;

test('test adding param to bound object', function (t) {
    t.plan(1)
    var x = {}
    accessor.bind(x)("asdf","VALUE")
    t.equal(x["_asdf"],"VALUE")
});

test('test retreiving param from bound object', function (t) {
    t.plan(1)
    var x = {"_asdf":"VALUE"}
    t.equal(accessor.bind(x)("asdf"),"VALUE")
});

