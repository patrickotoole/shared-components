import {d3_class, d3_updateable, d3_splat, D3ComponentBase} from '@rockerbox/helpers'
import header from '../generic/header'
import {prepData} from '../generic/timeseries'
import data_selector from '../generic/data_selector'


import table from '@rockerbox/table'
import {domain_expanded} from '@rockerbox/component'
import {domain_bullet} from '@rockerbox/chart'


export class DomainView extends D3ComponentBase {
  constructor(target) {
    super(target)
  }

  props() { return ["data", "options", "sort", "ascending", "top"] }

  draw() {

    var self = this

    var _explore = this._target
      , tabs = this.options()
      , data = this.data()
      , filtered = tabs.filter(function(x){ return x.selected})
      , selected = filtered.length ? filtered[0] : tabs[0]

    const headers = [
          {key:"key",value: selected.key.replace("Top ",""),locked:true,width:"200px"}
        , {key:"sample_percent",value:"Segment",selected:false}
        , {key:"real_pop_percent",value:"Baseline",selected:false}
        , {key:"ratio",value:"Ratio",selected:false}
        , {key:"importance",value:"Importance",selected:false}
        , {key:"value",value:"Segment versus Baseline",locked:true}
        , {key:"count",value:"Count",selected:false}

      ]//.filter((x) => !!selected.values[0][x.key])

    const samp_max = d3.max(selected.values,function(x){return x.sample_percent_norm})
      , pop_max = d3.max(selected.values,function(x){return x.pop_percent})
      , max = Math.max(samp_max,pop_max);


    const _default = "importance"
    const s = this.sort() 
    const asc = this.ascending() 


    const selectedHeader = headers.filter(x => x.key == s)
    const sortby = selectedHeader.length ? selectedHeader[0].key : _default



    //header(_explore)
    //  .text("Overall")
    //  .draw()

    data_selector(_explore)
      .datasets(tabs)
      .skip_values(true)
      .on("dataset.change", x => { this.on("select")(x) })
      .draw()


    _explore.selectAll(".vendor-domains-bar-desc").remove()
    _explore.datum(data)

    var legend = d3_class(_explore,"legend")
      .style("display","inline-block")
      .style("margin-left","358px")

    d3_class(legend,"legend-label","span")
      .style("text-transform","uppercase")
      .style("font-weight","bold")
      .style("line-height","30px")
      .style("vertical-align","top")
      .style("margin-right","10px")
      .text("Key")


    var graphic = d3_class(legend,"graphic")
      .style("width","300px")
      .style("display","inline-block")


    domain_bullet(graphic)
      .max(max)
      .data({"pop_percent":max/3*2,"sample_percent_norm":max})
      .draw()

    var svg = graphic.selectAll("svg")
      .attr("width",400)
      .attr("height",68)

    d3_updateable(svg,"line.segment","line")
      .classed("segment",true)
      .attr("stroke-width",1)
      .attr("stroke-dasharray","1 3")
      .attr("stroke","#333")
      .attr("y2",14)
      .attr("y1",14)
      .attr("x2",250)
      .attr("x1",265)



    d3_updateable(svg,"text.segment","text")
      .classed("segment",true)
      .attr("y",18)
      .attr("x",270)
      .style("text-anchor","start")

      .style("font-weight","bold")
      .text("Users in segment")

    d3_updateable(svg,"line.population","line")
      .classed("population",true)
      .attr("stroke-width",1)
      .attr("stroke-dasharray","1 3")
      .attr("stroke","#333")
      .attr("y2",48)
      .attr("y1",27)
      .attr("x2",140)
      .attr("x1",140)


    d3_updateable(svg,"text.population","text")
      .classed("population",true)
      .style("text-anchor","start")
      .style("font-weight","bold")
      .attr("y",53)
      .attr("x",150)
      .text("Users in population")




    
    var selectedKey = selected.key == "Top Domains" ? "domain" : "parent_category_name"
    

    var t = table(_explore)
      .top(this.top())
      .data(selected)
      .headers( headers)
      .sort(sortby,asc)
      .on("sort", this.on("sort"))
      .option_text("&#65291;")
      .on("expand",function(d,td) {

        var dd = this.parentElement.__data__.full_urls.filter(function(x) { return x[selectedKey] == d.key})

        if (selectedKey == "domain") {

          var rolled = prepData(dd)
          domain_expanded(td)
            .domain(dd[0].domain)
            .raw(dd)
            .data(rolled)
            .urls(d.urls)
            .on("stage-filter", function(x) {
              self.on("stage-filter")(x)
            })
            .draw()

        }

        if (selectedKey == "parent_category_name") {
          var rolled = prepData(dd)
          domain_expanded(td)
            .domain("/")
            .use_domain(true)
            .raw(dd)
            .data(rolled)
            .on("stage-filter", self.on("stage-filter") )
            .draw()
        }

      })
      .hidden_fields(["urls","percent_unique","sample_percent_norm","pop_percent","tf_idf","parent_category_name"])
      .render("ratio",function(d) {
        this.innerText = Math.trunc(this.parentNode.__data__.ratio*100)/100 + "x"
      })
      .render("value",function(d) {


        domain_bullet(d3.select(this))
          .max(max)
          .data(this.parentNode.__data__)
          .draw()

      })
      
    t.draw()
    

    return this

  }

}

export default function domain_view(target) {
  return new DomainView(target)
}

