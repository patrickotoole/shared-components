var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

var pubsub = RB.crusher.pubsub;

RB.crusher.ui.action = (function(action) {
  action.show_full_url = function(wrapper, segment) {
    var title = "",
      series = ["full_url"],
      formatting = ".col-md-12.action-full_url.hidden.card",
      description = "See below for the most popular articles for users within the " + segment.action_name + " segment."

    var target = RB.rho.ui.buildSeriesWrapper(wrapper.selectAll(".action-body"), title, series, [wrapper.datum()], formatting, description)

    var parentNode = wrapper.selectAll(".action-body").selectAll(".full_url")

    parentNode.selectAll(".loading-icon").remove()

    parentNode.selectAll('div.value').remove();

    var chart_wrapper = d3_updateable(target, '.bar-chart-wrapper', 'div')
      .classed('bar-chart-wrapper col-lg-4 col-md-12', true);

    var chart_wrapper_title = d3_updateable(chart_wrapper, '.chart-wrapper-title', 'h3')
      .classed('chart-wrapper-title', true)
      .text('Categories');

    var table_wrapper = d3_updateable(target, '.table-wrapper', 'div')
      .classed('table-wrapper col-lg-8 col-md-12', true);

    var table_wrapper_title = d3_updateable(table_wrapper, '.table-wrapper-title', 'h3')
      .classed('table-wrapper-title', true)
      .text('Top Sites');

    pubsub.subscriber("cached_visitor_domains", ["cached_visitor_domains"])
      .run(function(cached_visitor_domains) {

        /*
          Render Chart
        */
        var sum_count = 0;

        var categories_raw = cached_visitor_domains.map(function(x) {
          sum_count += x.count;

          return {
            name: x.parent_category_name,
            count: x.count,
            uniques: x.uniques
          };
        });

        var categories = [];
        var table_body = [];

        cached_visitor_domains.forEach(function(x) {
          if (categories.indexOf(x.parent_category_name) == -1) {
            categories.push(x.parent_category_name);

            table_body.push({
              key: x.parent_category_name || 'N/A',
              count: x.count
            });
          } else {
            table_body[categories.indexOf(x.parent_category_name)].count += x.count;
          }

          var percentage = (100 / sum_count) * table_body[categories.indexOf(x.parent_category_name)].count
          percentage = Math.round(percentage * 100) / 100;
          table_body[categories.indexOf(x.parent_category_name)].percentage = percentage
        });

        table_body.sort(function(x, y) {
          return y.count - x.count
        })

        var table_data = {
          header: [{
            key: 'key',
            title: 'Category'
          }, {
            key: 'percentage',
            title: 'Percentage'
          }],
          body: table_body
        };

        var category_table = components.table(chart_wrapper)
          .data(table_data)
          .pagination(5)
          .draw();

        /*
          Render Table
        */
        var draw_table = function(data) {
          var table_data = {
            header: [{
              key: 'key',
              title: 'Rank'
            }, {
              key: 'url',
              title: 'URL',
              href: true
            }, {
              key: 'category',
              title: 'Category'
            }, {
              key: 'uniques',
              title: 'Uniques'
            }, {
              key: 'count',
              title: 'Count'
            }],
            body: []
          };

          var raw_table_data = data
            .sort(function(x, y) {
              return y.count - x.count
            })
            .sort(function(x, y) {
              return y.uniques - x.uniques
            })
            .filter(function(x) {
              var l = document.createElement("a");

              // Make sure all urls have the http or https prefix
              if (x.url.slice(0, 7) !== 'http://' && x.url.slice(0, 7) !== 'https:/') {
                x.url = 'http://' + x.url;
              }

              l.href = x.url;

              if (l.pathname.length < 12) {
                return false;
              } else {
                return true;
              }
            })
            .slice(0, 100);
          var max_count = d3.max(raw_table_data, function(x) {
            return x.count;
          });
          var max_uniques = d3.max(raw_table_data, function(x) {
            return x.uniques;
          });

          raw_table_data.forEach(function(item, i) {
            var score = (((item.uniques / max_uniques) * 2) + item.count / max_count) / 3;

            table_data['body'].push({
              key: i,
              url: item.url,
              uniques: item.uniques,
              category: item.parent_category_name || 'N/A',
              count: item.count,
              score: parseFloat(score.toFixed(4))
            });
          });

          // TO-DO: Maybe a cleaner way to do this without an extra sort/loop
          table_data.body.sort(function(x, y) {
            return y.score - x.score;
          });

          table_data.body.forEach(function(item, i) {
            return item.key = i + 1;
          });

          var domains_table = components.table(table_wrapper)
            .data(table_data)
            .pagination(15)
            .draw();
        }

        draw_table(cached_visitor_domains);

        var category_filter = null;
        chart_wrapper.selectAll('tbody tr td:first-child')
          .style('cursor', 'pointer')
          .on('click', function(x, i) {
            if(category_filter === this.innerText) {
              category_filter = null;
              draw_table(cached_visitor_domains);
            } else {
              category_filter = this.innerText;

              var new_table_body = cached_visitor_domains.filter(function(x) {
                if (x.parent_category_name == category_filter)
                  return true;
                else
                  return false;
              });

              draw_table(new_table_body);
            }
          });
      })
      .data(segment)
      .unpersist(true)
      .trigger()
  }

  return action;

})(RB.crusher.ui.action || {})
