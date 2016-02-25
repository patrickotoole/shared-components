export default function(vendor_data_columns) {
  var vendor_onsite_column = d3_updateable(vendor_data_columns, '.vendor-onsite-column', 'div')
    .classed('vendor-onsite-column col-lg-4 col-md-6', true)
    .html('<h3 style="margin-bottom: 10px;">On-site</h3>');
    // vendor_onsite_column.datum(data);

  var vendor_sessions_per_day = d3_updateable(vendor_onsite_column, '.vendor-sessions-per-day', 'div')
    .classed('vendor-sessions-per-day col-lg-6 col-md-6', true)
    .html('<h4># of sessions</h4>');

  var vendor_visits_per_user = d3_updateable(vendor_onsite_column, '.vendor-visits-per-user', 'div')
    .classed('vendor-visits-per-user col-lg-6 col-md-6', true)
    .html('<h4># of views per user</h4>');

  var data_sessions = [
    {
      key: 1,
      title: '1 time',
      value: 10
    }, {
      key: 2,
      title: '2 times',
      value: 1
    }, {
      key: 3,
      title: '3 times',
      value: 1
    }, {
      key: 4,
      title: '4 times',
      value: 1
    }, {
      key: 5,
      title: '5+ times',
      value: 2
    }
  ];

  var data_views_per_user = [
    {
      key: 1,
      title: '1-5 views',
      value: 56
    }, {
      key: 2,
      title: '6-10 views',
      value: 21
    }, {
      key: 3,
      title: '11-20 views',
      value: 6
    }, {
      key: 4,
      title: '21-30 views',
      value: 4
    }, {
      key: 5,
      title: '30+ views',
      value: 1
    }
  ];

  components.histogram(vendor_sessions_per_day)
    .data(data_sessions)
    .draw();

  components.histogram(vendor_visits_per_user)
    .data(data_views_per_user)
    .draw();
}
