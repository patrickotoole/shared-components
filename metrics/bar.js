window.dynamicBar = function(where,data,w,h){
		var w = w || 5,
				h = h || 80;

		var x = d3.scale.linear()
				.domain([0, 1])
				.range([0, w]);

		var y = d3.scale.linear()
				.domain([0, 10])
				.rangeRound([0, h]);

		var chart = d3.select(where).append("svg")
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

var serialize = function(form) {
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
