var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action.pattern = (function(pattern) {

  var action = RB.crusher.ui.action

  pattern.add = function(add_row) {
    var datum = this.datum(), pattern_values = datum.values;
  
    datum.rows = datum.rows || []
  
    if (add_row) {
      var rows = [{
        "values": pattern_values,
        "selected": pattern_values[0]
      }] 
      datum.rows = datum.rows.concat(rows)
    } 
  
    var patternSelector = this.selectAll(".action-pattern")
      .data(datum.rows)
      .enter()
        .append("div")
        .classed("action-pattern input-group input-group-sm",true)

    patternSelector.append("span")
      .classed("input-group-addon",true)
      .text(function(x,i) { return "Pattern " + (i+1)})
        
    
    var selectBox = patternSelector
      .append("select")
      .classed("form-control",true)
      .on("change",function(x){
        x.selected = d3.selectAll(this.selectedOptions).data()
        x.url_pattern = x.selected[0]
      })
  
    var rm = patternSelector.append("span")
      .classed("input-group-btn",true)
      .append("button")
      .text("remove")
      .classed("btn-xs btn btn-danger",true)
      .on("click",function(){
        action.pattern.remove.bind(this.parentNode.parentNode)()
      })
  
    selectBox.selectAll("option")
      .data(function(x){return x.values})
      .enter()
        .append("option")
        .text(String) 
        .attr("selected",function(x){
          var pattern = d3.select(this.parentNode).datum().url_pattern
          return x == pattern ? "selected" : null
        })
  } 

  pattern.remove = function() {
    var p = this.parentNode,
      self = this,
      patternSelector = d3.select(p).selectAll(".action-pattern");

    var toRemove = patternSelector.filter(function(x,i){
      x.position = i
      return this == self
    })

    var data = d3.select(p).datum().rows
    data.splice(toRemove.datum().position,1)

    var selected = patternSelector.data(data,function(x){ 
      return x.position
    })

    selected.exit().remove()  
  }


  return pattern
})(RB.crusher.ui.action.pattern || {})   
