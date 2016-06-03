var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

var pubsub = RB.crusher.pubsub;


var category_data = function(data) {
  var total = 0;

  var categories = data.reduce(function(p,c){
    p[c.parent_category_name] = p[c.parent_category_name] || 0
    p[c.parent_category_name] += c.count
    total += c.count
    return p
  },{})

  Object.keys(categories).map(function(k){
    categories[k] = {
      key: k,
      count: categories[k],
      percentage: Math.round(categories[k]/total * 100)/100,
      value: categories[k]
    }
  })

  var table_body = d3.entries(categories)
    .map(function(x){return x.value})
    .sort(function(x, y) {
      return y.count - x.count
    })

  return table_body

}


RB.crusher.ui.action = (function(action) {
  action.show_full_url = function(wrapper, segment) {
    var title = "Top Articles",
      series = ["full_url"],
      formatting = ".col-md-12.action-full_url.card",
      description = "<br>These are the top relevant page and article engagements by users within the " + segment.action_name + " segment."

    var target = RB.rho.ui.buildSeriesWrapper(wrapper.selectAll(".action-body"), title, series, [wrapper.datum()], formatting, description)

    var parentNode = wrapper.selectAll(".action-body").selectAll(".full_url")
      .style("visibility","hidden")


    parentNode.selectAll(".loading-icon").remove()

    parentNode.selectAll('div.value').remove();

    var chart_wrapper = d3_updateable(target, '.bar-wrapper', 'div')
      .classed('bar-wrapper col-lg-4 col-md-12', true);


    var table_wrapper = d3_updateable(target, '.table-wrapper', 'div')
      .classed('table-wrapper col-lg-8 col-md-12', true);

    var table_wrapper_title = d3_updateable(table_wrapper, '.table-wrapper-title', 'h3')
      .classed('table-wrapper-title', true)
      .text('Top Sites');

    pubsub.subscriber("cached_visitor_domains", ["cached_visitor_domains"])
      .run(function(cached_visitor_domains) {

        var obj = {
          _categories: [],
          _click: function(x, i) {
            var selected = d3.select(this.parentNode.parentNode.parentNode).selectAll("input")[0].map(function(x){
              return {"category":x.parentNode.parentNode.__data__.label,"checked":x.checked}
            })

            var categories = selected.filter(function(x){ return x.checked}).map(function(x){return x.category})
            obj._categories = categories

            var data = cached_visitor_domains.filter(function(x) {
              if (categories.length == 0) return true
              return categories.indexOf(x.parent_category_name) > -1
            });

            draw_table(data);
          }
        }
        

        vendors.category_bar.bind(obj)(target.datum({"domains":cached_visitor_domains}))
        parentNode
          .style("visibility",undefined)
          .classed("hidden",true)


        var draw_table = function(data) {
          var table_data = {
            header: [{
              key: 'key',
              title: 'Rank'
            }, {
              key: 'url',
              title: 'Page/Article URL',
              href: true
            }, {
              key: 'category',
              title: 'Category'
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

      })
      .data(segment)
      .unpersist(true)
      .trigger()
  }

  return action;

})(RB.crusher.ui.action || {})
