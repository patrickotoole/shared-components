export default function(vendor_data_columns) {

  function histogram(wrapper, data, bar_height, max_width) {
    // Create SVG element and bind data to that element
    var svg = d3_updateable(wrapper, '.vendor-histogram', 'svg')
      .classed('vendor-histogram', true)
      .style('width', '100%');

    svg.datum(data);

    svg.exit().remove()

    // Set color range and create a get function
    var colors = ['#9ecae1','#6baed6','#4292c6',
                  '#2171b5','#08519c','#08306b'];

    var get_color = d3.scale.quantile()
      .domain([0, d3.max(data, function (d) { return d.value; })])
      .range(colors);


    // Set height and max width if necessary
    bar_height = bar_height || 20;
    max_width = max_width || 70;
    var bar_width = d3.scale.linear()
      .domain([0, d3.max(data, function(d) {
        return Math.sqrt(d.value);
      })])
      .range([0, max_width]);


      // console.log('Sessions', sessions);
    // Add title to the svg
    // var title = svg.append('text')
    //   .classed('title', true)
    //   .attr('transform', 'translate(' + (6) + ',' + (20) + ')')
    //   .style('text-anchor', 'middle')
    //   .style('font-weight', 'bold')
    //   .style('font-family', 'Helvetica')
    //   .style('font-size', '12px')
    //   .text('Number of sessions per day');
    // title.exit().remove()


    // Add bars to the svg
    svg.selectAll('.bar')
      .data(svg.datum(), function(x) {
        return x.key
      })
      .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', 75)
        .attr('width', function(d) {
          return bar_width(Math.sqrt(d.value));
        })
        .attr('y', function(d, i) {
          return bar_height * i;
        })
        .attr('fill',function(x) {
          return get_color(x.value);
        })
        .attr('stroke','white')
        .attr('stroke-width','2px')
        .attr('height', bar_height);

    svg.selectAll('.label')
      .data(svg.datum(), function(x) {
        return x.key;
      })
      .enter().append('text')
        .text(function (d) { return d.title; })
        .attr('x', '0px')
        .attr('y', function(d, i) {
          return 14 + (bar_height * i);
        })
        .attr('width', function(d) {
          return 75;
        })
        .attr('line-height', bar_height)
        .style('color', '#000');
        // .attr('transform', 'translate(-6,' + gridSize / 1.5 + ')')
        // .attr('class', function (d, i) { return ((i >= 0 && i <= 4) ? 'dayLabel mono axis axis-workweek' : 'dayLabel mono axis axis-workweek'); });
  }



  // Number of sessions (per day)
  // Number of visits per user


  var raw_dataset = '{"search":[["google"]],"summary":{},"results":{"count":{"5739150948449316493":1,"2075392537280182118":1,"8457874040069130409":1,"2515893109372606843":1,"3590380851260342395":1,"6531579861985172701":1,"233361533792228871":1,"3963000948969200014":1,"3905557750020320891":1,"8078664624286219452":1,"5333060008800316260":1,"2107006049963148718":1,"1430972957233226412":1,"6092255968708183119":2,"5380014567697347497":1,"3533413563801225785":1,"2462474146985163545":3,"4069671458888090571":1,"4979269282750873027":1,"7523736092272306967":1,"8378889542906346492":1,"6587341182050875233":1,"6933508989883506285":1,"176530369447693765":1,"181946099398897780":1},"sessions":{"5739150948449316493":[{"date":"2016-02-13 00:00:00","visits":1}],"2075392537280182118":[{"date":"2016-02-14 00:00:00","visits":3}],"8457874040069130409":[{"date":"2016-02-16 00:00:00","visits":1}],"2515893109372606843":[{"date":"2016-02-11 00:00:00","visits":4}],"3590380851260342395":[{"date":"2016-02-13 00:00:00","visits":1}],"6531579861985172701":[{"date":"2016-02-15 00:00:00","visits":5}],"233361533792228871":[{"date":"2016-02-11 00:00:00","visits":3}],"3963000948969200014":[{"date":"2016-02-10 00:00:00","visits":1}],"3905557750020320891":[{"date":"2016-02-16 00:00:00","visits":1}],"8078664624286219452":[{"date":"2016-02-15 00:00:00","visits":1}],"5333060008800316260":[{"date":"2016-02-15 00:00:00","visits":1}],"2107006049963148718":[{"date":"2016-02-14 00:00:00","visits":1}],"1430972957233226412":[{"date":"2016-02-15 00:00:00","visits":1}],"6092255968708183119":[{"date":"2016-02-11 00:00:00","visits":2},{"date":"2016-02-14 00:00:00","visits":5}],"5380014567697347497":[{"date":"2016-02-15 00:00:00","visits":1}],"3533413563801225785":[{"date":"2016-02-10 00:00:00","visits":1}],"2462474146985163545":[{"date":"2016-02-10 00:00:00","visits":10},{"date":"2016-02-12 00:00:00","visits":6},{"date":"2016-02-14 00:00:00","visits":3}],"4069671458888090571":[{"date":"2016-02-15 00:00:00","visits":1}],"4979269282750873027":[{"date":"2016-02-16 00:00:00","visits":1}],"7523736092272306967":[{"date":"2016-02-15 00:00:00","visits":1}],"8378889542906346492":[{"date":"2016-02-10 00:00:00","visits":1}],"6587341182050875233":[{"date":"2016-02-10 00:00:00","visits":1}],"6933508989883506285":[{"date":"2016-02-13 00:00:00","visits":1}],"176530369447693765":[{"date":"2016-02-16 00:00:00","visits":1}],"181946099398897780":[{"date":"2016-02-15 00:00:00","visits":1}]}},"logic":"or"}';
  var dataset = JSON.parse(raw_dataset);

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

  histogram(vendor_sessions_per_day, data_sessions);
  histogram(vendor_visits_per_user, data_views_per_user);


  // var sessions_per_day_chart = d3_updateable(vendor_onsite_column, '.sessions-per-day-chart', 'div')
  //   .classed('sessions-per-day-chart col-lg-4 col-md-6', true)
  //   .text('SESSIONS')
}
