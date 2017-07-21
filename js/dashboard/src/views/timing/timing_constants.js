import {formatHour} from '../../helpers/data_helpers/timing'
import d3 from 'd3';

export const hourbuckets = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x)

export const timingHeaders = hourbuckets.map(formatHour).map(x => { return {key: x, value: x} })
