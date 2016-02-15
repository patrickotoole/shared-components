export default function(vendor_data_columns) {

  var vendor_domains_pie_column = d3_updateable(vendor_data_columns, '.vendor-domains-pie-column', 'div')
    .classed('vendor-domains-pie-column col-lg-4 col-md-6', true)
    .html(function(x) {
      if(typeof x.domains !== typeof undefined) {
        return '<h3>Off-site</h3><p class="chart-description">A category breakdown for off-site activity.</p>';
      }
    });

  var vendor_domains_pie = d3_updateable(vendor_domains_pie_column, '.vendor-domains-pie', 'div')
    .classed('col-md-12 row vendor-domains-pie', true)
    .style('width', '220px')
    .style('padding', '0px')

    

  vendor_domains_pie.datum(function(x) {

    if (x.parentCategoryData == undefined && x.domains) {

      var category_data = x.domains.reduce(function(p,domain){
        var category = domain.parent_category_name

        p[category] = p[category] || 0
        p[category] += domain.count

        return p
      },{})

      var parentCategoryData = d3.entries(category_data)
        .map(function(c) { return { label: c.key, value: c.value } })

      x.parentCategoryData = parentCategoryData

    }

      return x;
  })

  vendor_domains_pie.each(function(y){
    if(typeof y.parentCategoryData !== typeof undefined) {
      var target = d3.select(this);
      var pp = components.pie(target)
      pp.colors(RB.crusher.ui.action.category_colors)
      // pp.width(150);
      pp.data(
        function(x){
          // debugger;
          x.parentCategoryData.filter(function(x){
            return x.label != 'NA';
          })

          x.parentCategoryData.sort(function(a,b){
            return b.value - a.value;
          })
          return x.parentCategoryData
        },
        function(d){ return d.data.label }
      )
      target.selectAll("svg").on("click",function(x){
        pp._hover()
        pp.draw()
      })
      pp.draw()
      d3.selectAll('svg g.desc')
        .style('font-size', '0.9em');
    }
  });
}
