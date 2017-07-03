# D3 inspire state mgmt

### Initialize

Default:
```
import state from 'state'
console.log(state.state())
```

With initial values:
```
import {state as _state} from 'state'
const init = {}
const stat = {}

const state = _state.state(init,stat)
console.log(state.state())
```

### Update / Publish

Update will update the state but not announce the change
```
state.update("k","v")
console.log(state.state())
```

Publish will update the state and announce the change
```
state.publish("k","v")
console.log(state.state())
```

Publish also accepts a function that expects to be resolved via a callback
```
var asyncPub = function(cb){
  setTimeout(function() {cb(false,"asdf")},100)
}

state.publish("k",asyncPub)
console.log(state.state()) // unchanged

setTimeout(function() {
  console.log(state.state()) // changed
},100)


```

### Subscribe
Subscribe can be used in three ways:
- anonymous (global subscription)
- named (global subscription)
- named and targeted to a specific published event

#### Anonymous
```
state.subscribe(function(err,state) {
  console.log(state)
})
```

#### Named
```
state.subscribe("my_subscription",function(err,state) {
  console.log(state)
})

```

#### Named and targetted
```
state.subscribe("sub.k",function(err,k,state) {
  console.log(k,state)
})

```

