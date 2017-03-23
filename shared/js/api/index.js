import * as a from './src/action.js';

export let action = a;
export let dashboard = {
    getAll: function(cb) {
      d3.json("/crusher/saved_dashboard",function(value) {
        cb(false,value.response)
      })
    }
}
