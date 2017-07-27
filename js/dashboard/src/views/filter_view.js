import {d3_updateable, d3_splat} from '@rockerbox/helpers'
import accessor from '../helpers'
import header from '../generic/header'
import select from '../generic/select'


import * as table from '@rockerbox/table'
import {filter} from '@rockerbox/filter'

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }

export function FilterView(target) {
  this._on = {
    select: noop
  }

  this.target = target
  this._filter_options = {
      "Category": "parent_category_name"
    , "Title": "url"
    , "Time": "hour"
  }
}

export default function filter_view(target) {
  return new FilterView(target)
}

FilterView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , logic: function(val) {
      return accessor.bind(this)("logic",val) 
    }
  , categories: function(val) {
      return accessor.bind(this)("categories",val) 
    }
  , filters: function(val) {
      return accessor.bind(this)("filters",val) 
    }
  , draw: function() {
      
      var wrapper = d3_updateable(this.target,".filter-wrap","div",false,function(){ return 1})
        .classed("filter-wrap",true)

      //header(wrapper)
      //  .text("Filter")
      //  .draw()

      var subtitle = d3_updateable(wrapper, ".subtitle-filter","div")
        .classed("subtitle-filter",true)
        .style("padding-left","10px")
        .style("text-transform"," uppercase")
        .style("font-weight"," bold")
        .style("line-height"," 33px")
        .style("background","rgb(240, 244, 247)")
        .style("margin-bottom","10px")
    
      d3_updateable(subtitle,"span.first","span")
        .text("Filter users matching " )
        .classed("first",true)
    
      var filter_type  = d3_updateable(subtitle,"span.middle","span")
        .classed("middle",true)
    
      select(filter_type)
        .options(this.logic())
        .on("select", function(x) {
          this.logic().map(function(y) { 
            y.selected = (y.key == x.key)
          })
          this.on("logic.change")(this.logic())
        }.bind(this))
        .draw()
      
      d3_updateable(subtitle,"span.last","span")
        .text(" of the following:")
        .classed("last",true)


      // -------- CATEGORIES --------- //

      var categories = this.categories()
      var filter_change = this.on("filter.change").bind(this)

      function selectizeInput(filter,value) {
        var self = this;
        
        var select = d3_updateable(filter,"input","input")
          .style("width","200px")
          .property("value",value.value)

        filter.selectAll(".selectize-control")
          .each(function(x) {
            var destroy = d3.select(this).on("destroy")
            if (destroy) destroy()
          })


        var s = $(select.node()).selectize({
          persist: false,
          create: function(x){
            value.value = (value.value ? value.value + "," : "") + x
            self.on("update")(self.data())
            return {
              value: x, text: x
            }
          },
          onDelete: function(x){
            value.value = value.value.split(",").filter(function(z) { return z != x[0]}).join(",")
            self.on("update")(self.data())
            return {
              value: x, text: x
            }
          }
        })

        filter.selectAll(".selectize-control")
          .on("destroy",function() {
            s[0].selectize.destroy()
          })

      }

      function selectizeSelect(filter,value) {
        var self = this;

        filter.selectAll(".selectize-control").remove()

        filter.selectAll(".selectize-control")
          .each(function(x) {
            var destroy = d3.select(this).on("destroy")
            if (destroy) destroy()
          })



    
        var select = d3_updateable(filter,"select.value","select")
          .classed("value",true)
          .style("margin-bottom","10px")
          .style("padding-left","10px")
          .style("min-width","200px")
          .style("max-width","500px")
          .attr("multiple",true)
          .on("change", function(x){
            value.value = this.value
            self.on("update")(self.data())
          })
    
        d3_splat(select,"option","option",categories,function(x) { return x.key })
          .attr("selected",function(x) { return value.value && value.value.indexOf(x.key) > -1 ? "selected" : undefined })
          .text(function(x) { return x.key })

        var s = $(select.node()).selectize({
          persist: false,
          onChange: function(x) {
            value.value = x.join(",")
            self.on("update")(self.data())
          }
        })

        filter.selectAll(".selectize-control")
          .on("destroy",function() {
            s[0].selectize.destroy()
          })



    
      }
    
      this._logic_filter = filter(wrapper)
        .fields(Object.keys(this._filter_options))
        .ops([
            [{"key": "is in.category"},{"key": "is not in.category"}]
          , [{"key": "contains.selectize"}, {"key":"does not contain.selectize"}]
          , [{"key": "equals"}, {"key":"between","input":2}]
        ])
        .data(this.filters())
        .render_op("contains.selectize",selectizeInput)
        .render_op("does not contain.selectize",selectizeInput)
        .render_op("is in.category",selectizeSelect)
        .render_op("is not in.category",selectizeSelect)
        .render_op("between",function(filter,value) {
          var self = this
    
          value.value = typeof(value.value) == "object" ? value.value : [0,24]
    
          d3_updateable(filter,"input.value.low","input")
            .classed("value low",true)
            .style("margin-bottom","10px")
            .style("padding-left","10px")
            .style("width","90px")
            .attr("value", value.value[0])
            .on("keyup", function(x){
              var t = this
            
              self.typewatch(function() {
                value.value[0] = t.value
                self.on("update")(self.data())
              },1000)
            })
    
          d3_updateable(filter,"span.value-and","span")
            .classed("value-and",true)
            .text(" and ")
    
          d3_updateable(filter,"input.value.high","input")
            .classed("value high",true)
            .style("margin-bottom","10px")
            .style("padding-left","10px")
            .style("width","90px")
            .attr("value", value.value[1])
            .on("keyup", function(x){
              var t = this
            
              self.typewatch(function() {
                value.value[1] = t.value
                self.on("update")(self.data())
              },1000)
            })
        })
        .on("update",function(filters){
          filter_change(filters)
        })
        .draw()

      //d3_updateable(this.target,".filter-wrap-spacer","div")
      //  .classed("filter-wrap-spacer",true)
      //  .style("height",wrapper.style("height"))

      //wrapper
      //  .style("width",this.target.style("width"))
      //  .style("position","fixed")
      //  .style("z-index","300")
      //  .style("background","#f0f4f7")

      return this
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}

