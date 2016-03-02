var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.full_url_ranking = (function(full_url_ranking) {

  var crusher = RB.crusher

  full_url_ranking.show = function(target, obj) {

    var table_data = {
      header: [
        {
          key: 'key',
          title: 'Rank'
        },
        {
          key: 'url',
          title: 'URL'
        },
        {
          key: 'uniques',
          title: 'Uniques'
        },
        {
          key: 'count',
          title: 'Count'
        }
      ],
      body: [
        {
          key: 1,
          url: '//kiplinger.com/slideshow/business/T019-S010-states-with-the-fastest-job-growth/index.html',
          uniques: 103,
          count: 501
        },
        {
          key: 2,
          url: '//kiplinger.com/slideshow/business/T019-S010-states-with-the-fastest-job-growth/index.html',
          uniques: 103,
          count: 501
        },
        {
          key: 3,
          url: '//kiplinger.com/slideshow/business/T019-S010-states-with-the-fastest-job-growth/index.html',
          uniques: 103,
          count: 501
        },
        {
          key: 4,
          url: '//kiplinger.com/slideshow/business/T019-S010-states-with-the-fastest-job-growth/index.html',
          uniques: 103,
          count: 501
        },
        {
          key: 5,
          url: '//kiplinger.com/slideshow/business/T019-S010-states-with-the-fastest-job-growth/index.html',
          uniques: 103,
          count: 501
        },
        {
          key: 6,
          url: '//kiplinger.com/slideshow/business/T019-S010-states-with-the-fastest-job-growth/index.html',
          uniques: 103,
          count: 501
        }
      ]
    };



    // var table = components.table(target)
    //   .data(table_data)
    //   .draw();

    pubsub.subscriber("cached_visitor_domains",["cached_visitor_domains"])
      .run(function(cached_visitor_domains){
        // var table_data = cached_visitor_domains.slice(0, 10);
        var table_data = {
          header: [
            {
              key: 'key',
              title: 'Rank'
            },
            {
              key: 'url',
              title: 'URL'
            },
            {
              key: 'uniques',
              title: 'Uniques'
            },
            {
              key: 'count',
              title: 'Count'
            }
          ],
          body: []
        };

        var raw_table_data = cached_visitor_domains
          .sort(function(x, y) {
            return y.count - x.count
          })
          .slice(0, 30);

        raw_table_data.forEach(function(item, i) {
          table_data['body'].push({
            key: (i + 1),
            url: item.url,
            uniques: item.uniques,
            count: item.count
          });
        });

        console.log('TABLE DATA', table_data)

        setTimeout(function() {
          console.log('!!!!!!!!!!!!', table_data)
          var table = components.table(target)
            .data(table_data)
            .draw();
        }, 1);
      })
      .data({
      })
      .unpersist(true)
      .trigger()

  };

  return full_url_ranking;

})(RB.crusher.ui.full_url_ranking || {}, RB.crusher)
