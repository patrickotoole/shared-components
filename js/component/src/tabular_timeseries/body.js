import {d3_class, d3_splat, d3_updateable, D3ComponentBase} from 'helpers'
import {simpleTimeseries} from 'chart'

export default class TabularBody extends D3ComponentBase {
  constructor(target) {
    super()
    this._target = target
  }

  props() { return ["data","split"] }

  draw() {
    const self = this

    let expansion_row = this._target

    var expansion = d3_class(expansion_row,"expansion-urls")
        .classed("scrollbox",true)

    expansion.html("")

    var sorted = this.data().sort((p,c) => c.total - p.total).slice(0,500)

    var url_row = d3_splat(expansion,".url-row","div",sorted,function(x) { return x.key })
      .classed("url-row",true)

    var url_name = d3_updateable(url_row,".name","div").classed("name",true)

    d3_updateable(url_name,"input","input")
      .attr("type","checkbox")
      .on("click", self.on("stage-filter"))

    d3_class(url_name,"url","a")
      .text(x => { return this.split() ? x.key.split(this.split())[1] || x.key : x.key })
      .attr("href", x => x.url ? x.url : undefined )
      .attr("target", "_blank")

    d3_updateable(url_row,".number","div").classed("number",true)
      .text(function(x) { return x.total })


    d3_updateable(url_row,".plot","svg").classed("plot",true)
      .each(function(x) {
        var dthis = d3.select(this)
        var values = x.values || x.value
        simpleTimeseries(dthis,values,144,20)
      })

  }
}
