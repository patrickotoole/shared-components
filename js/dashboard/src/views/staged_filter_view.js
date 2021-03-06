import {d3_updateable, d3_splat} from '@rockerbox/helpers'
import accessor from '../helpers'
import header from '../generic/header'
import select from '../generic/select'


import * as table from '@rockerbox/table'

function d3_class(target,cls,type) {
  return d3_updateable(target,"." + cls, type || "div")
    .classed(cls,true)
}

export default function staged_filter(target) {
  return new StagedFilter(target)
}

class StagedFilter {
  constructor(target) {
    this._target = target
    this._on = {}
  }

  data(val) { return accessor.bind(this)("data",val) } 

  on(action, fn) {
    if (fn === undefined) return this._on[action] || noop;
    this._on[action] = fn;
    return this
  }


  draw() {
    var owrap = d3_class(this._target,"footer-wrap")
      .style("padding-top","5px")
      .style("min-height","60px")
      .style("bottom","0px")
      .style("position","fixed")
      .style("width","1000px")
      .style("background","#F0F4F7")

    var wrap = d3_class(owrap,"inner-wrap")
      .style("border-top","1px solid #ccc")
      .style("padding-top","5px")

    d3_class(wrap,"header-label")
      .style("line-height","35px")
      .style("text-transform","uppercase")
      .style("font-weight","bold")
      .style("display","inline-block")
      .style("font-size","14px")
      .style("color","#888888")
      .style("width","200px")
      .style("vertical-align","top")
      .text("Build Filters")

    d3_class(wrap,"text-label")
      .style("line-height","35px")
      .style("text-transform","uppercase")
      .style("font-weight","bold")
      .style("display","inline-block")
      .style("font-size","12px")
      .style("width","60px")
      .style("vertical-align","top")
      .style("display","none")
      .text("Title")

    var select_box = select(wrap)
      .options([
          {"key":"contains","value":"contains"}
        , {"key":"does not contain","value":"does not contain"}
      ])
      .draw()
      ._select
      .style("height","36px")
      .style("vertical-align","top")




    var footer_row = d3_class(wrap,"footer-row")
      .style("display","inline-block")


    var select_value = this.data()

    function buildFilterInput() {

      footer_row.selectAll(".selectize-control")
        .each(function(x) {
          var destroy = d3.select(this).on("destroy")
          if (destroy) destroy()
        })


      var select = d3_updateable(footer_row,"input","input")
        .style("margin-left","10px")
        .style("min-width","200px")
        .attr("value",select_value)
        .property("value",select_value)

      


      var s = $(select.node()).selectize({
        persist: false,
        create: function(x){
          select_value = (select_value.length ? select_value + "," : "") + x
          self.on("update")(select_value)
          return {
            value: x, text: x
          }
        },
        onDelete: function(x){
          select_value = select_value.split(",").filter(function(z) { return z != x[0]}).join(",")
          self.on("update")(select_value)
          return {
            value: x, text: x
          }
        }
      })

      footer_row.selectAll(".selectize-control")
        .on("destroy",function() {
          s[0].selectize.destroy()
        })

    }

    buildFilterInput()

    var self = this
    d3_class(wrap,"include-submit","button")
      .style("float","right")
      .style("min-width","120px")
      .style("border-radius","5px")
      .style("line-height","29px")
      .style("background","#f9f9fb")
      .style("border","1px solid #ccc")
      .style("border-radius","5px")
      .style("vertical-align","top")
      .attr("type","submit")
      .text("Modify Filters")
      .on("click",function() {
        var value = footer_row.selectAll("input").property("value")
        var op =  select_box.node().selectedOptions[0].__data__.key + ".selectize"
        
        self.on("modify")({"field":"Title","op":op,"value":value})
      })

    d3_class(wrap,"exclude-submit","button")
      .style("float","right")
      .style("min-width","120px")
      .style("border-radius","5px")
      .style("line-height","29px")
      .style("background","#f9f9fb")
      .style("border","1px solid #ccc")
      .style("border-radius","5px")
      .style("vertical-align","top")
      .attr("type","submit")
      .text("New Filter")
      .on("click",function() {
        var value = footer_row.selectAll("input").property("value")
        var op =  select_box.node().selectedOptions[0].__data__.key + ".selectize"

        self.on("add")({"field":"Title","op":op,"value":value})
      })


  }
}
