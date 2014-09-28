var format = d3.format("0,000"),
  formatPercent = d3.format("%"),
  formatDate = d3.time.format("%Y-%m-%d");
 
var buildSegments = function(obj) {
  var default_panel = obj

  var segment_header = default_panel
    .append("div")
    .classed("panel-heading segments",true)
    .text("Segments")

  segment_header
    .append("div")
    .classed("pull-right",true)
    .append("a")
    .attr("href","/admin/advertiser/segment")
    //.text("Segment Dashboard")


  var segments = default_panel
    .append("div")
    .classed("list-group", true)
    .selectAll("div")
    .data(function(x){
        var segs = x.segments.filter(function(y){
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
    }) 
}

var buildInsertionOrders = function(obj) {
  var default_panel = obj

  default_panel
    .append("div")
    .classed("panel-heading pixels",true)
    .text("Insertion Orders")

  var io = default_panel
    .append("div")
    .classed("list-group", true)
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
      console.log(x.notes)
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
        console.log(x)
        return x.notes
      })
  
}

var buildPixels = function(obj) {
  var default_panel = obj

  default_panel
    .append("div")
    .classed("panel-heading pixels",true)
    .text("Conversion Pixels")

  var pixel = default_panel
    .append("div")
    .classed("list-group", true)
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
        "Goal": x['advertiser_goal'],
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

var buildAdvertiserWrapper = function(data, id, width) {
  var wrapper_width = width || 6

  var wrappers = d3.select(id).selectAll(".wrapper")
    .data(data).enter()
    .append("div")
      .classed("wrapper col-md-" + wrapper_width,true)
      .attr("id",function(x){return x.external_advertiser_id})


  var panels = wrappers
    .append("div")
    .classed("panel",true)
    .classed("panel-default",function(x) {
      return !x.active || wrapper_width != 6
    })
    .classed("panel-success", function(x) {
      return x.active && wrapper_width == 6
    })

  var headings = panels.append("div").classed("panel-heading",true);

  var titles = headings.append("h3")
    .classed("panel-title",true)
    .text(function(x) {return x.advertiser_name})

  titles.append("span")
    .classed("pull-right",true)
    .text(function(x){return x.external_advertiser_id})

  return panels
}
