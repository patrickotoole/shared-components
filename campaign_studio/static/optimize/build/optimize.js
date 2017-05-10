(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('optimize', ['exports'], factory) :
  factory((global.optimize = {}));
}(this, function (exports) { 'use strict';

  function d3_wrapper_with_title(target,title,cls,data) {
    var w = d3_updateable(target,"." + cls,"div",data)
      .classed(cls,true)

    w.exit().remove()

    d3_updateable(w,"h4","h4").text(title)

    return d3_updateable(w,".row").classed("row",true)

  }

  function Load(target) {
    this._target = target
    this._on = {
        "click": function() {}
    }
  }

  Load.prototype = {
      draw: function() {

        var row = d3_wrapper_with_title(this._target,"Load Saved State","load")

        d3_updateable(row,"textarea","textarea")
          .attr("id","preload")
          .style("width","300px")
          .style("height","20px")
          .text(this._data)

        d3_updateable(row,"button","button")
          .attr("id","preload-action")
          .on("click",this._on["click"])
          .text("Load")

      }
    , data: function(d) {
        if (d === undefined) return this._data
        this._data = d
        return this
      }
    , on: function(action,fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }
  }

  function load(target) {
    return new Load(target)
  }

  load.prototype = Load.prototype

  function select(target,selected,option_key) {
    // {key: String, values: [{key: String, value: ?}...] }

    var option_key = option_key || "values"

    d3_updateable(target,"span","span").text(function(x) { return x.key })

    var select = d3_updateable(target,"select","select")

    d3_splat(select,"option","option",function(x){ return x[option_key] }, function(x) { return x.key})
      .text(function(x) { return x.key })
      .attr("value",function(x) { return x.value })
      .property("selected", function(x) { return x.value == selected })

    select.summarize = function() { 
      return select.property("value")
    }

    return select
  }

  function Input(target) {
    this._target = target
    this._on = {}
  }

  Input.prototype = {
      draw: function() {

        var target = this._target

        try {
          var selectedAdvertiser = target.datum().settings.filter(function(x) { return x.key == "report_advertiser" })[0].value
        } catch (e) {}

        var report_row = d3_class(target,"report-row") 
        d3_class(report_row,"report-label","span").text("Upload a file: ")

        var text = d3_updateable(report_row,"textarea","textarea").attr("type","file")
          .text(function(x) {
            return JSON.stringify(x.report)
          })

        var report_advertiser_row = d3_class(target,"report-advertiser-row")

        d3_class(report_advertiser_row,"report-advertiser-label","span")
          .text("Report Advertiser: ")    

        var select = d3_select(
          report_advertiser_row, 
          function(x) { return x.advertisers }, 
          function(x) { return x.key }, 
          function(x) { return x.value == selectedAdvertiser ? "selected" : false }
        )

        var properties = this;

        d3_updateable(target,"button","button")
          .text("Get")
          .on("click", function() {
            var json = text.property("value")
            var selected = select.node().selectedOptions

            if (selected.length) var advertiser = selected[0].__data__.value
            properties.on("click").bind(this)({"report":json, "report_advertiser": advertiser})
          })

        return this

      }
    , data: function(d) {
        if (d === undefined) return this._data
        this._data = d
        return this
      }
    , on: function(action,fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }
  }

  function input$1(target) {
    return new Input(target)
  }

  function Upload(target) {
    this._target = target
    this._on = {}
  }

  Upload.prototype = {
      draw: function() {

        var target = this._target;

        d3_updateable(target,"span","span").text("Upload a file: ")
      
        var input = d3_updateable(target,"input","input")
          .attr("type","file")
      
        campaign_analysis.upload(input)
        return this
      }
    , on: function(action,fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }

  }

  function upload(target) {
    return new Upload(target)
  }

  function Input$1(target) {
    this._target = target
    this._on = {}
  }

  Input$1.prototype = {
      draw: function() {

        var self = this;
        var target = this._target
        var selectedAdvertiser;
        try {
          selectedAdvertiser = target.datum().settings.filter(function(x) { return x.key == "sql_advertiser" })[0].value
        } catch (e) {}

        var report_row = d3_class(target,"report-row") 
        d3_class(report_row,"report-label","span").text("Enter SQL: ")

        var text = d3_updateable(report_row,"textarea","textarea").attr("type","file")
          .text(function(x) { return x.sql })

        var report_advertiser_row = d3_class(target,"report-advertiser-row")

        d3_class(report_advertiser_row,"report-advertiser-label","span")
          .text("Choose Advertiser: ")    

        var select = d3_select(
          report_advertiser_row, 
          function(x) { return x.advertisers }, 
          function(x) { return x.key }, 
          function(x) { return x.value == selectedAdvertiser ? "selected" : false }
        )
        .on("change",function(x) {

          self.on("sql_advertiser.change")(this.selectedOptions[0].__data__)

        })

        d3_updateable(target,"button","button")
          .text("Get")
          .on("click", function() {
            var sql = text.property("value")
            var selected = select.node().selectedOptions

            if (selected.length) var advertiser = selected[0].__data__.value
            self.on("click").bind(this)({"sql":sql, "sql_advertiser": advertiser})
          })

        return this

      }
    , data: function(d) {
        if (d === undefined) return this._data
        this._data = d
        return this
      }
    , on: function(action,fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }
  }

  function input$2(target) {
    return new Input$1(target)
  }

  function Extract(target) {
    this._target = target
    this._on = {}
  }

  var OPTIONS = [{"key":"CSV","value":"csv"},{"key":"Report","value":"report"},{"key":"SQL","value":"sql"}]

  function selectSource(target) {

    var data = target.datum()
      , selected = data && data.extract_type
    
    var data = {
        "key": "Select Data Source: "
      , "values": OPTIONS
    }

    var row = d3_updateable(target,".row","div",data).classed("row",true)

    return select(row,selected)

  }

  function showableSection(target,key,option) {

    var option = option || "extract_type"
    
    return d3_updateable(target,"." + key).classed("showable hidden " + key,true)
      .classed("hidden",function(d) { return !(d[option] == key) })
  }





  Extract.prototype = {
      draw: function() {

        var row = d3_wrapper_with_title(this._target,"Extract Data","extract",this._data)

        var self = this;

        var ss = selectSource(row)
          .on("change",function() { 
            self.on('select')({"value":ss.summarize()}) 
          })

        var options = d3_updateable(row,".options","div")
          .classed("options",true)

        var sql = showableSection(options,"sql")
          , csv = showableSection(options,"csv")
          , report = showableSection(options,"report")

        if (this._data.sql) sql.classed("hidden",false)

        upload(csv)
          .draw()
          .on("load", this.on("upload"))

        input$1(report)
          .on("click", self.on("report"))

          .draw()

        input$2(sql)
          .draw()
          .on("click", self.on("sql"))
          .on("sql_advertiser.change", self.on("select.sql_advertiser"))




      }
    , data: function(d) {
        if (d === undefined) return this._data
        this._data = d
        return this
      }
    , on: function(action,fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }
  }

  function extract(target) {
    return new Extract(target)
  }

  extract.prototype = Extract.prototype

  function Transform(target) {
    this._target = target
    this._on = {}
  }

  Transform.prototype = {
      draw: function() {
        var transform_wrap = d3_wrapper_with_title(this._target,"Transform","transform",this._data)


        var transform = d3_splat(transform_wrap,".transform-item","div",function(x) { return x }, function(x,i) { return x.name })
          .classed("transform-item",true)
          .style("margin-left","10px")

        transform.exit().remove()

        d3_updateable(transform_wrap,"button.add","button")
          .classed("add",true)
          .text("Add Transform")
          .on("click",this.on("new"))

        //d3_updateable(transform_wrap,"button.submit","button")
        //  .classed("submit",true)
        //  .text("Run Transform")
        //  .on("click",this.on("submit"))




        var name_wrap = d3_class(transform,"name-wrap")
          .style("display","inline-block")

        d3_updateable(name_wrap,"span","span").text("New Column Name:")
        d3_updateable(name_wrap,"input","input").attr("value",function(x){ return x.name })
          .attr("placeholder","e.g., CPM")
          .on("change",(x) => {
            var items = this.summarize()
            this.on("change")(items)
          })

        var eval_wrap = d3_updateable(transform,".eval-wrap","div")
          .classed("eval-wrap",true)
          .style("display","inline-block")

        d3_updateable(eval_wrap,"span","span").text("Expression:")
        d3_updateable(eval_wrap,"input","input").attr("value",function(x){ return x.eval })
          .attr("placeholder","e.g., row['imps']/row['cost']")
          .on("change",(x) => {
            var items = this.summarize()
            this.on("change")(items)
          })

      }
    , summarize: function() {
        var items = []
        this._target.selectAll(".transform")
          .selectAll(".transform-item")
          .each(function(x) {
            var input = d3.select(this).selectAll("input")
            items.push({
                name: input[0][0].value
              , eval: input[0][1].value
            })

          })

        return items
          
      }
    , data: function(d) {
        if (d === undefined) return this._data
        this._data = d
        return this
      }

    , on: function(action,fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }
  }

  function transform(target) {
    return new Transform(target)
  }

  transform.prototype = Transform.prototype

  function Filter(target) {
    this._target = target
    this._on = {}
  }

  Filter.prototype = {
      draw: function() {
        var filter_wrap = d3_wrapper_with_title(this._target,"Filter","filter",this._data)


      }
    , summarize: function() {
        var items = []
        this._target.selectAll(".filter")
          .selectAll(".filter-item")
          .each(function(x) {
            var input = d3.select(this).selectAll("input")
            items.push({
                name: input[0][0].value
              , eval: input[0][1].value
            })

          })

        return items
          
      }
    , data: function(d) {
        if (d === undefined) return this._data
        this._data = d
        return this
      }

    , on: function(action,fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }
  }

  function filter(target) {
    return new Filter(target)
  }

  filter.prototype = Filter.prototype

  function Setup(target) {
    this._target = target
    this._on = {}

    this._opts = [
            {"key":"Duplicate (profile includes)","value":"Duplicate"}
          , {"key":"Replace","value":"Replace"}
          , {"key":"Modify (profile excludes)","value":"Modify"}
          , {"key":"Deactivate","value":"Deactivate"}
        ]

    this._options = [
            {"groups":"duplicate replace","name":"Line Item ID","type":"input","key":"line_item_id"}
          , {"groups":"duplicate replace","name":"Group or Breakout","type":"select","key":"breakout","options":[{"key":"Breakout","value":"Breakout"},{"key":"Group","value":"Group"}]}
          , {"groups":"create","name":"Group by","type":"input","key":"create_group"}
          , {"groups":"duplicate replace modify","name":"Override or Append fields","type":"select","key":"append","options":[{"key":"Override","value":"Override"},{"key":"Append","value":"Append"}]}
          , {"groups":"override","name":"Imp Budget Override","type":"input","key":"imp_budget"}
          , {"groups":"override","name":"Spend Budget Override","type":"input","key":"spend_budget"}
          , {"groups":"override","name":"Imp Bid Override","type":"input","key":"imp_bid"}
          , {"groups":"override","name":"Spend Bid Override","type":"input","key":"spend_bid"}
          , {"groups":"override","name":"Imp Lifetime Budget Override","type":"input","key":"lifetime_imp_budget"}
          , {"groups":"override","name":"Spend Lifetime Budget Override","type":"input","key":"lifetime_spend_budget"}
        ]
  }

  Setup.prototype = {
      draw: function() {

        var self = this

        var setup_wrap = d3_wrapper_with_title(this._target,"Setup","setup",this._data)

        var advertiser_wrap = d3_class(setup_wrap,"advertiser")
        d3_updateable(advertiser_wrap,"span","span").text("Advertiser ID:")
        d3_select(advertiser_wrap,this._data.advertisers,(x) => x.key, x => { return x.value == this._data.advertiser })
          .on("change",function(x){
            var y = this.selectedOptions[0].__data__
            self.on("advertiser")(y)
          })

        var opt_wrap = d3_class(setup_wrap,"optimization")
        d3_updateable(opt_wrap,"span","span").text("Optimization Type:")

        var opts = this._opts

        var opt_type = this._data.settings.filter(x => x.key =="opt_type").concat([{"value":"false"}])[0].value


        d3_select(opt_wrap,opts,(x) => x.key, (x) => { return x.value == opt_type })
          .on("change",function(x){
            var y = this.selectedOptions[0].__data__
            self.on("opt_type")(y)
          })

        var settings = this._data.settings.reduce((p,c) => { p[c.key] = c.value; return p },{})
        var options = this._options

        options.map(o => {o.value = settings[o.key]; return o })

        var _options = d3_class(setup_wrap,"options")

        var o = d3_splat(_options,".option","div",options,x => x.key)
          .attr("class", function(x) { return "option hidden optional " + x.groups})
          .each(function(x) {
            d3_updateable(d3.select(this),"span","span").text(x => x.name)

            if (x.type == "select") d3_select(d3.select(this),x => x.options, x => x.key, y => { return y.value == x.value } )
              .on("change",function(x){
                self.on("update")({"key":x.key,"value":this.selectedOptions[0].__data__.value})
              })

            if (x.type == "input") d3_updateable(d3.select(this),"input","input")
              .attr("value",x.value)
              .on("change",function(x) {
                self.on("update")({"key":x.key,"value":this.value})
              })

          })

        var toggle = d3_updateable(this._target,"a","a").attr("href","#").text("Show Overrides (+)").on("click",function() {

          var or = _options.selectAll(".override")
          toggle.text(!or.classed("hidden") ? "Show Overrides (+)" : "Hide Overrides (-)")
          or.classed("hidden",!or.classed("hidden"))
          
        })


        _options.selectAll("." + opt_type.toLowerCase() )
          .classed("hidden",false)
        

      }
    , summarize: function() {

        var summary = {}

        this._target.selectAll("input").each(function(x) {
          summary.push({"key":this.__data__.key,"value": this.value})
        })

        return {}
      }
    , data: function(d) {
        if (d === undefined) return this._data
        this._data = d
        return this
      }

    , on: function(action,fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }
  }

  function setup(target) {
    return new Setup(target)
  }

  setup.prototype = Setup.prototype

  function Save(target) {
    this._target = target
    this._on = {}
  }

  Save.prototype = {
      draw: function() {

        var self = this;

        d3_updateable(this._target,"span","span").text("Name:")
        var input = d3_updateable(this._target,"input","input")
          .on("change",function(x) { self.on("update").bind(this)(this.value) })

        var save = d3_updateable(this._target,".save","button").classed("save",true)
          .text("Save")
          .on("click",this.on("save"))

        var create = d3_updateable(this._target,".create","button").classed("create hidden",true)
          .text("Run")
          .on("click",this.on("run"))


      }
    , data: function(d) {
        if (d === undefined) return this._data
        this._data = d
        return this
      }

    , on: function(action,fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }
  }

  function save(target) {
    return new Save(target)
  }

  save.prototype = Save.prototype

  var version = "0.0.1";

  exports.version = version;
  exports.load = load;
  exports.extract = extract;
  exports.transform = transform;
  exports.filter = filter;
  exports.setup = setup;
  exports.save = save;

}));