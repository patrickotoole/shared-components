export default function(vendor_data_columns) {

  var all_vendor_domains_pie_column = d3_updateable(vendor_data_columns, '.vendor-domains-pie-column', 'div')
    .classed('vendor-domains-pie-column col-lg-4 col-md-6', true)

  var vendor_domains_pie_column = all_vendor_domains_pie_column.filter(function(x){return x.domains !== typeof undefined})


  var desc = d3_updateable(vendor_domains_pie_column,".vendor-domains-pie-desc","div")
    .classed("vendor-domains-pie-desc",true)
    .style("display",function(){
      return d3.select(this.parentNode).selectAll("svg").size() ? undefined : "none"
    })

  d3_updateable(desc, "h3","h3")
    .text("Off-site")

  d3_updateable(desc, ".chart-description","p")
    .classed("chart-description",true)
    .text("A category breakdown for off-site activity.")



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

    var target = d3.select(this);

    if(!!y.parentCategoryData && target.selectAll("svg").size() == 0 ) {
      y.parentCategoryData.map(function(x){ x.label = x.label || x.key; x.value = x.value || x.values }) // HACK
      y.parentCategoryData = y.parentCategoryData.filter(function(x){ return x.label != 'NA'; })
      y.parentCategoryData = y.parentCategoryData.sort(function(a,b){ return b.value - a.value; })

      var pp = components.pie(target)
      pp.colors(RB.crusher.ui.action.category_colors)
      pp.data( function(x){ return x.parentCategoryData }, function(d){ return d.data.label })

      target.selectAll("svg").on("click",function(x){
        pp._hover()
        pp.draw()
      })
      pp.draw()
      d3.selectAll('svg g.desc')
        .style('font-size', '0.9em');

      d3.select(this.parentNode).selectAll(".vendor-domains-pie-desc")
        .style("display",function(){
          return d3.select(this.parentNode).selectAll("svg").size() ? undefined : "none"
        })
    }

  });
}
