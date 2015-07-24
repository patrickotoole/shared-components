var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action.pattern = (function(pattern) {

  var crusher = RB.crusher
  var action = RB.crusher.ui.action

  pattern.add = function(add_row) {
    var datum = this.datum()

    datum.rows = datum.rows || []
  
    if (add_row) {
      var rows = [{
        "selected":"",
        "values":[]
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

    var newSelector = patternSelector.append("input")
      .classed("bloodhound typeahead form-control",true)
      .attr("value",function(x){return x.url_pattern})
  
    var rm = patternSelector.append("span")
      .classed("input-group-btn",true)
      .append("button")
      .text("remove")
      .classed("btn-xs btn btn-danger",true)
      .on("click",function(){
        action.pattern.remove.bind(this.parentNode.parentNode)()
      })

    crusher.controller.get_bloodhound(function(bloodhound){
  
      $(newSelector.node()).typeahead({
        hint: true,
        highlight: true,
        minLength: 3
      },
      {
        name: 'urls',
        source: bloodhound,
        display: "url",
        templates: {
          suggestion: function(x) {
            return "<div style='width:100%'><div style='display:inline-block;overflow:hidden;width:90%'>" + 
              x.url + "</div><div style='display:inline-block;width:8%;vertical-align:top;margin-left:5px'>" + 
              x.count + " visits</div></div>"
          }
        }
      });

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
