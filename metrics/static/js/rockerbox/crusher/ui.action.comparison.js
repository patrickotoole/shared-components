var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  action.show_comparison = function(wrapper, all_segments) {

    var title = "Comparison",
      series = ["comparison"],
      formatting = ".col-md-12.action-comparison",
      description = "Compare this segment to another segment"

    console.log(wrapper.datum())

    var domains = wrapper.datum().domains

    var target = RB.rho.ui.buildSeriesWrapper(wrapper.selectAll(".action-body"), title, series, [wrapper.datum()], formatting, description)

    var parentNode = wrapper.selectAll(".action-body").selectAll(".comparison")
    parentNode.selectAll(".loading-icon").remove()

    parentNode.classed("hidden",false)
      .style("visibility","hidden")

    setTimeout(function(){
      parentNode.classed("hidden",!parentNode.classed("selected"))
        .style("visibility",undefined)

    },1)

    var segments = ['/wishlist', 'cart'];

    var comparison_wrapper = d3_updateable(target, '.comparison-wrapper', 'div')
      .classed('comparison-wrapper', true)

    var heading = d3_updateable(comparison_wrapper, '.comparison-header', 'header')
      .classed('comparison-header', true)
      .style('background-color', '#FAFAFA')
      .style('border-bottom', '1px solid #f0f0f0')
      .style('padding', '40px')
      .style('min-height', '350px')

    /*
    **
    **  Display list of segments that are being compared
    **
    */

    var segments_list_wrapper = d3_updateable(heading, '.segments-list-wrapper', 'div')
      .style('display', 'inline-block')
      .classed('segments-list-wrapper', true)

    var segments_list = d3_updateable(segments_list_wrapper, '.segments-list', 'div')
      .style('display', 'inline-block')
      .classed('segments-list', true);

    var current_segment = d3_updateable(segments_list, '.segments-list-item', 'input')
      .classed('segments-list-item', true)
      .attr('disabled', true)
      .attr('value', segments[0])

    var current_segment_select = d3_updateable(segments_list, '.segments-list-item-select', 'select')
      .classed('segments-list-item-select', true)
      .attr('value', segments[0])
      .on('change', function() {
        segments[1] = this.value;
        renderComparison();
      });

      var segments_list_items = d3_splat(current_segment_select, '.segment-list-item-select-option', 'option', all_segments, function(x, i) {
          return x.action_name;
        })
        .text(function(x) {
          if (x.action_name != '') {
            return x.action_name;
          } else {
            return 'All Pages';
          }
        });

        /*
        **
        **  Draw intersection circles
        **
        */

        function drawIntersection(segmentA, segmentB, intersect) {
          var max_segment = Math.max(segmentA, segmentB);
          var r1 = Math.round(segmentA / max_segment * 175),
            r2 = Math.round(segmentB / max_segment * 175),
            x1 = r1,
            y1 = 175,
            x2 = 350,
            y2 = 175;

          var intersect_size = ((175 / max_segment) * intersect);
          if (intersect_size / x1 < 0.15) {
            intersect_size = 0.15 * x1;
          }
          x2 = ((r1 * 2) + r2) - intersect_size;

          var svg = d3_updateable(heading, '.comparison-svg', 'svg')
            .attr('style', 'width: calc(100% - 300px); height: 350px;')
            .classed('comparison-svg', true)

          svg.exit().remove()

            d3_updateable(svg, '.circleA', 'circle')
              .classed('circleA', true)
              .attr('cx', x1)
              .attr('cy', y1)
              .attr('r', r1)
              .style('fill', 'steelblue')
              .on('click', function() {
                alert('SEGMENT ONE');
              });

            d3_updateable(svg, '.circleB', 'circle')
              .classed('circleB', true)
              .attr('cx', x2)
              .attr('cy', y2)
              .attr('r', r2)
              .style('fill', 'orange')
              .on('click', function() {
                alert('SEGMENT TWO');
              });

          var interPoints = intersection(x1, y1, r1, x2, y2, r2);

          var intersection_object = d3_updateable(svg, '.intersection_object', 'g')
            .classed('intersection_object', true)

          var intersection_object_path = d3_updateable(svg, '.intersection_object_path', 'path')
            .classed('intersection_object_path', true)
            .attr("d", function() {
              return "M" + interPoints[0] + "," + interPoints[2] + "A" + r2 + "," + r2 +
                " 0 0,1 " + interPoints[1] + "," + interPoints[3] + "A" + r1 + "," + r1 +
                " 0 0,1 " + interPoints[0] + "," + interPoints[2];
            })
            .style('fill', 'red')
            .on('click', function() {
              alert('INTERSECTION');
            });

          function intersection(x0, y0, r0, x1, y1, r1) {
            var a, dx, dy, d, h, rx, ry;
            var x2, y2;

            /* dx and dy are the vertical and horizontal distances between
             * the circle centers.
             */
            dx = x1 - x0;
            dy = y1 - y0;

            /* Determine the straight-line distance between the centers. */
            d = Math.sqrt((dy * dy) + (dx * dx));

            /* Check for solvability. */
            if (d > (r0 + r1)) {
              /* no solution. circles do not intersect. */
              return false;
            }
            if (d < Math.abs(r0 - r1)) {
              /* no solution. one circle is contained in the other */
              return false;
            }

            /* 'point 2' is the point where the line through the circle
             * intersection points crosses the line between the circle
             * centers.
             */

            /* Determine the distance from point 0 to point 2. */
            a = ((r0 * r0) - (r1 * r1) + (d * d)) / (2.0 * d);

            /* Determine the coordinates of point 2. */
            x2 = x0 + (dx * a / d);
            y2 = y0 + (dy * a / d);

            /* Determine the distance from point 2 to either of the
             * intersection points.
             */
            h = Math.sqrt((r0 * r0) - (a * a));

            /* Now determine the offsets of the intersection points from
             * point 2.
             */
            rx = -dy * (h / d);
            ry = dx * (h / d);

            /* Determine the absolute intersection points. */
            var xi = x2 + rx;
            var xi_prime = x2 - rx;
            var yi = y2 + ry;
            var yi_prime = y2 - ry;

            return [xi, xi_prime, yi, yi_prime];
          }
        }

        var comparison_columns = d3_updateable(target, '.comparison-columns', 'div')
          .classed('comparison-columns', true)

        var comparison_loading_indicator = d3_updateable(comparison_columns, '.loading-indicator', 'div')
          .classed('loading-indicator', true)
          .html('<img src="/static/img/general/ajax-loader.gif"><p>Loading comparison data...</p>');

        var column1 = d3_updateable(comparison_columns, '.comparison-column1', 'div')
          .classed('comparison-column1 comparison-column', true)

        var column2 = d3_updateable(comparison_columns, '.comparison-column2', 'div')
          .classed('comparison-column2 comparison-column', true)


        function horizontalBarGraph(orientation, domains, hits, max_hits) {
          var column_width = 400;
          var colors = ['steelblue'];
          var grid = d3.range(25).map(function(i) {
            return {
              'x1': 0,
              'y1': 0,
              'x2': 0,
              'y2': 1000
            };
          });

          var xscale = d3.scale.linear()
            .domain([0, 10])
            .range([0, 10]);

          var yscale = d3.scale.linear()
            .domain([0, domains.length])
            .range([0, 900])

          var colorScale = d3.scale.quantize()
            .domain([0, domains.length])
            .range(colors);

          switch (orientation) {
            case 'left':
              var column = column1;
              var opposite_orientation = 'right';
              break;
            case 'right':
              var column = column2;
              var opposite_orientation = 'left';
              break;
          }

          var canvas = d3_updateable(column, '.bar-graph-' + orientation, 'svg')
            .classed('bar-graph-' + orientation, true)
            .attr({
              'width': '100%',
              'height': (domains.length * 24)
            });

          var xAxis = d3.svg.axis();
          xAxis
            .orient('bottom')
            .scale(xscale)

          var yAxis = d3.svg.axis();
          yAxis
            .orient(orientation)
            .scale(yscale)
            .tickSize(1)
            .tickFormat(function(d, i) {
              if(typeof hits[i-1] !== typeof undefined) {
                switch(orientation) {
                  case 'left':
                    return domains[i] + ' - ' + hits[i-1];
                    break;
                  case 'right':
                    return hits[i-1] + ' - ' + domains[i];
                    break;
                }
              }
            })
            .tickValues(d3.range(domains.length));

          switch(orientation) {
            case 'left':
              yAxis.tickSize(1)
              break;
            case 'right':
              yAxis.tickSize(0)
              break;
          }

          var y_xis = d3_updateable(canvas, '.y_xis-' + orientation, 'g')
            .style('fill', '#666')
            .attr("transform", function() {
              switch (orientation) {
                case 'left':
                  return "translate(400,10)";
                  break;
                case 'right':
                  return "translate(0,10)";
                  break;
              }
            })
            .attr('id', 'yaxis')
            .classed('y_xis-' + orientation, true)
            .call(yAxis);

          var chart = d3_updateable(canvas, '.chart-bars-' + orientation, 'g')
            .classed('chart-bars-' + orientation, true)
            .attr("transform", function() {
              if (orientation == 'right') {
                return "translate(200,0)";
              } else {
                return "translate(0,0)";
              }
            })
            // .selectAll('rect')
            // .data(hits)
            // .enter()

          var chart_rows = d3_splat(chart,".chart-row","rect",hits,function(x, i){return i})
            .classed("chart-row",true)
            .attr('height', 19)
            .attr({
              'x': function(d, i) {
                if (orientation == 'left') {
                  // return ((d / Math.max.apply(Math, hits)) * 100)
                  return 200 - (((d / max_hits) * 180) + 20);
                } else {
                  return 0;
                }
              },
              'y': function(d, i) {
                return yscale(i) + 19;
              }
            })
            .style('fill', function(d, i) {
              return colorScale(i);
            })
            .attr('width', function(d) {
              return (d / max_hits * 180) + 20;
            });
        }

        function renderComparison() {
          comparison_columns.classed('loading-comparison', true);
          var input_data = {
            segmentA: segments[0],
            segmentB: segments[1]
          };

          var segmentA = [''];
          var segmentA_hits = [];

          var segmentB = [''];
          var segmentB_hits = [];

          RB.crusher.subscribe.add_subscriber(["comparison"], function(comparison_data) {
            comparison_data.segmentA.forEach(function(domain, i) {
              segmentA.push(domain.domain);
              segmentA_hits.push(domain.count);
            });

            comparison_data.segmentB.forEach(function(domain, i) {
              segmentB.push(domain.domain);
              segmentB_hits.push(domain.count);
            });

            // var max_hits = [Math.max.apply(segmentA_hits), Math.max(segmentB_hits)];
            var max_hits = Math.max(segmentA_hits[0], segmentB_hits[0])

            drawIntersection(comparison_data.intersection_data.segmentA, comparison_data.intersection_data.segmentB, comparison_data.intersection_data.intersection)
            horizontalBarGraph('left', segmentA, segmentA_hits, max_hits)
            horizontalBarGraph('right', segmentB, segmentB_hits, max_hits)

            comparison_columns.classed('loading-comparison', false);
          }, "comparison-data", true, false, input_data);
        }

  }
  return action

})(RB.crusher.ui.action || {})
