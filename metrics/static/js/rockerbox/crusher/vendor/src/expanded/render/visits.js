var comma_formatter = d3.format(',');

export default function(vendor_data_columns) {

  var vendor_views_column = d3_updateable(vendor_data_columns, '.vendor-views-column', 'div')
    .classed('vendor-views-column col-lg-4 col-md-6', true)
    .html(function(x) {

      if (!!x.visits_data) x.views_sum = x.visits_data.reduce(function(p,c) { return p + c.views },0)
      
      if(typeof x.views_sum !== typeof undefined) {
        var result = '<h3>Views</h3><h4>'
        result += comma_formatter(x.views_sum)
        result += '</h4><p style="margin-bottom: 25px;">This is the number of page views per day.</p>'

        return result
      }
    });

  vendor_views_column.each(function(x){
    if(typeof x.visits_data !== typeof undefined) {
      var toDraw = d3.select(this)

      x.visits_data.map(function(z){ z.key = z.date })
      // this isnt doing anything?
      x.visits_data.sort(function(a,b) { return (new Date(a.key) - new Date(b.key)) })
      var visitor_chart = RB.rho.ui.buildTimeseries(toDraw,x.visits_data,"Views",["views"],undefined,false,95)
    }
  });

}
