var RB = RB || {}
RB.yoshi = RB.yoshi || {}
RB.yoshi.UI = RB.yoshi.UI || {}

RB.yoshi.UI.targeting = (function(targeting){

  
  targeting.country = function(panel){
    RB.AJAX.rockerbox.getCountries(function(countries){
      var data = panel.selectAll(".geo-item").data()
      
      data.push({"key":"Country Targets","values":countries})

      var item = panel.selectAll(".geo-item list-group-item")
        .data(data)
        .enter()
          .append("div").classed("list-group-item geo-item",true)

      var row = item.append("div").classed("row",true)

      row.append("div").classed("col-md-4",true).append("div").classed("col-md-12",true).text(function(x){return x.key})
      var select = row.append("div").classed("col-md-8",true)
        .append("select").property("multiple",true)
        .attr("data-placeholder","Choose a country...")
        .classed("country-select",true)

      select.selectAll("option").data(function(x){return x.values})
        .enter()
        .append("option")
        .attr("value",function(x){return x.value})
        .text(function(x){return x.name })
      
      $(".country-select").chosen({width:"95%"}).change(function(x,y){
        var selected = d3.select(".country-select").selectAll("option").filter(function(x){return this.selected}).data()
        targeting.state(panel,selected)
        RB.yoshi.actions.toggleCampaignVerification(true) 
      })

      return countries
    })
  }

  targeting.state = function(panel,data){
    var states_qs = "?country_code=" + data.map(function(x){return x.code}).join(",")

    RB.AJAX.rockerbox.getRegions(states_qs,function(regions){

      var newdata = [{"key":"State Targets","values":regions}]

      var group = panel.selectAll(".list-group-item.geo-item")
        .data(newdata,function(x){
          return x.key
        })

      if (regions.length == 0) {
        group
          .filter(function(x){
            return (x.key == "State Targets" && regions.length == 0)
          })
          .remove()
      }

      var item = group
        .enter()
          .append("div").classed("list-group-item geo-item",true)

      var row = item.append("div").classed("row",true)

      row.append("div").classed("col-md-4",true)
        .append("div").classed("col-md-12",true).text(function(x){return x.key})

      var select = row.append("div").classed("col-md-8",true)
        .append("select").property("multiple",true)
        .attr("data-placeholder","Select states...")
        .classed("region-select",true)

      var optgroup = panel.select(".region-select")
        .selectAll("optgroup")
        .data(d3.nest().key(function(x){return x.country_code}).entries(regions),function(x){return x.key})

      var newGroup = optgroup
        .enter()
        .append("optgroup")
        .attr("label",function(x){return x.key})

      optgroup
        .exit()
        .remove()

      var options = newGroup
        .selectAll("option")
        .data(function(x){return x.values},function(x){return x.name})

      options
        .enter()
        .append("option")
        .attr("value",function(x){return x.value})
        .text(function(x){return x.name })

      options
        .attr("value",function(x){return x.value})
        .text(function(x){return x.name })

      options
        .exit()
        .remove()
      
      $(".region-select").chosen({width:"95%"}).change(function(x,y){
        var selected = d3.select(".region-select").selectAll("option").filter(function(x){return this.selected}).data()
        targeting.city(panel,selected)
        RB.yoshi.actions.toggleCampaignVerification(true) 
      })
      
      $(".region-select").trigger("chosen:updated")
    })
  }

  targeting.buildCity = function(panel,data) {
      var newdata = [{"key":"City Targets","values":data}] 

      var group = panel.selectAll(".list-group-item.geo-item")
        .data(newdata,function(x){
          return x.key
        })

      if (data.length == 0) {
        group
          .filter(function(x){ return (x.key == "City Targets" && data.length == 0) })
          .remove()
      }

      var item = group
        .enter()
          .append("div").classed("list-group-item geo-item",true)

      var row = item.append("div").classed("row",true)

      row.append("div").classed("col-md-4",true)
        .append("div").classed("col-md-12",true).text(function(x){return x.key})
      var select = row.append("div").classed("col-md-8",true)
        .append("select").property("multiple",true)
        .attr("data-placeholder","Select cities...")
        .classed("city-select",true)

      var optgroup = panel.select(".city-select")
        .selectAll("optgroup")
        .data(
          d3.nest().key(function(x){return x.country_name + " " + x.region_name}).entries(data),
          function(x){return x.key}
        )

      var newGroup = optgroup
        .enter()
        .append("optgroup")
        .attr("label",function(x){return x.key})

      optgroup
        .exit()
        .remove()

      var options = newGroup
        .selectAll("option")
        .data(function(x){return x.values},function(x){return x.city})

      options
        .enter()
        .append("option")
        .attr("value",function(x){return x.id})
        .text(function(x){return x.city })

      options
        .attr("value",function(x){return x.id})
        .text(function(x){return x.city })

      options
        .exit()
        .remove()
      
      $(".city-select").chosen({width:"95%"}).change(function(x,y){
        var selected = d3.select(".city-select").selectAll("option").filter(function(x){return this.selected}).data()
        //targeting.city(panel,selected)
        RB.yoshi.actions.toggleCampaignVerification(true) 
      })
      
      $(".city-select").trigger("chosen:updated") 
  
  }

  targeting.city = function(panel,data){
    var city_urls = data
      .map(function(x){return "/" + x.country_code + "/" + x.code})
      .filter(function(x){return x != "//"})

    var data = [],
      recursivePos = 0;

    var recursize_callback = function(city_data) {
      data.push.apply(data,city_data)
      var url = city_urls[recursivePos]
      recursivePos += 1
      if (recursivePos <= city_urls.length) {
        RB.AJAX.rockerbox.getCities(url,recursize_callback)
      } else {
        targeting.buildCity(panel,data)
      }

    }
    recursize_callback([])
  } 

  targeting.location = function(panel) {
    var group = panel.append("div")
      .classed("list-group geo-group",true)
    
    group
      .append("div")
      .classed("list-group-item",true)
      
      .append("h5")
      .classed("list-group-item-heading",true)
      .text("Location Targets")


    targeting.country(group)
  }

  targeting.frequency = function(panel) {
    var group = panel.append("div")
      .classed("list-group freq-group",true)
    
    group
      .append("div")
      .classed("list-group-item",true)
      .append("h5")
      .classed("list-group-item-heading",true)
      .text("Frequency Caps")

    var item = group
        .append("div").classed("list-group-item freq-item",true)

    var row = item.append("div").classed("row",true)

    row.append("div").classed("col-md-4",true)
      .append("div").classed("col-md-12",true).text("Daily Imps")

    row.append("div").classed("col-md-8",true)
      .append("input").classed("campaign-parameter form-control",true).style("width","95%") 
      .attr("placeholder","Max # of impressions per user per day (default: 5)")
      .attr("name","max_day_imps")
      .on("blur",function(x){
        RB.yoshi.actions.toggleCampaignVerification(true) 
      })

    var item = group
        .append("div").classed("list-group-item freq-item",true)

    var row = item.append("div").classed("row",true)

    row.append("div").classed("col-md-4",true)
      .append("div").classed("col-md-12",true).text("Lifetime Imps")

    row.append("div").classed("col-md-8",true)
      .append("input").classed("campaign-parameter form-control",true).style("width","95%")
      .attr("placeholder","Max # of impressions per user per lifetime (default: 20)") 
      .attr("name","max_lifetime_imps")
      .on("blur",function(x){
        RB.yoshi.actions.toggleCampaignVerification(true) 
      })

  }

  targeting.budget = function(panel) {
    var group = panel.append("div")
      .classed("list-group freq-group",true)
    
    group
      .append("div")
      .classed("list-group-item",true)
      .append("h5")
      .classed("list-group-item-heading",true)
      .text("Campaign Budget")

    var item = group
        .append("div").classed("list-group-item freq-item",true)

    var row = item.append("div").classed("row",true)

    row.append("div").classed("col-md-4",true)
      .append("div").classed("col-md-12",true).text("Maximum CPM")

    var ig = row.append("div").classed("col-md-8",true)
      .append("div").classed("input-group",true)

    ig.append("span")
      .classed("input-group-addon",true)
      .text("$")

    ig
      .append("input").classed("campaign-parameter form-control",true) .style("width","95%") 
      .attr("placeholder","Bid price per impression")
      .attr("name","base_bid")
      .on("blur",function(x){
        RB.yoshi.actions.toggleCampaignVerification(true) 
      })
     
    var item = group
        .append("div").classed("list-group-item freq-item",true)
     
    var row = item.append("div").classed("row",true)

    row.append("div").classed("col-md-4",true)
      .append("div").classed("col-md-12",true).text("Daily Budget")

    var ig = row.append("div").classed("col-md-8",true)
      .append("div").classed("input-group",true)

    ig.append("span")
      .classed("input-group-addon",true)
      .text("$")

    ig
      .append("input").classed("campaign-parameter form-control",true) .style("width","95%") 
      .attr("name","daily_budget") 
      .attr("placeholder","Spend per day")
      .on("blur",function(x){
        RB.yoshi.actions.toggleCampaignVerification(true) 
      })

    var item = group
        .append("div").classed("list-group-item freq-item",true)

    var row = item.append("div").classed("row",true)

    row.append("div").classed("col-md-4",true)
      .append("div").classed("col-md-12",true).text("Lifetime Budget")

    var ig = row.append("div").classed("col-md-8",true)
      .append("div").classed("input-group",true)

    ig.append("span")
      .classed("input-group-addon",true)
      .text("$")

    ig 
      .append("input").classed("campaign-parameter form-control",true).style("width","95%")
      .attr("name","lifetime_budget")
      .attr("placeholder","Lifetime spend") 
      .on("blur",function(x){
        RB.yoshi.actions.toggleCampaignVerification(true) 
      })

  }

  targeting.placement = function(panel) {
    var group = panel.append("div")
      .classed("list-group placement-group",true)
    
    group
      .append("div")
      .classed("list-group-item",true)
      .append("h5")
      .classed("list-group-item-heading",true)
      .text("Placement Targets")

    var item = group
        .append("div").classed("list-group-item placement-item",true)

    var row = item.append("div").classed("row",true)

    row.append("div").classed("col-md-4",true)
      .append("div").classed("col-md-12",true).text("Placement Targets")

    var select = row.append("div").classed("col-md-8",true)
        .append("select").property("multiple",true)
        .attr("data-placeholder","Enter placements...")
        .classed("placement-select",true)

    $(".placement-select").chosen({width:"95%"}).change(function(x,y){
      var selected = d3.select(".placement-select").selectAll("option").filter(function(x){return this.selected}).data()
      RB.yoshi.actions.toggleCampaignVerification(true) 
      //targeting.city(panel,selected)
    })

    $(".placement-select").trigger("chosen:updated")
       
  }

  targeting.domain = function(panel) {
    var group = panel.append("div")
      .classed("list-group domain-group",true)
    
    group
      .append("div")
      .classed("list-group-item",true)
      .append("h5")
      .classed("list-group-item-heading",true)
      .text("Domain Targets")

    var item = group
        .append("div").classed("list-group-item domain-item",true)

    var row = item.append("div").classed("row",true)

    row.append("div").classed("col-md-4",true)
      .append("div").classed("col-md-12",true).text("Domain Targets")

    var select = row.append("div").classed("col-md-8",true)
        .append("select").property("multiple",true)
        .attr("data-placeholder","Enter domains...")
        .classed("domain-select",true)

    $(".domain-select").chosen({width:"95%"}).change(function(x,y){
      var selected = d3.select(".domain-select").selectAll("option").filter(function(x){return this.selected}).data()
      RB.yoshi.actions.toggleCampaignVerification(true) 
      //targeting.city(panel,selected)
    })

    $(".domain-select").trigger("chosen:updated")
       
  }

  targeting.build = function(target) {

    var panel = target.selectAll(".panel")

    panel.append("div")
      .classed("panel-heading",true)
      .append("h3")
      .classed("panel-title",true)
      .text("Select additional campaign targeting settings")  

    /*targeting.domain(panel)  

    panel.append("div")
      .classed("panel-heading",true)
      .append("h3")
      .classed("panel-title",true)  

    targeting.placement(panel) 
 
    panel.append("div")
      .classed("panel-heading",true)
      .append("h3")
      .classed("panel-title",true)  
  
    */

    targeting.location(panel)

    panel.append("div")
      .classed("panel-heading",true)
      .append("h3")
      .classed("panel-title",true) 

    targeting.frequency(panel) 

    panel.append("div")
      .classed("panel-heading",true)
      .append("h3")
      .classed("panel-title",true) 

    targeting.budget(panel) 

    panel.append("div")
      .classed("panel-heading",true)
      .append("h3")
      .classed("panel-title",true) 
     

 
  }
 
  return targeting

})(RB.yoshi.UI.targeting || {})
