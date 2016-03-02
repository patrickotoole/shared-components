var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

var pubsub = RB.crusher.pubsub;

RB.crusher.ui.action = (function(action) {
  action.show_full_url = function(wrapper, segment) {
    var title = "",
      series = ["full_url"],
      formatting = ".col-md-12.action-full_url.hidden",
      description = "See below for the most popular articles for users within the " + segment.action_name + " segment."

    var target = RB.rho.ui.buildSeriesWrapper(wrapper.selectAll(".action-body"), title, series, [wrapper.datum()], formatting, description)

    var parentNode = wrapper.selectAll(".action-body").selectAll(".full_url")

    parentNode.selectAll(".loading-icon").remove()

    parentNode.selectAll('div.value').remove();

    pubsub.subscriber("cached_visitor_domains", ["cached_visitor_domains"])
      .run(function(cached_visitor_domains) {
        var table_data = {
          header: [{
            key: 'key',
            title: 'Rank'
          }, {
            key: 'url',
            title: 'URL',
            href: true
          }, {
            key: 'uniques',
            title: 'Uniques'
          }, {
            key: 'count',
            title: 'Count'
          }],
          body: []
        };

        var raw_table_data = cached_visitor_domains
          .sort(function(x, y) {
            return y.count - x.count
          })
          .sort(function(x, y) {
            return y.uniques - x.uniques
          })
          .filter(function(x) {
            if (x.url.substr(-5) === '.com/' || x.url.substr(-4) === '.com' ||
              x.url.substr(-5) === '.net/' || x.url.substr(-4) === '.net' ||
              x.url.substr(-5) === '.org/' || x.url.substr(-4) === '.org' ||
              x.url.substr(-4) === '.tv/' || x.url.substr(-3) === '.tv' ||
              x.url.substr(-4) === '.me/' || x.url.substr(-3) === '.me' ||
              x.url.substr(-18) === '.anonymous.google/' || x.url.substr(-17) === '.anonymous.google' ||
              x.url == '' || x.url == 'document.referrer') {
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

        var table = components.table(target)
          .data(table_data)
          .draw();
      })
      .data(segment)
      .unpersist(true)
      .trigger()
  }

  return action;

})(RB.crusher.ui.action || {})
