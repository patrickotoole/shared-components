import filter from 'filter'

export default function render_filter(_top,_lower) {
  var self = this
    , data = self._data;

  var wrapper = d3_updateable(_top,".filter-wrapper","div",false, function(x) { return 1})
    .classed("filter-wrapper",true)
    .classed("hidden",false)

  d3_updateable(_top, "h3.summary-head","h3")
    .classed("summary-head",true)
    .style("margin-bottom","15px")
    .style("margin-top","-5px")
    .text("Search Summary")

  var summary = d3_updateable(_top,".search-summary","div",false, function(x) { return 1})
    .classed("search-summary",true)
    .style("min-height","60px")

  //var _top = wrapper


  var save = d3_updateable(wrapper, ".save-subtitle-filter","div")
    .classed("save-subtitle-filter",true)
    .classed("hidden",true)
    .attr("style","padding-left:10px; text-transform: uppercase; font-weight: bold; line-height: 24px; margin-bottom: 10px;")
    .style("text-align","right")


  d3_updateable(save,"span","span")
    .text("Save filter as:")

  var save_input = d3_updateable(save,"input","input")
    .style("margin-left","10px")
    .style("padding-left","8px")
    .style("font-weight","normal")
    .style("line-height","12px")
    .attr("placeholder","Filter name...")

  d3_updateable(save,"br","br")


  d3_updateable(save,"button","button")
    .style("margin-left","10px")
    .style("padding-left","8px")
    .style("font-weight","normal")
    .style("height","20px")
    .style("line-height","12px")
    .text("Save")
    .on("click", function(x) {
      var value = save_input.property("value")

      var filters = self._state.get("filter")
      var saved_searches = JSON.parse(localStorage.getItem("search.saved")) || []

      saved_searches.push({
          "key": value
        , "values": filters
      })

      localStorage.setItem("search.saved",JSON.stringify(saved_searches))

      save.classed("hidden",true)
    })






  var subtitle = d3_updateable(wrapper, ".subtitle-filter","div")
    .classed("subtitle-filter",true)
    .attr("style","padding-left:10px; text-transform: uppercase; font-weight: bold; line-height: 33px; background: #e3ebf0; margin-bottom:10px")
    

  d3_updateable(subtitle,"span.first","span")
    .text("Users matching " )
    .classed("first",true)

  var filter_type  = d3_updateable(subtitle,"span.middle","span")
    .classed("middle",true)


  var select = d3_updateable(filter_type,"select","select")
    .style("font-size","10")
    .style("width","50px")
    .on("change",function() {
      var d = this.selectedOptions[0].__data__
      self._state.set("logic", (d == "Any") ? "or" : "and")
      self._logic_filter.on("update")(self._state.get("filter"))
    })

  d3_splat(select,"option","option",["All","Any"])
    .attr("selected",function(x) {
      return self._state.get("logic","and") == "or" ? x == "Any" : undefined
    })
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

  var filters = self._state.get("filter",[{}])

  //if (document.location.search.indexOf("filter") > -1) {
  //
  //  filters = document.location.search.split("filter=")[1]
  //  filters = JSON.parse(decodeURIComponent(filters.split("&")[0]))
  //  this._state.filters
  //}

  //debugger
  var categories = this._data.category.map(function(x) {x.key = x.parent_category_name; return x})

  self._logic_filter = filter.filter(wrapper)
    .fields(Object.keys(mapping))
    .ops([
        [{"key": "equals.category"}]
      , [{"key":"contains"},{"key":"starts with"},{"key":"ends with"}]
      , [{"key":"equals"}, {"key":"between","input":2}]
    ])
    .data(filters)
    .render_op("equals.category",function(filter,value) {
      var self = this;

      var select = d3_updateable(filter,"select.value","select")
        .classed("value",true)
        .style("margin-bottom","10px")
        .style("padding-left","10px")
        .style("width","150px")
        .attr("value", value.value)
        .on("change", function(x){
          value.value = this.value
          self.on("update")(self.data())
        })

      d3_splat(select,"option","option",categories,function(x) { return x.key })
        .attr("selected",function(x) { return x.key == value.value ? "selected" : undefined })
        .text(function(x) { return x.key })

    })
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

      self._state.set("filter",x)

      var y = x.map(function(z) {
        return { 
            "field": mapping[z.field]
          , "op": z.op
          , "value": z.value
        }
      })

      if (y.length > 0 && y[0].value) {
        var logic = self._state.get("logic","and")
        var data = {
            "full_urls": filter.filter_data(self._data.full_urls).logic(logic).by(y)
          //, "url_only": filter.filter_data(self._data.url_only).logic("and").by(y)
        }

        var categories = d3.nest()
          .key(function(x){ return x.parent_category_name})
          .rollup(function(v) {
            return v.reduce(function(p,c) { return p + c.uniques },0)
          })
          .entries(data.full_urls)

        var total = categories.reduce(function(p,c) { return p + c.values },0)

        categories.map(function(x) {
          x.value = x.values
          x.percent = x.value / total
        })

        data["display_categories"] = {
            "key":"Categories"
          , "values": categories.filter(function(x) { return x.key != "NA" })
        }

        var category_hour = d3.nest()
          .key(function(x){ return x.parent_category_name + x.hour + x.minute})
          .rollup(function(v) {
            return {
                "parent_category_name": v[0].parent_category_name
              , "hour": v[0].hour
              , "minute": v[0].minute 
              , "count":v.reduce(function(p,c) { return p + c.count },0)
            }
          })
          .entries(data.full_urls)
          .map(function(x) { return x.values })

        data["category_hour"] = category_hour

        




        self._data.display_categories = data.display_categories

        self.render_right(data)
        self.render_summary(_top,data)
        self.render_view(_lower,data)
      } else {
        self.render_right(data)
        self.render_summary(_top,self._data)

        self.render_view(_lower,self._data)
      }
    })
    .draw()

  self._logic_filter
    .on("update")(filters)

  
}
