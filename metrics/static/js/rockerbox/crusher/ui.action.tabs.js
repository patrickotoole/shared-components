var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.tabs = (function(tabs) {

  var crusher = RB.crusher

  tabs.build = function(wrapper,data) {

    var data = [{
      "name":"Opportunities",
      "class":"advertiser-opportunities"
    },{
      "name":"Before and After",
      "class":"before-and-after"
    },{
      "name":"Clusters",
      "class":"clusters"
    },{
      "name":"Timing",
      "class":"timing"
    },{
      "name":"Top Articles",
      "class":"full_url"
    //},{
    //  "name":"Comparison",
    //  "class":"comparison"
    }]

    var action_tabs = d3_updateable(wrapper,".action-tabs","div")
      .classed("action-tabs row",true)
      .datum(data)

    var tabs = d3_updateable(action_tabs,".tabs","div")
      .classed("tabs series",true)
      .style("padding","0px")
      .style("text-align","center")
      .style("height","40px")
      .style("line-height","40px")
      .datum(data)

    var items = d3_splat(tabs,".item","a",function(x){return x}, function(x){return x.name})
      .attr("href",function(x){return "#" + x.class})
      .classed("item col-sm-2",true)
      .classed("selected",function(x,i){return i == 0})
      .style("color","#5a5a5a")
      .style("text-decoration","none")
      .style("border-right",function(d,i){
        return i < data.length-1 ? "1px solid #f0f0f0" : undefined
      })
      .text(function(x){return x.name})
      .on("click",function(x){
        items.classed("selected",false)
        items.filter(function(y){return y == x }).classed("selected",true)
        d3.selectAll(".action-body").selectAll(".series-wrapper")
          .classed("hidden",true)
          .classed("selected",false)
        d3.selectAll(".action-body").selectAll("." + x.class)
          .classed("hidden",false)
          .classed("selected",true)

      })

  }

  tabs.item = function(wrapper) {

  }

  return tabs

})(RB.crusher.ui.tabs || {})
