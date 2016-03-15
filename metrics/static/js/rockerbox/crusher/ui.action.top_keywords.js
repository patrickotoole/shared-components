var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

var pubsub = RB.crusher.pubsub;

RB.crusher.ui.action = (function(action) {
  action.show_top_keywords = function(wrapper, segment) {
    var title = "",
      series = ["top_keywords"],
      formatting = ".col-md-12.action-top_keywords.hidden",
      description = "See below for the most popular keywords for users within the " + segment.action_name + " segment."

    var target = RB.rho.ui.buildSeriesWrapper(wrapper.selectAll(".action-body"), title, series, [wrapper.datum()], formatting, description)

    var parentNode = wrapper.selectAll(".action-body").selectAll(".top_keywords")

    parentNode.selectAll(".loading-icon").remove()

    parentNode.selectAll('div.value').remove();

    pubsub.subscriber("visitor_keywords_cache",["visitor_keywords_cache"])
      .run(function(keywords){
        // debugger;

        var keywords = keywords.filter(function(x) {
          if(x.keyword == '') {
            return false;
          } else {
            return true;
          }
        })
        .map(function(x, i) {
          x.key = x.keyword;
          return x;
        })
        console.log('KEYWORDS', keywords);
        var table_data = {
          header: [
            {
              key: 'key',
              title: 'Keyword'
            },
            {
              key: 'count',
              title: 'Unique Articles'
            }
          ],
          body: keywords
        };
        setTimeout(function() {
          var table = components.table(target)
            .data(table_data)
            .draw();
        }, 1);
      })
      .data(segment)
      .unpersist(true)
      .trigger()
      // })
      // .data(segment)
      // .unpersist(true)
      // .trigger()
  }

  return action;

})(RB.crusher.ui.action || {})