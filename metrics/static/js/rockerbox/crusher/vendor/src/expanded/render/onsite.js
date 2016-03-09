export default function(vendor_data_columns) {
  var vendor_onsite_column = d3_updateable(vendor_data_columns, '.vendor-onsite-column', 'div')
    .classed('vendor-onsite-column col-lg-4 col-md-6', true)
    .html('<h3 style="margin-bottom: 10px;">On-site</h3>');

  var vendor_sessions_per_day = d3_updateable(vendor_onsite_column, '.vendor-sessions-per-day', 'div')
    .classed('vendor-sessions-per-day col-lg-6 col-md-6', true)
    .html('<h4># of sessions</h4>');

  var vendor_visits_per_user = d3_updateable(vendor_onsite_column, '.vendor-visits-per-user', 'div')
    .classed('vendor-visits-per-user col-lg-6 col-md-6', true)
    .html('<h4># of views per user</h4>');

  var slice_segments = function(items) {
    var items_chunk_size = Math.ceil(items.length / 10);

    // Segment chunk sizes 10%, 10%, 20%, 30%, 30%
    var views_segmented = [{
      items: items.slice(0, 1)
    }, {
      items: items.slice(1, items_chunk_size)
    }, {
      items: items.slice(items_chunk_size, (items_chunk_size * 2))
    }, {
      items: items.slice((items_chunk_size * 2), (items_chunk_size * 4))
    }, {
      items: items.slice((items_chunk_size * 4), (items_chunk_size * 7))
    }, {
      items: items.slice((items_chunk_size * 7), (items_chunk_size * 10))
    }];

    return views_segmented;
  }

  vendor_visits_per_user.each(function(row) {
    if (row.onsite != undefined) {
      var views = slice_segments(row.onsite.response.visits);

      views.map(function(x, i) {
        x.key = i;
        if(x.items[0]) {
          if(x.items[0].num_visits == 1) {
            x.title = '1 view'
          } else if(x.items[0].num_visits == x.items[x.items.length - 1].num_visits) {
            x.title = x.items[0].num_visits + ' views';
          } else {
            x.title = x.items[0].num_visits + ' - ' + x.items[x.items.length - 1].num_visits + ' views';
          }
        } else {
          x.title = '';
        }
        x.value = d3.sum(x.items, function(y) {
          return y.visit_user_count;
        });
        return x;
      });

      var histogram_visits = components.histogram(d3.select(this))
        .data(views)
        .draw();
    }
  });

  vendor_sessions_per_day.each(function(row) {
    if (row.onsite != undefined) {
      var sessions = slice_segments(row.onsite.response.sessions);
      sessions.map(function(x, i) {
        x.key = i;

        if(x.items[0]) {
          if(x.items[0].num_sessions == 1) {
            x.title = '1 time';
          } else if(x.items[0].num_sessions == x.items[x.items.length - 1].num_sessions) {
            x.title = x.items[0].num_sessions + ' times';
          } else {
            x.title = x.items[0].num_sessions + ' - ' + x.items[x.items.length - 1].num_sessions + ' times';
          }
        } else {
          x.title = '';
        }

        x.value = d3.sum(x.items, function(y) {
          return y.sessions_user_count;
        });
        return x;
      });

      var histogram_sessions = components.histogram(d3.select(this))
        .data(sessions)
        .draw();
    }
  });
}
