import React from 'react'
import state from 'state'
import SelectBox from './selectbox'

class Selector extends React.Component {
  render() {

    const newSuccess = (e) => {
      state.publish("successOption",e.target.value)
    }

    const newSize = (e) => {
      state.publish("displayOption",e.target.value)
    }

    const newValue = (e) => {
      state.publish("comparisonValue",e.target.value)
    }

    const compareType = (e) => {
      state.publish("comparisonType",e.target.checked ? "less than" : "greater than")
    }

    return (
    <div className="selector">
      <h3>Choose dimensions for size and evaluation </h3>
      <div>
        <span>Size</span>
        <SelectBox onChange={newSize} items={this.props.options} selected={state.state().displayOption}/>
      </div>
      <div>
        <span>Success</span>
        <SelectBox onChange={newSuccess} items={this.props.options} selected={state.state().successOption}/>
      </div>
      <div>
        <span>Compare</span>
        <input onChange={newValue} />
        <span>Less Than</span>
        <input onChange={compareType} type="checkbox" />
      </div>

    </div>)
  }
}

export default Selector
