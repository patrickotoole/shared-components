var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.vendors = (function(vendors) {

  var crusher = RB.crusher
  var funnelRow;
  var pubsub = crusher.pubsub
  var comma_formatter = d3.format(',');

  var navigation_items = [
    {
      title: 'Opportunities',
      url: 'advertiser-opportunities'
    }, {
      title: 'Before and After',
      url: 'before-and-after'
    }, {
      title: 'Clusters',
      url: 'clusters'
    }, {
      title: 'Timing',
      url: 'timing'
    }, {
      title: 'Comparison',
      url: 'comparison'
    }
  ]

  vendors.expanded_nav  = function(items) {


    var vendor_name_column = d3_updateable(items, '.vendor-name-column', 'div')
      .classed('vendor-name-column col-lg-2 col-md-6', true)

    var vendor_name = d3_updateable(vendor_name_column, '.vendor-name', 'div')
      .classed('col-md-12 vendor-name', true)
      .html(function(x) { return '<h2>' + x.action_name + '</h2>'; });

    // Vendor List Item : Expand Button
    var vendor_expand = d3_updateable(vendor_name_column, '.vendor-expand', 'div')
      .classed('col-md-12 vendor-expand', true)


    

    var vendor_navigation_list = d3_updateable(vendor_name_column, '.vendor-navigation-list', 'ul')
      .classed('col-md-12 vendor-navigation-list', true)

    var vendor_navigation_items = d3_splat(vendor_navigation_list, '.nav-list-item', 'li',
      navigation_items,
      function(x) { return x.title }
    )
    .classed('nav-list-item', true);

    d3_updateable(vendor_navigation_items, 'a', 'a')
      .attr('href', function(x) {
        return '/crusher/action/existing?id=/' + x.action_name + '#' + x.url;
      })
      .text(function(x) { return x.title; })
      .on('click', function(x) {
        RB.routes.navigation.forward({
          "name": "View Existing Actions",
          "push_state":"/crusher/action/existing",
          "skipRender": true,
          "values_key":"action_name"
        })
        RB.routes.navigation.forward(d3.select(this.parentElement.parentElement).datum())

        d3.event().preventDefault();
      })

  }

  return vendors
})(RB.crusher.ui.vendors || {})
