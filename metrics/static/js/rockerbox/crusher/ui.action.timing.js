var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

      var margin_left = 170,
          maxWidth = 760,
          maxTop = 100

      var margin = { top: maxTop, right: 100, bottom: 100, left: margin_left },
          width = maxWidth - margin.left - margin.right,
          height = 430 - margin.top - margin.bottom,
          gridSize = Math.floor(width / 24),
          legendElementWidth = gridSize*2,
          buckets = 9,
          colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"], // alternatively colorbrewer.YlGnBu[9]
          days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
          times = ["1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12a", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p", "12p"];

      

      var barChart = function(data,title,_colors,_base) {

        var margin = {top: 20, right: 10, bottom: 0, left: margin_left},
            width = maxWidth - margin.left - margin.right,
            height = 70 - margin.top - margin.bottom;

        var l = Array.apply(null, Array(Object.keys(times).length)).map(function (_, i) {return i+1;});
        var x = d3.scale.ordinal().range(l);
        var y = d3.scale.linear().range([height, 0]);

        var colorScale = d3.scale.quantile()
          .domain([0, d3.max(data, function (d) { return d.frequency; })])
          .range(colors);

        colorScale = _colors || colorScale

        var _base = _base || d3.select("#chart")

        var _svg = _base.selectAll(".bar-top").data([0],function(x){ return x })

        _svg.enter().append("svg")
          .attr("class","bar-top")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)

        _svg.exit().remove()

        var svg = _svg.selectAll("g.bar-top").data([data],function(x){ return JSON.stringify(x) })

        svg.enter()
            .append("g")
            .attr("class","bar-top")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.exit().remove()

        var _title = _svg.selectAll("text").data([0],function(x){ return x })

        _title.enter()
            .append("text").text(title)
            .attr("transform", "translate(" + (margin.left -12) + "," + (margin.top + height - 5) + ")")
            .style("text-anchor","end")
            .style("font-weight","bold")
            .style("font-family", "helvetica")

        _title.exit().remove()


        x.domain(data.map(function(d) { return d.hour; }));
        y.domain([0, d3.max(data, function(d) { return Math.sqrt(d.visits); })]);

        svg.selectAll(".bar")
            .data(data)
          .enter().append("rect")
            .attr("class", "timing-bar")
            .attr("x", function(d) { return (d.hour - 1) * gridSize; ; })
            .attr("width", gridSize)
            .attr("y", function(d) { return y(Math.sqrt(d.frequency)); })
            .attr("fill","#aaa")
            .attr("fill",function(x) { return colorScale(x.frequency) } )
            .attr("stroke","white")
            .attr("stroke-width","2px")
            .attr("height", function(d) { return height - y(Math.sqrt(d.frequency)); });


      }


      var negativeBarChart = function(data,title) {

        var margin = {top: 20, right: 10, bottom: 0, left: margin_left},
            width = maxWidth - margin.left - margin.right,
            height = 100 - margin.top - margin.bottom;


        var l = Array.apply(null, Array(Object.keys(times).length)).map(function (_, i) {return i+1;});

        var x = d3.scale.ordinal()
            .range(l);

        var y = d3.scale.linear()
            .range([height, 0]);


        var _svg = d3.select("#chart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)

        var svg = _svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        _svg.append("text").text(title)
            .attr("transform", "translate(" + (margin.left -12) + "," + (margin.top + 15) + ")")
            .style("text-anchor","end")
            .style("font-weight","bold")
            .style("font-family", "'helvetica neue'")

        x.domain(data.map(function(d) { return d.hour; }));
        y.domain([0, d3.max(data, function(d) { return d.visits; })]);

        svg.selectAll(".bar")
            .data(data)
          .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return (d.hour - 1) * gridSize; ; })
            .attr("width", gridSize)
            .attr("y", function(d) { return 0; })
            .attr("fill","#aaa")
            .attr("stroke","white")
            .attr("stroke-width","2px")
            .attr("_hour", function(d) { return d.hour })
            .attr("height", function(d) { return 100 - y(d.visits); });
      
      }

      var verticalBarChart = function(data,svg,_colors) {

        var margin = {top: maxTop, right: 10, bottom: 0, left: maxWidth-90},
            width = maxWidth - margin.left - margin.right,
            height = 50  - margin.bottom;

        

        var l = Array.apply(null, Array(data.length)).map(function (_, i) {return i+1;});

        var w = d3.scale.linear()
            .domain([0, d3.max(data, function(d) { return Math.sqrt(d.frequency); })])
            .range([0,height]);

        var svg = svg.selectAll("g.vertical").data([data],function(x){ return JSON.stringify(x) })

          svg.enter().append("g")
            .attr("class","vertical")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          svg.exit().remove()

        var colorScale = d3.scale.quantile()
              .domain([0, d3.max(data, function (d) { return d.frequency; })])
              .range(colors);

        colorScale = _colors || colorScale



        svg.selectAll(".bar")
            .data(data)
          .enter().append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("width", function(d) { return w(Math.sqrt(d.frequency)); })
            .attr("y", function(d) { return (d.pos ) * gridSize; ; })
            .attr("fill",function(x) { return colorScale(x.frequency) } )
            .attr("stroke","white")
            .attr("stroke-width","2px")
            .attr("height", gridSize);
        
      }



      var heatmapChart = function(data, onsite, base) {


          /* Top: On-site */

          var _onsite_data = onsite.map(function(x){
            x.frequency = x.visits
            x.hour = ((+x.hour - 5 + 24) % 24) + 1
            return x
          }).sort(function(p,c) { return p.hour - c.hour})


          var _offsite_data = buildOffsiteData(data)
          


          /* Main: section */
          
          var _svg = base.append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)

          barChart(_offsite_data,"Off-site activity",false,_svg)

          var svg = _svg
              .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


          /* Bottom: Off-site */



          //negativeBarChart(_offsite_data,"Off-site activity")



          
          var timeLabels = svg.selectAll(".timeLabel")
              .data(times)
              .enter().append("text")
                .text(function(d) { return d; })
                .attr("x", function(d, i) { return i * gridSize; })
                .attr("y", 0)
                .style("text-anchor", "middle")
                .attr("transform", "translate(" + gridSize / 2 + ", -6)")
                .attr("class", function(d, i) { return ((i >= 7 && i <= 16) ? "timeLabel mono axis axis-worktime" : "timeLabel mono axis"); });

          var xx = {}
          data.map(function(x){
            xx[x.parent_category_name] = (xx[x.parent_category_name] || 0) + x.visits
            x.day = x.parent_category_name
            x.original = x.hour
            x.hour = ((+x.hour - 5 + 24) % 24) + 1

            x.value = x.visits
          })


          var days = Object.keys(xx).sort(function(p,c){ return xx[p] - xx[c] }).slice(-15)
          var l = Array.apply(null, Array(Object.keys(xx).length)).map(function (_, i) {return i+1;});
          var l15 = Array.apply(null, Array(15)).map(function (_, i) {return i+1;});


          var newData = []

          days.reverse()

          days.map(function(x) { return x}).map(function(d,i){
            if (i % 2) newData.push(d)
            else newData.unshift(d)
            return d
          })

          newData = newData.map(function(x,i){
            return { key: x, pos: i + 1 }
          })

          var l15 = newData.map(function(x,i){ return x.pos })
          var days = newData.map(function(x,i){ return x.key })




          var dayLabels = svg.selectAll(".dayLabel")
            .data(days)
            .enter().append("text")
              .text(function (d) { return d; })
              .attr("x", 0)
              .attr("y", function (d, i) { return i * gridSize; })
              .style("text-anchor", "end")
              .attr("transform", "translate(-6," + gridSize / 1.5 + ")")
              .attr("class", function (d, i) { return ((i >= 0 && i <= 4) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis axis-workweek"); });

          var vals = d3.scale.ordinal()
            .domain(days)
            .range(l15)

          var colorScale = d3.scale.quantile()
              .domain([0, buckets - 1, d3.max(data, function (d) { return d.value; })])
              .range(colors);

          var filteredData = data.filter(function(x){ return days.indexOf(x.day) > -1 })

          var cards = svg.selectAll(".hour")
              .data(filteredData, function(d) {return d.day+':'+d.hour;});

          
          cards.enter().append("rect")
              .attr("x", function(d) { return (d.hour - 1) * gridSize; })
              .attr("y", function(d) { return (vals(d.day) - 1) * gridSize; })
              .attr("rx", 0)
              .attr("ry", 0)
              .attr("class", "hour bordered")
              .attr("width", gridSize)
              .attr("height", gridSize)
              .style("fill", "white")
              .on("mouseover",function(d){

                d3.select(this.parentElement).selectAll("rect").style("opacity",".5")
                d3.select(this.parentElement).selectAll("rect").filter(function(x){return (x.day == d.day) || (x.hour == d.hour) }).style("opacity","1")

                var xx = {}
                filteredData.map(function(x){
                  if (x.hour == d.hour) {
                    xx[x.parent_category_name] = x.visits
                  }
                })

                var categories = JSON.parse(JSON.stringify(
                  filteredData.filter(function(x){
                    return x.day == d.day
                  })
                )).map(function(x){
                  x.hour = x.original
                  return x
                })


                var _offsite_data = buildOffsiteData(categories)
                var _category_data = buildCategoryData(xx)[0]

                _category_data.map(function(z){
                  z.pos = _position_data[z.key]
                })

                //console.log(d.hour,d.parent_category_name,xx,_category_data.map(function(x){return x.frequency}))
                
                debugger
                barChart(_offsite_data,"Off-site activity",colorScale)
                verticalBarChart(_category_data,_svg,colorScale)

              })
          _svg.on("mouseout",function(d){
            d3.select(this).selectAll("rect").style("opacity","1")
            barChart(_offsite_data,"Off-site activity")
            verticalBarChart(_category_data,_svg)
          })
              // .attr("class", function(d) { 
                
              //   return [d.day,d.hour,d.value,colorScale(d.value),vals(d.day)].join("-")
              // });

          cards.transition().duration(1000)
              .style("fill", function(d) { return colorScale(d.value); });

          // cards.select("title").text(function(d) { return d.value; });          
          cards.exit().remove();

          
          
          var _data = buildCategoryData(xx)
          var _category_data = _data[0]
          var _position_data = _data[1]

          verticalBarChart(_category_data,_svg)
          
          

      }


      var buildOffsiteData = function(data) {
        var _offsite_data = d3.nest()
            .key(function(x){return +x.hour})
            .rollup(function(x){return d3.sum( x.map(function(d){ return d.visits }) ) })
            .entries(data)
            .map(function(x){
              x.hour = +x.key
              x.visits = x.values
              x.frequency = x.visits
              x.hour = ((x.hour - 5 + 24) % 24) + 1
              return x
            }).sort(function(p,c) { return p.hour - c.hour})

        return _offsite_data
      }

      var buildCategoryData = function(xx) {

        var _category_data = Object.keys(xx).map(function(x,i) {
          return {"frequency":xx[x],"key":x}
        }).sort(function(p,c) { 
          return p.frequency - c.frequency 
        }).slice(-15)
        
        var newData = []
        var categoryPositions = {}

        _category_data.reverse().map(function(d,i){
          if (i % 2) newData.push(d)
          else newData.unshift(d)
        })

        newData.map(function(x,i){
          categoryPositions[x.key] = i
          x.pos = i
          return x
        })

        return [_category_data,categoryPositions]
      }


  action.show_timing = function(wrapper) {

    var title = "Timing",
      series = ["timing"],
      formatting = ".col-md-12",
      description = "", 
      ts = wrapper.selectAll(".action-body")

    var wrap = RB.rho.ui.buildSeriesWrapper(ts, title, series, false, formatting, description)

    var parentNode = ts.selectAll(".timing")
    parentNode.selectAll(".loading-icon").remove()

    parentNode.classed("hidden",false)
      .style("visibility","hidden")

    setTimeout(function(){
      parentNode.classed("hidden",!parentNode.classed("selected"))
        .style("visibility",undefined)
    },1)

    wrap.datum(function(d) {
      return d
    })

    wrap.each(function(d){
      heatmapChart(d.hourly.categories,d.hourly.onsite,d3.select(this))
    })

    
  }

  return action

})(RB.crusher.ui.action || {})  
