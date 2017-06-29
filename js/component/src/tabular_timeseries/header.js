import {d3_class, d3_splat, d3_updateable, D3ComponentBase} from 'helpers'

export default class TabularHeader extends D3ComponentBase {
  constructor(target) {
    super()
    this._target = target
    this._label = "URL"
  }

  props() { return ["label"] }

  draw() {
    let title_row = this._target

    var euh = d3_class(title_row,"expansion-urls-title")

    d3_class(euh,"title").text(this.label())
    d3_class(euh,"view").text("Views")

    var svg_legend = d3_class(euh,"legend","svg")

    d3_updateable(svg_legend,"text.one","text")
      .attr("class","one")
      .attr("x","0")
      .attr("y","20")
      .style("text-anchor","start")
      .text("12 am")

    d3_updateable(svg_legend,"text.two","text")
      .attr("class","two")
      .attr("x","72")
      .attr("y","20")
      .style("text-anchor","middle")
      .text("12 pm")

    d3_updateable(svg_legend,"text.three","text")
      .attr("class","three")
      .attr("x","144")
      .attr("y","20")
      .style("text-anchor","end")
      .text("12 am")

    d3_updateable(svg_legend,"line.one","line")
      .classed("one",true)
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 25)
      .attr("y2", 35)
      .attr("x1", 0)
      .attr("x2", 0)

    d3_updateable(svg_legend,"line.two","line")
      .classed("two",true)
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 25)
      .attr("y2", 35)
      .attr("x1", 72)
      .attr("x2", 72)

    d3_updateable(svg_legend,"line.three","line")
      .classed("three",true)
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 25)
      .attr("y2", 35)
      .attr("x1", 144)
      .attr("x2", 144)


  }
}
