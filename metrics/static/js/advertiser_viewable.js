var buildViewableGraph = function(summary,accessor,_class,height) {

  var height = height || 50,
    x = d3.scale.linear().range([0, 100]),
    y = d3.scale.ordinal()
      .rangeRoundBands([0, height], .2)
      .domain(["served","loaded","visible"]),
    LABEL_WIDTH = 50;

  var svg = summary
    .append("div")
    .classed(_class,true)
    .append("svg")
    .attr("width", 170)
    .attr("height",height)
    .append("g")

  svg
    .append("rect")
    .attr("x",LABEL_WIDTH + 50)
    .attr("y",0)
    .attr("width",1)
    .attr("height",height)
    
  bars = svg.selectAll(".bar")
    .data(function(d){
      return d[accessor]
    })
    .enter()

  bars
   .append("text")
   .text(function(d){return d.key})
   .attr("x", function(d) { return x(Math.min(0, d.values[1])); })
   .attr("y", function(d) { return y(d.key) + 10; }) 
   .attr("width",LABEL_WIDTH)
   .attr("class","small")

  bars
    .append("rect")
      .attr("class", function(d) { return d.values[1] < .5 ? "bar negative" : "bar positive"; })
      .attr("x", function(d) { return LABEL_WIDTH + x(Math.min(0, d.values[1])); })
      .attr("y", function(d) { return y(d.key); })
      .attr("width", function(d) { return Math.abs(x(d.values[1]) - x(0)); })
      .attr("height", y.rangeBand());
}

var buildViewableSummary = function(Sum,panels) {
  var sum = Sum.toLowerCase().replace(" ","_")

  var summary = panels
    .append("div")
    .classed("panel-body " + sum + "-summary",true)

  summary.append("h5")
    .text(Sum + " Summary")

  var summary_body = summary
    .append("div")
    .classed("col-md-3 small",true)
    .selectAll("div")
    .data(function(x){
      return x[sum + "_summary"]
    })
    .enter()
    .append("div")
    .html(function(x){
      return x.key + " " + format(x.values[0])
    })

  buildViewableGraph(summary,sum + "_summary","col-md-3")
  
}

var transformData = function(advertiser_data,reporting_data) {
  reporting = d3.nest()
    .key(function(d) {return d.advertiser})
    .rollup(function(l){
      var 
        fields = ["served","loaded","visible"],
        values =  fields.map(function(n){
          return d3.sum(l.map(function(k,i){return k[n]}))
        }),
        rolled = fields.map(function(n,i){
          return {
            key: n,
            values: [values[i],values[i]/values[0]]
          }
        })

      return rolled
    })
    .map(reporting_data,d3.map)

  campaign_viewability = d3.nest()
    .key(function(d) {return d.advertiser})
    .map(reporting_data,d3.map)

  tag_viewability = d3.nest()
    .key(function(d) {return d.advertiser})
    .map(reporting_data,d3.map)

  domain_list_viewability = d3.nest()
    .key(function(d) {return d.advertiser})
    .map(reporting_data,d3.map)
   


  advertiser_data.forEach(function(d){
    d.viewability_summary = reporting.get(d.pixel_source_name) || []

    var v = campaign_viewability.get(d.pixel_source_name) || []

    d.campaign_viewabilitys = d3.nest()
      .key(function(d) { return d["campaign"]})
      .rollup(function(l){
        var fields = ["served","loaded","visible"],
          values =  fields.map(function(n){
            return d3.sum(l.map(function(k,i){return k[n]}))
          }),
          rolled = fields.map(function(n,i){
            return {
              key: n,
              values: [values[i],values[i]/values[0]]
            }
          })

        return rolled
      })
      .entries(v)

    var v = tag_viewability.get(d.pixel_source_name) || []

    d.tag_viewabilitys = d3.nest()
      .key(function(d) { return d["tag"]})
      .rollup(function(l){
        var fields = ["served","loaded","visible"],
          values =  fields.map(function(n){
            return d3.sum(l.map(function(k,i){return k[n]}))
          }),
          rolled = fields.map(function(n,i){
            return {
              key: n,
              values: [values[i],values[i]/values[0]]
            }
          })

        return rolled
      })
      .entries(v) 

      d.tag_viewabilitys = d.tag_viewabilitys.filter(function(x){ return x.values[0].values[0] > 10})

    var v = domain_list_viewability.get(d.pixel_source_name) || []

    d.domain_list_viewabilitys = d3.nest()
      .key(function(d) { return d["type"]})
      .rollup(function(l){
        var fields = ["served","loaded","visible"],
          values =  fields.map(function(n){
            return d3.sum(l.map(function(k,i){return k[n]}))
          }),
          rolled = fields.map(function(n,i){
            return {
              key: n,
              values: [values[i],values[i]/values[0]]
            }
          })

        return rolled
      })
      .entries(v) 

      d.domain_lists = d.domain_lists || []

      var lists = d.domain_lists.map(function(x){return x.domain_list_name})
      
      d.domain_list_viewabilitys = d.domain_list_viewabilitys.filter(function(x){ 
        return lists.indexOf(x.key) > -1
      })
     

  })

  return advertiser_data
}

var buildViewableWrapper = function(advertiser_data,defaultWidth) {

  var wrappers = d3.select('#advertiser-content').selectAll("div")
    .data(advertiser_data).enter()
    .append("div")
      .classed("wrapper col-md-" + defaultWidth,true)
      .attr("id",function(x){
        return x.external_advertiser_id
      })

  var panels = wrappers
    .append("div")
    .classed("panel",true)
    .classed("panel-default",function(x) {
      return !x.active 
    })
    .classed("panel-success", function(x) {
      return x.active 
    })

  var headings = panels.append("div")
    .classed("panel-heading",true);

  var titles = headings.append("h3")
    .classed("panel-title",true)
    .text(function(x) {return x.advertiser_name})

  titles.append("span")
    .classed("pull-right",true)
    .text(function(x){return x.external_advertiser_id})
      
  return panels
}

var buildGroup = function(panel,class_name,grouping) {
  var group_class = class_name + "-group",
    group_header_class = class_name + "-header",
    group_item_class = class_name + "-item"


  var group = panel.append("div")
    .classed("list-group " + group_class,true)
    .on("click",function(x){
      var isOpened = function(y){return x.is_opened[y]},
        p = d3.select(this.parentNode.parentNode), 
        has_opened = Object.keys(x.is_opened).filter(isOpened).length;

      if (defaultWidth == "6") {
        p.classed("col-md-6",!has_opened) 
        p.classed("col-md-12",has_opened)  
      }
    })

  var header = group.append("a")
      .classed("list-group-item " + group_header_class,true)
      .text(grouping)
      .on("click",function(data){
        data.is_opened = data.is_opened || {}
        d3.select(this.parentNode)
          .selectAll("." + group_item_class)
          .classed("hidden",function(x){
            var is_visible = !this.classList.contains("hidden")
            data.is_opened[class_name] = !is_visible
            return is_visible
          })
      })

  header
    .append("span")
    .classed("badge",true)
    .text(function(x){
      var values = x[class_name + "s"]
      values = values ? values : {}
      return Object.keys(values).length
    })

  return group 
}

var buildItems = function(group,class_name) {
  var group_item_class = class_name + "-item"
  var items = group.selectAll("div")
    .data(function(x){
      var values = x[class_name + "s"]
      return values ? values : {}
    })
    .enter()
      .append("div")
      .sort(function(x,y) {
        return y.values[0].values[0] - x.values[0].values[0]
        //return x.key - y.key
      })
      .classed("list-group-item hidden " + group_item_class,true)
      .classed("list-group-item-warning",function(x){
        if (x.values) return x.values[2].values[1] < .35
      })
      .classed("list-group-item-danger",function(x){
        if (x.values) return x.values[2].values[1] < .2
      })

  var pitems = items
    .append("p")
    .classed("row list-group-item-text",true)
    .html(function(x){
      return '<div class="col-md-3">' +  x["key"]  + '</div>'
    })

  return pitems
}

var renderRows = function(class_name,items) {
  var summary_body = items
    .append("div")
    .classed("col-md-3 small",true)
    .selectAll("div")
    .data(function(x){
      return x["values"]
    })
    .enter()
    .append("div")
    .html(function(x){
      return x.key + " " + format(x.values[0]) + " (" + formatPercent(x.values[1]) +")"
    })

  buildViewableGraph(items,"values","col-md-3",45)

  var links = {
    "campaign_viewability": ["tag,domain","domain","tag"],
    "domain_list_viewability": ["campaign","domain","domain,venue"],
    "tag_viewability": ["campaign,domain","campaign","domain"]
  }

  items
    .append("div")
    .classed("col-md-3",true)
    .html(function(x){
      var base = "/admin/advertiser/viewable/reporting?",
        dims = links[class_name],
        param = class_name.replace("_viewability","")

      if (param == "domain_list") param = "type"

      var xx = dims.map(function(dim){
        return "<a href='" + base + "include=" + 
          dim +"&" + param + "=" + x.key + 
          "'>view by "+ dim + "</a><br/>"
      })
      return xx.join("")
    })
     
}       

