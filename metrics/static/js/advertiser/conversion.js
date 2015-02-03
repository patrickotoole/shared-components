var buildConversion = function(wrapped) {
  wrapped.append("div")
    .classed("panel-body",true)
    .append("h4")
    .text("Conversions Attribution")

  buildConversionReporting(wrapped)
  buildCampaignConversionReporting(wrapped)
  buildDomainConversionReporting(wrapped) 
   
}

var buildConversionReportingTables = function(pixel,data_key) {

  var wrapper = pixel.append("div").classed("row",true)
    .append("div").classed("col-md-12",true)


  RB.objects.timeseries.graphWithTable({
    "wrapper": wrapper.append("div").classed("col-md-6",true),
    "data_key": data_key,
    "graph_series": [
      {"name":"Rockerbox Conversions","key":"rbox_conv"},
      {"name":"Total Conversions","key":"num_conv"} 
    ],
    "table_series": [
      {"header":"id","key":"name"},
      {"header":"Rockerbox","key":["rbox_conv"],"formatter":format},
      {"header":"Total","key":["num_conv"],"formatter":format},
      {"header":"%","key":["rbox_conv","num_conv"],"formatter":buildPercent}
    ],
    "title": "Conversion Attribution"
  })

}

var buildConversionReporting = function(obj) {

  var build = function(x) {
    var elem = d3.select(x),
      data = x.__data__,
      data_key = "conversion_reporting",
      advertiser = data.pixel_source_name

     var segments = d3.nest()
       .key(function(d) {return d.pixel_id})
       .map(data.pixels, d3.map)

    if (!data[data_key]) {

      RB.data.conversion_reporting(advertiser,function(data){

        data.map(function(e){
          var t = segments.get(e.key) || [{}]
          e.name = t[0]["pixel_display_name"]
        })

        elem.text(function(x){ x[data_key] = data})
        buildConversionReportingTables(elem,data_key)
      })
 
    }
  }


  var conversion_group = obj.append("div")
    .classed("panel-sub-heading conversion-reporting list-group",true)

  conversion_group.append("div").classed("list-group-item",true)
    .text("Conversion Reporting")

  var pixels = obj.append("div")
    .classed("list-group conversion-reporting", true)

  pixels[0].map(build)

  conversion_group.on("click",function(x){
    if (!x['conversion_reporting']) build([this.nextSibling])
  })

}    

var buildCampaignConversionReportingTables = function(pixel,data_key,title_prefix) {

  var wrapper = pixel//.append("div").classed("row",true)
    //.append("div").classed("col-md-12",true).attr("id",data_key)

  RB.objects.timeseries.graphWithTable({
    "wrapper": wrapper.append("div").classed("col-md-6",true),
    "data_key": data_key,
    "graph_series": [
      {"name":"Conversions","key":"conv"},
      {"name":"Impressions","key":"imps"}, 
    ],
    "table_series": [
      {"header":"Campaign","key":"key"},
      {"header":"Conversions","key":["conv"],"formatter":format},
      {"header":"Impressions","key":["imps"],"formatter":format}, 
      {"header":"imps per conv","key":["imps","conv"],"formatter":buildRatio},  
    ],
    "title": title_prefix + " Conversions" 
  })

}

var buildCampaignConversionReporting = function(obj) {

  var build = function(x) {
    var elem = d3.select(x),
      data = x.__data__,
      data_key = "campaign_conversion_reporting",
      advertiser = data.pixel_source_name

    var segments = d3.nest()
      .key(function(d) {return d.pixel_id})
      .map(data.pixels, d3.map)

    if (!data[data_key]) {

      RB.data.campaign_conversion_reporting(advertiser,function(data){

        data.map(function(e){ e.name = e.key })
        elem.text(function(x){ x[data_key] = data })

        var wrapper = elem.append("div").classed("row",true).append("div").classed("col-md-12",true)

        var each = wrapper.selectAll("div")
          .data(function(d){
            return d[data_key]
          })
          .enter()
            .append("div")

        each[0].map(function(e){
          var key = d3.select(e)[0][0].__data__['key']
          var name = segments.get(key)[0].pixel_display_name
          buildCampaignConversionReportingTables(d3.select(e),"values",name)
        })
        
       
      })
 
    }
  }


  var campaign_conversion_group = obj.append("div")
    .classed("panel-sub-heading campaign-conversion-reporting list-group",true)

  campaign_conversion_group.append("div").classed("list-group-item",true)
    .text("Campaign Conversion Reporting")

  var pixels = obj.append("div")
    .classed("list-group campaign-conversion-reporting", true)

  pixels[0].map(build)

  campaign_conversion_group.on("click",function(x){
    if (!x['campaign_conversion_reporting']) build([this.nextSibling])
  })

}

var buildDomainConversionReporting = function(obj) {
  var default_panel = obj

  var conversion_group = default_panel
    .append("div")
    .classed("panel-sub-heading domain-conversion-reporting list-group",true)

  conversion_group
    .append("div")
    .classed("list-group-item",true)
    .text("Domain Conversions Touched")

  var pixels = default_panel
    .append("div")
    .classed("list-group domain-conversion-reporting hidden", true)

  pixels
    .selectAll("div")
    .data(function(x){
      return x.domain_conversion_reporting || []
    })
    .enter()
      .append("div")
      .classed("list-group-item",true)
      .html(function(x){
        return '<h5 class="list-group-item-heading">' + x.pixel_name + '</h5>'
      })
   

  conversion_group
    .on("click",function(x){
      if (!x['domain_conversion_reporting']) {
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
         

        var URL = "/admin/advertiser/conversion/reporting?format=json&meta=top_domains" + 
          "&advertiser=baublebar&start_date=" + start_date + "&advertiser=" + x.pixel_source_name 

        d3.json(URL,function(reporting_data){
          reporting = d3.nest()
            .key(function(d) {return d.domain})
            .entries(reporting_data)

          x.domain_conversion_reporting = reporting
          var table = pixels
            .append("div")
              .classed("row",true)
            .append("div")
              .classed("col-md-12",true)
            .append("div")
              .classed("col-md-12",true) 
            .append("table")
              .classed("col-md-12 table table-condensed",true)

          var th = table.append("thead").append("tr")

          th.append("th").text("domain")
          th.append("th").text("Converted users touched") 
          th.append("th").text("Touches")  
            

            

          var tr = table
            .append("tbody")
            .selectAll("tr")
            .data(function(d){
              return x.domain_conversion_reporting
            })
            .enter()
              .append("tr")

          tr.append("td")
            .text(function(x){ return x.key })
          tr.append("td")
            .text(function(x){ return x.values[0].num_conv })
          tr.append("td")
            .text(function(x){ return x.values[0].imps })
                    
 
              
          
        })
         
      }
      
    })     
 

}
 
