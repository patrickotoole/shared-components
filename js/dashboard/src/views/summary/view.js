import {table} from 'table'
import {d3_class, d3_updateable, d3_splat, D3ComponentBase} from 'helpers'

import {drawCategory, drawCategoryDiff} from './category'
import {drawStream, drawBeforeAndAfter} from './before_and_after'
import {buildSummaryBlock} from './sample_vs_pop'
import {drawTimeseries} from './timing'
import {drawKeywords, drawKeywordDiff} from './keywords'

import header from '../../generic/header'
import select from '../../generic/select'



export class SummaryView extends D3ComponentBase {
  constructor(target) {
    super(target)
  }

  props() { return ["data", "timing", "category", "keywords", "before", "after"] }

  draw() {
    var wrap = d3_updateable(this._target,".summary-wrap","div")
      .classed("summary-view",true)

    header(wrap)
      .text("Summary")
      .draw()


    var tswrap = d3_updateable(wrap,".ts-row","div")
      .classed("ts-row",true)
      .style("padding-bottom","10px")

    var piewrap = d3_updateable(wrap,".pie-row","div")
      .classed("pie-row",true)
      .style("padding-bottom","10px")

    var catwrap = d3_updateable(wrap,".cat-row","div")
      .classed("cat-row dash-row",true)
      .style("padding-bottom","10px")

    var keywrap = d3_updateable(wrap,".key-row","div")
      .classed("key-row dash-row",true)
      .style("padding-bottom","10px")

    var bawrap = d3_updateable(wrap,".ba-row","div",false,function() { return 1})
      .classed("ba-row",true)
      .style("padding-bottom","10px")

    var streamwrap = d3_updateable(wrap,".stream-ba-row","div",false,function() { return 1})
      .classed("stream-ba-row",true)
      .style("padding-bottom","10px")


    var radius_scale = d3.scale.linear()
      .domain([this._data.domains.population,this._data.views.population])
      .range([20,35])



    table(piewrap)
      .data({"key":"T","values":[this.data()]})
      .skip_option(true)
      .render("domains",function(x) {
        var data = d3.select(this.parentNode).datum()[x.key];
        buildSummaryBlock(data,this,radius_scale,x)
      })
      .render("articles",function(x) {
        var data = d3.select(this.parentNode).datum()[x.key];
        buildSummaryBlock(data,this,radius_scale,x)
      })

      .render("sessions",function(x) {
        var data = d3.select(this.parentNode).datum()[x.key];
        buildSummaryBlock(data,this,radius_scale,x)
      })
      .render("views",function(x) {
        var data = d3.select(this.parentNode).datum()[x.key];
        buildSummaryBlock(data,this,radius_scale,x)
      })
      .draw()


    drawTimeseries(tswrap,this._timing,radius_scale)


    try {
    drawCategory(catwrap,this._category)
    drawCategoryDiff(catwrap,this._category)
    } catch(e) {}

    //drawKeywords(keywrap,this._keywords)
    //drawKeywordDiff(keywrap,this._keywords)

    var inner = drawBeforeAndAfter(bawrap,this._before)

    select(inner)
      .options([
          {"key":"Importance","value":"percent_diff"}
        , {"key":"Activity","value":"score"}
        , {"key":"Population","value":"pop"}
      ])
      .selected(this._before.sortby || "")
      .on("select", this.on("ba.sort"))
      .draw()


    drawStream(streamwrap,this._before.before_categories,this._before.after_categories)


    return this
  }
}               
