import React from 'react'
import Selector from './selector'
import state from 'state'

class App extends React.Component {
  render() {
    return (<div>
      <Selector options={state.state().options} />
    </div>)
  }
}
export default App;

