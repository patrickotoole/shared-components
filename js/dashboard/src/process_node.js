import { updateFilter } from './events/filter_events'

class MockState {
  constructor() {
    this.internal = {}
    return this
  }

  setStatic(k, v) {
    this.internal[k] = v
    return this
  }

  publishStatic(k, v) {
    this.internal[k] = v
    return this
  }
  
}

export default function runSegment(filters,data) {
  const s = new MockState()
  const run = updateFilter(s)

  run(false, filters, data)

  const processed = s.internal

  return processed
}
