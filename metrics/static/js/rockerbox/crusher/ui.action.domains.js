var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  var crusher = RB.crusher

  action.show_domains = function(wrapper) {
    var newTs = wrapper.selectAll(".ts")

    var data = wrapper.datum()
    var domainData = data.domains
    var urlData = data.urls

    var categoryData = d3.nest()
      .key(function(x){return x.category_name})
      .rollup(function(x){
        return d3.sum(x.map(function(y){return y.count}))
      }) 
      .entries(domainData)

    var parentCategoryData = d3.nest()
      .key(function(x){return x.parent_category_name})
      .rollup(function(x){ return x.reduce(function(p,c){return p + c.count},0) })
      .entries(domainData)
      .sort(function(x,y){return y.values - x.values})
      .filter(function(x){return x.key != "NA"})
      .slice(0,15)   

    data.parentCategoryData = parentCategoryData;

    var target = action.opportunities_header(newTs,[data])

    var targetRow = d3_updateable(target,".row","div")
      .classed("row",true)

    action.category_pie(targetRow, domainData, action.category_colors)
    action.domain_table(targetRow, domainData)

    
    action.show_other(wrapper,newTs,categoryData,urlData)

  }



  action.opportunities_header = function(newTs,domains) {

    var title = "Advertising opportunities",
      series = ["domain"],
      formatting = "col-md-12",
      description = ""

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

    var target = RB.rho.ui.buildWrappers(newTs, title, series, domains, formatting, description, button)

    return target
  }

  action.domain_table = function(targetRow,domainData) {

    var domain_table = d3_updateable(targetRow,".domain-table","div",function(x){return x.domains})
      .classed("domain-table col-md-8 col-sm-12",true)
     
    d3_updateable(domain_table,".table-title","div")
      .classed("table-title",true)
      .text("Domains ranked by importance")

    var title = "",
      series = ["domain"],
      formatting = "col-md-12"

    RB.rho.ui.buildBarTable(domain_table, domainData, title, series, formatting, 15, action.category_colors)

  }

  action.category_pie = function(targetRow,domainData,colors) {

    var target = d3_updateable(targetRow,".category-pie","div")
      .classed("category-pie col-md-4 col-sm-12 pull-right",true)

    d3_updateable(target,".table-title","div")
      .classed("table-title",true) 
      .text("Percentage of user visits by category")


    
    var formatData = function(data){
      return data.map(function(d){
        return { label: d.key, value: d.values }
      });
    }

    RB.component.pie.base(target)

    var drawDesc = RB.component.pie.desc(target)
    drawDesc()

    var hover = function(x) {
      var data = domainData.filter(function(y){return y.parent_category_name == x.data.label})
      drawDesc(x)
      action.domain_table(targetRow,data)
    }

    RB.component.pie.draw(
      target,
      function(x){ return formatData(x.parentCategoryData) },
      function(d){ return d.data.label },
      hover,
      colors
    )


    


    
  }

  action.category_table = function(newTs,categoryData) {
    RB.rho.ui.buildBarSummary(newTs,categoryData,"Off-site categories",["key"], undefined, "Top off-site categories users visit")
  }

  action.show_other = function(wrapper,newTs,categoryData,urlData) {
    d3_updateable(newTs,".clusters","div")
      .classed("series-wrapper col-md-12 clusters",true)


    action.category_table(newTs,categoryData)

    var pull_left = d3_updateable(newTs,".on-page-wrapper", "div")
      .classed("on-page-wrapper col-md-6",true)

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

  return action

})(RB.crusher.ui.action || {})  
