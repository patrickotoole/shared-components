var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  var crusher = RB.crusher

  action.show_domains = function(wrapper) {

    var newTs = wrapper.selectAll(".action-body")

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

    var hover = function(x) {
      var data = x ? domainData.filter(function(y){return y.parent_category_name == x.data.label}) : domainData
      this._drawDesc(x)
      action.domain_table(targetRow,data)
    }

    action.category_pie(targetRow, domainData, action.category_colors, false, hover)
    action.domain_table(targetRow, domainData)


    //action.show_other(wrapper,newTs,categoryData,urlData)

  }



  action.opportunities_header = function(newTs,domains) {

    var title = "Advertising opportunities",
      series = "domain",
      formatting = ".col-md-12.advertiser-opportunities",
      description = ""

    var button = {
      class_name: "export",
      name: '<span class="icon glyphicon glyphicon-floppy-save" style="padding-right: 10px; font-size: 8px; top: 3px; font-size: 12px; margin-right: 3px;"></span> Export',
      click: function(x) {
        var csvContent = "data:text/csv;charset=utf-8,";
        var data = x.domains.sort(function(a,b) {return a.index - b.index})
        csvContent += Object.keys(data[0]) + "\n"

        data.map(function(infoArray, index){
           dataString = Object.keys(infoArray).map(function(x){return infoArray[x]}).join(",");
           csvContent += dataString+ "\n"
        });

        var encodedUri = encodeURI(csvContent);
        var download_element = document.createElement('a')


        var format_date = d3.time.format('%Y-%m-%d (%H.%M)')
        var now = new Date();


        var file_name = format_date(now) + ' ' + x.action_name;

        download_element.download = file_name + '.csv'
        download_element.href = encodeURI(csvContent);
        download_element.click();

      }
    }

    var target = RB.rho.ui.buildWrappers(newTs, title, false, domains, formatting, description, button)


    var parentNode = newTs.selectAll(".advertiser-opportunities")
    parentNode.selectAll(".loading-icon").remove()

    parentNode.classed("hidden",false)
      .style("visibility","hidden")

    setTimeout(function(){
      parentNode.classed("hidden",!parentNode.classed("selected"))
        .style("visibility",undefined)

    },1)


    //d3.select(target.node().parentNode).classed("advertising-opportunities",true)

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

  action.category_pie = function(targetRow,domainData,colors,formatter, hover) {

    var hover;

    var target = d3_updateable(targetRow,".category-pie","div")
      .classed("category-pie ",true)
      .classed(formatter || "col-md-4 col-sm-12 pull-right",true)

    d3_updateable(target,".table-title","div")
      .classed("table-title",true)
      .text("Percentage of user visits by category")

    var formatData = function(data){
      return data.map(function(d){
        return { label: d.key, value: d.values }
      });
    }

    var pp = components.pie(target)

    pp.hover(hover)
    pp.colors(colors)
    pp.data(
      function(x){ return formatData(x.parentCategoryData) },
      function(d){ return d.data.label }
    )

    pp.draw()

    target.selectAll("svg").on("click",function(x){
      pp._hover()
      pp.draw()
    })






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
