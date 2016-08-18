import filter from 'filter'
import state from './state'

export default function render_filter(_top,_lower) {
  var self = this
    , data = self._data;

  var subtitle = d3_updateable(_top, ".subtitle-filter","div")
    .classed("subtitle-filter",true)
    .attr("style","padding-left:10px; text-transform: uppercase; font-weight: bold; line-height: 24px; margin-bottom: 10px;")

  d3_updateable(subtitle,"span.first","span")
    .text("Users matching " )
    .classed("first",true)

  var filter_type  = d3_updateable(subtitle,"span.middle","span")
    .classed("middle",true)


  var select = d3_updateable(filter_type,"select","select")
    .style("font-size","10")
    .style("width","45px")
    .on("change",function() {
      var d = this.selectedOptions[0].__data__
      s.text(d + " ")
    })

  d3_splat(select,"option","option",["All","Any"])
    .text(String)
  


  d3_updateable(subtitle,"span.last","span")
    .text(" of the following:")
    .classed("last",true)

  var mapping = {
      "Category": "parent_category_name"
    , "Title": "url"
    , "Time": "hour"
  }

  var hours = d3.range(0,24).map(function(x) { return x < 10 ? "0" + String(x) : String(x) })
    , minutes = d3.range(0,40,20).map(String);


  var hourSelected = function() {}

  var filters = state().get("filter",[{}])

  //if (document.location.search.indexOf("filter") > -1) {
  //
  //  filters = document.location.search.split("filter=")[1]
  //  filters = JSON.parse(decodeURIComponent(filters.split("&")[0]))
  //  this._state.filters
  //}

  filter.filter(_top)
    .fields(Object.keys(mapping))
    .ops([
        [{"key": "equals"}]
      , [{"key":"contains"},{"key":"starts with"},{"key":"ends with"}]
      , [{"key":"equals"}, {"key":"between","input":2}]
    ])
    .data(filters)
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
            //value.fn = self.buildOp(value)
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
            //value.fn = self.buildOp(value)
            self.on("update")(self.data())
          },1000)
        })


    })
    .on("update",function(x){

      state()
        .set("filter",x)


      var y = x.map(function(z) {
        return { 
            "field": mapping[z.field]
          , "op": z.op
          , "value": z.value
        }
      })

      if (y.length > 0 && y[0].value) {
        
        var data = {
            "full_urls": filter.filter_data(self._data.full_urls).logic("and").by(y)
          , "url_only": filter.filter_data(self._data.url_only).logic("and").by(y)
        }

        var categories = d3.nest()
          .key(function(x){ return x.parent_category_name})
          .rollup(function(v) {
            return v.reduce(function(p,c) { return p + c.uniques },0)
          })
          .entries(data.url_only)

        var total = categories.reduce(function(p,c) { return p + c.values },0)

        categories.map(function(x) {
          x.value = x.values
          x.percent = x.value / total
        })

        data["display_categories"] = {
            "key":"Categories"
          , "values": categories.filter(function(x) { return x.key != "NA" })
        }

        self._data.display_categories = data.display_categories

        self.render_right(data)
        self.render_view(_lower,data)
      } else {
        self.render_right(data)
        self.render_view(_lower,self._data)
      }
    })
    .draw()
    ._target.selectAll(".filters-wrapper").style("padding-left","10px")
}
