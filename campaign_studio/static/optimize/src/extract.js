import d3_wrapper_with_title from './helper';
import * as elements from './form_components';
import * as _report from './extract/report';
import * as _file from './extract/file';
import * as _sql from './extract/sql';




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

      _file.upload(csv)
        .draw()
        .on("load", this.on("upload"))

      _report.input(report)
        .on("click", self.on("report"))
        .draw()

      _sql.input(sql)
        .draw()
        .on("click", self.on("sql"))



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
