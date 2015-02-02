var RB = RB || {}

RB.QS = (function(a) {
  if (a == "") return {};
  var b = {};
  for (var i = 0; i < a.length; ++i) {
    var p = a[i].split('=', 2);
    if (p.length == 1) b[p[0]] = "";
    else b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
  }
  return b;
})(window.location.search.substr(1).split('&'))
 

RB.helpers = {
  formatters: {
    date: d3.time.format("%y-%m-%d")
  },
  get_start_date: function(){
    var today = new Date()
    var thirtydaysago = new Date(today - (30 * 24 * 60 * 60 * 1000))
    return  RB.QS["start_date"] || this.formatters.date(thirtydaysago)
  },
  order_by_nested: function(key) {
    return function (x,y) { return y.values[0][key] - x.values[0][key] }
  },
  timeseries_formatter: function(z){
    return {
      "values":z.values[0].timeseries,
      "title": z.name,
    }
  },
  add_id: function(id){
    return function(x) {
      x.id = x.id || id
      return x
    }
  },

  timeseries_transform: function(data_key) {
    var self = this
    return function(d) {
      var rand = parseInt(Math.random()*10000000)
      var values = d[data_key]
        .map(self.timeseries_formatter)
        .map(self.add_id(rand))
      values.map(function(z){
        z.values = z.values.map(function(d){
          d.date = typeof(d.date) == "string" ? new Date("20"+d.date) : d.date;  
          return d
        })
      })
      return [values]
    }
  }
}

RB.defaults= {
  timeseries: "?format=json&wide=timeseries&include=date",
  paths: {
    pixel_reporting: "/pixel",
    conversion_reporting: "/admin/advertiser/conversion/reporting",
    advertiser_reporting: "/admin/advertiser/viewable/reporting"
  }

}

RB.__data__ = {}

RB.data = (function(rb) {
  var self = rb,
    stored_data = rb.__data__

  return {
    venue_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.advertiser_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser_equal=" + advertiser + 
          "&meta=none&include=venue,date&fields=loaded,served,visible",
        order   = order || "served";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.venue})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    },
    tag_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.advertiser_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser_equal=" + advertiser + 
          "&meta=none&include=tag,date&fields=loaded,served,visible",
        order   = order || "served";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.tag})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    },
    campaign_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.advertiser_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser_equal=" + advertiser + 
          "&meta=none&include=campaign,date&fields=loaded,served,visible",
        order   = order || "served";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.campaign})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    },
    advertiser_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.advertiser_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser_equal=" + advertiser + 
          "&meta=none&include=advertiser,date&fields=loaded,served,visible",
        order   = order || "num_conv";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return "advertiser"})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    }, 
    conversion_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.conversion_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser=" + advertiser + "&meta=rbox_vs_total",
        order   = order || "num_conv";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.conv_id})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    },
    pixel_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.pixel_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser=" + advertiser,
        order   = order || "imps";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.segment})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    }
  }
})(RB)

RB.objects = (function(rb) {

  var self = rb;

  return {
    timeseries: {
      graph: function(obj,limit_series,title_prefix) {

        var chart_obj = obj
          .classed("chart",true)
          .style("height","100%")

        
        chart_obj.append("div")
          .classed("legend",true)
          .attr("id",function(x){
            return "legend" + x.id
          })

        var chart = chart_obj.append("div")
          .classed("chart",true)
          .attr("id",function(x){
            return "chart" + x.id
          })
          .style("height",function(){ return chart_obj.style("height")})

        var helper = chart_obj.append("div")
          .classed("chart-helper",true)
          .html(function(x){
            var values = x.values

            if (limit_series) {
              values = values.map(function(z){
                y = { "date":z.date }
                limit_series.map(function(m){ y[m.name] = z[m.key] })
                return y
              })
            }

            var keys = Object.keys(values[0]).filter(function(x){return x != "date"})

            var build = function() {
               MG.data_graphic({
                title: title_prefix + " &mdash; " + x.title,
                data: values,
                full_width: true,
                right: 20,
                full_height: true,
                top:20,
                bottom:20,
                legend: keys,
                legend_target: '#legend' + x.id,
                target: '#chart' + x.id,
                x_accessor: 'date',
                y_accessor: keys
              })
            }

            build()
            
          })
      },

      multiSeriesGraph: function(obj,series,title_prefix,initial_position,outer,height) { 

        var position = initial_position || 0,
          height = height || 150

        var chart_obj = obj.selectAll("div")
          .data(function(data){
            var values = data[position]
            //console.log(values ? [data[position]] : [])
            return values ? [data[position]] : []
          })

        chart_obj.enter()
            .append("div")

        self.objects.timeseries.graph(
          chart_obj,
          series,
          title_prefix,
          height
        )

        
  
      },
      graphWithTable: function(d) {

        var build = function(wrapper,data_key,graph_series,table_series,title) {

          var graphWrapper = wrapper.classed("chart-table-wrapper",true)
            .selectAll("div")
            .data(self.helpers.timeseries_transform(data_key))
              .enter()
              .append("div") 
              .classed("chart-wrapper","true")
              .style("height","200px")
              .style("padding-bottom","50px")

          var tableWrapper = wrapper.append("div").classed("table-wrapper",true)
            .append("table")
            .classed("table table-condensed table-hover",true) 

          var boundGraphArea = self.objects.timeseries.multiSeriesGraph.bind(false,graphWrapper,graph_series,title)

          boundGraphArea(0)
          self.objects.table(tableWrapper,data_key,table_series,boundGraphArea)

        }

        build(
          d.wrapper, 
          d.data_key, 
          d.graph_series, 
          d.table_series, 
          d.title
        )  
      }
    },
    table: function(obj,data_key,columns,onclick) {
      var th = obj.append("thead").append("tr");

      columns.map(function(x){ th.append("th").text(x.header) })

      var tr = obj
        .append("tbody")
        .selectAll("tr")
        .data(function(d){ return d[data_key] })
        .enter()
          .append("tr")

      if (onclick) {
        tr.on("click",function(x){
          obj.selectAll("td").classed("active",false)
          d3.select(this).selectAll("td").classed("active",true) 
          onclick(x.position,x)
        })
      }

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
  }

})(RB)


