export function Fields(target) {
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

export default fields;
