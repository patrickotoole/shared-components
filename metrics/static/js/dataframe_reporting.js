var groupedDataWrapper = function(data,meta) {
  this.raw = data
  this.crs = crossfilter(this.raw)

  this.meta = meta

  this.dimensions = {}
  this.groups = {}
  this.fields = this.meta.fields


  var self = this;

  this.meta.groups.map(function(group){
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

  this.defaultGroupName = this.meta.groups[0]
  this.defaultDimension = this.dimensions[this.defaultGroupName]
  this.defaultGroup = this.groups[this.defaultGroupName]
  this.defaultHeaders = this.meta.groups.concat(this.meta.fields) 
  this.defaultValueName = this.meta.fields[0]

}

var numberFormat = d3.format("0,000");
var percentFormat = d3.format(".4p")

var groupedTableWrapper = function(crsWrapped,data_table_id) {
  var MAX_SIZE = 10000000

  this.dataTable = dc.dataTable(data_table_id)
  this.headers = crsWrapped.defaultHeaders
  this.crsWrapped = crsWrapped
  window.crsWrapped = this.crsWrapped

  var self = this;
    defaultFormatColumn = function(x,h) {
      return isNaN(h[x]) ? h[x] : numberFormat(h[x])
    },
    defaultMoreColumn = function(h) {
      var group_names = Object.keys(self.crsWrapped.groups),
        remaining_groups = group_names.filter(function(x) {
          return x != h
        })

      return  "<a href='" + window.location.pathname + "?" + 
        remaining_groups.map(function(f){
          return f + "=" + h[f]
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
    return self.headers.map(function(x,i){
      if (i > 0) return self.formatColumn.bind(self,x)
    }).concat([
      self.moreColumn
    ]) 
  }

  this.buildTable = function(dimension,group,group_name, columns) {
    var dim = (dimension != undefined) ? dimension : self.crsWrapped.defaultDimension,
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
        return d[self.crsWrapped.defaultValueName]
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
            return isNaN(hash[x.key][f]) ? 
              "" : 
              numberFormat(hash[x.key][f])
          })
      })
      
      s.append("td")
        .append("a")
        .attr("href",function(x){
          return window.location.pathname + 
            "?" + self.crsWrapped.defaultGroupName + "=" + x.key
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
