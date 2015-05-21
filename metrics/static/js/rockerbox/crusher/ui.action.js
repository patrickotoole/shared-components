var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  action.save = function(callback) {
    
    var data = this.selectAll(".action-pattern").data()           

    var d = data.reduce(function(p,c){
      p = p.concat(c.url_pattern)
      return p
    },[])

    var objectData = this.datum()
    objectData.url_pattern = d
    objectData.action_name = this.selectAll("input").node().value
    objectData.operator = this.selectAll(".operator").node().value

    this.text("")
    action.show(this,callback)

    callback(objectData,this)

  }

  action.edit = function(newEdit,onSave) {

    newEdit.append("h5") 
      .text(function(x){
        return x.url_pattern ? "Edit an action" : "Create an action"
      })

    var group = newEdit.append("div")
      .classed("input-group input-group-sm",true)

    group.append("span")
      .classed("input-group-addon",true)
      .text("Action name")

    group
      .append("input")
      .classed("form-control",true)
      .attr("placeholder","e.g., Landing pages")
      .attr("value",function(x){return x.action_name})

    var operatorGroup = newEdit.append("div")
      .classed("input-group input-group-sm",true)
    
    operatorGroup.append("span")
      .classed("input-group-addon",true)
      .text("Boolean operator")
       
    var operator = operatorGroup
      .append("select")
      .classed("operator form-control",true)

    var options = operator.selectAll("option")
      .data(["and","or"])
      .enter()
        .append("option")

    options 
      .text(String)
      .attr("selected",function(x){
        return x.operator
      })

    var newPatterns = newEdit.selectAll(".action-patterns")
      .data(function(x){
        if (x.url_pattern) {
          x.rows = x.url_pattern.map(function(y){
            return {"url_pattern":y,"values":x.values}
          })
        }
        return [x]
      })
      .enter()
        .append("div")
        .classed("action-patterns",true)

    action.pattern.add.bind(newPatterns)(false)

    newEdit.append("div")
      .style("padding","10px")
      .style("padding-top","0px") 
      .append("a")
      .classed("bottom btn btn-primary btn-sm pull-right",true)
      .text("Add Pattern")
      .on("click", action.pattern.add.bind(newPatterns))

    newEdit.append("a")
      .text("Define Action")
      .classed("btn btn-success btn-sm",true)
      .on("click", action.save.bind(newEdit,onSave))
  }

  action.show = function(target,onSave) {

    var h5 = target.append("h5")

    h5
      .append("span")
      .text(function(x){
        return x.action_name
      })

    h5.append("button")
      .classed("btn btn-xs pull-right",true)
      .text("edit")
      .on("click",function(){
        var edit = d3.select(this.parentNode)
        edit.text("") // clear out the shit.
        action.edit(edit,onSave)
      })  
  }

  action.showAll = function(actions,onSave) {
    
    var selected = d3.selectAll(".action-wrapper")
      .selectAll(".action")
      .data(actions)

    var newActions = selected
      .enter()
        .append("div").classed("row col-md-12",true)
        .append("div")
        .classed("action col-md-6",true)

    action.show(newActions,onSave) 

  }

  action.showList = function(target,actions) {
    var select = target.append("select")

    select.selectAll("option")
      .data(actions)
      .enter()
        .append("option")
        .attr("value",function(x){return x.id})
        .text(function(x){return x.action_name})

  }

  action.buildEdit = function(target,data,onSave) {

    var edit = target.selectAll(".action")
      .data(data)

    var newEdit = edit
      .enter()
      .append("div").classed("row col-md-12",true) 
      .append("div").classed("action col-md-6",true)

    action.edit(newEdit,onSave)
    
  }

  return action
})(RB.crusher.ui.action || {})  
