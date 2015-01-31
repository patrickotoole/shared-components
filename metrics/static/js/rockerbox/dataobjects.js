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
    return  RB.QS["start_date"] || this.formatters.date(new Date())
  },
  order_by_nested: function(key) {
    return function (x,y) { return y.values[0].imps - x.values[0].imps }
  },
  timeseries_formatter: function(z){
    return {
      "values":z.values[0].timeseries,
      "title": z.name
    }
  },
  timeseries_transform: function(data_key) {
    var self = this
    return function(d) {
      var values = d[data_key].map(self.timeseries_formatter)
      return [values]
    }
  }
}

RB.defaults= {
  timeseries: "?format=json&wide=timeseries&include=date",
  paths: {
    pixel_reporting: "/pixel"
  }

}

RB.__data__ = {}

RB.data = (function(rb) {
  var self = rb,
    stored_data = rb.__data__

  return {
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
      multiSeriesGraph: function(obj,series,title_prefix,initial_position,outer,height) { 

        var chart_obj = obj,
          position = initial_position || 0,
          height = height || 150

        chart_obj.attr("style","height:200px")

        chart_obj.html(function(x){
          var _id = "asdf" + parseInt(Math.random()*10000000)
          var values = x[position].values.map(function(z){
            z.date = typeof(z.date) == "string" ? new Date("20"+z.date) : z.date; 
            return z
          })
          var name = x[position].title

          if (series) {
            values = values.map(function(z){
              y = { "date":z.date }
              series.map(function(m){ y[m.name] = z[m.key] })
              return y
            })
          }

          var keys = Object.keys(values[0]).filter(function(x){return x != "date"})

          setTimeout(function(){
            MG.data_graphic({
              title: title_prefix + " &mdash; " + name,
              data: values,
              full_width: true,
              right: 20,
              height: height,
              legend: keys,
              legend_target: '#legend' + _id,
              target: '#' + _id,
              x_accessor: 'date',
              y_accessor: keys
            })
          },0)
           

          return "<div class='legend' id='legend"+_id+"'></div><div id='"+_id+"'></div>"
        })
  
      },
      graphWithTable: function(d) {

        var build = function(wrapper,data_key,graph_series,table_series,title) {

          var graphWrapper = wrapper
            .selectAll("div")
            .data(self.helpers.timeseries_transform(data_key))
              .enter()
              .append("div") 

          var tableWrapper = wrapper
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


