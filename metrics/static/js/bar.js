window.dynamicBar = function(where,data,w,h){
  var w = w || 5,
    h = h || 80;

  var x = d3.scale.linear()
    .domain([0, 1])
    .range([0, w]);

  var y = d3.scale.linear()
    .domain([0, 10])
    .rangeRound([0, h]);

  var selection = typeof(where) == "string" ? d3.select(where) : where

  var chart = selection.append("svg")
     .attr("class", "chart")
     .attr("width", w * data.length - 1)
     .attr("height", h);

  chart.selectAll("rect")
     .data(data)
   .enter().append("rect")
     .attr("x", function(d, i) { return x(i) - .5; })
     .attr("y", function(d) { return h - y(d.value) - .5; })
     .attr("width", w)
     .attr("height", function(d) { return y(d.value); });

  chart.append("line")
     .attr("x1", 0)
     .attr("x2", w * data.length)
     .attr("y1", h - .5)
     .attr("y2", h - .5)
     .style("stroke", "#000");

  var redraw = function (data) {
    
    y.domain([0, d3.max(data.map(function(d){ return d.value }))])

    var rect = chart.selectAll("rect")
      .data(data, function(d) { return d.time; });

    rect.enter().insert("rect", "line")
      .attr("x", function(d, i) { return x(i + 1) - .5; })
      .attr("y", function(d) { return h - y(d.value) - .5; })
      .attr("width", w)
      .attr("height", function(d) { return y(d.value); })
    .transition()
      .duration(200)
      .attr("x", function(d, i) { return x(i) - .5; });

    rect.transition()
      .duration(200)
      .attr("x", function(d, i) { return x(i) - .5; });

    rect.exit().transition()
      .duration(200)
      .attr("x", function(d, i) { return x(i - 1) - .5; })
      .remove();

  }
  return redraw
}

window.serialize = function(form) {
  if (!form || form.nodeName !== "FORM") {
      return;
  }
  var i, j, q = [];
  for (i = form.elements.length - 1; i >= 0; i = i - 1) {
      if (form.elements[i].name === "") {
          continue;
      }
      switch (form.elements[i].nodeName) {
      case 'INPUT':
          switch (form.elements[i].type) {
          case 'text':
          case 'hidden':
          case 'password':
          case 'button':
          case 'reset':
          case 'submit':
              q.push(form.elements[i].name + "=" + encodeURIComponent(form.elements[i].value));
              break;
          case 'checkbox':
          case 'radio':
              if (form.elements[i].checked) {
                  q.push(form.elements[i].name + "=" + encodeURIComponent(form.elements[i].value));
              }                         
              break;
          }
          break;
          case 'file':
          break; 
      case 'TEXTAREA':
          q.push(form.elements[i].name + "=" + encodeURIComponent(form.elements[i].value));
          break;
      case 'SELECT':
          switch (form.elements[i].type) {
          case 'select-one':
              q.push(form.elements[i].name + "=" + encodeURIComponent(form.elements[i].value));
              break;
          case 'select-multiple':
              for (j = form.elements[i].options.length - 1; j >= 0; j = j - 1) {
                  if (form.elements[i].options[j].selected) {
                      q.push(form.elements[i].name + "=" + encodeURIComponent(form.elements[i].options[j].value));
                  }
              }
              break;
          }
          break;
      case 'BUTTON':
          switch (form.elements[i].type) {
          case 'reset':
          case 'submit':
          case 'button':
              q.push(form.elements[i].name + "=" + encodeURIComponent(form.elements[i].value));
              break;
          }
          break;
      }
  }
  return q.join("&");
}

window.dynamicBarWithFormatter = function(where,data,w,h,formatter,groupFormatter){
  var w = w || 5,
    h = h || 80;

  var x = d3.scale.linear()
    .domain([0, 1])
    .range([0, w]);

  var y = d3.scale.linear()
    .domain([0, 10])
    .range([0, h])

  var yAxisScale = d3.scale.linear()
    .domain([0, 10])
    .range([h, 0])

  var yAxis = d3.svg.axis()
    .scale(yAxisScale)
    .orient("left")
    .ticks(1);

  var selection = typeof(where) == "string" ? d3.select(where) : where

  var wrapper = selection.append("svg")
     .attr("class", "chart")
     .attr("width", w * data.length - 1 + 20)
     .attr("height", h + 8);

  var yAxisDrawn = wrapper.append("g")
    .attr("height", h + 6)
    .attr("class","mg-y-axis axis") 
    .attr("transform", "translate(" + 15 + ",4)")
    .call(yAxis);

  var chart = wrapper.append("g")
    .attr("transform","translate(" + 18 + ",4)")

  chart.selectAll("rect")
     .data(function(d){
        var dd = data.map(formatter(d)) 
        return dd
     })
   .enter().append("rect")
     .attr("x", function(d, i) { return x(i) - .5; })
     .attr("y", function(d) { return h - y(d.value) - .5; })
     .attr("width", w)
     .attr("height", function(d) { return y(d.value); });

  chart.append("line")
     .attr("x1", 0)
     .attr("x2", w * data.length)
     .attr("y1", h + 0)
     .attr("y2", h + 0)
     .style("stroke", "#ccc");

  var calcY = function(d) { 
    var y = this.parentNode.previousSibling.__chart__; 
    return y(d.value) - .5; 
  }
  var calcHeight = function(d) { 
    var y = this.parentNode.previousSibling.__chart__; 
    return h - y(d.value); 
  }

  var redraw = function (data) {

    var max = d3.max(data.map(function(x){ return x.value.length }))

    y.domain([0, max])
    yAxisScale.domain([0,max])

    var yAxis = d3.svg.axis()
      .scale(yAxisScale)
      .orient("left")
      .ticks(1);

    yAxisDrawn.call(function(groups) {
      var maxes = groups.map(function(group){
        var rep = (group.length) ? group[0].__data__ : false
        var format = rep ? groupFormatter(rep) : false
        var arr = format ? data.map(format).map(function(y){return y.value}) : data.map(function(){return 0})

        return d3.max(arr)
      })

      groups.map(function(group,i){
        var y = d3.scale.linear().domain([0, maxes[i]]).range([h, 0])
        group.map(function(x){ x.__newchart__ = y })
      })

      return yAxis(groups)
    })

    var rect = chart.selectAll("rect")
      .data(function(d){
        var dd = data.map(formatter(d)) 
        return dd
     }, function(d) { return d.time; });

    rect.enter().insert("rect", "line")
      .attr("x", function(d, i) { return x(i + 1) - .5; })
      .attr("y", calcY)
      .attr("width", w)
      .attr("height", calcHeight)
    .transition()
      .duration(200)
      .attr("x", function(d, i) { return x(i) - .5; })
      .attr("y", calcY)
      .attr("height", calcHeight)

    rect.transition()
      .duration(200)
      .attr("x", function(d, i) { return x(i) - .5; })
      .attr("y", calcY)
      .attr("height", calcHeight)

    rect.exit().transition()
      .duration(200)
      .attr("x", function(d, i) { return x(i - 1) - .5; })
      .remove();

  }
  return redraw
}
