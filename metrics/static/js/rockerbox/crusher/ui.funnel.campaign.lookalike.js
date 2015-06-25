var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.crusher.ui.funnel = RB.crusher.ui.funnel || {}
RB.crusher.ui.funnel.campaign = RB.crusher.ui.funnel.campaign || {}


RB.crusher.ui.funnel.campaign.lookalike = (function(lookalike){

  lookalike.build = function(wrapper) {
    var camp = d3_splat(wrapper,"div.campaign","div",function(x){
        console.log("LOOKALIKE ROWS: ",x);
        x.lookalikes.sort(function(x,y){
          return y.num_converters - x.num_converters
        })
        x.lookalikes.map(function(y,i){y.pos = i+1})
        return x.lookalikes
      },function(x){return String(x.num_convertors) + String(x.num_users)})
      .classed("campaign row",true)
      .style("padding-bottom","15px")
      .style("border-bottom","1px solid #f0f0f0")
      .style("margin-bottom","15px")

    camp.sort(function(x,y){
      return y.num_converters - x.num_converters
    })

    var info = d3_updateable(camp,"div.step-info","div") 
      .classed("step-info col-md-2",true) 
      .style("line-height","30px")

    d3_updateable(info,"div.name","div")
      .classed("name",true)
      .style("font-size","13px")
      .style("weight","bold")
      .text(function(x,i){return "Model " + x.pos })

    var onoff = d3_updateable(info,"div.switch","div")
      .classed("switch", true)
      .style("height","30px")

    d3_updateable(onoff,"input","input")
      .attr("type","checkbox")

    $(".switch input[type='checkbox']").bootstrapSwitch();



    var settings = d3_updateable(camp,"div.settings","div")
      .classed("settings col-md-3",true)

    var estimates = d3_updateable(camp,"div.estimates","div")
      .classed("estimates col-md-3",true)

    var reporting = d3_updateable(camp,"div.reporting","div")
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



    var targetable = d3_updateable(estimates,"div.convertors","div")
      .classed("convertors estimate",true)

    d3_updateable(targetable,"span.lab","span")
      .classed("lab",true)
      .text("Users in model: ")

    d3_updateable(targetable,"span.value","span")
      .classed("value pull-right",true)
      .text(function(x){
        return d3.format(",")(x.num_converters)
      })



    var targetable = d3_updateable(estimates,"div.estimated-users","div")
      .classed("estimated-users estimate",true)

    d3_updateable(targetable,"span.lab","span")
      .classed("lab",true)
      .text("Estimated Reach: ")

    d3_updateable(targetable,"span.value","span")
      .classed("value pull-right",true)
      .text(function(x){
        return d3.format(",")(x.num_daily_users_weighted)
      })

    var imps = d3_updateable(estimates,"div.estimated-imps","div")
      .classed("estimated-imps estimate",true)


    d3_updateable(imps,"span.lab","span")
      .classed("lab",true)
      .text("Estimated Impressions: ")

    d3_updateable(imps,"span.value","span")
      .classed("value pull-right",true)
      .text(function(x){
        return d3.format(",")(x.num_daily_imps_weighted)
      })

    var cost = d3_updateable(estimates,"div.estimated-cost","div")
      .classed("estimated-cost estimate",true)


    d3_updateable(cost,"span.lab","span")
      .classed("lab",true)
      .text("Estimated Conversion Rate: ")

    d3_updateable(cost,"span.value","span")
      .classed("value pull-right",true)
      .text(function(x){
        return d3.format(".3f")(100*x.conv_rate) + "%"
      })




    var onChange = function(x) {
      var id = x.action_id
      var campaign = camp.filter(function(y){return y.action_id == id})

      var f = campaign.selectAll("div.daily-freq input").property("value")
      var imps = f * (x.avails_raw.avails)

      var p = campaign.selectAll("div.bid-price input").property("value")

      campaign.selectAll("div.estimated-imps span.value").text(d3.format(",")(imps))
      campaign.selectAll("div.estimated-cost span.value").text(d3.format("$.2")(imps * p / 1000))

    }

    d3_updateable(estimates,"span.b1","span")
      .classed("b1",true)
      .text("{")
      .style("font-size","38px")
      .style("line-height","120px")
      .style("top","0px")
      .style("left","-5px")
      .style("transform","scale(1,2.5)")
      .style("position","absolute")
      .style("font-weight",100)
      .style("color","#ccc")

    
    var includes = d3_updateable(settings,"div.includes","div")
      .classed("includes statistic",true)

    d3_updateable(includes,"span","span")
      .text("User has visited:")

    d3_splat(includes,"div.item","div",
      function(x){return x.rules.filter(function(x){return x.action == "include"})},
      function(x){return x.domain}
    )
      .classed("item",true)
      .text(function(x){
        return x.domain 
      })

    var excludes = d3_updateable(settings,"div.excludes","div")
      .classed("excludes statistic",true)

    d3_updateable(excludes,"span","span")
      .text("User has not visited:")

    d3_splat(excludes,"div.item","div",
      function(x){return x.rules.filter(function(x){return x.action == "exclude"})},
      function(x){return x.domain}
    )
      .classed("item",true)
      .text(function(x){
        return x.domain 
      })




    //camp.sort(function(x,y){return x.pos - y.pos})
    camp.exit().remove()

  }
  return lookalike
})(RB.crusher.ui.funnel.campaign.lookalike || {})
