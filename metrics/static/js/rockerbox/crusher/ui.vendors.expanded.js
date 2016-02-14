var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.vendors = (function(vendors) {

  var crusher = RB.crusher
  var funnelRow;
  var pubsub = crusher.pubsub
  var comma_formatter = d3.format(',');

  vendors.first = true


  vendors.show = function(funnelRow, obj) {

    var xx = window.vendors.vendor_expanded(funnelRow)

    //var vendors_list = d3.selectAll(".vendors-list")

    //var vendors_list = vendors.expanded_wrapper(funnelRow, obj)

    //var draw = function(timeseries_data, domains_data, skip){

    //  var items = vendors_list.selectAll(".vendors-list-item")
    //  vendors.render_row(items)

    //  if (!skip) run_missing_data(vendors_list.datum())
    //}

    //var run_missing_data = function(filtered,force) {

    //  if (force) {
    //    draw(false,false,true)
    //    setTimeout(function(){
    //      pubsub.publishers.actionTimeseriesOnly(filtered[0])
    //      pubsub.publishers.pattern_domains_cached(filtered[0])
    //    },1)
    //  }

    //  var missing_data = filtered.filter(function(action){
    //    return (action.timeseries_data == undefined) || (action.domains == undefined)
    //  })

    //  if (missing_data.length == 0) return draw(false,false,true)
 
    //  if ((!!missing_data[0].timeseries_data) || (!!missing_data[0].domains)) {
    //    console.log("one is present", !!missing_data[0].timeseries_data, !!missing_data[0].domains)
    //    return
    //  } else {
    //    console.log("neither are present")
    //  }

    //  setTimeout(function(){
    //    pubsub.publishers.actionTimeseriesOnly(missing_data[0])
    //    pubsub.publishers.pattern_domains_cached(missing_data[0])
    //  },1)

    //  return missing_data.length
    //}

    pubsub.subscriber("vendor-timeseries-domains",["actionTimeseriesOnly", "pattern_domains_cached"])
      .run(xx.draw.bind(xx))
      .unpersist(false)

    pubsub.subscriber("vendors-data",["actions"])
      .run(function(segments){

        var vs = segments.filter(function(x) { return x.action_type == 'vendor' })
        //vendors_list.datum(vs)

        xx.datum(vs)
        xx.draw()

        //var rows = d3_splat(vendors_list, '.vendors-list-item', 'li', false, function(x) { return x.action_name; })
        //  .classed('vendors-list-item', true);

        //rows.exit().remove()
        
        //vendors.render_row(rows)
        //run_missing_data(vs,true)

      })
      .unpersist(true)
      .trigger()

    
    
  }

  //vendors.render_row = function(rows) {

  //  vendors.expanded_nav(rows)

  //  var vendor_data_columns = d3_updateable(rows, '.vendor-data-column', 'div')
  //    .classed('vendor-data-column col-lg-10 col-md-12', true)

  //  var data_columns_without_data = vendor_data_columns.filter(function(x) { return !x.views_data })

  //  d3_updateable(data_columns_without_data, '.vendor-loading', 'div')
  //    .classed('vendor-loading loading-icon col-md-12', true)
  //    .html('<img src="/static/img/general/logo-small.gif" alt="Logo loader"> Loading vendor data...')

  //  rows.selectAll(".vendor-loading").filter(function(x){return x.timeseries_data || x.domains}).remove()

  //  RB.crusher.ui.vendors.add_views_chart(rows.selectAll('.vendor-data-column'));
  //  RB.crusher.ui.vendors.add_domains_pie(rows.selectAll('.vendor-data-column'));

  //  var vendor_onsite_column = d3_updateable(vendor_data_columns, '.vendor-onsite-column', 'div')
  //    .classed('vendor-onsite-column col-lg-4 col-md-6', true)
  //    .html(function(x) {
  //      if(typeof x.timeseries_data !== typeof undefined) {
  //        return '<h3>On-site</h3><div class="coming-soon-box">(coming soon)</div>';
  //      }
  //    });


  //}


  return vendors
})(RB.crusher.ui.vendors || {})
