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
    var CSS_STRING = String(function() {/*
  .table-wrapper { margin-bottom:40px }
  .table-wrapper tr { height:33px}
  .table-wrapper tr th { border-right:1px dotted #ccc } 
  .table-wrapper tr th:last-of-type { border-right:none } 

  .table-wrapper tr { border-bottom:1px solid #ddd }
  .table-wrapper tr th, .table-wrapper tr td { 
    padding-left:10px;
    max-width:200px
  }

  .table-wrapper thead tr { 
    background-color:#e3ebf0;
  }
  .table-wrapper thead tr th .title { 
    text-transform:uppercase
  }
  .table-wrapper tbody tr { 
  }
  .table-wrapper tbody tr:hover { 
    background-color:white;
    background-color:#f9f9fb
  }
    */})

    d3_updateable(d3.select("head"),"style#table-css","style")
      .attr("id","table-css")
      .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))

    this._target = target;
    this._data = {}//EXAMPLE_DATA
    this._sort = {}
    this._renderers = {}

    this._hidden_fields = []
    this._on = {}
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
    , skip_option: function(val) { return accessor.bind(this)("skip_option",val) }

    , title: function(val) { return accessor.bind(this)("title",val) }
    , row: function(val) { return accessor.bind(this)("render_row",val) }
    , header: function(val) { return accessor.bind(this)("render_header",val) }
    , headers: function(val) { return accessor.bind(this)("headers",val) }
    , hidden_fields: function(val) { return accessor.bind(this)("hidden_fields",val) }
    , all_headers: function() {
        var headers = this.headers().reduce(function(p,c) { p[c.key] = c.value; return p},{})
          , is_locked = this.headers().filter(function(x) { return !!x.locked }).map(function(x) { return x.key })

        if (this._data.values && this._data.values.length) {
          
          var all_heads = Object.keys(this._data.values[0]).map(function(x) { 
            if (this._hidden_fields && this._hidden_fields.indexOf(x) > -1) return false
            return {
                key:x
              , value:headers[x] || x
              , selected: !!headers[x]
              , locked: (is_locked.indexOf(x) > -1 ? true : undefined) 
            } 
          }.bind(this)).filter(function(x) { return x })
          var getIndex = function(k) {
            return is_locked.indexOf(k) > -1 ? is_locked.indexOf(k) + 10 : 0
          }

          all_heads = all_heads.sort(function(p,c) { return getIndex(c.key) - getIndex(p.key) })
          return all_heads
        }
        else return this.headers()
      }
    , sort: function(key,ascending) {
        if (!key) return this._sort
        this._sort = {
            key: key
          , value: !!ascending
        }
        return this
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
          .style("width",wrapper.style("width"))
          .style("top","0px")
          .style("position","fixed")

        d3.select(window).on('scroll', function() {
          if (table.node().getBoundingClientRect().top < 0) table_fixed.classed("hidden",false)
          else table_fixed.classed("hidden",true)

          var widths = []

          wrap.selectAll(".main")
            .selectAll(".table-headers")
            .selectAll("th")
            .each(function(x,i) {
              widths.push(this.offsetWidth)
            })

          wrap.selectAll(".fixed")
            .selectAll(".table-headers")
            .selectAll("th")
            .each(function(x,i) {
              d3.select(this).style("width",widths[i] + "px")
            })
          
        })
         

        this._table_fixed = table_fixed


        var thead = d3_updateable(table_fixed,"thead","thead")

        if (!this._skip_option)
        var table_button = d3_updateable(wrapper,".table-option","a")
          .classed("table-option",true)
          .style("position","absolute")
          .style("top","-1px")
          .style("right","0px")
          .style("cursor","pointer")
          .style("line-height","33px")
          .style("font-weight","bold")
          .style("padding-right","8px")
          .style("padding-left","8px")
          .text("OPTIONS")
          .style("background","#e3ebf0")
          .on("click",function(x) {
            this._options_header.classed("hidden",!this._options_header.classed("hidden"))
            this._show_options = !this._options_header.classed("hidden")
          }.bind(this))

        return wrapper
      }  
    , render_header: function(table) {

        var thead = table.selectAll("thead")
          , tbody = table.selectAll("tbody")

        if (this.headers() == undefined) return

        var options_thead = d3_updateable(thead,"tr.table-options","tr",this.all_headers(),function(x){ return 1})
          .classed("hidden", !this._show_options)
          .classed("table-options",true)

        var h = this._skip_option ? this.headers() : this.headers().concat([{key:"spacer", width:"70px"}])
        var headers_thead = d3_updateable(thead,"tr.table-headers","tr",h,function(x){ return 1})
          .classed("table-headers",true)


        var th = d3_splat(headers_thead,"th","th",false,function(x,i) {return x.key + i })
          .style("width",function(x) { return x.width })
          .style("position","relative")
          .order()


        d3_updateable(th,"span","span")
          .classed("title",true)
          .style("cursor","pointer")
          .text(function(x) { return x.value })
          .on("click",function(x) {
            if (x.sort === false) {
              delete x['sort']
              this._sort = {}
              this.draw()
            } else {
              x.sort = !x.sort

              this.sort(x.key,x.sort)
              this.draw()
            }
          }.bind(this))

        d3_updateable(th,"i","i")
          .style("padding-left","5px")
          .classed("fa",true)
          .classed("fa-sort-asc", function(x) { return (x.key == this._sort.key) ? this._sort.value === true : undefined }.bind(this))
          .classed("fa-sort-desc", function(x) { return (x.key == this._sort.key) ? this._sort.value === false : undefined }.bind(this))

        var self = this;
        var can_redraw = true

        var drag = d3.behavior.drag()
          .on("drag", function(d,i) {
              var x = d3.event.dx
              var w = parseInt(d3.select(this.parentNode).style("width").replace("px"))
              this.parentNode.__data__.width = (w+x)+"px"
              d3.select(this.parentNode).style("width", (w+x)+"px")

              var index = Array.prototype.slice.call(this.parentNode.parentNode.children,0).indexOf(this.parentNode) + 1
              d3.select(this.parentNode.parentNode.children[index]).style("width",undefined)

              if (can_redraw) {
                can_redraw = false
                setTimeout(function() {
                  can_redraw = true
                  tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").each(function(x) {
                    var render = self._renderers[x.key]
                    if (render) render.bind(this)(x)
      
                  })
                  

                },100)
              }
              
          });

        var draggable = d3_updateable(th,"b","b")
          .style("cursor", "ew-resize")
          .style("font-size", "100%")
          .style("height", "100%")
          .style("position", "absolute")
          .style("right", "-8px")
          .style("top", "0")
          .style("width", "10px")
          .style("z-index", 1)
          .on("mouseover",function(){
             var index = Array.prototype.slice.call(this.parentNode.parentNode.children,0).indexOf(this.parentNode) + 1
             tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").style("border-right","1px dotted #ccc")
          })
          .on("mouseout",function(){
             var index = Array.prototype.slice.call(this.parentNode.parentNode.children,0).indexOf(this.parentNode) + 1
             tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").style("border-right",undefined)
          })
          .call(drag)

        th.exit().remove()

        var options = d3_updateable(options_thead,"th","th",false,function() { return 1})
          .attr("colspan",this.headers().length+1)
          .style("padding-top","10px")
          .style("padding-bottom","10px")
                  
        var option = d3_splat(options,".option","div",false,function(x) { return x.key })
          .classed("option",true)
          .style("width","240px")
          .style("display","inline-block")


        option.exit().remove()

        var self = this

        d3_updateable(option,"input","input")
          .attr("type","checkbox")
          .property("checked",function(x) { 
            this.checked = x.selected
            return x.selected ? "checked" : undefined 
          })
          .attr("disabled",function(x) { return x.locked })
          .on("click", function(x) {
            x.selected = this.checked
            if (x.selected) {
              self.headers().push(x)
              return self.draw()
            }
            var indices = self.headers().map(function(z,i) { return z.key == x.key ? i : undefined  }) 
              , index = indices.filter(function(z) { return z }) || 0;

            self.headers().splice(index,1)
            self.draw()

          })

        d3_updateable(option,"span","span")
          .text(function(x) { return " " + x.value })


       this._options_header = this._target.selectAll(".table-options")
      }
    , render_rows: function(table) {

        var self = this;
        var tbody = table.selectAll("tbody")

        if (this.headers() == undefined) return
        if (!(this._data && this._data.values && this._data.values.length)) return

        var data = this._data.values
          , sortby = this._sort || {};

        data = data.sort(function(p,c) {
          var a = p[sortby.key]
            , b = c[sortby.key]

          return sortby.value ? d3.ascending(a,b) : d3.descending(a,b)
        })

        var rows = d3_splat(tbody,"tr","tr",data,function(x,i){ return String(sortby.key + x[sortby.key]) + i })
          .order()
          .on("click",function(x) {
            self.on("expand").bind(this)(x)
          })

        rows.exit().remove()

        var td = d3_splat(rows,"td","td",this.headers(),function(x,i) {return x.key + i })
          .each(function(x) {
            var dthis = d3.select(this)

            var renderer = self._renderers[x.key]
            if (!renderer) {
              if (x.key.indexOf("percent") > -1) return dthis.text(function(x) { 
                  var pd = this.parentNode.__data__
                  return d3.format(".2%")(pd[x.key]/100)
                })
             
              return dthis.text(function(x) { 
                var pd = this.parentNode.__data__
                return pd[x.key] > 0 ? d3.format(",.2f")(pd[x.key]).replace(".00","") : pd[x.key]
              })
            }

            return renderer.bind(this)(x)
          })

          

        td.exit().remove()

        var o = d3_updateable(rows,"td.option-header","td",false,function() { return 1})
          .classed("option-header",true)
          .style("width","70px")
          .style("text-align","center")
   
        if (this._skip_option) o.classed("hidden",true) 


        d3_updateable(o,"a","a")
          .style("font-weight","bold")
          .html(self.option_text())
          



      }
    , option_text: function(val) { return accessor.bind(this)("option_text",val) }
    , render: function(k,fn) {
        if (fn == undefined) return this._renderers[k] || false
        this._renderers[k] = fn
        return this
      }
    , draw: function() {
        var self = this
        var wrapper = this.render_wrapper()

        wrapper.selectAll("table")
          .each(function(x) { 
            self.render_header(d3.select(this)) 
          })

        this.render_rows(this._table_main)

        return this

      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }
    , d3: d3
  }

  var version = "0.0.1";

  exports.version = version;
  exports.table = table;

}));