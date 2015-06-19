var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}

RB.crusher.ui.funnel.campaign = (function(campaign){

  var crusher = RB.crusher
  var registered

  campaign.methods = {
    // for all these functions, this is bound to the row...
    update: function(x) {
      var id = x.action_id
      var campaign = this.filter(function(y){return y.action_id == id})

      var f = campaign.selectAll("div.daily-freq input").property("value")
      var imps = f * (x.avails_raw.avails)

      var p = campaign.selectAll("div.bid-price input").property("value")

      campaign.selectAll("div.estimated-imps span.value").text(d3.format(",")(imps))
      campaign.selectAll("div.estimated-cost span.value").text(d3.format("$.2")(imps * p / 1000))

    },
    toggle: function(x){
      var selected = this.filter(function(c) {return c == x})
      var ischecked = selected.selectAll("input[type=checkbox]").property("checked")

      var freq = selected.selectAll('.daily-freq input').property("value")
      var price = selected.selectAll('.bid-price input').property("value")
      var obj = {
        details: {
          funnel_id: x.funnel_id,
          step: x.order,
          funnel_name: selected[0][0].parentNode.__data__.funnel_name,
        },
        campaign: {
          state: ischecked ? "active" : "inactive",
          base_bid: parseFloat(price),
          daily_budget: x.avails_raw.avails * freq * price / 1000
        },
        profile: {
          max_day_imps: freq 
        }
      }

      crusher.controller.campaign.save(obj,x)
       
    }
  }

  campaign.build = function(wrapper) {

    // NEED TO MAKE THIS BUILD STEP DEPENDENT ON AVAILABILITY

    var camp = campaign.row(wrapper)
    campaign.info(camp) 
    campaign.settings(camp)
    campaign.estimates(camp)
    campaign.reporting(camp)
    campaign.debug(camp)


    camp.sort(function(x,y){return x.pos - y.pos})
    camp.exit().remove()
  }

  

  campaign.row = function(wrapper) {
    return d3_splat(wrapper,"div.campaign","div",function(x){return x.actions},function(x){return x.action_id})
      .classed("campaign row",true)
      .style("padding-bottom","15px")
      .style("border-bottom","1px solid #f0f0f0")
      .style("margin-bottom","15px")
  }

  campaign.debug = function(row) {
    d3_updateable(row,".debug","div")
      .text(function(x){return JSON.stringify(x.campaign)})
    
  }

  campaign.info = function(row) {
    var info = d3_updateable(row,"div.step-info","div") 
      .classed("step-info col-md-2",true) 
      .style("line-height","30px")

    d3_updateable(info,"div.name","div")
      .classed("name",true)
      .style("font-size","13px")
      .style("weight","bold")
      .text(function(x,i){return "Step " + x.pos + ": " + x.action_name})

    var onoff = d3_updateable(info,"div.switch","div")
      .classed("switch", true)
      .style("height","30px")

    
    d3_updateable(onoff,"input","input")
      .attr("type","checkbox")
      .property("checked",function(x){return (x.campaign && x.campaign.state == "active") ? "checked": null})
      .on("click",campaign.methods.toggle.bind(row))

    $(".switch input[type='checkbox']").bootstrapSwitch({
      onSwitchChange: function(event,state) {
        campaign.methods.toggle.bind(row)(event.currentTarget.__data__)
      }
    });


  }

  campaign.settings = function(row) {

    var settings = d3_updateable(row,"div.settings","div")
      .classed("settings col-md-3",true)

    var dfreq = d3_updateable(settings,"div.daily-freq","div")
      .classed("daily-freq input-group input-group-sm",true)
      .style("margin-top","15px")
      .style("margin-bottom","15px")

    d3_updateable(dfreq,"span","span")
      .classed("input-group-addon",true)
      .text("Frequency cap")

    d3_updateable(dfreq,"input","input")
      .classed("form-control",true)
      .property("value",function(x){
        return (x.campaign && x.campaign.profile) ? x.campaign.profile.max_imps_day : 5
      })
      .on("input",campaign.methods.update.bind(row))


    var dfreq = d3_updateable(settings,"div.bid-price","div")
      .classed("bid-price input-group input-group-sm",true)

    d3_updateable(dfreq,"span","span")
      .classed("input-group-addon",true)
      .text("Max bid price")

    d3_updateable(dfreq,"input","input")
      .classed("form-control",true)
      .property("value",function(x) {
        return x.campaign ? x.campaign.base_bid : 5
      })
      .on("input",campaign.methods.update.bind(row))
 
  }

  campaign.estimates = function(row) {
    var estimates = d3_updateable(row,"div.estimates","div")
      .classed("estimates col-md-3",true)

    var targetable = d3_updateable(estimates,"div.estimated-users","div")
      .classed("estimated-users estimate",true)

    d3_updateable(targetable,"span.lab","span")
      .classed("lab",true)
      .text("Reachable Users: ")

    d3_updateable(targetable,"span.value","span")
      .classed("value pull-right",true)
      .text(function(x){
        if (x.avails_raw) return x.avails_raw.avails
      })

    var imps = d3_updateable(estimates,"div.estimated-imps","div")
      .classed("estimated-imps estimate",true)


    d3_updateable(imps,"span.lab","span")
      .classed("lab",true)
      .text("Estimated Impressions: ")

    d3_updateable(imps,"span.value","span")
      .classed("value pull-right",true)
      .text("value")

    var cost = d3_updateable(estimates,"div.estimated-cost","div")
      .classed("estimated-cost estimate",true)


    d3_updateable(cost,"span.lab","span")
      .classed("lab",true)
      .text("Maximum Daily Cost: ")

    d3_updateable(cost,"span.value","span")
      .classed("value pull-right",true)
      .text("value")




    

    d3_updateable(estimates,"span.b1","span")
      .classed("b1",true)
      .text("{")
      .style("font-size","38px")
      .style("line-height","60px")
      .style("top","0px")
      .style("left","-5px")
      .style("position","absolute")
      .style("font-weight",100)
      .style("color","#ccc")

    d3_updateable(estimates,"span.b2","span")
      .classed("b2",true)
      .html("&#65515;")
      .style("font-size","24px")
      .style("line-height","30px")
      .style("top","60px")
      .style("left","-5px")
      .style("position","absolute")
      .style("font-weight",100)
      .style("color","#ccc")


 
  }

  campaign.reporting = function(row) {

    var reporting = d3_updateable(row,"div.reporting","div")
      .classed("reporting col-md-3",true)

    var targeted = d3_updateable(reporting,"div.served-users","div")
      .classed("served-users statistic",true)

    d3_updateable(targeted,"span.lab","span")
      .classed("lab",true)
      .text("Users Reached (Freq): ")

    d3_updateable(targeted,"span.value","span")
      .classed("value pull-right",true)
      .text(function(x){
        return 0 
      })


    var sfreq = d3_updateable(reporting,"div.avg-imps","div")
      .classed("avg-imps statistic",true)

    d3_updateable(sfreq,"span.lab","span")
      .classed("lab",true)
      .text("Imps Served (CPM): ")

    d3_updateable(sfreq,"span.value","span")
      .classed("value pull-right",true)
      .text(function(x){
        return 0  + " (0)"
      })


    var cost = d3_updateable(reporting,"div.cost","div")
      .classed("cost statistic",true)

    d3_updateable(cost,"span.lab","span")
      .classed("lab",true)
      .text("Total Cost: ")

    d3_updateable(cost,"span.value","span")
      .classed("value pull-right",true)
      .text(function(x){
        return 0 + " (0)"
      })
  }



  return campaign
})(RB.crusher.ui.funnel.campaign || {})
