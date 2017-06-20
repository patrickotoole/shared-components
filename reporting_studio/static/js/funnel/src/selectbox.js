import React from 'react'

const SelectBox = ({items,selected,onChange}) => {

  if (!items) return (null)

  const renderedItems = items.map((item) => {
    return (<option selected={selected == item}>{item}</option>)
  })

  return (
    <select onChange={onChange}>{renderedItems}</select>
  )
}

export default SelectBox;
