var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.funnel = (function(funnel) {

  var crusher = RB.crusher

  var FUNNEL_ALL       = "funnel_all",
      FUNNEL_RENDERED  = "funnel_rendered",
      DOMAINS_RENDERED = "domains_rendered",
      AVAILS_RENDERED  = "avails_rendered",
      FUNNEL_SHOW      = "funnel_show",
      FUNNEL_UIDS      = "funnel_uids",
      FUNNEL_AVAILS    = "funnel_avails",
      FUNNEL_DOMAINS   = "funnel_domains"

  funnel.events = {}
  funnel.events[FUNNEL_RENDERED] = true
  funnel.events[DOMAINS_RENDERED] = true
  funnel.events[AVAILS_RENDERED] = true
  funnel.events[FUNNEL_SHOW] = true
  funnel.events[FUNNEL_ALL] = true

  funnel.services = {}
  funnel.services[FUNNEL_UIDS] = function(cb,data){
    var q = queue(5) 
    crusher.api.funnelUIDs(data,q) 
    q.awaitAll(function(){ cb.apply(false,[data]) })
  }
  funnel.services[FUNNEL_AVAILS] = function(cb,data){
    var q = queue(5)
    crusher.api.funnelAvails(data.actions,q)
    q.awaitAll(function(){ cb.apply(false,[data]) })
  }
  funnel.services[FUNNEL_DOMAINS] = function(cb,data){
    var q = queue(5)
    crusher.api.funnelDomains(data.actions,q)
    q.awaitAll(function(){ cb.apply(false,[data]) })
  }

  funnel.subscriptions = [
    {
      "name":"show",
      "subscribe": [FUNNEL_SHOW],
      "callback": function(data){
        var funnel = crusher.ui.funnel.buildShow()

        crusher.ui.funnel.wait(funnel)
        crusher.subscribe.publishers[FUNNEL_UIDS](data)
      }
    },
    {
      "name":"init",
      "subscribe": [FUNNEL_ALL,"actions","funnels","campaigns","lookalikes","lookalikeCampaigns"],
      "callback": function(funnel){
        
        crusher.permissions("retargeting",crusher.api.helpers.attachCampaigns)
        crusher.permissions("lookalike",crusher.api.helpers.attachLookalikes)

        var data = crusher.cache.funnelData 
        if (funnel.funnel_id) {
          data = data.filter(function(x){return x.funnel_id == funnel.funnel_id})
        }

        crusher.ui.funnel.buildEdit(data,crusher.cache.actionData)
        crusher.controller.funnel.show() 
      }
    },
    {
      "name": "show_funnel",
      "subscribe": [FUNNEL_UIDS],
      "callback": function(data){

        var funnel = crusher.ui.funnel.buildShow()

        crusher.ui.funnel.show(funnel)
        crusher.subscribe.publishers[FUNNEL_RENDERED]()
        crusher.subscribe.publishers[FUNNEL_DOMAINS](data)
        crusher.subscribe.publishers[FUNNEL_AVAILS](data) 
      }
    },
    {
      "name": "show_domains",
      "subscribe": [FUNNEL_RENDERED,FUNNEL_DOMAINS],
      "callback": function(_,data) {
        data.funnel_domains = data.actions[data.actions.length-1].funnel_domains

        var funnel = crusher.ui.funnel.buildShow(),
          is_lookalike = crusher.permissions.bind(false,"lookalike"),
          render_lookalike = crusher.ui.funnel.show.component.lookalike.bind(false,funnel)

        is_lookalike(render_lookalike)
        crusher.subscribe.publishers[DOMAINS_RENDERED](data)
        crusher.subscribe.publishers["tf_idf_funnel"](data)
      }
    },
    {
      "name": "show_avails",
      "subscribe": [FUNNEL_RENDERED,FUNNEL_AVAILS],
      "callback": function(_,data) {
        var funnel = crusher.ui.funnel.buildShow()
        var exchanges = funnel.selectAll(".exchange-summary .exchange")

        var funnel = crusher.ui.funnel.buildShow(),
          is_retargeting = crusher.permissions.bind(false,"retargeting"),
          render_retargeting = crusher.ui.funnel.show.component.campaign.bind(false,funnel)
      
        is_retargeting(render_retargeting)
        crusher.ui.funnel.show.component.avails(exchanges)
      }
    },
    {
      "name": "show_idf",
      "subscribe": [DOMAINS_RENDERED,"tf_idf_funnel"],
      "callback": function(_,data) {
        var funnel = crusher.ui.funnel.buildShow()
        crusher.ui.funnel.show.component.domains.bind(false,funnel)(data)
      }
    }
  ]

  funnel.register_subscribers = function() {
    funnel.subscriptions.map(function(subscription){
      crusher.subscribe.add_subscriber(
        subscription.subscribe,
        subscription.callback,
        subscription.name,
        false,false
      )
    })
  }

  funnel.register_publishers = function() {

    Object.keys(funnel.services).map(function(key){
      crusher.subscribe.register_publisher(key,funnel.services[key])
    })

    Object.keys(funnel.events).map(function(key){
      crusher.subscribe.register_dummy_publisher(key)
    })

  }


  funnel.methods = {
    remove_action: function(actions,action) {
      var data = actions.datum()

      data.actions = data.actions.filter(function(x){
        return x.action_id != action.action_id
      })

      actions.selectAll(".action").filter(function(x){
        return x.action_id == action.action_id
      }).remove()

      actions.selectAll("span.step")
        .text(function(x,i){return "Step " + (i+1) + ": "}) 
    },
    add_action: function(actions,options,current) {

      var data = actions.datum()
      data.actions = data.actions.filter(function(x){return x.action_id != 0})

      var current = data.actions.indexOf(current) + 1
      data.actions.splice(current,0, {
        "action_id":0,
        "action_name":"",
        "url_pattern":[]
      })           

      data.actions.map(function(x,i){x.pos = i + 1})
      actions.datum(data)

      funnel.action.build(d3.select(actions.node().parentNode),options)
     
    },
    add_funnel: function(target,action_data) {
      var data = [{"funnel_name":"","actions":[]}]

      var newFunnel = d3_splat(target,".funnel","div",data,function(x){return x.funnel_id})
        .classed("funnel",true)

      newFunnel
        .exit().remove()

      funnel.edit(newFunnel,action_data)

    },
    save_funnel: function() {

      var action_data = d3.select('.funnel-list-wrapper').datum()
      var this_funnel = d3.select(this.parentElement.parentElement.parentElement)
      var data = this_funnel.datum()

      var show = d3_updateable(this_funnel,".show","div").classed("show",true)

      data.funnel_name = this_funnel.selectAll("input.funnel-name").property("value")
      crusher.controller.funnel.save(data,function(x,TYPE){
        
        funnel.register_publishers(show.datum()) // dont forget to register the funnel before showing it!
        
        RB.routes.navigation.back()
        setTimeout(function(){
          RB.routes.navigation.forward({
            "name": "View Existing Funnels",
            "push_state":"/crusher/funnel/existing",
            "skipRender": true,
            "values_key":"funnel_name"    
          })
          RB.routes.navigation.forward(data)
        },1)
        
      })



    },
    compute_uniques: function(actions) {
       
      return actions.reduce(function(p,c){
        
        var intersected = []

        if (p == false) { intersected = c.uids } 
        else {
          c.uids.map(function(x){
            if (p.indexOf(x) > -1) intersected.push(x)
          })
        }
        
        c.funnel_percent = p == false ? 1 : (intersected.length / p.length)
        c.funnel_uids = intersected
        c.funnel_count = c.funnel_uids.length

        return c.funnel_uids
      }, false)                   
    },
    select: function(x){
      var current = this
      var options = d3.select(this.parentNode).datum()
    
      d3.select(this.parentNode.parentNode).selectAll(".funnel")
        .classed("active",function(x){return this == current})
    
      var target = d3.selectAll(".funnel-view-wrapper").selectAll(".funnel-wrapper")

      var f = target.selectAll(".funnel").data([x],function(y){return y.funnel_id})
      f.enter().append("div").classed("funnel",true)
      f.exit().remove()
    
      funnel.edit(f,options)
      var show = funnel.buildShow()
    
      crusher.controller.funnel.show(
        f.datum(),
        funnel.show.bind(false,show),
        funnel.wait.bind(false,show)
      )
    
    }
  } 

  funnel.buildEdit = function(funnel_data, action_data) {
    
    var target = d3.selectAll(".funnel-wrapper")
    var data = funnel_data[0] ? [funnel_data[0]] : []

    var funnels = d3_splat(target,".funnel","div",data)
      .classed("funnel",true)

    d3_updateable(funnels,"h5","h5")
      .text("Edit a funnel")

    funnel.edit(funnels,action_data)
          
  }

  funnel.buildBase = function() {

    funnel.register_publishers()
    funnel.register_subscribers()

    var target = d3.selectAll(".container")
    var rowData = [{"id":"funnel"}]

    var funnelRow = d3_splat(target,".row","div",rowData,function(x){return x.id})
      .classed("row funnels",true)

    var viewWrapper = d3_updateable(funnelRow,".funnel-view-wrapper","div")
      .classed("funnel-view-wrapper",true)

    d3_updateable(viewWrapper,".funnel-wrapper","div")
      .classed("funnel-wrapper",true)

    d3_updateable(funnelRow,".funnel-list-wrapper","div")
      .classed("funnel-list-wrapper col-md-6",true)

    funnelRow.exit().remove()
    
  }

  

  funnel.add_action = funnel.methods.add_action
  funnel.add_funnel = funnel.methods.add_funnel
   

  return funnel
})(RB.crusher.ui.funnel || {})   
