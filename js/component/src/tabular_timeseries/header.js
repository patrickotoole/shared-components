import {d3_class, d3_splat, d3_updateable, D3ComponentBase} from 'helpers'

export default class TabularHeader extends D3ComponentBase {
  constructor(target) {
    super()
    this._target = target
    this.WIDTH = 144
    this._label = "URL"
    this._headers = ["12am", "12pm", "12am"]
    this._xs = [0,this.WIDTH/2,this.WIDTH]
    this._anchors = ["start","middle","end"]
  }

  props() { return ["label","headers"] }

  draw() {

    var euh = d3_class(this._target,"expansion-urls-title")

    d3_class(euh,"title").text(this.label())
    d3_class(euh,"view").text("Views")

    var svg_legend = d3_class(euh,"legend","svg")

    if (this.headers().length == 2) {
      this._xs = [this.WIDTH/2-this.WIDTH/4,this.WIDTH/2+this.WIDTH/4]
      this._anchors = ["middle","middle"]
    }

    d3_splat(svg_legend,"text","text",this.headers(),(x,i) => { return i })
      .attr("y","20")
      .attr("x",(x,i) => this._xs[i])
      .style("text-anchor",(x,i) => this._anchors[i])
      .text(String)

    d3_splat(svg_legend,"line","line",this.headers(),(x,i) => { return i })
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", this.headers().length == 2 ? 0 : 25)
      .attr("y2", 35)
      .attr("x1",(x,i) => this.headers().length == 2 ? this.WIDTH/2 : this._xs[i])
      .attr("x2",(x,i) => this.headers().length == 2 ? this.WIDTH/2 : this._xs[i])

  }
}
