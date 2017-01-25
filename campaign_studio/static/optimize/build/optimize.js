(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('optimize', ['exports'], factory) :
  factory((global.optimize = {}));
}(this, function (exports) { 'use strict';

  function d3_wrapper_with_title(target,title,cls,data) {
    var w = d3_updateable(target,"." + cls,"div",data)
      .classed(cls,true)

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

  function select(target,selected) {
    // {key: String, values: [{key: String, value: ?}...] }

    d3_updateable(target,"span","span").text(function(x) { return x.key })

    var select = d3_updateable(target,"select","select")

    d3_splat(select,"option","option",function(x){ return x.values }, function(x) { return x.key})
      .text(function(x) { return x.key })
      .attr("value",function(x) { return x.value })
      .property("selected", function(x) { return x.value == selected })

    select.__proto__.getState = function() { 
      return this.selectedOptions[0].__data__
    }

    return select
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

  function uploadFile(target) {
    d3_updateable(target,"span","span").text("Upload a file: ")

    var input = d3_updateable(target,"input","input")
      .attr("type","file")

    return campaign_analysis.upload(input)
  }

  function inputReport(target) {

    try {
      var selectedAdvertiser = target.datum().settings.filter(function(x) { return x.key == "report_advertiser" }).value
    } catch (e) {}

    var report_row = d3_updateable(target,".report-row","div").classed("report-row",true)

    d3_updateable(report_row,".report-label","span").classed("report-label",true).text("Upload a file: ")
    var text = d3_updateable(report_row,"textarea","textarea").attr("type","file")
      // need to fill this in with data from JSON object

    var report_advertiser_row = d3_updateable(target,".report-advertiser-row","div").classed("report-advertiser-row",true)


    d3_updateable(report_advertiser_row,".report-advertiser-label","span")
      .classed("report-advertiser-label",true)
      .text("Report Advertiser: ")


    var select = d3_updateable(report_advertiser_row,"select","select")

    d3_splat(select,"option","option",function(x) { return x.advertisers }, function(x) { return x.key })
      .text(function(x) { return x.key })
      .property("selected",function(x) { return x.value == selectedAdvertiser ? "selected" : false })

    var _on = {}

    var properties = {
      "on": function(action,fn) {
        if (fn === undefined) return _on[action] || function() {};
        _on[action] = fn
        return properties
      } 
    }

    d3_updateable(target,"button","button")
      .text("Get")
      .on("click", function() {
        var json = text.property("value")
        var selected = select.node().selectedOptions

        if (selected.length) var advertiser = selected[0].__data__.value
        properties.on("click").bind(this)({"report":json, "report_advertiser": advertiser})
      })

    return properties

  }

  Extract.prototype = {
      draw: function() {

        var row = d3_wrapper_with_title(this._target,"Extract Data","extract",this._data)

        var self = this;

        selectSource(row)
          .on("change",function() { 
            self.on('select').bind(this)(this.selectedOptions[0].__data__) 
          })

        var options = d3_updateable(row,".options","div")
          .classed("options",true)

        var sql = showableSection(options,"sql")
          , csv = showableSection(options,"csv")
          , report = showableSection(options,"report")

        uploadFile(csv)
          .on("load", this.on("upload"))

        inputReport(report)
          .on("click", this.on("report"))

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
      draw: function() {}
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

  var version = "0.0.1";

  exports.version = version;
  exports.load = load;
  exports.extract = extract;
  exports.transform = transform;

}));