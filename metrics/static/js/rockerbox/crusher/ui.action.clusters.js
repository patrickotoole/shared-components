var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  var buildKMeansPlot = function(miserables,base,_mo) {

    
  
    var margin = {top: 20, right: 20, bottom: 10, left: 20},
        width = parseInt(base.style("width").replace("px","")) - margin.left - margin.right,
        height = width;
  
    var x = d3.scale.ordinal().rangeBands([0, width]),
      y = d3.scale.ordinal().rangeBands([0, height])
        z = d3.scale.linear().domain([0, 1]).clamp(true),
        c = d3.scale.category10().domain(d3.range(10));
  
    var svg = base.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("margin-left", margin.left + "px")
        .style("margin-right", margin.right + "px")
      .style("fill", "#fff")
      .append("g")
        .attr("transform", "translate(" + 0 + "," + margin.top + ")");
  
  
    var matrix = [],
        nodes = miserables.nodes,
        n = nodes.filter(function(x){return x.name}).length,
        m = nodes.filter(function(x){return x.uid}).length;
  
    // Compute index per node.
    nodes.slice(0,n).forEach(function(node, i) {
          
      matrix[i] = d3.range(m).map(function(j) { 
        
        return {
          x: nodes[j+n].node, 
          y: node.node, 
          z: 0, 
          group: node.group, 
          uid_group: nodes[j+n].group 
        }
  
      });
      
    });
  
  
    // Convert links to matrix; count character occurrences.
    var group_domains = {},
      group_uids = {}
  
    miserables.links.forEach(function(link) {
      matrix[link.source][link.target-n].z += link.value;
      var domain_group = nodes[link.source].group
      group_domains[domain_group] = group_domains[domain_group] || {}
      group_domains[domain_group][link.source] = group_domains[domain_group][link.source] || 0
      group_domains[domain_group][link.source] += link.value
  
    var uid_group = nodes[link.target].group
      group_uids[uid_group] = group_uids[uid_group] || {}
      group_uids[uid_group][link.target] = group_uids[uid_group][link.target] || 0
      group_uids[uid_group][link.target] += link.value
    });
  
  
    x.domain(d3.range(m).map(function(x){return x +n }))
    y.domain(d3.range(n))
  
    svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height);
  
  
    var row = svg.selectAll(".row")
        .data(matrix)
      .enter().append("g")
        .attr("class", function (x,i) { return "row" })
        .attr("transform", function(d, i) { return "translate(0," + y(d[0].y) + ")"; })
        .each(row);
  
    
  
    function row(row) {
      
      var cell = d3.select(this).selectAll(".cell")
          .data(row.filter(function(d) { return d.z; }))
        .enter().append("circle")
          .attr("class", function(x) { 
            return "cell " + nodes[x.x].group + " " + nodes[x.y].group + " " + JSON.stringify(nodes[x.y].name) + " " + JSON.stringify(nodes[x.x].uid)  
          })
          .attr("x", function(d) { return x(d.x); })
          .attr("r", x.rangeBand()*3)
          .attr("cx", function(d) { return x(d.x); })
          .attr("width", x.rangeBand()*3)
          .attr("height", x.rangeBand()*3)
          //.style("fill-opacity", function(d) { return z(d.z); })
          //.style("fill", function(d) { return nodes[d.x].group == nodes[d.y].group ? c(nodes[d.x].group) : "black"; })
          .style("fill-opacity", function(d) { return nodes[d.x].group == nodes[d.y].group ? .5 : .1; })
          .style("fill", function(d) { return c(nodes[d.x].group) })
          .on("mouseover", mouseover)
    }
  
    function mouseover(p) {
      var domains = group_domains[p.group]
      var uids = group_uids[p.uid_group]
  
      var domain_dict = {}
      var uid_dict = {}
  
      var domain_indices = Object.keys(domains).map(function(x){
        domain_dict[nodes[x].name] = domains[x]
      })
      var uid_indices = Object.keys(uids).map(function(x){
        uid_dict[nodes[x].uid] = uids[x]
      })
      
      //console.log(uid_dict, domain_dict)
  
      var data = Object.keys(domain_dict).map(function(x){return {"key":x,"value":domain_dict[x]}})
      _mo(data)
      
  
    }
  
    
    function order(value) {
      
  
      var t = svg.transition();
  
    var uids = nodes.slice(n)
      .sort(function(p,c){ 
        try{
          return p.group*1000 + group_uids[p.group][p.node]  - c.group*1000 - group_uids[c.group][c.node]
        } catch(e) {
          return 0
        }
        //return p.group - c.group
      })
      .map(function(x){ return x.node })
  
  
    var domains = nodes.slice(0,n)
      .sort(function(p,c){ 
        try{
          return p.group*1000 + group_domains[p.group][p.node]  - c.group*1000 - group_domains[c.group][c.node]
        } catch(e) {
          return 0
        }
        //return p.group - c.group
       })
      .map(function(x){ return x.node })
  
  
  
      x.domain(uids);
      y.domain(domains);
  
      // debugger
  
      t.selectAll(".row")    
           .delay(function(d, i) { return y(d[0].y) * 4; })
          .attr("transform", function(d, i) { return "translate(0," + y(d[0].y) + ")"; })
        .selectAll(".cell")
          .delay(function(d) { return x(d.x) * 4; })
          .attr("x", function(d) { return x(d.x); })
          .attr("cx", function(d) { return x(d.x); })
  
      
    }
  
    var timeout = setTimeout(function() {
      order();
    }, 1000);
    
  }


  action.show_clusters = function(wrapper) {

    var title = "User Clusters",
      series = ["clusters"],
      formatting = ".col-md-12.action-clusters",
      description = "Top user clusters"

    console.log(wrapper.datum())

    var domains = wrapper.datum().domains

    var domain_dict = d3.nest()
      .key(function(x){return x.domain})
      .map(domains)

    var target = RB.rho.ui.buildSeriesWrapper(wrapper.selectAll(".action-body"), title, series, [wrapper.datum()], formatting, description)

    var parentNode = wrapper.selectAll(".action-body").selectAll(".clusters")
    parentNode.selectAll(".loading-icon").remove()

    parentNode.classed("hidden",false)
      .style("visibility","hidden")


    setTimeout(function(){
      parentNode.classed("hidden",!parentNode.classed("selected"))
        .style("visibility",undefined)

    },1)

    var uid_cluster = d3_updateable(target,".uid-cluster","div")
      .classed("uid-cluster row",true)

    var left = d3_updateable(uid_cluster,".left","div")
      .classed("left col-md-6",true)

    var right = d3_updateable(uid_cluster,".right","div")
      .classed("right col-md-6",true)

    uid_cluster.each(function(x){
      buildKMeansPlot(x[0][0].uid_clusters,d3.select(this).selectAll(".left"),function(data){
        data = data.map(function(x){
          try {
            var cat = JSON.parse(JSON.stringify(domain_dict[x.key][0]))
          } catch(e) {
            var cat = {"category_name":"NA","parent_category_name":"NA","domain":"","count":1,"weighted":0}
          }

          cat.domain = x.key
          cat.count = x.value

          return cat
        })


        RB.rho.ui.buildBarTable(right,data,"asdf","domain",false,12,action.category_colors)

        //make_table(right,data,["key"])
      })
    })

    
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
