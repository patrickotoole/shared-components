export default function(row) {
  d3_updateable(row, '.vendor-column-title', 'div')
    .style('cursor', 'pointer')
    .classed('vendor-column vendor-column-title', true)
    .text(function(x){ return x.action_name })
    .on('click', function(x) {
      RB.routes.navigation.forward({
        "name": "View Existing Actions",
        "push_state": "/crusher/action/existing",
        "skipRender": true,
        "values_key": "action_name"
      })
      setTimeout(RB.routes.navigation.forward,1,x)
    });
}
