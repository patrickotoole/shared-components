export default function(target) {

  var table_column = d3_updateable(target, '.vendor-domains-table-column', 'div')
    .classed('vendor-domains-table-column col-lg-8 col-md-12', true)

  var vendor_domains_table_column = table_column.filter(function(x){return x.domains !== typeof undefined})


  var desc = d3_updateable(vendor_domains_table_column,".vendor-domains-table-desc","div")
    .classed("vendor-domains-table-desc",true)
    .style("display","inherit")

  d3_updateable(desc, "h3","h3")
    .text("Domains")

  d3_updateable(desc, ".chart-description","p")
    .classed("chart-description",true)
    .text("Top domains for your advertiser")



  var vendor_domains_table = d3_updateable(vendor_domains_table_column, '.vendor-domains-table', 'div')
    .classed('col-md-12 row vendor-domains-table', true)
    .style('width', '220px')
    .style('padding', '0px')

  vendor_domains_table.datum(function(x) {

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

  vendor_domains_table.each(function(y){

    var target = d3.select(this);

    var header = [
        {key: "url","title":"Domain",href: true}
      , {key: "count", count: "Count"}
    ]

    if (y.domains_full) {
      var data = y.domains_full.map(function(x,i){return x})
        .filter(function(x) {
          var l = document.createElement("a");
          if(x.url.slice(0, 7) !== 'http://' && x.url.slice(0, 7) !== 'https:/') {
            x.url = 'http://' + x.url;
          }
          l.href = x.url;
          x.key = l.host
          return (l.pathname.length >= 12) 

        })

      components.table(target)
        .data({"body":data,"header":header})
        .draw()

    }


  });
}
