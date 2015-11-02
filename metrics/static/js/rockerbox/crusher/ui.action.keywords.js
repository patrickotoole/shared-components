var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  var crusher = RB.crusher

  var parse = function parse(url) {
    try {
  
      var kws = url.split(".com")[1].replace(/_/g,"-").replace(/\//g,"-").split(".")[0].split("-").filter(function(x){
        return x.length > 2
      }).map(function(x){return x.toLowerCase() }).filter(function(x){
        return x.indexOf("=") == -1
      })
  
      return kws
    } catch(e) {return []}
  }
  
  
  var increment_and_add = function increment_and_add(bag,inverse_bag,word) {
    if (bag[word] == undefined) {
      bag[word] = Object.keys(bag).length
      inverse_bag[bag[word]] = word
    }
  }
  
  function build_relations(relations, word1, word2, value) {
    var h = relations[word1] || {}
    h[word2] = (h[word2] || 0) + value
    relations[word1] = h
  }
  
  var combinations = function combinations(head, tail, results) {
  	
    if (tail.length == 0) {
      return results
    }
  
    if (head == undefined) {
      head = tail[0]
      tail = tail.slice(1,tail.length)
    }
  
    Array.prototype.push.apply(results,tail.map(function(x){return [x,head]}))
  
    head = tail[0]
    tail = tail.slice(1,tail.length)
  
    return combinations(head, tail, results)
  }

  action.cloud_data = function(urlData) {
    var bag = {}, relations = {}, inverse_bag = {}
    
    kw_counts = urlData.map(function(x){return {"keywords":parse(x.url),"count":x.count}}).sort(function(x,y){return y.count - x.count}).slice(0,40)
    kw_counts.map(function(x) { return x.keywords.map(function(y){ increment_and_add(bag,inverse_bag,y) }) })
    
    
    kw_counts.map(function(item) {
      var combos = combinations(undefined,item.keywords,[])
      combos.map(function(combo){
        build_relations(relations,combo[0],combo[1],item.count)
      })
    })
    
    var groups = Object.keys(bag).map(function(key){
      return {"name":key,"group":bag[key]}
    })
    
    var links = []
    Object.keys(relations).map(function(first){
      var values = Object.keys(relations[first]).map(function(second){
        return {"target":bag[first],"source":bag[second],"value":relations[first][second]}
      })
      Array.prototype.push.apply(links, values)
    })


    return {
      "nodes":groups,
      "links":links
    }
  }

  action.show_cloud = function(wrapper,urlData) {

    var swrap = d3_updateable(wrapper,".cloud","div")
      .classed("cloud series-wrapper",true)

    var series = d3_updateable(swrap,".series","div")
      .classed("series cloud",true)

    d3_updateable(series,".title","div")
      .classed("title",true)
      .text("On-site Keywords")

    d3_updateable(series,".value","div")
      .classed("value",true)

    d3_updateable(series,".description","div")
      .classed("description",true)
      .text("These are the keywords associated with on-site pages")

    wrapper = series

    var graph = action.cloud_data(urlData)

    var width = parseInt(wrapper.style("width").replace("px","") - 30),
      height = 370;

    
    var force = d3.layout.force()
      .charge(-150)
      .linkDistance(75)
      .size([width-50, height-30]);
    
    var svg = d3_updateable(wrapper,".svg-cloud","svg")
      .classed("svg-cloud",true)
      .attr("width", width)
      .attr("height", height);

    action.build_cloud(graph,force,svg)
    
  }

  action.build_cloud = function(graph,force,svg) {
  
    var max_link_value = 0;
    var color = d3.scale.category20();

    graph.links.map(function(x){
      max_link_value = Math.max(max_link_value,x.value)
      return x
    })

    force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();
  
    var link = svg.selectAll(".link")
        .data(graph.links)
      .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function(d) { return Math.sqrt(d.value/max_link_value*200); });
  
    link.filter(function(x){
      return x.target.weight < 2 || x.source.weight < 2
    }).remove()
    
    var gnodes = svg.selectAll('g.gnode')
      .data(graph.nodes)
      .enter()
      .append('g')
      .classed('gnode', true);
    
    gnodes.filter(function(x){
      return x.weight < 2
    }).remove()
  
    var node = gnodes.append("circle")
      .attr("class", "node")
      .attr("r", function(x) {
        return x.name == "convertor" ? 30 : Math.max(Math.log(x.weight)*3.9,5)
      })
      .style("fill", function(d) { return color(d.group); })
      .call(force.drag);
  
    var labels = gnodes.append("text")
      .text(function(d) { return d.name; });
    
    node.append("title")
      .text(function(d) { return d.name; });
    
    force.on("tick", function() {

      link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    
      gnodes.attr("transform", function(d) { 
        return 'translate(' + [d.x, d.y] + ')';
      });
        
    });
    
  }
    
    

    


  return action

})(RB.crusher.ui.action || {})  

