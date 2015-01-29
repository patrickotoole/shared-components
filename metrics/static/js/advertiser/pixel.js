var buildPixel = function(wrapped) {

  wrapped.append("div")
    .classed("panel-body",true)
    .append("h4")
    .text("On-site Activity Attribution (Pixels)")

  buildPixelReporting(wrapped)
     
}

var buidlTable = function(table,columns) {
  var th = table.append("thead").append("tr")

  columns.map(function(x){
    th.append("th").text(x.header)
  })

  var tr = table
    .append("tbody")
    .selectAll("tr")
    .data(function(d){
      d.pixel_reporting.sort(function(x,y) {return y.values[0].imps - x.values[0].imps})
      return d.pixel_reporting
    })
    .enter()
      .append("tr")
      .text(function(x,i){
        x.position = i
      })

  tr.on("click",function(x){
    table.selectAll("td").classed("active",false)
    d3.select(this).selectAll("td").classed("active",true) 
  })

  columns.map(function(x) {
    tr.append("td").text(function(d){
      if (typeof(x.key) == "string") {
        return d[x.key]
      } else if (x.key.length > 1 && x.formatter) {
        var args = x.key.map(function(q) { return d.values[0][q] })
        return x.formatter.apply(false,args)
      } else {
        return (x.formatter) ? 
          x.formatter(d.values[0][x.key[0]]) : 
          d.values[0][x.key[0]]
      }
    }).classed("active",function(x){
      return x.position == 0
    })
  })

}

var buildPixelReportingTables = function(pixel) {

  var wrapper = pixel.append("div").classed("row",true)
    .append("div").classed("col-md-12",true)

  var visits = wrapper.append("div").classed("col-md-6",true)
  visits.append("h5").text("On-site page views") 
  var visits_graph = visits.selectAll("div").data(function(d){
    var values = d.pixel_reporting.map(function(z){return z.values[0].timeseries})
    values.map(function(z) {z.date = new Date("20" + z.date); return z})
    return [values]
  }).enter().append("div")

  var visit_series = [
    {"name":"Rockerbox visits","key":"rbox_imps"},
    {"name":"All visits","key":"imps"}
  ]
  makeGraphArea(visits_graph,visit_series)
   
  var visits_table = visits.append("table").classed("table table-condensed table-hover",true)

  var visits_headers = [
    {"header":"Pixel","key":"name"},
    {"header":"Rockerbox","key":["rbox_imps"],"formatter":format},
    {"header":"Total","key":["imps"],"formatter":format} ,
    {"header":"%","key":["rbox_imps","imps"],"formatter":buildPercent}  
  ]

  buidlTable(visits_table,visits_headers)

  var users = wrapper.append("div").classed("col-md-6",true)
  users.append("h5").text("On-site users")
  var users_graph = users.selectAll("div").data(function(d){
    var values = d.pixel_reporting.map(function(z){return z.values[0].timeseries})
    values.map(function(z) {z.date = new Date("20" + z.date); return z})
    return [values]
  }).enter().append("div")

  var user_series = [
    {"name":"Rockerbox Users","key":"rbox_users"},
    {"name":"All Users","key":"users"}
  ]
  makeGraphArea(users_graph,user_series)

  var users_table = users.append("table").classed("table table-condensed table-hover",true)

  var users_headers = [
    {"header":"Pixel","key":"name"},
    {"header":"Rockerbox","key":["rbox_users"],"formatter":format},
    {"header":"Total","key":["users"],"formatter":format} ,
    {"header":"%","key":["rbox_users","users"],"formatter":buildPercent}  
  ]
   
  buidlTable(users_table,users_headers) 

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
    //.classed("list-group pixel-reporting hidden", true)
    .classed("list-group pixel-reporting ", true) 

  
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

  pixels.map(function(x){
    var dataset = x[0].__data__
    var pixel = d3.select(x[0])
    if (!dataset['pixel_reporting']) {
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
       

      var URL = "/admin/advertiser/pixel/reporting?format=json&start_date=" + "15-01-15" +
        "&advertiser=" + dataset.pixel_source_name + "&wide=timeseries&include=date"

      d3.json(URL,function(reporting_data){
        reporting = d3.nest()
          .key(function(d) {return d.segment})
          .entries(reporting_data)

        console.log(reporting)

        var segments = d3.nest()
          .key(function(d) {return d.external_segment_id})
          .map(dataset.segments, d3.map)

        // lets get the names on there
        reporting.map(function(e){
          var t = segments.get(e.key) || [{}]
          e.name = t[0]["segment_name"]
        })

        // decent hack to get the data binding issue
        pixel.text(function(x){
          x.pixel_reporting = reporting
        })
        
        buildPixelReportingTables(pixel,reporting)
        
      })
 
    }
  })


   
  

  pixel_group
    .on("click",function(x){
      console.log(this)
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
         

        var URL = "/admin/advertiser/pixel/reporting?format=json&date=past_month&" + //start_date=" + start_date +
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
            .append("table").classed("table table-condensed",true)


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
 

