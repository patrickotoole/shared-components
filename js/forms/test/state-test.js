var test = require('tape'),
  d3 = require('d3'),
  s = require('../');

test('test state creation', function (t) {
  t.plan(3)

  var state = s.state()

  state.set("k","v")

  t.equal(state._state['k'],"v","has value set")
  t.equal(typeof state._subscription, "object","has object")
  t.equal(state.subscribe("k",function() {}),state,"subscriber")

});

test('test publisher', function (t) {
  t.plan(4)

  var state = s.state()

  state.set("k","v")
  t.equal(state._state['k'],"v","has value set")

  state.publish("k","yo")
  t.equal(state._state['k'],"yo","has value set via pub")


  var asyncPub = function(cb){
    setTimeout(function() {cb(false,"asdf")},100)
  }

  state.publish("k",asyncPub)
  t.equal(state._state['k'],"yo","value hasnt changed because async")

  setTimeout(function(){
    t.equal(state._state['k'],"asdf","has value set via async pub")
  },200)

});

test('test subscribe to any change', function (t) {
  t.plan(3)

  var state = s.state()
    , EXPECTED_VALUE = state._state;

  state.set("k","v")
  state.subscribe("identifier",function(error,value) {
    t.equal(value,EXPECTED_VALUE)
  })

  state.publish("k","yo")

  var asyncPub = function(cb){
    setTimeout(function() {
      cb(false,"asdf")
    },100)
  }
  state.publish("k",asyncPub)

});


test('test subscribe to publisher', function (t) {
  t.plan(3)

  var state = s.state()
    , EXPECTED_VALUE = "v";

  state.set("k","v")
  state.subscribe("identifier","k",function(error,value) {
    t.equal(value,EXPECTED_VALUE)
  })

  EXPECTED_VALUE = "yo"
  state.publish("k","yo")

  var asyncPub = function(cb){
    setTimeout(function() {
      EXPECTED_VALUE = "asdf"
      cb(false,"asdf")
    },100)
  }
  state.publish("k",asyncPub)

});


