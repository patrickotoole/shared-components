(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('campaign_analysis', ['exports'], factory) :
  factory((global.campaign_analysis = {}));
}(this, function (exports) { 'use strict';

  function Upload(target) {
    this.target = target
    this._on = {}
    this.reader = new FileReader()

    var self = this;


    this.reader.addEventListener("load",this.parse.bind(this), false)

    this.target.on("change",function() {
      var file = this.files[0]
      self.reader.readAsText(file)
    })
  }

  Upload.prototype = {
      parse: function() {
        this.on("load")(this.reader.result)
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

  upload.prototype = Upload.prototype;

  function ProcessCSV(csv) {
    this.result = csv
  }

  ProcessCSV.prototype = {
      headers: function() {

        var split = this.result.split("\n")[0]

        var lower_cased = split.toLowerCase()
          .replace(/%/,"").replace(/\(/g,"")
          .replace(/\)/g,"")
          .split(",")
          .map(function(x) { return x.trim().replace(/ /g,"_") })

        lower_cased = lower_cased.map(function override_names(x) {
          console.log(x)
          return x == "sellers" ? "seller_id" : x
        })

        return lower_cased
        
      }
    , data: function() {
        var headers = this.headers().join(",")
        var tabular = this.result.split("\n").slice(1).join("\n") 

        var r = headers + "\n" + tabular

        var datum = d3.csv.parse(r, function(d){ return d; });

        return datum
      }
  }

  function parse(csv) {
    return new ProcessCSV(csv)
  }

  parse.prototype = ProcessCSV.prototype;

  function Fields(target) {
    this._target = target
    this._fields = ["placement_targets","venue_targets","segment_group_targets","member_targets"]
    this._options = ["none","include","exclude"]
  }

  Fields.prototype = {
      fields: function(d) {
        if (d === undefined) return this._fields
        this._fields = d
        return this
      }
    , options: function(d) {
        if (d === undefined) return this._options
        this._options = d
        return this
      }

    , draw: function() {
        var row = d3_splat(this._target,".row","div",this._fields)
          .classed("row",true)
          .attr("id",String)

        row.exit().remove()
        
        d3_updateable(row,"div","div")
          .style("width","300px")
          .style("display","inline-block")
          .style("margin-left","10px")

          .text(String)
        
        var selection = d3_splat(row,".selection","div",this._options)
          .classed("selection",true)
          .style("display","inline-block")
          .style("width","75px")
        
        d3_updateable(selection,"input","input")
          .attr("type","radio")
          .attr("name",function(x) { return this.parentNode.parentNode.__data__ + "targeting" })
        
        d3_updateable(selection,"span","span")
          .text(String)

        return this

      }
    , summarize: function() {
        var values = this._target.selectAll(".row")[0].map(function(arg) {
          var r = arg.__data__
          var xx = d3.select(arg).selectAll("input").filter(function(x) { return this.checked})
          if (xx.size()) return {"key":r,"value":xx.datum()}
          else return {"key":r,"value":"none"}
        })

        debugger

        return values
      } 
  }

  function fields(target) {
    return new Fields(target)
  }

  fields.prototype = Fields.prototype

  var version = "0.0.1";

  exports.version = version;
  exports.upload = upload;
  exports.parse = parse;
  exports.fields = fields;

}));