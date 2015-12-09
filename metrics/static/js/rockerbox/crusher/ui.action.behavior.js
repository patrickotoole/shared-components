var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  var now = new Date()

  var transformData = function(data) {
    var data = data.map(function(x){

      x.summed = x.values.reduce(function(p,c){
        p.y = p.y + c.y*c.groups
        return p
      },{ y: 0 })
  
      x.name = x.key
      x.values = x.values.map(function(y){
        var time = y.groups*60*1000
        y.date = new Date(+now - time)
        y.y = y.count
        return y
      }).sort(function(p,c){return p.date - c.date})
  
  
      // add to the beginning
      var z = JSON.parse(JSON.stringify(x.values[x.values.length-1]))
      var time = +new Date(z.date)
      z.date = new Date( time + 15*60*1000)
  
      x.values.push(z)
      x.values = x.values.slice(6-x.values.length)


      // add to the end
      var z = JSON.parse(JSON.stringify(x.values[0]))
      z.date = new Date(+new Date(x.values[1].date) - 20*60*1000)
  
      x.values = x.values.slice(1-x.values.length)
      x.values.splice(0,0,z)


      // add to the end
      var z = JSON.parse(JSON.stringify(z))
      z.y = z.y
      z.date = new Date(+new Date(z.date) - 30*60*1000)
  
      x.values.splice(0,0,z)
      x.values = x.values.sort(function(p,c){return p.date - c.date})


      
      x.final = x.values[x.values.length-1].y
      x.initial = x.values[0].y
  
      x.percent_diff = (x.final - x.initial)/x.initial
  
      return x
    })

    data = data
      .sort(function(c,p){return (p.values[p.values.length-1].y) - (c.values[c.values.length-1].y)})
      .slice(0,8)

    return data
  }

  var calcInflection = function(data) {
    return data.reverse().map(function(x) {
      return x.values.reduce(function(p,c){
        p.push( ((p[p.length-1]*p.length || 0) + c.y)/(p.length + 1))
        return p
      },[])
    }).reverse().reduce(function(p,c){
      c.map(function(x,i){
        p[i] = (p[i] || 0) + x
      })
      return p
    },[]).reverse().reduce(function(p,c){
      if (p[1] === undefined) return [0,c]
      if (c < p[1]) return [p[0] + 1,c]
      return p
    },[])[0]
  }


  var stackDates = function(data,all_data,x) {

    // HACK: need to share this object



    var stacked_dates = data[0].values
      .sort(function(p,c){return p.date - c.date})
      .map(function(d,i){ return { y:x(d.date), x:0, d: d.date } })

    var previous = 0
    stacked_dates = stacked_dates.reverse().map(function(d){
      d.y0 = previous
      previous = d.y
      d.all = all_data
     
      return d
    }).reverse()
    return stacked_dates
  }

  action.show_behavior = function(wrapper) {

    var title = "Before and After",
      series = ["before","after"],
      formatting = "col-md-12",
      description = "What happens to user activity before and after visiting this segment",
      ts = wrapper.selectAll(".action-body")

    var wrap = RB.rho.ui.buildSeriesWrapper(ts, title, series, false, formatting, description)
      .classed("row",true)

    var target = d3_updateable(wrap,".col-md-8","div")
      .classed("col-md-8",true)

    var rhs_target = d3_updateable(wrap,".col-md-4","div")
      .classed("col-md-4",true)

 

    var stack = d3.layout.stack()
      .offset("silhouette")
      .values(function(d) { return d.values; });


    var w = target.style("width").split(".")[0].replace("px","") || 700, 
        h = 340;
    
    var margin = {top: 40, right: 40, bottom: 30, left: 10},
      width = w - margin.left - margin.right,
      height = h - margin.top - margin.bottom;

        

    var before_wrapper = d3_splat(target,".before-wrapper","div",
      function(d){ 

        var x = d3.time.scale().range([0, width-100]);
        var y = d3.scale.linear().range([height, 0]);

        var area = d3.svg.area()
            .interpolate("cardinal")
            .x(function(d) { return x(d.date); })
            .y0(function(d) { return y(d.y0); })
            .y1(function(d) { return y(d.y0 + d.y); });

        var transformed_categories = transformData(d.before.categories),
          first = transformed_categories[0],
          inflection_pos = calcInflection(transformed_categories),
          inflection = first.values[first.values.length - inflection_pos -1],
          dates = first.values.map(function(d){return d.date})

        x.domain(d3.extent(dates, function(d) { return d; }));

        var data = [{
          stacked: stack(transformed_categories),
          categories: transformed_categories,
          inflection: inflection,
          stacked_dates: stackDates(transformed_categories,d.before.domains,x),

          area: area, x: x, y: y,                      // functions
          width: width, height: height, margin: margin // dimensions
        }]
        return data
      },
      function(x){ return x}
    ).classed("before-wrapper",true)
      .style("margin-left","-15px")

    var svg = before_wrapper.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .classed("behavior",true)



    action.build_behavior(svg,rhs_target)
    
  }

  action.build_behavior = function(svg,rhs_target){

    var data = svg.datum().categories
    var color = action.category_colors

    var inflection = svg.datum().inflection

    var browser = svg.selectAll(".browser")
      .data(function(x){ return x.stacked })
      .enter()
        .append("g")
        .attr("class", "browser");

    browser.append("path")
      .attr("class", "area")
      .attr("d", function(d) { 
        var area = d3.select(this.parentNode.parentNode).datum().area
        return area(d.values); 
      })
      .style("fill", function(d) { return color(d.name); });


    browser.append("text")
      .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
      .attr("transform", function(d) { 
        var x = d3.select(this.parentNode.parentNode).datum().x
        var y = d3.select(this.parentNode.parentNode).datum().y 
        return "translate(" + (x(d.value.date) + 5) + "," + y(d.value.y0 + d.value.y / 2) + ")"; 
      })
      .attr("x", 6)
      .attr("dy", ".35em")
      .attr("style", "font-size:.9em")
      .text(function(d) { 
          
          d.percent_diff = d3.select(this.parentElement).datum().percent_diff

          var x = d3.format("%")(d.percent_diff)
          x += (d.percent_diff > 0) ?  "↑" : "↓"

          var result = d.name
          result += (d.percent_diff != Infinity) ? " (" + x + ")" : ""

          return result
      })
      .attr("class",function(d){ return d.value.y < .02 ? "hidden" : "" })

    action.behavior_inflection(svg)
    action.behavior_visit(svg)
    action.behavior_axis(svg)
    action.behavior_hover(svg,rhs_target)

  }

  action.behavior_inflection = function(svg) {

    var inflectionLine = svg.append("g")

    inflectionLine.append("text")
        .attr("transform", function(d) { return "translate(" + (d.x(d.inflection.date)) + "," + (-25) + ")"; })
          .attr("dy", ".35em")
          .style("text-anchor","middle")
          .text(function(d) { 
              return "Behavioral change"
          })

    inflectionLine.append("line")
        .attr("x1", function(d){ return d.x(d.inflection.date) } )
        .attr("y1", -12)
        .attr("x2", function(d){ return d.x(d.inflection.date) })
        .attr("y2", function(d){ return d.height + 15} )
        .attr("stroke-dasharray","5, 5")
        .style("stroke-width", .5)
        .style("stroke", "grey")
        .style("fill", "none");

    inflectionLine.append("text")
        .attr("transform", function(d) { return "translate(" + (d.x(d.inflection.date) + 5) + "," + (d.height+10) + ")"; })
          .attr("dy", ".35em")
          .style("text-anchor","start")
          .classed("time start",true)
          .text(function(d) { 
              return parseInt((now - d.inflection.date)/60/1000) + " mins before"
          })

  }

  action.behavior_visit = function(svg) {
     var s = svg.append("g")

     s.append("line")
         .attr("x1", function(d){ return d.width - d.margin.right - 50 - d.margin.left})
         .attr("y1", -12)
         .attr("x2", function(d){ return d.width - d.margin.right - 50 - d.margin.left})
         .attr("y2", 0)
         .attr("stroke-dasharray","5, 5")
         .style("stroke-width", .5)
         .style("stroke", "grey")
         .style("fill", "none");

     s.append("text")
         .attr("transform", function(d) { return "translate(" + (d.width - d.margin.right - 50 - d.margin.left) + "," + (-25) + ")"; })
         .attr("dy", ".35em")
         .style("text-anchor","middle")
         //.text(function(d) { return "Visit" })

  }

  action.behavior_axis = function(svg) {

    var topRow = svg.append("g"),
      typical = topRow.append("g").classed("typical-behavior",true),
      intent = topRow.append("g").classed("intent-behavior",function(d) {
        d.intent_middle_point = d.x(d.inflection.date) + ((d.width -50 - d.margin.right - d.margin.left) - d.x(d.inflection.date))/2
        return true
      })

    
    typical.append("line")
        .attr("x1", function(d){ return d.x(d.inflection.date)/2 - 55 } )  
        .attr("y1", 0)
        .attr("x2", 5)  
        .attr("y2", 0)
        .attr("stroke-dasharray","1, 5")
        .style("stroke-width", 1)
        .style("stroke", "grey")
        .style("fill", "none");

    typical.append("text")
        .attr("transform", function(d) { return "translate(" + (d.x(d.inflection.date)/2) + "," + 0 + ")"; })
          .attr("dy", ".35em")
          .style("text-anchor","middle")
          .text(function(d) { return "Typical behavior" })

    typical.append("line")
        .attr("x1", function(d){ return d.x(d.inflection.date) - 5 })  
        .attr("y1", 0)
        .attr("x2", function(d){ return d.x(d.inflection.date)/2 + 55 })  
        .attr("y2", 0)
        .attr("stroke-dasharray","1, 5")
        .style("stroke-width", 1)
        .style("stroke", "grey")
        .style("fill", "none");

    

    intent.append("line")
        .attr("x1", function(d){return d.intent_middle_point - 20})  
        .attr("y1", 0)
        .attr("x2", function(d) {return d.x(d.inflection.date) + 5})  
        .attr("y2", 0)
        .attr("stroke-dasharray","1, 5")
        .style("stroke-width", 1)
        .style("stroke", "grey")
        .style("fill", "none");
    
    intent.append("text")
        .attr("transform", function(d) { return "translate(" + d.intent_middle_point + "," + 0 + ")"; })
          .attr("dy", ".35em")
          .style("text-anchor","middle")
          .text(function(d) { return "Intent" })

    intent.append("line")
        .attr("x1", function(d){return d.width - d.margin.right - 60})  
        .attr("y1", 0)
        .attr("x2", function(d){return d.intent_middle_point + 20}) 
        .attr("y2", 0)
        .attr("stroke-dasharray","1, 5")
        .style("stroke-width", 1)
        .style("stroke", "grey")
        .style("fill", "none");




    topRow.append("text")
      .attr("transform", function(d) { return "translate(" + (d.width - 50 + (d.margin.left)/2 ) + "," + 0 + ")"; })
      .attr("x", 6)
      .attr("dy", ".35em")
      .style("text-anchor","middle")
      .text(function(d) { return "During visit" })



    var bottomRow = svg.append("g")

    bottomRow.append("line")
        .attr("x1", 0)
        .attr("y1", function(d){ return d.height-8})
        .attr("x2", 0)
        .attr("y2", function(d){ return d.height})
        .style("stroke-width", .5)
        .style("stroke", "grey")
        .style("fill", "none");

    bottomRow.append("text")
        .attr("transform", function(d) { return "translate(" + 0 + "," + (d.height+10) + ")"; })
        .attr("dy", ".35em")
        .classed("time start",true)
        .style("text-anchor","start")
        .text(function(d) { return "> 8 hours before visit" })

  }
    
  action.behavior_hover = function(svg,target) {

    var date_rects = svg.selectAll("dates")
        .data(function(x){return x.stacked_dates})
        .enter().append("g")
        .attr("class", "dates");

    date_rects
        .append("rect")
        .attr("x", function(d){ return d.y })
        .attr("y", 0)
        .attr("fill","#fff")
        .attr("opacity",".2")
        .attr("width", function(d){    
            if ((d.y0 - d.y) > 0) return d.y0 - d.y 
            return 0
        })
        .attr("height", function(d){
          return d3.select(this.parentNode.parentNode).datum().height
        })
        .on("mouseover",function(d){
            var d = d;

            d3.selectAll(".time").classed("hidden",true)
            d3.select(this.parentNode).select("text").classed("hidden",false)
            
            d3.select(this.parentElement.parentElement).selectAll("rect").attr("opacity",".2")
            d3.select(this).attr("opacity","0")


            var data = d.all[((now - d.d )/60/1000)].sort(function(p,c){return c.uid - p.uid})
              .map(function(x) {
                x.count = x.uid
                x.category_name = ""
                return x
              })

            RB.rho.ui.buildBarTable(target,data,"asdf","domain",false,18,action.category_colors)

            //RB.rho.ui.buildBarTable(target,data,"",["uid"])

        })
        .on("mouseout",function(d){
            //d3.selectAll(".time").classed("hidden",true)
            //d3.selectAll(".time.start").classed("hidden",false)
            //d3.select(this).attr("opacity",".2")
        })

    date_rects
        .append("text")
        .attr("x", function(d){ return d.y + 6 })
        .attr("y", function(d){
          var height = d3.select(this.parentNode.parentNode).datum().height

          return height + 20
        } )
        .classed("time hidden",true)
        .text(function(d){
            return parseInt((now - d.d)/60/1000) + " mins before"
        }) 



  }

  return action

})(RB.crusher.ui.action || {})  
