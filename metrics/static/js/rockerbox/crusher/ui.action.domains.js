var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  var crusher = RB.crusher

  action.show_domains = function(wrapper) {
    var newTs = wrapper.selectAll(".ts")
    var domainData = wrapper.datum().domains

    var categoryData = d3.nest()
      .key(function(x){return x.category_name})
      .rollup(function(x){
        return d3.sum(x.map(function(y){return y.count}))
      }) 
      .entries(domainData)


    //RB.rho.ui.buildBarSummary(newTs,domainData,"Off-site opportunities",["domain"], undefined, "Top off-site opportunities for users who have engaged in this on-site action")
    
    action.domain_table(newTs,domainData)

    d3_updateable(newTs,".clusters","div")
      .classed("series-wrapper col-md-12 clusters",true)


    action.category_table(newTs,categoryData)

    var pull_left = d3_updateable(newTs,".on-page-wrapper", "div")
      .classed("on-page-wrapper col-md-6",true)

    var urlData = wrapper.datum().urls


    action.show_cloud(pull_left,urlData)

    RB.rho.ui.buildBarSummary(
      pull_left,urlData,"On-site pages",["url"], " ", 
      "Top on-site pages that match the action"
    )

    crusher.permissions("cache_stats", function(){
      RB.rho.ui.buildBarSummary(
        pull_left,wrapper.datum().param_rolled,"On-site tracking parameters",["key"], " ", 
        "Top tracking parameters",true
      )
    })




  }

  action.domain_table = function(newTs,domainData) {

    var title = "Off-site opportunities",
      series = ["domain"],
      formatting = "col-md-12",
      description = "Top off-site opportunities for users who have engaged in this on-site action"

    var button = {
      class_name: "export",
      name: "Export",
      click: function(x) {
        var csvContent = "data:text/csv;charset=utf-8,";
        var data = x[0].sort(function(a,b) {return a.index - b.index})
        csvContent += Object.keys(data[0]) + "\n"

        data.map(function(infoArray, index){
           dataString = Object.keys(infoArray).map(function(x){return infoArray[x]}).join(",");
           csvContent += dataString+ "\n" 
        });
        
        var encodedUri = encodeURI(csvContent);
        window.open(encodedUri);

      }
    }

    var target = RB.rho.ui.buildSeriesWrapper(newTs, title, series, domainData, formatting, description, button)

     

    RB.rho.ui.buildBarTable(target, domainData, title, series, formatting)

    
  }

  action.category_table = function(newTs,categoryData) {
    RB.rho.ui.buildBarSummary(newTs,categoryData,"Off-site categories",["key"], undefined, "Top off-site categories users visit")
  }

  return action

})(RB.crusher.ui.action || {})  
