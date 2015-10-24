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
      .attr("href",function(x){return "/crusher/pattern/run?pattern=" + x.url_pattern + "&cache_date=" + (new Date(x.cache_date*1000)).toISOString().split("T")[0] })
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


    var activeWrapper = d3_updateable(series,".active-wrapper","div")
      .classed("active-wrapper",true)

    var activeDescription = d3_splat(activeWrapper,".description","div",function(x){
      var values = x.pattern_stats.raw.filter(function(y){return y.active })
      return values.length ? [true] : []
    },function(x){return x.key})
      .classed("description",true)
      .style("padding-top","10px")
      .style("padding-bottom","15px")
      .style("color","#000")
      .text("The following dates are actively being cached")

    activeDescription.exit().remove()

    var active = d3_splat(activeWrapper,".active","div",function(x){
      var values = x.pattern_stats.raw.filter(function(y){return y.active })
      return values
    },function(x){return x.key})
      .classed("active",true)
      .style("min-height","30px")

    d3_updateable(active,".btn","a")
      .classed("btn btn-danger btn-xs pull-right",true)
      .text("Stop")
      .attr("href",function(x){return "/crusher/pattern/reset?pattern=" + x.url_pattern + "&cache_date=" + (new Date(x.cache_date*1000)).toISOString().split("T")[0] })
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

    d3_updateable(active,".btn-label","div")
      .classed("btn-label",true)
      .text(function(x){return (new Date(x.cache_date*1000)).toISOString().split("T")[0] })


    var queuedWrapper = d3_updateable(series,".queued-wrapper","div")
      .classed("queued-wrapper",true)

    var queuedDescription = d3_splat(queuedWrapper,".description","div",function(x){
      var values = x.pattern_stats.raw.filter(function(y){return y.queued })
      return values.length ? [true] : []
    },function(x){return x.key})
      .classed("description",true)
      .style("padding-top","10px")
      .style("padding-bottom","15px")
      .style("color","#000")
      .text("The following dates are queued")

    queuedDescription.exit().remove()

    var queued = d3_splat(queuedWrapper,".queued","div",function(x){
      var values = x.pattern_stats.raw.filter(function(y){return y.queued })
      return values
    },function(x){return x.key})
      .classed("queued",true)
      .style("min-height","30px")

    d3_updateable(queued,".btn","a")
      .classed("btn btn-danger btn-xs pull-right",true)
      .text("Dequeue")
      .attr("href",function(x){
        return "/crusher/pattern/clear?pattern=" + 
          x.url_pattern + "&cache_date=" + (new Date(x.cache_date*1000)).toISOString().split("T")[0] 
      })
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

    d3_updateable(queued,".btn-label","div")
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

    action.show_cloud(pull_left,urlData)

    RB.rho.ui.buildBarSummary(
      pull_left,urlData,"On-site pages",["url"], " ", 
      "Top on-site pages that match the action"
    )

    RB.rho.ui.buildBarSummary(
      pull_left,wrapper.datum().param_rolled,"On-site tracking parameters",["key"], " ", 
      "Top tracking parameters",true
    )

    


  }

  action.show_cloud = function(wrapper,urlData) {

    var swrap = d3_updateable(wrapper,".cloud","div")
      .classed("cloud series-wrapper",true)

    var series = d3_updateable(swrap,".series","div")
      .classed("series cloud",true)

    d3_updateable(series,".title","div")
      .classed("title",true)
      .text("On-site Keywords")

    d3_updateable(series,".value","div")
      .classed("value",true)

    d3_updateable(series,".description","div")
      .classed("description",true)
      .text("These are the keywords associated with on-site pages")



    wrapper = series

    function parse(url) {
      try {
    
        var kws = url.split(".com")[1].replace(/_/g,"-").replace(/\//g,"-").split(".")[0].split("-").filter(function(x){
          return x.length > 2
        }).map(function(x){return x.toLowerCase() }).filter(function(x){
          return x.indexOf("=") == -1
        })
    
        return kws
      } catch(e) {return []}
    }
    
    
    function increment_and_add(bag,inverse_bag,word) {
      if (! bag[word]) 
      bag[word] = Object.keys(bag).length
      inverse_bag[bag[word]] = word
    }
    
    function build_relations(relations, word1, word2, value) {
      var h = relations[word1] || {}
      h[word2] = (h[word2] || 0) + value
      relations[word1] = h
    }
    
    function combinations(head, tail, results) {
    	
    	if (tail.length == 0) {
    	    return results
    	}
    
     	if (head == undefined) {
     	    head = tail[0]
     	    tail = tail.slice(1,tail.length)
     	}
    
        Array.prototype.push.apply(results,tail.map(function(x){return [x,head]}))
    
        head = tail[0]
     	tail = tail.slice(1,tail.length)
    
    	return combinations(head, tail, results)
    }
    
    
    var bag = {}, relations = {}, inverse_bag = {}
    
    kw_counts = urlData.map(function(x){return {"keywords":parse(x.url),"count":x.count}}).sort(function(x,y){return y.count - x.count}).slice(0,40)
    kw_counts.map(function(x) { return x.keywords.map(function(y){ increment_and_add(bag,inverse_bag,y) }) })
    
    
    kw_counts.map(function(item) {
      var combos = combinations(undefined,item.keywords,[])
      combos.map(function(combo){
        build_relations(relations,combo[0],combo[1],item.count)
      })
    })
    
    var groups = Object.keys(bag).map(function(key){
      return {"name":key,"group":bag[key]}
    })
    
    var links = []
    Object.keys(relations).map(function(first){
      var values = Object.keys(relations[first]).map(function(second){
        return {"target":bag[first],"source":bag[second],"value":relations[first][second]}
      })
      Array.prototype.push.apply(links, values)
    })

    var popular = {}
    links.map(function(x) {
      popular[x.source] = (popular[x.source] || 0) + 1
      popular[x.target] = (popular[x.target] || 0) + 1
    })
    
    var top100 = Object.keys(popular).map(function(x){
      return {"key":x,"value":popular[x]}
    })
    .sort(function(x,y){return y.value - x.value})
    .filter(function(x){
      return parseInt(inverse_bag[x.key]) != inverse_bag[x.key].replace(/ /,"")
    })
    .slice(0,30).map(function(x){ return parseInt(x.key) })



    var max_link_value = 0

    var new_links = links.filter(function(x){
      
      if ((top100.indexOf(x.target) != -1) && (top100.indexOf(x.source) != -1) ) {
        console.log(x.target, x.source, top100.indexOf(x.target), top100.indexOf(x.source))
        max_link_value = Math.max(max_link_value,x.value)
        return true
      } else {
        return false
      }
    })

    var new_groups = groups.filter(function(x){
      return top100.indexOf(x.group) != -1
    })

    var data = {'links': links, 'nodes': groups}


    var width = parseInt(wrapper.style("width").replace("px","") - 30),
    height = 370;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-150)
    .linkDistance(75)
    .size([width-50, height-30]);

var svg = d3_updateable(wrapper,".svg-cloud","svg")
    .classed("svg-cloud",true)
    .attr("width", width)
    .attr("height", height);



var fn = function(graph) {


  force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = svg.selectAll(".link")
      .data(graph.links)
    .enter().append("line")
      .attr("class", "link")
      .style("stroke-width", function(d) { return Math.sqrt(d.value/max_link_value*200); });


link.filter(function(x){
  return x.target.weight < 2 || x.source.weight < 2
}).remove()



var gnodes = svg.selectAll('g.gnode')
  .data(graph.nodes)
  .enter()
  .append('g')
  .classed('gnode', true);

gnodes.filter(function(x){
  return x.weight < 2
}).remove()

// Add one circle in each group
var node = gnodes.append("circle")
  .attr("class", "node")
  .attr("r", function(x) {
    return x.name == "convertor" ? 30 : Math.max(Math.log(x.weight)*3.9,5)
  })
  .style("fill", function(d) { return color(d.group); })
  .call(force.drag);

// Append the labels to each group
var labels = gnodes.append("text")
  .text(function(d) { return d.name; });


  node.append("title")
      .text(function(d) { return d.name; });

 force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    gnodes.attr("transform", function(d) { 
        return 'translate(' + [d.x, d.y] + ')'; 
    });
      
    
      
  });

  
};

fn(data)

    

  }

  action.show_domains = function(wrapper) {
    var newTs = wrapper.selectAll(".ts")
    var domainData = wrapper.datum().domains

    var categoryData = d3.nest()
      .key(function(x){return x.category_name})
      .rollup(function(x){
        return d3.sum(x.map(function(y){return y.count}))
      }) 
      .entries(domainData)

    RB.rho.ui.buildBarSummary(newTs,domainData,"Off-site opportunities",["domain"], undefined, "Top off-site opportunities for users who have engaged in this on-site action")
    RB.rho.ui.buildBarSummary(newTs,categoryData,"Off-site categories",["key"], undefined, "Top off-site categories users visit")

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
