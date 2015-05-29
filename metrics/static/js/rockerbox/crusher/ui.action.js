var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  var crusher = RB.crusher

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

    this.select("h5").text("Edit an action")
    this.select(".save").text("Update action")  

    var actions = crusher.actionData // this should really be in the controller
    var onSave = callback
    urls = actions[0].values
    action.showAll(actions,onSave,urls)

    action.select(objectData)

    callback(objectData,this)

  }

  action.edit = function(edit,onSave) {

    var edits = edit.selectAll(".action")
      .data(function(x){return [x]},function(x){return x.action_id})

    var newEdit = edits.enter()
      .append("div")
      .classed("action",true)

    edits.exit()
      .remove()

    newEdit.append("h5") 
      .text(function(x){
        return x.action_id ? "Edit an action" : "Create an action"
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

    var patterns = newEdit.selectAll(".action-patterns")
      .data(function(x){
        if (x.url_pattern) {
          x.rows = x.url_pattern.map(function(y){
            return {"url_pattern":y,"values":x.values}
          })
        }
        return [x]
      })

    var newPatterns = patterns
      .enter()
        .append("div")
        .classed("action-patterns",true)

    if (newPatterns.length) action.pattern.add.bind(newPatterns)(false)

    newEdit.append("div")
      .style("padding","10px")
      .style("padding-top","0px") 
      .append("a")
      .classed("bottom btn btn-primary btn-sm pull-right",true)
      .text("Add Pattern")
      .on("click", action.pattern.add.bind(newPatterns))

    newEdit.append("a")
      .text(function(x) {return x.action_id ? "Update Action" : "Define Action"})
      .classed("save btn btn-success btn-sm",true)
      .on("click", action.save.bind(newEdit,onSave))
  }

  action.show = function(target,onSave,expandTarget) {

    var h5 = target.selectAll("div").data(function(x){return [x]})
    h5.enter().append("div").classed("",true)

    var spans = h5.selectAll("span").data(function(x){return [x]})
    spans.enter().append("span")
    spans.text(function(x){ return x.action_name })

    h5.selectAll(".edit").data(function(x){return [x]}).enter()
      .append("button")
      .classed("edit btn  btn-xs pull-right",true)
      .text("edit")
      .on("click",function(){
        var edit = d3.select(this.parentNode)
        var data = edit.datum()

        action.select(data)

        expandTarget.datum(data)
        action.edit(expandTarget,onSave)
      }) 

    h5.selectAll(".remove").data(function(x){return [x]}).enter() 
      .append("button")
      .classed("remove btn btn-danger btn-xs pull-right",true)
      .text("remove")
      .on("click",function(){
        var edit = d3.select(this.parentNode.parentNode)
        edit.remove()
        crusher.controller.delete_action(edit.datum())
      })  

      
  }

  action.showAll = function(actions,onSave,urls) {

    var selected = d3.selectAll(".action-wrapper").selectAll(".action")
      .data(actions)

    selected.enter().append("div")
      .classed("list-group-item action",true)

    var expandTarget = d3.selectAll(".action-view-wrapper")

    action.show(selected,onSave,expandTarget) 
    action.add_action(urls)

  }

  action.select = function(data) {
    var selected = d3.selectAll(".action-wrapper").selectAll(".action")
      .classed("active",false)
      .filter(function(x) { return x == data })
      .classed("active",true)
    
  }

  action.add_action = function(dd) {
    var wrapper = d3.selectAll(".add-action-wrapper")
    var action_wrapper = d3.selectAll(".action-view-wrapper") 

    wrapper.selectAll(".button-wrapper")
      .data([{}])
      .enter()
        .append("div").classed("button-wrapper",true)
        .append("button")
        .classed("btn btn-xs",true)
        .text("New action")
        .on("click",crusher.controller.new_action.bind(this,action_wrapper,dd))
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
      .append("div").classed("row",true) 
      .append("div").classed("action",true)

    action.edit(newEdit,onSave)
    
  }

  action.buildBase = function() {
    var actionsRow = d3.selectAll(".container")
      .append("div")
      .classed("row actions",true)

    var action_wrapper = actionsRow
      .append("div")
      .classed("action-view-wrapper col-md-6",true)
     

    var action_wrapper = actionsRow
      .append("div")
      .classed("action-list-wrapper col-md-6",true)

    action_wrapper
      .append("h5").text("Advertiser Actions")

    action_wrapper
      .append("div").classed("list-group action-wrapper",true)

    action_wrapper
      .append("div").classed("add-action-wrapper",true) 
  }

  return action
})(RB.crusher.ui.action || {})  
