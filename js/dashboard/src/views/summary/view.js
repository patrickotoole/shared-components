import {table} from '@rockerbox/table'
import {d3_class, d3_updateable, d3_splat, D3ComponentBase} from '@rockerbox/helpers'

import {drawCategory, drawCategoryDiff} from './category'
import {drawStream, drawBeforeAndAfter} from './before_and_after'
import {buildSummaryBlock} from './sample_vs_pop'
import {drawTimeseries} from './timing'
import {drawKeywords, drawKeywordDiff} from './keywords'

import header from '../../generic/header'
import select from '../../generic/select'

import './summary.css'

export default function summary_view(target) {
  return new SummaryView(target)
}

export class SummaryView extends D3ComponentBase {
  constructor(target) {
    super(target)
  }

  props() { return ["data", "timing", "category", "keywords", "before", "after"] }

  draw() {
    var wrap = d3_class(this._target,"summary-view")

    header(wrap)
      .text("Summary")
      .draw()

    var tswrap = d3_class(wrap,"ts-row")
      , piewrap = d3_class(wrap,"pie-row")
      , catwrap = d3_class(wrap,"cat-row").classed("dash-row",true)
      , keywrap = d3_class(wrap,"key-row")
      , bawrap = d3_class(wrap,"ba-row") 
      , streamwrap = d3_class(wrap,"stream-ba-row") 


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

    //var inner = drawBeforeAndAfter(bawrap,this._before)

    //select(inner)
    //  .options([
    //      {"key":"Importance","value":"percent_diff"}
    //    , {"key":"Activity","value":"score"}
    //    , {"key":"Population","value":"pop"}
    //  ])
    //  .selected(this._before.sortby || "")
    //  .on("select", this.on("ba.sort"))
    //  .draw()


    //drawStream(streamwrap,this._before.before_categories,this._before.after_categories)


    return this
  }
}               
