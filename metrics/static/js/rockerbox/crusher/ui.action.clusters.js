var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  action.show_clusters = function(wrapper) {

    var title = "User Clusters",
      series = ["clusters"],
      formatting = "col-md-12",
      description = "Top user clusters"

    console.log(wrapper.datum())

    var domains = wrapper.datum().domains

    var domain_dict = d3.nest()
      .key(function(x){return x.domain})
      .map(domains)

    var target = RB.rho.ui.buildSeriesWrapper(wrapper.selectAll(".action-body"), title, series, [wrapper.datum()], formatting, description)

    d3.select(target.node().parentNode).classed("action-clusters",true)

    
    var clusters = d3_splat(target,".cluster","div",
        function(x){return x[0][0].clusters},
        function(x,i){
          x.domains_with_category = x.domains.map(function(y){
            try {
              return domain_dict[y][0]
            } catch(e) {
              return {"category_name":"NA","parent_category_name":"NA","domain":y,"count":1,"weighted":0}
            }
          })

          x.cluster_categories = d3.nest()
            .key(function(y){return y.parent_category_name})
            .rollup(function(y){
              return {
                "parent_category_name": y[0].parent_category_name,
                "domains":y.length,
                "users": d3.sum(y.map(function(z){return z.count }))
              }
            })
            .entries(x.domains_with_category).map(function(x){return x.values})
            .map(function(x){
              x.value = Math.log(x.users*x.users)
              return x
            })
            .sort(function(x,y){return y.users - x.users})

          x.index = i

          return x.cluster
        }
      )
      .classed("cluster row",true)

    d3_updateable(clusters,".cluster-name","h4")
      .classed("cluster-name value",true)
      .style("font-size","20px")
      .text(function(x,i){return "Cluster " + (x.index + 1) + ": " + x.cluster_categories[0].parent_category_name})

    


    var cat = d3_updateable(clusters,".categories","div")
      .classed("categories col-md-4",true)
      .style("padding","0px")
      .datum(function(z){
        return z.cluster_categories
      })

    var dom = d3_updateable(clusters,".cluster-domains","div")
      .classed("cluster-domains col-md-8",true)
      .style("padding","0px")
      .datum(function(z){
        return z.domains_with_category
      })

    var filterCat = function(nodeData) {
      var current = this;
      var current_title = title.filter(function(x){
        return this.parentNode == current
      })
      current_title.text(nodeData.parent_category_name)
        .style("font-weight","bold")

      var current_dom = dom.filter(function(){return this.parentNode == current.parentNode})

      var data = current_dom.datum()

      var filtered_data = data.filter(function(x){
        return x.parent_category_name == nodeData.parent_category_name
      })

      buildCurrent(current_dom,filtered_data) 

      //var dom_row = d3_splat(current_dom,".domain-row","div",function(x){return x},function(x){return x.domain})
      //  .classed("domain-row",true)
      //  .text(JSON.stringify) 

      //dom_row.filter(function(x){return x.parent_category_name != nodeData.parent_category_name})
      //  .remove()

    }

    var buildCurrent = function(current_dom,data) {

      RB.rho.ui.buildBarTable(current_dom,data,"asdf","domain",false,12,action.category_colors)

    }

      dom.map(function(x){
        var current_dom = d3.select(x[0])
        var data = x[0].parentNode.__data__.domains_with_category
 
        buildCurrent(current_dom,data)
      })

    //d3_splat(dom,".domain-row","div",function(x){return x},function(x){return x.domain})
      //.classed("domain-row",true)
      //.text(JSON.stringify)

    var HOVER_TEXT = "(hover to refine category)"

    var reset = d3_updateable(cat,".categories-reset","div")
      .classed("categories-reset pull-right btn btn-xs btn-default",true)
      .style("font-size","12px")
      .style("font-weight","normal")
      .text("reset")
      .on("click",function(x){
        var current_cat = d3.select(this.parentNode)
        current_cat.selectAll(".categories-title")
          .text(HOVER_TEXT)
          .style("font-weight",undefined)

        action.bubbles(current_cat,filterCat,action.category_colors)

        var current = this.parentNode
        var current_dom = dom.filter(function(){return this.parentNode == current.parentNode})
        var data = current_dom.datum()
  
        buildCurrent(current_dom,data,action.category_colors) 
        
      })



    var title = d3_updateable(cat,".categories-title","div")
      .classed("categories-title",true)
      .style("font-size","12px")
      .text(HOVER_TEXT)

    action.bubbles(cat,filterCat,action.category_colors)

     

    d3_updateable(clusters,".domains","div")
      .classed("domains",true)
      .datum(function(x){
        return x.domains_with_category.map(function(x){
          return {
            "domain":x.domain,
            "count": x.count,
            "parent_category_name":x.parent_category_name,
            "category_name":x.category_name,
          }
        })
      })
      //.text(JSON.stringify)
    
  }

  action.bubbles = function(category,onHover,color) {
    var diameter = 250,
        format = d3.format(",d");
    
    var bubble = d3.layout.pack()
        .sort(null)
        .size([300, diameter])
        .padding(3.5);
    
    var svg = d3_updateable(category,".bubble-chart","svg")
        .attr("width", 300)
        .attr("height", diameter)
        .attr("class", "bubble-chart");

    var node = svg.selectAll(".node")
      .data(function(x){
        var nodes = bubble.nodes({
          "children": x.filter(function(x){return x.parent_category_name != "NA"})
        })

        return nodes.filter(function(d) { return !d.children; })
      })

    node
      .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        


    node.exit().remove()

    node
      .style("opacity",undefined)
      .style("stroke", undefined);

    node.append("title")
        .text(function(d) { return d.parent_category_name; });

    node.append("circle")
        .attr("r", function(d) { return d.r; })
        .style("fill", function(d) { return color(d.parent_category_name); })
        .on("mouseover",function(x){
          var current_node = node.filter(function(y) { return x == y })
         
          node.filter(function(){
              return this.parentNode == current_node.node().parentNode
            })
            .style("stroke",undefined)
            .style("opacity",.5)

          current_node.style("stroke","black")
            .style("opacity",1)

          onHover.bind(current_node.node().parentNode.parentNode)(x)
        })

  }

  return action

})(RB.crusher.ui.action || {})  
