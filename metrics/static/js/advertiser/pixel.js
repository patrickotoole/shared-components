var buildPixel = function(wrapped) {

  wrapped.append("div")
    .classed("panel-body",true)
    .append("h4")
    .text("On-site Activity Attribution (Pixels)")

  buildPixelReporting(wrapped)
     
}

var buildPixelReporting = function(obj) {
  var default_panel = obj

  var pixel_group = default_panel
    .append("div")
    .classed("panel-sub-heading pixel-reporting list-group",true)

  pixel_group
    .append("div")
    .classed("list-group-item",true)
    .text("Pixel Reporting")

  var pixels = default_panel
    .append("div")
    .classed("list-group pixel-reporting hidden", true)

  var graph_area = pixels
    .append("div")
    .classed("hello", true)

  pixels
    .selectAll("div")
    .data(function(x){
      return x.pixel_reporting || []
    })
    .enter()
      .append("div")
      .classed("list-group-item",true)
      .html(function(x){
        return '<h5 class="list-group-item-heading">' + x.pixel_name + '</h5>'
      })
   

  pixel_group
    .on("click",function(x){
      if (!x['pixel_reporting']) {
        var qs = (function(a) {
          if (a == "") return {};
          var b = {};
          for (var i = 0; i < a.length; ++i)
          {
            var p=a[i].split('=', 2);
            if (p.length == 1)
              b[p[0]] = "";
            else
              b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
          }
          return b;
        })(window.location.search.substr(1).split('&')),
          formatter = d3.time.format("%y-%m-%d"),
          start_date = qs["start_date"] || formatter(new Date());
         

        var URL = "/admin/advertiser/pixel/reporting?format=json&start_date=" + start_date +
          "&advertiser=" + x.pixel_source_name

        d3.json(URL,function(reporting_data){
          reporting = d3.nest()
            .key(function(d) {return d.segment})
            .entries(reporting_data)

          x.pixel_reporting = reporting
          var table = pixels
            .append("div").classed("row",true)
            .append("div").classed("col-md-12",true)
            .append("div").classed("col-md-12",true) 
            .append("table").classed("col-md-12 table table-condensed",true)

          var th = table.append("thead").append("tr")

          th.append("th").text("pixel")
          th.append("th").text("Views") 
          th.append("th").text("via rockerbox")  
          th.append("th").text("%") 

          th.append("th").text("Users")   
          th.append("th").text("via rockerbox")  
          th.append("th").text("%")  
            

            

          var tr = table
            .append("tbody")
            .selectAll("tr")
            .data(function(d){
              return x.pixel_reporting
            })
            .enter()
              .append("tr")

          tr.append("td")
            .text(function(x){
              return x.key
            })

          tr.append("td")
            .text(function(x){
              var v = x.values[0].imps
              return  v
            })
          tr.append("td")
            .text(function(x){
              var v = x.values[0].rbox_imps
              return  v 
            })
          tr.append("td")
            .text(function(x){
              return formatPercent(x.values[0].rbox_imps/x.values[0].imps)
            })
            
           
          tr.append("td")
            .text(function(x){
              return x.values[0].users
            })
          tr.append("td")
            .text(function(x){
              var v = x.values[0].rbox_users
              return  v
            })
          tr.append("td")
            .text(function(x){
              return formatPercent(x.values[0].rbox_users/x.values[0].users)
            })

          makeGraphArea(graph_area)
          
        })
         
      }
      
    })

}
 
