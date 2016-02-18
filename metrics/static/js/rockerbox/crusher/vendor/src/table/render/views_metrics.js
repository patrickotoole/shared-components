export default function(row) {
  var comma_formatter = d3.format(',');

  d3_updateable(row, '.vendor-column-views', 'div')
    .classed('vendor-column vendor-column-views', true)
    .text(function(x) {
      return comma_formatter(x.views)
    });

  d3_updateable(row, '.vendor-column-visits', 'div')
    .classed('vendor-column vendor-column-visits', true)
    .text(function(x) {
      return comma_formatter(x.visits)
    });

  d3_updateable(row, '.vendor-column-uniques', 'div')
    .classed('vendor-column vendor-column-uniques', true)
    .text(function(x) {
      return comma_formatter(x.uniques)
    });
}
