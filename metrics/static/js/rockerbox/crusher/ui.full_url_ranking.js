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

    console.log('TARGET', target)

    var table = components.table(target)
      .data(table_data)
      .draw();

    console.log('TABLE', table);

  };

  return full_url_ranking;

})(RB.crusher.ui.full_url_ranking || {}, RB.crusher)
