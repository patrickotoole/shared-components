var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  var crusher = RB.crusher

  action.show_domains = function(wrapper) {
    var newTs = wrapper.selectAll(".ts")
    var domainData = wrapper.datum().domains

    var categoryData = d3.nest()
      .key(function(x){return x.category_name})
      .rollup(function(x){
        return d3.sum(x.map(function(y){return y.count}))
      }) 
      .entries(domainData)


    //RB.rho.ui.buildBarSummary(newTs,domainData,"Off-site opportunities",["domain"], undefined, "Top off-site opportunities for users who have engaged in this on-site action")
    
    action.domain_table(newTs,domainData)

    d3_updateable(newTs,".clusters","div")
      .classed("series-wrapper col-md-12 clusters",true)


    action.category_table(newTs,categoryData)

    var pull_left = d3_updateable(newTs,".on-page-wrapper", "div")
      .classed("on-page-wrapper col-md-6",true)

    var urlData = wrapper.datum().urls


    action.show_cloud(pull_left,urlData)

    RB.rho.ui.buildBarSummary(
      pull_left,urlData,"On-site pages",["url"], " ", 
      "Top on-site pages that match the action"
    )

    crusher.permissions("cache_stats", function(){
      RB.rho.ui.buildBarSummary(
        pull_left,wrapper.datum().param_rolled,"On-site tracking parameters",["key"], " ", 
        "Top tracking parameters",true
      )
    })




  }

  action.domain_table = function(newTs,domainData) {

    var title = "Advertising opportunities",
      series = ["domain"],
      formatting = "col-md-12",
      description = ""//"Below we show a breakdown by category and domain of the sites " + 
        //"users who have completed this action have visited." + "<br><br>" //+ 
        //" This helps provide a sense of where your audience spends their time and how this time is distributed when" +
        //" they are not on your website"

    var button = {
      class_name: "export",
      name: "Export",
      click: function(x) {
        var csvContent = "data:text/csv;charset=utf-8,";
        var data = x[0].sort(function(a,b) {return a.index - b.index})
        csvContent += Object.keys(data[0]) + "\n"

        data.map(function(infoArray, index){
           dataString = Object.keys(infoArray).map(function(x){return infoArray[x]}).join(",");
           csvContent += dataString+ "\n" 
        });
        
        var encodedUri = encodeURI(csvContent);
        window.open(encodedUri);

      }
    }

    var target = RB.rho.ui.buildSeriesWrapper(newTs, title, series, domainData, formatting, description, button)

    var targetRow = d3_updateable(target,".row","div")
      .classed("row",true)


    var category_pie = d3_updateable(targetRow,".category-pie","div")
      .classed("category-pie col-md-4 col-sm-12 pull-right",true)

    d3_updateable(category_pie,".table-title","div")
      .classed("table-title",true) 
      .text("Percentage of user visits by category")
     
    var categoryData = d3.nest()
      .key(function(x){return x.parent_category_name})
      .rollup(function(x){
        return x.reduce(function(p,c){return p + c.count},0)
      })
      .entries(domainData)
      .sort(function(x,y){return y.values - x.values})
      .filter(function(x){return x.key != "NA"})
      .slice(0,15)

    var hover = function(x) {

      var data = domainData.filter(function(y){return y.parent_category_name == x.data.label})
      RB.rho.ui.buildBarTable(domain_table, data, title, series, formatting, 15, action.category_colors)

    }

    action.category_pie(category_pie,categoryData, action.category_colors, hover)


    var domain_table = d3_updateable(targetRow,".domain-table","div")
      .classed("domain-table col-md-8 col-sm-12",true)
     
    d3_updateable(domain_table,".table-title","div")
      .classed("table-title",true)
      .text("Domains ranked by importance")

    RB.rho.ui.buildBarTable(domain_table, domainData, title, series, formatting, 15, action.category_colors)

  }

  action.category_pie = function(target,categoryData,colors, hover) {
    var svg = d3_updateable(target,"svg","svg")
    
    var colors = colors;

    var slices = d3_updateable(svg,".slices","g").classed("slices",true),
      labels = d3_updateable(svg,".labels","g").classed("labels",true),
      lines = d3_updateable(svg,".lines","g").classed("lines",true)

    var width = target.style("width").replace("px","").split(".")[0],
      height = width,
      radius = Math.min(width, height) / 2

    svg
      .attr("width",width)
      .attr("height",height)
      .style("margin-left","-15px")

    var pie = d3.layout.pie()
      .sort(null)
      .value(function(d) { return d.value; });
  
    var arc = d3.svg.arc()
    	.outerRadius(radius * 0.8)
    	.innerRadius(radius * 0.4);
    
    var outerArc = d3.svg.arc()
    	.innerRadius(radius * 0.9)
    	.outerRadius(radius * 0.9);
    
    svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    slices.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    labels.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    lines.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var key = function(d){ return d.data.label };
 
    //var colors = d3.scale.category20c()
    
    var formatData = function(data){
    	return data.map(function(d){
    		return { label: d.key, value: d.values }
    	});
    }

    
    var draw = function (svg,data) {

	var slice = svg.select(".slices").selectAll("path.slice")
		.data(pie(data), key);

	slice.enter()
		.insert("path")
		.style("fill", function(d) { return colors(d.data.label); })
		.attr("class", "slice");

	slice		
		.transition().duration(1000)
		.attrTween("d", function(d) {
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				return arc(interpolate(t));
			};
		})
        slice
                .on("mouseover",function(x){
                    text.classed("hidden",true)
                    polyline.classed("hidden",true)

                    text.filter(function(y) {return x.data.label == y.data.label}).classed("hidden",false)
                    polyline.filter(function(y) {return x.data.label == y.data.label}).classed("hidden",false)
                    hover(x)

                })

	slice.exit()
		.remove();

	/* ------- TEXT LABELS -------*/

	var text = svg.select(".labels").selectAll("text")
		.data(pie(data), key);

	text.enter()
		.append("text")
		.attr("dy", "-.35em")
                .style("fill", "black")
                .classed("hidden",true)
		.text(key);
		
	
	function midAngle(d){
		return d.startAngle + (d.endAngle - d.startAngle)/2;
	}

	text.transition().duration(1000)
		.attrTween("transform", function(d) {
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				var d2 = interpolate(t);
				var pos = outerArc.centroid(d2);
				pos[0] = (radius-5) * (midAngle(d2) < Math.PI ? 1 : -1);
				return "translate("+ pos +")";
			};
		})
		.styleTween("text-anchor", function(d){
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				var d2 = interpolate(t);
				return midAngle(d2) > Math.PI ? "start":"end";
			};
		});


	text.exit()
		.remove();

	/* ------- SLICE TO TEXT POLYLINES -------*/

	var polyline = svg.select(".lines").selectAll("polyline")
		.data(pie(data), key);
	
	polyline.enter()
            .append("polyline");

        polyline
            .classed("hidden",true)

	polyline.transition().duration(1000)
		.attrTween("points", function(d){
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				var d2 = interpolate(t);
				var pos = outerArc.centroid(d2);
				pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
				return [arc.centroid(d2), outerArc.centroid(d2), pos];
			};			
		});
	
	polyline.exit()
		.remove();
    };

    draw(svg,formatData(categoryData))


    


    
  }

  action.category_table = function(newTs,categoryData) {
    RB.rho.ui.buildBarSummary(newTs,categoryData,"Off-site categories",["key"], undefined, "Top off-site categories users visit")
  }

  return action

})(RB.crusher.ui.action || {})  
