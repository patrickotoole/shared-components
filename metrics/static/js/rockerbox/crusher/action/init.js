var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.action = RB.crusher.ui.action || {}

RB.crusher.ui.action.init = (function(init,action,crusher) {

  init.NAME = "action.init"
  init.SUBSCRIBE = ["action_show","action_all","actions"]
  init.PUBLISH = ["action_initialized"]
  init.EVENTS = ["action_show","action_all","action_initialized"]

  init.subscription = function(action) {

    var target = d3.selectAll(".action-view-wrapper")
    target.datum(action)

    crusher.ui.action.edit(target,RB.crusher.controller.action.save)
    crusher.cache.actionData.map(function(x) { x.values = crusher.cache.urls_wo_qs })
    crusher.ui.action.preview(target)
    

    return action
  }

  return init
  
})(RB.crusher.ui.action.init || {}, RB.crusher.ui.action,RB.crusher);

RB.component.export(RB.crusher.ui.action.init, RB.crusher.ui.action)




RB.crusher.ui.action.wait = (function(wait,action,crusher) {

  wait.NAME = "action.wait"
  wait.SUBSCRIBE = ["action_initialized"]
  wait.PUBLISH = ["actionTimeseries"]
  wait.EVENTS = ["action_initialized"]

  var prepAction = function(action) {
    action.action_string = action.url_pattern.map(function(x){return x.split(" ").join(",")}).join("|")
  }

  wait.subscription = function(action) {

    var target = d3.selectAll(".action-view-wrapper")
    
    crusher.ui.action.wait(target)
    prepAction(action)


    return action
  }

  return wait

})(RB.crusher.ui.action.wait || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.wait, RB.crusher.ui.action)



RB.crusher.ui.action.status = (function(status,action,crusher) {

  status.NAME = "action.status"
  status.SUBSCRIBE = ["pattern_status"]
  status.PUBLISH = []
  status.EVENTS = []

  status.subscription = function(data) {

    crusher.permissions("cache_stats", function(){
      var target = d3.selectAll(".action-view-wrapper").selectAll(".action-view")
      crusher.ui.action.status(target)
    })
    
    return data
  }

  return status

})(RB.crusher.ui.action.status || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.status, RB.crusher.ui.action)





RB.crusher.ui.action.show = (function(show,action,crusher) {

  show.NAME = "action.show"
  show.SUBSCRIBE = ["action_initialized","actionTimeseries"]
  show.PUBLISH = ["tf_idf_action","pattern_status"]
  show.EVENTS = []

  show.subscription = function(data) {

    var target = d3.selectAll(".action-view-wrapper")
    
    crusher.ui.action.view(target)
    crusher.ui.action.show(target)
    crusher.ui.action.show_timeseries(target)
    

    return data
  }

  return show

})(RB.crusher.ui.action.show || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)



RB.crusher.ui.action.domains = (function(domains,action,crusher) {

  domains.NAME = "action.domains"
  domains.SUBSCRIBE = ["tf_idf_action"]
  domains.PUBLISH = ["actionClusters"]
  domains.EVENTS = []

  domains.subscription = function(data) {

    var target = d3.selectAll(".action-view-wrapper")
    crusher.ui.action.show_domains(target)


    return data
  }

  return domains

})(RB.crusher.ui.action.domains || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.domains, RB.crusher.ui.action)



RB.crusher.ui.action.clusters = (function(clusters,action,crusher) {

  clusters.NAME = "action.clusters"
  clusters.SUBSCRIBE = ["actionClusters"]
  clusters.PUBLISH = []
  clusters.EVENTS = []

  clusters.subscription = function(data) {

    var target = d3.selectAll(".action-view-wrapper")
    crusher.ui.action.show_clusters(target)
    
    return data
  }

  return clusters

})(RB.crusher.ui.action.clusters || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.clusters, RB.crusher.ui.action)



RB.crusher.ui.action.resize = (function(resize,action,crusher) {

  resize.NAME = "action.resize"
  resize.SUBSCRIBE = ["resize"]
  resize.PUBLISH = []
  resize.EVENTS = ["resize"]

  resize.subscription = function(data) {

    var target = d3.selectAll(".action-view-wrapper")
    
    crusher.ui.action.show_domains(target)
    crusher.ui.action.show_timeseries(target)

    return data
  }

  return resize

})(RB.crusher.ui.action.resize || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.resize, RB.crusher.ui.action)





RB.crusher.ui.action.last = (function(last,action,crusher) {

  last.NAME = "action.last"
  last.SUBSCRIBE = ["tf_idf_action","actionTimeseries"]
  last.PUBLISH = []
  last.EVENTS = []

  last.subscription = function(data) {
    RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)
  }

  return last

})(RB.crusher.ui.action.last || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.last, RB.crusher.ui.action)


