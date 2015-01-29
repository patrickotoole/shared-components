var format = d3.format("0,000"),
  formatPercent = d3.format("%"),
  formatDate = d3.time.format("%Y-%m-%d"),
  buildPercent = function(x,y) {
    return formatPercent(x/y)
  }

var buildInfo = function(wrapped) {
  wrapped.append("div")
    .classed("panel-body",true)
    .append("h4")
    .text("Information and Implementation")

  var setup = buildEdit(wrapped)
  buildStatus(setup)
  buildObjects(setup)
  buildInsertionOrders(wrapped)
  buildPixels(wrapped)  
  buildSegments(wrapped,"Segment Pixels",true,true)  
  buildUserSegments(wrapped,"Constructed Segments (not on page)",true,true)
  buildCampaigns(wrapped) 
   
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
            .replace(/\[user_identifier\]/g,"<span style='color:red'>[user_identifier]</span>")
            .replace(/\[variable_holder\]/g,"<span style='color:red'>[variable_holder]</span>")
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
                .replace(/\[user_identifier\]/g,"<span style='color:red'>[user_identifier]</span>") 
                .replace(/\[variable_holder\]/g,"<span style='color:red'>[variable_holder]</span>")
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
    .classed("edit row",true)
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

var makeGraphArea = function(obj,series){
  var chart_obj = obj

  chart_obj.html(function(x){
    var _id = "asdf" + parseInt(Math.random()*10000000)
    var values = x[0].map(function(z){
      z.date = typeof(z.date) == "string" ? new Date("20"+z.date) : z.date; 
      return z
    })

    if (series) {
      values = values.map(function(z){
        y = { "date":z.date }
        series.map(function(m){ y[m.name] = z[m.key] })
        return y
      })
    }

    var keys = Object.keys(values[0]).filter(function(x){return x != "date"})
    console.log(values)

    setTimeout(function(){
      data_graphic({
        title: "testing",
        data: values,
        width: 520,
        height: 150,
        legend: keys,
        legend_target: '#legend' + _id,
        target: '#' + _id,
        x_accessor: 'date',
        y_accessor: keys
      })
    },0)
     

    return "<div class='legend' id='legend"+_id+"'></div><span id='"+_id+"'></span>"
  })


}
 
