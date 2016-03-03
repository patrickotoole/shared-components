var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.action = RB.crusher.ui.action || {}

RB.crusher.ui.action.init = (function(init,action,crusher) {

  init.NAME = "action.init"
  init.SUBSCRIBE = ["action_all","actions","action_show"]
  init.PUBLISH = ["action_initialized"]
  init.EVENTS = ["action_show","action_all","action_initialized"]

  init.subscription = function(action) {


    var target = d3.selectAll(".action-view-wrapper")
    target.datum(action)

    //crusher.ui.action.edit(target,RB.crusher.controller.action.save)
    crusher.ui.action.show(target)
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
  show.PUBLISH = ["tf_idf_action"]//,"pattern_status"]
  show.EVENTS = []

  show.subscription = function(data,ts) {

    var target = d3.selectAll(".action-view-wrapper")

    if (data.action_id != ts.action_id) {
      throw "YO"
    }

    crusher.ui.action.view(target)
    crusher.ui.action.show_timeseries(target)

    crusher.ui.tabs.build(target)

    var abody = d3_updateable(target,".action-body","div")
      .classed("action-body row",true)
      .style("margin-left","-15px")
      .style("margin-right","-15px")



    var opp = d3_updateable(abody,".advertiser-opportunities","div")
      .classed("series-wrapper col-md-12 advertiser-opportunities false",true)

    opp.classed("selected",opp.classed("selected"))
    opp.classed("hidden",!opp.classed("selected"))

    opp
      .append("div").classed("bar series loading-icon",true)
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading opportunity data... ')



    var cluster = d3_updateable(abody,".action-clusters","div")
      .classed("series-wrapper col-md-12 action-clusters clusters",true)

    cluster.classed("selected",cluster.classed("selected"))
    cluster.classed("hidden",!cluster.classed("selected"))

    cluster
      .append("div").classed("bar series loading-icon",true)
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading cluster data...')



    var timing = d3_updateable(abody,".action-timing","div")
      .classed("series-wrapper col-md-12 action-timing timing",true)

    timing.classed("selected",timing.classed("selected"))
    timing.classed("hidden",!timing.classed("selected"))

    timing
      .append("div").classed("bar series loading-icon",true)
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading timing data...')



    var comparison = d3_updateable(abody,".action-comparison","div")
      .classed("series-wrapper col-md-12 action-comparison comparison",true)

    comparison.classed("selected",comparison.classed("selected"))
    comparison.classed("hidden",!comparison.classed("selected"))

    comparison
      .append("div").classed("bar series loading-icon",true)
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading comparison data...')




    var full_url = d3_updateable(abody,".action-full_url","div")
      .classed("series-wrapper col-md-12 action-full_url full_url",true)

    full_url.classed("selected",full_url.classed("selected"))
    full_url.classed("hidden",!full_url.classed("selected"))

    full_url
      .append("div").classed("bar series loading-icon",true)
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading full URL data...')



    var before = d3_updateable(abody,".before-and-after","div")
      .classed("series-wrapper col-md-12 before-and-after",true)

    before.classed("selected",before.classed("selected"))
    before.classed("hidden",!before.classed("selected"))


    before
      .append("div").classed("bar series loading-icon",true)
      .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading before and after...')


    if (abody.selectAll(".selected").size() == 0) {
      opp.classed("selected",true)
      opp.classed("hidden",false)
    }




    return data
  }

  return show

})(RB.crusher.ui.action.show || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.show, RB.crusher.ui.action)



RB.crusher.ui.action.domains = (function(domains,action,crusher) {

  domains.NAME = "action.domains"
  domains.SUBSCRIBE = ["action_initialized","tf_idf_action"]
  domains.PUBLISH = ["actionClusters","actionBeforeAndAfter"]
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
    try {
      crusher.ui.action.show_clusters(target)
    } catch(e) {
      console.log("Failed to load clusters for action", e)
    }

    return data
  }

  return clusters

})(RB.crusher.ui.action.clusters || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.clusters, RB.crusher.ui.action)



RB.crusher.ui.action.comparison = (function(comparison,action,crusher) {
  comparison.NAME = "action.comparison"
  comparison.SUBSCRIBE = ["action_initialized","actionTimeseries", "actions", "tf_idf_action"]
  comparison.PUBLISH = []
  comparison.EVENTS = []
  comparison.subscription = function(data, actionTimeseries, actions, idf) {
    var target = d3.selectAll(".action-view-wrapper")
    crusher.ui.action.show_comparison(target, actions, data)
    return data;
  }

  return comparison

})(RB.crusher.ui.action.comparison || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.comparison, RB.crusher.ui.action)





RB.crusher.ui.action.full_url = (function(full_url,action,crusher) {
  full_url.NAME = "action.full_url"
  full_url.SUBSCRIBE = ["action_initialized","actionTimeseries"]
  full_url.PUBLISH = []
  full_url.EVENTS = []
  full_url.subscription = function(action) {
    var target = d3.selectAll(".action-view-wrapper")
    crusher.ui.action.show_full_url(target, action)
  }

  return full_url;

})(RB.crusher.ui.action.full_url || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.full_url, RB.crusher.ui.action)





RB.crusher.ui.action.behavior = (function(behavior,action,crusher) {

  behavior.NAME = "action.behavior"
  behavior.SUBSCRIBE = ["actionBeforeAndAfter"]
  behavior.PUBLISH = []
  behavior.EVENTS = []

  behavior.subscription = function(data) {

    var target = d3.selectAll(".action-view-wrapper")
    d3_updateable(target,".action-body","div")
      .classed("action-body",true)
      .style("margin-left","-15px")
      .style("margin-right","-15px")


      setTimeout(function() {
    crusher.ui.action.show_behavior(target)
    crusher.ui.action.show_timing(target)
      },1)


    return data
  }

  return behavior

})(RB.crusher.ui.action.behavior || {}, RB.crusher.ui.action,RB.crusher)

RB.component.export(RB.crusher.ui.action.behavior, RB.crusher.ui.action)




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
