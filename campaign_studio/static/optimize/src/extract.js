import d3_wrapper_with_title from './helper';
import * as elements from './form_components';

export function Extract(target) {
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

  return elements.select(row,selected)

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
          self.on('select')(this.summarize()) 
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

export default extract;
