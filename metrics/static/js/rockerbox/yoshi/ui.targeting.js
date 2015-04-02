var RB = RB || {}
RB.yoshi = RB.yoshi || {}
RB.yoshi.UI = RB.yoshi.UI || {}

RB.yoshi.UI.targeting = (function(targeting){

  
  targeting.country = function(panel){
    RB.AJAX.rockerbox.getCountries(function(countries){
      var data = panel.selectAll(".list-group .geo-group").data()
      
      data.push({"key":"Country Targets","values":countries})

      var group = panel.selectAll(".list-group.geo-group")
        .data(data)
        .enter()
          .append("div").classed("list-group geo-group",true)

      var item = group
        .append("div")
        .classed("list-group-item",true)

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

      })

      return countries
    })
  }
  targeting.state = function(panel,data){
    var states_qs = "?country_code=" + data.map(function(x){return x.code}).join(",")

    RB.AJAX.rockerbox.getRegions(states_qs,function(regions){

      console.log(regions)

      var newdata = [{"key":"State Targets","values":regions}]

      var group = panel.selectAll(".list-group.geo-group")
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

      var newGroup = group
        .enter()
          .append("div").classed("list-group geo-group",true)

      var item = newGroup
        .append("div")
        .classed("list-group-item",true)

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
      })
      
      $(".region-select").trigger("chosen:updated")
      
    })

  }

  targeting.buildCity = function(panel,data) {
      var newdata = [{"key":"City Targets","values":data}] 

      var group = panel.selectAll(".list-group.geo-group")
        .data(newdata,function(x){
          return x.key
        })

      if (data.length == 0) {
        group
          .filter(function(x){
            return (x.key == "City Targets" && data.length == 0)
          })
          .remove()
      }

      var newGroup = group
        .enter()
          .append("div").classed("list-group geo-group",true)

      var item = newGroup
        .append("div")
        .classed("list-group-item",true)

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
    panel.append("div")
      .classed("list-group",true)
      .append("div")
      .classed("list-group-item",true)
      .append("h5")
      .classed("list-group-item-heading",true)
      .text("Location targeting")

    
    var LOCATION_TYPES = [
        {"key":"Country Targets","values":["US","UK"]},
        {"key":"State Targets","values":["US","UK"]} ,
        {"key":"DMA Targets","values":["US","UK"]} 
        //{"key":"City Targets","values":["US","UK"]} ,
        //{"key":"Zipcode Targets","values":["US","UK"]} 
    ]

  console.log("HERE")

    targeting.country(panel)

    
     
  }

  targeting.build = function(target) {

    var panel = target.selectAll(".panel")

    panel.append("div")
      .classed("panel-heading",true)
      .append("h3")
      .classed("panel-title",true)
      .text("Select additional campaign targeting settings")  

    targeting.location(panel)

  }
 
  return targeting

})(RB.yoshi.UI.targeting || {})
