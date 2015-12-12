var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  var now = new Date()

  var transformData = function(data) {
    var data = data.map(function(x){

      x.summed = x.values.reduce(function(p,c){
        p.y = p.y + c.y*c.time_bucket
        return p
      },{ y: 0 })
  
      x.name = x.key
      x.values = x.values.map(function(y){
        var time = y.time_bucket*60*1000
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

  action.build_behavior_wrapper = function(wrapper) {

    var title = "",
      series = ["before","after"],
      formatting = "col-md-12",
      description = "", //"What happens to user activity before and after visiting this segment",
      ts = wrapper.selectAll(".action-body")

    var wrap = RB.rho.ui.buildSeriesWrapper(ts, title, series, false, formatting, description)
      .classed("row",true)

    wrap.selectAll(".title").remove()
    wrap.selectAll(".value").remove()


    return wrap
  }

  action.show_behavior = function(wrapper) {

    var wrap = action.build_behavior_wrapper(wrapper)

    function elementToWidth(elem) {
      var num = wrap.style("width").split(".")[0].replace("px","") 
      return parseInt(num)
    }

    var w = elementToWidth(wrap) || 700, 
        h = 340;

    w = w/12*8 - 50 // this is to make it fit with col-md-8

    var margin = {top: 40, right: 10, bottom: 30, left: 10},
      width = w - margin.left - margin.right,
      height = h - margin.top - margin.bottom;

    var transform_before_after_data = function(d,is_before){

      var key       = is_before ? "before" : "after",
        orientation = is_before ? "left" : "right";

      var leftOffset, rightOffset;

      var transformed_categories = transformData(d[key].categories);

      if (is_before) {
        leftOffset = 0
        rightOffset = 140
      } else {
        leftOffset = 140
        rightOffset = 0

        transformed_categories.map(function(x) {
          if (key == "after") x.values.map(function(y){ y.date = new Date(+now + y.time_bucket*60*1000) })
        })
      }

      var x = d3.time.scale().range([leftOffset, width-rightOffset]);
      var y = d3.scale.linear().range([height, 0]);

      var stack = d3.layout.stack()
        .offset("silhouette")
        .values(function(d) { return d.values; });

      var area = d3.svg.area()
        .interpolate("cardinal")
        .x(function(d) { return x(d.date); })
        .y0(function(d) { return y(d.y0); })
        .y1(function(d) { return y(d.y0 + d.y); });
      

      var first = transformed_categories[0],
        inflection_pos = calcInflection(transformed_categories),
        inflection = first.values[key == "after" ? inflection_pos : first.values.length - inflection_pos -1],
        dates = first.values.map(function(d){return d.date})

      x.domain(d3.extent(dates, function(d) { return d; }));

      return {
        key: key,
        stacked: stack(transformed_categories),
        categories: transformed_categories,
        inflection: inflection,
        stacked_dates: stackDates(transformed_categories,d[key].domains,x),
        orientation: orientation,
        area: area, x: x, y: y,                       // functions
        width: width, height: height, margin: margin, // dimensions
        leftOffset: leftOffset,
        rightOffset: rightOffset
      }

    }

    var before_wrapper = d3_splat(wrap,".before-wrapper","div",
      function(d){ 

        var before = transform_before_after_data(d,true)
        var after = transform_before_after_data(d,false)

        var data = [before,after]

        return data
      },
      function(x){ return x.key }
    ).classed("before-wrapper",true)
      .style("margin-left","-15px")

    

    action.build_behavior(before_wrapper)
    
  }

  action.behavior = {

    title: function(d,i){
      var str = i ? "" : "<br>"
      str += "Activity " + d.key.capitalize() + " Visiting"
      return str
    },
    description: function(d){
      var str = "Below shows the change in categories that a user visits "
      str += d.key
      str += " they take part in this action"

      return str
    }
  }


  action.build_behavior = function(wrapper){

    /*
      Headers
     */

    d3_updateable(wrapper,".title","div")
      .classed("title col-md-12",true)
      .html(action.behavior.title)

    d3_updateable(wrapper,".value","div")
      .classed("value col-md-12",true)

    d3_updateable(wrapper,".description","div")
      .classed("description col-md-12",true)
      .style("margin-bottom","10px")
      .text(action.behavior.description)


    /*
      Body
    */

    var lhs_target = d3_updateable(wrapper,".col-md-8","div")
      .classed("col-md-8",true)
      .classed("pull-right",function(d){return d.key == "after"})

    var rhs_target = d3_updateable(wrapper,".col-md-3","div")
      .classed("col-md-4",true)


    /*
      Chart
    */

    var svg = lhs_target.append("svg")
        .attr("width", function(d){ return d.width + d.margin.left + d.margin.right} )
        .attr("height", function(d){ return d.height + d.margin.top + d.margin.bottom} )
      .append("g")
        .attr("transform", function(d) {return "translate(" + d.margin.left + "," + d.margin.top + ")" })
        .classed("behavior",true)


     var mouseover = function(d){
       var d = d,
         time_bucket = ((now - d.d )/60/1000)
         parentNode = d3.select(this.parentElement.parentElement.parentElement)

       d3.selectAll(".time").classed("hidden",true)
       d3.select(this.parentNode).select("text").classed("hidden",false)
       
       d3.select(this.parentElement.parentElement).selectAll("rect").attr("opacity",".2")
       d3.select(this).attr("opacity","0")

       time_bucket = time_bucket > 0 ? time_bucket : -1*time_bucket

       var data = d.all[time_bucket].sort(function(p,c){return c.uid - p.uid})
         .map(function(x) {
           x.count = x.uid
           x.category_name = ""
           return x
         })

       var filtered = rhs_target.filter(function(d){ return d == parentNode.datum()})
       RB.rho.ui.buildBarTable(filtered,data,"asdf","domain",false,15,action.category_colors)

    }   

    
    action.behavior_paths(svg)
    action.behavior_labels(svg)
    action.behavior_inflection(svg)
    action.behavior_visit(svg)
    action.behavior_axis(svg)
    action.behavior_hover(svg,mouseover)

  }

  action.behavior_paths = function(svg) {
    /* Path Wrapper */

    var path_wrapper = d3_updateable(svg,".path-wrapper","g")
      .classed("path-wrapper",true)

    var browser = d3_splat( path_wrapper,".stack","g",
        function(x){ return x.stacked },
        function(x){ return x.key }
      ).attr("class", "stack");

    d3_updateable(browser,".area","path")
      .attr("class", "area")
      .attr("d", function(d) { 
        var parent = d3.select(this.parentNode.parentNode).datum()
        
        var area = parent.area
        var orient = (parent.orientation == "left")
        return area(d.values); 
      })
      .style("fill", function(d) { return action.category_colors(d.name); });

  }

  action.behavior_labels = function(svg) {
    /* Label Wrapper */

    var label_wrapper = d3_updateable(svg,".label-wrapper","g")
      .classed("label-wrapper",true)

    d3_splat(label_wrapper,".label","text",
        function(x){ return x.stacked },
        function(x){ return x.key }
      ).attr("class","label")
      .datum(function(d) { 
        var parent = d3.select(this.parentNode.parentNode).datum()
        d.orient = parent.orientation == "left"

        return {
          name: d.name, 
          value: d.values[d.orient ? (d.values.length - 1) : 0 ], 
          percent_diff: d.percent_diff,
          orient: d.orient,
          leftOffset: parent.leftOffset
        }; 
      })
      .attr("transform", function(d) { 
        var parent = d3.select(this.parentNode.parentNode).datum()
        var y = parent.y 
        var width = parent.width

        var yPos = y(d.value.y0 + d.value.y / 2)
        var xPos = d.orient ? (width - parent.rightOffset + 5) : 0

        return "translate(" + xPos + "," + yPos + ")"; 
      })
      .attr("x", function(d){ return d.orient ? 6: (d.leftOffset -6) })
      .attr("dy", ".35em")
      .attr("style", "font-size:.9em")
      .attr("style", function(d){ 
        return d.orient ? 
          "text-anchor:start;font-size:.9em": 
          "text-anchor:end;font-size:.9em"
      })
      .text(function(d) { 
          
          var x = d3.format("%")(d.percent_diff)
          x += (d.percent_diff > 0) ?  "↑" : "↓"

          var result = d.name
          result += (d.percent_diff != Infinity) ? " (" + x + ")" : ""

          return result
      })
      .attr("class",function(d){ 
        return d.value.y < .03 ? "hidden" : "" 
      })
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
              var num = parseInt((now - d.inflection.date)/60/1000)
              var preposition = num > 0 ? "before" : "after"
              num = num > 0 ? num : -num
              return  num + " mins " + preposition
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

    var topRow = svg.append("g")

     

    var leftLine = labelWithDottedLine(svg)
      .width(function(d){return d.x(d.inflection.date) - d.leftOffset })
      .x(function(d) {return d.leftOffset })
      .classname("typical")
      .text(function(d){
        return d.orientation == "left" ? "Typical behavior" : "Intent"
      })()


    var rightLine = labelWithDottedLine(svg)
      .width(function(d){return  d.width - d.x(d.inflection.date) - d.rightOffset})
      .x(function(d) {return d.x(d.inflection.date) })
      .classname("intent")
      .text(function(d){
        return d.orientation == "left" ? "Intent" : "Typical behavior" 
      })()


    // var rightLine = labelWithDottedLine(svg)
    //   .width(function(d){return  d.leftOffset + d.rightOffset})
    //   .x(function(d) {return d.leftOffset + d.width - d.rightOffset})
    //   .classname("visit")
    //   .text("During visit")()


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
    
  action.behavior_hover = function(svg,mouseover) {

    var date_wrapper = d3_updateable(svg,'.date-wrapper',"g")
      .classed("date-wrapper",true)

    var date_rects = date_wrapper.selectAll("dates")
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
        .on("mouseover",mouseover)
        .on("mouseout",function(d){})

    date_rects
        .append("text")
        .attr("x", function(d){ return d.y + 6 })
        .attr("y", function(d){
          var height = d3.select(this.parentNode.parentNode).datum().height

          return height + 20
        } )
        .classed("time hidden",true)
        .text(function(d){
          var num = parseInt((now - d.d)/60/1000)
          var preposition = num > 0 ? "before" : "after"
          num = num > 0 ? num : -num
          return  num + " mins " + preposition

        }) 



  }

  return action

})(RB.crusher.ui.action || {})  
