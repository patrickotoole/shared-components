var RB = RB || {}
RB.rho = RB.rho || {}
RB.rho.ui = RB.rho.ui || {}

RB.rho.ui = (function(ui) {

  var rho = RB.rho

  
  ui.buildChart = function(target, data, label_col, value_col, title, description, type, summary, format, height, paddingLeft) {
    type = type || "line";
    summary = summary || "sum";
    format = format || d3.format(",")
    var labels = []
    var series = []
    
    data.map(function(d){
      labels.push(d[label_col]);
      series.push(d[value_col]);
    })

    
    var total = data.reduce(function(p,c){return p + c[value_col]},0)
    if (summary == "average") total = total/data.length
 
    var data = {
      labels: labels,
      series: [series]
    };

    var options = {
      width: d3.select(target).style("width") - 10,
      height: height || 130,
      showArea: true,
      horizontalBars: true,
      axisX: {
	showGrid: false,
	showLabel: false
      },
      axisY: {
	showGrid: true,
	showLabel: true
      },
      fullWidth: true,
      chartPadding: {
        left: paddingLeft || 15 
      }
    };

    $(target).append($("<div class='chart-wrapper'>"))

    if(type === "line"){
      new Chartist.Line(target + " .chart-wrapper", data, options);
    }
    else if(type === "bar"){
      new Chartist.Bar(target + " .chart-wrapper", data, options);
    }

    if (!$(target + " .chart-description").length && description){
      $(target).prepend($("<div class='chart-description'>").text(description));
    };

    if (!$(target + " .chart-total").length && total){
      $(target).prepend($("<div class='chart-total'>").text(format(total)));
    };
    
    // Add title if it doesn't exist already
    if (!$(target + " .chart-title").length && title){
      $(target).prepend($("<div class='chart-title'>").text(title));
    };

  }

  ui.buildBarSummary = function(target,data,title,series,formatting,description,multi_select) {

    formatting = formatting || "col-md-6"

    var wrapper = d3_updateable(target,".series-wrapper." + series,"div",[data])
      .classed("series-wrapper " + formatting + " " + series,true)

    var newTarget = d3_updateable(wrapper,".series." + series,"div",[data])
      .classed("bar series " + series,true)

    d3_updateable(newTarget,".title","div",[title],function(x){return x})
      .classed("title",true)
      .text(String)

    var value = data.reduce(function(p,c) {return p + c[series]},0)

    d3_updateable(newTarget,".value","div",[value],function(x){return x})
      .classed("value",true)

    d3_updateable(newTarget,".description","div",[description],function(x){return x})
      .classed("description",true)
      .text(String)


    if (multi_select) {

      var transformed_data = d3.nest()
        .key(function(x){return x.key})
        .rollup(function(x){return x[0].values})
        .map(data)

      var selector = d3_updateable(newTarget,".selector","select",[data],function(x){return x})
        .classed("selector",true)
        .on("change",function(x){
          var newData = transformed_data[this.value]
          ui.buildBar(newTarget,newData,title,series,formatting)

        })

      var option = d3_splat(selector,".selector","option",function(x){return x[0]},function(x){return x.key})
        .classed("option",true).text(function(x){return x.key})

      if (data.length) ui.buildBar(newTarget,data[0].values,title,series,formatting)


    } else {
      ui.buildBar(newTarget,data,title,series,formatting)
    }
 

    return newTarget

    //ui.buildTimeseries(newTarget,data,title,series,formatting)


  }

  ui.buildBar = function(target,data,title,series,formatting) {

    var default_formatting = {
      "font_size": ".71em"
    }
    
    var formatting = typeof formatting !== "undefined" ? formatting: default_formatting;

    data.map(function(x){
      x.date = new Date(x.key)
      for (var i in x.value) 
        x[i] = x.value[i]
    })

    var targetWidth = target.style("width").replace("px",""),
      width = targetWidth - 50,
      barHeight = 15;

    var x = d3.scale.linear().range([0, width-150]);


    data = data.map(function(d){

      var splitQ = d[series].split("?")[0]
      var split = splitQ.split("/")
      d.url_short = split[split.length-1]

      if (split.length > 1 && d.url_short.length < 15) d.url_short = split[split.length-2] + "/" + d.url_short
      if (split.length > 2 && d.url_short.length < 15) d.url_short = split[split.length-3] + "/" + d.url_short

      return d
    }).filter(function(d){return d[series] != "NA" })

    if (data[0].weighted === undefined && data[0].key === undefined) {
      data = d3.nest()
        .key(function(x){
          return x.url_short
        })                                                                          
        .rollup(function(x){
          return x.reduce(function(p,c){                                                             
            return p + c.count                                                                                      
          },0)
        })
        .entries(data)

      data = data.map(function(x){                                                                                    
          x["url_short"] = x.key
          return x
        })                                                                                                            
     }

    var field = (data[0].weighted !== undefined) ? "weighted" : 
                (data[0].count !== undefined) ? "count" : "values"

    var chart = target.selectAll("svg.domain-chart-svg")
      .data(function(x) { 
        
        return [data.sort(function(x,y){return y[field] - x[field] }).slice(0,30) ] 
      })

    chart
        .enter()
          .append("svg")
          .attr("class","domain-chart-svg")
          .attr("width", width);

    x.domain([0, d3.max(chart.datum(), function(d) { return d.count || d.values; })]);
    
    chart.attr("height", barHeight * chart.data()[0].length);

    ui.barShow(chart, barHeight, x)
    ui.barExpand(target, data, field, barHeight, x, 30)

  }  

  ui.barExpand = function(target, data, field, barHeight, x, limit) {
    if (data.length > limit) {

      var expand = d3_updateable(target,".expand","div")
        .classed("expand btn btn-sm btn-default",true)
        .text("Expand Results")
        .on("click",function(){
          var chart = target.selectAll("svg.domain-chart-svg")
            .data(function(x) {
              return [data.sort(function(x,y){return y[field] - x[field] }).slice(0,limit*2) ]
            })

          x.domain([0, d3.max(chart.datum(), function(d) { return d.count || d.values; })]);
     
          ui.barShow(chart, barHeight, x)
          chart.attr("height", barHeight * chart.data()[0].length);
          ui.barExpand(target, data, field, barHeight, x, limit*2)

        })
    } else {
      target.selectAll(".expand").remove()
    }
  }

  ui.barShow = function(chart, barHeight, x) {

    var bar = chart.selectAll("g")
        .data(function(x){return x})

    bar
      .enter().append("g")
        .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; });

    bar.exit().remove()
    
    var rect = bar.selectAll("rect.bar").data(function(x){return [x]})
    rect.enter()
        .append("rect")
    rect
        .attr("class","bar")
        .attr("width", function(d) { return x(d.count || d.values || 0); })
        .attr("height", barHeight - 1);
    
    var text = bar.selectAll("text").data(function(x){return [x]})
    text.enter()
        .append("text")
    text
        .attr("x", function(d) { return x(d.count || d.values) + 3; })
        .attr("y", barHeight / 2)
        .attr("dy", ".35em")
        .text(function(d) { return d.url_short + " (" + (d.count || d.values)+ ")" });//+ " (" + d.uid + ")" + d.idf }); 
  }

  ui.buildTimeseriesSummary = function(target,data,title,series,formatting,description) {

    var wrapper = d3_updateable(target,".series-wrapper." + series,"div",[data])
      .classed("series-wrapper col-md-4 " + series,true)

    var newTarget = d3_updateable(wrapper,".series." + series,"div",[data])
      .classed("series " + series,true)

    d3_updateable(newTarget,".title","div",[title],function(x){return x})
      .classed("title",true)
      .text(String)

    var value = data.reduce(function(p,c) {return p + c[series]},0)

    d3_updateable(newTarget,".value","div",[value],function(x){return x})
      .classed("value",true)
      .text(d3.format(",.r"))

    d3_updateable(newTarget,".description","div",[description],function(x){return x})
      .classed("description",true)
      .text(String)



    ui.buildTimeseries(newTarget,data,title,series,formatting)

  }

  ui.buildTimeseries = function(target,data,title,series,formatting) {
    console.log(arguments)
    var default_formatting = {
      "font_size": ".71em"
    }
    
    var formatting = typeof formatting !== "undefined" ? formatting: default_formatting;

    console.log(formatting)

    data.map(function(x){
      x.date = new Date(x.key)
      for (var i in x.value) 
        x[i] = x.value[i]
    })

    var targetWidth = target.style("width").replace("px","")

    var margin = {top: 20, right: 50, bottom: 30, left: 50},
      width = targetWidth - margin.left - margin.right,
      height = 150 - margin.top - margin.bottom;
  
    var parseDate = d3.time.format("%D-%b-%y %H:%M").parse;
  
    var x = d3.time.scale().range([0, width]); 
    var y = d3.scale.linear().range([height, 0]); 
    var xAxis = d3.svg.axis().scale(x).orient("bottom")
      .ticks(d3.time.days, width < 300 ? 5 : 2)

    var yAxis = d3.svg.axis().scale(y).orient("left")
      .tickSize(-width, 0, 0)
      .ticks(height < 200 ? 3 : 5)
  
    

    var svg = target.selectAll("svg." + title)
      .data([data])

    var newSvg = svg
      .enter()
        .append("svg")
        .attr("class",title)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)

  
    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain([0,d3.max(data, function(d) { return d[series[0]]; })]);
  
    newSvg.append("g")
      .attr("class", "x axis")

    svg.select(".x.axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  
    newSvg.append("g")
      .attr("class", "y axis")

    svg.select(".y.axis") 
      .selectAll("text.y-label")
      .remove()

    svg.select(".y.axis")
      .call(yAxis)
      .append("text")
      //.attr("transform", "rotate(-90)")
      .attr("y", -10)
      .attr("x", 0)
      .attr("dy", formatting.font_size)
      .style("text-anchor", "start")
      .classed("y-label",true)
      //.text(series[0].toUpperCase());

    svg.select(".y.axis") 
      .selectAll(".tick > text")
      .attr("x",-10)


  
    series.map(function(series){
      var line = d3.svg.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d[series]); });

      var area = d3.svg.area()
        .x(function(d) { return x(d.date); })
        .y0(height)
        .y1(function(d) { return y(d[series]); });
     
      newSvg.append("path")
        .attr("class", series + " line")

      svg.select(".line")// + series)
        .datum(data)
        .attr("d", line); 

      newSvg.append("path")
        .attr("class", "area")

      svg.select(".area")
        .datum(data)
        
        .attr("d", area);
 
      var points = svg.selectAll(".point")
        .data(data,function(d){return d.date})

      points
        .enter().append("svg:circle")
        .attr("class","point")

      points.exit().remove()

      points
         .attr("fill", function(d, i) { return "steelblue" })
         .attr("cx", function(d, i) { return x(d.date) + 50 })
         .attr("cy", function(d, i) { return y(d[series]) + 20})
         .attr("r", function(d, i) { return 3 })
      
    })

    

  }

  ui.selectFilter = function(target,items) {
    var addFilter = target.selectAll(".new-filter")
      .data([items])

    var newAddFilter = addFilter.enter()
      .append("div")
      .classed("new-filter",true)

    var h5 = newAddFilter
      .append("h5")

    h5.append("span")
      .text("+ Add Filter ")

    h5.append("span").append("select")
      .classed("add-filter",true)
      .on("change",function(x){
        rho.controller.add_filter(this.selectedOptions[0].value)
      })

    var select = addFilter.select("select")

    select
      .selectAll("option")
      .data(["Select filter..."].concat(items))
      .enter()
        .append("option")
        .text(String)
        .property("selected",function(x,i){return i == 0})
        .property("disabled",function(x,i){return i == 0}) 

  }

  ui.selectSeries = function(target,items) {
    var addSeries = target.selectAll(".select-series")
      .data([items])

    var newAddSeries = addSeries.enter()
      .append("div")
      .classed("select-series",true)

    var h5 = newAddSeries
      .append("h5")

    h5.append("span")
      .text("Date Interval ")

    h5.append("span").append("select")
      .classed("select-interval",true)
      .on("change",function(x){
        rho.controller.select_interval(this.selectedOptions[0].value)
      })

    var select = addSeries.select(".select-interval")

    select
      .selectAll("option")
      .data(["past 30 minutes","past day"])
      .enter()
        .append("option")
        .text(String)
     

    h5.append("span")
      .text("Show Series ")

    h5.append("span").append("select")
      .classed("select-series",true)
      .on("change",function(x){
        rho.controller.add_series(this.selectedOptions[0].value)
      })

    var select = addSeries.select("select.select-series")

    select
      .selectAll("option")
      .data(items)
      .enter()
        .append("option")
        .text(String)

  }
  
  ui.build = function(target,filters,data,callback,key,summary,series,selected_range){
    ui.filter.build(target,filters,callback,key)
    ui.selectFilter(target,['domain','seller','tag','size'])
    
    var target = d3.select("#graphable").select(".col-md-9")

    //ui.buildTitle(filters)

    ui.buildTimeseries(d3.select("#graphable").select(".col-md-9"),data,"yo",series || ['imps'])
    ui.selectSeries(d3.select("#seriesable"),['imps','eap','ecp']) 
    
    var min_date = 0
    var max_date = 30*60

    console.log(selected_range)

    ui.buildLegend(summary,{"selected":selected_range})
   
  } 

  ui.buildLegend = function(total,date_selection) {
    var summary = ""
    var format = d3.format(",.2")
    
    for (var k in total) {
      summary += k + " " + format(d3.round(total[k],2)) + "<br/>"
    }

    var legend = d3.select(".legend")
    
    var h2 = legend.selectAll("h5")
      .data([0])

    var text = "Availability Summary <br>" + 
      "<div style='font-weight:normal;margin-top:5px;margin-left:5px;font-size:13px'>" + 
        summary

    var d = 
      date_selection.selected.max_date - 
      date_selection.selected.min_date

    var minutes = d/60/1000

    text += "<br/>imps/min: "  + format(d3.round(total.imps/minutes)) + "<br/>" 
    text += "cost/min: " + format(d3.round(total.imps*total.eap/minutes/1000,2))  + "<br/>"  

    text += "</div>"
    /*text += "<br/> Date Interval <br>"
    text += "<div style='font-weight:normal;margin-top:5px;margin-left:5px;font-size:13px'>" +  
      "<select>"+
      "<option>Past hour</option>" +
      "<option>Past day</option>" +
      "</select>" +
      "</div>"
      */
    text += "<br/> Sampled Data?"
    text += "<div style='font-weight:normal;margin-top:5px;margin-left:5px;font-size:13px'>Unknown Sample</div>"
    

    h2.enter().append("h5")
    h2.html(text)
      .style("margin-top","20px") 

   

     
  }

  ui.buildTitle = function(filters) {
    var target = d3.select("#graphable").select(".col-md-9") 

    var h5 = target.selectAll("h5")
      .data([0])

    h5.enter()
      .append("h5")

    var showing = "Showing availability for ",
      showing_arr = []

    if (filters.length == 0) {
      showing_arr.push(" all data ")
    } else {
      filters.map(function(kv){
        var joined = (kv.value.length > 4 ? kv.value.slice(0,4).join(",") + "... " : kv.value.join(",")) 
        showing_arr.push(" " + kv.key + "s: " + joined)
      
      })
    }

    showing += showing_arr.join(" and ")

    h5.text(showing)
      .style("margin-top","20px")

    
  }

  return ui
})(RB.rho.ui || {})

