var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  var crusher = RB.crusher

  action.save = function(callback) {

    var data = this.selectAll(".action-pattern .tt-input")[0].map(function(x){return x.value}) 

    var d = data 
    var objectData = this.datum()
    objectData.url_pattern = d
    objectData.action_name = this.selectAll("input").node().value
    objectData.operator = this.selectAll(".operator").node().value


    delete objectData['visits_data']

    this.select("h5").text("Edit an action")
    this.select(".save").text("Update action")  

    var actions = crusher.cache.actionData // this should really be in the controller

    if (!objectData.action_id) actions.push(objectData)

    var onSave = callback
    urls = actions[0].values

    //action.showAll(actions,onSave,urls)
    //action.select(objectData)
    action.view(d3.select(this.node().parentNode))

    callback(objectData,this)

  }

  action.status = function(wrapper) {


    var status = d3_updateable(wrapper,".action-status","div")
      .classed("action-status",true)

    var wrapper = d3_updateable(status,".status-wrapper","div")
      .classed("status-wrapper col-md-6",true)

    var series = d3_updateable(wrapper,".series","div")
      .classed("series",true)

    d3_updateable(series,".title","div")
      .classed("title",true)
      .text("Cache stats")

    var percent_bar = d3_updateable(series,".percent-bar","div")
      .classed("percent-bar",true)

    d3_updateable(percent_bar,".value","div")
      .classed("value",true)
      .text(function(x){return x.pattern_stats.completed + " days"})

    d3_updateable(percent_bar,".description.percent","div")
      .classed("description percent",true)
      .text(function(x){return "Percent complete: " + d3.format("%")(x.pattern_stats.percent_complete)})
      .style("color","#000")

    var progress = d3_updateable(percent_bar,".progress","div")
      .classed("progress",true)
      .style("height","12px")
      .style("margin-top","5px")


    d3_updateable(progress,".progress-bar-striped","div")
      .classed("progress-bar progress-bar-striped",true)
      .attr("role","progressbar")
      .attr("aria-valuenow",function(x){return 100*x.pattern_stats.percent_complete}) 
      .attr("aria-valuemin","0")
      .attr("aria-valuemax","100") 
      .style("width",function(x){return (x.pattern_stats.percent_complete*100) + "%"})


    d3_updateable(series,".description.timeseries","div")
      .classed("description timeseries",true)
      .text("Time to complete cache days")



    var newTs = d3_updateable(series,".values","div")
      .classed("values",true)


    var ts = RB.rho.ui.buildTimeseries(newTs,newTs.datum().pattern_stats.raw,"Seconds",["seconds"], undefined)
    
    newTs.selectAll("circle").filter(function(x){return x.completed == 0 }).attr("fill","red")


    var missingWrapper = d3_updateable(series,".missing-wrapper","div")
      .classed("missing-wrapper",true)

    var missingDescription = d3_splat(missingWrapper,".description","div",function(x){
      var values = x.pattern_stats.raw.filter(function(y){return y.completed == 0 })
      return values.length ? [true] : []
    },function(x){return x.key})
      .classed("description",true)
      .style("padding-top","10px")
      .style("padding-bottom","15px")
      .style("color","#000")
      .text("The following dates were not properly cached or are actively running")

    missingDescription.exit().remove()

    var missing = d3_splat(missingWrapper,".missing","div",function(x){
      var values = x.pattern_stats.raw.filter(function(y){return y.completed == 0 })
      return values
    },function(x){return x.key})
      .classed("missing",true)
      .style("min-height","30px")

    d3_updateable(missing,".btn","a")
      .classed("btn btn-danger btn-xs pull-right",true)
      .text("Re-run")
      .attr("href",function(x){return "/crusher/pattern?pattern=" + x.url_pattern + "&cache_date=" + (new Date(x.cache_date*1000)).toISOString().split("T")[0] })
      .on("click",function(x){
        var self = this
        d3.json(this.href,function(err,dd){
          d3.select(self).attr("disabled",true)
          console.log(dd)
          return dd
        })
        d3.event.preventDefault()
        return false
      })

    d3_updateable(missing,".btn-label","div")
      .classed("btn-label",true)
      .text(function(x){return (new Date(x.cache_date*1000)).toISOString().split("T")[0] })



  }

  action.preview = function(wrapper) {
    var actionView = wrapper.selectAll(".action-view")
      .data(function(x){return [x]},function(x){return x.action_id + x.action_name})
      
    actionView.enter()
      .append("div")
      .classed("action-view",true)
      .classed("hidden",function(x){return !x.action_id})

    actionView.exit().remove()

    var h5 = actionView.selectAll("h5").data(function(x){return [x.action_name]})
    h5.enter().append("h5").text(function(x) { return "Action > " + x } )
      .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-30px;margin-right:-30px")
      .classed("heading",true)
    h5.exit().remove()

    var edit = d3_updateable(h5,".pull-right.edit","a")
      .classed("pull-right edit btn btn-default btn-sm", true)
      .style("margin-right","30px")
      .style("margin-top","20px")

     
      

    edit.text("Edit")
      .on("click",function(){
        d3.select(".action").classed("hidden",false)
      })

    var info = actionView.selectAll(".urls").data(function(x){

      if (!x.visits_data) {
        x.all = [x]
        //crusher.controller.action.get(x,action.view.bind(false,wrapper))
        delete x['all']
      }

      return [x]
    })

    info.enter()
      .append("div").classed("urls",true)

    d3_updateable(info,".description","div")
      .classed("description",true)
      .text(function(x){
        return "These are the analytics details associated with the " + x.action_name + ". Below we summarize on-site and off-site activity."
      })

    info.filter(function(x){console.log(x); return !x.action_id}).remove()


  }

  action.wait = function(wrapper) {
    var info = wrapper.selectAll(".urls")

    d3_updateable(info,".loading","div")
      .classed("loading",true)
      .text(function(x){
        return "Your data is loading..."
      }).style("display","block")


  }

  action.view = function(wrapper) {

    var info = wrapper.selectAll(".urls")

    info.selectAll(".loading").remove()

    var with_data = info.filter(function(x){return x.visits_data})

    var timeseries = with_data.selectAll(".ts").data(function(data){
      var nested = d3.nest()
        .key(function(x){return x.date})
        .rollup(function(x){ 
          
          return {
            "views": x[0].views,
            "visits": x[0].visits,
            "uniques": x[0].uniques
          }
         
        })
        .entries(data.visits_data).map(function(x){
          x.date = x.key
          x.views = x.values.views
          x.visits = x.values.visits
          x.uniques = x.values.uniques
          x.url_pattern = data.url_pattern
          return x
        }).filter(function(x){
          return x.key != ""
        }).sort(function(x,y) {
          return (+new Date(x.date)) - (+new Date(y.date))
        })


      return (nested.length) ? [nested] : []
    },function(x){
      return x[0].url_pattern
    })

    timeseries.exit().remove()
    var newTs = timeseries.enter().append("div").classed("ts",true)

  }

  action.show_timeseries = function(wrapper) {
    var newTs = wrapper.selectAll(".ts")
    var tsData = newTs.datum()
    var urlData = wrapper.datum().urls

    RB.rho.ui.buildTimeseriesSummary(
      newTs,tsData,"Views",["views"], undefined, 
      "This is the number of page views per day"
    )
    RB.rho.ui.buildTimeseriesSummary(
      newTs,tsData,"Visits",["visits"], undefined, 
      "This is the number of unique page views per day"
    )
    RB.rho.ui.buildTimeseriesSummary(
      newTs,tsData,"Uniques",["uniques"], undefined, 
      "This is the number of unique visitors per day"
    )

    
    var pull_left = d3_updateable(newTs,".on-page-wrapper", "div")
      .classed("on-page-wrapper col-md-6",true)

    RB.rho.ui.buildBarSummary(
      pull_left,urlData,"On-site pages",["url"], " ", 
      "Top on-site pages that match the action"
    )
    RB.rho.ui.buildBarSummary(
      pull_left,wrapper.datum().param_rolled,"On-site tracking parameters",["key"], " ", 
      "Top tracking parameters",true
    )
  }

  action.show_domains = function(wrapper) {
    var newTs = wrapper.selectAll(".ts")
    var domainData = wrapper.datum().domains


    RB.rho.ui.buildBarSummary(newTs,domainData,"Off-site opportunities",["domain"], undefined, "Top off-site opportunities for users who have engaged in this on-site action")
  }

  action.edit = function(edit,onSave) {

    var edits = edit.selectAll(".action")
      .data(function(x){return [x]},function(x){return x.action_id + x.action_name})

    var newEdit = edits.enter()
      .append("div")
      .classed("action",true)
      .classed("hidden",function(x){return x.action_id})

    edits.exit()
      .remove()

    newEdit.append("h5") 
      .text(function(x){
        return x.action_id ? "Edit an action" : "Create an action"
      })
      .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-30px;margin-right:-30px")
      .classed("heading",true)


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
      .data(["or"])
      .enter()
        .append("option")

    options 
      .text(String)
      .attr("selected",function(x){
        return "or"//x.operator
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

/*
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
        action.view(expandTarget)
      }) */

    h5.selectAll(".remove").data(function(x){return [x]}).enter() 
      .append("button")
      .classed("remove btn btn-danger btn-sm ",true)
      .text("remove")
      .on("click",function(){
        var edit = d3.select(this.parentNode.parentNode)
        edit.remove()
        crusher.controller.action.delete(edit.datum())
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

  action.showRecommended = function(actions,onSave,urls) {

    var selected = d3.selectAll(".action-recommended-wrapper").selectAll(".action")
      .data(actions)

    selected.enter().append("div")
      .classed("list-group-item action",true)

    var expandTarget = d3.selectAll(".action-view-wrapper")

    action.show(selected,onSave,expandTarget) 

    selected.selectAll(".remove").remove()
    selected.selectAll(".edit").text("build")
      .classed("edit",false)
      .classed("build",true)
      .on("click",function(){
        var edit = d3.select(this.parentNode)
        var data = edit.datum()

        action.select(data)

        expandTarget.datum(data)
        action.edit(expandTarget,onSave)
        action.view(expandTarget)
        d3.select(this.parentNode.parentNode).remove()
      })

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
        .on("click",crusher.controller.action.new.bind(this,action_wrapper,dd))
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
    var target = d3.selectAll(".container")

    var actionsRow = d3_splat(target,".row","div",[{"id":"action"}],function(x){return x.id})
      .classed("row actions",true)

    var viewWrapper = d3_updateable(actionsRow,".action-view-wrapper","div")
      .classed("action-view-wrapper col-md-12",true)

    actionsRow.exit().remove()
     
  }

  return action
})(RB.crusher.ui.action || {})  
