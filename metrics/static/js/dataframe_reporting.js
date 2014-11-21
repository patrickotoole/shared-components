var groupedDataWrapper = function(data,meta) {
  this.raw = data
  this.crs = crossfilter(this.raw)

  this.meta = meta

  this.dimensions = {}
  this.groups = {}
  this.fields = this.meta.fields


  var self = this,
    dims = this.meta.groups;

  this.defaultGroupName = this.meta.groups[0]
  
  dims = [this.defaultGroupName]
  if (this.meta.is_wide != false) dims = dims.concat(["__index__"])


  dims.map(function(group){
    // make them dims
    self.dimensions[group] = self.crs.dimension(function(d) {return d[group] })

    // make them groups
    self.groups[group] = self.dimensions[group].group(function(x){return x}).reduce(
      function(p,v){
        self.fields.map(function(f){ p[f] += v[f] })
        return p
      },
      function(p,v){
        self.fields.map(function(f){ p[f] -= v[f] })
        return p
      },
      function(){
        var o = {}
        self.fields.map(function(f){ o[f] = 0 })
        return o
      }
    )

    // make them hash
    self.groups[group].toHash = toHash

  })

  this.defaultDimension = this.dimensions[this.defaultGroupName]
  this.defaultGroup = this.groups[this.defaultGroupName]
  this.defaultHeaders = this.meta.groups.concat(this.meta.fields) 
  this.defaultValueName = this.meta.fields.length > 0 ? this.meta.fields[0] : this.defaultGroupName

  this.headers = this.defaultHeaders
  this.dimension = this.meta.is_wide == false ? this.defaultDimension : this.dimensions.__index__ 

  

  if (this.meta.is_wide != false) {
    var keys = Object.keys(this.raw[0]),
      headers = []
    
    keys.map(function(x){
      if (self.meta.groups.indexOf(x) == -1 && x != "__index__" && x != "__id__") {
        headers.push(x)
      }
    })
    this.headers = this.meta.groups.filter(function(x){
      return x != self.meta.is_wide 
    }).concat(headers.sort(function(x,y){return new Date("20"+x) - new Date("20"+y)}))
  }

}

FORMATTER = {
    "numberFormat": d3.format("0,000"),
    "percentFormat":  d3.format(".4p"),
    "currency": d3.format("$0,000.00"),
    "cpm": function(x) {
      return d3.format("$0,000.00")(d3.round(x,3))
    },
    "none" : function(x) {return x},
    "editable" : function(x,k,h) {
      if (x !== undefined) {
        return "<span data-pk='"+h.__id__+"' data-name='"+k+"'class='editable'>"+x+"</span>" 
      }
    },
    "timeseries": function(value,key,object) {

      if (Array.isArray(value)) {
        var _id = "ts-"+Object.keys(object).map(function(x){return typeof(object[x]) == "string" ? object[x] : ""}).join("-").replace(/\./g,"").replace(/&/g,"")
        var values = value.map(function(x){x.date = new Date("20"+x.date); return x})
        var keys = Object.keys(object[key][0]).filter(function(x){return x != "date"})
        setTimeout(function(){
          data_graphic({
              data: values,
              width: 600,
              height: 150,
              legend: keys,
              legend_target: '#legend' + _id,
              target: '#' + _id,
              x_accessor: 'date',
              y_accessor: keys
          })
        },0)
        
        return "<div id='legend"+_id+"'></div><span id='"+_id+"'></span>"
      } else {
        return ""
      }
    }
}

var defaultFormatColumn = function(x,h) {
  var formatted = FORMATTER.numberFormat(h[x]),
    formatters = self.crsWrapped.meta.formatters

  if (isNaN(h[x])) {
    if (formatters && formatters[x]) {
      return FORMATTER[formatters[x]](h[x],x,h)
    }
    return h[x]
  } else if (formatters && formatters[x]) {
    return FORMATTER[formatters[x]](h[x])
  } else {
    return formatted
  }
  
}

var groupedTableWrapper = function(crsWrapped,data_table_id,show_more) {
  var MAX_SIZE = 1000000

  this.showMore = show_more || false

  this.dataTable = dc.dataTable(data_table_id)
  this.headers = crsWrapped.headers
  this.crsWrapped = crsWrapped
  window.crsWrapped = this.crsWrapped

  var self = this,
    
    defaultMoreColumn = function(h) {
      var group_names = Object.keys(self.crsWrapped.groups),
        remaining_groups = group_names.filter(function(x) {
          return x != h
        })

      return  "<a href='" + window.location.pathname + "?" + 
        remaining_groups.map(function(f){
          return f + "=" + escape(h[f])
        }).join("&") + "' class='btn btn-primary btn-xs' target='_'>Details</a>" 
    }

  this.formatColumn = defaultFormatColumn
  this.moreColumn = defaultMoreColumn

  this.makeHeaders = function(id) {
    var header = self.dataTable.select(id)
    self.headers.map(function(v){
      header.append("td")
        .text(v)
    })
    return self.headers
  }

  this.buildColumns = function() {
    var columns = self.headers.map(function(x,i){
      if (i > 0) return self.formatColumn.bind(self,x)
    })
    if (this.showMore) {
      columns = columns.concat([
        self.moreColumn
      ])            
    } else {
       columns = columns.concat([
        function(){}
      ])             
    }
    return columns
  }

  this.buildTable = function(dimension,group,group_name, columns) {
    var dim = (dimension != undefined) ? dimension : self.crsWrapped.dimension,
      group_name = (group_name != undefined) ? group : self.crsWrapped.defaultGroupName,
      group = (group != undefined) ? group : self.crsWrapped.defaultGroup,
      columns = (columns != undefined) ? columns : self.crsWrapped.defaultHeaders,
      value_name = self.crsWrapped.defaultValueName


    self.dataTable
      .dimension(dim)
      .group(function (d) {
        return d[group_name]
      })
      .size(MAX_SIZE) 
      .columns(self.buildColumns())
      .sortBy(function (d) {
        if (self.crsWrapped.meta.is_wide == false) {
          return d[self.crsWrapped.defaultValueName]
        } else {
          return d.__index__
        }

      })
      .order(d3.descending)

    return self.dataTable
  }

  this.SHOW_TEXT = "Show lists"
  this.HIDE_TEXT = "Hide lists"

  this.headerClick = function(e) {
    var lock = d3.select(this.parentNode).selectAll(".lock"),
      text = lock.text();

    if (text == self.SHOW_TEXT) {
      lock.text(self.HIDE_TEXT)
      d3.select(this.parentNode)
        .selectAll(".dc-table-row")
        .classed("hide" , false)
        .transition().duration(500)
    } else if (text == self.HIDE_TEXT) {
      lock.text(self.SHOW_TEXT)
      d3.select(this.parentNode)
        .selectAll(".dc-table-row")
        .classed("hide",true)
        .transition().duration(500)
    } 
  }

  this.renderGroupHeaders = function(hide_rows) {
    var hash = self.crsWrapped.defaultGroup.toHash()
    
    self.dataTable.renderlet(function (table) {
      var s = table.selectAll(".dc-table-group")

      if (hide_rows) table.selectAll(".dc-table-row").classed("hide",true)

      s.selectAll(".dc-table-label")
        .attr("colspan",0)

      $(self.headers.slice(1)).each(function(i,f){
        s.append("td")
          .text(function(x){
            return defaultFormatColumn.bind(this)(f, hash[x.key])
          })
          
      })
      
      s.append("td")
        .append("a")
        .attr("href",function(x){
          return window.location.pathname + 
            "?" + self.crsWrapped.defaultGroupName + "=" + escape(x.key)
        })
        .attr("target","_")
        .text("More")
        .classed("btn btn-primary btn-xs", true)
          
      s.append("td")
        .classed("lock",true)
        .classed("right",true)
        .classed("btn-xs",true)
        .classed("hide",true)
        .text(hide_rows ? self.SHOW_TEXT : self.HIDE_TEXT)
       
      table.selectAll(".dc-table-group")
        .classed("info", true)
        .on("click", self.headerClick) 
    });
  }
}
