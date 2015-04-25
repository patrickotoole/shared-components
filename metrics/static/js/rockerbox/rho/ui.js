var RB = RB || {}
RB.rho = RB.rho || {}
RB.rho.ui = RB.rho.ui || {}

RB.rho.ui = (function(ui) {

  var rho = RB.rho
  
  ui.buildTimeseries = function(target,data,title,series) {

    data.map(function(x){
      x.date = new Date(x.key)
      for (var i in x.value) 
        x[i] = x.value[i]
    })

    var targetWidth = target.style("width").replace("px","")

    var margin = {top: 20, right: 20, bottom: 30, left: 50},
      width = targetWidth - margin.left - margin.right,
      height = 200 - margin.top - margin.bottom;
  
    var parseDate = d3.time.format("%D-%b-%y %H:%M").parse;
  
    var x = d3.time.scale().range([0, width]); 
    var y = d3.scale.linear().range([height, 0]); 
    var xAxis = d3.svg.axis().scale(x).orient("bottom"); 
    var yAxis = d3.svg.axis().scale(y).orient("left");
  
    

    var svg = target.selectAll("svg")
      .data([data])

    var newSvg = svg
      .enter()
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain([0,d3.max(data, function(d) { return d[series[0]]; })]);
  
    newSvg.append("g")
      .attr("class", "x axis")

    d3.select(".x.axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  
    newSvg.append("g")
      .attr("class", "y axis")

    d3.select(".y.axis") 
      .selectAll("text.y-label")
      .remove()

    d3.select(".y.axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .classed("y-label",true)
      .text(series[0].toUpperCase());
  
    series.map(function(series){
      var line = d3.svg.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d[series]); });
     
      newSvg.append("path")
        .attr("class", series + " line")

      d3.select(".line")// + series)
        .datum(data)
        .attr("d", line); 
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
      .text("Date Interval")

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

    ui.buildTimeseries(d3.select("#graphable").select(".col-md-9"),data,summary,series || ['imps'])
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


