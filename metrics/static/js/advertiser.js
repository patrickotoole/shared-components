var format = d3.format("0,000"),
  formatPercent = d3.format("%"),
  formatDate = d3.time.format("%Y-%m-%d");

var buildCampaigns = function(obj,name,show_id) {

  var default_panel = obj,
    name = name || "Campaigns",
    show_id = show_id || false


  var url = "/admin/campaign_check.xml"
  d3.xml(url, "application/xml", function(xml) {
    var testcases = xml.documentElement.getElementsByTagName("testcase")
    console.log(testcases)
    var entries = d3.entries(testcases)
    entries = entries.filter(function(x){
      try {
        if (x.value.children.length > 0) {
          var value = x.value,
            info = x.value.getAttribute("classname"),
            split_info = info.split("_")

          x.test_name = x.value.getAttribute("name")
          x.campaign_id = split_info[3]
          x.advertiser_id = split_info[1]
          x.failure = x.value.children[0].getAttribute("message")
          return true
        }
      } catch(e) { }
      return false
    })

    var mapped_entries = d3.nest()
      .key(function(x){ return x.campaign_id })
      .map(entries,d3.map)
     
    var campaign_header = default_panel
      .append("div")
      .classed("panel-sub-heading campaigns list-group",true)
      .append("div")
      .classed("list-group-item",true)
      .classed("list-group-item-danger",function(x){
        if (x.campaigns) {
          var filtered = x.campaigns.map(function(y){
            return mapped_entries.get(y.campaign_id) || []       
          }).filter(function(y){
            console.log(y)
            return y.length
          })
          console.log(filtered)
          return filtered.length
        } else {
          return 0
        }
      })
      .text(name)

    campaign_header
      .append("div")
      .classed("pull-right",true)
      .append("a")
      .attr("href","/admin/advertiser/campaign")


    var campaigns = default_panel
      .append("div")
      .classed("list-group campaigns hidden", true)
      .selectAll("div")
      .data(function(x){
        return x.campaigns
      })
      .enter()
        .append("div")
        .classed("list-group-item",true)
        .html(function(x){
          return '<span class="pull-right">' + 
            x.campaign_id + '</span><h5 class="list-group-item-heading">' + 
            x.campaign_name + '</h5>'
        })

    var campaign_description = campaigns
      .selectAll(".block-quote")
      .data(function(x){
        return (x.name) ? [x] : []
      })
      .enter()
        .append("div")
        .classed("block-quote",true)
        .html(function(x){
          return x.name
        })  
        
   

    
    var campaign_details = campaigns
      .append("div")
      .classed("details", true)

    var test_cases = campaign_details
      .selectAll("details")
      .data(function(x) {
        var entries = mapped_entries.get(x.campaign_id) || []
        return entries
      })
      .enter()
        .append("div")
        .classed("list-group test-case",true)

    test_cases
      .append("h5")
      .classed("list-group-item list-group-item-danger ",true)
      .html(function(x){
        return x.test_name
      })  

    test_cases
      .append("pre")
      .classed("list-group-item well",true)
      .html(function(x){
        return x.failure 
      })  

    default_panel.selectAll(".panel-sub-heading > .list-group-item")
      .on("click",function(x){
        d3.select(this.parentNode.nextSibling).classed("hidden",function(x){
          if (x.is_opened === undefined) x.is_opened = 0
          if (this.classList.contains("hidden")) {
            x.is_opened += 1
            return false
          } else {
            x.is_opened -= 1
            return true
          }
        })
      })    
   
  }) 

}

 var buildUserSegments = function(obj,name,show_id,hide_on_load) {

  var default_panel = obj,
    name = name || "Segments",
    show_id = show_id || false

  var segment_header = default_panel
    .append("div")
    .classed("panel-sub-heading segments list-group",true)
    .append("div")
    .classed("list-group-item",true)
    //.classed("disabled",true)
    .text(name)

  segment_header
    .append("div")
    .classed("pull-right",true)
    .append("a")
    .attr("href","/admin/advertiser/segment")
    //.text("Segment Dashboard")


  var segments = default_panel
    .append("div")
    .classed("list-group segments", true)
    .classed("hidden",hide_on_load)
    .selectAll("div")
    .data(function(x){
      var segs = x.segments.filter(function(y){
        y.external_segment_id = show_id ? y.external_segment_id : ""
        return y.segment_implemented == 0
      })
      return segs || []
    })
    .enter()
      .append("div")
      .classed("list-group-item",true)
      .html(function(x){
        return '<h5 class="list-group-item-heading">' + 
          x.segment_name + '<span class="pull-right">'+ 
          x.external_segment_id + '</span></h5>'
      })

}
 
 
var buildSegments = function(obj,name,show_id,hide_on_load) {

  var default_panel = obj,
    name = name || "Segments",
    show_id = show_id || false

  var segment_header = default_panel
    .append("div")
    .classed("panel-sub-heading segments list-group",true)
    .append("div")
    .classed("list-group-item",true)
    //.classed("disabled",true)
    .text(name)

  segment_header
    .append("div")
    .classed("pull-right",true)
    .append("a")
    .attr("href","/admin/advertiser/segment")
    //.text("Segment Dashboard")


  var segments = default_panel
    .append("div")
    .classed("list-group segments", true)
    .classed("hidden",hide_on_load)
    .selectAll("div")
    .data(function(x){
      var segs = x.segments.filter(function(y){
        y.external_segment_id = show_id ? y.external_segment_id : ""
        return y.segment_implemented != 0
      })
      return segs || []
    })
    .enter()
      .append("div")
      .classed("list-group-item",true)
      .html(function(x){
        return '<h5 class="list-group-item-heading">' + 
          x.segment_name + '<span class="pull-right">'+ 
          x.external_segment_id + '</span></h5>'
      })

  var segment_description = segments
    .selectAll(".block-quote")
    .data(function(x){
      return (x.segment_description) ? [x] : []
    })
    .enter()
      .append("div")
      .classed("block-quote",true)
      .html(function(x){
        if (x.segment_description) 
          x.segment_description = x.segment_description
            .replace("[user_identifier]","<span style='color:red'>[user_identifier]</span>")
          return x.segment_description
      })  
      
  var segment_details = segments
    .append("div")
    .classed("well",true)
    .html(function(x){
      if (x.segment_implemented)
        return x.segment_implemented
                .replace(/>/g,'&gt;')
                .replace(/</g,'&lt;')
                .replace(/"/g,'&quot;') 
                .replace(/\n/g,'<br/>')
                .replace("[user_identifier]","<span style='color:red'>[user_identifier]</span>") 
    }) 
}

var buildInsertionOrders = function(obj) {
  var default_panel = obj

  default_panel
    .append("div")
    .classed("panel-sub-heading inserition-orders list-group",true)
    .append("div")
    .classed("list-group-item",true)
    .classed("list-group-item-warning",function(x){
      if (x.insertion_orders) {
        return x.insertion_orders.filter(function(y){
          return y.actual_end_date > 0 && y.client_paid == 0
        }).length
      }
    }) 
    .text("Insertion Orders")

  var io = default_panel
    .append("div")
    .classed("list-group insertion-orders hidden", true)
    .selectAll("div")
    .data(function(x){
        return x.insertion_orders || []
     })
    .enter()
      .append("div")
      .classed("list-group-item",true)
      .classed("list-group-item-warning", function(x){
        return x.actual_end_date != 0 && x.client_paid == 0 
      })
      .html(function(x,i){
        return '<h5 class="list-group-item-heading">Insertion Order ' + 
          (i+1) + '</h5>'
      })

     
  var io_details = io
    .append("div")
    .classed("row small",true)

  io_details 
    .append("div")
    .classed("col-md-1",true)
    .html(function(x){
      return "From: " 
    })

  io_details 
    .append("div")
    .classed("col-md-3",true)
    .html(function(x){
      return  formatDate(new Date(1000*x.actual_start_date)) 
        
    })
   
  io_details 
    .append("div")
    .classed("col-md-1",true)
    .html(function(x){
      return "Budget:" 
    })

  io_details 
    .append("div")
    .classed("col-md-3",true)
    .html(function(x){
      return x.budget 
    })

  io_details 
    .append("div")
    .classed("col-md-1",true)
    .html(function(x){
      return "Invoiced:" 
    })

  io_details 
    .append("div")
    .classed("col-md-3",true)
    .html(function(x){
      return x.invoiced || "&nbsp;"
    })
   
 io_details 
    .append("div")
    .classed("col-md-1",true)
    .html(function(x){
      return "Until: "
    })

  io_details 
    .append("div")
    .classed("col-md-3",true)
    .html(function(x){
      return x.actual_end_date ? formatDate(new Date(1000*x.actual_end_date)) : ""
        
    })
   
  io_details 
    .append("div")
    .classed("col-md-1",true)
    .html(function(x){
      return "Spent:"
    })

  io_details 
    .append("div")
    .classed("col-md-3",true)
    .html(function(x){
      return (x.client_paid) ? x.budget : "&nbsp;"
    })

  io_details 
    .append("div")
    .classed("col-md-1",true)
    .html(function(x){
      return "Payed:"
    })

  io_details 
    .append("div")
    .classed("col-md-3",true)
    .html(function(x){
      return x.client_paid
    })

  io.selectAll(".notes")
    .data(function(x){
      return (x.notes != 0) ? [x] : []
    })
    .enter()
      .append("div")
      .classed("notes row",true)
      
      .append("div")
      .classed("col-md-12",true) 
      .append("div")
      .classed("block-quote",true)
      .text(function(x){
        return x.notes
      })
  
}



var buildEdit = function(obj) {
  var default_panel = obj

  default_panel
    .append("div")
    .classed("panel-sub-heading edit list-group",true)
    .append("div")
    .classed("list-group-item",true)
    .text("General Info")

  var setup = default_panel
    .append("div")
    .classed("edit hidden row",true)
    .append("div")
    .classed("col-md-12",true)

  var table = setup
    .append("div")
    .classed("col-md-6",true)
    .append("table")
    .classed("table table-condensed", true)

  var h = table.append("thead").append("tr")

  h.append("th")
    .text("advertser attributes (click to edit)")

  h.append("th") 

  var r = table
    .append("tbody")
    .selectAll("tr")
    .data(function(x){
        return d3.entries(x).filter(function(x){
          return typeof(x.value) != "object" && 
            ["id","active","deleted","running"].indexOf(x.key) == -1
        })
     })
    .enter()
      .append("tr")

  r.append("td")
    .html(function(x){
      return x.key
    })

 r.append("td")
    .append("a")
    .classed("editable editable-click",true)
    .attr("data-pk",function(x){return x.value})
    .attr("data-title",function(x){return "Enter " + x.key}) 
    .attr("data-url",function(x){return window.location.pathname })  
    .text(function(x){
      return x.value
    }) 

 return setup
}    

var buildStatus = function(obj) {
  var table = obj
    .append("div")
    .classed("col-md-6",true)
    .append("table")
    .classed("table table-condensed", true)

  var h = table.append("thead").append("tr")

  h.append("th")
    .text("advertiser status")

  h.append("th") 
 

  var r = table
    .append("tbody")
    .selectAll("tr")
    .data(function(x){
        return d3.entries(x).filter(function(x){
          return typeof(x.value) != "object" && ["active","deleted","running"].indexOf(x.key) > -1 
        }) 
    })
    .enter()
      .append("tr")
      .sort(function(x,y){
        var vx = typeof(x.value) == "object" ? 1 : 0,
          vy = typeof(y.value) == "object" ? 1 : 0
        return vx - vy
      })

  r.append("td")
    .html(function(x){
      return x.key
    })
   

  r.append("td")
    .append("a")
    .classed("editable editable-click",true)
    .attr("data-pk",function(x){return x.value})
    .attr("data-title",function(x){return "Enter " + x.key}) 
    .attr("data-url",function(x){return window.location.pathname })  
    .text(function(x){
      return x.value
    })
   

}

var buildObjects = function(obj) {

  var table = obj
    .append("div")
    .classed("col-md-6",true)
    .append("table")
    .classed("table table-condensed", true)

  var h = table.append("thead").append("tr")

  h.append("th")
    .text("object summary")

  h.append("th") 
 

  var r = table
    .append("tbody")
    .selectAll("tr")
    .data(function(x){
        return d3.entries(x).filter(function(x){
          return typeof(x.value) == "object"
        })
     })
    .enter()
      .append("tr")
      .sort(function(x,y){
        var vx = typeof(x.value) == "object" ? 1 : 0,
          vy = typeof(y.value) == "object" ? 1 : 0
        return vx - vy
      })

  r.append("td")
    .html(function(x){
      return x.key
    })
   

  r.append("td")
    .html(function(x){
      return x.value.length
    })
}

var makeGraphArea = function(obj){

  obj.text(function(x){
    console.log(x)
    return x
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
              console.log(x)
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


var buildPixels = function(obj) {
  var default_panel = obj

  default_panel
    .append("div")
    .classed("panel-sub-heading pixels list-group",true)
    .append("div")
    .classed("list-group-item",true)
    .text("Conversion Pixels")

  var pixel = default_panel
    .append("div")
    .classed("list-group pixel hidden", true)
    .selectAll("div")
    .data(function(x){
        return x.pixels || []
     })
    .enter()
      .append("div")
      .classed("list-group-item",true)
      .html(function(x){
        return '<h5 class="list-group-item-heading">' + x.pixel_name + '</h5>'
      })
      
  var pixel_details = pixel
    .selectAll(".row")
    .data(function(x){
      var y = [{
        "window":x.pc_window_hours,
        "revenue":x.pc_revenue,
        "type": "Post Click"
      },{
        "window":x.pv_window_hours,
        "revenue":x.pv_revenue,
        "type": "Post View"
      }]
      return y
    })
    .enter()
      .append("div")
      .classed("row",true)

  pixel_details 
    .append("div")
    .classed("col-md-4",true)
    .text(function(x){
      return x["type"] 
    })

  pixel_details 
    .append("div")
    .classed("col-md-4",true)
    .text(function(x){
      return format(x["window"]/24) + " days"
    })
   
  pixel_details 
    .append("div")
    .classed("col-md-4",true)
    .text(function(x){
      return "$" + x["revenue"] 
    })
}



var buildAdvertiserInfo = function(obj) {

  var panels = obj

  panels
    .append("div")
    .classed("panel-body summary",true)
    .selectAll("div")
    .data(function(x){
      var d = {
        "Pixel Source" : x['pixel_source_name'],
        "Contact Info": x['contact_name'],
        "Contact Email": x['email'],
        //"Goal": x['advertiser_goal'],
      }
      return d3.entries(d)
    })
    .enter()
      .append("div")
      .text(function(x){
        return x.key + " : " + x.value
      })
      .sort(function(x,y){
        return -x.key.localeCompare(y.key);
      })
      .sort(function(x,y){
        var w = (typeof x.value == "string") ? 2 : 0
        var z = (typeof x.value == "string") ? 2 : 0 
        return w - z
      })
}

var buildClientAdvertiserInfo = function(obj) {

  var panels = obj

  panels
    .append("div")
    .classed("panel-body summary",true)
    .selectAll("div")
    .data(function(x){
      var d = {
        //"Pixel Source" : x['pixel_source_name'],
        "Contact Info": x['contact_name'],
        "Contact Email": x['email'],
        //"Goal": x['advertiser_goal'],
      }
      return d3.entries(d)
    })
    .enter()
      .append("div")
      .text(function(x){
        return x.key + " : " + x.value
      })
      .sort(function(x,y){
        var w = (typeof x.value == "string") ? 2 : 0
        var z = (typeof x.value == "string") ? 2 : 0 
        return w - z
      })
}

var buildAdvertiserWrapper = function(data, id, width, show_id, internal) {
  var wrapper_width = width || 6,
    show_id = show_id || false

  var wrappers = d3.select(id).selectAll(".wrapper")
    .data(data).enter()
    .append("div")
      .classed("wrapper col-md-" + wrapper_width,true)
      .attr("id",function(x){return x.external_advertiser_id})


  var panels = wrappers
    .append("div")
    .classed("panel",true)
    .classed("panel-default",true)
    .classed("panel-warning", function(x) {
      return x.active && internal && !x.running
    })
    .classed("panel-success", function(x) {
      return x.active && x.running && internal
    })
    
     

  var headings = panels.append("div").classed("panel-heading",true);

  if (show_id) {
    headings.append("span")
      .classed("pull-right",true)
      .text(function(x){return x.external_advertiser_id})
  }

  var titles = headings.append("h3")
    .classed("panel-title",true)
    .text(function(x) {return x.advertiser_name})

  return panels

}
