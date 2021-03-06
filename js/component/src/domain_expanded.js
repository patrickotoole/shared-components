import {d3_class, d3_splat, d3_updateable, accessor, D3ComponentBase} from 'helpers'
import d3 from 'd3'
import './domain_expanded.css'

import {tabular_timeseries} from './tabular_timeseries/index'

export let allbuckets = []
export const hourbuckets = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x)

var minutes = [0,20,40]
export const buckets = d3.range(0,24).reduce((p,c) => {
  minutes.map(x => {
    p[c + ":" + x] = 0
  })
  allbuckets = allbuckets.concat(minutes.map(z => c + ":" + z))
  return p
},{})


export const STOPWORDS = ["that","this","what","best","most","from","your","have","first","will","than","says","like","into","after","with"]

function rawToUrl(data) {
  return data.reduce((p,c) => {
      p[c.url] = p[c.url] || Object.assign({},buckets)
      p[c.url][c.hour] = (p[c.url][c.hour] || 0) + c.count
      return p
    },{})
}

function rawToDomain(data) {
  return data.reduce((p,c) => {
      p[c.domain] = p[c.domain] || Object.assign({},buckets)
      p[c.domain][c.hour] = (p[c.domain][c.hour] || 0) + c.count
      return p
    },{})
}

function domainToDraw(urls) {

  var obj = {}
  Object.keys(urls).map(k => {
    obj[k] = hourbuckets.map(b => urls[k][b] || 0)
  })

  return d3.entries(obj)
    .map(function(x){
      x.url = "http://" + x.key
      x.total = d3.sum(x.value)
      return x
    }) 
}

function urlToDraw(urls) {
  var obj = {}
  Object.keys(urls).map(k => {
    obj[k] = hourbuckets.map(b => urls[k][b] || 0)
  })

  return d3.entries(obj)
    .map(function(x){
      x.url = x.key
      x.total = d3.sum(x.value)
      return x
    }) 
}

function drawToKeyword(draw,split) {
  let obj = draw
    .reduce(function(p,c){
      var sd = c.key.toLowerCase().split("://")
      var stripped = sd.length > 1 ? sd[1] : sd[0]
      var splitted = stripped.split(split)
      var key = splitted.length > 1 ? splitted[1] : splitted[0]

     
      key.split("/").reverse()[0].replace("_","-").replace("+","-").split("-").map(x => {
        var values = STOPWORDS
        if (x.match(/\d+/g) == null && values.indexOf(x) == -1 && x.indexOf(",") == -1 && x.indexOf("?") == -1 && x.indexOf(".") == -1 && x.indexOf(":") == -1 && parseInt(x) != x && x.length > 3) {
          p[x] = p[x] || {}
          Object.keys(c.value).map(q => { p[x][q] = (p[x][q] || 0) + (c.value[q] || 0) })
        }
      })

      return p
    },{}) 

  return d3.entries(obj)
    .map(x => {
      x.values = Object.keys(x.value).map(z => x.value[z] || 0)
      x.total = d3.sum(x.values)
      return x
    })

}

export function domain_expanded(target) {
  return new DomainExpanded(target)
}

class DomainExpanded extends D3ComponentBase {
  constructor(target) {
    super()
    this._target = target
  }

  props() { return ["raw","data","urls","domain", "use_domain"] }

  draw() {
    let td = this._target

    d3_class(td,"action-header")
      .text("Explore and Refine")

    let urlData = rawToUrl(this.raw())
    let domainData = rawToDomain(this.raw())

    let domain_to_draw = domainToDraw(domainData)
    let to_draw = urlToDraw(urlData)
    let kw_to_draw = drawToKeyword(to_draw,this.domain())

    tabular_timeseries(d3_class(td,"url-depth"))
      .label(this.use_domain() ? "Domain" : "URL")
      .data(this.use_domain() ? domain_to_draw : to_draw)
      .split(this.domain())
      .on("stage-filter",this.on("stage-filter"))
      .draw()

    tabular_timeseries(d3_class(td,"kw-depth"))
      .label("Keywords")
      .data(kw_to_draw)
      .on("stage-filter",this.on("stage-filter"))
      .draw()
        
  }
}
