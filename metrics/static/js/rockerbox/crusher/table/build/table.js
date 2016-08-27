(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
  typeof define === 'function' && define.amd ? define('table', ['exports', 'd3'], factory) :
  factory((global.table = {}),global.d3);
}(this, function (exports,d3) { 'use strict';

  d3 = 'default' in d3 ? d3['default'] : d3;

  function accessor(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  function d3_updateable(target,selector,type,data,joiner) {
    var type = type || "div"
    var updateable = target.selectAll(selector).data(
      function(x){return data ? [data] : [x]},
      joiner || function(x){return [x]}
    )

    updateable.enter()
      .append(type)

    return updateable
  }

  function d3_splat(target,selector,type,data,joiner) {
    var type = type || "div"
    var updateable = target.selectAll(selector).data(
      data || function(x){return x},
      joiner || function(x){return x}
    )

    updateable.enter()
      .append(type)

    return updateable
  }

  function Table(target) {
    this._target = target;
    this._data = {}//EXAMPLE_DATA
    this._render_header = function(wrap) {

      wrap.each(function(data) {
        var headers = d3_updateable(d3.select(this),".headers","div")
          .classed("headers",true)
          .style("text-transform","uppercase")
          .style("font-weight","bold")
          .style("line-height","24px")
          .style("border-bottom","1px solid #ccc")
          .style("margin-bottom","10px")

        headers.html("")


        d3_updateable(headers,".url","div")
          .classed("url",true)
          .style("width","75%")
          .style("display","inline-block")
          .text("Article")

        d3_updateable(headers,".count","div")
          .classed("count",true)
          .style("width","25%")
          .style("display","inline-block")
          .text("Count")


      })

    }
    this._render_row = function(row) {

        d3_updateable(row,".url","div")
          .classed("url",true)
          .style("width","75%")
          .style("line-height","24px")
          .style("height","24px")
          .style("overflow","hidden")
          .style("display","inline-block")
          .text(function(x) {return x.key})

        d3_updateable(row,".count","div")
          .classed("count",true)
          .style("width","25%")
          .style("display","inline-block")
          .style("vertical-align","top")
          .text(function(x){return x.value})

    }
  }

  function table(target) {
    return new Table(target)
  }

  Table.prototype = {

      data: function(val) { 
        var value = accessor.bind(this)("data",val) 
        if (val && val.values.length && this._headers == undefined) { 
          var headers = Object.keys(val.values[0]).map(function(x) { return {key:x,value:x} })
          this.headers(headers)
        }
        return value
      }
    , title: function(val) { return accessor.bind(this)("title",val) }
    , row: function(val) { return accessor.bind(this)("render_row",val) }
    , header: function(val) { return accessor.bind(this)("render_header",val) }
    , headers: function(val) { return accessor.bind(this)("headers",val) }
    , all_headers: function() {
        var headers = this.headers().reduce(function(p,c) { p[c.key] = c.value; return p},{});
        if (this._data.values) 
          return Object.keys(this._data.values[0]).map(function(x) { 
            return {key:x,value:headers[x] || x, selected: !!headers[x]} 
          })
        else return this.headers()
      }

    , render_wrapper: function() {
        var wrap = this._target

        var wrapper = d3_updateable(wrap,".table-wrapper","div")
          .classed("table-wrapper",true)
          .style("position","relative")


        var table = d3_updateable(wrapper,"table.main","table")
          .classed("main",true)
          .style("width","100%")

        this._table_main = table

        var thead = d3_updateable(table,"thead","thead")
        d3_updateable(table,"tbody","tbody")


        var table_fixed = d3_updateable(wrapper,"table.fixed","table")
          .classed("hidden", true) // TODO: make this visible when main is not in view
          .classed("fixed",true)
          .style("width","100%")
          .style("top","0px")
          .style("position","absolute")

        this._table_fixed = table_fixed


        var thead = d3_updateable(table_fixed,"thead","thead")

        var table_button = d3_updateable(wrapper,".table-option","div")
          .classed("table-option",true)
          .style("position","absolute")
          .style("top","-1px")
          .style("right","0px")
          .style("cursor","pointer")
          .text("+ OPTIONS")
          .on("click",function(x) {
            this._options_header.classed("hidden",!this._options_header.classed("hidden"))
          }.bind(this))

        return wrapper
      }  
    , render_header: function(table) {

        var thead = table.selectAll("thead")
        if (this.headers() == undefined) return

        var headers_thead = d3_updateable(thead,"tr","tr",this.headers(),function(x){ return 1})

        var th = d3_splat(headers_thead,"th","th",false,function(x) {return x.key})
          .text(function(x) { return x.value })

        th.exit().remove()

        var options_thead = d3_updateable(thead,"tr.table-options","tr",this.all_headers())
          .classed("hidden", function() { return this.classList.length == 0})
          .classed("table-options",true)

        var options = d3_updateable(options_thead,"th","th")
          .attr("colspan",this.headers().length)
          
        var option = d3_splat(options,".option","div",false,function(x) { return x.key })
          .classed("option",true)
          .style("width","240px")
          .style("float","right")

        var self = this

        d3_updateable(option,"input","input")
          .attr("type","checkbox")
          .attr("checked",function(x) { return x.selected ? "checked" : undefined })
          .on("click", function(x) {
            x.selected = this.checked
            if (x.selected) {
              self.headers().push(x)
              self.headers()
              return self.draw()
            }
            var index = self.headers().indexOf(x)
            self.headers().splice(index,1)
            self.draw()

          })

        d3_updateable(option,"span","span")
          .text(function(x) { return " " + x.value })


       this._options_header = this._target.selectAll(".table-options")
      }
    , render_rows: function(table) {

        var tbody = table.selectAll("tbody")
        if (this.headers() == undefined) return

        var rows = d3_splat(tbody,"tr","tr",this._data.values,function(x){ return JSON.stringify(x) })

        var th = d3_splat(rows,"td","td",this.headers(),function(x) {return x.key})
          .text(function(x) { 
            var pd = this.parentNode.__data__
            return pd[x.key]
          })

        th.exit().remove()

      }
    , draw: function() {
        var self = this
        var wrapper = this.render_wrapper()

        wrapper.selectAll("table")
          .each(function(x) { 
            self.render_header(d3.select(this)) 
          })

        this.render_rows(this._table_main)


        //d3.select("body").on("scroll", function(){
        //  self._table_main
        //})

        return this

        var wrap = this._target

        var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
          .classed("vendor-domains-bar-desc",true)
          .style("display","inherit")
          .style("padding-left","10px")
          .datum(this._data)

        var wrapper = d3_updateable(desc,".w","div")
          .classed("w",true)
          
        var self = this

        wrapper.each(function(row) {

          var wrap = d3.select(this)

          //d3_updateable(wrap, "h3","h3")
          //  .text(function(x){return x.key})
          //  .style("margin-bottom","15px")

          self._render_header(wrap)
          var row = d3_splat(wrap,".row","div",function(x) {return x.values}, function(x) {return x.key})
            .classed("row",true)
            .style("line-height","24px")
            .each(function() {
              self._render_row(d3.select(this))
            })

          row.exit().remove()

          row.sort(function(p,c) {return c.value - p.value})

        })
      }
    , d3: d3
  }

  var version = "0.0.1";

  exports.version = version;
  exports.table = table;

}));