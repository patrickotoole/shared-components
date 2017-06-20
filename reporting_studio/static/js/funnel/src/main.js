import state from 'state'
import React from 'react'
import ReactDOM from 'react-dom'
import App from './app'
import drawFlame from './funnel'

if (window) window.state = state;

let root 

document.addEventListener('DOMContentLoaded', function() {
  root = document.querySelector('main')
  ReactDOM.render(
    <div>
      <App />
    </div>,
    root
  );
});


state.subscribe((err,_state) => {
  root = document.querySelector('main')
  ReactDOM.render(
    <div>
      <App />
    </div>,
    root
  );

  drawFlame(
    data,
    _state.successOption,
    _state.displayOption,
    _state.comparisonValue,
    _state.comparisonType,
    _state.colors.slice(0)
  )
})
