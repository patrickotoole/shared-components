var test = require('tape'),
  d3 = require('d3'),
  s = require('../');




test('test state creation', function (t) {
  t.plan(3)

  var state = s.state()

  state.update("k","v")

  t.equal(state._current['k'],"v","has value set")
  t.equal(typeof state._subscription, "object","has object")
  t.equal(state.subscribe("k",function() {}),state,"subscriber")

});

test('test publisher', function (t) {
  t.plan(4)

  var state = s.state()

  state.update("k","v")
  t.equal(state._current['k'],"v","has value set")

  state.publish("k","yo")
  t.equal(state._current['k'],"yo","has value set via pub")


  var asyncPub = function(cb){
    setTimeout(function() {cb(false,"asdf")},100)
  }

  state.publish("k",asyncPub)
  t.equal(state._current['k'],"yo","value hasnt changed because async")

  setTimeout(function(){
    t.equal(state._current['k'],"asdf","has value set via async pub")
  },200)

});

test('test subscribe to any change', function (t) {
  t.plan(2)

  var state = s.state()
    , EXPECTED_VALUE = state._state;

  state.update("k","v")
  state.subscribe("identifier",function(error,value) {
    t.equal(value,state._state)
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
  t.plan(4)

  var state = s.state()
    , EXPECTED_VALUE = "v"
    , incrementor = 1;

  state.update("k","v")
  state.subscribe("identifier.k",function(error,value) {
    t.equal(value,EXPECTED_VALUE)

    incrementor += 1
    t.equal(state._past.length,incrementor, "length of history is correct")

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

test('test back', function (t) {
  t.plan(6)

  var state = s.state()
    , EXPECTED_VALUE = "v"
    , incrementor = 0
    , f_incrementor = 0;

  incrementor += 1
  state.update("k","v")

  state.subscribe("identifier",function(error,value) {
    console.log(value)
    t.equal(value,state._state)
    t.equal(state._past.length, incrementor, "length of history is correct")
    t.equal(state._future.length, f_incrementor, "length of future is correct")
  })

  EXPECTED_VALUE = "yo"
  incrementor += 1
  state.publish("k","yo")

  incrementor -= 1
  EXPECTED_VALUE = "v"
  f_incrementor += 1
  state.back()
  

});

test('test forward', function (t) {
  t.plan(9)

  var state = s.state()
    , EXPECTED_VALUE = "v"
    , incrementor = 0
    , f_incrementor = 0;

  incrementor += 1
  state.update("k","v")

  state.subscribe("identifier",function(error,value) {
    console.log(value)
    t.equal(value,state._state)
    t.equal(state._past.length, incrementor, "length of history is correct")
    t.equal(state._future.length, f_incrementor, "length of future is correct")
  })

  EXPECTED_VALUE = "yo"
  incrementor += 1
  state.publish("k","yo")

  incrementor -= 1
  EXPECTED_VALUE = "v"
  f_incrementor += 1
  state.back()

  incrementor += 1
  EXPECTED_VALUE = "yo"
  f_incrementor = 0
  state.forward()

});

test('test change event', function (t) {
  t.plan(2)

  var state = s.state()
    .on("change", function(modified_key,modified_value,state){
      t.equal(state[modified_key],modified_value)
    })

  state
    .subscribe("uuid", function(err,value) {
      t.equal(value,state._state) 
    })

  state.publish("k","v")

  state
    .on("change", function(modified_key,modified_value,state){
      t.equal(state[modified_key],modified_value)
    })

});



test('test back event', function (t) {
  t.plan(4)

  var state = s.state()
    .on("back", function(current,future,past){
      t.equal(future.length,1)
      t.equal(past.length,0)
    })

  state
    .subscribe("uuid", function(err,value) {
      t.equal(value,state._state) // should once on init, and again on push
    })

  state.publish("k","v")
  state.back()

});


test('test forward event', function (t) {
  t.plan(5)

  var state = s.state()
    .on("forward", function(current,past,future){
      t.equal(past.length,1)
      t.equal(future.length,0)
    })

  state
    .subscribe("uuid", function(err,value) {
      t.equal(value,state._state) // should once on init, and again on push
    })

  state.publish("k","v")
  state.back()
  state.forward()

});


test('test build event', function (t) {
  t.plan(2)

  var state = s.state()

  state
    .subscribe("uuid", function(err,value) {
      console.log(value)
      t.equal(value,state._state) // should once on init, and again on push
    })

  state.publish("k","v")

  state
    .on("build", function(_state,_current,_static){
      console.log(_state,_current,_static)
      _state['yo'] = "on the fly modification"
    })

  state
    .subscribe("uuid", function(err,value) {
      t.equal(value['yo'],"on the fly modification") 
    })

  state.publish("k","v")





});
