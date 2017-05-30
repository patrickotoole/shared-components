var radialTree = function(root, wrapper, colorScale, nodeSizeScale, nodeSize, nodeColor){

    var diameter = 1000;

    var margin = {top: 50, right: 120, bottom: 20, left: 180},
        width = diameter,
        height = diameter;

        
    var i = 0,
        duration = 350,
        root;

    var tree = d3.layout.tree()
        .size([360, diameter / 2 - 80])
        // .separation(function(a, b) { return (a.parent == b.parent ? 20: 10) / a.depth; });

    var diagonal = d3.svg.diagonal.radial()
        .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

    var svg = wrapper.append("svg")
        .attr("width", width )
        .attr("height", height )
      .append("g")
        .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");


    function update(source, depth) {

        // Compute the new tree layout.
        var nodes = tree.nodes(root),
        links = tree.links(nodes);


        var nested = d3.nest().key(function(d){return d.depth}).entries(nodes)
        // Normalize for fixed-depth.
        nodes.forEach(function(d) { 
            d.y = d.depth * depth; 
        });

        // Update the nodes…
        var node = svg.selectAll("g.node")
            .data(nodes, function(d) { return d.id || (d.id = ++i); });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            //.on("click", click);

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeEnter.append("text")
            .attr("x", 10)
            .attr("dy", ".35em")
            .attr("text-anchor", function(d){
                if(d.depth == 0){
                    return "middle"
                }
                else if((d.x%360)  <= 180){
                    return "start"
                }
                else{
                    return "end"
                }
            })
            .text(function(d) { return d.name })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })

        nodeUpdate.select("circle")
            .attr("r", function(d){
                return nodeSizeScale( d['metrics'][nodeSize] )
            })
            .style("fill", function(d) { 
                return d['metrics'][nodeColor] == 0 ? 0: colorScale(d['metrics'][nodeColor])
            })

        nodeUpdate.select("text")
            .style("fill-opacity", .75)
            .attr("transform", function(d) { 
                if (d.depth==0){
                    console.log(d)
                    //return "rotate(90)"
                } else{
                    if ( d.x%360 > 180 ){
                        return "rotate(180)"
                    }
                                        // return (d.x%360)  < 180 ? "translate(0)" : "rotate(180)translate(-" + (d.name.length-10)  + ")"; 
                }
            });

        var nodeExit = node.exit().transition()
            .duration(duration)
            //.attr("transform", function(d) { return "diagonal(" + source.y + "," + source.x + ")"; })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links…
        var link = svg.selectAll("path.link")
            .data(links, function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

    }

    // Toggle children on click.
    function click(d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      
      update(d);
    }

    // Collapse nodes
    function collapse(d) {
      if (d.children) {
          d._children = d.children;
          d._children.forEach(collapse);
          d.children = null;
        }
    }
    update(root,  150)
    var tooltip = wrapper.append("div")   
        .attr("class", "tooltip")               
        .style("opacity", 0);


    svg.selectAll("text")
        .on("mouseover", function(d) {      
            tooltip.style("opacity", 2);      
            tooltip.html(
                function(x){
                    var tooltipColumns = ["imps_30d", "attr_conv_7d","cpa_attr_7d", "media_cost_yest","imps_yest"]
                    var tooltipString = tooltipColumns.map(function(t){
                        return t + ": "  + (formatter(t) ? formatter(t)(d.metrics[t]) : d.metrics[t]) + "<br>" 
                    })
                    .join("")
                    tooltipString = d.name + "<br>" + tooltipString
                    return tooltipString
                }

            ) 
                .style("left", (d3.event.pageX) + "px")     
                .style("top", (d3.event.pageY - 28) + "px");  
            })  
        .on("mousemove", function(d) {      
            tooltip.style("opacity", 2);      
            tooltip.html(
                function(x){
                    var tooltipColumns = ["imps_30d", "attr_conv_7d","cpa_attr_7d", "media_cost_yest","imps_yest"]
                    var tooltipString = tooltipColumns.map(function(t){
                        return t + ": "  + (formatter(t) ? formatter(t)(d.metrics[t]) : d.metrics[t]) + "<br>" 
                    })
                    .join("")
                    tooltipString = d.name + "<br>" + tooltipString
                    return tooltipString
                }

            ) 
                .style("left", (d3.event.pageX) + "px")     
                .style("top", (d3.event.pageY - 28) + "px");  
            })                 
        .on("mouseout", function(d) {       
            tooltip.transition()        
                .style("opacity", 0);   
        });



    return svg
}

