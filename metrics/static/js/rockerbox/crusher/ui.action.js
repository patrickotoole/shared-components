var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  action.add_pattern = function() {
    var datum = this.datum(),
      pattern_values = datum.values

    datum.rows = datum.rows || []

    datum.rows = datum.rows.concat([{
      "values": pattern_values,
      "selected": pattern_values[0]
    }])

    var patternSelector = this.selectAll(".action-pattern")
      .data(datum.rows)
      .enter()
        .append("div")
        .classed("action-pattern",true)

    var rm = patternSelector.append("div")
      .text("remove")
      .on("click",function(){action.remove_pattern.bind(this.parentNode)()})

    var selectBox = patternSelector.append("select")
      .on("change",function(x){
        x.selected = d3.selectAll(this.selectedOptions).data()
      })

    selectBox.selectAll("option")
      .data(function(x){return x.values})
      .enter()
        .append("option")
        .text(String) 

  }

  action.remove_pattern = function(){
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

  action.summarize = function() {
    
    var data = this.selectAll(".action-pattern").data()           

    var d = data.reduce(function(p,c){
      p = p.concat(c.selected)
      return p
    },[])

    var actionObj = {
      name: this.selectAll("input").node().value,
      patterns: d
    }

    console.log(actionObj)
         
  }

  action.build = function(target) {
    target.append("h5") 
      .text("action")

    target.append("div")
      .append("input")

    var patterns = target.append("div")
      .classed("action-patterns",true)

    target.append("a")
      .classed("bottom",true)
      .text("add pattern-selector")
      .on("click", action.add_pattern.bind(patterns))

    target.append("a")
      .text("finish")
      .on("click", action.summarize.bind(target))
  }

  return action
})(RB.crusher.ui.action || {})  
