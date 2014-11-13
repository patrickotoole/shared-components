var buildConversion = function(wrapped) {
  wrapped.append("div")
    .classed("panel-body",true)
    .append("h4")
    .text("Conversions Attribution")

  buildConversionReporting(wrapped)
  buildCampaignConversionReporting(wrapped)
  buildDomainConversionReporting(wrapped) 
   
}

var buildConversionReporting = function(obj) {
  var default_panel = obj

  var conversion_group = default_panel
    .append("div")
    .classed("panel-sub-heading conversion-reporting list-group",true)

  conversion_group
    .append("div")
    .classed("list-group-item",true)
    .text("Conversion Reporting")

  var pixels = default_panel
    .append("div")
    .classed("list-group conversion-reporting hidden", true)

  pixels
    .selectAll("div")
    .data(function(x){
      return x.conversion_reporting || []
    })
    .enter()
      .append("div")
      .classed("list-group-item",true)
      .html(function(x){
        return '<h5 class="list-group-item-heading">' + x.pixel_name + '</h5>'
      })
   

  conversion_group
    .on("click",function(x){
      if (!x['conversion_reporting']) {
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
         

        var URL = "/admin/advertiser/conversion/reporting?format=json&start_date=" + start_date +
          "&advertiser=" + x.pixel_source_name

        d3.json(URL,function(reporting_data){
          reporting = d3.nest()
            .key(function(d) {return d.segment})
            .entries(reporting_data)

          x.conversion_reporting = reporting
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

          th.append("th").text("pixel")
          th.append("th").text("Other") 
          th.append("th").text("")  
          th.append("th").text("Rockerbox") 
          th.append("th").text("")   
          th.append("th").text("Total")  
            

            

          var tr = table
            .append("tbody")
            .selectAll("tr")
            .data(function(d){
              return x.conversion_reporting
            })
            .enter()
              .append("tr")

          tr.append("td")
            .text(function(x){
              return x.key
            })

          tr.append("td")
            .text(function(x){
              var v = x.values[0].num_conv
              return  v 
            })
          tr.append("td")
            .text(function(x){
              var v = x.values[0].num_conv,
                t = (parseInt(x.values[0].num_conv) + parseInt(x.values[1].num_conv))
              return  v/t
            })
           
           
          tr.append("td")
            .text(function(x){
              return x.values[1].num_conv 
            })
          tr.append("td")
            .text(function(x){
              var v = x.values[1].num_conv,
                t = (parseInt(x.values[0].num_conv) + parseInt(x.values[1].num_conv))
              return  v/t
            })
           
           
          tr.append("td")
            .text(function(x){
              return parseInt(x.values[0].num_conv) + parseInt(x.values[1].num_conv)
            })
           
 
              
          
        })
         
      }
      
    })

}    
 

var buildCampaignConversionReporting = function(obj) {
  var default_panel = obj

  var conversion_group = default_panel
    .append("div")
    .classed("panel-sub-heading campaign-conversion-reporting list-group",true)

  conversion_group
    .append("div")
    .classed("list-group-item",true)
    .text("Campaign Conversions Touched")

  var pixels = default_panel
    .append("div")
    .classed("list-group campaign-conversion-reporting hidden", true)

  pixels
    .selectAll("div")
    .data(function(x){
      return x.campaign_conversion_reporting || []
    })
    .enter()
      .append("div")
      .classed("list-group-item",true)
      .html(function(x){
        return '<h5 class="list-group-item-heading">' + x.pixel_name + '</h5>'
      })
   

  conversion_group
    .on("click",function(x){
      if (!x['campaign_conversion_reporting']) {
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
         

        var URL = "/admin/advertiser/conversion/reporting?format=json&meta=top_campaigns" + 
          "&advertiser=baublebar&start_date=" + start_date + "&advertiser=" + x.pixel_source_name 

        d3.json(URL,function(reporting_data){
          reporting = d3.nest()
            .key(function(d) {return d.campaign})
            .entries(reporting_data)

          x.campaign_conversion_reporting = reporting
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

          th.append("th").text("Campaign")
          th.append("th").text("Converted users touched") 
          th.append("th").text("Touches")  
            

            

          var tr = table
            .append("tbody")
            .selectAll("tr")
            .data(function(d){
              return x.campaign_conversion_reporting
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
 
